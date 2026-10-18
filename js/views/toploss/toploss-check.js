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
  const parsed = pts.map(v => ({ v, r: parseNorm(v) }));
  if (!parsed.length || parsed.every(x => !x.r)) return null;
  return parsed.map((x, i) => ({ label: `т.${i + 1} · ${x.v}`, range: x.r }));
}

/* Статус строки по введённым значениям */
function tlCheckStatusFromValues(points, values) {
  let filled = 0, bad = false;
  points.forEach((p, i) => {
    const raw = String(values[i] ?? '').trim().replace(',', '.');
    if (raw === '') return;
    filled++;
    const n = Number(raw);
    if (!Number.isFinite(n) || !p.range || n < p.range.min || n > p.range.max) bad = true;
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
    const body = points
      ? `<div class="tl3-pts">${points.map((p, pi) => {
          const v = (a.values || [])[pi] ?? '';
          const raw = String(v).trim().replace(',', '.');
          const cls = raw === '' ? '' : (Number.isFinite(Number(raw)) && Number(raw) >= p.range.min && Number(raw) <= p.range.max ? 'ok' : 'bad');
          return `<label class="tl3-pt ${cls}"><small>${escapeHtml(p.label)}</small>
            <input type="text" inputmode="decimal" data-tl-val="${escapeAttr(row.id)}" data-pi="${pi}" value="${escapeAttr(v)}" placeholder="значение" autocomplete="off"></label>`;
        }).join('')}</div>`
      : `<div class="tl3-okno">
          <button type="button" class="tl3-ok ${st === 'OK' ? 'on' : ''}" data-tl-ans="${escapeAttr(row.id)}" data-v="OK">✓ ОК</button>
          <button type="button" class="tl3-no ${st === 'FAIL' ? 'on' : ''}" data-tl-ans="${escapeAttr(row.id)}" data-v="FAIL">✕ Не ОК</button>
        </div>
        ${!isElec && row.controlDescription ? `<div class="tl3-how">${escapeHtml(row.controlDescription)}</div>` : ''}
        ${isElec && row.normText ? `<div class="tl3-how">${escapeHtml(row.normText)}</div>` : ''}`;
    return `
      <div class="tl3-item ${st === 'OK' ? 'done-ok' : st === 'FAIL' ? 'done-fail' : ''}" data-std-id="${escapeAttr(row.id)}" data-comment="${escapeAttr(a.comment || '')}">
        <span class="tl3-num">${st === 'OK' ? '✓' : st === 'FAIL' ? '✕' : i + 1}</span>
        <div class="tl3-main">
          <div class="tl3-nm">${isElec ? '<span class="tl2-kind tl2-kind-el">E-Param</span> ' : ''}${row.oplNumber ? `<span class="tl2-opl">${escapeHtml(row.oplNumber)}</span> · ` : ''}${escapeHtml(title || '—')}</div>
          <div class="tl2-sub">${escapeHtml([row.machine, row.nodePart, row.node].filter(Boolean).join(' · '))}${lossNames ? ` · <span class="tl3-loss">${escapeHtml(lossNames)}</span>` : ''}</div>
          ${body}
          <div class="comment-preview" data-comment-preview style="${a.comment ? '' : 'display:none'}">${a.comment ? cmtLine(a.comment) : ''}</div>
        </div>
        <div class="tl3-acts">
          <button type="button" class="tl2-ib ${a.comment ? 'has-comment' : ''}" data-comment-btn data-tl-comment="${escapeAttr(row.id)}" title="Комментарий">
            ${cmtIcon(16, true)}
          </button>
          ${isElec ? '' : `<button type="button" class="tl2-ib" data-tl-view="${escapeAttr(row.id)}" title="Открыть стандарт">${CIL_ICONS.eye}</button>`}
        </div>
      </div>`;
  }).join('');

  const chips = tlCheck.lossIds.map(id => findLossById(id)).filter(Boolean)
    .map(l => `<span class="tl2-tag tl2-tag-am">${escapeHtml(l.name)}</span>`).join('');

  container.innerHTML = `
    <div class="card tl3-head">
      <button type="button" class="btn btn-secondary" id="tlBackToSelectBtn">← Потери</button>
      <div class="tl3-title">Проверка TOP Losses
        <small>${escapeHtml(tlState.line)} · ${escapeHtml(fmtShortDate(period.date))} · ${period.shiftType === 'day' ? 'день' : 'ночь'} · бригада ${escapeHtml(letter || '—')}${tlCheck.brand ? ' · бренд ' + escapeHtml(tlCheck.brand) : ''}</small></div>
      <span class="tl2-sp"></span>
      <div class="tl3-chips">${chips}</div>
    </div>
    <div class="tl3-grid">
      <div class="card tl3-list" id="tlChecklistContainer">${items}</div>
      <aside class="card tl3-side" id="tlCheckSide"></aside>
    </div>`;
  updateTlCheckProgress();
}

