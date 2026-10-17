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
    work: 'Run',              // 'Run' | 'Stop'
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
    // --- НОВОЕ: в расписании технолога ---
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
  const cleanNum = s.replace(/[^\d.\-+]/g, '').replace(',', '.');
  const single = parseFloat(cleanNum);
  if (!isNaN(single) && cleanNum !== '' && cleanNum !== '-' && cleanNum !== '+') {
    return { min: single, max: single };
  }

  return null;
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
    // --- НОВОЕ: в расписании технолога (миграция) ---
    inSchedule: st.inSchedule === true,
    // --- НОВОЕ: миграция истории ---
    author: typeof st.author === 'string' ? st.author : '',
    createdAt: st.createdAt || null,
    updatedAt: st.updatedAt || null,
    // --- НОВОЕ: миграция комментария к деактивации ---
    deactivationComment: typeof st.deactivationComment === 'string' ? st.deactivationComment : '',
    deactivationHistory: Array.isArray(st.deactivationHistory) ? st.deactivationHistory : []
  };
}

function getStandards() {
  const raw = load(STORAGE_KEYS.standards, []);
  return raw.map(normalizeStandard);
}
function setStandards(v) { save(STORAGE_KEYS.standards, v); }

function getHistory() { return load(STORAGE_KEYS.history, []); }
function setHistory(v) { save(STORAGE_KEYS.history, v); }
