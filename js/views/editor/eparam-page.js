/* ============================================================
   СТРАНИЦА электронного параметра
   #tab-eparam-edit.
   Модуль общего пространства имён: функции и переменные видны
   во всех файлах. Порядок подключения — index.html.
   ============================================================ */

/* ============================================================ */
/* === СТРАНИЦА ЭЛЕКТРОННОГО ПАРАМЕТРА ======================== */
/* ============================================================ */
/* Создание и редактирование E-Param — полная страница в том же
   стиле, что и страница механического стандарта (#tab-eparam-edit).
   В хранилище параметр попадает только по «Сохранить». */

const epPageState = {
  isNew: false,     // параметр ещё не сохранён
  data: null,       // рабочая копия параметра
  dirty: false,     // есть несохранённые правки
  readOnly: false   // режим просмотра: поля заблокированы, кнопка «Редактировать»
};

/* Диапазон нормы бренда: для интервала — min/max, иначе target ± tolerance */
function getEparamNormRange(entry) {
  if (!entry) return null;
  const hasMinMax = entry.min !== '' && entry.min != null && entry.max !== '' && entry.max != null;
  if (hasMinMax) return { min: Number(entry.min), max: Number(entry.max) };
  const t = Number(entry.target), tol = Number(entry.tolerance);
  if (isNaN(t) || isNaN(tol)) return null;
  return { min: t - tol, max: t + tol };
}

/* Подпись нормы бренда для оператора */
function getEparamNormLabel(entry, controlType) {
  if (!entry) return '— норма не задана —';
  const brand = entry.brand || REST_BRANDS_LABEL;
  if (controlType === 'interval') {
    const r = getEparamNormRange(entry);
    return r ? `${brand}: ${r.min} … ${r.max}` : `${brand}: —`;
  }
  return `${brand}: ${entry.target} ± ${entry.tolerance}`;
}

/* Открыть страницу: id — параметр (mode 'view' — просмотр, иначе редактирование),
   без id — новый параметр линии редактора */
