/* ============================================================
   ДАННЫЕ: долг проверок CL
   Непроверенный по расписанию стандарт переходит на следующие смены,
   пока его не проверят. Один стандарт — не больше одного долга:
   долг закрывается проверкой, следующим плановым разом (тот же
   стандарт снова в расписании — долг сливается с ним) или простоем
   линии (снимается). Пропуск считается один раз — в смене, где его
   допустили; смены, через которые долг перешёл, — «перенесено».
   Долг не хранится — считается из истории проверок.
   ============================================================ */

// shortcut: долг старше этого не ищем (иначе обход всей истории), увеличить, если долги висят дольше
const DEBT_LOOKBACK_DAYS = 14;

/* Строки линии, которые могут стоять в расписании CL */
function clLineRows(line) {
  return [
    ...getStandards().filter(s => s.line === line && s.active !== false).map(r => ({ row: r, isElec: false })),
    ...getElectronicParamsForLine(line).filter(p => p.active !== false).map(r => ({ row: r, isElec: true }))
  ];
}

/* Индекс результатов CL линии: «дата|буква смены|id» → { h, it } */
function clResultIndex(line) {
  const idx = new Map();
  getHistory().forEach(h => {
    if (!(h.mode === 'cl' || h.mode === 'electronic') || h.line !== line) return;
    (h.items || []).forEach(it => idx.set(`${h.date}|${h.shift}|${it.standardId}`, { h, it }));
  });
  return idx;
}

/* Проверен ли стандарт в смене (ОК или отклонение; «не проверено» — нет) */
function clDoneResult(idx, row, dateStr, shift) {
  const res = idx.get(`${dateStr}|${getShiftsForDate(dateStr)[shift]}|${row.id}`);
  return res && (res.it.status === 'OK' || res.it.status === 'FAIL') ? res : null;
}

/* Стоит ли строка в расписании на неделю смены (или на валидации) —
   убранный из расписания стандарт долг не тянет */
function clRowInSchedule(row, line, at) {
  if (isValidationShift(row, at.date, at.shift)) return true;
  const dow = new Date(at.date + 'T12:00:00').getDay();
  return getRowForWeek(row, addDaysISO(at.date, -((dow + 6) % 7)), line).member;
}

/* Ячейки строки по сменам с from (день) по to (ночь) и её долги.
   cells: «дата|day|night» → { s, late, from, closed } (from — исходная смена долга у carry;
     closed — в этой смене вне плана проверкой закрыт долг; origin — долг, начатый пропуском)
     s: ok | fail | miss (пропущено, считается) | carry (перенесено) |
        down (простой) | todo (текущая смена, по плану) | plan (будущая) | ''
     late — проверка закрыла долг вне плана («закрыто позже»).
   debts: долги, начатые в периоде: { from, closed, by }
     by: 'check' | 'plan' | 'down' | 'removed' (убран из расписания) | null (висит). open — висящий долг. */
function clRowTimeline(row, line, from, to, idx, now = new Date()) {
  const downs = getLineDowntimes(line);
  const cur = getCurrentShiftPeriod(now);
  const curI = valShiftIndex(cur.date, cur.shiftType);
  const fromI = valShiftIndex(from, 'day');
  const endI = valShiftIndex(to, 'night');
  const cells = new Map();
  const debts = [];
  let debt = null;
  const close = (at, by) => { debt.closed = at; debt.by = by; debt = null; };

  for (let i = valShiftIndex(addDaysISO(from, -DEBT_LOOKBACK_DAYS), 'day'); i <= endI; i++) {
    const at = valShiftFromIndex(i);
    let s = '';
    let late = false;
    let carryFrom = null;
    let closedHere = false;
    let origin = null;
    if (isDowntimeShift(line, at.date, at.shift, downs)) {
      s = 'down';
      if (debt) close(at, 'down');
    } else {
      const planned = isRowPlanned(row, line, at.date, at.shift, downs);
      const res = i <= curI ? clDoneResult(idx, row, at.date, at.shift) : null;
      if (debt && !planned && !clRowInSchedule(row, line, at)) close(at, 'removed');
      if (res) {
        s = res.it.status === 'FAIL' ? 'fail' : 'ok';
        // Отклонение — обычное отклонение, без метки «закрыто позже»
        if (debt) { late = !planned && s === 'ok'; closedHere = !planned; close(at, 'check'); }
      } else if (planned && i < curI) {
        if (debt) close(at, 'plan');
        debt = { from: at, closed: null, by: null };
        debts.push(debt);
        origin = debt;
        s = 'miss';
      } else if (planned) {
        s = i === curI ? 'todo' : 'plan';
      } else if (debt && i <= curI) {
        s = 'carry';
        carryFrom = debt.from;
      }
    }
    if (i >= fromI) cells.set(`${at.date}|${at.shift}`, { s, late, from: carryFrom, closed: closedHere, origin });
  }
  return {
    cells,
    debts: debts.filter(d => valShiftIndex(d.from.date, d.from.shift) >= fromI),
    open: debt
  };
}

/* === СЧЁТ ДЛЯ ИСТОРИИ И ДАШБОРДА ===
   Итог «строка × смена» с учётом долга (вариант A): пропуск считается один раз —
   в смене пропуска; закрытый позже — 'late' (в «N из M» выполнен). Смена, где
   вне плана долг закрыли в норме, в счёт не входит (зачтено в смене пропуска);
   закрыли с отклонением — обычное отклонение в этой смене.
   Map «дата|day/night|id» → 'OK' | 'FAIL' | 'UNCHECKED' | 'late' | 'missed' |
     'due' (текущая/будущая по плану) | 'debt' (долг в текущей смене).
   Нет ключа — строка в смене не в счёт. */
function clTallyIndex(line, from, to, rows = clLineRows(line), idx = clResultIndex(line)) {
  const cur = getCurrentShiftPeriod();
  const curKey = `${cur.date}|${cur.shiftType}`;
  const out = new Map();
  // Считаем до текущей смены: пропуск периода могли закрыть уже после него
  const until = to > cur.date ? to : cur.date;
  rows.forEach(({ row }) => {
    clRowTimeline(row, line, from, until, idx).cells.forEach((c, key) => {
      const [date, shift] = key.split('|');
      if (date > to) return;
      const res = idx.get(`${date}|${getShiftsForDate(date)[shift]}|${row.id}`);
      let k = null;
      if (res && c.closed && res.it.status !== 'FAIL') k = null;
      else if (res) k = res.it.status;
      else if (c.s === 'miss') k = c.origin && c.origin.by === 'check' ? 'late' : 'missed';
      else if (c.s === 'todo' || c.s === 'plan') k = 'due';
      else if (c.s === 'carry' && key === curKey) k = 'debt';
      if (k) out.set(`${key}|${row.id}`, k);
    });
  });
  return out;
}
