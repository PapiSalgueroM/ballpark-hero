#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

/*
 * This is a source-level fence for the render shapes used by this app. It
 * follows PascalCase components, useX hooks, memo and forwardRef wrappers,
 * React state initializers, imported helpers and known immediate array
 * callbacks. It does not try to infer arbitrary wrapper contracts, constructor
 * side effects or whether a callback accepted by an unknown helper runs now.
 */

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'src');
const CONTROL = process.env.SIM_RENDER_RANDOM_CONTROL ?? '';

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    return /\.(?:ts|tsx)$/.test(entry.name) && !/\.test\.(?:ts|tsx)$/.test(entry.name) ? [full] : [];
  });
}

const files = walk(SRC);
const transformed = new Map();
let controlExpected = null;

function sourceFor(file) {
  return transformed.get(file) ?? fs.readFileSync(file, 'utf8');
}

function replaceOnce(file, anchor, replacement) {
  const source = sourceFor(file);
  const hits = source.split(anchor).length - 1;
  if (hits !== 1) {
    console.error(`control anchor changed in ${path.relative(ROOT, file)}, expected 1 match and found ${hits}`);
    process.exit(2);
  }
  transformed.set(file, source.replace(anchor, replacement));
}

if (CONTROL) {
  const target = path.join(SRC, 'pages', 'AdminLogin.tsx');
  const helper = path.join(SRC, 'lib', 'utils.ts');
  const stateAnchor = 'const [loading, setLoading] = useState(false);';
  const importAnchor = "import { useState } from 'react';";

  if (CONTROL === 'indirect') {
    replaceOnce(
      target,
      stateAnchor,
      'const renderRandomControl = () => Math.random();\n  const [loading, setLoading] = useState(() => renderRandomControl());',
    );
    controlExpected = { count: 1, fragment: 'src/pages/AdminLogin.tsx' };
  } else if (CONTROL === 'imported') {
    replaceOnce(target, importAnchor, `${importAnchor}\nimport { renderRandomControl } from '@/lib/utils';`);
    replaceOnce(target, stateAnchor, 'const [loading, setLoading] = useState(() => renderRandomControl());');
    transformed.set(helper, `${sourceFor(helper)}\nexport function renderRandomControl() { return Math.random(); }\n`);
    controlExpected = { count: 1, fragment: 'src/lib/utils.ts' };
  } else if (CONTROL === 'sort') {
    replaceOnce(
      target,
      stateAnchor,
      'const renderRandomControl = () => [3, 2, 1].sort(() => Math.random() - 0.5)[0];\n  const [loading, setLoading] = useState(() => renderRandomControl());',
    );
    controlExpected = { count: 1, fragment: 'src/pages/AdminLogin.tsx' };
  } else if (CONTROL === 'default-alias') {
    replaceOnce(target, importAnchor, `${importAnchor}\nimport { renderRandomControl } from '@/lib/utils';`);
    replaceOnce(target, stateAnchor, 'const [loading, setLoading] = useState(() => renderRandomControl());');
    transformed.set(helper, `${sourceFor(helper)}\nexport function renderRandomControl(rng = Math.random) { return rng(); }\n`);
    controlExpected = { count: 1, fragment: 'src/lib/utils.ts' };
  } else if (CONTROL === 'alias') {
    replaceOnce(
      target,
      stateAnchor,
      'const renderRandomControl = Math.random;\n  const [loading, setLoading] = useState(() => renderRandomControl());',
    );
    controlExpected = { count: 1, fragment: 'src/pages/AdminLogin.tsx' };
  } else if (CONTROL === 'destructure') {
    replaceOnce(
      target,
      stateAnchor,
      'const { random: renderRandomControl } = Math;\n  const [loading, setLoading] = useState(() => renderRandomControl());',
    );
    controlExpected = { count: 1, fragment: 'src/pages/AdminLogin.tsx' };
  } else if (CONTROL === 'ref-safe') {
    replaceOnce(target, importAnchor, "import { useRef, useState } from 'react';");
    replaceOnce(
      target,
      stateAnchor,
      `${stateAnchor}\n  const renderRandomControl = useRef(Math.random);\n  void renderRandomControl;`,
    );
    controlExpected = { count: 0, fragment: 'src/pages/AdminLogin.tsx' };
  } else {
    console.error(`unknown SIM_RENDER_RANDOM_CONTROL: ${CONTROL}`);
    process.exit(2);
  }
}

