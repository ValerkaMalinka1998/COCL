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
   CL ELECTRONIC — карточка «График смен»
   ============================================================ */
function renderElectronicShiftSettings() {
  const cfg = getElectronicShiftConfig();

  const dayEl   = $('#elecShiftDayCycle');
  const nightEl = $('#elecShiftNightCycle');
  const startEl = $('#elecShiftStart');

  if (dayEl)   dayEl.value   = cfg.dayCycle.join(', ');
  if (nightEl) nightEl.value = cfg.nightCycle.join(', ');
  if (startEl) startEl.value = cfg.startDate;

  renderElectronicShiftPreview();
}

/* Предпросмотр — 8 дней от даты старта, с обеими сменами */
function renderElectronicShiftPreview() {
  const box = $('#elecShiftPreview');
  if (!box) return;

  const cfg = getElectronicShiftConfig();
  const start = new Date(cfg.startDate + 'T00:00:00');

  let html = '';
  for (let i = 0; i < 8; i++) {
    const d = new Date(start.getTime() + i * 86400000);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    const dateStr = `${yyyy}-${mm}-${dd}`;
    const day   = getDayShiftForDate(dateStr);
    const night = getNightShiftForDate(dateStr);

    html += `
      <div class="elec-shift-day">
        <span class="elec-shift-day-date">${dd}.${mm}.${yyyy}</span>
        <span style="font-size:10px;color:var(--text-dim)">день · ночь</span>
        <span style="display:flex;gap:6px;align-items:baseline">
          <span class="elec-shift-day-shift elec-shift-${day}" style="font-size:14px">${day}</span>
          <span style="color:var(--text-dim);font-size:12px">/</span>
          <span class="elec-shift-day-shift elec-shift-${night}" style="font-size:14px;opacity:0.75">${night}</span>
        </span>
      </div>
    `;
  }
  box.innerHTML = html;
}
/* Склонение: 1 линия / 2 линии / 5 линий */
function pluralizeLines(n) {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return 'линия';
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return 'линии';
  return 'линий';
}
/* --- CL Electronic: график смен (v2: день/ночь) --- */

function parseCycleString(str) {
  return String(str || '')
    .split(/[\s,;]+/)
    .map(s => s.trim().toUpperCase())
    .filter(s => ['A','B','C','D'].includes(s));
}

$('#elecShiftSaveBtn')?.addEventListener('click', () => {
  const dayCycle   = parseCycleString($('#elecShiftDayCycle')?.value);
  const nightCycle = parseCycleString($('#elecShiftNightCycle')?.value);
  const start      = ($('#elecShiftStart')?.value || '').trim();

  if (!dayCycle.length) {
    return showToast('Дневной цикл пуст или содержит недопустимые значения (A–D)', true);
  }
  if (!nightCycle.length) {
    return showToast('Ночной цикл пуст или содержит недопустимые значения (A–D)', true);
  }
  if (!start) {
    return showToast('Укажите дату старта цикла', true);
  }

  setElectronicShiftConfig({ dayCycle, nightCycle, startDate: start });

  renderElectronicShiftPreview();
  showToast('График смен сохранён');
});

$('#elecShiftResetBtn')?.addEventListener('click', () => {
  if (!confirm('Сбросить график смен к стандартному (D D A A C C B B / C C B B D D A A, старт 01.01.2026)?')) return;

  setElectronicShiftConfig({ ...DEFAULT_ELECTRONIC_SHIFT_CFG });
  renderElectronicShiftSettings();
  showToast('График смен сброшен');
});

function updateShiftPreviewTemporary() {
  const dayCycle   = parseCycleString($('#elecShiftDayCycle')?.value);
  const nightCycle = parseCycleString($('#elecShiftNightCycle')?.value);
  const start      = ($('#elecShiftStart')?.value || '').trim() || DEFAULT_ELECTRONIC_SHIFT_CFG.startDate;

  if (!dayCycle.length || !nightCycle.length) return;

  const backup = getElectronicShiftConfig();
  setElectronicShiftConfig({ dayCycle, nightCycle, startDate: start });
  renderElectronicShiftPreview();
  setElectronicShiftConfig(backup);
}

$('#elecShiftDayCycle')?.addEventListener('input', updateShiftPreviewTemporary);
$('#elecShiftNightCycle')?.addEventListener('input', updateShiftPreviewTemporary);
$('#elecShiftStart')?.addEventListener('input', updateShiftPreviewTemporary);

