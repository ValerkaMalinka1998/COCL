/* ============================================================
   ИСТОРИЯ: экспорт CSV / XLSX
   Модуль общего пространства имён: функции и переменные видны
   во всех файлах. Порядок подключения — index.html.
   ============================================================ */

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

function exportToCsv(hist) {
  const headers = [
    'Дата/время','Режим','Оператор','Смена','Линия','Часть','Тип перехода',
    'С бренда','На бренд','Потери','Триггеры','Доп. узел',
    'Пунктов','Не ОК','Детали проверки','Бренд CL (факт)'
  ];
  const rows = [headers];

  hist.forEach(h => {
    const fails = h.items.filter(i => i.status === 'FAIL').length;
    const triggersText = (h.triggers || []).map(t => t.replace('node:','')).join(', ');
    const isTopLoss = h.mode === 'toploss';
    const isCl = h.mode === 'cl' || h.mode === 'electronic';

    // Режим: текст (COCL / TOP Losses / CL Electronic / CL (мех))
    const modeText = getHistoryModeText(h);

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
      formatClShift(h),
      h.line,
      h.part || '',
      (isTopLoss || isCl) ? '' : (h.type || ''),
      (isTopLoss || isCl) ? '' : (h.brandFrom || ''),
      (isTopLoss || isCl) ? '' : (h.brandTo || ''),
      lossesText,
      isTopLoss ? '' : triggersText,
      h.customNode || '',
      h.items.length,
      fails,
      buildDetailsText(h),
      isCl ? (h.brandActual || '') : ''
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
const XL_COLOR_FAIL_BG = 'FFFDE0DD';
const XL_COLOR_FAIL_TX = 'FFC0392B';
const XL_COLOR_OK_TX   = 'FF27AE60';
const XL_COLOR_BORDER  = 'FFCBD2D9';

const EXPORT_HEADERS = [
  'Дата/время','Режим','Оператор','Смена','Линия','Часть','Тип перехода',
  'С бренда','На бренд','Потери','Триггеры','Доп. узел',
  'Пунктов','Не ОК','Детали проверки','Бренд CL (факт)'
];


/* Рамка ячейки одним цветом со всех сторон */
function xlBorder(argb) {
  const side = { style: 'thin', color: { argb } };
  return { top: side, bottom: side, left: side, right: side };
}

/* Ячейка шапки таблицы: белый жирный текст на синем */
function xlHeaderCell(cell) {
  cell.font = { name: 'Calibri', size: XL_FONT_SIZE_HEADER, bold: true, color: { argb: XL_COLOR_HEADER_TEXT } };
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: XL_COLOR_PRIMARY } };
  cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: false };
  cell.border = xlBorder(XL_COLOR_PRIMARY);
}

