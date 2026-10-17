/* ============================================================
   НАСТРОЙКИ: машины линий
   Модуль общего пространства имён: функции и переменные видны
   во всех файлах. Порядок подключения — index.html.
   ============================================================ */

/* ============================================================
   МАШИНЫ ДЛЯ ЛИНИЙ — компактные строки + аккордеон по блокам
   ============================================================ */

const LM_OPEN_BLOCKS_KEY = 'cl_lm_open_blocks';

/* Получить сохранённые открытые блоки */
function getLmOpenBlocks() {
  try {
    const raw = localStorage.getItem(LM_OPEN_BLOCKS_KEY);
    const arr = raw ? JSON.parse(raw) : null;
    return Array.isArray(arr) ? arr : null;   // null = все по умолчанию
  } catch (e) { return null; }
}

function setLmOpenBlocks(arr) {
  try { localStorage.setItem(LM_OPEN_BLOCKS_KEY, JSON.stringify(arr)); } catch (e) {}
}

function renderLineMachinesSettings() {
  const container = $('#lineMachinesContainer');
  if (!container) return;

  const lines = getLines();
  const lm = getLineMachines();

  if (!lines.length) {
    container.innerHTML = '<div class="empty-state">Сначала добавьте линии</div>';
    return;
  }

  // Линии, которых нет ни в одном блоке (и в участках без блоков)
  const allLinesCtx = getAllLinesWithContext();

  // Группируем по цеху → участку → блокам
  const workshops = getWorkshops();

  // Общий счётчик линий
  const totalLineCount = lines.length;

  // --- Верхняя панель: поиск + кнопка "Развернуть всё" + счётчик ---
  let html = `
    <div class="lm-toolbar">
      <div class="lm-search-wrap">
        <svg class="lm-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8"/>
          <line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input type="text" id="lmSearchInput" placeholder="Поиск по линии или машине..." autocomplete="off">
        <button type="button" class="lm-search-clear" id="lmSearchClear" title="Очистить" style="display:none">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      <button type="button" class="btn btn-secondary btn-sm lm-toggle-all-btn" id="lmToggleAllBtn" title="Развернуть или свернуть все блоки">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" id="lmToggleAllIcon">
          <polyline points="7 13 12 18 17 13"/>
          <polyline points="7 6 12 11 17 6"/>
        </svg>
        <span id="lmToggleAllLabel">Развернуть всё</span>
      </button>

      <span class="lm-counter">Всего линий: <strong>${totalLineCount}</strong></span>
    </div>
  `;

  // --- Группы по цехам ---
  html += '<div class="lm-groups">';

  // Собираем плоский список "открытых" идентификаторов (цех/участок/блок)
  let openIds = getLmOpenBlocks();
  if (openIds === null) {
    openIds = [];
    setLmOpenBlocks(openIds);
  }

  // Функция "открыт ли id"
  const isOpen = (id) => openIds.includes(id);

  workshops.forEach(workshop => {
    const workshopLines = allLinesCtx.filter(x => x.workshopId === workshop.id);

    // Если у цеха вообще нет участков — пропускаем
    const hasAnyAreas = (workshop.areas || []).length > 0;
    if (!hasAnyAreas) return;

    // Если у цеха нет линий — всё равно показываем, но с пометкой
    const workshopId = 'ws:' + workshop.id;
    const workshopOpen = isOpen(workshopId);

    // Считаем общее количество машин в цехе
    const workshopMachineCount = workshopLines.reduce((sum, x) => {
      const machines = Array.isArray(lm[x.line]) ? lm[x.line] : [];
      return sum + machines.length;
    }, 0);

    html += `
      <div class="lm-group lm-group-workshop ${workshopOpen ? 'expanded' : ''}" data-group-id="${escapeAttr(workshopId)}">
        <div class="lm-group-head" data-group-toggle="${escapeAttr(workshopId)}">
          <span class="lm-group-toggle">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </span>
          <span class="lm-group-name">${escapeHtml(workshop.name)}</span>
          <span class="lm-group-count">
            ${workshopLines.length} ${pluralizeLines(workshopLines.length)}
            · ${workshopMachineCount} ${pluralizeMachines(workshopMachineCount)}
          </span>
        </div>
        <div class="lm-group-body">
    `;

    // Если цех пуст (нет линий) — выводим пустое состояние
    if (!workshopLines.length) {
      html += `
        <div class="lm-group-empty">
          У цеха пока нет линий. Добавьте их через структуру производства.
        </div>
      `;
      html += `</div></div>`; // закрываем цех
      return;
    }

    // Внутри цеха — участки
    (workshop.areas || []).forEach(area => {
      const areaLines = allLinesCtx.filter(x =>
        x.workshopId === workshop.id && x.areaId === area.id
      );
      if (!areaLines.length) return;

      const areaId = 'ar:' + area.id;
      const areaOpen = isOpen(areaId);

      const areaMachineCount = areaLines.reduce((sum, x) => {
        const machines = Array.isArray(lm[x.line]) ? lm[x.line] : [];
        return sum + machines.length;
      }, 0);

      html += `
        <div class="lm-group lm-group-area ${areaOpen ? 'expanded' : ''}" data-group-id="${escapeAttr(areaId)}">
          <div class="lm-group-head lm-group-area-head" data-group-toggle="${escapeAttr(areaId)}">
            <span class="lm-group-toggle">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </span>
            <span class="lm-group-name">${escapeHtml(area.name)}</span>
            <span class="lm-group-count">
              ${areaLines.length} ${pluralizeLines(areaLines.length)}
              · ${areaMachineCount} ${pluralizeMachines(areaMachineCount)}
            </span>
          </div>
          <div class="lm-group-body">
      `;

      // Внутри участка — либо блоки, либо просто линии
      if (Array.isArray(area.blocks) && area.blocks.length) {
        // Для каждого блока — отдельная подгруппа (без аккордеона, чтобы не было 3 уровней)
        area.blocks.forEach(block => {
          const blockLines = areaLines.filter(x => x.blockId === block.id);
          if (!blockLines.length) return;

          const blockMachineCount = blockLines.reduce((sum, x) => {
            const machines = Array.isArray(lm[x.line]) ? lm[x.line] : [];
            return sum + machines.length;
          }, 0);

          html += `
            <div class="lm-block-head">
              <span class="lm-block-name">${escapeHtml(block.name)}</span>
              <span class="lm-block-count">${blockLines.length} ${pluralizeLines(blockLines.length)} · ${blockMachineCount} ${pluralizeMachines(blockMachineCount)}</span>
            </div>
          `;

          blockLines.forEach(x => {
            html += renderLmLineRow(x.line, lm);
          });
        });
      } else {
        // Участок без блоков — просто список линий
        areaLines.forEach(x => {
          html += renderLmLineRow(x.line, lm);
        });
      }

      html += `</div></div>`; // закрываем участок
    });

    html += `</div></div>`; // закрываем цех
  });

  html += '</div>';

  container.innerHTML = html;

  // --- Обработчики: аккордеон ---
  container.querySelectorAll('[data-group-toggle]').forEach(head => {
    head.addEventListener('click', () => {
      const groupId = head.dataset.groupToggle;
      let open = getLmOpenBlocks() || [];
      if (open.includes(groupId)) {
        open = open.filter(id => id !== groupId);
      } else {
        open.push(groupId);
      }
      setLmOpenBlocks(open);
      renderLineMachinesSettings();
    });
  });

  // --- Обработчики: строки линий ---
  container.querySelectorAll('.lm-row').forEach(row => {
    row.addEventListener('click', (e) => {
      if (e.target.closest('.lm-row-btn')) return;
      const line = row.dataset.line;
      if (line) openMachinesListModal(line);
    });
  });

  container.querySelectorAll('.lm-row-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const row = btn.closest('.lm-row');
      if (!row) return;
      const line = row.dataset.line;
      if (line) openMachinesListModal(line);
    });
  });

  // --- Поиск ---
  const searchInput = $('#lmSearchInput');
  const searchClear = $('#lmSearchClear');
  if (searchInput) {
    const savedQuery = sessionStorage.getItem('lm_search_query') || '';
    if (savedQuery) {
      searchInput.value = savedQuery;
      if (searchClear) searchClear.style.display = 'inline-flex';
      applyLmSearch(savedQuery);
    }

    searchInput.addEventListener('input', () => {
      const q = searchInput.value.trim();
      sessionStorage.setItem('lm_search_query', q);
      if (searchClear) searchClear.style.display = q ? 'inline-flex' : 'none';
      applyLmSearch(q);
    });
  }

  if (searchClear) {
    searchClear.addEventListener('click', () => {
      if (searchInput) searchInput.value = '';
      sessionStorage.removeItem('lm_search_query');
      searchClear.style.display = 'none';
      applyLmSearch('');
      if (searchInput) searchInput.focus();
    });
  }

  // --- Кнопка "Развернуть всё / Свернуть всё" ---
  updateLmToggleAllBtnMultiLevel();
  const toggleAllBtn = $('#lmToggleAllBtn');
  if (toggleAllBtn) {
    toggleAllBtn.addEventListener('click', () => {
      const open = getLmOpenBlocks() || [];
      const allIds = collectAllLmGroupIds();
      const allExpanded = allIds.length > 0 && allIds.every(id => open.includes(id));

      if (allExpanded) {
        setLmOpenBlocks([]);
      } else {
        setLmOpenBlocks(allIds);
      }
      renderLineMachinesSettings();
    });
  }
}

