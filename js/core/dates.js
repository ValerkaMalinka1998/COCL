/* ============================================================
   ЯДРО: даты, недели, смены
   todayISO, getWeekDays, getClWeekDays, getCurrentShiftPeriod, бригады.
   Модуль общего пространства имён: функции и переменные видны
   во всех файлах. Порядок подключения — index.html.
   ============================================================ */

/* Утилита: сегодняшняя дата в формате 'YYYY-MM-DD' */
function todayISO(d = new Date()) {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${yyyy}-${mm}-${dd}`;
}

/* Утилита: прибавить N дней к дате 'YYYY-MM-DD' */
function addDaysISO(dateStr, n) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + n);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${yyyy}-${mm}-${dd}`;
}

/* Утилита: 7 дат ISO-недели (Пн..Вс) со сдвигом offset недель */
/* base — дата, от которой считается «текущая» неделя (по умолчанию сейчас) */
function getWeekDays(offset = 0, base = new Date()) {
  const now = new Date(base);
  const jsDay = now.getDay();
  const isoDay = jsDay === 0 ? 7 : jsDay;

  const monday = new Date(now);
  monday.setDate(now.getDate() - (isoDay - 1) + (offset * 7));

  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    days.push(`${yyyy}-${mm}-${dd}`);
  }
  return days;
}

/* Неделя Чек-листа CL считается от даты ТЕКУЩЕЙ СМЕНЫ, а не от календаря:
   в понедельник 00:00–08:59 ещё идёт ночная смена воскресенья, и оператор
   должен видеть ту неделю, где эта смена находится. */
function getClWeekDays(offset = 0) {
  return getWeekDays(offset, new Date(getCurrentShiftPeriod().date + 'T12:00:00'));
}


/* Название недели: «16–22.06» */
function getWeekLabel(offset = 0) {
  const days = getClWeekDays(offset);
  const first = fmtShortDate(days[0]);
  const last = fmtShortDate(days[6]);
  return `${first} – ${last}`;
}

/* Утилита: человекочитаемая дата 'YYYY-MM-DD' → '28.09.2026' */
function fmtISODate(dateStr) {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr || '';
  const [yyyy, mm, dd] = dateStr.split('-');
  return `${dd}.${mm}.${yyyy}`;
}

function daysSinceStart(date) {
  const cfg = getElectronicShiftConfig();
  const d = (date instanceof Date) ? date : new Date(date + 'T00:00:00');
  const start = new Date(cfg.startDate + 'T00:00:00');
  return Math.floor((d.getTime() - start.getTime()) / 86400000);
}

function getDayShiftForDate(date) {
  const cfg = getElectronicShiftConfig();
  const diff = daysSinceStart(date);
  if (diff < 0) return cfg.dayCycle[0];
  const pos = diff % cfg.dayCycle.length;
  return cfg.dayCycle[pos];
}

function getNightShiftForDate(date) {
  const cfg = getElectronicShiftConfig();
  const diff = daysSinceStart(date);
  if (diff < 0) return cfg.nightCycle[0];
  const pos = diff % cfg.nightCycle.length;
  return cfg.nightCycle[pos];
}

function getShiftsForDate(date) {
  return {
    day:   getDayShiftForDate(date),
    night: getNightShiftForDate(date)
  };
}

/* Текущий период смены: тип + ДАТА НАЧАЛА смены.
   Ночная смена 21:00 → 09:00 переходит через полночь:
   в интервале 00:00–08:59 активна ночная смена, которая
   стартовала ВЧЕРА в 21:00, поэтому датой смены берём вчерашний день.
   Пример: в 06:00 в пятницу активна «Чт · ночь», а не «Пт · ночь». */
function getCurrentShiftPeriod(now = new Date()) {
  const h = now.getHours();
  // Дата берётся из переданного now, а не из системных часов,
  // чтобы функцию можно было проверить на любом времени.
  const today = todayISO(now);
  if (h >= 9 && h < 21) {
    return { shiftType: 'day', date: today };
  }
  if (h >= 21) {
    return { shiftType: 'night', date: today };
  }
  // 00:00 – 08:59 → ночная смена, стартовавшая вчера в 21:00
  return { shiftType: 'night', date: addDaysISO(today, -1) };
}

/* Обёртка для совместимости со старым кодом */
function getShiftForDate(date) {
  return getDayShiftForDate(date);
}
/* Служебная функция форматирования даты (нужна в других модулях) — 
   сам блок просмотра недели удалён */

/* Формат короткой даты DD.MM */
function fmtShortDate(dateStr) {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return '';
  return `${parts[2]}.${parts[1]}`;
}
