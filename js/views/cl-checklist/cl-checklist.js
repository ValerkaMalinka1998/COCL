/* ============================================================
   ВКЛАДКА «Чек-лист CL»
   Матрица недели, режим проверки.
   Модуль общего пространства имён: функции и переменные видны
   во всех файлах. Порядок подключения — index.html.
   ============================================================ */

/* ============================================================
   CL ELECTRONIC — попадает ли параметр в конкретную дату/смену
   ============================================================ */

/* Проверяет: должен ли параметр проверяться в указанную дату
   и указанную смену. Возвращает true/false. */
function isElectronicParamDue(p, dateStr, shiftType) {
  const freq = p.frequency;
  if (!freq) return false;

  // shiftType: 'day' | 'night' — смена по времени суток
  // freq.shifts: массив, содержащий 'day' и/или 'night'
  if (Array.isArray(freq.shifts) && freq.shifts.length) {
    if (!freq.shifts.includes(shiftType)) return false;
  }

  switch (freq.type) {
    case 'daily':
      return true;

    case 'weekly': {
      const d = new Date(dateStr + 'T00:00:00');
      return freq.daysOfWeek.includes(d.getDay());
    }

    case 'once':
      return freq.dates.includes(dateStr);

    default:
      return false;
  }
}
/* ============================================================
   CL ELECTRONIC — вкладка оператора
   ============================================================ */

/* Состояние вкладки */
const elecState = {
  operator: '',
  line: '',
  date: '',        // 'YYYY-MM-DD'
  shift: '',       // 'A' | 'B' | 'C' | 'D'
  brand: '',       // бренд на сегодня (auto или override)
  brandPlanned: '',// из расписания (может быть пустой)
  brandReason: '', // причина ручного override
  items: [],       // собранные параметры
};


/* ============================================================
   CL ELECTRONIC: под-вкладки (Проверка на сегодня / Неделя)
   ============================================================ */

const ELEC_SUBTAB_KEY = 'cl_elec_subtab';   // 'today' | 'week'

/* Обработчики кнопок под-вкладок */
document.querySelectorAll('#elecSubtabs .elec-subtab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    switchElecSubtab(btn.dataset.subtab);
  });
});

/* ============================================================
   Чек-лист CL Electronic на сегодня
   ============================================================ */

$$('#elecChecklistContainer .elec-acc-item').forEach(item => {
  const operator = ($('#elecOperator')?.value || '').trim();
  const line = elecState.line;
  const date = elecState.date;
  const shift = elecState.shift;
  const brand = elecState.brand;

  if (!line)     return showToast('Выберите линию', true);
  if (!brand)    return showToast('Бренд не определён', true);

  const items = [];

  $$('#elecChecklistContainer .checklist-item').forEach(item => {
    const it = elecState.items.find(x => x.id === item.dataset.elecId);
    if (!it) return;

    let answer = '—';
    let status = 'UNCHECKED';
    let value = null;

    if (it.controlType === 'fixed') {
      const r = item.querySelector('input[data-elec-ans]:checked');
      if (r) {
        answer = r.value === 'OK' ? 'ОК' : 'Не ОК';
        status = r.value;
      }
    } else {
      const inp = item.querySelector('input[data-elec-value]');
      if (inp && inp.value !== '') {
        value = parseFloat(inp.value);
        if (!isNaN(value)) {
          const min = it.target - it.tolerance;
          const max = it.target + it.tolerance;
          const inRange = value >= min && value <= max;
          answer = `${value}`;
          status = inRange ? 'OK' : 'FAIL';
        }
      }
    }

    items.push({
      standardId: it.id,
      machine: it.machine,
      paramName: it.paramName,
      work: it.work,
      timeFrom: it.timeFrom,
      timeTo: it.timeTo,
      controlType: it.controlType,
      target: it.target,
      tolerance: it.tolerance,
      normText: it.normText,
      answer,
      value,
      status,
      comment: item.dataset.comment || ''
    });
  });

  const checkedCount = items.filter(it => it.status !== 'UNCHECKED').length;

  const record = {
    id: uid(),
    timestamp: new Date().toISOString(),
    mode: 'electronic',
    operator,
    line,
    shift,
    date,
    brandPlanned: elecState.brandPlanned || null,
    brandActual: brand,
    brandReason: elecState.brandReason || '',
    items
  };

  const hist = getHistory();
  hist.push(record);
  setHistory(hist);
  updateNavHistoryCounter();

  showToast(checkedCount === 0 ? 'Проверка сохранена (все пункты — «Не проверено»)' : 'Проверка сохранена');

  renderElectronicSummary(record);
});