/* Строка линии внутри машин */
function renderLmLineRow(line, lm) {
  const machines = Array.isArray(lm[line]) ? lm[line] : [];
  const count = machines.length;

  const machinesText = count === 0
    ? '<span class="lm-row-empty">Нет машин — нажмите, чтобы добавить</span>'
    : `<span class="lm-row-machines" title="${escapeAttr(machines.join(', '))}">${escapeHtml(machines.join(', '))}</span>`;

  const countBadge = count === 0
    ? '<span class="lm-row-count lm-row-count-empty">0</span>'
    : `<span class="lm-row-count">${count}</span>`;

  return `
    <div class="lm-row" data-line="${escapeAttr(line)}" data-machines="${escapeAttr(machines.join(' ').toLowerCase())}">
      <div class="lm-row-line">${escapeHtml(line)}</div>
      <div class="lm-row-count-wrap">${countBadge}</div>
      <div class="lm-row-machines-wrap">${machinesText}</div>
      <button class="btn btn-primary btn-sm lm-row-btn" type="button">
        Настроить →
      </button>
    </div>
  `;
}

/* Собрать все id для кнопки "Развернуть всё" */
function collectAllLmGroupIds() {
  const ids = [];
  getWorkshops().forEach(w => {
    ids.push('ws:' + w.id);
    (w.areas || []).forEach(a => {
      ids.push('ar:' + a.id);
    });
  });
  return ids;
}

