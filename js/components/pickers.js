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

  const all = getStandards();
  const st = all.find(s => s.id === currentDeactivationStdId);
  if (!st) return;

  st.deactivationComment = text;
  setStandards(all);

   refreshEditorMechTable();
  closeDeactivationCommentModal();
  showToast(text ? 'Комментарий сохранён' : 'Комментарий удалён');
});

/* Очистить */
$('#deactivationClearBtn')?.addEventListener('click', () => {
  if (!currentDeactivationStdId) return;
  if (!confirm('Очистить комментарий к деактивации?')) return;

  const all = getStandards();
  const st = all.find(s => s.id === currentDeactivationStdId);
  if (!st) return;

  st.deactivationComment = '';
  setStandards(all);

  refreshEditorMechTable();
  closeDeactivationCommentModal();
  showToast('Комментарий удалён');
});

/* ============================================================
   TOP LOSSES стандарта — выбор через окно
   ============================================================ */

// Выбранные потери стандарта, который редактируется на полной странице
let sfTopLossesSelected = [];
// Откуда открыто окно выбора потерь ('sv-full' — полная страница стандарта)
let topLossPickerContext = 'sv-full';

/* ============================================================
   Модалка выбора потерь
   ============================================================ */

// Временный набор (до применения)
let topLossPickerTemp = new Set();

window.openTopLossPickerModal = function() {
  const modal = $('#topLossPickerModal');
  if (!modal) return;

  // Копируем текущие выбранные во временное хранилище
  topLossPickerTemp = new Set(sfTopLossesSelected);

  // Сбрасываем поиск
  const search = $('#topLossPickerSearch');
  if (search) search.value = '';

  // Рисуем список
  renderTopLossPickerList('');
  updateTopLossPickerCounter();

  openModal(modal);

  setTimeout(() => search?.focus(), 100);
};

function closeTopLossPickerModal() {
  closeModal('#topLossPickerModal');
  topLossPickerTemp = new Set();
}

/** Отрисовать список категорий и потерь в модалке */
/* Цех линии, для которой выбираем потери (форма или полная страница) */
function getTopLossPickerWorkshop() {
  const line = (svFullState.editingData || {}).line || '';
  return line ? getWorkshopIdForLine(line) : null;
}

function renderTopLossPickerList(query) {
  const list = $('#topLossPickerList');
  if (!list) return;

  const pickerWs = getTopLossPickerWorkshop();
  const cats = pickerWs ? getTopLossesForWorkshop(pickerWs) : getTopLosses();
  const q = (query || '').trim().toLowerCase();

  if (!cats.length) {
    list.innerHTML = '<div class="empty-state" style="padding:20px">Справочник Top Losses пуст</div>';
    return;
  }

  let html = '';

  cats.forEach(cat => {
    const items = Array.isArray(cat.items) ? cat.items : [];

    // Фильтрация
    let visible = items;
    if (q) {
      visible = items.filter(it =>
        it.name.toLowerCase().includes(q) ||
        cat.name.toLowerCase().includes(q)
      );
    }

    // Если в категории нет видимых и запрос не совпал с названием — скрываем
    if (!visible.length) return;

    html += `
      <div class="toploss-picker-group" data-cat-id="${escapeAttr(cat.id)}">
        <div class="toploss-picker-group-head">
          <span class="toploss-picker-group-name">${escapeHtml(cat.name)}</span>
          <span class="toploss-picker-group-count">${visible.length}</span>
        </div>
        <div class="toploss-picker-group-body">
          ${visible.map(it => {
            const checked = topLossPickerTemp.has(it.id);
            return `
              <label class="toploss-picker-item ${checked ? 'checked' : ''}" data-loss-id="${escapeAttr(it.id)}">
                <input type="checkbox" value="${escapeAttr(it.id)}" ${checked ? 'checked' : ''}>
                <span>${escapeHtml(it.name)}</span>
              </label>
            `;
          }).join('')}
        </div>
      </div>
    `;
  });

  list.innerHTML = html || '<div class="empty-state" style="padding:20px">Ничего не найдено</div>';

  // Обработчики
  list.querySelectorAll('input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', (e) => {
      const id = e.target.value;
      if (e.target.checked) {
        topLossPickerTemp.add(id);
      } else {
        topLossPickerTemp.delete(id);
      }
      e.target.closest('.toploss-picker-item').classList.toggle('checked', e.target.checked);
      updateTopLossPickerCounter();
    });
  });
}

function updateTopLossPickerCounter() {
  const el = $('#topLossPickerCounter');
  if (el) el.textContent = 'Выбрано: ' + topLossPickerTemp.size;
}

/** Применить выбор из модалки */
function applyTopLossPicker() {
  sfTopLossesSelected = [...topLossPickerTemp];

  // Контекст: новый полный просмотр
  if (topLossPickerContext === 'sv-full') {
    // Обновляем editingData
    if (svFullState.editingData) {
      svFullState.editingData.topLosses = [...sfTopLossesSelected];
    }
    // Перерисовываем блок доп. инфо
    const st = svFullState.editingData;
    if (st) renderSvFullExtra(st, true);
  }

  closeTopLossPickerModal();
}

/* --- Обработчики модалки --- */
$('#topLossPickerClose')?.addEventListener('click', closeTopLossPickerModal);
$('#topLossPickerCancel')?.addEventListener('click', closeTopLossPickerModal);
$('#topLossPickerApply')?.addEventListener('click', applyTopLossPicker);
$('#topLossPickerModal')?.addEventListener('click', (e) => {
  if (e.target.id === 'topLossPickerModal') closeTopLossPickerModal();
});
$('#topLossPickerSearch')?.addEventListener('input', (e) => {
  renderTopLossPickerList(e.target.value);
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
