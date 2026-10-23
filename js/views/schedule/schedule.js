/* ============================================================
   ВКЛАДКА «Расписание CL»
   Матрица, недели, время проверки, сохранение.
   Модуль общего пространства имён: функции и переменные видны
   во всех файлах. Порядок подключения — index.html.
   ============================================================ */

/* ============================================================
   РАСПИСАНИЕ CL — вкладка аналитика
   ============================================================ */

/* Состояние вкладки */
const schState = {
  line: null,             // выбранная линия
  mode: 'mech',           // 'mech' | 'elec'
  part: 'Maker',          // 'Maker' | 'Packer'  (только для mech, SMD)
  weekOffset: 0,          // 0 = текущая неделя, +1 = следующая, -1 = предыдущая
  saveScope: 'forward',   // 'forward' — с этой недели и далее, 'week' — только эта неделя
  dirty: false,           // были ли несохранённые изменения
  rows: [],               // текущие строки матрицы (стандарты/параметры)
  // Кэш "черновика" изменений: id → { daysOfWeek:[], shifts:[] }
  draft: {},
  // Множество id, которые пользователь убрал из расписания (не сохраняя)
  removedFromSchedule: new Set(),
  // Множество id, которые пользователь добавил в расписание (не сохраняя)
  addedToSchedule: new Set(),
  // Список добавленных "сырых" стандартов (объекты), чтобы показывать до сохранения
  addedRows: []
};

/* --- Открытие вкладки --- */
function openScheduleTab() {
  // Восстанавливаем сохранённые выборы
  const savedMode = localStorage.getItem('cl_schedule_mode') || 'mech';
  const savedLine = localStorage.getItem('cl_schedule_line') || null;
  const savedPart = localStorage.getItem('cl_schedule_part') === 'Packer' ? 'Packer' : 'Maker';

  schState.mode = savedMode;
  schState.part = savedPart;
  schState.line = savedLine;
  // С пятницы аналитик планирует следующую неделю — открываем сразу её
  const dow = new Date().getDay();
  schState.weekOffset = (dow === 5 || dow === 6 || dow === 0) ? 1 : 0;
  schState.saveScope = 'forward';
  schState.dirty = false;
  schState.draft = {};
  schState.removedFromSchedule = new Set();
  schState.addedToSchedule = new Set();

  // Обновляем UI переключателей
  document.querySelectorAll('#schModeSwitch .editor-mode-inline-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === savedMode);
  });
  document.querySelectorAll('#schPartSwitch .editor-part-switch-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.part === savedPart);
  });

  // Обновляем чип линии
  updateSchLinePill();
  updateSchPanelCount();

  // Рендер матрицы
  renderScheduleMatrix();

  // Открываем модалку выбора линии, если линия не выбрана
  if (!schState.line) {
    setTimeout(() => {
      if (typeof openLinePickerModal === 'function') openLinePickerModal();
    }, 100);
  }
}

/* --- Обновление чипа линии --- */
function updateSchLinePill() {
  const codeEl = $('#schLinePillCode');
  if (!codeEl) return;
  if (schState.line) {
    const ctx = getBlockForLine(schState.line);
    const wsName = ctx ? ctx.workshop.name : '';
    codeEl.textContent = schState.line + (wsName ? ' · ' + wsName : '');
  } else {
    codeEl.textContent = 'Выбрать линию';
  }
}

/* --- Счётчик в шапке --- */
function updateSchPanelCount() {
  const el = $('#schPanelCount');
  if (!el) return;
  if (!schState.line) {
    el.textContent = '';
    return;
  }

  const total = schState.rows.length;
  // Считаем, у скольких есть хоть одна активная ячейка
  const withSchedule = schState.rows.filter(r => {
    const f = getSchRowFreq(r);
    return Array.isArray(f.schedule) && f.schedule.length > 0;
  }).length;

  if (total === 0) {
    el.textContent = '';
    return;
  }

  const label = schState.mode === 'mech' ? pluralRu(total, 'стандарт', 'стандарта', 'стандартов') : pluralRu(total, 'параметр', 'параметра', 'параметров');

  el.textContent = `${total} ${label} · ${withSchedule} с расписанием`;
}

/* Входит ли строка в расписание просматриваемой недели
   (шаблон недели → разовые правки → несохранённые добавления/удаления) */
function isSchRowMember(row) {
  const removed = schState.removedFromSchedule || new Set();
  const added = schState.addedToSchedule || new Set();
  if (removed.has(row.id)) return false;
  if (added.has(row.id)) return true;
  return getRowForWeek(row, getSchWeekStart(schState.weekOffset || 0), schState.line).member;
}

/* Идёт ли у строки валидация на просматриваемой неделе: такие стандарты
   стоят в расписании сами (каждая смена срока), последними строками */
function isSchRowValidation(row) {
  return getClWeekDays(schState.weekOffset || 0).some(d => isValidationDay(row, d));
}
function isSchRowShown(row) {
  return isSchRowMember(row) || isSchRowValidation(row);
}

