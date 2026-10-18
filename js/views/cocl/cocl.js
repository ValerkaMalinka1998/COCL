/* ============================================================
   ВКЛАДКА «Проверка COCL»
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
  $('#checklistCard').style.display = 'none';
  $('#coclSummaryView').style.display = 'block';

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
  const available = getAvailableLines();
  if (!available.length) {
    el.innerHTML = '<option value="">— нет доступных линий (добавьте бренды в Настройках) —</option>';
    return;
  }
  el.innerHTML = '<option value="">— выберите —</option>' +
    available.map(l => `<option>${escapeHtml(l)}</option>`).join('');
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

/* Текущий пользователь (автовход). Пока автовхода нет — пусто, а вызывающий
   код пишет «—». Когда появится SSO, он положит ФИО в 'cl_current_user'. */
function getCurrentUser() {
  try {
    const v = localStorage.getItem('cl_current_user');
    if (v && String(v).trim()) return String(v).trim();
  } catch (e) {}
  return '';
}

/* Кнопка-чип линии → модалка выбора линии */
$('#coclLinePill')?.addEventListener('click', () => {
  linePickerOnSelect = (line) => {
    setCoclLine(line);
  };
  openLinePickerModal();
});

function fillBrandsForLine(line) {
  const brands = getBrandsForLine(line);
  ['#brandFrom','#brandTo'].forEach(sel => {
    const el = $(sel);
    el.innerHTML = '<option value="">— выберите —</option>' +
      brands.map(b => `<option>${escapeHtml(b)}</option>`).join('');
  });
  updateBrandToOptions();
}

/* Обновить опции brandTo (все бренды линии) */
function updateBrandToOptions() {
  const line = $('#lineSelect').value;
  const brandToSelect = $('#brandTo');
  if (!brandToSelect || !line) return;

  const brands = getBrandsForLine(line);

  const currentValue = brandToSelect.value;
  brandToSelect.innerHTML = '<option value="">— выберите —</option>' +
    brands.map(b => `<option>${escapeHtml(b)}</option>`).join('');

  // Восстанавливаем выбор, если он ещё доступен
  if (brands.includes(currentValue)) {
    brandToSelect.value = currentValue;
  }

  brandToSelect.classList.remove('input-error');
}

$('#lineSelect').addEventListener('change', () => {
  const line = $('#lineSelect').value;
  $('#brandFrom').value = '';
  $('#brandTo').value = '';
  if (line) fillBrandsForLine(line);
  renderCoclLineContext(line);
  renderCoclPartStep(line);
  updateChecklist();
});

/* --- Контекст выбранной линии: Цех · Участок · Блок --- */
function renderCoclLineContext(line) {
  const el = $('#coclLineContext');
  if (!el) return;

  if (!line || typeof getBlockForLine !== 'function') {
    el.style.display = 'none';
    el.innerHTML = '';
    return;
  }

  const ctx = getBlockForLine(line);
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

  // Автовход: показываем, кто проверяет и какая смена сейчас активна
  const period = getCurrentShiftPeriod();
  const shiftLetter = (getShiftsForDate(period.date) || {})[period.shiftType] || '—';
  const user = getCurrentUser();
  const autoText = [
    user ? 'Оператор: ' + user : null,
    (period.shiftType === 'day' ? 'День' : 'Ночь') + ' · бригада ' + shiftLetter
  ].filter(Boolean).join(' · ');

  el.innerHTML = chips
    .map(c => `<span class="cocl-ctx-chip ${c.cls}">${escapeHtml(c.text)}</span>`)
    .join('') + `<span class="cocl-ctx-auto">${escapeHtml(autoText)}</span>`;
  el.style.display = 'flex';
}

/* --- Шаг «Часть линии»: активен только для SMD, иначе скрыт --- */
function renderCoclPartStep(line) {
  const partField = $('#partSelectField');
  const partSelect = $('#partSelect');
  if (!partField || !partSelect) return;

  const workshopId = line ? getWorkshopIdForLine(line) : null;
  const needsPart = workshopId === 'smd';

  partField.style.display = needsPart ? '' : 'none';

  if (!needsPart) {
    // Для не-SMD часть не выбирается — сбрасываем
    partSelect.value = '';
  }
}

