/* ============================================================
   СТАНДАРТЫ CL: таблица механических стандартов
   Модуль общего пространства имён: функции и переменные видны
   во всех файлах. Порядок подключения — index.html.
   ============================================================ */

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
