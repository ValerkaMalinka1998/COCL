/* ============================================================
   АВТОТЕСТЫ ЛОГИКИ (без браузера)
   Нормы и типы контроля, точки-метки, смены, недели, расписание,
   валидация. Модули приложения грузятся в изолированный контекст
   в порядке index.html, localStorage — заглушка в памяти.
   Запуск из корня проекта:  node --test tests/logic.test.js
   ============================================================ */
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

/* === КОНТЕКСТ ПРИЛОЖЕНИЯ === */
const ROOT = path.join(__dirname, '..');
const MODULES = [
  'js/core/utils.js',
  'js/core/state.js',
  'js/core/dates.js',
  'js/data/standards.js',
  'js/data/workshops.js',
  'js/data/catalog.js',
  'js/data/schedule.js',
  'js/data/downtime.js',
  'js/data/debt.js',
  'js/data/changelog.js',
  'js/data/line-brand.js',
  'js/data/ack.js',
  'js/data/shifts.js',
  'js/data/user.js',
  'js/data/proposals.js',
  'js/views/settings/shifts.js',
  'js/io/excel-common.js',
  'js/io/standards-io.js'
];

function makeApp() {
  const store = new Map();
  const noop = () => {};
  const fakeEl = null;
  const ctx = {
    console,
    localStorage: {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, String(v)),
      removeItem: (k) => store.delete(k),
      clear: () => store.clear()
    },
    document: {
      querySelector: () => fakeEl,
      querySelectorAll: () => [],
      getElementById: () => fakeEl,
      addEventListener: noop,
      createElement: () => ({ style: {}, classList: { add: noop, remove: noop, toggle: noop } }),
      documentElement: { setAttribute: noop, getAttribute: () => null }
    },
    navigator: {},
    location: { href: 'file:///index.html', hash: '' },
    history: { pushState: noop }
  };
  ctx.window = ctx;
  ctx.addEventListener = noop;
  vm.createContext(ctx);
  MODULES.forEach(f => vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f }));
  // Функции и const модулей видны через выражение в том же контексте
  return (expr) => vm.runInContext(expr, ctx);
}

const app = makeApp();
const fn = (name) => app(name);
const plain = (v) => JSON.parse(JSON.stringify(v));

/* === НОРМЫ === */
test('parseNorm: форматы нормы', () => {
  const parseNorm = fn('parseNorm');
  assert.deepEqual(plain(parseNorm('92 ± 5')), { min: 87, max: 97 });
  assert.deepEqual(plain(parseNorm('92+-5')), { min: 87, max: 97 });
  assert.deepEqual(plain(parseNorm('5 до 8')), { min: 5, max: 8 });
  assert.deepEqual(plain(parseNorm('5.5 - 8.5')), { min: 5.5, max: 8.5 });
  assert.deepEqual(plain(parseNorm('-65 до -55')), { min: -65, max: -55 });
  assert.deepEqual(plain(parseNorm('7,8 мм')), { min: 7.8, max: 7.8 });
  assert.deepEqual(plain(parseNorm('92')), { min: 92, max: 92 });
  assert.deepEqual(plain(parseNorm('0 бар')), { min: 0, max: 0 });
  assert.equal(parseNorm(''), null);
  assert.equal(parseNorm('метки совпадают'), null);
});

test('classifyNormValue: тип значения', () => {
  const c = fn('classifyNormValue');
  assert.equal(c('92 ± 5'), 'variable');
  assert.equal(c('5 до 8'), 'interval');
  assert.equal(c('92'), 'fixed');
  assert.equal(c('метки совпадают'), null);
  assert.equal(c('92 ± '), null);
});

test('isNormMark: метка словами, а не число с единицами или опечатка', () => {
  const m = fn('isNormMark');
  ['метки совпадают', 'по риске 0', 'В одну линию'].forEach(v => assert.equal(m(v), true, v));
  ['92', '92 мм', '5 до 8 мм', '92 ± 5', '5 до', '92 ± ', '', '-65 до -55', '—', '± 5'].forEach(v => assert.equal(m(v), false, v));
});

