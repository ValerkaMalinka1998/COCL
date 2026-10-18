/* ============================================================
   КОМПОНЕНТЫ: окно просмотра стандарта
   #standardViewModal и лайтбокс фото.
   Модуль общего пространства имён: функции и переменные видны
   во всех файлах. Порядок подключения — index.html.
   ============================================================ */

/* ============================================================
   ПРОСМОТР СТАНДАРТА — полноценная модалка
   ============================================================ */

/* Текст типа контроля для отображения */
function controlTypeLabel(type) {
  switch (type) {
    case 'ok_not_ok':    return 'Фиксированный (ОК/Не ОК)';
    case 'value_input':  return 'Вариабельный (значение ± допуск)';
    case 'range_input':  return 'Контролируемый интервал';
    case 'tolerance':    return 'В допуске / Не в допуске';
    case 'fixed':        return 'Фиксированный';
    case 'variable':     return 'Вариабельный';
    case 'interval':     return 'Контролируемый интервал';
    default:             return '—';
  }
}

/* Формат даты для отображения */
function formatDateTime(iso) {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '—';
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, '0');
    const mi = String(d.getMinutes()).padStart(2, '0');
    return `${dd}.${mm}.${yyyy} ${hh}:${mi}`;
  } catch {
    return '—';
  }
}

window.openStandardView = function(stdId) {
  const st = getStandards().find(s => s.id === stdId);
  if (!st) return showToast('Стандарт не найден', true);

  const modal = $('#standardViewModal');
  const body = $('#standardViewBody');
  const title = $('#standardViewTitle');
  const chipsEl = $('#standardViewChips');
  if (!modal || !body) return;

  // Заголовок модалки
  if (title) title.textContent = 'Просмотр стандарта · ' + (st.oplNumber || '—');

  // Чипы в шапке
  if (chipsEl) {
    chipsEl.innerHTML = renderStandardViewHeaderChips(st);
  }

  // Тело модалки (без чипов)
  body.innerHTML = renderStandardViewContent(st);

  // Навешиваем обработчики на превью фото (открытие лайтбокса)
  body.querySelectorAll('[data-photo-idx]').forEach(el => {
    el.addEventListener('click', () => {
      const idx = parseInt(el.dataset.photoIdx, 10);
      openLightbox(st, idx);
    });
  });

  openModal(modal);
};

/* Отрисовать чипы для шапки модалки просмотра стандарта */
function renderStandardViewHeaderChips(st) {
  const ctx = getBlockForLine(st.line);

  const chips = [];
  if (ctx) {
    chips.push(`<span class="sv-chip sv-chip-cyan">${escapeHtml(ctx.workshop.name)}</span>`);
    const areaLabel = ctx.area.name + (ctx.block ? ` · ${ctx.block.name}` : '');
    chips.push(`<span class="sv-chip sv-chip-cyan">${escapeHtml(areaLabel)}</span>`);
  }
  if (st.line) chips.push(`<span class="sv-chip sv-chip-cyan">${escapeHtml(st.line)}</span>`);
  if (st.nodePart) chips.push(`<span class="et-part-chip et-part-${escapeAttr(st.nodePart.toLowerCase())}">${escapeHtml(st.nodePart)}</span>`);
  if (st.machine) chips.push(`<span class="sv-chip sv-chip-amber">${escapeHtml(st.machine)}</span>`);

  return chips.join('');
}

