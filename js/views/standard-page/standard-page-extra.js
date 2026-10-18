/* ============================================================
   СТРАНИЦА стандарта: фото, связи, доп. информация, сохранение
   Модуль общего пространства имён: функции и переменные видны
   во всех файлах. Порядок подключения — index.html.
   ============================================================ */

/* Заглушка для совместимости (вызывается в renderSvContentBlocks) */
/* ============================================================
   Фото
   ============================================================ */

function renderSvFullPhotos(st, isEdit) {
  const wrap = $('#svFullPhotos');
  if (!wrap) return;

  const photos = Array.isArray(st.photos) ? st.photos : [];

  if (!photos.length && !isEdit) {
    wrap.innerHTML = '<div class="sv-full-photos-empty">Фотографий пока нет</div>';
    return;
  }

  // Сетка миниатюр
  let gridHtml = '';
  if (photos.length) {
    gridHtml = photos.map((name, idx) => {
      const path = getPhotoPath(st, name);
      return `
        <div class="sv-full-photo" data-photo-idx="${idx}" title="${escapeAttr(name)}">
          <img src="${escapeAttr(path)}" alt="${escapeAttr(name)}"
               onerror="this.style.display='none';this.nextElementSibling.style.display='flex';">
          <div class="photo-missing" style="display:none">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          </div>
          ${isEdit ? `
            <button type="button" class="sv-full-photo-remove" data-remove-photo="${idx}" title="Удалить фото">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          ` : ''}
        </div>
      `;
    }).join('');
  } else {
    gridHtml = '<div class="sv-full-photos-empty">Фотографий пока нет</div>';
  }

  // Форма добавления
  const addFormHtml = isEdit ? `
    <div class="sv-photo-add-form">
      <textarea id="svf_newPhotoName" rows="2"
                placeholder="Имена файлов — через запятую или с новой строки:&#10;max-1.jpg, max-2.jpg"
                class="sv-photo-add-textarea"></textarea>
      <button type="button" class="btn btn-secondary btn-sm" id="svf_addPhotoBtn">
        + Добавить
      </button>
    </div>
  ` : '';

  wrap.innerHTML = gridHtml + addFormHtml;

  // === Обработчики ===

  // Открытие лайтбокса (только в режиме просмотра)
  if (!isEdit) {
    wrap.querySelectorAll('[data-photo-idx]').forEach(el => {
      el.addEventListener('click', () => {
        const idx = parseInt(el.dataset.photoIdx, 10);
        if (typeof openLightbox === 'function') openLightbox(st, idx);
      });
    });
  }

  // Удаление фото (только в режиме редактирования)
  if (isEdit) {
    wrap.querySelectorAll('[data-remove-photo]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.dataset.removePhoto, 10);
        if (!st.photos || idx < 0 || idx >= st.photos.length) return;
        if (!confirm('Удалить фото "' + st.photos[idx] + '"?')) return;
        st.photos.splice(idx, 1);
        renderSvFullPhotos(st, true);
      });
    });

    // Добавление фото
    const addBtn = $('#svf_addPhotoBtn');
    if (addBtn) {
      addBtn.addEventListener('click', () => {
        const input = $('#svf_newPhotoName');
        if (!input) return;
        const raw = input.value || '';

        // Разбиваем по запятой / переносам строк
        const names = raw.split(/[\n,]+/).map(s => s.trim()).filter(s => s.length > 0);
        if (!names.length) {
          showToast('Введите хотя бы одно имя файла', true);
          return;
        }

        // Инициализируем массив
        if (!Array.isArray(st.photos)) st.photos = [];

        let added = 0;
        let skipped = 0;
        names.forEach(name => {
          if (st.photos.includes(name)) {
            skipped++;
          } else {
            st.photos.push(name);
            added++;
          }
        });

        input.value = '';
        renderSvFullPhotos(st, true);

        if (added > 0 && skipped === 0) {
          showToast('Добавлено: ' + added);
        } else if (added > 0 && skipped > 0) {
          showToast('Добавлено: ' + added + ', пропущено дубликатов: ' + skipped);
        } else if (added === 0 && skipped > 0) {
          showToast('Все ' + skipped + ' уже добавлены', true);
        }
      });
    }
  }
}

