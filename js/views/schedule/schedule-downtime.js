/* ============================================================
   РАСПИСАНИЕ CL: простой линии
   Аналитик ставит простой (с даты/смены по дату/смену или «до запуска»),
   можно задним числом. В простое проверки CL не планируются.
   Модуль общего пространства имён: функции и переменные видны
   во всех файлах. Порядок подключения — index.html.
   ============================================================ */

/* === ПРОСТОЙ — ОКНО === */

function openScheduleDowntimeModal() {
  if (!schState.line) return;
  const cur = getCurrentShiftPeriod();
  $('#schDowntimeTitle').textContent = `Простой линии ${schState.line}`;
  $('#schDtFrom').value = cur.date;
  $('#schDtFromShift').value = cur.shiftType;
  $('#schDtTo').value = cur.date;
  $('#schDtToShift').value = 'night';
  $('#schDtOpen').checked = false;
  $('#schDtReason').innerHTML = '<option value="">Не указана</option>' +
    DOWNTIME_REASONS.map(r => `<option value="${r.id}">${escapeHtml(r.label)}</option>`).join('');
  $('#schDtNote').value = '';
  syncSchDowntimeForm();
  renderSchDowntimeList();
  openModal('#schDowntimeModal');
}

function closeScheduleDowntimeModal() {
  closeModal('#schDowntimeModal');
}

/* Форма → простой или текст ошибки */
function readSchDowntimeForm() {
  const d = {
    from: $('#schDtFrom').value,
    fromShift: $('#schDtFromShift').value,
    to: $('#schDtOpen').checked ? '' : $('#schDtTo').value,
    toShift: $('#schDtToShift').value,
    reason: $('#schDtReason').value,
    note: $('#schDtReason').value === 'other' ? $('#schDtNote').value.trim() : ''
  };
  if (!d.from) return { error: 'Укажите, с какой смены простой' };
  if (!$('#schDtOpen').checked && !d.to) return { error: 'Укажите конец простоя или отметьте «до запуска»' };
  const fromI = valShiftIndex(d.from, d.fromShift);
  const endI = d.to ? valShiftIndex(d.to, d.toShift) : Infinity;
  if (endI < fromI) return { error: 'Конец простоя раньше начала' };
  const cross = getLineDowntimes(schState.line).find(x =>
    fromI <= (x.to ? valShiftIndex(x.to, x.toShift) : Infinity) && valShiftIndex(x.from, x.fromShift) <= endI);
  if (cross) return { error: `Пересекается с простоем ${dtPeriodText(cross)}` };
  return { d, count: endI - fromI + 1 };
}

/* Поля и подсказка под формой */
function syncSchDowntimeForm() {
  const open = $('#schDtOpen').checked;
  $('#schDtTo').disabled = open;
  $('#schDtToShift').disabled = open;
  $('#schDtNote').hidden = $('#schDtReason').value !== 'other';
  const r = readSchDowntimeForm();
  const hint = $('#schDtHint');
  hint.classList.toggle('is-error', !!r.error);
  if (r.error) { hint.textContent = r.error; return; }
  const what = r.d.to
    ? `Простой: ${r.count} ${pluralRu(r.count, 'смена', 'смены', 'смен')}, ${dtPeriodText(r.d)}.`
    : `Простой ${dtPeriodText(r.d)}.`;
  hint.textContent = `${what} Проверок CL не будет, открытые долги снимутся.`;
}

function saveSchDowntime() {
  const r = readSchDowntimeForm();
  if (r.error) { showToast(r.error, true); return; }
  const list = getLineDowntimes(schState.line).slice();
  list.push({ id: uid(), ...r.d, createdAt: new Date().toISOString() });
  setLineDowntimes(schState.line, list);
  showToast('Простой сохранён');
  renderSchDowntimeList();
  // Форма теперь пересекается с сохранённым — не показываем это ошибкой
  const hint = $('#schDtHint');
  hint.classList.remove('is-error');
  hint.textContent = 'Простой сохранён. Чтобы добавить ещё один, измените даты.';
  renderScheduleMatrix();
}

