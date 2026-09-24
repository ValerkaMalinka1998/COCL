/* ============================================================
   РОУТЕР — навигация между вкладками с сохранением в URL
   ============================================================ */

/**
 * Переключить активную вкладку.
 * @param {string} tabName — 'check' | 'editor' | 'history' | 'settings'
 * @param {boolean} pushHistory — добавить запись в историю браузера
 */
function switchTab(tabName, pushHistory = true) {
  if (!tabName) tabName = 'check';

  // Проверяем, что вкладка существует
  const tabEl = document.getElementById('tab-' + tabName);
  if (!tabEl) tabName = 'check';

  // Переключаем активные классы
  document.querySelectorAll('nav a[data-tab]').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));

  const btn = document.querySelector(`nav a[data-tab="${tabName}"]`);
  if (btn) btn.classList.add('active');
  document.getElementById('tab-' + tabName).classList.add('active');

  // Обновляем URL (hash-роутинг)
  if (pushHistory) {
    history.pushState({ tab: tabName }, '', '#' + tabName);
  }

  // Специальная логика для вкладок
  if (tabName === 'editor') {
    const savedLine = localStorage.getItem('cl_editor_line');
    const savedBlock = localStorage.getItem('cl_editor_block');
    const blocksView = document.getElementById('editorBlocksView');
    const linesView = document.getElementById('editorLinesView');
    const lineView = document.getElementById('editorLineView');

    // Скрываем все экраны
    if (blocksView) blocksView.style.display = 'none';
    if (linesView) linesView.style.display = 'none';
    if (lineView) lineView.style.display = 'none';

    if (savedLine && savedBlock && typeof openEditorLine === 'function') {
      // Открыта конкретная линия
      openEditorLine(savedLine);
    } else if (savedBlock && typeof openEditorBlock === 'function') {
      // Открыт блок (список линий)
      openEditorBlock(savedBlock);
    } else {
      // Список блоков
      if (blocksView) blocksView.style.display = 'block';
      if (typeof renderEditorBlocksView === 'function') renderEditorBlocksView();
    }
  }

  if (tabName === 'history' && typeof renderHistory === 'function') {
    renderHistory();
  }

  if (tabName === 'dashboard' && typeof renderDashboard === 'function') {
    renderDashboard();
  }

  if (tabName === 'settings' && typeof renderSettings === 'function') {
    renderSettings();
  }

  // Сохраняем активную вкладку в localStorage
  localStorage.setItem('cl_active_tab', tabName);
}

/**
 * Инициализация роутера:
 * - обработчики кликов по sidebar
 * - восстановление из URL/localStorage при загрузке
 * - кнопка «Назад» в браузере
 */
function initRouter() {
    // ---- Закрепление sidebar ----
  const SIDEBAR_PIN_KEY = 'cl_sidebar_pinned';
  const sidebar = document.getElementById('sidebar');
  const pinBtn = document.getElementById('sidebarPinBtn');

  if (sidebar && pinBtn) {
    // Восстанавливаем сохранённое состояние
    const isPinned = localStorage.getItem(SIDEBAR_PIN_KEY) === '1';
    if (isPinned) {
      sidebar.classList.add('expanded');
    }
    updatePinBtnTitle(isPinned);

    // Клик по кнопке
    pinBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const nowPinned = !sidebar.classList.contains('expanded');
      sidebar.classList.toggle('expanded', nowPinned);
      localStorage.setItem(SIDEBAR_PIN_KEY, nowPinned ? '1' : '0');
      updatePinBtnTitle(nowPinned);
    });
  }

  function updatePinBtnTitle(pinned) {
    if (!pinBtn) return;
    pinBtn.title = pinned ? 'Свернуть панель' : 'Закрепить панель';
    const label = pinBtn.querySelector('.sidebar-pin-label');
    if (label) {
      label.textContent = pinned ? 'Свернуть панель' : 'Закрепить панель';
    }
  }
  // Клики по sidebar
  document.querySelectorAll('nav a[data-tab]').forEach(link => {
    link.addEventListener('click', (e) => {
      // Отменяем переход по ссылке (hash), переключаем вкладку через роутер
      e.preventDefault();
      const tabName = link.dataset.tab;
      if (tabName) switchTab(tabName);
    });
  });

  // Кнопка «Назад» / «Вперёд» в браузере
  window.addEventListener('popstate', (e) => {
    const tab = (e.state && e.state.tab)
      || location.hash.replace('#', '')
      || localStorage.getItem('cl_active_tab')
      || 'check';
    switchTab(tab, false);
  });

  // Восстановление при первой загрузке
  const hashTab = location.hash.replace('#', '');
  const savedTab = localStorage.getItem('cl_active_tab');
  const initialTab = hashTab || savedTab || 'check';
  switchTab(initialTab, false);
   // Помечаем приложение готовым — снимаем anti-flash защиту
  document.documentElement.setAttribute('data-app-ready', '1');

}