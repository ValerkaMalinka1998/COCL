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

/* Число из ввода: допускает запятую */
function qcNum(v) {
  return parseFloat(String(v || '').trim().replace(',', '.'));
}

/* Нормы полей ввода текущей проверки: [{ label, text, norm:{min,max}|null }] */
function getQcFields() {
  const row = quickCheckState.row;
  if (!row) return [];
  if (quickCheckState.isElec) {
    const values = Array.isArray(row.valuesByBrand) ? row.valuesByBrand : [];
    const brand = quickCheckState.brand;
    const entry = (brand && values.find(v => v.brand === brand)) || values[0] || null;
    const ct = migrateControlType(row.controlType, row.measurements);
    return [{ label: 'Значение', text: entry ? getEparamNormLabel(entry, ct) : '—', norm: getEparamNormRange(entry) }];
  }
  const points = getRowMeasurementBlock(row, quickCheckState.brand)?.points || [];
  return points.map((p, i) => ({ label: 'Т' + (i + 1), text: p.value || '—', norm: parseNorm(p.value) }));
}

/* Строки смены по порядку матрицы: запланированы на эту дату/смену;
   done — уже отмечены (черновик или история) */
function getQcQueue() {
  const { date, shift, shiftLetter } = quickCheckState;
  const day = new Date(date + 'T00:00:00').getDay();
  const rec = getHistory().find(h => h.mode === clRecordMode() && h.line === clState.line &&
    h.date === date && h.shift === shiftLetter);
  const ids = [...new Set([...$$('#clMatrixWrap tr.cil-row[data-row-id]')].map(r => r.dataset.rowId))];
  return ids.map(id => clState.rows.find(r => r.id === id)).filter(Boolean)
    .filter(r => (getClRowFreq(r).schedule || []).some(x => x.day === day && x.shift === shift))
    .map(r => ({
      row: r,
      done: !!clState.quickDraft[`${r.id}|${date}|${shift}`] ||
        !!(rec && (rec.items || []).some(it => it.standardId === r.id))
    }));
}

/* Следующая неотмеченная строка смены после текущей (по кругу) */
function getQcNext() {
  const q = getQcQueue();
  const i = q.findIndex(x => x.row.id === quickCheckState.row?.id);
  for (let k = 1; k < q.length; k++) {
    const x = q[(i + k + q.length) % q.length];
    if (!x.done) return x.row;
  }
  return null;
}

/* Прошлая проверка этой строки (до текущей смены) */
function getQcPrevious(row) {
  const { date, shiftLetter } = quickCheckState;
  const order = (d, letter) => `${d}|${getShiftsForDate(d).day === letter ? 0 : 1}`;
  const cur = order(date, shiftLetter);
  let best = null;
  getHistory().forEach(h => {
    if (h.mode !== clRecordMode() || h.line !== clState.line) return;
    const o = order(h.date, h.shift);
    if (o >= cur || (best && o <= best.o)) return;
    const it = (h.items || []).find(x => x.standardId === row.id);
    if (it && (it.status === 'OK' || it.status === 'FAIL')) best = { o, h, it };
  });
  if (!best) return null;
  const isDay = getShiftsForDate(best.h.date).day === best.h.shift;
  return {
    values: String(best.it.answer || '').split(',').map(s => s.trim()),
    status: best.it.status,
    label: `${fmtShortDate(best.h.date)} · ${isDay ? 'день' : 'ночь'} ${best.h.shift}`
  };
}

