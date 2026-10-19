/* ============================================================
   КОМПОНЕНТЫ: валидация нового стандарта / E-Param
   Блок в форме (флажок + срок), плашка с решением аналитика,
   метка для таблиц и чек-листа. Данные — js/data/standards.js.
   Модуль общего пространства имён. Порядок подключения — index.html.
   ============================================================ */

// Варианты срока в сменах (2 смены = сутки)
const VAL_SHIFT_OPTIONS = [14, 28, 42, 60];

function valShiftLabel(n) {
  return `${n} ${pluralRu(n, 'смена', 'смены', 'смен')}`;
}
function valPointLabel(date, shift) {
  return `${fmtShortDate(date)} ${shift === 'night' ? 'ночь' : 'день'}`;
}

/* Метка «Валидация до 02.11» / «срок истёк» для таблиц и чек-листа */
function valChipHtml(row) {
  const s = validationStatus(row);
  if (s !== 'active' && s !== 'overdue') return '';
  const until = fmtShortDate(row.validation.until);
  return s === 'overdue'
    ? `<span class="val-chip val-chip-over" title="Срок валидации истёк ${escapeAttr(until)} — нужно решение аналитика">Валидация · срок истёк</span>`
    : `<span class="val-chip" title="Временный: проверяется каждую смену до решения аналитика">Валидация · до ${escapeHtml(until)}</span>`;
}

/* Блок в форме: флажок «На валидации» и срок в сменах */
function valEditBlockHtml(row, isNew) {
  const v = row.validation;
  const decided = v && v.decidedAt;
  // Новый — по умолчанию на валидации; существующий — как есть
  const on = isNew ? (v ? !decided : true) : isOnValidation(row);
  const base = (v && !decided) ? v : makeValidation(VALIDATION_SHIFTS);
  const n = (v && !decided) ? validationShiftCount(v) : VALIDATION_SHIFTS;
  const opts = [...new Set([...VAL_SHIFT_OPTIONS, n])].sort((a, b) => a - b)
    .map(k => `<option value="${k}" ${k === n ? 'selected' : ''}>${valShiftLabel(k)} (${Math.round(k / 2)} ${pluralRu(Math.round(k / 2), 'сутки', 'суток', 'суток')})</option>`).join('');
  const end = valShiftFromIndex(valShiftIndex(base.from, base.fromShift) + n - 1);
  const was = decided
    ? `<div class="val-was">Валидация пройдена ${escapeHtml(fmtShortDate(v.decidedAt))} — ${v.result === 'rejected' ? 'отклонён' : 'утверждён'}.</div>` : '';
  return `
    <div class="sv-full-extra-block val-edit" data-val-from="${escapeAttr(base.from)}" data-val-from-shift="${escapeAttr(base.fromShift)}">
      <label class="val-toggle">
        <input type="checkbox" id="valOn" ${on ? 'checked' : ''}>
        <span><b>На валидации</b> — временный: сразу попадает в Расписание и Чек-лист CL последней строкой и проверяется каждую смену</span>
      </label>
      <div class="val-days" ${on ? '' : 'hidden'}>
        Срок <select id="valDays">${opts}</select>
        <span>с ${escapeHtml(valPointLabel(base.from, base.fromShift))} до <b id="valUntil">${escapeHtml(valPointLabel(end.date, end.shift))}</b>, потом — решение аналитика</span>
      </div>
      ${was}
    </div>`;
}

/* Прочитать блок формы → validation для сохранения */
function valReadEdit(prev) {
  const box = document.querySelector('.val-edit');
  if (!box) return prev || null;
  const on = $('#valOn')?.checked;
  const p = normalizeValidation(prev);
  if (!on) return p && p.decidedAt ? p : null;
  const n = parseInt($('#valDays')?.value, 10) || VALIDATION_SHIFTS;
  const from = p && !p.decidedAt ? p.from : box.dataset.valFrom;
  const fromShift = p && !p.decidedAt ? p.fromShift : (box.dataset.valFromShift || 'day');
  const end = valShiftFromIndex(valShiftIndex(from, fromShift) + n - 1);
  return { from, fromShift, until: end.date, untilShift: end.shift, decidedAt: '', decidedShift: '', result: '' };
}

document.addEventListener('change', (e) => {
  if (e.target.id === 'valOn') {
    const d = e.target.closest('.val-edit')?.querySelector('.val-days');
    if (d) d.hidden = !e.target.checked;
  }
  if (e.target.id === 'valDays') {
    const box = e.target.closest('.val-edit');
    const end = valShiftFromIndex(valShiftIndex(box.dataset.valFrom, box.dataset.valFromShift || 'day') + parseInt(e.target.value, 10) - 1);
    $('#valUntil').textContent = valPointLabel(end.date, end.shift);
  }
});

/* Сколько раз проверяли за период валидации и сколько отклонений */
function valCheckStats(row) {
  const v = row.validation;
  let n = 0, fail = 0;
  getHistory().forEach(h => {
    if (h.line !== row.line || h.date < v.from) return;
    (h.items || []).forEach(it => {
      if (it.standardId !== row.id) return;
      if (it.status === 'OK' || it.status === 'FAIL') n++;
      if (it.status === 'FAIL') fail++;
    });
  });
  return { n, fail };
}

