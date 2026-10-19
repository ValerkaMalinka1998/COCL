/* ============================================================
   ВКЛАДКА «Чек-лист CL»
   Матрица недели, режим проверки.
   Модуль общего пространства имён: функции и переменные видны
   во всех файлах. Порядок подключения — index.html.
   ============================================================ */

/* ============================================================
   CL ELECTRONIC — попадает ли параметр в конкретную дату/смену
   ============================================================ */

/* Проверяет: должен ли параметр проверяться в указанную дату
   и указанную смену. Возвращает true/false. */
function isElectronicParamDue(p, dateStr, shiftType) {
  const freq = p.frequency;
  if (!freq) return false;

  // shiftType: 'day' | 'night' — смена по времени суток
  // freq.shifts: массив, содержащий 'day' и/или 'night'
  if (Array.isArray(freq.shifts) && freq.shifts.length) {
    if (!freq.shifts.includes(shiftType)) return false;
  }

  switch (freq.type) {
    case 'daily':
      return true;

    case 'weekly': {
      const d = new Date(dateStr + 'T00:00:00');
      return freq.daysOfWeek.includes(d.getDay());
    }

    case 'once':
      return freq.dates.includes(dateStr);

    default:
      return false;
  }
}
/* ============================================================
   CL ELECTRONIC — вкладка оператора
   ============================================================ */

/* Состояние вкладки */
const elecState = {
  operator: '',
  line: '',
  date: '',        // 'YYYY-MM-DD'
  shift: '',       // 'A' | 'B' | 'C' | 'D'
  brand: '',       // бренд на сегодня (auto или override)
  brandPlanned: '',// из расписания (может быть пустой)
  brandReason: '', // причина ручного override
  items: [],       // собранные параметры
};


/* ============================================================
   CL ELECTRONIC: под-вкладки (Проверка на сегодня / Неделя)
   ============================================================ */

const ELEC_SUBTAB_KEY = 'cl_elec_subtab';   // 'today' | 'week'

/* Обработчики кнопок под-вкладок */
document.querySelectorAll('#elecSubtabs .elec-subtab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    switchElecSubtab(btn.dataset.subtab);
  });
});

/* ============================================================
   Чек-лист CL Electronic на сегодня
   ============================================================ */

$$('#elecChecklistContainer .elec-acc-item').forEach(item => {
  const operator = ($('#elecOperator')?.value || '').trim();
  const line = elecState.line;
  const date = elecState.date;
  const shift = elecState.shift;
  const brand = elecState.brand;

  if (!line)     return showToast('Выберите линию', true);
  if (!brand)    return showToast('Бренд не определён', true);

  const items = [];

  $$('#elecChecklistContainer .checklist-item').forEach(item => {
    const it = elecState.items.find(x => x.id === item.dataset.elecId);
    if (!it) return;

    let answer = '—';
    let status = 'UNCHECKED';
    let value = null;

    if (it.controlType === 'fixed') {
      const r = item.querySelector('input[data-elec-ans]:checked');
      if (r) {
        answer = r.value === 'OK' ? 'ОК' : 'Не ОК';
        status = r.value;
      }
    } else {
      const inp = item.querySelector('input[data-elec-value]');
      if (inp && inp.value !== '') {
        value = parseFloat(inp.value);
        if (!isNaN(value)) {
          const min = it.target - it.tolerance;
          const max = it.target + it.tolerance;
          const inRange = value >= min && value <= max;
          answer = `${value}`;
          status = inRange ? 'OK' : 'FAIL';
        }
      }
    }

    items.push({
      standardId: it.id,
      machine: it.machine,
      paramName: it.paramName,
      work: it.work,
      timeFrom: it.timeFrom,
      timeTo: it.timeTo,
      controlType: it.controlType,
      target: it.target,
      tolerance: it.tolerance,
      normText: it.normText,
      answer,
      value,
      status,
      comment: item.dataset.comment || ''
    });
  });

  const checkedCount = items.filter(it => it.status !== 'UNCHECKED').length;

  const record = {
    id: uid(),
    timestamp: new Date().toISOString(),
    mode: 'electronic',
    operator,
    line,
    shift,
    date,
    brandPlanned: elecState.brandPlanned || null,
    brandActual: brand,
    brandReason: elecState.brandReason || '',
    items
  };

  const hist = getHistory();
  hist.push(record);
  setHistory(hist);
  updateNavHistoryCounter();

  showToast(checkedCount === 0 ? 'Проверка сохранена (все пункты — «Не проверено»)' : 'Проверка сохранена');

  renderElectronicSummary(record);
});

/* Обновить кнопку «Обновить» */
$('#elecReloadBtn')?.addEventListener('click', () => {
  refreshElectronicTab();
});

/* Реакция на смену оператора/линии */
$('#elecOperator')?.addEventListener('input', () => {
  elecState.operator = $('#elecOperator').value.trim();
});
$('#elecLine')?.addEventListener('change', () => {
  refreshElectronicTab();
});
/* ============================================================
   ПРОВЕРКА CL — логика
   ============================================================ */

