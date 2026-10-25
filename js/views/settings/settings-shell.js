/* ============================================================
   НАСТРОЙКИ: каркас вкладки
   Меню разделов слева, справа — только выбранный раздел.
   Общие помощники разделов: чипы цехов, правка в строке.
   Модуль общего пространства имён: функции и переменные видны
   во всех файлах. Порядок подключения — index.html.
   ============================================================ */

const SETTINGS_PANEL_KEY = 'cl_settings_panel';
const SETTINGS_PANELS = ['structure', 'brands', 'toplosses', 'triggers', 'shifts', 'operators', 'oplimport', 'photos', 'data'];

/* Общее состояние разделов: выбранный цех у справочников */
const settingsState = {
  panel: 'structure',
  brandsWs: 'all',      // 'all' | id цеха | '__none__'
  triggersWs: 'all',    // 'all' | id цеха
  triggersQuery: '',
  triggersAddWs: '',    // цех для нового триггера
  tlWs: null            // id цеха (у Top Losses «все» нет — категории свои у каждого цеха)
};

/* ============================================================ */
/* === ОТРИСОВКА ВСЕЙ ВКЛАДКИ ================================= */
/* ============================================================ */
function renderSettings() {
  renderPhotoStorageSettings();
  renderStructureSettings();
  renderElectronicShiftSettings();
  renderTopLossesSettings();
  renderBrandsSettings();
  renderCustomTriggersSettings();
  renderOperatorsSettings();
  renderOplImportSettings();
  showSettingsPanel(getSavedSettingsPanel());
}

function getSavedSettingsPanel() {
  try {
    const p = localStorage.getItem(SETTINGS_PANEL_KEY);
    return SETTINGS_PANELS.includes(p) ? p : 'structure';
  } catch (e) { return 'structure'; }
}

/* Показать раздел */
function showSettingsPanel(panel) {
  if (!SETTINGS_PANELS.includes(panel)) panel = 'structure';
  settingsState.panel = panel;
  document.querySelectorAll('#tab-settings .settings-panel').forEach(sec => {
    sec.classList.toggle('active', sec.dataset.panel === panel);
  });
  document.querySelectorAll('#settingsNav .settings-nav-item').forEach(btn => {
    const on = btn.dataset.settingsPanel === panel;
    btn.classList.toggle('active', on);
    btn.setAttribute('aria-current', on ? 'page' : 'false');
  });
  try { localStorage.setItem(SETTINGS_PANEL_KEY, panel); } catch (e) {}
  updateSettingsNavCounts();
}

/* Счётчики в меню разделов */
function updateSettingsNavCounts() {
  const set = (k, v) => {
    const el = document.querySelector(`#settingsNav [data-settings-count="${k}"]`);
    if (el) el.textContent = v ? String(v) : '';
  };
  set('structure', getLines().length);
  set('brands', getBrands().length);
  set('toplosses', getTopLosses().reduce((n, c) => n + ((c.items || []).length), 0));
  set('triggers', getCustomTriggers().length);
  set('operators', getOperators().length);
}

$('#settingsNav')?.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-settings-panel]');
  if (btn) showSettingsPanel(btn.dataset.settingsPanel);
});

/* ============================================================ */
/* === ОБЩИЕ ПОМОЩНИКИ РАЗДЕЛОВ =============================== */
/* ============================================================ */

/* Чипы цехов: items = [{ id, name, count }], active — выбранный id */
function settingsChipsHtml(items, active, attr) {
  return items.map(it => `
    <button type="button" class="settings-chip ${it.id === active ? 'active' : ''}" ${attr}="${escapeAttr(it.id)}">
      <span>${escapeHtml(it.name)}</span>
      ${it.count != null ? `<span class="settings-chip-count">${it.count}</span>` : ''}
    </button>`).join('');
}

/* Строка поиска раздела */
function settingsSearchHtml(id, placeholder, value) {
  return `
    <div class="settings-search">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
      <input type="text" id="${id}" placeholder="${escapeAttr(placeholder)}" value="${escapeAttr(value || '')}" autocomplete="off">
    </div>`;
}

/* Подсветка совпадения в тексте */
function settingsHighlight(text, query) {
  if (!query) return escapeHtml(text);
  const i = text.toLowerCase().indexOf(query.toLowerCase());
  if (i === -1) return escapeHtml(text);
  return escapeHtml(text.slice(0, i)) +
    '<mark class="settings-mark">' + escapeHtml(text.slice(i, i + query.length)) + '</mark>' +
    escapeHtml(text.slice(i + query.length));
}

/* Иконки строк (Feather) */
const SETTINGS_ICON_EDIT = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>';
const SETTINGS_ICON_DELETE = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>';
const SETTINGS_ICON_PLUS = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>';
const SETTINGS_ICON_X = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';

/* Правка текста прямо в строке.
   el — элемент с текстом; onSave(newText) возвращает true, если сохранено.
   Enter — сохранить, Esc или уход фокуса без изменений — отмена. */
function startInlineEdit(el, value, onSave) {
  if (!el || el.querySelector('input')) return;
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'settings-inline-input';
  input.value = value;
  const restore = el.innerHTML;
  el.innerHTML = '';
  el.appendChild(input);
  input.focus();
  input.select();
  let done = false;
  const finish = (save) => {
    if (done) return;
    done = true;
    const v = input.value.trim().replace(/\s+/g, ' ');
    if (save && v && v !== value) {
      if (onSave(v) === false) { done = false; input.focus(); return; }
    } else {
      el.innerHTML = restore;
    }
  };
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); finish(true); }
    if (e.key === 'Escape') { e.preventDefault(); finish(false); }
  });
  input.addEventListener('blur', () => finish(true));
  input.addEventListener('click', (e) => e.stopPropagation());
}

/* Список цехов для чипов с подсчётом: countFn(wsId) */
function settingsWorkshopChipItems(countFn, withAll, allCount) {
  const items = getWorkshops().map(w => ({ id: w.id, name: w.name, count: countFn(w.id) }));
  if (withAll) items.unshift({ id: 'all', name: 'Все', count: allCount });
  return items;
}
