#!/usr/bin/env python3
"""
Механические проверки правки COCL по правилам CLAUDE.md.
Сравнивает рабочее дерево с базой (по умолчанию origin/main) и ищет то,
что легко проверить скриптом. Смысловое ревью всё равно нужно — см. SKILL.md.

    python3 .claude/skills/cocl-review/scripts/review_checks.py [--base origin/main]
"""
import argparse
import re
import subprocess
import sys

FUNC_RE = re.compile(r'^\s*(?:async\s+)?function\s+([A-Za-z0-9_$]+)\s*\(', re.M)
TOP_FUNC_RE = re.compile(r'^(?:async\s+)?function\s+([A-Za-z0-9_$]+)\s*\(', re.M)
HEX_RE = re.compile(r'#[0-9a-fA-F]{3,8}\b')


def git(*args):
    return subprocess.run(['git', *args], capture_output=True, text=True).stdout


def show(base, path):
    # bytes + decode: text=True превратил бы CRLF в LF и спрятал смену переводов строк
    out = subprocess.run(['git', 'show', f'{base}:{path}'], capture_output=True).stdout
    return out.decode('utf-8', errors='replace')


def read(path):
    try:
        with open(path, encoding='utf-8', newline='') as f:
            return f.read()
    except FileNotFoundError:
        return ''


def added_lines(base, path):
    diff = git('diff', '--ignore-cr-at-eol', base, '--', path)
    return [l[1:] for l in diff.splitlines() if l.startswith('+') and not l.startswith('+++')]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--base', default='origin/main')
    args = ap.parse_args()
    base = args.base

    changed = [p for p in git('diff', '--name-only', base).split() if p]
    if not changed:
        print('Изменений относительно', base, 'нет.')
        return 0
    print('Изменённые файлы:', ', '.join(changed))

    issues, notes = [], []
    app_old, app_new = show(base, 'app.js'), read('app.js')
    html_new, router_new = read('index.html'), read('js/router.js')
    everything = app_new + html_new + router_new

    # 1. Удалённые функции, на которые ещё есть ссылки
    old_funcs = set(FUNC_RE.findall(app_old)) | set(FUNC_RE.findall(show(base, 'js/router.js')))
    new_funcs = set(FUNC_RE.findall(app_new)) | set(FUNC_RE.findall(router_new))
    for name in sorted(old_funcs - new_funcs):
        refs = len(re.findall(r'\b' + re.escape(name) + r'\b', everything))
        if refs:
            issues.append(f'функция {name} удалена, но упоминается ещё {refs} раз(а)')
        else:
            notes.append(f'функция {name} удалена, ссылок не осталось — ок')

    # 2. Новые функции верхнего уровня, объявленные дважды
    top = TOP_FUNC_RE.findall(app_new)
    old_top = TOP_FUNC_RE.findall(app_old)
    for name in sorted({n for n in top if top.count(n) > 1 and old_top.count(n) <= 1}):
        issues.append(f'функция верхнего уровня {name} объявлена {top.count(name)} раза — второе объявление перекрывает первое')

    # 3. Новые функции без вызовов (мёртвый код)
    for name in sorted(new_funcs - old_funcs):
        refs = len(re.findall(r'\b' + re.escape(name) + r'\b', everything))
        if refs <= 1:
            issues.append(f'новая функция {name} нигде не вызывается')

    # 4–5. Шаблоны, которых не должно прибавляться. Сравниваем количество в
    # старой и новой версии, а не строки diff: так проверка не зависит от
    # перевода строк и не ругается на уже существующий код (сам openModal).
    patterns = [
        (r"[Mm]odal[^\n]*classList\.(?:add|remove|toggle)\(\s*['\"]active",
         'модалка переключается через classList.add/remove(\'active\') вместо openModal/closeModal'),
        (r'console\.log\(', 'console.log в коде'),
    ]
    for rx, label in patterns:
        before = len(re.findall(rx, app_old + show(base, 'js/router.js')))
        after = len(re.findall(rx, app_new + router_new))
        if after > before:
            issues.append(f'{label}: было {before}, стало {after}')

    # Перевод строк: файлы проекта в CRLF, переписанный в LF файл даёт diff на весь файл
    for path in changed:
        old = show(base, path)
        new = read(path)
        if old and new and '\r\n' in old and '\r\n' not in new:
            issues.append(f'{path}: переводы строк сменились с CRLF на LF — diff будет на весь файл')

    # 6. STORAGE_KEYS изменён
    sk_old = re.search(r'const STORAGE_KEYS\s*=\s*\{.*?\};', app_old, re.S)
    sk_new = re.search(r'const STORAGE_KEYS\s*=\s*\{.*?\};', app_new, re.S)
    if sk_old and sk_new and sk_old.group(0).replace('\r', '') != sk_new.group(0).replace('\r', ''):
        issues.append('STORAGE_KEYS изменён — нужна миграция существующих данных пользователей (проверь вручную)')

    # 7. Голые hex-цвета в новом CSS (должны быть CSS-переменные)
    for path in [p for p in changed if p.endswith('.css') and p != 'css/base.css']:
        for l in added_lines(base, path):
            if HEX_RE.search(l) and 'var(' not in l and not l.strip().startswith('--'):
                issues.append(f'{path}: цвет без CSS-переменной: {l.strip()[:100]}')

    # 8. Удалённые id из index.html, которые ещё используются в JS
    old_ids = set(re.findall(r'id="([^"]+)"', show(base, 'index.html')))
    new_ids = set(re.findall(r'id="([^"]+)"', html_new))
    for i in sorted(old_ids - new_ids):
        if re.search(r"['\"#]" + re.escape(i) + r"['\"]", app_new + router_new):
            issues.append(f'id "{i}" удалён из index.html, но используется в JS')

    # 9. timeWindows при сохранении расписания
    for fn in ('saveMechSchedule', 'saveElecSchedule'):
        m = re.search(r'function ' + fn + r'\s*\(.*?\n\}', app_new, re.S)
        if m and 'timeWindows' not in m.group(0):
            issues.append(f'{fn} не сохраняет frequency.timeWindows — окна проверки потеряются')

    print()
    for n in notes:
        print('  ·', n)
    if issues:
        print(f'\nНайдено замечаний: {len(issues)}')
        for i in issues:
            print('  ✕', i)
        return 1
    print('\nМеханических замечаний нет.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
