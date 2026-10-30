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
  original: null,   // параметр как сохранён (для проверки «старых» значений точек)
  dirty: false,     // есть несохранённые правки
  readOnly: false   // режим просмотра: поля заблокированы, кнопка «Редактировать»
};

/* Открыть страницу: id — параметр (mode 'view' — просмотр, иначе редактирование),
   без id — новый параметр линии редактора */
function openEparamPage(id, mode) {
  let p;
  if (id) {
    const found = getElectronicParams().find(x => x.id === id);
    if (!found) return showToast('Параметр не найден', true);
    p = normalizeElectronicParam(found);
    epPageState.isNew = false;
    epPageState.readOnly = mode === 'view' || !canDo('edit', p.line);
  } else {
    const line = localStorage.getItem('cl_editor_line');
    if (!line) return showToast('Сначала выберите линию', true);
    if (!canDo('edit', line)) return showToast(`Линия ${line} — не вашего участка`, true);
    p = normalizeElectronicParam({ line, controlType: 'variable' });
    p.createdAt = null;
    epPageState.isNew = true;
    epPageState.readOnly = false;
  }
  epPageState.original = epPageState.isNew ? null : JSON.parse(JSON.stringify(p));
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
  epPageState.original = null;
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
  renderStdAck('elec', epPageState.isNew ? null : p);
  renderStdComments('elec', epPageState.isNew ? null : p);
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
  show('#epPageEditBtn', ro && canDo('edit', epPageState.data?.line));
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

  const machines = getMachinesForLine(p.line, p.nodePart);
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
        <button type="button" class="btn btn-accent btn-sm" id="epf_addMachineBtn" title="Добавить машину в список линии">+</button>
      </div>
    </div>
    ${partHtml}
    <div class="sv-full-field-edit">
      <label>Время на проверку (секунд)</label>
      <input type="number" id="epf_durationSec" min="0" step="1"
             value="${escapeAttr(p.durationSec || 0)}" placeholder="30">
      <p class="sv-field-hint">60 сек = 1 мин. Время входит в сумму смены в Чек-листе.</p>
    </div>
    <div class="sv-full-field-edit">
      <label class="required">Тип контроля</label>
      <select id="epf_controlType">
        <option value="fixed"    ${p.controlType === 'fixed'    ? 'selected' : ''}>Фиксированный — ОК / Не ОК</option>
        <option value="variable" ${p.controlType === 'variable' ? 'selected' : ''}>Вариабельный — норма ± допуск</option>
        <option value="interval" ${p.controlType === 'interval' ? 'selected' : ''}>Контролируемый интервал — от … до</option>
      </select>
      <div class="ct-hint" id="epf_typeHint">${controlTypeHintHtml(p.controlType)}</div>
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

/* Блоки «Что считается «ОК»» и «Контроль правильности» — как у механического стандарта:
   таблица брендов × точек; в точке число/норма по типу контроля или метка словами */
function renderEparamNorm(p) {
  const wrap = $('#epNormBlock');
  if (!wrap) return;
  const control = epPageState.readOnly
    ? renderSvBrandBlocksView(p)
    : `<div id="epf_brandBlocksContainer" data-type-id="epf_controlType" data-add-id="epf_addBrandBlockBtn"></div>
       <button type="button" class="btn btn-accent btn-sm" id="epf_addBrandBlockBtn" style="margin-top:8px">+ Добавить бренд</button>`;
  wrap.innerHTML = `
    <div class="sv-content-block">
      <div class="sv-content-block-title">Что считается «ОК»</div>
      <textarea id="epf_normText" rows="3" class="sv-content-textarea"
                placeholder="Например: индикатор горит зелёным, ошибок на панели нет">${escapeHtml(p.normText || '')}</textarea>
    </div>
    <div class="sv-content-block">
      <div class="sv-content-block-title">Контроль правильности</div>
      <div style="margin-bottom:8px"><span class="sv-chip sv-chip-cyan">${escapeHtml(controlTypeLabel(p.controlType))}</span></div>
      ${control}
    </div>`;
  if (!epPageState.readOnly) bindSvControlEvents(p, $('#epf_brandBlocksContainer'));
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
      <div class="sv-full-extra-label">CL относится к</div>
      <div class="sv-full-extra-chips">
        <div class="sv-edit-chips-group" id="epf_appliesToGroup">
          ${chip('ChangeOver', 'type-checkbox-changeover', 'Change Over')}
          ${chip('CL_TO', 'type-checkbox-clto', 'CL в ТО')}
          ${chip('CL_Conversion', 'type-checkbox-clconv', 'CL в Конвертацию')}
        </div>
      </div>
      <p class="ep-hint">Если ничего не выбрано — параметр хранится, но в CL при переходах не показывается.</p>
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
      <button type="button" class="btn btn-accent btn-sm" id="epf_addTopLossBtn" style="margin-top:8px">
        + Выбрать потери
      </button>
    </div>
    <div class="sv-full-extra-block">
      <div class="sv-full-extra-label">Триггеры Change Over</div>
      <div class="sv-full-extra-chips">
        ${triggersHtml || '<span class="sv-full-extra-empty">Триггеры не заданы</span>'}
      </div>
      <button type="button" class="btn btn-accent btn-sm" id="epf_addTriggerBtn" style="margin-top:8px">
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
  if (t.id === 'epf_durationSec') p.durationSec = Math.max(0, parseInt(t.value, 10) || 0);
});