/* Обновить кнопку «Обновить» */
$('#elecReloadBtn')?.addEventListener('click', () => {
  refreshElectronicTab();
});

/* Реакция на смену оператора/линии */
$('#elecOperator')?.addEventListener('input', () => {
  elecState.operator = $('#elecOperator').value.trim();
});
$('#elecLine')?.addEventListener('change', () => {
  refreshElectronicTab();
});
/* ============================================================
   ПРОВЕРКА CL — логика
   ============================================================ */

function openClCheckTab() {
  const savedMode = localStorage.getItem('cl_cl_mode') || 'mech';
  const savedPart = localStorage.getItem('cl_cl_part') || '';
  const savedLine = localStorage.getItem('cl_cl_line') || null;

  clState.mode = savedMode;
  clState.part = savedPart;
  clState.line = savedLine;
  clState.checkMode = false;
  clState.quickDraft = {};

  document.querySelectorAll('#clModeSwitch .editor-mode-inline-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === savedMode);
  });
  document.querySelectorAll('#clPartSwitch .editor-part-switch-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.part === savedPart);
  });

  updateClPartSwitchVisibility();
  updateClCheckButtons();
  updateClLinePill();
  updateClContext();
  updateClPanelCount();
  renderClMatrix();

  if (!clState.line) {
    setTimeout(() => {
      if (typeof openLinePickerModal === 'function') openLinePickerModal();
    }, 150);
  }
}

function updateClLinePill() {
  const codeEl = $('#clLinePillCode');
  if (!codeEl) return;
  if (clState.line) {
    const ctx = getBlockForLine(clState.line);
    const wsName = ctx ? ctx.workshop.name : '';
    codeEl.textContent = clState.line + (wsName ? ' · ' + wsName : '');
  } else {
    codeEl.textContent = 'Выбрать линию';
  }
}

function updateClPartSwitchVisibility() {
  const el = $('#clPartSwitch');
  if (!el) return;
  el.style.display = (clState.mode === 'mech') ? 'inline-flex' : 'none';
}

function updateClCheckButtons() {
  const startBtn = $('#clStartCheckBtn');
  const stopBtn = $('#clStopCheckBtn');
  if (!startBtn || !stopBtn) return;

  const canStart = clState.line && !clState.checkMode;
  startBtn.disabled = !canStart;

  if (clState.checkMode) {
    startBtn.style.display = 'none';
    stopBtn.style.display = 'inline-flex';
  } else {
    startBtn.style.display = 'inline-flex';
    stopBtn.style.display = 'none';
  }
}

