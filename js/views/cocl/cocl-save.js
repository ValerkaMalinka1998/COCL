/* ============================================================
   ВКЛАДКА «Проверка COCL»: сохранение
   Модуль общего пространства имён: функции и переменные видны
   во всех файлах. Порядок подключения — index.html.
   ============================================================ */

/* ============================================================
   СОХРАНЕНИЕ ПРОВЕРКИ
   ============================================================ */
$('#saveCheckBtn').addEventListener('click', () => {
  const line = $('#lineSelect').value;
  const part = $('#partSelect').value;
  const type = $('#transitionType').value;
  const brandFrom = $('#brandFrom').value;
  const brandTo = $('#brandTo').value;

  // ФИО и смена подставляются автоматически (автовход + смена из настроек)
  const period = getCurrentShiftPeriod();
  const operator = getCurrentUser() || '—';
  const shift = (getShiftsForDate(period.date) || {})[period.shiftType] || '—';

if (!line) return showToast('Укажите линию', true);
if (getWorkshopIdForLine(line) === 'smd' && !part) return showToast('Укажите часть линии', true);
if (!type) return showToast('Укажите тип перехода', true);

/* Бренды обязательны ТОЛЬКО для Change Over */
if (type === 'ChangeOver') {
  if (!brandFrom || !brandTo) return showToast('Укажите бренды', true);
  if (brandFrom === brandTo) {
    return showToast(`Бренд должен измениться: нельзя ${brandFrom} → ${brandTo}`, true);
  }
}

  const items = [];
  let hasEmpty = false;

  $$('#checklistContainer .cocl-acc-item').forEach(item => {
    const id = item.dataset.stdId;
    const st = getStandards().find(s => s.id === id);
    if (!st) return;

    let answer = '—';
    let status = 'UNCHECKED';

    const hasPoints = Array.isArray(st.measurements) &&
      st.measurements.some(b => b && Array.isArray(b.points) && b.points.length > 0);

    if (st.controlType === 'fixed' && !hasPoints) {
      const r = item.querySelector('input[data-ans]:checked');
      if (!r) { hasEmpty = true; return; }
      answer = r.value === 'OK' ? 'ОК' : 'Не ОК';
      status = r.value;

    } else {
      const cells = item.querySelectorAll('.checklist-point-cell');
      if (!cells.length) { hasEmpty = true; return; }

      const pointsData = [];
      let allFilled = true;
      let anyFail = false;

      cells.forEach(cell => {
        const inp = cell.querySelector('.checklist-point-input');
        const val = inp?.value.trim() || '';
        if (val === '') { allFilled = false; return; }

        const num = parseFloat(val);
        const normStr = cell.dataset.norm;
        let inRange = null;
        let norm = null;
        try { norm = normStr ? JSON.parse(normStr) : null; } catch(_) {}

        if (norm && !isNaN(num)) {
          inRange = num >= norm.min && num <= norm.max;
          if (!inRange) anyFail = true;
        }

        pointsData.push({ value: num, norm, inRange });
      });

      if (!allFilled) { hasEmpty = true; return; }

      status = anyFail ? 'FAIL' : 'OK';
      answer = pointsData.map(p => p.value).join(', ');
    }

    // Главное значение — первая точка первого блока
    const firstBlock = Array.isArray(st.measurements) && st.measurements[0];
    const mainValue = firstBlock && Array.isArray(firstBlock.points) && firstBlock.points[0]
      ? firstBlock.points[0].value || ''
      : '';

    items.push({
      standardId: st.id,
      number: st.number,
      oplNumber: st.oplNumber,
      machine: st.machine,
      node: st.node,
      nodePart: st.nodePart,
      title: st.title,
      controlType: st.controlType,
      norm: mainValue,
      answer: answer,
      status: status,
      comment: item.dataset.comment || ''
    });
  });

  if (hasEmpty) {
    return showToast('Заполните все пункты чек-листа', true);
  }

  const triggers = getSelectedTriggers();
  const record = {
    id: uid(),
    timestamp: new Date().toISOString(),
    operator, shift, line, part, type, brandFrom, brandTo,
    // Дата и тип смены определяются автоматически (ночь 21:00→09:00
    // относится к дате её начала — см. getCurrentShiftPeriod)
    date: period.date,
    shiftType: period.shiftType,
    triggers,
    items
  };

  const hist = getHistory();
  hist.push(record);
  setHistory(hist);
  updateNavHistoryCounter();

  showToast('Проверка сохранена');
  renderCoclSummary(record);
  showMachineJournalNotice(items.filter(it => it.status === 'FAIL'), { line, source: 'Проверка COCL' });
});

$('#resetCheckBtn').addEventListener('click', () => editChecklistConditions());

function resetCheckForm() {
  // Сброс полей
  $('#lineSelect').value = '';
  clearCoclLine();
  $('#partSelect').value = '';
  $('#transitionType').value = '';
  document.querySelectorAll('.type-option').forEach(b => b.classList.remove('active'));
  $('#brandFrom').value = '';
  $('#brandTo').value = '';

  // Сброс внутренностей
  $('#checklistContainer').innerHTML = '';
  $('#changesContainer').innerHTML = '';

  // Сброс прогресса
  $('#progressBadge').textContent = '';
  $('#progressWrap').style.display = 'none';
  $('#progressText').style.display = 'none';
  $('#progressBarInner').style.width = '0%';
  $('#progressPercent').textContent = '0%';

  // Скрыть экран резюме
  const summary = $('#coclSummaryView');
  if (summary) summary.style.display = 'none';

  // Снова экран условий
  coclState.checking = false;
  setCoclCheckingUi(false);
  $('#coclLayout').style.display = '';
  ['#brandsCard', '#changesCard'].forEach(sel => {
    const el = $(sel);
    if (el) el.style.display = 'none';
  });
  renderCoclLineContext('');
  renderCoclPartStep('');
  updateChecklist();
}
