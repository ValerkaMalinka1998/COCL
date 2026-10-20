/* ============================================================
   СТАНДАРТЫ CL: таблица электронных параметров + Excel
   Модуль общего пространства имён: функции и переменные видны
   во всех файлах. Порядок подключения — index.html.
   ============================================================ */

/* ============================================================
   ЭЛЕКТРОННЫЕ ПАРАМЕТРЫ: фильтрация
   ============================================================ */

function getFilteredElecParams() {
  const line = localStorage.getItem('cl_editor_line') || '';
  const machine = $('#eeFilterMachine')?.value || '';
  const controlType = $('#eeFilterControlType')?.value || '';
  const type = $('#eeFilterType')?.value || '';
  const sched = $('#eeFilterSchedule')?.value || '';
  const part = $('#eeFilterPart')?.value || '';
  const activeFilter = $('#eeFilterActive')?.value || '';
  const search = ($('#eeFilterSearch')?.value || '').trim().toLowerCase();

  const filtered = getElectronicParams().map(normalizeElectronicParam).filter(p => {
    if (line && p.line !== line) return false;
    if (machine && p.machine !== machine) return false;
    if (controlType && p.controlType !== controlType) return false;
    if (!editorAppliesMatch(p.appliesTo, type)) return false;
    if (part && p.nodePart !== part) return false;
    if (activeFilter === 'active' && p.active === false) return false;
    if (activeFilter === 'inactive' && p.active !== false) return false;
    if (sched && (editorRowSchedule(p, line).member ? 'in' : 'out') !== sched) return false;
    if (search) {
      const hay = [p.paramName, p.machine, p.nodePart].map(v => String(v || '').toLowerCase()).join(' ');
      if (!hay.includes(search)) return false;
    }
    return true;
  });

  // Группы по машинам, внутри — по названию
  return cilSortRows(filtered);
}

function etPluralParam(n) {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return 'параметр';
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return 'параметра';
  return 'параметров';
}

/* ============================================================
   ЭЛЕКТРОННЫЕ ПАРАМЕТРЫ: рендер таблицы
   ============================================================ */

function refreshEditorElecTable() {
  const wrap = $('#editorElecTableWrap');
  const paginationEl = $('#editorElecPagination');
  if (!wrap) return;

  const line = localStorage.getItem('cl_editor_line') || '';
  const params = getFilteredElecParams();
  updateElecSelectionUI(params);

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

  const zones = cilZoneMap(params);
  const perMachine = {};
  params.forEach(p => { perMachine[p.machine || '—'] = (perMachine[p.machine || '—'] || 0) + 1; });

  let html = `
    <table class="et-table${lineHasParts(localStorage.getItem('cl_editor_line') || '') ? '' : ' et-no-part'}">
      <thead><tr>
        <th class="et-c-check"><input type="checkbox" id="eeCheckAll" title="Выделить все на странице"></th>
        <th>Параметр</th>
        <th class="et-c-part">Часть</th>
        <th class="et-c-type">Тип / норма</th>
        <th class="et-c-ap">Применять к</th>
        <th class="et-c-sch">Расписание</th>
        <th class="et-c-st">Статус</th>
        <th class="et-c-act"></th>
      </tr></thead><tbody>`;

  let curMachine = null;
  pageItems.forEach(p => {
    const m = p.machine || '—';
    if (m !== curMachine) {
      curMachine = m;
      html += etGroupRow(m, zones[m], perMachine[m], 8, etPluralParam(perMachine[m]));
    }
    const isActive = p.active !== false;
    const isSelected = editorTableState.elecSelected.has(p.id);
    const id = escapeAttr(p.id);
    html += `
      <tr data-param-id="${id}" class="${isSelected ? 'is-selected' : ''} ${isActive ? '' : 'et-row-inactive'}">
        <td class="et-c-check cil-z${zones[m]}"><input type="checkbox" class="et-check-row" data-param-id="${id}" ${isSelected ? 'checked' : ''}></td>
        <td><button type="button" class="et-name" data-edit-elec="${id}">${escapeHtml(p.paramName || '—')}</button>${valChipHtml(p)}</td>
        <td class="et-c-part">${p.nodePart ? `<span class="et-part-chip et-part-${p.nodePart.toLowerCase()}">${escapeHtml(p.nodePart)}</span>` : '<span class="et-dim">—</span>'}</td>
        <td class="et-c-type">${etTypeNormHtml(p, true)}</td>
        <td class="et-c-ap">${etAppliesHtml(p.appliesTo)}</td>
        <td class="et-c-sch">${etScheduleHtml(p, line)}</td>
        <td class="et-c-st">${etStatusHtml(isActive)}</td>
        <td class="et-c-act"><div class="et-acts">
          <button type="button" class="et-ib" data-edit-elec="${id}" title="Редактировать">${ET_ICONS.edit}</button>
          <button type="button" class="et-ib et-ib-del" data-delete-elec="${id}" title="Удалить">${ET_ICONS.del}</button>
        </div></td>
      </tr>`;
  });
  html += '</tbody></table>';
  wrap.innerHTML = html;

  renderEditorElecPagination(params.length, totalPages, startIdx, endIdx);

  // Обработчики: название и карандаш открывают страницу параметра
  wrap.querySelectorAll('[data-edit-elec]').forEach(btn => {
    btn.addEventListener('click', () => openEparamPage(btn.dataset.editElec));
  });
  wrap.querySelectorAll('[data-delete-elec]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.deleteElec;
      const p = getElectronicParams().find(x => x.id === id);
      if (!p) return;
      if (!confirm(`Удалить параметр "${p.paramName}"?`)) return;
      setElectronicParams(getElectronicParams().filter(x => x.id !== id));
      const logId = addChangeLogEntry('elec', p, 'removed', 'Параметр удалён');
      editorTableState.elecSelected.delete(id);
      fillEditorFilters();
      updatePartCounters();
      refreshEditorElecTable();
      showToast('Параметр удалён');
      askChangeReason(logId);
    });
  });
  wrap.querySelectorAll('.et-check-row').forEach(cb => {
    cb.addEventListener('change', () => {
      if (cb.checked) editorTableState.elecSelected.add(cb.dataset.paramId);
      else editorTableState.elecSelected.delete(cb.dataset.paramId);
      updateElecSelectionUI();
    });
  });
  const checkAll = wrap.querySelector('#eeCheckAll');
  if (checkAll) {
    checkAll.checked = pageItems.every(p => editorTableState.elecSelected.has(p.id));
    checkAll.addEventListener('change', () => {
      pageItems.forEach(p => checkAll.checked
        ? editorTableState.elecSelected.add(p.id)
        : editorTableState.elecSelected.delete(p.id));
      refreshEditorElecTable();
    });
  }
}

