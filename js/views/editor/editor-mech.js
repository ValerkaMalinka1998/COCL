/* ============================================================
   СТАНДАРТЫ CL: таблица механических стандартов
   Модуль общего пространства имён: функции и переменные видны
   во всех файлах. Порядок подключения — index.html.
   ============================================================ */

/* ============================================================
   МЕХАНИЧЕСКИЕ СТАНДАРТЫ: фильтрация
   ============================================================ */

function getFilteredMechStandards() {
  const line = localStorage.getItem('cl_editor_line') || '';
  const machine = $('#emFilterMachine')?.value || '';
  const node = $('#emFilterNode')?.value || '';
  const type = $('#emFilterType')?.value || '';
  const sched = $('#emFilterSchedule')?.value || '';
  const part = $('#emFilterPart')?.value || '';
  const activeFilter = $('#emFilterActive')?.value || '';
  const search = ($('#emFilterSearch')?.value || '').trim().toLowerCase();

  const filtered = getStandards().filter(st => {
    if (line && st.line !== line) return false;
    if (machine && st.machine !== machine) return false;
    if (node && st.node !== node) return false;
    if (!editorAppliesMatch(st.appliesTo, type)) return false;
    if (part && st.nodePart !== part) return false;
    if (activeFilter === 'active' && st.active === false) return false;
    if (activeFilter === 'inactive' && st.active !== false) return false;
    if (sched && (editorRowSchedule(st, line).member ? 'in' : 'out') !== sched) return false;
    if (search) {
      const hay = [st.title, st.oplNumber, st.node, st.machine, st.nodePart, st.number]
        .map(v => String(v || '').toLowerCase()).join(' ');
      if (!hay.includes(search)) return false;
    }
    return true;
  });

  // Группы по машинам, внутри — по OPL №
  return cilSortRows(filtered);
}

/* Фильтр «Применять к» */
function editorAppliesMatch(appliesTo, type) {
  if (!type) return true;
  const list = Array.isArray(appliesTo) ? appliesTo : [];
  return type === '__none' ? !list.length : list.includes(type);
}

/* Расписание строки на текущей неделе: { member, count } */
function editorRowSchedule(row, line) {
  try {
    const w = getRowForWeek(row, getSchWeekStart(0), line || row.line);
    return { member: !!w.member, count: w.member ? (w.schedule || []).length : 0 };
  } catch (e) {
    return { member: false, count: 0 };
  }
}

/* ============================================================
   СТАНДАРТЫ CL: общие куски строки таблицы
   ============================================================ */

const ET_ICONS = {
  edit: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',
  copy: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>',
  del: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>',
  cam: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>'
};

/* Применяемость — три метки CO / ТО / КВ */
function etAppliesHtml(appliesTo) {
  const list = Array.isArray(appliesTo) ? appliesTo : [];
  const items = [['ChangeOver', 'co', 'CO', 'Change Over'], ['CL_TO', 'to', 'ТО', 'CL в ТО'], ['CL_Conversion', 'cv', 'КВ', 'CL в Конвертацию']];
  return '<span class="et-applies">' + items.map(([k, cls, label, title]) =>
    `<span class="et-ap et-ap-${cls} ${list.includes(k) ? 'on' : ''}" title="${title}${list.includes(k) ? '' : ' — нет'}">${label}</span>`).join('') + '</span>';
}

/* Тип контроля + норма; предупреждение, если точек нет там, где они нужны */
function etTypeNormHtml(row, isElec) {
  const type = isElec ? (row.controlType || 'variable') : migrateControlType(row.controlType, row.measurements);
  const norm = cilNorm(row, '', isElec);
  const needsPoints = type === 'variable' || type === 'interval';
  const noValues = norm.visual || /cil-dim/.test(norm.html);
  const normHtml = needsPoints && noValues
    ? '<span class="et-warn" title="Для этого типа нужны точки замера">⚠ нет точек</span>'
    : norm.html;
  const short = { fixed: 'Фиксированный', variable: 'Вариабельный', interval: 'Интервал' };
  return `<div class="et-type" title="${escapeAttr(controlTypeLabel(type))}">${escapeHtml(short[type] || controlTypeLabel(type))}</div><div class="et-norm">${normHtml}</div>`;
}

