/* ============================================================
   ВКЛАДКА «Дашборд»
   Главный экран — «Карта производства»: показатели периода,
   плитки цех → участок → линия, «Требует внимания», динамика по
   неделям, повторяющиеся отклонения.
   Клик по линии — «Паспорт линии».
   Расчёты опираются на функции Истории (history-data.js).
   Модуль общего пространства имён: функции и переменные видны
   во всех файлах. Порядок подключения — index.html.
   ============================================================ */

const DASH_PERIODS = { shift: 1, day: 2, '7': 14, '30': 60, all: 0, custom: 0 };
const DASH_PERIOD_LABELS = { shift: 'текущая смена', day: 'последние сутки', '7': '7 дней', '30': '30 дней', all: 'всё время', custom: 'выбранный период' };
const DASH_PERIOD_BTNS = [['shift', 'Смена'], ['day', 'Сутки'], ['7', '7 дней'], ['30', '30 дней'], ['all', 'Всё'], ['custom', 'Период…']];

const dashState = {
  view: (() => { try { return localStorage.getItem('cl_dashboard_view') === 'period' ? 'period' : 'now'; } catch (e) { return 'now'; } })(),
  period: (() => { try { return localStorage.getItem('cl_dashboard_period') || '7'; } catch (e) { return '7'; } })(),
  line: null,          // открыт паспорт линии
  week: 0,             // неделя покрытия в паспорте
  keepLine: false,     // вернуться в паспорт после Истории
  from: (() => { try { return localStorage.getItem('cl_dashboard_from') || ''; } catch (e) { return ''; } })(),
  to: (() => { try { return localStorage.getItem('cl_dashboard_to') || ''; } catch (e) { return ''; } })()
};
if (!(dashState.period in DASH_PERIODS)) dashState.period = '7';

/* ============================================================
   ДАННЫЕ
   ============================================================ */

/* Смены периода: последние N смен до текущей (back — сдвиг на N назад) */
function dashSlots(period, back = 0) {
  const cur = getCurrentShiftPeriod();
  let n = DASH_PERIODS[period] || 14;
  let date = cur.date, shift = cur.shiftType;
  // «Всё» и «Период…» — от даты «с» до даты «по» (обе смены каждого дня)
  if (period === 'all' || period === 'custom') {
    let from = period === 'all' ? dashFirstDate() : (dashState.from || addDaysISO(cur.date, -6));
    let to = period === 'all' ? cur.date : (dashState.to || cur.date);
    if (to > cur.date) to = cur.date;
    if (from > to) from = to;
    const days = Math.round((new Date(to + 'T12:00:00') - new Date(from + 'T12:00:00')) / 86400000) + 1;
    n = days * 2;
    date = to; shift = 'night';
    // Не заглядываем в будущие смены
    if (to === cur.date && cur.shiftType === 'day') { shift = 'day'; n--; }
  }
  const step = () => {
    if (shift === 'night') shift = 'day';
    else { shift = 'night'; date = addDaysISO(date, -1); }
  };
  for (let i = 0; i < n * back; i++) step();
  const out = [];
  for (let i = 0; i < n; i++) { out.push({ date, shift }); step(); }
  return out;
}

function dashSlotKey(s) { return s.date + '|' + s.shift; }

/* Дата самой ранней записи истории (для «Всё») */
function dashFirstDate() {
  let first = getCurrentShiftPeriod().date;
  getHistory().forEach(h => { const d = histShift(h).date; if (d < first) first = d; });
  return first;
}

/* Линии выбранного цеха (или всех) с контекстом */
function dashLines() {
  return getAllLinesWithContext().filter(x => !dashboardWorkshop || x.workshopId === dashboardWorkshop);
}

/* Показатели Чек-листа CL линии за смены: выполнение и пропуски */
function dashClMetrics(line, slots, includeCurrent) {
  const rows = histClRows(line);
  const idx = histClIndex(line);
  const cur = getCurrentShiftPeriod();
  const m = { planned: 0, done: 0, fail: 0, missed: [], hasPlan: false };
  slots.forEach(s => {
    const isNow = s.date === cur.date && s.shift === cur.shiftType;
    if (!isNow && !isShiftPast(s.date, s.shift)) return;
    if (isNow && !includeCurrent) return;
    const letter = getShiftsForDate(s.date)[s.shift];
    let planned = 0, done = 0;
    rows.forEach(({ row }) => {
      const res = idx.get(`${s.date}|${letter}|${row.id}`);
      if (!histIsPlanned(row, line, s.date, s.shift) && !res) return;
      planned++;
      if (res && (res.it.status === 'OK' || res.it.status === 'FAIL')) done++;
      if (res && res.it.status === 'FAIL') m.fail++;
    });
    if (!planned) return;
    m.hasPlan = true;
    m.planned += planned;
    m.done += done;
    if (!done && !isNow) m.missed.push({ ...s, letter });
  });
  return m;
}

/* Все записи истории за смены периода */
function dashRecords(slots, lineSet) {
  const keys = new Set(slots.map(dashSlotKey));
  return getHistory().filter(h => (!lineSet || lineSet.has(h.line)) && keys.has(dashSlotKey(histShift(h))));
}