/* ============================================================
   Связанные объекты
   ============================================================ */

function renderSvFullRelated(st) {
  const wrap = $('#svFullRelated');
  if (!wrap) return;

  const ctx = typeof getBlockForLine === 'function' ? getBlockForLine(st.line) : null;

  const rows = [];
  if (ctx) {
    rows.push(['Цех', ctx.workshop.name]);
    rows.push(['Участок', ctx.area.name + (ctx.block ? ` (${ctx.block.name})` : '')]);
  }
  rows.push(['Линия', st.line]);
  rows.push(['Рабочий центр', st.nodePart]);
  rows.push(['Машина', st.machine]);
  rows.push(['Узел', st.node]);
  rows.push(['OPL №', st.oplNumber]);
  rows.push(['Автор', st.author]);
  rows.push(['Дата создания', formatDateTime(st.createdAt)]);
  rows.push(['Последнее обновление', formatDateTime(st.updatedAt)]);

  wrap.innerHTML = rows.map(([label, value]) => {
    const isEmpty = !value || !String(value).trim();
    return `
      <div class="sv-full-related-row">
        <span class="sv-full-related-label">${escapeHtml(label)}</span>
        <span class="sv-full-related-value ${isEmpty ? 'sv-empty' : ''}">
          ${isEmpty ? '—' : escapeHtml(value)}
        </span>
      </div>
    `;
  }).join('');
}

/* ============================================================
   Дополнительная информация (Применять к, Триггеры, Top Losses)
   ============================================================ */

