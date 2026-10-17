/* ============================================================
   КОМПОНЕНТЫ: уведомление «Сделайте запись в Machine Journal»
   Показывается после сохранения любой проверки с отклонениями
   (Чек-лист CL, TOP Losses, COCL). Журнал машины — в другом
   приложении, здесь только напоминание и список отклонений.
   Модуль общего пространства имён: функции и переменные видны
   во всех файлах. Порядок подключения — index.html.
   ============================================================ */

/* failItems — пункты истории со статусом FAIL: { machine, nodePart, oplNumber,
   title, norm, answer, value, comment, kind }; ctx — { line, source } */
function showMachineJournalNotice(failItems, ctx = {}) {
  const items = (failItems || []).filter(Boolean);
  if (!items.length) return;
  const modal = $('#mjNoticeModal');
  if (!modal) return;

  // Группы по машинам
  const groups = {};
  items.forEach(it => {
    const key = [it.machine || 'Без машины', it.nodePart].filter(Boolean).join(' · ');
    (groups[key] = groups[key] || []).push(it);
  });
  const machines = Object.keys(groups).length;

  const valueText = (it) => {
    if (it.deviation) return it.deviation;
    const v = it.answer && it.answer !== '—' ? it.answer : (it.value != null && it.value !== '' ? String(it.value) : 'Не ОК');
    return it.norm ? `${v} · норма: ${it.norm}` : v;
  };

  $('#mjNoticeSub').innerHTML = `${escapeHtml(ctx.source || 'Проверка')} · линия <b>${escapeHtml(ctx.line || '—')}</b> · отклонений: <b>${items.length}</b>${machines > 1 ? ` на ${machines} машинах` : ''}`;
  $('#mjNoticeList').innerHTML = Object.entries(groups).map(([m, list]) => `
    <div class="mj-group">Машина ${escapeHtml(m)}</div>
    ${list.map(it => `
      <div class="mj-item">
        <div class="mj-item-title">${it.kind === 'elec' ? '<span class="mj-kind">E-Param</span> ' : ''}${it.oplNumber ? `<span class="mj-opl">${escapeHtml(it.oplNumber)}</span> · ` : ''}${escapeHtml(it.title || '—')}</div>
        <div class="mj-item-val">${escapeHtml(valueText(it))}</div>
        ${it.comment ? `<div class="mj-item-com">💬 ${escapeHtml(it.comment)}</div>` : ''}
      </div>`).join('')}`).join('');

  // Текст для копирования в Machine Journal
  modal.dataset.copyText = items.map(it =>
    `${ctx.line || ''} · ${it.machine || ''} · ${it.oplNumber ? it.oplNumber + ' ' : ''}${it.title || ''}: ${valueText(it)}${it.comment ? ' (' + it.comment + ')' : ''}`
  ).join('\n');

  openModal(modal);
}

function closeMachineJournalNotice() {
  closeModal('#mjNoticeModal');
}

$('#mjNoticeOkBtn')?.addEventListener('click', closeMachineJournalNotice);
$('#mjNoticeClose')?.addEventListener('click', closeMachineJournalNotice);
$('#mjNoticeCopyBtn')?.addEventListener('click', async () => {
  const text = $('#mjNoticeModal')?.dataset.copyText || '';
  try {
    await navigator.clipboard.writeText(text);
    showToast('Список отклонений скопирован');
  } catch (e) {
    // file:// может не дать доступ к буферу — выделяем текст для ручного копирования
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); showToast('Список отклонений скопирован'); }
    catch (err) { showToast('Не удалось скопировать', true); }
    ta.remove();
  }
});
