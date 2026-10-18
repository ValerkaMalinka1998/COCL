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
  extraLossIds: new Set(),    // ещё потери, добавленные в проверку
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
    const planned = w.member && (w.schedule || []).some(x => x.day === dow && x.shift === shift);
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
    tlState.extraLossIds.clear();
  }
}

function setTopLossLine(line) {
  tlState.line = line || '';
  tlState.lossId = null;
  tlState.extraLossIds.clear();
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

  const split = $('#tlSplit');
  const pick = $('#tlPick');
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
  const shifts14 = tlRecentShifts(14);
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
function tlLinePickStats() {
  const border = Date.now() - 7 * 86400000;
  const out = {};
  getHistory().forEach(h => {
    if (h.mode !== 'toploss') return;
    const o = out[h.line] || (out[h.line] = { fails: 0, last: null });
    if (!o.last || h.timestamp > o.last) o.last = h.timestamp;
    if (new Date(h.timestamp).getTime() >= border) {
      o.fails += (h.items || []).filter(it => it.status === 'FAIL').length;
    }
  });
  return out;
}

function tlPickTile(line, st) {
  const days = st && st.last ? Math.floor((Date.now() - new Date(st.last).getTime()) / 86400000) : null;
  let cls = 'none', sub = 'проверок не было', sub2 = '';
  if (st && st.last) {
    sub2 = 'посл. проверка ' + fmtShortDate(todayISO(new Date(st.last)));
    if (st.fails) { cls = 'red'; sub = `${st.fails} откл. за 7 дн.`; }
    else if (days > 30) { cls = 'amber'; sub = `нет проверок ${days} дн.`; sub2 = ''; }
    else { cls = 'green'; sub = 'без откл.'; }
  }
  return `<button type="button" class="tl-pick-ln tl-pick-ln-${cls}" data-tl-pick-set="${escapeAttr(line)}">
    <b>${escapeHtml(line)}</b><span class="${cls === 'red' ? 'tl-pick-bad' : ''}">${escapeHtml(sub)}</span>${sub2 ? `<span>${escapeHtml(sub2)}</span>` : ''}
  </button>`;
}

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
      const extra = tlState.extraLossIds.has(it.id);
      return `<button type="button" class="tl2-item ${on ? 'on' : ''} ${extra ? 'extra' : ''} ${s.count ? '' : 'zero'}" data-tl-loss="${escapeAttr(it.id)}" ${s.count ? '' : 'disabled title="Нет стандартов на этой линии"'}>
        <span class="tl2-item-name">${escapeHtml(it.name)}</span>
        ${s.fails ? `<span class="tl2-badge-red" title="Отклонений в Чек-листе CL за 7 дней">⚠ ${s.fails}</span>` : ''}
        <span class="tl2-item-n">${s.count}</span>
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
  const checkIds = [...new Set([loss.id, ...tlState.extraLossIds])];
  const checkRows = tlCollectRows(checkIds, tlState.line);
  const last = tlLastCheck(loss.id, tlState.line);

  const rows = tlCollectRows([loss.id], tlState.line)
    .filter(r => tlState.kind === 'all' || (tlState.kind === 'elec') === r.isElec);
  const shifts7 = tlRecentShifts(7).reverse();   // слева направо: от старой к новой

  const extraChips = [...tlState.extraLossIds].map(id => {
    const l = findLossById(id);
    return l ? `<span class="tl2-extra-chip">${escapeHtml(l.name)}<button type="button" data-tl-extra-remove="${escapeAttr(id)}" title="Убрать из проверки">✕</button></span>` : '';
  }).join('');

  const tableRows = rows.map(({ row, isElec }) => {
    const norm = cilNorm(row, '', isElec);
    const statuses = tlRowShiftStatuses(row, shifts7, tlState.line, hidx);
    const sq = statuses.map((st, i) => {
      const sh = shifts7[i];
      const cls = st === 'OK' ? 'ok' : st === 'FAIL' ? 'fail' : st === 'missed' ? 'missed' : st === 'UNCHECKED' ? 'unchecked' : 'na';
      const label = { ok: 'ОК', fail: 'отклонение', missed: 'пропущено', unchecked: 'не проверено', na: 'не по расписанию' }[cls];
      return `<i class="tl2-sq tl2-sq-${cls}" title="${escapeAttr(`${fmtShortDate(sh.date)} · ${sh.shift === 'day' ? 'день' : 'ночь'} — ${label}`)}"></i>`;
    }).join('');
    const sch = editorRowSchedule(row, tlState.line);
    const title = isElec ? row.paramName : row.title;
    return `<tr>
      <td>${isElec ? '<span class="tl2-kind tl2-kind-el">E-Param</span>' : '<span class="tl2-kind">Мех</span>'}</td>
      <td class="tl2-opl">${escapeHtml(row.oplNumber || '—')}</td>
      <td><div class="tl2-nm">${escapeHtml(title || '—')}</div>
        <div class="tl2-sub">${escapeHtml([row.machine, row.nodePart, row.node].filter(Boolean).join(' · '))}</div></td>
      <td class="tl2-norm">${norm.html}</td>
      <td><span class="tl2-last">${sq}</span></td>
      <td>${sch.member ? `<span class="tl2-tag tl2-tag-gr">${sch.count} / 14 смен</span>` : '<span class="tl2-tag tl2-tag-dim">не в расписании</span>'}</td>
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
        <span>Проверить (${checkRows.length})</span>
      </button>
    </div>
    ${extraChips ? `<div class="tl2-extra">В проверку добавлены: ${extraChips}</div>` : ''}
    <div class="tl2-kpis">
      <div class="tl2-kpi"><b>${s.count}</b><span>в проверке: ${s.mech} мех.${s.elec ? ` + ${s.elec} E-Param` : ''}</span></div>
      <div class="tl2-kpi ${s.fails ? 'red' : ''}"><b>${s.fails}</b><span>отклонений в Чек-листе CL за 7 дней</span></div>
      <div class="tl2-kpi ${s.missed ? 'amber' : ''}"><b>${s.missed}</b><span>пропущенных проверок за 7 дней</span></div>
      <div class="tl2-kpi"><b>${last ? fmtShortDate(last.slice(0, 10)) : '—'}</b><span>последняя проверка TOP Losses</span></div>
    </div>
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
      <thead><tr><th>Тип</th><th>OPL</th><th>Стандарт / параметр</th><th>Норма</th><th title="Последние 7 смен Чек-листа CL, слева направо — от старой к новой">Последние 7 смен CL</th><th>Расписание</th><th></th></tr></thead>
      <tbody>${tableRows || '<tr><td colspan="7" class="tl2-muted">Нет строк этого типа</td></tr>'}</tbody>
    </table></div>
    <div class="tl2-hint">Чтобы проверить несколько потерь сразу — нажмите на потерю слева с зажатым Ctrl.</div>`;
}

/* ============================================================
   ОБРАБОТЧИКИ
   ============================================================ */

$('#tlLinePill')?.addEventListener('click', () => {
  linePickerOnSelect = (line) => setTopLossLine(line);
  openLinePickerModal();
});

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
    const id = lossBtn.dataset.tlLoss;
    if ((e.ctrlKey || e.metaKey) && tlState.lossId && id !== tlState.lossId) {
      // Ctrl+клик — добавить / убрать потерю из проверки, не меняя разбор
      tlState.extraLossIds.has(id) ? tlState.extraLossIds.delete(id) : tlState.extraLossIds.add(id);
    } else {
      tlState.lossId = id;
      tlState.extraLossIds.delete(id);
    }
    return renderTopLossCategories();
  }
  const rm = e.target.closest('[data-tl-extra-remove]');
  if (rm) {
    tlState.extraLossIds.delete(rm.dataset.tlExtraRemove);
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
    const ids = [...new Set([tlState.lossId, ...tlState.extraLossIds])].filter(Boolean);
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
