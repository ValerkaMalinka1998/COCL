#!/usr/bin/env python3
"""
Генерирует PROJECT_MAP.md — карту проекта COCL:
  • разделы app.js и router.js: строки + функции раздела;
  • разделы CSS: файл, строки, за что отвечают;
  • ключи localStorage и где они объявлены.

Запуск из корня репозитория:
    python3 .claude/skills/cocl-session-close/scripts/gen_project_map.py

Карта строится по заголовкам-комментариям в коде, поэтому новые разделы
появляются в ней сами. Если раздел слишком крупный — разбейте его
заголовком /* === НАЗВАНИЕ === */ в коде.
"""
import datetime
import os
import re
import subprocess

ROOT = os.getcwd()
OUT = os.path.join(ROOT, 'PROJECT_MAP.md')
MAX_FUNCS_INLINE = 14   # сколько имён функций показывать в строке раздела


def read(path):
    with open(os.path.join(ROOT, path), encoding='utf-8') as f:
        return f.read().split('\n')


def sections(lines, kind='js'):
    """Заголовки вида /* ====\n   ТЕКСТ  и  /* === ТЕКСТ === */"""
    heads = []
    for i, l in enumerate(lines):
        if re.match(r'^/\* =+\s*$', l.rstrip()) and i + 1 < len(lines):
            t = lines[i + 1].strip()
            if t and not t.startswith('=') and not t.startswith('*/'):
                heads.append((i + 1, t))
                continue
        m = re.match(r'^/\* =+ (.+?) =*\s*\*/', l)
        if m and m.group(1).strip():
            heads.append((i + 1, m.group(1).strip()))
    # убираем дубли (оба формата на соседних строках)
    out = []
    for ln, t in heads:
        t = re.sub(r'\s+', ' ', t).strip(' =')
        if out and out[-1][1] == t and ln - out[-1][0] < 4:
            continue
        out.append((ln, t))
    return out


def functions(lines):
    res = []
    for i, l in enumerate(lines):
        m = re.match(r'^(?:async\s+)?function\s+([A-Za-z0-9_$]+)\s*\(', l)
        if not m:
            m = re.match(r'^window\.([A-Za-z0-9_$]+)\s*=\s*(?:async\s+)?function', l)
        if m:
            res.append((i + 1, m.group(1)))
    return res


def js_map(path):
    lines = read(path)
    heads = sections(lines)
    funcs = functions(lines)
    rows = []
    bounds = heads + [(len(lines) + 1, None)]
    if not heads or heads[0][0] > 1:
        bounds = [(1, '(начало файла)')] + bounds
    for (start, title), (nxt, _) in zip(bounds, bounds[1:]):
        if title is None:
            break
        fs = [n for ln, n in funcs if start <= ln < nxt]
        if not fs and nxt - start < 15:
            continue
        shown = ', '.join(f'`{n}`' for n in fs[:MAX_FUNCS_INLINE])
        if len(fs) > MAX_FUNCS_INLINE:
            shown += f' … +{len(fs) - MAX_FUNCS_INLINE}'
        rows.append(f'| {start}–{nxt - 1} | {title[:70]} | {shown or "—"} |')
    return rows, len(lines), len(funcs)


def css_map(path):
    lines = read(path)
    heads = sections(lines, 'css')
    rows = []
    bounds = heads + [(len(lines) + 1, None)]
    for (start, title), (nxt, _) in zip(bounds, bounds[1:]):
        if title is None or nxt - start < 70:
            continue
        rows.append(f'| {path} | {start}–{nxt - 1} | {title[:80]} |')
    return rows, len(lines)


def storage_keys():
    lines = read('app.js')
    text = '\n'.join(lines)
    keys = {}
    m = re.search(r'const STORAGE_KEYS\s*=\s*\{(.*?)\};', text, re.S)
    if m:
        for km in re.finditer(r"(\w+)\s*:\s*'([^']+)'", m.group(1)):
            keys[km.group(2)] = f'STORAGE_KEYS.{km.group(1)}'
    for path in ['app.js', 'js/router.js', 'index.html']:
        for i, l in enumerate(read(path)):
            for km in re.finditer(r"['\"](cl_[a-z0-9_]+)['\"]", l):
                k = km.group(1)
                keys.setdefault(k, f'{path}:{i + 1}')
    return sorted(keys.items())


def main():
    commit = subprocess.run(['git', 'log', '-1', '--format=%h %s'], capture_output=True, text=True).stdout.strip()
    app_rows, app_len, app_funcs = js_map('app.js')
    router_rows, router_len, router_funcs = js_map('js/router.js')
    css_rows = []
    css_total = 0
    for p in ['css/base.css', 'css/layout.css', 'css/components.css']:
        r, n = css_map(p)
        css_rows += r
        css_total += n
    keys = storage_keys()

    out = []
    out.append('# Карта проекта COCL')
    out.append('')
    out.append(f'Сгенерировано {datetime.date.today().isoformat()} по коммиту `{commit}` скриптом '
               '`.claude/skills/cocl-session-close/scripts/gen_project_map.py`. '
               'Номера строк сдвигаются после правок — пересоздайте карту после крупных изменений.')
    out.append('')
    out.append(f'app.js — {app_len} строк, {app_funcs} функций · router.js — {router_len} строк · CSS — {css_total} строк.')
    out.append('Как искать: найдите раздел по смыслу, затем `Grep` по имени функции внутри указанного диапазона строк.')
    out.append('')
    out.append('## app.js — разделы и функции')
    out.append('')
    out.append('| Строки | Раздел | Функции |')
    out.append('| --- | --- | --- |')
    out += app_rows
    out.append('')
    out.append('## js/router.js')
    out.append('')
    out.append('| Строки | Раздел | Функции |')
    out.append('| --- | --- | --- |')
    out += router_rows or [f'| 1–{router_len} | Роутер вкладок | `switchTab`, `initRouter` |']
    out.append('')
    out.append('## CSS — блоки')
    out.append('')
    out.append('Точка входа `style.css` (@import + anti-flash + печать). Переменные темы — `css/base.css`.')
    out.append('')
    out.append('| Файл | Строки | Блок |')
    out.append('| --- | --- | --- |')
    out += css_rows
    out.append('')
    out.append('## Ключи localStorage')
    out.append('')
    out.append('| Ключ | Где объявлен |')
    out.append('| --- | --- |')
    out += [f'| `{k}` | {v} |' for k, v in keys]
    out.append('')
    with open(OUT, 'w', encoding='utf-8') as f:
        f.write('\n'.join(out))
    print(f'PROJECT_MAP.md: {len(out)} строк')


if __name__ == '__main__':
    main()