/* Расписание: «N / 14 смен» или «не в расписании» */
function etScheduleHtml(row, line) {
  const s = editorRowSchedule(row, line);
  if (!s.member) return '<span class="et-sch et-sch-out">не в расписании</span>';
  return `<span class="et-sch ${s.count ? 'et-sch-in' : 'et-sch-empty'}" title="${s.count ? '' : 'В расписании, но смены не отмечены'}">${s.count} / 14 смен</span><span class="et-sch-bar"><i style="width:${Math.round(s.count / 14 * 100)}%"></i></span>`;
}

function etStatusHtml(isActive) {
  return isActive
    ? '<span class="et-st et-st-on" title="Активен">Активен</span>'
    : '<span class="et-st et-st-off" title="Неактивен — меняется на странице стандарта">Неактивен</span>';
}

/* Строка-заголовок группы машины */
function etGroupRow(machine, zone, count, colspan, word) {
  return `<tr class="et-grp cil-z${zone}"><td colspan="${colspan}">Машина ${escapeHtml(machine || '—')}<span>${count} ${word}</span></td></tr>`;
}

function etPluralStd(n) {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return 'стандарт';
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return 'стандарта';
  return 'стандартов';
}

/* ============================================================
   МЕХАНИЧЕСКИЕ СТАНДАРТЫ: рендер таблицы
   ============================================================ */

