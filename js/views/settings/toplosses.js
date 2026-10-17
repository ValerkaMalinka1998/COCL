/* ============================================================
   НАСТРОЙКИ: Top Losses
   Модуль общего пространства имён: функции и переменные видны
   во всех файлах. Порядок подключения — index.html.
   ============================================================ */

/* ============================================================
   TOP LOSSES — категории (аккордеон + inline-потери)
   ============================================================ */

const TL_OPEN_CATS_KEY = 'cl_tl_open_cats';

/* Открытые категории */
function getTlOpenCats() {
  try {
    const raw = localStorage.getItem(TL_OPEN_CATS_KEY);
    const arr = raw ? JSON.parse(raw) : null;
    return Array.isArray(arr) ? arr : null;
  } catch (e) { return null; }
}

function setTlOpenCats(arr) {
  try { localStorage.setItem(TL_OPEN_CATS_KEY, JSON.stringify(arr)); } catch (e) {}
}

function renderTopLossesSettings() {
  const container = $('#topLossesContainer');
  if (!container) return;

  const cats = getTopLosses();
  const workshops = getWorkshops();

  if (!cats.length) {
    container.innerHTML = '<div class="empty-state">Категорий нет</div>';
    return;
  }

  // Открытые категории
  let openCats = getTlOpenCats();
  if (openCats === null) {
    openCats = cats.map(c => c.id);   // все раскрыты по умолчанию
    setTlOpenCats(openCats);
  }

  // Открытые цеха
  let openWs = getTlOpenWorkshops();
  if (openWs === null) {
    openWs = workshops.map(w => w.id);
    setTlOpenWorkshops(openWs);
  }
  const wsOpen = (id) => openWs.includes(id);

  // --- Тулбар ---
  let html = `
    <div class="tl-cat-toolbar">
      <div class="tl-cat-search-wrap">
        <svg class="tl-cat-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8"/>
          <line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input type="text" id="tlCatSearchInput" placeholder="Поиск по категории или потере..." autocomplete="off">
        <button type="button" class="tl-cat-search-clear" id="tlCatSearchClear" title="Очистить" style="display:none">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      <button type="button" class="btn btn-secondary btn-sm tl-cat-toggle-all-btn" id="tlCatToggleAllBtn" title="Развернуть или свернуть все категории">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" id="tlCatToggleAllIcon">
          <polyline points="7 13 12 18 17 13"/>
          <polyline points="7 6 12 11 17 6"/>
        </svg>
        <span id="tlCatToggleAllLabel">Развернуть всё</span>
      </button>
    </div>
  `;

  // --- Категории (список одной категории) ---
  const renderCat = (cat) => {
    const items = Array.isArray(cat.items) ? cat.items : [];
    const isOpen = openCats.includes(cat.id);
    const catId = cat.id;

    const itemsHtml = items.length
      ? items.map(it => `
          <div class="tl-loss-inline-row" data-loss-id="${escapeAttr(it.id)}" data-cat-id="${escapeAttr(catId)}">
            <span class="tl-loss-inline-name">${escapeHtml(it.name)}</span>
            <div class="tl-loss-inline-actions">
              <button type="button" class="tl-row-action-btn tl-row-edit-btn" data-tl-edit="${escapeAttr(it.id)}" title="Изменить">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
              </button>
              <button type="button" class="tl-row-action-btn tl-row-delete-btn" data-tl-delete="${escapeAttr(it.id)}" title="Удалить">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
          </div>
        `).join('')
      : '<div class="tl-cat-empty">В категории нет потерь</div>';

    const allStandards = getStandards();
    const lossIdsSet = new Set(items.map(it => it.id));
    const stdCount = allStandards.filter(st =>
      Array.isArray(st.topLosses) && st.topLosses.some(id => lossIdsSet.has(id))
    ).length;

    return `
      <div class="tl-cat-group ${isOpen ? 'expanded' : ''}" data-cat-id="${escapeAttr(catId)}">
        <div class="tl-cat-group-head" data-cat-toggle="${escapeAttr(catId)}">
          <span class="tl-cat-group-toggle">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </span>
          <span class="tl-cat-group-name">${escapeHtml(cat.name)}</span>
          <span class="tl-cat-group-count">
            ${items.length} ${pluralizeLosses(items.length)}
            ${stdCount > 0 ? ` · ${stdCount} ${pluralizeStandards(stdCount)}` : ''}
          </span>
        </div>
        <div class="tl-cat-group-body">
          <div class="tl-cat-losses">${itemsHtml}</div>
          <div class="tl-cat-group-footer">
            <button type="button" class="btn btn-secondary btn-icon-text tl-cat-add-loss-btn" data-tl-add-loss="${escapeAttr(catId)}">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              <span>Добавить потерю</span>
            </button>
          </div>
        </div>
      </div>
    `;
  };

  // --- Блоки цехов: в каждом свои категории ---
  html += '<div class="tl-cat-groups">';
  workshops.forEach(w => {
    const list = cats.filter(c => c.workshop === w.id);
    const isOpen = wsOpen(w.id);
    const lossCount = list.reduce((sum, c) => sum + ((c.items || []).length), 0);
    html += `
      <div class="bl-group bl-group-workshop ${isOpen ? 'expanded' : ''}" data-ws-id="${escapeAttr(w.id)}">
        <div class="bl-group-head" data-ws-toggle="${escapeAttr(w.id)}">
          <span class="bl-group-toggle">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </span>
          <span class="bl-group-name">${escapeHtml(w.name)}</span>
          <span class="bl-group-count">${list.length} кат. · ${lossCount} ${pluralizeLosses(lossCount)}</span>
        </div>
        <div class="bl-group-body">
          <div class="tl-cat-groups">${list.length ? list.map(renderCat).join('') : '<div class="tl-cat-empty">Категорий нет</div>'}</div>
        </div>
      </div>
    `;
  });

  html += '</div>';
  container.innerHTML = html;

  // --- Аккордеон цехов ---
  container.querySelectorAll('[data-ws-toggle]').forEach(head => {
    head.addEventListener('click', () => {
      const id = head.dataset.wsToggle;
      let open = getTlOpenWorkshops() || [];
      if (open.includes(id)) open = open.filter(x => x !== id);
      else open.push(id);
      setTlOpenWorkshops(open);
      renderTopLossesSettings();
    });
  });

  // --- Аккордеон категорий ---
  container.querySelectorAll('[data-cat-toggle]').forEach(head => {
    head.addEventListener('click', (e) => {
      e.stopPropagation();
      const catId = head.dataset.catToggle;
      let open = getTlOpenCats() || [];
      if (open.includes(catId)) open = open.filter(id => id !== catId);
      else open.push(catId);
      setTlOpenCats(open);
      renderTopLossesSettings();
    });
  });

  // --- Обработчики: добавить потерю ---
  container.querySelectorAll('[data-tl-add-loss]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const catId = btn.dataset.tlAddLoss;
      openTopLossItemModal(catId, null);
    });
  });

  // --- Обработчики: редактировать потерю ---
  container.querySelectorAll('[data-tl-edit]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const itemId = btn.dataset.tlEdit;
      const row = btn.closest('.tl-loss-inline-row');
      const catId = row ? row.dataset.catId : null;
      if (catId) openTopLossItemModal(catId, itemId);
    });
  });

  // --- Обработчики: удалить потерю ---
  container.querySelectorAll('[data-tl-delete]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const itemId = btn.dataset.tlDelete;
      const row = btn.closest('.tl-loss-inline-row');
      const catId = row ? row.dataset.catId : null;
      if (catId) deleteTopLossItem(catId, itemId);
    });
  });

  // --- Кнопка «Развернуть / Свернуть всё» ---
  updateTlCatToggleAllBtn(cats);

  const toggleAllBtn = $('#tlCatToggleAllBtn');
  if (toggleAllBtn) {
    toggleAllBtn.addEventListener('click', () => {
      const open = getTlOpenCats() || [];
      const allIds = cats.map(c => c.id);
      const allExpanded = allIds.length > 0 && allIds.every(id => open.includes(id));

      if (allExpanded) {
        setTlOpenCats([]);
      } else {
        setTlOpenCats(allIds);
        setTlOpenWorkshops(workshops.map(w => w.id));
      }
      renderTopLossesSettings();
    });
  }

  // --- Поиск ---
  const searchInput = $('#tlCatSearchInput');
  const searchClear = $('#tlCatSearchClear');
  if (searchInput) {
    const savedQuery = sessionStorage.getItem('tl_search_query') || '';
    if (savedQuery) {
      searchInput.value = savedQuery;
      if (searchClear) searchClear.style.display = 'inline-flex';
      applyTlCatSearch(savedQuery);
    }

    searchInput.addEventListener('input', () => {
      const q = searchInput.value.trim();
      sessionStorage.setItem('tl_search_query', q);
      if (searchClear) searchClear.style.display = q ? 'inline-flex' : 'none';
      applyTlCatSearch(q);
    });
  }

  if (searchClear) {
    searchClear.addEventListener('click', () => {
      if (searchInput) searchInput.value = '';
      sessionStorage.removeItem('tl_search_query');
      searchClear.style.display = 'none';
      applyTlCatSearch('');
      if (searchInput) searchInput.focus();
    });
  }

}

