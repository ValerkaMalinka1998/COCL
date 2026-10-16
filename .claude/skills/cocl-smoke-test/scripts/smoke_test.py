#!/usr/bin/env python3
"""
Смоук-тест COCL: открывает index.html через file:// в headless Chromium,
обходит все вкладки, открывает ключевые формы, пробует экспорт XLSX
и собирает ошибки JS.

Запуск (из корня репозитория):
    python3 .claude/skills/cocl-smoke-test/scripts/smoke_test.py
    python3 .claude/skills/cocl-smoke-test/scripts/smoke_test.py --line SD01 --no-seed

Код выхода: 0 — ошибок нет, 1 — есть ошибки JS или проваленные шаги.
Отчёт: smoke-report.json и скриншоты в --out (по умолчанию
<временная папка>/cocl-smoke).
"""
import argparse
import glob
import json
import os
import sys
import tempfile
import time

from playwright.sync_api import sync_playwright

TABS = ['electronic', 'toploss', 'check', 'dashboard', 'history',
        'editor', 'schedule', 'settings']

# Ключи бэкапа -> имена в STORAGE_KEYS (берутся из самой страницы).
CLOSE_ALL_MODALS_JS = """
() => {
  if (typeof modalStack !== 'undefined' && typeof closeModal === 'function') {
    let guard = 20;
    while (modalStack.length && guard--) closeModal(modalStack[modalStack.length - 1]);
  }
  document.querySelectorAll('.modal-overlay.active').forEach(m => m.classList.remove('active'));
}
"""

SEED_JS = """
([backup, line]) => {
  localStorage.clear();
  if (backup) {
    for (const [k, v] of Object.entries(backup)) {
      if (k === 'version' || k === 'exportedAt') continue;
      const key = (typeof STORAGE_KEYS !== 'undefined' && STORAGE_KEYS[k]) || null;
      if (key) localStorage.setItem(key, JSON.stringify(v));
    }
  }
  if (line) {
    for (const k of ['cl_cl_line', 'cl_editor_line', 'cl_schedule_line']) localStorage.setItem(k, line);
  }
}
"""