function renderSvFullExtra(st, isEdit) {
  const wrap = $('#svFullExtra');
  if (!wrap) return;

  if (!isEdit) {
    // ===================== ПРОСМОТР =====================

    const appliesToLabels = {
      ChangeOver: 'Change Over',
      CL_TO: 'CL в ТО',
      CL_Conversion: 'CL в Конвертацию'
    };
    const appliesToChips = (Array.isArray(st.appliesTo) ? st.appliesTo : [])
      .map(v => {
        const cls = v === 'ChangeOver' ? 'et-type-changeover'
                  : v === 'CL_TO' ? 'et-type-clto'
                  : 'et-type-clconv';
        return `<span class="et-type-chip ${cls}">${escapeHtml(appliesToLabels[v] || v)}</span>`;
      }).join('');

    const triggerChips = (Array.isArray(st.triggers) ? st.triggers : [])
      .map(t => `<span class="sv-trigger-chip">${escapeHtml(getTriggerLabel(t))}</span>`)
      .join('');

    const lossChips = (Array.isArray(st.topLosses) ? st.topLosses : [])
      .map(id => {
        const l = typeof findLossById === 'function' ? findLossById(id) : null;
        return l ? `<span class="tl-summary-chip">${escapeHtml(l.name)}</span>` : '';
      }).filter(Boolean).join('');

    const block = (label, html) => `
      <div class="sv-full-extra-block">
        <div class="sv-full-extra-label">${escapeHtml(label)}</div>
        <div class="sv-full-extra-chips">
          ${html || '<span class="sv-full-extra-empty">Не задано</span>'}
        </div>
      </div>
    `;

    const forceChip = st.forceInChangeOver
      ? '<span class="et-type-chip et-type-changeover">Всегда в Change Over</span>'
      : '';
    wrap.innerHTML = `
      ${block('Применять к', appliesToChips + forceChip)}
      ${block('Триггеры Change Over', triggerChips)}
      ${block('Top Losses', lossChips)}
    `;
    return;
  }

  // ===================== РЕДАКТИРОВАНИЕ =====================

  const appliesToArr = Array.isArray(st.appliesTo) ? st.appliesTo : [];
  const triggersArr = Array.isArray(st.triggers) ? st.triggers : [];
  const topLossesArr = Array.isArray(st.topLosses) ? st.topLosses : [];

  // Применяемость — чекбоксы
  const appliesToHtml = `
    <div class="sv-edit-chips-group" id="svf_appliesToGroup">
      <label class="type-checkbox type-checkbox-changeover ${appliesToArr.includes('ChangeOver') ? 'checked' : ''}">
        <input type="checkbox" value="ChangeOver" ${appliesToArr.includes('ChangeOver') ? 'checked' : ''}>
        <span>Change Over</span>
      </label>
      <label class="type-checkbox type-checkbox-clto ${appliesToArr.includes('CL_TO') ? 'checked' : ''}">
        <input type="checkbox" value="CL_TO" ${appliesToArr.includes('CL_TO') ? 'checked' : ''}>
        <span>CL в ТО</span>
      </label>
      <label class="type-checkbox type-checkbox-clconv ${appliesToArr.includes('CL_Conversion') ? 'checked' : ''}">
        <input type="checkbox" value="CL_Conversion" ${appliesToArr.includes('CL_Conversion') ? 'checked' : ''}>
        <span>CL в Конвертацию</span>
      </label>
    </div>
  `;

  // Триггеры — выбранные чипы, добавление через модалку (из настроек цеха)
  const triggersHtml = renderTriggerChipsEditable(triggersArr);

  // Top Losses — чипы + кнопка
  const lossChips = topLossesArr
    .map(id => {
      const l = typeof findLossById === 'function' ? findLossById(id) : null;
      if (!l) return '';
      return `
        <div class="sv-toploss-item" data-toploss-id="${escapeAttr(id)}" title="${escapeAttr(l.categoryName + ': ' + l.name)}">
          <span>${escapeHtml(l.name)}</span>
          <button type="button" class="sv-toploss-remove" data-remove-toploss="${escapeAttr(id)}" title="Убрать">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:10px;height:10px">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      `;
    })
    .filter(Boolean)
    .join('');

  wrap.innerHTML = `
    ${valEditBlockHtml(st, svFullState.isNew)}
    <div class="sv-full-extra-block">
      <div class="sv-full-extra-label">Применять к</div>
      <div class="sv-full-extra-chips">
        ${appliesToHtml}
      </div>
      <label class="sv-force-co" title="Показывать в смене сорта, даже если точки брендов одинаковые">
        <input type="checkbox" id="svf_forceInChangeOver" ${st.forceInChangeOver ? 'checked' : ''}>
        <span>Всегда показывать в Change Over, даже если точки брендов совпадают</span>
      </label>
    </div>

    <div class="sv-full-extra-block">
      <div class="sv-full-extra-label">Триггеры Change Over</div>
      <div class="sv-full-extra-chips" id="svf_triggersGroup">
        ${triggersHtml || '<span class="sv-full-extra-empty">Триггеры не заданы</span>'}
      </div>
      <button type="button" class="btn btn-secondary btn-sm" id="svf_addTriggerBtn" style="margin-top:8px">
        + Добавить триггер
      </button>
    </div>

    <div class="sv-full-extra-block">
      <div class="sv-full-extra-label">Top Losses</div>
      <div class="sv-full-extra-chips" id="svf_topLossesSelected">
        ${lossChips || '<span class="sv-full-extra-empty">Потери не заданы</span>'}
      </div>
      <button type="button" class="btn btn-secondary btn-sm" id="svf_addTopLossBtn" style="margin-top:8px">
        + Добавить потерю
      </button>
    </div>
  `;

  // ==== Обработчики ====

  // Применяемость
  $$('#svf_appliesToGroup input').forEach(cb => {
    cb.addEventListener('change', (e) => {
      e.target.closest('label').classList.toggle('checked', e.target.checked);

      // Обновляем st.appliesTo в памяти
      const allChecked = [...$$('#svf_appliesToGroup input:checked')].map(x => x.value);
      st.appliesTo = allChecked;
    });
  });

  $('#svf_forceInChangeOver')?.addEventListener('change', (e) => {
    st.forceInChangeOver = e.target.checked;
  });

  // Триггеры — удаление чипа и выбор через модалку
  wrap.querySelectorAll('[data-remove-trigger]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      st.triggers = (st.triggers || []).filter(v => v !== btn.dataset.removeTrigger);
      renderSvFullExtra(st, true);
    });
  });
  $('#svf_addTriggerBtn')?.addEventListener('click', () => {
    openTriggerPickerModal({
      workshopId: getWorkshopIdForLine(st.line),
      part: st.nodePart || '',
      selected: st.triggers || [],
      onApply: (values) => {
        st.triggers = values;
        renderSvFullExtra(st, true);
      }
    });
  });

  // Top Losses — удаление
  wrap.querySelectorAll('[data-remove-toploss]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const id = btn.dataset.removeToploss;
      // Убираем из st напрямую (не из массива, а из объекта)
      const idx = st.topLosses.indexOf(id);
      if (idx !== -1) st.topLosses.splice(idx, 1);
      renderSvFullExtra(st, true);
    });
  });

  // Кнопка «+ Добавить потерю» — открываем модалку выбора
  const addLossBtn = $('#svf_addTopLossBtn');
  if (addLossBtn) {
    addLossBtn.addEventListener('click', () => {
      // Синхронизируем глобальный массив с текущим состоянием
      sfTopLossesSelected = [...st.topLosses];

      // ВАЖНО: выставляем контекст, чтобы applyTopLossPicker знал куда возвращать
      topLossPickerContext = 'sv-full';

      openTopLossPickerModal();
    });
  }
}

