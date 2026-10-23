/* ============================================================
   ВКЛАДКА «История»: лента проверок и журнал отклонений
   Модуль общего пространства имён: функции и переменные видны
   во всех файлах. Порядок подключения — index.html.
   ============================================================ */

const HIST_FILTERS_KEY = 'cl_history_filters';
const HIST_PAGE = 40;

function loadHistFilters() {
  try { return JSON.parse(localStorage.getItem(HIST_FILTERS_KEY) || '{}') || {}; }
  catch (e) { return {}; }
}

const histState = Object.assign({
  view: 'feed',          // 'feed' | 'dev'
  period: '7',           // shift | today | 7 | 30 | all | custom
  from: '', to: '',
  line: null,            // null — ещё не выбирали (берём линию Чек-листа CL)
  kinds: ['cl', 'electronic', 'toploss', 'cocl'],
  brigade: '', machine: '', workshop: '',
  onlyDev: false
}, loadHistFilters(), { q: '', limit: HIST_PAGE, scrollY: 0, week: 0, pick: '', open: [] });

function saveHistFilters() {
  const { view, period, from, to, line, kinds, brigade, machine, workshop, onlyDev } = histState;
  try { localStorage.setItem(HIST_FILTERS_KEY, JSON.stringify({ view, period, from, to, line, kinds, brigade, machine, workshop, onlyDev })); }
  catch (e) { /* хранилище недоступно — фильтры просто не запомнятся */ }
}

/* ============================================================
   ФИЛЬТРЫ
   ============================================================ */
function fillHistoryFilters() {
  if (histState.line === null) {
    let last = '';
    try { last = localStorage.getItem('cl_cl_line') || ''; } catch (e) { /* нет доступа */ }
    histState.line = getLines().includes(last) ? last : '';
  }
  const lineSel = $('#filterLine');
  if (lineSel) {
    // Линии сгруппированы по цехам; линии вне структуры — отдельной группой
    const ctx = getAllLinesWithContext().filter(c => !histState.workshop || c.workshopId === histState.workshop);
    const known = new Set(ctx.map(c => c.line));
    const groups = {};
    ctx.forEach(c => { (groups[c.workshopName] = groups[c.workshopName] || []).push(c.line); });
    const extra = histState.workshop ? [] : getLines().filter(l => !known.has(l));
    const opt = l => `<option value="${escapeAttr(l)}">${escapeHtml(l)}</option>`;
    lineSel.innerHTML = '<option value="">Все линии</option>' +
      Object.entries(groups).map(([ws, ls]) => `<optgroup label="${escapeAttr(ws)}">${ls.map(opt).join('')}</optgroup>`).join('') +
      (extra.length ? `<optgroup label="Вне структуры">${extra.map(opt).join('')}</optgroup>` : '');
    lineSel.value = histState.line || '';
  }
  const brSel = $('#histBrigade');
  if (brSel) {
    brSel.innerHTML = '<option value="">Все смены</option>' +
      ['A', 'B', 'C', 'D'].map(b => `<option value="${b}">Смена ${b}</option>`).join('');
    brSel.value = histState.brigade || '';
  }
  const wsBox = $('#histWsChips');
  if (wsBox) {
    wsBox.innerHTML = [['', 'Все']].concat(getWorkshops().map(w => [w.id, w.name])).map(([id, name]) =>
      `<button type="button" class="hist-chip hist-ws-chip${(histState.workshop || '') === id ? ' on' : ''}" data-hist-ws="${escapeAttr(id)}" style="--k:var(--accent-cyan)">${escapeHtml(name)}</button>`
    ).join('');
  }
  const chips = $('#histKindChips');
  if (chips) {
    chips.innerHTML = Object.entries(HIST_KINDS).map(([k, v]) =>
      `<button type="button" class="hist-chip" data-hist-kind="${k}" style="--k:${v.color}"><i></i>${escapeHtml(v.short)}</button>`
    ).join('');
  }
  if ($('#dateFrom')) $('#dateFrom').value = histState.from || '';
  if ($('#dateTo')) $('#dateTo').value = histState.to || '';
  if ($('#histOnlyDev')) $('#histOnlyDev').checked = !!histState.onlyDev;
}

