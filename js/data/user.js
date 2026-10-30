/* ============================================================
   ДАННЫЕ: текущий пользователь
   Единственное место, откуда берётся автор / оператор. В хабе eIWS
   здесь будет пользователь из SSO.
   ============================================================ */

/* Текущий пользователь (автовход). Пока автовхода нет — пусто, а вызывающий
   код пишет «—». Когда появится SSO, он положит ФИО в 'cl_current_user'. */
function getCurrentUser() {
  try {
    const v = localStorage.getItem('cl_current_user');
    if (v && String(v).trim()) return String(v).trim();
  } catch (e) {}
  return '';
}

/* === РОЛЬ И ЗОНА (временно, до SSO: хранится у этого компьютера) === */
const ROLES = { admin: 'Администратор', analyst: 'Аналитик', operator: 'Оператор' };
const ROLE_HINTS = {
  admin: 'Всё, включая Настройки',
  analyst: 'Стандарты и расписание; решает по предложениям операторов; без Настроек',
  operator: 'Проверки, история, дашборд; стандарты — просмотр и предложения аналитику'
};
function getCurrentRole() {
  try { const v = localStorage.getItem('cl_current_role'); if (ROLES[v]) return v; } catch (e) {}
  return 'admin';
}
function setCurrentRole(r) { try { localStorage.setItem('cl_current_role', ROLES[r] ? r : 'admin'); } catch (e) {} }

/* Цех / участок пользователя: { ws, areaId }; пусто — всё производство */
function getCurrentScope() {
  try { const v = JSON.parse(localStorage.getItem('cl_current_scope') || '{}'); return v && typeof v === 'object' ? v : {}; }
  catch (e) { return {}; }
}
function setCurrentScope(s) { try { localStorage.setItem('cl_current_scope', JSON.stringify(s || {})); } catch (e) {} }

/* Линия в зоне пользователя (для уведомлений и предложений) */
function lineInUserScope(line) {
  const sc = getCurrentScope();
  if (!sc.ws) return true;
  const ctx = getBlockForLine(line);
  if (!ctx || ctx.workshop.id !== sc.ws) return false;
  return !sc.areaId || ctx.area.id === sc.areaId;
}

/* Права роли: edit — менять стандарты, расписание, настройки сразу; propose — только предлагать.
   line — для edit: аналитик меняет стандарты только своего участка (копировать к себе может
   с любого — это право copy) */
function canDo(action, line) {
  const r = getCurrentRole();
  if (action === 'edit') return r === 'admin' || (r === 'analyst' && (!line || lineInUserScope(line)));
  if (action === 'copy') return r !== 'operator';
  if (action === 'propose') return r === 'operator';
  if (action === 'admin') return r === 'admin';   // Настройки
  return true;
}
function canOpenTab(tab) {
  if (tab === 'settings') return canDo('admin');
  if (tab === 'schedule') return canDo('edit');
  return true;
}
