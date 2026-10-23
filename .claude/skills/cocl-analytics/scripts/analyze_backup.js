#!/usr/bin/env node
/* ============================================================
   COCL: разбор проверок по бэкапу checklist_backup_*.json
   Только чтение. Печатает сводку в Markdown, --json — в файл.
   Пропуски смен и % выполнения расписания не считает (их
   считает приложение по версиям шаблона расписания).
   ============================================================ */
'use strict';
const fs = require('fs');
const path = require('path');

/* === АРГУМЕНТЫ === */
function parseArgs(argv) {
  const a = { days: 30, to: null, line: null, backup: null, json: null };
  for (let i = 2; i < argv.length; i++) {
    const k = argv[i], v = argv[i + 1];
    if (k === '--days') { a.days = Number(v); i++; }
    else if (k === '--to') { a.to = v; i++; }
    else if (k === '--line') { a.line = v; i++; }
    else if (k === '--backup') { a.backup = v; i++; }
    else if (k === '--json') { a.json = v; i++; }
  }
  return a;
}

function findBackup() {
  const files = fs.readdirSync('.').filter(f => /^checklist_backup_.*\.json$/.test(f)).sort();
  if (!files.length) throw new Error('Нет checklist_backup_*.json в текущей папке — укажи --backup');
  return files[files.length - 1];
}

/* === ДАТЫ И СМЕНЫ === */
function iso(d) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return iso(d);
}

/* Буква смены: кириллические А/В/С → латинские (в старых записях встречаются обе) */
function normLetter(v) {
  const s = String(v || '').trim().toUpperCase();
  return { 'А': 'A', 'В': 'B', 'С': 'C' }[s] || s;
}

/* Дата и тип смены записи: день 09–21, ночь 21–09 (после полуночи — к вчерашней дате) */
function recShift(h) {
  if (h.date && /^\d{4}-\d{2}-\d{2}$/.test(h.date)) {
    return { date: h.date, shift: h.shiftType || null, letter: normLetter(h.shift) };
  }
  const t = new Date(h.timestamp);
  if (isNaN(t)) return null;
  const hr = t.getHours();
  let date = iso(t), shift = 'day';
  if (hr >= 21) shift = 'night';
  else if (hr < 9) { shift = 'night'; date = addDays(date, -1); }
  return { date, shift, letter: normLetter(h.shift) };
}

/* === ЗАПИСИ === */
const KIND_LABELS = { cl: 'Чек-лист CL (мех.)', electronic: 'E-Param', toploss: 'TOP Losses', cocl: 'Переходы (COCL)' };
/* Как HIST_COCL_TYPES в history-data.js; старые типы (Minor, Intermediate) — как есть */
const COCL_TYPE_LABELS = { ChangeOver: 'Смена сорта', CL_TO: 'CL в ТО', CL_Conversion: 'CL в Конвертацию' };

function recKind(h) {
  if (h.mode === 'cl' || h.mode === 'electronic' || h.mode === 'toploss') return h.mode;
  return 'cocl';
}

function itemTitle(it) { return it.title || it.checkPoint || it.paramName || '—'; }
function itemNumber(it) { return it.oplNumber || it.standardNumber || ''; }

function itemValue(it) {
  if (Array.isArray(it.values)) return it.values.filter(v => v !== '' && v != null).join(', ');
  return String(it.answer ?? it.value ?? '').trim();
}

function pct(a, b) { return b ? Math.round(a / b * 100) : null; }

