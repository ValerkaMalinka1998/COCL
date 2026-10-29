/* ============================================================
   КОМПОНЕНТЫ: быстрое добавление машины к линии
   #quickAddMachineModal — со страниц стандарта и E-Param.
   Модуль общего пространства имён: функции и переменные видны
   во всех файлах. Порядок подключения — index.html.
   ============================================================ */

/* ============================================================
   БЫСТРОЕ ДОБАВЛЕНИЕ МАШИНЫ (страницы стандарта и параметра)
   ============================================================ */
/* Кому добавляем машину: { line, onAdded(name) } — вызывающая страница
   сама решает, как показать новую машину в своём списке. */
let quickAddMachineTarget = null;

window.openQuickAddMachineModal = function(target) {
  const modal = $('#quickAddMachineModal');
  if (!modal || !target || !target.line) return;
  quickAddMachineTarget = target;
  const line = target.line;

  $('#quickAddMachineLineLabel').textContent = 'Линия: ' + line;
  $('#quickAddMachineName').value = '';

  openModal(modal);
  setTimeout(() => {
    const input = $('#quickAddMachineName');
    if (input) {
      input.focus();
      input.select();
    }
  }, 100);
};

function closeQuickAddMachineModal() {
  closeModal('#quickAddMachineModal');
}

/* --- Обработчики модалки --- */
$('#quickAddMachineClose')?.addEventListener('click', closeQuickAddMachineModal);
$('#quickAddMachineCancelBtn')?.addEventListener('click', closeQuickAddMachineModal);
$('#quickAddMachineModal')?.addEventListener('click', (e) => {
  if (e.target.id === 'quickAddMachineModal') closeQuickAddMachineModal();
});

/* Enter — сохранить */
$('#quickAddMachineName')?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    $('#quickAddMachineSaveBtn')?.click();
  }
});

/* Сохранить */
$('#quickAddMachineSaveBtn')?.addEventListener('click', () => {
  const line = quickAddMachineTarget?.line;

  const name = $('#quickAddMachineName')?.value.trim();
  if (!line) return;
  if (!name) return showToast('Введите название машины', true);

  const lm = getLineMachines();
  if (!Array.isArray(lm[line])) lm[line] = [];

  // Проверка дубликата (без учёта регистра)
  if (lm[line].some(m => m.toLowerCase() === name.toLowerCase())) {
    return showToast('Такая машина уже есть на этой линии', true);
  }

  lm[line].push(name);
  setLineMachines(lm);

  // Страница, открывшая окно, подставляет новую машину у себя
  if (typeof quickAddMachineTarget.onAdded === 'function') quickAddMachineTarget.onAdded(name);

  // Обновляем настройки (если они сейчас открыты — пользователь увидит новую машину)
  if (typeof renderStructureSettings === 'function') renderStructureSettings();

  closeQuickAddMachineModal();
  showToast('Машина добавлена на линию ' + line);
});

/* Список машин в <select> под часть линии; возвращает выбранную машину ('' — если прежняя из другой части) */
function fillMachineSelect(sel, line, part, current) {
  if (!sel) return current;
  const machines = getMachinesForLine(line, part);
  const keep = machines.includes(current) ? current : '';
  sel.innerHTML = ['<option value="">— выберите —</option>']
    .concat(machines.map(m => `<option value="${escapeAttr(m)}"${m === keep ? ' selected' : ''}>${escapeHtml(m)}</option>`)).join('');
  return keep;
}