function openClCheckTab() {
  const savedMode = localStorage.getItem('cl_cl_mode') || 'mech';
  const savedPart = localStorage.getItem('cl_cl_part') || '';
  const savedLine = localStorage.getItem('cl_cl_line') || null;

  clState.mode = savedMode;
  clState.part = savedPart;
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

  const canStart = clState.line && !clState.checkMode;
  startBtn.disabled = !canStart;

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

  const brandPlanned = getElectronicBrandForDate(clState.line, period.date) || '';
  clState.brandPlanned = brandPlanned;
  clState.brand = brandPlanned;

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
    <div class="cl-context-item">
      <span class="cl-context-label">Бренд:</span>
      <span class="cl-context-value cl-brand-value">${escapeHtml(clState.brand || '— не задан —')}</span>
      <button type="button" class="cl-brand-edit-btn" id="clEditBrandBtn" title="Изменить бренд">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
        </svg>
      </button>
    </div>
  `;

  bar.style.display = 'flex';

  $('#clEditBrandBtn')?.addEventListener('click', openClBrandOverrideDialog);
}

function openClBrandOverrideDialog() {
  const brands = getBrandsForLine(clState.line);
  if (!brands.length) return showToast('На линии нет брендов', true);

  const brandList = brands.join(', ');
  const current = clState.brand || '';
  const newBrand = prompt(`Бренд на ${fmtISODate(clState.todayISO)}\nДоступные: ${brandList}`, current);
  if (newBrand === null) return;
  const trimmed = newBrand.trim();
  if (!trimmed) return;
  if (!brands.includes(trimmed)) return showToast('Бренд не найден на линии', true);
  if (trimmed === clState.brand) return;

  const reason = prompt('Причина изменения (кратко):', '') || '';
  clState.brand = trimmed;
  clState.brandReason = reason.trim();

  updateClContext();
  renderClMatrix();
}

function updateClPanelCount() {
  const el = $('#clPanelCount');
  if (!el) return;
  if (!clState.line) {
    el.textContent = '';
    return;
  }
  const n = clState.rows.length;
  const label = clState.mode === 'mech' ? 'стандартов' : 'параметров';
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
        <div class="sch-empty-sub">Обратитесь к техническому специалисту — он должен добавить стандарты в «Расписание CL».</div>
      </div>
    `;
    return;
  }

  const weekDays = getClWeekDays(clState.weekOffset);
  const dateByDayIdx = cilDateByDayIdx(weekDays);
  const isElec = clState.mode !== 'mech';
  const hist = clHistoryIndex();
  const zones = cilZoneMap(rows);

  // Ячейки всех строк — заранее, чтобы посчитать прогресс смен для шапки
  const cellsByRow = rows.map(row => clRowCells(row, dateByDayIdx, hist));
  updateClPartCounts(dateByDayIdx, hist, isMember, checkedIds);
  const prog = {};
  cellsByRow.forEach(cells => cells.forEach(c => {
    if (c.status === 'na') return;
    const k = `${c.dateStr}|${c.shift}`;
    if (!prog[k]) prog[k] = { done: 0, planned: 0 };
    prog[k].planned++;
    if (c.status === 'OK' || c.status === 'FAIL' || c.status === 'UNCHECKED') prog[k].done++;
  }));

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
      <div class="cil-legend">
        <span><i class="cil-cell cil-cell-ok cil-cell-mini">${CIL_ICONS.check}</i>ОК</span>
        <span><i class="cil-cell cil-cell-fail cil-cell-mini">${CIL_ICONS.x}</i>Отклонение</span>
        <span><i class="cil-cell cil-cell-missed cil-cell-mini">?</i>Пропущено</span>
        <span><i class="cil-cell cil-cell-mini">${CIL_ICONS.ruler}</i>Замер</span>
        <span><i class="cil-cell cil-cell-mini">${CIL_ICONS.eye}</i>Визуально</span>
      </div>
    </div>
    <div class="cil-scroll"><table class="cil-table">`;

  html += cilHeadHtml(dateByDayIdx, {
    activeDate: isCurrentWeek ? clState.activeDate : '',
    activeShift: clState.shiftType,
    infoHeads: `<th class="cil-c-zone" rowspan="2">Машина<br>/ №</th>
      <th class="cil-c-std" rowspan="2">${isElec ? 'Параметр' : 'Стандарт'}</th>
      <th class="cil-c-norm" rowspan="2">Норма / точки</th>`,
    shiftSub: (dateStr, shift) => {
      const p = prog[`${dateStr}|${shift}`] || { done: 0, planned: 0 };
      return cilShiftProgress(shift, p.done, p.planned);
    }
  });

  html += '<tbody>';
  const numInZone = {};
  rows.forEach((row, i) => {
    const m = row.machine || '—';
    numInZone[m] = (numInZone[m] || 0) + 1;
    html += renderClRow(row, numInZone[m], zones[m], cellsByRow[i], hist, isElec);
  });
  html += '</tbody></table></div>';
  wrap.innerHTML = html;

  bindClCells();
  bindClWeekNav();
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
      if (!c || c.status === 'na') return;
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
  return { cell, last };
}

/* Состояние 14 ячеек строки */
function clRowCells(row, dateByDayIdx, hist) {
  const freq = getClRowFreq(row);
  const schedule = Array.isArray(freq.schedule) ? freq.schedule : [];
  const cells = [];
  CIL_DAYS.forEach(d => {
    const dateStr = dateByDayIdx[d.idx];
    ['day', 'night'].forEach(shift => {
      const planned = schedule.some(x => x.day === d.idx && x.shift === shift) || isValidationShift(row, dateStr, shift);
      const letter = getShiftsForDate(dateStr)[shift];
      const existing = hist.cell.get(`${dateStr}|${letter}|${row.id}`);
      const draft = clState.quickDraft[`${row.id}|${dateStr}|${shift}`];
      const past = isShiftPast(dateStr, shift);
      const isNow = clState.weekOffset === 0 && dateStr === clState.activeDate && shift === clState.shiftType;

      // Смена закончилась, а проверки нет — «пропущено»
      let status = 'na';
      if (draft) status = draft.status;
      else if (existing) status = existing.status;
      else if (planned) status = past ? 'missed' : 'due';

      cells.push({
        dateStr, shift, dayName: d.name, planned, past, isNow, status,
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

  const valOn = isOnValidation(row);
  let html = `<tr class="cil-row${valOn ? ' cil-row-val' : ''}" data-row-id="${escapeAttr(row.id)}">
    <td class="cil-c-zone cil-z${zone}">${escapeHtml(machine)}<small>№ ${num}</small></td>
    <td class="cil-c-std">
      <div class="cil-std-title"><span class="cil-std-m">${escapeHtml(machine)} ·</span>${nameHtml}${devBadge}${valOn ? valChipHtml(row) : ''}</div>
      <div class="cil-std-sub">
        ${row.oplNumber ? `<span class="cil-opl">${escapeHtml(row.oplNumber)}</span>` : ''}
        ${row.node ? `<span class="cil-node">${CIL_ICONS.gear}${escapeHtml(row.node)}</span>` : ''}
        ${cilWorkTag(freq.work === 'Stop' ? 'Stop' : 'Run')}
        ${cilTimeChips(freq.timeWindows)}
      </div>
    </td>
    <td class="cil-c-norm">${norm.html}</td>`;

  cells.forEach(c => {
    const title = `${c.dayName} · ${c.shift === 'day' ? 'день' : 'ночь'}`;
    let inner;
    if (c.status === 'na') {
      inner = '<span class="cil-na">—</span>';
    } else {
      let cls = 'cl-cell cil-cell';
      let content = icon;
      let tip = title;
      if (c.status === 'OK') { cls += ' cil-cell-ok'; content = CIL_ICONS.check; tip += ' — ОК'; }
      else if (c.status === 'FAIL') { cls += ' cil-cell-fail'; content = CIL_ICONS.x; tip += ' — отклонение'; }
      else if (c.status === 'UNCHECKED') { cls += ' cil-cell-unchecked'; content = '?'; tip += ' — отмечено «не проверено»'; }
      else if (c.status === 'missed') { cls += ' cil-cell-missed'; content = '?'; tip += ' — пропущено'; }
      else if (c.isNow) { cls += clState.checkMode ? ' cil-cell-active' : ' cil-cell-now'; tip += ' — текущая смена'; }
      else if (!c.past) cls += ' cil-cell-future';
      if (c.clickable) cls += ' cl-cell-clickable';
      inner = `<button type="button" class="${cls}"
        data-row-id="${escapeAttr(row.id)}" data-date="${escapeAttr(c.dateStr)}" data-shift="${c.shift}"
        data-planned="${c.planned ? '1' : '0'}" data-clickable="${c.clickable ? '1' : '0'}" data-status="${escapeAttr(c.status)}"
        title="${escapeAttr(tip)}">${content}${c.comment ? '<i class="cil-dot"></i>' : ''}</button>`;
    }
    html += `<td class="${cilTdClass(c.shift, c.isToday)}">${inner}</td>`;
  });

  return html + '</tr>';
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
      <div><b>${title}</b><div class="hist-sub">${histDayName(dateStr)} ${fmtShortDate(dateStr)} · ${shift === 'day' ? 'день' : 'ночь'} · бр. ${escapeHtml(letter)}${record ? ' · ' + histTime(record) : ''}</div></div>
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

  renderClMatrix();
}

function startClCheck() {
  if (!clState.line) return;
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

$('#clStartCheckBtn')?.addEventListener('click', startClCheck);
$('#clStopCheckBtn')?.addEventListener('click', stopClCheck);