function openClCheckModal(rowId, dateStr, shift) {
  const modal = $('#quickCheckModal');
  if (!modal) return;

  const row = clState.rows.find(r => r.id === rowId);
  if (!row) return;

  const isElec = clState.mode === 'elec';
  const shiftLetter = getShiftsForDate(dateStr)[shift] || '—';
  const brand = clState.brand || '';
  const existing = findExistingCheck(rowId, dateStr, shiftLetter);
  const draft = clState.quickDraft[`${rowId}|${dateStr}|${shift}`] || null;

  Object.assign(quickCheckState, { row, date: dateStr, shift, shiftLetter, brand, existing, draft, isElec });

  // --- Шапка: машина · узел · часть, название, контекст смены ---
  const work = getClRowFreq(row).work === 'Stop' ? 'Stop' : 'Run';
  $('#qcMeta').innerHTML = [
    isElec ? '<span class="qcx-tag qcx-tag-el">E-Param</span>' : (row.oplNumber ? `<b>${escapeHtml(row.oplNumber)}</b>` : ''),
    escapeHtml(clState.line || ''),
    escapeHtml(row.machine || ''),
    isElec ? '' : escapeHtml(row.node || ''),
    escapeHtml(row.nodePart || ''),
    `<span class="qcx-tag qcx-tag-${work === 'Run' ? 'run' : 'stop'}">${work}</span>`
  ].filter(Boolean).join('<i>·</i>');
  $('#quickCheckModalTitle').textContent = isElec ? (row.paramName || '—') : (row.title || '—');

  // Место в очереди смены: «3 из 12 · осталось 5»
  const queue = getQcQueue();
  const pos = queue.findIndex(x => x.row.id === row.id);
  const left = queue.filter(x => !x.done && x.row.id !== row.id).length;
  $('#qcQueue').innerHTML = queue.length && pos >= 0
    ? `<b>${pos + 1}</b> из ${queue.length}<span>${left ? `осталось ${left}` : 'остальные отмечены'}</span>` : '';

  const freq = getClRowFreq(row);
  const tw = (freq.timeWindows || []).map(w => `${w.from}–${w.to}`).join(', ');
  $('#qcCtx').innerHTML = [
    `<span>${fmtISODate(dateStr)} · ${shift === 'day' ? 'День' : 'Ночь'} · смена ${escapeHtml(shiftLetter)}</span>`,
    tw ? `<span>время ${escapeHtml(tw)}</span>` : '',
    `<span class="${brand ? 'qcx-brand' : 'qcx-nobrand'}">${brand ? 'бренд ' + escapeHtml(brand) : 'бренд не задан'}</span>`
  ].filter(Boolean).join('');

  // --- Как проверять ---
  const how = isElec ? '' : (row.controlDescription || '').trim();
  const howBlock = $('#qcControlDescBlock');
  howBlock.style.display = how ? '' : 'none';
  howBlock.open = false;
  $('#qcControlDescBody').innerHTML = how
    ? how.split(/\n+/).map(l => `<p>${escapeHtml(l)}</p>`).join('') : '';

  // --- Ввод ---
  const controlType = migrateControlType(row.controlType, row.measurements);
  const hasPointsMech = !isElec && Array.isArray(row.measurements) &&
    row.measurements.some(b => b && Array.isArray(b.points) && b.points.length > 0);
  const isOkFail = controlType === 'fixed' && (isElec || !hasPointsMech);
  quickCheckState.isOkFail = isOkFail;

  $('#qcAnswerOkNotOk').style.display = isOkFail ? '' : 'none';
  $('#qcAnswerPoints').style.display = isOkFail ? 'none' : '';

  if (isOkFail) {
    const normText = (row.normText || '').trim();
    $('#qcNormText').innerHTML = normText
      ? `Норма: <b>${escapeHtml(normText)}</b>`
      : 'Проверка визуально — по описанию «Как проверять»';
    const prevOk = getQcPrevious(row);
    $('#qcPrevOk').innerHTML = prevOk
      ? `Прошлый раз (${escapeHtml(prevOk.label)}): <b class="${prevOk.status === 'OK' ? 'ok' : 'fail'}">${prevOk.status === 'OK' ? 'ОК' : 'Не ОК'}</b>` : '';
    const val = draft?.status || existing?.status || '';
    $('#qcAnswerOk').checked = val === 'OK';
    $('#qcAnswerFail').checked = val === 'FAIL';
    if (how) howBlock.open = true;
  } else {
    const fields = getQcFields();
    const saved = [];
    const src = draft?.answer || existing?.answer || '';
    String(src).split(',').forEach(v => saved.push(v.trim()));
    const prev = getQcPrevious(row);
    $('#qcPointsTitle').textContent = isElec ? 'Значение' : (fields.length > 1 ? `Точки замера · ${fields.length}` : 'Точка замера');
    $('#qcPointsList').innerHTML = fields.length ? fields.map((f, i) => `
      <label class="qcx-pt" data-index="${i}">
        <span class="qcx-pt-norm">${fields.length > 1 || !isElec ? `<b>${f.label}</b>` : ''}${escapeHtml(f.text)}<span class="qcx-pt-st" data-qc-status="${i}"></span></span>
        <input type="text" inputmode="decimal" autocomplete="off" class="qc-point-input" data-qc-point="${i}" value="${escapeAttr(saved[i] || '')}">
        ${f.norm ? `<span class="qcx-pt-range">${f.norm.min}…${f.norm.max}</span>` : ''}
        ${prev && prev.values[i] ? (() => {
          const pv = qcNum(prev.values[i]);
          const bad = f.norm && !isNaN(pv) && (pv < f.norm.min || pv > f.norm.max);
          return `<span class="qcx-pt-prev${bad ? ' is-bad' : ''}" title="Прошлая проверка: ${escapeAttr(prev.label)}">было ${escapeHtml(prev.values[i])}</span>`;
        })() : ''}
      </label>`).join('')
      : '<div class="qcx-empty">Точки не заданы в стандарте</div>';
    $('#qcPointsList').classList.toggle('qcx-pts-one', fields.length === 1);
    $('#qcPrevLabel').textContent = prev ? `«было» — ${prev.label}` : '';
  }

  $('#qcComment').value = draft?.comment || existing?.comment || '';

  // --- Уже проверено ---
  const infoEl = $('#qcExistingInfo');
  infoEl.style.display = existing ? '' : 'none';
  if (existing) {
    $('#qcExistingStatus').textContent =
      existing.status === 'OK' ? 'ОК' : existing.status === 'FAIL' ? 'Не ОК' : 'не проверено';
  }

  updateQcResult();
  openModal(modal);

  const nextBtn = $('#quickCheckNextBtn');
  if (nextBtn) nextBtn.style.display = getQcNext() ? '' : 'none';

  const btn = $('#qcOpenStandardBtn');
  btn.style.display = isElec ? 'none' : '';
  btn.onclick = () => openStandardView(row.id, { brand: quickCheckState.brand || '' });

  setTimeout(() => {
    const first = [...$$('#qcPointsList .qc-point-input')].find(i => !i.value) || $('#qcPointsList .qc-point-input');
    first?.focus();
  }, 60);
}

