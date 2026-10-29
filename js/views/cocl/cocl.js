/* ============================================================
   ВКЛАДКА «CL при переходах»
   Панель условий, логика Change Over, аккордеон чек-листа.
   Модуль общего пространства имён: функции и переменные видны
   во всех файлах. Порядок подключения — index.html.
   ============================================================ */

/* ============================================================
   COCL: экран резюме после сохранения проверки
   ============================================================ */

function renderCoclSummary(record) {
  const container = $('#coclSummaryView');
  if (!container) return;

  // Статистика
  const total = record.items.length;
  const oks = record.items.filter(x => x.status === 'OK').length;
  const fails = record.items.filter(x => x.status === 'FAIL').length;
  const unchecked = record.items.filter(x => x.status === 'UNCHECKED').length;
  const checkedTotal = oks + fails;
  const percentOk = checkedTotal > 0 ? Math.round((oks / checkedTotal) * 100) : 0;
  const allOk = fails === 0 && unchecked === 0;

  const shieldClass = allOk ? 'tl-shield-ok' : 'tl-shield-fail';
  const shieldTitle = allOk ? 'Всё под контролем' : 'Требует внимания';

  const shieldSubParts = [];
  if (checkedTotal > 0) shieldSubParts.push(`Проверено: <strong>${checkedTotal}</strong> из ${total}`);
  if (fails > 0)        shieldSubParts.push(`вне нормы: <strong>${fails}</strong>`);
  if (unchecked > 0)    shieldSubParts.push(`<span class="tl-shield-sub-unchecked">не проверено: ${unchecked}</span>`);

  // Чипы стандартов
  const chipsHtml = record.items.slice(0, 20).map(it => {
    let cls;
    if (it.status === 'OK') cls = 'tl-shield-chip-ok';
    else if (it.status === 'FAIL') cls = 'tl-shield-chip-fail';
    else cls = 'tl-shield-chip-unchecked';

    const label = it.machine ? `${it.machine} · ${it.oplNumber || ''}` : (it.oplNumber || it.title || '—');
    return `<span class="tl-shield-chip ${cls}" title="${escapeAttr(it.title || '')}">
      <span class="tl-shield-chip-dot"></span>
      ${escapeHtml(label)}
    </span>`;
  }).join('');

  const chipMore = record.items.length > 20
    ? `<span class="tl-shield-chip">+${record.items.length - 20}</span>`
    : '';

  // Контекст
  let contextLine = '';
  if (record.type === 'ChangeOver') {
    contextLine = `Бренд: <strong>${escapeHtml(record.brandFrom)}</strong> → <strong>${escapeHtml(record.brandTo)}</strong>`;
  } else if (record.type === 'CL_TO') {
    contextLine = `Тип: <strong>CL в ТО</strong>`;
  } else if (record.type === 'CL_Conversion') {
    contextLine = `Тип: <strong>CL в Конвертацию</strong>`;
  }

  const html = `
    <div class="card tl-summary-card">
      <div class="tl-summary-head">
        <div class="tl-summary-icon tl-summary-icon-ok">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
        </div>
        <div>
          <div class="tl-summary-title">Проверка сохранена</div>
          <div class="tl-summary-sub">
            Оператор: <strong>${escapeHtml(record.operator)}</strong> ·
            Линия: <strong>${escapeHtml(record.line)}</strong> ·
            Часть: <strong>${escapeHtml(record.part)}</strong> ·
            Смена: <strong>${escapeHtml(record.shift)}</strong>
          </div>
          <div class="tl-summary-sub" style="margin-top:4px">
            ${contextLine}
          </div>
        </div>
      </div>
    </div>

    <div class="tl-shield ${shieldClass}">
      <div class="tl-shield-ring" style="--percent: ${percentOk}">
        <div class="tl-shield-ring-hole">
          <div class="tl-shield-ring-value">${percentOk}%</div>
          <div class="tl-shield-ring-label">ОК</div>
        </div>
      </div>
      <div class="tl-shield-info">
        <div class="tl-shield-title">${shieldTitle}</div>
        <div class="tl-shield-sub">${shieldSubParts.join(' · ')}</div>
        ${fails > 0 ? `
          <div class="tl-shield-journal-warning">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            <span>Есть отклонения. Зафиксируйте их в <strong>Journal Machines</strong>.</span>
          </div>
        ` : ''}
        <div class="tl-shield-chips">
          ${chipsHtml}
          ${chipMore}
        </div>
      </div>
    </div>

    <div class="tl-select-footer">
      <button class="btn btn-secondary" id="coclSummaryBackBtn">← К истории</button>
      <button class="btn btn-primary btn-icon-text" id="coclSummaryNewBtn">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="23 4 23 10 17 10"/>
          <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
        </svg>
        <span>Новая проверка</span>
      </button>
    </div>
  `;

  container.innerHTML = html;

  // Прячем чек-лист, показываем резюме
  $('#coclLayout').style.display = 'none';
  $('#coclSummaryView').style.display = 'block';
  if (typeof renderCoclHead === 'function') renderCoclHead();

  window.scrollTo({ top: 0, behavior: 'smooth' });

  // Обработчики
  $('#coclSummaryBackBtn')?.addEventListener('click', () => {
    // Сначала сброс, потом переключение
    resetCheckForm();
    if (typeof switchTab === 'function') switchTab('history');
  });

  $('#coclSummaryNewBtn')?.addEventListener('click', () => {
    // Сначала сброс, потом переключение на «Проверку»
    resetCheckForm();
    if (typeof switchTab === 'function') switchTab('check');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

/* ============================================================
   ВКЛАДКА ПРОВЕРКА
   ============================================================ */

/* Заполнение скрытого select линий (значение задаётся выбором из модалки) */
function fillLinesForOperator() {
  const el = $('#lineSelect');
  if (!el) return;
  // Все линии: бренды нужны только для Change Over (у PMD их может не быть)
  el.innerHTML = '<option value="">— выберите —</option>' +
    getLines().map(l => `<option>${escapeHtml(l)}</option>`).join('');
}

/* --- Установить линию в COCL (из модалки выбора) --- */
function setCoclLine(line) {
  const sel = $('#lineSelect');
  if (!sel) return;
  sel.value = line;

  const codeEl = $('#coclLinePillCode');
  if (codeEl) {
    const ctx = (line && typeof getBlockForLine === 'function') ? getBlockForLine(line) : null;
    const wsName = ctx ? ctx.workshop.name : '';
    codeEl.textContent = line ? (line + (wsName ? ' · ' + wsName : '')) : 'Выбрать линию';
  }

  sel.dispatchEvent(new Event('change'));
}

/* Сбросить выбор линии */
function clearCoclLine() {
  const codeEl = $('#coclLinePillCode');
  if (codeEl) codeEl.textContent = 'Выбрать линию';
  const ctxEl = $('#coclLineContext');
  if (ctxEl) { ctxEl.style.display = 'none'; ctxEl.innerHTML = ''; }
}

/* Кнопка-чип линии → модалка выбора линии */
$('#coclLinePill')?.addEventListener('click', () => {
  linePickerOnSelect = (line) => {
    setCoclLine(line);
  };
  openLinePickerModal();
});

/* Состояние вкладки: идёт ли проверка (до «Начать» — только список) */
const coclState = { checking: false };

/* Бренд дня линии из расписания брендов (если бренд есть у линии) */
function getCoclBrandOfDay(line) {
  if (!line || typeof getElectronicBrandForDate !== 'function') return '';
  const period = getCurrentShiftPeriod();
  const b = getElectronicBrandForDate(line, period.date) || '';
  return getBrandsForLine(line).includes(b) ? b : '';
}

/* Бренды линии → скрытые select + плитки. «С бренда» — бренд дня. */
function fillBrandsForLine(line) {
  const brands = getBrandsForLine(line);
  ['#brandFrom', '#brandTo'].forEach(sel => {
    const el = $(sel);
    el.innerHTML = '<option value="">— выберите —</option>' +
      brands.map(b => `<option>${escapeHtml(b)}</option>`).join('');
  });
  $('#brandFrom').value = getCoclBrandOfDay(line);
  renderCoclBrandTiles();
}

/* Выбор брендов «С» / «На»: кнопка + выпадающий список с поиском
   (названия брендов бывают длинными — плитки для них не годятся) */
function renderCoclBrandTiles() {
  const line = $('#lineSelect')?.value || '';
  const brands = line ? getBrandsForLine(line) : [];
  const from = $('#brandFrom')?.value || '';

  $$('.cocl-bsel').forEach(box => {
    const target = box.dataset.brandTarget;
    const value = $('#' + target)?.value || '';
    const val = box.querySelector('.cocl-bsel-val');
    val.innerHTML = value
      ? escapeHtml(value)
      : '<span class="cocl-bsel-ph">Выберите бренд</span>';
    box.classList.toggle('is-set', !!value);

    const pop = box.querySelector('.cocl-bsel-pop');
    if (pop.hidden) return;
    const q = String(box.querySelector('.cocl-bsel-search').value || '').trim().toLowerCase();
    const list = brands.filter(b => !q || b.toLowerCase().includes(q));
    box.querySelector('.cocl-bsel-list').innerHTML = list.length
      ? list.map(b => {
          const off = target === 'brandTo' && b === from;
          return `<button type="button" class="cocl-bsel-opt${b === value ? ' active' : ''}" data-brand="${escapeAttr(b)}"${off ? ' disabled title="Это бренд «С»"' : ''}>
            <span>${escapeHtml(b)}</span></button>`;
        }).join('')
      : `<div class="cocl-bsel-empty">${brands.length ? 'Ничего не найдено' : 'У линии нет брендов — добавьте их в Настройках'}</div>`;
  });
}

function closeCoclBrandPops(except) {
  $$('.cocl-bsel-pop').forEach(p => { if (p !== except) p.hidden = true; });
  $$('.cocl-bsel').forEach(b => b.classList.toggle('is-open', !b.querySelector('.cocl-bsel-pop').hidden));
}

/* Выпадающие списки брендов и «поменять местами» */
$('#brandsCard')?.addEventListener('click', (e) => {
  if (coclState.checking) return;
  const box = e.target.closest('.cocl-bsel');

  if (e.target.closest('.cocl-bsel-btn')) {
    const pop = box.querySelector('.cocl-bsel-pop');
    const open = pop.hidden;
    closeCoclBrandPops();
    pop.hidden = !open;
    box.classList.toggle('is-open', open);
    if (open) {
      box.querySelector('.cocl-bsel-search').value = '';
      renderCoclBrandTiles();
      box.querySelector('.cocl-bsel-search').focus();
      box.querySelector('.cocl-bsel-opt.active')?.scrollIntoView({ block: 'nearest' });
    }
    return;
  }

  const opt = e.target.closest('.cocl-bsel-opt');
  if (opt && !opt.disabled) {
    const target = box.dataset.brandTarget;
    $('#' + target).value = opt.dataset.brand;
    if (target === 'brandFrom' && $('#brandTo').value === opt.dataset.brand) $('#brandTo').value = '';
    closeCoclBrandPops();
    $('#' + target).dispatchEvent(new Event('change'));
    return;
  }

  if (e.target.closest('#coclBrandSwap')) {
    const f = $('#brandFrom'), t = $('#brandTo');
    [f.value, t.value] = [t.value, f.value];
    f.dispatchEvent(new Event('change'));
  }
});

$('#brandsCard')?.addEventListener('input', (e) => {
  if (e.target.classList.contains('cocl-bsel-search')) renderCoclBrandTiles();
});

$('#brandsCard')?.addEventListener('keydown', (e) => {
  if (!e.target.classList.contains('cocl-bsel-search')) return;
  if (e.key === 'Escape') { closeCoclBrandPops(); return; }
  if (e.key === 'Enter') {
    e.preventDefault();
    e.target.closest('.cocl-bsel').querySelector('.cocl-bsel-opt:not(:disabled)')?.click();
  }
});

/* Клик вне списка — закрыть */
document.addEventListener('click', (e) => {
  if (!e.target.closest('.cocl-bsel')) closeCoclBrandPops();
});

$('#lineSelect').addEventListener('change', () => {
  const line = $('#lineSelect').value;
  $('#brandFrom').value = '';
  $('#brandTo').value = '';
  if (line) fillBrandsForLine(line);
  renderCoclLineContext(line);
  renderCoclPartStep(line);
  if (line && $('#transitionType').value === 'ChangeOver') renderMaterialChanges();
  updateChecklist();
});

/* --- Контекст выбранной линии: Цех · Участок · Блок · смена --- */
function renderCoclLineContext(line) {
  const el = $('#coclLineContext');
  if (!el) return;

  const ctx = (line && typeof getBlockForLine === 'function') ? getBlockForLine(line) : null;
  if (!ctx) {
    el.style.display = 'none';
    el.innerHTML = '';
    return;
  }

  const chips = [
    { cls: 'cocl-ctx-workshop', text: ctx.workshop.name },
    { cls: 'cocl-ctx-area',     text: ctx.area.name },
    ctx.block ? { cls: 'cocl-ctx-block', text: ctx.block.name } : null
  ].filter(Boolean);

  const period = getCurrentShiftPeriod();
  const shiftLetter = (getShiftsForDate(period.date) || {})[period.shiftType] || '—';
  const user = getCurrentUser();
  const autoText = [
    user ? 'Оператор: ' + user : null,
    (period.shiftType === 'day' ? 'День' : 'Ночь') + ' · ' + shiftLetter
  ].filter(Boolean).join(' · ');

  el.innerHTML = chips
    .map(c => `<span class="cocl-ctx-chip ${c.cls}">${escapeHtml(c.text)}</span>`)
    .join('') + `<span class="cocl-ctx-auto">${escapeHtml(autoText)}</span>`;
  el.style.display = 'flex';
}

/* --- Часть линии: только для SMD, иначе скрыта --- */
function renderCoclPartStep(line) {
  const partField = $('#partSelectField');
  const partSelect = $('#partSelect');
  if (!partField || !partSelect) return;

  const needsPart = (line ? getWorkshopIdForLine(line) : null) === 'smd';
  partField.style.display = needsPart ? '' : 'none';
  if (!needsPart) partSelect.value = '';
}

$('#partSelect')?.addEventListener('change', () => {
  // Триггеры «Что меняется» зависят от части линии
  if ($('#transitionType').value === 'ChangeOver') renderMaterialChanges();
  updateChecklist();
});

/* Кнопки Maker / Packer → скрытый #partSelect */
$('#coclPartSeg')?.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-part]');
  if (!btn || coclState.checking) return;
  const sel = $('#partSelect');
  sel.value = btn.dataset.part;
  sel.dispatchEvent(new Event('change'));
});

