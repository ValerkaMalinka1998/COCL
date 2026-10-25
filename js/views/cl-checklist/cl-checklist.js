/* ============================================================
   ВКЛАДКА «Чек-лист CL»
   Матрица недели, режим проверки.
   Модуль общего пространства имён: функции и переменные видны
   во всех файлах. Порядок подключения — index.html.
   ============================================================ */

/* ============================================================
   ПРОВЕРКА CL — логика
   ============================================================ */

function openClCheckTab() {
  const savedMode = localStorage.getItem('cl_cl_mode') || 'mech';
  const savedPart = localStorage.getItem('cl_cl_part') === 'Packer' ? 'Packer' : 'Maker';
  const savedOnly = localStorage.getItem('cl_cl_only_shift') === '1';
  const savedLine = localStorage.getItem('cl_cl_line') || null;

  clState.mode = savedMode;
  clState.part = savedPart;
  clState.onlyShift = savedOnly;
  clState.line = savedLine;
  clState.checkMode = false;
  clState.quickDraft = {};

  document.querySelectorAll('#clModeSwitch .editor-mode-inline-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === savedMode);
  });
  document.querySelectorAll('#clPartSwitch .editor-part-switch-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.part === savedPart);
  });

  updateClPartSwitchVisibility();
  updateClCheckButtons();
  updateClLinePill();
  updateClContext();
  updateClPanelCount();
  renderClMatrix();

  if (!clState.line) {
    setTimeout(() => {
      if (typeof openLinePickerModal === 'function') openLinePickerModal();
    }, 150);
  }
}

function updateClLinePill() {
  const codeEl = $('#clLinePillCode');
  if (!codeEl) return;
  if (clState.line) {
    const ctx = getBlockForLine(clState.line);
    const wsName = ctx ? ctx.workshop.name : '';
    codeEl.textContent = clState.line + (wsName ? ' · ' + wsName : '');
  } else {
    codeEl.textContent = 'Выбрать линию';
  }
}

function updateClPartSwitchVisibility() {
  const el = $('#clPartSwitch');
  if (!el) return;
  // Maker / Packer — только для механики на линиях SMD
  el.style.display = (clState.mode === 'mech' && lineHasParts(clState.line)) ? 'inline-flex' : 'none';
}

function updateClCheckButtons() {
  const startBtn = $('#clStartCheckBtn');
  const stopBtn = $('#clStopCheckBtn');
  if (!startBtn || !stopBtn) return;

  // Без проверок в текущей смене начинать нечего
  const needNow = clState.line ? clShiftPlannedCount() : 0;
  const canStart = clState.line && !clState.checkMode && needNow > 0;
  startBtn.disabled = !canStart;
  startBtn.title = clState.line && !clState.checkMode && !needNow
    ? 'В текущую смену нет запланированных проверок' : '';

  if (clState.checkMode) {
    startBtn.style.display = 'none';
    stopBtn.style.display = 'inline-flex';
  } else {
    startBtn.style.display = 'inline-flex';
    stopBtn.style.display = 'none';
  }
}

function updateClContext() {
  const bar = $('#clContextBar');
  if (!bar) return;

  if (!clState.line) {
    bar.style.display = 'none';
    return;
  }

  // Реальная «календарная» сегодня — для навигации по неделям и missed
  const dateStr = todayISO();
  clState.todayISO = dateStr;
  // Активный период смены (тип + дата начала смены) — для подсветки/клика
  const period = getCurrentShiftPeriod();
  clState.activeDate = period.date;
  clState.shiftType = period.shiftType;

  const shifts = getShiftsForDate(period.date);
  clState.shiftLetter = shifts[clState.shiftType] || '—';

  // Текущий бренд линии: последняя смена сорта в COCL или выбор аналитика
  const brandInfo = getLineBrandNow(clState.line);
  clState.brandPlanned = getElectronicBrandForDate(clState.line, period.date) || '';
  clState.brand = brandInfo ? brandInfo.brand : '';
  clState.brandReason = brandInfo && brandInfo.source !== 'cocl'
    ? [lineBrandSourceText(brandInfo), brandInfo.note].filter(Boolean).join(' — ') : '';

  const dateFormatted = fmtISODate(period.date);
  const shiftLabel = clState.shiftType === 'day' ? 'День' : 'Ночь';

  bar.innerHTML = `
    <div class="cl-context-item">
      <span class="cl-context-label">Дата:</span>
      <span class="cl-context-value">${escapeHtml(dateFormatted)}</span>
    </div>
    <div class="cl-context-item">
      <span class="cl-context-label">Смена:</span>
      <span class="cl-context-value">
        ${shiftLabel} ·
        <span class="cl-shift-badge cl-shift-${clState.shiftLetter}">${escapeHtml(clState.shiftLetter)}</span>
      </span>
    </div>
    <div class="cl-context-item">${lineBrandBarHtml(clState.line, 'clEditBrandBtn')}</div>
  `;

  bar.style.display = 'flex';

  $('#clEditBrandBtn')?.addEventListener('click', openClBrandOverrideDialog);
}