/* ============================================================
   Заглушки для таблиц вкладок
   ============================================================ */

function renderSvAckTable(st) {
  const wrap = $('#svAckTableWrap');
  if (!wrap) return;
  wrap.innerHTML = `
    <div class="sv-full-empty-table">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
      </svg>
      <div>Раздел «Ознакомление» в разработке</div>
    </div>
  `;
}

function renderSvHistoryTable(st) {
  const wrap = $('#svHistoryTableWrap');
  if (!wrap) return;
  wrap.innerHTML = `
    <div class="sv-full-empty-table">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <polyline points="12 6 12 12 16 14"/>
      </svg>
      <div>Раздел «История изменений» в разработке</div>
    </div>
  `;
}

function renderSvCommentsTable(st) {
  const wrap = $('#svCommentsTableWrap');
  if (!wrap) return;
  wrap.innerHTML = `
    <div class="sv-full-empty-table">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
      <div>Раздел «Комментарии» в разработке</div>
    </div>
  `;
}

/* ============================================================
   Переключение вкладок внутри просмотра
   ============================================================ */

function switchSvFullTab(tabName) {
  // Подсветка кнопок
  document.querySelectorAll('#svFullTabs .sv-full-tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.svTab === tabName);
  });

  // Показ/скрытие панелей
  const panes = {
    main: 'svPaneMain',
    ack: 'svPaneAck',
    history: 'svPaneHistory',
    comments: 'svPaneComments'
  };
  Object.entries(panes).forEach(([key, id]) => {
    const el = document.getElementById(id);
    if (el) el.style.display = (key === tabName) ? '' : 'none';
  });
}
window.switchSvFullTab = switchSvFullTab;

/* ============================================================
   Обработчики кнопок
   ============================================================ */

/* Машина и часть линии сразу попадают в рабочую копию:
   от части зависит список триггеров в окне выбора. */
