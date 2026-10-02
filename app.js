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
  lineBrands: 'cl_lineBrands_v2',
  operators: 'cl_operators_v2',
  blocks: 'cl_blocks_v1',
  lineMachines: 'cl_lineMachines_v1',
  topLosses: 'cl_toplosses_v1',
  electronicShiftCfg: 'cl_electronic_shiftcfg_v1',
  electronicParams: 'cl_electronic_params_v1',
  electronicBrandSchedule: 'cl_electronic_brandschedule_v1'
};
/* ============================================================
   ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ
   ============================================================ */
const DEFAULT_LINES = ['SD01','SD03','SD06','SD08','SD12','SD25','SD27','SD31'];
const DEFAULT_SHIFTS = ['A','B','C','D'];
const DEFAULT_BRANDS = ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P'];

/* Блоки линий — по умолчанию два блока Cell2 */
const DEFAULT_BLOCKS = [
  { id: 'block_lst1', name: 'Cell2 (LST 1)', lines: ['SD06', 'SD12', 'SD27', 'SD31'] },
  { id: 'block_lst2', name: 'Cell2 (LST 2)', lines: ['SD01', 'SD03', 'SD08', 'SD25'] }
];

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
   ЭКРАН 1: БЛОКИ
   ============================================================ */
function renderEditorBlocksView() {
  const list = $('#editorBlocksList');
  if (!list) return;

  const blocks = getBlocks();
  if (!blocks.length) {
    list.innerHTML = '<div class="empty-state">Блоков нет. Добавьте их в Настройках.</div>';
    return;
  }

  const allStandards = getStandards();

  list.innerHTML = '<div class="blocks-grid">' + blocks.map(b => {
    const blockLines = (b.lines || []).filter(l => getLines().includes(l));
    const totalStandards = allStandards.filter(s => blockLines.includes(s.line)).length;
    const linesText = blockLines.length
      ? blockLines.map(escapeHtml).join(', ')
      : '<span style="color:var(--accent-red);font-style:italic">— нет линий</span>';

    return `
      <div class="block-tile" onclick="openEditorBlock('${b.id}')">
        <div class="block-tile-head">
          <span class="block-tile-name">${escapeHtml(b.name || 'Без названия')}</span>
        </div>
        <div class="block-tile-lines">${linesText}</div>
        <div class="block-tile-footer">
          <span class="block-tile-count">${totalStandards} ${pluralizeStandards(totalStandards)}</span>
          <button class="btn btn-primary btn-sm" onclick="event.stopPropagation();openEditorBlock('${b.id}')">
            Открыть →
          </button>
        </div>
      </div>
    `;
  }).join('') + '</div>';
}

/* Склонение: 1 стандарт / 2 стандарта / 5 стандартов */
function pluralizeStandards(n) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return 'стандарт';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return 'стандарта';
  return 'стандартов';
}

/* Открыть блок — показать список его линий */
window.openEditorBlock = function(blockId) {
  const blocks = getBlocks();
  const block = blocks.find(b => b.id === blockId);
  if (!block) return;

  // Скрываем экран блоков, показываем экран линий
  $('#editorBlocksView').style.display = 'none';
  $('#editorLinesView').style.display = 'block';
  $('#editorLineView').style.display = 'none';

  // Заголовок
  const title = $('#editorLinesTitle');
  if (title) title.textContent = block.name || 'Без названия';

  // Запоминаем текущий блок для возврата
  localStorage.setItem('cl_editor_block', blockId);

  renderEditorLinesView(blockId);
};

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
   РЕДАКТОР СТАНДАРТОВ — СПИСОК ЛИНИЙ
   ============================================================ */
function renderEditorLinesView(blockId) {
  const list = $('#editorLinesList');
  if (!list) return;

  // Если blockId не передан — берём из localStorage
  if (!blockId) {
    blockId = localStorage.getItem('cl_editor_block');
  }

  let lines = getLines();

  // Фильтруем по блоку
  if (blockId) {
    const blocks = getBlocks();
    const block = blocks.find(b => b.id === blockId);
    if (block && Array.isArray(block.lines)) {
      lines = lines.filter(l => block.lines.includes(l));
    } else {
      lines = [];
    }
  }

  if (!lines.length) {
    list.innerHTML = '<div class="empty-state">В этом блоке нет линий. Добавьте их в Настройках.</div>';
    return;
  }

  const allStandards = getStandards();

  list.innerHTML = lines.map(line => {
    const count = allStandards.filter(s => s.line === line).length;
    return `
      <div class="line-row" style="cursor:pointer" onclick="openEditorLine('${escapeHtml(line).replace(/'/g,"\\'")}')">
        <div class="line-name">${escapeHtml(line)}</div>
        <div class="line-brands-preview">
          <span class="line-counter" style="font-size:14px">${count} ${pluralizeStandards(count)}</span>
        </div>
        <button class="btn btn-primary btn-sm" onclick="event.stopPropagation();openEditorLine('${escapeHtml(line).replace(/'/g,"\\'")}')">
          Открыть →
        </button>
      </div>
    `;
  }).join('');
}
/* ============================================================
   РЕДАКТОР — ЭЛЕКТРОННЫЙ РЕЖИМ
   ============================================================ */

/* Текущее состояние электронного редактора */
let currentElectronicLine = null;   // выбранная линия
let currentElectronicMachine = null; // выбранная машина

/* Экран 1: список линий с электронными параметрами */
function renderElectronicView() {
  const container = $('#editorElectronicView');
  if (!container) return;

  currentElectronicLine = null;
  currentElectronicMachine = null;

  const allParams = getElectronicParams().map(normalizeElectronicParam);
  const lines = getLines();

  // Для каждой линии — сколько параметров
  const linesWithCount = lines.map(line => {
    const count = allParams.filter(p => p.line === line).length;
    return { line, count };
  });

  // Показываем только те линии, где есть хотя бы один параметр?
  // Нет — показываем все, чтобы технолог мог добавить первый.
  // Но сортируем: сначала те, где параметров больше.

  container.innerHTML = `
      <div class="blocks-grid">
        ${linesWithCount.map(({line, count}) => {
          const scheduleCount = getElectronicBrandScheduleForLine(line).length;
          const scheduleText = scheduleCount === 0
            ? '<span style="color:var(--accent-amber);font-style:italic">— расписание не задано</span>'
            : `${scheduleCount} ${pluralizeDays(scheduleCount)} в расписании`;
          return `
            <div class="block-tile" onclick="openElectronicLine('${escapeHtml(line).replace(/'/g,"\\'")}')">
              <div class="block-tile-head">
                <span class="block-tile-name">${escapeHtml(line)}</span>
              </div>
              <div class="block-tile-lines">
                ${count === 0
                  ? '<span style="color:var(--text-dim);font-style:italic">— нет параметров</span>'
                  : `${count} ${pluralizeParams(count)}`}
              </div>
              <div class="block-tile-lines" style="min-height:auto">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:12px;height:12px;vertical-align:-2px;margin-right:4px">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/>
                  <line x1="8" y1="2" x2="8" y2="6"/>
                  <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
                ${scheduleText}
              </div>
              <div class="block-tile-footer" style="flex-wrap:wrap;gap:6px">
                <span class="block-tile-count">${count > 0 ? count : ''}</span>
                <button class="btn btn-secondary btn-sm" onclick="event.stopPropagation();openElectronicBrandSchedule('${escapeHtml(line).replace(/'/g,"\\'")}')" title="Расписание брендов">
                  📅 Расписание
                </button>
                <button class="btn btn-primary btn-sm" onclick="event.stopPropagation();openElectronicLine('${escapeHtml(line).replace(/'/g,"\\'")}')">
                  Открыть →
                </button>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

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

/* Экран 2: список машин на линии + список параметров */
window.openElectronicLine = function(line) {
  const container = $('#editorElectronicView');
  if (!container) return;

  currentElectronicLine = line;

  const params = getElectronicParamsForLine(line);
  const machines = getMachinesForLine(line);

  // Машины, у которых есть параметры, + все остальные из справочника
  const machinesSet = new Set(machines);
  params.forEach(p => machinesSet.add(p.machine));
  const allMachines = [...machinesSet].filter(Boolean).sort((a, b) => a.localeCompare(b, 'ru'));

  // Счётчики
  const machinesWithCount = allMachines.map(m => ({
    machine: m,
    count: params.filter(p => p.machine === m).length
  }));

  container.innerHTML = `
    <div class="card">
      <div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap;margin-bottom:14px">
        <button class="btn btn-secondary" id="elecBackBtn">← К линиям</button>
        <h2 style="margin:0;border:none;padding:0;flex:1;min-width:150px">${escapeHtml(line)} — электронные параметры</h2>
        <button class="btn btn-primary btn-icon-text" id="elecAddParamBtn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          <span>Добавить параметр</span>
        </button>
      </div>

      ${allMachines.length === 0
        ? '<div class="empty-state">На этой линии нет машин. Добавьте их в Настройках → «Машины для линий».</div>'
        : `
          <div class="elec-machines-grid">
            ${machinesWithCount.map(({machine, count}) => `
              <div class="elec-machine-tile" onclick="openElectronicMachine('${escapeHtml(machine).replace(/'/g,"\\'")}')">
                <div class="elec-machine-tile-name">${escapeHtml(machine)}</div>
                <div class="elec-machine-tile-count">
                  ${count === 0
                    ? '— нет параметров'
                    : `${count} ${pluralizeParams(count)}`}
                </div>
              </div>
            `).join('')}
          </div>
        `}
    </div>
  `;

  $('#elecBackBtn')?.addEventListener('click', () => {
    renderElectronicView();
  });

  $('#elecAddParamBtn')?.addEventListener('click', () => {
    // Открываем форму для первой машины из списка
    if (!allMachines.length) {
      return showToast('Сначала добавьте машину для линии', true);
    }
    currentElectronicMachine = allMachines[0];
    openElectronicParamForm(null);
  });
};

/* Экран 3: список параметров на выбранной машине */
window.openElectronicMachine = function(machine) {
  const container = $('#editorElectronicView');
  if (!container || !currentElectronicLine) return;

  currentElectronicMachine = machine;

  const params = getElectronicParamsForMachine(currentElectronicLine, machine);

  container.innerHTML = `
    <div class="card">
      <div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap;margin-bottom:14px">
        <button class="btn btn-secondary" id="elecBackToLineBtn">← К машинам</button>
        <h2 style="margin:0;border:none;padding:0;flex:1;min-width:200px">
          ${escapeHtml(currentElectronicLine)} · ${escapeHtml(machine)}
        </h2>
        <button class="btn btn-primary btn-icon-text" id="elecAddParamBtn2">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          <span>Добавить параметр</span>
        </button>
      </div>

      ${params.length === 0
        ? '<div class="empty-state">На этой машине пока нет параметров. Нажмите «Добавить параметр».</div>'
        : params.map(p => renderElectronicParamRow(p)).join('')}
    </div>
  `;

  $('#elecBackToLineBtn')?.addEventListener('click', () => {
    openElectronicLine(currentElectronicLine);
  });

  $('#elecAddParamBtn2')?.addEventListener('click', () => {
    openElectronicParamForm(null);
  });

  // Обработчики на кнопки параметров (edit / delete / toggle)
  container.querySelectorAll('[data-elec-edit]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      openElectronicParamForm(btn.dataset.elecEdit);
    });
  });
  container.querySelectorAll('[data-elec-delete]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteElectronicParam(btn.dataset.elecDelete);
    });
  });
  container.querySelectorAll('[data-elec-toggle]').forEach(cb => {
    cb.addEventListener('change', (e) => {
      e.stopPropagation();
      toggleElectronicParamActive(cb.dataset.elecToggle, cb.checked);
    });
  });
};

/* Отрисовка одной строки параметра */
function renderElectronicParamRow(p) {
  const freqLabels = {
    daily:    'Каждый день',
    weekly:   'По дням недели',
    once:     'Разовые даты'
  };

  const workClass = p.work === 'Run' ? 'work-run' : 'work-stop';

  // Описание нормы
  let normInfo;
  if (p.controlType === 'ok_not_ok') {
    normInfo = p.normText ? escapeHtml(p.normText) : '<span style="color:var(--text-dim)">— без нормы</span>';
  } else {
    const brandsCount = (p.valuesByBrand || []).filter(v =>
      v.target !== '' && v.target != null && v.tolerance !== '' && v.tolerance != null
    ).length;
    normInfo = brandsCount > 0
      ? `${brandsCount} ${brandsCount === 1 ? 'бренд' : 'бренда'}`
      : '<span style="color:var(--text-dim)">— нет норм</span>';
  }

  const isActive = p.active !== false;

  return `
    <div class="elec-param-row ${isActive ? '' : 'inactive'}">
      <div class="std-active-cell" style="flex-shrink:0">
        <input type="checkbox" class="std-active-cb" ${isActive ? 'checked' : ''}
               data-elec-toggle="${escapeAttr(p.id)}" title="Активен">
      </div>
      <div class="elec-param-row-info">
        <div class="elec-param-row-name">${escapeHtml(p.paramName || '—')}</div>
        <div class="elec-param-row-meta">
          <span><strong>Тип:</strong> ${p.controlType === 'ok_not_ok' ? 'ОК/Не ОК' : 'Числовой'}</span>
          <span><strong>Норма:</strong> ${normInfo}</span>
          <span><strong>Работа:</strong> ${p.work}</span>
          ${p.timeFrom ? `<span><strong>Время:</strong> ${escapeHtml(p.timeFrom)}–${escapeHtml(p.timeTo || '')}</span>` : ''}
          <span><strong>Периодичность:</strong> ${freqLabels[p.frequency?.type] || '—'}</span>
        </div>
      </div>
      <div class="elec-param-row-actions">
        <button class="btn btn-secondary btn-sm btn-icon" data-elec-edit="${escapeAttr(p.id)}" title="Изменить">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </button>
        <button class="btn btn-danger btn-sm btn-icon" data-elec-delete="${escapeAttr(p.id)}" title="Удалить">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
            <path d="M10 11v6"/><path d="M14 11v6"/>
            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
          </svg>
        </button>
      </div>
    </div>
  `;
}

/* Удаление параметра */
function deleteElectronicParam(id) {
  const p = getElectronicParams().find(x => x.id === id);
  if (!p) return;
  if (!confirm(`Удалить параметр "${p.paramName}"?`)) return;

  setElectronicParams(getElectronicParams().filter(x => x.id !== id));
  if (currentElectronicMachine) {
    openElectronicMachine(currentElectronicMachine);
  } else {
    renderElectronicView();
  }
  showToast('Параметр удалён');
}

/* Переключение активности */
function toggleElectronicParamActive(id, isActive) {
  const all = getElectronicParams();
  const p = all.find(x => x.id === id);
  if (!p) return;
  p.active = !!isActive;
  p.updatedAt = new Date().toISOString();
  setElectronicParams(all);
  openElectronicMachine(currentElectronicMachine);
  showToast(isActive ? 'Параметр активирован' : 'Параметр деактивирован');
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
      controlType: 'value_input',
      normText: '',
      valuesByBrand: [],
      frequency: { type: 'daily', shifts: ['A','B','C','D'], daysOfWeek: [], dates: [] }
    };
    title.textContent = 'Добавить электронный параметр — ' + currentElectronicMachine;
  }

  // Основные
  $('#ep_id').value = id || '';
  $('#ep_line').value = currentElectronicLine;

  // Машина — выпадающий список
  fillElectronicMachineSelect(currentElectronicLine, p.machine);
  $('#ep_paramName').value = p.paramName || '';
  $('#ep_timeFrom').value = p.timeFrom || '09:10';
  $('#ep_timeTo').value = p.timeTo || '10:00';

  // Работа — чипы
  $('#ep_workChips').querySelectorAll('.elec-work-chip').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.work === p.work);
  });

  // Тип контроля
  $('#ep_controlType').value = p.controlType;
  $('#ep_controlTypeSelector').querySelectorAll('.type-option').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.value === p.controlType);
  });
  updateElectronicFormVisibility();

  // Текстовая норма
  $('#ep_normText').value = p.normText || '';

  // Таблица брендов
  renderElectronicBrandsTable(p.valuesByBrand || []);

  // Периодичность
  $('#ep_freqType').value = p.frequency.type;
  renderFreqShiftsCheckboxes('ep_freqDailyShifts',  p.frequency.shifts || ['A','B','C','D']);
  renderFreqShiftsCheckboxes('ep_freqWeeklyShifts', p.frequency.shifts || ['A','B','C','D']);
  renderFreqShiftsCheckboxes('ep_freqOnceShifts',   p.frequency.shifts || ['A','B','C','D']);
  renderFreqDaysCheckboxes('ep_freqWeeklyDays',     p.frequency.daysOfWeek || []);
  $('#ep_freqOnceDates').value = (p.frequency.dates || []).join(', ');

  updateFreqBlocksVisibility();

  modal.classList.add('active');
}
window.openElectronicParamForm = openElectronicParamForm;