/* === РАСЧЁТ === */
function analyze(data, opt) {
  const history = Array.isArray(data.history) ? data.history : [];
  const to = opt.to || iso(new Date());
  const from = opt.days > 0 ? addDays(to, -(opt.days - 1)) : '0000-00-00';

  const recs = [];
  history.forEach(h => {
    const s = recShift(h);
    if (!s || s.date < from || s.date > to) return;
    if (opt.line && h.line !== opt.line) return;
    recs.push({ h, s, kind: recKind(h), key: s.date + '|' + (s.shift === 'night' ? 1 : 0) + '|' + (h.timestamp || '') });
  });
  recs.sort((a, b) => a.key.localeCompare(b.key));

  const kinds = {}, lines = {}, stds = new Map(), machines = {}, letters = {}, losses = {}, cocl = {};
  const lossNames = new Map((data.topLosses || []).flatMap(c => (c.items || c.losses || [c])).map(x => [x.id, x.name || x.title || x.id]));

  recs.forEach(({ h, s, kind }) => {
    const k = kinds[kind] || (kinds[kind] = { records: 0, ok: 0, fail: 0, unchecked: 0 });
    const ln = lines[h.line || '—'] || (lines[h.line || '—'] = { records: 0, ok: 0, fail: 0, dates: new Set() });
    k.records++; ln.records++; ln.dates.add(s.date);
    if (kind === 'cocl') {
      const t = COCL_TYPE_LABELS[h.type] || h.type || 'проверка';
      const c = cocl[t] || (cocl[t] = { records: 0, withFail: 0 });
      c.records++;
      if ((h.items || []).some(it => it.status === 'FAIL')) c.withFail++;
    }
    if (kind === 'toploss') {
      const hasFail = (h.items || []).some(it => it.status === 'FAIL');
      (h.topLosses || []).forEach(id => {
        const l = losses[id] || (losses[id] = { name: lossNames.get(id) || id, checks: 0, withFail: 0, lines: new Set() });
        l.checks++; l.lines.add(h.line);
        if (hasFail) l.withFail++;
      });
    }
    (h.items || []).forEach(it => {
      const st = it.status === 'OK' ? 'ok' : it.status === 'FAIL' ? 'fail' : 'unchecked';
      k[st]++;
      if (st === 'unchecked') return;
      ln[st]++;
      const letter = s.letter || '?';
      const L = letters[letter] || (letters[letter] = { ok: 0, fail: 0 });
      L[st]++;
      const mKey = (h.line || '—') + ' · ' + (it.machine || '—');
      const M = machines[mKey] || (machines[mKey] = { ok: 0, fail: 0 });
      M[st]++;
      if (!it.standardId) return;
      const sKey = (h.line || '—') + '|' + it.standardId;
      if (!stds.has(sKey)) stds.set(sKey, { line: h.line, id: it.standardId, number: itemNumber(it), title: itemTitle(it), machine: it.machine || '', part: it.nodePart || it.linePart || '', list: [] });
      stds.get(sKey).list.push({ date: s.date, shift: s.shift, letter, kind, status: st, value: itemValue(it), comment: it.comment || '', deviation: it.deviation || '' });
    });
  });

  const stdRows = [...stds.values()].map(x => {
    const fail = x.list.filter(e => e.status === 'fail');
    let streak = 0;
    for (let i = x.list.length - 1; i >= 0 && x.list[i].status === 'fail'; i--) streak++;
    const failLetters = [...new Set(fail.map(e => e.letter))];
    return {
      line: x.line, id: x.id, number: x.number, title: x.title, machine: x.machine, part: x.part,
      checks: x.list.length, fails: fail.length, failPct: pct(fail.length, x.list.length), streak,
      failLetters, enough: x.list.length >= 5,
      lastFails: fail.slice(-3).map(e => ({ date: e.date, letter: e.letter, value: e.value, deviation: e.deviation, comment: e.comment }))
    };
  });

  const repeats = stdRows.filter(r => r.streak >= 2 || r.fails >= 3).sort((a, b) => b.streak - a.streak || b.fails - a.fails);
  const problemStds = stdRows.filter(r => r.fails > 0).sort((a, b) => b.fails - a.fails || b.failPct - a.failPct);
  const fewData = stdRows.filter(r => r.fails > 0 && !r.enough);

  return {
    period: { from: opt.days > 0 ? from : null, to, days: opt.days, line: opt.line || null },
    records: recs.length,
    kinds,
    lines: Object.fromEntries(Object.entries(lines).map(([k, v]) => [k, { records: v.records, ok: v.ok, fail: v.fail, okPct: pct(v.ok, v.ok + v.fail), days: v.dates.size }])),
    letters: Object.fromEntries(Object.entries(letters).map(([k, v]) => [k, { ...v, checks: v.ok + v.fail, failPct: pct(v.fail, v.ok + v.fail), enough: v.ok + v.fail >= 10 }])),
    machines: Object.entries(machines).map(([k, v]) => ({ machine: k, ...v, checks: v.ok + v.fail, failPct: pct(v.fail, v.ok + v.fail) })).filter(m => m.fail).sort((a, b) => b.fail - a.fail),
    repeats, problemStds, fewData,
    losses: Object.values(losses).map(l => ({ ...l, lines: [...l.lines] })).sort((a, b) => b.withFail - a.withFail || b.checks - a.checks),
    cocl
  };
}