/* Активные кнопки, плитки брендов и счётчики стандартов на кнопках */
function updateCoclStepStates() {
  const line = $('#lineSelect')?.value || '';
  const type = $('#transitionType')?.value || '';
  const part = $('#partSelect')?.value || '';
  const needsPart = (line ? getWorkshopIdForLine(line) : null) === 'smd';

  $$('#coclPartSeg [data-part]').forEach(b => b.classList.toggle('active', b.dataset.part === part));
  $$('#typeSelector .type-option').forEach(b => b.classList.toggle('active', b.dataset.value === type));
  renderCoclBrandTiles();

  const base = {
    line,
    brandFrom: $('#brandFrom')?.value || '',
    brandTo: $('#brandTo')?.value || '',
    triggers: getSelectedTriggers()
  };
  const fmt = (n) => line ? String(n) : '';

  // На кнопках типа: с текущей частью (если не выбрана — обе части)
  $$('[data-count-type]').forEach(el => {
    const t = el.dataset.countType;
    const parts = (needsPart && !part) ? ['Maker', 'Packer'] : [part];
    const n = parts.reduce((s, p) => s + getCoclRelevant({ ...base, type: t, part: p, loose: true }).length, 0);
    el.textContent = fmt(n);
    el.classList.toggle('is-zero', line && n === 0);
  });

  // На кнопках части: с текущим типом (если не выбран — все типы)
  // Число на кнопке — с учётом брендов и триггеров; «есть ли стандарты у части» (partHas) —
  // без них, иначе выбранные бренды без отличий блокируют обе части и выбор не вернуть
  const partCount = {}, partHas = {};
  $$('[data-count-part]').forEach(el => {
    const p = el.dataset.countPart;
    const types = type ? [type] : ['ChangeOver', 'CL_TO', 'CL_Conversion'];
    const ids = new Set();
    types.forEach(tp => getCoclRelevant({ ...base, type: tp, part: p, loose: true }).forEach(s => ids.add(s.id)));
    el.textContent = fmt(ids.size);
    el.classList.toggle('is-zero', line && ids.size === 0);
    partCount[p] = ids.size;
    partHas[p] = types.reduce((s, tp) => s + getCoclRelevant({ line, type: tp, part: p, loose: true }).length, 0);
  });

  // Часть без стандартов вообще не выбрать; если стандарты есть только у одной части — выбираем её сами
  const locked = coclState.checking;
  $$('#coclPartSeg [data-part]').forEach(b => { b.disabled = !!(line && type && partHas[b.dataset.part] === 0); });
  if (needsPart && type && !locked) {
    const withStd = ['Maker', 'Packer'].filter(p => partHas[p] > 0);
    // Стандартов нет ни у одной части — выбранную раньше часть сбрасываем
    const target = withStd.length === 1 && part !== withStd[0] ? withStd[0]
      : (part && partHas[part] === 0 ? (withStd[0] || '__reset') : '');
    if (target) {
      const sel = $('#partSelect');
      sel.value = target === '__reset' ? '' : target;
      sel.dispatchEvent(new Event('change'));
      return true;
    }
  }
  return false;
}

