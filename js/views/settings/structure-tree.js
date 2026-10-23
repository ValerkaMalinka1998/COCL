/* ============================================================
   НАСТРОЙКИ: структура производства — дерево и карточка линии
   Цех → Участок → Блок → Линия. Линия добавляется «+» прямо в
   своём блоке (или в участке без блоков — PMD), поэтому линий
   «без места» больше не бывает. Карточка линии: машины, бренды,
   место в структуре, данные по линии.
   Модуль общего пространства имён: функции и переменные видны
   во всех файлах. Порядок подключения — index.html.
   ============================================================ */

const stState = {
  line: null,        // выбранная линия (карточка справа)
  ws: 'all',         // фильтр цеха
  query: '',         // поиск
  adding: null,      // куда сейчас вводится новая линия: 'b:<blockId>' | 'a:<areaId>' | 'blk:<areaId>'
  moving: false      // открыта панель переноса линии в карточке
};

/* ============================================================ */
/* === ДАННЫЕ ================================================== */
/* ============================================================ */

/* Владелец линий по ключу: 'b:<blockId>' — блок, 'a:<areaId>' — участок без блоков */
function stFindOwner(workshops, key) {
  const [kind, id] = [key.slice(0, key.indexOf(':')), key.slice(key.indexOf(':') + 1)];
  for (const w of workshops) {
    for (const a of (w.areas || [])) {
      if (kind === 'a' && a.id === id) return { workshop: w, area: a, block: null, holder: a };
      if (kind === 'b' && Array.isArray(a.blocks)) {
        const b = a.blocks.find(x => x.id === id);
        if (b) return { workshop: w, area: a, block: b, holder: b };
      }
    }
  }
  return null;
}

/* Убрать линию из всех мест структуры */
function stDetachLine(workshops, line) {
  workshops.forEach(w => (w.areas || []).forEach(a => {
    if (Array.isArray(a.lines)) a.lines = a.lines.filter(l => l !== line);
    (a.blocks || []).forEach(b => { b.lines = (b.lines || []).filter(l => l !== line); });
  }));
}

/* Сколько данных завязано на линию */
function stLineUsage(line) {
  return {
    mech: getStandards().filter(s => s.line === line).length,
    elec: getElectronicParams().filter(p => p.line === line).length,
    history: getHistory().filter(h => h.line === line).length
  };
}

/* Линии, которые есть в данных, но не стоят в структуре */
function stOrphanLines() {
  const inTree = new Set(getLines());
  const found = new Set();
  getStandards().forEach(s => s.line && found.add(s.line));
  getElectronicParams().forEach(p => p.line && found.add(p.line));
  getHistory().forEach(h => h.line && found.add(h.line));
  Object.entries(getLineBrands()).forEach(([l, arr]) => { if (Array.isArray(arr) && arr.length) found.add(l); });
  return [...found].filter(l => !inTree.has(l)).sort((a, b) => a.localeCompare(b, 'ru', { numeric: true }));
}

function stAddLine(ownerKey, raw) {
  const code = (raw || '').trim().replace(/\s+/g, ' ');
  if (!code) { showToast('Введите код линии', true); return false; }
  const exists = getAllLinesWithContext().find(x => x.line.toLowerCase() === code.toLowerCase());
  if (exists) {
    const where = [exists.workshopName, exists.areaName, exists.blockName].filter(Boolean).join(' · ');
    showToast(`Линия ${exists.line} уже есть: ${where}`, true);
    return false;
  }
  const workshops = getWorkshops();
  const owner = stFindOwner(workshops, ownerKey);
  if (!owner) return false;
  if (!Array.isArray(owner.holder.lines)) owner.holder.lines = [];
  owner.holder.lines.push(code);
  setWorkshops(workshops);
  stState.line = code;
  stAfterChange();
  showToast(`Линия ${code} добавлена`);
  return true;
}

