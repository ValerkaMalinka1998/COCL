/* ============================================================
   ИСТОРИЯ: история одного стандарта / E-Param
   Все проверки стандарта на линии (Чек-лист CL, TOP Losses, COCL)
   за 7 / 30 / 90 дней: сводка, график значений по точкам на фоне
   нормы и таблица проверок.
   Модуль общего пространства имён: функции и переменные видны
   во всех файлах. Порядок подключения — index.html.
   ============================================================ */

const histStd = { id: null, line: '', days: 30, from: 'history', pager: { page: 1, size: 20 } };

function openStandardHistory(stdId, line, opts = {}) {
  const row = histFindRow(stdId);
  if (!row) return showToast('Стандарт не найден', true);
  Object.assign(histStd, { id: stdId, line: line || row.line || '' });
  histStd.pager.page = 1;
  if (opts.from === 'record') {
    histStd.from = 'record';
    histShowView('histStdView');
    window.scrollTo(0, 0);
  } else {
    const active = document.querySelector('.tab.active')?.id?.replace('tab-', '') || 'history';
    if (active === 'history' && !$('#histMainView')?.classList.contains('hist-hidden')) histState.scrollY = window.scrollY;
    histStd.from = opts.from || active;
    if (active !== 'history' && typeof switchTab === 'function') switchTab('history');
    histShowView('histStdView');
    window.scrollTo(0, 0);
  }
  renderStandardHistory();
}

function histStdBack() {
  if (histStd.from === 'record') {
    histShowView('histRecordView');
    renderHistRecordPage();
    return;
  }
  const from = histStd.from;
  if (from && from !== 'history' && typeof switchTab === 'function') return switchTab(from);
  renderHistory();
  window.scrollTo(0, histState.scrollY || 0);
}

function histStdData() {
  const row = histFindRow(histStd.id);
  if (!row) return null;
  const isElec = !('measurements' in row) && ('paramName' in row || 'valuesByBrand' in row);
  const cur = getCurrentShiftPeriod();
  const fromDate = addDaysISO(cur.date, -(histStd.days - 1));
  const all = histStdEntries(histStd.line).get(histStd.id) || [];
  const entries = all.filter(e => histShift(e.h).date >= fromDate)
    .map(e => ({ ...e, s: histShift(e.h), pts: histItemPoints(e.h, e.it) }));

  // Пропуски по расписанию
  let missed = 0;
  const idx = histClIndex(histStd.line);
  for (let d = fromDate; d <= cur.date; d = addDaysISO(d, 1)) {
    const letters = getShiftsForDate(d);
    ['day', 'night'].forEach(shift => {
      if (!isShiftPast(d, shift)) return;
      if (!histIsPlanned(row, histStd.line, d, shift)) return;
      if (!idx.has(`${d}|${letters[shift]}|${row.id}`)) missed++;
    });
  }
  return { row, isElec, entries, missed, fromDate };
}

