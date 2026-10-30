/* ============================================================
   ЯДРО: даты, недели, смены
   todayISO, getWeekDays, getClWeekDays, getCurrentShiftPeriod, буквы смен.
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

/* Конфиг смен для расчёта дат: JSON разбирается заново, только когда строка в хранилище
   изменилась (дашборд и матрицы зовут это тысячи раз). Только чтение — не мутировать. */
let shiftCfgMemo = { raw: undefined, cfg: null, render: null, byDate: new Map() };
function shiftCfgCached() {
  // Внутри withLoadCache хранилище не меняется — строку сверяем один раз на отрисовку
  if (loadCache && shiftCfgMemo.render === loadCache) return shiftCfgMemo.cfg;
  const raw = localStorage.getItem(STORAGE_KEYS.electronicShiftCfg);
  if (raw !== shiftCfgMemo.raw) shiftCfgMemo = { raw, cfg: getElectronicShiftConfig(), render: null, byDate: new Map() };
  shiftCfgMemo.render = loadCache;
  return shiftCfgMemo.cfg;
}

function daysSinceStart(date) {
  const cfg = shiftCfgCached();
  const d = (date instanceof Date) ? date : new Date(date + 'T00:00:00');
  const start = new Date(cfg.startDate + 'T00:00:00');
  return Math.floor((d.getTime() - start.getTime()) / 86400000);
}

function getDayShiftForDate(date) {
  const cfg = shiftCfgCached();
  const diff = daysSinceStart(date);
  if (diff < 0) return cfg.dayCycle[0];
  const pos = diff % cfg.dayCycle.length;
  return cfg.dayCycle[pos];
}

function getNightShiftForDate(date) {
  const cfg = shiftCfgCached();
  const diff = daysSinceStart(date);
  if (diff < 0) return cfg.nightCycle[0];
  const pos = diff % cfg.nightCycle.length;
  return cfg.nightCycle[pos];
}

function getShiftsForDate(date) {
  if (typeof date !== 'string') return { day: getDayShiftForDate(date), night: getNightShiftForDate(date) };
  // Буквы смен по дате кэшируются до смены конфига (shiftCfgCached сбрасывает byDate); копия — объект могут менять
  const memo = shiftCfgCached() && shiftCfgMemo.byDate;
  if (!memo.has(date)) memo.set(date, { day: getDayShiftForDate(date), night: getNightShiftForDate(date) });
  return { ...memo.get(date) };
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

/* Номер недели ISO 8601 */
function cilIsoWeek(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day + 3);
  const firstThu = new Date(d.getFullYear(), 0, 4, 12);
  return 1 + Math.round(((d - firstThu) / 86400000 - 3 + ((firstThu.getDay() + 6) % 7)) / 7);
}

/* Значение для <input type="week">: «2026-W44» (год — ISO, по четвергу недели) */
function cilIsoWeekValue(dateStr) {
  const dow = (new Date(dateStr + 'T12:00:00').getDay() + 6) % 7;
  const year = addDaysISO(dateStr, 3 - dow).slice(0, 4);
  return `${year}-W${String(cilIsoWeek(dateStr)).padStart(2, '0')}`;
}

/* «2026-W44» → понедельник этой недели («2026-10-26»); неверное значение — '' */
function cilIsoWeekMonday(value) {
  const m = /^(\d{4})-W(\d{2})$/.exec(value || '');
  if (!m) return '';
  // 4 января всегда в 1-й ISO-неделе
  const jan4 = `${m[1]}-01-04`;
  const dow = (new Date(jan4 + 'T12:00:00').getDay() + 6) % 7;
  return addDaysISO(jan4, -dow + (Number(m[2]) - 1) * 7);
}
