/* ============================================================
   ВКЛАДКА «Стандарты CL»: каркас
   Линия, крошки, счётчики, фильтры, кнопки шапки.
   Модуль общего пространства имён: функции и переменные видны
   во всех файлах. Порядок подключения — index.html.
   ============================================================ */

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

/* --- Недавно открытые стандарты (все линии) --- */
const RECENT_STD_KEY = 'cl_recent_standards';
const RECENT_STD_MAX = 8;

/* id недавних стандартов, удалённые отбрасываются */
function getRecentStandards() {
  let arr = [];
  try { arr = JSON.parse(localStorage.getItem(RECENT_STD_KEY) || '[]'); } catch (e) { /* пусто */ }
  if (!Array.isArray(arr)) return [];
  const ids = new Set(getStandards().map(s => s.id));
  return arr.filter(id => ids.has(id)).slice(0, RECENT_STD_MAX);
}

function addRecentStandard(id) {
  if (!id) return;
  const next = [id, ...getRecentStandards().filter(x => x !== id)].slice(0, RECENT_STD_MAX);
  try { localStorage.setItem(RECENT_STD_KEY, JSON.stringify(next)); } catch (e) { /* нет доступа */ }
}

/* Строка «Недавно открытые» над таблицей механических стандартов */
function renderEditorRecentStd() {
  const box = $('#editorRecentStd');
  if (!box) return;
  const all = getStandards();
  const list = getRecentStandards().map(id => all.find(s => s.id === id)).filter(Boolean);
  box.hidden = !list.length;
  box.innerHTML = list.length ? `<span class="editor-recent-std-label">Недавно открытые</span>${list.map(s =>
    `<button type="button" class="editor-recent-std-chip" data-recent-std="${escapeAttr(s.id)}" title="${escapeAttr((s.line || '') + ' · ' + (s.title || ''))}">
      ${s.oplNumber ? `<b>${escapeHtml(s.oplNumber)}</b>` : ''}<span>${escapeHtml(s.title || '—')}</span><i>${escapeHtml(s.line || '')}</i></button>`).join('')}` : '';
}

$('#editorRecentStd')?.addEventListener('click', (e) => {
  const chip = e.target.closest('[data-recent-std]');
  if (chip) openStandardFullView(chip.dataset.recentStd);
});

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

  // Машина и узел другой линии не подходят — сбрасываем и пересобираем фильтры
  ['emFilterMachine', 'eeFilterMachine', 'emFilterNode'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  if (typeof fillEditorFilters === 'function') fillEditorFilters();

  // Обновляем UI
  updateEditorLineContext();
  updatePartCounters();

  // Перерисовка таблиц
  if (typeof refreshEditorMechTable === 'function') refreshEditorMechTable();
  if (typeof refreshEditorElecTable === 'function') refreshEditorElecTable();
  if (typeof refreshChangeLogView === 'function') refreshChangeLogView();

  closeLinePickerModal();
  showToast('Выбрана линия: ' + line);
}

/* ============================================================
   Обновление UI: чип + крошки + счётчики
   ============================================================ */