test('normTypeError: тип контроля ↔ значение', () => {
  const e = (t, v) => fn('normTypeError')(t, v) ? 'ошибка' : 'ок';
  // Метка допустима в любом типе
  ['fixed', 'variable', 'interval'].forEach(t => assert.equal(e(t, 'метки совпадают'), 'ок', t));
  // Фиксированный
  assert.equal(e('fixed', '92'), 'ок');
  assert.equal(e('fixed', '92 ± 5'), 'ошибка');
  assert.equal(e('fixed', '5 до 8'), 'ошибка');
  // Вариабельный
  assert.equal(e('variable', '92 ± 5'), 'ок');
  assert.equal(e('variable', '92'), 'ошибка');
  assert.equal(e('variable', '5 до 8'), 'ошибка');
  assert.equal(e('variable', '92 ± '), 'ошибка');
  // Интервал
  assert.equal(e('interval', '5 до 8'), 'ок');
  assert.equal(e('interval', '5 до 8 мм'), 'ок');
  assert.equal(e('interval', '92 ± 5'), 'ошибка');
  assert.equal(e('interval', '5 до'), 'ошибка');
});

test('migrateControlType: старые типы → 3 канонических', () => {
  const mig = fn('migrateControlType');
  assert.equal(mig('range_input'), 'interval');
  assert.equal(mig('ok_not_ok'), 'fixed');
  assert.equal(mig('tolerance'), 'variable');
  assert.equal(mig('variable'), 'variable');
  assert.equal(mig(''), 'fixed');
});

test('E-Param: старая норма (valuesByBrand) переходит в точки, «Остальные бренды» не теряются', () => {
  const p = plain(fn('normalizeElectronicParam')({
    paramName: 'Давление', controlType: 'variable',
    valuesByBrand: [{ brand: '', target: 90, tolerance: 3 }, { brand: 'Kent', target: 92, tolerance: 5 }, { brand: '', target: '', tolerance: '' }]
  }));
  assert.deepEqual(p.measurements.map(m => m.brand), ['', 'Kent'], 'пустая строка без значений отбрасывается, общая норма остаётся');
  assert.equal(p.measurements[1].points[0].value, '92 ± 5');
  const pick = plain(fn('pickBrandValues')(p.measurements, 'Winston'));
  assert.equal(pick.kind, 'rest');
  assert.equal(pick.item.points[0].value, '90 ± 3');
});

test('E-Param: интервал переходит в «от до», сохранённые точки не трогаются', () => {
  const norm = fn('normalizeElectronicParam');
  const iv = plain(norm({ paramName: 'Т', controlType: 'interval', valuesByBrand: [{ brand: 'A', min: 5, max: 8, target: 6.5, tolerance: 1.5 }] }));
  assert.equal(iv.measurements[0].points[0].value, '5 до 8');
  const own = plain(norm({ paramName: 'Т', controlType: 'variable', measurements: [{ brand: '', points: [{ value: '92 ± 5' }, { value: 'в одну линию' }] }], valuesByBrand: [{ brand: 'X', target: 1, tolerance: 1 }] }));
  assert.deepEqual(own.measurements[0].points.map(p => p.value), ['92 ± 5', 'в одну линию']);
});

/* === СМЕНЫ И НЕДЕЛИ === */
test('getCurrentShiftPeriod: день 09–21, ночь после полуночи — к вчерашней дате', () => {
  const p = (iso) => plain(fn('getCurrentShiftPeriod')(new Date(iso)));
  assert.deepEqual(p('2026-10-23T06:00:00'), { shiftType: 'night', date: '2026-10-22' });
  assert.deepEqual(p('2026-10-23T08:59:00'), { shiftType: 'night', date: '2026-10-22' });
  assert.deepEqual(p('2026-10-23T09:00:00'), { shiftType: 'day', date: '2026-10-23' });
  assert.deepEqual(p('2026-10-23T20:59:00'), { shiftType: 'day', date: '2026-10-23' });
  assert.deepEqual(p('2026-10-23T21:00:00'), { shiftType: 'night', date: '2026-10-23' });
});

