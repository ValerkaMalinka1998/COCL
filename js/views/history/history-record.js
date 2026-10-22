/* ============================================================
   ИСТОРИЯ: страница проверки (вместо окна «Просмотр проверки»)
   openHistoryRecord(id) — одна запись истории;
   openHistoryShift(line, date, shift) — все проверки Чек-листа CL
   смены (механика + E-Param) и пропущенные пункты расписания.
   Модуль общего пространства имён: функции и переменные видны
   во всех файлах. Порядок подключения — index.html.
   ============================================================ */

const histPage = {
  kind: null,       // 'record' | 'shift'
  id: null,
  line: '', date: '', shift: '',
  from: 'history',  // вкладка, куда вернуться
  records: []
};

/* Перейти на вкладку «История» и показать подстраницу */
function histOpenSub(viewId, from) {
  const active = document.querySelector('.tab.active')?.id?.replace('tab-', '') || 'history';
  if (active === 'history' && !$('#histMainView')?.classList.contains('hist-hidden')) {
    histState.scrollY = window.scrollY;
  }
  histPage.from = from || active;
  if (active !== 'history' && typeof switchTab === 'function') switchTab('history');
  histShowView(viewId);
  window.scrollTo(0, 0);
}

function histBack() {
  const from = histPage.from;
  histPage.from = 'history';
  if (from && from !== 'history' && typeof switchTab === 'function') {
    switchTab(from);
    return;
  }
  renderHistory();
  window.scrollTo(0, histState.scrollY || 0);
}

function openHistoryRecord(id, opts = {}) {
  const h = getHistory().find(x => x.id === id);
  if (!h) return showToast('Запись не найдена', true);
  Object.assign(histPage, { kind: 'record', id, line: h.line, records: [h] });
  histOpenSub('histRecordView', opts.from);
  renderHistRecordPage();
}

function openHistoryShift(line, date, shift, opts = {}) {
  if (!line || !date) return;
  Object.assign(histPage, { kind: 'shift', id: null, line, date, shift });
  histOpenSub('histRecordView', opts.from);
  renderHistRecordPage();
}

/* Данные страницы: записи и пункты */
function histPageData() {
  if (histPage.kind === 'record') {
    const h = getHistory().find(x => x.id === histPage.id);
    if (!h) return null;
    return {
      records: [h],
      kind: histKind(h),
      title: histKindLabel(h),
      s: histShift(h),
      items: (h.items || []).map(it => ({ h, it }))
    };
  }
  // Смена Чек-листа CL
  const { line, date, shift } = histPage;
  const letter = getShiftsForDate(date)[shift];
  const records = getHistory().filter(h =>
    (h.mode === 'cl' || h.mode === 'electronic') && h.line === line && h.date === date && h.shift === letter);
  const items = [];
  const seen = new Set();
  records.forEach(h => (h.items || []).forEach(it => { items.push({ h, it }); seen.add(it.standardId); }));
  // Пункты расписания, которые не проверили
  const past = isShiftPast(date, shift);
  histClRows(line).forEach(({ row, isElec }) => {
    if (seen.has(row.id) || !histIsPlanned(row, line, date, shift)) return;
    items.push({
      h: null, missed: true, past,
      it: {
        standardId: row.id, machine: row.machine || '', nodePart: row.nodePart || '',
        oplNumber: row.oplNumber || '', node: row.node || '', title: row.title || row.paramName || '',
        kind: isElec ? 'elec' : 'mech', status: 'MISSED'
      }
    });
  });
  return {
    records, kind: 'cl', items,
    title: 'Чек-лист CL · смена',
    s: { date, shift, letter }
  };
}

function histNeighbors(data) {
  if (histPage.kind === 'shift') {
    const { date, shift } = histPage;
    const prev = shift === 'night' ? { date, shift: 'day' } : { date: addDaysISO(date, -1), shift: 'night' };
    const next = shift === 'day' ? { date, shift: 'night' } : { date: addDaysISO(date, 1), shift: 'day' };
    const cur = getCurrentShiftPeriod();
    const nextOk = next.date < cur.date || (next.date === cur.date && (next.shift === 'day' || cur.shiftType === 'night'));
    return { prev, next: nextOk ? next : null };
  }
  const h = data.records[0];
  const k = histKind(h);
  const list = getHistory().filter(x => x.line === h.line && histKind(x) === k)
    .map(x => ({ x, key: histOrderKey(x) })).sort((a, b) => a.key.localeCompare(b.key));
  const i = list.findIndex(e => e.x.id === h.id);
  return { prev: i > 0 ? list[i - 1].x : null, next: i >= 0 && i < list.length - 1 ? list[i + 1].x : null };
}