function updateClContext() {
  const bar = $('#clContextBar');
  if (!bar) return;

  if (!clState.line) {
    bar.style.display = 'none';
    return;
  }

  // Реальная «календарная» сегодня — для навигации по неделям и missed
  const dateStr = todayISO();
  clState.todayISO = dateStr;
  // Активный период смены (тип + дата начала смены) — для подсветки/клика
  const period = getCurrentShiftPeriod();
  clState.activeDate = period.date;
  clState.shiftType = period.shiftType;

  const shifts = getShiftsForDate(period.date);
  clState.shiftLetter = shifts[clState.shiftType] || '—';

  const brandPlanned = getElectronicBrandForDate(clState.line, period.date) || '';
  clState.brandPlanned = brandPlanned;
  clState.brand = brandPlanned;

  const dateFormatted = fmtISODate(period.date);
  const shiftLabel = clState.shiftType === 'day' ? 'День' : 'Ночь';

  bar.innerHTML = `
    <div class="cl-context-item">
      <span class="cl-context-label">Дата:</span>
      <span class="cl-context-value">${escapeHtml(dateFormatted)}</span>
    </div>
    <div class="cl-context-item">
      <span class="cl-context-label">Смена:</span>
      <span class="cl-context-value">
        ${shiftLabel} · бригада
        <span class="cl-shift-badge cl-shift-${clState.shiftLetter}">${escapeHtml(clState.shiftLetter)}</span>
      </span>
    </div>
    <div class="cl-context-item">
      <span class="cl-context-label">Бренд:</span>
      <span class="cl-context-value cl-brand-value">${escapeHtml(clState.brand || '— не задан —')}</span>
      <button type="button" class="cl-brand-edit-btn" id="clEditBrandBtn" title="Изменить бренд">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
        </svg>
      </button>
    </div>
  `;

  bar.style.display = 'flex';

  $('#clEditBrandBtn')?.addEventListener('click', openClBrandOverrideDialog);
}

function openClBrandOverrideDialog() {
  const brands = getBrandsForLine(clState.line);
  if (!brands.length) return showToast('На линии нет брендов', true);

  const brandList = brands.join(', ');
  const current = clState.brand || '';
  const newBrand = prompt(`Бренд на ${fmtISODate(clState.todayISO)}\nДоступные: ${brandList}`, current);
  if (newBrand === null) return;
  const trimmed = newBrand.trim();
  if (!trimmed) return;
  if (!brands.includes(trimmed)) return showToast('Бренд не найден на линии', true);
  if (trimmed === clState.brand) return;

  const reason = prompt('Причина изменения (кратко):', '') || '';
  clState.brand = trimmed;
  clState.brandReason = reason.trim();

  updateClContext();
  renderClMatrix();
}

function updateClPanelCount() {
  const el = $('#clPanelCount');
  if (!el) return;
  if (!clState.line) {
    el.textContent = '';
    return;
  }
  const n = clState.rows.length;
  const label = clState.mode === 'mech' ? 'стандартов' : 'параметров';
  el.textContent = `${n} ${label}`;
}