test('getWeekDays: неделя Пн–Вс, воскресенье — в своей неделе', () => {
  const w = (iso, off = 0) => plain(fn('getWeekDays')(off, new Date(iso)));
  const days = w('2026-10-25T12:00:00'); // воскресенье
  assert.equal(days[0], '2026-10-19');
  assert.equal(days[6], '2026-10-25');
  assert.equal(w('2026-10-19T12:00:00', 1)[0], '2026-10-26');
  assert.equal(fn('addDaysISO')('2026-12-31', 1), '2027-01-01');
});

test('буквы смен: день и ночь разные, цикл повторяется', () => {
  const s = fn('getShiftsForDate');
  const cfg = plain(fn('getElectronicShiftConfig')());
  const d0 = plain(s(cfg.startDate));
  assert.notEqual(d0.day, d0.night);
  const later = fn('addDaysISO')(cfg.startDate, cfg.dayCycle.length);
  assert.deepEqual(plain(s(later)), d0);
  // Каждая буква — допустимая
  for (let i = 0; i < 16; i++) {
    const x = plain(s(fn('addDaysISO')(cfg.startDate, i)));
    assert.ok(['A', 'B', 'C', 'D'].includes(x.day) && ['A', 'B', 'C', 'D'].includes(x.night));
  }
});

/* === РАСПИСАНИЕ === */
test('autoTimeWindows: окна по отмеченным сменам, у CIL окна нет', () => {
  const a = (work, sch) => plain(fn('autoTimeWindows')(work, sch));
  assert.deepEqual(a('Run', [{ day: 1, shift: 'day' }]), [{ from: '09:00', to: '10:00' }]);
  assert.deepEqual(a('Stop', [{ day: 1, shift: 'day' }, { day: 2, shift: 'night' }]),
    [{ from: '09:00', to: '10:00' }, { from: '21:00', to: '22:00' }]);
  assert.deepEqual(a('CIL', [{ day: 1, shift: 'day' }]), []);
  assert.equal(fn('getTimeWindowShift')('21:00'), 'night');
  assert.equal(fn('getTimeWindowShift')('03:00'), 'night');
  assert.equal(fn('getTimeWindowShift')('09:00'), 'day');
});

test('шаблон расписания: версия по неделе, прошлое не меняется', () => {
  const row = {
    id: 'r1',
    frequency: {
      templates: [
        { from: '2026-10-05', inSchedule: true, schedule: [{ day: 1, shift: 'day' }], work: 'Run' },
        { from: '2026-10-19', inSchedule: true, schedule: [{ day: 2, shift: 'night' }], work: 'Stop' }
      ]
    }
  };
  const t = (w) => plain(fn('getRowTemplateForWeek')(row, w));
  assert.equal(t('2026-09-28').inSchedule, false, 'до первой версии — не в расписании');
  assert.deepEqual(t('2026-10-12').schedule, [{ day: 1, shift: 'day' }]);
  assert.equal(t('2026-10-12').work, 'Run');
  assert.deepEqual(t('2026-10-26').schedule, [{ day: 2, shift: 'night' }]);
  assert.deepEqual(t('2026-10-26').timeWindows, [{ from: '21:00', to: '22:00' }]);
  // Старые данные без версий — исходные поля строки
  const legacy = { inSchedule: true, work: 'CIL', frequency: { schedule: [{ day: 3, shift: 'day' }] } };
  const lt = plain(fn('getRowTemplateForWeek')(legacy, '2026-10-19'));
  assert.equal(lt.inSchedule, true);
  assert.deepEqual(lt.timeWindows, []);
});

