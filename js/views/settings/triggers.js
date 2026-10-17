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
  const workshops = getWorkshops();

  let openIds = getCtOpenGroups();
  if (openIds === null) { openIds = []; setCtOpenGroups(openIds); }

  // Каждый цех — свой блок со своими триггерами (показываем и пустые)
  container.innerHTML = '<div class="bl-groups">' + workshops.map(ws => {
    const wsTriggers = list.filter(t => t.workshop === ws.id);
    const open = openIds.includes(ws.id);
    return `<div class="bl-group bl-group-workshop ${open ? 'expanded' : ''}">
      <div class="bl-group-head" data-ct-toggle="${escapeAttr(ws.id)}">
        <span class="bl-group-toggle"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg></span>
        <span class="bl-group-name">${escapeHtml(ws.name)}</span>
        <span class="bl-group-count">${wsTriggers.length} триг.</span>
        <button type="button" class="btn btn-secondary btn-sm brands-group-add" data-ct-add="${escapeAttr(ws.id)}" title="Добавить триггер в ${escapeAttr(ws.name)}">+ Триггер</button>
      </div>
      <div class="bl-group-body">${wsTriggers.length
        ? renderCtList(wsTriggers, ws.id)
        : '<div class="tl-cat-empty">Триггеров пока нет</div>'}</div>
    </div>`;
  }).join('') + '</div>';

  container.querySelectorAll('[data-ct-toggle]').forEach(head => {
    head.addEventListener('click', (e) => {
      if (e.target.closest('[data-ct-add]')) return;
      const id = head.dataset.ctToggle;
      let open = getCtOpenGroups() || [];
      if (open.includes(id)) open = open.filter(x => x !== id);
      else open.push(id);
      setCtOpenGroups(open);
      renderCustomTriggersSettings();
    });
  });
  container.querySelectorAll('[data-ct-add]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      openCustomTriggerModal(null, btn.dataset.ctAdd);
    });
  });
  container.querySelectorAll('[data-ct-edit]').forEach(btn => {
    btn.addEventListener('click', () => openCustomTriggerModal(btn.dataset.ctEdit));
  });
  container.querySelectorAll('[data-ct-delete]').forEach(btn => {
    btn.addEventListener('click', () => deleteCustomTrigger(btn.dataset.ctDelete));
  });
}

function renderCtList(arr, workshopId) {
  return arr.map(t => {
    // Часть линии имеет смысл только в SMD
    const partChip = workshopId === 'smd'
      ? (t.part
          ? `<span class="et-part-chip et-part-${escapeAttr(t.part.toLowerCase())}">${escapeHtml(t.part)}</span>`
          : '<span class="tl-loss-ws-chip">любая часть</span>')
      : '';
    return `
      <div class="tl-loss-inline-row" data-trigger-id="${escapeAttr(t.id)}">
        <span class="tl-loss-inline-name">${escapeHtml(t.label)}</span>
        ${partChip}
        <div class="tl-loss-inline-actions">
          <button type="button" class="tl-row-action-btn tl-row-edit-btn" data-ct-edit="${escapeAttr(t.id)}" title="Изменить">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
          <button type="button" class="tl-row-action-btn tl-row-delete-btn" data-ct-delete="${escapeAttr(t.id)}" title="Удалить">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      </div>
    `;
  }).join('');
}

function getCtOpenGroups() {
  try { return JSON.parse(localStorage.getItem('cl_ct_open_groups')) || null; } catch(e) { return null; }
}
function setCtOpenGroups(arr) {
  try { localStorage.setItem('cl_ct_open_groups', JSON.stringify(arr)); } catch(e) {}
}

let currentEditingTriggerId = null;

