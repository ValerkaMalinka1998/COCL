/* ============================================================
   ДАННЫЕ: стандарты и история
   createEmptyStandard, normalizeStandard, migrateControlType, parseNorm.
   Модуль общего пространства имён: функции и переменные видны
   во всех файлах. Порядок подключения — index.html.
   ============================================================ */

/* ============================================================
   ФАБРИКА СТАНДАРТА — единая структура
   ============================================================ */
function createEmptyStandard() {
  return {
    id: '',
    active: true,
    number: '',
    oplNumber: '',
    machine: '',
    title: '',
    line: '',
    node: '',
    nodePart: '',
    controlType: '',

    // --- НОВОЕ: работа и время проверки ---
    work: 'Run',              // 'Run' | 'Stop' | 'CIL'
    timeFrom: '',             // '09:10'
    timeTo: '',               // '10:00'
    // --- НОВОЕ: периодичность (расписание проверок) ---
    frequency: {
      type: 'weekly',
      schedule: [],             // массив { day, shift }
      shifts: ['day', 'night'],
      daysOfWeek: [],
      dates: []
    },
    // --- НОВОЕ: в расписании аналитика ---
    inSchedule: false,
    problemDescription: '',
    controlDescription: '',
    purpose: '',
    whyCreated: '',

    measurements: [],

    appliesTo: [],
    triggers: [],
    forceInChangeOver: false,   // принудительно показывать в смене сорта (игнорировать сравнение точек)

    // --- НОВОЕ: история ---
    author: '',
    createdAt: null,
    updatedAt: null,

    photos: [],

    // --- НОВОЕ: комментарий к деактивации ---
    deactivationComment: '',
    deactivationHistory: []   // массив { text, date }
    
  };
}

/**
 * Оставляет только валидные значения appliesTo.
 */
function normalizeAppliesTo(arr) {
  if (!Array.isArray(arr)) return [];
  const VALID = ['ChangeOver', 'CL_TO', 'CL_Conversion'];
  return arr.filter(v => VALID.includes(v));
}

function normalizeMeasurements(measurements) {
  if (!Array.isArray(measurements)) return [];

  // Новый формат — уже блоки
  if (measurements.length && measurements[0] && 'points' in measurements[0]) {
    return measurements.map(b => ({
      brand: b.brand || '',
      points: Array.isArray(b.points)
        ? b.points.map(p => ({ value: p.value || '' }))
        : []
    })).filter(b => b.points.length > 0);
  }

  // Миграция со старого плоского формата
  const byBrand = {};
  measurements.forEach(m => {
    if (!m) return;
    const brand = m.brand || '';
    if (!byBrand[brand]) byBrand[brand] = [];
    if (m.value) byBrand[brand].push({ value: m.value });
  });

  return Object.keys(byBrand)
    .filter(brand => byBrand[brand].length > 0)
    .map(brand => ({ brand, points: byBrand[brand] }));
}

/**
 * Парсит строку нормы и возвращает { min, max } или null.
 *
 * Поддерживаемые форматы:
 *   value_input:  "92 ± 5",  "92+-5",  "92 ±5"   → { min: 87, max: 97 }
 *   range_input:  "5.5 - 8.5", "5.5-8.5", "5.5 до 8.5", "5.5…8.5"
 *                 "-65 до -55", "-65 - -55"     → { min: 5.5, max: 8.5 }
 *
 * Если не удалось распарсить — null.
 */
