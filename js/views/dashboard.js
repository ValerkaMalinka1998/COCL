/* ============================================================
   ВКЛАДКА «Дашборд»
   Главный экран: показатели периода, таблица «линия → часть →
   машина», динамика по неделям, смены A–D.
   Клик по линии — «Паспорт линии».
   Расчёты опираются на функции Истории (history-data.js).
   Модуль общего пространства имён: функции и переменные видны
   во всех файлах. Порядок подключения — index.html.
   ============================================================ */

const DASH_PERIODS = { shift: 1, day: 2, '7': 14, '30': 60, all: 0, custom: 0 };
const DASH_PERIOD_LABELS = { shift: 'текущая смена', day: 'последние сутки', '7': '7 дней', '30': '30 дней', all: 'всё время', custom: 'выбранный период' };
const DASH_PERIOD_BTNS = [['shift', 'Смена'], ['day', 'Сутки'], ['7', '7 дней'], ['30', '30 дней'], ['all', 'Всё'], ['custom', 'Период…']];

const dashState = {
  period: (() => { try { return localStorage.getItem('cl_dashboard_period') || '7'; } catch (e) { return '7'; } })(),
  line: null,          // открыт паспорт линии
  openLines: new Set(), // раскрытые строки таблицы линий
  mach: '',            // паспорт: выбранная машина «часть|машина»
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
  const rows = clLineRows(line);
  const cur = getCurrentShiftPeriod();
  // groups: «часть|машина» → выполнение; letters: буква смены → выполнение и пропуски
  const m = { planned: 0, done: 0, fail: 0, late: 0, missed: [], hasPlan: false, groups: {}, letters: {} };
  if (!slots.length) return m;
  const dates = slots.map(s => s.date).sort();
  const tally = clTallyIndex(line, dates[0], dates[dates.length - 1], rows);
  slots.forEach(s => {
    const isNow = s.date === cur.date && s.shift === cur.shiftType;
    if (!isNow && !isShiftPast(s.date, s.shift)) return;
    if (isNow && !includeCurrent) return;
    const letter = getShiftsForDate(s.date)[s.shift];
    let planned = 0, done = 0, late = 0;
    rows.forEach(({ row }) => {
      const k = tally.get(`${s.date}|${s.shift}|${row.id}`);
      if (!k) return;
      const isDone = k === 'OK' || k === 'FAIL' || k === 'late';
      const gk = (row.nodePart || '') + '|' + (row.machine || 'Без машины');
      const g = m.groups[gk] || (m.groups[gk] = { planned: 0, done: 0 });
      g.planned++;
      planned++;
      if (isDone) { done++; g.done++; }
      if (k === 'late') late++;
      if (k === 'FAIL') m.fail++;
    });
    if (!planned) return;
    m.hasPlan = true;
    m.planned += planned;
    m.done += done;
    m.late += late;
    const lt = m.letters[letter] || (m.letters[letter] = { planned: 0, done: 0, missed: 0 });
    lt.planned += planned;
    lt.done += done;
    // Закрытое позже — выполнено, но смена всё равно пропущена (считается один раз — здесь)
    if (done === late && !isNow) { m.missed.push({ ...s, letter }); lt.missed++; }
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
  let planned = 0, done = 0, missed = 0, late = 0;
  lines.forEach(x => {
    const m = dashClMetrics(x.line, slots, includeCurrent);
    perLine[x.line] = { ...m, fails: 0, pts: 0, ptGroups: {} };
    planned += m.planned; done += m.done; missed += m.missed.length; late += m.late;
  });
  const recs = dashRecords(slots, lineSet);
  let ok = 0, fail = 0;
  const letterFails = {};
  recs.forEach(h => (h.items || []).forEach(it => {
    if (it.status !== 'OK' && it.status !== 'FAIL') return;
    const pl = perLine[h.line];
    if (pl) {
      // Проверенные пункты по части и машине — для доли «N из M»
      const gk = (it.nodePart || '') + '|' + (it.machine || 'Без машины');
      const g = pl.ptGroups[gk] || (pl.ptGroups[gk] = { n: 0, total: 0 });
      g.total++;
      pl.pts++;
      if (it.status === 'FAIL') g.n++;
    }
    if (it.status === 'OK') ok++;
    if (it.status === 'FAIL') {
      fail++;
      const lt = histShift(h).letter;
      if (lt) letterFails[lt] = (letterFails[lt] || 0) + 1;
      if (pl) pl.fails++;
    }
  }));
  return {
    perLine, recs, letterFails,
    compliance: planned ? Math.round(done / planned * 100) : null,
    okPct: ok + fail ? Math.round(ok / (ok + fail) * 100) : null,
    fail, missed, late
  };
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


  const lines = dashLines();
  const slots = dashSlots(dashState.period);
  const sum = dashSummary(lines, slots);
  const prev = dashSummary(lines, dashSlots(dashState.period, 1));

  box.innerHTML = `
    ${dashKpisHtml(sum, prev)}
    <div class="card dash-card">
      <h3 class="dash-h">Линии, части и машины <small>выполнение расписания CL · отклонений из проверенных пунктов · клик по линии — раскрыть</small></h3>
      ${dashTreeHtml(lines, sum)}
    </div>
    <div class="card dash-card">
      <h3 class="dash-h">Динамика по неделям <small>выполнение расписания CL и число отклонений</small></h3>
      ${dashWeeksHtml(dashWeeks(lines))}
    </div>
    <div class="card dash-card">
      <h3 class="dash-h">Смены <small>выполнение проверок по букве смены за период</small></h3>
      ${dashLettersHtml(sum)}
    </div>`;
}

/* Меньше стольких проверок — доля отклонений не показательна */
const DASH_MIN_CHECKS = 10;

/* «N из M · P%», мало проверок — без процента */
function dashShareText(n, total) {
  if (!total) return '—';
  return `${n} из ${total} · ${total < DASH_MIN_CHECKS ? 'мало проверок' : Math.round(n / total * 100) + '%'}`;
}

/* Ячейки таблиц: выполнение (N из M + полоска) и отклонения («N из M · %») */
function dashDoneCell(done, planned) {
  return planned
    ? `${Math.round(done / planned * 100)}% <span class="hist-sub">· ${done} из ${planned}</span><span class="dash-bar dash-bar-done"><i style="width:${Math.round(done / planned * 100)}%"></i></span>`
    : '<span class="hist-sub">нет плана</span>';
}
function dashFailCell(n, total) {
  return `<span class="${n && total >= DASH_MIN_CHECKS ? 'hist-c-fail' : total ? '' : 'hist-sub'}">${dashShareText(n, total)}</span>`;
}

/* Строки «Maker / Packer → машина» линии: план — из расписания, отклонения — из проверок;
   pad — пустые ячейки справа (под колонки таблицы линий) */
function dashPartRowsHtml(m, pad = 0) {
  const tail = '<td></td>'.repeat(pad);
  const parts = {};
  const keys = [...new Set([...Object.keys(m.groups), ...Object.keys(m.ptGroups)])];
  keys.forEach(k => {
    const [part, machine] = k.split('|');
    const p = parts[part] || (parts[part] = { done: 0, planned: 0, n: 0, total: 0, machines: [] });
    const g = m.groups[k] || { done: 0, planned: 0 };
    const f = m.ptGroups[k] || { n: 0, total: 0 };
    p.done += g.done; p.planned += g.planned; p.n += f.n; p.total += f.total;
    p.machines.push({ machine, ...g, ...f });
  });
  let html = '';
  Object.keys(parts).sort().forEach(part => {
    const p = parts[part];
    if (part) html += `<tr class="dash-tr-part"><td>${escapeHtml(part)}</td><td>${dashDoneCell(p.done, p.planned)}</td><td>${dashFailCell(p.n, p.total)}</td>${tail}</tr>`;
    p.machines.sort((a, b) => a.machine.localeCompare(b.machine, 'ru', { numeric: true })).forEach(x => {
      html += `<tr class="dash-tr-mach${part ? '' : ' dash-tr-mach-top'}"><td>${escapeHtml(x.machine)}</td><td>${dashDoneCell(x.done, x.planned)}</td><td>${dashFailCell(x.n, x.total)}</td>${tail}</tr>`;
    });
  });
  return html;
}

/* Таблица «Линия → Maker / Packer → машина».
   Линии сгруппированы по участкам (блокам); внутри группы — от худших к лучшим */
function dashTreeHtml(lines, sum) {
  const shown = lines.filter(x => { const m = sum.perLine[x.line]; return m && (m.hasPlan || m.pts); });
  const idle = lines.filter(x => !shown.includes(x)).map(x => x.line);
  if (!shown.length) return '<div class="dash-empty">За период нет ни плана, ни проверок</div>';

  // Хуже — выше доля отклонений, ниже выполнение
  const failPct = (m) => m.pts >= DASH_MIN_CHECKS ? m.fails / m.pts : 0;
  const donePct = (m) => m.planned ? m.done / m.planned : 1;
  const groups = [];
  shown.forEach(x => {
    const name = [dashboardWorkshop ? '' : x.workshopName, x.areaName, x.blockName].filter(Boolean).join(' · ') || 'Вне структуры';
    let g = groups.find(y => y.name === name);
    if (!g) groups.push(g = { name, lines: [] });
    g.lines.push(x.line);
  });

  const body = groups.map(g => {
    g.lines.sort((a, b) => {
      const ma = sum.perLine[a], mb = sum.perLine[b];
      return (failPct(mb) - failPct(ma)) || (donePct(ma) - donePct(mb));
    });
    const gp = g.lines.reduce((s, l) => s + sum.perLine[l].planned, 0);
    const gd = g.lines.reduce((s, l) => s + sum.perLine[l].done, 0);
    const gf = g.lines.reduce((s, l) => s + sum.perLine[l].fails, 0);
    let html = `<tr class="dash-tr-grp"><td colspan="5">${escapeHtml(g.name)}<span>${g.lines.length} ${pluralRu(g.lines.length, 'линия', 'линии', 'линий')}
      · выполнение ${gp ? Math.round(gd / gp * 100) + '%' : '—'} · ${gf} откл.</span></td></tr>`;
    g.lines.forEach(line => {
      const m = sum.perLine[line];
      const open = dashState.openLines.has(line);
      const mark = m.fails && m.pts >= DASH_MIN_CHECKS ? ' is-bad' : m.missed.length ? ' is-warn' : '';
      html += `<tr class="dash-tr-line${mark}">
        <td><button type="button" class="dash-tr-tg" data-dash-toggle="${escapeAttr(line)}" aria-expanded="${open}">${open ? '▾' : '▸'} ${escapeHtml(line)}</button></td>
        <td>${dashDoneCell(m.done, m.planned)}</td>
        <td>${dashFailCell(m.fails, m.pts)}</td>
        <td class="${m.missed.length ? 'hist-c-warn' : 'hist-sub'}">${m.missed.length || '—'}</td>
        <td><button type="button" class="dash-tr-go" data-dash-open-line="${escapeAttr(line)}">Паспорт</button></td>
      </tr>`;
      if (!open) return;
      html += dashPartRowsHtml(m, 2);
    });
    return html;
  }).join('');

  return `<div class="dash-tr-wrap"><table class="dash-tr">
    <thead><tr><th>Где</th><th>Выполнение</th><th>Отклонений</th><th>Пропущено смен</th><th></th></tr></thead>
    <tbody>${body}</tbody>
  </table></div>${idle.length ? `<div class="hist-sub dash-tr-idle">Ещё ${idle.length} ${pluralRu(idle.length, 'линия', 'линии', 'линий')} без плана и проверок за период: ${escapeHtml(idle.join(', '))}</div>` : ''}`;
}

function renderDashboardHead() {
  const bar = $('#dashboardWorkshopBar');
  if (!bar) return;
  const tabs = [{ id: '', name: 'Общий' }].concat(getWorkshops().map(w => ({ id: w.id, name: w.name })));
  const periodText = dashState.period === 'custom' && (dashState.from || dashState.to)
    ? `${dashState.from ? fmtShortDate(dashState.from) : '…'} – ${dashState.to ? fmtShortDate(dashState.to) : 'сегодня'}`
    : DASH_PERIOD_LABELS[dashState.period];
  const scope = dashState.line ? dashState.line
    : (dashboardWorkshop ? (getWorkshop(dashboardWorkshop)?.name || '') : 'весь завод');
  bar.innerHTML = `
    <div class="dash-title">Дашборд <small>${escapeHtml(scope)} · ${escapeHtml(periodText)}</small></div>
    <span class="hist-sp"></span>
    ${dashState.line ? '' : `<div class="hist-seg">${tabs.map(t =>
      `<button type="button" class="${t.id === dashboardWorkshop ? 'on' : ''}" data-dash-ws="${escapeAttr(t.id)}">${escapeHtml(t.name)}</button>`).join('')}</div>`}
    <div class="hist-seg">${DASH_PERIOD_BTNS.map(([p, t]) =>
      `<button type="button" class="${p === dashState.period ? 'on' : ''}" data-dash-period="${p}">${t}</button>`).join('')}</div>
    ${dashState.period === 'custom' ? `<div class="hist-custom dash-custom">
      <label>С <input type="date" data-dash-date="from" value="${escapeAttr(dashState.from)}" max="${getCurrentShiftPeriod().date}"></label>
      <label>По <input type="date" data-dash-date="to" value="${escapeAttr(dashState.to)}" max="${getCurrentShiftPeriod().date}"></label>
    </div>` : ''}`;
}

/* Изменение к прошлому периоду: «▼ 37 п. п. · было 82%» — видно, с чем сравниваем */
function dashDelta(cur, prev, goodUp, unit = '') {
  if (cur == null || prev == null) return '';
  const d = cur - prev;
  if (!d) return '<em class="dash-d">как в прошлом периоде</em>';
  const good = goodUp ? d > 0 : d < 0;
  const step = unit === '%' ? ' п. п.' : '';
  return `<em class="dash-d ${good ? 'hist-c-ok' : 'hist-c-fail'}" title="Изменение к предыдущему такому же периоду">${d > 0 ? '▲' : '▼'} ${Math.abs(d)}${step} · было ${prev}${unit}</em>`;
}

function dashKpisHtml(sum, prev) {
  return `<div class="dash-kpis">
    <div class="dash-kpi"><b class="${sum.compliance == null ? '' : sum.compliance >= 90 ? 'hist-c-ok' : sum.compliance >= 70 ? 'hist-c-warn' : 'hist-c-fail'}">${sum.compliance == null ? '—' : sum.compliance + '%'}</b>
      <span>выполнение расписания CL</span>${dashDelta(sum.compliance, prev.compliance, true, '%')}</div>
    <div class="dash-kpi"><b>${sum.okPct == null ? '—' : sum.okPct + '%'}</b><span>пунктов в норме</span>${dashDelta(sum.okPct, prev.okPct, true, '%')}</div>
    <div class="dash-kpi"><b class="${sum.fail ? 'hist-c-fail' : ''}">${sum.fail}</b><span>${pluralRu(sum.fail, 'отклонение', 'отклонения', 'отклонений')}</span>${dashDelta(sum.fail, prev.fail, false)}</div>
    <div class="dash-kpi"><b class="${sum.missed ? 'hist-c-warn' : ''}">${sum.missed}</b><span>пропущенных смен${sum.late ? ` · ${sum.late} ${pluralRu(sum.late, 'пункт закрыт', 'пункта закрыто', 'пунктов закрыто')} позже` : ''}</span>${dashDelta(sum.missed, prev.missed, false)}</div>
  </div>`;
}

/* Динамика: две полосы с общими неделями. Сверху — выполнение расписания CL
   (шкала 0–100%), снизу — число отклонений (шкала — от максимума за 6 недель) */
function dashWeeksHtml(weeks) {
  const maxF = Math.max(1, ...weeks.map(w => w.fail));
  // Подпись значения стоит прямо над столбиком; нет плана — подпись у базовой линии
  const cell = (cls, pct, text, tip) => `<div class="dash-wk-cell ${cls}" title="${escapeAttr(tip)}">
      ${pct == null ? `<span class="dash-wk-na">${text}</span>` : `<div class="dash-wk-bar" style="height:${pct}%"><em>${text}</em></div>`}
    </div>`;
  return `<div class="dash-wk">
    <div class="dash-wk-rl">Выполнение<small>расписания CL, %</small></div>
    ${weeks.map(w => cell('dash-wk-done', w.compliance, w.compliance == null ? 'нет плана' : w.compliance + '%',
      w.label + ': ' + (w.compliance == null ? 'нет плана' : 'выполнено ' + w.compliance + '%'))).join('')}
    <div class="dash-wk-rl">Отклонения<small>за неделю, шт.</small></div>
    ${weeks.map(w => cell('dash-wk-fail' + (w.fail ? '' : ' is-zero'), Math.round(w.fail / maxF * 100), String(w.fail),
      w.label + ': ' + w.fail + ' откл.')).join('')}
    <span></span>
    ${weeks.map(w => `<div class="dash-wk-lbl">${escapeHtml(w.label)}</div>`).join('')}
  </div>`;
}

/* Смены A / B / C / D: выполнение и пропуски из расписания, отклонения — из проверок */
function dashLettersHtml(sum) {
  const tot = {};
  Object.values(sum.perLine).forEach(m => Object.entries(m.letters).forEach(([l, v]) => {
    const t = tot[l] || (tot[l] = { planned: 0, done: 0, missed: 0 });
    t.planned += v.planned; t.done += v.done; t.missed += v.missed;
  }));
  const letters = [...new Set([...Object.keys(tot), ...Object.keys(sum.letterFails)])].filter(Boolean).sort();
  if (!letters.length) return '<div class="dash-empty">За период нет смен с планом</div>';
  return `<div class="dash-lt">${letters.map(l => {
    const t = tot[l] || { planned: 0, done: 0, missed: 0 };
    const pct = t.planned ? Math.round(t.done / t.planned * 100) : null;
    const f = sum.letterFails[l] || 0;
    return `<div class="dash-lt-c">
      <div class="dash-lt-h">Смена ${escapeHtml(l)}</div>
      <div><b class="${pct == null ? '' : pct >= 90 ? 'hist-c-ok' : pct >= 70 ? 'hist-c-warn' : 'hist-c-fail'}">${pct == null ? '—' : pct + '%'}</b><span class="hist-sub"> выполнено</span></div>
      <div class="dash-bar dash-bar-done"><i style="width:${pct || 0}%"></i></div>
      <div class="${f ? 'hist-c-fail' : 'hist-sub'}">${f} ${pluralRu(f, 'отклонение', 'отклонения', 'отклонений')}</div>
      <div class="${t.missed ? 'hist-c-warn' : 'hist-sub'}">${t.missed ? t.missed + ' ' + pluralRu(t.missed, 'смена пропущена', 'смены пропущены', 'смен пропущено') : 'пропусков нет'}</div>
    </div>`;
  }).join('')}</div>`;
}

/* ============================================================
   ПАСПОРТ ЛИНИИ: «дашборд одной линии» — показатели, оборудование
   (Maker / Packer → машины плитками), стандарты с отклонениями за период,
   таблица частей и машин, динамика по неделям
   ============================================================ */
function openDashboardLine(line) {
  dashState.line = line;
  dashState.mach = '';
  renderDashboardLine();
  window.scrollTo(0, 0);
}

/* Машины линии: «часть|машина» → стандарты, выполнение, отклонения за период */
function dashMachines(line, m, rows) {
  const map = new Map();
  const get = (part, machine) => {
    const k = part + '|' + machine;
    if (!map.has(k)) map.set(k, { key: k, part, machine, mech: 0, elec: 0, planned: 0, done: 0, n: 0, total: 0, rows: [] });
    return map.get(k);
  };
  rows.forEach(({ row, isElec }) => {
    const x = get(row.nodePart || '', row.machine || 'Без машины');
    if (isElec) x.elec++; else x.mech++;
    x.rows.push({ row, isElec });
  });
  Object.entries(m.groups).forEach(([k, g]) => { const [p, mc] = k.split('|'); const x = get(p, mc); x.planned += g.planned; x.done += g.done; });
  Object.entries(m.ptGroups).forEach(([k, g]) => { const [p, mc] = k.split('|'); const x = get(p, mc); x.n += g.n; x.total += g.total; });
  return [...map.values()].sort((a, b) => a.machine.localeCompare(b.machine, 'ru', { numeric: true }));
}

/* Оборудование плитками: часть линии (Maker / Packer; в PMD / FMD — одна группа) → машины.
   Цвет плитки: отклонения за период — красный, выполнение < 90% — амбер, иначе зелёный */
function dashEquipHtml(machines) {
  const parts = [...new Set(machines.map(x => x.part))].sort();
  const pct = (d, p) => p ? Math.round(d / p * 100) : null;
  return `<div class="dash-eq">${parts.map(part => {
    const list = machines.filter(x => x.part === part);
    const p = list.reduce((s, x) => s + x.planned, 0), d = list.reduce((s, x) => s + x.done, 0);
    const nf = list.reduce((s, x) => s + x.n, 0);
    return `<div class="dash-eq-part">
      <div class="dash-eq-h"><b>${escapeHtml(part || 'Оборудование')}</b><span class="hist-sub">выполнение ${pct(d, p) == null ? '—' : pct(d, p) + '%'} · ${nf} откл.</span></div>
      <div class="dash-eq-tiles">${list.map(x => {
        const xp = pct(x.done, x.planned);
        const st = x.n ? 'bad' : xp != null && xp < 90 ? 'warn' : 'ok';
        const cnt = [x.mech ? `${x.mech} ${pluralRu(x.mech, 'стандарт', 'стандарта', 'стандартов')}` : '', x.elec ? `${x.elec} E-Param` : ''].filter(Boolean).join(' · ');
        return `<button type="button" class="dash-eq-t is-${st}${dashState.mach === x.key ? ' is-on' : ''}" data-dash-mach="${escapeAttr(x.key)}" aria-pressed="${dashState.mach === x.key}">
          <b>${escapeHtml(x.machine)}</b>
          <small>${cnt || 'нет стандартов'}</small>
          <small>${xp == null ? 'нет плана' : 'выполнено ' + xp + '%'} · ${dashShareText(x.n, x.total)}</small>
          <span class="hist-tag ${st === 'bad' ? 'hist-tag-fail' : st === 'warn' ? 'hist-tag-warn' : 'hist-tag-ok'}">${st === 'bad' ? x.n + ' откл.' : st === 'warn' ? 'пропуски' : 'в норме'}</span>
        </button>`;
      }).join('')}</div>
    </div>`;
  }).join('')}</div>`;
}

/* Правая колонка: стандарты линии с отклонениями за период («N из M» проверок)
   или (выбрана машина) её стандарты с последним результатом */
function dashLineSideHtml(line, machines, sum) {
  const x = machines.find(y => y.key === dashState.mach);
  const opl = (it) => it.oplNumber ? `<span class="hist-opl">${escapeHtml(it.oplNumber)}</span> ` : '';
  const when = (h) => { const sh = histShift(h); return `${fmtShortDate(sh.date)} ${sh.shift === 'day' ? 'день' : 'ночь'}`; };
  if (!x) {
    const map = new Map();
    sum.recs.forEach(h => (h.items || []).forEach(it => {
      if (it.status !== 'OK' && it.status !== 'FAIL') return;
      const e = map.get(it.standardId) || { it, n: 0, total: 0, last: null };
      e.total++;
      if (it.status === 'FAIL') { e.n++; if (!e.last || histOrderKey(h) > histOrderKey(e.last)) { e.last = h; e.it = it; } }
      map.set(it.standardId, e);
    }));
    const list = [...map.entries()].filter(([, e]) => e.n)
      .sort((a, b) => (b[1].n - a[1].n) || histOrderKey(b[1].last).localeCompare(histOrderKey(a[1].last)));
    return `<h3 class="dash-h">Стандарты с отклонениями <small>за период · N из M проверок · клик — история стандарта</small></h3>
      ${list.length ? list.map(([id, e]) => `<button type="button" class="dash-li" data-dash-std="${escapeAttr(id)}" data-dash-line="${escapeAttr(line)}">
        <span>${opl(e.it)}${escapeHtml(histItemTitle(e.it))}<div class="hist-sub">${escapeHtml([e.it.nodePart, e.it.machine].filter(Boolean).join(' · '))} · последнее ${when(e.last)}</div></span>
        <span class="hist-tag hist-tag-fail">${e.n} из ${e.total}</span>
      </button>`).join('') : '<div class="dash-empty">За период отклонений нет</div>'}`;
  }
  const entries = histStdEntries(line);
  const list = x.rows.map(({ row }) => {
    const checked = (entries.get(row.id) || []).filter(e => e.it.status === 'OK' || e.it.status === 'FAIL');
    const last = checked[checked.length - 1];
    const res = !last ? { ord: 1, cls: '', text: 'не проверялся' }
      : last.it.status === 'FAIL' ? { ord: 0, cls: 'hist-tag-fail', text: `Не ОК · ${fmtShortDate(histShift(last.h).date)}` }
      : { ord: 2, cls: 'hist-tag-ok', text: `ОК · ${fmtShortDate(histShift(last.h).date)}` };
    return { row, res };
  }).sort((a, b) => a.res.ord - b.res.ord);
  return `<h3 class="dash-h">${escapeHtml([x.part, x.machine].filter(Boolean).join(' · '))} <small>последняя проверка · клик — история стандарта</small>
      <button type="button" class="dash-eq-back" data-dash-mach="">← Все с отклонениями</button></h3>
    ${list.map(({ row, res }) => `<button type="button" class="dash-li" data-dash-std="${escapeAttr(row.id)}" data-dash-line="${escapeAttr(line)}">
      <span>${opl(row)}${escapeHtml(row.title || row.paramName || '—')}</span>
      <span class="hist-tag ${res.cls}">${res.text}</span>
    </button>`).join('') || '<div class="dash-empty">Стандартов нет</div>'}`;
}

function renderDashboardLine() {
  const box = $('#dashboardContent');
  const line = dashState.line;
  renderDashboardHead();
  const ctx = getBlockForLine(line);
  const siblings = ctx ? ((ctx.block ? ctx.block.lines : ctx.area.lines) || []) : [line];
  const slots = dashSlots(dashState.period);
  const sum = dashSummary([{ line }], slots);
  const prev = dashSummary([{ line }], dashSlots(dashState.period, 1));
  const m = sum.perLine[line];
  const rows = clLineRows(line);
  const machines = dashMachines(line, m, rows);
  if (dashState.mach && !machines.some(x => x.key === dashState.mach)) dashState.mach = '';

  // Настройка расписания: сколько в нём на этой неделе, у скольких нет точек замера
  const weekStart = getSchWeekStart(0);
  let inMech = 0, inElec = 0, noPoints = 0;
  rows.forEach(({ row, isElec }) => {
    if (getRowForWeek(row, weekStart, line).member) { if (isElec) inElec++; else inMech++; }
    if (!isElec) {
      const t = migrateControlType(row.controlType, row.measurements);
      const hasPts = (row.measurements || []).some(b => (b.points || []).length);
      if ((t === 'variable' || t === 'interval') && !hasPts) noPoints++;
    }
  });
  const ctxText = ctx ? [ctx.workshop.name, ctx.area.name, ctx.block && ctx.block.name].filter(Boolean).join(' · ') : '';

  box.innerHTML = `
    <div class="card dash-card dash-line-head">
      <button type="button" class="btn btn-secondary" data-dash-back>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
        Дашборд
      </button>
      <b class="dash-line-name">${escapeHtml(line)}</b><span class="hist-sub">${escapeHtml(ctxText)}</span>
      <span class="dash-cfg" title="Стандартов и параметров в Расписании CL на этой неделе">${inMech} мех · ${inElec} E-Param в расписании</span>
      ${noPoints ? `<button type="button" class="dash-cfg dash-cfg-warn" data-dash-editor="${escapeAttr(line)}" title="Вариабельный / интервал без точек замера — открыть Стандарты CL">${noPoints} без точек замера</button>` : ''}
      <span class="hist-sp"></span>
      ${siblings.length > 1 ? `<div class="hist-seg">${siblings.map(l =>
        `<button type="button" class="${l === line ? 'on' : ''}" data-dash-open-line="${escapeAttr(l)}">${escapeHtml(l)}</button>`).join('')}</div>` : ''}
      <button type="button" class="btn btn-secondary" data-dash-hist="${escapeAttr(line)}">Все проверки линии</button>
    </div>
    ${dashKpisHtml(sum, prev)}
    <div class="dash-g3 dash-pass-top">
      <div class="card dash-card">
        <h3 class="dash-h">Оборудование <small>цвет — состояние машины · клик — её стандарты</small></h3>
        ${machines.length ? dashEquipHtml(machines) : '<div class="dash-empty">На линии нет стандартов</div>'}
      </div>
      <div class="card dash-card dash-side"><div class="dash-side-in">${dashLineSideHtml(line, machines, sum)}</div></div>
    </div>
    <div class="dash-g2">
      <div class="card dash-card">
        <h3 class="dash-h">Maker / Packer → машины <small>выполнение расписания CL · отклонений из проверенных пунктов</small></h3>
        <div class="dash-tr-wrap"><table class="dash-tr">
          <thead><tr><th>Где</th><th>Выполнение</th><th>Отклонений</th></tr></thead>
          <tbody>${dashPartRowsHtml(m)}</tbody>
        </table></div>
      </div>
      <div class="card dash-card">
        <h3 class="dash-h">Динамика по неделям</h3>
        ${dashWeeksHtml(dashWeeks([{ line }]))}
      </div>
    </div>`;
}

/* ============================================================
   ОБРАБОТЧИКИ
   ============================================================ */
$('#tab-dashboard')?.addEventListener('click', (e) => {
  const t = e.target;
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
  const mach = t.closest('[data-dash-mach]');
  if (mach) { dashState.mach = dashState.mach === mach.dataset.dashMach ? '' : mach.dataset.dashMach; return renderDashboardLine(); }
  const hl = t.closest('[data-dash-hist]');
  if (hl) {
    dashState.keepLine = true;
    histSetLine(hl.dataset.dashHist, true);
    histState.pick = '';
    return switchTab('history');
  }
  const tg = t.closest('[data-dash-toggle]');
  if (tg) {
    const l = tg.dataset.dashToggle;
    if (!dashState.openLines.delete(l)) dashState.openLines.add(l);
    return renderDashboard();
  }
  const ln = t.closest('[data-dash-open-line]');
  if (ln) return openDashboardLine(ln.dataset.dashOpenLine);
  const std = t.closest('[data-dash-std]');
  if (std) {
    dashState.keepLine = !!dashState.line;
    return openStandardHistory(std.dataset.dashStd, std.dataset.dashLine, { from: 'dashboard' });
  }
  const ed = t.closest('[data-dash-editor]');
  if (ed) {
    try { localStorage.setItem('cl_editor_line', ed.dataset.dashEditor); } catch (err) { /* нет доступа */ }
    return switchTab('editor');
  }
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