/* --- Получить отфильтрованные строки расписания --- */
function getFilteredScheduleRows() {
  let rows = [];
  if (schState.mode === 'mech') {
    rows = getStandards()
      .filter(s => s.line === schState.line)
      .filter(s => s.active !== false)
      .filter(s => !linePartFilter(schState.line, schState.part) || s.nodePart === schState.part)
      .filter(isSchRowShown);
  } else {
    rows = getElectronicParamsForLine(schState.line)
      .filter(p => p.active !== false)
      .filter(isSchRowShown);
  }

  // Фильтр по машине
  const machineFilter = ($('#schFilterMachine')?.value || '').trim();
  if (machineFilter) {
    rows = rows.filter(r => (r.machine || '') === machineFilter);
  }

  // Поиск
  const search = ($('#schFilterSearch')?.value || '').trim().toLowerCase();
  if (search) {
    rows = rows.filter(r => {
      const hay = [
        r.oplNumber || '',
        r.title || r.paramName || '',
        r.node || '',
        r.machine || '',
        r.nodePart || ''
      ].map(v => String(v || '').toLowerCase()).join(' ');
      return hay.includes(search);
    });
  }

  // Группы по машинам, внутри — по OPL; на валидации — последними
  rows = cilSortRows(rows);
  return [...rows.filter(r => !isSchRowValidation(r)), ...rows.filter(isSchRowValidation)];
}

/* --- Обновить счётчики над матрицей расписания --- */
function updateSchMatrixCounters(rows) {
  const lg = $('#schMatrixLegend');
  if (lg) lg.innerHTML = legendHtml(['day', 'night', 'past', 'val']);
  const el = $('#schMatrixCounters');
  if (!el) return;

  const total = rows.length;
  let withSchedule = 0;
  let filledCells = 0;

  rows.forEach(row => {
    const freq = getSchRowFreq(row) || { schedule: [] };
    const schedule = Array.isArray(freq.schedule) ? freq.schedule : [];
    if (schedule.length > 0) withSchedule++;
    filledCells += schedule.length;
  });

  const maxCells = total * 14;

  el.innerHTML = `
    <span class="sch-counter-chip">
      Всего: <strong>${total}</strong>
    </span>
    <span class="sch-counter-chip sch-counter-chip-with">
      С расписанием: <strong>${withSchedule}</strong>
    </span>
    <span class="sch-counter-chip sch-counter-chip-cells">
      Заполнено ячеек: <strong>${filledCells}</strong> из ${maxCells}
    </span>
  `;
}

/* --- Заполнить фильтр машин --- */
function fillSchMachineFilter(rows) {
  const sel = $('#schFilterMachine');
  if (!sel) return;

  const current = sel.value;
  const machines = [...new Set(rows.map(r => r.machine || '').filter(Boolean))].sort((a, b) => a.localeCompare(b, 'ru'));

  sel.innerHTML = '<option value="">Все</option>' +
    machines.map(m => `<option value="${escapeAttr(m)}">${escapeHtml(m)}</option>`).join('');

  if (current && machines.includes(current)) {
    sel.value = current;
  }
}

