/* ============================================================
   НАСТРОЙКИ: Top Losses
   Модуль общего пространства имён: функции и переменные видны
   во всех файлах. Порядок подключения — index.html.
   ============================================================ */

/* ============================================================
   TOP LOSSES — категории по цехам, правка в строке
   ============================================================ */

/* Склонение: 1 потеря / 2 потери / 5 потерь */
function pluralizeLosses(n) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return 'потеря';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return 'потери';
  return 'потерь';
}

let tlSettingsQuery = '';

/* Вид категории по названию — для цветного акцента карточки */
function tlCategoryKind(name) {
  const n = (name || '').toLowerCase();
  if (n.includes('останов')) return 'stops';
  if (n.includes('качеств') || n.includes('дефект')) return 'quality';
  if (n.includes('выброс')) return 'emission';
  return 'other';
}

function renderTopLossesSettings() {
  const container = $('#topLossesContainer');
  if (!container) return;

  const cats = getTopLosses();
  const workshops = getWorkshops();
  if (!settingsState.tlWs || !workshops.some(w => w.id === settingsState.tlWs)) {
    settingsState.tlWs = workshops[0]?.id || null;
  }
  const ws = settingsState.tlWs;
  const q = tlSettingsQuery.trim().toLowerCase();
  const matches = (it) => !q || it.name.toLowerCase().includes(q);

  // Сколько стандартов ссылаются на каждую потерю
  const usage = {};
  getStandards().forEach(st => (st.topLosses || []).forEach(id => { usage[id] = (usage[id] || 0) + 1; }));

  const chipItems = workshops.map(w => ({
    id: w.id,
    name: w.name,
    count: cats.filter(c => c.workshop === w.id)
      .reduce((n, c) => n + (c.items || []).filter(matches).length, 0)
  }));

  const wsCats = cats.filter(c => c.workshop === ws);
  const catCard = (cat) => {
    const items = (cat.items || []).filter(matches);
    const stdCount = new Set(getStandards()
      .filter(st => (st.topLosses || []).some(id => (cat.items || []).some(i => i.id === id)))
      .map(st => st.id)).size;
    const rows = items.map(it => `
      <div class="settings-row tl-set-row">
        <span class="settings-row-name" data-tl-rename="${escapeAttr(it.id)}" data-cat-id="${escapeAttr(cat.id)}" title="Нажмите, чтобы переименовать">${settingsHighlight(it.name, q)}</span>
        ${usage[it.id] ? `<span class="settings-row-meta" title="Стандартов с этой потерей">${usage[it.id]}</span>` : ''}
        <button type="button" class="st-icon-btn st-icon-danger" data-tl-delete="${escapeAttr(it.id)}" data-cat-id="${escapeAttr(cat.id)}" title="Удалить потерю">${SETTINGS_ICON_DELETE}</button>
      </div>`).join('');
    return `
      <div class="tl-set-cat tl-set-cat-${tlCategoryKind(cat.name)}">
        <div class="tl-set-cat-head">
          <span class="tl-set-cat-name">${escapeHtml(cat.name)}</span>
          <span class="st-count">${(cat.items || []).length} ${pluralizeLosses((cat.items || []).length)}${stdCount ? ' · ' + stdCount + ' ' + pluralizeStandards(stdCount) : ''}</span>
        </div>
        <div class="tl-set-cat-list">${rows || `<div class="st-muted tl-set-empty">${q ? 'Нет совпадений' : 'Потерь пока нет'}</div>`}</div>
        <input type="text" class="tl-set-add" data-tl-add="${escapeAttr(cat.id)}" placeholder="+ Новая потеря, Enter" autocomplete="off">
      </div>`;
  };

  container.innerHTML = `
    <div class="settings-toolbar">
      ${settingsSearchHtml('tlSettingsSearch', 'Поиск потери во всех цехах…', tlSettingsQuery)}
      <div class="settings-chips">${settingsChipsHtml(chipItems, ws, 'data-tl-ws')}</div>
    </div>
    <div class="tl-set-grid">
      ${wsCats.length ? wsCats.map(catCard).join('') : '<div class="st-empty">У цеха нет категорий</div>'}
    </div>`;
}

