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
     action ('added'|'changed'|'deactivated'|'activated'|'removed'|'manual'),
     comment, author, auto (true — создана программой)
   }
*/

const CHANGE_ACTIONS = {
  added:       { label: 'Добавлен',      cls: 'add' },
  changed:     { label: 'Пересмотрен',   cls: 'chg' },
  deactivated: { label: 'Деактивирован', cls: 'off' },
  activated:   { label: 'Восстановлен',  cls: 'on' },
  removed:     { label: 'Удалён',        cls: 'del' },
  manual:      { label: 'Запись',        cls: 'man' }
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
    .filter(e => e.line === line && (!part || (e.part || '') === part))
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

function clBrandsDiff(oldList, newList, keyOf) {
  const map = (arr) => {
    const m = {};
    (arr || []).forEach(x => { m[x.brand || 'Все бренды'] = keyOf(x); });
    return m;
  };
  const a = map(oldList), b = map(newList);
  const brands = [...new Set([...Object.keys(a), ...Object.keys(b)])];
  const added = brands.filter(x => !(x in a));
  const removed = brands.filter(x => !(x in b));
  const changed = brands.filter(x => x in a && x in b && a[x] !== b[x]);
  const parts = [];
  if (changed.length) parts.push('изменена норма (' + changed.join(', ') + ')');
  if (added.length) parts.push('добавлен бренд ' + added.join(', '));
  if (removed.length) parts.push('убран бренд ' + removed.join(', '));
  return parts;
}

function describeRowChange(kind, oldRow, newRow) {
  if (!oldRow) return { action: 'added', text: kind === 'elec' ? 'Новый параметр' : 'Новый стандарт' };

  const wasActive = oldRow.active !== false;
  const isActive = newRow.active !== false;

  const fields = kind === 'elec'
    ? [
        ['paramName', 'описание параметра'], ['machine', 'машина'], ['nodePart', 'часть линии'],
        ['controlType', 'тип контроля'], ['normText', 'текст нормы'],
        ['appliesTo', 'применяемость'], ['triggers', 'триггеры'], ['topLosses', 'Top Losses']
      ]
    : [
        ['title', 'название'], ['oplNumber', 'OPL №'], ['machine', 'машина'], ['node', 'узел'],
        ['nodePart', 'часть линии'], ['controlType', 'тип контроля'],
        ['problemDescription', 'описание проблемы'], ['controlDescription', 'описание контроля'],
        ['purpose', 'цель'], ['whyCreated', 'почему создан'], ['durationSec', 'длительность'],
        ['tool', 'инструмент'], ['appliesTo', 'применяемость'], ['triggers', 'триггеры'],
        ['topLosses', 'Top Losses'], ['photos', 'фото']
      ];

  const parts = [];
  fields.forEach(([key, label]) => {
    if (clJson(oldRow[key]) !== clJson(newRow[key])) {
      if (key === 'controlType') {
        const lbl = (t) => (typeof controlTypeLabel === 'function' ? controlTypeLabel(t) : t);
        parts.push(`тип контроля: ${lbl(oldRow[key])} → ${lbl(newRow[key])}`);
      } else if (key === 'oplNumber') {
        parts.push(`OPL №: ${oldRow[key] || '—'} → ${newRow[key] || '—'}`);
      } else {
        parts.push(label);
      }
    }
  });

  if (kind === 'elec') {
    parts.push(...clBrandsDiff(oldRow.valuesByBrand, newRow.valuesByBrand,
      x => [x.target, x.tolerance, x.min, x.max].join('|')));
  } else {
    parts.push(...clBrandsDiff(oldRow.measurements, newRow.measurements,
      x => (x.points || []).map(p => String(p.value || '').trim()).join('|')));
  }

  if (wasActive && !isActive) {
    return { action: 'deactivated', text: 'Деактивирован' + (parts.length ? '; изменено: ' + parts.join(', ') : '') };
  }
  if (!wasActive && isActive) {
    return { action: 'activated', text: 'Снова в работе' + (parts.length ? '; изменено: ' + parts.join(', ') : '') };
  }
  if (!parts.length) return null;
  const text = 'Изменено: ' + parts.join(', ');
  return { action: 'changed', text: text.charAt(0).toUpperCase() + text.slice(1) };
}

/* Записать изменение по результату сравнения. Возвращает id записи или null. */
function logRowChange(kind, oldRow, newRow) {
  const d = describeRowChange(kind, oldRow, newRow);
  if (!d) return null;
  return addChangeLogEntry(kind, newRow, d.action, d.text);
}
