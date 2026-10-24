/* ============================================================ */
/* === КОМПОНЕНТЫ: вкладка «Комментарии» стандарта / E-Param == */
/* ============================================================ */
/* Одна разметка для страницы стандарта (kind 'mech') и страницы
   E-Param (kind 'elec'). Обработчики — делегированием на document. */

const STD_COMMENTS_TARGETS = {
  mech: { wrap: '#svCommentsTableWrap', badge: '#svCommentsCount' },
  elec: { wrap: '#epCommentsTableWrap', badge: '#epCommentsCount' }
};

/* Текущий открытый стандарт / параметр — ставит renderStdComments */
const stdCommentsState = { mech: null, elec: null };

function stdCommentWhen(c) {
  const d = c.createdAt ? new Date(c.createdAt) : null;
  const time = d ? `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}` : '';
  const shift = c.shiftType === 'night' ? 'Ночь' : 'День';
  const letter = c.shiftLetter ? ` · ${escapeHtml(c.shiftLetter)}` : '';
  return `${fmtShortDate(c.shiftDate)} ${time} · ${shift}${letter}`;
}

function stdCommentItemHtml(c) {
  const done = c.status === 'done';
  const reply = c.reply
    ? `<div class="stdc-reply"><span class="stdc-reply-label">Ответ аналитика</span>${escapeHtml(c.reply)}</div>`
    : '';
  return `
    <div class="stdc-item${done ? ' is-done' : ''}" data-stdc-id="${escapeAttr(c.id)}">
      <div class="stdc-head">
        <span class="stdc-status ${done ? 'done' : 'new'}">${done ? 'Рассмотрено' : 'Новое'}</span>
        <span class="stdc-when">${stdCommentWhen(c)}</span>
        <span class="stdc-author">${escapeHtml(c.author || '—')}</span>
      </div>
      <div class="stdc-text">${escapeHtml(c.text)}</div>
      ${reply}
      <div class="stdc-actions">
        ${done
          ? `<button type="button" class="btn btn-secondary btn-sm" data-stdc-act="reopen">Вернуть в новые</button>`
          : `<button type="button" class="btn btn-secondary btn-sm" data-stdc-act="reply">${c.reply ? 'Изменить ответ' : 'Ответить'}</button>
             <button type="button" class="btn btn-primary btn-sm" data-stdc-act="done">Рассмотрено</button>`}
        <button type="button" class="btn btn-secondary btn-sm stdc-del" data-stdc-act="delete" title="Удалить">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
        </button>
      </div>
      <div class="stdc-reply-form" style="display:none">
        <textarea class="stdc-reply-input" rows="2" placeholder="Ответ оператору"></textarea>
        <div class="stdc-form-btns">
          <button type="button" class="btn btn-secondary btn-sm" data-stdc-act="reply-cancel">Отмена</button>
          <button type="button" class="btn btn-primary btn-sm" data-stdc-act="reply-save">Сохранить ответ</button>
        </div>
      </div>
    </div>`;
}

/* Перерисовать вкладку. row = стандарт или параметр; isNew — вкладка скрыта */
function renderStdComments(kind, row) {
  const t = STD_COMMENTS_TARGETS[kind];
  const wrap = $(t.wrap);
  stdCommentsState[kind] = row && row.id ? { id: row.id, line: row.line || '' } : null;
  const list = row && row.id ? getStdCommentsFor(kind, row.id) : [];
  const open = list.filter(c => c.status !== 'done').length;
  const badge = $(t.badge);
  if (badge) {
    badge.textContent = open || list.length;
    badge.classList.toggle('stdc-badge-new', open > 0);
  }
  if (!wrap) return;
  wrap.innerHTML = `
    <div class="stdc-form" data-stdc-kind="${kind}">
      <textarea class="stdc-input" rows="3" placeholder="Что не так со стандартом: неточная норма, непонятное описание, другое…"></textarea>
      <div class="stdc-form-btns">
        <button type="button" class="btn btn-primary btn-sm" data-stdc-act="add">Добавить комментарий</button>
      </div>
    </div>
    <div class="stdc-list" data-stdc-kind="${kind}">
      ${list.length
        ? list.map(stdCommentItemHtml).join('')
        : `<div class="sv-full-empty-table">
             <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
             <div>Комментариев пока нет</div>
           </div>`}
    </div>`;
}

function stdCommentsRefresh(kind) {
  const cur = stdCommentsState[kind];
  if (cur) renderStdComments(kind, cur);
}

document.addEventListener('click', e => {
  const btn = e.target.closest('[data-stdc-act]');
  if (!btn) return;
  const box = btn.closest('[data-stdc-kind]');
  const kind = box?.dataset.stdcKind;
  if (!kind || !stdCommentsState[kind]) return;
  const act = btn.dataset.stdcAct;
  const item = btn.closest('[data-stdc-id]');
  const id = item?.dataset.stdcId;

  if (act === 'add') {
    const input = box.querySelector('.stdc-input');
    const text = input ? input.value.trim() : '';
    if (!text) { showToast('Напишите комментарий', true); input?.focus(); return; }
    addStdComment(kind, stdCommentsState[kind], text);
    showToast('Комментарий добавлен');
    stdCommentsRefresh(kind);
    return;
  }
  if (!id) return;
  const form = item.querySelector('.stdc-reply-form');
  if (act === 'reply') {
    const c = getStdComments().find(x => x.id === id);
    form.style.display = '';
    const input = form.querySelector('.stdc-reply-input');
    input.value = c?.reply || '';
    input.focus();
  } else if (act === 'reply-cancel') {
    form.style.display = 'none';
  } else if (act === 'reply-save') {
    updateStdComment(id, { reply: form.querySelector('.stdc-reply-input').value.trim() });
    stdCommentsRefresh(kind);
  } else if (act === 'done') {
    updateStdComment(id, { status: 'done', doneAt: new Date().toISOString() });
    stdCommentsRefresh(kind);
  } else if (act === 'reopen') {
    updateStdComment(id, { status: 'new', doneAt: null });
    stdCommentsRefresh(kind);
  } else if (act === 'delete') {
    if (!confirm('Удалить комментарий?')) return;
    removeStdComment(id);
    stdCommentsRefresh(kind);
  }
});
