/* ============================================================
   НАСТРОЙКИ: общий список брендов
   Модуль общего пространства имён: функции и переменные видны
   во всех файлах. Порядок подключения — index.html.
   ============================================================ */

/* ============================================================
   ОБЩИЙ СПИСОК БРЕНДОВ — справочник с фильтром по цеху
   Какие бренды выпускает линия — отмечается на карточке линии
   в разделе «Структура».
   ============================================================ */

let brandsQuery = '';
let brandsAddWs = '';   // цех для нового бренда

function pluralizeBrandsShort(n) {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return 'бренд';
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return 'бренда';
  return 'брендов';
}

/* Линии, на которых стоит бренд */
function getLinesForBrand(brand) {
  const lb = getLineBrands();
  return Object.keys(lb).filter(l => Array.isArray(lb[l]) && lb[l].includes(brand));
}

function renderBrandsSettings() {
  const list = $('#brandsList');
  if (!list) return;

  const all = getBrands().slice().sort((a, b) => a.localeCompare(b, 'ru'));
  const wsOf = (b) => getBrandWorkshop(b) || '__none__';
  const q = brandsQuery.trim().toLowerCase();
  const ws = settingsState.brandsWs;

  const counter = $('#brandsCount');
  if (counter) counter.textContent = `(${all.length})`;

  const chipItems = settingsWorkshopChipItems(id => all.filter(b => wsOf(b) === id).length, true, all.length);
  const noneCount = all.filter(b => wsOf(b) === '__none__').length;
  if (noneCount) chipItems.push({ id: '__none__', name: 'Без цеха', count: noneCount });

  if (!brandsAddWs) brandsAddWs = (ws !== 'all' && ws !== '__none__') ? ws : (getWorkshops()[0]?.id || '');

  const shown = all
    .filter(b => ws === 'all' || wsOf(b) === ws)
    .filter(b => !q || b.toLowerCase().includes(q));

  const wsSeg = (active, attrName, brand) => getWorkshops().map(w => `
    <button type="button" class="settings-seg-btn ${active === w.id ? 'active' : ''}" ${attrName}="${escapeAttr(w.id)}"${brand != null ? ` data-brand="${escapeAttr(brand)}"` : ''}>${escapeHtml(w.name)}</button>`).join('');

  // Компактная плитка бренда: название, линии, цех (короткий список), удалить.
  // Плитки идут сеткой в прокручиваемой области — длинный справочник не растягивает страницу.
  const wsSelect = (brand) => {
    const cur = getBrandWorkshop(brand) || '';
    return `<select class="brand-tile-ws" data-brand-ws-select="${escapeAttr(brand)}" title="Цех бренда">
      ${cur ? '' : '<option value="" selected>без цеха</option>'}
      ${getWorkshops().map(w => `<option value="${escapeAttr(w.id)}" ${cur === w.id ? 'selected' : ''}>${escapeHtml(w.name)}</option>`).join('')}
    </select>`;
  };
  const rows = shown.map(b => {
    const lines = getLinesForBrand(b);
    return `
      <div class="brand-tile ${lines.length ? '' : 'brand-tile-unused'}" data-brand-row="${escapeAttr(b)}">
        <div class="brand-tile-main">
          <span class="brand-tile-name" data-brand-rename="${escapeAttr(b)}" title="Нажмите, чтобы переименовать">${settingsHighlight(b, q)}</span>
          <span class="brand-tile-meta" title="${escapeAttr(lines.join(', ') || 'Ни на одной линии')}">${lines.length ? escapeHtml(lines.slice(0, 3).join(', ')) + (lines.length > 3 ? ` +${lines.length - 3}` : '') : 'нет линий'}</span>
        </div>
        ${wsSelect(b)}
        <button type="button" class="st-icon-btn st-icon-danger" data-brand-delete="${escapeAttr(b)}" title="Удалить бренд">${SETTINGS_ICON_DELETE}</button>
      </div>`;
  }).join('');

  list.innerHTML = `
    <div class="settings-toolbar">
      ${settingsSearchHtml('brandsSearch', 'Поиск бренда…', brandsQuery)}
      <div class="settings-chips">${settingsChipsHtml(chipItems, ws, 'data-brands-filter')}</div>
    </div>
    <div class="settings-add-row">
      <input type="text" id="newBrandInlineInput" placeholder="Новый бренд, Enter" autocomplete="off">
      <span class="settings-seg">${wsSeg(brandsAddWs, 'data-brand-add-ws')}</span>
      <button type="button" class="btn btn-primary btn-sm" id="newBrandInlineBtn">Добавить</button>
    </div>
    ${rows ? `<div class="brand-grid-meta">Показано ${shown.length} из ${all.length}</div>
    <div class="brand-grid">${rows}</div>`
    : `<div class="settings-list"><div class="st-empty">${q ? `Ничего не найдено по «${escapeHtml(brandsQuery)}»` : 'Брендов в этом цехе пока нет'}</div></div>`}`;
}

