/* ============================================================
   ВКЛАДКА «Дашборд»
   Модуль общего пространства имён: функции и переменные видны
   во всех файлах. Порядок подключения — index.html.
   ============================================================ */

/* ============================================================
   ДАШБОРД
   ============================================================ */
function renderDashboardWorkshopBar() {
  const bar = $('#dashboardWorkshopBar');
  if (!bar) return;

  const workshops = getWorkshops();
  const tabs = [{ id: '', name: 'Общий' }].concat(
    workshops.map(w => ({ id: w.id, name: w.name }))
  );

  bar.innerHTML = tabs.map(t => {
    const active = t.id === dashboardWorkshop;
    return `<button type="button" class="dash-ws-tab ${active ? 'active' : ''}" data-dash-ws="${escapeAttr(t.id)}">${escapeHtml(t.name)}</button>`;
  }).join('');

  bar.querySelectorAll('[data-dash-ws]').forEach(btn => {
    btn.addEventListener('click', () => {
      const ws = btn.dataset.dashWs;
      if (ws === dashboardWorkshop) return;
      dashboardWorkshop = ws;
      try { localStorage.setItem('cl_dashboard_workshop', ws); } catch (e) {}
      renderDashboard();
    });
  });
}

function renderDashboard() {
  const container = $('#dashboardContent');
  if (!container) return;

  // Восстанавливаем выбранный цех
  dashboardWorkshop = localStorage.getItem('cl_dashboard_workshop') || '';

  // --- Панель выбора цеха ---
  renderDashboardWorkshopBar();

  const stats = calculateDashboardStats(dashboardWorkshop);

  container.innerHTML = `
    ${renderDashboardStats(stats)}
    ${renderDashboardMainBlock(stats)}
    ${renderDashboardSecondaryBlock(stats)}
    ${renderDashboardTertiaryBlock(stats)}
    ${renderDashboardAttention(stats.attentionItems)}
  `;

  // Кнопки «Открыть» в списке последних проверок
  container.querySelectorAll('[data-dash-open-record]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.dashOpenRecord;
      if (typeof viewRecord === 'function') viewRecord(id);
    });
  });

  // Быстрые действия
  container.querySelector('[data-dash-action="check"]')?.addEventListener('click', () => {
    if (typeof switchTab === 'function') switchTab('check');
  });
  container.querySelector('[data-dash-action="editor"]')?.addEventListener('click', () => {
    if (typeof switchTab === 'function') switchTab('editor');
  });
  container.querySelector('[data-dash-action="photos"]')?.addEventListener('click', () => {
    if (typeof switchTab === 'function') switchTab('settings');
    setTimeout(() => {
      const btn = $('#checkPhotosBtn');
      if (btn) btn.click();
    }, 200);
  });

  // --- Кнопки в блоке «Требует внимания» ---
  container.querySelectorAll('[data-dash-attention-btn]').forEach(btn => {
    btn.addEventListener('click', () => {
      const action = btn.dataset.dashAttentionBtn;
      if (action === 'editor') {
        if (typeof switchTab === 'function') switchTab('editor');
      } else if (action === 'settings') {
        if (typeof switchTab === 'function') switchTab('settings');
      } else if (action === 'photos-check') {
        if (typeof switchTab === 'function') switchTab('settings');
        setTimeout(() => {
          const pbtn = $('#checkPhotosBtn');
          if (pbtn) pbtn.click();
        }, 200);
      } else if (action === 'toploss') {
        if (typeof switchTab === 'function') switchTab('toploss');
      }
    });
  });
}

/* Третий блок: графики и быстрые действия */
function renderDashboardTertiaryBlock(stats) {
  return `
    <div class="dash-grid">
      <div>${renderDashboardDaysChart(stats.daysSeries, stats.daysSeriesMax)}</div>
      <div>${renderDashboardTypesDonut(stats.typeSegments, stats.typesTotal)}</div>
    </div>
    <div class="dash-grid">
      <div>${renderDashboardMachineStats(stats.machineStats)}</div>
      <div>${renderDashboardWeekDynamics(stats.weekStats)}</div>
    </div>
    <div class="dash-grid">
      <div>${renderDashboardTopLossesStats(stats.topLossStats)}</div>
      <div>${renderDashboardClParamStats(stats.clParamStats)}</div>
    </div>
    ${renderDashboardActions()}
  `;
}