/* Машины в истории выбранной линии */
function fillHistMachineFilter() {
  const sel = $('#histMachine');
  if (!sel) return;
  const set = new Set();
  getHistory().forEach(h => {
    if (histState.line && h.line !== histState.line) return;
    if (!histState.line && histState.workshop && getWorkshopIdForLine(h.line) !== histState.workshop) return;
    (h.items || []).forEach(it => { if (it.machine) set.add(it.machine); });
  });
  const list = [...set].sort((a, b) => String(a).localeCompare(String(b), 'ru', { numeric: true }));
  if (histState.machine && !set.has(histState.machine)) histState.machine = '';
  sel.innerHTML = '<option value="">Все машины</option>' +
    list.map(m => `<option value="${escapeAttr(m)}">${escapeHtml(m)}</option>`).join('');
  sel.value = histState.machine || '';
}

function histPeriodMatch(h) {
  const p = histState.period;
  if (p === 'all') return true;
  const s = histShift(h);
  const cur = getCurrentShiftPeriod();
  if (p === 'shift') return s.date === cur.date && s.shift === cur.shiftType;
  if (p === 'today') return s.date === cur.date;
  if (p === 'custom') {
    if (histState.from && s.date < histState.from) return false;
    if (histState.to && s.date > histState.to) return false;
    return true;
  }
  const n = parseInt(p, 10) || 7;
  return s.date >= addDaysISO(cur.date, -(n - 1));
}

function histSearchMatch(h, q) {
  if (!q) return true;
  /* Поиск: бренд записи, название стандарта, машина, часть линии, узел */
  if ([h.brandActual, h.brandFrom, h.brandTo].some(v => v && String(v).toLowerCase().includes(q))) return true;
  return (h.items || []).some(it =>
    [it.title, it.paramName, it.machine, it.nodePart, it.node]
      .some(v => v && String(v).toLowerCase().includes(q)));
}

/* Записи по фильтрам (используется и экспортом) */
function getFilteredHistory(opts = {}) {
  const q = (histState.q || '').trim().toLowerCase();
  const kinds = new Set(histState.kinds || []);
  return getHistory()
    .filter(h => kinds.has(histKind(h)))
    .filter(h => !histState.line || h.line === histState.line)
    .filter(h => histState.line || !histState.workshop || getWorkshopIdForLine(h.line) === histState.workshop)
    .filter(h => (histState.pick && histState.line) || histPeriodMatch(h))
    .filter(h => !histState.brigade || histShift(h).letter === histState.brigade)
    .filter(h => !histState.machine || (h.items || []).some(it => it.machine === histState.machine))
    .filter(h => !histState.pick || !histState.line || histPickMatch(h))
    .filter(h => opts.ignoreOnlyDev || !histState.onlyDev || (h.items || []).some(it => it.status === 'FAIL'))
    .filter(h => histSearchMatch(h, q))
    .map(h => ({ h, key: histOrderKey(h) }))
    .sort((a, b) => b.key.localeCompare(a.key))
    .map(x => x.h);
}

/* Выбранная в сетке недели смена: 'YYYY-MM-DD|day' */
function histPickMatch(h) {
  const [date, shift] = histState.pick.split('|');
  const s = histShift(h);
  return s.date === date && s.shift === shift;
}

/* ============================================================
   РЕНДЕР
   ============================================================ */
function histShowView(name) {
  ['histMainView', 'histRecordView', 'histStdView'].forEach(id => {
    $('#' + id)?.classList.toggle('hist-hidden', id !== name);
  });
}

function renderHistory() {
  histShowView('histMainView');
  fillHistMachineFilter();

  $$('#histViewSeg [data-hist-view]').forEach(b => b.classList.toggle('on', b.dataset.histView === histState.view));
  $$('#histPeriodSeg [data-hist-period]').forEach(b => b.classList.toggle('on', b.dataset.histPeriod === histState.period));
  $$('#histKindChips [data-hist-kind]').forEach(b => b.classList.toggle('on', histState.kinds.includes(b.dataset.histKind)));
  $('#histCustomRange')?.classList.toggle('hist-hidden', histState.period !== 'custom');
  const lineSel = $('#filterLine');
  if (lineSel) lineSel.value = histState.line || '';

  const periodText = {
    shift: 'текущая смена', today: 'сегодня', '7': 'последние 7 дней', '30': 'последние 30 дней',
    all: 'всё время', custom: 'выбранный период'
  }[histState.period] || '';
  $('#histSubtitle').textContent = `${histState.line || (histState.workshop ? 'Цех ' + (getWorkshop(histState.workshop)?.name || '') : 'Все линии')} · ${periodText}`;

  const list = getFilteredHistory();
  renderHistTotals(list);

  if (histState.view === 'dev') renderHistDeviations();
  else renderHistFeed(list);
}

