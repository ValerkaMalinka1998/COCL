/* ============================================================
   ВКЛАДКА «TOP Losses»: разбор потерь линии
   Один путь сверху вниз: «Что случилось?» (категория → потеря) →
   «Что проверить» (стандарты и E-Param: норма, последние смены
   Чек-листа CL) → кнопка проверки внизу. Проверка — по желанию (toploss-check.js).
   Модуль общего пространства имён: функции и переменные видны
   во всех файлах. Порядок подключения — index.html.
   ============================================================ */

const TL_LINE_KEY = 'cl_tl_line';

/* Состояние экрана разбора */
const tlState = {
  line: '',
  selected: new Set(),        // выбранные потери (по порядку выбора)
  multi: false,               // режим «выбрать несколько»
  catId: null,                // открытая категория
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
    const planned = isValidationShift(row, date, shift) || (w.member && (w.schedule || []).some(x => x.day === dow && x.shift === shift));
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
    tlState.selected.clear();
  }
}

function setTopLossLine(line) {
  tlState.line = line || '';
  tlState.selected.clear();
  tlState.catId = null;
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

  // Убираем потери, которых больше нет; если ничего не выбрано — берём потерю
  // с наибольшим числом отклонений (или первую со стандартами)
  tlState.selected = new Set([...tlState.selected].filter(id => stats[id] && stats[id].count));
  if (!tlState.selected.size) {
    const all = cats.flatMap(c => c.items || []).filter(it => stats[it.id].count);
    all.sort((a, c) => stats[c.id].fails - stats[a.id].fails);
    if (all[0]) tlState.selected.add(all[0].id);
  }
  if (!cats.some(c => c.id === tlState.catId)) {
    const first = [...tlState.selected][0];
    const selCat = cats.find(c => (c.items || []).some(it => it.id === first));
    tlState.catId = (selCat || cats[0]).id;
  }

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

/* Шаг 1. «Что случилось на линии?»: плитки категорий и потери выбранной категории */
function renderTopLossSide(cats, stats) {
  const side = $('#tlSideList');
  const q = tlState.query.trim().toLowerCase();
  const activeCat = cats.find(c => c.id === tlState.catId) || cats[0];

  const tiles = cats.map(cat => {
    const kind = tlCatKind(cat);
    const items = cat.items || [];
    const withStd = items.filter(it => stats[it.id].count);
    const devs = items.reduce((a, it) => a + stats[it.id].fails, 0);
    const picked = items.filter(it => tlState.selected.has(it.id)).length;
    const on = !q && cat.id === activeCat.id;
    return `<button type="button" class="tl4-cat tl2-c-${TL_CAT_COLORS[kind]}${on ? ' on' : ''}" data-tl-cat="${escapeAttr(cat.id)}" aria-pressed="${on}">
      <span class="tl4-cat-ic">${TL_CAT_ICONS[kind]}</span>
      <span class="tl4-cat-text">
        <b>${escapeHtml(cat.name)}</b>
        <span>${withStd.length} ${pluralizeLosses(withStd.length)} со стандартами</span>
      </span>
      <span class="tl4-cat-side">
        ${devs ? `<em class="tl4-flag red" title="Отклонений в Чек-листе CL за 7 дней">${devs} откл.</em>` : '<em class="tl4-flag ok">всё в норме</em>'}
        ${picked ? `<em class="tl4-flag pick">выбрано ${picked}</em>` : ''}
      </span>
    </button>`;
  }).join('');

  // Потери: при поиске — по всем категориям, иначе — открытой категории
  const pool = q
    ? cats.flatMap(c => (c.items || []).filter(it => it.name.toLowerCase().includes(q)).map(it => ({ it, cat: c })))
    : (activeCat.items || []).map(it => ({ it, cat: activeCat }));
  const withStd = pool.filter(x => stats[x.it.id].count)
    .sort((a, c) => stats[c.it.id].fails - stats[a.it.id].fails || a.it.name.localeCompare(c.it.name, 'ru'));
  const empty = pool.filter(x => !stats[x.it.id].count);
  const showEmpty = q || tlState.showEmpty.has(activeCat.id);

  const chip = ({ it, cat }) => {
    const s = stats[it.id];
    const on = tlState.selected.has(it.id);
    const dot = q ? `<i class="tl4-dot tl2-c-${TL_CAT_COLORS[tlCatKind(cat)]}"></i>` : '';
    return `<button type="button" class="tl4-chip${on ? ' on' : ''}${s.count ? '' : ' zero'}" data-tl-loss="${escapeAttr(it.id)}" aria-pressed="${on}" ${s.count ? '' : 'disabled title="Нет стандартов на этой линии"'}>
      ${on ? '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>' : dot}
      <span>${escapeHtml(it.name)}</span>
      ${s.fails ? `<em class="tl4-chip-fail" title="Отклонений в Чек-листе CL за 7 дней">${s.fails}</em>` : ''}
    </button>`;
  };

  const chips = withStd.map(chip).join('') +
    (empty.length
      ? (showEmpty ? empty.map(chip).join('')
        : `<button type="button" class="tl4-more" data-tl-show-empty="${escapeAttr(activeCat.id)}">+ ещё ${empty.length} без стандартов</button>`)
      : '');

  side.innerHTML = `
    <div class="tl4-cats">${q ? '' : tiles}</div>
    <div class="tl4-losses-head">
      <b>${q ? 'Найденные потери' : escapeHtml(activeCat.name)}</b>
      <button type="button" class="tl4-multi${tlState.multi ? ' on' : ''}" data-tl-multi aria-pressed="${tlState.multi}" title="Отметьте несколько потерь — проверим стандарты сразу по всем">
        <i></i>Выбрать несколько
      </button>
    </div>
    <div class="tl4-chips">${chips || '<span class="tl2-muted">' + (q ? `Ничего не найдено по «${escapeHtml(tlState.query)}»` : 'В категории нет потерь') + '</span>'}</div>`;
}

/* Шаг 2. «Что проверить»: стандарты и параметры по выбранным потерям + нижняя панель */
function renderTopLossDiag(cats, stats, hidx) {
  const main = $('#tlDiag');
  const bar = $('#tlBar');
  const ids = [...tlState.selected];
  if (!ids.length) {
    main.innerHTML = '<div class="tl2-empty">На этой линии ни одна потеря пока не связана со стандартами. Привяжите потери на странице стандарта или параметра.</div>';
    if (bar) bar.innerHTML = '';
    return;
  }

  const allRows = tlCollectRows(ids, tlState.line);
  const rows = allRows.filter(r => tlState.kind === 'all' || (tlState.kind === 'elec') === r.isElec);
  const shifts7 = tlRecentShifts(7).reverse();    // слева направо: от старой к новой
  const shifts14 = tlRecentShifts(14);
  const mechN = allRows.filter(r => !r.isElec).length;
  const elecN = allRows.length - mechN;

  // Сводка по выбранным потерям: каждая строка считается один раз
  let fails = 0, missed = 0;
  allRows.forEach(r => tlRowShiftStatuses(r.row, shifts14, tlState.line, hidx).forEach(st => {
    if (st === 'FAIL') fails++; else if (st === 'missed') missed++;
  }));
  const last = ids.map(id => tlLastCheck(id, tlState.line)).filter(Boolean).sort().pop();
  const lossName = (id) => { const l = findLossById(id); return l ? l.name : ''; };

  // Карточки: сначала с отклонениями, потом с пропусками
  const cards = rows.map(({ row, isElec, losses }) => {
    const statuses = tlRowShiftStatuses(row, shifts7, tlState.line, hidx);
    const sev = statuses.includes('FAIL') ? 'fail' : statuses.includes('missed') ? 'missed' : statuses.includes('OK') ? 'ok' : 'none';
    return { row, isElec, losses, statuses, sev };
  }).sort((a, c) => ['fail', 'missed', 'ok', 'none'].indexOf(a.sev) - ['fail', 'missed', 'ok', 'none'].indexOf(c.sev));
  const sevText = { fail: 'было отклонение', missed: 'есть пропуски', ok: 'в норме', none: 'нет данных за 7 смен' };

  const cardHtml = ({ row, isElec, losses, statuses, sev }) => {
    const norm = cilNorm(row, '', isElec);
    const sq = statuses.map((st, i) => {
      const sh = shifts7[i];
      const cls = st === 'OK' ? 'ok' : st === 'FAIL' ? 'fail' : st === 'missed' ? 'missed' : st === 'UNCHECKED' ? 'unchecked' : 'na';
      const label = { ok: 'ОК', fail: 'отклонение', missed: 'пропущено', unchecked: 'не проверено', na: 'не по расписанию' }[cls];
      return `<i class="tl2-sq tl2-sq-${cls}" title="${escapeAttr(`${fmtShortDate(sh.date)} · ${sh.shift === 'day' ? 'день' : 'ночь'} — ${label}`)}"></i>`;
    }).join('');
    const sch = editorRowSchedule(row, tlState.line);
    const title = isElec ? row.paramName : row.title;
    const tags = ids.length > 1
      ? `<div class="tl4-std-losses">${losses.map(id => `<span>${escapeHtml(lossName(id))}</span>`).join('')}</div>` : '';
    const open = isElec
      ? `data-tl-open-ep="${escapeAttr(row.id)}" title="Открыть параметр"`
      : `data-tl-view="${escapeAttr(row.id)}" title="Открыть стандарт"`;
    return `<article class="tl4-std tl4-sev-${sev}">
      <div class="tl4-std-top">
        ${isElec ? '<span class="tl2-kind tl2-kind-el">E-Param</span>' : '<span class="tl2-kind">Мех</span>'}
        <span class="tl2-opl">${escapeHtml(row.oplNumber || '')}</span>
        <span class="tl4-std-state">${sevText[sev]}</span>
        <button type="button" class="tl2-ib" ${open}>${CIL_ICONS.eye}</button>
      </div>
      <h3 class="tl4-std-title">${escapeHtml(title || '—')}</h3>
      <div class="tl2-sub">${escapeHtml([row.machine, row.nodePart, row.node].filter(Boolean).join(' · '))}</div>
      ${tags}
      <div class="tl4-std-row"><span class="tl4-lbl">Норма</span><span class="tl2-norm">${norm.html}</span></div>
      <div class="tl4-std-row"><span class="tl4-lbl">Последние 7 смен</span><span class="tl2-last">${sq}</span>
        ${sch.member ? `<span class="tl2-tag tl2-tag-gr">${sch.count} / 14 смен</span>` : '<span class="tl2-tag tl2-tag-dim">не в расписании</span>'}</div>
    </article>`;
  };

  const chips = ids.length > 1 ? ids.map(id => `<span class="tl4-sel-chip">${escapeHtml(lossName(id))}<button type="button" data-tl-extra-remove="${escapeAttr(id)}" title="Убрать из проверки">✕</button></span>`).join('') : '';
  const first = lossName(ids[0]);

  main.innerHTML = `
    <div class="tl4-head">
      <div class="tl4-head-text">
        <h2>Что проверить: ${ids.length > 1 ? `${ids.length} ${pluralizeLosses(ids.length)}` : `«${escapeHtml(first)}»`}</h2>
        <p>Стандарты и параметры, которые влияют ${ids.length > 1 ? 'на выбранные потери' : 'на эту потерю'}</p>
        ${chips ? `<div class="tl4-sel">${chips}</div>` : ''}
      </div>
      <span class="tl2-seg">
        <button type="button" class="${tlState.kind === 'all' ? 'on' : ''}" data-tl-kind="all">Все ${allRows.length}</button>
        <button type="button" class="${tlState.kind === 'mech' ? 'on' : ''}" data-tl-kind="mech">Механические ${mechN}</button>
        <button type="button" class="${tlState.kind === 'elec' ? 'on' : ''}" data-tl-kind="elec">Электронные ${elecN}</button>
      </span>
    </div>
    <div class="tl2-sum">
      <span class="tl2-sum-i ${fails ? 'red' : 'ok'}">${fails ? `Отклонений за 7 дней: <b>${fails}</b>` : 'Отклонений за 7 дней нет'}</span>
      <span class="tl2-sum-i ${missed ? 'amber' : 'ok'}">${missed ? `Пропущено проверок: <b>${missed}</b>` : 'Пропусков нет'}</span>
      <span class="tl2-sum-i">Последняя проверка TOP Losses: <b>${last ? fmtShortDate(last.slice(0, 10)) : 'ещё не было'}</b></span>
    </div>
    <div class="tl4-grid">${cards.map(cardHtml).join('') || '<div class="tl2-muted">Нет строк этого типа</div>'}</div>
    <div class="tl2-legend tl4-legend">
      <span>Квадраты — последние 7 смен Чек-листа CL, слева направо от старой к новой:</span>
      <span><i class="tl2-sq tl2-sq-ok"></i>ОК</span><span><i class="tl2-sq tl2-sq-fail"></i>Отклонение</span>
      <span><i class="tl2-sq tl2-sq-missed"></i>Пропуск</span><span><i class="tl2-sq tl2-sq-na"></i>Не по расписанию</span>
    </div>`;

  // Нижняя панель: всегда на виду, одно главное действие
  const names = ids.length > 2 ? `${lossName(ids[0])} и ещё ${ids.length - 1}` : ids.map(lossName).join(', ');
  if (bar) bar.innerHTML = `
    <div class="tl4-bar-in">
      <div class="tl4-bar-text">
        <b>${allRows.length} ${pluralRu(allRows.length, 'стандарт', 'стандарта', 'стандартов')} на проверку</b>
        <span>${escapeHtml(names)}</span>
      </div>
      <button type="button" class="btn btn-tl-check" id="tlStartCheckBtn" ${allRows.length ? '' : 'disabled'}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
        <span>Начать проверку</span>
      </button>
    </div>`;
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
    tlState.catId = cat.dataset.tlCat;
    tlState.query = '';
    const s = $('#tlSearch'); if (s) s.value = '';
    return renderTopLossCategories();
  }
  const more = e.target.closest('[data-tl-show-empty]');
  if (more) {
    tlState.showEmpty.add(more.dataset.tlShowEmpty);
    return renderTopLossCategories();
  }
  if (e.target.closest('[data-tl-multi]')) {
    tlState.multi = !tlState.multi;
    // Выключили «несколько» — оставляем первую выбранную потерю
    if (!tlState.multi && tlState.selected.size > 1) tlState.selected = new Set([[...tlState.selected][0]]);
    return renderTopLossCategories();
  }
  const lossBtn = e.target.closest('[data-tl-loss]');
  if (lossBtn) {
    const id = lossBtn.dataset.tlLoss;
    if (tlState.multi) {
      // Отметить / снять; последнюю выбранную снять нельзя
      if (tlState.selected.has(id)) { if (tlState.selected.size > 1) tlState.selected.delete(id); }
      else tlState.selected.add(id);
    } else {
      tlState.selected = new Set([id]);
    }
    return renderTopLossCategories();
  }
  const rm = e.target.closest('[data-tl-extra-remove]');
  if (rm) {
    if (tlState.selected.size > 1) tlState.selected.delete(rm.dataset.tlExtraRemove);
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
    const ids = [...tlState.selected];
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