/* Вход на вкладку: без линии — экран выбора линии (cocl-pick.js) */
function openCoclTab() {
  updateCoclStepStates();
  updateCoclPick();
}

/* Клик по кнопке типа проверки */
$('#typeSelector')?.addEventListener('click', (e) => {
  const btn = e.target.closest('.type-option');
  if (!btn || coclState.checking) return;
  $('#transitionType').value = btn.dataset.value;
  onTransitionTypeChange();
});

$('#transitionType').addEventListener('change', onTransitionTypeChange);

function onTransitionTypeChange() {
  const isCo = $('#transitionType').value === 'ChangeOver';
  // Бренды и «Что меняется» — только для Change Over
  $('#brandsCard').style.display = isCo ? '' : 'none';
  $('#changesCard').style.display = isCo ? '' : 'none';
  if (isCo) renderMaterialChanges();
  updateChecklist();
}

function renderMaterialChanges() {
  const c = $('#changesContainer');
  const part = $('#partSelect').value;   // Maker / Packer
  const line = $('#lineSelect').value;

  // Триггеры цеха этой линии (в SMD — с учётом части линии)
  const items = getTriggersForWorkshop(line ? getWorkshopIdForLine(line) : null, part);
  const checked = new Set($$('#changesContainer input[data-change]:checked').length
    ? [...$$('#changesContainer input[data-change]:checked')].map(cb => cb.value) : []);

  if (!items.length) {
    c.innerHTML = '<div class="cocl-sec-hint">Триггеры не настроены — Настройки → «Триггеры».</div>';
    return;
  }

  c.innerHTML = '<div class="cocl-changes">' +
    items.map(m => `<label class="cocl-change${checked.has(m.value) ? ' checked' : ''}">
      <input type="checkbox" value="${escapeHtml(m.value)}" data-change${checked.has(m.value) ? ' checked' : ''}>${escapeHtml(m.label)}</label>`
    ).join('') + '</div>';

  c.querySelectorAll('input[data-change]').forEach(cb => {
    cb.addEventListener('change', (e) => {
      e.target.closest('label').classList.toggle('checked', e.target.checked);
      updateChecklist();
    });
  });
}

