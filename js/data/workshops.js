/* ============================================================
   ДАННЫЕ: структура производства
   Цех → Участок → Блок → Линия, линии, машины, миграции.
   Модуль общего пространства имён: функции и переменные видны
   во всех файлах. Порядок подключения — index.html.
   ============================================================ */

/* ============================================================
   СТРУКТУРА ПРОИЗВОДСТВА — доступ к данным
   ============================================================ */

/* --- Миграция: создаём структуру при первом запуске --- */
function migrateToWorkshopsStructure() {
  const existing = localStorage.getItem(STORAGE_KEYS.workshops);
  if (!existing) {
    // Первый запуск — создаём дефолтную структуру
    save(STORAGE_KEYS.workshops, DEFAULT_WORKSHOPS);
    // Удаляем старые блоки (они больше не используются)
    localStorage.removeItem(STORAGE_KEYS.blocks);
    return;
  }

  // --- Разовая миграция: переименование SMD-участков в "Cell N" ---
  const MIGRATION_KEY = 'cl_workshops_migration_smd_cell_named';
  if (localStorage.getItem(MIGRATION_KEY) === '1') return;

  try {
    const workshops = JSON.parse(existing);
    if (!Array.isArray(workshops)) return;

    // Карта переименований: только SMD-участки
    // PMD (SFG/CRT) и FMD (Cell 1/Cell 2) — без изменений
    const renameMap = {
      'smd_area1': 'Cell 1',
      'smd_area2': 'Cell 2',
      'smd_area3': 'Cell 3'
    };

    workshops.forEach(w => {
      (w.areas || []).forEach(a => {
        if (renameMap[a.id]) {
          a.name = renameMap[a.id];
        }
      });
    });

    save(STORAGE_KEYS.workshops, workshops);
    localStorage.setItem(MIGRATION_KEY, '1');
  } catch (e) {
    console.warn('Migration error:', e);
  }
}

/* --- Получить все цеха --- */
function getWorkshops() {
  migrateToWorkshopsStructure();
  const raw = load(STORAGE_KEYS.workshops, null);
  if (!Array.isArray(raw) || !raw.length) {
    return JSON.parse(JSON.stringify(DEFAULT_WORKSHOPS));
  }
  return raw;
}
function setWorkshops(v) {
  save(STORAGE_KEYS.workshops, v);
}

/* --- Найти цех по id --- */
function getWorkshop(workshopId) {
  return getWorkshops().find(w => w.id === workshopId) || null;
}

/* --- Название цеха по id (пусто → «все цеха») --- */
function getWorkshopName(workshopId) {
  if (!workshopId) return '';
  const w = getWorkshop(workshopId);
  return w ? w.name : workshopId;
}

/* --- Найти, к какому цеху/участку/блоку относится линия --- */
function getBlockForLine(line) {
  for (const w of getWorkshops()) {
    for (const a of (w.areas || [])) {
      if (Array.isArray(a.blocks)) {
        for (const b of a.blocks) {
          if (Array.isArray(b.lines) && b.lines.includes(line)) {
            return { workshop: w, area: a, block: b };
          }
        }
      } else if (Array.isArray(a.lines) && a.lines.includes(line)) {
        return { workshop: w, area: a, block: null };
      }
    }
  }
  return null;
}

/* Получить ID цеха по линии */
function getWorkshopIdForLine(line) {
  if (!line) return null;
  const ctx = typeof getBlockForLine === 'function' ? getBlockForLine(line) : null;
  return ctx ? ctx.workshop.id : null;
}

/* --- Плоский список всех линий с контекстом --- */
function getAllLinesWithContext() {
  const result = [];
  getWorkshops().forEach(w => {
    (w.areas || []).forEach(a => {
      if (Array.isArray(a.blocks)) {
        a.blocks.forEach(b => {
          (b.lines || []).forEach(l => result.push({
            line: l,
            workshopId: w.id, workshopName: w.name,
            areaId: a.id, areaName: a.name,
            blockId: b.id, blockName: b.name
          }));
        });
      } else if (Array.isArray(a.lines)) {
        a.lines.forEach(l => result.push({
          line: l,
          workshopId: w.id, workshopName: w.name,
          areaId: a.id, areaName: a.name,
          blockId: null, blockName: null
        }));
      }
    });
  });
  return result;
}

/* ============================================================
   ОБРАТНАЯ СОВМЕСТИМОСТЬ
   Старые функции возвращают упрощённые данные,
   чтобы не ломать существующий код (дашборд, фильтры, редактор).
   ============================================================ */

/* --- Плоский список кодов всех линий (для селектов, фильтров) --- */
function getLines() {
  const all = getAllLinesWithContext();
  // Уникальные коды линий (на случай дублирования)
  const seen = new Set();
  const result = [];
  all.forEach(x => {
    if (!seen.has(x.line)) {
      seen.add(x.line);
      result.push(x.line);
    }
  });
  return result;
}

/* Часть линии (Maker / Packer) машины — только SMD; нет записи = машина общая, видна в обеих частях */
function getLineMachineParts() { return load(STORAGE_KEYS.lineMachineParts, {}); }
function getMachinePart(line, machine) { return (getLineMachineParts()[line] || {})[machine] || ''; }
function setMachinePart(line, machine, part) {
  const all = getLineMachineParts();
  const m = all[line] || (all[line] = {});
  if (part) m[machine] = part; else delete m[machine];
  save(STORAGE_KEYS.lineMachineParts, all);
}

/* Машины для линий */
function getLineMachines() {
  return load(STORAGE_KEYS.lineMachines, {...DEFAULT_LINE_MACHINES});
}

/* ============================================================
   Часть линии (Maker / Packer) есть только у линий SMD.
   В PMD и FMD её нет: поле скрыто, фильтр по части не действует.
   ============================================================ */
function lineHasParts(line) {
  return !!line && getWorkshopIdForLine(line) === 'smd';
}
/* Фильтр по части для линии: у PMD / FMD всегда «все»; у SMD — Maker или Packer (проверяют разные операторы) */
function linePartFilter(line, part) {
  return lineHasParts(line) ? (part === 'Packer' ? 'Packer' : 'Maker') : '';
}
