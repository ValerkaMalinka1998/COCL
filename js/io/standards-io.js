/* ============================================================
   EXCEL: шаблон, экспорт и импорт стандартов линии
   Один формат на все три операции. Макросов нет — только формулы
   и выпадающие списки (работают в любом Excel без предупреждений):
   «Стандарты» — строка на стандарт, списки машин, частей, типов;
   «Точки»     — сверху строки сами повторяют «Стандарты» (OPL · Машина,
                 «Все бренды», тип), ниже — дополнительные бренды:
                 стандарт и бренд выбираются из списка;
   «Списки»    — скрытый лист-источник выпадающих списков;
   «Инструкция».
   Импорт понимает и старый формат листа «Точки» (OPL № | Машина | Бренд).
   Модуль общего пространства имён: функции и переменные видны
   во всех файлах. Порядок подключения — index.html.
   ============================================================ */

/* Колонки листа «Стандарты» — порядок общий для шаблона, экспорта
   и импорта (импорт читает по номеру колонки). Менять только вместе
   с stdRowFromStandard. */
const STD_COLS = [
  { key: 'line',     title: 'Линия',             width: 10, hint: 'код линии, например SD12' },
  { key: 'nodePart', title: 'Часть линии',       width: 13, hint: 'Maker или Packer — из списка (только SMD)' },
  { key: 'machine',  title: 'Машина',            width: 11, hint: 'из списка машин линии; новую можно вписать' },
  { key: 'opl',      title: 'OPL №',             width: 15, hint: 'уникален в пределах линии и машины' },
  { key: 'node',     title: 'Узел',              width: 28, hint: 'узел машины' },
  { key: 'title',    title: 'Название',          width: 36, hint: 'что проверяем' },
  { key: 'type',     title: 'Тип контроля',      width: 22, hint: 'из списка: Фиксированный / Вариабельный / Контролируемый интервал' },
  { key: 'applies',  title: 'CL относится к',    width: 20, hint: 'ChangeOver, CL_TO, CL_Conversion — через запятую' },
  { key: 'active',   title: 'Активен',           width: 10, hint: 'Да / Нет — из списка' },
  { key: 'problem',  title: 'Описание',          width: 34, hint: 'зачем нужен контроль' },
  { key: 'control',  title: 'Описание контроля', width: 38, hint: 'описание контроля для оператора' },
  { key: 'purpose',  title: 'Цель (зачем мы это делаем?)', width: 28, hint: '' },
  { key: 'why',      title: 'Знаю почему (почему создан стандарт?)', width: 28, hint: '' },
  { key: 'photos',   title: 'Фото',              width: 26, hint: 'имена файлов через запятую' }
];
const STD_COL = {};
STD_COLS.forEach((c, i) => { STD_COL[c.key] = i + 1; });

const XL_ROWS = 300;       // строк под стандарты (и под их строки на «Точках»)
const XL_EXTRA = 500;      // строк под дополнительные бренды
const XL_PTS = 10;         // колонок Т1…Т10
const XL_SHEET = { std: 'Стандарты', pts: 'Точки', lists: 'Списки' };
const XL_TYPES = { fixed: 'Фиксированный', variable: 'Вариабельный', interval: 'Контролируемый интервал' };
const XL_EXTRA_HEAD = 'ДОПОЛНИТЕЛЬНЫЕ БРЕНДЫ — выберите стандарт и бренд из списка, впишите точки';

const xlRef = (sheet, ref) => `'${sheet}'!${ref}`;
const xlLastStdRow = XL_ROWS + 1;

/* Тип контроля из текста ячейки: русское название или код (в т.ч. старые) */
function xlTypeFromText(v) {
  const s = String(v || '').trim();
  if (!s) return '';
  const ru = Object.entries(XL_TYPES).find(([, label]) => label.toLowerCase() === s.toLowerCase());
  if (ru) return ru[0];
  if (/^интервал$/i.test(s)) return 'interval';
  if (['fixed', 'variable', 'interval', 'ok_not_ok', 'value_input', 'range_input', 'tolerance'].includes(s)) return s;
  return null;
}

/* --- Оформление --- */
function xlsxHeadStyle(ws, row, height) {
  const r = ws.getRow(row);
  r.height = height || 32;
  r.eachCell((cell) => {
    cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0A4FA8' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = {
      top: { style: 'thin' }, bottom: { style: 'thin' },
      left: { style: 'thin' }, right: { style: 'thin' }
    };
  });
}

function xlsxBodyStyle(ws, fromRow, toRow, cols) {
  for (let i = fromRow; i <= toRow; i++) {
    const row = ws.getRow(i);
    row.height = 22;
    for (let c = 1; c <= cols; c++) {
      const cell = row.getCell(c);
      cell.font = { name: 'Calibri', size: 11 };
      cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
      cell.border = {
        top:    { style: 'thin', color: { argb: 'FFCBD2D9' } },
        bottom: { style: 'thin', color: { argb: 'FFCBD2D9' } },
        left:   { style: 'thin', color: { argb: 'FFCBD2D9' } },
        right:  { style: 'thin', color: { argb: 'FFCBD2D9' } }
      };
    }
  }
}

