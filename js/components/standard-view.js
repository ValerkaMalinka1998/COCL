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

/* Открыть просмотр стандарта. opts.brand — бренд, строку которого выделить
   в таблице норм (по умолчанию — бренд дня линии из расписания брендов). */
window.openStandardView = function(stdId, opts) {
  const st = getStandards().find(s => s.id === stdId);
  if (!st) return showToast('Стандарт не найден', true);

  const modal = $('#standardViewModal');
  const body = $('#standardViewBody');
  if (!modal || !body) return;

  let brand = (opts && opts.brand) || '';
  if (!brand && typeof getElectronicBrandForDate === 'function') {
    brand = getElectronicBrandForDate(st.line, getCurrentShiftPeriod().date) || '';
  }

  $('#standardViewTitle').textContent = st.title || '—';
  $('#standardViewChips').innerHTML = renderStandardViewHeaderChips(st);
  body.innerHTML = renderStandardViewContent(st, brand);

  bindPhotoSlider(body, st);

  openModal(modal);
  body.scrollTop = 0;
};

/* Шапка: OPL · машина · узел · часть и тип контроля */
function renderStandardViewHeaderChips(st) {
  const bits = [
    st.oplNumber ? `<b>${escapeHtml(st.oplNumber)}</b>` : '',
    st.machine ? escapeHtml(st.machine) : '',
    st.node ? escapeHtml(st.node) : '',
    st.nodePart ? escapeHtml(st.nodePart) : ''
  ].filter(Boolean);
  return bits.join('<i>·</i>') +
    `<span class="svm-type">${escapeHtml(controlTypeLabel(st.controlType))}</span>`;
}

/* Текст с переносами строк → абзацы */
function svmText(text) {
  const s = String(text || '').trim();
  if (!s) return '';
  return s.split(/\n+/).map(line => `<p>${escapeHtml(line)}</p>`).join('');
}

/* Содержимое окна просмотра */
function renderStandardViewContent(st, brand) {
  const ctx = getBlockForLine(st.line);
  const blocks = (Array.isArray(st.measurements) ? st.measurements : [])
    .filter(b => b && Array.isArray(b.points) && b.points.length);
  const maxPts = blocks.reduce((m, b) => Math.max(m, b.points.length), 0);

  // Какой блок выделить: бренд из контекста, иначе «Все бренды»
  const hl = blocks.find(b => b.brand === brand) ? brand
    : (blocks.find(b => !b.brand) ? '' : null);

  // --- Норма ---
  let normHtml;
  if (!blocks.length) {
    normHtml = `<div class="svm-visual">${CIL_ICONS.check}<span>Без замеров — проверка <b>ОК / Не ОК</b> по описанию контроля</span></div>`;
  } else {
    const head = Array.from({ length: maxPts }, (_, i) => `<th>Т${i + 1}</th>`).join('');
    const rows = blocks.map(b => {
      const isHl = hl !== null && (b.brand || '') === hl;
      const cells = Array.from({ length: maxPts }, (_, i) => {
        const p = b.points[i];
        return `<td>${p ? escapeHtml(p.value || '—') : ''}</td>`;
      }).join('');
      return `<tr class="${isHl ? 'is-hl' : ''}"><th>${escapeHtml(b.brand || 'Все бренды')}${isHl && brand ? '<span class="svm-now">сейчас</span>' : ''}</th>${cells}</tr>`;
    }).join('');
    normHtml = `<div class="svm-norm-wrap"><table class="svm-norm"><thead><tr><th>Бренд</th>${head}</tr></thead><tbody>${rows}</tbody></table></div>`;
  }

  const card = (title, inner, cls = '') => inner ? `
    <section class="svm-card ${cls}"><h4>${title}</h4>${inner}</section>` : '';

  // --- Фото: слайдер ---
  const photos = Array.isArray(st.photos) ? st.photos : [];
  const photosHtml = photos.length ? photoSliderHtml(st) : '<div class="svm-empty">Фото не добавлены</div>';

  // --- Где и связи ---
  const row = (label, value) => value ? `<div class="svm-row"><span>${label}</span><b>${escapeHtml(value)}</b></div>` : '';
  const whereHtml = [
    row('Цех', ctx && ctx.workshop.name),
    row('Участок', ctx && (ctx.area.name + (ctx.block ? ' · ' + ctx.block.name : ''))),
    row('Линия', st.line),
    row('Часть', st.nodePart),
    row('Машина', st.machine),
    row('Узел', st.node),
    row('OPL №', st.oplNumber)
  ].join('');

  const APPLY = { ChangeOver: ['Change Over', 'co'], CL_TO: ['CL в ТО', 'to'], CL_Conversion: ['CL в Конвертацию', 'cv'] };
  const applies = (st.appliesTo || []).filter(a => APPLY[a])
    .map(a => `<span class="svm-tag svm-tag-${APPLY[a][1]}">${APPLY[a][0]}</span>`).join('');
  const trig = (st.triggers || []).map(v => `<span class="svm-tag">${escapeHtml(getTriggerLabel(v))}</span>`).join('');
  const losses = (st.topLosses || []).map(id => findLossById(id)).filter(Boolean)
    .map(l => `<span class="svm-tag svm-tag-tl">${escapeHtml(l.name)}</span>`).join('');
  const linksHtml = [
    applies ? `<div class="svm-links"><span>Применять к</span><div>${applies}${st.forceInChangeOver ? '<span class="svm-tag">всегда в Change Over</span>' : ''}</div></div>` : '',
    trig ? `<div class="svm-links"><span>Триггеры</span><div>${trig}</div></div>` : '',
    losses ? `<div class="svm-links"><span>Top Losses</span><div>${losses}</div></div>` : ''
  ].join('');

  const upd = st.updatedAt || st.createdAt;
  const metaHtml = `<div class="svm-foot">${st.author ? `Автор: ${escapeHtml(st.author)} · ` : ''}${upd ? 'обновлён ' + formatDateTime(upd) : ''}</div>`;

  return `
    <div class="svm-grid">
      <div class="svm-main">
        ${card('Норма' + (blocks.length > 1 ? ` <small>${blocks.length} ${blocks.length < 5 ? 'бренда' : 'брендов'}</small>` : ''), normHtml, 'svm-card-norm')}
        ${card('Как проверять', svmText(st.controlDescription), 'svm-card-how')}
        <div class="svm-why">
          ${card('Описание проблемы', svmText(st.problemDescription))}
          ${card('Цель', svmText(st.purpose))}
          ${card('Знаю почему', svmText(st.whyCreated))}
        </div>
      </div>
      <aside class="svm-side">
        ${card(`Фото${photos.length ? ` <small>${photos.length}</small>` : ''}`, photosHtml, 'svm-card-photos')}
        ${card('Где', whereHtml)}
        ${card('Связи', linksHtml)}
        ${metaHtml}
      </aside>
    </div>`;
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
