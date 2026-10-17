/* ============================================================
   НАСТРОЙКИ: бренды линий
   Модуль общего пространства имён: функции и переменные видны
   во всех файлах. Порядок подключения — index.html.
   ============================================================ */

/* ============================================================
   БРЕНДЫ ДЛЯ ЛИНИЙ — аккордеон по блокам + строки + поиск
   ============================================================ */

const LB_OPEN_BLOCKS_KEY = 'cl_lb_open_blocks';

/* Открытые блоки */
function getLbOpenBlocks() {
  try {
    const raw = localStorage.getItem(LB_OPEN_BLOCKS_KEY);
    const arr = raw ? JSON.parse(raw) : null;
    return Array.isArray(arr) ? arr : null;
  } catch (e) { return null; }
}

function setLbOpenBlocks(arr) {
  try { localStorage.setItem(LB_OPEN_BLOCKS_KEY, JSON.stringify(arr)); } catch (e) {}
}

function renderLineBrandsSettings() {
  const container = $('#lineBrandsContainer');
  if (!container) return;

  const lines = getLines();
  const brands = getBrands();
  const lb = getLineBrands();

  if (!lines.length) {
    container.innerHTML = '<div class="empty-state">Сначала добавьте линии</div>';
    return;
  }
  if (!brands.length) {
    container.innerHTML = '<div class="empty-state">Сначала добавьте бренды</div>';
    return;
  }

  const allLinesCtx = getAllLinesWithContext();
  const workshops = getWorkshops();

  // --- Тулбар ---
  let html = `
    <div class="lb-toolbar">
      <div class="lb-search-wrap">
        <svg class="lb-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8"/>
          <line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input type="text" id="lbSearchInput" placeholder="Поиск по линии или бренду..." autocomplete="off">
        <button type="button" class="lb-search-clear" id="lbSearchClear" title="Очистить" style="display:none">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      <button type="button" class="btn btn-secondary btn-sm lb-toggle-all-btn" id="lbToggleAllBtn" title="Развернуть или свернуть все блоки">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" id="lbToggleAllIcon">
          <polyline points="7 13 12 18 17 13"/>
          <polyline points="7 6 12 11 17 6"/>
        </svg>
        <span id="lbToggleAllLabel">Развернуть всё</span>
      </button>

      <span class="lb-counter">Всего линий: <strong>${lines.length}</strong></span>
    </div>
  `;

  html += '<div class="lb-groups">';

  let openIds = getLbOpenBlocks();
  if (openIds === null) {
    openIds = [];
    setLbOpenBlocks(openIds);
  }
  const isOpen = (id) => openIds.includes(id);

  workshops.forEach(workshop => {
    const workshopLines = allLinesCtx.filter(x => x.workshopId === workshop.id);

    // Если у цеха вообще нет участков — пропускаем
    const hasAnyAreas = (workshop.areas || []).length > 0;
    if (!hasAnyAreas) return;

    const workshopId = 'ws:' + workshop.id;
    const workshopOpen = isOpen(workshopId);

    // Уникальные бренды в цехе
    const workshopBrands = new Set();
    workshopLines.forEach(x => {
      (Array.isArray(lb[x.line]) ? lb[x.line] : []).forEach(b => workshopBrands.add(b));
    });

    html += `
      <div class="lb-group lb-group-workshop ${workshopOpen ? 'expanded' : ''}" data-group-id="${escapeAttr(workshopId)}">
        <div class="lb-group-head" data-group-toggle="${escapeAttr(workshopId)}">
          <span class="lb-group-toggle">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </span>
          <span class="lb-group-name">${escapeHtml(workshop.name)}</span>
          <span class="lb-group-count">
            ${workshopLines.length} ${pluralizeLines(workshopLines.length)}
            · ${workshopBrands.size} ${pluralizeBrandsShort(workshopBrands.size)}
          </span>
        </div>
        <div class="lb-group-body">
    `;

    if (!workshopLines.length) {
      html += `
        <div class="lb-group-empty">
          У цеха пока нет линий. Добавьте их через структуру производства.
        </div>
      `;
      html += `</div></div>`;
      return;
    }

    (workshop.areas || []).forEach(area => {
      const areaLines = allLinesCtx.filter(x =>
        x.workshopId === workshop.id && x.areaId === area.id
      );
      if (!areaLines.length) return;

      const areaId = 'ar:' + area.id;
      const areaOpen = isOpen(areaId);

      const areaBrands = new Set();
      areaLines.forEach(x => {
        (Array.isArray(lb[x.line]) ? lb[x.line] : []).forEach(b => areaBrands.add(b));
      });

      html += `
        <div class="lb-group lb-group-area ${areaOpen ? 'expanded' : ''}" data-group-id="${escapeAttr(areaId)}">
          <div class="lb-group-head lb-group-area-head" data-group-toggle="${escapeAttr(areaId)}">
            <span class="lb-group-toggle">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </span>
            <span class="lb-group-name">${escapeHtml(area.name)}</span>
            <span class="lb-group-count">
              ${areaLines.length} ${pluralizeLines(areaLines.length)}
              · ${areaBrands.size} ${pluralizeBrandsShort(areaBrands.size)}
            </span>
          </div>
          <div class="lb-group-body">
      `;

      if (Array.isArray(area.blocks) && area.blocks.length) {
        area.blocks.forEach(block => {
          const blockLines = areaLines.filter(x => x.blockId === block.id);
          if (!blockLines.length) return;

          const blockBrands = new Set();
          blockLines.forEach(x => {
            (Array.isArray(lb[x.line]) ? lb[x.line] : []).forEach(b => blockBrands.add(b));
          });

          html += `
            <div class="lb-block-head">
              <span class="lb-block-name">${escapeHtml(block.name)}</span>
              <span class="lb-block-count">${blockLines.length} ${pluralizeLines(blockLines.length)} · ${blockBrands.size} ${pluralizeBrandsShort(blockBrands.size)}</span>
            </div>
          `;

          blockLines.forEach(x => {
            html += renderLbLineRow(x.line, lb);
          });
        });
      } else {
        areaLines.forEach(x => {
          html += renderLbLineRow(x.line, lb);
        });
      }

      html += `</div></div>`; // закрываем участок
    });

    html += `</div></div>`; // закрываем цех
  });

  html += '</div>';

  container.innerHTML = html;

  // Обработчики: аккордеон
  container.querySelectorAll('[data-group-toggle]').forEach(head => {
    head.addEventListener('click', () => {
      const groupId = head.dataset.groupToggle;
      let open = getLbOpenBlocks() || [];
      if (open.includes(groupId)) {
        open = open.filter(id => id !== groupId);
      } else {
        open.push(groupId);
      }
      setLbOpenBlocks(open);
      renderLineBrandsSettings();
    });
  });

  // Обработчики: строки
  container.querySelectorAll('.lb-row').forEach(row => {
    row.addEventListener('click', (e) => {
      if (e.target.closest('.lb-row-btn')) return;
      const line = row.dataset.line;
      if (line) openLineBrandsModal(line);
    });
  });
  container.querySelectorAll('.lb-row-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const row = btn.closest('.lb-row');
      if (!row) return;
      const line = row.dataset.line;
      if (line) openLineBrandsModal(line);
    });
  });

  // Кнопка "Развернуть всё"
  updateLbToggleAllBtnMultiLevel();
  const toggleAllBtn = $('#lbToggleAllBtn');
  if (toggleAllBtn) {
    toggleAllBtn.addEventListener('click', () => {
      const open = getLbOpenBlocks() || [];
      const allIds = collectAllLbGroupIds();
      const allExpanded = allIds.length > 0 && allIds.every(id => open.includes(id));

      if (allExpanded) {
        setLbOpenBlocks([]);
      } else {
        setLbOpenBlocks(allIds);
      }
      renderLineBrandsSettings();
    });
  }

  // Поиск
  const searchInput = $('#lbSearchInput');
  const searchClear = $('#lbSearchClear');
  if (searchInput) {
    const savedQuery = sessionStorage.getItem('lb_search_query') || '';
    if (savedQuery) {
      searchInput.value = savedQuery;
      if (searchClear) searchClear.style.display = 'inline-flex';
      applyLbSearch(savedQuery);
    }

    searchInput.addEventListener('input', () => {
      const q = searchInput.value.trim();
      sessionStorage.setItem('lb_search_query', q);
      if (searchClear) searchClear.style.display = q ? 'inline-flex' : 'none';
      applyLbSearch(q);
    });
  }

  if (searchClear) {
    searchClear.addEventListener('click', () => {
      if (searchInput) searchInput.value = '';
      sessionStorage.removeItem('lb_search_query');
      searchClear.style.display = 'none';
      applyLbSearch('');
      if (searchInput) searchInput.focus();
    });
  }
}