/* «+» у машины — добавить машину в список линии и сразу выбрать её */
$('#svMainFields')?.addEventListener('click', (e) => {
  if (!e.target.closest('#svf_addMachineBtn')) return;
  const st = svFullState.editingData;
  if (!st) return;
  openQuickAddMachineModal({
    line: st.line,
    onAdded: (name) => {
      const sel = $('#svf_machine');
      if (sel) {
        sel.insertAdjacentHTML('beforeend', `<option value="${escapeAttr(name)}">${escapeHtml(name)}</option>`);
        sel.value = name;
      }
      st.machine = name;
    }
  });
});

$('#svMainFields')?.addEventListener('change', (e) => {
  const st = svFullState.editingData;
  if (!st) return;
  if (e.target.id === 'svf_nodePart') st.nodePart = e.target.value;
  if (e.target.id === 'svf_machine') st.machine = e.target.value;
});

$('#svFullBackBtn')?.addEventListener('click', () => {
  if (svFullState.isNew && !confirm('Выйти без сохранения? Новый стандарт не будет создан.')) return;
  closeStandardFullView();
});

$('#svFullEditBtn')?.addEventListener('click', () => {
  if (!svFullState.standardId) return;

  const current = getStandards().find(s => s.id === svFullState.standardId);
  if (!current) return;

  svFullState.originalData = JSON.parse(JSON.stringify(current));
  svFullState.editingData = JSON.parse(JSON.stringify(current));   // НОВОЕ
  svFullState.mode = 'edit';
  renderStandardFullView();
});

$('#svFullCancelBtn')?.addEventListener('click', () => {
  if (svFullState.isNew) {
    if (!confirm('Отменить создание стандарта? Введённые данные не сохранятся.')) return;
    closeStandardFullView();
    return;
  }
  if (!confirm('Отменить изменения?')) return;
  svFullState.mode = 'view';
  svFullState.editingData = null;
  renderStandardFullView();
});

$('#svFullViewToggleBtn')?.addEventListener('click', () => {
  svFullState.mode = 'view';
  renderStandardFullView();
});

/* Переключение вкладок */
$('#svFullTabs')?.addEventListener('click', (e) => {
  const btn = e.target.closest('.sv-full-tab-btn');
  if (!btn) return;
  switchSvFullTab(btn.dataset.svTab);
});

$('#svAckMarkBtn')?.addEventListener('click', () => {
  showToast('Функция «Ознакомление» в разработке', true);
});

$('#svAddCommentBtn')?.addEventListener('click', () => {
  showToast('Функция «Комментарии» в разработке', true);
});
/* ============================================================
   СОХРАНЕНИЕ СТАНДАРТА ИЗ ПОЛНОЭКРАННОГО ПРОСМОТРА
   ============================================================ */

