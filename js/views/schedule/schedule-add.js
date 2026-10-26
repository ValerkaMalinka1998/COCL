/* ============================================================
   РАСПИСАНИЕ CL: добавление стандартов
   Модуль общего пространства имён: функции и переменные видны
   во всех файлах. Порядок подключения — index.html.
   ============================================================ */

/* ============================================================
   РАСПИСАНИЕ CL — модалка добавления стандартов
   ============================================================ */

/* Состояние модалки */
const schAddState = {
  selectedIds: new Set(),   // id, которые пользователь выделил для добавления
  query: '',
  collapsedGroups: new Set()   // не используется, но на будущее
};

/* --- Открытие --- */
function openScheduleAddStandardsModal() {
  if (!schState.line) return;
  if (isSchReadOnly()) return;

  const modal = $('#schAddStandardsModal');
  if (!modal) return;

  // Сбрасываем состояние
  schAddState.selectedIds = new Set();
  schAddState.query = '';
  schAddState.collapsedGroups = new Set();

  $('#schAddStandardsSearch').value = '';
  $('#schAddCheckAll').checked = false;

  renderSchAddList();
  updateSchAddCounter();

  openModal(modal);
  setTimeout(() => $('#schAddStandardsSearch')?.focus(), 100);
}

/* --- Закрытие --- */
function closeScheduleAddStandardsModal() {
  closeModal('#schAddStandardsModal');
  schAddState.selectedIds = new Set();
  schAddState.query = '';
}

/* --- Рендер списка --- */
function renderSchAddList() {
  const list = $('#schAddStandardsList');
  if (!list) return;

  const q = (schAddState.query || '').trim().toLowerCase();

  // Собираем все стандарты/параметры линии, кроме тех, что уже inSchedule
  let allItems = [];

  if (schState.mode === 'mech') {
    allItems = getStandards()
      .filter(s => s.line === schState.line)
      .filter(s => s.active !== false)
      .filter(s => !linePartFilter(schState.line, schState.part) || s.nodePart === schState.part)
      .map(s => ({
        id: s.id,
        title: s.title || '—',
        oplNumber: s.oplNumber || '',
        machine: s.machine || '',
        node: s.node || '',
        nodePart: s.nodePart || '',
        inSchedule: isSchRowMember(s),
        group: s.machine || '— без машины —'
      }));
  } else {
    allItems = getElectronicParamsForLine(schState.line)
      .filter(p => p.active !== false)
      .filter(p => !linePartFilter(schState.line, schState.part) || p.nodePart === schState.part)
      .map(p => ({
        id: p.id,
        title: p.paramName || '—',
        oplNumber: '',
        machine: p.machine || '',
        node: '',
        nodePart: p.nodePart || '',
        inSchedule: isSchRowMember(p),
        group: p.machine || '— без машины —'
      }));
  }

  // Фильтр поиска
  if (q) {
    allItems = allItems.filter(it => {
      const hay = [
        it.title, it.oplNumber, it.machine, it.node, it.nodePart
      ].map(v => String(v || '').toLowerCase()).join(' ');
      return hay.includes(q);
    });
  }

  if (!allItems.length) {
    list.innerHTML = '<div class="empty-state" style="padding:24px">Ничего не найдено</div>';
    return;
  }

  // Группируем по машине
  const groups = {};
  allItems.forEach(it => {
    const g = it.group;
    if (!groups[g]) groups[g] = [];
    groups[g].push(it);
  });

  // Сортируем группы
  const sortedGroups = Object.keys(groups).sort((a, b) =>
    a.localeCompare(b, 'ru', { numeric: true })
  );

  let html = '';
  sortedGroups.forEach(groupName => {
    const items = groups[groupName];
    // Сортируем внутри группы
    items.sort((a, b) => {
      const oa = String(a.oplNumber || a.title || '').toLowerCase();
      const ob = String(b.oplNumber || b.title || '').toLowerCase();
      return oa.localeCompare(ob, 'ru', { numeric: true });
    });

    const itemsHtml = items.map(it => {
      const isAlready = it.inSchedule;
      const isChecked = schAddState.selectedIds.has(it.id);
      const subParts = [];
      if (it.oplNumber) subParts.push(it.oplNumber);
      if (it.node) subParts.push(it.node);
      if (it.nodePart) subParts.push(it.nodePart);

      return `
        <label class="sch-add-item ${isAlready ? 'is-already' : ''}" data-item-id="${escapeAttr(it.id)}">
          <input type="checkbox" ${isChecked ? 'checked' : ''} ${isAlready ? 'disabled' : ''}>
          <div class="sch-add-item-info">
            <div class="sch-add-item-title">${escapeHtml(it.title)}</div>
            <div class="sch-add-item-sub">${escapeHtml(subParts.join(' · ') || '—')}</div>
          </div>
          ${isAlready ? '<span class="sch-add-item-already">уже добавлен</span>' : ''}
        </label>
      `;
    }).join('');

    html += `
      <div class="sch-add-group">
        <div class="sch-add-group-head">
          <span class="sch-add-group-name">${escapeHtml(groupName)}</span>
          <span class="sch-add-group-count">${items.length}</span>
        </div>
        ${itemsHtml}
      </div>
    `;
  });

  list.innerHTML = html;

  // Обработчики
  list.querySelectorAll('.sch-add-item').forEach(item => {
    const id = item.dataset.itemId;
    const cb = item.querySelector('input');
    if (!cb || cb.disabled) return;

    // Клик по всему label — toggle
    item.addEventListener('click', (e) => {
      // Если клик по input — браузер сам переключит, обработаем через change
      if (e.target.tagName === 'INPUT') return;
      e.preventDefault();
      cb.checked = !cb.checked;
      toggleSchAddItem(id, cb.checked);
    });

    cb.addEventListener('change', () => {
      toggleSchAddItem(id, cb.checked);
    });
  });
}