function parseNorm(normStr) {
  if (normStr == null) return null;
  const s = String(normStr).trim();
  if (!s) return null;

  // --- 1. Пробуем "число ± число" ---
  const plusMinus = s.split(/\s*(?:±|\+-)\s*/);
  if (plusMinus.length === 2) {
    const center = parseFloat(plusMinus[0].replace(',', '.'));
    const tol = parseFloat(plusMinus[1].replace(',', '.'));
    if (!isNaN(center) && !isNaN(tol)) {
      return { min: center - tol, max: center + tol };
    }
  }

  // --- 2. Пробуем диапазон (до / … / – / -) ---
  let rangeStr = s
    .replace(/\s+до\s+/gi, ' | ')
    .replace(/\s*…\s*/g, ' | ')
    .replace(/\s*–\s*/g, ' | ');

  if (!rangeStr.includes('|')) {
    rangeStr = rangeStr.replace(/\s+-\s+/, ' | ');
  }

  let parts = rangeStr.split('|').map(x => x.trim()).filter(Boolean);

  if (parts.length === 1) {
    const dashSplit = s.split(/(?<=[0-9.])-(?=-?[0-9.])/);
    if (dashSplit.length === 2) parts = dashSplit.map(x => x.trim());
  }

  if (parts.length === 2) {
    const a = parseFloat(parts[0].replace(',', '.').replace(/[^\d.\-+]/g, ''));
    const b = parseFloat(parts[1].replace(',', '.').replace(/[^\d.\-+]/g, ''));
    if (!isNaN(a) && !isNaN(b)) {
      return { min: Math.min(a, b), max: Math.max(a, b) };
    }
  }

  // --- 3. НОВОЕ: одиночное число → точная норма (min = max = value) ---
  // Отрезаем всё, что не цифра/точка/минус — на случай "0 бар", "-65 kPa"
  const cleanNum = s.replace(',', '.').replace(/[^\d.\-+]/g, '');
  const single = parseFloat(cleanNum);
  if (!isNaN(single) && cleanNum !== '' && cleanNum !== '-' && cleanNum !== '+') {
    return { min: single, max: single };
  }

  return null;
}

/* Какого типа значение: 'variable' (92 ± 5) | 'interval' (5 до 8) | 'fixed' (одно число)
   | null — не распознано. Нужен, чтобы в тип контроля не попадали значения чужого типа. */
function classifyNormValue(raw) {
  const s = String(raw == null ? '' : raw).trim();
  if (!s) return null;
  const num = (x) => {
    const t = String(x).replace(',', '.').replace(/[^\d.\-+]/g, '');
    return t !== '' && t !== '-' && t !== '+' && !isNaN(parseFloat(t));
  };
  const pm = s.split(/\s*(?:±|\+-)\s*/);
  if (pm.length === 2 || /±|\+-/.test(s)) return pm.length === 2 && num(pm[0]) && num(pm[1]) ? 'variable' : null;
  let r = s.replace(/\s+до\s+/gi, ' | ').replace(/\s*…\s*/g, ' | ').replace(/\s*–\s*/g, ' | ');
  if (!r.includes('|')) r = r.replace(/\s+-\s+/, ' | ');
  let parts = r.split('|').map(x => x.trim()).filter(Boolean);
  if (parts.length === 1) {
    const d = s.split(/(?<=[0-9.])-(?=-?[0-9.])/);
    if (d.length === 2) parts = d.map(x => x.trim());
  }
  if (parts.length === 2) return num(parts[0]) && num(parts[1]) ? 'interval' : null;
  return num(s) ? 'fixed' : null;
}

/* Вид работы проверки: 'Run' | 'Stop' | 'CIL' (чистка/осмотр/смазка). Всё прочее → Run. */
function normWork(w) {
  return w === 'Stop' ? 'Stop' : (w === 'CIL' ? 'CIL' : 'Run');
}
const WORK_CYCLE = ['Run', 'Stop', 'CIL'];

const NORM_TYPE_HINT = {
  fixed: 'одно значение, например 92',
  variable: 'формат «92 ± 5»',
  interval: 'формат «5 до 8»'
};
const NORM_TYPE_NAME = { fixed: 'Фиксированный', variable: 'Вариабельный', interval: 'Контролируемый интервал' };

/* Точка-метка: начинается со слова («метки совпадают», «по риске 0»).
   Число с единицами («92 мм», «5 до 8 мм») и опечатки («5 до», «92 ±») — не метки. */
function isNormMark(raw) {
  const s = String(raw == null ? '' : raw).trim();
  if (!s || /^[-+]?[\d.,]/.test(s)) return false;
  const kind = classifyNormValue(s);
  if (kind === 'variable' || kind === 'interval') return false;
  return /^[a-zа-яё]/i.test(s);
}