/* Ячейка «заполняется сама» — серый фон */
function xlAutoCell(cell) {
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEEF2F7' } };
  cell.font = { name: 'Calibri', size: 11, color: { argb: 'FF4B5E8A' } };
}

/* Выпадающий список из диапазона листа «Списки» */
function xlList(cell, range, strict) {
  cell.dataValidation = {
    type: 'list', allowBlank: true, formulae: [xlRef(XL_SHEET.lists, range)],
    showErrorMessage: !!strict, errorStyle: 'stop', errorTitle: 'Нет в списке', error: 'Выберите значение из списка'
  };
}

/* Ключ стандарта на листе «Точки»: «OPL · Машина» */
function xlStdKey(st) { return `${st.oplNumber || ''} · ${st.machine || ''}`; }

/* Одна строка листа «Стандарты» */
function stdRowFromStandard(st, line) {
  return [
    st.line || line,
    st.nodePart || '',
    st.machine || '',
    st.oplNumber || '',
    st.node || '',
    st.title || '',
    XL_TYPES[migrateControlType(st.controlType, st.measurements)] || '',
    Array.isArray(st.appliesTo) ? st.appliesTo.join(', ') : '',
    st.active !== false ? 'Да' : 'Нет',
    st.problemDescription || '',
    st.controlDescription || '',
    st.purpose || '',
    st.whyCreated || '',
    Array.isArray(st.photos) ? st.photos.join(', ') : ''
  ];
}

/* Лист «Списки» (скрыт): A — ключи строк главного листа (формулы «D · C»),
   B — бренды, C — машины, D — типы контроля, E — Да / Нет, F — части линии,
   G — Run / Stop / CIL. Общий для стандартов и E-Param: у обоих ключ в D, машина в C.
   mainSheet — имя главного листа, keyOf — ключ строки для посчитанного значения. */
function buildListsSheet(wb, items, line, mainSheet = XL_SHEET.std, keyOf = xlStdKey) {
  const ws = wb.addWorksheet(XL_SHEET.lists);
  ws.addRow(['Ключ', 'Бренд', 'Машина', 'Тип контроля', 'Активен', 'Часть линии', 'Работа']);
  const brands = [REST_BRANDS_LABEL, ...getBrandsForLine(line).filter(b => b && b !== REST_BRANDS_LABEL)];
  const machines = getMachinesForLine(line);
  const cols = [brands, machines, Object.values(XL_TYPES), ['Да', 'Нет'], ['Maker', 'Packer'], WORK_CYCLE];
  for (let r = 2; r <= xlLastStdRow; r++) {
    const it = items[r - 2];
    ws.getCell(r, 1).value = {
      formula: `IF(${xlRef(mainSheet, 'D' + r)}="","",${xlRef(mainSheet, 'D' + r)}&" · "&${xlRef(mainSheet, 'C' + r)})`,
      result: it ? keyOf(it) : ''
    };
    cols.forEach((list, ci) => { if (list[r - 2] != null) ws.getCell(r, ci + 2).value = list[r - 2]; });
  }
  ws.state = 'hidden';
}

/* Диапазоны списков брендов и машин на листе «Списки» (как их заполняет buildListsSheet) */
function xlListRanges(line) {
  const brands = 1 + getBrandsForLine(line).filter(b => b && b !== REST_BRANDS_LABEL).length;
  return {
    brandsRange: `$B$2:$B$${brands + 1}`,
    machinesRange: `$C$2:$C$${Math.max(2, getMachinesForLine(line).length + 1)}`
  };
}

/* Лист «Стандарты»: шапка, строки стандартов и пустые строки со списками */
function buildStdSheet(wb, standards, line, lists) {
  const ws = wb.addWorksheet(XL_SHEET.std);
  ws.addRow(STD_COLS.map(c => c.title));
  standards.forEach(st => ws.addRow(stdRowFromStandard(st, line)));
  ws.columns.forEach((col, i) => { col.width = (STD_COLS[i] || {}).width || 14; });
  xlsxHeadStyle(ws, 1, 34);
  xlsxBodyStyle(ws, 2, xlLastStdRow, STD_COLS.length);
  const parts = lineHasParts(line);
  for (let r = 2; r <= xlLastStdRow; r++) {
    if (parts) xlList(ws.getCell(r, STD_COL.nodePart), '$F$2:$F$3', true);
    xlList(ws.getCell(r, STD_COL.machine), lists.machinesRange, false);
    xlList(ws.getCell(r, STD_COL.type), '$D$2:$D$4', true);
    xlList(ws.getCell(r, STD_COL.active), '$E$2:$E$3', true);
  }
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: STD_COLS.length } };
  ws.views = [{ state: 'frozen', xSplit: 4, ySplit: 1 }];
  return ws;
}