def default_backup(repo):
    files = sorted(glob.glob(os.path.join(repo, 'checklist_backup_*.json')))
    return files[-1] if files else None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--repo', default=os.getcwd(), help='корень проекта (где index.html)')
    ap.add_argument('--backup', help='JSON-бэкап для заполнения localStorage (по умолчанию самый свежий checklist_backup_*.json)')
    ap.add_argument('--no-seed', action='store_true', help='запуск на пустом localStorage')
    ap.add_argument('--line', default='SD12', help='линия для Чек-листа/Редактора/Расписания')
    ap.add_argument('--out', default=None, help='папка для отчёта и скриншотов')
    args = ap.parse_args()

    repo = os.path.abspath(args.repo)
    index = os.path.join(repo, 'index.html')
    if not os.path.exists(index):
        print(f'index.html не найден в {repo}')
        return 2

    # По умолчанию — во временную папку, чтобы скриншоты не попадали в репозиторий
    out = args.out or os.path.join(tempfile.gettempdir(), 'cocl-smoke')
    os.makedirs(out, exist_ok=True)

    backup = None
    backup_path = None
    if not args.no_seed:
        backup_path = args.backup or default_backup(repo)
        if backup_path:
            with open(backup_path, encoding='utf-8') as f:
                backup = json.load(f)

    errors, warnings, steps = [], [], []

    def step(name, ok, detail=''):
        steps.append({'step': name, 'ok': ok, 'detail': detail})
        print(('  OK   ' if ok else '  FAIL ') + name + (f' — {detail}' if detail else ''))

    with sync_playwright() as p:
        browser = p.chromium.launch()
        ctx = browser.new_context(viewport={'width': 1440, 'height': 900}, accept_downloads=True)
        page = ctx.new_page()
        current = {'where': 'load'}

        page.on('pageerror', lambda e: errors.append({'where': current['where'], 'type': 'pageerror', 'text': str(e)}))

        def on_console(msg):
            if msg.type == 'error':
                text = msg.text
                # Отсутствующие фото — ожидаемо: у каждого своя папка photos/
                if 'photos/' in text or 'ERR_FILE_NOT_FOUND' in text:
                    warnings.append({'where': current['where'], 'text': text})
                else:
                    errors.append({'where': current['where'], 'type': 'console', 'text': text})
            elif msg.type == 'warning':
                warnings.append({'where': current['where'], 'text': msg.text})
        page.on('console', on_console)
        page.on('requestfailed', lambda r: warnings.append({'where': current['where'], 'text': 'requestfailed ' + r.url}))

        url = 'file://' + index
        page.goto(url)
        page.wait_for_load_state('load')
        page.evaluate(SEED_JS, [backup, args.line])
        # Тот же файл с другим #хэшем не перезагружает страницу — нужен reload,
        # иначе init() отработает на пустом localStorage.
        page.goto(url + '#electronic')
        page.reload()
        page.wait_for_load_state('load')
        time.sleep(0.5)
        ready = page.evaluate("document.documentElement.getAttribute('data-app-ready')")
        step('приложение загрузилось (data-app-ready)', ready == '1', f'seed={os.path.basename(backup_path) if backup_path else "нет"}')

        # --- Обход вкладок ---
        for tab in TABS:
            current['where'] = f'tab:{tab}'
            page.evaluate(CLOSE_ALL_MODALS_JS)
            page.click(f'nav a[data-tab="{tab}"]')
            time.sleep(0.4)
            active = page.evaluate(f"!!document.querySelector('#tab-{tab}.active')")
            page.screenshot(path=os.path.join(out, f'tab-{tab}.png'))
            step(f'вкладка #{tab}', active, '' if active else 'не стала активной')

        # --- Формы ---
        current['where'] = 'tab:editor'
        page.evaluate(CLOSE_ALL_MODALS_JS)
        page.click('nav a[data-tab="editor"]')
        time.sleep(0.3)
        # Формы открываются так же, как у пользователя — кнопками редактора.
        for name, js, modal in [
            ('форма мех-стандарта (новый)',
             "switchEditorModeInline('mech'); document.querySelector('#editorMechAddBtn').click()",
             'standardFormModal'),
            ('форма E-Param (новый)',
             "switchEditorModeInline('elec'); document.querySelector('#editorElecAddBtn').click()",
             'electronicParamModal'),
            ('модалка выбора линии', 'openLinePickerModal()', 'linePickerModal'),
        ]:
            current['where'] = name
            if args.no_seed and 'E-Param' in name:
                # Без данных у линии нет машин — форма штатно не открывается (тост).
                step(name, True, 'пропущено: нет машин без данных')
                continue
            page.evaluate(CLOSE_ALL_MODALS_JS)
            try:
                page.evaluate(js)
                time.sleep(0.3)
                shown = page.evaluate(f"!!document.querySelector('#{modal}.active')")
                page.screenshot(path=os.path.join(out, f'modal-{modal}.png'))
                step(name, shown, '' if shown else f'#{modal} не открылась')
            except Exception as e:  # noqa: BLE001
                step(name, False, str(e).splitlines()[0])

        # Редактирование первого стандарта линии, если есть
        current['where'] = 'форма мех-стандарта (редактирование)'
        page.evaluate(CLOSE_ALL_MODALS_JS)
        sid = page.evaluate(f"(getStandards ? getStandards() : []).find(s => s.line === '{args.line}')?.id || null") \
            if page.evaluate("typeof getStandards === 'function'") else None
        if sid:
            try:
                page.evaluate(f"openStandardForm('{sid}')")
                time.sleep(0.3)
                shown = page.evaluate("!!document.querySelector('#standardFormModal.active')")
                step('форма мех-стандарта (редактирование)', shown)
            except Exception as e:  # noqa: BLE001
                step('форма мех-стандарта (редактирование)', False, str(e).splitlines()[0])
        else:
            step('форма мех-стандарта (редактирование)', True, f'пропущено: нет стандартов на {args.line}')

        # --- Экспорт XLSX ---
        page.evaluate(CLOSE_ALL_MODALS_JS)
        for name, js in [
            ('экспорт стандартов линии (XLSX)', 'editorExportLine()'),
            ('экспорт истории (XLSX)', "exportToXlsx(typeof getHistory === 'function' ? getHistory() : [])"),
        ]:
            current['where'] = name
            if args.no_seed and 'стандартов' in name:
                step(name, True, 'пропущено: нет стандартов без данных')
                continue
            try:
                with page.expect_download(timeout=8000) as dl:
                    page.evaluate(js)
                d = dl.value
                path = os.path.join(out, d.suggested_filename)
                d.save_as(path)
                size = os.path.getsize(path)
                step(name, size > 0, f'{d.suggested_filename}, {size} байт')
            except Exception as e:  # noqa: BLE001
                step(name, False, str(e).splitlines()[0])
            page.evaluate(CLOSE_ALL_MODALS_JS)

        browser.close()

    report = {'repo': repo, 'line': args.line, 'seed': backup_path,
              'steps': steps, 'errors': errors, 'warnings': warnings}
    with open(os.path.join(out, 'smoke-report.json'), 'w', encoding='utf-8') as f:
        json.dump(report, f, ensure_ascii=False, indent=2)

    failed = [s for s in steps if not s['ok']]
    print(f'\nШагов: {len(steps)}, провалено: {len(failed)}, ошибок JS: {len(errors)}, предупреждений: {len(warnings)}')
    for e in errors:
        print(f"  [{e['where']}] {e['type']}: {e['text']}")
    print(f'Отчёт и скриншоты: {out}')
    return 1 if (failed or errors) else 0


if __name__ == '__main__':
    sys.exit(main())
