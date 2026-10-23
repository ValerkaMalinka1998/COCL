/* ============================================================
   СТАНДАРТЫ CL: панель массовых действий над выбранными строками
   (в расписание, «CL относится к», экспорт). Модуль общего
   пространства имён; подключается после editor-elec.js.
   ============================================================ */

const BULK_APPLIES = [
  ['ChangeOver', 'Change Over'],
  ['CL_TO', 'CL в ТО'],
  ['CL_Conversion', 'CL в Конвертацию']
];

function bulkKindInfo(kind) {
  return kind === 'mech'
    ? { sel: editorTableState.mechSelected, get: getStandards, set: setStandards, bar: '#editorMechBulk' }
    : { sel: editorTableState.elecSelected, get: getElectronicParams, set: setElectronicParams, bar: '#editorElecBulk' };
}

/* Показать / скрыть панель и обновить счётчик */
function updateEditorBulk(kind) {
  const info = bulkKindInfo(kind);
  const bar = $(info.bar);
  if (!bar) return;
  const n = info.sel.size;
  bar.hidden = !n;
  const cnt = bar.querySelector('.et-bulk-count');
  if (cnt) cnt.textContent = n;
  if (!n) bar.querySelectorAll('.et-bulk-menu').forEach(m => { m.hidden = true; });
}

/* Выбранные строки (только те, что ещё есть в хранилище) */
function bulkSelectedRows(kind) {
  const info = bulkKindInfo(kind);
  return info.get().filter(r => info.sel.has(r.id));
}

function bulkRefresh(kind) {
  if (kind === 'mech') refreshEditorMechTable(); else refreshEditorElecTable();
}

/* В Расписание CL: с текущей недели, смены аналитик отметит там сам */
function bulkAddToSchedule(kind) {
  const info = bulkKindInfo(kind);
  const all = info.get();
  const ws = getSchWeekStart(0);
  let added = 0;
  all.forEach(row => {
    if (!info.sel.has(row.id) || row.active === false) return;
    if (getRowForWeek(row, ws, row.line).member) return;
    const t = getRowTemplateForWeek(row, ws);
    setRowTemplateFrom(row, ws, { ...t, inSchedule: true });
    row.inSchedule = true;
    row.updatedAt = new Date().toISOString();
    added++;
  });
  if (!added) return showToast('Выбранные строки уже в расписании (или неактивны)', true);
  info.set(all);
  showToast(`В расписание добавлено: ${added}. Смены отметьте в «Расписании CL»`);
  bulkRefresh(kind);
}

/* «CL относится к»: добавить или убрать один тип у всех выбранных */
function bulkSetApplies(kind, type, on) {
  const info = bulkKindInfo(kind);
  const all = info.get();
  let changed = 0;
  all.forEach(row => {
    if (!info.sel.has(row.id)) return;
    const list = Array.isArray(row.appliesTo) ? row.appliesTo : [];
    if (list.includes(type) === on) return;
    const before = JSON.parse(JSON.stringify(row));
    row.appliesTo = on ? [...list, type] : list.filter(x => x !== type);
    row.updatedAt = new Date().toISOString();
    logRowChange(kind === 'mech' ? 'mech' : 'elec', before, row);
    changed++;
  });
  if (!changed) return showToast('Ничего не изменилось', true);
  info.set(all);
  const label = (BULK_APPLIES.find(a => a[0] === type) || [])[1] || type;
  showToast(`${on ? 'Добавлено' : 'Убрано'} «${label}»: ${changed}`);
  bulkRefresh(kind);
}

function bulkClear(kind) {
  bulkKindInfo(kind).sel.clear();
  bulkRefresh(kind);
}

/* Разметка панели (одна на режим) */
function bulkBarHtml() {
  const ic = (p) => `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
  return `
    <div class="et-bulk-info">Выбрано: <strong class="et-bulk-count">0</strong></div>
    <div class="et-bulk-actions">
      <button type="button" class="btn btn-secondary btn-sm btn-icon-text" data-bulk="schedule">${ic('<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>')}В расписание</button>
      <div class="et-bulk-pop">
        <button type="button" class="btn btn-secondary btn-sm btn-icon-text" data-bulk="applies">${ic('<polyline points="20 6 9 17 4 12"/>')}CL относится к…</button>
        <div class="et-bulk-menu" hidden>
          ${BULK_APPLIES.map(([k, label]) => `
            <div class="et-bulk-menu-row">
              <span>${label}</span>
              <button type="button" class="et-bulk-add" data-bulk-applies="${k}" data-on="1" title="Добавить всем выбранным">＋</button>
              <button type="button" class="et-bulk-del" data-bulk-applies="${k}" data-on="0" title="Убрать у всех выбранных">−</button>
            </div>`).join('')}
        </div>
      </div>
      <button type="button" class="btn btn-secondary btn-sm btn-icon-text" data-bulk="export">${ic('<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>')}Экспорт выбранных</button>
      <button type="button" class="btn btn-secondary btn-sm" data-bulk="clear">Снять выбор</button>
    </div>`;
}

function initEditorBulk() {
  [['mech', '#editorMechBulk'], ['elec', '#editorElecBulk']].forEach(([kind, sel]) => {
    const bar = $(sel);
    if (!bar) return;
    bar.innerHTML = bulkBarHtml();
    bar.addEventListener('click', (e) => {
      const ap = e.target.closest('[data-bulk-applies]');
      if (ap) {
        bar.querySelector('.et-bulk-menu').hidden = true;
        bulkSetApplies(kind, ap.dataset.bulkApplies, ap.dataset.on === '1');
        return;
      }
      const btn = e.target.closest('[data-bulk]');
      if (!btn) return;
      const act = btn.dataset.bulk;
      const menu = bar.querySelector('.et-bulk-menu');
      if (act !== 'applies') menu.hidden = true;
      if (act === 'schedule') bulkAddToSchedule(kind);
      else if (act === 'applies') menu.hidden = !menu.hidden;
      else if (act === 'export') {
        const ids = [...bulkKindInfo(kind).sel];
        if (kind === 'mech') editorExportLine(ids); else editorElecExport(ids);
      }
      else if (act === 'clear') bulkClear(kind);
    });
  });
  document.addEventListener('click', (e) => {
    if (e.target.closest('.et-bulk-pop')) return;
    document.querySelectorAll('.et-bulk-menu').forEach(m => { m.hidden = true; });
  });
}
initEditorBulk();
