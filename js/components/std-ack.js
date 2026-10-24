/* ============================================================ */
/* === КОМПОНЕНТЫ: вкладка «Ознакомление» стандарта / E-Param = */
/* ============================================================ */
/* Что изменилось → сколько смен ещё действует ознакомление →
   кто ознакомился. Кто — заглушка до автологина. */

const STD_ACK_TARGETS = {
  mech: { wrap: '#svAckTableWrap', badge: '#svAckBadge', btn: '#svAckMarkBtn' },
  elec: { wrap: '#epAckTableWrap', badge: '#epAckBadge', btn: '#epAckMarkBtn' }
};

/* Открытый стандарт / параметр и его текущее изменение */
const stdAckState = { mech: null, elec: null };

function stdAckWhen(iso) {
  const d = iso ? new Date(iso) : null;
  if (!d) return '';
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getDate())}.${p(d.getMonth() + 1)}, ${p(d.getHours())}:${p(d.getMinutes())}`;
}

function renderStdAck(kind, row) {
  const t = STD_ACK_TARGETS[kind];
  const wrap = $(t.wrap);
  const change = row && row.id ? getStdAckChange(kind, row.id) : null;
  stdAckState[kind] = row && row.id ? { id: row.id, change } : null;
  const left = change ? stdAckShiftsLeft(change) : 0;
  const acks = change ? getStdAcksFor(change.id) : [];

  const badge = $(t.badge);
  if (badge) {
    badge.textContent = 'Новое';
    badge.style.display = change && left > 0 ? 'inline-flex' : 'none';
  }
  const btn = $(t.btn);
  if (btn) btn.style.display = change ? '' : 'none';
  if (!wrap) return;

  if (!change) {
    wrap.innerHTML = `
      <div class="sv-full-empty-table">
        <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        <div>${kind === 'elec' ? 'Параметр' : 'Стандарт'} не менялся — знакомиться не с чем</div>
      </div>`;
    return;
  }

  const used = STD_ACK_WINDOW_SHIFTS - left;
  const pct = Math.min(100, Math.round(used / STD_ACK_WINDOW_SHIFTS * 100));
  const period = left > 0
    ? `Ознакомиться — ещё <b>${left}</b> ${pluralRu(left, 'смена', 'смены', 'смен')} из ${STD_ACK_WINDOW_SHIFTS}`
    : `Срок ознакомления (${STD_ACK_WINDOW_SHIFTS} смен) прошёл`;

  const rows = acks.map(a => {
    const night = a.shiftType === 'night';
    return `
      <tr>
        <td><span class="stda-who">Оператор</span><span class="stda-who-note">ФИО появится после автологина</span></td>
        <td>${escapeHtml(stdAckWhen(a.at))}</td>
        <td><span class="stdc-sh ${night ? 'n' : 'd'}">${escapeHtml(a.shiftLetter || '?')}</span> ${night ? 'ночь' : 'день'}</td>
      </tr>`;
  }).join('');

  wrap.innerHTML = `
    <div class="stda-change">
      <div class="stda-head">Что изменилось</div>
      ${changeHistoryHtml([change])}
    </div>
    <div class="stda-window${left > 0 ? '' : ' is-over'}">
      <div class="stda-window-text">${period}</div>
      <div class="stda-bar"><span style="width:${pct}%"></span></div>
    </div>
    <div class="stda-head">Ознакомились <span class="stda-count">${acks.length}</span></div>
    ${acks.length
      ? `<table class="stdc-table stda-table">
           <thead><tr><th>Кто</th><th>Когда</th><th>Смена</th></tr></thead>
           <tbody>${rows}</tbody>
         </table>`
      : `<div class="stda-empty">Пока никто не отметил ознакомление</div>`}`;
}

function markStdAck(kind) {
  const st = stdAckState[kind];
  if (!st || !st.change) return;
  addStdAck(kind, st.id, st.change);
  showToast('Ознакомление отмечено');
  renderStdAck(kind, { id: st.id });
}
