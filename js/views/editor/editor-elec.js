/* ============================================================
   СТАНДАРТЫ CL: таблица электронных параметров + Excel
   Модуль общего пространства имён: функции и переменные видны
   во всех файлах. Порядок подключения — index.html.
   ============================================================ */

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
      openEparamPage(btn.dataset.editElec);
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
  const line = localStorage.getItem('cl_editor_line');
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
  const line = localStorage.getItem('cl_editor_line');
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