$('#brandFrom').addEventListener('change', () => updateChecklist());
$('#brandTo').addEventListener('change', () => updateChecklist());

function getSelectedTriggers() {
  const triggers = [];
  // Триггеры «Что меняется» — только для Change Over
  if ($('#transitionType')?.value !== 'ChangeOver') return triggers;
  $$('#changesContainer input[data-change]:checked').forEach(cb => {
    if (cb.value === 'tobacco_materials') triggers.push('tobacco', 'materials');
    else triggers.push(cb.value);
  });
  return triggers;
}

/* ============================================================
   Показ стандарта в Change Over — логика «отличий точек»
   ============================================================ */

/**
 * Эффективный блок точек для бренда:
 * сначала блок конкретного бренда, иначе блок «Все бренды» (brand === '').
 */
function getEffectiveBrandBlock(blocks, brand) {
  if (!Array.isArray(blocks) || !blocks.length) return null;
  const exact = blocks.find(b =>
    b && b.brand === brand && Array.isArray(b.points) && b.points.length > 0
  );
  if (exact) return exact;
  const universal = blocks.find(b =>
    b && (b.brand === '' || b.brand == null) && Array.isArray(b.points) && b.points.length > 0
  );
  return universal || null;
}

/** true, если наборы точек различаются (по числу точек или значению хотя бы одной) */
function brandBlocksDiffer(blockA, blockB) {
  const pa = (blockA && Array.isArray(blockA.points))
    ? blockA.points.map(p => String((p && p.value) || '').trim())
    : [];
  const pb = (blockB && Array.isArray(blockB.points))
    ? blockB.points.map(p => String((p && p.value) || '').trim())
    : [];
  if (pa.length !== pb.length) return true;
  return pa.some((v, i) => v !== pb[i]);
}

