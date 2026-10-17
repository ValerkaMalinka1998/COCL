/* ============================================================
   НАСТРОЙКИ: общий список брендов
   Модуль общего пространства имён: функции и переменные видны
   во всех файлах. Порядок подключения — index.html.
   ============================================================ */

/* ============================================================
   ОБЩИЙ СПИСОК БРЕНДОВ — группы по цехам
   ============================================================ */

const BRANDS_OPEN_WS_KEY = 'cl_brands_open_ws';

function getBrandsOpenGroups() {
  try {
    const arr = JSON.parse(localStorage.getItem(BRANDS_OPEN_WS_KEY) || '[]');
    return new Set(Array.isArray(arr) ? arr : []);
  } catch (e) {
    return new Set();
  }
}
function setBrandsOpenGroups(set) {
  try { localStorage.setItem(BRANDS_OPEN_WS_KEY, JSON.stringify([...set])); } catch (e) {}
}

function renderBrandsSettings() {
  const list = $('#brandsList');
  if (!list) return;

  const allBrands = getBrands().slice().sort((a, b) => a.localeCompare(b, 'ru'));
  const query = ($('#brandsSearch')?.value || '').trim().toLowerCase();
  const matches = b => !query || b.toLowerCase().includes(query);

  // Группы: все цеха по порядку + «Без цеха», если такие бренды есть
  const groups = getWorkshops().map(w => ({
    id: w.id,
    name: w.name,
    brands: allBrands.filter(b => getBrandWorkshop(b) === w.id)
  }));
  const noWs = allBrands.filter(b => !getBrandWorkshop(b));
  if (noWs.length) groups.push({ id: '__none__', name: 'Без цеха', brands: noWs });

  const counter = $('#brandsCount');
  if (counter) {
    const found = allBrands.filter(matches).length;
    counter.textContent = query ? `(${found} из ${allBrands.length})` : `(${allBrands.length})`;
  }

  const open = getBrandsOpenGroups();
  const chevron = `<span class="bl-group-toggle"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg></span>`;

  list.innerHTML = groups.map(g => {
    const shown = g.brands.filter(matches);
    if (query && !shown.length) return '';
    // При поиске раскрываем группы с совпадениями, иначе — как оставил пользователь
    const expanded = query ? true : open.has(g.id);
    const rows = shown.length
      ? shown.map(b => brandRowHtml(b, query)).join('')
      : '<div class="empty-state brands-empty">Брендов пока нет</div>';
    const addBtn = g.id === '__none__' ? '' : `
      <button type="button" class="btn btn-secondary btn-sm brands-group-add" data-brands-add="${escapeAttr(g.id)}" title="Добавить бренд в ${escapeAttr(g.name)}">+ Бренд</button>`;
    return `
      <div class="bl-group bl-group-workshop ${expanded ? 'expanded' : ''}" data-brands-ws="${escapeAttr(g.id)}">
        <div class="bl-group-head" data-brands-toggle="${escapeAttr(g.id)}">
          ${chevron}
          <span class="bl-group-name">${escapeHtml(g.name)}</span>
          <span class="bl-group-count">${g.brands.length} ${pluralizeBrandsShort(g.brands.length)}</span>
          ${addBtn}
        </div>
        <div class="bl-group-body"><div class="brands-group-list">${rows}</div></div>
      </div>
    `;
  }).join('') || `<div class="empty-state">Ничего не найдено по запросу «${escapeHtml(query)}».</div>`;
}

function brandRowHtml(b, query) {
  return `
    <div class="brands-row" data-brand="${escapeAttr(b)}">
      <span class="brands-row-name">${highlightBrandName(b, query)}</span>
      <div class="brands-row-actions">
        <button type="button" class="brands-row-action-btn brands-row-edit-btn"
                data-brands-edit="${escapeAttr(b)}" title="Изменить">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </button>
        <button type="button" class="brands-row-action-btn brands-row-delete-btn"
                data-brands-delete="${escapeAttr(b)}" title="Удалить">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
    </div>
  `;
}