/* === ВЫВОД === */
function md(r) {
  const out = [];
  const p = r.period;
  out.push(`# Разбор проверок${p.line ? ' · ' + p.line : ''}: ${p.from ? p.from + ' — ' + p.to : 'всё время'}`);
  out.push(`Записей: ${r.records}.`);
  if (!r.records) { out.push('\nЗа период проверок нет — расширь --days или проверь --to.'); return out.join('\n'); }

  out.push('\n## По видам проверок\n| Вид | Записей | ОК | Не ОК | Не проверено |\n|---|---|---|---|---|');
  Object.entries(r.kinds).forEach(([k, v]) => out.push(`| ${KIND_LABELS[k]} | ${v.records} | ${v.ok} | ${v.fail} | ${v.unchecked} |`));

  out.push('\n## Линии\n| Линия | Записей | Дней с проверками | Пункты ОК | Не ОК | % в норме |\n|---|---|---|---|---|---|');
  Object.entries(r.lines).sort().forEach(([k, v]) => out.push(`| ${k} | ${v.records} | ${v.days} | ${v.ok} | ${v.fail} | ${v.okPct ?? '—'}% |`));

  out.push('\n## Повторяющиеся отклонения (серия подряд ≥ 2 или ≥ 3 за период)');
  if (!r.repeats.length) out.push('Нет.');
  r.repeats.forEach(s => {
    out.push(`- **${s.line} · ${s.number ? s.number + ' ' : ''}${s.title}** (${[s.machine, s.part].filter(Boolean).join(' · ')}) — ` +
      `не в норме ${s.fails} из ${s.checks}${s.streak >= 2 ? `, **${s.streak} подряд**` : ''}; смены: ${s.failLetters.join(', ')}`);
    s.lastFails.forEach(e => out.push(`  - ${e.date} смена ${e.letter}: ${e.deviation || e.value || 'Не ОК'}${e.comment ? ' — «' + e.comment + '»' : ''}`));
  });

  out.push('\n## Стандарты с отклонениями\n| Линия | Стандарт | Машина | Проверок | Не ОК | % | Данных достаточно |\n|---|---|---|---|---|---|---|');
  r.problemStds.slice(0, 15).forEach(s => out.push(`| ${s.line} | ${s.number ? s.number + ' ' : ''}${s.title} | ${s.machine} | ${s.checks} | ${s.fails} | ${s.failPct}% | ${s.enough ? 'да' : 'нет (< 5)'} |`));
  if (r.problemStds.length > 15) out.push(`…ещё ${r.problemStds.length - 15} (полный список — --json)`);

  out.push('\n## Машины с отклонениями\n| Линия · машина | Проверок | Не ОК | % |\n|---|---|---|---|');
  r.machines.slice(0, 10).forEach(m => out.push(`| ${m.machine} | ${m.checks} | ${m.fail} | ${m.failPct}% |`));

  out.push('\n## Смены A/B/C/D (пункты CL, TOP Losses, переходов; «?» — смена не записана)\n| Смена | Проверок | Не ОК | % | Данных достаточно |\n|---|---|---|---|---|');
  Object.entries(r.letters).sort().forEach(([k, v]) => out.push(`| ${k} | ${v.checks} | ${v.fail} | ${v.failPct ?? '—'}% | ${v.enough ? 'да' : 'нет (< 10)'} |`));

  if (r.losses.length) {
    out.push('\n## TOP Losses\n| Потеря | Проверок | С отклонениями | Линии |\n|---|---|---|---|');
    r.losses.forEach(l => out.push(`| ${l.name} | ${l.checks} | ${l.withFail} | ${l.lines.join(', ')} |`));
  }
  if (Object.keys(r.cocl).length) {
    out.push('\n## Переходы (COCL)\n| Тип | Проверок | С отклонениями |\n|---|---|---|');
    Object.entries(r.cocl).forEach(([k, v]) => out.push(`| ${k} | ${v.records} | ${v.withFail} |`));
  }

  out.push('\n## Мало данных');
  out.push(r.fewData.length
    ? `${r.fewData.length} стандарт(ов) с отклонениями проверены < 5 раз — выводы «системно» по ним не делать, наблюдать.`
    : 'Все стандарты с отклонениями проверены ≥ 5 раз.');
  out.push('Пропущенные смены и % выполнения расписания — из Дашборда / Истории (скрипт их не считает).');
  return out.join('\n');
}

/* === ЗАПУСК === */
function main() {
  const opt = parseArgs(process.argv);
  const file = opt.backup || findBackup();
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  const res = analyze(data, opt);
  console.log(`Бэкап: ${path.basename(file)}${data.exportedAt ? ' (выгружен ' + data.exportedAt + ')' : ''}\n`);
  console.log(md(res));
  if (opt.json) {
    fs.mkdirSync(path.dirname(path.resolve(opt.json)), { recursive: true });
    fs.writeFileSync(opt.json, JSON.stringify(res, null, 2), 'utf8');
    console.log(`\nJSON: ${opt.json}`);
  }
}

main();