/** Триггеры стандарта: без триггеров — показывается; с триггерами — при совпадении */
function standardMatchesTriggers(st, selectedTriggers) {
  if (!st.triggers || !st.triggers.length) return true;
  return st.triggers.some(t => selectedTriggers.includes(t));
}

/**
 * Стандарты под условия. loose: для счётчиков Change Over без выбранных
 * брендов — все стандарты Change Over линии (бренды ещё не известны).
 */
function getCoclRelevant({ type, line, part, brandFrom, brandTo, triggers, loose }) {
  if (!type || !line) return [];
  const coBrands = type === 'ChangeOver' && brandTo;
  if (type === 'ChangeOver' && !brandTo && !loose) return [];

  return getStandards().filter(st => {
    if (st.active === false) return false;
    if (!st.appliesTo || !st.appliesTo.includes(type)) return false;
    if (st.line !== line) return false;
    if (part && st.nodePart && st.nodePart !== part) return false;
    if (type !== 'ChangeOver') return true;

    const blocks = Array.isArray(st.measurements) ? st.measurements : [];
    if (!coBrands) return blocks.length > 0 || st.forceInChangeOver === true;
    if (!blocks.length) return false;

    const blockTo = getEffectiveBrandBlock(blocks, brandTo);
    if (!blockTo) return false;
    // Без принудительного показа — только при отличии точек целевого бренда
    if (st.forceInChangeOver !== true) {
      const blockFrom = getEffectiveBrandBlock(blocks, brandFrom);
      if (blockFrom && !brandBlocksDiffer(blockFrom, blockTo)) return false;
    }
    return standardMatchesTriggers(st, triggers || []);
  });
}

/* Пересчитать список справа по текущим условиям */
function updateChecklist() {
  const type = $('#transitionType').value;
  const line = $('#lineSelect').value;
  const part = $('#partSelect').value;
  const brandFrom = $('#brandFrom')?.value || '';
  const brandTo = $('#brandTo')?.value || '';

  // Часть выбрана автоматически — список уже перестроен по событию change
  if (updateCoclStepStates()) return;
  if (typeof renderCoclHead === 'function') renderCoclHead();
  if (coclState.checking) return;

  const info = $('#coclBuildInfo');
  const btn = $('#buildChecklistBtn');
  const c = $('#checklistContainer');
  const needsPart = (line ? getWorkshopIdForLine(line) : null) === 'smd';

  // На линии нет стандартов этого типа ни у одной части — выбирать часть незачем
  if (line && type && needsPart && !part &&
      ['Maker', 'Packer'].every(p => !getCoclRelevant({ type, line, part: p, loose: true }).length)) {
    if (info) info.textContent = '';
    if (btn) btn.disabled = true;
    c.innerHTML = '<div class="cocl-empty cocl-empty-ok">На линии нет стандартов под этот тип проверки.</div>';
    updateProgress();
    return;
  }

  // Чего не хватает для списка
  let waiting = '';
  if (!line) waiting = 'Выберите линию';
  else if (!type) waiting = 'Выберите тип проверки';
  else if (needsPart && !part) waiting = 'Выберите часть линии — Maker или Packer';
  else if (type === 'ChangeOver' && !brandFrom) waiting = 'Выберите бренд, с которого переходите';
  else if (type === 'ChangeOver' && !brandTo) waiting = 'Выберите бренд, на который переходите';

  if (waiting) {
    if (info) info.textContent = '';
    if (btn) btn.disabled = true;
    c.innerHTML = `<div class="cocl-empty">${escapeHtml(waiting)}</div>`;
    updateProgress();
    return;
  }

  const relevant = getCoclRelevant({ type, line, part, brandFrom, brandTo, triggers: getSelectedTriggers() });

  if (info) {
    const totalTxt = formatCilDuration(relevant.reduce((s, st) => s + cilRowDurationSec(st), 0));
    info.textContent = relevant.length
      ? `${relevant.length} ${pluralizeStandards(relevant.length)} к проверке${totalTxt ? ` · ∑ ${totalTxt}` : ''}`
      : '';
  }
  if (btn) btn.disabled = relevant.length === 0;

  if (!relevant.length) {
    c.innerHTML = `<div class="cocl-empty cocl-empty-ok">${type === 'ChangeOver'
      ? `Для ${escapeHtml(brandFrom)} → ${escapeHtml(brandTo)} нет стандартов с отличающимися точками — проверять нечего.`
      : 'Под эти условия стандартов нет.'}</div>`;
    updateProgress();
    return;
  }

  renderChecklist(relevant);
}

const COCL_TYPE_LABELS = { ChangeOver: 'Смена сорта', CL_TO: 'CL в ТО', CL_Conversion: 'CL в Конвертацию' };

/* Чек-лист: строки стандартов, сгруппированные по машинам.
   До «Начать проверку» — список с нормой текстом. Во время проверки —
   окно «список слева — стандарт справа» (js/components/check-run.js). */
