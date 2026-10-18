/* ============================================================
   ВКЛАДКА «Чек-лист CL»: быстрая проверка
   #quickCheckModal.
   Модуль общего пространства имён: функции и переменные видны
   во всех файлах. Порядок подключения — index.html.
   ============================================================ */

/* ============================================================
   БЫСТРАЯ ПРОВЕРКА — состояние и открытие
   ============================================================ */

const quickCheckState = {
  row: null,
  date: '',
  shift: '',
  shiftLetter: '—',
  brand: '',
  existing: null,
  draft: null
};

function openClCheckModal(rowId, dateStr, shift) {
  const modal = $('#quickCheckModal');
  if (!modal) return;

  const row = clState.rows.find(r => r.id === rowId);
  if (!row) return;

  const isElec = clState.mode === 'elec';

  const shiftLetter = getShiftsForDate(dateStr)[shift] || '—';
  const brand = clState.brand || '';

  const existing = findExistingCheck(rowId, dateStr, shiftLetter);
  const draftKey = `${rowId}|${dateStr}|${shift}`;
  const draft = clState.quickDraft[draftKey] || null;

  quickCheckState.row = row;
  quickCheckState.date = dateStr;
  quickCheckState.shift = shift;
  quickCheckState.shiftLetter = shiftLetter;
  quickCheckState.brand = brand;
  quickCheckState.existing = existing;
  quickCheckState.draft = draft;
  quickCheckState.isElec = isElec;

  $('#quickCheckModalTitle').textContent = isElec ? 'Проверка CL (E-Param)' : 'Проверка CL';

  const line = clState.line || '';
  const machine = row.machine || '';
  $('#qcMachine').textContent = line + (machine ? ' · ' + machine : '');
  $('#qcParamName').textContent = isElec ? (row.paramName || '—') : (row.title || '—');
  $('#qcNode').textContent = isElec ? '—' : (row.node || '—');

  const timeFrom = row.timeFrom || '';
  const timeTo = row.timeTo || '';
  $('#qcTime').textContent = (timeFrom && timeTo) ? `${timeFrom}–${timeTo}` : '—';

  const workEl = $('#qcWork');
  const workVal = getClRowFreq(row).work === 'Stop' ? 'Stop' : 'Run';
  workEl.textContent = workVal;
  workEl.className = 'qc-work-badge ' + (workVal === 'Run' ? 'qc-work-run' : 'qc-work-stop');

  const shiftLabel = shift === 'day' ? 'День' : 'Ночь';
  $('#qcDateShift').textContent = `${fmtISODate(dateStr)} · ${shiftLabel} · ${shiftLetter}`;

  $('#qcBrand').textContent = brand || '— не задан —';

  const controlType = migrateControlType(row.controlType, row.measurements);
  const hasPointsMech = !isElec &&
    Array.isArray(row.measurements) &&
    row.measurements.some(b => b && Array.isArray(b.points) && b.points.length > 0);

  // --- Описание контроля (только для механики) ---
  const ctrlDescBlock = $('#qcControlDescBlock');
  const ctrlDescBody = $('#qcControlDescBody');
  const ctrlDescHint = $('#qcControlDescHint');
  const ctrlDescText = isElec ? '' : (row.controlDescription || '').trim();

  if (ctrlDescBlock && ctrlDescBody) {
    if (ctrlDescText) {
      ctrlDescBlock.style.display = 'block';
      ctrlDescBody.innerHTML = `<div class="qc-control-text">${escapeHtml(ctrlDescText).replace(/\n/g, '<br>')}</div>`;
      if (ctrlDescHint) {
        ctrlDescHint.textContent = ctrlDescText.length > 60
          ? ctrlDescText.substring(0, 60) + '…'
          : ctrlDescText;
      }
      ctrlDescBlock.classList.remove('expanded');
    } else {
      ctrlDescBlock.style.display = 'none';
    }
  }

  const normBlock = $('#qcNormBlock');
  const okBlock = $('#qcAnswerOkNotOk');
  const pointsBlock = $('#qcAnswerPoints');

  if (controlType === 'fixed' && (isElec || !hasPointsMech)) {
    // --- Фиксированный без точек → ОК / Не ОК ---
    normBlock.style.display = 'block';
    const normText = isElec
      ? ((row.normText || '').trim() || '— проверить визуально —')
      : ((row.normText || '').trim() || (row.controlDescription || '').trim() || '— проверить визуально —');
    $('#qcNormValue').textContent = normText;

    okBlock.style.display = 'block';
    pointsBlock.style.display = 'none';

    const existingVal = draft?.status || existing?.status || '';
    $('#qcAnswerOk').checked = existingVal === 'OK';
    $('#qcAnswerFail').checked = existingVal === 'FAIL';
  } else if (isElec && (controlType === 'variable' || controlType === 'interval')) {
    // --- Электронный числовой параметр ---
    const values = Array.isArray(row.valuesByBrand) ? row.valuesByBrand : [];
    // Ищем значение для выбранного бренда, иначе первое
    let entry = brand ? values.find(v => v.brand === brand) : null;
    if (!entry && values.length) entry = values[0];

    normBlock.style.display = 'block';
    okBlock.style.display = 'none';
    pointsBlock.style.display = 'block';

    $('#qcNormValue').textContent = getEparamNormLabel(entry, controlType);

    // Показываем одно поле ввода значения
    const pointsList = $('#qcPointsList');
    if (pointsList) {
      const savedValue = draft?.answer || existing?.answer || '';
      pointsList.innerHTML = `
        <div class="qc-point-row" data-index="0">
          <div class="qc-point-head">
            <span class="qc-point-num">Значение</span>
            <span class="qc-point-norm">${entry ? `${entry.target} ± ${entry.tolerance}` : '—'}</span>
          </div>
          <div class="qc-point-input-wrap">
            <input type="number" step="any" class="qc-point-input" data-qc-point="0"
                   value="${escapeAttr(savedValue)}" placeholder="0">
          </div>
        </div>
      `;
    }
  } else {
    // --- Мех. точки замера (value_input / range_input) ---
    const block = getRowMeasurementBlock(row, brand);
    normBlock.style.display = 'block';
    okBlock.style.display = 'none';
    pointsBlock.style.display = 'block';

    const points = block?.points || [];
    const normText = points.map((p, i) => `Т${i + 1}: ${p.value || '—'}`).join(' · ');
    $('#qcNormValue').textContent = normText || '— точки не заданы —';

    renderQcPointsList(points, existing, draft);
  }

  $('#qcComment').value = draft?.comment || existing?.comment || '';

  const infoEl = $('#qcExistingInfo');
  if (existing) {
    infoEl.style.display = 'flex';
    $('#qcExistingStatus').textContent =
      existing.status === 'OK' ? 'ОК' :
      existing.status === 'FAIL' ? 'Не ОК' : 'Не проверено';
  } else {
    infoEl.style.display = 'none';
  }

  openModal(modal);

  const openStdBtn = $('#qcOpenStandardBtn');
  if (openStdBtn) {
    openStdBtn.disabled = !isElec && !row.id;
    openStdBtn.onclick = () => {
      if (!isElec && typeof openStandardView === 'function') {
        openStandardView(row.id, { brand: quickCheckState.brand || '' });
      } else {
        showToast('Полный просмотр доступен только для механических стандартов', true);
      }
    };
  }
}