/* Один делегированный обработчик на весь список брендов */
$('#brandsList')?.addEventListener('click', (e) => {
  const edit = e.target.closest('[data-brands-edit]');
  if (edit) { e.stopPropagation(); return openEditBrandModal(edit.dataset.brandsEdit); }
  const del = e.target.closest('[data-brands-delete]');
  if (del) { e.stopPropagation(); return deleteBrand(del.dataset.brandsDelete); }
  const add = e.target.closest('[data-brands-add]');
  if (add) { e.stopPropagation(); return openAddBrandModal(add.dataset.brandsAdd); }
  const head = e.target.closest('[data-brands-toggle]');
  if (head) {
    const id = head.dataset.brandsToggle;
    const open = getBrandsOpenGroups();
    if (open.has(id)) open.delete(id); else open.add(id);
    setBrandsOpenGroups(open);
    head.closest('.bl-group')?.classList.toggle('expanded', open.has(id));
  }
});

/* Подсветка совпадений в имени бренда */
function highlightBrandName(name, query) {
  if (!query) return escapeHtml(name);
  const lower = name.toLowerCase();
  const idx = lower.indexOf(query);
  if (idx === -1) return escapeHtml(name);
  return escapeHtml(name.slice(0, idx)) +
    '<strong class="hl-match">' + escapeHtml(name.slice(idx, idx + query.length)) + '</strong>' +
    escapeHtml(name.slice(idx + query.length));
}
/* ============================================================
   РЕДАКТИРОВАНИЕ БРЕНДА
   ============================================================ */
let currentEditingBrand = null;

function openEditBrandModal(oldName) {
  currentEditingBrand = oldName;
  const modal = $('#editBrandModal');
  const input = $('#editBrandInput');
  if (!modal || !input) return;
  input.value = oldName;

  // Цех бренда
  const wsEl = $('#editBrandWorkshop');
  if (wsEl) wsEl.innerHTML = workshopOptionsHtml(getBrandWorkshop(oldName));

  // Загружаем линии, к которым уже привязан бренд
  const lb = getLineBrands();
  const assignedLines = Object.keys(lb).filter(line =>
    Array.isArray(lb[line]) && lb[line].includes(oldName)
  );
  renderLinesCheckboxesGroup('editBrandLinesGroup', assignedLines);

  openModal(modal);
  setTimeout(() => {
    input.focus();
    input.select();
  }, 100);
}

function closeEditBrandModal() {
  closeModal('#editBrandModal');
  currentEditingBrand = null;
}

$('#editBrandModalClose')?.addEventListener('click', closeEditBrandModal);
$('#editBrandCancelBtn')?.addEventListener('click', closeEditBrandModal);
$('#editBrandModal')?.addEventListener('click', (e) => {
  if (e.target.id === 'editBrandModal') closeEditBrandModal();
});

/* Enter — сохранить */
$('#editBrandInput')?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    $('#editBrandSaveBtn')?.click();
  }
});

/* Сохранение */
$('#editBrandSaveBtn')?.addEventListener('click', () => {
  const newName = $('#editBrandInput').value.trim();
  const oldName = currentEditingBrand;

  if (!oldName) return;
  if (!newName) return showToast('Введите название бренда', true);

  // Если имя не менялось — проверяем только линии
  const nameChanged = newName !== oldName;

  if (nameChanged) {
    const brands = getBrands();
    if (brands.some(b => b.toLowerCase() === newName.toLowerCase())) {
      return showToast('Бренд с таким названием уже есть', true);
    }

    const idx = brands.indexOf(oldName);
    if (idx === -1) {
      closeEditBrandModal();
      return showToast('Бренд не найден', true);
    }
    brands[idx] = newName;
    setBrands(brands);
  }

  // Работаем с привязкой к линиям
  const lb = getLineBrands();
  const selectedLines = collectSelectedLines('editBrandLinesGroup');
  const workingName = nameChanged ? newName : oldName;

  // Проходим по ВСЕМ линиям и обновляем привязку
  getLines().forEach(line => {
    if (!Array.isArray(lb[line])) lb[line] = [];

    // Убираем старое имя
    if (nameChanged) {
      lb[line] = lb[line].filter(b => b !== oldName);
    }

    // Добавляем/убираем новое имя в зависимости от галочки
    const isSelected = selectedLines.includes(line);
    const hasBrand = lb[line].includes(workingName);

    if (isSelected && !hasBrand) {
      lb[line].push(workingName);
    } else if (!isSelected && hasBrand) {
      lb[line] = lb[line].filter(b => b !== workingName);
    }
  });

  setLineBrands(lb);

  // Цех бренда
  const workshop = ($('#editBrandWorkshop')?.value || '').trim();
  setBrandWorkshop(workingName, workshop);

  // Перерисовываем всё
  renderBrandsSettings();
  renderLineBrandsSettings();
  fillLinesForOperator();

  closeEditBrandModal();

  if (nameChanged) {
    showToast('Бренд обновлён');
  } else {
    showToast('Привязки линий обновлены');
  }
});

