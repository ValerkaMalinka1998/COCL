/* ============================================================
   СТРАНИЦА стандарта: открытие, поля, точки
   #tab-standard-view.
   Модуль общего пространства имён: функции и переменные видны
   во всех файлах. Порядок подключения — index.html.
   ============================================================ */

/* ============================================================
   ПОЛНОЭКРАННЫЙ СТАНДАРТ (sv-full) — открытие и заполнение
   ============================================================ */

/* Состояние полноэкранного просмотра */
const svFullState = {
  standardId: null,        // id текущего стандарта
  mode: 'view',            // 'view' | 'edit'
  originalData: null,      // снимок для отмены редактирования
  editingData: null,       // НОВОЕ: рабочая копия при редактировании
  isNew: false             // создаётся новый стандарт (ещё не в хранилище)
};

/* Открыть полноэкранный просмотр стандарта */
function openStandardFullView(id, mode) {
  const st = getStandards().find(s => s.id === id);
  if (!st) {
    showToast('Стандарт не найден', true);
    return;
  }

  svFullState.standardId = id;
  svFullState.isNew = false;
  svFullState.mode = mode === 'edit' ? 'edit' : 'view';
  svFullState.originalData = JSON.parse(JSON.stringify(st));

  // ВАЖНО: если открываем сразу в режиме редактирования —
  // создаём рабочую копию editingData
  if (svFullState.mode === 'edit') {
    svFullState.editingData = JSON.parse(JSON.stringify(st));
  } else {
    svFullState.editingData = null;
  }

  // Открываем таб
  if (typeof switchTab === 'function') {
    switchTab('standard-view');
  }

  // Перерисовываем всё
  renderStandardFullView();

  // Прокручиваем наверх
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
window.openStandardFullView = openStandardFullView;

/* ============================================================ */
/* === СОЗДАНИЕ МЕХАНИЧЕСКОГО СТАНДАРТА ======================= */
/* ============================================================ */
/* Новый стандарт открывается на той же полной странице, что и
   редактирование существующего, — в режиме редактирования.
   В хранилище он попадает только после «Сохранить». */
function openStandardCreatePage() {
  const line = localStorage.getItem('cl_editor_line');
  if (!line) return showToast('Сначала выберите линию', true);

  const st = createEmptyStandard();
  st.id = uid();
  st.line = line;
  st.controlType = 'variable';
  // Часть линии подставляем из фильтра редактора (только SMD)
  if (getWorkshopIdForLine(line) === 'smd') {
    const part = $('#emFilterPart')?.value || '';
    if (part === 'Maker' || part === 'Packer') st.nodePart = part;
  }
  // Одна пустая строка точек, чтобы было куда вводить значения
  st.measurements = [{ brand: '', points: [{ value: '' }] }];

  svFullState.standardId = st.id;
  svFullState.isNew = true;
  svFullState.mode = 'edit';
  svFullState.originalData = JSON.parse(JSON.stringify(st));
  svFullState.editingData = st;

  if (typeof switchTab === 'function') switchTab('standard-view');
  switchSvFullTab('main');
  renderStandardFullView();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
window.openStandardCreatePage = openStandardCreatePage;

/* Закрыть полноэкранный просмотр — вернуться в редактор */
function closeStandardFullView() {
  svFullState.standardId = null;
  svFullState.isNew = false;
  svFullState.mode = 'view';
  svFullState.originalData = null;
  svFullState.editingData = null;

  if (typeof switchTab === 'function') {
    switchTab('editor');
  }
}
window.closeStandardFullView = closeStandardFullView;

/* Главный рендер полноэкранного просмотра */
function renderStandardFullView() {
  const id = svFullState.standardId;
  if (!id) return;

  // В режиме редактирования работаем с копией
  let st;
  if (svFullState.mode === 'edit' && svFullState.editingData) {
    st = svFullState.editingData;
  } else {
    st = getStandards().find(s => s.id === id);
  }

  if (!st) {
    showToast('Стандарт не найден', true);
    closeStandardFullView();
    return;
  }

  const isEdit = svFullState.mode === 'edit';

  // --- Заголовок ---
  const titleEl = $('#svFullTitle');
  if (titleEl) {
    titleEl.textContent = svFullState.isNew
      ? (st.title || 'Новый стандарт')
      : (st.title || '—');
  }
  // У нового стандарта ещё нет ознакомлений, истории и комментариев
  const svTabs = $('#svFullTabs');
  if (svTabs) svTabs.style.display = svFullState.isNew ? 'none' : '';

  // --- Крошки ---
  renderSvFullCrumbs(st);

  // --- Валидация: плашка с решением (в просмотре) ---
  const valBox = $('#svFullValidation');
  if (valBox) valBox.innerHTML = (isEdit || svFullState.isNew) ? '' : valBannerHtml(st, 'mech');

  // --- Кнопки ---
  const viewBtn = $('#svFullViewToggleBtn');
  const editBtn = $('#svFullEditBtn');
  const proposalBtn = $('#svFullProposalBtn');
  const saveBtn = $('#svFullSaveBtn');
  const cancelBtn = $('#svFullCancelBtn');

  if (isEdit) {
    if (viewBtn) viewBtn.style.display = 'none';
    if (editBtn) editBtn.style.display = 'none';
    if (proposalBtn) proposalBtn.style.display = 'none';
    if (saveBtn) saveBtn.style.display = 'inline-flex';
    if (cancelBtn) cancelBtn.style.display = 'inline-flex';
  } else {
    if (viewBtn) viewBtn.style.display = 'inline-flex';
    if (editBtn) editBtn.style.display = 'inline-flex';
    if (proposalBtn) proposalBtn.style.display = 'none';   // позже
    if (saveBtn) saveBtn.style.display = 'none';
    if (cancelBtn) cancelBtn.style.display = 'none';
  }

  // --- Бейджи вкладок ---
  const ackCount = Array.isArray(st.acknowledgements) ? st.acknowledgements.length : 0;
  const versionsCount = Array.isArray(st.versions) ? st.versions.length : 0;
  const commentsCount = Array.isArray(st.comments) ? st.comments.length : 0;

  // Счётчик вкладки «История изменений» ставит renderSvHistoryTable
  const commentsBadge = $('#svCommentsCount');
  if (commentsBadge) commentsBadge.textContent = commentsCount;

  const ackBadge = $('#svAckBadge');
  if (ackBadge) {
    // Показываем «Новое» если есть версии и никто не ознакомлен с последней
    const lastVersion = st.version || 1;
    const hasAck = Array.isArray(st.acknowledgements) &&
      st.acknowledgements.some(a => a.version === lastVersion);
    ackBadge.style.display = (!hasAck && versionsCount > 0) ? 'inline-flex' : 'none';
  }

  // --- Основная информация ---
  renderSvMainFields(st, isEdit);

  // --- Точки контроля и описание ---
  renderSvContentBlocks(st, isEdit);

  // --- Изображения ---
  renderSvFullPhotos(st, isEdit);

  // --- Связанные объекты ---
  renderSvFullRelated(st);

  // --- Дополнительная информация ---
  renderSvFullExtra(st, isEdit);

  // --- Таблицы вкладок (пока заглушки) ---
  renderSvAckTable(st);
  renderSvHistoryTable(st);
  renderSvCommentsTable(st);
}

/* Крошки в шапке */
function renderSvFullCrumbs(st) {
  const el = $('#svFullCrumbs');
  if (!el) return;

  const ctx = typeof getBlockForLine === 'function' ? getBlockForLine(st.line) : null;
  if (!ctx) {
    el.innerHTML = '';
    return;
  }

  const parts = [];
  // ID
  if (st.oplNumber) {
    parts.push(`<span class="sv-full-crumb-id">#${escapeHtml(st.oplNumber)}</span>`);
  }
  // Цех
  parts.push(`<span class="sv-full-crumb">${escapeHtml(ctx.workshop.name)}</span>`);
  // Участок + блок
  if (ctx.block) {
    parts.push(`<span class="sv-full-crumb-sep">›</span>`);
    parts.push(`<span class="sv-full-crumb">${escapeHtml(ctx.area.name)} (${escapeHtml(ctx.block.name)})</span>`);
  } else {
    parts.push(`<span class="sv-full-crumb-sep">›</span>`);
    parts.push(`<span class="sv-full-crumb">${escapeHtml(ctx.area.name)}</span>`);
  }
  // Линия
  parts.push(`<span class="sv-full-crumb-sep">›</span>`);
  parts.push(`<span class="sv-full-crumb-current">${escapeHtml(st.line || '—')}</span>`);
  // Машина
  if (st.machine) {
    parts.push(`<span class="sv-full-crumb-sep">›</span>`);
    parts.push(`<span class="sv-full-crumb-current">${escapeHtml(st.machine)}</span>`);
  }

  el.innerHTML = parts.join(' ');
}

/* ============================================================
   Основная информация — поля
   ============================================================ */

function renderSvMainFields(st, isEdit) {
  const wrap = $('#svMainFields');
  if (!wrap) return;

  const isActive = st.active !== false;
  const statusHtml = isActive
    ? '<span class="sv-status-chip sv-status-active">Активен</span>'
    : '<span class="sv-status-chip sv-status-inactive">Неактивен</span>';

  // Формат времени
  const durationText = formatSvDuration(st.durationSec);

  if (!isEdit) {
    // --- Режим просмотра ---
    wrap.innerHTML = `
      ${svFieldRow('Название', st.title || '')}
      ${svFieldRow('№ OPL', st.oplNumber || '')}
      ${svFieldRow('Машина', st.machine || '')}
      ${svFieldRow('Узел', st.node || '')}
      ${svFieldRow('Время на проверку', durationText)}
      ${svFieldRow('Инструмент', st.tool || '')}
      ${svFieldRow('Тип контроля', controlTypeLabel(st.controlType))}
      <div class="sv-full-field">
        <div class="sv-full-field-label">Статус</div>
        <div class="sv-full-field-value">${statusHtml}</div>
      </div>
    `;
  } else {
    // --- Режим редактирования ---
    // Заполняем машины
    const machines = getMachinesForLine(st.line);
    const machineOpts = ['<option value="">— выберите —</option>']
      .concat(machines.map(m => {
        const sel = (m === st.machine) ? ' selected' : '';
        return `<option value="${escapeHtml(m)}"${sel}>${escapeHtml(m)}</option>`;
      }))
      .join('');

    // Часть линии — только SMD
    const workshopId = getWorkshopIdForLine(st.line);
    const showNodePart = (workshopId === 'smd');
    const nodePartHtml = showNodePart ? `
      <div class="sv-full-field-edit">
        <label class="required">Часть линии</label>
        <select id="svf_nodePart">
          <option value="">— выберите —</option>
          <option value="Maker" ${st.nodePart === 'Maker' ? 'selected' : ''}>Maker</option>
          <option value="Packer" ${st.nodePart === 'Packer' ? 'selected' : ''}>Packer</option>
        </select>
      </div>
    ` : '';

    wrap.innerHTML = `
      <div class="sv-full-field-edit">
        <label class="required">Название</label>
        <input type="text" id="svf_title" value="${escapeAttr(st.title || '')}">
      </div>
      <div class="sv-full-field-edit">
        <label class="required">№ OPL</label>
        <input type="text" id="svf_oplNumber" value="${escapeAttr(st.oplNumber || '')}">
      </div>
      <div class="sv-full-field-edit">
        <label class="required">Машина</label>
        <div class="sv-field-with-btn">
          <select id="svf_machine">${machineOpts}</select>
          <button type="button" class="btn btn-secondary btn-sm" id="svf_addMachineBtn" title="Добавить машину в список линии">+</button>
        </div>
      </div>
      ${nodePartHtml}
      <div class="sv-full-field-edit">
        <label class="required">Узел</label>
        <input type="text" id="svf_node" value="${escapeAttr(st.node || '')}">
      </div>
      <div class="sv-full-field-edit">
        <label>Время на проверку (секунд)</label>
        <input type="number" id="svf_durationSec" min="0" step="1"
               value="${escapeAttr(st.durationSec || 0)}"
               placeholder="60">
        <p style="color:var(--text-dim);font-size:11px;margin-top:6px">
          60 сек = 1 мин, 30 сек = 0.5 мин
        </p>
      </div>
      <div class="sv-full-field-edit">
        <label>Инструмент</label>
        <input type="text" id="svf_tool"
               value="${escapeAttr(st.tool || '')}"
               placeholder="Штангенциркуль, линейка...">
      </div>
      <div class="sv-full-field-edit">
        <label class="required">Тип контроля</label>
        <select id="svf_controlType">
          <option value="">— выберите —</option>
          <option value="fixed"     ${st.controlType === 'fixed'    ? 'selected' : ''}>Фиксированный</option>
          <option value="variable"  ${st.controlType === 'variable' ? 'selected' : ''}>Вариабельный</option>
          <option value="interval"  ${st.controlType === 'interval' ? 'selected' : ''}>Контролируемый интервал</option>
        </select>
        <div class="ct-hint" id="svf_typeHint">${controlTypeHintHtml(st.controlType)}</div>
      </div>
      <div class="sv-full-field-edit">
        <label>Статус</label>
        <label style="display:inline-flex;align-items:center;gap:8px;text-transform:none;letter-spacing:0;font-weight:500;font-size:13px;color:var(--text-main)">
          <input type="checkbox" id="svf_active" ${isActive ? 'checked' : ''}>
          Активен
        </label>
      </div>
    `;
  }
}

/* Строка поля (просмотр) */
function svFieldRow(label, value) {
  const isEmpty = !value || !String(value).trim();
  return `
    <div class="sv-full-field">
      <div class="sv-full-field-label">${escapeHtml(label)}</div>
      <div class="sv-full-field-value ${isEmpty ? 'sv-empty' : ''}">
        ${isEmpty ? 'Не указано' : escapeHtml(value)}
      </div>
    </div>
  `;
}

/* Формат длительности */
function formatSvDuration(sec) {
  const n = Number(sec) || 0;
  if (n <= 0) return '';
  if (n < 60) return `${n} сек`;
  const min = Math.floor(n / 60);
  const rest = n % 60;
  if (rest === 0) return `${min} мин`;
  return `${min} мин ${rest} сек`;
}

/* ============================================================
   Точки контроля и описание — блоки
   ============================================================ */

function renderSvContentBlocks(st, isEdit) {
  const wrap = $('#svContentBlocks');
  if (!wrap) return;

  wrap.innerHTML = buildSvContentBlocksHtml(st, isEdit);

  // В режиме редактирования — обработчики таблицы контроля
  if (isEdit) bindSvControlEvents(st);
}

/* HTML блоков «Точки контроля и описание». Общий для полной страницы
   стандарта и окна просмотра (#standardViewModal), чтобы они выглядели
   одинаково. */
function buildSvContentBlocksHtml(st, isEdit) {
  // 1. Описание — на всю ширину
  const blockDescription = svContentBlockEditable(
    'Описание',
    st.problemDescription,
    'svf_problemDescription',
    isEdit,
    'Опишите: к чему приводит отклонение, какие остановки/потери'
  );

  // 2. Контроль правильности — на всю ширину
  const blockControl = renderSvControlSection(st, isEdit);

  // 3. Описание контроля — левая колонка
  const blockControlDesc = svContentBlockEditable(
    'Описание контроля',
    st.controlDescription,
    'svf_controlDescription',
    isEdit,
    'Как проверять: пошаговая инструкция'
  );

  // 4. Цель — правая колонка
  const blockPurpose = svContentBlockEditable(
    'Цель (зачем мы это делаем?)',
    st.purpose,
    'svf_purpose',
    isEdit,
    'Зачем нужен этот стандарт'
  );

  // 5. Знаю почему — правая колонка
  const blockWhy = svContentBlockEditable(
    'Знаю почему (почему создан стандарт?)',
    st.whyCreated,
    'svf_whyCreated',
    isEdit,
    'К чему приводит отсутствие контроля'
  );

  // Компоновка: «Цель» и «Знаю почему» — две колонки одной высоты
  return `
    ${blockDescription}
    ${blockControl}
    ${blockControlDesc}
    <div class="sv-content-blocks-grid">
      <div class="sv-content-blocks-col">
        ${blockPurpose}
      </div>
      <div class="sv-content-blocks-col">
        ${blockWhy}
      </div>
    </div>
  `;
}

/* Блок контента — просмотр ИЛИ редактирование */
function svContentBlockEditable(title, value, inputId, isEdit, placeholder) {
  const isEmpty = !value || !String(value).trim();

  if (!isEdit) {
    // Текст — без пробелов и переносов вокруг: у .sv-content-block-text
    // white-space: pre-wrap, и любые отступы шаблона стали бы видны.
    const text = isEmpty ? 'Не указано' : escapeHtml(String(value).trim());
    return `
      <div class="sv-content-block">
        <div class="sv-content-block-title">${escapeHtml(title)}</div>
        <div class="sv-content-block-text ${isEmpty ? 'sv-empty' : ''}">${text}</div>
      </div>
    `;
  }

  return `
    <div class="sv-content-block">
      <div class="sv-content-block-title">${escapeHtml(title)}</div>
      <textarea id="${inputId}" rows="3"
                placeholder="${escapeAttr(placeholder)}"
                class="sv-content-textarea">${escapeHtml(value || '')}</textarea>
    </div>
  `;
}

/* ============================================================
   Контроль правильности — таблица брендов × точек
   (просмотр + редактирование)
   ============================================================ */

/* Секция «Контроль правильности» */
function renderSvControlSection(st, isEdit) {
  const typeLabel = controlTypeLabel(st.controlType);

  if (!isEdit) {
    // --- Просмотр ---
    return `
      <div class="sv-content-block">
        <div class="sv-content-block-title">Контроль правильности</div>
        <div style="margin-bottom:8px">
          <span class="sv-chip sv-chip-cyan">${escapeHtml(typeLabel)}</span>
        </div>
        ${renderSvBrandBlocksView(st)}
      </div>
    `;
  }

  // --- Редактирование ---
  return `
    <div class="sv-content-block">
      <div class="sv-content-block-title">Контроль правильности</div>
      <div style="margin-bottom:8px">
        <span class="sv-chip sv-chip-cyan">${escapeHtml(typeLabel)}</span>
      </div>
      <div id="svf_brandBlocksContainer"></div>
      <button type="button" class="btn btn-secondary btn-sm" id="svf_addBrandBlockBtn" style="margin-top:8px">
        + Добавить бренд
      </button>
    </div>
  `;
}

/* Просмотр точек по брендам — таблицей как в редакторе стандарта.
   Общий помощник, чтобы и компактный (#standardViewModal), и полноэкранный
   (#standardFullViewModal) просмотр выглядели одинаково с формой. */
function renderReadonlyBrandsTable(measurements) {
  const blocks = Array.isArray(measurements) ? measurements : [];
  const maxPoints = blocks.reduce((m, b) => Math.max(m, (b && Array.isArray(b.points)) ? b.points.length : 0), 0);

  if (!maxPoints) {
    return '<div class="sv-content-block-text sv-empty">Точки не заданы</div>';
  }

  let headerHtml = `<tr><th class="bt-th-brand">Бренд</th>`;
  for (let i = 0; i < maxPoints; i++) {
    headerHtml += `<th class="bt-th-point"><span>Точка ${i + 1}</span></th>`;
  }
  headerHtml += `</tr>`;

  const bodyHtml = blocks.map(block => {
    const points = (block && Array.isArray(block.points)) ? block.points : [];
    let cells = '';
    for (let i = 0; i < maxPoints; i++) {
      const val = points[i]?.value || '';
      cells += `<td class="bt-td-value">${escapeHtml(val) || '<span style="color:var(--text-dim)">—</span>'}</td>`;
    }
    return `<tr><td class="bt-td-brand">${escapeHtml(block && block.brand ? block.brand : REST_BRANDS_LABEL)}</td>${cells}</tr>`;
  }).join('');

  return `
    <div class="brands-table-wrap">
      <table class="brands-table">
        <thead>${headerHtml}</thead>
        <tbody>${bodyHtml}</tbody>
      </table>
    </div>
  `;
}

function renderSvBrandBlocksView(st) {
  const blocks = Array.isArray(st.measurements) ? st.measurements : [];
  if (!blocks.length) {
    return '<div class="sv-content-block-text sv-empty">Точки не заданы</div>';
  }
  return renderReadonlyBrandsTable(blocks);
}
/* ============================================================
   Таблица брендов × точек — рендер в новом экране
   ============================================================ */

/* Отрисовать таблицу в контейнере #svf_brandBlocksContainer */
function renderSvBrandsTable(measurements) {
  const container = $('#svf_brandBlocksContainer');
  if (!container) return;

  const brands = getBrands();

  // Нормализуем
  const state = (measurements || []).map(b => ({
    brand: b.brand || '',
    points: Array.isArray(b.points) ? b.points.map(p => ({ value: p.value || '' })) : []
  }));
  const maxPoints = state.reduce((m, b) => Math.max(m, b.points.length), 0);
  state.forEach(b => {
    while (b.points.length < maxPoints) b.points.push({ value: '' });
  });

  // Шапка
  let headerHtml = `<tr>
    <th class="bt-th-brand">Бренд</th>`;
  for (let i = 0; i < maxPoints; i++) {
    headerHtml += `<th class="bt-th-point">
      <span>Точка ${i + 1}</span>
      <button type="button" class="bt-remove-point" data-remove-point-col="${i}" title="Удалить точку у всех брендов">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:12px;height:12px">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </th>`;
  }
  headerHtml += `<th class="bt-th-actions">
    <button type="button" class="bt-add-point-btn" data-add-point-col title="Добавить точку">+ Точка</button>
  </th></tr>`;

  // Тело
  let bodyHtml = '';
  if (!state.length) {
    bodyHtml = `<tr><td colspan="${maxPoints + 2}" class="bt-empty">Нет брендов. Нажмите «+ Добавить бренд».</td></tr>`;
  } else {
    bodyHtml = state.map((block, rowIndex) => {
      let cells = '';
      for (let i = 0; i < maxPoints; i++) {
        const val = block.points[i]?.value || '';
        cells += `<td class="bt-td-value">
          <input type="text" class="bt-point-input"
                 data-row="${rowIndex}" data-col="${i}"
                 value="${escapeAttr(val)}" placeholder="${escapeAttr((CONTROL_TYPE_HELP[$('#svf_controlType')?.value || svFullState.editingData?.controlType] || {}).placeholder || '0')}">
        </td>`;
      }

      // Бренд, уже занятый другой строкой, повторно выбрать нельзя
      const usedElsewhere = new Set(state.filter((_, i) => i !== rowIndex).map(x => x.brand || ''));
      const brandOptions = (usedElsewhere.has('') ? [] : ['<option value="">Остальные бренды</option>'])
        .concat(brands.filter(b => !usedElsewhere.has(b) || b === block.brand).map(b => {
          const selected = (b === block.brand) ? ' selected' : '';
          return `<option value="${escapeHtml(b)}"${selected}>${escapeHtml(b)}</option>`;
        })).join('');

      return `<tr class="bt-row" data-row="${rowIndex}">
        <td class="bt-td-brand">
          <select class="bt-brand-select" data-row="${rowIndex}">${brandOptions}</select>
          <button type="button" class="bt-remove-brand" data-remove-brand="${rowIndex}" title="Удалить бренд">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
              <path d="M10 11v6"/><path d="M14 11v6"/>
            </svg>
          </button>
        </td>
        ${cells}
        <td class="bt-td-actions"></td>
      </tr>`;
    }).join('');
  }

  container.innerHTML = `
    <div class="brands-table-wrap">
      <table class="brands-table">
        <thead>${headerHtml}</thead>
        <tbody>${bodyHtml}</tbody>
      </table>
    </div>
  `;
}

/* Прочитать state из DOM */
function getSvTableState() {
  const container = $('#svf_brandBlocksContainer');
  if (!container) return [];
  const state = [];
  container.querySelectorAll('.bt-row').forEach(row => {
    const brand = row.querySelector('.bt-brand-select')?.value || '';
    const points = [];
    row.querySelectorAll('.bt-point-input').forEach(inp => {
      points.push({ value: inp.value || '' });
    });
    state.push({ brand, points });
  });
  return state;
}

/* Отрисовать state обратно в DOM */
function renderSvBrandsTableFromState(state) {
  const maxPoints = state.reduce((m, b) => Math.max(m, (b.points || []).length), 0);
  state.forEach(b => {
    while (b.points.length < maxPoints) b.points.push({ value: '' });
  });
  renderSvBrandsTable(state);
  bindSvControlEvents(svFullState.originalData);
}

/* Обработчики событий в таблице контроля */
function bindSvControlEvents(st) {
  const container = $('#svf_brandBlocksContainer');
  if (!container) return;

  // Если таблица ещё не отрисована — отрисовываем из st.measurements,
  // НО не выходим: ниже должны привязаться обработчики (в т.ч. «+ Добавить бренд»).
  if (!container.querySelector('.bt-row') && !container.querySelector('.bt-empty')) {
    renderSvBrandsTable(st.measurements || []);
  }

  // --- Удаление бренда ---
  container.querySelectorAll('[data-remove-brand]').forEach(btn => {
    btn.addEventListener('click', () => {
      const rowIndex = parseInt(btn.dataset.removeBrand, 10);
      const state = getSvTableState();
      if (!confirm('Удалить бренд со всеми его точками?')) return;
      state.splice(rowIndex, 1);
      renderSvBrandsTableFromState(state);
    });
  });

  // --- Удаление колонки точки ---
  container.querySelectorAll('[data-remove-point-col]').forEach(btn => {
    btn.addEventListener('click', () => {
      const colIndex = parseInt(btn.dataset.removePointCol, 10);
      const state = getSvTableState();
      if (!confirm(`Удалить точку ${colIndex + 1} у всех брендов?`)) return;
      state.forEach(b => b.points.splice(colIndex, 1));
      renderSvBrandsTableFromState(state);
    });
  });

  // --- Добавление колонки точки ---
  container.querySelectorAll('[data-add-point-col]').forEach(btn => {
    btn.addEventListener('click', () => {
      const state = getSvTableState();
      if (!state.length) {
        state.push({ brand: '', points: [{ value: '' }] });
      } else {
        state.forEach(b => b.points.push({ value: '' }));
      }
      renderSvBrandsTableFromState(state);
    });
  });

  // --- Кнопка «+ Добавить бренд» ---
  const addBrandBtn = $('#svf_addBrandBlockBtn');
  if (addBrandBtn && !addBrandBtn.dataset.bound) {
    addBrandBtn.dataset.bound = '1';
    addBrandBtn.addEventListener('click', () => {
      const state = getSvTableState();
      const maxPoints = state.reduce((m, b) => Math.max(m, (b.points || []).length), 0);
      const pointsCount = Math.max(maxPoints, 1);
      const newPoints = [];
      for (let i = 0; i < pointsCount; i++) newPoints.push({ value: '' });
      // Новая строка — с первым ещё не занятым брендом («Остальные бренды» — тоже один раз)
      const used = new Set(state.map(b => b.brand || ''));
      const free = used.has('') ? getBrands().find(b => !used.has(b)) : '';
      if (free === undefined) return showToast('Все бренды уже добавлены', true);
      state.push({ brand: free, points: newPoints });
      renderSvBrandsTableFromState(state);
    });
  }

  // --- Смена бренда в строке: пересобрать списки, чтобы бренд не повторялся ---
  container.querySelectorAll('.bt-brand-select').forEach(sel => {
    sel.addEventListener('change', () => renderSvBrandsTableFromState(getSvTableState()));
  });
}