test('разовые правки недели: убрать / добавить только на эту неделю', () => {
  const row = { id: 'r2', frequency: { templates: [{ from: '2026-10-05', inSchedule: true, schedule: [{ day: 1, shift: 'day' }], work: 'Run' }] } };
  fn('setScheduleWeekOverride')('2026-10-19', 'SD12', { removed: ['r2'] });
  const r = (w) => plain(fn('getRowForWeek')(row, w, 'SD12'));
  assert.equal(r('2026-10-19').member, false, 'на неделе с правкой — убран');
  assert.equal(r('2026-10-26').member, true, 'на следующей неделе — как в шаблоне');
  assert.equal(plain(fn('getRowForWeek')(row, '2026-10-19', 'SD01')).member, true, 'другая линия не затронута');
  fn('setScheduleWeekOverride')('2026-10-19', 'SD12', null);
  assert.equal(r('2026-10-19').member, true, 'пустая правка удаляется');
});

test('rowExistedByShiftEnd: смены до создания стандарта не планируются', () => {
  const ex = fn('rowExistedByShiftEnd');
  const row = { createdAt: '2026-10-20T15:00:00' };
  assert.equal(ex(row, '2026-10-19', 'night'), false, 'ночь 19-го закончилась 20-го в 09:00');
  assert.equal(ex(row, '2026-10-20', 'day'), true, 'день 20-го заканчивается в 21:00');
  assert.equal(ex({}, '2000-01-01', 'day'), true, 'без даты создания — считаем существовавшим');
});

/* === ВАЛИДАЦИЯ === */
test('валидация: 28 смен, границы срока, решение аналитика', () => {
  const idx = fn('valShiftIndex');
  const from = fn('valShiftFromIndex');
  assert.deepEqual(plain(from(idx('2026-10-23', 'night'))), { date: '2026-10-23', shift: 'night' });
  assert.equal(idx('2026-10-24', 'day') - idx('2026-10-23', 'night'), 1);
  assert.equal(fn('validationShiftCount')(fn('makeValidation')()), fn('VALIDATION_SHIFTS'));

  const row = { validation: { from: '2026-10-20', fromShift: 'day', until: '2026-11-02', untilShift: 'night', decidedAt: '' } };
  const vs = fn('isValidationShift');
  assert.equal(vs(row, '2026-10-19', 'night'), false, 'до начала');
  assert.equal(vs(row, '2026-10-20', 'day'), true, 'первая смена');
  assert.equal(vs(row, '2026-11-02', 'night'), true, 'последняя смена');
  assert.equal(vs(row, '2026-11-03', 'day'), false, 'после срока не продлевается');
  const decided = { validation: { ...row.validation, decidedAt: '2026-10-25', decidedShift: 'day', result: 'approved' } };
  assert.equal(vs(decided, '2026-10-24', 'night'), true, 'до решения');
  assert.equal(vs(decided, '2026-10-25', 'day'), false, 'с решения — уже обычный');
});

test('существенные правки: одно правило для листа линии, истории и ознакомления', () => {
  const describe = fn('describeRowChange');
  const major = fn('stdAckIsMajor');
  const st = { id: 's1', line: 'SD12', title: 'Зазор', active: true, durationSec: 60, photos: ['a.jpg'],
    appliesTo: ['ChangeOver'], triggers: [], topLosses: [], measurements: [{ brand: '', points: [{ value: '0,3' }] }] };
  const check = (patch) => {
    const d = describe('mech', st, { ...plain(st), ...patch });
    return { sheet: d.sheet !== false, ack: major({ action: d.action, sheet: d.sheet, details: d.details }), action: d.action };
  };
  for (const [name, patch] of [
    ['фото', { photos: ['b.jpg'] }],
    ['время на проверку', { durationSec: 90 }],
    ['точки', { measurements: [{ brand: '', points: [{ value: '0,4' }] }] }],
    ['описание контроля', { controlDescription: 'новое' }]
  ]) {
    const r = check(patch);
    assert.equal(r.sheet, true, name + ' → в лист линии');
    assert.equal(r.ack, true, name + ' → повторное ознакомление');
  }
  for (const [name, patch] of [['CL относится к', { appliesTo: ['CL_TO'] }], ['триггеры', { triggers: ['x'] }]]) {
    const r = check(patch);
    assert.equal(r.sheet, false, name + ' → не в лист линии');
    assert.equal(r.ack, false, name + ' → не требует ознакомления');
  }
  const off = check({ active: false });
  assert.equal(off.action, 'deactivated');
  assert.equal(off.sheet, true, 'деактивация → в лист линии');
});

