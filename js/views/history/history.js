/* ============================================================
   ВКЛАДКА «История»
   Модуль общего пространства имён: функции и переменные видны
   во всех файлах. Порядок подключения — index.html.
   ============================================================ */

/* ============================================================
   ВКЛАДКА ИСТОРИЯ
   ============================================================ */
$('#periodSelect').addEventListener('change', () => {
  const v = $('#periodSelect').value;
  $('#dateFromField').style.display = (v === 'custom') ? 'block' : 'none';
  $('#dateToField').style.display = (v === 'custom') ? 'block' : 'none';
  // Период тоже влияет на список — сбрасываем страницу
  historyPage = 1;
  renderHistory();
});

/* При смене любого фильтра — сбрасываем на первую страницу */
const resetHistoryPageAndRender = () => {
  historyPage = 1;
  renderHistory();
};

$('#applyFilterBtn').addEventListener('click', resetHistoryPageAndRender);
$('#filterLine').addEventListener('change', resetHistoryPageAndRender);
$('#filterType').addEventListener('change', resetHistoryPageAndRender);
$('#filterMode')?.addEventListener('change', resetHistoryPageAndRender);

function fillHistoryFilters() {
  const lineFilter = $('#filterLine');
  lineFilter.innerHTML = '<option value="">Все</option>' +
    getLines().map(l => `<option>${escapeHtml(l)}</option>`).join('');
}

function getFilteredHistory() {
  let hist = getHistory();
  const period = $('#periodSelect').value;
  const line = $('#filterLine').value;
  const type = $('#filterType').value;
  const mode = $('#filterMode')?.value || '';
  const now = new Date();

  if (period === 'week') {
    const from = new Date(now.getTime() - 7*24*3600*1000);
    hist = hist.filter(h => new Date(h.timestamp) >= from);
  } else if (period === 'month') {
    const from = new Date(now.getTime() - 30*24*3600*1000);
    hist = hist.filter(h => new Date(h.timestamp) >= from);
  } else if (period === 'custom') {
    const df = $('#dateFrom').value;
    const dt = $('#dateTo').value;
    if (df) {
      const from = new Date(df + 'T00:00:00');
      hist = hist.filter(h => new Date(h.timestamp) >= from);
    }
    if (dt) {
      const to = new Date(dt + 'T23:59:59');
      hist = hist.filter(h => new Date(h.timestamp) <= to);
    }
  }

  if (line) hist = hist.filter(h => h.line === line);
  if (type) hist = hist.filter(h => h.type === type);

  // Фильтр по режиму
  if (mode === 'changeover') {
    // COCL = всё, где mode НЕ 'toploss' и НЕ 'electronic'
    hist = hist.filter(h => h.mode !== 'toploss' && h.mode !== 'electronic');
  } else if (mode === 'toploss') {
    hist = hist.filter(h => h.mode === 'toploss');
  } else if (mode === 'electronic') {
    hist = hist.filter(h => h.mode === 'electronic');
  }

  return hist.sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));
}

/* ============================================================
   ИСТОРИЯ: вспомогательные для CL-режимов
   ============================================================ */

/* Текстовое имя режима записи истории */
function getHistoryModeText(h) {
  if (h.mode === 'toploss') return 'TOP Losses';
  if (h.mode === 'electronic') return 'CL Electronic';
  if (h.mode === 'cl') return 'CL (мех)';
  return 'COCL';
}

/* Смена CL-записи в человекочитаемом виде: «День · A» / «Ночь · B».
   Для CL-записей h.shift хранит букву бригады (A/B/C/D), h.date — дату.
   День/ночь восстанавливается по графику смен.
   Для обычных записей возвращает h.shift как есть (или '—' при пустом). */
function formatClShift(h) {
  const letter = String(h.shift || '').trim();
  if (/^[A-D]$/.test(letter) && h.date) {
    const shifts = getShiftsForDate(h.date);
    if (shifts.day === letter) return 'День · ' + letter;
    if (shifts.night === letter) return 'Ночь · ' + letter;
  }
  return h.shift || '—';
}

