/* ============================================================
   ВКЛАДКА «TOP Losses»
   Модуль общего пространства имён: функции и переменные видны
   во всех файлах. Порядок подключения — index.html.
   ============================================================ */

/* ============================================================
   ВКЛАДКА TOP LOSSES — ЭКРАН ВЫБОРА ПОТЕРЬ (Этап 3)
   ============================================================ */

/* Текущее состояние экрана выбора */
const tlState = {
  selectedLossIds: new Set(),      // выбранные id потерь
  expandedCategoryIds: new Set(),  // раскрытые категории
  // Кэш данных для перерисовки
  currentItems: [],                // массив стандартов
  currentStandardToLosses: {},     // standardId → [lossId]
  currentLossIds: [],              // выбранные lossIds
  // Раскрытые блоки ответов (Set от stdId)
  openAnswers: new Set()
};

/* ----------------------------------------
   Заполнение формы (смена, линия, оператор)
   ---------------------------------------- */
function fillTopLossTab() {
  fillTopLossLines();

  // Явно сбрасываем линию в пустое значение
  const lineEl = $('#tlLine');
  if (lineEl) lineEl.value = '';
}

/* Линия — только те, у которых есть бренды (как в COCL) */
function fillTopLossLines() {
  const el = $('#tlLine');
  if (!el) return;

  const available = getAvailableLines();
  if (!available.length) {
    el.innerHTML = '<option value="">— нет доступных линий —</option>';
    el.value = '';
    return;
  }
  el.innerHTML = '<option value="">— выберите —</option>' +
    available.map(l => `<option>${escapeHtml(l)}</option>`).join('');

  // Явный сброс — чтобы браузер не выбирал первую линию автоматически
  el.value = '';
}

/* ----------------------------------------
   Подсчёт стандартов для потери
   ---------------------------------------- */
function countStandardsForLoss(lossId) {
  const line = ($('#tlLine')?.value || '').trim();
  const standards = getStandards();
  return standards.filter(st => {
    if (st.active === false) return false;
    if (line && st.line !== line) return false;
    return Array.isArray(st.topLosses) && st.topLosses.includes(lossId);
  }).length;
}
/* ----------------------------------------
   Отрисовка категорий и потерь
   ---------------------------------------- */
function renderTopLossCategories() {
  const container = $('#tlCategoriesContainer');
  if (!container) return;

  // Потери зависят от цеха линии: у каждого цеха свой справочник
  const selLine = ($('#tlLine')?.value || '').trim();
  if (!selLine) {
    container.innerHTML = '<div class="tl-empty">Выберите линию — список потерь зависит от цеха.</div>';
    return;
  }
  const lineWs = getWorkshopIdForLine(selLine);
  const cats = getTopLossesForWorkshop(lineWs);

  if (!cats.length) {
    container.innerHTML = `<div class="tl-empty">Для цеха ${escapeHtml(getWorkshopName(lineWs) || '')} потери не заданы. Добавьте их в Настройках.</div>`;
    return;
  }

  container.innerHTML = cats.map(cat => {
    const items = Array.isArray(cat.items) ? cat.items : [];
    const isExpanded = tlState.expandedCategoryIds.has(cat.id);

    // Есть ли выбранные в этой категории
    const hasSelected = items.some(it => tlState.selectedLossIds.has(it.id));

    // Общий счётчик стандартов категории (уникальные стандарты по всем потерям)
    // — с учётом выбранной линии (если она указана)
    const line = ($('#tlLine')?.value || '').trim();
    const stdIds = new Set();
    items.forEach(it => {
      const standards = getStandards();
      standards.forEach(st => {
        if (st.active === false) return;
        if (line && st.line !== line) return;
        if (Array.isArray(st.topLosses) && st.topLosses.includes(it.id)) {
          stdIds.add(st.id);
        }
      });
    });
    const categoryStdCount = stdIds.size;

    const itemsHtml = items.map(it => {
      const isChecked = tlState.selectedLossIds.has(it.id);
      const stdCount = countStandardsForLoss(it.id);
      const countClass = stdCount === 0 ? 'tl-loss-std-count empty' : 'tl-loss-std-count';
      const countTitle = stdCount === 0
        ? 'Нет стандартов для этой потери'
        : `${stdCount} стандарт(ов)`;

      return `
        <label class="tl-loss-row ${isChecked ? 'checked' : ''}" data-loss-id="${escapeAttr(it.id)}">
          <input type="checkbox" class="tl-loss-checkbox" ${isChecked ? 'checked' : ''}>
          <span class="tl-loss-name">${escapeHtml(it.name)}</span>
          <span class="${countClass}" title="${escapeAttr(countTitle)}">${stdCount}</span>
        </label>
      `;
    }).join('');

    const bodyHtml = items.length
      ? `<div class="tl-category-body">${itemsHtml}</div>`
      : `<div class="tl-category-body"><div class="tl-empty">В категории нет потерь</div></div>`;

    return `
      <div class="tl-category ${isExpanded ? 'expanded' : ''} ${hasSelected ? 'has-selected' : ''}" data-cat-id="${escapeAttr(cat.id)}">
        <div class="tl-category-head" data-cat-toggle="${escapeAttr(cat.id)}">
          <span class="tl-category-toggle">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </span>
          <span class="tl-category-name">${escapeHtml(cat.name)}</span>
          <span class="tl-category-count" title="${categoryStdCount} стандарт(ов) во всей категории">${categoryStdCount}</span>
        </div>
        ${bodyHtml}
      </div>
    `;
  }).join('');

  // Обработчики: клик по заголовку — раскрытие
  container.querySelectorAll('[data-cat-toggle]').forEach(head => {
    head.addEventListener('click', () => {
      const catId = head.dataset.catToggle;
      toggleTopLossCategory(catId);
    });
  });

  // Обработчики: клик по потере — выбор
  container.querySelectorAll('.tl-loss-row').forEach(row => {
    row.addEventListener('click', (e) => {
      // если кликнули прямо по чек-боксу — не мешаем, браузер сам переключит
      if (e.target.matches('input[type="checkbox"]')) return;
      e.preventDefault();
      const lossId = row.dataset.lossId;
      toggleTopLossSelection(lossId);
    });
    const cb = row.querySelector('input[type="checkbox"]');
    if (cb) {
      cb.addEventListener('change', () => {
        const lossId = row.dataset.lossId;
        if (cb.checked) tlState.selectedLossIds.add(lossId);
        else tlState.selectedLossIds.delete(lossId);
        updateTlSelectedCounter();
        renderTopLossCategories();
      });
    }
  });

  updateTlSelectedCounter();

}
/* ----------------------------------------
   Раскрыть/свернуть категорию
   ---------------------------------------- */