/* Обновить кнопку "Развернуть всё" для многоуровневой структуры */
function updateLmToggleAllBtnMultiLevel() {
  const btn = $('#lmToggleAllBtn');
  const label = $('#lmToggleAllLabel');
  const icon = $('#lmToggleAllIcon');
  if (!btn || !label || !icon) return;

  const open = getLmOpenBlocks() || [];
  const allIds = collectAllLmGroupIds();
  const allExpanded = allIds.length > 0 && allIds.every(id => open.includes(id));

  if (allExpanded) {
    label.textContent = 'Свернуть всё';
    btn.title = 'Свернуть все блоки';
    icon.innerHTML = `
      <polyline points="17 11 12 6 7 11"/>
      <polyline points="17 18 12 13 7 18"/>
    `;
  } else {
    label.textContent = 'Развернуть всё';
    btn.title = 'Развернуть все блоки';
    icon.innerHTML = `
      <polyline points="7 13 12 18 17 13"/>
      <polyline points="7 6 12 11 17 6"/>
    `;
  }
}

/* Применить поиск: показать только совпавшие строки,
   при активном поиске — раскрыть все группы. */
function applyLmSearch(query) {
  const container = $('#lineMachinesContainer');
  if (!container) return;

  const q = (query || '').trim().toLowerCase();
  const groups = container.querySelectorAll('.lm-group');

  if (!q) {
    // Показываем всё, восстанавливаем состояние accordion
    const openIds = getLmOpenBlocks() || [];
    groups.forEach(g => {
      const gid = g.dataset.groupId;
      g.style.display = '';
      g.classList.toggle('expanded', openIds.includes(gid));
    });
    container.querySelectorAll('.lm-row').forEach(r => {
      r.style.display = '';
    });
    return;
  }

  // При активном поиске — все группы раскрыты
  groups.forEach(g => {
    g.classList.add('expanded');
    g.style.display = '';

    // Строки — показываем только совпавшие
    let visibleInGroup = 0;
    g.querySelectorAll('.lm-row').forEach(row => {
      const line = (row.dataset.line || '').toLowerCase();
      const machines = (row.dataset.machines || '').toLowerCase();
      const match = line.includes(q) || machines.includes(q);
      row.style.display = match ? '' : 'none';
      if (match) visibleInGroup++;
    });

    // Скрываем группы, где нет совпадений (кроме цехов — у них есть подгруппы)
    // Если это группа-участок — прячем, если внутри нет видимых строк.
    // Если это группа-цех — прячем, если внутри нет ни одной видимой строки.
    if (visibleInGroup === 0) {
      g.style.display = 'none';
    }
  });

  // Дополнительно: раскрываем всех родителей для видимых строк
  container.querySelectorAll('.lm-row').forEach(row => {
    if (row.style.display === 'none') return;
    // Раскрываем всех родителей
    let parent = row.closest('.lm-group');
    while (parent) {
      parent.classList.add('expanded');
      parent.style.display = '';
      parent = parent.parentElement.closest('.lm-group');
    }
  });
}
/* ============================================================
   МОДАЛКА СПИСКА МАШИН ЛИНИИ
   ============================================================ */