/* Сводка периода по набору линий */
function dashSummary(lines, slots) {
  const includeCurrent = dashState.period === 'shift';
  const lineSet = new Set(lines.map(x => x.line));
  const perLine = {};
  let planned = 0, done = 0, missed = 0;
  lines.forEach(x => {
    const m = dashClMetrics(x.line, slots, includeCurrent);
    perLine[x.line] = { ...m, fails: 0 };
    planned += m.planned; done += m.done; missed += m.missed.length;
  });
  const recs = dashRecords(slots, lineSet);
  let ok = 0, fail = 0;
  const rep = {};
  recs.forEach(h => (h.items || []).forEach(it => {
    if (it.status === 'OK') ok++;
    if (it.status === 'FAIL') {
      fail++;
      if (perLine[h.line]) perLine[h.line].fails++;
      const k = h.line + '|' + it.standardId;
      if (!rep[k]) rep[k] = { line: h.line, it, n: 0, last: h };
      rep[k].n++;
      if (histOrderKey(h) > histOrderKey(rep[k].last)) { rep[k].last = h; rep[k].it = it; }
    }
  }));
  return {
    perLine, recs,
    compliance: planned ? Math.round(done / planned * 100) : null,
    okPct: ok + fail ? Math.round(ok / (ok + fail) * 100) : null,
    fail, missed,
    repeats: Object.values(rep).filter(r => r.n >= 2).sort((a, b) => b.n - a.n)
  };
}

/* Сколько последних проверок стандарта подряд — с отклонением */
function dashFailStreak(list) {
  let n = 0;
  for (let i = list.length - 1; i >= 0 && list[i].it.status === 'FAIL'; i--) n++;
  return n;
}

/* «Требует внимания»: конкретные пункты */
function dashAttention(lines, sum) {
  const items = [];
  const lineSet = new Set(lines.map(x => x.line));

  // 1. Повторяющиеся отклонения
  sum.repeats.slice(0, 4).forEach(r => {
    const list = (histStdEntries(r.line).get(r.it.standardId)) || [];
    const streak = dashFailStreak(list);
    const s = histShift(r.last);
    items.push({
      sev: 3, kind: 'red',
      title: `${r.line} · ${r.it.oplNumber ? r.it.oplNumber + ' ' : ''}${histItemTitle(r.it)} — ${streak >= 2 ? streak + ' откл. подряд' : r.n + ' откл. за период'}`,
      sub: `${[r.it.machine, r.it.nodePart].filter(Boolean).join(' · ')} · последнее ${fmtShortDate(s.date)} ${s.shift === 'day' ? 'день' : 'ночь'} · ${s.letter}`,
      act: `data-dash-std="${escapeAttr(r.it.standardId)}" data-dash-line="${escapeAttr(r.line)}"`
    });
  });

  // 2. Пропущенные смены
  lines.forEach(x => {
    const m = sum.perLine[x.line];
    if (!m || !m.missed.length) return;
    const list = m.missed.slice(0, 4).map(s => `${histDayName(s.date)} ${s.shift === 'day' ? 'день' : 'ночь'} (${s.letter})`);
    items.push({
      sev: 2, kind: 'amber',
      title: `${x.line} — ${m.missed.length} ${pluralRu(m.missed.length, 'пропущенная смена', 'пропущенные смены', 'пропущенных смен')}`,
      sub: list.join(', ') + (m.missed.length > 4 ? '…' : ''),
      act: `data-dash-open-line="${escapeAttr(x.line)}"`
    });
  });

  return items.sort((a, b) => b.sev - a.sev);
}

/* Динамика: последние 6 недель (выполнение и отклонения) */
function dashWeeks(lines) {
  const out = [];
  const lineSet = new Set(lines.map(x => x.line));
  for (let w = -5; w <= 0; w++) {
    const days = getClWeekDays(w);
    const slots = [];
    days.forEach(d => ['day', 'night'].forEach(s => slots.push({ date: d, shift: s })));
    let planned = 0, done = 0;
    lines.forEach(x => {
      const m = dashClMetrics(x.line, slots, false);
      planned += m.planned; done += m.done;
    });
    let fail = 0;
    dashRecords(slots, lineSet).forEach(h => (h.items || []).forEach(it => { if (it.status === 'FAIL') fail++; }));
    out.push({ label: 'W' + cilIsoWeek(days[0]), compliance: planned ? Math.round(done / planned * 100) : null, fail });
  }
  return out;
}

/* ============================================================
   РЕНДЕР: ГЛАВНЫЙ ЭКРАН
   ============================================================ */