/* Строка линии внутри брендов */
function renderLbLineRow(line, lb) {
  const assigned = Array.isArray(lb[line]) ? lb[line] : [];
  const count = assigned.length;

  const brandsText = count === 0
    ? '<span class="lb-row-empty">нет брендов — нажмите, чтобы задать</span>'
    : `<span class="lb-row-brands" title="${escapeAttr(assigned.join(', '))}">${escapeHtml(assigned.join(', '))}</span>`;

  const countBadge = count === 0
    ? '<span class="lb-row-count lb-row-count-empty">0</span>'
    : `<span class="lb-row-count">${count}</span>`;

  return `
    <div class="lb-row" data-line="${escapeAttr(line)}" data-brands="${escapeAttr(assigned.join(' ').toLowerCase())}">
      <div class="lb-row-line">${escapeHtml(line)}</div>
      <div class="lb-row-count-wrap">${countBadge}</div>
      <div class="lb-row-brands-wrap">${brandsText}</div>
      <button class="btn btn-primary btn-sm lb-row-btn" type="button">
        Настроить →
      </button>
    </div>
  `;
}

/* Собрать все id для кнопки "Развернуть всё" */
function collectAllLbGroupIds() {
  const ids = [];
  getWorkshops().forEach(w => {
    ids.push('ws:' + w.id);
    (w.areas || []).forEach(a => {
      ids.push('ar:' + a.id);
    });
  });
  return ids;
}