function openClBrandOverrideDialog() {
  openLineBrandPicker(clState.line, 'operator', () => {
    updateClContext();
    renderClMatrix();
  });
}

function updateClPanelCount() {
  const el = $('#clPanelCount');
  if (!el) return;
  if (!clState.line) {
    el.textContent = '';
    return;
  }
  const n = clState.rows.length;
  const label = clState.mode === 'mech' ? pluralRu(n, 'стандарт', 'стандарта', 'стандартов') : pluralRu(n, 'параметр', 'параметра', 'параметров');
  el.textContent = `${n} ${label}`;
}

function renderClMatrix() {
  const wrap = $('#clMatrixWrap');
  if (!wrap) return;

  wrap.className = 'cil-wrap';

  if (!clState.line) {
    wrap.innerHTML = '<div class="editor-empty">Выберите линию для начала проверки</div>';
    updateClPanelCount();
    return;
  }

  // --- Расписание для просматриваемой недели + уже проверенные стандарты ---
  const weekDaysForRows = getClWeekDays(clState.weekOffset);
  const weekStartForRows = weekDaysForRows[0];

  // Стандарты/параметры, у которых УЖЕ есть результат проверки на этой неделе.
  // Их нельзя скрывать, даже если их убрали из расписания — иначе у оператора
  // пропадут уже выполненные проверки.
  const checkedIds = getCheckedStandardIdsForWeek(clState.line, weekDaysForRows);

  // Шаблон, действовавший на этой неделе, + разовые правки недели
  const isMember = (row) => getRowForWeek(row, weekStartForRows, clState.line).member;
  // На валидации — в чек-листе всю неделю, где идёт валидация
  const inValidation = (row) => weekDaysForRows.some(d => isValidationDay(row, d));

  let rows = [];
  if (clState.mode === 'mech') {
    rows = getStandards()
      .filter(s => s.line === clState.line)
      .filter(s => s.active !== false || checkedIds.has(s.id))
      .filter(s => isMember(s) || inValidation(s) || checkedIds.has(s.id))
      .filter(s => !linePartFilter(clState.line, clState.part) || s.nodePart === clState.part);
  } else {
    rows = getElectronicParamsForLine(clState.line)
      .filter(p => p.active !== false || checkedIds.has(p.id))
      .filter(p => isMember(p) || inValidation(p) || checkedIds.has(p.id));
  }

  // Стандарты на валидации — последними
  rows = cilSortRows(rows);
  rows = [...rows.filter(r => !isOnValidation(r)), ...rows.filter(r => isOnValidation(r))];

  clState.rows = rows;
  updateClPanelCount();

  if (!rows.length) {
    wrap.innerHTML = `
      <div class="sch-empty">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
          <line x1="16" y1="2" x2="16" y2="6"/>
          <line x1="8" y1="2" x2="8" y2="6"/>
          <line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
        <div class="sch-empty-title">На линии нет стандартов в расписании</div>
        <div class="sch-empty-sub">Обратитесь к аналитику — он должен добавить стандарты в «Расписание CL».</div>
      </div>
    `;
    updateClCheckButtons();
    return;
  }

  const weekDays = getClWeekDays(clState.weekOffset);
  const dateByDayIdx = cilDateByDayIdx(weekDays);
  const isElec = clState.mode !== 'mech';
  const hist = clHistoryIndex();

  // Ячейки всех строк — заранее, чтобы посчитать прогресс смен для шапки
  let cellsByRow = rows.map(row => clRowCells(row, dateByDayIdx, hist));
  updateClPartCounts(dateByDayIdx, hist, isMember, checkedIds);
  const prog = {};
  cellsByRow.forEach((cells, ri) => cells.forEach(c => {
    if (!clCellCounts(c)) return;
    const k = `${c.dateStr}|${c.shift}`;
    if (!prog[k]) prog[k] = { done: 0, planned: 0, sec: 0 };
    prog[k].planned++;
    prog[k].sec += cilRowDurationSec(rows[ri]);
    if (c.status === 'OK' || c.status === 'FAIL' || c.status === 'UNCHECKED') prog[k].done++;
  }));

  // Фильтр «только эта смена»: в таблице остаются строки, запланированные
  // на текущую смену (прогресс в шапке считается по всей неделе)
  const onlyShift = clState.onlyShift && clState.weekOffset === 0;
  if (onlyShift) {
    const keep = cellsByRow.map(cells => cells.some(c => c.isNow && c.planned));
    rows = rows.filter((r, i) => keep[i]);
    cellsByRow = cellsByRow.filter((c, i) => keep[i]);
    clState.rows = rows;
  }
  const zones = cilZoneMap(rows);

  // Панель недели + легенда
  const isCurrentWeek = clState.weekOffset === 0;
  const weekNo = cilIsoWeek(weekDays[0]);
  let html = `
    <div class="cil-toolbar">
      <div class="cil-week">
        <button type="button" class="cil-week-btn" id="clWeekPrev" title="Предыдущая неделя">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <div class="cil-week-label">
          <span class="cil-week-title">Нед. ${weekNo} · ${escapeHtml(fmtShortDate(weekDays[0]))} – ${escapeHtml(fmtShortDate(weekDays[6]))}</span>
          <span class="cil-week-sub">${isCurrentWeek ? 'текущая неделя' : (clState.weekOffset < 0 ? 'прошедшая неделя' : 'будущая неделя')}</span>
        </div>
        <button type="button" class="cil-week-btn" id="clWeekNext" title="Следующая неделя">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
        ${!isCurrentWeek ? '<button type="button" class="cil-week-today" id="clWeekToday">Сегодня</button>' : ''}
      </div>
      ${isCurrentWeek ? `<button type="button" class="cil-onlyshift${clState.onlyShift ? ' on' : ''}" id="clOnlyShiftBtn"
        title="Показать только то, что нужно проверить в текущую смену">
        <i></i>Только эта смена</button>` : ''}
      ${legendHtml(['ok', 'fail', 'missed', 'carry', 'late', 'down', 'due', 'na', 'ruler', 'eye', 'val', 'chg'])}
    </div>
    ${isCurrentWeek ? clDownBannerHtml() + clDebtBannerHtml(rows, cellsByRow) : ''}
    <div class="cil-scroll cil-scroll-page"><table class="cil-table cil-has-when">`;

  html += cilHeadHtml(dateByDayIdx, {
    activeDate: isCurrentWeek ? clState.activeDate : '',
    activeShift: clState.shiftType,
    infoHeads: `<th class="cil-c-zone" rowspan="2">Машина<br>/ №</th>
      <th class="cil-c-std" rowspan="2">${isElec ? 'Параметр' : 'Стандарт'}</th>
      <th class="cil-c-when" rowspan="2">Когда</th>
      <th class="cil-c-norm" rowspan="2">Норма / точки</th>`,
    shiftSub: (dateStr, shift) => {
      const p = prog[`${dateStr}|${shift}`] || { done: 0, planned: 0, sec: 0 };
      return cilShiftProgress(shift, p.done, p.planned, p.sec);
    }
  });

  html += '<tbody>';
  if (!rows.length) {
    html += `<tr><td class="cil-empty-row" colspan="18">В текущую смену проверок нет.
      <button type="button" class="cil-week-today" id="clOnlyShiftOff">Показать всю неделю</button></td></tr>`;
  }
  const numInZone = {};
  rows.forEach((row, i) => {
    const m = row.machine || '—';
    numInZone[m] = (numInZone[m] || 0) + 1;
    html += renderClRow(row, numInZone[m], zones[m], cellsByRow[i], hist, isElec);
  });
  html += '</tbody></table></div>';
  wrap.innerHTML = html;

  bindClCells();
  flashClCell();
  bindClWeekNav();
  updateClCheckButtons();
}

