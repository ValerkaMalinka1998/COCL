/* ============================================================
   НАСТРОЙКИ: блоки линий
   Модуль общего пространства имён: функции и переменные видны
   во всех файлах. Порядок подключения — index.html.
   ============================================================ */

/* ============================================================
   ВКЛАДКА НАСТРОЙКИ
   ============================================================ */
function renderSettings() {
  renderPhotoStorageSettings();
  renderBlocksSettings();
  renderElectronicShiftSettings();
  renderLineMachinesSettings();
  renderTopLossesSettings();
  renderBrandsSettings();
  renderCustomTriggersSettings();
  renderLineBrandsSettings();
  renderOperatorsSettings();
}
/* ============================================================
   БЛОКИ ЛИНИЙ — сворачиваемые группы Цех → Участок
   ============================================================ */
function renderBlocksSettings() {
  const list = $('#blocksList');
  if (!list) return;

  const workshops = getWorkshops();
  if (!workshops.length) {
    list.innerHTML = '<div class="empty-state">Цехов нет. Структура производства пуста.</div>';
    return;
  }

  // Открытые группы
  let openIds = getBlOpenGroups();
  if (openIds === null) {
    openIds = [];
    setBlOpenGroups(openIds);
  }
  const isOpen = (id) => openIds.includes(id);

  let html = '';

  // --- Тулбар: только кнопка "Развернуть всё" ---
  const allGroupIds = [];
  workshops.forEach(w => {
    allGroupIds.push('ws:' + w.id);
    (w.areas || []).forEach(a => allGroupIds.push('ar:' + a.id));
  });
  const allExpanded = allGroupIds.length > 0 && allGroupIds.every(id => openIds.includes(id));

  html += `
    <div class="bl-toolbar">
      <button type="button" class="btn btn-secondary btn-sm bl-toggle-all-btn" id="blToggleAllBtn">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" id="blToggleAllIcon">
          ${allExpanded
            ? '<polyline points="17 11 12 6 7 11"/><polyline points="17 18 12 13 7 18"/>'
            : '<polyline points="7 13 12 18 17 13"/><polyline points="7 6 12 11 17 6"/>'}
        </svg>
        <span id="blToggleAllLabel">${allExpanded ? 'Свернуть всё' : 'Развернуть всё'}</span>
      </button>
    </div>
  `;

  html += '<div class="bl-groups">';

  workshops.forEach(workshop => {
    const areas = (workshop.areas || []);
    if (!areas.length) return;

    const workshopId = 'ws:' + workshop.id;
    const workshopOpen = isOpen(workshopId);

    // Считаем общее число блоков и линий в цехе
    let workshopBlockCount = 0;
    let workshopLineCount = 0;
    areas.forEach(a => {
      if (Array.isArray(a.blocks)) {
        workshopBlockCount += a.blocks.length;
        a.blocks.forEach(b => {
          workshopLineCount += (b.lines || []).length;
        });
      } else {
        workshopLineCount += (a.lines || []).length;
      }
    });

    // Итоговая подпись цеха
    const wsSubtitleParts = [];
    if (workshopBlockCount > 0) {
      wsSubtitleParts.push(`${workshopBlockCount} блок.`);
    }
    wsSubtitleParts.push(`${workshopLineCount} ${pluralizeLines(workshopLineCount)}`);

    html += `
      <div class="bl-group bl-group-workshop ${workshopOpen ? 'expanded' : ''}" data-group-id="${escapeAttr(workshopId)}">
        <div class="bl-group-head" data-group-toggle="${escapeAttr(workshopId)}">
          <span class="bl-group-toggle">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </span>
          <span class="bl-group-name">${escapeHtml(workshop.name)}</span>
          <span class="bl-group-count">${wsSubtitleParts.join(' · ')}</span>
        </div>
        <div class="bl-group-body">
    `;

    // Внутри цеха — участки
    areas.forEach(area => {
      const areaId = 'ar:' + area.id;
      const areaOpen = isOpen(areaId);

      let areaBlockCount = 0;
      let areaLineCount = 0;
      if (Array.isArray(area.blocks)) {
        areaBlockCount = area.blocks.length;
        area.blocks.forEach(b => {
          areaLineCount += (b.lines || []).length;
        });
      } else {
        areaLineCount = (area.lines || []).length;
      }

      const areaSubtitle = areaBlockCount > 0
        ? `${areaBlockCount} блок. · ${areaLineCount} ${pluralizeLines(areaLineCount)}`
        : `${areaLineCount} ${pluralizeLines(areaLineCount)} (без блоков)`;

      html += `
        <div class="bl-group bl-group-area ${areaOpen ? 'expanded' : ''}" data-group-id="${escapeAttr(areaId)}">
          <div class="bl-group-head bl-group-area-head" data-group-toggle="${escapeAttr(areaId)}">
            <span class="bl-group-toggle">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </span>
            <span class="bl-group-name">${escapeHtml(area.name)}</span>
            <span class="bl-group-count">${areaSubtitle}</span>
          </div>
          <div class="bl-group-body">
      `;

      if (Array.isArray(area.blocks)) {
        // Участок с делением на блоки (SMD/FMD)
        if (area.blocks.length) {
          area.blocks.forEach(b => {
            const blockLines = (b.lines || []).filter(Boolean);
            const linesText = blockLines.length
              ? `${blockLines.length} ${pluralizeLines(blockLines.length)}: ${blockLines.map(escapeHtml).join(', ')}`
              : '<span style="color:var(--accent-red);font-style:italic">— нет линий</span>';

            html += `
              <div class="block-row">
                <div class="block-row-info">
                  <div class="block-row-name">${escapeHtml(b.name || 'Без названия')}</div>
                  <div class="block-row-lines">${linesText}</div>
                </div>
                <div class="block-row-actions">
                  <button class="btn btn-secondary btn-sm" onclick="openBlockModal('${escapeAttr(b.id)}')">Изменить состав</button>
                  <button class="btn btn-danger btn-sm" onclick="deleteBlock('${escapeAttr(b.id)}')">Удалить</button>
                </div>
              </div>
            `;
          });
        } else {
          html += `<div class="empty-state" style="padding:10px">В участке нет блоков</div>`;
        }
        html += `
          <div style="margin:6px 4px 8px">
            <button class="btn btn-secondary btn-sm" onclick="openNewBlockModal('${escapeAttr(workshop.id)}','${escapeAttr(area.id)}')">＋ Добавить блок</button>
          </div>
        `;
      } else {
        // Участок без блоков (PMD): линии хранятся прямо в участке — редактируемые
        const linesText = (area.lines || []).length
          ? (area.lines || []).map(escapeHtml).join(', ')
          : '<span style="color:var(--accent-red);font-style:italic">— нет линий</span>';

        html += `
          <div class="block-row">
            <div class="block-row-info">
              <div class="block-row-name">${escapeHtml(area.name || 'Без названия')} — линии</div>
              <div class="block-row-lines">${linesText}</div>
            </div>
            <div class="block-row-actions">
              <button class="btn btn-secondary btn-sm" onclick="openAreaLinesModal('${escapeAttr(workshop.id)}','${escapeAttr(area.id)}')">Изменить состав</button>
            </div>
          </div>
        `;
      }

      html += `</div></div>`; // закрываем участок
    });

    html += `</div></div>`; // закрываем цех
  });

  html += '</div>';

  list.innerHTML = html;

  // --- Обработчики: аккордеон ---
  list.querySelectorAll('[data-group-toggle]').forEach(head => {
    head.addEventListener('click', () => {
      const groupId = head.dataset.groupToggle;
      let open = getBlOpenGroups() || [];
      if (open.includes(groupId)) {
        open = open.filter(id => id !== groupId);
      } else {
        open.push(groupId);
      }
      setBlOpenGroups(open);
      renderBlocksSettings();
    });
  });

  // --- Кнопка "Развернуть всё / Свернуть всё" ---
  const toggleAllBtn = $('#blToggleAllBtn');
  if (toggleAllBtn) {
    toggleAllBtn.addEventListener('click', () => {
      const open = getBlOpenGroups() || [];
      const allExpandedNow = allGroupIds.length > 0 && allGroupIds.every(id => open.includes(id));
      if (allExpandedNow) {
        setBlOpenGroups([]);
      } else {
        setBlOpenGroups(allGroupIds);
      }
      renderBlocksSettings();
    });
  }
}