/* Обновить кнопку "Развернуть всё" */
function updateLbToggleAllBtnMultiLevel() {
  const btn = $('#lbToggleAllBtn');
  const label = $('#lbToggleAllLabel');
  const icon = $('#lbToggleAllIcon');
  if (!btn || !label || !icon) return;

  const open = getLbOpenBlocks() || [];
  const allIds = collectAllLbGroupIds();
  const allExpanded = allIds.length > 0 && allIds.every(id => open.includes(id));

  if (allExpanded) {
    label.textContent = 'Свернуть всё';
    btn.title = 'Свернуть все блоки';
    icon.innerHTML = `
      <polyline points="17 11 12 6 7 11"/>
      <polyline points="17 18 12 13 7 18"/>
    `;
  } else {
    label.textContent = 'Развернуть всё';
    btn.title = 'Развернуть все блоки';
    icon.innerHTML = `
      <polyline points="7 13 12 18 17 13"/>
      <polyline points="7 6 12 11 17 6"/>
    `;
  }
}

/* Поиск по линиям и брендам */
function applyLbSearch(query) {
  const container = $('#lineBrandsContainer');
  if (!container) return;

  const q = (query || '').trim().toLowerCase();
  const groups = container.querySelectorAll('.lb-group');

  if (!q) {
    const openBlocks = getLbOpenBlocks() || [];
    groups.forEach(g => {
      g.style.display = '';
      g.classList.toggle('expanded', openBlocks.includes(g.dataset.groupId));
    });
    container.querySelectorAll('.lb-row').forEach(r => r.style.display = '');
    return;
  }

  // При активном поиске — все блоки раскрыты
  groups.forEach(g => {
    g.classList.add('expanded');

    let visibleInGroup = 0;
    g.querySelectorAll('.lb-row').forEach(row => {
      const line = (row.dataset.line || '').toLowerCase();
      const brands = (row.dataset.brands || '').toLowerCase();
      const match = line.includes(q) || brands.includes(q);
      row.style.display = match ? '' : 'none';
      if (match) visibleInGroup++;
    });

    g.style.display = visibleInGroup > 0 ? '' : 'none';
  });
}