/* Итог по отобранным записям — строкой под фильтрами */
function renderHistTotals(list) {
  const box = $('#histTotals');
  if (!box) return;
  let ok = 0, fail = 0;
  list.forEach(h => (h.items || []).forEach(it => {
    if (it.status === 'OK') ok++;
    if (it.status === 'FAIL') fail++;
  }));
  const pct = ok + fail ? Math.round(ok / (ok + fail) * 100) : null;
  box.innerHTML = `
    <span><b>${list.length}</b> ${pluralRu(list.length, 'проверка', 'проверки', 'проверок')}</span>
    <span><b>${ok + fail}</b> ${pluralRu(ok + fail, 'пункт', 'пункта', 'пунктов')}</span>
    <span class="${fail ? 'hist-c-fail' : ''}"><b>${fail}</b> ${pluralRu(fail, 'отклонение', 'отклонения', 'отклонений')}</span>
    <span class="${pct != null && pct < 90 ? 'hist-c-warn' : 'hist-c-ok'}"><b>${pct == null ? '—' : pct + '%'}</b> в норме</span>
    <span class="hist-sub">${histState.line ? 'Клик по смене в сетке недели — только её проверки' : 'Выберите линию — появится сетка недели по сменам'}</span>`;
}

function pluralRu(n, one, few, many) {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
}

/* Номер недели ISO 8601 для даты 'YYYY-MM-DD' */
function histIsoWeek(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const jan4 = new Date(d.getFullYear(), 0, 4);
  return 1 + Math.round(((d - jan4) / 864e5 - 3 + ((jan4.getDay() + 6) % 7)) / 7);
}