/* Подсветка полей и итог над ними: «Все в норме» / «N не в норме» / «Заполнено N из M» */
function updateQcResult() {
  const fields = getQcFields();
  let filled = 0, fails = 0;
  $$('#qcPointsList .qcx-pt').forEach(cell => {
    const i = +cell.dataset.index;
    const inp = cell.querySelector('input');
    const st = cell.querySelector('[data-qc-status]');
    cell.classList.remove('is-ok', 'is-fail');
    st.textContent = '';
    if (inp.value.trim() === '') return;
    filled++;
    const v = qcNum(inp.value);
    const norm = fields[i] && fields[i].norm;
    if (isNaN(v) || !norm) return;
    const ok = v >= norm.min && v <= norm.max;
    if (!ok) fails++;
    cell.classList.add(ok ? 'is-ok' : 'is-fail');
    st.textContent = ok ? '✓' : '✕';
  });

  let isFail = false;
  const res = $('#qcResult');
  if (quickCheckState.isOkFail) {
    isFail = $('#qcAnswerFail')?.checked;
  } else if (res) {
    const total = fields.length;
    isFail = fails > 0;
    res.className = 'qcx-result';
    if (!total) res.textContent = '';
    else if (fails) { res.textContent = `✕ ${fails} не в норме`; res.classList.add('is-fail'); }
    else if (filled === total) { res.textContent = '✓ всё в норме'; res.classList.add('is-ok'); }
    else res.textContent = `заполнено ${filled} из ${total}`;
  }

  // При отклонении комментарий важен
  $('#qcCommentWrap')?.classList.toggle('is-needed', !!isFail);
  const hint = $('#qcCommentHint');
  if (hint) hint.textContent = isFail ? '— опишите отклонение' : '— по желанию';
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

function saveQuickCheck(goNext) {
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
    const num = qcNum(inp.value);
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
      const num = qcNum(v);
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
  const next = goNext ? getQcNext() : null;
  const { date: d, shift: s } = quickCheckState;
  closeQuickCheckModal();
  if (next) {
    openClCheckModal(next.id, d, s);
  } else {
    showToast(goNext ? 'Отметка сохранена — все проверки смены отмечены' : 'Отметка сохранена');
  }
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

/* --- Ввод значений: подсветка, Enter — следующее поле / сохранить --- */
document.addEventListener('input', (e) => {
  if (e.target.closest('#quickCheckModal .qc-point-input')) updateQcResult();
});
document.addEventListener('change', (e) => {
  if (e.target.name === 'qc_answer') updateQcResult();
});
document.addEventListener('keydown', (e) => {
  const inp = e.target.closest && e.target.closest('#quickCheckModal .qc-point-input');
  if (!inp || e.key !== 'Enter') return;
  e.preventDefault();
  const all = [...$$('#qcPointsList .qc-point-input')];
  const next = all[all.indexOf(inp) + 1];
  if (next) next.focus();
  else saveQuickCheck(!!getQcNext());
});

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
  if (e.target.closest('#quickCheckNextBtn')) {
    saveQuickCheck(true);
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