function renderClMatrix() {
  const wrap = $('#clMatrixWrap');
  if (!wrap) return;

  // Меняем класс: с .sch-matrix-wrap на .cl-matrix-wrap
  wrap.className = 'cl-matrix-wrap';

  if (!clState.line) {
    wrap.innerHTML = '<div class="editor-empty">Выберите линию для начала проверки</div>';
    updateClPanelCount();
    return;
  }

  // --- Расписание для просматриваемой недели + уже проверенные стандарты ---
  const weekDaysForRows = getClWeekDays(clState.weekOffset);
  const weekStartForRows = weekDaysForRows[0];

  // Стандарты/параметры, у которых УЖЕ есть результат проверки на этой неделе.
  // Их нельзя скрывать, даже если их убрали из расписания — иначе у оператора
  // пропадут уже выполненные проверки.
  const checkedIds = getCheckedStandardIdsForWeek(clState.line, weekDaysForRows);

  // Шаблон, действовавший на этой неделе, + разовые правки недели
  const isMember = (row) => getRowForWeek(row, weekStartForRows, clState.line).member;

  let rows = [];
  if (clState.mode === 'mech') {
    rows = getStandards()
      .filter(s => s.line === clState.line)
      .filter(s => s.active !== false || checkedIds.has(s.id))
      .filter(s => isMember(s) || checkedIds.has(s.id))
      .filter(s => !clState.part || s.nodePart === clState.part);
  } else {
    rows = getElectronicParamsForLine(clState.line)
      .filter(p => p.active !== false || checkedIds.has(p.id))
      .filter(p => isMember(p) || checkedIds.has(p.id));
  }

  rows.sort((a, b) => {
    const oa = String(a.oplNumber || a.paramName || '').toLowerCase();
    const ob = String(b.oplNumber || b.paramName || '').toLowerCase();
    return oa.localeCompare(ob, 'ru', { numeric: true });
  });

  clState.rows = rows;
  updateClPanelCount();

  if (!rows.length) {
    wrap.innerHTML = `
      <div class="sch-empty">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
          <line x1="16" y1="2" x2="16" y2="6"/>
          <line x1="8" y1="2" x2="8" y2="6"/>
          <line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
        <div class="sch-empty-title">На линии нет стандартов в расписании</div>
        <div class="sch-empty-sub">Обратитесь к техническому специалисту — он должен добавить стандарты в «Расписание CL».</div>
      </div>
    `;
    return;
  }

  const DAYS = [
    { idx: 1, name: 'Пн' }, { idx: 2, name: 'Вт' }, { idx: 3, name: 'Ср' },
    { idx: 4, name: 'Чт' }, { idx: 5, name: 'Пт' }, { idx: 6, name: 'Сб' },
    { idx: 0, name: 'Вс' }
  ];

  const weekDays = getClWeekDays(clState.weekOffset);
  const dateByDayIdx = {};
  [1, 2, 3, 4, 5, 6, 0].forEach((dayIdx, i) => {
    dateByDayIdx[dayIdx] = weekDays[i];
  });

  // Панель навигации по неделям
  const weekLabel = `${fmtShortDate(weekDays[0])} – ${fmtShortDate(weekDays[6])}`;
  const isCurrentWeek = clState.weekOffset === 0;
  let html = `
    <div class="cl-week-nav">
      <button type="button" class="cl-week-nav-btn" id="clWeekPrev" title="Предыдущая неделя">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
      </button>
      <div class="cl-week-nav-label">
        <span class="cl-week-nav-title">${escapeHtml(weekLabel)}</span>
        ${isCurrentWeek ? '<span class="cl-week-nav-sub">текущая неделя</span>' : ''}
      </div>
      <button type="button" class="cl-week-nav-btn" id="clWeekNext" title="Следующая неделя">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
      </button>
      ${!isCurrentWeek ? '<button type="button" class="cl-week-nav-today" id="clWeekToday">Сегодня</button>' : ''}
    </div>
    <div class="cl-matrix">`;

  // ===== Шапка =====
  html += '<div class="cl-head-grid">';

  // Левая объединённая шапка (8 колонок)
  html += `<div class="cl-head-info">
    <div style="width:48px;text-align:center">№</div>
    <div style="width:100px;text-align:center">OPL №</div>
    <div style="width:80px;text-align:center">Машина</div>
    <div style="width:240px;text-align:left">Узел</div>
    <div style="width:280px;text-align:left">Название</div>
    <div style="width:100px;text-align:center">Время</div>
    <div style="width:80px;text-align:center">Работа</div>
    <div style="width:180px;text-align:center">Норма / точки</div>
  </div>`;

  // Дни и смены (14 колонок)
  DAYS.forEach((d, i) => {
    const dateStr = dateByDayIdx[d.idx];
    const shortDate = dateStr ? fmtShortDate(dateStr) : '';
    const colStart = 9 + i * 2;   // 8 колонок инфо + смещение

    // Бригады для этой даты
    const shifts = dateStr ? getShiftsForDate(dateStr) : { day: '—', night: '—' };

    html += `<div class="sch-head-day" style="grid-column: ${colStart} / ${colStart + 2}; grid-row: 1;">
      ${d.name} <span style="color:var(--text-dim);font-weight:500">${shortDate}</span>
    </div>`;
    html += `<div class="sch-head-shift sch-head-shift-day" style="grid-column: ${colStart}; grid-row: 2;">
      <span class="sch-head-shift-label">День ·</span> ${escapeHtml(shifts.day)}
    </div>`;
    html += `<div class="sch-head-shift sch-head-shift-night" style="grid-column: ${colStart + 1}; grid-row: 2;">
      <span class="sch-head-shift-label">Ночь ·</span> ${escapeHtml(shifts.night)}
    </div>`;
  });
  html += '</div>';

  // ===== Тело =====
  rows.forEach((row, idx) => {
    html += renderClRow(row, idx + 1, DAYS, dateByDayIdx);
  });

  html += '</div>';
  wrap.innerHTML = html;

  bindClCells();
  bindClWeekNav();
}

