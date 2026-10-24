/* ============================================================ */
/* === ОЗНАКОМЛЕНИЕ СО СТАНДАРТОМ / E-PARAM =================== */
/* ============================================================ */
/* Знакомятся со стандартом целиком, в любую смену, без срока.
   Редакция = 1 + число существенных изменений из листа изменений:
   точки и нормы, бренды, описания, фото (как в листе линии + фото).
   После новой редакции прежняя отметка устаревает — нужно повторно.
   Отметка: { id, kind, refId, edition, changeId, at, shiftDate,
              shiftType, shiftLetter, who }.
   who = '—' до автологина: пока «вы» — этот компьютер. */

/* Правки, которые НЕ требуют повторного ознакомления */
const STD_ACK_MINOR_LABELS = ['применяемость', 'триггеры', 'Top Losses',
  'всегда показывать в Change Over', 'длительность'];

function getStdAck() {
  const v = load(STORAGE_KEYS.stdAck, []);
  return Array.isArray(v) ? v : [];
}
function setStdAck(v) { save(STORAGE_KEYS.stdAck, v); }

function stdAckIsMajor(e) {
  if (e.action !== 'changed') return false;
  if (e.sheet !== false) return true;
  const det = Array.isArray(e.details) ? e.details : [];
  return det.some(d => !STD_ACK_MINOR_LABELS.includes(d.label));
}

/* Существенные изменения по порядку: [{ ...entry, edition }] (edition 2, 3, …) */
function getStdAckEditions(kind, refId) {
  return getChangeLogForRef(kind, refId)
    .filter(stdAckIsMajor)
    .map((e, i) => ({ ...e, edition: i + 2 }));
}

/* Состояние ознакомления для этого компьютера */
function getStdAckStatus(kind, refId) {
  const editions = getStdAckEditions(kind, refId);
  const edition = editions.length + 1;
  const acks = getStdAck()
    .filter(a => a.kind === kind && a.refId === refId)
    .sort((a, b) => String(b.at).localeCompare(String(a.at)));   // новые сверху
  const mine = acks[0] || null;
  let state = 'need';
  if (mine) state = (mine.edition || 1) >= edition ? 'ok' : 'again';
  // Что изменилось с момента моей отметки (для оранжевой плашки)
  const since = mine ? editions.filter(e => e.edition > (mine.edition || 1)) : [];
  return { edition, editions, acks, mine, state, since, lastDate: editions.length ? editions[editions.length - 1].date : null };
}

function addStdAck(kind, refId) {
  const st = getStdAckStatus(kind, refId);
  const period = getCurrentShiftPeriod();
  const letters = getShiftsForDate(period.date) || {};
  const last = st.editions[st.editions.length - 1];
  const entry = {
    id: uid(),
    kind,
    refId,
    edition: st.edition,
    changeId: last ? last.id : '',
    at: new Date().toISOString(),
    shiftDate: period.date,
    shiftType: period.shiftType,
    shiftLetter: letters[period.shiftType] || '',
    who: '—'                      // до автологина
  };
  const all = getStdAck();
  all.push(entry);
  setStdAck(all);
  return entry;
}
