/* ============================================================
   ДАННЫЕ: предложения оператора на апрув аналитику
   Оператор не меняет стандарты сам: новый стандарт или правка существующего
   уходят сюда. Аналитик рассматривает (может поправить) и сохраняет —
   только тогда стандарт меняется и попадает в лист истории.
   Запись: { id, kind: 'mech', refId (null — новый), line, title, data, base,
             author, createdAt, status: 'pending' | 'approved' | 'rejected',
             decidedAt, decidedBy, comment }
   Модуль общего пространства имён: функции и переменные видны
   во всех файлах. Порядок подключения — index.html.
   ============================================================ */

function getStdProposals() {
  const v = load(STORAGE_KEYS.stdProposals, []);
  return Array.isArray(v) ? v : [];
}
function saveStdProposal(p) { save(STORAGE_KEYS.stdProposals, upsertById(getStdProposals(), [p])); }

/* Ждут решения — в зоне видимости пользователя (цех / участок) */
function getPendingProposals() {
  return getStdProposals().filter(p => p.status === 'pending' && lineInUserScope(p.line));
}

function addStdProposal(data, base) {
  const p = {
    id: uid(),
    kind: 'mech',
    refId: base ? base.id : null,
    line: data.line,
    title: data.title || '',
    data,
    base: base || null,
    author: getCurrentUser() || '—',
    createdAt: new Date().toISOString(),
    status: 'pending',
    decidedAt: null,
    decidedBy: null,
    comment: ''
  };
  saveStdProposal(p);
  return p;
}

function decideStdProposal(id, status, comment) {
  const p = getStdProposals().find(x => x.id === id);
  if (!p) return null;
  p.status = status;
  p.decidedAt = new Date().toISOString();
  p.decidedBy = getCurrentUser() || '—';
  p.comment = comment || '';
  saveStdProposal(p);
  return p;
}