function closeElectronicParamForm() {
  const modal = $('#electronicParamModal');
  if (modal) modal.classList.remove('active');
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

/* Показать/скрыть блоки в зависимости от controlType */
function updateElectronicFormVisibility() {
  const ct = $('#ep_controlType').value;
  $('#ep_normTextBlock').style.display = (ct === 'ok_not_ok') ? 'block' : 'none';
  $('#ep_brandsBlock').style.display    = (ct === 'value_input') ? 'block' : 'none';
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

/* Открыть линию */
window.openEditorLine = function(line) {
  currentEditorLine = line;
  localStorage.setItem('cl_editor_line', line);

  $('#editorBlocksView').style.display = 'none';
  $('#editorLinesView').style.display = 'none';
  $('#editorLineView').style.display = 'block';
  $('#editorLineTitle').textContent = line;

  // Хлебные крошки
  renderEditorBreadcrumbs(line);

  // Сброс фильтров
  const search = $('#editorSearch');
  if (search) search.value = '';
  const ft = $('#editorFilterType');
  if (ft) ft.value = '';
  const fp = $('#editorFilterPart');
  if (fp) fp.value = '';
  const fm = $('#editorFilterMachine');
  if (fm) fm.value = '';
  const fn = $('#editorFilterNode');
  if (fn) fn.value = '';
  const fa = $('#editorFilterActive');   
  if (fa) fa.value = '';

  currentPage = 1;   

  // Заполняем фильтр машин (из настроек линии)
  fillEditorMachineFilter(line);

  // Заполняем фильтр узлов (из стандартов линии)
  fillEditorNodeFilter(line);

  renderEditorStandardsList();
};

/* Заполнить фильтр «Машина» */
function fillEditorMachineFilter(line) {
  const select = $('#editorFilterMachine');
  if (!select) return;

  const machines = typeof getMachinesForLine === 'function'
    ? getMachinesForLine(line)
    : [];

  select.innerHTML = '<option value="">Все машины</option>' +
    machines.map(m => `<option value="${escapeHtml(m)}">${escapeHtml(m)}</option>`).join('');
}

/* Заполнить фильтр «Узел» */
function fillEditorNodeFilter(line) {
  const select = $('#editorFilterNode');
  if (!select) return;

  const all = getStandards().filter(s => s.line === line);
  const nodes = [...new Set(all.map(s => s.node).filter(Boolean))];
  nodes.sort((a, b) => a.localeCompare(b, 'ru'));

  select.innerHTML = '<option value="">Все узлы</option>' +
    nodes.map(n => `<option value="${escapeHtml(n)}">${escapeHtml(n)}</option>`).join('');
}

/* Хлебные крошки */
function renderEditorBreadcrumbs(line) {
  const container = $('#editorBreadcrumbs');
  if (!container) return;

  const blockId = localStorage.getItem('cl_editor_block');
  const blocks = getBlocks();
  const block = blocks.find(b => b.id === blockId);

  const iconBox = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>';
  const iconFactory = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 20h20"/><path d="M4 20V8l6-4v16"/><path d="M14 20V4l6 4v12"/><line x1="8" y1="10" x2="8" y2="10"/><line x1="8" y1="14" x2="8" y2="14"/><line x1="8" y1="18" x2="8" y2="18"/><line x1="18" y1="10" x2="18" y2="10"/><line x1="18" y1="14" x2="18" y2="14"/><line x1="18" y1="18" x2="18" y2="18"/></svg>';
  const iconList = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>';

  let html = '';

  if (block) {
    html += `<a href="#" class="breadcrumb-link" onclick="event.preventDefault();backToBlock();">${iconBox} ${escapeHtml(block.name || 'Без названия')}</a>`;
    html += '<span class="breadcrumb-sep">›</span>';
  }

  html += `<a href="#" class="breadcrumb-link" onclick="event.preventDefault();backToLines();">${iconFactory} ${escapeHtml(line)}</a>`;
  html += '<span class="breadcrumb-sep">›</span>';
  html += `<span class="breadcrumb-current">${iconList} Стандарты</span>`;

  container.innerHTML = html;
}

/* Клик по «📦 Cell2 (LST 1)» в крошках — к списку линий блока */
window.backToBlock = function() {
  localStorage.removeItem('cl_editor_line');
  let currentEditorLine = null;

  $('#editorLineView').style.display = 'none';
  $('#editorLinesView').style.display = 'block';
  $('#editorBlocksView').style.display = 'none';

  const blockId = localStorage.getItem('cl_editor_block');
  const blocks = getBlocks();
  const block = blocks.find(b => b.id === blockId);
  if (block) {
    $('#editorLinesTitle').textContent = block.name || 'Без названия';
  }
  renderEditorLinesView(blockId);
};

/* Клик по «🏭 SD01» в крошках — оставляет на линии, но убирает «назад» */
window.backToLines = function() {
  // То же, что и «← Назад к линиям» — но без сброса линии в localStorage
  // (пользователь вернулся, но может открыть снова)
  backToBlock();
};

/* ============================================================
   СПИСОК СТАНДАРТОВ — таблица + пагинация + сортировка
   ============================================================ */
let sortField = 'oplNumber';   // 'number' | 'oplNumber' | 'title' | 'machine' | 'node'
let sortDir = 'asc';           // 'asc' | 'desc'
let currentPage = 1;   // текущая страница пагинации
let pageSize = 10;     // размер страницы
/* Пагинация истории — отдельные переменные, чтобы не конфликтовать с редактором */
let historyPage = 1;
let historyPageSize = 10;

function getFilteredStandardsForLine() {
  if (!currentEditorLine) return [];

  const all = getStandards().filter(s => s.line === currentEditorLine);
  const search = ($('#editorSearch')?.value || '').trim().toLowerCase();
  const filterType = $('#editorFilterType')?.value || '';
  const filterPart = $('#editorFilterPart')?.value || '';
  const filterMachine = $('#editorFilterMachine')?.value || '';
  const filterNode = $('#editorFilterNode')?.value || '';
  const filterActive = $('#editorFilterActive')?.value || '';

  let filtered = all;

  if (search) {
    filtered = filtered.filter(s =>
      String(s.number || '').toLowerCase().includes(search) ||
      String(s.oplNumber || '').toLowerCase().includes(search) ||
      String(s.title || '').toLowerCase().includes(search) ||
      String(s.node || '').toLowerCase().includes(search) ||
      String(s.machine || '').toLowerCase().includes(search)
    );
  }

  if (filterType) {
    if (filterType === '__none') {
      filtered = filtered.filter(s => !s.appliesTo || s.appliesTo.length === 0);
    } else {
      filtered = filtered.filter(s => s.appliesTo && s.appliesTo.includes(filterType));
    }
  }

  if (filterPart) {
    filtered = filtered.filter(s => s.nodePart === filterPart);
  }

  if (filterMachine) {
    filtered = filtered.filter(s => s.machine === filterMachine);
  }

  if (filterNode) {
    filtered = filtered.filter(s => s.node === filterNode);
  }

  if (filterActive === 'active') {
    filtered = filtered.filter(s => s.active !== false);
  } else if (filterActive === 'inactive') {
    filtered = filtered.filter(s => s.active === false);
  }

  // Сортировка
  filtered.sort((a, b) => {
    let cmp = 0;

    if (sortField === 'number') {
      const va = Number(a.number) || 999999;
      const vb = Number(b.number) || 999999;
      cmp = va - vb;
    } else if (sortField === 'oplNumber') {
      // OPL: сначала по машине, потом по номеру OPL
      const ma = String(a.machine || '').toLowerCase();
      const mb = String(b.machine || '').toLowerCase();
      cmp = ma.localeCompare(mb, 'ru');
      if (cmp === 0) {
        const oa = String(a.oplNumber || '').toLowerCase();
        const ob = String(b.oplNumber || '').toLowerCase();
        cmp = oa.localeCompare(ob, 'ru');
      }
    } else {
      const va = String(a[sortField] || '').toLowerCase();
      const vb = String(b[sortField] || '').toLowerCase();
      cmp = va.localeCompare(vb, 'ru');
    }

    return sortDir === 'asc' ? cmp : -cmp;
  });

  return { filtered, total: all.length };
}

/* ============================================================
   СПИСОК СТАНДАРТОВ — таблица + пагинация + сортировка
   ============================================================ */

/**
 * Иконка сортировки для заголовка колонки.
 * @param {string} field — ключ колонки
 * @returns {string} HTML-строка
 */
function getSortIcon(field) {
  if (sortField !== field) return '<span class="sort-idle">↕</span>';
  return sortDir === 'asc' ? '↑' : '↓';
}

function renderEditorStandardsList() {
  const list = $('#editorStandardsList');
  if (!list || !currentEditorLine) return;

  const result = getFilteredStandardsForLine();
  const filtered = result.filtered;
  const total = result.total;

  // Счётчик в тулбаре
  const counter = $('#editorLineCounter');
  if (counter) counter.textContent = `${filtered.length} из ${total}`;

  // Пустые состояния
  if (!total) {
    list.innerHTML = '<div class="empty-state">Стандартов пока нет. Нажмите «➕ Добавить стандарт».</div>';
    $('#editorPagination').innerHTML = '';
    return;
  }
  if (!filtered.length) {
    list.innerHTML = '<div class="empty-state">Ничего не найдено</div>';
    $('#editorPagination').innerHTML = '';
    return;
  }

  // Пагинация — корректируем currentPage, если вышли за пределы
  const totalPages = Math.ceil(filtered.length / pageSize);
  if (currentPage > totalPages) currentPage = totalPages;
  if (currentPage < 1) currentPage = 1;

  const startIdx = (currentPage - 1) * pageSize;
  const endIdx = Math.min(startIdx + pageSize, filtered.length);
  const pageItems = filtered.slice(startIdx, endIdx);

// Шапка таблицы
let html = `
  <table class="standards-table">
    <thead>
      <tr>
        <th title="Активен / Неактивен">☐</th>
        <th data-sort="number">№ ${getSortIcon('number')}</th>
        <th data-sort="oplNumber">№ OPL ${getSortIcon('oplNumber')}</th>
        <th data-sort="machine">Машина ${getSortIcon('machine')}</th>
        <th data-sort="node">Узел ${getSortIcon('node')}</th>
        <th data-sort="title">Название ${getSortIcon('title')}</th>
        <th>Подходит под смену сорта</th>
        <th>Действия</th>
      </tr>
    </thead>
    <tbody>
`;

  // Тело таблицы
  html += pageItems.map(st => {
    const typesHtml = (st.appliesTo && st.appliesTo.length)
      ? st.appliesTo.map(t =>
          `<span class="type-chip type-chip-${t.toLowerCase()} type-chip-xs">${escapeHtml(t)}</span>`
        ).join('')
      : '<span class="type-chip-empty">без привязки</span>';

    const isActive = st.active !== false;
    const rowClass = isActive ? '' : 'standard-inactive';
    const numText = st.number ? escapeHtml(String(st.number)) : '—';
    const oplText = escapeHtml(st.oplNumber || '—');
    const machineText = escapeHtml(st.machine || '—');
    const titleText = escapeHtml(st.title || '—');
    const nodeText = escapeHtml(st.node || '—');
    const partText = st.nodePart
      ? `<div class="standard-part">${escapeHtml(st.nodePart)}</div>`
      : '';

    // --- НОВОЕ: бейдж с количеством фото ---
    const photoCount = Array.isArray(st.photos) ? st.photos.length : 0;
    const photoBadge = photoCount > 0
      ? `<span class="photo-badge" title="${photoCount} ${photoCount === 1 ? 'фото' : 'фото'}">
           <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
             <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
             <circle cx="8.5" cy="8.5" r="1.5"/>
             <polyline points="21 15 16 10 5 21"/>
           </svg>
           <span>${photoCount}</span>
         </span>`
      : '';
    // --- НОВОЕ: иконка комментария к деактивации ---
    const isDeactivated = st.active === false;
    const hasComment = st.deactivationComment && st.deactivationComment.trim().length > 0;

    // Кнопка-иконка: активна только у деактивированных
    const commentBtnClass = isDeactivated
      ? (hasComment ? 'std-comment-btn has-comment' : 'std-comment-btn')
      : 'std-comment-btn inactive';

    // Tooltip: с текстом комментария, если он есть
    let commentBtnTitle;
    if (hasComment) {
      const preview = st.deactivationComment.length > 80
        ? st.deactivationComment.slice(0, 80).trim() + '…'
        : st.deactivationComment.trim();
      commentBtnTitle = `Комментарий: «${preview}» — нажмите, чтобы открыть`;
    } else {
      commentBtnTitle = 'Добавить комментарий к деактивации';
    }

    // Кнопка комментария — только для деактивированных
    const commentBtn = isDeactivated ? `
      <button class="${commentBtnClass}"
              type="button"
              data-deactivation-comment="${st.id}"
              title="${escapeAttr(commentBtnTitle)}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
      </button>
    ` : '';
return `
  <tr class="${rowClass}" data-std-id="${st.id}">
    <td class="td-active">
      <div class="std-active-cell">
        <input type="checkbox" class="std-active-cb" ${isActive ? 'checked' : ''}
               onchange="toggleStandardActive('${st.id}', this.checked)">
        ${commentBtn}
      </div>
    </td>
    <td>${numText}</td>
    <td class="td-opl" onclick="openStandardForm('${st.id}')">${oplText}</td>
    <td>${machineText}</td>
    <td class="td-node">${nodeText}</td>
    <td class="td-title" onclick="openStandardForm('${st.id}')">
      <div class="standard-title">
        <span class="standard-title-text">${titleText}</span>
        ${photoBadge}
      </div>
      ${partText}
    </td>
    <td>${typesHtml}</td>
    <td class="td-actions">
      <button class="btn btn-secondary btn-sm btn-icon" onclick="event.stopPropagation();openStandardForm('${st.id}')" title="Изменить">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
        </svg>
      </button>
      <button class="btn btn-secondary btn-sm btn-icon" onclick="event.stopPropagation();copyStandardNew('${st.id}')" title="Копировать">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
        </svg>
      </button>
      <button class="btn btn-danger btn-sm btn-icon" onclick="event.stopPropagation();deleteStandardNew('${st.id}')" title="Удалить">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="3 6 5 6 21 6"/>
          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
          <path d="M10 11v6"/>
          <path d="M14 11v6"/>
          <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
        </svg>
      </button>
    </td>
  </tr>
`;
  }).join('');

  html += '</tbody></table>';
  list.innerHTML = html;
  // --- Делегирование клика по иконке комментария к деактивации ---
  list.querySelectorAll('[data-deactivation-comment]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const stdId = btn.dataset.deactivationComment;
      if (stdId) openDeactivationCommentModal(stdId);
    });
  });
  // Делегирование клика по сортировке — один обработчик на всю таблицу
  list.querySelector('thead')?.addEventListener('click', (e) => {
    const th = e.target.closest('th[data-sort]');
    if (!th) return;
    const field = th.dataset.sort;
    if (sortField === field) {
      sortDir = sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      sortField = field;
      sortDir = 'asc';
    }
    currentPage = 1;
    renderEditorStandardsList();
  });

  // Пагинация
  renderPagination(filtered.length, totalPages, startIdx, endIdx);
}

function renderPagination(totalItems, totalPages, startIdx, endIdx) {
  const bar = $('#editorPagination');
  if (!bar) return;

  if (totalPages <= 1 && totalItems <= 10) {
    bar.innerHTML = `<span class="pagination-info">Показано ${startIdx + 1}–${endIdx} из ${totalItems}</span>`;
    return;
  }

  let html = `<span class="pagination-info">Показано ${startIdx + 1}–${endIdx} из ${totalItems}</span>`;
  html += '<div class="pagination-controls">';

  // Назад
  html += `<button class="pagination-btn" ${currentPage === 1 ? 'disabled' : ''}
           onclick="changePage(${currentPage - 1})">←</button>`;

  // Страницы (сокращённо — показываем 5 вокруг текущей)
  const pages = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || Math.abs(i - currentPage) <= 2) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== '...') {
      pages.push('...');
    }
  }
  pages.forEach(p => {
    if (p === '...') {
      html += `<span class="pagination-dots">…</span>`;
    } else {
      html += `<button class="pagination-btn ${p === currentPage ? 'active' : ''}"
               onclick="changePage(${p})">${p}</button>`;
    }
  });

  // Вперёд
  html += `<button class="pagination-btn" ${currentPage === totalPages ? 'disabled' : ''}
           onclick="changePage(${currentPage + 1})">→</button>`;

  // Селектор размера страницы
  html += `
    <select class="pagination-size" onchange="changePageSize(this.value)">
      <option value="10" ${pageSize === 10 ? 'selected' : ''}>10</option>
      <option value="20" ${pageSize === 20 ? 'selected' : ''}>20</option>
      <option value="50" ${pageSize === 50 ? 'selected' : ''}>50</option>
    </select>
  `;

  html += '</div>';
  bar.innerHTML = html;
}

window.changePage = function(page) {
  currentPage = page;
  renderEditorStandardsList();
};

window.changePageSize = function(size) {
  pageSize = parseInt(size, 10);
  currentPage = 1;
  renderEditorStandardsList();
};

/* Переключение активности стандарта */
window.toggleStandardActive = function(id, isActive) {
  const all = getStandards();
  const st = all.find(s => s.id === id);
  if (!st) return;

  const wasActive = st.active !== false;
  const willBeActive = !!isActive;

  // --- При активации: архивируем комментарий, если он есть ---
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
  setStandards(all);
  renderEditorStandardsList();
  renderEditorLinesView(localStorage.getItem('cl_editor_block'));

  if (willBeActive) {
    showToast('Стандарт активирован');
  } else {
    showToast('Стандарт деактивирован');
  }
};
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

  modal.classList.add('active');
  setTimeout(() => {
    const ta = $('#deactivationCommentText');
    if (ta) ta.focus();
  }, 100);
};

function closeDeactivationCommentModal() {
  const modal = $('#deactivationCommentModal');
  if (modal) modal.classList.remove('active');
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

  renderEditorStandardsList();
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

  renderEditorStandardsList();
  closeDeactivationCommentModal();
  showToast('Комментарий удалён');
});
/* Обработчики поиска/фильтров — со сбросом пагинации */
const resetPageAndRender = () => {
  currentPage = 1;
  renderEditorStandardsList();
};

$('#editorSearch')?.addEventListener('input', resetPageAndRender);
$('#editorFilterType')?.addEventListener('change', resetPageAndRender);
$('#editorFilterPart')?.addEventListener('change', resetPageAndRender);
$('#editorFilterMachine')?.addEventListener('change', resetPageAndRender);
$('#editorFilterNode')?.addEventListener('change', resetPageAndRender);
$('#editorFilterActive')?.addEventListener('change', resetPageAndRender);

/* --- Копирование стандарта --- */
window.copyStandardNew = function(id) {
  const st = getStandards().find(s => s.id === id);
  if (!st) return;
  const copy = JSON.parse(JSON.stringify(st));
  copy.id = uid();
  copy.oplNumber = (st.oplNumber || '') + '-copy';
  copy.number = '';
  const all = getStandards();
  all.push(copy);
  setStandards(all);
  renderEditorStandardsList();
  showToast('Стандарт скопирован');
  // Открыть форму редактирования копии
  if (typeof openStandardForm === 'function') {
    openStandardForm(copy.id);
  }
};

/* --- Удаление стандарта --- */
window.deleteStandardNew = function(id) {
  const st = getStandards().find(s => s.id === id);
  if (!st) return;
  if (!confirm(`Удалить стандарт "${st.oplNumber || st.title}"?`)) return;
  setStandards(getStandards().filter(s => s.id !== id));
  renderEditorStandardsList();
  renderEditorLinesView();
  showToast('Стандарт удалён');
};
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

function openStandardForm(id) {
  if (!currentEditorLine) return showToast('Сначала откройте линию', true);

  const modal = $('#standardFormModal');
  const title = $('#standardFormTitle');
  if (!modal) return;

  // Если id передан — редактируем, иначе создаём новый
  let st;
  if (id) {
    st = getStandards().find(s => s.id === id);
    if (!st) return;
    title.textContent = 'Изменить стандарт: ' + (st.oplNumber || st.title || '');
  } else {
    st = createEmptyStandard();
    st.line = currentEditorLine;
    title.textContent = 'Добавить стандарт — ' + currentEditorLine;
  }

  // Заполняем поля
  $('#sf_id').value = id || '';
  $('#sf_number').value = st.number || '';
  $('#sf_oplNumber').value = st.oplNumber || '';
  // Машина — выпадающий список из машин линии
  const standardLine = st.line || currentEditorLine;
  fillStandardMachineSelect(standardLine, st.machine || '');
  $('#sf_line').value = st.line || currentEditorLine;
  $('#sf_title').value = st.title || '';
  $('#sf_node').value = st.node || '';
  $('#sf_nodePart').value = st.nodePart || '';
  $('#sf_problemDescription').value = st.problemDescription || '';
  $('#sf_controlDescription').value = st.controlDescription || '';
  $('#sf_purpose').value = st.purpose || '';
  $('#sf_whyCreated').value = st.whyCreated || '';
  $('#sf_controlType').value = st.controlType || '';

  // Точки замера
  const ms = st.measurements || [];
  for (let i = 1; i <= 4; i++) {
    const m = ms[i - 1] || { point: i, value: '', sorts: '' };
    $('#sf_value' + i).value = m.value || '';
    $('#sf_sorts' + i).value = m.sorts || '';
  }

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

  // --- НОВОЕ: фотографии ---
  formPhotos = Array.isArray(st.photos) ? [...st.photos] : [];
  renderPhotosInForm();
  updatePhotoPathHint();
  const photoInput = $('#sf_newPhotoName');
  if (photoInput) photoInput.value = '';

  // Инициализация автокомплита узлов
  initNodeAutocomplete();
   
  modal.classList.add('active');
}
window.openStandardForm = openStandardForm;

function closeStandardForm() {
  const modal = $('#standardFormModal');
  if (modal) modal.classList.remove('active');
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

  // Материалы — из актуального списка
  const materials = MATERIAL_CHANGES.map(m => ({
    value: m.value,
    label: m.label,
    group: 'Материалы'
  }));

  // Узлы — из настроек (если функция getNodes доступна)
  const nodes = (typeof getNodes === 'function' ? getNodes() : []).map(n => ({
    value: 'node:' + n.name,
    label: n.name + ' [' + n.part + ']',
    group: 'Узлы'
  }));

  const all = [...materials, ...nodes];

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
   TOP LOSSES — блок в форме стандарта
   ============================================================ */
function fillStandardTopLossesGroup(selected = []) {
  const g = $('#sf_topLossesGroup');
  if (!g) return;

  const cats = getTopLosses();
  const selectedSet = new Set(Array.isArray(selected) ? selected : []);

  if (!cats.length) {
    g.innerHTML = '<div class="empty-state" style="padding:14px">Справочник Top Losses пуст. Заполните его в Настройках.</div>';
    return;
  }

  let html = '';
  cats.forEach(cat => {
    const items = Array.isArray(cat.items) ? cat.items : [];
    if (!items.length) return;

    html += `<div class="toploss-group">
      <div class="toploss-group-title">${escapeHtml(cat.name)}</div>
      <div class="checkbox-group">`;

    items.forEach(it => {
      const checked = selectedSet.has(it.id);
      html += `<label class="${checked ? 'checked' : ''}">
        <input type="checkbox" value="${escapeAttr(it.id)}" ${checked ? 'checked' : ''}>
        ${escapeHtml(it.name)}
      </label>`;
    });

    html += '</div></div>';
  });

  g.innerHTML = html;

  g.querySelectorAll('input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', e => {
      e.target.closest('label').classList.toggle('checked', e.target.checked);
    });
  });
}
$('#standardFormClose')?.addEventListener('click', closeStandardForm);
$('#standardFormCancel')?.addEventListener('click', closeStandardForm);
/* --- Обработчики блока «Фотографии» --- */
$('#sf_addPhotoBtn')?.addEventListener('click', addPhotoFromInput);

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
  console.log('=== ОБРАБОТЧИК СРАБОТАЛ ===');  
  const id = $('#sf_id').value;
    console.log('ID из формы =', JSON.stringify(id), '| тип:', typeof id, '| длина:', (id || '').length);

  // Собираем значения
  const number = $('#sf_number').value.trim();
  const oplNumber = $('#sf_oplNumber').value.trim();
  const machine = ($('#sf_machine').value || '').trim();
  const title = $('#sf_title').value.trim();
  const line = $('#sf_line').value;
  const node = $('#sf_node').value.trim();
  const nodePart = $('#sf_nodePart').value;
  const controlType = $('#sf_controlType').value;
    console.log('ПРОВЕРКА ПОЛЕЙ:', {
  number, oplNumber, machine, title, line, node, nodePart, controlType
});

  // Валидация обязательных полей
if (!number)      return showToast('Укажите №', true);
if (!oplNumber)   return showToast('Укажите OPL №', true);
if (!machine)     return showToast('Укажите машину', true);
if (!title)       return showToast('Укажите название', true);
if (!line)        return showToast('Линия не определена', true);
if (!node)        return showToast('Укажите узел', true);
if (!nodePart)    return showToast('Выберите часть линии', true);
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
  const measurements = [1, 2, 3, 4].map(i => ({
    point: i,
    value: $('#sf_value' + i).value.trim(),
    sorts: $('#sf_sorts' + i).value.trim()
  }));

  // Применять к (типы переходов)
  const appliesTo = [...$$('#sf_appliesToGroup input:checked')].map(c => c.value);

  // Триггеры
  const triggers = [...$$('#sf_triggersGroup input:checked')].map(c => c.value);
  // Top Losses
  const topLosses = [...$$('#sf_topLossesGroup input:checked')].map(c => c.value);

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
    problemDescription: $('#sf_problemDescription').value.trim(),
    controlDescription: $('#sf_controlDescription').value.trim(),
    purpose: $('#sf_purpose').value.trim(),
    whyCreated: $('#sf_whyCreated').value.trim(),
    measurements,
    appliesTo,
    triggers,
    topLosses,
    photos: [...formPhotos],
    // --- НОВОЕ: история ---
    author: id
      ? (getStandards().find(s => s.id === id) || {}).author || ''
      : (($('#operatorName')?.value || '').trim() || '—'),
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

  console.log('ПЕРЕД setStandards: all.length =', all.length);
  console.log('ПЕРЕД setStandards: obj =', obj);
  console.log('typeof setStandards =', typeof setStandards);

  setStandards(all);

  console.log('ПОСЛЕ setStandards: localStorage =', localStorage.getItem('cl_standards_v3'));

  renderEditorStandardsList();
  renderEditorLinesView();
  closeStandardForm();
  showToast(id ? 'Стандарт обновлён' : 'Стандарт добавлен');
});
/* ============================================================
   НАВИГАЦИЯ ВНУТРИ РЕДАКТОРА — назад к списку линий
   ============================================================ */
$('#editorBackBtn')?.addEventListener('click', () => {
  currentEditorLine = null;
  localStorage.removeItem('cl_editor_line');
  $('#editorLineView').style.display = 'none';
  $('#editorLinesView').style.display = 'block';
  $('#editorBlocksView').style.display = 'none';

  // Заголовок и список — по текущему блоку
  const blockId = localStorage.getItem('cl_editor_block');
  const blocks = getBlocks();
  const block = blocks.find(b => b.id === blockId);
  if (block) {
    $('#editorLinesTitle').textContent = block.name || 'Без названия';
  }
  renderEditorLinesView(blockId);
});
/* Клик по кнопке «Добавить стандарт» */
$('#editorAddStandardBtn')?.addEventListener('click', () => {
  openStandardForm(null);
});

/* ============================================================
   ПЕРЕКЛЮЧАТЕЛЬ РЕЖИМА РЕДАКТОРА (Механический / Электронный)
   ============================================================ */