function toggleTopLossCategory(catId) {
  if (tlState.expandedCategoryIds.has(catId)) {
    tlState.expandedCategoryIds.delete(catId);
  } else {
    tlState.expandedCategoryIds.add(catId);
  }
  renderTopLossCategories();
}

/* ----------------------------------------
   Выбрать/снять потерю
   ---------------------------------------- */
function toggleTopLossSelection(lossId) {
  if (tlState.selectedLossIds.has(lossId)) {
    tlState.selectedLossIds.delete(lossId);
  } else {
    tlState.selectedLossIds.add(lossId);
  }
  renderTopLossCategories();
}

/* ----------------------------------------
   Счётчик выбранных + активность кнопки
   ---------------------------------------- */
function updateTlSelectedCounter() {
  const counter = $('#tlSelectedCounter');
  const countEl = $('#tlSelectedCount');
  const btn = $('#tlBuildChecklistBtn');
  const n = tlState.selectedLossIds.size;

  if (counter && countEl) {
    countEl.textContent = n;
    counter.style.display = n > 0 ? '' : 'none';
  }
  if (btn) {
    btn.disabled = n === 0;
  }
}

/* ----------------------------------------
   Сброс выбора
   ---------------------------------------- */
function resetTopLossSelection() {
  tlState.selectedLossIds.clear();
  tlState.expandedCategoryIds.clear();
  tlState.openAnswers.clear();
  renderTopLossCategories();
}

/* ----------------------------------------
   Сформировать чек-лист — Этап 4.1
   ---------------------------------------- */
function buildTopLossChecklist() {
  const operator = getCurrentUser() || '—';
  const line = $('#tlLine')?.value || '';
  const lossIds = [...tlState.selectedLossIds];

  if (!line)     return showToast('Укажите линию', true);
  if (!lossIds.length) return showToast('Выберите хотя бы одну потерю', true);

  const { items, lossMap, standardToLosses } = collectStandardsForLosses(lossIds, line);

  if (!items.length) {
    return showToast('По выбранным потерям нет активных стандартов на линии ' + line, true);
  }

  // Сбрасываем раскрытые ответы при новом формировании
  tlState.openAnswers.clear();

  renderTopLossChecklist(items, standardToLosses, lossIds);

  $('#tlSelectView').style.display = 'none';
  $('#tlChecklistView').style.display = 'block';
  $('#tlSummaryView').style.display = 'none';

  window.scrollTo({ top: 0, behavior: 'smooth' });
}
/* ----------------------------------------
   Сбор стандартов по выбранным потерям
   Возвращает:
   - items: массив стандартов (уникальные)
   - lossMap: { [lossId]: [standardId, ...] } — какие стандарты у каждой потери
   - standardToLosses: { [standardId]: [lossId, ...] } — к каким потерям относится стандарт
   ---------------------------------------- */
