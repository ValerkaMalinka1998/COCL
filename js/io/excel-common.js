/* ============================================================
   EXCEL: общие функции шаблонов
   Модуль общего пространства имён: функции и переменные видны
   во всех файлах. Порядок подключения — index.html.
   ============================================================ */

/* ============================================================
   ИМПОРТ/ЭКСПОРТ: ШАБЛОНЫ
   ============================================================ */

/* Единый вид номера: «1», «4.2.1», «OPL1», «opl 3» → «OPL-1», «OPL-4.2.1», «OPL-3» */
function normalizeOplNumber(v) {
  const s = String(v == null ? '' : v).trim().replace(/,/g, '.');
  const m = s.match(/^(?:opl[\s_-]*)?(\d+(?:\.\d+)*)$/i);
  return m ? 'OPL-' + m[1] : s;
}

/* --- Шапка листа шаблона: белый жирный текст на синем --- */
function styleTemplateHeader(ws) {
  const headerRow = ws.getRow(1);
  headerRow.height = 30;
  headerRow.eachCell((cell) => {
    cell.font = { name: 'Calibri', size: 13, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0A4FA8' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });
}

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
  styleTemplateHeader(ws);

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