$('#brandsSearch')?.addEventListener('input', () => {
  renderBrandsSettings();
});

/* Отрисовка чекбоксов линий в модалках бренда */
function renderLinesCheckboxesGroup(containerId, selectedLines = []) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const lines = getLines();
  if (!lines.length) {
    container.innerHTML = '<div class="empty-state" style="padding:10px">Сначала добавьте линии в настройках</div>';
    return;
  }

  container.innerHTML = lines.map(l => {
    const checked = selectedLines.includes(l);
    return `<label class="${checked ? 'checked' : ''}">
      <input type="checkbox" value="${escapeHtml(l)}" ${checked ? 'checked' : ''}>
      ${escapeHtml(l)}
    </label>`;
  }).join('');

  container.querySelectorAll('input').forEach(cb => {
    cb.addEventListener('change', (e) => {
      e.target.closest('label').classList.toggle('checked', e.target.checked);
    });
  });
}

/* Собрать выбранные линии из группы */
function collectSelectedLines(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return [];
  return [...container.querySelectorAll('input:checked')].map(cb => cb.value);
}
/* --- Модалка добавления бренда --- */
function openAddBrandModal(presetWorkshop) {
  const modal = $('#addBrandModal');
  if (!modal) return;
  const input = $('#newBrandInput');
  if (input) input.value = '';

  renderLinesCheckboxesGroup('addBrandLinesGroup', []);

  const wsEl = $('#addBrandWorkshop');
  if (wsEl) wsEl.innerHTML = workshopOptionsHtml(typeof presetWorkshop === 'string' ? presetWorkshop : '');

  openModal(modal);
  setTimeout(() => { if (input) input.focus(); }, 100);
}

function closeAddBrandModal() {
  closeModal('#addBrandModal');
}

$('#openAddBrandModalBtn')?.addEventListener('click', () => openAddBrandModal(''));
$('#addBrandModalClose')?.addEventListener('click', closeAddBrandModal);
$('#addBrandCancelBtn')?.addEventListener('click', closeAddBrandModal);
$('#addBrandModal')?.addEventListener('click', (e) => {
  if (e.target.id === 'addBrandModal') closeAddBrandModal();
});

/* Enter — добавить без клика */
$('#newBrandInput')?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    $('#addBrandBtn')?.click();
  }
});

/* --- Добавление бренда --- */
$('#addBrandBtn')?.addEventListener('click', () => {
  const name = $('#newBrandInput').value.trim();
  if (!name) return showToast('Введите название бренда', true);

  const brands = getBrands();
  if (brands.some(b => b.toLowerCase() === name.toLowerCase())) {
    return showToast('Такой бренд уже есть', true);
  }

  brands.push(name);
  setBrands(brands);

  // Цех бренда
  const workshop = ($('#addBrandWorkshop')?.value || '').trim();
  if (workshop) setBrandWorkshop(name, workshop);

  // Привязка к выбранным линиям
  const selectedLines = collectSelectedLines('addBrandLinesGroup');
  if (selectedLines.length) {
    const lb = getLineBrands();
    selectedLines.forEach(line => {
      if (!Array.isArray(lb[line])) lb[line] = [];
      if (!lb[line].includes(name)) lb[line].push(name);
    });
    setLineBrands(lb);
  }

  // Очищаем поиск
  const search = $('#brandsSearch');
  if (search) search.value = '';

  renderBrandsSettings();
  renderLineBrandsSettings();
  fillLinesForOperator();
  closeAddBrandModal();

  if (selectedLines.length) {
    showToast(`Бренд добавлен на ${selectedLines.length} лин.`);
  } else {
    showToast('Бренд добавлен');
  }
});