/* --- Обновление чек-листа при изменении условий --- */
$('#partSelect')?.addEventListener('change', () => {
  // Триггеры «Что меняется» зависят от части линии
  if ($('#transitionType').value === 'ChangeOver') renderMaterialChanges();
  updateChecklist();
});

/* Кнопки Maker / Packer → скрытый #partSelect */
$('#coclPartSeg')?.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-part]');
  if (!btn) return;
  const sel = $('#partSelect');
  sel.value = btn.dataset.part;
  sel.dispatchEvent(new Event('change'));
});

/* Состояние шагов COCL: выполненный шаг — галочка, кнопки части — по select */
function updateCoclStepStates() {
  const line = $('#lineSelect')?.value || '';
  const type = $('#transitionType')?.value || '';
  const part = $('#partSelect')?.value || '';
  const done = {
    coclStepLine: !!line,
    coclStepType: !!type,
    partSelectField: !!part,
    brandsCard: !!($('#brandFrom')?.value && $('#brandTo')?.value),
    changesCard: $$('#changesContainer input[data-change]:checked').length > 0
  };
  Object.entries(done).forEach(([id, isDone]) => {
    $('#' + id)?.classList.toggle('is-done', isDone);
  });
  $$('#coclPartSeg [data-part]').forEach(b => b.classList.toggle('active', b.dataset.part === part));
}

/* Вход на вкладку: без линии — сразу окно выбора линии, как в Чек-листе CL */
function openCoclTab() {
  updateCoclStepStates();
  if ($('#lineSelect')?.value) return;
  if (($('#checklistCard')?.style.display || 'none') !== 'none') return;
  setTimeout(() => {
    linePickerOnSelect = (line) => setCoclLine(line);
    openLinePickerModal();
  }, 150);
}

/* Клик по кнопке-чипу типа перехода (только в блоке «Проверка») */
$('#typeSelector')?.querySelectorAll('.type-option').forEach(btn => {
  btn.addEventListener('click', () => {
    const value = btn.dataset.value;
    $('#typeSelector').querySelectorAll('.type-option').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    $('#transitionType').value = value;
    onTransitionTypeChange();
  });
});

/* Если по какой-то причине кто-то меняет select — тоже работает */
$('#transitionType').addEventListener('change', onTransitionTypeChange);

function onTransitionTypeChange() {
  const type = $('#transitionType').value;
  updateBrandToOptions();

  if (!type) {
    $('#brandsCard').style.display = 'none';
    $('#changesCard').style.display = 'none';
    $('#checklistCard').style.display = 'none';
    updateCoclStepStates();
    return;
  }

  // Бренды и триггеры — ТОЛЬКО для Change Over
  if (type === 'ChangeOver') {
    $('#brandsCard').style.display = '';
    $('#changesCard').style.display = '';
    renderMaterialChanges();
  } else {
    $('#brandsCard').style.display = 'none';
    $('#changesCard').style.display = 'none';
  }

  updateChecklist();
}

function renderMaterialChanges() {
  const c = $('#changesContainer');
  const part = $('#partSelect').value;   // Maker / Packer
  const line = $('#lineSelect').value;

  // Триггеры цеха этой линии (в SMD — с учётом части линии)
  const items = getTriggersForWorkshop(line ? getWorkshopIdForLine(line) : null, part).map(t => ({
    value: t.value,
    label: t.label
  }));

  if (!items.length) {
    c.innerHTML = '<div class="empty-state" style="padding:20px">Триггеры не настроены. Добавьте их в Настройках → «Триггеры Change Over».</div>';
    return;
  }

  c.innerHTML = '<div class="checkbox-group">' +
    items.map(m =>
      `<label><input type="checkbox" value="${escapeHtml(m.value)}" data-change> ${escapeHtml(m.label)}</label>`
    ).join('') + '</div>';

  c.querySelectorAll('input[data-change]').forEach(cb => {
    cb.addEventListener('change', (e) => {
      e.target.closest('label').classList.toggle('checked', e.target.checked);
      updateChecklist();
    });
  });
}
$('#brandFrom').addEventListener('change', () => {
  updateBrandToOptions();
  updateChecklist();
});

$('#brandTo').addEventListener('change', () => {
  updateChecklist();
});