/* Счётчики «сделано / надо» текущей смены на кнопках Maker / Packer */
function updateClPartCounts(dateByDayIdx, hist, isMember, checkedIds) {
  const btns = document.querySelectorAll('#clPartSwitch .editor-part-switch-btn');
  const isElec = clState.mode !== 'mech';
  const all = isElec ? [] : getStandards()
    .filter(s => s.line === clState.line)
    .filter(s => s.active !== false || checkedIds.has(s.id))
    .filter(s => isMember(s) || checkedIds.has(s.id));
  btns.forEach(btn => {
    let cnt = btn.querySelector('.cil-part-cnt');
    if (isElec || clState.weekOffset !== 0) { if (cnt) cnt.remove(); return; }
    const part = btn.dataset.part || '';
    let done = 0, need = 0;
    all.filter(s => !part || s.nodePart === part).forEach(s => {
      const c = clRowCells(s, dateByDayIdx, hist).find(x => x.isNow);
      if (!clCellCounts(c)) return;
      need++;
      if (c.status === 'OK' || c.status === 'FAIL' || c.status === 'UNCHECKED') done++;
    });
    if (!cnt) {
      cnt = document.createElement('span');
      cnt.className = 'cil-part-cnt';
      btn.appendChild(cnt);
    }
    cnt.textContent = need ? `${done}/${need}` : '';
    cnt.title = 'Проверено в текущую смену';
  });
}

/* Номер недели ISO 8601 */
function cilIsoWeek(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day + 3);
  const firstThu = new Date(d.getFullYear(), 0, 4, 12);
  return 1 + Math.round(((d - firstThu) / 86400000 - 3 + ((firstThu.getDay() + 6) % 7)) / 7);
}

