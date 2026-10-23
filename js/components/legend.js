/* ============================================================ */
/* === ЛЕГЕНДА ТАБЛИЦ ========================================= */
/* ============================================================ */
/*
   Одна легенда на все таблицы: Чек-лист CL, Расписание CL,
   Стандарты CL. legendHtml(['ok','fail',...]) — строка «Обозначения».
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
  val:       () => '<i class="lg-sw lg-sw-val"></i>на валидации',
  co:        () => '<i class="lg-ap lg-ap-co">CO</i>смена сорта',
  to:        () => '<i class="lg-ap lg-ap-to">ТО</i>CL в ТО',
  cv:        () => '<i class="lg-ap lg-ap-cv">КВ</i>CL в Конвертацию',
  inSch:     () => '<i class="lg-sw lg-sw-sch"></i>в расписании проверок',
  // Стандарты CL: то, что реально видно в строках таблицы
  sch:       () => '<span class="et-sch et-sch-in">N / 14 смен</span>в Расписании CL, отмечено смен из 14 — проверяется в Чек-листе',
  valEd:     () => '<i class="lg-sw lg-sw-val"></i>на валидации — строка подсвечена, срок рядом с названием'
};

function legendHtml(keys, label) {
  const items = (keys || []).filter(k => LEGEND_ITEMS[k])
    .map(k => `<span>${LEGEND_ITEMS[k]()}</span>`).join('');
  if (!items) return '';
  return `<div class="lg"><span class="lg-lbl">${escapeHtml(label || 'Обозначения')}</span>${items}</div>`;
}