function histNavLabel(target) {
  if (!target) return '';
  const s = target.shift && target.date && !target.id ? target : histShift(target);
  return `${histDayName(s.date)} ${fmtShortDate(s.date)} ${s.shift === 'day' ? 'день' : 'ночь'}`;
}

function renderHistRecordPage() {
  const box = $('#histRecordView');
  const data = histPageData();
  if (!box) return;
  if (!data) {
    box.innerHTML = '<div class="card hist-empty">Запись не найдена</div>';
    return;
  }
  const { records, items, s } = data;
  const first = records[0] || null;
  const line = histPage.line;
  const brand = first ? (first.brandTo || first.brandActual || '') : '';
  const nav = histNeighbors(data);
  const navAttr = (t) => histPage.kind === 'shift'
    ? `data-hist-nav-shift="${t.date}|${t.shift}"` : `data-hist-nav="${escapeAttr(t.id)}"`;

  // --- Шапка ---
  const meta = [`Линия <b>${escapeHtml(line)}</b>`, `<b>${histDayName(s.date)} ${fmtShortDate(s.date)}</b> · ${s.shift === 'day' ? 'день 09–21' : 'ночь 21–09'}`];
  if (s.letter) meta.push(`Бригада <b>${escapeHtml(s.letter)}</b>`);
  if (brand) meta.push(`Бренд <b>${escapeHtml(brand)}</b>${first && first.brandPlanned && first.brandPlanned !== first.brandActual ? ` <span class="hist-c-warn">(план: ${escapeHtml(first.brandPlanned)})</span>` : ''}`);
  if (first && histKind(first) === 'cocl') {
    if (first.part) meta.push(`Часть <b>${escapeHtml(first.part)}</b>`);
    meta.push(`Переход <b>${escapeHtml(first.brandFrom || '—')} → ${escapeHtml(first.brandTo || '—')}</b>`);
  }
  if (first && first.operator && first.operator !== '—') meta.push(`Оператор <b>${escapeHtml(first.operator)}</b>`);
  if (records.length) meta.push(`Сохранено ${escapeHtml(records.map(r => fmtDate(r.timestamp)).join(', '))}`);

  let extra = '';
  if (first && histKind(first) === 'toploss') {
    const names = (first.topLosses || []).map(id => findLossById(id)).filter(Boolean).map(l => l.name);
    if (names.length) extra = `<div class="hist-rp-extra">Потери: ${names.map(n => `<span class="hist-tag hist-tag-warn">${escapeHtml(n)}</span>`).join(' ')}</div>`;
  }
  if (first && histKind(first) === 'cocl' && (first.triggers || []).length) {
    extra = `<div class="hist-rp-extra">Триггеры: ${first.triggers.map(t => `<span class="hist-tag hist-tag-kind" style="--k:var(--accent-cyan)">${escapeHtml(String(t).replace('node:', ''))}</span>`).join(' ')}</div>`;
  }

  // --- Итоги ---
  const cnt = { ok: 0, fail: 0, unchecked: 0, missed: 0 };
  items.forEach(({ it, missed }) => {
    if (missed) cnt.missed++;
    else if (it.status === 'OK') cnt.ok++;
    else if (it.status === 'FAIL') cnt.fail++;
    else cnt.unchecked++;
  });
  const total = items.length || 1;
  const pct = cnt.ok + cnt.fail ? Math.round(cnt.ok / (cnt.ok + cnt.fail) * 100) : 0;
  const a1 = cnt.ok / total * 100, a2 = a1 + cnt.fail / total * 100, a3 = a2 + cnt.unchecked / total * 100;

  // --- Пункты по машинам ---
  const entries = histStdEntries(line);
  const groups = {};
  items.forEach(x => {
    const g = [x.it.machine || 'Без машины', x.it.nodePart].filter(Boolean).join(' · ');
    (groups[g] = groups[g] || []).push(x);
  });
  const zones = cilZoneMap(Object.keys(groups).map(g => ({ machine: g })));
  const groupKeys = Object.keys(groups).sort((a, b) => a.localeCompare(b, 'ru', { numeric: true }));

  const itemsHtml = groupKeys.map(g => `
    <div class="hist-mg cil-z${zones[g]}">Машина ${escapeHtml(g)}</div>
    ${groups[g].sort((a, b) => String(a.it.oplNumber || a.it.title || '').localeCompare(String(b.it.oplNumber || b.it.title || ''), 'ru', { numeric: true }))
      .map(x => histItemHtml(x, entries, line)).join('')}`).join('');

  const fails = items.filter(x => !x.missed && x.it.status === 'FAIL');

  box.innerHTML = `
    <div class="card print-card hist-rp-head">
      <button type="button" class="btn btn-secondary hist-noprint" data-hist-back>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
        ${histPage.from === 'history' ? 'История' : 'Назад'}
      </button>
      ${histIcon(data.kind, 22)}
      <div class="hist-rp-tt">
        <h2>${escapeHtml(data.title)}</h2>
        <div class="hist-rp-meta">${meta.map(m => `<span>${m}</span>`).join('')}</div>
        ${extra}
      </div>
      <span class="hist-sp"></span>
      <div class="hist-rp-nav hist-noprint">
        ${nav.prev ? `<button type="button" class="btn btn-secondary" ${navAttr(nav.prev)} title="Предыдущая проверка">◀ ${escapeHtml(histNavLabel(nav.prev))}</button>` : ''}
        ${nav.next ? `<button type="button" class="btn btn-secondary" ${navAttr(nav.next)} title="Следующая проверка">${escapeHtml(histNavLabel(nav.next))} ▶</button>` : ''}
      </div>
    </div>
    <div class="hist-rp">
      <div class="card print-card hist-rp-items">
        ${items.length ? itemsHtml : '<div class="hist-empty">В эту смену по расписанию ничего не запланировано и проверок нет</div>'}
      </div>
      <div class="card print-card hist-rp-side">
        <div class="hist-ring" style="--a1:${a1}%;--a2:${a2}%;--a3:${a3}%"><div>${cnt.ok + cnt.fail ? pct + '%' : '—'}<small>в норме</small></div></div>
        <div class="hist-leg">
          <span>${CIL_ICONS.check} ОК</span><b class="hist-c-ok">${cnt.ok}</b>
          <span>${CIL_ICONS.x} Отклонение</span><b class="hist-c-fail">${cnt.fail}</b>
          <span>? Не проверено</span><b class="hist-c-warn">${cnt.unchecked}</b>
          ${cnt.missed ? `<span>? ${histPage.kind === 'shift' && !isShiftPast(histPage.date, histPage.shift) ? 'Ещё не проверено' : 'Пропущено'}</span><b class="hist-c-warn">${cnt.missed}</b>` : ''}
        </div>
        <div class="hist-side-btns hist-noprint">
          <button type="button" class="btn btn-primary" data-hist-print>Печать / PDF</button>
          ${records.length ? '<button type="button" class="btn btn-secondary" data-hist-xlsx>Excel этой проверки</button>' : ''}
          ${fails.length ? '<button type="button" class="btn btn-secondary" data-hist-mj>Скопировать для Machine Journal</button>' : ''}
        </div>
        ${fails.length ? `<div class="hist-mjbox"><b>${pluralRu(fails.length, 'Отклонение', 'Отклонения', 'Отклонений')}: ${fails.length}.</b> Запись в Machine Journal делается в другом приложении — список можно скопировать кнопкой выше.</div>` : ''}
      </div>
    </div>`;
}

