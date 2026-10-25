/* ============================================================
   ИСТОРИЯ: история одного стандарта / E-Param
   Все проверки стандарта на линии (Чек-лист CL, TOP Losses, COCL)
   за всё время: факты, «где выходит из нормы» (бренды, смены),
   и таблица всех проверок.
   Модуль общего пространства имён: функции и переменные видны
   во всех файлах. Порядок подключения — index.html.
   ============================================================ */

const histStd = { id: null, line: '', from: 'history', pager: { page: 1, size: 20 } };

/* Пропуски по расписанию — за столько дней; меньше HIST_STD_FEW проверок — «мало проверок» */
const HIST_STD_MISS_DAYS = 30;
const HIST_STD_FEW = 5;

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
  const entries = (histStdEntries(histStd.line).get(histStd.id) || [])
    .map(e => ({ ...e, s: histShift(e.h), pts: histItemPoints(e.h, e.it) }));

  // Пропуски по расписанию
  // Пропуск считается один раз — в смене пропуска (и если закрыт позже)
  let missed = 0;
  const missFrom = addDaysISO(cur.date, -(HIST_STD_MISS_DAYS - 1));
  const tally = clTallyIndex(histStd.line, missFrom, cur.date, [{ row, isElec }]);
  tally.forEach((k, key) => {
    const [d, shift] = key.split('|');
    if (isShiftPast(d, shift) && (k === 'missed' || k === 'late')) missed++;
  });
  return { row, isElec, entries, missed, cur };
}

/* Бренд проверки: в переходе — бренд, на который перешли */
function histStdBrand(h) {
  return h.brandActual || h.brandTo || '';
}

/* «Где выходит из нормы»: доля отклонений по брендам и сменам — только если отклонения есть */
function histStdWhereHtml(checked) {
  if (!checked.some(e => e.it.status === 'FAIL')) return '';
  const group = (keyOf) => {
    const map = {};
    checked.forEach(e => {
      const k = keyOf(e) || '—';
      const x = map[k] || (map[k] = { k, n: 0, total: 0 });
      x.total++;
      if (e.it.status === 'FAIL') x.n++;
    });
    return Object.values(map).sort((a, b) => (b.n - a.n) || a.k.localeCompare(b.k, 'ru', { numeric: true }));
  };
  const col = (title, list, label) => `<div>
    <div class="hist-std-wh">${title}</div>
    ${list.map(x => {
      const few = x.total < HIST_STD_FEW;
      return `<div class="hist-std-wr">
      <span>${escapeHtml(label(x.k))}</span>
      <span class="hist-std-wb"><i style="width:${Math.round(x.n / x.total * 100)}%"></i></span>
      <span class="${x.n && !few ? 'hist-std-wbad' : 'hist-std-wdim'}">${x.n} из ${x.total}${few ? ' · мало проверок' : ''}</span>
    </div>`;
    }).join('')}
  </div>`;
  return `<section class="card hist-std-sec">
    <h3 class="hist-std-h">Где выходит из нормы: бренды и смены</h3>
    <p class="hist-std-d">Если отклонения на одном бренде — проблема в норме этого бренда, а не в оборудовании.</p>
    <div class="hist-std-where">
      ${col('Бренды', group(e => histStdBrand(e.h)), k => k === '—' ? 'Бренд не указан' : k)}
      ${col('Смены', group(e => e.s.letter), k => k === '—' ? 'Смена не указана' : 'Смена ' + k)}
    </div>
  </section>`;
}

