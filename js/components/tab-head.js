/* ============================================================
   КОМПОНЕНТЫ: шапка вкладки — цветная плашка с шагами
   Используют TOP Losses и «CL при переходах». Шаги внутри плашки:
   пройденный — галочка, текущий — тёмный кружок, дальше — приглушены.
   Стили — css/components/tab-head.css.
   Модуль общего пространства имён. Порядок подключения — index.html.
   ============================================================ */

/* Строка шагов: labels — подписи, step — номер текущего (1…N); N + 1 — всё пройдено */
function tabStepsHtml(labels, step) {
  const check = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
  return labels.map((text, i) => {
    const n = i + 1;
    const state = n < step ? 'ok' : n === step ? 'on' : 'next';
    return `${i ? '<span class="th-ln"></span>' : ''}
      <span class="th-s th-s-${state}"><span class="th-d">${state === 'ok' ? check : n}</span>${escapeHtml(text)}</span>`;
  }).join('');
}