/* История CL линии: результат по ключу «дата|смена|id» и последний статус стандарта */
function clHistoryIndex() {
  const cell = new Map();
  const last = {};
  const lastOrder = {};
  getHistory().forEach(h => {
    if (!(h.mode === 'cl' || h.mode === 'electronic') || h.line !== clState.line) return;
    const order = `${h.date}|${getShiftsForDate(h.date).day === h.shift ? 0 : 1}`;
    (h.items || []).forEach(it => {
      cell.set(`${h.date}|${h.shift}|${it.standardId}`, it);
      if (!lastOrder[it.standardId] || order > lastOrder[it.standardId]) {
        lastOrder[it.standardId] = order;
        last[it.standardId] = it.status;
      }
    });
  });
  return { cell, last, idx: clResultIndex(clState.line) };
}

/* Входит ли ячейка в счёт смены: «перенесено» и простой — нет */
function clCellCounts(c) {
  return !!c && !['na', 'carry', 'down'].includes(c.status);
}

/* Состояние 14 ячеек строки. Долг (js/data/debt.js): пропуск переходит
   на следующие смены — в текущей смене это проверка «с прошлых смен» */
function clRowCells(row, dateByDayIdx, hist) {
  const freq = getClRowFreq(row);
  const schedule = Array.isArray(freq.schedule) ? freq.schedule : [];
  const tl = clRowTimeline(row, clState.line, dateByDayIdx[1], dateByDayIdx[0], hist.idx);
  const cells = [];
  CIL_DAYS.forEach(d => {
    const dateStr = dateByDayIdx[d.idx];
    ['day', 'night'].forEach(shift => {
      const t = tl.cells.get(`${dateStr}|${shift}`) || {};
      const down = t.s === 'down';
      const isNow = clState.weekOffset === 0 && dateStr === clState.activeDate && shift === clState.shiftType;
      const debt = isNow && t.s === 'carry' ? t.from : null;
      const planned = !down && ((schedule.some(x => x.day === d.idx && x.shift === shift) && rowExistedByShiftEnd(row, dateStr, shift))
        || isValidationShift(row, dateStr, shift)) || !!debt || !!t.closed;
      const letter = getShiftsForDate(dateStr)[shift];
      const existing = hist.cell.get(`${dateStr}|${letter}|${row.id}`);
      const draft = clState.quickDraft[`${row.id}|${dateStr}|${shift}`];
      const past = isShiftPast(dateStr, shift);

      // Смена закончилась, а проверки нет — «пропущено»; дальше долг «перенесено»
      let status = 'na';
      if (draft) status = draft.status;
      else if (existing) status = existing.status;
      else if (down) status = 'down';
      else if (planned) status = past ? 'missed' : 'due';
      else if (t.s === 'carry') status = 'carry';

      cells.push({
        dateStr, shift, dayName: d.name, planned, past, isNow, status, debt,
        carryFrom: t.from || null, late: !!t.late,
        comment: !!((draft && draft.comment) || (existing && existing.comment)),
        clickable: planned && isNow && clState.checkMode,
        isToday: dateStr === clState.activeDate && clState.weekOffset === 0
      });
    });
  });
  return cells;
}

function bindClWeekNav() {
  $('#clWeekPrev')?.addEventListener('click', () => {
    clState.weekOffset--;
    renderClMatrix();
  });
  $('#clWeekNext')?.addEventListener('click', () => {
    clState.weekOffset++;
    renderClMatrix();
  });
  $('#clWeekToday')?.addEventListener('click', () => {
    clState.weekOffset = 0;
    renderClMatrix();
  });
}

