/* ============================================================
   ВКЛАДКА CL: расписание брендов
   Окно «Расписание брендов».
   Модуль общего пространства имён: функции и переменные видны
   во всех файлах. Порядок подключения — index.html.
   ============================================================ */

/* ============================================================
   CL ELECTRONIC — расписание брендов
   ============================================================
   Структура в localStorage:
   {
     SD01: [
       { date: '2026-09-28', brand: 'A' },
       { date: '2026-09-29', brand: 'A' },
       { date: '2026-09-30', brand: 'B' },
       ...
     ],
     SD03: [ ... ]
   }
   ============================================================ */

function getElectronicBrandSchedule() {
  return load(STORAGE_KEYS.electronicBrandSchedule, {});
}
function setElectronicBrandSchedule(v) {
  save(STORAGE_KEYS.electronicBrandSchedule, v);
}
/* ============================================================
   CL ELECTRONIC — модалка «Расписание брендов»
   ============================================================ */

/* Текущее состояние модалки (для кнопки «Сохранить») */
let ebsState = {
  line: null,
  mode: 'period',      // 'period' | 'daily'
  dailyEntries: [],    // [{ date, brand }] — рабочая копия строк в режиме «По дням»
  periodEntries: []    // накопленные периоды (только для отображения)
};

/* Открыть модалку */
window.openElectronicBrandSchedule = function(line) {
  const modal = $('#electronicBrandScheduleModal');
  if (!modal) return;

  const brands = getBrandsForLine(line);
  if (!brands.length) {
    return showToast('На линии нет брендов. Добавьте их в Настройках → «Бренды для каждой линии».', true);
  }

  ebsState.line = line;
  ebsState.mode = 'period';
  ebsState.dailyEntries = [];
  ebsState.periodEntries = [];

  // Заголовок
  $('#electronicBrandScheduleTitle').textContent = 'Расписание брендов — ' + line;
  $('#ebs_line').value = line;

  // Переключаем режим на «По периодам»
  document.querySelectorAll('#ebsModeSwitch .ebs-mode-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === 'period');
  });
  $('#ebsPeriodMode').style.display = 'block';
  $('#ebsDailyMode').style.display = 'none';

  // Заполняем бренды в обоих селектах
  fillBrandSelectOptions('#ebsPeriodBrand', brands);
  fillBrandSelectOptions('#ebsDailyRollBrand', brands);

  // Сбрасываем поля периода
  $('#ebsPeriodFrom').value = todayISO();
  $('#ebsPeriodTo').value = addDaysISO(todayISO(), 6);
  $('#ebsPeriodBrand').value = '';

  // Инициализируем «По дням» существующим расписанием (на 14 дней вперёд)
  const existing = getElectronicBrandScheduleForLine(line);
  const existingMap = {};
  existing.forEach(x => { existingMap[x.date] = x.brand; });

  const today = todayISO();
  ebsState.dailyEntries = [];
  for (let i = 0; i < 14; i++) {
    const date = addDaysISO(today, i);
    ebsState.dailyEntries.push({ date, brand: existingMap[date] || '' });
  }

  renderEbsDailyRows();
  renderEbsPreview();

  openModal(modal);
};

/* Закрыть */
function closeElectronicBrandSchedule() {
  closeModal('#electronicBrandScheduleModal');
  ebsState.line = null;
}

/* Заполнить select опциями брендов */
function fillBrandSelectOptions(selector, brands) {
  const el = $(selector);
  if (!el) return;
  el.innerHTML = '<option value="">— выберите —</option>' +
    brands.map(b => `<option value="${escapeHtml(b)}">${escapeHtml(b)}</option>`).join('');
}

/* ============================================================
   Режим «По дням» — рендер строк
   ============================================================ */