function openEparamPage(id, mode) {
  let p;
  if (id) {
    const found = getElectronicParams().find(x => x.id === id);
    if (!found) return showToast('Параметр не найден', true);
    p = normalizeElectronicParam(found);
    epPageState.isNew = false;
    epPageState.readOnly = mode === 'view';
  } else {
    const line = localStorage.getItem('cl_editor_line');
    if (!line) return showToast('Сначала выберите линию', true);
    p = normalizeElectronicParam({ line, controlType: 'variable' });
    p.createdAt = null;
    epPageState.isNew = true;
    epPageState.readOnly = false;
  }
  // Для интервала показываем «от / до» — восстанавливаем их из target ± tolerance
  // Строка без бренда = «Остальные бренды»: в форме — значение '*'
  p.valuesByBrand = p.valuesByBrand.map(v => {
    const r = getEparamNormRange(v);
    return { ...v, brand: v.brand || '*', min: r ? r.min : '', max: r ? r.max : '' };
  });
  if (!p.valuesByBrand.length && p.controlType !== 'fixed') {
    p.valuesByBrand = [{ brand: '', target: '', tolerance: '', min: '', max: '' }];
  }

  epPageState.data = p;
  epPageState.dirty = false;
  switchEparamTab('main');

  if (typeof switchTab === 'function') switchTab('eparam-edit');
  renderEparamPage();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
window.openEparamPage = openEparamPage;

/* Закрыть страницу и вернуться к таблице параметров */
function closeEparamPage(force) {
  if (!force && epPageState.dirty &&
      !confirm('Выйти без сохранения? Изменения не будут сохранены.')) return;
  epPageState.data = null;
  epPageState.isNew = false;
  epPageState.dirty = false;
  epPageState.readOnly = false;
  if (typeof switchTab === 'function') switchTab('editor');
  if (typeof switchEditorModeInline === 'function') switchEditorModeInline('elec');
}

/* Главный рендер страницы */
function renderEparamPage() {
  const p = epPageState.data;
  if (!p) return;

  const titleEl = $('#epPageTitle');
  if (titleEl) {
    titleEl.textContent = epPageState.isNew
      ? (p.paramName || 'Новый электронный параметр')
      : (p.paramName || 'Электронный параметр');
  }

  const valBox = $('#epValidation');
  if (valBox) valBox.innerHTML = epPageState.isNew ? '' : valBannerHtml(p, 'elec');

  // Крошки: Цех › Участок (Блок) › Линия
  const crumbs = $('#epPageCrumbs');
  if (crumbs) {
    const ctx = getBlockForLine(p.line);
    const parts = [];
    if (ctx?.workshop) parts.push(`<span class="sv-full-crumb">${escapeHtml(ctx.workshop.name)}</span>`);
    if (ctx?.area) parts.push(`<span class="sv-full-crumb">${escapeHtml(ctx.area.name + (ctx.block ? ` (${ctx.block.name})` : ''))}</span>`);
    parts.push(`<span class="sv-full-crumb-current">${escapeHtml(p.line)}</span>`);
    if (p.machine) parts.push(`<span class="sv-full-crumb-current">${escapeHtml(p.machine)}</span>`);
    crumbs.innerHTML = parts.join('<span class="sv-full-crumb-sep">›</span>');
  }

  renderEparamMainFields(p);
  renderEparamNorm(p);
  renderEparamRelated(p);
  renderEparamExtra(p);
  renderEparamHistory(p);
  renderEparamStubs();
  const tabs = $('#epTabs');
  if (tabs) tabs.style.display = epPageState.isNew ? 'none' : '';
  applyEparamMode();
}

/* Просмотр: поля главной вкладки заблокированы, вместо «Сохранить / Отмена» — «Редактировать» */
function applyEparamMode() {
  const ro = epPageState.readOnly;
  // Поля блокируем, кнопки действий («+ Добавить…», ✕) скрываем — как в просмотре механического стандарта
  $$('#epPaneMain input, #epPaneMain select, #epPaneMain textarea').forEach(el => { el.disabled = ro; });
  $('#tab-eparam-edit')?.classList.toggle('ep-readonly', ro);
  const show = (id, on) => { const el = $(id); if (el) el.style.display = on ? '' : 'none'; };
  show('#epPageSaveBtn', !ro);
  show('#epPageCancelBtn', !ro);
  show('#epPageEditBtn', ro);
}

/* История изменений ЭТОГО параметра — записи листа изменений (cl_change_log_v1).
   У нового параметра вкладок нет: истории ещё не существует. */
function renderEparamHistory(p) {
  const rows = epPageState.isNew ? [] : getChangeLogForRef('elec', p.id).reverse();   // новые сверху
  const badge = $('#epHistoryCount');
  if (badge) badge.textContent = rows.length;
  const wrap = $('#epHistoryWrap');
  if (wrap) wrap.innerHTML = changeHistoryHtml(rows);
}

/* Заглушки вкладок «Ознакомление» и «Комментарии» — как на странице стандарта */
function renderEparamStubs() {
  const stub = (id, icon, text) => {
    const wrap = $(id);
    if (!wrap) return;
    wrap.innerHTML = `
      <div class="sv-full-empty-table">
        <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${icon}</svg>
        <div>${text}</div>
      </div>`;
  };
  stub('#epAckTableWrap',
    '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>',
    'Раздел «Ознакомление» в разработке');
  stub('#epCommentsTableWrap',
    '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
    'Раздел «Комментарии» в разработке');
}

/* Переключение вкладок страницы параметра */
function switchEparamTab(tabName) {
  document.querySelectorAll('#epTabs .sv-full-tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.epTab === tabName);
  });
  const panes = { main: 'epPaneMain', ack: 'epPaneAck', history: 'epPaneHistory', comments: 'epPaneComments' };
  Object.entries(panes).forEach(([key, id]) => {
    const el = document.getElementById(id);
    if (el) el.style.display = (key === tabName) ? '' : 'none';
  });
}

