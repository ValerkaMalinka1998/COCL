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

/* Чьи значения проверяем для текущего бренда (см. pickBrandValues) */
function getQcBrandPick() {
  const row = quickCheckState.row;
  if (!row) return { item: null, kind: 'none' };
  const ms = (Array.isArray(row.measurements) ? row.measurements : [])
    .filter(b => (b.points || []).some(p => String(p && p.value != null ? p.value : '').trim()));
  return pickBrandValues(ms, quickCheckState.brand);
}

/* Нормы полей ввода текущей проверки: [{ label, text, norm:{min,max}|null }] */
function getQcFields() {
  const row = quickCheckState.row;
  if (!row) return [];
  const points = getRowMeasurementBlock(row, quickCheckState.brand)?.points || [];
  // Точка без числа (метка словами, isNormMark) — ОК / Не ОК; допустима в любом
  // типе контроля, числовые точки проверяются по норме
  return points.map((p, i) => {
    const mark = qcIsMark(p.value);
    return { label: 'Т' + (i + 1), text: p.value || '—', norm: mark ? null : parseNorm(p.value), mark };
  });
}

/* Точка проверяется кнопками ОК / Не ОК: метка словами или без числовой нормы */
function qcIsMark(value) {
  return isNormMark(value) || !parseNorm(value);
}

/* Строки смены по порядку матрицы: запланированы на эту дату/смену;
   done — уже отмечены (черновик или история) */
