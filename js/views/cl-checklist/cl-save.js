/* ============================================================
   ВКЛАДКА «Чек-лист CL»: сохранение в историю
   Модуль общего пространства имён: функции и переменные видны
   во всех файлах. Порядок подключения — index.html.
   ============================================================ */

/* ============================================================
   CL Electronic: сохранение проверки (кнопка «Зафиксировать»)
   ============================================================ */
$('#elecSaveCheckBtn')?.addEventListener('click', () => {
  const operator = ($('#elecOperator')?.value || '').trim();
  const line = elecState.line;
  const date = elecState.date;
  const shift = elecState.shift;
  const brand = elecState.brand;

  if (!line)     return showToast('Выберите линию', true);
  if (!brand)    return showToast('Бренд не определён', true);

  const items = [];

  $$('#elecChecklistContainer .elec-acc-item').forEach(item => {
    const it = elecState.items.find(x => x.id === item.dataset.elecId);
    if (!it) return;

    let answer = '—';
    let status = 'UNCHECKED';
    let value = null;

    if (it.controlType === 'fixed') {
      const r = item.querySelector('input[data-elec-ans]:checked');
      if (r) {
        answer = r.value === 'OK' ? 'ОК' : 'Не ОК';
        status = r.value;
      }
    } else {
      const inp = item.querySelector('input[data-elec-value]');
      if (inp && inp.value !== '') {
        value = parseFloat(inp.value);
        if (!isNaN(value)) {
          const min = it.target - it.tolerance;
          const max = it.target + it.tolerance;
          const inRange = value >= min && value <= max;
          answer = `${value}`;
          status = inRange ? 'OK' : 'FAIL';
        }
      }
    }

    items.push({
      standardId: it.id,
      machine: it.machine,
      paramName: it.paramName,
      work: it.work,
      timeFrom: it.timeFrom,
      timeTo: it.timeTo,
      controlType: it.controlType,
      target: it.target,
      tolerance: it.tolerance,
      normText: it.normText,
      answer,
      value,
      status,
      comment: item.dataset.comment || ''
    });
  });

  const checkedCount = items.filter(it => it.status !== 'UNCHECKED').length;

  const record = {
    id: uid(),
    timestamp: new Date().toISOString(),
    mode: 'electronic',
    operator,
    line,
    shift,
    date,
    brandPlanned: elecState.brandPlanned || null,
    brandActual: brand,
    brandReason: elecState.brandReason || '',
    items
  };

  const hist = getHistory();
  hist.push(record);
  setHistory(hist);
  updateNavHistoryCounter();

  showToast(checkedCount === 0 ? 'Проверка сохранена (все пункты — «Не проверено»)' : 'Проверка сохранена');

  renderElectronicSummary(record);
});

/**
 * Норма для отображения в модалке просмотра записи.
 * Для CL Electronic — из norm или normText.
 * Для COCL — из блока точек (по бренду или все).
 */
/**
 * Определяет, является ли запись проверкой «ОК / Не ОК» (без ввода значения).
 */
function isOkNotOkRecord(it) {
  if (it.controlType === 'ok_not_ok') return true;
  if (it.controlType === 'fixed') {
    const a = String(it.answer || '').trim();
    // «Фиксированный» бывает двух видов: ОК/Не ОК (answer = «ОК»/«Не ОК»)
    // или точное значение (answer = число). Различаем по тексту ответа.
    return a === 'ОК' || a === 'Не ОК' || a === '';
  }
  return false;
}

function renderRecordNorm(it, isElec) {
  if (isElec) {
    return escapeHtml(it.norm || '—');
  }

  // COCL: собираем нормы всех точек
  const st = getStandards().find(s => s.id === it.standardId);
  if (!st) return escapeHtml(it.norm || '—');

  const blocks = Array.isArray(st.measurements) ? st.measurements : [];
  if (!blocks.length) return '—';

  // Выбираем блок: если запись содержит brandTo — ищем по нему, иначе первый
  const brandTo = it.brandTo || it.brandActual || '';
  let block = null;
  if (brandTo) {
    block = blocks.find(b => b.brand === brandTo);
  }
  if (!block) block = blocks[0];

  const points = Array.isArray(block.points) ? block.points : [];
  if (!points.length) return '—';

  return points.map(p => escapeHtml(p.value || '—')).join(' · ');
}

/**
 * Ответ для отображения в модалке просмотра записи.
 */
function renderRecordAnswer(it, isElec) {
  // Для CL Electronic — текущая логика
  if (isElec) {
    if (it.status === 'UNCHECKED') {
      return '<span class="status-badge status-unchecked">Не проверено</span>';
    }
    if (it.controlType === 'ok_not_ok' || isOkNotOkRecord(it)) {
      return it.status === 'OK'
        ? '<span class="status-badge status-ok">ОК</span>'
        : '<span class="status-badge status-fail">Не ОК</span>';
    }
    let statusLabel = 'ОК';
    let statusCls = 'status-ok';
    if (it.status === 'FAIL') {
      statusLabel = 'Не в допуске';
      statusCls = 'status-fail';
    }
    return `<span class="status-badge ${statusCls}">${statusLabel}</span>
      <span class="record-answer-value">${escapeHtml(it.answer || '—')}</span>`;
  }

  // COCL / TOP Losses
  if (it.status === 'UNCHECKED') {
    return '<span class="status-badge status-unchecked">Не проверено</span>';
  }

  if (it.controlType === 'ok_not_ok' || isOkNotOkRecord(it)) {
    return it.status === 'OK'
      ? '<span class="status-badge status-ok">ОК</span>'
      : '<span class="status-badge status-fail">Не ОК</span>';
  }

  // value_input / range_input / variable / interval — ответ = список значений
  const values = String(it.answer || '').split(',').map(v => v.trim()).filter(Boolean);
  const statusCls = it.status === 'FAIL' ? 'status-fail' : 'status-ok';
  const statusLabel = it.status === 'FAIL' ? 'Есть отклонения' : 'В норме';

  return `<span class="status-badge ${statusCls}">${statusLabel}</span>
    <span class="record-answer-value">${values.map(v => escapeHtml(v)).join(' · ')}</span>`;
}

function closeRecordModal() {
  closeModal('#recordModal');
  currentRecord = null;
}

$('#recordModalClose').addEventListener('click', closeRecordModal);
$('#recordCloseBtn').addEventListener('click', closeRecordModal);
$('#recordModal').addEventListener('click', (e) => {
  if (e.target.id === 'recordModal') closeRecordModal();
});

$('#recordPrintBtn').addEventListener('click', () => {
  window.print();
});
