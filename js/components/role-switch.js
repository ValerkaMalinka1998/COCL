/* ============================================================
   КОМПОНЕНТЫ: роль и зона пользователя (временно, до входа через SSO)
   Чип в шапке → окно: роль (админ / аналитик / оператор) и цех / участок.
   Роль ставит body[data-role]: CSS прячет то, что роли недоступно
   ([data-need="edit"] и вкладки). Запрет в хабе будет проверять сервер.
   Модуль общего пространства имён: функции и переменные видны
   во всех файлах. Порядок подключения — index.html.
   ============================================================ */

function applyRoleUi() {
  const role = getCurrentRole();
  document.body.dataset.role = role;
  const chip = $('#roleChipText');
  if (chip) {
    const sc = getCurrentScope();
    const w = sc.ws ? getWorkshop(sc.ws) : null;
    const area = w && sc.areaId ? (w.areas || []).find(a => a.id === sc.areaId) : null;
    chip.textContent = ROLES[role] + (w ? ' · ' + w.name + (area ? ' · ' + area.name : '') : '');
  }
}

function openRoleModal() {
  const role = getCurrentRole();
  const sc = getCurrentScope();
  $('#roleList').innerHTML = Object.entries(ROLES).map(([k, name]) => `
    <label class="role-opt"><input type="radio" name="roleRadio" value="${k}" ${k === role ? 'checked' : ''}>
      <span><b>${escapeHtml(name)}</b><small>${escapeHtml(ROLE_HINTS[k])}</small></span></label>`).join('');
  const ws = $('#roleWs');
  ws.innerHTML = '<option value="">Все цеха</option>' + getWorkshops().map(w =>
    `<option value="${escapeAttr(w.id)}" ${w.id === sc.ws ? 'selected' : ''}>${escapeHtml(w.name)}</option>`).join('');
  fillRoleAreas(sc.areaId);
  openModal('#roleModal');
}

function fillRoleAreas(selected) {
  const w = getWorkshop($('#roleWs').value);
  const sel = $('#roleArea');
  sel.innerHTML = '<option value="">Все участки</option>' + (w ? (w.areas || []).map(a =>
    `<option value="${escapeAttr(a.id)}" ${a.id === selected ? 'selected' : ''}>${escapeHtml(a.name)}</option>`).join('') : '');
  sel.disabled = !w;
}

$('#roleWs')?.addEventListener('change', () => fillRoleAreas(''));
$('#roleChip')?.addEventListener('click', () => openRoleModal());
$('#roleClose')?.addEventListener('click', () => closeModal('#roleModal'));
$('#roleSaveBtn')?.addEventListener('click', () => {
  const r = document.querySelector('input[name="roleRadio"]:checked');
  setCurrentRole(r ? r.value : 'admin');
  setCurrentScope({ ws: $('#roleWs').value, areaId: $('#roleArea').value });
  closeModal('#roleModal');
  applyRoleUi();
  if (typeof updateNotifyBadge === 'function') updateNotifyBadge();
  // Вкладка могла стать недоступной — уходим в Чек-лист CL; иначе перерисовываем текущую
  const cur = document.querySelector('.tab.active');
  const tab = cur ? cur.id.replace('tab-', '') : 'electronic';
  switchTab(canOpenTab(tab) ? tab : 'electronic');
  showToast('Роль: ' + ROLES[getCurrentRole()]);
});

applyRoleUi();
