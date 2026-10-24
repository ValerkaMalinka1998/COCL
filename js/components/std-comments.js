/* ============================================================ */
/* === КОМПОНЕНТЫ: вкладка «Комментарии» стандарта / E-Param == */
/* ============================================================ */
/* Одна разметка для страницы стандарта (kind 'mech') и страницы
   E-Param (kind 'elec'). Сверху — причина кнопкой + обязательный текст,
   ниже — таблица замечаний с иконкой причины слева.
   Обработчики — делегированием на document. */

const STD_COMMENTS_TARGETS = {
  mech: { wrap: '#svCommentsTableWrap', badge: '#svCommentsCount' },
  elec: { wrap: '#epCommentsTableWrap', badge: '#epCommentsCount' }
};

/* Причины замечания: ключ хранится в записи, tone — цвет иконки */
const STD_COMMENT_REASONS = [
  { key: 'norm',  label: 'Норма не та',              tone: 'red',
    icon: '<path d="M3 12h4l3 8 4-16 3 8h4"/>' },
  { key: 'how',   label: 'Непонятно, как проверять', tone: 'amber',
    icon: '<circle cx="12" cy="12" r="10"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>' },
  { key: 'desc',  label: 'Некорректное описание',    tone: 'cyan',
    icon: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>' },
  { key: 'photo', label: 'Фото устарело',            tone: 'purple',
    icon: '<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>' },
  { key: 'other', label: 'Другое',                   tone: 'grey',
    icon: '<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>' }
];

function stdReason(key) {
  return STD_COMMENT_REASONS.find(r => r.key === key) || STD_COMMENT_REASONS[STD_COMMENT_REASONS.length - 1];
}

/* Текущий открытый стандарт / параметр и выбранная причина — ставит renderStdComments */
const stdCommentsState = { mech: null, elec: null };

function stdcSvg(paths, size = 20) {
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;
}

function stdCommentWhen(c) {
  const d = c.createdAt ? new Date(c.createdAt) : null;
  const time = d ? `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}` : '';
  return `${fmtShortDate(c.shiftDate)}, ${time}`;
}

function stdCommentRowHtml(c) {
  const done = c.status === 'done';
  const r = stdReason(c.reason);
  const night = c.shiftType === 'night';
  const reply = c.reply
    ? `<div class="stdc-reply"><b>Аналитик:</b> ${escapeHtml(c.reply)}</div>`
    : '';
  const actions = done
    ? `<button type="button" class="stdc-btn" data-stdc-act="reopen">Вернуть</button>`
    : `<button type="button" class="stdc-btn" data-stdc-act="reply">${c.reply ? 'Изменить ответ' : 'Ответить'}</button>
       <button type="button" class="stdc-btn stdc-btn-ok" data-stdc-act="done">Рассмотрено</button>`;
  return `
    <tr class="stdc-row${done ? ' is-done' : ''}" data-stdc-id="${escapeAttr(c.id)}">
      <td class="stdc-c-ic"><span class="stdc-ic tone-${r.tone}" title="${escapeAttr(r.label)}">${stdcSvg(r.icon, 20)}</span></td>
      <td class="stdc-c-main">
        <div class="stdc-reason">${escapeHtml(r.label)}</div>
        <div class="stdc-text">${escapeHtml(c.text)}</div>
        ${reply}
        <div class="stdc-reply-form" style="display:none">
          <textarea class="stdc-reply-input" rows="2" placeholder="Ответ оператору"></textarea>
          <div class="stdc-form-btns">
            <button type="button" class="stdc-btn" data-stdc-act="reply-cancel">Отмена</button>
            <button type="button" class="stdc-btn stdc-btn-primary" data-stdc-act="reply-save">Сохранить ответ</button>
          </div>
        </div>
      </td>
      <td class="stdc-c-shift">
        <span class="stdc-sh ${night ? 'n' : 'd'}">${escapeHtml(c.shiftLetter || '?')}</span>
        <span class="stdc-when">${night ? 'ночь' : 'день'}<br>${stdCommentWhen(c)}</span>
      </td>
      <td class="stdc-c-status"><span class="stdc-status ${done ? 'done' : 'new'}">${done ? 'Рассмотрено' : 'Новое'}</span></td>
      <td class="stdc-c-act">
        <div class="stdc-acts">
          ${actions}
          <button type="button" class="stdc-btn stdc-btn-del" data-stdc-act="delete" title="Удалить">${stdcSvg('<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>', 14)}</button>
        </div>
      </td>
    </tr>`;
}

/* Перерисовать вкладку. row = стандарт или параметр; null — новый (вкладка скрыта) */
function renderStdComments(kind, row) {
  const t = STD_COMMENTS_TARGETS[kind];
  const wrap = $(t.wrap);
  stdCommentsState[kind] = row && row.id ? { id: row.id, line: row.line || '', reason: '' } : null;
  const list = row && row.id ? getStdCommentsFor(kind, row.id) : [];
  // Нерассмотренные сверху; внутри групп порядок getStdCommentsFor — новые по дате первыми
  list.sort((a, b) => (a.status === 'done') - (b.status === 'done'));
  const open = list.filter(c => c.status !== 'done').length;
  const badge = $(t.badge);
  if (badge) {
    badge.textContent = open || list.length;
    badge.classList.toggle('stdc-badge-new', open > 0);
  }
  if (!wrap) return;
  wrap.innerHTML = `
    <div class="stdc-form" data-stdc-kind="${kind}">
      <div class="stdc-q">Что не так со стандартом?</div>
      <div class="stdc-reasons">
        ${STD_COMMENT_REASONS.map(r => `
          <button type="button" class="stdc-reason-btn tone-${r.tone}" data-stdc-reason="${r.key}">
            ${stdcSvg(r.icon, 22)}<span>${r.label}</span>
          </button>`).join('')}
      </div>
      <div class="stdc-new">
        <textarea class="stdc-input" rows="2" placeholder="Опишите, что именно не так: какая точка, какое значение, что видите на машине"></textarea>
        <button type="button" class="stdc-btn stdc-btn-primary stdc-send" data-stdc-act="add">Отправить</button>
      </div>
    </div>
    <div class="stdc-list" data-stdc-kind="${kind}">
      ${list.length
        ? `<table class="stdc-table">
             <thead><tr><th></th><th>Замечание</th><th>Смена</th><th>Статус</th><th></th></tr></thead>
             <tbody>${list.map(stdCommentRowHtml).join('')}</tbody>
           </table>`
        : `<div class="sv-full-empty-table">
             ${stdcSvg('<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>', 40)}
             <div>Замечаний пока нет</div>
           </div>`}
    </div>`;
}

function stdCommentsRefresh(kind) {
  const cur = stdCommentsState[kind];
  if (cur) renderStdComments(kind, cur);
  if (typeof updateNotifyBadge === 'function') updateNotifyBadge();
}

document.addEventListener('click', e => {
  // Выбор причины
  const rb = e.target.closest('[data-stdc-reason]');
  if (rb) {
    const form = rb.closest('[data-stdc-kind]');
    const kind = form?.dataset.stdcKind;
    if (!kind || !stdCommentsState[kind]) return;
    stdCommentsState[kind].reason = rb.dataset.stdcReason;
    form.querySelectorAll('[data-stdc-reason]').forEach(b => b.classList.toggle('on', b === rb));
    form.querySelector('.stdc-input')?.focus();
    return;
  }

  const btn = e.target.closest('[data-stdc-act]');
  if (!btn) return;
  const box = btn.closest('[data-stdc-kind]');
  const kind = box?.dataset.stdcKind;
  if (!kind || !stdCommentsState[kind]) return;
  const act = btn.dataset.stdcAct;
  const item = btn.closest('[data-stdc-id]');
  const id = item?.dataset.stdcId;

  if (act === 'add') {
    const state = stdCommentsState[kind];
    const input = box.querySelector('.stdc-input');
    const text = input ? input.value.trim() : '';
    if (!state.reason) { showToast('Выберите, что не так со стандартом', true); return; }
    if (!text) { showToast('Опишите замечание — без текста аналитик не поймёт причину', true); input?.focus(); return; }
    addStdComment(kind, state, text, state.reason);
    showToast('Замечание отправлено');
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
    const reply = form.querySelector('.stdc-reply-input').value.trim();
    updateStdComment(id, { reply, repliedAt: reply ? new Date().toISOString() : null });
    stdCommentsRefresh(kind);
  } else if (act === 'done') {
    updateStdComment(id, { status: 'done', doneAt: new Date().toISOString() });
    stdCommentsRefresh(kind);
  } else if (act === 'reopen') {
    updateStdComment(id, { status: 'new', doneAt: null });
    stdCommentsRefresh(kind);
  } else if (act === 'delete') {
    if (!confirm('Удалить замечание?')) return;
    removeStdComment(id);
    stdCommentsRefresh(kind);
  }
});

/* Ctrl+Enter в поле — отправить замечание / ответ */
document.addEventListener('keydown', e => {
  if (e.key !== 'Enter' || !(e.ctrlKey || e.metaKey)) return;
  const field = e.target.closest?.('.stdc-input, .stdc-reply-input');
  if (!field) return;
  e.preventDefault();
  const scope = field.closest('.stdc-new, .stdc-reply-form');
  scope?.querySelector('[data-stdc-act="add"], [data-stdc-act="reply-save"]')?.click();
});