function histItemHtml(x, entries, line) {
  const { h, it, missed, past } = x;
  const isElec = it.kind === 'elec' || (h && histIsElecItem(h, it));
  let st = 'u', sym = '?';
  if (!missed && it.status === 'OK') { st = 'o'; sym = CIL_ICONS.check; }
  else if (!missed && it.status === 'FAIL') { st = 'x'; sym = CIL_ICONS.x; }

  // Значения
  let valuesHtml;
  if (missed) {
    valuesHtml = `<span class="hist-pt">${past ? 'пропущено — проверки нет' : 'ещё не проверено'}</span>`;
  } else if (it.status === 'UNCHECKED') {
    valuesHtml = '<span class="hist-pt">отмечено «не проверено»</span>';
  } else {
    const pts = histItemPoints(h, it);
    valuesHtml = pts
      ? pts.map((p, i) => `<span class="hist-pt ${p.bad ? 'bad' : ''}" title="${p.label ? 'Норма: ' + escapeAttr(p.label) : ''}">${pts.length > 1 ? `<i class="hist-pt-n">т.${i + 1}</i>` : ''}${p.label ? `<i>${escapeHtml(p.label)}:</i> ` : ''}<b>${escapeHtml(p.value || '—')}</b></span>`).join('')
      : `<span class="hist-pt ${it.status === 'FAIL' ? 'bad' : ''}"><b>${it.status === 'FAIL' ? 'Не ОК' : 'ОК'}</b></span>`;
  }

  // Прошлый раз + повтор
  const list = entries.get(it.standardId) || [];
  const myKey = h ? histOrderKey(h) : `${histPage.date}|${histPage.shift === 'day' ? 0 : 1}|~`;
  const before = list.filter(e => e.key < myKey && e.h !== h);
  const prev = before[before.length - 1];
  let prevHtml = '<span class="hist-sub">Прошлый раз</span><b>—</b>';
  if (prev) {
    const ps = histShift(prev.h);
    const sy = prev.it.status === 'OK' ? 'ОК' : prev.it.status === 'FAIL' ? '✕ откл.' : '? не пров.';
    const other = !h || histKind(prev.h) !== histKind(h) ? ` · ${HIST_KINDS[histKind(prev.h)].short}` : '';
    prevHtml = `<span class="hist-sub">Прошлый раз</span><b class="${prev.it.status === 'FAIL' ? 'hist-c-fail' : ''}">${sy} · ${fmtShortDate(ps.date)} ${ps.shift === 'day' ? 'день' : 'ночь'}${other}</b>`;
  }
  const last5 = (h ? before.concat([{ it }]) : before).slice(-5);
  const failN = last5.filter(e => e.it.status === 'FAIL').length;
  const repHtml = failN >= 2 ? `<span class="hist-tag hist-tag-fail">повтор: ${failN} из ${last5.length} последних</span>` : '';

  const losses = (it.topLosses || []).map(id => findLossById(id)).filter(Boolean).map(l => l.name);
  const sub = [it.node, losses.join(' · ')].filter(Boolean).join(' · ');
  const row = histFindRow(it.standardId);

  return `<div class="hist-it ${st === 'x' ? 'hist-it-fail' : ''} ${missed ? 'hist-it-missed' : ''}">
    <span class="hist-st hist-st-${st}">${sym}</span>
    <div class="hist-it-main">
      <div class="hist-it-title">${it.oplNumber ? `<span class="hist-opl">${escapeHtml(it.oplNumber)}</span> · ` : ''}${escapeHtml(histItemTitle(it))}${isElec ? ' <span class="hist-tag hist-tag-elec">E-Param</span>' : ''}</div>
      ${sub ? `<div class="hist-sub">${escapeHtml(sub)}</div>` : ''}
      <div class="hist-pts">${valuesHtml}</div>
      ${it.comment ? `<div class="hist-com">${cmtLine(it.comment)}</div>` : ''}
    </div>
    <div class="hist-prev">${prevHtml}${repHtml}</div>
    <div class="hist-it-act hist-noprint">
      ${row && !isElec ? `<button type="button" class="btn btn-secondary btn-sm" data-hist-std-view="${escapeAttr(it.standardId)}" title="Открыть стандарт">${CIL_ICONS.eye} Стандарт</button>` : ''}
      ${row ? `<button type="button" class="btn btn-secondary btn-sm" data-hist-std-hist="${escapeAttr(it.standardId)}" title="Все проверки этого стандарта">История</button>` : ''}
    </div>
  </div>`;
}

