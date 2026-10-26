/* ============================================================
   НАСТРОЙКИ: триггеры Change Over
   Модуль общего пространства имён: функции и переменные видны
   во всех файлах. Порядок подключения — index.html.
   ============================================================ */

/* ============================================================
   НАСТРОЙКИ: пользовательские триггеры Change Over
   ============================================================ */

function renderCustomTriggersSettings() {
  const container = $('#customTriggersContainer');
  if (!container) return;

  const list = getCustomTriggers();
  const ws = settingsState.triggersWs;
  const q = (settingsState.triggersQuery || '').trim().toLowerCase();
  const counter = $('#triggersCount');
  if (counter) counter.textContent = `(${list.length})`;

  const addWs = (ws !== 'all') ? ws : (settingsState.triggersAddWs || getWorkshops()[0]?.id || '');
  settingsState.triggersAddWs = addWs;

  const shown = list
    .filter(t => ws === 'all' || t.workshop === ws)
    .filter(t => !q || t.label.toLowerCase().includes(q));

  const PARTS = [['', 'Любая часть'], ['Maker', 'Maker'], ['Packer', 'Packer']];
  const partSeg = (t) => PARTS.map(([v, l]) => `
    <button type="button" class="settings-seg-btn ${(t.part || '') === v ? 'active' : ''}" data-ct-part="${escapeAttr(v)}" data-ct-id="${escapeAttr(t.id)}">${l}</button>`).join('');

  const usage = (t) =>
    getStandards().filter(s => (s.triggers || []).includes(t.value)).length +
    getElectronicParams().filter(p => (p.triggers || []).includes(t.value)).length;

  const rows = shown.map(t => {
    const n = usage(t);
    return `
      <div class="settings-row">
        <span class="settings-row-name" data-ct-rename="${escapeAttr(t.id)}" title="Нажмите, чтобы переименовать">${settingsHighlight(t.label, q)}</span>
        ${ws === 'all' ? `<span class="settings-ws-badge">${escapeHtml(getWorkshopName(t.workshop) || '—')}</span>` : ''}
        <span class="settings-row-meta">${n ? n + ' ' + pluralizeStandards(n) : 'не назначен'}</span>
        ${t.workshop === 'smd' ? `<span class="settings-seg settings-seg-sm" title="Для какой части линии">${partSeg(t)}</span>` : ''}
        <button type="button" class="st-icon-btn st-icon-danger" data-ct-delete="${escapeAttr(t.id)}" title="Удалить триггер">${SETTINGS_ICON_DELETE}</button>
      </div>`;
  }).join('');

  const wsSeg = getWorkshops().map(w => `
    <button type="button" class="settings-seg-btn ${addWs === w.id ? 'active' : ''}" data-ct-add-ws="${escapeAttr(w.id)}">${escapeHtml(w.name)}</button>`).join('');

  container.innerHTML = `
    <div class="settings-toolbar">
      ${settingsSearchHtml('triggersSearch', 'Поиск триггера…', settingsState.triggersQuery || '')}
      <div class="settings-chips">${settingsChipsHtml(
        settingsWorkshopChipItems(id => list.filter(t => t.workshop === id).length, true, list.length),
        ws, 'data-ct-filter')}</div>
    </div>
    <div class="settings-add-row">
      <input type="text" id="newTriggerInput" placeholder="Новый триггер, например «Смена фильтра», Enter" autocomplete="off">
      <span class="settings-seg">${wsSeg}</span>
      <button type="button" class="btn btn-primary btn-sm" id="newTriggerBtn">Добавить</button>
    </div>
    <div class="settings-list">
      ${rows || `<div class="st-empty">${q ? 'Ничего не найдено' : 'Триггеров пока нет'}</div>`}
    </div>`;
}

function addCustomTriggerInline() {
  const label = ($('#newTriggerInput')?.value || '').trim();
  const workshop = settingsState.triggersAddWs;
  if (!label) return showToast('Введите название триггера', true);
  if (!workshop) return showToast('Выберите цех', true);
  const list = getCustomTriggers();
  if (list.some(t => t.workshop === workshop && t.label.toLowerCase() === label.toLowerCase())) {
    return showToast('Такой триггер в этом цехе уже есть', true);
  }
  const stamp = Date.now() + '_' + Math.random().toString(36).slice(2, 6);
  list.push({ id: 'ct_' + stamp, label, value: 'ct_' + stamp, part: '', workshop });
  setCustomTriggers(list);
  renderCustomTriggersSettings();
  updateSettingsNavCounts();
  if (typeof fillEditorFilters === 'function') fillEditorFilters();
  $('#newTriggerInput')?.focus();
  showToast('Триггер добавлен');
}

