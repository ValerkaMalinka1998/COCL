/* ============================================================
   TOP LOSSES: проверка, сохранение, итог
   Стандарты и E-Param выбранных потерь; у кого есть числовые
   точки — поле на каждую точку с нормой, у остальных — ОК / Не ОК.
   После сохранения с отклонениями — уведомление о Machine Journal.
   Модуль общего пространства имён: функции и переменные видны
   во всех файлах. Порядок подключения — index.html.
   ============================================================ */

const tlCheck = {
  lossIds: [],
  rows: [],          // [{ row, isElec, losses, points: [{ label, norm, value }] | null }]
  answers: {},       // id → { status, values: [], comment }
  active: '',        // id выбранной строки (показана справа)
  brand: ''
};

/* Точки строки для ввода: [{ label, normText, range }] или null (ОК / Не ОК) */
function tlCheckPoints(row, isElec, brand) {
  if (isElec) {
    if (row.controlType === 'fixed') return null;
    const list = Array.isArray(row.valuesByBrand) ? row.valuesByBrand : [];
    const e = list.find(v => brand && v.brand === brand) || list.find(v => !v.brand) || list[0];
    if (!e) return null;
    const r = getEparamNormRange(e);
    if (!r) return null;
    const text = row.controlType === 'interval' ? `${r.min} … ${r.max}` : `${e.target} ± ${e.tolerance}`;
    return [{ label: `норма ${text}${e.brand ? ' · ' + e.brand : ''}`, range: r }];
  }
  const ms = Array.isArray(row.measurements) ? row.measurements : [];
  const block = ms.find(b => brand && b.brand === brand) || ms.find(b => !b.brand) || ms[0];
  const pts = (block && Array.isArray(block.points) ? block.points : [])
    .map(p => String(p && p.value != null ? p.value : '').trim()).filter(Boolean);
  // Точка-метка (словами или без числовой нормы) — ОК / Не ОК, как в быстрой проверке
  const parsed = pts.map(v => {
    const mark = isNormMark(v) || !parseNorm(v);
    return { v, r: mark ? null : parseNorm(v), mark };
  });
  if (!parsed.length || parsed.every(x => x.mark)) return null;
  return parsed.map((x, i) => ({ label: `т.${i + 1} · ${x.v}`, range: x.r, mark: x.mark }));
}

/* Подпись поля: «Т.1 · норма 5 до 8» (E-Param — «норма 92 ± 5 · бренд») */
function tlPointLabelHtml(p) {
  const m = /^т\.(\d+) · (.*)$/.exec(p.label);
  if (!m) return escapeHtml(p.label);
  return `Т.${m[1]} · норма <b>${escapeHtml(m[2])}</b>`;
}

/* Состояние точки по ответу: '' — пусто, 'ok' / 'bad' */
function tlPointState(p, value) {
  const raw = String(value ?? '').trim();
  if (raw === '') return '';
  if (p.mark) return raw === 'ОК' ? 'ok' : 'bad';
  const n = Number(raw.replace(',', '.'));
  return Number.isFinite(n) && p.range && n >= p.range.min && n <= p.range.max ? 'ok' : 'bad';
}

/* Статус строки по введённым значениям */
function tlCheckStatusFromValues(points, values) {
  let filled = 0, bad = false;
  points.forEach((p, i) => {
    const s = tlPointState(p, values[i]);
    if (!s) return;
    filled++;
    if (s === 'bad') bad = true;
  });
  if (bad) return 'FAIL';
  return filled === points.length ? 'OK' : null;
}

/* ============================================================
   ОТКРЫТИЕ ПРОВЕРКИ
   ============================================================ */

