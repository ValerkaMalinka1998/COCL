/* ============================================================
   ВКЛАДКА «TOP Losses»: разбор потерь линии
   Слева — потери цеха линии по категориям, справа — разбор
   выбранной потери: стандарты и E-Param, нормы, последние смены
   Чек-листа CL, расписание. Проверка — по желанию (toploss-check.js).
   Модуль общего пространства имён: функции и переменные видны
   во всех файлах. Порядок подключения — index.html.
   ============================================================ */

const TL_LINE_KEY = 'cl_tl_line';

/* Состояние экрана разбора */
const tlState = {
  line: '',
  lossId: null,               // выбранная потеря
  pickedLoss: null,           // потеря, которую оператор выбрал сам (шаг 3 в шапке)
  openCats: new Set(),        // раскрытые категории
  showEmpty: new Set(),       // категории, где показаны потери без стандартов
  query: '',
  kind: 'all'                 // 'all' | 'mech' | 'elec'
};

/* === ИКОНКИ КАТЕГОРИЙ (Feather-стиль) ======================== */
const TL_CAT_ICONS = {
  stops: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="10" y1="15" x2="10" y2="9"/><line x1="14" y1="15" x2="14" y2="9"/></svg>',
  quality: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2 22 12 12 22 2 12z"/><path d="M12 8 16 12 12 16 8 12z" fill="currentColor"/></svg>',
  emission: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>',
  other: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>'
};
const TL_CAT_COLORS = { stops: 'amber', quality: 'red', emission: 'purple', other: 'cyan' };

function tlCatKind(cat) {
  return typeof tlCategoryKind === 'function' ? tlCategoryKind(cat && cat.name) : 'other';
}

/* ============================================================
   ДАННЫЕ
   ============================================================ */

/* Стандарты и E-Param линии, привязанные к потерям из lossIds.
   Возвращает [{ row, isElec, losses: [lossId] }] */
function tlCollectRows(lossIds, line) {
  const set = new Set(lossIds);
  const out = [];
  const take = (row, isElec) => {
    if (row.active === false || row.line !== line) return;
    const matched = (Array.isArray(row.topLosses) ? row.topLosses : []).filter(id => set.has(id));
    if (matched.length) out.push({ row, isElec, losses: matched });
  };
  getStandards().forEach(s => take(s, false));
  getElectronicParams().map(normalizeElectronicParam).forEach(p => take(p, true));
  out.sort((a, b) => {
    const m = String(a.row.machine || '').localeCompare(String(b.row.machine || ''), 'ru', { numeric: true });
    if (m) return m;
    return String(a.row.oplNumber || a.row.paramName || '')
      .localeCompare(String(b.row.oplNumber || b.row.paramName || ''), 'ru', { numeric: true });
  });
  return out;
}

/* Последние N закончившихся смен (от новой к старой): [{ date, shift }] */
function tlRecentShifts(n) {
  const cur = getCurrentShiftPeriod();
  const res = [];
  let date = cur.date, shift = cur.shiftType;
  for (let i = 0; i < n; i++) {
    // шаг назад: ночь → день того же дня, день → ночь вчера
    if (shift === 'night') shift = 'day';
    else { shift = 'night'; date = addDaysISO(date, -1); }
    res.push({ date, shift });
  }
  return res;
}

/* Последние n суток (завершённые смены): [{ date, shifts: [{date, shift}] }], от старой к новой */
function tlRecentDays(n) {
  const days = [];
  tlRecentShifts(n * 2 + 2).reverse().forEach(sh => {
    let d = days[days.length - 1];
    if (!d || d.date !== sh.date) { d = { date: sh.date, shifts: [] }; days.push(d); }
    d.shifts.push(sh);
  });
  return days.slice(-n);
}

/* Итог суток по статусам смен: отклонение > пропуск > ОК > не проверено > не по расписанию */
function tlDayStatus(sts) {
  if (sts.includes('FAIL')) return 'fail';
  if (sts.includes('missed')) return 'missed';
  if (sts.includes('OK')) return 'ok';
  if (sts.includes('UNCHECKED')) return 'unchecked';
  return 'na';
}

/* Понедельник недели для даты */
function tlWeekStartOf(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  return addDaysISO(dateStr, -((d.getDay() + 6) % 7));
}

/* Индекс истории Чек-листа CL линии: «дата|смена|id» → статус */
function tlHistoryIndex(line) {
  const idx = new Map();
  getHistory().forEach(h => {
    if (!(h.mode === 'cl' || h.mode === 'electronic') || h.line !== line) return;
    (h.items || []).forEach(it => idx.set(`${h.date}|${h.shift}|${it.standardId}`, it.status));
  });
  return idx;
}