function getQcQueue() {
  const { date, shift, shiftLetter } = quickCheckState;
  const day = new Date(date + 'T00:00:00').getDay();
  const rec = getHistory().find(h => h.mode === clRecordMode() && h.line === clState.line &&
    h.date === date && h.shift === shiftLetter);
  const ids = [...new Set([...$$('#clMatrixWrap tr.cil-row[data-row-id]')].map(r => r.dataset.rowId))];
  // Долги «с прошлых смен» — первыми
  const debtIds = new Set([...$$(`#clMatrixWrap .cil-cell-debt[data-date="${date}"][data-shift="${shift}"]`)].map(b => b.dataset.rowId));
  return ids.map(id => clState.rows.find(r => r.id === id)).filter(Boolean)
    .filter(r => debtIds.has(r.id) || (getClRowFreq(r).schedule || []).some(x => x.day === day && x.shift === shift))
    .sort((a, b) => debtIds.has(b.id) - debtIds.has(a.id))
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
  const work = normWork(getClRowFreq(row).work);
  $('#qcMeta').innerHTML = [
    isElec ? '<span class="qcx-tag qcx-tag-el">E-Param</span>' : (row.oplNumber ? `<b>${escapeHtml(row.oplNumber)}</b>` : ''),
    escapeHtml(clState.line || ''),
    escapeHtml(row.machine || ''),
    isElec ? '' : escapeHtml(row.node || ''),
    escapeHtml(row.nodePart || ''),
    `<span class="qcx-tag qcx-tag-${work.toLowerCase()}">${work}</span>`
  ].filter(Boolean).join('<i>·</i>');
  $('#quickCheckModalTitle').textContent = isElec ? (row.paramName || '—') : (row.title || '—');

  // Место в очереди смены: «3 из 12 · осталось 5»
  const queue = getQcQueue();
  const pos = queue.findIndex(x => x.row.id === row.id);
  const left = queue.filter(x => !x.done && x.row.id !== row.id).length;
  $('#qcQueue').innerHTML = queue.length && pos >= 0
    ? `<b>${pos + 1}</b> из ${queue.length}<span>${left ? `осталось ${left}` : 'остальные отмечены'}</span>` : '';

  const freq = getClRowFreq(row);
  const tw = (freq.timeWindows || []).filter(w => getTimeWindowShift(w.from) === shift).map(w => `${w.from}–${w.to}`).join(', ');
  $('#qcCtx').innerHTML = [
    `<span>${fmtISODate(dateStr)} · ${shift === 'day' ? 'День' : 'Ночь'} · смена ${escapeHtml(shiftLetter)}</span>`,
    tw ? `<span>время ${escapeHtml(tw)}</span>` : '',
    cilRowDurationSec(row) ? `<span>на проверку ${escapeHtml(formatSvDuration(cilRowDurationSec(row)))}</span>` : '',
    `<span class="${brand ? 'qcx-brand' : 'qcx-nobrand'}">${brand ? 'бренд ' + escapeHtml(brand) : 'бренд не задан'}</span>`,
    (() => {
      const pick = getQcBrandPick();
      return pick.kind === 'rest' ? '<span class="qcx-brand">значения: все бренды</span>' : '';
    })()
  ].filter(Boolean).join('');

  // --- Описание контроля ---
  // У E-Param «Что считается ОК»: при ОК/Не ОК текст уже в норме, поэтому здесь только для числовых точек
  const elecNumeric = isElec && (row.measurements || []).some(b => b && !pointsAreMarksOnly(b.points));
  const how = isElec ? (elecNumeric ? (row.normText || '').trim() : '') : (row.controlDescription || '').trim();
  $('#qcControlDescBlock summary').textContent = isElec ? 'Что считается «ОК»' : 'Описание контроля';
  const howBlock = $('#qcControlDescBlock');
  howBlock.style.display = how ? '' : 'none';
  howBlock.open = false;
  $('#qcControlDescBody').innerHTML = how
    ? how.split(/\n+/).map(l => `<p>${escapeHtml(l)}</p>`).join('') : '';

  // --- Ввод ---
  const controlType = migrateControlType(row.controlType, row.measurements);
  // Фиксированный без чисел в точках (пусто или метки текстом) — ОК / Не ОК
  const hasNumericMech = Array.isArray(row.measurements) &&
    row.measurements.some(b => b && !pointsAreMarksOnly(b.points));
  const isOkFail = controlType === 'fixed' && !hasNumericMech;
  quickCheckState.isOkFail = isOkFail;

  $('#qcAnswerOkNotOk').style.display = isOkFail ? '' : 'none';
  $('#qcAnswerPoints').style.display = isOkFail ? 'none' : '';

  if (isOkFail) {
    let normText = (row.normText || '').trim();
    if (!normText) {
      const withMarks = (row.measurements || []).filter(b => b && marksText(b.points));
      const mb = pickBrandValues(withMarks, brand).item;
      normText = mb ? marksText(mb.points) : '';
    }
    $('#qcNormText').innerHTML = normText
      ? `${isElec ? 'Норма' : 'Должно совпадать'}: <b>${escapeHtml(normText)}</b>`
      : 'Проверка визуально — по «Описанию контроля»';
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
    $('#qcPointsTitle').textContent = fields.length > 1 ? `Точки замера · ${fields.length}` : 'Точка замера';
    $('#qcPointsList').innerHTML = fields.length ? fields.map((f, i) => `
      <label class="qcx-pt${f.mark ? ' qcx-pt-mark' : ''}" data-index="${i}">
        <span class="qcx-pt-norm"><b>${f.label}</b>${escapeHtml(f.text)}<span class="qcx-pt-st" data-qc-status="${i}"></span></span>
        ${f.mark ? `<input type="hidden" class="qc-point-input" data-qc-point="${i}" value="${escapeAttr(saved[i] === 'ОК' || saved[i] === 'Не ОК' ? saved[i] : '')}">
        <span class="qcx-mark-btns">
          <button type="button" class="qcx-mark-btn qcx-mark-ok${saved[i] === 'ОК' ? ' on' : ''}" data-qc-mark="${i}" data-v="ОК">ОК</button>
          <button type="button" class="qcx-mark-btn qcx-mark-fail${saved[i] === 'Не ОК' ? ' on' : ''}" data-qc-mark="${i}" data-v="Не ОК">Не ОК</button>
        </span>`
        : `<input type="text" inputmode="decimal" autocomplete="off" class="qc-point-input" data-qc-point="${i}" value="${escapeAttr(saved[i] || '')}">`}
        ${f.norm && f.norm.min !== f.norm.max ? `<span class="qcx-pt-range">${f.norm.min}…${f.norm.max}</span>` : ''}
        ${prev && prev.values[i] ? (() => {
          const pv = qcNum(prev.values[i]);
          const bad = f.norm && !isNaN(pv) && (pv < f.norm.min || pv > f.norm.max);
          return `<span class="qcx-pt-prev${bad ? ' is-bad' : ''}" title="Прошлая проверка: ${escapeAttr(prev.label)}">было ${escapeHtml(prev.values[i])}</span>`;
        })() : ''}
      </label>`).join('')
      : (() => {
        const pick = getQcBrandPick();
        if (pick.kind === 'missing') return `<div class="qcx-empty qcx-miss">Для бренда <b>${escapeHtml(brand)}</b> в ${isElec ? 'параметре' : 'стандарте'} нет значений и нет строки «Все бренды». Сообщите аналитику или проверьте, верно ли указан бренд на линии.</div>`;
        if (pick.kind === 'nobrand') return '<div class="qcx-empty qcx-miss">Значения разные по брендам, а бренд на линии не задан. Укажите бренд в Чек-листе («Бренд на линии → изменить»).</div>';
        return '<div class="qcx-empty">Точки не заданы в стандарте</div>';
      })();
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

  // Допуск: пока нет ознакомления с актуальной редакцией — только плашка вместо ввода
  const ackKind = isElec ? 'elec' : 'mech';
  const ack = getStdAckStatus(ackKind, row.id);
  quickCheckState.gated = !isElec && ack.state !== 'ok';   // с E-Param не знакомятся
  modal.classList.toggle('qcx-gated', quickCheckState.gated);
  $('#qcAckGate').style.display = quickCheckState.gated ? '' : 'none';
  $('#qcAckGateTitle').textContent = ack.state === 'again' ? 'Стандарт изменён — ознакомьтесь повторно' : 'Сначала ознакомьтесь со стандартом';
  $('#qcAckGateChanges').innerHTML = ack.since.length && typeof stdAckChangesHtml === 'function' ? stdAckChangesHtml(ack.since) : '';
  $('#qcAckOpenBtn').style.display = isElec ? 'none' : '';
  openModal(modal);

  const nextBtn = $('#quickCheckNextBtn');
  if (nextBtn) nextBtn.style.display = getQcNext() ? '' : 'none';

  const btn = $('#qcOpenStandardBtn');
  btn.style.display = isElec ? 'none' : '';
  btn.onclick = () => openStandardView(row.id, { brand: quickCheckState.brand || '' });

  setTimeout(() => {
    const inputs = [...$$('#qcPointsList input.qc-point-input[type="text"]')];
    (inputs.find(i => !i.value) || inputs[0])?.focus();
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
    if (fields[i] && fields[i].mark) {
      const ok = inp.value === 'ОК';
      if (!ok) fails++;
      cell.classList.add(ok ? 'is-ok' : 'is-fail');
      st.textContent = ok ? '✓' : '✕';
      return;
    }
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

/* Точка-метка: кнопки ОК / Не ОК пишут ответ в скрытое поле точки */
document.addEventListener('click', (e) => {
  const btn = e.target.closest && e.target.closest('#qcPointsList [data-qc-mark]');
  if (!btn) return;
  e.preventDefault();
  const i = btn.dataset.qcMark;
  const inp = $(`#qcPointsList input[data-qc-point="${i}"]`);
  if (inp) inp.value = btn.dataset.v;
  $$(`#qcPointsList [data-qc-mark="${i}"]`).forEach(b => b.classList.toggle('on', b === btn));
  updateQcResult();
});

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
  if (quickCheckState.gated) return showToast('Сначала ознакомьтесь со стандартом', true);
  if (!row) {
    showToast('Ошибка: стандарт не найден', true);
    return;
  }

  const date = quickCheckState.date;
  const shift = quickCheckState.shift;
  const brand = quickCheckState.brand || '';
  const controlType = migrateControlType(row.controlType, row.measurements);
  const hasNumericMech = Array.isArray(row.measurements) &&
    row.measurements.some(b => b && !pointsAreMarksOnly(b.points));
  const comment = ($('#qcComment')?.value || '').trim();

  let status = 'UNCHECKED';
  let answer = '';
  let value = null;

  if (controlType === 'fixed' && !hasNumericMech) {
    const r = document.querySelector('input[name="qc_answer"]:checked');
    if (!r) {
      showToast('Выберите ОК или Не ОК', true);
      return;
    }
    status = r.value === 'OK' ? 'OK' : 'FAIL';
    answer = r.value === 'OK' ? 'ОК' : 'Не ОК';
  } else {
    // --- Точки замера (стандарт и E-Param) ---
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
      // Метка: ответ «ОК» / «Не ОК» как есть
      if (qcIsMark(points[idx]?.value)) {
        values.push(v);
        if (v === 'Не ОК') anyFail = true;
        return;
      }
      const num = qcNum(v);
      values.push(isNaN(num) ? v : String(num));
      const norm = parseNorm(points[idx]?.value);
      if (norm && !isNaN(num) && (num < norm.min || num > norm.max)) anyFail = true;
    });

    if (!allFilled) {
      showToast('Заполните все точки и отметьте метки ОК / Не ОК', true);
      return;
    }

    status = anyFail ? 'FAIL' : 'OK';
    answer = values.join(', ');
    value = values.length === 1 ? parseFloat(values[0]) : null;
  }

  const key = `${row.id}|${date}|${shift}`;
  clState.quickDraft[key] = { status, answer, value, comment };
  clFlashKey = key;

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
  const measurements = (Array.isArray(row.measurements) ? row.measurements : [])
    .filter(b => (b.points || []).some(p => String(p && p.value != null ? p.value : '').trim()));
  return pickBrandValues(measurements, brand).item;
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
  // Метки (скрытые поля) пропускаем — их отмечают кнопками ОК / Не ОК
  const all = [...$$('#qcPointsList input.qc-point-input[type="text"]')];
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

/* Канонические категории Top Losses — у каждого цеха свой набор */
const TOP_LOSS_CATEGORY_NAMES = ['Увеличенные остановки', 'Дефекты по качеству', 'Повышенные выбросы'];

/* Допуск к проверке: открыть стандарт / подтвердить ознакомление */
document.addEventListener('click', (e) => {
  const row = quickCheckState.row;
  if (!row) return;
  if (e.target.closest('#qcAckOpenBtn')) openStandardView(row.id, { brand: quickCheckState.brand || '' });
  if (e.target.closest('#qcAckConfirmBtn')) {
    addStdAck(quickCheckState.isElec ? 'elec' : 'mech', row.id);
    quickCheckState.gated = false;
    $('#quickCheckModal').classList.remove('qcx-gated');
    $('#qcAckGate').style.display = 'none';
    showToast('Вы ознакомлены');
    if (typeof updateNotifyBadge === 'function') updateNotifyBadge();
    renderClMatrix();
  }
});