function getTlOpenWorkshops() {
  try { return JSON.parse(localStorage.getItem('cl_tl_open_ws')); } catch(e) { return null; }
}
function setTlOpenWorkshops(arr) {
  try { localStorage.setItem('cl_tl_open_ws', JSON.stringify(arr)); } catch(e) {}
}

/* Обновить вид кнопки «Развернуть / Свернуть всё» */
function updateTlCatToggleAllBtn(cats) {
  const btn = $('#tlCatToggleAllBtn');
  const label = $('#tlCatToggleAllLabel');
  const icon = $('#tlCatToggleAllIcon');
  if (!btn || !label || !icon) return;

  const open = getTlOpenCats() || [];
  const allIds = cats.map(c => c.id);
  const allExpanded = allIds.length > 0 && allIds.every(id => open.includes(id));

  if (allExpanded) {
    label.textContent = 'Свернуть всё';
    btn.title = 'Свернуть все категории';
    icon.innerHTML = `
      <polyline points="17 11 12 6 7 11"/>
      <polyline points="17 18 12 13 7 18"/>
    `;
  } else {
    label.textContent = 'Развернуть всё';
    btn.title = 'Развернуть все категории';
    icon.innerHTML = `
      <polyline points="7 13 12 18 17 13"/>
      <polyline points="7 6 12 11 17 6"/>
    `;
  }
}