function renderDashboard() {
  const box = $('#dashboardContent');
  if (!box) return;
  dashboardWorkshop = localStorage.getItem('cl_dashboard_workshop') || '';
  renderDashboardHead();

  if (dashState.keepLine && dashState.line) {
    dashState.keepLine = false;
    return renderDashboardLine();
  }
  dashState.keepLine = false;
  dashState.line = null;
  renderDashboardHead();

  if (dashState.view === 'now') return renderDashboardNow();

  const lines = dashLines();
  const slots = dashSlots(dashState.period);
  const sum = dashSummary(lines, slots);
  const prev = dashSummary(lines, dashSlots(dashState.period, 1));

  box.innerHTML = `
    ${dashKpisHtml(sum, prev)}
    <div class="dash-g3">
      <div class="card dash-card">
        <h3 class="dash-h">Цеха и линии <small>% — выполнение расписания CL · цвет — состояние · клик — паспорт линии</small></h3>
        ${dashMapHtml(sum)}
      </div>
      <div class="card dash-card">
        <h3 class="dash-h">Требует внимания</h3>
        ${dashAttentionHtml(dashAttention(lines, sum))}
      </div>
    </div>
    <div class="dash-g2">
      <div class="card dash-card">
        <h3 class="dash-h">Динамика по неделям <small>линия — выполнение расписания CL, столбики — отклонения</small></h3>
        ${dashTrendHtml(dashWeeks(lines))}
      </div>
      <div class="card dash-card">
        <h3 class="dash-h">Где чаще отклонения <small>за период</small></h3>
        ${dashTopHtml(sum)}
      </div>
    </div>
    <div class="dash-g2">
      <div class="card dash-card">
        <h3 class="dash-h">Повторяющиеся отклонения <small>≥ 2 раз за период</small></h3>
        ${sum.repeats.length ? sum.repeats.slice(0, 8).map(r => `
          <button type="button" class="dash-li" data-dash-std="${escapeAttr(r.it.standardId)}" data-dash-line="${escapeAttr(r.line)}">
            <span>${r.it.oplNumber ? `<span class="hist-opl">${escapeHtml(r.it.oplNumber)}</span> ` : ''}${escapeHtml(histItemTitle(r.it))}
              ${histIsElecItem(r.last, r.it) ? '<span class="hist-tag hist-tag-elec">E-Param</span>' : ''}
              <span class="hist-sub"> · ${escapeHtml([r.line, r.it.machine].filter(Boolean).join(' · '))}</span></span>
            <span class="hist-tag hist-tag-fail">×${r.n}</span>
          </button>`).join('') : '<div class="dash-empty">Повторов нет</div>'}
      </div>
    </div>`;
}

/* Топ по отклонениям: машины и линии за период */
function dashTop(sum, by) {
  const map = {};
  sum.recs.forEach(h => (h.items || []).forEach(it => {
    if (it.status !== 'FAIL') return;
    const key = by === 'line' ? h.line : [it.machine || 'без машины', it.nodePart].filter(Boolean).join(' · ');
    if (!key) return;
    map[key] = (map[key] || 0) + 1;
  }));
  return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 6);
}

function dashTopHtml(sum) {
  const groups = [['Машины', dashTop(sum, 'machine'), 'machine'], ['Линии', dashTop(sum, 'line'), 'line']];
  const body = groups.map(([title, list, kind]) => {
    if (!list.length) return '';
    const max = list[0][1];
    return `<div class="dash-top">
      <div class="dash-top-h">${title}</div>
      ${list.map(([name, n]) => `
        <div class="dash-li dash-li-bar"${kind === 'line' ? ` data-dash-open-line="${escapeAttr(name)}" role="button" tabindex="0"` : ''}>
          <div><span>${escapeHtml(name)}</span><b class="hist-c-fail">${n} ${pluralRu(n, 'откл.', 'откл.', 'откл.')}</b></div>
          <div class="dash-bar"><i style="width:${Math.round(n / max * 100)}%"></i></div>
        </div>`).join('')}
    </div>`;
  }).join('');
  return body || '<div class="dash-empty">Отклонений за период нет</div>';
}

/* ============================================================
   ВКЛАДКА «СЕЙЧАС»: состояние текущей смены
   Что осталось проверить до конца смены, где уже отклонения,
   какие линии отстают. Расчёт — по окнам проверки расписания.
   ============================================================ */

/* Состояние линии в текущей смене */
function dashNowLine(line) {
  const cur = getCurrentShiftPeriod();
  const letter = getShiftsForDate(cur.date)[cur.shiftType];
  const idx = histClIndex(line);
  const m = { line, planned: 0, done: 0, fail: 0, late: 0, rows: [] };

  histClRows(line).forEach(({ row, isElec }) => {
    const res = idx.get(`${cur.date}|${letter}|${row.id}`);
    if (!histIsPlanned(row, line, cur.date, cur.shiftType) && !res) return;
    const status = res ? res.it.status : 'due';
    m.planned++;
    if (status === 'OK' || status === 'FAIL') m.done++;
    if (status === 'FAIL') m.fail++;
    const late = status === 'due' && dashWindowPassed(row);
    if (late) m.late++;
    m.rows.push({ row, isElec, status, late, it: res ? res.it : null });
  });
  return m;
}