/* --- Хранилище открытых групп для "Блоков линий" --- */
function getBlOpenGroups() {
  try {
    const raw = localStorage.getItem('cl_bl_open_groups');
    const arr = raw ? JSON.parse(raw) : null;
    return Array.isArray(arr) ? arr : null;
  } catch (e) { return null; }
}
function setBlOpenGroups(arr) {
  try { localStorage.setItem('cl_bl_open_groups', JSON.stringify(arr)); } catch (e) {}
}

function sanitizeCycleArray(arr, def) {
  if (!Array.isArray(arr)) return [...def];
  const filtered = arr.filter(s => ['A','B','C','D'].includes(s));
  return filtered.length ? filtered : [...def];
}

function getElectronicShiftConfig() {
  const raw = load(STORAGE_KEYS.electronicShiftCfg, null);

  // Миграция со старого формата (cycle/daysPerShift) → v2
  if (raw && typeof raw === 'object' && Array.isArray(raw.cycle) && !raw.dayCycle) {
    const legacyCycle = raw.cycle;
    const legacyDays = Number(raw.daysPerShift) > 0 ? Number(raw.daysPerShift) : 2;
    const legacyStart = /^\d{4}-\d{2}-\d{2}$/.test(raw.startDate || '')
      ? raw.startDate
      : DEFAULT_ELECTRONIC_SHIFT_CFG.startDate;

    const dayCycle = [];
    const nightCycle = [];
    for (let i = 0; i < 8; i++) {
      const pos = Math.floor(i / legacyDays) % legacyCycle.length;
      const nextPos = Math.floor((i + 1) / legacyDays) % legacyCycle.length;
      dayCycle.push(legacyCycle[pos]);
      nightCycle.push(legacyCycle[nextPos]);
    }

    const migrated = { dayCycle, nightCycle, startDate: legacyStart };
    save(STORAGE_KEYS.electronicShiftCfg, migrated);
    return migrated;
  }

  if (!raw || typeof raw !== 'object') {
    return {
      dayCycle:   [...DEFAULT_ELECTRONIC_SHIFT_CFG.dayCycle],
      nightCycle: [...DEFAULT_ELECTRONIC_SHIFT_CFG.nightCycle],
      startDate:  DEFAULT_ELECTRONIC_SHIFT_CFG.startDate
    };
  }

  const dayCycle   = sanitizeCycleArray(raw.dayCycle,   DEFAULT_ELECTRONIC_SHIFT_CFG.dayCycle);
  const nightCycle = sanitizeCycleArray(raw.nightCycle, DEFAULT_ELECTRONIC_SHIFT_CFG.nightCycle);
  const startDate  = /^\d{4}-\d{2}-\d{2}$/.test(raw.startDate || '')
    ? raw.startDate
    : DEFAULT_ELECTRONIC_SHIFT_CFG.startDate;

  return { dayCycle, nightCycle, startDate };
}