/* Переместить линию (или разместить линию «вне структуры») */
function stMoveLine(line, ownerKey) {
  const workshops = getWorkshops();
  const owner = stFindOwner(workshops, ownerKey);
  if (!owner) return;
  const target = `${owner.area.name}${owner.block ? ' · ' + owner.block.name : ''}`;
  const ctx = getBlockForLine(line);
  if (ctx) {
    const from = `${ctx.area.name}${ctx.block ? ' · ' + ctx.block.name : ''}`;
    if (!confirm(`Перенести линию ${line}?\n\n${from}  →  ${target}\n\n` +
      'Стандарты, E-Param, машины, бренды и история останутся у линии.')) return;
  }
  stState.moving = false;
  stDetachLine(workshops, line);
  if (!Array.isArray(owner.holder.lines)) owner.holder.lines = [];
  owner.holder.lines.push(line);
  setWorkshops(workshops);
  stAfterChange();
  showToast(`Линия ${line} → ${target}`);
}

function stDeleteLine(line) {
  const u = stLineUsage(line);
  const has = u.mech + u.elec + u.history;
  const msg = has
    ? `Убрать линию ${line} из структуры?\n\nПо ней есть данные: стандартов ${u.mech}, E-Param ${u.elec}, записей истории ${u.history}. ` +
      'Данные останутся, линия появится в группе «Вне структуры» — её можно будет вернуть.'
    : `Удалить линию ${line}?`;
  if (!confirm(msg)) return;
  const workshops = getWorkshops();
  stDetachLine(workshops, line);
  setWorkshops(workshops);
  if (stState.line === line) stState.line = null;
  stAfterChange();
  showToast(`Линия ${line} убрана из структуры`);
}

function stAddBlock(areaId, raw) {
  const name = (raw || '').trim();
  if (!name) { showToast('Введите название блока', true); return false; }
  const workshops = getWorkshops();
  const owner = stFindOwner(workshops, 'a:' + areaId);
  if (!owner) return false;
  if (!Array.isArray(owner.area.blocks)) owner.area.blocks = [];
  if (owner.area.blocks.some(b => (b.name || '').toLowerCase() === name.toLowerCase())) {
    showToast('Блок с таким названием уже есть в участке', true);
    return false;
  }
  owner.area.blocks.push({
    id: 'block_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
    name,
    lines: []
  });
  setWorkshops(workshops);
  stAfterChange();
  showToast('Блок добавлен');
  return true;
}

function stRenameBlock(blockId, name) {
  const workshops = getWorkshops();
  const owner = stFindOwner(workshops, 'b:' + blockId);
  if (!owner) return false;
  if (owner.area.blocks.some(b => b.id !== blockId && (b.name || '').toLowerCase() === name.toLowerCase())) {
    showToast('Блок с таким названием уже есть', true);
    return false;
  }
  owner.block.name = name;
  setWorkshops(workshops);
  stAfterChange();
  showToast('Блок переименован');
  return true;
}

function stDeleteBlock(blockId) {
  const workshops = getWorkshops();
  const owner = stFindOwner(workshops, 'b:' + blockId);
  if (!owner) return;
  if ((owner.block.lines || []).length) {
    return showToast('В блоке есть линии — сначала перенесите их в другой блок', true);
  }
  if (!confirm(`Удалить пустой блок «${owner.block.name}»?`)) return;
  owner.area.blocks = owner.area.blocks.filter(b => b.id !== blockId);
  setWorkshops(workshops);
  stAfterChange();
  showToast('Блок удалён');
}

/* --- Машины линии --- */
function stAddMachine(line, raw) {
  const name = (raw || '').trim();
  if (!name) { showToast('Введите название машины', true); return false; }
  const lm = getLineMachines();
  if (!Array.isArray(lm[line])) lm[line] = [];
  if (lm[line].some(m => m.toLowerCase() === name.toLowerCase())) {
    showToast('Такая машина уже есть на линии', true);
    return false;
  }
  lm[line].push(name);
  setLineMachines(lm);
  stAfterChange();
  return true;
}

function stRenameMachine(line, oldName, newName) {
  const lm = getLineMachines();
  const list = Array.isArray(lm[line]) ? lm[line] : [];
  if (list.some(m => m !== oldName && m.toLowerCase() === newName.toLowerCase())) {
    showToast(`Машина «${newName}» уже есть на линии`, true);
    return false;
  }
  const idx = list.indexOf(oldName);
  if (idx === -1) return false;
  list[idx] = newName;
  lm[line] = list;
  setLineMachines(lm);
  // Стандарты и параметры линии переходят на новое имя
  const all = getStandards();
  let n = 0;
  all.forEach(s => { if (s.line === line && s.machine === oldName) { s.machine = newName; n++; } });
  if (n) setStandards(all);
  const eps = getElectronicParams();
  let m = 0;
  eps.forEach(p => { if (p.line === line && p.machine === oldName) { p.machine = newName; m++; } });
  if (m) setElectronicParams(eps);
  stAfterChange();
  showToast(n + m ? `Машина переименована, обновлено записей: ${n + m}` : 'Машина переименована');
  return true;
}

