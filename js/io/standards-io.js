/* ============================================================
   EXCEL: шаблон, экспорт и импорт стандартов линии
   Один формат на все три операции (STD_COLS + лист «Точки»).
   Модуль общего пространства имён: функции и переменные видны
   во всех файлах. Порядок подключения — index.html.
   ============================================================ */

/* Колонки листа «Стандарты» — порядок общий для шаблона,
   экспорта и импорта. Менять только вместе с stdRowFromStandard. */
const STD_COLS = [
  { key: 'line',     title: 'Линия',             width: 10, hint: 'код линии, например SD12' },
  { key: 'nodePart', title: 'Часть линии',       width: 13, hint: 'Maker или Packer (только SMD)' },
  { key: 'machine',  title: 'Машина',            width: 11, hint: 'SE, MAX, 550…' },
  { key: 'opl',      title: 'OPL №',             width: 15, hint: 'уникален в пределах линии и машины' },
  { key: 'node',     title: 'Узел',              width: 28, hint: 'узел машины' },
  { key: 'title',    title: 'Название',          width: 36, hint: 'что проверяем' },
  { key: 'type',     title: 'Тип контроля',      width: 16, hint: 'fixed / variable / interval' },
  { key: 'applies',  title: 'Применять к',       width: 20, hint: 'ChangeOver, CL_TO, CL_Conversion — через запятую' },
  { key: 'active',   title: 'Активен',           width: 10, hint: 'Да / Нет' },
  { key: 'problem',  title: 'Описание проблемы', width: 34, hint: 'зачем нужен контроль' },
  { key: 'control',  title: 'Как проверять',     width: 38, hint: 'описание контроля для оператора' },
  { key: 'purpose',  title: 'Цель',              width: 28, hint: '' },
  { key: 'why',      title: 'Почему создан',     width: 28, hint: '' },
  { key: 'photos',   title: 'Фото',              width: 26, hint: 'имена файлов через запятую' }
];
const STD_COL = {};
STD_COLS.forEach((c, i) => { STD_COL[c.key] = i + 1; });

/* Колонки листа «Точки»: ключ стандарта, бренд и значения в ряд */
const PT_FIXED = ['OPL №', 'Машина', 'Бренд'];
const PT_MIN = 5;          // сколько колонок «Точка N» в шаблоне

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

function xlsxBodyStyle(ws, fromRow) {
  for (let i = fromRow; i <= ws.rowCount; i++) {
    const row = ws.getRow(i);
    row.height = 22;
    row.eachCell({ includeEmpty: true }, (cell) => {
      cell.font = { name: 'Calibri', size: 11 };
      cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
      cell.border = {
        top:    { style: 'thin', color: { argb: 'FFCBD2D9' } },
        bottom: { style: 'thin', color: { argb: 'FFCBD2D9' } },
        left:   { style: 'thin', color: { argb: 'FFCBD2D9' } },
        right:  { style: 'thin', color: { argb: 'FFCBD2D9' } }
      };
    });
  }
}

/* Одна строка листа «Стандарты» */
function stdRowFromStandard(st, line) {
  return [
    st.line || line,
    st.nodePart || '',
    st.machine || '',
    st.oplNumber || '',
    st.node || '',
    st.title || '',
    migrateControlType(st.controlType, st.measurements),
    Array.isArray(st.appliesTo) ? st.appliesTo.join(', ') : '',
    st.active !== false ? 'Да' : 'Нет',
    st.problemDescription || '',
    st.controlDescription || '',
    st.purpose || '',
    st.whyCreated || '',
    Array.isArray(st.photos) ? st.photos.join(', ') : ''
  ];
}

/* Лист «Стандарты»: шапка + строки */
function buildStdSheet(wb, standards, line) {
  const ws = wb.addWorksheet('Стандарты');
  ws.addRow(STD_COLS.map(c => c.title));
  standards.forEach(st => ws.addRow(stdRowFromStandard(st, line)));
  ws.columns.forEach((col, i) => { col.width = (STD_COLS[i] || {}).width || 14; });
  xlsxHeadStyle(ws, 1, 34);
  xlsxBodyStyle(ws, 2);
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: STD_COLS.length } };
  ws.views = [{ state: 'frozen', xSplit: 4, ySplit: 1 }];
  return ws;
}

