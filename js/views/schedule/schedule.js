/* ============================================================
   ВКЛАДКА «Расписание CL»
   Матрица, недели, время проверки, сохранение.
   Модуль общего пространства имён: функции и переменные видны
   во всех файлах. Порядок подключения — index.html.
   ============================================================ */

/* ============================================================
   РАСПИСАНИЕ CL — вкладка технолога
   ============================================================ */

/* Состояние вкладки */
const schState = {
  line: null,             // выбранная линия
  mode: 'mech',           // 'mech' | 'elec'
  part: '',               // '' | 'Maker' | 'Packer'  (только для mech)
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
  const savedPart = localStorage.getItem('cl_schedule_part') || '';

  schState.mode = savedMode;
  schState.part = savedPart;
  schState.line = savedLine;
  // С пятницы технолог планирует следующую неделю — открываем сразу её
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

  const label = schState.mode === 'mech' ? 'стандартов' : 'параметров';
  const labelShort = schState.mode === 'mech' ? 'с расписанием' : 'с расписанием';

  el.textContent = `${total} ${label} · ${withSchedule} ${labelShort}`;
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

/* --- Получить отфильтрованные строки расписания --- */
function getFilteredScheduleRows() {
  let rows = [];
  if (schState.mode === 'mech') {
    rows = getStandards()
      .filter(s => s.line === schState.line)
      .filter(s => s.active !== false)
      .filter(s => !schState.part || s.nodePart === schState.part)
      .filter(isSchRowMember);
  } else {
    rows = getElectronicParamsForLine(schState.line)
      .filter(p => p.active !== false)
      .filter(isSchRowMember);
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

  // Сортируем
  rows.sort((a, b) => {
    const oa = String(a.oplNumber || a.paramName || '').toLowerCase();
    const ob = String(b.oplNumber || b.paramName || '').toLowerCase();
    return oa.localeCompare(ob, 'ru', { numeric: true });
  });

  return rows;
}

/* --- Обновить счётчики над матрицей расписания --- */
function updateSchMatrixCounters(rows) {
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
        .filter(s => !schState.part || s.nodePart === schState.part)
        .filter(isSchRowMember)
    : getElectronicParamsForLine(schState.line)
        .filter(p => p.active !== false)
        .filter(isSchRowMember);

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

  // Дни недели
  const DAYS = [
    { idx: 1, name: 'Пн' },
    { idx: 2, name: 'Вт' },
    { idx: 3, name: 'Ср' },
    { idx: 4, name: 'Чт' },
    { idx: 5, name: 'Пт' },
    { idx: 6, name: 'Сб' },
    { idx: 0, name: 'Вс' }
  ];

  const weekDays = getClWeekDays(schState.weekOffset);
  const dateByDayIdx = {};
  [1, 2, 3, 4, 5, 6, 0].forEach((dayIdx, i) => {
    dateByDayIdx[dayIdx] = weekDays[i];
  });

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
      <div class="sch-scope" role="group" aria-label="Как сохранить изменения">
        <span class="sch-scope-label">Сохранить</span>
        <button type="button" class="sch-scope-btn ${schState.saveScope !== 'week' ? 'active' : ''}" data-sch-scope="forward"
                title="Изменения войдут в шаблон и будут повторяться каждую неделю">С этой недели и далее</button>
        <button type="button" class="sch-scope-btn ${schState.saveScope === 'week' ? 'active' : ''}" data-sch-scope="week"
                title="Разовые правки: другие недели не меняются">Только эта неделя</button>
      </div>`;

  let html = `
    <div class="cl-week-nav sch-week-nav">
      <button type="button" class="cl-week-nav-btn" id="schWeekPrev" title="Предыдущая неделя">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
      </button>
      <div class="cl-week-nav-label">
        <span class="cl-week-nav-title">${escapeHtml(weekKind)} · ${escapeHtml(weekLabel)}</span>
        <span class="cl-week-nav-sub">${escapeHtml(weekSub)}</span>
      </div>
      <button type="button" class="cl-week-nav-btn" id="schWeekNext" title="Следующая неделя">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
      </button>
      <div class="sch-week-quick">
        <button type="button" class="sch-week-chip ${off === 0 ? 'active' : ''}" data-sch-week="0">Эта неделя</button>
        <button type="button" class="sch-week-chip ${off === 1 ? 'active' : ''}" data-sch-week="1">Следующая</button>
      </div>
      ${scopeHtml}
    </div>
    <div class="sch-matrix ${isPastWeek ? 'sch-matrix-readonly' : ''}">`;

  // ===== Шапка (с инфо-колонками) =====
  html += '<div class="sch-head-grid">';

  // Инфо-колонки (9 штук), объединённые в одну ячейку на 2 ряда
  html += `<div class="sch-head-info" style="grid-column: 1 / 10; grid-row: 1 / 3;">
    <div style="width:48px;text-align:center">№</div>
    <div style="width:100px;text-align:center">OPL №</div>
    <div style="width:80px;text-align:center">Машина</div>
    <div style="width:180px;text-align:left">Узел</div>
    <div style="width:280px;text-align:left">Название</div>
    <div style="width:100px;text-align:center">Время</div>
    <div style="width:70px;text-align:center">Run/Stop</div>
    <div style="width:90px;text-align:center">Расписание</div>
    <div style="width:50px;text-align:center"></div>
  </div>`;

  // Дни: каждый — span 2 колонки, на 1-й ряд; под ним 2 ячейки смен
  DAYS.forEach((d, i) => {
    const dateStr = dateByDayIdx[d.idx];
    const shortDate = dateStr ? fmtShortDate(dateStr) : '';
    const colStart = 10 + i * 2;   // 9 инфо + смещение

    // Получаем бригады для этой даты
    const shifts = dateStr ? getShiftsForDate(dateStr) : { day: '—', night: '—' };

    html += `<div class="sch-head-day" style="grid-column: ${colStart} / ${colStart + 2}; grid-row: 1;">
      ${d.name} <span style="color:var(--text-dim);font-weight:500">${shortDate}</span>
    </div>`;
    html += `<div class="sch-head-shift sch-head-shift-day" style="grid-column: ${colStart}; grid-row: 2;">
      <span class="sch-head-shift-label">День ·</span> ${escapeHtml(shifts.day)}
    </div>`;
    html += `<div class="sch-head-shift sch-head-shift-night" style="grid-column: ${colStart + 1}; grid-row: 2;">
      <span class="sch-head-shift-label">Ночь ·</span> ${escapeHtml(shifts.night)}
    </div>`;
  });

  html += '</div>';

  // Тело — каждая строка (нумеруем)
  rows.forEach((row, idx) => {
    row._index = idx + 1;
    html += renderScheduleRow(row, DAYS, dateByDayIdx);
  });

  html += '</div>';
  wrap.innerHTML = html;

  // Обработчики
  bindScheduleCells();

  // Навигация по неделям
  bindSchWeekNav();

  // Клик по «×» — убрать из расписания
  wrap.querySelectorAll('[data-remove-from-schedule]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const rowId = btn.dataset.removeFromSchedule;
      removeRowFromSchedule(rowId);
    });
  });

  // Клик по колонке «Время» — открыть модалку
  wrap.querySelectorAll('[data-tw-open]').forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      const rowId = el.dataset.twOpen;
      if (isSchReadOnly()) return;
      if (rowId) openTimeWindowsModal(rowId);
    });
  });

  // Клик по Run/Stop — переключить прямо в черновике расписания
  wrap.querySelectorAll('[data-work-toggle]').forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      const rowId = el.dataset.workToggle;
      if (!rowId) return;
      if (isSchReadOnly()) return;
      const d = ensureSchDraft(rowId);
      d.work = (d.work === 'Stop') ? 'Run' : 'Stop';
      schState.dirty = true;
      updateSchSaveBtn();
      renderScheduleMatrix();
    });
  });
}
/* ============================================================
   РАСПИСАНИЕ CL — время проверки (timeWindows)
   ============================================================ */

/* Состояние модалки */
let twState = {
  rowId: null,
  draft: []   // [{from, to}, ...] — рабочая копия
};
/* Определить тип окна времени: 'day' или 'night' */
function getTimeWindowShift(from) {
  if (!from) return 'day';
  const hh = String(from).slice(0, 2);   // '09', '13', '21', '03'
  // Ночные: >= 21:00 или < 09:00
  if (hh >= '21' || hh < '09') return 'night';
  return 'day';
}
/* Открыть модалку */
function openTimeWindowsModal(rowId) {
  const modal = $('#timeWindowsModal');
  if (!modal) return;

  const row = schState.rows.find(r => r.id === rowId);
  if (!row) return;

  // Читаем текущие окна (из draft или из row.frequency)
  const freq = schState.draft[row.id] || row.frequency || {};
  const current = Array.isArray(freq.timeWindows) ? freq.timeWindows : [];

  twState.rowId = rowId;
  twState.draft = current.map(w => ({ from: w.from, to: w.to }));

  // Заголовок
  const title = row.title || row.paramName || '—';
  $('#timeWindowsPoint').textContent = 'Стандарт: ' + title;

  renderTimeWindowsList();

  openModal(modal);
}

/* Закрыть модалку */
function closeTimeWindowsModal() {
  closeModal('#timeWindowsModal');
  twState.rowId = null;
  twState.draft = [];
}

/* Отрисовать список окон */
function renderTimeWindowsList() {
  const list = $('#twList');
  if (!list) return;

  if (!twState.draft.length) {
    list.innerHTML = '<div class="tw-empty">Пока нет окон. Выберите предустановку или добавьте вручную.</div>';
    return;
  }

  list.innerHTML = twState.draft.map((w, idx) => {
    const shift = getTimeWindowShift(w.from);
    return `
      <div class="tw-item">
        <span class="tw-item-text tw-item-text-${shift}">${escapeHtml(w.from)}–${escapeHtml(w.to)}</span>
        <button type="button" class="tw-item-remove" data-tw-remove="${idx}" title="Удалить">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
    `;
  }).join('');

  // Обработчики удаления
  list.querySelectorAll('[data-tw-remove]').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.twRemove, 10);
      twState.draft.splice(idx, 1);
      renderTimeWindowsList();
    });
  });
}

/* Добавить окно в draft (с проверкой на дубли) */
function addTimeWindow(from, to) {
  if (!from || !to) return;
  // Проверка дубля
  const exists = twState.draft.some(w => w.from === from && w.to === to);
  if (exists) {
    showToast('Такое окно уже добавлено', true);
    return;
  }
  twState.draft.push({ from, to });
  renderTimeWindowsList();
}

/* Сохранить окна в draft расписания */
function saveTimeWindows() {
  if (!twState.rowId) return;

  const rowId = twState.rowId;

  // Инициализируем draft для строки (с учётом правок просматриваемой недели)
  ensureSchDraft(rowId);

  schState.draft[rowId].timeWindows = twState.draft.map(w => ({ from: w.from, to: w.to }));

  schState.dirty = true;
  updateSchSaveBtn();
  renderScheduleMatrix();
  closeTimeWindowsModal();
  showToast('Время проверки сохранено');
}

/* --- Обработчики модалки --- */

$('#timeWindowsClose')?.addEventListener('click', closeTimeWindowsModal);
$('#twCancelBtn')?.addEventListener('click', closeTimeWindowsModal);
$('#timeWindowsModal')?.addEventListener('click', (e) => {
  if (e.target.id === 'timeWindowsModal') closeTimeWindowsModal();
});

/* Быстрые предустановки */
$('#twPresetsList')?.addEventListener('click', (e) => {
  const btn = e.target.closest('.tw-preset-btn');
  if (!btn) return;
  const from = btn.dataset.from;
  const to = btn.dataset.to;
  addTimeWindow(from, to);
});

/* Добавить своё окно */
$('#twAddCustomBtn')?.addEventListener('click', () => {
  const from = $('#twCustomFrom')?.value || '';
  const to = $('#twCustomTo')?.value || '';
  if (!from || !to) {
    showToast('Укажите время «С» и «По»', true);
    return;
  }
  if (from >= to) {
    showToast('«С» должно быть раньше «По»', true);
    return;
  }
  addTimeWindow(from, to);
});

/* Очистить всё */
$('#twClearAllBtn')?.addEventListener('click', () => {
  if (!twState.draft.length) return;
  if (!confirm('Очистить все окна проверки для этой строки?')) return;
  twState.draft = [];
  renderTimeWindowsList();
});

/* Сохранить */
$('#twSaveBtn')?.addEventListener('click', saveTimeWindows);

/* --- Одна строка матрицы расписания (с инфо-колонками) --- */
/* Эффективная периодичность строки для ТЕКУЩЕЙ просматриваемой недели:
   черновик → оверрайд недели → базовый шаблон. */
function getSchRowFreq(row) {
  const base = (row && row.frequency) || { type: 'weekly', schedule: [], shifts: [], daysOfWeek: [], dates: [], timeWindows: [] };
  if (!row) return base;

  // Несохранённые правки главнее всего
  if (schState.draft[row.id]) return schState.draft[row.id];

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
  const w = (f.work != null) ? f.work : (row && row.work === 'Stop' ? 'Stop' : 'Run');
  if (w) d.work = w;

  schState.draft[rowId] = d;
  return d;
}

function renderScheduleRow(row, DAYS, dateByDayIdx) {
  // Получаем актуальную периодичность с учётом правок этой недели
  const freq = getSchRowFreq(row);
  const schedule = Array.isArray(freq.schedule) ? freq.schedule : [];
  const isOn = (dayIdx, shift) => schedule.some(x => x.day === dayIdx && x.shift === shift);

  const isMech = schState.mode === 'mech';

  // Поля — для мех и электро берём по-разному
  const oplNumber = isMech ? (row.oplNumber || '—') : '';
  const machine = row.machine || '';
  const node = isMech ? (row.node || '') : '';
  const title = isMech ? (row.title || '—') : (row.paramName || '—');
  // Время проверки — из frequency.timeWindows
  const timeWindows = Array.isArray(freq.timeWindows) ? freq.timeWindows : [];

  const work = (freq.work != null)
    ? (freq.work === 'Stop' ? 'Stop' : 'Run')
    : (row.work === 'Stop' ? 'Stop' : 'Run');

  // Норма / периодичность — счётчик ячеек
  const activeCells = schedule.length;
  const activeLabel = activeCells > 0
    ? `<span class="sch-row-badge">${activeCells} из 14</span>`
    : `<span class="sch-row-badge sch-row-badge-empty">0 из 14</span>`;

  let html = `<div class="sch-row" data-row-id="${escapeAttr(row.id)}">`;

  // --- Инфо-колонки ---
  html += `<div class="sch-info-cell sch-info-num">${row._index || ''}</div>`;
  html += `<div class="sch-info-cell sch-info-opl">${escapeHtml(oplNumber)}</div>`;
  html += `<div class="sch-info-cell sch-info-machine">${escapeHtml(machine)}</div>`;
  html += `<div class="sch-info-cell sch-info-node" title="${escapeAttr(node)}">${escapeHtml(node || '—')}</div>`;
  html += `<div class="sch-info-cell sch-info-title" title="${escapeAttr(title)}">${escapeHtml(title)}</div>`;
  // Колонка «Время» — чипы или прочерк
  let timeHtml = '';
  if (!timeWindows.length) {
    timeHtml = '<span class="sch-time-empty">—</span>';
  } else {
    timeHtml = timeWindows.map(w => {
      const shift = getTimeWindowShift(w.from);
      return `<span class="sch-time-chip sch-time-chip-${shift}">${escapeHtml(w.from)}–${escapeHtml(w.to)}</span>`;
    }).join('');
  }
  html += `<div class="sch-info-cell sch-info-time" data-tw-open="${escapeAttr(row.id)}" title="Кликните, чтобы задать время проверки">${timeHtml}</div>`;
  html += `<div class="sch-info-cell sch-info-work" data-work-toggle="${escapeAttr(row.id)}" title="Кликните, чтобы переключить Run/Stop">${work === 'Run'
    ? '<span class="sch-work-badge sch-work-badge-run">Run</span>'
    : '<span class="sch-work-badge sch-work-badge-stop">Stop</span>'}</div>`;
  html += `<div class="sch-info-cell sch-info-schedule">${activeLabel}</div>`;
  html += `<div class="sch-info-cell sch-info-actions">
    <button type="button" class="sch-row-remove" data-remove-from-schedule="${escapeAttr(row.id)}" title="Убрать из расписания">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <line x1="18" y1="6" x2="6" y2="18"/>
        <line x1="6" y1="6" x2="18" y2="18"/>
      </svg>
    </button>
  </div>`;

  // 14 ячеек: 7 дней × 2 смены. Прошлое не меняется: заблокированы
  // прошедшая неделя целиком и уже закончившиеся смены текущей недели
  // (текущую смену ещё можно запланировать).
  const isPastWeek = (schState.weekOffset || 0) < 0;

  DAYS.forEach(d => {
    const dateStr = (dateByDayIdx && dateByDayIdx[d.idx]) || '';

    ['day', 'night'].forEach(shift => {
      const isPast = isPastWeek || (!!dateStr && isShiftPast(dateStr, shift));
      const on = isOn(d.idx, shift);
      const lockedCls = isPast ? ' sch-cell-locked' : '';
      const lockedAttr = isPast ? ' data-locked="1"' : '';
      const shiftName = shift === 'day' ? 'День' : 'Ночь';
      const title = isPast
        ? (isPastWeek
            ? `${d.name} · ${shiftName} — прошедшая неделя, только просмотр`
            : `${d.name} · ${shiftName} — смена уже прошла`)
        : `${d.name} · ${shiftName}`;
      html += `<button type="button"
        class="sch-cell-cell sch-cell-cell-${shift} ${on ? 'on' : ''}${lockedCls}"
        data-row-id="${escapeAttr(row.id)}"
        data-day="${d.idx}"
        data-shift="${shift}"${lockedAttr}
        title="${escapeAttr(title)}">${on ? '✓' : ''}</button>`;
    });
  });

  html += '</div>';
  return html;
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
/* --- Клики по ячейкам матрицы --- */
function bindScheduleCells() {
  const wrap = $('#schMatrixWrap');
  if (!wrap) return;

  wrap.querySelectorAll('.sch-cell-cell').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      // Заблокированные дни: прошедшая неделя или прошедшие дни текущей недели
      if (btn.dataset.locked === '1') {
        if ((schState.weekOffset || 0) < 0) {
          showToast('Прошедшая неделя — только просмотр', true);
        } else {
          showToast('Смена уже прошла. Чтобы она повторялась дальше — отметьте её на следующей неделе', true);
        }
        return;
      }
      const rowId = btn.dataset.rowId;
      const day = parseInt(btn.dataset.day, 10);
      const shift = btn.dataset.shift;
      if (!rowId) return;

      // Инициализация draft для строки (с учётом правок этой недели)
      const draft = ensureSchDraft(rowId);

      // Определяем текущее состояние
      const idx = draft.schedule.findIndex(x => x.day === day && x.shift === shift);
      const isOn = idx !== -1;

      if (isOn) {
        // Выключаем — удаляем пару
        draft.schedule.splice(idx, 1);
      } else {
        // Включаем — добавляем пару
        draft.schedule.push({ day, shift });
      }

      // Пересчитываем daysOfWeek и shifts (для совместимости)
      draft.daysOfWeek = [...new Set(draft.schedule.map(x => x.day))]
        .sort((a, b) => {
          const av = a === 0 ? 7 : a;
          const bv = b === 0 ? 7 : b;
          return av - bv;
        });
      draft.shifts = [...new Set(draft.schedule.map(x => x.shift))];
      if (!draft.shifts.length) draft.shifts = ['day', 'night'];

      schState.dirty = true;
      updateSchSaveBtn();

      // Обновляем визуально эту ячейку
      const nowOn = draft.schedule.some(x => x.day === day && x.shift === shift);
      btn.classList.toggle('on', nowOn);
      btn.textContent = nowOn ? '✓' : '';

      // Обновляем счётчик «N из 14» в строке
      const rowEl = btn.closest('.sch-row');
      if (rowEl) {
        const badge = rowEl.querySelector('.sch-row-badge');
        if (badge) {
          const n = draft.schedule.length;
          badge.textContent = `${n} из 14`;
          if (n > 0) {
            badge.classList.remove('sch-row-badge-empty');
          } else {
            badge.classList.add('sch-row-badge-empty');
          }
        }
      }

      // Обновляем счётчики тулбара
      if (typeof updateSchMatrixCounters === 'function') {
        updateSchMatrixCounters(schState.rows);
      }
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
      schedule: d ? d.schedule : w.schedule,
      timeWindows: d ? d.timeWindows : w.timeWindows,
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
      timeWindows: Array.isArray(freq.timeWindows) ? freq.timeWindows.map(w => ({ from: w.from, to: w.to })) : [],
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