/* --- Рендер матрицы расписания --- */
function renderScheduleMatrix() {
  const wrap = $('#schMatrixWrap');
  // Maker / Packer — только для механики на линиях SMD
  const partSw = $('#schPartSwitch');
  if (partSw) partSw.style.display = (schState.mode === 'mech' && lineHasParts(schState.line)) ? '' : 'none';
  const toolbar = $('#schMatrixToolbar');
  if (!wrap) return;

  // Если линия не выбрана — заглушка
  if (!schState.line) {
    if (toolbar) toolbar.style.display = 'none';
    wrap.innerHTML = '<div class="editor-empty">Выберите линию для просмотра расписания</div>';
    updateSchPanelCount();
    return;
  }

  const rows = getFilteredScheduleRows();

  // Список всех строк (без фильтров) — для счётчиков и фильтра машин
  const allRows = schState.mode === 'mech'
    ? getStandards()
        .filter(s => s.line === schState.line && s.active !== false)
        .filter(s => !linePartFilter(schState.line, schState.part) || s.nodePart === schState.part)
        .filter(isSchRowShown)
    : getElectronicParamsForLine(schState.line)
        .filter(p => p.active !== false)
        .filter(isSchRowShown);

  schState.rows = rows;
  updateSchPanelCount();
  fillSchMachineFilter(allRows);
  updateSchMatrixCounters(allRows);

  // Показываем тулбар
  if (toolbar) toolbar.style.display = '';

  // Пусто?
  if (!allRows.length) {
    if (toolbar) toolbar.style.display = 'none';
    wrap.innerHTML = `
      <div class="sch-empty">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
          <line x1="16" y1="2" x2="16" y2="6"/>
          <line x1="8" y1="2" x2="8" y2="6"/>
          <line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
        <div class="sch-empty-title">В расписании пока нет стандартов</div>
        <div class="sch-empty-sub">
          Добавьте стандарты, которые должны регулярно проверяться оператором.
        </div>
        <button type="button" class="btn btn-primary btn-icon-text" id="schAddStandardsBtnEmpty">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          <span>Добавить стандарты</span>
        </button>
      </div>
    `;
    $('#schAddStandardsBtnEmpty')?.addEventListener('click', openScheduleAddStandardsModal);
    return;
  }

  // Если фильтр ничего не нашёл
  if (!rows.length) {
    wrap.innerHTML = '<div class="editor-empty">Ничего не найдено по фильтру</div>';
    return;
  }

  const weekDays = getClWeekDays(schState.weekOffset);
  const dateByDayIdx = cilDateByDayIdx(weekDays);

  // Навигация по неделям. Прошлое не меняется: прошедшая неделя — только
  // просмотр, на текущей нельзя планировать уже прошедшие смены.
  const off = schState.weekOffset || 0;
  const isPastWeek = off < 0;
  const weekLabel = getWeekLabel(off);
  const weekKind = off === 0 ? 'Эта неделя'
    : off === 1 ? 'Следующая неделя'
    : off < 0 ? 'Прошедшая неделя'
    : 'Неделя через ' + off;
  let weekSub;
  if (isPastWeek) weekSub = 'только просмотр — прошлое не меняется';
  else if (schState.saveScope === 'week') weekSub = 'изменения — только для этой недели';
  else if (off === 0) weekSub = 'изменения — на оставшиеся смены и в шаблон со следующей недели';
  else weekSub = 'изменения — в шаблон с этой недели и далее';
  if (hasScheduleWeekOverride(getSchWeekStart(off), schState.line)) weekSub += ' · есть разовые правки';

  const scopeHtml = isPastWeek ? '' : `
      <div class="sch-scope" role="group" aria-label="На какие недели действуют правки">
        <span class="sch-scope-label">Правки действуют</span>
        <button type="button" class="sch-scope-btn ${schState.saveScope !== 'week' ? 'active' : ''}" data-sch-scope="forward"
                title="Изменения войдут в шаблон и будут повторяться каждую неделю">С этой недели и далее</button>
        <button type="button" class="sch-scope-btn ${schState.saveScope === 'week' ? 'active' : ''}" data-sch-scope="week"
                title="Разовые правки: другие недели не меняются">Только эта неделя</button>
      </div>`;

  const isElec = schState.mode !== 'mech';
  const zones = cilZoneMap(rows);
  const cur = getCurrentShiftPeriod();
  const perShift = {};
  const perShiftSec = {};
  rows.forEach(row => (getSchRowFreq(row).schedule || []).forEach(x => {
    const k = `${x.day}|${x.shift}`;
    perShift[k] = (perShift[k] || 0) + 1;
    perShiftSec[k] = (perShiftSec[k] || 0) + cilRowDurationSec(row);
  }));

  let html = `
    <div class="cil-toolbar sch-cil-toolbar">
      <div class="cil-week">
        <button type="button" class="cil-week-btn" id="schWeekPrev" title="Предыдущая неделя">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <div class="cil-week-label">
          <span class="cil-week-title">Нед. ${cilIsoWeek(weekDays[0])} · ${escapeHtml(weekLabel)}</span>
          <span class="cil-week-sub">${escapeHtml(weekKind)}</span>
        </div>
        <button type="button" class="cil-week-btn" id="schWeekNext" title="Следующая неделя">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
        <button type="button" class="sch-week-chip ${off === 0 ? 'active' : ''}" data-sch-week="0">Эта</button>
        <button type="button" class="sch-week-chip ${off === 1 ? 'active' : ''}" data-sch-week="1">Следующая</button>
      </div>
      ${lineBrandBarHtml(schState.line, 'schEditBrandBtn')}
      ${scopeHtml}
    </div>
    <div class="sch-cil-hint">${escapeHtml(weekSub)}</div>
    <div class="cil-scroll"><table class="cil-table ${isPastWeek ? 'cil-readonly' : ''}">`;

  html += cilHeadHtml(dateByDayIdx, {
    activeDate: off === 0 ? cur.date : '',
    activeShift: cur.shiftType,
    infoHeads: `<th class="cil-c-zone" rowspan="2">Машина<br>/ №</th>
      <th class="cil-c-std" rowspan="2">${isElec ? 'Параметр' : 'Стандарт'}</th>
      <th class="cil-c-cnt" rowspan="2">Смен</th>`,
    shiftSub: (dateStr, shift) => {
      const dayIdx = new Date(dateStr + 'T12:00:00').getDay();
      const n = perShift[`${dayIdx}|${shift}`] || 0;
      return `<span class="cil-shift-sub">${shift === 'day' ? 'день' : 'ночь'} · ${n}</span>${cilShiftTotalHtml(perShiftSec[`${dayIdx}|${shift}`])}`;
    },
    colAttrs: (dateStr, dayIdx, shift) => {
      const locked = isPastWeek || isShiftPast(dateStr, shift);
      return locked
        ? 'title="Смена прошла — только просмотр"'
        : `data-sch-col-day="${dayIdx}" data-sch-col-shift="${shift}" title="Отметить или снять эту смену у всех строк"`;
    }
  });

  html += '<tbody>';
  const numInZone = {};
  rows.forEach(row => {
    const m = row.machine || '—';
    numInZone[m] = (numInZone[m] || 0) + 1;
    html += renderScheduleRow(row, dateByDayIdx, numInZone[m], zones[m], isElec);
  });
  html += '</tbody></table></div>';

  // Прокрутку таблицы сохраняем между перерисовками (клик по ячейке перерисовывает)
  const prevScroll = wrap.querySelector('.cil-scroll');
  const keep = prevScroll ? { l: prevScroll.scrollLeft, t: prevScroll.scrollTop } : null;
  wrap.className = 'cil-wrap';
  wrap.innerHTML = html;
  if (keep) {
    const sc = wrap.querySelector('.cil-scroll');
    if (sc) { sc.scrollLeft = keep.l; sc.scrollTop = keep.t; }
  }

  // Обработчики
  bindScheduleCells();

  // Навигация по неделям
  bindSchWeekNav();

  // Бренд на линии — аналитик правит, если оператор не провёл COCL
  $('#schEditBrandBtn')?.addEventListener('click', () => {
    openLineBrandPicker(schState.line, 'analyst', () => renderScheduleMatrix());
  });

  // Клик по «×» — убрать из расписания
  wrap.querySelectorAll('[data-remove-from-schedule]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const rowId = btn.dataset.removeFromSchedule;
      removeRowFromSchedule(rowId);
    });
  });

  // Клик по Run/Stop/CIL — переключить прямо в черновике расписания
  wrap.querySelectorAll('[data-work-toggle]').forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      const rowId = el.dataset.workToggle;
      if (!rowId) return;
      if (isSchReadOnly()) return;
      const d = ensureSchDraft(rowId);
      d.work = WORK_CYCLE[(WORK_CYCLE.indexOf(normWork(d.work)) + 1) % WORK_CYCLE.length];
      schState.dirty = true;
      updateSchSaveBtn();
      renderScheduleMatrix();
    });
  });
}
/* --- Одна строка матрицы расписания (с инфо-колонками) --- */
/* Эффективная периодичность строки для ТЕКУЩЕЙ просматриваемой недели:
   черновик → оверрайд недели → базовый шаблон. */
