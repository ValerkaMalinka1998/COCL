/* ============================================================
   ДАННЫЕ: простои линии
   cl_line_downtime_v1 = { "<линия>": [{ id, from, fromShift, to, toShift,
     reason, note, createdAt }] }
   to = '' — «до запуска» (простой ещё открыт). В простое проверки CL
   не планируются, не считаются пропущенными, открытые долги снимаются.
   Ставит аналитик в «Расписании CL», можно задним числом.
   ============================================================ */

const DOWNTIME_REASONS = [
  { id: 'repair', label: 'Ремонт' },
  { id: 'noPlan', label: 'Нет плана' },
  { id: 'noMaterial', label: 'Отсутствие материалов' },
  { id: 'test', label: 'Тесты новых продуктов' },
  { id: 'other', label: 'Другое' }
];

/* Причина словами: «Другое» — текст аналитика */
function downtimeReasonText(d) {
  if (d.reason === 'other') return d.note || 'Другое';
  const r = DOWNTIME_REASONS.find(x => x.id === d.reason);
  return r ? r.label : 'Причина не указана';
}

/* «13.10 день» */
function dtShiftText(dateStr, shift) {
  return `${dateStr.slice(8, 10)}.${dateStr.slice(5, 7)} ${shift === 'night' ? 'ночь' : 'день'}`;
}

/* Период словами: «13.10 день – 17.10 ночь» или «с 13.10 день · до запуска» */
function dtPeriodText(d) {
  return d.to
    ? `${dtShiftText(d.from, d.fromShift)} – ${dtShiftText(d.to, d.toShift)}`
    : `с ${dtShiftText(d.from, d.fromShift)} · до запуска`;
}

function getLineDowntimes(line) {
  const all = load(STORAGE_KEYS.lineDowntime, {});
  return Array.isArray(all[line]) ? all[line] : [];
}

function setLineDowntimes(line, list) {
  const all = load(STORAGE_KEYS.lineDowntime, {});
  if (list && list.length) all[line] = list;
  else delete all[line];
  save(STORAGE_KEYS.lineDowntime, all);
}

/* Входит ли смена в простой линии. list — чтобы не читать хранилище в циклах */
function isDowntimeShift(line, dateStr, shift, list = getLineDowntimes(line)) {
  if (!list.length) return false;
  const i = valShiftIndex(dateStr, shift);
  return list.some(d => d && d.from &&
    i >= valShiftIndex(d.from, d.fromShift === 'night' ? 'night' : 'day') &&
    (!d.to || i <= valShiftIndex(d.to, d.toShift === 'day' ? 'day' : 'night')));
}
