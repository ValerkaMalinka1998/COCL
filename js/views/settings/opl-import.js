/* ============================================================
   НАСТРОЙКИ: импорт бланков OPL из журнала
   Excel-бланк (один лист — один стандарт) → стандарты выбранной линии.
   Разбор — parseOplJournalExcel в js/io/standards-io.js.
   Модуль общего пространства имён: функции и переменные видны
   во всех файлах. Порядок подключения — index.html.
   ============================================================ */

function renderOplImportSettings() {
  const sel = $('#oplImportLine');
  if (!sel) return;
  const cur = sel.value;
  const lines = getLines();
  sel.innerHTML = '<option value="">— выберите линию —</option>'
    + lines.map(l => `<option value="${escapeAttr(l)}">${escapeHtml(l)}</option>`).join('');
  sel.value = lines.includes(cur) ? cur : '';
  oplImportSyncPart();
}

/* Часть линии — только у SMD */
function oplImportSyncPart() {
  $('#oplImportPartWrap').hidden = !lineHasParts($('#oplImportLine').value);
}

$('#oplImportLine')?.addEventListener('change', () => oplImportSyncPart());

$('#oplImportBtn')?.addEventListener('click', () => {
  if (!$('#oplImportLine').value) return showToast('Сначала выберите линию', true);
  $('#oplImportInput').click();
});

$('#oplImportInput')?.addEventListener('change', async (e) => {
  const files = [...e.target.files];
  e.target.value = '';
  if (!files.length) return;
  const line = $('#oplImportLine').value;
  try {
    const result = await parseOplJournalExcel(files, line, $('#oplImportPart').value);
    showImportReport(result, 'oplImportReport');
    if (result.added > 0) {
      if (typeof refreshEditorMechTable === 'function') refreshEditorMechTable();
      if (typeof updatePartCounters === 'function') updatePartCounters();
      if (typeof fillEditorFilters === 'function') fillEditorFilters();
      if (result.addedMachines.length) renderStructureSettings();
      showToast(`Добавлено стандартов: ${result.added}${result.photos ? ` · фото: ${result.photos} (архив скачан)` : ''}`);
    } else {
      showToast('Новых стандартов не найдено', true);
    }
  } catch (err) {
    console.error(err);
    showToast('Ошибка чтения файла: ' + err.message, true);
  }
});
