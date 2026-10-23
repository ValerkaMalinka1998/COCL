/* ============================================================ */
/* === ЛЕГЕНДА ТАБЛИЦ ========================================= */
/* ============================================================ */
/*
   Одна легенда на таблицы Чек-листа CL и Расписания CL. legendHtml(['ok','fail',...]) — строка «Обозначения».
*/

const LEGEND_ITEMS = {
  ok:        () => `<i class="cil-cell cil-cell-ok cil-cell-mini">${CIL_ICONS.check}</i>в норме`,
  fail:      () => `<i class="cil-cell cil-cell-fail cil-cell-mini">${CIL_ICONS.x}</i>отклонение`,
  missed:    () => '<i class="cil-cell cil-cell-missed cil-cell-mini">?</i>смена прошла без проверки',
  due:       () => '<i class="cil-cell cil-cell-mini"></i>запланировано',
  na:        () => '<i class="lg-sw lg-sw-na">—</i>не проверяется',
  ruler:     () => `<i class="cil-cell cil-cell-mini">${CIL_ICONS.ruler}</i>замер по точкам`,
  eye:       () => `<i class="cil-cell cil-cell-mini">${CIL_ICONS.eye}</i>визуально ОК / Не ОК`,
  day:       () => '<i class="lg-sw lg-sw-day"></i>дневная смена',
  night:     () => '<i class="lg-sw lg-sw-night"></i>ночная смена',
  past:      () => '<i class="lg-sw lg-sw-past"></i>смена прошла, изменить нельзя',
  val:       () => '<i class="lg-sw lg-sw-val"></i>на валидации'
};

function legendHtml(keys, label) {
  const items = (keys || []).filter(k => LEGEND_ITEMS[k])
    .map(k => `<span>${LEGEND_ITEMS[k]()}</span>`).join('');
  if (!items) return '';
  return `<div class="lg"><span class="lg-lbl">${escapeHtml(label || 'Обозначения')}</span>${items}</div>`;
}