test('ознакомление — только если правка попала в лист линии; «Все бренды» понимает старые подписи', () => {
  const major = fn('stdAckIsMajor');
  assert.equal(major({ action: 'changed', details: [{ label: 'триггеры' }], sheet: false }), false);
  assert.equal(major({ action: 'changed', details: [{ label: 'норма (X)' }], sheet: false }), false, 'только лист стандарта');
  assert.equal(major({ action: 'changed', details: [{ label: 'фото' }] }), true);
  const rest = fn('isRestBrandLabel');
  for (const t of ['Все бренды', 'Остальные бренды', ' все сорта ']) assert.equal(rest(t), true, t);
  assert.equal(rest('Marlboro'), false);
});

/* === ДОЛГ ПРОВЕРОК И ПРОСТОЙ === */
// Ср 21.10 и Пт 23.10 — день по расписанию; «сейчас» — Пт 23.10, 10:00 (дневная смена)
const debtRow = { id: 'd1', line: 'SD12', inSchedule: true, work: 'Run',
  frequency: { schedule: [{ day: 3, shift: 'day' }, { day: 5, shift: 'day' }] } };
const debtNow = new Date('2026-10-23T10:00:00');
const debtIdx = (checks) => {
  const letters = fn('getShiftsForDate');
  return new Map(checks.map(([date, shift, status]) =>
    [`${date}|${letters(date)[shift]}|d1`, { h: {}, it: { status } }]));
};
const debtCells = (t) => Object.fromEntries([...t.cells].map(([k, c]) => [k, c.s + (c.late ? '+late' : '')]));

test('долг: пропуск в ср день переходит и закрывается проверкой позже', () => {
  const t = fn('clRowTimeline')(debtRow, 'SD12', '2026-10-21', '2026-10-23', debtIdx([['2026-10-22', 'day', 'OK']]), debtNow);
  const c = debtCells(t);
  assert.equal(c['2026-10-21|day'], 'miss', 'пропуск считается в исходной смене');
  assert.equal(c['2026-10-21|night'], 'carry', 'дальше — перенесено');
  assert.equal(c['2026-10-22|day'], 'ok+late', 'закрыто позже');
  assert.equal(c['2026-10-22|night'], '', 'после закрытия долга нет');
  assert.equal(c['2026-10-23|day'], 'todo');
  assert.equal(t.debts.length, 1, 'один пропуск, не накопительно');
  assert.equal(t.debts[0].by, 'check');
});

test('долг: не проверили — сливается со следующим плановым разом', () => {
  const t = fn('clRowTimeline')(debtRow, 'SD12', '2026-10-21', '2026-10-23', debtIdx([]), debtNow);
  const c = debtCells(t);
  assert.equal(c['2026-10-22|night'], 'carry');
  assert.equal(c['2026-10-23|day'], 'todo', 'в смене по плану — одна проверка, не долг');
  assert.equal(t.debts.length, 1);
  assert.ok(t.open, 'долг висит до проверки');
  assert.equal(c['2026-10-21|day'], 'miss');
});

test('простой: смены не планируются, долг снимается', () => {
  fn('setLineDowntimes')('SD12', [{ id: 'x', from: '2026-10-21', fromShift: 'night', to: '2026-10-22', toShift: 'night' }]);
  try {
    assert.equal(fn('isDowntimeShift')('SD12', '2026-10-21', 'day'), false, 'до начала');
    assert.equal(fn('isDowntimeShift')('SD12', '2026-10-22', 'night'), true, 'последняя смена');
    const t = fn('clRowTimeline')(debtRow, 'SD12', '2026-10-21', '2026-10-23', debtIdx([]), debtNow);
    const c = debtCells(t);
    assert.equal(c['2026-10-21|day'], 'miss');
    assert.equal(c['2026-10-21|night'], 'down');
    assert.equal(c['2026-10-22|day'], 'down');
    assert.equal(t.debts[0].by, 'down', 'долг снят простоем');
    assert.equal(c['2026-10-23|day'], 'todo', 'после запуска — только плановые');
    fn('setLineDowntimes')('SD12', [{ id: 'y', from: '2026-10-23', fromShift: 'day', to: '' }]);
    assert.equal(fn('isRowPlanned')(debtRow, 'SD12', '2026-10-30', 'day'), false, '«до запуска» — открыт');
  } finally {
    fn('setLineDowntimes')('SD12', []);
  }
});