function switchEditorMode(mode) {
  const mechView = $('#editorBlocksView');
  const elecView = $('#editorElectronicView');

  // Скрываем все мех-экраны
  const mechViews = ['#editorBlocksView', '#editorLinesView', '#editorLineView'];
  mechViews.forEach(sel => {
    const el = $(sel);
    if (el) el.style.display = 'none';
  });
  if (elecView) elecView.style.display = 'none';

  if (mode === 'elec') {
    if (elecView) {
      elecView.style.display = 'block';
      renderElectronicView();
    }
  } else {
    // Механический — с учётом сохранённых блоков/линий
    if (mechView) mechView.style.display = 'block';
    if (typeof renderEditorBlocksView === 'function') renderEditorBlocksView();
  }

  // Подсветка кнопок
  document.querySelectorAll('#editorModeSwitch .editor-mode-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === mode);
  });

  // Сохраняем выбор
  try { localStorage.setItem('cl_editor_mode', mode); } catch(e) {}
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
  const timeFrom = ($('#ep_timeFrom')?.value || '').trim();
  const timeTo = ($('#ep_timeTo')?.value || '').trim();
  const freqType = $('#ep_freqType').value;

  // Валидация
  if (!machine)     return showToast('Выберите машину', true);
  if (!paramName)   return showToast('Укажите название параметра', true);
  if (controlType === 'ok_not_ok' && !normText) {
    return showToast('Укажите текст нормы', true);
  }

  // Собираем значения по брендам
  const valuesByBrand = [];
  if (controlType === 'value_input') {
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

  // Периодичность
  const frequency = { type: freqType, shifts: [], daysOfWeek: [], dates: [] };

  if (freqType === 'daily') {
    frequency.shifts = [...($$('#ep_freqDailyShifts input:checked'))].map(cb => cb.value);
    if (!frequency.shifts.length) return showToast('Выберите хотя бы одну смену', true);
    // Ничего не нужно — ротация определяется графиком смен
  } else if (freqType === 'weekly') {
    frequency.daysOfWeek = [...($$('#ep_freqWeeklyDays input:checked'))].map(cb => Number(cb.value));
    frequency.shifts = [...($$('#ep_freqWeeklyShifts input:checked'))].map(cb => cb.value);
    if (!frequency.daysOfWeek.length) return showToast('Выберите дни недели', true);
    if (!frequency.shifts.length) return showToast('Выберите хотя бы одну смену', true);
  } else if (freqType === 'once') {
    const raw = ($('#ep_freqOnceDates')?.value || '').trim();
    frequency.dates = raw.split(/[\s,]+/).map(s => s.trim()).filter(s => /^\d{4}-\d{2}-\d{2}$/.test(s));
    frequency.shifts = [...($$('#ep_freqOnceShifts input:checked'))].map(cb => cb.value);
    if (!frequency.dates.length) return showToast('Укажите хотя бы одну дату в формате YYYY-MM-DD', true);
    if (!frequency.shifts.length) return showToast('Выберите хотя бы одну смену', true);
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

  // Формируем объект
  const obj = {
    id: id || makeElectronicParamId(),
    active: id ? (all.find(p => p.id === id)?.active !== false) : true,
    line: currentElectronicLine,
    machine,
    paramName,
    work,
    timeFrom,
    timeTo,
    controlType,
    normText: controlType === 'ok_not_ok' ? normText : '',
    valuesByBrand: controlType === 'value_input' ? valuesByBrand : [],
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

  // Перерисовываем список параметров на машине
  if (currentElectronicMachine) {
    openElectronicMachine(currentElectronicMachine);
  }

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

    problemDescription: '',
    controlDescription: '',
    purpose: '',
    whyCreated: '',

    measurements: [
      { point: 1, value: '', sorts: '' },
      { point: 2, value: '', sorts: '' },
      { point: 3, value: '', sorts: '' },
      { point: 4, value: '', sorts: '' }
    ],

    appliesTo: [],
    triggers: [],

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

function normalizeStandard(st) {
  const empty = createEmptyStandard();
  return {
    ...empty,
    ...st,
    id: st.id || empty.id,
    active: st.active !== undefined ? st.active : true,
    measurements: Array.isArray(st.measurements) && st.measurements.length
      ? st.measurements
      : empty.measurements,
    appliesTo: Array.isArray(st.appliesTo) ? st.appliesTo : [],
    triggers: Array.isArray(st.triggers) ? st.triggers : [],
    photos: Array.isArray(st.photos)
      ? st.photos.filter(p => typeof p === 'string' && p.trim() !== '')
      : [],
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
/* Блоки линий */
function getBlocks() {
  const raw = load(STORAGE_KEYS.blocks, null);
  // Если ничего нет — возвращаем дефолт
  if (raw === null) return [...DEFAULT_BLOCKS];
  return Array.isArray(raw) ? raw : [...DEFAULT_BLOCKS];
}
function setBlocks(v) { save(STORAGE_KEYS.blocks, v); }

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
    paramName: p.paramName || '',
    work: (p.work === 'Stop') ? 'Stop' : 'Run',
    timeFrom: p.timeFrom || '',
    timeTo: p.timeTo || '',

    controlType: (p.controlType === 'ok_not_ok') ? 'ok_not_ok' : 'value_input',
    normText: typeof p.normText === 'string' ? p.normText : '',

    valuesByBrand: Array.isArray(p.valuesByBrand)
      ? p.valuesByBrand.filter(v => v && v.brand)
      : [],

    frequency: normalizeElectronicFrequency(p.frequency),

    author: typeof p.author === 'string' ? p.author : '',
    createdAt: p.createdAt || null,
    updatedAt: p.updatedAt || null
  };
}

/* Нормализация периодичности */
function normalizeElectronicFrequency(f) {
  const def = { type: 'daily', shifts: ['day','night'], daysOfWeek: [], dates: [] };
  if (!f || typeof f !== 'object') return def;

  // type: rotation больше нет — мигрируем в daily
  let type = ['daily','weekly','once'].includes(f.type) ? f.type : 'daily';

  // shifts: поддерживаем старый формат ['A','B','C','D'] → ['day','night']
  let shifts = Array.isArray(f.shifts) ? f.shifts : [];
  const legacyShifts = shifts.some(s => ['A','B','C','D'].includes(s));
  if (legacyShifts) {
    shifts = ['day', 'night'];
  } else {
    shifts = shifts.filter(s => s === 'day' || s === 'night');
    if (!shifts.length) shifts = ['day', 'night'];
  }

  return {
    type,
    shifts,
    daysOfWeek: Array.isArray(f.daysOfWeek)
      ? f.daysOfWeek.filter(d => Number.isInteger(d) && d >= 0 && d <= 6)
      : [],
    dates: Array.isArray(f.dates)
      ? f.dates.filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d))
      : []
  };
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
    if (p.controlType === 'ok_not_ok') {
      // Для ok_not_ok достаточно, чтобы normText был заполнен —
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

  modal.classList.add('active');
};

/* Закрыть */
function closeElectronicBrandSchedule() {
  const modal = $('#electronicBrandScheduleModal');
  if (modal) modal.classList.remove('active');
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

/* Утилита: 7 дат текущей ISO-недели (Пн..Вс) в формате 'YYYY-MM-DD' */
function getCurrentWeekDays() {
  const now = new Date();
  // JS: 0 = Вс, 1 = Пн, ... 6 = Сб. Переводим в ISO: Пн = 1, Вс = 7.
  const jsDay = now.getDay();
  const isoDay = jsDay === 0 ? 7 : jsDay;

  // Находим понедельник
  const monday = new Date(now);
  monday.setDate(now.getDate() - (isoDay - 1));

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

/* Заполнить вкладку при открытии */
function fillElectronicTab() {
  fillElectronicLines();
  initElectronicOperatorAutocomplete();

  // Сброс
  const lineEl = $('#elecLine');
  if (lineEl) lineEl.value = '';
  $('#elecContextInfo').style.display = 'none';
  $('#elecSubtabs').style.display = 'none';
  $('#elecSubtabToday').style.display = 'none';
  $('#elecSubtabWeek').style.display = 'none';
}

/* Список линий, у которых есть хотя бы один электронный параметр */
function fillElectronicLines() {
  const el = $('#elecLine');
  if (!el) return;

  const allLines = getLines();
  const linesWithParams = allLines.filter(l => getElectronicParamsForLine(l).length > 0);

  if (!linesWithParams.length) {
    el.innerHTML = '<option value="">— нет линий с параметрами —</option>';
    el.value = '';
    return;
  }
  el.innerHTML = '<option value="">— выберите —</option>' +
    linesWithParams.map(l => `<option>${escapeHtml(l)}</option>`).join('');
  el.value = '';
}

/* Автокомплит оператора — переиспользуем логику Top Losses,
   но привязываем к #elecOperator / #elecOperatorAutocomplete */
function initElectronicOperatorAutocomplete() {
  const input = document.getElementById('elecOperator');
  const dropdown = document.getElementById('elecOperatorAutocomplete');
  if (!input || !dropdown) return;
  if (input.dataset.acReady === '1') return;
  input.dataset.acReady = '1';

  let activeIndex = -1;
  let currentMatches = [];

  function highlight(fullText, query) {
    const idx = fullText.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return escapeHtml(fullText);
    return escapeHtml(fullText.slice(0, idx)) +
      '<strong>' + escapeHtml(fullText.slice(idx, idx + query.length)) + '</strong>' +
      escapeHtml(fullText.slice(idx + query.length));
  }

  function render(matches, query) {
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
    dropdown.innerHTML = matches.map((n, i) =>
      `<div class="autocomplete-item" data-index="${i}">${highlight(n, query)}</div>`
    ).join('');
    dropdown.style.display = 'block';
    dropdown.querySelectorAll('.autocomplete-item').forEach(el => {
      el.addEventListener('mousedown', e => {
        e.preventDefault();
        const idx = parseInt(el.dataset.index, 10);
        if (idx >= 0 && idx < currentMatches.length) {
          input.value = currentMatches[idx];
          dropdown.style.display = 'none';
        }
      });
    });
  }

  function filter(query) {
    const q = query.toLowerCase();
    const all = sortOperatorsRus(getOperators());
    const starts = [], contains = [];
    all.forEach(op => {
      const low = op.toLowerCase();
      if (low.startsWith(q)) starts.push(op);
      else if (low.includes(q)) contains.push(op);
    });
    return [...starts, ...contains];
  }

  input.addEventListener('input', () => {
    const query = input.value.trim();
    if (!getOperators().length) return (dropdown.style.display = 'none');
    if (!query) return render(sortOperatorsRus(getOperators()).slice(0, 7), '');
    render(filter(query).slice(0, 15), query);
  });

  input.addEventListener('focus', () => {
    if (!input.value.trim() && getOperators().length) {
      render(sortOperatorsRus(getOperators()).slice(0, 7), '');
    }
  });

  input.addEventListener('keydown', e => {
    if (dropdown.style.display !== 'block') return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      activeIndex = Math.min(activeIndex + 1, currentMatches.length - 1);
      dropdown.querySelectorAll('.autocomplete-item').forEach((el, i) => el.classList.toggle('active', i === activeIndex));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      activeIndex = Math.max(activeIndex - 1, 0);
      dropdown.querySelectorAll('.autocomplete-item').forEach((el, i) => el.classList.toggle('active', i === activeIndex));
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

/* Собрать параметры, актуальные на дату/смену/бренд для линии */
function collectElectronicItemsForDate(line, dateStr, shiftType, brand) {
  const params = getElectronicParamsForLine(line).filter(p => p.active !== false);
  const result = [];

  params.forEach(p => {
    // 1. Периодичность
    if (!isElectronicParamDue(p, dateStr, shiftType)) return;

    // 2. Бренд: для value_input норма должна быть для этого бренда;
    //    для ok_not_ok — просто наличие normText
    let target = null;
    let tolerance = null;
    let normText = '';

    if (p.controlType === 'ok_not_ok') {
      if (!p.normText || !p.normText.trim()) return; // норма не задана → не показываем
      normText = p.normText.trim();
    } else {
      const v = (p.valuesByBrand || []).find(v => v.brand === brand);
      if (!v) return; // для этого бренда нормы нет → не показываем
      if (v.target === '' || v.target == null) return;
      if (v.tolerance === '' || v.tolerance == null) return;
      target = Number(v.target);
      tolerance = Number(v.tolerance);
    }

    result.push({
      id: p.id,
      machine: p.machine,
      paramName: p.paramName,
      work: p.work,
      timeFrom: p.timeFrom,
      timeTo: p.timeTo,
      controlType: p.controlType,
      target,
      tolerance,
      normText
    });
  });

  // Сортировка: по времени проверки, потом по машине, потом по имени
  result.sort((a, b) => {
    if (a.timeFrom !== b.timeFrom) return (a.timeFrom || '').localeCompare(b.timeFrom || '');
    if (a.machine !== b.machine)   return (a.machine || '').localeCompare(b.machine || '', 'ru');
    return (a.paramName || '').localeCompare(b.paramName || '', 'ru');
  });

  return result;
}

/* Пересобрать контекст и отрисовать всё на вкладке */
function refreshElectronicTab() {
  const operator = ($('#elecOperator')?.value || '').trim();
  const line = $('#elecLine')?.value || '';
  
  // Показываем подсказку только пока линия не выбрана
  const hintEmpty = $('#elecHintEmpty');
  if (hintEmpty) {
    hintEmpty.style.display = line ? 'none' : 'flex';
  }

  elecState.operator = operator;
  elecState.line = line;

  if (!line) {
    $('#elecContextInfo').style.display = 'none';
    $('#elecSubtabs').style.display = 'none';
    $('#elecSubtabToday').style.display = 'none';
    $('#elecSubtabWeek').style.display = 'none';
    return;
  }

  // Дата = сегодня, смена = из графика (день/ночь)
  const dateStr = todayISO();
  const shifts = getShiftsForDate(dateStr);   // { day: 'D', night: 'C' }
  const shiftType = getCurrentShiftType();    // 'day' | 'night' — по времени
  elecState.date = dateStr;
  elecState.shiftType = shiftType;
  elecState.shift = shifts[shiftType];        // буква бригады

  // Бренд: из расписания
  const brandPlanned = getElectronicBrandForDate(line, dateStr) || '';
  elecState.brandPlanned = brandPlanned;
  elecState.brand = brandPlanned; // если оператор не переопределил

  renderElectronicContextInfo();

  // Если бренд не определён — показываем сообщение и не строим чек-лист
  if (!elecState.brand) {
    $('#elecSubtabs').style.display = 'flex';
    restoreElecSubtab();

    $('#elecChecklistContainer').innerHTML = `
      <div class="empty-state" style="padding:32px 20px">
        На <strong>${fmtISODate(dateStr)}</strong> бренд в расписании не задан.<br>
        <span style="color:var(--text-dim);font-size:12px">
          Обратитесь к техническому специалисту или выберите бренд вручную.
        </span>
        <div style="margin-top:14px">
          <button class="btn btn-secondary" id="elecChooseBrandManuallyBtn" type="button">Выбрать бренд вручную</button>
        </div>
      </div>`;
    $('#elecTodayCount').textContent = '';
    $('#elecSaveCheckBtn').disabled = true;
    return;
  }

  // Собираем параметры
  const items = collectElectronicItemsForDate(line, dateStr, shiftType, elecState.brand);
  elecState.items = items;

  renderElectronicChecklist(items);

  // Показываем контекст и под-вкладки
  $('#elecSubtabs').style.display = 'flex';

  // Восстанавливаем активную под-вкладку
  restoreElecSubtab();
}
/* ============================================================
   CL ELECTRONIC: под-вкладки (Проверка на сегодня / Неделя)
   ============================================================ */

const ELEC_SUBTAB_KEY = 'cl_elec_subtab';   // 'today' | 'week'

/* Переключить под-вкладку */
function switchElecSubtab(name) {
  if (name !== 'today' && name !== 'week') name = 'today';

  // Кнопки
  document.querySelectorAll('#elecSubtabs .elec-subtab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.subtab === name);
  });

  // Панели
  const todayPanel = $('#elecSubtabToday');
  const weekPanel = $('#elecSubtabWeek');
  if (todayPanel) todayPanel.style.display = (name === 'today') ? 'block' : 'none';
  if (weekPanel)  weekPanel.style.display  = (name === 'week')  ? 'block' : 'none';

  // Если перешли на «Неделю» — перерисуем матрицу (свежие данные)
  if (name === 'week' && typeof renderElectronicWeekMatrix === 'function') {
    renderElectronicWeekMatrix();
  }

  // Сохраняем выбор
  try { localStorage.setItem(ELEC_SUBTAB_KEY, name); } catch (e) {}
}

/* Обработчики кнопок под-вкладок */
document.querySelectorAll('#elecSubtabs .elec-subtab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    switchElecSubtab(btn.dataset.subtab);
  });
});

/* Восстановить сохранённую под-вкладку */
function restoreElecSubtab() {
  let saved = 'today';
  try { saved = localStorage.getItem(ELEC_SUBTAB_KEY) || 'today'; } catch (e) {}
  switchElecSubtab(saved);
}
/* Контекстная строка */
function renderElectronicContextInfo() {
  const box = $('#elecContextInfo');
  if (!box) return;

  const dateStr = elecState.date;
  const shiftType = elecState.shiftType;
  const shift = elecState.shift;   // буква бригады
  const brand = elecState.brand;

  const shiftLabel = shiftType === 'day' ? 'День' : 'Ночь';

  const brandDisplay = elecState.brandPlanned
    ? `<span>${escapeHtml(brand)}</span>
       <button class="elec-edit-brand-btn" id="elecEditBrandBtn" type="button" title="Изменить бренд">
         <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
           <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
           <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
         </svg>
       </button>`
    : `<span>${escapeHtml(brand)}</span>
       <span style="font-size:11px;color:var(--accent-amber);font-style:italic;margin-left:6px">— вручную</span>`;

  box.innerHTML = `
    <div class="elec-context-item">
      <strong>Дата:</strong>
      <span>${escapeHtml(fmtISODate(dateStr))}</span>
    </div>
    <div class="elec-context-item">
      <strong>Смена:</strong>
      <span>${shiftLabel} · бригада <span class="elec-shift-${shift}">${shift}</span></span>
    </div>
    <div class="elec-context-item">
      <strong>Бренд:</strong>
      ${brandDisplay}
    </div>
  `;

  box.style.display = 'flex';

  // Обработчик — изменить бренд
  $('#elecEditBrandBtn')?.addEventListener('click', openElecBrandOverrideDialog);
  $('#elecChooseBrandManuallyBtn')?.addEventListener('click', () => {
    elecState.brandPlanned = '';
    openElecBrandOverrideDialog();
  });
}

/* ============================================================
   Чек-лист CL Electronic на сегодня
   ============================================================ */

function renderElectronicChecklist(items) {
  const container = $('#elecChecklistContainer');
  const counter = $('#elecTodayCount');
  const saveBtn = $('#elecSaveCheckBtn');

  if (!container) return;

  if (!items.length) {
    container.innerHTML = `
      <div class="empty-state" style="padding:32px 20px">
        На <strong>${fmtISODate(elecState.date)}</strong> для бренда
        <strong>${escapeHtml(elecState.brand)}</strong> нет параметров к проверке.
      </div>`;
    if (counter) counter.textContent = '0 параметров';
    if (saveBtn) saveBtn.disabled = true;
    return;
  }

  if (counter) counter.textContent = `${items.length} ${pluralizeParams(items.length)}`;
  if (saveBtn) saveBtn.disabled = false;

  container.innerHTML = items.map(it => renderElectronicCheckItem(it)).join('');

  // Обработчики
  bindElectronicChecklistEvents(container);
  updateElecProgress();
}

function renderElectronicCheckItem(it) {
  // Мета: время · работа · машина
  const metaParts = [];
  if (it.timeFrom) {
    metaParts.push(`<span class="elec-check-time">${escapeHtml(it.timeFrom)}–${escapeHtml(it.timeTo || '')}</span>`);
  }
  if (it.machine) metaParts.push(`<span><strong>Машина:</strong> ${escapeHtml(it.machine)}</span>`);
  metaParts.push(`<span class="elec-check-work elec-check-work-${it.work.toLowerCase()}">${escapeHtml(it.work)}</span>`);

  // Норма
  let normHtml = '';
  if (it.controlType === 'ok_not_ok') {
    normHtml = `<div class="elec-check-norm"><strong>Норма:</strong> <span class="elec-norm-value">${escapeHtml(it.normText)}</span></div>`;
  } else if (it.controlType === 'value_input') {
    const min = (it.target - it.tolerance).toFixed(2).replace(/\.00$/, '');
    const max = (it.target + it.tolerance).toFixed(2).replace(/\.00$/, '');
    normHtml = `<div class="elec-check-norm">
      <strong>Норма:</strong>
      <span class="elec-norm-value">${it.target} ± ${it.tolerance}</span>
      <span style="color:var(--text-dim);font-size:11px;margin-left:6px">→ [${min}, ${max}]</span>
    </div>`;
  }

  // Поле ответа
  let answerHtml = '';
  if (it.controlType === 'ok_not_ok') {
    answerHtml = `
      <div class="answer-row">
        <div class="radio-group">
          <label><input type="radio" name="elec_ans_${escapeAttr(it.id)}" value="OK" data-elec-ans> ОК</label>
          <label><input type="radio" name="elec_ans_${escapeAttr(it.id)}" value="FAIL" data-elec-ans> Не ОК</label>
        </div>
        <button type="button" class="comment-btn" data-elec-comment-btn title="Добавить комментарий">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            <line x1="9" y1="10" x2="15" y2="10"/>
            <line x1="9" y1="14" x2="13" y2="14"/>
          </svg>
        </button>
      </div>`;
  } else {
    answerHtml = `
      <div class="answer-row">
        <div class="answer-field">
          <input type="number" step="any" data-elec-value placeholder="0">
        </div>
        <span class="elec-answer-status" data-elec-status></span>
        <button type="button" class="comment-btn" data-elec-comment-btn title="Добавить комментарий">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            <line x1="9" y1="10" x2="15" y2="10"/>
            <line x1="9" y1="14" x2="13" y2="14"/>
          </svg>
        </button>
      </div>`;
  }

  return `
    <div class="checklist-item elec-check-item" data-elec-id="${escapeAttr(it.id)}">
      <div class="elec-check-meta">${metaParts.join('')}</div>
      <div class="elec-check-name">${escapeHtml(it.paramName || '')}</div>
      ${normHtml}
      <div class="elec-check-answer">${answerHtml}</div>
      <div class="comment-preview" style="display:none" data-elec-comment-preview></div>
    </div>`;
}

function bindElectronicChecklistEvents(container) {
  // Радио ОК/Не ОК
  container.querySelectorAll('input[data-elec-ans]').forEach(r => {
    r.addEventListener('change', e => {
      const item = e.target.closest('.checklist-item');
      const val = e.target.value;
      item.classList.remove('answered-ok', 'answered-fail');
      if (val === 'OK') item.classList.add('answered-ok');
      if (val === 'FAIL') item.classList.add('answered-fail');
      updateElecProgress();
    });
  });

  // Поле значения
  container.querySelectorAll('input[data-elec-value]').forEach(inp => {
    inp.addEventListener('input', e => {
      const item = e.target.closest('.checklist-item');
      const it = elecState.items.find(x => x.id === item.dataset.elecId);
      const statusEl = item.querySelector('[data-elec-status]');

      const v = parseFloat(inp.value);
      if (isNaN(v) || inp.value === '') {
        item.classList.remove('answered-ok', 'answered-fail');
        if (statusEl) statusEl.textContent = '';
      } else {
        const min = it.target - it.tolerance;
        const max = it.target + it.tolerance;
        const inRange = v >= min && v <= max;
        item.classList.remove('answered-ok', 'answered-fail');
        item.classList.add(inRange ? 'answered-ok' : 'answered-fail');
        if (statusEl) {
          statusEl.textContent = inRange ? '✓ в допуске' : '✕ не в допуске';
          statusEl.className = 'elec-answer-status ' + (inRange ? 'ok' : 'fail');
        }
      }
      updateElecProgress();
    });
  });

  // Комментарии
  container.querySelectorAll('[data-elec-comment-btn]').forEach(btn => {
    btn.addEventListener('click', e => {
      const item = e.target.closest('.checklist-item');
      openCommentModalElec(item);
    });
  });
}

/* Прогресс + активность кнопки сохранения */
function updateElecProgress() {
  const items = $$('#elecChecklistContainer .checklist-item');
  const saveBtn = $('#elecSaveCheckBtn');

  let filled = 0;
  items.forEach(item => {
    const it = elecState.items.find(x => x.id === item.dataset.elecId);
    if (!it) return;
    if (it.controlType === 'ok_not_ok') {
      if (item.querySelector('input[data-elec-ans]:checked')) filled++;
    } else {
      const inp = item.querySelector('input[data-elec-value]');
      if (inp && inp.value !== '') filled++;
    }
  });

  if (saveBtn) saveBtn.disabled = filled === 0;
}

/* ============================================================
   Сохранение проверки CL Electronic
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

  $$('#elecChecklistContainer .checklist-item').forEach(item => {
    const it = elecState.items.find(x => x.id === item.dataset.elecId);
    if (!it) return;

    let answer = '—';
    let status = 'UNCHECKED';
    let value = null;

    if (it.controlType === 'ok_not_ok') {
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
   Резюме проверки CL Electronic
   ============================================================ */

function renderElectronicSummary(record) {
  const container = $('#elecSummaryView');
  if (!container) return;

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

  // Чипы
  const chipsHtml = record.items.slice(0, 20).map(it => {
    let cls;
    if (it.status === 'OK') cls = 'tl-shield-chip-ok';
    else if (it.status === 'FAIL') cls = 'tl-shield-chip-fail';
    else cls = 'tl-shield-chip-unchecked';

    const label = it.machine ? `${it.machine} · ${it.paramName}` : it.paramName;
    return `<span class="tl-shield-chip ${cls}" title="${escapeAttr(it.paramName || '')}">
      <span class="tl-shield-chip-dot"></span>
      ${escapeHtml(label)}
    </span>`;
  }).join('');
  const chipMore = record.items.length > 20
    ? `<span class="tl-shield-chip">+${record.items.length - 20}</span>` : '';

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
            Смена: <strong>${escapeHtml(record.shift)}</strong> ·
            Дата: <strong>${escapeHtml(fmtISODate(record.date))}</strong>
          </div>
          <div class="tl-summary-sub" style="margin-top:4px">
            Бренд: <strong>${escapeHtml(record.brandActual)}</strong>
            ${record.brandPlanned && record.brandPlanned !== record.brandActual
              ? `<span style="color:var(--accent-amber);font-size:12px;margin-left:8px">
                   (по расписанию: ${escapeHtml(record.brandPlanned)}${record.brandReason ? ', причина: ' + escapeHtml(record.brandReason) : ''})
                 </span>`
              : ''}
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

    <!-- Матрица недели — чтобы оператор сразу видел, как его проверка легла в общую картину -->
    <div class="card" id="elecSummaryWeekCard">
      <div class="elec-week-header expanded" id="elecSummaryWeekHeader">
        <span class="elec-week-toggle">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </span>
        <h2 style="margin:0;border:none;padding:0">Неделя целиком</h2>
      </div>
      <div id="elecSummaryWeekMatrix" style="display:block"></div>
    </div>

    <div class="tl-select-footer">
      <button class="btn btn-secondary" id="elecSummaryBackBtn">← К проверке</button>
      <button class="btn btn-primary btn-icon-text" id="elecSummaryNewBtn">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="23 4 23 10 17 10"/>
          <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
        </svg>
        <span>Новая проверка</span>
      </button>
    </div>
  `;

  container.innerHTML = html;

  // Рисуем матрицу недели прямо в резюме
  renderElectronicSummaryWeekMatrix();

  // Экраны: показываем только резюме
$('#elecSelectView').style.display = 'none';
$('#elecSummaryView').style.display = 'block';

  // Обработчики кнопок
  $('#elecSummaryBackBtn')?.addEventListener('click', () => {
    refreshElectronicTab();
    $('#elecSelectView').style.display = 'block';
    $('#elecSummaryView').style.display = 'none';
  });

  $('#elecSummaryNewBtn')?.addEventListener('click', () => {
    // Сброс и возврат к выбору
    $('#elecOperator').value = '';
    $('#elecLine').value = '';
    elecState.operator = '';
    elecState.line = '';
    elecState.brand = '';
    elecState.brandPlanned = '';
    elecState.items = [];

    $('#elecContextInfo').style.display = 'none';
    $('#elecSubtabs').style.display = 'none';
    $('#elecSubtabToday').style.display = 'none';
    $('#elecSubtabWeek').style.display = 'none';
    $('#elecChecklistContainer').innerHTML = '';
    $('#elecWeekMatrix').innerHTML = '';

    $('#elecSelectView').style.display = 'block';
    $('#elecSummaryView').style.display = 'none';
  });

  $('#elecSummaryWeekHeader')?.addEventListener('click', () => {
    const header = $('#elecSummaryWeekHeader');
    const matrix = $('#elecSummaryWeekMatrix');
    const expanded = header.classList.toggle('expanded');
    matrix.style.display = expanded ? 'block' : 'none';
  });

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderElectronicWeekMatrix() {
  const wrap = $('#elecWeekMatrix');
  if (!wrap) return;

  if (!elecState.line) {
    wrap.innerHTML = '<div class="empty-state">Выберите линию</div>';
    return;
  }

  const allParams = getElectronicParamsForLine(elecState.line).filter(p => p.active !== false);

  const today = todayISO();
  const days = getCurrentWeekDays();  // 7 дат текущей ISO-недели

  const rows = [];

  allParams.forEach(p => {
    const cells = {}; // 'YYYY-MM-DD|day' => true/false

    days.forEach(date => {
      const brand = getElectronicBrandForDate(elecState.line, date) || '';
      ['day', 'night'].forEach(shiftType => {
        let due = false;
        if (isElectronicParamDue(p, date, shiftType)) {
          if (p.controlType === 'ok_not_ok') {
            if (p.normText && p.normText.trim()) due = true;
          } else {
            if (brand) {
              const v = (p.valuesByBrand || []).find(v => v.brand === brand);
              if (v && v.target !== '' && v.tolerance !== '') due = true;
            }
          }
        }
        cells[`${date}|${shiftType}`] = due;
      });
    });

    const hasAny = Object.values(cells).some(Boolean);
    if (!hasAny) return;

    rows.push({ param: p, cells });
  });

  if (!rows.length) {
    wrap.innerHTML = '<div class="empty-state" style="padding:24px">На текущую неделю нет запланированных проверок</div>';
    return;
  }

  // Соберём уже сохранённые проверки в этом диапазоне
  const history = getHistory().filter(h =>
    h.mode === 'electronic' &&
    h.line === elecState.line &&
    days.includes(h.date)
  );
  const savedStatus = {};
  history.forEach(h => {
    h.items.forEach(it => {
      if (it.status === 'OK' || it.status === 'FAIL' || it.status === 'UNCHECKED') {
        savedStatus[`${h.date}|${h.shift}|${it.standardId}`] = it.status;
      }
    });
  });

  // --- Шапка ---
  // Верхняя строка: описательные колонки (rowspan=2) + 7 дат (colspan=2)
  let headerHtml = `<tr>
    <th class="elec-matrix-th-machine" rowspan="2">Машина</th>
    <th class="elec-matrix-th-name" rowspan="2">Параметр</th>
    <th class="elec-matrix-th-time" rowspan="2">Время</th>
    <th class="elec-matrix-th-work" rowspan="2">Run/Stop</th>
    <th class="elec-matrix-th-norm" rowspan="2">Норма</th>`;

  days.forEach(date => {
    headerHtml += `<th colspan="2" class="elec-matrix-th-date">${escapeHtml(fmtISODate(date))}</th>`;
  });
  headerHtml += `</tr><tr>`;

  // Нижняя строка: буквы смен (день/ночь)
  days.forEach(date => {
    const shifts = getShiftsForDate(date);
    headerHtml += `<th class="elec-matrix-th-shift elec-matrix-th-shift-day">${shifts.day}</th>`;
    headerHtml += `<th class="elec-matrix-th-shift elec-matrix-th-shift-night">${shifts.night}</th>`;
  });
  headerHtml += `</tr>`;

  // --- Тело ---
  const bodyHtml = rows.map(({ param, cells }) => {

    // Норма — только для бренда СЕГОДНЯ
    let normText = '';
    let normTitle = '';
    const brandToday = getElectronicBrandForDate(elecState.line, today) || '';

    if (param.controlType === 'ok_not_ok') {
      normText = param.normText
        ? escapeHtml(param.normText)
        : '<span class="elec-matrix-empty">—</span>';
      normTitle = param.normText || '';
    } else {
      if (!brandToday) {
        normText = '<span class="elec-matrix-empty">нет бренда</span>';
        normTitle = 'На сегодня бренд не задан в расписании';
      } else {
        const v = (param.valuesByBrand || []).find(v => v.brand === brandToday);
        if (v && v.target !== '' && v.target != null && v.tolerance !== '' && v.tolerance != null) {
          normText = `<span class="elec-norm-brand">${escapeHtml(v.brand)}:</span> ${v.target}±${v.tolerance}`;
          normTitle = `${v.brand}: ${v.target}±${v.tolerance}`;
        } else {
          normText = '<span class="elec-matrix-empty">—</span>';
          normTitle = `Для бренда ${brandToday} норма не задана`;
        }
      }
    }

    // Время
    const timeText = (param.timeFrom && param.timeTo)
      ? `<span class="elec-time-from">${escapeHtml(param.timeFrom)}</span><span class="elec-time-sep">–</span><span class="elec-time-to">${escapeHtml(param.timeTo)}</span>`
      : '<span class="elec-matrix-empty">—</span>';

    // Run/Stop
    const workCls = param.work === 'Run' ? 'elec-check-work-run' : 'elec-check-work-stop';
    const workText = escapeHtml(param.work || '—');

    // Ячейки по дням
    let cellsHtml = '';
    days.forEach(date => {
      ['day', 'night'].forEach(shiftType => {
        const due = cells[`${date}|${shiftType}`];
        const shiftLetter = getShiftsForDate(date)[shiftType];
        const isToday = (date === today && shiftType === elecState.shiftType);
        const key = `${date}|${shiftLetter}|${param.id}`;
        const saved = savedStatus[key];

        let cls = 'elec-matrix-cell';
        let text = '—';

        if (!due) {
          cls += ' elec-cell-na';
        } else if (saved === 'OK') {
          cls += ' elec-cell-ok';
          text = '✓';
        } else if (saved === 'FAIL') {
          cls += ' elec-cell-fail';
          text = '✕';
        } else if (saved === 'UNCHECKED') {
          cls += ' elec-cell-unchecked';
          text = '?';
        } else {
          cls += ' elec-cell-due';
        }
        if (isToday) cls += ' elec-cell-today';

      // Запланировано и не проверено — кликабельно
      // Уже проверено — тоже кликабельно (для просмотра)
      // Не запланировано — не кликабельно
      const isClickable = due; // due = true, если параметр запланирован на этот день/смену

      if (isClickable) {
        cellsHtml += `<td class="${cls} elec-cell-clickable"
          data-param-id="${escapeAttr(param.id)}"
          data-date="${escapeAttr(date)}"
          data-shift-type="${escapeAttr(shiftType)}"
          title="Нажмите, чтобы ${saved ? 'посмотреть / изменить' : 'проверить'}">${text}</td>`;
      } else {
        cellsHtml += `<td class="${cls}">${text}</td>`;
      }
      });
    });

    return `<tr>
      <td class="elec-matrix-machine" title="${escapeAttr(param.machine || '')}">${escapeHtml(param.machine || '—')}</td>
      <td class="elec-matrix-name" title="${escapeAttr(param.paramName || '')}">${escapeHtml(param.paramName || '—')}</td>
      <td class="elec-matrix-time">${timeText}</td>
      <td class="elec-matrix-work"><span class="elec-check-work ${workCls}">${workText}</span></td>
      <td class="elec-matrix-norm" title="${escapeAttr(normTitle)}">${normText}</td>
      ${cellsHtml}
    </tr>`;
  }).join('');

  // --- Считаем счётчики по неделе ---
  let weekOk = 0;
  let weekFail = 0;
  let weekUnchecked = 0;
  let weekDue = 0;     // всего "запланировано к проверке"
  let weekNa = 0;      // ячеек "не запланировано"

  days.forEach(date => {
    ['day', 'night'].forEach(shiftType => {
      const shiftLetter = getShiftsForDate(date)[shiftType];
      rows.forEach(({ param, cells }) => {
        const due = cells[`${date}|${shiftType}`];
        if (!due) { weekNa++; return; }
        weekDue++;
        const key = `${date}|${shiftLetter}|${param.id}`;
        const saved = savedStatus[key];
        if (saved === 'OK') weekOk++;
        else if (saved === 'FAIL') weekFail++;
        else if (saved === 'UNCHECKED') weekUnchecked++;
      });
    });
  });

  wrap.innerHTML = `
    <div class="elec-matrix-toolbar">
      <div class="elec-matrix-legend">
        <span><span class="elec-matrix-legend-swatch elec-matrix-legend-due"></span>Запланировано</span>
        <span><span class="elec-matrix-legend-swatch elec-matrix-legend-ok"></span>ОК</span>
        <span><span class="elec-matrix-legend-swatch elec-matrix-legend-fail"></span>Не ОК</span>
        <span><span class="elec-matrix-legend-swatch elec-matrix-legend-unchecked"></span>Не проверено</span>
        <span><span class="elec-matrix-legend-swatch elec-matrix-legend-na"></span>Не запланировано</span>
      </div>

      <div class="elec-matrix-counters">
        <span class="elec-counter-chip elec-counter-ok" title="Проверено с результатом ОК">
          ✓ ОК: <strong>${weekOk}</strong>
        </span>
        <span class="elec-counter-chip elec-counter-fail" title="Проверено с отклонением">
          ✕ Не ОК: <strong>${weekFail}</strong>
        </span>
        <span class="elec-counter-chip elec-counter-unchecked" title="Не проверено">
          ? Не проверено: <strong>${weekUnchecked}</strong>
        </span>
        <span class="elec-counter-chip elec-counter-due" title="Всего запланировано за неделю">
          Всего к проверке: <strong>${weekDue}</strong>
        </span>
      </div>

      <button class="btn btn-secondary btn-icon-text elec-export-week-btn"
              id="elecExportWeekBtn" type="button"
              title="Скачать отчёт по неделе в Excel">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="7 10 12 15 17 10"/>
          <line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
        <span>Экспорт недели</span>
      </button>
    </div>

    <div class="elec-matrix-wrap">
      <table class="elec-matrix">
        <colgroup>
          <col class="elec-col-machine">
          <col class="elec-col-name">
          <col class="elec-col-time">
          <col class="elec-col-work">
          <col class="elec-col-norm">
          ${days.map(() => '<col class="elec-col-day"><col class="elec-col-day">').join('')}
        </colgroup>
        <thead>${headerHtml}</thead>
        <tbody>${bodyHtml}</tbody>
      </table>
    </div>
  `;
  wrap.querySelector('#elecExportWeekBtn')?.addEventListener('click', () => {
    exportElectronicWeekToXlsx({
      line: elecState.line,
      days,
      rows,
      savedStatus
    });
  });
  // Навешиваем клики на все кликабельные ячейки
  wrap.querySelectorAll('.elec-cell-clickable').forEach(td => {
    td.addEventListener('click', () => {
      const paramId = td.dataset.paramId;
      const date = td.dataset.date;
      const shiftType = td.dataset.shiftType;
      if (!paramId || !date || !shiftType) return;

      // Находим параметр
      const param = getElectronicParamsForLine(elecState.line)
        .find(p => p.id === paramId);
      if (!param) return;

      openQuickCheckModal(param, date, shiftType);
    });
  });
}
/* ============================================================
   CL ELECTRONIC: экспорт недели в XLSX
   ============================================================ */
async function exportElectronicWeekToXlsx({ line, days, rows, savedStatus }) {
  if (typeof ExcelJS === 'undefined') {
    return showToast('Библиотека ExcelJS не загружена', true);
  }
  if (!line || !days.length || !rows.length) {
    return showToast('Нет данных для экспорта', true);
  }

  const wb = new ExcelJS.Workbook();
  wb.creator = 'Tools CL / SMD Cell2';
  wb.created = new Date();

  // ---------- Лист 1. Матрица недели ----------
  const ws = wb.addWorksheet('Неделя', {
    views: [{ state: 'frozen', xSplit: 5, ySplit: 2 }]
  });

  // Заголовки — 5 описательных + 14 сменных (7 дней × 2 смены)
  const header1 = ['Машина', 'Параметр', 'Время', 'Run/Stop', 'Норма'];
  const header2 = ['', '', '', '', ''];

  days.forEach(date => {
    // верхняя строка — дата (colspan 2)
    header1.push(fmtISODate(date), '');
    // нижняя строка — буквы смен
    const shifts = getShiftsForDate(date);
    header2.push(shifts.day, shifts.night);
  });

  // Добавляем строки заголовков
  const row1 = ws.addRow(header1);
  const row2 = ws.addRow(header2);

  // Объединяем 5 описательных колонок вертикально (rowspan=2)
  for (let col = 1; col <= 5; col++) {
    ws.mergeCells(1, col, 2, col);
  }
  // Объединяем даты (каждая — colspan=2)
  days.forEach((_, idx) => {
    const col = 6 + idx * 2;
    ws.mergeCells(1, col, 1, col + 1);
  });

  // Стилизация шапки
  [row1, row2].forEach(r => {
    r.height = 28;
    r.eachCell({ includeEmpty: true }, (cell) => {
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
  });

  // Ширины колонок
  ws.getColumn(1).width = 10;   // Машина
  ws.getColumn(2).width = 28;   // Параметр
  ws.getColumn(3).width = 13;   // Время
  ws.getColumn(4).width = 10;   // Run/Stop
  ws.getColumn(5).width = 18;   // Норма
  days.forEach((_, idx) => {
    ws.getColumn(6 + idx * 2).width = 7;      // смена «Д»
    ws.getColumn(6 + idx * 2 + 1).width = 7;  // смена «Н»
  });

  // ---------- Данные ----------
  const COLOR_OK_BG    = 'FFD4F5E0';  // светло-зелёный
  const COLOR_FAIL_BG  = 'FFFDE0E3';  // светло-красный
  const COLOR_UNCH_BG  = 'FFFFF3D6';  // светло-амбер
  const COLOR_NA_BG    = 'FFEDEEF2';  // светло-серый
  const COLOR_DUE_BG   = 'FFE1F7FF';  // светло-циан

  const COLOR_OK_TX    = 'FF00A862';
  const COLOR_FAIL_TX  = 'FFC0392B';
  const COLOR_UNCH_TX  = 'FFE89A00';

  const COLOR_BORDER   = 'FFCBD2D9';

  rows.forEach(({ param, cells }) => {
    // Норма для бренда сегодня (как в матрице)
    const brandToday = getElectronicBrandForDate(line, todayISO()) || '';
    let normText = '';
    if (param.controlType === 'ok_not_ok') {
      normText = param.normText || '';
    } else if (brandToday) {
      const v = (param.valuesByBrand || []).find(v => v.brand === brandToday);
      if (v && v.target !== '' && v.target != null && v.tolerance !== '' && v.tolerance != null) {
        normText = `${v.brand}: ${v.target}±${v.tolerance}`;
      }
    }

    // Собираем строку
    const timeText = (param.timeFrom && param.timeTo)
      ? `${param.timeFrom}–${param.timeTo}`
      : '';

    const rowData = [
      param.machine || '',
      param.paramName || '',
      timeText,
      param.work || '',
      normText
    ];

    days.forEach(date => {
      ['day', 'night'].forEach(shiftType => {
        const due = cells[`${date}|${shiftType}`];
        const shiftLetter = getShiftsForDate(date)[shiftType];
        const key = `${date}|${shiftLetter}|${param.id}`;
        const saved = savedStatus[key];

        let text = '—';
        if (!due) text = '—';
        else if (saved === 'OK') text = '✓';
        else if (saved === 'FAIL') text = '✕';
        else if (saved === 'UNCHECKED') text = '?';
        else text = '';

        rowData.push(text);
      });
    });

    const row = ws.addRow(rowData);
    row.height = 22;

    // Стилизация ячеек данных
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      cell.font = { name: 'Calibri', size: 10 };
      cell.alignment = { vertical: 'middle', horizontal: colNumber <= 5 ? 'left' : 'center' };
      cell.border = {
        top:    { style: 'thin', color: { argb: COLOR_BORDER } },
        bottom: { style: 'thin', color: { argb: COLOR_BORDER } },
        left:   { style: 'thin', color: { argb: COLOR_BORDER } },
        right:  { style: 'thin', color: { argb: COLOR_BORDER } }
      };
    });

    // Стилизация 5 описательных ячеек
    row.getCell(1).font = { name: 'Courier New', size: 10, bold: true, color: { argb: 'FF2E5288' } };
    row.getCell(2).font = { name: 'Calibri', size: 10, color: { argb: 'FF1A2643' } };
    row.getCell(3).font = { name: 'Courier New', size: 10, color: { argb: 'FF00A8CC' } };
    row.getCell(5).font = { name: 'Courier New', size: 10, bold: true, color: { argb: 'FF7B5CFF' } };

    // Стилизация сменных ячеек
    days.forEach((date, idx) => {
      ['day', 'night'].forEach((shiftType, s) => {
        const colNumber = 6 + idx * 2 + s;
        const cell = row.getCell(colNumber);
        const due = cells[`${date}|${shiftType}`];
        const shiftLetter = getShiftsForDate(date)[shiftType];
        const key = `${date}|${shiftLetter}|${param.id}`;
        const saved = savedStatus[key];

        if (!due) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_NA_BG } };
          cell.font = { name: 'Calibri', size: 10, color: { argb: 'FF8896B0' } };
        } else if (saved === 'OK') {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_OK_BG } };
          cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: COLOR_OK_TX } };
        } else if (saved === 'FAIL') {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_FAIL_BG } };
          cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: COLOR_FAIL_TX } };
        } else if (saved === 'UNCHECKED') {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_UNCH_BG } };
          cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: COLOR_UNCH_TX } };
        } else {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_DUE_BG } };
          cell.font = { name: 'Calibri', size: 10, color: { argb: 'FF00A8CC' } };
        }
      });
    });
  });

  // Автофильтр по шапке
  ws.autoFilter = {
    from: { row: 1, column: 1 },
    to:   { row: 1, column: 5 + days.length * 2 }
  };

  // ---------- Лист 2. Детали (проверки за неделю) ----------
  const ws2 = wb.addWorksheet('Детали');
  ws2.columns = [
    { header: 'Дата',        width: 12 },
    { header: 'Смена',       width: 8  },
    { header: 'Оператор',    width: 25 },
    { header: 'Машина',      width: 10 },
    { header: 'Параметр',    width: 30 },
    { header: 'Время',       width: 13 },
    { header: 'Норма',       width: 18 },
    { header: 'Ответ',       width: 18 },
    { header: 'Статус',      width: 12 },
    { header: 'Комментарий', width: 40 }
  ];

  const headerRow2 = ws2.getRow(1);
  headerRow2.height = 26;
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

  // Собираем записи за неделю
  const history = getHistory().filter(h =>
    h.mode === 'electronic' &&
    h.line === line &&
    days.includes(h.date)
  );

  const details = [];
  history.forEach(h => {
    h.items.forEach(it => {
      if (it.status === 'UNCHECKED') return; // не показываем непроверенные в деталях
      const param = getElectronicParamsForLine(line).find(p => p.id === it.standardId);
      const normText = param ? (param.normText || '') : '';
      details.push({
        date: h.date,
        shift: h.shift,
        operator: h.operator || '',
        machine: it.machine || '',
        paramName: it.paramName || '',
        time: (it.timeFrom && it.timeTo) ? `${it.timeFrom}–${it.timeTo}` : '',
        norm: it.normText || normText,
        answer: it.answer || '',
        status: it.status,
        comment: it.comment || ''
      });
    });
  });

  details.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    if (a.shift !== b.shift) return a.shift.localeCompare(b.shift);
    return a.machine.localeCompare(b.machine, 'ru');
  });

  details.forEach(d => {
    const row = ws2.addRow([
      fmtISODate(d.date),
      d.shift,
      d.operator,
      d.machine,
      d.paramName,
      d.time,
      d.norm,
      d.answer,
      d.status === 'OK' ? 'ОК' : 'Не ОК',
      d.comment
    ]);
    row.height = 20;

    row.eachCell({ includeEmpty: true }, (cell) => {
      cell.font = { name: 'Calibri', size: 10 };
      cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: false };
      cell.border = {
        top:    { style: 'thin', color: { argb: COLOR_BORDER } },
        bottom: { style: 'thin', color: { argb: COLOR_BORDER } },
        left:   { style: 'thin', color: { argb: COLOR_BORDER } },
        right:  { style: 'thin', color: { argb: COLOR_BORDER } }
      };
    });

    // Статус цветом
    const statusCell = row.getCell(9);
    if (d.status === 'OK') {
      statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_OK_BG } };
      statusCell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: COLOR_OK_TX } };
    } else {
      statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_FAIL_BG } };
      statusCell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: COLOR_FAIL_TX } };
    }
    statusCell.alignment = { vertical: 'middle', horizontal: 'center' };

    // Машина — моно
    row.getCell(4).font = { name: 'Courier New', size: 10, bold: true, color: { argb: 'FF2E5288' } };
  });

  // Если нет деталей — добавим надпись
  if (details.length === 0) {
    const row = ws2.addRow(['—', '—', '—', '—', 'За эту неделю нет завершённых проверок', '—', '—', '—', '—', '—']);
    row.height = 20;
  }

  // ---------- Скачивание ----------
  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });

  const firstDay = days[0];
  const fname = `eparam_week_${line}_${firstDay}.xlsx`;
  downloadBlob(blob, fname);

  showToast('Отчёт по неделе выгружен');
}
/* ============================================================
   БЫСТРАЯ ПРОВЕРКА ИЗ МАТРИЦЫ НЕДЕЛИ
   ============================================================ */

// Состояние: что сейчас редактируем
const quickCheckState = {
  param: null,       // объект параметра
  date: '',          // 'YYYY-MM-DD'
  shiftType: '',     // 'day' | 'night'
  shiftLetter: '',   // буква бригады 'A'..'D'
  brand: '',         // бренд на этот день
  existing: null     // существующая запись истории (если есть)
};

/**
 * Открыть модалку быстрой проверки.
 * @param {object} param — объект электронного параметра
 * @param {string} date — 'YYYY-MM-DD'
 * @param {string} shiftType — 'day' | 'night'
 */
window.openQuickCheckModal = function(param, date, shiftType) {
  const modal = $('#quickCheckModal');
  if (!modal || !param) return;

  // Смена: буква бригады
  const shifts = getShiftsForDate(date);
  const shiftLetter = shifts[shiftType] || '—';

  // Бренд на этот день
  const brand = getElectronicBrandForDate(elecState.line, date) || '';

  // Ищем существующую запись в Истории
  let existing = null;
  const history = getHistory().filter(h =>
    h.mode === 'electronic' &&
    h.line === elecState.line &&
    h.date === date &&
    h.shift === shiftLetter
  );
  for (const h of history) {
    const found = h.items.find(it => it.standardId === param.id);
    if (found) { existing = found; break; }
  }

  // Сохраняем состояние
  quickCheckState.param = param;
  quickCheckState.date = date;
  quickCheckState.shiftType = shiftType;
  quickCheckState.shiftLetter = shiftLetter;
  quickCheckState.brand = brand;
  quickCheckState.existing = existing;

  // Заголовок
  $('#quickCheckModalTitle').textContent =
    existing ? 'Просмотр проверки' : 'Быстрая проверка';

  // Контекст
  $('#qcMachine').textContent = param.machine || '—';
  $('#qcParamName').textContent = param.paramName || '—';
  $('#qcTime').textContent = (param.timeFrom && param.timeTo)
    ? `${param.timeFrom}–${param.timeTo}`
    : '—';

  const workEl = $('#qcWork');
  workEl.textContent = param.work || '—';
  workEl.className = 'qc-work-badge ' +
    (param.work === 'Run' ? 'qc-work-run' : 'qc-work-stop');

  const shiftLabel = shiftType === 'day' ? 'День' : 'Ночь';
  $('#qcDateShift').textContent =
    `${fmtISODate(date)} · ${shiftLabel} · бригада ${shiftLetter}`;

  $('#qcBrand').textContent = brand || '— не задан —';

  // Норма
  let normText = '—';
  if (param.controlType === 'ok_not_ok') {
    normText = param.normText || '—';
  } else if (brand) {
    const v = (param.valuesByBrand || []).find(v => v.brand === brand);
    if (v && v.target !== '' && v.target != null && v.tolerance !== '' && v.tolerance != null) {
      const min = (Number(v.target) - Number(v.tolerance));
      const max = (Number(v.target) + Number(v.tolerance));
      normText = `${v.target} ± ${v.tolerance}  →  [${min}, ${max}]`;
    } else {
      normText = `Для бренда ${brand} норма не задана`;
    }
  } else {
    normText = 'Бренд не задан — норма недоступна';
  }
  $('#qcNormValue').textContent = normText;

  // Показать нужный блок ответа
  const valueBlock = $('#qcAnswerValueInput');
  const okNotOkBlock = $('#qcAnswerOkNotOk');

  if (param.controlType === 'ok_not_ok') {
    valueBlock.style.display = 'none';
    okNotOkBlock.style.display = 'block';
    $('#qcAnswerOk').checked = false;
    $('#qcAnswerFail').checked = false;
    if (existing) {
      if (existing.status === 'OK') $('#qcAnswerOk').checked = true;
      if (existing.status === 'FAIL') $('#qcAnswerFail').checked = true;
    }
  } else {
    valueBlock.style.display = 'block';
    okNotOkBlock.style.display = 'none';
    $('#qcValueInput').value = existing && existing.value != null ? existing.value : '';
    updateQcValueStatus();
  }

  // Комментарий
  $('#qcComment').value = existing && existing.comment ? existing.comment : '';

  // Инфо-плашка для существующих
  const infoEl = $('#qcExistingInfo');
  if (existing) {
    infoEl.style.display = 'flex';
    $('#qcExistingStatus').textContent =
      existing.status === 'OK' ? 'ОК' :
      existing.status === 'FAIL' ? 'Не ОК' : 'Не проверено';
  } else {
    infoEl.style.display = 'none';
  }

  modal.classList.add('active');
};

/* Обновить бейдж «в допуске / не в допуске» для поля значения */
function updateQcValueStatus() {
  const badge = $('#qcValueStatus');
  const inp = $('#qcValueInput');
  if (!badge || !inp) return;

  const param = quickCheckState.param;
  const brand = quickCheckState.brand;
  if (!param || param.controlType === 'ok_not_ok') {
    badge.textContent = '';
    badge.className = 'qc-status-badge';
    return;
  }

  const v = (param.valuesByBrand || []).find(v => v.brand === brand);
  if (!v || v.target === '' || v.tolerance === '') {
    badge.textContent = '';
    badge.className = 'qc-status-badge';
    return;
  }

  const val = parseFloat(inp.value);
  if (isNaN(val) || inp.value === '') {
    badge.textContent = '';
    badge.className = 'qc-status-badge';
    return;
  }

  const min = Number(v.target) - Number(v.tolerance);
  const max = Number(v.target) + Number(v.tolerance);
  const inRange = val >= min && val <= max;

  badge.textContent = inRange ? '✓ в допуске' : '✕ не в допуске';
  badge.className = 'qc-status-badge ' + (inRange ? 'qc-ok' : 'qc-fail');
}

/* Закрыть модалку */
function closeQuickCheckModal() {
  const modal = $('#quickCheckModal');
  if (modal) modal.classList.remove('active');
  quickCheckState.param = null;
  quickCheckState.existing = null;
}

/* Сохранить быструю проверку */
function saveQuickCheck() {
  const param = quickCheckState.param;
  if (!param) return;

  const { date, shiftLetter, brand } = quickCheckState;

  // Собираем ответ
  let answer = '—';
  let status = 'UNCHECKED';
  let value = null;

  if (param.controlType === 'ok_not_ok') {
    const r = document.querySelector('input[name="qc_answer"]:checked');
    if (r) {
      answer = r.value === 'OK' ? 'ОК' : 'Не ОК';
      status = r.value;
    }
  } else {
    const inp = $('#qcValueInput');
    const v = parseFloat(inp.value);
    if (!isNaN(v) && inp.value !== '') {
      value = v;
      const norm = (param.valuesByBrand || []).find(x => x.brand === brand);
      if (norm && norm.target !== '' && norm.tolerance !== '') {
        const min = Number(norm.target) - Number(norm.tolerance);
        const max = Number(norm.target) + Number(norm.tolerance);
        status = (v >= min && v <= max) ? 'OK' : 'FAIL';
      } else {
        status = 'OK';
      }
      answer = String(v);
    }
  }

  if (status === 'UNCHECKED') {
    return showToast('Введите значение или отметьте ОК / Не ОК', true);
  }

  const comment = ($('#qcComment').value || '').trim();

  // Формируем item
  const newItem = {
    standardId: param.id,
    machine: param.machine,
    paramName: param.paramName,
    work: param.work,
    timeFrom: param.timeFrom,
    timeTo: param.timeTo,
    controlType: param.controlType,
    target: null,
    tolerance: null,
    normText: param.normText || '',
    answer,
    value,
    status,
    comment
  };

  // Ищем существующую запись истории — за эту дату+смену+линию
  const allHist = getHistory();
  let record = allHist.find(h =>
    h.mode === 'electronic' &&
    h.line === elecState.line &&
    h.date === date &&
    h.shift === shiftLetter
  );

  if (record) {
    // Обновляем item или добавляем новый
    const idx = record.items.findIndex(it => it.standardId === param.id);
    if (idx !== -1) {
      record.items[idx] = newItem;
    } else {
      record.items.push(newItem);
    }
  } else {
    // Создаём новую запись истории
    record = {
      id: uid(),
      timestamp: new Date().toISOString(),
      mode: 'electronic',
      operator: (elecState.operator || '—').trim() || '—',
      line: elecState.line,
      shift: shiftLetter,
      date,
      brandPlanned: brand || null,
      brandActual: brand || '',
      brandReason: '',
      items: [newItem]
    };
    allHist.push(record);
  }

  setHistory(allHist);
  updateNavHistoryCounter();

  closeQuickCheckModal();

  // Перерисовываем матрицу недели
  renderElectronicWeekMatrix();

  // Если матрица в резюме — перерисуем и её
  if (typeof renderElectronicSummaryWeekMatrix === 'function') {
    const summaryVisible = $('#elecSummaryView')?.style.display !== 'none';
    if (summaryVisible) renderElectronicSummaryWeekMatrix();
  }

  showToast(quickCheckState.existing ? 'Проверка обновлена' : 'Проверка сохранена');
}

/* --- Обработчики модалки --- */
$('#quickCheckModalClose')?.addEventListener('click', closeQuickCheckModal);
$('#quickCheckCancelBtn')?.addEventListener('click', closeQuickCheckModal);
$('#quickCheckModal')?.addEventListener('click', (e) => {
  if (e.target.id === 'quickCheckModal') closeQuickCheckModal();
});

$('#quickCheckSaveBtn')?.addEventListener('click', saveQuickCheck);

// Live-обновление статуса при вводе значения
$('#qcValueInput')?.addEventListener('input', updateQcValueStatus);

/* Матрица недели внутри резюме — рендерится в отдельный контейнер */
function renderElectronicSummaryWeekMatrix() {
  const wrap = $('#elecSummaryWeekMatrix');
  if (!wrap) return;

  if (!elecState.line) {
    wrap.innerHTML = '<div class="empty-state">Линия не выбрана</div>';
    return;
  }

  // Переиспользуем логику: временно подменяем целевой контейнер
  const originalWrap = $('#elecWeekMatrix');
  if (!originalWrap) {
    // Если контейнера нет — создаём временный
    const temp = document.createElement('div');
    temp.id = 'elecWeekMatrix';
    temp.style.display = 'none';
    document.body.appendChild(temp);
  }

  // Вызываем существующую функцию — она заполнит #elecWeekMatrix
  renderElectronicWeekMatrix();

  // Переносим HTML из #elecWeekMatrix в наш контейнер
  const source = $('#elecWeekMatrix');
  if (source) {
    wrap.innerHTML = source.innerHTML;
  }
}

/* Модалка комментария — переиспользуем существующую, но в неё надо передать dataset.comment */
function openCommentModalElec(item) {
  currentCommentItem = item;
  const it = elecState.items.find(x => x.id === item.dataset.elecId);
  $('#commentModalPoint').textContent = it
    ? `${it.machine || ''} · ${it.paramName || ''}`
    : '';
  $('#commentText').value = item.dataset.comment || '';
  $('#commentModal').classList.add('active');
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

function getLines() { return load(STORAGE_KEYS.lines, [...DEFAULT_LINES]); }
function setLines(v) { save(STORAGE_KEYS.lines, v); }

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

function getLineBrands() { return load(STORAGE_KEYS.lineBrands, {}); }
function setLineBrands(v) { save(STORAGE_KEYS.lineBrands, v); }

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

function fillShifts() {
  const el = $('#shift');
  el.innerHTML = '<option value="">— выберите —</option>' +
    getShifts().map(s => `<option>${escapeHtml(s)}</option>`).join('');
}

function fillLinesForOperator() {
  const el = $('#lineSelect');
  const available = getAvailableLines();
  if (!available.length) {
    el.innerHTML = '<option value="">— нет доступных линий (добавьте бренды в Настройках) —</option>';
    return;
  }
  el.innerHTML = '<option value="">— выберите —</option>' +
    available.map(l => `<option>${escapeHtml(l)}</option>`).join('');
}

function fillBrandsForLine(line) {
  const brands = getBrandsForLine(line);
  ['#brandFrom','#brandTo'].forEach(sel => {
    const el = $(sel);
    el.innerHTML = '<option value="">— выберите —</option>' +
      brands.map(b => `<option>${escapeHtml(b)}</option>`).join('');
  });
  updateBrandToOptions();
}

/* Обновить опции brandTo: для Intermediate/Major убираем brandFrom */
function updateBrandToOptions() {
  const type = $('#transitionType').value;
  const line = $('#lineSelect').value;
  const brandFrom = $('#brandFrom').value;
  const brandToSelect = $('#brandTo');
  if (!brandToSelect || !line) return;

  const brands = getBrandsForLine(line);
  const isStrict = (type === 'Intermediate' || type === 'Major');

  let currentValue = brandToSelect.value;
  brandToSelect.innerHTML = '<option value="">— выберите —</option>' +
    brands
      .filter(b => !(isStrict && b === brandFrom))   // для strict — исключаем brandFrom
      .map(b => `<option>${escapeHtml(b)}</option>`)
      .join('');

  // Если текущее значение удалено (совпадало с brandFrom) — сбрасываем
  if (isStrict && currentValue === brandFrom) {
    brandToSelect.value = '';
  } else {
    // Восстанавливаем выбор, если он ещё доступен
    if (brands.includes(currentValue) && !(isStrict && currentValue === brandFrom)) {
      brandToSelect.value = currentValue;
    }
  }

  brandToSelect.classList.remove('input-error');
}

$('#lineSelect').addEventListener('change', () => {
  const line = $('#lineSelect').value;
  $('#brandFrom').value = '';
  $('#brandTo').value = '';
  if (line) fillBrandsForLine(line);
  updateChecklist();
});

$('#partSelect').addEventListener('change', () => {
  const type = $('#transitionType').value;

  // Если выбран Minor — перерисовать чекбоксы «Что меняется»
  if (type === 'Minor') {
    renderMaterialChanges();
  }
  // Для Intermediate/Major — перерисовать узлы (они зависят от Maker/Packer)
  else if (type === 'Intermediate' || type === 'Major') {
    renderNodes();
  }

  updateChecklist();
});

/* Клик по кнопке-чипу */
document.querySelectorAll('.type-option').forEach(btn => {
  btn.addEventListener('click', () => {
    const value = btn.dataset.value;
    document.querySelectorAll('.type-option').forEach(b => b.classList.remove('active'));
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
    $('#nodesCard').style.display = 'none';
    $('#checklistCard').style.display = 'none';
    return;
  }
  $('#brandsCard').style.display = 'block';

  if (type === 'Minor') {
    $('#changesCard').style.display = 'block';
    $('#changesTitle').textContent = '5. Что меняется';
    renderMaterialChanges();
    $('#nodesCard').style.display = 'none';
  } else {
    $('#changesCard').style.display = 'none';
    $('#nodesCard').style.display = 'block';
    $('#nodesTitle').textContent = (type === 'Intermediate')
      ? '5. Замена узлов (до 3)'
      : '5. Замена узлов (более 3)';
    renderNodes();
  }
  updateChecklist();
}

function renderMaterialChanges() {
  const c = $('#changesContainer');
  const part = $('#partSelect').value;   // Maker / Packer

  // Берём список изменений для конкретной части линии
  const items = MINOR_CHANGES_BY_PART[part] || [];

  if (!items.length) {
    c.innerHTML = '<div class="empty-state" style="padding:20px">Для этой части линии нет настроенных изменений.</div>';
    return;
  }

  c.innerHTML = '<div class="checkbox-group">' +
    items.map(m =>
      `<label><input type="checkbox" value="${m.value}" data-change> ${escapeHtml(m.label)}</label>`
    ).join('') + '</div>';

  c.querySelectorAll('input[data-change]').forEach(cb => {
    cb.addEventListener('change', (e) => {
      e.target.closest('label').classList.toggle('checked', e.target.checked);
      updateChecklist();
    });
  });
}
/* ============================================================
   ЗАМЕНА УЗЛОВ — для Intermediate / Major
   ============================================================ */
function renderNodes() {
  const c = $('#nodesContainer');
  const part = $('#partSelect').value;

  // Берём узлы из настроек, фильтруем по части
  let nodes = (typeof getNodes === 'function' ? getNodes() : []);
  if (part) {
    nodes = nodes.filter(n => n.part === 'Both' || n.part === part);
  }

  if (!nodes.length) {
    c.innerHTML = '<div class="empty-state" style="padding:20px">Нет узлов для этой части линии. Добавьте их в Настройках.</div>';
    return;
  }

  c.innerHTML = '<div class="checkbox-group">' +
    nodes.map(n =>
      `<label><input type="checkbox" value="${escapeHtml(n.name)}" data-node> ${escapeHtml(n.name)} <span style="font-size:10px;opacity:0.7">[${n.part}]</span></label>`
    ).join('') + '</div>';

  c.querySelectorAll('input[data-node]').forEach(cb => {
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

  if (type === 'Minor') {
    $$('#changesContainer input[data-change]:checked').forEach(cb => {
      const val = cb.value;

      // «Табак + Материалы» = активирует И «Табак», И «Материалы»
      if (val === 'tobacco_materials') {
        triggers.push('tobacco');
        triggers.push('materials');
      }
      // «Материалы» — общий триггер, добавляем как есть
      else {
        triggers.push(val);
      }
    });
  } else {
    $$('#nodesContainer input[data-node]:checked').forEach(cb => {
      triggers.push('node:' + cb.value);
    });
  }

  return triggers;
}

function updateChecklist() {
  const type = $('#transitionType').value;
  const line = $('#lineSelect').value;
  const part = $('#partSelect').value;

  if (!type || !line || !part) {
    $('#checklistCard').style.display = 'none';
    return;
  }

  const triggers = getSelectedTriggers();
  const all = getStandards();

  const relevant = all.filter(st => {
    // 0. Активность — неактивные не показываем оператору
    if (st.active === false) return false;

    // 1. Тип перехода — стандарт должен подходить под текущий тип
    if (!st.appliesTo || !st.appliesTo.includes(type)) return false;

    // 2. Линия — одна линия, не массив
    if (st.line !== line) return false;

    // 3. Часть линии — nodePart (Maker / Packer), поле nodePart
    if (st.nodePart && st.nodePart !== part) return false;

    // 4. Триггеры — если у стандарта они есть, должен совпасть хотя бы один
    if (!st.triggers || st.triggers.length === 0) return true;
    return st.triggers.some(t => triggers.includes(t));
  });

  renderChecklist(relevant);
}

function renderChecklist(items) {
  const c = $('#checklistContainer');
  if (!items.length) {
    c.innerHTML = '<div class="empty-state">Нет стандартов для выбранных условий.<br>Добавьте их во вкладке «Редактор стандартов».</div>';
    $('#checklistCard').style.display = 'block';
    updateProgress();
    return;
  }

  c.innerHTML = items.map(st => {
    // Главное значение — из measurements[0].value (первая точка)
    const mainValue = (st.measurements && st.measurements[0] && st.measurements[0].value) || '';
    const mainSorts = (st.measurements && st.measurements[0] && st.measurements[0].sorts) || '';

    let answerHtml = '';
    if (st.controlType === 'ok_not_ok') {
      answerHtml = `
        <div class="radio-group">
          <label><input type="radio" name="ans_${st.id}" value="OK" data-ans> ОК</label>
          <label><input type="radio" name="ans_${st.id}" value="FAIL" data-ans> Не ОК</label>
        </div>`;
    } else if (st.controlType === 'value_input') {
      answerHtml = `
        <div class="answer-field">
          <input type="number" step="any" data-ans-value placeholder="0">
        </div>`;
    } else if (st.controlType === 'tolerance') {
      answerHtml = `
        <div class="answer-field">
          <input type="number" step="any" data-ans-value placeholder="0">
        </div>
        <div class="radio-group">
          <label><input type="radio" name="tol_${st.id}" value="OK" data-tol> В допуске</label>
          <label><input type="radio" name="tol_${st.id}" value="FAIL" data-tol> Не в допуске</label>
        </div>`;
    }
    return `
      <div class="checklist-item" data-std-id="${st.id}">
        <div class="meta">
          <span><strong>Часть:</strong> ${escapeHtml(st.nodePart || '—')}</span>
          ${st.machine ? `<span><strong>Машина:</strong> ${escapeHtml(st.machine)}</span>` : ''}
          <span><strong>OPL:</strong> ${escapeHtml(st.oplNumber || '—')}</span>
          <span><strong>Узел:</strong> ${escapeHtml(st.node || '—')}</span>
        </div>
        <div class="title">${escapeHtml(st.title || '')}</div>
        <div class="answer">
          ${answerHtml}
          <div class="answer-actions">
            <button type="button" class="view-btn" data-view-btn data-std-id="${st.id}" title="Посмотреть стандарт">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
            </button>
            <button type="button" class="comment-btn" data-comment-btn title="Добавить комментарий">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                <line x1="9" y1="10" x2="15" y2="10"/>
                <line x1="9" y1="14" x2="13" y2="14"/>
              </svg>
            </button>
          </div>
        </div>
        <div class="comment-preview" style="display:none" data-comment-preview></div>
      </div>`;
  }).join('');

  c.querySelectorAll('input[data-ans], input[data-tol]').forEach(r => {
    r.addEventListener('change', (e) => {
      const item = e.target.closest('.checklist-item');
      const val = e.target.value;
      item.classList.remove('answered-ok','answered-fail');
      if (val === 'OK') item.classList.add('answered-ok');
      if (val === 'FAIL') item.classList.add('answered-fail');
      updateCommentUrgency(item);
      updateProgress();
    });
  });
  c.querySelectorAll('input[data-ans-value]').forEach(inp => {
    inp.addEventListener('input', updateProgress);
  });

  c.querySelectorAll('[data-comment-btn]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const item = e.target.closest('.checklist-item');
      openCommentModal(item);
    });
  });
    /* --- НОВОЕ: кнопка «Просмотр стандарта» --- */
  c.querySelectorAll('[data-view-btn]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const stdId = btn.dataset.stdId;
      if (stdId) openStandardView(stdId);
    });
  });

  $('#checklistCard').style.display = 'block';
  updateProgress();
}
function updateProgress() {
  const items = $$('#checklistContainer .checklist-item');
  const wrap = $('#progressWrap');
  const bar = $('#progressBarInner');
  const percent = $('#progressPercent');
  const text = $('#progressText');
  const badge = $('#progressBadge');

  // Нет стандартов вообще — скрываем шкалу, бейдж очищаем
  if (!items.length) {
    badge.textContent = '';
    badge.className = 'progress-badge';
    wrap.style.display = 'none';
    text.style.display = 'none';
    return;
  }

  // Считаем заполненные
  let filled = 0;
  items.forEach(item => {
    const valueFilled = (() => {
      const inp = item.querySelector('input[data-ans-value]');
      return inp && inp.value !== '';
    })();
    const std = getStandards().find(s => s.id === item.dataset.stdId);
    if (!std) return;
    if (std.controlType === 'ok_not_ok') {
      if (item.querySelector('input[data-ans]:checked')) filled++;
    } else if (std.controlType === 'value_input') {
      if (valueFilled) filled++;
    } else if (std.controlType === 'tolerance') {
      if (valueFilled && item.querySelector('input[data-tol]:checked')) filled++;
    }
  });

  const total = items.length;
  const pct = total > 0 ? Math.round((filled / total) * 100) : 0;

  // Показываем шкалу
  wrap.style.display = 'flex';
  text.style.display = 'block';

  // Обновляем полосу и цвет
  bar.style.width = pct + '%';
  bar.classList.remove('low', 'mid', 'high', 'done');
  if (pct === 100)      bar.classList.add('done');
  else if (pct >= 67)   bar.classList.add('high');
  else if (pct >= 34)   bar.classList.add('mid');
  else                  bar.classList.add('low');

  // Проценты
  percent.textContent = pct + '%';

  // Текст под шкалой
  text.textContent = `Заполнено ${filled} из ${total} пунктов`;

  // Бейдж в заголовке (как было)
  badge.textContent = `Заполнено ${filled} из ${total}`;
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
  $('#commentModal').classList.add('active');
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
    case 'ok_not_ok':    return 'ОК / Не ОК';
    case 'value_input':  return 'Ввод значения';
    case 'tolerance':    return 'В допуске / Не в допуске';
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

  modal.classList.add('active');
};

/* Отрисовать чипы для шапки модалки */
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

  // Точки замера — показываем только заполненные
  const filledPoints = (st.measurements || []).filter(m => (m.value && m.value.trim()) || (m.sorts && m.sorts.trim()));
  const pointsHtml = filledPoints.length ? `
    <div class="sv-section">
      <div class="sv-section-title">Точки замера</div>
      <table class="sv-points">
        <thead>
          <tr>
            <th>Точка</th>
            <th>Значение</th>
            <th>Сорта</th>
          </tr>
        </thead>
        <tbody>
          ${filledPoints.map(m => `
            <tr>
              <td>${escapeHtml(String(m.point || '—'))}</td>
              <td>${escapeHtml(m.value || '—')}</td>
              <td>${escapeHtml(m.sorts || '—')}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
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
  const modal = $('#standardViewModal');
  if (modal) modal.classList.remove('active');
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
  modal.classList.add('active');
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
  const modal = $('#lightboxModal');
  if (modal) modal.classList.remove('active');
  document.removeEventListener('keydown', lightboxKeyHandler);
  // Сбрасываем src, чтобы браузер не «держал» картинку
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
  $('#commentModal').classList.remove('active');
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
  const operator = $('#operatorName').value.trim();
  const shift = $('#shift').value;
  const line = $('#lineSelect').value;
  const part = $('#partSelect').value;
  const type = $('#transitionType').value;
  const brandFrom = $('#brandFrom').value;
  const brandTo = $('#brandTo').value;
  const customNode = $('#customNode').value.trim();

if (!operator) return showToast('Укажите ФИО оператора', true);
if (!shift) return showToast('Укажите смену', true);
if (!line) return showToast('Укажите линию', true);
if (!part) return showToast('Укажите часть линии', true);
if (!type) return showToast('Укажите тип перехода', true);
if (!brandFrom || !brandTo) return showToast('Укажите бренды', true);

/* Для Intermediate и Major смена бренда обязательна: A → A запрещено */
if ((type === 'Intermediate' || type === 'Major') && brandFrom === brandTo) {
  return showToast(`Для ${type} бренд должен измениться: нельзя ${brandFrom} → ${brandTo}`, true);
}

  const items = [];
  let hasEmpty = false;
  $$('#checklistContainer .checklist-item').forEach(item => {
    const id = item.dataset.stdId;
    const st = getStandards().find(s => s.id === id);
    if (!st) return;

    let answer = null;
    let status = null;

    if (st.controlType === 'ok_not_ok') {
      const r = item.querySelector('input[data-ans]:checked');
      if (!r) { hasEmpty = true; return; }
      answer = r.value === 'OK' ? 'ОК' : 'Не ОК';
      status = r.value;
    } else if (st.controlType === 'value_input') {
      const v = item.querySelector('input[data-ans-value]').value;
      if (v === '') { hasEmpty = true; return; }
      answer = v + (st.unit ? ' ' + st.unit : '');
      status = 'OK';
    } else if (st.controlType === 'tolerance') {
      const v = item.querySelector('input[data-ans-value]').value;
      const r = item.querySelector('input[data-tol]:checked');
      if (v === '' || !r) { hasEmpty = true; return; }
      answer = v + (st.unit ? ' ' + st.unit : '') + ' — ' + (r.value === 'OK' ? 'в допуске' : 'не в допуске');
      status = r.value;
    }

    // Главное значение из measurements[0]
    const mainValue = (st.measurements && st.measurements[0] && st.measurements[0].value) || '';

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
    triggers,
    customNode: customNode || '',
    items
  };

  const hist = getHistory();
  hist.push(record);
  setHistory(hist);
  updateNavHistoryCounter();

  showToast('Проверка сохранена');
  resetCheckForm();
});

$('#resetCheckBtn').addEventListener('click', resetCheckForm);

function resetCheckForm() {
  $('#operatorName').value = '';
  $('#shift').value = '';
  $('#lineSelect').value = '';
  $('#partSelect').value = '';
  $('#transitionType').value = '';
  document.querySelectorAll('.type-option').forEach(b => b.classList.remove('active'));
  $('#brandFrom').value = '';
  $('#brandTo').value = '';
  $('#customNode').value = '';
  $('#brandsCard').style.display = 'none';
  $('#changesCard').style.display = 'none';
  $('#nodesCard').style.display = 'none';
  $('#checklistCard').style.display = 'none';
  $('#checklistContainer').innerHTML = '';
  $('#changesContainer').innerHTML = '';
  $('#nodesContainer').innerHTML = '';
  $('#progressBadge').textContent = '';
  $('#progressWrap').style.display = 'none';
  $('#progressText').style.display = 'none';
  $('#progressBarInner').style.width = '0%';
  $('#progressPercent').textContent = '0%';
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
          } else if (isElec) {
            const brandBadge = `<span class="badge badge-mode-electronic">${escapeHtml(h.brandActual || '—')}</span>`;
            const planNote = (h.brandPlanned && h.brandPlanned !== h.brandActual)
              ? ` <span style="font-size:11px;color:var(--accent-amber);font-style:italic">(план: ${escapeHtml(h.brandPlanned)})</span>`
              : '';
            contextHtml = brandBadge + planNote;
          } else {
            const badgeCls = h.type === 'Minor' ? 'badge-minor' :
                            h.type === 'Intermediate' ? 'badge-intermediate' : 'badge-major';
            contextHtml = `
              <span class="badge ${badgeCls}">${escapeHtml(h.type || '—')}</span>
              <span class="history-brands">${escapeHtml(h.brandFrom || '—')} → ${escapeHtml(h.brandTo || '—')}</span>
            `;
          }

          // --- Бейдж режима ---
          const modeBadge = isTopLoss
            ? `<span class="badge badge-mode-toploss">TOP</span>`
            : (isElec
                ? `<span class="badge badge-mode-electronic">E-PARAM</span>`
                : `<span class="badge badge-mode-cocl">COCL</span>`);

          // --- Колонка «Не проверено» ---
          const uncheckedHtml = unchecked > 0
            ? `<span class="badge badge-unchecked">${unchecked}</span>`
            : ((isTopLoss || isElec) ? '<span class="badge badge-ok">0</span>' : '—');

          return `
            <tr>
              <td>${fmtDate(h.timestamp)}</td>
              <td>${modeBadge}</td>
              <td>${escapeHtml(h.operator)}</td>
              <td>${escapeHtml(h.shift || '—')}</td>
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
          : '<span class="badge badge-mode-cocl">COCL</span>'}
      </div>
      <div><strong>Дата:</strong> ${fmtDate(h.timestamp)}</div>
      <div><strong>Оператор:</strong> ${escapeHtml(h.operator)}</div>
      <div><strong>Смена:</strong> ${escapeHtml(h.shift)}</div>
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
              <td>${escapeHtml(it.norm || '—')}</td>
              <td>${answerHtml}</td>
              <td>${it.comment ? escapeHtml(it.comment) : '—'}</td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  `;
  $('#recordModalBody').innerHTML = html;
  $('#recordModal').classList.add('active');
};

function closeRecordModal() {
  $('#recordModal').classList.remove('active');
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
    'Пунктов','Не ОК','Детали проверки'
  ];
  const rows = [headers];

  hist.forEach(h => {
    const fails = h.items.filter(i => i.status === 'FAIL').length;
    const triggersText = (h.triggers || []).map(t => t.replace('node:','')).join(', ');
    const isTopLoss = h.mode === 'toploss';

    // Режим: текст
    const modeText = isTopLoss ? 'Top Losses' : 'COCL';

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
      h.shift,
      h.line,
      h.part || '',
      isTopLoss ? '' : (h.type || ''),
      isTopLoss ? '' : (h.brandFrom || ''),
      isTopLoss ? '' : (h.brandTo || ''),
      lossesText,
      isTopLoss ? '' : triggersText,
      h.customNode || '',
      h.items.length,
      fails,
      buildDetailsText(h)
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
  'Пунктов','Не ОК','Детали проверки'
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
  12,   // Смена
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
  100   // Детали проверки
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
    const modeText = isTopLoss ? 'Top Losses' : 'COCL';
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
      h.shift,
      h.line,
      h.part || '',
      isTopLoss ? '' : (h.type || ''),
      isTopLoss ? '' : (h.brandFrom || ''),
      isTopLoss ? '' : (h.brandTo || ''),
      lossesText,
      isTopLoss ? '' : triggersText,
      h.customNode || '',
      h.items.length,
      fails,
      buildDetailsText(h)
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

    if (!byLine[h.line]) byLine[h.line] = { checks: 0, items: 0, fails: 0 };
    byLine[h.line].checks++;
    byLine[h.line].items += h.items.length;
    byLine[h.line].fails += f;

    if (!byOperator[h.operator]) byOperator[h.operator] = { checks: 0, fails: 0 };
    byOperator[h.operator].checks++;
    byOperator[h.operator].fails += f;

    if (!byType[h.type]) byType[h.type] = { checks: 0, fails: 0 };
    byType[h.type].checks++;
    byType[h.type].fails += f;

    const bKey = h.brandFrom + ' → ' + h.brandTo;
    if (!byBrand[bKey]) byBrand[bKey] = { checks: 0, fails: 0 };
    byBrand[bKey].checks++;
    byBrand[bKey].fails += f;

    if (!byShift[h.shift]) byShift[h.shift] = { checks: 0, fails: 0 };
    byShift[h.shift].checks++;
    byShift[h.shift].fails += f;

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

  addTitle('🔄 По типам переходов');
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

/* ----------------------------------------
   Отрисовка чек-листа TOP Losses
   ---------------------------------------- */
function renderTopLossChecklist(items, standardToLosses, lossIds) {
  const container = $('#tlChecklistView');
  if (!container) return;

  // Кэшируем
  tlState.currentItems = items;
  tlState.currentStandardToLosses = standardToLosses;
  tlState.currentLossIds = lossIds;

  // Формируем чипы потерь (адаптивно — первые 3 + «+N»)
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

  let html = `
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
          Это <strong>помощник проверки</strong>. Изучите стандарты, которые влияют
          на выбранные потери. Можете просто посмотреть — или отметить, <em>хотя бы 1 стандарт ОК / Не ОК</em>,
          чтобы сохранить результат в Историю.
        </div>
      </div>
    </div>

    <div class="card">
      <div id="tlChecklistContainer">
        ${items.map(st => renderTopLossChecklistItem(st, standardToLosses[st.id] || [])).join('')}
      </div>
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

  container.innerHTML = html;

  // Делегированные обработчики
  bindTopLossChecklistEvents();

  // Обновляем прогресс и активность кнопки
  updateTlProgressFooter();
}

/* Привязка всех обработчиков внутри списка */
function bindTopLossChecklistEvents() {
  const container = $('#tlChecklistContainer');
  if (!container) return;

  // Кнопка «Оценить» — раскрыть блок ответа
  container.querySelectorAll('[data-evaluate-btn]').forEach(btn => {
    btn.addEventListener('click', () => {
      const stdId = btn.dataset.evaluateBtn;
      toggleAnswerBlock(stdId, true);
    });
  });

  // Кнопка «Свернуть» — скрыть блок ответа
  container.querySelectorAll('[data-collapse-btn]').forEach(btn => {
    btn.addEventListener('click', () => {
      const stdId = btn.dataset.collapseBtn;
      toggleAnswerBlock(stdId, false);
    });
  });

  // Радио ОК / Не ОК, tolerance
  container.querySelectorAll('input[data-ans], input[data-tol]').forEach(r => {
    r.addEventListener('change', (e) => {
      const item = e.target.closest('.checklist-item');
      const val = e.target.value;
      item.classList.remove('answered-ok', 'answered-fail');
      if (val === 'OK') item.classList.add('answered-ok');
      if (val === 'FAIL') item.classList.add('answered-fail');
      updateCommentUrgency(item);
      updateItemAnsweredBadge(item);
      updateTlProgressFooter();
    });
  });

  // Поля ввода значения
  container.querySelectorAll('input[data-ans-value]').forEach(inp => {
    inp.addEventListener('input', (e) => {
      const item = e.target.closest('.checklist-item');
      updateItemAnsweredBadge(item);
      updateTlProgressFooter();
    });
  });

  // Иконка комментария
  container.querySelectorAll('[data-comment-btn]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const item = e.target.closest('.checklist-item');
      openCommentModal(item);
    });
  });

  // Иконка глаза
  container.querySelectorAll('[data-view-btn]').forEach(btn => {
    btn.addEventListener('click', () => {
      const stdId = btn.dataset.stdId;
      if (stdId) openStandardView(stdId);
    });
  });

  // Кнопки футера
  $('#tlBackToSelectBtn')?.addEventListener('click', backToTopLossSelect);
  $('#tlSaveChecklistBtn')?.addEventListener('click', saveTopLossCheck);
    // Кнопка «+N» — показать все потери
  $('#tlShowAllLossesBtn')?.addEventListener('click', () => {
    const allLossObjects = tlState.currentLossIds
      .map(id => findLossById(id))
      .filter(Boolean);

    const names = allLossObjects.map(l => l.name).join('\n');
    alert('Все потери:\n\n' + names);
  });
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

  if (st.controlType === 'ok_not_ok') {
    const checked = item.querySelector('input[data-ans]:checked');
    if (checked) {
      badge = checked.value === 'OK'
        ? { cls: 'tl-answered-badge-ok', text: '✓ ОК' }
        : { cls: 'tl-answered-badge-fail', text: '✕ Не ОК' };
    }
  } else if (st.controlType === 'value_input') {
    const inp = item.querySelector('input[data-ans-value]');
    if (inp && inp.value !== '') {
      badge = { cls: 'tl-answered-badge-ok', text: '✓ ' + inp.value };
    }
  } else if (st.controlType === 'tolerance') {
    const inp = item.querySelector('input[data-ans-value]');
    const r = item.querySelector('input[data-tol]:checked');
    if (inp && inp.value !== '' && r) {
      badge = r.value === 'OK'
        ? { cls: 'tl-answered-badge-ok', text: '✓ ' + inp.value }
        : { cls: 'tl-answered-badge-fail', text: '✕ ' + inp.value };
    }
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

  const items = $$('#tlChecklistContainer .checklist-item');

  let filled = 0;
  items.forEach(item => {
    const std = getStandards().find(s => s.id === item.dataset.stdId);
    if (!std) return;

    const valueFilled = (() => {
      const inp = item.querySelector('input[data-ans-value]');
      return inp && inp.value !== '';
    })();

    if (std.controlType === 'ok_not_ok') {
      if (item.querySelector('input[data-ans]:checked')) filled++;
    } else if (std.controlType === 'value_input') {
      if (valueFilled) filled++;
    } else if (std.controlType === 'tolerance') {
      if (valueFilled && item.querySelector('input[data-tol]:checked')) filled++;
    }
  });

  const total = items.length;
  const pct = total > 0 ? Math.round((filled / total) * 100) : 0;

  footer.querySelectorAll('.tl-footer-progress').forEach(el => el.remove());

  if (filled > 0 && total > 0) {
    const unchecked = total - filled;
    const progressHtml = `
      <div class="tl-footer-progress">
        <div class="progress-bar-outer">
          <div class="progress-bar-inner" style="width:${pct}%"></div>
        </div>
        <div class="progress-text">
          Отмечено: ${filled} / ${total}${unchecked > 0 ? ` · не проверено: ${unchecked}` : ''}
        </div>
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
   Отрисовка одного пункта чек-листа TOP Losses
   ---------------------------------------- */
function renderTopLossChecklistItem(st, lossIds) {
  // Строка «Относится к: …»
  const lossNames = lossIds
    .map(id => findLossById(id))
    .filter(Boolean)
    .map(l => l.name);

  const lossesText = lossNames.length
    ? `<div class="tl-item-losses">Относится к: ${lossNames.map(escapeHtml).join(' · ')}</div>`
    : '';

  // Содержимое блока ответа — в зависимости от типа контроля
  let answerBodyHtml = '';
  if (st.controlType === 'ok_not_ok') {
    answerBodyHtml = `
      <div class="answer-row">
        <div class="radio-group">
          <label><input type="radio" name="tl_ans_${st.id}" value="OK" data-ans> ОК</label>
          <label><input type="radio" name="tl_ans_${st.id}" value="FAIL" data-ans> Не ОК</label>
        </div>
        <button type="button" class="comment-btn" data-comment-btn title="Добавить комментарий">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            <line x1="9" y1="10" x2="15" y2="10"/>
            <line x1="9" y1="14" x2="13" y2="14"/>
          </svg>
        </button>
      </div>`;
  } else if (st.controlType === 'value_input') {
    answerBodyHtml = `
      <div class="answer-row">
        <div class="answer-field">
          <input type="number" step="any" data-ans-value placeholder="0">
        </div>
        <button type="button" class="comment-btn" data-comment-btn title="Добавить комментарий">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            <line x1="9" y1="10" x2="15" y2="10"/>
            <line x1="9" y1="14" x2="13" y2="14"/>
          </svg>
        </button>
      </div>`;
  } else if (st.controlType === 'tolerance') {
    answerBodyHtml = `
      <div class="answer-row">
        <div class="answer-field">
          <input type="number" step="any" data-ans-value placeholder="0">
        </div>
        <div class="radio-group">
          <label><input type="radio" name="tl_tol_${st.id}" value="OK" data-tol> В допуске</label>
          <label><input type="radio" name="tl_tol_${st.id}" value="FAIL" data-tol> Не в допуске</label>
        </div>
        <button type="button" class="comment-btn" data-comment-btn title="Добавить комментарий">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            <line x1="9" y1="10" x2="15" y2="10"/>
            <line x1="9" y1="14" x2="13" y2="14"/>
          </svg>
        </button>
      </div>`;
  }

  return `
    <div class="checklist-item" data-std-id="${escapeAttr(st.id)}">
      <div class="meta">
        <span><strong>Часть:</strong> ${escapeHtml(st.nodePart || '—')}</span>
        ${st.machine ? `<span><strong>Машина:</strong> ${escapeHtml(st.machine)}</span>` : ''}
        <span><strong>OPL:</strong> ${escapeHtml(st.oplNumber || '—')}</span>
        <span><strong>Узел:</strong> ${escapeHtml(st.node || '—')}</span>
      </div>
      <div class="title">${escapeHtml(st.title || '')}</div>
      ${lossesText}

      <div class="tl-item-actions-row">
        <button type="button" class="view-btn" data-view-btn data-std-id="${escapeAttr(st.id)}" title="Посмотреть стандарт">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
        </button>
        <button type="button" class="tl-evaluate-btn" data-evaluate-btn="${escapeAttr(st.id)}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="9 11 12 14 22 4"/>
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
          </svg>
          <span>Оценить</span>
        </button>
        <button type="button" class="tl-collapse-btn" data-collapse-btn="${escapeAttr(st.id)}" style="display:none">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="18 15 12 9 6 15"/>
          </svg>
          <span>Свернуть</span>
        </button>
      </div>

      <div class="tl-answer-block">
        ${answerBodyHtml}
      </div>

      <div class="comment-preview" style="display:none" data-comment-preview></div>
    </div>`;
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
    const valueFilled = (() => {
      const inp = item.querySelector('input[data-ans-value]');
      return inp && inp.value !== '';
    })();
    if (std.controlType === 'ok_not_ok') {
      if (item.querySelector('input[data-ans]:checked')) filled++;
    } else if (std.controlType === 'value_input') {
      if (valueFilled) filled++;
    } else if (std.controlType === 'tolerance') {
      if (valueFilled && item.querySelector('input[data-tol]:checked')) filled++;
    }
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

  $$('#tlChecklistContainer .checklist-item').forEach(item => {
    const stdId = item.dataset.stdId;
    const st = getStandards().find(s => s.id === stdId);
    if (!st) return;

    let answer = '—';
    let status = 'UNCHECKED';

    if (st.controlType === 'ok_not_ok') {
      const r = item.querySelector('input[data-ans]:checked');
      if (r) {
        answer = r.value === 'OK' ? 'ОК' : 'Не ОК';
        status = r.value;
      }
    } else if (st.controlType === 'value_input') {
      const v = item.querySelector('input[data-ans-value]').value;
      if (v !== '') {
        answer = v;
        status = 'OK';
      }
    } else if (st.controlType === 'tolerance') {
      const v = item.querySelector('input[data-ans-value]').value;
      const r = item.querySelector('input[data-tol]:checked');
      if (v !== '' && r) {
        answer = v + ' — ' + (r.value === 'OK' ? 'в допуске' : 'не в допуске');
        status = r.value;
      }
    }

    const mainValue = (st.measurements && st.measurements[0] && st.measurements[0].value) || '';

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
  renderLinesSettings();
  renderLineMachinesSettings();
  renderTopLossesSettings();
  renderBrandsSettings();
  renderLineBrandsSettings();
  renderOperatorsSettings();
}
/* ============================================================
   ДАШБОРД
   ============================================================ */
function renderDashboard() {
  const container = $('#dashboardContent');
  if (!container) return;

  const stats = calculateDashboardStats();

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
      <div></div>
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
function calculateDashboardStats() {
  const standards = getStandards();
  const history = getHistory();
  const brands = getBrands();
  const operators = getOperators();

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
  const typeCounts = { Minor: 0, Intermediate: 0, Major: 0 };
  monthChecks.forEach(h => {
    if (h.type && typeCounts[h.type] !== undefined) {
      typeCounts[h.type]++;
    }
  });
  const typesTotal = typeCounts.Minor + typeCounts.Intermediate + typeCounts.Major;

  // Проценты для conic-gradient
  const typeColors = {
    Minor: '#00d4ff',
    Intermediate: '#ffa94d',
    Major: '#ff4d6d'
  };
  let acc = 0;
  const typeSegments = [];
  ['Minor', 'Intermediate', 'Major'].forEach(type => {
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
    standardsWithoutLosses
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

  // Показываем модалку с индикатором загрузки
  body.innerHTML = '<div class="cp-empty">Проверка…</div>';
  modal.classList.add('active');

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
  const modal = $('#checkPhotosModal');
  if (modal) modal.classList.remove('active');
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
   БЛОКИ ЛИНИЙ
   ============================================================ */
function renderBlocksSettings() {
  const blocks = getBlocks();
  const list = $('#blocksList');
  if (!list) return;

  if (!blocks.length) {
    list.innerHTML = '<div class="empty-state">Блоков нет. Нажмите «Добавить».</div>';
    return;
  }

  const allLines = getLines();

  list.innerHTML = blocks.map(b => {
    const blockLines = (b.lines || []).filter(l => allLines.includes(l));
    const linesText = blockLines.length
      ? `${blockLines.length} ${pluralizeLines(blockLines.length)}: ${blockLines.map(escapeHtml).join(', ')}`
      : '<span style="color:var(--accent-red);font-style:italic">— нет линий</span>';

    return `
      <div class="block-row">
        <div class="block-row-info">
          <div class="block-row-name">${escapeHtml(b.name || 'Без названия')}</div>
          <div class="block-row-lines">${linesText}</div>
        </div>
        <div class="block-row-actions">
          <button class="btn btn-secondary btn-sm" onclick="openBlockModal('${b.id}')">Изменить состав</button>
          <button class="btn btn-danger btn-sm" onclick="deleteBlock('${b.id}')">Удалить</button>
        </div>
      </div>
    `;
  }).join('');
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
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return 'линия';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return 'линии';
  return 'линий';
}
/* Добавить блок */
$('#addBlockBtn')?.addEventListener('click', () => {
  const nameInput = $('#newBlockNameInput');
  const name = nameInput.value.trim();
  if (!name) return showToast('Введите название блока', true);

  const blocks = getBlocks();
  if (blocks.some(b => b.name.toLowerCase() === name.toLowerCase())) {
    return showToast('Блок с таким названием уже есть', true);
  }

  const newId = 'block_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
  blocks.push({ id: newId, name, lines: [] });
  setBlocks(blocks);
  nameInput.value = '';
  renderBlocksSettings();
  showToast('Блок добавлен');

  // Сразу открываем модалку редактирования нового блока
  openBlockModal(newId);
});

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

  setBlocks(blocks.filter(b => b.id !== id));
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

  // Рендер чекбоксов линий
  const group = $('#blockModalLinesGroup');
  const allLines = getLines();
  const otherLines = blocks
    .filter(b => b.id !== blockId)
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

  modal.classList.add('active');
  setTimeout(() => $('#blockModalName').focus(), 100);
};

function closeBlockModal() {
  const modal = $('#blockModal');
  if (modal) modal.classList.remove('active');
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

/* Сохранить */
$('#blockModalSaveBtn')?.addEventListener('click', () => {
  const blockId = $('#blockModalId').value;
  const name = $('#blockModalName').value.trim();
  if (!blockId) return;
  if (!name) return showToast('Введите название блока', true);

  const blocks = getBlocks();
  const block = blocks.find(b => b.id === blockId);
  if (!block) return;

  // Проверка дубликата названия (кроме самого себя)
  if (blocks.some(b => b.id !== blockId && b.name.toLowerCase() === name.toLowerCase())) {
    return showToast('Блок с таким названием уже есть', true);
  }

  // Собираем выбранные линии
  const selectedLines = [...$$('#blockModalLinesGroup input:checked')].map(cb => cb.value);

  block.name = name;
  block.lines = selectedLines;

  setBlocks(blocks);
  renderBlocksSettings();
  closeBlockModal();
  showToast('Блок обновлён');
});
/* ============================================================
   МАШИНЫ ДЛЯ ЛИНИЙ — плитки
   ============================================================ */
function renderLineMachinesSettings() {
  const lines = getLines();
  const lm = getLineMachines();
  const container = $('#lineMachinesContainer');
  if (!container) return;

  if (!lines.length) {
    container.innerHTML = '<div class="empty-state">Сначала добавьте линии</div>';
    return;
  }

  container.innerHTML = '<div class="lm-tiles-grid">' + lines.map(line => {
    const machines = Array.isArray(lm[line]) ? lm[line] : [];
    const count = machines.length;
    const countText = count === 0
      ? 'Нет машин'
      : `${count} ${pluralizeMachines(count)}`;

    // Превью — список машин
    const preview = count === 0
      ? 'Нажмите, чтобы добавить'
      : machines.slice(0, 4).join(', ') + (count > 4 ? ` …+${count - 4}` : '');

    const safeLine = escapeAttr(line);

    return `
      <div class="lm-tile" onclick="openMachinesListModal('${safeLine}')" title="${safeLine}">
        <div class="lm-tile-name">${escapeHtml(line)}</div>
        <div class="lm-tile-count">${countText}</div>
        <div class="lm-tile-preview">${escapeHtml(preview)}</div>
      </div>
    `;
  }).join('') + '</div>';
}
/* ============================================================
   TOP LOSSES — плитки в настройках
   ============================================================ */

function renderTopLossesSettings() {
  const container = $('#topLossesContainer');
  if (!container) return;

  const cats = getTopLosses();

  if (!cats.length) {
    container.innerHTML = '<div class="empty-state">Категорий нет. Нажмите «Добавить категорию».</div>';
    return;
  }

  container.innerHTML = '<div class="tl-tiles-grid">' + cats.map(cat => {
    const items = Array.isArray(cat.items) ? cat.items : [];
    const count = items.length;
    const countText = count === 0
      ? 'Нет потерь'
      : `${count} ${pluralizeLosses(count)}`;

    // Превью — первые 3 потери
    const preview = count === 0
      ? 'Нажмите, чтобы добавить потери'
      : items.slice(0, 3).map(it => it.name).join(', ') + (count > 3 ? ` …+${count - 3}` : '');

    return `
      <div class="tl-tile" onclick="openTopLossCategoryItemsModal('${escapeAttr(cat.id)}')">
        <div class="tl-tile-name">${escapeHtml(cat.name)}</div>
        <div class="tl-tile-count">${countText}</div>
        <div class="tl-tile-preview">${escapeHtml(preview)}</div>
        <div class="tl-tile-footer">
          <button class="btn btn-primary btn-sm"
                  onclick="event.stopPropagation();openTopLossCategoryItemsModal('${escapeAttr(cat.id)}')">
            Открыть →
          </button>
        </div>
      </div>
    `;
  }).join('') + '</div>';
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

  // На всякий случай сбрасываем inline-style (если остался с прошлого раза)
  modal.style.display = '';

  $('#machinesListModalLine').value = line;
  $('#machinesListModalTitle').textContent = 'Машины линии ' + line;

  renderMachinesListContent(line);

  modal.classList.add('active');
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

  // Скрываем родительскую модалку списка машин, пока открыта форма
  const parentModal = document.getElementById('machinesListModal');
  if (parentModal) parentModal.style.display = 'none';

  $('#machineModalLine').value = line;
  $('#machineModalOldName').value = oldName || '';
  $('#machineModalLineLabel').textContent = 'Линия: ' + line;

  if (oldName) {
    title.textContent = 'Изменить машину';
    saveBtn.textContent = 'Сохранить';
    $('#machineModalName').value = oldName;
  } else {
    title.textContent = 'Добавить машину';
    saveBtn.textContent = 'Добавить';
    $('#machineModalName').value = '';
  }

  modal.classList.add('active');
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

  modal.classList.add('active');
  setTimeout(() => {
    const input = $('#quickAddMachineName');
    if (input) {
      input.focus();
      input.select();
    }
  }, 100);
};

function closeQuickAddMachineModal() {
  const modal = $('#quickAddMachineModal');
  if (modal) modal.classList.remove('active');
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
  const modal = $('#machineModal');
  if (modal) modal.classList.remove('active');

  // Возвращаем родительскую модалку списка машин (если она была открыта)
  const parentModal = document.getElementById('machinesListModal');
  if (parentModal) {
    parentModal.classList.add('active');
    parentModal.style.display = '';   // сбрасываем inline-style
  }
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
function renderLinesSettings() {
  const lines = getLines();
  const list = $('#linesList');
  if (!lines.length) {
    list.innerHTML = '<div class="empty-state">Линий нет</div>';
    return;
  }
  list.innerHTML = lines.map(l => `
    <div class="line-tile">
      <span class="line-tile-name">${escapeHtml(l)}</span>
      <button class="line-tile-remove" onclick="deleteLine('${escapeHtml(l).replace(/'/g,"\\'")}')" title="Удалить линию">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
  `).join('');
}

$('#addLineBtn').addEventListener('click', () => {
  const name = $('#newLineInput').value.trim();
  if (!name) return showToast('Введите название линии', true);
  const lines = getLines();
  if (lines.includes(name)) return showToast('Такая линия уже есть', true);
  lines.push(name);
  setLines(lines);
  $('#newLineInput').value = '';

  // Перерисовываем всё, включая блоки и машины (новая линия появится в чекбоксах)
  renderBlocksSettings();
  renderLinesSettings();
  renderLineMachinesSettings();
  renderLineBrandsSettings();
  fillHistoryFilters();
  fillLinesForOperator();
  showToast('Линия добавлена');
});

window.deleteLine = function(name) {
  if (!confirm('Удалить линию "' + name + '"? У неё пропадут все привязанные бренды, машины и привязка к блоку.')) return;

  // Удаляем линию
  setLines(getLines().filter(l => l !== name));

  // Удаляем бренды линии
  const lb = getLineBrands();
  delete lb[name];
  setLineBrands(lb);

  // Убираем линию из блоков
  const blocks = getBlocks();
  blocks.forEach(b => {
    if (Array.isArray(b.lines)) {
      b.lines = b.lines.filter(l => l !== name);
    }
  });
  setBlocks(blocks);

  // Убираем машины линии
  const lm = getLineMachines();
  delete lm[name];
  setLineMachines(lm);

  // Перерисовываем всё
  renderBlocksSettings();
  renderLinesSettings();
  renderLineMachinesSettings();
  renderLineBrandsSettings();
  fillHistoryFilters();
  fillLinesForOperator();
  showToast('Линия удалена');
};

/* ============================================================
   БРЕНДЫ — список + модалка + импорт/экспорт
   ============================================================ */
function renderBrandsSettings() {
  const allBrands = getBrands().slice().sort((a, b) => a.localeCompare(b, 'ru'));
  const query = ($('#brandsSearch')?.value || '').trim().toLowerCase();

  // Счётчик
  const counter = $('#brandsCount');
  if (counter) counter.textContent = `(${allBrands.length})`;

  const list = $('#brandsList');
  if (!list) return;

  if (!allBrands.length) {
    list.innerHTML = '<div class="empty-state">Брендов пока нет. Нажмите «Добавить бренд».</div>';
    return;
  }

  // Фильтрация
  let filtered = allBrands;
  if (query) {
    filtered = allBrands.filter(b => b.toLowerCase().includes(query));
  }

  if (!filtered.length) {
    list.innerHTML = '<div class="empty-state">Ничего не найдено по запросу «' + escapeHtml(query) + '»</div>';
    return;
  }

list.innerHTML = filtered.map(b => `
  <div class="settings-item">
    <span>${escapeHtml(b)}</span>
    <div style="display:flex;gap:6px;flex-shrink:0">
      <button class="btn btn-secondary btn-sm btn-icon-text" onclick="openEditBrandModal('${escapeHtml(b).replace(/'/g,"\\'")}')" title="Изменить">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
        </svg>
        <span>Изменить</span>
      </button>
      <button class="btn btn-danger btn-sm btn-icon-text" onclick="deleteBrand('${escapeHtml(b).replace(/'/g,"\\'")}')" title="Удалить">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="3 6 5 6 21 6"/>
          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
          <path d="M10 11v6"/>
          <path d="M14 11v6"/>
          <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
        </svg>
        <span>Удалить</span>
      </button>
    </div>
  </div>
`).join('');
}
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

  // Загружаем линии, к которым уже привязан бренд
  const lb = getLineBrands();
  const assignedLines = Object.keys(lb).filter(line =>
    Array.isArray(lb[line]) && lb[line].includes(oldName)
  );
  renderLinesCheckboxesGroup('editBrandLinesGroup', assignedLines);

  modal.classList.add('active');
  setTimeout(() => {
    input.focus();
    input.select();
  }, 100);
}

function closeEditBrandModal() {
  const modal = $('#editBrandModal');
  if (modal) modal.classList.remove('active');
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

  // Отрисовать чекбоксы линий (пустые — ничего не выбрано)
  renderLinesCheckboxesGroup('addBrandLinesGroup', []);

  modal.classList.add('active');
  setTimeout(() => { if (input) input.focus(); }, 100);
}

function closeAddBrandModal() {
  const modal = $('#addBrandModal');
  if (modal) modal.classList.remove('active');
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
   ОПЕРАТОРЫ
   ============================================================ */
function renderOperatorsSettings() {
  const allOperators = sortOperatorsRus(getOperators());
  const query = ($('#operatorsSearch')?.value || '').trim().toLowerCase();

  // Счётчик
  const counter = $('#operatorsCount');
  if (counter) counter.textContent = `(${allOperators.length})`;

  const list = $('#operatorsList');
  if (!list) return;

  if (!allOperators.length) {
    list.innerHTML = '<div class="empty-state">Операторов пока нет. Нажмите «Добавить оператора».</div>';
    return;
  }

  // Фильтрация
  let filtered = allOperators;
  if (query) {
    filtered = allOperators.filter(op => op.toLowerCase().includes(query));
  }

  if (!filtered.length) {
    list.innerHTML = '<div class="empty-state">Ничего не найдено по запросу «' + escapeHtml(query) + '»</div>';
    return;
  }

  list.innerHTML = filtered.map(op => `
    <div class="settings-item">
      <span>${escapeHtml(op)}</span>
      <button class="btn btn-danger btn-sm btn-icon-text" onclick="deleteOperator('${escapeHtml(op).replace(/'/g,"\\'")}')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="3 6 5 6 21 6"/>
          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
          <path d="M10 11v6"/>
          <path d="M14 11v6"/>
          <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
        </svg>
        <span>Удалить</span>
      </button>
    </div>
  `).join('');
}

/* Поиск по операторам */
$('#operatorsSearch')?.addEventListener('input', () => {
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
  modal.classList.add('active');
  setTimeout(() => { if (input) input.focus(); }, 100);
}

function closeAddOperatorModal() {
  const modal = $('#addOperatorModal');
  if (modal) modal.classList.remove('active');
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
/* ============================================================
   TOP LOSSES — модалки: категория
   ============================================================ */

function openTopLossCategoryModal(catId) {
  const modal = $('#topLossCategoryModal');
  const title = $('#topLossCategoryModalTitle');
  const saveBtn = $('#topLossCategoryModalSave');
  if (!modal) return;

  const cats = getTopLosses();

  if (catId) {
    const cat = cats.find(c => c.id === catId);
    if (!cat) return;
    title.textContent = 'Изменить категорию';
    saveBtn.textContent = 'Сохранить';
    $('#topLossCategoryModalId').value = catId;
    $('#topLossCategoryModalName').value = cat.name || '';
  } else {
    title.textContent = 'Добавить категорию';
    saveBtn.textContent = 'Добавить';
    $('#topLossCategoryModalId').value = '';
    $('#topLossCategoryModalName').value = '';
  }

  modal.classList.add('active');
  setTimeout(() => $('#topLossCategoryModalName').focus(), 100);
}
window.openTopLossCategoryModal = openTopLossCategoryModal;

/* ============================================================
   TOP LOSSES — модалка содержимого категории
   ============================================================ */

function openTopLossCategoryItemsModal(catId) {
  const modal = $('#topLossCategoryItemsModal');
  if (!modal) return;

  const cats = getTopLosses();
  const cat = cats.find(c => c.id === catId);
  if (!cat) return;

  $('#topLossCategoryItemsModalCatId').value = catId;
  $('#topLossCategoryItemsModalTitle').textContent = 'Категория: ' + (cat.name || '—');

  renderTopLossCategoryItemsModalContent(catId);

  modal.classList.add('active');
}
window.openTopLossCategoryItemsModal = openTopLossCategoryItemsModal;

function renderTopLossCategoryItemsModalContent(catId) {
  const content = $('#topLossCategoryItemsModalContent');
  if (!content) return;

  const cats = getTopLosses();
  const cat = cats.find(c => c.id === catId);
  if (!cat) return;

  const items = Array.isArray(cat.items) ? cat.items : [];

  if (!items.length) {
    content.innerHTML = '<div class="tl-modal-empty">В этой категории пока нет потерь</div>';
    return;
  }

  content.innerHTML = items.map(it => `
    <div class="tl-modal-item">
      <span class="tl-modal-item-name">${escapeHtml(it.name)}</span>
      <div class="tl-modal-item-actions">
        <button class="btn btn-secondary btn-sm btn-icon"
                onclick="openTopLossItemModal('${escapeAttr(catId)}', '${escapeAttr(it.id)}')"
                title="Изменить">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </button>
        <button class="btn btn-danger btn-sm btn-icon"
                onclick="deleteTopLossItemFromModal('${escapeAttr(catId)}', '${escapeAttr(it.id)}')"
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