function collectStandardsForLosses(lossIds, line) {
  const all = getStandards();
  const lossSet = new Set(lossIds);

  // Стандарт подходит, если:
  // - активен
  // - на нужной линии
  // - имеет topLosses, пересекающиеся с выбранными
  const items = [];
  const standardToLosses = {};

  all.forEach(st => {
    if (st.active === false) return;
    if (st.line !== line) return;
    if (!Array.isArray(st.topLosses) || !st.topLosses.length) return;

    const matched = st.topLosses.filter(id => lossSet.has(id));
    if (!matched.length) return;

    items.push(st);
    standardToLosses[st.id] = matched;
  });

  // Сортируем: по OPL, потом по названию
  items.sort((a, b) => {
    const oa = (a.oplNumber || '').toString();
    const ob = (b.oplNumber || '').toString();
    if (oa !== ob) return oa.localeCompare(ob, 'ru');
    return (a.title || '').localeCompare(b.title || '', 'ru');
  });

  // Обратная карта: lossId → [standardId, ...]
  const lossMap = {};
  lossIds.forEach(lid => { lossMap[lid] = []; });
  Object.entries(standardToLosses).forEach(([stdId, lids]) => {
    lids.forEach(lid => {
      if (lossMap[lid]) lossMap[lid].push(stdId);
    });
  });

  return { items, lossMap, standardToLosses };
}

/* ============================================================
   TOP LOSSES: рендер чек-листа — аккордеон
   ============================================================ */

function renderTopLossChecklist(items, standardToLosses, lossIds) {
  const container = $('#tlChecklistView');
  if (!container) return;

  // Кэшируем
  tlState.currentItems = items;
  tlState.currentStandardToLosses = standardToLosses;
  tlState.currentLossIds = lossIds;

  // Все потери
  const allLossObjects = lossIds
    .map(id => findLossById(id))
    .filter(Boolean);

  const MAX_VISIBLE_LOSSES = 3;
  let lossChipsHtml = '';

  if (allLossObjects.length <= MAX_VISIBLE_LOSSES) {
    lossChipsHtml = allLossObjects
      .map(l => `<span class="tl-summary-chip">${escapeHtml(l.name)}</span>`)
      .join('');
  } else {
    const visible = allLossObjects.slice(0, MAX_VISIBLE_LOSSES);
    const hidden = allLossObjects.length - MAX_VISIBLE_LOSSES;
    lossChipsHtml = visible
      .map(l => `<span class="tl-summary-chip">${escapeHtml(l.name)}</span>`)
      .join('');
    lossChipsHtml += `<button type="button" class="tl-summary-chip tl-summary-chip-more"
                              id="tlShowAllLossesBtn"
                              title="Показать все потери">
                        +${hidden}
                      </button>`;
  }

  // Инфо-строка
  const infoLine = `<div class="tl-list-info">
    Показано <strong>${items.length}</strong> ${pluralizeStandards(items.length)}
    по <strong>${lossIds.length}</strong> ${pluralizeLosses(lossIds.length)}
  </div>`;

  // Первый непроверенный — раскроем автоматически
  let firstUncheckedId = null;

  // Рендер карточек — аккордеон
  const itemsHtml = items.map(st => {
    const stdLosses = standardToLosses[st.id] || [];
    const isFirstUnchecked = (firstUncheckedId === null);
    if (isFirstUnchecked) firstUncheckedId = st.id;

    // Мета свёрнутой строки
    const compactMeta = [
      st.oplNumber ? `OPL: ${escapeHtml(st.oplNumber)}` : '',
      st.machine ? `Машина: ${escapeHtml(st.machine)}` : '',
      st.nodePart ? escapeHtml(st.nodePart) : ''
    ].filter(Boolean).join(' · ');

    // Потери
    const lossNames = stdLosses
      .map(id => findLossById(id))
      .filter(Boolean)
      .map(l => l.name);

    const lossesText = lossNames.length
      ? `<div class="tl-item-losses">Относится к: ${lossNames.map(escapeHtml).join(' · ')}</div>`
      : '';

    // Тело: ответ — всегда ОК / Не ОК, независимо от controlType
    const answerBodyHtml = `
      <div class="answer-row">
        <div class="radio-group">
          <label><input type="radio" name="tl_ans_${st.id}" value="OK" data-ans> ОК</label>
          <label><input type="radio" name="tl_ans_${st.id}" value="FAIL" data-ans> Не ОК</label>
        </div>
      </div>`;

    return `
      <div class="cocl-acc-item tl-acc-item" data-std-id="${escapeAttr(st.id)}" data-expanded="false">
        <div class="cocl-acc-header" data-acc-toggle>
          <span class="cocl-status-dot" data-acc-status="unchecked"></span>
          <div class="cocl-acc-title-wrap">
            <div class="cocl-acc-title">${escapeHtml(st.title || '—')}</div>
            <div class="cocl-acc-meta">${compactMeta}</div>
          </div>

          <button type="button" class="cocl-acc-comment-btn" data-comment-btn title="Добавить комментарий">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              <line x1="9" y1="10" x2="15" y2="10"/>
              <line x1="9" y1="14" x2="13" y2="14"/>
            </svg>
          </button>

          <button type="button" class="cocl-acc-view-btn" data-view-btn data-std-id="${escapeAttr(st.id)}" title="Посмотреть стандарт">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
          </button>

          <span class="cocl-acc-caret">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </span>
        </div>

        <div class="cocl-acc-body">
          ${lossesText}
          <div class="tl-answer-block">
            ${answerBodyHtml}
          </div>
          <div class="comment-preview" style="display:none" data-comment-preview></div>
        </div>
      </div>
    `;
  }).join('');

  container.innerHTML = `
    <div class="card tl-header-card">
      <div class="tl-title-row">
        <span class="tl-title-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <circle cx="12" cy="12" r="6"/>
            <circle cx="12" cy="12" r="2"/>
          </svg>
        </span>
        <h1 class="tl-title">TOP Losses</h1>
      </div>

      <div class="tl-losses-bar">
        <span class="tl-losses-bar-label">Потери:</span>
        ${lossChipsHtml}
      </div>

      ${infoLine}

      <div class="tl-hint-card">
        <span class="tl-hint-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="16" x2="12" y2="12"/>
            <line x1="12" y1="8" x2="12.01" y2="8"/>
          </svg>
        </span>
        <div class="tl-hint-text">
          Раскройте стандарт, чтобы оценить его. Отметьте <em>хотя бы 1 стандарт ОК / Не ОК</em>,
          чтобы сохранить результат в Историю.
        </div>
      </div>
    </div>

    <div class="card">
      <div id="tlChecklistContainer">${itemsHtml}</div>
    </div>

    <div class="tl-select-footer" id="tlFooter">
      <div class="tl-footer-buttons">
        <button class="btn btn-secondary" id="tlBackToSelectBtn">← К выбору потерь</button>
        <button class="btn btn-success btn-icon-text" id="tlSaveChecklistBtn" disabled>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
            <polyline points="17 21 17 13 7 13 7 21"/>
            <polyline points="7 3 7 8 15 8"/>
          </svg>
          <span>Зафиксировать результат</span>
        </button>
      </div>
    </div>
  `;

  // Раскрываем первый непроверенный
  if (firstUncheckedId) {
    const firstItem = container.querySelector(`.tl-acc-item[data-std-id="${firstUncheckedId}"]`);
    if (firstItem) expandCoclItem(firstItem, true);
  }

  // Привязка обработчиков
  bindTopLossAccordionEvents();
  updateTlProgressFooter();
}