function updateElecSelectionUI(filtered) {
  const line = localStorage.getItem('cl_editor_line') || '';
  const list = filtered || getFilteredElecParams();
  const lineAll = line ? getElectronicParamsForLine(line) : getElectronicParams();
  const inSchedule = line ? lineAll.filter(p => editorRowSchedule(p, line).member).length : 0;
  const selected = editorTableState.elecSelected.size;
  const countEl = $('#editorElecCount');
  if (countEl) {
    countEl.textContent = (list.length === lineAll.length ? `${lineAll.length} ${etPluralParam(lineAll.length)}` : `${list.length} из ${lineAll.length}`)
      + (line ? ` · ${inSchedule} в расписании` : '')
      + (selected ? ` · выбрано ${selected}` : '');
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
    'Работа', 'Время с', 'Время по', 'Применять к', 'Значения по брендам', 'Активен', 'Top Losses'];
  ws.addRow(headers);

  // Пример
  ws.addRow([
    'Давление в камере', line, 'Maker', 'SE',
    'variable', '92 ± 5',
    'Run', '09:10', '10:00',
    'ChangeOver, CL_TO',
    'Kent|92|5; |90|3',
    'Да',
    ''
  ]);

  const widths = [30, 10, 18, 10, 14, 16, 8, 10, 10, 22, 40, 8, 36];
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
    ['5. «Top Losses» — названия потерь цеха линии через запятую (как в Настройках).'],
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
    'Работа', 'Время с', 'Время по', 'Применять к', 'Значения по брендам', 'Активен', 'Top Losses'];
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
      p.active !== false ? 'Да' : 'Нет',
      (Array.isArray(p.topLosses) ? p.topLosses : [])
        .map(id => findLossById(id)?.name).filter(Boolean).join(', ')
    ]);
  });

  const widths = [30, 10, 18, 10, 14, 16, 8, 10, 10, 22, 40, 8, 36];
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
    for (let c = 1; c <= 13; c++) vals.push(row.getCell(c).text || '');
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

    // Top Losses — по названию среди потерь цеха линии
    const wsLosses = getTopLossesForWorkshop(getWorkshopIdForLine(line)).flatMap(c => c.items || []);
    const topLosses = String(vals[12] || '').split(/[,;]/).map(x => x.trim()).filter(Boolean)
      .map(name => wsLosses.find(l => l.name.toLowerCase() === name.toLowerCase())?.id)
      .filter(Boolean);

    const id = makeElectronicParamId();
    const p = {
      id, active,
      line, machine, nodePart: lineHasParts(line) ? nodePart : '', paramName,
      work: normWork(work),
      timeFrom, timeTo,
      controlType, normText,
      valuesByBrand,
      appliesTo,
      topLosses,
      frequency: { type: 'weekly', schedule: [], shifts: ['day', 'night'], daysOfWeek: [], dates: [] },
      inSchedule: false,
      author: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    all.push(p);
    addChangeLogEntry('elec', p, 'added', 'Новый параметр (импорт из Excel)');
    imported++;
  });

  setElectronicParams(all);
  return imported;
}