/* Статусы строки по сменам: 'OK' | 'FAIL' | 'UNCHECKED' | 'missed' | 'na' */
function tlRowShiftStatuses(row, shifts, line, hidx) {
  return shifts.map(({ date, shift }) => {
    const letter = getShiftsForDate(date)[shift];
    const st = hidx.get(`${date}|${letter}|${row.id}`);
    if (st) return st;
    const w = getRowForWeek(row, tlWeekStartOf(date), line);
    const dow = new Date(date + 'T12:00:00').getDay();
    const planned = isValidationShift(row, date, shift) || (w.member && (w.schedule || []).some(x => x.day === dow && x.shift === shift) && rowExistedByShiftEnd(row, date, shift));
    return planned ? 'missed' : 'na';
  });
}

/* Сводка по потере за 7 дней (14 смен) */
function tlLossStats(lossId, line, hidx, shifts14) {
  const rows = tlCollectRows([lossId], line);
  let fails = 0, missed = 0;
  rows.forEach(r => tlRowShiftStatuses(r.row, shifts14, line, hidx).forEach(s => {
    if (s === 'FAIL') fails++;
    else if (s === 'missed') missed++;
  }));
  return { count: rows.length, mech: rows.filter(r => !r.isElec).length, elec: rows.filter(r => r.isElec).length, fails, missed };
}

/* Последняя проверка TOP Losses по потере */
function tlLastCheck(lossId, line) {
  let last = null;
  getHistory().forEach(h => {
    if (h.mode !== 'toploss' || h.line !== line) return;
    if (!(h.topLosses || []).includes(lossId)) return;
    if (!last || h.timestamp > last) last = h.timestamp;
  });
  return last;
}

/* ============================================================
   ЛИНИЯ
   ============================================================ */

function fillTopLossTab() {
  let line = '';
  try { line = localStorage.getItem(TL_LINE_KEY) || ''; } catch (e) {}
  if (line && !getLines().includes(line)) line = '';
  if (line !== tlState.line) {
    tlState.line = line;
    tlState.lossId = null;
  }
}

function setTopLossLine(line) {
  tlState.line = line || '';
  tlState.lossId = null;
  tlState.pickedLoss = null;
  tlState.openCats.clear();
  try { localStorage.setItem(TL_LINE_KEY, tlState.line); } catch (e) {}
  backToTopLossSelect();
}

/* ============================================================
   РЕНДЕР ЭКРАНА РАЗБОРА
   ============================================================ */

function renderTopLossCategories() {
  const pill = $('#tlLinePillCode');
  if (pill) {
    const ctx = tlState.line ? getBlockForLine(tlState.line) : null;
    pill.textContent = tlState.line ? tlState.line + (ctx ? ' · ' + ctx.workshop.name : '') : 'Выбрать линию';
  }
  const side = $('#tlSideList');
  const main = $('#tlDiag');
  if (!side || !main) return;

  // Шаги шапки: 1 — линия, 2 — потеря, 3 — стандарты и проверка
  const steps = $('#tlSteps');
  if (steps) steps.innerHTML = tabStepsHtml(['Линия', 'Потеря', 'Стандарты и проверка'],
    !tlState.line ? 1 : (tlState.pickedLoss && tlState.pickedLoss === tlState.lossId ? 3 : 2));

  const split = $('#tlSplit');
  const pick = $('#tlPick');
  const backBtn = $('#tlBackToLinePick');
  if (backBtn) backBtn.style.display = tlState.line ? '' : 'none';
  if (!tlState.line) {
    side.innerHTML = '';
    main.innerHTML = '';
    if (split) split.style.display = 'none';
    if (pick) { pick.style.display = ''; renderTopLossLinePick(); }
    return;
  }
  if (split) split.style.display = '';
  if (pick) pick.style.display = 'none';

  const cats = getTopLossesForWorkshop(getWorkshopIdForLine(tlState.line));
  if (!cats.length) {
    side.innerHTML = '';
    main.innerHTML = `<div class="tl2-empty">Для цеха ${escapeHtml(getWorkshopName(getWorkshopIdForLine(tlState.line)) || '')} потери не заданы. Добавьте их в Настройках → TOP Losses.</div>`;
    return;
  }

  const hidx = tlHistoryIndex(tlState.line);
  const shifts14 = tlRecentDays(7).flatMap(d => d.shifts);
  const stats = {};
  cats.forEach(c => (c.items || []).forEach(it => { stats[it.id] = tlLossStats(it.id, tlState.line, hidx, shifts14); }));

  // По умолчанию выбираем потерю с наибольшим числом отклонений (или первую со стандартами)
  if (!tlState.lossId || !stats[tlState.lossId]) {
    const all = cats.flatMap(c => c.items || []).filter(it => stats[it.id].count);
    all.sort((a, b) => stats[b.id].fails - stats[a.id].fails);
    tlState.lossId = all[0] ? all[0].id : null;
  }
  const selCat = cats.find(c => (c.items || []).some(it => it.id === tlState.lossId));
  if (selCat && !tlState.openCats.size) tlState.openCats.add(selCat.id);

  renderTopLossSide(cats, stats);
  renderTopLossDiag(cats, stats, hidx);
}