function renderEbsDailyRows() {
  const wrap = $('#ebsDailyRows');
  if (!wrap) return;

  const brands = getBrandsForLine(ebsState.line);
  const brandOpts = (selected) =>
    '<option value="">— выберите —</option>' +
    brands.map(b => {
      const sel = (b === selected) ? ' selected' : '';
      return `<option value="${escapeHtml(b)}"${sel}>${escapeHtml(b)}</option>`;
    }).join('');

  if (!ebsState.dailyEntries.length) {
    wrap.innerHTML = '<div class="empty-state" style="padding:16px">Нет строк. Нажмите «+ Добавить день».</div>';
    return;
  }

  wrap.innerHTML = ebsState.dailyEntries.map((entry, idx) => {
    const shift = getShiftForDate(entry.date);
    return `
      <div class="ebs-day-row" data-idx="${idx}">
        <input type="date" data-date value="${escapeAttr(entry.date)}">
        <select data-brand>${brandOpts(entry.brand)}</select>
        <button type="button" class="ebs-remove" data-remove-row title="Удалить">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
    `;
  }).join('');

  // Обработчики
  wrap.querySelectorAll('.ebs-day-row').forEach(row => {
    const idx = parseInt(row.dataset.idx, 10);

    row.querySelector('[data-date]')?.addEventListener('change', (e) => {
      ebsState.dailyEntries[idx].date = e.target.value;
      renderEbsPreview();
    });

    row.querySelector('[data-brand]')?.addEventListener('change', (e) => {
      ebsState.dailyEntries[idx].brand = e.target.value;
      renderEbsPreview();
    });

    row.querySelector('[data-remove-row]')?.addEventListener('click', () => {
      ebsState.dailyEntries.splice(idx, 1);
      renderEbsDailyRows();
      renderEbsPreview();
    });
  });
}

/* ============================================================
   Превью итогового расписания
   ============================================================ */

function renderEbsPreview() {
  const wrap = $('#ebsPreview');
  if (!wrap) return;

  // Собираем все записи: сначала существующие в localStorage, потом наложим текущие правки
  const saved = getElectronicBrandScheduleForLine(ebsState.line);
  const map = {};
  saved.forEach(x => { map[x.date] = x.brand; });

  // Из режима «По дням» — только непустые
  ebsState.dailyEntries.forEach(e => {
    if (e.date) {
      if (e.brand && e.brand.trim()) {
        map[e.date] = e.brand;
      } else {
        delete map[e.date];
      }
    }
  });

  const entries = Object.entries(map).sort((a, b) => a[0].localeCompare(b[0]));

  if (!entries.length) {
    wrap.innerHTML = '<div class="ebs-preview-empty">Расписание пустое. Добавьте период или заполните дни вручную.</div>';
    return;
  }

  wrap.innerHTML = '<div class="ebs-preview-list">' +
    entries.map(([date, brand]) => {
      const shift = getShiftForDate(date);
      return `
        <div class="ebs-preview-row">
          <span class="ebs-preview-date">${escapeHtml(fmtISODate(date))}</span>
          <span class="ebs-preview-shift ebs-preview-shift-${shift}">${shift}</span>
          <span class="ebs-preview-brand">${escapeHtml(brand)}</span>
        </div>
      `;
    }).join('') +
    '</div>';
}

/* ============================================================
   Обработчики модалки расписания брендов
   ============================================================ */

// Закрытие
$('#electronicBrandScheduleClose')?.addEventListener('click', closeElectronicBrandSchedule);
$('#electronicBrandScheduleCancel')?.addEventListener('click', closeElectronicBrandSchedule);
$('#electronicBrandScheduleModal')?.addEventListener('click', (e) => {
  if (e.target.id === 'electronicBrandScheduleModal') closeElectronicBrandSchedule();
});

// Переключатель режима
$('#ebsModeSwitch')?.addEventListener('click', (e) => {
  const btn = e.target.closest('.ebs-mode-btn');
  if (!btn) return;
  const mode = btn.dataset.mode;

  document.querySelectorAll('#ebsModeSwitch .ebs-mode-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.mode === mode);
  });

  ebsState.mode = mode;
  $('#ebsPeriodMode').style.display = (mode === 'period') ? 'block' : 'none';
  $('#ebsDailyMode').style.display  = (mode === 'daily')  ? 'block' : 'none';
});

