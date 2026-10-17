/* ============================================================
   КОМПОНЕНТЫ: выбор линии
   #linePickerModal.
   Модуль общего пространства имён: функции и переменные видны
   во всех файлах. Порядок подключения — index.html.
   ============================================================ */

/* ============================================================
   ВЫБОР ЛИНИИ — компактный dropdown (#linePickerModal)
   ============================================================ */

const linePickerState = {
  workshopId: null,
  areaId: null,
  blockId: null
};

function resetLinePickerState() {
  linePickerState.workshopId = null;
  linePickerState.areaId = null;
  linePickerState.blockId = null;
}

/* --- Открытие / закрытие --- */
function openLinePickerModal() {
  const modal = $('#linePickerModal');
  if (!modal) return;

  const search = $('#linePickerSearch');
  if (search) search.value = '';

  resetLinePickerState();
  renderLinePickerModal('');
  openModal(modal);
  setTimeout(() => { if (search) search.focus(); }, 100);
}

function closeLinePickerModal() {
  closeModal('#linePickerModal');
  resetLinePickerState();
}

/* --- Главный рендер --- */
function renderLinePickerModal(query = '') {
  const body = $('#linePickerBody');
  if (!body) return;

  const q = String(query || '').trim().toLowerCase();

  // 1) Поиск — плоский список найденных линий
  if (q) {
    renderLinePickerSearch(q, body);
    return;
  }

  // 2) Есть выбранный цех — рендерим его содержимое
  if (linePickerState.workshopId) {
    renderLinePickerWorkshopView(body);
    return;
  }

  // 3) Стартовый экран — плитки цехов
  renderLinePickerStart(body);
}

/* --- Стартовый экран: недавние + плитки цехов --- */
function renderLinePickerStart(body) {
  let html = renderLinePickerRecent();

  const workshops = getWorkshops();
  if (!workshops.length) {
    html += '<div class="line-picker-empty">Цехов нет. Добавьте их в Настройках.</div>';
    body.innerHTML = html;
    bindLinePickerEvents(body);
    return;
  }

  const allLines = getAllLinesWithContext();

  html += '<div class="line-picker-tiles">';
  workshops.forEach(w => {
    const count = allLines.filter(x => x.workshopId === w.id).length;
    const sub = count > 0 ? `${count} ${pluralizeLines(count)}` : 'нет линий';

    html += `
      <button type="button" class="line-picker-tile" data-workshop-id="${escapeAttr(w.id)}">
        <span class="line-picker-tile-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            <line x1="3" y1="9" x2="21" y2="9"/>
            <line x1="9" y1="21" x2="9" y2="9"/>
          </svg>
        </span>
        <span class="line-picker-tile-info">
          <span class="line-picker-tile-name">${escapeHtml(w.name)}</span>
          <span class="line-picker-tile-sub">${sub}</span>
        </span>
      </button>
    `;
  });
  html += '</div>';

  body.innerHTML = html;
  bindLinePickerEvents(body);
}

/* --- Экран внутри цеха --- */
function renderLinePickerWorkshopView(body) {
  const w = getWorkshop(linePickerState.workshopId);
  if (!w) {
    resetLinePickerState();
    renderLinePickerStart(body);
    return;
  }

  const area = linePickerState.areaId
    ? (w.areas || []).find(a => a.id === linePickerState.areaId)
    : null;

  const block = (area && linePickerState.blockId && Array.isArray(area.blocks))
    ? area.blocks.find(b => b.id === linePickerState.blockId)
    : null;

  let html = renderLinePickerRecent();
  html += renderLinePickerBreadcrumbs(w, area, block);

  if (block) {
    html += renderLinePickerRowsForBlock(block, w, area);
  } else if (area) {
    if (Array.isArray(area.blocks) && area.blocks.length) {
      html += renderLinePickerBlockTiles(area, w);
    } else {
      html += renderLinePickerRowsForArea(area, w);
    }
  } else {
    html += renderLinePickerAreaTiles(w);
  }

  body.innerHTML = html;
  bindLinePickerEvents(body);
}