function bindClWeekNav() {
  $('#clWeekPrev')?.addEventListener('click', () => {
    clState.weekOffset--;
    renderClMatrix();
  });
  $('#clWeekNext')?.addEventListener('click', () => {
    clState.weekOffset++;
    renderClMatrix();
  });
  $('#clWeekToday')?.addEventListener('click', () => {
    clState.weekOffset = 0;
    renderClMatrix();
  });
}

function renderClRow(row, num, DAYS, dateByDayIdx) {
  const freq = getClRowFreq(row);
  const schedule = Array.isArray(freq.schedule) ? freq.schedule : [];
  const isInSchedule = (dayIdx, shift) => schedule.some(x => x.day === dayIdx && x.shift === shift);

  const title = row.title || row.paramName || '—';
  const node = row.node || '';
  const machine = row.machine || '';
  const oplNumber = row.oplNumber || '';
  const work = freq.work === 'Stop' ? 'Stop' : 'Run';

  // Время проверки — из frequency.timeWindows
  const timeWindows = Array.isArray(freq.timeWindows) ? freq.timeWindows : [];

  // Норма/точки
  const normHtml = renderClRowNorm(row);

  let html = `<div class="cl-row" data-row-id="${escapeAttr(row.id)}">`;

  // №
  html += `<div class="cl-info-cell" style="justify-content:center;font-family:'Courier New';font-weight:800;color:var(--text-second)">${num}</div>`;
  // OPL
  html += `<div class="cl-info-cell cl-info-opl">${escapeHtml(oplNumber)}</div>`;
  // Машина
  html += `<div class="cl-info-cell cl-info-machine">${escapeHtml(machine)}</div>`;
  // Узел
  html += `<div class="cl-info-cell cl-info-node" title="${escapeAttr(node)}">${escapeHtml(node)}</div>`;
  // Название
  html += `<div class="cl-info-cell cl-info-title" title="${escapeAttr(title)}">${escapeHtml(title)}</div>`;
  // Время — чипы из timeWindows
  let timeHtml = '';
  if (!timeWindows.length) {
    timeHtml = '<span class="cl-time-empty">—</span>';
  } else {
    timeHtml = timeWindows.map(w => {
      const shift = getTimeWindowShift(w.from);
      return `<span class="cl-time-chip cl-time-chip-${shift}">${escapeHtml(w.from)}–${escapeHtml(w.to)}</span>`;
    }).join('');
  }
  html += `<div class="cl-info-cell cl-info-time">${timeHtml}</div>`;
  // Run/Stop
  html += `<div class="cl-info-cell cl-info-work"><span class="cl-work-badge cl-work-badge-${work.toLowerCase()}">${work}</span></div>`;
  // Норма
  html += `<div class="cl-info-cell cl-info-norm" title="${escapeAttr(normHtml.title || '')}">${normHtml.text}</div>`;

  // 14 ячеек дней
  DAYS.forEach(d => {
    const dateStr = dateByDayIdx[d.idx];

    ['day', 'night'].forEach(shift => {
      const planned = isInSchedule(d.idx, shift);
      const shiftLetter = getShiftsForDate(dateStr)[shift];
      const existing = findExistingCheck(row.id, dateStr, shiftLetter);

      const draftKey = `${row.id}|${dateStr}|${shift}`;
      const draft = clState.quickDraft[draftKey];

      const dateInPast = !!(dateStr && clState.todayISO && dateStr < clState.todayISO);

      // Текущая неделя: активны только дни с даты начала активной смены
      // (например, в Пт утром — с Чт·ночь) и далее. Прошедшие дни текущей
      // недели НЕ считаются запланированными → нет жёлтого «?»/missed.
      // На других неделях расписание действует целиком.
      const isCurrentWeek = clState.weekOffset === 0;
      const activeFrom = isCurrentWeek ? clState.activeDate : null;
      const effectivelyPlanned = planned && (!activeFrom || dateStr >= activeFrom);

      let status = 'na';
      if (draft) {
        status = draft.status;
      } else if (existing) {
        status = existing.status;
      } else if (effectivelyPlanned) {
        status = (!isCurrentWeek && dateInPast) ? 'missed' : 'due';
      }

      const isActiveCell = dateStr === clState.activeDate && shift === clState.shiftType;
      const isClickable = effectivelyPlanned && isActiveCell && clState.checkMode;

      let cls = 'cl-cell';
      let content = '—';

      if (status === 'due') {
        cls += ' cl-cell-due';
        content = '';
      } else if (status === 'OK') {
        cls += ' cl-cell-ok';
        content = '✓';
      } else if (status === 'FAIL') {
        cls += ' cl-cell-fail';
        content = '✕';
      } else if (status === 'UNCHECKED') {
        cls += ' cl-cell-unchecked';
        content = '?';
      } else if (status === 'missed') {
        cls += ' cl-cell-missed';
        content = '?';
      } else {
        cls += ' cl-cell-na';
        content = '—';
      }

      if (effectivelyPlanned && isActiveCell) cls += ' cl-cell-today';
      if (isClickable) cls += ' cl-cell-clickable';

      const cellTitle = `${d.name} · ${shift === 'day' ? 'День' : 'Ночь'}${status === 'missed' ? ' — пропущено' : ''}`;

      html += `<div class="${cls}"
        data-row-id="${escapeAttr(row.id)}"
        data-date="${escapeAttr(dateStr)}"
        data-shift="${escapeAttr(shift)}"
        data-planned="${planned ? '1' : '0'}"
        data-clickable="${isClickable ? '1' : '0'}"
        title="${cellTitle}">${content}</div>`;
    });
  });

  html += '</div>';
  return html;
}