/* --- Toggle выбора --- */
function toggleSchAddItem(id, checked) {
  if (checked) {
    schAddState.selectedIds.add(id);
  } else {
    schAddState.selectedIds.delete(id);
  }
  updateSchAddCounter();
  updateSchAddCheckAllState();
}

/* --- Счётчик --- */
function updateSchAddCounter() {
  const n = schAddState.selectedIds.size;
  $('#schAddCounter').textContent = `Выбрано: ${n}`;

  const btn = $('#schAddStandardsConfirm');
  if (btn) {
    btn.disabled = n === 0;
    btn.textContent = n === 0 ? 'Добавить' : `Добавить ${n}`;
  }
}

/* --- Обновить состояние "Выделить все" --- */
function updateSchAddCheckAllState() {
  const cb = $('#schAddCheckAll');
  if (!cb) return;

  const visibleInputs = [...document.querySelectorAll('#schAddStandardsList .sch-add-item input:not([disabled])')];
  if (!visibleInputs.length) {
    cb.checked = false;
    cb.indeterminate = false;
    return;
  }

  const checkedCount = visibleInputs.filter(i => i.checked).length;
  cb.checked = checkedCount === visibleInputs.length;
  cb.indeterminate = checkedCount > 0 && checkedCount < visibleInputs.length;
}

/* --- Подтверждение --- */
function confirmScheduleAddStandards() {
  if (!schAddState.selectedIds.size) return;

  const ids = [...schAddState.selectedIds];

  if (!schState.addedToSchedule) schState.addedToSchedule = new Set();
  if (!schState.removedFromSchedule) schState.removedFromSchedule = new Set();

  const isMech = schState.mode === 'mech';
  const all = isMech ? getStandards() : getElectronicParams().map(normalizeElectronicParam);
  const weekStart = getSchWeekStart(schState.weekOffset || 0);

  ids.forEach(id => {
    const row = all.find(r => r.id === id);
    // Строка, убранная из расписания, но ещё не сохранённая, — это отмена
    // удаления: её прошлые смены не трогаем. Остальные получают только будущие смены.
    if (row && !getRowForWeek(row, weekStart, schState.line).member) schDropPastCells(row);
    schState.removedFromSchedule.delete(id);
    schState.addedToSchedule.add(id);
  });

  schState.dirty = true;
  updateSchSaveBtn();
  renderScheduleMatrix();
  updateSchPanelCount();
  closeScheduleAddStandardsModal();
  showToast(`Добавлено: ${ids.length}`);
}

/* --- Обработчики модалки --- */

$('#schAddStandardsClose')?.addEventListener('click', closeScheduleAddStandardsModal);
$('#schAddStandardsCancel')?.addEventListener('click', closeScheduleAddStandardsModal);
$('#schAddStandardsModal')?.addEventListener('click', (e) => {
  if (e.target.id === 'schAddStandardsModal') closeScheduleAddStandardsModal();
});
$('#schAddStandardsConfirm')?.addEventListener('click', confirmScheduleAddStandards);

$('#schAddStandardsSearch')?.addEventListener('input', (e) => {
  schAddState.query = e.target.value;
  // Сбрасываем "Выделить все"
  const cbAll = $('#schAddCheckAll');
  if (cbAll) { cbAll.checked = false; cbAll.indeterminate = false; }
  renderSchAddList();
  updateSchAddCheckAllState();
});

$('#schAddCheckAll')?.addEventListener('change', (e) => {
  const checked = e.target.checked;
  document.querySelectorAll('#schAddStandardsList .sch-add-item input:not([disabled])').forEach(cb => {
    cb.checked = checked;
    const item = cb.closest('.sch-add-item');
    if (!item) return;
    const id = item.dataset.itemId;
    if (checked) schAddState.selectedIds.add(id);
    else schAddState.selectedIds.delete(id);
  });
  updateSchAddCounter();
});
/* --- Обработчики вкладки --- */

/* Чип линии — открыть модалку выбора */
document.addEventListener('click', (e) => {
  if (e.target.closest('#schLinePill')) {
    if (typeof openLinePickerModal === 'function') openLinePickerModal();
  }
});