/* Основная информация */
function renderEparamMainFields(p) {
  const wrap = $('#epMainFields');
  if (!wrap) return;

  const machines = getMachinesForLine(p.line);
  const machineOpts = ['<option value="">— выберите —</option>']
    .concat(p.machine && !machines.includes(p.machine)
      ? [`<option value="${escapeAttr(p.machine)}" selected>${escapeHtml(p.machine)} (не в списке)</option>`]
      : [])
    .concat(machines.map(m =>
      `<option value="${escapeAttr(m)}"${m === p.machine ? ' selected' : ''}>${escapeHtml(m)}</option>`))
    .join('');

  const isSmd = getWorkshopIdForLine(p.line) === 'smd';
  const partHtml = isSmd ? `
    <div class="sv-full-field-edit">
      <label class="required">Часть линии</label>
      <select id="epf_nodePart">
        <option value="">— выберите —</option>
        <option value="Maker" ${p.nodePart === 'Maker' ? 'selected' : ''}>Maker</option>
        <option value="Packer" ${p.nodePart === 'Packer' ? 'selected' : ''}>Packer</option>
      </select>
    </div>` : '';

  wrap.innerHTML = `
    <div class="sv-full-field-edit">
      <label class="required">Описание параметра</label>
      <input type="text" id="epf_paramName" value="${escapeAttr(p.paramName || '')}"
             placeholder="Например: Давление клея, бар">
    </div>
    <div class="sv-full-field-edit">
      <label class="required">Машина</label>
      <div class="sv-field-with-btn">
        <select id="epf_machine">${machineOpts}</select>
        <button type="button" class="btn btn-secondary btn-sm" id="epf_addMachineBtn" title="Добавить машину в список линии">+</button>
      </div>
    </div>
    ${partHtml}
    <div class="sv-full-field-edit">
      <label class="required">Тип контроля</label>
      <select id="epf_controlType">
        <option value="fixed"    ${p.controlType === 'fixed'    ? 'selected' : ''}>Фиксированный — ОК / Не ОК</option>
        <option value="variable" ${p.controlType === 'variable' ? 'selected' : ''}>Вариабельный — норма ± допуск</option>
        <option value="interval" ${p.controlType === 'interval' ? 'selected' : ''}>Контролируемый интервал — от … до</option>
      </select>
    </div>
    <div class="sv-full-field-edit">
      <label>Статус</label>
      <label class="sv-force-co">
        <input type="checkbox" id="epf_active" ${p.active !== false ? 'checked' : ''}>
        <span>Активен</span>
      </label>
    </div>
  `;
}

/* Блок «Норма»: текст для fixed, таблица брендов для variable / interval */
function renderEparamNorm(p) {
  const wrap = $('#epNormBlock');
  if (!wrap) return;

  if (p.controlType === 'fixed') {
    wrap.innerHTML = `
      <div class="sv-content-block">
        <div class="sv-content-block-title">Что считается «ОК»</div>
        <textarea id="epf_normText" rows="3" class="sv-content-textarea"
                  placeholder="Например: индикатор горит зелёным, ошибок на панели нет">${escapeHtml(p.normText || '')}</textarea>
      </div>
    `;
    return;
  }

  const isInterval = p.controlType === 'interval';
  const lineBrands = getBrandsForLine(p.line);
  const rows = p.valuesByBrand.length ? p.valuesByBrand : [];

  const brandSelect = (value) => {
    const opts = ['<option value="">— бренд —</option>',
      `<option value="*"${value === '*' ? ' selected' : ''}>${REST_BRANDS_LABEL}</option>`]
      .concat(value && value !== '*' && !lineBrands.includes(value)
        ? [`<option value="${escapeAttr(value)}" selected>${escapeHtml(value)}</option>`]
        : [])
      .concat(lineBrands.map(b =>
        `<option value="${escapeAttr(b)}"${b === value ? ' selected' : ''}>${escapeHtml(b)}</option>`));
    return `<select data-ep-brand>${opts.join('')}</select>`;
  };

  const head = isInterval
    ? '<th>Бренд</th><th>От</th><th>До</th><th></th>'
    : '<th>Бренд</th><th>Норма</th><th>Допуск ±</th><th>Диапазон</th><th></th>';

  const body = rows.map((r, idx) => {
    const removeBtn = `
      <button type="button" class="ep-row-remove" data-ep-remove="${idx}" title="Удалить бренд">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>`;
    if (isInterval) {
      return `
        <tr data-ep-row="${idx}">
          <td>${brandSelect(r.brand)}</td>
          <td><input type="number" step="any" data-ep-min value="${escapeAttr(r.min ?? '')}" placeholder="от"></td>
          <td><input type="number" step="any" data-ep-max value="${escapeAttr(r.max ?? '')}" placeholder="до"></td>
          <td class="ep-row-actions">${removeBtn}</td>
        </tr>`;
    }
    const range = getEparamNormRange(r);
    const rangeText = (r.target !== '' && r.tolerance !== '' && range) ? `${range.min} … ${range.max}` : '—';
    return `
      <tr data-ep-row="${idx}">
        <td>${brandSelect(r.brand)}</td>
        <td><input type="number" step="any" data-ep-target value="${escapeAttr(r.target ?? '')}" placeholder="норма"></td>
        <td><input type="number" step="any" min="0" data-ep-tolerance value="${escapeAttr(r.tolerance ?? '')}" placeholder="±"></td>
        <td class="ep-range" data-ep-range>${escapeHtml(rangeText)}</td>
        <td class="ep-row-actions">${removeBtn}</td>
      </tr>`;
  }).join('');

  const emptyRow = `<tr><td colspan="${isInterval ? 4 : 5}" class="ep-table-empty">Добавьте бренд, для которого задана норма</td></tr>`;

  wrap.innerHTML = `
    <div class="sv-content-block">
      <div class="sv-content-block-title">${isInterval ? 'Интервал по брендам' : 'Норма и допуск по брендам'}</div>
      ${lineBrands.length ? '' : '<p class="ep-hint">У линии нет брендов — добавьте их в «Настройки → Бренды для каждой линии».</p>'}
      <div class="ep-table-wrap">
        <table class="ep-table">
          <thead><tr>${head}</tr></thead>
          <tbody>${body || emptyRow}</tbody>
        </table>
      </div>
      <button type="button" class="btn btn-secondary btn-sm ep-add-row" id="epf_addBrandRow">+ Добавить бренд</button>
    </div>
  `;
}

