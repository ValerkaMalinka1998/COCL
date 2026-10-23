/* ============================================================
   ГОРЯЧИЕ КЛАВИШИ
   Esc — закрыть верхнее окно; Ctrl+S — сохранить форму (страница
   стандарта / параметра, Расписание CL, окно с кнопкой действия);
   Ctrl+K — быстрый поиск на текущей вкладке.
   Модуль общего пространства имён; подключается перед app.js.
   ============================================================ */

function hkTopModal() {
  for (let i = modalStack.length - 1; i >= 0; i--) {
    if (modalStack[i].classList.contains('active')) return modalStack[i];
  }
  return null;
}

function hkVisible(el) {
  return !!el && !el.disabled && el.offsetParent !== null;
}

/* Ctrl+S: нажать «сохранить» там, где она есть. true — сделано */
function hkSave() {
  const modal = hkTopModal();
  if (modal) {
    const btns = [...modal.querySelectorAll('.modal-footer .btn-primary')].filter(hkVisible);
    if (!btns.length) return false;
    btns[btns.length - 1].click();
    return true;
  }
  const tab = document.querySelector('.tab.active');
  const id = tab ? tab.id : '';
  let btn = null;
  if (id === 'tab-standard-view') btn = $('#svFullSaveBtn');
  else if (id === 'tab-eparam-edit') btn = $('#epPageSaveBtn');
  else if (id === 'tab-schedule') btn = $('#schSaveBtn');
  if (!hkVisible(btn)) return false;
  btn.click();
  return true;
}

/* Ctrl+K: поле поиска открытого окна или текущей вкладки */
function hkFocusSearch() {
  const root = hkTopModal() || document.querySelector('.tab.active');
  if (!root) return false;
  const inputs = [...root.querySelectorAll('input[type="text"], input[type="search"]')]
    .filter(el => hkVisible(el) && (/поиск/i.test(el.placeholder || '') || el.closest('.et-search, .settings-search')));
  const input = inputs[0];
  if (!input) return false;
  input.focus();
  input.select();
  return true;
}

document.addEventListener('keydown', (e) => {
  if (e.defaultPrevented) return;

  if (e.key === 'Escape') {
    const lb = $('#lightboxModal');
    if (lb && lb.classList.contains('active')) return;   // фото закрывает своя обработка
    const modal = hkTopModal();
    if (!modal) return;
    e.preventDefault();
    const x = modal.querySelector('.modal-close');
    if (x) x.click(); else closeModal(modal);
    return;
  }

  if (!(e.ctrlKey || e.metaKey) || e.altKey || e.shiftKey) return;
  const key = e.key.toLowerCase();
  if (key === 's' || key === 'ы') {
    if (hkSave()) e.preventDefault();
  } else if (key === 'k' || key === 'л') {
    if (hkFocusSearch()) e.preventDefault();
  }
});