window.openMachinesListModal = function(line) {
  const modal = $('#machinesListModal');
  if (!modal) return;

  $('#machinesListModalLine').value = line;
  $('#machinesListModalTitle').textContent = 'Машины линии ' + line;

  renderMachinesListContent(line);

  openModal(modal);
};

function closeMachinesListModal() {
  const modal = $('#machinesListModal');
  if (!modal) return;
  modal.classList.remove('active');
  modal.style.display = '';   // ← сбрасываем inline-style, возвращаем CSS-управление
}

function renderMachinesListContent(line) {
  const content = $('#machinesListContent');
  if (!content) return;

  const lm = getLineMachines();
  const machines = Array.isArray(lm[line]) ? lm[line] : [];

  if (!machines.length) {
    content.innerHTML = '<div class="empty-state" style="padding:20px">Машин пока нет</div>';
    return;
  }

  content.innerHTML = machines.map(m => `
    <div class="machine-row">
      <span class="machine-row-name">${escapeHtml(m)}</span>
      <div class="machine-row-actions">
        <button class="btn btn-secondary btn-sm btn-icon"
                onclick="openMachineModal('${escapeHtml(line).replace(/'/g,"\\'")}', '${escapeHtml(m).replace(/'/g,"\\'")}')"
                title="Изменить">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </button>
        <button class="btn btn-danger btn-sm btn-icon"
                onclick="removeMachineFromLine('${escapeHtml(line).replace(/'/g,"\\'")}', '${escapeHtml(m).replace(/'/g,"\\'")}')"
                title="Удалить">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
    </div>
  `).join('');
}

/* Обработчики модалки списка */
$('#machinesListModalClose')?.addEventListener('click', closeMachinesListModal);
$('#machinesListDoneBtn')?.addEventListener('click', closeMachinesListModal);
$('#machinesListModal')?.addEventListener('click', (e) => {
  if (e.target.id === 'machinesListModal') closeMachinesListModal();
});

/* Добавить машину из модалки списка */
$('#machinesListAddBtn')?.addEventListener('click', () => {
  const line = $('#machinesListModalLine').value;
  if (!line) return;
  openMachineModal(line, null);
});

/* ============================================================
   МОДАЛКА МАШИНЫ
   ============================================================ */
window.openMachineModal = function(line, oldName) {
  const modal = $('#machineModal');
  const title = $('#machineModalTitle');
  const saveBtn = $('#machineModalSaveBtn');
  if (!modal) return;

  $('#machineModalLine').value = line;
  // ... (остальное содержимое функции — без изменений)
  
  openModal(modal);
  setTimeout(() => {
    const input = $('#machineModalName');
    input.focus();
    input.select();
  }, 100);
};
/* ============================================================
   БЫСТРОЕ ДОБАВЛЕНИЕ МАШИНЫ (страницы стандарта и параметра)
   ============================================================ */
/* Кому добавляем машину: { line, onAdded(name) } — вызывающая страница
   сама решает, как показать новую машину в своём списке. */
let quickAddMachineTarget = null;

