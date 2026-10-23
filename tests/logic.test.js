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
  'js/views/settings/shifts.js'
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
