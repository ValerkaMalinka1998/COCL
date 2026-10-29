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
  const valFilter = $('#eeFilterValidation')?.value || '';
  const search = ($('#eeFilterSearch')?.value || '').trim().toLowerCase();

  const filtered = getElectronicParams().map(normalizeElectronicParam).filter(p => {
    if (line && p.line !== line) return false;
    if (machine && p.machine !== machine) return false;
    if (controlType && p.controlType !== controlType) return false;
    if (!editorAppliesMatch(p.appliesTo, type)) return false;
    if (part && p.nodePart !== part) return false;
    if (activeFilter === 'active' && p.active === false) return false;
    if (activeFilter === 'inactive' && p.active !== false) return false;
    if (valFilter === 'on' && !isOnValidation(p)) return false;
    if (valFilter === 'done' && !['ended', 'approved', 'rejected'].includes(validationStatus(p))) return false;
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
        <th class="et-c-ap">CL относится к</th>
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
      <tr data-param-id="${id}" class="${isSelected ? 'is-selected' : ''} ${isActive ? '' : 'et-row-inactive'} ${validationStatus(p) === 'active' ? 'et-row-val' : ''}">
        <td class="et-c-check cil-z${zones[m]}"><input type="checkbox" class="et-check-row" data-param-id="${id}" ${isSelected ? 'checked' : ''}></td>
        <td><button type="button" class="et-name" data-view-elec="${id}">${escapeHtml(p.paramName || '—')}</button>${valChipHtml(p)}</td>
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

  renderEditorPagination('elec', params.length, totalPages, startIdx, endIdx);

  // Название — страница параметра в режиме просмотра, карандаш — редактирование
  wrap.querySelectorAll('[data-view-elec]').forEach(btn => {
    btn.addEventListener('click', () => openEparamPage(btn.dataset.viewElec, 'view'));
  });
  wrap.querySelectorAll('[data-edit-elec]').forEach(btn => {
    btn.addEventListener('click', () => openEparamPage(btn.dataset.editElec));
  });
  wrap.querySelectorAll('[data-delete-elec]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.deleteElec;
      const p = getElectronicParams().find(x => x.id === id);
      if (!p) return;
      if (!confirm(`Удалить параметр "${p.paramName}"?`)) return;
      removeElectronicParam(id);
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
  if (typeof updateEditorBulk === 'function') updateEditorBulk('elec');
}

/* ============================================================
   ЭЛЕКТРОННЫЕ ПАРАМЕТРЫ: шаблон / экспорт / импорт Excel
   Тот же подход, что у стандартов (js/io/standards-io.js):
   «Параметры» — строка на параметр, выпадающие списки;
   «Значения»  — сверху строки сами повторяют «Параметры» (Параметр · Машина,
                 «Все бренды», тип), ниже — дополнительные бренды;
   «Списки»    — скрытый лист-источник списков; «Инструкция».
   Норма — точки Т1…Т10 по брендам, как у стандартов (листы «Стандарты» / «Точки»).
   Импорт понимает и старые форматы («Номинал / Допуск / От / До», колонка «Значения по брендам»).
   ============================================================ */

const EP_SHEET = { main: 'Параметры', vals: 'Значения' };
const EP_COLS = [
  { key: 'line',     title: 'Линия',                     width: 10, hint: 'код линии, например SD12' },
  { key: 'nodePart', title: 'Часть линии',               width: 13, hint: 'Maker или Packer — из списка (только SMD)' },
  { key: 'machine',  title: 'Машина',                    width: 11, hint: 'из списка машин линии; новую можно вписать' },
  { key: 'name',     title: 'Параметр',                  width: 32, hint: 'название, уникально на машине' },
  { key: 'type',     title: 'Тип контроля',              width: 22, hint: 'из списка: Фиксированный / Вариабельный / Контролируемый интервал' },
  { key: 'normText', title: 'Что считается «ОК»',        width: 28, hint: 'описание: что считается «ОК» (для фиксированного без точек — обязательно)' },
  { key: 'work',     title: 'Работа',                    width: 9,  hint: 'Run / Stop / CIL — из списка' },
  { key: 'duration', title: 'Время на проверку, сек',    width: 12, hint: 'целое число секунд' },
  { key: 'applies',  title: 'CL относится к',            width: 20, hint: 'ChangeOver, CL_TO, CL_Conversion — через запятую' },
  { key: 'active',   title: 'Активен',                   width: 10, hint: 'Да / Нет — из списка' },
  { key: 'losses',   title: 'Top Losses',                width: 32, hint: 'названия потерь цеха через запятую (как в Настройках)' }
];
const EP_COL = {};
EP_COLS.forEach((c, i) => { EP_COL[c.key] = i + 1; });
const EP_VAL_HEAD = ['Параметр (Параметр · Машина)', 'Бренд', 'Тип контроля'].concat(Array.from({ length: XL_PTS }, (_, i) => `Т${i + 1}`));

function epKey(p) { return `${p.paramName || ''} · ${p.machine || ''}`; }

/* Строка листа «Параметры» */
function epRowFromParam(p, line) {
  const type = migrateControlType(p.controlType, null);
  return [
    p.line || line, p.nodePart || '', p.machine || '', p.paramName || '',
    XL_TYPES[type] || '', p.normText || '',
    normWork(p.work), Number(p.durationSec) || '',
    Array.isArray(p.appliesTo) ? p.appliesTo.join(', ') : '',
    p.active !== false ? 'Да' : 'Нет',
    (Array.isArray(p.topLosses) ? p.topLosses : []).map(id => findLossById(id)?.name).filter(Boolean).join(', ')
  ];
}

function buildEparamWorkbook(params, line, title, extraInfo) {
  const wb = new ExcelJS.Workbook();
  wb.calcProperties.fullCalcOnLoad = true;
  const lists = xlListRanges(line);
  const parts = lineHasParts(line);

  // --- «Параметры» ---
  const ws = wb.addWorksheet(EP_SHEET.main);
  ws.addRow(EP_COLS.map(c => c.title));
  params.forEach(p => ws.addRow(epRowFromParam(p, line)));
  ws.columns.forEach((col, i) => { col.width = (EP_COLS[i] || {}).width || 14; });
  xlsxHeadStyle(ws, 1, 34);
  xlsxBodyStyle(ws, 2, xlLastStdRow, EP_COLS.length);
  for (let r = 2; r <= xlLastStdRow; r++) {
    if (parts) xlList(ws.getCell(r, EP_COL.nodePart), '$F$2:$F$3', true);
    xlList(ws.getCell(r, EP_COL.machine), lists.machinesRange, false);
    xlList(ws.getCell(r, EP_COL.type), '$D$2:$D$4', true);
    xlList(ws.getCell(r, EP_COL.work), '$G$2:$G$4', true);
    xlList(ws.getCell(r, EP_COL.active), '$E$2:$E$3', true);
  }
  ws.views = [{ state: 'frozen', xSplit: 4, ySplit: 1 }];

  // --- «Значения» ---
  const wv = wb.addWorksheet(EP_SHEET.vals);
  wv.addRow(EP_VAL_HEAD);
  wv.columns.forEach((col, i) => { col.width = [30, 22, 22][i] || 13; });
  const extra = [];
  const typeOf = (p) => migrateControlType(p.controlType, null);
  const ptsOf = (block) => (Array.isArray(block && block.points) ? block.points : [])
    .map(pt => String(pt && pt.value != null ? pt.value : '').trim()).slice(0, XL_PTS);
  for (let r = 2; r <= xlLastStdRow; r++) {
    const p = params[r - 2];
    const list = p && Array.isArray(p.measurements) ? p.measurements.filter(m => ptsOf(m).length) : [];
    const main = list.find(m => !m.brand) || list[0] || null;
    list.filter(m => m !== main).forEach(m => extra.push({ p, v: m }));
    const nameRef = xlRef(EP_SHEET.main, 'D' + r), machRef = xlRef(EP_SHEET.main, 'C' + r);
    wv.getCell(r, 1).value = { formula: `IF(${nameRef}="","",${nameRef}&" · "&${machRef})`, result: p ? epKey(p) : '' };
    wv.getCell(r, 2).value = main && main.brand
      ? main.brand
      : { formula: `IF(A${r}="","","${REST_BRANDS_LABEL}")`, result: p ? REST_BRANDS_LABEL : '' };
    wv.getCell(r, 3).value = { formula: `IF(A${r}="","",${xlRef(EP_SHEET.main, 'E' + r)})`, result: p ? XL_TYPES[typeOf(p)] || '' : '' };
    ptsOf(main).forEach((x, i) => { wv.getCell(r, 4 + i).value = x; });
  }
  xlsxHeadStyle(wv, 1, 30);
  xlsxBodyStyle(wv, 2, xlLastStdRow, EP_VAL_HEAD.length);
  for (let r = 2; r <= xlLastStdRow; r++) { xlAutoCell(wv.getCell(r, 1)); xlAutoCell(wv.getCell(r, 3)); }
  const sep = xlLastStdRow + 1;
  wv.getCell(sep, 1).value = XL_EXTRA_HEAD;
  wv.mergeCells(sep, 1, sep, EP_VAL_HEAD.length);
  wv.getRow(sep).height = 26;
  wv.getCell(sep, 1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  wv.getCell(sep, 1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4B5E8A' } };
  const first = sep + 1, last = sep + XL_EXTRA;
  for (let r = first; r <= last; r++) {
    const x = extra[r - first];
    wv.getCell(r, 1).value = x ? epKey(x.p) : null;
    wv.getCell(r, 2).value = x ? (x.v.brand || REST_BRANDS_LABEL) : null;
    wv.getCell(r, 3).value = {
      formula: `IF(A${r}="","",IFERROR(INDEX(${xlRef(EP_SHEET.main, `$E$2:$E$${xlLastStdRow}`)},MATCH(A${r},${xlRef(XL_SHEET.lists, `$A$2:$A$${xlLastStdRow}`)},0)),""))`,
      result: x ? XL_TYPES[typeOf(x.p)] || '' : ''
    };
    if (x) ptsOf(x.v).forEach((c, i) => { wv.getCell(r, 4 + i).value = c; });
    xlList(wv.getCell(r, 1), `$A$2:$A$${xlLastStdRow}`, true);
    xlList(wv.getCell(r, 2), lists.brandsRange, false);
  }
  xlsxBodyStyle(wv, first, last, EP_VAL_HEAD.length);
  for (let r = first; r <= last; r++) xlAutoCell(wv.getCell(r, 3));
  wv.views = [{ state: 'frozen', xSplit: 3, ySplit: 1 }];

  // --- «Инструкция» ---
  const wi = wb.addWorksheet('Инструкция');
  wi.columns = [{ width: 110 }];
  const info = [
    [title], [''],
    ['ЛИСТ «ПАРАМЕТРЫ» — по одной строке на параметр.'],
    ['Обязательные колонки: Линия, Машина, Параметр, Тип контроля. Часть линии — только для SMD.'],
    ['Машину, часть линии, тип, работу и «Активен» выбирайте из выпадающего списка.'],
    ['']
  ];
  EP_COLS.forEach(c => { if (c.hint) info.push([`  • ${c.title} — ${c.hint}`]); });
  info.push(
    [''],
    ['ЛИСТ «ЗНАЧЕНИЯ» — точки по брендам, как лист «Точки» у стандартов.'],
    ['  • Верхние строки заполняются САМИ: добавили параметр на лист «Параметры» — здесь в той же строке'],
    [`    появились «Параметр · Машина», бренд «${REST_BRANDS_LABEL}» и тип (серые ячейки). Впишите точки Т1, Т2, …`],
    ['  • Значение точки по типу контроля: фиксированный — число (92) или метка словами («в одну линию»);'],
    ['    вариабельный — «92 ± 5»; интервал — «5 до 8». Точку-метку словами можно в любом типе: оператор отметит ОК / Не ОК.'],
    ['  • Отдельная норма для бренда — ниже, в блоке «ДОПОЛНИТЕЛЬНЫЕ БРЕНДЫ»: выберите параметр и бренд из списка.'],
    ['  • Фиксированный без точек — проверка ОК / Не ОК по тексту «Что считается «ОК»» на листе «Параметры».'],
    ['  • Значение, не подходящее типу контроля, при импорте не пропустится — параметр попадёт в отчёт.'],
    ...(extraInfo || []).map(l => [l])
  );
  info.forEach(([t]) => wi.addRow([t]));
  wi.getRow(1).font = { bold: true, size: 16, color: { argb: 'FF0A4FA8' } };

  buildListsSheet(wb, params, line, EP_SHEET.main, epKey);
  return wb;
}

async function editorElecDownloadTemplate() {
  if (typeof ExcelJS === 'undefined') return showToast('Библиотека ExcelJS не загружена', true);
  const line = localStorage.getItem('cl_editor_line');
  if (!line) return showToast('Сначала выберите линию', true);
  const example = {
    line, nodePart: lineHasParts(line) ? 'Maker' : '', machine: getMachinesForLine(line)[0] || 'SE',
    paramName: 'Давление в камере', controlType: 'variable', work: 'Run', durationSec: 30,
    appliesTo: ['ChangeOver'], active: true, topLosses: [],
    measurements: [{ brand: '', points: [{ value: '90 ± 3' }, { value: 'в одну линию' }] }, { brand: getBrandsForLine(line)[0] || 'A', points: [{ value: '92 ± 5' }] }]
  };
  const wb = buildEparamWorkbook([example], line, `Шаблон импорта электронных параметров — линия ${line}`, [
    '', 'В шаблоне одна строка-пример: замените её своими данными.',
    'Готовый файл загрузите: Стандарты CL → Электронные → Excel → Импорт.'
  ]);
  const buf = await wb.xlsx.writeBuffer();
  downloadBlob(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `template_electronic_${line}.xlsx`);
  showToast('Шаблон скачан');
}

async function editorElecExport(onlyIds) {
  if (typeof ExcelJS === 'undefined') return showToast('Библиотека ExcelJS не загружена', true);
  const line = localStorage.getItem('cl_editor_line');
  if (!line) return showToast('Сначала выберите линию', true);
  const params = getElectronicParamsForLine(line).filter(p => !onlyIds || onlyIds.includes(p.id));
  if (!params.length) return showToast('Нет электронных параметров для экспорта', true);
  if (params.length > XL_ROWS) return showToast(`В файл помещается ${XL_ROWS} параметров, выбрано ${params.length}`, true);
  const wb = buildEparamWorkbook(params, line, `Электронные параметры линии ${line} — выгрузка ${new Date().toLocaleString('ru-RU')}`, [
    '', `Выгружено параметров: ${params.length}.`,
    'При импорте добавляются только новые параметры (Параметр + Машина); существующие пропускаются.'
  ]);
  const buf = await wb.xlsx.writeBuffer();
  downloadBlob(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `electronic_params_${line}.xlsx`);
  showToast('Электронные параметры экспортированы');
}

/* Старый формат колонки «Значения по брендам»: «Бренд|Номинал|Допуск; …» */
function parseValuesByBrand(str) {
  if (!str || !str.trim()) return [];
  const out = [];
  str.split(';').forEach(part => {
    const seg = part.trim().split('|').map(x => x.trim());
    const brand = seg[0] || '', target = seg[1] ?? '', tolerance = seg[2] ?? '';
    if (!brand && target === '' && tolerance === '') return;
    out.push({ brand, target: target === '' ? '' : Number(target), tolerance: tolerance === '' ? '' : Number(tolerance) });
  });
  return out;
}

/* Импорт: новый формат (листы «Параметры» + «Значения») и старый (одна колонка значений).
   Возвращает отчёт как у стандартов (showImportReport). */
async function parseElectronicParamsExcel(file, targetLine) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(await file.arrayBuffer());
  const ws = wb.getWorksheet(EP_SHEET.main);
  if (!ws) throw new Error('Лист «Параметры» не найден');

  const result = { added: 0, skipped: 0, duplicates: [], empty: 0, errors: [], addedMachines: [], pointsImported: 0, noun: 'параметров', pointsNoun: 'норм по брендам' };
  const isOld = xlCellText(ws.getRow(1), 1) === 'Параметр';
  const all = getElectronicParams();
  const added = [];
  const known = new Set(all.filter(p => p.line === targetLine).map(p => `${(p.paramName || '').toLowerCase()}|${p.machine || ''}`));
  const lineMachines = getLineMachines();
  if (!Array.isArray(lineMachines[targetLine])) lineMachines[targetLine] = [];
  const wsLosses = getTopLossesForWorkshop(getWorkshopIdForLine(targetLine)).flatMap(c => c.items || []);
  const lossIds = (text) => String(text || '').split(/[,;]/).map(x => x.trim()).filter(Boolean)
    .map(n => wsLosses.find(l => l.name.toLowerCase() === n.toLowerCase())?.id).filter(Boolean);
  const applies = (text) => String(text || '').split(',').map(x => x.trim()).filter(x => ['ChangeOver', 'CL_TO', 'CL_Conversion'].includes(x));

  const index = {}, byRow = {}, candidates = [];
  for (let i = 2; i <= ws.rowCount; i++) {
    const row = ws.getRow(i);
    const t = (c) => xlCellText(row, c);
    // Старый формат: Параметр | Линия | Узел/часть | Машина | Тип | Норма | Работа | Время с | Время по | Применять к | Значения | Активен | Top Losses
    const f = isOld
      ? { line: t(2), nodePart: t(3), machine: t(4), name: t(1), type: t(5) || 'variable', normText: t(6), work: t(7), duration: '', applies: t(10), active: t(12), losses: t(13), values: t(11) }
      : Object.fromEntries(EP_COLS.map(c => [c.key, t(EP_COL[c.key])]));
    if (!f.name && !f.machine) { result.empty++; continue; }
    const type = xlTypeFromText(f.type) || (isOld ? 'variable' : null);
    const errs = [];
    if (!f.name) errs.push('пустой параметр');
    if (!f.machine) errs.push('пустая машина');
    if (!type) errs.push(`тип контроля «${f.type}» — выберите из списка`);
    if (lineHasParts(targetLine) && !['Maker', 'Packer'].includes(f.nodePart)) errs.push('часть линии — Maker или Packer');
    if (f.line && f.line !== targetLine) errs.push(`линия «${f.line}» не совпадает с «${targetLine}»`);
    const key = `${f.name.toLowerCase()}|${f.machine}`;
    if (f.name && known.has(key)) { result.duplicates.push({ name: f.name, machine: f.machine }); result.skipped++; continue; }
    if (errs.length) { result.errors.push({ row: i, message: errs.join('; ') }); result.skipped++; continue; }
    const ct = migrateControlType(type, null);
    const p = normalizeElectronicParam({
      id: makeElectronicParamId(), active: f.active.toLowerCase() !== 'нет',
      line: targetLine, machine: f.machine, nodePart: lineHasParts(targetLine) ? f.nodePart : '', paramName: f.name,
      work: normWork(f.work), durationSec: Math.max(0, parseInt(f.duration, 10) || 0),
      controlType: ct, normText: f.normText,
      valuesByBrand: isOld ? parseValuesByBrand(f.values) : [],
      appliesTo: applies(f.applies), topLosses: lossIds(f.losses),
      frequency: { type: 'weekly', schedule: [], shifts: ['day', 'night'], daysOfWeek: [], dates: [] },
      inSchedule: false, author: '', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
    });
    index[key] = p; byRow[i] = p; known.add(key);
    candidates.push({ p, row: i });
  }

  // --- «Значения»: точки Т1…Т10 или старые Номинал / Допуск / От / До ---
  const legacyBad = {};
  const wv = isOld ? null : wb.getWorksheet(EP_SHEET.vals);
  if (wv) {
    const pointsFmt = /^Т\d/i.test(xlCellText(wv.getRow(1), 4));
    const lastCol = Math.max(wv.getRow(1).cellCount, 3 + XL_PTS);
    for (let i = 2; i <= wv.rowCount; i++) {
      const row = wv.getRow(i);
      const keyText = xlCellText(row, 1);
      if (keyText && keyText.startsWith('ДОПОЛНИТЕЛЬНЫЕ')) continue;
      let p = null;
      if (!keyText && xlIsBareFormula(row, 1)) p = byRow[i] || null;
      else if (keyText) {
        const cut = keyText.lastIndexOf(' · ');
        p = index[`${(cut >= 0 ? keyText.slice(0, cut) : keyText).trim().toLowerCase()}|${cut >= 0 ? keyText.slice(cut + 3).trim() : ''}`] || null;
      }
      if (!p) continue;
      const brandText = xlIsBareFormula(row, 2) ? REST_BRANDS_LABEL : xlCellText(row, 2);
      const brand = !brandText || isRestBrandLabel(brandText) ? '' : brandText;
      let points = [];
      if (pointsFmt) {
        for (let c = 4; c <= lastCol; c++) { const v = xlCellText(row, c); if (v) points.push({ value: v }); }
      } else {
        const num = (c) => { const s = xlCellText(row, c).replace(',', '.'); return s === '' ? '' : Number(s); };
        const [target, tolerance, min, max] = [4, 5, 6, 7].map(num);
        if ([target, tolerance, min, max].every(x => x === '')) continue;
        const okN = (x) => x !== '' && Number.isFinite(x);
        const isIv = p.controlType === 'interval';
        const name = brand || REST_BRANDS_LABEL;
        if (isIv ? !okN(min) || !okN(max) : !okN(target) || !okN(tolerance)) legacyBad[p.id] = name + ': значения — числа';
        else if (isIv ? min > max : tolerance < 0) legacyBad[p.id] = name + ': ' + (isIv ? '«От» больше «До»' : 'допуск не может быть отрицательным');
        else points = (eparamLegacyMeasurements([{ brand, target, tolerance, min, max }], p.controlType)[0] || {}).points || [];
      }
      if (!points.length) continue;
      p.measurements = p.measurements.filter(m => (m.brand || '') !== brand).concat({ brand, points });
      result.pointsImported += points.length;
    }
  }

  // --- Проверка «тип контроля ↔ значение» и сохранение ---
  candidates.forEach(({ p, row }) => {
    const bad = [];
    if (legacyBad[p.id]) bad.push(legacyBad[p.id]);
    const hasPts = p.measurements.some(m => m.points.some(pt => pt.value));
    if (p.controlType === 'fixed' && !hasPts && !p.normText.trim()) bad.push('для фиксированного укажите «Что считается «ОК»» или точки');
    if (p.controlType !== 'fixed' && !hasPts && !legacyBad[p.id]) bad.push('нет нормы ни для одного бренда (лист «Значения»)');
    p.measurements.forEach(m => m.points.forEach((pt, pi) => {
      const err = normTypeError(p.controlType, pt.value);
      if (err) bad.push(`${m.brand || REST_BRANDS_LABEL}, т.${pi + 1}: ${err}`);
    }));
    if (bad.length) {
      result.errors.push({ row, message: `${p.paramName}: ${bad.slice(0, 3).join('; ')}` });
      result.skipped++;
      return;
    }
    if (!lineMachines[targetLine].includes(p.machine)) {
      lineMachines[targetLine].push(p.machine);
      result.addedMachines.push(p.machine);
    }
    added.push(p);
    addChangeLogEntry('elec', p, 'added', 'Новый параметр (импорт из Excel)');
    result.added++;
  });

  saveElectronicParams(added);
  if (result.addedMachines.length) setLineMachines(lineMachines);
  return result;
}