/* Удаление потери из модалки — с обновлением содержимого модалки */
window.deleteTopLossItemFromModal = function(catId, itemId) {
  const cats = getTopLosses();
  const cat = cats.find(c => c.id === catId);
  if (!cat) return;
  const item = (cat.items || []).find(i => i.id === itemId);
  if (!item) return;

  if (!confirm(`Удалить потерю "${item.name}"?`)) return;

  cat.items = cat.items.filter(i => i.id !== itemId);
  setTopLosses(cats);

  // Обновляем и модалку, и плитки в настройках
  renderTopLossCategoryItemsModalContent(catId);
  renderTopLossesSettings();
  showToast('Потеря удалена');
};

/* Кнопка «Добавить потерю» в модалке */
$('#topLossCategoryItemsModalAddBtn')?.addEventListener('click', () => {
  const catId = $('#topLossCategoryItemsModalCatId').value;
  if (!catId) return;
  openTopLossItemModal(catId, null);
});

/* Обёртка openTopLossItemModal, чтобы после сохранения обновить содержимое модалки */
const _origOpenTopLossItemModal = window.openTopLossItemModal;

/* Закрыть модалку */
function closeTopLossCategoryItemsModal() {
  const modal = $('#topLossCategoryItemsModal');
  if (modal) modal.classList.remove('active');
}

