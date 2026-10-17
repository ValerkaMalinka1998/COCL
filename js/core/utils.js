/* ============================================================
   ЯДРО: утилиты
   $, $$, showToast, escapeHtml, uid, load/save localStorage.
   Модуль общего пространства имён: функции и переменные видны
   во всех файлах. Порядок подключения — index.html.
   ============================================================ */

/* ============================================================
   УТИЛИТЫ
   ============================================================ */
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
function nowStr() { return new Date().toLocaleString('ru-RU'); }

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
function load(key, fallback) {
  try {
    const v = JSON.parse(localStorage.getItem(key));
    return v != null ? v : fallback;
  } catch(e) { return fallback; }
}
function save(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}
function getOperators() { return load(STORAGE_KEYS.operators, []); }
function setOperators(v) { save(STORAGE_KEYS.operators, v); }
