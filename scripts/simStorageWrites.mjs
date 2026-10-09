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
 *   4. src/lib/safeStorage.ts only READS as it loads. Its first cut probed
 *      with a write and a remove on both stores at module scope, so every
 *      import of the Supabase client wrote to storage, and three committed
 *      browser checks that pin the auth client's own probe as the only such
 *      write went red (scripts/playInboxCard.mjs and the two Club Manager
 *      walks under scripts/qa). The write probe is a function the notice
 *      calls on a game page now, and nothing module scope reaches may write.
 *
 *   5. (Round 1144) A browser that stores normally is written to by the seam
 *      at most once a visit. The seam has two functions that write a probe:
 *      probeStorageWrites, whose write must sit under its own once flag, and
 *      recheckStorageWrites (which takes "full" back when the browser takes
 *      writes again), whose write must sit under "the seam already says
 *      full". No other function in the seam may name the probe key in a
 *      write. Without the second guard every press on a game page would
 *      write to everybody's storage and fire a storage event in every other
 *      tab, which is what section 4 and the three browser checks exist to
 *      stop.
 *
 * MEASURED on this tree (Round 1144): 123 .setItem calls in 90 files, 121
 * inside a try that has a catch, of their own function, 2 allowed (see
 * ALLOWED), 0 offenders, 0 of them in a try with only a finally; and in the
 * seam 11 write, remove or clear calls, none reachable as it loads, 4 of
 * them on the probe key, 2 in each of the two functions that may. The header
 * is refreshed by hand; the summary line prints the live numbers. Each
 * control turns one section red, except probe, which turns two (4 and 5: a
 * probe written in resolve runs as the seam loads AND is a probe outside the
 * two functions that may write one).
 *
 * NEGATIVE CONTROLS, each one changes a file IN MEMORY only, asserts the text
 * it is about to change is really there, and must turn the harness red:
 *   SIM_STORAGE_WRITES_CONTROL=unguard  puts the bare write back in Footle.
 *   SIM_STORAGE_WRITES_CONTROL=order    moves the seam off the first import.
 *   SIM_STORAGE_WRITES_CONTROL=client   puts `storage: localStorage` back.
 *   SIM_STORAGE_WRITES_CONTROL=caller   takes the try off one writeIndex call,
 *                                        so the ALLOWED reason stops being true.
 *   SIM_STORAGE_WRITES_CONTROL=nocatch  turns the cookie banner's try and catch
 *                                        into a try and finally, which still throws.
 *   SIM_STORAGE_WRITES_CONTROL=probe    puts the write probe back in resolve,
 *                                        which runs as the seam loads.
 *   SIM_STORAGE_WRITES_CONTROL=recheck  (Round 1144) takes "the seam already
 *                                        says full" off the recheck, so it
 *                                        would write in every browser.
 *   SIM_STORAGE_WRITES_CONTROL=once     (Round 1144) takes the once flag off
 *                                        the first probe.
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
else if (CONTROL === 'nocatch') control('src/components/CookieConsent.tsx', "try { safeLocalStorage.setItem('cookie-consent', choice); } catch { /* see above */ }", "try { safeLocalStorage.setItem('cookie-consent', choice); } finally { /* see above */ }");
else if (CONTROL === 'probe') control('src/lib/safeStorage.ts', 'real.getItem(PROBE_KEY);', "real.setItem(PROBE_KEY, '1'); real.removeItem(PROBE_KEY);");
else if (CONTROL === 'recheck') control('src/lib/safeStorage.ts', 'if (refusedWrite && !raw && local.real) {', 'if (!raw && local.real) {');
else if (CONTROL === 'once') control('src/lib/safeStorage.ts', 'if (!probedWrites && !raw && local.real) {', 'if (!raw && local.real) {');
else if (CONTROL) { console.error(`unknown SIM_STORAGE_WRITES_CONTROL=${CONTROL}`); process.exit(2); }