/* Переключатель Механические / Электронные */
$('#schModeSwitch')?.addEventListener('click', (e) => {
  const btn = e.target.closest('.editor-mode-inline-btn');
  if (!btn) return;
  const mode = btn.dataset.mode;
  if (mode === schState.mode) return;

  if (schState.dirty && !confirm('Есть несохранённые изменения. Продолжить без сохранения?')) return;

  schState.mode = mode;
  schState.dirty = false;
  schState.draft = {};
  schState.weekOffset = 0;
  schState.removedFromSchedule = new Set();
  schState.addedToSchedule = new Set();

  try { localStorage.setItem('cl_schedule_mode', mode); } catch (err) {}

  document.querySelectorAll('#schModeSwitch .editor-mode-inline-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.mode === mode);
  });

  updateSchSaveBtn();
  renderScheduleMatrix();
});

/* Переключатель Maker/Packer */
$('#schPartSwitch')?.addEventListener('click', (e) => {
  const btn = e.target.closest('.editor-part-switch-btn');
  if (!btn) return;
  const part = btn.dataset.part || '';
  if (part === schState.part) return;

  if (schState.dirty && !confirm('Есть несохранённые изменения. Продолжить без сохранения?')) return;

  schState.part = part;
  schState.dirty = false;
  schState.draft = {};
  schState.weekOffset = 0;
  schState.removedFromSchedule = new Set();
  schState.addedToSchedule = new Set();

  try { localStorage.setItem('cl_schedule_part', part); } catch (err) {}

  document.querySelectorAll('#schPartSwitch .editor-part-switch-btn').forEach(b => {
    b.classList.toggle('active', (b.dataset.part || '') === part);
  });

  updateSchSaveBtn();
  renderScheduleMatrix();
});

/* Кнопка "Сохранить" */
$('#schSaveBtn')?.addEventListener('click', saveSchedule);

/* Массовые операции (прототип — работают со всеми строками) */
$('#schBulkFillAllBtn')?.addEventListener('click', () => {
  if (!schState.rows.length) return;
  if (!confirm('Проставить все дни и смены для всех строк?')) return;

  schState.dirty = true;
  const allDays = [1, 2, 3, 4, 5, 6, 0];
  const schedule = [];
  allDays.forEach(day => {
    schedule.push({ day, shift: 'day' });
    schedule.push({ day, shift: 'night' });
  });

  schState.rows.forEach(row => {
    schState.draft[row.id] = {
      type: 'weekly',
      schedule: schedule.map(x => ({ ...x })),
      shifts: ['day', 'night'],
      daysOfWeek: [...allDays],
      dates: []
    };
  });

  updateSchSaveBtn();
  renderScheduleMatrix();
});

$('#schBulkClearAllBtn')?.addEventListener('click', () => {
  if (!schState.rows.length) return;
  if (!confirm('Очистить расписание для всех строк?')) return;

  schState.dirty = true;

  schState.rows.forEach(row => {
    schState.draft[row.id] = {
      type: 'weekly',
      schedule: [],
      shifts: ['day', 'night'],
      daysOfWeek: [],
      dates: []
    };
  });

  updateSchSaveBtn();
  renderScheduleMatrix();
});

/* Хук: при выборе линии через модалку — нужно перехватить,
   чтобы обновить именно Расписание CL, если открыта эта вкладка. */
const _origSelectLine = selectLine;
window.selectLine = function(line) {
  // Вызываем оригинальную функцию
  _origSelectLine(line);

  const activeTab = localStorage.getItem('cl_active_tab');

  // Если активна вкладка «Расписание CL»
  if (activeTab === 'schedule') {
    schState.line = line;
    try { localStorage.setItem('cl_schedule_line', line); } catch (e) {}

    if (schState.dirty && !confirm('Есть несохранённые изменения. Продолжить без сохранения?')) {
      return;
    }
    schState.dirty = false;
    schState.draft = {};
    schState.weekOffset = 0;
    schState.removedFromSchedule = new Set();
    schState.addedToSchedule = new Set();

    updateSchLinePill();
    updateSchSaveBtn();
    renderScheduleMatrix();
    return;
  }

  // Если активна вкладка «Проверка CL»
  if (activeTab === 'electronic') {
    clState.line = line;
    try { localStorage.setItem('cl_cl_line', line); } catch (e) {}

    updateClLinePill();
    updateClContext();
    updateClCheckButtons();
    renderClMatrix();
    return;
  }
};
/* ============================================================
   РАСПИСАНИЕ CL — обработчики кнопок
   ============================================================ */

$('#schAddStandardsBtn')?.addEventListener('click', openScheduleAddStandardsModal);

/* Фильтр и поиск */
$('#schFilterMachine')?.addEventListener('change', () => {
  renderScheduleMatrix();
});

$('#schFilterSearch')?.addEventListener('input', () => {
  renderScheduleMatrix();
});