function renderStandardHistory() {
  const box = $('#histStdView');
  if (!box) return;
  const data = histStdData();
  if (!data) { box.innerHTML = '<div class="card hist-empty">Стандарт не найден</div>'; return; }
  const { row, isElec, entries, missed } = data;
  const title = row.title || row.paramName || '—';
  const nPoints = Math.max(0, ...entries.map(e => (e.pts || []).length));

  const fails = entries.filter(e => e.it.status === 'FAIL').length;
  const unchecked = entries.filter(e => e.it.status === 'UNCHECKED').length;
  const checked = entries.length - unchecked;

  const sub = [histStd.line, row.machine, row.nodePart, row.node,
    controlTypeLabel(isElec ? row.controlType : migrateControlType(row.controlType, row.measurements)),
    nPoints ? nPoints + ' ' + cilPointsWord(nPoints) : ''].filter(Boolean);


  const allRows = entries.slice().reverse();
  const { from, to } = pagerRange(histStd.pager, allRows.length);
  const tableRows = allRows.slice(from, to);

  box.innerHTML = `
    <div class="card hist-std-head">
      <div class="hist-std-top">
        <button type="button" class="btn btn-secondary" data-hist-std-back>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
          Назад
        </button>
        <div class="hist-rp-tt">
          <h2>${row.oplNumber ? `<span class="hist-opl">${escapeHtml(row.oplNumber)}</span> · ` : ''}${escapeHtml(title)}${isElec ? ' <span class="hist-tag hist-tag-elec">E-Param</span>' : ''}</h2>
          <div class="hist-sub">${escapeHtml(sub.join(' · '))}</div>
        </div>
        <span class="hist-sp"></span>
        <div class="hist-seg">
          ${[7, 30, HIST_STD_MAX_DAYS].map(d => `<button type="button" class="${d === histStd.days ? 'on' : ''}" data-hist-std-days="${d}">${d} дней</button>`).join('')}
        </div>
        ${!isElec ? `<button type="button" class="btn btn-secondary" data-hist-std-open>${CIL_ICONS.eye} Стандарт</button>` : ''}
      </div>
      <div class="hist-kpis">
        <div class="hist-kpi"><b>${checked}</b><span>${pluralRu(checked, 'проверка', 'проверки', 'проверок')} за ${histStd.days} дней</span></div>
        <div class="hist-kpi ${fails ? 'hist-kpi-fail' : ''}"><b>${fails}</b><span>${pluralRu(fails, 'отклонение', 'отклонения', 'отклонений')}${checked ? ' (' + Math.round(fails / checked * 100) + '%)' : ''}</span></div>
        <div class="hist-kpi ${missed + unchecked ? 'hist-kpi-warn' : ''}"><b>${missed + unchecked}</b><span>пропущено / не проверено</span></div>
      </div>
    </div>
    <div class="card hist-chart-card">
      <div class="hist-chart-h"><h3>Отклонения по проверкам</h3></div>
      ${histStdChart(entries, data.fromDate, getCurrentShiftPeriod().date, histStd.days <= 7)}
      <div class="hist-sub">Столбик — число проверок с отклонением за ${histStd.days <= 7 ? 'сутки' : 'неделю'}. Лента ниже — каждая проверка по порядку:
      зелёная — в норме, красная — отклонение, жёлтая — не проверено. Стандарт в отклонении, если вышла любая из точек.</div>
    </div>
    <div class="card hist-dev-card">
      ${entries.length ? `<table class="hist-dev">
        <thead><tr><th>Когда</th><th>Проверка</th><th>Бр.</th><th>Результат</th><th>Значения</th><th>Комментарий</th></tr></thead>
        <tbody>${tableRows.map(e => `
          <tr data-hist-std-rec="${escapeAttr(e.h.id)}" title="Открыть проверку">
            <td><b>${histDayName(e.s.date)} ${fmtShortDate(e.s.date)}</b> ${e.s.shift === 'day' ? 'день' : 'ночь'}<div class="hist-sub">${histTime(e.h)}</div></td>
            <td>${escapeHtml(HIST_KINDS[histKind(e.h)].short)}</td>
            <td>${escapeHtml(e.s.letter || '—')}</td>
            <td><span class="hist-st hist-st-${e.it.status === 'OK' ? 'o' : e.it.status === 'FAIL' ? 'x' : 'u'}">${e.it.status === 'OK' ? CIL_ICONS.check : e.it.status === 'FAIL' ? CIL_ICONS.x : '?'}</span></td>
            <td>${e.pts ? e.pts.map((p, i) => `<span class="hist-pt ${p.bad ? 'bad' : ''}">${e.pts.length > 1 ? `<i class="hist-pt-n">т.${i + 1}</i>` : ''}<b>${escapeHtml(p.value || '—')}</b></span>`).join('') : `<span class="hist-pt">${e.it.status === 'OK' ? 'ОК' : e.it.status === 'FAIL' ? 'Не ОК' : 'не проверено'}</span>`}</td>
            <td class="hist-sub">${e.it.comment ? cmtLine(e.it.comment) : '—'}</td>
          </tr>`).join('')}</tbody>
      </table>
      <div class="pagination-bar" id="histStdPagination"></div>` : `<div class="hist-empty">За ${histStd.days} дней проверок этого стандарта нет</div>`}
    </div>`;

  renderPager($('#histStdPagination'), histStd.pager, allRows.length, renderStandardHistory);
}