$('#topLossCategoryItemsModalClose')?.addEventListener('click', closeTopLossCategoryItemsModal);
$('#topLossCategoryItemsModalDoneBtn')?.addEventListener('click', closeTopLossCategoryItemsModal);
$('#topLossCategoryItemsModal')?.addEventListener('click', (e) => {
  if (e.target.id === 'topLossCategoryItemsModal') closeTopLossCategoryItemsModal();
});

function closeTopLossCategoryModal() {
  const modal = $('#topLossCategoryModal');
  if (modal) modal.classList.remove('active');
}

$('#topLossCategoryModalClose')?.addEventListener('click', closeTopLossCategoryModal);
$('#topLossCategoryModalCancel')?.addEventListener('click', closeTopLossCategoryModal);
$('#topLossCategoryModal')?.addEventListener('click', (e) => {
  if (e.target.id === 'topLossCategoryModal') closeTopLossCategoryModal();
});

$('#topLossCategoryModalName')?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    $('#topLossCategoryModalSave')?.click();
  }
});

$('#topLossCategoryModalSave')?.addEventListener('click', () => {
  const id = $('#topLossCategoryModalId').value;
  const name = ($('#topLossCategoryModalName').value || '').trim();
  if (!name) return showToast('Введите название категории', true);

  const cats = getTopLosses();

  // Проверка дубликата (по имени, без учёта регистра)
  const dup = cats.find(c => c.id !== id && c.name.toLowerCase() === name.toLowerCase());
  if (dup) return showToast('Категория с таким названием уже есть', true);

  if (id) {
    const cat = cats.find(c => c.id === id);
    if (!cat) return;
    cat.name = name;
  } else {
    cats.push({
      id: makeCategoryId(name),
      name,
      items: []
    });
  }

  setTopLosses(cats);
  renderTopLossesSettings();

  // Обновляем заголовок модалки содержимого, если она открыта
  const catItemsModal = $('#topLossCategoryItemsModal');
  if (catItemsModal && catItemsModal.classList.contains('active') && id) {
    const openCatId = $('#topLossCategoryItemsModalCatId').value;
    if (openCatId === id) {
      const updatedCat = getTopLosses().find(c => c.id === id);
      if (updatedCat) {
        $('#topLossCategoryItemsModalTitle').textContent = 'Категория: ' + updatedCat.name;
      }
    }
  }

  closeTopLossCategoryModal();
  showToast(id ? 'Категория обновлена' : 'Категория добавлена');
});