function getSchRowFreq(row) {
  const base = (row && row.frequency) || { type: 'weekly', schedule: [], shifts: [], daysOfWeek: [], dates: [], timeWindows: [] };
  if (!row) return base;

  // Несохранённые правки главнее всего
  const dr = schState.draft[row.id];
  if (dr) return { ...dr, timeWindows: autoTimeWindows(dr.work, dr.schedule) };

  // Шаблон недели + разовые правки этой недели
  const w = getRowForWeek(row, getSchWeekStart(schState.weekOffset || 0), schState.line);
  return { ...base, schedule: w.schedule, timeWindows: w.timeWindows, work: w.work };
}

/* Эффективная периодичность строки для операторского чек-листа:
   если для просматриваемой недели в «Расписании CL» сделаны правки —
   используем их, иначе базовый шаблон. */
function getClRowFreq(row) {
  const base = (row && row.frequency) || { type: 'weekly', schedule: [], shifts: [], daysOfWeek: [], dates: [], timeWindows: [] };
  if (!row) return base;

  // Шаблон, действовавший на этой неделе, + разовые правки недели
  const w = getRowForWeek(row, getClWeekDays(clState.weekOffset || 0)[0], clState.line);
  return { ...base, schedule: w.schedule, timeWindows: w.timeWindows, work: w.work };
}

/* id стандартов/параметров, у которых уже есть результат проверки
   на указанной неделе. Такие строки остаются в чек-листе, даже если
   их убрали из расписания — иначе пропадут уже выполненные проверки. */
function getCheckedStandardIdsForWeek(line, weekDays) {
  const ids = new Set();
  if (!line || !Array.isArray(weekDays) || !weekDays.length) return ids;

  const weekSet = new Set(weekDays);
  getHistory().forEach(h => {
    if (h.line !== line) return;
    if (!weekSet.has(h.date)) return;
    (h.items || []).forEach(it => {
      if (it && it.standardId) ids.add(it.standardId);
    });
  });
  return ids;
}

/* Инициализировать черновик строки из эффективных данных недели */
function ensureSchDraft(rowId) {
  if (schState.draft[rowId]) return schState.draft[rowId];

  const row = schState.rows.find(r => r.id === rowId);
  const f = getSchRowFreq(row || null);

  const d = {
    type: 'weekly',
    schedule: Array.isArray(f.schedule) ? f.schedule.map(x => ({ ...x })) : [],
    timeWindows: Array.isArray(f.timeWindows) ? f.timeWindows.map(w => ({ from: w.from, to: w.to })) : [],
    shifts: [...(f.shifts || [])],
    daysOfWeek: [...(f.daysOfWeek || [])],
    dates: [...(f.dates || [])]
  };
  const w = (f.work != null) ? f.work : normWork(row && row.work);
  if (w) d.work = w;

  schState.draft[rowId] = d;
  return d;
}