function getSelectedTriggers() {
  const type = $('#transitionType').value;
  const triggers = [];

  // Триггеры «Что меняется» — только для Change Over
  if (type === 'ChangeOver') {
    $$('#changesContainer input[data-change]:checked').forEach(cb => {
      const val = cb.value;

      if (val === 'tobacco_materials') {
        triggers.push('tobacco');
        triggers.push('materials');
      } else {
        triggers.push(val);
      }
    });
  }
  return triggers;
}

/* ============================================================
   Показ стандарта в Change Over — логика «отличий точек»
   ============================================================ */

/**
 * Эффективный блок точек для бренда:
 * сначала блок конкретного бренда, иначе блок «Все бренды» (brand === '').
 * Возвращает null, если подходящего блока нет.
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

/**
 * true, если наборы точек различаются (по числу точек или по значению хотя бы одной).
 */
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

/**
 * Проверка триггеров стандарта для Change Over.
 * Без триггеров — показывается; с триггерами — только при совпадении.
 */
function standardMatchesTriggers(st, selectedTriggers) {
  if (!st.triggers || !st.triggers.length) return true;
  return st.triggers.some(t => selectedTriggers.includes(t));
}

function updateChecklist() {
  const type = $('#transitionType').value;
  const line = $('#lineSelect').value;
  const part = $('#partSelect').value;
  const brandFrom = $('#brandFrom')?.value || '';

  const buildCard = $('#buildChecklistCard');
  const checklistCard = $('#checklistCard');
  updateCoclStepStates();

  // --- Если не заполнены основные поля — ничего не показываем ---
  const workshopId = line ? getWorkshopIdForLine(line) : null;
  const needsPart = workshopId === 'smd';
  if (!type || !line || (needsPart && !part)) {
    if (buildCard) buildCard.style.display = 'none';
    if (checklistCard) checklistCard.style.display = 'none';
    return;
  }

  const triggers = getSelectedTriggers();
  const all = getStandards();

  // Для Change Over нужен выбранный бренд «На бренд»
  let brandTo = '';
  if (type === 'ChangeOver') {
    brandTo = $('#brandTo').value;
    if (!brandTo) {
      if (buildCard) buildCard.style.display = 'none';
      if (checklistCard) checklistCard.style.display = 'none';
      return;
    }
  }

  const relevant = all.filter(st => {
    if (st.active === false) return false;
    if (!st.appliesTo || !st.appliesTo.includes(type)) return false;
    if (st.line !== line) return false;
    if (st.nodePart && st.nodePart !== part) return false;

    // --- Change Over: стандарт показываем, только если точки целевого
    //     бренда отличаются от точек исходного (либо технолог принудительно
    //     включил стандарт в проверку смены сорта) ---
    if (type === 'ChangeOver') {
      const blocks = Array.isArray(st.measurements) ? st.measurements : [];
      if (!blocks.length) return false;

      const blockFrom = getEffectiveBrandBlock(blocks, brandFrom);
      const blockTo = getEffectiveBrandBlock(blocks, brandTo);

      // Нет релевантного блока для целевого бренда — не показываем
      if (!blockTo) return false;

      // Если технолог НЕ принудительно указал стандарт — показываем только
      // при отличии точек целевого бренда от исходного.
      if (st.forceInChangeOver !== true) {
        // Блок исходного бренда не задан (и нет «Все бренды») — стандарт
        // специфичен для целевого бренда, показываем. Иначе требуем отличие.
        if (blockFrom && !brandBlocksDiffer(blockFrom, blockTo)) {
          return false;
        }
      }

      return standardMatchesTriggers(st, triggers);
    }

    // --- CL_TO / CL_Conversion: триггеры не проверяем ---
    return true;
  });

  // --- Панель «Сформировать чек-лист»: сколько стандартов найдено ---
  if (buildCard) {
    buildCard.style.display = '';
    buildCard.classList.toggle('is-empty', relevant.length === 0);
    const info = $('#coclBuildInfo');
    if (info) {
      info.textContent = relevant.length
        ? `Найдено ${relevant.length} ${pluralizeStandards(relevant.length)} — можно формировать чек-лист.`
        : (type === 'ChangeOver'
            ? 'Для этих брендов нет стандартов с отличающимися точками — проверять нечего.'
            : 'Под эти условия стандартов нет.');
    }
    const btn = $('#buildChecklistBtn');
    if (btn) btn.disabled = relevant.length === 0;
  }
  if (checklistCard) checklistCard.style.display = 'none';

  renderChecklist(relevant);
}

