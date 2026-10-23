/* ============================================================ */
/* === СТАНДАРТЫ CL: ЛИСТ ИСТОРИИ ИЗМЕНЕНИЙ =================== */
/* ============================================================ */
/*
   Третий режим вкладки «Стандарты CL» (рядом с «Механические» и
   «Электронные»). Таблица как на бумажном листе линии:
   № · № стандарта · Машина / узел · Название стандарта · Комментарий
   (+ дата). Excel и печать — для текущей линии и части.
*/

const clogState = {
  sortNewFirst: true,
  pager: { page: 1, size: 50 },
  editId: null,       // запись в окне
  mode: 'edit'        // 'reason' (сразу после изменения) | 'edit' | 'new'
};

function clogFmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d)) return String(iso).slice(0, 10);
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()}`;
}

function clogMachineNode(e) {
  return [e.machine, e.node].filter(Boolean).join(' / ') || '—';
}

function clogNumberText(e) {
  return e.kind === 'elec' ? 'E-Param' : (e.number || '—');
}

function clogActionChip(action) {
  const a = CHANGE_ACTIONS[action] || CHANGE_ACTIONS.manual;
  return `<span class="clog-act clog-act-${a.cls}">${escapeHtml(a.label)}</span>`;
}

/* Существует ли ещё стандарт / параметр, на который ссылается запись */
function clogRefExists(e) {
  if (!e.refId) return false;
  return e.kind === 'elec'
    ? getElectronicParams().some(p => p.id === e.refId)
    : getStandards().some(s => s.id === e.refId);
}

function getClogPart() {
  return ($('#elFilterPart')?.value) || '';
}

function getFilteredChangeLog() {
  const line = localStorage.getItem('cl_editor_line') || '';
  if (!line) return [];
  let rows = getChangeLogForLine(line, getClogPart());
  const kind = $('#elFilterKind')?.value || '';
  const action = $('#elFilterAction')?.value || '';
  const q = ($('#elFilterSearch')?.value || '').trim().toLowerCase();
  if (kind) rows = rows.filter(e => e.kind === kind);
  if (action) rows = rows.filter(e => e.action === action);
  if (q) {
    rows = rows.filter(e =>
      [e.number, e.machine, e.node, e.title, e.comment].join(' ').toLowerCase().includes(q));
  }
  return rows;
}

function refreshChangeLogView() {
  const wrap = $('#editorLogTableWrap');
  if (!wrap) return;
  const line = localStorage.getItem('cl_editor_line') || '';
  const countEl = $('#editorLogCount');

  if (!line) {
    wrap.innerHTML = '<div class="editor-empty">Выберите линию</div>';
    if (countEl) countEl.textContent = '';
    return;
  }

  const rows = getFilteredChangeLog();
  const total = getChangeLogForLine(line, getClogPart()).length;
  if (countEl) countEl.textContent = total ? `${total} ${clogPluralEntry(total)}` : '';

  const sortBtn = $('#elSortBtn span');
  if (sortBtn) sortBtn.textContent = clogState.sortNewFirst ? 'Сначала новые' : 'Сначала старые';

  if (!rows.length) {
    const pbar = $('#editorLogPagination');
    if (pbar) pbar.innerHTML = '';
    wrap.innerHTML = total
      ? '<div class="editor-empty">Ничего не найдено — измените фильтры</div>'
      : `<div class="clog-empty">
           <div class="clog-empty-title">Записей пока нет</div>
           <div>Изменения стандартов и E-Param этой линии будут записываться сюда автоматически:
           создание, пересмотр, деактивация, удаление. Записи с бумажного листа можно перенести кнопкой «Добавить запись».</div>
         </div>`;
    return;
  }

  const all = clogState.sortNewFirst ? [...rows].reverse() : rows;
  const { from, to } = pagerRange(clogState.pager, all.length);
  const list = all.slice(from, to);
  renderPager($('#editorLogPagination'), clogState.pager, all.length, refreshChangeLogView);
  let html = `<table class="clog-table">
    <thead><tr>
      <th class="clog-c-n">№</th>
      <th class="clog-c-num">№ стандарта</th>
      <th class="clog-c-mach">Машина / узел</th>
      <th class="clog-c-title">Название стандарта</th>
      <th class="clog-c-cmt">Комментарий</th>
      <th class="clog-c-date">Дата</th>
    </tr></thead><tbody>`;
  list.forEach(e => {
    const exists = clogRefExists(e);
    const titleHtml = exists
      ? `<button type="button" class="clog-title-link" data-clog-open="${escapeAttr(e.id)}" title="Открыть">${escapeHtml(e.title || '—')}</button>`
      : `<span class="clog-title">${escapeHtml(e.title || '—')}</span>`;
    const partChip = !getClogPart() && e.part
      ? ` <span class="clog-part">${escapeHtml(e.part)}</span>` : '';
    html += `<tr class="clog-row" data-clog-id="${escapeAttr(e.id)}" title="Нажмите, чтобы изменить запись">
      <td class="clog-c-n">${e.n}</td>
      <td class="clog-c-num">${e.kind === 'elec'
        ? '<span class="clog-ep">E-Param</span>'
        : `<span class="clog-opl">${escapeHtml(e.number || '—')}</span>`}</td>
      <td class="clog-c-mach">${escapeHtml(clogMachineNode(e))}${partChip}</td>
      <td class="clog-c-title">${titleHtml}</td>
      <td class="clog-c-cmt">${clogActionChip(e.action)}<span class="clog-cmt">${escapeHtml(e.comment || '')}</span></td>
      <td class="clog-c-date">${clogFmtDate(e.date)}</td>
    </tr>`;
  });
  html += '</tbody></table>';
  wrap.innerHTML = html;
}

function clogPluralEntry(n) {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return 'запись';
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return 'записи';
  return 'записей';
}

/* HTML истории одного стандарта / параметра (вкладка «История изменений»
   на странице стандарта и карточка на странице E-Param).
   rows — записи листа, новые сверху. */
function changeHistoryHtml(rows) {
  if (!rows.length) {
    return `
      <div class="sv-full-empty-table">
        <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <polyline points="12 6 12 12 16 14"/>
        </svg>
        <div>Изменений пока не записано</div>
      </div>
    `;
  }

  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const detailsHtml = (e) => {
    if (!Array.isArray(e.details) || !e.details.length) return '';
    return '<div class="sv-hist-details">' + e.details.map(d => {
      const label = `<span class="sv-hist-label">${escapeHtml(cap(String(d.label || '')))}</span>`;
      if (d.from == null && d.to == null) return `<div class="sv-hist-det">${label}</div>`;
      const from = d.from ? `<span class="sv-hist-from">${escapeHtml(d.from)}</span>` : '<span class="sv-hist-none">—</span>';
      const to = d.to ? `<span class="sv-hist-to">${escapeHtml(d.to)}</span>` : '<span class="sv-hist-none">—</span>';
      return `<div class="sv-hist-det">${label}${from}<span class="sv-hist-arrow">→</span>${to}</div>`;
    }).join('') + '</div>';
  };

  return `
    <table class="clog-table sv-hist-table">
      <thead><tr>
        <th class="clog-c-n">№</th>
        <th class="sv-hist-c-date">Дата и время</th>
        <th>Изменение</th>
      </tr></thead>
      <tbody>
        ${rows.map(e => `
          <tr>
            <td class="clog-c-n">${e.n}</td>
            <td class="sv-hist-c-date">${escapeHtml(formatDateTime(e.date))}</td>
            <td>
              ${clogActionChip(e.action)}<span class="clog-cmt">${escapeHtml(e.comment || '')}</span>
              ${detailsHtml(e)}
            </td>
          </tr>`).join('')}
      </tbody>
    </table>
  `;
}

/* ------------------------------------------------------------
   Окно записи
   ------------------------------------------------------------ */

/* Сразу после изменения стандарта — уточнить причину */
function askChangeReason(entryId) {
  if (!entryId) return;
  clogState.editId = entryId;
  clogState.mode = 'reason';
  renderChangeLogModal();
  openModal('changeLogModal');
  setTimeout(() => {
    const t = $('#clogComment');
    if (t) { t.focus(); t.select(); }
  }, 50);
}

function openChangeLogEntry(id) {
  clogState.editId = id;
  clogState.mode = 'edit';
  renderChangeLogModal();
  openModal('changeLogModal');
}

function openNewChangeLogEntry() {
  const line = localStorage.getItem('cl_editor_line') || '';
  if (!line) return showToast('Сначала выберите линию', true);
  clogState.editId = null;
  clogState.mode = 'new';
  renderChangeLogModal();
  openModal('changeLogModal');
}

/* Стандарты и параметры линии для выбора в ручной записи */
function clogRefOptions(line, part) {
  const opts = [];
  getStandards().filter(s => s.line === line && (!part || s.nodePart === part))
    .forEach(s => opts.push({ v: 'mech:' + s.id, t: `${s.oplNumber || '—'} · ${s.machine} · ${s.title}` }));
  getElectronicParamsForLine(line).filter(p => !part || p.nodePart === part)
    .forEach(p => opts.push({ v: 'elec:' + p.id, t: `E-Param · ${p.machine} · ${p.paramName}` }));
  return opts.sort((a, b) => a.t.localeCompare(b.t, 'ru'));
}

function renderChangeLogModal() {
  const body = $('#changeLogModalBody');
  const titleEl = $('#changeLogModalTitle');
  const delBtn = $('#changeLogDeleteBtn');
  const skipBtn = $('#changeLogCancelBtn');
  if (!body) return;

  const line = localStorage.getItem('cl_editor_line') || '';
  const e = clogState.editId ? getChangeLog().find(x => x.id === clogState.editId) : null;

  if (clogState.mode === 'reason' && e) {
    titleEl.textContent = 'Лист изменений: причина';
    delBtn.style.display = 'none';
    skipBtn.textContent = 'Оставить как есть';
    body.innerHTML = `
      <div class="clog-sum">
        <div class="clog-sum-top">${clogActionChip(e.action)}
          <span class="clog-sum-num">${escapeHtml(clogNumberText(e))}</span>
          <span class="clog-sum-mach">${escapeHtml(clogMachineNode(e))}</span>
        </div>
        <div class="clog-sum-title">${escapeHtml(e.title || '—')}</div>
      </div>
      <div class="field">
        <label for="clogComment">Комментарий — причина ${e.action === 'added' ? 'добавления' : e.action === 'removed' ? 'удаления' : 'пересмотра'}</label>
        <textarea id="clogComment" rows="4" placeholder="Например: изменён допуск после замены узла по результатам анализа потерь">${escapeHtml(e.comment || '')}</textarea>
        <div class="clog-hint">Текст заполнен автоматически — допишите причину. Запись попадёт в лист истории изменений линии ${escapeHtml(e.line)}${e.part ? ' · ' + escapeHtml(e.part) : ''}.</div>
      </div>`;
    return;
  }

  const isNew = !e;
  titleEl.textContent = isNew ? 'Новая запись в лист изменений' : `Запись № ${(getChangeLogForLine(e.line, e.part).find(x => x.id === e.id) || {}).n || ''}`;
  delBtn.style.display = isNew ? 'none' : '';
  skipBtn.textContent = 'Отмена';

  const part = isNew ? getClogPart() : (e.part || '');
  const isSmd = getWorkshopIdForLine(isNew ? line : e.line) === 'smd';
  const v = e || { date: new Date().toISOString(), action: 'changed', number: '', machine: '', node: '', title: '', comment: '', kind: 'mech' };
  const dateVal = String(v.date || '').slice(0, 10);
  const actOpts = Object.entries(CHANGE_ACTIONS)
    .map(([k, a]) => `<option value="${k}"${k === v.action ? ' selected' : ''}>${a.label}</option>`).join('');
  const refOpts = isNew
    ? clogRefOptions(line, part).map(o => `<option value="${escapeAttr(o.v)}">${escapeHtml(o.t)}</option>`).join('')
    : '';

  body.innerHTML = `
    ${isNew ? `<div class="field">
      <label for="clogRef">Стандарт линии (заполнит поля)</label>
      <select id="clogRef"><option value="">— вписать вручную —</option>${refOpts}</select>
    </div>` : ''}
    <div class="clog-grid">
      <div class="field"><label for="clogDate">Дата</label><input type="date" id="clogDate" value="${escapeAttr(dateVal)}"></div>
      <div class="field"><label for="clogAction">Изменение</label><select id="clogAction">${actOpts}</select></div>
      ${isSmd ? `<div class="field"><label for="clogPart">Часть линии</label>
        <select id="clogPart">
          <option value="Maker"${part === 'Maker' ? ' selected' : ''}>Maker</option>
          <option value="Packer"${part === 'Packer' ? ' selected' : ''}>Packer</option>
        </select></div>` : ''}
      <div class="field"><label for="clogNumber">№ стандарта</label><input type="text" id="clogNumber" value="${escapeAttr(v.kind === 'elec' ? '' : v.number)}" placeholder="${v.kind === 'elec' ? 'E-Param' : 'OPL-1.1.1'}"></div>
      <div class="field"><label for="clogMachine">Машина</label><input type="text" id="clogMachine" value="${escapeAttr(v.machine)}"></div>
      <div class="field"><label for="clogNode">Узел</label><input type="text" id="clogNode" value="${escapeAttr(v.node)}"></div>
    </div>
    <div class="field"><label for="clogTitle">Название стандарта</label><input type="text" id="clogTitle" value="${escapeAttr(v.title)}"></div>
    <div class="field"><label for="clogComment">Комментарий</label>
      <textarea id="clogComment" rows="3" placeholder="Причина пересмотра, добавления или удаления">${escapeHtml(v.comment || '')}</textarea></div>
    <input type="hidden" id="clogKind" value="${escapeAttr(v.kind || 'mech')}">
    <input type="hidden" id="clogRefId" value="${escapeAttr(v.refId || '')}">`;
}

function saveChangeLogModal() {
  const comment = ($('#clogComment')?.value || '').trim();

  if (clogState.mode === 'reason') {
    updateChangeLogEntry(clogState.editId, { comment });
    closeModal('changeLogModal');
    refreshChangeLogView();
    // Если окно открыли со страницы стандарта — обновить его вкладку «История»
    if (typeof refreshSvHistory === 'function') refreshSvHistory();
    showToast('Записано в лист изменений');
    return;
  }

  const title = ($('#clogTitle')?.value || '').trim();
  if (!title) return showToast('Укажите название стандарта', true);
  const dateStr = $('#clogDate')?.value;
  const now = new Date();
  // Время берём текущее — чтобы записи одного дня шли в порядке ввода
  const date = dateStr
    ? new Date(dateStr + 'T' + now.toTimeString().slice(0, 8)).toISOString()
    : now.toISOString();
  const patch = {
    date,
    action: $('#clogAction')?.value || 'manual',
    number: ($('#clogNumber')?.value || '').trim(),
    machine: ($('#clogMachine')?.value || '').trim(),
    node: ($('#clogNode')?.value || '').trim(),
    title,
    comment,
    kind: $('#clogKind')?.value || 'mech',
    refId: $('#clogRefId')?.value || ''
  };
  if ($('#clogPart')) patch.part = $('#clogPart').value;

  if (clogState.mode === 'new') {
    const line = localStorage.getItem('cl_editor_line') || '';
    const all = getChangeLog();
    all.push({ id: uid(), line, part: patch.part || '', author: '—', auto: false, ...patch });
    setChangeLog(all);
    showToast('Запись добавлена');
  } else {
    const old = getChangeLog().find(x => x.id === clogState.editId);
    if (old && dateStr === String(old.date).slice(0, 10)) delete patch.date; // дату не трогали — порядок не меняем
    updateChangeLogEntry(clogState.editId, patch);
    showToast('Запись обновлена');
  }
  closeModal('changeLogModal');
  refreshChangeLogView();
  updatePartCounters();
}

/* ------------------------------------------------------------
   Excel и печать — в формате бумажного листа
   ------------------------------------------------------------ */
function clogSheetTitle() {
  const line = localStorage.getItem('cl_editor_line') || '';
  const part = getClogPart();
  return { line, part, text: `Лист истории изменений стандартов CL — линия ${line}${part ? ' · ' + part : ''}` };
}

async function exportChangeLogXlsx() {
  const { line, part, text } = clogSheetTitle();
  if (!line) return showToast('Сначала выберите линию', true);
  const rows = getFilteredChangeLog();
  if (!rows.length) return showToast('Нет записей для выгрузки', true);

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Лист изменений', { pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 } });
  ws.columns = [
    { key: 'n', width: 6 }, { key: 'num', width: 16 }, { key: 'mach', width: 26 },
    { key: 'title', width: 40 }, { key: 'cmt', width: 60 }, { key: 'date', width: 12 }
  ];
  ws.mergeCells('A1:F1');
  ws.getCell('A1').value = text;
  ws.getCell('A1').font = { bold: true, size: 14 };
  ws.addRow([]);
  const head = ws.addRow(['№', '№ стандарта', 'Машина / узел', 'Название стандарта', 'Комментарий', 'Дата']);
  head.font = { bold: true };
  head.eachCell(c => {
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE5E7EB' } };
    c.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  });
  rows.forEach(e => {
    const a = CHANGE_ACTIONS[e.action];
    const cmt = (a && e.action !== 'manual' ? a.label + '. ' : '') + (e.comment || '');
    const r = ws.addRow([e.n, clogNumberText(e), clogMachineNode(e), e.title || '', cmt, clogFmtDate(e.date)]);
    r.alignment = { vertical: 'top', wrapText: true };
    r.getCell(1).alignment = { vertical: 'top', horizontal: 'center' };
  });
  ws.eachRow((row, i) => {
    if (i < 3) return;
    row.eachCell({ includeEmpty: true }, c => {
      c.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    });
  });
  ws.views = [{ state: 'frozen', ySplit: 3 }];

  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  downloadBlob(blob, `Лист_изменений_${line}${part ? '_' + part : ''}.xlsx`);
  showToast('Лист изменений выгружен');
}

function printChangeLog() {
  const { line, text } = clogSheetTitle();
  if (!line) return showToast('Сначала выберите линию', true);
  const rows = getFilteredChangeLog();
  if (!rows.length) return showToast('Нет записей для печати', true);

  const body = rows.map(e => {
    const a = CHANGE_ACTIONS[e.action];
    const cmt = (a && e.action !== 'manual' ? `<b>${escapeHtml(a.label)}.</b> ` : '') + escapeHtml(e.comment || '');
    return `<tr><td class="c">${e.n}</td><td>${escapeHtml(clogNumberText(e))}</td><td>${escapeHtml(clogMachineNode(e))}</td>
      <td>${escapeHtml(e.title || '')}</td><td>${cmt}</td><td class="c">${clogFmtDate(e.date)}</td></tr>`;
  }).join('');

  const html = `<!doctype html><html lang="ru"><head><meta charset="utf-8"><title>${escapeHtml(text)}</title>
    <style>
      body{font-family:Arial,sans-serif;margin:16mm;color:#000}
      h1{font-size:16px;margin:0 0 4px} .sub{font-size:11px;color:#444;margin-bottom:10px}
      table{width:100%;border-collapse:collapse;font-size:11px}
      th,td{border:1px solid #000;padding:5px 6px;vertical-align:top}
      th{background:#e5e7eb} td.c{text-align:center;white-space:nowrap}
      @page{size:A4 landscape;margin:10mm}
    </style></head><body>
    <h1>${escapeHtml(text)}</h1>
    <div class="sub">Распечатано ${clogFmtDate(new Date().toISOString())}</div>
    <table><thead><tr><th style="width:4%">№</th><th style="width:12%">№ стандарта</th><th style="width:16%">Машина / узел</th>
    <th style="width:26%">Название стандарта</th><th>Комментарий</th><th style="width:9%">Дата</th></tr></thead>
    <tbody>${body}</tbody></table></body></html>`;

  const w = window.open('', '_blank');
  if (!w) return showToast('Браузер заблокировал окно печати', true);
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 300);
}

/* ------------------------------------------------------------
   Обработчики
   ------------------------------------------------------------ */
$('#elLinePill')?.addEventListener('click', openLinePickerModal);
$('#elModeSwitch')?.addEventListener('click', (e) => {
  const btn = e.target.closest('.editor-mode-inline-btn');
  if (btn) switchEditorModeInline(btn.dataset.mode);
});
['elFilterSearch', 'elFilterKind', 'elFilterAction'].forEach(id => {
  $('#' + id)?.addEventListener(id === 'elFilterSearch' ? 'input' : 'change', () => {
    clogState.pager.page = 1;
    refreshChangeLogView();
  });
});
$('#elFilterResetBtn')?.addEventListener('click', () => {
  ['elFilterSearch', 'elFilterKind', 'elFilterAction'].forEach(id => { const el = $('#' + id); if (el) el.value = ''; });
  refreshChangeLogView();
});
$('#elSortBtn')?.addEventListener('click', () => {
  clogState.sortNewFirst = !clogState.sortNewFirst;
  refreshChangeLogView();
});
$('#elAddBtn')?.addEventListener('click', openNewChangeLogEntry);
$('#elExportBtn')?.addEventListener('click', exportChangeLogXlsx);
$('#elPrintBtn')?.addEventListener('click', printChangeLog);

$('#editorLogTableWrap')?.addEventListener('click', (e) => {
  const open = e.target.closest('[data-clog-open]');
  if (open) {
    const entry = getChangeLog().find(x => x.id === open.dataset.clogOpen);
    if (!entry) return;
    if (entry.kind === 'elec') openEparamPage(entry.refId);
    else openStandardFullView(entry.refId, 'view');
    return;
  }
  const row = e.target.closest('[data-clog-id]');
  if (row) openChangeLogEntry(row.dataset.clogId);
});

/* Окно записи — содержимое пересоздаётся, поэтому делегирование */
document.addEventListener('change', (e) => {
  if (e.target.id !== 'clogRef') return;
  const [kind, id] = (e.target.value || '').split(':');
  if (!id) return;
  const row = kind === 'elec'
    ? getElectronicParams().find(p => p.id === id)
    : getStandards().find(s => s.id === id);
  if (!row) return;
  const s = changeLogSnapshot(kind, row);
  $('#clogNumber').value = s.number;
  $('#clogNumber').placeholder = kind === 'elec' ? 'E-Param' : 'OPL-1.1.1';
  $('#clogMachine').value = s.machine;
  $('#clogNode').value = s.node;
  $('#clogTitle').value = s.title;
  $('#clogKind').value = kind;
  $('#clogRefId').value = id;
  if ($('#clogPart') && s.part) $('#clogPart').value = s.part;
});

$('#changeLogModalClose')?.addEventListener('click', () => closeModal('changeLogModal'));
$('#changeLogCancelBtn')?.addEventListener('click', () => closeModal('changeLogModal'));
$('#changeLogSaveBtn')?.addEventListener('click', saveChangeLogModal);
$('#changeLogDeleteBtn')?.addEventListener('click', () => {
  if (!clogState.editId) return;
  if (!confirm('Удалить запись из листа изменений?')) return;
  removeChangeLogEntry(clogState.editId);
  closeModal('changeLogModal');
  refreshChangeLogView();
  updatePartCounters();
  showToast('Запись удалена');
});
$('#changeLogModal')?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) saveChangeLogModal();
});
bindModalBackdropClose('changeLogModal');
