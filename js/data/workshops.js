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

/* --- HTML-опции цехов для селекта (первый — «все цеха») --- */
function workshopOptionsHtml(selected) {
  return ['<option value="">— все цеха —</option>']
    .concat(getWorkshops().map(w =>
      `<option value="${escapeAttr(w.id)}"${w.id === selected ? ' selected' : ''}>${escapeHtml(w.name)}</option>`
    )).join('');
}

/* --- Найти участок по id (поиск по всем цехам) --- */
function getArea(areaId) {
  for (const w of getWorkshops()) {
    const a = (w.areas || []).find(x => x.id === areaId);
    if (a) return { workshop: w, area: a };
  }
  return null;
}

/* --- Найти блок по id (поиск по всем цехам/участкам) --- */
function getBlock(blockId) {
  for (const w of getWorkshops()) {
    for (const a of (w.areas || [])) {
      if (Array.isArray(a.blocks)) {
        const b = a.blocks.find(x => x.id === blockId);
        if (b) return { workshop: w, area: a, block: b };
      }
    }
  }
  return null;
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
function setLines(v) {
  // Сеттер больше не нужен — линии задаются в структуре производства.
  // Оставлен для совместимости со старыми вызовами (бэкап).
  console.warn('setLines() устарел — линии редактируются через getWorkshops().');
}

/* --- Плоский список всех блоков (с контекстом цеха/участка) --- */
function getBlocks() {
  const result = [];
  getWorkshops().forEach(w => {
    (w.areas || []).forEach(a => {
      if (Array.isArray(a.blocks)) {
        a.blocks.forEach(b => {
          result.push({
            id: b.id,
            name: b.name,
            lines: b.lines || [],
            workshopId: w.id,
            workshopName: w.name,
            areaId: a.id,
            areaName: a.name
          });
        });
      }
    });
  });
  return result;
}
function setBlocks(v) {
  console.warn('setBlocks() устарел — блоки редактируются через getWorkshops().');
}

/* --- Плоский список всех участков --- */
function getAllAreas() {
  const result = [];
  getWorkshops().forEach(w => {
    (w.areas || []).forEach(a => {
      result.push({
        id: a.id,
        name: a.name,
        workshopId: w.id,
        workshopName: w.name,
        hasBlocks: Array.isArray(a.blocks) && a.blocks.length > 0,
        linesCount: Array.isArray(a.blocks)
          ? a.blocks.reduce((sum, b) => sum + (b.lines || []).length, 0)
          : (a.lines || []).length
      });
    });
  });
  return result;
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