function updateEditorLineContext() {
  const line = localStorage.getItem('cl_editor_line') || '';

  ['em', 'ee', 'el'].forEach(prefix => {
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
      // Часть линии (Maker / Packer) есть только у SMD
      const isSmd = !!line && getWorkshopIdForLine(line) === 'smd';
      countersEl.style.display = isSmd ? 'inline-flex' : 'none';
      const partInput = $(`#${prefix}FilterPart`);
      if (!isSmd && partInput) partInput.value = '';
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

  // Счётчики «активных / всего» по части — у механики и у E-Param свои
  const count = (rows, part) => {
    const all = rows.filter(r => r.nodePart === part);
    return `${all.filter(r => r.active !== false).length}/${all.length}`;
  };
  const sources = {
    em: getStandards().filter(s => s.line === line),
    ee: getElectronicParamsForLine(line)
  };

  // Лист изменений: число записей по части
  const logRows = getChangeLogForLine(line, '');
  if ($('#elCounterMaker')) $('#elCounterMaker').textContent = logRows.filter(e => e.part === 'Maker').length;
  if ($('#elCounterPacker')) $('#elCounterPacker').textContent = logRows.filter(e => e.part === 'Packer').length;

  ['em', 'ee', 'el'].forEach(prefix => {
    const rows = sources[prefix] || [];
    const mk = $(`#${prefix}CounterMaker`);
    const pk = $(`#${prefix}CounterPacker`);
    if (prefix !== 'el') {
      if (mk) mk.textContent = count(rows, 'Maker');
      if (pk) pk.textContent = count(rows, 'Packer');
    }

    // Синхронизируем активное состояние переключателя с текущим фильтром
    const switchEl = $(`#${prefix}PartCounters`);
    const currentPart = ($(`#${prefix}FilterPart`)?.value) || '';
    if (switchEl) {
      switchEl.querySelectorAll('.editor-part-switch-btn').forEach(btn => {
        btn.classList.toggle('active', (btn.dataset.part || '') === currentPart);
      });
    }
  });
}

/* ============================================================
   Переключатель режима внутри панели
   ============================================================ */

function switchEditorModeInline(mode) {
  // Подсветка кнопок в обеих панелях
  if (!['mech', 'elec', 'log'].includes(mode)) mode = 'mech';
  document.querySelectorAll('#emModeSwitch .editor-mode-inline-btn, #eeModeSwitch .editor-mode-inline-btn, #elModeSwitch .editor-mode-inline-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === mode);
  });

  // Показ панелей (работает ВСЕГДА, даже без линии)
  const mechView = $('#editorMechView');
  const elecView = $('#editorElecView');
  const logView = $('#editorLogView');
  if (mechView) mechView.style.display = (mode === 'mech') ? 'block' : 'none';
  if (elecView) elecView.style.display = (mode === 'elec') ? 'block' : 'none';
  if (logView) logView.style.display = (mode === 'log') ? 'block' : 'none';

  try { localStorage.setItem('cl_editor_mode', mode); } catch (e) {}

  // Обновить UI (если линия есть — обновит, если нет — просто ничего)
  updateEditorLineContext();
  updatePartCounters();

  // Обновить таблицы
  if (mode === 'log') {
    if (typeof refreshChangeLogView === 'function') refreshChangeLogView();
  } else if (mode === 'elec') {
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
      if (prefix === 'el') {
        if (typeof refreshChangeLogView === 'function') refreshChangeLogView();
      } else if (prefix === 'em') {
        if (typeof refreshEditorMechTable === 'function') refreshEditorMechTable();
      } else {
        if (typeof refreshEditorElecTable === 'function') refreshEditorElecTable();
      }
    });
  });
}

bindPartSwitchHandlers('emPartCounters', 'em');
bindPartSwitchHandlers('eePartCounters', 'ee');
bindPartSwitchHandlers('elPartCounters', 'el');

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
   РЕДАКТОР: обновление сброса фильтров
   ============================================================ */

function resetMechFilters() {
  ['emFilterMachine', 'emFilterNode', 'emFilterType', 'emFilterSchedule',
   'emFilterPart', 'emFilterActive', 'emFilterValidation', 'emFilterSearch'
  ].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  editorTableState.mechPage = 1;
  editorTableState.mechSelected.clear();
  fillEditorFilters();
  refreshEditorMechTable();
  updatePartCounters();
}

function resetElecFilters() {
  ['eeFilterMachine', 'eeFilterControlType', 'eeFilterType', 'eeFilterSchedule',
   'eeFilterPart', 'eeFilterActive', 'eeFilterValidation', 'eeFilterSearch'
  ].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  editorTableState.elecPage = 1;
  editorTableState.elecSelected.clear();
  fillEditorFilters();
  refreshEditorElecTable();
  updatePartCounters();
}

/* ============================================================
   РЕДАКТОР: обработчики фильтров и поиска
   ============================================================ */