const configPath = path.join(ROOT, 'tsconfig.app.json');
const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
if (configFile.error) {
  console.error(ts.flattenDiagnosticMessageText(configFile.error.messageText, '\n'));
  process.exit(2);
}
const parsedConfig = ts.parseJsonConfigFileContent(configFile.config, ts.sys, ROOT, {}, configPath);
const options = { ...parsedConfig.options, noEmit: true };
const host = ts.createCompilerHost(options);
const originalGetSourceFile = host.getSourceFile.bind(host);
host.getSourceFile = (fileName, languageVersion, onError, shouldCreateNewSourceFile) => {
  const replacement = transformed.get(path.resolve(fileName));
  if (replacement !== undefined) {
    return ts.createSourceFile(fileName, replacement, languageVersion, true, ts.ScriptKind.TSX);
  }
  return originalGetSourceFile(fileName, languageVersion, onError, shouldCreateNewSourceFile);
};

const program = ts.createProgram(files, options, host);
const checker = program.getTypeChecker();
const findings = new Map();
const immediateArrayMethods = new Set([
  'every', 'filter', 'find', 'findIndex', 'flatMap', 'forEach', 'map', 'reduce',
  'reduceRight', 'some', 'sort',
]);
const deferredHooks = new Set(['useCallback', 'useEffect', 'useInsertionEffect', 'useLayoutEffect']);