/* Виджет: столбики по дням (7 дней, двухцветные) */
function renderDashboardDaysChart(series, maxCount) {
  if (!series.length) {
    return `
      <div class="dash-widget">
        <div class="dash-widget-title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="20" x2="18" y2="10"/>
            <line x1="12" y1="20" x2="12" y2="4"/>
            <line x1="6" y1="20" x2="6" y2="14"/>
          </svg>
          Проверки по дням (7 дней)
        </div>
        <div class="dash-widget-empty">Нет данных</div>
      </div>
    `;
  }

  const cols = series.map(d => {
    const isEmpty = d.total === 0;
    const heightPercent = maxCount > 0 ? (d.total / maxCount) * 100 : 0;

    // Пропорции зелёной и красной части в столбике
    const failShare = d.total > 0 ? (d.withFails / d.total) : 0;
    const okShare = 1 - failShare;

    // Общая высота столбика
    const barStyle = isEmpty ? '' : `height: ${Math.max(heightPercent, 4)}%;`;

    // Tooltip
    const tooltip = isEmpty
      ? `${d.label}: проверок не было`
      : `${d.label}: ${d.total} ${d.total === 1 ? 'проверка' : 'проверок'}, из них ${d.withFails} с отклонениями`;

    // Содержимое столбика — два сегмента (внутренний flex по вертикали)
    let inner = '';
    if (!isEmpty) {
      // Верх столбика — красный (fail), низ — зелёный (ok).
      // Это визуально удобно: положительный результат снизу, проблемы сверху — как в реальности.
      inner = `
        <div class="dash-day-bar-inner">
          ${d.withFails > 0 ? `<div class="dash-day-bar-fail" style="height:${failShare * 100}%"></div>` : ''}
          ${d.withoutFails > 0 ? `<div class="dash-day-bar-ok" style="height:${okShare * 100}%"></div>` : ''}
        </div>
      `;
    }

    return `
      <div class="dash-day-col">
        <div class="dash-day-bar-wrap" title="${escapeAttr(tooltip)}">
          ${d.total > 0 ? `<span class="dash-day-bar-value">${d.total}</span>` : ''}
          <div class="dash-day-bar ${isEmpty ? 'dash-day-bar-empty' : ''}" style="${barStyle}">
            ${inner}
          </div>
        </div>
        <span class="dash-day-label">${d.label}</span>
      </div>
    `;
  }).join('');

  return `
    <div class="dash-widget">
      <div class="dash-widget-title">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="20" x2="18" y2="10"/>
          <line x1="12" y1="20" x2="12" y2="4"/>
          <line x1="6" y1="20" x2="6" y2="14"/>
        </svg>
        Проверки по дням (7 дней)
      </div>
      <div class="dash-days-chart">${cols}</div>
    </div>
  `;
}
/* Виджет: Отклонения по машинам (30 дней) */
function renderDashboardMachineStats(items) {
  if (!items.length) {
    return `
      <div class="dash-widget">
        <div class="dash-widget-title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
          </svg>
          Отклонения по машинам (30 дней)
        </div>
        <div class="dash-widget-empty">Отклонений за месяц не зафиксировано</div>
      </div>
    `;
  }

  const rows = items.map(item => {
    const failsPct = item.percent;
    const oksPct = 100 - failsPct;

    const percentText = failsPct.toFixed(1) + '%';
    const numbersText = `${item.fails} из ${item.total}`;

    const failWidth = Math.max(failsPct, 1.5);

    return `
      <div class="dash-bar-item">
        <span class="dash-bar-label">${escapeHtml(item.machine)}</span>
        <div class="dash-bar-track dash-bar-track-ok">
          <div class="dash-bar-fill-ok" style="width:${oksPct}%"></div>
          <div class="dash-bar-fill-fail" style="width:${failWidth}%"></div>
        </div>
        <span class="dash-bar-value">
          ${percentText}
          <span class="dash-bar-sub">${numbersText}</span>
        </span>
      </div>
    `;
  }).join('');

  return `
    <div class="dash-widget">
      <div class="dash-widget-title">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
        </svg>
        Отклонения по машинам (30 дней)
      </div>
      <div class="dash-bars">${rows}</div>
    </div>
  `;
}
/* Виджет: Динамика % отклонений по ISO-неделям (4 недели) */
function renderDashboardWeekDynamics(items) {
  if (!items.length) {
    return `
      <div class="dash-widget">
        <div class="dash-widget-title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
          </svg>
          Динамика отклонений по неделям
        </div>
        <div class="dash-widget-empty">За последний месяц проверок не было</div>
      </div>
    `;
  }

  const rows = items.map(item => {
    const failsPct = item.percent;
    const oksPct = 100 - failsPct;

    const percentText = failsPct.toFixed(1) + '%';
    const numbersText = `${item.fails} из ${item.total}`;

    const failWidth = Math.max(failsPct, 1.5);

    const label = `${item.label} (${item.range})`;

    return `
      <div class="dash-bar-item dash-bar-item-week">
        <span class="dash-bar-label dash-bar-label-week" title="${escapeAttr(label)}">${escapeHtml(item.label)}</span>
        <div class="dash-bar-track dash-bar-track-ok">
          <div class="dash-bar-fill-ok" style="width:${oksPct}%"></div>
          <div class="dash-bar-fill-fail" style="width:${failWidth}%"></div>
        </div>
        <span class="dash-bar-value">
          ${percentText}
          <span class="dash-bar-sub">${numbersText}</span>
        </span>
      </div>
    `;
  }).join('');

  return `
    <div class="dash-widget">
      <div class="dash-widget-title">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
        </svg>
        Динамика отклонений по неделям
      </div>
      <div class="dash-bars">${rows}</div>
    </div>
  `;
}

/* Виджет: Топ-5 потерь по отклонениям (30 дней) */
function renderDashboardTopLossesStats(items) {
  if (!items.length) {
    return `
      <div class="dash-widget">
        <div class="dash-widget-title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          Топ-5 потерь по отклонениям (30 дней)
        </div>
        <div class="dash-widget-empty">Отклонений по потерям за месяц не зафиксировано</div>
      </div>
    `;
  }

  const rows = items.map(item => {
    const failsPct = item.percent;
    const oksPct = 100 - failsPct;

    const percentText = failsPct.toFixed(1) + '%';
    const numbersText = `${item.fails} из ${item.total}`;

    const failWidth = Math.max(failsPct, 1.5);

    return `
      <div class="dash-bar-item">
        <span class="dash-bar-label dash-bar-label-plain" title="${escapeAttr(item.name)}">${escapeHtml(item.name)}</span>
        <div class="dash-bar-track dash-bar-track-ok">
          <div class="dash-bar-fill-ok" style="width:${oksPct}%"></div>
          <div class="dash-bar-fill-fail" style="width:${failWidth}%"></div>
        </div>
        <span class="dash-bar-value">
          ${percentText}
          <span class="dash-bar-sub">${numbersText}</span>
        </span>
      </div>
    `;
  }).join('');

  return `
    <div class="dash-widget">
      <div class="dash-widget-title">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13"/>
          <line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
        Топ-5 потерь по отклонениям (30 дней)
      </div>
      <div class="dash-bars">${rows}</div>
    </div>
  `;
}

