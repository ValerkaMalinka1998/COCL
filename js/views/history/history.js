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
  brigade: '', machine: '',
  onlyDev: false
}, loadHistFilters(), { q: '', limit: HIST_PAGE, covWeek: 0, scrollY: 0 });

function saveHistFilters() {
  const { view, period, from, to, line, kinds, brigade, machine, onlyDev } = histState;
  try { localStorage.setItem(HIST_FILTERS_KEY, JSON.stringify({ view, period, from, to, line, kinds, brigade, machine, onlyDev })); }
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
    lineSel.innerHTML = '<option value="">Все линии</option>' +
      getLines().map(l => `<option value="${escapeAttr(l)}">${escapeHtml(l)}</option>`).join('');
    lineSel.value = histState.line || '';
  }
  const brSel = $('#histBrigade');
  if (brSel) {
    brSel.innerHTML = '<option value="">Все бригады</option>' +
      ['A', 'B', 'C', 'D'].map(b => `<option value="${b}">Бригада ${b}</option>`).join('');
    brSel.value = histState.brigade || '';
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
  const hay = [h.line, h.brandActual, h.brandFrom, h.brandTo, h.operator, h.type]
    .concat(...(h.items || []).map(it => [it.oplNumber, it.title, it.paramName, it.machine, it.node, it.comment]))
    .filter(Boolean).join(' ').toLowerCase();
  return hay.includes(q);
}

/* Записи по фильтрам (используется и экспортом) */
function getFilteredHistory(opts = {}) {
  const q = (histState.q || '').trim().toLowerCase();
  const kinds = new Set(histState.kinds || []);
  return getHistory()
    .filter(h => kinds.has(histKind(h)))
    .filter(h => !histState.line || h.line === histState.line)
    .filter(histPeriodMatch)
    .filter(h => !histState.brigade || histShift(h).letter === histState.brigade)
    .filter(h => !histState.machine || (h.items || []).some(it => it.machine === histState.machine))
    .filter(h => opts.ignoreOnlyDev || !histState.onlyDev || (h.items || []).some(it => it.status === 'FAIL'))
    .filter(h => histSearchMatch(h, q))
    .map(h => ({ h, key: histOrderKey(h) }))
    .sort((a, b) => b.key.localeCompare(a.key))
    .map(x => x.h);
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
  $('#histSubtitle').textContent = `${histState.line || 'Все линии'} · ${periodText}`;

  const list = getFilteredHistory();
  renderHistKpis(list);
  renderHistCoverage();

  if (histState.view === 'dev') renderHistDeviations();
  else renderHistFeed(list);
}

function renderHistKpis(list) {
  let ok = 0, fail = 0;
  const failByStd = {};
  list.forEach(h => (h.items || []).forEach(it => {
    if (it.status === 'OK') ok++;
    if (it.status === 'FAIL') {
      fail++;
      const k = h.line + '|' + it.standardId;
      failByStd[k] = (failByStd[k] || 0) + 1;
    }
  }));
  const repeats = Object.values(failByStd).filter(n => n >= 2).length;
  const pct = ok + fail ? Math.round(ok / (ok + fail) * 100) : null;
  let missed = '—';
  let missedSub = 'выберите линию';
  if (histState.line) {
    missed = 0;
    histCoverage(histState.line, histState.covWeek).forEach(d =>
      ['day', 'night'].forEach(s => { if (d.shifts[s].state === 'missed') missed++; }));
    missedSub = 'пропущено смен CL за неделю';
  }
  $('#histKpis').innerHTML = `
    <div class="hist-kpi"><b>${list.length}</b><span>${pluralRu(list.length, 'проверка', 'проверки', 'проверок')}</span></div>
    <div class="hist-kpi hist-kpi-ok"><b>${pct == null ? '—' : pct + '%'}</b><span>пунктов в норме</span></div>
    <div class="hist-kpi ${fail ? 'hist-kpi-fail' : ''}"><b>${fail}</b><span>${pluralRu(fail, 'отклонение', 'отклонения', 'отклонений')}</span></div>
    <div class="hist-kpi ${missed ? 'hist-kpi-warn' : ''}"><b>${missed}</b><span>${missedSub}</span></div>
    <div class="hist-kpi ${repeats ? 'hist-kpi-fail' : ''}"><b>${repeats}</b><span>повторяются ≥ 2 раз</span></div>`;
}

