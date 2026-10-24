/* ============================================================ */
/* === ОЗНАКОМЛЕНИЕ С ИЗМЕНЕНИЯМИ СТАНДАРТА / E-PARAM ========= */
/* ============================================================ */
/* С чем знакомиться — последнее существенное изменение из листа
   изменений (action 'changed', sheet !== false). Окно — 28 смен.
   Отметка: { id, kind, refId, changeId, at, shiftDate, shiftType,
              shiftLetter, who }. who = '—' до автологина: кто именно
   ознакомился, станет известно, когда появится вход по пользователю. */

const STD_ACK_WINDOW_SHIFTS = 28;

function getStdAck() {
  const v = load(STORAGE_KEYS.stdAck, []);
  return Array.isArray(v) ? v : [];
}
function setStdAck(v) { save(STORAGE_KEYS.stdAck, v); }

/* Последнее изменение, с которым нужно ознакомиться, или null */
function getStdAckChange(kind, refId) {
  const rows = getChangeLogForRef(kind, refId)
    .filter(e => e.action === 'changed' && e.sheet !== false);
  return rows.length ? rows[rows.length - 1] : null;
}

/* Сколько смен из окна осталось (0 — срок прошёл) */
function stdAckShiftsLeft(change, now = new Date()) {
  if (!change || !change.date) return 0;
  const from = getCurrentShiftPeriod(new Date(change.date));
  const cur = getCurrentShiftPeriod(now);
  const passed = valShiftIndex(cur.date, cur.shiftType) - valShiftIndex(from.date, from.shiftType);
  return Math.max(0, STD_ACK_WINDOW_SHIFTS - passed);
}

function getStdAcksFor(changeId) {
  return getStdAck()
    .filter(a => a.changeId === changeId)
    .sort((a, b) => String(b.at).localeCompare(String(a.at)));   // новые сверху
}

function addStdAck(kind, refId, change) {
  const period = getCurrentShiftPeriod();
  const letters = getShiftsForDate(period.date) || {};
  const entry = {
    id: uid(),
    kind,
    refId,
    changeId: change.id,
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
