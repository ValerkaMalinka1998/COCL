/* ============================================================
   EXCEL: импорт и экспорт стандартов
   Экспорт линии, парсер шаблона OPL, шаблон для линии.
   Модуль общего пространства имён: функции и переменные видны
   во всех файлах. Порядок подключения — index.html.
   ============================================================ */

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

  const standards = getStandards().filter(s => s.line === currentEditorLine);

  if (!standards.length) {
    return showToast('На этой линии нет стандартов', true);
  }

  const wb = new ExcelJS.Workbook();

  // ======================= ЛИСТ 1: «Стандарты» =======================
  const ws = wb.addWorksheet('Стандарты');

  const headers = [
    'Часть линии',
    'Машина',
    'OPL №',
    'Узел',
    'Название',
    'Линия',
    'Тип контроля',
    'Применять к',
    'Активен',
    'Описание проблемы',
    'Описание контроля',
    'Цель',
    'Почему создан',
    'Триггеры',
    'Top Losses',
    'Фото'
  ];

  ws.addRow(headers);

  // Данные
  standards.forEach(st => {
    // Триггеры: node:X → X
    const triggersText = Array.isArray(st.triggers)
      ? st.triggers.map(t => t.replace(/^node:/, '')).join(', ')
      : '';

    // Top Losses: массив ID → названия через запятую
    const topLossesText = Array.isArray(st.topLosses)
      ? st.topLosses
          .map(id => {
            const l = findLossById(id);
            return l ? l.name : null;
          })
          .filter(Boolean)
          .join(', ')
      : '';

    // Фото
    const photosText = Array.isArray(st.photos) ? st.photos.join(', ') : '';

    // Применять к
    const appliesToText = Array.isArray(st.appliesTo) ? st.appliesTo.join(', ') : '';

    ws.addRow([
      st.nodePart || '',
      st.machine || '',
      st.oplNumber || '',
      st.node || '',
      st.title || '',
      st.line || currentEditorLine,
      st.controlType || '',
      appliesToText,
      st.active !== false ? 'Да' : 'Нет',
      st.problemDescription || '',
      st.controlDescription || '',
      st.purpose || '',
      st.whyCreated || '',
      triggersText,
      topLossesText,
      photosText
    ]);
  });

  // Ширины
  const widths = [12, 10, 14, 30, 34, 10, 14, 18, 10, 34, 34, 30, 30, 22, 30, 30];
  ws.columns.forEach((col, i) => { col.width = widths[i] || 14; });

  // Стилизация шапки
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

  // Автофильтр
  ws.autoFilter = {
    from: { row: 1, column: 1 },
    to:   { row: 1, column: headers.length }
  };

  // Стилизация данных
  for (let i = 2; i <= ws.rowCount; i++) {
    const row = ws.getRow(i);
    row.height = 30;
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

  // ======================= ЛИСТ 2: «Точки» =======================
  const ws2 = wb.addWorksheet('Точки');

  const headers2 = [
    'OPL №',
    'Машина',
    'Бренд',
    '№ точки',
    'Значение'
  ];

  ws2.addRow(headers2);

  // Собираем точки со всех стандартов
  standards.forEach(st => {
    const blocks = Array.isArray(st.measurements) ? st.measurements : [];
    blocks.forEach(block => {
      const points = Array.isArray(block.points) ? block.points : [];
      points.forEach((p, i) => {
        ws2.addRow([
          st.oplNumber || '',
          st.machine || '',
          block.brand || '',
          i + 1,
          p.value || ''
        ]);
      });
    });
  });

  // Ширины
  const widths2 = [14, 12, 20, 10, 26];
  ws2.columns.forEach((col, i) => { col.width = widths2[i] || 14; });

  // Шапка
  const headerRow2 = ws2.getRow(1);
  headerRow2.height = 30;
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

  ws2.autoFilter = {
    from: { row: 1, column: 1 },
    to:   { row: 1, column: headers2.length }
  };

  for (let i = 2; i <= ws2.rowCount; i++) {
    const row = ws2.getRow(i);
    row.height = 22;
    row.eachCell({ includeEmpty: true }, (cell) => {
      cell.font = { name: 'Calibri', size: 11 };
      cell.alignment = { vertical: 'middle', horizontal: 'left' };
      cell.border = {
        top:    { style: 'thin', color: { argb: 'FFCBD2D9' } },
        bottom: { style: 'thin', color: { argb: 'FFCBD2D9' } },
        left:   { style: 'thin', color: { argb: 'FFCBD2D9' } },
        right:  { style: 'thin', color: { argb: 'FFCBD2D9' } }
      };
    });
  }

  // ======================= ЛИСТ 3: «Инструкция» =======================
  const wsInfo = wb.addWorksheet('Инструкция');
  wsInfo.columns = [{ width: 100 }];

  const info = [
    ['📋 Экспорт OPL — ' + currentEditorLine],
    [''],
    ['Дата экспорта: ' + new Date().toLocaleString('ru-RU')],
    ['Стандартов выгружено: ' + standards.length],
    [''],
    ['ЧТО В ФАЙЛЕ:'],
    ['  • Лист «Стандарты» — по одной строке на стандарт.'],
    ['  • Лист «Точки» — по одной строке на каждую точку.'],
    ['      Связь со стандартом — по ключу OPL № + Машина.'],
    [''],
    ['ФАЙЛ ГОТОВ К РЕДАКТИРОВАНИЮ И ОБРАТНОЙ ЗАГРУЗКЕ:'],
    ['  1. Измените нужные данные (можно править всё, кроме структуры колонок).'],
    ['  2. Сохраните файл в .xlsx.'],
    ['  3. В приложении: Редактор → открыть линию → «Импорт из Excel».'],
    [''],
    ['============================================================'],
    ['ЛИСТ «СТАНДАРТЫ» — ОБЯЗАТЕЛЬНЫЕ ПОЛЯ:'],
    ['============================================================'],
    ['  • OPL № — уникален в пределах линии + машины.'],
    ['  • Часть линии — Maker или Packer (только линии SMD; для PMD и FMD оставьте пустой).'],
    ['  • Машина — обозначение (SE, M1, …).'],
    ['  • Узел — свободный текст.'],
    ['  • Название — краткое описание.'],
    ['  • Линия — код линии.'],
    ['  • Тип контроля — ok_not_ok / value_input / range_input.'],
    ['  • Работа — Run или Stop (по умолчанию Run).'],
    ['  • Время с / Время по — окно проверки (HH:MM), опционально.'],
    ['  • Применять к — ChangeOver, CL_TO, CL_Conversion (через запятую).'],
    ['  • Активен — Да или Нет.'],
    [''],
    ['============================================================'],
    ['ЛИСТ «СТАНДАРТЫ» — ОПЦИОНАЛЬНЫЕ ПОЛЯ:'],
    ['============================================================'],
    ['  • Описания (проблема, контроль, цель, почему создан).'],
    ['  • Триггеры — через запятую (для ChangeOver).'],
    ['  • Top Losses — названия потерь через запятую.'],
    ['  • Фото — имена файлов через запятую.'],
    [''],
    ['============================================================'],
    ['ЛИСТ «ТОЧКИ» (необязательный):'],
    ['============================================================'],
    ['  • OPL № + Машина — должны совпадать со стандартом.'],
    ['  • Бренд — пусто = «Все бренды». Иначе — конкретный бренд.'],
    ['  • № точки — 1, 2, 3, …'],
    ['  • Значение — норма для точки:'],
    ['      value_input: «92 ± 5», «92+-5».'],
    ['      range_input: «5 до 8», «5.5 - 8.5».'],
    ['      Можно писать с единицами: «-65 kPa (±10 kPa)».'],
    [''],
    ['ПРАВИЛА ИМПОРТА:'],
    ['  • Если машины нет в списке линии — она добавится автоматически.'],
    ['  • Потери (Top Losses), не найденные по названию, — пропускаются.'],
    ['  • Дубликаты по OPL № + Машина — пропускаются.'],
    ['  • Пустые строки игнорируются.'],
    ['']
  ];

  info.forEach(([text]) => wsInfo.addRow([text]));
  wsInfo.getRow(1).font = { bold: true, size: 16, color: { argb: 'FF0A4FA8' } };

  // ======================= Скачивание =======================
  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const ts = new Date().toISOString().slice(0, 10);
  downloadBlob(blob, `standards_${currentEditorLine}_${ts}.xlsx`);
  showToast(`Экспортировано: ${standards.length} стандарт(ов)`);
});