/* Окно проверки этой смены уже прошло, а проверки нет */
function dashWindowPassed(row) {
  const freq = typeof getClRowFreq === 'function' ? getClRowFreq(row) : (row.frequency || {});
  const wins = Array.isArray(freq.timeWindows) ? freq.timeWindows : [];
  if (!wins.length) return false;
  const now = new Date();
  const mins = now.getHours() * 60 + now.getMinutes();
  const cur = getCurrentShiftPeriod();
  const isDay = cur.shiftType === 'day';
  return wins.every(w => {
    const [h, mm] = String(w.to || '').split(':').map(Number);
    if (isNaN(h)) return false;
    let end = h * 60 + (mm || 0);
    // Ночная смена идёт через полночь: окно «03:30» — это уже «завтра»
    let nowMins = mins;
    if (!isDay) {
      if (end < 9 * 60) end += 24 * 60;
      if (nowMins < 9 * 60) nowMins += 24 * 60;
    }
    return nowMins > end;
  });
}

function dashNowKpis(all) {
  const planned = all.reduce((s, m) => s + m.planned, 0);
  const done = all.reduce((s, m) => s + m.done, 0);
  const fail = all.reduce((s, m) => s + m.fail, 0);
  const late = all.reduce((s, m) => s + m.late, 0);
  const left = planned - done;
  const cur = getCurrentShiftPeriod();
  const letter = getShiftsForDate(cur.date)[cur.shiftType];
  return `<div class="dash-kpis">
    <div class="dash-kpi dash-kpi-now"><b>${cur.shiftType === 'day' ? 'День' : 'Ночь'} · ${escapeHtml(letter || '—')}</b>
      <span>${escapeHtml(fmtShortDate(cur.date))} · смена идёт</span></div>
    <div class="dash-kpi"><b class="${planned && done === planned ? 'hist-c-ok' : ''}">${done} / ${planned}</b><span>проверок сделано</span></div>
    <div class="dash-kpi"><b class="${left ? 'hist-c-warn' : 'hist-c-ok'}">${left}</b><span>осталось до конца смены</span></div>
    <div class="dash-kpi"><b class="${late ? 'hist-c-fail' : ''}">${late}</b><span>просрочено (окно прошло)</span></div>
    <div class="dash-kpi"><b class="${fail ? 'hist-c-fail' : ''}">${fail}</b><span>${pluralRu(fail, 'отклонение', 'отклонения', 'отклонений')} в смене</span></div>
  </div>`;
}

/* Линии смены: прогресс-полоса, просрочено, отклонения */
function dashNowLinesHtml(all) {
  const work = all.filter(m => m.planned);
  if (!work.length) return '<div class="dash-empty">В текущую смену проверок не запланировано</div>';
  work.sort((a, b) => (b.late - a.late) || (b.fail - a.fail) || (b.planned - b.done) - (a.planned - a.done));
  return work.map(m => {
    const pct = m.planned ? Math.round(m.done / m.planned * 100) : 0;
    const cls = m.late || m.fail ? 'red' : pct === 100 ? 'green' : 'amber';
    return `<button type="button" class="dash-now-line dash-now-${cls}" data-dash-open-line="${escapeAttr(m.line)}" title="Паспорт линии">
      <span class="dash-now-name">${escapeHtml(m.line)}</span>
      <span class="dash-now-bar"><i style="width:${pct}%"></i></span>
      <span class="dash-now-num">${m.done} / ${m.planned}</span>
      <span class="dash-now-tags">
        ${m.late ? `<span class="hist-tag hist-tag-fail">${m.late} просроч.</span>` : ''}
        ${m.fail ? `<span class="hist-tag hist-tag-fail">${m.fail} откл.</span>` : ''}
        ${!m.late && !m.fail && pct === 100 ? '<span class="hist-tag hist-tag-ok">всё сделано</span>' : ''}
      </span>
    </button>`;
  }).join('');
}

/* Что проверить прямо сейчас и что уже не в норме */
function dashNowListHtml(all) {
  const late = [];
  const fails = [];
  const due = [];
  all.forEach(m => m.rows.forEach(r => {
    const item = {
      line: m.line, row: r.row, isElec: r.isElec, it: r.it,
      title: r.row.title || r.row.paramName || '—',
      sub: [r.row.machine, r.row.nodePart, r.row.node].filter(Boolean).join(' · ')
    };
    if (r.status === 'FAIL') fails.push(item);
    else if (r.late) late.push(item);
    else if (r.status === 'due') due.push(item);
  }));

  const block = (title, list, tag, cls) => list.length ? `
    <div class="dash-top">
      <div class="dash-top-h">${title} · ${list.length}</div>
      ${list.slice(0, 8).map(x => `
        <button type="button" class="dash-li" data-dash-std="${escapeAttr(x.row.id)}" data-dash-line="${escapeAttr(x.line)}">
          <span><span class="hist-opl">${escapeHtml(x.line)}</span> ${escapeHtml(x.title)}
            <div class="hist-sub">${escapeHtml(x.sub)}</div></span>
          <span class="hist-tag hist-tag-${cls}">${tag}</span>
        </button>`).join('')}
      ${list.length > 8 ? `<div class="hist-sub">…ещё ${list.length - 8}</div>` : ''}
    </div>` : '';

  const html = block('Отклонения в этой смене', fails, 'не ОК', 'fail')
    + block('Просрочено — окно проверки прошло', late, 'просроч.', 'warn')
    + block('Ещё предстоит в эту смену', due, 'ждёт', 'ok');
  return html || '<div class="dash-empty">В текущую смену проверок не запланировано</div>';
}