function addBrandInline() {
  const input = $('#newBrandInlineInput');
  const name = (input?.value || '').trim();
  if (!name) return showToast('Введите название бренда', true);
  const brands = getBrands();
  if (brands.some(b => b.toLowerCase() === name.toLowerCase())) return showToast('Такой бренд уже есть', true);
  brands.push(name);
  setBrands(brands);
  if (brandsAddWs) setBrandWorkshop(name, brandsAddWs);
  renderBrandsSettings();
  updateSettingsNavCounts();
  $('#newBrandInlineInput')?.focus();
  showToast(`Бренд «${name}» добавлен — отметьте его на линиях в «Структуре»`);
}

/* Переименование бренда: справочник, линии, цех, нормы стандартов и параметров */
function renameBrand(oldName, newName) {
  const brands = getBrands();
  if (brands.some(b => b !== oldName && b.toLowerCase() === newName.toLowerCase())) {
    showToast('Бренд с таким названием уже есть', true);
    return false;
  }
  const idx = brands.indexOf(oldName);
  if (idx === -1) return false;
  brands[idx] = newName;
  setBrands(brands);

  const lb = getLineBrands();
  Object.keys(lb).forEach(l => {
    if (Array.isArray(lb[l])) lb[l] = lb[l].map(b => b === oldName ? newName : b);
  });
  setLineBrands(lb);

  const ws = getBrandWorkshop(oldName);
  const map = getBrandWorkshops();
  delete map[oldName];
  if (ws) map[newName] = ws;
  setBrandWorkshops(map);

  let changed = 0;
  const stds = getStandards();
  stds.forEach(s => (s.measurements || []).forEach(m => {
    if (m.brand === oldName) { m.brand = newName; changed++; }
  }));
  if (changed) setStandards(stds);
  const eps = getElectronicParams();
  let changedEp = 0;
  eps.forEach(p => (p.valuesByBrand || []).forEach(v => {
    if (v.brand === oldName) { v.brand = newName; changedEp++; }
  }));
  if (changedEp) setElectronicParams(eps);

  renderBrandsSettings();
  if (typeof renderStructureSettings === 'function') renderStructureSettings();
  fillLinesForOperator();
  showToast(changed + changedEp
    ? `Бренд переименован, обновлено норм: ${changed + changedEp}`
    : 'Бренд переименован');
  return true;
}

window.deleteBrand = function(name) {
  const lines = getLinesForBrand(name);
  const msg = lines.length
    ? `Удалить бренд «${name}»? Он стоит на линиях: ${lines.join(', ')} — и пропадёт с них.`
    : `Удалить бренд «${name}»?`;
  if (!confirm(msg)) return;
  setBrands(getBrands().filter(b => b !== name));
  const lb = getLineBrands();
  Object.keys(lb).forEach(l => { if (Array.isArray(lb[l])) lb[l] = lb[l].filter(b => b !== name); });
  setLineBrands(lb);
  const map = getBrandWorkshops();
  delete map[name];
  setBrandWorkshops(map);
  renderBrandsSettings();
  if (typeof renderStructureSettings === 'function') renderStructureSettings();
  updateSettingsNavCounts();
  fillLinesForOperator();
  showToast('Бренд удалён');
};

/* --- Обработчики (контейнер статичный, содержимое перерисовывается) --- */
$('#brandsList')?.addEventListener('input', (e) => {
  if (e.target.id !== 'brandsSearch') return;
  brandsQuery = e.target.value;
  const pos = e.target.selectionStart;
  renderBrandsSettings();
  const s = $('#brandsSearch');
  if (s) { s.focus(); s.setSelectionRange(pos, pos); }
});

$('#brandsList')?.addEventListener('keydown', (e) => {
  if (e.target.id === 'newBrandInlineInput' && e.key === 'Enter') {
    e.preventDefault();
    addBrandInline();
  }
});

$('#brandsList')?.addEventListener('click', (e) => {
  const f = e.target.closest('[data-brands-filter]');
  if (f) {
    settingsState.brandsWs = f.dataset.brandsFilter;
    if (f.dataset.brandsFilter !== 'all' && f.dataset.brandsFilter !== '__none__') brandsAddWs = f.dataset.brandsFilter;
    return renderBrandsSettings();
  }
  const addWs = e.target.closest('[data-brand-add-ws]');
  if (addWs) {
    brandsAddWs = addWs.dataset.brandAddWs;
    const v = $('#newBrandInlineInput')?.value || '';
    renderBrandsSettings();
    const inp = $('#newBrandInlineInput');
    if (inp) { inp.value = v; inp.focus(); }
    return;
  }
  if (e.target.closest('#newBrandInlineBtn')) return addBrandInline();
  const del = e.target.closest('[data-brand-delete]');
  if (del) return window.deleteBrand(del.dataset.brandDelete);
  const ren = e.target.closest('[data-brand-rename]');
  if (ren) {
    const old = ren.dataset.brandRename;
    startInlineEdit(ren, old, (v) => renameBrand(old, v));
  }
});

/* Цех бренда — выпадающий список на плитке */
$('#brandsList')?.addEventListener('change', (e) => {
  const sel = e.target.closest('[data-brand-ws-select]');
  if (!sel || !sel.value) return;
  setBrandWorkshop(sel.dataset.brandWsSelect, sel.value);
  renderBrandsSettings();
  if (typeof renderStructureSettings === 'function') renderStructureSettings();
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
      updateSettingsNavCounts();
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
