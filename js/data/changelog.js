/* ============================================================ */
/* === ЛИСТ ИСТОРИИ ИЗМЕНЕНИЙ СТАНДАРТОВ ====================== */
/* ============================================================ */
/*
   Аналог бумажного «Листа истории изменений» на каждой линии
   (отдельно Maker и Packer): № · № стандарта · Машина / узел ·
   Название · Комментарий (причина пересмотра, добавления, удаления).

   Запись создаётся автоматически при создании, изменении,
   деактивации и удалении стандарта / E-Param; причину аналитик
   уточняет в окне сразу после сохранения. Записи можно добавить
   и вручную (перенос с бумажного листа).

   entry = {
     id, date (ISO), line, part ('Maker'|'Packer'|''),
     kind ('mech'|'elec'), refId, number, machine, node, title,
     action ('added'|'approved'|'changed'|'deactivated'|'activated'|'removed'|'manual'),
     comment, author, auto (true — создана программой),
     details (необязательно) — [{ label, from, to }] что именно изменилось;
       у записей, созданных до появления поля, его нет
   }
*/

const CHANGE_ACTIONS = {
  added:       { label: 'Добавлен',      cls: 'add' },
  approved:    { label: 'Утверждён',     cls: 'add' },
  changed:     { label: 'Пересмотрен',   cls: 'chg' },
  deactivated: { label: 'Деактивирован', cls: 'off' },
  activated:   { label: 'Восстановлен',  cls: 'on' },
  removed:     { label: 'Удалён',        cls: 'del' },
  manual:      { label: 'Другое',        cls: 'man' }
};

function getChangeLog() {
  const v = load(STORAGE_KEYS.changeLog, []);
  return Array.isArray(v) ? v : [];
}
function setChangeLog(v) { save(STORAGE_KEYS.changeLog, v); }

/* Снимок «шапки» стандарта / параметра для строки листа */
function changeLogSnapshot(kind, row) {
  if (kind === 'elec') {
    return {
      line: row.line || '', part: row.nodePart || '', kind: 'elec', refId: row.id,
      number: '', machine: row.machine || '', node: '', title: row.paramName || ''
    };
  }
  return {
    line: row.line || '', part: row.nodePart || '', kind: 'mech', refId: row.id,
    number: row.oplNumber || '', machine: row.machine || '', node: row.node || '',
    title: row.title || ''
  };
}

/* Добавить запись. Возвращает id записи. */
function addChangeLogEntry(kind, row, action, comment, extra) {
  const entry = {
    id: uid(),
    date: new Date().toISOString(),
    ...changeLogSnapshot(kind, row),
    action: action || 'changed',
    comment: comment || '',
    author: '—',
    auto: true,
    ...(extra || {})
  };
  const all = getChangeLog();
  all.push(entry);
  setChangeLog(all);
  return entry.id;
}

function updateChangeLogEntry(id, patch) {
  const all = getChangeLog();
  const e = all.find(x => x.id === id);
  if (!e) return;
  Object.assign(e, patch);
  setChangeLog(all);
}

function removeChangeLogEntry(id) {
  setChangeLog(getChangeLog().filter(x => x.id !== id));
}

/* Записи линии (и части) в хронологическом порядке с номером строки.
   Нумерация — как на бумажном листе: своя для каждой линии + части. */
function getChangeLogForLine(line, part) {
  const rows = getChangeLog()
    .filter(e => e.sheet !== false && e.line === line && (!part || (e.part || '') === part))
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));
  return rows.map((e, i) => ({ ...e, n: i + 1 }));
}

/* Существенные правки — одно правило для листа линии, истории стандарта, ознакомления,
   метки «Изм.» и уведомлений: основной блок, описания, инструмент, время на проверку,
   точки и бренды, фото, время проверки (Расписание), создание, удаление, деактивация
   и восстановление. Доп. информация (CL относится к, «всегда в Change Over», триггеры,
   Top Losses) в лист не идёт (entry.sheet === false) — остаётся в истории стандарта
   серой строкой «доп. информация» и изменением стандарта не считается. */
