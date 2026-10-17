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
  // Копия — новый стандарт: в расписание его добавляют отдельно
  copy.inSchedule = false;
  copy.frequency = { type: 'weekly', schedule: [], shifts: ['day', 'night'], daysOfWeek: [], dates: [], timeWindows: [] };
  copy.createdAt = new Date().toISOString();
  copy.updatedAt = new Date().toISOString();

  all.push(copy);
  setStandards(all);

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

  refreshEditorMechTable();
  if (typeof updatePartCounters === 'function') updatePartCounters();
  if (typeof fillEditorFilters === 'function') fillEditorFilters();

  showToast('Стандарт удалён');
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