function histCoverageHtml(line, weekOffset, weekAttr) {
  const week = histCoverage(line, weekOffset);
  const today = getCurrentShiftPeriod().date;

  // Итоги недели: смены и пункты
  const sum = { planned: 0, past: 0, ok: 0, partial: 0, missed: 0, fail: 0, now: 0, pts: 0, ptsFail: 0 };
  const missedList = [];
  week.forEach(d => ['day', 'night'].forEach(s => {
    const c = d.shifts[s];
    if (c.state === 'none') return;
    sum.planned++;
    if (c.state === 'future') return;
    sum.pts += c.done;
    sum.ptsFail += c.fail;
    if (c.state === 'now') { sum.now++; return; }
    sum.past++;
    sum[c.state]++;
    if (c.state === 'missed') missedList.push(`${d.dayName} ${s === 'day' ? 'день' : 'ночь'} · ${c.letter}`);
  }));
  const checked = sum.ok + sum.partial + sum.fail;
  const clean = sum.ok + sum.partial;

  // Дни недели: сколько прошло
  const daysGone = week.filter(d => d.date < today).length;
  const isCur = weekOffset === 0;
  const dayNo = week.findIndex(d => d.date === today) + 1;
  const daysText = isCur
    ? `идёт ${dayNo}-й день из 7 · прошло ${daysGone} ${pluralRu(daysGone, 'день', 'дня', 'дней')}`
    : 'неделя завершена · 7 из 7 дней';
  const weekTag = isCur ? 'Текущая неделя'
    : weekOffset === -1 ? 'Прошлая неделя'
    : `${-weekOffset} ${pluralRu(-weekOffset, 'неделя', 'недели', 'недель')} назад`;

  // Ячейка смены: цвет — состояние, крупно — итог, мелко — смена и N/M
  const cell = (d, s) => {
    const c = d.shifts[s];
    const meta = `Смена ${escapeHtml(c.letter)}`;
    if (c.state === 'none') {
      return `<div class="hist-cc hist-cc-none" title="Нет в расписании"><span class="hist-cc-m">${meta}</span><span class="hist-cc-n">—</span></div>`;
    }
    if (c.state === 'future') {
      return `<div class="hist-cc hist-cc-future"><span class="hist-cc-m">${meta}</span><span class="hist-cc-n">план ${c.planned}</span></div>`;
    }
    const left = c.planned - c.done;
    let text;
    if (c.state === 'fail') text = `${CIL_ICONS.x}${c.fail} откл.`;
    else if (c.state === 'ok') text = `${CIL_ICONS.check}в норме`;
    else if (c.state === 'missed') text = '? пропущена';
    else if (c.state === 'now') text = 'идёт смена';
    else text = `◐ ${left} не пров.`;
    const pct = Math.round(c.done / c.planned * 100);
    return `<button type="button" class="hist-cc hist-cc-${c.state}" data-hist-shift="${d.date}|${s}" title="Открыть проверку смены">
      <span class="hist-cc-m">${meta}<b>${c.done}/${c.planned}</b></span>
      <span class="hist-cc-n">${text}</span>
      <span class="hist-cc-pb"><i style="width:${pct}%"></i></span>
    </button>`;
  };

  const kpi = (cls, val, label, sub, title) => `
    <div class="hist-ck ${cls}"${title ? ` title="${escapeAttr(title)}"` : ''}>
      <b>${val}</b><span>${label}</span>${sub ? `<small>${sub}</small>` : ''}
    </div>`;

  const first = week[0].date, last = week[6].date;
  const arrow = (dir, dis) => `<button type="button" class="cil-week-btn hist-cov-arrow" ${weekAttr}="${dir}" title="${dir < 0 ? 'Предыдущая' : 'Следующая'} неделя"${dis ? ' disabled' : ''}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="${dir < 0 ? '15 18 9 12 15 6' : '9 18 15 12 9 6'}"/></svg></button>`;

  return `
    <div class="hist-cov-h">
      <div class="hist-cov-week">
        <div class="hist-cov-wk">
          ${arrow(-1, false)}
          <span class="hist-cov-no">Неделя ${histIsoWeek(first)}</span>
          <span class="hist-cov-range">${fmtShortDate(first)} – ${fmtShortDate(last)}</span>
          <span class="hist-cov-tag ${isCur ? 'is-cur' : ''}">${weekTag}</span>
          ${arrow(1, isCur)}
          ${!isCur ? `<button type="button" class="cil-week-today" ${weekAttr}="0">К текущей</button>` : ''}
        </div>
        <div class="hist-cov-sub">Покрытие смен Чек-листа CL · ${escapeHtml(line)} · ${daysText}</div>
        <div class="hist-cov-days">${week.map(d => `<i class="${d.date < today ? 'gone' : d.date === today ? 'now' : ''}"></i>`).join('')}</div>
      </div>
    </div>
    <div class="hist-cks">
      ${kpi('', `${sum.past}<em>/${sum.planned}</em>`, 'смен прошло', sum.now ? 'и 1 идёт сейчас' : `в расписании ${sum.planned}`)}
      ${kpi(checked ? 'hist-ck-in' : '', checked, `${pluralRu(checked, 'смена проверена', 'смены проверены', 'смен проверено')}`, `${sum.pts} ${pluralRu(sum.pts, 'пункт', 'пункта', 'пунктов')}`)}
      ${kpi(clean ? 'hist-ck-ok' : '', clean, 'без отклонений', !clean ? (checked ? 'все проверенные — с отклонениями' : 'нет проверенных смен') : sum.partial ? `из них ${sum.partial} частично` : 'всё в норме')}
      ${kpi(sum.fail ? 'hist-ck-fail' : '', sum.fail, 'с отклонениями', `${sum.ptsFail} ${pluralRu(sum.ptsFail, 'пункт', 'пункта', 'пунктов')} не в норме`)}
      ${kpi(sum.missed ? 'hist-ck-warn' : '', sum.missed, 'пропущено', sum.missed ? 'наведите — какие' : 'пропусков нет', missedList.join('\n'))}
    </div>
    <div class="hist-cw">
      <span></span>
      ${week.map(d => `<div class="hist-cw-dh ${d.isToday ? 'today' : ''} ${d.date < today ? 'gone' : ''}"><b>${d.dayName}</b><span>${fmtShortDate(d.date)}</span></div>`).join('')}
      <div class="hist-cw-rl hist-cw-rl-day"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><line x1="12" y1="2" x2="12" y2="4"/><line x1="12" y1="20" x2="12" y2="22"/><line x1="4.9" y1="4.9" x2="6.3" y2="6.3"/><line x1="17.7" y1="17.7" x2="19.1" y2="19.1"/><line x1="2" y1="12" x2="4" y2="12"/><line x1="20" y1="12" x2="22" y2="12"/><line x1="4.9" y1="19.1" x2="6.3" y2="17.7"/><line x1="17.7" y1="6.3" x2="19.1" y2="4.9"/></svg><span>День<small>09–21</small></span></div>
      ${week.map(d => cell(d, 'day')).join('')}
      <div class="hist-cw-rl hist-cw-rl-night"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg><span>Ночь<small>21–09</small></span></div>
      ${week.map(d => cell(d, 'night')).join('')}
    </div>`;
}

