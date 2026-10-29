/* ============================================================
   СТАНДАРТЫ CL: предложения операторов на апрув
   Кнопка «На апрув N» в шапке (только аналитик / админ) → окно со списком.
   «Рассмотреть» — страница стандарта в режиме правки с данными предложения;
   «Утвердить и сохранить» там сохраняет стандарт (и пишет лист истории).
   Модуль общего пространства имён: функции и переменные видны
   во всех файлах. Порядок подключения — index.html.
   ============================================================ */

function renderEditorProposals() {
  const slot = $('#editorProposalsSlot');
  if (!slot) return;
  const n = canDo('edit') ? getPendingProposals().length : 0;
  slot.innerHTML = n ? `<button type="button" class="btn btn-accent btn-icon-text" id="editorProposalsBtn" title="Предложения операторов: новые стандарты и правки">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
    <span>На апрув ${n}</span></button>` : '';
}

function openProposalsModal() {
  renderProposalsList();
  openModal('#proposalsModal');
}

function renderProposalsList() {
  const list = getPendingProposals().sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  $('#proposalsList').innerHTML = list.length ? list.map(p => {
    const cur = p.refId ? getStandards().find(s => s.id === p.refId) : null;
    // Стандарт изменили после предложения — аналитик должен знать, что правка сделана по старой версии
    const stale = cur && p.base && cur.updatedAt !== p.base.updatedAt;
    const gone = p.refId && !cur;
    return `<div class="prop-row">
      <div class="prop-main">
        <span class="prop-kind ${p.refId ? '' : 'is-new'}">${p.refId ? 'Изменение' : 'Новый стандарт'}</span>
        <b>${escapeHtml(p.data.oplNumber || '')}</b> ${escapeHtml(p.title || '—')}
        <small>${escapeHtml([p.line, p.data.machine, p.data.nodePart].filter(Boolean).join(' · '))} · ${escapeHtml(p.author)} · ${escapeHtml(formatDateTime(p.createdAt))}</small>
        ${stale ? '<small class="prop-warn">Стандарт изменён после предложения — сверьте с текущей версией</small>' : ''}
        ${gone ? '<small class="prop-warn">Стандарт удалён — предложение можно только отклонить</small>' : ''}
      </div>
      ${gone ? '' : `<button type="button" class="btn btn-primary btn-sm" data-prop-review="${escapeAttr(p.id)}">Рассмотреть</button>`}
      <button type="button" class="btn btn-danger-soft btn-sm" data-prop-reject="${escapeAttr(p.id)}">Отклонить</button>
    </div>`;
  }).join('') : '<div class="st-muted">Предложений нет</div>';
}

/* Страница стандарта с данными предложения в режиме правки */
function reviewProposal(id) {
  const p = getStdProposals().find(x => x.id === id);
  if (!p) return;
  const cur = p.refId ? getStandards().find(s => s.id === p.refId) : null;
  const data = JSON.parse(JSON.stringify(p.data));
  closeModal('#proposalsModal');
  svFullState.standardId = data.id;
  svFullState.isNew = !cur;
  svFullState.mode = 'edit';
  // До правки — текущая версия: лист истории покажет, что именно меняет предложение
  svFullState.originalData = JSON.parse(JSON.stringify(cur || data));
  svFullState.editingData = data;
  svFullState.proposalId = p.id;
  switchTab('standard-view');
  switchSvFullTab('main');
  renderStandardFullView();
  window.scrollTo({ top: 0, behavior: 'smooth' });
  showToast(`Предложение от ${p.author}: проверьте и нажмите «Утвердить и сохранить»`);
}

document.addEventListener('click', (e) => {
  if (e.target.closest('#editorProposalsBtn')) return openProposalsModal();
  if (e.target.closest('#proposalsClose')) return closeModal('#proposalsModal');
  const rv = e.target.closest('[data-prop-review]');
  if (rv) return reviewProposal(rv.dataset.propReview);
  const rj = e.target.closest('[data-prop-reject]');
  if (rj) {
    const comment = prompt('Почему отклоняете? Оператор увидит комментарий.', '');
    if (comment === null) return;
    decideStdProposal(rj.dataset.propReject, 'rejected', comment.trim());
    renderProposalsList();
    renderEditorProposals();
    if (typeof updateNotifyBadge === 'function') updateNotifyBadge();
    showToast('Предложение отклонено');
  }
});