function setElectronicShiftConfig(cfg) {
  const normalized = {
    dayCycle:   sanitizeCycleArray(cfg.dayCycle,   DEFAULT_ELECTRONIC_SHIFT_CFG.dayCycle),
    nightCycle: sanitizeCycleArray(cfg.nightCycle, DEFAULT_ELECTRONIC_SHIFT_CFG.nightCycle),
    startDate:  /^\d{4}-\d{2}-\d{2}$/.test(cfg.startDate || '')
      ? cfg.startDate
      : DEFAULT_ELECTRONIC_SHIFT_CFG.startDate
  };
  save(STORAGE_KEYS.electronicShiftCfg, normalized);
}
/* ============================================================
   МОДАЛКА РЕДАКТИРОВАНИЯ БЛОКА
   ============================================================ */
window.openBlockModal = function(blockId) {
  const blocks = getBlocks();
  const block = blocks.find(b => b.id === blockId);
  if (!block) return;

  const modal = $('#blockModal');
  const title = $('#blockModalTitle');
  if (!modal) return;

  title.textContent = 'Блок: ' + (block.name || 'Без названия');
  $('#blockModalId').value = blockId;
  $('#blockModalName').value = block.name || '';
  // Возвращаем поле имени (могло быть скрыто режимом «линии участка»)
  const nameField = $('#blockModalName')?.closest('.field');
  if (nameField) nameField.style.display = '';

  renderBlockModalLines(block.workshopId, block.lines || [], x => x.blockId === blockId);

  openModal(modal);
  setTimeout(() => $('#blockModalName').focus(), 100);
};

function closeBlockModal() {
  closeModal('#blockModal');
}

/* Линии, с которыми открыта модалка (для предупреждения при снятии) */
let blockModalInitialLines = [];

/* Список линий в модалке блока/участка.
   ownLines — линии этого блока/участка (отмечены);
   isOwn(ctx) — принадлежит ли линия из getAllLinesWithContext() этому
   владельцу. Чужие линии того же цеха показываются выключенными,
   с подписью, где они сейчас. */