function renderDashboardNow() {
  const box = $('#dashboardContent');
  if (!box) return;
  const all = dashLines().map(x => dashNowLine(x.line));
  box.innerHTML = `
    ${dashNowKpis(all)}
    <div class="dash-g3">
      <div class="card dash-card">
        <h3 class="dash-h">Линии в этой смене <small>сделано из запланированного · клик — паспорт линии</small></h3>
        ${dashNowLinesHtml(all)}
      </div>
      <div class="card dash-card">
        <h3 class="dash-h">Что требует действия <small>клик — история стандарта</small></h3>
        ${dashNowListHtml(all)}
      </div>
    </div>`;
}

function renderDashboardHead() {
  const bar = $('#dashboardWorkshopBar');
  if (!bar) return;
  const tabs = [{ id: '', name: 'Общий' }].concat(getWorkshops().map(w => ({ id: w.id, name: w.name })));
  const periodText = dashState.line || dashState.view === 'period'
    ? (dashState.period === 'custom' && (dashState.from || dashState.to)
      ? `${dashState.from ? fmtShortDate(dashState.from) : '…'} – ${dashState.to ? fmtShortDate(dashState.to) : 'сегодня'}`
        : DASH_PERIOD_LABELS[dashState.period])
    : 'текущая смена';
  const scope = dashState.line ? dashState.line
    : (dashboardWorkshop ? (getWorkshop(dashboardWorkshop)?.name || '') : 'весь завод');
  bar.innerHTML = `
    <div class="dash-title">Дашборд <small>${escapeHtml(scope)} · ${escapeHtml(periodText)}</small></div>
    <span class="hist-sp"></span>
    ${dashState.line ? '' : `<div class="hist-seg dash-view-seg">
      <button type="button" class="${dashState.view === 'now' ? 'on' : ''}" data-dash-view="now">Сейчас</button>
      <button type="button" class="${dashState.view === 'period' ? 'on' : ''}" data-dash-view="period">Период</button>
    </div>`}
    ${dashState.line ? '' : `<div class="hist-seg">${tabs.map(t =>
      `<button type="button" class="${t.id === dashboardWorkshop ? 'on' : ''}" data-dash-ws="${escapeAttr(t.id)}">${escapeHtml(t.name)}</button>`).join('')}</div>`}
    ${dashState.view === 'period' || dashState.line ? `<div class="hist-seg">${DASH_PERIOD_BTNS.map(([p, t]) =>
      `<button type="button" class="${p === dashState.period ? 'on' : ''}" data-dash-period="${p}">${t}</button>`).join('')}</div>` : ''}
    ${(dashState.view === 'period' || dashState.line) && dashState.period === 'custom' ? `<div class="hist-custom dash-custom">
      <label>С <input type="date" data-dash-date="from" value="${escapeAttr(dashState.from)}" max="${getCurrentShiftPeriod().date}"></label>
      <label>По <input type="date" data-dash-date="to" value="${escapeAttr(dashState.to)}" max="${getCurrentShiftPeriod().date}"></label>
    </div>` : ''}`;
}

function dashDelta(cur, prev, goodUp, unit = '') {
  if (cur == null || prev == null) return '';
  const d = cur - prev;
  if (!d) return '<em class="dash-d">= как раньше</em>';
  const good = goodUp ? d > 0 : d < 0;
  return `<em class="dash-d ${good ? 'hist-c-ok' : 'hist-c-fail'}" title="К предыдущему периоду">${d > 0 ? '▲' : '▼'} ${Math.abs(d)}${unit}</em>`;
}

function dashKpisHtml(sum, prev) {
  return `<div class="dash-kpis">
    <div class="dash-kpi"><b class="${sum.compliance == null ? '' : sum.compliance >= 90 ? 'hist-c-ok' : sum.compliance >= 70 ? 'hist-c-warn' : 'hist-c-fail'}">${sum.compliance == null ? '—' : sum.compliance + '%'}</b>
      <span>выполнение расписания CL</span>${dashDelta(sum.compliance, prev.compliance, true, '%')}</div>
    <div class="dash-kpi"><b>${sum.okPct == null ? '—' : sum.okPct + '%'}</b><span>пунктов в норме</span>${dashDelta(sum.okPct, prev.okPct, true, '%')}</div>
    <div class="dash-kpi"><b class="${sum.fail ? 'hist-c-fail' : ''}">${sum.fail}</b><span>${pluralRu(sum.fail, 'отклонение', 'отклонения', 'отклонений')}</span>${dashDelta(sum.fail, prev.fail, false)}</div>
    <div class="dash-kpi"><b class="${sum.missed ? 'hist-c-warn' : ''}">${sum.missed}</b><span>пропущенных смен</span>${dashDelta(sum.missed, prev.missed, false)}</div>
    <div class="dash-kpi"><b class="${sum.repeats.length ? 'hist-c-fail' : ''}">${sum.repeats.length}</b><span>повторяющихся отклонений</span></div>
  </div>`;
}

