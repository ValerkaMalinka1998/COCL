/* ============================================================
   РАСПИСАНИЕ CL: шаблоны чек-листа
   Сохранить неделю как шаблон / применить шаблон к просматриваемой неделе.
   Применение = черновик недели (как ручные правки): дальше аналитик
   выбирает «С этой недели и далее» или «Только эта неделя» и сохраняет.
   Модуль общего пространства имён: функции и переменные видны
   во всех файлах. Порядок подключения — index.html.
   ============================================================ */

/* Все строки линии в текущем режиме (не только стоящие в расписании) */
function schTplLineRows() {
  return schState.mode === 'mech'
    ? getStandards().filter(s => s.line === schState.line && s.active !== false)
    : getElectronicParamsForLine(schState.line).filter(p => p.active !== false);
}

function openScheduleTemplates() {
  if (!schState.line) return showToast('Сначала выберите линию', true);
  renderScheduleTemplates();
  openModal('#schTplModal');
}

function renderScheduleTemplates() {
  const off = schState.weekOffset || 0;
  const past = off < 0;
  const list = getScheduleTemplates().filter(t => t.line === schState.line && t.mode === schState.mode);
  const kind = schState.mode === 'mech' ? 'стандартов' : 'параметров';
  $('#schTplSub').textContent = `${schState.line} · ${schState.mode === 'mech' ? 'механические' : 'E-Param'} · неделя ${getWeekLabel(off)}`;
  $('#schTplList').innerHTML = list.length ? list.map(t => {
    const n = Object.keys(t.rows || {}).length;
    return `<div class="sch-tpl-row">
      <div class="sch-tpl-name"><b>${escapeHtml(t.name)}</b><small>${n} ${kind} · создан ${escapeHtml(fmtShortDate(String(t.createdAt || '').slice(0, 10)))}</small></div>
      <button type="button" class="btn btn-primary btn-sm" data-sch-tpl-apply="${escapeAttr(t.id)}" ${past ? 'disabled title="Прошедшую неделю изменить нельзя"' : ''}>Применить к неделе</button>
      <button type="button" class="btn btn-danger-soft btn-sm" data-sch-tpl-del="${escapeAttr(t.id)}" title="Удалить шаблон">Удалить</button>
    </div>`;
  }).join('') : '<div class="st-muted">Шаблонов для этой линии пока нет — сохраните текущую неделю.</div>';
  const inp = $('#schTplName');
  if (inp) inp.value = '';
}

/* Снимок просматриваемой недели (с несохранёнными правками) */
function saveWeekAsScheduleTemplate() {
  const name = ($('#schTplName')?.value || '').trim();
  if (!name) return showToast('Введите название шаблона', true);
  const rows = {};
  schTplLineRows().forEach(r => {
    if (!isSchRowMember(r)) return;
    const f = getSchRowFreq(r);
    rows[r.id] = { schedule: (f.schedule || []).map(x => ({ day: x.day, shift: x.shift })), work: f.work };
  });
  if (!Object.keys(rows).length) return showToast('На этой неделе в расписании ничего нет', true);
  saveScheduleTemplate({ id: uid(), name, line: schState.line, mode: schState.mode, rows, createdAt: new Date().toISOString() });
  showToast('Шаблон сохранён');
  renderScheduleTemplates();
}

/* Шаблон → черновик недели: строки шаблона ставятся, остальные убираются */
function applyScheduleTemplate(id) {
  const t = getScheduleTemplates().find(x => x.id === id);
  if (!t || isSchReadOnly()) return;
  if (schState.dirty && !confirm('Несохранённые правки недели заменятся шаблоном. Продолжить?')) return;
  const weekStart = getSchWeekStart(schState.weekOffset || 0);
  const dateByDay = cilDateByDayIdx(getClWeekDays(schState.weekOffset || 0));
  schState.draft = {};
  schState.removedFromSchedule = new Set();
  schState.addedToSchedule = new Set();
  schTplLineRows().forEach(r => {
    const member = getRowForWeek(r, weekStart, schState.line).member;
    const tr = t.rows[r.id];
    if (!tr) { if (member) schState.removedFromSchedule.add(r.id); return; }
    if (!member) schState.addedToSchedule.add(r.id);
    // Прошедшие смены текущей недели не планируются — уходят в шаблон следующих недель
    const kept = [], dropped = [];
    tr.schedule.forEach(x => (dateByDay[x.day] && isShiftPast(dateByDay[x.day], x.shift) ? dropped : kept).push({ ...x }));
    const d = { type: 'weekly', schedule: kept, droppedPast: dropped, work: tr.work, timeWindows: [], shifts: [], daysOfWeek: [], dates: [] };
    schSyncDraftDays(d);
    schState.draft[r.id] = d;
  });
  schState.dirty = true;
  closeModal('#schTplModal');
  updateSchSaveBtn();
  renderScheduleMatrix();
  updateSchPanelCount();
  showToast(`Шаблон «${t.name}» применён — выберите, на какие недели, и нажмите «Сохранить»`);
}

$('#schTemplatesBtn')?.addEventListener('click', () => openScheduleTemplates());
document.addEventListener('click', (e) => {
  if (e.target.closest('#schTplClose')) return closeModal('#schTplModal');
  if (e.target.closest('#schTplSaveBtn')) return saveWeekAsScheduleTemplate();
  const ap = e.target.closest('[data-sch-tpl-apply]');
  if (ap && !ap.disabled) return applyScheduleTemplate(ap.dataset.schTplApply);
  const del = e.target.closest('[data-sch-tpl-del]');
  if (del) {
    const t = getScheduleTemplates().find(x => x.id === del.dataset.schTplDel);
    if (t && confirm(`Удалить шаблон «${t.name}»? Расписание недель не изменится.`)) {
      removeScheduleTemplate(t.id);
      renderScheduleTemplates();
    }
  }
});
$('#schTplName')?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') { e.preventDefault(); saveWeekAsScheduleTemplate(); }
});