function renderChecklist(items) {
  const c = $('#checklistContainer');
  const type = $('#transitionType').value;
  const brandFrom = (type === 'ChangeOver') ? $('#brandFrom').value : '';
  const brandTo = (type === 'ChangeOver') ? $('#brandTo').value : '';
  const checking = !!coclState.checking;

  // Группы по машинам — в порядке появления
  const groups = [];
  items.forEach(st => {
    const key = st.machine || '—';
    let g = groups.find(x => x.key === key);
    if (!g) { g = { key, items: [] }; groups.push(g); }
    g.items.push(st);
  });

  const pointCell = (m, i, showNum) => {
    const head = `${showNum ? `Т.${i + 1} · ` : ''}норма <b>${escapeHtml(m.value || '—')}</b>`;
    // Точка-метка (словами или без числовой нормы) — ОК / Не ОК вместо поля
    if (isNormMark(m.value) || !parseNorm(m.value)) {
      return `
      <div class="checklist-point-cell cocl-pt-mark" data-point-index="${i}" data-mark="1">
        <span class="cocl-pt-norm">${head}<span class="checklist-point-status" data-point-status="${i}"></span></span>
        <input type="hidden" class="checklist-point-input" data-point-input="${i}" value="">
        <span class="cocl-mark-btns">
          <button type="button" class="cocl-mark-ok" data-cocl-mark="ОК">ОК</button>
          <button type="button" class="cocl-mark-fail" data-cocl-mark="Не ОК">Не ОК</button>
        </span>
      </div>`;
    }
    const norm = parseNorm(m.value);
    const normData = norm ? JSON.stringify(norm).replace(/"/g, '&quot;') : '';
    return `
      <label class="checklist-point-cell" data-point-index="${i}" data-norm='${normData}'>
        <span class="cocl-pt-norm">${head}<span class="checklist-point-status" data-point-status="${i}"></span></span>
        <input type="text" inputmode="decimal" class="checklist-point-input" data-point-input="${i}" autocomplete="off">
      </label>`;
  };

  let n = 0;
  const rowHtml = (st) => {
    n++;
    const blocks = Array.isArray(st.measurements) ? st.measurements : [];
    const block = (type === 'ChangeOver' && brandTo) ? getEffectiveBrandBlock(blocks, brandTo) : (blocks[0] || null);
    const points = block && Array.isArray(block.points) ? block.points : [];
    const isOkNotOk = migrateControlType(st.controlType, st.measurements) === 'fixed' && pointsAreMarksOnly(points);

    // Норма текстом (для списка до начала проверки)
    let normText = '';
    if (isOkNotOk) normText = marksText(points) || 'ОК / Не ОК';
    else if (points.length === 1) normText = points[0].value || '—';
    else normText = `${points.length} ${points.length < 5 ? 'точки' : 'точек'}`;

    const meta = [st.oplNumber, st.node, block && block.brand ? 'бренд ' + block.brand : ''].filter(Boolean)
      .map(escapeHtml).join(' · ');
    const eyeAttrs = `data-view-btn data-std-id="${escapeAttr(st.id)}"`;

    // До начала проверки — строка списка с нормой
    if (!checking) {
      return `
      <div class="cocl-acc-item cocl-row" data-std-id="${st.id}" data-status="unchecked">
        <div class="cocl-row-main">
          <div class="cocl-row-title">
            <div class="cocl-acc-title">${escapeHtml(st.title || '—')}</div>
            <div class="cocl-acc-meta">${meta}</div>
          </div>
          <span class="cocl-row-norm">${escapeHtml(normText)}</span>
          ${cilDurChip(cilRowDurationSec(st), 'cocl-row-time')}
          <div class="cocl-row-tools">
            <button type="button" class="cocl-acc-view-btn" ${eyeAttrs} title="Посмотреть стандарт">${CHK_ICONS.eye}</button>
          </div>
        </div>
      </div>`;
    }

    let ans = '';
    if (isOkNotOk) {
      const marks = marksText(points);
      ans = `
        ${marks ? `<div class="cocl-marks">Должно совпадать: <b>${escapeHtml(marks)}</b></div>` : ''}
        <div class="cocl-okfail">
          <label><input type="radio" name="ans_${st.id}" value="OK" data-ans><span>ОК</span></label>
          <label><input type="radio" name="ans_${st.id}" value="FAIL" data-ans><span>Не ОК</span></label>
        </div>`;
    } else if (points.length) {
      ans = `<div class="cocl-pts">${points.map((m, i) => pointCell(m, i, points.length > 1)).join('')}</div>`;
    }

    const photosHtml = typeof photoSliderHtml === 'function' ? photoSliderHtml(st) : '';
    return `
      <div class="cocl-acc-item chk-item" data-std-id="${st.id}" data-status="unchecked">
        <div class="chk-entry" data-chk-pick>${chkEntryInner({ n, opl: st.oplNumber, title: st.title })}</div>
        ${chkDetailHtml({
          opl: st.oplNumber,
          meta: [st.machine, st.node, st.nodePart],
          title: st.title,
          tool: st.tool,
          durationSec: cilRowDurationSec(st),
          changeOver: type === 'ChangeOver' ? { from: brandFrom, to: brandTo } : null,
          brand: type !== 'ChangeOver' && block && block.brand ? block.brand : '',
          eyeAttrs,
          inputsHtml: ans ? `<div class="cocl-row-input">${ans}</div>` : '',
          how: st.controlDescription,
          photosHtml,
          photosAttrs: `data-std-photos="${escapeAttr(st.id)}"`
        })}
      </div>`;
  };

  const groupsHtml = groups.map(g => `
    <div class="cocl-group">
      <div class="cocl-group-head">${escapeHtml(g.key)}<span>${g.items.length}</span></div>
      ${g.items.map(rowHtml).join('')}
    </div>`).join('');

  if (checking) {
    const line = $('#lineSelect').value;
    const part = $('#partSelect')?.value || '';
    const title = [COCL_TYPE_LABELS[type] || 'Проверка', line, part].filter(Boolean).map(escapeHtml).join(' · ');
    c.innerHTML = chkLeftHeadHtml({
        title,
        backHtml: `<button type="button" class="chk-back" data-cocl-edit>Изменить условия</button>`
      })
      + groupsHtml
      + chkLeftFootHtml('data-cocl-save');
  } else {
    c.innerHTML = groupsHtml;
  }

  bindCoclAccordionEvents();
  c.querySelectorAll('[data-std-photos]').forEach(box => {
    const st = items.find(x => x.id === box.dataset.stdPhotos);
    if (st) bindPhotoSlider(box, st);
  });
  if (checking) coclSelectItem(c.querySelector('.cocl-acc-item'), false);
  updateProgress();
}

/* ============================================================
   COCL: строки чек-листа — обработчики
   ============================================================ */

function bindCoclAccordionEvents() {
  const c = $('#checklistContainer');
  if (!c) return;

  // --- Глазик — просмотр стандарта ---
  c.querySelectorAll('[data-view-btn]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const stdId = btn.dataset.stdId;
      if (!stdId || typeof openStandardView !== 'function') return;
      const to = $('#brandTo')?.value || '';
      const isCo = $('#transitionType')?.value === 'ChangeOver' && to;
      openStandardView(stdId, isCo
        ? { brand: to, changeOver: { from: $('#brandFrom')?.value || '', to } }
        : { brand: to });
    });
  });

  // --- Radio ОК / Не ОК ---
  c.querySelectorAll('input[data-ans]').forEach(r => {
    r.addEventListener('change', (e) => {
      const item = e.target.closest('.cocl-acc-item');
      const val = e.target.value;
      updateCoclItemStatus(item, val === 'OK' ? 'ok' : 'fail');
      updateProgress();
      if (val === 'OK') coclAdvanceLater(item);
    });
  });

  // --- Поля ввода значений (для value_input / range_input) ---
  c.querySelectorAll('.checklist-point-input').forEach(inp => {
    inp.addEventListener('input', (e) => {
      const cell = e.target.closest('.checklist-point-cell');
      const statusEl = cell.querySelector('[data-point-status]');
      const normStr = cell.dataset.norm;
      const item = cell.closest('.cocl-acc-item');

      // Сброс
      cell.classList.remove('point-ok', 'point-fail');
      if (statusEl) {
        statusEl.textContent = '';
        statusEl.className = 'checklist-point-status';
      }

      if (e.target.value === '') {
        updateCoclItemStatusFromPoints(item);
        updateProgress();
        return;
      }

      const val = parseFloat(String(e.target.value).replace(',', '.'));
      if (isNaN(val)) {
        updateCoclItemStatusFromPoints(item);
        updateProgress();
        return;
      }

      // Проверка по норме
      if (normStr) {
        let norm = null;
        try { norm = JSON.parse(normStr); } catch(_) {}

        if (norm && typeof norm.min === 'number' && typeof norm.max === 'number') {
          const inRange = val >= norm.min && val <= norm.max;
          cell.classList.add(inRange ? 'point-ok' : 'point-fail');
          if (statusEl) {
            statusEl.textContent = inRange ? '✓' : '✕';
            statusEl.className = 'checklist-point-status ' + (inRange ? 'ok' : 'fail');
          }
        }
      }

      updateCoclItemStatusFromPoints(item);
      updateProgress();
    });
  });

  // --- Точка-метка: ОК / Не ОК пишется в скрытое поле точки, повторный клик снимает ---
  c.querySelectorAll('[data-cocl-mark]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const cell = btn.closest('.checklist-point-cell');
      const inp = cell.querySelector('.checklist-point-input');
      inp.value = inp.value === btn.dataset.coclMark ? '' : btn.dataset.coclMark;
      cell.querySelectorAll('[data-cocl-mark]').forEach(b => b.classList.toggle('on', b.dataset.coclMark === inp.value));
      cell.classList.remove('point-ok', 'point-fail');
      const statusEl = cell.querySelector('[data-point-status]');
      if (inp.value) cell.classList.add(inp.value === 'ОК' ? 'point-ok' : 'point-fail');
      if (statusEl) {
        statusEl.textContent = inp.value ? (inp.value === 'ОК' ? '✓' : '✕') : '';
        statusEl.className = 'checklist-point-status' + (inp.value ? (inp.value === 'ОК' ? ' ok' : ' fail') : '');
      }
      const mItem = cell.closest('.cocl-acc-item');
      updateCoclItemStatusFromPoints(mItem);
      updateProgress();
      if (mItem.dataset.status === 'ok' && inp.value) coclAdvanceLater(mItem);
    });
  });

  // --- Enter — к следующему полю (метки пропускаем: их отмечают кнопками) ---
  c.querySelectorAll('.checklist-point-input').forEach(inp => {
    inp.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      const item = inp.closest('.cocl-acc-item');
      const all = [...item.querySelectorAll('input.checklist-point-input[type="text"]')];
      const next = all[all.indexOf(inp) + 1];
      if (next) next.focus();
      else coclStep(item, 1);
    });
  });

  // --- Комментарий к пункту (обязателен при отклонении) ---
  c.querySelectorAll('[data-chk-comment]').forEach(ta => {
    ta.addEventListener('input', () => {
      ta.closest('.cocl-acc-item').dataset.comment = ta.value.trim();
      updateProgress();
    });
  });

  // --- Шапка и низ левой панели ---
  c.querySelector('[data-cocl-edit]')?.addEventListener('click', () => editChecklistConditions());
  c.querySelector('[data-cocl-save]')?.addEventListener('click', saveCoclCheck);

  // --- Список слева: выбор стандарта; кнопки «Предыдущий / Следующий» ---
  c.querySelectorAll('[data-chk-pick]').forEach(entry => {
    entry.addEventListener('click', () => coclSelectItem(entry.closest('.cocl-acc-item'), true));
  });
  c.querySelectorAll('[data-chk-nav]').forEach(btn => {
    btn.addEventListener('click', () => coclStep(btn.closest('.cocl-acc-item'), +btn.dataset.chkNav));
  });
}