/* Текст для Machine Journal */
function histMjText() {
  const data = histPageData();
  if (!data) return '';
  return data.items.filter(x => !x.missed && x.it.status === 'FAIL').map(({ h, it }) =>
    `${h.line} · ${it.machine || ''} · ${it.oplNumber ? it.oplNumber + ' ' : ''}${histItemTitle(it)}: ${histDeviationText(h, it)}${it.comment ? ' (' + it.comment + ')' : ''}`
  ).join('\n');
}

$('#histRecordView')?.addEventListener('click', (e) => {
  const t = e.target;
  if (t.closest('[data-hist-back]')) return histBack();
  const nav = t.closest('[data-hist-nav]');
  if (nav) { histPage.id = nav.dataset.histNav; renderHistRecordPage(); return window.scrollTo(0, 0); }
  const navS = t.closest('[data-hist-nav-shift]');
  if (navS) {
    const [date, shift] = navS.dataset.histNavShift.split('|');
    Object.assign(histPage, { date, shift });
    renderHistRecordPage();
    return window.scrollTo(0, 0);
  }
  if (t.closest('[data-hist-print]')) return window.print();
  if (t.closest('[data-hist-xlsx]')) {
    const data = histPageData();
    if (data && data.records.length && typeof exportToXlsx === 'function') exportToXlsx(data.records);
    return;
  }
  if (t.closest('[data-hist-mj]')) return histCopyText(histMjText(), 'Список отклонений скопирован');
  const sv = t.closest('[data-hist-std-view]');
  if (sv) { if (typeof openStandardView === 'function') openStandardView(sv.dataset.histStdView); return; }
  const sh = t.closest('[data-hist-std-hist]');
  if (sh) return openStandardHistory(sh.dataset.histStdHist, histPage.line, { from: 'record' });
});