/* --- Недавние --- */
function renderLinePickerRecent() {
  const recent = getRecentLines();
  if (!recent.length) return '';

  return `
    <div class="line-picker-recent">
      <div class="line-picker-recent-label">Недавние</div>
      <div class="line-picker-recent-chips">
        ${recent.map(line => `
          <button type="button" class="line-picker-recent-chip" data-line="${escapeAttr(line)}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
            ${escapeHtml(line)}
          </button>
        `).join('')}
      </div>
    </div>
  `;
}

/* --- Крошки внутри модалки --- */
function renderLinePickerBreadcrumbs(w, area, block) {
  const crumbs = [];
  crumbs.push(`<button type="button" class="line-picker-crumb" data-crumb="root">Цеха</button>`);

  if (w) {
    if (area && block) {
      crumbs.push(`<button type="button" class="line-picker-crumb" data-crumb="workshop" data-workshop-id="${escapeAttr(w.id)}">${escapeHtml(w.name)}</button>`);
      crumbs.push(`<button type="button" class="line-picker-crumb" data-crumb="area" data-workshop-id="${escapeAttr(w.id)}" data-area-id="${escapeAttr(area.id)}">${escapeHtml(area.name)}</button>`);
      crumbs.push(`<span class="line-picker-crumb-current">${escapeHtml(block.name)}</span>`);
    } else if (area) {
      crumbs.push(`<button type="button" class="line-picker-crumb" data-crumb="workshop" data-workshop-id="${escapeAttr(w.id)}">${escapeHtml(w.name)}</button>`);
      crumbs.push(`<span class="line-picker-crumb-current">${escapeHtml(area.name)}</span>`);
    } else {
      crumbs.push(`<span class="line-picker-crumb-current">${escapeHtml(w.name)}</span>`);
    }
  }

  return `<div class="line-picker-breadcrumbs">${crumbs.join('<span class="line-picker-crumb-sep">›</span>')}</div>`;
}

/* --- Плитки участков --- */
function renderLinePickerAreaTiles(w) {
  const areas = (w.areas || []);
  if (!areas.length) {
    return '<div class="line-picker-empty">В этом цехе нет участков</div>';
  }

  let html = '<div class="line-picker-tiles">';
  areas.forEach(a => {
    let count = 0;
    if (Array.isArray(a.blocks)) {
      a.blocks.forEach(b => { count += (b.lines || []).length; });
    } else {
      count = (a.lines || []).length;
    }
    const sub = count > 0 ? `${count} ${pluralizeLines(count)}` : 'нет линий';

    html += `
      <button type="button" class="line-picker-tile" data-workshop-id="${escapeAttr(w.id)}" data-area-id="${escapeAttr(a.id)}">
        <span class="line-picker-tile-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
        </span>
        <span class="line-picker-tile-info">
          <span class="line-picker-tile-name">${escapeHtml(a.name)}</span>
          <span class="line-picker-tile-sub">${sub}</span>
        </span>
      </button>
    `;
  });
  html += '</div>';
  return html;
}

/* --- Плитки блоков --- */
function renderLinePickerBlockTiles(area, w) {
  const blocks = area.blocks || [];
  if (!blocks.length) {
    return '<div class="line-picker-empty">В этом участке нет блоков</div>';
  }

  let html = '<div class="line-picker-tiles">';
  blocks.forEach(b => {
    const count = (b.lines || []).length;
    const sub = count > 0 ? `${count} ${pluralizeLines(count)}` : 'нет линий';

    html += `
      <button type="button" class="line-picker-tile" data-workshop-id="${escapeAttr(w.id)}" data-area-id="${escapeAttr(area.id)}" data-block-id="${escapeAttr(b.id)}">
        <span class="line-picker-tile-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
          </svg>
        </span>
        <span class="line-picker-tile-info">
          <span class="line-picker-tile-name">${escapeHtml(b.name)}</span>
          <span class="line-picker-tile-sub">${sub}</span>
        </span>
      </button>
    `;
  });
  html += '</div>';
  return html;
}