/* Фильтры мех-таблицы */
['emFilterNode', 'emFilterType', 'emFilterSchedule', 'emFilterActive', 'emFilterValidation'
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
['eeFilterControlType', 'eeFilterType', 'eeFilterSchedule', 'eeFilterActive', 'eeFilterValidation'
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

$('#editorMechAddBtn')?.addEventListener('click', () => openStandardCreatePage());

$('#editorElecAddBtn')?.addEventListener('click', () => openEparamPage(null));

/* --- Электронные параметры: Импорт --- */
$('#editorElecUploadBtn')?.addEventListener('click', () => {
  const line = localStorage.getItem('cl_editor_line');
  if (!line) return showToast('Сначала выберите линию', true);
  $('#editorElecUploadInput').click();
});

$('#editorElecUploadInput')?.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  e.target.value = '';
  if (!file) return;
  const line = localStorage.getItem('cl_editor_line');
  if (!line) return;
  try {
    const result = await parseElectronicParamsExcel(file, line);
    showImportReport(result, 'editorElecTableWrap');
    if (result.added > 0) {
      refreshEditorElecTable();
      if (typeof updatePartCounters === 'function') updatePartCounters();
      if (typeof fillEditorFilters === 'function') fillEditorFilters();
      showToast(`Добавлено параметров: ${result.added}`);
    } else {
      showToast('Новых параметров не найдено', true);
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
   РЕДАКТОР: заполнение фильтров
   ============================================================ */

function fillEditorFilters() {
  const line = localStorage.getItem('cl_editor_line') || '';
  const mech = line ? getStandards().filter(s => s.line === line) : [];
  const elec = line ? getElectronicParamsForLine(line) : [];

  /* --- Машины линии — чипы с количеством --- */
  renderEditorMachineChips('em', mech);
  renderEditorMachineChips('ee', elec);

  /* --- Узел — из стандартов линии --- */
  const sel = document.getElementById('emFilterNode');
  if (sel) {
    const cur = sel.value;
    const nodes = [...new Set(mech.map(s => s.node).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'ru'));
    sel.innerHTML = '<option value="">Узел: все</option>' +
      nodes.map(n => `<option value="${escapeAttr(n)}">${escapeHtml(n)}</option>`).join('');
    sel.value = nodes.includes(cur) ? cur : '';
  }
}

/* Чипы машин линии над таблицей; выбранная машина хранится в скрытом поле */
function renderEditorMachineChips(prefix, rows) {
  const box = document.getElementById(`${prefix}MachineChips`);
  const input = document.getElementById(`${prefix}FilterMachine`);
  if (!box || !input) return;
  const counts = {};
  rows.forEach(r => { if (r.machine) counts[r.machine] = (counts[r.machine] || 0) + 1; });
  // Машины без стандартов не показываем: фильтр по ним всегда пуст
  const machines = Object.keys(counts).sort((a, b) => a.localeCompare(b, 'ru', { numeric: true }));
  if (input.value && !machines.includes(input.value)) input.value = '';
  if (machines.length < 2) {
    box.innerHTML = '';
    return;
  }
  box.innerHTML = '<span class="et-flabel">Машина</span>' + machines.map(m => `
    <button type="button" class="et-fchip ${input.value === m ? 'on' : ''}" data-machine="${escapeAttr(m)}">
      ${escapeHtml(m)}<span class="et-fchip-n">${counts[m]}</span>
    </button>`).join('');
}

/* Клик по чипу машины — выбрать / снять */
['em', 'ee'].forEach(prefix => {
  document.getElementById(`${prefix}MachineChips`)?.addEventListener('click', (e) => {
    const chip = e.target.closest('[data-machine]');
    if (!chip) return;
    const input = document.getElementById(`${prefix}FilterMachine`);
    input.value = input.value === chip.dataset.machine ? '' : chip.dataset.machine;
    fillEditorFilters();
    if (prefix === 'em') {
      editorTableState.mechPage = 1;
      refreshEditorMechTable();
    } else {
      editorTableState.elecPage = 1;
      refreshEditorElecTable();
    }
  });
});

/* Меню «Excel»: импорт, шаблон, экспорт */
document.addEventListener('click', (e) => {
  const toggle = e.target.closest('.et-excel-toggle');
  document.querySelectorAll('.et-excel.open').forEach(m => {
    if (!toggle || !m.contains(toggle)) m.classList.remove('open');
  });
  if (toggle) toggle.closest('.et-excel').classList.toggle('open');
  else if (e.target.closest('.et-excel-item')) e.target.closest('.et-excel').classList.remove('open');
});

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

  const before = JSON.parse(JSON.stringify(st));
  st.active = willBeActive;
  st.updatedAt = new Date().toISOString();
  setStandards(all);
  const logId = logRowChange('mech', before, st);

  refreshEditorMechTable();
  if (typeof updatePartCounters === 'function') updatePartCounters();

  showToast(willBeActive ? 'Стандарт активирован' : 'Стандарт деактивирован');
  askChangeReason(logId);
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
  // Копия — новый стандарт: в расписание его добавляют отдельно
  copy.inSchedule = false;
  copy.validation = null;   // копия — новый стандарт, валидацию ставим заново
  copy.frequency = { type: 'weekly', schedule: [], shifts: ['day', 'night'], daysOfWeek: [], dates: [], timeWindows: [] };
  copy.createdAt = new Date().toISOString();
  copy.updatedAt = new Date().toISOString();

  all.push(copy);
  setStandards(all);
  addChangeLogEntry('mech', copy, 'added', `Новый стандарт (копия ${st.oplNumber || st.title})`);

  refreshEditorMechTable();
  if (typeof updatePartCounters === 'function') updatePartCounters();

  showToast('Стандарт скопирован');
  openStandardFullView(copy.id, 'edit');
}

/* ============================================================
   РЕДАКТОР: удаление стандарта
   ============================================================ */

function deleteStandardNew(id) {
  const st = getStandards().find(s => s.id === id);
  if (!st) return;
  if (!confirm(`Удалить стандарт "${st.oplNumber || st.title}"?`)) return;

  setStandards(getStandards().filter(s => s.id !== id));
  const logId = addChangeLogEntry('mech', st, 'removed', 'Стандарт удалён');

  refreshEditorMechTable();
  if (typeof updatePartCounters === 'function') updatePartCounters();
  if (typeof fillEditorFilters === 'function') fillEditorFilters();

  showToast('Стандарт удалён');
  askChangeReason(logId);
}

/* ============================================================
   РЕДАКТОР: обработчики шапки (мех. режим)
   ============================================================ */


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