function renderScheduleRow(row, dateByDayIdx, num, zone, isElec) {
  // Периодичность с учётом правок этой недели и черновика
  const freq = getSchRowFreq(row);
  const schedule = Array.isArray(freq.schedule) ? freq.schedule : [];
  const isOn = (dayIdx, shift) => schedule.some(x => x.day === dayIdx && x.shift === shift);
  const title = isElec ? (row.paramName || '—') : (row.title || '—');
  const machine = row.machine || '—';
  const work = (freq.work != null)
    ? normWork(freq.work)
    : normWork(row.work);
  const id = escapeAttr(row.id);
  const isPastWeek = (schState.weekOffset || 0) < 0;
  const valWeek = isSchRowValidation(row);
  const valOn = valWeek && isOnValidation(row);
  const member = isSchRowMember(row);
  const isValCell = (dateStr, shift) => valWeek && isValidationShift(row, dateStr, shift);
  const valCount = valWeek
    ? CIL_DAYS.reduce((k, d) => k + ['day', 'night'].filter(sh => isValCell(dateByDayIdx[d.idx], sh)).length, 0) : 0;
  const n = valWeek
    ? CIL_DAYS.reduce((k, d) => k + ['day', 'night'].filter(sh => isOn(d.idx, sh) || isValCell(dateByDayIdx[d.idx], sh)).length, 0)
    : schedule.length;

  let html = `<tr class="cil-row${valOn ? ' cil-row-val' : ''}" data-row-id="${id}">
    <td class="cil-c-zone cil-z${zone}">${escapeHtml(machine)}<small>№ ${num}</small></td>
    <td class="cil-c-std"><div class="cil-std-box">
      <div class="cil-std-title"><span class="cil-std-name">${escapeHtml(title)}</span>${valOn ? valChipHtml(row) : ''}</div>
      <div class="cil-std-sub">
        ${row.oplNumber ? `<span class="cil-opl">${escapeHtml(row.oplNumber)}</span>` : ''}
        ${row.node ? `<span class="cil-node">${CIL_ICONS.gear}${escapeHtml(row.node)}</span>` : ''}
        <button type="button" class="cil-tag cil-tag-${work.toLowerCase()}" data-work-toggle="${id}" title="Переключить Run → Stop → CIL">${work.toUpperCase()}</button>
        ${normWork(freq.work) === 'CIL' ? '' : cilTimeChips(freq.timeWindows, freq.work)}
      </div>
      ${member ? `<button type="button" class="cil-row-del" data-remove-from-schedule="${id}" title="Убрать из расписания">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>` : ''}
    </div></td>
    <td class="cil-c-cnt">
      <span class="cil-cnt-val">${n}<small> / 14</small></span>
      <span class="cil-cnt-bar"><i style="width:${Math.round(n / 14 * 100)}%"></i></span>
      ${valOn && !isPastWeek ? `<div class="cil-quick val-quick" title="Валидация: ${valCount} ${pluralRu(valCount, 'смена', 'смены', 'смен')} на этой неделе">
        <button type="button" data-val-act="extend" data-val-id="${id}" data-val-kind="${isElec ? 'elec' : 'mech'}" title="Продлить на 14 смен">+14</button>
        <button type="button" class="val-q-ok" data-val-act="approve" data-val-id="${id}" data-val-kind="${isElec ? 'elec' : 'mech'}" title="Утвердить стандарт">утв.</button>
        <button type="button" class="val-q-no" data-val-act="reject" data-val-id="${id}" data-val-kind="${isElec ? 'elec' : 'mech'}" title="Отклонить (деактивировать)">откл.</button>
      </div>` : isPastWeek ? '' : `<div class="cil-quick">
        <button type="button" data-sch-fill="all" data-row-id="${id}" title="Все смены недели">все</button>
        <button type="button" data-sch-fill="day" data-row-id="${id}" title="Только дневные смены">день</button>
        <button type="button" data-sch-fill="night" data-row-id="${id}" title="Только ночные смены">ночь</button>
        <button type="button" data-sch-fill="none" data-row-id="${id}" title="Очистить строку">✕</button>
      </div>`}
    </td>`;

  // 14 ячеек. Прошлое не меняется: прошедшая неделя целиком и
  // закончившиеся смены текущей недели заблокированы.
  const curDate = getCurrentShiftPeriod().date;
  CIL_DAYS.forEach(d => {
    const dateStr = dateByDayIdx[d.idx] || '';
    ['day', 'night'].forEach(shift => {
      const isPast = isPastWeek || (!!dateStr && isShiftPast(dateStr, shift));
      const shiftName = shift === 'day' ? 'день' : 'ночь';
      if (isValCell(dateStr, shift)) {
        // Смена валидации: проверка обязательна, в расписании не снимается
        html += `<td class="${cilTdClass(shift, dateStr === curDate && !isPastWeek && schState.weekOffset === 0, isPast ? 'cil-past' : '')}">
          <span class="cil-plan cil-plan-${shift} on cil-plan-val" title="${escapeAttr(`${d.name} · ${shiftName} — валидация: проверка каждую смену`)}">${CIL_ICONS.check}</span>
        </td>`;
        return;
      }
      if (valWeek && !member) {
        // Пока идёт валидация, остальные смены задаются после утверждения
        html += `<td class="${cilTdClass(shift, dateStr === curDate && !isPastWeek && schState.weekOffset === 0, isPast ? 'cil-past' : '')}">
          <span class="cil-na" title="Смены по расписанию задаются после утверждения">—</span>
        </td>`;
        return;
      }
      const on = isOn(d.idx, shift);
      const tip = isPast
        ? `${d.name} · ${shiftName} — ${isPastWeek ? 'прошедшая неделя, только просмотр' : 'смена уже прошла'}`
        : `${d.name} · ${shiftName}`;
      html += `<td class="${cilTdClass(shift, dateStr === curDate && !isPastWeek && schState.weekOffset === 0, isPast ? 'cil-past' : '')}">
        <button type="button" class="cil-plan cil-plan-${shift} ${on ? 'on' : ''} ${isPast ? 'locked' : ''}"
          data-row-id="${id}" data-day="${d.idx}" data-shift="${shift}"${isPast ? ' data-locked="1"' : ''}
          title="${escapeAttr(tip)}">${on ? CIL_ICONS.check : CIL_ICONS.plus}</button>
      </td>`;
    });
  });

  return html + '</tr>';
}
/* Прошедшую неделю можно только смотреть */
function isSchReadOnly() {
  if ((schState.weekOffset || 0) < 0) {
    showToast('Прошедшая неделя — только просмотр', true);
    return true;
  }
  return false;
}