function renderChecklist(items) {
  const c = $('#checklistContainer');
  if (!items.length) {
    c.innerHTML = '<div class="empty-state">Нет стандартов для выбранных условий.<br>Добавьте их во вкладке «Редактор стандартов».</div>';
    updateProgress();
    return;
  }

  const type = $('#transitionType').value;
  const brandTo = (type === 'ChangeOver') ? $('#brandTo').value : '';

  // Найдём первый непроверенный — его раскроем автоматически
  let firstUncheckedId = null;

  // Собираем HTML
  const html = items.map(st => {
    const isFirstUnchecked = (firstUncheckedId === null);
    if (isFirstUnchecked) firstUncheckedId = st.id;

    // --- Выбираем блок точек для отображения ---
    const blocks = Array.isArray(st.measurements) ? st.measurements : [];
    let selectedBlock = null;

    if (type === 'ChangeOver' && brandTo) {
      selectedBlock = getEffectiveBrandBlock(blocks, brandTo);
    } else {
      selectedBlock = blocks[0] || null;
    }

    const visiblePoints = selectedBlock ? selectedBlock.points : [];

    // Сетка точек (для типов с точками: variable / interval / fixed с точками)
    let pointsHtml = '';
    if (selectedBlock && visiblePoints.length) {
      const cells = visiblePoints.map((m, i) => {
        const norm = parseNorm(m.value);
        const normData = norm ? JSON.stringify(norm).replace(/"/g, '&quot;') : '';
        return `
          <div class="checklist-point-cell"
               data-point-index="${i}"
               data-norm='${normData}'>
            <div class="checklist-point-cell-head">
              <span class="checklist-point-status" data-point-status="${i}"></span>
              <span class="checklist-point-num">${i + 1}</span>
              <span class="checklist-point-norm" title="${escapeAttr(m.value || '')}">${escapeHtml(m.value || '—')}</span>
            </div>
            <div class="checklist-point-cell-body">
              <input type="number" step="any" class="checklist-point-input"
                     data-point-input="${i}" placeholder="0">
            </div>
          </div>
        `;
      }).join('');

      pointsHtml = `
        <div class="checklist-points">
          <div class="checklist-points-header">
            <span class="checklist-point-brand-badge">
              ${escapeHtml(selectedBlock.brand || 'Все бренды')}
            </span>
            <span class="checklist-points-hint">Все точки должны быть в норме</span>
          </div>
          <div class="checklist-points-grid">${cells}</div>
        </div>
      `;
    }

    // Ответ (ОК/Не ОК) — только для Фиксированного без точек
    let answerHtml = '';
    if (st.controlType === 'fixed' && !visiblePoints.length) {
      answerHtml = `
        <div class="radio-group">
          <label><input type="radio" name="ans_${st.id}" value="OK" data-ans> ОК</label>
          <label><input type="radio" name="ans_${st.id}" value="FAIL" data-ans> Не ОК</label>
        </div>`;
    }

    // Компактная строка в свёрнутом виде
    const compactMeta = [
      st.oplNumber ? `OPL: ${escapeHtml(st.oplNumber)}` : '',
      st.machine ? `Машина: ${escapeHtml(st.machine)}` : '',
      st.nodePart ? escapeHtml(st.nodePart) : ''
    ].filter(Boolean).join(' · ');

    // Если пользователь оставил комментарий — нарисуем иконку 💬
    // (проверим по data-comment, при перерисовке может быть уже установлен)
    const hasComment = false; // пока нет — установится после ручного комментария

    return `
      <div class="cocl-acc-item" data-std-id="${st.id}" data-expanded="false">
        <div class="cocl-acc-header" data-acc-toggle>
          <span class="cocl-status-dot" data-acc-status="unchecked"></span>
          <div class="cocl-acc-title-wrap">
            <div class="cocl-acc-title">${escapeHtml(st.title || '—')}</div>
            <div class="cocl-acc-meta">${compactMeta}</div>
          </div>

          <button type="button" class="cocl-acc-comment-btn" data-comment-btn title="Добавить комментарий">
            ${cmtIcon(16, true)}
          </button>

          <button type="button" class="cocl-acc-view-btn" data-view-btn data-std-id="${escapeAttr(st.id)}" title="Посмотреть стандарт">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
          </button>

          <span class="cocl-acc-caret">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </span>
        </div>

        <div class="cocl-acc-body">
          ${pointsHtml}
          ${answerHtml ? `<div class="cocl-acc-answer">${answerHtml}</div>` : ''}

          <div class="comment-preview" style="display:none" data-comment-preview></div>
        </div>
      </div>
    `;
  }).join('');

  c.innerHTML = html;

  // Раскрываем первый непроверенный
  if (firstUncheckedId) {
    const firstItem = c.querySelector(`.cocl-acc-item[data-std-id="${firstUncheckedId}"]`);
    if (firstItem) expandCoclItem(firstItem, true);
  }

  // Привязываем обработчики
  bindCoclAccordionEvents();
  updateProgress();
}

/* ============================================================
   COCL: аккордеон — обработчики
   ============================================================ */

function expandCoclItem(item, silent) {
  item.dataset.expanded = 'true';
  item.classList.add('expanded');
  const caret = item.querySelector('.cocl-acc-caret');
  if (caret) caret.style.transform = 'rotate(90deg)';
}

function collapseCoclItem(item) {
  item.dataset.expanded = 'false';
  item.classList.remove('expanded');
  const caret = item.querySelector('.cocl-acc-caret');
  if (caret) caret.style.transform = 'rotate(0deg)';
}

function bindCoclAccordionEvents() {
  const c = $('#checklistContainer');
  if (!c) return;

  // --- Клик по шапке — раскрыть/свернуть ---
  c.querySelectorAll('[data-acc-toggle]').forEach(head => {
    head.addEventListener('click', (e) => {
      // Игнорируем клики по кнопкам внутри шапки
      if (e.target.closest('[data-view-btn]')) return;
      if (e.target.closest('.cocl-acc-comment-icon')) return;

      const item = head.closest('.cocl-acc-item');
      if (!item) return;

      const isExpanded = item.dataset.expanded === 'true';
      if (isExpanded) {
        collapseCoclItem(item);
      } else {
        expandCoclItem(item);
      }
    });
  });

  // --- Глазик — просмотр стандарта ---
  c.querySelectorAll('[data-view-btn]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const stdId = btn.dataset.stdId;
      if (stdId && typeof openStandardView === 'function') openStandardView(stdId);
    });
  });

  // --- Radio ОК / Не ОК ---
  c.querySelectorAll('input[data-ans]').forEach(r => {
    r.addEventListener('change', (e) => {
      const item = e.target.closest('.cocl-acc-item');
      const val = e.target.value;
      updateCoclItemStatus(item, val === 'OK' ? 'ok' : 'fail');
      updateProgress();
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

      const val = parseFloat(e.target.value);
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

  // --- Кнопка комментария ---
  c.querySelectorAll('[data-comment-btn]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const item = btn.closest('.cocl-acc-item');
      openCommentModal(item);
    });
  });
}

