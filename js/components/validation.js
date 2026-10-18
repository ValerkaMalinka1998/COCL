/* ============================================================
   КОМПОНЕНТЫ: валидация нового стандарта / E-Param
   Блок в форме (флажок + срок), плашка с решением аналитика,
   метка для таблиц и чек-листа. Данные — js/data/standards.js.
   Модуль общего пространства имён. Порядок подключения — index.html.
   ============================================================ */

const VAL_DAY_OPTIONS = [7, 14, 21, 30];

/* Метка «Валидация до 02.11» / «срок истёк» для таблиц и чек-листа */
function valChipHtml(row) {
  const s = validationStatus(row);
  if (s !== 'active' && s !== 'overdue') return '';
  const until = fmtShortDate(row.validation.until);
  return s === 'overdue'
    ? `<span class="val-chip val-chip-over" title="Срок валидации истёк ${escapeAttr(until)} — нужно решение аналитика">Валидация · срок истёк</span>`
    : `<span class="val-chip" title="Временный: проверяется каждую смену до решения аналитика">Валидация · до ${escapeHtml(until)}</span>`;
}

/* Блок в форме: флажок «На валидации» и срок */
function valEditBlockHtml(row, isNew) {
  const v = row.validation;
  const decided = v && v.decidedAt;
  // Новый — по умолчанию на валидации; существующий — как есть
  const on = isNew ? (v ? !decided : true) : isOnValidation(row);
  const from = (v && !decided) ? v.from : getCurrentShiftPeriod().date;
  let days = VALIDATION_DAYS;
  if (v && !decided) {
    days = Math.round((new Date(v.until) - new Date(v.from)) / 864e5) || VALIDATION_DAYS;
  }
  const opts = [...new Set([...VAL_DAY_OPTIONS, days])].sort((a, b) => a - b)
    .map(d => `<option value="${d}" ${d === days ? 'selected' : ''}>${d} дней</option>`).join('');
  const was = decided
    ? `<div class="val-was">Валидация пройдена ${escapeHtml(fmtShortDate(v.decidedAt))} — ${v.result === 'rejected' ? 'отклонён' : 'утверждён'}.</div>` : '';
  return `
    <div class="sv-full-extra-block val-edit" data-val-from="${escapeAttr(from)}">
      <label class="val-toggle">
        <input type="checkbox" id="valOn" ${on ? 'checked' : ''}>
        <span><b>На валидации</b> — временный: проверяется каждую смену, в чек-листе идёт последним и выделен цветом</span>
      </label>
      <div class="val-days" ${on ? '' : 'hidden'}>
        Срок <select id="valDays">${opts}</select>
        <span>с ${escapeHtml(fmtShortDate(from))} до <b id="valUntil">${escapeHtml(fmtShortDate(addDaysISO(from, days)))}</b>, потом — решение аналитика</span>
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
  const from = p && !p.decidedAt ? p.from : box.dataset.valFrom;
  const days = parseInt($('#valDays')?.value, 10) || VALIDATION_DAYS;
  return { from, until: addDaysISO(from, days), decidedAt: '', result: '' };
}

document.addEventListener('change', (e) => {
  if (e.target.id === 'valOn') {
    const d = e.target.closest('.val-edit')?.querySelector('.val-days');
    if (d) d.hidden = !e.target.checked;
  }
  if (e.target.id === 'valDays') {
    const box = e.target.closest('.val-edit');
    $('#valUntil').textContent = fmtShortDate(addDaysISO(box.dataset.valFrom, parseInt(e.target.value, 10)));
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
  const today = getCurrentShiftPeriod().date;
  const left = Math.round((new Date(v.until) - new Date(today)) / 864e5);
  const st = valCheckStats(row);
  const id = escapeAttr(row.id);
  return `
    <div class="val-banner ${s === 'overdue' ? 'val-banner-over' : ''}">
      <div class="val-banner-main">
        <b>${s === 'overdue' ? 'Срок валидации истёк — нужно решение' : 'На валидации — временный'}</b>
        <span>с ${fmtShortDate(v.from)} до ${fmtShortDate(v.until)}${s === 'active' ? ` · осталось ${left} ${pluralRu(left, 'день', 'дня', 'дней')}` : ''}
          · проверок ${st.n}${st.fail ? `, <em>отклонений ${st.fail}</em>` : ''} · проверяется каждую смену</span>
      </div>
      <div class="val-banner-acts">
        <button type="button" class="btn btn-secondary btn-sm" data-val-act="extend" data-val-id="${id}" data-val-kind="${kind}">+7 дней</button>
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
  const today = getCurrentShiftPeriod().date;

  if (act === 'extend') {
    const base = row.validation.until > today ? row.validation.until : today;
    row.validation.until = addDaysISO(base, 7);
  } else if (act === 'approve') {
    if (!confirm('Утвердить? Стандарт станет постоянным: выйдет из валидации и будет проверяться по «Расписанию CL».')) return;
    row.validation.decidedAt = today;
    row.validation.result = 'approved';
  } else if (act === 'reject') {
    if (!confirm('Отклонить? Стандарт станет неактивным и уйдёт из чек-листа. История проверок сохранится.')) return;
    row.validation.decidedAt = today;
    row.validation.result = 'rejected';
    row.active = false;
  }
  row.updatedAt = new Date().toISOString();
  if (isElec) setElectronicParams(all); else setStandards(all);

  if (act === 'approve') {
    showToast(row.inSchedule ? 'Утверждён' : 'Утверждён — добавьте его в «Расписание CL», чтобы проверка продолжалась');
  } else showToast(act === 'reject' ? 'Отклонён и деактивирован' : 'Срок продлён на 7 дней');

  if (typeof renderStandardFullView === 'function' && !isElec && svFullState.standardId === row.id) renderStandardFullView();
  if (isElec && typeof epPageState !== 'undefined' && epPageState.data && epPageState.data.id === row.id) {
    epPageState.data.validation = row.validation;
    epPageState.data.active = row.active;
    renderEparamPage();
  }
  if (typeof refreshEditorMechTable === 'function') refreshEditorMechTable();
  if (typeof refreshEditorElecTable === 'function') refreshEditorElecTable();
});