/* Виджет: Топ-5 параметров CL по отклонениям (30 дней) */
function renderDashboardClParamStats(items) {
  if (!items.length) {
    return `
      <div class="dash-widget">
        <div class="dash-widget-title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="19" y1="5" x2="5" y2="19"/>
            <circle cx="6.5" cy="6.5" r="2.5"/>
            <circle cx="17.5" cy="17.5" r="2.5"/>
          </svg>
          Топ-5 параметров по отклонениям (30 дней)
        </div>
        <div class="dash-widget-empty">Отклонений по параметрам CL за месяц не зафиксировано</div>
      </div>
    `;
  }

  const rows = items.map(item => {
    const failsPct = item.percent;
    const oksPct = 100 - failsPct;
    const percentText = failsPct.toFixed(1) + '%';
    const numbersText = `${item.fails} из ${item.total}`;
    const failWidth = Math.max(failsPct, 1.5);
    const label = item.machine ? `${item.name} [${item.machine}]` : item.name;

    return `
      <div class="dash-bar-item">
        <span class="dash-bar-label dash-bar-label-plain" title="${escapeAttr(label)}">${escapeHtml(label)}</span>
        <div class="dash-bar-track dash-bar-track-ok">
          <div class="dash-bar-fill-ok" style="width:${oksPct}%"></div>
          <div class="dash-bar-fill-fail" style="width:${failWidth}%"></div>
        </div>
        <span class="dash-bar-value">
          ${percentText}
          <span class="dash-bar-sub">${numbersText}</span>
        </span>
      </div>
    `;
  }).join('');

  return `
    <div class="dash-widget">
      <div class="dash-widget-title">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="19" y1="5" x2="5" y2="19"/>
          <circle cx="6.5" cy="6.5" r="2.5"/>
          <circle cx="17.5" cy="17.5" r="2.5"/>
        </svg>
        Топ-5 параметров по отклонениям (30 дней)
      </div>
      <div class="dash-bars">${rows}</div>
    </div>
  `;
}

/* Виджет: круговая по типам */
function renderDashboardTypesDonut(segments, total) {
  if (!total) {
    return `
      <div class="dash-widget">
        <div class="dash-widget-title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21.21 15.89A10 10 0 1 1 8 2.83"/>
            <path d="M22 12A10 10 0 0 0 12 2v10z"/>
          </svg>
          Типы переходов (30 дней)
        </div>
        <div class="dash-widget-empty">За месяц проверок не было</div>
      </div>
    `;
  }

  // Собираем conic-gradient
  const gradientStops = segments.map(s => {
    return `${s.color} ${s.startAngle}deg ${s.endAngle}deg`;
  }).join(', ');

  const legend = segments.map(s => `
    <div class="dash-legend-row">
      <span class="dash-legend-dot" style="background:${s.color}"></span>
      <span class="dash-legend-name">${escapeHtml(s.type)}</span>
      <span class="dash-legend-count">${s.count}</span>
      <span class="dash-legend-percent">${s.percent}%</span>
    </div>
  `).join('');

  return `
    <div class="dash-widget">
      <div class="dash-widget-title">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21.21 15.89A10 10 0 1 1 8 2.83"/>
          <path d="M22 12A10 10 0 0 0 12 2v10z"/>
        </svg>
        Типы переходов (30 дней)
      </div>
      <div class="dash-donut-wrap">
        <div class="dash-donut" style="background: conic-gradient(${gradientStops})">
          <div class="dash-donut-hole">
            <div class="dash-donut-total">${total}</div>
            <div class="dash-donut-label">проверок</div>
          </div>
        </div>
        <div class="dash-donut-legend">${legend}</div>
      </div>
    </div>
  `;
}

/* Виджет: быстрые действия */
function renderDashboardActions() {
  return `
    <div class="dash-widget">
      <div class="dash-widget-title">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
        </svg>
        Быстрые действия
      </div>
      <div class="dash-actions">
        <button class="dash-action-btn dash-action-green" data-dash-action="check" type="button">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
          <span>Начать проверку</span>
        </button>
        <button class="dash-action-btn" data-dash-action="editor" type="button">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
          </svg>
          <span>Открыть редактор</span>
        </button>
        <button class="dash-action-btn dash-action-purple" data-dash-action="photos" type="button">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            <circle cx="8.5" cy="8.5" r="1.5"/>
            <polyline points="21 15 16 10 5 21"/>
          </svg>
          <span>Проверить фото</span>
        </button>
      </div>
    </div>
  `;
}
/* Виджет: «Требует внимания» */
function renderDashboardAttention(items) {
  // Иконки для разных типов проблем
  const iconSvg = (key) => {
    switch (key) {
      case 'image':
        return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>';
      case 'image-off':
        return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="2" y1="2" x2="22" y2="22"/><path d="M10.41 10.41a2 2 0 1 1-2.83-2.83"/><line x1="13.5" y1="13.5" x2="6" y2="21"/><line x1="18" y1="12" x2="21" y2="15"/><path d="M3.59 3.59A2 2 0 0 0 3 5v14a2 2 0 0 0 2 2h14a2 2 0 0 0 1.41-.59"/></svg>';
      case 'clock':
        return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>';
      case 'user-x':
        return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="18" y1="8" x2="23" y2="13"/><line x1="23" y1="8" x2="18" y2="13"/></svg>';
      case 'message':
        return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';
      default:
        return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>';
    }
  };

  if (!items.length) {
    return `
      <div class="dash-widget dash-attention dash-attention-ok">
        <div class="dash-widget-title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
          Требует внимания
        </div>
        <div class="dash-attention-ok-text">
          ✅ Всё в порядке — проблем не обнаружено
        </div>
      </div>
    `;
  }

  const rows = items.map(it => `
    <div class="dash-attention-item" data-dash-attention="${it.action}">
      <span class="dash-attention-icon">${iconSvg(it.key === 'brokenPhotos' ? 'image' : it.icon)}</span>
      <div class="dash-attention-text">
        <div class="dash-attention-main">${escapeHtml(it.text)}</div>
        <div class="dash-attention-hint">${escapeHtml(it.hint)}</div>
      </div>
      <button class="dash-attention-btn" type="button" data-dash-attention-btn="${it.action}">
        Перейти →
      </button>
    </div>
  `).join('');

  return `
    <div class="dash-widget dash-attention">
      <div class="dash-widget-title">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13"/>
          <line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
        Требует внимания (${items.length})
      </div>
      <div class="dash-attention-list">${rows}</div>
    </div>
  `;
}
/* Двухколоночный блок (шаг 3) */
function renderDashboardMainBlock(stats) {
  return `
    <div class="dash-grid">
      <div>${renderDashboardRecentChecks(stats.recentChecks)}</div>
      <div>${renderDashboardTopProblems(stats.topProblems, stats.topProblemsMax)}</div>
    </div>
  `;
}