/* Кнопка «Добавить категорию» в карточке */
$('#openAddTopLossCategoryBtn')?.addEventListener('click', () => {
  openTopLossCategoryModal(null);
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

  if (itemId) {
    const item = (cat.items || []).find(i => i.id === itemId);
    if (!item) return;
    title.textContent = 'Изменить потерю';
    saveBtn.textContent = 'Сохранить';
    $('#topLossItemModalId').value = itemId;
    $('#topLossItemModalName').value = item.name || '';
  } else {
    title.textContent = 'Добавить потерю';
    saveBtn.textContent = 'Добавить';
    $('#topLossItemModalId').value = '';
    $('#topLossItemModalName').value = '';
  }

  modal.classList.add('active');
  setTimeout(() => $('#topLossItemModalName').focus(), 100);
}
window.openTopLossItemModal = openTopLossItemModal;

function closeTopLossItemModal() {
  const modal = $('#topLossItemModal');
  if (modal) modal.classList.remove('active');
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
  } else {
    cat.items.push({
      id: makeLossId(name),
      name
    });
  }

  setTopLosses(cats);
  renderTopLossesSettings();

  // Обновляем содержимое модалки категории, если она открыта
  const catItemsModal = $('#topLossCategoryItemsModal');
  if (catItemsModal && catItemsModal.classList.contains('active')) {
    const openCatId = $('#topLossCategoryItemsModalCatId').value;
    if (openCatId === catId) {
      renderTopLossCategoryItemsModalContent(catId);
    }
  }

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
  renderTopLossesSettings();

  // Обновляем модалку категории, если она открыта
  const catItemsModal = $('#topLossCategoryItemsModal');
  if (catItemsModal && catItemsModal.classList.contains('active')) {
    const openCatId = $('#topLossCategoryItemsModalCatId').value;
    if (openCatId === catId) {
      renderTopLossCategoryItemsModalContent(catId);
    }
  }

  showToast('Потеря удалена');
};