function sourceImports(sourceFile) {
  const imports = [];
  const visit = (node) => {
    let specifier = null;
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier) {
      specifier = node.moduleSpecifier;
    } else if (
      ts.isCallExpression(node)
      && node.expression.kind === ts.SyntaxKind.ImportKeyword
      && node.arguments.length === 1
    ) {
      specifier = node.arguments[0];
    }
    if (specifier && ts.isStringLiteralLike(specifier)) {
      const resolved = ts.resolveModuleName(specifier.text, sourceFile.fileName, options, host).resolvedModule;
      if (resolved && /\.(?:ts|tsx)$/.test(resolved.resolvedFileName)) imports.push(path.resolve(resolved.resolvedFileName));
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return imports;
}

const reachable = new Set();
const pending = [path.join(SRC, 'main.tsx')];
while (pending.length) {
  const file = path.resolve(pending.pop());
  if (reachable.has(file)) continue;
  reachable.add(file);
  const sourceFile = program.getSourceFile(file);
  if (!sourceFile) continue;
  for (const imported of sourceImports(sourceFile)) {
    if (imported.startsWith(`${SRC}${path.sep}`) && !reachable.has(imported)) pending.push(imported);
  }
}

function isFunction(node) {
  return ts.isArrowFunction(node)
    || ts.isFunctionDeclaration(node)
    || ts.isFunctionExpression(node)
    || ts.isMethodDeclaration(node);
}

function functionName(node) {
  if (node.name && ts.isIdentifier(node.name)) return node.name.text;
  if (ts.isVariableDeclaration(node.parent) && ts.isIdentifier(node.parent.name)) return node.parent.name.text;
  return '<anonymous>';
}

function isRenderRoot(node) {
  const name = functionName(node);
  return /^[A-Z]/.test(name) || /^use[A-Z]/.test(name);
}

function callName(expression) {
  if (ts.isIdentifier(expression)) return expression.text;
  if (ts.isPropertyAccessExpression(expression)) return expression.name.text;
  return '';
}

function isMathRandomCall(node) {
  return ts.isCallExpression(node)
    && ts.isPropertyAccessExpression(node.expression)
    && ts.isIdentifier(node.expression.expression)
    && node.expression.expression.text === 'Math'
    && node.expression.name.text === 'random';
}

function isMathRandomReference(node) {
  return ts.isPropertyAccessExpression(node)
    && ts.isIdentifier(node.expression)
    && node.expression.text === 'Math'
    && node.name.text === 'random';
}

function isMathRandomDestructure(node) {
  if (
    !ts.isVariableDeclaration(node)
    || !ts.isObjectBindingPattern(node.name)
    || !node.initializer
    || !ts.isIdentifier(node.initializer)
    || node.initializer.text !== 'Math'
  ) return false;
  return node.name.elements.some((element) => {
    const property = element.propertyName ?? element.name;
    return ts.isIdentifier(property) && property.text === 'random';
  });
}

function sourceDeclaration(expression) {
  let symbol = checker.getSymbolAtLocation(expression);
  if (!symbol && ts.isPropertyAccessExpression(expression)) {
    symbol = checker.getSymbolAtLocation(expression.name);
  }
  if (!symbol) return null;
  if (symbol.flags & ts.SymbolFlags.Alias) symbol = checker.getAliasedSymbol(symbol);
  return symbol.declarations?.find((declaration) => {
    const file = path.resolve(declaration.getSourceFile().fileName);
    if (!file.startsWith(`${SRC}${path.sep}`)) return false;
    return isFunction(declaration)
      || (ts.isVariableDeclaration(declaration) && declaration.initializer && isFunction(declaration.initializer));
  }) ?? null;
}

function declarationFunction(declaration) {
  if (isFunction(declaration)) return declaration;
  if (ts.isVariableDeclaration(declaration) && declaration.initializer && isFunction(declaration.initializer)) {
    return declaration.initializer;
  }
  return null;
}

function report(node, chain) {
  const sourceFile = node.getSourceFile();
  const start = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
  const relative = path.relative(ROOT, sourceFile.fileName).replaceAll('\\', '/');
  const key = `${relative}:${start.line + 1}:${start.character + 1}`;
  if (!findings.has(key)) findings.set(key, `${key} via ${chain.join(' -> ')}`);
}

function inspectFunction(fn, chain, activeFunctions) {
  if (!fn.body) return;
  const key = `${path.resolve(fn.getSourceFile().fileName)}:${fn.pos}`;
  if (activeFunctions.has(key)) return;
  const nextActive = new Set(activeFunctions).add(key);
  for (const parameter of fn.parameters) {
    if (parameter.initializer) {
      inspect(parameter.initializer, [...chain, 'default parameter'], nextActive);
    }
  }
  inspect(fn.body, chain, nextActive, true);
}

function inspectInitializer(initializer, chain, activeFunctions) {
  if (isFunction(initializer)) {
    inspectFunction(initializer, chain, activeFunctions);
    return;
  }
  const declaration = sourceDeclaration(initializer);
  const fn = declaration && declarationFunction(declaration);
  if (fn) {
    inspectFunction(fn, [...chain, functionName(fn)], activeFunctions);
    return;
  }
  inspect(initializer, chain, activeFunctions);
}

function inspect(node, chain, activeFunctions, enterFunctions = false) {
  if (isMathRandomDestructure(node)) {
    report(node, [...chain, 'random destructure']);
    return;
  }

  if (isMathRandomCall(node)) {
    report(node, chain);
    return;
  }

  if (
    isMathRandomReference(node)
    && ts.isParameter(node.parent)
    && node.parent.initializer === node
  ) {
    report(node, [...chain, 'default random source']);
    return;
  }

  if (isMathRandomReference(node)) {
    report(node, [...chain, 'random reference']);
    return;
  }

  if (
    isMathRandomReference(node)
    && ts.isCallExpression(node.parent)
    && node.parent.arguments.includes(node)
  ) {
    report(node, [...chain, 'random callback argument']);
    return;
  }

  if (isFunction(node) && !enterFunctions) return;

  if (ts.isCallExpression(node)) {
    const name = callName(node.expression);

    if (name === 'useState' || name === 'useMemo') {
      const initializer = node.arguments[0];
      if (initializer) inspectInitializer(initializer, [...chain, name], activeFunctions);
      return;
    }

    if (name === 'useReducer') {
      if (node.arguments[1]) inspect(node.arguments[1], [...chain, name], activeFunctions);
      const initializer = node.arguments[2];
      if (initializer) inspectInitializer(initializer, [...chain, name], activeFunctions);
      return;
    }

    if (name === 'useRef') {
      const initializer = node.arguments[0];
      if (initializer && !(
        ts.isPropertyAccessExpression(initializer)
        && ts.isIdentifier(initializer.expression)
        && initializer.expression.text === 'Math'
        && initializer.name.text === 'random'
      )) inspect(initializer, [...chain, name], activeFunctions);
      return;
    }

    if (deferredHooks.has(name)) {
      for (const argument of node.arguments.slice(1)) inspect(argument, chain, activeFunctions);
      return;
    }

    if (isFunction(node.expression)) {
      inspectFunction(node.expression, [...chain, 'IIFE'], activeFunctions);
    } else {
      inspect(node.expression, chain, activeFunctions);
    }

    const immediateCallbacks = ts.isPropertyAccessExpression(node.expression)
      && immediateArrayMethods.has(node.expression.name.text);
    for (const argument of node.arguments) {
      if (isFunction(argument)) {
        if (immediateCallbacks) inspectFunction(argument, [...chain, name], activeFunctions);
      } else {
        inspect(argument, chain, activeFunctions);
      }
    }

    const declaration = sourceDeclaration(node.expression);
    const fn = declaration && declarationFunction(declaration);
    if (fn) inspectFunction(fn, [...chain, functionName(fn)], activeFunctions);
    return;
  }

  ts.forEachChild(node, (child) => inspect(child, chain, activeFunctions));
}

for (const sourceFile of program.getSourceFiles()) {
  const resolved = path.resolve(sourceFile.fileName);
  if (!reachable.has(resolved)) continue;

  for (const statement of sourceFile.statements) {
    if (ts.isFunctionDeclaration(statement) && isRenderRoot(statement)) {
      inspectFunction(statement, [functionName(statement)], new Set());
      continue;
    }

    if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        const initializer = declaration.initializer;
        if (!initializer) continue;
        if (isFunction(initializer)) {
          if (isRenderRoot(initializer)) inspectFunction(initializer, [functionName(initializer)], new Set());
        } else if (
          ts.isCallExpression(initializer)
          && (callName(initializer.expression) === 'forwardRef' || callName(initializer.expression) === 'memo')
        ) {
          const render = initializer.arguments.find(isFunction);
          if (render) inspectFunction(render, [ts.isIdentifier(declaration.name) ? declaration.name.text : '<wrapped component>'], new Set());
        } else {
          inspect(declaration, ['module initialization'], new Set());
        }
      }
    }
  }
}