$('#svFullSaveBtn')?.addEventListener('click', () => {
  const id = svFullState.standardId;
  if (!id) return;

  // Защита: если editingData нет — берём текущий стандарт как копию
  if (!svFullState.editingData) {
    const fallback = getStandards().find(s => s.id === id);
    if (!fallback) return;
    svFullState.editingData = JSON.parse(JSON.stringify(fallback));
  }

  const all = getStandards();
  const isNew = svFullState.isNew;
  const stOriginal = all.find(s => s.id === id);
  if (!stOriginal && !isNew) return;

  // Работаем с копией
  const st = svFullState.editingData;
  // Считываем поля (если они есть — редактирование)
  const titleEl = $('#svf_title');
  const oplEl = $('#svf_oplNumber');
  const machineEl = $('#svf_machine');
  const nodeEl = $('#svf_node');
  const durationEl = $('#svf_durationSec');
  const toolEl = $('#svf_tool');
  const controlEl = $('#svf_controlType');
  const activeEl = $('#svf_active');
  const nodePartEl = $('#svf_nodePart');

  // Валидация
  const title = titleEl ? titleEl.value.trim() : st.title;
  const oplNumber = oplEl ? oplEl.value.trim() : st.oplNumber;
  const machine = machineEl ? machineEl.value.trim() : st.machine;
  const node = nodeEl ? nodeEl.value.trim() : st.node;

  if (!title)     return showToast('Укажите название', true);
  if (!oplNumber) return showToast('Укажите OPL №', true);
  if (!machine)   return showToast('Выберите машину', true);
  if (!node)      return showToast('Укажите узел', true);

  // Описания и таблица точек живут только в полях страницы —
  // забираем их отсюда (раньше правки этих блоков терялись при сохранении).
  const textOf = (sel, fallback) => {
    const el = $(sel);
    return el ? el.value.trim() : (fallback || '');
  };
  const problemDescription = textOf('#svf_problemDescription', st.problemDescription);
  const controlDescription = textOf('#svf_controlDescription', st.controlDescription);
  const purpose = textOf('#svf_purpose', st.purpose);
  const whyCreated = textOf('#svf_whyCreated', st.whyCreated);
  const measurements = $('#svf_brandBlocksContainer')
    ? getSvTableState()
        .map(m => ({ brand: m.brand, points: m.points.map(pt => ({ value: String(pt.value || '').trim() })) }))
        .filter(m => m.brand || m.points.some(pt => pt.value))
    : (st.measurements || []);

  const controlType = controlEl ? controlEl.value : st.controlType;
  if (!controlType) return showToast('Выберите тип контроля', true);
  // Вариабельный и интервал без точек проверить нечем
  const hasPoints = measurements.some(m =>
    (m.points || []).some(pt => String(pt.value || '').trim()));
  if ((controlType === 'variable' || controlType === 'interval') && !hasPoints) {
    return showToast('Заполните хотя бы одну точку контроля', true);
  }

  // Проверка дубликата OPL № на линии + машине (кроме текущего)
  const dup = all.find(s =>
    s.id !== id &&
    s.line === st.line &&
    s.machine === machine &&
    (s.oplNumber || '').toLowerCase() === oplNumber.toLowerCase()
  );
  if (dup) {
    return showToast(`OPL № "${oplNumber}" уже есть на машине ${machine}`, true);
  }

  // Часть линии — обязательна для SMD
  const workshopId = getWorkshopIdForLine(st.line);
  const nodePart = (workshopId === 'smd')
    ? (nodePartEl ? nodePartEl.value.trim() : st.nodePart)
    : '';
  if (workshopId === 'smd' && !nodePart) {
    return showToast('Выберите часть линии', true);
  }

  // Собираем обновлённый объект
  const updated = {
    ...st,
    title,
    oplNumber,
    machine,
    node,
    nodePart,
    problemDescription,
    controlDescription,
    purpose,
    whyCreated,
    measurements,
    durationSec: durationEl ? Math.max(0, parseInt(durationEl.value, 10) || 0) : st.durationSec,
    tool: toolEl ? toolEl.value.trim() : st.tool,
    controlType: migrateControlType(controlType, measurements),
    active: activeEl ? activeEl.checked : st.active,
    validation: valReadEdit(st.validation),
    updatedAt: new Date().toISOString()
  };
  if (isNew) {
    updated.createdAt = updated.updatedAt;
    if (!updated.author) updated.author = '—';
  }

  // Сохраняем в массив
  const idx = all.findIndex(s => s.id === id);
  if (idx !== -1) all[idx] = updated;
  else all.push(updated);

  setStandards(all);

  // Обновляем UI
  if (typeof refreshEditorMechTable === 'function') refreshEditorMechTable();
  if (typeof refreshEditorElecTable === 'function') refreshEditorElecTable();
  if (typeof updatePartCounters === 'function') updatePartCounters();
  if (typeof fillEditorFilters === 'function') fillEditorFilters();

  // Возвращаемся в режим просмотра
  svFullState.mode = 'view';
  svFullState.isNew = false;
  svFullState.originalData = JSON.parse(JSON.stringify(updated));
  svFullState.editingData = null;
  renderStandardFullView();

  showToast(isNew ? 'Стандарт создан' : 'Стандарт обновлён');
});