/* ============================================================
   БЫСТРАЯ ПРОВЕРКА — закрытие
   ============================================================ */

function closeQuickCheckModal() {
  closeModal('#quickCheckModal');
  quickCheckState.row = null;
  quickCheckState.existing = null;
  quickCheckState.draft = null;
}

/* ============================================================
   БЫСТРАЯ ПРОВЕРКА — сохранение
   ============================================================ */

function saveQuickCheck() {
  const row = quickCheckState.row;
  if (!row) {
    showToast('Ошибка: стандарт не найден', true);
    return;
  }

  const isElec = quickCheckState.isElec === true;
  const date = quickCheckState.date;
  const shift = quickCheckState.shift;
  const brand = quickCheckState.brand || '';
  const controlType = migrateControlType(row.controlType, row.measurements);
  const hasPointsMech = !isElec &&
    Array.isArray(row.measurements) &&
    row.measurements.some(b => b && Array.isArray(b.points) && b.points.length > 0);
  const comment = ($('#qcComment')?.value || '').trim();

  let status = 'UNCHECKED';
  let answer = '';
  let value = null;

  if (controlType === 'fixed' && (isElec || !hasPointsMech)) {
    const r = document.querySelector('input[name="qc_answer"]:checked');
    if (!r) {
      showToast('Выберите ОК или Не ОК', true);
      return;
    }
    status = r.value === 'OK' ? 'OK' : 'FAIL';
    answer = r.value === 'OK' ? 'ОК' : 'Не ОК';
  } else if (isElec) {
    // --- E-Param: одно числовое значение ---
    const inp = document.querySelector('.qc-point-input');
    if (!inp || inp.value === '') {
      showToast('Введите значение', true);
      return;
    }
    const num = parseFloat(inp.value);
    if (isNaN(num)) {
      showToast('Введите число', true);
      return;
    }

    // Ищем target/tolerance для бренда
    const values = Array.isArray(row.valuesByBrand) ? row.valuesByBrand : [];
    let entry = brand ? values.find(v => v.brand === brand) : null;
    if (!entry && values.length) entry = values[0];

    let inRange = true;
    const range = getEparamNormRange(entry);
    if (range) inRange = num >= range.min && num <= range.max;

    status = inRange ? 'OK' : 'FAIL';
    answer = String(num);
    value = num;
  } else {
    // --- Мех: точки замера ---
    const inputs = document.querySelectorAll('.qc-point-input');
    if (!inputs.length) {
      showToast('Не найдены поля ввода точек', true);
      return;
    }

    const block = getRowMeasurementBlock(row, brand);
    const points = block?.points || [];

    const values = [];
    let anyFail = false;
    let allFilled = true;

    inputs.forEach(inp => {
      const idx = parseInt(inp.dataset.qcPoint, 10);
      const v = (inp.value || '').trim();
      if (v === '') { allFilled = false; values.push(''); return; }
      const num = parseFloat(v);
      values.push(isNaN(num) ? v : String(num));
      const norm = parseNorm(points[idx]?.value);
      if (norm && !isNaN(num) && (num < norm.min || num > norm.max)) anyFail = true;
    });

    if (!allFilled) {
      showToast('Заполните все точки', true);
      return;
    }

    status = anyFail ? 'FAIL' : 'OK';
    answer = values.join(', ');
    value = values.length === 1 ? parseFloat(values[0]) : null;
  }

  const key = `${row.id}|${date}|${shift}`;
  clState.quickDraft[key] = { status, answer, value, comment };

  renderClMatrix();
  closeQuickCheckModal();
  showToast('Отметка сохранена');
}

