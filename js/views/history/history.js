/* ============================================================
   ВКЛАДКА «История»: лента проверок по дням и сменам
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
  period: '7',           // shift | today | 7 | 30 | all | custom
  from: '', to: '',
  line: null,            // null — ещё не выбирали (берём линию Чек-листа CL)
  kinds: ['cl', 'electronic', 'toploss', 'cocl'],
  brigade: '',
  onlyDev: false,
  cal: 'week'            // календарь линии: 'week' — 7 дней, 'month' — месяц
}, loadHistFilters(), { q: '', limit: HIST_PAGE, scrollY: 0, week: 0, month: 0, pick: '', open: [], fOpen: false });
// Был вид «Журнал отклонений» — теперь это фильтр «С отклонениями»
if (histState.view === 'dev') histState.onlyDev = true;
delete histState.view;
// Фильтров «цех» и «машина» больше нет — старые сохранённые значения не должны фильтровать
delete histState.workshop;
delete histState.machine;

function saveHistFilters() {
  const { period, from, to, line, kinds, brigade, onlyDev, cal } = histState;
  try { localStorage.setItem(HIST_FILTERS_KEY, JSON.stringify({ period, from, to, line, kinds, brigade, onlyDev, cal })); }
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
  const pick = (attr, cur) => ([id, name]) =>
    `<button type="button" class="hist-chip${(cur || '') === id ? ' on' : ''}" ${attr}="${escapeAttr(id)}" style="--k:var(--accent-cyan)">${escapeHtml(name)}</button>`;
  const brBox = $('#histBrigadeChips');
  if (brBox) brBox.innerHTML = [['', 'Все'], ...['A', 'B', 'C', 'D'].map(b => [b, b])].map(pick('data-hist-brigade', histState.brigade)).join('');
  const chips = $('#histKindChips');
  if (chips) {
    chips.innerHTML = Object.entries(HIST_KINDS).map(([k, v]) =>
      `<button type="button" class="hist-chip" data-hist-kind="${k}" style="--k:${v.color}"><i></i>${escapeHtml(v.short)}</button>`
    ).join('');
  }
  if ($('#dateFrom')) $('#dateFrom').value = histState.from || '';
  if ($('#dateTo')) $('#dateTo').value = histState.to || '';
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
function getFilteredHistory() {
  const q = (histState.q || '').trim().toLowerCase();
  const kinds = new Set(histState.kinds || []);
  return getHistory()
    .filter(h => kinds.has(histKind(h)))
    .filter(h => !histState.line || h.line === histState.line)
    .filter(h => (histState.pick && histState.line) || histPeriodMatch(h))
    .filter(h => !histState.brigade || histShift(h).letter === histState.brigade)
    .filter(h => !histState.pick || !histState.line || histPickMatch(h))
    .filter(h => !histState.onlyDev || (h.items || []).some(it => it.status === 'FAIL'))
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

  $$('#histViewSeg [data-hist-dev]').forEach(b => b.classList.toggle('on', (b.dataset.histDev === '1') === !!histState.onlyDev));
  $$('#histPeriodSeg [data-hist-period]').forEach(b => b.classList.toggle('on', b.dataset.histPeriod === histState.period));
  $$('#histKindChips [data-hist-kind]').forEach(b => b.classList.toggle('on', histState.kinds.includes(b.dataset.histKind)));
  $('#histCustomRange')?.classList.toggle('hist-hidden', histState.period !== 'custom');
  $$('#histBrigadeChips [data-hist-brigade]').forEach(b => b.classList.toggle('on', b.dataset.histBrigade === (histState.brigade || '')));
  const pill = $('#histLinePillCode');
  if (pill) {
    const ctx = histState.line ? getBlockForLine(histState.line) : null;
    pill.textContent = histState.line ? histState.line + (ctx ? ' · ' + ctx.workshop.name : '') : 'Все линии';
  }
  $('#histFilterPanel')?.classList.toggle('hist-hidden', !histState.fOpen);
  $('#histFiltersBtn')?.setAttribute('aria-expanded', String(!!histState.fOpen));

  const list = getFilteredHistory();
  renderHistTotals(list);

  renderHistFeed(list);
}

/* Активные фильтры (кроме периода и поиска — они видны в шапке): [ключ, подпись] */
function histActiveFilters() {
  const out = [];
  if (histState.line) out.push(['line', 'Линия ' + histState.line]);
  if (histState.brigade) out.push(['brigade', 'Смена ' + histState.brigade]);
  if (histState.kinds.length < Object.keys(HIST_KINDS).length) out.push(['kinds', histState.kinds.map(k => HIST_KINDS[k].short).join(', ')]);
  return out;
}