/* Сводка по норме для строки матрицы CL */
function renderClRowNorm(row) {
  const controlType = migrateControlType(row.controlType, row.measurements);
  const measurements = Array.isArray(row.measurements) ? row.measurements : [];

  // --- Фиксированный без точек → ОК / Не ОК ---
  if (controlType === 'fixed') {
    const hasPoints = measurements.some(b =>
      b && Array.isArray(b.points) && b.points.length > 0
    );
    if (!hasPoints) {
      return {
        text: '<span class="cl-norm-check">✓</span>',
        title: 'Фиксированный — ОК / Не ОК'
      };
    }
  }

  // --- Если нет точек — «—» ---
  if (!measurements.length) {
    return { text: '<span style="color:var(--text-dim)">—</span>', title: '' };
  }

  // Берём первый блок (по бренду или "Все бренды")
  let block = null;
  if (clState.brand) {
    block = measurements.find(b => b.brand === clState.brand);
  }
  if (!block) block = measurements.find(b => !b.brand) || measurements[0];

  const points = Array.isArray(block.points) ? block.points : [];
  if (!points.length) {
    return { text: '<span style="color:var(--text-dim)">—</span>', title: '' };
  }

  // --- Вариабельный → «target ± tolerance» ---
  if (controlType === 'variable') {
    if (points.length === 1) {
      const norm = parseNorm(points[0].value);
      if (norm) {
        const center = (norm.min + norm.max) / 2;
        const tol = (norm.max - norm.min) / 2;
        const text = tol > 0 ? `${fmtNum(center)} ± ${fmtNum(tol)}` : `${fmtNum(center)}`;
        return { text: escapeHtml(text), title: points[0].value || '' };
      }
      return { text: escapeHtml(points[0].value || '—'), title: '' };
    }
    return {
      text: `<strong>${points.length} точки</strong>`,
      title: `${points.length} точек замера — у каждой своя норма`
    };
  }

  // --- Контролируемый интервал → «от … до …» ---
  if (controlType === 'interval') {
    if (points.length === 1) {
      const norm = parseNorm(points[0].value);
      if (norm && norm.min !== norm.max) {
        return { text: escapeHtml(`${fmtNum(norm.min)}…${fmtNum(norm.max)}`), title: points[0].value || '' };
      }
      if (norm) {
        return { text: escapeHtml(fmtNum(norm.min)), title: points[0].value || '' };
      }
      return { text: escapeHtml(points[0].value || '—'), title: '' };
    }
    return {
      text: `<strong>${points.length} точки</strong>`,
      title: `${points.length} точек замера — у каждой свой интервал`
    };
  }

  // --- Фиксированный с точками → точное значение (без допуска) ---
  if (controlType === 'fixed') {
    if (points.length === 1) {
      const norm = parseNorm(points[0].value);
      const val = norm != null ? fmtNum(norm.max) : (points[0].value || '—');
      return { text: escapeHtml(val), title: points[0].value || '' };
    }
    return {
      text: `<strong>${points.length} точки</strong>`,
      title: `${points.length} точек замера — точные значения`
    };
  }

  // --- Резерв: точки без типа ---
  if (points.length === 1) {
    return { text: escapeHtml(points[0].value || '—'), title: '' };
  }
  return {
    text: `<strong>${points.length} точки</strong>`,
    title: `${points.length} точек замера`
  };
}

