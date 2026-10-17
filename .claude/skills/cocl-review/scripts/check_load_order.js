#!/usr/bin/env node
/*
  Проверка порядка подключения JS-модулей COCL.

  Все модули — обычные <script> с общим глобальным пространством имён.
  Функция, объявленная в модуле, доступна другим модулям только ПОСЛЕ того,
  как этот модуль загрузился. Поэтому код, который выполняется сразу при
  загрузке (addEventListener(..., имяФункции), вызовы на верхнем уровне,
  const x = f()), не должен ссылаться на функции и переменные из модулей,
  подключённых в index.html позже. Колбэки и тела функций — можно.

  Запуск из корня репозитория:  node .claude/skills/cocl-review/scripts/check_load_order.js
  Код выхода 1 — найдены проблемы (список в выводе).
*/
const fs = require('fs');
const path = require('path');

function requireAny(name) {
  for (const base of ['', '/opt/npm-tools/node_modules/', '/opt/node-tools/node_modules/']) {
    try { return require(base + name); } catch (e) { /* следующий */ }
  }
  console.log(`Нет пакета ${name}: npm i ${name} (или запустите в среде Claude)`);
  process.exit(2);
}
const acorn = requireAny('acorn');

const ROOT = process.cwd();
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const files = [...html.matchAll(/<script\s+src="([^"]+)"/g)]
  .map(m => m[1])
  .filter(f => !f.endsWith('.min.js'));

const units = [];
files.forEach((file, fi) => {
  const src = fs.readFileSync(path.join(ROOT, file), 'utf8');
  let ast;
  try {
    ast = acorn.parse(src, { ecmaVersion: 'latest', sourceType: 'script', locations: true });
  } catch (e) {
    console.log(`${file}: ошибка синтаксиса — ${e.message}`);
    process.exit(1);
  }
  ast.body.forEach(node => units.push({ file, fi, node }));
});
units.forEach((u, k) => { u.exec = k; });

function declared(node) {
  const out = [];
  if (node.type === 'FunctionDeclaration') out.push({ name: node.id.name, kind: 'function' });
  if (node.type === 'ClassDeclaration') out.push({ name: node.id.name, kind: 'let' });
  if (node.type === 'VariableDeclaration') {
    const add = (p) => {
      if (!p) return;
      if (p.type === 'Identifier') out.push({ name: p.name, kind: node.kind });
      else if (p.type === 'ObjectPattern') p.properties.forEach(pp => add(pp.value || pp.argument));
      else if (p.type === 'ArrayPattern') p.elements.forEach(add);
    };
    node.declarations.forEach(d => add(d.id));
  }
  if (node.type === 'ExpressionStatement' && node.expression.type === 'AssignmentExpression') {
    const l = node.expression.left;
    if (l.type === 'MemberExpression' && l.object.name === 'window' && !l.computed) {
      out.push({ name: l.property.name, kind: 'window' });
    }
  }
  return out;
}

// Идентификаторы, вычисляемые сразу (без захода в тела функций), и вызываемые функции
function eagerRefs(root) {
  const ids = new Set();
  const callees = new Set();
  const visit = (n) => {
    if (!n || typeof n.type !== 'string') return;
    switch (n.type) {
      case 'Identifier': ids.add(n.name); return;
      case 'MemberExpression':
        visit(n.object);
        if (n.computed) visit(n.property);
        return;
      case 'Property':
        if (n.computed) visit(n.key);
        visit(n.value);
        return;
      case 'CallExpression':
        if (n.callee.type === 'Identifier') callees.add(n.callee.name);
        break;
      case 'FunctionDeclaration':
      case 'FunctionExpression':
      case 'ArrowFunctionExpression':
        return;
    }
    for (const k of Object.keys(n)) {
      if (k === 'loc' || k === 'start' || k === 'end') continue;
      const v = n[k];
      if (Array.isArray(v)) v.forEach(visit);
      else if (v && typeof v.type === 'string') visit(v);
    }
  };
  visit(root);
  return { ids, callees };
}

const declOf = {};
const fnUnit = {};
units.forEach(u => {
  u.decl = declared(u.node);
  u.decl.forEach(d => { (declOf[d.name] = declOf[d.name] || []).push({ u, kind: d.kind }); });
  if (u.node.type === 'FunctionDeclaration') fnUnit[u.node.id.name] = u;
});

function availableAt(name, u) {
  const ds = declOf[name];
  if (!ds) return true;
  return ds.some(({ u: du, kind }) => kind === 'function' ? du.fi <= u.fi : (du.exec < u.exec || du === u));
}

const problems = new Set();
units.forEach(u => {
  if (u.node.type === 'FunctionDeclaration') return;
  const { ids, callees } = eagerRefs(u.node);
  const need = new Set(ids);
  const seen = new Set();
  const stack = [...callees];
  while (stack.length) {
    const f = stack.pop();
    if (seen.has(f) || !fnUnit[f]) continue;
    seen.add(f);
    const r = eagerRefs(fnUnit[f].node.body);
    r.ids.forEach(x => need.add(x));
    r.callees.forEach(x => stack.push(x));
  }
  need.forEach(name => {
    if (availableAt(name, u)) return;
    const where = declOf[name].map(d => `${d.u.file}:${d.u.node.loc.start.line}`).join(', ');
    problems.add(`${u.file}:${u.node.loc.start.line} при загрузке использует «${name}», а он объявлен позже — ${where}`);
  });
});

// Одноимённые функции верхнего уровня в разных модулях перекрывают друг друга
const dupes = Object.entries(declOf)
  .filter(([, ds]) => ds.filter(d => d.kind === 'function').length > 1)
  .map(([n, ds]) => `функция «${n}» объявлена несколько раз: ` +
    ds.filter(d => d.kind === 'function').map(d => `${d.u.file}:${d.u.node.loc.start.line}`).join(', '));
dupes.forEach(d => problems.add(d));

if (problems.size) {
  console.log([...problems].join('\n'));
  console.log('\nИсправление: перенесите функцию в модуль, который подключается раньше, ' +
    'или оберните ссылку в колбэк (() => f()).');
  process.exit(1);
}
console.log(`Порядок загрузки в порядке: ${files.length} модулей`);