/* Поиск по категориям и потерям */
function applyTlCatSearch(query) {
  const container = $('#topLossesContainer');
  if (!container) return;

  const q = (query || '').trim().toLowerCase();
  const groups = container.querySelectorAll('.tl-cat-group');

  if (!q) {
    const openCats = getTlOpenCats() || [];
    groups.forEach(g => {
      g.style.display = '';
      g.classList.toggle('expanded', openCats.includes(g.dataset.catId));
    });
    container.querySelectorAll('.tl-loss-inline-row').forEach(r => r.style.display = '');
    container.querySelectorAll('[data-ws-id]').forEach(b => b.style.display = '');
    return;
  }

  // При активном поиске — все блоки цехов и категории раскрыты
  container.querySelectorAll('[data-ws-id]').forEach(b => b.classList.add('expanded'));
  groups.forEach(g => {
    g.classList.add('expanded');
    g.style.display = '';  // сброс, ниже пересчитаем

    const catName = g.querySelector('.tl-cat-group-name')?.textContent.toLowerCase() || '';
    let visibleInCat = 0;

    g.querySelectorAll('.tl-loss-inline-row').forEach(row => {
      const lossName = row.querySelector('.tl-loss-inline-name')?.textContent.toLowerCase() || '';
      const match = lossName.includes(q) || catName.includes(q);
      row.style.display = match ? '' : 'none';
      if (match) visibleInCat++;
    });

    // Если название категории совпало — показываем все её потери
    if (catName.includes(q)) {
      g.querySelectorAll('.tl-loss-inline-row').forEach(row => row.style.display = '');
      g.style.display = '';
    } else if (visibleInCat === 0) {
      g.style.display = 'none';
    } else {
      g.style.display = '';
    }
  });

  // Скрываем блоки цехов, в которых не видно категорий
  container.querySelectorAll('[data-ws-id]').forEach(block => {
    const visibleCats = [...block.querySelectorAll('.tl-cat-group')].filter(c => c.style.display !== 'none');
    block.style.display = visibleCats.length > 0 ? '' : 'none';
  });

}