/* Формат числа: убирает «.0» и лишние нули */
function fmtNum(n) {
  if (n == null || isNaN(n)) return '';
  return parseFloat(n.toFixed(6)).toString();
}

function findExistingCheck(stdId, dateStr, shiftLetter) {
  const hist = getHistory();
  const record = hist.find(h =>
    (h.mode === 'electronic' || h.mode === 'cl') &&
    h.line === clState.line &&
    h.date === dateStr &&
    h.shift === shiftLetter
  );
  if (!record) return null;
  return record.items.find(it => it.standardId === stdId) || null;
}

function bindClCells() {
  const wrap = $('#clMatrixWrap');
  if (!wrap) return;

  wrap.querySelectorAll('.cl-cell').forEach(cell => {
    cell.addEventListener('click', (e) => {
      const clickable = cell.dataset.clickable === '1';
      if (!clickable) {
        // Подсказка почему не кликается
        const planned = cell.dataset.planned === '1';
        if (!planned) return;
        if (!clState.checkMode) {
          showToast('Нажмите «Начать проверку»', true);
        }
        return;
      }

      const rowId = cell.dataset.rowId;
      const dateStr = cell.dataset.date;
      const shift = cell.dataset.shift;

      if (e.shiftKey) {
        e.preventDefault();
        quickSetClCell(rowId, dateStr, shift, 'OK');
        return;
      }
      if (e.altKey) {
        e.preventDefault();
        quickSetClCell(rowId, dateStr, shift, 'FAIL');
        return;
      }

      openClCheckModal(rowId, dateStr, shift);
    });
  });
}

function quickSetClCell(rowId, dateStr, shift, status) {
  const row = clState.rows.find(r => r.id === rowId);
  if (!row) return;

  const key = `${rowId}|${dateStr}|${shift}`;
  clState.quickDraft[key] = {
    status,
    answer: status === 'OK' ? 'ОК' : 'Не ОК',
    value: null,
    comment: ''
  };

  renderClMatrix();
}

function startClCheck() {
  if (!clState.line) return;
  clState.checkMode = true;
  clState.quickDraft = {};
  updateClCheckButtons();
  renderClMatrix();
  showToast('Режим проверки активирован. Кликайте по активным ячейкам.');
}

function stopClCheck() {
  if (!confirm('Закончить проверку и сохранить результаты?')) return;

  saveClDraftToHistory();

  clState.checkMode = false;
  clState.quickDraft = {};
  updateClCheckButtons();
  renderClMatrix();
  showToast('Проверка сохранена');
}

