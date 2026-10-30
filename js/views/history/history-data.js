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
    label: 'CL при переходах', short: 'Переходы', color: 'var(--accent-emerald, var(--accent-green))',
    icon: '<polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>'
  }
};

const HIST_COCL_TYPES = {
  ChangeOver: 'Смена сорта',
  CL_TO: 'CL в ТО',
  CL_Conversion: 'CL в Конвертацию'
};

function histKind(h) {
  if (h.mode === 'toploss') return 'toploss';
  if (h.mode === 'cl') return 'cl';
  if (h.mode === 'electronic') return 'electronic';
  return 'cocl';
}

function histKindLabel(h) {
  const k = histKind(h);
  if (k === 'cocl') return 'CL при переходах · ' + (HIST_COCL_TYPES[h.type] || h.type || 'проверка');
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
    let shift;
    if (h.shiftType === 'day' || h.shiftType === 'night') shift = h.shiftType;
    else if (h.shift) shift = (s.night === h.shift && s.day !== h.shift) ? 'night' : 'day';
    else shift = getCurrentShiftPeriod(new Date(h.timestamp)).shiftType;   // буква не записана — по времени сохранения
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
  const isElec = histIsElecItem(h, it);
  const raw = isElec ? getElectronicParams().find(x => x.id === it.standardId) : null;
  const st = isElec ? (raw && normalizeElectronicParam(raw)) : getStandards().find(s => s.id === it.standardId);
  const blocks = st && Array.isArray(st.measurements) ? st.measurements : [];
  // Старая запись E-Param удалённого параметра: норма лежит в самой записи
  if (isElec && !blocks.length && Number.isFinite(Number(it.target))) {
    const t = Number(it.target), tol = Number(it.tolerance) || 0;
    return [{ label: tol ? `${fmtNum(t)} ± ${fmtNum(tol)}` : fmtNum(t), range: { min: t - tol, max: t + tol } }];
  }
  // Нормы на момент проверки (записаны в пункт) — позже стандарт могли изменить
  if (Array.isArray(it.norms) && it.norms.length) return it.norms.map(v => ({ label: String(v || ''), range: parseNorm(v) }));
  // Как в проверке: своя строка бренда → «Все бренды» → единственная; чужой бренд не подставляем
  const block = pickBrandValues(blocks, brand).item;
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
    // Точка-метка (ОК / Не ОК) — плохая, если отмечена «Не ОК»
    const bad = String(v).trim() === 'Не ОК' ||
      !!(n && n.range && num != null && (num < n.range.min || num > n.range.max));
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
  return getStandards().find(s => s.id === id) || (getElectronicParams().map(normalizeElectronicParam).find(p => p.id === id)) || null;
}

/* Понедельник недели даты */
function histWeekStartOf(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  return addDaysISO(dateStr, -((d.getDay() + 6) % 7));
}


/* Покрытие смен Чек-листа CL за неделю (Пн → Вс):
   [{ date, dayName, isToday, shifts: { day, night } }],
   смена: { letter, planned, done, fail, unchecked, late, state }
   late — пропущено в этой смене, закрыто позже (входит в done) */
function histCoverage(line, weekOffset = 0) {
  return histCoverageDays(line, getClWeekDays(weekOffset));
}

/* Состояние смен линии по списку дат (неделя или месяц календаря) */
function histCoverageDays(line, days) {
  const rows = clLineRows(line);
  const tally = clTallyIndex(line, days[0], days[days.length - 1], rows);
  const cur = getCurrentShiftPeriod();
  return days.map(dateStr => {
    const letters = getShiftsForDate(dateStr);
    const shifts = {};
    ['day', 'night'].forEach(shift => {
      const letter = letters[shift];
      const c = { letter, planned: 0, done: 0, fail: 0, unchecked: 0, late: 0 };
      rows.forEach(({ row }) => {
        const k = tally.get(`${dateStr}|${shift}|${row.id}`);
        if (!k) return;
        c.planned++;
        if (k === 'OK') c.done++;
        else if (k === 'FAIL') { c.done++; c.fail++; }
        else if (k === 'late') { c.done++; c.late++; }
        else if (k === 'UNCHECKED') c.unchecked++;
      });
      const isNow = dateStr === cur.date && shift === cur.shiftType;
      const past = isShiftPast(dateStr, shift);
      if (!c.planned) c.state = 'none';
      else if (!past && !isNow) c.state = 'future';
      else if (c.fail) c.state = 'fail';
      else if (c.done >= c.planned && !c.late) c.state = 'ok';
      else if (isNow) c.state = 'now';
      // Пропуск считается в смене пропуска, даже если его закрыли позже
      else if (c.done === c.late) c.state = 'missed';
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