function tlSaveItem(catId, itemId, rawName) {
  const name = (rawName || '').trim();
  if (!name) { showToast('Введите название потери', true); return false; }
  const cats = getTopLosses();
  const cat = cats.find(c => c.id === catId);
  if (!cat) return false;
  if (!Array.isArray(cat.items)) cat.items = [];
  if (cat.items.some(i => i.id !== itemId && i.name.toLowerCase() === name.toLowerCase())) {
    showToast('Такая потеря уже есть в этой категории', true);
    return false;
  }
  if (itemId) {
    const item = cat.items.find(i => i.id === itemId);
    if (!item) return false;
    item.name = name;
  } else {
    cat.items.push({ id: makeLossId(name), name });
  }
  setTopLosses(cats);
  renderTopLossesSettings();
  updateSettingsNavCounts();
  showToast(itemId ? 'Потеря переименована' : 'Потеря добавлена');
  return true;
}

$('#topLossesContainer')?.addEventListener('input', (e) => {
  if (e.target.id !== 'tlSettingsSearch') return;
  tlSettingsQuery = e.target.value;
  const pos = e.target.selectionStart;
  // Поиск переключает на цех, где есть совпадения
  const q = tlSettingsQuery.trim().toLowerCase();
  if (q) {
    const cats = getTopLosses();
    const has = (ws) => cats.some(c => c.workshop === ws && (c.items || []).some(i => i.name.toLowerCase().includes(q)));
    if (!has(settingsState.tlWs)) {
      const other = getWorkshops().find(w => has(w.id));
      if (other) settingsState.tlWs = other.id;
    }
  }
  renderTopLossesSettings();
  const s = $('#tlSettingsSearch');
  if (s) { s.focus(); s.setSelectionRange(pos, pos); }
});

$('#topLossesContainer')?.addEventListener('keydown', (e) => {
  const add = e.target.closest('[data-tl-add]');
  if (!add || e.key !== 'Enter') return;
  e.preventDefault();
  const catId = add.dataset.tlAdd;
  if (tlSaveItem(catId, null, add.value)) {
    $(`#topLossesContainer [data-tl-add="${CSS.escape(catId)}"]`)?.focus();
  }
});

$('#topLossesContainer')?.addEventListener('click', (e) => {
  const chip = e.target.closest('[data-tl-ws]');
  if (chip) {
    settingsState.tlWs = chip.dataset.tlWs;
    return renderTopLossesSettings();
  }
  const del = e.target.closest('[data-tl-delete]');
  if (del) return window.deleteTopLossItem(del.dataset.catId, del.dataset.tlDelete);
  const ren = e.target.closest('[data-tl-rename]');
  if (ren) {
    const cat = getTopLosses().find(c => c.id === ren.dataset.catId);
    const item = cat && (cat.items || []).find(i => i.id === ren.dataset.tlRename);
    if (item) startInlineEdit(ren, item.name, (v) => tlSaveItem(cat.id, item.id, v));
  }
});

/* Удалить потерю */
window.deleteTopLossItem = function(catId, itemId) {
  const cats = getTopLosses();
  const cat = cats.find(c => c.id === catId);
  if (!cat) return;
  const item = (cat.items || []).find(i => i.id === itemId);
  if (!item) return;

  const used = getStandards().filter(st => (st.topLosses || []).includes(itemId)).length;
  if (!confirm(used
    ? `Удалить потерю «${item.name}»? Она привязана к ${used} ${pluralizeStandards(used)} — привязка пропадёт.`
    : `Удалить потерю «${item.name}»?`)) return;

  cat.items = cat.items.filter(i => i.id !== itemId);
  setTopLosses(cats);
  renderTopLossesSettings();
  updateSettingsNavCounts();
  showToast('Потеря удалена');
};

window.deleteOperator = function(name) {
  if (!confirm('Удалить оператора "' + name + '"?')) return;
  setOperators(getOperators().filter(o => o !== name));
  renderOperatorsSettings();
  updateSettingsNavCounts();
  showToast('Оператор удалён');
};

/* ============================================================
   TOP LOSSES — шаблон и импорт Excel
   ============================================================ */