function renderBlockModalLines(workshopId, ownLines, isOwn) {
  const group = $('#blockModalLinesGroup');
  if (!group) return;
  blockModalInitialLines = ownLines.slice();
  const newInput = $('#blockModalNewLine');
  if (newInput) newInput.value = '';

  const ctxs = getAllLinesWithContext().filter(x => x.workshopId === workshopId);
  const items = ctxs.map(x => {
    const own = isOwn(x);
    const where = x.blockName ? `${x.areaName} · ${x.blockName}` : x.areaName;
    return { line: x.line, checked: own && ownLines.includes(x.line), disabled: !own, where };
  });

  group.innerHTML = items.length
    ? items.map(blockModalLineLabel).join('')
    : '<div class="empty-state block-modal-empty" style="padding:10px">Линий пока нет — добавьте первую ниже</div>';
}

function blockModalLineLabel(it) {
  const title = it.disabled ? ` title="Сейчас в: ${escapeAttr(it.where)}"` : '';
  return `
    <label class="${it.checked ? 'checked' : ''}${it.disabled ? ' is-disabled' : ''}"${title}>
      <input type="checkbox" value="${escapeAttr(it.line)}" ${it.checked ? 'checked' : ''} ${it.disabled ? 'disabled' : ''}>
      ${escapeHtml(it.line)}${it.disabled ? `<span class="block-modal-line-where">${escapeHtml(it.where)}</span>` : ''}
    </label>
  `;
}

/* Добавить новую линию в список модалки (сохранится по «Сохранить») */
function addBlockModalNewLine() {
  const input = $('#blockModalNewLine');
  const group = $('#blockModalLinesGroup');
  if (!input || !group) return;
  const code = input.value.trim().replace(/\s+/g, ' ');
  if (!code) return showToast('Введите код линии', true);

  const exists = getAllLinesWithContext().find(x => x.line.toLowerCase() === code.toLowerCase());
  if (exists) {
    const where = [exists.workshopName, exists.areaName, exists.blockName].filter(Boolean).join(' · ');
    return showToast(`Линия ${exists.line} уже есть: ${where}`, true);
  }
  const inList = [...group.querySelectorAll('input[type=checkbox]')]
    .some(cb => cb.value.toLowerCase() === code.toLowerCase());
  if (inList) return showToast('Эта линия уже в списке', true);

  group.querySelector('.block-modal-empty')?.remove();
  group.insertAdjacentHTML('beforeend', blockModalLineLabel({ line: code, checked: true, disabled: false, where: '' }));
  input.value = '';
  input.focus();
}

/* Линии, которые сняли с отметки: предупредить, если на них есть данные */
function confirmBlockModalRemovedLines(selectedLines) {
  const removed = blockModalInitialLines.filter(l => !selectedLines.includes(l));
  if (!removed.length) return true;
  const withData = removed.filter(line =>
    getStandards().some(s => s.line === line) ||
    getElectronicParams().some(p => p.line === line) ||
    getHistory().some(h => h.line === line));
  const msg = withData.length
    ? `Линии ${withData.join(', ')} будут удалены из структуры, хотя по ним есть стандарты или история. ` +
      'Данные останутся, но линия пропадёт из выбора, пока её снова не добавят. Продолжить?'
    : `Линии ${removed.join(', ')} будут удалены из структуры. Продолжить?`;
  return confirm(msg);
}

$('#blockModalLinesGroup')?.addEventListener('change', (e) => {
  const cb = e.target.closest('input[type=checkbox]');
  if (cb) cb.closest('label')?.classList.toggle('checked', cb.checked);
});
$('#blockModalAddLineBtn')?.addEventListener('click', addBlockModalNewLine);
$('#blockModalNewLine')?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    addBlockModalNewLine();
  }
});

/* --- Обработчики модалки --- */
$('#blockModalClose')?.addEventListener('click', closeBlockModal);
$('#blockModalCancelBtn')?.addEventListener('click', closeBlockModal);
$('#blockModal')?.addEventListener('click', (e) => {
  if (e.target.id === 'blockModal') closeBlockModal();
});

/* Enter в поле названия — сохранить */
$('#blockModalName')?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    $('#blockModalSaveBtn')?.click();
  }
});