/* --- Убрать стандарт из расписания (в черновике) --- */
function removeRowFromSchedule(rowId) {
  if (!rowId) return;
  if (isSchReadOnly()) return;

  const removedRow = schState.rows.find(r => r.id === rowId);
  if (!removedRow) return;

  const title = removedRow.title || removedRow.paramName || 'стандарт';
  if (!confirm(`Убрать из расписания: "${title}"?`)) return;

  if (!schState.removedFromSchedule) schState.removedFromSchedule = new Set();
  if (!schState.addedToSchedule) schState.addedToSchedule = new Set();

  if (schState.addedToSchedule.has(rowId)) {
    schState.addedToSchedule.delete(rowId);
  } else {
    schState.removedFromSchedule.add(rowId);
  }

  delete schState.draft[rowId];

  schState.dirty = true;
  updateSchSaveBtn();
  renderScheduleMatrix();
  updateSchPanelCount();
}
/* --- Включить / выключить смену в черновике строки --- */
function schSetCell(rowId, day, shift, on) {
  const draft = ensureSchDraft(rowId);
  const idx = draft.schedule.findIndex(x => x.day === day && x.shift === shift);
  if (on && idx === -1) draft.schedule.push({ day, shift });
  else if (!on && idx !== -1) draft.schedule.splice(idx, 1);
  else return false;

  schSyncDraftDays(draft);
  schState.dirty = true;
  return true;
}

/* daysOfWeek и shifts черновика — для совместимости со старым форматом */
function schSyncDraftDays(draft) {
  draft.daysOfWeek = [...new Set(draft.schedule.map(x => x.day))]
    .sort((a, b) => (a === 0 ? 7 : a) - (b === 0 ? 7 : b));
  draft.shifts = [...new Set(draft.schedule.map(x => x.shift))];
  if (!draft.shifts.length) draft.shifts = ['day', 'night'];
}

/* Строка, которую только что добавили в расписание недели, не получает
   смены, которые уже прошли: от прежней раскладки остаются только будущие
   смены. Прошедшие смены нельзя ни включить, ни отметить, а в чек-листе они
   горели бы «пропущено». Убранные смены запоминаем в draft.droppedPast —
   они нужны шаблону следующих недель. */
function schDropPastCells(row) {
  if (!row) return;
  const dateByDay = cilDateByDayIdx(getClWeekDays(schState.weekOffset || 0));
  const kept = [];
  const dropped = [];
  (getSchRowFreq(row).schedule || []).forEach(x => {
    const dateStr = dateByDay[x.day];
    (dateStr && isShiftPast(dateStr, x.shift) ? dropped : kept).push({ day: x.day, shift: x.shift });
  });
  if (!dropped.length) return;
  const draft = ensureSchDraft(row.id);
  draft.schedule = kept;
  draft.droppedPast = dropped;
  schSyncDraftDays(draft);
}

/* Можно ли менять смену (прошлое не меняется) */
function schCellEditable(day, shift) {
  if ((schState.weekOffset || 0) < 0) return false;
  const weekDays = getClWeekDays(schState.weekOffset);
  const dateStr = cilDateByDayIdx(weekDays)[day];
  return !!dateStr && !isShiftPast(dateStr, shift);
}

function schAfterCellChange() {
  updateSchSaveBtn();
  renderScheduleMatrix();
  updateSchPanelCount();
}