/* Текст ошибки, если значение не подходит типу контроля; '' — всё в порядке.
   Метка словами допустима в любом типе — в проверке это ОК / Не ОК.
   Фиксированный: не принимает «92 ± 5» и «5 до 8».
   Вариабельный и интервал: числовые точки — только свой формат. */
function normTypeError(type, raw) {
  const s = String(raw == null ? '' : raw).trim();
  if (!s || !NORM_TYPE_HINT[type] || isNormMark(s)) return '';
  const kind = classifyNormValue(s);
  if (type === 'fixed') {
    if (kind !== 'variable' && kind !== 'interval') return '';
  } else if (kind === type) return '';
  return `«${s}» не подходит к типу «${NORM_TYPE_NAME[type]}» — ${NORM_TYPE_HINT[type]}`;
}

/* ============================================================
   ТИПЫ КОНТРОЛЯ — миграция на 3 канонических типа
   fixed       — Фиксированный (жёсткое значение без допуска; точки опциональны)
   variable    — Вариабельный (всегда точки, target ± tolerance)
   interval    — Контролируемый интервал (например 100…150)
   ============================================================ */

/* Есть ли хотя бы одна точка с допуском (min !== max) */
function hasToleranceInMeasurements(measurements) {
  const arr = Array.isArray(measurements) ? measurements : [];
  for (const b of arr) {
    if (!b) continue;
    // Новый формат: блок с points
    const points = Array.isArray(b.points) ? b.points : [];
    for (const p of points) {
      const norm = parseNorm(p && p.value);
      if (norm && norm.min !== norm.max) return true;
    }
    // Legacy плоский формат: b.value напрямую
    if (!points.length && b.value != null) {
      const norm = parseNorm(b.value);
      if (norm && norm.min !== norm.max) return true;
    }
  }
  return false;
}

/* Фиксированный стандарт «по меткам»: в точках нет чисел (пусто или текст вроде
   «в одну линию») — оператор выбирает ОК / Не ОК. Есть число — вводит значение. */
function pointsAreMarksOnly(points) {
  return (Array.isArray(points) ? points : [])
    .map(p => String(p && p.value != null ? p.value : p == null ? '' : p).trim())
    .filter(Boolean)
    .every(v => parseNorm(v) == null);
}

/* Метки блока брендов текстом: «в одну линию; по рискам» */
function marksText(points) {
  return (Array.isArray(points) ? points : [])
    .map(p => String(p && p.value != null ? p.value : '').trim())
    .filter(Boolean).join('; ');
}

/* Приводит legacy-тип к каноническому (с учётом точек) */
function migrateControlType(type, measurements) {
  if (type === 'fixed' || type === 'variable' || type === 'interval') return type;
  if (type === 'range_input') return 'interval';
  if (type === 'ok_not_ok') return 'fixed';
  if (type === 'tolerance') return 'variable';
  if (type === 'value_input') {
    // Только для мех-стандартов (передан массив measurements) проверяем допуск точек:
    // жёсткое значение (без допуска) → fixed, иначе → variable.
    // Без measurements (электроника, история) value_input = ввод значения → variable.
    if (Array.isArray(measurements) && !hasToleranceInMeasurements(measurements)) {
      return 'fixed';
    }
    return 'variable';
  }
  // Неизвестный / пустой — по умолчанию «Фиксированный» (с точками или ОК/НеОК)
  return 'fixed';
}

