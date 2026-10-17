/* ============================================================
   НАСТРОЙКИ: операторы
   Модуль общего пространства имён: функции и переменные видны
   во всех файлах. Порядок подключения — index.html.
   ============================================================ */

/* ============================================================
   ОПЕРАТОРЫ — строки + inline + пагинация
   ============================================================ */

const OPERATORS_PAGE_SIZE = 7;
let operatorsCurrentPage = 1;

function renderOperatorsSettings() {
  const list = $('#operatorsList');
  if (!list) return;

  const allOperators = sortOperatorsRus(getOperators());
  const query = ($('#operatorsSearch')?.value || '').trim().toLowerCase();

  // Счётчик
  const counter = $('#operatorsCount');
  if (counter) {
    counter.textContent = query
      ? `(${allOperators.filter(o => o.toLowerCase().includes(query)).length} из ${allOperators.length})`
      : `(${allOperators.length})`;
  }

  // Пустое состояние
  if (!allOperators.length) {
    list.innerHTML = '<div class="empty-state">Операторов пока нет. Нажмите «Добавить оператора».</div>';
    renderOperatorsPagination(0);
    return;
  }

  // Фильтрация
  let filtered = allOperators;
  if (query) {
    filtered = allOperators.filter(o => o.toLowerCase().includes(query));
  }

  if (!filtered.length) {
    list.innerHTML = `<div class="empty-state">Ничего не найдено по запросу «${escapeHtml(query)}»</div>`;
    renderOperatorsPagination(0);
    return;
  }

  // Пагинация
  const total = filtered.length;
  const totalPages = Math.ceil(total / OPERATORS_PAGE_SIZE);
  if (operatorsCurrentPage > totalPages) operatorsCurrentPage = totalPages;
  if (operatorsCurrentPage < 1) operatorsCurrentPage = 1;

  const startIdx = (operatorsCurrentPage - 1) * OPERATORS_PAGE_SIZE;
  const endIdx = Math.min(startIdx + OPERATORS_PAGE_SIZE, total);
  const pageItems = filtered.slice(startIdx, endIdx);

  // Рендер строк
  list.innerHTML = pageItems.map(op => `
    <div class="operators-row" data-operator="${escapeAttr(op)}">
      <span class="operators-row-name">${highlightOperatorName(op, query)}</span>
      <div class="operators-row-actions">
        <button type="button" class="operators-row-action-btn operators-row-delete-btn"
                data-operators-delete="${escapeAttr(op)}" title="Удалить">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
    </div>
  `).join('');

  // Обработчики: удалить
  list.querySelectorAll('[data-operators-delete]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteOperator(btn.dataset.operatorsDelete);
    });
  });

  // Пагинация
  renderOperatorsPagination(totalPages, startIdx, endIdx, total);
}

/* Подсветка совпадений в ФИО */
function highlightOperatorName(name, query) {
  if (!query) return escapeHtml(name);
  const lower = name.toLowerCase();
  const idx = lower.indexOf(query);
  if (idx === -1) return escapeHtml(name);
  return escapeHtml(name.slice(0, idx)) +
    '<strong class="hl-match">' + escapeHtml(name.slice(idx, idx + query.length)) + '</strong>' +
    escapeHtml(name.slice(idx + query.length));
}

/* Пагинация для операторов */
function renderOperatorsPagination(totalPages, startIdx, endIdx, total) {
  const bar = $('#operatorsPagination');
  if (!bar) return;

  if (!total || totalPages <= 1) {
    bar.innerHTML = total
      ? `<span class="pagination-info">Показано ${startIdx + 1}–${endIdx} из ${total}</span>`
      : '';
    return;
  }

  let html = `<span class="pagination-info">Показано ${startIdx + 1}–${endIdx} из ${total}</span>`;
  html += '<div class="pagination-controls">';

  html += `<button class="pagination-btn" ${operatorsCurrentPage === 1 ? 'disabled' : ''}
           onclick="changeOperatorsPage(${operatorsCurrentPage - 1})">←</button>`;

  const pages = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || Math.abs(i - operatorsCurrentPage) <= 2) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== '...') {
      pages.push('...');
    }
  }
  pages.forEach(p => {
    if (p === '...') {
      html += `<span class="pagination-dots">…</span>`;
    } else {
      html += `<button class="pagination-btn ${p === operatorsCurrentPage ? 'active' : ''}"
               onclick="changeOperatorsPage(${p})">${p}</button>`;
    }
  });

  html += `<button class="pagination-btn" ${operatorsCurrentPage === totalPages ? 'disabled' : ''}
           onclick="changeOperatorsPage(${operatorsCurrentPage + 1})">→</button>`;

  html += '</div>';
  bar.innerHTML = html;
}

/* Смена страницы операторов */
window.changeOperatorsPage = function(page) {
  operatorsCurrentPage = page;
  renderOperatorsSettings();
};

/* Поиск по операторам */
$('#operatorsSearch')?.addEventListener('input', () => {
  operatorsCurrentPage = 1;
  renderOperatorsSettings();
});

/* Русская сортировка: ё = е, игнорируем регистр, знаки */
function sortOperatorsRus(arr) {
  return [...arr].sort((a, b) =>
    a.localeCompare(b, 'ru', { sensitivity: 'base', numeric: true })
  );
}

/* --- Модалка добавления оператора --- */
function openAddOperatorModal() {
  const modal = $('#addOperatorModal');
  if (!modal) return;
  const input = $('#newOperatorInput');
  if (input) input.value = '';
  openModal(modal);
  setTimeout(() => { if (input) input.focus(); }, 100);
}

function closeAddOperatorModal() {
  closeModal('#addOperatorModal');
}

$('#openAddOperatorModalBtn')?.addEventListener('click', openAddOperatorModal);
$('#addOperatorModalClose')?.addEventListener('click', closeAddOperatorModal);
$('#addOperatorCancelBtn')?.addEventListener('click', closeAddOperatorModal);
$('#addOperatorModal')?.addEventListener('click', (e) => {
  if (e.target.id === 'addOperatorModal') closeAddOperatorModal();
});

/* Enter — добавить без клика по кнопке */
$('#newOperatorInput')?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    $('#addOperatorBtn')?.click();
  }
});

/* --- Добавление оператора --- */
$('#addOperatorBtn')?.addEventListener('click', () => {
  const name = $('#newOperatorInput').value.trim();
  if (!name) return showToast('Введите ФИО оператора', true);

  const operators = getOperators();
  if (operators.some(o => o.toLowerCase() === name.toLowerCase())) {
    return showToast('Такой оператор уже есть', true);
  }

  operators.push(name);
  setOperators(sortOperatorsRus(operators));

  // Очищаем поиск, чтобы новый оператор был виден
  const search = $('#operatorsSearch');
  if (search) search.value = '';

  renderOperatorsSettings();
  closeAddOperatorModal();
  showToast('Оператор добавлен');
});