/* ============================================================
   ПАРСЕР EXCEL — ШАБЛОН OPL (v3: два листа, точки отдельно)
   ============================================================ */
async function parseStandardsExcelV3(file, targetLine) {
  const wb = new ExcelJS.Workbook();
  const buf = await file.arrayBuffer();
  await wb.xlsx.load(buf);

  // --- Лист «Стандарты» — обязательный ---
  const ws = wb.getWorksheet('Стандарты') || wb.worksheets[0];
  if (!ws) throw new Error('Не найден лист «Стандарты»');

  const VALID_PARTS = ['Maker', 'Packer'];
  const VALID_CONTROL = ['ok_not_ok', 'value_input', 'range_input', 'fixed', 'variable', 'interval'];
  const VALID_APPLIES = ['ChangeOver', 'CL_TO', 'CL_Conversion'];

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

  // Машины линии
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

  // --- Читаем строки листа «Стандарты» ---
  // Новый порядок колонок:
  // A: Часть линии | B: Машина | C: OPL № | D: Узел | E: Название | F: Линия
  // G: Тип контроля | H: Применять к | I: Активен | J: Описание проблемы
  // K: Описание контроля | L: Цель | M: Почему создан
  // N: Триггеры | O: Top Losses | P: Фото
  const importedStandards = [];    // временный буфер — потом соединим с точками
  const importIndex = {};          // OPL № + Машина → объект стандарта

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

    const nodePart      = get(1);   // Часть линии
    const machine       = get(2);   // Машина
    const oplNumber     = get(3);   // OPL №
    const node          = get(4);   // Узел
    const title         = get(5);   // Название
    const lineFromExcel = get(6);   // Линия
    const workRaw       = get(7);   // Работа
    const timeFromRaw   = get(8);   // Время с
    const timeToRaw     = get(9);   // Время по
    const controlType   = get(10);  // Тип контроля
    const appliesToRaw  = get(11);  // Применять к
    const activeRaw     = get(12);  // Активен
    const problemDesc   = get(13);
    const controlDesc   = get(14);
    const purpose       = get(15);
    const whyCreated    = get(16);
    const triggersRaw   = get(17);
    const topLossesRaw  = get(18);
    const photosRaw     = get(19);

    // Пустая строка
    if (!oplNumber && !machine && !title && !node) {
      result.empty++;
      continue;
    }

    // Валидация
    const rowErrors = [];
    if (!oplNumber)   rowErrors.push('пустой OPL №');
    if (!machine)     rowErrors.push('пустая машина');
    if (!nodePart && lineHasParts(targetLine)) rowErrors.push('не указана часть линии');
    if (!node)        rowErrors.push('пустой узел');
    if (!title)       rowErrors.push('пустое название');
    if (!controlType) rowErrors.push('не указан тип контроля');

    if (nodePart && lineHasParts(targetLine) && !VALID_PARTS.includes(nodePart)) {
      rowErrors.push(`часть линии «${nodePart}» — допустимо Maker / Packer`);
    }
    if (controlType && !VALID_CONTROL.includes(controlType)) {
      rowErrors.push(`тип контроля «${controlType}» — допустимо ok_not_ok / value_input / range_input`);
    }
    if (lineFromExcel && lineFromExcel !== targetLine) {
      rowErrors.push(`линия в файле «${lineFromExcel}», а импорт идёт в «${targetLine}»`);
    }

    // Дубликат
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

    // Автодобавление машины
    if (machine && !machinesForThisLine.includes(machine)) {
      machinesForThisLine.push(machine);
      result.addedMachines.push(machine);
    }

    // appliesTo
    const appliesTo = splitList(appliesToRaw).filter(v => VALID_APPLIES.includes(v));

    // Активен
    const active = !(activeRaw && activeRaw.toLowerCase() === 'нет');

    // Триггеры
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

    // Top Losses — по названиям
    const allLossesFlat = getAllLossItems();
    const topLosses = [];
    splitList(topLossesRaw).forEach(name => {
      const found = allLossesFlat.find(l =>
        l.name.toLowerCase() === name.toLowerCase()
      );
      if (found) topLosses.push(found.id);
    });

    // Фото
    const photos = splitList(photosRaw);

    const newStandard = {
      id: uid(),
      active,
      number: '',           // убрали поле № — считаем автоматически при отображении
      oplNumber,
      machine,
      title,
      line: targetLine,
      node,
      nodePart: lineHasParts(targetLine) ? nodePart : '',
      controlType,
      work: (workRaw === 'Stop') ? 'Stop' : 'Run',
      timeFrom: timeFromRaw || '',
      timeTo: timeToRaw || '',
      problemDescription: problemDesc,
      controlDescription: controlDesc,
      purpose: purpose,
      whyCreated: whyCreated,
      measurements: [],     // пока пусто — заполним из листа «Точки»
      appliesTo,
      triggers,
      topLosses,
      photos,
      author: '—',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    importedStandards.push(newStandard);
    importIndex[`${oplNumber.toLowerCase()}|${machine}`] = newStandard;
    existing.push(newStandard);
    addChangeLogEntry('mech', newStandard, 'added', 'Новый стандарт (импорт из Excel)');
    existingOplKeys.add(oplKey);
    result.added++;
  }

  // --- Лист «Точки» — опциональный ---
  const ws2 = wb.getWorksheet('Точки');
  let pointsImported = 0;

  if (ws2 && ws2.rowCount > 1) {
    // Ключ: OPL № + Машина → { brand → { pointNum → value } }
    const tempPoints = {};

    for (let i = 2; i <= ws2.rowCount; i++) {
      const row = ws2.getRow(i);
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

      const oplNumber = get(1);
      const machine   = get(2);
      const brand     = get(3);
      const pointNum  = parseInt(get(4), 10);
      const value     = get(5);

      if (!oplNumber || !machine || !pointNum) continue;

      const stdKey = `${oplNumber.toLowerCase()}|${machine}`;
      if (!importIndex[stdKey]) {
        // Нет стандарта для этой точки — ошибка
        result.errors.push({
          row: i,
          message: `нет стандарта для точки: ${oplNumber} (${machine})`
        });
        continue;
      }

      if (!tempPoints[stdKey]) tempPoints[stdKey] = {};
      const brandKey = brand || '';   // пусто = Все бренды
      if (!tempPoints[stdKey][brandKey]) tempPoints[stdKey][brandKey] = {};
      tempPoints[stdKey][brandKey][pointNum] = value;
    }

    // Собираем точки в структуру measurements
    Object.entries(tempPoints).forEach(([stdKey, brandMap]) => {
      const std = importIndex[stdKey];
      if (!std) return;

      const blocks = [];
      Object.entries(brandMap).forEach(([brand, pointMap]) => {
        // Сортируем по номеру точки
        const sortedNums = Object.keys(pointMap).map(Number).sort((a, b) => a - b);
        // Проверяем, что нумерация непрерывная от 1
        const points = [];
        let expected = 1;
        for (const num of sortedNums) {
          if (num !== expected) break;   // или можно вставить пустые — но мы не хотим
          points.push({ value: pointMap[num] });
          expected++;
        }
        if (points.length) {
          blocks.push({ brand, points });
        }
      });

      std.measurements = blocks;
      pointsImported += blocks.reduce((sum, b) => sum + b.points.length, 0);
    });
  }

  // --- Сохранение ---
  if (result.added > 0) {
    setStandards(existing);
  }

  if (result.addedMachines.length > 0) {
    setLineMachines(lineMachines);
    if (typeof renderStructureSettings === 'function') renderStructureSettings();
    if (typeof fillEditorFilters === 'function') fillEditorFilters();
  }

  result.pointsImported = pointsImported;

  return result;
}
/* ============================================================
   РЕДАКТОР: скачать шаблон OPL для линии
   ============================================================ */