test('долг: закрыт отклонением — обычное отклонение, без «закрыто позже»', () => {
  const t = fn('clRowTimeline')(debtRow, 'SD12', '2026-10-21', '2026-10-23', debtIdx([['2026-10-22', 'day', 'FAIL']]), debtNow);
  assert.equal(debtCells(t)['2026-10-22|day'], 'fail');
  assert.equal(t.debts[0].by, 'check');
});

test('долг: стандарт убрали из расписания — долг снимается', () => {
  fn('setScheduleWeekOverride')('2026-10-26', 'SD12', { removed: ['d1'] });
  try {
    const t = fn('clRowTimeline')(debtRow, 'SD12', '2026-10-21', '2026-10-27', debtIdx([]), new Date('2026-10-27T10:00:00'));
    const c = debtCells(t);
    assert.equal(c['2026-10-25|night'], 'carry', 'до конца недели переносится');
    assert.equal(c['2026-10-26|day'], '', 'со следующей недели не в расписании — долга нет');
    assert.equal(t.debts[t.debts.length - 1].by, 'removed');
    assert.equal(t.open, null);
  } finally {
    fn('setScheduleWeekOverride')('2026-10-26', 'SD12', null);
  }
});

test('валидация: срок сдвигается на смены простоя', () => {
  const row = { id: 'v1', line: 'SD12', validation: { from: '2026-10-20', fromShift: 'day', until: '2026-10-20', untilShift: 'night', decidedAt: '' } };
  const vs = fn('isValidationShift');
  assert.equal(vs(row, '2026-10-21', 'day'), false, 'без простоя срок кончился');
  fn('setLineDowntimes')('SD12', [{ id: 'z', from: '2026-10-20', fromShift: 'night', to: '2026-10-20', toShift: 'night' }]);
  try {
    assert.equal(vs(row, '2026-10-20', 'night'), false, 'в простое не проверяется');
    assert.equal(vs(row, '2026-10-21', 'day'), true, 'срок сдвинут на 1 смену');
    assert.equal(vs(row, '2026-10-21', 'night'), false);
  } finally {
    fn('setLineDowntimes')('SD12', []);
  }
});

test('счёт (вариант A): пропуск один раз, закрытый позже — выполнен, смена закрытия не в счёт', () => {
  const tally = fn('clTallyIndex')('SD12', '2026-10-21', '2026-10-23', [{ row: debtRow }], debtIdx([['2026-10-22', 'day', 'OK']]));
  const k = (d, s) => tally.get(`${d}|${s}|d1`);
  assert.equal(k('2026-10-21', 'day'), 'late', 'пропуск в смене пропуска, закрыт позже');
  assert.equal(k('2026-10-21', 'night'), undefined, '«перенесено» — не в счёт');
  assert.equal(k('2026-10-22', 'day'), undefined, 'проверка долга вне плана — зачтена в смене пропуска');
  const fail = fn('clTallyIndex')('SD12', '2026-10-21', '2026-10-23', [{ row: debtRow }], debtIdx([['2026-10-22', 'day', 'FAIL']]));
  assert.equal(fail.get('2026-10-22|day|d1'), 'FAIL', 'отклонение — в смене, где нашли');
  const none = fn('clTallyIndex')('SD12', '2026-10-21', '2026-10-23', [{ row: debtRow }], debtIdx([]));
  assert.equal(none.get('2026-10-21|day|d1'), 'missed', 'не закрыт — пропуск');
  const one = fn('clTallyIndex')('SD12', '2026-10-21', '2026-10-21', [{ row: debtRow }], debtIdx([['2026-10-22', 'day', 'OK']]));
  assert.equal(one.get('2026-10-21|day|d1'), 'late', 'период — одна смена, закрыт уже после периода');
  assert.equal(one.has('2026-10-22|day|d1'), false, 'смены после периода в итог не попадают');
});