/* ============================================================
   ИМПОРТ/ЭКСПОРТ БРЕНДОВ
   ============================================================ */

/* --- Шаблон брендов --- */
$('#downloadBrandsTemplateBtn')?.addEventListener('click', async () => {
  if (typeof ExcelJS === 'undefined') {
    return showToast('Библиотека ExcelJS не загружена', true);
  }
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Бренды');

  ws.columns = [
    { header: 'Название бренда', key: 'name', width: 40 }
  ];

  // Примеры
  ws.addRow(['Marlboro']);
  ws.addRow(['Winston']);
  ws.addRow(['Camel']);

  // Стилизация шапки
  const headerRow = ws.getRow(1);
  headerRow.height = 30;
  headerRow.eachCell((cell) => {
    cell.font = { name: 'Calibri', size: 13, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0A4FA8' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = {
      top:    { style: 'thin', color: { argb: 'FF0A4FA8' } },
      bottom: { style: 'thin', color: { argb: 'FF0A4FA8' } },
      left:   { style: 'thin', color: { argb: 'FF0A4FA8' } },
      right:  { style: 'thin', color: { argb: 'FF0A4FA8' } }
    };
  });

  // Лист с инструкцией
  const wsInfo = wb.addWorksheet('Инструкция');
  wsInfo.columns = [{ width: 80 }];
  const info = [
    ['📋 Как заполнять шаблон брендов'],
    [''],
    ['1. Заполните колонку «Название бренда» — по одному бренду на строку.'],
    ['2. Примеры в шаблоне можно удалить.'],
    ['3. Сохраните файл и загрузите через кнопку «Загрузить из Excel».'],
    ['4. Пустые строки будут проигнорированы.'],
    ['5. Дубликаты (без учёта регистра) — пропускаются.']
  ];
  info.forEach(([text]) => wsInfo.addRow([text]));
  wsInfo.getRow(1).font = { bold: true, size: 14, color: { argb: 'FF0A4FA8' } };

  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  downloadBlob(blob, 'template_brands.xlsx');
  showToast('Шаблон брендов скачан');
});

/* --- Загрузка брендов --- */
$('#uploadBrandsBtn')?.addEventListener('click', () => {
  $('#brandsFileInput').click();
});

$('#brandsFileInput')?.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  e.target.value = '';

  try {
    const result = await parseBrandsExcel(file);
    showImportReport(result, 'brandsList');
    if (result.added > 0) {
      renderBrandsSettings();
      renderLineBrandsSettings();
      showToast(`Добавлено брендов: ${result.added}`);
    } else {
      showToast('Новых брендов не найдено', true);
    }
  } catch (err) {
    console.error(err);
    showToast('Ошибка чтения файла: ' + err.message, true);
  }
});

async function parseBrandsExcel(file) {
  const wb = new ExcelJS.Workbook();
  const buf = await file.arrayBuffer();
  await wb.xlsx.load(buf);

  const ws = wb.getWorksheet('Бренды') || wb.worksheets[0];
  if (!ws) throw new Error('Не найден лист с брендами');

  const existing = getBrands();
  const existingLow = new Set(existing.map(b => b.toLowerCase()));

  const result = {
    added: 0,
    skipped: 0,
    duplicates: [],
    empty: 0,
    errors: []
  };

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
    setBrands(existing.sort((a, b) => a.localeCompare(b, 'ru')));
  }

  return result;
}
