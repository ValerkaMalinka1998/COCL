/* ============================================================
   НАСТРОЙКИ: график смен
   Модуль общего пространства имён: функции и переменные видны
   во всех файлах. Порядок подключения — index.html.
   ============================================================ */

/* ============================================================
   ГРАФИК СМЕН — конфигурация (cl_electronic_shiftcfg_v1)
   ============================================================ */
function sanitizeCycleArray(arr, def) {
  if (!Array.isArray(arr)) return [...def];
  const filtered = arr.filter(s => ['A','B','C','D'].includes(s));
  return filtered.length ? filtered : [...def];
}

function getElectronicShiftConfig() {
  const raw = load(STORAGE_KEYS.electronicShiftCfg, null);

  // Миграция со старого формата (cycle/daysPerShift) → v2
  if (raw && typeof raw === 'object' && Array.isArray(raw.cycle) && !raw.dayCycle) {
    const legacyCycle = raw.cycle;
    const legacyDays = Number(raw.daysPerShift) > 0 ? Number(raw.daysPerShift) : 2;
    const legacyStart = /^\d{4}-\d{2}-\d{2}$/.test(raw.startDate || '')
      ? raw.startDate
      : DEFAULT_ELECTRONIC_SHIFT_CFG.startDate;

    const dayCycle = [];
    const nightCycle = [];
    for (let i = 0; i < 8; i++) {
      const pos = Math.floor(i / legacyDays) % legacyCycle.length;
      const nextPos = Math.floor((i + 1) / legacyDays) % legacyCycle.length;
      dayCycle.push(legacyCycle[pos]);
      nightCycle.push(legacyCycle[nextPos]);
    }

    const migrated = { dayCycle, nightCycle, startDate: legacyStart };
    save(STORAGE_KEYS.electronicShiftCfg, migrated);
    return migrated;
  }

  if (!raw || typeof raw !== 'object') {
    return {
      dayCycle:   [...DEFAULT_ELECTRONIC_SHIFT_CFG.dayCycle],
      nightCycle: [...DEFAULT_ELECTRONIC_SHIFT_CFG.nightCycle],
      startDate:  DEFAULT_ELECTRONIC_SHIFT_CFG.startDate
    };
  }

  const dayCycle   = sanitizeCycleArray(raw.dayCycle,   DEFAULT_ELECTRONIC_SHIFT_CFG.dayCycle);
  const nightCycle = sanitizeCycleArray(raw.nightCycle, DEFAULT_ELECTRONIC_SHIFT_CFG.nightCycle);
  const startDate  = /^\d{4}-\d{2}-\d{2}$/.test(raw.startDate || '')
    ? raw.startDate
    : DEFAULT_ELECTRONIC_SHIFT_CFG.startDate;

  return { dayCycle, nightCycle, startDate };
}

function setElectronicShiftConfig(cfg) {
  const normalized = {
    dayCycle:   sanitizeCycleArray(cfg.dayCycle,   DEFAULT_ELECTRONIC_SHIFT_CFG.dayCycle),
    nightCycle: sanitizeCycleArray(cfg.nightCycle, DEFAULT_ELECTRONIC_SHIFT_CFG.nightCycle),
    startDate:  /^\d{4}-\d{2}-\d{2}$/.test(cfg.startDate || '')
      ? cfg.startDate
      : DEFAULT_ELECTRONIC_SHIFT_CFG.startDate
  };
  save(STORAGE_KEYS.electronicShiftCfg, normalized);
}

/* ============================================================
   НАСТРОЙКИ: раздел «Смены» — редактор цикла смен
   Черновик (shfDraft) правится кликами, в хранилище попадает
   только по «Сохранить».
   ============================================================ */
const SHF_BRIGADES = ['A', 'B', 'C', 'D'];
let shfDraft = null;

function shfIsDirty() {
  return JSON.stringify(shfDraft) !== JSON.stringify(getElectronicShiftConfig());
}

/* Бригады на дату по черновику (та же формула, что в getDayShiftForDate) */
function shfBrigadesFor(dateStr) {
  const len = shfDraft.dayCycle.length;
  const diff = Math.floor((new Date(dateStr + 'T00:00:00') - new Date(shfDraft.startDate + 'T00:00:00')) / 86400000);
  const pos = diff < 0 ? 0 : diff % len;
  return { day: shfDraft.dayCycle[pos], night: shfDraft.nightCycle[pos], pos };
}

function renderElectronicShiftSettings() {
  shfDraft = getElectronicShiftConfig();
  renderElectronicShiftPreview();
}

