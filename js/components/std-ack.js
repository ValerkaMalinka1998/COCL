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
  if (typeof updateNotifyBadge === 'function') updateNotifyBadge();
});

/* === ДОПУСК К ПРОВЕРКЕ: CL при переходах, TOP Losses ===
   items: [{ kind: 'mech'|'elec', row }]. Все ознакомлены — сразу onStart(); иначе окно со списком. */
const ackGateState = { items: [], onStart: null, cur: 0 };

function stdAckGate(items, onStart) {
  // С E-Param не знакомятся — только механические стандарты
  const need = items.filter(x => x.kind === 'mech' && getStdAckStatus(x.kind, x.row.id).state !== 'ok');
  if (!need.length) return onStart();
  ackGateState.items = need;
  ackGateState.onStart = onStart;
  ackGateState.cur = 0;
  renderAckGate();
  openModal('#ackGateModal');
}

/* Слева список стандартов и прогресс, справа выбранный стандарт целиком */
function renderAckGate() {
  const { items, cur } = ackGateState;
  const stat = items.map(it => getStdAckStatus(it.kind, it.row.id));
  const done = stat.filter(s => s.state === 'ok').length;
  const left = items.length - done;

  $('#ackGateProgText').textContent = `Ознакомлено ${done} из ${items.length}`;
  $('#ackGateBar').style.width = `${done / items.length * 100}%`;
  $('#ackGateLeft').textContent = left ? `Осталось: ${left}` : 'Всё прочитано';
  $('#ackGateStart').disabled = left > 0;

  $('#ackGateList').innerHTML = items.map(({ row }, i) => {
    const s = stat[i];
    const tag = s.state === 'ok' ? ''
      : `<span class="ack-gate-tag ${s.state === 'again' ? 'chg' : 'new'}">${s.state === 'again' ? 'Изменён' : 'Новый'}</span>`;
    return `<button type="button" class="ack-gate-it${i === cur ? ' on' : ''}${s.state === 'ok' ? ' is-ok' : ''}${s.state === 'again' ? ' is-chg' : ''}" data-ack-gate-pick="${i}">
      <span class="ack-gate-st">${s.state === 'ok' ? stdAckIcon(STD_ACK_ICONS.ok, 12, 3) : ''}</span>
      <span class="ack-gate-it-body">
        <span class="ack-gate-it-name">${escapeHtml(row.title || '—')}</span>
        <span class="ack-gate-it-meta">${row.oplNumber ? `<span class="ack-gate-opl">OPL ${escapeHtml(row.oplNumber)}</span>` : ''}${tag}<span class="ack-gate-m">${escapeHtml([row.machine, row.nodePart].filter(Boolean).join(' · '))}</span></span>
      </span>
    </button>`;
  }).join('');

  renderAckGatePane(stat[cur]);
}

function renderAckGatePane(s) {
  const pane = $('#ackGatePane');
  const row = ackGateState.items[ackGateState.cur].row;
  const st = getStandards().find(x => x.id === row.id) || row;
  const brand = typeof getElectronicBrandForDate === 'function'
    ? (getElectronicBrandForDate(st.line, getCurrentShiftPeriod().date) || '') : '';
  const more = ackGateState.items.some((it, i) => i !== ackGateState.cur && getStdAckStatus(it.kind, it.row.id).state !== 'ok');

  pane.innerHTML = `
    <div class="ack-gate-scroll">
      <h4 class="ack-gate-title">${escapeHtml(st.title || '—')}</h4>
      ${s.state === 'again' ? `<div class="ack-gate-changes"><h5>Стандарт изменён с вашей редакции</h5>${stdAckChangesHtml(s.since)}</div>` : ''}
      ${renderStandardViewContent(st, brand)}
    </div>
    <div class="ack-gate-actions">
      ${s.state === 'ok'
        ? `<span class="ack-gate-done">${stdAckIcon(STD_ACK_ICONS.ok, 16, 3)}Вы ознакомлены</span>`
        : `<button type="button" class="btn btn-primary" data-ack-gate-mark="1">${more ? 'Ознакомлен, следующий →' : 'Ознакомлен'}</button>`}
    </div>`;
  bindPhotoSlider(pane, st);
}

document.addEventListener('click', e => {
  if (e.target.closest('#ackGateClose') || e.target.closest('#ackGateCancel')) { closeModal('#ackGateModal'); return; }
  const pick = e.target.closest('[data-ack-gate-pick]');
  if (pick) { ackGateState.cur = +pick.dataset.ackGatePick; renderAckGate(); return; }
  if (e.target.closest('[data-ack-gate-mark]')) {
    const { items, cur } = ackGateState;
    addStdAck(items[cur].kind, items[cur].row.id);
    if (typeof updateNotifyBadge === 'function') updateNotifyBadge();
    // Дальше — к следующему неознакомленному; если все готовы, остаёмся
    for (let k = 1; k <= items.length; k++) {
      const j = (cur + k) % items.length;
      if (getStdAckStatus(items[j].kind, items[j].row.id).state !== 'ok') { ackGateState.cur = j; break; }
    }
    renderAckGate();
    return;
  }
  if (e.target.closest('#ackGateStart') && !$('#ackGateStart').disabled) {
    const go = ackGateState.onStart;
    closeModal('#ackGateModal');
    ackGateState.onStart = null;
    if (go) go();
  }
});
