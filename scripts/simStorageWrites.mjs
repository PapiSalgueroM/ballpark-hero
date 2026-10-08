/**
 * Round 1142: a storage write must not be able to take a page down.
 *
 * WHY THIS EXISTS. With storage full (every write throws, reads work) the
 * browser harness scripts/playStorageBlocked.mjs measured /footle and
 * /build-your-xi falling to "This page broke". Each one sets a "rules seen"
 * flag in a mount effect with a bare localStorage.setItem, the write threw,
 * and React took the route down. A read of src found the same shape 29 times
 * in 24 files (fifteen more pages that died as they mounted, the World Cup
 * predictor's four save effects, two daily games whose first answer threw
 * before the vote was sent). All 29 now call safeSetItem from
 * src/lib/safeStorage.ts.
 *
 * The browser harness walks 28 routes. The site has more than 120, and a
 * check written for the known offenders cannot find the next one, so this
 * reads every source file instead.
 *
 * WHAT IT HOLDS, on the TypeScript syntax tree (code, never comments or
 * strings):
 *   1. Every call of .setItem(...) in src outside the tests sits inside the
 *      try block of its own function, or is on the short ALLOWED list with
 *      the reason it is safe and a check that the reason is still true.
 *      A try around the place a function is DEFINED does not count: it has
 *      to be between the call and the function it runs in.
 *   2. src/main.tsx imports ./lib/safeStorage before anything else. The seam
 *      stands in for blocked storage on window, and it can only do that for
 *      modules that load after it.
 *   3. src/integrations/supabase/client.ts hands the seam to the auth client
 *      and never names localStorage itself. That one line is what killed the
 *      whole site under blocked storage.
 *
 * MEASURED on this tree: 120 .setItem calls in 87 files, 118 inside a try of
 * their own function, 2 allowed (see ALLOWED), 0 offenders. The header is
 * refreshed by hand; the summary line prints the live numbers.
 *
 * NEGATIVE CONTROLS, each one changes a file IN MEMORY only, asserts the text
 * it is about to change is really there, and must turn the harness red:
 *   SIM_STORAGE_WRITES_CONTROL=unguard  puts the bare write back in Footle.
 *   SIM_STORAGE_WRITES_CONTROL=order    moves the seam off the first import.
 *   SIM_STORAGE_WRITES_CONTROL=client   puts `storage: localStorage` back.
 *   SIM_STORAGE_WRITES_CONTROL=caller   takes the try off one writeIndex call,
 *                                        so the ALLOWED reason stops being true.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'src');
const CONTROL = process.env.SIM_STORAGE_WRITES_CONTROL ?? '';
const rel = f => path.relative(ROOT, f).replace(/\\/g, '/');

let failures = 0;
const ok = msg => console.log('   ok    ' + msg);
const fail = msg => { failures += 1; console.log('   FAIL  ' + msg); };

/** Files the control rewrites, in memory only. */
const overrides = new Map();
function control(file, from, to) {
  const full = path.join(ROOT, file);
  const text = fs.readFileSync(full, 'utf8');
  if (!text.includes(from)) {
    console.error(`REFUSING TO RUN: control ${CONTROL} wants to change "${from}" in ${file} and it is not there.`);
    process.exit(2);
  }
  overrides.set(full, text.replace(from, to));
  console.log(`   control ${CONTROL}: ${file} changed in memory ("${from.slice(0, 50)}" is now "${to.slice(0, 50)}")`);
}
if (CONTROL === 'unguard') control('src/pages/Footle.tsx', "safeSetItem('footle-rules-seen', '1')", "localStorage.setItem('footle-rules-seen', '1')");
else if (CONTROL === 'order') control('src/main.tsx', 'import "./lib/safeStorage";', 'import "./lib/translateGuard";');
else if (CONTROL === 'client') control('src/integrations/supabase/client.ts', 'storage: safeLocalStorage,', 'storage: localStorage,');
else if (CONTROL === 'caller') control('src/lib/clubManagerSlots.ts', 'try { writeIndex(from); } catch {', '{ writeIndex(from); } {');
else if (CONTROL) { console.error(`unknown SIM_STORAGE_WRITES_CONTROL=${CONTROL}`); process.exit(2); }