/* --- Шаблон --- */
$('#downloadTopLossesTemplateBtn')?.addEventListener('click', async () => {
  if (typeof ExcelJS === 'undefined') {
    return showToast('Библиотека ExcelJS не загружена', true);
  }

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Top Losses');

  ws.columns = [
    { header: 'Цех',       key: 'workshop', width: 12 },
    { header: 'Категория', key: 'category', width: 40 },
    { header: 'Потеря',    key: 'loss',     width: 50 }
  ];

  // Примеры
  ws.addRow(['SMD', 'Увеличенные остановки', 'Остановки по хопперу']);
  ws.addRow(['SMD', 'Увеличенные остановки', 'Обрыв штранга']);
  ws.addRow(['SMD', 'Дефекты по качеству',   'Замятие сигарет']);
  ws.addRow(['PMD', 'Повышенные выбросы',    'Выбросы по LES']);

  // Шапка
  styleTemplateHeader(ws);

  // Инструкция
  const wsInfo = wb.addWorksheet('Инструкция');
  wsInfo.columns = [{ width: 90 }];
  const info = [
    ['📋 Шаблон Top Losses'],
    [''],
    ['КАК ПОЛЬЗОВАТЬСЯ:'],
    ['1. Заполните столбцы «Цех» (SMD, PMD или FMD), «Категория» и «Потеря». Одна потеря = одна строка.'],
    ['2. Категория может повторяться — потери добавятся в категорию этого цеха.'],
    ['   Если столбца «Цех» нет (старый шаблон) — потери попадут в SMD.'],
    ['3. Сохраните файл и загрузите через кнопку «Загрузить из Excel».'],
    [''],
    ['ПРАВИЛА ИМПОРТА:'],
    ['  • Если категории нет в справочнике — она создастся автоматически.'],
    ['  • Если потеря уже есть в категории — она пропускается (дубликат).'],
    ['  • Пустые строки игнорируются.'],
    ['']
  ];
  info.forEach(([text]) => wsInfo.addRow([text]));
  wsInfo.getRow(1).font = { bold: true, size: 16, color: { argb: 'FF0A4FA8' } };

  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  downloadBlob(blob, 'template_top_losses.xlsx');
  showToast('Шаблон Top Losses скачан');
});

/* --- Импорт --- */
$('#uploadTopLossesBtn')?.addEventListener('click', () => {
  $('#topLossesFileInput').click();
});

$('#topLossesFileInput')?.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  e.target.value = '';

  try {
    const result = await parseTopLossesExcel(file);
    showImportReport(result, 'topLossesContainer');
    if (result.added > 0) {
      renderTopLossesSettings();
      showToast(`Добавлено потерь: ${result.added}`);
    } else {
      showToast('Новых потерь не найдено', true);
    }
  } catch (err) {
    console.error(err);
    showToast('Ошибка чтения файла: ' + err.message, true);
  }
});

async function parseTopLossesExcel(file) {
  const wb = new ExcelJS.Workbook();
  const buf = await file.arrayBuffer();
  await wb.xlsx.load(buf);

  const ws = wb.getWorksheet('Top Losses') || wb.worksheets[0];
  if (!ws) throw new Error('Не найден лист «Top Losses»');

  const cats = getTopLosses();

  const result = {
    added: 0,
    skipped: 0,
    duplicates: [],
    empty: 0,
    errors: []
  };

  // Новый шаблон: «Цех | Категория | Потеря», старый: «Категория | Потеря»
  const hasWsColumn = String(ws.getRow(1).getCell(1).value || '').trim().toLowerCase() === 'цех';
  const workshops = getWorkshops();
  const defaultWs = workshops.some(w => w.id === 'smd') ? 'smd' : (workshops[0] || {}).id;

  for (let i = 2; i <= ws.rowCount; i++) {
    const row = ws.getRow(i);
    const off = hasWsColumn ? 1 : 0;
    const wsName = hasWsColumn ? String(row.getCell(1).value || '').trim() : '';
    const catName = String(row.getCell(1 + off).value || '').trim();
    const itemName = String(row.getCell(2 + off).value || '').trim();

    if (!wsName && !catName && !itemName) {
      result.empty++;
      continue;
    }
    if (!catName || !itemName) {
      result.errors.push({ row: i, message: 'нужны и категория, и потеря' });
      continue;
    }

    let wsId = defaultWs;
    if (hasWsColumn) {
      const w = workshops.find(x => x.name.toLowerCase() === wsName.toLowerCase() || x.id === wsName.toLowerCase());
      if (!w) {
        result.errors.push({ row: i, message: `неизвестный цех «${wsName}»` });
        continue;
      }
      wsId = w.id;
    }

    // Найти или создать категорию этого цеха
    let cat = cats.find(c => c.workshop === wsId && c.name.toLowerCase() === catName.toLowerCase());
    if (!cat) {
      cat = { id: makeCategoryId(catName) + '_' + wsId, name: catName, workshop: wsId, items: [] };
      cats.push(cat);
    }
    if (!Array.isArray(cat.items)) cat.items = [];

    // Проверка дубликата потери
    if (cat.items.some(it => it.name.toLowerCase() === itemName.toLowerCase())) {
      result.duplicates.push(`${catName} / ${itemName}`);
      result.skipped++;
      continue;
    }

    cat.items.push({ id: makeLossId(itemName), name: itemName });
    result.added++;
  }

  if (result.added > 0) {
    setTopLosses(cats);
  }

  return result;
}