/* === ПРОСТОЙ — СПИСОК ЛИНИИ === */

function renderSchDowntimeList() {
  const box = $('#schDtList');
  const list = getLineDowntimes(schState.line).slice()
    .sort((a, b) => valShiftIndex(b.from, b.fromShift) - valShiftIndex(a.from, a.fromShift));
  if (!list.length) {
    box.innerHTML = '<div class="sch-dt-empty">Простоев не было</div>';
    return;
  }
  box.innerHTML = list.map(d => {
    const made = getCurrentShiftPeriod(new Date(d.createdAt));
    const late = valShiftIndex(made.date, made.shiftType) > valShiftIndex(d.from, d.fromShift);
    return `<div class="sch-dt-item${d.to ? '' : ' is-open'}" data-dt-id="${escapeAttr(d.id)}">
      <div class="sch-dt-main">
        <b>${escapeHtml(dtPeriodText(d))}</b>
        <span>${escapeHtml(downtimeReasonText(d))}</span>
      </div>
      <div class="sch-dt-meta">добавлен ${escapeHtml(dtShiftText(made.date, made.shiftType).slice(0, 5))}${late ? ' · задним числом' : ''}</div>
      <div class="sch-dt-actions">
        ${d.to ? '' : '<button type="button" class="btn btn-secondary btn-sm" data-dt-act="start">Линия запущена</button>'}
        <button type="button" class="btn btn-secondary btn-sm" data-dt-act="delete">Удалить</button>
      </div>
    </div>`;
  }).join('');
}

/* «Линия запущена»: простой заканчивается сменой перед текущей */
function endSchDowntime(id) {
  const cur = getCurrentShiftPeriod();
  const last = valShiftFromIndex(valShiftIndex(cur.date, cur.shiftType) - 1);
  const list = getLineDowntimes(schState.line).map(d => {
    if (d.id !== id) return d;
    return valShiftIndex(last.date, last.shift) < valShiftIndex(d.from, d.fromShift)
      ? null
      : { ...d, to: last.date, toShift: last.shift };
  }).filter(Boolean);
  setLineDowntimes(schState.line, list);
  showToast('Простой закончен — проверки с текущей смены');
  renderSchDowntimeList();
  renderScheduleMatrix();
}

function deleteSchDowntime(id) {
  const d = getLineDowntimes(schState.line).find(x => x.id === id);
  if (!d || !confirm(`Удалить простой ${dtPeriodText(d)}? Пропуски за эти смены снова будут считаться.`)) return;
  setLineDowntimes(schState.line, getLineDowntimes(schState.line).filter(x => x.id !== id));
  renderSchDowntimeList();
  syncSchDowntimeForm();
  renderScheduleMatrix();
}

/* === ПРОСТОЙ — ОБРАБОТЧИКИ === */

$('#schDowntimeBtn')?.addEventListener('click', () => openScheduleDowntimeModal());
$('#schDowntimeClose')?.addEventListener('click', () => closeScheduleDowntimeModal());
$('#schDowntimeCancel')?.addEventListener('click', () => closeScheduleDowntimeModal());
$('#schDowntimeModal')?.addEventListener('click', (e) => {
  if (e.target.id === 'schDowntimeModal') closeScheduleDowntimeModal();
});
$('#schDowntimeSave')?.addEventListener('click', () => saveSchDowntime());
['#schDtFrom', '#schDtFromShift', '#schDtTo', '#schDtToShift', '#schDtOpen', '#schDtReason'].forEach(sel =>
  $(sel)?.addEventListener('change', () => syncSchDowntimeForm()));
$('#schDtList')?.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-dt-act]');
  if (!btn) return;
  const id = btn.closest('[data-dt-id]').dataset.dtId;
  if (btn.dataset.dtAct === 'start') endSchDowntime(id);
  else deleteSchDowntime(id);
});