$('#tab-eparam-edit')?.addEventListener('change', (e) => {
  const p = epPageState.data;
  if (!p) return;
  epPageState.dirty = true;
  const t = e.target;
  if (t.id === 'epf_machine') p.machine = t.value;
  if (t.id === 'epf_nodePart') {
    p.nodePart = t.value;
    p.machine = fillMachineSelect($('#epf_machine'), p.line, p.nodePart, p.machine);
  }
  if (t.id === 'epf_active') p.active = t.checked;
  if (t.id === 'epf_controlType') {
    p.controlType = t.value;
    const chip = $('#epNormBlock .sv-chip');
    if (chip) chip.textContent = controlTypeLabel(p.controlType);
  }
  if (t.closest('#epf_appliesToGroup')) {
    t.closest('label')?.classList.toggle('checked', t.checked);
    p.appliesTo = [...$$('#epf_appliesToGroup input:checked')].map(x => x.value);
  }
});

$('#tab-eparam-edit')?.addEventListener('click', (e) => {
  const p = epPageState.data;
  if (!p) return;

  // Таблица точек: добавление / удаление брендов и точек меняет параметр
  if (e.target.closest('#epf_brandBlocksContainer, #epf_addBrandBlockBtn')) epPageState.dirty = true;
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
  const box = $('#epf_brandBlocksContainer');
  const measurements = (box ? getSvTableState(box) : (p.measurements || []))
    .map(m => ({ brand: m.brand, points: m.points.map(pt => ({ value: String(pt.value || '').trim() })) }))
    .filter(m => m.brand || m.points.some(pt => pt.value));

  const paramName = (p.paramName || '').trim();
  const machine = (p.machine || '').trim();
  const isSmd = getWorkshopIdForLine(p.line) === 'smd';

  if (!paramName) return showToast('Укажите описание параметра', true);
  if (!machine)   return showToast('Выберите машину', true);
  if (isSmd && !p.nodePart) return showToast('Выберите часть линии', true);

  // Те же правила, что у механического стандарта: тип ↔ значение, один бренд — одна строка
  const hasPoints = measurements.some(m => m.points.some(pt => pt.value));
  if (p.controlType === 'fixed' && !hasPoints && !(p.normText || '').trim()) {
    return showToast('Опишите, что считается «ОК», или задайте точки', true);
  }
  if ((p.controlType === 'variable' || p.controlType === 'interval') && !hasPoints) {
    return showToast('Заполните хотя бы одну точку контроля', true);
  }
  const brands = measurements.map(m => m.brand || '');
  const dupBrand = brands.find((x, i) => brands.indexOf(x) !== i);
  if (dupBrand !== undefined) return showToast(`Бренд «${dupBrand || REST_BRANDS_LABEL}» добавлен дважды — оставьте одну строку`, true);
  for (const m of measurements) {
    for (const pt of m.points) {
      const err = svPointTypeError(p.controlType, pt.value, epPageState.original);
      if (err) return showToast(err, true);
    }
  }

  const all = getElectronicParams().map(normalizeElectronicParam);
  const dup = all.find(x =>
    x.id !== p.id &&
    x.line === p.line &&
    x.machine === machine &&
    (x.paramName || '').toLowerCase() === paramName.toLowerCase());
  if (dup) return showToast(`Параметр «${paramName}» уже есть на машине ${machine}`, true);
  if (!canDo('edit', p.line)) return showToast(`Линия ${p.line} — не вашего участка: сохранить нельзя`, true);

  const now = new Date().toISOString();
  const existing = all.find(x => x.id === p.id);
  // Всё, что задаётся в других местах (расписание, работа, автор), берём из
  // сохранённой версии — правка на странице не должна их сбрасывать.
  const obj = {
    ...(existing || p),
    machine,
    nodePart: isSmd ? p.nodePart : '',
    paramName,
    durationSec: Math.max(0, Number(p.durationSec) || 0),
    controlType: p.controlType,
    normText: (p.normText || '').trim(),
    measurements,
    appliesTo: p.appliesTo || [],
    triggers: p.triggers || [],
    topLosses: p.topLosses || [],
    active: p.active !== false,
    validation: valReadEdit(existing ? existing.validation : p.validation),
    createdAt: existing?.createdAt || now,
    updatedAt: now
  };

  saveElectronicParam(obj);
  const logId = logRowChange('elec', existing || null, obj);

  const wasNew = epPageState.isNew;
  // Как у механических: после сохранения остаёмся на параметре в режиме просмотра
  openEparamPage(obj.id, 'view');
  if (typeof refreshEditorElecTable === 'function') refreshEditorElecTable();
  showToast(wasNew ? 'Параметр добавлен' : 'Параметр обновлён');
  askChangeReason(logId);
});