/* Второй двухколоночный блок: линии + операторы */
function renderDashboardSecondaryBlock(stats) {
  return `
    <div class="dash-grid">
      <div>${renderDashboardLineStats(stats.lineStats)}</div>
      <div>${renderDashboardOperatorStats(stats.operatorStats)}</div>
    </div>
  `;
}

/* Виджет: % отклонений по линиям (7 дней) — двухцветный бар */
function renderDashboardLineStats(items) {
  if (!items.length) {
    return `
      <div class="dash-widget">
        <div class="dash-widget-title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="20" x2="18" y2="10"/>
            <line x1="12" y1="20" x2="12" y2="4"/>
            <line x1="6" y1="20" x2="6" y2="14"/>
          </svg>
          Отклонения по линиям (7 дней)
        </div>
        <div class="dash-widget-empty">За неделю проверок не было</div>
      </div>
    `;
  }

  const rows = items.map(item => {
    // Процент ОК и процент отклонений — сумма всегда 100
    const failsPct = item.total > 0 ? (item.fails / item.total) * 100 : 0;
    const oksPct = 100 - failsPct;

    const percentText = failsPct.toFixed(1) + '%';
    const numbersText = `${item.fails} из ${item.total}`;

    // Красная часть — узкая, если 0% — не показываем вообще
    const failWidth = failsPct > 0 ? Math.max(failsPct, 1.5) : 0; // мин. 1.5% — чтобы тонкая полоска была видна

    return `
      <div class="dash-bar-item">
        <span class="dash-bar-label">${escapeHtml(item.line)}</span>
        <div class="dash-bar-track dash-bar-track-ok">
          <div class="dash-bar-fill-ok" style="width:${oksPct}%"></div>
          <div class="dash-bar-fill-fail" style="width:${failWidth}%"></div>
        </div>
        <span class="dash-bar-value">
          ${percentText}
          <span class="dash-bar-sub">${numbersText}</span>
        </span>
      </div>
    `;
  }).join('');

  return `
    <div class="dash-widget">
      <div class="dash-widget-title">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="20" x2="18" y2="10"/>
          <line x1="12" y1="20" x2="12" y2="4"/>
          <line x1="6" y1="20" x2="6" y2="14"/>
        </svg>
        Отклонения по линиям (7 дней)
      </div>
      <div class="dash-bars">${rows}</div>
    </div>
  `;
}

/* Виджет: Топ операторов по отклонениям (30 дней) */
function renderDashboardOperatorStats(items) {
  if (!items.length) {
    return `
      <div class="dash-widget">
        <div class="dash-widget-title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
          Топ операторов по отклонениям (30 дней)
        </div>
        <div class="dash-widget-empty">Отклонений за месяц не зафиксировано</div>
      </div>
    `;
  }

  const rows = items.map(item => {
    const failsPct = item.percent;
    const oksPct = 100 - failsPct;

    const percentText = failsPct.toFixed(1) + '%';
    const numbersText = `${item.fails} из ${item.total}`;

    // Минимальная ширина красной части, чтобы тонкая полоска была заметна
    const failWidth = Math.max(failsPct, 1.5);

    return `
      <div class="dash-bar-item">
        <span class="dash-bar-label dash-bar-label-plain" title="${escapeAttr(item.name)}">${escapeHtml(item.name)}</span>
        <div class="dash-bar-track dash-bar-track-ok">
          <div class="dash-bar-fill-ok" style="width:${oksPct}%"></div>
          <div class="dash-bar-fill-fail" style="width:${failWidth}%"></div>
        </div>
        <span class="dash-bar-value">
          ${percentText}
          <span class="dash-bar-sub">${numbersText}</span>
        </span>
      </div>
    `;
  }).join('');

  return `
    <div class="dash-widget">
      <div class="dash-widget-title">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
        Топ операторов по отклонениям (30 дней)
      </div>
      <div class="dash-bars">${rows}</div>
    </div>
  `;
}