/* Привязка всех обработчиков внутри списка */
function bindTopLossAccordionEvents() {
  const container = $('#tlChecklistContainer');
  if (!container) return;

  // --- Клик по шапке — раскрыть/свернуть ---
  container.querySelectorAll('[data-acc-toggle]').forEach(head => {
    head.addEventListener('click', (e) => {
      if (e.target.closest('[data-view-btn]')) return;
      if (e.target.closest('[data-comment-btn]')) return;
      const item = head.closest('.tl-acc-item');
      if (!item) return;
      const isExpanded = item.dataset.expanded === 'true';
      if (isExpanded) {
        collapseCoclItem(item);
      } else {
        expandCoclItem(item);
      }
    });
  });

  // --- Глазик ---
  container.querySelectorAll('[data-view-btn]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const stdId = btn.dataset.stdId;
      if (stdId && typeof openStandardView === 'function') openStandardView(stdId);
    });
  });

  // --- Комментарий ---
  container.querySelectorAll('[data-comment-btn]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const item = btn.closest('.tl-acc-item');
      openCommentModal(item);
    });
  });

  // --- Radio ОК / Не ОК ---
  container.querySelectorAll('input[data-ans]').forEach(r => {
    r.addEventListener('change', (e) => {
      const item = e.target.closest('.tl-acc-item');
      const val = e.target.value;
      updateTlItemStatus(item, val === 'OK' ? 'ok' : 'fail');
      updateTlProgressFooter();
    });
  });

  // --- Кнопки футера ---
  $('#tlBackToSelectBtn')?.addEventListener('click', backToTopLossSelect);
  $('#tlSaveChecklistBtn')?.addEventListener('click', saveTopLossCheck);

  // --- Кнопка «+N потерь» ---
  $('#tlShowAllLossesBtn')?.addEventListener('click', () => {
    const allLossObjects = tlState.currentLossIds
      .map(id => findLossById(id))
      .filter(Boolean);
    const names = allLossObjects.map(l => l.name).join('\n');
    alert('Все потери:\n\n' + names);
  });
}

