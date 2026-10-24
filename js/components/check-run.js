/* ============================================================
   КОМПОНЕНТЫ: окно проверки «список слева — стандарт справа»
   Общее для «CL при переходах» (Смена сорта / CL в ТО /
   CL в Конвертацию) и проверки TOP Losses.
   Слева: заголовок, прогресс, список стандартов, «Сохранить».
   Справа: выбранный стандарт — инструмент, время на проверку,
   поля точек, «Как проверять», комментарий, фото, ◀ ▶.
   Модуль общего пространства имён: функции и переменные видны
   во всех файлах. Порядок подключения — index.html.
   ============================================================ */

const CHK_ICONS = {
  tool: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>',
  clock: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
  swap: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>',
  eye: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>',
  save: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>',
  prev: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>',
  next: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>'
};

/* Шапка левой панели: заголовок, ссылка «назад», прогресс */
function chkLeftHeadHtml(o) {
  return `
    <div class="chk-lhead">
      <div class="chk-lhead-row">
        <div class="chk-lhead-t">${o.title}</div>
        ${o.backHtml || ''}
      </div>
      ${o.subHtml ? `<div class="chk-lhead-sub">${o.subHtml}</div>` : ''}
      <div class="chk-bar"><i data-chk-bar></i></div>
      <div class="chk-lhead-s" data-chk-sum></div>
    </div>`;
}

/* Низ левой панели: кнопка сохранения (attrs — id / data-атрибут) */
function chkLeftFootHtml(attrs) {
  return `
    <div class="chk-lfoot">
      <button type="button" class="chk-save" ${attrs}>${CHK_ICONS.save}<span>Сохранить проверку</span></button>
    </div>`;
}

/* Пункт списка слева. n — номер, status — 'unchecked' | 'ok' | 'fail' */
function chkEntryInner(o) {
  return `
    <span class="chk-ic" data-acc-status="${o.status || 'unchecked'}" data-n="${o.n}"></span>
    <span class="chk-etext">
      ${o.opl ? `<span class="chk-opl">${escapeHtml(o.opl)}</span>` : ''}
      <span class="chk-ename">${o.tagHtml || ''}${escapeHtml(o.title || '—')}</span>
    </span>`;
}

/* Правая часть: выбранный стандарт */
function chkDetailHtml(o) {
  const meta = (o.meta || []).filter(Boolean).map(escapeHtml).join(' · ');
  const dur = formatCilDuration(o.durationSec);
  const co = o.changeOver && o.changeOver.from && o.changeOver.to
    ? `<span class="chk-fact chk-fact-co">${CHK_ICONS.swap}Смена сорта <b>${escapeHtml(o.changeOver.from)}</b> → <b>${escapeHtml(o.changeOver.to)}</b></span>`
    : (o.brand ? `<span class="chk-fact">Бренд <b>${escapeHtml(o.brand)}</b></span>` : '');
  return `
    <div class="chk-detail">
      <div class="chk-d-head">
        <div class="chk-d-ttl">
          <div class="chk-d-meta">${o.opl ? `<span class="chk-opl">${escapeHtml(o.opl)}</span>${meta ? ' · ' : ''}` : ''}${meta}</div>
          <div class="chk-d-name">${o.tagHtml || ''}${escapeHtml(o.title || '—')}</div>
          ${o.extraHtml || ''}
        </div>
        ${o.eyeAttrs ? `<button type="button" class="chk-eye" ${o.eyeAttrs} title="Открыть стандарт целиком: цель, бренды, история">${CHK_ICONS.eye}<span>Весь стандарт</span></button>` : ''}
      </div>
      <div class="chk-d-facts">
        <span class="chk-fact${o.tool ? '' : ' is-empty'}">${CHK_ICONS.tool}Инструмент <b>${o.tool ? escapeHtml(o.tool) : 'не указан'}</b></span>
        <span class="chk-fact${dur ? '' : ' is-empty'}">${CHK_ICONS.clock}Время на проверку <b>${dur || 'не указано'}</b></span>
        ${co}
      </div>
      <div class="chk-d-body${o.photosHtml ? ' has-photos' : ''}">
        <div class="chk-d-col">
          ${o.inputsHtml || ''}
          ${o.how ? `<div class="chk-how"><div class="chk-how-t">${escapeHtml(o.howTitle || 'Как проверять')}</div><div class="chk-how-b">${escapeHtml(o.how)}</div></div>` : ''}
          <textarea class="chk-comment" data-chk-comment rows="2" placeholder="Комментарий (обязателен при отклонении)">${escapeHtml(o.comment || '')}</textarea>
        </div>
        ${o.photosHtml ? `<div class="chk-d-photos" ${o.photosAttrs || ''}>${o.photosHtml}</div>` : ''}
      </div>
      <div class="chk-d-nav">
        <button type="button" class="chk-nav" data-chk-nav="-1">${CHK_ICONS.prev}Предыдущий</button>
        <button type="button" class="chk-nav primary" data-chk-nav="1">Следующий${CHK_ICONS.next}</button>
      </div>
    </div>`;
}

/* «1 отклонение / 2 отклонения / 5 отклонений» */
function chkFailsWord(n) {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return 'отклонение';
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return 'отклонения';
  return 'отклонений';
}

/* Прогресс в шапке левой панели */
function chkUpdateProgress(root, done, total, fails) {
  if (!root) return;
  const bar = root.querySelector('[data-chk-bar]');
  if (bar) {
    bar.style.width = (total ? Math.round(done / total * 100) : 0) + '%';
    bar.classList.toggle('has-fail', fails > 0);
  }
  const sum = root.querySelector('[data-chk-sum]');
  if (sum) sum.innerHTML = `${done} из ${total}${fails ? ` · <b>${fails} ${chkFailsWord(fails)}</b>` : ''}`;
}

/* Подсветить поле комментария, если пункт не в норме, а комментария нет */
function chkMarkComment(item, isFail) {
  const need = !!isFail && !String(item.dataset.comment || '').trim();
  item.classList.toggle('chk-needs-comment', need);
}