/* Кольцо прогресса и кнопка сохранения */
function updateTlCheckProgress() {
  const side = $('#tlCheckSide');
  if (!side) return;
  const total = tlCheck.rows.length;
  let ok = 0, fail = 0;
  tlCheck.rows.forEach(r => {
    const s = tlCheck.answers[r.row.id]?.status;
    if (s === 'OK') ok++;
    else if (s === 'FAIL') fail++;
  });
  const done = ok + fail;
  const pOk = total ? ok / total * 100 : 0;
  const pFail = total ? fail / total * 100 : 0;
  side.innerHTML = `
    <div class="tl3-side-label">Прогресс</div>
    <div class="tl3-ring" style="--ok:${pOk}%;--fail:${pOk + pFail}%"><div>${done}/${total}<small>проверено</small></div></div>
    <div class="tl3-leg"><span>✓ ОК</span><b class="ok">${ok}</b><span>✕ Не ОК</span><b class="fail">${fail}</b><span>Осталось</span><b>${total - done}</b></div>
    <div class="tl2-sub">Можно сохранить и частично — непроверенные попадут в Историю как «не проверено».</div>
    <button type="button" class="btn btn-success tl3-save" id="tlSaveChecklistBtn" ${done ? '' : 'disabled'}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
      <span>Зафиксировать результат</span>
    </button>`;
}

/* Обновить одну карточку без перерисовки всего списка (фокус в полях не теряется) */
function tlCheckRefreshItem(id) {
  const item = document.querySelector(`#tlChecklistContainer .tl3-item[data-std-id="${CSS.escape(id)}"]`);
  const r = tlCheck.rows.find(x => x.row.id === id);
  if (!item || !r) return;
  const st = tlCheck.answers[id]?.status;
  item.classList.toggle('done-ok', st === 'OK');
  item.classList.toggle('done-fail', st === 'FAIL');
  const idx = tlCheck.rows.indexOf(r);
  item.querySelector('.tl3-num').textContent = st === 'OK' ? '✓' : st === 'FAIL' ? '✕' : idx + 1;
  item.querySelectorAll('[data-tl-ans]').forEach(b => b.classList.toggle('on', b.dataset.v === st));
  if (r.points) {
    item.querySelectorAll('.tl3-pt').forEach((lab, pi) => {
      const raw = String((tlCheck.answers[id]?.values || [])[pi] ?? '').trim().replace(',', '.');
      const p = r.points[pi];
      lab.classList.toggle('ok', raw !== '' && Number.isFinite(Number(raw)) && Number(raw) >= p.range.min && Number(raw) <= p.range.max);
      lab.classList.toggle('bad', raw !== '' && !lab.classList.contains('ok'));
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
          const raw = String(values[i] || '').replace(',', '.');
          const n = Number(raw);
          if (raw === '' || (Number.isFinite(n) && n >= p.range.min && n <= p.range.max)) return '';
          const [pt, norm] = p.label.split(' · ');
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

$('#tlChecklistView')?.addEventListener('click', (e) => {
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
    return tlCheckRefreshItem(id);
  }
  const com = e.target.closest('[data-tl-comment]');
  if (com) return openCommentModal(com.closest('.tl3-item'));
  const view = e.target.closest('[data-tl-view]');
  if (view && typeof openStandardView === 'function') openStandardView(view.dataset.tlView);
});

$('#tlChecklistView')?.addEventListener('input', (e) => {
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
