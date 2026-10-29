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

/* Определения типов контроля (формулировки обучения CL DMS) и как вводить значение */
const CONTROL_TYPE_HELP = {
  fixed: {
    def: 'Чётко определённое значение или положение частей оборудования друг относительно друга. Самый надёжный тип.',
    enter: 'Если нет размера, а только совпадение меток — впишите метку словами (например «в одну линию») или оставьте точки пустыми: оператор выберет ОК / Не ОК. Если размер есть — впишите точное число, например 92 (без допуска): оператор введёт значение.',
    placeholder: 'метка или 92'
  },
  variable: {
    def: 'Изменчивый параметр: компенсирует износ запчастей и расходников и изменение свойств материалов.',
    enter: 'Норма ± допуск, например 92 ± 5 (или 92+-5). Точку без размера (совпадение меток) впишите словами — оператор отметит ОК / Не ОК.',
    placeholder: '92 ± 5'
  },
  interval: {
    def: 'Диапазон, в котором должно находиться значение параметра в процессе производства.',
    enter: 'Границы «от до», например 5 до 8 или 5.5 - 8.5, для минуса: -65 до -55. Точку без размера (совпадение меток) впишите словами — оператор отметит ОК / Не ОК.',
    placeholder: '5 до 8'
  }
};

/* Подсказка под выбором типа: определение + как вводить значение */
function controlTypeHintHtml(type) {
  const h = CONTROL_TYPE_HELP[type];
  if (!h) return '<span class="ct-hint-empty">Выберите тип контроля — здесь появится определение и пример ввода.</span>';
  return `<b>${escapeHtml(controlTypeLabel(type))}.</b> ${escapeHtml(h.def)}
    <span class="ct-hint-enter">Как вводить: ${escapeHtml(h.enter)}</span>`;
}