/** Обновить статус свёрнутой строки в TOP Losses */
function updateTlItemStatus(item, status) {
  item.dataset.status = status;
  const dot = item.querySelector('[data-acc-status]');
  if (dot) {
    dot.classList.remove('cocl-status-unchecked', 'cocl-status-ok', 'cocl-status-fail');
    dot.classList.add('cocl-status-' + status);
    dot.dataset.accStatus = status;
  }
}
/* Раскрыть / свернуть блок ответа */
function toggleAnswerBlock(stdId, open) {
  const item = document.querySelector(`.checklist-item[data-std-id="${stdId}"]`);
  if (!item) return;

  if (open) {
    tlState.openAnswers.add(stdId);
    item.classList.add('answer-open');

    const evalBtn = item.querySelector('[data-evaluate-btn]');
    const collapseBtn = item.querySelector('[data-collapse-btn]');
    if (evalBtn) evalBtn.style.display = 'none';
    if (collapseBtn) collapseBtn.style.display = 'inline-flex';
  } else {
    tlState.openAnswers.delete(stdId);
    item.classList.remove('answer-open');

    const evalBtn = item.querySelector('[data-evaluate-btn]');
    const collapseBtn = item.querySelector('[data-collapse-btn]');
    if (evalBtn) evalBtn.style.display = 'inline-flex';
    if (collapseBtn) collapseBtn.style.display = 'none';
  }
}

/* Обновить бейдж «ОК / Не ОК / Значение» рядом с кнопкой Оценить */
function updateItemAnsweredBadge(item) {
  const stdId = item.dataset.stdId;
  const st = getStandards().find(s => s.id === stdId);
  if (!st) return;

  const actionsRow = item.querySelector('.tl-item-actions-row');
  if (!actionsRow) return;

  actionsRow.querySelectorAll('.tl-answered-badge').forEach(b => b.remove());

  let badge = null;

  // Top Losses всегда отвечает ОК / Не ОК (radio), независимо от типа контроля
  const checked = item.querySelector('input[data-ans]:checked');
  if (checked) {
    badge = checked.value === 'OK'
      ? { cls: 'tl-answered-badge-ok', text: '✓ ОК' }
      : { cls: 'tl-answered-badge-fail', text: '✕ Не ОК' };
  }

  if (badge) {
    const el = document.createElement('span');
    el.className = 'tl-answered-badge ' + badge.cls;
    el.textContent = badge.text;
    actionsRow.appendChild(el);
  }
}

/* Прогресс в футере + активность кнопки «Зафиксировать» */
function updateTlProgressFooter() {
  const footer = $('#tlFooter');
  const saveBtn = $('#tlSaveChecklistBtn');
  if (!footer || !saveBtn) return;

  const items = $$('#tlChecklistContainer .tl-acc-item');

  let filled = 0;
  let oks = 0;
  let fails = 0;

  items.forEach(item => {
    const status = item.dataset.status;
    if (status === 'ok') { filled++; oks++; }
    else if (status === 'fail') { filled++; fails++; }
  });

  const total = items.length;
  const pct = total > 0 ? Math.round((filled / total) * 100) : 0;

  footer.querySelectorAll('.tl-footer-progress').forEach(el => el.remove());

  if (filled > 0 && total > 0) {
    const unchecked = total - filled;
    const parts = [`Отмечено: ${filled} / ${total}`];
    if (oks > 0) parts.push(`ОК: ${oks}`);
    if (fails > 0) parts.push(`Не ОК: ${fails}`);
    if (unchecked > 0) parts.push(`не проверено: ${unchecked}`);

    const progressHtml = `
      <div class="tl-footer-progress">
        <div class="progress-bar-outer">
          <div class="progress-bar-inner" style="width:${pct}%"></div>
        </div>
        <div class="progress-text">${parts.join(' · ')}</div>
      </div>
    `;
    footer.insertAdjacentHTML('afterbegin', progressHtml);
    footer.classList.add('tl-footer-with-progress');
  } else {
    footer.classList.remove('tl-footer-with-progress');
  }

  saveBtn.disabled = filled === 0;
}