/* ============================================================
   ВЫБОР ЛИНИИ НА ЭКРАНЕ (линия ещё не выбрана)
   Один цех за раз (вкладки), участки во всю ширину плитками,
   участки сворачиваются, сверху поиск и недавние линии.
   ============================================================ */
const tlPick = { ws: null, q: '', closed: new Set() };

/* Сводка TOP Losses по линии за 7 дней: отклонения и последняя проверка */
function tlLinePickStats() { return pickLineStats('toploss'); }

function tlPickTile(line, st) { return pickTileHtml(line, st, 'data-tl-pick-set'); }

function renderTopLossLinePick() {
  const box = $('#tlPick');
  if (!box) return;
  const workshops = getWorkshops();
  const stats = tlLinePickStats();
  const linesOf = (a) => Array.isArray(a.blocks) ? a.blocks.flatMap(b => b.lines || []) : (a.lines || []);

  // Цех по умолчанию — цех последней линии, иначе первый с линиями
  if (!tlPick.ws || !workshops.some(w => w.id === tlPick.ws)) {
    let last = '';
    try { last = (getRecentLines()[0]) || localStorage.getItem('cl_cl_line') || ''; } catch (e) { /* нет доступа */ }
    const wsLast = last ? getWorkshopIdForLine(last) : null;
    const withLines = workshops.find(w => (w.areas || []).some(a => linesOf(a).length));
    tlPick.ws = wsLast || (withLines && withLines.id) || (workshops[0] && workshops[0].id);
  }

  const recent = (typeof getRecentLines === 'function' ? getRecentLines() : []).filter(l => getLines().includes(l));
  const q = tlPick.q.trim().toLowerCase();

  let body;
  if (q) {
    const found = getAllLinesWithContext().filter(x => x.line.toLowerCase().includes(q));
    body = found.length
      ? `<div class="tl-pick-area-h">Найдено: ${found.length}</div><div class="tl-pick-lines">${found.map(x => tlPickTile(x.line, stats[x.line])).join('')}</div>`
      : '<div class="tl-pick-none">Линия не найдена</div>';
  } else {
    const ws = workshops.find(w => w.id === tlPick.ws);
    const lossCount = (id) => getTopLossesForWorkshop(id).reduce((n, c) => n + (c.items || []).length, 0);
    body = `<div class="hist-seg tl-pick-tabs">${workshops.map(w =>
      `<button type="button" class="${w.id === tlPick.ws ? 'on' : ''}" data-tl-pick-ws="${escapeAttr(w.id)}">${escapeHtml(w.name)}<small>${lossCount(w.id)} потерь</small></button>`).join('')}</div>`;
    body += (ws ? ws.areas || [] : []).map(a => {
      const lines = linesOf(a);
      const closed = tlPick.closed.has(a.id);
      return `<div class="tl-pick-area">
        <button type="button" class="tl-pick-area-h" data-tl-pick-area="${escapeAttr(a.id)}">
          <span class="tl-pick-caret ${closed ? '' : 'open'}">▸</span>${escapeHtml(a.name)}<small>${lines.length} ${pluralRu(lines.length, 'линия', 'линии', 'линий')}</small>
        </button>
        ${closed ? '' : lines.length
          ? `<div class="tl-pick-lines">${lines.map(l => tlPickTile(l, stats[l])).join('')}</div>`
          : '<div class="tl-pick-none">линий нет</div>'}
      </div>`;
    }).join('');
  }

  box.innerHTML = `
    <div class="tl-pick-hero">
      <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
      <h3>На какой линии разбираем потери?</h3>
      <p>Список потерь зависит от цеха линии. Выберите линию — откроются потери и стандарты, которые на них влияют.</p>
      <label class="tl-pick-search">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input type="text" id="tlPickSearch" placeholder="Найти линию: SD12, Lamina…" autocomplete="off" value="${escapeAttr(tlPick.q)}">
      </label>
      ${recent.length ? `<div class="tl-pick-recent"><span>Недавние:</span>${recent.map(l =>
        `<button type="button" class="tl-pick-chip" data-tl-pick-set="${escapeAttr(l)}">${escapeHtml(l)}</button>`).join('')}</div>` : ''}
    </div>
    ${body}`;
}

