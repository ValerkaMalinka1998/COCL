/* ============================================================
   КОМПОНЕНТЫ: окна выбора
   Комментарий к деактивации, выбор Top Losses, выбор триггеров.
   Модуль общего пространства имён: функции и переменные видны
   во всех файлах. Порядок подключения — index.html.
   ============================================================ */

/* ============================================================
   СПИСОК СТАНДАРТОВ — таблица + пагинация + сортировка
   ============================================================ */

/**
 * Иконка сортировки для заголовка колонки.
 * @param {string} field — ключ колонки
 * @returns {string} HTML-строка
 */

/* ============================================================
   КОММЕНТАРИЙ К ДЕАКТИВАЦИИ
   ============================================================ */

let currentDeactivationStdId = null;

/* Открыть модалку комментария */
window.openDeactivationCommentModal = function(stdId) {
  const st = getStandards().find(s => s.id === stdId);
  if (!st) return;

  // Если стандарт активен — не открываем
  if (st.active !== false) {
    return showToast('Комментарий можно оставить только для деактивированного стандарта', true);
  }

  currentDeactivationStdId = stdId;

  const modal = $('#deactivationCommentModal');
  if (!modal) return;

  $('#deactivationCommentPoint').textContent =
    `Стандарт: ${st.oplNumber || '—'} — ${st.title || ''}`;
  $('#deactivationCommentText').value = st.deactivationComment || '';

  // Архив
  const archiveBlock = $('#deactivationArchiveBlock');
  const archiveList = $('#deactivationArchiveList');
  const history = Array.isArray(st.deactivationHistory) ? st.deactivationHistory : [];

  if (history.length) {
    archiveBlock.style.display = 'block';
    archiveList.innerHTML = history
      .slice()
      .reverse()  // новые сверху
      .map(h => `
        <div class="deactivation-archive-item">
          <div class="deactivation-archive-date">${formatDateTime(h.date)}</div>
          <div class="deactivation-archive-text">${escapeHtml(h.text)}</div>
        </div>
      `)
      .join('');
  } else {
    archiveBlock.style.display = 'none';
    archiveList.innerHTML = '';
  }

  // Кнопка «Очистить» — активна только если есть текст
  const clearBtn = $('#deactivationClearBtn');
  if (clearBtn) {
    clearBtn.style.display = (st.deactivationComment && st.deactivationComment.trim()) ? '' : 'none';
  }

  openModal(modal);
  setTimeout(() => {
    const ta = $('#deactivationCommentText');
    if (ta) ta.focus();
  }, 100);
};

function closeDeactivationCommentModal() {
  closeModal('#deactivationCommentModal');
  currentDeactivationStdId = null;
}

/* --- Обработчики модалки --- */
$('#deactivationCommentClose')?.addEventListener('click', closeDeactivationCommentModal);
$('#deactivationCancelBtn')?.addEventListener('click', closeDeactivationCommentModal);
$('#deactivationCommentModal')?.addEventListener('click', (e) => {
  if (e.target.id === 'deactivationCommentModal') closeDeactivationCommentModal();
});

/* Сохранить */
$('#deactivationSaveBtn')?.addEventListener('click', () => {
  if (!currentDeactivationStdId) return;
  const text = ($('#deactivationCommentText').value || '').trim();

  const st = getStandards().find(s => s.id === currentDeactivationStdId);
  if (!st) return;

  st.deactivationComment = text;
  saveStandard(st);

   refreshEditorMechTable();
  closeDeactivationCommentModal();
  showToast(text ? 'Комментарий сохранён' : 'Комментарий удалён');
});

/* Очистить */
$('#deactivationClearBtn')?.addEventListener('click', () => {
  if (!currentDeactivationStdId) return;
  if (!confirm('Очистить комментарий к деактивации?')) return;

  const st = getStandards().find(s => s.id === currentDeactivationStdId);
  if (!st) return;

  st.deactivationComment = '';
  saveStandard(st);

  refreshEditorMechTable();
  closeDeactivationCommentModal();
  showToast('Комментарий удалён');
});

/* ============================================================
   TOP LOSSES стандарта — выбор через окно
   ============================================================ */

// Выбранные потери стандарта, который редактируется на полной странице
let sfTopLossesSelected = [];
// Откуда открыто окно выбора потерь ('sv-full' — полная страница стандарта,
// 'callback' — openTopLossPickerFor, например страница E-Param)
let topLossPickerContext = 'sv-full';
let topLossPickerCallback = null;   // { workshopId, onApply }