function openCustomTriggerModal(id, presetWorkshop) {
  const modal = $('#customTriggerModal');
  if (!modal) return;

  currentEditingTriggerId = id || null;

  const titleEl = $('#customTriggerModalTitle');
  const saveBtn = $('#customTriggerModalSave');
  const wsEl = $('#customTriggerModalWorkshop');
  // Цех обязателен — без варианта «все цеха»
  if (wsEl) {
    wsEl.innerHTML = getWorkshops()
      .map(w => `<option value="${escapeAttr(w.id)}">${escapeHtml(w.name)}</option>`).join('');
    wsEl.value = presetWorkshop || 'smd';
  }

  if (id) {
    const t = getCustomTriggers().find(x => x.id === id);
    if (!t) return;
    if (titleEl) titleEl.textContent = 'Изменить триггер';
    if (saveBtn) saveBtn.textContent = 'Сохранить';
    $('#customTriggerModalId').value = t.id;
    $('#customTriggerModalLabel').value = t.label || '';
    $('#customTriggerModalPart').value = t.part || '';
    if (wsEl) wsEl.value = t.workshop || '';
  } else {
    if (titleEl) titleEl.textContent = 'Добавить триггер';
    if (saveBtn) saveBtn.textContent = 'Добавить';
    $('#customTriggerModalId').value = '';
    $('#customTriggerModalLabel').value = '';
    $('#customTriggerModalPart').value = '';
  }
  updateCustomTriggerPartField();

  openModal(modal);
  setTimeout(() => $('#customTriggerModalLabel')?.focus(), 100);
}

/* «Часть линии» в модалке триггера — только для SMD */
function updateCustomTriggerPartField() {
  const field = $('#customTriggerModalPartField');
  const ws = $('#customTriggerModalWorkshop')?.value || '';
  if (field) field.style.display = ws === 'smd' ? '' : 'none';
}
$('#customTriggerModalWorkshop')?.addEventListener('change', updateCustomTriggerPartField);

function closeCustomTriggerModal() {
  closeModal('#customTriggerModal');
  currentEditingTriggerId = null;
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
  showToast('Триггер удалён');
}

$('#addCustomTriggerBtn')?.addEventListener('click', () => openCustomTriggerModal(null));
$('#customTriggerModalClose')?.addEventListener('click', closeCustomTriggerModal);
$('#customTriggerModalCancel')?.addEventListener('click', closeCustomTriggerModal);
$('#customTriggerModal')?.addEventListener('click', (e) => {
  if (e.target.id === 'customTriggerModal') closeCustomTriggerModal();
});

$('#customTriggerModalLabel')?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    $('#customTriggerModalSave')?.click();
  }
});

$('#customTriggerModalSave')?.addEventListener('click', () => {
  const id = $('#customTriggerModalId').value;
  const label = ($('#customTriggerModalLabel').value || '').trim();
  const workshop = ($('#customTriggerModalWorkshop')?.value || '').trim();
  const part = workshop === 'smd' ? $('#customTriggerModalPart').value : '';

  if (!label) return showToast('Введите название триггера', true);
  if (!workshop) return showToast('Выберите цех', true);

  const list = getCustomTriggers();

  // Дубликат по названию — в пределах цеха
  const dup = list.find(t => t.id !== id && t.workshop === workshop && t.label.toLowerCase() === label.toLowerCase());
  if (dup) return showToast('Такой триггер в этом цехе уже есть', true);

  if (id) {
    const t = list.find(x => x.id === id);
    if (!t) return;
    t.label = label;
    t.part = part;
    t.workshop = workshop;
  } else {
    list.push({
      id: 'ct_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      label,
      value: 'ct_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      part,
      workshop
    });
  }

  setCustomTriggers(list);
  renderCustomTriggersSettings();
  if (typeof fillEditorFilters === 'function') fillEditorFilters();
  closeCustomTriggerModal();
  showToast(id ? 'Триггер обновлён' : 'Триггер добавлен');
});

/* Линии, у которых есть хотя бы один бренд */
function getAvailableLines() {
  const lines = getLines();
  const lineBrands = getLineBrands();
  return lines.filter(l => Array.isArray(lineBrands[l]) && lineBrands[l].length > 0);
}

/* Бренды для конкретной линии */
function getBrandsForLine(line) {
  const lb = getLineBrands();
  return Array.isArray(lb[line]) ? lb[line] : [];
}
