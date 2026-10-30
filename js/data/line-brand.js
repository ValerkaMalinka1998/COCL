/* ============================================================ */
/* === ТЕКУЩИЙ БРЕНД ЛИНИИ ==================================== */
/* ============================================================ */
/*
   Какой бренд сейчас идёт на линии — от него зависят значения,
   которые оператор проверяет в Чек-листе CL.

   Источники (действует ПОСЛЕДНЕЕ событие по времени):
   - 'cocl'     — смена сорта в «Проверке COCL» (бренд «На бренд»);
   - 'analyst'  — аналитик задал бренд в «Расписании CL»
                  (если оператор не провёл COCL);
   - 'operator' — оператор поправил бренд в Чек-листе CL.
   Если событий нет — старое «Расписание брендов» по датам.

   event = { id, line, brand, at (ISO), source, note }
*/

const LINE_BRAND_SOURCES = {
  cocl: 'смена сорта (CL при переходах)',
  analyst: 'задан аналитиком',
  operator: 'изменён оператором',
  plan: 'план брендов'
};

function getLineBrandEvents() {
  const v = load(STORAGE_KEYS.lineBrandEvents, []);
  return Array.isArray(v) ? v : [];
}
function setLineBrandEvents(v) { save(STORAGE_KEYS.lineBrandEvents, v); }

function addLineBrandEvent(line, brand, source, note) {
  if (!line || !brand) return;
  const all = getLineBrandEvents();
  all.push({ id: uid(), line, brand, at: new Date().toISOString(), source: source || 'analyst', note: note || '' });
  // Храним последние 200 событий на линию — больше не нужно
  const own = all.filter(e => e.line === line);
  const drop = own.length > 200 ? new Set(own.slice(0, own.length - 200).map(e => e.id)) : null;
  setLineBrandEvents(drop ? all.filter(e => !drop.has(e.id)) : all);
}

/* Текущий бренд линии → { brand, source, at, note } | null */
function getLineBrandNow(line) {
  if (!line) return null;
  const now = new Date().toISOString();
  const last = getLineBrandEvents()
    .filter(e => e.line === line && e.at <= now)
    .sort((a, b) => a.at.localeCompare(b.at))
    .pop();
  if (last) return { brand: last.brand, source: last.source, at: last.at, note: last.note || '' };
  const planned = typeof getElectronicBrandForDate === 'function'
    ? getElectronicBrandForDate(line, getCurrentShiftPeriod().date) : null;
  return planned ? { brand: planned, source: 'plan', at: '', note: '' } : null;
}

/* Подпись источника: «смена сорта (COCL) · 19.10 21:40» */
function lineBrandSourceText(info) {
  if (!info) return '';
  const src = LINE_BRAND_SOURCES[info.source] || '';
  if (!info.at) return src;
  const d = new Date(info.at);
  const p = (n) => String(n).padStart(2, '0');
  return `${src} · ${p(d.getDate())}.${p(d.getMonth() + 1)} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/* ------------------------------------------------------------
   Какие значения стандарта / E-Param проверять для бренда.
   list — measurements (стандарт и E-Param); строка
   без бренда = «Все бренды».
   → { item, kind } где kind:
     'brand'   — своя строка бренда;
     'rest'    — «Все бренды»;
     'single'  — у стандарта одна строка, бренд не важен;
     'missing' — для этого бренда значений нет;
     'nobrand' — бренд линии не задан, а значения разные по брендам;
     'none'    — значений нет вообще.
   Первый бренд по списку больше НЕ подставляется — иначе оператор
   молча сверяется с чужой нормой.
   ------------------------------------------------------------ */
const REST_BRANDS_LABEL = 'Все бренды';

/* Подпись «всех брендов» в Excel: понимаем и старые файлы («Остальные бренды», «Все сорта») */
function isRestBrandLabel(text) {
  // Двойные пробелы, перенос строки и «:» / «*» в конце подписи из Excel — та же подпись
  const s = String(text || '').toLowerCase().replace(/\s+/g, ' ').trim().replace(/\s*[.:;*]+$/, '');
  return /^(все бренды|остальные бренды|все сорта)$/.test(s);
}

function pickBrandValues(list, brand) {
  const arr = (Array.isArray(list) ? list : []).filter(Boolean);
  if (!arr.length) return { item: null, kind: 'none' };
  if (brand) {
    const own = arr.find(x => x.brand === brand);
    if (own) return { item: own, kind: 'brand' };
  }
  const rest = arr.find(x => !x.brand);
  if (rest) return { item: rest, kind: arr.length === 1 ? 'single' : 'rest' };
  if (!brand && arr.length === 1) return { item: arr[0], kind: 'single' };
  return { item: null, kind: brand ? 'missing' : 'nobrand' };
}