/* Строка под шапкой: активные фильтры чипами с крестиком и итог по отобранным */
function renderHistTotals(list) {
  const box = $('#histTotals');
  if (!box) return;
  let ok = 0, fail = 0;
  list.forEach(h => (h.items || []).forEach(it => {
    if (it.status === 'OK') ok++;
    if (it.status === 'FAIL') fail++;
  }));
  const active = histActiveFilters();
  // На кнопке «Фильтры» — число фильтров из панели (линия выбирается плашкой)
  const cnt = $('#histFiltersCount');
  const nPanel = active.filter(([k]) => k !== 'line').length;
  if (cnt) { cnt.textContent = nPanel; cnt.hidden = !nPanel; }
  box.innerHTML = `
    ${active.map(([k, t]) => `<button type="button" class="hist-af" data-hist-clear="${k}" title="Убрать фильтр">${escapeHtml(t)} <span aria-hidden="true">✕</span></button>`).join('')}
    ${active.length > 1 ? '<button type="button" class="hist-af-all" data-hist-clear="all">сбросить всё</button>' : ''}
    <span class="hist-sp"></span>
    <span><b>${list.length}</b> ${pluralRu(list.length, 'проверка', 'проверки', 'проверок')}</span>
    <span class="${ok + fail && fail ? 'hist-c-warn' : 'hist-c-ok'}"><b>${ok} из ${ok + fail}</b> ${pluralRu(ok + fail, 'пункта', 'пунктов', 'пунктов')} в норме</span>
    <span class="${fail ? 'hist-c-fail' : ''}"><b>${fail}</b> ${pluralRu(fail, 'отклонение', 'отклонения', 'отклонений')}</span>`;
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
  const shiftSums = {};
  const add = (map, k) => map[k] || (map[k] = { n: 0, pts: 0, fail: 0, un: 0 });
  list.forEach(h => {
    const s = histShift(h);
    const c = histCounts(h);
    [add(days, s.date), add(shiftSums, s.date + '|' + s.shift)].forEach(x => {
      x.n++;
      x.pts += c.total;
      x.fail += c.fail;
      x.un += c.unchecked;
    });
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
    html += `<div class="hist-day">
      <b>${escapeHtml(dt)}</b>${dt !== full ? `<span>${escapeHtml(full)}</span>` : ''}
      <span class="hist-day-sum">${sum.n} ${pluralRu(sum.n, 'проверка', 'проверки', 'проверок')} · ${sum.pts} ${pluralRu(sum.pts, 'пункт', 'пункта', 'пунктов')}${sum.fail ? ` · <b class="hist-c-fail">${sum.fail} откл.</b>` : ' · <b class="hist-c-ok">всё в норме</b>'}</span>    </div><div class="card hist-feed">`;

    // Смены дня: блок на смену, итог смены — в шапке; смена без отклонений свёрнута
    const shifts = [];
    recs.forEach(h => {
      const s = histShift(h);
      let g = shifts.find(x => x.shift === s.shift);
      if (!g) shifts.push(g = { shift: s.shift, letter: s.letter, recs: [] });
      g.recs.push(h);
    });
    shifts.forEach(g => {
      const key = date + '|' + g.shift;
      const c = shiftSums[key];
      const clean = !c.fail && !c.un;
      const open = !clean || !!histState.pick || histState.open.includes(key);
      const night = g.shift === 'night';
      const head = `<b>${night ? 'Ночь' : 'День'}${g.letter ? ' · ' + escapeHtml(g.letter) : ''}</b>
        <small>${night ? '21:00–09:00' : '09:00–21:00'}</small>
        <span>${c.n} ${pluralRu(c.n, 'проверка', 'проверки', 'проверок')} · ${c.pts} ${pluralRu(c.pts, 'пункт', 'пункта', 'пунктов')}</span>
        ${c.fail ? `<b class="hist-c-fail">${c.fail} откл.</b>` : c.un ? '<span class="hist-c-warn">не всё проверено</span>' : '<b class="hist-c-ok">всё в норме</b>'}`;
      html += open
        ? `<div class="hist-shh hist-shh-${g.shift}">${head}${c.fail ? '<span class="hist-tag hist-tag-mj" title="Отклонения нужно записать в Machine Journal">Machine Journal</span>' : ''}</div>`
          + g.recs.map(histRecHtml).join('')
        : `<button type="button" class="hist-shh hist-shh-${g.shift}" data-hist-expand="${key}">${head}<span class="hist-fold-act">Показать</span></button>`;
    });
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
      <div class="hist-rec-sh hist-rec-sh-${s.shift}"><b>${histTime(h)}</b></div>
      ${histIcon(histKind(h))}
      <div class="hist-rec-t"><b>${escapeHtml(histKindLabel(h))}</b><div>${histRecordSub(h)}${ctx ? ' · ' + ctx : ''}</div></div>
      <div class="hist-rec-ctx">${chips || (c.unchecked ? '<span class="hist-c-warn">не всё проверено</span>' : '<span class="hist-sub">отклонений нет</span>')}</div>
      ${histResultHtml(c)}
      <div class="hist-rec-tag">${c.fail ? `<span class="hist-tag hist-tag-mj" title="Отклонения нужно записать в Machine Journal">Machine Journal</span>` : ''}</div>
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
  const month = histState.cal === 'month';
  const seg = `<div class="hist-seg hist-cal-seg">
    <button type="button" class="${month ? '' : 'on'}" data-hist-cal="week">7 дней</button>
    <button type="button" class="${month ? 'on' : ''}" data-hist-cal="month">Месяц</button>
  </div>`;
  return `<div class="card hist-cov-card">${seg}${histCalHtml(histState.line, month)}${pickBar}</div>`;
}

/* Календарь линии: неделя — строка, в дне две смены (день / ночь).
   month — весь месяц, иначе одна неделя (с числом выполненных проверок) */
const HIST_MONTHS = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
const HIST_SUN = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><line x1="12" y1="2" x2="12" y2="5"/><line x1="12" y1="19" x2="12" y2="22"/><line x1="2" y1="12" x2="5" y2="12"/><line x1="19" y1="12" x2="22" y2="12"/></svg>';
const HIST_MOON = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>';

function histCalHtml(line, month) {
  const today = getCurrentShiftPeriod().date;
  const offset = month ? histState.month : histState.week;
  const navAttr = month ? 'data-hist-month' : 'data-hist-week';
  let days, first, last, title;
  if (month) {
    const base = new Date(today + 'T12:00:00');
    base.setDate(1);
    base.setMonth(base.getMonth() + offset);
    const y = base.getFullYear(), mo = base.getMonth();
    const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    first = iso(base);
    last = iso(new Date(y, mo + 1, 0, 12));
    // Полные недели Пн–Вс вокруг месяца
    days = [];
    for (let d = histWeekStartOf(first); d <= last || days.length % 7; d = addDaysISO(d, 1)) days.push(d);
    title = `${HIST_MONTHS[mo]} ${y}`;
  } else {
    days = getClWeekDays(offset);
    first = days[0];
    last = days[6];
    title = `Неделя ${histIsoWeek(first)} · ${fmtShortDate(first)} – ${fmtShortDate(last)}`;
  }
  const cov = histCoverageDays(line, days);

  let fail = 0, missed = 0, checked = 0;
  cov.forEach(d => { if (d.date < first || d.date > last) return; ['day', 'night'].forEach(s => {
    const st = d.shifts[s].state;
    if (st === 'fail') fail++;
    if (st === 'missed') missed++;
    if (st === 'ok' || st === 'partial' || st === 'fail') checked++;
  }); });

  const half = (d, s) => {
    const c = d.shifts[s];
    const icon = s === 'day' ? HIST_SUN : HIST_MOON;
    const lt = c.letter ? escapeHtml(c.letter) + ' · ' : '';
    const text = { ok: 'в норме', fail: `${c.fail} откл.`, missed: 'пропуск', partial: `${c.planned - c.done} не пров.`, now: 'идёт', future: `план ${c.planned}`, none: 'нет плана' }[c.state];
    const tip = `${s === 'day' ? 'День' : 'Ночь'}${c.letter ? ' · смена ' + c.letter : ''}: ${text}`;
    // В неделе места больше — показываем, сколько проверок выполнено из плана
    const cnt = !month && c.planned && c.state !== 'future' ? `<em>${c.done}/${c.planned}</em>` : '';
    return c.state === 'none' || c.state === 'future'
      ? `<span class="hist-mh hist-cc-${c.state}" title="${escapeAttr(tip)}">${icon}${lt}${text}</span>`
      : `<button type="button" class="hist-mh hist-cc-${c.state}" data-hist-shift="${d.date}|${s}" title="${escapeAttr(tip + ' — показать проверки смены')}">${icon}${lt}${text}${cnt}</button>`;
  };
  const unit = month ? ['Предыдущий месяц', 'Следующий месяц', 'К текущему'] : ['Предыдущая неделя', 'Следующая неделя', 'К текущей'];
  const arrow = (dir, dis) => `<button type="button" class="cil-week-btn hist-cov-arrow" ${navAttr}="${dir}" title="${unit[dir < 0 ? 0 : 1]}"${dis ? ' disabled' : ''}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="${dir < 0 ? '15 18 9 12 15 6' : '9 18 15 12 9 6'}"/></svg></button>`;

  return `
    <div class="hist-cov-h"><div class="hist-cov-week">
      <div class="hist-cov-wk">
        ${arrow(-1, false)}
        <span class="hist-cov-no">${title}</span>
        ${arrow(1, offset >= 0)}
        ${offset ? `<button type="button" class="cil-week-today" ${navAttr}="0">${unit[2]}</button>` : ''}
      </div>
      <div class="hist-cov-sub">Покрытие смен Чек-листа CL · ${escapeHtml(line)} · проверено ${checked} ${pluralRu(checked, 'смена', 'смены', 'смен')}
        · <span class="${fail ? 'hist-c-fail' : ''}">с отклонениями ${fail}</span> · <span class="${missed ? 'hist-c-warn' : ''}">пропущено ${missed}</span></div>
    </div></div>
    <div class="hist-mon${month ? '' : ' is-week'}">
      ${['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map(w => `<div class="hist-mon-wd">${w}</div>`).join('')}
      ${cov.map(d => {
        const out = d.date < first || d.date > last;
        return `<div class="hist-md${out ? ' is-out' : ''}${d.isToday ? ' is-today' : ''}">
          <span class="hist-md-n">${month ? Number(d.date.slice(8)) : fmtShortDate(d.date)}</span>
          ${out ? '' : half(d, 'day') + half(d, 'night')}
        </div>`;
      }).join('')}
    </div>`;
}

function histMarkPick() {
  if (!histState.pick) return;
  $(`#historyList [data-hist-shift="${histState.pick}"]`)?.classList.add('is-pick');
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
  const dev = t.closest('[data-hist-dev]');
  if (dev) { histState.onlyDev = dev.dataset.histDev === '1'; return histFilterChanged(); }
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
  const cal = t.closest('[data-hist-cal]');
  if (cal) { histState.cal = cal.dataset.histCal; histState.pick = ''; saveHistFilters(); return renderHistory(); }
  const mon = t.closest('[data-hist-month]');
  if (mon) {
    const d = Number(mon.dataset.histMonth);
    histState.month = d === 0 ? 0 : Math.min(0, histState.month + d);
    histState.pick = '';
    return renderHistory();
  }
  if (t.closest('[data-hist-unpick]')) { histState.pick = ''; return renderHistory(); }
  const br = t.closest('[data-hist-brigade]');
  if (br) { histState.brigade = br.dataset.histBrigade; return histFilterChanged(); }
  if (t.closest('#histFiltersBtn')) { histState.fOpen = !histState.fOpen; return renderHistory(); }
  if (t.closest('#histLinePill')) {
    linePickerOnSelect = (line) => histSetLine(line);
    return openLinePickerModal();
  }
  const clr = t.closest('[data-hist-clear]');
  if (clr) {
    const k = clr.dataset.histClear;
    if (k === 'line' || k === 'all') histSetLine('', true);
    if (k === 'brigade' || k === 'all') histState.brigade = '';
    if (k === 'kinds' || k === 'all') histState.kinds = Object.keys(HIST_KINDS);
    return histFilterChanged();
  }
  if (t.closest('[data-hist-shiftpage]')) {
    const [date, shift] = histState.pick.split('|');
    return openHistoryShift(histState.line, date, shift);
  }
  const fold = t.closest('[data-hist-expand]');
  if (fold) { histState.open.push(fold.dataset.histExpand); return renderHistory(); }
  const open = t.closest('[data-hist-open]');
  if (open && !t.closest('#histRecordView, #histStdView')) return openHistoryRecord(open.dataset.histOpen);
});

/* Линия истории ('' — все линии); silent — без перерисовки (её сделает вызывающий) */
function histSetLine(line, silent) {
  histState.line = line || '';
  histState.pick = '';
  histState.week = 0;
  histState.month = 0;
  if (!silent) histFilterChanged();
}
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