/* ============================================================
   БЫСТРАЯ ПРОВЕРКА — хелперы
   ============================================================ */

function getRowMeasurementBlock(row, brand) {
  const measurements = Array.isArray(row.measurements) ? row.measurements : [];
  if (!measurements.length) return null;
  if (brand) {
    const b = measurements.find(x => x.brand === brand);
    if (b) return b;
  }
  return measurements.find(x => !x.brand) || measurements[0];
}

function renderQcPointsList(points, existing, draft) {
  const list = $('#qcPointsList');
  if (!list) return;

  if (!points.length) {
    list.innerHTML = '<div class="empty-state" style="padding:12px">Точки не заданы</div>';
    return;
  }

  const savedValues = [];
  if (draft?.value != null && draft.value !== '') {
    savedValues.push(String(draft.value));
  }
  if (existing?.answer) {
    String(existing.answer).split(',').forEach(v => savedValues.push(v.trim()));
  }

  list.innerHTML = points.map((p, i) => {
    const norm = parseNorm(p.value);
    const normStr = norm ? `[${norm.min}…${norm.max}]` : '';
    const value = savedValues[i] || '';

    return `
      <div class="qc-point-row" data-index="${i}">
        <div class="qc-point-head">
          <span class="qc-point-num">Т${i + 1}</span>
          <span class="qc-point-norm">${escapeHtml(p.value || '—')}</span>
          ${normStr ? `<span class="qc-point-range">${escapeHtml(normStr)}</span>` : ''}
          <span class="qc-point-status" data-qc-status="${i}"></span>
        </div>
        <div class="qc-point-input-wrap">
          <input type="number" step="any" class="qc-point-input" data-qc-point="${i}"
                 value="${escapeAttr(value)}" placeholder="0">
        </div>
      </div>
    `;
  }).join('');

  list.querySelectorAll('.qc-point-input').forEach(inp => {
    updateQcPointStatus(inp);
    inp.addEventListener('input', () => updateQcPointStatus(inp));
  });
}

