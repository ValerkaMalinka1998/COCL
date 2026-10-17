/* ============================================================
   НАСТРОЙКИ: хранилище и проверка фото
   Модуль общего пространства имён: функции и переменные видны
   во всех файлах. Порядок подключения — index.html.
   ============================================================ */

/* ============================================================
   КАРТОЧКА «ХРАНИЛИЩЕ ФОТО»
   ============================================================ */
function renderPhotoStorageSettings() {
  const standards = getStandards();

  // Стандарты, у которых есть хотя бы одно фото
  const standardsWithPhotos = standards.filter(s =>
    Array.isArray(s.photos) && s.photos.length > 0
  ).length;

  // Всего фото (сумма по всем стандартам)
  const totalPhotos = standards.reduce((sum, s) => {
    return sum + (Array.isArray(s.photos) ? s.photos.length : 0);
  }, 0);

  const statsStandards = $('#photoStatsStandards');
  const statsTotal = $('#photoStatsTotal');
  if (statsStandards) statsStandards.textContent = standardsWithPhotos;
  if (statsTotal) statsTotal.textContent = totalPhotos;
}
/* ============================================================
   ПРОВЕРКА ФОТОГРАФИЙ НА БИТЫЕ ССЫЛКИ
   ============================================================ */

/* Проверить, доступен ли файл по пути */
function checkPhotoExists(path) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload  = () => resolve({ path, ok: true });
    img.onerror = () => resolve({ path, ok: false });
    img.src = path;
  });
}

/* Запустить проверку всех фото */
async function runPhotosCheck() {
  const standards = getStandards();

  // Собираем список всех фото для проверки
  const allPhotos = [];
  standards.forEach(st => {
    if (!Array.isArray(st.photos) || !st.photos.length) return;
    st.photos.forEach(name => {
      const path = getPhotoPath(st, name);
      if (path) {
        allPhotos.push({
          path,
          name,
          standardId: st.id,
          line: st.line || '—',
          part: st.nodePart || '—',
          oplNumber: st.oplNumber || '—',
          title: st.title || '—'
        });
      }
    });
  });

  if (!allPhotos.length) {
    return {
      total: 0,
      ok: 0,
      fail: 0,
      broken: []
    };
  }

  // Проверяем пакетами (по 10 одновременно)
  const BATCH_SIZE = 10;
  const results = [];

  for (let i = 0; i < allPhotos.length; i += BATCH_SIZE) {
    const batch = allPhotos.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map(info => checkPhotoExists(info.path).then(r => ({ ...info, ok: r.ok })))
    );
    results.push(...batchResults);
  }

  const broken = results.filter(r => !r.ok);
  return {
    total: results.length,
    ok: results.length - broken.length,
    fail: broken.length,
    broken
  };
}

/* Показать результат проверки в модалке */
function renderPhotosCheckResult(result) {
  const body = $('#checkPhotosModalBody');
  if (!body) return;

  let html = `
    <div class="cp-summary">
      <div class="cp-stat cp-stat-total">
        <div class="cp-stat-value">${result.total}</div>
        <div class="cp-stat-label">Всего проверено</div>
      </div>
      <div class="cp-stat cp-stat-ok">
        <div class="cp-stat-value">${result.ok}</div>
        <div class="cp-stat-label">Найдено</div>
      </div>
      <div class="cp-stat cp-stat-fail">
        <div class="cp-stat-value">${result.fail}</div>
        <div class="cp-stat-label">Битых ссылок</div>
      </div>
    </div>
  `;

  if (!result.total) {
    html += `
      <div class="cp-empty">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="16" x2="12" y2="12"/>
          <line x1="12" y1="8" x2="12.01" y2="8"/>
        </svg>
        <div>В стандартах пока нет ни одной фотографии.</div>
      </div>
    `;
  } else if (!result.fail) {
    html += `
      <div class="cp-empty">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
          <polyline points="22 4 12 14.01 9 11.01"/>
        </svg>
        <div>Все ${result.total} ${result.total === 1 ? 'файл' : 'файлов'} на месте.</div>
      </div>
    `;
  } else {
    html += `<div class="cp-section-title">Битые ссылки (${result.fail})</div>`;
    html += '<div class="cp-list">';
    result.broken.forEach(b => {
      html += `
        <div class="cp-item">
          <div class="cp-item-file">${escapeHtml(b.path)}</div>
          <div class="cp-item-meta">
            <span><strong>Линия:</strong> ${escapeHtml(b.line)}</span>
            <span><strong>OPL №:</strong> ${escapeHtml(b.oplNumber)}</span>
            <span><strong>Часть:</strong> ${escapeHtml(b.part)}</span>
          </div>
          <div class="cp-item-meta">
            <span><strong>Название:</strong> ${escapeHtml(b.title)}</span>
          </div>
        </div>
      `;
    });
    html += '</div>';
  }

  body.innerHTML = html;
}

/* Сформировать текст отчёта для копирования */
function buildPhotosCheckReport(result) {
  const lines = [];
  lines.push('Проверка фотографий — отчёт');
  lines.push('Дата: ' + fmtDate(new Date()));
  lines.push('');
  lines.push('Всего проверено: ' + result.total);
  lines.push('Найдено: ' + result.ok);
  lines.push('Битых ссылок: ' + result.fail);
  lines.push('');

  if (result.fail > 0) {
    lines.push('=== Битые ссылки ===');
    result.broken.forEach(b => {
      lines.push(`[${b.line}] ${b.oplNumber} — ${b.path}`);
    });
  }

  return lines.join('\n');
}

/* --- Обработчики модалки проверки --- */
let lastPhotosCheckResult = null;

