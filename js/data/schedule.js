/* ============================================================
   ДАННЫЕ: расписание CL
   Разовые правки недель и версии шаблона (getRowForWeek).
   Модуль общего пространства имён: функции и переменные видны
   во всех файлах. Порядок подключения — index.html.
   ============================================================ */

/* ============================================================
   РАСПИСАНИЕ CL — ПОНЕДЕЛЬНЫЕ ПРАВКИ (оверрайды)

   Базовое расписание (standard.frequency.schedule) — это повторяющийся
   недельный шаблон. Правки, сделанные для конкретной недели, хранятся
   отдельно и НЕ трогают базовый шаблон и другие недели.

   Структура cl_schedule_weeks_v1:
   {
     "<YYYY-MM-DD начала недели>": {
       "<линия>": {
         removed: [stdId, ...],           // убрано только для этой недели
         added:   [stdId, ...],           // добавлено только для этой недели
         rows: { [stdId]: { schedule:[{day,shift}], timeWindows:[{from,to}], work } }
       }
     }
   }
   ============================================================ */

/* Понедельник недели по смещению (0 = текущая) */
function getSchWeekStart(offset = 0) {
  // Как в Чек-листе CL: неделя считается от даты текущей смены
  return getClWeekDays(offset)[0];
}

function getScheduleWeeks() {
  return load(STORAGE_KEYS.scheduleWeeks, {});
}
function setScheduleWeeks(v) {
  save(STORAGE_KEYS.scheduleWeeks, v);
}

/* Оверрайд конкретной недели+линии или null */
function getScheduleWeekOverride(weekStart, line) {
  if (!weekStart || !line) return null;
  const all = getScheduleWeeks();
  const wk = all[weekStart];
  if (!wk) return null;
  return wk[line] || null;
}

/* Сохранить оверрайд недели+линии (пустой — удаляем) */
function setScheduleWeekOverride(weekStart, line, ov) {
  if (!weekStart || !line) return;
  const all = getScheduleWeeks();
  if (!all[weekStart]) all[weekStart] = {};

  const isEmpty = !ov || (
    !(ov.removed && ov.removed.length) &&
    !(ov.added && ov.added.length) &&
    !(ov.rows && Object.keys(ov.rows).length)
  );

  if (isEmpty) {
    delete all[weekStart][line];
    if (!Object.keys(all[weekStart]).length) delete all[weekStart];
  } else {
    all[weekStart][line] = ov;
  }
  setScheduleWeeks(all);
}

/* Есть ли для недели+линии хоть какие-то правки */
function hasScheduleWeekOverride(weekStart, line) {
  return !!getScheduleWeekOverride(weekStart, line);
}

/* ============================================================ */
/* === РАСПИСАНИЕ CL — ВЕРСИИ ШАБЛОНА ========================= */
/* ============================================================ */
/* Шаблон недели может меняться со временем, но прошлое не меняется.
   frequency.templates = [{ from, inSchedule, schedule, timeWindows, work }]
     from — понедельник недели, с которой действует версия ('YYYY-MM-DD').
   Для недели W действует последняя версия с from <= W.
   Пока версий нет, действуют «исходные» поля строки (inSchedule,
   frequency.schedule / timeWindows, work) — так работают старые данные.
   Исходные поля всегда повторяют самую позднюю версию: их читают импорт,
   экспорт и окно «Добавить стандарты». */

const SCH_BASELINE_FROM = '0000-01-01';

/* Шаблон строки на неделю weekStart (без правок конкретной недели) */
/* Время проверки считается само: Run / Stop — первый час смены (день 09:00–10:00,
   ночь 21:00–22:00) по тем сменам, что отмечены в расписании; CIL — без окна
   (на линии он сдвигается, «по ситуации»). Хранимые окна не читаем. */
const AUTO_TIME_DAY = { from: '09:00', to: '10:00' };
const AUTO_TIME_NIGHT = { from: '21:00', to: '22:00' };

function autoTimeWindows(work, schedule) {
  if (normWork(work) === 'CIL') return [];
  const list = Array.isArray(schedule) ? schedule : [];
  const out = [];
  if (list.some(x => x && x.shift === 'day')) out.push({ ...AUTO_TIME_DAY });
  if (list.some(x => x && x.shift === 'night')) out.push({ ...AUTO_TIME_NIGHT });
  return out;
}

/* Окно проверки: 'day' или 'night' (ночь — с 21:00 до 09:00) */
function getTimeWindowShift(from) {
  if (!from) return 'day';
  const hh = String(from).slice(0, 2);
  return (hh >= '21' || hh < '09') ? 'night' : 'day';
}