/* Склонение: 1 потеря / 2 потери / 5 потерь */
function pluralizeLosses(n) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return 'потеря';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return 'потери';
  return 'потерь';
}
/* Склонение: 1 машина / 2 машины / 5 машин */
function pluralizeMachines(n) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return 'машина';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return 'машины';
  return 'машин';
}

/* Удалить машину из линии */
window.removeMachineFromLine = function(line, machine) {
  const usedCount = getStandards().filter(s => s.line === line && s.machine === machine).length;

  let msg = `Удалить машину "${machine}" с линии ${line}?`;
  if (usedCount > 0) {
    msg += `\n\n⚠ Внимание: эта машина используется в ${usedCount} стандарт(ах).\n` +
           `Машина пропадёт из выпадающего списка, но у существующих стандартов останется.\n` +
           `Их нужно будет перезаписать вручную.`;
  }
  if (!confirm(msg)) return;

  const lm = getLineMachines();
  if (!Array.isArray(lm[line])) return;

  lm[line] = lm[line].filter(m => m !== machine);
  setLineMachines(lm);

  // Обновляем обе модалки и список
  renderMachinesListContent(line);
  renderLineMachinesSettings();
  showToast('Машина удалена');
};


/* ============================================================
   TOP LOSSES — модалки: потеря
   ============================================================ */

  function openTopLossItemModal(catId, itemId) {
    const modal = $('#topLossItemModal');
    const title = $('#topLossItemModalTitle');
    const saveBtn = $('#topLossItemModalSave');
    if (!modal) return;

    const cats = getTopLosses();
    const cat = cats.find(c => c.id === catId);
    if (!cat) return;

    $('#topLossItemModalCategoryId').value = catId;
    $('#topLossItemModalCategoryLabel').textContent = 'Категория: ' + (cat.name || '—') +
      (cat.workshop ? ' · ' + getWorkshopName(cat.workshop) : '');

    if (itemId) {
      const item = (cat.items || []).find(i => i.id === itemId);
      if (!item) return;
      title.textContent = 'Изменить потерю';
      saveBtn.textContent = 'Сохранить';
      $('#topLossItemModalId').value = itemId;
      $('#topLossItemModalName').value = item.name || '';
    } else {
      title.textContent = 'Добавить потерю';
      saveBtn.textContent = 'Добавить';
      $('#topLossItemModalId').value = '';
      $('#topLossItemModalName').value = '';
    }

    openModal(modal);
    setTimeout(() => $('#topLossItemModalName').focus(), 100);
  }
window.openTopLossItemModal = openTopLossItemModal;

function closeTopLossItemModal() {
  closeModal('#topLossItemModal');
}

$('#topLossItemModalClose')?.addEventListener('click', closeTopLossItemModal);
$('#topLossItemModalCancel')?.addEventListener('click', closeTopLossItemModal);
$('#topLossItemModal')?.addEventListener('click', (e) => {
  if (e.target.id === 'topLossItemModal') closeTopLossItemModal();
});

$('#topLossItemModalName')?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    $('#topLossItemModalSave')?.click();
  }
});

