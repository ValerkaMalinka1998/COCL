/* ============================================================
   РОУТЕР — навигация между вкладками с сохранением в URL
   ============================================================ */

/**
 * Переключить активную вкладку.
 * @param {string} tabName — 'check' | 'editor' | 'history' | 'settings'
 * @param {boolean} pushHistory — добавить запись в историю браузера
 */
/* Страницы с несохранёнными данными: новый стандарт и изменённый E-Param.
   Уход через меню, «назад» браузера или ссылку спрашивает подтверждение. */
function pageHasUnsaved(tabId) {
  if (tabId === 'standard-view') {
    return typeof svFullState !== 'undefined' && svFullState.isNew && svFullState.mode === 'edit';
  }
  if (tabId === 'eparam-edit') {
    return typeof epPageState !== 'undefined' && !!epPageState.data && epPageState.dirty === true;
  }
  return false;
}

/* true — можно уходить (данные страницы при этом сбрасываются) */
function confirmLeavePage(nextTab) {
  const cur = document.querySelector('.tab.active');
  const curId = cur ? cur.id.replace('tab-', '') : '';
  if (!curId || curId === nextTab || !pageHasUnsaved(curId)) return true;
  const what = curId === 'standard-view' ? 'Новый стандарт не будет создан.' : 'Изменения не будут сохранены.';
  if (!confirm('Выйти без сохранения? ' + what)) return false;
  if (curId === 'standard-view') {
    svFullState.standardId = null;
    svFullState.isNew = false;
    svFullState.mode = 'view';
    svFullState.originalData = null;
    svFullState.editingData = null;
  } else {
    epPageState.data = null;
    epPageState.isNew = false;
    epPageState.dirty = false;
    epPageState.readOnly = false;
  }
  return true;
}

window.addEventListener('beforeunload', (e) => {
  if (pageHasUnsaved('standard-view') || pageHasUnsaved('eparam-edit')) {
    e.preventDefault();
    e.returnValue = '';
  }
});

function switchTab(tabName, pushHistory = true) {
  if (!tabName) tabName = 'electronic';

  if (!confirmLeavePage(tabName)) {
    // «Назад» браузера уже сменил адрес — возвращаем его на текущую страницу
    const cur = document.querySelector('.tab.active');
    if (!pushHistory && cur) history.pushState({ tab: cur.id.replace('tab-', '') }, '', '#' + cur.id.replace('tab-', ''));
    return;
  }

  // Проверяем, что вкладка существует
  const tabEl = document.getElementById('tab-' + tabName);
  if (!tabEl) tabName = 'electronic';

  // Страницы стандарта и E-Param открываются только из редактора:
  // после перезагрузки их данных нет — возвращаемся к таблице стандартов.
  const isDetailPage = tabName === 'standard-view' || tabName === 'eparam-edit';
  if (isDetailPage) {
    const hasData = tabName === 'standard-view'
      ? (typeof svFullState !== 'undefined' && svFullState.standardId)
      : (typeof epPageState !== 'undefined' && epPageState.data);
    if (!hasData) tabName = 'editor';
  }

  // Окно выбора линии принадлежит вкладке, из которой открыто: при уходе
  // закрываем его и сбрасываем колбэк, иначе оно «прилипает» к другой вкладке.
  if (typeof closeLinePickerModal === 'function' && document.getElementById('linePickerModal')?.classList.contains('active')) {
    closeLinePickerModal();
  }
  if (typeof linePickerOnSelect !== 'undefined') linePickerOnSelect = null;

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
  if (tabName === 'standard-view') {
    // Оставляем как есть — данные уже заполнены при openStandardFullView
  }
  // Специальная логика для вкладок
if (tabName === 'editor') {
  // Восстановить режим (мех или элек)
  const savedMode = localStorage.getItem('cl_editor_mode') || 'mech';
  if (typeof switchEditorModeInline === 'function') {
    switchEditorModeInline(savedMode);
  }

  // Обновить UI (чип, крошки, счётчики)
  if (typeof updateEditorLineContext === 'function') updateEditorLineContext();
  if (typeof updatePartCounters === 'function') updatePartCounters();

  // Обновить таблицы
  if (typeof refreshEditorMechTable === 'function') refreshEditorMechTable();
  if (typeof refreshEditorElecTable === 'function') refreshEditorElecTable();

  // Авто-открытие модалки, если линия не выбрана
  const savedLine = localStorage.getItem('cl_editor_line');
  const allLines = typeof getLines === 'function' ? getLines() : [];
  const hasValidLine = savedLine && allLines.includes(savedLine);

  if (!hasValidLine) {
    if (savedLine) localStorage.removeItem('cl_editor_line');
    // Небольшая задержка, чтобы панель успела отрисоваться
    setTimeout(() => {
      if (typeof openLinePickerModal === 'function') openLinePickerModal();
    }, 150);
  }
}
  if (tabName === 'history' && typeof renderHistory === 'function') {
    renderHistory();
  }

  if (tabName === 'dashboard' && typeof renderDashboard === 'function') {
    renderDashboard();
  }

  if (tabName === 'toploss') {
    if (typeof fillTopLossTab === 'function') fillTopLossTab();
    if (typeof renderTopLossCategories === 'function') renderTopLossCategories();
  }

  if (tabName === 'check') {
    if (typeof openCoclTab === 'function') openCoclTab();
  }

  if (tabName === 'electronic') {
    if (typeof openClCheckTab === 'function') openClCheckTab();
  }
  if (tabName === 'settings' && typeof renderSettings === 'function') {
    renderSettings();
  }
  if (tabName === 'schedule') {
    if (typeof openScheduleTab === 'function') openScheduleTab();
  }
  if (tabName === 'standard-view') {
    // Не перерисовываем — стандарт уже заполнен при открытии
    // Просто показываем вкладку
  }

  // Сохраняем активную вкладку (страницы-детали не запоминаем)
  if (tabName !== 'standard-view' && tabName !== 'eparam-edit') {
    localStorage.setItem('cl_active_tab', tabName);
  }
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
      || 'electronic';
    switchTab(tab, false);
  });

  // Восстановление при первой загрузке
  const hashTab = location.hash.replace('#', '');
  const savedTab = localStorage.getItem('cl_active_tab');
  const initialTab = hashTab || savedTab || 'electronic';
  switchTab(initialTab, false);
   // Помечаем приложение готовым — снимаем anti-flash защиту
  document.documentElement.setAttribute('data-app-ready', '1');

}