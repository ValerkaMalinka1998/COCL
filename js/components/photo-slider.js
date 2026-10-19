/* ============================================================
   КОМПОНЕНТЫ: слайдер фото стандарта
   Окно просмотра стандарта и страница стандарта (просмотр и правка).
   Модуль общего пространства имён: функции и переменные видны
   во всех файлах. Порядок подключения — index.html.
   ============================================================ */

const PSL_ARROW = {
  prev: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>',
  next: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>',
  del: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>'
};

/* Разметка слайдера. opts.editable — кнопка удаления; opts.index — стартовый кадр */
function photoSliderHtml(st, opts = {}) {
  const photos = Array.isArray(st.photos) ? st.photos : [];
  if (!photos.length) return '';
  const n = photos.length;
  const idx = Math.min(Math.max(opts.index || 0, 0), n - 1);

  const img = (name, i, cls) => `
    <button type="button" class="${cls}" data-psl-go="${i}" title="${escapeAttr(name)}">
      <img src="${escapeAttr(getPhotoPath(st, name))}" alt="${escapeAttr(name)}" loading="lazy"
           onerror="this.style.display='none';this.nextElementSibling.style.display='flex';">
      <span class="psl-miss" style="display:none">нет файла<small>${escapeHtml(name)}</small></span>
    </button>`;

  return `
    <div class="psl" data-psl data-idx="${idx}" data-count="${n}">
      <div class="psl-stage">
        <div class="psl-track" style="transform:translateX(-${idx * 100}%)">
          ${photos.map((name, i) => img(name, i, 'psl-slide')).join('')}
        </div>
        ${n > 1 ? `
          <button type="button" class="psl-nav psl-prev" data-psl-step="-1" title="Предыдущее">${PSL_ARROW.prev}</button>
          <button type="button" class="psl-nav psl-next" data-psl-step="1" title="Следующее">${PSL_ARROW.next}</button>
          <span class="psl-count"><b>${idx + 1}</b> / ${n}</span>` : ''}
        ${opts.editable ? `<button type="button" class="psl-del" data-psl-del title="Удалить это фото">${PSL_ARROW.del}</button>` : ''}
        <span class="psl-name">${escapeHtml(photos[idx])}</span>
      </div>
      ${n > 1 ? `<div class="psl-thumbs">${photos.map((name, i) => img(name, i, 'psl-thumb' + (i === idx ? ' active' : ''))).join('')}</div>` : ''}
    </div>`;
}

/* Показать кадр i */
function photoSliderGo(root, i) {
  const n = parseInt(root.dataset.count, 10) || 1;
  const idx = (i + n) % n;
  root.dataset.idx = idx;
  root.querySelector('.psl-track').style.transform = `translateX(-${idx * 100}%)`;
  const cnt = root.querySelector('.psl-count b');
  if (cnt) cnt.textContent = idx + 1;
  root.querySelectorAll('.psl-thumb').forEach((t, k) => t.classList.toggle('active', k === idx));
  root.querySelector('.psl-thumb.active')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  const name = root.querySelector('.psl-name');
  const slide = root.querySelectorAll('.psl-slide')[idx];
  if (name && slide) name.textContent = slide.title;
}

/* Обработчики слайдера внутри box. opts.onRemove(idx) — удалить кадр (правка) */
function bindPhotoSlider(box, st, opts = {}) {
  const root = box && box.querySelector('[data-psl]');
  if (!root) return;

  root.addEventListener('click', (e) => {
    const step = e.target.closest('[data-psl-step]');
    if (step) { photoSliderGo(root, +root.dataset.idx + +step.dataset.pslStep); return; }

    if (e.target.closest('[data-psl-del]')) {
      if (opts.onRemove) opts.onRemove(+root.dataset.idx);
      return;
    }

    const thumb = e.target.closest('.psl-thumb');
    if (thumb) { photoSliderGo(root, +thumb.dataset.pslGo); return; }

    const slide = e.target.closest('.psl-slide');
    if (slide && !root.dataset.dragged && typeof openLightbox === 'function') {
      openLightbox(st, +slide.dataset.pslGo);
    }
  });

  // Стрелки клавиатуры, когда слайдер в фокусе
  root.tabIndex = 0;
  root.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); photoSliderGo(root, +root.dataset.idx - 1); }
    if (e.key === 'ArrowRight') { e.preventDefault(); photoSliderGo(root, +root.dataset.idx + 1); }
  });

  // Свайп (планшет)
  const stage = root.querySelector('.psl-stage');
  let x0 = null;
  stage.addEventListener('pointerdown', (e) => { x0 = e.clientX; delete root.dataset.dragged; });
  stage.addEventListener('pointerup', (e) => {
    if (x0 === null) return;
    const dx = e.clientX - x0;
    x0 = null;
    if (Math.abs(dx) > 40 && +root.dataset.count > 1) {
      root.dataset.dragged = '1';
      photoSliderGo(root, +root.dataset.idx + (dx < 0 ? 1 : -1));
      setTimeout(() => delete root.dataset.dragged, 0);
    }
  });
}