function normalizeStandard(st) {
  const empty = createEmptyStandard();
  return {
    ...empty,
    ...st,
    id: st.id || empty.id,
    active: st.active !== undefined ? st.active : true,
    controlType: migrateControlType(st.controlType, st.measurements),
    measurements: normalizeMeasurements(st.measurements),
    appliesTo: normalizeAppliesTo(st.appliesTo),
    triggers: Array.isArray(st.triggers) ? st.triggers : [],
    forceInChangeOver: st.forceInChangeOver === true,
    photos: Array.isArray(st.photos)
      ? st.photos.filter(p => typeof p === 'string' && p.trim() !== '')
      : [],
    // --- НОВОЕ: в расписании аналитика (миграция) ---
    inSchedule: st.inSchedule === true,
    // --- НОВОЕ: миграция истории ---
    author: typeof st.author === 'string' ? st.author : '',
    createdAt: st.createdAt || null,
    updatedAt: st.updatedAt || null,
    // --- НОВОЕ: миграция комментария к деактивации ---
    deactivationComment: typeof st.deactivationComment === 'string' ? st.deactivationComment : '',
    deactivationHistory: Array.isArray(st.deactivationHistory) ? st.deactivationHistory : [],
    // --- Валидация нового стандарта ---
    validation: normalizeValidation(st.validation)
  };
}

function getStandards() {
  const raw = load(STORAGE_KEYS.standards, []);
  if (!loadCache) return raw.map(normalizeStandard);
  // В withLoadCache нормализуем один раз на отрисовку; копия массива — вызывающий может сортировать
  if (!loadCache.has('norm:standards')) loadCache.set('norm:standards', raw.map(normalizeStandard));
  return loadCache.get('norm:standards').slice();
}
function setStandards(v) { save(STORAGE_KEYS.standards, v); }

function getHistory() { return load(STORAGE_KEYS.history, []); }
function setHistory(v) { save(STORAGE_KEYS.history, v); }

/* === ЗАПИСЬ ПО ОДНОЙ ЗАПИСИ ===
   Вкладки пишут только через эти функции, а не через set*(весь массив):
   в хабе eIWS каждая станет одним запросом к API (сервер принимает записи по одной). */

// Заменяет записи с теми же id, новые добавляет в конец
function upsertById(list, items) {
  items.forEach(it => {
    const idx = list.findIndex(x => x.id === it.id);
    if (idx !== -1) list[idx] = it; else list.push(it);
  });
  return list;
}

function saveStandards(items) { if (items.length) setStandards(upsertById(getStandards(), items)); }
function saveStandard(st) { saveStandards([st]); }
function removeStandard(id) { setStandards(getStandards().filter(s => s.id !== id)); }

function saveHistoryRecords(items) { if (items.length) setHistory(upsertById(getHistory(), items)); }
function addHistoryRecord(rec) { saveHistoryRecords([rec]); }
function clearHistory() { setHistory([]); }
/* Срок хранения проверок — 12 месяцев; удаляет записи раньше даты, возвращает число удалённых */
const HISTORY_KEEP_MONTHS = 12;
function pruneHistoryBefore(dateISO) {
  const all = getHistory();
  const keep = all.filter(h => (h.date || String(h.timestamp || '').slice(0, 10)) >= dateISO);
  if (keep.length !== all.length) setHistory(keep);
  return all.length - keep.length;
}

/* ============================================================
   ВАЛИДАЦИЯ НОВОГО СТАНДАРТА / E-PARAM
   validation = { from, until, decidedAt, result }:
   from — дата смены начала, until — срок, decidedAt/result —
   решение аналитика ('approved' | 'rejected'). Пока решения нет,
   строка проверяется каждую смену (с from) и идёт в чек-листе последней.
   ============================================================ */

// Срок валидации по умолчанию и минимум для нового — 28 смен (14 суток), считая с текущей смены
const VALIDATION_SHIFTS = 28;

/* Номер смены от «эпохи»: сутки × 2 (+1 для ночи). Нужен, чтобы срок
   считался в сменах: начало и конец могут попадать на день или ночь. */
function valShiftIndex(dateStr, shift) {
  const t = Date.UTC(+dateStr.slice(0, 4), +dateStr.slice(5, 7) - 1, +dateStr.slice(8, 10));
  return Math.round(t / 864e5) * 2 + (shift === 'night' ? 1 : 0);
}
function valShiftFromIndex(idx) {
  const d = new Date(Math.floor(idx / 2) * 864e5);
  const p = (n) => String(n).padStart(2, '0');
  return { date: `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}`, shift: idx % 2 ? 'night' : 'day' };
}

