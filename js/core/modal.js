/* ============================================================
   ЯДРО: стек модальных окон
   openModal / closeModal.
   Модуль общего пространства имён: функции и переменные видны
   во всех файлах. Порядок подключения — index.html.
   ============================================================ */

/* ============================================================
   СТЕК МОДАЛЬНЫХ ОКОН
   ============================================================ */

const modalStack = [];

function openModal(modalOrId) {
  const modal = typeof modalOrId === 'string'
    ? (modalOrId.startsWith('#') ? document.querySelector(modalOrId) : document.getElementById(modalOrId))
    : modalOrId;

  if (!modal) {
    console.warn('openModal: элемент не найден', modalOrId);
    return;
  }

  // Если уже открыта — просто активируем
  if (modalStack.includes(modal)) {
    modal.classList.add('active');
    modal.classList.remove('modal-suspended');
    return;
  }

  // Приостанавливаем ВСЕ активные модалки, кроме открываемой.
  // Это устойчиво к любой вложенности, даже если где-то
  // модалка была открыта вручную через classList.add('active').
  document.querySelectorAll('.modal-overlay.active').forEach(m => {
    if (m !== modal) m.classList.add('modal-suspended');
  });

  // Считаем z-index поверх стека
  const baseZ = parseInt(
    getComputedStyle(document.documentElement)
      .getPropertyValue('--modal-z-base')
      .trim() || '2000',
    10
  );
  const z = baseZ + modalStack.length * 10;

  modal.style.zIndex = z;
  modal.classList.add('active');
  modal.classList.remove('modal-suspended');

  modalStack.push(modal);
}

/**
 * Закрыть модалку: убрать из стека + пересчитать z-index оставшихся.
 * @param {HTMLElement|string} modalOrId
 */
function closeModal(modalOrId) {
  const modal = typeof modalOrId === 'string'
    ? (modalOrId.startsWith('#') ? document.querySelector(modalOrId) : document.getElementById(modalOrId))
    : modalOrId;

  if (!modal) return;

  // Скрываем закрываемую
  modal.classList.remove('active');
  modal.classList.remove('modal-suspended');
  modal.style.zIndex = '';

  // Убираем из стека
  const idx = modalStack.indexOf(modal);
  if (idx !== -1) {
    modalStack.splice(idx, 1);
  }

  // --- Снимаем suspend со всех модалок, которые должны быть видны ---
  // Логика: если модалка в стеке — она должна быть видима.
  // Если модалка не в стеке — она не должна быть видима вообще.
  document.querySelectorAll('.modal-overlay.modal-suspended').forEach(m => {
    if (modalStack.includes(m)) {
      m.classList.remove('modal-suspended');
      m.classList.add('active');
    } else {
      m.classList.remove('modal-suspended');
      m.classList.remove('active');
    }
  });

  // Пересчитываем z-index оставшихся в стеке
  const baseZ = parseInt(
    getComputedStyle(document.documentElement)
      .getPropertyValue('--modal-z-base')
      .trim() || '2000',
    10
  );
  modalStack.forEach((m, i) => {
    m.style.zIndex = baseZ + i * 10;
  });
}
/**
 * Утилита: навесить на модалку закрытие по клику вне её.
 * Требует, чтобы у модалки был собственный id, и весь контент —
 * внутри вложенного .modal.
 */
function bindModalBackdropClose(modalId) {
  const modal = typeof modalId === 'string'
    ? (modalId.startsWith('#') ? document.querySelector(modalId) : document.getElementById(modalId))
    : modalId;
  if (!modal) return;

  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal(modal);
  });
}

/* Склонение: 1 стандарт / 2 стандарта / 5 стандартов */
function pluralizeStandards(n) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return 'стандарт';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return 'стандарта';
  return 'стандартов';
}

/* Кнопка «← Назад к блокам» */
$('#editorBlocksBackBtn')?.addEventListener('click', () => {
  $('#editorLinesView').style.display = 'none';
  $('#editorBlocksView').style.display = 'block';
  $('#editorLineView').style.display = 'none';
  localStorage.removeItem('cl_editor_block');
  localStorage.removeItem('cl_editor_line');
  renderEditorBlocksView();
});