function renderClRow(row, num, zone, cells, hist, isElec) {
  const freq = getClRowFreq(row);
  const title = row.title || row.paramName || '—';
  const machine = row.machine || '—';
  const norm = cilNorm(row, clState.brand, isElec);
  const icon = norm.visual ? CIL_ICONS.eye : CIL_ICONS.ruler;
  const devBadge = hist.last[row.id] === 'FAIL'
    ? `<span class="cil-tag cil-tag-dev" title="Последняя проверка — с отклонением">${CIL_ICONS.warn}Отклонение в прошлую проверку</span>` : '';
  const nameHtml = isElec
    ? `<span class="cil-std-name">${escapeHtml(title)}</span>`
    : `<button type="button" class="cil-std-name cil-std-link" data-cl-view="${escapeAttr(row.id)}" title="Открыть стандарт">${escapeHtml(title)}</button>`;

  // «Изм.»: стандарт изменён после ознакомления на этом компьютере (или с ним ещё не знакомились)
  const ack = getStdAckStatus(isElec ? 'elec' : 'mech', row.id);
  const chgBadge = ack.editions.length && ack.state !== 'ok'
    ? `<span class="cil-tag cil-tag-chg" title="Стандарт изменён — откройте и ознакомьтесь">${CIL_ICONS.warn}Изм.</span>` : '';
  const valOn = isOnValidation(row);
  const dur = cilDurChip(cilRowDurationSec(row), 'cil-tag cil-tag-dur');
  let html = `<tr class="cil-row${valOn ? ' cil-row-val' : ''}" data-row-id="${escapeAttr(row.id)}">
    <td class="cil-c-zone cil-z${zone}">${escapeHtml(machine)}<small>№ ${num}</small></td>
    <td class="cil-c-std">
      <div class="cil-std-title">${nameHtml}${devBadge}${chgBadge}${valOn ? valChipHtml(row) : ''}</div>
      <div class="cil-std-sub">
        ${row.oplNumber ? `<span class="cil-opl">${escapeHtml(row.oplNumber)}</span>` : ''}
        ${row.node ? `<span class="cil-node">${CIL_ICONS.gear}${escapeHtml(row.node)}</span>` : ''}
        ${dur}
      </div>
    </td>
    <td class="cil-c-when">${cilWorkTag(normWork(freq.work))}${cilTimeChips(freq.timeWindows, freq.work)}</td>
    <td class="cil-c-norm">${norm.html}</td>`;

  cells.forEach(c => {
    const title = `${c.dayName} · ${c.shift === 'day' ? 'день' : 'ночь'}`;
    let inner;
    let tdExtra = '';
    if (c.status === 'na') {
      inner = '<span class="cil-na">—</span>';
    } else if (c.status === 'down') {
      inner = '';
      tdExtra = 'cil-td-down';
    } else if (c.status === 'carry') {
      inner = `<span class="cil-carry" title="${escapeAttr(`${title} — долг с ${clDebtFromText(c.carryFrom)}, эта смена его не закрыла`)}">${CIL_ICONS.carry}</span>`;
    } else {
      let cls = 'cl-cell cil-cell';
      let content = icon;
      let tip = title;
      if (c.status === 'OK') { cls += ' cil-cell-ok'; content = CIL_ICONS.check; tip += ' — ОК'; }
      else if (c.status === 'FAIL') { cls += ' cil-cell-fail'; content = CIL_ICONS.x; tip += ' — отклонение'; }
      else if (c.status === 'UNCHECKED') { cls += ' cil-cell-unchecked'; content = '?'; tip += ' — отмечено «не проверено»'; }
      else if (c.status === 'missed') { cls += ' cil-cell-missed'; content = '?'; tip += ' — пропущено'; }
      else if (c.debt) {
        cls += ' cil-cell-debt' + (clState.checkMode ? ' cil-cell-active' : '');
        content = CIL_ICONS.carry;
        tip += ` — с прошлых смен (${clDebtFromText(c.debt)}), проверить в первую очередь`;
      }
      else if (c.isNow) { cls += clState.checkMode ? ' cil-cell-active' : ' cil-cell-now'; tip += ' — текущая смена'; }
      else if (!c.past) cls += ' cil-cell-future';
      if (c.late && c.status === 'OK') { cls += ' cil-cell-late'; tip += ', закрыто позже'; }
      if (c.clickable) cls += ' cl-cell-clickable';
      inner = `<button type="button" class="${cls}"
        data-row-id="${escapeAttr(row.id)}" data-date="${escapeAttr(c.dateStr)}" data-shift="${c.shift}"
        data-planned="${c.planned ? '1' : '0'}" data-clickable="${c.clickable ? '1' : '0'}" data-status="${escapeAttr(c.status)}"
        title="${escapeAttr(tip)}">${content}${c.comment ? '<i class="cil-dot"></i>' : ''}</button>`;
    }
    if (c.isNow) tdExtra += ' cil-td-now';
    html += `<td class="${cilTdClass(c.shift, c.isToday, tdExtra.trim())}"${c.status === 'down' ? ' title="Простой линии"' : ''}>${inner}</td>`;
  });

  return html + '</tr>';
}

/* «ср день» — исходная смена долга */
function clDebtFromText(from) {
  if (!from) return '';
  return `${histDayName(from.date).toLowerCase()} ${from.shift === 'night' ? 'ночь' : 'день'}`;
}

/* Плашка «Линия в простое» — текущая смена в простое */
function clDownBannerHtml() {
  const i = valShiftIndex(clState.activeDate, clState.shiftType);
  const d = getLineDowntimes(clState.line).find(x =>
    i >= valShiftIndex(x.from, x.fromShift) && (!x.to || i <= valShiftIndex(x.to, x.toShift)));
  if (!d) return '';
  return `<div class="cil-down-banner"><b>Линия в простое</b>${escapeHtml(dtPeriodText(d))} · ${escapeHtml(downtimeReasonText(d))}
    <span>— проверки CL не нужны</span></div>`;
}

