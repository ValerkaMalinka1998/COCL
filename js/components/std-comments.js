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
  const shift = c.shiftType === 'night' ? 'ночь' : 'день';   // буква смены — в подписи «Смена X»
  return `${fmtShortDate(c.shiftDate)} · ${shift} · ${time}`;
}

/* SVG-иконка 16×16 по имени */
function stdcIcon(name, size = 16) {
  const paths = {
    reply: '<polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 0 0-4-4H4"/>',
    done: '<polyline points="20 6 9 17 4 12"/>',
    reopen: '<polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>',
    delete: '<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>',
    send: '<line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>'
  };
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${paths[name]}</svg>`;
}

function stdCommentItemHtml(c) {
  const done = c.status === 'done';
  const letter = escapeHtml(c.shiftLetter || '?');
  const reply = c.reply
    ? `<div class="stdc-reply">
         <div class="stdc-avatar stdc-avatar-an">А</div>
         <div class="stdc-bubble stdc-bubble-an">
           <div class="stdc-meta"><b>Аналитик</b></div>
           <div class="stdc-text">${escapeHtml(c.reply)}</div>
         </div>
       </div>`
    : '';
  const act = (name, title, extra = '') =>
    `<button type="button" class="stdc-act stdc-act-${name}${extra}" data-stdc-act="${name}" title="${title}">${stdcIcon(name, 15)}<span>${title}</span></button>`;
  return `
    <div class="stdc-item${done ? ' is-done' : ''}" data-stdc-id="${escapeAttr(c.id)}">
      <div class="stdc-msg">
        <div class="stdc-avatar">${letter}</div>
        <div class="stdc-bubble">
          <div class="stdc-meta">
            <b>Смена ${letter}</b>
            <span class="stdc-when">${stdCommentWhen(c)}</span>
            <span class="stdc-status ${done ? 'done' : 'new'}">${done ? stdcIcon('done', 12) + 'Рассмотрено' : 'Новое'}</span>
          </div>
          <div class="stdc-text">${escapeHtml(c.text)}</div>
        </div>
      </div>
      ${reply}
      <div class="stdc-actions">
        ${done
          ? act('reopen', 'Вернуть в новые')
          : act('reply', c.reply ? 'Изменить ответ' : 'Ответить') + act('done', 'Рассмотрено')}
        ${act('delete', 'Удалить', ' stdc-act-icon')}
      </div>
      <div class="stdc-reply-form" style="display:none">
        <div class="stdc-composer stdc-composer-sm">
          <textarea class="stdc-reply-input" rows="1" placeholder="Ответ оператору…"></textarea>
          <button type="button" class="stdc-cancel" data-stdc-act="reply-cancel">Отмена</button>
          <button type="button" class="stdc-send" data-stdc-act="reply-save" title="Сохранить ответ">${stdcIcon('send')}</button>
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
      <div class="stdc-composer">
        <textarea class="stdc-input" rows="2" placeholder="Что не так со стандартом: неточная норма, непонятное описание…"></textarea>
        <button type="button" class="stdc-send" data-stdc-act="add" title="Добавить комментарий">${stdcIcon('send')}</button>
      </div>
      <div class="stdc-hint">Ctrl+Enter — отправить</div>
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

/* Ctrl+Enter в поле — отправить комментарий / ответ */
document.addEventListener('keydown', e => {
  if (e.key !== 'Enter' || !(e.ctrlKey || e.metaKey)) return;
  const field = e.target.closest?.('.stdc-input, .stdc-reply-input');
  if (!field) return;
  e.preventDefault();
  const btn = field.closest('.stdc-composer')?.querySelector('.stdc-send');
  btn?.click();
});