window.openQuickAddMachineModal = function(target) {
  const modal = $('#quickAddMachineModal');
  if (!modal || !target || !target.line) return;
  quickAddMachineTarget = target;
  const line = target.line;

  $('#quickAddMachineLineLabel').textContent = 'Линия: ' + line;
  $('#quickAddMachineName').value = '';

  openModal(modal);
  setTimeout(() => {
    const input = $('#quickAddMachineName');
    if (input) {
      input.focus();
      input.select();
    }
  }, 100);
};

function closeQuickAddMachineModal() {
  closeModal('#quickAddMachineModal');
}

/* --- Обработчики модалки --- */
$('#quickAddMachineClose')?.addEventListener('click', closeQuickAddMachineModal);
$('#quickAddMachineCancelBtn')?.addEventListener('click', closeQuickAddMachineModal);
$('#quickAddMachineModal')?.addEventListener('click', (e) => {
  if (e.target.id === 'quickAddMachineModal') closeQuickAddMachineModal();
});

/* Enter — сохранить */
$('#quickAddMachineName')?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    $('#quickAddMachineSaveBtn')?.click();
  }
});

/* Сохранить */
$('#quickAddMachineSaveBtn')?.addEventListener('click', () => {
  const line = quickAddMachineTarget?.line;

  const name = $('#quickAddMachineName')?.value.trim();
  if (!line) return;
  if (!name) return showToast('Введите название машины', true);

  const lm = getLineMachines();
  if (!Array.isArray(lm[line])) lm[line] = [];

  // Проверка дубликата (без учёта регистра)
  if (lm[line].some(m => m.toLowerCase() === name.toLowerCase())) {
    return showToast('Такая машина уже есть на этой линии', true);
  }

  lm[line].push(name);
  setLineMachines(lm);

  // Страница, открывшая окно, подставляет новую машину у себя
  if (typeof quickAddMachineTarget.onAdded === 'function') quickAddMachineTarget.onAdded(name);

  // Обновляем настройки (если они сейчас открыты — пользователь увидит новую машину)
  if (typeof renderLineMachinesSettings === 'function') renderLineMachinesSettings();

  closeQuickAddMachineModal();
  showToast('Машина добавлена на линию ' + line);
});

function closeMachineModal() {
  closeModal('#machineModal');
}

/* --- Обработчики модалки --- */
$('#machineModalClose')?.addEventListener('click', closeMachineModal);
$('#machineModalCancelBtn')?.addEventListener('click', closeMachineModal);
$('#machineModal')?.addEventListener('click', (e) => {
  if (e.target.id === 'machineModal') closeMachineModal();
});

/* Enter — сохранить */
$('#machineModalName')?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    $('#machineModalSaveBtn')?.click();
  }
});

/* Сохранить */
$('#machineModalSaveBtn')?.addEventListener('click', () => {
  const line = $('#machineModalLine').value;
  const oldName = $('#machineModalOldName').value;
  const newName = $('#machineModalName').value.trim();

  if (!line) return;
  if (!newName) return showToast('Введите название машины', true);

  const lm = getLineMachines();
  if (!Array.isArray(lm[line])) lm[line] = [];

  // Проверка дубликата (кроме переименовываемой машины)
  const dup = lm[line].some(m =>
    m !== oldName && m.toLowerCase() === newName.toLowerCase()
  );
  if (dup) {
    return showToast(`Машина "${newName}" уже есть на линии ${line}`, true);
  }

  if (oldName) {
    // Редактирование — заменяем старое имя на новое
    const idx = lm[line].indexOf(oldName);
    if (idx === -1) return;
    lm[line][idx] = newName;
  } else {
    // Добавление новой
    lm[line].push(newName);
  }

  setLineMachines(lm);

  // --- НОВОЕ: синхронизация с стандартами ---
  if (oldName && oldName !== newName) {
    const allStandards = getStandards();
    let changedCount = 0;
    allStandards.forEach(s => {
      if (s.line === line && s.machine === oldName) {
        s.machine = newName;
        changedCount++;
      }
    });
    if (changedCount > 0) {
      setStandards(allStandards);
      showToast(`Машина переименована. Обновлено стандартов: ${changedCount}`);
    }
  }

  // Обновляем список в родительской модалке
  renderMachinesListContent(line);
  renderLineMachinesSettings();
  closeMachineModal();
  showToast(oldName ? 'Машина обновлена' : 'Машина добавлена');
});