/* Снять строки таблицы брендов из DOM в рабочую копию */
function syncEparamRowsFromDom() {
  const p = epPageState.data;
  if (!p) return;
  const tbody = $('#epNormBlock tbody');
  if (!tbody) return;
  const rows = [];
  tbody.querySelectorAll('tr[data-ep-row]').forEach(tr => {
    const val = (sel) => {
      const el = tr.querySelector(sel);
      return el ? el.value.trim() : '';
    };
    rows.push({
      brand: val('[data-ep-brand]'),
      target: val('[data-ep-target]'),
      tolerance: val('[data-ep-tolerance]'),
      min: val('[data-ep-min]'),
      max: val('[data-ep-max]')
    });
  });
  // Строки одного типа хранят только свои поля — остальные сохраняем из прошлой копии
  p.valuesByBrand = rows.map((r, i) => {
    const prev = p.valuesByBrand[i] || {};
    if (p.controlType === 'interval') return { ...prev, brand: r.brand, min: r.min, max: r.max };
    return { ...prev, brand: r.brand, target: r.target, tolerance: r.tolerance };
  });
}

/* Связанные объекты */
function renderEparamRelated(p) {
  const wrap = $('#epRelated');
  if (!wrap) return;
  const ctx = getBlockForLine(p.line);
  const row = (label, value) => {
    const isEmpty = !value || !String(value).trim();
    return `
      <div class="sv-full-related-row">
        <span class="sv-full-related-label">${escapeHtml(label)}</span>
        <span class="sv-full-related-value ${isEmpty ? 'sv-empty' : ''}">${isEmpty ? '—' : escapeHtml(value)}</span>
      </div>`;
  };
  wrap.innerHTML = `
    ${row('Цех', ctx?.workshop?.name)}
    ${row('Участок', ctx?.area ? ctx.area.name + (ctx.block ? ` (${ctx.block.name})` : '') : '')}
    ${row('Линия', p.line)}
    ${row('Автор', p.author)}
    ${row('Дата создания', formatDateTime(p.createdAt))}
    ${row('Последнее обновление', formatDateTime(p.updatedAt))}
  `;
}

