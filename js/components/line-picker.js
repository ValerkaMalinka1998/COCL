/* ============================================================
   КОМПОНЕНТЫ: выбор линии
   #linePickerModal.
   Модуль общего пространства имён: функции и переменные видны
   во всех файлах. Порядок подключения — index.html.
   ============================================================ */

/* ============================================================
   ВЫБОР ЛИНИИ — двухпанельное окно (#linePickerModal)
   Слева — цеха, справа — все линии выбранного цеха, сгруппированные
   по участкам и блокам. Поиск — по коду линии, цеху, участку, блоку.
   ============================================================ */

const linePickerState = {
  workshopId: null,
  current: null   // выбранная линия вкладки; null — последняя из «недавних»
};
function resetLinePickerState() {
  linePickerState.workshopId = null;
  linePickerState.current = null;
}
function linePickerCurrent() {
  return linePickerState.current != null ? linePickerState.current : (getRecentLines()[0] || '');
}

/* Группы линий цеха: [{ title, lines[] }]. Участок с блоками → «Участок · Блок».
   Группы без линий пропускаем. */
function getLinePickerGroups(w) {
  const groups = [];
  (w.areas || []).forEach(a => {
    if (Array.isArray(a.blocks) && a.blocks.length) {
      a.blocks.forEach(b => {
        const lines = (b.lines || []).filter(Boolean);
        if (lines.length) groups.push({ title: `${a.name} · ${b.name}`, area: a.name, lines });
      });
    } else {
      const lines = (a.lines || []).filter(Boolean);
      if (lines.length) groups.push({ title: a.name, area: a.name, lines });
    }
  });
  return groups;
}

function countLinePickerLines(w) {
  return getLinePickerGroups(w).reduce((n, g) => n + g.lines.length, 0);
}

/* --- Открытие / закрытие --- */
function openLinePickerModal(current) {
  const modal = $('#linePickerModal');
  if (!modal) return;

  const search = $('#linePickerSearch');
  if (search) search.value = '';

  resetLinePickerState();
  if (typeof current === 'string') linePickerState.current = current;   // не событие клика
  renderLinePickerModal('');
  openModal(modal);
  setTimeout(() => { if (search) search.focus(); }, 100);
}

function closeLinePickerModal() {
  closeModal('#linePickerModal');
  resetLinePickerState();
}

/* --- Главный рендер --- */
function renderLinePickerModal(query = '') {
  const body = $('#linePickerBody');
  if (!body) return;

  const q = String(query || '').trim().toLowerCase();
  body.classList.toggle('is-search', !!q);
  body.innerHTML = renderLinePickerRecent() + (q ? renderLinePickerSearch(q) : renderLinePickerBrowse());
}

/* --- Недавние --- */
function renderLinePickerRecent() {
  const recent = getRecentLines();
  if (!recent.length) return '';

  return `
    <div class="line-picker-recent">
      <span class="line-picker-recent-label">Недавние</span>
      ${recent.map(line => `<button type="button" class="line-picker-recent-chip" data-line="${escapeAttr(line)}">${escapeHtml(line)}</button>`).join('')}
    </div>
  `;
}

/* --- Просмотр: список цехов + линии выбранного цеха --- */
function renderLinePickerBrowse() {
  const workshops = getWorkshops();
  if (!workshops.length) {
    return '<div class="line-picker-empty">Цехов нет. Добавьте их в Настройках.</div>';
  }

  // Цех по умолчанию: где последняя использованная линия, иначе первый с линиями
  if (!workshops.some(w => w.id === linePickerState.workshopId)) {
    const last = linePickerCurrent();
    const ctx = last ? getBlockForLine(last) : null;
    const fallback = workshops.find(w => countLinePickerLines(w) > 0) || workshops[0];
    linePickerState.workshopId = (ctx && ctx.workshop && ctx.workshop.id) || fallback.id;
  }

  const lastLine = linePickerCurrent();
  const rail = workshops.map(w => {
    const n = countLinePickerLines(w);
    const on = w.id === linePickerState.workshopId;
    return `
      <button type="button" class="line-picker-ws${on ? ' active' : ''}${n ? '' : ' is-empty'}" data-workshop-id="${escapeAttr(w.id)}">
        <span class="line-picker-ws-name">${escapeHtml(w.name)}</span>
        <span class="line-picker-ws-count">${n}</span>
      </button>`;
  }).join('');

  const w = workshops.find(x => x.id === linePickerState.workshopId);
  const groups = getLinePickerGroups(w);
  const main = groups.length
    ? groups.map(g => renderLinePickerGroup(g.title, g.lines, lastLine)).join('')
    : '<div class="line-picker-empty">В этом цехе пока нет линий. Добавьте их в Настройках → Структура производства.</div>';

  return `
    <div class="line-picker-layout">
      <nav class="line-picker-rail" aria-label="Цеха">${rail}</nav>
      <div class="line-picker-main">
        <div class="line-picker-main-head">${escapeHtml(w.name)}${w.subtitle ? `<span>${escapeHtml(w.subtitle)}</span>` : ''}</div>
        ${main}
      </div>
    </div>
  `;
}

/* --- Группа линий: заголовок участка/блока + плашки линий --- */
function renderLinePickerGroup(title, lines, lastLine) {
  return `
    <section class="line-picker-group">
      <h4 class="line-picker-group-title">${escapeHtml(title)}<span>${lines.length} ${pluralizeLines(lines.length)}</span></h4>
      <div class="line-picker-lines">
        ${lines.map(line => `<button type="button" class="line-picker-line${line === lastLine ? ' is-last' : ''}" data-line="${escapeAttr(line)}"${line === lastLine ? ' title="Последняя выбранная"' : ''}>${escapeHtml(line)}</button>`).join('')}
      </div>
    </section>`;
}

/* --- Поиск: по коду линии, цеху, участку, блоку --- */
function renderLinePickerSearch(q) {
  const found = getAllLinesWithContext().filter(x =>
    [x.line, x.workshopName, x.areaName, x.blockName].some(s => String(s || '').toLowerCase().includes(q)));

  if (!found.length) {
    return `<div class="line-picker-empty">Ничего не найдено по запросу «${escapeHtml(q)}». Введите код линии или название цеха.</div>`;
  }

  // Группируем по «Цех · Участок · Блок»
  const map = new Map();
  found.forEach(x => {
    const title = [x.workshopName, x.areaName, x.blockName].filter(Boolean).join(' · ');
    if (!map.has(title)) map.set(title, []);
    map.get(title).push(x.line);
  });

  const lastLine = linePickerCurrent();
  return '<div class="line-picker-results">' +
    [...map.entries()].map(([title, lines]) => renderLinePickerGroup(title, lines, lastLine)).join('') +
    '</div>';
}

/* --- Обработчики: делегирование на постоянном контейнере --- */
$('#linePickerBody')?.addEventListener('click', (e) => {
  const lineBtn = e.target.closest('[data-line]');
  if (lineBtn) { selectLine(lineBtn.dataset.line); return; }

  const ws = e.target.closest('.line-picker-ws');
  if (ws) {
    linePickerState.workshopId = ws.dataset.workshopId;
    renderLinePickerModal('');
  }
});

/* Enter в поиске — выбрать первую найденную линию */
$('#linePickerSearch')?.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter') return;
  const first = $('#linePickerBody .line-picker-line');
  if (first) { e.preventDefault(); selectLine(first.dataset.line); }
});