/* Окно выбора потерь для любого объекта: выбор возвращается в onApply(ids) */
function openTopLossPickerFor({ workshopId, selected, onApply }) {
  topLossPickerContext = 'callback';
  topLossPickerCallback = { workshopId: workshopId || null, onApply };
  sfTopLossesSelected = Array.isArray(selected) ? [...selected] : [];
  window.openTopLossPickerModal();
}

/* ============================================================
   Окно выбора потерь: слева категории цеха, справа потери,
   сверху — выбранные (можно снять крестиком)
   ============================================================ */

// Временный набор (до применения), категория, фильтр «только выбранные»
let topLossPickerTemp = new Set();
let tlpCat = 'all';
let tlpOnlySel = false;

window.openTopLossPickerModal = function() {
  const modal = $('#topLossPickerModal');
  if (!modal) return;

  topLossPickerTemp = new Set(sfTopLossesSelected);
  tlpCat = 'all';
  tlpOnlySel = false;

  const search = $('#topLossPickerSearch');
  if (search) search.value = '';

  // Подзаголовок: откуда открыто (цех и линия)
  const ws = getTopLossPickerWorkshop();
  const line = topLossPickerContext === 'callback' ? '' : ((svFullState.editingData || {}).line || '');
  const parts = [];
  if (ws) parts.push('Цех ' + ((getWorkshop(ws) || {}).name || ws));
  if (line) parts.push('линия ' + line);
  $('#topLossPickerSub').textContent = parts.join(' · ');

  renderTopLossPicker();
  openModal(modal);
  setTimeout(() => search?.focus(), 100);
};

function closeTopLossPickerModal() {
  closeModal('#topLossPickerModal');
  topLossPickerTemp = new Set();
  // Окно, открытое через openTopLossPickerFor, — разовое
  if (topLossPickerContext === 'callback') {
    topLossPickerContext = 'sv-full';
    topLossPickerCallback = null;
  }
}

/* Цех линии, для которой выбираем потери (форма или полная страница) */
function getTopLossPickerWorkshop() {
  if (topLossPickerContext === 'callback') return topLossPickerCallback?.workshopId || null;
  const line = (svFullState.editingData || {}).line || '';
  return line ? getWorkshopIdForLine(line) : null;
}

/* Всё окно: категории, выбранные, список потерь, счётчик */
function renderTopLossPicker() {
  const pickerWs = getTopLossPickerWorkshop();
  const cats = pickerWs ? getTopLossesForWorkshop(pickerWs) : getTopLosses();
  const q = ($('#topLossPickerSearch')?.value || '').trim().toLowerCase();
  const sel = topLossPickerTemp;
  const catsEl = $('#topLossPickerCats');
  const list = $('#topLossPickerList');
  if (!catsEl || !list) return;

  if (!cats.length) {
    catsEl.innerHTML = '';
    list.innerHTML = '<div class="empty-state" style="padding:20px">Справочник Top Losses пуст</div>';
    updateTopLossPickerCounter();
    return;
  }
  if (tlpCat !== 'all' && !cats.some(c => c.id === tlpCat)) tlpCat = 'all';

  const match = (cat, it) => (!q || it.name.toLowerCase().includes(q) || cat.name.toLowerCase().includes(q))
    && (!tlpOnlySel || sel.has(it.id));
  const itemsOf = (cat) => (Array.isArray(cat.items) ? cat.items : []);

  // Категории слева: выбрано / всего
  const totalAll = cats.reduce((n, c) => n + itemsOf(c).length, 0);
  const selAll = cats.reduce((n, c) => n + itemsOf(c).filter(it => sel.has(it.id)).length, 0);
  const catBtn = (id, name, picked, total) => `
    <button type="button" class="tlp-cat ${tlpCat === id ? 'active' : ''}" data-tlp-cat="${escapeAttr(id)}">
      <span class="tlp-cat-name">${escapeHtml(name)}</span>
      <span class="tlp-cat-n ${picked ? 'has' : ''}">${picked ? picked + ' / ' : ''}${total}</span>
    </button>`;
  catsEl.innerHTML = catBtn('all', 'Все', selAll, totalAll) + cats.map(c =>
    catBtn(c.id, c.name, itemsOf(c).filter(it => sel.has(it.id)).length, itemsOf(c).length)).join('');

  // Выбранные сверху
  const byId = {};
  cats.forEach(c => itemsOf(c).forEach(it => { byId[it.id] = it; }));
  const pickedIds = [...sel].filter(id => byId[id]);
  $('#topLossPickerPicked').innerHTML = pickedIds.length
    ? pickedIds.map(id => `<span class="tlp-chip">${escapeHtml(byId[id].name)}<button type="button" data-tlp-drop="${escapeAttr(id)}" title="Убрать">✕</button></span>`).join('')
    : '<span class="tlp-picked-empty">Ничего не выбрано — отметьте потери ниже</span>';
  $('#topLossPickerOnly')?.classList.toggle('active', tlpOnlySel);

  // Потери справа
  let html = '';
  cats.forEach(cat => {
    if (tlpCat !== 'all' && cat.id !== tlpCat) return;
    const visible = itemsOf(cat).filter(it => match(cat, it));
    if (!visible.length) return;
    html += `
      <div class="tlp-group">
        ${tlpCat === 'all' ? `<div class="tlp-group-name">${escapeHtml(cat.name)}</div>` : ''}
        <div class="tlp-grid">
          ${visible.map(it => `
            <button type="button" class="tlp-item ${sel.has(it.id) ? 'checked' : ''}" data-tlp-item="${escapeAttr(it.id)}">
              <span class="tlp-check"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></span>
              <span class="tlp-item-name">${escapeHtml(it.name)}</span>
            </button>`).join('')}
        </div>
      </div>`;
  });
  list.innerHTML = html || `<div class="empty-state" style="padding:20px">${tlpOnlySel && !sel.size ? 'Пока ничего не выбрано' : 'Ничего не найдено'}</div>`;
  updateTopLossPickerCounter();
}