/* Новая валидация с текущей смены на n смен */
function makeValidation(shifts) {
  const cur = getCurrentShiftPeriod();
  const start = valShiftIndex(cur.date, cur.shiftType);
  const end = valShiftFromIndex(start + (shifts || VALIDATION_SHIFTS) - 1);
  return { from: cur.date, fromShift: cur.shiftType, until: end.date, untilShift: end.shift, decidedAt: '', decidedShift: '', result: '' };
}

/* Сколько смен в сроке валидации */
function validationShiftCount(v) {
  if (!v || !v.from) return 0;
  return valShiftIndex(v.until, v.untilShift) - valShiftIndex(v.from, v.fromShift) + 1;
}

function normalizeValidation(v) {
  if (!v || typeof v !== 'object' || !v.from) return null;
  // Старые записи (до счёта в сменах): с дневной смены from до ночной until
  const fromShift = v.fromShift === 'night' ? 'night' : 'day';
  const until = String(v.until || valShiftFromIndex(valShiftIndex(String(v.from), fromShift) + VALIDATION_SHIFTS - 1).date);
  return {
    from: String(v.from),
    fromShift,
    until,
    untilShift: v.untilShift === 'day' ? 'day' : 'night',
    decidedAt: v.decidedAt ? String(v.decidedAt) : '',
    decidedShift: v.decidedShift === 'night' ? 'night' : (v.decidedAt ? 'day' : ''),
    result: v.result === 'approved' || v.result === 'rejected' ? v.result : ''
  };
}

/* Идёт ли валидация: решения нет и срок не вышел. После срока стандарт
   автоматически становится обычным — в расписании не продлевается */
function isOnValidation(row) {
  return validationStatus(row) === 'active';
}

/* Входит ли смена в период валидации: только смены срока (с начала до конца).
   После срока смены сами не добавляются — продлить может только аналитик */
function isValidationShift(row, dateStr, shift) {
  const v = row && row.validation;
  if (!v || !v.from || !dateStr) return false;
  const i = valShiftIndex(dateStr, shift);
  if (i < valShiftIndex(v.from, v.fromShift)) return false;
  if (row.line && isDowntimeShift(row.line, dateStr, shift)) return false;
  if (v.decidedAt) return i < valShiftIndex(v.decidedAt, v.decidedShift || 'day');
  return i <= valUntilIndex(row);
}

/* Конец срока валидации (номер смены): сдвигается на смены простоя линии.
   Считаем простой только до текущей смены — «до запуска» не тянет срок бесконечно */
function valUntilIndex(row) {
  const v = row.validation;
  let end = valShiftIndex(v.until, v.untilShift || 'night');
  const downs = row.line ? getLineDowntimes(row.line) : [];
  if (!downs.length) return end;
  const cur = getCurrentShiftPeriod();
  const curI = valShiftIndex(cur.date, cur.shiftType);
  for (let i = valShiftIndex(v.from, v.fromShift); i <= end && i <= curI; i++) {
    const at = valShiftFromIndex(i);
    if (isDowntimeShift(row.line, at.date, at.shift, downs)) end++;
  }
  return end;
}

/* Есть ли в эти сутки хоть одна смена валидации */
function isValidationDay(row, dateStr) {
  return isValidationShift(row, dateStr, 'day') || isValidationShift(row, dateStr, 'night');
}

/* 'none' | 'active' | 'ended' (срок вышел сам) | 'approved' | 'rejected' */
function validationStatus(row) {
  const v = row && row.validation;
  if (!v || !v.from) return 'none';
  if (v.decidedAt) return v.result || 'approved';
  const cur = getCurrentShiftPeriod();
  return valShiftIndex(cur.date, cur.shiftType) > valUntilIndex(row) ? 'ended' : 'active';
}

/* Сколько смен осталось до конца срока (включая текущую) */
function validationShiftsLeft(row) {
  const v = row && row.validation;
  if (!v) return 0;
  const cur = getCurrentShiftPeriod();
  return valUntilIndex(row) - valShiftIndex(cur.date, cur.shiftType) + 1;
}