const read = full => overrides.get(full) ?? fs.readFileSync(full, 'utf8');
const parse = full => ts.createSourceFile(full, read(full), ts.ScriptTarget.Latest, true, full.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
const isFunction = n => ts.isFunctionDeclaration(n) || ts.isFunctionExpression(n) || ts.isArrowFunction(n)
  || ts.isMethodDeclaration(n) || ts.isGetAccessorDeclaration(n) || ts.isSetAccessorDeclaration(n) || ts.isConstructorDeclaration(n);

/** True when the node is inside the try block, of a try that has a CATCH, of the
 *  function it runs in. A try with only a finally still throws, so it does not
 *  count and the climb carries on to the next try out (review finding: the
 *  first cut counted any try). */
function guarded(node) {
  for (let n = node; n.parent; n = n.parent) {
    const p = n.parent;
    if (ts.isTryStatement(p) && p.tryBlock === n && p.catchClause) return true;
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
const isInsideFunction = node => { for (let n = node.parent; n; n = n.parent) if (isFunction(n)) return true; return false; };
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

console.log('4. the storage seam only READS as it loads: no write, remove or clear at module scope or in what module scope calls');
{
  const full = path.join(SRC, 'lib', 'safeStorage.ts');
  const sf = parse(full);
  const WRITES = new Set(['setItem', 'removeItem', 'clear']);
  /* what runs as the module loads: its top level statements, and the functions they call by name */
  const atLoad = new Set(calls(sf, n => ts.isIdentifier(n.expression) && ownerName(n) === '' && !isInsideFunction(n)).map(n => n.expression.text));
  const hits = calls(sf, n => ts.isPropertyAccessExpression(n.expression) && WRITES.has(n.expression.name.text));
  const early = hits.filter(n => !isInsideFunction(n) || atLoad.has(ownerName(n)));
  if (!atLoad.has('resolve')) fail(`safeStorage.ts no longer calls resolve at module scope (it calls ${[...atLoad].join(', ') || 'nothing'}): this check is not reading the file it thinks it is`);
  else if (hits.length < 4) fail(`only ${hits.length} write, remove or clear calls found in safeStorage.ts: the scan is not reading the seam`);
  else if (early.length) fail(`${early.length} storage write(s) run as the seam loads (line ${early.map(n => lineOf(sf, n)).join(', ')}): every import of the Supabase client would write, which three committed browser checks forbid`);
  else ok(`${hits.length} write, remove or clear calls in the seam, 0 of them at module scope or in ${[...atLoad].sort().join(', ')}`);
}

console.log('5. the seam writes its probe only under the once flag (the first probe) or while it already says full (the recheck)');
{
  const full = path.join(SRC, 'lib', 'safeStorage.ts');
  const sf = parse(full);
  const WRITES = new Set(['setItem', 'removeItem']);
  /* every write whose first argument is the probe key, by the function it runs in */
  const probes = calls(sf, n => ts.isPropertyAccessExpression(n.expression) && WRITES.has(n.expression.name.text)
    && n.arguments.length > 0 && ts.isIdentifier(n.arguments[0]) && n.arguments[0].text === 'PROBE_KEY');
  /* the guards between a write and its function: the conditions of every if it sits inside, split on && */
  const guardsOf = node => {
    const out = [];
    for (let n = node; n.parent && !isFunction(n.parent); n = n.parent) {
      const p = n.parent;
      if (ts.isIfStatement(p) && p.thenStatement === n) out.push(...p.expression.getText(sf).split('&&').map(s => s.trim()));
    }
    return out;
  };
  const NEED = { probeStorageWrites: '!probedWrites', recheckStorageWrites: 'refusedWrite' };
  const bad = [];
  const seen = {};
  for (const w of probes) {
    const owner = ownerName(w);
    seen[owner] = (seen[owner] ?? 0) + 1;
    if (!(owner in NEED)) { bad.push(`line ${lineOf(sf, w)}: ${owner || 'module scope'} writes the probe key, and only ${Object.keys(NEED).join(' and ')} may`); continue; }
    if (!guardsOf(w).includes(NEED[owner])) bad.push(`line ${lineOf(sf, w)}: the probe write in ${owner} is not under "${NEED[owner]}" (it is under "${guardsOf(w).join(' && ') || 'nothing'}")`);
  }
  for (const owner of Object.keys(NEED)) if (!seen[owner]) bad.push(`${owner} writes no probe: this check is not reading the seam it thinks it is`);
  /* the once flag has to be set by the probe, or "once" is a word */
  const sets = [];
  const walk = n => { if (ts.isBinaryExpression(n) && n.operatorToken.kind === ts.SyntaxKind.EqualsToken && n.left.getText(sf) === 'probedWrites' && n.right.getText(sf) === 'true') sets.push(ownerName(n)); ts.forEachChild(n, walk); };
  walk(sf);
  if (!sets.includes('probeStorageWrites')) bad.push('probeStorageWrites never sets probedWrites, so its probe would run on every call');
  if (bad.length) { fail(`${bad.length} probe write(s) that an ordinary browser would get more than once a visit:`); for (const b of bad) console.log('           ' + b); }
  else ok(`${probes.length} probe writes: ${Object.keys(NEED).map(o => `${seen[o]} in ${o} under "${NEED[o]}"`).join(', ')}`);
}

console.log(`\nsimStorageWrites${CONTROL ? ` (control ${CONTROL})` : ''}: ${failures === 0 ? 'all green' : failures + ' failed'}`);
process.exit(failures ? 1 : 0);
