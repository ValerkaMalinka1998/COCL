/* ============================================================
   НАСТРОЙКИ: график смен
   Модуль общего пространства имён: функции и переменные видны
   во всех файлах. Порядок подключения — index.html.
   ============================================================ */

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

/* Удалить блок */
window.deleteBlock = function(id) {
  const blocks = getBlocks();
  const block = blocks.find(b => b.id === id);
  if (!block) return;

  if (!confirm(`Удалить блок "${block.name}"? Линии останутся, но отвяжутся от блока.`)) return;

  // Удаляем блок из реальной структуры цехов
  const workshops = getWorkshops();
  let removed = false;
  workshops.forEach(w => (w.areas || []).forEach(a => {
    if (!Array.isArray(a.blocks)) return;
    const idx = a.blocks.findIndex(b => b.id === id);
    if (idx !== -1) {
      a.blocks.splice(idx, 1);
      removed = true;
    }
  }));
  if (removed) setWorkshops(workshops);
  renderBlocksSettings();
  showToast('Блок удалён');
};