const lines = [...findings.values()].sort();
if (CONTROL) {
  const planted = lines.filter((line) => line.includes(controlExpected.fragment));
  if (planted.length !== controlExpected.count || lines.length !== controlExpected.count) {
    console.error(`render-random control failed: planted=${planted.length}, total=${lines.length}, expected=${controlExpected.count}`);
    for (const line of lines) console.error(`  ${line}`);
    process.exit(1);
  }
  console.log(`render-random control: ${CONTROL} source mutation applied`);
  console.log(`render-random control: ${reachable.size} files reachable from src/main.tsx`);
  console.log(`render-random control: expected ${controlExpected.count} unsafe draw${controlExpected.count === 1 ? '' : 's'}, found ${lines.length}`);
  console.log(`render-random control: ${CONTROL} control passed`);
  process.exit(0);
}

if (lines.length) {
  console.error(`render-time random audit: ${lines.length} unsafe draw${lines.length === 1 ? '' : 's'}`);
  for (const line of lines) console.error(`  ${line}`);
  process.exit(1);
}

console.log('render-time random audit: scope starts at src/main.tsx and follows resolved source imports');
console.log(`render-time random audit: ${reachable.size} reachable source files checked`);
console.log('render-time random audit: PascalCase and useX roots, React initializers, imported helpers and immediate array callbacks checked');
console.log('render-time random audit: 0 unsafe draws, PASS');
