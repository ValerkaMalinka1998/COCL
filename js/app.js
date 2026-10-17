/* ============================================================
   ЗАПУСК ПРИЛОЖЕНИЯ
   init(), тема, часы, счётчики меню. Подключается последним.
   Модуль общего пространства имён: функции и переменные видны
   во всех файлах. Порядок подключения — index.html.
   ============================================================ */

/* ============================================================
   ЧАСЫ
   ============================================================ */
function tickClock() { $('#headerDatetime').textContent = nowStr(); }
setInterval(tickClock, 1000);
tickClock();
/* ============================================================
   СЧЁТЧИКИ В SIDEBAR
   ============================================================ */

/* Обновить счётчик записей за сегодня в пункте «История» */
function updateNavHistoryCounter() {
  const el = $('#navHistoryCounter');
  if (!el) return;

  const history = getHistory();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const todayCount = history.filter(h => {
    const ts = new Date(h.timestamp);
    return ts >= todayStart;
  }).length;

  if (todayCount > 0) {
    el.textContent = todayCount;
    el.style.display = '';
  } else {
    el.style.display = 'none';
  }
}

/* Обновить бейдж проблем в пункте «Настройки» */
function updateNavSettingsBadge() {
  const el = $('#navSettingsBadge');
  if (!el) return;

  const brokenCount = parseInt(localStorage.getItem('cl_photos_broken_count') || '0', 10);

  if (brokenCount > 0) {
    el.textContent = '!';
    el.title = `Есть битые ссылки на фото (${brokenCount}). Зайдите в Настройки → Проверить фото.`;
    el.style.display = '';
  } else {
    el.style.display = 'none';
  }
}

/* Обновить оба счётчика */
function updateNavCounters() {
  updateNavHistoryCounter();
  updateNavSettingsBadge();
}

/* ============================================================
   ИНИЦИАЛИЗАЦИЯ
   ============================================================ */
function init() {
  // Разовые миграции структуры (на случай, если getWorkshops ещё не вызывался)
  migrateToWorkshopsStructure();
  migrateBrandWorkshopsFromLines();
  migrateTopLossesByWorkshop();
  migrateTriggersByWorkshop();
  fillLinesForOperator();
  renderCoclPartStep('');     // начальное состояние шага «Часть»
  renderCoclLineContext('');  // начальное состояние контекста линии
  fillHistoryFilters();
  renderSettings();
  fillTopLossTab();
  /*fillElectronicTab();*/
  initRouter();
  updateNavCounters();

  // ============ Восстановление активной линии редактора ============
  // Читаем сохранённую линию из localStorage и синхронизируем переменную в памяти
  const savedEditorLine = localStorage.getItem('cl_editor_line');
  const allLines = typeof getLines === 'function' ? getLines() : [];
  if (savedEditorLine && allLines.includes(savedEditorLine)) {
    currentEditorLine = savedEditorLine;
  } else if (savedEditorLine) {
    // Линия удалена из структуры — чистим
    localStorage.removeItem('cl_editor_line');
    currentEditorLine = null;
  }

  // Авто-открытие модалки выбора линии, если линия не выбрана и активна вкладка «Редактор»
  setTimeout(() => {
    const activeTab = localStorage.getItem('cl_active_tab');
    if (activeTab !== 'editor') return;

    if (!currentEditorLine) {
      if (typeof openLinePickerModal === 'function') openLinePickerModal();
    } else {
      if (typeof updateEditorLineContext === 'function') updateEditorLineContext();
      if (typeof updatePartCounters === 'function') updatePartCounters();
    }
  }, 300);
}
/* ============================================================
   Переключатель темы (light / dark)
   ============================================================ */
(function initTheme() {
  const STORAGE_KEY = 'cl_theme';
  const html = document.documentElement;
  const saved = localStorage.getItem(STORAGE_KEY);

  // Восстанавливаем сохранённую тему
  if (saved === 'dark' || saved === 'light') {
    html.setAttribute('data-theme', saved);
  } else {
    // По умолчанию — светлая
    html.setAttribute('data-theme', 'light');
  }

  // Обработчик кнопки
  const btn = document.getElementById('themeToggle');
  if (btn) {
    btn.addEventListener('click', () => {
      const current = html.getAttribute('data-theme') || 'light';
      const next = current === 'dark' ? 'light' : 'dark';
      html.setAttribute('data-theme', next);
      localStorage.setItem(STORAGE_KEY, next);
    });
  }
})();

init();