/* Удалить машину из линии (используется и в других местах) */
window.removeMachineFromLine = function(line, machine) {
  const used = getStandards().filter(s => s.line === line && s.machine === machine).length +
    getElectronicParams().filter(p => p.line === line && p.machine === machine).length;
  let msg = `Удалить машину «${machine}» с линии ${line}?`;
  if (used) {
    msg += `\n\nОна указана в ${used} стандарт(ах)/параметр(ах): у них машина останется, ` +
      'но пропадёт из списка выбора.';
  }
  if (!confirm(msg)) return;
  const lm = getLineMachines();
  if (!Array.isArray(lm[line])) return;
  lm[line] = lm[line].filter(m => m !== machine);
  setLineMachines(lm);
  stAfterChange();
  showToast('Машина удалена');
};

/* --- Бренды линии --- */
function stToggleBrand(line, brand) {
  const lb = getLineBrands();
  const list = Array.isArray(lb[line]) ? lb[line] : [];
  lb[line] = list.includes(brand) ? list.filter(b => b !== brand) : [...list, brand];
  setLineBrands(lb);
  stAfterChange();
  if (typeof renderBrandsSettings === 'function') renderBrandsSettings();
}

/* Новый бренд прямо с карточки линии: в справочник цеха + на линию */
function stAddBrandToLine(line, raw) {
  const name = (raw || '').trim();
  if (!name) { showToast('Введите название бренда', true); return false; }
  const brands = getBrands();
  let brand = brands.find(b => b.toLowerCase() === name.toLowerCase());
  if (!brand) {
    brand = name;
    brands.push(brand);
    setBrands(brands);
    const ws = getWorkshopIdForLine(line);
    if (ws) setBrandWorkshop(brand, ws);
  }
  const lb = getLineBrands();
  const list = Array.isArray(lb[line]) ? lb[line] : [];
  if (!list.includes(brand)) lb[line] = [...list, brand];
  setLineBrands(lb);
  stAfterChange();
  if (typeof renderBrandsSettings === 'function') renderBrandsSettings();
  return true;
}

/* После любого изменения: дерево, карточка, зависящие экраны */
function stAfterChange() {
  renderStructureSettings();
  if (typeof updateSettingsNavCounts === 'function') updateSettingsNavCounts();
  if (typeof fillLinesForOperator === 'function') fillLinesForOperator();
}

/* ============================================================ */
/* === ДЕРЕВО ================================================= */
/* ============================================================ */

