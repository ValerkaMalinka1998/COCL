/* ============================================================
   ЯДРО: утилиты
   $, $$, showToast, escapeHtml, uid, load/save localStorage.
   Модуль общего пространства имён: функции и переменные видны
   во всех файлах. Порядок подключения — index.html.
   ============================================================ */

/* ============================================================
   УТИЛИТЫ
   ============================================================ */
/* Иконка комментария: пузырь с тремя точками.
   outline=true — контурная (для кнопок), иначе залитая янтарная (метка в тексте). */
function cmtIcon(size = 14, outline = false) {
  return `<svg class="cmt-svg${outline ? ' cmt-outline' : ''}" width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true">` +
    '<path class="cmt-bubble" d="M5 3h14a3 3 0 0 1 3 3v9a3 3 0 0 1-3 3h-7l-5 4v-4H5a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3z"/>' +
    '<circle class="cmt-dot" cx="8" cy="10.5" r="1.4"/><circle class="cmt-dot" cx="12" cy="10.5" r="1.4"/><circle class="cmt-dot" cx="16" cy="10.5" r="1.4"/></svg>';
}
/* Строка комментария: иконка + текст (текст экранируется) */
function cmtLine(text) {
  return `<span class="cmt-mark">${cmtIcon(14)}</span> ${escapeHtml(text)}`;
}

function $(sel) { return document.querySelector(sel); }
function $$(sel) { return document.querySelectorAll(sel); }

function showToast(msg, isError) {
  const t = $('#toast');
  if (!t) {
    console.warn('Toast:', msg);
    return;
  }
  t.textContent = msg;
  t.className = 'toast show' + (isError ? ' error' : '');
  setTimeout(() => { t.className = 'toast'; }, 2500);
}

function fmtDate(d) {
  const dt = new Date(d);
  const yyyy = dt.getFullYear();
  const mm = String(dt.getMonth()+1).padStart(2,'0');
  const dd = String(dt.getDate()).padStart(2,'0');
  const hh = String(dt.getHours()).padStart(2,'0');
  const mi = String(dt.getMinutes()).padStart(2,'0');
  return `${dd}.${mm}.${yyyy} ${hh}:${mi}`;
}

function uid() {
  return 'id_' + Date.now() + '_' + Math.random().toString(36).slice(2,7);
}

function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

/* Собрать относительный путь к фото */
function getPhotoPath(standard, fileName) {
  if (!standard || !fileName) return '';
  const line = standard.line || '';
  const part = standard.nodePart || '';
  if (!line || !part) return '';
  return `photos/${line}/${part}/${fileName}`;
}

/* Экранирование для атрибутов (в т.ч. путей) */
function escapeAttr(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
/* ============================================================
   ДОСТУП К ДАННЫМ
   ============================================================ */
/* Кэш чтений на время одной отрисовки (withLoadCache): каждый ключ разбирается из JSON
   один раз. Только для кода, который не меняет полученные объекты. */
let loadCache = null;
function withLoadCache(fn) {
  if (loadCache) return fn();
  loadCache = new Map();
  try { return fn(); } finally { loadCache = null; }
}
function load(key, fallback) {
  if (loadCache && loadCache.has(key)) return loadCache.get(key) ?? fallback;
  try {
    const v = JSON.parse(localStorage.getItem(key));
    if (loadCache) loadCache.set(key, v);
    return v != null ? v : fallback;
  } catch(e) { return fallback; }
}
function save(key, value) {
  // Новый объект, а не delete: сбрасывает и производные кэши (нормализованные стандарты, конфиг смен)
  if (loadCache) loadCache = new Map();
  localStorage.setItem(key, JSON.stringify(value));
}
function getOperators() { return load(STORAGE_KEYS.operators, []); }
function setOperators(v) { save(STORAGE_KEYS.operators, v); }
