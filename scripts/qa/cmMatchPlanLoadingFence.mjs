import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { parseArgs } from 'node:util';
import ts from 'typescript';

const { values } = parseArgs({ options: Object.fromEntries(['old-dist', 'old-manifest', 'dist', 'out'].map(key => [key, { type: 'string' }])), strict: true });
for (const key of ['old-dist', 'old-manifest', 'dist', 'out']) assert(values[key], 'Required --' + key);
const oldDir = fs.realpathSync(values['old-dist']), currentDir = fs.realpathSync(values.dist), out = path.resolve(values.out);
const inside = (root, file) => file === root || file.startsWith(root + path.sep);
assert(!inside(oldDir, out) && !inside(currentDir, out), 'Evidence must be outside both compiled payloads');
assert.notEqual(oldDir, currentDir, 'Distinct original and candidate completed payloads');
fs.mkdirSync(out, { recursive: true });
const hash = value => createHash('sha256').update(value).digest('hex');
const literals = ['Already used in another spot', 'Left the squad', 'Empty spot'];
const oldBinding = {
  artifact: '13319919125',
  zipBytes: 10138437,
  zipSHA256: '36c55cc94aa9a4760bff710301a9b8037949a847eca83e1425093b1d690145ff',
  manifestSHA256: 'a49a2f9783c292d26ba2fbcdc4bd1600ab905d58de590bbb4948a07345921993',
  core: '967a5c1ad34081f935231657f798be0a336e0fe2',
  distDigest: '83b9304d5eb300a49845df1cbb91603cea44f8bbf10d8a7180b8e5f986b3e736',
};
const report = { status: 'failed', scope: 'AST-only compiled dependency boundary, not gameplay or a measured download saving', literals, oldBinding };
function inventory(root) {
  const rows = [];
  function visit(dir, rel = '') {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      assert(!entry.isSymbolicLink(), 'No payload symlinks');
      const file = rel ? rel + '/' + entry.name : entry.name, full = path.join(dir, entry.name);
      if (entry.isDirectory()) visit(full, file);
      else {
        assert(entry.isFile(), 'Ordinary payload file');
        const bytes = fs.readFileSync(full);
        rows.push({ file, bytes: bytes.length, sha256: hash(bytes) });
      }
    }
  }
  visit(root);
  return rows.sort((a, b) => a.file < b.file ? -1 : a.file > b.file ? 1 : 0);
}
function ast(text, file) {
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  assert.equal(source.parseDiagnostics.length, 0, 'Valid compiled JavaScript: ' + file);
  return source;
}
function nodes(source) {
  const counts = Object.fromEntries(literals.map(value => [value, 0])), hits = [], dynamic = [], queue = [source];
  let computedDynamic = 0;
  while (queue.length) {
    const node = queue.pop();
    if (ts.isStringLiteralLike(node) && literals.includes(node.text)) {
      counts[node.text]++;
      hits.push({ value: node.text, line: source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1 });
    }
    if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
      if (node.arguments.length === 1 && ts.isStringLiteralLike(node.arguments[0])) dynamic.push(node.arguments[0].text);
      else computedDynamic++;
    }
    ts.forEachChild(node, child => { queue.push(child); });
  }
  return { counts, hits, dynamic, computedDynamic };
}
function entryOf(root, rows) {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8').replace(/<!--[\s\S]*?-->/g, '');
  const entries = [];
  for (const tag of html.matchAll(/<script\b[^>]*>/gi)) {
    const attrs = Object.fromEntries([...tag[0].matchAll(/\b(type|src)\s*=\s*["']([^"']*)["']/gi)].map(match => [match[1].toLowerCase(), match[2]]));
    if (attrs.type === 'module' && attrs.src) entries.push(attrs.src.replace(/^\//, ''));
  }
  assert.equal(entries.length, 1, 'Exactly one compiled module entry');
  assert(rows.some(row => row.file === entries[0]), 'Module entry in payload');
  return entries[0];
}
function boundary(root, rows) {
  const files = new Set(rows.map(row => row.file)), cache = new Map();
  const find = pattern => {
    const matches = rows.filter(row => pattern.test(row.file));
    assert.equal(matches.length, 1, 'Unique compiled route or lazy screen: ' + pattern);
    return matches[0].file;
  };
  const resolve = (from, specifier) => {
    assert(/^(?:\.{1,2}\/|\/)/.test(specifier), 'No external or bare compiled dependency: ' + specifier);
    const plain = specifier.split(/[?#]/)[0];
    const target = path.posix.normalize(plain.startsWith('/') ? plain.slice(1) : path.posix.join(path.posix.dirname(from), plain));
    assert(!target.startsWith('../') && files.has(target), 'Dependency held in completed payload: ' + target);
    return target;
  };
  function parse(file) {
    if (cache.has(file)) return cache.get(file);
    const source = ast(fs.readFileSync(path.join(root, file), 'utf8'), file), found = nodes(source), imports = [];
    for (const node of source.statements) {
      if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier) {
        assert(ts.isStringLiteralLike(node.moduleSpecifier), 'Literal static module specifier');
        imports.push(resolve(file, node.moduleSpecifier.text));
      }
    }
    const result = { ...found, imports, dynamic: found.dynamic.map(specifier => resolve(file, specifier)) };
    cache.set(file, result);
    return result;
  }
  function closure(roots) {
    const seen = new Set(), queue = [...roots], counts = Object.fromEntries(literals.map(value => [value, 0])), hits = [], dynamic = new Set();
    let computedDynamic = 0;
    while (queue.length) {
      const file = queue.pop();
      if (seen.has(file)) continue;
      seen.add(file);
      if (!/\.m?js$/.test(file)) continue;
      const parsed = parse(file);
      for (const value of literals) counts[value] += parsed.counts[value];
      hits.push(...parsed.hits.map(hit => ({ file, ...hit })));
      computedDynamic += parsed.computedDynamic;
      parsed.dynamic.forEach(file => dynamic.add(file));
      queue.push(...parsed.imports);
    }
    return { files: [...seen].sort(), counts, hits, dynamic: [...dynamic].sort(), computedDynamic };
  }
  const entry = entryOf(root, rows), route = find(/^assets\/ClubManager-[^/]+\.js$/), tactics = find(/^assets\/TacticsScreen-[^/]+\.js$/);
  const app = closure([entry]);
  assert(app.dynamic.includes(route), 'Actual App dynamically references the Club Manager route');
  const initial = closure([entry, route]);
  assert(initial.dynamic.includes(tactics), 'Actual initial route dynamically references the existing Tactics screen');
  return { entry, route, tactics, initial, late: closure([tactics]) };
}
function excludePreview(initial) {
  const leaked = literals.filter(value => initial.counts[value] !== 0);
  assert.equal(leaked.length, 0, 'CM_LOADING_PREVIEW_EAGER: ' + leaked.join(', '));
}
let oldRows, currentRows;
try {
  const commentOnly = nodes(ast('/* ' + literals.join(' | ') + ' */\nexport const untouched = 1;', 'comment-control.js'));
  assert(literals.every(value => commentOnly.counts[value] === 0), 'Comments cannot satisfy literal checks');
  const literalControl = nodes(ast('export const observed = ' + JSON.stringify(literals) + ';', 'literal-control.js'));
  assert(literals.every(value => literalControl.counts[value] === 1), 'Actual literal nodes must be detected');
  report.parserControls = { commentIgnored: true, literalDetected: true };
  const manifestBytes = fs.readFileSync(values['old-manifest']);
  assert.equal(hash(manifestBytes), oldBinding.manifestSHA256, 'Admitted original manifest identity');
  const manifest = JSON.parse(manifestBytes);
  assert.equal(manifest.core, oldBinding.core);
  assert.equal(manifest.distDigest, oldBinding.distDigest);
  oldRows = inventory(oldDir); currentRows = inventory(currentDir);
  assert.deepEqual(oldRows, manifest.distBefore, 'Every original payload byte matches its admitted manifest, with no extra file');
  assert.equal(hash(JSON.stringify(oldRows)), oldBinding.distDigest);
  report.inputs = {
    original: { files: oldRows.length, digest: hash(JSON.stringify(oldRows)) },
    candidate: { files: currentRows.length, digest: hash(JSON.stringify(currentRows)) },
  };
  const original = boundary(oldDir, oldRows), candidate = boundary(currentDir, currentRows);
  report.original = original; report.candidate = candidate;
  for (const value of literals) assert.equal(original.initial.counts[value], 1, 'Exactly one original preview literal in the actual initial static closure: ' + value);
  let control = null;
  try { excludePreview(original.initial); } catch (error) {
    assert(error instanceof assert.AssertionError && error.message.includes('CM_LOADING_PREVIEW_EAGER'), 'Owned original boundary rejection only');
    control = { effective: true, marker: 'CM_LOADING_PREVIEW_EAGER', leaked: literals.filter(value => original.initial.counts[value] !== 0) };
  }
  assert(control && control.leaked.length === 3, 'Original completed build must fail the same new absence check');
  report.originalControl = control;
  excludePreview(candidate.initial);
  for (const value of literals) assert.equal(candidate.late.counts[value], 1, 'Exactly one late Tactics preview literal: ' + value);
  assert(!candidate.initial.files.includes(candidate.tactics), 'Tactics stays behind the existing lazy boundary');
  report.status = 'passed';
} catch (error) {
  report.error = String(error.stack || error); process.exitCode = 1;
} finally {
  try {
    if (oldRows) assert.deepEqual(inventory(oldDir), oldRows, 'Original completed output held');
    if (currentRows) assert.deepEqual(inventory(currentDir), currentRows, 'Candidate completed output held');
    report.inputsHeld = oldRows && currentRows ? true : 'UNKNOWN';
  } catch (error) {
    report.status = 'failed'; report.holdError = String(error.stack || error); process.exitCode = 1;
  }
  fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n');
}
if (report.status === 'passed') console.log('CM match-plan loading fence: original3 eager literals rejected; candidate0 initial/3 late literals, exact AST and completed-output holds.');
else console.error(report.error || report.holdError);