function saveClDraftToHistory() {
  const drafts = Object.entries(clState.quickDraft);
  if (!drafts.length) return;

  const groups = {};
  drafts.forEach(([key, val]) => {
    const [rowId, dateStr, shift] = key.split('|');
    const groupKey = `${dateStr}|${shift}`;
    if (!groups[groupKey]) groups[groupKey] = { date: dateStr, shift, items: [] };
    const row = clState.rows.find(r => r.id === rowId);
    if (!row) return;

    groups[groupKey].items.push({
      standardId: rowId,
      machine: row.machine || '',
      title: row.title || row.paramName || '',
      oplNumber: row.oplNumber || '',
      node: row.node || '',
      nodePart: row.nodePart || '',
      controlType: migrateControlType(row.controlType, row.measurements),
      answer: val.answer,
      value: val.value,
      status: val.status,
      comment: val.comment || ''
    });
  });

  const hist = getHistory();
  let added = 0;

  Object.entries(groups).forEach(([gk, group]) => {
    const shiftLetter = getShiftsForDate(group.date)[group.shift];
    let record = hist.find(h =>
      (h.mode === 'electronic' || h.mode === 'cl') &&
      h.line === clState.line &&
      h.date === group.date &&
      h.shift === shiftLetter
    );

    if (!record) {
      record = {
        id: uid(),
        timestamp: new Date().toISOString(),
        mode: clState.mode === 'mech' ? 'cl' : 'electronic',
        operator: '—',
        line: clState.line,
        shift: shiftLetter,
        date: group.date,
        brandPlanned: clState.brandPlanned || null,
        brandActual: clState.brand || '',
        brandReason: clState.brandReason || '',
        items: []
      };
      hist.push(record);
      added++;
    }

    group.items.forEach(newItem => {
      const idx = record.items.findIndex(it => it.standardId === newItem.standardId);
      if (idx !== -1) record.items[idx] = newItem;
      else record.items.push(newItem);
    });
  });

  setHistory(hist);
  updateNavHistoryCounter();

  if (added > 0) showToast(`Создано записей: ${added}`);
}

/* ============================================================
   ПРОВЕРКА CL — обработчики
   ============================================================ */

document.addEventListener('click', (e) => {
  if (e.target.closest('#clLinePill')) {
    if (typeof openLinePickerModal === 'function') openLinePickerModal();
  }
});

$('#clModeSwitch')?.addEventListener('click', (e) => {
  const btn = e.target.closest('.editor-mode-inline-btn');
  if (!btn) return;
  const mode = btn.dataset.mode;
  if (mode === clState.mode) return;

  if (clState.checkMode && !confirm('Проверка не закончена. Переключиться?')) return;

  clState.mode = mode;
  clState.checkMode = false;
  clState.quickDraft = {};

  try { localStorage.setItem('cl_cl_mode', mode); } catch (err) {}

  document.querySelectorAll('#clModeSwitch .editor-mode-inline-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.mode === mode);
  });

  updateClPartSwitchVisibility();
  updateClCheckButtons();
  renderClMatrix();
});

$('#clPartSwitch')?.addEventListener('click', (e) => {
  const btn = e.target.closest('.editor-part-switch-btn');
  if (!btn) return;
  const part = btn.dataset.part || '';
  if (part === clState.part) return;

  if (clState.checkMode && !confirm('Проверка не закончена. Переключиться?')) return;

  clState.part = part;
  clState.checkMode = false;
  clState.quickDraft = {};

  try { localStorage.setItem('cl_cl_part', part); } catch (err) {}

  document.querySelectorAll('#clPartSwitch .editor-part-switch-btn').forEach(b => {
    b.classList.toggle('active', (b.dataset.part || '') === part);
  });

  updateClCheckButtons();
  renderClMatrix();
});

$('#clStartCheckBtn')?.addEventListener('click', startClCheck);
$('#clStopCheckBtn')?.addEventListener('click', stopClCheck);
/* Сворачивание блока «Как проверять» в модалке быстрой проверки */
document.addEventListener('click', (e) => {
  const head = e.target.closest('#qcControlDescToggle');
  if (!head) return;
  const block = document.getElementById('qcControlDescBlock');
  if (block) block.classList.toggle('expanded');
});