async function editorDownloadTemplate() {
  if (typeof ExcelJS === 'undefined') {
    return showToast('Библиотека ExcelJS не загружена', true);
  }
  const line = currentEditorLine || localStorage.getItem('cl_editor_line');
  if (!line) return showToast('Сначала выберите линию', true);

  const wb = new ExcelJS.Workbook();

  // ================== ЛИСТ 1: «Стандарты» ==================
  const ws = wb.addWorksheet('Стандарты');
  const headers = [
    'Часть линии', 'Машина', 'OPL №', 'Узел', 'Название', 'Линия',
    'Работа', 'Время с', 'Время по',
    'Тип контроля', 'Применять к', 'Активен',
    'Описание проблемы', 'Описание контроля', 'Цель', 'Почему создан',
    'Триггеры', 'Top Losses', 'Фото'
  ];
  ws.addRow(headers);

  // Пример
  ws.addRow([
    'Maker', 'SE', 'OPL-1.1.1', 'Узел передачи',
    'Давление на передающем устройстве (Паук)', line,
    'Run', '09:10', '10:00',
    'variable', 'ChangeOver', 'Да',
    'Пример: к чему приводит отклонение',
    'Пример: как проверить',
    'Пример: цель контроля',
    'Пример: причина создания',
    'Табак, Материалы',
    'Обрыв штранга, Заторы на MAX',
    'max-1.jpg, drum.jpg'
  ]);

  // Ширины
  const widths = [12, 10, 14, 30, 34, 10, 10, 12, 12, 14, 18, 10, 34, 34, 30, 30, 22, 30, 30];
  ws.columns.forEach((col, i) => { col.width = widths[i] || 14; });

  // Стиль шапки
  const headerRow = ws.getRow(1);
  headerRow.height = 36;
  headerRow.eachCell((cell) => {
    cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0A4FA8' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = {
      top: { style: 'thin' }, bottom: { style: 'thin' },
      left: { style: 'thin' }, right: { style: 'thin' }
    };
  });

  // ================== ЛИСТ 2: «Точки» ==================
  const ws2 = wb.addWorksheet('Точки');
  ws2.addRow(['OPL №', 'Машина', 'Бренд', '№ точки', 'Значение']);

  ws2.addRow(['OPL-1.1.1', 'SE', '', 1, '92 ± 5']);
  ws2.addRow(['OPL-1.1.1', 'SE', '', 2, '']);
  ws2.addRow(['OPL-1.1.1', 'SE', 'Kent', 1, '90 ± 3']);

  const widths2 = [14, 12, 20, 10, 26];
  ws2.columns.forEach((col, i) => { col.width = widths2[i] || 14; });

  const headerRow2 = ws2.getRow(1);
  headerRow2.height = 30;
  headerRow2.eachCell((cell) => {
    cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0A4FA8' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = {
      top: { style: 'thin' }, bottom: { style: 'thin' },
      left: { style: 'thin' }, right: { style: 'thin' }
    };
  });

  // ================== ЛИСТ 3: «Инструкция» ==================
  const wsInfo = wb.addWorksheet('Инструкция');
  wsInfo.columns = [{ width: 100 }];
  const info = [
    ['📋 Шаблон импорта OPL — ' + line],
    [''],
    ['1. Заполните лист «Стандарты» — по одной строке на стандарт.'],
    ['2. Заполните лист «Точки» — точки замера (можно оставить пустым).'],
    ['3. Сохраните файл (.xlsx) и загрузите через кнопку «Импорт» в редакторе.'],
    [''],
    ['ОБЯЗАТЕЛЬНЫЕ ПОЛЯ на листе «Стандарты»:'],
    ['  • OPL № — уникален в пределах линии + машины'],
    ['  • Часть линии — Maker или Packer (только линии SMD; для PMD и FMD оставьте пустой)'],
    ['  • Машина — обозначение (SE, MAX, …)'],
    ['  • Узел, Название, Линия, Тип контроля'],
    ['  • Тип контроля: ok_not_ok / value_input / range_input'],
    ['  • Применять к: ChangeOver, CL_TO, CL_Conversion (через запятую)'],
    ['  • Активен: Да / Нет'],
    [''],
    ['ОПЦИОНАЛЬНЫЕ ПОЛЯ:'],
    ['  • Работа: Run или Stop (по умолчанию Run)'],
    ['  • Время с / Время по: окно проверки в формате HH:MM (например 09:10 и 10:00)'],
    [''],
    ['ЛИСТ «Точки»:'],
    ['  • Связь со стандартом — по ключу OPL № + Машина'],
    ['  • Бренд — пусто = «Все бренды»'],
    ['  • № точки: 1, 2, 3, …'],
    ['  • Значение: «92 ± 5» / «5 до 8» / «0»']
  ];
  info.forEach(([text]) => wsInfo.addRow([text]));
  wsInfo.getRow(1).font = { bold: true, size: 16, color: { argb: 'FF0A4FA8' } };

  // Сохранение
  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  downloadBlob(blob, `template_opl_${line}.xlsx`);
  showToast('Шаблон скачан');
}