function renderStructureSettings() {
  const tree = $('#stTree');
  if (!tree) return;
  const workshops = getWorkshops();
  const q = stState.query.trim().toLowerCase();
  const lm = getLineMachines();
  const lb = getLineBrands();

  // Чипы цехов
  const chips = $('#stWsChips');
  if (chips) {
    const count = (wsId) => getAllLinesWithContext().filter(x => x.workshopId === wsId).length;
    chips.innerHTML = settingsChipsHtml(
      settingsWorkshopChipItems(count, true, getLines().length), stState.ws, 'data-st-ws');
  }

  const lineMatches = (line) => {
    if (!q) return true;
    if (line.toLowerCase().includes(q)) return true;
    return (lm[line] || []).some(m => m.toLowerCase().includes(q));
  };

  const lineChip = (line) => {
    const brands = Array.isArray(lb[line]) ? lb[line].length : 0;
    const machines = Array.isArray(lm[line]) ? lm[line].length : 0;
    const warn = !brands ? ' st-line-warn' : '';
    const title = `${line}: машин ${machines}, брендов ${brands}` + (!brands ? ' — без брендов линия не видна оператору' : '');
    return `<button type="button" class="st-line ${stState.line === line ? 'active' : ''}${warn}" data-st-line="${escapeAttr(line)}" title="${escapeAttr(title)}">
      <span class="st-line-code">${settingsHighlight(line, q)}</span>
      <span class="st-line-meta">${machines}</span>
    </button>`;
  };

  const addSlot = (key, placeholder) => stState.adding === key
    ? `<span class="st-add-inline"><input type="text" class="st-add-input" data-st-add-input="${escapeAttr(key)}" placeholder="${escapeAttr(placeholder)}"></span>`
    : `<button type="button" class="st-add-btn" data-st-add="${escapeAttr(key)}" title="${escapeAttr(placeholder)}">${SETTINGS_ICON_PLUS}</button>`;

  const linesRow = (lines, key) => {
    const shown = lines.filter(lineMatches);
    if (q && !shown.length) return null;
    return `<div class="st-lines">${shown.map(lineChip).join('')}${q ? '' : addSlot(key, 'Код новой линии, Enter')}</div>`;
  };

  let html = '';
  workshops.forEach(w => {
    if (stState.ws !== 'all' && stState.ws !== w.id) return;
    let wsHtml = '';
    let wsLines = 0;
    (w.areas || []).forEach(a => {
      let areaHtml = '';
      if (Array.isArray(a.blocks)) {
        a.blocks.forEach(b => {
          const row = linesRow(b.lines || [], 'b:' + b.id);
          if (row === null) return;
          wsLines += (b.lines || []).length;
          areaHtml += `
            <div class="st-block" data-st-block="${escapeAttr(b.id)}">
              <div class="st-block-head">
                <span class="st-block-name" data-st-block-name="${escapeAttr(b.id)}" title="Нажмите, чтобы переименовать">${escapeHtml(b.name || 'Без названия')}</span>
                <span class="st-count">${(b.lines || []).length}</span>
                <span class="st-row-actions">
                  <button type="button" class="st-icon-btn" data-st-block-rename="${escapeAttr(b.id)}" title="Переименовать блок">${SETTINGS_ICON_EDIT}</button>
                  <button type="button" class="st-icon-btn st-icon-danger" data-st-block-delete="${escapeAttr(b.id)}" title="Удалить пустой блок">${SETTINGS_ICON_DELETE}</button>
                </span>
              </div>
              ${row}
            </div>`;
        });
        if (!q) {
          areaHtml += stState.adding === 'blk:' + a.id
            ? `<div class="st-block st-block-new"><input type="text" class="st-add-input" data-st-add-input="blk:${escapeAttr(a.id)}" placeholder="Название блока, Enter"></div>`
            : `<button type="button" class="st-add-block" data-st-add="blk:${escapeAttr(a.id)}">${SETTINGS_ICON_PLUS}<span>Блок</span></button>`;
        }
      } else {
        const row = linesRow(a.lines || [], 'a:' + a.id);
        if (row !== null) {
          wsLines += (a.lines || []).length;
          areaHtml += `<div class="st-block st-block-flat">${row}</div>`;
        }
      }
      if (q && !areaHtml.includes('data-st-line')) return;
      const areaCount = Array.isArray(a.blocks)
        ? a.blocks.reduce((n, b) => n + (b.lines || []).length, 0)
        : (a.lines || []).length;
      wsHtml += `
        <div class="st-area">
          <div class="st-area-head">
            <span class="st-area-name">${escapeHtml(a.name)}</span>
            <span class="st-count">${areaCount} ${pluralizeLines(areaCount)}</span>
            ${Array.isArray(a.blocks) ? '' : '<span class="st-area-note">без блоков</span>'}
          </div>
          <div class="st-area-body">${areaHtml}</div>
        </div>`;
    });
    if (q && !wsHtml) return;
    html += `
      <div class="st-ws">
        <div class="st-ws-head">
          <span class="st-ws-name">${escapeHtml(w.name)}</span>
          <span class="st-ws-sub">${escapeHtml(w.subtitle || '')}</span>
        </div>
        <div class="st-ws-body">${wsHtml || '<div class="st-empty">Участков нет</div>'}</div>
      </div>`;
  });

  // Линии, которые есть в данных, но не стоят в структуре
  const orphans = stOrphanLines().filter(lineMatches);
  if (orphans.length && stState.ws === 'all') {
    html += `
      <div class="st-ws st-ws-orphans">
        <div class="st-ws-head">
          <span class="st-ws-name">Вне структуры</span>
          <span class="st-ws-sub">есть данные, но нет места — откройте линию и выберите блок</span>
        </div>
        <div class="st-ws-body"><div class="st-lines">${orphans.map(lineChip).join('')}</div></div>
      </div>`;
  }

  tree.innerHTML = html || `<div class="st-empty">Ничего не найдено по «${escapeHtml(stState.query)}»</div>`;

  const input = tree.querySelector('[data-st-add-input]');
  if (input) input.focus();

  renderStructureLineCard();
}

