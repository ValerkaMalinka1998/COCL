/* ============================================================
   ВКЛАДКА «CL при переходах»: экран выбора линии
   Как в TOP Losses: пока линия не выбрана, вместо условий и
   чек-листа — экран с поиском, недавними линиями, цехами и
   плитками линий. Стили — .tl-pick-* (css/views/toploss.css).
   Модуль общего пространства имён. Порядок — index.html.
   ============================================================ */

const coclPick = { ws: null, q: '', closed: new Set() };

/* Сводка по линиям: последняя проверка и её отклонения.
   Общая для экранов выбора линии COCL и TOP Losses (kind — histKind записи). */
function pickLineStats(kind) {
  const out = {};
  getHistory().forEach(h => {
    if (histKind(h) !== kind) return;
    const o = out[h.line];
    if (o && o.last >= h.timestamp) return;
    out[h.line] = { last: h.timestamp, fails: (h.items || []).filter(it => it.status === 'FAIL').length };
  });
  return out;
}

/* Плитка линии: итог последней проверки, без скрытого окна в N дней */
function pickTileHtml(line, st, attr) {
  let cls = 'none', sub = 'проверок не было', sub2 = '';
  if (st && st.last) {
    const days = Math.floor((Date.now() - new Date(st.last).getTime()) / 86400000);
    sub2 = 'посл. проверка ' + fmtShortDate(todayISO(new Date(st.last)));
    if (st.fails) { cls = 'red'; sub = `${st.fails} откл.`; }
    else { cls = 'green'; sub = 'без откл.'; }
    if (days > 30) { cls = 'amber'; sub2 = `нет проверок ${days} дн.`; }
  }
  return `<button type="button" class="tl-pick-ln tl-pick-ln-${cls}" ${attr}="${escapeAttr(line)}">
    <b>${escapeHtml(line)}</b><span class="${st && st.fails ? 'tl-pick-bad' : ''}">${escapeHtml(sub)}</span>${sub2 ? `<span>${escapeHtml(sub2)}</span>` : ''}
  </button>`;
}

function coclLinePickStats() { return pickLineStats('cocl'); }

function coclPickTile(line, st) { return pickTileHtml(line, st, 'data-cocl-pick-set'); }

function renderCoclLinePick() {
  const box = $('#coclPick');
  if (!box) return;
  const workshops = getWorkshops();
  const stats = coclLinePickStats();
  const linesOf = (a) => Array.isArray(a.blocks) ? a.blocks.flatMap(b => b.lines || []) : (a.lines || []);

  // Цех по умолчанию — цех последней линии, иначе первый с линиями
  if (!coclPick.ws || !workshops.some(w => w.id === coclPick.ws)) {
    let last = '';
    try { last = (getRecentLines()[0]) || localStorage.getItem('cl_cl_line') || ''; } catch (e) { /* нет доступа */ }
    const wsLast = last ? getWorkshopIdForLine(last) : null;
    const withLines = workshops.find(w => (w.areas || []).some(a => linesOf(a).length));
    coclPick.ws = wsLast || (withLines && withLines.id) || (workshops[0] && workshops[0].id);
  }

  const recent = (typeof getRecentLines === 'function' ? getRecentLines() : []).filter(l => getLines().includes(l));
  const q = coclPick.q.trim().toLowerCase();

  let body;
  if (q) {
    const found = getAllLinesWithContext().filter(x => x.line.toLowerCase().includes(q));
    body = found.length
      ? `<div class="tl-pick-area-h">Найдено: ${found.length}</div><div class="tl-pick-lines">${found.map(x => coclPickTile(x.line, stats[x.line])).join('')}</div>`
      : '<div class="tl-pick-none">Линия не найдена</div>';
  } else {
    const ws = workshops.find(w => w.id === coclPick.ws);
    body = `<div class="hist-seg tl-pick-tabs">${workshops.map(w =>
      `<button type="button" class="${w.id === coclPick.ws ? 'on' : ''}" data-cocl-pick-ws="${escapeAttr(w.id)}">${escapeHtml(w.name)}</button>`).join('')}</div>`;
    body += (ws ? ws.areas || [] : []).map(a => {
      const lines = linesOf(a);
      const closed = coclPick.closed.has(a.id);
      return `<div class="tl-pick-area">
        <button type="button" class="tl-pick-area-h" data-cocl-pick-area="${escapeAttr(a.id)}">
          <span class="tl-pick-caret ${closed ? '' : 'open'}">▸</span>${escapeHtml(a.name)}<small>${lines.length} ${pluralRu(lines.length, 'линия', 'линии', 'линий')}</small>
        </button>
        ${closed ? '' : lines.length
          ? `<div class="tl-pick-lines">${lines.map(l => coclPickTile(l, stats[l])).join('')}</div>`
          : '<div class="tl-pick-none">линий нет</div>'}
      </div>`;
    }).join('');
  }

  box.innerHTML = `
    <div class="tl-pick-hero">
      <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
      <h3>На какой линии проверяем переход?</h3>
      <p>Смена сорта, CL в ТО или CL в Конвертацию. Выберите линию — затем тип проверки.</p>
      <label class="tl-pick-search">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input type="text" id="coclPickSearch" placeholder="Найти линию: SD12, Lamina…" autocomplete="off" value="${escapeAttr(coclPick.q)}">
      </label>
      ${recent.length ? `<div class="tl-pick-recent"><span>Недавние:</span>${recent.map(l =>
        `<button type="button" class="tl-pick-chip" data-cocl-pick-set="${escapeAttr(l)}">${escapeHtml(l)}</button>`).join('')}</div>` : ''}
    </div>
    ${body}`;
}

