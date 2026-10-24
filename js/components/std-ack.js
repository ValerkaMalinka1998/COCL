/* ============================================================ */
/* === КОМПОНЕНТЫ: вкладка «Ознакомление» стандарта / E-Param = */
/* ============================================================ */
/* Сверху плашка-статус: синяя «Ознакомьтесь», оранжевая «Изменён —
   ознакомьтесь повторно» (что изменилось), зелёная «Вы ознакомлены».
   Ниже — кто ознакомился и с какой редакцией (ФИО — после автологина). */

const STD_ACK_TARGETS = {
  mech: { wrap: '#svAckTableWrap', badge: '#svAckBadge' },
  elec: { wrap: '#epAckTableWrap', badge: '#epAckBadge' }
};

/* Открытый стандарт / параметр */
const stdAckState = { mech: null, elec: null };

function stdAckWhen(iso) {
  const d = iso ? new Date(iso) : null;
  if (!d) return '';
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getDate())}.${p(d.getMonth() + 1)}, ${p(d.getHours())}:${p(d.getMinutes())}`;
}

function stdAckIcon(paths, size = 24, sw = 2) {
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;
}
const STD_ACK_ICONS = {
  book: '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>',
  again: '<polyline points="23 4 23 10 17 10"/><path d="M20.5 15a9 9 0 1 1-2.1-9.4L23 10"/>',
  ok: '<polyline points="20 6 9 17 4 12"/>'
};

/* Что изменилось: строки details существенных изменений, без мелочей */
function stdAckChangesHtml(list) {
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const items = [];
  list.forEach(e => {
    const det = (Array.isArray(e.details) ? e.details : []).filter(d => !STD_ACK_MINOR_LABELS.includes(d.label));
    if (!det.length && e.comment) items.push(`<li>${escapeHtml(e.comment)}</li>`);
    det.forEach(d => {
      const label = escapeHtml(cap(String(d.label || '')));
      if (d.label === 'фото') { items.push(`<li>${label}: изменено</li>`); return; }
      if (d.from == null && d.to == null) { items.push(`<li>${label}</li>`); return; }
      const from = d.from && d.from !== '—' ? `<s>${escapeHtml(d.from)}</s> → ` : '';
      items.push(`<li>${label}: ${from}<b>${escapeHtml(d.to || '—')}</b></li>`);
    });
  });
  return items.length ? `<ul class="stda-list">${items.join('')}</ul>` : '';
}

function stdAckPlateHtml(s, kind) {
  const what = kind === 'elec' ? 'параметром' : 'стандартом';
  const btn = (label) => `<button type="button" class="stda-btn" data-stda-mark="${kind}">${stdAckIcon(STD_ACK_ICONS.book, 18)}<span>${label}</span></button>`;
  if (s.state === 'need') {
    return `
      <div class="stda-plate need">
        <div class="stda-ic">${stdAckIcon(STD_ACK_ICONS.book)}</div>
        <div class="stda-body"><h4>Ознакомьтесь со ${what}</h4><p>Прочитайте описание, точки контроля и фото, затем нажмите «Ознакомиться»</p></div>
        ${btn('Ознакомиться')}
      </div>`;
  }
  if (s.state === 'again') {
    const when = s.lastDate ? ` · ${stdAckWhen(s.lastDate).split(',')[0]}` : '';
    return `
      <div class="stda-plate again">
        <div class="stda-ic">${stdAckIcon(STD_ACK_ICONS.again)}</div>
        <div class="stda-body"><h4>${kind === 'elec' ? 'Параметр изменён' : 'Стандарт изменён'} — ознакомьтесь повторно${when}</h4>
          <p>Вы знакомились с редакцией ${s.mine.edition || 1}, сейчас — редакция ${s.edition}. Что изменилось:</p>
          ${stdAckChangesHtml(s.since)}</div>
        ${btn('Ознакомиться')}
      </div>`;
  }
  const m = s.mine;
  const night = m.shiftType === 'night';
  return `
    <div class="stda-plate ok">
      <div class="stda-ic">${stdAckIcon(STD_ACK_ICONS.ok, 24, 2.5)}</div>
      <div class="stda-body"><h4>Вы ознакомлены со ${what}</h4>
        <p>${escapeHtml(stdAckWhen(m.at))} · смена ${escapeHtml(m.shiftLetter || '?')}, ${night ? 'ночь' : 'день'} · редакция ${m.edition || 1}</p></div>
    </div>`;
}

function renderStdAck(kind, row) {
  const t = STD_ACK_TARGETS[kind];
  const wrap = $(t.wrap);
  stdAckState[kind] = row && row.id ? { id: row.id } : null;
  const s = row && row.id ? getStdAckStatus(kind, row.id) : null;

  const badge = $(t.badge);
  if (badge) {
    badge.textContent = s && s.state === 'again' ? 'Изменён' : 'Новое';
    badge.style.display = s && s.state !== 'ok' ? 'inline-flex' : 'none';
  }
  if (!wrap || !s) { if (wrap) wrap.innerHTML = ''; return; }

  // Одна строка на человека: его последнее ознакомление. Пока нет автологина,
  // who = '—' у всех — это один «Оператор» этого компьютера.
  const people = [];
  const seen = new Set();
  s.acks.forEach(a => {                       // s.acks — новые сверху
    const who = a.who || '—';
    if (seen.has(who)) return;
    seen.add(who);
    people.push(a);
  });
  // Кому нужно повторно — сверху
  people.sort((x, y) => ((x.edition || 1) >= s.edition) - ((y.edition || 1) >= s.edition));

  const rows = people.map(a => {
    const night = a.shiftType === 'night';
    const cur = (a.edition || 1) >= s.edition;
    const name = a.who && a.who !== '—'
      ? `<span class="stda-who">${escapeHtml(a.who)}</span>`
      : '<span class="stda-who">Оператор</span><span class="stda-who-note">ФИО — после автологина</span>';
    return `
      <tr class="${cur ? '' : 'is-old'}">
        <td>${name}</td>
        <td>${escapeHtml(stdAckWhen(a.at))}</td>
        <td><span class="stdc-sh ${night ? 'n' : 'd'}">${escapeHtml(a.shiftLetter || '?')}</span> ${night ? 'ночь' : 'день'}</td>
        <td><span class="stda-ed${cur ? '' : ' old'}">ред. ${a.edition || 1}${cur ? ' · актуальная' : ' · нужно повторно'}</span></td>
      </tr>`;
  }).join('');

  wrap.innerHTML = `
    ${stdAckPlateHtml(s, kind)}
    <div class="stda-head">Ознакомились
      <span class="stda-edition">Текущая редакция: ${s.edition}</span></div>
    ${people.length
      ? `<table class="stdc-table stda-table">
           <thead><tr><th>Кто</th><th>Когда</th><th>Смена</th><th>Редакция</th></tr></thead>
           <tbody>${rows}</tbody>
         </table>`
      : `<div class="stda-empty">Пока никто не ознакомился</div>`}`;
}

document.addEventListener('click', e => {
  const b = e.target.closest('[data-stda-mark]');
  if (!b) return;
  const kind = b.dataset.stdaMark;
  const st = stdAckState[kind];
  if (!st) return;
  addStdAck(kind, st.id);
  showToast('Вы ознакомлены');
  renderStdAck(kind, { id: st.id });
});