/* Показать стандарт справа. focus — перейти к первому полю ввода */
function coclSelectItem(item, focus) {
  const c = $('#checklistContainer');
  if (!c || !item) return;
  c.querySelectorAll('.cocl-acc-item.is-active').forEach(x => x.classList.remove('is-active'));
  item.classList.add('is-active');
  item.querySelector('.chk-entry')?.scrollIntoView({ block: 'nearest' });
  if (focus) {
    const f = item.querySelector('.chk-detail input[type="text"].checklist-point-input, .chk-detail input[data-ans]');
    if (f) f.focus({ preventScroll: true });
  }
}

/* Соседний стандарт списка (dir = 1 / -1) */
function coclStep(item, dir) {
  const all = [...$$('#checklistContainer .cocl-acc-item')];
  const next = all[all.indexOf(item) + dir];
  if (next) coclSelectItem(next, true);
}

/* После «ОК» — к следующему, если оператор ещё на этом стандарте */
function coclAdvanceLater(item) {
  setTimeout(() => {
    if (item.classList.contains('is-active') && item.dataset.status === 'ok') coclStep(item, 1);
  }, 350);
}

/** Обновить статус свёрнутой строки по явному ответу (radio ОК/Не ОК) */
function updateCoclItemStatus(item, status) {
  item.dataset.status = status;
  const ic = item.querySelector('[data-acc-status]');
  if (ic) ic.dataset.accStatus = status;
}