/* Применяемость и триггеры — как на странице стандарта */
function renderEparamExtra(p) {
  const wrap = $('#epExtra');
  if (!wrap) return;
  const applies = Array.isArray(p.appliesTo) ? p.appliesTo : [];
  const chip = (value, cls, label) => `
    <label class="type-checkbox ${cls} ${applies.includes(value) ? 'checked' : ''}">
      <input type="checkbox" value="${value}" ${applies.includes(value) ? 'checked' : ''}>
      <span>${label}</span>
    </label>`;
  const triggersHtml = renderTriggerChipsEditable(p.triggers || []);

  wrap.innerHTML = `
    ${valEditBlockHtml(p, epPageState.isNew)}
    <div class="sv-full-extra-block">
      <div class="sv-full-extra-label">Применять к</div>
      <div class="sv-full-extra-chips">
        <div class="sv-edit-chips-group" id="epf_appliesToGroup">
          ${chip('ChangeOver', 'type-checkbox-changeover', 'Change Over')}
          ${chip('CL_TO', 'type-checkbox-clto', 'CL в ТО')}
          ${chip('CL_Conversion', 'type-checkbox-clconv', 'CL в Конвертацию')}
        </div>
      </div>
      <p class="ep-hint">Если ничего не выбрано — параметр хранится, но в проверках COCL не показывается.</p>
    </div>
    <div class="sv-full-extra-block">
      <div class="sv-full-extra-label">Top Losses</div>
      <div class="sv-full-extra-chips">
        ${(p.topLosses || []).map(id => {
          const l = findLossById(id);
          return l ? `<span class="ep-tl-chip">${escapeHtml(l.name)}
            <button type="button" class="ep-tl-remove" data-remove-toploss="${escapeAttr(id)}" title="Убрать">✕</button></span>` : '';
        }).join('') || '<span class="sv-full-extra-empty">Потери не выбраны</span>'}
      </div>
      <button type="button" class="btn btn-secondary btn-sm" id="epf_addTopLossBtn" style="margin-top:8px">
        + Выбрать потери
      </button>
    </div>
    <div class="sv-full-extra-block">
      <div class="sv-full-extra-label">Триггеры Change Over</div>
      <div class="sv-full-extra-chips">
        ${triggersHtml || '<span class="sv-full-extra-empty">Триггеры не заданы</span>'}
      </div>
      <button type="button" class="btn btn-secondary btn-sm" id="epf_addTriggerBtn" style="margin-top:8px">
        + Добавить триггер
      </button>
    </div>
  `;
}

/* --- Ввод на странице: всё сразу в рабочую копию --- */
$('#tab-eparam-edit')?.addEventListener('input', (e) => {
  const p = epPageState.data;
  if (!p) return;
  epPageState.dirty = true;
  const t = e.target;
  if (t.id === 'epf_paramName') {
    p.paramName = t.value;
    const titleEl = $('#epPageTitle');
    if (titleEl) titleEl.textContent = t.value || (epPageState.isNew ? 'Новый электронный параметр' : 'Электронный параметр');
  }
  if (t.id === 'epf_normText') p.normText = t.value;
  // Живой пересчёт диапазона «норма ± допуск»
  const tr = t.closest('tr[data-ep-row]');
  if (tr && tr.querySelector('[data-ep-range]')) {
    const target = tr.querySelector('[data-ep-target]')?.value;
    const tol = tr.querySelector('[data-ep-tolerance]')?.value;
    const r = getEparamNormRange({ target, tolerance: tol });
    tr.querySelector('[data-ep-range]').textContent =
      (target !== '' && tol !== '' && r) ? `${r.min} … ${r.max}` : '—';
  }
});

$('#tab-eparam-edit')?.addEventListener('change', (e) => {
  const p = epPageState.data;
  if (!p) return;
  epPageState.dirty = true;
  const t = e.target;
  if (t.id === 'epf_machine') p.machine = t.value;
  if (t.id === 'epf_nodePart') p.nodePart = t.value;
  if (t.id === 'epf_active') p.active = t.checked;
  if (t.id === 'epf_controlType') {
    syncEparamRowsFromDom();
    p.controlType = t.value;
    // При смене типа переносим норму: «норма ± допуск» ↔ «от … до»
    const empty = (v) => v === '' || v == null;
    p.valuesByBrand = p.valuesByBrand.map(r => {
      if (p.controlType === 'interval' && empty(r.min) && empty(r.max) &&
          !empty(r.target) && !empty(r.tolerance)) {
        const range = getEparamNormRange({ target: r.target, tolerance: r.tolerance });
        return range ? { ...r, min: range.min, max: range.max } : r;
      }
      if (p.controlType === 'variable' && empty(r.target) && empty(r.tolerance) &&
          !empty(r.min) && !empty(r.max)) {
        const min = Number(r.min), max = Number(r.max);
        return { ...r, target: (min + max) / 2, tolerance: (max - min) / 2 };
      }
      return r;
    });
    if (p.controlType !== 'fixed' && !p.valuesByBrand.length) {
      p.valuesByBrand = [{ brand: '', target: '', tolerance: '', min: '', max: '' }];
    }
    renderEparamNorm(p);
  }
  if (t.closest('#epf_appliesToGroup')) {
    t.closest('label')?.classList.toggle('checked', t.checked);
    p.appliesTo = [...$$('#epf_appliesToGroup input:checked')].map(x => x.value);
  }
});