/* --- Редактирование линий участка БЕЗ блоков (PMD и др.) --- */
window.openAreaLinesModal = function(workshopId, areaId) {
  const w = getWorkshop(workshopId);
  if (!w) return;
  const area = (w.areas || []).find(a => a.id === areaId);
  if (!area) return;

  const modal = $('#blockModal');
  if (!modal) return;
  const title = $('#blockModalTitle');
  if (title) title.textContent = 'Линии участка: ' + (area.name || '');

  // Режим участка: id вида 'area:<workshopId>:<areaId>'
  $('#blockModalId').value = 'area:' + workshopId + ':' + areaId;
  // Поле имени блока в этом режиме не нужно — скрываем
  const nameField = $('#blockModalName')?.closest('.field');
  if (nameField) nameField.style.display = 'none';

  renderBlockModalLines(workshopId, area.lines || [], x => x.areaId === areaId && !x.blockId);

  openModal(modal);
  setTimeout(() => $('#blockModalNewLine')?.focus(), 100);
};

/* --- Создание нового блока в рамках участка --- */
window.openNewBlockModal = function(workshopId, areaId) {
  const w = getWorkshop(workshopId);
  const area = w && (w.areas || []).find(a => a.id === areaId);
  if (!w || !area) return;

  const modal = $('#blockModal');
  if (!modal) return;
  const title = $('#blockModalTitle');
  if (title) title.textContent = 'Новый блок · ' + (area.name || '');

  $('#blockModalId').value = 'new:' + workshopId + ':' + areaId;
  $('#blockModalName').value = '';
  const nameField = $('#blockModalName')?.closest('.field');
  if (nameField) nameField.style.display = '';

  renderBlockModalLines(workshopId, [], () => false);

  openModal(modal);
  setTimeout(() => $('#blockModalName').focus(), 100);
};

/* Сохранить (три режима: area: / new: / обычный блок) */
$('#blockModalSaveBtn')?.addEventListener('click', () => {
  const rawId = $('#blockModalId').value;
  if (!rawId) return;

  const selectedLines = [...$$('#blockModalLinesGroup input:checked')].map(cb => cb.value);
  if (!confirmBlockModalRemovedLines(selectedLines)) return;

  // --- Режим 1: «линии участка без блоков» (PMD и др.) ---
  if (rawId.indexOf('area:') === 0) {
    const [, workshopId, areaId] = rawId.split(':');
    if (!workshopId || !areaId) return;

    const workshops = getWorkshops();
    const w = workshops.find(x => x.id === workshopId);
    const area = w && (w.areas || []).find(a => a.id === areaId);
    if (!area) return;

    area.lines = selectedLines;
    setWorkshops(workshops);
    renderBlocksSettings();
    closeBlockModal();
    showToast('Линии участка обновлены');
    return;
  }

  // --- Режим 2: создание нового блока в участке ---
  if (rawId.indexOf('new:') === 0) {
    const [, workshopId, areaId] = rawId.split(':');
    const name = $('#blockModalName').value.trim();
    if (!name) return showToast('Введите название блока', true);

    const workshops = getWorkshops();
    const w = workshops.find(x => x.id === workshopId);
    const area = w && (w.areas || []).find(a => a.id === areaId);
    if (!area) return;

    if (!Array.isArray(area.blocks)) area.blocks = [];
    if (area.blocks.some(b => (b.name || '').toLowerCase() === name.toLowerCase())) {
      return showToast('Блок с таким названием уже есть в этом участке', true);
    }

    area.blocks.push({
      id: 'block_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      name,
      lines: selectedLines
    });

    setWorkshops(workshops);
    renderBlocksSettings();
    closeBlockModal();
    showToast('Блок добавлен');
    return;
  }

  // --- Режим 3: редактирование существующего блока ---
  const blockId = rawId;
  const name = $('#blockModalName').value.trim();
  if (!name) return showToast('Введите название блока', true);

  const workshops = getWorkshops();
  let target = null;
  let ownerArea = null;
  workshops.forEach(w => (w.areas || []).forEach(a => {
    if (Array.isArray(a.blocks)) {
      a.blocks.forEach(b => { if (b.id === blockId) { target = b; ownerArea = a; } });
    }
  }));
  if (!target) return showToast('Блок не найден', true);

  // Дубликат названия в пределах участка-владельца
  if (ownerArea.blocks.some(b => b.id !== blockId && (b.name || '').toLowerCase() === name.toLowerCase())) {
    return showToast('Блок с таким названием уже есть', true);
  }

  target.name = name;
  target.lines = selectedLines;

  setWorkshops(workshops);
  renderBlocksSettings();
  closeBlockModal();
  showToast('Блок обновлён');
});