function updateTopLossPickerCounter() {
  const el = $('#topLossPickerCounter');
  if (el) el.textContent = 'Выбрано: ' + topLossPickerTemp.size;
  const clr = $('#topLossPickerClear');
  if (clr) clr.disabled = !topLossPickerTemp.size;
}

/** Применить выбор из окна */
function applyTopLossPicker() {
  sfTopLossesSelected = [...topLossPickerTemp];

  // Контекст: вызов с колбэком (страница E-Param и др.)
  if (topLossPickerContext === 'callback') {
    const cb = topLossPickerCallback?.onApply;
    closeTopLossPickerModal();
    if (typeof cb === 'function') cb([...sfTopLossesSelected]);
    return;
  }

  // Контекст: полная страница стандарта
  if (topLossPickerContext === 'sv-full') {
    if (svFullState.editingData) {
      svFullState.editingData.topLosses = [...sfTopLossesSelected];
    }
    const st = svFullState.editingData;
    if (st) renderSvFullExtra(st, true);
  }

  closeTopLossPickerModal();
}

/* --- Обработчики окна (делегирование: список перерисовывается) --- */
$('#topLossPickerClose')?.addEventListener('click', closeTopLossPickerModal);
$('#topLossPickerCancel')?.addEventListener('click', closeTopLossPickerModal);
$('#topLossPickerApply')?.addEventListener('click', applyTopLossPicker);
$('#topLossPickerClear')?.addEventListener('click', () => {
  topLossPickerTemp.clear();
  renderTopLossPicker();
});
$('#topLossPickerOnly')?.addEventListener('click', () => {
  tlpOnlySel = !tlpOnlySel;
  renderTopLossPicker();
});
$('#topLossPickerSearch')?.addEventListener('input', () => renderTopLossPicker());
$('#topLossPickerModal')?.addEventListener('click', (e) => {
  if (e.target.id === 'topLossPickerModal') { closeTopLossPickerModal(); return; }
  const cat = e.target.closest('[data-tlp-cat]');
  if (cat) { tlpCat = cat.dataset.tlpCat; renderTopLossPicker(); return; }
  const drop = e.target.closest('[data-tlp-drop]');
  if (drop) { topLossPickerTemp.delete(drop.dataset.tlpDrop); renderTopLossPicker(); return; }
  const item = e.target.closest('[data-tlp-item]');
  if (item) {
    const id = item.dataset.tlpItem;
    if (topLossPickerTemp.has(id)) topLossPickerTemp.delete(id); else topLossPickerTemp.add(id);
    renderTopLossPicker();
  }
});

/* ============================================================
   ВЫБОР ТРИГГЕРОВ CHANGE OVER — общая модалка
   (полная страница стандарта и параметра)
   ============================================================ */

const triggerPickerState = {
  workshopId: null,
  part: '',
  temp: new Set(),
  onApply: null
};

