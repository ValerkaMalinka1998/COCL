/* ============================================================ */
/* === КОММЕНТАРИИ К СТАНДАРТАМ И E-PARAM ===================== */
/* ============================================================ */
/* Замечания оператора к стандарту / параметру и ответ аналитика.
   Запись: { id, kind: 'mech'|'elec', refId, line, reason, text, author,
             createdAt, shiftDate, shiftType, shiftLetter,
             status: 'new'|'done', reply, repliedAt, doneAt } */

function getStdComments() {
  const v = load(STORAGE_KEYS.stdComments, []);
  return Array.isArray(v) ? v : [];
}
function setStdComments(v) { save(STORAGE_KEYS.stdComments, v); }

function getStdCommentsFor(kind, refId) {
  return getStdComments()
    .filter(c => c.kind === kind && c.refId === refId)
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));   // новые сверху
}

function countOpenStdComments(kind, refId) {
  return getStdCommentsFor(kind, refId).filter(c => c.status !== 'done').length;
}

function addStdComment(kind, row, text, reason) {
  const period = getCurrentShiftPeriod();
  const letters = getShiftsForDate(period.date) || {};
  const entry = {
    id: uid(),
    kind,
    refId: row.id,
    line: row.line || '',
    reason: reason || 'other',   // ключ из STD_COMMENT_REASONS
    text: String(text || '').trim(),
    author: '—',                 // до автологина автора не знаем
    createdAt: new Date().toISOString(),
    shiftDate: period.date,
    shiftType: period.shiftType,
    shiftLetter: letters[period.shiftType] || '',
    status: 'new',
    reply: '',
    doneAt: null
  };
  const all = getStdComments();
  all.push(entry);
  setStdComments(all);
  return entry;
}

function updateStdComment(id, patch) {
  const all = getStdComments();
  const c = all.find(x => x.id === id);
  if (!c) return null;
  Object.assign(c, patch);
  setStdComments(all);
  return c;
}

function removeStdComment(id) {
  setStdComments(getStdComments().filter(c => c.id !== id));
}
