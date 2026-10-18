/* ============================================================
   ЗАПУСК ПРИЛОЖЕНИЯ
   init(), тема, часы, счётчики меню. Подключается последним.
   Модуль общего пространства имён: функции и переменные видны
   во всех файлах. Порядок подключения — index.html.
   ============================================================ */

/* ============================================================
   ШАПКА: ЧАСЫ, СМЕНА И «КРУГ СМЕНЫ»
   Сверху — смена (с буквой), дата и время; снизу — полоса прогресса
   смены (09:00 → 21:00 / 21:00 → 09:00) и сколько CL проверено
   в текущую смену на линии Чек-листа CL.
   ============================================================ */
const SHIFT_HOURS = 12;

function tickClock() {
  const d = new Date();
  const el = $('#headerDatetime');
  if (el) {
    el.textContent = `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()} ` +
      `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }
  // Полосу смены и счётчик CL достаточно обновлять раз в минуту
  if (d.getSeconds() === 0 || !tickClock.done) {
    tickClock.done = true;
    updateHeaderShift();
  }
}

function updateHeaderShift() {
  const p = getCurrentShiftPeriod();
  const isDay = p.shiftType === 'day';
  const letter = getShiftsForDate(p.date)[p.shiftType];
  const start = new Date(p.date + (isDay ? 'T09:00:00' : 'T21:00:00'));
  const pct = Math.max(0, Math.min(100, (Date.now() - start) / (SHIFT_HOURS * 3600000) * 100));

  const name = $('#headerShift');
  if (name) name.textContent = `${isDay ? 'День' : 'Ночь'} · ${letter}`;
  const fill = $('#headerLapFill');
  if (fill) fill.style.width = pct.toFixed(1) + '%';
  if ($('#headerLapFrom')) $('#headerLapFrom').textContent = isDay ? '09:00' : '21:00';
  if ($('#headerLapTo')) $('#headerLapTo').textContent = isDay ? '21:00' : '09:00';

  // CL текущей смены — по линии Чек-листа CL
  let clText = '';
  let line = '';
  try { line = localStorage.getItem('cl_cl_line') || ''; } catch (e) { /* нет доступа */ }
  if (line && typeof histCoverage === 'function') {
    const day = histCoverage(line, 0).find(x => x.date === p.date);
    const c = day && day.shifts[p.shiftType];
    if (c && c.planned) clText = `${line} · CL ${c.done + c.unchecked}/${c.planned}`;
  }
  const cl = $('#headerLapCl');
  if (cl) cl.textContent = clText;
  const lap = $('#headerLap');
  if (lap) lap.title = `Прошло ${Math.round(pct)}% смены${clText ? ' · проверено ' + clText.split('CL ')[1] : ''}`;
}

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
   ПЕРЕКЛЮЧАТЕЛЬ ТЕМЫ (light / dark)
   Тема ставится ещё в <head> (без мигания). Здесь — кнопка-шлем,
   плавный переход только в момент переключения и синхронизация
   между открытыми вкладками браузера.
   ============================================================ */
const THEME_KEY = 'cl_theme';
let themeSwitchTimer = null;

function applyTheme(theme, animate) {
  const html = document.documentElement;
  const next = theme === 'dark' ? 'dark' : 'light';
  if (animate) {
    html.classList.add('theme-switching');
    clearTimeout(themeSwitchTimer);
    themeSwitchTimer = setTimeout(() => html.classList.remove('theme-switching'), 400);
  }
  html.setAttribute('data-theme', next);
  const btn = $('#themeToggle');
  if (btn) {
    const label = next === 'dark' ? 'Дневная тема' : 'Ночная тема';
    btn.title = label;
    btn.setAttribute('aria-label', label);
    btn.setAttribute('aria-pressed', next === 'dark' ? 'true' : 'false');
  }
}

(function initTheme() {
  applyTheme(document.documentElement.getAttribute('data-theme'), false);
  $('#themeToggle')?.addEventListener('click', () => {
    const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    applyTheme(next, true);
    try { localStorage.setItem(THEME_KEY, next); } catch (e) { /* тема просто не запомнится */ }
  });
  // Сменили тему в другой вкладке — повторяем здесь
  window.addEventListener('storage', (e) => {
    if (e.key === THEME_KEY && e.newValue) applyTheme(e.newValue, true);
  });
})();

init();