function renderHistory() {
  const hist = getFilteredHistory();
  $('#historyCount').textContent = hist.length;

  const list = $('#historyList');
  if (!hist.length) {
    list.innerHTML = '<div class="empty-state">Записей нет</div>';
    // Очищаем пагинацию
    const pag = $('#historyPagination');
    if (pag) pag.innerHTML = '';
    return;
  }

  // --- Пагинация ---
  const totalPages = Math.ceil(hist.length / historyPageSize);
  if (historyPage > totalPages) historyPage = totalPages;
  if (historyPage < 1) historyPage = 1;

  const startIdx = (historyPage - 1) * historyPageSize;
  const endIdx = Math.min(startIdx + historyPageSize, hist.length);
  const pageItems = hist.slice(startIdx, endIdx);

  // --- Таблица ---
  list.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Дата/время</th>
          <th>Режим</th>
          <th>Оператор</th>
          <th>Смена</th>
          <th>Линия</th>
          <th>Контекст</th>
          <th>Пунктов</th>
          <th>Не ОК</th>
          <th>Не проверено</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        ${pageItems.map(h => {
          const fails = h.items.filter(i => i.status === 'FAIL').length;
          const unchecked = h.items.filter(i => i.status === 'UNCHECKED').length;
          const isTopLoss = h.mode === 'toploss';
          const isCl = h.mode === 'cl' || h.mode === 'electronic';
          const isElec = h.mode === 'electronic';

          // --- Контекст ---
          let contextHtml = '—';
          if (isTopLoss) {
            const names = (h.topLosses || [])
              .map(id => findLossById(id))
              .filter(Boolean)
              .map(l => l.name);
            contextHtml = names.length
              ? `<span class="tl-history-losses">${names.map(escapeHtml).join(' · ')}</span>`
              : '—';
          } else if (isCl) {
            const brandBadge = `<span class="badge ${isElec ? 'badge-mode-electronic' : 'badge-mode-cl'}">${escapeHtml(h.brandActual || '—')}</span>`;
            const planNote = (h.brandPlanned && h.brandPlanned !== h.brandActual)
              ? ` <span style="font-size:11px;color:var(--accent-amber);font-style:italic">(план: ${escapeHtml(h.brandPlanned)})</span>`
              : '';
            contextHtml = brandBadge + planNote;
          } else {
            const badgeCls = h.type === 'ChangeOver' ? 'badge-changeover' :
                            h.type === 'CL_TO' ? 'badge-clto' :
                            h.type === 'CL_Conversion' ? 'badge-clconv' : 'badge-mode-cocl';
            contextHtml = `
              <span class="badge ${badgeCls}">${escapeHtml(h.type || '—')}</span>
              <span class="history-brands">${escapeHtml(h.brandFrom || '—')} → ${escapeHtml(h.brandTo || '—')}</span>
            `;
          }

          // --- Бейдж режима ---
          let modeBadge;
          if (isTopLoss) {
            modeBadge = `<span class="badge badge-mode-toploss">TOP</span>`;
          } else if (h.mode === 'cl') {
            modeBadge = `<span class="badge badge-mode-cl">CL</span>`;
          } else if (isElec) {
            modeBadge = `<span class="badge badge-mode-electronic">E-PARAM</span>`;
          } else {
            // COCL — зависит от типа
            const type = h.type || '';
            if (type === 'ChangeOver') {
              modeBadge = `<span class="badge badge-changeover">CHANGE OVER</span>`;
            } else if (type === 'CL_TO') {
              modeBadge = `<span class="badge badge-clto">CL В ТО</span>`;
            } else if (type === 'CL_Conversion') {
              modeBadge = `<span class="badge badge-clconv">CL В КОНВЕРТ.</span>`;
            } else {
              modeBadge = `<span class="badge badge-mode-cocl">COCL</span>`;
            }
          }

          // --- Колонка «Не проверено» ---
          const uncheckedHtml = unchecked > 0
            ? `<span class="badge badge-unchecked">${unchecked}</span>`
            : ((isTopLoss || isCl) ? '<span class="badge badge-ok">0</span>' : '—');

          return `
            <tr>
              <td>${fmtDate(h.timestamp)}</td>
              <td>${modeBadge}</td>
              <td>${escapeHtml(h.operator)}</td>
              <td>${escapeHtml(formatClShift(h))}</td>
              <td>${escapeHtml(h.line)}</td>
              <td>${contextHtml}</td>
              <td>${h.items.length}</td>
              <td>${fails ? `<span class="badge badge-fail">${fails}</span>` : '<span class="badge badge-ok">0</span>'}</td>
              <td>${uncheckedHtml}</td>
              <td><button class="btn btn-secondary btn-sm" onclick="viewRecord('${h.id}')">Открыть</button></td>
            </tr>`;
        }).join('')}
      </tbody>
    </table>
  `;

  // --- Рендер пагинации ---
  renderHistoryPagination(hist.length, totalPages, startIdx, endIdx);
}

/* Пагинация истории */
function renderHistoryPagination(totalItems, totalPages, startIdx, endIdx) {
  let bar = $('#historyPagination');

  // Если контейнера нет — создаём после таблицы
  if (!bar) {
    const list = $('#historyList');
    if (!list) return;
    list.insertAdjacentHTML('afterend', '<div class="pagination-bar" id="historyPagination"></div>');
    bar = $('#historyPagination');
  }

  if (!bar) return;

  // Одна страница и всё влезает — только счётчик
  if (totalPages <= 1 && totalItems <= historyPageSize) {
    bar.innerHTML = `<span class="pagination-info">Показано ${startIdx + 1}–${endIdx} из ${totalItems}</span>`;
    return;
  }

  let html = `<span class="pagination-info">Показано ${startIdx + 1}–${endIdx} из ${totalItems}</span>`;
  html += '<div class="pagination-controls">';

  // Назад
  html += `<button class="pagination-btn" ${historyPage === 1 ? 'disabled' : ''}
           onclick="changeHistoryPage(${historyPage - 1})">←</button>`;

  // Страницы (сокращённо — 5 вокруг текущей)
  const pages = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || Math.abs(i - historyPage) <= 2) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== '...') {
      pages.push('...');
    }
  }
  pages.forEach(p => {
    if (p === '...') {
      html += '<span class="pagination-dots">…</span>';
    } else {
      html += `<button class="pagination-btn ${p === historyPage ? 'active' : ''}"
               onclick="changeHistoryPage(${p})">${p}</button>`;
    }
  });

  // Вперёд
  html += `<button class="pagination-btn" ${historyPage === totalPages ? 'disabled' : ''}
           onclick="changeHistoryPage(${historyPage + 1})">→</button>`;

  // Выбор размера страницы
  html += `
    <select class="pagination-size" onchange="changeHistoryPageSize(this.value)">
      <option value="10" ${historyPageSize === 10 ? 'selected' : ''}>10</option>
      <option value="20" ${historyPageSize === 20 ? 'selected' : ''}>20</option>
      <option value="50" ${historyPageSize === 50 ? 'selected' : ''}>50</option>
    </select>
  `;

  html += '</div>';
  bar.innerHTML = html;
}

/* Смена страницы истории */
window.changeHistoryPage = function(page) {
  historyPage = page;
  renderHistory();
  // Плавный скролл к началу таблицы
  const list = $('#historyList');
  if (list) list.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

/* Смена размера страницы истории */
window.changeHistoryPageSize = function(size) {
  historyPageSize = parseInt(size, 10);
  historyPage = 1;
  renderHistory();
};

let currentRecord = null;

window.viewRecord = function(id) {
  const h = getHistory().find(x => x.id === id);
  if (!h) return;
  currentRecord = h;

  const fails = h.items.filter(i => i.status === 'FAIL').length;
  const oks = h.items.length - fails;
  const isTopLoss = h.mode === 'toploss';
  const isCl = h.mode === 'cl' || h.mode === 'electronic';
  const isElec = h.mode === 'electronic';

  // --- Собираем контекст в зависимости от режима ---
  let contextBlock = '';

  if (isTopLoss) {
    const lossNames = (h.topLosses || [])
      .map(lid => findLossById(lid))
      .filter(Boolean)
      .map(l => l.name);

    contextBlock = `
      <div style="margin-top:8px;padding-top:8px;border-top:1px dashed var(--border)">
        <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-second);font-weight:700;margin-bottom:6px">
          Проверенные потери
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:6px">
          ${lossNames.map(n => `<span class="tl-summary-chip">${escapeHtml(n)}</span>`).join('')}
        </div>
      </div>
    `;
  } else if (isCl) {
    const planned = (h.brandPlanned && h.brandPlanned !== h.brandActual)
      ? `<div><strong>Бренд по плану:</strong> ${escapeHtml(h.brandPlanned)}</div>`
      : '';
    contextBlock = `
      <div><strong>Бренд:</strong> ${escapeHtml(h.brandActual || '—')}</div>
      ${planned}
    `;
  } else {
    contextBlock = `
      <div><strong>Тип перехода:</strong> ${escapeHtml(h.type || '—')}</div>
      <div><strong>Бренды:</strong> ${escapeHtml(h.brandFrom || '—')} → ${escapeHtml(h.brandTo || '—')}</div>
      ${h.triggers && h.triggers.length ? `<div><strong>Триггеры:</strong> ${h.triggers.map(t => escapeHtml(t.replace('node:',''))).join(', ')}</div>` : ''}
      ${h.customNode ? `<div><strong>Доп. узел:</strong> ${escapeHtml(h.customNode)}</div>` : ''}
    `;
  }

  let html = `
    <div class="record-info">
      <div>
        <strong>Режим:</strong>
        ${isTopLoss
          ? '<span class="badge badge-mode-toploss">TOP Losses</span>'
          : h.mode === 'cl'
            ? '<span class="badge badge-mode-cl">Чек-лист CL (мех)</span>'
            : isElec
            ? '<span class="badge badge-mode-electronic">CL Electronic</span>'
            : (() => {
                const type = h.type || '';
                if (type === 'ChangeOver') return '<span class="badge badge-changeover">Change Over</span>';
                if (type === 'CL_TO') return '<span class="badge badge-clto">CL в ТО</span>';
                if (type === 'CL_Conversion') return '<span class="badge badge-clconv">CL в Конвертацию</span>';
                return '<span class="badge badge-mode-cocl">COCL</span>';
              })()
        }
      </div>
      <div><strong>Дата:</strong> ${fmtDate(h.timestamp)}</div>
      <div><strong>Оператор:</strong> ${escapeHtml(h.operator)}</div>
      <div><strong>Смена:</strong> ${escapeHtml(formatClShift(h))}</div>
      <div><strong>Линия:</strong> ${escapeHtml(h.line)}${!isTopLoss && h.part ? ' / ' + escapeHtml(h.part) : ''}</div>
      ${contextBlock}
      <div style="margin-top:8px;padding-top:8px;border-top:1px dashed var(--border)">
        <strong>Итого:</strong> ${h.items.length} пунктов, ${oks} ОК, ${fails} Не ОК
      </div>
    </div>
  `;

  // --- Таблица пунктов проверки ---
  html += `
    <table class="record-items">
      <thead>
        <tr>
          <th>№</th>
          <th>OPL</th>
          <th>Машина</th>
          <th>Узел</th>
          <th>Название</th>
          <th>Норма</th>
          <th>Ответ</th>
          <th>Комментарий</th>
        </tr>
      </thead>
      <tbody>
        ${h.items.map(it => {
          // Определяем класс строки: ok / fail / unchecked
          let rowCls = 'ok';
          if (it.status === 'FAIL')            rowCls = 'fail';
          else if (it.status === 'UNCHECKED')  rowCls = 'unchecked';

          // --- Формируем содержимое колонки «Ответ» ---
          let answerHtml = '';
          const ctype = it.controlType;

          if (it.status === 'UNCHECKED') {
            // Не проверено — единый бейдж
            answerHtml = '<span class="status-badge status-unchecked">Не проверено</span>';
          } else if (ctype === 'ok_not_ok') {
            // ОК / Не ОК — только бейдж
            answerHtml = it.status === 'OK'
              ? '<span class="status-badge status-ok">ОК</span>'
              : '<span class="status-badge status-fail">Не ОК</span>';
          } else if (ctype === 'value_input') {
            // Ввод значения.
            // Для COCL / TOP Losses — всегда «ОК» (оператор фиксирует факт).
            // Для CL Electronic — по статусу (в допуске / не в допуске),
            //   потому что там value_input — это измеренное значение.
            let statusLabel = 'ОК';
            let statusCls = 'status-ok';
            if (isElec && it.status === 'FAIL') {
              statusLabel = 'Не в допуске';
              statusCls = 'status-fail';
            }
            answerHtml = `<span class="status-badge ${statusCls}">${statusLabel}</span>
              <span class="record-answer-value">${escapeHtml(it.answer || '—')}</span>`;
          } else if (ctype === 'tolerance') {
            // Допуск — бейдж + значение (без приписки «— в допуске»)
            const valueOnly = (it.answer || '').replace(/\s+—\s+(в допуске|не в допуске)$/,'');
            answerHtml = it.status === 'OK'
              ? `<span class="status-badge status-ok">В допуске</span>
                 <span class="record-answer-value">${escapeHtml(valueOnly || '—')}</span>`
              : `<span class="status-badge status-fail">Не в допуске</span>
                 <span class="record-answer-value">${escapeHtml(valueOnly || '—')}</span>`;
          } else {
            // Резерв — старые записи без controlType или нестандартные
            answerHtml = escapeHtml(it.answer || '—');
          }

          return `
            <tr class="${rowCls}">
              <td>${escapeHtml(it.number || '—')}</td>
              <td>${escapeHtml(it.oplNumber || '—')}</td>
              <td>${escapeHtml(it.machine || '—')}</td>
              <td>${escapeHtml(it.node || '—')}</td>
              <td>${escapeHtml(it.title || '—')}</td>
              <td>${renderRecordNorm(it, isElec)}</td>
              <td>${renderRecordAnswer(it, isElec)}</td>
              <td>${it.comment ? escapeHtml(it.comment) : '—'}</td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  `;
  $('#recordModalBody').innerHTML = html;
  openModal('#recordModal');
};