/* --- Лента проверок --- */
function histRecordContext(h) {
  const k = histKind(h);
  const parts = [];
  if (k === 'toploss') {
    const names = (h.topLosses || []).map(id => findLossById(id)).filter(Boolean).map(l => l.name);
    if (names.length) parts.push(`<span class="hist-c-warn">${escapeHtml(names.join(' · '))}</span>`);
  } else if (k === 'cocl') {
    if (h.brandFrom || h.brandTo) parts.push(`${escapeHtml(h.brandFrom || '—')} → ${escapeHtml(h.brandTo || '—')}`);
    const trig = (h.triggers || []).map(t => String(t).replace('node:', ''));
    if (trig.length) parts.push('триггеры: ' + escapeHtml(trig.join(', ')));
  } else {
    parts.push('Плановая проверка смены');
  }
  return parts.join(' · ');
}

function histRecordSub(h) {
  const k = histKind(h);
  const bits = [h.line];
  if (k === 'cocl' && h.part) bits.push(h.part);
  if ((k === 'cl' || k === 'electronic' || k === 'toploss') && h.brandActual) bits.push('бренд ' + h.brandActual);
  return bits.filter(Boolean).map(escapeHtml).join(' · ');
}

function histResultHtml(c) {
  const t = c.total || 1;
  return `<div class="hist-res">
    <div class="hist-rbar"><i class="ok" style="width:${c.ok / t * 100}%"></i><i class="fail" style="width:${c.fail / t * 100}%"></i><i class="un" style="width:${c.unchecked / t * 100}%"></i></div>
    <div class="hist-rtxt">${c.ok} ОК${c.fail ? ` · <b class="hist-c-fail">${c.fail} откл.</b>` : ''}${c.unchecked ? ` · ${c.unchecked} не пров.` : ''}</div>
  </div>`;
}