/** Обновить статус свёрнутой строки по явному ответу (radio ОК/Не ОК) */
function updateCoclItemStatus(item, status) {
  item.dataset.status = status;

  const dot = item.querySelector('[data-acc-status]');
  if (dot) {
    dot.classList.remove('cocl-status-unchecked', 'cocl-status-ok', 'cocl-status-fail');
    dot.classList.add(status === 'ok' ? 'cocl-status-ok' : 'cocl-status-fail');
    dot.dataset.accStatus = status;
  }
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
    item.dataset.status = 'unchecked';
    const dot = item.querySelector('[data-acc-status]');
    if (dot) {
      dot.classList.remove('cocl-status-ok', 'cocl-status-fail');
      dot.classList.add('cocl-status-unchecked');
      dot.dataset.accStatus = 'unchecked';
    }
    return;
  }

  // Все заполнены — итог
  updateCoclItemStatus(item, anyFail ? 'fail' : 'ok');
}

function updateProgress() {
  const items = $$('#checklistContainer .cocl-acc-item');
  const wrap = $('#progressWrap');
  const bar = $('#progressBarInner');
  const percent = $('#progressPercent');
  const text = $('#progressText');
  const badge = $('#progressBadge');

  if (!items.length) {
    badge.textContent = '';
    badge.className = 'progress-badge';
    wrap.style.display = 'none';
    text.style.display = 'none';
    return;
  }

  let filled = 0;
  let oks = 0;
  let fails = 0;

  items.forEach(item => {
    const status = item.dataset.status;
    if (status === 'ok') { filled++; oks++; }
    else if (status === 'fail') { filled++; fails++; }
  });

  const total = items.length;
  const pct = total > 0 ? Math.round((filled / total) * 100) : 0;

  wrap.style.display = 'flex';
  text.style.display = 'block';

  bar.style.width = pct + '%';
  bar.classList.remove('low', 'mid', 'high', 'done');
  if (pct === 100)      bar.classList.add('done');
  else if (pct >= 67)   bar.classList.add('high');
  else if (pct >= 34)   bar.classList.add('mid');
  else                  bar.classList.add('low');

  percent.textContent = pct + '%';

  // Текст с деталями
  const parts = [`Проверено ${filled} из ${total}`];
  if (oks > 0) parts.push(`ОК: ${oks}`);
  if (fails > 0) parts.push(`Не ОК: ${fails}`);
  text.textContent = parts.join(' · ');

  badge.textContent = `Проверено ${filled} из ${total}`;
  badge.className = 'progress-badge' + (filled === total ? ' complete' : '');
}