/* Плашка «С прошлых смен (N)» над матрицей: долги текущей смены */
function clDebtBannerHtml(rows, cellsByRow) {
  const cur = valShiftIndex(clState.activeDate, clState.shiftType);
  const list = [];
  cellsByRow.forEach((cells, i) => {
    const c = cells.find(x => x.isNow && x.debt);
    if (c && clCellCounts(c) && !['OK', 'FAIL', 'UNCHECKED'].includes(c.status)) list.push({ row: rows[i], from: c.debt });
  });
  if (!list.length) return '';
  list.sort((a, b) => valShiftIndex(a.from.date, a.from.shift) - valShiftIndex(b.from.date, b.from.shift));
  const items = list.map(({ row, from }) => {
    const n = cur - valShiftIndex(from.date, from.shift);
    return `<span class="cil-debt-item">${row.oplNumber ? `<b>${escapeHtml(row.oplNumber)}</b> ` : ''}${escapeHtml(row.title || row.paramName || '—')}
      <em>с ${escapeHtml(clDebtFromText(from))}${n > 1 ? ` · ${n} ${pluralRu(n, 'смена', 'смены', 'смен')}` : ''}</em></span>`;
  }).join('');
  return `<div class="cil-debt-banner">${CIL_ICONS.carry}<span class="cil-debt-title">С прошлых смен (${list.length}) — проверить в первую очередь</span>${items}</div>`;
}

/* Формат числа: убирает «.0» и лишние нули */
function fmtNum(n) {
  if (n == null || isNaN(n)) return '';
  return parseFloat(n.toFixed(6)).toString();
}

/* Режим записи истории для текущего режима чек-листа */
function clRecordMode() {
  return clState.mode === 'mech' ? 'cl' : 'electronic';
}

function findExistingCheck(stdId, dateStr, shiftLetter) {
  const hist = getHistory();
  const record = hist.find(h =>
    h.mode === clRecordMode() &&
    h.line === clState.line &&
    h.date === dateStr &&
    h.shift === shiftLetter
  );
  if (!record) return null;
  return record.items.find(it => it.standardId === stdId) || null;
}

function bindClCells() {
  const wrap = $('#clMatrixWrap');
  if (!wrap) return;

  // Клик по названию — просмотр стандарта
  wrap.querySelectorAll('[data-cl-view]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (typeof openStandardView === 'function') openStandardView(btn.dataset.clView);
    });
  });

  wrap.querySelectorAll('.cl-cell').forEach(cell => {
    cell.addEventListener('click', (e) => {
      const clickable = cell.dataset.clickable === '1';
      if (!clickable) {
        // Уже есть результат или смена пропущена — карточка с итогом
        if (['OK', 'FAIL', 'UNCHECKED', 'missed'].includes(cell.dataset.status)) {
          showClPeek(cell);
          return;
        }
        // Подсказка почему не кликается
        const planned = cell.dataset.planned === '1';
        if (!planned) return;
        if (!clState.checkMode) {
          showToast('Нажмите «Начать проверку»', true);
        }
        return;
      }

      const rowId = cell.dataset.rowId;
      const dateStr = cell.dataset.date;
      const shift = cell.dataset.shift;

      if (e.shiftKey) {
        e.preventDefault();
        quickSetClCell(rowId, dateStr, shift, 'OK');
        return;
      }
      if (e.altKey) {
        e.preventDefault();
        quickSetClCell(rowId, dateStr, shift, 'FAIL');
        return;
      }

      openClCheckModal(rowId, dateStr, shift);
    });
  });
}

/* ============================================================
   КАРТОЧКА ЯЧЕЙКИ: итог прошлой проверки
   ============================================================ */
function closeClPeek() {
  $('#clPeek')?.remove();
}