/* Заголовок, шапка и строки данных листа аналитики шириной cols колонок */
function xlSheetWriter(ws, cols) {
  const eachCol = (row, fn) => { for (let c = 1; c <= cols; c++) fn(row.getCell(c)); };
  return {
    addTitle(text) {
      const row = ws.addRow([text]);
      row.height = 36;
      const cell = row.getCell(1);
      cell.font = { name: 'Calibri', size: 15, bold: true, color: { argb: XL_COLOR_PRIMARY } };
      cell.alignment = { vertical: 'middle', horizontal: 'left' };
      ws.mergeCells(row.number, 1, row.number, cols);
    },
    addHeader(arr) {
      const row = ws.addRow(arr);
      row.height = 32;
      eachCol(row, xlHeaderCell);
    },
    addDataRow(arr) {
      const row = ws.addRow(arr);
      row.height = 24;
      eachCol(row, cell => {
        cell.font = { name: 'Calibri', size: XL_FONT_SIZE };
        cell.alignment = { vertical: 'middle', horizontal: 'left' };
        cell.border = xlBorder(XL_COLOR_BORDER);
      });
    }
  };
}

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

  // Только если есть CL-записи (Чек-лист CL: мех + электро)
  const hasCL = hist.some(h => h.mode === 'cl' || h.mode === 'electronic');
  if (hasCL) {
    buildSheetCL(wb, hist);
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
  14,   // Смена
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
  100,  // Детали проверки
  18    // Бренд CL (факт)
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
    const isCl = h.mode === 'cl' || h.mode === 'electronic';

    const modeText = getHistoryModeText(h);
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
      formatClShift(h),
      h.line,
      h.part || '',
      (isTopLoss || isCl) ? '' : (h.type || ''),
      (isTopLoss || isCl) ? '' : (h.brandFrom || ''),
      (isTopLoss || isCl) ? '' : (h.brandTo || ''),
      lossesText,
      isTopLoss ? '' : triggersText,
      h.customNode || '',
      h.items.length,
      fails,
      buildDetailsText(h),
      isCl ? (h.brandActual || '') : ''
    ]);

    // Высота строки: по числу пунктов, минимум 30
    const itemsCount = h.items.length;
    row.height = Math.max(20 * itemsCount + 10, 30);

    const isFailRow = fails > 0;

    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      cell.border = xlBorder(XL_COLOR_BORDER);
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
  headerRow.eachCell({ includeEmpty: true }, xlHeaderCell);

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
    const isTopLoss = h.mode === 'toploss';
    const isCl = h.mode === 'cl' || h.mode === 'electronic';

    if (!byLine[h.line]) byLine[h.line] = { checks: 0, items: 0, fails: 0 };
    byLine[h.line].checks++;
    byLine[h.line].items += h.items.length;
    byLine[h.line].fails += f;

    if (!byOperator[h.operator]) byOperator[h.operator] = { checks: 0, fails: 0 };
    byOperator[h.operator].checks++;
    byOperator[h.operator].fails += f;

    const typeKey = getHistoryModeText(h);
    if (!byType[typeKey]) byType[typeKey] = { checks: 0, fails: 0 };
    byType[typeKey].checks++;
    byType[typeKey].fails += f;

    if (!isTopLoss && !isCl) {
      const bKey = h.brandFrom + ' → ' + h.brandTo;
      if (!byBrand[bKey]) byBrand[bKey] = { checks: 0, fails: 0 };
      byBrand[bKey].checks++;
      byBrand[bKey].fails += f;
    }

    const shiftKey = isCl ? formatClShift(h) : (h.shift || '—');
    if (!byShift[shiftKey]) byShift[shiftKey] = { checks: 0, fails: 0 };
    byShift[shiftKey].checks++;
    byShift[shiftKey].fails += f;

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

  const { addTitle, addHeader, addDataRow } = xlSheetWriter(ws, 5);

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

  addTitle('🔄 По режимам / типам');
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

  const { addTitle, addHeader, addDataRow } = xlSheetWriter(ws, 6);

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
   XLSX: лист «CL» — аналитика по Чек-листу CL (мех + электро)
   ============================================================ */
function buildSheetCL(wb, hist) {
  const ws = wb.addWorksheet('CL');

  ws.columns = [
    { width: 60 },   // A — параметр / стандарт
    { width: 16 },   // B — режим
    { width: 16 },   // C — машина
    { width: 16 },   // D — линия
    { width: 12 },   // E — пунктов
    { width: 12 },   // F — не ОК
    { width: 18 }    // G — % отклонений
  ];

  // Фильтруем только CL-записи (Чек-лист CL)
  const clHist = hist.filter(h => h.mode === 'cl' || h.mode === 'electronic');

  // Агрегация по параметру/стандарту + машина
  const agg = {};
  clHist.forEach(h => {
    const isElec = h.mode === 'electronic';
    h.items.forEach(it => {
      const name = isElec ? (it.paramName || '—') : (it.title || it.oplNumber || '—');
      const key = it.machine ? name + ' [' + it.machine + ']' : name;

      if (!agg[key]) {
        agg[key] = {
          name: name,
          mode: isElec ? 'Электро' : 'Механика',
          machine: it.machine || '—',
          line: h.line || '—',
          total: 0,
          fails: 0
        };
      }
      agg[key].total++;
      if (it.status === 'FAIL') agg[key].fails++;
    });
  });

  const { addTitle, addHeader, addDataRow } = xlSheetWriter(ws, 7);

  addTitle('📊 Аналитика по Чек-листу CL (механика + электроника)');
  ws.addRow([]);
  addDataRow(['Дата формирования:', fmtDate(new Date()), '', '', '', '', '']);
  addDataRow(['Всего проверок CL:', clHist.length, '', '', '', '', '']);
  addDataRow(['Всего пунктов:', clHist.reduce(function(s, h) { return s + h.items.length; }, 0), '', '', '', '', '']);
  ws.addRow([]);

  addHeader(['Параметр / Стандарт', 'Режим', 'Машина', 'Линия', 'Пунктов', 'Не ОК', '% отклонений']);

  const rows = Object.values(agg).map(v => [
    v.name,
    v.mode,
    v.machine,
    v.line,
    v.total,
    v.fails,
    v.total > 0 ? ((v.fails / v.total) * 100).toFixed(1) + '%' : '0%'
  ]);

  // Сортировка по "Не ОК" (убывание)
  rows.sort(function(a, b) { return b[5] - a[5]; });

  if (rows.length === 0) {
    addDataRow(['—', 'Отклонений по CL не зафиксировано', '', '', '', '', '']);
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
