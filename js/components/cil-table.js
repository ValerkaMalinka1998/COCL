/* ============================================================
   КОМПОНЕНТЫ: таблица недели в стиле CIL
   Общие куски для «Чек-листа CL» и «Расписания CL»: иконки,
   цвета групп-машин, шапка дней и смен, норма, чипы времени.
   Модуль общего пространства имён: функции и переменные видны
   во всех файлах. Порядок подключения — index.html.
   ============================================================ */

/* === ИКОНКИ (Feather) ======================================= */
const CIL_ICONS = {
  ruler: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.3 8.7 8.7 21.3a1 1 0 0 1-1.4 0l-4.6-4.6a1 1 0 0 1 0-1.4L15.3 2.7a1 1 0 0 1 1.4 0l4.6 4.6a1 1 0 0 1 0 1.4z"/><path d="m7.5 10.5 2 2M10.5 7.5l2 2M13.5 4.5l2 2M4.5 13.5l2 2"/></svg>',
  eye: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>',
  check: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
  x: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
  plus: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
  gear: '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
  warn: '<svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/></svg>'
};

/* Порядок дней недели в таблице: Пн … Вс */
const CIL_DAYS = [
  { idx: 1, name: 'Пн' }, { idx: 2, name: 'Вт' }, { idx: 3, name: 'Ср' },
  { idx: 4, name: 'Чт' }, { idx: 5, name: 'Пт' }, { idx: 6, name: 'Сб' },
  { idx: 0, name: 'Вс' }
];

/* Цвета групп (машин) — по порядку появления; CSS-классы cil-z0…cil-z5 */
function cilZoneMap(rows) {
  const map = {};
  let n = 0;
  rows.forEach(r => {
    const m = r.machine || '—';
    if (!(m in map)) map[m] = n++ % 6;
  });
  return map;
}

/* Сортировка: машина, затем OPL / название (с числами) */
function cilSortRows(rows) {
  return rows.slice().sort((a, b) => {
    const ma = String(a.machine || ''), mb = String(b.machine || '');
    const m = ma.localeCompare(mb, 'ru', { numeric: true });
    if (m) return m;
    const oa = String(a.oplNumber || a.paramName || '');
    const ob = String(b.oplNumber || b.paramName || '');
    return oa.localeCompare(ob, 'ru', { numeric: true });
  });
}

/* Даты недели по индексу дня (0 = Вс) */
function cilDateByDayIdx(weekDays) {
  const map = {};
  [1, 2, 3, 4, 5, 6, 0].forEach((dayIdx, i) => { map[dayIdx] = weekDays[i]; });
  return map;
}

/* Чипы окон времени */
function cilTimeChips(timeWindows) {
  return (Array.isArray(timeWindows) ? timeWindows : []).map(w => {
    const shift = typeof getTimeWindowShift === 'function' ? getTimeWindowShift(w.from) : 'day';
    return `<span class="cil-tag cil-tag-time ${shift === 'night' ? 'night' : ''}">${escapeHtml(w.from)}–${escapeHtml(w.to)}</span>`;
  }).join('');
}

/* Метка Run / Stop / CIL */
function cilWorkTag(work, attrs = '') {
  const w = normWork(work);
  return `<span class="cil-tag cil-tag-${w.toLowerCase()}" ${attrs}>${w.toUpperCase()}</span>`;
}

/* ============================================================
   НОРМА / ТОЧКИ
   1–2 точки — значения; 3+ — «N точек» со всплывающим списком;
   без значений (ОК / Не ОК, по описанию) — галочка «визуально».
   Возвращает { html, visual } — visual: проверка без замера.
   ============================================================ */
function cilPointsWord(n) {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return 'точка';
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return 'точки';
  return 'точек';
}