function getRowTemplateForWeek(row, weekStart) {
  const f = (row && row.frequency) || {};
  const list = Array.isArray(f.templates) ? f.templates : [];
  let t = null;
  list.forEach(v => {
    if (v && v.from <= weekStart && (!t || v.from >= t.from)) t = v;
  });
  if (!t && !list.length) {
    t = {
      inSchedule: row && row.inSchedule === true,
      schedule: f.schedule || [],
      timeWindows: f.timeWindows || [],
      work: row && row.work
    };
  }
  if (!t) return { inSchedule: false, schedule: [], timeWindows: [], work: 'Run' };
  const schedule = Array.isArray(t.schedule) ? t.schedule : [];
  return {
    inSchedule: t.inSchedule === true,
    schedule,
    timeWindows: autoTimeWindows(t.work, schedule),
    work: normWork(t.work)
  };
}

/* Существовал ли стандарт/параметр к концу смены. До создания его нет в чек-листе,
   поэтому такие смены не планируются и не считаются пропущенными.
   День: 09:00–21:00 даты, ночь: 21:00 даты – 09:00 следующих суток. */
function rowExistedByShiftEnd(row, dateStr, shift) {
  const created = row && row.createdAt ? new Date(row.createdAt).getTime() : NaN;
  if (isNaN(created)) return true;
  const end = shift === 'day'
    ? new Date(`${dateStr}T21:00:00`)
    : new Date(`${addDaysISO(dateStr, 1)}T09:00:00`);
  return end.getTime() > created;
}

/* Запланирован ли стандарт/параметр на смену: валидация или «Расписание CL».
   В простой линии — нет. downs — простои линии (чтобы не читать в циклах) */
function isRowPlanned(row, line, dateStr, shift, downs) {
  if (isDowntimeShift(line, dateStr, shift, downs)) return false;
  if (isValidationShift(row, dateStr, shift)) return true;
  if (!rowExistedByShiftEnd(row, dateStr, shift)) return false;
  const dow = new Date(dateStr + 'T12:00:00').getDay();
  const w = getRowForWeek(row, addDaysISO(dateStr, -((dow + 6) % 7)), line);
  return w.member && (w.schedule || []).some(x => x.day === dow && x.shift === shift);
}

/* Строка на неделю с учётом разовых правок этой недели:
   { member, schedule, timeWindows, work } */
function getRowForWeek(row, weekStart, line) {
  const t = getRowTemplateForWeek(row, weekStart);
  const ov = getScheduleWeekOverride(weekStart, line) || {};
  let member = t.inSchedule;
  if ((ov.removed || []).includes(row.id)) member = false;
  if ((ov.added || []).includes(row.id)) member = true;
  // Неделя целиком закончилась до создания строки — её в этой неделе не было
  if (!rowExistedByShiftEnd(row, addDaysISO(weekStart, 6), 'night')) member = false;
  const snap = ov.rows && ov.rows[row.id];
  const schedule = snap && Array.isArray(snap.schedule) ? snap.schedule : t.schedule;
  const work = snap && snap.work != null ? normWork(snap.work) : t.work;
  return { member, schedule, timeWindows: autoTimeWindows(work, schedule), work };
}

/* Записать версию шаблона «с недели from»: более поздние версии заменяются.
   state = { inSchedule, schedule, timeWindows, work } */
function setRowTemplateFrom(row, from, state) {
  if (!row.frequency || typeof row.frequency !== 'object') {
    row.frequency = { type: 'weekly', schedule: [], shifts: ['day', 'night'], daysOfWeek: [], dates: [] };
  }
  const f = row.frequency;
  let list = Array.isArray(f.templates) ? f.templates.slice() : [];
  // Первая версия: сохраняем то, что было раньше, как действующее для прошлого
  if (!list.length) {
    list.push({
      from: SCH_BASELINE_FROM,
      inSchedule: row.inSchedule === true,
      schedule: (f.schedule || []).map(x => ({ ...x })),
      timeWindows: (f.timeWindows || []).map(w => ({ from: w.from, to: w.to })),
      work: normWork(row.work)
    });
  }
  list = list.filter(v => v.from < from);
  list.push({
    from,
    inSchedule: state.inSchedule === true,
    schedule: (state.schedule || []).map(x => ({ day: x.day, shift: x.shift })),
    timeWindows: autoTimeWindows(state.work, state.schedule),
    work: normWork(state.work)
  });
  list.sort((a, b) => a.from.localeCompare(b.from));
  f.templates = list;

  // Исходные поля = самая поздняя версия
  const last = list[list.length - 1];
  row.inSchedule = last.inSchedule;
  row.work = last.work;
  f.schedule = last.schedule.map(x => ({ ...x }));
  f.timeWindows = last.timeWindows.map(w => ({ ...w }));
  f.daysOfWeek = [...new Set(f.schedule.map(x => x.day))];
  f.shifts = [...new Set(f.schedule.map(x => x.shift))];
  if (!f.shifts.length) f.shifts = ['day', 'night'];
}

/* Прошла ли смена (её уже нельзя планировать).
   День D: 09:00–21:00, ночь D: 21:00 D – 09:00 D+1. Текущая смена не прошла. */
function isShiftPast(dateStr, shift, now = new Date()) {
  const cur = getCurrentShiftPeriod(now);
  if (dateStr < cur.date) return true;
  if (dateStr > cur.date) return false;
  return shift === 'day' && cur.shiftType === 'night';
}