function renderHistFeed(list) {
  const box = $('#historyList');
  let html = histState.line ? histWeekCardHtml() : '';
  if (!list.length) {
    box.innerHTML = html + '<div class="card hist-empty">Проверок по выбранным фильтрам нет</div>';
    histMarkPick();
    return;
  }

  // Итоги дня — по всем отобранным записям, не только показанным
  const days = {};
  list.forEach(h => {
    const d = histShift(h).date;
    if (!days[d]) days[d] = { n: 0, pts: 0, fail: 0, shifts: new Set() };
    const c = histCounts(h);
    days[d].n++;
    days[d].pts += c.total;
    days[d].fail += c.fail;
    days[d].shifts.add(histShift(h).shift);
  });

  const shown = list.slice(0, histState.limit);
  const byDay = [];
  shown.forEach(h => {
    const d = histShift(h).date;
    if (!byDay.length || byDay[byDay.length - 1].date !== d) byDay.push({ date: d, recs: [] });
    byDay[byDay.length - 1].recs.push(h);
  });

  byDay.forEach(({ date, recs }) => {
    const sum = days[date];
    const dt = histDayTitle(date);
    const full = histDayName(date) + ' ' + fmtShortDate(date);
    const okPct = sum.pts ? (sum.pts - sum.fail) / sum.pts * 100 : 0;
    html += `<div class="hist-day">
      <b>${escapeHtml(dt)}</b>${dt !== full ? `<span>${escapeHtml(full)}</span>` : ''}
      <span class="hist-day-sum">${sum.n} ${pluralRu(sum.n, 'проверка', 'проверки', 'проверок')} · ${sum.pts} ${pluralRu(sum.pts, 'пункт', 'пункта', 'пунктов')}${sum.fail ? ` · <b class="hist-c-fail">${sum.fail} откл.</b>` : ' · <b class="hist-c-ok">всё в норме</b>'}</span>
      <span class="hist-day-bar"><i style="width:${okPct}%"></i></span>
    </div><div class="card hist-feed">`;

    const open = !!histState.pick || histState.onlyDev || histState.open.includes(date);
    const clean = recs.filter(h => { const c = histCounts(h); return !c.fail && !c.unchecked; });
    recs.forEach(h => {
      if (!open && clean.includes(h) && clean.length > 1) return;
      html += histRecHtml(h);
    });
    if (!open && clean.length > 1) {
      const labels = clean.map(h => histShiftLabel(histShift(h))).join(', ');
      html += `<button type="button" class="hist-rec-fold" data-hist-expand="${date}">
        <span class="hist-fold-ic">${CIL_ICONS.check}</span>
        <span><b>${clean.length} ${pluralRu(clean.length, 'проверка', 'проверки', 'проверок')} в норме</b><small>${escapeHtml(labels)}</small></span>
        <span class="hist-fold-act">Показать</span>
      </button>`;
    }
    html += '</div>';
  });

  if (list.length > shown.length) {
    html += `<button type="button" class="btn btn-secondary hist-more" data-hist-more>Показать ещё (${list.length - shown.length})</button>`;
  }
  box.innerHTML = html;
  histMarkPick();
}

/* Строка проверки: смена крупно, отклонения — чипами */
function histRecHtml(h) {
  const s = histShift(h);
  const c = histCounts(h);
  const fails = (h.items || []).filter(it => it.status === 'FAIL');
  const chips = fails.slice(0, 3).map(it => `<span class="hist-dchip" title="${escapeAttr(histItemTitle(it))}">
      <b>${escapeHtml(it.oplNumber || histItemTitle(it))}</b>${it.machine ? `<em>${escapeHtml(it.machine)}</em>` : ''}${escapeHtml(histDeviationText(h, it))}</span>`).join('')
    + (fails.length > 3 ? `<span class="hist-dchip hist-dchip-more">+${fails.length - 3}</span>` : '');
  const ctx = ['cl', 'electronic'].includes(histKind(h)) ? '' : histRecordContext(h);
  return `<button type="button" class="hist-rec ${c.fail ? 'is-fail' : ''}" data-hist-open="${escapeAttr(h.id)}">
      <div class="hist-rec-sh hist-rec-sh-${s.shift}"><b>${s.shift === 'day' ? 'День' : 'Ночь'}${s.letter ? ' · ' + escapeHtml(s.letter) : ''}</b><small>${histTime(h)}</small></div>
      ${histIcon(histKind(h))}
      <div class="hist-rec-t"><b>${escapeHtml(histKindLabel(h))}</b><div>${histRecordSub(h)}${ctx ? ' · ' + ctx : ''}</div></div>
      <div class="hist-rec-ctx">${chips || (c.unchecked ? '<span class="hist-c-warn">не всё проверено</span>' : '<span class="hist-sub">отклонений нет</span>')}</div>
      ${histResultHtml(c)}
      <div class="hist-rec-tag">${c.fail ? `<span class="hist-tag hist-tag-mj" title="Отклонения нужно записать в Machine Journal">MJ</span>` : ''}</div>
    </button>`;
}

/* Сетка недели выбранной линии + плашка выбранной смены */
function histWeekCardHtml() {
  let pickBar = '';
  if (histState.pick) {
    const [date, shift] = histState.pick.split('|');
    const letter = getShiftsForDate(date)[shift];
    pickBar = `<div class="hist-pick">
      <span>Показаны проверки смены: <b>${histDayName(date)} ${fmtShortDate(date)} · ${shift === 'day' ? 'день' : 'ночь'}${letter ? ' · ' + escapeHtml(letter) : ''}</b></span>
      <button type="button" class="btn btn-secondary" data-hist-shiftpage>Страница смены</button>
      <button type="button" class="btn btn-secondary" data-hist-unpick>Все смены</button>
    </div>`;
  }
  return `<div class="card hist-cov-card">${histCoverageHtml(histState.line, histState.week, 'data-hist-week')}${pickBar}</div>`;
}