/* Сформировать HTML содержимого модалки */
function renderStandardViewContent(st) {
  const ctx = getBlockForLine(st.line);

  // ----- Левая колонка: те же блоки, что на полной странице стандарта -----
  const mainHtml = `
    <div class="sv-title">${escapeHtml(st.title || '—')}</div>
    <div class="sv-full-content-blocks">${buildSvContentBlocksHtml(st, false)}</div>
  `;

  // ----- Правая колонка: фото + связанные объекты -----
  const photos = Array.isArray(st.photos) ? st.photos : [];

  const photosCardHtml = photos.length ? `
    <div class="sv-side-card">
      <div class="sv-side-card-title">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
          <circle cx="8.5" cy="8.5" r="1.5"/>
          <polyline points="21 15 16 10 5 21"/>
        </svg>
        Фотографии
      </div>
      <div class="sv-photos-mini">
        ${photos.map((name, idx) => {
          const path = getPhotoPath(st, name);
          return `
            <div class="sv-photo-mini" data-photo-idx="${idx}" title="${escapeAttr(name)}">
              <img src="${escapeAttr(path)}" alt="${escapeAttr(name)}"
                   onerror="this.style.display='none';this.nextElementSibling.style.display='flex';">
              <div class="photo-missing" style="display:none">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  ` : '';

  const sideRow = (label, value) => {
    const isEmpty = !value || !String(value).trim();
    return `
      <div class="sv-side-row">
        <span class="sv-side-label">${escapeHtml(label)}</span>
        <span class="sv-side-value ${isEmpty ? 'sv-empty' : ''}">${isEmpty ? '—' : escapeHtml(value)}</span>
      </div>
    `;
  };

  const sideHtml = `
    ${photosCardHtml}
    <div class="sv-side-card">
      <div class="sv-side-card-title">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
        </svg>
        Связанные объекты
      </div>
      ${sideRow('Цех', ctx ? ctx.workshop.name : '')}
      ${sideRow('Участок', ctx ? ctx.area.name + (ctx.block ? ` (${ctx.block.name})` : '') : '')}
      ${sideRow('Линия', st.line)}
      ${sideRow('Рабочий центр', st.nodePart)}
      ${sideRow('Машина', st.machine)}
      ${sideRow('Узел', st.node)}
      ${sideRow('OPL №', st.oplNumber)}
    </div>
    <div class="sv-side-card">
      <div class="sv-side-card-title">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <polyline points="12 6 12 12 16 14"/>
        </svg>
        История
      </div>
      ${sideRow('Автор', st.author || '')}
      ${sideRow('Дата создания', formatDateTime(st.createdAt))}
      ${sideRow('Последнее обновление', formatDateTime(st.updatedAt))}
    </div>
  `;

  return `
    <div class="sv-layout">
      <div class="sv-main">${mainHtml}</div>
      <div class="sv-side">${sideHtml}</div>
    </div>
  `;
}

/* Закрыть модалку просмотра */
function closeStandardView() {
  closeModal('#standardViewModal');
}

/* --- Обработчики модалки просмотра --- */
$('#standardViewClose')?.addEventListener('click', closeStandardView);
$('#standardViewCloseBtn')?.addEventListener('click', closeStandardView);
$('#standardViewModal')?.addEventListener('click', (e) => {
  if (e.target.id === 'standardViewModal') closeStandardView();
});

/* ============================================================
   ЛАЙТБОКС — просмотр фото
   ============================================================ */

let lightboxState = {
  photos: [],   // массив имён
  standard: null,
  index: 0
};

window.openLightbox = function(standard, startIndex) {
  const photos = Array.isArray(standard.photos) ? standard.photos : [];
  if (!photos.length) return;

  lightboxState.standard = standard;
  lightboxState.photos = photos;
  lightboxState.index = Math.max(0, Math.min(startIndex || 0, photos.length - 1));

  const modal = $('#lightboxModal');
  if (!modal) return;

  updateLightbox();
  openModal(modal);
  modal.style.zIndex = '9999';   // поверх любых модалок
  document.addEventListener('keydown', lightboxKeyHandler);
};

function updateLightbox() {
  const { photos, standard, index } = lightboxState;
  const img = $('#lightboxImage');
  const nameEl = $('#lightboxName');
  const counterEl = $('#lightboxCounter');
  const prevBtn = $('#lightboxPrev');
  const nextBtn = $('#lightboxNext');

  if (!img || !photos.length) return;

  const fileName = photos[index];
  const path = getPhotoPath(standard, fileName);

  img.src = path;
  img.alt = fileName;
  if (nameEl) nameEl.textContent = fileName;
  if (counterEl) counterEl.textContent = `${index + 1} / ${photos.length}`;

  // Кнопки навигации
  const single = photos.length <= 1;
  if (prevBtn) prevBtn.disabled = single;
  if (nextBtn) nextBtn.disabled = single;
}

function lightboxPrev() {
  const { photos, index } = lightboxState;
  if (photos.length <= 1) return;
  lightboxState.index = (index - 1 + photos.length) % photos.length;
  updateLightbox();
}

function lightboxNext() {
  const { photos, index } = lightboxState;
  if (photos.length <= 1) return;
  lightboxState.index = (index + 1) % photos.length;
  updateLightbox();
}

function closeLightbox() {
  closeModal('#lightboxModal');
  document.removeEventListener('keydown', lightboxKeyHandler);
  const img = $('#lightboxImage');
  if (img) img.src = '';
}

function lightboxKeyHandler(e) {
  if (e.key === 'Escape')      { e.preventDefault(); closeLightbox(); }
  else if (e.key === 'ArrowLeft')  { e.preventDefault(); lightboxPrev(); }
  else if (e.key === 'ArrowRight') { e.preventDefault(); lightboxNext(); }
}

/* --- Обработчики лайтбокса --- */
$('#lightboxClose')?.addEventListener('click', closeLightbox);
$('#lightboxPrev')?.addEventListener('click', lightboxPrev);
$('#lightboxNext')?.addEventListener('click', lightboxNext);
$('#lightboxModal')?.addEventListener('click', (e) => {
  // Закрываем только если клик по фону (не по контенту и не по кнопкам)
  if (e.target.id === 'lightboxModal') closeLightbox();
});

function closeCommentModal() {
  closeModal('#commentModal');
  currentCommentItem = null;
}

$('#commentModalClose').addEventListener('click', closeCommentModal);
$('#commentCancelBtn').addEventListener('click', closeCommentModal);
$('#commentModal').addEventListener('click', (e) => {
  if (e.target.id === 'commentModal') closeCommentModal();
});

$('#commentSaveBtn').addEventListener('click', () => {
  if (!currentCommentItem) return;
  const text = $('#commentText').value.trim();
  currentCommentItem.dataset.comment = text;
  const preview = currentCommentItem.querySelector('[data-comment-preview]');
  const btn = currentCommentItem.querySelector('[data-comment-btn]');

  if (text) {
    preview.innerHTML = cmtLine(text);
    preview.style.display = 'block';
    btn.classList.add('has-comment');
  } else {
    preview.style.display = 'none';
    btn.classList.remove('has-comment');
  }
  updateCommentUrgency(currentCommentItem);
  closeCommentModal();
});
