/* ============================================================
   ИСТОРИЯ: данные
   Общие функции для ленты, журнала отклонений, страницы проверки
   и истории стандарта: тип записи, смена, точки замера пункта,
   покрытие смен Чек-листа CL.
   Модуль общего пространства имён: функции и переменные видны
   во всех файлах. Порядок подключения — index.html.
   ============================================================ */

/* Типы проверок: подпись, цвет и иконка (Feather) */
const HIST_KINDS = {
  cl: {
    label: 'Чек-лист CL · механические', short: 'Чек-лист CL', color: 'var(--accent-cyan)',
    icon: '<path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>'
  },
  electronic: {
    label: 'Чек-лист CL · электронные', short: 'E-Param', color: 'var(--accent-purple)',
    icon: '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>'
  },
  toploss: {
    label: 'TOP Losses', short: 'TOP Losses', color: 'var(--accent-amber)',
    icon: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>'
  },
  cocl: {
    label: 'COCL', short: 'COCL', color: 'var(--accent-emerald, var(--accent-green))',
    icon: '<polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>'
  }
};

const HIST_COCL_TYPES = {
  ChangeOver: 'Смена сорта',
  CL_TO: 'CL в ТО',
  CL_Conversion: 'CL в Конвертацию'
};

/* Сколько дней показывает «История стандарта» максимум */
const HIST_STD_MAX_DAYS = 90;

function histKind(h) {
  if (h.mode === 'toploss') return 'toploss';
  if (h.mode === 'cl') return 'cl';
  if (h.mode === 'electronic') return 'electronic';
  return 'cocl';
}

function histKindLabel(h) {
  const k = histKind(h);
  if (k === 'cocl') return 'COCL · ' + (HIST_COCL_TYPES[h.type] || h.type || 'проверка');
  return HIST_KINDS[k].label;
}

function histIcon(kind, size = 18) {
  const k = HIST_KINDS[kind] || HIST_KINDS.cocl;
  return `<span class="hist-ico" style="--k:${k.color}"><svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${k.icon}</svg></span>`;
}

/* Смена записи: { date, shift: 'day'|'night', letter }.
   CL-записи хранят дату смены и букву смены; COCL — дату и тип смены;
   у остальных смену восстанавливаем по времени сохранения. */
function histShift(h) {
  if ((h.mode === 'cl' || h.mode === 'electronic') && h.date) {
    const s = getShiftsForDate(h.date);
    const shift = (s.night === h.shift && s.day !== h.shift) ? 'night' : 'day';
    return { date: h.date, shift, letter: h.shift || s[shift] };
  }
  if (h.date && (h.shiftType === 'day' || h.shiftType === 'night')) {
    return { date: h.date, shift: h.shiftType, letter: getShiftsForDate(h.date)[h.shiftType] };
  }
  const p = getCurrentShiftPeriod(new Date(h.timestamp));
  return { date: p.date, shift: p.shiftType, letter: getShiftsForDate(p.date)[p.shiftType] };
}

/* Ключ сортировки записи: дата смены → день/ночь → время сохранения */
function histOrderKey(h) {
  const s = histShift(h);
  return `${s.date}|${s.shift === 'day' ? 0 : 1}|${h.timestamp || ''}`;
}

/* Для экспорта: название типа проверки и смена «День · A» */
function getHistoryModeText(h) {
  return histKindLabel(h);
}

function formatClShift(h) {
  const s = histShift(h);
  return (s.shift === 'day' ? 'День' : 'Ночь') + (s.letter ? ' · ' + s.letter : '');
}

function histShiftLabel(s, withLetter = true) {
  return (s.shift === 'day' ? 'день' : 'ночь') + (withLetter && s.letter ? ' · ' + s.letter : '');
}

function histTime(h) {
  const d = new Date(h.timestamp);
  return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
}

const HIST_WEEKDAYS = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

function histDayName(dateStr) {
  return HIST_WEEKDAYS[new Date(dateStr + 'T12:00:00').getDay()];
}