/* opts: { workshopId, part, selected: [value], onApply(values) } */
function openTriggerPickerModal(opts) {
  const modal = $('#triggerPickerModal');
  if (!modal) return;
  triggerPickerState.workshopId = opts.workshopId || null;
  triggerPickerState.part = opts.part || '';
  triggerPickerState.temp = new Set(opts.selected || []);
  triggerPickerState.onApply = typeof opts.onApply === 'function' ? opts.onApply : null;

  const hint = $('#triggerPickerHint');
  if (hint) {
    const wsName = getWorkshopName(triggerPickerState.workshopId) || '—';
    const partTxt = triggerPickerState.workshopId === 'smd' && triggerPickerState.part
      ? ` · ${triggerPickerState.part} и общие для цеха` : '';
    hint.textContent = `Триггеры цеха ${wsName}${partTxt}. Список настраивается в Настройках → «Триггеры Change Over».`;
  }
  const search = $('#triggerPickerSearch');
  if (search) search.value = '';
  renderTriggerPickerList('');
  openModal(modal);
  setTimeout(() => search?.focus(), 100);
}

function renderTriggerPickerList(query) {
  const list = $('#triggerPickerList');
  if (!list) return;
  const q = (query || '').trim().toLowerCase();
  const all = getTriggersForWorkshop(triggerPickerState.workshopId, triggerPickerState.part);

  if (!all.length) {
    list.innerHTML = '<div class="empty-state" style="padding:20px">Для этого цеха триггеры не заданы — добавьте их в Настройках.</div>';
    updateTriggerPickerCounter();
    return;
  }

  // Группы по части линии: общие, Maker, Packer
  const groups = [
    { name: 'Любая часть линии', items: all.filter(t => !t.part) },
    { name: 'Maker', items: all.filter(t => t.part === 'Maker') },
    { name: 'Packer', items: all.filter(t => t.part === 'Packer') }
  ];
  const html = groups.map(g => {
    const visible = g.items.filter(t => !q || t.label.toLowerCase().includes(q));
    if (!visible.length) return '';
    return `
      <div class="toploss-picker-group">
        <div class="toploss-picker-group-head">
          <span class="toploss-picker-group-name">${escapeHtml(g.name)}</span>
          <span class="toploss-picker-group-count">${visible.length}</span>
        </div>
        <div class="toploss-picker-group-body">
          ${visible.map(t => {
            const checked = triggerPickerState.temp.has(t.value);
            return `
              <label class="toploss-picker-item ${checked ? 'checked' : ''}">
                <input type="checkbox" value="${escapeAttr(t.value)}" ${checked ? 'checked' : ''}>
                <span>${escapeHtml(t.label)}</span>
              </label>`;
          }).join('')}
        </div>
      </div>`;
  }).join('');
  list.innerHTML = html || '<div class="empty-state" style="padding:20px">Ничего не найдено</div>';
  updateTriggerPickerCounter();
}

function updateTriggerPickerCounter() {
  const el = $('#triggerPickerCounter');
  if (el) el.textContent = 'Выбрано: ' + triggerPickerState.temp.size;
}

function closeTriggerPickerModal() {
  closeModal('#triggerPickerModal');
  triggerPickerState.onApply = null;
}

$('#triggerPickerList')?.addEventListener('change', (e) => {
  const cb = e.target.closest('input[type=checkbox]');
  if (!cb) return;
  if (cb.checked) triggerPickerState.temp.add(cb.value);
  else triggerPickerState.temp.delete(cb.value);
  cb.closest('.toploss-picker-item')?.classList.toggle('checked', cb.checked);
  updateTriggerPickerCounter();
});
$('#triggerPickerSearch')?.addEventListener('input', (e) => renderTriggerPickerList(e.target.value));
$('#triggerPickerClose')?.addEventListener('click', closeTriggerPickerModal);
$('#triggerPickerCancel')?.addEventListener('click', closeTriggerPickerModal);
$('#triggerPickerModal')?.addEventListener('click', (e) => {
  if (e.target.id === 'triggerPickerModal') closeTriggerPickerModal();
});
$('#triggerPickerApply')?.addEventListener('click', () => {
  const cb = triggerPickerState.onApply;
  const values = [...triggerPickerState.temp];
  closeTriggerPickerModal();
  if (cb) cb(values);
});

/* Чипы выбранных триггеров с крестиком (data-remove-trigger) */
function renderTriggerChipsEditable(values) {
  return (values || []).map(v => `
    <div class="sv-toploss-item" title="${escapeAttr(getTriggerLabel(v))}">
      <span>${escapeHtml(getTriggerLabel(v))}</span>
      <button type="button" class="sv-toploss-remove" data-remove-trigger="${escapeAttr(v)}" title="Убрать">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>`).join('');
}