/* --- Клики по ячейкам, быстрым кнопкам и шапке смен --- */
function bindScheduleCells() {
  const wrap = $('#schMatrixWrap');
  if (!wrap) return;

  wrap.querySelectorAll('.cil-plan').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (btn.classList.contains('cil-plan-val')) {
        showToast('Смена валидации: стандарт проверяется каждую смену до решения аналитика', true);
        return;
      }
      if (btn.dataset.locked === '1') {
        if ((schState.weekOffset || 0) < 0) {
          showToast('Прошедшая неделя — только просмотр', true);
        } else {
          showToast('Смена уже прошла. Чтобы она повторялась дальше — отметьте её на следующей неделе', true);
        }
        return;
      }
      const day = parseInt(btn.dataset.day, 10);
      const shift = btn.dataset.shift;
      const rowId = btn.dataset.rowId;
      if (!rowId) return;
      const on = !btn.classList.contains('on');
      schSetCell(rowId, day, shift, on);
      schAfterCellChange();
    });
  });

  // Быстрое заполнение строки: все / день / ночь / очистить (кроме прошедших смен)
  wrap.querySelectorAll('[data-sch-fill]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (isSchReadOnly()) return;
      const kind = btn.dataset.schFill;
      const rowId = btn.dataset.rowId;
      CIL_DAYS.forEach(d => ['day', 'night'].forEach(shift => {
        if (!schCellEditable(d.idx, shift)) return;
        schSetCell(rowId, d.idx, shift, kind === 'all' || kind === shift);
      }));
      schAfterCellChange();
    });
  });

  // Клик по букве смены в шапке — отметить смену у всех строк (или снять, если отмечена везде)
  wrap.querySelectorAll('[data-sch-col-day]').forEach(th => {
    th.addEventListener('click', () => {
      const day = parseInt(th.dataset.schColDay, 10);
      const shift = th.dataset.schColShift;
      if (!schCellEditable(day, shift)) return;
      const rows = (schState.rows || []).filter(isSchRowMember);
      const allOn = rows.length && rows.every(r => (getSchRowFreq(r).schedule || []).some(x => x.day === day && x.shift === shift));
      rows.forEach(r => schSetCell(r.id, day, shift, !allOn));
      schAfterCellChange();
    });
  });
}

/* --- Навигация по неделям в Расписании CL --- */
function bindSchWeekNav() {
  const goTo = (offset) => {
    if (offset === (schState.weekOffset || 0)) return;
    if (schState.dirty && !confirm('Есть несохранённые изменения. Продолжить без сохранения?')) return;
    schState.weekOffset = offset;
    schState.dirty = false;
    schState.draft = {};
    schState.removedFromSchedule = new Set();
    schState.addedToSchedule = new Set();
    updateSchSaveBtn();
    renderScheduleMatrix();
  };

  $('#schWeekPrev')?.addEventListener('click', () => goTo((schState.weekOffset || 0) - 1));
  $('#schWeekNext')?.addEventListener('click', () => goTo((schState.weekOffset || 0) + 1));
  document.querySelectorAll('[data-sch-week]').forEach(btn => {
    btn.addEventListener('click', () => goTo(Number(btn.dataset.schWeek)));
  });
  document.querySelectorAll('[data-sch-scope]').forEach(btn => {
    btn.addEventListener('click', () => {
      schState.saveScope = btn.dataset.schScope === 'week' ? 'week' : 'forward';
      renderScheduleMatrix();
    });
  });
}

/* --- Обновление состояния кнопки "Сохранить" --- */
function updateSchSaveBtn() {
  const btn = $('#schSaveBtn');
  if (!btn) return;
  btn.disabled = !schState.dirty || !schState.line;
}

/* --- Сохранение расписания --- */
function saveSchedule() {
  if (!schState.line) return;
  if (!schState.dirty) return;

  const weekOffset = schState.weekOffset || 0;
  if (weekOffset < 0) return showToast('Прошедшую неделю изменить нельзя', true);
  const weekLabel = getWeekLabel(weekOffset);

  // Время проверки до сохранения — чтобы записать «было → стало» в историю
  const twChanges = [];
  Object.keys(schState.draft).forEach(id => {
    const row = schState.rows.find(r => r.id === id);
    if (!row) return;
    twChanges.push({
      id,
      before: getRowForWeek(row, getSchWeekStart(weekOffset), schState.line).timeWindows,
      after: autoTimeWindows(schState.draft[id].work, schState.draft[id].schedule)
    });
  });

  let msg;
  if (schState.saveScope === 'week') {
    saveScheduleWeekOverride(weekOffset);
    msg = `Сохранено только для недели ${weekLabel}`;
  } else {
    if (saveScheduleForward(weekOffset) === false) return;
    msg = weekOffset === 0
      ? 'Сохранено: оставшиеся смены этой недели и шаблон со следующей недели'
      : `Шаблон сохранён с недели ${weekLabel}`;
  }

  // История изменений: время проверки (в лист линии и в историю стандарта)
  const twKind = schState.mode === 'mech' ? 'mech' : 'elec';
  const twList = twKind === 'mech' ? getStandards() : getElectronicParams();
  twChanges.forEach(c => {
    const r = twList.find(x => x.id === c.id);
    if (r) logTimeWindowsChange(twKind, r, c.before, c.after);
  });

  schState.dirty = false;
  schState.draft = {};
  schState.removedFromSchedule = new Set();
  schState.addedToSchedule = new Set();
  schState.addedRows = [];
  updateSchSaveBtn();
  renderScheduleMatrix();
  showToast(msg);
}