/* Шапка: шаги и подпись по текущему состоянию вкладки */
function renderCoclHead() {
  const steps = $('#coclSteps');
  if (!steps) return;
  const hasLine = !!($('#lineSelect')?.value);
  const summaryOpen = $('#coclSummaryView')?.style.display === 'block';
  const step = !hasLine ? 1 : summaryOpen ? 4 : coclState.checking ? 3 : 2;
  steps.innerHTML = tabStepsHtml(['Линия', 'Тип и бренды', 'Чек-лист'], step);

  const typeName = { ChangeOver: 'Смена сорта', CL_TO: 'CL в ТО', CL_Conversion: 'CL в Конвертацию' };
  const type = $('#transitionType')?.value || '';
  const from = $('#brandFrom')?.value || '';
  const to = $('#brandTo')?.value || '';
  const sub = $('#coclHeadSub');
  if (sub) {
    sub.textContent = !type
      ? 'Смена сорта · CL в ТО · CL в Конвертацию'
      : (typeName[type] || type) + (type === 'ChangeOver' && to ? ` · бренд ${from ? from + ' → ' : '→ '}${to}` : '');
  }
}

/* Показать экран выбора, пока линии нет (и не идёт проверка / нет резюме) */
function updateCoclPick() {
  const tab = $('#tab-check');
  if (!tab) return;
  const summaryOpen = $('#coclSummaryView')?.style.display === 'block';
  const picking = !($('#lineSelect')?.value) && !coclState.checking && !summaryOpen;
  tab.classList.toggle('cocl-picking', picking);
  const pick = $('#coclPick');
  if (pick) pick.style.display = picking ? '' : 'none';
  if (picking) renderCoclLinePick();
  const back = $('#coclBackToPick');
  if (back) back.style.display = picking || coclState.checking || !($('#lineSelect')?.value) ? 'none' : '';
  renderCoclHead();
}

$('#coclPick')?.addEventListener('click', (e) => {
  const set = e.target.closest('[data-cocl-pick-set]');
  if (set) {
    const line = set.dataset.coclPickSet;
    if (typeof addRecentLine === 'function') addRecentLine(line);
    coclPick.q = '';
    return setCoclLine(line);
  }
  const ws = e.target.closest('[data-cocl-pick-ws]');
  if (ws) { coclPick.ws = ws.dataset.coclPickWs; return renderCoclLinePick(); }
  const area = e.target.closest('[data-cocl-pick-area]');
  if (area) {
    const id = area.dataset.coclPickArea;
    if (coclPick.closed.has(id)) coclPick.closed.delete(id); else coclPick.closed.add(id);
    return renderCoclLinePick();
  }
});
$('#coclPick')?.addEventListener('input', (e) => {
  if (e.target.id !== 'coclPickSearch') return;
  coclPick.q = e.target.value;
  const pos = e.target.selectionStart;
  renderCoclLinePick();
  const inp = $('#coclPickSearch');
  if (inp) { inp.focus(); inp.setSelectionRange(pos, pos); }
});

/* «К выбору линии»: сбрасываем форму и снова показываем экран выбора */
$('#coclBackToPick')?.addEventListener('click', () => resetCheckForm());

/* Выбор линии любым способом (плитка, окно из чипа) обновляет экран */
$('#lineSelect')?.addEventListener('change', () => updateCoclPick());