function showClPeek(cell) {
  closeClPeek();
  const rowId = cell.dataset.rowId;
  const dateStr = cell.dataset.date;
  const shift = cell.dataset.shift;
  const row = clState.rows.find(r => r.id === rowId);
  if (!row) return;
  const letter = getShiftsForDate(dateStr)[shift];
  const draft = clState.quickDraft[`${rowId}|${dateStr}|${shift}`];
  const record = getHistory().find(h => h.mode === clRecordMode() && h.line === clState.line &&
    h.date === dateStr && h.shift === letter);
  const it = record ? (record.items || []).find(x => x.standardId === rowId) : null;
  const status = cell.dataset.status;

  let symCls = 'u', sym = '?';
  if (status === 'OK') { symCls = 'o'; sym = CIL_ICONS.check; }
  if (status === 'FAIL') { symCls = 'x'; sym = CIL_ICONS.x; }

  let body;
  if (draft && !it) {
    body = 'Отметка ещё не сохранена — нажмите «Закончить проверку».';
  } else if (status === 'missed' || !it) {
    body = '<span class="hist-c-warn">Проверка не выполнена — смена прошла без отметки.</span>';
  } else if (it.status === 'UNCHECKED') {
    body = 'Отмечено «не проверено».';
  } else {
    const pts = histItemPoints(record, it);
    body = '<div class="hist-pts">' + (pts
      ? pts.map((p, i) => `<span class="hist-pt ${p.bad ? 'bad' : ''}">${pts.length > 1 ? 'т.' + (i + 1) + ' ' : ''}<b>${escapeHtml(p.value || '—')}</b></span>`).join('') +
        (pts.length === 1 && pts[0].label ? ` <span class="hist-sub">норма ${escapeHtml(pts[0].label)}</span>` : '')
      : `<span class="hist-pt ${it.status === 'FAIL' ? 'bad' : ''}"><b>${it.status === 'FAIL' ? 'Не ОК' : 'ОК'}</b></span>`) + '</div>';
  }
  if (it && it.comment) body += `<div class="hist-com">${cmtLine(it.comment)}</div>`;

  const title = row.oplNumber ? `<span class="hist-opl">${escapeHtml(row.oplNumber)}</span> · ${escapeHtml(row.title || row.paramName || '')}` : escapeHtml(row.title || row.paramName || '');
  const el = document.createElement('div');
  el.id = 'clPeek';
  el.className = 'cl-peek';
  el.innerHTML = `
    <div class="cl-peek-h"><span class="hist-st hist-st-${symCls}">${sym}</span>
      <div><b>${title}</b><div class="hist-sub">${histDayName(dateStr)} ${fmtShortDate(dateStr)} · ${shift === 'day' ? 'день' : 'ночь'} · ${escapeHtml(letter)}${record ? ' · ' + histTime(record) : ''}</div></div>
      <button type="button" class="cl-peek-x" data-peek-close title="Закрыть">✕</button></div>
    <div class="cl-peek-body">${body}</div>
    <div class="cl-peek-btns">
      <button type="button" class="btn btn-primary btn-sm" data-peek-shift>Открыть проверку смены</button>
      <button type="button" class="btn btn-secondary btn-sm" data-peek-hist>История стандарта</button>
    </div>`;
  document.body.appendChild(el);

  // Позиция: под ячейкой, не выходя за экран
  const r = cell.getBoundingClientRect();
  const w = el.offsetWidth, hgt = el.offsetHeight;
  let left = Math.min(window.innerWidth - w - 12, Math.max(12, r.left + r.width / 2 - w / 2));
  let top = r.bottom + 8;
  if (top + hgt > window.innerHeight - 12) top = Math.max(12, r.top - hgt - 8);
  el.style.left = left + 'px';
  el.style.top = top + 'px';

  el.addEventListener('click', (e) => {
    if (e.target.closest('[data-peek-close]')) return closeClPeek();
    if (e.target.closest('[data-peek-shift]')) {
      closeClPeek();
      return openHistoryShift(clState.line, dateStr, shift, { from: 'electronic' });
    }
    if (e.target.closest('[data-peek-hist]')) {
      closeClPeek();
      return openStandardHistory(rowId, clState.line, { from: 'electronic' });
    }
  });
}

document.addEventListener('mousedown', (e) => {
  if ($('#clPeek') && !e.target.closest('#clPeek') && !e.target.closest('.cl-cell')) closeClPeek();
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeClPeek(); });
window.addEventListener('scroll', closeClPeek, true);

/* Ячейка, которую только что отметили: после перерисовки она коротко подсвечивается */
let clFlashKey = null;

function flashClCell() {
  if (!clFlashKey) return;
  const [rowId, dateStr, shift] = clFlashKey.split('|');
  clFlashKey = null;
  const btn = [...document.querySelectorAll('#clMatrixWrap .cl-cell')]
    .find(b => b.dataset.rowId === rowId && b.dataset.date === dateStr && b.dataset.shift === shift);
  if (!btn) return;
  btn.classList.add('cil-cell-flash');
  btn.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}

function quickSetClCell(rowId, dateStr, shift, status) {
  const row = clState.rows.find(r => r.id === rowId);
  if (!row) return;

  const key = `${rowId}|${dateStr}|${shift}`;
  clState.quickDraft[key] = {
    status,
    answer: status === 'OK' ? 'ОК' : 'Не ОК',
    value: null,
    comment: ''
  };
  clFlashKey = key;

  renderClMatrix();
}

/* Сколько проверок запланировано на текущую смену в выбранном режиме (и части линии) */
function clShiftPlannedCount() {
  return clBoardSummary(clState.mode === 'mech' ? 'mech' : 'elec')
    .filter(g => clState.mode !== 'mech' || !linePartFilter(clState.line, clState.part) || g.part === clState.part)
    .reduce((s, g) => s + g.planned, 0);
}

function startClCheck() {
  if (!clState.line || !clShiftPlannedCount()) return;
  clState.checkMode = true;
  clState.quickDraft = {};
  updateClCheckButtons();
  renderClMatrix();
  showToast('Режим проверки активирован. Кликайте по активным ячейкам.');
}

function stopClCheck() {
  if (!confirm('Закончить проверку и сохранить результаты?')) return;

  const fails = saveClDraftToHistory();

  clState.checkMode = false;
  clState.quickDraft = {};
  updateClCheckButtons();
  renderClMatrix();
  showToast('Проверка сохранена');
  if (typeof updateHeaderShift === 'function') updateHeaderShift();
  showMachineJournalNotice(fails, {
    line: clState.line,
    source: clState.mode === 'mech' ? 'Чек-лист CL · механические' : 'Чек-лист CL · электронные'
  });
}