/* ============================================================
   TOP LOSSES — модалка удаления категории
   ============================================================ */

function openTopLossDeleteModal(catId) {
  const modal = $('#topLossDeleteModal');
  if (!modal) return;

  const cats = getTopLosses();
  const cat = cats.find(c => c.id === catId);
  if (!cat) return;

  const itemCount = (cat.items || []).length;

  // Проверяем, используется ли категория в стандартах
  const usedInStandards = getStandards().filter(s =>
    Array.isArray(s.topLosses) && s.topLosses.some(lossId =>
      (cat.items || []).some(it => it.id === lossId)
    )
  ).length;

  $('#topLossDeleteModalTitle').textContent = `Удалить категорию "${cat.name}"?`;
  $('#topLossDeleteModalText').textContent =
    itemCount > 0
      ? `В категории ${itemCount} ${pluralizeLosses(itemCount)}. Они также будут удалены.`
      : 'В категории нет потерь.';

  const warn = $('#topLossDeleteModalWarning');
  if (usedInStandards > 0) {
    warn.textContent = `⚠ Внимание: потери этой категории используются в ${usedInStandards} стандарт(ах). Привязка будет потеряна.`;
    warn.style.display = 'block';
  } else {
    warn.style.display = 'none';
  }

  $('#topLossDeleteModal').dataset.catId = catId;
  modal.classList.add('active');
}
window.openTopLossDeleteModal = openTopLossDeleteModal;