/* ============================================================ */
/* === КАРТОЧКА ЛИНИИ ========================================= */
/* ============================================================ */

function renderStructureLineCard() {
  const card = $('#stLineCard');
  if (!card) return;
  const line = stState.line;
  if (!line) {
    card.innerHTML = `
      <div class="st-card-empty">
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><path d="M7 10v4a2 2 0 0 0 2 2h5"/></svg>
        <div>Выберите линию в дереве — здесь появятся её машины, бренды и место в структуре.</div>
      </div>`;
    return;
  }

  const ctx = getBlockForLine(line);
  const wsId = ctx ? ctx.workshop.id : null;
  const u = stLineUsage(line);
  const machines = getLineMachines()[line] || [];
  const lineBrands = getLineBrands()[line] || [];

  // Куда можно перенести: блоки (или участки без блоков) того же цеха, кроме текущего;
  // для линии вне структуры — места всех цехов
  const placeGroups = [];
  getWorkshops().forEach(w => {
    if (wsId && w.id !== wsId) return;
    const items = [];
    (w.areas || []).forEach(a => {
      if (Array.isArray(a.blocks)) {
        a.blocks.forEach(b => {
          if (!(ctx && ctx.block && ctx.block.id === b.id)) items.push({ key: 'b:' + b.id, label: `${a.name} · ${b.name}` });
        });
      } else if (!(ctx && !ctx.block && ctx.area.id === a.id)) {
        items.push({ key: 'a:' + a.id, label: a.name });
      }
    });
    if (items.length) placeGroups.push({ ws: w.name, items });
  });
  const placeOptions = placeGroups.map(g => `<optgroup label="${escapeAttr(g.ws)}">${
    g.items.map(p => `<option value="${escapeAttr(p.key)}">${escapeHtml(p.label)}</option>`).join('')}</optgroup>`).join('');
  const showMover = !ctx || stState.moving;

  // Бренды: свои цеха + без цеха + уже выбранные из чужих цехов
  const allBrands = getBrands().slice().sort((a, b) => a.localeCompare(b, 'ru'));
  const offer = allBrands.filter(b => {
    const bw = getBrandWorkshop(b);
    return lineBrands.includes(b) || !bw || !wsId || bw === wsId;
  });

  const crumbs = ctx
    ? [ctx.workshop.name, ctx.area.name, ctx.block ? ctx.block.name : ''].filter(Boolean).join(' › ')
    : 'Вне структуры';

  card.innerHTML = `
    <div class="st-lc-head">
      <div>
        <div class="st-lc-crumbs">${escapeHtml(crumbs)}</div>
        <div class="st-lc-title">${escapeHtml(line)}</div>
      </div>
      <div class="st-lc-actions">
        ${ctx ? `<button type="button" class="btn btn-secondary btn-sm" data-st-open-editor="${escapeAttr(line)}" title="Открыть стандарты линии">Стандарты</button>` : ''}
        ${ctx ? `<button type="button" class="st-icon-btn st-icon-danger" data-st-line-delete="${escapeAttr(line)}" title="Убрать линию из структуры">${SETTINGS_ICON_DELETE}</button>` : ''}
      </div>
    </div>

    <div class="st-lc-stats">
      <div class="st-stat"><span class="st-stat-val">${u.mech}</span><span class="st-stat-label">мех. стандартов</span></div>
      <div class="st-stat"><span class="st-stat-val">${u.elec}</span><span class="st-stat-label">E-Param</span></div>
      <div class="st-stat"><span class="st-stat-val">${u.history}</span><span class="st-stat-label">проверок</span></div>
    </div>

    <div class="st-lc-section">
      <div class="st-lc-label">${ctx ? 'Место в структуре' : 'Разместить в структуре'}</div>
      ${ctx ? `
        <div class="st-place-row">
          <span class="st-place-current">${escapeHtml(crumbs)}</span>
          ${stState.moving ? '' : `<button type="button" class="st-link-btn" data-st-move-open title="Перенести линию в другой блок или участок">Перенести…</button>`}
        </div>` : ''}
      ${showMover ? (placeOptions ? `
        <div class="st-mover">
          <select id="stMoveTarget" aria-label="Новое место линии">
            <option value="">— выберите ${ctx ? 'новое ' : ''}место —</option>
            ${placeOptions}
          </select>
          <button type="button" class="btn btn-primary btn-sm" data-st-move-apply>${ctx ? 'Перенести' : 'Разместить'}</button>
          ${ctx ? '<button type="button" class="btn btn-secondary btn-sm" data-st-move-cancel>Отмена</button>' : ''}
        </div>
        ${ctx ? '<div class="st-mover-hint">Стандарты, E-Param, машины, бренды и история останутся у линии.</div>' : ''}`
        : '<span class="st-muted">В этом цехе нет другого блока или участка</span>') : ''}
    </div>

    <div class="st-lc-section">
      <div class="st-lc-label">Машины <span class="st-lc-count">${machines.length}</span></div>
      <div class="st-chip-set">
        ${machines.map(m => `
          <span class="st-chip st-chip-machine" data-st-machine="${escapeAttr(m)}">
            <span class="st-chip-text" title="Нажмите, чтобы переименовать">${escapeHtml(m)}</span>
            <button type="button" class="st-chip-x" data-st-machine-remove="${escapeAttr(m)}" title="Удалить машину">${SETTINGS_ICON_X}</button>
          </span>`).join('') || '<span class="st-muted">Машин пока нет</span>'}
      </div>
      <div class="settings-add-row st-add-row">
        <input type="text" id="stMachineInput" placeholder="Новая машина, Enter" autocomplete="off">
      </div>
    </div>

    <div class="st-lc-section">
      <div class="st-lc-label">Бренды линии <span class="st-lc-count">${lineBrands.length}</span></div>
      ${lineBrands.length ? '' : '<div class="st-warn">Без брендов линия не появится у оператора в CL при переходах и TOP Losses.</div>'}
      ${offer.length > 12 ? `<input type="search" class="st-brand-filter" id="stBrandFilter" placeholder="Найти бренд среди ${offer.length}…" autocomplete="off">` : ''}
      <div class="st-chip-set ${offer.length > 12 ? 'st-chip-scroll' : ''}">
        ${offer.slice().sort((a, b) => lineBrands.includes(b) - lineBrands.includes(a))
          .map(b => `<button type="button" class="st-chip st-chip-brand ${lineBrands.includes(b) ? 'on' : ''}" data-st-brand="${escapeAttr(b)}">${lineBrands.includes(b) ? '✓ ' : ''}${escapeHtml(b)}</button>`).join('') || '<span class="st-muted">В справочнике нет брендов этого цеха</span>'}
      </div>
      <div class="settings-add-row st-add-row">
        <input type="text" id="stBrandInput" placeholder="Новый бренд для линии, Enter" autocomplete="off">
      </div>
    </div>
  `;
}