/* === КЭШ ЧТЕНИЙ === */
test('буква смены пересчитывается после смены графика (кэш конфига смен)', () => {
  app("localStorage.removeItem(STORAGE_KEYS.electronicShiftCfg)");
  assert.equal(fn('getDayShiftForDate')('2026-10-01'), 'B', 'по умолчанию');
  fn('setElectronicShiftConfig')({ dayCycle: ['C'], nightCycle: ['D'], startDate: '2026-10-01' });
  assert.equal(fn('getDayShiftForDate')('2026-10-05'), 'C', 'новый график виден сразу');
  assert.equal(fn('getNightShiftForDate')('2026-10-05'), 'D');
  app("localStorage.removeItem(STORAGE_KEYS.electronicShiftCfg)");
});

test('withLoadCache: ключ читается один раз, save сбрасывает кэш', () => {
  fn('save')('cl_test_key', [1]);
  const r = fn('withLoadCache')(() => {
    const a = fn('load')('cl_test_key', []);
    const same = a === fn('load')('cl_test_key', []);
    fn('save')('cl_test_key', [2]);
    return { same, after: fn('load')('cl_test_key', []) };
  });
  assert.equal(r.same, true, 'внутри отрисовки — тот же объект');
  assert.deepEqual(plain(r.after), [2], 'после save — свежие данные');
  assert.notEqual(fn('load')('cl_test_key', []), fn('load')('cl_test_key', []), 'вне отрисовки — без кэша');
  app("localStorage.removeItem('cl_test_key')");
});

/* === ИМПОРТ БЛАНКА OPL === */
test('бланк OPL: значение, время, дата', () => {
  const clean = fn('oplCleanValue');
  assert.equal(clean(' - 65 kPa (±10 kPa)'), '-65 kPa ±10 kPa');
  assert.deepEqual(plain(fn('parseNorm')(clean(' - 65 kPa (±10 kPa)'))), { min: -75, max: -55 });
  assert.equal(clean('5 - 8'), '5 - 8', 'диапазон не ломается');
  assert.equal(fn('classifyNormValue')(clean('5 - 8')), 'interval');
  assert.equal(clean('метки совпадают'), 'метки совпадают');
  assert.equal(clean('`-2 мм\t\t\t'), '-2 мм', 'текстовый префикс Excel и табы');
  const dur = fn('oplDurationSec');
  assert.equal(dur('30 сек'), 30);
  assert.equal(dur('1,5 мин'), 90);
  assert.equal(dur(''), 0);
  assert.equal(dur(app('new Date(Date.UTC(1899, 11, 30, 0, 0, 30))')), 30, 'время Excel 0:00:30');
  const d = fn('oplDate');
  assert.equal(new Date(d('22.05.2026')).getDate(), 22);
  assert.equal(new Date(d(app('new Date(Date.UTC(2026, 4, 22))'))).getDate(), 22, 'полночь UTC из Excel — тот же день');
  assert.equal(d('нет'), null);
});