/* Переключение в режим проверки */
function startTopLossCheck() {
  tlState.checkMode = true;
  // Перерисовываем тот же список, но уже в режиме проверки
  renderTopLossChecklist(
    tlState.currentItems,
    tlState.currentStandardToLosses,
    tlState.currentLossIds
  );
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* Отмена проверки — возврат в режим просмотра */
function cancelTopLossCheck() {
  if (!confirm('Отменить проверку? Введённые ответы будут потеряны.')) return;
  tlState.checkMode = false;
  renderTopLossChecklist(
    tlState.currentItems,
    tlState.currentStandardToLosses,
    tlState.currentLossIds
  );
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ----------------------------------------
   Прогресс для чек-листа TOP Losses
   ---------------------------------------- */
function updateTlChecklistProgress() {
  const items = $$('#tlChecklistContainer .checklist-item');
  const wrap = $('#tlProgressWrap');
  const bar = $('#tlProgressBarInner');
  const percent = $('#tlProgressPercent');
  const text = $('#tlProgressText');

  if (!items.length) {
    if (wrap) wrap.style.display = 'none';
    if (text) text.style.display = 'none';
    return;
  }

  let filled = 0;
  items.forEach(item => {
    const std = getStandards().find(s => s.id === item.dataset.stdId);
    if (!std) return;
    // Top Losses всегда использует radio ОК/Не ОК
    if (item.querySelector('input[data-ans]:checked')) filled++;
  });

  const total = items.length;
  const pct = total > 0 ? Math.round((filled / total) * 100) : 0;

  if (wrap) wrap.style.display = 'flex';
  if (text) {
    text.style.display = 'block';
    text.textContent = `Заполнено ${filled} из ${total} пунктов`;
  }

  if (bar) {
    bar.style.width = pct + '%';
    bar.classList.remove('low', 'mid', 'high', 'done');
    if (pct === 100)     bar.classList.add('done');
    else if (pct >= 67)  bar.classList.add('high');
    else if (pct >= 34)  bar.classList.add('mid');
    else                 bar.classList.add('low');
  }
  if (percent) percent.textContent = pct + '%';
}

/* ----------------------------------------
   Сохранение проверки TOP Losses — Этап 4.2
   ---------------------------------------- */
function saveTopLossCheck() {
  const operator = getCurrentUser() || '—';
  const line = $('#tlLine')?.value || '';
  const lossIds = [...tlState.selectedLossIds];

  // Валидация
  if (!line)     return showToast('Укажите линию', true);
  if (!lossIds.length) return showToast('Не выбрано ни одной потери', true);

  // Собираем ответы
  const items = [];

  $$('#tlChecklistContainer .tl-acc-item').forEach(item => {
    const stdId = item.dataset.stdId;
    const st = getStandards().find(s => s.id === stdId);
    if (!st) return;

    let answer = '—';
    let status = 'UNCHECKED';

    // В TOP Losses всегда radio ОК / Не ОК
    const r = item.querySelector('input[data-ans]:checked');
    if (r) {
      answer = r.value === 'OK' ? 'ОК' : 'Не ОК';
      status = r.value;
    }

    const firstBlock = Array.isArray(st.measurements) && st.measurements[0];
    const mainValue = firstBlock && Array.isArray(firstBlock.points) && firstBlock.points[0]
      ? firstBlock.points[0].value || ''
      : '';

    items.push({
      standardId: st.id,
      number: st.number,
      oplNumber: st.oplNumber,
      machine: st.machine,
      node: st.node,
      nodePart: st.nodePart,
      title: st.title,
      controlType: 'fixed',   // Top Losses — всегда ОК/Не ОК (фиксированный без точек)
      norm: mainValue,
      answer: answer,
      status: status,
      comment: item.dataset.comment || ''
    });
  }); 

  // Сохраняем, только если есть хотя бы один отмеченный ответ
  const checkedCount = items.filter(it => it.status !== 'UNCHECKED').length;
  if (checkedCount === 0) {
    return showToast('Отметьте хотя бы один стандарт', true);
  }

  // Запись в Историю — mode: 'toploss'
  const record = {
    id: uid(),
    timestamp: new Date().toISOString(),
    mode: 'toploss',
    operator,
    line,
    topLosses: lossIds.slice(),
    items
  };

  const hist = getHistory();
  hist.push(record);
  setHistory(hist);
  updateNavHistoryCounter();

  showToast('Проверка сохранена');

  // Показываем экран резюме
  renderTopLossSummary(record);
}

/* ----------------------------------------
   Экран 3 — Резюме проверки
   ---------------------------------------- */
function renderTopLossSummary(record) {
  const container = $('#tlSummaryView');
  if (!container) return;

  // --- Статистика ---
  const selectedLosses = (record.topLosses || [])
    .map(id => findLossById(id))
    .filter(Boolean);

  // Карта: standardId → [lossId, ...]
  const stdToLosses = {};
  record.items.forEach(it => {
    const st = getStandards().find(s => s.id === it.standardId);
    if (st && Array.isArray(st.topLosses)) {
      stdToLosses[it.standardId] = st.topLosses.filter(lid =>
        record.topLosses.includes(lid)
      );
    } else {
      stdToLosses[it.standardId] = [];
    }
  });

  // Статистика по каждой потере
  const lossStats = selectedLosses.map(loss => {
    const relatedItems = record.items.filter(it =>
      (stdToLosses[it.standardId] || []).includes(loss.id)
    );

    const total = relatedItems.length;
    const oks = relatedItems.filter(it => it.status === 'OK').length;
    const fails = relatedItems.filter(it => it.status === 'FAIL').length;
    const unchecked = relatedItems.filter(it => it.status === 'UNCHECKED').length;
    const checkedTotal = oks + fails;
    // «Под контролем» — если все проверенные ОК и нет непроверенных
    const ok = fails === 0 && unchecked === 0 && total > 0;
    const failItems = relatedItems.filter(it => it.status === 'FAIL');

    return { loss, total, oks, fails, unchecked, checkedTotal, ok, failItems };
  });

  const totalItems = record.items.length;
  const totalFails = record.items.filter(it => it.status === 'FAIL').length;
  const totalOks = record.items.filter(it => it.status === 'OK').length;
  const totalUnchecked = record.items.filter(it => it.status === 'UNCHECKED').length;
  const checkedTotal = totalOks + totalFails;
  // Процент ОК — от проверенных
  const percentOk = checkedTotal > 0 ? Math.round((totalOks / checkedTotal) * 100) : 0;
  // Всё под контролем — если нет FAIL и нет непроверенных
  const allOk = totalFails === 0 && totalUnchecked === 0;

  // --- Верх: «щит контроля» с кольцом ---
  const shieldClass = allOk ? 'tl-shield-ok' : 'tl-shield-fail';
  const shieldTitle = allOk ? 'Потери под контролем' : 'Требуют внимания';

  const shieldSubParts = [];
  if (checkedTotal > 0) {
    shieldSubParts.push(`Проверено: <strong>${checkedTotal}</strong> из ${totalItems}`);
  }
  if (totalFails > 0) {
    shieldSubParts.push(`вне нормы: <strong>${totalFails}</strong>`);
  }
  if (totalUnchecked > 0) {
    shieldSubParts.push(`<span class="tl-shield-sub-unchecked">не проверено: ${totalUnchecked}</span>`);
  }
  const shieldSub = shieldSubParts.join(' · ');

  // Чипы-медальоны (первые 20, чтобы не заваливать экран)
  const chipItems = record.items.slice(0, 20);
  const chipsHtml = chipItems.map(it => {
    let cls;
    if (it.status === 'OK')          cls = 'tl-shield-chip-ok';
    else if (it.status === 'FAIL')   cls = 'tl-shield-chip-fail';
    else                             cls = 'tl-shield-chip-unchecked';

    const oplDisplay = it.machine
      ? `${it.oplNumber || it.number || '—'} [${it.machine}]`
      : (it.oplNumber || it.number || '—');
    return `<span class="tl-shield-chip ${cls}" title="${escapeAttr(it.title || '')}">
      <span class="tl-shield-chip-dot"></span>
      ${escapeHtml(oplDisplay)}
    </span>`;
  }).join('');
  const chipMore = record.items.length > 20
    ? `<span class="tl-shield-chip">+${record.items.length - 20}</span>`
    : '';

  // --- Средняя часть: плитки по потерям ---
  const lossTilesHtml = lossStats.map(s => {
    const cls = s.ok ? 'tl-loss-tile-ok' : 'tl-loss-tile-fail';

    const failsHtml = s.failItems.length ? `
      <div class="tl-loss-tile-fails">
        ${s.failItems.map(it => {
          const oplDisplay = it.machine
            ? `${it.oplNumber || it.number || '—'} [${it.machine}]`
            : (it.oplNumber || it.number || '—');
          return `
            <div class="tl-loss-tile-fail-row">
              <span class="tl-loss-tile-fail-opl">${escapeHtml(oplDisplay)}</span>
              <span class="tl-loss-tile-fail-title">${escapeHtml(it.title || '')}</span>
            </div>
          `;
        }).join('')}
      </div>
    ` : '';

    return `
      <div class="tl-loss-tile ${cls}">
        <div class="tl-loss-tile-head">
          <span class="tl-loss-tile-name">${escapeHtml(s.loss.name)}</span>
          <span class="tl-loss-tile-count">
            ${s.checkedTotal === 0
              ? 'не проверено'
              : `${s.oks} OK${s.fails > 0 ? ` · ${s.fails} Не ОК` : ''}${s.unchecked > 0 ? ` · ${s.unchecked} не проверено` : ''}`
            }
          </span>
        </div>
        ${failsHtml}
      </div>
    `;
  }).join('');

  // --- Итоговый HTML ---
  const html = `
    <div class="card tl-summary-card">
      <div class="tl-summary-head">
        <div class="tl-summary-icon tl-summary-icon-ok">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
        </div>
        <div>
          <div class="tl-summary-title">Проверка сохранена</div>
          <div class="tl-summary-sub">
            Оператор: <strong>${escapeHtml(record.operator)}</strong> ·
            Линия: <strong>${escapeHtml(record.line)}</strong> ·
            ${formatDateTime(record.timestamp)}
          </div>
        </div>
      </div>
    </div>

    <!-- Визуальный «щит» с кольцом -->
    <div class="tl-shield ${shieldClass}">
      <div class="tl-shield-ring" style="--percent: ${percentOk}">
        <div class="tl-shield-ring-hole">
          <div class="tl-shield-ring-value">${percentOk}%</div>
          <div class="tl-shield-ring-label">ОК</div>
        </div>
      </div>
      <div class="tl-shield-info">
        <div class="tl-shield-title">${shieldTitle}</div>
        <div class="tl-shield-sub">${shieldSubParts.join(' · ')}</div>
        ${totalFails > 0 ? `
          <div class="tl-shield-journal-warning">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            <span>Есть отклонения. Зафиксируйте их в <strong>Journal Machines</strong>.</span>
          </div>
        ` : ''}
        <div class="tl-shield-chips">
          ${chipsHtml}
          ${chipMore}
        </div>
      </div>
    </div>

    <!-- Плитки по потерям -->
    <div class="card">
      <h2>Детали по потерям</h2>
      <div class="tl-loss-tiles">${lossTilesHtml}</div>
    </div>

    <div class="tl-select-footer">
      <button class="btn btn-secondary" id="tlBackToListBtn">← К списку потерь</button>
      <button class="btn btn-primary btn-icon-text" id="tlCheckAnotherBtn">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="23 4 23 10 17 10"/>
          <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
        </svg>
        <span>Проверить ещё потерю</span>
      </button>
    </div>
  `;

  container.innerHTML = html;

  // Экраны
  $('#tlSelectView').style.display = 'none';
  $('#tlChecklistView').style.display = 'none';
  $('#tlSummaryView').style.display = 'block';

  // Обработчики кнопок
  $('#tlBackToListBtn')?.addEventListener('click', backToTopLossList);
  $('#tlCheckAnotherBtn')?.addEventListener('click', checkAnotherTopLoss);

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ----------------------------------------
   «← К списку потерь» — полный сброс
   ---------------------------------------- */
function backToTopLossList() {
  // Сбрасываем состояние
  tlState.openAnswers.clear();
  tlState.currentItems = [];
  tlState.currentStandardToLosses = {};
  tlState.currentLossIds = [];

  // Очищаем выбранные потери
  tlState.selectedLossIds.clear();
  tlState.expandedCategoryIds.clear();

  // Сбрасываем форму (линия)
  const lnEl = $('#tlLine');
  if (lnEl) lnEl.value = '';

  renderTopLossCategories();

  $('#tlSelectView').style.display = 'block';
  $('#tlChecklistView').style.display = 'none';
  $('#tlSummaryView').style.display = 'none';

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ----------------------------------------
   «Проверить ещё потерю» — сохраняем оператора/смену/линию
   ---------------------------------------- */
function checkAnotherTopLoss() {
  // Сбрасываем состояние
  tlState.openAnswers.clear();
  tlState.currentItems = [];
  tlState.currentStandardToLosses = {};
  tlState.currentLossIds = [];

  // Очищаем только выбранные потери
  tlState.selectedLossIds.clear();
  tlState.expandedCategoryIds.clear();

  // Форму НЕ трогаем: оператор/смена/линия остаются

  renderTopLossCategories();

  $('#tlSelectView').style.display = 'block';
  $('#tlChecklistView').style.display = 'none';
  $('#tlSummaryView').style.display = 'none';

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ----------------------------------------
   Возврат на экран выбора
   ---------------------------------------- */
function backToTopLossSelect() {
  // Сбрасываем раскрытые ответы и кэш
  tlState.openAnswers.clear();
  tlState.currentItems = [];
  tlState.currentStandardToLosses = {};
  tlState.currentLossIds = [];

  $('#tlSelectView').style.display = 'block';
  $('#tlChecklistView').style.display = 'none';
  $('#tlSummaryView').style.display = 'none';
}

/* ----------------------------------------
   Обработчики вкладки TOP Losses
   ---------------------------------------- */
$('#tlResetSelectionBtn')?.addEventListener('click', resetTopLossSelection);
$('#tlBuildChecklistBtn')?.addEventListener('click', buildTopLossChecklist);

/* Смена линии — пересчитываем счётчики и перерисовываем категории */
$('#tlLine')?.addEventListener('change', () => {
  // При смене линии сбрасываем выбранные потери:
  // могло оказаться, что для новой линии у потерь нет стандартов.
  tlState.selectedLossIds.clear();
  renderTopLossCategories();
});