/* Виджет: последние 5 проверок */
function renderDashboardRecentChecks(checks) {
  if (!checks.length) {
    return `
      <div class="dash-widget">
        <div class="dash-widget-title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
          </svg>
          Последние проверки
        </div>
        <div class="dash-widget-empty">Проверок пока нет</div>
      </div>
    `;
  }

  const rows = checks.map(c => {
    const failsHtml = c.fails > 0
      ? `<span class="badge badge-fail">${c.fails}</span>`
      : `<span class="badge badge-ok">0</span>`;
    return `
      <tr>
        <td class="dash-recent-date">${fmtDate(c.timestamp)}</td>
        <td class="dash-recent-line">${escapeHtml(c.line)}</td>
        <td class="dash-recent-operator">${escapeHtml(c.operator)}</td>
        <td>${escapeHtml(c.type)}</td>
        <td class="dash-recent-fails">${failsHtml}</td>
        <td style="text-align:right">
          <button class="dash-recent-btn" data-dash-open-record="${escapeAttr(c.id)}">Открыть</button>
        </td>
      </tr>
    `;
  }).join('');

  return `
    <div class="dash-widget">
      <div class="dash-widget-title">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <polyline points="12 6 12 12 16 14"/>
        </svg>
        Последние проверки
      </div>
      <table class="dash-recent">
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

/* Виджет: топ-5 проблемных стандартов */
function renderDashboardTopProblems(problems, maxCount) {
  if (!problems.length) {
    return `
      <div class="dash-widget">
        <div class="dash-widget-title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          Топ проблемных стандартов
        </div>
        <div class="dash-widget-empty">Отклонений за месяц не зафиксировано</div>
      </div>
    `;
  }

  const items = problems.map(p => {
    const width = maxCount > 0 ? Math.round((p.count / maxCount) * 100) : 0;
    // Показываем OPL + машину, если машина есть
    const oplDisplay = p.machine
      ? `${p.opl} [${p.machine}]`
      : p.opl;

    return `
      <div class="dash-top-item">
        <div class="dash-top-head">
          <span class="dash-top-opl">${escapeHtml(oplDisplay)}</span>
          <span class="dash-top-title" title="${escapeAttr(p.title)}">${escapeHtml(p.title || '—')}</span>
          <span class="dash-top-count">${p.count} откл.</span>
        </div>
        <div class="dash-top-bar-outer">
          <div class="dash-top-bar-inner" style="width:${width}%"></div>
        </div>
      </div>
    `;
  }).join('');

  return `
    <div class="dash-widget">
      <div class="dash-widget-title">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13"/>
          <line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
        Топ проблемных стандартов (30 дней)
      </div>
      <div class="dash-top-list">${items}</div>
    </div>
  `;
}

/* Расчёт всех показателей дашборда */
function calculateDashboardStats(workshopId) {
  let standards = getStandards();
  let history = getHistory();
  const brands = getBrands();
  const operators = getOperators();

  // --- Фильтр по цеху: оставляем только линии выбранного цеха ---
  if (workshopId) {
    standards = standards.filter(s => getWorkshopIdForLine(s.line) === workshopId);
    history = history.filter(h => getWorkshopIdForLine(h.line) === workshopId);
  }

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekAgo = new Date(now.getTime() - 7 * 24 * 3600 * 1000);

  // --- Стандарты ---
  const totalStandards = standards.length;
  const activeStandards = standards.filter(s => s.active !== false).length;

  // --- Проверки за сегодня ---
  const checksToday = history.filter(h => {
    const ts = new Date(h.timestamp);
    return ts >= todayStart;
  }).length;

  // --- Отклонения за неделю (сумма всех «Не ОК» по всем проверкам) ---
  const checksWeek = history.filter(h => {
    const ts = new Date(h.timestamp);
    return ts >= weekAgo;
  });
    // --- Проверок потерь за неделю ---
  const topLossChecksWeek = checksWeek.filter(h => h.mode === 'toploss').length;
    // --- Проверок CL (мех + электро) за неделю ---
  const clChecksWeek = checksWeek.filter(h => h.mode === 'cl' || h.mode === 'electronic').length;

  // --- Топ-5 потерь по отклонениям (30 дней) ---
  const monthAgoForLosses = new Date(now.getTime() - 30 * 24 * 3600 * 1000);
  const monthChecksForLosses = history.filter(h =>
    h.mode === 'toploss' &&
    new Date(h.timestamp) >= monthAgoForLosses
  );

  // { lossId: { total, fails, name } }
  const lossAgg = {};
  monthChecksForLosses.forEach(h => {
    h.items.forEach(it => {
      const st = standards.find(s => s.id === it.standardId);
      if (!st || !Array.isArray(st.topLosses)) return;
      st.topLosses.forEach(lid => {
        // учитываем только те потери, что были выбраны в этой проверке
        if (!(h.topLosses || []).includes(lid)) return;
        if (!lossAgg[lid]) {
          const l = findLossById(lid);
          lossAgg[lid] = { name: l ? l.name : lid, total: 0, fails: 0 };
        }
        lossAgg[lid].total++;
        if (it.status === 'FAIL') lossAgg[lid].fails++;
      });
    });
  });

  const topLossStats = Object.entries(lossAgg)
    .map(([id, v]) => ({
      id,
      name: v.name,
      total: v.total,
      fails: v.fails,
      percent: v.total > 0 ? (v.fails / v.total) * 100 : 0
    }))
    .filter(x => x.fails > 0)
    .sort((a, b) => b.fails - a.fails)
    .slice(0, 5);

  // --- Топ-5 параметров CL (мех + электро) по отклонениям (30 дней) ---
  const clMonthParamChecks = history.filter(h =>
    (h.mode === 'cl' || h.mode === 'electronic') &&
    new Date(h.timestamp) >= monthAgoForLosses
  );
  const clParamAgg = {};
  clMonthParamChecks.forEach(h => {
    h.items.forEach(it => {
      const isElec = h.mode === 'electronic';
      const name = isElec ? (it.paramName || '—') : (it.title || it.oplNumber || '—');
      const key = it.machine ? name + ' [' + it.machine + ']' : name;
      if (!clParamAgg[key]) clParamAgg[key] = { name: name, machine: it.machine || '', total: 0, fails: 0 };
      clParamAgg[key].total++;
      if (it.status === 'FAIL') clParamAgg[key].fails++;
    });
  });
  const clParamStats = Object.values(clParamAgg)
    .map(function(v) { return { name: v.name, machine: v.machine, total: v.total, fails: v.fails, percent: v.total > 0 ? (v.fails / v.total) * 100 : 0 }; })
    .filter(function(v) { return v.fails > 0; })
    .sort(function(a, b) { return b.fails - a.fails; })
    .slice(0, 5);

  // --- Потери без проверок за 30 дней ---
  const allLosses = getAllLossItems();
  const checkedLossIds = new Set();
  monthChecksForLosses.forEach(h => {
    (h.topLosses || []).forEach(lid => checkedLossIds.add(lid));
  });
  const lossesNeverChecked = allLosses.filter(l => !checkedLossIds.has(l.id)).length;

  // --- Стандарты без связи с потерями (активные, topLosses пуст) ---
  const standardsWithoutLosses = standards.filter(s =>
    s.active !== false &&
    (!Array.isArray(s.topLosses) || s.topLosses.length === 0)
  ).length;
  const failsWeek = checksWeek.reduce((sum, h) => {
    return sum + h.items.filter(i => i.status === 'FAIL').length;
  }, 0);
  const checksWeekCount = checksWeek.length;

  // --- Фото ---
  const totalPhotos = standards.reduce((sum, s) => {
    return sum + (Array.isArray(s.photos) ? s.photos.length : 0);
  }, 0);
  const standardsWithPhoto = standards.filter(s =>
    Array.isArray(s.photos) && s.photos.length > 0
  ).length;
  const photoCoverage = totalStandards > 0
    ? Math.round((standardsWithPhoto / totalStandards) * 100)
    : 0;

  // --- Последние 5 проверок ---
  const recentChecks = [...history]
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, 5)
    .map(h => ({
      id: h.id,
      timestamp: h.timestamp,
      line: h.line,
      operator: h.operator,
      type: h.type,
      fails: h.items.filter(i => i.status === 'FAIL').length
    }));

  // --- Топ-5 проблемных стандартов за месяц ---
  const monthAgo = new Date(now.getTime() - 30 * 24 * 3600 * 1000);
  const monthChecks = history.filter(h => new Date(h.timestamp) >= monthAgo);

  const stdFails = {};   // ключ = "OPL [machine]"
  monthChecks.forEach(h => {
    h.items.forEach(it => {
      if (it.status !== 'FAIL') return;

      const oplNumber = it.oplNumber || it.number || '—';
      const machine = it.machine || '';
      // Ключ: OPL + машина — чтобы одинаковые OPL на разных машинах не сливались
      const key = machine ? `${oplNumber} [${machine}]` : oplNumber;

      if (!stdFails[key]) {
        stdFails[key] = {
          opl: oplNumber,
          machine: machine,
          title: it.title || '',
          node: it.node || '',
          line: h.line || '',
          count: 0
        };
      }
      stdFails[key].count++;
    });
  });

  const topProblems = Object.values(stdFails)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Максимум для расчёта ширины баров
  const topProblemsMax = topProblems.length ? topProblems[0].count : 1;

  // --- % отклонений по линиям за неделю ---
  const lineCounts = {};   // { line: { total: N, fails: N } }
  checksWeek.forEach(h => {
    const line = h.line || '—';
    if (!lineCounts[line]) lineCounts[line] = { total: 0, fails: 0 };
    lineCounts[line].total += h.items.length;
    lineCounts[line].fails += h.items.filter(i => i.status === 'FAIL').length;
  });
  const lineStats = Object.entries(lineCounts)
    .map(([line, v]) => ({
      line,
      total: v.total,
      fails: v.fails,
      percent: v.total > 0 ? (v.fails / v.total) * 100 : 0
    }))
    .sort((a, b) => b.percent - a.percent);   // худшие сверху

  // --- Топ операторов по отклонениям (30 дней) ---
  const opCounts = {};   // { operator: { total: N, fails: N } }
  monthChecks.forEach(h => {
    const op = h.operator || '—';
    if (!opCounts[op]) opCounts[op] = { total: 0, fails: 0 };
    opCounts[op].total += h.items.length;
    opCounts[op].fails += h.items.filter(i => i.status === 'FAIL').length;
  });
  // Оставляем только тех, у кого есть хотя бы 1 отклонение
  const operatorStats = Object.entries(opCounts)
    .filter(([_, v]) => v.fails > 0)
    .map(([name, v]) => ({
      name,
      total: v.total,
      fails: v.fails,
      percent: v.total > 0 ? (v.fails / v.total) * 100 : 0
    }))
    .sort((a, b) => b.percent - a.percent)   // худшие сверху
    .slice(0, 5);

  // --- Столбики по дням (7 дней, двухцветные) ---
  const daysSeries = [];
  for (let i = 6; i >= 0; i--) {
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const dayEnd = new Date(dayStart.getTime() + 24 * 3600 * 1000);
    const dayChecks = history.filter(h => {
      const ts = new Date(h.timestamp);
      return ts >= dayStart && ts < dayEnd;
    });

    // Проверка "с отклонениями" = есть хотя бы один FAIL в items
    const withFails = dayChecks.filter(h =>
      h.items.some(i => i.status === 'FAIL')
    ).length;
    const withoutFails = dayChecks.length - withFails;

    // Подпись: день + месяц, например «24.09»
    const dd = String(dayStart.getDate()).padStart(2, '0');
    const mm = String(dayStart.getMonth() + 1).padStart(2, '0');

    daysSeries.push({
      label: `${dd}.${mm}`,
      date: dayStart,
      total: dayChecks.length,
      withFails,
      withoutFails
    });
  }
  const daysSeriesMax = daysSeries.reduce((max, d) => Math.max(max, d.total), 0) || 1;

  // --- Круговая по типам переходов (30 дней) ---
  const typeCounts = { ChangeOver: 0, CL_TO: 0, CL_Conversion: 0 };
  monthChecks.forEach(h => {
    if (h.type && typeCounts[h.type] !== undefined) {
      typeCounts[h.type]++;
    }
  });
  const typesTotal = typeCounts.ChangeOver + typeCounts.CL_TO + typeCounts.CL_Conversion;

  // Проценты для conic-gradient
  const typeColors = {
    ChangeOver: '#00d4ff',
    CL_TO: '#7b5cff',
    CL_Conversion: '#10b981'
  };
  let acc = 0;
  const typeSegments = [];
  ['ChangeOver', 'CL_TO', 'CL_Conversion'].forEach(type => {
    const count = typeCounts[type];
    const percent = typesTotal > 0 ? (count / typesTotal) * 360 : 0;
    typeSegments.push({
      type,
      count,
      color: typeColors[type],
      startAngle: acc,
      endAngle: acc + percent,
      percent: typesTotal > 0 ? Math.round((count / typesTotal) * 100) : 0
    });
    acc += percent;
  });
  // --- Отклонения по машинам (30 дней) ---
  const machineCounts = {};
  monthChecks.forEach(h => {
    h.items.forEach(it => {
      const m = it.machine || '—';
      if (!machineCounts[m]) machineCounts[m] = { total: 0, fails: 0 };
      machineCounts[m].total++;
      if (it.status === 'FAIL') machineCounts[m].fails++;
    });
  });
  const machineStats = Object.entries(machineCounts)
    .map(([machine, v]) => ({
      machine,
      total: v.total,
      fails: v.fails,
      percent: v.total > 0 ? (v.fails / v.total) * 100 : 0
    }))
    .filter(m => m.fails > 0)
    .sort((a, b) => b.fails - a.fails)
    .slice(0, 5);

  // --- Динамика по ISO-неделям (4 последние) ---
  const getIsoWeek = (date) => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNum = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return { year: d.getUTCFullYear(), week: weekNum };
  };

  const getIsoWeekRange = (year, week) => {
    const jan4 = new Date(Date.UTC(year, 0, 4));
    const jan4Day = jan4.getUTCDay() || 7;
    const week1Mon = new Date(jan4.getTime() - (jan4Day - 1) * 86400000);
    const mon = new Date(week1Mon.getTime() + (week - 1) * 7 * 86400000);
    const sun = new Date(mon.getTime() + 6 * 86400000);
    return { mon, sun };
  };

  const nowForWeeks = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const currentWeek = getIsoWeek(nowForWeeks);

  const weekStats = [];
  for (let i = 0; i < 4; i++) {
    let w = currentWeek.week - i;
    let y = currentWeek.year;
    while (w < 1) {
      y -= 1;
      w += 52;
    }

    const { mon, sun } = getIsoWeekRange(y, w);
    const upperBound = i === 0
      ? new Date(nowForWeeks.getTime() + 86400000)
      : new Date(sun.getTime() + 86400000);

    const weekChecks = history.filter(h => {
      const ts = new Date(h.timestamp);
      return ts >= mon && ts < upperBound;
    });

    const total = weekChecks.reduce((s, h) => s + h.items.length, 0);
    const fails = weekChecks.reduce((s, h) => s + h.items.filter(it => it.status === 'FAIL').length, 0);
    const checksCount = weekChecks.length;

    const fmtShort = (d) => {
      const dd = String(d.getUTCDate()).padStart(2, '0');
      const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
      return `${dd}.${mm}`;
    };
    const rangeText = `${fmtShort(mon)}–${fmtShort(sun)}`;

    weekStats.push({
      week: w,
      year: y,
      label: `W${w}`,
      range: rangeText,
      total,
      fails,
      checksCount,
      percent: total > 0 ? (fails / total) * 100 : 0
    });
  }
  const weekStatsFiltered = weekStats.filter(w => w.checksCount > 0);
    // --- «Требует внимания» — агрегируем проблемы ---
  const monthAgo2 = new Date(now.getTime() - 30 * 24 * 3600 * 1000);

  // 1) Битые ссылки (из localStorage, обновляется при «Проверить фото»)
  const brokenPhotosCount = parseInt(localStorage.getItem('cl_photos_broken_count') || '0', 10);

  // 2) Стандарты без фото (только активные — неактивные не важны)
  const activeStandardsList = standards.filter(s => s.active !== false);
  const standardsWithoutPhoto = activeStandardsList.filter(s =>
    !Array.isArray(s.photos) || s.photos.length === 0
  ).length;

  // 3) Стандарты без проверок за 30 дней
  // Собираем все standardId, которые встречались в истории за 30 дней
  const usedStandardIds = new Set();
  history.forEach(h => {
    if (new Date(h.timestamp) < monthAgo2) return;
    h.items.forEach(it => {
      if (it.standardId) usedStandardIds.add(it.standardId);
    });
  });
  const standardsNeverChecked = activeStandardsList.filter(s =>
    !usedStandardIds.has(s.id)
  ).length;

  // 4) Операторы без активности 7 дней
  const activeOperators = new Set();
  history.forEach(h => {
    if (new Date(h.timestamp) < weekAgo) return;
    if (h.operator) activeOperators.add(h.operator);
  });
  const operatorsInactive = operators.filter(o =>
    !activeOperators.has(o)
  ).length;

  // 5) Стандарты с комментарием к деактивации (деактивированы, но с записанной причиной)
  const standardsWithDeactivationComment = standards.filter(s =>
    s.active === false &&
    s.deactivationComment &&
    s.deactivationComment.trim() !== ''
  ).length;

  const attentionItems = [];
  if (brokenPhotosCount > 0) {
    attentionItems.push({
      key: 'brokenPhotos',
      icon: 'image',
      text: `Битых ссылок на фото: ${brokenPhotosCount}`,
      hint: 'Проверьте фотографии в Настройках',
      action: 'photos-check'
    });
  }
  if (standardsWithoutPhoto > 0) {
    attentionItems.push({
      key: 'noPhoto',
      icon: 'image-off',
      text: `Активных стандартов без фото: ${standardsWithoutPhoto}`,
      hint: 'Добавьте фото в редакторе стандартов',
      action: 'editor'
    });
  }
  if (standardsNeverChecked > 0) {
    attentionItems.push({
      key: 'neverChecked',
      icon: 'clock',
      text: `Стандартов не проверялись более 30 дней: ${standardsNeverChecked}`,
      hint: 'Проверьте, актуальны ли они',
      action: 'editor'
    });
  }
  if (operatorsInactive > 0) {
    attentionItems.push({
      key: 'opInactive',
      icon: 'user-x',
      text: `Операторов без активности >7 дней: ${operatorsInactive}`,
      hint: 'Из общего списка операторов',
      action: 'settings'
    });
  }
  if (standardsWithDeactivationComment > 0) {
    attentionItems.push({
      key: 'deactComment',
      icon: 'message',
      text: `Деактивированных стандартов с комментарием: ${standardsWithDeactivationComment}`,
      hint: 'Возможно, пора вернуть их в работу',
      action: 'editor'
    });
  }
    if (lossesNeverChecked > 0) {
    attentionItems.push({
      key: 'lossesNeverChecked',
      icon: 'clock',
      text: `Потерь без проверок >30 дней: ${lossesNeverChecked}`,
      hint: 'Откройте вкладку TOP Losses и проведите проверку',
      action: 'toploss'
    });
  }
  if (standardsWithoutLosses > 0) {
    attentionItems.push({
      key: 'standardsWithoutLosses',
      icon: 'message',
      text: `Стандартов без связи с потерями: ${standardsWithoutLosses}`,
      hint: 'Привяжите их к потерям в редакторе стандартов',
      action: 'editor'
    });
  }
  return {
    totalStandards,
    activeStandards,
    checksToday,
    failsWeek,
    checksWeek,
    checksWeekCount,
    totalPhotos,
    standardsWithPhoto,
    photoCoverage,
    totalBrands: brands.length,
    totalOperators: operators.length,

    recentChecks,
    topProblems,
    topProblemsMax,
    lineStats,
    operatorStats,
    daysSeries,
    daysSeriesMax,
    typeSegments,
    typesTotal,
    attentionItems,

    // --- НОВОЕ ---
    machineStats,
    weekStats: weekStatsFiltered,

    // --- TOP LOSSES ---
    topLossChecksWeek,
    topLossStats,
    lossesNeverChecked,
    standardsWithoutLosses,

    // --- CL (мех + электро) ---
    clChecksWeek,
    clParamStats
  };
}

/* Отрисовка верхнего ряда карточек */
function renderDashboardStats(stats) {
  return `
    <div class="dash-stats">

      <div class="dash-stat">
        <div class="dash-stat-head">
          <span>Стандарты активные</span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
          </svg>
        </div>
        <div class="dash-stat-value">${stats.activeStandards}</div>
        <div class="dash-stat-sub">из <strong>${stats.totalStandards}</strong> всего</div>
      </div>

      <div class="dash-stat dash-stat-green">
        <div class="dash-stat-head">
          <span>Проверок сегодня</span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
        </div>
        <div class="dash-stat-value">${stats.checksToday}</div>
        <div class="dash-stat-sub">за текущие сутки</div>
      </div>

      <div class="dash-stat dash-stat-cyan">
        <div class="dash-stat-head">
          <span>Проверок за неделю</span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="20" x2="18" y2="10"/>
            <line x1="12" y1="20" x2="12" y2="4"/>
            <line x1="6" y1="20" x2="6" y2="14"/>
          </svg>
        </div>
        <div class="dash-stat-value">${stats.checksWeekCount}</div>
        <div class="dash-stat-sub">за последние 7 дней</div>
      </div>

      <div class="dash-stat dash-stat-red">
        <div class="dash-stat-head">
          <span>Отклонений</span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
        </div>
        <div class="dash-stat-value">${stats.failsWeek}</div>
        <div class="dash-stat-sub">за последние 7 дней</div>
      </div>

<div class="dash-stat dash-stat-amber">
        <div class="dash-stat-head">
          <span>Проверок потерь</span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
        </div>
        <div class="dash-stat-value">${stats.topLossChecksWeek}</div>
        <div class="dash-stat-sub">за последние 7 дней</div>
      </div>

      <div class="dash-stat dash-stat-purple">
        <div class="dash-stat-head">
          <span>Проверок CL</span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
          </svg>
        </div>
        <div class="dash-stat-value">${stats.clChecksWeek}</div>
        <div class="dash-stat-sub">за последние 7 дней</div>
      </div>

    </div>
  `;
}