/* Обновляет подсказку и примеры в полях точек при смене типа */
document.addEventListener('change', (e) => {
  const id = e.target && e.target.id;
  if (id !== 'svf_controlType' && id !== 'epf_controlType') return;
  const box = document.getElementById(id === 'svf_controlType' ? 'svf_typeHint' : 'epf_typeHint');
  if (box) box.innerHTML = controlTypeHintHtml(e.target.value);
  const ph = (CONTROL_TYPE_HELP[e.target.value] || {}).placeholder || '0';
  document.querySelectorAll('#svf_brandBlocksContainer .bt-point-input, #epf_brandBlocksContainer .bt-point-input').forEach(inp => { inp.placeholder = ph; });
});

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
   в таблице норм (по умолчанию — бренд дня линии из расписания брендов).
   opts.changeOver = { from, to } — просмотр из «Смены сорта»: в таблице только два
   бренда — «сейчас» (с которого переходим) и «new» (на который переходим). */
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
  body.innerHTML = renderStandardViewContent(st, brand, opts && opts.changeOver);

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
function renderStandardViewContent(st, brand, co) {
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
  } else if (co && co.to) {
    // Смена сорта: только исходный («сейчас») и целевой («new») бренды
    const head = Array.from({ length: maxPts }, (_, i) => `<th>Т${i + 1}</th>`).join('');
    const cellsOf = (b) => Array.from({ length: maxPts }, (_, i) => {
      const p = b.points[i];
      return `<td>${p ? escapeHtml(p.value || '—') : ''}</td>`;
    }).join('');
    const pick = (name) => {
      const b = name ? getEffectiveBrandBlock(blocks, name) : null;
      return b ? { name, block: b, rest: !b.brand } : null;
    };
    const from = pick(co.from), to = pick(co.to);
    const same = from && to && from.block === to.block;
    const rowFor = (r, tags, cls) => `<tr class="${cls}"><th>${escapeHtml(r.name)}${tags}${r.rest ? '<small class="svm-rest">общая норма</small>' : ''}</th>${cellsOf(r.block)}</tr>`;
    const nowTag = '<span class="svm-now">сейчас</span>';
    const newTag = '<span class="svm-new">new</span>';
    let rows = '';
    if (same) rows = rowFor(to, nowTag + newTag, 'is-new');
    else rows = (from ? rowFor(from, nowTag, 'is-hl') : '') + (to ? rowFor(to, newTag, 'is-new') : '');
    if (!to) rows += `<tr><td colspan="${maxPts + 1}" class="svm-empty">Для бренда ${escapeHtml(co.to)} в стандарте нет значений</td></tr>`;
    normHtml = `<div class="svm-norm-wrap"><table class="svm-norm"><thead><tr><th>Бренд</th>${head}</tr></thead><tbody>${rows}</tbody></table></div>`;
  } else {
    const head = Array.from({ length: maxPts }, (_, i) => `<th>Т${i + 1}</th>`).join('');
    const rows = blocks.map(b => {
      const isHl = hl !== null && (b.brand || '') === hl;
      const cells = Array.from({ length: maxPts }, (_, i) => {
        const p = b.points[i];
        return `<td>${p ? escapeHtml(p.value || '—') : ''}</td>`;
      }).join('');
      return `<tr class="${isHl ? 'is-hl' : ''}"><th>${escapeHtml(b.brand || REST_BRANDS_LABEL)}${isHl && brand ? '<span class="svm-now">сейчас</span>' : ''}</th>${cells}</tr>`;
    }).join('');
    normHtml = `<div class="svm-norm-wrap"><table class="svm-norm"><thead><tr><th>Бренд</th>${head}</tr></thead><tbody>${rows}</tbody></table></div>`;
  }

  const card = (title, inner, cls = '') => inner ? `
    <section class="svm-card ${cls}"><h4>${title}</h4>${inner}</section>` : '';

  // --- Фото: слайдер ---
  const photos = Array.isArray(st.photos) ? st.photos : [];
  const photosHtml = photos.length ? photoSliderHtml(st) : '<div class="svm-empty">Фото не добавлены</div>';

  // --- Основная информация: как на странице стандарта (название — в шапке окна) ---
  const field = (label, value) => `<div class="svm-field"><span>${label}</span>${value
    ? `<b>${escapeHtml(value)}</b>` : '<b class="svm-field-empty">Не указано</b>'}</div>`;
  const mainHtml = `<div class="svm-fields">
    ${field('№ OPL', st.oplNumber)}
    ${field('Машина', st.machine)}
    ${lineHasParts(st.line) ? field('Часть линии', st.nodePart) : ''}
    ${field('Узел', st.node)}
    ${field('Инструмент', st.tool)}
    ${field('Время на проверку', formatSvDuration(st.durationSec))}
    ${field('Тип контроля', controlTypeLabel(st.controlType))}
    ${field('Статус', st.active === false ? 'Неактивен' : 'Активен')}
  </div>`;

  // --- Дополнительная информация: CL относится к, триггеры, Top Losses (как на странице) ---
  const APPLY = { ChangeOver: ['Change Over', 'co'], CL_TO: ['CL в ТО', 'to'], CL_Conversion: ['CL в Конвертацию', 'cv'] };
  const applies = (st.appliesTo || []).filter(a => APPLY[a])
    .map(a => `<span class="svm-tag svm-tag-${APPLY[a][1]}">${APPLY[a][0]}</span>`).join('');
  const trig = (st.triggers || []).map(v => `<span class="svm-tag">${escapeHtml(getTriggerLabel(v))}</span>`).join('');
  const losses = (st.topLosses || []).map(id => findLossById(id)).filter(Boolean)
    .map(l => `<span class="svm-tag svm-tag-tl">${escapeHtml(l.name)}</span>`).join('');
  const links = (label, tags) => `<div class="svm-links"><span>${label}</span><div>${tags || '<i class="svm-field-empty">не задано</i>'}</div></div>`;
  const extraHtml = links('CL относится к', applies + (st.forceInChangeOver ? '<span class="svm-tag">всегда в Change Over</span>' : ''))
    + links('Триггеры Change Over', trig)
    + links('Top Losses', losses);

  const upd = st.updatedAt || st.createdAt;
  const metaHtml = `<div class="svm-foot">${st.author ? `Автор: ${escapeHtml(st.author)} · ` : ''}${upd ? 'обновлён ' + formatDateTime(upd) : ''}</div>`;

  // Порядок блоков — как на странице стандарта (buildSvContentBlocksHtml)
  return `
    <div class="svm-grid">
      <div class="svm-main">
        ${card('Основная информация', mainHtml)}
        ${card('Описание', svmText(st.problemDescription))}
        ${card('Контроль правильности' + (blocks.length > 1 ? ` <small>${blocks.length} ${blocks.length < 5 ? 'бренда' : 'брендов'}</small>` : ''), normHtml, 'svm-card-norm')}
        ${card('Описание контроля', svmText(st.controlDescription), 'svm-card-how')}
        <div class="svm-why">
          ${card('Цель (зачем мы это делаем?)', svmText(st.purpose))}
          ${card('Знаю почему (почему создан стандарт?)', svmText(st.whyCreated))}
        </div>
      </div>
      <aside class="svm-side">
        ${card(`Фото${photos.length ? ` <small>${photos.length}</small>` : ''}`, photosHtml, 'svm-card-photos')}
        ${card('Дополнительная информация', extraHtml)}
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