function updateCustomTrigger(id, patch) {
  const list = getCustomTriggers();
  const t = list.find(x => x.id === id);
  if (!t) return false;
  if (patch.label != null &&
      list.some(x => x.id !== id && x.workshop === t.workshop && x.label.toLowerCase() === patch.label.toLowerCase())) {
    showToast('Такой триггер в этом цехе уже есть', true);
    return false;
  }
  Object.assign(t, patch);
  setCustomTriggers(list);
  renderCustomTriggersSettings();
  if (typeof fillEditorFilters === 'function') fillEditorFilters();
  return true;
}

function deleteCustomTrigger(id) {
  const t = getCustomTriggers().find(x => x.id === id);
  if (!t) return;

  // Считаем, сколько стандартов используют этот триггер
  const usedByMech = getStandards().filter(st =>
    Array.isArray(st.triggers) && st.triggers.includes(t.value)
  ).length;
  const usedByElec = getElectronicParams().filter(p =>
    Array.isArray(p.triggers) && p.triggers.includes(t.value)
  ).length;

  let msg = `Удалить триггер «${t.label}»?`;
  if (usedByMech + usedByElec > 0) {
    msg += `\n\nОн используется в ${usedByMech} мех. и ${usedByElec} эл. стандартах — у них он останется, но пропадёт из списка выбора.`;
  }
  if (!confirm(msg)) return;

  setCustomTriggers(getCustomTriggers().filter(x => x.id !== id));
  renderCustomTriggersSettings();
  updateSettingsNavCounts();
  showToast('Триггер удалён');
}

/* --- Обработчики --- */
$('#customTriggersContainer')?.addEventListener('input', (e) => {
  if (e.target.id !== 'triggersSearch') return;
  settingsState.triggersQuery = e.target.value;
  const pos = e.target.selectionStart;
  renderCustomTriggersSettings();
  const s = $('#triggersSearch');
  if (s) { s.focus(); s.setSelectionRange(pos, pos); }
});

$('#customTriggersContainer')?.addEventListener('keydown', (e) => {
  if (e.target.id === 'newTriggerInput' && e.key === 'Enter') {
    e.preventDefault();
    addCustomTriggerInline();
  }
});

$('#customTriggersContainer')?.addEventListener('click', (e) => {
  const f = e.target.closest('[data-ct-filter]');
  if (f) {
    settingsState.triggersWs = f.dataset.ctFilter;
    if (f.dataset.ctFilter !== 'all') settingsState.triggersAddWs = f.dataset.ctFilter;
    return renderCustomTriggersSettings();
  }
  const aw = e.target.closest('[data-ct-add-ws]');
  if (aw) {
    settingsState.triggersAddWs = aw.dataset.ctAddWs;
    const v = $('#newTriggerInput')?.value || '';
    renderCustomTriggersSettings();
    const inp = $('#newTriggerInput');
    if (inp) { inp.value = v; inp.focus(); }
    return;
  }
  if (e.target.closest('#newTriggerBtn')) return addCustomTriggerInline();
  const part = e.target.closest('[data-ct-part]');
  if (part) return updateCustomTrigger(part.dataset.ctId, { part: part.dataset.ctPart });
  const del = e.target.closest('[data-ct-delete]');
  if (del) return deleteCustomTrigger(del.dataset.ctDelete);
  const ren = e.target.closest('[data-ct-rename]');
  if (ren) {
    const t = getCustomTriggers().find(x => x.id === ren.dataset.ctRename);
    if (t) startInlineEdit(ren, t.label, (v) => updateCustomTrigger(t.id, { label: v }));
  }
});

/* Бренды для конкретной линии */
function getBrandsForLine(line) {
  const lb = getLineBrands();
  return Array.isArray(lb[line]) ? lb[line] : [];
}
