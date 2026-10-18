/* ============================================================
   ИСТОРИЯ: история одного стандарта / E-Param
   Все проверки стандарта на линии (Чек-лист CL, TOP Losses, COCL)
   за 7 / 30 / 90 дней: сводка, график значений по точкам на фоне
   нормы и таблица проверок.
   Модуль общего пространства имён: функции и переменные видны
   во всех файлах. Порядок подключения — index.html.
   ============================================================ */

const histStd = { id: null, line: '', days: 30, point: 0, from: 'history' };

function openStandardHistory(stdId, line, opts = {}) {
  const row = histFindRow(stdId);
  if (!row) return showToast('Стандарт не найден', true);
  Object.assign(histStd, { id: stdId, line: line || row.line || '', point: 0 });
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
  if (histStd.point >= nPoints) histStd.point = 0;

  const fails = entries.filter(e => e.it.status === 'FAIL').length;
  const unchecked = entries.filter(e => e.it.status === 'UNCHECKED').length;
  const checked = entries.length - unchecked;

  // Запас до границы нормы по последнему значению выбранной точки
  let marginHtml = '<b>—</b><span>запас до границы нормы</span>';
  const withVal = entries.filter(e => e.pts && e.pts[histStd.point] && histNum(e.pts[histStd.point].value) != null && e.pts[histStd.point].range);
  const lastV = withVal[withVal.length - 1];
  if (lastV) {
    const p = lastV.pts[histStd.point];
    const v = histNum(p.value), r = p.range, w = r.max - r.min;
    if (w > 0) {
      const m = Math.round(Math.min(v - r.min, r.max - v) / w * 100);
      const cls = m < 0 ? 'hist-kpi-fail' : m < 15 ? 'hist-kpi-warn' : 'hist-kpi-ok';
      marginHtml = `<b>${m < 0 ? 'вне нормы' : m + '%'}</b><span>${nPoints > 1 ? 'т.' + (histStd.point + 1) + ': ' : ''}запас до границы по последнему замеру</span>`;
      marginHtml = `<div class="hist-kpi ${cls}">${marginHtml}</div>`;
    }
  }
  if (!marginHtml.startsWith('<div')) marginHtml = `<div class="hist-kpi">${marginHtml}</div>`;

  const sub = [histStd.line, row.machine, row.nodePart, row.node,
    controlTypeLabel(isElec ? row.controlType : migrateControlType(row.controlType, row.measurements)),
    nPoints ? nPoints + ' ' + cilPointsWord(nPoints) : ''].filter(Boolean);

  const pointSeg = nPoints > 1 ? `<div class="hist-seg">${Array.from({ length: nPoints }, (_, i) => {
    const lbl = (entries.find(e => e.pts && e.pts[i] && e.pts[i].label) || {}).pts?.[i]?.label || '';
    return `<button type="button" class="${i === histStd.point ? 'on' : ''}" data-hist-std-point="${i}">т.${i + 1}${lbl ? ' · ' + escapeHtml(lbl) : ''}</button>`;
  }).join('')}</div>` : '';

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
        ${marginHtml}
      </div>
    </div>
    ${nPoints ? `<div class="card hist-chart-card">
      <div class="hist-chart-h"><h3>Значения по точкам</h3><span class="hist-sp"></span>${pointSeg}</div>
      ${histStdChart(entries, histStd.point)}
      <div class="hist-sub">Зелёная полоса — норма. Красные точки — значения вне нормы. Видно, как значение подходит к границе ещё до отклонения.</div>
    </div>` : ''}
    <div class="card hist-dev-card">
      ${entries.length ? `<table class="hist-dev">
        <thead><tr><th>Когда</th><th>Проверка</th><th>Бр.</th><th>Результат</th><th>Значения</th><th>Комментарий</th></tr></thead>
        <tbody>${entries.slice().reverse().map(e => `
          <tr data-hist-std-rec="${escapeAttr(e.h.id)}" title="Открыть проверку">
            <td><b>${histDayName(e.s.date)} ${fmtShortDate(e.s.date)}</b> ${e.s.shift === 'day' ? 'день' : 'ночь'}<div class="hist-sub">${histTime(e.h)}</div></td>
            <td>${escapeHtml(HIST_KINDS[histKind(e.h)].short)}</td>
            <td>${escapeHtml(e.s.letter || '—')}</td>
            <td><span class="hist-st hist-st-${e.it.status === 'OK' ? 'o' : e.it.status === 'FAIL' ? 'x' : 'u'}">${e.it.status === 'OK' ? CIL_ICONS.check : e.it.status === 'FAIL' ? CIL_ICONS.x : '?'}</span></td>
            <td>${e.pts ? e.pts.map((p, i) => `<span class="hist-pt ${p.bad ? 'bad' : ''}">${e.pts.length > 1 ? 'т.' + (i + 1) + ' ' : ''}<b>${escapeHtml(p.value || '—')}</b></span>`).join('') : `<span class="hist-pt">${e.it.status === 'OK' ? 'ОК' : e.it.status === 'FAIL' ? 'Не ОК' : 'не проверено'}</span>`}</td>
            <td class="hist-sub">${e.it.comment ? cmtLine(e.it.comment) : '—'}</td>
          </tr>`).join('')}</tbody>
      </table>` : `<div class="hist-empty">За ${histStd.days} дней проверок этого стандарта нет</div>`}
    </div>`;
}

/* SVG-график значений одной точки */
function histStdChart(entries, pi) {
  const pts = entries.map(e => {
    const p = e.pts && e.pts[pi];
    return p ? { v: histNum(p.value), r: p.range, bad: p.bad, e } : null;
  }).filter(x => x && x.v != null);
  if (!pts.length) return '<div class="hist-empty">Нет числовых значений для графика</div>';

  const W = 900, H = 220, L = 52, R = 20, T = 14, B = 30;
  const range = (pts.find(p => p.r) || {}).r || null;
  let lo = Math.min(...pts.map(p => p.v)), hi = Math.max(...pts.map(p => p.v));
  if (range) { lo = Math.min(lo, range.min); hi = Math.max(hi, range.max); }
  const pad = (hi - lo) * 0.15 || Math.abs(hi) * 0.1 || 1;
  lo -= pad; hi += pad;
  const x = i => pts.length === 1 ? (L + W - R) / 2 : L + i * (W - L - R) / (pts.length - 1);
  const y = v => T + (hi - v) / (hi - lo) * (H - T - B);

  let s = '';
  if (range) {
    s += `<rect x="${L}" y="${y(range.max)}" width="${W - L - R}" height="${Math.max(1, y(range.min) - y(range.max))}" class="hist-ch-band"/>`;
    [range.min, range.max].forEach(v => {
      s += `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" class="hist-ch-norm"/><text x="${L - 6}" y="${y(v) + 3}" text-anchor="end">${fmtNum(v)}</text>`;
    });
  }
  s += `<polyline class="hist-ch-line" points="${pts.map((p, i) => x(i) + ',' + y(p.v)).join(' ')}"/>`;
  const step = Math.max(1, Math.ceil(pts.length / 10));
  pts.forEach((p, i) => {
    s += `<circle cx="${x(i)}" cy="${y(p.v)}" r="${p.bad ? 6 : 4.5}" class="${p.bad ? 'hist-ch-bad' : 'hist-ch-pt'}"><title>${fmtShortDate(p.e.s.date)} ${p.e.s.shift === 'day' ? 'день' : 'ночь'}: ${p.v}</title></circle>`;
    if (i % step === 0 || i === pts.length - 1) {
      s += `<text x="${x(i)}" y="${H - 8}" text-anchor="middle">${fmtShortDate(p.e.s.date)}${p.e.s.shift === 'night' ? ' н' : ''}</text>`;
    }
  });
  return `<svg class="hist-chart" viewBox="0 0 ${W} ${H}" width="100%">${s}</svg>`;
}

$('#histStdView')?.addEventListener('click', (e) => {
  const t = e.target;
  if (t.closest('[data-hist-std-back]')) return histStdBack();
  const d = t.closest('[data-hist-std-days]');
  if (d) { histStd.days = parseInt(d.dataset.histStdDays, 10); return renderStandardHistory(); }
  const p = t.closest('[data-hist-std-point]');
  if (p) { histStd.point = parseInt(p.dataset.histStdPoint, 10); return renderStandardHistory(); }
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