/* Плашка на странице стандарта / параметра: статус и решение аналитика */
function valBannerHtml(row, kind) {
  const s = validationStatus(row);
  if (s === 'none') return '';
  const v = row.validation;
  if (s === 'approved' || s === 'rejected') {
    return `<div class="val-banner val-banner-done">
      <b>${s === 'approved' ? 'Утверждён' : 'Отклонён'} после валидации</b>
      <span>${fmtShortDate(v.from)} – ${fmtShortDate(v.decidedAt)}</span>
    </div>`;
  }
  const left = validationShiftsLeft(row);
  const st = valCheckStats(row);
  const id = escapeAttr(row.id);
  return `
    <div class="val-banner ${s === 'overdue' ? 'val-banner-over' : ''}">
      <div class="val-banner-main">
        <b>${s === 'overdue' ? 'Срок валидации истёк — нужно решение' : 'На валидации — временный'}</b>
        <span>с ${valPointLabel(v.from, v.fromShift)} до ${valPointLabel(v.until, v.untilShift)}${s === 'active' ? ` · осталось ${valShiftLabel(left)}` : ''}
          · проверок ${st.n}${st.fail ? `, <em>отклонений ${st.fail}</em>` : ''} · проверяется каждую смену</span>
      </div>
      <div class="val-banner-acts">
        <button type="button" class="btn btn-secondary btn-sm" data-val-act="extend" data-val-id="${id}" data-val-kind="${kind}" title="Продлить на 14 смен (7 суток)">+14 смен</button>
        <button type="button" class="btn btn-secondary btn-sm val-btn-reject" data-val-act="reject" data-val-id="${id}" data-val-kind="${kind}">Отклонить</button>
        <button type="button" class="btn btn-primary btn-sm" data-val-act="approve" data-val-id="${id}" data-val-kind="${kind}">Утвердить</button>
      </div>
    </div>`;
}

/* Решение аналитика: approve | reject | extend */
document.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-val-act]');
  if (!btn) return;
  const isElec = btn.dataset.valKind === 'elec';
  const act = btn.dataset.valAct;
  const all = isElec ? getElectronicParams().map(normalizeElectronicParam) : getStandards();
  const row = all.find(x => x.id === btn.dataset.valId);
  if (!row || !row.validation) return;
  const cur = getCurrentShiftPeriod();
  const curIdx = valShiftIndex(cur.date, cur.shiftType);
  const v = row.validation = normalizeValidation(row.validation);

  if (act === 'extend') {
    // +14 смен (7 суток) от конца срока, а если он прошёл — от текущей смены
    const base = Math.max(valShiftIndex(v.until, v.untilShift), curIdx - 1);
    const end = valShiftFromIndex(base + 14);
    v.until = end.date;
    v.untilShift = end.shift;
  } else if (act === 'approve') {
    if (!confirm('Утвердить? Стандарт станет постоянным: выйдет из валидации и останется в «Расписании CL» — отметьте, в какие смены его проверять.')) return;
    v.decidedAt = cur.date;
    v.decidedShift = cur.shiftType;
    v.result = 'approved';
    // Остаётся в Расписании CL с этой недели (смены задаёт аналитик)
    const ws = getSchWeekStart(0);
    if (!getRowForWeek(row, ws, row.line).member) {
      const t = getRowTemplateForWeek(row, ws);
      setRowTemplateFrom(row, ws, { ...t, inSchedule: true });
      row.inSchedule = true;
    }
  } else if (act === 'reject') {
    if (!confirm('Отклонить? Стандарт станет неактивным и уйдёт из чек-листа и расписания. История проверок сохранится.')) return;
    v.decidedAt = cur.date;
    v.decidedShift = cur.shiftType;
    v.result = 'rejected';
    row.active = false;
  }
  row.updatedAt = new Date().toISOString();
  if (isElec) setElectronicParams(all); else setStandards(all);

  // Лист истории изменений: решение по валидации
  let logId = null;
  if (act === 'approve') {
    logId = addChangeLogEntry(isElec ? 'elec' : 'mech', row, 'approved', 'Утверждён по итогам валидации');
  } else if (act === 'reject') {
    logId = addChangeLogEntry(isElec ? 'elec' : 'mech', row, 'deactivated', 'Отклонён по итогам валидации');
  }

  if (act === 'approve') {
    showToast('Утверждён — отметьте смены в «Расписании CL»');
  } else showToast(act === 'reject' ? 'Отклонён и деактивирован' : 'Срок продлён на 14 смен');

  if (typeof renderStandardFullView === 'function' && !isElec && svFullState.standardId === row.id) renderStandardFullView();
  if (isElec && typeof epPageState !== 'undefined' && epPageState.data && epPageState.data.id === row.id) {
    epPageState.data.validation = row.validation;
    epPageState.data.active = row.active;
    renderEparamPage();
  }
  if (typeof refreshEditorMechTable === 'function') refreshEditorMechTable();
  if (typeof refreshEditorElecTable === 'function') refreshEditorElecTable();
  if ($('#tab-schedule')?.classList.contains('active') && typeof renderScheduleMatrix === 'function') renderScheduleMatrix();
  if ($('#tab-electronic')?.classList.contains('active') && typeof renderClMatrix === 'function') renderClMatrix();
  if (logId) askChangeReason(logId);
});