function updateQcPointStatus(inp) {
  const row = inp.closest('.qc-point-row');
  if (!row) return;
  const idx = parseInt(row.dataset.index, 10);
  const statusEl = row.querySelector('[data-qc-status]');
  const points = getRowMeasurementBlock(quickCheckState.row, quickCheckState.brand)?.points || [];
  const norm = parseNorm(points[idx]?.value);

  row.classList.remove('qc-point-ok', 'qc-point-fail');
  if (statusEl) { statusEl.textContent = ''; statusEl.className = 'qc-point-status'; }

  if (inp.value === '') return;
  const v = parseFloat(inp.value);
  if (isNaN(v)) return;
  if (!norm) return;

  const inRange = v >= norm.min && v <= norm.max;
  row.classList.add(inRange ? 'qc-point-ok' : 'qc-point-fail');
  if (statusEl) {
    statusEl.textContent = inRange ? '✓' : '✕';
    statusEl.className = 'qc-point-status ' + (inRange ? 'ok' : 'fail');
  }
}
/* --- Быстрая проверка: обработчики через делегирование --- */
/* Работает всегда, даже если модалка пересоздана */
document.addEventListener('click', (e) => {
  if (e.target.closest('#quickCheckModalClose')) {
    closeQuickCheckModal();
    return;
  }
  if (e.target.closest('#quickCheckCancelBtn')) {
    closeQuickCheckModal();
    return;
  }
  if (e.target.closest('#quickCheckSaveBtn')) {
    saveQuickCheck();
    return;
  }
  // Клик по фону модалки
  if (e.target.id === 'quickCheckModal') {
    closeQuickCheckModal();
  }
});

/* Модалка комментария — переиспользуем существующую, но в неё надо передать dataset.comment */
function openCommentModalElec(item) {
  currentCommentItem = item;
  const it = elecState.items.find(x => x.id === item.dataset.elecId);
  $('#commentModalPoint').textContent = it
    ? `${it.machine || ''} · ${it.paramName || ''}`
    : '';
  $('#commentText').value = item.dataset.comment || '';
  openModal('#commentModal');
  setTimeout(() => $('#commentText').focus(), 100);
}

/* Модалка override бренда */
window.openElecBrandOverrideDialog = function() {
  const brands = getBrandsForLine(elecState.line);
  if (!brands.length) return showToast('На линии нет брендов', true);

  const brandList = brands.map(b => `${b}`).join(', ');
  const current = elecState.brand || '';
  const newBrand = prompt(`Бренд на ${fmtISODate(elecState.date)}\nДоступные: ${brandList}`, current);
  if (newBrand === null) return;
  const trimmed = newBrand.trim();
  if (!trimmed) return;
  if (!brands.includes(trimmed)) {
    return showToast('Бренд не найден на линии', true);
  }
  if (trimmed === elecState.brand) return; // без изменений

  const reason = prompt('Причина изменения (кратко):', '') || '';
  elecState.brand = trimmed;
  elecState.brandReason = reason.trim();

  refreshElectronicTab();
};

/* Канонические категории Top Losses — у каждого цеха свой набор */
const TOP_LOSS_CATEGORY_NAMES = ['Увеличенные остановки', 'Дефекты по качеству', 'Повышенные выбросы'];