$('#tab-eparam-edit')?.addEventListener('click', (e) => {
  const p = epPageState.data;
  if (!p) return;

  if (e.target.closest('#epf_addBrandRow')) {
    syncEparamRowsFromDom();
    p.valuesByBrand.push({ brand: '', target: '', tolerance: '', min: '', max: '' });
    epPageState.dirty = true;
    renderEparamNorm(p);
    return;
  }
  const removeBtn = e.target.closest('[data-ep-remove]');
  if (removeBtn) {
    syncEparamRowsFromDom();
    p.valuesByBrand.splice(Number(removeBtn.dataset.epRemove), 1);
    epPageState.dirty = true;
    renderEparamNorm(p);
    return;
  }
  if (e.target.closest('#epf_addMachineBtn')) {
    openQuickAddMachineModal({
      line: p.line,
      onAdded: (name) => {
        p.machine = name;
        epPageState.dirty = true;
        renderEparamMainFields(p);
      }
    });
    return;
  }
  const removeTrigger = e.target.closest('[data-remove-trigger]');
  if (removeTrigger) {
    e.preventDefault();
    p.triggers = (p.triggers || []).filter(v => v !== removeTrigger.dataset.removeTrigger);
    epPageState.dirty = true;
    renderEparamExtra(p);
    return;
  }
  const removeLoss = e.target.closest('[data-remove-toploss]');
  if (removeLoss) {
    e.preventDefault();
    p.topLosses = (p.topLosses || []).filter(v => v !== removeLoss.dataset.removeToploss);
    epPageState.dirty = true;
    renderEparamExtra(p);
    return;
  }
  if (e.target.closest('#epf_addTopLossBtn')) {
    openTopLossPickerFor({
      workshopId: getWorkshopIdForLine(p.line),
      selected: p.topLosses || [],
      onApply: (ids) => {
        p.topLosses = ids;
        epPageState.dirty = true;
        renderEparamExtra(p);
      }
    });
    return;
  }
  if (e.target.closest('#epf_addTriggerBtn')) {
    openTriggerPickerModal({
      workshopId: getWorkshopIdForLine(p.line),
      part: p.nodePart || '',
      selected: p.triggers || [],
      onApply: (values) => {
        p.triggers = values;
        epPageState.dirty = true;
        renderEparamExtra(p);
      }
    });
  }
});

$('#epTabs')?.addEventListener('click', (e) => {
  const btn = e.target.closest('.sv-full-tab-btn');
  if (btn) switchEparamTab(btn.dataset.epTab);
});
$('#epAckMarkBtn')?.addEventListener('click', () => showToast('Функция «Ознакомление» в разработке', true));
$('#epAddCommentBtn')?.addEventListener('click', () => showToast('Функция «Комментарии» в разработке', true));
$('#epPageBackBtn')?.addEventListener('click', () => closeEparamPage(false));
$('#epPageCancelBtn')?.addEventListener('click', () => closeEparamPage(false));
$('#epPageEditBtn')?.addEventListener('click', () => {
  epPageState.readOnly = false;
  renderEparamPage();
});