const CL_SHEET_KEYS = {
  mech: ['title', 'oplNumber', 'machine', 'node', 'nodePart', 'controlType', 'problemDescription',
         'controlDescription', 'purpose', 'whyCreated', 'tool', 'durationSec', 'photos'],
  elec: ['paramName', 'machine', 'nodePart', 'controlType', 'normText', 'durationSec']
};

/* Записи одного стандарта / параметра в хронологическом порядке
   (вкладка «История» на странице стандарта). Нумерация — своя, 1…N. */
function getChangeLogForRef(kind, refId) {
  if (!refId) return [];
  const rows = getChangeLog()
    .filter(e => e.refId === refId && (e.kind || 'mech') === kind)
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));
  return rows.map((e, i) => ({ ...e, n: i + 1 }));
}

/* ------------------------------------------------------------
   Что изменилось: сравнение старой и новой версии
   → { action, text } или null, если ничего не поменялось
   ------------------------------------------------------------ */
function clJson(v) {
  // Пустые значения (undefined / null / '' / []) считаем одинаковыми
  if (v == null || v === '' || v === 0 || (Array.isArray(v) && !v.length)) return '""';
  return JSON.stringify(v);
}

/* Сравнение норм по брендам. keyOf — ключ для сравнения, showOf — как
   показать значение человеку (по умолчанию тот же ключ). Подробности
   «было → стало» дописываются в массив details, если он передан. */
function clBrandsDiff(oldList, newList, keyOf, showOf, details) {
  const show = showOf || keyOf;
  const map = (arr, fn) => {
    const m = {};
    (arr || []).forEach(x => { m[x.brand || 'Остальные бренды'] = fn(x); });
    return m;
  };
  const a = map(oldList, keyOf), b = map(newList, keyOf);
  const sa = map(oldList, show), sb = map(newList, show);
  const brands = [...new Set([...Object.keys(a), ...Object.keys(b)])];
  const added = brands.filter(x => !(x in a));
  const removed = brands.filter(x => !(x in b));
  const changed = brands.filter(x => x in a && x in b && a[x] !== b[x]);
  const parts = [];
  if (changed.length) parts.push('изменена норма (' + changed.join(', ') + ')');
  if (added.length) parts.push('добавлен бренд ' + added.join(', '));
  if (removed.length) parts.push('убран бренд ' + removed.join(', '));
  if (details) {
    changed.forEach(x => details.push({ label: 'норма (' + x + ')', from: sa[x] || '—', to: sb[x] || '—' }));
    added.forEach(x => details.push({ label: 'добавлен бренд ' + x, from: '', to: sb[x] || '—' }));
    removed.forEach(x => details.push({ label: 'убран бренд ' + x, from: sa[x] || '—', to: '' }));
  }
  return parts;
}

/* Значение поля для строки «было → стало» */
function clDetailText(v) {
  if (v == null || v === '' || (Array.isArray(v) && !v.length)) return '—';
  const s = (Array.isArray(v) ? v.join(', ') : String(v)).trim();
  return s.length > 160 ? s.slice(0, 157) + '…' : s;
}