/* Сохранение «с этой недели и далее»: новая версия шаблона.
   Текущая неделя: прошедшие смены не меняются — оставшиеся смены
   сохраняются разовой правкой недели, а шаблон начинает действовать
   со следующей недели. */
function saveScheduleForward(weekOffset) {
  const line = schState.line;
  const weekStart = getSchWeekStart(weekOffset);
  const from = weekOffset === 0 ? getSchWeekStart(1) : weekStart;
  const removed = schState.removedFromSchedule || new Set();
  const added = schState.addedToSchedule || new Set();
  const touched = new Set([...Object.keys(schState.draft), ...removed, ...added]);
  if (!touched.size) return;

  // Состояние строк считаем ДО записи правок недели
  const stateOf = (row) => {
    const w = getRowForWeek(row, weekStart, line);
    const d = schState.draft[row.id];
    return {
      inSchedule: added.has(row.id) ? true : (removed.has(row.id) ? false : w.member),
      schedule: d ? d.schedule.concat(d.droppedPast || []) : w.schedule,
      timeWindows: d ? autoTimeWindows(d.work != null ? d.work : w.work, d.schedule) : w.timeWindows,
      work: d && d.work != null ? d.work : w.work
    };
  };
  const isMech = schState.mode === 'mech';
  const all = isMech ? getStandards() : getElectronicParams().map(normalizeElectronicParam);
  const states = {};
  all.forEach(r => { if (touched.has(r.id)) states[r.id] = stateOf(r); });

  // Более поздние версии шаблона заменятся — предупреждаем
  const later = all.filter(r => states[r.id] &&
    ((r.frequency && r.frequency.templates) || []).some(v => v.from > from));
  if (later.length && !confirm(
    `У ${later.length} строк(и) уже запланированы изменения на более поздние недели. ` +
    'Сохранение «с этой недели и далее» заменит их. Продолжить?')) {
    return false;
  }

  if (weekOffset === 0) {
    saveScheduleWeekOverride(0);
  } else {
    // Разовые правки этой недели для изменённых строк заменяет шаблон
    const ov = getScheduleWeekOverride(weekStart, line);
    if (ov) {
      touched.forEach(id => { if (ov.rows) delete ov.rows[id]; });
      ov.removed = (ov.removed || []).filter(id => !touched.has(id));
      ov.added = (ov.added || []).filter(id => !touched.has(id));
      setScheduleWeekOverride(weekStart, line, ov);
    }
  }

  const now = new Date().toISOString();
  all.forEach(r => {
    if (!states[r.id]) return;
    setRowTemplateFrom(r, from, states[r.id]);
    r.updatedAt = now;
  });
  if (isMech) setStandards(all);
  else setElectronicParams(all);
}

/* Сохранение правок для конкретной недели (не текущей) — не трогает
   базовый шаблон и другие недели. */
function saveScheduleWeekOverride(weekOffset) {
  const weekStart = getSchWeekStart(weekOffset);
  const line = schState.line;
  const ov = getScheduleWeekOverride(weekStart, line) || { removed: [], added: [], rows: {} };
  ov.removed = Array.isArray(ov.removed) ? ov.removed.slice() : [];
  ov.added = Array.isArray(ov.added) ? ov.added.slice() : [];
  ov.rows = ov.rows || {};

  // Ячейки, время, Run/Stop — кладём полный снимок строки для этой недели
  Object.entries(schState.draft).forEach(([id, freq]) => {
    ov.rows[id] = {
      schedule: Array.isArray(freq.schedule) ? freq.schedule.map(x => ({ ...x })) : [],
      timeWindows: autoTimeWindows(freq.work, freq.schedule),
      work: (freq.work != null) ? freq.work : undefined
    };
    // Раз строка снова в черновике — она точно не «убрана»
    ov.removed = ov.removed.filter(x => x !== id);
  });

  // Убрать из расписания (только эта неделя)
  if (schState.removedFromSchedule) {
    schState.removedFromSchedule.forEach(id => {
      if (!ov.removed.includes(id)) ov.removed.push(id);
      ov.added = ov.added.filter(x => x !== id);
      delete ov.rows[id];
    });
  }

  // Добавить в расписание (только эта неделя)
  if (schState.addedToSchedule) {
    schState.addedToSchedule.forEach(id => {
      if (!ov.added.includes(id)) ov.added.push(id);
      ov.removed = ov.removed.filter(x => x !== id);
    });
  }

  setScheduleWeekOverride(weekStart, line, ov);
}
