/* ============================================================
   КОМПОНЕНТЫ: «Бренд на линии» — плашка и окно выбора
   Используется в Чек-листе CL (оператор) и Расписании CL (аналитик).
   Данные — js/data/line-brand.js.
   ============================================================ */

const lineBrandPickerState = { line: '', source: 'analyst', onDone: null };

/* Плашка: «Бренд на линии: Rothmans · смена сорта (COCL) · 19.10 21:40 [изменить]» */
function lineBrandBarHtml(line, btnId) {
  const info = getLineBrandNow(line);
  return `
    <span class="lb-bar ${info ? '' : 'lb-bar-empty'}">
      <span class="lb-bar-label">Бренд на линии</span>
      <b class="lb-bar-brand">${info ? escapeHtml(info.brand) : 'не задан'}</b>
      ${info ? `<span class="lb-bar-src">${escapeHtml(lineBrandSourceText(info))}</span>` : '<span class="lb-bar-src">проверка по «Остальным брендам»</span>'}
      <button type="button" class="lb-bar-btn" id="${btnId}" title="Изменить бренд на линии">изменить</button>
    </span>`;
}

function openLineBrandPicker(line, source, onDone) {
  const brands = getBrandsForLine(line);
  if (!brands.length) return showToast('На линии нет брендов — добавьте их в Настройках', true);
  Object.assign(lineBrandPickerState, { line, source, onDone });
  const info = getLineBrandNow(line);
  $('#lineBrandModalTitle').textContent = `Бренд на линии ${line}`;
  $('#lineBrandModalHint').textContent = source === 'analyst'
    ? 'Бренд действует с этого момента и до следующей смены сорта в COCL. Используйте, если оператор не провёл проверку COCL.'
    : 'Бренд действует с этого момента и до следующей смены сорта в COCL. Изменение будет видно в истории.';
  $('#lineBrandSelect').innerHTML = brands
    .map(b => `<option value="${escapeAttr(b)}"${info && info.brand === b ? ' selected' : ''}>${escapeHtml(b)}</option>`).join('');
  $('#lineBrandNote').value = '';
  $('#lineBrandNow').innerHTML = info
    ? `Сейчас: <b>${escapeHtml(info.brand)}</b> — ${escapeHtml(lineBrandSourceText(info))}${info.note ? ` (${escapeHtml(info.note)})` : ''}`
    : 'Сейчас бренд не задан.';
  openModal('lineBrandModal');
}

$('#lineBrandModalClose')?.addEventListener('click', () => closeModal('lineBrandModal'));
$('#lineBrandCancelBtn')?.addEventListener('click', () => closeModal('lineBrandModal'));
bindModalBackdropClose('lineBrandModal');
$('#lineBrandSaveBtn')?.addEventListener('click', () => {
  const { line, source, onDone } = lineBrandPickerState;
  const brand = $('#lineBrandSelect').value;
  if (!brand) return;
  const info = getLineBrandNow(line);
  const note = ($('#lineBrandNote').value || '').trim();
  if (info && info.brand === brand && !note) { closeModal('lineBrandModal'); return; }
  addLineBrandEvent(line, brand, source, note);
  closeModal('lineBrandModal');
  showToast(`Бренд на линии ${line}: ${brand}`);
  if (typeof onDone === 'function') onDone(brand);
});