$('#tlPick')?.addEventListener('click', (e) => {
  const set = e.target.closest('[data-tl-pick-set]');
  if (set) {
    const line = set.dataset.tlPickSet;
    if (typeof addRecentLine === 'function') addRecentLine(line);
    tlPick.q = '';
    return setTopLossLine(line);
  }
  const ws = e.target.closest('[data-tl-pick-ws]');
  if (ws) { tlPick.ws = ws.dataset.tlPickWs; return renderTopLossLinePick(); }
  const area = e.target.closest('[data-tl-pick-area]');
  if (area) {
    const id = area.dataset.tlPickArea;
    if (tlPick.closed.has(id)) tlPick.closed.delete(id); else tlPick.closed.add(id);
    return renderTopLossLinePick();
  }
});
$('#tlPick')?.addEventListener('input', (e) => {
  if (e.target.id !== 'tlPickSearch') return;
  tlPick.q = e.target.value;
  const pos = e.target.selectionStart;
  renderTopLossLinePick();
  const inp = $('#tlPickSearch');
  if (inp) { inp.focus(); inp.setSelectionRange(pos, pos); }
});

function renderTopLossSide(cats, stats) {
  const side = $('#tlSideList');
  const q = tlState.query.trim().toLowerCase();
  side.innerHTML = cats.map(cat => {
    const kind = tlCatKind(cat);
    const items = cat.items || [];
    const matching = items.filter(it => !q || it.name.toLowerCase().includes(q));
    if (q && !matching.length) return '';
    const withStd = matching.filter(it => stats[it.id].count);
    const empty = matching.filter(it => !stats[it.id].count);
    const devs = items.reduce((a, it) => a + stats[it.id].fails, 0);
    const open = q || tlState.openCats.has(cat.id);
    const showEmpty = tlState.showEmpty.has(cat.id);
    const itemBtn = (it) => {
      const s = stats[it.id];
      const on = it.id === tlState.lossId;
      return `<button type="button" class="tl2-item ${on ? 'on' : ''} ${s.count ? '' : 'zero'}" data-tl-loss="${escapeAttr(it.id)}" ${s.count ? '' : 'disabled title="Нет стандартов на этой линии"'}>
        <span class="tl2-item-name">${escapeHtml(it.name)}</span>
        ${s.fails ? `<span class="tl2-badge-red" title="Отклонений в Чек-листе CL за 7 дней">${s.fails} ${pluralRu(s.fails, 'откл.', 'откл.', 'откл.')}</span>` : ''}
        <span class="tl2-item-n" title="Сколько стандартов и параметров влияют на эту потерю">${s.count} ${s.count ? 'станд.' : ''}</span>
      </button>`;
    };
    return `<div class="tl2-cat tl2-c-${TL_CAT_COLORS[kind]} ${open ? 'open' : ''}">
      <button type="button" class="tl2-cat-head" data-tl-cat="${escapeAttr(cat.id)}">
        <span class="tl2-cat-ic">${TL_CAT_ICONS[kind]}</span>
        <span class="tl2-cat-text"><b>${escapeHtml(cat.name)}</b>
          <span>${withStd.length} ${pluralizeLosses(withStd.length)} со стандартами${devs ? ` · <em>⚠ ${devs} откл.</em>` : ''}</span></span>
        <span class="tl2-cat-car">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
        </span>
      </button>
      <div class="tl2-cat-items">
        ${withStd.map(itemBtn).join('')}
        ${empty.length ? (showEmpty || q
          ? empty.map(itemBtn).join('')
          : `<button type="button" class="tl2-more" data-tl-show-empty="${escapeAttr(cat.id)}">+ ещё ${empty.length} без стандартов</button>`) : ''}
        ${!withStd.length && !empty.length ? '<div class="tl2-muted">В категории нет потерь</div>' : ''}
      </div>
    </div>`;
  }).join('') || `<div class="tl2-muted">Ничего не найдено по «${escapeHtml(tlState.query)}»</div>`;
}