/* --- Загрузка операторов --- */
$('#uploadOperatorsBtn')?.addEventListener('click', () => {
  $('#operatorsFileInput').click();
});

$('#operatorsFileInput')?.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  e.target.value = '';

  try {
    const result = await parseOperatorsExcel(file);
    showImportReport(result, 'operatorsList');
    if (result.added > 0) {
      renderOperatorsSettings();
      showToast(`Добавлено операторов: ${result.added}`);
    } else {
      showToast('Новых операторов не найдено', true);
    }
  } catch (err) {
    console.error(err);
    showToast('Ошибка чтения файла: ' + err.message, true);
  }
});

async function parseOperatorsExcel(file) {
  const wb = new ExcelJS.Workbook();
  const buf = await file.arrayBuffer();
  await wb.xlsx.load(buf);

  const ws = wb.getWorksheet('Операторы') || wb.worksheets[0];
  if (!ws) throw new Error('Не найден лист с операторами');

  const existing = getOperators();
  const existingLow = new Set(existing.map(o => o.toLowerCase()));

  const result = {
    added: 0,
    skipped: 0,
    duplicates: [],
    empty: 0,
    errors: []
  };

  // Читаем со 2-й строки (пропускаем шапку)
  for (let i = 2; i <= ws.rowCount; i++) {
    const row = ws.getRow(i);
    const cellValue = row.getCell(1).value;
    const raw = cellValue == null ? '' : String(cellValue).trim();

    if (!raw) {
      result.empty++;
      continue;
    }

    if (existingLow.has(raw.toLowerCase())) {
      result.duplicates.push(raw);
      result.skipped++;
      continue;
    }

    existing.push(raw);
    existingLow.add(raw.toLowerCase());
    result.added++;
  }

  if (result.added > 0) {
    setOperators(sortOperatorsRus(existing));
  }

  return result;
}

function showImportReport(result, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  // Удаляем старый отчёт, если был
  const old = container.querySelector('.import-report');
  if (old) old.remove();

  const report = document.createElement('div');
  const hasAddedMachines = Array.isArray(result.addedMachines) && result.addedMachines.length > 0;
  const hasErrors = result.errors.length > 0 || result.duplicates.length > 0;
  report.className = 'import-report ' + (hasErrors ? 'error' : 'success');

  let html = '<h4>📋 Отчёт импорта</h4><ul>';
  const noun = result.noun || 'стандартов';
  if (result.added > 0)   html += `<li>✅ Добавлено ${noun}: <strong>${result.added}</strong></li>`;
  if (result.pointsImported > 0) html += `<li>✅ Загружено ${result.pointsNoun || 'точек'}: <strong>${result.pointsImported}</strong></li>`;
  if (result.skipped > 0) html += `<li>⚠️ Пропущено (уже есть или ошибки): <strong>${result.skipped}</strong></li>`;
  if (result.empty > 0)   html += `<li>⚪ Пустых ${result.emptyNoun || 'строк'}: ${result.empty}</li>`;
  if (result.errors.length > 0) {
    html += `<li>❌ Ошибок: <strong>${result.errors.length}</strong></li>`;
  }
  html += '</ul>';

  // Автодобавленные машины
  if (hasAddedMachines) {
    html += '<div style="margin-top:8px"><strong>🔧 Автоматически добавлены машины:</strong> ';
    html += result.addedMachines
      .map(m => `<code>${escapeHtml(m)}</code>`)
      .join(', ');
    html += '</div>';
  }

  if (result.duplicates.length > 0) {
    html += `<div style="margin-top:8px"><strong>Уже есть в приложении (пропущены):</strong> `;
    html += result.duplicates.slice(0, 10).map(d => `<code>${escapeHtml(typeof d === 'string' ? d
      : `${d.oplNumber || d.name || ''}${d.machine ? ' · ' + d.machine : ''}`)}</code>`).join(', ');
    if (result.duplicates.length > 10) html += ` и ещё ${result.duplicates.length - 10}...`;
    html += '</div>';
  }

  if (result.errors.length > 0) {
    html += '<div style="margin-top:8px"><strong>Строки с ошибками:</strong><ul>';
    result.errors.slice(0, 10).forEach(e => {
      html += `<li>${e.row != null ? `Строка ${e.row}: ` : ''}${escapeHtml(e.message)}</li>`;
    });
    if (result.errors.length > 10) html += `<li>...и ещё ${result.errors.length - 10}</li>`;
    html += '</ul></div>';
  }

  report.innerHTML = html;
  container.prepend(report);

  if (!hasErrors && !hasAddedMachines) {
    setTimeout(() => { if (report.parentNode) report.remove(); }, 30000);
  }
}
