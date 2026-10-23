/* ============================================================ */
/* === ПАГИНАЦИЯ (общий компонент) ============================ */
/* ============================================================ */
/*
   renderPager(el, state, total, onChange) — рисует полосу
   «Показано A–B из N» + страницы + размер страницы.
   state = { page, size } — меняется на месте, onChange() — перерисовка.
*/

const PAGER_SIZES = [20, 50, 100, 200];

/* Границы текущей страницы: { from, to, pages } */
function pagerRange(state, total) {
  const size = state.size || PAGER_SIZES[0];
  const pages = Math.max(1, Math.ceil(total / size));
  if (!state.page || state.page > pages) state.page = 1;
  const from = (state.page - 1) * size;
  return { from, to: Math.min(total, from + size), pages };
}

function renderPager(el, state, total, onChange) {
  if (!el) return;
  const { from, to, pages } = pagerRange(state, total);
  if (total <= PAGER_SIZES[0] && pages <= 1) { el.innerHTML = ''; return; }

  const cur = state.page;
  const nums = [];
  for (let i = 1; i <= pages; i++) {
    if (i === 1 || i === pages || Math.abs(i - cur) <= 2) nums.push(i);
    else if (nums[nums.length - 1] !== '...') nums.push('...');
  }
  el.innerHTML = `
    <span class="pagination-info">Показано ${total ? from + 1 : 0}–${to} из ${total}</span>
    <div class="pagination-controls">
      ${pages > 1 ? `<button type="button" class="pagination-btn" ${cur === 1 ? 'disabled' : ''} data-pager="${cur - 1}">←</button>
      ${nums.map(p => p === '...'
        ? '<span class="pagination-dots">…</span>'
        : `<button type="button" class="pagination-btn ${p === cur ? 'active' : ''}" data-pager="${p}">${p}</button>`).join('')}
      <button type="button" class="pagination-btn" ${cur === pages ? 'disabled' : ''} data-pager="${cur + 1}">→</button>` : ''}
      <select class="pagination-size" data-pager-size>
        ${PAGER_SIZES.map(s => `<option value="${s}" ${state.size === s ? 'selected' : ''}>${s}</option>`).join('')}
      </select>
    </div>`;

  el.querySelectorAll('[data-pager]').forEach(b => b.addEventListener('click', () => {
    const p = parseInt(b.dataset.pager, 10);
    if (!isNaN(p) && p >= 1 && p <= pages) { state.page = p; onChange(); }
  }));
  el.querySelector('[data-pager-size]')?.addEventListener('change', (e) => {
    state.size = parseInt(e.target.value, 10) || PAGER_SIZES[0];
    state.page = 1;
    onChange();
  });
}