function dashLineColor(m) {
  if (!m) return 'none';
  const pct = m.planned ? m.done / m.planned * 100 : null;
  if (m.fails > 1 || (pct != null && pct < 70)) return 'red';
  if (m.fails || (pct != null && pct < 90)) return 'amber';
  if (pct == null) return 'none';
  return 'green';
}

function dashMapHtml(sum) {
  const ws = getWorkshops().filter(w => !dashboardWorkshop || w.id === dashboardWorkshop);
  const tile = (line) => {
    const m = sum.perLine[line];
    const color = dashLineColor(m);
    const pct = m && m.planned ? Math.round(m.done / m.planned * 100) : null;
    const sub = m && m.fails ? `${m.fails} откл.` : (pct == null ? (m && m.hasPlan ? 'нет смен в периоде' : 'нет расписания') : 'без откл.');
    return `<button type="button" class="dash-ln dash-ln-${color}" data-dash-open-line="${escapeAttr(line)}" title="Паспорт линии">
      <b>${escapeHtml(line)}</b>
      <span class="dash-ln-p">${pct == null ? '—' : pct + '%'}</span>
      <span class="dash-ln-s">${sub}${m && m.missed.length ? ` · ${m.missed.length} проп.` : ''}</span>
    </button>`;
  };
  return `<div class="dash-ws">${ws.map(w => `
    <div class="dash-wsc">
      <h4>${escapeHtml(w.name)}<span>${escapeHtml(w.subtitle || '')}</span></h4>
      ${(w.areas || []).map(a => {
        const lines = Array.isArray(a.blocks) ? a.blocks.flatMap(b => b.lines || []) : (a.lines || []);
        return `<div class="dash-area"><div class="dash-area-h">${escapeHtml(a.name)}</div>
          ${lines.length ? `<div class="dash-lines">${lines.map(tile).join('')}</div>` : '<div class="hist-sub">линий нет</div>'}</div>`;
      }).join('')}
    </div>`).join('')}</div>`;
}

function dashAttentionHtml(items) {
  if (!items.length) return '<div class="dash-empty">Всё в порядке — замечаний нет</div>';
  return items.slice(0, 8).map(it => `
    <button type="button" class="dash-att dash-att-${it.kind}" ${it.act}>
      <b>${escapeHtml(it.title)}</b>
      <span>${escapeHtml(it.sub)}</span>
    </button>`).join('') + (items.length > 8 ? `<div class="hist-sub">И ещё ${items.length - 8}…</div>` : '');
}

function dashTrendHtml(weeks) {
  const W = 600, H = 180, L = 40, R = 20, B = 24, T = 12;
  const x = i => L + 20 + i * (W - L - R - 40) / (weeks.length - 1);
  const y = v => T + (100 - v) / 100 * (H - T - B);
  const maxF = Math.max(1, ...weeks.map(w => w.fail));
  const bh = f => f / maxF * (H - T - B) * 0.55;
  let s = '';
  [0, 50, 100].forEach(v => {
    s += `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" class="dash-ch-grid"/><text x="${L - 6}" y="${y(v) + 3}" text-anchor="end">${v}%</text>`;
  });
  weeks.forEach((w, i) => {
    const h = bh(w.fail);
    if (w.fail) s += `<rect x="${x(i) - 12}" y="${H - B - h}" width="24" height="${h}" rx="3" class="dash-ch-bar"><title>${w.label}: ${w.fail} откл.</title></rect>
      <text x="${x(i)}" y="${H - B - h - 4}" text-anchor="middle">${w.fail}</text>`;
    s += `<text x="${x(i)}" y="${H - 6}" text-anchor="middle">${w.label}</text>`;
  });
  const pts = weeks.map((w, i) => w.compliance == null ? null : [x(i), y(w.compliance), w]).filter(Boolean);
  if (pts.length > 1) s += `<polyline class="dash-ch-line" points="${pts.map(p => p[0] + ',' + p[1]).join(' ')}"/>`;
  pts.forEach(p => { s += `<circle cx="${p[0]}" cy="${p[1]}" r="4" class="dash-ch-pt"><title>${p[2].label}: ${p[2].compliance}%</title></circle>`; });
  return `<svg class="dash-chart" viewBox="0 0 ${W} ${H}" width="100%">${s}</svg>`;
}

/* ============================================================
   ПАСПОРТ ЛИНИИ
   ============================================================ */
function openDashboardLine(line) {
  dashState.line = line;
  dashState.week = 0;
  renderDashboardLine();
  window.scrollTo(0, 0);
}