/* Лист «Точки». Строка r сверху = строка r «Стандартов»: ключ, бренд «Все
   бренды» и тип подставляются формулами. Ниже — дополнительные бренды. */
function buildPointsSheet(wb, standards, lists) {
  const ws = wb.addWorksheet(XL_SHEET.pts);
  const head = ['Стандарт (OPL · Машина)', 'Бренд', 'Тип контроля'].concat(Array.from({ length: XL_PTS }, (_, i) => `Т${i + 1}`));
  ws.addRow(head);
  ws.columns.forEach((col, i) => { col.width = [26, 22, 22][i] || 13; });
  const ptsOf = (block) => (Array.isArray(block && block.points) ? block.points : [])
    .map(p => String(p && p.value != null ? p.value : '').trim()).slice(0, XL_PTS);
  const typeOf = (st) => XL_TYPES[migrateControlType(st.controlType, st.measurements)] || '';
  const extra = [];

  for (let r = 2; r <= xlLastStdRow; r++) {
    const st = standards[r - 2];
    const blocks = st && Array.isArray(st.measurements) ? st.measurements.filter(b => ptsOf(b).length) : [];
    // В верхнюю строку — «Все бренды»; нет такого блока — первый бренд
    const main = blocks.find(b => !b.brand) || blocks[0] || null;
    blocks.filter(b => b !== main).forEach(b => extra.push({ st, block: b }));

    const keyRef = xlRef(XL_SHEET.std, 'D' + r), machRef = xlRef(XL_SHEET.std, 'C' + r);
    ws.getCell(r, 1).value = { formula: `IF(${keyRef}="","",${keyRef}&" · "&${machRef})`, result: st ? xlStdKey(st) : '' };
    ws.getCell(r, 2).value = main && main.brand
      ? main.brand
      : { formula: `IF(A${r}="","","${REST_BRANDS_LABEL}")`, result: st ? REST_BRANDS_LABEL : '' };
    ws.getCell(r, 3).value = { formula: `IF(A${r}="","",${xlRef(XL_SHEET.std, 'G' + r)})`, result: st ? typeOf(st) : '' };
    ptsOf(main).forEach((v, i) => { ws.getCell(r, 4 + i).value = v; });
  }
  xlsxHeadStyle(ws, 1, 30);
  xlsxBodyStyle(ws, 2, xlLastStdRow, head.length);
  for (let r = 2; r <= xlLastStdRow; r++) { xlAutoCell(ws.getCell(r, 1)); xlAutoCell(ws.getCell(r, 3)); }

  // Разделитель и дополнительные бренды
  const sep = xlLastStdRow + 1;
  ws.getCell(sep, 1).value = XL_EXTRA_HEAD;
  ws.mergeCells(sep, 1, sep, head.length);
  ws.getRow(sep).height = 26;
  ws.getCell(sep, 1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  ws.getCell(sep, 1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4B5E8A' } };
  const first = sep + 1, last = sep + XL_EXTRA;
  for (let r = first; r <= last; r++) {
    const x = extra[r - first];
    ws.getCell(r, 1).value = x ? xlStdKey(x.st) : null;
    ws.getCell(r, 2).value = x ? (x.block.brand || REST_BRANDS_LABEL) : null;
    ws.getCell(r, 3).value = {
      formula: `IF(A${r}="","",IFERROR(INDEX(${xlRef(XL_SHEET.std, `$G$2:$G$${xlLastStdRow}`)},MATCH(A${r},${xlRef(XL_SHEET.lists, `$A$2:$A$${xlLastStdRow}`)},0)),""))`,
      result: x ? typeOf(x.st) : ''
    };
    if (x) ptsOf(x.block).forEach((v, i) => { ws.getCell(r, 4 + i).value = v; });
    xlList(ws.getCell(r, 1), `$A$2:$A$${xlLastStdRow}`, true);
    xlList(ws.getCell(r, 2), lists.brandsRange, false);
  }
  xlsxBodyStyle(ws, first, last, head.length);
  for (let r = first; r <= last; r++) xlAutoCell(ws.getCell(r, 3));
  ws.views = [{ state: 'frozen', xSplit: 3, ySplit: 1 }];
  return ws;
}

/* Лист «Инструкция» */
function buildInfoSheet(wb, title, extra) {
  const ws = wb.addWorksheet('Инструкция');
  ws.columns = [{ width: 110 }];
  const lines = [
    [title],
    [''],
    ['ЛИСТ «СТАНДАРТЫ» — по одной строке на стандарт.'],
    ['Обязательные колонки: Линия, Машина, OPL №, Узел, Название, Тип контроля.'],
    ['Часть линии (Maker / Packer) обязательна только для линий цеха SMD.'],
    ['Машину, тип контроля, «Активен» и часть линии выбирайте из выпадающего списка (стрелка справа в ячейке).'],
    ['']
  ];
  STD_COLS.forEach(c => { if (c.hint) lines.push([`  • ${c.title} — ${c.hint}`]); });
  lines.push(
    [''],
    ['ЛИСТ «ТОЧКИ» — нормы точек по брендам.'],
    ['  • Верхние строки заполняются САМИ: добавили стандарт на лист «Стандарты» — на «Точках» в той же строке'],
    [`    появились «OPL · Машина», бренд «${REST_BRANDS_LABEL}» и тип контроля (серые ячейки). Впишите точки Т1, Т2, …`],
    ['  • Нужна отдельная норма для бренда — ниже, в блоке «ДОПОЛНИТЕЛЬНЫЕ БРЕНДЫ»: выберите стандарт и бренд'],
    ['    из списка, впишите точки. Строк для одного стандарта — сколько нужно.'],
    [`  • Бренд в верхней строке можно заменить: «${REST_BRANDS_LABEL}» — общая норма для всех брендов без своей строки.`],
    ['  • Лишние колонки точек оставьте пустыми. Если точек нет — стандарт проверяется как ОК / Не ОК.'],
    [''],
    ['Как вписывать значение точки (по типу контроля):'],
    ['  • Фиксированный — точное число, например 92.'],
    ['  • Вариабельный — норма ± допуск, например 92 ± 5.'],
    ['  • Контролируемый интервал — границы, например 5 до 8 (для минуса: -65 до -55).'],
    ['  • В любом типе точку без размера (совпадение меток) пишите словами — оператор отметит ОК / Не ОК.'],
    ['  • Значение, которое не подходит типу, при импорте не пропустится — стандарт попадёт в отчёт об ошибках.'],
    [''],
    ['Триггеры смены сорта и Top Losses в файле не передаются — они задаются в приложении.']
  );
  (extra || []).forEach(l => lines.push([l]));
  lines.forEach(([text]) => ws.addRow([text]));
  ws.getRow(1).font = { bold: true, size: 16, color: { argb: 'FF0A4FA8' } };
  return ws;
}

/* Книга целиком: листы в порядке «Стандарты», «Точки», «Инструкция», «Списки» */
function buildStandardsWorkbook(standards, line, title, extra) {
  const wb = new ExcelJS.Workbook();
  wb.calcProperties.fullCalcOnLoad = true;
  // «Списки» — последним листом (скрыт), на него ссылаются выпадающие списки
  const listsInfo = xlListRanges(line);
  buildStdSheet(wb, standards, line, listsInfo);
  buildPointsSheet(wb, standards, listsInfo);
  buildInfoSheet(wb, title, extra);
  buildListsSheet(wb, standards, line);
  return wb;
}

/* ============================================================
   РЕДАКТОР: скачать шаблон для линии
   ============================================================ */

async function editorDownloadTemplate() {
  if (typeof ExcelJS === 'undefined') {
    return showToast('Библиотека ExcelJS не загружена', true);
  }
  const line = currentEditorLine || localStorage.getItem('cl_editor_line');
  if (!line) return showToast('Сначала выберите линию', true);

  const hasParts = lineHasParts(line);
  const brand = getBrandsForLine(line)[0] || 'A';
  const example = {
    line, nodePart: hasParts ? 'Maker' : '', machine: getMachinesForLine(line)[0] || 'SE', oplNumber: 'OPL-1.1.1',
    node: 'Узел передачи', title: 'Давление на передающем устройстве',
    controlType: 'variable', appliesTo: ['ChangeOver'], active: true,
    problemDescription: 'Отклонение давления ведёт к браку',
    controlDescription: 'Снять показание манометра на рабочем ходу',
    purpose: '', whyCreated: '', photos: [],
    measurements: [
      { brand: '', points: [{ value: '92 ± 5' }, { value: 'метки совпадают' }] },
      { brand, points: [{ value: '95 ± 5' }, { value: 'метки совпадают' }] }
    ]
  };

  const wb = buildStandardsWorkbook([example], line, `Шаблон импорта стандартов — линия ${line}`, [
    '',
    'В шаблоне одна строка-пример: замените её своими данными.',
    'Готовый файл загрузите в приложении: Стандарты CL → Excel → Импорт.'
  ]);
  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  downloadBlob(blob, `template_opl_${line}.xlsx`);
  showToast('Шаблон скачан');
}

/* ============================================================
   РЕДАКТОР: экспорт стандартов линии в XLSX
   ============================================================ */

async function editorExportLine(onlyIds) {
  if (typeof ExcelJS === 'undefined') {
    return showToast('Библиотека ExcelJS не загружена', true);
  }
  const line = currentEditorLine || localStorage.getItem('cl_editor_line');
  if (!line) return showToast('Сначала выберите линию', true);

  const standards = getStandards().filter(s => s.line === line && (!onlyIds || onlyIds.includes(s.id)));
  if (!standards.length) return showToast('На этой линии нет стандартов', true);
  if (standards.length > XL_ROWS) return showToast(`В файл помещается ${XL_ROWS} стандартов, выбрано ${standards.length}`, true);

  const wb = buildStandardsWorkbook(standards, line, `Стандарты линии ${line} — выгрузка ${new Date().toLocaleString('ru-RU')}`, [
    '',
    `Выгружено стандартов: ${standards.length}.`,
    'Файл можно править и загрузить обратно: Стандарты CL → Excel → Импорт.',
    'При импорте добавляются только новые OPL №; существующие пропускаются.'
  ]);
  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const ts = new Date().toISOString().slice(0, 10);
  downloadBlob(blob, `standards_${line}_${ts}.xlsx`);
  showToast(`Экспортировано: ${standards.length} стандартов`);
}

/* ============================================================
   ИМПОРТ: разбор файла (новый и старый формат листа «Точки»)
   ============================================================ */

/* Текст ячейки; у формулы — посчитанное значение (если файл сохранён в Excel) */
function xlCellText(row, col) {
  const v = row.getCell(col).value;
  if (v == null) return '';
  if (typeof v === 'object') {
    if (v.text) return String(v.text).trim();
    if (v.richText) return v.richText.map(t => t.text).join('').trim();
    if (v.result != null) return String(v.result).trim();
    return '';
  }
  return String(v).trim();
}

/* Формула без посчитанного значения (файл не открывали в Excel) */
function xlIsBareFormula(row, col) {
  const v = row.getCell(col).value;
  return !!(v && typeof v === 'object' && (v.formula || v.sharedFormula) && v.result == null);
}

async function parseStandardsExcelV3(file, targetLine) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(await file.arrayBuffer());

  const ws = wb.getWorksheet(XL_SHEET.std) || wb.worksheets[0];
  if (!ws) throw new Error('Не найден лист «Стандарты»');

  const VALID_PARTS = ['Maker', 'Packer'];
  const VALID_APPLIES = ['ChangeOver', 'CL_TO', 'CL_Conversion'];

  const existing = getStandards();
  const added = [];
  const existingOplKeys = new Set(
    existing.filter(s => s.line === targetLine)
      .map(s => `${s.line}|${s.machine || ''}|${(s.oplNumber || '').toLowerCase()}`)
  );

  const lineMachines = getLineMachines();
  if (!Array.isArray(lineMachines[targetLine])) lineMachines[targetLine] = [];
  const machinesForThisLine = lineMachines[targetLine];

  const result = { added: 0, skipped: 0, duplicates: [], empty: 0, errors: [], addedMachines: [] };
  const importIndex = {};   // «opl|машина» → стандарт
  const byRow = {};         // строка «Стандартов» → стандарт (для формул без значений)
  const dupKeys = new Set();
  const candidates = [];

  for (let i = 2; i <= ws.rowCount; i++) {
    const row = ws.getRow(i);
    const get = (key) => xlCellText(row, STD_COL[key]);

    const lineFromExcel = get('line');
    const nodePart = get('nodePart');
    const machine = get('machine');
    const oplNumber = normalizeOplNumber(get('opl'));
    const node = get('node');
    const title = get('title');
    const typeText = get('type');
    const controlType = xlTypeFromText(typeText);

    if (!oplNumber && !machine && !title && !node) { result.empty++; continue; }

    const rowErrors = [];
    if (!oplNumber) rowErrors.push('пустой OPL №');
    if (!machine) rowErrors.push('пустая машина');
    if (!nodePart && lineHasParts(targetLine)) rowErrors.push('не указана часть линии');
    if (!node) rowErrors.push('пустой узел');
    if (!title) rowErrors.push('пустое название');
    if (!typeText) rowErrors.push('не указан тип контроля');
    if (nodePart && lineHasParts(targetLine) && !VALID_PARTS.includes(nodePart)) {
      rowErrors.push(`часть линии «${nodePart}» — допустимо Maker или Packer`);
    }
    if (typeText && !controlType) {
      rowErrors.push(`тип контроля «${typeText}» — выберите из списка: ${Object.values(XL_TYPES).join(', ')}`);
    }
    if (lineFromExcel && lineFromExcel !== targetLine) {
      rowErrors.push(`линия «${lineFromExcel}» не совпадает с «${targetLine}»`);
    }

    const oplKey = `${targetLine}|${machine || ''}|${oplNumber.toLowerCase()}`;
    if (oplNumber && existingOplKeys.has(oplKey)) {
      result.duplicates.push({ row: i, oplNumber, machine });
      result.skipped++;
      dupKeys.add(`${oplNumber.toLowerCase()}|${machine}`);
      continue;
    }
    if (rowErrors.length) {
      result.errors.push({ row: i, message: rowErrors.join('; ') });
      result.skipped++;
      continue;
    }

    const std = {
      id: uid(),
      active: !(get('active').toLowerCase() === 'нет'),
      number: '',
      oplNumber,
      machine,
      title,
      line: targetLine,
      node,
      nodePart: lineHasParts(targetLine) ? nodePart : '',
      controlType,
      work: 'Run',
      timeFrom: '',
      timeTo: '',
      problemDescription: get('problem'),
      controlDescription: get('control'),
      purpose: get('purpose'),
      whyCreated: get('why'),
      measurements: [],
      appliesTo: String(get('applies')).split(',').map(s => s.trim()).filter(v => VALID_APPLIES.includes(v)),
      triggers: [],
      topLosses: [],
      photos: String(get('photos')).split(',').map(s => s.trim()).filter(Boolean),
      author: '—',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    importIndex[`${oplNumber.toLowerCase()}|${machine}`] = std;
    byRow[i] = std;
    candidates.push({ std, row: i });
    existingOplKeys.add(oplKey);
  }

  // --- Лист «Точки» ---
  const ws2 = wb.getWorksheet(XL_SHEET.pts);
  let pointsImported = 0;
  const addPoints = (std, brandRaw, row, fromCol, toCol) => {
    const points = [];
    for (let c = fromCol; c <= toCol; c++) {
      const v = xlCellText(row, c);
      if (v) points.push({ value: v });
    }
    if (!points.length) return;
    const brand = !brandRaw || isRestBrandLabel(brandRaw) ? '' : brandRaw;
    const block = std.measurements.find(b => (b.brand || '') === brand);
    if (block) block.points = points;
    else std.measurements.push({ brand, points });
    pointsImported += points.length;
  };

  if (ws2 && ws2.rowCount > 1) {
    const lastCol = Math.max(ws2.getRow(1).cellCount, 3 + XL_PTS);
    const isNew = /^Стандарт/i.test(xlCellText(ws2.getRow(1), 1));
    for (let i = 2; i <= ws2.rowCount; i++) {
      const row = ws2.getRow(i);
      if (isNew) {
        const keyText = xlCellText(row, 1);
        if (keyText === XL_EXTRA_HEAD) continue;
        let std = null;
        if (!keyText && xlIsBareFormula(row, 1)) std = byRow[i] || null;   // файл не пересчитан
        else if (keyText) {
          const cut = keyText.lastIndexOf(' · ');
          const opl = cut >= 0 ? keyText.slice(0, cut).trim() : keyText;
          const machine = cut >= 0 ? keyText.slice(cut + 3).trim() : '';
          const k = `${opl.toLowerCase()}|${machine}`;
          std = importIndex[k] || null;
          if (!std && !dupKeys.has(k) && xlCellText(row, 4)) {
            result.errors.push({ row: i, message: `лист «Точки»: нет стандарта «${keyText}» на листе «Стандарты»` });
          }
        }
        if (!std) continue;
        const brandRaw = xlIsBareFormula(row, 2) ? REST_BRANDS_LABEL : xlCellText(row, 2);
        addPoints(std, brandRaw, row, 4, lastCol);
      } else {
        // Старый формат: OPL № | Машина | Бренд | Точка 1…
        const oplNumber = xlCellText(row, 1);
        const machine = xlCellText(row, 2);
        if (!oplNumber || !machine) continue;
        const k = `${oplNumber.toLowerCase()}|${machine}`;
        const std = importIndex[k];
        if (!std) {
          if (!dupKeys.has(k)) result.errors.push({ row: i, message: `нет стандарта для точек: ${oplNumber} (${machine})` });
          continue;
        }
        addPoints(std, xlCellText(row, 3), row, 4, lastCol);
      }
    }
  }

  // --- Проверка «тип контроля ↔ значение» и сохранение ---
  candidates.forEach(({ std, row }) => {
    std.controlType = migrateControlType(std.controlType, std.measurements);
    const bad = [];
    std.measurements.forEach(b => b.points.forEach((p, pi) => {
      const err = normTypeError(std.controlType, p.value);
      if (err) bad.push(`${b.brand || REST_BRANDS_LABEL}, т.${pi + 1}: ${err}`);
    }));
    if (bad.length) {
      result.errors.push({ row, message: `${std.oplNumber}: ${bad.slice(0, 3).join('; ')}${bad.length > 3 ? ` (и ещё ${bad.length - 3})` : ''}` });
      result.skipped++;
      return;
    }
    if (std.machine && !machinesForThisLine.includes(std.machine)) {
      machinesForThisLine.push(std.machine);
      result.addedMachines.push(std.machine);
    }
    added.push(std);
    addChangeLogEntry('mech', std, 'added', 'Новый стандарт (импорт из Excel)');
    result.added++;
  });

  saveStandards(added);
  if (result.addedMachines.length > 0) {
    setLineMachines(lineMachines);
    if (typeof renderStructureSettings === 'function') renderStructureSettings();
    if (typeof fillEditorFilters === 'function') fillEditorFilters();
  }

  result.pointsImported = pointsImported;
  return result;
}

/* ============================================================
   ИМПОРТ: бланк OPL из журнала (один лист — один стандарт)
   Подпись ищется по тексту, значение — в ячейке под ней.
   ============================================================ */

/* «- 65 kPa (±10 kPa)» → «-65 kPa ±10 kPa»: parseNorm не понимает скобки у допуска и пробел после минуса */
function oplCleanValue(s) {
  return String(s).replace(/^\s*[`']/, '').replace(/\(\s*(±[^)]*)\)/g, ' $1').replace(/\s+/g, ' ').trim().replace(/^([-+]) (?=\d)/, '$1');
}

/* «30 сек» → 30, «1,5 мин» → 90, время Excel 0:00:30 (Date от 1899-12-30 UTC) → 30 */
function oplDurationSec(s) {
  if (s instanceof Date) return s.getUTCHours() * 3600 + s.getUTCMinutes() * 60 + s.getUTCSeconds();
  const n = parseFloat(String(s).replace(',', '.'));
  if (isNaN(n)) return 0;
  return Math.round(/мин/i.test(s) ? n * 60 : n);
}

/* Дата ячейки (Date или «22.05.2026») → ISO; не дата → null */
function oplDate(v) {
  if (v instanceof Date) return new Date(v.getUTCFullYear(), v.getUTCMonth(), v.getUTCDate(), 12).toISOString();   // Excel отдаёт полночь UTC
  const m = String(v || '').match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  return m ? new Date(+m[3], m[2] - 1, +m[1], 12).toISOString() : null;
}

/* Лист бланка → стандарт (без проверок); не бланк → null */
function oplSheetToStandard(ws, line, part) {
  const ends = {};   // главная ячейка объединения → нижняя строка и правая колонка
  (ws.model.merges || []).forEach(m => {
    const [a, b] = m.split(':');
    ends[ws.getCell(a).address] = { bottom: ws.getCell(b).row, right: ws.getCell(b).col };
  });
  const labels = [];
  ws.eachRow(row => row.eachCell(cell => {
    if (cell.master.address !== cell.address) return;
    const text = xlCellText(row, cell.col);
    if (text) labels.push({ text, low: text.toLowerCase(), row: cell.row, col: cell.col,
      ...(ends[cell.address] || { bottom: cell.row, right: cell.col }) });
  }));
  const find = (start, exact) => labels.find(l => exact ? l.low === start : l.low.startsWith(start));
  const cellUnder = (start, exact) => { const l = find(start, exact); return l ? ws.getCell(l.bottom + 1, l.col) : null; };
  const under = (start, exact) => { const c = cellUnder(start, exact); return c ? xlCellText(ws.getRow(c.row), c.col) : ''; };
  const numLabel = find('№ opl') ? '№ opl' : (find('№', true) ? '№' : null);   // в старых бланках — просто «№»
  if (!numLabel) return null;

  // Точки: номера — под «Точка замера», бренды — строка под «Значение» («Все бренды» = общая норма; старое «Все сорта» понимаем);
  // в старых бланках «Значения» нет — бренды в строке «Точка замера», правее «Градуса»
  const measurements = [];
  const pt = find('точка замера'), vl = find('значение');
  if (pt) {
    labels.filter(l => vl ? l.row === vl.bottom + 1 && l.col >= vl.col && l.col <= vl.right
      : l.row === pt.row && l.col > pt.col && l.low !== 'градус').forEach(b => {
      const points = [];
      for (let r = pt.bottom + 1; /^\d+$/.test(xlCellText(ws.getRow(r), pt.col)); r++) {
        const v = oplCleanValue(xlCellText(ws.getRow(r), b.col));
        if (v) points.push({ value: v });
      }
      const rest = isRestBrandLabel(b.low);
      if (points.length) measurements.push({ brand: rest ? '' : b.text, points });
    });
  }
  const kinds = measurements.flatMap(b => b.points)
    .map(p => isNormMark(p.value) ? null : classifyNormValue(p.value)).filter(Boolean);
  const controlType = kinds.includes('variable') ? 'variable' : (kinds.includes('interval') ? 'interval' : 'fixed');

  const machineNode = under('машина');   // «SE/Узел передачи…»
  const cut = machineNode.indexOf('/');
  const created = oplDate((cellUnder('дата создания') || {}).value) || new Date().toISOString();
  return {
    ...createEmptyStandard(),
    id: uid(),
    oplNumber: normalizeOplNumber(under(numLabel, numLabel === '№')),
    machine: (cut >= 0 ? machineNode.slice(0, cut) : machineNode).trim(),
    node: cut >= 0 ? machineNode.slice(cut + 1).trim() : '',
    title: under('название cl'),
    line,
    nodePart: part,
    controlType,
    problemDescription: under('описание проблемы'),
    controlDescription: under('описание', true) || under('описание настройки', true),
    purpose: under('цель'),
    whyCreated: under('знаю почему'),
    tool: under('инструмент'),
    durationSec: oplDurationSec((cellUnder('время на проверку') || {}).value || ''),
    measurements,
    author: under('автор') || '—',
    createdAt: created,
    updatedAt: oplDate((cellUnder('дата изменения') || {}).value) || created
  };
}

/* Файлы бланков → стандарты линии. Фото из листов — ZIP «photos/<линия>/<часть>/…» */
async function parseOplJournalExcel(files, targetLine, nodePart) {
  const part = lineHasParts(targetLine) ? nodePart : '';
  const all = getStandards();
  const keys = new Set(all.filter(s => s.line === targetLine)
    .map(s => `${s.machine || ''}|${(s.oplNumber || '').toLowerCase()}`));
  const lineMachines = getLineMachines();
  if (!Array.isArray(lineMachines[targetLine])) lineMachines[targetLine] = [];
  const result = { added: 0, skipped: 0, duplicates: [], empty: 0, emptyNoun: 'или скрытых листов', errors: [], addedMachines: [], photos: 0 };
  const added = [];
  const zip = new JSZip();

  for (const file of files) {
    const wb = new ExcelJS.Workbook();
    try { await wb.xlsx.load(await file.arrayBuffer()); }
    catch (e) {
      result.errors.push({ message: `${file.name}: файл не читается — нужен формат .xlsx (в Excel: «Сохранить как» → .xlsx)` });
      continue;
    }
    for (const ws of wb.worksheets) {
      if (ws.state !== 'visible') { result.empty++; continue; }   // скрытые — шаблоны и старые версии бланков
      const where = wb.worksheets.length > 1 ? `${file.name} / ${ws.name}` : file.name;
      const std = oplSheetToStandard(ws, targetLine, part);
      if (!std || !(std.oplNumber || std.machine || std.title)) { result.empty++; continue; }   // не бланк или пустой шаблон
      const miss = [['№ OPL', std.oplNumber], ['машина', std.machine], ['узел', std.node], ['название CL', std.title]]
        .filter(([, v]) => !v).map(([k]) => k);
      const bad = [];
      std.measurements.forEach(b => b.points.forEach((p, i) => {
        const err = normTypeError(std.controlType, p.value);
        if (err) bad.push(`т.${i + 1}: ${err}`);
      }));
      if (miss.length || bad.length) {
        result.errors.push({ message: `${where}: ${miss.length ? 'не заполнено — ' + miss.join(', ') : bad.join('; ')}` });
        result.skipped++;
        continue;
      }
      const key = `${std.machine}|${std.oplNumber.toLowerCase()}`;
      if (keys.has(key)) {
        result.duplicates.push({ oplNumber: std.oplNumber, machine: std.machine });
        result.skipped++;
        continue;
      }
      keys.add(key);
      // Фото лежат по части линии — у PMD / FMD части нет, путь не собрать
      if (!part) result.photosLost = (result.photosLost || 0) + ws.getImages().length;
      else ws.getImages().sort((a, b) => (a.range.tl.nativeRow - b.range.tl.nativeRow)   // по месту на листе
        || (a.range.tl.nativeCol - b.range.tl.nativeCol)).forEach((img, i) => {
        const media = wb.getImage(img.imageId);
        if (!media) return;
        const name = `${std.machine}-${std.oplNumber.replace('-', '')}_${i + 1}.${media.extension}`.replace(/[\\/:*?"<>|\s]+/g, '_');
        zip.file(`photos/${targetLine}/${part}/${name}`, media.buffer);
        std.photos.push(name);
        result.photos++;
      });
      if (!lineMachines[targetLine].includes(std.machine)) {
        lineMachines[targetLine].push(std.machine);
        result.addedMachines.push(std.machine);
      }
      added.push(std);
    }
  }

  // Архив — до записи: если он не соберётся, не останется стандартов с именами несуществующих фото
  const zipBlob = result.photos > 0 ? await zip.generateAsync({ type: 'blob' }) : null;
  result.added = added.length;
  if (added.length) {
    saveStandards(added);
    added.forEach(std => addChangeLogEntry('mech', std, 'added', 'Новый стандарт (импорт бланка OPL)'));
  }
  if (result.addedMachines.length > 0) setLineMachines(lineMachines);
  if (zipBlob) downloadBlob(zipBlob, `photos_${targetLine}.zip`);
  if (result.photosLost) {
    result.errors.push({ message: `фото не выгружены (${result.photosLost}): у линии ${targetLine} нет части Maker / Packer — добавьте фото вручную` });
  }
  return result;
}