/* --- Сохранение --- */
$('#epPageSaveBtn')?.addEventListener('click', () => {
  const p = epPageState.data;
  if (!p) return;
  syncEparamRowsFromDom();

  const paramName = (p.paramName || '').trim();
  const machine = (p.machine || '').trim();
  const isSmd = getWorkshopIdForLine(p.line) === 'smd';

  if (!paramName) return showToast('Укажите описание параметра', true);
  if (!machine)   return showToast('Выберите машину', true);
  if (isSmd && !p.nodePart) return showToast('Выберите часть линии', true);

  let valuesByBrand = [];
  if (p.controlType === 'fixed') {
    if (!(p.normText || '').trim()) return showToast('Опишите, что считается «ОК»', true);
    const normErr = normTypeError('fixed', p.normText);
    if (normErr) return showToast(normErr, true);
  } else {
    const filled = p.valuesByBrand.filter(r =>
      r.brand || r.target !== '' || r.tolerance !== '' || r.min !== '' || r.max !== '');
    for (const r of filled) {
      if (!r.brand) return showToast('Выберите бренд в каждой строке нормы', true);
      if (p.controlType === 'interval') {
        if (r.min === '' || r.max === '' || !Number.isFinite(Number(r.min)) || !Number.isFinite(Number(r.max))) {
          return showToast(`Бренд ${r.brand === '*' ? REST_BRANDS_LABEL : r.brand}: укажите числа «от» и «до»`, true);
        }
        if (Number(r.min) > Number(r.max)) return showToast(`Бренд ${r.brand === '*' ? REST_BRANDS_LABEL : r.brand}: «от» больше, чем «до»`, true);
      } else {
        if (r.target === '' || r.tolerance === '' || !Number.isFinite(Number(r.target)) || !Number.isFinite(Number(r.tolerance))) {
          return showToast(`Бренд ${r.brand === '*' ? REST_BRANDS_LABEL : r.brand}: укажите числа нормы и допуска`, true);
        }
        if (Number(r.tolerance) < 0) return showToast(`Бренд ${r.brand === '*' ? REST_BRANDS_LABEL : r.brand}: допуск не может быть отрицательным`, true);
      }
    }
    if (!filled.length) return showToast('Добавьте хотя бы один бренд с нормой', true);
    const brands = filled.map(r => r.brand);
    const dupBrand = brands.find((b, i) => brands.indexOf(b) !== i);
    if (dupBrand) return showToast(`Бренд ${dupBrand === '*' ? REST_BRANDS_LABEL : dupBrand} указан дважды`, true);

    // Интервал хранится и как min/max, и как target ± tolerance —
    // так его понимают проверка, Чек-лист и экспорт в Excel.
    valuesByBrand = filled.map(r => {
      const brand = r.brand === '*' ? '' : r.brand;   // «Остальные бренды»
      if (p.controlType === 'interval') {
        const min = Number(r.min), max = Number(r.max);
        return { brand, min, max, target: (min + max) / 2, tolerance: (max - min) / 2 };
      }
      return { brand, target: Number(r.target), tolerance: Number(r.tolerance) };
    });
  }

  const all = getElectronicParams().map(normalizeElectronicParam);
  const dup = all.find(x =>
    x.id !== p.id &&
    x.line === p.line &&
    x.machine === machine &&
    (x.paramName || '').toLowerCase() === paramName.toLowerCase());
  if (dup) return showToast(`Параметр «${paramName}» уже есть на машине ${machine}`, true);

  const now = new Date().toISOString();
  const existing = all.find(x => x.id === p.id);
  // Всё, что задаётся в других местах (расписание, работа, автор), берём из
  // сохранённой версии — правка на странице не должна их сбрасывать.
  const obj = {
    ...(existing || p),
    machine,
    nodePart: isSmd ? p.nodePart : '',
    paramName,
    controlType: p.controlType,
    normText: p.controlType === 'fixed' ? p.normText.trim() : '',
    valuesByBrand,
    appliesTo: p.appliesTo || [],
    triggers: p.triggers || [],
    topLosses: p.topLosses || [],
    active: p.active !== false,
    validation: valReadEdit(existing ? existing.validation : p.validation),
    createdAt: existing?.createdAt || now,
    updatedAt: now
  };

  const idx = all.findIndex(x => x.id === p.id);
  if (idx !== -1) all[idx] = obj;
  else all.push(obj);
  setElectronicParams(all);
  const logId = logRowChange('elec', existing || null, obj);

  const wasNew = epPageState.isNew;
  closeEparamPage(true);
  if (typeof refreshEditorElecTable === 'function') refreshEditorElecTable();
  showToast(wasNew ? 'Параметр добавлен' : 'Параметр обновлён');
  askChangeReason(logId);
});