function histMarkPick() {
  if (!histState.pick) return;
  $(`#historyList [data-hist-shift="${histState.pick}"]`)?.classList.add('is-pick');
}

/* --- Журнал отклонений --- */
function histDeviationEntries() {
  const out = [];
  getFilteredHistory({ ignoreOnlyDev: true }).forEach(h => {
    (h.items || []).forEach(it => {
      if (it.status !== 'FAIL') return;
      if (histState.machine && it.machine !== histState.machine) return;
      out.push({ h, it, s: histShift(h) });
    });
  });
  return out;
}

function histTop(entries, keyFn, labelFn) {
  const map = {};
  entries.forEach(e => {
    const k = keyFn(e);
    if (!k) return;
    if (!map[k]) map[k] = { label: labelFn(e), n: 0 };
    map[k].n++;
  });
  return Object.values(map).sort((a, b) => b.n - a.n).slice(0, 4);
}

function renderHistDeviations() {
  const box = $('#historyList');
  const entries = histDeviationEntries();
  if (!entries.length) {
    box.innerHTML = '<div class="card hist-empty">Отклонений по выбранным фильтрам нет</div>';
    return;
  }
  const rep = {};
  entries.forEach(e => { const k = e.h.line + '|' + e.it.standardId; rep[k] = (rep[k] || 0) + 1; });

  const topBlock = (title, list) => `<div class="hist-t5"><h4>${title}</h4>${list.map(x =>
    `<div><span>${escapeHtml(x.label)}</span><b>${x.n}</b></div>`).join('')}</div>`;
  const byStd = histTop(entries, e => e.h.line + '|' + e.it.standardId,
    e => (e.it.oplNumber ? e.it.oplNumber + ' · ' : '') + histItemTitle(e.it));
  const byMachine = histTop(entries, e => e.h.line + '|' + (e.it.machine || ''),
    e => [histState.line ? '' : e.h.line, e.it.machine || 'без машины', e.it.nodePart].filter(Boolean).join(' · '));
  const byBrigade = histTop(entries, e => e.s.letter, e => 'Бригада ' + e.s.letter);

  const shown = entries.slice(0, histState.limit);
  box.innerHTML = `
    <div class="card hist-top5">
      ${topBlock('Чаще всего отклоняются', byStd)}
      ${topBlock('По машинам', byMachine)}
      ${topBlock('По сменам', byBrigade)}
    </div>
    <div class="card hist-dev-card">
      <table class="hist-dev">
        <thead><tr><th>Когда</th><th>Где</th><th>Стандарт / параметр</th><th>Значение</th><th>Комментарий</th><th>Проверка</th></tr></thead>
        <tbody>
          ${shown.map(({ h, it, s }) => {
            const n = rep[h.line + '|' + it.standardId];
            const isElec = histIsElecItem(h, it);
            return `<tr data-hist-open="${escapeAttr(h.id)}" title="Открыть проверку">
              <td><b>${histDayName(s.date)} ${fmtShortDate(s.date)}</b> ${histTime(h)}<div class="hist-sub">${escapeHtml(histShiftLabel(s))}</div></td>
              <td>${escapeHtml([h.line, it.machine, it.nodePart].filter(Boolean).join(' · '))}</td>
              <td>${it.oplNumber ? `<span class="hist-opl">${escapeHtml(it.oplNumber)}</span> · ` : ''}<b>${escapeHtml(histItemTitle(it))}</b>
                ${isElec ? '<span class="hist-tag hist-tag-elec">E-Param</span>' : ''}
                ${n >= 2 ? `<span class="hist-tag hist-tag-fail">повтор ×${n}</span>` : ''}</td>
              <td class="hist-dev-val">${escapeHtml(histDeviationText(h, it))}</td>
              <td class="hist-sub">${it.comment ? cmtLine(it.comment) : '—'}</td>
              <td><span class="hist-tag hist-tag-kind" style="--k:${HIST_KINDS[histKind(h)].color}">${escapeHtml(HIST_KINDS[histKind(h)].short)}</span></td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>
    ${entries.length > shown.length ? `<button type="button" class="btn btn-secondary hist-more" data-hist-more>Показать ещё (${entries.length - shown.length})</button>` : ''}`;
}

/* ============================================================
   ОБРАБОТЧИКИ
   ============================================================ */
function histFilterChanged() {
  histState.limit = HIST_PAGE;
  saveHistFilters();
  renderHistory();
}

$('#tab-history')?.addEventListener('click', (e) => {
  const t = e.target;
  const view = t.closest('[data-hist-view]');
  if (view) { histState.view = view.dataset.histView; return histFilterChanged(); }
  const period = t.closest('[data-hist-period]');
  if (period) { histState.period = period.dataset.histPeriod; return histFilterChanged(); }
  const ws = t.closest('[data-hist-ws]');
  if (ws) {
    histState.workshop = ws.dataset.histWs || '';
    // линия другого цеха больше не подходит — сбрасываем на «Все линии»
    if (histState.line && histState.workshop && getWorkshopIdForLine(histState.line) !== histState.workshop) histState.line = '';
    fillHistoryFilters();
    return histFilterChanged();
  }
  const kind = t.closest('[data-hist-kind]');
  if (kind) {
    const k = kind.dataset.histKind;
    const set = new Set(histState.kinds);
    if (set.has(k)) set.delete(k); else set.add(k);
    if (!set.size) Object.keys(HIST_KINDS).forEach(x => set.add(x));
    histState.kinds = [...set];
    return histFilterChanged();
  }
  if (t.closest('[data-hist-more]')) { histState.limit += HIST_PAGE; return renderHistory(); }
  const shiftCell = t.closest('[data-hist-shift]');
  if (shiftCell && !t.closest('#histRecordView, #histStdView')) {
    const v = shiftCell.dataset.histShift;
    histState.pick = histState.pick === v ? '' : v;
    histState.limit = HIST_PAGE;
    return renderHistory();
  }
  const wk = t.closest('[data-hist-week]');
  if (wk) {
    const d = Number(wk.dataset.histWeek);
    histState.week = d === 0 ? 0 : Math.min(0, histState.week + d);
    histState.pick = '';
    return renderHistory();
  }
  if (t.closest('[data-hist-unpick]')) { histState.pick = ''; return renderHistory(); }
  if (t.closest('[data-hist-shiftpage]')) {
    const [date, shift] = histState.pick.split('|');
    return openHistoryShift(histState.line, date, shift);
  }
  const fold = t.closest('[data-hist-expand]');
  if (fold) { histState.open.push(fold.dataset.histExpand); return renderHistory(); }
  const open = t.closest('[data-hist-open]');
  if (open && !t.closest('#histRecordView, #histStdView')) return openHistoryRecord(open.dataset.histOpen);
});

$('#filterLine')?.addEventListener('change', (e) => {
  histState.line = e.target.value;
  histState.pick = '';
  histState.week = 0;
  histFilterChanged();
});
$('#histBrigade')?.addEventListener('change', (e) => { histState.brigade = e.target.value; histFilterChanged(); });
$('#histMachine')?.addEventListener('change', (e) => { histState.machine = e.target.value; histFilterChanged(); });
$('#histOnlyDev')?.addEventListener('change', (e) => { histState.onlyDev = e.target.checked; histFilterChanged(); });
$('#dateFrom')?.addEventListener('change', (e) => { histState.from = e.target.value; histFilterChanged(); });
$('#dateTo')?.addEventListener('change', (e) => { histState.to = e.target.value; histFilterChanged(); });

let histSearchTimer = null;
$('#histSearch')?.addEventListener('input', (e) => {
  clearTimeout(histSearchTimer);
  histSearchTimer = setTimeout(() => {
    histState.q = e.target.value;
    histState.limit = HIST_PAGE;
    renderHistory();
  }, 200);
});

/* Совместимость: Дашборд открывает запись через viewRecord */
window.viewRecord = function (id) {
  openHistoryRecord(id);
};