function renderDashboardLine() {
  const box = $('#dashboardContent');
  const line = dashState.line;
  renderDashboardHead();
  const ctx = getBlockForLine(line);
  const siblings = ctx ? ((ctx.block ? ctx.block.lines : ctx.area.lines) || []) : [line];
  const slots = dashSlots(dashState.period);
  const sum = dashSummary([{ line }], slots);
  const m = sum.perLine[line];
  // Состояние стандартов
  const weekStart = getSchWeekStart(0);
  const rows = histClRows(line);
  const entries = histStdEntries(line);
  let inMech = 0, inElec = 0, noPoints = 0;
  rows.forEach(({ row, isElec }) => {
    const member = getRowForWeek(row, weekStart, line).member;
    if (member) { if (isElec) inElec++; else inMech++; }
    if (!isElec) {
      const t = migrateControlType(row.controlType, row.measurements);
      const hasPts = (row.measurements || []).some(b => (b.points || []).length);
      if ((t === 'variable' || t === 'interval') && !hasPts) noPoints++;
    }
  });

  // Проблемные стандарты
  const problems = [];
  sum.repeats.forEach(r => problems.push({ id: r.it.standardId, it: r.it, tag: `×${r.n}`, cls: 'fail', why: `${r.n} откл. за период` }));
  const idx = histClIndex(line);
  const cur = getCurrentShiftPeriod();
  rows.forEach(({ row }) => {
    if (problems.some(p => p.id === row.id)) return;
    let miss = 0;
    slots.forEach(s => {
      if (!isShiftPast(s.date, s.shift) || (s.date === cur.date && s.shift === cur.shiftType)) return;
      const letter = getShiftsForDate(s.date)[s.shift];
      if (histIsPlanned(row, line, s.date, s.shift) && !idx.has(`${s.date}|${letter}|${row.id}`)) miss++;
    });
    if (miss >= 2) problems.push({ id: row.id, it: { oplNumber: row.oplNumber, title: row.title || row.paramName }, tag: 'пропуски', cls: 'warn', why: `пропущен ${miss} ${pluralRu(miss, 'смену', 'смены', 'смен')}` });
  });

  // Машины
  const machines = {};
  rows.forEach(({ row }) => {
    const k = [row.machine || 'Без машины', row.nodePart].filter(Boolean).join(' · ');
    if (!machines[k]) machines[k] = { n: 0, fail: 0 };
    machines[k].n++;
  });
  sum.recs.forEach(h => (h.items || []).forEach(it => {
    if (it.status !== 'FAIL') return;
    const k = [it.machine || 'Без машины', it.nodePart].filter(Boolean).join(' · ');
    if (!machines[k]) machines[k] = { n: 0, fail: 0 };
    machines[k].fail++;
  }));
  const maxFail = Math.max(1, ...Object.values(machines).map(x => x.fail));

  const recent = getHistory().filter(h => h.line === line)
    .map(h => ({ h, key: histOrderKey(h) })).sort((a, b) => b.key.localeCompare(a.key)).slice(0, 6).map(x => x.h);

  const ctxText = ctx ? [ctx.workshop.name, ctx.area.name, ctx.block && ctx.block.name].filter(Boolean).join(' · ') : '';

  box.innerHTML = `
    <div class="card dash-card dash-line-head">
      <button type="button" class="btn btn-secondary" data-dash-back>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
        Карта
      </button>
      <b class="dash-line-name">${escapeHtml(line)}</b><span class="hist-sub">${escapeHtml(ctxText)}</span>
      <span class="dash-cfg" title="Стандартов и параметров в Расписании CL на этой неделе">${inMech} мех · ${inElec} E-Param в расписании</span>
      ${noPoints ? `<button type="button" class="dash-cfg dash-cfg-warn" data-dash-editor="${escapeAttr(line)}" title="Вариабельный / интервал без точек замера — открыть Стандарты CL">${noPoints} без точек замера</button>` : ''}
      <span class="hist-sp"></span>
      ${siblings.length > 1 ? `<div class="hist-seg">${siblings.map(l =>
        `<button type="button" class="${l === line ? 'on' : ''}" data-dash-open-line="${escapeAttr(l)}">${escapeHtml(l)}</button>`).join('')}</div>` : ''}
    </div>
    ${dashKpisHtml(sum, dashSummary([{ line }], dashSlots(dashState.period, 1)))}
    <div class="dash-g3">
      <div class="card dash-card">
        ${histCoverageHtml(line, dashState.week, 'data-dash-week')}
      </div>
      <div class="card dash-card">
        <h3 class="dash-h">Проблемные стандарты <small>клик — история стандарта</small></h3>
        ${problems.length ? problems.slice(0, 10).map(p => `
          <button type="button" class="dash-li" data-dash-std="${escapeAttr(p.id)}" data-dash-line="${escapeAttr(line)}">
            <span>${p.it.oplNumber ? `<span class="hist-opl">${escapeHtml(p.it.oplNumber)}</span> ` : ''}${escapeHtml(histItemTitle(p.it))}<div class="hist-sub">${escapeHtml(p.why)}</div></span>
            <span class="hist-tag hist-tag-${p.cls}">${escapeHtml(p.tag)}</span>
          </button>`).join('') : '<div class="dash-empty">Проблемных стандартов нет</div>'}
      </div>
    </div>
    <div class="dash-g2">
      <div class="card dash-card">
        <h3 class="dash-h">Части оборудования <small>стандартов · отклонений за период</small></h3>
        ${Object.entries(machines).sort((a, b) => b[1].fail - a[1].fail || a[0].localeCompare(b[0], 'ru', { numeric: true })).map(([k, v]) => `
          <div class="dash-li dash-li-bar"><div><span>${escapeHtml(k)} <span class="hist-sub">— ${v.n} ${pluralRu(v.n, 'стандарт', 'стандарта', 'стандартов')}</span></span>
            <b class="${v.fail ? 'hist-c-fail' : 'hist-c-ok'}">${v.fail ? v.fail + ' откл.' : '0'}</b></div>
            <div class="dash-bar"><i style="width:${v.fail / maxFail * 100}%"></i></div></div>`).join('') || '<div class="dash-empty">Нет стандартов</div>'}
      </div>
      <div class="card dash-card">
        <h3 class="dash-h">Последние проверки</h3>
        ${recent.length ? recent.map(h => {
          const c = histCounts(h);
          const s = histShift(h);
          return `<button type="button" class="dash-li" data-dash-rec="${escapeAttr(h.id)}">
            <span>${fmtShortDate(s.date)} ${histTime(h)} · ${escapeHtml(histKindLabel(h))} <span class="hist-sub">· смена ${escapeHtml(s.letter || '—')}</span></span>
            ${c.fail ? `<span class="hist-tag hist-tag-fail">${c.fail} откл.</span>` : c.unchecked ? '<span class="hist-tag hist-tag-warn">не всё</span>' : '<span class="hist-tag hist-tag-ok">в норме</span>'}
          </button>`;
        }).join('') : '<div class="dash-empty">Проверок пока нет</div>'}
      </div>
    </div>`;
}