function renderStandardHistory() {
  const box = $('#histStdView');
  if (!box) return;
  const data = histStdData();
  if (!data) { box.innerHTML = '<div class="card hist-empty">Стандарт не найден</div>'; return; }
  const { row, isElec, entries, missed, cur } = data;
  const title = row.title || row.paramName || '—';
  const nPoints = Math.max(0, ...entries.map(e => (e.pts || []).length));

  const checked = entries.filter(e => e.it.status === 'OK' || e.it.status === 'FAIL');
  const fails = checked.filter(e => e.it.status === 'FAIL').length;
  const last = checked[checked.length - 1];
  const lastFail = checked.filter(e => e.it.status === 'FAIL').pop();
  const daysAgo = (d) => Math.round((new Date(cur.date + 'T12:00:00') - new Date(d + 'T12:00:00')) / 864e5);
  const agoText = (n) => n <= 0 ? 'сегодня' : n === 1 ? 'вчера' : `${n} ${pluralRu(n, 'день', 'дня', 'дней')} назад`;
  const whenText = (e) => `${histDayName(e.s.date)} ${fmtShortDate(e.s.date)} ${e.s.shift === 'day' ? 'день' : 'ночь'}${e.s.letter ? ' · ' + e.s.letter : ''}`;
  // Давно не проверяли — объясняем, почему свежих проверок нет
  const stale = !last || daysAgo(last.s.date) >= HIST_STD_MISS_DAYS;

  const sub = [histStd.line, row.machine, row.nodePart, row.node,
    controlTypeLabel(isElec ? row.controlType : migrateControlType(row.controlType, row.measurements)),
    nPoints ? nPoints + ' ' + cilPointsWord(nPoints) : ''].filter(Boolean);


  const allRows = entries.slice().reverse();
  const { from, to } = pagerRange(histStd.pager, allRows.length);
  const tableRows = allRows.slice(from, to);

  box.innerHTML = `
    <div class="page-head">
      <div class="ph-context">
        <button type="button" class="btn btn-secondary" data-hist-std-back>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
          Назад
        </button>
      </div>
      <div class="ph-main">
        <div class="ph-title">
          <h2 class="ph-h1">${row.oplNumber ? `<span class="hist-opl">${escapeHtml(row.oplNumber)}</span> · ` : ''}${escapeHtml(title)}${isElec ? ' <span class="hist-tag hist-tag-elec">E-Param</span>' : ''}</h2>
          <span class="ph-sub">${escapeHtml(sub.join(' · '))}</span>
        </div>
        ${!isElec ? `<div class="ph-actions"><button type="button" class="btn btn-secondary" data-hist-std-open>${CIL_ICONS.eye} Стандарт</button></div>` : ''}
      </div>
    </div>
    <section class="card hist-std-sec">
      <div class="hist-std-facts">
        <div class="hist-std-f"><b>${last ? agoText(daysAgo(last.s.date)) : '—'}</b><span>${last ? 'последняя проверка · ' + escapeHtml(whenText(last)) : 'проверок ещё не было'}</span></div>
        <div class="hist-std-f ${lastFail ? 'is-bad' : ''}"><b>${lastFail ? fmtShortDate(lastFail.s.date) : '—'}</b><span>${lastFail ? 'последнее отклонение · ' + escapeHtml(whenText(lastFail)) : 'отклонений не было'}</span></div>
        <div class="hist-std-f ${fails ? 'is-bad' : ''}"><b>${fails} из ${checked.length}</b><span>проверок с отклонением · за всё время</span></div>
        <div class="hist-std-f"><b>${missed}</b><span>пропущено по расписанию · за ${HIST_STD_MISS_DAYS} дней</span></div>
      </div>
      ${stale ? `<div class="hist-std-stale"><b>${last ? `За последние ${HIST_STD_MISS_DAYS} дней проверок не было.` : 'Этот стандарт ещё ни разу не проверяли.'}</b>${last ? ` Последняя — ${escapeHtml(whenText(last))}, ${last.it.status === 'FAIL' ? 'с отклонением' : 'в норме'}.` : ''}
        <span class="hist-sub">${missed ? `По расписанию пропущено ${missed} ${pluralRu(missed, 'смена', 'смены', 'смен')}.` : 'Проверьте, стоит ли он в расписании линии.'}</span></div>` : ''}
      ${entries.length ? `<div class="hist-std-tbw"><table class="hist-std-tb">
        <thead><tr><th>Когда</th><th>Проверка</th><th>Смена</th><th>Результат</th><th>Значения</th><th>Комментарий</th></tr></thead>
        <tbody>${tableRows.map(e => `
          <tr data-hist-std-rec="${escapeAttr(e.h.id)}" title="Открыть проверку">
            <td><b>${histDayName(e.s.date)} ${fmtShortDate(e.s.date)}</b> <span class="hist-std-dim">${e.s.shift === 'day' ? 'день' : 'ночь'} · ${histTime(e.h)}</span></td>
            <td>${escapeHtml(HIST_KINDS[histKind(e.h)].short)}</td>
            <td>${escapeHtml(e.s.letter || '—')}</td>
            <td><span class="hist-std-st hist-std-st-${e.it.status === 'OK' ? 'o' : e.it.status === 'FAIL' ? 'x' : 'u'}">${e.it.status === 'OK' ? '✓' : e.it.status === 'FAIL' ? '✕' : '?'}</span></td>
            <td>${e.pts ? e.pts.map((p, i) => `<span class="hist-std-pt${p.bad ? ' bad' : ''}">${e.pts.length > 1 ? `<i>т.${i + 1}</i> ` : ''}${escapeHtml(p.value || '—')}</span>`).join('') : `<span class="hist-std-pt${e.it.status === 'FAIL' ? ' bad' : ''}">${e.it.status === 'OK' ? 'ОК' : e.it.status === 'FAIL' ? 'Не ОК' : 'не проверено'}</span>`}</td>
            <td class="hist-std-dim">${e.it.comment ? cmtLine(e.it.comment) : '—'}</td>
          </tr>`).join('')}</tbody>
      </table></div>
      <div class="pagination-bar" id="histStdPagination"></div>` : '<div class="hist-empty">Проверок этого стандарта пока нет</div>'}
    </section>
    ${histStdWhereHtml(checked)}`;

  renderPager($('#histStdPagination'), histStd.pager, allRows.length, renderStandardHistory);
}

$('#histStdView')?.addEventListener('click', (e) => {
  const t = e.target;
  if (t.closest('[data-hist-std-back]')) return histStdBack();
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