function buildTopLossChecklist(lossIds) {
  const line = tlState.line;
  if (!line) return showToast('Выберите линию', true);
  if (!lossIds || !lossIds.length) return showToast('Выберите потерю', true);
  const rows = tlCollectRows(lossIds, line);
  if (!rows.length) return showToast('По выбранным потерям нет активных стандартов на линии ' + line, true);

  const period = getCurrentShiftPeriod();
  tlCheck.brand = getElectronicBrandForDate(line, period.date) || '';
  tlCheck.lossIds = lossIds.slice();
  tlCheck.rows = rows.map(r => ({ ...r, points: tlCheckPoints(r.row, r.isElec, tlCheck.brand) }));
  tlCheck.answers = {};
  tlCheck.active = tlCheck.rows[0].row.id;

  renderTopLossChecklist();
  $('#tlSelectView').style.display = 'none';
  $('#tlChecklistView').style.display = 'block';
  $('#tlSummaryView').style.display = 'none';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderTopLossChecklist() {
  const container = $('#tlChecklistView');
  if (!container) return;
  const period = getCurrentShiftPeriod();
  const letter = getShiftsForDate(period.date)[period.shiftType];

  const items = tlCheck.rows.map((r, i) => {
    const { row, isElec, losses, points } = r;
    const a = tlCheck.answers[row.id] || {};
    const st = a.status;
    const lossNames = losses.map(id => findLossById(id)?.name).filter(Boolean).join(' · ');
    const title = isElec ? row.paramName : row.title;
    const inputs = points
      ? `<div class="tl3-pts">${points.map((p, pi) => {
          const v = (a.values || [])[pi] ?? '';
          const cls = tlPointState(p, v);
          if (p.mark) {
            return `<div class="tl3-pt tl3-pt-mark ${cls}"><small>${tlPointLabelHtml(p)}</small>
              <span class="tl3-mark">${['ОК', 'Не ОК'].map(m => `<button type="button" class="${m === 'ОК' ? 'tl3-ok' : 'tl3-no'} ${v === m ? 'on' : ''}" data-tl-mark="${escapeAttr(row.id)}" data-pi="${pi}" data-v="${m}">${m}</button>`).join('')}</span></div>`;
          }
          return `<label class="tl3-pt ${cls}"><small>${tlPointLabelHtml(p)}</small>
            <input type="text" inputmode="decimal" data-tl-val="${escapeAttr(row.id)}" data-pi="${pi}" value="${escapeAttr(v)}" autocomplete="off"></label>`;
        }).join('')}</div>`
      : `<div class="tl3-okno">
          <button type="button" class="tl3-ok ${st === 'OK' ? 'on' : ''}" data-tl-ans="${escapeAttr(row.id)}" data-v="OK">✓ ОК</button>
          <button type="button" class="tl3-no ${st === 'FAIL' ? 'on' : ''}" data-tl-ans="${escapeAttr(row.id)}" data-v="FAIL">✕ Не ОК</button>
        </div>`;
    const kindTag = isElec ? '<span class="tl2-kind tl2-kind-el">E-Param</span> ' : '';
    const status = st === 'OK' ? 'ok' : st === 'FAIL' ? 'fail' : 'unchecked';
    return `
      <div class="tl3-item chk-item${tlCheck.active === row.id ? ' is-active' : ''}" data-std-id="${escapeAttr(row.id)}" data-comment="${escapeAttr(a.comment || '')}">
        <div class="chk-entry" data-tl-pick="${escapeAttr(row.id)}">${chkEntryInner({ n: i + 1, status, opl: row.oplNumber, title, tagHtml: kindTag })}</div>
        ${chkDetailHtml({
          opl: row.oplNumber,
          meta: [row.machine, row.node, row.nodePart],
          title,
          tagHtml: kindTag,
          extraHtml: lossNames ? `<div class="tl3-loss">${escapeHtml(lossNames)}</div>` : '',
          tool: isElec ? '' : row.tool,
          durationSec: cilRowDurationSec(row),
          brand: tlCheck.brand,
          eyeAttrs: isElec ? '' : `data-tl-view="${escapeAttr(row.id)}"`,
          inputsHtml: inputs,
          how: isElec ? row.normText : row.controlDescription,
          howTitle: isElec ? 'Что считается «ОК»' : 'Описание контроля',
          comment: a.comment,
          photosHtml: !isElec && typeof photoSliderHtml === 'function' ? photoSliderHtml(row) : '',
          photosAttrs: `data-tl-photos="${escapeAttr(row.id)}"`
        })}
      </div>`;
  }).join('');

  const chips = tlCheck.lossIds.map(id => findLossById(id)).filter(Boolean)
    .map(l => `<span class="tl2-tag tl2-tag-am">${escapeHtml(l.name)}</span>`).join('');
  const sub = `${escapeHtml(fmtShortDate(period.date))} · ${period.shiftType === 'day' ? 'день' : 'ночь'} · ${escapeHtml(letter || '—')}${tlCheck.brand ? ' · бренд ' + escapeHtml(tlCheck.brand) : ''}`;

  container.innerHTML = `
    <div class="chk-run" id="tlChecklistContainer">
      ${chkLeftHeadHtml({
        title: `TOP Losses · ${escapeHtml(tlState.line)}`,
        backHtml: `<button type="button" class="chk-back" id="tlBackToSelectBtn">← Потери</button>`,
        subHtml: `${sub}<div class="chk-lhead-chips">${chips}</div>`
      })}
      ${items}
      ${chkLeftFootHtml('id="tlSaveChecklistBtn"')}
    </div>`;
  container.querySelectorAll('[data-tl-photos]').forEach(box => {
    const r = tlCheck.rows.find(x => x.row.id === box.dataset.tlPhotos);
    if (r) bindPhotoSlider(box, r.row);
  });
  updateTlCheckProgress();
}

/* Прогресс в шапке и подсветка обязательных комментариев */
function updateTlCheckProgress() {
  const root = $('#tlChecklistContainer');
  if (!root) return;
  let done = 0, fail = 0;
  tlCheck.rows.forEach(r => {
    const s = tlCheck.answers[r.row.id]?.status;
    if (s === 'OK' || s === 'FAIL') done++;
    if (s === 'FAIL') fail++;
    const item = root.querySelector(`.tl3-item[data-std-id="${CSS.escape(r.row.id)}"]`);
    if (item) chkMarkComment(item, s === 'FAIL');
  });
  chkUpdateProgress(root, done, tlCheck.rows.length, fail);
}

/* Обновить один пункт без перерисовки всего списка (фокус в полях не теряется) */
function tlCheckRefreshItem(id) {
  const item = document.querySelector(`#tlChecklistContainer .tl3-item[data-std-id="${CSS.escape(id)}"]`);
  const r = tlCheck.rows.find(x => x.row.id === id);
  if (!item || !r) return;
  const st = tlCheck.answers[id]?.status;
  item.querySelector('.chk-ic').dataset.accStatus = st === 'OK' ? 'ok' : st === 'FAIL' ? 'fail' : 'unchecked';
  item.querySelectorAll('[data-tl-ans]').forEach(b => b.classList.toggle('on', b.dataset.v === st));
  if (r.points) {
    item.querySelectorAll('.tl3-pt').forEach((lab, pi) => {
      const v = (tlCheck.answers[id]?.values || [])[pi];
      const s = tlPointState(r.points[pi], v);
      lab.classList.toggle('ok', s === 'ok');
      lab.classList.toggle('bad', s === 'bad');
      lab.querySelectorAll('[data-tl-mark]').forEach(b => b.classList.toggle('on', b.dataset.v === v));
    });
  }
  updateTlCheckProgress();
}

/* ============================================================
   СОХРАНЕНИЕ
   ============================================================ */

function saveTopLossCheck() {
  const line = tlState.line;
  // Комментарии хранятся в data-comment карточек (их пишет общее окно комментария)
  $$('#tlChecklistContainer .tl3-item').forEach(el => {
    const id = el.dataset.stdId;
    if (!tlCheck.answers[id]) tlCheck.answers[id] = {};
    tlCheck.answers[id].comment = el.dataset.comment || '';
  });
  // Отклонение без комментария — не сохраняем, показываем этот пункт
  const noComment = tlCheck.rows.find(r => tlCheck.answers[r.row.id]?.status === 'FAIL' && !String(tlCheck.answers[r.row.id].comment || '').trim());
  if (noComment) {
    tlSelectItem(noComment.row.id, false);
    document.querySelector(`#tlChecklistContainer .tl3-item.is-active [data-chk-comment]`)?.focus();
    return showToast('Напишите комментарий к отклонению', true);
  }

  const items = tlCheck.rows.map(({ row, isElec, losses, points }) => {
    const a = tlCheck.answers[row.id] || {};
    const status = a.status || 'UNCHECKED';
    const values = points ? points.map((p, i) => String((a.values || [])[i] ?? '').trim()) : [];
    const normText = points ? points.map(p => p.label).join('; ') : (isElec ? row.normText || '' : '');
    const answer = status === 'UNCHECKED' ? '—'
      : points ? values.map((v, i) => `${points[i].label.split(' · ')[0]}: ${v || '—'}`).join('; ')
      : (status === 'OK' ? 'ОК' : 'Не ОК');
    // Что именно вне нормы — для уведомления о Machine Journal
    const deviation = status !== 'FAIL' ? ''
      : points ? points.map((p, i) => {
          if (tlPointState(p, values[i]) !== 'bad') return '';
          const [pt, norm] = p.label.split(' · ');
          if (p.mark) return `${pt}: Не ОК (${norm})`;
          return points.length > 1 ? `${pt}: ${values[i]} при норме ${norm}` : `${values[i]} при ${p.label}`;
        }).filter(Boolean).join('; ')
      : 'Не ОК';
    return {
      standardId: row.id,
      kind: isElec ? 'elec' : 'mech',
      deviation,
      number: row.number || '',
      oplNumber: row.oplNumber || '',
      machine: row.machine || '',
      node: row.node || '',
      nodePart: row.nodePart || '',
      title: isElec ? row.paramName : row.title,
      controlType: isElec ? row.controlType : migrateControlType(row.controlType, row.measurements),
      norm: normText,
      answer,
      value: points && points.length === 1 ? values[0] : null,
      values,
      status,
      comment: a.comment || '',
      topLosses: losses
    };
  });

  if (!items.some(it => it.status !== 'UNCHECKED')) return showToast('Отметьте хотя бы один пункт', true);

  const record = {
    id: uid(),
    timestamp: new Date().toISOString(),
    mode: 'toploss',
    operator: getCurrentUser() || '—',
    line,
    brandActual: tlCheck.brand || '',
    topLosses: tlCheck.lossIds.slice(),
    items
  };
  const hist = getHistory();
  hist.push(record);
  setHistory(hist);
  updateNavHistoryCounter();
  showToast('Проверка сохранена');

  renderTopLossSummary(record);
  showMachineJournalNotice(items.filter(it => it.status === 'FAIL'), { line, source: 'TOP Losses' });
}

/* ============================================================
   ИТОГ ПРОВЕРКИ
   ============================================================ */

function renderTopLossSummary(record) {
  const container = $('#tlSummaryView');
  if (!container) return;

  const lossStats = (record.topLosses || []).map(id => findLossById(id)).filter(Boolean).map(loss => {
    const rel = record.items.filter(it => (it.topLosses || []).includes(loss.id));
    const oks = rel.filter(it => it.status === 'OK').length;
    const fails = rel.filter(it => it.status === 'FAIL');
    const unchecked = rel.filter(it => it.status === 'UNCHECKED').length;
    return { loss, total: rel.length, oks, fails, unchecked, ok: !fails.length && !unchecked && rel.length > 0 };
  });

  const total = record.items.length;
  const fails = record.items.filter(it => it.status === 'FAIL').length;
  const oks = record.items.filter(it => it.status === 'OK').length;
  const unchecked = total - oks - fails;
  const checked = oks + fails;
  const pct = checked ? Math.round(oks / checked * 100) : 0;
  const allOk = !fails && !unchecked;
  const label = (it) => it.oplNumber ? `${it.oplNumber}${it.machine ? ' [' + it.machine + ']' : ''}` : (it.title || '—');

  const sub = [
    checked ? `Проверено: <strong>${checked}</strong> из ${total}` : '',
    fails ? `вне нормы: <strong>${fails}</strong>` : '',
    unchecked ? `<span class="tl-shield-sub-unchecked">не проверено: ${unchecked}</span>` : ''
  ].filter(Boolean).join(' · ');

  container.innerHTML = `
    <div class="card tl-summary-card">
      <div class="tl-summary-head">
        <div class="tl-summary-icon tl-summary-icon-ok">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
        </div>
        <div>
          <div class="tl-summary-title">Проверка сохранена</div>
          <div class="tl-summary-sub">Линия: <strong>${escapeHtml(record.line)}</strong> · ${formatDateTime(record.timestamp)}</div>
        </div>
      </div>
    </div>
    <div class="tl-shield ${allOk ? 'tl-shield-ok' : 'tl-shield-fail'}">
      <div class="tl-shield-ring" style="--percent: ${pct}">
        <div class="tl-shield-ring-hole"><div class="tl-shield-ring-value">${pct}%</div><div class="tl-shield-ring-label">ОК</div></div>
      </div>
      <div class="tl-shield-info">
        <div class="tl-shield-title">${allOk ? 'Потери под контролем' : 'Требуют внимания'}</div>
        <div class="tl-shield-sub">${sub}</div>
        ${fails ? `<div class="tl-shield-journal-warning">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          <span>Есть отклонения. Сделайте запись в <strong>Machine Journal</strong>.</span></div>` : ''}
        <div class="tl-shield-chips">
          ${record.items.slice(0, 20).map(it => `<span class="tl-shield-chip ${it.status === 'OK' ? 'tl-shield-chip-ok' : it.status === 'FAIL' ? 'tl-shield-chip-fail' : 'tl-shield-chip-unchecked'}" title="${escapeAttr(it.title || '')}"><span class="tl-shield-chip-dot"></span>${escapeHtml(label(it))}</span>`).join('')}
          ${total > 20 ? `<span class="tl-shield-chip">+${total - 20}</span>` : ''}
        </div>
      </div>
    </div>
    <div class="card">
      <h2>Детали по потерям</h2>
      <div class="tl-loss-tiles">${lossStats.map(s => `
        <div class="tl-loss-tile ${s.ok ? 'tl-loss-tile-ok' : 'tl-loss-tile-fail'}">
          <div class="tl-loss-tile-head">
            <span class="tl-loss-tile-name">${escapeHtml(s.loss.name)}</span>
            <span class="tl-loss-tile-count">${s.oks + s.fails.length === 0 ? 'не проверено'
              : `${s.oks} OK${s.fails.length ? ` · ${s.fails.length} Не ОК` : ''}${s.unchecked ? ` · ${s.unchecked} не проверено` : ''}`}</span>
          </div>
          ${s.fails.length ? `<div class="tl-loss-tile-fails">${s.fails.map(it => `
            <div class="tl-loss-tile-fail-row"><span class="tl-loss-tile-fail-opl">${escapeHtml(label(it))}</span>
            <span class="tl-loss-tile-fail-title">${escapeHtml(it.title || '')}</span></div>`).join('')}</div>` : ''}
        </div>`).join('')}</div>
    </div>
    <div class="tl-select-footer">
      <button class="btn btn-primary" id="tlBackToListBtn">← К разбору потерь</button>
    </div>`;

  $('#tlSelectView').style.display = 'none';
  $('#tlChecklistView').style.display = 'none';
  $('#tlSummaryView').style.display = 'block';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ============================================================
   ОБРАБОТЧИКИ
   ============================================================ */

/* Показать стандарт справа. focus — к первому полю ввода */
function tlSelectItem(id, focus) {
  const cont = $('#tlChecklistContainer');
  const item = cont?.querySelector(`.tl3-item[data-std-id="${CSS.escape(id)}"]`);
  if (!item) return;
  tlCheck.active = id;
  cont.querySelectorAll('.tl3-item.is-active').forEach(x => x.classList.remove('is-active'));
  item.classList.add('is-active');
  item.querySelector('.chk-entry')?.scrollIntoView({ block: 'nearest' });
  if (focus) item.querySelector('.chk-detail input[type="text"], .chk-detail .tl3-okno button')?.focus({ preventScroll: true });
}

function tlStep(id, dir) {
  const i = tlCheck.rows.findIndex(x => x.row.id === id);
  const next = tlCheck.rows[i + dir];
  if (next) tlSelectItem(next.row.id, true);
}

/* После «ОК» — к следующему, если оператор ещё на этом стандарте */
function tlAdvanceLater(id) {
  setTimeout(() => {
    if (tlCheck.active === id && tlCheck.answers[id]?.status === 'OK') tlStep(id, 1);
  }, 350);
}

$('#tlChecklistView')?.addEventListener('click', (e) => {
  const pick = e.target.closest('[data-tl-pick]');
  if (pick) return tlSelectItem(pick.dataset.tlPick, true);
  const nav = e.target.closest('[data-chk-nav]');
  if (nav) return tlStep(nav.closest('.tl3-item').dataset.stdId, +nav.dataset.chkNav);
  if (e.target.closest('#tlBackToSelectBtn')) {
    const any = Object.values(tlCheck.answers).some(a => a.status || (a.values || []).some(Boolean));
    if (any && !confirm('Выйти из проверки? Введённые ответы не сохранятся.')) return;
    return backToTopLossSelect();
  }
  if (e.target.closest('#tlSaveChecklistBtn')) return saveTopLossCheck();
  const ans = e.target.closest('[data-tl-ans]');
  if (ans) {
    const id = ans.dataset.tlAns;
    const a = tlCheck.answers[id] || (tlCheck.answers[id] = {});
    a.status = a.status === ans.dataset.v ? null : ans.dataset.v;
    tlCheckRefreshItem(id);
    if (a.status === 'OK') tlAdvanceLater(id);
    return;
  }
  // Точка-метка: ОК / Не ОК пишется в значения точек, повторный клик снимает ответ
  const mark = e.target.closest('[data-tl-mark]');
  if (mark) {
    const id = mark.dataset.tlMark;
    const r = tlCheck.rows.find(x => x.row.id === id);
    if (!r || !r.points) return;
    const a = tlCheck.answers[id] || (tlCheck.answers[id] = {});
    if (!Array.isArray(a.values)) a.values = [];
    const pi = Number(mark.dataset.pi);
    a.values[pi] = a.values[pi] === mark.dataset.v ? '' : mark.dataset.v;
    a.status = tlCheckStatusFromValues(r.points, a.values);
    tlCheckRefreshItem(id);
    if (a.status === 'OK' && a.values[pi]) tlAdvanceLater(id);
    return;
  }
  const view = e.target.closest('[data-tl-view]');
  if (view && typeof openStandardView === 'function') openStandardView(view.dataset.tlView, { brand: tlCheck.brand || '' });
});

/* Enter — к следующему полю, после последнего — к следующему стандарту */
$('#tlChecklistView')?.addEventListener('keydown', (e) => {
  const inp = e.target.closest('[data-tl-val]');
  if (!inp || e.key !== 'Enter') return;
  e.preventDefault();
  const item = inp.closest('.tl3-item');
  const all = [...item.querySelectorAll('input[data-tl-val]')];
  const next = all[all.indexOf(inp) + 1];
  if (next) next.focus();
  else tlStep(item.dataset.stdId, 1);
});

$('#tlChecklistView')?.addEventListener('input', (e) => {
  // Комментарий к пункту (обязателен при отклонении)
  const ta = e.target.closest('[data-chk-comment]');
  if (ta) {
    const item = ta.closest('.tl3-item');
    item.dataset.comment = ta.value.trim();
    const a = tlCheck.answers[item.dataset.stdId] || (tlCheck.answers[item.dataset.stdId] = {});
    a.comment = item.dataset.comment;
    return updateTlCheckProgress();
  }
  const inp = e.target.closest('[data-tl-val]');
  if (!inp) return;
  const id = inp.dataset.tlVal;
  const r = tlCheck.rows.find(x => x.row.id === id);
  if (!r || !r.points) return;
  const a = tlCheck.answers[id] || (tlCheck.answers[id] = {});
  if (!Array.isArray(a.values)) a.values = [];
  a.values[Number(inp.dataset.pi)] = inp.value;
  a.status = tlCheckStatusFromValues(r.points, a.values);
  tlCheckRefreshItem(id);
});

$('#tlSummaryView')?.addEventListener('click', (e) => {
  if (e.target.closest('#tlBackToListBtn')) backToTopLossSelect();
});