/* ============================================================
   ОБРАБОТЧИКИ
   ============================================================ */
$('#tab-dashboard')?.addEventListener('click', (e) => {
  const t = e.target;
  const vw = t.closest('[data-dash-view]');
  if (vw) {
    dashState.view = vw.dataset.dashView === 'period' ? 'period' : 'now';
    try { localStorage.setItem('cl_dashboard_view', dashState.view); } catch (err) { /* нет доступа */ }
    return renderDashboard();
  }
  const ws = t.closest('[data-dash-ws]');
  if (ws) {
    dashboardWorkshop = ws.dataset.dashWs;
    try { localStorage.setItem('cl_dashboard_workshop', dashboardWorkshop); } catch (err) { /* нет доступа */ }
    return renderDashboard();
  }
  const per = t.closest('[data-dash-period]');
  if (per) {
    dashState.period = per.dataset.dashPeriod;
    try { localStorage.setItem('cl_dashboard_period', dashState.period); } catch (err) { /* нет доступа */ }
    return dashState.line ? renderDashboardLine() : renderDashboard();
  }
  if (t.closest('[data-dash-back]')) { dashState.line = null; return renderDashboard(); }
  if (t.closest('[data-dash-date]')) return;
  const wk = t.closest('[data-dash-week]');
  if (wk) {
    const d = parseInt(wk.dataset.dashWeek, 10);
    dashState.week = d === 0 ? 0 : Math.min(0, dashState.week + d);
    return renderDashboardLine();
  }
  const ln = t.closest('[data-dash-open-line]');
  if (ln) return openDashboardLine(ln.dataset.dashOpenLine);
  const std = t.closest('[data-dash-std]');
  if (std) {
    dashState.keepLine = !!dashState.line;
    return openStandardHistory(std.dataset.dashStd, std.dataset.dashLine, { from: 'dashboard' });
  }
  const rec = t.closest('[data-dash-rec]');
  if (rec) { dashState.keepLine = true; return openHistoryRecord(rec.dataset.dashRec, { from: 'dashboard' }); }
  const sh = t.closest('[data-hist-shift]');
  if (sh && dashState.line) {
    const [date, shift] = sh.dataset.histShift.split('|');
    dashState.keepLine = true;
    return openHistoryShift(dashState.line, date, shift, { from: 'dashboard' });
  }
  const ed = t.closest('[data-dash-editor]');
  if (ed) {
    try { localStorage.setItem('cl_editor_line', ed.dataset.dashEditor); } catch (err) { /* нет доступа */ }
    return switchTab('editor');
  }
  const go = t.closest('[data-dash-go]');
  if (go) return switchTab(go.dataset.dashGo);
});

/* Даты «с / по» для «Период…» */
$('#tab-dashboard')?.addEventListener('change', (e) => {
  const inp = e.target.closest('[data-dash-date]');
  if (!inp) return;
  const key = inp.dataset.dashDate;
  dashState[key] = inp.value;
  try { localStorage.setItem(key === 'from' ? 'cl_dashboard_from' : 'cl_dashboard_to', inp.value); } catch (err) { /* нет доступа */ }
  return dashState.line ? renderDashboardLine() : renderDashboard();
});
