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
  lineMachines: 'cl_lineMachines_v1'
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
   РЕДАКТОР СТАНДАРТОВ — СПИСОК СТАНДАРТОВ ЛИНИИ
   ============================================================ */
/* ============================================================
   СПИСОК СТАНДАРТОВ — таблица + пагинация + сортировка
   ============================================================ */
let sortField = 'oplNumber';   // 'number' | 'oplNumber' | 'title' | 'machine' | 'node'
let sortDir = 'asc';           // 'asc' | 'desc'
let currentPage = 1;   // текущая страница пагинации
let pageSize = 10;     // размер страницы

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
    let va, vb;
    if (sortField === 'number') {
      va = Number(a.number) || 999999;
      vb = Number(b.number) || 999999;
      return sortDir === 'asc' ? va - vb : vb - va;
    } else {
      va = String(a[sortField] || '').toLowerCase();
      vb = String(b[sortField] || '').toLowerCase();
      const cmp = va.localeCompare(vb, 'ru');
      return sortDir === 'asc' ? cmp : -cmp;
    }
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

return `
  <tr class="${rowClass}" data-std-id="${st.id}">
    <td>
      <input type="checkbox" class="std-active-cb" ${isActive ? 'checked' : ''}
             onchange="toggleStandardActive('${st.id}', this.checked)">
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
  st.active = isActive;
  setStandards(all);
  renderEditorStandardsList();
  renderEditorLinesView(localStorage.getItem('cl_editor_block'));
  showToast(isActive ? 'Стандарт активирован' : 'Стандарт деактивирован');
};

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

  // Проверка дубликата OPL № на этой линии
  const all = getStandards();
  const dup = all.find(s =>
    s.id !== id &&
    s.line === line &&
    (s.oplNumber || '').toLowerCase() === oplNumber.toLowerCase()
  );
  if (dup) {
    return showToast(`OPL № "${oplNumber}" уже есть на линии ${line}`, true);
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

    photos: []
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
    updatedAt: st.updatedAt || null
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
        <label>Значение:</label>
        <input type="number" step="any" data-ans-value placeholder="0">
        ${mainValue ? `<span style="margin-left:8px;color:var(--text-second);font-size:12px">Норма: ${escapeHtml(mainValue)}</span>` : ''}`;
    } else if (st.controlType === 'tolerance') {
      answerHtml = `
        <label>Значение:</label>
        <input type="number" step="any" data-ans-value placeholder="0">
        ${mainValue ? `<span style="margin-left:8px;color:var(--text-second);font-size:12px">Допуск: ${escapeHtml(mainValue)}</span>` : ''}
        <div class="radio-group" style="margin-left:8px">
          <label><input type="radio" name="tol_${st.id}" value="OK" data-tol> В допуске</label>
          <label><input type="radio" name="tol_${st.id}" value="FAIL" data-tol> Не в допуске</label>
        </div>`;
    }

    return `
      <div class="checklist-item" data-std-id="${st.id}">
        <div class="meta">
          <span><strong>№:</strong> ${escapeHtml(st.number || '—')}</span>
          <span><strong>OPL:</strong> ${escapeHtml(st.oplNumber || '—')}</span>
          ${st.machine ? `<span><strong>Машина:</strong> ${escapeHtml(st.machine)}</span>` : ''}
          <span><strong>Узел:</strong> ${escapeHtml(st.node || '—')}</span>
          <span><strong>Часть:</strong> ${escapeHtml(st.nodePart || '—')}</span>
        </div>
        <div class="title">${escapeHtml(st.title || '')}</div>
        ${st.controlDescription ? `<div class="desc">${escapeHtml(st.controlDescription)}</div>` : ''}
        ${st.purpose ? `<div class="desc" style="font-style:italic">${escapeHtml(st.purpose)}</div>` : ''}
        <div class="answer">
          ${answerHtml}
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
  if (!modal || !body) return;

  // Заголовок модалки
  if (title) title.textContent = 'Просмотр стандарта · ' + (st.oplNumber || '—');

  // Заполняем body
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

/* Сформировать HTML содержимого модалки */
function renderStandardViewContent(st) {
  const blockName = getBlockNameForLine(st.line) || '';
  const ceh = 'SMD';

  // ----- Левая колонка: основное -----
  const chips = [];
  if (ceh) chips.push(`<span class="sv-chip sv-chip-cyan">${escapeHtml(ceh)}</span>`);
  if (blockName) chips.push(`<span class="sv-chip sv-chip-cyan">${escapeHtml(blockName)}</span>`);
  if (st.line) chips.push(`<span class="sv-chip sv-chip-cyan">${escapeHtml(st.line)}</span>`);
  if (st.nodePart) chips.push(`<span class="sv-chip sv-chip-purple">${escapeHtml(st.nodePart)}</span>`);
  if (st.machine) chips.push(`<span class="sv-chip sv-chip-amber">${escapeHtml(st.machine)}</span>`);

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
    <div class="sv-chips">${chips.join('')}</div>
    ${htmlSection('Название OPL', st.title)}
    ${htmlSection('Описание проблемы', st.problemDescription)}
    ${htmlSection('Описание контроля', st.controlDescription)}
    ${htmlSection('Цель', st.purpose)}
    ${htmlSection('Почему создан', st.whyCreated)}
    ${pointsHtml}
    ${controlTypeHtml}
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
});

$('#applyFilterBtn').addEventListener('click', renderHistory);
$('#filterLine').addEventListener('change', renderHistory);
$('#filterType').addEventListener('change', renderHistory);

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
  return hist.sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));
}

function renderHistory() {
  const hist = getFilteredHistory();
  $('#historyCount').textContent = hist.length;
  const list = $('#historyList');
  if (!hist.length) {
    list.innerHTML = '<div class="empty-state">Записей нет</div>';
    return;
  }
  list.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Дата/время</th>
          <th>Оператор</th>
          <th>Смена</th>
          <th>Линия</th>
          <th>Часть</th>
          <th>Тип</th>
          <th>Бренды</th>
          <th>Пунктов</th>
          <th>Не ОК</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        ${hist.map(h => {
          const fails = h.items.filter(i => i.status === 'FAIL').length;
          const badgeCls = h.type === 'Minor' ? 'badge-minor' :
                          h.type === 'Intermediate' ? 'badge-intermediate' : 'badge-major';
          return `
            <tr>
              <td>${fmtDate(h.timestamp)}</td>
              <td>${escapeHtml(h.operator)}</td>
              <td>${escapeHtml(h.shift)}</td>
              <td>${escapeHtml(h.line)}</td>
              <td>${escapeHtml(h.part || '—')}</td>
              <td><span class="badge ${badgeCls}">${h.type}</span></td>
              <td>${escapeHtml(h.brandFrom)} → ${escapeHtml(h.brandTo)}</td>
              <td>${h.items.length}</td>
              <td>${fails ? `<span class="badge badge-fail">${fails}</span>` : '<span class="badge badge-ok">0</span>'}</td>
              <td><button class="btn btn-secondary btn-sm" onclick="viewRecord('${h.id}')">Открыть</button></td>
            </tr>`;
        }).join('')}
      </tbody>
    </table>`;
}