/* «Сегодня» / «Вчера» / «Пн 12.10» — по дате смены */
function histDayTitle(dateStr) {
  const cur = getCurrentShiftPeriod().date;
  if (dateStr === cur) return 'Сегодня';
  if (dateStr === addDaysISO(cur, -1)) return 'Вчера';
  return histDayName(dateStr) + ' ' + fmtShortDate(dateStr);
}

function histIsElecItem(h, it) {
  return it.kind === 'elec' || (!it.kind && h.mode === 'electronic');
}

/* Нормы точек пункта (по бренду записи): [{ label, range }] */
function histItemNorms(h, it) {
  const brand = h.brandTo || h.brandActual || '';
  if (histIsElecItem(h, it)) {
    const p = getElectronicParams().find(x => x.id === it.standardId);
    const list = p && Array.isArray(p.valuesByBrand) ? p.valuesByBrand : [];
    let e = list.find(v => v.brand === brand) || list[0];
    if (!e && it.target != null) e = { target: it.target, tolerance: it.tolerance };
    if (!e || !Number.isFinite(Number(e.target))) return [];
    const t = Number(e.target), tol = Number(e.tolerance) || 0;
    const label = tol ? `${fmtNum(t)} ± ${fmtNum(tol)}` : fmtNum(t);
    return [{ label, range: { min: t - tol, max: t + tol } }];
  }
  const st = getStandards().find(s => s.id === it.standardId);
  const blocks = st && Array.isArray(st.measurements) ? st.measurements : [];
  const block = blocks.find(b => b.brand === brand) || blocks.find(b => !b.brand) || blocks[0];
  const pts = block && Array.isArray(block.points) ? block.points : [];
  return pts.map(p => ({ label: String(p.value || ''), range: parseNorm(p.value) }));
}

/* Значения точек пункта, как их ввёл оператор */
function histItemValues(it) {
  if (it.status === 'UNCHECKED') return [];
  if (Array.isArray(it.values)) return it.values.map(v => String(v ?? '').trim());
  const a = String(it.answer ?? '').trim();
  if (!a || a === '—' || a === 'ОК' || a === 'Не ОК') return [];
  return a.split(',').map(v => v.trim());
}

function histNum(v) {
  const n = Number(String(v ?? '').trim().replace(',', '.'));
  return String(v ?? '').trim() !== '' && Number.isFinite(n) ? n : null;
}

/* Точки пункта: [{ label, value, bad, range }] или null (ОК / Не ОК) */
function histItemPoints(h, it) {
  const values = histItemValues(it);
  if (!values.length || values.every(v => v === '')) return null;
  const norms = histItemNorms(h, it);
  return values.map((v, i) => {
    const n = norms[i] || null;
    const num = histNum(v);
    const bad = !!(n && n.range && num != null && (num < n.range.min || num > n.range.max));
    return { label: n ? n.label : '', value: v, bad, range: n ? n.range : null };
  });
}

/* Короткий текст отклонения: «т.2: 9.4 при норме 6 до 9» */
function histDeviationText(h, it) {
  if (it.status !== 'FAIL') return '';
  if (it.deviation) return it.deviation;
  const pts = histItemPoints(h, it);
  if (!pts) return 'Не ОК';
  const bad = pts.map((p, i) => ({ ...p, i })).filter(p => p.bad);
  if (!bad.length) return pts.map(p => p.value).join(', ');
  return bad.map(p => (pts.length > 1 ? `т.${p.i + 1}: ` : '') + `${p.value}${p.label ? ' при норме ' + p.label : ''}`).join('; ');
}

function histItemTitle(it) {
  return it.title || it.paramName || '—';
}

function histCounts(h) {
  const items = h.items || [];
  const ok = items.filter(i => i.status === 'OK').length;
  const fail = items.filter(i => i.status === 'FAIL').length;
  return { ok, fail, unchecked: items.length - ok - fail, total: items.length };
}

/* Все пункты одного стандарта на линии по порядку проверок:
   Map stdId → [{ h, it, key }] (старые → новые) */