/* ------------------------------------------------------------
   Отклонения по периодам: столбик — сколько проверок с отклонением
   («2 из 14»); для 7 дней период — сутки, для 30 и 90 — неделя.
   Под столбиками — лента всех проверок: ОК / отклонение / не проверено.
   ------------------------------------------------------------ */
function histStdBuckets(entries, fromDate, toDate, byDay) {
  const monday = (d) => {
    const dt = new Date(d + 'T12:00:00');
    return addDaysISO(d, -((dt.getDay() + 6) % 7));
  };
  const key = (d) => byDay ? d : monday(d);
  const map = new Map();
  for (let d = byDay ? fromDate : monday(fromDate); d <= toDate; d = addDaysISO(d, byDay ? 1 : 7)) {
    map.set(d, { start: d, total: 0, fails: 0 });
  }
  entries.forEach(e => {
    const b = map.get(key(e.s.date));
    if (!b) return;
    if (e.it.status === 'UNCHECKED') return;
    b.total++;
    if (e.it.status === 'FAIL') b.fails++;
  });
  return [...map.values()];
}

function histStdChart(entries, fromDate, toDate, byDay) {
  if (!entries.length) return '<div class="hist-empty">Проверок за период нет</div>';
  const buckets = histStdBuckets(entries, fromDate, toDate, byDay);
  const maxF = Math.max(1, ...buckets.map(b => b.fails));
  const label = (b) => byDay
    ? `${histDayName(b.start)} ${fmtShortDate(b.start)}`
    : `${fmtShortDate(b.start)} – ${fmtShortDate(addDaysISO(b.start, 6))}`;

  const bars = `<div class="hist-bars">${buckets.map(b => `
    <div class="hist-bar-col" title="${escapeAttr(label(b) + ': ' + (b.total ? b.fails + ' из ' + b.total + ' проверок с отклонением' : 'проверок нет'))}">
      <div class="hist-bar-num ${b.fails ? 'bad' : ''}">${b.total ? b.fails + '<small> из ' + b.total + '</small>' : '<small>—</small>'}</div>
      <div class="hist-bar-area"><i class="hist-bar ${b.fails ? 'bad' : (b.total ? 'ok' : 'none')}" style="height:${b.fails ? Math.max(8, Math.round(b.fails / maxF * 100)) : (b.total ? 3 : 0)}%"></i></div>
      <div class="hist-bar-lbl">${escapeHtml(byDay ? histDayName(b.start) : fmtShortDate(b.start))}</div>
    </div>`).join('')}</div>`;

  const tape = `<div class="hist-tape">${entries.map(e => {
    const st = e.it.status;
    return `<i class="hist-tape-i hist-tape-${st === 'OK' ? 'o' : st === 'FAIL' ? 'x' : 'u'}"
      title="${escapeAttr(fmtShortDate(e.s.date) + ' ' + (e.s.shift === 'day' ? 'день' : 'ночь') + ': ' + (st === 'OK' ? 'в норме' : st === 'FAIL' ? 'отклонение' : 'не проверено'))}"></i>`;
  }).join('')}</div>`;
  return bars + tape;
}

$('#histStdView')?.addEventListener('click', (e) => {
  const t = e.target;
  if (t.closest('[data-hist-std-back]')) return histStdBack();
  const d = t.closest('[data-hist-std-days]');
  if (d) { histStd.days = parseInt(d.dataset.histStdDays, 10); histStd.pager.page = 1; return renderStandardHistory(); }
  if (t.closest('[data-hist-std-open]')) {
    if (typeof openStandardView === 'function') openStandardView(histStd.id);
    return;
  }
  const r = t.closest('[data-hist-std-rec]');
  if (r) {
    Object.assign(histPage, { kind: 'record', id: r.dataset.histStdRec, line: histStd.line });
    histPage.from = 'history';
    histShowView('histRecordView');
    renderHistRecordPage();
    window.scrollTo(0, 0);
  }
});