function saveClDraftToHistory() {
  const drafts = Object.entries(clState.quickDraft);
  if (!drafts.length) return [];

  const groups = {};
  drafts.forEach(([key, val]) => {
    const [rowId, dateStr, shift] = key.split('|');
    const groupKey = `${dateStr}|${shift}`;
    if (!groups[groupKey]) groups[groupKey] = { date: dateStr, shift, items: [] };
    const row = clState.rows.find(r => r.id === rowId);
    if (!row) return;

    groups[groupKey].items.push({
      standardId: rowId,
      machine: row.machine || '',
      title: row.title || row.paramName || '',
      oplNumber: row.oplNumber || '',
      node: row.node || '',
      nodePart: row.nodePart || '',
      controlType: migrateControlType(row.controlType, row.measurements),
      kind: clState.mode === 'mech' ? 'mech' : 'elec',
      answer: val.answer,
      value: val.value,
      status: val.status,
      comment: val.comment || ''
    });
  });

  const hist = getHistory();
  let added = 0;

  Object.entries(groups).forEach(([gk, group]) => {
    const shiftLetter = getShiftsForDate(group.date)[group.shift];
    let record = hist.find(h =>
      h.mode === clRecordMode() &&
      h.line === clState.line &&
      h.date === group.date &&
      h.shift === shiftLetter
    );

    if (!record) {
      record = {
        id: uid(),
        timestamp: new Date().toISOString(),
        mode: clRecordMode(),
        operator: '—',
        line: clState.line,
        shift: shiftLetter,
        date: group.date,
        brandPlanned: clState.brandPlanned || null,
        brandActual: clState.brand || '',
        brandReason: clState.brandReason || '',
        items: []
      };
      hist.push(record);
      added++;
    }

    group.items.forEach(newItem => {
      const idx = record.items.findIndex(it => it.standardId === newItem.standardId);
      if (idx !== -1) record.items[idx] = newItem;
      else record.items.push(newItem);
    });
  });

  setHistory(hist);
  updateNavHistoryCounter();

  if (added > 0) showToast(`Создано записей: ${added}`);
  return Object.values(groups).flatMap(g => g.items).filter(it => it.status === 'FAIL');
}

/* ============================================================
   ПРОВЕРКА CL — обработчики
   ============================================================ */

document.addEventListener('click', (e) => {
  if (e.target.closest('#clLinePill')) {
    if (typeof openLinePickerModal === 'function') openLinePickerModal();
  }
});

$('#clModeSwitch')?.addEventListener('click', (e) => {
  const btn = e.target.closest('.editor-mode-inline-btn');
  if (!btn) return;
  const mode = btn.dataset.mode;
  if (mode === clState.mode) return;

  if (clState.checkMode && !confirm('Проверка не закончена. Переключиться?')) return;

  clState.mode = mode;
  clState.checkMode = false;
  clState.quickDraft = {};

  try { localStorage.setItem('cl_cl_mode', mode); } catch (err) {}

  document.querySelectorAll('#clModeSwitch .editor-mode-inline-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.mode === mode);
  });

  updateClPartSwitchVisibility();
  updateClCheckButtons();
  renderClMatrix();
});

$('#clPartSwitch')?.addEventListener('click', (e) => {
  const btn = e.target.closest('.editor-part-switch-btn');
  if (!btn) return;
  const part = btn.dataset.part || '';
  if (part === clState.part) return;

  if (clState.checkMode && !confirm('Проверка не закончена. Переключиться?')) return;

  clState.part = part;
  clState.checkMode = false;
  clState.quickDraft = {};

  try { localStorage.setItem('cl_cl_part', part); } catch (err) {}

  document.querySelectorAll('#clPartSwitch .editor-part-switch-btn').forEach(b => {
    b.classList.toggle('active', (b.dataset.part || '') === part);
  });

  updateClCheckButtons();
  renderClMatrix();
});

/* «Только эта смена» — показываем в таблице лишь проверки текущей смены */
function toggleClOnlyShift(value) {
  clState.onlyShift = value === undefined ? !clState.onlyShift : !!value;
  try { localStorage.setItem('cl_cl_only_shift', clState.onlyShift ? '1' : '0'); } catch (err) {}
  renderClMatrix();
}

$('#tab-electronic')?.addEventListener('click', (e) => {
  if (e.target.closest('#clOnlyShiftBtn')) return toggleClOnlyShift();
  if (e.target.closest('#clOnlyShiftOff')) return toggleClOnlyShift(false);
});

$('#clStartCheckBtn')?.addEventListener('click', startClCheck);
$('#clStopCheckBtn')?.addEventListener('click', stopClCheck);
