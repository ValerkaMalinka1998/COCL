/* ============================================================
   ДАННЫЕ: справочники
   Top Losses, E-Param, бренды, триггеры, машины линий, расписание брендов.
   Модуль общего пространства имён: функции и переменные видны
   во всех файлах. Порядок подключения — index.html.
   ============================================================ */

/* ============================================================
   TOP LOSSES — доступ к данным
   ============================================================ */

function getTopLosses() {
  const raw = load(STORAGE_KEYS.topLosses, null);
  if (raw === null) return JSON.parse(JSON.stringify(DEFAULT_TOP_LOSSES));
  return Array.isArray(raw) ? raw : JSON.parse(JSON.stringify(DEFAULT_TOP_LOSSES));
}
/*========================================================
  CL ELECTRONIC — доступ к параметрам
============================================================ */

function getElectronicParams() {
  return load(STORAGE_KEYS.electronicParams, []);
}
function setElectronicParams(v) {
  save(STORAGE_KEYS.electronicParams, v);
}

/* Генерация ID для нового параметра */
function makeElectronicParamId() {
  return 'elec_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
}

/* Нормализация одного параметра (защита от старых данных) */
function normalizeElectronicParam(p) {
  return {
    id: p.id || makeElectronicParamId(),
    active: p.active !== false,

    line: p.line || '',
    machine: p.machine || '',
    nodePart: p.nodePart || '',
    paramName: p.paramName || '',
    work: normWork(p.work),
    timeFrom: p.timeFrom || '',
    timeTo: p.timeTo || '',

    // Время на проверку, сек (входит в сумму смены в Чек-листе и Расписании)
    durationSec: Math.max(0, Number(p.durationSec) || 0),

    controlType: migrateControlType(p.controlType, null),
    normText: typeof p.normText === 'string' ? p.normText : '',

    // Пустой бренд — «Остальные бренды»: оставляем, если у нормы есть значения
    // (раньше такие нормы отбрасывались и стирались при сохранении любого E-Param)
    valuesByBrand: Array.isArray(p.valuesByBrand)
      ? p.valuesByBrand.filter(v => v && typeof v === 'object' &&
          (v.brand || [v.target, v.tolerance, v.min, v.max].some(x => x !== '' && x != null)))
      : [],

    // --- Применяемость ---
    appliesTo: Array.isArray(p.appliesTo) ? p.appliesTo.filter(v =>
      ['ChangeOver', 'CL_TO', 'CL_Conversion'].includes(v)
    ) : [],

    // --- Триггеры Change Over ---
    triggers: Array.isArray(p.triggers) ? p.triggers.filter(t => typeof t === 'string') : [],

    // --- Top Losses: id потерь, которые контролирует параметр ---
    topLosses: Array.isArray(p.topLosses) ? p.topLosses.filter(t => typeof t === 'string') : [],

    frequency: normalizeElectronicFrequency(p.frequency),

    // --- НОВОЕ: в расписании аналитика ---
    inSchedule: p.inSchedule === true,

    author: typeof p.author === 'string' ? p.author : '',
    createdAt: p.createdAt || null,
    updatedAt: p.updatedAt || null,

    // --- Валидация нового параметра ---
    validation: normalizeValidation(p.validation)
  };
}