const read = full => overrides.get(full) ?? fs.readFileSync(full, 'utf8');
const parse = full => ts.createSourceFile(full, read(full), ts.ScriptTarget.Latest, true, full.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
const isFunction = n => ts.isFunctionDeclaration(n) || ts.isFunctionExpression(n) || ts.isArrowFunction(n)
  || ts.isMethodDeclaration(n) || ts.isGetAccessorDeclaration(n) || ts.isSetAccessorDeclaration(n) || ts.isConstructorDeclaration(n);

/** True when the node is inside the try block of the function it runs in. */
function guarded(node) {
  for (let n = node; n.parent; n = n.parent) {
    const p = n.parent;
    if (ts.isTryStatement(p) && p.tryBlock === n) return true;
    if (isFunction(p)) return false;
  }
  return false;
}
/** The name of the function a node runs in, as far as one can be read off the tree. */
function ownerName(node) {
  for (let n = node.parent; n; n = n.parent) {
    if (!isFunction(n)) continue;
    if (n.name && ts.isIdentifier(n.name)) return n.name.text;
    if (n.parent && ts.isVariableDeclaration(n.parent) && ts.isIdentifier(n.parent.name)) return n.parent.name.text;
    return '';
  }
  return '';
}
function calls(sf, test) {
  const found = [];
  const walk = n => { if (ts.isCallExpression(n) && test(n)) found.push(n); ts.forEachChild(n, walk); };
  walk(sf);
  return found;
}
const lineOf = (sf, n) => sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1;

/**
 * The writes that may stay bare, each with why, and a check that the why
 * still holds. `owner` is the function the write runs in.
 */
const ALLOWED = [
  {
    file: 'src/lib/clubManagerSlots.ts',
    owner: 'writeIndex',
    why: 'every caller wraps writeIndex in a try and rolls the slot switch back on the throw (Round 634, fail closed)',
    holds(sf) {
      const uses = calls(sf, n => ts.isIdentifier(n.expression) && n.expression.text === 'writeIndex');
      const bare = uses.filter(n => !guarded(n));
      return uses.length >= 2 && bare.length === 0
        ? null
        : `${bare.length} of ${uses.length} writeIndex calls are outside a try (line ${bare.map(n => lineOf(sf, n)).join(', ') || 'none'})`;
    },
  },
  {
    file: 'src/lib/safeStorage.ts',
    owner: 'safeSetItem',
    why: 'the raw switch, which exists so the browser harness can put the old unguarded write back as its control',
    holds(sf, node) {
      let n = node;
      while (n.parent && !ts.isIfStatement(n.parent) && !isFunction(n.parent)) n = n.parent;
      const cond = n.parent && ts.isIfStatement(n.parent) ? n.parent.expression.getText(sf) : '';
      return cond === 'raw' ? null : `the bare write in safeSetItem is not under "if (raw)" (found "${cond}")`;
    },
  },
];

console.log('1. every storage write is inside a try of its own function, or allowed with a reason that still holds');
{
  const files = fs.readdirSync(SRC, { recursive: true }).map(String)
    .filter(f => /\.(ts|tsx)$/.test(f) && !/\.test\.|\.spec\.|[\/]test[\/]|\.outcomes\.|\.d\.ts$|__control_/.test(f))
    .map(f => path.join(SRC, f));
  let total = 0;
  let inTry = 0;
  let allowed = 0;
  let withWrites = 0;
  const offenders = [];
  for (const full of files) {
    if (!read(full).includes('.setItem(')) continue;
    const sf = parse(full);
    const writes = calls(sf, n => ts.isPropertyAccessExpression(n.expression) && n.expression.name.text === 'setItem');
    if (!writes.length) continue;
    withWrites += 1;
    for (const w of writes) {
      total += 1;
      if (guarded(w)) { inTry += 1; continue; }
      const entry = ALLOWED.find(a => a.file === rel(full) && a.owner === ownerName(w));
      if (!entry) { offenders.push(`${rel(full)}:${lineOf(sf, w)}  ${w.getText(sf).slice(0, 80)}`); continue; }
      const broken = entry.holds(sf, w);
      if (broken) offenders.push(`${rel(full)}:${lineOf(sf, w)}  allowed because ${entry.why}, but ${broken}`);
      else allowed += 1;
    }
  }
  if (total < 100) fail(`only ${total} .setItem calls found in src: the scan is not reading the tree it thinks it is`);
  if (offenders.length) {
    fail(`${offenders.length} storage write(s) that can throw into a render, an effect or a handler:`);
    for (const o of offenders) console.log('           ' + o);
    console.log('           use safeSetItem from @/lib/safeStorage, or guard the write where it is made');
  } else ok(`${total} .setItem calls in ${withWrites} files: ${inTry} inside a try of their own function, ${allowed} allowed, 0 that can throw`);
}

console.log('2. the storage seam is the first thing src/main.tsx imports');
{
  const full = path.join(SRC, 'main.tsx');
  const sf = parse(full);
  const first = sf.statements.find(ts.isImportDeclaration);
  const spec = first && ts.isStringLiteral(first.moduleSpecifier) ? first.moduleSpecifier.text : '';
  if (sf.statements[0] === first && spec === './lib/safeStorage') ok('main.tsx starts with import "./lib/safeStorage"');
  else fail(`main.tsx starts with "${spec || sf.statements[0].getText(sf).slice(0, 40)}": a module that reads localStorage as it loads would run before the seam`);
}

console.log('3. the Supabase client takes its auth storage from the seam');
{
  const full = path.join(SRC, 'integrations', 'supabase', 'client.ts');
  const sf = parse(full);
  let storage = '';
  let namesLocal = 0;
  const walk = n => {
    if (ts.isPropertyAssignment(n) && ts.isIdentifier(n.name) && n.name.text === 'storage') storage = n.initializer.getText(sf);
    if (ts.isIdentifier(n) && n.text === 'localStorage') namesLocal += 1;
    ts.forEachChild(n, walk);
  };
  walk(sf);
  if (storage === 'safeLocalStorage' && namesLocal === 0) ok('auth.storage is safeLocalStorage and the file never names localStorage');
  else fail(`auth.storage is "${storage}" and the file names localStorage ${namesLocal} time(s): reading it there throws under blocked storage and nothing after it runs`);
}

console.log(`\nsimStorageWrites${CONTROL ? ` (control ${CONTROL})` : ''}: ${failures === 0 ? 'all green' : failures + ' failed'}`);
process.exit(failures ? 1 : 0);