$('#checkPhotosBtn')?.addEventListener('click', async () => {
  const modal = $('#checkPhotosModal');
  const body = $('#checkPhotosModalBody');
  if (!modal || !body) return;

  body.innerHTML = '<div class="cp-empty">Проверка…</div>';
  openModal(modal);

  try {
    const result = await runPhotosCheck();
    lastPhotosCheckResult = result;

    // Сохраняем количество битых ссылок для бейджа в sidebar
    localStorage.setItem('cl_photos_broken_count', String(result.fail));
    updateNavSettingsBadge();

    renderPhotosCheckResult(result);
  } catch (e) {
    console.error(e);
    body.innerHTML = '<div class="cp-empty" style="color:var(--accent-red)">Ошибка при проверке: ' + escapeHtml(e.message) + '</div>';
  }
});

function closePhotosCheckModal() {
  closeModal('#checkPhotosModal');
}

$('#checkPhotosModalClose')?.addEventListener('click', closePhotosCheckModal);
$('#checkPhotosCloseBtn')?.addEventListener('click', closePhotosCheckModal);
$('#checkPhotosModal')?.addEventListener('click', (e) => {
  if (e.target.id === 'checkPhotosModal') closePhotosCheckModal();
});

/* Копирование отчёта */
$('#checkPhotosCopyBtn')?.addEventListener('click', () => {
  if (!lastPhotosCheckResult) return showToast('Сначала запустите проверку', true);
  const text = buildPhotosCheckReport(lastPhotosCheckResult);
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text)
      .then(() => showToast('Отчёт скопирован'))
      .catch(() => fallbackCopy(text));
  } else {
    fallbackCopy(text);
  }
});
/* ============================================================
   ХРАНИЛИЩЕ ФОТО — обработчики
   ============================================================ */
$('#copyPhotoPathBtn')?.addEventListener('click', () => {
  const text = 'photos/';

  // Современный Clipboard API
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text)
      .then(() => showToast('Путь скопирован: ' + text))
      .catch(() => fallbackCopy(text));
  } else {
    fallbackCopy(text);
  }
});

/* Резервный способ копирования (для file:// и старых браузеров) */
function fallbackCopy(text) {
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    if (ok) {
      showToast('Путь скопирован: ' + text);
    } else {
      showToast('Не удалось скопировать. Скопируйте вручную: ' + text, true);
    }
  } catch (e) {
    showToast('Не удалось скопировать. Скопируйте вручную: ' + text, true);
  }
}
/* Бэкап */
$('#backupDownloadBtn').addEventListener('click', () => {
const backup = {
  version: 4,
  exportedAt: new Date().toISOString(),
  standards: getStandards(),
  history: getHistory(),
  nodes: getNodes(),
  workshops: getWorkshops(),   // ← НОВОЕ
  shifts: getShifts(),
  brands: getBrands(),
  brandWorkshops: getBrandWorkshops(),
  lineBrands: getLineBrands(),
  operators: getOperators(),
  lineMachines: getLineMachines(),
  topLosses: getTopLosses(),
  electronicParams: getElectronicParams(),
  electronicShiftCfg: getElectronicShiftConfig(),
  electronicBrandSchedule: getElectronicBrandSchedule()
};
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json;charset=utf-8' });
  const ts = new Date().toISOString().slice(0,19).replace(/[:T]/g,'-');
  downloadBlob(blob, 'checklist_backup_' + ts + '.json');
  showToast('Бэкап скачан');
});

$('#backupUploadBtn').addEventListener('click', () => {
  $('#backupFileInput').click();
});

$('#backupFileInput').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    try {
      const data = JSON.parse(ev.target.result);
      if (!confirm('Загрузить бэкап? Текущие данные будут ЗАМЕНЕНЫ.')) return;

      if (Array.isArray(data.standards)) setStandards(data.standards);
      if (Array.isArray(data.history)) setHistory(data.history);
      if (Array.isArray(data.nodes)) setNodes(data.nodes);
      if (Array.isArray(data.lines)) setLines(data.lines);
      if (Array.isArray(data.brands)) setBrands(data.brands);
      if (data.brandWorkshops && typeof data.brandWorkshops === 'object') setBrandWorkshops(data.brandWorkshops);
      if (data.lineBrands && typeof data.lineBrands === 'object') setLineBrands(data.lineBrands);
      if (Array.isArray(data.operators)) setOperators(data.operators);
      if (Array.isArray(data.workshops)) setWorkshops(data.workshops);
      if (data.lineMachines && typeof data.lineMachines === 'object') setLineMachines(data.lineMachines);
      if (Array.isArray(data.topLosses)) setTopLosses(data.topLosses);
      if (Array.isArray(data.electronicParams)) setElectronicParams(data.electronicParams);
      if (data.electronicShiftCfg && typeof data.electronicShiftCfg === 'object') setElectronicShiftConfig(data.electronicShiftCfg);
      if (data.electronicBrandSchedule && typeof data.electronicBrandSchedule === 'object') setElectronicBrandSchedule(data.electronicBrandSchedule);
      init();
      showToast('Бэкап загружен');
    } catch (err) {
      showToast('Ошибка: файл повреждён или не является бэкапом', true);
    }
  };
  reader.readAsText(file);
  e.target.value = '';
});

$('#resetAllBtn').addEventListener('click', () => {
  if (!confirm('СБРОСИТЬ ВСЕ ДАННЫЕ? Стандарты, история, узлы, настройки — всё будет удалено безвозвратно.')) return;
  if (!confirm('Вы точно уверены? Рекомендуется сначала скачать бэкап.')) return;
  Object.values(STORAGE_KEYS).forEach(k => localStorage.removeItem(k));
  localStorage.removeItem('cl_photos_broken_count');
  init();
  showToast('Все данные сброшены');
});