/* Нормализация периодичности */
function normalizeElectronicFrequency(f) {
  const def = { type: 'weekly', schedule: [], shifts: ['day', 'night'], daysOfWeek: [], dates: [] };
  if (!f || typeof f !== 'object') return def;

  // type: rotation больше нет — мигрируем в weekly
  let type = ['daily','weekly','once'].includes(f.type) ? f.type : 'weekly';

  // dates
  const dates = Array.isArray(f.dates)
    ? f.dates.filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d))
    : [];

  // --- Новый формат: schedule ---
  if (Array.isArray(f.schedule)) {
    const schedule = f.schedule
      .filter(x => x && Number.isInteger(x.day) && x.day >= 0 && x.day <= 6)
      .filter(x => x.shift === 'day' || x.shift === 'night')
      .map(x => ({ day: x.day, shift: x.shift }));

    const seen = new Set();
    const uniqueSchedule = schedule.filter(x => {
      const key = `${x.day}|${x.shift}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    const daysOfWeek = [...new Set(uniqueSchedule.map(x => x.day))];
    const shifts = [...new Set(uniqueSchedule.map(x => x.shift))];

    return {
      type,
      schedule: uniqueSchedule,
      shifts: shifts.length ? shifts : ['day', 'night'],
      daysOfWeek,
      dates,
      // Окна времени и версии шаблона задаются в «Расписании CL» — не терять
      timeWindows: Array.isArray(f.timeWindows) ? f.timeWindows : [],
      templates: Array.isArray(f.templates) ? f.templates : []
    };
  }

  // --- Миграция со старого формата ---
  let shifts = Array.isArray(f.shifts) ? f.shifts : [];
  const legacyShifts = shifts.some(s => ['A','B','C','D'].includes(s));
  if (legacyShifts) {
    shifts = ['day', 'night'];
  } else {
    shifts = shifts.filter(s => s === 'day' || s === 'night');
    if (!shifts.length) shifts = ['day', 'night'];
  }

  const daysOfWeek = Array.isArray(f.daysOfWeek)
    ? f.daysOfWeek.filter(d => Number.isInteger(d) && d >= 0 && d <= 6)
    : [];

  const schedule = [];
  daysOfWeek.forEach(day => {
    shifts.forEach(shift => {
      schedule.push({ day, shift });
    });
  });

  return {
    type, schedule, shifts, daysOfWeek, dates,
    timeWindows: Array.isArray(f.timeWindows) ? f.timeWindows : [],
    templates: Array.isArray(f.templates) ? f.templates : []
  };
}

/* Получить параметры конкретной линии */
function getElectronicParamsForLine(line) {
  return getElectronicParams()
    .map(normalizeElectronicParam)
    .filter(p => p.line === line);
}

/* Получить расписание для линии — массив { date, brand }, отсортированный по дате */
function getElectronicBrandScheduleForLine(line) {
  const all = getElectronicBrandSchedule();
  const arr = Array.isArray(all[line]) ? all[line] : [];
  return [...arr].sort((a, b) => a.date.localeCompare(b.date));
}

/* Получить бренд по конкретной дате для линии (или null) */
function getElectronicBrandForDate(line, dateStr) {
  const arr = getElectronicBrandScheduleForLine(line);
  const found = arr.find(x => x.date === dateStr);
  return found ? found.brand : null;
}

function setTopLosses(v) {
  save(STORAGE_KEYS.topLosses, v);
}

/* Плоский список всех потерь: [{ id, name, categoryId, categoryName }] */
function getAllLossItems() {
  const result = [];
  getTopLosses().forEach(cat => {
    (cat.items || []).forEach(it => {
      result.push({
        id: it.id,
        name: it.name,
        categoryId: cat.id,
        categoryName: cat.name
      });
    });
  });
  return result;
}

/* Найти потерю по id */
function findLossById(lossId) {
  return getAllLossItems().find(l => l.id === lossId) || null;
}

/* Сгенерировать id для новой потери */
function makeLossId(name) {
  const base = 'loss_' + String(name).toLowerCase()
    .replace(/[^a-zа-я0-9]+/gi, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 30);
  const existing = new Set(getAllLossItems().map(l => l.id));
  let candidate = base || 'loss_new';
  let n = 1;
  while (existing.has(candidate)) {
    candidate = base + '_' + (++n);
  }
  return candidate;
}

/* Категории одного цеха (после миграции у каждой категории есть workshop) */
function getTopLossesForWorkshop(workshopId) {
  if (!workshopId) return [];
  return getTopLosses().filter(c => c.workshop === workshopId);
}

/* Разовая миграция: общие категории → по три категории на каждый цех.
   Потеря уходит в цех из item.workshop, без цеха — в SMD (сегодняшние
   данные — SMD Cell 2). ID потерь сохраняются, поэтому привязки
   стандартов (standard.topLosses) не теряются. */
function migrateTopLossesByWorkshop() {
  const FLAG = 'cl_toploss_ws_split_v1';
  try { if (localStorage.getItem(FLAG)) return; } catch (e) { return; }

  const workshops = getWorkshops();
  const wsIds = workshops.map(w => w.id);
  const fallbackWs = wsIds.includes('smd') ? 'smd' : wsIds[0];
  const src = getTopLosses();
  const result = src.filter(c => c.workshop && wsIds.includes(c.workshop));
  const shared = src.filter(c => !(c.workshop && wsIds.includes(c.workshop)));

  wsIds.forEach(ws => {
    shared.forEach(cat => {
      const items = (cat.items || []).filter(it => {
        const itWs = wsIds.includes(it.workshop) ? it.workshop : fallbackWs;
        return itWs === ws;
      }).map(it => ({ id: it.id, name: it.name }));
      result.push({
        id: ws === fallbackWs ? cat.id : cat.id + '_' + ws,
        name: cat.name,
        workshop: ws,
        items
      });
    });
    // У каждого цеха — все три канонические категории
    TOP_LOSS_CATEGORY_NAMES.forEach(name => {
      const has = result.some(c => c.workshop === ws && c.name.toLowerCase() === name.toLowerCase());
      if (!has) result.push({ id: makeCategoryId(name) + '_' + ws, name, workshop: ws, items: [] });
    });
  });

  setTopLosses(result);
  try { localStorage.setItem(FLAG, '1'); } catch (e) {}
}

/* Сгенерировать id для новой категории */
function makeCategoryId(name) {
  const base = 'cat_' + String(name).toLowerCase()
    .replace(/[^a-zа-я0-9]+/gi, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 30);
  const existing = new Set(getTopLosses().map(c => c.id));
  let candidate = base || 'cat_new';
  let n = 1;
  while (existing.has(candidate)) {
    candidate = base + '_' + (++n);
  }
  return candidate;
}
function setLineMachines(v) { save(STORAGE_KEYS.lineMachines, v); }

/* Машины конкретной линии */
function getMachinesForLine(line) {
  const lm = getLineMachines();
  return Array.isArray(lm[line]) ? lm[line] : [];
}

function getBrands() { return load(STORAGE_KEYS.brands, [...DEFAULT_BRANDS]); }
function setBrands(v) { save(STORAGE_KEYS.brands, v); }

/* Цех для каждого бренда: { [brandName]: workshopId } */
function getBrandWorkshops() { return load(STORAGE_KEYS.brandWorkshops, {}); }
function setBrandWorkshops(v) { save(STORAGE_KEYS.brandWorkshops, v); }
function getBrandWorkshop(brandName) { return getBrandWorkshops()[brandName] || ''; }
function setBrandWorkshop(brandName, workshopId) {
  const m = getBrandWorkshops();
  if (workshopId) m[brandName] = workshopId;
  else delete m[brandName];
  setBrandWorkshops(m);
}

/* Разовая миграция: бренду без цеха назначаем цех, если все линии, к которым
   он привязан, принадлежат одному цеху. Остальные остаются «Без цеха». */
function migrateBrandWorkshopsFromLines() {
  const FLAG = 'cl_brands_ws_autoassign_v1';
  try { if (localStorage.getItem(FLAG)) return; } catch (e) { return; }

  const lb = getLineBrands();
  const m = getBrandWorkshops();
  let changed = 0;
  getBrands().forEach(brand => {
    if (m[brand]) return;
    const wsSet = new Set(Object.keys(lb)
      .filter(line => Array.isArray(lb[line]) && lb[line].includes(brand))
      .map(line => getWorkshopIdForLine(line))
      .filter(Boolean));
    if (wsSet.size === 1) {
      m[brand] = [...wsSet][0];
      changed++;
    }
  });
  if (changed) setBrandWorkshops(m);
  try { localStorage.setItem(FLAG, '1'); } catch (e) {}
}

function getLineBrands() { return load(STORAGE_KEYS.lineBrands, {}); }
function setLineBrands(v) { save(STORAGE_KEYS.lineBrands, v); }

/* --- Пользовательские триггеры Change Over (мех + электро) --- */
function getCustomTriggers() {
  const raw = load(STORAGE_KEYS.customTriggers, null);
  if (!Array.isArray(raw)) {
    // Дефолт — прежние фиксированные опции как стартовый набор
    const def = MATERIAL_CHANGES.map(m => ({
      id: 'ct_' + m.value,
      label: m.label,
      value: m.value,
      workshop: '',
      part: ''
    }));
    save(STORAGE_KEYS.customTriggers, def);
    return def;
  }
  return raw.filter(t => t && typeof t.label === 'string' && t.label.trim());
}
function setCustomTriggers(v) { save(STORAGE_KEYS.customTriggers, v); }

/* Триггеры цеха. Часть линии учитывается только в SMD: триггер без части
   подходит и Maker, и Packer. */
function getTriggersForWorkshop(workshopId, part) {
  if (!workshopId) return [];
  return getCustomTriggers().filter(t =>
    t.workshop === workshopId &&
    (workshopId !== 'smd' || !part || !t.part || t.part === part));
}

/* Название триггера по значению (для чипов) */
function getTriggerLabel(value) {
  const t = getCustomTriggers().find(x => x.value === value);
  return t ? t.label : String(value || '');
}

/* Разовая миграция триггеров:
   - триггер без цеха → SMD (сегодняшние триггеры — материалы SMD);
   - «узлы» (node:…) убираются из стандартов и параметров: оператор
     никогда не мог их выбрать в «Что меняется», поэтому стандарт с
     такими триггерами в Change Over не показывался вовсе. */
function migrateTriggersByWorkshop() {
  const FLAG = 'cl_triggers_ws_v1';
  try { if (localStorage.getItem(FLAG)) return; } catch (e) { return; }

  const wsIds = getWorkshops().map(w => w.id);
  const fallbackWs = wsIds.includes('smd') ? 'smd' : wsIds[0];
  const list = getCustomTriggers();
  let changed = false;
  list.forEach(t => {
    if (!wsIds.includes(t.workshop)) { t.workshop = fallbackWs; changed = true; }
    if (t.workshop !== 'smd' && t.part) { t.part = ''; changed = true; }
  });
  if (changed) setCustomTriggers(list);

  const stripNodes = arr => Array.isArray(arr) ? arr.filter(x => !String(x).startsWith('node:')) : [];
  const stds = getStandards();
  let stdChanged = false;
  stds.forEach(st => {
    const next = stripNodes(st.triggers);
    if (Array.isArray(st.triggers) && next.length !== st.triggers.length) { st.triggers = next; stdChanged = true; }
  });
  if (stdChanged) setStandards(stds);

  const params = getElectronicParams();
  let pChanged = false;
  params.forEach(pr => {
    const next = stripNodes(pr.triggers);
    if (Array.isArray(pr.triggers) && next.length !== pr.triggers.length) { pr.triggers = next; pChanged = true; }
  });
  if (pChanged) setElectronicParams(params);

  try { localStorage.setItem(FLAG, '1'); } catch (e) {}
}