/* Лист «Точки»: строка = бренд стандарта, значения точек в ряд */
function buildPointsSheet(wb, standards) {
  const rows = [];
  let maxPts = PT_MIN;
  standards.forEach(st => {
    (Array.isArray(st.measurements) ? st.measurements : []).forEach(block => {
      const points = (Array.isArray(block.points) ? block.points : [])
        .map(p => String(p && p.value != null ? p.value : '').trim());
      if (!points.length) return;
      maxPts = Math.max(maxPts, points.length);
      rows.push([st.oplNumber || '', st.machine || '', block.brand || REST_BRANDS_LABEL, ...points]);
    });
  });

  const ws = wb.addWorksheet('Точки');
  const head = PT_FIXED.concat(Array.from({ length: maxPts }, (_, i) => `Точка ${i + 1}`));
  ws.addRow(head);
  rows.forEach(r => ws.addRow(r));
  ws.columns.forEach((col, i) => { col.width = i < 3 ? [15, 11, 22][i] : 16; });
  xlsxHeadStyle(ws, 1, 30);
  xlsxBodyStyle(ws, 2);
  ws.views = [{ state: 'frozen', xSplit: 3, ySplit: 1 }];
  return ws;
}

/* Лист «Инструкция» */
function buildInfoSheet(wb, title, extra) {
  const ws = wb.addWorksheet('Инструкция');
  ws.columns = [{ width: 104 }];
  const lines = [
    [title],
    [''],
    ['ЛИСТ «СТАНДАРТЫ» — по одной строке на стандарт.'],
    ['Обязательные колонки: Линия, Машина, OPL №, Узел, Название, Тип контроля.'],
    ['Часть линии (Maker / Packer) обязательна только для линий цеха SMD.'],
    ['']
  ];
  STD_COLS.forEach(c => { if (c.hint) lines.push([`  • ${c.title} — ${c.hint}`]); });
  lines.push(
    [''],
    ['Тип контроля:'],
    ['  • fixed — фиксированный: точное значение или метка (ОК / Не ОК).'],
    ['  • variable — вариабельный: значение с допуском, «92 ± 5».'],
    ['  • interval — контролируемый интервал, «5 до 8».'],
    [''],
    ['ЛИСТ «ТОЧКИ» — нормы по брендам, по одной строке на бренд.'],
    ['Связь со стандартом — OPL № + Машина (как на листе «Стандарты»).'],
    [`  • Бренд — название бренда или «${REST_BRANDS_LABEL}» для общей нормы.`],
    ['  • Точка 1, Точка 2, … — значения по порядку; лишние колонки оставьте пустыми.'],
    ['  • Значение: «92 ± 5» (variable), «5 до 8» (interval), «10» или метка (fixed).'],
    ['  • Если точек нет — стандарт проверяется как ОК / Не ОК.'],
    [''],
    ['Триггеры смены сорта и Top Losses в файле не передаются — они задаются в приложении.']
  );
  (extra || []).forEach(l => lines.push([l]));
  lines.forEach(([text]) => ws.addRow([text]));
  ws.getRow(1).font = { bold: true, size: 16, color: { argb: 'FF0A4FA8' } };
  return ws;
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
  const example = {
    line, nodePart: hasParts ? 'Maker' : '', machine: 'SE', oplNumber: 'OPL-1.1.1',
    node: 'Узел передачи', title: 'Давление на передающем устройстве',
    controlType: 'variable', appliesTo: ['ChangeOver'], active: true,
    problemDescription: 'Отклонение давления ведёт к браку',
    controlDescription: 'Снять показание манометра на рабочем ходу',
    purpose: '', whyCreated: '', photos: [],
    measurements: [{ brand: '', points: [{ value: '92 ± 5' }, { value: '90 ± 5' }] }]
  };

  const wb = new ExcelJS.Workbook();
  buildStdSheet(wb, [example], line);
  buildPointsSheet(wb, [example]);
  buildInfoSheet(wb, `Шаблон импорта стандартов — линия ${line}`, [
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

  const wb = new ExcelJS.Workbook();
  buildStdSheet(wb, standards, line);
  buildPointsSheet(wb, standards);
  buildInfoSheet(wb, `Стандарты линии ${line} — выгрузка ${new Date().toLocaleString('ru-RU')}`, [
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
   ИМПОРТ: разбор файла того же формата
   ============================================================ */

async function parseStandardsExcelV3(file, targetLine) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(await file.arrayBuffer());

  const ws = wb.getWorksheet('Стандарты') || wb.worksheets[0];
  if (!ws) throw new Error('Не найден лист «Стандарты»');

  const VALID_PARTS = ['Maker', 'Packer'];
  const VALID_CONTROL = ['fixed', 'variable', 'interval', 'ok_not_ok', 'value_input', 'range_input'];
  const VALID_APPLIES = ['ChangeOver', 'CL_TO', 'CL_Conversion'];

  const existing = getStandards();
  const existingOplKeys = new Set(
    existing.filter(s => s.line === targetLine)
      .map(s => `${s.line}|${s.machine || ''}|${(s.oplNumber || '').toLowerCase()}`)
  );

  const lineMachines = getLineMachines();
  if (!Array.isArray(lineMachines[targetLine])) lineMachines[targetLine] = [];
  const machinesForThisLine = lineMachines[targetLine];

  const result = { added: 0, skipped: 0, duplicates: [], empty: 0, errors: [], addedMachines: [] };
  const cellText = (row, col) => {
    const v = row.getCell(col).value;
    if (v == null) return '';
    if (typeof v === 'object') {
      if (v.text) return String(v.text).trim();
      if (v.result != null) return String(v.result).trim();
      return '';
    }
    return String(v).trim();
  };

  const importIndex = {};   // «opl|машина» → стандарт

  for (let i = 2; i <= ws.rowCount; i++) {
    const row = ws.getRow(i);
    const get = (key) => cellText(row, STD_COL[key]);

    const lineFromExcel = get('line');
    const nodePart = get('nodePart');
    const machine = get('machine');
    const oplNumber = get('opl');
    const node = get('node');
    const title = get('title');
    const controlType = get('type');

    if (!oplNumber && !machine && !title && !node) { result.empty++; continue; }

    const rowErrors = [];
    if (!oplNumber) rowErrors.push('пустой OPL №');
    if (!machine) rowErrors.push('пустая машина');
    if (!nodePart && lineHasParts(targetLine)) rowErrors.push('не указана часть линии');
    if (!node) rowErrors.push('пустой узел');
    if (!title) rowErrors.push('пустое название');
    if (!controlType) rowErrors.push('не указан тип контроля');
    if (nodePart && lineHasParts(targetLine) && !VALID_PARTS.includes(nodePart)) {
      rowErrors.push(`часть линии «${nodePart}» — допустимо Maker или Packer`);
    }
    if (controlType && !VALID_CONTROL.includes(controlType)) {
      rowErrors.push(`тип контроля «${controlType}» — допустимо fixed, variable, interval`);
    }
    if (lineFromExcel && lineFromExcel !== targetLine) {
      rowErrors.push(`линия «${lineFromExcel}» не совпадает с «${targetLine}»`);
    }

    const oplKey = `${targetLine}|${machine || ''}|${oplNumber.toLowerCase()}`;
    if (oplNumber && existingOplKeys.has(oplKey)) {
      result.duplicates.push({ row: i, oplNumber, machine });
      result.skipped++;
      continue;
    }
    if (rowErrors.length) {
      result.errors.push({ row: i, message: rowErrors.join('; ') });
      result.skipped++;
      continue;
    }

    if (machine && !machinesForThisLine.includes(machine)) {
      machinesForThisLine.push(machine);
      result.addedMachines.push(machine);
    }

    const newStandard = {
      id: uid(),
      active: !(get('active').toLowerCase() === 'нет'),
      number: '',
      oplNumber,
      machine,
      title,
      line: targetLine,
      node,
      nodePart: lineHasParts(targetLine) ? nodePart : '',
      controlType: migrateControlType(controlType, []),
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

    importIndex[`${oplNumber.toLowerCase()}|${machine}`] = newStandard;
    existing.push(newStandard);
    addChangeLogEntry('mech', newStandard, 'added', 'Новый стандарт (импорт из Excel)');
    existingOplKeys.add(oplKey);
    result.added++;
  }

  // --- Лист «Точки»: строка = бренд, значения точек в ряд ---
  const ws2 = wb.getWorksheet('Точки');
  let pointsImported = 0;

  if (ws2 && ws2.rowCount > 1) {
    const headRow = ws2.getRow(1);
    const lastCol = headRow.cellCount;

    for (let i = 2; i <= ws2.rowCount; i++) {
      const row = ws2.getRow(i);
      const oplNumber = cellText(row, 1);
      const machine = cellText(row, 2);
      const brandRaw = cellText(row, 3);
      if (!oplNumber || !machine) continue;

      const std = importIndex[`${oplNumber.toLowerCase()}|${machine}`];
      if (!std) {
        result.errors.push({ row: i, message: `нет стандарта для точек: ${oplNumber} (${machine})` });
        continue;
      }

      const points = [];
      for (let c = 4; c <= lastCol; c++) {
        const v = cellText(row, c);
        if (v) points.push({ value: v });
      }
      if (!points.length) continue;

      const brand = brandRaw === REST_BRANDS_LABEL ? '' : brandRaw;
      const block = std.measurements.find(b => (b.brand || '') === brand);
      if (block) block.points = points;
      else std.measurements.push({ brand, points });
      pointsImported += points.length;
    }

    // Тип контроля уточняем по значениям точек (fixed с числами / с метками)
    Object.values(importIndex).forEach(std => {
      std.controlType = migrateControlType(std.controlType, std.measurements);
    });
  }

  if (result.added > 0) setStandards(existing);
  if (result.addedMachines.length > 0) {
    setLineMachines(lineMachines);
    if (typeof renderStructureSettings === 'function') renderStructureSettings();
    if (typeof fillEditorFilters === 'function') fillEditorFilters();
  }

  result.pointsImported = pointsImported;
  return result;
}