/* ============================================================
   РЕДАКТОР: экспорт стандартов линии в XLSX
   ============================================================ */

async function editorExportLine() {
  if (typeof ExcelJS === 'undefined') {
    return showToast('Библиотека ExcelJS не загружена', true);
  }
  const line = currentEditorLine || localStorage.getItem('cl_editor_line');
  if (!line) return showToast('Сначала выберите линию', true);

  const standards = getStandards().filter(s => s.line === line);
  if (!standards.length) {
    return showToast('На этой линии нет стандартов', true);
  }

  const wb = new ExcelJS.Workbook();

  // ================== ЛИСТ 1: «Стандарты» ==================
  const ws = wb.addWorksheet('Стандарты');
  const headers = [
    'Часть линии', 'Машина', 'OPL №', 'Узел', 'Название', 'Линия',
    'Работа', 'Время с', 'Время по',
    'Тип контроля', 'Применять к', 'Активен',
    'Описание проблемы', 'Описание контроля', 'Цель', 'Почему создан',
    'Триггеры', 'Top Losses', 'Фото'
  ];
  ws.addRow(headers);

  standards.forEach(st => {
    const triggersText = Array.isArray(st.triggers)
      ? st.triggers.map(t => t.replace(/^node:/, '')).join(', ')
      : '';

    const topLossesText = Array.isArray(st.topLosses)
      ? st.topLosses.map(id => {
          const l = findLossById(id);
          return l ? l.name : null;
        }).filter(Boolean).join(', ')
      : '';

    const photosText = Array.isArray(st.photos) ? st.photos.join(', ') : '';
    const appliesToText = Array.isArray(st.appliesTo) ? st.appliesTo.join(', ') : '';

    ws.addRow([
      st.nodePart || '',
      st.machine || '',
      st.oplNumber || '',
      st.node || '',
      st.title || '',
      st.line || line,
      (st.work === 'Stop') ? 'Stop' : 'Run',
      st.timeFrom || '',
      st.timeTo || '',
      st.controlType || '',
      appliesToText,
      st.active !== false ? 'Да' : 'Нет',
      st.problemDescription || '',
      st.controlDescription || '',
      st.purpose || '',
      st.whyCreated || '',
      triggersText,
      topLossesText,
      photosText
    ]);
  });

  const widths = [12, 10, 14, 30, 34, 10, 10, 12, 12, 14, 18, 10, 34, 34, 30, 30, 22, 30, 30];
  ws.columns.forEach((col, i) => { col.width = widths[i] || 14; });

  const headerRow = ws.getRow(1);
  headerRow.height = 36;
  headerRow.eachCell((cell) => {
    cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0A4FA8' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = {
      top: { style: 'thin' }, bottom: { style: 'thin' },
      left: { style: 'thin' }, right: { style: 'thin' }
    };
  });

  // ================== ЛИСТ 2: «Точки» ==================
  const ws2 = wb.addWorksheet('Точки');
  ws2.addRow(['OPL №', 'Машина', 'Бренд', '№ точки', 'Значение']);

  standards.forEach(st => {
    const blocks = Array.isArray(st.measurements) ? st.measurements : [];
    blocks.forEach(block => {
      const points = Array.isArray(block.points) ? block.points : [];
      points.forEach((p, i) => {
        ws2.addRow([
          st.oplNumber || '',
          st.machine || '',
          block.brand || '',
          i + 1,
          p.value || ''
        ]);
      });
    });
  });

  const widths2 = [14, 12, 20, 10, 26];
  ws2.columns.forEach((col, i) => { col.width = widths2[i] || 14; });

  const headerRow2 = ws2.getRow(1);
  headerRow2.height = 30;
  headerRow2.eachCell((cell) => {
    cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0A4FA8' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = {
      top: { style: 'thin' }, bottom: { style: 'thin' },
      left: { style: 'thin' }, right: { style: 'thin' }
    };
  });

  // Сохранение
  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const ts = new Date().toISOString().slice(0, 10);
  downloadBlob(blob, `standards_${line}_${ts}.xlsx`);
  showToast(`Экспортировано: ${standards.length} стандартов`);
}