function refreshEditorMechTable() {
  const wrap = $('#editorMechTableWrap');
  const paginationEl = $('#editorMechPagination');
  if (!wrap) return;

  const line = localStorage.getItem('cl_editor_line') || '';
  const standards = getFilteredMechStandards();
  updateMechSelectionUI(standards);

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

  const zones = cilZoneMap(standards);
  const perMachine = {};
  standards.forEach(s => { perMachine[s.machine || '—'] = (perMachine[s.machine || '—'] || 0) + 1; });

  let html = `
    <table class="et-table">
      <thead><tr>
        <th class="et-c-check"><input type="checkbox" id="emCheckAll" title="Выделить все на странице"></th>
        <th class="et-c-opl">OPL №</th>
        <th>Стандарт</th>
        <th class="et-c-part">Часть</th>
        <th class="et-c-type">Тип / норма</th>
        <th class="et-c-ap">Применять к</th>
        <th class="et-c-sch">Расписание</th>
        <th class="et-c-ph">Фото</th>
        <th class="et-c-st">Статус</th>
        <th class="et-c-act"></th>
      </tr></thead><tbody>`;

  let curMachine = null;
  pageItems.forEach(st => {
    const m = st.machine || '—';
    if (m !== curMachine) {
      curMachine = m;
      html += etGroupRow(m, zones[m], perMachine[m], 10, etPluralStd(perMachine[m]));
    }
    const isActive = st.active !== false;
    const isSelected = editorTableState.mechSelected.has(st.id);
    const id = escapeAttr(st.id);
    const photos = Array.isArray(st.photos) ? st.photos.length : 0;
    html += `
      <tr data-std-id="${id}" class="${isSelected ? 'is-selected' : ''} ${isActive ? '' : 'et-row-inactive'}">
        <td class="et-c-check cil-z${zones[m]}"><input type="checkbox" class="et-check-row" data-std-id="${id}" ${isSelected ? 'checked' : ''}></td>
        <td class="et-c-opl"><button type="button" class="et-opl" data-open-view="${id}">${escapeHtml(st.oplNumber || '—')}</button></td>
        <td>
          <button type="button" class="et-name" data-open-view="${id}">${escapeHtml(st.title || '—')}</button>
          ${st.node ? `<div class="et-sub">${CIL_ICONS.gear}${escapeHtml(st.node)}</div>` : ''}
        </td>
        <td class="et-c-part">${st.nodePart ? `<span class="et-part-chip et-part-${st.nodePart.toLowerCase()}">${escapeHtml(st.nodePart)}</span>` : '<span class="et-dim">—</span>'}</td>
        <td class="et-c-type">${etTypeNormHtml(st, false)}</td>
        <td class="et-c-ap">${etAppliesHtml(st.appliesTo)}</td>
        <td class="et-c-sch">${etScheduleHtml(st, line)}</td>
        <td class="et-c-ph">${photos ? `<span class="et-ph">${ET_ICONS.cam}${photos}</span>` : '<span class="et-dim">—</span>'}</td>
        <td class="et-c-st">${etStatusHtml(isActive)}</td>
        <td class="et-c-act"><div class="et-acts">
          <button type="button" class="et-ib" data-edit="${id}" title="Редактировать">${ET_ICONS.edit}</button>
          <button type="button" class="et-ib" data-copy="${id}" title="Копировать">${ET_ICONS.copy}</button>
          <button type="button" class="et-ib et-ib-del" data-delete="${id}" title="Удалить">${ET_ICONS.del}</button>
        </div></td>
      </tr>`;
  });
  html += '</tbody></table>';
  wrap.innerHTML = html;

  renderEditorMechPagination(standards.length, totalPages, startIdx, endIdx);

  // --- Обработчики ---
  wrap.querySelectorAll('[data-open-view]').forEach(el => {
    el.addEventListener('click', () => openStandardFullView(el.dataset.openView, 'view'));
  });
  wrap.querySelectorAll('[data-edit]').forEach(btn => {
    btn.addEventListener('click', () => openStandardFullView(btn.dataset.edit, 'edit'));
  });
  wrap.querySelectorAll('[data-copy]').forEach(btn => {
    btn.addEventListener('click', () => copyStandardNew(btn.dataset.copy));
  });
  wrap.querySelectorAll('[data-delete]').forEach(btn => {
    btn.addEventListener('click', () => deleteStandardNew(btn.dataset.delete));
  });
  wrap.querySelectorAll('.et-check-row').forEach(cb => {
    cb.addEventListener('change', () => {
      if (cb.checked) editorTableState.mechSelected.add(cb.dataset.stdId);
      else editorTableState.mechSelected.delete(cb.dataset.stdId);
      updateMechSelectionUI();
    });
  });
  const checkAll = wrap.querySelector('#emCheckAll');
  if (checkAll) {
    checkAll.checked = pageItems.every(st => editorTableState.mechSelected.has(st.id));
    checkAll.addEventListener('change', () => {
      pageItems.forEach(st => checkAll.checked
        ? editorTableState.mechSelected.add(st.id)
        : editorTableState.mechSelected.delete(st.id));
      refreshEditorMechTable();
    });
  }
}

/* --- Счётчик в шапке («N из M · выбрано K») и подсветка выбранных строк --- */
function updateMechSelectionUI(filtered) {
  const line = localStorage.getItem('cl_editor_line') || '';
  const list = filtered || getFilteredMechStandards();
  const lineAll = line ? getStandards().filter(s => s.line === line) : getStandards();
  const inSchedule = line ? lineAll.filter(s => editorRowSchedule(s, line).member).length : 0;
  const selected = editorTableState.mechSelected.size;
  const countEl = $('#editorMechCount');
  if (countEl) {
    countEl.textContent = (list.length === lineAll.length ? `${lineAll.length} стандартов` : `${list.length} из ${lineAll.length}`)
      + (line ? ` · ${inSchedule} в расписании` : '')
      + (selected ? ` · выбрано ${selected}` : '');
  }
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