/** Обновить статус свёрнутой строки по точкам (value_input / range_input) */
function updateCoclItemStatusFromPoints(item) {
  const cells = item.querySelectorAll('.checklist-point-cell');
  if (!cells.length) return;

  let allFilled = true;
  let anyFail = false;

  cells.forEach(cell => {
    const inp = cell.querySelector('.checklist-point-input');
    if (!inp || inp.value === '') { allFilled = false; return; }
    if (cell.classList.contains('point-fail')) anyFail = true;
  });

  if (!allFilled) {
    // Пока не всё заполнено — оставляем "не проверено"
    updateCoclItemStatus(item, 'unchecked');
    return;
  }

  // Все заполнены — итог
  updateCoclItemStatus(item, anyFail ? 'fail' : 'ok');
}

function updateProgress() {
  const c = $('#checklistContainer');
  const items = $$('#checklistContainer .cocl-acc-item');
  if (!c || !items.length || !coclState.checking) return;
  let filled = 0;
  let fails = 0;
  items.forEach(item => {
    const status = item.dataset.status;
    if (status === 'ok' || status === 'fail') filled++;
    if (status === 'fail') fails++;
    chkMarkComment(item, status === 'fail');
  });
  chkUpdateProgress(c, filled, items.length, fails);
}

/* ============================================================
   COCL: Сворачивание верхней части и показ чек-листа
   ============================================================ */

/** Начать проверку: условия фиксируются, список становится чек-листом */
function buildChecklistView() {
  if ($('#buildChecklistBtn')?.disabled) return;
  coclState.checking = true;
  setCoclCheckingUi(true);
  updateChecklistForCheck();
  $('#checklistContainer .checklist-point-input')?.focus();
}

/* Перерисовать текущий список уже в режиме проверки */
function updateChecklistForCheck() {
  const relevant = getCoclRelevant({
    type: $('#transitionType').value,
    line: $('#lineSelect').value,
    part: $('#partSelect').value,
    brandFrom: $('#brandFrom').value,
    brandTo: $('#brandTo').value,
    triggers: getSelectedTriggers()
  });
  renderChecklist(relevant);
}

/* Вид панелей: проверка идёт / не идёт */
/* Во время проверки условия скрыты: на всю ширину — окно «список — стандарт» */
function setCoclCheckingUi(on) {
  $('#checklistContainer')?.classList.toggle('cocl-preview', !on);
  $('#checklistContainer')?.classList.toggle('chk-run', on);
  $('#coclLayout')?.classList.toggle('is-checking', on);
  if (typeof updateCoclPick === 'function') updateCoclPick();
}

/** Вернуться к условиям: введённые значения теряются — спросить */
function editChecklistConditions() {
  const entered = [...$$('#checklistContainer .checklist-point-input')].some(i => i.value !== '')
    || $$('#checklistContainer input[data-ans]:checked').length > 0;
  if (entered && !confirm('Введённые значения не сохранены и будут сброшены. Изменить условия?')) return;
  coclState.checking = false;
  setCoclCheckingUi(false);
  updateChecklist();
}

// Обработчики
$('#buildChecklistBtn')?.addEventListener('click', buildChecklistView);
