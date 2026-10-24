/* ============================================================ */
/* === КОМПОНЕНТЫ: колокольчик уведомлений в шапке ============ */
/* ============================================================ */
/* События не хранятся отдельно — собираются из того, что уже есть:
   лист изменений (изменён / новый стандарт), замечания и ответы,
   валидация (осталось ≤ 2 смен). Хранится только «прочитано»
   (cl_notify_read — у этого компьютера, в бэкап не идёт).
   Пока нет автологина и сервера — видны события этого компьютера;
   фильтр по подразделению аналитика — после автологина (ROADMAP [10]). */

const NOTIFY_DAYS = 7;
const NOTIFY_READ_KEY = 'cl_notify_read';
const notifyState = { open: false, filter: 'all' };

const NOTIFY_KINDS = {
  chg: { group: 'std', icon: '<polyline points="23 4 23 10 17 10"/><path d="M20.5 15a9 9 0 1 1-2.1-9.4L23 10"/>' },
  new: { group: 'std', icon: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>' },
  cmt: { group: 'cmt', icon: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>' },
  rep: { group: 'cmt', icon: '<polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 0 0-4-4H4"/>' },
  val: { group: 'val', icon: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>' }
};
const NOTIFY_FILTERS = [
  { key: 'all', label: 'Все' }, { key: 'std', label: 'Стандарты' },
  { key: 'cmt', label: 'Замечания' }, { key: 'val', label: 'Валидация' }
];

function getNotifyRead() {
  try { const v = JSON.parse(localStorage.getItem(NOTIFY_READ_KEY) || '[]'); return new Set(Array.isArray(v) ? v : []); }
  catch (e) { return new Set(); }
}
function setNotifyRead(set) {
  // храним только последние 500 отметок — старые события и так уходят из ленты
  try { localStorage.setItem(NOTIFY_READ_KEY, JSON.stringify([...set].slice(-500))); } catch (e) { /* хранилище недоступно */ }
}

/* Объект (стандарт / параметр) по виду и id */
function notifyRef(kind, id) {
  return kind === 'elec'
    ? getElectronicParams().find(p => p.id === id)
    : getStandards().find(s => s.id === id);
}
function notifyRefTitle(kind, row, fallback) {
  return (row && (row.title || row.paramName)) || fallback || '—';
}
function notifyRefMeta(row) {
  if (!row) return '';
  return [row.line, row.machine, row.oplNumber].filter(Boolean).join(' · ');
}

/* Все события за NOTIFY_DAYS дней, новые сверху */
function collectNotifications() {
  const since = Date.now() - NOTIFY_DAYS * 864e5;
  const fresh = (iso) => iso && new Date(iso).getTime() >= since;
  const out = [];

  getChangeLog().forEach(e => {
    if (!fresh(e.date) || !e.refId) return;
    const kind = e.kind || 'mech';
    const row = notifyRef(kind, e.refId);
    if (!row) return;
    const name = escapeHtml(notifyRefTitle(kind, row, e.title));
    if (e.action === 'added') {
      out.push({ id: 'new:' + e.id, type: 'new', at: e.date, kind, refId: e.refId, tab: 'main',
        html: `<b>${kind === 'elec' ? 'Новый параметр' : 'Новый стандарт'}</b> «${name}»`, meta: notifyRefMeta(row) });
    } else if (stdAckIsMajor(e)) {
      out.push({ id: 'chg:' + e.id, type: 'chg', at: e.date, kind, refId: e.refId, tab: 'ack',
        html: `<b>${kind === 'elec' ? 'Изменён параметр' : 'Изменён стандарт'}</b> «${name}» — ознакомьтесь`, meta: notifyRefMeta(row) });
    }
  });

  getStdComments().forEach(c => {
    const row = notifyRef(c.kind, c.refId);
    if (!row) return;
    const name = escapeHtml(notifyRefTitle(c.kind, row));
    const reason = typeof stdReason === 'function' ? stdReason(c.reason).label : '';
    if (fresh(c.createdAt)) {
      const night = c.shiftType === 'night';
      out.push({ id: 'cmt:' + c.id, type: 'cmt', at: c.createdAt, kind: c.kind, refId: c.refId, tab: 'comments',
        html: `<b>Новое замечание</b> к «${name}»${reason ? ': ' + escapeHtml(reason) : ''}`, quote: c.text,
        meta: [row.line, `смена ${c.shiftLetter || '?'}, ${night ? 'ночь' : 'день'}`].filter(Boolean).join(' · ') });
    }
    if (c.reply && fresh(c.repliedAt)) {
      out.push({ id: 'rep:' + c.id + ':' + c.repliedAt, type: 'rep', at: c.repliedAt, kind: c.kind, refId: c.refId, tab: 'comments',
        html: `<b>Аналитик ответил</b> на замечание к «${name}»`, quote: c.reply, meta: notifyRefMeta(row) });
    }
  });

  const now = new Date().toISOString();
  const valRows = [
    ...getStandards().map(r => ['mech', r]),
    ...getElectronicParams().map(r => ['elec', r])
  ];
  valRows.forEach(([kind, row]) => {
    if (!isOnValidation(row)) return;
    const left = validationShiftsLeft(row);
    if (left > 2) return;
    const v = row.validation || {};
    out.push({ id: `val:${row.id}:${v.until}:${v.untilShift || ''}`, type: 'val', at: now, kind, refId: row.id, tab: 'main',
      html: `<b>Валидация заканчивается</b>: «${escapeHtml(notifyRefTitle(kind, row))}» — осталось ${left} ${pluralRu(left, 'смена', 'смены', 'смен')}`,
      meta: [notifyRefMeta(row), 'решение: утвердить или продлить'].filter(Boolean).join(' · ') });
  });

  return out.sort((a, b) => String(b.at).localeCompare(String(a.at)));
}

function notifyDayLabel(iso) {
  const d = todayISO(new Date(iso));
  const today = todayISO();
  if (d === today) return 'Сегодня';
  if (d === addDaysISO(today, -1)) return 'Вчера';
  return fmtShortDate(d);
}
function notifyTime(iso) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/* Счётчик на колокольчике */
function updateNotifyBadge(list) {
  const items = list || collectNotifications();
  const read = getNotifyRead();
  const n = items.filter(i => !read.has(i.id)).length;
  const cnt = $('#notifyCount');
  if (cnt) {
    cnt.textContent = n > 99 ? '99+' : String(n);
    cnt.style.display = n ? '' : 'none';
  }
  const btn = $('#notifyBtn');
  if (btn) btn.setAttribute('aria-label', n ? `Уведомления: ${n} новых` : 'Уведомления');
}

function renderNotifyPanel() {
  const pop = $('#notifyPanel');
  if (!pop) return;
  const all = collectNotifications();
  const read = getNotifyRead();
  updateNotifyBadge(all);
  const count = (g) => all.filter(i => g === 'all' || NOTIFY_KINDS[i.type].group === g).length;
  const list = all.filter(i => notifyState.filter === 'all' || NOTIFY_KINDS[i.type].group === notifyState.filter);

  let body = '';
  let day = '';
  list.forEach(i => {
    const label = notifyDayLabel(i.at);
    if (label !== day) { day = label; body += `<div class="nb-sec">${escapeHtml(label)}</div>`; }
    const isRead = read.has(i.id);
    body += `
      <button type="button" class="nb-it${isRead ? ' read' : ''}" data-nb-id="${escapeAttr(i.id)}">
        <span class="nb-ic nb-ic-${i.type}"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${NOTIFY_KINDS[i.type].icon}</svg></span>
        <span class="nb-txt">
          <span class="nb-t">${i.html}</span>
          ${i.quote ? `<span class="nb-q">«${escapeHtml(i.quote)}»</span>` : ''}
          <span class="nb-m">${escapeHtml([i.meta, i.type === 'val' ? '' : notifyTime(i.at)].filter(Boolean).join(' · '))}</span>
        </span>
        <span class="nb-dot"></span>
      </button>`;
  });

  pop.innerHTML = `
    <div class="nb-head"><h3>Уведомления</h3>
      ${all.some(i => !read.has(i.id)) ? '<button type="button" class="nb-all" data-nb-readall>Прочитать все</button>' : ''}</div>
    <div class="nb-tabs">
      ${NOTIFY_FILTERS.map(f => `<button type="button" class="${notifyState.filter === f.key ? 'on' : ''}" data-nb-filter="${f.key}">${f.label} ${count(f.key)}</button>`).join('')}
    </div>
    <div class="nb-body">
      ${body || `<div class="nb-empty">За ${NOTIFY_DAYS} дней событий нет</div>`}
    </div>
    <div class="nb-foot">События за ${NOTIFY_DAYS} дней</div>`;
}

function openNotifyPanel() {
  notifyState.open = true;
  $('#notifyPanel')?.classList.add('open');
  $('#notifyBtn')?.setAttribute('aria-expanded', 'true');
  renderNotifyPanel();
}
function closeNotifyPanel() {
  notifyState.open = false;
  $('#notifyPanel')?.classList.remove('open');
  $('#notifyBtn')?.setAttribute('aria-expanded', 'false');
}

/* Переход к объекту уведомления: страница стандарта / параметра на нужной вкладке */
function openNotifyTarget(item) {
  closeNotifyPanel();
  if (item.kind === 'elec') {
    if (!getElectronicParams().some(p => p.id === item.refId)) return showToast('Параметр не найден', true);
    openEparamPage(item.refId);
    if (item.tab !== 'main') switchEparamTab(item.tab);
  } else {
    if (!getStandards().some(s => s.id === item.refId)) return showToast('Стандарт не найден', true);
    openStandardFullView(item.refId, 'view');
    if (item.tab !== 'main') switchSvFullTab(item.tab);
  }
}

document.addEventListener('click', e => {
  if (e.target.closest('#notifyBtn')) {
    notifyState.open ? closeNotifyPanel() : openNotifyPanel();
    return;
  }
  const pop = e.target.closest('#notifyPanel');
  if (!pop) { if (notifyState.open) closeNotifyPanel(); return; }

  const f = e.target.closest('[data-nb-filter]');
  if (f) { notifyState.filter = f.dataset.nbFilter; renderNotifyPanel(); return; }
  if (e.target.closest('[data-nb-readall]')) {
    const read = getNotifyRead();
    collectNotifications().forEach(i => read.add(i.id));
    setNotifyRead(read);
    renderNotifyPanel();
    return;
  }
  const it = e.target.closest('[data-nb-id]');
  if (it) {
    const item = collectNotifications().find(i => i.id === it.dataset.nbId);
    const read = getNotifyRead();
    read.add(it.dataset.nbId);
    setNotifyRead(read);
    updateNotifyBadge();
    if (item) openNotifyTarget(item);
  }
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && notifyState.open) closeNotifyPanel();
});

/* Счётчик обновляется при каждой смене вкладки (там, где что-то могло измениться) */
window.addEventListener('hashchange', () => updateNotifyBadge());