/* ============================================================ */
/* === ОБРАБОТЧИКИ (делегирование) ============================ */
/* ============================================================ */

$('#stWsChips')?.addEventListener('click', (e) => {
  const chip = e.target.closest('[data-st-ws]');
  if (!chip) return;
  stState.ws = chip.dataset.stWs;
  renderStructureSettings();
});

$('#stSearch')?.addEventListener('input', (e) => {
  stState.query = e.target.value;
  stState.adding = null;
  renderStructureSettings();
});

$('#stTree')?.addEventListener('click', (e) => {
  const lineBtn = e.target.closest('[data-st-line]');
  if (lineBtn) {
    stState.line = lineBtn.dataset.stLine;
    stState.adding = null;
    stState.moving = false;
    renderStructureSettings();
    return;
  }
  const add = e.target.closest('[data-st-add]');
  if (add) {
    stState.adding = add.dataset.stAdd;
    renderStructureSettings();
    return;
  }
  const ren = e.target.closest('[data-st-block-rename]') || e.target.closest('[data-st-block-name]');
  if (ren) {
    const id = ren.dataset.stBlockRename || ren.dataset.stBlockName;
    const nameEl = $(`#stTree [data-st-block-name="${CSS.escape(id)}"]`);
    const owner = stFindOwner(getWorkshops(), 'b:' + id);
    if (nameEl && owner) startInlineEdit(nameEl, owner.block.name || '', (v) => stRenameBlock(id, v));
    return;
  }
  const del = e.target.closest('[data-st-block-delete]');
  if (del) stDeleteBlock(del.dataset.stBlockDelete);
});