/* === ЗАПИСЬ ПО ОДНОЙ ЗАПИСИ === */
test('saveStandard / removeStandard / addHistoryRecord трогают только свою запись', () => {
  app("localStorage.removeItem(STORAGE_KEYS.standards); localStorage.removeItem(STORAGE_KEYS.history)");
  fn('saveStandards')([{ id: 'a', title: 'A' }, { id: 'b', title: 'B' }]);
  fn('saveStandard')({ id: 'a', title: 'A2' });
  assert.deepEqual(plain(fn('getStandards')().map(s => [s.id, s.title])), [['a', 'A2'], ['b', 'B']], 'замена на месте, порядок сохранён');
  fn('removeStandard')('a');
  assert.deepEqual(plain(fn('getStandards')().map(s => s.id)), ['b']);
  fn('addHistoryRecord')({ id: 'h1' });
  fn('addHistoryRecord')({ id: 'h2' });
  fn('saveHistoryRecords')([{ id: 'h1', x: 1 }]);
  assert.deepEqual(plain(fn('getHistory')()), [{ id: 'h1', x: 1 }, { id: 'h2' }]);
  app('setHistory([])');
  assert.deepEqual(plain(fn('getHistory')()), []);
  app("localStorage.removeItem(STORAGE_KEYS.standards); localStorage.removeItem(STORAGE_KEYS.history)");
});

test('normalizeOplNumber: единый вид OPL-N', () => {
  const n = fn('normalizeOplNumber');
  assert.equal(n('1'), 'OPL-1');
  assert.equal(n(' 4.2.1 '), 'OPL-4.2.1');
  assert.equal(n('OPL3'), 'OPL-3');
  assert.equal(n('opl 5'), 'OPL-5');
  assert.equal(n('OPL-7'), 'OPL-7');
  assert.equal(n('4,2'), 'OPL-4.2');
  assert.equal(n('A-12'), 'A-12');
});

test('шаблоны чек-листа: сохранить, заменить, удалить', () => {
  app(`saveScheduleTemplate({ id: 't1', name: 'Лето', line: 'SD01', mode: 'mech', rows: { s1: { schedule: [{ day: 1, shift: 'day' }] } } })`);
  app(`saveScheduleTemplate({ id: 't1', name: 'Лето 2', line: 'SD01', mode: 'mech', rows: {} })`);
  assert.deepEqual(plain(app('getScheduleTemplates().map(t => t.name)')), ['Лето 2']);
  app(`removeScheduleTemplate('t1')`);
  assert.equal(app('getScheduleTemplates().length'), 0);
});

test('роли: оператор только предлагает; предложение не меняет стандарт до решения', () => {
  app(`localStorage.setItem('cl_current_role', 'operator')`);
  assert.equal(fn('canDo')('edit'), false);
  assert.equal(fn('canOpenTab')('schedule'), false);
  assert.equal(fn('canOpenTab')('history'), true);
  const before = app('getStandards().length');
  app(`addStdProposal({ id: 'np1', line: 'SD01', title: 'Новый' }, null)`);
  assert.equal(app('getStandards().length'), before);
  assert.equal(app('getStdProposals().filter(p => p.status === "pending").length'), 1);
  app(`decideStdProposal(getStdProposals()[0].id, 'rejected', 'нет')`);
  assert.equal(app('getStdProposals()[0].status'), 'rejected');
  app(`localStorage.setItem('cl_current_role', 'analyst')`);
  assert.equal(fn('canDo')('edit'), true);
  app(`localStorage.removeItem('cl_current_role')`);
});

test('normalizeStandard: у стандарта без topLosses (импорт) поле — пустой массив', () => {
  const st = plain(fn('normalizeStandard')({ id: 'x', title: 'T', line: 'SD08' }));
  assert.deepEqual(st.topLosses, []);
  assert.deepEqual(plain(fn('normalizeStandard')({ id: 'y', topLosses: ['a'] })).topLosses, ['a']);
});

test('запись Чек-листа без буквы смены или с кириллической А получает латинскую букву', () => {
  const fix = fn('fixHistoryShift');
  const a = plain(fix({ mode: 'cl', date: '2026-10-26', shiftType: 'day', shift: 'А', timestamp: '2026-10-26T10:00:00Z' }));
  assert.equal(a.shift, 'A');
  const b = plain(fix({ mode: 'cl', date: '2026-10-26', shiftType: 'night', shift: '', timestamp: '2026-10-26T10:00:00Z' }));
  assert.equal(b.shift, plain(app(`getShiftsForDate('2026-10-26').night`)));
  const c = { mode: 'toploss', date: '2026-10-26', shift: '' };
  assert.equal(fix(c), c);
});