function pluralRu(n, one, few, many) {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
}

/* --- Покрытие смен Чек-листа CL --- */
function renderHistCoverage() {
  const box = $('#histCoverage');
  if (!box) return;
  if (!histState.line) {
    box.innerHTML = `<div class="hist-cov-empty">Выберите линию — здесь появится покрытие смен Чек-листа CL за неделю.</div>`;
    return;
  }
  const week = histCoverage(histState.line, histState.covWeek);
  const sum = { past: 0, ok: 0, partial: 0, missed: 0, fail: 0 };
  const missedList = [];
  week.forEach(d => ['day', 'night'].forEach(s => {
    const c = d.shifts[s];
    if (c.state === 'none' || c.state === 'future' || c.state === 'now') return;
    sum.past++;
    sum[c.state]++;
    if (c.state === 'missed') missedList.push(`${d.dayName} ${s === 'day' ? 'день' : 'ночь'}, бр. ${c.letter}`);
  }));

  const cell = (d, s) => {
    const c = d.shifts[s];
    const night = s === 'night' ? ' hist-cc-night' : '';
    if (c.state === 'none') {
      return `<div class="hist-cc hist-cc-none${night}"><div class="hist-cc-t"><span>Бр. ${escapeHtml(c.letter)}</span></div><div class="hist-cc-d">нет в расписании</div></div>`;
    }
    if (c.state === 'future') {
      return `<div class="hist-cc hist-cc-future${night}"><div class="hist-cc-t"><span>Бр. ${escapeHtml(c.letter)}</span></div><div class="hist-cc-d">запланировано ${c.planned}</div></div>`;
    }
    const left = c.planned - c.done - c.unchecked;
    let text;
    if (c.state === 'fail') text = `${CIL_ICONS.x}${c.fail} откл.`;
    else if (c.state === 'ok') text = `${CIL_ICONS.check}всё проверено`;
    else if (c.state === 'missed') text = '? пропущена';
    else if (c.state === 'now') text = 'идёт смена';
    else text = `${left + c.unchecked} не проверено`;
    const pct = Math.round(c.done / c.planned * 100);
    return `<button type="button" class="hist-cc hist-cc-${c.state}${night}" data-hist-shift="${d.date}|${s}" title="Открыть проверку смены">
      <div class="hist-cc-t"><span>Бр. ${escapeHtml(c.letter)}</span><span>${c.done}/${c.planned}</span></div>
      <div class="hist-cc-n">${text}</div>
      <div class="hist-cc-pb"><i style="width:${pct}%"></i></div>
    </button>`;
  };

  const first = week[0].date, last = week[6].date;
  const isCur = histState.covWeek === 0;
  box.innerHTML = `
    <div class="hist-cov-h">
      <span class="hist-cov-title">Покрытие смен Чек-листа CL</span>
      <span class="hist-cov-sub">${escapeHtml(histState.line)} · ${fmtShortDate(first)} – ${fmtShortDate(last)}${isCur ? ' · текущая неделя' : ''}</span>
      <span class="hist-sp"></span>
      <button type="button" class="cil-week-btn" data-hist-week="-1" title="Предыдущая неделя"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg></button>
      ${!isCur ? '<button type="button" class="cil-week-today" data-hist-week="0">Сегодня</button>' : ''}
      <button type="button" class="cil-week-btn" data-hist-week="1" title="Следующая неделя" ${isCur ? 'disabled' : ''}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg></button>
    </div>
    <div class="hist-cw">
      <span></span>
      ${week.map(d => `<div class="hist-cw-dh ${d.isToday ? 'today' : ''}">${d.dayName}<small>${fmtShortDate(d.date)}${d.isToday ? ' · сегодня' : ''}</small></div>`).join('')}
      <div class="hist-cw-rl">День<small>09–21</small></div>
      ${week.map(d => cell(d, 'day')).join('')}
      <div class="hist-cw-rl">Ночь<small>21–09</small></div>
      ${week.map(d => cell(d, 'night')).join('')}
    </div>
    <div class="hist-covsum">
      <span>Смен прошло: <b>${sum.past}</b></span>
      <span class="hist-c-ok">✓ полностью: <b>${sum.ok}</b></span>
      <span class="hist-c-warn">◐ частично: <b>${sum.partial}</b></span>
      <span class="hist-c-warn">? пропущено: <b>${sum.missed}</b>${missedList.length ? ' (' + escapeHtml(missedList.join('; ')) + ')' : ''}</span>
      <span class="hist-c-fail">✕ с отклонениями: <b>${sum.fail}</b></span>
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

function histStatusTag(c) {
  if (c.fail) return `<span class="hist-tag hist-tag-fail" title="Отклонения нужно записать в Machine Journal">${CIL_ICONS.warn}Machine Journal</span>`;
  if (c.unchecked) return '<span class="hist-tag hist-tag-warn">не всё проверено</span>';
  return `<span class="hist-tag hist-tag-ok">${CIL_ICONS.check}в норме</span>`;
}

function renderHistFeed(list) {
  const box = $('#historyList');
  if (!list.length) {
    box.innerHTML = '<div class="card hist-empty">Проверок по выбранным фильтрам нет</div>';
    return;
  }
  const shown = list.slice(0, histState.limit);
  let html = '';
  let curDay = null;
  shown.forEach(h => {
    const s = histShift(h);
    if (s.date !== curDay) {
      if (curDay !== null) html += '</div>';
      curDay = s.date;
      const dt = histDayTitle(s.date);
      const full = histDayName(s.date) + ' ' + fmtShortDate(s.date);
      html += `<div class="hist-day">${escapeHtml(dt)}${dt !== full ? `<span>${escapeHtml(full)}</span>` : ''}</div><div class="card hist-feed">`;
    }
    const c = histCounts(h);
    const firstFail = (h.items || []).find(it => it.status === 'FAIL');
    const failNote = firstFail
      ? `<div class="hist-rec-dev">${c.fail > 1 ? c.fail + ' откл. · ' : ''}${escapeHtml(firstFail.oplNumber || histItemTitle(firstFail))}: ${escapeHtml(histDeviationText(h, firstFail))}</div>` : '';
    html += `<button type="button" class="hist-rec" data-hist-open="${escapeAttr(h.id)}">
      <div class="hist-rec-tm">${histTime(h)}<small>${escapeHtml(histShiftLabel(s))}</small></div>
      ${histIcon(histKind(h))}
      <div class="hist-rec-t"><b>${escapeHtml(histKindLabel(h))}</b><div>${histRecordSub(h)}</div></div>
      <div class="hist-rec-ctx">${histRecordContext(h)}${failNote}</div>
      ${histResultHtml(c)}
      <div class="hist-rec-tag">${histStatusTag(c)}</div>
    </button>`;
  });
  html += '</div>';
  if (list.length > shown.length) {
    html += `<button type="button" class="btn btn-secondary hist-more" data-hist-more>Показать ещё (${list.length - shown.length})</button>`;
  }
  box.innerHTML = html;
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
      ${topBlock('По бригадам', byBrigade)}
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
              <td class="hist-sub">${it.comment ? '💬 ' + escapeHtml(it.comment) : '—'}</td>
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
  const kind = t.closest('[data-hist-kind]');
  if (kind) {
    const k = kind.dataset.histKind;
    const set = new Set(histState.kinds);
    if (set.has(k)) set.delete(k); else set.add(k);
    if (!set.size) Object.keys(HIST_KINDS).forEach(x => set.add(x));
    histState.kinds = [...set];
    return histFilterChanged();
  }
  const week = t.closest('[data-hist-week]');
  if (week) {
    const d = parseInt(week.dataset.histWeek, 10);
    histState.covWeek = d === 0 ? 0 : Math.min(0, histState.covWeek + d);
    return renderHistory();
  }
  if (t.closest('[data-hist-more]')) { histState.limit += HIST_PAGE; return renderHistory(); }
  const shiftCell = t.closest('[data-hist-shift]');
  if (shiftCell) {
    const [date, shift] = shiftCell.dataset.histShift.split('|');
    return openHistoryShift(histState.line, date, shift);
  }
  const open = t.closest('[data-hist-open]');
  if (open && !t.closest('#histRecordView, #histStdView')) return openHistoryRecord(open.dataset.histOpen);
});

$('#filterLine')?.addEventListener('change', (e) => {
  histState.line = e.target.value;
  histState.covWeek = 0;
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