function cilNorm(row, brand, isElec) {
  const visual = {
    visual: true,
    html: '<span class="cil-norm-visual" title="Значений нет — проверка ОК / Не ОК по описанию">' + CIL_ICONS.check + '<span>визуально</span></span>'
  };
  let values = [];
  // Нет значений для текущего бренда — предупреждение вместо чужой нормы
  const noNorm = (pick) => ({
    visual: false, missing: true,
    html: pick.kind === 'nobrand'
      ? '<span class="cil-norm-miss" title="Значения разные по брендам — задайте бренд линии">бренд не задан</span>'
      : `<span class="cil-norm-miss" title="Для бренда ${escapeAttr(brand)} значений нет — сообщите аналитику">нет нормы для ${escapeHtml(brand)}</span>`
  });
  let pickTag = '';

  if (isElec) {
    const type = row.controlType || 'variable';
    if (type === 'fixed') return visual;
    const pick = pickBrandValues(row.valuesByBrand, brand);
    if (pick.kind === 'missing' || pick.kind === 'nobrand') return noNorm(pick);
    const entry = pick.item;
    if (!entry) return { visual: false, html: '<span class="cil-dim">—</span>' };
    pickTag = brandPickLabel(pick, brand);
    if (type === 'interval' && typeof getEparamNormRange === 'function') {
      const r = getEparamNormRange(entry);
      values = [r ? `${r.min} … ${r.max}` : '—'];
    } else {
      values = [`${entry.target} ± ${entry.tolerance}`];
    }
  } else {
    const ms = Array.isArray(row.measurements) ? row.measurements : [];
    const pick = pickBrandValues(ms.filter(b => (b.points || []).some(p => String(p && p.value != null ? p.value : '').trim())), brand);
    if (pick.kind === 'missing' || pick.kind === 'nobrand') return noNorm(pick);
    const block = pick.item;
    pickTag = brandPickLabel(pick, brand);
    values = (block && Array.isArray(block.points) ? block.points : [])
      .map(p => String(p && p.value != null ? p.value : '').trim())
      .filter(Boolean);
    if (!values.length) return visual;
    // Фиксированный с текстом вместо чисел («в одну линию», «согласно описанию») —
    // это проверка на совпадение, замера нет
    const type = typeof migrateControlType === 'function' ? migrateControlType(row.controlType, ms) : row.controlType;
    if (type === 'fixed' && values.every(v => parseNorm(v) == null)) {
      return {
        visual: true,
        html: `<span class="cil-norm-visual" title="${escapeAttr(values.join('; '))}">${CIL_ICONS.check}<span>визуально</span></span>`
      };
    }
  }

  // Чьи значения: «Kent» / «остальные бренды» (если у стандарта нормы по брендам)
  const tag = pickTag ? `<em class="cil-norm-brand" title="Значения для бренда">${escapeHtml(pickTag)}</em>` : '';
  if (values.length <= 2) {
    return {
      visual: false,
      html: `<span class="cil-norm-val">${escapeHtml(values[0])}${values[1] ? `<small>${escapeHtml(values[1])}</small>` : ''}</span>${tag}`
    };
  }
  const list = values.map((v, i) => `<div><span>т.${i + 1}</span>${escapeHtml(v)}</div>`).join('');
  return {
    visual: false,
    html: `<span class="cil-norm-pts" tabindex="0">${values.length} ${cilPointsWord(values.length)}<span class="cil-norm-pop">${list}</span></span>${tag}`
  };
}

/* ============================================================
   ШАПКА: дни и смены с буквами смен
   opts.infoHeads — html <th> левых колонок (rowspan=2)
   opts.shiftSub(dateStr, shift, i) — подпись и прогресс под буквой смены
   opts.activeDate / opts.activeShift — текущая смена
   opts.colAttrs(dateStr, dayIdx, shift) — доп. атрибуты <th> смены
   ============================================================ */
function cilHeadHtml(dateByDayIdx, opts) {
  const todayDate = opts.activeDate || '';
  let r1 = `<tr>${opts.infoHeads}`;
  let r2 = '<tr>';
  CIL_DAYS.forEach(d => {
    const dateStr = dateByDayIdx[d.idx];
    const isToday = dateStr === todayDate;
    const brig = dateStr ? getShiftsForDate(dateStr) : { day: '—', night: '—' };
    r1 += `<th class="cil-day ${isToday ? 'cil-today' : ''}" colspan="2"><span class="cil-day-name">${d.name}</span>${escapeHtml(dateStr ? fmtShortDate(dateStr) : '')}</th>`;
    ['day', 'night'].forEach(shift => {
      const isNow = isToday && shift === opts.activeShift;
      const sub = opts.shiftSub ? opts.shiftSub(dateStr, shift) : (shift === 'day' ? 'день' : 'ночь');
      const attrs = opts.colAttrs ? opts.colAttrs(dateStr, d.idx, shift) : '';
      r2 += `<th class="cil-shift cil-shift-${shift} ${isToday ? 'cil-today' : ''}" ${attrs}>
        <span class="cil-brig ${isNow ? 'now' : ''}">${escapeHtml(brig[shift] || '—')}</span>
        ${sub}
      </th>`;
    });
  });
  return `<thead>${r1}</tr>${r2}</tr></thead>`;
}

/* Время на проверку строки, сек (только механические стандарты) */
function cilRowDurationSec(row) {
  return Math.max(0, Number(row && row.durationSec) || 0);
}

/* Компактная длительность для шапки смены: 45с · 12м · 12м 30с · 1ч 05м */
function formatCilDuration(sec) {
  const n = Math.round(Number(sec) || 0);
  if (n <= 0) return '';
  if (n < 60) return `${n}с`;
  const h = Math.floor(n / 3600);
  const m = Math.floor((n % 3600) / 60);
  const s = n % 60;
  if (h) return `${h}ч ${String(m).padStart(2, '0')}м`;
  return s ? `${m}м ${s}с` : `${m}м`;
}

/* Строка «∑ время» под подписью смены; пусто, если времени нет */
function cilShiftTotalHtml(sec) {
  const txt = formatCilDuration(sec);
  return txt ? `<span class="cil-shift-total" title="Общее время на проверку всех стандартов смены">∑ ${txt}</span>` : '';
}

/* Подпись смены с прогрессом «сделано / запланировано» */
function cilShiftProgress(shift, done, planned, totalSec) {
  const pct = planned ? Math.round(done / planned * 100) : 0;
  return `<span class="cil-shift-sub">${shift === 'day' ? 'день' : 'ночь'}${planned ? ` · ${done}/${planned}` : ''}</span>
    <span class="cil-prog"><i style="width:${pct}%"></i></span>${cilShiftTotalHtml(totalSec)}`;
}

/* Классы ячейки по смене и дню */
function cilTdClass(shift, isToday, extra = '') {
  return `cil-td cil-td-${shift}${isToday ? ' cil-today' : ''}${extra ? ' ' + extra : ''}`;
}