/* Склонение: 1 бренд / 2 бренда / 5 брендов */
function pluralizeBrandsShort(n) {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return 'бренд';
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return 'бренда';
  return 'брендов';
}
/* --- Открыть модалку для линии --- */
window.openLineBrandsModal = function(line) {
  currentEditingLine = line;
  const title = $('#lineBrandsModalTitle');
  if (title) title.textContent = 'Бренды линии ' + line;

  const search = $('#lineBrandsSearch');
  if (search) search.value = '';

  renderLineBrandsChecklist();

  openModal('#lineBrandsModal');

  setTimeout(() => { if (search) search.focus(); }, 100);
};

function closeLineBrandsModal() {
  closeModal('#lineBrandsModal');
  currentEditingLine = null;
  renderLineBrandsSettings();
}

/* --- Отрисовка списка брендов внутри модалки --- */
function renderLineBrandsChecklist() {
  const checklist = $('#lineBrandsChecklist');
  if (!checklist || !currentEditingLine) return;

  const allBrands = getBrands().slice().sort((a, b) => a.localeCompare(b, 'ru'));
  const query = ($('#lineBrandsSearch')?.value || '').trim().toLowerCase();
  const lb = getLineBrands();
  const assigned = Array.isArray(lb[currentEditingLine]) ? lb[currentEditingLine] : [];

  // Фильтрация
  let filtered = allBrands;
  if (query) {
    filtered = allBrands.filter(b => b.toLowerCase().includes(query));
  }

  // Счётчик
  const counter = $('#lineBrandsCounter');
  if (counter) {
    const total = allBrands.length;
    const selected = assigned.length;
    counter.textContent = `Выбрано: ${selected} из ${total}`;
  }

  if (!filtered.length) {
    checklist.innerHTML = '<div class="empty-state">Ничего не найдено</div>';
    return;
  }

  // Сортируем: сначала выбранные, потом остальные
  const selectedFirst = [
    ...filtered.filter(b => assigned.includes(b)),
    ...filtered.filter(b => !assigned.includes(b))
  ];

  checklist.innerHTML = selectedFirst.map(b => {
    const checked = assigned.includes(b);
    return `
      <label class="brand-check-row ${checked ? 'checked' : ''}">
        <input type="checkbox" data-brand="${escapeHtml(b)}" ${checked ? 'checked' : ''}>
        <span>${escapeHtml(b)}</span>
      </label>
    `;
  }).join('');

  // Обработчики
  checklist.querySelectorAll('input[data-brand]').forEach(cb => {
    cb.addEventListener('change', (e) => {
      const brand = e.target.dataset.brand;
      const cur = getLineBrands();
      const line = currentEditingLine;
      if (!line) return;
      if (!Array.isArray(cur[line])) cur[line] = [];

      if (e.target.checked) {
        if (!cur[line].includes(brand)) cur[line].push(brand);
        e.target.closest('label').classList.add('checked');
      } else {
        cur[line] = cur[line].filter(b => b !== brand);
        e.target.closest('label').classList.remove('checked');
      }
      setLineBrands(cur);
      fillLinesForOperator();
      renderLineBrandsChecklist();  // перерисовка для сортировки
    });
  });
}

/* --- Обработчики модалки --- */
$('#lineBrandsModalClose')?.addEventListener('click', closeLineBrandsModal);
$('#lineBrandsDoneBtn')?.addEventListener('click', closeLineBrandsModal);
$('#lineBrandsModal')?.addEventListener('click', (e) => {
  if (e.target.id === 'lineBrandsModal') closeLineBrandsModal();
});

$('#lineBrandsSearch')?.addEventListener('input', () => {
  renderLineBrandsChecklist();
});

$('#lineBrandsClearBtn')?.addEventListener('click', () => {
  if (!currentEditingLine) return;
  if (!confirm('Убрать все бренды с линии ' + currentEditingLine + '?')) return;
  const cur = getLineBrands();
  cur[currentEditingLine] = [];
  setLineBrands(cur);
  fillLinesForOperator();
  renderLineBrandsChecklist();
});