// Режим «По периодам» — добавить
$('#ebsPeriodAddBtn')?.addEventListener('click', () => {
  const from = $('#ebsPeriodFrom').value;
  const to = $('#ebsPeriodTo').value;
  const brand = $('#ebsPeriodBrand').value;

  if (!from) return showToast('Укажите дату начала', true);
  if (!to)   return showToast('Укажите дату окончания', true);
  if (!brand) return showToast('Выберите бренд', true);

  if (from > to) {
    return showToast('Дата начала позже даты окончания', true);
  }

  // Проходим по дням и добавляем в dailyEntries
  const start = new Date(from + 'T00:00:00');
  const end = new Date(to + 'T00:00:00');
  const dayCount = Math.round((end - start) / 86400000) + 1;

  if (dayCount > 90) {
    return showToast('Слишком длинный период (максимум 90 дней)', true);
  }

  // Проверяем «прошлые даты» — сегодня и позже
  const today = todayISO();
  if (to < today) {
    return showToast('Нельзя изменять расписание на прошлые даты', true);
  }

  // Заменяем/добавляем в dailyEntries
  for (let i = 0; i < dayCount; i++) {
    const date = addDaysISO(from, i);

    // Пропускаем прошлые (кроме сегодня)
    if (date < today) continue;

    // Ищем в dailyEntries
    const existingIdx = ebsState.dailyEntries.findIndex(e => e.date === date);
    if (existingIdx !== -1) {
      ebsState.dailyEntries[existingIdx].brand = brand;
    } else {
      ebsState.dailyEntries.push({ date, brand });
    }
  }

  // Сортируем
  ebsState.dailyEntries.sort((a, b) => a.date.localeCompare(b.date));

  // Переключаемся на режим «По дням», чтобы пользователь увидел результат
  document.querySelectorAll('#ebsModeSwitch .ebs-mode-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.mode === 'daily');
  });
  ebsState.mode = 'daily';
  $('#ebsPeriodMode').style.display = 'none';
  $('#ebsDailyMode').style.display  = 'block';

  renderEbsDailyRows();
  renderEbsPreview();

  showToast(`Добавлено дней: ${dayCount}`);
});

// Режим «По дням» — раскатать на неделю
$('#ebsDailyRollBtn')?.addEventListener('click', () => {
  const brand = $('#ebsDailyRollBrand').value;
  if (!brand) return showToast('Выберите бренд для раскатки', true);

  // Находим первую дату в dailyEntries, которая >= сегодня. Если таких нет — берём сегодня
  const today = todayISO();
  const candidates = ebsState.dailyEntries
    .filter(e => e.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date));

  const startDate = candidates.length ? candidates[0].date : today;

  // Проставляем на 7 дней
  for (let i = 0; i < 7; i++) {
    const date = addDaysISO(startDate, i);
    const existingIdx = ebsState.dailyEntries.findIndex(e => e.date === date);
    if (existingIdx !== -1) {
      ebsState.dailyEntries[existingIdx].brand = brand;
    } else {
      ebsState.dailyEntries.push({ date, brand });
    }
  }

  ebsState.dailyEntries.sort((a, b) => a.date.localeCompare(b.date));

  renderEbsDailyRows();
  renderEbsPreview();

  showToast(`Бренд ${brand} раскатан на 7 дней с ${fmtISODate(startDate)}`);
});

// Режим «По дням» — добавить строку
$('#ebsDailyAddRowBtn')?.addEventListener('click', () => {
  // Берём последнюю дату из dailyEntries или сегодня
  const last = ebsState.dailyEntries.length
    ? ebsState.dailyEntries[ebsState.dailyEntries.length - 1].date
    : todayISO();
  const newDate = addDaysISO(last, 1);

  ebsState.dailyEntries.push({ date: newDate, brand: '' });
  renderEbsDailyRows();
  renderEbsPreview();
});

// Очистить всё
$('#ebsClearAllBtn')?.addEventListener('click', () => {
  if (!confirm('Очистить всё расписание для линии ' + ebsState.line + '?')) return;

  setElectronicBrandSchedule({
    ...getElectronicBrandSchedule(),
    [ebsState.line]: []
  });

  ebsState.dailyEntries = [];
  ebsState.periodEntries = [];

  renderEbsDailyRows();
  renderEbsPreview();

  showToast('Расписание очищено');
});

// Сохранить
$('#electronicBrandScheduleSave')?.addEventListener('click', () => {
  if (!ebsState.line) return;

  const today = todayISO();

  // Формируем финальный массив из dailyEntries: только даты >= сегодня с непустым брендом
  const entries = ebsState.dailyEntries
    .filter(e => e.date && e.date >= today && e.brand && e.brand.trim())
    .map(e => ({ date: e.date, brand: e.brand.trim() }));

  // Оставляем в расписании для линии:
  //  - то, что уже было сохранено и НЕ касается дат из dailyEntries,
  //  - плюс новые записи.
  const existing = getElectronicBrandScheduleForLine(ebsState.line);
  const touchedDates = new Set(ebsState.dailyEntries.map(e => e.date));

  const keepOld = existing.filter(x => !touchedDates.has(x.date));
  const finalArr = [...keepOld, ...entries];
  finalArr.sort((a, b) => a.date.localeCompare(b.date));

  setElectronicBrandSchedule({
    ...getElectronicBrandSchedule(),
    [ebsState.line]: finalArr
  });

  closeElectronicBrandSchedule();

  // Перерисовываем редактор — обновятся счётчики дней
  renderElectronicView();

  showToast('Расписание сохранено');
});