let currentRecord = null;

window.viewRecord = function(id) {
  const h = getHistory().find(x => x.id === id);
  if (!h) return;
  currentRecord = h;

  const fails = h.items.filter(i => i.status === 'FAIL').length;
  const oks = h.items.length - fails;

  let html = `
    <div class="record-info">
      <div><strong>Дата:</strong> ${fmtDate(h.timestamp)}</div>
      <div><strong>Оператор:</strong> ${escapeHtml(h.operator)}</div>
      <div><strong>Смена:</strong> ${escapeHtml(h.shift)}</div>
      <div><strong>Линия:</strong> ${escapeHtml(h.line)} / ${escapeHtml(h.part || '—')}</div>
      <div><strong>Тип перехода:</strong> ${escapeHtml(h.type)}</div>
      <div><strong>Бренды:</strong> ${escapeHtml(h.brandFrom)} → ${escapeHtml(h.brandTo)}</div>
      ${h.triggers && h.triggers.length ? `<div><strong>Триггеры:</strong> ${h.triggers.map(t => escapeHtml(t.replace('node:',''))).join(', ')}</div>` : ''}
      ${h.customNode ? `<div><strong>Доп. узел:</strong> ${escapeHtml(h.customNode)}</div>` : ''}
      <div><strong>Итого:</strong> ${h.items.length} пунктов, ${oks} ОК, ${fails} Не ОК</div>
    </div>
  `;

  html += `
    <table class="record-items">
      <thead>
        <tr>
          <th>№</th>
          <th>OPL</th>
          <th>Узел</th>
          <th>Название</th>
          <th>Норма</th>
          <th>Ответ</th>
          <th>Комментарий</th>
        </tr>
      </thead>
      <tbody>
        ${h.items.map(it => `
          <tr class="${it.status === 'FAIL' ? 'fail' : 'ok'}">
            <td>${escapeHtml(it.number || '—')}</td>
            <td>${escapeHtml(it.oplNumber || '—')}</td>
            <td>${escapeHtml(it.node || '—')}</td>
            <td>${escapeHtml(it.title || '—')}</td>
            <td>${escapeHtml(it.norm || '—')}</td>
            <td>
              ${escapeHtml(it.answer)}
              ${it.status === 'FAIL' ? '<br><span class="status-badge status-fail">Не ОК</span>' : ''}
            </td>
            <td>${it.comment ? escapeHtml(it.comment) : '—'}</td>
          </tr>
        `).join('')}
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
    let line = `[${it.oplNumber || it.number || '—'}] ${it.node || ''} — ${it.title || ''}: ${it.answer || ''}`;
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
    '№', 'OPL №', 'Машина', 'Узел', 'Часть линии', 'Название', 'Линия', 'Тип контроля',
    'Описание проблемы', 'Описание контроля', 'Цель', 'Почему создан',
    'Точка 1', 'Значение 1', 'Сорта 1',
    'Точка 2', 'Значение 2', 'Сорта 2',
    'Точка 3', 'Значение 3', 'Сорта 3',
    'Точка 4', 'Значение 4', 'Сорта 4',
    'Применять к', 'Триггеры', 'Фото'
  ];
  const rows = [headers];

  hist.forEach(h => {
    const fails = h.items.filter(i => i.status === 'FAIL').length;
    const triggersText = (h.triggers || []).map(t => t.replace('node:','')).join(', ');

    rows.push([
      fmtDate(h.timestamp),
      h.operator,
      h.shift,
      h.line,
      h.part || '',
      h.type,
      h.brandFrom,
      h.brandTo,
      triggersText,
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
  'Дата/время','Оператор','Смена','Линия','Часть','Тип перехода',
  'С бренда','На бренд','Триггеры','Доп. узел',
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
  28,   // Дата/время       ← увеличили с 22 до 28
  30,   // Оператор         ← увеличили с 28 до 30 (ФИО длинные)
  12,   // Смена
  14,   // Линия            ← увеличили с 12
  14,   // Часть            ← увеличили с 12
  28,   // Тип перехода     ← увеличили с 26
  20,   // С бренда         ← увеличили с 18
  20,   // На бренд         ← увеличили с 18
  55,   // Триггеры         ← увеличили с 50
  28,   // Доп. узел        ← увеличили с 26
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

    const row = ws.addRow([
      fmtDate(h.timestamp),
      h.operator,
      h.shift,
      h.line,
      h.part || '',
      h.type,
      h.brandFrom,
      h.brandTo,
      triggersText,
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

      if (colNumber === 13) {
        // Детали — по левому краю, wrap
        cell.alignment = { vertical: 'top', horizontal: 'left', wrapText: true };
      } else if (colNumber === 11 || colNumber === 12) {
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
    const failCell = row.getCell(12);
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
    const key = it.oplNumber || it.number || '—';
    if (!byStd[key]) byStd[key] = { node: it.node, title: it.title, total: 0, fails: 0 };
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
  addHeader(['OPL №', 'Узел', 'Всего', 'Не ОК', '% отклонений']);
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
   ВКЛАДКА НАСТРОЙКИ
   ============================================================ */
function renderSettings() {
  renderPhotoStorageSettings();
  renderBlocksSettings();
  renderLinesSettings();
  renderLineMachinesSettings();
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
    // Небольшая задержка — сначала переключимся, потом откроем модалку
    setTimeout(() => {
      const btn = $('#checkPhotosBtn');
      if (btn) btn.click();
    }, 200);
  });
}

/* Третий блок: графики и быстрые действия */
function renderDashboardTertiaryBlock(stats) {
  return `
    <div class="dash-grid">
      <div>${renderDashboardDaysChart(stats.daysSeries, stats.daysSeriesMax)}</div>
      <div>${renderDashboardTypesDonut(stats.typeSegments, stats.typesTotal)}</div>
    </div>
    ${renderDashboardActions()}
  `;
}

/* Виджет: столбики по дням */
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
          Проверки по дням (14 дней)
        </div>
        <div class="dash-widget-empty">Нет данных</div>
      </div>
    `;
  }

  const cols = series.map(d => {
    // Высота в процентах: 0 → минимум 2px, max → 100%
    const heightPercent = maxCount > 0 ? Math.round((d.count / maxCount) * 100) : 0;
    const isEmpty = d.count === 0;
    const barClass = isEmpty ? 'dash-day-bar dash-day-bar-empty' : 'dash-day-bar';
    // Для пустых оставляем минимум 2px через min-height
    const style = isEmpty ? '' : `height: ${Math.max(heightPercent, 4)}%;`;

    return `
      <div class="dash-day-col">
        <div class="${barClass}" style="${style}" title="${d.label}: ${d.count}">
          ${d.count > 0 ? `<span class="dash-day-bar-value">${d.count}</span>` : ''}
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
        Проверки по дням (14 дней)
      </div>
      <div class="dash-days-chart">${cols}</div>
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
      <div>${renderDashboardLineStats(stats.lineStats, stats.lineStatsMax)}</div>
      <div>${renderDashboardOperatorStats(stats.operatorStats, stats.operatorStatsMax)}</div>
    </div>
  `;
}

/* Виджет: проверки по линиям */
function renderDashboardLineStats(items, maxCount) {
  if (!items.length) {
    return `
      <div class="dash-widget">
        <div class="dash-widget-title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="20" x2="18" y2="10"/>
            <line x1="12" y1="20" x2="12" y2="4"/>
            <line x1="6" y1="20" x2="6" y2="14"/>
          </svg>
          Проверки по линиям (7 дней)
        </div>
        <div class="dash-widget-empty">За неделю проверок не было</div>
      </div>
    `;
  }

  const rows = items.map(item => {
    const width = maxCount > 0 ? Math.round((item.count / maxCount) * 100) : 0;
    return `
      <div class="dash-bar-item">
        <span class="dash-bar-label">${escapeHtml(item.line)}</span>
        <div class="dash-bar-track">
          <div class="dash-bar-fill dash-bar-fill-cyan" style="width:${width}%"></div>
        </div>
        <span class="dash-bar-value">${item.count}</span>
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
        Проверки по линиям (7 дней)
      </div>
      <div class="dash-bars">${rows}</div>
    </div>
  `;
}

/* Виджет: топ операторов */
function renderDashboardOperatorStats(items, maxCount) {
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
          Топ операторов (7 дней)
        </div>
        <div class="dash-widget-empty">За неделю проверок не было</div>
      </div>
    `;
  }

  const rows = items.map(item => {
    const width = maxCount > 0 ? Math.round((item.count / maxCount) * 100) : 0;
    return `
      <div class="dash-bar-item">
        <span class="dash-bar-label dash-bar-label-plain" title="${escapeAttr(item.name)}">${escapeHtml(item.name)}</span>
        <div class="dash-bar-track">
          <div class="dash-bar-fill dash-bar-fill-purple" style="width:${width}%"></div>
        </div>
        <span class="dash-bar-value">${item.count}</span>
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
        Топ операторов (7 дней)
      </div>
      <div class="dash-bars">${rows}</div>
    </div>
  `;
}

/* Двухколоночный блок: последние проверки + топ проблемных */
function renderDashboardMainBlock(stats) {
  return `
    <div class="dash-grid">

      <div>
        ${renderDashboardRecentChecks(stats.recentChecks)}
      </div>

      <div>
        ${renderDashboardTopProblems(stats.topProblems, stats.topProblemsMax)}
      </div>

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
    return `
      <div class="dash-top-item">
        <div class="dash-top-head">
          <span class="dash-top-opl">${escapeHtml(p.opl)}</span>
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
  const failsWeek = checksWeek.reduce((sum, h) => {
    return sum + h.items.filter(i => i.status === 'FAIL').length;
  }, 0);

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

  const stdFails = {};   // ключ = oplNumber || number, значение = { opl, title, node, line, count }
  monthChecks.forEach(h => {
    h.items.forEach(it => {
      if (it.status !== 'FAIL') return;
      const key = it.oplNumber || it.number || '—';
      if (!stdFails[key]) {
        stdFails[key] = {
          opl: it.oplNumber || it.number || '—',
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

  // --- Проверки по линиям за неделю ---
  const lineCounts = {};
  checksWeek.forEach(h => {
    const line = h.line || '—';
    lineCounts[line] = (lineCounts[line] || 0) + 1;
  });
  const lineStats = Object.entries(lineCounts)
    .map(([line, count]) => ({ line, count }))
    .sort((a, b) => b.count - a.count);
  const lineStatsMax = lineStats.length ? lineStats[0].count : 1;

  // --- Топ-5 операторов за неделю ---
  const operatorCounts = {};
  checksWeek.forEach(h => {
    const op = h.operator || '—';
    operatorCounts[op] = (operatorCounts[op] || 0) + 1;
  });
  const operatorStats = Object.entries(operatorCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  const operatorStatsMax = operatorStats.length ? operatorStats[0].count : 1;

    // --- Столбики по дням (14 дней) ---
  const daysSeries = [];
  for (let i = 13; i >= 0; i--) {
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const dayEnd = new Date(dayStart.getTime() + 24 * 3600 * 1000);
    const count = history.filter(h => {
      const ts = new Date(h.timestamp);
      return ts >= dayStart && ts < dayEnd;
    }).length;

    // Подпись: день + месяц, например «24.09»
    const dd = String(dayStart.getDate()).padStart(2, '0');
    const mm = String(dayStart.getMonth() + 1).padStart(2, '0');

    daysSeries.push({
      label: `${dd}.${mm}`,
      date: dayStart,
      count
    });
  }
  const daysSeriesMax = daysSeries.reduce((max, d) => Math.max(max, d.count), 0) || 1;

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

  return {
    // ... (всё, что было)
    totalStandards,
    activeStandards,
    checksToday,
    failsWeek,
    totalPhotos,
    standardsWithPhoto,
    photoCoverage,
    totalBrands: brands.length,
    totalOperators: operators.length,
    recentChecks,
    topProblems,
    topProblemsMax,
    lineStats,
    lineStatsMax,
    operatorStats,
    operatorStatsMax,

    // --- НОВОЕ ---
    daysSeries,
    daysSeriesMax,
    typeSegments,
    typesTotal
  };
}

/* Отрисовка верхнего ряда карточек */
function renderDashboardStats(stats) {
  return `
    <div class="dash-stats">

      <div class="dash-stat">
        <div class="dash-stat-head">
          <span>Стандарты</span>
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

      <div class="dash-stat dash-stat-purple">
        <div class="dash-stat-head">
          <span>Фотографий</span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            <circle cx="8.5" cy="8.5" r="1.5"/>
            <polyline points="21 15 16 10 5 21"/>
          </svg>
        </div>
        <div class="dash-stat-value">${stats.totalPhotos}</div>
        <div class="dash-stat-sub">в <strong>${stats.standardsWithPhoto}</strong> стандартах</div>
      </div>

      <div class="dash-stat dash-stat-amber">
        <div class="dash-stat-head">
          <span>Заполнение фото</span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="20" x2="18" y2="10"/>
            <line x1="12" y1="20" x2="12" y2="4"/>
            <line x1="6" y1="20" x2="6" y2="14"/>
          </svg>
        </div>
        <div class="dash-stat-value">${stats.photoCoverage}%</div>
        <div class="dash-stat-sub">стандартов с фото</div>
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
   МАШИНЫ ДЛЯ ЛИНИЙ — компактный список
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

  container.innerHTML = lines.map(line => {
    const machines = Array.isArray(lm[line]) ? lm[line] : [];
    const count = machines.length;
    const countText = count === 0
      ? '<span style="color:var(--text-dim)">0 машин</span>'
      : `${count} ${pluralizeMachines(count)}`;

    return `
      <div class="line-machines-row">
        <span class="line-machines-row-name">${escapeHtml(line)}</span>
        <span class="line-machines-row-count">${countText}</span>
        <button class="btn btn-secondary btn-sm"
                onclick="openMachinesListModal('${escapeHtml(line).replace(/'/g,"\\'")}')">
          ✏ Редактировать
        </button>
      </div>
    `;
  }).join('');
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
  const line = $('#sf_line')?.value;
  if (!modal || !line) return;

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
$('#quickAddMachineSaveBtn')?.addEventListener('click', () => {
  const line = $('#sf_line')?.value;
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

  // Обновляем селект в форме стандарта и выбираем новую машину
  fillStandardMachineSelect(line, name);

  // Обновляем настройки (если они сейчас открыты — пользователь увидит новую машину)
  if (typeof renderLineMachinesSettings === 'function') renderLineMachinesSettings();

  closeQuickAddMachineModal();
  showToast('Машина добавлена на линию ' + line);
});

/* Кнопка «+» в форме стандарта */
$('#sf_addMachineBtn')?.addEventListener('click', openQuickAddMachineModal);

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
  lineMachines: getLineMachines()
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
    'Применять к', 'Триггеры', 'Фото'
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
    'max-1.jpg, max-2.jpg'
  ]);

  // Ширины колонок
  const widths = [
    6, 14, 10, 26, 12, 32, 10, 14,
    34, 34, 30, 30,
    8, 22, 14, 8, 22, 14, 8, 22, 14, 8, 22, 14,
    22, 30, 40
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
    ['  • OPL № — номер вида OPL-4.2.1'],
    ['  • Машина — обозначение (SE, M1, …).'],
    ['      Если машины нет в списке линии — она будет добавлена автоматически.'],
    ['  • Узел'],
    ['  • Часть линии — Maker / Packer'],
    ['  • Название'],
    ['  • Линия — код линии, должен совпадать с открытой линией'],
    ['  • Тип контроля — ok_not_ok / value_input / tolerance'],
    [''],
    ['ФОТОГРАФИИ (опционально):'],
    ['  • Фото — имена файлов через запятую (например: max-1.jpg, drum.jpg).'],
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
    'Применять к', 'Триггеры', 'Фото'
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
      photos
    ]);
  });

  // ---- Ширины колонок ----
  const widths = [
    6, 14, 10, 26, 12, 32, 10, 14,
    34, 34, 30, 30,
    8, 22, 14, 8, 22, 14, 8, 22, 14, 8, 22, 14,
    22, 30, 40
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
  const existingOplOnLine = new Set(
    existing
      .filter(s => s.line === targetLine)
      .map(s => (s.oplNumber || '').toLowerCase())
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

    const appliesToRaw = get(25);
    const triggersRaw  = get(26);
    const photosRaw    = get(27);

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

    // Дубликат по OPL № на этой линии
    if (oplNumber && existingOplOnLine.has(oplNumber.toLowerCase())) {
      result.duplicates.push(oplNumber);
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
        // --- НОВОЕ: парсим фотографии (список имён файлов через запятую) ---
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
      photos,
      author: '—',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    existing.push(newStandard);
    existingOplOnLine.add(oplNumber.toLowerCase());
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