function updateCommentUrgency(item) {
  const btn = item.querySelector('[data-comment-btn]');
  if (!btn) return;
  const failRadio = item.querySelector('input[data-ans]:checked[value="FAIL"]')
                 || item.querySelector('input[data-tol]:checked[value="FAIL"]');
  const hasComment = item.dataset.comment && item.dataset.comment.trim() !== '';
  if (failRadio && !hasComment) {
    btn.classList.add('urgent');
  } else {
    btn.classList.remove('urgent');
  }
}

/* ============================================================
   МОДАЛЬНОЕ ОКНО КОММЕНТАРИЯ
   ============================================================ */
let currentCommentItem = null;

function openCommentModal(item) {
  currentCommentItem = item;
  const std = getStandards().find(s => s.id === item.dataset.stdId);
  $('#commentModalPoint').textContent = std
    ? `№${std.number || '—'} · ${std.oplNumber || ''} — ${std.title || ''}`
    : '';
  const existing = item.dataset.comment || '';
  $('#commentText').value = existing;
  openModal('#commentModal');
  setTimeout(() => $('#commentText').focus(), 100);
}

/* ============================================================
   COCL: Сворачивание верхней части и показ чек-листа
   ============================================================ */

/** Скрыть настройки, показать чек-лист */
function buildChecklistView() {
  // Прячем все карточки настройки
  ['#brandsCard', '#changesCard', '#buildChecklistCard'].forEach(sel => {
    const el = $(sel);
    if (el) el.style.display = 'none';
  });

  // Карточки с оператором/сменой/линией/типом — тоже скрываем
  const topCards = document.querySelectorAll('#tab-check .card');
  topCards.forEach((card, idx) => {
    if (card.id === 'checklistCard') return;
    // Скрываем всё, что до чек-листа
    card.style.display = 'none';
  });

  // Показываем чек-лист
  $('#checklistCard').style.display = 'block';

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/** Показать настройки, скрыть чек-лист */
function editChecklistConditions() {
  // Показываем все карточки настройки обратно
  const topCards = document.querySelectorAll('#tab-check .card');
  topCards.forEach(card => {
    if (card.id === 'checklistCard') {
      card.style.display = 'none';
    } else {
      // Восстанавливаем отображение — но только тех, что были видны
      // Проще: показываем всё, что должно быть видно по текущему состоянию
      card.style.display = '';
    }
  });

  // Применяем видимость через onTransitionTypeChange
  if (typeof onTransitionTypeChange === 'function') {
    // Сначала скрыть всё ненужное
    ['#brandsCard', '#changesCard', '#buildChecklistCard'].forEach(sel => {
      const el = $(sel);
      if (el) el.style.display = 'none';
    });
    // Затем вызвать логику для актуального типа
    onTransitionTypeChange();
  }

  // Скрываем чек-лист
  $('#checklistCard').style.display = 'none';

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Обработчики
$('#buildChecklistBtn')?.addEventListener('click', buildChecklistView);
$('#editConditionsBtn')?.addEventListener('click', editChecklistConditions);