function renderTopLossDiag(cats, stats, hidx) {
  const main = $('#tlDiag');
  const loss = tlState.lossId ? findLossById(tlState.lossId) : null;
  if (!loss) {
    main.innerHTML = '<div class="tl2-empty">На этой линии ни одна потеря пока не связана со стандартами. Привяжите потери на странице стандарта или параметра.</div>';
    return;
  }
  const cat = cats.find(c => (c.items || []).some(it => it.id === loss.id));
  const kind = tlCatKind(cat);
  const s = stats[loss.id];
  const checkRows = tlCollectRows([loss.id], tlState.line);
  const last = tlLastCheck(loss.id, tlState.line);

  const rows = tlCollectRows([loss.id], tlState.line)
    .filter(r => tlState.kind === 'all' || (tlState.kind === 'elec') === r.isElec);
  const days7 = tlRecentDays(7);   // 7 суток, слева направо: от старой к новой

  const tableRows = rows.map(({ row, isElec }) => {
    const sq = days7.map(d => {
      const sts = tlRowShiftStatuses(row, d.shifts, tlState.line, hidx);
      const cls = tlDayStatus(sts);
      const label = { ok: 'ОК', fail: 'отклонение', missed: 'пропуск', unchecked: 'не проверено', na: 'не по расписанию' };
      const part = d.shifts.map((sh, k) => {
        const c = tlDayStatus([sts[k]]);
        return (sh.shift === 'day' ? 'день' : 'ночь') + ' — ' + label[c];
      }).join('; ');
      return `<i class="tl2-sq tl2-sq-${cls}" title="${escapeAttr(`${fmtShortDate(d.date)}: ${label[cls]} (${part})`)}"></i>`;
    }).join('');
    const sch = editorRowSchedule(row, tlState.line);
    const title = isElec ? row.paramName : row.title;
    return `<tr>
      <td>${isElec ? '<span class="tl2-kind tl2-kind-el">E-Param</span>' : '<span class="tl2-kind">Мех</span>'}</td>
      <td class="tl2-opl">${escapeHtml(row.oplNumber || '—')}</td>
      <td><div class="tl2-nm">${escapeHtml(title || '—')}</div>
        <div class="tl2-sub">${escapeHtml([row.machine, row.nodePart, row.node].filter(Boolean).join(' · '))}</div></td>
      <td><span class="tl2-last">${sq}</span></td>
      <td>${sch.member ? '<span class="tl2-tag tl2-tag-gr">в чек-листе</span>' : '<span class="tl2-tag tl2-tag-dim">нет в чек-листе</span>'}</td>
      <td class="tl2-act">${isElec
        ? `<button type="button" class="tl2-ib" data-tl-open-ep="${escapeAttr(row.id)}" title="Открыть параметр">${CIL_ICONS.eye}</button>`
        : `<button type="button" class="tl2-ib" data-tl-view="${escapeAttr(row.id)}" title="Открыть стандарт">${CIL_ICONS.eye}</button>`}</td>
    </tr>`;
  }).join('');

  main.innerHTML = `
    <div class="tl2-dg-head tl2-c-${TL_CAT_COLORS[kind]}">
      <span class="tl2-cat-ic tl2-cat-ic-lg">${TL_CAT_ICONS[kind]}</span>
      <div class="tl2-dg-title">
        <div class="tl2-dg-cat">${escapeHtml(cat ? cat.name : '')}</div>
        <h2>${escapeHtml(loss.name)}</h2>
      </div>
      <span class="tl2-sp"></span>
      <button type="button" class="btn btn-tl-check" id="tlStartCheckBtn" ${checkRows.length ? '' : 'disabled'}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
        <span>Проверить ${checkRows.length} ${pluralRu(checkRows.length, 'стандарт', 'стандарта', 'стандартов')}</span>
      </button>
    </div>
    <div class="tl2-sum">
      <span class="tl2-sum-i ${s.fails ? 'red' : 'ok'}">${s.fails ? `Отклонений за 7 дней: <b>${s.fails}</b>` : 'Отклонений за 7 дней нет'}</span>
      <span class="tl2-sum-i ${s.missed ? 'amber' : 'ok'}">${s.missed ? `Пропущено проверок: <b>${s.missed}</b>` : 'Пропусков нет'}</span>
      <span class="tl2-sum-i">Последняя проверка TOP Losses: <b>${last ? fmtShortDate(last.slice(0, 10)) : 'ещё не было'}</b></span>
    </div>
    <h3 class="tl2-sec">Стандарты, которые влияют на «${escapeHtml(loss.name)}»
      <span>Квадраты — как проходила проверка в Чек-листе CL за последние 7 дней — один квадрат на день, слева направо от старого дня к новому</span></h3>
    <div class="tl2-tools">
      <span class="tl2-seg">
        <button type="button" class="${tlState.kind === 'all' ? 'on' : ''}" data-tl-kind="all">Все ${s.count}</button>
        <button type="button" class="${tlState.kind === 'mech' ? 'on' : ''}" data-tl-kind="mech">Механические ${s.mech}</button>
        <button type="button" class="${tlState.kind === 'elec' ? 'on' : ''}" data-tl-kind="elec">Электронные ${s.elec}</button>
      </span>
      <span class="tl2-legend">
        <span><i class="tl2-sq tl2-sq-ok"></i>ОК</span><span><i class="tl2-sq tl2-sq-fail"></i>Отклонение</span>
        <span><i class="tl2-sq tl2-sq-missed"></i>Пропуск</span><span><i class="tl2-sq tl2-sq-na"></i>Не по расписанию</span>
      </span>
    </div>
    <div class="tl2-table-wrap"><table class="tl2-table">
      <thead><tr><th>Тип</th><th>OPL</th><th>Стандарт / параметр</th><th title="Последние 7 дней Чек-листа CL: один квадрат — один день (день и ночь вместе), слева направо — от старого к новому">Последние 7 дней</th><th>Чек-лист CL</th><th></th></tr></thead>
      <tbody>${tableRows || '<tr><td colspan="6" class="tl2-muted">Нет строк этого типа</td></tr>'}</tbody>
    </table></div>`;
}

