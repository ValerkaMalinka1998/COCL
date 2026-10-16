/* ============================================================
   КОНСТАНТЫ И ХРАНИЛИЩЕ
   ============================================================ */
const STORAGE_KEYS = {
  standards: 'cl_standards_v3',
  history: 'cl_history_v2',
  nodes: 'cl_nodes_v2',
  lines: 'cl_lines_v2',
  shifts: 'cl_shifts_v2',
  brands: 'cl_brands_v2',
  brandWorkshops: 'cl_brandWorkshops_v1',
  lineBrands: 'cl_lineBrands_v2',
  operators: 'cl_operators_v2',
  workshops: 'cl_workshops_v1',   // ← НОВОЕ (заменяет blocks)
  blocks: 'cl_blocks_v1',         // оставлен для удаления при миграции
  lineMachines: 'cl_lineMachines_v1',
  topLosses: 'cl_toplosses_v1',
  electronicShiftCfg: 'cl_electronic_shiftcfg_v1',
  electronicParams: 'cl_electronic_params_v1',
  electronicBrandSchedule: 'cl_electronic_brandschedule_v1',
  customTriggers: 'cl_custom_triggers_v1',
  scheduleWeeks: 'cl_schedule_weeks_v1'
};

/* ============================================================
   ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ РЕДАКТОРА
   ============================================================ */

let currentEditorLine = null;
let dashboardWorkshop = '';   // '' = все цеха, иначе id цеха

/* ============================================================
   ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ
   ============================================================ */
const DEFAULT_LINES = ['SD01','SD03','SD06','SD08','SD12','SD25','SD27','SD31'];
const DEFAULT_SHIFTS = ['A','B','C','D'];
const DEFAULT_BRANDS = ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P'];

/* ============================================================
   СТРУКТУРА ПРОИЗВОДСТВА
   Цех (workshop) → Участок (area) → Блок (block, опционально) → Линия
   ============================================================ */

const DEFAULT_WORKSHOPS = [
  {
    id: 'smd',
    name: 'SMD',
    subtitle: 'Производство сигарет/стиков',
    areas: [
      {
        id: 'smd_area1',
        name: 'Cell 1',
        blocks: [
          { id: 'smd_area1_lst1', name: 'LST 1', lines: [] },
          { id: 'smd_area1_lst2', name: 'LST 2', lines: [] }
        ]
      },
      {
        id: 'smd_area2',
        name: 'Cell 2',
        blocks: [
          { id: 'smd_area2_lst1', name: 'LST 1', lines: ['SD06', 'SD12', 'SD27', 'SD31'] },
          { id: 'smd_area2_lst2', name: 'LST 2', lines: ['SD01', 'SD03', 'SD08', 'SD25'] }
        ]
      },
      {
        id: 'smd_area3',
        name: 'Cell 3',
        blocks: [
          { id: 'smd_area3_lst1', name: 'LST 1', lines: [] },
          { id: 'smd_area3_lst2', name: 'LST 2', lines: [] }
        ]
      }
    ]
  },
  {
    id: 'pmd',
    name: 'PMD',
    subtitle: 'Производство табака',
    areas: [
      {
        id: 'pmd_sfg',
        name: 'SFG',
        blocks: null,
        lines: ['CLD', 'CRS (жилка)', 'Fibex', 'Бракобойка']
      },
      {
        id: 'pmd_crt',
        name: 'CRT',
        blocks: null,
        lines: ['Lamina', 'Восточный склад', 'Северный склад']
      }
    ]
  },
  {
    id: 'fmd',
    name: 'FMD',
    subtitle: 'Производство фильтров',
    areas: [
      {
        id: 'fmd_cell1',
        name: 'Cell 1',
        blocks: [
          { id: 'fmd_cell1_lst1', name: 'LST 1', lines: [] },
          { id: 'fmd_cell1_lst2', name: 'LST 2', lines: [] }
        ]
      },
      {
        id: 'fmd_cell2',
        name: 'Cell 2',
        blocks: [
          { id: 'fmd_cell2_lst1', name: 'LST 1', lines: [] },
          { id: 'fmd_cell2_lst2', name: 'LST 2', lines: [] }
        ]
      }
    ]
  }
];
/* ============================================================
   ПРОВЕРКА CL — состояние вкладки
   ============================================================ */

const clState = {
  line: null,
  mode: 'mech',
  part: '',
  checkMode: false,
  rows: [],
  todayISO: '',
  weekOffset: 0,
  shiftType: 'day',
  shiftLetter: '—',
  brand: '',
  brandPlanned: '',
  brandReason: '',
  quickDraft: {}
};

/* ============================================================
   РЕДАКТОР: недавние линии и режим просмотра
   ============================================================ */

const RECENT_LINES_KEY = 'cl_recent_lines';
const RECENT_LINES_MAX = 5;

/* --- Недавние линии --- */
function getRecentLines() {
  try {
    const raw = localStorage.getItem(RECENT_LINES_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(arr)) return [];

    // Отфильтровать удалённые из структуры линии
    const allLines = getLines();
    const valid = arr.filter(l => typeof l === 'string' && allLines.includes(l));

    // Если что-то отфильтровалось — сохранить очищенный список
    if (valid.length !== arr.length) {
      localStorage.setItem(RECENT_LINES_KEY, JSON.stringify(valid));
    }
    return valid.slice(0, RECENT_LINES_MAX);
  } catch (e) {
    return [];
  }
}

function addRecentLine(line) {
  if (!line) return;
  const current = getRecentLines();
  const next = [line, ...current.filter(l => l !== line)].slice(0, RECENT_LINES_MAX);
  try {
    localStorage.setItem(RECENT_LINES_KEY, JSON.stringify(next));
  } catch (e) {}
}

/* Машины для линий — по умолчанию пустые (заполняются в Настройках) */
const DEFAULT_LINE_MACHINES = {};

/* Все возможные изменения (общий список — используется в редакторе стандартов) */
const MATERIAL_CHANGES = [
  { value: 'tobacco',       label: 'Табак' },
  { value: 'materials',     label: 'Материалы' },
  { value: 'foil_paper',    label: 'Фольга / Бумага' },
  { value: 'polypropylene', label: 'Полипропилен (цветной ↔ обычный)' }
];

/* Что показывать оператору на вкладке Проверка — по частям линии */
const MINOR_CHANGES_BY_PART = {
  'Maker': [
    { value: 'tobacco',         label: 'Табак' },
    { value: 'materials',       label: 'Материалы' },
    { value: 'tobacco_materials', label: 'Табак + Материалы' }
  ],
  'Packer': [
    { value: 'foil_paper',    label: 'Фольга / Бумага' },
    { value: 'polypropylene', label: 'Полипропилен (цветной ↔ обычный)' }
  ]
};

const DEFAULT_NODES = [
  { name: 'Табачный блок', part: 'Maker' },
  { name: 'Форматный блок', part: 'Maker' },
  { name: 'Блок фильтра', part: 'Maker' },
  { name: 'Блок обертки', part: 'Packer' },
  { name: 'Блок пачки', part: 'Packer' },
  { name: 'Блок целлофана', part: 'Packer' },
  { name: 'Блок блока', part: 'Packer' },
  { name: 'Привод главный', part: 'Both' },
  { name: 'Пневматика', part: 'Both' }
];

/* Top Losses — категории и потери по умолчанию */
const DEFAULT_TOP_LOSSES = [
  {
    id: 'cat_stops',
    name: 'Увеличенные остановки',
    items: [
      { id: 'loss_hopper',    name: 'Остановки по хопперу' },
      { id: 'loss_strand',    name: 'Обрыв штранга' },
      { id: 'loss_max_jam',   name: 'Заторы на MAX' },
      { id: 'loss_foil_break',name: 'Обрыв фольги' },
      { id: 'loss_no_label',  name: 'Нет этикета (бланка)' }
    ]
  },
  {
    id: 'cat_quality',
    name: 'Дефекты по качеству',
    items: [
      { id: 'loss_cig_crush',  name: 'Замятие сигарет' },
      { id: 'loss_tipping',    name: 'Замятие типпинга' },
      { id: 'loss_empty_ends', name: 'Осыпка (пустые торцы сигарет)' },
      { id: 'loss_pack_gaps',  name: 'Дефекты на пачке: щели' },
      { id: 'loss_pack_panels',name: 'Дефекты на пачке: выступающие панели' }
    ]
  },
  {
    id: 'cat_emissions',
    name: 'Повышенные выбросы',
    items: [
      { id: 'loss_les',       name: 'Выбросы по LES' },
      { id: 'loss_otis',      name: 'Выбросы по OTIS' },
      { id: 'loss_foil_valve',name: 'Выбросы по фольге (отрывному клапану)' },
      { id: 'loss_tear_tape', name: 'Выбросы по отрывной ленточке пачки/блока' }
    ]
  }
];

/* ============================================================
   CL ELECTRONIC — дефолтная конфигурация графика смен
   ============================================================ */
const DEFAULT_ELECTRONIC_SHIFT_CFG = {
  dayCycle:   ['B','D','D','A','A','C','C','B','B','D','D','A','A','C','C','B'],
  nightCycle: ['A','C','C','B','B','D','D','A','A','C','C','B','B','D','D','A'],
  startDate:  '2026-10-01'
};

/* ============================================================
   СТЕК МОДАЛЬНЫХ ОКОН
   ============================================================ */

const modalStack = [];

function openModal(modalOrId) {
  const modal = typeof modalOrId === 'string'
    ? (modalOrId.startsWith('#') ? document.querySelector(modalOrId) : document.getElementById(modalOrId))
    : modalOrId;

  if (!modal) {
    console.warn('openModal: элемент не найден', modalOrId);
    return;
  }

  // Если уже открыта — просто активируем
  if (modalStack.includes(modal)) {
    modal.classList.add('active');
    modal.classList.remove('modal-suspended');
    return;
  }

  // Приостанавливаем ВСЕ активные модалки, кроме открываемой.
  // Это устойчиво к любой вложенности, даже если где-то
  // модалка была открыта вручную через classList.add('active').
  document.querySelectorAll('.modal-overlay.active').forEach(m => {
    if (m !== modal) m.classList.add('modal-suspended');
  });

  // Считаем z-index поверх стека
  const baseZ = parseInt(
    getComputedStyle(document.documentElement)
      .getPropertyValue('--modal-z-base')
      .trim() || '2000',
    10
  );
  const z = baseZ + modalStack.length * 10;

  modal.style.zIndex = z;
  modal.classList.add('active');
  modal.classList.remove('modal-suspended');

  modalStack.push(modal);
}

/**
 * Закрыть модалку: убрать из стека + пересчитать z-index оставшихся.
 * @param {HTMLElement|string} modalOrId
 */
function closeModal(modalOrId) {
  const modal = typeof modalOrId === 'string'
    ? (modalOrId.startsWith('#') ? document.querySelector(modalOrId) : document.getElementById(modalOrId))
    : modalOrId;

  if (!modal) return;

  // Скрываем закрываемую
  modal.classList.remove('active');
  modal.classList.remove('modal-suspended');
  modal.style.zIndex = '';

  // Убираем из стека
  const idx = modalStack.indexOf(modal);
  if (idx !== -1) {
    modalStack.splice(idx, 1);
  }

  // --- Снимаем suspend со всех модалок, которые должны быть видны ---
  // Логика: если модалка в стеке — она должна быть видима.
  // Если модалка не в стеке — она не должна быть видима вообще.
  document.querySelectorAll('.modal-overlay.modal-suspended').forEach(m => {
    if (modalStack.includes(m)) {
      m.classList.remove('modal-suspended');
      m.classList.add('active');
    } else {
      m.classList.remove('modal-suspended');
      m.classList.remove('active');
    }
  });

  // Пересчитываем z-index оставшихся в стеке
  const baseZ = parseInt(
    getComputedStyle(document.documentElement)
      .getPropertyValue('--modal-z-base')
      .trim() || '2000',
    10
  );
  modalStack.forEach((m, i) => {
    m.style.zIndex = baseZ + i * 10;
  });
}
/**
 * Утилита: навесить на модалку закрытие по клику вне её.
 * Требует, чтобы у модалки был собственный id, и весь контент —
 * внутри вложенного .modal.
 */
function bindModalBackdropClose(modalId) {
  const modal = typeof modalId === 'string'
    ? (modalId.startsWith('#') ? document.querySelector(modalId) : document.getElementById(modalId))
    : modalId;
  if (!modal) return;

  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal(modal);
  });
}

/* Склонение: 1 стандарт / 2 стандарта / 5 стандартов */
function pluralizeStandards(n) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return 'стандарт';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return 'стандарта';
  return 'стандартов';
}

/* Кнопка «← Назад к блокам» */
$('#editorBlocksBackBtn')?.addEventListener('click', () => {
  $('#editorLinesView').style.display = 'none';
  $('#editorBlocksView').style.display = 'block';
  $('#editorLineView').style.display = 'none';
  localStorage.removeItem('cl_editor_block');
  localStorage.removeItem('cl_editor_line');
  renderEditorBlocksView();
});

/* ============================================================
   РЕДАКТОР — ЭЛЕКТРОННЫЙ РЕЖИМ
   ============================================================ */

/* Текущее состояние электронного редактора */
let currentElectronicLine = null;   // выбранная линия
let currentElectronicMachine = null; // выбранная машина


function pluralizeParams(n) {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return 'параметр';
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return 'параметра';
  return 'параметров';
}
function pluralizeDays(n) {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return 'день';
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return 'дня';
  return 'дней';
}

/* ============================================================
   ФОРМА ЭЛЕКТРОННОГО ПАРАМЕТРА
   ============================================================ */

function openElectronicParamForm(id) {
  const modal = $('#electronicParamModal');
  if (!modal) return;
  if (!currentElectronicLine) return showToast('Сначала выберите линию', true);
  if (!currentElectronicMachine) return showToast('Сначала выберите машину', true);

  const title = $('#electronicParamTitle');
  let p;

  if (id) {
    p = getElectronicParams().map(normalizeElectronicParam).find(x => x.id === id);
    if (!p) return;
    title.textContent = 'Изменить параметр: ' + (p.paramName || '');
  } else {
    p = {
      id: '',
      active: true,
      line: currentElectronicLine,
      machine: currentElectronicMachine,
      paramName: '',
      work: 'Run',
      timeFrom: '09:10',
      timeTo: '10:00',
      controlType: 'variable',
      normText: '',
      valuesByBrand: [],
      frequency: { type: 'weekly', schedule: [], shifts: ['day','night'], daysOfWeek: [], dates: [] },
      inSchedule: false
    };
    title.textContent = 'Добавить электронный параметр — ' + currentElectronicMachine;
  }

  // Основные
  $('#ep_id').value = id || '';
  $('#ep_line').value = currentElectronicLine;

  // Часть линии — только для SMD
  const ep_nodePartField = $('#ep_nodePartField');
  const ep_nodePartSelect = $('#ep_nodePart');
  if (ep_nodePartField) {
    const workshopId = getWorkshopIdForLine(currentElectronicLine);
    if (workshopId === 'smd') {
      ep_nodePartField.style.display = '';
    } else {
      ep_nodePartField.style.display = 'none';
    }
  }
  if (ep_nodePartSelect) {
    ep_nodePartSelect.value = p.nodePart || '';
  }

  // Машина — выпадающий список
  fillElectronicMachineSelect(currentElectronicLine, p.machine);
  $('#ep_paramName').value = p.paramName || '';

  // Работа — чипы
  $('#ep_workChips')?.querySelectorAll('.elec-work-chip').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.work === p.work);
  });

  // Тип контроля
  const epControlTypeEl = $('#ep_controlType');
  if (epControlTypeEl) epControlTypeEl.value = p.controlType;
  $('#ep_controlTypeSelector')?.querySelectorAll('.type-option').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.value === p.controlType);
  });
  updateElectronicFormVisibility();

  // Текстовая норма
  const epNormTextEl = $('#ep_normText');
  if (epNormTextEl) epNormTextEl.value = p.normText || '';

  // Применяемость — чипы
  const appliesToArr = Array.isArray(p.appliesTo) ? p.appliesTo : [];
  $$('#ep_appliesToGroup input').forEach(cb => {
    cb.checked = appliesToArr.includes(cb.value);
    cb.closest('label').classList.toggle('checked', cb.checked);
    cb.onchange = (e) => {
      e.target.closest('label').classList.toggle('checked', e.target.checked);
    };
  });

  // Триггеры Change Over
  fillElectronicTriggersGroup(Array.isArray(p.triggers) ? p.triggers : []);

  // Таблица брендов
  renderElectronicBrandsTable(p.valuesByBrand || []);

  // Периодичность — скрываем, теперь она настраивается в «Расписании CL»
  p.frequency = p.frequency || { type: 'weekly', schedule: [], shifts: ['day','night'], daysOfWeek: [], dates: [] };

  openModal(modal);
}
window.openElectronicParamForm = openElectronicParamForm;

function closeElectronicParamForm() {
  closeModal('#electronicParamModal');
}

/* Заполнить выпадающий список машин для линии */
function fillElectronicMachineSelect(line, currentValue) {
  const select = $('#ep_machine');
  if (!select) return;

  const machines = getMachinesForLine(line);
  let html = '<option value="">— выберите —</option>';
  if (currentValue && !machines.includes(currentValue)) {
    html += `<option value="${escapeHtml(currentValue)}">${escapeHtml(currentValue)} (не в списке)</option>`;
  }
  html += machines.map(m => `<option value="${escapeHtml(m)}">${escapeHtml(m)}</option>`).join('');
  select.innerHTML = html;
  if (currentValue) select.value = currentValue;
}

/* Заполнить группу триггеров электронного параметра */
function fillElectronicTriggersGroup(selected = []) {
  const g = $('#ep_triggersGroup');
  if (!g) return;

  const custom = getCustomTriggers().map(t => ({ value: t.value, label: t.label }));
  const nodes = (typeof getNodes === 'function' ? getNodes() : []).map(n => ({
    value: 'node:' + n.name,
    label: n.name + ' [' + n.part + ']'
  }));
  const all = [...custom, ...nodes];

  if (!all.length) {
    g.innerHTML = '<span style="color:var(--text-dim);font-size:12px">Триггеры не настроены</span>';
    return;
  }

  g.innerHTML = '<div class="checkbox-group">' + all.map(t => {
    const checked = selected.includes(t.value);
    return `<label class="${checked ? 'checked' : ''}"><input type="checkbox" value="${escapeHtml(t.value)}" ${checked ? 'checked' : ''}> ${escapeHtml(t.label)}</label>`;
  }).join('') + '</div>';

  g.querySelectorAll('input').forEach(cb => {
    cb.addEventListener('change', e => {
      e.target.closest('label').classList.toggle('checked', e.target.checked);
    });
  });
}

/* Показать/скрыть блоки в зависимости от controlType */
function updateElectronicFormVisibility() {
  const ct = $('#ep_controlType')?.value || 'variable';

  const normBlock = $('#ep_normTextBlock');
  const brandsBlock = $('#ep_brandsBlock');

  if (normBlock)   normBlock.style.display   = (ct === 'fixed')    ? 'block' : 'none';
  if (brandsBlock) brandsBlock.style.display = (ct === 'variable' || ct === 'interval')  ? 'block' : 'none';
}

/* ============================================================
   Таблица брендов
   ============================================================ */

function renderElectronicBrandsTable(rows) {
  const tbody = $('#ep_brandsTbody');
  if (!tbody) return;

  const lineBrands = getBrandsForLine(currentElectronicLine);

  if (!rows.length) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--text-dim);font-style:italic;padding:14px">Нет строк. Нажмите «Добавить бренд».</td></tr>';
    return;
  }

  tbody.innerHTML = rows.map((r, idx) => {
    const brandOpts = ['<option value="">— выберите —</option>']
      .concat(lineBrands.map(b => {
        const selected = (b === r.brand) ? ' selected' : '';
        return `<option value="${escapeHtml(b)}"${selected}>${escapeHtml(b)}</option>`;
      })).join('');

    return `
      <tr data-row-idx="${idx}">
        <td><select data-brand>${brandOpts}</select></td>
        <td><input type="number" step="any" data-target value="${escapeAttr(r.target != null ? r.target : '')}" placeholder="0"></td>
        <td><input type="number" step="any" data-tolerance value="${escapeAttr(r.tolerance != null ? r.tolerance : '')}" placeholder="0"></td>
        <td>
          <button type="button" class="elec-brands-remove" data-remove-row title="Удалить">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </td>
      </tr>
    `;
  }).join('');

  tbody.querySelectorAll('[data-remove-row]').forEach(btn => {
    btn.addEventListener('click', () => {
      const tr = btn.closest('tr');
      if (tr) tr.remove();
      if (!tbody.querySelector('tr')) {
        renderElectronicBrandsTable([]);
      }
    });
  });
}

/* ============================================================
   Периодичность: чек-боксы смен и дней недели
   ============================================================ */

function renderFreqShiftsCheckboxes(containerId, selectedShifts) {
  const c = document.getElementById(containerId);
  if (!c) return;
  c.innerHTML = ['A','B','C','D'].map(s => {
    const checked = selectedShifts.includes(s) ? 'checked' : '';
    const cls = checked ? 'checked' : '';
    return `<label class="${cls}"><input type="checkbox" value="${s}" ${checked}> ${s}</label>`;
  }).join('');
  c.querySelectorAll('input').forEach(cb => {
    cb.addEventListener('change', e => {
      e.target.closest('label').classList.toggle('checked', e.target.checked);
    });
  });
}

function renderFreqDaysCheckboxes(containerId, selectedDays) {
  const c = document.getElementById(containerId);
  if (!c) return;

  // Отображение — Пн..Вс (как в недельной матрице),
  // но value остаётся совместим с getDay(): 0=Вс, 1=Пн, ..., 6=Сб.
  const days = [
    { idx: 1, name: 'Пн' },
    { idx: 2, name: 'Вт' },
    { idx: 3, name: 'Ср' },
    { idx: 4, name: 'Чт' },
    { idx: 5, name: 'Пт' },
    { idx: 6, name: 'Сб' },
    { idx: 0, name: 'Вс' }
  ];

  c.innerHTML = days.map(({ idx, name }) => {
    const checked = selectedDays.includes(idx) ? 'checked' : '';
    const cls = checked ? 'checked' : '';
    return `<label class="${cls}"><input type="checkbox" value="${idx}" ${checked}> ${name}</label>`;
  }).join('');

  c.querySelectorAll('input').forEach(cb => {
    cb.addEventListener('change', e => {
      e.target.closest('label').classList.toggle('checked', e.target.checked);
    });
  });
}

function updateFreqBlocksVisibility() {
  const type = $('#ep_freqType').value;
  $('#ep_freqDailyBlock').style.display  = (type === 'daily')  ? 'block' : 'none';
  $('#ep_freqWeeklyBlock').style.display = (type === 'weekly') ? 'block' : 'none';
  $('#ep_freqOnceBlock').style.display   = (type === 'once')   ? 'block' : 'none';
}

/* Пагинация истории — отдельные переменные, чтобы не конфликтовать с редактором */
let historyPage = 1;
let historyPageSize = 10;

/* ============================================================
   СПИСОК СТАНДАРТОВ — таблица + пагинация + сортировка
   ============================================================ */

/**
 * Иконка сортировки для заголовка колонки.
 * @param {string} field — ключ колонки
 * @returns {string} HTML-строка
 */

/* ============================================================
   КОММЕНТАРИЙ К ДЕАКТИВАЦИИ
   ============================================================ */

let currentDeactivationStdId = null;

/* Открыть модалку комментария */
window.openDeactivationCommentModal = function(stdId) {
  const st = getStandards().find(s => s.id === stdId);
  if (!st) return;

  // Если стандарт активен — не открываем
  if (st.active !== false) {
    return showToast('Комментарий можно оставить только для деактивированного стандарта', true);
  }

  currentDeactivationStdId = stdId;

  const modal = $('#deactivationCommentModal');
  if (!modal) return;

  $('#deactivationCommentPoint').textContent =
    `Стандарт: ${st.oplNumber || '—'} — ${st.title || ''}`;
  $('#deactivationCommentText').value = st.deactivationComment || '';

  // Архив
  const archiveBlock = $('#deactivationArchiveBlock');
  const archiveList = $('#deactivationArchiveList');
  const history = Array.isArray(st.deactivationHistory) ? st.deactivationHistory : [];

  if (history.length) {
    archiveBlock.style.display = 'block';
    archiveList.innerHTML = history
      .slice()
      .reverse()  // новые сверху
      .map(h => `
        <div class="deactivation-archive-item">
          <div class="deactivation-archive-date">${formatDateTime(h.date)}</div>
          <div class="deactivation-archive-text">${escapeHtml(h.text)}</div>
        </div>
      `)
      .join('');
  } else {
    archiveBlock.style.display = 'none';
    archiveList.innerHTML = '';
  }

  // Кнопка «Очистить» — активна только если есть текст
  const clearBtn = $('#deactivationClearBtn');
  if (clearBtn) {
    clearBtn.style.display = (st.deactivationComment && st.deactivationComment.trim()) ? '' : 'none';
  }

  openModal(modal);
  setTimeout(() => {
    const ta = $('#deactivationCommentText');
    if (ta) ta.focus();
  }, 100);
};

function closeDeactivationCommentModal() {
  closeModal('#deactivationCommentModal');
  currentDeactivationStdId = null;
}

/* --- Обработчики модалки --- */
$('#deactivationCommentClose')?.addEventListener('click', closeDeactivationCommentModal);
$('#deactivationCancelBtn')?.addEventListener('click', closeDeactivationCommentModal);
$('#deactivationCommentModal')?.addEventListener('click', (e) => {
  if (e.target.id === 'deactivationCommentModal') closeDeactivationCommentModal();
});

/* Сохранить */
$('#deactivationSaveBtn')?.addEventListener('click', () => {
  if (!currentDeactivationStdId) return;
  const text = ($('#deactivationCommentText').value || '').trim();

  const all = getStandards();
  const st = all.find(s => s.id === currentDeactivationStdId);
  if (!st) return;

  st.deactivationComment = text;
  setStandards(all);

   refreshEditorMechTable();
  closeDeactivationCommentModal();
  showToast(text ? 'Комментарий сохранён' : 'Комментарий удалён');
});

/* Очистить */
$('#deactivationClearBtn')?.addEventListener('click', () => {
  if (!currentDeactivationStdId) return;
  if (!confirm('Очистить комментарий к деактивации?')) return;

  const all = getStandards();
  const st = all.find(s => s.id === currentDeactivationStdId);
  if (!st) return;

  st.deactivationComment = '';
  setStandards(all);

  refreshEditorMechTable();
  closeDeactivationCommentModal();
  showToast('Комментарий удалён');
});

/* ============================================================
   ФОРМА СТАНДАРТА — заполнение выпадающего списка машин
   ============================================================ */
function fillStandardMachineSelect(line, currentValue) {
  const select = $('#sf_machine');
  if (!select) return;

  const machines = typeof getMachinesForLine === 'function'
    ? getMachinesForLine(line)
    : [];

  let html = '<option value="">— выберите —</option>';

  // Если у текущего стандарта машина НЕ из списка — добавим её в options с пометкой
  const needAddCurrent = currentValue &&
                         currentValue.trim() !== '' &&
                         !machines.includes(currentValue);

  if (needAddCurrent) {
    html += `<option value="${escapeHtml(currentValue)}">${escapeHtml(currentValue)} (не в списке)</option>`;
  }

  html += machines.map(m =>
    `<option value="${escapeHtml(m)}">${escapeHtml(m)}</option>`
  ).join('');

  select.innerHTML = html;

  if (currentValue) {
    select.value = currentValue;
  }
}

function updateStandardPointsVisibility() {
  const ct = $('#sf_controlType')?.value || '';
  const section = $('#sf_pointsSection');
  if (!section) return;

  // Все три типа могут иметь точки: fixed — опционально (без точек → ОК/НеОК),
  // variable и interval — обязательно. Поэтому блок точек показываем всегда.
  section.style.display = 'block';
}

function openStandardForm(id) {
  // Восстанавливаем из localStorage, если переменная пусто
  if (!currentEditorLine) {
    const saved = localStorage.getItem('cl_editor_line');
    if (saved) currentEditorLine = saved;
  }
  if (!currentEditorLine) return showToast('Сначала откройте линию', true);

  const modal = $('#standardFormModal');
  const title = $('#standardFormTitle');
  if (!modal) return;

  // Создание/редактирование стандарта — полноэкранная рабочая форма
  // (как редактор), а не маленькое модальное окно.
  modal.classList.add('sf-page-mode');

  // Если id передан — редактируем, иначе создаём новый
  let st;
  if (id) {
    st = getStandards().find(s => s.id === id);
    if (!st) return;
    title.textContent = 'Изменить стандарт: ' + (st.oplNumber || st.title || '');
  } else {
    st = createEmptyStandard();
    st.line = currentEditorLine;
    title.textContent = 'Новый стандарт — ' + currentEditorLine;
  }

  // Заполняем поля
  $('#sf_id').value = id || '';
  $('#sf_oplNumber').value = st.oplNumber || '';
  // Машина — выпадающий список из машин линии
  const standardLine = st.line || currentEditorLine;
  fillStandardMachineSelect(standardLine, st.machine || '');
  $('#sf_line').value = st.line || currentEditorLine;
  $('#sf_title').value = st.title || '';
  $('#sf_node').value = st.node || '';
  $('#sf_nodePart').value = st.nodePart || '';
    // Часть линии — показываем ТОЛЬКО для SMD
  (function updateNodePartVisibility() {
    const lineForCheck = st.line || currentEditorLine || '';
    const workshopId = getWorkshopIdForLine(lineForCheck);
    const nodePartSelect = document.getElementById('sf_nodePart');
    const nodePartField = nodePartSelect ? nodePartSelect.closest('.field') : null;
    const nodePartLabel = nodePartField ? nodePartField.querySelector('label') : null;

    if (!nodePartField) return;

    if (workshopId === 'smd') {
      nodePartField.style.display = '';
      if (nodePartLabel) {
        nodePartLabel.classList.add('required');
      }
    } else {
      nodePartField.style.display = 'none';
      if (nodePartLabel) {
        nodePartLabel.classList.remove('required');
      }
      // Значение оставляем (для существующих), но для новых оно пустое
      if (nodePartSelect) {
        // не обнуляем — вдруг у стандарта уже была часть
      }
    }
  })();
    // Часть линии показываем только для SMD
  const workshopId = getWorkshopIdForLine(st.line || currentEditorLine);
  const nodePartField = $('#sf_nodePart')?.closest('.field');
  if (nodePartField) {
    if (workshopId === 'smd') {
      nodePartField.style.display = '';
    } else {
      nodePartField.style.display = 'none';
      // Очищаем значение, чтобы не сохранилось случайно
      $('#sf_nodePart').value = '';
    }
  }
  $('#sf_problemDescription').value = st.problemDescription || '';
  $('#sf_controlDescription').value = st.controlDescription || '';
  $('#sf_purpose').value = st.purpose || '';
  $('#sf_whyCreated').value = st.whyCreated || '';
  $('#sf_controlType').value = st.controlType || '';

  // --- НОВОЕ: работа и время проверки ---
  const workVal = (st.work === 'Stop') ? 'Stop' : 'Run';
  $('#sf_workChips')?.querySelectorAll('.elec-work-chip').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.work === workVal);
  });

  // Показ/скрытие блока точек в зависимости от типа контроля
  updateStandardPointsVisibility();

  // Точки замера
  renderBrandBlocks(st.measurements || []);

  // Применять к
  $$('#sf_appliesToGroup input').forEach(cb => {
    cb.checked = (st.appliesTo || []).includes(cb.value);
    cb.closest('label').classList.toggle('checked', cb.checked);
    // Снимаем старые обработчики и навешиваем заново
    cb.onchange = (e) => {
      e.target.closest('label').classList.toggle('checked', e.target.checked);
    };
  });

  // Триггеры
  fillStandardTriggersGroup(st.triggers || []);
    // Top Losses
  fillStandardTopLossesGroup(st.topLosses || []);

  // Принудительный показ в смене сорта
  $('#sf_forceChangeOver').checked = !!st.forceInChangeOver;

  // --- НОВОЕ: фотографии ---
  formPhotos = Array.isArray(st.photos) ? [...st.photos] : [];
  renderPhotosInForm();
  updatePhotoPathHint();
  const photoInput = $('#sf_newPhotoName');
  if (photoInput) photoInput.value = '';

  // Инициализация автокомплита узлов
  initNodeAutocomplete();

  openModal(modal);
}
window.openStandardForm = openStandardForm;

function closeStandardForm() {
  // Возвращаем обычный (не полноэкранный) режим окна
  $('#standardFormModal')?.classList.remove('sf-page-mode');
  closeModal('#standardFormModal');
}
/* ============================================================
   ФОТОГРАФИИ В ФОРМЕ СТАНДАРТА
   ============================================================ */

/* Текущий список имён фото (до сохранения) */
let formPhotos = [];

/* Отрисовать сетку фото в форме */
function renderPhotosInForm() {
  const grid = $('#sf_photosGrid');
  const empty = $('#sf_photosEmpty');
  if (!grid || !empty) return;

  const line = $('#sf_line').value || '';
  const part = $('#sf_nodePart').value || '';

  if (!formPhotos.length) {
    grid.innerHTML = '';
    empty.style.display = 'block';
    return;
  }

  empty.style.display = 'none';
  grid.innerHTML = formPhotos.map((name, idx) => {
    const path = (line && part) ? `photos/${line}/${part}/${name}` : '';
    return `
      <div class="photo-card" data-photo-index="${idx}" title="${escapeAttr(name)}">
        <img src="${escapeAttr(path)}" alt="${escapeAttr(name)}"
             onerror="this.style.display='none';this.nextElementSibling.style.display='flex';">
        <div class="photo-missing" style="display:none">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <span>Файл не найден</span>
        </div>
        <div class="photo-name">${escapeHtml(name)}</div>
        <button type="button" class="photo-remove"
                onclick="event.stopPropagation();removePhotoFromForm(${idx})"
                title="Удалить">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
    `;
  }).join('');
}

/* Добавить фото в форму (поддерживает список через запятую/новую строку) */
function addPhotoFromInput() {
  const input = $('#sf_newPhotoName');
  if (!input) return;

  const raw = input.value || '';

  // Разбиваем по запятой и по переносам строки
  const names = raw
    .split(/[\n,]+/)              // запятая или перенос строки
    .map(s => s.trim())           // обрезаем пробелы
    .filter(s => s.length > 0);   // убираем пустые

  if (!names.length) {
    return showToast('Введите хотя бы одно имя файла', true);
  }

  let added = 0;
  let skipped = 0;

  names.forEach(name => {
    if (formPhotos.includes(name)) {
      skipped++;
      return;
    }
    formPhotos.push(name);
    added++;
  });

  input.value = '';
  renderPhotosInForm();

  // Сообщение о результате
  if (added > 0 && skipped === 0) {
    showToast(`Добавлено: ${added}`);
  } else if (added > 0 && skipped > 0) {
    showToast(`Добавлено: ${added}, пропущено (дубликаты): ${skipped}`);
  } else if (added === 0 && skipped > 0) {
    showToast(`Все ${skipped} уже добавлены`, true);
  }

  input.focus();
}

/* Удалить фото из формы */
window.removePhotoFromForm = function(idx) {
  if (idx < 0 || idx >= formPhotos.length) return;
  formPhotos.splice(idx, 1);
  renderPhotosInForm();
};

/* Обновление подсказки пути при смене линии/части */
function updatePhotoPathHint() {
  const hint = $('#sf_photoPathHint');
  if (!hint) return;
  const line = $('#sf_line').value || '<line>';
  const part = $('#sf_nodePart').value || '<Maker|Packer>';
  hint.textContent = `photos/${line}/${part}/`;
}

/* Просмотр одного фото из формы (лайтбокс-заглушка, полноценный лайтбокс — на этапе 4) */
window.openPhotoLightboxSimple = function(idx) {
  if (idx < 0 || idx >= formPhotos.length) return;
  const line = $('#sf_line').value;
  const part = $('#sf_nodePart').value;
  if (!line || !part) return;

  const name = formPhotos[idx];
  const path = `photos/${line}/${part}/${name}`;
  const w = window.open(path, '_blank');
  if (!w) showToast('Не удалось открыть фото', true);
};
/* ============================================================
   АВТОКОМПЛИТ УЗЛОВ
   ============================================================ */
function getNodeSuggestions() {
  const set = new Set();
  // Узлы из стандартов
  getStandards().forEach(s => {
    if (s.node && s.node.trim()) set.add(s.node.trim());
  });
  // Узлы из настроек
  if (typeof getNodes === 'function') {
    getNodes().forEach(n => { if (n && n.name) set.add(n.name); });
  }
  return [...set].sort((a, b) => a.localeCompare(b, 'ru'));
}

function initNodeAutocomplete() {
  const input = document.getElementById('sf_node');
  const dropdown = document.getElementById('sf_nodeDropdown');
  if (!input || !dropdown) return;

  // Защита от повторной инициализации
  if (input.dataset.acReady === '1') return;
  input.dataset.acReady = '1';

  let activeIndex = -1;
  let currentMatches = [];

  function renderMatches(query) {
    const all = getNodeSuggestions();
    const q = (query || '').toLowerCase();

    let matches = all;
    if (q) {
      matches = all.filter(n => n.toLowerCase().includes(q));
    }
    matches = matches.slice(0, 8); // максимум 8
    currentMatches = matches;
    activeIndex = -1;

    if (!matches.length) {
      dropdown.style.display = 'none';
      return;
    }

    dropdown.innerHTML = matches.map((n, i) => {
      let display = escapeHtml(n);
      if (q) {
        const idx = n.toLowerCase().indexOf(q);
        if (idx !== -1) {
          display = escapeHtml(n.slice(0, idx)) +
                    '<strong>' + escapeHtml(n.slice(idx, idx + q.length)) + '</strong>' +
                    escapeHtml(n.slice(idx + q.length));
        }
      }
      return `<div class="autocomplete-item" data-index="${i}">${display}</div>`;
    }).join('');

    dropdown.style.display = 'block';

    dropdown.querySelectorAll('.autocomplete-item').forEach(el => {
      el.addEventListener('mousedown', (e) => {
        e.preventDefault();
        input.value = currentMatches[parseInt(el.dataset.index)];
        dropdown.style.display = 'none';
      });
    });
  }

  input.addEventListener('input', () => renderMatches(input.value.trim()));
  input.addEventListener('focus', () => renderMatches(input.value.trim()));

  input.addEventListener('keydown', (e) => {
    if (dropdown.style.display !== 'block') return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      activeIndex = Math.min(activeIndex + 1, currentMatches.length - 1);
      dropdown.querySelectorAll('.autocomplete-item').forEach((el, i) => {
        el.classList.toggle('active', i === activeIndex);
      });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      activeIndex = Math.max(activeIndex - 1, 0);
      dropdown.querySelectorAll('.autocomplete-item').forEach((el, i) => {
        el.classList.toggle('active', i === activeIndex);
      });
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault();
      input.value = currentMatches[activeIndex];
      dropdown.style.display = 'none';
    } else if (e.key === 'Escape') {
      dropdown.style.display = 'none';
    }
  });

  input.addEventListener('blur', () => {
    setTimeout(() => { dropdown.style.display = 'none'; }, 150);
  });
}
/* ============================================================
   ТРИГГЕРЫ СТАНДАРТА — группы чекбоксов
   ============================================================ */
function fillStandardTriggersGroup(selected = []) {
  const g = $('#sf_triggersGroup');
  if (!g) return;

  // Пользовательские триггеры (дефолт — прежние материалы)
  const custom = getCustomTriggers().map(t => ({
    value: t.value,
    label: t.label,
    group: 'Пользовательские'
  }));

  // Узлы — из настроек (если функция getNodes доступна)
  const nodes = (typeof getNodes === 'function' ? getNodes() : []).map(n => ({
    value: 'node:' + n.name,
    label: n.name + ' [' + n.part + ']',
    group: 'Узлы'
  }));

  const all = [...custom, ...nodes];

  let html = '';
  let lastGroup = '';

  all.forEach(t => {
    if (t.group !== lastGroup) {
      if (lastGroup) html += '</div>';
      html += `<div style="width:100%;font-size:12px;color:var(--text-second);margin-top:8px;margin-bottom:4px"><strong>${t.group}:</strong></div><div class="checkbox-group">`;
      lastGroup = t.group;
    }
    const checked = selected.includes(t.value) ? 'checked' : '';
    const cls = selected.includes(t.value) ? 'checked' : '';
    html += `<label class="${cls}"><input type="checkbox" value="${escapeHtml(t.value)}" ${checked}> ${escapeHtml(t.label)}</label>`;
  });

  if (lastGroup) html += '</div>';

  g.innerHTML = html;

  g.querySelectorAll('input').forEach(cb => {
    cb.addEventListener('change', e => {
      e.target.closest('label').classList.toggle('checked', e.target.checked);
    });
  });
}

/* ============================================================
   ТОЧКИ ЗАМЕРА — динамический список
   ============================================================ */
/**
 * Отрисовать одну строку точки в форме стандарта.
 * @param {object} point — объект точки { value, brand }
 * @param {number} index — индекс (для data-атрибутов)
 * Отрисовать ВСЕ точки замера в форме.
 * @param {Array} points — массив объектов точек
*/


function renderBrandBlocks(measurements) {
  const container = $('#sf_brandBlocksContainer');
  if (!container) return;

  const brands = getBrands();

  // Нормализуем: число точек = максимум по всем брендам
  const state = (measurements || []).map(b => ({
    brand: b.brand || '',
    points: Array.isArray(b.points) ? b.points.map(p => ({ value: p.value || '' })) : []
  }));
  const maxPoints = state.reduce((m, b) => Math.max(m, b.points.length), 0);
  state.forEach(b => {
    while (b.points.length < maxPoints) b.points.push({ value: '' });
  });

  // Шапка
  let headerHtml = `<tr>
    <th class="bt-th-brand">Бренд</th>`;

  for (let i = 0; i < maxPoints; i++) {
    headerHtml += `<th class="bt-th-point">
      <span>Точка ${i + 1}</span>
      <button type="button" class="bt-remove-point" data-remove-point-col="${i}" title="Удалить точку у всех брендов">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:12px;height:12px">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </th>`;
  }

  headerHtml += `<th class="bt-th-actions">
    <button type="button" class="bt-add-point-btn" data-add-point-col title="Добавить точку ко всем брендам">+ Точка</button>
  </th></tr>`;

  // Тело
  let bodyHtml = '';
  if (!state.length) {
    bodyHtml = `<tr><td colspan="${maxPoints + 2}" class="bt-empty">
      Нет брендов. Нажмите «+ Добавить бренд».
    </td></tr>`;
  } else {
    bodyHtml = state.map((block, rowIndex) => {
      let cells = '';
      for (let i = 0; i < maxPoints; i++) {
        const val = block.points[i]?.value || '';
        cells += `<td class="bt-td-value">
          <input type="text" class="bt-point-input"
                 data-row="${rowIndex}" data-col="${i}"
                 value="${escapeAttr(val)}" placeholder="0">
        </td>`;
      }

      const brandOptions = ['<option value="">Все бренды</option>']
        .concat(brands.map(b => {
          const selected = (b === block.brand) ? ' selected' : '';
          return `<option value="${escapeHtml(b)}"${selected}>${escapeHtml(b)}</option>`;
        })).join('');

      return `<tr class="bt-row" data-row="${rowIndex}">
        <td class="bt-td-brand">
          <select class="bt-brand-select" data-row="${rowIndex}">${brandOptions}</select>
          <button type="button" class="bt-remove-brand" data-remove-brand="${rowIndex}" title="Удалить бренд">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
              <path d="M10 11v6"/><path d="M14 11v6"/>
            </svg>
          </button>
        </td>
        ${cells}
        <td class="bt-td-actions"></td>
      </tr>`;
    }).join('');
  }

  container.innerHTML = `
    <div class="brands-table-wrap">
      <table class="brands-table">
        <thead>${headerHtml}</thead>
        <tbody>${bodyHtml}</tbody>
      </table>
    </div>
  `;

  bindBrandsTableEvents();
}

function bindBrandsTableEvents() {
  const container = $('#sf_brandBlocksContainer');
  if (!container) return;

  // --- Смена бренда ---
  container.querySelectorAll('.bt-brand-select').forEach(sel => {
    sel.addEventListener('change', () => {
      // Изменение сохраняется при следующем сборе через collectMeasurements
    });
  });

  // --- Удаление бренда ---
  container.querySelectorAll('[data-remove-brand]').forEach(btn => {
    btn.addEventListener('click', () => {
      const rowIndex = parseInt(btn.dataset.removeBrand, 10);
      const state = getTableState();
      if (!confirm('Удалить бренд со всеми его точками?')) return;
      state.splice(rowIndex, 1);
      renderBrandsTableFromState(state);
    });
  });

  // --- Удаление колонки точки (у всех брендов) ---
  container.querySelectorAll('[data-remove-point-col]').forEach(btn => {
    btn.addEventListener('click', () => {
      const colIndex = parseInt(btn.dataset.removePointCol, 10);
      const state = getTableState();
      if (!confirm(`Удалить точку ${colIndex + 1} у всех брендов?`)) return;
      state.forEach(b => {
        b.points.splice(colIndex, 1);
      });
      renderBrandsTableFromState(state);
    });
  });

  // --- Добавление колонки точки (у всех брендов) ---
  container.querySelectorAll('[data-add-point-col]').forEach(btn => {
    btn.addEventListener('click', () => {
      const state = getTableState();
      if (!state.length) {
        // Нет брендов — создаём универсальный "Все бренды" с одной точкой
        state.push({ brand: '', points: [{ value: '' }] });
      } else {
        state.forEach(b => b.points.push({ value: '' }));
      }
      renderBrandsTableFromState(state);
    });
  });
}

/**
 * Прочитать текущее состояние таблицы из DOM и вернуть как массив блоков.
 */
function getTableState() {
  const container = $('#sf_brandBlocksContainer');
  if (!container) return [];
  const state = [];

  container.querySelectorAll('.bt-row').forEach(row => {
    const brand = row.querySelector('.bt-brand-select')?.value || '';
    const points = [];
    row.querySelectorAll('.bt-point-input').forEach(inp => {
      points.push({ value: inp.value || '' });
    });
    state.push({ brand, points });
  });

  return state;
}

/** Отрисовать таблицу из state (массива блоков) */
function renderBrandsTableFromState(state) {
  // Нормализуем: выравниваем число точек по максимуму
  const maxPoints = state.reduce((m, b) => Math.max(m, (b.points || []).length), 0);
  state.forEach(b => {
    while (b.points.length < maxPoints) b.points.push({ value: '' });
  });

  renderBrandBlocks(state);
}

function collectMeasurements() {
  const container = $('#sf_brandBlocksContainer');
  if (!container) return [];

  const result = [];
  container.querySelectorAll('.bt-row').forEach(row => {
    const brand = row.querySelector('.bt-brand-select')?.value || '';
    const points = [];
    row.querySelectorAll('.bt-point-input').forEach(inp => {
      points.push({ value: (inp.value || '').trim() });
    });
    // Обрезаем пустые точки в конце
    while (points.length && points[points.length - 1].value === '') {
      points.pop();
    }
    // Сохраняем бренд, только если есть хотя бы одна заполненная точка
    if (points.some(p => p.value !== '')) {
      result.push({ brand, points });
    }
  });

  return result;
}

/* ============================================================
   TOP LOSSES в форме стандарта — только выбранные + кнопка
   ============================================================ */

// Текущий набор выбранных потерь (для формы)
let sfTopLossesSelected = [];
// Контекст, откуда открыта модалка выбора потерь:
// 'standard-form' — из старой модалки #standardFormModal
// 'sv-full'       — из нового полноэкранного просмотра
let topLossPickerContext = 'standard-form';

function fillStandardTopLossesGroup(selected = []) {
  // Запоминаем состояние
  sfTopLossesSelected = Array.isArray(selected) ? [...selected] : [];
  renderSfTopLossesSelected();
}

/** Отрисовать список выбранных потерь в форме */
function renderSfTopLossesSelected() {
  const container = $('#sf_topLossesSelected');
  const counter = $('#sf_topLossesCount');
  if (!container) return;

  if (counter) counter.textContent = sfTopLossesSelected.length;

  if (!sfTopLossesSelected.length) {
    container.innerHTML = '<div class="empty-state" style="padding:12px;font-size:13px">Потери не применены</div>';
    return;
  }

  container.innerHTML = sfTopLossesSelected.map(id => {
    const l = findLossById(id);
    if (!l) return '';
    return `
      <div class="sf-toploss-item" data-toploss-id="${escapeAttr(id)}" title="${escapeAttr(l.categoryName + ': ' + l.name)}">
        <span class="sf-toploss-name">${escapeHtml(l.name)}</span>
        <button type="button" class="sf-toploss-remove" data-remove-toploss="${escapeAttr(id)}" title="Убрать">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:12px;height:12px">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
    `;
  }).join('');

  // Обработчики удаления
  container.querySelectorAll('[data-remove-toploss]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const id = btn.dataset.removeToploss;
      sfTopLossesSelected = sfTopLossesSelected.filter(x => x !== id);
      renderSfTopLossesSelected();
    });
  });
}

/* ============================================================
   Модалка выбора потерь
   ============================================================ */

// Временный набор (до применения)
let topLossPickerTemp = new Set();

window.openTopLossPickerModal = function() {
  const modal = $('#topLossPickerModal');
  if (!modal) return;

  // Копируем текущие выбранные во временное хранилище
  topLossPickerTemp = new Set(sfTopLossesSelected);

  // Сбрасываем поиск
  const search = $('#topLossPickerSearch');
  if (search) search.value = '';

  // Рисуем список
  renderTopLossPickerList('');
  updateTopLossPickerCounter();

  openModal(modal);

  setTimeout(() => search?.focus(), 100);
};

function closeTopLossPickerModal() {
  closeModal('#topLossPickerModal');
  topLossPickerTemp = new Set();
}

/** Отрисовать список категорий и потерь в модалке */
function renderTopLossPickerList(query) {
  const list = $('#topLossPickerList');
  if (!list) return;

  const cats = getTopLosses();
  const q = (query || '').trim().toLowerCase();

  if (!cats.length) {
    list.innerHTML = '<div class="empty-state" style="padding:20px">Справочник Top Losses пуст</div>';
    return;
  }

  let html = '';

  cats.forEach(cat => {
    const items = Array.isArray(cat.items) ? cat.items : [];

    // Фильтрация
    let visible = items;
    if (q) {
      visible = items.filter(it =>
        it.name.toLowerCase().includes(q) ||
        cat.name.toLowerCase().includes(q)
      );
    }

    // Если в категории нет видимых и запрос не совпал с названием — скрываем
    if (!visible.length) return;

    html += `
      <div class="toploss-picker-group" data-cat-id="${escapeAttr(cat.id)}">
        <div class="toploss-picker-group-head">
          <span class="toploss-picker-group-name">${escapeHtml(cat.name)}</span>
          <span class="toploss-picker-group-count">${visible.length}</span>
        </div>
        <div class="toploss-picker-group-body">
          ${visible.map(it => {
            const checked = topLossPickerTemp.has(it.id);
            return `
              <label class="toploss-picker-item ${checked ? 'checked' : ''}" data-loss-id="${escapeAttr(it.id)}">
                <input type="checkbox" value="${escapeAttr(it.id)}" ${checked ? 'checked' : ''}>
                <span>${escapeHtml(it.name)}</span>
              </label>
            `;
          }).join('')}
        </div>
      </div>
    `;
  });

  list.innerHTML = html || '<div class="empty-state" style="padding:20px">Ничего не найдено</div>';

  // Обработчики
  list.querySelectorAll('input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', (e) => {
      const id = e.target.value;
      if (e.target.checked) {
        topLossPickerTemp.add(id);
      } else {
        topLossPickerTemp.delete(id);
      }
      e.target.closest('.toploss-picker-item').classList.toggle('checked', e.target.checked);
      updateTopLossPickerCounter();
    });
  });
}

function updateTopLossPickerCounter() {
  const el = $('#topLossPickerCounter');
  if (el) el.textContent = 'Выбрано: ' + topLossPickerTemp.size;
}

/** Применить выбор из модалки */
function applyTopLossPicker() {
  sfTopLossesSelected = [...topLossPickerTemp];

  // Контекст: старая форма
  if (topLossPickerContext === 'standard-form') {
    renderSfTopLossesSelected();
  }

  // Контекст: новый полный просмотр
  if (topLossPickerContext === 'sv-full') {
    // Обновляем editingData
    if (svFullState.editingData) {
      svFullState.editingData.topLosses = [...sfTopLossesSelected];
    }
    // Перерисовываем блок доп. инфо
    const st = svFullState.editingData;
    if (st) renderSvFullExtra(st, true);
  }

  closeTopLossPickerModal();
}

/* --- Обработчики модалки --- */
$('#sf_addTopLossBtn')?.addEventListener('click', () => {
  topLossPickerContext = 'standard-form';
  openTopLossPickerModal();
});
$('#topLossPickerClose')?.addEventListener('click', closeTopLossPickerModal);
$('#topLossPickerCancel')?.addEventListener('click', closeTopLossPickerModal);
$('#topLossPickerApply')?.addEventListener('click', applyTopLossPicker);
$('#topLossPickerModal')?.addEventListener('click', (e) => {
  if (e.target.id === 'topLossPickerModal') closeTopLossPickerModal();
});
$('#topLossPickerSearch')?.addEventListener('input', (e) => {
  renderTopLossPickerList(e.target.value);
});

/* --- Чипы Run/Stop в форме стандарта --- */
$('#sf_workChips')?.addEventListener('click', (e) => {
  const btn = e.target.closest('.elec-work-chip');
  if (!btn) return;
  $('#sf_workChips').querySelectorAll('.elec-work-chip').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
});
/* --- Обработчики блока «Фотографии» --- */
$('#sf_addPhotoBtn')?.addEventListener('click', addPhotoFromInput);
/* --- Кнопка «+ Добавить блок бренда» --- */
$('#sf_addBrandBlockBtn')?.addEventListener('click', () => {
  const state = getTableState();

  // Определяем число точек в текущей таблице
  const maxPoints = state.reduce((m, b) => Math.max(m, (b.points || []).length), 0);
  const pointsCount = Math.max(maxPoints, 1); // минимум 1 точка

  // Новый бренд с пустыми значениями для всех точек
  const newPoints = [];
  for (let i = 0; i < pointsCount; i++) newPoints.push({ value: '' });

  state.push({ brand: '', points: newPoints });
  renderBrandsTableFromState(state);
}); 

  /* --- Смена типа контроля: показ/скрытие блока точек --- */
  $('#sf_controlType')?.addEventListener('change', () => {
    updateStandardPointsVisibility();
  }); 

$('#sf_newPhotoName')?.addEventListener('keydown', (e) => {
  // Ctrl+Enter или Enter без Shift → добавить
  // Shift+Enter → перенос строки (для списка с новой строки)
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    addPhotoFromInput();
  }
});

$('#sf_photosGrid')?.addEventListener('click', (e) => {
  const card = e.target.closest('.photo-card');
  if (!card) return;
  if (e.target.closest('.photo-remove')) return;
  const idx = parseInt(card.dataset.photoIndex, 10);
  openPhotoLightboxSimple(idx);
});

/* Перерисовываем подсказку пути при смене части */
$('#sf_nodePart')?.addEventListener('change', updatePhotoPathHint);
$('#standardFormModal')?.addEventListener('click', (e) => {
  if (e.target.id === 'standardFormModal') closeStandardForm();
});
/* ============================================================
   СОХРАНЕНИЕ СТАНДАРТА
   ============================================================ */
$('#standardFormSave')?.addEventListener('click', () => {
  const id = $('#sf_id').value;

  // Собираем значения
  const number = '';   // поле № убрано
  const oplNumber = $('#sf_oplNumber').value.trim();
  const machine = ($('#sf_machine').value || '').trim();
  const title = $('#sf_title').value.trim();
  let line = $('#sf_line').value;
  const node = $('#sf_node').value.trim();
  const nodePart = $('#sf_nodePart').value;
  const controlType = $('#sf_controlType').value;

  // --- НОВОЕ: работа и время ---
  const work = $('#sf_workChips')?.querySelector('.elec-work-chip.active')?.dataset.work || 'Run';

  // Валидация обязательных полей
if (!oplNumber)   return showToast('Укажите OPL №', true);
if (!machine)     return showToast('Укажите машину', true);
if (!title)       return showToast('Укажите название', true);
if (!line) {
  // Пробуем восстановить из localStorage или currentEditorLine
  const fallback = localStorage.getItem('cl_editor_line') || currentEditorLine;
  if (fallback) {
    $('#sf_line').value = fallback;
    line = fallback;  // ← но line объявлен как const — надо поменять на let
  } else {
    return showToast('Линия не определена. Выберите линию заново.', true);
  }
}
if (!node)        return showToast('Укажите узел', true);
const workshopIdForSave = getWorkshopIdForLine(line);
if (workshopIdForSave === 'smd' && !nodePart) {
  return showToast('Выберите часть линии', true);
}
if (!controlType) return showToast('Выберите тип контроля', true);

  // Проверка дубликата OPL № на этой линии + машине
  const all = getStandards();
  const dup = all.find(s =>
    s.id !== id &&
    s.line === line &&
    s.machine === machine &&
    (s.oplNumber || '').toLowerCase() === oplNumber.toLowerCase()
  );
  if (dup) {
    return showToast(
      `OPL № "${oplNumber}" уже есть на машине ${machine} линии ${line}`,
      true
    );
  }

  // Точки замера
  const measurements = collectMeasurements();

  // Применять к (типы переходов)
  const appliesTo = [...$$('#sf_appliesToGroup input:checked')].map(c => c.value);

  // Триггеры
  const triggers = [...$$('#sf_triggersGroup input:checked')].map(c => c.value);
  // Top Losses — берём из глобального состояния
  const topLosses = [...sfTopLossesSelected];

  const obj = {
    id: id || uid(),
    active: id
      ? (getStandards().find(s => s.id === id) || {}).active !== false
      : true,
    number,
    oplNumber,
    machine,
    title,
    line,
    node,
    nodePart,
    controlType,
    // --- НОВОЕ: работа и время ---
    work,
    timeFrom: '',
    timeTo: '',
    problemDescription: $('#sf_problemDescription').value.trim(),
    controlDescription: $('#sf_controlDescription').value.trim(),
    purpose: $('#sf_purpose').value.trim(),
    whyCreated: $('#sf_whyCreated').value.trim(),
    measurements,
    appliesTo,
    triggers,
    topLosses,
    forceInChangeOver: $('#sf_forceChangeOver').checked,
    photos: [...formPhotos],
    // --- НОВОЕ: история ---
    author: id
      ? (getStandards().find(s => s.id === id) || {}).author || ''
      : (getCurrentUser() || '—'),
    createdAt: id
      ? (getStandards().find(s => s.id === id) || {}).createdAt || new Date().toISOString()
      : new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  if (id) {
    const idx = all.findIndex(s => s.id === id);
    if (idx !== -1) all[idx] = obj;
  } else {
    all.push(obj);
  }

  setStandards(all);

  refreshEditorMechTable();
  if (typeof updatePartCounters === 'function') updatePartCounters();
  closeStandardForm();
  showToast(id ? 'Стандарт обновлён' : 'Стандарт добавлен');
});
/* ============================================================
   ФОРМА СТАНДАРТА — отмена и закрытие
   ============================================================ */
$('#standardFormClose')?.addEventListener('click', () => {
  closeStandardForm();
});

$('#standardFormCancel')?.addEventListener('click', () => {
  closeStandardForm();
});

$('#standardFormModal')?.addEventListener('click', (e) => {
  if (e.target.id === 'standardFormModal') closeStandardForm();
});

/* ============================================================
   ПЕРЕКЛЮЧАТЕЛЬ РЕЖИМА РЕДАКТОРА (Механический / Электронный)
   ============================================================ */

function switchEditorMode(mode) {
  // Подсветка кнопок
  document.querySelectorAll('#editorModeSwitch .editor-mode-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === mode);
  });

  // Показ/скрытие блоков
  const mechView = $('#editorMechView');
  const elecView = $('#editorElecView');
  if (mechView) mechView.style.display = (mode === 'elec') ? 'none' : 'block';
  if (elecView) elecView.style.display = (mode === 'elec') ? 'block' : 'none';

  // Сохраняем выбор
  try { localStorage.setItem('cl_editor_mode', mode); } catch (e) {}

  // Обновить UI и таблицу
  if (typeof updateActiveLineUI === 'function') updateActiveLineUI();
  if (mode === 'elec') {
    if (typeof refreshEditorElecTable === 'function') refreshEditorElecTable();
  } else {
    if (typeof refreshEditorMechTable === 'function') refreshEditorMechTable();
  }
}
/* Обработчики кнопок переключателя */
document.querySelectorAll('#editorModeSwitch .editor-mode-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    switchEditorMode(btn.dataset.mode);
  });
});

/* ============================================================
   ОБРАБОТЧИКИ ФОРМЫ ЭЛЕКТРОННОГО ПАРАМЕТРА
   ============================================================ */

// Закрытие
$('#electronicParamClose')?.addEventListener('click', closeElectronicParamForm);
$('#electronicParamCancel')?.addEventListener('click', closeElectronicParamForm);
$('#electronicParamModal')?.addEventListener('click', (e) => {
  if (e.target.id === 'electronicParamModal') closeElectronicParamForm();
});

// Работа — чипы Run/Stop
$('#ep_workChips')?.addEventListener('click', (e) => {
  const btn = e.target.closest('.elec-work-chip');
  if (!btn) return;
  $('#ep_workChips').querySelectorAll('.elec-work-chip').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
});

// Тип контроля — чипы
$('#ep_controlTypeSelector')?.addEventListener('click', (e) => {
  const btn = e.target.closest('.type-option');
  if (!btn) return;
  $('#ep_controlType').value = btn.dataset.value;
  $('#ep_controlTypeSelector').querySelectorAll('.type-option').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  updateElectronicFormVisibility();
});

// Тип периодичности
$('#ep_freqType')?.addEventListener('change', updateFreqBlocksVisibility);

// Быстрое добавление машины (через общую модалку, как в форме стандарта)
$('#ep_addMachineBtn')?.addEventListener('click', () => {
  quickAddMachineContext = 'electronic';
  openQuickAddMachineModal();
});

// Добавить строку бренда
$('#ep_addBrandRowBtn')?.addEventListener('click', () => {
  const tbody = $('#ep_brandsTbody');
  if (!tbody) return;

  // Если сейчас показывается "Нет строк" — очищаем
  if (tbody.querySelector('td[colspan]')) tbody.innerHTML = '';

  const lineBrands = getBrandsForLine(currentElectronicLine);
  const brandOpts = ['<option value="">— выберите —</option>']
    .concat(lineBrands.map(b => `<option value="${escapeHtml(b)}">${escapeHtml(b)}</option>`))
    .join('');

  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td><select data-brand>${brandOpts}</select></td>
    <td><input type="number" step="any" data-target placeholder="0"></td>
    <td><input type="number" step="any" data-tolerance placeholder="0"></td>
    <td>
      <button type="button" class="elec-brands-remove" data-remove-row title="Удалить">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </td>
  `;
  tbody.appendChild(tr);

  tr.querySelector('[data-remove-row]').addEventListener('click', () => {
    tr.remove();
    if (!tbody.querySelector('tr')) renderElectronicBrandsTable([]);
  });
});

// Сохранение
$('#electronicParamSave')?.addEventListener('click', () => {
  const id = $('#ep_id').value;
  const machine = ($('#ep_machine')?.value || '').trim();
  const paramName = ($('#ep_paramName')?.value || '').trim();
  const controlType = $('#ep_controlType').value;
  const normText = ($('#ep_normText')?.value || '').trim();
  const work = $('#ep_workChips')?.querySelector('.elec-work-chip.active')?.dataset.work || 'Run';

  // Часть линии — только для SMD
  const lineForPart = currentElectronicLine;
  const workshopId = getWorkshopIdForLine(lineForPart);
  const nodePart = (workshopId === 'smd') ? ($('#ep_nodePart')?.value || '').trim() : '';
    // Применяемость
  const appliesTo = [...$$('#ep_appliesToGroup input:checked')].map(cb => cb.value);
  // Триггеры Change Over
  const triggers = [...$$('#ep_triggersGroup input:checked')].map(cb => cb.value);
  // Валидация
  if (!machine)     return showToast('Выберите машину', true);
  if (!paramName)   return showToast('Укажите название параметра', true);
  if (workshopId === 'smd' && !nodePart) {
    return showToast('Выберите часть линии', true);
  }
  if (controlType === 'fixed' && !normText) {
    return showToast('Для «Фиксированный» укажите текст нормы (ОК/Не ОК)', true);
  }

  // Собираем значения по брендам
  const valuesByBrand = [];
  if (controlType === 'variable' || controlType === 'interval') {
    const tbody = $('#ep_brandsTbody');
    tbody?.querySelectorAll('tr').forEach(tr => {
      const brand = tr.querySelector('[data-brand]')?.value;
      const target = tr.querySelector('[data-target]')?.value;
      const tolerance = tr.querySelector('[data-tolerance]')?.value;
      if (brand && target !== '' && tolerance !== '') {
        valuesByBrand.push({
          brand,
          target: Number(target),
          tolerance: Number(tolerance)
        });
      }
    });

    if (!valuesByBrand.length) {
      return showToast('Добавьте хотя бы один бренд с нормой', true);
    }
  }

  // Проверка дубликата (line + machine + paramName)
  const all = getElectronicParams().map(normalizeElectronicParam);
  const dup = all.find(p =>
    p.id !== id &&
    p.line === currentElectronicLine &&
    p.machine === machine &&
    (p.paramName || '').toLowerCase() === paramName.toLowerCase()
  );
  if (dup) {
    return showToast(`Параметр «${paramName}» уже есть на машине ${machine}`, true);
  }

  // Периодичность — берём существующую или дефолтную
  // (настраивается в «Расписании CL»)
  const existingParam = id ? all.find(p => p.id === id) : null;
  const frequency = existingParam?.frequency
    || { type: 'weekly', schedule: [], shifts: ['day','night'], daysOfWeek: [], dates: [] };

  // Формируем объект
  const obj = {
    id: id || makeElectronicParamId(),
    active: id ? (all.find(p => p.id === id)?.active !== false) : true,
    line: currentElectronicLine,
    machine,
    nodePart,
    paramName,
    work,
    timeFrom: '',
    timeTo: '',
    controlType,
    normText: controlType === 'fixed' ? normText : '',
    valuesByBrand: (controlType === 'variable' || controlType === 'interval') ? valuesByBrand : [],
    appliesTo,
    triggers,
    frequency,
    author: id ? (all.find(p => p.id === id)?.author || '') : '',
    createdAt: id ? (all.find(p => p.id === id)?.createdAt || new Date().toISOString()) : new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  if (id) {
    const idx = all.findIndex(p => p.id === id);
    if (idx !== -1) all[idx] = obj;
  } else {
    all.push(obj);
  }

  setElectronicParams(all);
  closeElectronicParamForm();

  // Перерисовываем таблицу параметров
  refreshEditorElecTable();

  showToast(id ? 'Параметр обновлён' : 'Параметр добавлен');
});
/* Контекст для модалки быстрого добавления машины:
   'standard' — из формы механического стандарта (читаем #sf_line)
   'electronic' — из формы электронного параметра (читаем currentElectronicLine) */
let quickAddMachineContext = 'standard';
/* ============================================================
   УТИЛИТЫ
   ============================================================ */
function $(sel) { return document.querySelector(sel); }
function $$(sel) { return document.querySelectorAll(sel); }

function showToast(msg, isError) {
  const t = $('#toast');
  if (!t) {
    console.warn('Toast:', msg);
    return;
  }
  t.textContent = msg;
  t.className = 'toast show' + (isError ? ' error' : '');
  setTimeout(() => { t.className = 'toast'; }, 2500);
}
function nowStr() { return new Date().toLocaleString('ru-RU'); }

function fmtDate(d) {
  const dt = new Date(d);
  const yyyy = dt.getFullYear();
  const mm = String(dt.getMonth()+1).padStart(2,'0');
  const dd = String(dt.getDate()).padStart(2,'0');
  const hh = String(dt.getHours()).padStart(2,'0');
  const mi = String(dt.getMinutes()).padStart(2,'0');
  return `${dd}.${mm}.${yyyy} ${hh}:${mi}`;
}

function uid() {
  return 'id_' + Date.now() + '_' + Math.random().toString(36).slice(2,7);
}

function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

/* Собрать относительный путь к фото */
function getPhotoPath(standard, fileName) {
  if (!standard || !fileName) return '';
  const line = standard.line || '';
  const part = standard.nodePart || '';
  if (!line || !part) return '';
  return `photos/${line}/${part}/${fileName}`;
}

/* Экранирование для атрибутов (в т.ч. путей) */
function escapeAttr(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/* ============================================================
   ФАБРИКА СТАНДАРТА — единая структура
   ============================================================ */
function createEmptyStandard() {
  return {
    id: '',
    active: true,
    number: '',
    oplNumber: '',
    machine: '',
    title: '',
    line: '',
    node: '',
    nodePart: '',
    controlType: '',

    // --- НОВОЕ: работа и время проверки ---
    work: 'Run',              // 'Run' | 'Stop'
    timeFrom: '',             // '09:10'
    timeTo: '',               // '10:00'
    // --- НОВОЕ: периодичность (расписание проверок) ---
    frequency: {
      type: 'weekly',
      schedule: [],             // массив { day, shift }
      shifts: ['day', 'night'],
      daysOfWeek: [],
      dates: []
    },
    // --- НОВОЕ: в расписании технолога ---
    inSchedule: false,
    problemDescription: '',
    controlDescription: '',
    purpose: '',
    whyCreated: '',

    measurements: [],

    appliesTo: [],
    triggers: [],
    forceInChangeOver: false,   // принудительно показывать в смене сорта (игнорировать сравнение точек)

    // --- НОВОЕ: история ---
    author: '',
    createdAt: null,
    updatedAt: null,

    photos: [],

    // --- НОВОЕ: комментарий к деактивации ---
    deactivationComment: '',
    deactivationHistory: []   // массив { text, date }
    
  };
}

/**
 * Оставляет только валидные значения appliesTo.
 */
function normalizeAppliesTo(arr) {
  if (!Array.isArray(arr)) return [];
  const VALID = ['ChangeOver', 'CL_TO', 'CL_Conversion'];
  return arr.filter(v => VALID.includes(v));
}

function normalizeMeasurements(measurements) {
  if (!Array.isArray(measurements)) return [];

  // Новый формат — уже блоки
  if (measurements.length && measurements[0] && 'points' in measurements[0]) {
    return measurements.map(b => ({
      brand: b.brand || '',
      points: Array.isArray(b.points)
        ? b.points.map(p => ({ value: p.value || '' }))
        : []
    })).filter(b => b.points.length > 0);
  }

  // Миграция со старого плоского формата
  const byBrand = {};
  measurements.forEach(m => {
    if (!m) return;
    const brand = m.brand || '';
    if (!byBrand[brand]) byBrand[brand] = [];
    if (m.value) byBrand[brand].push({ value: m.value });
  });

  return Object.keys(byBrand)
    .filter(brand => byBrand[brand].length > 0)
    .map(brand => ({ brand, points: byBrand[brand] }));
}

/**
 * Парсит строку нормы и возвращает { min, max } или null.
 *
 * Поддерживаемые форматы:
 *   value_input:  "92 ± 5",  "92+-5",  "92 ±5"   → { min: 87, max: 97 }
 *   range_input:  "5.5 - 8.5", "5.5-8.5", "5.5 до 8.5", "5.5…8.5"
 *                 "-65 до -55", "-65 - -55"     → { min: 5.5, max: 8.5 }
 *
 * Если не удалось распарсить — null.
 */
function parseNorm(normStr) {
  if (normStr == null) return null;
  const s = String(normStr).trim();
  if (!s) return null;

  // --- 1. Пробуем "число ± число" ---
  const plusMinus = s.split(/\s*(?:±|\+-)\s*/);
  if (plusMinus.length === 2) {
    const center = parseFloat(plusMinus[0].replace(',', '.'));
    const tol = parseFloat(plusMinus[1].replace(',', '.'));
    if (!isNaN(center) && !isNaN(tol)) {
      return { min: center - tol, max: center + tol };
    }
  }

  // --- 2. Пробуем диапазон (до / … / – / -) ---
  let rangeStr = s
    .replace(/\s+до\s+/gi, ' | ')
    .replace(/\s*…\s*/g, ' | ')
    .replace(/\s*–\s*/g, ' | ');

  if (!rangeStr.includes('|')) {
    rangeStr = rangeStr.replace(/\s+-\s+/, ' | ');
  }

  let parts = rangeStr.split('|').map(x => x.trim()).filter(Boolean);

  if (parts.length === 1) {
    const dashSplit = s.split(/(?<=[0-9.])-(?=-?[0-9.])/);
    if (dashSplit.length === 2) parts = dashSplit.map(x => x.trim());
  }

  if (parts.length === 2) {
    const a = parseFloat(parts[0].replace(',', '.').replace(/[^\d.\-+]/g, ''));
    const b = parseFloat(parts[1].replace(',', '.').replace(/[^\d.\-+]/g, ''));
    if (!isNaN(a) && !isNaN(b)) {
      return { min: Math.min(a, b), max: Math.max(a, b) };
    }
  }

  // --- 3. НОВОЕ: одиночное число → точная норма (min = max = value) ---
  // Отрезаем всё, что не цифра/точка/минус — на случай "0 бар", "-65 kPa"
  const cleanNum = s.replace(/[^\d.\-+]/g, '').replace(',', '.');
  const single = parseFloat(cleanNum);
  if (!isNaN(single) && cleanNum !== '' && cleanNum !== '-' && cleanNum !== '+') {
    return { min: single, max: single };
  }

  return null;
}

/* ============================================================
   ТИПЫ КОНТРОЛЯ — миграция на 3 канонических типа
   fixed       — Фиксированный (жёсткое значение без допуска; точки опциональны)
   variable    — Вариабельный (всегда точки, target ± tolerance)
   interval    — Контролируемый интервал (например 100…150)
   ============================================================ */

/* Есть ли хотя бы одна точка с допуском (min !== max) */
function hasToleranceInMeasurements(measurements) {
  const arr = Array.isArray(measurements) ? measurements : [];
  for (const b of arr) {
    if (!b) continue;
    // Новый формат: блок с points
    const points = Array.isArray(b.points) ? b.points : [];
    for (const p of points) {
      const norm = parseNorm(p && p.value);
      if (norm && norm.min !== norm.max) return true;
    }
    // Legacy плоский формат: b.value напрямую
    if (!points.length && b.value != null) {
      const norm = parseNorm(b.value);
      if (norm && norm.min !== norm.max) return true;
    }
  }
  return false;
}

/* Приводит legacy-тип к каноническому (с учётом точек) */
function migrateControlType(type, measurements) {
  if (type === 'fixed' || type === 'variable' || type === 'interval') return type;
  if (type === 'range_input') return 'interval';
  if (type === 'ok_not_ok') return 'fixed';
  if (type === 'tolerance') return 'variable';
  if (type === 'value_input') {
    // Только для мех-стандартов (передан массив measurements) проверяем допуск точек:
    // жёсткое значение (без допуска) → fixed, иначе → variable.
    // Без measurements (электроника, история) value_input = ввод значения → variable.
    if (Array.isArray(measurements) && !hasToleranceInMeasurements(measurements)) {
      return 'fixed';
    }
    return 'variable';
  }
  // Неизвестный / пустой — по умолчанию «Фиксированный» (с точками или ОК/НеОК)
  return 'fixed';
}

function normalizeStandard(st) {
  const empty = createEmptyStandard();
  return {
    ...empty,
    ...st,
    id: st.id || empty.id,
    active: st.active !== undefined ? st.active : true,
    controlType: migrateControlType(st.controlType, st.measurements),
    measurements: normalizeMeasurements(st.measurements),
    appliesTo: normalizeAppliesTo(st.appliesTo),
    triggers: Array.isArray(st.triggers) ? st.triggers : [],
    forceInChangeOver: st.forceInChangeOver === true,
    photos: Array.isArray(st.photos)
      ? st.photos.filter(p => typeof p === 'string' && p.trim() !== '')
      : [],
    // --- НОВОЕ: в расписании технолога (миграция) ---
    inSchedule: st.inSchedule === true,
    // --- НОВОЕ: миграция истории ---
    author: typeof st.author === 'string' ? st.author : '',
    createdAt: st.createdAt || null,
    updatedAt: st.updatedAt || null,
    // --- НОВОЕ: миграция комментария к деактивации ---
    deactivationComment: typeof st.deactivationComment === 'string' ? st.deactivationComment : '',
    deactivationHistory: Array.isArray(st.deactivationHistory) ? st.deactivationHistory : []
  };
}
/* ============================================================
   ДОСТУП К ДАННЫМ
   ============================================================ */
function load(key, fallback) {
  try {
    const v = JSON.parse(localStorage.getItem(key));
    return v != null ? v : fallback;
  } catch(e) { return fallback; }
}
function save(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}
function getOperators() { return load(STORAGE_KEYS.operators, []); }
function setOperators(v) { save(STORAGE_KEYS.operators, v); }
/* ============================================================
   СТРУКТУРА ПРОИЗВОДСТВА — доступ к данным
   ============================================================ */

/* --- Миграция: создаём структуру при первом запуске --- */
function migrateToWorkshopsStructure() {
  const existing = localStorage.getItem(STORAGE_KEYS.workshops);
  if (!existing) {
    // Первый запуск — создаём дефолтную структуру
    save(STORAGE_KEYS.workshops, DEFAULT_WORKSHOPS);
    // Удаляем старые блоки (они больше не используются)
    localStorage.removeItem(STORAGE_KEYS.blocks);
    return;
  }

  // --- Разовая миграция: переименование SMD-участков в "Cell N" ---
  const MIGRATION_KEY = 'cl_workshops_migration_smd_cell_named';
  if (localStorage.getItem(MIGRATION_KEY) === '1') return;

  try {
    const workshops = JSON.parse(existing);
    if (!Array.isArray(workshops)) return;

    // Карта переименований: только SMD-участки
    // PMD (SFG/CRT) и FMD (Cell 1/Cell 2) — без изменений
    const renameMap = {
      'smd_area1': 'Cell 1',
      'smd_area2': 'Cell 2',
      'smd_area3': 'Cell 3'
    };

    workshops.forEach(w => {
      (w.areas || []).forEach(a => {
        if (renameMap[a.id]) {
          a.name = renameMap[a.id];
        }
      });
    });

    save(STORAGE_KEYS.workshops, workshops);
    localStorage.setItem(MIGRATION_KEY, '1');
  } catch (e) {
    console.warn('Migration error:', e);
  }
}

/* --- Получить все цеха --- */
function getWorkshops() {
  migrateToWorkshopsStructure();
  const raw = load(STORAGE_KEYS.workshops, null);
  if (!Array.isArray(raw) || !raw.length) {
    return JSON.parse(JSON.stringify(DEFAULT_WORKSHOPS));
  }
  return raw;
}
function setWorkshops(v) {
  save(STORAGE_KEYS.workshops, v);
}

/* --- Найти цех по id --- */
function getWorkshop(workshopId) {
  return getWorkshops().find(w => w.id === workshopId) || null;
}

/* --- Название цеха по id (пусто → «все цеха») --- */
function getWorkshopName(workshopId) {
  if (!workshopId) return '';
  const w = getWorkshop(workshopId);
  return w ? w.name : workshopId;
}

/* --- HTML-опции цехов для селекта (первый — «все цеха») --- */
function workshopOptionsHtml(selected) {
  return ['<option value="">— все цеха —</option>']
    .concat(getWorkshops().map(w =>
      `<option value="${escapeAttr(w.id)}"${w.id === selected ? ' selected' : ''}>${escapeHtml(w.name)}</option>`
    )).join('');
}

/* --- Найти участок по id (поиск по всем цехам) --- */
function getArea(areaId) {
  for (const w of getWorkshops()) {
    const a = (w.areas || []).find(x => x.id === areaId);
    if (a) return { workshop: w, area: a };
  }
  return null;
}

/* --- Найти блок по id (поиск по всем цехам/участкам) --- */
function getBlock(blockId) {
  for (const w of getWorkshops()) {
    for (const a of (w.areas || [])) {
      if (Array.isArray(a.blocks)) {
        const b = a.blocks.find(x => x.id === blockId);
        if (b) return { workshop: w, area: a, block: b };
      }
    }
  }
  return null;
}

/* --- Найти, к какому цеху/участку/блоку относится линия --- */
function getBlockForLine(line) {
  for (const w of getWorkshops()) {
    for (const a of (w.areas || [])) {
      if (Array.isArray(a.blocks)) {
        for (const b of a.blocks) {
          if (Array.isArray(b.lines) && b.lines.includes(line)) {
            return { workshop: w, area: a, block: b };
          }
        }
      } else if (Array.isArray(a.lines) && a.lines.includes(line)) {
        return { workshop: w, area: a, block: null };
      }
    }
  }
  return null;
}

/* Получить ID цеха по линии */
function getWorkshopIdForLine(line) {
  if (!line) return null;
  const ctx = typeof getBlockForLine === 'function' ? getBlockForLine(line) : null;
  return ctx ? ctx.workshop.id : null;
}

/* --- Плоский список всех линий с контекстом --- */
function getAllLinesWithContext() {
  const result = [];
  getWorkshops().forEach(w => {
    (w.areas || []).forEach(a => {
      if (Array.isArray(a.blocks)) {
        a.blocks.forEach(b => {
          (b.lines || []).forEach(l => result.push({
            line: l,
            workshopId: w.id, workshopName: w.name,
            areaId: a.id, areaName: a.name,
            blockId: b.id, blockName: b.name
          }));
        });
      } else if (Array.isArray(a.lines)) {
        a.lines.forEach(l => result.push({
          line: l,
          workshopId: w.id, workshopName: w.name,
          areaId: a.id, areaName: a.name,
          blockId: null, blockName: null
        }));
      }
    });
  });
  return result;
}

/* ============================================================
   ОБРАТНАЯ СОВМЕСТИМОСТЬ
   Старые функции возвращают упрощённые данные,
   чтобы не ломать существующий код (дашборд, фильтры, редактор).
   ============================================================ */

/* --- Плоский список кодов всех линий (для селектов, фильтров) --- */
function getLines() {
  const all = getAllLinesWithContext();
  // Уникальные коды линий (на случай дублирования)
  const seen = new Set();
  const result = [];
  all.forEach(x => {
    if (!seen.has(x.line)) {
      seen.add(x.line);
      result.push(x.line);
    }
  });
  return result;
}
function setLines(v) {
  // Сеттер больше не нужен — линии задаются в структуре производства.
  // Оставлен для совместимости со старыми вызовами (бэкап).
  console.warn('setLines() устарел — линии редактируются через getWorkshops().');
}

/* --- Плоский список всех блоков (с контекстом цеха/участка) --- */
function getBlocks() {
  const result = [];
  getWorkshops().forEach(w => {
    (w.areas || []).forEach(a => {
      if (Array.isArray(a.blocks)) {
        a.blocks.forEach(b => {
          result.push({
            id: b.id,
            name: b.name,
            lines: b.lines || [],
            workshopId: w.id,
            workshopName: w.name,
            areaId: a.id,
            areaName: a.name
          });
        });
      }
    });
  });
  return result;
}
function setBlocks(v) {
  console.warn('setBlocks() устарел — блоки редактируются через getWorkshops().');
}

/* --- Плоский список всех участков --- */
function getAllAreas() {
  const result = [];
  getWorkshops().forEach(w => {
    (w.areas || []).forEach(a => {
      result.push({
        id: a.id,
        name: a.name,
        workshopId: w.id,
        workshopName: w.name,
        hasBlocks: Array.isArray(a.blocks) && a.blocks.length > 0,
        linesCount: Array.isArray(a.blocks)
          ? a.blocks.reduce((sum, b) => sum + (b.lines || []).length, 0)
          : (a.lines || []).length
      });
    });
  });
  return result;
}

/* Машины для линий */
function getLineMachines() {
  return load(STORAGE_KEYS.lineMachines, {...DEFAULT_LINE_MACHINES});
}
/* ============================================================
   TOP LOSSES — доступ к данным
   ============================================================ */

function getTopLosses() {
  const raw = load(STORAGE_KEYS.topLosses, null);
  if (raw === null) return JSON.parse(JSON.stringify(DEFAULT_TOP_LOSSES));
  return Array.isArray(raw) ? raw : JSON.parse(JSON.stringify(DEFAULT_TOP_LOSSES));
}
/*========================================================
  CL ELECTRONIC — доступ к параметрам
============================================================ */

function getElectronicParams() {
  return load(STORAGE_KEYS.electronicParams, []);
}
function setElectronicParams(v) {
  save(STORAGE_KEYS.electronicParams, v);
}

/* Генерация ID для нового параметра */
function makeElectronicParamId() {
  return 'elec_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
}

/* Нормализация одного параметра (защита от старых данных) */
function normalizeElectronicParam(p) {
  return {
    id: p.id || makeElectronicParamId(),
    active: p.active !== false,

    line: p.line || '',
    machine: p.machine || '',
    nodePart: p.nodePart || '',
    paramName: p.paramName || '',
    work: (p.work === 'Stop') ? 'Stop' : 'Run',
    timeFrom: p.timeFrom || '',
    timeTo: p.timeTo || '',

    controlType: migrateControlType(p.controlType, null),
    normText: typeof p.normText === 'string' ? p.normText : '',

    valuesByBrand: Array.isArray(p.valuesByBrand)
      ? p.valuesByBrand.filter(v => v && v.brand)
      : [],

    // --- Применяемость ---
    appliesTo: Array.isArray(p.appliesTo) ? p.appliesTo.filter(v =>
      ['ChangeOver', 'CL_TO', 'CL_Conversion'].includes(v)
    ) : [],

    // --- Триггеры Change Over ---
    triggers: Array.isArray(p.triggers) ? p.triggers.filter(t => typeof t === 'string') : [],

    frequency: normalizeElectronicFrequency(p.frequency),

    // --- НОВОЕ: в расписании технолога ---
    inSchedule: p.inSchedule === true,

    author: typeof p.author === 'string' ? p.author : '',
    createdAt: p.createdAt || null,
    updatedAt: p.updatedAt || null
  };
}

/* Нормализация периодичности */
function normalizeElectronicFrequency(f) {
  const def = { type: 'weekly', schedule: [], shifts: ['day', 'night'], daysOfWeek: [], dates: [] };
  if (!f || typeof f !== 'object') return def;

  // type: rotation больше нет — мигрируем в weekly
  let type = ['daily','weekly','once'].includes(f.type) ? f.type : 'weekly';

  // dates
  const dates = Array.isArray(f.dates)
    ? f.dates.filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d))
    : [];

  // --- Новый формат: schedule ---
  if (Array.isArray(f.schedule)) {
    const schedule = f.schedule
      .filter(x => x && Number.isInteger(x.day) && x.day >= 0 && x.day <= 6)
      .filter(x => x.shift === 'day' || x.shift === 'night')
      .map(x => ({ day: x.day, shift: x.shift }));

    const seen = new Set();
    const uniqueSchedule = schedule.filter(x => {
      const key = `${x.day}|${x.shift}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    const daysOfWeek = [...new Set(uniqueSchedule.map(x => x.day))];
    const shifts = [...new Set(uniqueSchedule.map(x => x.shift))];

    return {
      type,
      schedule: uniqueSchedule,
      shifts: shifts.length ? shifts : ['day', 'night'],
      daysOfWeek,
      dates
    };
  }

  // --- Миграция со старого формата ---
  let shifts = Array.isArray(f.shifts) ? f.shifts : [];
  const legacyShifts = shifts.some(s => ['A','B','C','D'].includes(s));
  if (legacyShifts) {
    shifts = ['day', 'night'];
  } else {
    shifts = shifts.filter(s => s === 'day' || s === 'night');
    if (!shifts.length) shifts = ['day', 'night'];
  }

  const daysOfWeek = Array.isArray(f.daysOfWeek)
    ? f.daysOfWeek.filter(d => Number.isInteger(d) && d >= 0 && d <= 6)
    : [];

  const schedule = [];
  daysOfWeek.forEach(day => {
    shifts.forEach(shift => {
      schedule.push({ day, shift });
    });
  });

  return { type, schedule, shifts, daysOfWeek, dates };
}

/* Нормализация периодичности механического стандарта
   (использует тот же формат, что и электронный параметр). */
function normalizeStandardFrequency(f) {
  const def = { type: 'weekly', schedule: [], shifts: ['day', 'night'], daysOfWeek: [], dates: [] };
  if (!f || typeof f !== 'object') return def;

  const type = ['daily', 'weekly', 'once'].includes(f.type) ? f.type : 'weekly';

  // dates: YYYY-MM-DD
  const dates = Array.isArray(f.dates)
    ? f.dates.filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d))
    : [];

  // --- Новый формат: schedule ---
  if (Array.isArray(f.schedule)) {
    const schedule = f.schedule
      .filter(x => x && Number.isInteger(x.day) && x.day >= 0 && x.day <= 6)
      .filter(x => x.shift === 'day' || x.shift === 'night')
      .map(x => ({ day: x.day, shift: x.shift }));

    // Уникализируем
    const seen = new Set();
    const uniqueSchedule = schedule.filter(x => {
      const key = `${x.day}|${x.shift}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    const daysOfWeek = [...new Set(uniqueSchedule.map(x => x.day))];
    const shifts = [...new Set(uniqueSchedule.map(x => x.shift))];

    return {
      type,
      schedule: uniqueSchedule,
      shifts: shifts.length ? shifts : ['day', 'night'],
      daysOfWeek,
      dates
    };
  }

  // --- Миграция со старого формата (daysOfWeek + shifts) ---
  let shifts = Array.isArray(f.shifts) ? f.shifts : [];
  shifts = shifts.filter(s => s === 'day' || s === 'night');
  if (!shifts.length) shifts = ['day', 'night'];

  const daysOfWeek = Array.isArray(f.daysOfWeek)
    ? f.daysOfWeek.filter(d => Number.isInteger(d) && d >= 0 && d <= 6)
    : [];

  const schedule = [];
  daysOfWeek.forEach(day => {
    shifts.forEach(shift => {
      schedule.push({ day, shift });
    });
  });

  return { type, schedule, shifts, daysOfWeek, dates };
}
/* Получить параметры конкретной линии */
function getElectronicParamsForLine(line) {
  return getElectronicParams()
    .map(normalizeElectronicParam)
    .filter(p => p.line === line);
}

/* Получить параметры конкретной линии и машины */
function getElectronicParamsForMachine(line, machine) {
  return getElectronicParamsForLine(line)
    .filter(p => p.machine === machine);
}

/* Бренды линии, у которых есть хотя бы один электронный параметр
   с заполненной нормой (target+tolerance или normText). */
function getElectronicBrandsForLine(line) {
  const params = getElectronicParamsForLine(line).filter(p => p.active !== false);
  const lineBrands = getBrandsForLine(line);
  const result = new Set();

  params.forEach(p => {
    if (p.controlType === 'fixed') {
      // Для «Фиксированный» (ОК/Не ОК) достаточно, чтобы normText был заполнен —
      // но у него нет привязки к бренду. Значит, он доступен всем брендам линии.
      if (p.normText && p.normText.trim()) {
        lineBrands.forEach(b => result.add(b));
      }
    } else {
      // value_input — только те бренды, для которых есть target+tolerance
      (p.valuesByBrand || []).forEach(v => {
        const hasTarget = v.target !== '' && v.target != null;
        const hasTol = v.tolerance !== '' && v.tolerance != null;
        if (hasTarget && hasTol && lineBrands.includes(v.brand)) {
          result.add(v.brand);
        }
      });
    }
  });

  return [...result].sort((a, b) => a.localeCompare(b, 'ru'));
}
/* ============================================================
   CL ELECTRONIC — расписание брендов
   ============================================================
   Структура в localStorage:
   {
     SD01: [
       { date: '2026-09-28', brand: 'A' },
       { date: '2026-09-29', brand: 'A' },
       { date: '2026-09-30', brand: 'B' },
       ...
     ],
     SD03: [ ... ]
   }
   ============================================================ */

function getElectronicBrandSchedule() {
  return load(STORAGE_KEYS.electronicBrandSchedule, {});
}
function setElectronicBrandSchedule(v) {
  save(STORAGE_KEYS.electronicBrandSchedule, v);
}
/* ============================================================
   CL ELECTRONIC — модалка «Расписание брендов»
   ============================================================ */

/* Текущее состояние модалки (для кнопки «Сохранить») */
let ebsState = {
  line: null,
  mode: 'period',      // 'period' | 'daily'
  dailyEntries: [],    // [{ date, brand }] — рабочая копия строк в режиме «По дням»
  periodEntries: []    // накопленные периоды (только для отображения)
};

/* Открыть модалку */
window.openElectronicBrandSchedule = function(line) {
  const modal = $('#electronicBrandScheduleModal');
  if (!modal) return;

  const brands = getBrandsForLine(line);
  if (!brands.length) {
    return showToast('На линии нет брендов. Добавьте их в Настройках → «Бренды для каждой линии».', true);
  }

  ebsState.line = line;
  ebsState.mode = 'period';
  ebsState.dailyEntries = [];
  ebsState.periodEntries = [];

  // Заголовок
  $('#electronicBrandScheduleTitle').textContent = 'Расписание брендов — ' + line;
  $('#ebs_line').value = line;

  // Переключаем режим на «По периодам»
  document.querySelectorAll('#ebsModeSwitch .ebs-mode-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === 'period');
  });
  $('#ebsPeriodMode').style.display = 'block';
  $('#ebsDailyMode').style.display = 'none';

  // Заполняем бренды в обоих селектах
  fillBrandSelectOptions('#ebsPeriodBrand', brands);
  fillBrandSelectOptions('#ebsDailyRollBrand', brands);

  // Сбрасываем поля периода
  $('#ebsPeriodFrom').value = todayISO();
  $('#ebsPeriodTo').value = addDaysISO(todayISO(), 6);
  $('#ebsPeriodBrand').value = '';

  // Инициализируем «По дням» существующим расписанием (на 14 дней вперёд)
  const existing = getElectronicBrandScheduleForLine(line);
  const existingMap = {};
  existing.forEach(x => { existingMap[x.date] = x.brand; });

  const today = todayISO();
  ebsState.dailyEntries = [];
  for (let i = 0; i < 14; i++) {
    const date = addDaysISO(today, i);
    ebsState.dailyEntries.push({ date, brand: existingMap[date] || '' });
  }

  renderEbsDailyRows();
  renderEbsPreview();

  openModal(modal);
};

/* Закрыть */
function closeElectronicBrandSchedule() {
  closeModal('#electronicBrandScheduleModal');
  ebsState.line = null;
}

/* Заполнить select опциями брендов */
function fillBrandSelectOptions(selector, brands) {
  const el = $(selector);
  if (!el) return;
  el.innerHTML = '<option value="">— выберите —</option>' +
    brands.map(b => `<option value="${escapeHtml(b)}">${escapeHtml(b)}</option>`).join('');
}

/* ============================================================
   Режим «По дням» — рендер строк
   ============================================================ */

function renderEbsDailyRows() {
  const wrap = $('#ebsDailyRows');
  if (!wrap) return;

  const brands = getBrandsForLine(ebsState.line);
  const brandOpts = (selected) =>
    '<option value="">— выберите —</option>' +
    brands.map(b => {
      const sel = (b === selected) ? ' selected' : '';
      return `<option value="${escapeHtml(b)}"${sel}>${escapeHtml(b)}</option>`;
    }).join('');

  if (!ebsState.dailyEntries.length) {
    wrap.innerHTML = '<div class="empty-state" style="padding:16px">Нет строк. Нажмите «+ Добавить день».</div>';
    return;
  }

  wrap.innerHTML = ebsState.dailyEntries.map((entry, idx) => {
    const shift = getShiftForDate(entry.date);
    return `
      <div class="ebs-day-row" data-idx="${idx}">
        <input type="date" data-date value="${escapeAttr(entry.date)}">
        <select data-brand>${brandOpts(entry.brand)}</select>
        <button type="button" class="ebs-remove" data-remove-row title="Удалить">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
    `;
  }).join('');

  // Обработчики
  wrap.querySelectorAll('.ebs-day-row').forEach(row => {
    const idx = parseInt(row.dataset.idx, 10);

    row.querySelector('[data-date]')?.addEventListener('change', (e) => {
      ebsState.dailyEntries[idx].date = e.target.value;
      renderEbsPreview();
    });

    row.querySelector('[data-brand]')?.addEventListener('change', (e) => {
      ebsState.dailyEntries[idx].brand = e.target.value;
      renderEbsPreview();
    });

    row.querySelector('[data-remove-row]')?.addEventListener('click', () => {
      ebsState.dailyEntries.splice(idx, 1);
      renderEbsDailyRows();
      renderEbsPreview();
    });
  });
}

/* ============================================================
   Превью итогового расписания
   ============================================================ */

function renderEbsPreview() {
  const wrap = $('#ebsPreview');
  if (!wrap) return;

  // Собираем все записи: сначала существующие в localStorage, потом наложим текущие правки
  const saved = getElectronicBrandScheduleForLine(ebsState.line);
  const map = {};
  saved.forEach(x => { map[x.date] = x.brand; });

  // Из режима «По дням» — только непустые
  ebsState.dailyEntries.forEach(e => {
    if (e.date) {
      if (e.brand && e.brand.trim()) {
        map[e.date] = e.brand;
      } else {
        delete map[e.date];
      }
    }
  });

  const entries = Object.entries(map).sort((a, b) => a[0].localeCompare(b[0]));

  if (!entries.length) {
    wrap.innerHTML = '<div class="ebs-preview-empty">Расписание пустое. Добавьте период или заполните дни вручную.</div>';
    return;
  }

  wrap.innerHTML = '<div class="ebs-preview-list">' +
    entries.map(([date, brand]) => {
      const shift = getShiftForDate(date);
      return `
        <div class="ebs-preview-row">
          <span class="ebs-preview-date">${escapeHtml(fmtISODate(date))}</span>
          <span class="ebs-preview-shift ebs-preview-shift-${shift}">${shift}</span>
          <span class="ebs-preview-brand">${escapeHtml(brand)}</span>
        </div>
      `;
    }).join('') +
    '</div>';
}

/* ============================================================
   Обработчики модалки расписания брендов
   ============================================================ */

// Закрытие
$('#electronicBrandScheduleClose')?.addEventListener('click', closeElectronicBrandSchedule);
$('#electronicBrandScheduleCancel')?.addEventListener('click', closeElectronicBrandSchedule);
$('#electronicBrandScheduleModal')?.addEventListener('click', (e) => {
  if (e.target.id === 'electronicBrandScheduleModal') closeElectronicBrandSchedule();
});

// Переключатель режима
$('#ebsModeSwitch')?.addEventListener('click', (e) => {
  const btn = e.target.closest('.ebs-mode-btn');
  if (!btn) return;
  const mode = btn.dataset.mode;

  document.querySelectorAll('#ebsModeSwitch .ebs-mode-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.mode === mode);
  });

  ebsState.mode = mode;
  $('#ebsPeriodMode').style.display = (mode === 'period') ? 'block' : 'none';
  $('#ebsDailyMode').style.display  = (mode === 'daily')  ? 'block' : 'none';
});

// Режим «По периодам» — добавить
$('#ebsPeriodAddBtn')?.addEventListener('click', () => {
  const from = $('#ebsPeriodFrom').value;
  const to = $('#ebsPeriodTo').value;
  const brand = $('#ebsPeriodBrand').value;

  if (!from) return showToast('Укажите дату начала', true);
  if (!to)   return showToast('Укажите дату окончания', true);
  if (!brand) return showToast('Выберите бренд', true);

  if (from > to) {
    return showToast('Дата начала позже даты окончания', true);
  }

  // Проходим по дням и добавляем в dailyEntries
  const start = new Date(from + 'T00:00:00');
  const end = new Date(to + 'T00:00:00');
  const dayCount = Math.round((end - start) / 86400000) + 1;

  if (dayCount > 90) {
    return showToast('Слишком длинный период (максимум 90 дней)', true);
  }

  // Проверяем «прошлые даты» — сегодня и позже
  const today = todayISO();
  if (to < today) {
    return showToast('Нельзя изменять расписание на прошлые даты', true);
  }

  // Заменяем/добавляем в dailyEntries
  for (let i = 0; i < dayCount; i++) {
    const date = addDaysISO(from, i);

    // Пропускаем прошлые (кроме сегодня)
    if (date < today) continue;

    // Ищем в dailyEntries
    const existingIdx = ebsState.dailyEntries.findIndex(e => e.date === date);
    if (existingIdx !== -1) {
      ebsState.dailyEntries[existingIdx].brand = brand;
    } else {
      ebsState.dailyEntries.push({ date, brand });
    }
  }

  // Сортируем
  ebsState.dailyEntries.sort((a, b) => a.date.localeCompare(b.date));

  // Переключаемся на режим «По дням», чтобы пользователь увидел результат
  document.querySelectorAll('#ebsModeSwitch .ebs-mode-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.mode === 'daily');
  });
  ebsState.mode = 'daily';
  $('#ebsPeriodMode').style.display = 'none';
  $('#ebsDailyMode').style.display  = 'block';

  renderEbsDailyRows();
  renderEbsPreview();

  showToast(`Добавлено дней: ${dayCount}`);
});

// Режим «По дням» — раскатать на неделю
$('#ebsDailyRollBtn')?.addEventListener('click', () => {
  const brand = $('#ebsDailyRollBrand').value;
  if (!brand) return showToast('Выберите бренд для раскатки', true);

  // Находим первую дату в dailyEntries, которая >= сегодня. Если таких нет — берём сегодня
  const today = todayISO();
  const candidates = ebsState.dailyEntries
    .filter(e => e.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date));

  const startDate = candidates.length ? candidates[0].date : today;

  // Проставляем на 7 дней
  for (let i = 0; i < 7; i++) {
    const date = addDaysISO(startDate, i);
    const existingIdx = ebsState.dailyEntries.findIndex(e => e.date === date);
    if (existingIdx !== -1) {
      ebsState.dailyEntries[existingIdx].brand = brand;
    } else {
      ebsState.dailyEntries.push({ date, brand });
    }
  }

  ebsState.dailyEntries.sort((a, b) => a.date.localeCompare(b.date));

  renderEbsDailyRows();
  renderEbsPreview();

  showToast(`Бренд ${brand} раскатан на 7 дней с ${fmtISODate(startDate)}`);
});

// Режим «По дням» — добавить строку
$('#ebsDailyAddRowBtn')?.addEventListener('click', () => {
  // Берём последнюю дату из dailyEntries или сегодня
  const last = ebsState.dailyEntries.length
    ? ebsState.dailyEntries[ebsState.dailyEntries.length - 1].date
    : todayISO();
  const newDate = addDaysISO(last, 1);

  ebsState.dailyEntries.push({ date: newDate, brand: '' });
  renderEbsDailyRows();
  renderEbsPreview();
});

// Очистить всё
$('#ebsClearAllBtn')?.addEventListener('click', () => {
  if (!confirm('Очистить всё расписание для линии ' + ebsState.line + '?')) return;

  setElectronicBrandSchedule({
    ...getElectronicBrandSchedule(),
    [ebsState.line]: []
  });

  ebsState.dailyEntries = [];
  ebsState.periodEntries = [];

  renderEbsDailyRows();
  renderEbsPreview();

  showToast('Расписание очищено');
});

// Сохранить
$('#electronicBrandScheduleSave')?.addEventListener('click', () => {
  if (!ebsState.line) return;

  const today = todayISO();

  // Формируем финальный массив из dailyEntries: только даты >= сегодня с непустым брендом
  const entries = ebsState.dailyEntries
    .filter(e => e.date && e.date >= today && e.brand && e.brand.trim())
    .map(e => ({ date: e.date, brand: e.brand.trim() }));

  // Оставляем в расписании для линии:
  //  - то, что уже было сохранено и НЕ касается дат из dailyEntries,
  //  - плюс новые записи.
  const existing = getElectronicBrandScheduleForLine(ebsState.line);
  const touchedDates = new Set(ebsState.dailyEntries.map(e => e.date));

  const keepOld = existing.filter(x => !touchedDates.has(x.date));
  const finalArr = [...keepOld, ...entries];
  finalArr.sort((a, b) => a.date.localeCompare(b.date));

  setElectronicBrandSchedule({
    ...getElectronicBrandSchedule(),
    [ebsState.line]: finalArr
  });

  closeElectronicBrandSchedule();

  // Перерисовываем редактор — обновятся счётчики дней
  renderElectronicView();

  showToast('Расписание сохранено');
});

/* Получить расписание для линии — массив { date, brand }, отсортированный по дате */
function getElectronicBrandScheduleForLine(line) {
  const all = getElectronicBrandSchedule();
  const arr = Array.isArray(all[line]) ? all[line] : [];
  return [...arr].sort((a, b) => a.date.localeCompare(b.date));
}

/* Получить бренд по конкретной дате для линии (или null) */
function getElectronicBrandForDate(line, dateStr) {
  const arr = getElectronicBrandScheduleForLine(line);
  const found = arr.find(x => x.date === dateStr);
  return found ? found.brand : null;
}

/* Установить запись расписания. Если brand пустой — удаляет запись. */
function setElectronicBrandForDate(line, dateStr, brand) {
  const all = getElectronicBrandSchedule();
  if (!Array.isArray(all[line])) all[line] = [];

  // Удаляем старую запись на эту дату
  all[line] = all[line].filter(x => x.date !== dateStr);

  // Добавляем новую, если бренд не пустой
  if (brand && brand.trim()) {
    all[line].push({ date: dateStr, brand: brand.trim() });
  }

  // Сортируем по дате
  all[line].sort((a, b) => a.date.localeCompare(b.date));

  setElectronicBrandSchedule(all);
}

/* Массово установить записи: массив { date, brand }. brand='' → удалить. */
function setElectronicBrandScheduleBulk(line, entries) {
  const all = getElectronicBrandSchedule();
  if (!Array.isArray(all[line])) all[line] = [];

  // Удаляем все даты, которые есть в entries
  const datesToReplace = new Set(entries.map(e => e.date));
  all[line] = all[line].filter(x => !datesToReplace.has(x.date));

  // Добавляем новые
  entries.forEach(e => {
    if (e.brand && e.brand.trim()) {
      all[line].push({ date: e.date, brand: e.brand.trim() });
    }
  });

  all[line].sort((a, b) => a.date.localeCompare(b.date));
  setElectronicBrandSchedule(all);
}

/* Утилита: сегодняшняя дата в формате 'YYYY-MM-DD' */
function todayISO() {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${yyyy}-${mm}-${dd}`;
}

/* Утилита: прибавить N дней к дате 'YYYY-MM-DD' */
function addDaysISO(dateStr, n) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + n);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${yyyy}-${mm}-${dd}`;
}

/* Утилита: 7 дат ISO-недели (Пн..Вс) со сдвигом offset недель */
function getWeekDays(offset = 0) {
  const now = new Date();
  const jsDay = now.getDay();
  const isoDay = jsDay === 0 ? 7 : jsDay;

  const monday = new Date(now);
  monday.setDate(now.getDate() - (isoDay - 1) + (offset * 7));

  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    days.push(`${yyyy}-${mm}-${dd}`);
  }
  return days;
}

/* Текущая неделя (offset = 0) */
function getCurrentWeekDays() {
  return getWeekDays(0);
}

/* Название недели: «16–22.06» */
function getWeekLabel(offset = 0) {
  const days = getWeekDays(offset);
  const first = fmtShortDate(days[0]);
  const last = fmtShortDate(days[6]);
  return `${first} – ${last}`;
}

/* ============================================================
   РАСПИСАНИЕ CL — ПОНЕДЕЛЬНЫЕ ПРАВКИ (оверрайды)

   Базовое расписание (standard.frequency.schedule) — это повторяющийся
   недельный шаблон. Правки, сделанные для конкретной недели, хранятся
   отдельно и НЕ трогают базовый шаблон и другие недели.

   Структура cl_schedule_weeks_v1:
   {
     "<YYYY-MM-DD начала недели>": {
       "<линия>": {
         removed: [stdId, ...],           // убрано только для этой недели
         added:   [stdId, ...],           // добавлено только для этой недели
         rows: { [stdId]: { schedule:[{day,shift}], timeWindows:[{from,to}], work } }
       }
     }
   }
   ============================================================ */

/* Понедельник недели по смещению (0 = текущая) */
function getSchWeekStart(offset = 0) {
  return getWeekDays(offset)[0];
}

function getScheduleWeeks() {
  return load(STORAGE_KEYS.scheduleWeeks, {});
}
function setScheduleWeeks(v) {
  save(STORAGE_KEYS.scheduleWeeks, v);
}

/* Оверрайд конкретной недели+линии или null */
function getScheduleWeekOverride(weekStart, line) {
  if (!weekStart || !line) return null;
  const all = getScheduleWeeks();
  const wk = all[weekStart];
  if (!wk) return null;
  return wk[line] || null;
}

/* Сохранить оверрайд недели+линии (пустой — удаляем) */
function setScheduleWeekOverride(weekStart, line, ov) {
  if (!weekStart || !line) return;
  const all = getScheduleWeeks();
  if (!all[weekStart]) all[weekStart] = {};

  const isEmpty = !ov || (
    !(ov.removed && ov.removed.length) &&
    !(ov.added && ov.added.length) &&
    !(ov.rows && Object.keys(ov.rows).length)
  );

  if (isEmpty) {
    delete all[weekStart][line];
    if (!Object.keys(all[weekStart]).length) delete all[weekStart];
  } else {
    all[weekStart][line] = ov;
  }
  setScheduleWeeks(all);
}

/* Есть ли для недели+линии хоть какие-то правки */
function hasScheduleWeekOverride(weekStart, line) {
  return !!getScheduleWeekOverride(weekStart, line);
}

/* Утилита: человекочитаемая дата 'YYYY-MM-DD' → '28.09.2026' */
function fmtISODate(dateStr) {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr || '';
  const [yyyy, mm, dd] = dateStr.split('-');
  return `${dd}.${mm}.${yyyy}`;
}
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

  if (!operator) return showToast('Укажите ФИО оператора', true);
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
   COCL: экран резюме после сохранения проверки
   ============================================================ */

function renderCoclSummary(record) {
  const container = $('#coclSummaryView');
  if (!container) return;

  // Статистика
  const total = record.items.length;
  const oks = record.items.filter(x => x.status === 'OK').length;
  const fails = record.items.filter(x => x.status === 'FAIL').length;
  const unchecked = record.items.filter(x => x.status === 'UNCHECKED').length;
  const checkedTotal = oks + fails;
  const percentOk = checkedTotal > 0 ? Math.round((oks / checkedTotal) * 100) : 0;
  const allOk = fails === 0 && unchecked === 0;

  const shieldClass = allOk ? 'tl-shield-ok' : 'tl-shield-fail';
  const shieldTitle = allOk ? 'Всё под контролем' : 'Требует внимания';

  const shieldSubParts = [];
  if (checkedTotal > 0) shieldSubParts.push(`Проверено: <strong>${checkedTotal}</strong> из ${total}`);
  if (fails > 0)        shieldSubParts.push(`вне нормы: <strong>${fails}</strong>`);
  if (unchecked > 0)    shieldSubParts.push(`<span class="tl-shield-sub-unchecked">не проверено: ${unchecked}</span>`);

  // Чипы стандартов
  const chipsHtml = record.items.slice(0, 20).map(it => {
    let cls;
    if (it.status === 'OK') cls = 'tl-shield-chip-ok';
    else if (it.status === 'FAIL') cls = 'tl-shield-chip-fail';
    else cls = 'tl-shield-chip-unchecked';

    const label = it.machine ? `${it.machine} · ${it.oplNumber || ''}` : (it.oplNumber || it.title || '—');
    return `<span class="tl-shield-chip ${cls}" title="${escapeAttr(it.title || '')}">
      <span class="tl-shield-chip-dot"></span>
      ${escapeHtml(label)}
    </span>`;
  }).join('');

  const chipMore = record.items.length > 20
    ? `<span class="tl-shield-chip">+${record.items.length - 20}</span>`
    : '';

  // Контекст
  let contextLine = '';
  if (record.type === 'ChangeOver') {
    contextLine = `Бренд: <strong>${escapeHtml(record.brandFrom)}</strong> → <strong>${escapeHtml(record.brandTo)}</strong>`;
  } else if (record.type === 'CL_TO') {
    contextLine = `Тип: <strong>CL в ТО</strong>`;
  } else if (record.type === 'CL_Conversion') {
    contextLine = `Тип: <strong>CL в Конвертацию</strong>`;
  }

  const html = `
    <div class="card tl-summary-card">
      <div class="tl-summary-head">
        <div class="tl-summary-icon tl-summary-icon-ok">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
        </div>
        <div>
          <div class="tl-summary-title">Проверка сохранена</div>
          <div class="tl-summary-sub">
            Оператор: <strong>${escapeHtml(record.operator)}</strong> ·
            Линия: <strong>${escapeHtml(record.line)}</strong> ·
            Часть: <strong>${escapeHtml(record.part)}</strong> ·
            Смена: <strong>${escapeHtml(record.shift)}</strong>
          </div>
          <div class="tl-summary-sub" style="margin-top:4px">
            ${contextLine}
          </div>
        </div>
      </div>
    </div>

    <div class="tl-shield ${shieldClass}">
      <div class="tl-shield-ring" style="--percent: ${percentOk}">
        <div class="tl-shield-ring-hole">
          <div class="tl-shield-ring-value">${percentOk}%</div>
          <div class="tl-shield-ring-label">ОК</div>
        </div>
      </div>
      <div class="tl-shield-info">
        <div class="tl-shield-title">${shieldTitle}</div>
        <div class="tl-shield-sub">${shieldSubParts.join(' · ')}</div>
        ${fails > 0 ? `
          <div class="tl-shield-journal-warning">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            <span>Есть отклонения. Зафиксируйте их в <strong>Journal Machines</strong>.</span>
          </div>
        ` : ''}
        <div class="tl-shield-chips">
          ${chipsHtml}
          ${chipMore}
        </div>
      </div>
    </div>

    <div class="tl-select-footer">
      <button class="btn btn-secondary" id="coclSummaryBackBtn">← К истории</button>
      <button class="btn btn-primary btn-icon-text" id="coclSummaryNewBtn">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="23 4 23 10 17 10"/>
          <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
        </svg>
        <span>Новая проверка</span>
      </button>
    </div>
  `;

  container.innerHTML = html;

  // Прячем чек-лист, показываем резюме
  $('#checklistCard').style.display = 'none';
  $('#coclSummaryView').style.display = 'block';

  window.scrollTo({ top: 0, behavior: 'smooth' });

  // Обработчики
  $('#coclSummaryBackBtn')?.addEventListener('click', () => {
    // Сначала сброс, потом переключение
    resetCheckForm();
    if (typeof switchTab === 'function') switchTab('history');
  });

  $('#coclSummaryNewBtn')?.addEventListener('click', () => {
    // Сначала сброс, потом переключение на «Проверку»
    resetCheckForm();
    if (typeof switchTab === 'function') switchTab('check');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

/* ============================================================
   БЫСТРАЯ ПРОВЕРКА — состояние и открытие
   ============================================================ */

const quickCheckState = {
  row: null,
  date: '',
  shift: '',
  shiftLetter: '—',
  brand: '',
  existing: null,
  draft: null
};

function openClCheckModal(rowId, dateStr, shift) {
  const modal = $('#quickCheckModal');
  if (!modal) return;

  const row = clState.rows.find(r => r.id === rowId);
  if (!row) return;

  const isElec = clState.mode === 'elec';

  const shiftLetter = getShiftsForDate(dateStr)[shift] || '—';
  const brand = clState.brand || '';

  const existing = findExistingCheck(rowId, dateStr, shiftLetter);
  const draftKey = `${rowId}|${dateStr}|${shift}`;
  const draft = clState.quickDraft[draftKey] || null;

  quickCheckState.row = row;
  quickCheckState.date = dateStr;
  quickCheckState.shift = shift;
  quickCheckState.shiftLetter = shiftLetter;
  quickCheckState.brand = brand;
  quickCheckState.existing = existing;
  quickCheckState.draft = draft;
  quickCheckState.isElec = isElec;

  $('#quickCheckModalTitle').textContent = isElec ? 'Проверка CL (E-Param)' : 'Проверка CL';

  const line = clState.line || '';
  const machine = row.machine || '';
  $('#qcMachine').textContent = line + (machine ? ' · ' + machine : '');
  $('#qcParamName').textContent = isElec ? (row.paramName || '—') : (row.title || '—');
  $('#qcNode').textContent = isElec ? '—' : (row.node || '—');

  const timeFrom = row.timeFrom || '';
  const timeTo = row.timeTo || '';
  $('#qcTime').textContent = (timeFrom && timeTo) ? `${timeFrom}–${timeTo}` : '—';

  const workEl = $('#qcWork');
  const workVal = row.work === 'Stop' ? 'Stop' : 'Run';
  workEl.textContent = workVal;
  workEl.className = 'qc-work-badge ' + (workVal === 'Run' ? 'qc-work-run' : 'qc-work-stop');

  const shiftLabel = shift === 'day' ? 'День' : 'Ночь';
  $('#qcDateShift').textContent = `${fmtISODate(dateStr)} · ${shiftLabel} · бригада ${shiftLetter}`;

  $('#qcBrand').textContent = brand || '— не задан —';

  const controlType = migrateControlType(row.controlType, row.measurements);
  const hasPointsMech = !isElec &&
    Array.isArray(row.measurements) &&
    row.measurements.some(b => b && Array.isArray(b.points) && b.points.length > 0);

  // --- Описание контроля (только для механики) ---
  const ctrlDescBlock = $('#qcControlDescBlock');
  const ctrlDescBody = $('#qcControlDescBody');
  const ctrlDescHint = $('#qcControlDescHint');
  const ctrlDescText = isElec ? '' : (row.controlDescription || '').trim();

  if (ctrlDescBlock && ctrlDescBody) {
    if (ctrlDescText) {
      ctrlDescBlock.style.display = 'block';
      ctrlDescBody.innerHTML = `<div class="qc-control-text">${escapeHtml(ctrlDescText).replace(/\n/g, '<br>')}</div>`;
      if (ctrlDescHint) {
        ctrlDescHint.textContent = ctrlDescText.length > 60
          ? ctrlDescText.substring(0, 60) + '…'
          : ctrlDescText;
      }
      ctrlDescBlock.classList.remove('expanded');
    } else {
      ctrlDescBlock.style.display = 'none';
    }
  }

  const normBlock = $('#qcNormBlock');
  const okBlock = $('#qcAnswerOkNotOk');
  const pointsBlock = $('#qcAnswerPoints');

  if (controlType === 'fixed' && (isElec || !hasPointsMech)) {
    // --- Фиксированный без точек → ОК / Не ОК ---
    normBlock.style.display = 'block';
    const normText = isElec
      ? ((row.normText || '').trim() || '— проверить визуально —')
      : ((row.normText || '').trim() || (row.controlDescription || '').trim() || '— проверить визуально —');
    $('#qcNormValue').textContent = normText;

    okBlock.style.display = 'block';
    pointsBlock.style.display = 'none';

    const existingVal = draft?.status || existing?.status || '';
    $('#qcAnswerOk').checked = existingVal === 'OK';
    $('#qcAnswerFail').checked = existingVal === 'FAIL';
  } else if (isElec && (controlType === 'variable' || controlType === 'interval')) {
    // --- Электронный числовой параметр ---
    const values = Array.isArray(row.valuesByBrand) ? row.valuesByBrand : [];
    // Ищем значение для выбранного бренда, иначе первое
    let entry = brand ? values.find(v => v.brand === brand) : null;
    if (!entry && values.length) entry = values[0];

    normBlock.style.display = 'block';
    okBlock.style.display = 'none';
    pointsBlock.style.display = 'block';

    let normText = '— норма не задана —';
    if (entry) {
      const target = entry.target;
      const tol = entry.tolerance;
      normText = `${entry.brand || 'Все бренды'}: ${target} ± ${tol}`;
    }
    $('#qcNormValue').textContent = normText;

    // Показываем одно поле ввода значения
    const pointsList = $('#qcPointsList');
    if (pointsList) {
      const savedValue = draft?.answer || existing?.answer || '';
      pointsList.innerHTML = `
        <div class="qc-point-row" data-index="0">
          <div class="qc-point-head">
            <span class="qc-point-num">Значение</span>
            <span class="qc-point-norm">${entry ? `${entry.target} ± ${entry.tolerance}` : '—'}</span>
          </div>
          <div class="qc-point-input-wrap">
            <input type="number" step="any" class="qc-point-input" data-qc-point="0"
                   value="${escapeAttr(savedValue)}" placeholder="0">
          </div>
        </div>
      `;
    }
  } else {
    // --- Мех. точки замера (value_input / range_input) ---
    const block = getRowMeasurementBlock(row, brand);
    normBlock.style.display = 'block';
    okBlock.style.display = 'none';
    pointsBlock.style.display = 'block';

    const points = block?.points || [];
    const normText = points.map((p, i) => `Т${i + 1}: ${p.value || '—'}`).join(' · ');
    $('#qcNormValue').textContent = normText || '— точки не заданы —';

    renderQcPointsList(points, existing, draft);
  }

  $('#qcComment').value = draft?.comment || existing?.comment || '';

  const infoEl = $('#qcExistingInfo');
  if (existing) {
    infoEl.style.display = 'flex';
    $('#qcExistingStatus').textContent =
      existing.status === 'OK' ? 'ОК' :
      existing.status === 'FAIL' ? 'Не ОК' : 'Не проверено';
  } else {
    infoEl.style.display = 'none';
  }

  openModal(modal);

  const openStdBtn = $('#qcOpenStandardBtn');
  if (openStdBtn) {
    openStdBtn.disabled = !isElec && !row.id;
    openStdBtn.onclick = () => {
      if (!isElec && typeof openStandardView === 'function') {
        openStandardView(row.id);
      } else {
        showToast('Полный просмотр доступен только для механических стандартов', true);
      }
    };
  }
}

/* ============================================================
   БЫСТРАЯ ПРОВЕРКА — закрытие
   ============================================================ */

function closeQuickCheckModal() {
  closeModal('#quickCheckModal');
  quickCheckState.row = null;
  quickCheckState.existing = null;
  quickCheckState.draft = null;
}

/* ============================================================
   БЫСТРАЯ ПРОВЕРКА — сохранение
   ============================================================ */

function saveQuickCheck() {
  const row = quickCheckState.row;
  if (!row) {
    showToast('Ошибка: стандарт не найден', true);
    return;
  }

  const isElec = quickCheckState.isElec === true;
  const date = quickCheckState.date;
  const shift = quickCheckState.shift;
  const brand = quickCheckState.brand || '';
  const controlType = migrateControlType(row.controlType, row.measurements);
  const hasPointsMech = !isElec &&
    Array.isArray(row.measurements) &&
    row.measurements.some(b => b && Array.isArray(b.points) && b.points.length > 0);
  const comment = ($('#qcComment')?.value || '').trim();

  let status = 'UNCHECKED';
  let answer = '';
  let value = null;

  if (controlType === 'fixed' && (isElec || !hasPointsMech)) {
    const r = document.querySelector('input[name="qc_answer"]:checked');
    if (!r) {
      showToast('Выберите ОК или Не ОК', true);
      return;
    }
    status = r.value === 'OK' ? 'OK' : 'FAIL';
    answer = r.value === 'OK' ? 'ОК' : 'Не ОК';
  } else if (isElec) {
    // --- E-Param: одно числовое значение ---
    const inp = document.querySelector('.qc-point-input');
    if (!inp || inp.value === '') {
      showToast('Введите значение', true);
      return;
    }
    const num = parseFloat(inp.value);
    if (isNaN(num)) {
      showToast('Введите число', true);
      return;
    }

    // Ищем target/tolerance для бренда
    const values = Array.isArray(row.valuesByBrand) ? row.valuesByBrand : [];
    let entry = brand ? values.find(v => v.brand === brand) : null;
    if (!entry && values.length) entry = values[0];

    let inRange = true;
    if (entry) {
      const min = Number(entry.target) - Number(entry.tolerance);
      const max = Number(entry.target) + Number(entry.tolerance);
      inRange = num >= min && num <= max;
    }

    status = inRange ? 'OK' : 'FAIL';
    answer = String(num);
    value = num;
  } else {
    // --- Мех: точки замера ---
    const inputs = document.querySelectorAll('.qc-point-input');
    if (!inputs.length) {
      showToast('Не найдены поля ввода точек', true);
      return;
    }

    const block = getRowMeasurementBlock(row, brand);
    const points = block?.points || [];

    const values = [];
    let anyFail = false;
    let allFilled = true;

    inputs.forEach(inp => {
      const idx = parseInt(inp.dataset.qcPoint, 10);
      const v = (inp.value || '').trim();
      if (v === '') { allFilled = false; values.push(''); return; }
      const num = parseFloat(v);
      values.push(isNaN(num) ? v : String(num));
      const norm = parseNorm(points[idx]?.value);
      if (norm && !isNaN(num) && (num < norm.min || num > norm.max)) anyFail = true;
    });

    if (!allFilled) {
      showToast('Заполните все точки', true);
      return;
    }

    status = anyFail ? 'FAIL' : 'OK';
    answer = values.join(', ');
    value = values.length === 1 ? parseFloat(values[0]) : null;
  }

  const key = `${row.id}|${date}|${shift}`;
  clState.quickDraft[key] = { status, answer, value, comment };

  renderClMatrix();
  closeQuickCheckModal();
  showToast('Отметка сохранена');
}

/* ============================================================
   БЫСТРАЯ ПРОВЕРКА — хелперы
   ============================================================ */

function getRowMeasurementBlock(row, brand) {
  const measurements = Array.isArray(row.measurements) ? row.measurements : [];
  if (!measurements.length) return null;
  if (brand) {
    const b = measurements.find(x => x.brand === brand);
    if (b) return b;
  }
  return measurements.find(x => !x.brand) || measurements[0];
}

function renderQcPointsList(points, existing, draft) {
  const list = $('#qcPointsList');
  if (!list) return;

  if (!points.length) {
    list.innerHTML = '<div class="empty-state" style="padding:12px">Точки не заданы</div>';
    return;
  }

  const savedValues = [];
  if (draft?.value != null && draft.value !== '') {
    savedValues.push(String(draft.value));
  }
  if (existing?.answer) {
    String(existing.answer).split(',').forEach(v => savedValues.push(v.trim()));
  }

  list.innerHTML = points.map((p, i) => {
    const norm = parseNorm(p.value);
    const normStr = norm ? `[${norm.min}…${norm.max}]` : '';
    const value = savedValues[i] || '';

    return `
      <div class="qc-point-row" data-index="${i}">
        <div class="qc-point-head">
          <span class="qc-point-num">Т${i + 1}</span>
          <span class="qc-point-norm">${escapeHtml(p.value || '—')}</span>
          ${normStr ? `<span class="qc-point-range">${escapeHtml(normStr)}</span>` : ''}
          <span class="qc-point-status" data-qc-status="${i}"></span>
        </div>
        <div class="qc-point-input-wrap">
          <input type="number" step="any" class="qc-point-input" data-qc-point="${i}"
                 value="${escapeAttr(value)}" placeholder="0">
        </div>
      </div>
    `;
  }).join('');

  list.querySelectorAll('.qc-point-input').forEach(inp => {
    updateQcPointStatus(inp);
    inp.addEventListener('input', () => updateQcPointStatus(inp));
  });
}

function updateQcPointStatus(inp) {
  const row = inp.closest('.qc-point-row');
  if (!row) return;
  const idx = parseInt(row.dataset.index, 10);
  const statusEl = row.querySelector('[data-qc-status]');
  const points = getRowMeasurementBlock(quickCheckState.row, quickCheckState.brand)?.points || [];
  const norm = parseNorm(points[idx]?.value);

  row.classList.remove('qc-point-ok', 'qc-point-fail');
  if (statusEl) { statusEl.textContent = ''; statusEl.className = 'qc-point-status'; }

  if (inp.value === '') return;
  const v = parseFloat(inp.value);
  if (isNaN(v)) return;
  if (!norm) return;

  const inRange = v >= norm.min && v <= norm.max;
  row.classList.add(inRange ? 'qc-point-ok' : 'qc-point-fail');
  if (statusEl) {
    statusEl.textContent = inRange ? '✓' : '✕';
    statusEl.className = 'qc-point-status ' + (inRange ? 'ok' : 'fail');
  }
}
/* --- Быстрая проверка: обработчики через делегирование --- */
/* Работает всегда, даже если модалка пересоздана */
document.addEventListener('click', (e) => {
  if (e.target.closest('#quickCheckModalClose')) {
    closeQuickCheckModal();
    return;
  }
  if (e.target.closest('#quickCheckCancelBtn')) {
    closeQuickCheckModal();
    return;
  }
  if (e.target.closest('#quickCheckSaveBtn')) {
    saveQuickCheck();
    return;
  }
  // Клик по фону модалки
  if (e.target.id === 'quickCheckModal') {
    closeQuickCheckModal();
  }
});

/* Модалка комментария — переиспользуем существующую, но в неё надо передать dataset.comment */
function openCommentModalElec(item) {
  currentCommentItem = item;
  const it = elecState.items.find(x => x.id === item.dataset.elecId);
  $('#commentModalPoint').textContent = it
    ? `${it.machine || ''} · ${it.paramName || ''}`
    : '';
  $('#commentText').value = item.dataset.comment || '';
  openModal('#commentModal');
  setTimeout(() => $('#commentText').focus(), 100);
}

/* Модалка override бренда */
window.openElecBrandOverrideDialog = function() {
  const brands = getBrandsForLine(elecState.line);
  if (!brands.length) return showToast('На линии нет брендов', true);

  const brandList = brands.map(b => `${b}`).join(', ');
  const current = elecState.brand || '';
  const newBrand = prompt(`Бренд на ${fmtISODate(elecState.date)}\nДоступные: ${brandList}`, current);
  if (newBrand === null) return;
  const trimmed = newBrand.trim();
  if (!trimmed) return;
  if (!brands.includes(trimmed)) {
    return showToast('Бренд не найден на линии', true);
  }
  if (trimmed === elecState.brand) return; // без изменений

  const reason = prompt('Причина изменения (кратко):', '') || '';
  elecState.brand = trimmed;
  elecState.brandReason = reason.trim();

  refreshElectronicTab();
};

function setTopLosses(v) {
  save(STORAGE_KEYS.topLosses, v);
}

/* Плоский список всех потерь: [{ id, name, categoryId, categoryName }] */
function getAllLossItems() {
  const result = [];
  getTopLosses().forEach(cat => {
    (cat.items || []).forEach(it => {
      result.push({
        id: it.id,
        name: it.name,
        categoryId: cat.id,
        categoryName: cat.name
      });
    });
  });
  return result;
}

/* Найти потерю по id */
function findLossById(lossId) {
  return getAllLossItems().find(l => l.id === lossId) || null;
}

/* Сгенерировать id для новой потери */
function makeLossId(name) {
  const base = 'loss_' + String(name).toLowerCase()
    .replace(/[^a-zа-я0-9]+/gi, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 30);
  const existing = new Set(getAllLossItems().map(l => l.id));
  let candidate = base || 'loss_new';
  let n = 1;
  while (existing.has(candidate)) {
    candidate = base + '_' + (++n);
  }
  return candidate;
}

/* Сгенерировать id для новой категории */
function makeCategoryId(name) {
  const base = 'cat_' + String(name).toLowerCase()
    .replace(/[^a-zа-я0-9]+/gi, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 30);
  const existing = new Set(getTopLosses().map(c => c.id));
  let candidate = base || 'cat_new';
  let n = 1;
  while (existing.has(candidate)) {
    candidate = base + '_' + (++n);
  }
  return candidate;
}
function setLineMachines(v) { save(STORAGE_KEYS.lineMachines, v); }

/* Машины конкретной линии */
function getMachinesForLine(line) {
  const lm = getLineMachines();
  return Array.isArray(lm[line]) ? lm[line] : [];
}

function getStandards() {
  const raw = load(STORAGE_KEYS.standards, []);
  return raw.map(normalizeStandard);
}
function setStandards(v) { save(STORAGE_KEYS.standards, v); }

function getHistory() { return load(STORAGE_KEYS.history, []); }
function setHistory(v) { save(STORAGE_KEYS.history, v); }

function getNodes() { return load(STORAGE_KEYS.nodes, [...DEFAULT_NODES]); }
function setNodes(v) { save(STORAGE_KEYS.nodes, v); }

/* Смены — фиксированные A, B, C, D. Редактирование через UI запрещено. */
function getShifts() {
  return ['A', 'B', 'C', 'D'];
}
function setShifts(v) {
  // Заглушка — смены фиксированные, ничего не сохраняем
  // (оставлено для совместимости с существующим кодом бэкапа)
}

function getBrands() { return load(STORAGE_KEYS.brands, [...DEFAULT_BRANDS]); }
function setBrands(v) { save(STORAGE_KEYS.brands, v); }

/* Цех для каждого бренда: { [brandName]: workshopId } */
function getBrandWorkshops() { return load(STORAGE_KEYS.brandWorkshops, {}); }
function setBrandWorkshops(v) { save(STORAGE_KEYS.brandWorkshops, v); }
function getBrandWorkshop(brandName) { return getBrandWorkshops()[brandName] || ''; }
function setBrandWorkshop(brandName, workshopId) {
  const m = getBrandWorkshops();
  if (workshopId) m[brandName] = workshopId;
  else delete m[brandName];
  setBrandWorkshops(m);
}

function getLineBrands() { return load(STORAGE_KEYS.lineBrands, {}); }
function setLineBrands(v) { save(STORAGE_KEYS.lineBrands, v); }

/* --- Пользовательские триггеры Change Over (мех + электро) --- */
function getCustomTriggers() {
  const raw = load(STORAGE_KEYS.customTriggers, null);
  if (!Array.isArray(raw)) {
    // Дефолт — прежние фиксированные опции как стартовый набор
    const def = MATERIAL_CHANGES.map(m => ({
      id: 'ct_' + m.value,
      label: m.label,
      value: m.value,
      workshop: '',
      part: ''
    }));
    save(STORAGE_KEYS.customTriggers, def);
    return def;
  }
  return raw.filter(t => t && typeof t.label === 'string' && t.label.trim());
}
function setCustomTriggers(v) { save(STORAGE_KEYS.customTriggers, v); }
function getCustomTriggersForPart(part) {
  return getCustomTriggers().filter(t => !t.part || t.part === part);
}

/* ============================================================
   НАСТРОЙКИ: пользовательские триггеры Change Over
   ============================================================ */

function renderCustomTriggersSettings() {
  const container = $('#customTriggersContainer');
  if (!container) return;

  const list = getCustomTriggers();
  const workshops = getWorkshops();

  if (!list.length) {
    container.innerHTML = '<div class="empty-state">Триггеров нет. Нажмите «Добавить триггер».</div>';
    return;
  }

  // Группируем по цехам: «общие» (workshop==='') и по id цеха
  const groups = new Map();
  groups.set('__shared__', []);
  workshops.forEach(w => groups.set(w.id, []));

  list.forEach(t => {
    const key = (t.workshop && groups.has(t.workshop)) ? t.workshop : '__shared__';
    groups.get(key).push(t);
  });

  // Хранилище открытых групп
  let openIds = getCtOpenGroups();
  if (openIds === null) { openIds = []; setCtOpenGroups(openIds); }

  let html = '';

  // Общие триггеры (без привязки к цеху)
  const shared = groups.get('__shared__') || [];
  if (shared.length) {
    const open = openIds.includes('__shared__');
    html += `<div class="bl-group bl-group-workshop ${open ? 'expanded' : ''}">
      <div class="bl-group-head" data-ct-toggle="__shared__">
        <span class="bl-group-toggle"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg></span>
        <span class="bl-group-name">Общие (все цеха)</span>
        <span class="bl-group-count">${shared.length} триг.</span>
      </div>
      <div class="bl-group-body">${renderCtList(shared)}</div>
    </div>`;
  }

  // По цехам
  workshops.forEach(ws => {
    const wsTriggers = groups.get(ws.id) || [];
    if (!wsTriggers.length) return;
    const open = openIds.includes(ws.id);
    html += `<div class="bl-group bl-group-workshop ${open ? 'expanded' : ''}">
      <div class="bl-group-head" data-ct-toggle="${escapeAttr(ws.id)}">
        <span class="bl-group-toggle"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg></span>
        <span class="bl-group-name">${escapeHtml(ws.name)}</span>
        <span class="bl-group-count">${wsTriggers.length} триг.</span>
      </div>
      <div class="bl-group-body">${renderCtList(wsTriggers)}</div>
    </div>`;
  });

  container.innerHTML = html;

  container.querySelectorAll('[data-ct-toggle]').forEach(head => {
    head.addEventListener('click', () => {
      const id = head.dataset.ctToggle;
      let open = getCtOpenGroups() || [];
      if (open.includes(id)) open = open.filter(x => x !== id);
      else open.push(id);
      setCtOpenGroups(open);
      renderCustomTriggersSettings();
    });
  });

  container.querySelectorAll('[data-ct-edit]').forEach(btn => {
    btn.addEventListener('click', () => openCustomTriggerModal(btn.dataset.ctEdit));
  });
  container.querySelectorAll('[data-ct-delete]').forEach(btn => {
    btn.addEventListener('click', () => deleteCustomTrigger(btn.dataset.ctDelete));
  });
}

function renderCtList(arr) {
  return arr.map(t => {
    const wsName = t.workshop ? getWorkshopName(t.workshop) : '';
    const meta = [t.part || 'любая часть', wsName || 'все цеха'].join(' · ');
    return `
      <div class="tl-loss-inline-row" data-trigger-id="${escapeAttr(t.id)}">
        <span class="tl-loss-inline-name">${escapeHtml(t.label)}</span>
        <span class="tl-loss-ws-chip">${escapeHtml(meta)}</span>
        <div class="tl-loss-inline-actions">
          <button type="button" class="tl-row-action-btn tl-row-edit-btn" data-ct-edit="${escapeAttr(t.id)}" title="Изменить">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
          <button type="button" class="tl-row-action-btn tl-row-delete-btn" data-ct-delete="${escapeAttr(t.id)}" title="Удалить">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      </div>
    `;
  }).join('');
}

function getCtOpenGroups() {
  try { return JSON.parse(localStorage.getItem('cl_ct_open_groups')) || null; } catch(e) { return null; }
}
function setCtOpenGroups(arr) {
  try { localStorage.setItem('cl_ct_open_groups', JSON.stringify(arr)); } catch(e) {}
}

/* Старая функция с удалённым рендером — объединена выше */

let currentEditingTriggerId = null;

function openCustomTriggerModal(id) {
  const modal = $('#customTriggerModal');
  if (!modal) return;

  currentEditingTriggerId = id || null;

  const titleEl = $('#customTriggerModalTitle');
  const saveBtn = $('#customTriggerModalSave');
  const wsEl = $('#customTriggerModalWorkshop');
  if (wsEl) wsEl.innerHTML = workshopOptionsHtml('');

  if (id) {
    const t = getCustomTriggers().find(x => x.id === id);
    if (!t) return;
    if (titleEl) titleEl.textContent = 'Изменить триггер';
    if (saveBtn) saveBtn.textContent = 'Сохранить';
    $('#customTriggerModalId').value = t.id;
    $('#customTriggerModalLabel').value = t.label || '';
    $('#customTriggerModalPart').value = t.part || '';
    if (wsEl) wsEl.value = t.workshop || '';
  } else {
    if (titleEl) titleEl.textContent = 'Добавить триггер';
    if (saveBtn) saveBtn.textContent = 'Добавить';
    $('#customTriggerModalId').value = '';
    $('#customTriggerModalLabel').value = '';
    $('#customTriggerModalPart').value = '';
  }

  openModal(modal);
  setTimeout(() => $('#customTriggerModalLabel')?.focus(), 100);
}

function closeCustomTriggerModal() {
  closeModal('#customTriggerModal');
  currentEditingTriggerId = null;
}

function deleteCustomTrigger(id) {
  const t = getCustomTriggers().find(x => x.id === id);
  if (!t) return;

  // Считаем, сколько стандартов используют этот триггер
  const usedByMech = getStandards().filter(st =>
    Array.isArray(st.triggers) && st.triggers.includes(t.value)
  ).length;
  const usedByElec = getElectronicParams().filter(p =>
    Array.isArray(p.triggers) && p.triggers.includes(t.value)
  ).length;

  let msg = `Удалить триггер «${t.label}»?`;
  if (usedByMech + usedByElec > 0) {
    msg += `\n\nОн используется в ${usedByMech} мех. и ${usedByElec} эл. стандартах — у них он останется, но пропадёт из списка выбора.`;
  }
  if (!confirm(msg)) return;

  setCustomTriggers(getCustomTriggers().filter(x => x.id !== id));
  renderCustomTriggersSettings();
  showToast('Триггер удалён');
}

$('#addCustomTriggerBtn')?.addEventListener('click', () => openCustomTriggerModal(null));
$('#customTriggerModalClose')?.addEventListener('click', closeCustomTriggerModal);
$('#customTriggerModalCancel')?.addEventListener('click', closeCustomTriggerModal);
$('#customTriggerModal')?.addEventListener('click', (e) => {
  if (e.target.id === 'customTriggerModal') closeCustomTriggerModal();
});

$('#customTriggerModalLabel')?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    $('#customTriggerModalSave')?.click();
  }
});

$('#customTriggerModalSave')?.addEventListener('click', () => {
  const id = $('#customTriggerModalId').value;
  const label = ($('#customTriggerModalLabel').value || '').trim();
  const part = $('#customTriggerModalPart').value;
  const workshop = ($('#customTriggerModalWorkshop')?.value || '').trim();

  if (!label) return showToast('Введите название триггера', true);

  const list = getCustomTriggers();

  // Дубликат по названию
  const dup = list.find(t => t.id !== id && t.label.toLowerCase() === label.toLowerCase());
  if (dup) return showToast('Такой триггер уже есть', true);

  if (id) {
    const t = list.find(x => x.id === id);
    if (!t) return;
    t.label = label;
    t.part = part;
    t.workshop = workshop;
  } else {
    list.push({
      id: 'ct_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      label,
      value: 'ct_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      part,
      workshop
    });
  }

  setCustomTriggers(list);
  renderCustomTriggersSettings();
  if (typeof fillEditorFilters === 'function') fillEditorFilters();
  closeCustomTriggerModal();
  showToast(id ? 'Триггер обновлён' : 'Триггер добавлен');
});

/* Линии, у которых есть хотя бы один бренд */
function getAvailableLines() {
  const lines = getLines();
  const lineBrands = getLineBrands();
  return lines.filter(l => Array.isArray(lineBrands[l]) && lineBrands[l].length > 0);
}

/* Бренды для конкретной линии */
function getBrandsForLine(line) {
  const lb = getLineBrands();
  return Array.isArray(lb[line]) ? lb[line] : [];
}

/* ============================================================
   ЧАСЫ
   ============================================================ */
function tickClock() { $('#headerDatetime').textContent = nowStr(); }
setInterval(tickClock, 1000);
tickClock();

/* ============================================================
   ВКЛАДКА ПРОВЕРКА
   ============================================================ */

/* Заполнение скрытого select линий (значение задаётся выбором из модалки) */
function fillLinesForOperator() {
  const el = $('#lineSelect');
  if (!el) return;
  const available = getAvailableLines();
  if (!available.length) {
    el.innerHTML = '<option value="">— нет доступных линий (добавьте бренды в Настройках) —</option>';
    return;
  }
  el.innerHTML = '<option value="">— выберите —</option>' +
    available.map(l => `<option>${escapeHtml(l)}</option>`).join('');
}

/* --- Установить линию в COCL (из модалки выбора) --- */
function setCoclLine(line) {
  const sel = $('#lineSelect');
  if (!sel) return;
  sel.value = line;

  const codeEl = $('#coclLinePillCode');
  if (codeEl) {
    const ctx = (line && typeof getBlockForLine === 'function') ? getBlockForLine(line) : null;
    const wsName = ctx ? ctx.workshop.name : '';
    codeEl.textContent = line ? (line + (wsName ? ' · ' + wsName : '')) : 'Выбрать линию';
  }

  sel.dispatchEvent(new Event('change'));
}

/* Сбросить выбор линии */
function clearCoclLine() {
  const codeEl = $('#coclLinePillCode');
  if (codeEl) codeEl.textContent = 'Выбрать линию';
  const ctxEl = $('#coclLineContext');
  if (ctxEl) { ctxEl.style.display = 'none'; ctxEl.innerHTML = ''; }
}

/* Текущий пользователь (автовход). Берём из localStorage; если не задан —
   подставляем первого оператора из настроек. */
function getCurrentUser() {
  try {
    const v = localStorage.getItem('cl_current_user');
    if (v && String(v).trim()) return String(v).trim();
  } catch (e) {}
  const ops = getOperators();
  return (Array.isArray(ops) && ops.length) ? String(ops[0]).trim() : '';
}

/* Кнопка-чип линии → модалка выбора линии */
$('#coclLinePill')?.addEventListener('click', () => {
  linePickerOnSelect = (line) => {
    setCoclLine(line);
  };
  openLinePickerModal();
});

function fillBrandsForLine(line) {
  const brands = getBrandsForLine(line);
  ['#brandFrom','#brandTo'].forEach(sel => {
    const el = $(sel);
    el.innerHTML = '<option value="">— выберите —</option>' +
      brands.map(b => `<option>${escapeHtml(b)}</option>`).join('');
  });
  updateBrandToOptions();
}

/* Обновить опции brandTo (все бренды линии) */
function updateBrandToOptions() {
  const line = $('#lineSelect').value;
  const brandToSelect = $('#brandTo');
  if (!brandToSelect || !line) return;

  const brands = getBrandsForLine(line);

  const currentValue = brandToSelect.value;
  brandToSelect.innerHTML = '<option value="">— выберите —</option>' +
    brands.map(b => `<option>${escapeHtml(b)}</option>`).join('');

  // Восстанавливаем выбор, если он ещё доступен
  if (brands.includes(currentValue)) {
    brandToSelect.value = currentValue;
  }

  brandToSelect.classList.remove('input-error');
}

$('#lineSelect').addEventListener('change', () => {
  const line = $('#lineSelect').value;
  $('#brandFrom').value = '';
  $('#brandTo').value = '';
  if (line) fillBrandsForLine(line);
  renderCoclLineContext(line);
  renderCoclPartStep(line);
  updateChecklist();
});

/* --- Контекст выбранной линии: Цех · Участок · Блок --- */
function renderCoclLineContext(line) {
  const el = $('#coclLineContext');
  if (!el) return;

  if (!line || typeof getBlockForLine !== 'function') {
    el.style.display = 'none';
    el.innerHTML = '';
    return;
  }

  const ctx = getBlockForLine(line);
  if (!ctx) {
    el.style.display = 'none';
    el.innerHTML = '';
    return;
  }

  const chips = [
    { cls: 'cocl-ctx-workshop', text: ctx.workshop.name },
    { cls: 'cocl-ctx-area',     text: ctx.area.name },
    ctx.block ? { cls: 'cocl-ctx-block', text: ctx.block.name } : null
  ].filter(Boolean);

  // Автовход: показываем, кто проверяет и какая смена сейчас активна
  const period = getCurrentShiftPeriod();
  const shiftLetter = (getShiftsForDate(period.date) || {})[period.shiftType] || '—';
  const user = getCurrentUser();
  const autoText = [
    user ? 'Оператор: ' + user : null,
    (period.shiftType === 'day' ? 'День' : 'Ночь') + ' · бригада ' + shiftLetter
  ].filter(Boolean).join(' · ');

  el.innerHTML = chips
    .map(c => `<span class="cocl-ctx-chip ${c.cls}">${escapeHtml(c.text)}</span>`)
    .join('') + `<span class="cocl-ctx-auto">${escapeHtml(autoText)}</span>`;
  el.style.display = 'flex';
}

/* --- Шаг «Часть линии»: активен только для SMD, иначе скрыт --- */
function renderCoclPartStep(line) {
  const partField = $('#partSelect')?.closest('.field');
  const partSelect = $('#partSelect');
  if (!partField || !partSelect) return;

  const workshopId = line ? getWorkshopIdForLine(line) : null;
  const needsPart = workshopId === 'smd';

  partField.style.display = needsPart ? '' : 'none';

  if (!needsPart) {
    // Для не-SMD часть не выбирается — сбрасываем
    partSelect.value = '';
  }
}

/* --- Обновление чек-листа при изменении условий --- */
$('#partSelect')?.addEventListener('change', () => {
  updateChecklist();
});

/* Клик по кнопке-чипу типа перехода (только в блоке «Проверка») */
$('#typeSelector')?.querySelectorAll('.type-option').forEach(btn => {
  btn.addEventListener('click', () => {
    const value = btn.dataset.value;
    $('#typeSelector').querySelectorAll('.type-option').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    $('#transitionType').value = value;
    onTransitionTypeChange();
  });
});

/* Если по какой-то причине кто-то меняет select — тоже работает */
$('#transitionType').addEventListener('change', onTransitionTypeChange);

function onTransitionTypeChange() {
  const type = $('#transitionType').value;
  updateBrandToOptions();

  if (!type) {
    $('#brandsCard').style.display = 'none';
    $('#changesCard').style.display = 'none';
    $('#checklistCard').style.display = 'none';
    return;
  }

  // Бренды и триггеры — ТОЛЬКО для Change Over
  if (type === 'ChangeOver') {
    $('#brandsCard').style.display = 'block';
    $('#changesCard').style.display = 'block';
    $('#changesTitle').textContent = '4. Что меняется';
    renderMaterialChanges();
  } else {
    $('#brandsCard').style.display = 'none';
    $('#changesCard').style.display = 'none';
  }

  updateChecklist();
}

function renderMaterialChanges() {
  const c = $('#changesContainer');
  const part = $('#partSelect').value;   // Maker / Packer

  // Пользовательские триггеры для конкретной части линии (или общие)
  const items = getCustomTriggersForPart(part).map(t => ({
    value: t.value,
    label: t.label
  }));

  if (!items.length) {
    c.innerHTML = '<div class="empty-state" style="padding:20px">Триггеры не настроены. Добавьте их в Настройках → «Триггеры Change Over».</div>';
    return;
  }

  c.innerHTML = '<div class="checkbox-group">' +
    items.map(m =>
      `<label><input type="checkbox" value="${escapeHtml(m.value)}" data-change> ${escapeHtml(m.label)}</label>`
    ).join('') + '</div>';

  c.querySelectorAll('input[data-change]').forEach(cb => {
    cb.addEventListener('change', (e) => {
      e.target.closest('label').classList.toggle('checked', e.target.checked);
      updateChecklist();
    });
  });
}
$('#brandFrom').addEventListener('change', () => {
  updateBrandToOptions();
  updateChecklist();
});

$('#brandTo').addEventListener('change', () => {
  updateChecklist();
});

function getSelectedTriggers() {
  const type = $('#transitionType').value;
  const triggers = [];

  // Триггеры «Что меняется» — только для Change Over
  if (type === 'ChangeOver') {
    $$('#changesContainer input[data-change]:checked').forEach(cb => {
      const val = cb.value;

      if (val === 'tobacco_materials') {
        triggers.push('tobacco');
        triggers.push('materials');
      } else {
        triggers.push(val);
      }
    });
  }
  return triggers;
}

/* ============================================================
   Показ стандарта в Change Over — логика «отличий точек»
   ============================================================ */

/**
 * Эффективный блок точек для бренда:
 * сначала блок конкретного бренда, иначе блок «Все бренды» (brand === '').
 * Возвращает null, если подходящего блока нет.
 */
function getEffectiveBrandBlock(blocks, brand) {
  if (!Array.isArray(blocks) || !blocks.length) return null;
  const exact = blocks.find(b =>
    b && b.brand === brand && Array.isArray(b.points) && b.points.length > 0
  );
  if (exact) return exact;
  const universal = blocks.find(b =>
    b && (b.brand === '' || b.brand == null) && Array.isArray(b.points) && b.points.length > 0
  );
  return universal || null;
}

/**
 * true, если наборы точек различаются (по числу точек или по значению хотя бы одной).
 */
function brandBlocksDiffer(blockA, blockB) {
  const pa = (blockA && Array.isArray(blockA.points))
    ? blockA.points.map(p => String((p && p.value) || '').trim())
    : [];
  const pb = (blockB && Array.isArray(blockB.points))
    ? blockB.points.map(p => String((p && p.value) || '').trim())
    : [];
  if (pa.length !== pb.length) return true;
  return pa.some((v, i) => v !== pb[i]);
}

/**
 * Проверка триггеров стандарта для Change Over.
 * Без триггеров — показывается; с триггерами — только при совпадении.
 */
function standardMatchesTriggers(st, selectedTriggers) {
  if (!st.triggers || !st.triggers.length) return true;
  return st.triggers.some(t => selectedTriggers.includes(t));
}

function updateChecklist() {
  const type = $('#transitionType').value;
  const line = $('#lineSelect').value;
  const part = $('#partSelect').value;
  const brandFrom = $('#brandFrom')?.value || '';

  const buildCard = $('#buildChecklistCard');
  const checklistCard = $('#checklistCard');

  // --- Если не заполнены основные поля — ничего не показываем ---
  const workshopId = line ? getWorkshopIdForLine(line) : null;
  const needsPart = workshopId === 'smd';
  if (!type || !line || (needsPart && !part)) {
    if (buildCard) buildCard.style.display = 'none';
    if (checklistCard) checklistCard.style.display = 'none';
    return;
  }

  const triggers = getSelectedTriggers();
  const all = getStandards();

  // Для Change Over нужен выбранный бренд «На бренд»
  let brandTo = '';
  if (type === 'ChangeOver') {
    brandTo = $('#brandTo').value;
    if (!brandTo) {
      if (buildCard) buildCard.style.display = 'none';
      if (checklistCard) checklistCard.style.display = 'none';
      return;
    }
  }

  const relevant = all.filter(st => {
    if (st.active === false) return false;
    if (!st.appliesTo || !st.appliesTo.includes(type)) return false;
    if (st.line !== line) return false;
    if (st.nodePart && st.nodePart !== part) return false;

    // --- Change Over: стандарт показываем, только если точки целевого
    //     бренда отличаются от точек исходного (либо технолог принудительно
    //     включил стандарт в проверку смены сорта) ---
    if (type === 'ChangeOver') {
      const blocks = Array.isArray(st.measurements) ? st.measurements : [];
      if (!blocks.length) return false;

      const blockFrom = getEffectiveBrandBlock(blocks, brandFrom);
      const blockTo = getEffectiveBrandBlock(blocks, brandTo);

      // Нет релевантного блока для целевого бренда — не показываем
      if (!blockTo) return false;

      // Если технолог НЕ принудительно указал стандарт — показываем только
      // при отличии точек целевого бренда от исходного.
      if (st.forceInChangeOver !== true) {
        // Блок исходного бренда не задан (и нет «Все бренды») — стандарт
        // специфичен для целевого бренда, показываем. Иначе требуем отличие.
        if (blockFrom && !brandBlocksDiffer(blockFrom, blockTo)) {
          return false;
        }
      }

      return standardMatchesTriggers(st, triggers);
    }

    // --- CL_TO / CL_Conversion: триггеры не проверяем ---
    return true;
  });

  // --- Показываем «Сформировать проверку», скрываем чек-лист ---
  if (relevant.length > 0) {
    if (buildCard) buildCard.style.display = 'block';
    if (checklistCard) checklistCard.style.display = 'none';
  } else {
    if (buildCard) buildCard.style.display = 'none';
    if (checklistCard) checklistCard.style.display = 'none';
  }

  renderChecklist(relevant);
}

function renderChecklist(items) {
  const c = $('#checklistContainer');
  if (!items.length) {
    c.innerHTML = '<div class="empty-state">Нет стандартов для выбранных условий.<br>Добавьте их во вкладке «Редактор стандартов».</div>';
    updateProgress();
    return;
  }

  const type = $('#transitionType').value;
  const brandTo = (type === 'ChangeOver') ? $('#brandTo').value : '';

  // Найдём первый непроверенный — его раскроем автоматически
  let firstUncheckedId = null;

  // Собираем HTML
  const html = items.map(st => {
    const isFirstUnchecked = (firstUncheckedId === null);
    if (isFirstUnchecked) firstUncheckedId = st.id;

    // --- Выбираем блок точек для отображения ---
    const blocks = Array.isArray(st.measurements) ? st.measurements : [];
    let selectedBlock = null;

    if (type === 'ChangeOver' && brandTo) {
      selectedBlock = getEffectiveBrandBlock(blocks, brandTo);
    } else {
      selectedBlock = blocks[0] || null;
    }

    const visiblePoints = selectedBlock ? selectedBlock.points : [];

    // Сетка точек (для типов с точками: variable / interval / fixed с точками)
    let pointsHtml = '';
    if (selectedBlock && visiblePoints.length) {
      const cells = visiblePoints.map((m, i) => {
        const norm = parseNorm(m.value);
        const normData = norm ? JSON.stringify(norm).replace(/"/g, '&quot;') : '';
        return `
          <div class="checklist-point-cell"
               data-point-index="${i}"
               data-norm='${normData}'>
            <div class="checklist-point-cell-head">
              <span class="checklist-point-status" data-point-status="${i}"></span>
              <span class="checklist-point-num">${i + 1}</span>
              <span class="checklist-point-norm" title="${escapeAttr(m.value || '')}">${escapeHtml(m.value || '—')}</span>
            </div>
            <div class="checklist-point-cell-body">
              <input type="number" step="any" class="checklist-point-input"
                     data-point-input="${i}" placeholder="0">
            </div>
          </div>
        `;
      }).join('');

      pointsHtml = `
        <div class="checklist-points">
          <div class="checklist-points-header">
            <span class="checklist-point-brand-badge">
              ${escapeHtml(selectedBlock.brand || 'Все бренды')}
            </span>
            <span class="checklist-points-hint">Все точки должны быть в норме</span>
          </div>
          <div class="checklist-points-grid">${cells}</div>
        </div>
      `;
    }

    // Ответ (ОК/Не ОК) — только для Фиксированного без точек
    let answerHtml = '';
    if (st.controlType === 'fixed' && !visiblePoints.length) {
      answerHtml = `
        <div class="radio-group">
          <label><input type="radio" name="ans_${st.id}" value="OK" data-ans> ОК</label>
          <label><input type="radio" name="ans_${st.id}" value="FAIL" data-ans> Не ОК</label>
        </div>`;
    }

    // Компактная строка в свёрнутом виде
    const compactMeta = [
      st.oplNumber ? `OPL: ${escapeHtml(st.oplNumber)}` : '',
      st.machine ? `Машина: ${escapeHtml(st.machine)}` : '',
      st.nodePart ? escapeHtml(st.nodePart) : ''
    ].filter(Boolean).join(' · ');

    // Если пользователь оставил комментарий — нарисуем иконку 💬
    // (проверим по data-comment, при перерисовке может быть уже установлен)
    const hasComment = false; // пока нет — установится после ручного комментария

    return `
      <div class="cocl-acc-item" data-std-id="${st.id}" data-expanded="false">
        <div class="cocl-acc-header" data-acc-toggle>
          <span class="cocl-status-dot" data-acc-status="unchecked"></span>
          <div class="cocl-acc-title-wrap">
            <div class="cocl-acc-title">${escapeHtml(st.title || '—')}</div>
            <div class="cocl-acc-meta">${compactMeta}</div>
          </div>

          <button type="button" class="cocl-acc-comment-btn" data-comment-btn title="Добавить комментарий">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              <line x1="9" y1="10" x2="15" y2="10"/>
              <line x1="9" y1="14" x2="13" y2="14"/>
            </svg>
          </button>

          <button type="button" class="cocl-acc-view-btn" data-view-btn data-std-id="${escapeAttr(st.id)}" title="Посмотреть стандарт">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
          </button>

          <span class="cocl-acc-caret">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </span>
        </div>

        <div class="cocl-acc-body">
          ${pointsHtml}
          ${answerHtml ? `<div class="cocl-acc-answer">${answerHtml}</div>` : ''}

          <div class="comment-preview" style="display:none" data-comment-preview></div>
        </div>
      </div>
    `;
  }).join('');

  c.innerHTML = html;

  // Раскрываем первый непроверенный
  if (firstUncheckedId) {
    const firstItem = c.querySelector(`.cocl-acc-item[data-std-id="${firstUncheckedId}"]`);
    if (firstItem) expandCoclItem(firstItem, true);
  }

  // Привязываем обработчики
  bindCoclAccordionEvents();
  updateProgress();
}

/* ============================================================
   COCL: аккордеон — обработчики
   ============================================================ */

function expandCoclItem(item, silent) {
  item.dataset.expanded = 'true';
  item.classList.add('expanded');
  const caret = item.querySelector('.cocl-acc-caret');
  if (caret) caret.style.transform = 'rotate(90deg)';
}

function collapseCoclItem(item) {
  item.dataset.expanded = 'false';
  item.classList.remove('expanded');
  const caret = item.querySelector('.cocl-acc-caret');
  if (caret) caret.style.transform = 'rotate(0deg)';
}

function bindCoclAccordionEvents() {
  const c = $('#checklistContainer');
  if (!c) return;

  // --- Клик по шапке — раскрыть/свернуть ---
  c.querySelectorAll('[data-acc-toggle]').forEach(head => {
    head.addEventListener('click', (e) => {
      // Игнорируем клики по кнопкам внутри шапки
      if (e.target.closest('[data-view-btn]')) return;
      if (e.target.closest('.cocl-acc-comment-icon')) return;

      const item = head.closest('.cocl-acc-item');
      if (!item) return;

      const isExpanded = item.dataset.expanded === 'true';
      if (isExpanded) {
        collapseCoclItem(item);
      } else {
        expandCoclItem(item);
      }
    });
  });

  // --- Глазик — просмотр стандарта ---
  c.querySelectorAll('[data-view-btn]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const stdId = btn.dataset.stdId;
      if (stdId && typeof openStandardView === 'function') openStandardView(stdId);
    });
  });

  // --- Radio ОК / Не ОК ---
  c.querySelectorAll('input[data-ans]').forEach(r => {
    r.addEventListener('change', (e) => {
      const item = e.target.closest('.cocl-acc-item');
      const val = e.target.value;
      updateCoclItemStatus(item, val === 'OK' ? 'ok' : 'fail');
      updateProgress();
    });
  });

  // --- Поля ввода значений (для value_input / range_input) ---
  c.querySelectorAll('.checklist-point-input').forEach(inp => {
    inp.addEventListener('input', (e) => {
      const cell = e.target.closest('.checklist-point-cell');
      const statusEl = cell.querySelector('[data-point-status]');
      const normStr = cell.dataset.norm;
      const item = cell.closest('.cocl-acc-item');

      // Сброс
      cell.classList.remove('point-ok', 'point-fail');
      if (statusEl) {
        statusEl.textContent = '';
        statusEl.className = 'checklist-point-status';
      }

      if (e.target.value === '') {
        updateCoclItemStatusFromPoints(item);
        updateProgress();
        return;
      }

      const val = parseFloat(e.target.value);
      if (isNaN(val)) {
        updateCoclItemStatusFromPoints(item);
        updateProgress();
        return;
      }

      // Проверка по норме
      if (normStr) {
        let norm = null;
        try { norm = JSON.parse(normStr); } catch(_) {}

        if (norm && typeof norm.min === 'number' && typeof norm.max === 'number') {
          const inRange = val >= norm.min && val <= norm.max;
          cell.classList.add(inRange ? 'point-ok' : 'point-fail');
          if (statusEl) {
            statusEl.textContent = inRange ? '✓' : '✕';
            statusEl.className = 'checklist-point-status ' + (inRange ? 'ok' : 'fail');
          }
        }
      }

      updateCoclItemStatusFromPoints(item);
      updateProgress();
    });
  });

  // --- Кнопка комментария ---
  c.querySelectorAll('[data-comment-btn]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const item = btn.closest('.cocl-acc-item');
      openCommentModal(item);
    });
  });
}

/** Обновить статус свёрнутой строки по явному ответу (radio ОК/Не ОК) */
function updateCoclItemStatus(item, status) {
  item.dataset.status = status;

  const dot = item.querySelector('[data-acc-status]');
  if (dot) {
    dot.classList.remove('cocl-status-unchecked', 'cocl-status-ok', 'cocl-status-fail');
    dot.classList.add(status === 'ok' ? 'cocl-status-ok' : 'cocl-status-fail');
    dot.dataset.accStatus = status;
  }
}

/** Обновить статус свёрнутой строки по точкам (value_input / range_input) */
function updateCoclItemStatusFromPoints(item) {
  const cells = item.querySelectorAll('.checklist-point-cell');
  if (!cells.length) return;

  let allFilled = true;
  let anyFail = false;

  cells.forEach(cell => {
    const inp = cell.querySelector('.checklist-point-input');
    if (!inp || inp.value === '') { allFilled = false; return; }
    if (cell.classList.contains('point-fail')) anyFail = true;
  });

  if (!allFilled) {
    // Пока не всё заполнено — оставляем "не проверено"
    item.dataset.status = 'unchecked';
    const dot = item.querySelector('[data-acc-status]');
    if (dot) {
      dot.classList.remove('cocl-status-ok', 'cocl-status-fail');
      dot.classList.add('cocl-status-unchecked');
      dot.dataset.accStatus = 'unchecked';
    }
    return;
  }

  // Все заполнены — итог
  updateCoclItemStatus(item, anyFail ? 'fail' : 'ok');
}

function updateProgress() {
  const items = $$('#checklistContainer .cocl-acc-item');
  const wrap = $('#progressWrap');
  const bar = $('#progressBarInner');
  const percent = $('#progressPercent');
  const text = $('#progressText');
  const badge = $('#progressBadge');

  if (!items.length) {
    badge.textContent = '';
    badge.className = 'progress-badge';
    wrap.style.display = 'none';
    text.style.display = 'none';
    return;
  }

  let filled = 0;
  let oks = 0;
  let fails = 0;

  items.forEach(item => {
    const status = item.dataset.status;
    if (status === 'ok') { filled++; oks++; }
    else if (status === 'fail') { filled++; fails++; }
  });

  const total = items.length;
  const pct = total > 0 ? Math.round((filled / total) * 100) : 0;

  wrap.style.display = 'flex';
  text.style.display = 'block';

  bar.style.width = pct + '%';
  bar.classList.remove('low', 'mid', 'high', 'done');
  if (pct === 100)      bar.classList.add('done');
  else if (pct >= 67)   bar.classList.add('high');
  else if (pct >= 34)   bar.classList.add('mid');
  else                  bar.classList.add('low');

  percent.textContent = pct + '%';

  // Текст с деталями
  const parts = [`Проверено ${filled} из ${total}`];
  if (oks > 0) parts.push(`ОК: ${oks}`);
  if (fails > 0) parts.push(`Не ОК: ${fails}`);
  text.textContent = parts.join(' · ');

  badge.textContent = `Проверено ${filled} из ${total}`;
  badge.className = 'progress-badge' + (filled === total ? ' complete' : '');
}

function updateCommentUrgency(item) {
  const btn = item.querySelector('[data-comment-btn]');
  if (!btn) return;
  const failRadio = item.querySelector('input[data-ans]:checked[value="FAIL"]')
                 || item.querySelector('input[data-tol]:checked[value="FAIL"]');
  const hasComment = item.dataset.comment && item.dataset.comment.trim() !== '';
  if (failRadio && !hasComment) {
    btn.classList.add('urgent');
  } else {
    btn.classList.remove('urgent');
  }
}

/* ============================================================
   МОДАЛЬНОЕ ОКНО КОММЕНТАРИЯ
   ============================================================ */
let currentCommentItem = null;

function openCommentModal(item) {
  currentCommentItem = item;
  const std = getStandards().find(s => s.id === item.dataset.stdId);
  $('#commentModalPoint').textContent = std
    ? `№${std.number || '—'} · ${std.oplNumber || ''} — ${std.title || ''}`
    : '';
  const existing = item.dataset.comment || '';
  $('#commentText').value = existing;
  openModal('#commentModal');
  setTimeout(() => $('#commentText').focus(), 100);
}
/* ============================================================
   ПРОСМОТР СТАНДАРТА — полноценная модалка
   ============================================================ */

/* Определить блок (Cell2 LST 1/2) по линии */
function getBlockNameForLine(line) {
  const blocks = getBlocks();
  const block = blocks.find(b => Array.isArray(b.lines) && b.lines.includes(line));
  return block ? block.name : '';
}

/* Текст типа контроля для отображения */
function controlTypeLabel(type) {
  switch (type) {
    case 'ok_not_ok':    return 'Фиксированный (ОК/Не ОК)';
    case 'value_input':  return 'Вариабельный (значение ± допуск)';
    case 'range_input':  return 'Контролируемый интервал';
    case 'tolerance':    return 'В допуске / Не в допуске';
    case 'fixed':        return 'Фиксированный';
    case 'variable':     return 'Вариабельный';
    case 'interval':     return 'Контролируемый интервал';
    default:             return '—';
  }
}

/* Формат даты для отображения */
function formatDateTime(iso) {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '—';
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, '0');
    const mi = String(d.getMinutes()).padStart(2, '0');
    return `${dd}.${mm}.${yyyy} ${hh}:${mi}`;
  } catch {
    return '—';
  }
}

window.openStandardView = function(stdId) {
  const st = getStandards().find(s => s.id === stdId);
  if (!st) return showToast('Стандарт не найден', true);

  const modal = $('#standardViewModal');
  const body = $('#standardViewBody');
  const title = $('#standardViewTitle');
  const chipsEl = $('#standardViewChips');
  if (!modal || !body) return;

  // Заголовок модалки
  if (title) title.textContent = 'Просмотр стандарта · ' + (st.oplNumber || '—');

  // Чипы в шапке
  if (chipsEl) {
    chipsEl.innerHTML = renderStandardViewHeaderChips(st);
  }

  // Тело модалки (без чипов)
  body.innerHTML = renderStandardViewContent(st);

  // Навешиваем обработчики на превью фото (открытие лайтбокса)
  body.querySelectorAll('[data-photo-idx]').forEach(el => {
    el.addEventListener('click', () => {
      const idx = parseInt(el.dataset.photoIdx, 10);
      openLightbox(st, idx);
    });
  });

  openModal(modal);
};

/* Отрисовать чипы для шапки модалки просмотра стандарта */
function renderStandardViewHeaderChips(st) {
  const blockName = getBlockNameForLine(st.line) || '';
  const ceh = 'SMD';

  const chips = [];
  if (ceh) chips.push(`<span class="sv-chip sv-chip-cyan">${escapeHtml(ceh)}</span>`);
  if (blockName) chips.push(`<span class="sv-chip sv-chip-cyan">${escapeHtml(blockName)}</span>`);
  if (st.line) chips.push(`<span class="sv-chip sv-chip-cyan">${escapeHtml(st.line)}</span>`);
  if (st.nodePart) chips.push(`<span class="sv-chip sv-chip-purple">${escapeHtml(st.nodePart)}</span>`);
  if (st.machine) chips.push(`<span class="sv-chip sv-chip-amber">${escapeHtml(st.machine)}</span>`);

  return chips.join('');
}

/* Сформировать HTML содержимого модалки */
function renderStandardViewContent(st) {
  const blockName = getBlockNameForLine(st.line) || '';
  const ceh = 'SMD';

  // ----- Левая колонка: основное -----

  const htmlSection = (label, value) => {
    const isEmpty = !value || !String(value).trim();
    return `
      <div class="sv-section">
        <div class="sv-section-title">${escapeHtml(label)}</div>
        <div class="sv-section-text ${isEmpty ? 'sv-empty' : ''}">${isEmpty ? 'Не указано' : escapeHtml(value)}</div>
      </div>
    `;
  };

  // Точки замера — по брендам (таблицей, как в редакторе стандарта)
  const blocks = Array.isArray(st.measurements) ? st.measurements : [];
  const pointsHtml = blocks.length ? `
    <div class="sv-section">
      <div class="sv-section-title">Точки замера по брендам</div>
      ${renderReadonlyBrandsTable(blocks)}
    </div>
  ` : '';

  // Тип контроля
  const controlTypeHtml = st.controlType ? `
    <div class="sv-section">
      <div class="sv-section-title">Тип контроля</div>
      <div class="sv-control-type">${escapeHtml(controlTypeLabel(st.controlType))}</div>
    </div>
  ` : '';

  const mainHtml = `
    <div class="sv-title">${escapeHtml(st.title || '—')}</div>
    ${htmlSection('Описание контроля', st.controlDescription)}
    ${pointsHtml}
    ${htmlSection('Описание проблемы', st.problemDescription)}
    ${htmlSection('Цель', st.purpose)}
    ${htmlSection('Почему создан', st.whyCreated)}
  `;

  // ----- Правая колонка: фото + связанные объекты -----
  const photos = Array.isArray(st.photos) ? st.photos : [];

  const photosCardHtml = photos.length ? `
    <div class="sv-side-card">
      <div class="sv-side-card-title">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
          <circle cx="8.5" cy="8.5" r="1.5"/>
          <polyline points="21 15 16 10 5 21"/>
        </svg>
        Фотографии
      </div>
      <div class="sv-photos-mini">
        ${photos.map((name, idx) => {
          const path = getPhotoPath(st, name);
          return `
            <div class="sv-photo-mini" data-photo-idx="${idx}" title="${escapeAttr(name)}">
              <img src="${escapeAttr(path)}" alt="${escapeAttr(name)}"
                   onerror="this.style.display='none';this.nextElementSibling.style.display='flex';">
              <div class="photo-missing" style="display:none">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  ` : '';

  const sideRow = (label, value) => {
    const isEmpty = !value || !String(value).trim();
    return `
      <div class="sv-side-row">
        <span class="sv-side-label">${escapeHtml(label)}</span>
        <span class="sv-side-value ${isEmpty ? 'sv-empty' : ''}">${isEmpty ? '—' : escapeHtml(value)}</span>
      </div>
    `;
  };

  const sideHtml = `
    ${photosCardHtml}
    <div class="sv-side-card">
      <div class="sv-side-card-title">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
        </svg>
        Связанные объекты
      </div>
      ${sideRow('Цех', ceh)}
      ${sideRow('Участок', blockName)}
      ${sideRow('Линия', st.line)}
      ${sideRow('Рабочий центр', st.nodePart)}
      ${sideRow('Машина', st.machine)}
      ${sideRow('Узел', st.node)}
      ${sideRow('OPL №', st.oplNumber)}
    </div>
    <div class="sv-side-card">
      <div class="sv-side-card-title">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <polyline points="12 6 12 12 16 14"/>
        </svg>
        История
      </div>
      ${sideRow('Автор', st.author || '')}
      ${sideRow('Дата создания', formatDateTime(st.createdAt))}
      ${sideRow('Последнее обновление', formatDateTime(st.updatedAt))}
    </div>
  `;

  return `
    <div class="sv-layout">
      <div class="sv-main">${mainHtml}</div>
      <div class="sv-side">${sideHtml}</div>
    </div>
  `;
}

/* Закрыть модалку просмотра */
function closeStandardView() {
  closeModal('#standardViewModal');
}

/* --- Обработчики модалки просмотра --- */
$('#standardViewClose')?.addEventListener('click', closeStandardView);
$('#standardViewCloseBtn')?.addEventListener('click', closeStandardView);
$('#standardViewModal')?.addEventListener('click', (e) => {
  if (e.target.id === 'standardViewModal') closeStandardView();
});

/* ============================================================
   ЛАЙТБОКС — просмотр фото
   ============================================================ */

let lightboxState = {
  photos: [],   // массив имён
  standard: null,
  index: 0
};

window.openLightbox = function(standard, startIndex) {
  const photos = Array.isArray(standard.photos) ? standard.photos : [];
  if (!photos.length) return;

  lightboxState.standard = standard;
  lightboxState.photos = photos;
  lightboxState.index = Math.max(0, Math.min(startIndex || 0, photos.length - 1));

  const modal = $('#lightboxModal');
  if (!modal) return;

  updateLightbox();
  openModal(modal);
  modal.style.zIndex = '9999';   // поверх любых модалок
  document.addEventListener('keydown', lightboxKeyHandler);
};

function updateLightbox() {
  const { photos, standard, index } = lightboxState;
  const img = $('#lightboxImage');
  const nameEl = $('#lightboxName');
  const counterEl = $('#lightboxCounter');
  const prevBtn = $('#lightboxPrev');
  const nextBtn = $('#lightboxNext');

  if (!img || !photos.length) return;

  const fileName = photos[index];
  const path = getPhotoPath(standard, fileName);

  img.src = path;
  img.alt = fileName;
  if (nameEl) nameEl.textContent = fileName;
  if (counterEl) counterEl.textContent = `${index + 1} / ${photos.length}`;

  // Кнопки навигации
  const single = photos.length <= 1;
  if (prevBtn) prevBtn.disabled = single;
  if (nextBtn) nextBtn.disabled = single;
}

function lightboxPrev() {
  const { photos, index } = lightboxState;
  if (photos.length <= 1) return;
  lightboxState.index = (index - 1 + photos.length) % photos.length;
  updateLightbox();
}

function lightboxNext() {
  const { photos, index } = lightboxState;
  if (photos.length <= 1) return;
  lightboxState.index = (index + 1) % photos.length;
  updateLightbox();
}

function closeLightbox() {
  closeModal('#lightboxModal');
  document.removeEventListener('keydown', lightboxKeyHandler);
  const img = $('#lightboxImage');
  if (img) img.src = '';
}

function lightboxKeyHandler(e) {
  if (e.key === 'Escape')      { e.preventDefault(); closeLightbox(); }
  else if (e.key === 'ArrowLeft')  { e.preventDefault(); lightboxPrev(); }
  else if (e.key === 'ArrowRight') { e.preventDefault(); lightboxNext(); }
}

/* --- Обработчики лайтбокса --- */
$('#lightboxClose')?.addEventListener('click', closeLightbox);
$('#lightboxPrev')?.addEventListener('click', lightboxPrev);
$('#lightboxNext')?.addEventListener('click', lightboxNext);
$('#lightboxModal')?.addEventListener('click', (e) => {
  // Закрываем только если клик по фону (не по контенту и не по кнопкам)
  if (e.target.id === 'lightboxModal') closeLightbox();
});

function closeCommentModal() {
  closeModal('#commentModal');
  currentCommentItem = null;
}

$('#commentModalClose').addEventListener('click', closeCommentModal);
$('#commentCancelBtn').addEventListener('click', closeCommentModal);
$('#commentModal').addEventListener('click', (e) => {
  if (e.target.id === 'commentModal') closeCommentModal();
});

$('#commentSaveBtn').addEventListener('click', () => {
  if (!currentCommentItem) return;
  const text = $('#commentText').value.trim();
  currentCommentItem.dataset.comment = text;
  const preview = currentCommentItem.querySelector('[data-comment-preview]');
  const btn = currentCommentItem.querySelector('[data-comment-btn]');

  if (text) {
    preview.textContent = '💬 ' + text;
    preview.style.display = 'block';
    btn.classList.add('has-comment');
  } else {
    preview.style.display = 'none';
    btn.classList.remove('has-comment');
  }
  updateCommentUrgency(currentCommentItem);
  closeCommentModal();
});

/* ============================================================
   СОХРАНЕНИЕ ПРОВЕРКИ
   ============================================================ */
$('#saveCheckBtn').addEventListener('click', () => {
  const line = $('#lineSelect').value;
  const part = $('#partSelect').value;
  const type = $('#transitionType').value;
  const brandFrom = $('#brandFrom').value;
  const brandTo = $('#brandTo').value;

  // ФИО и смена подставляются автоматически (автовход + смена из настроек)
  const period = getCurrentShiftPeriod();
  const operator = getCurrentUser();
  const shift = (getShiftsForDate(period.date) || {})[period.shiftType] || '—';

if (!line) return showToast('Укажите линию', true);
if (getWorkshopIdForLine(line) === 'smd' && !part) return showToast('Укажите часть линии', true);
if (!type) return showToast('Укажите тип перехода', true);

/* Бренды обязательны ТОЛЬКО для Change Over */
if (type === 'ChangeOver') {
  if (!brandFrom || !brandTo) return showToast('Укажите бренды', true);
  if (brandFrom === brandTo) {
    return showToast(`Бренд должен измениться: нельзя ${brandFrom} → ${brandTo}`, true);
  }
}

  const items = [];
  let hasEmpty = false;

  $$('#checklistContainer .cocl-acc-item').forEach(item => {
    const id = item.dataset.stdId;
    const st = getStandards().find(s => s.id === id);
    if (!st) return;

    let answer = '—';
    let status = 'UNCHECKED';

    const hasPoints = Array.isArray(st.measurements) &&
      st.measurements.some(b => b && Array.isArray(b.points) && b.points.length > 0);

    if (st.controlType === 'fixed' && !hasPoints) {
      const r = item.querySelector('input[data-ans]:checked');
      if (!r) { hasEmpty = true; return; }
      answer = r.value === 'OK' ? 'ОК' : 'Не ОК';
      status = r.value;

    } else {
      const cells = item.querySelectorAll('.checklist-point-cell');
      if (!cells.length) { hasEmpty = true; return; }

      const pointsData = [];
      let allFilled = true;
      let anyFail = false;

      cells.forEach(cell => {
        const inp = cell.querySelector('.checklist-point-input');
        const val = inp?.value.trim() || '';
        if (val === '') { allFilled = false; return; }

        const num = parseFloat(val);
        const normStr = cell.dataset.norm;
        let inRange = null;
        let norm = null;
        try { norm = normStr ? JSON.parse(normStr) : null; } catch(_) {}

        if (norm && !isNaN(num)) {
          inRange = num >= norm.min && num <= norm.max;
          if (!inRange) anyFail = true;
        }

        pointsData.push({ value: num, norm, inRange });
      });

      if (!allFilled) { hasEmpty = true; return; }

      status = anyFail ? 'FAIL' : 'OK';
      answer = pointsData.map(p => p.value).join(', ');
    }

    // Главное значение — первая точка первого блока
    const firstBlock = Array.isArray(st.measurements) && st.measurements[0];
    const mainValue = firstBlock && Array.isArray(firstBlock.points) && firstBlock.points[0]
      ? firstBlock.points[0].value || ''
      : '';

    items.push({
      standardId: st.id,
      number: st.number,
      oplNumber: st.oplNumber,
      machine: st.machine,
      node: st.node,
      nodePart: st.nodePart,
      title: st.title,
      controlType: st.controlType,
      norm: mainValue,
      answer: answer,
      status: status,
      comment: item.dataset.comment || ''
    });
  });

  if (hasEmpty) {
    return showToast('Заполните все пункты чек-листа', true);
  }

  const triggers = getSelectedTriggers();
  const record = {
    id: uid(),
    timestamp: new Date().toISOString(),
    operator, shift, line, part, type, brandFrom, brandTo,
    // Дата и тип смены определяются автоматически (ночь 21:00→09:00
    // относится к дате её начала — см. getCurrentShiftPeriod)
    date: period.date,
    shiftType: period.shiftType,
    triggers,
    items
  };

  const hist = getHistory();
  hist.push(record);
  setHistory(hist);
  updateNavHistoryCounter();

  showToast('Проверка сохранена');
  renderCoclSummary(record);
});

$('#resetCheckBtn').addEventListener('click', resetCheckForm);

function resetCheckForm() {
  // Сброс полей
  $('#lineSelect').value = '';
  clearCoclLine();
  $('#partSelect').value = '';
  $('#transitionType').value = '';
  document.querySelectorAll('.type-option').forEach(b => b.classList.remove('active'));
  $('#brandFrom').value = '';
  $('#brandTo').value = '';

  // Сброс внутренностей
  $('#checklistContainer').innerHTML = '';
  $('#changesContainer').innerHTML = '';

  // Сброс прогресса
  $('#progressBadge').textContent = '';
  $('#progressWrap').style.display = 'none';
  $('#progressText').style.display = 'none';
  $('#progressBarInner').style.width = '0%';
  $('#progressPercent').textContent = '0%';

  // Скрыть экран резюме
  const summary = $('#coclSummaryView');
  if (summary) summary.style.display = 'none';

  // ⚠ ГЛАВНОЕ: восстановить все карточки настройки в #tab-check
  document.querySelectorAll('#tab-check > .card').forEach(card => {
    const id = card.id;
    // Показываем все основные карточки (1. Оператор, 2. Линия, 3. Тип)
    if (!id) {
      card.style.display = '';
    } else if (id === 'brandsCard' || id === 'changesCard' ||
               id === 'buildChecklistCard' || id === 'checklistCard') {
      // Эти скрыты, пока не выбран тип/бренды
      card.style.display = 'none';
    } else {
      card.style.display = '';
    }
  });
}

/* ============================================================
   ВКЛАДКА ИСТОРИЯ
   ============================================================ */
$('#periodSelect').addEventListener('change', () => {
  const v = $('#periodSelect').value;
  $('#dateFromField').style.display = (v === 'custom') ? 'block' : 'none';
  $('#dateToField').style.display = (v === 'custom') ? 'block' : 'none';
  // Период тоже влияет на список — сбрасываем страницу
  historyPage = 1;
  renderHistory();
});

/* При смене любого фильтра — сбрасываем на первую страницу */
const resetHistoryPageAndRender = () => {
  historyPage = 1;
  renderHistory();
};

$('#applyFilterBtn').addEventListener('click', resetHistoryPageAndRender);
$('#filterLine').addEventListener('change', resetHistoryPageAndRender);
$('#filterType').addEventListener('change', resetHistoryPageAndRender);
$('#filterMode')?.addEventListener('change', resetHistoryPageAndRender);

function fillHistoryFilters() {
  const lineFilter = $('#filterLine');
  lineFilter.innerHTML = '<option value="">Все</option>' +
    getLines().map(l => `<option>${escapeHtml(l)}</option>`).join('');
}

function getFilteredHistory() {
  let hist = getHistory();
  const period = $('#periodSelect').value;
  const line = $('#filterLine').value;
  const type = $('#filterType').value;
  const mode = $('#filterMode')?.value || '';
  const now = new Date();

  if (period === 'week') {
    const from = new Date(now.getTime() - 7*24*3600*1000);
    hist = hist.filter(h => new Date(h.timestamp) >= from);
  } else if (period === 'month') {
    const from = new Date(now.getTime() - 30*24*3600*1000);
    hist = hist.filter(h => new Date(h.timestamp) >= from);
  } else if (period === 'custom') {
    const df = $('#dateFrom').value;
    const dt = $('#dateTo').value;
    if (df) {
      const from = new Date(df + 'T00:00:00');
      hist = hist.filter(h => new Date(h.timestamp) >= from);
    }
    if (dt) {
      const to = new Date(dt + 'T23:59:59');
      hist = hist.filter(h => new Date(h.timestamp) <= to);
    }
  }

  if (line) hist = hist.filter(h => h.line === line);
  if (type) hist = hist.filter(h => h.type === type);

  // Фильтр по режиму
  if (mode === 'changeover') {
    // COCL = всё, где mode НЕ 'toploss' и НЕ 'electronic'
    hist = hist.filter(h => h.mode !== 'toploss' && h.mode !== 'electronic');
  } else if (mode === 'toploss') {
    hist = hist.filter(h => h.mode === 'toploss');
  } else if (mode === 'electronic') {
    hist = hist.filter(h => h.mode === 'electronic');
  }

  return hist.sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));
}

/* ============================================================
   ИСТОРИЯ: вспомогательные для CL-режимов
   ============================================================ */

/* Текстовое имя режима записи истории */
function getHistoryModeText(h) {
  if (h.mode === 'toploss') return 'TOP Losses';
  if (h.mode === 'electronic') return 'CL Electronic';
  if (h.mode === 'cl') return 'CL (мех)';
  return 'COCL';
}

/* Смена CL-записи в человекочитаемом виде: «День · A» / «Ночь · B».
   Для CL-записей h.shift хранит букву бригады (A/B/C/D), h.date — дату.
   День/ночь восстанавливается по графику смен.
   Для обычных записей возвращает h.shift как есть (или '—' при пустом). */
function formatClShift(h) {
  const letter = String(h.shift || '').trim();
  if (/^[A-D]$/.test(letter) && h.date) {
    const shifts = getShiftsForDate(h.date);
    if (shifts.day === letter) return 'День · ' + letter;
    if (shifts.night === letter) return 'Ночь · ' + letter;
  }
  return h.shift || '—';
}

function renderHistory() {
  const hist = getFilteredHistory();
  $('#historyCount').textContent = hist.length;

  const list = $('#historyList');
  if (!hist.length) {
    list.innerHTML = '<div class="empty-state">Записей нет</div>';
    // Очищаем пагинацию
    const pag = $('#historyPagination');
    if (pag) pag.innerHTML = '';
    return;
  }

  // --- Пагинация ---
  const totalPages = Math.ceil(hist.length / historyPageSize);
  if (historyPage > totalPages) historyPage = totalPages;
  if (historyPage < 1) historyPage = 1;

  const startIdx = (historyPage - 1) * historyPageSize;
  const endIdx = Math.min(startIdx + historyPageSize, hist.length);
  const pageItems = hist.slice(startIdx, endIdx);

  // --- Таблица ---
  list.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Дата/время</th>
          <th>Режим</th>
          <th>Оператор</th>
          <th>Смена</th>
          <th>Линия</th>
          <th>Контекст</th>
          <th>Пунктов</th>
          <th>Не ОК</th>
          <th>Не проверено</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        ${pageItems.map(h => {
          const fails = h.items.filter(i => i.status === 'FAIL').length;
          const unchecked = h.items.filter(i => i.status === 'UNCHECKED').length;
          const isTopLoss = h.mode === 'toploss';
          const isCl = h.mode === 'cl' || h.mode === 'electronic';
          const isElec = h.mode === 'electronic';

          // --- Контекст ---
          let contextHtml = '—';
          if (isTopLoss) {
            const names = (h.topLosses || [])
              .map(id => findLossById(id))
              .filter(Boolean)
              .map(l => l.name);
            contextHtml = names.length
              ? `<span class="tl-history-losses">${names.map(escapeHtml).join(' · ')}</span>`
              : '—';
          } else if (isCl) {
            const brandBadge = `<span class="badge ${isElec ? 'badge-mode-electronic' : 'badge-mode-cl'}">${escapeHtml(h.brandActual || '—')}</span>`;
            const planNote = (h.brandPlanned && h.brandPlanned !== h.brandActual)
              ? ` <span style="font-size:11px;color:var(--accent-amber);font-style:italic">(план: ${escapeHtml(h.brandPlanned)})</span>`
              : '';
            contextHtml = brandBadge + planNote;
          } else {
            const badgeCls = h.type === 'ChangeOver' ? 'badge-changeover' :
                            h.type === 'CL_TO' ? 'badge-clto' :
                            h.type === 'CL_Conversion' ? 'badge-clconv' : 'badge-mode-cocl';
            contextHtml = `
              <span class="badge ${badgeCls}">${escapeHtml(h.type || '—')}</span>
              <span class="history-brands">${escapeHtml(h.brandFrom || '—')} → ${escapeHtml(h.brandTo || '—')}</span>
            `;
          }

          // --- Бейдж режима ---
          let modeBadge;
          if (isTopLoss) {
            modeBadge = `<span class="badge badge-mode-toploss">TOP</span>`;
          } else if (h.mode === 'cl') {
            modeBadge = `<span class="badge badge-mode-cl">CL</span>`;
          } else if (isElec) {
            modeBadge = `<span class="badge badge-mode-electronic">E-PARAM</span>`;
          } else {
            // COCL — зависит от типа
            const type = h.type || '';
            if (type === 'ChangeOver') {
              modeBadge = `<span class="badge badge-changeover">CHANGE OVER</span>`;
            } else if (type === 'CL_TO') {
              modeBadge = `<span class="badge badge-clto">CL В ТО</span>`;
            } else if (type === 'CL_Conversion') {
              modeBadge = `<span class="badge badge-clconv">CL В КОНВЕРТ.</span>`;
            } else {
              modeBadge = `<span class="badge badge-mode-cocl">COCL</span>`;
            }
          }

          // --- Колонка «Не проверено» ---
          const uncheckedHtml = unchecked > 0
            ? `<span class="badge badge-unchecked">${unchecked}</span>`
            : ((isTopLoss || isCl) ? '<span class="badge badge-ok">0</span>' : '—');

          return `
            <tr>
              <td>${fmtDate(h.timestamp)}</td>
              <td>${modeBadge}</td>
              <td>${escapeHtml(h.operator)}</td>
              <td>${escapeHtml(formatClShift(h))}</td>
              <td>${escapeHtml(h.line)}</td>
              <td>${contextHtml}</td>
              <td>${h.items.length}</td>
              <td>${fails ? `<span class="badge badge-fail">${fails}</span>` : '<span class="badge badge-ok">0</span>'}</td>
              <td>${uncheckedHtml}</td>
              <td><button class="btn btn-secondary btn-sm" onclick="viewRecord('${h.id}')">Открыть</button></td>
            </tr>`;
        }).join('')}
      </tbody>
    </table>
  `;

  // --- Рендер пагинации ---
  renderHistoryPagination(hist.length, totalPages, startIdx, endIdx);
}

/* Пагинация истории */
function renderHistoryPagination(totalItems, totalPages, startIdx, endIdx) {
  let bar = $('#historyPagination');

  // Если контейнера нет — создаём после таблицы
  if (!bar) {
    const list = $('#historyList');
    if (!list) return;
    list.insertAdjacentHTML('afterend', '<div class="pagination-bar" id="historyPagination"></div>');
    bar = $('#historyPagination');
  }

  if (!bar) return;

  // Одна страница и всё влезает — только счётчик
  if (totalPages <= 1 && totalItems <= historyPageSize) {
    bar.innerHTML = `<span class="pagination-info">Показано ${startIdx + 1}–${endIdx} из ${totalItems}</span>`;
    return;
  }

  let html = `<span class="pagination-info">Показано ${startIdx + 1}–${endIdx} из ${totalItems}</span>`;
  html += '<div class="pagination-controls">';

  // Назад
  html += `<button class="pagination-btn" ${historyPage === 1 ? 'disabled' : ''}
           onclick="changeHistoryPage(${historyPage - 1})">←</button>`;

  // Страницы (сокращённо — 5 вокруг текущей)
  const pages = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || Math.abs(i - historyPage) <= 2) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== '...') {
      pages.push('...');
    }
  }
  pages.forEach(p => {
    if (p === '...') {
      html += '<span class="pagination-dots">…</span>';
    } else {
      html += `<button class="pagination-btn ${p === historyPage ? 'active' : ''}"
               onclick="changeHistoryPage(${p})">${p}</button>`;
    }
  });

  // Вперёд
  html += `<button class="pagination-btn" ${historyPage === totalPages ? 'disabled' : ''}
           onclick="changeHistoryPage(${historyPage + 1})">→</button>`;

  // Выбор размера страницы
  html += `
    <select class="pagination-size" onchange="changeHistoryPageSize(this.value)">
      <option value="10" ${historyPageSize === 10 ? 'selected' : ''}>10</option>
      <option value="20" ${historyPageSize === 20 ? 'selected' : ''}>20</option>
      <option value="50" ${historyPageSize === 50 ? 'selected' : ''}>50</option>
    </select>
  `;

  html += '</div>';
  bar.innerHTML = html;
}

/* Смена страницы истории */
window.changeHistoryPage = function(page) {
  historyPage = page;
  renderHistory();
  // Плавный скролл к началу таблицы
  const list = $('#historyList');
  if (list) list.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

/* Смена размера страницы истории */
window.changeHistoryPageSize = function(size) {
  historyPageSize = parseInt(size, 10);
  historyPage = 1;
  renderHistory();
};

let currentRecord = null;

window.viewRecord = function(id) {
  const h = getHistory().find(x => x.id === id);
  if (!h) return;
  currentRecord = h;

  const fails = h.items.filter(i => i.status === 'FAIL').length;
  const oks = h.items.length - fails;
  const isTopLoss = h.mode === 'toploss';
  const isCl = h.mode === 'cl' || h.mode === 'electronic';
  const isElec = h.mode === 'electronic';

  // --- Собираем контекст в зависимости от режима ---
  let contextBlock = '';

  if (isTopLoss) {
    const lossNames = (h.topLosses || [])
      .map(lid => findLossById(lid))
      .filter(Boolean)
      .map(l => l.name);

    contextBlock = `
      <div style="margin-top:8px;padding-top:8px;border-top:1px dashed var(--border)">
        <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-second);font-weight:700;margin-bottom:6px">
          Проверенные потери
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:6px">
          ${lossNames.map(n => `<span class="tl-summary-chip">${escapeHtml(n)}</span>`).join('')}
        </div>
      </div>
    `;
  } else if (isCl) {
    const planned = (h.brandPlanned && h.brandPlanned !== h.brandActual)
      ? `<div><strong>Бренд по плану:</strong> ${escapeHtml(h.brandPlanned)}</div>`
      : '';
    contextBlock = `
      <div><strong>Бренд:</strong> ${escapeHtml(h.brandActual || '—')}</div>
      ${planned}
    `;
  } else {
    contextBlock = `
      <div><strong>Тип перехода:</strong> ${escapeHtml(h.type || '—')}</div>
      <div><strong>Бренды:</strong> ${escapeHtml(h.brandFrom || '—')} → ${escapeHtml(h.brandTo || '—')}</div>
      ${h.triggers && h.triggers.length ? `<div><strong>Триггеры:</strong> ${h.triggers.map(t => escapeHtml(t.replace('node:',''))).join(', ')}</div>` : ''}
      ${h.customNode ? `<div><strong>Доп. узел:</strong> ${escapeHtml(h.customNode)}</div>` : ''}
    `;
  }

  let html = `
    <div class="record-info">
      <div>
        <strong>Режим:</strong>
        ${isTopLoss
          ? '<span class="badge badge-mode-toploss">TOP Losses</span>'
          : h.mode === 'cl'
            ? '<span class="badge badge-mode-cl">Чек-лист CL (мех)</span>'
            : isElec
            ? '<span class="badge badge-mode-electronic">CL Electronic</span>'
            : (() => {
                const type = h.type || '';
                if (type === 'ChangeOver') return '<span class="badge badge-changeover">Change Over</span>';
                if (type === 'CL_TO') return '<span class="badge badge-clto">CL в ТО</span>';
                if (type === 'CL_Conversion') return '<span class="badge badge-clconv">CL в Конвертацию</span>';
                return '<span class="badge badge-mode-cocl">COCL</span>';
              })()
        }
      </div>
      <div><strong>Дата:</strong> ${fmtDate(h.timestamp)}</div>
      <div><strong>Оператор:</strong> ${escapeHtml(h.operator)}</div>
      <div><strong>Смена:</strong> ${escapeHtml(formatClShift(h))}</div>
      <div><strong>Линия:</strong> ${escapeHtml(h.line)}${!isTopLoss && h.part ? ' / ' + escapeHtml(h.part) : ''}</div>
      ${contextBlock}
      <div style="margin-top:8px;padding-top:8px;border-top:1px dashed var(--border)">
        <strong>Итого:</strong> ${h.items.length} пунктов, ${oks} ОК, ${fails} Не ОК
      </div>
    </div>
  `;

  // --- Таблица пунктов проверки ---
  html += `
    <table class="record-items">
      <thead>
        <tr>
          <th>№</th>
          <th>OPL</th>
          <th>Машина</th>
          <th>Узел</th>
          <th>Название</th>
          <th>Норма</th>
          <th>Ответ</th>
          <th>Комментарий</th>
        </tr>
      </thead>
      <tbody>
        ${h.items.map(it => {
          // Определяем класс строки: ok / fail / unchecked
          let rowCls = 'ok';
          if (it.status === 'FAIL')            rowCls = 'fail';
          else if (it.status === 'UNCHECKED')  rowCls = 'unchecked';

          // --- Формируем содержимое колонки «Ответ» ---
          let answerHtml = '';
          const ctype = it.controlType;

          if (it.status === 'UNCHECKED') {
            // Не проверено — единый бейдж
            answerHtml = '<span class="status-badge status-unchecked">Не проверено</span>';
          } else if (ctype === 'ok_not_ok') {
            // ОК / Не ОК — только бейдж
            answerHtml = it.status === 'OK'
              ? '<span class="status-badge status-ok">ОК</span>'
              : '<span class="status-badge status-fail">Не ОК</span>';
          } else if (ctype === 'value_input') {
            // Ввод значения.
            // Для COCL / TOP Losses — всегда «ОК» (оператор фиксирует факт).
            // Для CL Electronic — по статусу (в допуске / не в допуске),
            //   потому что там value_input — это измеренное значение.
            let statusLabel = 'ОК';
            let statusCls = 'status-ok';
            if (isElec && it.status === 'FAIL') {
              statusLabel = 'Не в допуске';
              statusCls = 'status-fail';
            }
            answerHtml = `<span class="status-badge ${statusCls}">${statusLabel}</span>
              <span class="record-answer-value">${escapeHtml(it.answer || '—')}</span>`;
          } else if (ctype === 'tolerance') {
            // Допуск — бейдж + значение (без приписки «— в допуске»)
            const valueOnly = (it.answer || '').replace(/\s+—\s+(в допуске|не в допуске)$/,'');
            answerHtml = it.status === 'OK'
              ? `<span class="status-badge status-ok">В допуске</span>
                 <span class="record-answer-value">${escapeHtml(valueOnly || '—')}</span>`
              : `<span class="status-badge status-fail">Не в допуске</span>
                 <span class="record-answer-value">${escapeHtml(valueOnly || '—')}</span>`;
          } else {
            // Резерв — старые записи без controlType или нестандартные
            answerHtml = escapeHtml(it.answer || '—');
          }

          return `
            <tr class="${rowCls}">
              <td>${escapeHtml(it.number || '—')}</td>
              <td>${escapeHtml(it.oplNumber || '—')}</td>
              <td>${escapeHtml(it.machine || '—')}</td>
              <td>${escapeHtml(it.node || '—')}</td>
              <td>${escapeHtml(it.title || '—')}</td>
              <td>${renderRecordNorm(it, isElec)}</td>
              <td>${renderRecordAnswer(it, isElec)}</td>
              <td>${it.comment ? escapeHtml(it.comment) : '—'}</td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  `;
  $('#recordModalBody').innerHTML = html;
  openModal('#recordModal');
};

/* ============================================================
   CL Electronic: сохранение проверки (кнопка «Зафиксировать»)
   ============================================================ */
$('#elecSaveCheckBtn')?.addEventListener('click', () => {
  const operator = ($('#elecOperator')?.value || '').trim();
  const line = elecState.line;
  const date = elecState.date;
  const shift = elecState.shift;
  const brand = elecState.brand;

  if (!operator) return showToast('Укажите ФИО оператора', true);
  if (!line)     return showToast('Выберите линию', true);
  if (!brand)    return showToast('Бренд не определён', true);

  const items = [];

  $$('#elecChecklistContainer .elec-acc-item').forEach(item => {
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

/**
 * Норма для отображения в модалке просмотра записи.
 * Для CL Electronic — из norm или normText.
 * Для COCL — из блока точек (по бренду или все).
 */
/**
 * Определяет, является ли запись проверкой «ОК / Не ОК» (без ввода значения).
 */
function isOkNotOkRecord(it) {
  if (it.controlType === 'ok_not_ok') return true;
  if (it.controlType === 'fixed') {
    const a = String(it.answer || '').trim();
    // «Фиксированный» бывает двух видов: ОК/Не ОК (answer = «ОК»/«Не ОК»)
    // или точное значение (answer = число). Различаем по тексту ответа.
    return a === 'ОК' || a === 'Не ОК' || a === '';
  }
  return false;
}

function renderRecordNorm(it, isElec) {
  if (isElec) {
    return escapeHtml(it.norm || '—');
  }

  // COCL: собираем нормы всех точек
  const st = getStandards().find(s => s.id === it.standardId);
  if (!st) return escapeHtml(it.norm || '—');

  const blocks = Array.isArray(st.measurements) ? st.measurements : [];
  if (!blocks.length) return '—';

  // Выбираем блок: если запись содержит brandTo — ищем по нему, иначе первый
  const brandTo = it.brandTo || it.brandActual || '';
  let block = null;
  if (brandTo) {
    block = blocks.find(b => b.brand === brandTo);
  }
  if (!block) block = blocks[0];

  const points = Array.isArray(block.points) ? block.points : [];
  if (!points.length) return '—';

  return points.map(p => escapeHtml(p.value || '—')).join(' · ');
}

/**
 * Ответ для отображения в модалке просмотра записи.
 */
function renderRecordAnswer(it, isElec) {
  // Для CL Electronic — текущая логика
  if (isElec) {
    if (it.status === 'UNCHECKED') {
      return '<span class="status-badge status-unchecked">Не проверено</span>';
    }
    if (it.controlType === 'ok_not_ok' || isOkNotOkRecord(it)) {
      return it.status === 'OK'
        ? '<span class="status-badge status-ok">ОК</span>'
        : '<span class="status-badge status-fail">Не ОК</span>';
    }
    let statusLabel = 'ОК';
    let statusCls = 'status-ok';
    if (it.status === 'FAIL') {
      statusLabel = 'Не в допуске';
      statusCls = 'status-fail';
    }
    return `<span class="status-badge ${statusCls}">${statusLabel}</span>
      <span class="record-answer-value">${escapeHtml(it.answer || '—')}</span>`;
  }

  // COCL / TOP Losses
  if (it.status === 'UNCHECKED') {
    return '<span class="status-badge status-unchecked">Не проверено</span>';
  }

  if (it.controlType === 'ok_not_ok' || isOkNotOkRecord(it)) {
    return it.status === 'OK'
      ? '<span class="status-badge status-ok">ОК</span>'
      : '<span class="status-badge status-fail">Не ОК</span>';
  }

  // value_input / range_input / variable / interval — ответ = список значений
  const values = String(it.answer || '').split(',').map(v => v.trim()).filter(Boolean);
  const statusCls = it.status === 'FAIL' ? 'status-fail' : 'status-ok';
  const statusLabel = it.status === 'FAIL' ? 'Есть отклонения' : 'В норме';

  return `<span class="status-badge ${statusCls}">${statusLabel}</span>
    <span class="record-answer-value">${values.map(v => escapeHtml(v)).join(' · ')}</span>`;
}

function closeRecordModal() {
  closeModal('#recordModal');
  currentRecord = null;
}

$('#recordModalClose').addEventListener('click', closeRecordModal);
$('#recordCloseBtn').addEventListener('click', closeRecordModal);
$('#recordModal').addEventListener('click', (e) => {
  if (e.target.id === 'recordModal') closeRecordModal();
});

$('#recordPrintBtn').addEventListener('click', () => {
  window.print();
});

/* ============================================================
   ЭКСПОРТ: детали и CSV
   ============================================================ */
function buildDetailsText(record) {
  return record.items.map(it => {
    // Единообразие: показываем OPL + машину
    const oplDisplay = it.machine
      ? `${it.oplNumber || it.number || '—'} [${it.machine}]`
      : (it.oplNumber || it.number || '—');

    let line = `[${oplDisplay}] ${it.node || ''} — ${it.title || ''}: ${it.answer || ''}`;
    if (it.norm) {
      line += ` (норма: ${it.norm})`;
    }
    if (it.comment && it.comment.trim() !== '') {
      line += ` | Комментарий: ${it.comment}`;
    }
    return line;
  }).join('\n');
}

function buildDetailsTextForCsv(record) {
  return buildDetailsText(record);
}

function exportToCsv(hist) {
  const headers = [
    'Дата/время','Режим','Оператор','Смена','Линия','Часть','Тип перехода',
    'С бренда','На бренд','Потери','Триггеры','Доп. узел',
    'Пунктов','Не ОК','Детали проверки','Бренд CL (факт)'
  ];
  const rows = [headers];

  hist.forEach(h => {
    const fails = h.items.filter(i => i.status === 'FAIL').length;
    const triggersText = (h.triggers || []).map(t => t.replace('node:','')).join(', ');
    const isTopLoss = h.mode === 'toploss';
    const isCl = h.mode === 'cl' || h.mode === 'electronic';

    // Режим: текст (COCL / TOP Losses / CL Electronic / CL (мех))
    const modeText = getHistoryModeText(h);

    // Потери (для TOP Losses): названия через запятую
    const lossesText = isTopLoss
      ? (h.topLosses || [])
          .map(lid => findLossById(lid))
          .filter(Boolean)
          .map(l => l.name)
          .join(', ')
      : '';

    rows.push([
      fmtDate(h.timestamp),
      modeText,
      h.operator,
      formatClShift(h),
      h.line,
      h.part || '',
      (isTopLoss || isCl) ? '' : (h.type || ''),
      (isTopLoss || isCl) ? '' : (h.brandFrom || ''),
      (isTopLoss || isCl) ? '' : (h.brandTo || ''),
      lossesText,
      isTopLoss ? '' : triggersText,
      h.customNode || '',
      h.items.length,
      fails,
      buildDetailsText(h),
      isCl ? (h.brandActual || '') : ''
    ]);
  });

  const csv = rows.map(r => r.map(cell => {
    const s = String(cell == null ? '' : cell);
    return '"' + s.replace(/"/g,'""') + '"';
  }).join(';')).join('\n');

  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, 'checklist_history_' + Date.now() + '.csv');
  showToast('CSV выгружен');
}

$('#exportCsvBtn').addEventListener('click', () => {
  const hist = getFilteredHistory();
  if (!hist.length) return showToast('Нет данных для экспорта', true);
  exportToCsv(hist);
});

/* ============================================================
   ЭКСПОРТ В XLSX (ExcelJS)
   ============================================================ */
const XL_COLOR_PRIMARY = 'FF0A4FA8';   // темнее синий
const XL_COLOR_HEADER_TEXT = 'FFFFFFFF';
const XL_FONT_SIZE = 14;                // базовый шрифт
const XL_FONT_SIZE_HEADER = 18;         // шрифт шапки
const XL_COLOR_WHITE   = 'FFFFFFFF';
const XL_COLOR_FAIL_BG = 'FFFDE0DD';
const XL_COLOR_FAIL_TX = 'FFC0392B';
const XL_COLOR_OK_TX   = 'FF27AE60';
const XL_COLOR_BORDER  = 'FFCBD2D9';

const EXPORT_HEADERS = [
  'Дата/время','Режим','Оператор','Смена','Линия','Часть','Тип перехода',
  'С бренда','На бренд','Потери','Триггеры','Доп. узел',
  'Пунктов','Не ОК','Детали проверки','Бренд CL (факт)'
];

async function exportToXlsx(hist) {
  if (typeof ExcelJS === 'undefined') {
    showToast('Библиотека ExcelJS не загружена. Проверьте index.html', true);
    return;
  }

  const wb = new ExcelJS.Workbook();
  wb.creator = 'Чек-лист смены сорта';
  wb.created = new Date();

  buildSheetChecks(wb, hist);
  buildSheetAnalytics(wb, hist);

  // Только если есть TOP Losses записи
  const hasTopLoss = hist.some(h => h.mode === 'toploss');
  if (hasTopLoss) {
    buildSheetLosses(wb, hist);
  }

  // Только если есть CL-записи (Чек-лист CL: мех + электро)
  const hasCL = hist.some(h => h.mode === 'cl' || h.mode === 'electronic');
  if (hasCL) {
    buildSheetCL(wb, hist);
  }

  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const ts = new Date().toISOString().slice(0,19).replace(/[:T]/g,'-');
  downloadBlob(blob, 'checklist_report_' + ts + '.xlsx');
  showToast('XLSX выгружен');
}

function buildSheetChecks(wb, hist) {
  const ws = wb.addWorksheet('Проверки', {
    views: [{ state: 'frozen', ySplit: 1, xSplit: 0 }]
  });

  /* ---- Жёстко заданные ширины колонок (в символах Excel) ---- */
  /* Подобраны под самые длинные заголовки + запас */
const COLUMN_WIDTHS = [
  28,   // Дата/время
  16,   // Режим
  30,   // Оператор
  14,   // Смена
  14,   // Линия
  14,   // Часть
  28,   // Тип перехода
  20,   // С бренда
  20,   // На бренд
  50,   // Потери
  55,   // Триггеры
  28,   // Доп. узел
  14,   // Пунктов
  12,   // Не ОК
  100,  // Детали проверки
  18    // Бренд CL (факт)
];
  ws.columns = EXPORT_HEADERS.map((header, i) => ({
    header: header,
    key: 'col' + i,
    width: COLUMN_WIDTHS[i]
  }));

  /* ---- Добавляем строки ---- */
  hist.forEach(h => {
    const fails = h.items.filter(i => i.status === 'FAIL').length;
    const triggersText = (h.triggers || []).map(t => t.replace('node:','')).join(', ');
    const isTopLoss = h.mode === 'toploss';
    const isCl = h.mode === 'cl' || h.mode === 'electronic';

    const modeText = getHistoryModeText(h);
    const lossesText = isTopLoss
      ? (h.topLosses || [])
          .map(lid => findLossById(lid))
          .filter(Boolean)
          .map(l => l.name)
          .join(', ')
      : '';

    const row = ws.addRow([
      fmtDate(h.timestamp),
      modeText,
      h.operator,
      formatClShift(h),
      h.line,
      h.part || '',
      (isTopLoss || isCl) ? '' : (h.type || ''),
      (isTopLoss || isCl) ? '' : (h.brandFrom || ''),
      (isTopLoss || isCl) ? '' : (h.brandTo || ''),
      lossesText,
      isTopLoss ? '' : triggersText,
      h.customNode || '',
      h.items.length,
      fails,
      buildDetailsText(h),
      isCl ? (h.brandActual || '') : ''
    ]);

    // Высота строки: по числу пунктов, минимум 30
    const itemsCount = h.items.length;
    row.height = Math.max(20 * itemsCount + 10, 30);

    const isFailRow = fails > 0;

    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      cell.border = {
        top:    { style: 'thin', color: { argb: XL_COLOR_BORDER } },
        bottom: { style: 'thin', color: { argb: XL_COLOR_BORDER } },
        left:   { style: 'thin', color: { argb: XL_COLOR_BORDER } },
        right:  { style: 'thin', color: { argb: XL_COLOR_BORDER } }
      };
      cell.font = { name: 'Calibri', size: XL_FONT_SIZE };

      if (colNumber === 15) {
        // Детали — по левому краю, wrap
        cell.alignment = { vertical: 'top', horizontal: 'left', wrapText: true };
      } else if (colNumber === 13 || colNumber === 14) {
        // Пунктов, Не ОК — центр
        cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: false };
      } else {
        cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: false };
      }

      if (isFailRow) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: XL_COLOR_FAIL_BG } };
      }
    });

    // Цвет и жирность цифры «Не ОК»
    const failCell = row.getCell(14);
    failCell.font = {
      name: 'Calibri',
      size: XL_FONT_SIZE + 1,
      bold: true,
      color: { argb: fails > 0 ? XL_COLOR_FAIL_TX : XL_COLOR_OK_TX }
    };
  });

  /* ---- Шапка ---- */
  const headerRow = ws.getRow(1);
  headerRow.height = 38;
  headerRow.eachCell({ includeEmpty: true }, (cell) => {
    cell.font = {
      name: 'Calibri',
      size: XL_FONT_SIZE_HEADER,
      bold: true,
      color: { argb: XL_COLOR_HEADER_TEXT }
    };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: XL_COLOR_PRIMARY } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: false };
    cell.border = {
      top:    { style: 'thin', color: { argb: XL_COLOR_PRIMARY } },
      bottom: { style: 'thin', color: { argb: XL_COLOR_PRIMARY } },
      left:   { style: 'thin', color: { argb: XL_COLOR_PRIMARY } },
      right:  { style: 'thin', color: { argb: XL_COLOR_PRIMARY } }
    };
  });

  ws.autoFilter = {
    from: { row: 1, column: 1 },
    to:   { row: 1, column: EXPORT_HEADERS.length }
  };
}

function buildSheetAnalytics(wb, hist) {
  const ws = wb.addWorksheet('Аналитика');

  /* ---- ФИКСИРОВАННЫЕ ШИРИНЫ (покрывают все таблицы аналитики) ---- */
  ws.columns = [
  { width: 36 },   // A — «Оператор», «Переход», «№ стандарта», названия разделов
  { width: 30 },   // B — «Проверок», «Узел»
  { width: 26 },   // C — «Пунктов», «Не ОК», «Всего»
  { width: 32 },   // D — «Среднее отклонений», «% отклонений», «Не ОК»
  { width: 28 }    // E — «% отклонений»
  ];


  const totalChecks = hist.length;
  const totalItems = hist.reduce((s, h) => s + h.items.length, 0);
  const totalFails = hist.reduce((s, h) => s + h.items.filter(i => i.status === 'FAIL').length, 0);
  const failsPercent = totalItems > 0 ? ((totalFails / totalItems) * 100).toFixed(1) + '%' : '0%';

  const byLine = {}, byOperator = {}, byType = {}, byBrand = {}, byShift = {}, byStd = {};
  hist.forEach(h => {
    const f = h.items.filter(i => i.status === 'FAIL').length;
    const isTopLoss = h.mode === 'toploss';
    const isCl = h.mode === 'cl' || h.mode === 'electronic';

    if (!byLine[h.line]) byLine[h.line] = { checks: 0, items: 0, fails: 0 };
    byLine[h.line].checks++;
    byLine[h.line].items += h.items.length;
    byLine[h.line].fails += f;

    if (!byOperator[h.operator]) byOperator[h.operator] = { checks: 0, fails: 0 };
    byOperator[h.operator].checks++;
    byOperator[h.operator].fails += f;

    const typeKey = getHistoryModeText(h);
    if (!byType[typeKey]) byType[typeKey] = { checks: 0, fails: 0 };
    byType[typeKey].checks++;
    byType[typeKey].fails += f;

    if (!isTopLoss && !isCl) {
      const bKey = h.brandFrom + ' → ' + h.brandTo;
      if (!byBrand[bKey]) byBrand[bKey] = { checks: 0, fails: 0 };
      byBrand[bKey].checks++;
      byBrand[bKey].fails += f;
    }

    const shiftKey = isCl ? formatClShift(h) : (h.shift || '—');
    if (!byShift[shiftKey]) byShift[shiftKey] = { checks: 0, fails: 0 };
    byShift[shiftKey].checks++;
    byShift[shiftKey].fails += f;

  h.items.forEach(it => {
    // Ключ: OPL + машина — чтобы стандарты с одинаковым OPL
    // на разных машинах не сливались
    const oplKey = it.oplNumber || it.number || '—';
    const key = it.machine ? `${oplKey} [${it.machine}]` : oplKey;

    if (!byStd[key]) {
      byStd[key] = {
        node: it.node,
        title: it.title,
        machine: it.machine,
        total: 0,
        fails: 0
      };
    }
    byStd[key].total++;
    if (it.status === 'FAIL') byStd[key].fails++;
  });
  });

  const addTitle = (text) => {
    const row = ws.addRow([text]);
    row.height = 36;
    const cell = row.getCell(1);
    cell.font = {
      name: 'Calibri',
      size: 15,
      bold: true,
      color: { argb: XL_COLOR_PRIMARY }
    };
    cell.alignment = { vertical: 'middle', horizontal: 'left' };
    ws.mergeCells(row.number, 1, row.number, 5);
  };

  const addHeader = (arr) => {
    const row = ws.addRow(arr);
    row.height = 32;
    for (let c = 1; c <= 5; c++) {
      const cell = row.getCell(c);
      cell.font = {
        name: 'Calibri',
        size: XL_FONT_SIZE_HEADER,
        bold: true,
        color: { argb: XL_COLOR_HEADER_TEXT }
      };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: XL_COLOR_PRIMARY } };
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: false };
      cell.border = {
        top:    { style: 'thin', color: { argb: XL_COLOR_PRIMARY } },
        bottom: { style: 'thin', color: { argb: XL_COLOR_PRIMARY } },
        left:   { style: 'thin', color: { argb: XL_COLOR_PRIMARY } },
        right:  { style: 'thin', color: { argb: XL_COLOR_PRIMARY } }
      };
    }
  };

  const addDataRow = (arr) => {
    const row = ws.addRow(arr);
    row.height = 24;
    for (let c = 1; c <= 5; c++) {
      const cell = row.getCell(c);
      cell.font = { name: 'Calibri', size: XL_FONT_SIZE };
      cell.alignment = { vertical: 'middle', horizontal: 'left' };
      cell.border = {
        top:    { style: 'thin', color: { argb: XL_COLOR_BORDER } },
        bottom: { style: 'thin', color: { argb: XL_COLOR_BORDER } },
        left:   { style: 'thin', color: { argb: XL_COLOR_BORDER } },
        right:  { style: 'thin', color: { argb: XL_COLOR_BORDER } }
      };
    }
  };

  addTitle('📊 Сводная аналитика проверок');
  ws.addRow([]);
  addDataRow(['Дата формирования:', fmtDate(new Date()), '', '', '']);
  addDataRow(['Всего проверок:', totalChecks, '', '', '']);
  addDataRow(['Всего пунктов проверено:', totalItems, '', '', '']);
  addDataRow(['Всего отклонений (Не ОК):', totalFails, '', '', '']);
  addDataRow(['Процент отклонений:', failsPercent, '', '', '']);
  ws.addRow([]);

  addTitle('🏭 По линиям');
  addHeader(['Линия', 'Проверок', 'Пунктов', 'Не ОК', '% отклонений']);
  const lineRows = Object.entries(byLine).map(([line, v]) => [
    line, v.checks, v.items, v.fails,
    v.items > 0 ? ((v.fails/v.items)*100).toFixed(1) + '%' : '0%'
  ]);
  lineRows.sort((a, b) => b[3] - a[3]);
  lineRows.forEach(r => addDataRow(r));
  ws.addRow([]);

  addTitle('👤 По операторам');
  addHeader(['Оператор', 'Проверок', 'Не ОК', 'Среднее отклонений', '']);
  const opRows = Object.entries(byOperator).map(([op, v]) => [
    op, v.checks, v.fails, (v.fails / v.checks).toFixed(2), ''
  ]);
  opRows.sort((a, b) => b[2] - a[2]);
  opRows.forEach(r => addDataRow(r));
  ws.addRow([]);

  addTitle('🔄 По режимам / типам');
  addHeader(['Тип', 'Проверок', 'Не ОК', '% отклонений', '']);
  Object.entries(byType).forEach(([t, v]) => {
    addDataRow([t, v.checks, v.fails, v.checks > 0 ? ((v.fails/v.checks)*100).toFixed(1) + '%' : '0%', '']);
  });
  ws.addRow([]);

  addTitle('⏰ По сменам');
  addHeader(['Смена', 'Проверок', 'Не ОК', '% отклонений', '']);
  Object.entries(byShift).sort().forEach(([s, v]) => {
    addDataRow([s, v.checks, v.fails, v.checks > 0 ? ((v.fails/v.checks)*100).toFixed(1) + '%' : '0%', '']);
  });
  ws.addRow([]);

  addTitle('🏷 По переходам брендов');
  addHeader(['Переход', 'Проверок', 'Не ОК', '', '']);
  const brandRows = Object.entries(byBrand).map(([b, v]) => [b, v.checks, v.fails, '', '']);
  brandRows.sort((a, b) => b[2] - a[2]);
  brandRows.forEach(r => addDataRow(r));
  ws.addRow([]);

  addTitle('⚠ Топ-10 проблемных стандартов');
  addHeader(['OPL № + машина', 'Узел', 'Всего', 'Не ОК', '% отклонений']);
  const topFails = Object.entries(byStd)
    .filter(([_, v]) => v.fails > 0)
    .sort((a, b) => b[1].fails - a[1].fails)
    .slice(0, 10);
  if (topFails.length === 0) {
    addDataRow(['—', 'Отклонений не зафиксировано', '', '', '']);
  } else {
    topFails.forEach(([std, v]) => {
      addDataRow([
        std, v.node || '—', v.total, v.fails,
        ((v.fails / v.total) * 100).toFixed(1) + '%'
      ]);
    });
  }
}

$('#exportXlsxBtn').addEventListener('click', () => {
  const hist = getFilteredHistory();
  if (!hist.length) return showToast('Нет данных для экспорта', true);
  exportToXlsx(hist);
});

/* ============================================================
   XLSX: лист «Потери» — аналитика по TOP Losses
   ============================================================ */
function buildSheetLosses(wb, hist) {
  const ws = wb.addWorksheet('Потери');

  ws.columns = [
    { width: 50 },   // A — потеря
    { width: 20 },   // B — категория
    { width: 20 },   // C — проверок
    { width: 20 },   // D — пунктов
    { width: 16 },   // E — не ОК
    { width: 20 }    // F — % отклонений
  ];

  // Фильтруем только Top Losses
  const topLossHist = hist.filter(h => h.mode === 'toploss');

  // Агрегация
  const lossAgg = {};
  topLossHist.forEach(h => {
    h.items.forEach(it => {
      const st = getStandards().find(s => s.id === it.standardId);
      if (!st || !Array.isArray(st.topLosses)) return;
      st.topLosses.forEach(lid => {
        if (!(h.topLosses || []).includes(lid)) return;
        if (!lossAgg[lid]) {
          const l = findLossById(lid);
          lossAgg[lid] = {
            name: l ? l.name : lid,
            categoryName: l ? l.categoryName : '—',
            checks: new Set(),
            total: 0,
            fails: 0
          };
        }
        lossAgg[lid].checks.add(h.id);
        lossAgg[lid].total++;
        if (it.status === 'FAIL') lossAgg[lid].fails++;
      });
    });
  });

  const addTitle = (text) => {
    const row = ws.addRow([text]);
    row.height = 36;
    const cell = row.getCell(1);
    cell.font = { name: 'Calibri', size: 15, bold: true, color: { argb: XL_COLOR_PRIMARY } };
    cell.alignment = { vertical: 'middle', horizontal: 'left' };
    ws.mergeCells(row.number, 1, row.number, 6);
  };

  const addHeader = (arr) => {
    const row = ws.addRow(arr);
    row.height = 32;
    for (let c = 1; c <= 6; c++) {
      const cell = row.getCell(c);
      cell.font = {
        name: 'Calibri',
        size: XL_FONT_SIZE_HEADER,
        bold: true,
        color: { argb: XL_COLOR_HEADER_TEXT }
      };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: XL_COLOR_PRIMARY } };
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: false };
      cell.border = {
        top:    { style: 'thin', color: { argb: XL_COLOR_PRIMARY } },
        bottom: { style: 'thin', color: { argb: XL_COLOR_PRIMARY } },
        left:   { style: 'thin', color: { argb: XL_COLOR_PRIMARY } },
        right:  { style: 'thin', color: { argb: XL_COLOR_PRIMARY } }
      };
    }
  };

  const addDataRow = (arr) => {
    const row = ws.addRow(arr);
    row.height = 24;
    for (let c = 1; c <= 6; c++) {
      const cell = row.getCell(c);
      cell.font = { name: 'Calibri', size: XL_FONT_SIZE };
      cell.alignment = { vertical: 'middle', horizontal: 'left' };
      cell.border = {
        top:    { style: 'thin', color: { argb: XL_COLOR_BORDER } },
        bottom: { style: 'thin', color: { argb: XL_COLOR_BORDER } },
        left:   { style: 'thin', color: { argb: XL_COLOR_BORDER } },
        right:  { style: 'thin', color: { argb: XL_COLOR_BORDER } }
      };
    }
  };

  addTitle('📊 Аналитика по потерям (TOP Losses)');
  ws.addRow([]);
  addDataRow(['Дата формирования:', fmtDate(new Date()), '', '', '', '']);
  addDataRow(['Всего проверок потерь:', topLossHist.length, '', '', '', '']);
  ws.addRow([]);

  addHeader(['Потеря', 'Категория', 'Проверок', 'Пунктов', 'Не ОК', '% отклонений']);

  const rows = Object.values(lossAgg).map(v => [
    v.name,
    v.categoryName,
    v.checks.size,
    v.total,
    v.fails,
    v.total > 0 ? ((v.fails / v.total) * 100).toFixed(1) + '%' : '0%'
  ]);

  // Сортировка по отклонениям (убывание)
  rows.sort((a, b) => b[4] - a[4]);

  if (rows.length === 0) {
    addDataRow(['—', 'Отклонений по потерям не зафиксировано', '', '', '', '']);
  } else {
    rows.forEach(r => addDataRow(r));
  }
}

/* ============================================================
   XLSX: лист «CL» — аналитика по Чек-листу CL (мех + электро)
   ============================================================ */
function buildSheetCL(wb, hist) {
  const ws = wb.addWorksheet('CL');

  ws.columns = [
    { width: 60 },   // A — параметр / стандарт
    { width: 16 },   // B — режим
    { width: 16 },   // C — машина
    { width: 16 },   // D — линия
    { width: 12 },   // E — пунктов
    { width: 12 },   // F — не ОК
    { width: 18 }    // G — % отклонений
  ];

  // Фильтруем только CL-записи (Чек-лист CL)
  const clHist = hist.filter(h => h.mode === 'cl' || h.mode === 'electronic');

  // Агрегация по параметру/стандарту + машина
  const agg = {};
  clHist.forEach(h => {
    const isElec = h.mode === 'electronic';
    h.items.forEach(it => {
      const name = isElec ? (it.paramName || '—') : (it.title || it.oplNumber || '—');
      const key = it.machine ? name + ' [' + it.machine + ']' : name;

      if (!agg[key]) {
        agg[key] = {
          name: name,
          mode: isElec ? 'Электро' : 'Механика',
          machine: it.machine || '—',
          line: h.line || '—',
          total: 0,
          fails: 0
        };
      }
      agg[key].total++;
      if (it.status === 'FAIL') agg[key].fails++;
    });
  });

  const addTitle = (text) => {
    const row = ws.addRow([text]);
    row.height = 36;
    const cell = row.getCell(1);
    cell.font = { name: 'Calibri', size: 15, bold: true, color: { argb: XL_COLOR_PRIMARY } };
    cell.alignment = { vertical: 'middle', horizontal: 'left' };
    ws.mergeCells(row.number, 1, row.number, 7);
  };

  const addHeader = (arr) => {
    const row = ws.addRow(arr);
    row.height = 32;
    for (let c = 1; c <= 7; c++) {
      const cell = row.getCell(c);
      cell.font = {
        name: 'Calibri',
        size: XL_FONT_SIZE_HEADER,
        bold: true,
        color: { argb: XL_COLOR_HEADER_TEXT }
      };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: XL_COLOR_PRIMARY } };
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: false };
      cell.border = {
        top:    { style: 'thin', color: { argb: XL_COLOR_PRIMARY } },
        bottom: { style: 'thin', color: { argb: XL_COLOR_PRIMARY } },
        left:   { style: 'thin', color: { argb: XL_COLOR_PRIMARY } },
        right:  { style: 'thin', color: { argb: XL_COLOR_PRIMARY } }
      };
    }
  };

  const addDataRow = (arr) => {
    const row = ws.addRow(arr);
    row.height = 24;
    for (let c = 1; c <= 7; c++) {
      const cell = row.getCell(c);
      cell.font = { name: 'Calibri', size: XL_FONT_SIZE };
      cell.alignment = { vertical: 'middle', horizontal: 'left' };
      cell.border = {
        top:    { style: 'thin', color: { argb: XL_COLOR_BORDER } },
        bottom: { style: 'thin', color: { argb: XL_COLOR_BORDER } },
        left:   { style: 'thin', color: { argb: XL_COLOR_BORDER } },
        right:  { style: 'thin', color: { argb: XL_COLOR_BORDER } }
      };
    }
  };

  addTitle('📊 Аналитика по Чек-листу CL (механика + электроника)');
  ws.addRow([]);
  addDataRow(['Дата формирования:', fmtDate(new Date()), '', '', '', '', '']);
  addDataRow(['Всего проверок CL:', clHist.length, '', '', '', '', '']);
  addDataRow(['Всего пунктов:', clHist.reduce(function(s, h) { return s + h.items.length; }, 0), '', '', '', '', '']);
  ws.addRow([]);

  addHeader(['Параметр / Стандарт', 'Режим', 'Машина', 'Линия', 'Пунктов', 'Не ОК', '% отклонений']);

  const rows = Object.values(agg).map(v => [
    v.name,
    v.mode,
    v.machine,
    v.line,
    v.total,
    v.fails,
    v.total > 0 ? ((v.fails / v.total) * 100).toFixed(1) + '%' : '0%'
  ]);

  // Сортировка по "Не ОК" (убывание)
  rows.sort(function(a, b) { return b[5] - a[5]; });

  if (rows.length === 0) {
    addDataRow(['—', 'Отклонений по CL не зафиксировано', '', '', '', '', '']);
  } else {
    rows.forEach(r => addDataRow(r));
  }
}

/* ============================================================
   СКАЧИВАНИЕ ФАЙЛОВ
   ============================================================ */
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

$('#clearHistoryBtn').addEventListener('click', () => {
  if (!confirm('Удалить всю историю проверок? Это необратимо.')) return;
  setHistory([]);
  updateNavHistoryCounter();
  renderHistory();
  showToast('История очищена');
});

/* ============================================================
   ВКЛАДКА TOP LOSSES — ЭКРАН ВЫБОРА ПОТЕРЬ (Этап 3)
   ============================================================ */

/* Текущее состояние экрана выбора */
const tlState = {
  selectedLossIds: new Set(),      // выбранные id потерь
  expandedCategoryIds: new Set(),  // раскрытые категории
  // Кэш данных для перерисовки
  currentItems: [],                // массив стандартов
  currentStandardToLosses: {},     // standardId → [lossId]
  currentLossIds: [],              // выбранные lossIds
  // Раскрытые блоки ответов (Set от stdId)
  openAnswers: new Set()
};

/* ----------------------------------------
   Заполнение формы (смена, линия, оператор)
   ---------------------------------------- */
function fillTopLossTab() {
  fillTopLossLines();
  initTopLossOperatorAutocomplete();

  // Явно сбрасываем линию в пустое значение
  const lineEl = $('#tlLine');
  if (lineEl) lineEl.value = '';
}

/* Линия — только те, у которых есть бренды (как в COCL) */
function fillTopLossLines() {
  const el = $('#tlLine');
  if (!el) return;

  const available = getAvailableLines();
  if (!available.length) {
    el.innerHTML = '<option value="">— нет доступных линий —</option>';
    el.value = '';
    return;
  }
  el.innerHTML = '<option value="">— выберите —</option>' +
    available.map(l => `<option>${escapeHtml(l)}</option>`).join('');

  // Явный сброс — чтобы браузер не выбирал первую линию автоматически
  el.value = '';
}
/* ----------------------------------------
   Автокомплит оператора (копия логики из initOperatorAutocomplete,
   но привязан к #tlOperator / #tlOperatorAutocomplete)
   ---------------------------------------- */
function initTopLossOperatorAutocomplete() {
  const input = document.getElementById('tlOperator');
  const dropdown = document.getElementById('tlOperatorAutocomplete');
  if (!input || !dropdown) return;
  if (input.dataset.acReady === '1') return;
  input.dataset.acReady = '1';

  let activeIndex = -1;
  let currentMatches = [];

  function highlightMatch(fullText, query) {
    const idx = fullText.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return escapeHtml(fullText);
    const before = fullText.slice(0, idx);
    const match = fullText.slice(idx, idx + query.length);
    const after = fullText.slice(idx + query.length);
    return escapeHtml(before) + '<strong>' + escapeHtml(match) + '</strong>' + escapeHtml(after);
  }

  function renderDropdown(matches, query) {
    currentMatches = matches;
    activeIndex = -1;
    if (!matches.length) {
      if (query.length >= 1) {
        dropdown.innerHTML = '<div class="autocomplete-empty">Ничего не найдено</div>';
        dropdown.style.display = 'block';
      } else {
        dropdown.style.display = 'none';
      }
      return;
    }
    dropdown.innerHTML = matches.map((name, i) =>
      `<div class="autocomplete-item" data-index="${i}">${highlightMatch(name, query)}</div>`
    ).join('');
    dropdown.style.display = 'block';

    dropdown.querySelectorAll('.autocomplete-item').forEach(el => {
      el.addEventListener('mousedown', (e) => {
        e.preventDefault();
        selectItem(parseInt(el.dataset.index, 10));
      });
    });
  }

  function selectItem(index) {
    if (index < 0 || index >= currentMatches.length) return;
    input.value = currentMatches[index];
    dropdown.style.display = 'none';
    activeIndex = -1;
  }

  function updateActive() {
    dropdown.querySelectorAll('.autocomplete-item').forEach((el, i) => {
      el.classList.toggle('active', i === activeIndex);
    });
    if (activeIndex >= 0) {
      const el = dropdown.querySelector(`[data-index="${activeIndex}"]`);
      if (el) el.scrollIntoView({ block: 'nearest' });
    }
  }

  const MAX_SUGGESTIONS = 7;

  function filterOperators(query) {
    const q = query.toLowerCase();
    const all = sortOperatorsRus(getOperators());
    const starts = [];
    const contains = [];
    all.forEach(op => {
      const low = op.toLowerCase();
      if (low.startsWith(q)) starts.push(op);
      else if (low.includes(q)) contains.push(op);
    });
    return [...starts, ...contains];
  }

  input.addEventListener('input', () => {
    const query = input.value.trim();
    const operators = getOperators();
    if (!operators.length) {
      dropdown.style.display = 'none';
      return;
    }
    if (!query) {
      renderDropdown(sortOperatorsRus(getOperators()).slice(0, MAX_SUGGESTIONS), '');
      return;
    }
    renderDropdown(filterOperators(query).slice(0, 15), query);
  });

  input.addEventListener('focus', () => {
    const operators = getOperators();
    if (operators.length && !input.value.trim()) {
      renderDropdown(sortOperatorsRus(getOperators()).slice(0, MAX_SUGGESTIONS), '');
    }
  });

  input.addEventListener('keydown', (e) => {
    if (dropdown.style.display !== 'block') return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      activeIndex = Math.min(activeIndex + 1, currentMatches.length - 1);
      updateActive();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      activeIndex = Math.max(activeIndex - 1, 0);
      updateActive();
    } else if (e.key === 'Enter') {
      if (activeIndex >= 0) {
        e.preventDefault();
        selectItem(activeIndex);
      }
    } else if (e.key === 'Escape') {
      dropdown.style.display = 'none';
    }
  });

  input.addEventListener('blur', () => {
    setTimeout(() => { dropdown.style.display = 'none'; }, 150);
  });
}

/* ----------------------------------------
   Подсчёт стандартов для потери
   ---------------------------------------- */
function countStandardsForLoss(lossId) {
  const line = ($('#tlLine')?.value || '').trim();
  const standards = getStandards();
  return standards.filter(st => {
    if (st.active === false) return false;
    if (line && st.line !== line) return false;
    return Array.isArray(st.topLosses) && st.topLosses.includes(lossId);
  }).length;
}
/* ----------------------------------------
   Отрисовка категорий и потерь
   ---------------------------------------- */
function renderTopLossCategories() {
  const container = $('#tlCategoriesContainer');
  if (!container) return;

  const cats = getTopLosses();

  if (!cats.length) {
    container.innerHTML = '<div class="tl-empty">Справочник Top Losses пуст. Добавьте категории в Настройках.</div>';
    return;
  }

  container.innerHTML = cats.map(cat => {
    const items = Array.isArray(cat.items) ? cat.items : [];
    const isExpanded = tlState.expandedCategoryIds.has(cat.id);

    // Есть ли выбранные в этой категории
    const hasSelected = items.some(it => tlState.selectedLossIds.has(it.id));

    // Общий счётчик стандартов категории (уникальные стандарты по всем потерям)
    // — с учётом выбранной линии (если она указана)
    const line = ($('#tlLine')?.value || '').trim();
    const stdIds = new Set();
    items.forEach(it => {
      const standards = getStandards();
      standards.forEach(st => {
        if (st.active === false) return;
        if (line && st.line !== line) return;
        if (Array.isArray(st.topLosses) && st.topLosses.includes(it.id)) {
          stdIds.add(st.id);
        }
      });
    });
    const categoryStdCount = stdIds.size;

    const itemsHtml = items.map(it => {
      const isChecked = tlState.selectedLossIds.has(it.id);
      const stdCount = countStandardsForLoss(it.id);
      const countClass = stdCount === 0 ? 'tl-loss-std-count empty' : 'tl-loss-std-count';
      const countTitle = stdCount === 0
        ? 'Нет стандартов для этой потери'
        : `${stdCount} стандарт(ов)`;

      return `
        <label class="tl-loss-row ${isChecked ? 'checked' : ''}" data-loss-id="${escapeAttr(it.id)}">
          <input type="checkbox" class="tl-loss-checkbox" ${isChecked ? 'checked' : ''}>
          <span class="tl-loss-name">${escapeHtml(it.name)}</span>
          <span class="${countClass}" title="${escapeAttr(countTitle)}">${stdCount}</span>
        </label>
      `;
    }).join('');

    const bodyHtml = items.length
      ? `<div class="tl-category-body">${itemsHtml}</div>`
      : `<div class="tl-category-body"><div class="tl-empty">В категории нет потерь</div></div>`;

    return `
      <div class="tl-category ${isExpanded ? 'expanded' : ''} ${hasSelected ? 'has-selected' : ''}" data-cat-id="${escapeAttr(cat.id)}">
        <div class="tl-category-head" data-cat-toggle="${escapeAttr(cat.id)}">
          <span class="tl-category-toggle">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </span>
          <span class="tl-category-name">${escapeHtml(cat.name)}</span>
          <span class="tl-category-count" title="${categoryStdCount} стандарт(ов) во всей категории">${categoryStdCount}</span>
        </div>
        ${bodyHtml}
      </div>
    `;
  }).join('');

  // Обработчики: клик по заголовку — раскрытие
  container.querySelectorAll('[data-cat-toggle]').forEach(head => {
    head.addEventListener('click', () => {
      const catId = head.dataset.catToggle;
      toggleTopLossCategory(catId);
    });
  });

  // Обработчики: клик по потере — выбор
  container.querySelectorAll('.tl-loss-row').forEach(row => {
    row.addEventListener('click', (e) => {
      // если кликнули прямо по чек-боксу — не мешаем, браузер сам переключит
      if (e.target.matches('input[type="checkbox"]')) return;
      e.preventDefault();
      const lossId = row.dataset.lossId;
      toggleTopLossSelection(lossId);
    });
    const cb = row.querySelector('input[type="checkbox"]');
    if (cb) {
      cb.addEventListener('change', () => {
        const lossId = row.dataset.lossId;
        if (cb.checked) tlState.selectedLossIds.add(lossId);
        else tlState.selectedLossIds.delete(lossId);
        updateTlSelectedCounter();
        renderTopLossCategories();
      });
    }
  });

  updateTlSelectedCounter();

}
/* ----------------------------------------
   Раскрыть/свернуть категорию
   ---------------------------------------- */
function toggleTopLossCategory(catId) {
  if (tlState.expandedCategoryIds.has(catId)) {
    tlState.expandedCategoryIds.delete(catId);
  } else {
    tlState.expandedCategoryIds.add(catId);
  }
  renderTopLossCategories();
}

/* ----------------------------------------
   Выбрать/снять потерю
   ---------------------------------------- */
function toggleTopLossSelection(lossId) {
  if (tlState.selectedLossIds.has(lossId)) {
    tlState.selectedLossIds.delete(lossId);
  } else {
    tlState.selectedLossIds.add(lossId);
  }
  renderTopLossCategories();
}

/* ----------------------------------------
   Счётчик выбранных + активность кнопки
   ---------------------------------------- */
function updateTlSelectedCounter() {
  const counter = $('#tlSelectedCounter');
  const countEl = $('#tlSelectedCount');
  const btn = $('#tlBuildChecklistBtn');
  const n = tlState.selectedLossIds.size;

  if (counter && countEl) {
    countEl.textContent = n;
    counter.style.display = n > 0 ? '' : 'none';
  }
  if (btn) {
    btn.disabled = n === 0;
  }
}

/* ----------------------------------------
   Сброс выбора
   ---------------------------------------- */
function resetTopLossSelection() {
  tlState.selectedLossIds.clear();
  tlState.expandedCategoryIds.clear();
  tlState.openAnswers.clear();
  renderTopLossCategories();
}

/* ----------------------------------------
   Сформировать чек-лист — Этап 4.1
   ---------------------------------------- */
function buildTopLossChecklist() {
  const operator = ($('#tlOperator')?.value || '').trim();
  const line = $('#tlLine')?.value || '';
  const lossIds = [...tlState.selectedLossIds];

  if (!operator) return showToast('Укажите ФИО оператора', true);
  if (!line)     return showToast('Укажите линию', true);
  if (!lossIds.length) return showToast('Выберите хотя бы одну потерю', true);

  const { items, lossMap, standardToLosses } = collectStandardsForLosses(lossIds, line);

  if (!items.length) {
    return showToast('По выбранным потерям нет активных стандартов на линии ' + line, true);
  }

  // Сбрасываем раскрытые ответы при новом формировании
  tlState.openAnswers.clear();

  renderTopLossChecklist(items, standardToLosses, lossIds);

  $('#tlSelectView').style.display = 'none';
  $('#tlChecklistView').style.display = 'block';
  $('#tlSummaryView').style.display = 'none';

  window.scrollTo({ top: 0, behavior: 'smooth' });
}
/* ----------------------------------------
   Сбор стандартов по выбранным потерям
   Возвращает:
   - items: массив стандартов (уникальные)
   - lossMap: { [lossId]: [standardId, ...] } — какие стандарты у каждой потери
   - standardToLosses: { [standardId]: [lossId, ...] } — к каким потерям относится стандарт
   ---------------------------------------- */
function collectStandardsForLosses(lossIds, line) {
  const all = getStandards();
  const lossSet = new Set(lossIds);

  // Стандарт подходит, если:
  // - активен
  // - на нужной линии
  // - имеет topLosses, пересекающиеся с выбранными
  const items = [];
  const standardToLosses = {};

  all.forEach(st => {
    if (st.active === false) return;
    if (st.line !== line) return;
    if (!Array.isArray(st.topLosses) || !st.topLosses.length) return;

    const matched = st.topLosses.filter(id => lossSet.has(id));
    if (!matched.length) return;

    items.push(st);
    standardToLosses[st.id] = matched;
  });

  // Сортируем: по OPL, потом по названию
  items.sort((a, b) => {
    const oa = (a.oplNumber || '').toString();
    const ob = (b.oplNumber || '').toString();
    if (oa !== ob) return oa.localeCompare(ob, 'ru');
    return (a.title || '').localeCompare(b.title || '', 'ru');
  });

  // Обратная карта: lossId → [standardId, ...]
  const lossMap = {};
  lossIds.forEach(lid => { lossMap[lid] = []; });
  Object.entries(standardToLosses).forEach(([stdId, lids]) => {
    lids.forEach(lid => {
      if (lossMap[lid]) lossMap[lid].push(stdId);
    });
  });

  return { items, lossMap, standardToLosses };
}

/* ============================================================
   TOP LOSSES: рендер чек-листа — аккордеон
   ============================================================ */

function renderTopLossChecklist(items, standardToLosses, lossIds) {
  const container = $('#tlChecklistView');
  if (!container) return;

  // Кэшируем
  tlState.currentItems = items;
  tlState.currentStandardToLosses = standardToLosses;
  tlState.currentLossIds = lossIds;

  // Все потери
  const allLossObjects = lossIds
    .map(id => findLossById(id))
    .filter(Boolean);

  const MAX_VISIBLE_LOSSES = 3;
  let lossChipsHtml = '';

  if (allLossObjects.length <= MAX_VISIBLE_LOSSES) {
    lossChipsHtml = allLossObjects
      .map(l => `<span class="tl-summary-chip">${escapeHtml(l.name)}</span>`)
      .join('');
  } else {
    const visible = allLossObjects.slice(0, MAX_VISIBLE_LOSSES);
    const hidden = allLossObjects.length - MAX_VISIBLE_LOSSES;
    lossChipsHtml = visible
      .map(l => `<span class="tl-summary-chip">${escapeHtml(l.name)}</span>`)
      .join('');
    lossChipsHtml += `<button type="button" class="tl-summary-chip tl-summary-chip-more"
                              id="tlShowAllLossesBtn"
                              title="Показать все потери">
                        +${hidden}
                      </button>`;
  }

  // Инфо-строка
  const infoLine = `<div class="tl-list-info">
    Показано <strong>${items.length}</strong> ${pluralizeStandards(items.length)}
    по <strong>${lossIds.length}</strong> ${pluralizeLosses(lossIds.length)}
  </div>`;

  // Первый непроверенный — раскроем автоматически
  let firstUncheckedId = null;

  // Рендер карточек — аккордеон
  const itemsHtml = items.map(st => {
    const stdLosses = standardToLosses[st.id] || [];
    const isFirstUnchecked = (firstUncheckedId === null);
    if (isFirstUnchecked) firstUncheckedId = st.id;

    // Мета свёрнутой строки
    const compactMeta = [
      st.oplNumber ? `OPL: ${escapeHtml(st.oplNumber)}` : '',
      st.machine ? `Машина: ${escapeHtml(st.machine)}` : '',
      st.nodePart ? escapeHtml(st.nodePart) : ''
    ].filter(Boolean).join(' · ');

    // Потери
    const lossNames = stdLosses
      .map(id => findLossById(id))
      .filter(Boolean)
      .map(l => l.name);

    const lossesText = lossNames.length
      ? `<div class="tl-item-losses">Относится к: ${lossNames.map(escapeHtml).join(' · ')}</div>`
      : '';

    // Тело: ответ — всегда ОК / Не ОК, независимо от controlType
    const answerBodyHtml = `
      <div class="answer-row">
        <div class="radio-group">
          <label><input type="radio" name="tl_ans_${st.id}" value="OK" data-ans> ОК</label>
          <label><input type="radio" name="tl_ans_${st.id}" value="FAIL" data-ans> Не ОК</label>
        </div>
      </div>`;

    return `
      <div class="cocl-acc-item tl-acc-item" data-std-id="${escapeAttr(st.id)}" data-expanded="false">
        <div class="cocl-acc-header" data-acc-toggle>
          <span class="cocl-status-dot" data-acc-status="unchecked"></span>
          <div class="cocl-acc-title-wrap">
            <div class="cocl-acc-title">${escapeHtml(st.title || '—')}</div>
            <div class="cocl-acc-meta">${compactMeta}</div>
          </div>

          <button type="button" class="cocl-acc-comment-btn" data-comment-btn title="Добавить комментарий">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              <line x1="9" y1="10" x2="15" y2="10"/>
              <line x1="9" y1="14" x2="13" y2="14"/>
            </svg>
          </button>

          <button type="button" class="cocl-acc-view-btn" data-view-btn data-std-id="${escapeAttr(st.id)}" title="Посмотреть стандарт">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
          </button>

          <span class="cocl-acc-caret">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </span>
        </div>

        <div class="cocl-acc-body">
          ${lossesText}
          <div class="tl-answer-block">
            ${answerBodyHtml}
          </div>
          <div class="comment-preview" style="display:none" data-comment-preview></div>
        </div>
      </div>
    `;
  }).join('');

  container.innerHTML = `
    <div class="card tl-header-card">
      <div class="tl-title-row">
        <span class="tl-title-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <circle cx="12" cy="12" r="6"/>
            <circle cx="12" cy="12" r="2"/>
          </svg>
        </span>
        <h1 class="tl-title">TOP Losses</h1>
      </div>

      <div class="tl-losses-bar">
        <span class="tl-losses-bar-label">Потери:</span>
        ${lossChipsHtml}
      </div>

      ${infoLine}

      <div class="tl-hint-card">
        <span class="tl-hint-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="16" x2="12" y2="12"/>
            <line x1="12" y1="8" x2="12.01" y2="8"/>
          </svg>
        </span>
        <div class="tl-hint-text">
          Раскройте стандарт, чтобы оценить его. Отметьте <em>хотя бы 1 стандарт ОК / Не ОК</em>,
          чтобы сохранить результат в Историю.
        </div>
      </div>
    </div>

    <div class="card">
      <div id="tlChecklistContainer">${itemsHtml}</div>
    </div>

    <div class="tl-select-footer" id="tlFooter">
      <div class="tl-footer-buttons">
        <button class="btn btn-secondary" id="tlBackToSelectBtn">← К выбору потерь</button>
        <button class="btn btn-success btn-icon-text" id="tlSaveChecklistBtn" disabled>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
            <polyline points="17 21 17 13 7 13 7 21"/>
            <polyline points="7 3 7 8 15 8"/>
          </svg>
          <span>Зафиксировать результат</span>
        </button>
      </div>
    </div>
  `;

  // Раскрываем первый непроверенный
  if (firstUncheckedId) {
    const firstItem = container.querySelector(`.tl-acc-item[data-std-id="${firstUncheckedId}"]`);
    if (firstItem) expandCoclItem(firstItem, true);
  }

  // Привязка обработчиков
  bindTopLossAccordionEvents();
  updateTlProgressFooter();
}

/* Привязка всех обработчиков внутри списка */
function bindTopLossAccordionEvents() {
  const container = $('#tlChecklistContainer');
  if (!container) return;

  // --- Клик по шапке — раскрыть/свернуть ---
  container.querySelectorAll('[data-acc-toggle]').forEach(head => {
    head.addEventListener('click', (e) => {
      if (e.target.closest('[data-view-btn]')) return;
      if (e.target.closest('[data-comment-btn]')) return;
      const item = head.closest('.tl-acc-item');
      if (!item) return;
      const isExpanded = item.dataset.expanded === 'true';
      if (isExpanded) {
        collapseCoclItem(item);
      } else {
        expandCoclItem(item);
      }
    });
  });

  // --- Глазик ---
  container.querySelectorAll('[data-view-btn]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const stdId = btn.dataset.stdId;
      if (stdId && typeof openStandardView === 'function') openStandardView(stdId);
    });
  });

  // --- Комментарий ---
  container.querySelectorAll('[data-comment-btn]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const item = btn.closest('.tl-acc-item');
      openCommentModal(item);
    });
  });

  // --- Radio ОК / Не ОК ---
  container.querySelectorAll('input[data-ans]').forEach(r => {
    r.addEventListener('change', (e) => {
      const item = e.target.closest('.tl-acc-item');
      const val = e.target.value;
      updateTlItemStatus(item, val === 'OK' ? 'ok' : 'fail');
      updateTlProgressFooter();
    });
  });

  // --- Кнопки футера ---
  $('#tlBackToSelectBtn')?.addEventListener('click', backToTopLossSelect);
  $('#tlSaveChecklistBtn')?.addEventListener('click', saveTopLossCheck);

  // --- Кнопка «+N потерь» ---
  $('#tlShowAllLossesBtn')?.addEventListener('click', () => {
    const allLossObjects = tlState.currentLossIds
      .map(id => findLossById(id))
      .filter(Boolean);
    const names = allLossObjects.map(l => l.name).join('\n');
    alert('Все потери:\n\n' + names);
  });
}

/** Обновить статус свёрнутой строки в TOP Losses */
function updateTlItemStatus(item, status) {
  item.dataset.status = status;
  const dot = item.querySelector('[data-acc-status]');
  if (dot) {
    dot.classList.remove('cocl-status-unchecked', 'cocl-status-ok', 'cocl-status-fail');
    dot.classList.add('cocl-status-' + status);
    dot.dataset.accStatus = status;
  }
}
/* Раскрыть / свернуть блок ответа */
function toggleAnswerBlock(stdId, open) {
  const item = document.querySelector(`.checklist-item[data-std-id="${stdId}"]`);
  if (!item) return;

  if (open) {
    tlState.openAnswers.add(stdId);
    item.classList.add('answer-open');

    const evalBtn = item.querySelector('[data-evaluate-btn]');
    const collapseBtn = item.querySelector('[data-collapse-btn]');
    if (evalBtn) evalBtn.style.display = 'none';
    if (collapseBtn) collapseBtn.style.display = 'inline-flex';
  } else {
    tlState.openAnswers.delete(stdId);
    item.classList.remove('answer-open');

    const evalBtn = item.querySelector('[data-evaluate-btn]');
    const collapseBtn = item.querySelector('[data-collapse-btn]');
    if (evalBtn) evalBtn.style.display = 'inline-flex';
    if (collapseBtn) collapseBtn.style.display = 'none';
  }
}

/* Обновить бейдж «ОК / Не ОК / Значение» рядом с кнопкой Оценить */
function updateItemAnsweredBadge(item) {
  const stdId = item.dataset.stdId;
  const st = getStandards().find(s => s.id === stdId);
  if (!st) return;

  const actionsRow = item.querySelector('.tl-item-actions-row');
  if (!actionsRow) return;

  actionsRow.querySelectorAll('.tl-answered-badge').forEach(b => b.remove());

  let badge = null;

  // Top Losses всегда отвечает ОК / Не ОК (radio), независимо от типа контроля
  const checked = item.querySelector('input[data-ans]:checked');
  if (checked) {
    badge = checked.value === 'OK'
      ? { cls: 'tl-answered-badge-ok', text: '✓ ОК' }
      : { cls: 'tl-answered-badge-fail', text: '✕ Не ОК' };
  }

  if (badge) {
    const el = document.createElement('span');
    el.className = 'tl-answered-badge ' + badge.cls;
    el.textContent = badge.text;
    actionsRow.appendChild(el);
  }
}

/* Прогресс в футере + активность кнопки «Зафиксировать» */
function updateTlProgressFooter() {
  const footer = $('#tlFooter');
  const saveBtn = $('#tlSaveChecklistBtn');
  if (!footer || !saveBtn) return;

  const items = $$('#tlChecklistContainer .tl-acc-item');

  let filled = 0;
  let oks = 0;
  let fails = 0;

  items.forEach(item => {
    const status = item.dataset.status;
    if (status === 'ok') { filled++; oks++; }
    else if (status === 'fail') { filled++; fails++; }
  });

  const total = items.length;
  const pct = total > 0 ? Math.round((filled / total) * 100) : 0;

  footer.querySelectorAll('.tl-footer-progress').forEach(el => el.remove());

  if (filled > 0 && total > 0) {
    const unchecked = total - filled;
    const parts = [`Отмечено: ${filled} / ${total}`];
    if (oks > 0) parts.push(`ОК: ${oks}`);
    if (fails > 0) parts.push(`Не ОК: ${fails}`);
    if (unchecked > 0) parts.push(`не проверено: ${unchecked}`);

    const progressHtml = `
      <div class="tl-footer-progress">
        <div class="progress-bar-outer">
          <div class="progress-bar-inner" style="width:${pct}%"></div>
        </div>
        <div class="progress-text">${parts.join(' · ')}</div>
      </div>
    `;
    footer.insertAdjacentHTML('afterbegin', progressHtml);
    footer.classList.add('tl-footer-with-progress');
  } else {
    footer.classList.remove('tl-footer-with-progress');
  }

  saveBtn.disabled = filled === 0;
}

/* Переключение в режим проверки */
function startTopLossCheck() {
  tlState.checkMode = true;
  // Перерисовываем тот же список, но уже в режиме проверки
  renderTopLossChecklist(
    tlState.currentItems,
    tlState.currentStandardToLosses,
    tlState.currentLossIds
  );
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* Отмена проверки — возврат в режим просмотра */
function cancelTopLossCheck() {
  if (!confirm('Отменить проверку? Введённые ответы будут потеряны.')) return;
  tlState.checkMode = false;
  renderTopLossChecklist(
    tlState.currentItems,
    tlState.currentStandardToLosses,
    tlState.currentLossIds
  );
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ----------------------------------------
   Прогресс для чек-листа TOP Losses
   ---------------------------------------- */
function updateTlChecklistProgress() {
  const items = $$('#tlChecklistContainer .checklist-item');
  const wrap = $('#tlProgressWrap');
  const bar = $('#tlProgressBarInner');
  const percent = $('#tlProgressPercent');
  const text = $('#tlProgressText');

  if (!items.length) {
    if (wrap) wrap.style.display = 'none';
    if (text) text.style.display = 'none';
    return;
  }

  let filled = 0;
  items.forEach(item => {
    const std = getStandards().find(s => s.id === item.dataset.stdId);
    if (!std) return;
    // Top Losses всегда использует radio ОК/Не ОК
    if (item.querySelector('input[data-ans]:checked')) filled++;
  });

  const total = items.length;
  const pct = total > 0 ? Math.round((filled / total) * 100) : 0;

  if (wrap) wrap.style.display = 'flex';
  if (text) {
    text.style.display = 'block';
    text.textContent = `Заполнено ${filled} из ${total} пунктов`;
  }

  if (bar) {
    bar.style.width = pct + '%';
    bar.classList.remove('low', 'mid', 'high', 'done');
    if (pct === 100)     bar.classList.add('done');
    else if (pct >= 67)  bar.classList.add('high');
    else if (pct >= 34)  bar.classList.add('mid');
    else                 bar.classList.add('low');
  }
  if (percent) percent.textContent = pct + '%';
}

/* ----------------------------------------
   Сохранение проверки TOP Losses — Этап 4.2
   ---------------------------------------- */
function saveTopLossCheck() {
  const operator = ($('#tlOperator')?.value || '').trim();
  const line = $('#tlLine')?.value || '';
  const lossIds = [...tlState.selectedLossIds];

  // Валидация
  if (!operator) return showToast('Укажите ФИО оператора', true);
  if (!line)     return showToast('Укажите линию', true);
  if (!lossIds.length) return showToast('Не выбрано ни одной потери', true);

  // Собираем ответы
  const items = [];

  $$('#tlChecklistContainer .tl-acc-item').forEach(item => {
    const stdId = item.dataset.stdId;
    const st = getStandards().find(s => s.id === stdId);
    if (!st) return;

    let answer = '—';
    let status = 'UNCHECKED';

    // В TOP Losses всегда radio ОК / Не ОК
    const r = item.querySelector('input[data-ans]:checked');
    if (r) {
      answer = r.value === 'OK' ? 'ОК' : 'Не ОК';
      status = r.value;
    }

    const firstBlock = Array.isArray(st.measurements) && st.measurements[0];
    const mainValue = firstBlock && Array.isArray(firstBlock.points) && firstBlock.points[0]
      ? firstBlock.points[0].value || ''
      : '';

    items.push({
      standardId: st.id,
      number: st.number,
      oplNumber: st.oplNumber,
      machine: st.machine,
      node: st.node,
      nodePart: st.nodePart,
      title: st.title,
      controlType: 'fixed',   // Top Losses — всегда ОК/Не ОК (фиксированный без точек)
      norm: mainValue,
      answer: answer,
      status: status,
      comment: item.dataset.comment || ''
    });
  }); 

  // Сохраняем, только если есть хотя бы один отмеченный ответ
  const checkedCount = items.filter(it => it.status !== 'UNCHECKED').length;
  if (checkedCount === 0) {
    return showToast('Отметьте хотя бы один стандарт', true);
  }

  // Запись в Историю — mode: 'toploss'
  const record = {
    id: uid(),
    timestamp: new Date().toISOString(),
    mode: 'toploss',
    operator,
    line,
    topLosses: lossIds.slice(),
    items
  };

  const hist = getHistory();
  hist.push(record);
  setHistory(hist);
  updateNavHistoryCounter();

  showToast('Проверка сохранена');

  // Показываем экран резюме
  renderTopLossSummary(record);
}

/* ----------------------------------------
   Экран 3 — Резюме проверки
   ---------------------------------------- */
function renderTopLossSummary(record) {
  const container = $('#tlSummaryView');
  if (!container) return;

  // --- Статистика ---
  const selectedLosses = (record.topLosses || [])
    .map(id => findLossById(id))
    .filter(Boolean);

  // Карта: standardId → [lossId, ...]
  const stdToLosses = {};
  record.items.forEach(it => {
    const st = getStandards().find(s => s.id === it.standardId);
    if (st && Array.isArray(st.topLosses)) {
      stdToLosses[it.standardId] = st.topLosses.filter(lid =>
        record.topLosses.includes(lid)
      );
    } else {
      stdToLosses[it.standardId] = [];
    }
  });

  // Статистика по каждой потере
  const lossStats = selectedLosses.map(loss => {
    const relatedItems = record.items.filter(it =>
      (stdToLosses[it.standardId] || []).includes(loss.id)
    );

    const total = relatedItems.length;
    const oks = relatedItems.filter(it => it.status === 'OK').length;
    const fails = relatedItems.filter(it => it.status === 'FAIL').length;
    const unchecked = relatedItems.filter(it => it.status === 'UNCHECKED').length;
    const checkedTotal = oks + fails;
    // «Под контролем» — если все проверенные ОК и нет непроверенных
    const ok = fails === 0 && unchecked === 0 && total > 0;
    const failItems = relatedItems.filter(it => it.status === 'FAIL');

    return { loss, total, oks, fails, unchecked, checkedTotal, ok, failItems };
  });

  const totalItems = record.items.length;
  const totalFails = record.items.filter(it => it.status === 'FAIL').length;
  const totalOks = record.items.filter(it => it.status === 'OK').length;
  const totalUnchecked = record.items.filter(it => it.status === 'UNCHECKED').length;
  const checkedTotal = totalOks + totalFails;
  // Процент ОК — от проверенных
  const percentOk = checkedTotal > 0 ? Math.round((totalOks / checkedTotal) * 100) : 0;
  // Всё под контролем — если нет FAIL и нет непроверенных
  const allOk = totalFails === 0 && totalUnchecked === 0;

  // --- Верх: «щит контроля» с кольцом ---
  const shieldClass = allOk ? 'tl-shield-ok' : 'tl-shield-fail';
  const shieldTitle = allOk ? 'Потери под контролем' : 'Требуют внимания';

  const shieldSubParts = [];
  if (checkedTotal > 0) {
    shieldSubParts.push(`Проверено: <strong>${checkedTotal}</strong> из ${totalItems}`);
  }
  if (totalFails > 0) {
    shieldSubParts.push(`вне нормы: <strong>${totalFails}</strong>`);
  }
  if (totalUnchecked > 0) {
    shieldSubParts.push(`<span class="tl-shield-sub-unchecked">не проверено: ${totalUnchecked}</span>`);
  }
  const shieldSub = shieldSubParts.join(' · ');

  // Чипы-медальоны (первые 20, чтобы не заваливать экран)
  const chipItems = record.items.slice(0, 20);
  const chipsHtml = chipItems.map(it => {
    let cls;
    if (it.status === 'OK')          cls = 'tl-shield-chip-ok';
    else if (it.status === 'FAIL')   cls = 'tl-shield-chip-fail';
    else                             cls = 'tl-shield-chip-unchecked';

    const oplDisplay = it.machine
      ? `${it.oplNumber || it.number || '—'} [${it.machine}]`
      : (it.oplNumber || it.number || '—');
    return `<span class="tl-shield-chip ${cls}" title="${escapeAttr(it.title || '')}">
      <span class="tl-shield-chip-dot"></span>
      ${escapeHtml(oplDisplay)}
    </span>`;
  }).join('');
  const chipMore = record.items.length > 20
    ? `<span class="tl-shield-chip">+${record.items.length - 20}</span>`
    : '';

  // --- Средняя часть: плитки по потерям ---
  const lossTilesHtml = lossStats.map(s => {
    const cls = s.ok ? 'tl-loss-tile-ok' : 'tl-loss-tile-fail';

    const failsHtml = s.failItems.length ? `
      <div class="tl-loss-tile-fails">
        ${s.failItems.map(it => {
          const oplDisplay = it.machine
            ? `${it.oplNumber || it.number || '—'} [${it.machine}]`
            : (it.oplNumber || it.number || '—');
          return `
            <div class="tl-loss-tile-fail-row">
              <span class="tl-loss-tile-fail-opl">${escapeHtml(oplDisplay)}</span>
              <span class="tl-loss-tile-fail-title">${escapeHtml(it.title || '')}</span>
            </div>
          `;
        }).join('')}
      </div>
    ` : '';

    return `
      <div class="tl-loss-tile ${cls}">
        <div class="tl-loss-tile-head">
          <span class="tl-loss-tile-name">${escapeHtml(s.loss.name)}</span>
          <span class="tl-loss-tile-count">
            ${s.checkedTotal === 0
              ? 'не проверено'
              : `${s.oks} OK${s.fails > 0 ? ` · ${s.fails} Не ОК` : ''}${s.unchecked > 0 ? ` · ${s.unchecked} не проверено` : ''}`
            }
          </span>
        </div>
        ${failsHtml}
      </div>
    `;
  }).join('');

  // --- Итоговый HTML ---
  const html = `
    <div class="card tl-summary-card">
      <div class="tl-summary-head">
        <div class="tl-summary-icon tl-summary-icon-ok">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
        </div>
        <div>
          <div class="tl-summary-title">Проверка сохранена</div>
          <div class="tl-summary-sub">
            Оператор: <strong>${escapeHtml(record.operator)}</strong> ·
            Линия: <strong>${escapeHtml(record.line)}</strong> ·
            ${formatDateTime(record.timestamp)}
          </div>
        </div>
      </div>
    </div>

    <!-- Визуальный «щит» с кольцом -->
    <div class="tl-shield ${shieldClass}">
      <div class="tl-shield-ring" style="--percent: ${percentOk}">
        <div class="tl-shield-ring-hole">
          <div class="tl-shield-ring-value">${percentOk}%</div>
          <div class="tl-shield-ring-label">ОК</div>
        </div>
      </div>
      <div class="tl-shield-info">
        <div class="tl-shield-title">${shieldTitle}</div>
        <div class="tl-shield-sub">${shieldSubParts.join(' · ')}</div>
        ${totalFails > 0 ? `
          <div class="tl-shield-journal-warning">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            <span>Есть отклонения. Зафиксируйте их в <strong>Journal Machines</strong>.</span>
          </div>
        ` : ''}
        <div class="tl-shield-chips">
          ${chipsHtml}
          ${chipMore}
        </div>
      </div>
    </div>

    <!-- Плитки по потерям -->
    <div class="card">
      <h2>Детали по потерям</h2>
      <div class="tl-loss-tiles">${lossTilesHtml}</div>
    </div>

    <div class="tl-select-footer">
      <button class="btn btn-secondary" id="tlBackToListBtn">← К списку потерь</button>
      <button class="btn btn-primary btn-icon-text" id="tlCheckAnotherBtn">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="23 4 23 10 17 10"/>
          <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
        </svg>
        <span>Проверить ещё потерю</span>
      </button>
    </div>
  `;

  container.innerHTML = html;

  // Экраны
  $('#tlSelectView').style.display = 'none';
  $('#tlChecklistView').style.display = 'none';
  $('#tlSummaryView').style.display = 'block';

  // Обработчики кнопок
  $('#tlBackToListBtn')?.addEventListener('click', backToTopLossList);
  $('#tlCheckAnotherBtn')?.addEventListener('click', checkAnotherTopLoss);

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ----------------------------------------
   «← К списку потерь» — полный сброс
   ---------------------------------------- */
function backToTopLossList() {
  // Сбрасываем состояние
  tlState.openAnswers.clear();
  tlState.currentItems = [];
  tlState.currentStandardToLosses = {};
  tlState.currentLossIds = [];

  // Очищаем выбранные потери
  tlState.selectedLossIds.clear();
  tlState.expandedCategoryIds.clear();

  // Сбрасываем форму (оператор, линия)
  const opEl = $('#tlOperator');
  const lnEl = $('#tlLine');
  if (opEl) opEl.value = '';
  if (lnEl) lnEl.value = '';

  renderTopLossCategories();

  $('#tlSelectView').style.display = 'block';
  $('#tlChecklistView').style.display = 'none';
  $('#tlSummaryView').style.display = 'none';

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ----------------------------------------
   «Проверить ещё потерю» — сохраняем оператора/смену/линию
   ---------------------------------------- */
function checkAnotherTopLoss() {
  // Сбрасываем состояние
  tlState.openAnswers.clear();
  tlState.currentItems = [];
  tlState.currentStandardToLosses = {};
  tlState.currentLossIds = [];

  // Очищаем только выбранные потери
  tlState.selectedLossIds.clear();
  tlState.expandedCategoryIds.clear();

  // Форму НЕ трогаем: оператор/смена/линия остаются

  renderTopLossCategories();

  $('#tlSelectView').style.display = 'block';
  $('#tlChecklistView').style.display = 'none';
  $('#tlSummaryView').style.display = 'none';

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ----------------------------------------
   Возврат на экран выбора
   ---------------------------------------- */
function backToTopLossSelect() {
  // Сбрасываем раскрытые ответы и кэш
  tlState.openAnswers.clear();
  tlState.currentItems = [];
  tlState.currentStandardToLosses = {};
  tlState.currentLossIds = [];

  $('#tlSelectView').style.display = 'block';
  $('#tlChecklistView').style.display = 'none';
  $('#tlSummaryView').style.display = 'none';
}

/* ----------------------------------------
   Обработчики вкладки TOP Losses
   ---------------------------------------- */
$('#tlResetSelectionBtn')?.addEventListener('click', resetTopLossSelection);
$('#tlBuildChecklistBtn')?.addEventListener('click', buildTopLossChecklist);

/* Смена линии — пересчитываем счётчики и перерисовываем категории */
$('#tlLine')?.addEventListener('change', () => {
  // При смене линии сбрасываем выбранные потери:
  // могло оказаться, что для новой линии у потерь нет стандартов.
  tlState.selectedLossIds.clear();
  renderTopLossCategories();
});

/* ============================================================
   ВКЛАДКА НАСТРОЙКИ
   ============================================================ */
function renderSettings() {
  renderPhotoStorageSettings();
  renderBlocksSettings();
  renderElectronicShiftSettings();
  renderLineMachinesSettings();
  renderTopLossesSettings();
  renderBrandsSettings();
  renderCustomTriggersSettings();
  renderLineBrandsSettings();
  renderOperatorsSettings();
}
/* ============================================================
   ДАШБОРД
   ============================================================ */
function renderDashboardWorkshopBar() {
  const bar = $('#dashboardWorkshopBar');
  if (!bar) return;

  const workshops = getWorkshops();
  const tabs = [{ id: '', name: 'Общий' }].concat(
    workshops.map(w => ({ id: w.id, name: w.name }))
  );

  bar.innerHTML = tabs.map(t => {
    const active = t.id === dashboardWorkshop;
    return `<button type="button" class="dash-ws-tab ${active ? 'active' : ''}" data-dash-ws="${escapeAttr(t.id)}">${escapeHtml(t.name)}</button>`;
  }).join('');

  bar.querySelectorAll('[data-dash-ws]').forEach(btn => {
    btn.addEventListener('click', () => {
      const ws = btn.dataset.dashWs;
      if (ws === dashboardWorkshop) return;
      dashboardWorkshop = ws;
      try { localStorage.setItem('cl_dashboard_workshop', ws); } catch (e) {}
      renderDashboard();
    });
  });
}

function renderDashboard() {
  const container = $('#dashboardContent');
  if (!container) return;

  // Восстанавливаем выбранный цех
  dashboardWorkshop = localStorage.getItem('cl_dashboard_workshop') || '';

  // --- Панель выбора цеха ---
  renderDashboardWorkshopBar();

  const stats = calculateDashboardStats(dashboardWorkshop);

  container.innerHTML = `
    ${renderDashboardStats(stats)}
    ${renderDashboardMainBlock(stats)}
    ${renderDashboardSecondaryBlock(stats)}
    ${renderDashboardTertiaryBlock(stats)}
    ${renderDashboardAttention(stats.attentionItems)}
  `;

  // Кнопки «Открыть» в списке последних проверок
  container.querySelectorAll('[data-dash-open-record]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.dashOpenRecord;
      if (typeof viewRecord === 'function') viewRecord(id);
    });
  });

  // Быстрые действия
  container.querySelector('[data-dash-action="check"]')?.addEventListener('click', () => {
    if (typeof switchTab === 'function') switchTab('check');
  });
  container.querySelector('[data-dash-action="editor"]')?.addEventListener('click', () => {
    if (typeof switchTab === 'function') switchTab('editor');
  });
  container.querySelector('[data-dash-action="photos"]')?.addEventListener('click', () => {
    if (typeof switchTab === 'function') switchTab('settings');
    setTimeout(() => {
      const btn = $('#checkPhotosBtn');
      if (btn) btn.click();
    }, 200);
  });

  // --- Кнопки в блоке «Требует внимания» ---
  container.querySelectorAll('[data-dash-attention-btn]').forEach(btn => {
    btn.addEventListener('click', () => {
      const action = btn.dataset.dashAttentionBtn;
      if (action === 'editor') {
        if (typeof switchTab === 'function') switchTab('editor');
      } else if (action === 'settings') {
        if (typeof switchTab === 'function') switchTab('settings');
      } else if (action === 'photos-check') {
        if (typeof switchTab === 'function') switchTab('settings');
        setTimeout(() => {
          const pbtn = $('#checkPhotosBtn');
          if (pbtn) pbtn.click();
        }, 200);
      } else if (action === 'toploss') {
        if (typeof switchTab === 'function') switchTab('toploss');
      }
    });
  });
}

/* Третий блок: графики и быстрые действия */
function renderDashboardTertiaryBlock(stats) {
  return `
    <div class="dash-grid">
      <div>${renderDashboardDaysChart(stats.daysSeries, stats.daysSeriesMax)}</div>
      <div>${renderDashboardTypesDonut(stats.typeSegments, stats.typesTotal)}</div>
    </div>
    <div class="dash-grid">
      <div>${renderDashboardMachineStats(stats.machineStats)}</div>
      <div>${renderDashboardWeekDynamics(stats.weekStats)}</div>
    </div>
    <div class="dash-grid">
      <div>${renderDashboardTopLossesStats(stats.topLossStats)}</div>
      <div>${renderDashboardClParamStats(stats.clParamStats)}</div>
    </div>
    ${renderDashboardActions()}
  `;
}

/* Виджет: столбики по дням (7 дней, двухцветные) */
function renderDashboardDaysChart(series, maxCount) {
  if (!series.length) {
    return `
      <div class="dash-widget">
        <div class="dash-widget-title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="20" x2="18" y2="10"/>
            <line x1="12" y1="20" x2="12" y2="4"/>
            <line x1="6" y1="20" x2="6" y2="14"/>
          </svg>
          Проверки по дням (7 дней)
        </div>
        <div class="dash-widget-empty">Нет данных</div>
      </div>
    `;
  }

  const cols = series.map(d => {
    const isEmpty = d.total === 0;
    const heightPercent = maxCount > 0 ? (d.total / maxCount) * 100 : 0;

    // Пропорции зелёной и красной части в столбике
    const failShare = d.total > 0 ? (d.withFails / d.total) : 0;
    const okShare = 1 - failShare;

    // Общая высота столбика
    const barStyle = isEmpty ? '' : `height: ${Math.max(heightPercent, 4)}%;`;

    // Tooltip
    const tooltip = isEmpty
      ? `${d.label}: проверок не было`
      : `${d.label}: ${d.total} ${d.total === 1 ? 'проверка' : 'проверок'}, из них ${d.withFails} с отклонениями`;

    // Содержимое столбика — два сегмента (внутренний flex по вертикали)
    let inner = '';
    if (!isEmpty) {
      // Верх столбика — красный (fail), низ — зелёный (ok).
      // Это визуально удобно: положительный результат снизу, проблемы сверху — как в реальности.
      inner = `
        <div class="dash-day-bar-inner">
          ${d.withFails > 0 ? `<div class="dash-day-bar-fail" style="height:${failShare * 100}%"></div>` : ''}
          ${d.withoutFails > 0 ? `<div class="dash-day-bar-ok" style="height:${okShare * 100}%"></div>` : ''}
        </div>
      `;
    }

    return `
      <div class="dash-day-col">
        <div class="dash-day-bar-wrap" title="${escapeAttr(tooltip)}">
          ${d.total > 0 ? `<span class="dash-day-bar-value">${d.total}</span>` : ''}
          <div class="dash-day-bar ${isEmpty ? 'dash-day-bar-empty' : ''}" style="${barStyle}">
            ${inner}
          </div>
        </div>
        <span class="dash-day-label">${d.label}</span>
      </div>
    `;
  }).join('');

  return `
    <div class="dash-widget">
      <div class="dash-widget-title">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="20" x2="18" y2="10"/>
          <line x1="12" y1="20" x2="12" y2="4"/>
          <line x1="6" y1="20" x2="6" y2="14"/>
        </svg>
        Проверки по дням (7 дней)
      </div>
      <div class="dash-days-chart">${cols}</div>
    </div>
  `;
}
/* Виджет: Отклонения по машинам (30 дней) */
function renderDashboardMachineStats(items) {
  if (!items.length) {
    return `
      <div class="dash-widget">
        <div class="dash-widget-title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
          </svg>
          Отклонения по машинам (30 дней)
        </div>
        <div class="dash-widget-empty">Отклонений за месяц не зафиксировано</div>
      </div>
    `;
  }

  const rows = items.map(item => {
    const failsPct = item.percent;
    const oksPct = 100 - failsPct;

    const percentText = failsPct.toFixed(1) + '%';
    const numbersText = `${item.fails} из ${item.total}`;

    const failWidth = Math.max(failsPct, 1.5);

    return `
      <div class="dash-bar-item">
        <span class="dash-bar-label">${escapeHtml(item.machine)}</span>
        <div class="dash-bar-track dash-bar-track-ok">
          <div class="dash-bar-fill-ok" style="width:${oksPct}%"></div>
          <div class="dash-bar-fill-fail" style="width:${failWidth}%"></div>
        </div>
        <span class="dash-bar-value">
          ${percentText}
          <span class="dash-bar-sub">${numbersText}</span>
        </span>
      </div>
    `;
  }).join('');

  return `
    <div class="dash-widget">
      <div class="dash-widget-title">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
        </svg>
        Отклонения по машинам (30 дней)
      </div>
      <div class="dash-bars">${rows}</div>
    </div>
  `;
}
/* Виджет: Динамика % отклонений по ISO-неделям (4 недели) */
function renderDashboardWeekDynamics(items) {
  if (!items.length) {
    return `
      <div class="dash-widget">
        <div class="dash-widget-title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
          </svg>
          Динамика отклонений по неделям
        </div>
        <div class="dash-widget-empty">За последний месяц проверок не было</div>
      </div>
    `;
  }

  const rows = items.map(item => {
    const failsPct = item.percent;
    const oksPct = 100 - failsPct;

    const percentText = failsPct.toFixed(1) + '%';
    const numbersText = `${item.fails} из ${item.total}`;

    const failWidth = Math.max(failsPct, 1.5);

    const label = `${item.label} (${item.range})`;

    return `
      <div class="dash-bar-item dash-bar-item-week">
        <span class="dash-bar-label dash-bar-label-week" title="${escapeAttr(label)}">${escapeHtml(item.label)}</span>
        <div class="dash-bar-track dash-bar-track-ok">
          <div class="dash-bar-fill-ok" style="width:${oksPct}%"></div>
          <div class="dash-bar-fill-fail" style="width:${failWidth}%"></div>
        </div>
        <span class="dash-bar-value">
          ${percentText}
          <span class="dash-bar-sub">${numbersText}</span>
        </span>
      </div>
    `;
  }).join('');

  return `
    <div class="dash-widget">
      <div class="dash-widget-title">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
        </svg>
        Динамика отклонений по неделям
      </div>
      <div class="dash-bars">${rows}</div>
    </div>
  `;
}

/* Виджет: Топ-5 потерь по отклонениям (30 дней) */
function renderDashboardTopLossesStats(items) {
  if (!items.length) {
    return `
      <div class="dash-widget">
        <div class="dash-widget-title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          Топ-5 потерь по отклонениям (30 дней)
        </div>
        <div class="dash-widget-empty">Отклонений по потерям за месяц не зафиксировано</div>
      </div>
    `;
  }

  const rows = items.map(item => {
    const failsPct = item.percent;
    const oksPct = 100 - failsPct;

    const percentText = failsPct.toFixed(1) + '%';
    const numbersText = `${item.fails} из ${item.total}`;

    const failWidth = Math.max(failsPct, 1.5);

    return `
      <div class="dash-bar-item">
        <span class="dash-bar-label dash-bar-label-plain" title="${escapeAttr(item.name)}">${escapeHtml(item.name)}</span>
        <div class="dash-bar-track dash-bar-track-ok">
          <div class="dash-bar-fill-ok" style="width:${oksPct}%"></div>
          <div class="dash-bar-fill-fail" style="width:${failWidth}%"></div>
        </div>
        <span class="dash-bar-value">
          ${percentText}
          <span class="dash-bar-sub">${numbersText}</span>
        </span>
      </div>
    `;
  }).join('');

  return `
    <div class="dash-widget">
      <div class="dash-widget-title">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13"/>
          <line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
        Топ-5 потерь по отклонениям (30 дней)
      </div>
      <div class="dash-bars">${rows}</div>
    </div>
  `;
}

/* Виджет: Топ-5 параметров CL по отклонениям (30 дней) */
function renderDashboardClParamStats(items) {
  if (!items.length) {
    return `
      <div class="dash-widget">
        <div class="dash-widget-title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="19" y1="5" x2="5" y2="19"/>
            <circle cx="6.5" cy="6.5" r="2.5"/>
            <circle cx="17.5" cy="17.5" r="2.5"/>
          </svg>
          Топ-5 параметров по отклонениям (30 дней)
        </div>
        <div class="dash-widget-empty">Отклонений по параметрам CL за месяц не зафиксировано</div>
      </div>
    `;
  }

  const rows = items.map(item => {
    const failsPct = item.percent;
    const oksPct = 100 - failsPct;
    const percentText = failsPct.toFixed(1) + '%';
    const numbersText = `${item.fails} из ${item.total}`;
    const failWidth = Math.max(failsPct, 1.5);
    const label = item.machine ? `${item.name} [${item.machine}]` : item.name;

    return `
      <div class="dash-bar-item">
        <span class="dash-bar-label dash-bar-label-plain" title="${escapeAttr(label)}">${escapeHtml(label)}</span>
        <div class="dash-bar-track dash-bar-track-ok">
          <div class="dash-bar-fill-ok" style="width:${oksPct}%"></div>
          <div class="dash-bar-fill-fail" style="width:${failWidth}%"></div>
        </div>
        <span class="dash-bar-value">
          ${percentText}
          <span class="dash-bar-sub">${numbersText}</span>
        </span>
      </div>
    `;
  }).join('');

  return `
    <div class="dash-widget">
      <div class="dash-widget-title">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="19" y1="5" x2="5" y2="19"/>
          <circle cx="6.5" cy="6.5" r="2.5"/>
          <circle cx="17.5" cy="17.5" r="2.5"/>
        </svg>
        Топ-5 параметров по отклонениям (30 дней)
      </div>
      <div class="dash-bars">${rows}</div>
    </div>
  `;
}

/* Виджет: круговая по типам */
function renderDashboardTypesDonut(segments, total) {
  if (!total) {
    return `
      <div class="dash-widget">
        <div class="dash-widget-title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21.21 15.89A10 10 0 1 1 8 2.83"/>
            <path d="M22 12A10 10 0 0 0 12 2v10z"/>
          </svg>
          Типы переходов (30 дней)
        </div>
        <div class="dash-widget-empty">За месяц проверок не было</div>
      </div>
    `;
  }

  // Собираем conic-gradient
  const gradientStops = segments.map(s => {
    return `${s.color} ${s.startAngle}deg ${s.endAngle}deg`;
  }).join(', ');

  const legend = segments.map(s => `
    <div class="dash-legend-row">
      <span class="dash-legend-dot" style="background:${s.color}"></span>
      <span class="dash-legend-name">${escapeHtml(s.type)}</span>
      <span class="dash-legend-count">${s.count}</span>
      <span class="dash-legend-percent">${s.percent}%</span>
    </div>
  `).join('');

  return `
    <div class="dash-widget">
      <div class="dash-widget-title">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21.21 15.89A10 10 0 1 1 8 2.83"/>
          <path d="M22 12A10 10 0 0 0 12 2v10z"/>
        </svg>
        Типы переходов (30 дней)
      </div>
      <div class="dash-donut-wrap">
        <div class="dash-donut" style="background: conic-gradient(${gradientStops})">
          <div class="dash-donut-hole">
            <div class="dash-donut-total">${total}</div>
            <div class="dash-donut-label">проверок</div>
          </div>
        </div>
        <div class="dash-donut-legend">${legend}</div>
      </div>
    </div>
  `;
}

/* Виджет: быстрые действия */
function renderDashboardActions() {
  return `
    <div class="dash-widget">
      <div class="dash-widget-title">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
        </svg>
        Быстрые действия
      </div>
      <div class="dash-actions">
        <button class="dash-action-btn dash-action-green" data-dash-action="check" type="button">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
          <span>Начать проверку</span>
        </button>
        <button class="dash-action-btn" data-dash-action="editor" type="button">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
          </svg>
          <span>Открыть редактор</span>
        </button>
        <button class="dash-action-btn dash-action-purple" data-dash-action="photos" type="button">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            <circle cx="8.5" cy="8.5" r="1.5"/>
            <polyline points="21 15 16 10 5 21"/>
          </svg>
          <span>Проверить фото</span>
        </button>
      </div>
    </div>
  `;
}
/* Виджет: «Требует внимания» */
function renderDashboardAttention(items) {
  // Иконки для разных типов проблем
  const iconSvg = (key) => {
    switch (key) {
      case 'image':
        return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>';
      case 'image-off':
        return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="2" y1="2" x2="22" y2="22"/><path d="M10.41 10.41a2 2 0 1 1-2.83-2.83"/><line x1="13.5" y1="13.5" x2="6" y2="21"/><line x1="18" y1="12" x2="21" y2="15"/><path d="M3.59 3.59A2 2 0 0 0 3 5v14a2 2 0 0 0 2 2h14a2 2 0 0 0 1.41-.59"/></svg>';
      case 'clock':
        return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>';
      case 'user-x':
        return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="18" y1="8" x2="23" y2="13"/><line x1="23" y1="8" x2="18" y2="13"/></svg>';
      case 'message':
        return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';
      default:
        return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>';
    }
  };

  if (!items.length) {
    return `
      <div class="dash-widget dash-attention dash-attention-ok">
        <div class="dash-widget-title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
          Требует внимания
        </div>
        <div class="dash-attention-ok-text">
          ✅ Всё в порядке — проблем не обнаружено
        </div>
      </div>
    `;
  }

  const rows = items.map(it => `
    <div class="dash-attention-item" data-dash-attention="${it.action}">
      <span class="dash-attention-icon">${iconSvg(it.key === 'brokenPhotos' ? 'image' : it.icon)}</span>
      <div class="dash-attention-text">
        <div class="dash-attention-main">${escapeHtml(it.text)}</div>
        <div class="dash-attention-hint">${escapeHtml(it.hint)}</div>
      </div>
      <button class="dash-attention-btn" type="button" data-dash-attention-btn="${it.action}">
        Перейти →
      </button>
    </div>
  `).join('');

  return `
    <div class="dash-widget dash-attention">
      <div class="dash-widget-title">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13"/>
          <line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
        Требует внимания (${items.length})
      </div>
      <div class="dash-attention-list">${rows}</div>
    </div>
  `;
}
/* Двухколоночный блок (шаг 3) */
function renderDashboardMainBlock(stats) {
  return `
    <div class="dash-grid">
      <div>${renderDashboardRecentChecks(stats.recentChecks)}</div>
      <div>${renderDashboardTopProblems(stats.topProblems, stats.topProblemsMax)}</div>
    </div>
  `;
}

/* Второй двухколоночный блок: линии + операторы */
function renderDashboardSecondaryBlock(stats) {
  return `
    <div class="dash-grid">
      <div>${renderDashboardLineStats(stats.lineStats)}</div>
      <div>${renderDashboardOperatorStats(stats.operatorStats)}</div>
    </div>
  `;
}

/* Виджет: % отклонений по линиям (7 дней) — двухцветный бар */
function renderDashboardLineStats(items) {
  if (!items.length) {
    return `
      <div class="dash-widget">
        <div class="dash-widget-title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="20" x2="18" y2="10"/>
            <line x1="12" y1="20" x2="12" y2="4"/>
            <line x1="6" y1="20" x2="6" y2="14"/>
          </svg>
          Отклонения по линиям (7 дней)
        </div>
        <div class="dash-widget-empty">За неделю проверок не было</div>
      </div>
    `;
  }

  const rows = items.map(item => {
    // Процент ОК и процент отклонений — сумма всегда 100
    const failsPct = item.total > 0 ? (item.fails / item.total) * 100 : 0;
    const oksPct = 100 - failsPct;

    const percentText = failsPct.toFixed(1) + '%';
    const numbersText = `${item.fails} из ${item.total}`;

    // Красная часть — узкая, если 0% — не показываем вообще
    const failWidth = failsPct > 0 ? Math.max(failsPct, 1.5) : 0; // мин. 1.5% — чтобы тонкая полоска была видна

    return `
      <div class="dash-bar-item">
        <span class="dash-bar-label">${escapeHtml(item.line)}</span>
        <div class="dash-bar-track dash-bar-track-ok">
          <div class="dash-bar-fill-ok" style="width:${oksPct}%"></div>
          <div class="dash-bar-fill-fail" style="width:${failWidth}%"></div>
        </div>
        <span class="dash-bar-value">
          ${percentText}
          <span class="dash-bar-sub">${numbersText}</span>
        </span>
      </div>
    `;
  }).join('');

  return `
    <div class="dash-widget">
      <div class="dash-widget-title">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="20" x2="18" y2="10"/>
          <line x1="12" y1="20" x2="12" y2="4"/>
          <line x1="6" y1="20" x2="6" y2="14"/>
        </svg>
        Отклонения по линиям (7 дней)
      </div>
      <div class="dash-bars">${rows}</div>
    </div>
  `;
}

/* Виджет: Топ операторов по отклонениям (30 дней) */
function renderDashboardOperatorStats(items) {
  if (!items.length) {
    return `
      <div class="dash-widget">
        <div class="dash-widget-title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
          Топ операторов по отклонениям (30 дней)
        </div>
        <div class="dash-widget-empty">Отклонений за месяц не зафиксировано</div>
      </div>
    `;
  }

  const rows = items.map(item => {
    const failsPct = item.percent;
    const oksPct = 100 - failsPct;

    const percentText = failsPct.toFixed(1) + '%';
    const numbersText = `${item.fails} из ${item.total}`;

    // Минимальная ширина красной части, чтобы тонкая полоска была заметна
    const failWidth = Math.max(failsPct, 1.5);

    return `
      <div class="dash-bar-item">
        <span class="dash-bar-label dash-bar-label-plain" title="${escapeAttr(item.name)}">${escapeHtml(item.name)}</span>
        <div class="dash-bar-track dash-bar-track-ok">
          <div class="dash-bar-fill-ok" style="width:${oksPct}%"></div>
          <div class="dash-bar-fill-fail" style="width:${failWidth}%"></div>
        </div>
        <span class="dash-bar-value">
          ${percentText}
          <span class="dash-bar-sub">${numbersText}</span>
        </span>
      </div>
    `;
  }).join('');

  return `
    <div class="dash-widget">
      <div class="dash-widget-title">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
        Топ операторов по отклонениям (30 дней)
      </div>
      <div class="dash-bars">${rows}</div>
    </div>
  `;
}

/* Виджет: последние 5 проверок */
function renderDashboardRecentChecks(checks) {
  if (!checks.length) {
    return `
      <div class="dash-widget">
        <div class="dash-widget-title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
          </svg>
          Последние проверки
        </div>
        <div class="dash-widget-empty">Проверок пока нет</div>
      </div>
    `;
  }

  const rows = checks.map(c => {
    const failsHtml = c.fails > 0
      ? `<span class="badge badge-fail">${c.fails}</span>`
      : `<span class="badge badge-ok">0</span>`;
    return `
      <tr>
        <td class="dash-recent-date">${fmtDate(c.timestamp)}</td>
        <td class="dash-recent-line">${escapeHtml(c.line)}</td>
        <td class="dash-recent-operator">${escapeHtml(c.operator)}</td>
        <td>${escapeHtml(c.type)}</td>
        <td class="dash-recent-fails">${failsHtml}</td>
        <td style="text-align:right">
          <button class="dash-recent-btn" data-dash-open-record="${escapeAttr(c.id)}">Открыть</button>
        </td>
      </tr>
    `;
  }).join('');

  return `
    <div class="dash-widget">
      <div class="dash-widget-title">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <polyline points="12 6 12 12 16 14"/>
        </svg>
        Последние проверки
      </div>
      <table class="dash-recent">
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

/* Виджет: топ-5 проблемных стандартов */
function renderDashboardTopProblems(problems, maxCount) {
  if (!problems.length) {
    return `
      <div class="dash-widget">
        <div class="dash-widget-title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          Топ проблемных стандартов
        </div>
        <div class="dash-widget-empty">Отклонений за месяц не зафиксировано</div>
      </div>
    `;
  }

  const items = problems.map(p => {
    const width = maxCount > 0 ? Math.round((p.count / maxCount) * 100) : 0;
    // Показываем OPL + машину, если машина есть
    const oplDisplay = p.machine
      ? `${p.opl} [${p.machine}]`
      : p.opl;

    return `
      <div class="dash-top-item">
        <div class="dash-top-head">
          <span class="dash-top-opl">${escapeHtml(oplDisplay)}</span>
          <span class="dash-top-title" title="${escapeAttr(p.title)}">${escapeHtml(p.title || '—')}</span>
          <span class="dash-top-count">${p.count} откл.</span>
        </div>
        <div class="dash-top-bar-outer">
          <div class="dash-top-bar-inner" style="width:${width}%"></div>
        </div>
      </div>
    `;
  }).join('');

  return `
    <div class="dash-widget">
      <div class="dash-widget-title">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13"/>
          <line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
        Топ проблемных стандартов (30 дней)
      </div>
      <div class="dash-top-list">${items}</div>
    </div>
  `;
}

/* Расчёт всех показателей дашборда */
function calculateDashboardStats(workshopId) {
  let standards = getStandards();
  let history = getHistory();
  const brands = getBrands();
  const operators = getOperators();

  // --- Фильтр по цеху: оставляем только линии выбранного цеха ---
  if (workshopId) {
    standards = standards.filter(s => getWorkshopIdForLine(s.line) === workshopId);
    history = history.filter(h => getWorkshopIdForLine(h.line) === workshopId);
  }

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekAgo = new Date(now.getTime() - 7 * 24 * 3600 * 1000);

  // --- Стандарты ---
  const totalStandards = standards.length;
  const activeStandards = standards.filter(s => s.active !== false).length;

  // --- Проверки за сегодня ---
  const checksToday = history.filter(h => {
    const ts = new Date(h.timestamp);
    return ts >= todayStart;
  }).length;

  // --- Отклонения за неделю (сумма всех «Не ОК» по всем проверкам) ---
  const checksWeek = history.filter(h => {
    const ts = new Date(h.timestamp);
    return ts >= weekAgo;
  });
    // --- Проверок потерь за неделю ---
  const topLossChecksWeek = checksWeek.filter(h => h.mode === 'toploss').length;
    // --- Проверок CL (мех + электро) за неделю ---
  const clChecksWeek = checksWeek.filter(h => h.mode === 'cl' || h.mode === 'electronic').length;

  // --- Топ-5 потерь по отклонениям (30 дней) ---
  const monthAgoForLosses = new Date(now.getTime() - 30 * 24 * 3600 * 1000);
  const monthChecksForLosses = history.filter(h =>
    h.mode === 'toploss' &&
    new Date(h.timestamp) >= monthAgoForLosses
  );

  // { lossId: { total, fails, name } }
  const lossAgg = {};
  monthChecksForLosses.forEach(h => {
    h.items.forEach(it => {
      const st = standards.find(s => s.id === it.standardId);
      if (!st || !Array.isArray(st.topLosses)) return;
      st.topLosses.forEach(lid => {
        // учитываем только те потери, что были выбраны в этой проверке
        if (!(h.topLosses || []).includes(lid)) return;
        if (!lossAgg[lid]) {
          const l = findLossById(lid);
          lossAgg[lid] = { name: l ? l.name : lid, total: 0, fails: 0 };
        }
        lossAgg[lid].total++;
        if (it.status === 'FAIL') lossAgg[lid].fails++;
      });
    });
  });

  const topLossStats = Object.entries(lossAgg)
    .map(([id, v]) => ({
      id,
      name: v.name,
      total: v.total,
      fails: v.fails,
      percent: v.total > 0 ? (v.fails / v.total) * 100 : 0
    }))
    .filter(x => x.fails > 0)
    .sort((a, b) => b.fails - a.fails)
    .slice(0, 5);

  // --- Топ-5 параметров CL (мех + электро) по отклонениям (30 дней) ---
  const clMonthParamChecks = history.filter(h =>
    (h.mode === 'cl' || h.mode === 'electronic') &&
    new Date(h.timestamp) >= monthAgoForLosses
  );
  const clParamAgg = {};
  clMonthParamChecks.forEach(h => {
    h.items.forEach(it => {
      const isElec = h.mode === 'electronic';
      const name = isElec ? (it.paramName || '—') : (it.title || it.oplNumber || '—');
      const key = it.machine ? name + ' [' + it.machine + ']' : name;
      if (!clParamAgg[key]) clParamAgg[key] = { name: name, machine: it.machine || '', total: 0, fails: 0 };
      clParamAgg[key].total++;
      if (it.status === 'FAIL') clParamAgg[key].fails++;
    });
  });
  const clParamStats = Object.values(clParamAgg)
    .map(function(v) { return { name: v.name, machine: v.machine, total: v.total, fails: v.fails, percent: v.total > 0 ? (v.fails / v.total) * 100 : 0 }; })
    .filter(function(v) { return v.fails > 0; })
    .sort(function(a, b) { return b.fails - a.fails; })
    .slice(0, 5);

  // --- Потери без проверок за 30 дней ---
  const allLosses = getAllLossItems();
  const checkedLossIds = new Set();
  monthChecksForLosses.forEach(h => {
    (h.topLosses || []).forEach(lid => checkedLossIds.add(lid));
  });
  const lossesNeverChecked = allLosses.filter(l => !checkedLossIds.has(l.id)).length;

  // --- Стандарты без связи с потерями (активные, topLosses пуст) ---
  const standardsWithoutLosses = standards.filter(s =>
    s.active !== false &&
    (!Array.isArray(s.topLosses) || s.topLosses.length === 0)
  ).length;
  const failsWeek = checksWeek.reduce((sum, h) => {
    return sum + h.items.filter(i => i.status === 'FAIL').length;
  }, 0);
  const checksWeekCount = checksWeek.length;

  // --- Фото ---
  const totalPhotos = standards.reduce((sum, s) => {
    return sum + (Array.isArray(s.photos) ? s.photos.length : 0);
  }, 0);
  const standardsWithPhoto = standards.filter(s =>
    Array.isArray(s.photos) && s.photos.length > 0
  ).length;
  const photoCoverage = totalStandards > 0
    ? Math.round((standardsWithPhoto / totalStandards) * 100)
    : 0;

  // --- Последние 5 проверок ---
  const recentChecks = [...history]
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, 5)
    .map(h => ({
      id: h.id,
      timestamp: h.timestamp,
      line: h.line,
      operator: h.operator,
      type: h.type,
      fails: h.items.filter(i => i.status === 'FAIL').length
    }));

  // --- Топ-5 проблемных стандартов за месяц ---
  const monthAgo = new Date(now.getTime() - 30 * 24 * 3600 * 1000);
  const monthChecks = history.filter(h => new Date(h.timestamp) >= monthAgo);

  const stdFails = {};   // ключ = "OPL [machine]"
  monthChecks.forEach(h => {
    h.items.forEach(it => {
      if (it.status !== 'FAIL') return;

      const oplNumber = it.oplNumber || it.number || '—';
      const machine = it.machine || '';
      // Ключ: OPL + машина — чтобы одинаковые OPL на разных машинах не сливались
      const key = machine ? `${oplNumber} [${machine}]` : oplNumber;

      if (!stdFails[key]) {
        stdFails[key] = {
          opl: oplNumber,
          machine: machine,
          title: it.title || '',
          node: it.node || '',
          line: h.line || '',
          count: 0
        };
      }
      stdFails[key].count++;
    });
  });

  const topProblems = Object.values(stdFails)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Максимум для расчёта ширины баров
  const topProblemsMax = topProblems.length ? topProblems[0].count : 1;

  // --- % отклонений по линиям за неделю ---
  const lineCounts = {};   // { line: { total: N, fails: N } }
  checksWeek.forEach(h => {
    const line = h.line || '—';
    if (!lineCounts[line]) lineCounts[line] = { total: 0, fails: 0 };
    lineCounts[line].total += h.items.length;
    lineCounts[line].fails += h.items.filter(i => i.status === 'FAIL').length;
  });
  const lineStats = Object.entries(lineCounts)
    .map(([line, v]) => ({
      line,
      total: v.total,
      fails: v.fails,
      percent: v.total > 0 ? (v.fails / v.total) * 100 : 0
    }))
    .sort((a, b) => b.percent - a.percent);   // худшие сверху

  // --- Топ операторов по отклонениям (30 дней) ---
  const opCounts = {};   // { operator: { total: N, fails: N } }
  monthChecks.forEach(h => {
    const op = h.operator || '—';
    if (!opCounts[op]) opCounts[op] = { total: 0, fails: 0 };
    opCounts[op].total += h.items.length;
    opCounts[op].fails += h.items.filter(i => i.status === 'FAIL').length;
  });
  // Оставляем только тех, у кого есть хотя бы 1 отклонение
  const operatorStats = Object.entries(opCounts)
    .filter(([_, v]) => v.fails > 0)
    .map(([name, v]) => ({
      name,
      total: v.total,
      fails: v.fails,
      percent: v.total > 0 ? (v.fails / v.total) * 100 : 0
    }))
    .sort((a, b) => b.percent - a.percent)   // худшие сверху
    .slice(0, 5);

  // --- Столбики по дням (7 дней, двухцветные) ---
  const daysSeries = [];
  for (let i = 6; i >= 0; i--) {
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const dayEnd = new Date(dayStart.getTime() + 24 * 3600 * 1000);
    const dayChecks = history.filter(h => {
      const ts = new Date(h.timestamp);
      return ts >= dayStart && ts < dayEnd;
    });

    // Проверка "с отклонениями" = есть хотя бы один FAIL в items
    const withFails = dayChecks.filter(h =>
      h.items.some(i => i.status === 'FAIL')
    ).length;
    const withoutFails = dayChecks.length - withFails;

    // Подпись: день + месяц, например «24.09»
    const dd = String(dayStart.getDate()).padStart(2, '0');
    const mm = String(dayStart.getMonth() + 1).padStart(2, '0');

    daysSeries.push({
      label: `${dd}.${mm}`,
      date: dayStart,
      total: dayChecks.length,
      withFails,
      withoutFails
    });
  }
  const daysSeriesMax = daysSeries.reduce((max, d) => Math.max(max, d.total), 0) || 1;

  // --- Круговая по типам переходов (30 дней) ---
  const typeCounts = { ChangeOver: 0, CL_TO: 0, CL_Conversion: 0 };
  monthChecks.forEach(h => {
    if (h.type && typeCounts[h.type] !== undefined) {
      typeCounts[h.type]++;
    }
  });
  const typesTotal = typeCounts.ChangeOver + typeCounts.CL_TO + typeCounts.CL_Conversion;

  // Проценты для conic-gradient
  const typeColors = {
    ChangeOver: '#00d4ff',
    CL_TO: '#7b5cff',
    CL_Conversion: '#10b981'
  };
  let acc = 0;
  const typeSegments = [];
  ['ChangeOver', 'CL_TO', 'CL_Conversion'].forEach(type => {
    const count = typeCounts[type];
    const percent = typesTotal > 0 ? (count / typesTotal) * 360 : 0;
    typeSegments.push({
      type,
      count,
      color: typeColors[type],
      startAngle: acc,
      endAngle: acc + percent,
      percent: typesTotal > 0 ? Math.round((count / typesTotal) * 100) : 0
    });
    acc += percent;
  });
  // --- Отклонения по машинам (30 дней) ---
  const machineCounts = {};
  monthChecks.forEach(h => {
    h.items.forEach(it => {
      const m = it.machine || '—';
      if (!machineCounts[m]) machineCounts[m] = { total: 0, fails: 0 };
      machineCounts[m].total++;
      if (it.status === 'FAIL') machineCounts[m].fails++;
    });
  });
  const machineStats = Object.entries(machineCounts)
    .map(([machine, v]) => ({
      machine,
      total: v.total,
      fails: v.fails,
      percent: v.total > 0 ? (v.fails / v.total) * 100 : 0
    }))
    .filter(m => m.fails > 0)
    .sort((a, b) => b.fails - a.fails)
    .slice(0, 5);

  // --- Динамика по ISO-неделям (4 последние) ---
  const getIsoWeek = (date) => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNum = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return { year: d.getUTCFullYear(), week: weekNum };
  };

  const getIsoWeekRange = (year, week) => {
    const jan4 = new Date(Date.UTC(year, 0, 4));
    const jan4Day = jan4.getUTCDay() || 7;
    const week1Mon = new Date(jan4.getTime() - (jan4Day - 1) * 86400000);
    const mon = new Date(week1Mon.getTime() + (week - 1) * 7 * 86400000);
    const sun = new Date(mon.getTime() + 6 * 86400000);
    return { mon, sun };
  };

  const nowForWeeks = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const currentWeek = getIsoWeek(nowForWeeks);

  const weekStats = [];
  for (let i = 0; i < 4; i++) {
    let w = currentWeek.week - i;
    let y = currentWeek.year;
    while (w < 1) {
      y -= 1;
      w += 52;
    }

    const { mon, sun } = getIsoWeekRange(y, w);
    const upperBound = i === 0
      ? new Date(nowForWeeks.getTime() + 86400000)
      : new Date(sun.getTime() + 86400000);

    const weekChecks = history.filter(h => {
      const ts = new Date(h.timestamp);
      return ts >= mon && ts < upperBound;
    });

    const total = weekChecks.reduce((s, h) => s + h.items.length, 0);
    const fails = weekChecks.reduce((s, h) => s + h.items.filter(it => it.status === 'FAIL').length, 0);
    const checksCount = weekChecks.length;

    const fmtShort = (d) => {
      const dd = String(d.getUTCDate()).padStart(2, '0');
      const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
      return `${dd}.${mm}`;
    };
    const rangeText = `${fmtShort(mon)}–${fmtShort(sun)}`;

    weekStats.push({
      week: w,
      year: y,
      label: `W${w}`,
      range: rangeText,
      total,
      fails,
      checksCount,
      percent: total > 0 ? (fails / total) * 100 : 0
    });
  }
  const weekStatsFiltered = weekStats.filter(w => w.checksCount > 0);
    // --- «Требует внимания» — агрегируем проблемы ---
  const monthAgo2 = new Date(now.getTime() - 30 * 24 * 3600 * 1000);

  // 1) Битые ссылки (из localStorage, обновляется при «Проверить фото»)
  const brokenPhotosCount = parseInt(localStorage.getItem('cl_photos_broken_count') || '0', 10);

  // 2) Стандарты без фото (только активные — неактивные не важны)
  const activeStandardsList = standards.filter(s => s.active !== false);
  const standardsWithoutPhoto = activeStandardsList.filter(s =>
    !Array.isArray(s.photos) || s.photos.length === 0
  ).length;

  // 3) Стандарты без проверок за 30 дней
  // Собираем все standardId, которые встречались в истории за 30 дней
  const usedStandardIds = new Set();
  history.forEach(h => {
    if (new Date(h.timestamp) < monthAgo2) return;
    h.items.forEach(it => {
      if (it.standardId) usedStandardIds.add(it.standardId);
    });
  });
  const standardsNeverChecked = activeStandardsList.filter(s =>
    !usedStandardIds.has(s.id)
  ).length;

  // 4) Операторы без активности 7 дней
  const activeOperators = new Set();
  history.forEach(h => {
    if (new Date(h.timestamp) < weekAgo) return;
    if (h.operator) activeOperators.add(h.operator);
  });
  const operatorsInactive = operators.filter(o =>
    !activeOperators.has(o)
  ).length;

  // 5) Стандарты с комментарием к деактивации (деактивированы, но с записанной причиной)
  const standardsWithDeactivationComment = standards.filter(s =>
    s.active === false &&
    s.deactivationComment &&
    s.deactivationComment.trim() !== ''
  ).length;

  const attentionItems = [];
  if (brokenPhotosCount > 0) {
    attentionItems.push({
      key: 'brokenPhotos',
      icon: 'image',
      text: `Битых ссылок на фото: ${brokenPhotosCount}`,
      hint: 'Проверьте фотографии в Настройках',
      action: 'photos-check'
    });
  }
  if (standardsWithoutPhoto > 0) {
    attentionItems.push({
      key: 'noPhoto',
      icon: 'image-off',
      text: `Активных стандартов без фото: ${standardsWithoutPhoto}`,
      hint: 'Добавьте фото в редакторе стандартов',
      action: 'editor'
    });
  }
  if (standardsNeverChecked > 0) {
    attentionItems.push({
      key: 'neverChecked',
      icon: 'clock',
      text: `Стандартов не проверялись более 30 дней: ${standardsNeverChecked}`,
      hint: 'Проверьте, актуальны ли они',
      action: 'editor'
    });
  }
  if (operatorsInactive > 0) {
    attentionItems.push({
      key: 'opInactive',
      icon: 'user-x',
      text: `Операторов без активности >7 дней: ${operatorsInactive}`,
      hint: 'Из общего списка операторов',
      action: 'settings'
    });
  }
  if (standardsWithDeactivationComment > 0) {
    attentionItems.push({
      key: 'deactComment',
      icon: 'message',
      text: `Деактивированных стандартов с комментарием: ${standardsWithDeactivationComment}`,
      hint: 'Возможно, пора вернуть их в работу',
      action: 'editor'
    });
  }
    if (lossesNeverChecked > 0) {
    attentionItems.push({
      key: 'lossesNeverChecked',
      icon: 'clock',
      text: `Потерь без проверок >30 дней: ${lossesNeverChecked}`,
      hint: 'Откройте вкладку TOP Losses и проведите проверку',
      action: 'toploss'
    });
  }
  if (standardsWithoutLosses > 0) {
    attentionItems.push({
      key: 'standardsWithoutLosses',
      icon: 'message',
      text: `Стандартов без связи с потерями: ${standardsWithoutLosses}`,
      hint: 'Привяжите их к потерям в редакторе стандартов',
      action: 'editor'
    });
  }
  return {
    totalStandards,
    activeStandards,
    checksToday,
    failsWeek,
    checksWeek,
    checksWeekCount,
    totalPhotos,
    standardsWithPhoto,
    photoCoverage,
    totalBrands: brands.length,
    totalOperators: operators.length,

    recentChecks,
    topProblems,
    topProblemsMax,
    lineStats,
    operatorStats,
    daysSeries,
    daysSeriesMax,
    typeSegments,
    typesTotal,
    attentionItems,

    // --- НОВОЕ ---
    machineStats,
    weekStats: weekStatsFiltered,

    // --- TOP LOSSES ---
    topLossChecksWeek,
    topLossStats,
    lossesNeverChecked,
    standardsWithoutLosses,

    // --- CL (мех + электро) ---
    clChecksWeek,
    clParamStats
  };
}

/* Отрисовка верхнего ряда карточек */
function renderDashboardStats(stats) {
  return `
    <div class="dash-stats">

      <div class="dash-stat">
        <div class="dash-stat-head">
          <span>Стандарты активные</span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
          </svg>
        </div>
        <div class="dash-stat-value">${stats.activeStandards}</div>
        <div class="dash-stat-sub">из <strong>${stats.totalStandards}</strong> всего</div>
      </div>

      <div class="dash-stat dash-stat-green">
        <div class="dash-stat-head">
          <span>Проверок сегодня</span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
        </div>
        <div class="dash-stat-value">${stats.checksToday}</div>
        <div class="dash-stat-sub">за текущие сутки</div>
      </div>

      <div class="dash-stat dash-stat-cyan">
        <div class="dash-stat-head">
          <span>Проверок за неделю</span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="20" x2="18" y2="10"/>
            <line x1="12" y1="20" x2="12" y2="4"/>
            <line x1="6" y1="20" x2="6" y2="14"/>
          </svg>
        </div>
        <div class="dash-stat-value">${stats.checksWeekCount}</div>
        <div class="dash-stat-sub">за последние 7 дней</div>
      </div>

      <div class="dash-stat dash-stat-red">
        <div class="dash-stat-head">
          <span>Отклонений</span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
        </div>
        <div class="dash-stat-value">${stats.failsWeek}</div>
        <div class="dash-stat-sub">за последние 7 дней</div>
      </div>

<div class="dash-stat dash-stat-amber">
        <div class="dash-stat-head">
          <span>Проверок потерь</span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
        </div>
        <div class="dash-stat-value">${stats.topLossChecksWeek}</div>
        <div class="dash-stat-sub">за последние 7 дней</div>
      </div>

      <div class="dash-stat dash-stat-purple">
        <div class="dash-stat-head">
          <span>Проверок CL</span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
          </svg>
        </div>
        <div class="dash-stat-value">${stats.clChecksWeek}</div>
        <div class="dash-stat-sub">за последние 7 дней</div>
      </div>

    </div>
  `;
}
/* ============================================================
   СЧЁТЧИКИ В SIDEBAR
   ============================================================ */

/* Обновить счётчик записей за сегодня в пункте «История» */
function updateNavHistoryCounter() {
  const el = $('#navHistoryCounter');
  if (!el) return;

  const history = getHistory();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const todayCount = history.filter(h => {
    const ts = new Date(h.timestamp);
    return ts >= todayStart;
  }).length;

  if (todayCount > 0) {
    el.textContent = todayCount;
    el.style.display = '';
  } else {
    el.style.display = 'none';
  }
}

/* Обновить бейдж проблем в пункте «Настройки» */
function updateNavSettingsBadge() {
  const el = $('#navSettingsBadge');
  if (!el) return;

  const brokenCount = parseInt(localStorage.getItem('cl_photos_broken_count') || '0', 10);

  if (brokenCount > 0) {
    el.textContent = '!';
    el.title = `Есть битые ссылки на фото (${brokenCount}). Зайдите в Настройки → Проверить фото.`;
    el.style.display = '';
  } else {
    el.style.display = 'none';
  }
}

/* Обновить оба счётчика */
function updateNavCounters() {
  updateNavHistoryCounter();
  updateNavSettingsBadge();
}
/* ============================================================
   КАРТОЧКА «ХРАНИЛИЩЕ ФОТО»
   ============================================================ */
function renderPhotoStorageSettings() {
  const standards = getStandards();

  // Стандарты, у которых есть хотя бы одно фото
  const standardsWithPhotos = standards.filter(s =>
    Array.isArray(s.photos) && s.photos.length > 0
  ).length;

  // Всего фото (сумма по всем стандартам)
  const totalPhotos = standards.reduce((sum, s) => {
    return sum + (Array.isArray(s.photos) ? s.photos.length : 0);
  }, 0);

  const statsStandards = $('#photoStatsStandards');
  const statsTotal = $('#photoStatsTotal');
  if (statsStandards) statsStandards.textContent = standardsWithPhotos;
  if (statsTotal) statsTotal.textContent = totalPhotos;
}
/* ============================================================
   ПРОВЕРКА ФОТОГРАФИЙ НА БИТЫЕ ССЫЛКИ
   ============================================================ */

/* Проверить, доступен ли файл по пути */
function checkPhotoExists(path) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload  = () => resolve({ path, ok: true });
    img.onerror = () => resolve({ path, ok: false });
    img.src = path;
  });
}

/* Запустить проверку всех фото */
async function runPhotosCheck() {
  const standards = getStandards();

  // Собираем список всех фото для проверки
  const allPhotos = [];
  standards.forEach(st => {
    if (!Array.isArray(st.photos) || !st.photos.length) return;
    st.photos.forEach(name => {
      const path = getPhotoPath(st, name);
      if (path) {
        allPhotos.push({
          path,
          name,
          standardId: st.id,
          line: st.line || '—',
          part: st.nodePart || '—',
          oplNumber: st.oplNumber || '—',
          title: st.title || '—'
        });
      }
    });
  });

  if (!allPhotos.length) {
    return {
      total: 0,
      ok: 0,
      fail: 0,
      broken: []
    };
  }

  // Проверяем пакетами (по 10 одновременно)
  const BATCH_SIZE = 10;
  const results = [];

  for (let i = 0; i < allPhotos.length; i += BATCH_SIZE) {
    const batch = allPhotos.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map(info => checkPhotoExists(info.path).then(r => ({ ...info, ok: r.ok })))
    );
    results.push(...batchResults);
  }

  const broken = results.filter(r => !r.ok);
  return {
    total: results.length,
    ok: results.length - broken.length,
    fail: broken.length,
    broken
  };
}

/* Показать результат проверки в модалке */
function renderPhotosCheckResult(result) {
  const body = $('#checkPhotosModalBody');
  if (!body) return;

  let html = `
    <div class="cp-summary">
      <div class="cp-stat cp-stat-total">
        <div class="cp-stat-value">${result.total}</div>
        <div class="cp-stat-label">Всего проверено</div>
      </div>
      <div class="cp-stat cp-stat-ok">
        <div class="cp-stat-value">${result.ok}</div>
        <div class="cp-stat-label">Найдено</div>
      </div>
      <div class="cp-stat cp-stat-fail">
        <div class="cp-stat-value">${result.fail}</div>
        <div class="cp-stat-label">Битых ссылок</div>
      </div>
    </div>
  `;

  if (!result.total) {
    html += `
      <div class="cp-empty">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="16" x2="12" y2="12"/>
          <line x1="12" y1="8" x2="12.01" y2="8"/>
        </svg>
        <div>В стандартах пока нет ни одной фотографии.</div>
      </div>
    `;
  } else if (!result.fail) {
    html += `
      <div class="cp-empty">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
          <polyline points="22 4 12 14.01 9 11.01"/>
        </svg>
        <div>Все ${result.total} ${result.total === 1 ? 'файл' : 'файлов'} на месте.</div>
      </div>
    `;
  } else {
    html += `<div class="cp-section-title">Битые ссылки (${result.fail})</div>`;
    html += '<div class="cp-list">';
    result.broken.forEach(b => {
      html += `
        <div class="cp-item">
          <div class="cp-item-file">${escapeHtml(b.path)}</div>
          <div class="cp-item-meta">
            <span><strong>Линия:</strong> ${escapeHtml(b.line)}</span>
            <span><strong>OPL №:</strong> ${escapeHtml(b.oplNumber)}</span>
            <span><strong>Часть:</strong> ${escapeHtml(b.part)}</span>
          </div>
          <div class="cp-item-meta">
            <span><strong>Название:</strong> ${escapeHtml(b.title)}</span>
          </div>
        </div>
      `;
    });
    html += '</div>';
  }

  body.innerHTML = html;
}

/* Сформировать текст отчёта для копирования */
function buildPhotosCheckReport(result) {
  const lines = [];
  lines.push('Проверка фотографий — отчёт');
  lines.push('Дата: ' + fmtDate(new Date()));
  lines.push('');
  lines.push('Всего проверено: ' + result.total);
  lines.push('Найдено: ' + result.ok);
  lines.push('Битых ссылок: ' + result.fail);
  lines.push('');

  if (result.fail > 0) {
    lines.push('=== Битые ссылки ===');
    result.broken.forEach(b => {
      lines.push(`[${b.line}] ${b.oplNumber} — ${b.path}`);
    });
  }

  return lines.join('\n');
}

/* --- Обработчики модалки проверки --- */
let lastPhotosCheckResult = null;

$('#checkPhotosBtn')?.addEventListener('click', async () => {
  const modal = $('#checkPhotosModal');
  const body = $('#checkPhotosModalBody');
  if (!modal || !body) return;

  body.innerHTML = '<div class="cp-empty">Проверка…</div>';
  openModal(modal);

  try {
    const result = await runPhotosCheck();
    lastPhotosCheckResult = result;

    // Сохраняем количество битых ссылок для бейджа в sidebar
    localStorage.setItem('cl_photos_broken_count', String(result.fail));
    updateNavSettingsBadge();

    renderPhotosCheckResult(result);
  } catch (e) {
    console.error(e);
    body.innerHTML = '<div class="cp-empty" style="color:var(--accent-red)">Ошибка при проверке: ' + escapeHtml(e.message) + '</div>';
  }
});

function closePhotosCheckModal() {
  closeModal('#checkPhotosModal');
}

$('#checkPhotosModalClose')?.addEventListener('click', closePhotosCheckModal);
$('#checkPhotosCloseBtn')?.addEventListener('click', closePhotosCheckModal);
$('#checkPhotosModal')?.addEventListener('click', (e) => {
  if (e.target.id === 'checkPhotosModal') closePhotosCheckModal();
});

/* Копирование отчёта */
$('#checkPhotosCopyBtn')?.addEventListener('click', () => {
  if (!lastPhotosCheckResult) return showToast('Сначала запустите проверку', true);
  const text = buildPhotosCheckReport(lastPhotosCheckResult);
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text)
      .then(() => showToast('Отчёт скопирован'))
      .catch(() => fallbackCopy(text));
  } else {
    fallbackCopy(text);
  }
});
/* ============================================================
   БЛОКИ ЛИНИЙ — сворачиваемые группы Цех → Участок
   ============================================================ */
function renderBlocksSettings() {
  const list = $('#blocksList');
  if (!list) return;

  const workshops = getWorkshops();
  if (!workshops.length) {
    list.innerHTML = '<div class="empty-state">Цехов нет. Структура производства пуста.</div>';
    return;
  }

  // Открытые группы
  let openIds = getBlOpenGroups();
  if (openIds === null) {
    openIds = [];
    setBlOpenGroups(openIds);
  }
  const isOpen = (id) => openIds.includes(id);

  let html = '';

  // --- Тулбар: только кнопка "Развернуть всё" ---
  const allGroupIds = [];
  workshops.forEach(w => {
    allGroupIds.push('ws:' + w.id);
    (w.areas || []).forEach(a => allGroupIds.push('ar:' + a.id));
  });
  const allExpanded = allGroupIds.length > 0 && allGroupIds.every(id => openIds.includes(id));

  html += `
    <div class="bl-toolbar">
      <button type="button" class="btn btn-secondary btn-sm bl-toggle-all-btn" id="blToggleAllBtn">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" id="blToggleAllIcon">
          ${allExpanded
            ? '<polyline points="17 11 12 6 7 11"/><polyline points="17 18 12 13 7 18"/>'
            : '<polyline points="7 13 12 18 17 13"/><polyline points="7 6 12 11 17 6"/>'}
        </svg>
        <span id="blToggleAllLabel">${allExpanded ? 'Свернуть всё' : 'Развернуть всё'}</span>
      </button>
    </div>
  `;

  html += '<div class="bl-groups">';

  workshops.forEach(workshop => {
    const areas = (workshop.areas || []);
    if (!areas.length) return;

    const workshopId = 'ws:' + workshop.id;
    const workshopOpen = isOpen(workshopId);

    // Считаем общее число блоков и линий в цехе
    let workshopBlockCount = 0;
    let workshopLineCount = 0;
    areas.forEach(a => {
      if (Array.isArray(a.blocks)) {
        workshopBlockCount += a.blocks.length;
        a.blocks.forEach(b => {
          workshopLineCount += (b.lines || []).length;
        });
      } else {
        workshopLineCount += (a.lines || []).length;
      }
    });

    // Итоговая подпись цеха
    const wsSubtitleParts = [];
    if (workshopBlockCount > 0) {
      wsSubtitleParts.push(`${workshopBlockCount} блок.`);
    }
    wsSubtitleParts.push(`${workshopLineCount} ${pluralizeLines(workshopLineCount)}`);

    html += `
      <div class="bl-group bl-group-workshop ${workshopOpen ? 'expanded' : ''}" data-group-id="${escapeAttr(workshopId)}">
        <div class="bl-group-head" data-group-toggle="${escapeAttr(workshopId)}">
          <span class="bl-group-toggle">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </span>
          <span class="bl-group-name">${escapeHtml(workshop.name)}</span>
          <span class="bl-group-count">${wsSubtitleParts.join(' · ')}</span>
        </div>
        <div class="bl-group-body">
    `;

    // Внутри цеха — участки
    areas.forEach(area => {
      const areaId = 'ar:' + area.id;
      const areaOpen = isOpen(areaId);

      let areaBlockCount = 0;
      let areaLineCount = 0;
      if (Array.isArray(area.blocks)) {
        areaBlockCount = area.blocks.length;
        area.blocks.forEach(b => {
          areaLineCount += (b.lines || []).length;
        });
      } else {
        areaLineCount = (area.lines || []).length;
      }

      const areaSubtitle = areaBlockCount > 0
        ? `${areaBlockCount} блок. · ${areaLineCount} ${pluralizeLines(areaLineCount)}`
        : `${areaLineCount} ${pluralizeLines(areaLineCount)} (без блоков)`;

      html += `
        <div class="bl-group bl-group-area ${areaOpen ? 'expanded' : ''}" data-group-id="${escapeAttr(areaId)}">
          <div class="bl-group-head bl-group-area-head" data-group-toggle="${escapeAttr(areaId)}">
            <span class="bl-group-toggle">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </span>
            <span class="bl-group-name">${escapeHtml(area.name)}</span>
            <span class="bl-group-count">${areaSubtitle}</span>
          </div>
          <div class="bl-group-body">
      `;

      if (Array.isArray(area.blocks)) {
        // Участок с делением на блоки (SMD/FMD)
        if (area.blocks.length) {
          area.blocks.forEach(b => {
            const blockLines = (b.lines || []).filter(Boolean);
            const linesText = blockLines.length
              ? `${blockLines.length} ${pluralizeLines(blockLines.length)}: ${blockLines.map(escapeHtml).join(', ')}`
              : '<span style="color:var(--accent-red);font-style:italic">— нет линий</span>';

            html += `
              <div class="block-row">
                <div class="block-row-info">
                  <div class="block-row-name">${escapeHtml(b.name || 'Без названия')}</div>
                  <div class="block-row-lines">${linesText}</div>
                </div>
                <div class="block-row-actions">
                  <button class="btn btn-secondary btn-sm" onclick="openBlockModal('${escapeAttr(b.id)}')">Изменить состав</button>
                  <button class="btn btn-danger btn-sm" onclick="deleteBlock('${escapeAttr(b.id)}')">Удалить</button>
                </div>
              </div>
            `;
          });
        } else {
          html += `<div class="empty-state" style="padding:10px">В участке нет блоков</div>`;
        }
        html += `
          <div style="margin:6px 4px 8px">
            <button class="btn btn-secondary btn-sm" onclick="openNewBlockModal('${escapeAttr(workshop.id)}','${escapeAttr(area.id)}')">＋ Добавить блок</button>
          </div>
        `;
      } else {
        // Участок без блоков (PMD): линии хранятся прямо в участке — редактируемые
        const linesText = (area.lines || []).length
          ? (area.lines || []).map(escapeHtml).join(', ')
          : '<span style="color:var(--accent-red);font-style:italic">— нет линий</span>';

        html += `
          <div class="block-row">
            <div class="block-row-info">
              <div class="block-row-name">${escapeHtml(area.name || 'Без названия')} — линии</div>
              <div class="block-row-lines">${linesText}</div>
            </div>
            <div class="block-row-actions">
              <button class="btn btn-secondary btn-sm" onclick="openAreaLinesModal('${escapeAttr(workshop.id)}','${escapeAttr(area.id)}')">Изменить состав</button>
            </div>
          </div>
        `;
      }

      html += `</div></div>`; // закрываем участок
    });

    html += `</div></div>`; // закрываем цех
  });

  html += '</div>';

  list.innerHTML = html;

  // --- Обработчики: аккордеон ---
  list.querySelectorAll('[data-group-toggle]').forEach(head => {
    head.addEventListener('click', () => {
      const groupId = head.dataset.groupToggle;
      let open = getBlOpenGroups() || [];
      if (open.includes(groupId)) {
        open = open.filter(id => id !== groupId);
      } else {
        open.push(groupId);
      }
      setBlOpenGroups(open);
      renderBlocksSettings();
    });
  });

  // --- Кнопка "Развернуть всё / Свернуть всё" ---
  const toggleAllBtn = $('#blToggleAllBtn');
  if (toggleAllBtn) {
    toggleAllBtn.addEventListener('click', () => {
      const open = getBlOpenGroups() || [];
      const allExpandedNow = allGroupIds.length > 0 && allGroupIds.every(id => open.includes(id));
      if (allExpandedNow) {
        setBlOpenGroups([]);
      } else {
        setBlOpenGroups(allGroupIds);
      }
      renderBlocksSettings();
    });
  }
}

/* --- Хранилище открытых групп для "Блоков линий" --- */
function getBlOpenGroups() {
  try {
    const raw = localStorage.getItem('cl_bl_open_groups');
    const arr = raw ? JSON.parse(raw) : null;
    return Array.isArray(arr) ? arr : null;
  } catch (e) { return null; }
}
function setBlOpenGroups(arr) {
  try { localStorage.setItem('cl_bl_open_groups', JSON.stringify(arr)); } catch (e) {}
}

function sanitizeCycleArray(arr, def) {
  if (!Array.isArray(arr)) return [...def];
  const filtered = arr.filter(s => ['A','B','C','D'].includes(s));
  return filtered.length ? filtered : [...def];
}

function getElectronicShiftConfig() {
  const raw = load(STORAGE_KEYS.electronicShiftCfg, null);

  // Миграция со старого формата (cycle/daysPerShift) → v2
  if (raw && typeof raw === 'object' && Array.isArray(raw.cycle) && !raw.dayCycle) {
    const legacyCycle = raw.cycle;
    const legacyDays = Number(raw.daysPerShift) > 0 ? Number(raw.daysPerShift) : 2;
    const legacyStart = /^\d{4}-\d{2}-\d{2}$/.test(raw.startDate || '')
      ? raw.startDate
      : DEFAULT_ELECTRONIC_SHIFT_CFG.startDate;

    const dayCycle = [];
    const nightCycle = [];
    for (let i = 0; i < 8; i++) {
      const pos = Math.floor(i / legacyDays) % legacyCycle.length;
      const nextPos = Math.floor((i + 1) / legacyDays) % legacyCycle.length;
      dayCycle.push(legacyCycle[pos]);
      nightCycle.push(legacyCycle[nextPos]);
    }

    const migrated = { dayCycle, nightCycle, startDate: legacyStart };
    save(STORAGE_KEYS.electronicShiftCfg, migrated);
    return migrated;
  }

  if (!raw || typeof raw !== 'object') {
    return {
      dayCycle:   [...DEFAULT_ELECTRONIC_SHIFT_CFG.dayCycle],
      nightCycle: [...DEFAULT_ELECTRONIC_SHIFT_CFG.nightCycle],
      startDate:  DEFAULT_ELECTRONIC_SHIFT_CFG.startDate
    };
  }

  const dayCycle   = sanitizeCycleArray(raw.dayCycle,   DEFAULT_ELECTRONIC_SHIFT_CFG.dayCycle);
  const nightCycle = sanitizeCycleArray(raw.nightCycle, DEFAULT_ELECTRONIC_SHIFT_CFG.nightCycle);
  const startDate  = /^\d{4}-\d{2}-\d{2}$/.test(raw.startDate || '')
    ? raw.startDate
    : DEFAULT_ELECTRONIC_SHIFT_CFG.startDate;

  return { dayCycle, nightCycle, startDate };
}

function setElectronicShiftConfig(cfg) {
  const normalized = {
    dayCycle:   sanitizeCycleArray(cfg.dayCycle,   DEFAULT_ELECTRONIC_SHIFT_CFG.dayCycle),
    nightCycle: sanitizeCycleArray(cfg.nightCycle, DEFAULT_ELECTRONIC_SHIFT_CFG.nightCycle),
    startDate:  /^\d{4}-\d{2}-\d{2}$/.test(cfg.startDate || '')
      ? cfg.startDate
      : DEFAULT_ELECTRONIC_SHIFT_CFG.startDate
  };
  save(STORAGE_KEYS.electronicShiftCfg, normalized);
}

function daysSinceStart(date) {
  const cfg = getElectronicShiftConfig();
  const d = (date instanceof Date) ? date : new Date(date + 'T00:00:00');
  const start = new Date(cfg.startDate + 'T00:00:00');
  return Math.floor((d.getTime() - start.getTime()) / 86400000);
}

function getDayShiftForDate(date) {
  const cfg = getElectronicShiftConfig();
  const diff = daysSinceStart(date);
  if (diff < 0) return cfg.dayCycle[0];
  const pos = diff % cfg.dayCycle.length;
  return cfg.dayCycle[pos];
}

function getNightShiftForDate(date) {
  const cfg = getElectronicShiftConfig();
  const diff = daysSinceStart(date);
  if (diff < 0) return cfg.nightCycle[0];
  const pos = diff % cfg.nightCycle.length;
  return cfg.nightCycle[pos];
}

function getShiftsForDate(date) {
  return {
    day:   getDayShiftForDate(date),
    night: getNightShiftForDate(date)
  };
}

function getCurrentShiftType() {
  const h = new Date().getHours();
  return (h >= 9 && h < 21) ? 'day' : 'night';
}

/* Текущий период смены: тип + ДАТА НАЧАЛА смены.
   Ночная смена 21:00 → 09:00 переходит через полночь:
   в интервале 00:00–08:59 активна ночная смена, которая
   стартовала ВЧЕРА в 21:00, поэтому датой смены берём вчерашний день.
   Пример: в 06:00 в пятницу активна «Чт · ночь», а не «Пт · ночь». */
function getCurrentShiftPeriod(now = new Date()) {
  const h = now.getHours();
  if (h >= 9 && h < 21) {
    return { shiftType: 'day', date: todayISO() };
  }
  if (h >= 21) {
    return { shiftType: 'night', date: todayISO() };
  }
  // 00:00 – 08:59 → ночная смена, стартовавшая вчера в 21:00
  return { shiftType: 'night', date: addDaysISO(todayISO(), -1) };
}

/* Обёртка для совместимости со старым кодом */
function getShiftForDate(date) {
  return getDayShiftForDate(date);
}

/* ============================================================
   CL ELECTRONIC — карточка «График смен»
   ============================================================ */
function renderElectronicShiftSettings() {
  const cfg = getElectronicShiftConfig();

  const dayEl   = $('#elecShiftDayCycle');
  const nightEl = $('#elecShiftNightCycle');
  const startEl = $('#elecShiftStart');

  if (dayEl)   dayEl.value   = cfg.dayCycle.join(', ');
  if (nightEl) nightEl.value = cfg.nightCycle.join(', ');
  if (startEl) startEl.value = cfg.startDate;

  renderElectronicShiftPreview();
}

/* Предпросмотр — 8 дней от даты старта, с обеими сменами */
function renderElectronicShiftPreview() {
  const box = $('#elecShiftPreview');
  if (!box) return;

  const cfg = getElectronicShiftConfig();
  const start = new Date(cfg.startDate + 'T00:00:00');

  let html = '';
  for (let i = 0; i < 8; i++) {
    const d = new Date(start.getTime() + i * 86400000);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    const dateStr = `${yyyy}-${mm}-${dd}`;
    const day   = getDayShiftForDate(dateStr);
    const night = getNightShiftForDate(dateStr);

    html += `
      <div class="elec-shift-day">
        <span class="elec-shift-day-date">${dd}.${mm}.${yyyy}</span>
        <span style="font-size:10px;color:var(--text-dim)">день · ночь</span>
        <span style="display:flex;gap:6px;align-items:baseline">
          <span class="elec-shift-day-shift elec-shift-${day}" style="font-size:14px">${day}</span>
          <span style="color:var(--text-dim);font-size:12px">/</span>
          <span class="elec-shift-day-shift elec-shift-${night}" style="font-size:14px;opacity:0.75">${night}</span>
        </span>
      </div>
    `;
  }
  box.innerHTML = html;
}
/* Склонение: 1 линия / 2 линии / 5 линий */
function pluralizeLines(n) {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return 'линия';
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return 'линии';
  return 'линий';
}
/* --- CL Electronic: график смен (v2: день/ночь) --- */

function parseCycleString(str) {
  return String(str || '')
    .split(/[\s,;]+/)
    .map(s => s.trim().toUpperCase())
    .filter(s => ['A','B','C','D'].includes(s));
}

$('#elecShiftSaveBtn')?.addEventListener('click', () => {
  const dayCycle   = parseCycleString($('#elecShiftDayCycle')?.value);
  const nightCycle = parseCycleString($('#elecShiftNightCycle')?.value);
  const start      = ($('#elecShiftStart')?.value || '').trim();

  if (!dayCycle.length) {
    return showToast('Дневной цикл пуст или содержит недопустимые значения (A–D)', true);
  }
  if (!nightCycle.length) {
    return showToast('Ночной цикл пуст или содержит недопустимые значения (A–D)', true);
  }
  if (!start) {
    return showToast('Укажите дату старта цикла', true);
  }

  setElectronicShiftConfig({ dayCycle, nightCycle, startDate: start });

  renderElectronicShiftPreview();
  showToast('График смен сохранён');
});

$('#elecShiftResetBtn')?.addEventListener('click', () => {
  if (!confirm('Сбросить график смен к стандартному (D D A A C C B B / C C B B D D A A, старт 01.01.2026)?')) return;

  setElectronicShiftConfig({ ...DEFAULT_ELECTRONIC_SHIFT_CFG });
  renderElectronicShiftSettings();
  showToast('График смен сброшен');
});

function updateShiftPreviewTemporary() {
  const dayCycle   = parseCycleString($('#elecShiftDayCycle')?.value);
  const nightCycle = parseCycleString($('#elecShiftNightCycle')?.value);
  const start      = ($('#elecShiftStart')?.value || '').trim() || DEFAULT_ELECTRONIC_SHIFT_CFG.startDate;

  if (!dayCycle.length || !nightCycle.length) return;

  const backup = getElectronicShiftConfig();
  setElectronicShiftConfig({ dayCycle, nightCycle, startDate: start });
  renderElectronicShiftPreview();
  setElectronicShiftConfig(backup);
}

$('#elecShiftDayCycle')?.addEventListener('input', updateShiftPreviewTemporary);
$('#elecShiftNightCycle')?.addEventListener('input', updateShiftPreviewTemporary);
$('#elecShiftStart')?.addEventListener('input', updateShiftPreviewTemporary);

/* Удалить блок */
window.deleteBlock = function(id) {
  const blocks = getBlocks();
  const block = blocks.find(b => b.id === id);
  if (!block) return;

  if (!confirm(`Удалить блок "${block.name}"? Линии останутся, но отвяжутся от блока.`)) return;

  // Удаляем блок из реальной структуры цехов
  const workshops = getWorkshops();
  let removed = false;
  workshops.forEach(w => (w.areas || []).forEach(a => {
    if (!Array.isArray(a.blocks)) return;
    const idx = a.blocks.findIndex(b => b.id === id);
    if (idx !== -1) {
      a.blocks.splice(idx, 1);
      removed = true;
    }
  }));
  if (removed) setWorkshops(workshops);
  renderBlocksSettings();
  showToast('Блок удалён');
};
/* ============================================================
   МОДАЛКА РЕДАКТИРОВАНИЯ БЛОКА
   ============================================================ */
window.openBlockModal = function(blockId) {
  const blocks = getBlocks();
  const block = blocks.find(b => b.id === blockId);
  if (!block) return;

  const modal = $('#blockModal');
  const title = $('#blockModalTitle');
  if (!modal) return;

  title.textContent = 'Блок: ' + (block.name || 'Без названия');
  $('#blockModalId').value = blockId;
  $('#blockModalName').value = block.name || '';
  // Возвращаем поле имени (могло быть скрыто режимом «линии участка»)
  const nameField = $('#blockModalName')?.closest('.field');
  if (nameField) nameField.style.display = '';

  // Рендер чекбоксов линий — только линии того же цеха, что и блок
  const group = $('#blockModalLinesGroup');
  const allLines = getAllLinesWithContext()
    .filter(x => x.workshopId === block.workshopId)
    .map(x => x.line);
  const otherLines = blocks
    .filter(b => b.id !== blockId && b.workshopId === block.workshopId)
    .flatMap(b => b.lines || []);

  if (!allLines.length) {
    group.innerHTML = '<div class="empty-state" style="padding:10px">Сначала добавьте линии</div>';
  } else {
    group.innerHTML = allLines.map(line => {
      const checked = (block.lines || []).includes(line);
      const disabled = otherLines.includes(line);
      return `
        <label class="${checked ? 'checked' : ''}" ${disabled ? 'style="opacity:0.4;cursor:not-allowed" title="Линия уже в другом блоке"' : ''}>
          <input type="checkbox" value="${escapeHtml(line)}" ${checked ? 'checked' : ''} ${disabled ? 'disabled' : ''}>
          ${escapeHtml(line)}
        </label>
      `;
    }).join('');

    // Навешиваем обработчики
    group.querySelectorAll('input').forEach(cb => {
      cb.addEventListener('change', e => {
        e.target.closest('label').classList.toggle('checked', e.target.checked);
      });
    });
  }

  openModal(modal);
  setTimeout(() => $('#blockModalName').focus(), 100);
};

function closeBlockModal() {
  closeModal('#blockModal');
}

/* --- Обработчики модалки --- */
$('#blockModalClose')?.addEventListener('click', closeBlockModal);
$('#blockModalCancelBtn')?.addEventListener('click', closeBlockModal);
$('#blockModal')?.addEventListener('click', (e) => {
  if (e.target.id === 'blockModal') closeBlockModal();
});

/* Enter в поле названия — сохранить */
$('#blockModalName')?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    $('#blockModalSaveBtn')?.click();
  }
});

/* --- Редактирование линий участка БЕЗ блоков (PMD и др.) --- */
window.openAreaLinesModal = function(workshopId, areaId) {
  const w = getWorkshop(workshopId);
  if (!w) return;
  const area = (w.areas || []).find(a => a.id === areaId);
  if (!area) return;

  const modal = $('#blockModal');
  if (!modal) return;
  const title = $('#blockModalTitle');
  if (title) title.textContent = 'Линии участка: ' + (area.name || '');

  // Режим участка: id вида 'area:<workshopId>:<areaId>'
  $('#blockModalId').value = 'area:' + workshopId + ':' + areaId;
  // Поле имени блока в этом режиме не нужно — скрываем
  const nameField = $('#blockModalName')?.closest('.field');
  if (nameField) nameField.style.display = 'none';

  const group = $('#blockModalLinesGroup');
  const allLines = getAllLinesWithContext()
    .filter(x => x.workshopId === workshopId)
    .map(x => x.line);

  if (!allLines.length) {
    group.innerHTML = '<div class="empty-state" style="padding:10px">В этом цехе пока нет линий</div>';
  } else {
    group.innerHTML = allLines.map(line => {
      const checked = (area.lines || []).includes(line);
      return `
        <label class="${checked ? 'checked' : ''}">
          <input type="checkbox" value="${escapeHtml(line)}" ${checked ? 'checked' : ''}>
          ${escapeHtml(line)}
        </label>
      `;
    }).join('');

    group.querySelectorAll('input').forEach(cb => {
      cb.addEventListener('change', e => {
        e.target.closest('label').classList.toggle('checked', e.target.checked);
      });
    });
  }

  openModal(modal);
};

/* --- Создание нового блока в рамках участка --- */
window.openNewBlockModal = function(workshopId, areaId) {
  const w = getWorkshop(workshopId);
  const area = w && (w.areas || []).find(a => a.id === areaId);
  if (!w || !area) return;

  const modal = $('#blockModal');
  if (!modal) return;
  const title = $('#blockModalTitle');
  if (title) title.textContent = 'Новый блок · ' + (area.name || '');

  $('#blockModalId').value = 'new:' + workshopId + ':' + areaId;
  $('#blockModalName').value = '';
  const nameField = $('#blockModalName')?.closest('.field');
  if (nameField) nameField.style.display = '';

  const group = $('#blockModalLinesGroup');
  const allLines = getAllLinesWithContext()
    .filter(x => x.workshopId === workshopId)
    .map(x => x.line);

  if (!allLines.length) {
    group.innerHTML = '<div class="empty-state" style="padding:10px">В этом цехе пока нет линий</div>';
  } else {
    group.innerHTML = allLines.map(line => `
      <label><input type="checkbox" value="${escapeHtml(line)}"> ${escapeHtml(line)}</label>
    `).join('');
    group.querySelectorAll('input').forEach(cb => {
      cb.addEventListener('change', e => {
        e.target.closest('label').classList.toggle('checked', e.target.checked);
      });
    });
  }

  openModal(modal);
  setTimeout(() => $('#blockModalName').focus(), 100);
};

/* Сохранить (три режима: area: / new: / обычный блок) */
$('#blockModalSaveBtn')?.addEventListener('click', () => {
  const rawId = $('#blockModalId').value;
  if (!rawId) return;

  const selectedLines = [...$$('#blockModalLinesGroup input:checked')].map(cb => cb.value);

  // --- Режим 1: «линии участка без блоков» (PMD и др.) ---
  if (rawId.indexOf('area:') === 0) {
    const [, workshopId, areaId] = rawId.split(':');
    if (!workshopId || !areaId) return;

    const workshops = getWorkshops();
    const w = workshops.find(x => x.id === workshopId);
    const area = w && (w.areas || []).find(a => a.id === areaId);
    if (!area) return;

    area.lines = selectedLines;
    setWorkshops(workshops);
    renderBlocksSettings();
    closeBlockModal();
    showToast('Линии участка обновлены');
    return;
  }

  // --- Режим 2: создание нового блока в участке ---
  if (rawId.indexOf('new:') === 0) {
    const [, workshopId, areaId] = rawId.split(':');
    const name = $('#blockModalName').value.trim();
    if (!name) return showToast('Введите название блока', true);

    const workshops = getWorkshops();
    const w = workshops.find(x => x.id === workshopId);
    const area = w && (w.areas || []).find(a => a.id === areaId);
    if (!area) return;

    if (!Array.isArray(area.blocks)) area.blocks = [];
    if (area.blocks.some(b => (b.name || '').toLowerCase() === name.toLowerCase())) {
      return showToast('Блок с таким названием уже есть в этом участке', true);
    }

    area.blocks.push({
      id: 'block_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      name,
      lines: selectedLines
    });

    setWorkshops(workshops);
    renderBlocksSettings();
    closeBlockModal();
    showToast('Блок добавлен');
    return;
  }

  // --- Режим 3: редактирование существующего блока ---
  const blockId = rawId;
  const name = $('#blockModalName').value.trim();
  if (!name) return showToast('Введите название блока', true);

  const workshops = getWorkshops();
  let target = null;
  let ownerArea = null;
  workshops.forEach(w => (w.areas || []).forEach(a => {
    if (Array.isArray(a.blocks)) {
      a.blocks.forEach(b => { if (b.id === blockId) { target = b; ownerArea = a; } });
    }
  }));
  if (!target) return showToast('Блок не найден', true);

  // Дубликат названия в пределах участка-владельца
  if (ownerArea.blocks.some(b => b.id !== blockId && (b.name || '').toLowerCase() === name.toLowerCase())) {
    return showToast('Блок с таким названием уже есть', true);
  }

  target.name = name;
  target.lines = selectedLines;

  setWorkshops(workshops);
  renderBlocksSettings();
  closeBlockModal();
  showToast('Блок обновлён');
});
/* ============================================================
   МАШИНЫ ДЛЯ ЛИНИЙ — компактные строки + аккордеон по блокам
   ============================================================ */

const LM_OPEN_BLOCKS_KEY = 'cl_lm_open_blocks';

/* Получить сохранённые открытые блоки */
function getLmOpenBlocks() {
  try {
    const raw = localStorage.getItem(LM_OPEN_BLOCKS_KEY);
    const arr = raw ? JSON.parse(raw) : null;
    return Array.isArray(arr) ? arr : null;   // null = все по умолчанию
  } catch (e) { return null; }
}

function setLmOpenBlocks(arr) {
  try { localStorage.setItem(LM_OPEN_BLOCKS_KEY, JSON.stringify(arr)); } catch (e) {}
}

function renderLineMachinesSettings() {
  const container = $('#lineMachinesContainer');
  if (!container) return;

  const lines = getLines();
  const lm = getLineMachines();

  if (!lines.length) {
    container.innerHTML = '<div class="empty-state">Сначала добавьте линии</div>';
    return;
  }

  // Линии, которых нет ни в одном блоке (и в участках без блоков)
  const allLinesCtx = getAllLinesWithContext();

  // Группируем по цеху → участку → блокам
  const workshops = getWorkshops();

  // Общий счётчик линий
  const totalLineCount = lines.length;

  // --- Верхняя панель: поиск + кнопка "Развернуть всё" + счётчик ---
  let html = `
    <div class="lm-toolbar">
      <div class="lm-search-wrap">
        <svg class="lm-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8"/>
          <line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input type="text" id="lmSearchInput" placeholder="Поиск по линии или машине..." autocomplete="off">
        <button type="button" class="lm-search-clear" id="lmSearchClear" title="Очистить" style="display:none">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      <button type="button" class="btn btn-secondary btn-sm lm-toggle-all-btn" id="lmToggleAllBtn" title="Развернуть или свернуть все блоки">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" id="lmToggleAllIcon">
          <polyline points="7 13 12 18 17 13"/>
          <polyline points="7 6 12 11 17 6"/>
        </svg>
        <span id="lmToggleAllLabel">Развернуть всё</span>
      </button>

      <span class="lm-counter">Всего линий: <strong>${totalLineCount}</strong></span>
    </div>
  `;

  // --- Группы по цехам ---
  html += '<div class="lm-groups">';

  // Собираем плоский список "открытых" идентификаторов (цех/участок/блок)
  let openIds = getLmOpenBlocks();
  if (openIds === null) {
    openIds = [];
    setLmOpenBlocks(openIds);
  }

  // Функция "открыт ли id"
  const isOpen = (id) => openIds.includes(id);

  workshops.forEach(workshop => {
    const workshopLines = allLinesCtx.filter(x => x.workshopId === workshop.id);

    // Если у цеха вообще нет участков — пропускаем
    const hasAnyAreas = (workshop.areas || []).length > 0;
    if (!hasAnyAreas) return;

    // Если у цеха нет линий — всё равно показываем, но с пометкой
    const workshopId = 'ws:' + workshop.id;
    const workshopOpen = isOpen(workshopId);

    // Считаем общее количество машин в цехе
    const workshopMachineCount = workshopLines.reduce((sum, x) => {
      const machines = Array.isArray(lm[x.line]) ? lm[x.line] : [];
      return sum + machines.length;
    }, 0);

    html += `
      <div class="lm-group lm-group-workshop ${workshopOpen ? 'expanded' : ''}" data-group-id="${escapeAttr(workshopId)}">
        <div class="lm-group-head" data-group-toggle="${escapeAttr(workshopId)}">
          <span class="lm-group-toggle">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </span>
          <span class="lm-group-name">${escapeHtml(workshop.name)}</span>
          <span class="lm-group-count">
            ${workshopLines.length} ${pluralizeLines(workshopLines.length)}
            · ${workshopMachineCount} ${pluralizeMachines(workshopMachineCount)}
          </span>
        </div>
        <div class="lm-group-body">
    `;

    // Если цех пуст (нет линий) — выводим пустое состояние
    if (!workshopLines.length) {
      html += `
        <div class="lm-group-empty">
          У цеха пока нет линий. Добавьте их через структуру производства.
        </div>
      `;
      html += `</div></div>`; // закрываем цех
      return;
    }

    // Внутри цеха — участки
    (workshop.areas || []).forEach(area => {
      const areaLines = allLinesCtx.filter(x =>
        x.workshopId === workshop.id && x.areaId === area.id
      );
      if (!areaLines.length) return;

      const areaId = 'ar:' + area.id;
      const areaOpen = isOpen(areaId);

      const areaMachineCount = areaLines.reduce((sum, x) => {
        const machines = Array.isArray(lm[x.line]) ? lm[x.line] : [];
        return sum + machines.length;
      }, 0);

      html += `
        <div class="lm-group lm-group-area ${areaOpen ? 'expanded' : ''}" data-group-id="${escapeAttr(areaId)}">
          <div class="lm-group-head lm-group-area-head" data-group-toggle="${escapeAttr(areaId)}">
            <span class="lm-group-toggle">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </span>
            <span class="lm-group-name">${escapeHtml(area.name)}</span>
            <span class="lm-group-count">
              ${areaLines.length} ${pluralizeLines(areaLines.length)}
              · ${areaMachineCount} ${pluralizeMachines(areaMachineCount)}
            </span>
          </div>
          <div class="lm-group-body">
      `;

      // Внутри участка — либо блоки, либо просто линии
      if (Array.isArray(area.blocks) && area.blocks.length) {
        // Для каждого блока — отдельная подгруппа (без аккордеона, чтобы не было 3 уровней)
        area.blocks.forEach(block => {
          const blockLines = areaLines.filter(x => x.blockId === block.id);
          if (!blockLines.length) return;

          const blockMachineCount = blockLines.reduce((sum, x) => {
            const machines = Array.isArray(lm[x.line]) ? lm[x.line] : [];
            return sum + machines.length;
          }, 0);

          html += `
            <div class="lm-block-head">
              <span class="lm-block-name">${escapeHtml(block.name)}</span>
              <span class="lm-block-count">${blockLines.length} ${pluralizeLines(blockLines.length)} · ${blockMachineCount} ${pluralizeMachines(blockMachineCount)}</span>
            </div>
          `;

          blockLines.forEach(x => {
            html += renderLmLineRow(x.line, lm);
          });
        });
      } else {
        // Участок без блоков — просто список линий
        areaLines.forEach(x => {
          html += renderLmLineRow(x.line, lm);
        });
      }

      html += `</div></div>`; // закрываем участок
    });

    html += `</div></div>`; // закрываем цех
  });

  html += '</div>';

  container.innerHTML = html;

  // --- Обработчики: аккордеон ---
  container.querySelectorAll('[data-group-toggle]').forEach(head => {
    head.addEventListener('click', () => {
      const groupId = head.dataset.groupToggle;
      let open = getLmOpenBlocks() || [];
      if (open.includes(groupId)) {
        open = open.filter(id => id !== groupId);
      } else {
        open.push(groupId);
      }
      setLmOpenBlocks(open);
      renderLineMachinesSettings();
    });
  });

  // --- Обработчики: строки линий ---
  container.querySelectorAll('.lm-row').forEach(row => {
    row.addEventListener('click', (e) => {
      if (e.target.closest('.lm-row-btn')) return;
      const line = row.dataset.line;
      if (line) openMachinesListModal(line);
    });
  });

  container.querySelectorAll('.lm-row-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const row = btn.closest('.lm-row');
      if (!row) return;
      const line = row.dataset.line;
      if (line) openMachinesListModal(line);
    });
  });

  // --- Поиск ---
  const searchInput = $('#lmSearchInput');
  const searchClear = $('#lmSearchClear');
  if (searchInput) {
    const savedQuery = sessionStorage.getItem('lm_search_query') || '';
    if (savedQuery) {
      searchInput.value = savedQuery;
      if (searchClear) searchClear.style.display = 'inline-flex';
      applyLmSearch(savedQuery);
    }

    searchInput.addEventListener('input', () => {
      const q = searchInput.value.trim();
      sessionStorage.setItem('lm_search_query', q);
      if (searchClear) searchClear.style.display = q ? 'inline-flex' : 'none';
      applyLmSearch(q);
    });
  }

  if (searchClear) {
    searchClear.addEventListener('click', () => {
      if (searchInput) searchInput.value = '';
      sessionStorage.removeItem('lm_search_query');
      searchClear.style.display = 'none';
      applyLmSearch('');
      if (searchInput) searchInput.focus();
    });
  }

  // --- Кнопка "Развернуть всё / Свернуть всё" ---
  updateLmToggleAllBtnMultiLevel();
  const toggleAllBtn = $('#lmToggleAllBtn');
  if (toggleAllBtn) {
    toggleAllBtn.addEventListener('click', () => {
      const open = getLmOpenBlocks() || [];
      const allIds = collectAllLmGroupIds();
      const allExpanded = allIds.length > 0 && allIds.every(id => open.includes(id));

      if (allExpanded) {
        setLmOpenBlocks([]);
      } else {
        setLmOpenBlocks(allIds);
      }
      renderLineMachinesSettings();
    });
  }
}

/* Строка линии внутри машин */
function renderLmLineRow(line, lm) {
  const machines = Array.isArray(lm[line]) ? lm[line] : [];
  const count = machines.length;

  const machinesText = count === 0
    ? '<span class="lm-row-empty">Нет машин — нажмите, чтобы добавить</span>'
    : `<span class="lm-row-machines" title="${escapeAttr(machines.join(', '))}">${escapeHtml(machines.join(', '))}</span>`;

  const countBadge = count === 0
    ? '<span class="lm-row-count lm-row-count-empty">0</span>'
    : `<span class="lm-row-count">${count}</span>`;

  return `
    <div class="lm-row" data-line="${escapeAttr(line)}" data-machines="${escapeAttr(machines.join(' ').toLowerCase())}">
      <div class="lm-row-line">${escapeHtml(line)}</div>
      <div class="lm-row-count-wrap">${countBadge}</div>
      <div class="lm-row-machines-wrap">${machinesText}</div>
      <button class="btn btn-primary btn-sm lm-row-btn" type="button">
        Настроить →
      </button>
    </div>
  `;
}

/* Собрать все id для кнопки "Развернуть всё" */
function collectAllLmGroupIds() {
  const ids = [];
  getWorkshops().forEach(w => {
    ids.push('ws:' + w.id);
    (w.areas || []).forEach(a => {
      ids.push('ar:' + a.id);
    });
  });
  return ids;
}

/* Обновить кнопку "Развернуть всё" для многоуровневой структуры */
function updateLmToggleAllBtnMultiLevel() {
  const btn = $('#lmToggleAllBtn');
  const label = $('#lmToggleAllLabel');
  const icon = $('#lmToggleAllIcon');
  if (!btn || !label || !icon) return;

  const open = getLmOpenBlocks() || [];
  const allIds = collectAllLmGroupIds();
  const allExpanded = allIds.length > 0 && allIds.every(id => open.includes(id));

  if (allExpanded) {
    label.textContent = 'Свернуть всё';
    btn.title = 'Свернуть все блоки';
    icon.innerHTML = `
      <polyline points="17 11 12 6 7 11"/>
      <polyline points="17 18 12 13 7 18"/>
    `;
  } else {
    label.textContent = 'Развернуть всё';
    btn.title = 'Развернуть все блоки';
    icon.innerHTML = `
      <polyline points="7 13 12 18 17 13"/>
      <polyline points="7 6 12 11 17 6"/>
    `;
  }
}

/* Применить поиск: показать только совпавшие строки,
   при активном поиске — раскрыть все группы. */
function applyLmSearch(query) {
  const container = $('#lineMachinesContainer');
  if (!container) return;

  const q = (query || '').trim().toLowerCase();
  const groups = container.querySelectorAll('.lm-group');

  if (!q) {
    // Показываем всё, восстанавливаем состояние accordion
    const openIds = getLmOpenBlocks() || [];
    groups.forEach(g => {
      const gid = g.dataset.groupId;
      g.style.display = '';
      g.classList.toggle('expanded', openIds.includes(gid));
    });
    container.querySelectorAll('.lm-row').forEach(r => {
      r.style.display = '';
    });
    return;
  }

  // При активном поиске — все группы раскрыты
  groups.forEach(g => {
    g.classList.add('expanded');
    g.style.display = '';

    // Строки — показываем только совпавшие
    let visibleInGroup = 0;
    g.querySelectorAll('.lm-row').forEach(row => {
      const line = (row.dataset.line || '').toLowerCase();
      const machines = (row.dataset.machines || '').toLowerCase();
      const match = line.includes(q) || machines.includes(q);
      row.style.display = match ? '' : 'none';
      if (match) visibleInGroup++;
    });

    // Скрываем группы, где нет совпадений (кроме цехов — у них есть подгруппы)
    // Если это группа-участок — прячем, если внутри нет видимых строк.
    // Если это группа-цех — прячем, если внутри нет ни одной видимой строки.
    if (visibleInGroup === 0) {
      g.style.display = 'none';
    }
  });

  // Дополнительно: раскрываем всех родителей для видимых строк
  container.querySelectorAll('.lm-row').forEach(row => {
    if (row.style.display === 'none') return;
    // Раскрываем всех родителей
    let parent = row.closest('.lm-group');
    while (parent) {
      parent.classList.add('expanded');
      parent.style.display = '';
      parent = parent.parentElement.closest('.lm-group');
    }
  });
}

/* ============================================================
   TOP LOSSES — категории (аккордеон + inline-потери)
   ============================================================ */

const TL_OPEN_CATS_KEY = 'cl_tl_open_cats';

/* Открытые категории */
function getTlOpenCats() {
  try {
    const raw = localStorage.getItem(TL_OPEN_CATS_KEY);
    const arr = raw ? JSON.parse(raw) : null;
    return Array.isArray(arr) ? arr : null;
  } catch (e) { return null; }
}

function setTlOpenCats(arr) {
  try { localStorage.setItem(TL_OPEN_CATS_KEY, JSON.stringify(arr)); } catch (e) {}
}

function renderTopLossesSettings() {
  const container = $('#topLossesContainer');
  if (!container) return;

  const cats = getTopLosses();
  const workshops = getWorkshops();

  if (!cats.length) {
    container.innerHTML = '<div class="empty-state">Категорий нет</div>';
    return;
  }

  // Открытые категории
  let openCats = getTlOpenCats();
  if (openCats === null) {
    openCats = cats.map(c => c.id);   // все раскрыты по умолчанию
    setTlOpenCats(openCats);
  }

  // Открытые цеха
  let openWs = getTlOpenWorkshops();
  if (openWs === null) {
    openWs = workshops.map(w => w.id);
    setTlOpenWorkshops(openWs);
  }
  const wsOpen = (id) => openWs.includes(id);

  // --- Тулбар ---
  let html = `
    <div class="tl-cat-toolbar">
      <div class="tl-cat-search-wrap">
        <svg class="tl-cat-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8"/>
          <line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input type="text" id="tlCatSearchInput" placeholder="Поиск по категории или потере..." autocomplete="off">
        <button type="button" class="tl-cat-search-clear" id="tlCatSearchClear" title="Очистить" style="display:none">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      <select id="tlWorkshopFilter" class="tl-workshop-filter" title="Фильтр по цеху">
        <option value="">Все цеха</option>
        ${workshops.map(w => `<option value="${escapeAttr(w.id)}">${escapeHtml(w.name)}</option>`).join('')}
      </select>

      <button type="button" class="btn btn-secondary btn-sm tl-cat-toggle-all-btn" id="tlCatToggleAllBtn" title="Развернуть или свернуть все категории">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" id="tlCatToggleAllIcon">
          <polyline points="7 13 12 18 17 13"/>
          <polyline points="7 6 12 11 17 6"/>
        </svg>
        <span id="tlCatToggleAllLabel">Развернуть всё</span>
      </button>
    </div>
  `;

  // --- Категории (список одной категории) ---
  const renderCat = (cat) => {
    const items = Array.isArray(cat.items) ? cat.items : [];
    const isOpen = openCats.includes(cat.id);
    const catId = cat.id;

    const itemsHtml = items.length
      ? items.map(it => `
          <div class="tl-loss-inline-row" data-loss-id="${escapeAttr(it.id)}" data-cat-id="${escapeAttr(catId)}">
            <span class="tl-loss-inline-name">${escapeHtml(it.name)}</span>
            ${it.workshop ? `<span class="tl-loss-ws-chip" title="Цех">${escapeHtml(getWorkshopName(it.workshop))}</span>` : ''}
            <div class="tl-loss-inline-actions">
              <button type="button" class="tl-row-action-btn tl-row-edit-btn" data-tl-edit="${escapeAttr(it.id)}" title="Изменить">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
              </button>
              <button type="button" class="tl-row-action-btn tl-row-delete-btn" data-tl-delete="${escapeAttr(it.id)}" title="Удалить">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
          </div>
        `).join('')
      : '<div class="tl-cat-empty">В категории нет потерь</div>';

    const allStandards = getStandards();
    const lossIdsSet = new Set(items.map(it => it.id));
    const stdCount = allStandards.filter(st =>
      Array.isArray(st.topLosses) && st.topLosses.some(id => lossIdsSet.has(id))
    ).length;

    return `
      <div class="tl-cat-group ${isOpen ? 'expanded' : ''}" data-cat-id="${escapeAttr(catId)}">
        <div class="tl-cat-group-head" data-cat-toggle="${escapeAttr(catId)}">
          <span class="tl-cat-group-toggle">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </span>
          <span class="tl-cat-group-name">${escapeHtml(cat.name)}</span>
          <span class="tl-cat-group-count">
            ${items.length} ${pluralizeLosses(items.length)}
            ${stdCount > 0 ? ` · ${stdCount} ${pluralizeStandards(stdCount)}` : ''}
          </span>
        </div>
        <div class="tl-cat-group-body">
          <div class="tl-cat-losses">${itemsHtml}</div>
          <div class="tl-cat-group-footer">
            <button type="button" class="btn btn-secondary btn-icon-text tl-cat-add-loss-btn" data-tl-add-loss="${escapeAttr(catId)}">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              <span>Добавить потерю</span>
            </button>
          </div>
        </div>
      </div>
    `;
  };

  // --- Группируем категории по цехам ---
  const catWorkshop = (cat) => {
    // Цех категории: поле workshop, иначе — по общему цеху её потерь
    if (cat.workshop) return cat.workshop;
    const items = Array.isArray(cat.items) ? cat.items : [];
    const wsSet = new Set(items.map(i => i.workshop).filter(Boolean));
    if (wsSet.size === 1) return [...wsSet][0];
    return '';
  };

  const byWs = new Map();
  workshops.forEach(w => byWs.set(w.id, []));
  const shared = [];
  cats.forEach(cat => {
    const ws = catWorkshop(cat);
    if (ws && byWs.has(ws)) byWs.get(ws).push(cat);
    else shared.push(cat);
  });

  html += '<div class="tl-cat-groups">';

  workshops.forEach(w => {
    const list = byWs.get(w.id) || [];
    if (!list.length) return;
    const isOpen = wsOpen(w.id);
    const lossCount = list.reduce((s, c) => s + ((c.items || []).length), 0);

    html += `
      <div class="bl-group bl-group-workshop ${isOpen ? 'expanded' : ''}" data-ws-id="${escapeAttr(w.id)}">
        <div class="bl-group-head" data-ws-toggle="${escapeAttr(w.id)}">
          <span class="bl-group-toggle">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </span>
          <span class="bl-group-name">${escapeHtml(w.name)}</span>
          <span class="bl-group-count">${list.length} кат. · ${lossCount} ${pluralizeLosses(lossCount)}</span>
        </div>
        <div class="bl-group-body">
          <div class="tl-cat-groups">${list.map(renderCat).join('')}</div>
        </div>
      </div>
    `;
  });

  if (shared.length) {
    const isOpen = wsOpen('__shared__');
    const lossCount = shared.reduce((s, c) => s + ((c.items || []).length), 0);
    html += `
      <div class="bl-group bl-group-workshop ${isOpen ? 'expanded' : ''}" data-ws-id="__shared__">
        <div class="bl-group-head" data-ws-toggle="__shared__">
          <span class="bl-group-toggle">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </span>
          <span class="bl-group-name">Общие (все цеха)</span>
          <span class="bl-group-count">${shared.length} кат. · ${lossCount} ${pluralizeLosses(lossCount)}</span>
        </div>
        <div class="bl-group-body">
          <div class="tl-cat-groups">${shared.map(renderCat).join('')}</div>
        </div>
      </div>
    `;
  }

  html += '</div>';
  container.innerHTML = html;

  // --- Аккордеон цехов ---
  container.querySelectorAll('[data-ws-toggle]').forEach(head => {
    head.addEventListener('click', () => {
      const id = head.dataset.wsToggle;
      let open = getTlOpenWorkshops() || [];
      if (open.includes(id)) open = open.filter(x => x !== id);
      else open.push(id);
      setTlOpenWorkshops(open);
      renderTopLossesSettings();
    });
  });

  // --- Аккордеон категорий ---
  container.querySelectorAll('[data-cat-toggle]').forEach(head => {
    head.addEventListener('click', (e) => {
      e.stopPropagation();
      const catId = head.dataset.catToggle;
      let open = getTlOpenCats() || [];
      if (open.includes(catId)) open = open.filter(id => id !== catId);
      else open.push(catId);
      setTlOpenCats(open);
      renderTopLossesSettings();
    });
  });

  // --- Обработчики: добавить потерю ---
  container.querySelectorAll('[data-tl-add-loss]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const catId = btn.dataset.tlAddLoss;
      openTopLossItemModal(catId, null);
    });
  });

  // --- Обработчики: редактировать потерю ---
  container.querySelectorAll('[data-tl-edit]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const itemId = btn.dataset.tlEdit;
      const row = btn.closest('.tl-loss-inline-row');
      const catId = row ? row.dataset.catId : null;
      if (catId) openTopLossItemModal(catId, itemId);
    });
  });

  // --- Обработчики: удалить потерю ---
  container.querySelectorAll('[data-tl-delete]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const itemId = btn.dataset.tlDelete;
      const row = btn.closest('.tl-loss-inline-row');
      const catId = row ? row.dataset.catId : null;
      if (catId) deleteTopLossItem(catId, itemId);
    });
  });

  // --- Кнопка «Развернуть / Свернуть всё» ---
  updateTlCatToggleAllBtn(cats);

  const toggleAllBtn = $('#tlCatToggleAllBtn');
  if (toggleAllBtn) {
    toggleAllBtn.addEventListener('click', () => {
      const open = getTlOpenCats() || [];
      const allIds = cats.map(c => c.id);
      const allExpanded = allIds.length > 0 && allIds.every(id => open.includes(id));

      if (allExpanded) {
        setTlOpenCats([]);
      } else {
        setTlOpenCats(allIds);
      }
      renderTopLossesSettings();
    });
  }

  // --- Поиск ---
  const searchInput = $('#tlCatSearchInput');
  const searchClear = $('#tlCatSearchClear');
  if (searchInput) {
    const savedQuery = sessionStorage.getItem('tl_search_query') || '';
    if (savedQuery) {
      searchInput.value = savedQuery;
      if (searchClear) searchClear.style.display = 'inline-flex';
      applyTlCatSearch(savedQuery);
    }

    searchInput.addEventListener('input', () => {
      const q = searchInput.value.trim();
      sessionStorage.setItem('tl_search_query', q);
      if (searchClear) searchClear.style.display = q ? 'inline-flex' : 'none';
      applyTlCatSearch(q);
    });
  }

  if (searchClear) {
    searchClear.addEventListener('click', () => {
      if (searchInput) searchInput.value = '';
      sessionStorage.removeItem('tl_search_query');
      searchClear.style.display = 'none';
      applyTlCatSearch('');
      if (searchInput) searchInput.focus();
    });
  }

  // --- Фильтр по цеху ---
  const wsFilter = $('#tlWorkshopFilter');
  if (wsFilter) {
    const savedWs = sessionStorage.getItem('tl_workshop_filter') || '';
    wsFilter.value = savedWs;
    if (savedWs) applyTlWorkshopFilter(savedWs);

    wsFilter.addEventListener('change', () => {
      const val = wsFilter.value;
      sessionStorage.setItem('tl_workshop_filter', val);
      applyTlWorkshopFilter(val);
    });
  }
}

function getTlOpenWorkshops() {
  try { return JSON.parse(localStorage.getItem('cl_tl_open_ws')); } catch(e) { return null; }
}
function setTlOpenWorkshops(arr) {
  try { localStorage.setItem('cl_tl_open_ws', JSON.stringify(arr)); } catch(e) {}
}

/* Показать только потери выбранного цеха.
   Работает и как «фильтр по цеху-блоку»: при выборе цеха показываем
   только его блок, пряча остальные. */
function applyTlWorkshopFilter(workshopId) {
  const container = $('#topLossesContainer');
  if (!container) return;

  // 1) Блоки цехов: при выборе конкретного цеха — показываем только его
  container.querySelectorAll('[data-ws-id]').forEach(block => {
    const id = block.dataset.wsId;
    if (!workshopId) {
      block.style.display = '';
      return;
    }
    block.style.display = (id === workshopId || id === '__shared__') ? '' : 'none';
  });

  // 2) Потери: показываем нужный цех и универсальные
  const cats = getTopLosses();
  container.querySelectorAll('.tl-loss-inline-row').forEach(row => {
    const lossId = row.dataset.lossId;
    const catId = row.dataset.catId;
    if (!workshopId) {
      row.style.display = '';
      return;
    }
    const cat = cats.find(c => c.id === catId);
    const item = cat && Array.isArray(cat.items) ? cat.items.find(i => i.id === lossId) : null;
    const ws = item ? (item.workshop || '') : '';
    row.style.display = (!ws || ws === workshopId) ? '' : 'none';
  });

  // 3) Скрываем категории, где не осталось видимых потерь
  container.querySelectorAll('.tl-cat-group').forEach(group => {
    const rows = group.querySelectorAll('.tl-loss-inline-row');
    if (!rows.length) return;
    const anyVisible = [...rows].some(r => r.style.display !== 'none');
    group.style.display = anyVisible ? '' : 'none';
  });

  // 4) Раскрываем цех, чтобы сразу были видны его категории
  if (workshopId) {
    container.querySelectorAll('[data-ws-id]').forEach(block => {
      if (block.style.display !== 'none') block.classList.add('expanded');
    });
  }
}

/* Обновить вид кнопки «Развернуть / Свернуть всё» */
function updateTlCatToggleAllBtn(cats) {
  const btn = $('#tlCatToggleAllBtn');
  const label = $('#tlCatToggleAllLabel');
  const icon = $('#tlCatToggleAllIcon');
  if (!btn || !label || !icon) return;

  const open = getTlOpenCats() || [];
  const allIds = cats.map(c => c.id);
  const allExpanded = allIds.length > 0 && allIds.every(id => open.includes(id));

  if (allExpanded) {
    label.textContent = 'Свернуть всё';
    btn.title = 'Свернуть все категории';
    icon.innerHTML = `
      <polyline points="17 11 12 6 7 11"/>
      <polyline points="17 18 12 13 7 18"/>
    `;
  } else {
    label.textContent = 'Развернуть всё';
    btn.title = 'Развернуть все категории';
    icon.innerHTML = `
      <polyline points="7 13 12 18 17 13"/>
      <polyline points="7 6 12 11 17 6"/>
    `;
  }
}

/* Поиск по категориям и потерям */
function applyTlCatSearch(query) {
  const container = $('#topLossesContainer');
  if (!container) return;

  const q = (query || '').trim().toLowerCase();
  const groups = container.querySelectorAll('.tl-cat-group');

  if (!q) {
    const openCats = getTlOpenCats() || [];
    groups.forEach(g => {
      g.style.display = '';
      g.classList.toggle('expanded', openCats.includes(g.dataset.catId));
    });
    container.querySelectorAll('.tl-loss-inline-row').forEach(r => r.style.display = '');
    container.querySelectorAll('[data-ws-id]').forEach(b => b.style.display = '');
    const wsFilter = sessionStorage.getItem('tl_workshop_filter') || '';
    if (wsFilter) applyTlWorkshopFilter(wsFilter);
    return;
  }

  // При активном поиске — все блоки цехов и категории раскрыты
  container.querySelectorAll('[data-ws-id]').forEach(b => b.classList.add('expanded'));
  groups.forEach(g => {
    g.classList.add('expanded');
    g.style.display = '';  // сброс, ниже пересчитаем

    const catName = g.querySelector('.tl-cat-group-name')?.textContent.toLowerCase() || '';
    let visibleInCat = 0;

    g.querySelectorAll('.tl-loss-inline-row').forEach(row => {
      const lossName = row.querySelector('.tl-loss-inline-name')?.textContent.toLowerCase() || '';
      const match = lossName.includes(q) || catName.includes(q);
      row.style.display = match ? '' : 'none';
      if (match) visibleInCat++;
    });

    // Если название категории совпало — показываем все её потери
    if (catName.includes(q)) {
      g.querySelectorAll('.tl-loss-inline-row').forEach(row => row.style.display = '');
      g.style.display = '';
    } else if (visibleInCat === 0) {
      g.style.display = 'none';
    } else {
      g.style.display = '';
    }
  });

  // Скрываем блоки цехов, в которых не видно категорий
  container.querySelectorAll('[data-ws-id]').forEach(block => {
    const visibleCats = [...block.querySelectorAll('.tl-cat-group')].filter(c => c.style.display !== 'none');
    block.style.display = visibleCats.length > 0 ? '' : 'none';
  });

  // Повторно применим фильтр по цеху поверх поиска
  const wsFilter = sessionStorage.getItem('tl_workshop_filter') || '';
  if (wsFilter) applyTlWorkshopFilter(wsFilter);
}

/* Склонение: 1 потеря / 2 потери / 5 потерь */
function pluralizeLosses(n) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return 'потеря';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return 'потери';
  return 'потерь';
}
/* Склонение: 1 машина / 2 машины / 5 машин */
function pluralizeMachines(n) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return 'машина';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return 'машины';
  return 'машин';
}

/* Удалить машину из линии */
window.removeMachineFromLine = function(line, machine) {
  const usedCount = getStandards().filter(s => s.line === line && s.machine === machine).length;

  let msg = `Удалить машину "${machine}" с линии ${line}?`;
  if (usedCount > 0) {
    msg += `\n\n⚠ Внимание: эта машина используется в ${usedCount} стандарт(ах).\n` +
           `Машина пропадёт из выпадающего списка, но у существующих стандартов останется.\n` +
           `Их нужно будет перезаписать вручную.`;
  }
  if (!confirm(msg)) return;

  const lm = getLineMachines();
  if (!Array.isArray(lm[line])) return;

  lm[line] = lm[line].filter(m => m !== machine);
  setLineMachines(lm);

  // Обновляем обе модалки и список
  renderMachinesListContent(line);
  renderLineMachinesSettings();
  showToast('Машина удалена');
};
/* ============================================================
   МОДАЛКА СПИСКА МАШИН ЛИНИИ
   ============================================================ */
window.openMachinesListModal = function(line) {
  const modal = $('#machinesListModal');
  if (!modal) return;

  $('#machinesListModalLine').value = line;
  $('#machinesListModalTitle').textContent = 'Машины линии ' + line;

  renderMachinesListContent(line);

  openModal(modal);
};

function closeMachinesListModal() {
  const modal = $('#machinesListModal');
  if (!modal) return;
  modal.classList.remove('active');
  modal.style.display = '';   // ← сбрасываем inline-style, возвращаем CSS-управление
}

function renderMachinesListContent(line) {
  const content = $('#machinesListContent');
  if (!content) return;

  const lm = getLineMachines();
  const machines = Array.isArray(lm[line]) ? lm[line] : [];

  if (!machines.length) {
    content.innerHTML = '<div class="empty-state" style="padding:20px">Машин пока нет</div>';
    return;
  }

  content.innerHTML = machines.map(m => `
    <div class="machine-row">
      <span class="machine-row-name">${escapeHtml(m)}</span>
      <div class="machine-row-actions">
        <button class="btn btn-secondary btn-sm btn-icon"
                onclick="openMachineModal('${escapeHtml(line).replace(/'/g,"\\'")}', '${escapeHtml(m).replace(/'/g,"\\'")}')"
                title="Изменить">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </button>
        <button class="btn btn-danger btn-sm btn-icon"
                onclick="removeMachineFromLine('${escapeHtml(line).replace(/'/g,"\\'")}', '${escapeHtml(m).replace(/'/g,"\\'")}')"
                title="Удалить">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
    </div>
  `).join('');
}

/* Обработчики модалки списка */
$('#machinesListModalClose')?.addEventListener('click', closeMachinesListModal);
$('#machinesListDoneBtn')?.addEventListener('click', closeMachinesListModal);
$('#machinesListModal')?.addEventListener('click', (e) => {
  if (e.target.id === 'machinesListModal') closeMachinesListModal();
});

/* Добавить машину из модалки списка */
$('#machinesListAddBtn')?.addEventListener('click', () => {
  const line = $('#machinesListModalLine').value;
  if (!line) return;
  openMachineModal(line, null);
});

/* ============================================================
   МОДАЛКА МАШИНЫ
   ============================================================ */
window.openMachineModal = function(line, oldName) {
  const modal = $('#machineModal');
  const title = $('#machineModalTitle');
  const saveBtn = $('#machineModalSaveBtn');
  if (!modal) return;

  $('#machineModalLine').value = line;
  // ... (остальное содержимое функции — без изменений)
  
  openModal(modal);
  setTimeout(() => {
    const input = $('#machineModalName');
    input.focus();
    input.select();
  }, 100);
};
/* ============================================================
   БЫСТРОЕ ДОБАВЛЕНИЕ МАШИНЫ ИЗ ФОРМЫ СТАНДАРТА
   ============================================================ */
window.openQuickAddMachineModal = function() {
  const modal = $('#quickAddMachineModal');
  if (!modal) return;

  // Линия зависит от контекста
  const line = (quickAddMachineContext === 'electronic')
    ? currentElectronicLine
    : ($('#sf_line')?.value);

  if (!line) return;

  $('#quickAddMachineLineLabel').textContent = 'Линия: ' + line;
  $('#quickAddMachineName').value = '';

  openModal(modal);
  setTimeout(() => {
    const input = $('#quickAddMachineName');
    if (input) {
      input.focus();
      input.select();
    }
  }, 100);
};

function closeQuickAddMachineModal() {
  closeModal('#quickAddMachineModal');
}

/* --- Обработчики модалки --- */
$('#quickAddMachineClose')?.addEventListener('click', closeQuickAddMachineModal);
$('#quickAddMachineCancelBtn')?.addEventListener('click', closeQuickAddMachineModal);
$('#quickAddMachineModal')?.addEventListener('click', (e) => {
  if (e.target.id === 'quickAddMachineModal') closeQuickAddMachineModal();
});

/* Enter — сохранить */
$('#quickAddMachineName')?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    $('#quickAddMachineSaveBtn')?.click();
  }
});

/* Сохранить */
/* Сохранить */
$('#quickAddMachineSaveBtn')?.addEventListener('click', () => {
  // Линия зависит от контекста
  const line = (quickAddMachineContext === 'electronic')
    ? currentElectronicLine
    : ($('#sf_line')?.value);

  const name = $('#quickAddMachineName')?.value.trim();
  if (!line) return;
  if (!name) return showToast('Введите название машины', true);

  const lm = getLineMachines();
  if (!Array.isArray(lm[line])) lm[line] = [];

  // Проверка дубликата (без учёта регистра)
  if (lm[line].some(m => m.toLowerCase() === name.toLowerCase())) {
    return showToast('Такая машина уже есть на этой линии', true);
  }

  lm[line].push(name);
  setLineMachines(lm);

  // Обновляем тот селект, который открыт в текущем контексте
  if (quickAddMachineContext === 'electronic') {
    fillElectronicMachineSelect(line, name);
  } else {
    fillStandardMachineSelect(line, name);
  }

  // Обновляем настройки (если они сейчас открыты — пользователь увидит новую машину)
  if (typeof renderLineMachinesSettings === 'function') renderLineMachinesSettings();

  closeQuickAddMachineModal();
  showToast('Машина добавлена на линию ' + line);
});

/* Кнопка «+» в форме стандарта */
$('#sf_addMachineBtn')?.addEventListener('click', () => {
  quickAddMachineContext = 'standard';
  openQuickAddMachineModal();
});
function closeMachineModal() {
  closeModal('#machineModal');
}

/* --- Обработчики модалки --- */
$('#machineModalClose')?.addEventListener('click', closeMachineModal);
$('#machineModalCancelBtn')?.addEventListener('click', closeMachineModal);
$('#machineModal')?.addEventListener('click', (e) => {
  if (e.target.id === 'machineModal') closeMachineModal();
});

/* Enter — сохранить */
$('#machineModalName')?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    $('#machineModalSaveBtn')?.click();
  }
});

/* Сохранить */
$('#machineModalSaveBtn')?.addEventListener('click', () => {
  const line = $('#machineModalLine').value;
  const oldName = $('#machineModalOldName').value;
  const newName = $('#machineModalName').value.trim();

  if (!line) return;
  if (!newName) return showToast('Введите название машины', true);

  const lm = getLineMachines();
  if (!Array.isArray(lm[line])) lm[line] = [];

  // Проверка дубликата (кроме переименовываемой машины)
  const dup = lm[line].some(m =>
    m !== oldName && m.toLowerCase() === newName.toLowerCase()
  );
  if (dup) {
    return showToast(`Машина "${newName}" уже есть на линии ${line}`, true);
  }

  if (oldName) {
    // Редактирование — заменяем старое имя на новое
    const idx = lm[line].indexOf(oldName);
    if (idx === -1) return;
    lm[line][idx] = newName;
  } else {
    // Добавление новой
    lm[line].push(newName);
  }

  setLineMachines(lm);

  // --- НОВОЕ: синхронизация с стандартами ---
  if (oldName && oldName !== newName) {
    const allStandards = getStandards();
    let changedCount = 0;
    allStandards.forEach(s => {
      if (s.line === line && s.machine === oldName) {
        s.machine = newName;
        changedCount++;
      }
    });
    if (changedCount > 0) {
      setStandards(allStandards);
      showToast(`Машина переименована. Обновлено стандартов: ${changedCount}`);
    }
  }

  // Обновляем список в родительской модалке
  renderMachinesListContent(line);
  renderLineMachinesSettings();
  closeMachineModal();
  showToast(oldName ? 'Машина обновлена' : 'Машина добавлена');
});

/* ============================================================
   ОБЩИЙ СПИСОК БРЕНДОВ — строки + inline + пагинация
   ============================================================ */

const BRANDS_PAGE_SIZE = 7;
let brandsCurrentPage = 1;

function renderBrandsSettings() {
  const list = $('#brandsList');
  if (!list) return;

  const allBrands = getBrands().slice().sort((a, b) => a.localeCompare(b, 'ru'));
  const query = ($('#brandsSearch')?.value || '').trim().toLowerCase();

  // --- Фильтр по цехам ---
  const wsFilterEl = $('#brandsWorkshopFilter');
  if (wsFilterEl) {
    const workshops = getWorkshops();
    const cur = wsFilterEl.value;
    wsFilterEl.innerHTML = '<option value="">Все цеха</option>' +
      workshops.map(w => `<option value="${escapeAttr(w.id)}">${escapeHtml(w.name)}</option>`).join('') +
      '<option value="__none__">Без цеха</option>';
    wsFilterEl.value = cur;

    if (!wsFilterEl.dataset.bound) {
      wsFilterEl.dataset.bound = '1';
      wsFilterEl.addEventListener('change', () => {
        brandsCurrentPage = 1;
        renderBrandsSettings();
      });
    }
  }
  const wsFilter = wsFilterEl ? wsFilterEl.value : '';

  // Фильтрация по цеху
  let byWorkshop = allBrands;
  if (wsFilter === '__none__') {
    byWorkshop = allBrands.filter(b => !getBrandWorkshop(b));
  } else if (wsFilter) {
    byWorkshop = allBrands.filter(b => getBrandWorkshop(b) === wsFilter);
  }

  // Счётчик
  const counter = $('#brandsCount');
  if (counter) {
    counter.textContent = (query || wsFilter)
      ? `(${byWorkshop.filter(b => !query || b.toLowerCase().includes(query)).length} из ${allBrands.length})`
      : `(${allBrands.length})`;
  }

  // Пустое состояние
  if (!allBrands.length) {
    list.innerHTML = '<div class="empty-state">Брендов пока нет. Нажмите «Добавить бренд».</div>';
    renderBrandsPagination(0);
    return;
  }

  // Фильтрация по поиску
  let filtered = byWorkshop;
  if (query) {
    filtered = byWorkshop.filter(b => b.toLowerCase().includes(query));
  }

  if (!filtered.length) {
    list.innerHTML = `<div class="empty-state">Ничего не найдено${
      query ? ' по запросу «' + escapeHtml(query) + '»' : ''}.</div>`;
    renderBrandsPagination(0);
    return;
  }

  // Пагинация
  const total = filtered.length;
  const totalPages = Math.ceil(total / BRANDS_PAGE_SIZE);
  if (brandsCurrentPage > totalPages) brandsCurrentPage = totalPages;
  if (brandsCurrentPage < 1) brandsCurrentPage = 1;

  const startIdx = (brandsCurrentPage - 1) * BRANDS_PAGE_SIZE;
  const endIdx = Math.min(startIdx + BRANDS_PAGE_SIZE, total);
  const pageItems = filtered.slice(startIdx, endIdx);

  // Рендер строк
  list.innerHTML = pageItems.map(b => {
    const ws = getBrandWorkshop(b);
    const wsChip = ws
      ? `<span class="brands-row-ws-chip" title="Цех">${escapeHtml(getWorkshopName(ws))}</span>`
      : '';
    return `
    <div class="brands-row" data-brand="${escapeAttr(b)}">
      <span class="brands-row-name">${highlightBrandName(b, query)}</span>
      ${wsChip}
      <div class="brands-row-actions">
        <button type="button" class="brands-row-action-btn brands-row-edit-btn"
                data-brands-edit="${escapeAttr(b)}" title="Изменить">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </button>
        <button type="button" class="brands-row-action-btn brands-row-delete-btn"
                data-brands-delete="${escapeAttr(b)}" title="Удалить">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
    </div>
  `;
  }).join('');

  // Обработчики: изменить
  list.querySelectorAll('[data-brands-edit]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      openEditBrandModal(btn.dataset.brandsEdit);
    });
  });

  // Обработчики: удалить
  list.querySelectorAll('[data-brands-delete]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteBrand(btn.dataset.brandsDelete);
    });
  });

  // Пагинация
  renderBrandsPagination(totalPages, startIdx, endIdx, total);
}

/* Подсветка совпадений в имени бренда */
function highlightBrandName(name, query) {
  if (!query) return escapeHtml(name);
  const lower = name.toLowerCase();
  const idx = lower.indexOf(query);
  if (idx === -1) return escapeHtml(name);
  return escapeHtml(name.slice(0, idx)) +
    '<strong class="hl-match">' + escapeHtml(name.slice(idx, idx + query.length)) + '</strong>' +
    escapeHtml(name.slice(idx + query.length));
}

/* Пагинация для брендов */
function renderBrandsPagination(totalPages, startIdx, endIdx, total) {
  const bar = $('#brandsPagination');
  if (!bar) return;

  if (!total || totalPages <= 1) {
    bar.innerHTML = total
      ? `<span class="pagination-info">Показано ${startIdx + 1}–${endIdx} из ${total}</span>`
      : '';
    return;
  }

  let html = `<span class="pagination-info">Показано ${startIdx + 1}–${endIdx} из ${total}</span>`;
  html += '<div class="pagination-controls">';

  // Назад
  html += `<button class="pagination-btn" ${brandsCurrentPage === 1 ? 'disabled' : ''}
           onclick="changeBrandsPage(${brandsCurrentPage - 1})">←</button>`;

  // Страницы
  const pages = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || Math.abs(i - brandsCurrentPage) <= 2) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== '...') {
      pages.push('...');
    }
  }
  pages.forEach(p => {
    if (p === '...') {
      html += `<span class="pagination-dots">…</span>`;
    } else {
      html += `<button class="pagination-btn ${p === brandsCurrentPage ? 'active' : ''}"
               onclick="changeBrandsPage(${p})">${p}</button>`;
    }
  });

  // Вперёд
  html += `<button class="pagination-btn" ${brandsCurrentPage === totalPages ? 'disabled' : ''}
           onclick="changeBrandsPage(${brandsCurrentPage + 1})">→</button>`;

  html += '</div>';
  bar.innerHTML = html;
}

/* Смена страницы брендов */
window.changeBrandsPage = function(page) {
  brandsCurrentPage = page;
  renderBrandsSettings();
};
/* ============================================================
   РЕДАКТИРОВАНИЕ БРЕНДА
   ============================================================ */
let currentEditingBrand = null;

function openEditBrandModal(oldName) {
  currentEditingBrand = oldName;
  const modal = $('#editBrandModal');
  const input = $('#editBrandInput');
  if (!modal || !input) return;
  input.value = oldName;

  // Цех бренда
  const wsEl = $('#editBrandWorkshop');
  if (wsEl) wsEl.innerHTML = workshopOptionsHtml(getBrandWorkshop(oldName));

  // Загружаем линии, к которым уже привязан бренд
  const lb = getLineBrands();
  const assignedLines = Object.keys(lb).filter(line =>
    Array.isArray(lb[line]) && lb[line].includes(oldName)
  );
  renderLinesCheckboxesGroup('editBrandLinesGroup', assignedLines);

  openModal(modal);
  setTimeout(() => {
    input.focus();
    input.select();
  }, 100);
}

function closeEditBrandModal() {
  closeModal('#editBrandModal');
  currentEditingBrand = null;
}

$('#editBrandModalClose')?.addEventListener('click', closeEditBrandModal);
$('#editBrandCancelBtn')?.addEventListener('click', closeEditBrandModal);
$('#editBrandModal')?.addEventListener('click', (e) => {
  if (e.target.id === 'editBrandModal') closeEditBrandModal();
});

/* Enter — сохранить */
$('#editBrandInput')?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    $('#editBrandSaveBtn')?.click();
  }
});

/* Сохранение */
$('#editBrandSaveBtn')?.addEventListener('click', () => {
  const newName = $('#editBrandInput').value.trim();
  const oldName = currentEditingBrand;

  if (!oldName) return;
  if (!newName) return showToast('Введите название бренда', true);

  // Если имя не менялось — проверяем только линии
  const nameChanged = newName !== oldName;

  if (nameChanged) {
    const brands = getBrands();
    if (brands.some(b => b.toLowerCase() === newName.toLowerCase())) {
      return showToast('Бренд с таким названием уже есть', true);
    }

    const idx = brands.indexOf(oldName);
    if (idx === -1) {
      closeEditBrandModal();
      return showToast('Бренд не найден', true);
    }
    brands[idx] = newName;
    setBrands(brands);
  }

  // Работаем с привязкой к линиям
  const lb = getLineBrands();
  const selectedLines = collectSelectedLines('editBrandLinesGroup');
  const workingName = nameChanged ? newName : oldName;

  // Проходим по ВСЕМ линиям и обновляем привязку
  getLines().forEach(line => {
    if (!Array.isArray(lb[line])) lb[line] = [];

    // Убираем старое имя
    if (nameChanged) {
      lb[line] = lb[line].filter(b => b !== oldName);
    }

    // Добавляем/убираем новое имя в зависимости от галочки
    const isSelected = selectedLines.includes(line);
    const hasBrand = lb[line].includes(workingName);

    if (isSelected && !hasBrand) {
      lb[line].push(workingName);
    } else if (!isSelected && hasBrand) {
      lb[line] = lb[line].filter(b => b !== workingName);
    }
  });

  setLineBrands(lb);

  // Цех бренда
  const workshop = ($('#editBrandWorkshop')?.value || '').trim();
  setBrandWorkshop(workingName, workshop);

  // Перерисовываем всё
  renderBrandsSettings();
  renderLineBrandsSettings();
  fillLinesForOperator();

  closeEditBrandModal();

  if (nameChanged) {
    showToast('Бренд обновлён');
  } else {
    showToast('Привязки линий обновлены');
  }
});

$('#brandsSearch')?.addEventListener('input', () => {
  brandsCurrentPage = 1;    // ← сброс на 1-ю страницу
  renderBrandsSettings();
});

/* Отрисовка чекбоксов линий в модалках бренда */
function renderLinesCheckboxesGroup(containerId, selectedLines = []) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const lines = getLines();
  if (!lines.length) {
    container.innerHTML = '<div class="empty-state" style="padding:10px">Сначала добавьте линии в настройках</div>';
    return;
  }

  container.innerHTML = lines.map(l => {
    const checked = selectedLines.includes(l);
    return `<label class="${checked ? 'checked' : ''}">
      <input type="checkbox" value="${escapeHtml(l)}" ${checked ? 'checked' : ''}>
      ${escapeHtml(l)}
    </label>`;
  }).join('');

  container.querySelectorAll('input').forEach(cb => {
    cb.addEventListener('change', (e) => {
      e.target.closest('label').classList.toggle('checked', e.target.checked);
    });
  });
}

/* Собрать выбранные линии из группы */
function collectSelectedLines(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return [];
  return [...container.querySelectorAll('input:checked')].map(cb => cb.value);
}
/* --- Модалка добавления бренда --- */
function openAddBrandModal() {
  const modal = $('#addBrandModal');
  if (!modal) return;
  const input = $('#newBrandInput');
  if (input) input.value = '';

  renderLinesCheckboxesGroup('addBrandLinesGroup', []);

  const wsEl = $('#addBrandWorkshop');
  if (wsEl) wsEl.innerHTML = workshopOptionsHtml('');

  openModal(modal);
  setTimeout(() => { if (input) input.focus(); }, 100);
}

function closeAddBrandModal() {
  closeModal('#addBrandModal');
}

$('#openAddBrandModalBtn')?.addEventListener('click', openAddBrandModal);
$('#addBrandModalClose')?.addEventListener('click', closeAddBrandModal);
$('#addBrandCancelBtn')?.addEventListener('click', closeAddBrandModal);
$('#addBrandModal')?.addEventListener('click', (e) => {
  if (e.target.id === 'addBrandModal') closeAddBrandModal();
});

/* Enter — добавить без клика */
$('#newBrandInput')?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    $('#addBrandBtn')?.click();
  }
});

/* --- Добавление бренда --- */
$('#addBrandBtn')?.addEventListener('click', () => {
  const name = $('#newBrandInput').value.trim();
  if (!name) return showToast('Введите название бренда', true);

  const brands = getBrands();
  if (brands.some(b => b.toLowerCase() === name.toLowerCase())) {
    return showToast('Такой бренд уже есть', true);
  }

  brands.push(name);
  setBrands(brands);

  // Цех бренда
  const workshop = ($('#addBrandWorkshop')?.value || '').trim();
  if (workshop) setBrandWorkshop(name, workshop);

  // Привязка к выбранным линиям
  const selectedLines = collectSelectedLines('addBrandLinesGroup');
  if (selectedLines.length) {
    const lb = getLineBrands();
    selectedLines.forEach(line => {
      if (!Array.isArray(lb[line])) lb[line] = [];
      if (!lb[line].includes(name)) lb[line].push(name);
    });
    setLineBrands(lb);
  }

  // Очищаем поиск
  const search = $('#brandsSearch');
  if (search) search.value = '';

  renderBrandsSettings();
  renderLineBrandsSettings();
  fillLinesForOperator();
  closeAddBrandModal();

  if (selectedLines.length) {
    showToast(`Бренд добавлен на ${selectedLines.length} лин.`);
  } else {
    showToast('Бренд добавлен');
  }
});

/* ============================================================
   ОПЕРАТОРЫ — строки + inline + пагинация
   ============================================================ */

const OPERATORS_PAGE_SIZE = 7;
let operatorsCurrentPage = 1;

function renderOperatorsSettings() {
  const list = $('#operatorsList');
  if (!list) return;

  const allOperators = sortOperatorsRus(getOperators());
  const query = ($('#operatorsSearch')?.value || '').trim().toLowerCase();

  // Счётчик
  const counter = $('#operatorsCount');
  if (counter) {
    counter.textContent = query
      ? `(${allOperators.filter(o => o.toLowerCase().includes(query)).length} из ${allOperators.length})`
      : `(${allOperators.length})`;
  }

  // Пустое состояние
  if (!allOperators.length) {
    list.innerHTML = '<div class="empty-state">Операторов пока нет. Нажмите «Добавить оператора».</div>';
    renderOperatorsPagination(0);
    return;
  }

  // Фильтрация
  let filtered = allOperators;
  if (query) {
    filtered = allOperators.filter(o => o.toLowerCase().includes(query));
  }

  if (!filtered.length) {
    list.innerHTML = `<div class="empty-state">Ничего не найдено по запросу «${escapeHtml(query)}»</div>`;
    renderOperatorsPagination(0);
    return;
  }

  // Пагинация
  const total = filtered.length;
  const totalPages = Math.ceil(total / OPERATORS_PAGE_SIZE);
  if (operatorsCurrentPage > totalPages) operatorsCurrentPage = totalPages;
  if (operatorsCurrentPage < 1) operatorsCurrentPage = 1;

  const startIdx = (operatorsCurrentPage - 1) * OPERATORS_PAGE_SIZE;
  const endIdx = Math.min(startIdx + OPERATORS_PAGE_SIZE, total);
  const pageItems = filtered.slice(startIdx, endIdx);

  // Рендер строк
  list.innerHTML = pageItems.map(op => `
    <div class="operators-row" data-operator="${escapeAttr(op)}">
      <span class="operators-row-name">${highlightOperatorName(op, query)}</span>
      <div class="operators-row-actions">
        <button type="button" class="operators-row-action-btn operators-row-delete-btn"
                data-operators-delete="${escapeAttr(op)}" title="Удалить">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
    </div>
  `).join('');

  // Обработчики: удалить
  list.querySelectorAll('[data-operators-delete]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteOperator(btn.dataset.operatorsDelete);
    });
  });

  // Пагинация
  renderOperatorsPagination(totalPages, startIdx, endIdx, total);
}

/* Подсветка совпадений в ФИО */
function highlightOperatorName(name, query) {
  if (!query) return escapeHtml(name);
  const lower = name.toLowerCase();
  const idx = lower.indexOf(query);
  if (idx === -1) return escapeHtml(name);
  return escapeHtml(name.slice(0, idx)) +
    '<strong class="hl-match">' + escapeHtml(name.slice(idx, idx + query.length)) + '</strong>' +
    escapeHtml(name.slice(idx + query.length));
}

/* Пагинация для операторов */
function renderOperatorsPagination(totalPages, startIdx, endIdx, total) {
  const bar = $('#operatorsPagination');
  if (!bar) return;

  if (!total || totalPages <= 1) {
    bar.innerHTML = total
      ? `<span class="pagination-info">Показано ${startIdx + 1}–${endIdx} из ${total}</span>`
      : '';
    return;
  }

  let html = `<span class="pagination-info">Показано ${startIdx + 1}–${endIdx} из ${total}</span>`;
  html += '<div class="pagination-controls">';

  html += `<button class="pagination-btn" ${operatorsCurrentPage === 1 ? 'disabled' : ''}
           onclick="changeOperatorsPage(${operatorsCurrentPage - 1})">←</button>`;

  const pages = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || Math.abs(i - operatorsCurrentPage) <= 2) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== '...') {
      pages.push('...');
    }
  }
  pages.forEach(p => {
    if (p === '...') {
      html += `<span class="pagination-dots">…</span>`;
    } else {
      html += `<button class="pagination-btn ${p === operatorsCurrentPage ? 'active' : ''}"
               onclick="changeOperatorsPage(${p})">${p}</button>`;
    }
  });

  html += `<button class="pagination-btn" ${operatorsCurrentPage === totalPages ? 'disabled' : ''}
           onclick="changeOperatorsPage(${operatorsCurrentPage + 1})">→</button>`;

  html += '</div>';
  bar.innerHTML = html;
}

/* Смена страницы операторов */
window.changeOperatorsPage = function(page) {
  operatorsCurrentPage = page;
  renderOperatorsSettings();
};

/* Поиск по операторам */
$('#operatorsSearch')?.addEventListener('input', () => {
  operatorsCurrentPage = 1;
  renderOperatorsSettings();
});

/* Русская сортировка: ё = е, игнорируем регистр, знаки */
function sortOperatorsRus(arr) {
  return [...arr].sort((a, b) =>
    a.localeCompare(b, 'ru', { sensitivity: 'base', numeric: true })
  );
}

/* --- Модалка добавления оператора --- */
function openAddOperatorModal() {
  const modal = $('#addOperatorModal');
  if (!modal) return;
  const input = $('#newOperatorInput');
  if (input) input.value = '';
  openModal(modal);
  setTimeout(() => { if (input) input.focus(); }, 100);
}

function closeAddOperatorModal() {
  closeModal('#addOperatorModal');
}

$('#openAddOperatorModalBtn')?.addEventListener('click', openAddOperatorModal);
$('#addOperatorModalClose')?.addEventListener('click', closeAddOperatorModal);
$('#addOperatorCancelBtn')?.addEventListener('click', closeAddOperatorModal);
$('#addOperatorModal')?.addEventListener('click', (e) => {
  if (e.target.id === 'addOperatorModal') closeAddOperatorModal();
});

/* Enter — добавить без клика по кнопке */
$('#newOperatorInput')?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    $('#addOperatorBtn')?.click();
  }
});

/* --- Добавление оператора --- */
$('#addOperatorBtn')?.addEventListener('click', () => {
  const name = $('#newOperatorInput').value.trim();
  if (!name) return showToast('Введите ФИО оператора', true);

  const operators = getOperators();
  if (operators.some(o => o.toLowerCase() === name.toLowerCase())) {
    return showToast('Такой оператор уже есть', true);
  }

  operators.push(name);
  setOperators(sortOperatorsRus(operators));

  // Очищаем поиск, чтобы новый оператор был виден
  const search = $('#operatorsSearch');
  if (search) search.value = '';

  renderOperatorsSettings();
  closeAddOperatorModal();
  showToast('Оператор добавлен');
});

/* Обёртка openTopLossItemModal, чтобы после сохранения обновить содержимое модалки */
const _origOpenTopLossItemModal = window.openTopLossItemModal;

$('#topLossCategoryModalName')?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    $('#topLossCategoryModalSave')?.click();
  }
});


/* ============================================================
   TOP LOSSES — модалки: потеря
   ============================================================ */

  function openTopLossItemModal(catId, itemId) {
    const modal = $('#topLossItemModal');
    const title = $('#topLossItemModalTitle');
    const saveBtn = $('#topLossItemModalSave');
    if (!modal) return;

    const cats = getTopLosses();
    const cat = cats.find(c => c.id === catId);
    if (!cat) return;

    $('#topLossItemModalCategoryId').value = catId;
    $('#topLossItemModalCategoryLabel').textContent = 'Категория: ' + (cat.name || '—');

    let currentWorkshop = '';
    if (itemId) {
      const item = (cat.items || []).find(i => i.id === itemId);
      if (!item) return;
      title.textContent = 'Изменить потерю';
      saveBtn.textContent = 'Сохранить';
      $('#topLossItemModalId').value = itemId;
      $('#topLossItemModalName').value = item.name || '';
      currentWorkshop = item.workshop || '';
    } else {
      title.textContent = 'Добавить потерю';
      saveBtn.textContent = 'Добавить';
      $('#topLossItemModalId').value = '';
      $('#topLossItemModalName').value = '';
    }

    const wsEl = $('#topLossItemModalWorkshop');
    if (wsEl) wsEl.innerHTML = workshopOptionsHtml(currentWorkshop);

    openModal(modal);
    setTimeout(() => $('#topLossItemModalName').focus(), 100);
  }
window.openTopLossItemModal = openTopLossItemModal;

function closeTopLossItemModal() {
  closeModal('#topLossItemModal');
}

$('#topLossItemModalClose')?.addEventListener('click', closeTopLossItemModal);
$('#topLossItemModalCancel')?.addEventListener('click', closeTopLossItemModal);
$('#topLossItemModal')?.addEventListener('click', (e) => {
  if (e.target.id === 'topLossItemModal') closeTopLossItemModal();
});

$('#topLossItemModalName')?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    $('#topLossItemModalSave')?.click();
  }
});

$('#topLossItemModalSave')?.addEventListener('click', () => {
  const catId = $('#topLossItemModalCategoryId').value;
  const itemId = $('#topLossItemModalId').value;
  const name = ($('#topLossItemModalName').value || '').trim();
  const workshop = ($('#topLossItemModalWorkshop')?.value || '').trim();
  if (!catId) return;
  if (!name) return showToast('Введите название потери', true);

  const cats = getTopLosses();
  const cat = cats.find(c => c.id === catId);
  if (!cat) return;
  if (!Array.isArray(cat.items)) cat.items = [];

  // Проверка дубликата в этой категории
  const dup = cat.items.find(i => i.id !== itemId && i.name.toLowerCase() === name.toLowerCase());
  if (dup) return showToast('Такая потеря уже есть в этой категории', true);

  if (itemId) {
    const item = cat.items.find(i => i.id === itemId);
    if (!item) return;
    item.name = name;
    item.workshop = workshop;
  } else {
    cat.items.push({
      id: makeLossId(name),
      name,
      workshop
    });
  }

  setTopLosses(cats);
  renderTopLossesSettings();

  closeTopLossItemModal();
  showToast(itemId ? 'Потеря обновлена' : 'Потеря добавлена');
});

/* Удалить потерю */
window.deleteTopLossItem = function(catId, itemId) {
  const cats = getTopLosses();
  const cat = cats.find(c => c.id === catId);
  if (!cat) return;
  const item = (cat.items || []).find(i => i.id === itemId);
  if (!item) return;

  if (!confirm(`Удалить потерю "${item.name}"?`)) return;

  cat.items = cat.items.filter(i => i.id !== itemId);
  setTopLosses(cats);

  // Перерисовываем список категорий
  renderTopLossesSettings();
  showToast('Потеря удалена');
};

window.deleteOperator = function(name) {
  if (!confirm('Удалить оператора "' + name + '"?')) return;
  setOperators(getOperators().filter(o => o !== name));
  renderOperatorsSettings();
  showToast('Оператор удалён');
};


window.deleteBrand = function(name) {
  if (!confirm('Удалить бренд "' + name + '"? Он пропадёт со всех линий.')) return;

  const brands = getBrands();
  const idx = brands.findIndex(b => b === name);
  if (idx === -1) return;

  brands.splice(idx, 1);
  setBrands(brands);

  // Убираем бренд со всех линий
  const lb = getLineBrands();
  Object.keys(lb).forEach(line => {
    lb[line] = lb[line].filter(b => b !== name);
  });
  setLineBrands(lb);

  renderBrandsSettings();
  renderLineBrandsSettings();
  fillLinesForOperator();
  showToast('Бренд удалён');
};

/* ============================================================
   БРЕНДЫ ДЛЯ ЛИНИЙ — список линий + модалка
   ============================================================ */
let currentEditingLine = null;

/* ============================================================
   БРЕНДЫ ДЛЯ ЛИНИЙ — аккордеон по блокам + строки + поиск
   ============================================================ */

const LB_OPEN_BLOCKS_KEY = 'cl_lb_open_blocks';

/* Открытые блоки */
function getLbOpenBlocks() {
  try {
    const raw = localStorage.getItem(LB_OPEN_BLOCKS_KEY);
    const arr = raw ? JSON.parse(raw) : null;
    return Array.isArray(arr) ? arr : null;
  } catch (e) { return null; }
}

function setLbOpenBlocks(arr) {
  try { localStorage.setItem(LB_OPEN_BLOCKS_KEY, JSON.stringify(arr)); } catch (e) {}
}

function renderLineBrandsSettings() {
  const container = $('#lineBrandsContainer');
  if (!container) return;

  const lines = getLines();
  const brands = getBrands();
  const lb = getLineBrands();

  if (!lines.length) {
    container.innerHTML = '<div class="empty-state">Сначала добавьте линии</div>';
    return;
  }
  if (!brands.length) {
    container.innerHTML = '<div class="empty-state">Сначала добавьте бренды</div>';
    return;
  }

  const allLinesCtx = getAllLinesWithContext();
  const workshops = getWorkshops();

  // --- Тулбар ---
  let html = `
    <div class="lb-toolbar">
      <div class="lb-search-wrap">
        <svg class="lb-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8"/>
          <line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input type="text" id="lbSearchInput" placeholder="Поиск по линии или бренду..." autocomplete="off">
        <button type="button" class="lb-search-clear" id="lbSearchClear" title="Очистить" style="display:none">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      <button type="button" class="btn btn-secondary btn-sm lb-toggle-all-btn" id="lbToggleAllBtn" title="Развернуть или свернуть все блоки">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" id="lbToggleAllIcon">
          <polyline points="7 13 12 18 17 13"/>
          <polyline points="7 6 12 11 17 6"/>
        </svg>
        <span id="lbToggleAllLabel">Развернуть всё</span>
      </button>

      <span class="lb-counter">Всего линий: <strong>${lines.length}</strong></span>
    </div>
  `;

  html += '<div class="lb-groups">';

  let openIds = getLbOpenBlocks();
  if (openIds === null) {
    openIds = [];
    setLbOpenBlocks(openIds);
  }
  const isOpen = (id) => openIds.includes(id);

  workshops.forEach(workshop => {
    const workshopLines = allLinesCtx.filter(x => x.workshopId === workshop.id);

    // Если у цеха вообще нет участков — пропускаем
    const hasAnyAreas = (workshop.areas || []).length > 0;
    if (!hasAnyAreas) return;

    const workshopId = 'ws:' + workshop.id;
    const workshopOpen = isOpen(workshopId);

    // Уникальные бренды в цехе
    const workshopBrands = new Set();
    workshopLines.forEach(x => {
      (Array.isArray(lb[x.line]) ? lb[x.line] : []).forEach(b => workshopBrands.add(b));
    });

    html += `
      <div class="lb-group lb-group-workshop ${workshopOpen ? 'expanded' : ''}" data-group-id="${escapeAttr(workshopId)}">
        <div class="lb-group-head" data-group-toggle="${escapeAttr(workshopId)}">
          <span class="lb-group-toggle">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </span>
          <span class="lb-group-name">${escapeHtml(workshop.name)}</span>
          <span class="lb-group-count">
            ${workshopLines.length} ${pluralizeLines(workshopLines.length)}
            · ${workshopBrands.size} ${pluralizeBrandsShort(workshopBrands.size)}
          </span>
        </div>
        <div class="lb-group-body">
    `;

    if (!workshopLines.length) {
      html += `
        <div class="lb-group-empty">
          У цеха пока нет линий. Добавьте их через структуру производства.
        </div>
      `;
      html += `</div></div>`;
      return;
    }

    (workshop.areas || []).forEach(area => {
      const areaLines = allLinesCtx.filter(x =>
        x.workshopId === workshop.id && x.areaId === area.id
      );
      if (!areaLines.length) return;

      const areaId = 'ar:' + area.id;
      const areaOpen = isOpen(areaId);

      const areaBrands = new Set();
      areaLines.forEach(x => {
        (Array.isArray(lb[x.line]) ? lb[x.line] : []).forEach(b => areaBrands.add(b));
      });

      html += `
        <div class="lb-group lb-group-area ${areaOpen ? 'expanded' : ''}" data-group-id="${escapeAttr(areaId)}">
          <div class="lb-group-head lb-group-area-head" data-group-toggle="${escapeAttr(areaId)}">
            <span class="lb-group-toggle">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </span>
            <span class="lb-group-name">${escapeHtml(area.name)}</span>
            <span class="lb-group-count">
              ${areaLines.length} ${pluralizeLines(areaLines.length)}
              · ${areaBrands.size} ${pluralizeBrandsShort(areaBrands.size)}
            </span>
          </div>
          <div class="lb-group-body">
      `;

      if (Array.isArray(area.blocks) && area.blocks.length) {
        area.blocks.forEach(block => {
          const blockLines = areaLines.filter(x => x.blockId === block.id);
          if (!blockLines.length) return;

          const blockBrands = new Set();
          blockLines.forEach(x => {
            (Array.isArray(lb[x.line]) ? lb[x.line] : []).forEach(b => blockBrands.add(b));
          });

          html += `
            <div class="lb-block-head">
              <span class="lb-block-name">${escapeHtml(block.name)}</span>
              <span class="lb-block-count">${blockLines.length} ${pluralizeLines(blockLines.length)} · ${blockBrands.size} ${pluralizeBrandsShort(blockBrands.size)}</span>
            </div>
          `;

          blockLines.forEach(x => {
            html += renderLbLineRow(x.line, lb);
          });
        });
      } else {
        areaLines.forEach(x => {
          html += renderLbLineRow(x.line, lb);
        });
      }

      html += `</div></div>`; // закрываем участок
    });

    html += `</div></div>`; // закрываем цех
  });

  html += '</div>';

  container.innerHTML = html;

  // Обработчики: аккордеон
  container.querySelectorAll('[data-group-toggle]').forEach(head => {
    head.addEventListener('click', () => {
      const groupId = head.dataset.groupToggle;
      let open = getLbOpenBlocks() || [];
      if (open.includes(groupId)) {
        open = open.filter(id => id !== groupId);
      } else {
        open.push(groupId);
      }
      setLbOpenBlocks(open);
      renderLineBrandsSettings();
    });
  });

  // Обработчики: строки
  container.querySelectorAll('.lb-row').forEach(row => {
    row.addEventListener('click', (e) => {
      if (e.target.closest('.lb-row-btn')) return;
      const line = row.dataset.line;
      if (line) openLineBrandsModal(line);
    });
  });
  container.querySelectorAll('.lb-row-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const row = btn.closest('.lb-row');
      if (!row) return;
      const line = row.dataset.line;
      if (line) openLineBrandsModal(line);
    });
  });

  // Кнопка "Развернуть всё"
  updateLbToggleAllBtnMultiLevel();
  const toggleAllBtn = $('#lbToggleAllBtn');
  if (toggleAllBtn) {
    toggleAllBtn.addEventListener('click', () => {
      const open = getLbOpenBlocks() || [];
      const allIds = collectAllLbGroupIds();
      const allExpanded = allIds.length > 0 && allIds.every(id => open.includes(id));

      if (allExpanded) {
        setLbOpenBlocks([]);
      } else {
        setLbOpenBlocks(allIds);
      }
      renderLineBrandsSettings();
    });
  }

  // Поиск
  const searchInput = $('#lbSearchInput');
  const searchClear = $('#lbSearchClear');
  if (searchInput) {
    const savedQuery = sessionStorage.getItem('lb_search_query') || '';
    if (savedQuery) {
      searchInput.value = savedQuery;
      if (searchClear) searchClear.style.display = 'inline-flex';
      applyLbSearch(savedQuery);
    }

    searchInput.addEventListener('input', () => {
      const q = searchInput.value.trim();
      sessionStorage.setItem('lb_search_query', q);
      if (searchClear) searchClear.style.display = q ? 'inline-flex' : 'none';
      applyLbSearch(q);
    });
  }

  if (searchClear) {
    searchClear.addEventListener('click', () => {
      if (searchInput) searchInput.value = '';
      sessionStorage.removeItem('lb_search_query');
      searchClear.style.display = 'none';
      applyLbSearch('');
      if (searchInput) searchInput.focus();
    });
  }
}

/* Строка линии внутри брендов */
function renderLbLineRow(line, lb) {
  const assigned = Array.isArray(lb[line]) ? lb[line] : [];
  const count = assigned.length;

  const brandsText = count === 0
    ? '<span class="lb-row-empty">нет брендов — нажмите, чтобы задать</span>'
    : `<span class="lb-row-brands" title="${escapeAttr(assigned.join(', '))}">${escapeHtml(assigned.join(', '))}</span>`;

  const countBadge = count === 0
    ? '<span class="lb-row-count lb-row-count-empty">0</span>'
    : `<span class="lb-row-count">${count}</span>`;

  return `
    <div class="lb-row" data-line="${escapeAttr(line)}" data-brands="${escapeAttr(assigned.join(' ').toLowerCase())}">
      <div class="lb-row-line">${escapeHtml(line)}</div>
      <div class="lb-row-count-wrap">${countBadge}</div>
      <div class="lb-row-brands-wrap">${brandsText}</div>
      <button class="btn btn-primary btn-sm lb-row-btn" type="button">
        Настроить →
      </button>
    </div>
  `;
}

/* Собрать все id для кнопки "Развернуть всё" */
function collectAllLbGroupIds() {
  const ids = [];
  getWorkshops().forEach(w => {
    ids.push('ws:' + w.id);
    (w.areas || []).forEach(a => {
      ids.push('ar:' + a.id);
    });
  });
  return ids;
}

/* Обновить кнопку "Развернуть всё" */
function updateLbToggleAllBtnMultiLevel() {
  const btn = $('#lbToggleAllBtn');
  const label = $('#lbToggleAllLabel');
  const icon = $('#lbToggleAllIcon');
  if (!btn || !label || !icon) return;

  const open = getLbOpenBlocks() || [];
  const allIds = collectAllLbGroupIds();
  const allExpanded = allIds.length > 0 && allIds.every(id => open.includes(id));

  if (allExpanded) {
    label.textContent = 'Свернуть всё';
    btn.title = 'Свернуть все блоки';
    icon.innerHTML = `
      <polyline points="17 11 12 6 7 11"/>
      <polyline points="17 18 12 13 7 18"/>
    `;
  } else {
    label.textContent = 'Развернуть всё';
    btn.title = 'Развернуть все блоки';
    icon.innerHTML = `
      <polyline points="7 13 12 18 17 13"/>
      <polyline points="7 6 12 11 17 6"/>
    `;
  }
}

/* Поиск по линиям и брендам */
function applyLbSearch(query) {
  const container = $('#lineBrandsContainer');
  if (!container) return;

  const q = (query || '').trim().toLowerCase();
  const groups = container.querySelectorAll('.lb-group');

  if (!q) {
    const openBlocks = getLbOpenBlocks() || [];
    groups.forEach(g => {
      g.style.display = '';
      g.classList.toggle('expanded', openBlocks.includes(g.dataset.groupId));
    });
    container.querySelectorAll('.lb-row').forEach(r => r.style.display = '');
    return;
  }

  // При активном поиске — все блоки раскрыты
  groups.forEach(g => {
    g.classList.add('expanded');

    let visibleInGroup = 0;
    g.querySelectorAll('.lb-row').forEach(row => {
      const line = (row.dataset.line || '').toLowerCase();
      const brands = (row.dataset.brands || '').toLowerCase();
      const match = line.includes(q) || brands.includes(q);
      row.style.display = match ? '' : 'none';
      if (match) visibleInGroup++;
    });

    g.style.display = visibleInGroup > 0 ? '' : 'none';
  });
}

/* Склонение: 1 бренд / 2 бренда / 5 брендов */
function pluralizeBrandsShort(n) {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return 'бренд';
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return 'бренда';
  return 'брендов';
}
/* --- Открыть модалку для линии --- */
window.openLineBrandsModal = function(line) {
  currentEditingLine = line;
  const title = $('#lineBrandsModalTitle');
  if (title) title.textContent = 'Бренды линии ' + line;

  const search = $('#lineBrandsSearch');
  if (search) search.value = '';

  renderLineBrandsChecklist();

  openModal('#lineBrandsModal');

  setTimeout(() => { if (search) search.focus(); }, 100);
};

function closeLineBrandsModal() {
  closeModal('#lineBrandsModal');
  currentEditingLine = null;
  renderLineBrandsSettings();
}

/* --- Отрисовка списка брендов внутри модалки --- */
function renderLineBrandsChecklist() {
  const checklist = $('#lineBrandsChecklist');
  if (!checklist || !currentEditingLine) return;

  const allBrands = getBrands().slice().sort((a, b) => a.localeCompare(b, 'ru'));
  const query = ($('#lineBrandsSearch')?.value || '').trim().toLowerCase();
  const lb = getLineBrands();
  const assigned = Array.isArray(lb[currentEditingLine]) ? lb[currentEditingLine] : [];

  // Фильтрация
  let filtered = allBrands;
  if (query) {
    filtered = allBrands.filter(b => b.toLowerCase().includes(query));
  }

  // Счётчик
  const counter = $('#lineBrandsCounter');
  if (counter) {
    const total = allBrands.length;
    const selected = assigned.length;
    counter.textContent = `Выбрано: ${selected} из ${total}`;
  }

  if (!filtered.length) {
    checklist.innerHTML = '<div class="empty-state">Ничего не найдено</div>';
    return;
  }

  // Сортируем: сначала выбранные, потом остальные
  const selectedFirst = [
    ...filtered.filter(b => assigned.includes(b)),
    ...filtered.filter(b => !assigned.includes(b))
  ];

  checklist.innerHTML = selectedFirst.map(b => {
    const checked = assigned.includes(b);
    return `
      <label class="brand-check-row ${checked ? 'checked' : ''}">
        <input type="checkbox" data-brand="${escapeHtml(b)}" ${checked ? 'checked' : ''}>
        <span>${escapeHtml(b)}</span>
      </label>
    `;
  }).join('');

  // Обработчики
  checklist.querySelectorAll('input[data-brand]').forEach(cb => {
    cb.addEventListener('change', (e) => {
      const brand = e.target.dataset.brand;
      const cur = getLineBrands();
      const line = currentEditingLine;
      if (!line) return;
      if (!Array.isArray(cur[line])) cur[line] = [];

      if (e.target.checked) {
        if (!cur[line].includes(brand)) cur[line].push(brand);
        e.target.closest('label').classList.add('checked');
      } else {
        cur[line] = cur[line].filter(b => b !== brand);
        e.target.closest('label').classList.remove('checked');
      }
      setLineBrands(cur);
      fillLinesForOperator();
      renderLineBrandsChecklist();  // перерисовка для сортировки
    });
  });
}

/* --- Обработчики модалки --- */
$('#lineBrandsModalClose')?.addEventListener('click', closeLineBrandsModal);
$('#lineBrandsDoneBtn')?.addEventListener('click', closeLineBrandsModal);
$('#lineBrandsModal')?.addEventListener('click', (e) => {
  if (e.target.id === 'lineBrandsModal') closeLineBrandsModal();
});

$('#lineBrandsSearch')?.addEventListener('input', () => {
  renderLineBrandsChecklist();
});

$('#lineBrandsClearBtn')?.addEventListener('click', () => {
  if (!currentEditingLine) return;
  if (!confirm('Убрать все бренды с линии ' + currentEditingLine + '?')) return;
  const cur = getLineBrands();
  cur[currentEditingLine] = [];
  setLineBrands(cur);
  fillLinesForOperator();
  renderLineBrandsChecklist();
});
/* ============================================================
   ХРАНИЛИЩЕ ФОТО — обработчики
   ============================================================ */
$('#copyPhotoPathBtn')?.addEventListener('click', () => {
  const text = 'photos/';

  // Современный Clipboard API
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text)
      .then(() => showToast('Путь скопирован: ' + text))
      .catch(() => fallbackCopy(text));
  } else {
    fallbackCopy(text);
  }
});

/* Резервный способ копирования (для file:// и старых браузеров) */
function fallbackCopy(text) {
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    if (ok) {
      showToast('Путь скопирован: ' + text);
    } else {
      showToast('Не удалось скопировать. Скопируйте вручную: ' + text, true);
    }
  } catch (e) {
    showToast('Не удалось скопировать. Скопируйте вручную: ' + text, true);
  }
}
/* Бэкап */
$('#backupDownloadBtn').addEventListener('click', () => {
const backup = {
  version: 4,
  exportedAt: new Date().toISOString(),
  standards: getStandards(),
  history: getHistory(),
  nodes: getNodes(),
  workshops: getWorkshops(),   // ← НОВОЕ
  shifts: getShifts(),
  brands: getBrands(),
  brandWorkshops: getBrandWorkshops(),
  lineBrands: getLineBrands(),
  operators: getOperators(),
  lineMachines: getLineMachines(),
  topLosses: getTopLosses(),
  electronicParams: getElectronicParams(),
  electronicShiftCfg: getElectronicShiftConfig(),
  electronicBrandSchedule: getElectronicBrandSchedule()
};
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json;charset=utf-8' });
  const ts = new Date().toISOString().slice(0,19).replace(/[:T]/g,'-');
  downloadBlob(blob, 'checklist_backup_' + ts + '.json');
  showToast('Бэкап скачан');
});

$('#backupUploadBtn').addEventListener('click', () => {
  $('#backupFileInput').click();
});

$('#backupFileInput').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    try {
      const data = JSON.parse(ev.target.result);
      if (!confirm('Загрузить бэкап? Текущие данные будут ЗАМЕНЕНЫ.')) return;

      if (Array.isArray(data.standards)) setStandards(data.standards);
      if (Array.isArray(data.history)) setHistory(data.history);
      if (Array.isArray(data.nodes)) setNodes(data.nodes);
      if (Array.isArray(data.lines)) setLines(data.lines);
      if (Array.isArray(data.brands)) setBrands(data.brands);
      if (data.brandWorkshops && typeof data.brandWorkshops === 'object') setBrandWorkshops(data.brandWorkshops);
      if (data.lineBrands && typeof data.lineBrands === 'object') setLineBrands(data.lineBrands);
      if (Array.isArray(data.operators)) setOperators(data.operators);
      if (Array.isArray(data.workshops)) setWorkshops(data.workshops);
      if (data.lineMachines && typeof data.lineMachines === 'object') setLineMachines(data.lineMachines);
      if (Array.isArray(data.topLosses)) setTopLosses(data.topLosses);
      if (Array.isArray(data.electronicParams)) setElectronicParams(data.electronicParams);
      if (data.electronicShiftCfg && typeof data.electronicShiftCfg === 'object') setElectronicShiftConfig(data.electronicShiftCfg);
      if (data.electronicBrandSchedule && typeof data.electronicBrandSchedule === 'object') setElectronicBrandSchedule(data.electronicBrandSchedule);
      init();
      showToast('Бэкап загружен');
    } catch (err) {
      showToast('Ошибка: файл повреждён или не является бэкапом', true);
    }
  };
  reader.readAsText(file);
  e.target.value = '';
});

$('#resetAllBtn').addEventListener('click', () => {
  if (!confirm('СБРОСИТЬ ВСЕ ДАННЫЕ? Стандарты, история, узлы, настройки — всё будет удалено безвозвратно.')) return;
  if (!confirm('Вы точно уверены? Рекомендуется сначала скачать бэкап.')) return;
  Object.values(STORAGE_KEYS).forEach(k => localStorage.removeItem(k));
  localStorage.removeItem('cl_photos_broken_count');
  init();
  showToast('Все данные сброшены');
});

/* ============================================================
   ИНИЦИАЛИЗАЦИЯ
   ============================================================ */
function init() {
  // Разовые миграции структуры (на случай, если getWorkshops ещё не вызывался)
  migrateToWorkshopsStructure();
  fillLinesForOperator();
  renderCoclPartStep('');     // начальное состояние шага «Часть»
  renderCoclLineContext('');  // начальное состояние контекста линии
  fillHistoryFilters();
  renderSettings();
  fillTopLossTab();
  /*fillElectronicTab();*/
  initRouter();
  updateNavCounters();

  // ============ Восстановление активной линии редактора ============
  // Читаем сохранённую линию из localStorage и синхронизируем переменную в памяти
  const savedEditorLine = localStorage.getItem('cl_editor_line');
  const allLines = typeof getLines === 'function' ? getLines() : [];
  if (savedEditorLine && allLines.includes(savedEditorLine)) {
    currentEditorLine = savedEditorLine;
  } else if (savedEditorLine) {
    // Линия удалена из структуры — чистим
    localStorage.removeItem('cl_editor_line');
    currentEditorLine = null;
  }

  // Авто-открытие модалки выбора линии, если линия не выбрана и активна вкладка «Редактор»
  setTimeout(() => {
    const activeTab = localStorage.getItem('cl_active_tab');
    if (activeTab !== 'editor') return;

    if (!currentEditorLine) {
      if (typeof openLinePickerModal === 'function') openLinePickerModal();
    } else {
      if (typeof updateEditorLineContext === 'function') updateEditorLineContext();
      if (typeof updatePartCounters === 'function') updatePartCounters();
    }
  }, 300);
}
/* ============================================================
   Переключатель темы (light / dark)
   ============================================================ */
(function initTheme() {
  const STORAGE_KEY = 'cl_theme';
  const html = document.documentElement;
  const saved = localStorage.getItem(STORAGE_KEY);

  // Восстанавливаем сохранённую тему
  if (saved === 'dark' || saved === 'light') {
    html.setAttribute('data-theme', saved);
  } else {
    // По умолчанию — светлая
    html.setAttribute('data-theme', 'light');
  }

  // Обработчик кнопки
  const btn = document.getElementById('themeToggle');
  if (btn) {
    btn.addEventListener('click', () => {
      const current = html.getAttribute('data-theme') || 'light';
      const next = current === 'dark' ? 'light' : 'dark';
      html.setAttribute('data-theme', next);
      localStorage.setItem(STORAGE_KEY, next);
    });
  }
})();
/* ============================================================
   Автокомплит ФИО оператора
   ============================================================ */
(function initOperatorAutocomplete() {
  const input = document.getElementById('operatorName');
  const dropdown = document.getElementById('operatorAutocomplete');
  if (!input || !dropdown) return;

  let activeIndex = -1;
  let currentMatches = [];

  function highlightMatch(fullText, query) {
    const idx = fullText.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return escapeHtml(fullText);
    const before = fullText.slice(0, idx);
    const match = fullText.slice(idx, idx + query.length);
    const after = fullText.slice(idx + query.length);
    return escapeHtml(before) + '<strong>' + escapeHtml(match) + '</strong>' + escapeHtml(after);
  }

  function renderDropdown(matches, query) {
    currentMatches = matches;
    activeIndex = -1;
    if (!matches.length) {
      if (query.length >= 1) {
        dropdown.innerHTML = '<div class="autocomplete-empty">Ничего не найдено</div>';
        dropdown.style.display = 'block';
      } else {
        dropdown.style.display = 'none';
      }
      return;
    }
    dropdown.innerHTML = matches.map((name, i) =>
      `<div class="autocomplete-item" data-index="${i}">${highlightMatch(name, query)}</div>`
    ).join('');
    dropdown.style.display = 'block';

    dropdown.querySelectorAll('.autocomplete-item').forEach(el => {
      el.addEventListener('mousedown', (e) => {
        e.preventDefault();
        selectItem(parseInt(el.dataset.index));
      });
    });
  }

  function selectItem(index) {
    if (index < 0 || index >= currentMatches.length) return;
    input.value = currentMatches[index];
    dropdown.style.display = 'none';
    activeIndex = -1;
  }

  function updateActive() {
    dropdown.querySelectorAll('.autocomplete-item').forEach((el, i) => {
      el.classList.toggle('active', i === activeIndex);
    });
    if (activeIndex >= 0) {
      const el = dropdown.querySelector(`[data-index="${activeIndex}"]`);
      if (el) el.scrollIntoView({ block: 'nearest' });
    }
  }

  const MAX_SUGGESTIONS = 7;   // максимум подсказок при пустом вводе

  function getSortedOperators() {
    return sortOperatorsRus(getOperators());
  }

  /* Сортировка совпадений: сначала те, что НАЧИНАЮТСЯ с запроса,
     потом те, где запрос встречается в середине */
  function filterOperators(query) {
    const q = query.toLowerCase();
    const all = getSortedOperators();
    const starts = [];
    const contains = [];
    all.forEach(op => {
      const low = op.toLowerCase();
      if (low.startsWith(q)) starts.push(op);
      else if (low.includes(q)) contains.push(op);
    });
    return [...starts, ...contains];
  }

  input.addEventListener('input', () => {
    const query = input.value.trim();
    const operators = getOperators();
    if (!operators.length) {
      dropdown.style.display = 'none';
      return;
    }
    if (!query) {
      renderDropdown(getSortedOperators().slice(0, MAX_SUGGESTIONS), '');
      return;
    }
    const matches = filterOperators(query);
    // При вводе показываем больше совпадений — до 15, если есть
    renderDropdown(matches.slice(0, 15), query);
  });

  input.addEventListener('focus', () => {
    const operators = getOperators();
    if (operators.length && !input.value.trim()) {
      renderDropdown(getSortedOperators().slice(0, MAX_SUGGESTIONS), '');
    }
  });

  input.addEventListener('keydown', (e) => {
    if (dropdown.style.display !== 'block') return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      activeIndex = Math.min(activeIndex + 1, currentMatches.length - 1);
      updateActive();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      activeIndex = Math.max(activeIndex - 1, 0);
      updateActive();
    } else if (e.key === 'Enter') {
      if (activeIndex >= 0) {
        e.preventDefault();
        selectItem(activeIndex);
      }
    } else if (e.key === 'Escape') {
      dropdown.style.display = 'none';
    }
  });

  input.addEventListener('blur', () => {
    setTimeout(() => { dropdown.style.display = 'none'; }, 150);
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('#operatorName') && !e.target.closest('#operatorAutocomplete')) {
      dropdown.style.display = 'none';
    }
  });
})();
/* ============================================================
   ИМПОРТ/ЭКСПОРТ: ШАБЛОНЫ
   ============================================================ */

/* --- Шаблон операторов --- */
$('#downloadOperatorsTemplateBtn')?.addEventListener('click', async () => {
  if (typeof ExcelJS === 'undefined') {
    return showToast('Библиотека ExcelJS не загружена', true);
  }
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Операторы');

  ws.columns = [
    { header: 'ФИО оператора', key: 'name', width: 40 }
  ];

  // Пример-подсказка
  ws.addRow(['Иванов Иван Иванович']);
  ws.addRow(['Петров Пётр Петрович']);

  // Стилизация шапки
  const headerRow = ws.getRow(1);
  headerRow.height = 30;
  headerRow.eachCell((cell) => {
    cell.font = { name: 'Calibri', size: 13, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0A4FA8' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  // Подсказка на втором листе
  const wsInfo = wb.addWorksheet('Инструкция');
  wsInfo.columns = [{ width: 80 }];
  wsInfo.addRow(['Как заполнять шаблон:']);
  wsInfo.addRow(['']);
  wsInfo.addRow(['1. Заполните колонку «ФИО оператора» — по одному оператору на строку.']);
  wsInfo.addRow(['2. Примеры в шаблоне можно удалить.']);
  wsInfo.addRow(['3. Сохраните файл и загрузите через кнопку «Загрузить из Excel».']);
  wsInfo.addRow(['4. Пустые строки будут проигнорированы.']);
  wsInfo.getRow(1).font = { bold: true, size: 14 };

  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  downloadBlob(blob, 'template_operators.xlsx');
  showToast('Шаблон операторов скачан');
});

/* ============================================================
   TOP LOSSES — шаблон и импорт Excel
   ============================================================ */

/* --- Шаблон --- */
$('#downloadTopLossesTemplateBtn')?.addEventListener('click', async () => {
  if (typeof ExcelJS === 'undefined') {
    return showToast('Библиотека ExcelJS не загружена', true);
  }

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Top Losses');

  ws.columns = [
    { header: 'Категория', key: 'category', width: 40 },
    { header: 'Потеря',    key: 'loss',     width: 50 }
  ];

  // Примеры
  ws.addRow(['Увеличенные остановки', 'Остановки по хопперу']);
  ws.addRow(['Увеличенные остановки', 'Обрыв штранга']);
  ws.addRow(['Дефекты по качеству',   'Замятие сигарет']);
  ws.addRow(['Повышенные выбросы',    'Выбросы по LES']);

  // Шапка
  const headerRow = ws.getRow(1);
  headerRow.height = 30;
  headerRow.eachCell((cell) => {
    cell.font = { name: 'Calibri', size: 13, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0A4FA8' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  // Инструкция
  const wsInfo = wb.addWorksheet('Инструкция');
  wsInfo.columns = [{ width: 90 }];
  const info = [
    ['📋 Шаблон Top Losses'],
    [''],
    ['КАК ПОЛЬЗОВАТЬСЯ:'],
    ['1. Заполните столбцы «Категория» и «Потеря». Одна потеря = одна строка.'],
    ['2. Категория может повторяться в нескольких строках — тогда потери добавятся в одну категорию.'],
    ['3. Сохраните файл и загрузите через кнопку «Загрузить из Excel».'],
    [''],
    ['ПРАВИЛА ИМПОРТА:'],
    ['  • Если категории нет в справочнике — она создастся автоматически.'],
    ['  • Если потеря уже есть в категории — она пропускается (дубликат).'],
    ['  • Пустые строки игнорируются.'],
    ['']
  ];
  info.forEach(([text]) => wsInfo.addRow([text]));
  wsInfo.getRow(1).font = { bold: true, size: 16, color: { argb: 'FF0A4FA8' } };

  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  downloadBlob(blob, 'template_top_losses.xlsx');
  showToast('Шаблон Top Losses скачан');
});

/* --- Импорт --- */
$('#uploadTopLossesBtn')?.addEventListener('click', () => {
  $('#topLossesFileInput').click();
});

$('#topLossesFileInput')?.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  e.target.value = '';

  try {
    const result = await parseTopLossesExcel(file);
    showImportReport(result, 'topLossesContainer');
    if (result.added > 0) {
      renderTopLossesSettings();
      showToast(`Добавлено потерь: ${result.added}`);
    } else {
      showToast('Новых потерь не найдено', true);
    }
  } catch (err) {
    console.error(err);
    showToast('Ошибка чтения файла: ' + err.message, true);
  }
});

async function parseTopLossesExcel(file) {
  const wb = new ExcelJS.Workbook();
  const buf = await file.arrayBuffer();
  await wb.xlsx.load(buf);

  const ws = wb.getWorksheet('Top Losses') || wb.worksheets[0];
  if (!ws) throw new Error('Не найден лист «Top Losses»');

  const cats = getTopLosses();

  const result = {
    added: 0,
    skipped: 0,
    duplicates: [],
    empty: 0,
    errors: []
  };

  for (let i = 2; i <= ws.rowCount; i++) {
    const row = ws.getRow(i);
    const catName = String(row.getCell(1).value || '').trim();
    const itemName = String(row.getCell(2).value || '').trim();

    if (!catName && !itemName) {
      result.empty++;
      continue;
    }
    if (!catName || !itemName) {
      result.errors.push({ row: i, message: 'нужны и категория, и потеря' });
      continue;
    }

    // Найти или создать категорию
    let cat = cats.find(c => c.name.toLowerCase() === catName.toLowerCase());
    if (!cat) {
      cat = { id: makeCategoryId(catName), name: catName, items: [] };
      cats.push(cat);
    }
    if (!Array.isArray(cat.items)) cat.items = [];

    // Проверка дубликата потери
    if (cat.items.some(it => it.name.toLowerCase() === itemName.toLowerCase())) {
      result.duplicates.push(`${catName} / ${itemName}`);
      result.skipped++;
      continue;
    }

    cat.items.push({ id: makeLossId(itemName), name: itemName });
    result.added++;
  }

  if (result.added > 0) {
    setTopLosses(cats);
  }

  return result;
}

/* --- Загрузка операторов --- */
$('#uploadOperatorsBtn')?.addEventListener('click', () => {
  $('#operatorsFileInput').click();
});

$('#operatorsFileInput')?.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  e.target.value = '';

  try {
    const result = await parseOperatorsExcel(file);
    showImportReport(result, 'operatorsList');
    if (result.added > 0) {
      renderOperatorsSettings();
      showToast(`Добавлено операторов: ${result.added}`);
    } else {
      showToast('Новых операторов не найдено', true);
    }
  } catch (err) {
    console.error(err);
    showToast('Ошибка чтения файла: ' + err.message, true);
  }
});

async function parseOperatorsExcel(file) {
  const wb = new ExcelJS.Workbook();
  const buf = await file.arrayBuffer();
  await wb.xlsx.load(buf);

  const ws = wb.getWorksheet('Операторы') || wb.worksheets[0];
  if (!ws) throw new Error('Не найден лист с операторами');

  const existing = getOperators();
  const existingLow = new Set(existing.map(o => o.toLowerCase()));

  const result = {
    added: 0,
    skipped: 0,
    duplicates: [],
    empty: 0,
    errors: []
  };

  // Читаем со 2-й строки (пропускаем шапку)
  for (let i = 2; i <= ws.rowCount; i++) {
    const row = ws.getRow(i);
    const cellValue = row.getCell(1).value;
    const raw = cellValue == null ? '' : String(cellValue).trim();

    if (!raw) {
      result.empty++;
      continue;
    }

    if (existingLow.has(raw.toLowerCase())) {
      result.duplicates.push(raw);
      result.skipped++;
      continue;
    }

    existing.push(raw);
    existingLow.add(raw.toLowerCase());
    result.added++;
  }

  if (result.added > 0) {
    setOperators(sortOperatorsRus(existing));
  }

  return result;
}

function showImportReport(result, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  // Удаляем старый отчёт, если был
  const old = container.querySelector('.import-report');
  if (old) old.remove();

  const report = document.createElement('div');
  const hasAddedMachines = Array.isArray(result.addedMachines) && result.addedMachines.length > 0;
  const hasErrors = result.errors.length > 0 || result.duplicates.length > 0;
  report.className = 'import-report ' + (hasErrors ? 'error' : 'success');

  let html = '<h4>📋 Отчёт импорта</h4><ul>';
  if (result.added > 0)   html += `<li>✅ Добавлено стандартов: <strong>${result.added}</strong></li>`;
  if (result.pointsImported > 0) html += `<li>✅ Загружено точек: <strong>${result.pointsImported}</strong></li>`;
  if (result.skipped > 0) html += `<li>⚠️ Пропущено (дубликаты OPL №): <strong>${result.skipped}</strong></li>`;
  if (result.empty > 0)   html += `<li>⚪ Пустых строк: ${result.empty}</li>`;
  if (result.errors.length > 0) {
    html += `<li>❌ Ошибок: <strong>${result.errors.length}</strong></li>`;
  }
  html += '</ul>';

  // Автодобавленные машины
  if (hasAddedMachines) {
    html += '<div style="margin-top:8px"><strong>🔧 Автоматически добавлены машины:</strong> ';
    html += result.addedMachines
      .map(m => `<code>${escapeHtml(m)}</code>`)
      .join(', ');
    html += '</div>';
  }

  if (result.duplicates.length > 0) {
    html += '<div style="margin-top:8px"><strong>Дубликаты OPL №:</strong> ';
    html += result.duplicates.slice(0, 10).map(d => `<code>${escapeHtml(d)}</code>`).join(', ');
    if (result.duplicates.length > 10) html += ` и ещё ${result.duplicates.length - 10}...`;
    html += '</div>';
  }

  if (result.errors.length > 0) {
    html += '<div style="margin-top:8px"><strong>Строки с ошибками:</strong><ul>';
    result.errors.slice(0, 10).forEach(e => {
      html += `<li>Строка ${e.row}: ${escapeHtml(e.message)}</li>`;
    });
    if (result.errors.length > 10) html += `<li>...и ещё ${result.errors.length - 10}</li>`;
    html += '</ul></div>';
  }

  report.innerHTML = html;
  container.prepend(report);

  if (!hasErrors && !hasAddedMachines) {
    setTimeout(() => { if (report.parentNode) report.remove(); }, 30000);
  }
}

/* ============================================================
   ИМПОРТ/ЭКСПОРТ БРЕНДОВ
   ============================================================ */

/* --- Шаблон брендов --- */
$('#downloadBrandsTemplateBtn')?.addEventListener('click', async () => {
  if (typeof ExcelJS === 'undefined') {
    return showToast('Библиотека ExcelJS не загружена', true);
  }
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Бренды');

  ws.columns = [
    { header: 'Название бренда', key: 'name', width: 40 }
  ];

  // Примеры
  ws.addRow(['Marlboro']);
  ws.addRow(['Winston']);
  ws.addRow(['Camel']);

  // Стилизация шапки
  const headerRow = ws.getRow(1);
  headerRow.height = 30;
  headerRow.eachCell((cell) => {
    cell.font = { name: 'Calibri', size: 13, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0A4FA8' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = {
      top:    { style: 'thin', color: { argb: 'FF0A4FA8' } },
      bottom: { style: 'thin', color: { argb: 'FF0A4FA8' } },
      left:   { style: 'thin', color: { argb: 'FF0A4FA8' } },
      right:  { style: 'thin', color: { argb: 'FF0A4FA8' } }
    };
  });

  // Лист с инструкцией
  const wsInfo = wb.addWorksheet('Инструкция');
  wsInfo.columns = [{ width: 80 }];
  const info = [
    ['📋 Как заполнять шаблон брендов'],
    [''],
    ['1. Заполните колонку «Название бренда» — по одному бренду на строку.'],
    ['2. Примеры в шаблоне можно удалить.'],
    ['3. Сохраните файл и загрузите через кнопку «Загрузить из Excel».'],
    ['4. Пустые строки будут проигнорированы.'],
    ['5. Дубликаты (без учёта регистра) — пропускаются.']
  ];
  info.forEach(([text]) => wsInfo.addRow([text]));
  wsInfo.getRow(1).font = { bold: true, size: 14, color: { argb: 'FF0A4FA8' } };

  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  downloadBlob(blob, 'template_brands.xlsx');
  showToast('Шаблон брендов скачан');
});

/* --- Загрузка брендов --- */
$('#uploadBrandsBtn')?.addEventListener('click', () => {
  $('#brandsFileInput').click();
});

$('#brandsFileInput')?.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  e.target.value = '';

  try {
    const result = await parseBrandsExcel(file);
    showImportReport(result, 'brandsList');
    if (result.added > 0) {
      renderBrandsSettings();
      renderLineBrandsSettings();
      showToast(`Добавлено брендов: ${result.added}`);
    } else {
      showToast('Новых брендов не найдено', true);
    }
  } catch (err) {
    console.error(err);
    showToast('Ошибка чтения файла: ' + err.message, true);
  }
});

async function parseBrandsExcel(file) {
  const wb = new ExcelJS.Workbook();
  const buf = await file.arrayBuffer();
  await wb.xlsx.load(buf);

  const ws = wb.getWorksheet('Бренды') || wb.worksheets[0];
  if (!ws) throw new Error('Не найден лист с брендами');

  const existing = getBrands();
  const existingLow = new Set(existing.map(b => b.toLowerCase()));

  const result = {
    added: 0,
    skipped: 0,
    duplicates: [],
    empty: 0,
    errors: []
  };

  for (let i = 2; i <= ws.rowCount; i++) {
    const row = ws.getRow(i);
    const cellValue = row.getCell(1).value;
    const raw = cellValue == null ? '' : String(cellValue).trim();

    if (!raw) {
      result.empty++;
      continue;
    }

    if (existingLow.has(raw.toLowerCase())) {
      result.duplicates.push(raw);
      result.skipped++;
      continue;
    }

    existing.push(raw);
    existingLow.add(raw.toLowerCase());
    result.added++;
  }

  if (result.added > 0) {
    setBrands(existing.sort((a, b) => a.localeCompare(b, 'ru')));
  }

  return result;
}

/* ============================================================
   ЭКСПОРТ СТАНДАРТОВ ЛИНИИ В EXCEL
   ============================================================ */
$('#editorExportBtn')?.addEventListener('click', async () => {
  if (typeof ExcelJS === 'undefined') {
    return showToast('Библиотека ExcelJS не загружена', true);
  }
  if (!currentEditorLine) {
    return showToast('Сначала откройте линию', true);
  }

  const standards = getStandards().filter(s => s.line === currentEditorLine);

  if (!standards.length) {
    return showToast('На этой линии нет стандартов', true);
  }

  const wb = new ExcelJS.Workbook();

  // ======================= ЛИСТ 1: «Стандарты» =======================
  const ws = wb.addWorksheet('Стандарты');

  const headers = [
    'Часть линии',
    'Машина',
    'OPL №',
    'Узел',
    'Название',
    'Линия',
    'Тип контроля',
    'Применять к',
    'Активен',
    'Описание проблемы',
    'Описание контроля',
    'Цель',
    'Почему создан',
    'Триггеры',
    'Top Losses',
    'Фото'
  ];

  ws.addRow(headers);

  // Данные
  standards.forEach(st => {
    // Триггеры: node:X → X
    const triggersText = Array.isArray(st.triggers)
      ? st.triggers.map(t => t.replace(/^node:/, '')).join(', ')
      : '';

    // Top Losses: массив ID → названия через запятую
    const topLossesText = Array.isArray(st.topLosses)
      ? st.topLosses
          .map(id => {
            const l = findLossById(id);
            return l ? l.name : null;
          })
          .filter(Boolean)
          .join(', ')
      : '';

    // Фото
    const photosText = Array.isArray(st.photos) ? st.photos.join(', ') : '';

    // Применять к
    const appliesToText = Array.isArray(st.appliesTo) ? st.appliesTo.join(', ') : '';

    ws.addRow([
      st.nodePart || '',
      st.machine || '',
      st.oplNumber || '',
      st.node || '',
      st.title || '',
      st.line || currentEditorLine,
      st.controlType || '',
      appliesToText,
      st.active !== false ? 'Да' : 'Нет',
      st.problemDescription || '',
      st.controlDescription || '',
      st.purpose || '',
      st.whyCreated || '',
      triggersText,
      topLossesText,
      photosText
    ]);
  });

  // Ширины
  const widths = [12, 10, 14, 30, 34, 10, 14, 18, 10, 34, 34, 30, 30, 22, 30, 30];
  ws.columns.forEach((col, i) => { col.width = widths[i] || 14; });

  // Стилизация шапки
  const headerRow = ws.getRow(1);
  headerRow.height = 36;
  headerRow.eachCell((cell) => {
    cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0A4FA8' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = {
      top:    { style: 'thin', color: { argb: 'FF0A4FA8' } },
      bottom: { style: 'thin', color: { argb: 'FF0A4FA8' } },
      left:   { style: 'thin', color: { argb: 'FF0A4FA8' } },
      right:  { style: 'thin', color: { argb: 'FF0A4FA8' } }
    };
  });

  // Автофильтр
  ws.autoFilter = {
    from: { row: 1, column: 1 },
    to:   { row: 1, column: headers.length }
  };

  // Стилизация данных
  for (let i = 2; i <= ws.rowCount; i++) {
    const row = ws.getRow(i);
    row.height = 30;
    row.eachCell({ includeEmpty: true }, (cell) => {
      cell.font = { name: 'Calibri', size: 11 };
      cell.alignment = { vertical: 'top', horizontal: 'left', wrapText: true };
      cell.border = {
        top:    { style: 'thin', color: { argb: 'FFCBD2D9' } },
        bottom: { style: 'thin', color: { argb: 'FFCBD2D9' } },
        left:   { style: 'thin', color: { argb: 'FFCBD2D9' } },
        right:  { style: 'thin', color: { argb: 'FFCBD2D9' } }
      };
    });
  }

  // ======================= ЛИСТ 2: «Точки» =======================
  const ws2 = wb.addWorksheet('Точки');

  const headers2 = [
    'OPL №',
    'Машина',
    'Бренд',
    '№ точки',
    'Значение'
  ];

  ws2.addRow(headers2);

  // Собираем точки со всех стандартов
  standards.forEach(st => {
    const blocks = Array.isArray(st.measurements) ? st.measurements : [];
    blocks.forEach(block => {
      const points = Array.isArray(block.points) ? block.points : [];
      points.forEach((p, i) => {
        ws2.addRow([
          st.oplNumber || '',
          st.machine || '',
          block.brand || '',
          i + 1,
          p.value || ''
        ]);
      });
    });
  });

  // Ширины
  const widths2 = [14, 12, 20, 10, 26];
  ws2.columns.forEach((col, i) => { col.width = widths2[i] || 14; });

  // Шапка
  const headerRow2 = ws2.getRow(1);
  headerRow2.height = 30;
  headerRow2.eachCell((cell) => {
    cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0A4FA8' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = {
      top:    { style: 'thin', color: { argb: 'FF0A4FA8' } },
      bottom: { style: 'thin', color: { argb: 'FF0A4FA8' } },
      left:   { style: 'thin', color: { argb: 'FF0A4FA8' } },
      right:  { style: 'thin', color: { argb: 'FF0A4FA8' } }
    };
  });

  ws2.autoFilter = {
    from: { row: 1, column: 1 },
    to:   { row: 1, column: headers2.length }
  };

  for (let i = 2; i <= ws2.rowCount; i++) {
    const row = ws2.getRow(i);
    row.height = 22;
    row.eachCell({ includeEmpty: true }, (cell) => {
      cell.font = { name: 'Calibri', size: 11 };
      cell.alignment = { vertical: 'middle', horizontal: 'left' };
      cell.border = {
        top:    { style: 'thin', color: { argb: 'FFCBD2D9' } },
        bottom: { style: 'thin', color: { argb: 'FFCBD2D9' } },
        left:   { style: 'thin', color: { argb: 'FFCBD2D9' } },
        right:  { style: 'thin', color: { argb: 'FFCBD2D9' } }
      };
    });
  }

  // ======================= ЛИСТ 3: «Инструкция» =======================
  const wsInfo = wb.addWorksheet('Инструкция');
  wsInfo.columns = [{ width: 100 }];

  const info = [
    ['📋 Экспорт OPL — ' + currentEditorLine],
    [''],
    ['Дата экспорта: ' + new Date().toLocaleString('ru-RU')],
    ['Стандартов выгружено: ' + standards.length],
    [''],
    ['ЧТО В ФАЙЛЕ:'],
    ['  • Лист «Стандарты» — по одной строке на стандарт.'],
    ['  • Лист «Точки» — по одной строке на каждую точку.'],
    ['      Связь со стандартом — по ключу OPL № + Машина.'],
    [''],
    ['ФАЙЛ ГОТОВ К РЕДАКТИРОВАНИЮ И ОБРАТНОЙ ЗАГРУЗКЕ:'],
    ['  1. Измените нужные данные (можно править всё, кроме структуры колонок).'],
    ['  2. Сохраните файл в .xlsx.'],
    ['  3. В приложении: Редактор → открыть линию → «Импорт из Excel».'],
    [''],
    ['============================================================'],
    ['ЛИСТ «СТАНДАРТЫ» — ОБЯЗАТЕЛЬНЫЕ ПОЛЯ:'],
    ['============================================================'],
    ['  • OPL № — уникален в пределах линии + машины.'],
    ['  • Часть линии — Maker или Packer.'],
    ['  • Машина — обозначение (SE, M1, …).'],
    ['  • Узел — свободный текст.'],
    ['  • Название — краткое описание.'],
    ['  • Линия — код линии.'],
    ['  • Тип контроля — ok_not_ok / value_input / range_input.'],
    ['  • Работа — Run или Stop (по умолчанию Run).'],
    ['  • Время с / Время по — окно проверки (HH:MM), опционально.'],
    ['  • Применять к — ChangeOver, CL_TO, CL_Conversion (через запятую).'],
    ['  • Активен — Да или Нет.'],
    [''],
    ['============================================================'],
    ['ЛИСТ «СТАНДАРТЫ» — ОПЦИОНАЛЬНЫЕ ПОЛЯ:'],
    ['============================================================'],
    ['  • Описания (проблема, контроль, цель, почему создан).'],
    ['  • Триггеры — через запятую (для ChangeOver).'],
    ['  • Top Losses — названия потерь через запятую.'],
    ['  • Фото — имена файлов через запятую.'],
    [''],
    ['============================================================'],
    ['ЛИСТ «ТОЧКИ» (необязательный):'],
    ['============================================================'],
    ['  • OPL № + Машина — должны совпадать со стандартом.'],
    ['  • Бренд — пусто = «Все бренды». Иначе — конкретный бренд.'],
    ['  • № точки — 1, 2, 3, …'],
    ['  • Значение — норма для точки:'],
    ['      value_input: «92 ± 5», «92+-5».'],
    ['      range_input: «5 до 8», «5.5 - 8.5».'],
    ['      Можно писать с единицами: «-65 kPa (±10 kPa)».'],
    [''],
    ['ПРАВИЛА ИМПОРТА:'],
    ['  • Если машины нет в списке линии — она добавится автоматически.'],
    ['  • Потери (Top Losses), не найденные по названию, — пропускаются.'],
    ['  • Дубликаты по OPL № + Машина — пропускаются.'],
    ['  • Пустые строки игнорируются.'],
    ['']
  ];

  info.forEach(([text]) => wsInfo.addRow([text]));
  wsInfo.getRow(1).font = { bold: true, size: 16, color: { argb: 'FF0A4FA8' } };

  // ======================= Скачивание =======================
  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const ts = new Date().toISOString().slice(0, 10);
  downloadBlob(blob, `standards_${currentEditorLine}_${ts}.xlsx`);
  showToast(`Экспортировано: ${standards.length} стандарт(ов)`);
});

/* ============================================================
   COCL: Сворачивание верхней части и показ чек-листа
   ============================================================ */

/** Скрыть настройки, показать чек-лист */
function buildChecklistView() {
  // Прячем все карточки настройки
  ['#brandsCard', '#changesCard', '#buildChecklistCard'].forEach(sel => {
    const el = $(sel);
    if (el) el.style.display = 'none';
  });

  // Карточки с оператором/сменой/линией/типом — тоже скрываем
  const topCards = document.querySelectorAll('#tab-check .card');
  topCards.forEach((card, idx) => {
    if (card.id === 'checklistCard') return;
    // Скрываем всё, что до чек-листа
    card.style.display = 'none';
  });

  // Показываем чек-лист
  $('#checklistCard').style.display = 'block';

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/** Показать настройки, скрыть чек-лист */
function editChecklistConditions() {
  // Показываем все карточки настройки обратно
  const topCards = document.querySelectorAll('#tab-check .card');
  topCards.forEach(card => {
    if (card.id === 'checklistCard') {
      card.style.display = 'none';
    } else {
      // Восстанавливаем отображение — но только тех, что были видны
      // Проще: показываем всё, что должно быть видно по текущему состоянию
      card.style.display = '';
    }
  });

  // Применяем видимость через onTransitionTypeChange
  if (typeof onTransitionTypeChange === 'function') {
    // Сначала скрыть всё ненужное
    ['#brandsCard', '#changesCard', '#buildChecklistCard'].forEach(sel => {
      const el = $(sel);
      if (el) el.style.display = 'none';
    });
    // Затем вызвать логику для актуального типа
    onTransitionTypeChange();
  }

  // Скрываем чек-лист
  $('#checklistCard').style.display = 'none';

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Обработчики
$('#buildChecklistBtn')?.addEventListener('click', buildChecklistView);
$('#editConditionsBtn')?.addEventListener('click', editChecklistConditions);

/* ============================================================
   ПАРСЕР EXCEL — ШАБЛОН OPL (v3: два листа, точки отдельно)
   ============================================================ */
async function parseStandardsExcelV3(file, targetLine) {
  const wb = new ExcelJS.Workbook();
  const buf = await file.arrayBuffer();
  await wb.xlsx.load(buf);

  // --- Лист «Стандарты» — обязательный ---
  const ws = wb.getWorksheet('Стандарты') || wb.worksheets[0];
  if (!ws) throw new Error('Не найден лист «Стандарты»');

  const VALID_PARTS = ['Maker', 'Packer'];
  const VALID_CONTROL = ['ok_not_ok', 'value_input', 'range_input', 'fixed', 'variable', 'interval'];
  const VALID_APPLIES = ['ChangeOver', 'CL_TO', 'CL_Conversion'];

  const TRIGGER_MAP = {
    'табак': 'tobacco',
    'материалы': 'materials',
    'фольга / бумага': 'foil_paper',
    'фольга/бумага': 'foil_paper',
    'фольга': 'foil_paper',
    'бумага': 'foil_paper',
    'полипропилен': 'polypropylene',
    'полипропилен (цветной ↔ обычный)': 'polypropylene'
  };

  const existing = getStandards();

  // Ключ: line|machine|oplNumber (lowercase)
  const existingOplKeys = new Set(
    existing
      .filter(s => s.line === targetLine)
      .map(s => `${s.line}|${s.machine || ''}|${(s.oplNumber || '').toLowerCase()}`)
  );

  // Машины линии
  const lineMachines = getLineMachines();
  if (!Array.isArray(lineMachines[targetLine])) {
    lineMachines[targetLine] = [];
  }
  const machinesForThisLine = lineMachines[targetLine];

  const result = {
    added: 0,
    skipped: 0,
    duplicates: [],
    empty: 0,
    errors: [],
    addedMachines: []
  };

  function splitList(str) {
    if (str == null) return [];
    return String(str).split(',').map(s => s.trim()).filter(Boolean);
  }

  // --- Читаем строки листа «Стандарты» ---
  // Новый порядок колонок:
  // A: Часть линии | B: Машина | C: OPL № | D: Узел | E: Название | F: Линия
  // G: Тип контроля | H: Применять к | I: Активен | J: Описание проблемы
  // K: Описание контроля | L: Цель | M: Почему создан
  // N: Триггеры | O: Top Losses | P: Фото
  const importedStandards = [];    // временный буфер — потом соединим с точками
  const importIndex = {};          // OPL № + Машина → объект стандарта

  for (let i = 2; i <= ws.rowCount; i++) {
    const row = ws.getRow(i);
    const get = (col) => {
      const v = row.getCell(col).value;
      if (v == null) return '';
      if (typeof v === 'object') {
        if (v.text) return String(v.text).trim();
        if (v.result != null) return String(v.result).trim();
        return '';
      }
      return String(v).trim();
    };

    const nodePart      = get(1);   // Часть линии
    const machine       = get(2);   // Машина
    const oplNumber     = get(3);   // OPL №
    const node          = get(4);   // Узел
    const title         = get(5);   // Название
    const lineFromExcel = get(6);   // Линия
    const workRaw       = get(7);   // Работа
    const timeFromRaw   = get(8);   // Время с
    const timeToRaw     = get(9);   // Время по
    const controlType   = get(10);  // Тип контроля
    const appliesToRaw  = get(11);  // Применять к
    const activeRaw     = get(12);  // Активен
    const problemDesc   = get(13);
    const controlDesc   = get(14);
    const purpose       = get(15);
    const whyCreated    = get(16);
    const triggersRaw   = get(17);
    const topLossesRaw  = get(18);
    const photosRaw     = get(19);

    // Пустая строка
    if (!oplNumber && !machine && !title && !node) {
      result.empty++;
      continue;
    }

    // Валидация
    const rowErrors = [];
    if (!oplNumber)   rowErrors.push('пустой OPL №');
    if (!machine)     rowErrors.push('пустая машина');
    if (!nodePart)    rowErrors.push('не указана часть линии');
    if (!node)        rowErrors.push('пустой узел');
    if (!title)       rowErrors.push('пустое название');
    if (!controlType) rowErrors.push('не указан тип контроля');

    if (nodePart && !VALID_PARTS.includes(nodePart)) {
      rowErrors.push(`часть линии «${nodePart}» — допустимо Maker / Packer`);
    }
    if (controlType && !VALID_CONTROL.includes(controlType)) {
      rowErrors.push(`тип контроля «${controlType}» — допустимо ok_not_ok / value_input / range_input`);
    }
    if (lineFromExcel && lineFromExcel !== targetLine) {
      rowErrors.push(`линия в файле «${lineFromExcel}», а импорт идёт в «${targetLine}»`);
    }

    // Дубликат
    const oplKey = `${targetLine}|${machine || ''}|${oplNumber.toLowerCase()}`;
    if (oplNumber && existingOplKeys.has(oplKey)) {
      result.duplicates.push(`${oplNumber} (${machine})`);
      result.skipped++;
      continue;
    }

    if (rowErrors.length) {
      result.errors.push({ row: i, message: rowErrors.join('; ') });
      continue;
    }

    // Автодобавление машины
    if (machine && !machinesForThisLine.includes(machine)) {
      machinesForThisLine.push(machine);
      result.addedMachines.push(machine);
    }

    // appliesTo
    const appliesTo = splitList(appliesToRaw).filter(v => VALID_APPLIES.includes(v));

    // Активен
    const active = !(activeRaw && activeRaw.toLowerCase() === 'нет');

    // Триггеры
    const triggers = [];
    splitList(triggersRaw).forEach(t => {
      const tLow = t.toLowerCase();
      if (tLow.startsWith('node:')) {
        triggers.push('node:' + t.slice(5).trim());
        return;
      }
      if (TRIGGER_MAP[tLow]) {
        triggers.push(TRIGGER_MAP[tLow]);
        return;
      }
      const materialValues = MATERIAL_CHANGES.map(m => m.value);
      if (materialValues.includes(t)) {
        triggers.push(t);
      }
    });

    // Top Losses — по названиям
    const allLossesFlat = getAllLossItems();
    const topLosses = [];
    splitList(topLossesRaw).forEach(name => {
      const found = allLossesFlat.find(l =>
        l.name.toLowerCase() === name.toLowerCase()
      );
      if (found) topLosses.push(found.id);
    });

    // Фото
    const photos = splitList(photosRaw);

    const newStandard = {
      id: uid(),
      active,
      number: '',           // убрали поле № — считаем автоматически при отображении
      oplNumber,
      machine,
      title,
      line: targetLine,
      node,
      nodePart,
      controlType,
      work: (workRaw === 'Stop') ? 'Stop' : 'Run',
      timeFrom: timeFromRaw || '',
      timeTo: timeToRaw || '',
      problemDescription: problemDesc,
      controlDescription: controlDesc,
      purpose: purpose,
      whyCreated: whyCreated,
      measurements: [],     // пока пусто — заполним из листа «Точки»
      appliesTo,
      triggers,
      topLosses,
      photos,
      author: '—',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    importedStandards.push(newStandard);
    importIndex[`${oplNumber.toLowerCase()}|${machine}`] = newStandard;
    existing.push(newStandard);
    existingOplKeys.add(oplKey);
    result.added++;
  }

  // --- Лист «Точки» — опциональный ---
  const ws2 = wb.getWorksheet('Точки');
  let pointsImported = 0;

  if (ws2 && ws2.rowCount > 1) {
    // Ключ: OPL № + Машина → { brand → { pointNum → value } }
    const tempPoints = {};

    for (let i = 2; i <= ws2.rowCount; i++) {
      const row = ws2.getRow(i);
      const get = (col) => {
        const v = row.getCell(col).value;
        if (v == null) return '';
        if (typeof v === 'object') {
          if (v.text) return String(v.text).trim();
          if (v.result != null) return String(v.result).trim();
          return '';
        }
        return String(v).trim();
      };

      const oplNumber = get(1);
      const machine   = get(2);
      const brand     = get(3);
      const pointNum  = parseInt(get(4), 10);
      const value     = get(5);

      if (!oplNumber || !machine || !pointNum) continue;

      const stdKey = `${oplNumber.toLowerCase()}|${machine}`;
      if (!importIndex[stdKey]) {
        // Нет стандарта для этой точки — ошибка
        result.errors.push({
          row: i,
          message: `нет стандарта для точки: ${oplNumber} (${machine})`
        });
        continue;
      }

      if (!tempPoints[stdKey]) tempPoints[stdKey] = {};
      const brandKey = brand || '';   // пусто = Все бренды
      if (!tempPoints[stdKey][brandKey]) tempPoints[stdKey][brandKey] = {};
      tempPoints[stdKey][brandKey][pointNum] = value;
    }

    // Собираем точки в структуру measurements
    Object.entries(tempPoints).forEach(([stdKey, brandMap]) => {
      const std = importIndex[stdKey];
      if (!std) return;

      const blocks = [];
      Object.entries(brandMap).forEach(([brand, pointMap]) => {
        // Сортируем по номеру точки
        const sortedNums = Object.keys(pointMap).map(Number).sort((a, b) => a - b);
        // Проверяем, что нумерация непрерывная от 1
        const points = [];
        let expected = 1;
        for (const num of sortedNums) {
          if (num !== expected) break;   // или можно вставить пустые — но мы не хотим
          points.push({ value: pointMap[num] });
          expected++;
        }
        if (points.length) {
          blocks.push({ brand, points });
        }
      });

      std.measurements = blocks;
      pointsImported += blocks.reduce((sum, b) => sum + b.points.length, 0);
    });
  }

  // --- Сохранение ---
  if (result.added > 0) {
    setStandards(existing);
  }

  if (result.addedMachines.length > 0) {
    setLineMachines(lineMachines);
    if (typeof renderLineMachinesSettings === 'function') renderLineMachinesSettings();
    if (typeof fillEditorFilters === 'function') fillEditorFilters();
  }

  result.pointsImported = pointsImported;

  return result;
}

/* ============================================================
   Форма стандарта: сворачиваемые блоки Триггеры / Top Losses
   ============================================================ */
document.addEventListener('click', (e) => {
  const head = e.target.closest('.sf-collapsible-header');
  if (!head) return;
  const parent = head.closest('.sf-collapsible');
  if (!parent) return;
  parent.classList.toggle('expanded');
});
/* ============================================================
   ВЫБОР ЛИНИИ — компактный dropdown (#linePickerModal)
   ============================================================ */

const linePickerState = {
  workshopId: null,
  areaId: null,
  blockId: null
};

function resetLinePickerState() {
  linePickerState.workshopId = null;
  linePickerState.areaId = null;
  linePickerState.blockId = null;
}

/* --- Открытие / закрытие --- */
function openLinePickerModal() {
  const modal = $('#linePickerModal');
  if (!modal) return;

  const search = $('#linePickerSearch');
  if (search) search.value = '';

  resetLinePickerState();
  renderLinePickerModal('');
  openModal(modal);
  setTimeout(() => { if (search) search.focus(); }, 100);
}

function closeLinePickerModal() {
  closeModal('#linePickerModal');
  resetLinePickerState();
}

/* --- Главный рендер --- */
function renderLinePickerModal(query = '') {
  const body = $('#linePickerBody');
  if (!body) return;

  const q = String(query || '').trim().toLowerCase();

  // 1) Поиск — плоский список найденных линий
  if (q) {
    renderLinePickerSearch(q, body);
    return;
  }

  // 2) Есть выбранный цех — рендерим его содержимое
  if (linePickerState.workshopId) {
    renderLinePickerWorkshopView(body);
    return;
  }

  // 3) Стартовый экран — плитки цехов
  renderLinePickerStart(body);
}

/* --- Стартовый экран: недавние + плитки цехов --- */
function renderLinePickerStart(body) {
  let html = renderLinePickerRecent();

  const workshops = getWorkshops();
  if (!workshops.length) {
    html += '<div class="line-picker-empty">Цехов нет. Добавьте их в Настройках.</div>';
    body.innerHTML = html;
    bindLinePickerEvents(body);
    return;
  }

  const allLines = getAllLinesWithContext();

  html += '<div class="line-picker-tiles">';
  workshops.forEach(w => {
    const count = allLines.filter(x => x.workshopId === w.id).length;
    const sub = count > 0 ? `${count} ${pluralizeLines(count)}` : 'нет линий';

    html += `
      <button type="button" class="line-picker-tile" data-workshop-id="${escapeAttr(w.id)}">
        <span class="line-picker-tile-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            <line x1="3" y1="9" x2="21" y2="9"/>
            <line x1="9" y1="21" x2="9" y2="9"/>
          </svg>
        </span>
        <span class="line-picker-tile-info">
          <span class="line-picker-tile-name">${escapeHtml(w.name)}</span>
          <span class="line-picker-tile-sub">${sub}</span>
        </span>
      </button>
    `;
  });
  html += '</div>';

  body.innerHTML = html;
  bindLinePickerEvents(body);
}

/* --- Экран внутри цеха --- */
function renderLinePickerWorkshopView(body) {
  const w = getWorkshop(linePickerState.workshopId);
  if (!w) {
    resetLinePickerState();
    renderLinePickerStart(body);
    return;
  }

  const area = linePickerState.areaId
    ? (w.areas || []).find(a => a.id === linePickerState.areaId)
    : null;

  const block = (area && linePickerState.blockId && Array.isArray(area.blocks))
    ? area.blocks.find(b => b.id === linePickerState.blockId)
    : null;

  let html = renderLinePickerRecent();
  html += renderLinePickerBreadcrumbs(w, area, block);

  if (block) {
    html += renderLinePickerRowsForBlock(block, w, area);
  } else if (area) {
    if (Array.isArray(area.blocks) && area.blocks.length) {
      html += renderLinePickerBlockTiles(area, w);
    } else {
      html += renderLinePickerRowsForArea(area, w);
    }
  } else {
    html += renderLinePickerAreaTiles(w);
  }

  body.innerHTML = html;
  bindLinePickerEvents(body);
}

/* --- Недавние --- */
function renderLinePickerRecent() {
  const recent = getRecentLines();
  if (!recent.length) return '';

  return `
    <div class="line-picker-recent">
      <div class="line-picker-recent-label">Недавние</div>
      <div class="line-picker-recent-chips">
        ${recent.map(line => `
          <button type="button" class="line-picker-recent-chip" data-line="${escapeAttr(line)}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
            ${escapeHtml(line)}
          </button>
        `).join('')}
      </div>
    </div>
  `;
}

/* --- Крошки внутри модалки --- */
function renderLinePickerBreadcrumbs(w, area, block) {
  const crumbs = [];
  crumbs.push(`<button type="button" class="line-picker-crumb" data-crumb="root">Цеха</button>`);

  if (w) {
    if (area && block) {
      crumbs.push(`<button type="button" class="line-picker-crumb" data-crumb="workshop" data-workshop-id="${escapeAttr(w.id)}">${escapeHtml(w.name)}</button>`);
      crumbs.push(`<button type="button" class="line-picker-crumb" data-crumb="area" data-workshop-id="${escapeAttr(w.id)}" data-area-id="${escapeAttr(area.id)}">${escapeHtml(area.name)}</button>`);
      crumbs.push(`<span class="line-picker-crumb-current">${escapeHtml(block.name)}</span>`);
    } else if (area) {
      crumbs.push(`<button type="button" class="line-picker-crumb" data-crumb="workshop" data-workshop-id="${escapeAttr(w.id)}">${escapeHtml(w.name)}</button>`);
      crumbs.push(`<span class="line-picker-crumb-current">${escapeHtml(area.name)}</span>`);
    } else {
      crumbs.push(`<span class="line-picker-crumb-current">${escapeHtml(w.name)}</span>`);
    }
  }

  return `<div class="line-picker-breadcrumbs">${crumbs.join('<span class="line-picker-crumb-sep">›</span>')}</div>`;
}

/* --- Плитки участков --- */
function renderLinePickerAreaTiles(w) {
  const areas = (w.areas || []);
  if (!areas.length) {
    return '<div class="line-picker-empty">В этом цехе нет участков</div>';
  }

  let html = '<div class="line-picker-tiles">';
  areas.forEach(a => {
    let count = 0;
    if (Array.isArray(a.blocks)) {
      a.blocks.forEach(b => { count += (b.lines || []).length; });
    } else {
      count = (a.lines || []).length;
    }
    const sub = count > 0 ? `${count} ${pluralizeLines(count)}` : 'нет линий';

    html += `
      <button type="button" class="line-picker-tile" data-workshop-id="${escapeAttr(w.id)}" data-area-id="${escapeAttr(a.id)}">
        <span class="line-picker-tile-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
        </span>
        <span class="line-picker-tile-info">
          <span class="line-picker-tile-name">${escapeHtml(a.name)}</span>
          <span class="line-picker-tile-sub">${sub}</span>
        </span>
      </button>
    `;
  });
  html += '</div>';
  return html;
}

/* --- Плитки блоков --- */
function renderLinePickerBlockTiles(area, w) {
  const blocks = area.blocks || [];
  if (!blocks.length) {
    return '<div class="line-picker-empty">В этом участке нет блоков</div>';
  }

  let html = '<div class="line-picker-tiles">';
  blocks.forEach(b => {
    const count = (b.lines || []).length;
    const sub = count > 0 ? `${count} ${pluralizeLines(count)}` : 'нет линий';

    html += `
      <button type="button" class="line-picker-tile" data-workshop-id="${escapeAttr(w.id)}" data-area-id="${escapeAttr(area.id)}" data-block-id="${escapeAttr(b.id)}">
        <span class="line-picker-tile-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
          </svg>
        </span>
        <span class="line-picker-tile-info">
          <span class="line-picker-tile-name">${escapeHtml(b.name)}</span>
          <span class="line-picker-tile-sub">${sub}</span>
        </span>
      </button>
    `;
  });
  html += '</div>';
  return html;
}

/* --- Строки линий участка (без блоков) --- */
function renderLinePickerRowsForArea(area, w) {
  const lines = (area.lines || []).filter(Boolean);
  if (!lines.length) {
    return '<div class="line-picker-empty">В этом участке нет линий</div>';
  }

  const ctx = `${w.name} / ${area.name}`;
  return '<div class="line-picker-rows">' + lines.map(line => `
    <button type="button" class="line-picker-row" data-line="${escapeAttr(line)}">
      <span class="line-picker-row-line">${escapeHtml(line)}</span>
      <span class="line-picker-row-context">${escapeHtml(ctx)}</span>
    </button>
  `).join('') + '</div>';
}

/* --- Строки линий блока --- */
function renderLinePickerRowsForBlock(block, w, area) {
  const lines = (block.lines || []).filter(Boolean);
  if (!lines.length) {
    return '<div class="line-picker-empty">В этом блоке нет линий</div>';
  }

  const ctx = `${w.name} / ${area.name} / ${block.name}`;
  return '<div class="line-picker-rows">' + lines.map(line => `
    <button type="button" class="line-picker-row" data-line="${escapeAttr(line)}">
      <span class="line-picker-row-line">${escapeHtml(line)}</span>
      <span class="line-picker-row-context">${escapeHtml(ctx)}</span>
    </button>
  `).join('') + '</div>';
}

/* --- Результаты поиска --- */
function renderLinePickerSearch(q, body) {
  const all = getAllLinesWithContext();
  const filtered = all.filter(x => String(x.line).toLowerCase().includes(q));

  let html = renderLinePickerRecent();

  if (!filtered.length) {
    html += `<div class="line-picker-empty">Ничего не найдено по запросу «${escapeHtml(q)}»</div>`;
    body.innerHTML = html;
    bindLinePickerEvents(body);
    return;
  }

  filtered.sort((a, b) => {
    const w = (a.workshopName || '').localeCompare(b.workshopName || '', 'ru');
    if (w !== 0) return w;
    const ar = (a.areaName || '').localeCompare(b.areaName || '', 'ru');
    if (ar !== 0) return ar;
    const bl = (a.blockName || '').localeCompare(b.blockName || '', 'ru');
    if (bl !== 0) return bl;
    return String(a.line).localeCompare(String(b.line), 'ru');
  });

  html += '<div class="line-picker-rows">';
  filtered.forEach(x => {
    const ctx = [x.workshopName, x.areaName, x.blockName].filter(Boolean).join(' / ');
    html += `
      <button type="button" class="line-picker-row" data-line="${escapeAttr(x.line)}">
        <span class="line-picker-row-line">${escapeHtml(x.line)}</span>
        <span class="line-picker-row-context">${escapeHtml(ctx)}</span>
      </button>
    `;
  });
  html += '</div>';

  body.innerHTML = html;
  bindLinePickerEvents(body);
}

/* --- Привязка обработчиков --- */
function bindLinePickerEvents(container) {
  // Недавние
  container.querySelectorAll('.line-picker-recent-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const line = chip.dataset.line;
      if (line) selectLine(line);
    });
  });

  // Плитки
  container.querySelectorAll('.line-picker-tile').forEach(tile => {
    tile.addEventListener('click', () => {
      const wId = tile.dataset.workshopId;
      const aId = tile.dataset.areaId || null;
      const bId = tile.dataset.blockId || null;
      if (!wId) return;
      linePickerState.workshopId = wId;
      linePickerState.areaId = aId;
      linePickerState.blockId = bId;
      renderLinePickerModal('');
    });
  });

  // Крошки
  container.querySelectorAll('.line-picker-crumb').forEach(crumb => {
    crumb.addEventListener('click', () => {
      const kind = crumb.dataset.crumb;
      if (kind === 'root') resetLinePickerState();
      else if (kind === 'workshop') { linePickerState.areaId = null; linePickerState.blockId = null; }
      else if (kind === 'area') { linePickerState.blockId = null; }
      renderLinePickerModal('');
    });
  });

  // Строки
  container.querySelectorAll('.line-picker-row').forEach(row => {
    row.addEventListener('click', () => {
      const line = row.dataset.line;
      if (line) selectLine(line);
    });
  });
}

/* ============================================================
   Выбор линии
   ============================================================ */

/* Колбэк переиспользования модалки выбора линии (например, во вкладке COCL).
   Если задан — selectLine отдаёт выбор обратно, а не редактору стандартов. */
let linePickerOnSelect = null;

function selectLine(line) {
  if (!line) return;

  // Переиспользование модалки выбора линии (COCL и др.)
  if (typeof linePickerOnSelect === 'function') {
    const cb = linePickerOnSelect;
    linePickerOnSelect = null;
    addRecentLine(line);
    closeLinePickerModal();
    cb(line);
    return;
  }

  localStorage.setItem('cl_editor_line', line);
  currentEditorLine = line;   // ← глобальная для формы стандарта
  addRecentLine(line);

  // Сбрасываем пагинацию и выделение
  editorTableState.mechPage = 1;
  editorTableState.elecPage = 1;
  editorTableState.mechSelected.clear();
  editorTableState.elecSelected.clear();

  // Обновляем фильтры (пересобираем опции)
  if (typeof fillEditorFilters === 'function') fillEditorFilters();

  // Выставляем фильтр «Линия» = выбранная линия
  const emLine = document.getElementById('emFilterLine');
  if (emLine) emLine.value = line;
  const eeLine = document.getElementById('eeFilterLine');
  if (eeLine) eeLine.value = line;

  // Обновляем UI
  updateEditorLineContext();
  updatePartCounters();

  // Перерисовка таблиц
  if (typeof refreshEditorMechTable === 'function') refreshEditorMechTable();
  if (typeof refreshEditorElecTable === 'function') refreshEditorElecTable();

  closeLinePickerModal();
  showToast('Выбрана линия: ' + line);
}

/* ============================================================
   Обновление UI: чип + крошки + счётчики
   ============================================================ */

function updateEditorLineContext() {
  const line = localStorage.getItem('cl_editor_line') || '';

  ['em', 'ee'].forEach(prefix => {
    const codeEl = $(`#${prefix}LinePillCode`);
    const crumbsEl = $(`#${prefix}EditorCrumbs`);
    const countersEl = $(`#${prefix}PartCounters`);
    const modeSwitchEl = $(`#${prefix}ModeSwitch`);

    // Чип линии
    if (codeEl) {
      if (line) {
        const ctx = typeof getBlockForLine === 'function' ? getBlockForLine(line) : null;
        const workshopName = ctx ? ctx.workshop.name : '';
        codeEl.textContent = line + (workshopName ? ' · ' + workshopName : '');
      } else {
        codeEl.textContent = 'Выбрать линию';
      }
    }

    // Крошки — только если линия выбрана
    if (crumbsEl) {
      if (line) {
        crumbsEl.innerHTML = buildEditorCrumbs(line);
        crumbsEl.style.display = 'flex';
      } else {
        crumbsEl.innerHTML = '';
        crumbsEl.style.display = 'none';
      }
    }

    // Счётчики — только если линия выбрана
    if (countersEl) {
      countersEl.style.display = line ? 'inline-flex' : 'none';
    }

    // Переключатель Мех/Элек — скрыт, пока линия не выбрана
    if (modeSwitchEl) {
      modeSwitchEl.style.display = line ? 'inline-flex' : 'none';
    }
  });
  // Обновляем опции фильтров
  if (typeof fillEditorFilters === 'function') fillEditorFilters();
}
/* --- Крошки над панелью --- */
function buildEditorCrumbs(line) {
  const ctx = typeof getBlockForLine === 'function' ? getBlockForLine(line) : null;
  if (!ctx) return '';

  const iconWorkshop = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 20h20"/><path d="M4 20V8l6-4v16"/><path d="M14 20V4l6 4v12"/></svg>';
  const iconArea = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>';
  const iconBlock = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>';
  const iconLine = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>';

  let html = '';
  html += `<button type="button" class="editor-crumb" data-crumb="open-picker">${iconWorkshop} ${escapeHtml(ctx.workshop.name)}</button>`;
  html += '<span class="editor-crumb-sep">›</span>';
  html += `<span class="editor-crumb-current">${iconArea} ${escapeHtml(ctx.area.name)}</span>`;

  if (ctx.block) {
    html += '<span class="editor-crumb-sep">›</span>';
    html += `<span class="editor-crumb-current">${iconBlock} ${escapeHtml(ctx.block.name)}</span>`;
  }

  html += '<span class="editor-crumb-sep">›</span>';
  html += `<span class="editor-crumb-current">${iconLine} ${escapeHtml(line)}</span>`;

  return html;
}

/* ============================================================
   Счётчики Maker / Packer
   ============================================================ */

function updatePartCounters() {
  const line = localStorage.getItem('cl_editor_line') || '';
  if (!line) return;

  const standards = getStandards().filter(s => s.line === line);

  const countPart = (part) => {
    const all = standards.filter(s => s.nodePart === part).length;
    const active = standards.filter(s => s.nodePart === part && s.active !== false).length;
    return { all, active };
  };

  const m = countPart('Maker');
  const p = countPart('Packer');

  ['em', 'ee'].forEach(prefix => {
    const mk = $(`#${prefix}CounterMaker`);
    const pk = $(`#${prefix}CounterPacker`);
    if (mk) mk.textContent = `${m.active}/${m.all}`;
    if (pk) pk.textContent = `${p.active}/${p.all}`;

    // Синхронизируем активное состояние переключателя с текущим фильтром
    const switchEl = $(`#${prefix}PartCounters`);
    const currentPart = ($(`#${prefix}FilterPart`)?.value) || '';
    if (switchEl) {
      switchEl.querySelectorAll('.editor-part-switch-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.part === currentPart);
      });
    }
  });
}

/* ============================================================
   Переключатель режима внутри панели
   ============================================================ */

function switchEditorModeInline(mode) {
  // Подсветка кнопок в обеих панелях
  document.querySelectorAll('#emModeSwitch .editor-mode-inline-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === mode);
  });
  document.querySelectorAll('#eeModeSwitch .editor-mode-inline-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === mode);
  });

  // Показ панелей (работает ВСЕГДА, даже без линии)
  const mechView = $('#editorMechView');
  const elecView = $('#editorElecView');
  if (mechView) mechView.style.display = (mode === 'elec') ? 'none' : 'block';
  if (elecView) elecView.style.display = (mode === 'elec') ? 'block' : 'none';

  try { localStorage.setItem('cl_editor_mode', mode); } catch (e) {}

  // Обновить UI (если линия есть — обновит, если нет — просто ничего)
  updateEditorLineContext();
  updatePartCounters();

  // Обновить таблицы
  if (mode === 'elec') {
    if (typeof refreshEditorElecTable === 'function') refreshEditorElecTable();
  } else {
    if (typeof refreshEditorMechTable === 'function') refreshEditorMechTable();
  }
}
/* ============================================================
   Сброс линии
   ============================================================ */

function clearEditorLine() {
  localStorage.removeItem('cl_editor_line');
  currentEditorLine = null;

  // Сброс фильтра «Линия»
  const emLine = document.getElementById('emFilterLine');
  if (emLine) emLine.value = '';
  const eeLine = document.getElementById('eeFilterLine');
  if (eeLine) eeLine.value = '';

  // Сброс пагинации и выделения
  editorTableState.mechPage = 1;
  editorTableState.elecPage = 1;
  editorTableState.mechSelected.clear();
  editorTableState.elecSelected.clear();

  updateEditorLineContext();

  if (typeof refreshEditorMechTable === 'function') refreshEditorMechTable();
  if (typeof refreshEditorElecTable === 'function') refreshEditorElecTable();

  showToast('Линия сброшена');
}

/* ============================================================
   Обработчики
   ============================================================ */

/* Модалка */
$('#linePickerClose')?.addEventListener('click', closeLinePickerModal);
$('#linePickerModal')?.addEventListener('click', (e) => {
  if (e.target.id === 'linePickerModal') closeLinePickerModal();
});

/* Поиск в модалке */
$('#linePickerSearch')?.addEventListener('input', (e) => {
  renderLinePickerModal(e.target.value);
});

/* Чип линии — открывает модалку */
$('#emLinePill')?.addEventListener('click', openLinePickerModal);
$('#eeLinePill')?.addEventListener('click', openLinePickerModal);

/* Переключатель режима внутри панели */
$('#emModeSwitch')?.addEventListener('click', (e) => {
  const btn = e.target.closest('.editor-mode-inline-btn');
  if (!btn) return;
  switchEditorModeInline(btn.dataset.mode);
});
$('#eeModeSwitch')?.addEventListener('click', (e) => {
  const btn = e.target.closest('.editor-mode-inline-btn');
  if (!btn) return;
  switchEditorModeInline(btn.dataset.mode);
});

/* Переключатель по части линии */
function bindPartSwitchHandlers(containerId, prefix) {
  const container = $(`#${containerId}`);
  if (!container) return;

  container.querySelectorAll('.editor-part-switch-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const part = btn.dataset.part || '';

      // Подсветка активного
      container.querySelectorAll('.editor-part-switch-btn').forEach(b => {
        b.classList.toggle('active', b === btn);
      });

      // Синхронизируем фильтр «Часть линии»
      const sel = $(`#${prefix}FilterPart`);
      if (sel) sel.value = part;

      // Перерисовка таблицы
      if (prefix === 'em') {
        if (typeof refreshEditorMechTable === 'function') refreshEditorMechTable();
      } else {
        if (typeof refreshEditorElecTable === 'function') refreshEditorElecTable();
      }
    });
  });
}

bindPartSwitchHandlers('emPartCounters', 'em');
bindPartSwitchHandlers('eePartCounters', 'ee');

/* Крошки — клик по цеху → открыть модалку */
document.addEventListener('click', (e) => {
  const crumb = e.target.closest('.editor-crumb[data-crumb="open-picker"]');
  if (crumb) {
    openLinePickerModal();
  }
});

/* ============================================================
   РЕДАКТОР: состояние таблиц (пагинация + выделение)
   ============================================================ */

const editorTableState = {
  mechPage: 1,
  mechPageSize: 20,
  mechSelected: new Set(),     // Set из id выбранных стандартов

  elecPage: 1,
  elecPageSize: 20,
  elecSelected: new Set()
};

/* ============================================================
   РЕДАКТОР: парсинг нормы (для колонок)
   ============================================================ */

function formatEditorDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}.${mm}.${yyyy}`;
}

/* ============================================================
   МЕХАНИЧЕСКИЕ СТАНДАРТЫ: фильтрация
   ============================================================ */

function getFilteredMechStandards() {
  const all = getStandards();

  // Учитываем активную линию, если она выбрана
  const editorLine = localStorage.getItem('cl_editor_line') || '';

  const workshopId = $('#emFilterWorkshop')?.value || '';
  const areaId = $('#emFilterArea')?.value || '';
  const line = $('#emFilterLine')?.value || '';
  const machine = $('#emFilterMachine')?.value || '';
  const node = $('#emFilterNode')?.value || '';
  const type = $('#emFilterType')?.value || '';
  const part = $('#emFilterPart')?.value || '';
  const activeFilter = $('#emFilterActive')?.value || '';
  const search = ($('#emFilterSearch')?.value || '').trim().toLowerCase();

  // Заранее готовим кэш: для каждой линии — контекст (workshopId/areaId/blockId)
  const lineContextCache = {};
  const allLinesCtx = getAllLinesWithContext();
  allLinesCtx.forEach(x => { lineContextCache[x.line] = x; });

  let filtered = all.filter(st => {
    // Цех
    if (workshopId) {
      const ctx = lineContextCache[st.line];
      if (!ctx || ctx.workshopId !== workshopId) return false;
    }

    // Участок
    if (areaId) {
      const ctx = lineContextCache[st.line];
      if (!ctx || ctx.areaId !== areaId) return false;
    }

    // Линия (приоритет — фильтр, если задан, иначе — выбранная)
    if (line) {
      if (st.line !== line) return false;
    } else if (editorLine) {
      if (st.line !== editorLine) return false;
    }

    // Машина
    if (machine && st.machine !== machine) return false;

    // Узел
    if (node && st.node !== node) return false;

    // Тип (appliesTo)
    if (type === '__none') {
      if (st.appliesTo && st.appliesTo.length) return false;
    } else if (type) {
      if (!st.appliesTo || !st.appliesTo.includes(type)) return false;
    }

    // Часть линии
    if (part && st.nodePart !== part) return false;

    // Активность
    if (activeFilter === 'active' && st.active === false) return false;
    if (activeFilter === 'inactive' && st.active !== false) return false;

    // Поиск
    if (search) {
      const hay = [
        st.title, st.oplNumber, st.node, st.machine, st.nodePart, st.number
      ].map(v => String(v || '').toLowerCase()).join(' ');
      if (!hay.includes(search)) return false;
    }

    return true;
  });

  // Сортировка: по OPL № (натурально), потом по машине
  filtered.sort((a, b) => {
    const oa = String(a.oplNumber || '').toLowerCase();
    const ob = String(b.oplNumber || '').toLowerCase();
    if (oa !== ob) return oa.localeCompare(ob, 'ru', { numeric: true });
    const ma = String(a.machine || '');
    const mb = String(b.machine || '');
    return ma.localeCompare(mb, 'ru');
  });

  return filtered;
}

/* ============================================================
   МЕХАНИЧЕСКИЕ СТАНДАРТЫ: рендер таблицы
   ============================================================ */

function refreshEditorMechTable() {
  const wrap = $('#editorMechTableWrap');
  const paginationEl = $('#editorMechPagination');
  const countEl = $('#editorMechCount');
  if (!wrap) return;

  const line = localStorage.getItem('cl_editor_line') || '';
  const standards = getFilteredMechStandards();

  // Счётчик в шапке панели
  if (countEl) {
    if (line) {
      const totalLine = getStandards().filter(s => s.line === line).length;
      countEl.textContent = `${standards.length} из ${totalLine}`;
    } else {
      countEl.textContent = `${standards.length}`;
    }
  }

  // Пустое состояние
  if (!standards.length) {
    wrap.innerHTML = '<div class="editor-empty">Стандарты не найдены</div>';
    if (paginationEl) paginationEl.innerHTML = '';
    return;
  }

  // Пагинация
  const totalPages = Math.ceil(standards.length / editorTableState.mechPageSize);
  if (editorTableState.mechPage > totalPages) editorTableState.mechPage = totalPages;
  if (editorTableState.mechPage < 1) editorTableState.mechPage = 1;

  const startIdx = (editorTableState.mechPage - 1) * editorTableState.mechPageSize;
  const endIdx = Math.min(startIdx + editorTableState.mechPageSize, standards.length);
  const pageItems = standards.slice(startIdx, endIdx);

  // --- Таблица ---
  let html = `
    <table class="editor-table">
      <thead>
        <tr>
          <th class="et-col-num">№</th>
          <th class="et-col-check">
            <input type="checkbox" class="et-check-all" id="emCheckAll">
          </th>
          <th class="et-col-title">Название</th>
          <th class="et-col-machine">Машина</th>
          <th class="et-col-opl">№ OPL</th>
          <th class="et-col-struct">Структура</th>
          <th class="et-col-part">Часть</th>
          <th class="et-col-types">Тип</th>
          <th class="et-col-status">Статус</th>
          <th class="et-col-date">Дата</th>
          <th class="et-col-actions">Действия</th>
        </tr>
      </thead>
      <tbody>
  `;
  pageItems.forEach((st, idx) => {
    const isActive = st.active !== false;
    const isSelected = editorTableState.mechSelected.has(st.id);

    const ctx = lineContextCacheForLine(st.line);
    const contextHtml = ctx
      ? `<div class="et-struct">${escapeHtml(ctx.workshopName)}<br>${escapeHtml([ctx.areaName, ctx.blockName].filter(Boolean).join(' / '))}<br><strong>${escapeHtml(st.line)}</strong></div>`
      : `<div class="et-struct">${escapeHtml(st.line || '—')}</div>`;

    const typesHtml = renderMechTypeChips(st.appliesTo);
    const partHtml = st.nodePart ? `<span class="et-part-chip et-part-${st.nodePart.toLowerCase()}">${escapeHtml(st.nodePart)}</span>` : '—';

    // Порядковый номер: (page - 1) * size + idx + 1
    const rowNumber = (editorTableState.mechPage - 1) * editorTableState.mechPageSize + idx + 1;

    html += `
      <tr data-std-id="${escapeAttr(st.id)}" class="${isSelected ? 'is-selected' : ''} ${isActive ? '' : 'et-row-inactive'}">
        <td class="et-col-num">${rowNumber}</td>
        <td class="et-col-check">
          <input type="checkbox" class="et-check-row" data-std-id="${escapeAttr(st.id)}" ${isSelected ? 'checked' : ''}>
        </td>
        <td class="et-col-title">
          <div class="et-title">
            <span class="et-title-text" data-open-view="${escapeAttr(st.id)}" style="cursor:pointer">${escapeHtml(st.title || '—')}</span>
          </div>
        </td>
        <td class="et-col-machine"><span class="et-machine">${escapeHtml(st.machine || '—')}</span></td>
        <td class="et-col-opl">
          <span class="et-opl" data-open-view="${escapeAttr(st.id)}">${escapeHtml(st.oplNumber || '—')}</span>
        </td>
        <td class="et-col-struct">${contextHtml}</td>
        <td class="et-col-part">${partHtml}</td>
        <td class="et-col-types"><div class="et-types">${typesHtml}</div></td>
        <td class="et-col-status">
          <span class="et-status ${isActive ? 'et-status-active' : 'et-status-inactive'}"
                title="${isActive ? 'Активен' : 'Неактивен — измените в редактировании стандарта'}">
            ${isActive ? 'Активен' : 'Неактивен'}
          </span>
        </td>
        <td class="et-col-date">
          <span class="et-date">${escapeHtml(formatEditorDate(st.updatedAt || st.createdAt))}</span>
        </td>
        <td class="et-col-actions">
          <div class="et-actions">
            <button type="button" class="et-action-btn et-action-edit" data-edit="${escapeAttr(st.id)}" title="Редактировать">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>
            <button type="button" class="et-action-btn et-action-copy" data-copy="${escapeAttr(st.id)}" title="Копировать">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
              </svg>
            </button>
            <button type="button" class="et-action-btn et-action-delete" data-delete="${escapeAttr(st.id)}" title="Удалить">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                <path d="M10 11v6"/><path d="M14 11v6"/>
                <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
              </svg>
            </button>
          </div>
        </td>
      </tr>
    `;
  });

  html += '</tbody></table>';
  wrap.innerHTML = html;

  // --- Пагинация ---
  renderEditorMechPagination(standards.length, totalPages, startIdx, endIdx);

  // --- Обработчики ---

  // Клик по OPL / по названию → полный просмотр
  wrap.querySelectorAll('[data-open-view]').forEach(el => {
    el.addEventListener('click', () => {
      const id = el.dataset.openView;
      if (id) openStandardFullView(id, 'view');
    });
  });

  // Кнопки действий
  wrap.querySelectorAll('[data-edit]').forEach(btn => {
    btn.addEventListener('click', () => openStandardFullView(btn.dataset.edit, 'edit'));
  });
  wrap.querySelectorAll('[data-copy]').forEach(btn => {
    btn.addEventListener('click', () => copyStandardNew(btn.dataset.copy));
  });
  wrap.querySelectorAll('[data-delete]').forEach(btn => {
    btn.addEventListener('click', () => deleteStandardNew(btn.dataset.delete));
  });

  // Чекбоксы выделения
  wrap.querySelectorAll('.et-check-row').forEach(cb => {
    cb.addEventListener('change', () => {
      const id = cb.dataset.stdId;
      if (!id) return;
      if (cb.checked) editorTableState.mechSelected.add(id);
      else editorTableState.mechSelected.delete(id);
      updateMechSelectionUI();
    });
  });

  // «Выделить все» — чекбокс в шапке
  const checkAll = wrap.querySelector('#emCheckAll');
  if (checkAll) {
    const allOnPageSelected = pageItems.every(st => editorTableState.mechSelected.has(st.id));
    checkAll.checked = allOnPageSelected;

    checkAll.addEventListener('change', () => {
      if (checkAll.checked) {
        pageItems.forEach(st => editorTableState.mechSelected.add(st.id));
      } else {
        pageItems.forEach(st => editorTableState.mechSelected.delete(st.id));
      }
      refreshEditorMechTable();
    });
  }

  // Подсветка выделенных строк
  updateMechSelectionUI();
}

/* --- Хелпер: контекст линии --- */
const _lineContextCache = {};
function lineContextCacheForLine(line) {
  if (_lineContextCache[line]) return _lineContextCache[line];
  const ctx = typeof getBlockForLine === 'function' ? getBlockForLine(line) : null;
  const result = ctx ? {
    workshopId: ctx.workshop.id, workshopName: ctx.workshop.name,
    areaId: ctx.area.id, areaName: ctx.area.name,
    blockId: ctx.block ? ctx.block.id : null,
    blockName: ctx.block ? ctx.block.name : null
  } : null;
  _lineContextCache[line] = result;
  return result;
}

/* --- Хелпер: чипы типов --- */
function renderMechTypeChips(appliesTo) {
  if (!Array.isArray(appliesTo) || !appliesTo.length) {
    return '<span class="et-type-chip et-type-none">Без привязки</span>';
  }
  const map = {
    ChangeOver: { cls: 'et-type-changeover', label: 'Change Over' },
    CL_TO: { cls: 'et-type-clto', label: 'CL в ТО' },
    CL_Conversion: { cls: 'et-type-clconv', label: 'CL в Конв.' }
  };
  return appliesTo.map(t => {
    const info = map[t];
    if (!info) return '';
    return `<span class="et-type-chip ${info.cls}">${info.label}</span>`;
  }).join('');
}

/* --- UI: счётчик выделенных + подсветка --- */
function updateMechSelectionUI() {
  const selected = editorTableState.mechSelected.size;

  // Счётчик в шапке
  const countEl = $('#editorMechCount');
  if (countEl) {
    // если выделено — показываем «Выбрано: N» вместо «из X»
    if (selected > 0) {
      const line = localStorage.getItem('cl_editor_line') || '';
      const standards = getFilteredMechStandards();
      countEl.textContent = `Выбрано: ${selected} · ${standards.length} из ${line ? getStandards().filter(s => s.line === line).length : getStandards().length}`;
    } else {
      // Пересчитываем в обычный вид
      const standards = getFilteredMechStandards();
      const line = localStorage.getItem('cl_editor_line') || '';
      countEl.textContent = line
        ? `${standards.length} из ${getStandards().filter(s => s.line === line).length}`
        : `${standards.length}`;
    }
  }

  // Подсветка строк
  document.querySelectorAll('#editorMechTableWrap tr[data-std-id]').forEach(tr => {
    tr.classList.toggle('is-selected', editorTableState.mechSelected.has(tr.dataset.stdId));
  });
}

/* --- Пагинация --- */
function renderEditorMechPagination(total, totalPages, startIdx, endIdx) {
  const bar = $('#editorMechPagination');
  if (!bar) return;

  if (totalPages <= 1) {
    bar.innerHTML = `
      <span class="pagination-info">Показано ${startIdx + 1}–${endIdx} из ${total}</span>
      <div class="pagination-controls">
        <select class="pagination-size" id="emPageSize">
          <option value="10"  ${editorTableState.mechPageSize === 10 ? 'selected' : ''}>10</option>
          <option value="20"  ${editorTableState.mechPageSize === 20 ? 'selected' : ''}>20</option>
          <option value="50"  ${editorTableState.mechPageSize === 50 ? 'selected' : ''}>50</option>
          <option value="100" ${editorTableState.mechPageSize === 100 ? 'selected' : ''}>100</option>
        </select>
      </div>
    `;
    bar.querySelector('#emPageSize')?.addEventListener('change', (e) => {
      editorTableState.mechPageSize = parseInt(e.target.value, 10) || 20;
      editorTableState.mechPage = 1;
      refreshEditorMechTable();
    });
    return;
  }

  const cur = editorTableState.mechPage;
  let html = `<span class="pagination-info">Показано ${startIdx + 1}–${endIdx} из ${total}</span>`;
  html += '<div class="pagination-controls">';
  html += `<button class="pagination-btn" ${cur === 1 ? 'disabled' : ''} data-page="${cur - 1}">←</button>`;

  // страницы
  const pages = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || Math.abs(i - cur) <= 2) pages.push(i);
    else if (pages[pages.length - 1] !== '...') pages.push('...');
  }
  pages.forEach(p => {
    if (p === '...') html += '<span class="pagination-dots">…</span>';
    else html += `<button class="pagination-btn ${p === cur ? 'active' : ''}" data-page="${p}">${p}</button>`;
  });

  html += `<button class="pagination-btn" ${cur === totalPages ? 'disabled' : ''} data-page="${cur + 1}">→</button>`;

  // Размер страницы
  html += `
    <select class="pagination-size" id="emPageSize">
      <option value="10"  ${editorTableState.mechPageSize === 10 ? 'selected' : ''}>10</option>
      <option value="20"  ${editorTableState.mechPageSize === 20 ? 'selected' : ''}>20</option>
      <option value="50"  ${editorTableState.mechPageSize === 50 ? 'selected' : ''}>50</option>
      <option value="100" ${editorTableState.mechPageSize === 100 ? 'selected' : ''}>100</option>
    </select>
  `;
  html += '</div>';
  bar.innerHTML = html;

  // Обработчики пагинации
  bar.querySelectorAll('[data-page]').forEach(btn => {
    btn.addEventListener('click', () => {
      const p = parseInt(btn.dataset.page, 10);
      if (!isNaN(p) && p >= 1 && p <= totalPages) {
        editorTableState.mechPage = p;
        refreshEditorMechTable();
      }
    });
  });

  bar.querySelector('#emPageSize')?.addEventListener('change', (e) => {
    editorTableState.mechPageSize = parseInt(e.target.value, 10) || 20;
    editorTableState.mechPage = 1;
    refreshEditorMechTable();
  });
}

/* ============================================================
   ЭЛЕКТРОННЫЕ ПАРАМЕТРЫ: фильтрация
   ============================================================ */

function getFilteredElecParams() {
  const all = getElectronicParams().map(normalizeElectronicParam);

  const workshopId = $('#eeFilterWorkshop')?.value || '';
  const areaId = $('#eeFilterArea')?.value || '';
  const line = $('#eeFilterLine')?.value || '';
  const machine = $('#eeFilterMachine')?.value || '';
  const controlType = $('#eeFilterControlType')?.value || '';
  const freqType = $('#eeFilterFreq')?.value || '';
  const activeFilter = $('#eeFilterActive')?.value || '';
  const search = ($('#eeFilterSearch')?.value || '').trim().toLowerCase();

  const lineContextCache = {};
  const allLinesCtx = getAllLinesWithContext();
  allLinesCtx.forEach(x => { lineContextCache[x.line] = x; });

  let filtered = all.filter(p => {
    if (workshopId) {
      const ctx = lineContextCache[p.line];
      if (!ctx || ctx.workshopId !== workshopId) return false;
    }
    if (areaId) {
      const ctx = lineContextCache[p.line];
      if (!ctx || ctx.areaId !== areaId) return false;
    }
    if (line && p.line !== line) return false;
    if (machine && p.machine !== machine) return false;

    if (controlType && p.controlType !== controlType) return false;
    if (freqType && p.frequency?.type !== freqType) return false;

    if (activeFilter === 'active' && p.active === false) return false;
    if (activeFilter === 'inactive' && p.active !== false) return false;

    if (search) {
      const hay = [p.paramName, p.machine, p.line].map(v => String(v || '').toLowerCase()).join(' ');
      if (!hay.includes(search)) return false;
    }

    return true;
  });

  filtered.sort((a, b) => {
    const la = String(a.line || '').toLowerCase();
    const lb = String(b.line || '').toLowerCase();
    if (la !== lb) return la.localeCompare(lb, 'ru');
    const ma = String(a.machine || '').toLowerCase();
    const mb = String(b.machine || '').toLowerCase();
    if (ma !== mb) return ma.localeCompare(mb, 'ru');
    return String(a.paramName || '').localeCompare(String(b.paramName || ''), 'ru');
  });

  return filtered;
}

/* ============================================================
   ЭЛЕКТРОННЫЕ ПАРАМЕТРЫ: рендер таблицы
   ============================================================ */

function refreshEditorElecTable() {
  const wrap = $('#editorElecTableWrap');
  const paginationEl = $('#editorElecPagination');
  const countEl = $('#editorElecCount');
  if (!wrap) return;

  const line = localStorage.getItem('cl_editor_line') || '';
  const params = getFilteredElecParams();

  if (countEl) {
    if (line) {
      const totalLine = getElectronicParamsForLine(line).length;
      countEl.textContent = `${params.length} из ${totalLine}`;
    } else {
      countEl.textContent = `${params.length}`;
    }
  }

  if (!params.length) {
    wrap.innerHTML = '<div class="editor-empty">Электронные параметры не найдены</div>';
    if (paginationEl) paginationEl.innerHTML = '';
    return;
  }

  const totalPages = Math.ceil(params.length / editorTableState.elecPageSize);
  if (editorTableState.elecPage > totalPages) editorTableState.elecPage = totalPages;
  if (editorTableState.elecPage < 1) editorTableState.elecPage = 1;

  const startIdx = (editorTableState.elecPage - 1) * editorTableState.elecPageSize;
  const endIdx = Math.min(startIdx + editorTableState.elecPageSize, params.length);
  const pageItems = params.slice(startIdx, endIdx);

  let html = `
    <table class="editor-table">
      <thead>
        <tr>
          <th class="et-col-num">№</th>
          <th class="et-col-check"><input type="checkbox" class="et-check-all" id="eeCheckAll"></th>
          <th class="et-col-title">Параметр</th>
          <th class="et-col-machine">Машина</th>
          <th class="et-col-struct">Структура</th>
          <th class="et-col-part">Часть</th>
          <th class="et-col-types">Тип</th>
          <th class="et-col-types">Применяемость</th>
          <th class="et-col-status">Статус</th>
          <th class="et-col-date">Дата</th>
          <th class="et-col-actions">Действия</th>
        </tr>
      </thead>
      <tbody>
  `;

  pageItems.forEach((p, idx) => {
    const isActive = p.active !== false;
    const isSelected = editorTableState.elecSelected.has(p.id);

    const ctx = lineContextCacheForLine(p.line);
    const contextHtml = ctx
      ? `<div class="et-struct">${escapeHtml(ctx.workshopName)}<br>${escapeHtml([ctx.areaName, ctx.blockName].filter(Boolean).join(' / '))}<br><strong>${escapeHtml(p.line)}</strong></div>`
      : `<div class="et-struct">${escapeHtml(p.line || '—')}</div>`;

    // Часть линии
    const partHtml = p.nodePart
      ? `<span class="et-part-chip et-part-${p.nodePart.toLowerCase()}">${escapeHtml(p.nodePart)}</span>`
      : '—';

    // Тип контроля
    const typeLabel = controlTypeLabel(p.controlType);
    const typeCls = (p.controlType === 'fixed' || p.controlType === 'ok_not_ok')
      ? 'et-type-none' : 'et-type-clto';
    const typeHtml = `<span class="et-type-chip ${typeCls}">${escapeHtml(typeLabel)}</span>`;

    // Применяемость
    const appliesToHtml = renderMechTypeChips(p.appliesTo);

    // Порядковый номер
    const rowNumber = (editorTableState.elecPage - 1) * editorTableState.elecPageSize + idx + 1;

    html += `
      <tr data-param-id="${escapeAttr(p.id)}" class="${isSelected ? 'is-selected' : ''} ${isActive ? '' : 'et-row-inactive'}">
        <td class="et-col-num">${rowNumber}</td>
        <td class="et-col-check">
          <input type="checkbox" class="et-check-row" data-param-id="${escapeAttr(p.id)}" ${isSelected ? 'checked' : ''}>
        </td>
        <td class="et-col-title">
          <div class="et-title">
            <span class="et-title-text" data-open-view-elec="${escapeAttr(p.id)}" style="cursor:pointer">${escapeHtml(p.paramName || '—')}</span>
          </div>
        </td>
        <td class="et-col-machine"><span class="et-machine">${escapeHtml(p.machine || '—')}</span></td>
        <td class="et-col-struct">${contextHtml}</td>
        <td class="et-col-part">${partHtml}</td>
        <td class="et-col-types">${typeHtml}</td>
        <td class="et-col-types"><div class="et-types">${appliesToHtml}</div></td>
        <td class="et-col-status">
          <span class="et-status ${isActive ? 'et-status-active' : 'et-status-inactive'}"
                title="${isActive ? 'Активен' : 'Неактивен — измените в редактировании параметра'}">
            ${isActive ? 'Активен' : 'Неактивен'}
          </span>
        </td>
        <td class="et-col-date">
          <span class="et-date">${escapeHtml(formatEditorDate(p.updatedAt || p.createdAt))}</span>
        </td>
        <td class="et-col-actions">
          <div class="et-actions">
            <button type="button" class="et-action-btn et-action-edit" data-edit-elec="${escapeAttr(p.id)}" title="Редактировать">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>
            <button type="button" class="et-action-btn et-action-delete" data-delete-elec="${escapeAttr(p.id)}" title="Удалить">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                <path d="M10 11v6"/><path d="M14 11v6"/>
                <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
              </svg>
            </button>
          </div>
        </td>
      </tr>
    `;
  });

  html += '</tbody></table>';
  wrap.innerHTML = html;

  renderEditorElecPagination(params.length, totalPages, startIdx, endIdx);

  // Обработчики
  wrap.querySelectorAll('[data-edit-elec]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.editElec;
      const p = getElectronicParams().find(x => x.id === id);
      if (!p) return;

      // Устанавливаем контекст для формы
      currentElectronicLine = p.line;
      currentElectronicMachine = p.machine;
      openElectronicParamForm(id);
    });
  });

  wrap.querySelectorAll('[data-delete-elec]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.deleteElec;
      const p = getElectronicParams().find(x => x.id === id);
      if (!p) return;
      if (!confirm(`Удалить параметр "${p.paramName}"?`)) return;
      setElectronicParams(getElectronicParams().filter(x => x.id !== id));
      refreshEditorElecTable();
      showToast('Параметр удалён');
    });
  });

  // Чекбоксы выделения
  wrap.querySelectorAll('.et-check-row').forEach(cb => {
    cb.addEventListener('change', () => {
      const id = cb.dataset.paramId;
      if (!id) return;
      if (cb.checked) editorTableState.elecSelected.add(id);
      else editorTableState.elecSelected.delete(id);
      updateElecSelectionUI();
    });
  });
    // Клик по названию E-Param → полный просмотр
  wrap.querySelectorAll('[data-open-view-elec]').forEach(el => {
    el.addEventListener('click', () => {
      const id = el.dataset.openViewElec;
      if (id) openStandardFullView(id, 'view');
    });
  });

  const checkAll = wrap.querySelector('#eeCheckAll');
  if (checkAll) {
    const allOnPageSelected = pageItems.every(p => editorTableState.elecSelected.has(p.id));
    checkAll.checked = allOnPageSelected;
    checkAll.addEventListener('change', () => {
      if (checkAll.checked) pageItems.forEach(p => editorTableState.elecSelected.add(p.id));
      else pageItems.forEach(p => editorTableState.elecSelected.delete(p.id));
      refreshEditorElecTable();
    });
  }

  updateElecSelectionUI();
}

function updateElecSelectionUI() {
  const selected = editorTableState.elecSelected.size;
  const countEl = $('#editorElecCount');
  if (countEl) {
    const params = getFilteredElecParams();
    const line = localStorage.getItem('cl_editor_line') || '';
    if (selected > 0) {
      countEl.textContent = `Выбрано: ${selected} · ${params.length} из ${line ? getElectronicParamsForLine(line).length : getElectronicParams().length}`;
    } else {
      countEl.textContent = line
        ? `${params.length} из ${getElectronicParamsForLine(line).length}`
        : `${params.length}`;
    }
  }
  document.querySelectorAll('#editorElecTableWrap tr[data-param-id]').forEach(tr => {
    tr.classList.toggle('is-selected', editorTableState.elecSelected.has(tr.dataset.paramId));
  });
}

function renderEditorElecPagination(total, totalPages, startIdx, endIdx) {
  const bar = $('#editorElecPagination');
  if (!bar) return;

  if (totalPages <= 1) {
    bar.innerHTML = `
      <span class="pagination-info">Показано ${startIdx + 1}–${endIdx} из ${total}</span>
      <div class="pagination-controls">
        <select class="pagination-size" id="eePageSize">
          <option value="10"  ${editorTableState.elecPageSize === 10 ? 'selected' : ''}>10</option>
          <option value="20"  ${editorTableState.elecPageSize === 20 ? 'selected' : ''}>20</option>
          <option value="50"  ${editorTableState.elecPageSize === 50 ? 'selected' : ''}>50</option>
          <option value="100" ${editorTableState.elecPageSize === 100 ? 'selected' : ''}>100</option>
        </select>
      </div>
    `;
    bar.querySelector('#eePageSize')?.addEventListener('change', (e) => {
      editorTableState.elecPageSize = parseInt(e.target.value, 10) || 20;
      editorTableState.elecPage = 1;
      refreshEditorElecTable();
    });
    return;
  }

  const cur = editorTableState.elecPage;
  let html = `<span class="pagination-info">Показано ${startIdx + 1}–${endIdx} из ${total}</span>`;
  html += '<div class="pagination-controls">';
  html += `<button class="pagination-btn" ${cur === 1 ? 'disabled' : ''} data-page="${cur - 1}">←</button>`;

  const pages = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || Math.abs(i - cur) <= 2) pages.push(i);
    else if (pages[pages.length - 1] !== '...') pages.push('...');
  }
  pages.forEach(p => {
    if (p === '...') html += '<span class="pagination-dots">…</span>';
    else html += `<button class="pagination-btn ${p === cur ? 'active' : ''}" data-page="${p}">${p}</button>`;
  });

  html += `<button class="pagination-btn" ${cur === totalPages ? 'disabled' : ''} data-page="${cur + 1}">→</button>`;

  html += `
    <select class="pagination-size" id="eePageSize">
      <option value="10"  ${editorTableState.elecPageSize === 10 ? 'selected' : ''}>10</option>
      <option value="20"  ${editorTableState.elecPageSize === 20 ? 'selected' : ''}>20</option>
      <option value="50"  ${editorTableState.elecPageSize === 50 ? 'selected' : ''}>50</option>
      <option value="100" ${editorTableState.elecPageSize === 100 ? 'selected' : ''}>100</option>
    </select>
  `;
  html += '</div>';
  bar.innerHTML = html;

  bar.querySelectorAll('[data-page]').forEach(btn => {
    btn.addEventListener('click', () => {
      const p = parseInt(btn.dataset.page, 10);
      if (!isNaN(p) && p >= 1 && p <= totalPages) {
        editorTableState.elecPage = p;
        refreshEditorElecTable();
      }
    });
  });

  bar.querySelector('#eePageSize')?.addEventListener('change', (e) => {
    editorTableState.elecPageSize = parseInt(e.target.value, 10) || 20;
    editorTableState.elecPage = 1;
    refreshEditorElecTable();
  });
}

/* ============================================================
   РЕДАКТОР: обновление сброса фильтров
   ============================================================ */

function resetMechFilters() {
  ['emFilterWorkshop', 'emFilterArea', 'emFilterLine', 'emFilterMachine',
   'emFilterNode', 'emFilterType', 'emFilterPart', 'emFilterActive', 'emFilterSearch'
  ].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  editorTableState.mechPage = 1;
  editorTableState.mechSelected.clear();
  refreshEditorMechTable();
  updatePartCounters();
}

function resetElecFilters() {
  ['eeFilterWorkshop', 'eeFilterArea', 'eeFilterLine', 'eeFilterMachine',
   'eeFilterControlType', 'eeFilterFreq', 'eeFilterActive', 'eeFilterSearch'
  ].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  editorTableState.elecPage = 1;
  editorTableState.elecSelected.clear();
  refreshEditorElecTable();
}

/* ============================================================
   РЕДАКТОР: обработчики фильтров и поиска
   ============================================================ */

/* Фильтры мех-таблицы */
['emFilterWorkshop', 'emFilterArea', 'emFilterLine', 'emFilterMachine',
 'emFilterNode', 'emFilterType', 'emFilterPart', 'emFilterActive'
].forEach(id => {
  document.getElementById(id)?.addEventListener('change', () => {
    editorTableState.mechPage = 1;
    refreshEditorMechTable();
  });
});

$('#emFilterSearch')?.addEventListener('input', () => {
  editorTableState.mechPage = 1;
  refreshEditorMechTable();
});

$('#emFilterResetBtn')?.addEventListener('click', resetMechFilters);

/* Фильтры электронной таблицы */
['eeFilterWorkshop', 'eeFilterArea', 'eeFilterLine', 'eeFilterMachine',
 'eeFilterControlType', 'eeFilterFreq', 'eeFilterActive'
].forEach(id => {
  document.getElementById(id)?.addEventListener('change', () => {
    editorTableState.elecPage = 1;
    refreshEditorElecTable();
  });
});

$('#eeFilterSearch')?.addEventListener('input', () => {
  editorTableState.elecPage = 1;
  refreshEditorElecTable();
});

$('#eeFilterResetBtn')?.addEventListener('click', resetElecFilters);

/* ============================================================
   РЕДАКТОР: кнопки «Создать»
   ============================================================ */

$('#editorMechAddBtn')?.addEventListener('click', () => {
  const line = localStorage.getItem('cl_editor_line');
  if (!line) {
    showToast('Сначала выберите линию', true);
    return;
  }
  // Устанавливаем контекст как раньше — currentEditorLine
  currentEditorLine = line;
  openStandardForm(null);
});

$('#editorElecAddBtn')?.addEventListener('click', () => {
  const line = localStorage.getItem('cl_editor_line');
  if (!line) {
    showToast('Сначала выберите линию', true);
    return;
  }
  currentElectronicLine = line;
  // Машина — первая из линии
  const machines = getMachinesForLine(line);
  if (!machines.length) {
    showToast('Сначала добавьте машину для линии', true);
    return;
  }
  currentElectronicMachine = machines[0];
  openElectronicParamForm(null);
});

/* --- Электронные параметры: Импорт --- */
$('#editorElecUploadBtn')?.addEventListener('click', () => {
  const line = currentElectronicLine || localStorage.getItem('cl_editor_line');
  if (!line) return showToast('Сначала выберите линию', true);
  $('#editorElecUploadInput').click();
});

$('#editorElecUploadInput')?.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  e.target.value = '';
  if (!file) return;
  const line = currentElectronicLine || localStorage.getItem('cl_editor_line');
  if (!line) return;
  try {
    const count = await parseElectronicParamsExcel(file, line);
    if (count > 0) {
      refreshEditorElecTable();
      if (typeof updatePartCounters === 'function') updatePartCounters();
      showToast(`Импортировано ${count} параметр(ов)`);
    }
  } catch (err) {
    showToast('Ошибка импорта: ' + (err.message || 'неизвестная'), true);
  }
});

/* --- Электронные параметры: Шаблон --- */
$('#editorElecTemplateBtn')?.addEventListener('click', () => {
  if (typeof editorElecDownloadTemplate === 'function') {
    editorElecDownloadTemplate();
  }
});

/* --- Электронные параметры: Экспорт --- */
$('#editorElecExportBtn')?.addEventListener('click', () => {
  if (typeof editorElecExport === 'function') {
    editorElecExport();
  }
});

/* ============================================================
   ЭЛЕКТРОННЫЕ ПАРАМЕТРЫ: экспорт / импорт / шаблон
   ============================================================ */

function serializeValuesByBrand(arr) {
  if (!Array.isArray(arr) || !arr.length) return '';
  return arr
    .filter(v => v && (v.brand || v.target != null || v.tolerance != null))
    .map(v => [(v.brand || ''), (v.target != null ? v.target : ''), (v.tolerance != null ? v.tolerance : '')].join('|'))
    .join('; ');
}

function parseValuesByBrand(str) {
  if (!str || !str.trim()) return [];
  const out = [];
  str.split(';').forEach(part => {
    const p = part.trim();
    if (!p) return;
    const seg = p.split('|').map(x => x.trim());
    const brand = seg[0] || '';
    const target = seg[1] !== undefined ? seg[1] : '';
    const tolerance = seg[2] !== undefined ? seg[2] : '';
    if (!brand && target === '' && tolerance === '') return;
    out.push({ brand, target: target === '' ? '' : target, tolerance: tolerance === '' ? '' : tolerance });
  });
  return out;
}

async function editorElecDownloadTemplate() {
  if (typeof ExcelJS === 'undefined') return showToast('Библиотека ExcelJS не загружена', true);
  const line = currentElectronicLine || localStorage.getItem('cl_editor_line');
  if (!line) return showToast('Сначала выберите линию', true);

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Параметры');

  const headers = ['Параметр', 'Линия', 'Узел/часть', 'Машина', 'Тип контроля', 'Норма',
    'Работа', 'Время с', 'Время по', 'Применять к', 'Значения по брендам', 'Активен'];
  ws.addRow(headers);

  // Пример
  ws.addRow([
    'Давление в камере', line, 'Maker', 'SE',
    'variable', '92 ± 5',
    'Run', '09:10', '10:00',
    'ChangeOver, CL_TO',
    'Kent|92|5; |90|3',
    'Да'
  ]);

  const widths = [30, 10, 18, 10, 14, 16, 8, 10, 10, 22, 40, 8];
  ws.columns.forEach((col, i) => { col.width = widths[i] || 14; });

  const headerRow = ws.getRow(1);
  headerRow.height = 30;
  headerRow.eachCell(cell => {
    cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0A4FA8' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = { top: {style:'thin'}, bottom: {style:'thin'}, left: {style:'thin'}, right: {style:'thin'} };
  });

  // Инструкция
  const wsInfo = wb.addWorksheet('Инструкция');
  wsInfo.columns = [{ width: 100 }];
  const info = [
    ['📋 Шаблон импорта электронных параметров — ' + line],
    [''],
    ['1. Заполните лист «Параметры» — по одной строке на параметр.'],
    ['2. В колонке «Значения по брендам» укажите: Бренд|Номинал|Допуск; Бренд|Номинал|Допуск'],
    ['   Пустой бренд (||допуск) — применяется ко всем брендам.'],
    ['3. Тип контроля: fixed (Фиксированный), variable (Вариабельный), interval (Интервал).'],
    ['4. «Применять к» — через запятую: ChangeOver, CL_TO, CL_Conversion.'],
    [''],
    ['ОБЯЗАТЕЛЬНЫЕ ПОЛЯ: Параметр, Линия, Машина, Тип контроля.']
  ];
  info.forEach(([text]) => wsInfo.addRow([text]));
  wsInfo.getRow(1).font = { bold: true, size: 16, color: { argb: 'FF0A4FA8' } };

  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  downloadBlob(blob, `template_electronic_${line}.xlsx`);
  showToast('Шаблон скачан');
}

async function editorElecExport() {
  if (typeof ExcelJS === 'undefined') return showToast('Библиотека ExcelJS не загружена', true);
  const line = currentElectronicLine || localStorage.getItem('cl_editor_line');
  if (!line) return showToast('Сначала выберите линию', true);

  const params = getElectronicParams().filter(p => p.line === line);
  if (!params.length) return showToast('Нет электронных параметров для экспорта', true);

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Параметры');

  const headers = ['Параметр', 'Линия', 'Узел/часть', 'Машина', 'Тип контроля', 'Норма',
    'Работа', 'Время с', 'Время по', 'Применять к', 'Значения по брендам', 'Активен'];
  ws.addRow(headers);

  const headerRow = ws.getRow(1);
  headerRow.height = 30;
  headerRow.eachCell(cell => {
    cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0A4FA8' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = { top: {style:'thin'}, bottom: {style:'thin'}, left: {style:'thin'}, right: {style:'thin'} };
  });

  params.forEach(p => {
    ws.addRow([
      p.paramName, p.line, p.nodePart, p.machine,
      (typeof controlTypeLabel === 'function' ? controlTypeLabel(p.controlType) : p.controlType),
      p.normText || '',
      p.work || 'Run', p.timeFrom || '', p.timeTo || '',
      (Array.isArray(p.appliesTo) ? p.appliesTo.join(', ') : ''),
      serializeValuesByBrand(p.valuesByBrand),
      p.active !== false ? 'Да' : 'Нет'
    ]);
  });

  const widths = [30, 10, 18, 10, 14, 16, 8, 10, 10, 22, 40, 8];
  ws.columns.forEach((col, i) => { col.width = widths[i] || 14; });

  // Инструкция
  const wsInfo = wb.addWorksheet('Инструкция');
  wsInfo.columns = [{ width: 100 }];
  wsInfo.addRow(['📋 Экспорт электронных параметров — ' + line]);
  wsInfo.addRow(['']);
  wsInfo.addRow(['Колонка «Значения по брендам» — формат: Бренд|Номинал|Допуск; ...']);
  wsInfo.addRow(['Пустой бренд (||допуск) — для всех брендов.']);

  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  downloadBlob(blob, `electronic_params_${line}.xlsx`);
  showToast('Электронные параметры экспортированы');
}

async function parseElectronicParamsExcel(file, targetLine) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(await file.arrayBuffer());

  const ws = wb.getWorksheet('Параметры');
  if (!ws) throw new Error('Лист «Параметры» не найден');

  const rows = [];
  ws.eachRow((row, rowNum) => {
    if (rowNum < 2) return; // skip header
    const vals = [];
    for (let c = 1; c <= 12; c++) vals.push(row.getCell(c).text || '');
    const name = vals[0].trim();
    if (!name) return;
    rows.push(vals);
  });

  if (!rows.length) throw new Error('Нет данных на листе «Параметры»');

  const all = getElectronicParams();
  let imported = 0;

  rows.forEach((vals, idx) => {
    const paramName = vals[0].trim();
    const line = (vals[1] || targetLine).trim();
    const nodePart = vals[2].trim();
    const machine = vals[3].trim();
    let controlType = (vals[4] || 'variable').trim().toLowerCase();
    // нормализуем (принимаем как новые, так и legacy-значения)
    if (!['ok_not_ok', 'value_input', 'range_input', 'fixed', 'variable', 'interval'].includes(controlType)) {
      controlType = 'variable';
    }
    controlType = migrateControlType(controlType, null);
    const normText = vals[5].trim();
    const work = (vals[6] || '').trim();
    const timeFrom = vals[7].trim();
    const timeTo = vals[8].trim();
    const appliesToRaw = vals[9].trim();
    const appliesTo = appliesToRaw
      ? appliesToRaw.split(',').map(x => x.trim()).filter(x => ['ChangeOver','CL_TO','CL_Conversion'].includes(x))
      : [];
    const brandValuesStr = vals[10].trim();
    const activeText = vals[11].trim();
    const active = activeText.toLowerCase() !== 'нет';

    const valuesByBrand = parseValuesByBrand(brandValuesStr);

    const id = makeElectronicParamId();
    const p = {
      id, active,
      line, machine, nodePart, paramName,
      work: work === 'Stop' ? 'Stop' : 'Run',
      timeFrom, timeTo,
      controlType, normText,
      valuesByBrand,
      appliesTo,
      frequency: { type: 'weekly', schedule: [], shifts: ['day', 'night'], daysOfWeek: [], dates: [] },
      inSchedule: false,
      author: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    all.push(p);
    imported++;
  });

  setElectronicParams(all);
  return imported;
}
/* ============================================================
   РЕДАКТОР: заполнение фильтров
   ============================================================ */

function fillEditorFilters() {
  const workshops = getWorkshops();
  const allLines = getAllLinesWithContext();
  const standards = getStandards();

  /* --- Цех --- */
  ['emFilterWorkshop', 'eeFilterWorkshop'].forEach(id => {
    const sel = document.getElementById(id);
    if (!sel) return;
    const cur = sel.value;
    sel.innerHTML = '<option value="">Все</option>' +
      workshops.map(w => `<option value="${escapeAttr(w.id)}">${escapeHtml(w.name)}</option>`).join('');
    sel.value = cur;
  });

  /* --- Участок (зависит от цеха) --- */
  ['emFilterArea', 'eeFilterArea'].forEach(id => {
    const sel = document.getElementById(id);
    if (!sel) return;
    const cur = sel.value;
    const workshopId = (id === 'emFilterArea' ? $('#emFilterWorkshop') : $('#eeFilterWorkshop'))?.value;

    let areas = [];
    if (workshopId) {
      const w = getWorkshop(workshopId);
      if (w) areas = w.areas || [];
    } else {
      // Все участки всех цехов
      workshops.forEach(w => (w.areas || []).forEach(a => areas.push(a)));
    }

    sel.innerHTML = '<option value="">Все</option>' +
      areas.map(a => `<option value="${escapeAttr(a.id)}">${escapeHtml(a.name)}</option>`).join('');
    sel.value = cur;
  });

  /* --- Линия --- */
  ['emFilterLine', 'eeFilterLine'].forEach(id => {
    const sel = document.getElementById(id);
    if (!sel) return;
    const cur = sel.value;
    sel.innerHTML = '<option value="">Все</option>' +
      allLines.map(x => `<option value="${escapeAttr(x.line)}">${escapeHtml(x.line)}</option>`).join('');
    sel.value = cur;
  });

  /* --- Машина (все машины) --- */
  const allMachines = new Set();
  Object.values(getLineMachines()).forEach(arr => (arr || []).forEach(m => allMachines.add(m)));
  ['emFilterMachine', 'eeFilterMachine'].forEach(id => {
    const sel = document.getElementById(id);
    if (!sel) return;
    const cur = sel.value;
    sel.innerHTML = '<option value="">Все</option>' +
      [...allMachines].sort().map(m => `<option value="${escapeAttr(m)}">${escapeHtml(m)}</option>`).join('');
    sel.value = cur;
  });

  /* --- Узел --- */
  const allNodes = [...new Set(standards.map(s => s.node).filter(Boolean))].sort();
  ['emFilterNode'].forEach(id => {
    const sel = document.getElementById(id);
    if (!sel) return;
    const cur = sel.value;
    sel.innerHTML = '<option value="">Все</option>' +
      allNodes.map(n => `<option value="${escapeAttr(n)}">${escapeHtml(n)}</option>`).join('');
    sel.value = cur;
  });
}

/* Каскад: при смене цеха — обновить список участков */
$('#emFilterWorkshop')?.addEventListener('change', () => fillEditorFilters());
$('#eeFilterWorkshop')?.addEventListener('change', () => fillEditorFilters());

/* ============================================================
   РЕДАКТОР: переключение активности стандарта
   ============================================================ */

function toggleStandardActive(id, newValue) {
  const all = getStandards();
  const st = all.find(s => s.id === id);
  if (!st) return;

  const wasActive = st.active !== false;
  const willBeActive = !!newValue;

  // При активации — архивируем комментарий к деактивации (если был)
  if (!wasActive && willBeActive) {
    if (st.deactivationComment && st.deactivationComment.trim()) {
      if (!Array.isArray(st.deactivationHistory)) st.deactivationHistory = [];
      st.deactivationHistory.push({
        text: st.deactivationComment.trim(),
        date: new Date().toISOString()
      });
      st.deactivationComment = '';
    }
  }

  st.active = willBeActive;
  st.updatedAt = new Date().toISOString();
  setStandards(all);

  refreshEditorMechTable();
  if (typeof updatePartCounters === 'function') updatePartCounters();

  showToast(willBeActive ? 'Стандарт активирован' : 'Стандарт деактивирован');
}

/* ============================================================
   РЕДАКТОР: копирование стандарта
   ============================================================ */

function copyStandardNew(id) {
  const all = getStandards();
  const st = all.find(s => s.id === id);
  if (!st) return;

  const copy = JSON.parse(JSON.stringify(st));
  copy.id = uid();
  copy.oplNumber = (st.oplNumber || '') + '-copy';
  copy.number = '';
  copy.createdAt = new Date().toISOString();
  copy.updatedAt = new Date().toISOString();

  all.push(copy);
  setStandards(all);

  refreshEditorMechTable();
  if (typeof updatePartCounters === 'function') updatePartCounters();

  showToast('Стандарт скопирован');
  openStandardForm(copy.id);
}

/* ============================================================
   РЕДАКТОР: удаление стандарта
   ============================================================ */

function deleteStandardNew(id) {
  const st = getStandards().find(s => s.id === id);
  if (!st) return;
  if (!confirm(`Удалить стандарт "${st.oplNumber || st.title}"?`)) return;

  setStandards(getStandards().filter(s => s.id !== id));

  refreshEditorMechTable();
  if (typeof updatePartCounters === 'function') updatePartCounters();
  if (typeof fillEditorFilters === 'function') fillEditorFilters();

  showToast('Стандарт удалён');
}

/* ============================================================
   РЕДАКТОР: обработчики шапки (мех. режим)
   ============================================================ */

/* Создать стандарт */
$('#editorMechAddBtn')?.addEventListener('click', () => {
  const line = localStorage.getItem('cl_editor_line');
  if (!line) return showToast('Сначала выберите линию', true);
  currentEditorLine = line;
  openStandardForm(null);
});

/* Импорт из Excel — открыть диалог выбора файла */
$('#editorMechUploadBtn')?.addEventListener('click', () => {
  const line = localStorage.getItem('cl_editor_line');
  if (!line) return showToast('Сначала выберите линию', true);
  $('#editorMechUploadInput').click();
});

/* Импорт из Excel — обработка выбранного файла */
$('#editorMechUploadInput')?.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  e.target.value = '';
  if (!file) return;

  const line = localStorage.getItem('cl_editor_line');
  if (!line) return showToast('Сначала выберите линию', true);

  try {
    const result = await parseStandardsExcelV3(file, line);

    // Показываем отчёт об импорте
    showImportReport(result, 'editorMechTableWrap');

    if (result.added > 0) {
      refreshEditorMechTable();
      if (typeof updatePartCounters === 'function') updatePartCounters();
      if (typeof fillEditorFilters === 'function') fillEditorFilters();
      showToast(`Добавлено стандартов: ${result.added}`);
    } else {
      showToast('Новых стандартов не найдено', true);
    }
  } catch (err) {
    console.error(err);
    showToast('Ошибка чтения файла: ' + err.message, true);
  }
});

/* Скачать шаблон — привязка к старой функции */
$('#editorMechTemplateBtn')?.addEventListener('click', () => {
  const line = localStorage.getItem('cl_editor_line');
  if (!line) return showToast('Сначала выберите линию', true);

  currentEditorLine = line;

  // Проверяем, есть ли функция шаблона в app.js
  if (typeof editorDownloadTemplate === 'function') {
    editorDownloadTemplate();
  } else {
    showToast('Функция шаблона не найдена', true);
  }
});

/* Экспорт — привязка к старой функции */
$('#editorMechExportBtn')?.addEventListener('click', () => {
  const line = localStorage.getItem('cl_editor_line');
  if (!line) return showToast('Сначала выберите линию', true);

  currentEditorLine = line;

  if (typeof editorExportLine === 'function') {
    editorExportLine();
  } else {
    showToast('Функция экспорта не найдена', true);
  }
});
/* ============================================================
   РЕДАКТОР: скачать шаблон OPL для линии
   ============================================================ */

async function editorDownloadTemplate() {
  if (typeof ExcelJS === 'undefined') {
    return showToast('Библиотека ExcelJS не загружена', true);
  }
  const line = currentEditorLine || localStorage.getItem('cl_editor_line');
  if (!line) return showToast('Сначала выберите линию', true);

  const wb = new ExcelJS.Workbook();

  // ================== ЛИСТ 1: «Стандарты» ==================
  const ws = wb.addWorksheet('Стандарты');
  const headers = [
    'Часть линии', 'Машина', 'OPL №', 'Узел', 'Название', 'Линия',
    'Работа', 'Время с', 'Время по',
    'Тип контроля', 'Применять к', 'Активен',
    'Описание проблемы', 'Описание контроля', 'Цель', 'Почему создан',
    'Триггеры', 'Top Losses', 'Фото'
  ];
  ws.addRow(headers);

  // Пример
  ws.addRow([
    'Maker', 'SE', 'OPL-1.1.1', 'Узел передачи',
    'Давление на передающем устройстве (Паук)', line,
    'Run', '09:10', '10:00',
    'variable', 'ChangeOver', 'Да',
    'Пример: к чему приводит отклонение',
    'Пример: как проверить',
    'Пример: цель контроля',
    'Пример: причина создания',
    'Табак, Материалы',
    'Обрыв штранга, Заторы на MAX',
    'max-1.jpg, drum.jpg'
  ]);

  // Ширины
  const widths = [12, 10, 14, 30, 34, 10, 10, 12, 12, 14, 18, 10, 34, 34, 30, 30, 22, 30, 30];
  ws.columns.forEach((col, i) => { col.width = widths[i] || 14; });

  // Стиль шапки
  const headerRow = ws.getRow(1);
  headerRow.height = 36;
  headerRow.eachCell((cell) => {
    cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0A4FA8' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = {
      top: { style: 'thin' }, bottom: { style: 'thin' },
      left: { style: 'thin' }, right: { style: 'thin' }
    };
  });

  // ================== ЛИСТ 2: «Точки» ==================
  const ws2 = wb.addWorksheet('Точки');
  ws2.addRow(['OPL №', 'Машина', 'Бренд', '№ точки', 'Значение']);

  ws2.addRow(['OPL-1.1.1', 'SE', '', 1, '92 ± 5']);
  ws2.addRow(['OPL-1.1.1', 'SE', '', 2, '']);
  ws2.addRow(['OPL-1.1.1', 'SE', 'Kent', 1, '90 ± 3']);

  const widths2 = [14, 12, 20, 10, 26];
  ws2.columns.forEach((col, i) => { col.width = widths2[i] || 14; });

  const headerRow2 = ws2.getRow(1);
  headerRow2.height = 30;
  headerRow2.eachCell((cell) => {
    cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0A4FA8' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = {
      top: { style: 'thin' }, bottom: { style: 'thin' },
      left: { style: 'thin' }, right: { style: 'thin' }
    };
  });

  // ================== ЛИСТ 3: «Инструкция» ==================
  const wsInfo = wb.addWorksheet('Инструкция');
  wsInfo.columns = [{ width: 100 }];
  const info = [
    ['📋 Шаблон импорта OPL — ' + line],
    [''],
    ['1. Заполните лист «Стандарты» — по одной строке на стандарт.'],
    ['2. Заполните лист «Точки» — точки замера (можно оставить пустым).'],
    ['3. Сохраните файл (.xlsx) и загрузите через кнопку «Импорт» в редакторе.'],
    [''],
    ['ОБЯЗАТЕЛЬНЫЕ ПОЛЯ на листе «Стандарты»:'],
    ['  • OPL № — уникален в пределах линии + машины'],
    ['  • Часть линии — Maker или Packer'],
    ['  • Машина — обозначение (SE, MAX, …)'],
    ['  • Узел, Название, Линия, Тип контроля'],
    ['  • Тип контроля: ok_not_ok / value_input / range_input'],
    ['  • Применять к: ChangeOver, CL_TO, CL_Conversion (через запятую)'],
    ['  • Активен: Да / Нет'],
    [''],
    ['ОПЦИОНАЛЬНЫЕ ПОЛЯ:'],
    ['  • Работа: Run или Stop (по умолчанию Run)'],
    ['  • Время с / Время по: окно проверки в формате HH:MM (например 09:10 и 10:00)'],
    [''],
    ['ЛИСТ «Точки»:'],
    ['  • Связь со стандартом — по ключу OPL № + Машина'],
    ['  • Бренд — пусто = «Все бренды»'],
    ['  • № точки: 1, 2, 3, …'],
    ['  • Значение: «92 ± 5» / «5 до 8» / «0»']
  ];
  info.forEach(([text]) => wsInfo.addRow([text]));
  wsInfo.getRow(1).font = { bold: true, size: 16, color: { argb: 'FF0A4FA8' } };

  // Сохранение
  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  downloadBlob(blob, `template_opl_${line}.xlsx`);
  showToast('Шаблон скачан');
}

/* ============================================================
   РЕДАКТОР: экспорт стандартов линии в XLSX
   ============================================================ */

async function editorExportLine() {
  if (typeof ExcelJS === 'undefined') {
    return showToast('Библиотека ExcelJS не загружена', true);
  }
  const line = currentEditorLine || localStorage.getItem('cl_editor_line');
  if (!line) return showToast('Сначала выберите линию', true);

  const standards = getStandards().filter(s => s.line === line);
  if (!standards.length) {
    return showToast('На этой линии нет стандартов', true);
  }

  const wb = new ExcelJS.Workbook();

  // ================== ЛИСТ 1: «Стандарты» ==================
  const ws = wb.addWorksheet('Стандарты');
  const headers = [
    'Часть линии', 'Машина', 'OPL №', 'Узел', 'Название', 'Линия',
    'Работа', 'Время с', 'Время по',
    'Тип контроля', 'Применять к', 'Активен',
    'Описание проблемы', 'Описание контроля', 'Цель', 'Почему создан',
    'Триггеры', 'Top Losses', 'Фото'
  ];
  ws.addRow(headers);

  standards.forEach(st => {
    const triggersText = Array.isArray(st.triggers)
      ? st.triggers.map(t => t.replace(/^node:/, '')).join(', ')
      : '';

    const topLossesText = Array.isArray(st.topLosses)
      ? st.topLosses.map(id => {
          const l = findLossById(id);
          return l ? l.name : null;
        }).filter(Boolean).join(', ')
      : '';

    const photosText = Array.isArray(st.photos) ? st.photos.join(', ') : '';
    const appliesToText = Array.isArray(st.appliesTo) ? st.appliesTo.join(', ') : '';

    ws.addRow([
      st.nodePart || '',
      st.machine || '',
      st.oplNumber || '',
      st.node || '',
      st.title || '',
      st.line || line,
      (st.work === 'Stop') ? 'Stop' : 'Run',
      st.timeFrom || '',
      st.timeTo || '',
      st.controlType || '',
      appliesToText,
      st.active !== false ? 'Да' : 'Нет',
      st.problemDescription || '',
      st.controlDescription || '',
      st.purpose || '',
      st.whyCreated || '',
      triggersText,
      topLossesText,
      photosText
    ]);
  });

  const widths = [12, 10, 14, 30, 34, 10, 10, 12, 12, 14, 18, 10, 34, 34, 30, 30, 22, 30, 30];
  ws.columns.forEach((col, i) => { col.width = widths[i] || 14; });

  const headerRow = ws.getRow(1);
  headerRow.height = 36;
  headerRow.eachCell((cell) => {
    cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0A4FA8' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = {
      top: { style: 'thin' }, bottom: { style: 'thin' },
      left: { style: 'thin' }, right: { style: 'thin' }
    };
  });

  // ================== ЛИСТ 2: «Точки» ==================
  const ws2 = wb.addWorksheet('Точки');
  ws2.addRow(['OPL №', 'Машина', 'Бренд', '№ точки', 'Значение']);

  standards.forEach(st => {
    const blocks = Array.isArray(st.measurements) ? st.measurements : [];
    blocks.forEach(block => {
      const points = Array.isArray(block.points) ? block.points : [];
      points.forEach((p, i) => {
        ws2.addRow([
          st.oplNumber || '',
          st.machine || '',
          block.brand || '',
          i + 1,
          p.value || ''
        ]);
      });
    });
  });

  const widths2 = [14, 12, 20, 10, 26];
  ws2.columns.forEach((col, i) => { col.width = widths2[i] || 14; });

  const headerRow2 = ws2.getRow(1);
  headerRow2.height = 30;
  headerRow2.eachCell((cell) => {
    cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0A4FA8' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = {
      top: { style: 'thin' }, bottom: { style: 'thin' },
      left: { style: 'thin' }, right: { style: 'thin' }
    };
  });

  // Сохранение
  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const ts = new Date().toISOString().slice(0, 10);
  downloadBlob(blob, `standards_${line}_${ts}.xlsx`);
  showToast(`Экспортировано: ${standards.length} стандартов`);
}
/* ============================================================
   РАСПИСАНИЕ CL — вкладка технолога
   ============================================================ */

/* Состояние вкладки */
const schState = {
  line: null,             // выбранная линия
  mode: 'mech',           // 'mech' | 'elec'
  part: '',               // '' | 'Maker' | 'Packer'  (только для mech)
  weekOffset: 0,          // 0 = текущая неделя, +1 = следующая, -1 = предыдущая
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
  schState.weekOffset = 0;
  schState.dirty = false;
  schState.draft = {};

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
    const f = schState.draft[r.id] || r.frequency || {};
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

/* --- Получить отфильтрованные строки расписания --- */
function getFilteredScheduleRows() {
  const removed = schState.removedFromSchedule || new Set();
  const added = schState.addedToSchedule || new Set();

  // Понедельные оверрайды: правки этой недели не трогают базовый шаблон
  // (оверрайд применяется всегда — в т.ч. когда неделя станет текущей)
  const weekOffset = schState.weekOffset || 0;
  const ov = getScheduleWeekOverride(getSchWeekStart(weekOffset), schState.line) || {};
  const ovRemoved = new Set(ov.removed || []);
  const ovAdded = new Set(ov.added || []);

  // Базовый шаблон → оверрайд недели → черновик (несохранённые правки)
  const isMember = (id, inBase) => {
    let m = inBase;
    if (ovRemoved.has(id)) m = false;
    if (ovAdded.has(id)) m = true;
    if (removed.has(id)) m = false;
    if (added.has(id)) m = true;
    return m;
  };

  let rows = [];
  if (schState.mode === 'mech') {
    rows = getStandards()
      .filter(s => s.line === schState.line)
      .filter(s => s.active !== false)
      .filter(s => !schState.part || s.nodePart === schState.part)
      .filter(s => isMember(s.id, s.inSchedule === true));
  } else {
    rows = getElectronicParamsForLine(schState.line)
      .filter(p => p.active !== false)
      .filter(p => isMember(p.id, p.inSchedule === true));
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
  const allRows = [];
  if (schState.mode === 'mech') {
    getStandards()
      .filter(s => s.line === schState.line && s.active !== false)
      .filter(s => !schState.part || s.nodePart === schState.part)
      .filter(s => {
        const removed = schState.removedFromSchedule || new Set();
        const added = schState.addedToSchedule || new Set();
        if (removed.has(s.id)) return false;
        if (added.has(s.id)) return true;
        return s.inSchedule === true;
      })
      .forEach(s => allRows.push(s));
  } else {
    getElectronicParamsForLine(schState.line)
      .filter(p => p.active !== false)
      .filter(p => {
        const removed = schState.removedFromSchedule || new Set();
        const added = schState.addedToSchedule || new Set();
        if (removed.has(p.id)) return false;
        if (added.has(p.id)) return true;
        return p.inSchedule === true;
      })
      .forEach(p => allRows.push(p));
  }

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

  const weekDays = getWeekDays(schState.weekOffset);
  const dateByDayIdx = {};
  [1, 2, 3, 4, 5, 6, 0].forEach((dayIdx, i) => {
    dateByDayIdx[dayIdx] = weekDays[i];
  });

  // Навигация по неделям: на будущей неделе расписание полностью
  // редактируется, на текущей блокируются прошедшие дни, прошедшая — только просмотр.
  const weekLabel = getWeekLabel(schState.weekOffset);
  const isCurrentWeek = schState.weekOffset === 0;
  const isFutureWeek = schState.weekOffset > 0;
  const hasOv = hasScheduleWeekOverride(getSchWeekStart(schState.weekOffset), schState.line);
  const weekSub = hasOv
    ? 'есть отдельные правки для этой недели'
    : (isCurrentWeek
        ? 'текущая неделя · шаблон для всех недель'
        : (isFutureWeek
            ? 'правки — только для этой недели'
            : 'прошедшая неделя — только просмотр'));

  let html = `
    <div class="cl-week-nav sch-week-nav">
      <button type="button" class="cl-week-nav-btn" id="schWeekPrev" title="Предыдущая неделя">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
      </button>
      <div class="cl-week-nav-label">
        <span class="cl-week-nav-title">${escapeHtml(weekLabel)}</span>
        <span class="cl-week-nav-sub">${escapeHtml(weekSub)}</span>
      </div>
      <button type="button" class="cl-week-nav-btn" id="schWeekNext" title="Следующая неделя">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
      </button>
      ${!isCurrentWeek ? '<button type="button" class="cl-week-nav-today" id="schWeekToday">Текущая неделя</button>' : ''}
    </div>
    <div class="sch-matrix">`;

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
      if (rowId) openTimeWindowsModal(rowId);
    });
  });

  // Клик по Run/Stop — переключить прямо в черновике расписания
  wrap.querySelectorAll('[data-work-toggle]').forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      const rowId = el.dataset.workToggle;
      if (!rowId) return;
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
/* Служебная функция форматирования даты (нужна в других модулях) — 
   сам блок просмотра недели удалён */

/* Формат короткой даты DD.MM */
function fmtShortDate(dateStr) {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return '';
  return `${parts[2]}.${parts[1]}`;
}

/* --- Одна строка матрицы расписания (с инфо-колонками) --- */
/* Эффективная периодичность строки для ТЕКУЩЕЙ просматриваемой недели:
   черновик → оверрайд недели → базовый шаблон. */
function getSchRowFreq(row) {
  const base = (row && row.frequency) || { type: 'weekly', schedule: [], shifts: [], daysOfWeek: [], dates: [], timeWindows: [] };
  if (!row) return base;

  // Несохранённые правки главнее всего
  if (schState.draft[row.id]) return schState.draft[row.id];

  // Правки просматриваемой недели (в т.ч. когда неделя уже стала текущей)
  const ov = getScheduleWeekOverride(getSchWeekStart(schState.weekOffset || 0), schState.line) || {};
  const snap = ov.rows && ov.rows[row.id];
  if (snap) {
    return {
      ...base,
      schedule: Array.isArray(snap.schedule) ? snap.schedule : (base.schedule || []),
      timeWindows: Array.isArray(snap.timeWindows) ? snap.timeWindows : (base.timeWindows || []),
      work: (snap.work != null) ? snap.work : base.work
    };
  }
  return base;
}

/* Эффективная периодичность строки для операторского чек-листа:
   если для просматриваемой недели в «Расписании CL» сделаны правки —
   используем их, иначе базовый шаблон. */
function getClRowFreq(row) {
  const base = (row && row.frequency) || { type: 'weekly', schedule: [], shifts: [], daysOfWeek: [], dates: [], timeWindows: [] };
  if (!row) return base;

  // Правки просматриваемой недели (в т.ч. когда неделя уже стала текущей)
  const ov = getScheduleWeekOverride(getWeekDays(clState.weekOffset || 0)[0], clState.line) || {};
  const snap = ov.rows && ov.rows[row.id];
  if (snap) {
    return {
      ...base,
      schedule: Array.isArray(snap.schedule) ? snap.schedule : (base.schedule || []),
      timeWindows: Array.isArray(snap.timeWindows) ? snap.timeWindows : (base.timeWindows || []),
      work: (snap.work != null) ? snap.work : base.work
    };
  }
  return base;
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

  // 14 ячеек: 7 дней × 2 смены.
  // Блокировка зависит от просматриваемой недели:
  //  • текущая неделя — прошедшие дни заблокированы (их «догонять» нельзя);
  //  • будущая неделя — всё редактируется (чек-лист составляется заранее);
  //  • прошедшая неделя — только просмотр.
  const todayStr = todayISO();
  const weekOffset = schState.weekOffset || 0;
  const isPastWeek = weekOffset < 0;
  const isFutureWeek = weekOffset > 0;

  DAYS.forEach(d => {
    const dateStr = (dateByDayIdx && dateByDayIdx[d.idx]) || '';
    const isPastDay = isPastWeek || (!isFutureWeek && !!(dateStr && dateStr < todayStr));

    ['day', 'night'].forEach(shift => {
      const on = isOn(d.idx, shift);
      const lockedCls = isPastDay ? ' sch-cell-locked' : '';
      const lockedAttr = isPastDay ? ' data-locked="1"' : '';
      const title = isPastDay
        ? (isPastWeek
            ? `${d.name} · ${shift === 'day' ? 'День' : 'Ночь'} — прошедшая неделя, только просмотр`
            : `${d.name} · ${shift === 'day' ? 'День' : 'Ночь'} — день уже прошёл, планирование недоступно`)
        : `${d.name} · ${shift === 'day' ? 'День' : 'Ночь'}`;
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
/* --- Убрать стандарт из расписания (в черновике) --- */
function removeRowFromSchedule(rowId) {
  if (!rowId) return;

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
        const weekOffset = schState.weekOffset || 0;
        if (weekOffset < 0) {
          showToast('Прошедшая неделя — только просмотр', true);
        } else {
          showToast('День уже прошёл — он попадёт в следующую неделю', true);
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
  $('#schWeekToday')?.addEventListener('click', () => goTo(0));
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
  if (weekOffset === 0) {
    // Текущая неделя — правим базовый (повторяющийся) шаблон.
    // Понедельный оверрайд этой недели больше не нужен — база его перекрывает.
    setScheduleWeekOverride(getSchWeekStart(0), schState.line, null);
    if (schState.mode === 'mech') {
      saveMechSchedule();
    } else {
      saveElecSchedule();
    }
  } else {
    // Другая неделя — правки только для этой недели
    saveScheduleWeekOverride(weekOffset);
  }

  schState.dirty = false;
  schState.draft = {};
  schState.removedFromSchedule = new Set();
  schState.addedToSchedule = new Set();
  schState.addedRows = [];
  updateSchSaveBtn();
  renderScheduleMatrix();
  showToast('Расписание сохранено');
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
/* ============================================================
   РАСПИСАНИЕ CL — модалка добавления стандартов
   ============================================================ */

/* Состояние модалки */
const schAddState = {
  selectedIds: new Set(),   // id, которые пользователь выделил для добавления
  query: '',
  collapsedGroups: new Set()   // не используется, но на будущее
};

/* --- Открытие --- */
function openScheduleAddStandardsModal() {
  if (!schState.line) return;

  const modal = $('#schAddStandardsModal');
  if (!modal) return;

  // Сбрасываем состояние
  schAddState.selectedIds = new Set();
  schAddState.query = '';
  schAddState.collapsedGroups = new Set();

  $('#schAddStandardsSearch').value = '';
  $('#schAddCheckAll').checked = false;

  renderSchAddList();
  updateSchAddCounter();

  openModal(modal);
  setTimeout(() => $('#schAddStandardsSearch')?.focus(), 100);
}

/* --- Закрытие --- */
function closeScheduleAddStandardsModal() {
  closeModal('#schAddStandardsModal');
  schAddState.selectedIds = new Set();
  schAddState.query = '';
}

/* --- Рендер списка --- */
function renderSchAddList() {
  const list = $('#schAddStandardsList');
  if (!list) return;

  const q = (schAddState.query || '').trim().toLowerCase();

  // Собираем все стандарты/параметры линии, кроме тех, что уже inSchedule
  let allItems = [];

  if (schState.mode === 'mech') {
    allItems = getStandards()
      .filter(s => s.line === schState.line)
      .filter(s => s.active !== false)
      .filter(s => !schState.part || s.nodePart === schState.part)
      .map(s => ({
        id: s.id,
        title: s.title || '—',
        oplNumber: s.oplNumber || '',
        machine: s.machine || '',
        node: s.node || '',
        nodePart: s.nodePart || '',
        inSchedule: s.inSchedule === true,
        group: s.machine || '— без машины —'
      }));
  } else {
    allItems = getElectronicParamsForLine(schState.line)
      .filter(p => p.active !== false)
      .map(p => ({
        id: p.id,
        title: p.paramName || '—',
        oplNumber: '',
        machine: p.machine || '',
        node: '',
        nodePart: '',
        inSchedule: p.inSchedule === true,
        group: p.machine || '— без машины —'
      }));
  }

  // Фильтр поиска
  if (q) {
    allItems = allItems.filter(it => {
      const hay = [
        it.title, it.oplNumber, it.machine, it.node, it.nodePart
      ].map(v => String(v || '').toLowerCase()).join(' ');
      return hay.includes(q);
    });
  }

  if (!allItems.length) {
    list.innerHTML = '<div class="empty-state" style="padding:24px">Ничего не найдено</div>';
    return;
  }

  // Группируем по машине
  const groups = {};
  allItems.forEach(it => {
    const g = it.group;
    if (!groups[g]) groups[g] = [];
    groups[g].push(it);
  });

  // Сортируем группы
  const sortedGroups = Object.keys(groups).sort((a, b) =>
    a.localeCompare(b, 'ru', { numeric: true })
  );

  let html = '';
  sortedGroups.forEach(groupName => {
    const items = groups[groupName];
    // Сортируем внутри группы
    items.sort((a, b) => {
      const oa = String(a.oplNumber || a.title || '').toLowerCase();
      const ob = String(b.oplNumber || b.title || '').toLowerCase();
      return oa.localeCompare(ob, 'ru', { numeric: true });
    });

    const itemsHtml = items.map(it => {
      const isAlready = it.inSchedule;
      const isChecked = schAddState.selectedIds.has(it.id);
      const subParts = [];
      if (it.oplNumber) subParts.push(it.oplNumber);
      if (it.node) subParts.push(it.node);
      if (it.nodePart) subParts.push(it.nodePart);

      return `
        <label class="sch-add-item ${isAlready ? 'is-already' : ''}" data-item-id="${escapeAttr(it.id)}">
          <input type="checkbox" ${isChecked ? 'checked' : ''} ${isAlready ? 'disabled' : ''}>
          <div class="sch-add-item-info">
            <div class="sch-add-item-title">${escapeHtml(it.title)}</div>
            <div class="sch-add-item-sub">${escapeHtml(subParts.join(' · ') || '—')}</div>
          </div>
          ${isAlready ? '<span class="sch-add-item-already">уже добавлен</span>' : ''}
        </label>
      `;
    }).join('');

    html += `
      <div class="sch-add-group">
        <div class="sch-add-group-head">
          <span class="sch-add-group-name">${escapeHtml(groupName)}</span>
          <span class="sch-add-group-count">${items.length}</span>
        </div>
        ${itemsHtml}
      </div>
    `;
  });

  list.innerHTML = html;

  // Обработчики
  list.querySelectorAll('.sch-add-item').forEach(item => {
    const id = item.dataset.itemId;
    const cb = item.querySelector('input');
    if (!cb || cb.disabled) return;

    // Клик по всему label — toggle
    item.addEventListener('click', (e) => {
      // Если клик по input — браузер сам переключит, обработаем через change
      if (e.target.tagName === 'INPUT') return;
      e.preventDefault();
      cb.checked = !cb.checked;
      toggleSchAddItem(id, cb.checked);
    });

    cb.addEventListener('change', () => {
      toggleSchAddItem(id, cb.checked);
    });
  });
}

/* --- Toggle выбора --- */
function toggleSchAddItem(id, checked) {
  if (checked) {
    schAddState.selectedIds.add(id);
  } else {
    schAddState.selectedIds.delete(id);
  }
  updateSchAddCounter();
  updateSchAddCheckAllState();
}

/* --- Счётчик --- */
function updateSchAddCounter() {
  const n = schAddState.selectedIds.size;
  $('#schAddCounter').textContent = `Выбрано: ${n}`;

  const btn = $('#schAddStandardsConfirm');
  if (btn) {
    btn.disabled = n === 0;
    btn.textContent = n === 0 ? 'Добавить' : `Добавить ${n}`;
  }
}

/* --- Обновить состояние "Выделить все" --- */
function updateSchAddCheckAllState() {
  const cb = $('#schAddCheckAll');
  if (!cb) return;

  const visibleInputs = [...document.querySelectorAll('#schAddStandardsList .sch-add-item input:not([disabled])')];
  if (!visibleInputs.length) {
    cb.checked = false;
    cb.indeterminate = false;
    return;
  }

  const checkedCount = visibleInputs.filter(i => i.checked).length;
  cb.checked = checkedCount === visibleInputs.length;
  cb.indeterminate = checkedCount > 0 && checkedCount < visibleInputs.length;
}

/* --- Подтверждение --- */
function confirmScheduleAddStandards() {
  if (!schAddState.selectedIds.size) return;

  const ids = [...schAddState.selectedIds];

  if (!schState.addedToSchedule) schState.addedToSchedule = new Set();
  if (!schState.removedFromSchedule) schState.removedFromSchedule = new Set();

  ids.forEach(id => {
    schState.removedFromSchedule.delete(id);
    schState.addedToSchedule.add(id);
  });

  schState.dirty = true;
  updateSchSaveBtn();
  renderScheduleMatrix();
  updateSchPanelCount();
  closeScheduleAddStandardsModal();
  showToast(`Добавлено: ${ids.length}`);
}

/* --- Обработчики модалки --- */

$('#schAddStandardsClose')?.addEventListener('click', closeScheduleAddStandardsModal);
$('#schAddStandardsCancel')?.addEventListener('click', closeScheduleAddStandardsModal);
$('#schAddStandardsModal')?.addEventListener('click', (e) => {
  if (e.target.id === 'schAddStandardsModal') closeScheduleAddStandardsModal();
});
$('#schAddStandardsConfirm')?.addEventListener('click', confirmScheduleAddStandards);

$('#schAddStandardsSearch')?.addEventListener('input', (e) => {
  schAddState.query = e.target.value;
  // Сбрасываем "Выделить все"
  const cbAll = $('#schAddCheckAll');
  if (cbAll) { cbAll.checked = false; cbAll.indeterminate = false; }
  renderSchAddList();
  updateSchAddCheckAllState();
});

$('#schAddCheckAll')?.addEventListener('change', (e) => {
  const checked = e.target.checked;
  document.querySelectorAll('#schAddStandardsList .sch-add-item input:not([disabled])').forEach(cb => {
    cb.checked = checked;
    const item = cb.closest('.sch-add-item');
    if (!item) return;
    const id = item.dataset.itemId;
    if (checked) schAddState.selectedIds.add(id);
    else schAddState.selectedIds.delete(id);
  });
  updateSchAddCounter();
});
/* Сохранение для механики */
function saveMechSchedule() {
  const all = getStandards();
  let changed = 0;

  // Обновляем frequency
  Object.entries(schState.draft).forEach(([id, freq]) => {
    const st = all.find(s => s.id === id);
    if (!st) return;
    st.frequency = {
      type: 'weekly',
      schedule: Array.isArray(freq.schedule) ? freq.schedule.map(x => ({ ...x })) : [],
      timeWindows: Array.isArray(freq.timeWindows) ? freq.timeWindows.map(w => ({ from: w.from, to: w.to })) : [],
      shifts: [...(freq.shifts || [])],
      daysOfWeek: [...(freq.daysOfWeek || [])],
      dates: [...(freq.dates || [])]
    };
    if (freq.work === 'Stop' || freq.work === 'Run') {
      st.work = freq.work;
    }
    st.updatedAt = new Date().toISOString();
    changed++;
  });

  // Убираем из расписания
  if (schState.removedFromSchedule) {
    schState.removedFromSchedule.forEach(id => {
      const st = all.find(s => s.id === id);
      if (!st) return;
      st.inSchedule = false;
      st.updatedAt = new Date().toISOString();
      changed++;
    });
  }

  // Добавляем в расписание
  if (schState.addedToSchedule) {
    schState.addedToSchedule.forEach(id => {
      const st = all.find(s => s.id === id);
      if (!st) return;
      st.inSchedule = true;
      st.updatedAt = new Date().toISOString();
      changed++;
    });
  }

  if (changed > 0) {
    setStandards(all);
  }
}

/* Сохранение для электроники */
function saveElecSchedule() {
  const all = getElectronicParams().map(normalizeElectronicParam);
  let changed = 0;

  Object.entries(schState.draft).forEach(([id, freq]) => {
    const p = all.find(x => x.id === id);
    if (!p) return;
    p.frequency = {
      type: 'weekly',
      schedule: Array.isArray(freq.schedule) ? freq.schedule.map(x => ({ ...x })) : [],
      timeWindows: Array.isArray(freq.timeWindows) ? freq.timeWindows.map(w => ({ from: w.from, to: w.to })) : [],
      shifts: [...(freq.shifts || [])],
      daysOfWeek: [...(freq.daysOfWeek || [])],
      dates: [...(p.frequency?.dates || [])]
    };
    if (freq.work === 'Stop' || freq.work === 'Run') {
      p.work = freq.work;
    }
    p.updatedAt = new Date().toISOString();
    changed++;
  });

  if (schState.removedFromSchedule) {
    schState.removedFromSchedule.forEach(id => {
      const p = all.find(x => x.id === id);
      if (!p) return;
      p.inSchedule = false;
      p.updatedAt = new Date().toISOString();
      changed++;
    });
  }

  if (schState.addedToSchedule) {
    schState.addedToSchedule.forEach(id => {
      const p = all.find(x => x.id === id);
      if (!p) return;
      p.inSchedule = true;
      p.updatedAt = new Date().toISOString();
      changed++;
    });
  }

  if (changed > 0) {
    setElectronicParams(all);
  }
}

/* --- Обработчики вкладки --- */

/* Чип линии — открыть модалку выбора */
document.addEventListener('click', (e) => {
  if (e.target.closest('#schLinePill')) {
    if (typeof openLinePickerModal === 'function') openLinePickerModal();
  }
});

/* Переключатель Механические / Электронные */
$('#schModeSwitch')?.addEventListener('click', (e) => {
  const btn = e.target.closest('.editor-mode-inline-btn');
  if (!btn) return;
  const mode = btn.dataset.mode;
  if (mode === schState.mode) return;

  if (schState.dirty && !confirm('Есть несохранённые изменения. Продолжить без сохранения?')) return;

  schState.mode = mode;
  schState.dirty = false;
  schState.draft = {};
  schState.weekOffset = 0;
  schState.removedFromSchedule = new Set();
  schState.addedToSchedule = new Set();

  try { localStorage.setItem('cl_schedule_mode', mode); } catch (err) {}

  document.querySelectorAll('#schModeSwitch .editor-mode-inline-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.mode === mode);
  });

  updateSchSaveBtn();
  renderScheduleMatrix();
});

/* Переключатель Maker/Packer */
$('#schPartSwitch')?.addEventListener('click', (e) => {
  const btn = e.target.closest('.editor-part-switch-btn');
  if (!btn) return;
  const part = btn.dataset.part || '';
  if (part === schState.part) return;

  if (schState.dirty && !confirm('Есть несохранённые изменения. Продолжить без сохранения?')) return;

  schState.part = part;
  schState.dirty = false;
  schState.draft = {};
  schState.weekOffset = 0;
  schState.removedFromSchedule = new Set();
  schState.addedToSchedule = new Set();

  try { localStorage.setItem('cl_schedule_part', part); } catch (err) {}

  document.querySelectorAll('#schPartSwitch .editor-part-switch-btn').forEach(b => {
    b.classList.toggle('active', (b.dataset.part || '') === part);
  });

  updateSchSaveBtn();
  renderScheduleMatrix();
});

/* Кнопка "Сохранить" */
$('#schSaveBtn')?.addEventListener('click', saveSchedule);

/* Массовые операции (прототип — работают со всеми строками) */
$('#schBulkFillAllBtn')?.addEventListener('click', () => {
  if (!schState.rows.length) return;
  if (!confirm('Проставить все дни и смены для всех строк?')) return;

  schState.dirty = true;
  const allDays = [1, 2, 3, 4, 5, 6, 0];
  const schedule = [];
  allDays.forEach(day => {
    schedule.push({ day, shift: 'day' });
    schedule.push({ day, shift: 'night' });
  });

  schState.rows.forEach(row => {
    schState.draft[row.id] = {
      type: 'weekly',
      schedule: schedule.map(x => ({ ...x })),
      shifts: ['day', 'night'],
      daysOfWeek: [...allDays],
      dates: []
    };
  });

  updateSchSaveBtn();
  renderScheduleMatrix();
});

$('#schBulkClearAllBtn')?.addEventListener('click', () => {
  if (!schState.rows.length) return;
  if (!confirm('Очистить расписание для всех строк?')) return;

  schState.dirty = true;

  schState.rows.forEach(row => {
    schState.draft[row.id] = {
      type: 'weekly',
      schedule: [],
      shifts: ['day', 'night'],
      daysOfWeek: [],
      dates: []
    };
  });

  updateSchSaveBtn();
  renderScheduleMatrix();
});

/* Хук: при выборе линии через модалку — нужно перехватить,
   чтобы обновить именно Расписание CL, если открыта эта вкладка. */
const _origSelectLine = selectLine;
window.selectLine = function(line) {
  // Вызываем оригинальную функцию
  _origSelectLine(line);

  const activeTab = localStorage.getItem('cl_active_tab');

  // Если активна вкладка «Расписание CL»
  if (activeTab === 'schedule') {
    schState.line = line;
    try { localStorage.setItem('cl_schedule_line', line); } catch (e) {}

    if (schState.dirty && !confirm('Есть несохранённые изменения. Продолжить без сохранения?')) {
      return;
    }
    schState.dirty = false;
    schState.draft = {};
    schState.weekOffset = 0;
    schState.removedFromSchedule = new Set();
    schState.addedToSchedule = new Set();

    updateSchLinePill();
    updateSchSaveBtn();
    renderScheduleMatrix();
    return;
  }

  // Если активна вкладка «Проверка CL»
  if (activeTab === 'electronic') {
    clState.line = line;
    try { localStorage.setItem('cl_cl_line', line); } catch (e) {}

    updateClLinePill();
    updateClContext();
    updateClCheckButtons();
    renderClMatrix();
    return;
  }
};
/* ============================================================
   РАСПИСАНИЕ CL — обработчики кнопок
   ============================================================ */

$('#schAddStandardsBtn')?.addEventListener('click', openScheduleAddStandardsModal);

/* Фильтр и поиск */
$('#schFilterMachine')?.addEventListener('change', () => {
  renderScheduleMatrix();
});

$('#schFilterSearch')?.addEventListener('input', () => {
  renderScheduleMatrix();
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
  el.style.display = (clState.mode === 'mech') ? 'inline-flex' : 'none';
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
        ${shiftLabel} · бригада
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

  // Меняем класс: с .sch-matrix-wrap на .cl-matrix-wrap
  wrap.className = 'cl-matrix-wrap';

  if (!clState.line) {
    wrap.innerHTML = '<div class="editor-empty">Выберите линию для начала проверки</div>';
    updateClPanelCount();
    return;
  }

  // --- Расписание для просматриваемой недели + уже проверенные стандарты ---
  const weekDaysForRows = getWeekDays(clState.weekOffset);
  const weekStartForRows = weekDaysForRows[0];

  // Правки, сделанные в «Расписании CL» именно для этой недели
  // (применяются всегда — в т.ч. когда неделя уже стала текущей)
  const weekOv = getScheduleWeekOverride(weekStartForRows, clState.line) || {};
  const ovRemoved = new Set(weekOv.removed || []);
  const ovAdded = new Set(weekOv.added || []);

  // Стандарты/параметры, у которых УЖЕ есть результат проверки на этой неделе.
  // Их нельзя скрывать, даже если их убрали из расписания — иначе у оператора
  // пропадут уже выполненные проверки.
  const checkedIds = getCheckedStandardIdsForWeek(clState.line, weekDaysForRows);

  const isMember = (id, inBase) => {
    let m = inBase;
    if (ovRemoved.has(id)) m = false;
    if (ovAdded.has(id)) m = true;
    return m;
  };

  let rows = [];
  if (clState.mode === 'mech') {
    rows = getStandards()
      .filter(s => s.line === clState.line)
      .filter(s => s.active !== false || checkedIds.has(s.id))
      .filter(s => isMember(s.id, s.inSchedule === true) || checkedIds.has(s.id))
      .filter(s => !clState.part || s.nodePart === clState.part);
  } else {
    rows = getElectronicParamsForLine(clState.line)
      .filter(p => p.active !== false || checkedIds.has(p.id))
      .filter(p => isMember(p.id, p.inSchedule === true) || checkedIds.has(p.id));
  }

  rows.sort((a, b) => {
    const oa = String(a.oplNumber || a.paramName || '').toLowerCase();
    const ob = String(b.oplNumber || b.paramName || '').toLowerCase();
    return oa.localeCompare(ob, 'ru', { numeric: true });
  });

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

  const DAYS = [
    { idx: 1, name: 'Пн' }, { idx: 2, name: 'Вт' }, { idx: 3, name: 'Ср' },
    { idx: 4, name: 'Чт' }, { idx: 5, name: 'Пт' }, { idx: 6, name: 'Сб' },
    { idx: 0, name: 'Вс' }
  ];

  const weekDays = getWeekDays(clState.weekOffset);
  const dateByDayIdx = {};
  [1, 2, 3, 4, 5, 6, 0].forEach((dayIdx, i) => {
    dateByDayIdx[dayIdx] = weekDays[i];
  });

  // Панель навигации по неделям
  const weekLabel = getWeekLabel(clState.weekOffset);
  const isCurrentWeek = clState.weekOffset === 0;
  let html = `
    <div class="cl-week-nav">
      <button type="button" class="cl-week-nav-btn" id="clWeekPrev" title="Предыдущая неделя">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
      </button>
      <div class="cl-week-nav-label">
        <span class="cl-week-nav-title">${escapeHtml(weekLabel)}</span>
        ${isCurrentWeek ? '<span class="cl-week-nav-sub">текущая неделя</span>' : ''}
      </div>
      <button type="button" class="cl-week-nav-btn" id="clWeekNext" title="Следующая неделя">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
      </button>
      ${!isCurrentWeek ? '<button type="button" class="cl-week-nav-today" id="clWeekToday">Сегодня</button>' : ''}
    </div>
    <div class="cl-matrix">`;

  // ===== Шапка =====
  html += '<div class="cl-head-grid">';

  // Левая объединённая шапка (8 колонок)
  html += `<div class="cl-head-info">
    <div style="width:48px;text-align:center">№</div>
    <div style="width:100px;text-align:center">OPL №</div>
    <div style="width:80px;text-align:center">Машина</div>
    <div style="width:240px;text-align:left">Узел</div>
    <div style="width:280px;text-align:left">Название</div>
    <div style="width:100px;text-align:center">Время</div>
    <div style="width:80px;text-align:center">Работа</div>
    <div style="width:180px;text-align:center">Норма / точки</div>
  </div>`;

  // Дни и смены (14 колонок)
  DAYS.forEach((d, i) => {
    const dateStr = dateByDayIdx[d.idx];
    const shortDate = dateStr ? fmtShortDate(dateStr) : '';
    const colStart = 9 + i * 2;   // 8 колонок инфо + смещение

    // Бригады для этой даты
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

  // ===== Тело =====
  rows.forEach((row, idx) => {
    html += renderClRow(row, idx + 1, DAYS, dateByDayIdx);
  });

  html += '</div>';
  wrap.innerHTML = html;

  bindClCells();
  bindClWeekNav();
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

function renderClRow(row, num, DAYS, dateByDayIdx) {
  const freq = getClRowFreq(row);
  const schedule = Array.isArray(freq.schedule) ? freq.schedule : [];
  const isInSchedule = (dayIdx, shift) => schedule.some(x => x.day === dayIdx && x.shift === shift);

  const title = row.title || row.paramName || '—';
  const node = row.node || '';
  const machine = row.machine || '';
  const oplNumber = row.oplNumber || '';
  const work = row.work === 'Stop' ? 'Stop' : 'Run';

  // Время проверки — из frequency.timeWindows
  const timeWindows = Array.isArray(freq.timeWindows) ? freq.timeWindows : [];

  // Норма/точки
  const normHtml = renderClRowNorm(row);

  let html = `<div class="cl-row" data-row-id="${escapeAttr(row.id)}">`;

  // №
  html += `<div class="cl-info-cell" style="justify-content:center;font-family:'Courier New';font-weight:800;color:var(--text-second)">${num}</div>`;
  // OPL
  html += `<div class="cl-info-cell cl-info-opl">${escapeHtml(oplNumber)}</div>`;
  // Машина
  html += `<div class="cl-info-cell cl-info-machine">${escapeHtml(machine)}</div>`;
  // Узел
  html += `<div class="cl-info-cell cl-info-node" title="${escapeAttr(node)}">${escapeHtml(node)}</div>`;
  // Название
  html += `<div class="cl-info-cell cl-info-title" title="${escapeAttr(title)}">${escapeHtml(title)}</div>`;
  // Время — чипы из timeWindows
  let timeHtml = '';
  if (!timeWindows.length) {
    timeHtml = '<span class="cl-time-empty">—</span>';
  } else {
    timeHtml = timeWindows.map(w => {
      const shift = getTimeWindowShift(w.from);
      return `<span class="cl-time-chip cl-time-chip-${shift}">${escapeHtml(w.from)}–${escapeHtml(w.to)}</span>`;
    }).join('');
  }
  html += `<div class="cl-info-cell cl-info-time">${timeHtml}</div>`;
  // Run/Stop
  html += `<div class="cl-info-cell cl-info-work"><span class="cl-work-badge cl-work-badge-${work.toLowerCase()}">${work}</span></div>`;
  // Норма
  html += `<div class="cl-info-cell cl-info-norm" title="${escapeAttr(normHtml.title || '')}">${normHtml.text}</div>`;

  // 14 ячеек дней
  DAYS.forEach(d => {
    const dateStr = dateByDayIdx[d.idx];

    ['day', 'night'].forEach(shift => {
      const planned = isInSchedule(d.idx, shift);
      const shiftLetter = getShiftsForDate(dateStr)[shift];
      const existing = findExistingCheck(row.id, dateStr, shiftLetter);

      const draftKey = `${row.id}|${dateStr}|${shift}`;
      const draft = clState.quickDraft[draftKey];

      const dateInPast = !!(dateStr && clState.todayISO && dateStr < clState.todayISO);

      // Текущая неделя: активны только дни с даты начала активной смены
      // (например, в Пт утром — с Чт·ночь) и далее. Прошедшие дни текущей
      // недели НЕ считаются запланированными → нет жёлтого «?»/missed.
      // На других неделях расписание действует целиком.
      const isCurrentWeek = clState.weekOffset === 0;
      const activeFrom = isCurrentWeek ? clState.activeDate : null;
      const effectivelyPlanned = planned && (!activeFrom || dateStr >= activeFrom);

      let status = 'na';
      if (draft) {
        status = draft.status;
      } else if (existing) {
        status = existing.status;
      } else if (effectivelyPlanned) {
        status = (!isCurrentWeek && dateInPast) ? 'missed' : 'due';
      }

      const isActiveCell = dateStr === clState.activeDate && shift === clState.shiftType;
      const isClickable = effectivelyPlanned && isActiveCell && clState.checkMode;

      let cls = 'cl-cell';
      let content = '—';

      if (status === 'due') {
        cls += ' cl-cell-due';
        content = '';
      } else if (status === 'OK') {
        cls += ' cl-cell-ok';
        content = '✓';
      } else if (status === 'FAIL') {
        cls += ' cl-cell-fail';
        content = '✕';
      } else if (status === 'UNCHECKED') {
        cls += ' cl-cell-unchecked';
        content = '?';
      } else if (status === 'missed') {
        cls += ' cl-cell-missed';
        content = '?';
      } else {
        cls += ' cl-cell-na';
        content = '—';
      }

      if (effectivelyPlanned && isActiveCell) cls += ' cl-cell-today';
      if (isClickable) cls += ' cl-cell-clickable';

      const cellTitle = `${d.name} · ${shift === 'day' ? 'День' : 'Ночь'}${status === 'missed' ? ' — пропущено' : ''}`;

      html += `<div class="${cls}"
        data-row-id="${escapeAttr(row.id)}"
        data-date="${escapeAttr(dateStr)}"
        data-shift="${escapeAttr(shift)}"
        data-planned="${planned ? '1' : '0'}"
        data-clickable="${isClickable ? '1' : '0'}"
        title="${cellTitle}">${content}</div>`;
    });
  });

  html += '</div>';
  return html;
}

/* Сводка по норме для строки матрицы CL */
function renderClRowNorm(row) {
  const controlType = migrateControlType(row.controlType, row.measurements);
  const measurements = Array.isArray(row.measurements) ? row.measurements : [];

  // --- Фиксированный без точек → ОК / Не ОК ---
  if (controlType === 'fixed') {
    const hasPoints = measurements.some(b =>
      b && Array.isArray(b.points) && b.points.length > 0
    );
    if (!hasPoints) {
      return {
        text: '<span class="cl-norm-check">✓</span>',
        title: 'Фиксированный — ОК / Не ОК'
      };
    }
  }

  // --- Если нет точек — «—» ---
  if (!measurements.length) {
    return { text: '<span style="color:var(--text-dim)">—</span>', title: '' };
  }

  // Берём первый блок (по бренду или "Все бренды")
  let block = null;
  if (clState.brand) {
    block = measurements.find(b => b.brand === clState.brand);
  }
  if (!block) block = measurements.find(b => !b.brand) || measurements[0];

  const points = Array.isArray(block.points) ? block.points : [];
  if (!points.length) {
    return { text: '<span style="color:var(--text-dim)">—</span>', title: '' };
  }

  // --- Вариабельный → «target ± tolerance» ---
  if (controlType === 'variable') {
    if (points.length === 1) {
      const norm = parseNorm(points[0].value);
      if (norm) {
        const center = (norm.min + norm.max) / 2;
        const tol = (norm.max - norm.min) / 2;
        const text = tol > 0 ? `${fmtNum(center)} ± ${fmtNum(tol)}` : `${fmtNum(center)}`;
        return { text: escapeHtml(text), title: points[0].value || '' };
      }
      return { text: escapeHtml(points[0].value || '—'), title: '' };
    }
    return {
      text: `<strong>${points.length} точки</strong>`,
      title: `${points.length} точек замера — у каждой своя норма`
    };
  }

  // --- Контролируемый интервал → «от … до …» ---
  if (controlType === 'interval') {
    if (points.length === 1) {
      const norm = parseNorm(points[0].value);
      if (norm && norm.min !== norm.max) {
        return { text: escapeHtml(`${fmtNum(norm.min)}…${fmtNum(norm.max)}`), title: points[0].value || '' };
      }
      if (norm) {
        return { text: escapeHtml(fmtNum(norm.min)), title: points[0].value || '' };
      }
      return { text: escapeHtml(points[0].value || '—'), title: '' };
    }
    return {
      text: `<strong>${points.length} точки</strong>`,
      title: `${points.length} точек замера — у каждой свой интервал`
    };
  }

  // --- Фиксированный с точками → точное значение (без допуска) ---
  if (controlType === 'fixed') {
    if (points.length === 1) {
      const norm = parseNorm(points[0].value);
      const val = norm != null ? fmtNum(norm.max) : (points[0].value || '—');
      return { text: escapeHtml(val), title: points[0].value || '' };
    }
    return {
      text: `<strong>${points.length} точки</strong>`,
      title: `${points.length} точек замера — точные значения`
    };
  }

  // --- Резерв: точки без типа ---
  if (points.length === 1) {
    return { text: escapeHtml(points[0].value || '—'), title: '' };
  }
  return {
    text: `<strong>${points.length} точки</strong>`,
    title: `${points.length} точек замера`
  };
}

/* Формат числа: убирает «.0» и лишние нули */
function fmtNum(n) {
  if (n == null || isNaN(n)) return '';
  return parseFloat(n.toFixed(6)).toString();
}

function findExistingCheck(stdId, dateStr, shiftLetter) {
  const hist = getHistory();
  const record = hist.find(h =>
    (h.mode === 'electronic' || h.mode === 'cl') &&
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

  wrap.querySelectorAll('.cl-cell').forEach(cell => {
    cell.addEventListener('click', (e) => {
      const clickable = cell.dataset.clickable === '1';
      if (!clickable) {
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

  saveClDraftToHistory();

  clState.checkMode = false;
  clState.quickDraft = {};
  updateClCheckButtons();
  renderClMatrix();
  showToast('Проверка сохранена');
}

function saveClDraftToHistory() {
  const drafts = Object.entries(clState.quickDraft);
  if (!drafts.length) return;

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
      (h.mode === 'electronic' || h.mode === 'cl') &&
      h.line === clState.line &&
      h.date === group.date &&
      h.shift === shiftLetter
    );

    if (!record) {
      record = {
        id: uid(),
        timestamp: new Date().toISOString(),
        mode: clState.mode === 'mech' ? 'cl' : 'electronic',
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
/* Сворачивание блока «Как проверять» в модалке быстрой проверки */
document.addEventListener('click', (e) => {
  const head = e.target.closest('#qcControlDescToggle');
  if (!head) return;
  const block = document.getElementById('qcControlDescBlock');
  if (block) block.classList.toggle('expanded');
});
/* ============================================================
   ПОЛНОЭКРАННЫЙ СТАНДАРТ (sv-full) — открытие и заполнение
   ============================================================ */

/* Состояние полноэкранного просмотра */
const svFullState = {
  standardId: null,        // id текущего стандарта
  mode: 'view',            // 'view' | 'edit'
  originalData: null,      // снимок для отмены редактирования
  editingData: null        // НОВОЕ: рабочая копия при редактировании
};

/* Открыть полноэкранный просмотр стандарта */
function openStandardFullView(id, mode) {
  const st = getStandards().find(s => s.id === id);
  if (!st) {
    showToast('Стандарт не найден', true);
    return;
  }

  svFullState.standardId = id;
  svFullState.mode = mode === 'edit' ? 'edit' : 'view';
  svFullState.originalData = JSON.parse(JSON.stringify(st));

  // ВАЖНО: если открываем сразу в режиме редактирования —
  // создаём рабочую копию editingData
  if (svFullState.mode === 'edit') {
    svFullState.editingData = JSON.parse(JSON.stringify(st));
  } else {
    svFullState.editingData = null;
  }

  // Открываем таб
  if (typeof switchTab === 'function') {
    switchTab('standard-view');
  }

  // Перерисовываем всё
  renderStandardFullView();

  // Прокручиваем наверх
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
window.openStandardFullView = openStandardFullView;

/* Закрыть полноэкранный просмотр — вернуться в редактор */
function closeStandardFullView() {
  svFullState.standardId = null;
  svFullState.mode = 'view';
  svFullState.originalData = null;
  svFullState.editingData = null;

  if (typeof switchTab === 'function') {
    switchTab('editor');
  }
}
window.closeStandardFullView = closeStandardFullView;

/* Главный рендер полноэкранного просмотра */
function renderStandardFullView() {
  const id = svFullState.standardId;
  if (!id) return;

  // В режиме редактирования работаем с копией
  let st;
  if (svFullState.mode === 'edit' && svFullState.editingData) {
    st = svFullState.editingData;
  } else {
    st = getStandards().find(s => s.id === id);
  }

  if (!st) {
    showToast('Стандарт не найден', true);
    closeStandardFullView();
    return;
  }

  const isEdit = svFullState.mode === 'edit';

  // --- Заголовок ---
  const titleEl = $('#svFullTitle');
  if (titleEl) titleEl.textContent = st.title || '—';

  // --- Крошки ---
  renderSvFullCrumbs(st);

  // --- Кнопки ---
  const viewBtn = $('#svFullViewToggleBtn');
  const editBtn = $('#svFullEditBtn');
  const proposalBtn = $('#svFullProposalBtn');
  const saveBtn = $('#svFullSaveBtn');
  const cancelBtn = $('#svFullCancelBtn');

  if (isEdit) {
    if (viewBtn) viewBtn.style.display = 'none';
    if (editBtn) editBtn.style.display = 'none';
    if (proposalBtn) proposalBtn.style.display = 'none';
    if (saveBtn) saveBtn.style.display = 'inline-flex';
    if (cancelBtn) cancelBtn.style.display = 'inline-flex';
  } else {
    if (viewBtn) viewBtn.style.display = 'inline-flex';
    if (editBtn) editBtn.style.display = 'inline-flex';
    if (proposalBtn) proposalBtn.style.display = 'none';   // позже
    if (saveBtn) saveBtn.style.display = 'none';
    if (cancelBtn) cancelBtn.style.display = 'none';
  }

  // --- Бейджи вкладок ---
  const ackCount = Array.isArray(st.acknowledgements) ? st.acknowledgements.length : 0;
  const versionsCount = Array.isArray(st.versions) ? st.versions.length : 0;
  const commentsCount = Array.isArray(st.comments) ? st.comments.length : 0;

  const historyBadge = $('#svHistoryCount');
  if (historyBadge) historyBadge.textContent = versionsCount;

  const commentsBadge = $('#svCommentsCount');
  if (commentsBadge) commentsBadge.textContent = commentsCount;

  const ackBadge = $('#svAckBadge');
  if (ackBadge) {
    // Показываем «Новое» если есть версии и никто не ознакомлен с последней
    const lastVersion = st.version || 1;
    const hasAck = Array.isArray(st.acknowledgements) &&
      st.acknowledgements.some(a => a.version === lastVersion);
    ackBadge.style.display = (!hasAck && versionsCount > 0) ? 'inline-flex' : 'none';
  }

  // --- Основная информация ---
  renderSvMainFields(st, isEdit);

  // --- Точки контроля и описание ---
  renderSvContentBlocks(st, isEdit);

  // --- Изображения ---
  renderSvFullPhotos(st, isEdit);

  // --- Связанные объекты ---
  renderSvFullRelated(st);

  // --- Дополнительная информация ---
  renderSvFullExtra(st, isEdit);

  // --- Таблицы вкладок (пока заглушки) ---
  renderSvAckTable(st);
  renderSvHistoryTable(st);
  renderSvCommentsTable(st);
}

/* Крошки в шапке */
function renderSvFullCrumbs(st) {
  const el = $('#svFullCrumbs');
  if (!el) return;

  const ctx = typeof getBlockForLine === 'function' ? getBlockForLine(st.line) : null;
  if (!ctx) {
    el.innerHTML = '';
    return;
  }

  const parts = [];
  // ID
  if (st.oplNumber) {
    parts.push(`<span class="sv-full-crumb-id">#${escapeHtml(st.oplNumber)}</span>`);
  }
  // Цех
  parts.push(`<span class="sv-full-crumb">${escapeHtml(ctx.workshop.name)}</span>`);
  // Участок + блок
  if (ctx.block) {
    parts.push(`<span class="sv-full-crumb-sep">›</span>`);
    parts.push(`<span class="sv-full-crumb">${escapeHtml(ctx.area.name)} (${escapeHtml(ctx.block.name)})</span>`);
  } else {
    parts.push(`<span class="sv-full-crumb-sep">›</span>`);
    parts.push(`<span class="sv-full-crumb">${escapeHtml(ctx.area.name)}</span>`);
  }
  // Линия
  parts.push(`<span class="sv-full-crumb-sep">›</span>`);
  parts.push(`<span class="sv-full-crumb-current">${escapeHtml(st.line || '—')}</span>`);
  // Машина
  if (st.machine) {
    parts.push(`<span class="sv-full-crumb-sep">›</span>`);
    parts.push(`<span class="sv-full-crumb-current">${escapeHtml(st.machine)}</span>`);
  }

  el.innerHTML = parts.join(' ');
}

/* ============================================================
   Основная информация — поля
   ============================================================ */

function renderSvMainFields(st, isEdit) {
  const wrap = $('#svMainFields');
  if (!wrap) return;

  const isActive = st.active !== false;
  const statusHtml = isActive
    ? '<span class="sv-status-chip sv-status-active">Активен</span>'
    : '<span class="sv-status-chip sv-status-inactive">Неактивен</span>';

  // Формат времени
  const durationText = formatSvDuration(st.durationSec);

  if (!isEdit) {
    // --- Режим просмотра ---
    wrap.innerHTML = `
      ${svFieldRow('Название', st.title || '')}
      ${svFieldRow('№ OPL', st.oplNumber || '')}
      ${svFieldRow('Машина', st.machine || '')}
      ${svFieldRow('Узел', st.node || '')}
      ${svFieldRow('Время на проверку', durationText)}
      ${svFieldRow('Инструмент', st.tool || '')}
      ${svFieldRow('Тип контроля', controlTypeLabel(st.controlType))}
      <div class="sv-full-field">
        <div class="sv-full-field-label">Статус</div>
        <div class="sv-full-field-value">${statusHtml}</div>
      </div>
    `;
  } else {
    // --- Режим редактирования ---
    // Заполняем машины
    const machines = getMachinesForLine(st.line);
    const machineOpts = ['<option value="">— выберите —</option>']
      .concat(machines.map(m => {
        const sel = (m === st.machine) ? ' selected' : '';
        return `<option value="${escapeHtml(m)}"${sel}>${escapeHtml(m)}</option>`;
      }))
      .join('');

    // Часть линии — только SMD
    const workshopId = getWorkshopIdForLine(st.line);
    const showNodePart = (workshopId === 'smd');
    const nodePartHtml = showNodePart ? `
      <div class="sv-full-field-edit">
        <label>Часть линии</label>
        <select id="svf_nodePart">
          <option value="">— выберите —</option>
          <option value="Maker" ${st.nodePart === 'Maker' ? 'selected' : ''}>Maker</option>
          <option value="Packer" ${st.nodePart === 'Packer' ? 'selected' : ''}>Packer</option>
        </select>
      </div>
    ` : '';

    wrap.innerHTML = `
      <div class="sv-full-field-edit">
        <label>Название</label>
        <input type="text" id="svf_title" value="${escapeAttr(st.title || '')}">
      </div>
      <div class="sv-full-field-edit">
        <label>№ OPL</label>
        <input type="text" id="svf_oplNumber" value="${escapeAttr(st.oplNumber || '')}">
      </div>
      <div class="sv-full-field-edit">
        <label>Машина</label>
        <select id="svf_machine">${machineOpts}</select>
      </div>
      ${nodePartHtml}
      <div class="sv-full-field-edit">
        <label>Узел</label>
        <input type="text" id="svf_node" value="${escapeAttr(st.node || '')}">
      </div>
      <div class="sv-full-field-edit">
        <label>Время на проверку (секунд)</label>
        <input type="number" id="svf_durationSec" min="0" step="1"
               value="${escapeAttr(st.durationSec || 0)}"
               placeholder="60">
        <p style="color:var(--text-dim);font-size:11px;margin-top:6px">
          60 сек = 1 мин, 30 сек = 0.5 мин
        </p>
      </div>
      <div class="sv-full-field-edit">
        <label>Инструмент</label>
        <input type="text" id="svf_tool"
               value="${escapeAttr(st.tool || '')}"
               placeholder="Штангенциркуль, линейка...">
      </div>
      <div class="sv-full-field-edit">
        <label>Тип контроля</label>
        <select id="svf_controlType">
          <option value="">— выберите —</option>
          <option value="fixed"     ${st.controlType === 'fixed'    ? 'selected' : ''}>Фиксированный</option>
          <option value="variable"  ${st.controlType === 'variable' ? 'selected' : ''}>Вариабельный</option>
          <option value="interval"  ${st.controlType === 'interval' ? 'selected' : ''}>Контролируемый интервал</option>
        </select>
      </div>
      <div class="sv-full-field-edit">
        <label>Статус</label>
        <label style="display:inline-flex;align-items:center;gap:8px;text-transform:none;letter-spacing:0;font-weight:500;font-size:13px;color:var(--text-main)">
          <input type="checkbox" id="svf_active" ${isActive ? 'checked' : ''}>
          Активен
        </label>
      </div>
    `;
  }
}

/* Строка поля (просмотр) */
function svFieldRow(label, value) {
  const isEmpty = !value || !String(value).trim();
  return `
    <div class="sv-full-field">
      <div class="sv-full-field-label">${escapeHtml(label)}</div>
      <div class="sv-full-field-value ${isEmpty ? 'sv-empty' : ''}">
        ${isEmpty ? 'Не указано' : escapeHtml(value)}
      </div>
    </div>
  `;
}

/* Формат длительности */
function formatSvDuration(sec) {
  const n = Number(sec) || 0;
  if (n <= 0) return '';
  if (n < 60) return `${n} сек`;
  const min = Math.floor(n / 60);
  const rest = n % 60;
  if (rest === 0) return `${min} мин`;
  return `${min} мин ${rest} сек`;
}

/* ============================================================
   Точки контроля и описание — блоки
   ============================================================ */

function renderSvContentBlocks(st, isEdit) {
  const wrap = $('#svContentBlocks');
  if (!wrap) return;

  // 1. Описание — на всю ширину
  const blockDescription = svContentBlockEditable(
    'Описание',
    st.problemDescription,
    'svf_problemDescription',
    isEdit,
    'Опишите: к чему приводит отклонение, какие остановки/потери'
  );

  // 2. Контроль правильности — на всю ширину
  const blockControl = renderSvControlSection(st, isEdit);

  // 3. Описание контроля — левая колонка
  const blockControlDesc = svContentBlockEditable(
    'Описание контроля',
    st.controlDescription,
    'svf_controlDescription',
    isEdit,
    'Как проверять: пошаговая инструкция'
  );

  // 4. Цель — правая колонка
  const blockPurpose = svContentBlockEditable(
    'Цель (зачем мы это делаем?)',
    st.purpose,
    'svf_purpose',
    isEdit,
    'Зачем нужен этот стандарт'
  );

  // 5. Знаю почему — правая колонка
  const blockWhy = svContentBlockEditable(
    'Знаю почему (почему создан стандарт?)',
    st.whyCreated,
    'svf_whyCreated',
    isEdit,
    'К чему приводит отсутствие контроля'
  );

  // Компоновка
  wrap.innerHTML = `
    ${blockDescription}
    ${blockControl}
    ${blockControlDesc}
    <div class="sv-content-blocks-grid">
      <div class="sv-content-blocks-col">
        ${blockPurpose}
      </div>
      <div class="sv-content-blocks-col">
        ${blockWhy}
      </div>
    </div>
  `;

  // Если режим редактирования — навешиваем обработчики на таблицу контроля
  if (isEdit) {
    bindSvControlEvents(st);
  } else {
    bindSvBrandBlockPhotoEvents(st);
  }
}

/* Блок контента — просмотр ИЛИ редактирование */
function svContentBlockEditable(title, value, inputId, isEdit, placeholder) {
  const isEmpty = !value || !String(value).trim();

  if (!isEdit) {
    return `
      <div class="sv-content-block">
        <div class="sv-content-block-title">${escapeHtml(title)}</div>
        <div class="sv-content-block-text ${isEmpty ? 'sv-empty' : ''}">
          ${isEmpty ? 'Не указано' : escapeHtml(value).replace(/\n/g, '<br>')}
        </div>
      </div>
    `;
  }

  return `
    <div class="sv-content-block">
      <div class="sv-content-block-title">${escapeHtml(title)}</div>
      <textarea id="${inputId}" rows="3"
                placeholder="${escapeAttr(placeholder)}"
                class="sv-content-textarea">${escapeHtml(value || '')}</textarea>
    </div>
  `;
}

/* ============================================================
   Контроль правильности — таблица брендов × точек
   (просмотр + редактирование)
   ============================================================ */

/* Секция «Контроль правильности» */
function renderSvControlSection(st, isEdit) {
  const typeLabel = controlTypeLabel(st.controlType);

  if (!isEdit) {
    // --- Просмотр ---
    return `
      <div class="sv-content-block">
        <div class="sv-content-block-title">Контроль правильности</div>
        <div style="margin-bottom:8px">
          <span class="sv-chip sv-chip-cyan">${escapeHtml(typeLabel)}</span>
        </div>
        ${renderSvBrandBlocksView(st)}
      </div>
    `;
  }

  // --- Редактирование ---
  return `
    <div class="sv-content-block">
      <div class="sv-content-block-title">Контроль правильности</div>
      <div style="margin-bottom:8px">
        <span class="sv-chip sv-chip-cyan">${escapeHtml(typeLabel)}</span>
      </div>
      <div id="svf_brandBlocksContainer"></div>
      <button type="button" class="btn btn-secondary btn-sm" id="svf_addBrandBlockBtn" style="margin-top:8px">
        + Добавить бренд
      </button>
    </div>
  `;
}

/* Просмотр точек по брендам — таблицей как в редакторе стандарта.
   Общий помощник, чтобы и компактный (#standardViewModal), и полноэкранный
   (#standardFullViewModal) просмотр выглядели одинаково с формой. */
function renderReadonlyBrandsTable(measurements) {
  const blocks = Array.isArray(measurements) ? measurements : [];
  const maxPoints = blocks.reduce((m, b) => Math.max(m, (b && Array.isArray(b.points)) ? b.points.length : 0), 0);

  if (!maxPoints) {
    return '<div class="sv-content-block-text sv-empty">Точки не заданы</div>';
  }

  let headerHtml = `<tr><th class="bt-th-brand">Бренд</th>`;
  for (let i = 0; i < maxPoints; i++) {
    headerHtml += `<th class="bt-th-point"><span>Точка ${i + 1}</span></th>`;
  }
  headerHtml += `</tr>`;

  const bodyHtml = blocks.map(block => {
    const points = (block && Array.isArray(block.points)) ? block.points : [];
    let cells = '';
    for (let i = 0; i < maxPoints; i++) {
      const val = points[i]?.value || '';
      cells += `<td class="bt-td-value">${escapeHtml(val) || '<span style="color:var(--text-dim)">—</span>'}</td>`;
    }
    return `<tr><td class="bt-td-brand">${escapeHtml(block && block.brand ? block.brand : 'Все бренды')}</td>${cells}</tr>`;
  }).join('');

  return `
    <div class="brands-table-wrap">
      <table class="brands-table">
        <thead>${headerHtml}</thead>
        <tbody>${bodyHtml}</tbody>
      </table>
    </div>
  `;
}

function renderSvBrandBlocksView(st) {
  const blocks = Array.isArray(st.measurements) ? st.measurements : [];
  if (!blocks.length) {
    return '<div class="sv-content-block-text sv-empty">Точки не заданы</div>';
  }
  return renderReadonlyBrandsTable(blocks);
}
/* ============================================================
   Таблица брендов × точек — рендер в новом экране
   ============================================================ */

/* Отрисовать таблицу в контейнере #svf_brandBlocksContainer */
function renderSvBrandsTable(measurements) {
  const container = $('#svf_brandBlocksContainer');
  if (!container) return;

  const brands = getBrands();

  // Нормализуем
  const state = (measurements || []).map(b => ({
    brand: b.brand || '',
    points: Array.isArray(b.points) ? b.points.map(p => ({ value: p.value || '' })) : []
  }));
  const maxPoints = state.reduce((m, b) => Math.max(m, b.points.length), 0);
  state.forEach(b => {
    while (b.points.length < maxPoints) b.points.push({ value: '' });
  });

  // Шапка
  let headerHtml = `<tr>
    <th class="bt-th-brand">Бренд</th>`;
  for (let i = 0; i < maxPoints; i++) {
    headerHtml += `<th class="bt-th-point">
      <span>Точка ${i + 1}</span>
      <button type="button" class="bt-remove-point" data-remove-point-col="${i}" title="Удалить точку у всех брендов">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:12px;height:12px">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </th>`;
  }
  headerHtml += `<th class="bt-th-actions">
    <button type="button" class="bt-add-point-btn" data-add-point-col title="Добавить точку">+ Точка</button>
  </th></tr>`;

  // Тело
  let bodyHtml = '';
  if (!state.length) {
    bodyHtml = `<tr><td colspan="${maxPoints + 2}" class="bt-empty">Нет брендов. Нажмите «+ Добавить бренд».</td></tr>`;
  } else {
    bodyHtml = state.map((block, rowIndex) => {
      let cells = '';
      for (let i = 0; i < maxPoints; i++) {
        const val = block.points[i]?.value || '';
        cells += `<td class="bt-td-value">
          <input type="text" class="bt-point-input"
                 data-row="${rowIndex}" data-col="${i}"
                 value="${escapeAttr(val)}" placeholder="0">
        </td>`;
      }

      const brandOptions = ['<option value="">Все бренды</option>']
        .concat(brands.map(b => {
          const selected = (b === block.brand) ? ' selected' : '';
          return `<option value="${escapeHtml(b)}"${selected}>${escapeHtml(b)}</option>`;
        })).join('');

      return `<tr class="bt-row" data-row="${rowIndex}">
        <td class="bt-td-brand">
          <select class="bt-brand-select" data-row="${rowIndex}">${brandOptions}</select>
          <button type="button" class="bt-remove-brand" data-remove-brand="${rowIndex}" title="Удалить бренд">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
              <path d="M10 11v6"/><path d="M14 11v6"/>
            </svg>
          </button>
        </td>
        ${cells}
        <td class="bt-td-actions"></td>
      </tr>`;
    }).join('');
  }

  container.innerHTML = `
    <div class="brands-table-wrap">
      <table class="brands-table">
        <thead>${headerHtml}</thead>
        <tbody>${bodyHtml}</tbody>
      </table>
    </div>
  `;
}

/* Прочитать state из DOM */
function getSvTableState() {
  const container = $('#svf_brandBlocksContainer');
  if (!container) return [];
  const state = [];
  container.querySelectorAll('.bt-row').forEach(row => {
    const brand = row.querySelector('.bt-brand-select')?.value || '';
    const points = [];
    row.querySelectorAll('.bt-point-input').forEach(inp => {
      points.push({ value: inp.value || '' });
    });
    state.push({ brand, points });
  });
  return state;
}

/* Отрисовать state обратно в DOM */
function renderSvBrandsTableFromState(state) {
  const maxPoints = state.reduce((m, b) => Math.max(m, (b.points || []).length), 0);
  state.forEach(b => {
    while (b.points.length < maxPoints) b.points.push({ value: '' });
  });
  renderSvBrandsTable(state);
  bindSvControlEvents(svFullState.originalData);
}

/* Обработчики событий в таблице контроля */
function bindSvControlEvents(st) {
  const container = $('#svf_brandBlocksContainer');
  if (!container) return;

  // Если таблица ещё не отрисована — отрисовываем из st.measurements,
  // НО не выходим: ниже должны привязаться обработчики (в т.ч. «+ Добавить бренд»).
  if (!container.querySelector('.bt-row') && !container.querySelector('.bt-empty')) {
    renderSvBrandsTable(st.measurements || []);
  }

  // --- Удаление бренда ---
  container.querySelectorAll('[data-remove-brand]').forEach(btn => {
    btn.addEventListener('click', () => {
      const rowIndex = parseInt(btn.dataset.removeBrand, 10);
      const state = getSvTableState();
      if (!confirm('Удалить бренд со всеми его точками?')) return;
      state.splice(rowIndex, 1);
      renderSvBrandsTableFromState(state);
    });
  });

  // --- Удаление колонки точки ---
  container.querySelectorAll('[data-remove-point-col]').forEach(btn => {
    btn.addEventListener('click', () => {
      const colIndex = parseInt(btn.dataset.removePointCol, 10);
      const state = getSvTableState();
      if (!confirm(`Удалить точку ${colIndex + 1} у всех брендов?`)) return;
      state.forEach(b => b.points.splice(colIndex, 1));
      renderSvBrandsTableFromState(state);
    });
  });

  // --- Добавление колонки точки ---
  container.querySelectorAll('[data-add-point-col]').forEach(btn => {
    btn.addEventListener('click', () => {
      const state = getSvTableState();
      if (!state.length) {
        state.push({ brand: '', points: [{ value: '' }] });
      } else {
        state.forEach(b => b.points.push({ value: '' }));
      }
      renderSvBrandsTableFromState(state);
    });
  });

  // --- Кнопка «+ Добавить бренд» ---
  const addBrandBtn = $('#svf_addBrandBlockBtn');
  if (addBrandBtn && !addBrandBtn.dataset.bound) {
    addBrandBtn.dataset.bound = '1';
    addBrandBtn.addEventListener('click', () => {
      const state = getSvTableState();
      const maxPoints = state.reduce((m, b) => Math.max(m, (b.points || []).length), 0);
      const pointsCount = Math.max(maxPoints, 1);
      const newPoints = [];
      for (let i = 0; i < pointsCount; i++) newPoints.push({ value: '' });
      state.push({ brand: '', points: newPoints });
      renderSvBrandsTableFromState(state);
    });
  }
}

/* Заглушка для совместимости (вызывается в renderSvContentBlocks) */
function bindSvBrandBlockPhotoEvents(st) {
  // Пока не нужно — было для старого варианта
}

/* ============================================================
   Фото
   ============================================================ */

function renderSvFullPhotos(st, isEdit) {
  const wrap = $('#svFullPhotos');
  if (!wrap) return;

  const photos = Array.isArray(st.photos) ? st.photos : [];

  if (!photos.length && !isEdit) {
    wrap.innerHTML = '<div class="sv-full-photos-empty">Фотографий пока нет</div>';
    return;
  }

  // Сетка миниатюр
  let gridHtml = '';
  if (photos.length) {
    gridHtml = photos.map((name, idx) => {
      const path = getPhotoPath(st, name);
      return `
        <div class="sv-full-photo" data-photo-idx="${idx}" title="${escapeAttr(name)}">
          <img src="${escapeAttr(path)}" alt="${escapeAttr(name)}"
               onerror="this.style.display='none';this.nextElementSibling.style.display='flex';">
          <div class="photo-missing" style="display:none">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          </div>
          ${isEdit ? `
            <button type="button" class="sv-full-photo-remove" data-remove-photo="${idx}" title="Удалить фото">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          ` : ''}
        </div>
      `;
    }).join('');
  } else {
    gridHtml = '<div class="sv-full-photos-empty">Фотографий пока нет</div>';
  }

  // Форма добавления
  const addFormHtml = isEdit ? `
    <div class="sv-photo-add-form">
      <textarea id="svf_newPhotoName" rows="2"
                placeholder="Имена файлов — через запятую или с новой строки:&#10;max-1.jpg, max-2.jpg"
                class="sv-photo-add-textarea"></textarea>
      <button type="button" class="btn btn-secondary btn-sm" id="svf_addPhotoBtn">
        + Добавить
      </button>
    </div>
  ` : '';

  wrap.innerHTML = gridHtml + addFormHtml;

  // === Обработчики ===

  // Открытие лайтбокса (только в режиме просмотра)
  if (!isEdit) {
    wrap.querySelectorAll('[data-photo-idx]').forEach(el => {
      el.addEventListener('click', () => {
        const idx = parseInt(el.dataset.photoIdx, 10);
        if (typeof openLightbox === 'function') openLightbox(st, idx);
      });
    });
  }

  // Удаление фото (только в режиме редактирования)
  if (isEdit) {
    wrap.querySelectorAll('[data-remove-photo]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.dataset.removePhoto, 10);
        if (!st.photos || idx < 0 || idx >= st.photos.length) return;
        if (!confirm('Удалить фото "' + st.photos[idx] + '"?')) return;
        st.photos.splice(idx, 1);
        renderSvFullPhotos(st, true);
      });
    });

    // Добавление фото
    const addBtn = $('#svf_addPhotoBtn');
    if (addBtn) {
      addBtn.addEventListener('click', () => {
        const input = $('#svf_newPhotoName');
        if (!input) return;
        const raw = input.value || '';

        // Разбиваем по запятой / переносам строк
        const names = raw.split(/[\n,]+/).map(s => s.trim()).filter(s => s.length > 0);
        if (!names.length) {
          showToast('Введите хотя бы одно имя файла', true);
          return;
        }

        // Инициализируем массив
        if (!Array.isArray(st.photos)) st.photos = [];

        let added = 0;
        let skipped = 0;
        names.forEach(name => {
          if (st.photos.includes(name)) {
            skipped++;
          } else {
            st.photos.push(name);
            added++;
          }
        });

        input.value = '';
        renderSvFullPhotos(st, true);

        if (added > 0 && skipped === 0) {
          showToast('Добавлено: ' + added);
        } else if (added > 0 && skipped > 0) {
          showToast('Добавлено: ' + added + ', пропущено дубликатов: ' + skipped);
        } else if (added === 0 && skipped > 0) {
          showToast('Все ' + skipped + ' уже добавлены', true);
        }
      });
    }
  }
}

/* ============================================================
   Связанные объекты
   ============================================================ */

function renderSvFullRelated(st) {
  const wrap = $('#svFullRelated');
  if (!wrap) return;

  const ctx = typeof getBlockForLine === 'function' ? getBlockForLine(st.line) : null;

  const rows = [];
  if (ctx) {
    rows.push(['Цех', ctx.workshop.name]);
    rows.push(['Участок', ctx.area.name + (ctx.block ? ` (${ctx.block.name})` : '')]);
  }
  rows.push(['Линия', st.line]);
  rows.push(['Рабочий центр', st.nodePart]);
  rows.push(['Машина', st.machine]);
  rows.push(['Узел', st.node]);
  rows.push(['OPL №', st.oplNumber]);
  rows.push(['Автор', st.author]);
  rows.push(['Дата создания', formatDateTime(st.createdAt)]);
  rows.push(['Последнее обновление', formatDateTime(st.updatedAt)]);

  wrap.innerHTML = rows.map(([label, value]) => {
    const isEmpty = !value || !String(value).trim();
    return `
      <div class="sv-full-related-row">
        <span class="sv-full-related-label">${escapeHtml(label)}</span>
        <span class="sv-full-related-value ${isEmpty ? 'sv-empty' : ''}">
          ${isEmpty ? '—' : escapeHtml(value)}
        </span>
      </div>
    `;
  }).join('');
}

/* ============================================================
   Дополнительная информация (Применять к, Триггеры, Top Losses)
   ============================================================ */

function renderSvFullExtra(st, isEdit) {
  const wrap = $('#svFullExtra');
  if (!wrap) return;

  if (!isEdit) {
    // ===================== ПРОСМОТР =====================

    const appliesToLabels = {
      ChangeOver: 'Change Over',
      CL_TO: 'CL в ТО',
      CL_Conversion: 'CL в Конвертацию'
    };
    const appliesToChips = (Array.isArray(st.appliesTo) ? st.appliesTo : [])
      .map(v => {
        const cls = v === 'ChangeOver' ? 'et-type-changeover'
                  : v === 'CL_TO' ? 'et-type-clto'
                  : 'et-type-clconv';
        return `<span class="et-type-chip ${cls}">${escapeHtml(appliesToLabels[v] || v)}</span>`;
      }).join('');

    const triggerChips = (Array.isArray(st.triggers) ? st.triggers : [])
      .map(t => {
        const label = String(t).replace(/^node:/, '');
        return `<span class="sv-trigger-chip">${escapeHtml(label)}</span>`;
      }).join('');

    const lossChips = (Array.isArray(st.topLosses) ? st.topLosses : [])
      .map(id => {
        const l = typeof findLossById === 'function' ? findLossById(id) : null;
        return l ? `<span class="tl-summary-chip">${escapeHtml(l.name)}</span>` : '';
      }).filter(Boolean).join('');

    const block = (label, html) => `
      <div class="sv-full-extra-block">
        <div class="sv-full-extra-label">${escapeHtml(label)}</div>
        <div class="sv-full-extra-chips">
          ${html || '<span class="sv-full-extra-empty">Не задано</span>'}
        </div>
      </div>
    `;

    wrap.innerHTML = `
      ${block('Применять к', appliesToChips)}
      ${block('Триггеры Change Over', triggerChips)}
      ${block('Top Losses', lossChips)}
    `;
    return;
  }

  // ===================== РЕДАКТИРОВАНИЕ =====================

  const appliesToArr = Array.isArray(st.appliesTo) ? st.appliesTo : [];
  const triggersArr = Array.isArray(st.triggers) ? st.triggers : [];
  const topLossesArr = Array.isArray(st.topLosses) ? st.topLosses : [];

  // Применяемость — чекбоксы
  const appliesToHtml = `
    <div class="sv-edit-chips-group" id="svf_appliesToGroup">
      <label class="type-checkbox type-checkbox-changeover ${appliesToArr.includes('ChangeOver') ? 'checked' : ''}">
        <input type="checkbox" value="ChangeOver" ${appliesToArr.includes('ChangeOver') ? 'checked' : ''}>
        <span>Change Over</span>
      </label>
      <label class="type-checkbox type-checkbox-clto ${appliesToArr.includes('CL_TO') ? 'checked' : ''}">
        <input type="checkbox" value="CL_TO" ${appliesToArr.includes('CL_TO') ? 'checked' : ''}>
        <span>CL в ТО</span>
      </label>
      <label class="type-checkbox type-checkbox-clconv ${appliesToArr.includes('CL_Conversion') ? 'checked' : ''}">
        <input type="checkbox" value="CL_Conversion" ${appliesToArr.includes('CL_Conversion') ? 'checked' : ''}>
        <span>CL в Конвертацию</span>
      </label>
    </div>
  `;

  // Триггеры — соберём из пользовательских триггеров + узлов
  const customTriggers = getCustomTriggers().map(t => ({
    value: t.value,
    label: t.label,
    group: 'Пользовательские'
  }));
  const nodes = (typeof getNodes === 'function' ? getNodes() : []).map(n => ({
    value: 'node:' + n.name,
    label: n.name + ' [' + n.part + ']',
    group: 'Узлы'
  }));
  const allTriggers = [...customTriggers, ...nodes];

  let triggersHtml = '';
  let lastGroup = '';
  allTriggers.forEach(t => {
    if (t.group !== lastGroup) {
      if (lastGroup) triggersHtml += '</div>';
      triggersHtml += `<div class="sv-edit-trigger-group-title">${escapeHtml(t.group)}:</div><div class="sv-edit-trigger-group">`;
      lastGroup = t.group;
    }
    const checked = triggersArr.includes(t.value);
    triggersHtml += `
      <label class="trigger-checkbox ${checked ? 'checked' : ''}">
        <input type="checkbox" value="${escapeHtml(t.value)}" ${checked ? 'checked' : ''}>
        <span>${escapeHtml(t.label)}</span>
      </label>
    `;
  });
  if (lastGroup) triggersHtml += '</div>';

  // Top Losses — чипы + кнопка
  const lossChips = topLossesArr
    .map(id => {
      const l = typeof findLossById === 'function' ? findLossById(id) : null;
      if (!l) return '';
      return `
        <div class="sv-toploss-item" data-toploss-id="${escapeAttr(id)}" title="${escapeAttr(l.categoryName + ': ' + l.name)}">
          <span>${escapeHtml(l.name)}</span>
          <button type="button" class="sv-toploss-remove" data-remove-toploss="${escapeAttr(id)}" title="Убрать">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:10px;height:10px">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      `;
    })
    .filter(Boolean)
    .join('');

  wrap.innerHTML = `
    <div class="sv-full-extra-block">
      <div class="sv-full-extra-label">Применять к</div>
      <div class="sv-full-extra-chips">
        ${appliesToHtml}
      </div>
    </div>

    <div class="sv-full-extra-block">
      <div class="sv-full-extra-label">Триггеры Change Over</div>
      <div class="sv-full-extra-chips" id="svf_triggersGroup">
        ${triggersHtml || '<span class="sv-full-extra-empty">Нет доступных триггеров</span>'}
      </div>
    </div>

    <div class="sv-full-extra-block">
      <div class="sv-full-extra-label">Top Losses</div>
      <div class="sv-full-extra-chips" id="svf_topLossesSelected">
        ${lossChips || '<span class="sv-full-extra-empty">Потери не заданы</span>'}
      </div>
      <button type="button" class="btn btn-secondary btn-sm" id="svf_addTopLossBtn" style="margin-top:8px">
        + Добавить потерю
      </button>
    </div>
  `;

  // ==== Обработчики ====

  // Применяемость
  $$('#svf_appliesToGroup input').forEach(cb => {
    cb.addEventListener('change', (e) => {
      e.target.closest('label').classList.toggle('checked', e.target.checked);

      // Обновляем st.appliesTo в памяти
      const allChecked = [...$$('#svf_appliesToGroup input:checked')].map(x => x.value);
      st.appliesTo = allChecked;
    });
  });

  // Триггеры
  $$('#svf_triggersGroup input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', (e) => {
      e.target.closest('label').classList.toggle('checked', e.target.checked);

      // Обновляем st.triggers в памяти
      const allChecked = [...$$('#svf_triggersGroup input[type="checkbox"]:checked')].map(x => x.value);
      st.triggers = allChecked;
    });
  });

  // Top Losses — удаление
  wrap.querySelectorAll('[data-remove-toploss]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const id = btn.dataset.removeToploss;
      // Убираем из st напрямую (не из массива, а из объекта)
      const idx = st.topLosses.indexOf(id);
      if (idx !== -1) st.topLosses.splice(idx, 1);
      renderSvFullExtra(st, true);
    });
  });

  // Кнопка «+ Добавить потерю» — открываем модалку выбора
  const addLossBtn = $('#svf_addTopLossBtn');
  if (addLossBtn) {
    addLossBtn.addEventListener('click', () => {
      // Синхронизируем глобальный массив с текущим состоянием
      sfTopLossesSelected = [...st.topLosses];

      // ВАЖНО: выставляем контекст, чтобы applyTopLossPicker знал куда возвращать
      topLossPickerContext = 'sv-full';

      openTopLossPickerModal();
    });
  }
}

/* ============================================================
   Заглушки для таблиц вкладок
   ============================================================ */

function renderSvAckTable(st) {
  const wrap = $('#svAckTableWrap');
  if (!wrap) return;
  wrap.innerHTML = `
    <div class="sv-full-empty-table">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
      </svg>
      <div>Раздел «Ознакомление» в разработке</div>
    </div>
  `;
}

function renderSvHistoryTable(st) {
  const wrap = $('#svHistoryTableWrap');
  if (!wrap) return;
  wrap.innerHTML = `
    <div class="sv-full-empty-table">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <polyline points="12 6 12 12 16 14"/>
      </svg>
      <div>Раздел «История изменений» в разработке</div>
    </div>
  `;
}

function renderSvCommentsTable(st) {
  const wrap = $('#svCommentsTableWrap');
  if (!wrap) return;
  wrap.innerHTML = `
    <div class="sv-full-empty-table">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
      <div>Раздел «Комментарии» в разработке</div>
    </div>
  `;
}

/* ============================================================
   Переключение вкладок внутри просмотра
   ============================================================ */

function switchSvFullTab(tabName) {
  // Подсветка кнопок
  document.querySelectorAll('#svFullTabs .sv-full-tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.svTab === tabName);
  });

  // Показ/скрытие панелей
  const panes = {
    main: 'svPaneMain',
    ack: 'svPaneAck',
    history: 'svPaneHistory',
    comments: 'svPaneComments'
  };
  Object.entries(panes).forEach(([key, id]) => {
    const el = document.getElementById(id);
    if (el) el.style.display = (key === tabName) ? '' : 'none';
  });
}
window.switchSvFullTab = switchSvFullTab;

/* ============================================================
   Обработчики кнопок
   ============================================================ */

$('#svFullBackBtn')?.addEventListener('click', closeStandardFullView);

$('#svFullEditBtn')?.addEventListener('click', () => {
  if (!svFullState.standardId) return;

  const current = getStandards().find(s => s.id === svFullState.standardId);
  if (!current) return;

  svFullState.originalData = JSON.parse(JSON.stringify(current));
  svFullState.editingData = JSON.parse(JSON.stringify(current));   // НОВОЕ
  svFullState.mode = 'edit';
  renderStandardFullView();
});

$('#svFullCancelBtn')?.addEventListener('click', () => {
  if (!confirm('Отменить изменения?')) return;
  svFullState.mode = 'view';
  svFullState.editingData = null;
  renderStandardFullView();
});

$('#svFullViewToggleBtn')?.addEventListener('click', () => {
  svFullState.mode = 'view';
  renderStandardFullView();
});

/* Переключение вкладок */
$('#svFullTabs')?.addEventListener('click', (e) => {
  const btn = e.target.closest('.sv-full-tab-btn');
  if (!btn) return;
  switchSvFullTab(btn.dataset.svTab);
});

$('#svAckMarkBtn')?.addEventListener('click', () => {
  showToast('Функция «Ознакомление» в разработке', true);
});

$('#svAddCommentBtn')?.addEventListener('click', () => {
  showToast('Функция «Комментарии» в разработке', true);
});
/* ============================================================
   СОХРАНЕНИЕ СТАНДАРТА ИЗ ПОЛНОЭКРАННОГО ПРОСМОТРА
   ============================================================ */

$('#svFullSaveBtn')?.addEventListener('click', () => {
  const id = svFullState.standardId;
  if (!id) return;

  // Защита: если editingData нет — берём текущий стандарт как копию
  if (!svFullState.editingData) {
    const fallback = getStandards().find(s => s.id === id);
    if (!fallback) return;
    svFullState.editingData = JSON.parse(JSON.stringify(fallback));
  }

  const all = getStandards();
  const stOriginal = all.find(s => s.id === id);
  if (!stOriginal) return;

  // Работаем с копией
  const st = svFullState.editingData;
  // Считываем поля (если они есть — редактирование)
  const titleEl = $('#svf_title');
  const oplEl = $('#svf_oplNumber');
  const machineEl = $('#svf_machine');
  const nodeEl = $('#svf_node');
  const durationEl = $('#svf_durationSec');
  const toolEl = $('#svf_tool');
  const controlEl = $('#svf_controlType');
  const activeEl = $('#svf_active');
  const nodePartEl = $('#svf_nodePart');

  // Валидация
  const title = titleEl ? titleEl.value.trim() : st.title;
  const oplNumber = oplEl ? oplEl.value.trim() : st.oplNumber;
  const machine = machineEl ? machineEl.value.trim() : st.machine;
  const node = nodeEl ? nodeEl.value.trim() : st.node;

  if (!title)     return showToast('Укажите название', true);
  if (!oplNumber) return showToast('Укажите OPL №', true);
  if (!machine)   return showToast('Выберите машину', true);
  if (!node)      return showToast('Укажите узел', true);

  // Проверка дубликата OPL № на линии + машине (кроме текущего)
  const dup = all.find(s =>
    s.id !== id &&
    s.line === st.line &&
    s.machine === machine &&
    (s.oplNumber || '').toLowerCase() === oplNumber.toLowerCase()
  );
  if (dup) {
    return showToast(`OPL № "${oplNumber}" уже есть на машине ${machine}`, true);
  }

  // Часть линии — обязательна для SMD
  const workshopId = getWorkshopIdForLine(st.line);
  const nodePart = (workshopId === 'smd')
    ? (nodePartEl ? nodePartEl.value.trim() : st.nodePart)
    : '';
  if (workshopId === 'smd' && !nodePart) {
    return showToast('Выберите часть линии', true);
  }

  // Собираем обновлённый объект
  const updated = {
    ...st,
    title,
    oplNumber,
    machine,
    node,
    nodePart,
    durationSec: durationEl ? Math.max(0, parseInt(durationEl.value, 10) || 0) : st.durationSec,
    tool: toolEl ? toolEl.value.trim() : st.tool,
    controlType: migrateControlType(controlEl ? controlEl.value : st.controlType, st.measurements),
    active: activeEl ? activeEl.checked : st.active,
    updatedAt: new Date().toISOString()
  };

  // Сохраняем в массив
  const idx = all.findIndex(s => s.id === id);
  if (idx !== -1) all[idx] = updated;

  setStandards(all);

  // Обновляем UI
  if (typeof refreshEditorMechTable === 'function') refreshEditorMechTable();
  if (typeof refreshEditorElecTable === 'function') refreshEditorElecTable();
  if (typeof updatePartCounters === 'function') updatePartCounters();
  if (typeof fillEditorFilters === 'function') fillEditorFilters();

  // Возвращаемся в режим просмотра
  svFullState.mode = 'view';
  svFullState.originalData = JSON.parse(JSON.stringify(updated));
  renderStandardFullView();

  showToast('Стандарт обновлён');
});

init();
