/* ============================================================
   ЧЕК-ЛИСТ CL: «Итог смены для доски»
   Сводка текущей смены линии по Maker / Packer: отклонения,
   выполнение, время проверок. Считается по механике и E-Param
   вместе, независимо от выбранного режима.
   ============================================================ */

/* Считает итог текущей смены линии: [{ part, planned, done, fail, missedSec, planSec, doneSec, items }] */
function clBoardSummary() {
  const line = clState.line;
  const weekDays = getClWeekDays(0);
  const weekStart = weekDays[0];
  const dateByDayIdx = cilDateByDayIdx(weekDays);
  const checkedIds = getCheckedStandardIdsForWeek(line, weekDays);
  const hist = clHistoryIndex();
  const isMember = (row) => getRowForWeek(row, weekStart, line).member;
  const inValidation = (row) => weekDays.some(d => isValidationDay(row, d));

  const rows = [
    ...getStandards().filter(s => s.line === line),
    ...getElectronicParamsForLine(line)
  ].filter(r => r.active !== false || checkedIds.has(r.id))
   .filter(r => isMember(r) || inValidation(r) || checkedIds.has(r.id));

  const groups = {};
  rows.forEach(row => {
    const cell = clRowCells(row, dateByDayIdx, hist)
      .find(c => c.dateStr === clState.activeDate && c.shift === clState.shiftType);
    if (!cell || cell.status === 'na') return;
    const key = row.nodePart || '';
    const g = groups[key] = groups[key] || { part: key, planned: 0, done: 0, fail: 0, planSec: 0, doneSec: 0, items: [] };
    const sec = cilRowDurationSec(row);
    g.planned++;
    g.planSec += sec;
    if (cell.status === 'OK' || cell.status === 'FAIL' || cell.status === 'UNCHECKED') {
      g.done++;
      g.doneSec += sec;
    }
    if (cell.status === 'FAIL') g.fail++;
    if (cell.status === 'FAIL' || cell.status === 'due' || cell.status === 'missed' || cell.status === 'UNCHECKED') {
      g.items.push({ status: cell.status, machine: row.machine || '', title: row.title || row.paramName || '—', opl: row.oplNumber || '' });
    }
  });
  return Object.values(groups).sort((a, b) => (a.part || 'ЯЯЯ').localeCompare(b.part || 'ЯЯЯ'));
}

function clBoardMin(sec) {
  return sec ? String(Math.round(sec / 60 * 10) / 10).replace('.', ',') : '0';
}

function clBoardText(groups) {
  const shiftName = clState.shiftType === 'day' ? 'День' : 'Ночь';
  const head = `${clState.line} · ${shiftName} · смена ${clState.shiftLetter || '—'} · ${fmtShortDate(clState.activeDate)}`;
  const lines = groups.map(g => {
    const pct = g.planned ? Math.round(g.done / g.planned * 100) : 0;
    return `${g.part || 'Линия'}: отклонений ${g.fail}; выполнение ${pct}% (${g.done}/${g.planned}); время проверок ${clBoardMin(g.doneSec)} из ${clBoardMin(g.planSec)} мин`;
  });
  return [head, ...lines].join('\n');
}

function openClBoardSummary() {
  const modal = $('#clBoardModal');
  if (!modal) return;
  if (!clState.line) { showToast('Сначала выберите линию', true); return; }
  const groups = clBoardSummary();
  const shiftName = clState.shiftType === 'day' ? 'День' : 'Ночь';
  $('#clBoardSub').textContent = `${clState.line} · ${shiftName} · смена ${clState.shiftLetter || '—'} · ${fmtShortDate(clState.activeDate)}`;

  if (!groups.length) {
    $('#clBoardBody').innerHTML = '<div class="editor-empty">В эту смену нет запланированных проверок</div>';
  } else {
    const th = groups.map(g => `<th>${escapeHtml(g.part || 'Линия')}</th>`).join('');
    const cell = (fn) => groups.map(g => `<td>${fn(g)}</td>`).join('');
    const pctOf = g => g.planned ? Math.round(g.done / g.planned * 100) : 0;
    const open = groups.flatMap(g => g.items.map(it => ({ ...it, part: g.part })));
    $('#clBoardBody').innerHTML = `
      <table class="clb-table">
        <thead><tr><th></th>${th}</tr></thead>
        <tbody>
          <tr><td>Отклонения, шт.</td>${cell(g => `<b class="${g.fail ? 'clb-bad' : 'clb-good'}">${g.fail}</b>`)}</tr>
          <tr><td>Выполнение, %</td>${cell(g => `<b>${pctOf(g)}%</b> <span class="clb-dim">${g.done}/${g.planned}</span>`)}</tr>
          <tr><td>Время проверок, мин</td>${cell(g => `<b>${clBoardMin(g.doneSec)}</b> <span class="clb-dim">из ${clBoardMin(g.planSec)}</span>`)}</tr>
        </tbody>
      </table>
      ${open.length ? `<div class="clb-open-title">Что осталось или с отклонением</div>
        <ul class="clb-open">${open.map(it => `<li class="${it.status === 'FAIL' ? 'clb-bad' : ''}">${it.part ? escapeHtml(it.part) + ' · ' : ''}${escapeHtml(it.machine)}${it.machine ? ' · ' : ''}${it.opl ? escapeHtml(it.opl) + ' ' : ''}${escapeHtml(it.title)} <span class="clb-dim">— ${it.status === 'FAIL' ? 'не ОК' : (it.status === 'UNCHECKED' ? 'не проверено' : 'не выполнено')}</span></li>`).join('')}</ul>` : ''}`;
  }
  modal.dataset.copyText = clBoardText(groups);
  openModal(modal);
}

$('#clBoardBtn')?.addEventListener('click', () => openClBoardSummary());
$('#clBoardClose')?.addEventListener('click', () => closeModal('#clBoardModal'));
$('#clBoardPrintBtn')?.addEventListener('click', () => {
  const w = window.open('', '_blank', 'width=720,height=560');
  if (!w) { showToast('Браузер заблокировал окно печати', true); return; }
  w.document.write('<!doctype html><meta charset="utf-8"><title>Итог смены</title>'
    + '<style>body{font:14px Arial,sans-serif;padding:24px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #999;padding:8px;text-align:center}th:first-child,td:first-child{text-align:left}.clb-dim{color:#666;font-size:12px}</style>'
    + '<h2>Итог смены для доски</h2><p>' + escapeHtml($('#clBoardSub').textContent) + '</p>' + $('#clBoardBody').innerHTML);
  w.document.close();
  w.focus();
  w.print();
});
$('#clBoardCopyBtn')?.addEventListener('click', async () => {
  const text = $('#clBoardModal')?.dataset.copyText || '';
  try {
    await navigator.clipboard.writeText(text);
    showToast('Итог смены скопирован');
  } catch (e) {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); showToast('Итог смены скопирован'); }
    catch (err) { showToast('Не удалось скопировать', true); }
    ta.remove();
  }
});