function describeRowChange(kind, oldRow, newRow) {
  if (!oldRow) return { action: 'added', text: kind === 'elec' ? 'Новый параметр' : 'Новый стандарт' };

  const wasActive = oldRow.active !== false;
  const isActive = newRow.active !== false;

  const fields = kind === 'elec'
    ? [
        ['paramName', 'описание параметра'], ['machine', 'машина'], ['nodePart', 'часть линии'],
        ['controlType', 'тип контроля'], ['normText', 'текст нормы'], ['durationSec', 'время на проверку'],
        ['appliesTo', 'CL относится к'], ['triggers', 'триггеры'], ['topLosses', 'Top Losses']
      ]
    : [
        ['title', 'название'], ['oplNumber', 'OPL №'], ['machine', 'машина'], ['node', 'узел'],
        ['nodePart', 'часть линии'], ['controlType', 'тип контроля'],
        ['problemDescription', 'описание проблемы'], ['controlDescription', 'описание контроля'],
        ['purpose', 'цель'], ['whyCreated', 'почему создан'], ['durationSec', 'время на проверку'],
        ['tool', 'инструмент'], ['appliesTo', 'CL относится к'], ['triggers', 'триггеры'],
        ['topLosses', 'Top Losses'], ['photos', 'фото']
      ];

  const parts = [];
  const sheetParts = [];   // то же, но только существенное для листа линии
  const sheetKeys = CL_SHEET_KEYS[kind === 'elec' ? 'elec' : 'mech'];
  const details = [];   // [{ label, from, to }] — для вкладки «История» стандарта
  fields.forEach(([key, label]) => {
    if (clJson(oldRow[key]) !== clJson(newRow[key])) {
      const before = parts.length;
      if (key === 'controlType') {
        const lbl = (t) => (typeof controlTypeLabel === 'function' ? controlTypeLabel(t) : t);
        parts.push(`тип контроля: ${lbl(oldRow[key])} → ${lbl(newRow[key])}`);
        details.push({ label, from: lbl(oldRow[key]) || '—', to: lbl(newRow[key]) || '—' });
      } else if (key === 'oplNumber') {
        parts.push(`OPL №: ${oldRow[key] || '—'} → ${newRow[key] || '—'}`);
        details.push({ label, from: clDetailText(oldRow[key]), to: clDetailText(newRow[key]) });
      } else {
        parts.push(label);
        // Top Losses хранятся служебными ID — для них показываем только сам факт
        details.push(key === 'topLosses'
          ? { label }
          : { label, from: clDetailText(oldRow[key]), to: clDetailText(newRow[key]) });
      }
      if (sheetKeys.includes(key)) sheetParts.push(parts[before]);
    }
  });

  // Флажок «Всегда показывать в Change Over» (у старых записей поля может не быть)
  if (kind !== 'elec' && !!oldRow.forceInChangeOver !== !!newRow.forceInChangeOver) {
    parts.push('всегда показывать в Change Over');
    details.push({
      label: 'всегда показывать в Change Over',
      from: oldRow.forceInChangeOver ? 'да' : 'нет',
      to: newRow.forceInChangeOver ? 'да' : 'нет'
    });
  }

  // Точки / нормы по брендам — всегда существенны для листа линии
  // У E-Param в старых снимках листа изменений точек нет — их выводит normalizeElectronicParam
  const msOf = (r) => kind === 'elec' ? normalizeElectronicParam(r).measurements : r.measurements;
  const norms = clBrandsDiff(msOf(oldRow), msOf(newRow),
    x => (x.points || []).map(p => String(p.value || '').trim()).join('|'),
    x => (x.points || []).map(p => String(p.value || '').trim()).filter(Boolean).join('; '),
    details);
  parts.push(...norms);
  sheetParts.push(...norms);

  const sheet = sheetParts.length > 0;
  const tail = (list) => (list.length ? '; изменено: ' + list.join(', ') : '');
  // Текст — только существенное для листа; если его нет, запись в лист не попадёт (sheet:false)
  const pick = sheet ? sheetParts : parts;

  if (wasActive && !isActive) {
    return { action: 'deactivated', details, text: 'Деактивирован' + tail(pick) };
  }
  if (!wasActive && isActive) {
    return { action: 'activated', details, text: 'Снова в работе' + tail(pick) };
  }
  if (!parts.length) return null;
  const text = 'Изменено: ' + pick.join(', ');
  return { action: 'changed', details, sheet, text: text.charAt(0).toUpperCase() + text.slice(1) };
}

/* Записать изменение по результату сравнения. Возвращает id записи или null. */
function logRowChange(kind, oldRow, newRow) {
  const d = describeRowChange(kind, oldRow, newRow);
  if (!d) return null;
  const extra = {};
  if (d.details && d.details.length) extra.details = d.details;
  if (d.sheet === false) extra.sheet = false;
  return addChangeLogEntry(kind, newRow, d.action, d.text, extra);
}

/* Время проверки изменено в Расписании CL: запись «было → стало».
   Существенно для листа линии. Возвращает id записи или null. */
function clWindowsText(list) {
  const t = (Array.isArray(list) ? list : []).map(w => `${w.from}–${w.to}`).join(', ');
  return t || '—';
}
function logTimeWindowsChange(kind, row, oldWindows, newWindows) {
  const a = clWindowsText(oldWindows), b = clWindowsText(newWindows);
  if (a === b) return null;
  return addChangeLogEntry(kind, row, 'changed', 'Изменено: время проверки',
    { details: [{ label: 'время проверки', from: a, to: b }] });
}