$('#topLossItemModalSave')?.addEventListener('click', () => {
  const catId = $('#topLossItemModalCategoryId').value;
  const itemId = $('#topLossItemModalId').value;
  const name = ($('#topLossItemModalName').value || '').trim();
  if (!catId) return;
  if (!name) return showToast('Введите название потери', true);

  const cats = getTopLosses();
  const cat = cats.find(c => c.id === catId);
  if (!cat) return;
  if (!Array.isArray(cat.items)) cat.items = [];

  // Проверка дубликата в этой категории
  const dup = cat.items.find(i => i.id !== itemId && i.name.toLowerCase() === name.toLowerCase());
  if (dup) return showToast('Такая потеря уже есть в этой категории', true);

  if (itemId) {
    const item = cat.items.find(i => i.id === itemId);
    if (!item) return;
    item.name = name;
    delete item.workshop;
  } else {
    cat.items.push({ id: makeLossId(name), name });
  }

  setTopLosses(cats);
  renderTopLossesSettings();

  closeTopLossItemModal();
  showToast(itemId ? 'Потеря обновлена' : 'Потеря добавлена');
});

/* Удалить потерю */
window.deleteTopLossItem = function(catId, itemId) {
  const cats = getTopLosses();
  const cat = cats.find(c => c.id === catId);
  if (!cat) return;
  const item = (cat.items || []).find(i => i.id === itemId);
  if (!item) return;

  if (!confirm(`Удалить потерю "${item.name}"?`)) return;

  cat.items = cat.items.filter(i => i.id !== itemId);
  setTopLosses(cats);

  // Перерисовываем список категорий
  renderTopLossesSettings();
  showToast('Потеря удалена');
};

window.deleteOperator = function(name) {
  if (!confirm('Удалить оператора "' + name + '"?')) return;
  setOperators(getOperators().filter(o => o !== name));
  renderOperatorsSettings();
  showToast('Оператор удалён');
};


window.deleteBrand = function(name) {
  if (!confirm('Удалить бренд "' + name + '"? Он пропадёт со всех линий.')) return;

  const brands = getBrands();
  const idx = brands.findIndex(b => b === name);
  if (idx === -1) return;

  brands.splice(idx, 1);
  setBrands(brands);

  // Убираем бренд со всех линий
  const lb = getLineBrands();
  Object.keys(lb).forEach(line => {
    lb[line] = lb[line].filter(b => b !== name);
  });
  setLineBrands(lb);

  renderBrandsSettings();
  renderLineBrandsSettings();
  fillLinesForOperator();
  showToast('Бренд удалён');
};

/* ============================================================
   БРЕНДЫ ДЛЯ ЛИНИЙ — список линий + модалка
   ============================================================ */
let currentEditingLine = null;

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
  const headerRow = ws.getRow(1);
  headerRow.height = 30;
  headerRow.eachCell((cell) => {
    cell.font = { name: 'Calibri', size: 13, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0A4FA8' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });

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
  if (result.added > 0)   html += `<li>✅ Добавлено стандартов: <strong>${result.added}</strong></li>`;
  if (result.pointsImported > 0) html += `<li>✅ Загружено точек: <strong>${result.pointsImported}</strong></li>`;
  if (result.skipped > 0) html += `<li>⚠️ Пропущено (дубликаты OPL №): <strong>${result.skipped}</strong></li>`;
  if (result.empty > 0)   html += `<li>⚪ Пустых строк: ${result.empty}</li>`;
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
    html += '<div style="margin-top:8px"><strong>Дубликаты OPL №:</strong> ';
    html += result.duplicates.slice(0, 10).map(d => `<code>${escapeHtml(d)}</code>`).join(', ');
    if (result.duplicates.length > 10) html += ` и ещё ${result.duplicates.length - 10}...`;
    html += '</div>';
  }

  if (result.errors.length > 0) {
    html += '<div style="margin-top:8px"><strong>Строки с ошибками:</strong><ul>';
    result.errors.slice(0, 10).forEach(e => {
      html += `<li>Строка ${e.row}: ${escapeHtml(e.message)}</li>`;
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