function renderElectronicShiftPreview() {
  if (!shfDraft) shfDraft = getElectronicShiftConfig();
  const len = shfDraft.dayCycle.length;
  const now = getCurrentShiftPeriod();
  const cur = shfBrigadesFor(now.date);
  const startEl = $('#elecShiftStart');
  if (startEl && startEl.value !== shfDraft.startDate) startEl.value = shfDraft.startDate;
  const lenEl = $('#shfLenVal');
  if (lenEl) lenEl.textContent = `${len} ${len === 1 ? 'день' : len < 5 ? 'дня' : 'дней'}`;
  const dirty = $('#shfDirty');
  if (dirty) dirty.hidden = !shfIsDirty();

  /* Сейчас на смене */
  const nowBox = $('#shfNow');
  if (nowBox) {
    const brigade = now.shiftType === 'day' ? cur.day : cur.night;
    nowBox.innerHTML = `
      <div class="shf-now-main">
        <span class="shf-badge shf-b-${brigade}">${brigade}</span>
        <div>
          <div class="shf-now-label">Сейчас на смене</div>
          <div class="shf-now-text">Смена ${brigade} · ${now.shiftType === 'day' ? 'день 09:00–21:00' : 'ночь 21:00–09:00'} · ${fmtISODate(now.date)}</div>
        </div>
      </div>
      <div class="shf-now-pos">День цикла ${cur.pos + 1} из ${len}</div>`;
  }

  /* Цикл: столбец на день цикла, две строки — день и ночь */
  const cycle = $('#shfCycle');
  if (cycle) {
    const cell = (kind, i) => {
      const b = shfDraft[kind + 'Cycle'][i];
      return `<button type="button" class="shf-cell shf-b-${b}" data-shf-kind="${kind}" data-shf-i="${i}" title="${kind === 'day' ? 'День' : 'Ночь'}, день цикла ${i + 1}: смена ${b}">${b}</button>`;
    };
    let html = '<div class="shf-row-label"></div>';
    for (let i = 0; i < len; i++) html += `<div class="shf-col-head ${i === cur.pos ? 'shf-today' : ''}">${i + 1}</div>`;
    html += '<div class="shf-row-label">День<small>09–21</small></div>';
    for (let i = 0; i < len; i++) html += cell('day', i);
    html += '<div class="shf-row-label">Ночь<small>21–09</small></div>';
    for (let i = 0; i < len; i++) html += cell('night', i);
    cycle.style.setProperty('--shf-cols', len);
    cycle.innerHTML = html;
  }

  /* Ближайшие 14 дней от даты текущей смены */
  const cal = $('#elecShiftPreview');
  if (cal) {
    const wd = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
    let html = '';
    for (let i = 0; i < 14; i++) {
      const ds = addDaysISO(now.date, i);
      const s = shfBrigadesFor(ds);
      const dow = new Date(ds + 'T00:00:00').getDay();
      const isNow = (t) => i === 0 && now.shiftType === t ? ' shf-now-cell' : '';
      html += `
        <div class="shf-day ${dow === 0 || dow === 6 ? 'shf-weekend' : ''} ${i === 0 ? 'shf-day-today' : ''}">
          <div class="shf-day-date">${wd[dow]} ${fmtShortDate(ds)}</div>
          <div class="shf-day-pair">
            <span class="shf-mini shf-b-${s.day}${isNow('day')}" title="День">${s.day}</span>
            <span class="shf-mini shf-mini-night shf-b-${s.night}${isNow('night')}" title="Ночь">${s.night}</span>
          </div>
        </div>`;
    }
    cal.innerHTML = html;
  }
}

/* Склонение: 1 линия / 2 линии / 5 линий */
function pluralizeLines(n) {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return 'линия';
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return 'линии';
  return 'линий';
}

/* --- Обработчики --- */
$('#shfCycle')?.addEventListener('click', (e) => {
  const c = e.target.closest('[data-shf-kind]');
  if (!c) return;
  const arr = shfDraft[c.dataset.shfKind + 'Cycle'];
  const i = Number(c.dataset.shfI);
  arr[i] = SHF_BRIGADES[(SHF_BRIGADES.indexOf(arr[i]) + 1) % SHF_BRIGADES.length];
  renderElectronicShiftPreview();
});

$('#shfLenPlus')?.addEventListener('click', () => {
  if (shfDraft.dayCycle.length >= 28) return showToast('Цикл не может быть длиннее 28 дней', true);
  shfDraft.dayCycle.push(shfDraft.dayCycle[shfDraft.dayCycle.length - 1]);
  shfDraft.nightCycle.push(shfDraft.nightCycle[shfDraft.nightCycle.length - 1]);
  renderElectronicShiftPreview();
});

$('#shfLenMinus')?.addEventListener('click', () => {
  if (shfDraft.dayCycle.length <= 1) return;
  shfDraft.dayCycle.pop();
  shfDraft.nightCycle.pop();
  renderElectronicShiftPreview();
});

$('#elecShiftStart')?.addEventListener('change', (e) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(e.target.value)) return;
  shfDraft.startDate = e.target.value;
  renderElectronicShiftPreview();
});

$('#elecShiftSaveBtn')?.addEventListener('click', () => {
  if (!shfIsDirty()) return showToast('Изменений нет');
  if (!confirm('Сохранить график? Буквы смен в Чек-листе, Расписании и CL при переходах пересчитаются по новому циклу.')) return;
  setElectronicShiftConfig(shfDraft);
  shfDraft = getElectronicShiftConfig();
  renderElectronicShiftPreview();
  showToast('График смен сохранён');
});

$('#elecShiftResetBtn')?.addEventListener('click', () => {
  if (!confirm(`Вернуть стандартный график (цикл ${DEFAULT_ELECTRONIC_SHIFT_CFG.dayCycle.length} дней с ${fmtISODate(DEFAULT_ELECTRONIC_SHIFT_CFG.startDate)})? Изменения нужно будет сохранить.`)) return;
  shfDraft = {
    dayCycle: [...DEFAULT_ELECTRONIC_SHIFT_CFG.dayCycle],
    nightCycle: [...DEFAULT_ELECTRONIC_SHIFT_CFG.nightCycle],
    startDate: DEFAULT_ELECTRONIC_SHIFT_CFG.startDate
  };
  renderElectronicShiftPreview();
});