/* ============================================================
   ОБРАБОТЧИКИ
   ============================================================ */

$('#tlLinePill')?.addEventListener('click', () => {
  linePickerOnSelect = (line) => setTopLossLine(line);
  openLinePickerModal();
});

/* Назад к выбору линии: сбрасываем линию, снова показывается экран выбора */
function backToTopLossLinePick() {
  tlState.line = '';
  tlState.lossId = null;
  tlState.pickedLoss = null;
  tlState.query = '';
  tlState.openCats.clear();
  try { localStorage.removeItem(TL_LINE_KEY); } catch (e) { /* нет доступа */ }
  const search = $('#tlSearch');
  if (search) search.value = '';
  backToTopLossSelect();
}
$('#tlBackToLinePick')?.addEventListener('click', () => backToTopLossLinePick());

$('#tlSearch')?.addEventListener('input', (e) => {
  tlState.query = e.target.value;
  renderTopLossCategories();
});

$('#tlSelectView')?.addEventListener('click', (e) => {
  if (e.target.closest('[data-tl-pick-line]')) {
    linePickerOnSelect = (line) => setTopLossLine(line);
    return openLinePickerModal();
  }
  const cat = e.target.closest('[data-tl-cat]');
  if (cat) {
    const id = cat.dataset.tlCat;
    tlState.openCats.has(id) ? tlState.openCats.delete(id) : tlState.openCats.add(id);
    return renderTopLossCategories();
  }
  const more = e.target.closest('[data-tl-show-empty]');
  if (more) {
    tlState.showEmpty.add(more.dataset.tlShowEmpty);
    return renderTopLossCategories();
  }
  const lossBtn = e.target.closest('[data-tl-loss]');
  if (lossBtn) {
    tlState.lossId = tlState.pickedLoss = lossBtn.dataset.tlLoss;
    return renderTopLossCategories();
  }
  const kind = e.target.closest('[data-tl-kind]');
  if (kind) {
    tlState.kind = kind.dataset.tlKind;
    return renderTopLossCategories();
  }
  const view = e.target.closest('[data-tl-view]');
  if (view && typeof openStandardView === 'function') return openStandardView(view.dataset.tlView);
  const ep = e.target.closest('[data-tl-open-ep]');
  if (ep && typeof openEparamPage === 'function') return openEparamPage(ep.dataset.tlOpenEp);
  if (e.target.closest('#tlStartCheckBtn')) {
    const ids = [tlState.lossId].filter(Boolean);
    buildTopLossChecklist(ids);
  }
});

/* Возврат на экран разбора */
function backToTopLossSelect() {
  $('#tlSelectView').style.display = 'block';
  $('#tlChecklistView').style.display = 'none';
  $('#tlSummaryView').style.display = 'none';
  renderTopLossCategories();
}