/* --- Строки линий участка (без блоков) --- */
function renderLinePickerRowsForArea(area, w) {
  const lines = (area.lines || []).filter(Boolean);
  if (!lines.length) {
    return '<div class="line-picker-empty">В этом участке нет линий</div>';
  }

  const ctx = `${w.name} / ${area.name}`;
  return '<div class="line-picker-rows">' + lines.map(line => `
    <button type="button" class="line-picker-row" data-line="${escapeAttr(line)}">
      <span class="line-picker-row-line">${escapeHtml(line)}</span>
      <span class="line-picker-row-context">${escapeHtml(ctx)}</span>
    </button>
  `).join('') + '</div>';
}

/* --- Строки линий блока --- */
function renderLinePickerRowsForBlock(block, w, area) {
  const lines = (block.lines || []).filter(Boolean);
  if (!lines.length) {
    return '<div class="line-picker-empty">В этом блоке нет линий</div>';
  }

  const ctx = `${w.name} / ${area.name} / ${block.name}`;
  return '<div class="line-picker-rows">' + lines.map(line => `
    <button type="button" class="line-picker-row" data-line="${escapeAttr(line)}">
      <span class="line-picker-row-line">${escapeHtml(line)}</span>
      <span class="line-picker-row-context">${escapeHtml(ctx)}</span>
    </button>
  `).join('') + '</div>';
}

/* --- Результаты поиска --- */
function renderLinePickerSearch(q, body) {
  const all = getAllLinesWithContext();
  const filtered = all.filter(x => String(x.line).toLowerCase().includes(q));

  let html = renderLinePickerRecent();

  if (!filtered.length) {
    html += `<div class="line-picker-empty">Ничего не найдено по запросу «${escapeHtml(q)}»</div>`;
    body.innerHTML = html;
    bindLinePickerEvents(body);
    return;
  }

  filtered.sort((a, b) => {
    const w = (a.workshopName || '').localeCompare(b.workshopName || '', 'ru');
    if (w !== 0) return w;
    const ar = (a.areaName || '').localeCompare(b.areaName || '', 'ru');
    if (ar !== 0) return ar;
    const bl = (a.blockName || '').localeCompare(b.blockName || '', 'ru');
    if (bl !== 0) return bl;
    return String(a.line).localeCompare(String(b.line), 'ru');
  });

  html += '<div class="line-picker-rows">';
  filtered.forEach(x => {
    const ctx = [x.workshopName, x.areaName, x.blockName].filter(Boolean).join(' / ');
    html += `
      <button type="button" class="line-picker-row" data-line="${escapeAttr(x.line)}">
        <span class="line-picker-row-line">${escapeHtml(x.line)}</span>
        <span class="line-picker-row-context">${escapeHtml(ctx)}</span>
      </button>
    `;
  });
  html += '</div>';

  body.innerHTML = html;
  bindLinePickerEvents(body);
}

/* --- Привязка обработчиков --- */
function bindLinePickerEvents(container) {
  // Недавние
  container.querySelectorAll('.line-picker-recent-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const line = chip.dataset.line;
      if (line) selectLine(line);
    });
  });

  // Плитки
  container.querySelectorAll('.line-picker-tile').forEach(tile => {
    tile.addEventListener('click', () => {
      const wId = tile.dataset.workshopId;
      const aId = tile.dataset.areaId || null;
      const bId = tile.dataset.blockId || null;
      if (!wId) return;
      linePickerState.workshopId = wId;
      linePickerState.areaId = aId;
      linePickerState.blockId = bId;
      renderLinePickerModal('');
    });
  });

  // Крошки
  container.querySelectorAll('.line-picker-crumb').forEach(crumb => {
    crumb.addEventListener('click', () => {
      const kind = crumb.dataset.crumb;
      if (kind === 'root') resetLinePickerState();
      else if (kind === 'workshop') { linePickerState.areaId = null; linePickerState.blockId = null; }
      else if (kind === 'area') { linePickerState.blockId = null; }
      renderLinePickerModal('');
    });
  });

  // Строки
  container.querySelectorAll('.line-picker-row').forEach(row => {
    row.addEventListener('click', () => {
      const line = row.dataset.line;
      if (line) selectLine(line);
    });
  });
}