function histStdEntries(line, hist = getHistory()) {
  const map = new Map();
  hist.forEach(h => {
    if (line && h.line !== line) return;
    const key = histOrderKey(h);
    (h.items || []).forEach(it => {
      if (!it || !it.standardId) return;
      if (!map.has(it.standardId)) map.set(it.standardId, []);
      map.get(it.standardId).push({ h, it, key });
    });
  });
  map.forEach(list => list.sort((a, b) => a.key.localeCompare(b.key)));
  return map;
}

/* Найти строку стандарта или E-Param по id */
function histFindRow(id) {
  return getStandards().find(s => s.id === id) || getElectronicParams().find(p => p.id === id) || null;
}

/* Запланирован ли стандарт/параметр на смену (по «Расписанию CL») */
function histIsPlanned(row, line, dateStr, shift) {
  if (isValidationDay(row, dateStr)) return true;
  const weekStart = histWeekStartOf(dateStr);
  const w = getRowForWeek(row, weekStart, line);
  if (!w.member) return false;
  const dayIdx = new Date(dateStr + 'T12:00:00').getDay();
  return (w.schedule || []).some(x => x.day === dayIdx && x.shift === shift);
}

/* Понедельник недели даты */
function histWeekStartOf(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  return addDaysISO(dateStr, -((d.getDay() + 6) % 7));
}

/* Строки линии, которые могут стоять в расписании CL */
function histClRows(line) {
  return [
    ...getStandards().filter(s => s.line === line && s.active !== false).map(r => ({ row: r, isElec: false })),
    ...getElectronicParamsForLine(line).filter(p => p.active !== false).map(r => ({ row: r, isElec: true }))
  ];
}

/* Индекс результатов CL линии: «дата|смена|id» → { h, it } */
function histClIndex(line) {
  const idx = new Map();
  getHistory().forEach(h => {
    if (!(h.mode === 'cl' || h.mode === 'electronic') || h.line !== line) return;
    (h.items || []).forEach(it => idx.set(`${h.date}|${h.shift}|${it.standardId}`, { h, it }));
  });
  return idx;
}

/* Покрытие смен Чек-листа CL за неделю (Пн → Вс):
   [{ date, dayName, isToday, shifts: { day, night } }],
   смена: { letter, planned, done, fail, unchecked, state } */
function histCoverage(line, weekOffset = 0) {
  const days = getClWeekDays(weekOffset);
  const rows = histClRows(line);
  const idx = histClIndex(line);
  const cur = getCurrentShiftPeriod();
  return days.map(dateStr => {
    const letters = getShiftsForDate(dateStr);
    const shifts = {};
    ['day', 'night'].forEach(shift => {
      const letter = letters[shift];
      const c = { letter, planned: 0, done: 0, fail: 0, unchecked: 0 };
      rows.forEach(({ row }) => {
        const res = idx.get(`${dateStr}|${letter}|${row.id}`);
        if (!histIsPlanned(row, line, dateStr, shift) && !res) return;
        c.planned++;
        if (!res) return;
        if (res.it.status === 'OK') c.done++;
        else if (res.it.status === 'FAIL') { c.done++; c.fail++; }
        else c.unchecked++;
      });
      const isNow = dateStr === cur.date && shift === cur.shiftType;
      const past = isShiftPast(dateStr, shift);
      if (!c.planned) c.state = 'none';
      else if (!past && !isNow) c.state = 'future';
      else if (c.fail) c.state = 'fail';
      else if (c.done >= c.planned) c.state = 'ok';
      else if (isNow) c.state = 'now';
      else if (c.done === 0) c.state = 'missed';
      else c.state = 'partial';
      shifts[shift] = c;
    });
    return { date: dateStr, dayName: histDayName(dateStr), isToday: dateStr === cur.date, shifts };
  });
}

/* Копирование текста (file:// может не дать доступ к буферу) */
async function histCopyText(text, okMsg) {
  try {
    await navigator.clipboard.writeText(text);
    showToast(okMsg);
  } catch (e) {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); showToast(okMsg); }
    catch (err) { showToast('Не удалось скопировать', true); }
    ta.remove();
  }
}
