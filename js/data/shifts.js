/* ============================================================
   ДАННЫЕ: график смен (cl_electronic_shiftcfg_v1)
   Модуль общего пространства имён: функции и переменные видны
   во всех файлах. Порядок подключения — index.html.
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
