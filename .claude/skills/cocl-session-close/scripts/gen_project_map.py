#!/usr/bin/env python3
"""
Генерирует PROJECT_MAP.md — карту проекта COCL:
  • JS-модули (порядок подключения) и их разделы с функциями;
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


def js_sections(path):
    """Строки таблицы разделов модуля: строки, раздел, функции"""
    lines = read(path)
    heads = sections(lines)
    funcs = functions(lines)
    rows = []
    # первый заголовок модуля — его шапка, разделы — следующие
    body_heads = heads[1:] if heads and heads[0][0] <= 2 else heads
    bounds = body_heads + [(len(lines) + 1, None)]
    if not body_heads or body_heads[0][0] > 12:
        bounds = [(1, '(начало модуля)')] + bounds
    for (start, title), (nxt, _) in zip(bounds, bounds[1:]):
        if title is None:
            break
        fs = [n for ln, n in funcs if start <= ln < nxt]
        if not fs:
            continue
        shown = ', '.join(f'`{n}`' for n in fs[:MAX_FUNCS_INLINE])
        if len(fs) > MAX_FUNCS_INLINE:
            shown += f' … +{len(fs) - MAX_FUNCS_INLINE}'
        rows.append(f'| {path}:{start} | {title[:60]} | {shown} |')
    return rows, len(lines), len(funcs), (heads[0][1] if heads else '')


def css_blocks(path):
    lines = read(path)
    heads = sections(lines, 'css')
    titles = [t for _, t in heads if not t.startswith('COMPONENTS')]
    shown = '; '.join(t[:40] for t in titles[:6])
    if len(titles) > 6:
        shown += f' … +{len(titles) - 6}'
    return len(lines), shown


def js_order():
    html = '\n'.join(read('index.html'))
    return [m for m in re.findall(r'<script\s+src="([^"]+)"', html) if not m.endswith('.min.js')]


def css_order():
    files = ['css/base.css', 'css/layout.css']
    files += [m for m in re.findall(r"@import url\('([^']+)'\)", '\n'.join(read('style.css')))
              if m not in files]
    return files


def storage_keys(js_files):
    keys = {}
    for path in js_files:
        text = '\n'.join(read(path))
        m = re.search(r'const STORAGE_KEYS\s*=\s*\{(.*?)\};', text, re.S)
        if m:
            for km in re.finditer(r"(\w+)\s*:\s*'([^']+)'", m.group(1)):
                keys[km.group(2)] = f'STORAGE_KEYS.{km.group(1)} ({path})'
    for path in js_files + ['index.html']:
        for i, l in enumerate(read(path)):
            for km in re.finditer(r"['\"](cl_[a-z0-9_]+)['\"]", l):
                keys.setdefault(km.group(1), f'{path}:{i + 1}')
    return sorted(keys.items())


def main():
    commit = subprocess.run(['git', 'log', '-1', '--format=%h %s'], capture_output=True, text=True, encoding='utf-8').stdout.strip()
    jsf = js_order()
    mod_rows, sec_rows = [], []
    total_lines = total_funcs = 0
    for f in jsf:
        rows, n, nf, title = js_sections(f)
        total_lines += n
        total_funcs += nf
        mod_rows.append(f'| `{f}` | {n} | {nf} | {title[:70]} |')
        sec_rows += rows
    css_rows = []
    css_total = 0
    for f in css_order():
        n, shown = css_blocks(f)
        css_total += n
        css_rows.append(f'| `{f}` | {n} | {shown} |')
    keys = storage_keys(jsf)

    out = []
    out.append('# Карта проекта COCL')
    out.append('')
    out.append(f'Сгенерировано {datetime.date.today().isoformat()} по коммиту `{commit}` скриптом '
               '`.claude/skills/cocl-session-close/scripts/gen_project_map.py` — пересоздавайте после крупных правок.')
    out.append('')
    out.append(f'JS — {len(jsf)} модулей, {total_lines} строк, {total_funcs} функций · CSS — {len(css_rows)} файлов, {css_total} строк.')
    out.append('Как искать: модуль по назначению → раздел в таблице ниже → `Grep` по имени функции в этом файле.')
    out.append('')
    out.append('## JS-модули (в порядке подключения в index.html)')
    out.append('')
    out.append('Все модули — обычные `<script>` с общим пространством имён. Код, выполняемый при загрузке, '
               'не может ссылаться на модули, подключённые позже — проверка: '
               '`node .claude/skills/cocl-review/scripts/check_load_order.js`.')
    out.append('')
    out.append('| Модуль | Строк | Функций | Назначение |')
    out.append('| --- | --- | --- | --- |')
    out += mod_rows
    out.append('')
    out.append('## JS — разделы и функции')
    out.append('')
    out.append('| Файл:строка | Раздел | Функции |')
    out.append('| --- | --- | --- |')
    out += sec_rows
    out.append('')
    out.append('## CSS (в порядке каскада)')
    out.append('')
    out.append('Точка входа `style.css`: @import в этом порядке + anti-flash + печать. Переменные темы — `css/base.css`. '
               'Порядок @import менять нельзя — от него зависит каскад.')
    out.append('')
    out.append('| Файл | Строк | Блоки |')
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