/* Ввод новой линии / нового блока */
$('#stTree')?.addEventListener('keydown', (e) => {
  const input = e.target.closest('[data-st-add-input]');
  if (!input) return;
  if (e.key === 'Escape') {
    stState.adding = null;
    renderStructureSettings();
    return;
  }
  if (e.key !== 'Enter') return;
  e.preventDefault();
  const key = input.dataset.stAddInput;
  const ok = key.startsWith('blk:')
    ? stAddBlock(key.slice(4), input.value)
    : stAddLine(key, input.value);
  if (ok && key.startsWith('blk:')) stState.adding = null;
  // после добавления линии поле остаётся открытым — удобно вводить несколько подряд
  if (ok) renderStructureSettings();
});

$('#stTree')?.addEventListener('focusout', (e) => {
  const input = e.target.closest('[data-st-add-input]');
  if (!input || input.value.trim()) return;
  // Пустое поле теряет фокус — закрываем
  setTimeout(() => {
    if (stState.adding === input.dataset.stAddInput && !document.activeElement?.closest('[data-st-add-input]')) {
      stState.adding = null;
      renderStructureSettings();
    }
  }, 120);
});

$('#stLineCard')?.addEventListener('click', (e) => {
  const line = stState.line;
  if (!line) return;
  if (e.target.closest('[data-st-move-open]')) {
    stState.moving = true;
    renderStructureLineCard();
    return $('#stMoveTarget')?.focus();
  }
  if (e.target.closest('[data-st-move-cancel]')) {
    stState.moving = false;
    return renderStructureLineCard();
  }
  if (e.target.closest('[data-st-move-apply]')) {
    const key = $('#stMoveTarget')?.value;
    if (!key) return showToast('Выберите, куда перенести линию', true);
    return stMoveLine(line, key);
  }
  const brand = e.target.closest('[data-st-brand]');
  if (brand) return stToggleBrand(line, brand.dataset.stBrand);
  const rm = e.target.closest('[data-st-machine-remove]');
  if (rm) return window.removeMachineFromLine(line, rm.dataset.stMachineRemove);
  const mText = e.target.closest('.st-chip-machine .st-chip-text');
  if (mText) {
    const old = mText.closest('[data-st-machine]').dataset.stMachine;
    return startInlineEdit(mText, old, (v) => stRenameMachine(line, old, v));
  }
  const delLine = e.target.closest('[data-st-line-delete]');
  if (delLine) return stDeleteLine(line);
  const open = e.target.closest('[data-st-open-editor]');
  if (open) {
    localStorage.setItem('cl_editor_line', line);
    if (typeof switchTab === 'function') switchTab('editor');
  }
});

/* Фильтр брендов на карточке — без перерисовки, только скрывает чипы */
$('#stLineCard')?.addEventListener('input', (e) => {
  if (e.target.id !== 'stBrandFilter') return;
  const q = e.target.value.trim().toLowerCase();
  $$('#stLineCard [data-st-brand]').forEach(ch => {
    ch.hidden = !!q && !ch.dataset.stBrand.toLowerCase().includes(q);
  });
});

$('#stLineCard')?.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter') return;
  const line = stState.line;
  if (!line) return;
  if (e.target.id === 'stMachineInput') {
    e.preventDefault();
    if (stAddMachine(line, e.target.value)) $('#stMachineInput')?.focus();
  }
  if (e.target.id === 'stBrandInput') {
    e.preventDefault();
    if (stAddBrandToLine(line, e.target.value)) $('#stBrandInput')?.focus();
  }
});