function closeTopLossDeleteModal() {
  const modal = $('#topLossDeleteModal');
  if (modal) modal.classList.remove('active');
}

$('#topLossDeleteModalClose')?.addEventListener('click', closeTopLossDeleteModal);
$('#topLossDeleteModalCancel')?.addEventListener('click', closeTopLossDeleteModal);
$('#topLossDeleteModal')?.addEventListener('click', (e) => {
  if (e.target.id === 'topLossDeleteModal') closeTopLossDeleteModal();
});

$('#topLossDeleteModalConfirm')?.addEventListener('click', () => {
  const catId = $('#topLossDeleteModal').dataset.catId;
  if (!catId) return;

  const cats = getTopLosses();
  setTopLosses(cats.filter(c => c.id !== catId));
  renderTopLossesSettings();
  closeTopLossDeleteModal();
  showToast('Категория удалена');
});
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

function renderLineBrandsSettings() {
  const lines = getLines();
  const brands = getBrands();
  const lb = getLineBrands();
  const container = $('#lineBrandsContainer');

  if (!container) return;

  if (!lines.length) {
    container.innerHTML = '<div class="empty-state">Сначала добавьте линии</div>';
    return;
  }
  if (!brands.length) {
    container.innerHTML = '<div class="empty-state">Сначала добавьте бренды</div>';
    return;
  }

  container.innerHTML = lines.map(line => {
    const assigned = Array.isArray(lb[line]) ? lb[line] : [];
    const count = assigned.length;
    const total = brands.length;

    // Превью: до 5 чипов + «+N»
    let previewHtml = '';
    if (count === 0) {
      previewHtml = '<span class="no-brands-label">— нет брендов, линия скрыта у оператора</span>';
    } else {
      const shown = assigned.slice(0, 5);
      const rest = count - shown.length;
      previewHtml = shown.map(b => `<span class="line-brand-chip">${escapeHtml(b)}</span>`).join('');
      if (rest > 0) {
        previewHtml += `<span class="line-brand-chip more">+${rest}</span>`;
      }
    }

    return `
      <div class="line-row">
        <div class="line-name">${escapeHtml(line)}</div>
        <div class="line-brands-preview">${previewHtml}</div>
        <div class="line-counter">${count} / ${total}</div>
        <button class="btn btn-primary btn-sm" onclick="openLineBrandsModal('${escapeHtml(line).replace(/'/g,"\\'")}')">
          Настроить
        </button>
      </div>
    `;
  }).join('');
}
/* --- Открыть модалку для линии --- */
window.openLineBrandsModal = function(line) {
  currentEditingLine = line;
  const title = $('#lineBrandsModalTitle');
  if (title) title.textContent = 'Бренды линии ' + line;

  const search = $('#lineBrandsSearch');
  if (search) search.value = '';

  renderLineBrandsChecklist();

  const modal = $('#lineBrandsModal');
  if (modal) modal.classList.add('active');

  // Автофокус на поиске
  setTimeout(() => { if (search) search.focus(); }, 100);
};

/* --- Закрыть модалку --- */
function closeLineBrandsModal() {
  const modal = $('#lineBrandsModal');
  if (modal) modal.classList.remove('active');
  currentEditingLine = null;
  renderLineBrandsSettings();   // обновляем превью в списке линий
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
  version: 3,
  exportedAt: new Date().toISOString(),
  standards: getStandards(),
  history: getHistory(),
  nodes: getNodes(),
  lines: getLines(),
  shifts: getShifts(),
  brands: getBrands(),
  lineBrands: getLineBrands(),
  operators: getOperators(),
  blocks: getBlocks(),
  lineMachines: getLineMachines(),
  topLosses: getTopLosses()
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
      if (data.lineBrands && typeof data.lineBrands === 'object') setLineBrands(data.lineBrands);
      if (Array.isArray(data.operators)) setOperators(data.operators);
      if (Array.isArray(data.blocks)) setBlocks(data.blocks);
      if (data.lineMachines && typeof data.lineMachines === 'object') setLineMachines(data.lineMachines);
      if (Array.isArray(data.topLosses)) setTopLosses(data.topLosses);
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
  fillShifts();
  fillLinesForOperator();
  fillHistoryFilters();
  renderEditorBlocksView();
  renderSettings();
  fillTopLossTab();
  fillElectronicTab();      
  initRouter();
  updateNavCounters();
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
  if (result.skipped > 0) html += `<li>⚠️ Пропущено (дубликаты OPL №): <strong>${result.skipped}</strong></li>`;
  if (result.empty > 0)   html += `<li>⚪ Пустых строк: ${result.empty}</li>`;
  if (result.errors.length > 0) {
    html += `<li>❌ Ошибок: <strong>${result.errors.length}</strong></li>`;
  }
  html += '</ul>';

  // --- НОВОЕ: отдельный блок про автодобавленные машины ---
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

  // Автоскрытие через 30 сек, если без ошибок и без автодобавлений
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
   ШАБЛОН OPL — кнопка в линии
   ============================================================ */
$('#editorDownloadTemplateBtn')?.addEventListener('click', async () => {
  if (typeof ExcelJS === 'undefined') {
    return showToast('Библиотека ExcelJS не загружена', true);
  }

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Стандарты');

  const headers = [
    '№', 'OPL №', 'Машина', 'Узел', 'Часть линии', 'Название', 'Линия', 'Тип контроля',
    'Описание проблемы', 'Описание контроля', 'Цель', 'Почему создан',
    'Точка 1', 'Значение 1', 'Сорта 1',
    'Точка 2', 'Значение 2', 'Сорта 2',
    'Точка 3', 'Значение 3', 'Сорта 3',
    'Точка 4', 'Значение 4', 'Сорта 4',
    'Применять к', 'Триггеры', 'Top Losses', 'Фото'
  ];

  ws.addRow(headers);

  // Пример строки — подставляем текущую линию
  const exampleLine = currentEditorLine || 'SD01';
  ws.addRow([
    13,
    'OPL-4.2.1',
    'SE',
    'Узел передачи табачных палочек',
    'Maker',
    'Давление на передающем устройстве (Паук)',
    exampleLine,
    'value_input',
    'Отклонение от OPL может приводить к падению табачных палочек',
    'Показания манометра должны соответствовать значению в т.1',
    'Предотвращение падения табачных палочек',
    'Отсутствие контроля приводит к обрывам штранга B1M',
    1, '-65 kPa (±10 kPa)', 'Все сорта',
    2, '', '',
    3, '', '',
    4, '', '',
    'Minor, Intermediate',
    'Табак',
    'Обрыв штранга, Заторы на MAX',
    'max-1.jpg, max-2.jpg'
  ]);

  // Ширины колонок
  const widths = [
    6, 14, 10, 26, 12, 32, 10, 14,
    34, 34, 30, 30,
    8, 22, 14, 8, 22, 14, 8, 22, 14, 8, 22, 14,
    22, 30, 38, 40
  ];
  ws.columns.forEach((col, i) => { col.width = widths[i] || 14; });

  // Шапка
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

  // Пример-строка
  const exampleRow = ws.getRow(2);
  exampleRow.height = 80;
  exampleRow.eachCell((cell) => {
    cell.font = { name: 'Calibri', size: 11 };
    cell.alignment = { vertical: 'top', horizontal: 'left', wrapText: true };
    cell.border = {
      top:    { style: 'thin', color: { argb: 'FFCBD2D9' } },
      bottom: { style: 'thin', color: { argb: 'FFCBD2D9' } },
      left:   { style: 'thin', color: { argb: 'FFCBD2D9' } },
      right:  { style: 'thin', color: { argb: 'FFCBD2D9' } }
    };
  });

  // Лист-инструкция
  const wsInfo = wb.addWorksheet('Инструкция');
  wsInfo.columns = [{ width: 90 }];
  const info = [
    ['📋 Шаблон импорта OPL'],
    [''],
    ['КАК ПОЛЬЗОВАТЬСЯ:'],
    ['1. Заполните строки на листе «Стандарты». Один стандарт = одна строка.'],
    ['2. Пример во 2-й строке можно удалить или заменить своими данными.'],
    ['3. Сохраните файл в формате .xlsx'],
    ['4. В приложении: Редактор → открыть линию → «📤 Импорт из Excel»'],
    [''],
    ['ОБЯЗАТЕЛЬНЫЕ ПОЛЯ (8):'],
    ['  • № — порядковый номер'],
    ['  • OPL № — номер вида OPL-4.2.1.'],
    ['      Уникален в пределах линии + машины (на разных машинах могут быть одинаковые номера).'],
    ['  • Машина — обозначение (SE, M1, …).'],
    ['      Если машины нет в списке линии — она будет добавлена автоматически.'],
    ['  • Узел'],
    ['  • Часть линии — Maker / Packer'],
    ['  • Название'],
    ['  • Линия — код линии, должен совпадать с открытой линией'],
    ['  • Тип контроля — ok_not_ok / value_input / tolerance'],
    [''],
    ['TOP LOSSES (опционально):'],
    ['  • Top Losses — названия потерь через запятую, например: Обрыв штранга, Заторы на MAX.'],
    ['      Имена должны точно совпадать с названиями в справочнике Top Losses (Настройки → Категории Top Losses).'],
    ['      Если потеря не найдена — она игнорируется.'],
    [''],
    ['ФОТОГРАФИИ (опционально):'],
    ['  • Фото — имена файлов должны быть записаны в следующем формате: Имя.jpg, опционально можно добавить несколько фото для стандарта через запятую (например: max-1.jpg, drum.jpg).'],
    ['      Файлы должны лежать в папке: photos/<Линия>/<Maker или Packer>/'],
    [''],
    ['ПРОЧИЕ ОПЦИОНАЛЬНЫЕ ПОЛЯ:'],
    ['  • Описания — свободный текст (проблема, контроль, цель, почему создан).'],
    ['  • Точки 1–4 — номер, значение, сорта.'],
    ['  • Применять к — через запятую: Minor, Intermediate, Major.'],
    ['  • Триггеры — через запятую: Табак, Материалы, Фольга / Бумага, Полипропилен, node:Узел.'],
    ['']
  ];
  info.forEach(([text]) => wsInfo.addRow([text]));
  wsInfo.getRow(1).font = { bold: true, size: 16, color: { argb: 'FF0A4FA8' } };

  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  downloadBlob(blob, 'template_opl_' + (currentEditorLine || 'line') + '.xlsx');
  showToast('Шаблон скачан');
});
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

  // Берём ВСЕ стандарты линии (без учёта фильтров и пагинации)
  const standards = getStandards().filter(s => s.line === currentEditorLine);

  if (!standards.length) {
    return showToast('На этой линии нет стандартов', true);
  }

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Стандарты');

  // ---- Заголовки (те же, что в шаблоне) ----
  const headers = [
    '№', 'OPL №', 'Машина', 'Узел', 'Часть линии', 'Название', 'Линия', 'Тип контроля',
    'Описание проблемы', 'Описание контроля', 'Цель', 'Почему создан',
    'Точка 1', 'Значение 1', 'Сорта 1',
    'Точка 2', 'Значение 2', 'Сорта 2',
    'Точка 3', 'Значение 3', 'Сорта 3',
    'Точка 4', 'Значение 4', 'Сорта 4',
    'Применять к', 'Триггеры', 'Top Losses', 'Фото'
  ];
  ws.addRow(headers);

  // ---- Данные ----
  standards.forEach(st => {
    // Точки замеров: 1..4
    const points = st.measurements || [];
    const p1 = points[0] || { point: 1, value: '', sorts: '' };
    const p2 = points[1] || { point: 2, value: '', sorts: '' };
    const p3 = points[2] || { point: 3, value: '', sorts: '' };
    const p4 = points[3] || { point: 4, value: '', sorts: '' };

    // Применять к: массив → строка через запятую
    const appliesTo = Array.isArray(st.appliesTo) ? st.appliesTo.join(', ') : '';

    // Триггеры: node:X → X (для читаемости)
    const triggers = Array.isArray(st.triggers)
      ? st.triggers.map(t => t.replace(/^node:/, '')).join(', ')
      : '';

    // Фото: массив → строка через запятую
    const photos = Array.isArray(st.photos) ? st.photos.join(', ') : '';

    // Top Losses: массив ID → строка имён через запятую
    const topLossesNames = Array.isArray(st.topLosses)
      ? st.topLosses
          .map(id => {
            const l = findLossById(id);
            return l ? l.name : null;
          })
          .filter(Boolean)
          .join(', ')
      : '';

    ws.addRow([
      st.number || '',
      st.oplNumber || '',
      st.machine || '',
      st.node || '',
      st.nodePart || '',
      st.title || '',
      st.line || currentEditorLine,
      st.controlType || '',
      st.problemDescription || '',
      st.controlDescription || '',
      st.purpose || '',
      st.whyCreated || '',
      p1.point, p1.value, p1.sorts,
      p2.point, p2.value, p2.sorts,
      p3.point, p3.value, p3.sorts,
      p4.point, p4.value, p4.sorts,
      appliesTo,
      triggers,
      topLossesNames,
      photos
    ]);
  });

  // ---- Ширины колонок ----
  const widths = [
    6, 14, 10, 26, 12, 32, 10, 14,
    34, 34, 30, 30,
    8, 22, 14, 8, 22, 14, 8, 22, 14, 8, 22, 14,
    22, 30, 38, 40
  ];
  ws.columns.forEach((col, i) => { col.width = widths[i] || 14; });

  // ---- Стилизация шапки ----
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

  // ---- Автофильтр по шапке ----
  ws.autoFilter = {
    from: { row: 1, column: 1 },
    to:   { row: 1, column: headers.length }
  };

  // ---- Данные: общий стиль ----
  for (let i = 2; i <= ws.rowCount; i++) {
    const row = ws.getRow(i);
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

  // ---- Скачивание ----
  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const ts = new Date().toISOString().slice(0, 10);
  downloadBlob(blob, `standards_${currentEditorLine}_${ts}.xlsx`);
  showToast(`Экспортировано: ${standards.length} стандарт(ов)`);
});
/* ============================================================
   ИМПОРТ СТАНДАРТОВ В ЛИНИЮ
   ============================================================ */
$('#editorUploadBtn')?.addEventListener('click', () => {
  if (!currentEditorLine) {
    return showToast('Сначала откройте линию', true);
  }
  $('#editorUploadInput').click();
});

$('#editorUploadInput')?.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  e.target.value = '';

  if (!currentEditorLine) {
    return showToast('Сначала откройте линию', true);
  }

  try {
    const result = await parseStandardsExcelV3(file, currentEditorLine);
    showImportReport(result, 'editorStandardsList');

    if (result.added > 0) {
      renderEditorStandardsList();
      renderEditorLinesView();
      showToast(`Добавлено стандартов: ${result.added}`);
    } else {
      showToast('Новых стандартов не найдено', true);
    }
  } catch (err) {
    console.error(err);
    showToast('Ошибка чтения файла: ' + err.message, true);
  }
});

/* ============================================================
   ПАРСЕР EXCEL — ШАБЛОН OPL (v2: проверка и автодобавление машин)
   ============================================================ */
async function parseStandardsExcelV3(file, targetLine) {
  const wb = new ExcelJS.Workbook();
  const buf = await file.arrayBuffer();
  await wb.xlsx.load(buf);

  const ws = wb.getWorksheet('Стандарты') || wb.worksheets[0];
  if (!ws) throw new Error('Не найден лист «Стандарты»');

  const VALID_PARTS = ['Maker', 'Packer'];
  const VALID_CONTROL = ['ok_not_ok', 'value_input', 'tolerance'];
  const VALID_TYPES = ['Minor', 'Intermediate', 'Major'];

  // Маппинг русских названий триггеров → технические значения
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

  // --- НОВОЕ: получаем актуальный список машин для линии ---
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

    const number         = get(1);
    const oplNumber      = get(2);
    const machine        = get(3);
    const node           = get(4);   
    const nodePart       = get(5);   
    const title          = get(6);   
    const lineFromExcel  = get(7);   
    const controlType    = get(8);
    const problemDesc    = get(9);
    const controlDesc    = get(10);
    const purpose        = get(11);
    const whyCreated     = get(12);

    const point1 = { point: 1, value: get(14), sorts: get(15) };
    const point2 = { point: 2, value: get(17), sorts: get(18) };
    const point3 = { point: 3, value: get(20), sorts: get(21) };
    const point4 = { point: 4, value: get(23), sorts: get(24) };

    const appliesToRaw  = get(25);
    const triggersRaw   = get(26);
    const topLossesRaw  = get(27);
    const photosRaw     = get(28);

    // Пустая строка — пропускаем
    if (!number && !oplNumber && !title && !node) {
      result.empty++;
      continue;
    }

    // Валидация
    const rowErrors = [];
    if (!number)      rowErrors.push('пустой №');
    if (!oplNumber)   rowErrors.push('пустой OPL №');
    if (!machine)     rowErrors.push('пустая машина');
    if (!title)       rowErrors.push('пустое название');
    if (!node)        rowErrors.push('пустой узел');
    if (!nodePart)    rowErrors.push('не указана часть линии');
    if (!controlType) rowErrors.push('не указан тип контроля');

    if (nodePart && !VALID_PARTS.includes(nodePart)) {
      rowErrors.push(`часть линии «${nodePart}» — допустимо Maker / Packer`);
    }
    if (controlType && !VALID_CONTROL.includes(controlType)) {
      rowErrors.push(`тип контроля «${controlType}» — допустимо ok_not_ok / value_input / tolerance`);
    }

    if (lineFromExcel && lineFromExcel !== targetLine) {
      rowErrors.push(`линия в файле «${lineFromExcel}», а импорт идёт в «${targetLine}»`);
    }

    // Дубликат по OPL № на этой линии + машине
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

    // --- НОВОЕ: проверяем машину и добавляем её при необходимости ---
    if (machine && !machinesForThisLine.includes(machine)) {
      machinesForThisLine.push(machine);
      result.addedMachines.push(machine);
    }

    // Парсим типы переходов
    const appliesTo = splitList(appliesToRaw).filter(t => {
      if (!VALID_TYPES.includes(t)) {
        rowErrors.push(`тип перехода «${t}» — допустимо Minor / Intermediate / Major`);
        return false;
      }
      return true;
    });

    if (rowErrors.length) {
      result.errors.push({ row: i, message: rowErrors.join('; ') });
      continue;
    }

    // Парсим триггеры
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

    // --- Парсим Top Losses ---
    // Значения — названия потерь через запятую. Ищем ID в справочнике
    // по точному имени (без регистра). Если не нашли — игнорируем.
    const allLossesFlat = getAllLossItems();
    const topLosses = [];

    splitList(topLossesRaw).forEach(name => {
      const found = allLossesFlat.find(l =>
        l.name.toLowerCase() === name.toLowerCase()
      );
      if (found) {
        topLosses.push(found.id);
      }
      // если не нашли — молча игнорируем (в отличие от машин)
    });

    // --- Парсим фотографии (список имён файлов через запятую) ---
    const photos = splitList(photosRaw);

    // Формируем стандарт
    const newStandard = {
      id: uid(),
      active: true,
      number,
      oplNumber,
      machine,
      title,
      line: targetLine,
      node,
      nodePart,
      controlType,
      problemDescription: problemDesc,
      controlDescription: controlDesc,
      purpose: purpose,
      whyCreated: whyCreated,
      measurements: [point1, point2, point3, point4],
      appliesTo,
      triggers,
      topLosses,
      photos,
      author: '—',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    existing.push(newStandard);
    existingOplKeys.add(oplKey);
    result.added++;
  }

  if (result.added > 0) {
    setStandards(existing);
  }

  // --- НОВОЕ: сохраняем машины, если были автодобавления ---
  if (result.addedMachines.length > 0) {
    setLineMachines(lineMachines);
    // Обновляем UI настроек и фильтр в редакторе
    if (typeof renderLineMachinesSettings === 'function') renderLineMachinesSettings();
    if (typeof fillEditorMachineFilter === 'function') fillEditorMachineFilter(targetLine);
  }

  return result;
}
init(); 
