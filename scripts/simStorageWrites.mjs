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
 *   6. (Round 1144 review) "Full" is taken back in exactly one place, the
 *      recheck, and the recheck returns first while a game holds a refused
 *      save. The first cut took it back on any write the browser took, and
 *      a full store still takes a write that needs no room (a page saving
 *      what it loaded), so in a real Chromium the line left while every
 *      save was still refused. src/test/safeStorageQuota.test.ts and the
 *      quota journeys of scripts/playUsCareerSaveSeam.mjs hold the
 *      behaviour; this holds the shape.
 *
 * MEASURED on this tree (Round 1144): 124 .setItem calls in 90 files, 122
 * inside a try that has a catch, of their own function, 2 allowed (see
 * ALLOWED), 0 offenders, 0 of them in a try with only a finally; and in the
 * seam 13 write, remove or clear calls, none reachable as it loads, 4 of
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
 *   SIM_STORAGE_WRITES_CONTROL=unlearn  (Round 1144 review) a safeSetItem the
 *                                        browser takes takes "full" back again.
 *   SIM_STORAGE_WRITES_CONTROL=held     (Round 1144 review) takes the held
 *                                        save's guard off the recheck.
 *
 *   7. (Round 1210) A save a game REMEMBERS was refused is named to the seam,
 *      or is listed with the reason it need not be. The seam lets a game name
 *      a save the browser refused (holdPendingSave), and everything that
 *      reloads the page on the app's own account asks it first, so a new
 *      build's reload cannot throw away progress that only the open page
 *      holds. One game did that (the US career board). Others keep a refused
 *      save in the page and say so on screen without telling the seam.
 *      The sites are taken from the WRITE, never from what a state is called
 *      (a check written for a known offender cannot find the next one; the
 *      first cut looked for names with "save" and "fail" in them and could
 *      not see "storageNotice" on a line that reads "this browser could not
 *      save it"). Three detectors, in union, each giving keys a file:
 *        state:<name>   a guarded storage write whose catch calls a state
 *                       setter (the state the setter sets), or a useState
 *                       pair whose name says a save failed;
 *        write:<owner>  a guarded storage write whose catch does anything
 *                       else at all (answers false, sets a flag or a ref,
 *                       returns a word), by the function it runs in. A
 *                       function's second such write is write:<owner>#2, a
 *                       key of its own, so a new refusal in a function that
 *                       is already listed has to be answered for too;
 *        keeps:<callee> one hop on: a call that keeps the answer of a
 *                       function whose catch answers false (and of
 *                       safeSetItem, which answers the same question).
 *      A write whose catch is empty remembers nothing and is not a site.
 *      Every key is covered by exactly one entry of three lists, each entry
 *      with a reason a reader can check:
 *        NAMED         the save is named to the seam. Judged at the hold, one
 *                      key at a time: the function that calls
 *                      holdPendingSave (the innermost one, an effect's own
 *                      callback) must read the state or a const made from
 *                      it, in its body or in its hook's dependency list; for
 *                      an entry with no state, the save function by name.
 *                      The enclosing component or hook does not count (it
 *                      declares every state, so it "reads" them all), so one
 *                      hold cannot pass for three refused saves. What this
 *                      cannot see is whether the hold's condition is the
 *                      right way round: src/test/usSeasonCentreEntry.test.tsx
 *                      holds that for the US board.
 *        NOTHING_HELD  the game refused the action, or the write is not game
 *                      progress, so a reload loses nothing: the line that
 *                      shows it is in the entry.
 *        OWED          unsaved progress lives in the open page and the seam
 *                      is not told: the owner and the day it was listed.
 *      A key on no list fails, so the next game that learns to remember a
 *      refused save cannot ship without an answer. OWED is a ratchet like
 *      RAW_RANDOM_BASELINE: the summary prints "owed: N" on every run, and an
 *      entry whose file now names that save fails as stale, with the entry
 *      to delete spelled out. An entry that keeps two saves and has one of
 *      them named is PARTLY stale: the message says which key moves to NAMED
 *      and which stays owed, never "move the entry". An entry whose key the
 *      scan no longer finds is stale the same way.
 *      MEASURED (Round 1210, origin/main 074a9054 plus this round): 122
 *      guarded writes, 85 with an empty catch, 37 that do something; the
 *      union is in the summary line. Fewer keys than SITE_FLOOR means the
 *      scanner is broken, not that the games stopped remembering.
 *   SIM_STORAGE_WRITES_CONTROL=unnamed  (Round 1210) takes the holdPendingSave
 *                                        call out of the US career board:
 *                                        section 7 must say its NAMED entry
 *                                        names nothing.
 *   SIM_STORAGE_WRITES_CONTROL=newsite  (Round 1210) plants a guarded write
 *                                        whose catch calls a setter in a file
 *                                        that has no storage write: section 7
 *                                        must name it as on no list.
 *   SIM_STORAGE_WRITES_CONTROL=stale    (Round 1210) plants a holdPendingSave
 *                                        that reads the state of the first
 *                                        OWED entry: section 7 must call that
 *                                        entry stale.
 *   The six below came out of the review of Round 1210 (2026-10-10), which
 *   moved a hold into a function that reads nothing and stayed green:
 *   SIM_STORAGE_WRITES_CONTROL=deadhold moves the US board's hold into a
 *                                        nested function of the same effect
 *                                        that reads nothing: section 7 must
 *                                        say NAMED names nothing although
 *                                        the file still has a hold.
 *   SIM_STORAGE_WRITES_CONTROL=partial  plants a hook that keeps two refused
 *                                        saves and holds one, with one OWED
 *                                        entry for both: section 7 must call
 *                                        it PARTLY stale, the first key
 *                                        named and the second still owed.
 *   SIM_STORAGE_WRITES_CONTROL=second   plants a function with two guarded
 *                                        writes and an entry for the first:
 *                                        the second, write:<owner>#2, must
 *                                        be named as on no list.
 *   SIM_STORAGE_WRITES_CONTROL=twolists puts the first NAMED key on OWED as
 *                                        well: "on two lists".
 *   SIM_STORAGE_WRITES_CONTROL=gone     lists a key no write gives: the
 *                                        entry must be called stale.
 *   SIM_STORAGE_WRITES_CONTROL=floor    narrows the scan to src/lib: the
 *                                        floor must refuse the count.
 *      Each of the nine prints FIRED or DID NOT FIRE on the last line, since
 *      a control that aborts exits red just like one that fires (exit 1 is a
 *      control that fired, 2 a refusal to run, 3 one that did not fire).
 *      Shown once on 2026-10-10 with the old judgement put back in a copy:
 *      the climb through every enclosing function leaves deadhold and
 *      partial at DID NOT FIRE, "any state of the entry" leaves partial
 *      there, and one key a function leaves second there.
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
else if (CONTROL === 'unlearn') control('src/lib/safeStorage.ts', 'localStorage.setItem(key, value);', 'localStorage.setItem(key, value); setRefusedWrite(false);');
else if (CONTROL === 'held') control('src/lib/safeStorage.ts', 'if (pendingSaves.size > 0) return getStorageTrouble();', '');
else if (CONTROL === 'unnamed') control('src/components/us-career/UsCareerBoard.tsx', 'return holdPendingSave(() => { retrySave(); return pendingSave.current === null; });', 'return undefined;');
else if (CONTROL === 'deadhold') control('src/components/us-career/UsCareerBoard.tsx', 'return holdPendingSave(() => { retrySave(); return pendingSave.current === null; });', 'const dead = () => holdPendingSave(() => true); void dead; return undefined;');
else if (['newsite', 'stale', 'partial', 'second', 'twolists', 'gone', 'floor'].includes(CONTROL)) { /* set up in section 7, once the scan knows where */ }
else if (CONTROL) { console.error(`unknown SIM_STORAGE_WRITES_CONTROL=${CONTROL}`); process.exit(2); }
/** Section 7's planted controls add text at the end of a file, in memory only. */
function plant(file, addition) {
  const full = path.join(ROOT, file);
  const text = overrides.get(full) ?? fs.readFileSync(full, 'utf8');
  if (text.includes(addition)) {
    console.error(`REFUSING TO RUN: control ${CONTROL} wants to plant text in ${file} that is already there.`);
    process.exit(2);
  }
  overrides.set(full, text + '\n' + addition + '\n');
  console.log(`   control ${CONTROL}: ${file} has this added at its end, in memory: ${addition.slice(0, 110)}`);
}
/** What a section 7 control was aimed at, and whether section 7 said so. */
const aim = { what: '', fired: false };

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
/** Every file under src that ships: no test, no spec, no outcomes file and
 *  nothing under a test folder. A path is put on forward slashes before the
 *  filter reads it, so this PC and the Linux runner scan the same files
 *  (review of Round 1210: the folder test asked for a forward slash on both
 *  sides, so it never matched src/test itself and never matched on Windows).
 *  Sections 1 and 7 both read this one list. */
const sourceFiles = () => fs.readdirSync(SRC, { recursive: true }).map(f => String(f).replace(/\\/g, '/'))
  .filter(f => /\.(ts|tsx)$/.test(f) && !/\.test\.|\.spec\.|(^|\/)test\/|\.outcomes\.|\.d\.ts$|__control_/.test(f))
  .map(f => path.join(SRC, f)).sort();

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
  const files = sourceFiles();
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

console.log('6. "full" is taken back in one place, the recheck, and never while a game holds a refused save');
{
  const full = path.join(SRC, 'lib', 'safeStorage.ts');
  const sf = parse(full);
  /* every call that takes "full" back, by the function it runs in */
  const unlearns = calls(sf, n => ts.isIdentifier(n.expression) && n.expression.text === 'setRefusedWrite'
    && n.arguments.length === 1 && n.arguments[0].kind === ts.SyntaxKind.FalseKeyword);
  const elsewhere = unlearns.filter(n => ownerName(n) !== 'recheckStorageWrites');
  /* the held save's guard: an if on pendingSaves that returns, ahead of the first unlearn in the recheck */
  const first = unlearns.find(n => ownerName(n) === 'recheckStorageWrites');
  let guard = null;
  const walk = n => {
    if (ts.isIfStatement(n) && ownerName(n) === 'recheckStorageWrites' && n.expression.getText(sf) === 'pendingSaves.size > 0'
      && ts.isReturnStatement(n.thenStatement)) guard = n;
    ts.forEachChild(n, walk);
  };
  walk(sf);
  if (!unlearns.length) fail('nothing in the seam takes "full" back: this check is not reading the seam it thinks it is');
  else if (elsewhere.length) fail(`"full" is taken back outside the recheck (line ${elsewhere.map(n => `${lineOf(sf, n)} in ${ownerName(n) || 'module scope'}`).join(', ')}): a full store still takes a write that needs no room, so a taken write proves nothing`);
  else if (!first || !guard || guard.getStart(sf) > first.getStart(sf)) fail('the recheck does not return on "pendingSaves.size > 0" before it takes "full" back: the line would leave while a game still holds a refused save');
  else ok(`${unlearns.length} place takes "full" back, in recheckStorageWrites (line ${lineOf(sf, first)}), behind the held save's guard (line ${lineOf(sf, guard)})`);
}

/* ─── Section 7: a remembered refusal is named to the seam ──────────────── */

/* The lists. An entry covers one remembered refusal: a file and the keys the
   scan gives it there. Reasons name the line that shows them, as read on
   2026-10-10; the keys, not the lines, are what the harness holds. */
const NAMED = [
  { file: 'src/components/us-career/UsCareerBoard.tsx', keys: ['state:saveFailure'],
    why: 'the effect under retrySave holds the save while saveFailed (saveFailure !== null) is true, Round 1144' },
];
const NOTHING_HELD = [
  /* the seam and the pieces around it: none of them is a game's progress */
  { file: 'src/lib/safeStorage.ts', keys: ['write:setItem', 'write:flush', 'write:probeStorageWrites', 'write:safeSetItem'],
    why: 'the seam itself: its catches are how it learns the store is full' },
  { file: 'src/lib/freshBuild.ts', keys: ['write:check', 'write:reloadOnceForStaleChunk', 'keeps:reloadOnceForStaleChunk'],
    why: 'reload once markers in session storage; a refused marker means no reload, and it asks settlePendingSaves first' },
  { file: 'src/components/RouteErrorBoundary.tsx', keys: ['keeps:reloadOnceForStaleChunk'],
    why: 'the same reload once marker, asked from the error boundary' },
  { file: 'src/lib/brokenSaveRecovery.ts', keys: ['write:copyAside', 'write:restoreBackup', 'write:dismissBackup'],
    why: 'recovery of a save that would not open: each answers its caller and leaves the stored bytes where they were (Round 1219 moved the guarded write of moveAside into copyAside)' },
  { file: 'src/lib/saveKeeper.ts', keys: ['write:stageRestore', 'write:applyPending'],
    why: 'a put back that cannot be staged or applied changes nothing: the save stays at its key, the backup stays kept aside, and the card says so (Round 1219)' },
  { file: 'src/lib/completions.ts', keys: ['write:getGuestHandle'],
    why: 'a guest handle kept for the visit when it cannot be stored: a name, not progress' },
  /* a flag that says "seen", not a save */
  { file: 'src/pages/CollegeGrid.tsx', keys: ['state:showRules'],
    why: 'the rules seen flag could not be read or written, so the rules show again' },
  { file: 'src/components/conquest/ImperialismBoardShared.tsx', keys: ['write:(anonymous)'],
    why: 'the help seen flag: refused, the help does not open by itself' },
  { file: 'src/components/soccer-career/SquadSheet.tsx', keys: ['write:helpSeen', 'keeps:helpSeen'],
    why: 'the help seen flag: a browser that refuses storage sees the help again' },
  /* the game refused the action instead of keeping it */
  { file: 'src/lib/clubManagerSlots.ts', keys: ['write:switchSlot', 'write:switchSlot#2'],
    why: 'a refused switch is rolled back step by step and answers false (step 1 parks the outgoing career, step 3 seats the incoming one, each write with its own undo); the outgoing career never left its key' },
  { file: 'src/lib/clubManager.ts', keys: ['write:saveCareer'],
    why: 'answers false and holds nothing itself; the callers that keep the answer are listed under keeps:saveCareer' },
  { file: 'src/lib/managerHotSeat.ts', keys: ['keeps:saveCareer'],
    why: 'the hand over to Club Manager answers "failed" and writes nothing; the run stays in the hot seat save' },
  { file: 'src/lib/rankEmCircuit.ts', keys: ['write:saveCircuit'],
    why: 'answers false and holds nothing itself; RankEm.tsx keeps the answer and is listed' },
  { file: 'src/lib/squadDeal.ts', keys: ['write:saveScore'],
    why: 'a refused leaderboard row is dropped and the stored board is answered; nothing waits for a retry' },
  { file: 'src/hooks/useHofOrBust.ts', keys: ['keeps:safeSetItem'],
    why: 'a vote the browser will not keep is not sent, so one player is never counted once a visit; the verdict still shows' },
  { file: 'src/hooks/useStadiumTycoon.ts', keys: ['state:gearSaveBlocked', 'write:step'],
    why: 'title equipment is only awarded after the match is saved: refused, no equipment is added (allowGear = false)' },
  { file: 'src/hooks/useStadiumTycoon.ts', keys: ['state:setPieceError'],
    why: 'a kick that cannot be saved is not opened: doBeginSetPiece returns before commit' },
  { file: 'src/hooks/useStadiumTycoon.ts', keys: ['write:doPrestige'],
    why: 'a sale that cannot be saved does not happen: doPrestige returns false before the state changes' },
  { file: 'src/hooks/useStadiumTycoon.ts', keys: ['write:doSetPieceResult'],
    why: 'a goal that cannot be saved is not awarded: "save-failed" is answered before commit' },
  { file: 'src/components/tycoon/TycoonSaleReview.tsx', keys: ['state:saveFailed'],
    why: 'the sale was refused (doPrestige answered false): the notice says so and the ground is as it was' },
  { file: 'src/hooks/useWonderkidFactory.ts', keys: ['state:academySaveBlocked', 'state:packSaveBlocked', 'state:gearSaveBlocked', 'keeps:commitAcademy', 'keeps:deliverWaiting'],
    why: 'a move only reaches the screen after the whole academy is saved (commitAcademy, deliverWaiting, doDismissPack): refused, the move does not happen' },
  /* "the save on disk was bad", which is not a refused write */
  { file: 'src/pages/SoccerCareer.tsx', keys: ['state:saveError'],
    why: 'true when the stored save could not be opened (restoredSave.invalid), not when a write was refused' },
  { file: 'src/components/front-office/FrontOfficeBoard.tsx', keys: ['state:saveError'],
    why: 'the stored save could not be opened; the page offers to delete it' },
  { file: 'src/components/nhl-front-office/NhlFrontOfficeBoard.tsx', keys: ['state:saveError'],
    why: 'the stored save could not be opened; the page offers to delete it' },
  { file: 'src/components/mlb-front-office/MlbFrontOfficeBoard.tsx', keys: ['state:draftSaveError'],
    why: 'the stored save holds invalid draft information; it is still stored and the page offers to delete it' },
  { file: 'src/hooks/useClubManager.ts', keys: ['keeps:switchSlot'],
    why: 'a refused switch of manager leaves the active career where it was (switchSlot rolled it back)' },
];
const OWED = [
  { file: 'src/pages/SoccerCareer.tsx', keys: ['state:saveFailed'], owner: 'the other lane', listed: '2026-10-10',
    why: 'a refused save sets saveFailed and offers Retry save; a reload the app makes loses the progress since the last good write' },
  { file: 'src/hooks/useGame.ts', keys: ['state:practiceSaveFailed', 'state:unlimitedSaveFailed'], owner: 'the other lane', listed: '2026-10-10',
    why: 'the Footle practice run and the unlimited session play on in the page ("reloading may lose your progress")' },
  { file: 'src/pages/RankEm.tsx', keys: ['state:saveFailed', 'keeps:saveCircuit'], owner: 'the other lane', listed: '2026-10-10',
    why: 'the circuit plays on in the page after saveCircuit answers false' },
  { file: 'src/hooks/useClubManager.ts', keys: ['state:saveFailed', 'keeps:saveCareer'], owner: 'this lane, after Release AT lands (the train edits this file)', listed: '2026-10-10',
    why: 'the career plays on in the page under a banner while saveCareer answers false' },
  { file: 'src/hooks/useAussieRulesLeague.ts', keys: ['state:storageNotice'], owner: 'this lane', listed: '2026-10-10',
    why: '"Your season is running here, but this browser could not save it": the season lives in the page' },
  { file: 'src/hooks/useAussieRulesManager.ts', keys: ['state:storageNotice'], owner: 'this lane', listed: '2026-10-10',
    why: 'the same words and the same shape as the league hook' },
  { file: 'src/hooks/useStadiumTycoon.ts', keys: ['state:ticketSaveFailed', 'keeps:saveTicketState'], owner: 'to be named by the lead', listed: '2026-10-10',
    why: 'a ticket policy is committed to the page first and saved after; refused, the card offers a retry and the seam is not told' },
  { file: 'src/lib/tycoonRewards.ts', keys: ['write:saveLedger'], owner: 'to be named by the lead', listed: '2026-10-10',
    why: 'a refused ledger write sets memoryOnly: the gems last for this visit only' },
  { file: 'src/hooks/useMmaPromotion.ts', keys: ['write:change'], owner: 'to be named by the lead', listed: '2026-10-10',
    why: 'a refused write sets blocked.current and the session carries on in the page under its notice' },
  { file: 'src/hooks/useNbaConnections.ts', keys: ['state:notesWarning'], owner: 'to be named by the lead (low: scratch notes, the daily result has its own save)', listed: '2026-10-10',
    why: 'the working groups stay in the page when their write is refused' },
  { file: 'src/hooks/useNhlConnections.ts', keys: ['state:notesWarning'], owner: 'to be named by the lead (low: scratch notes, the daily result has its own save)', listed: '2026-10-10',
    why: 'the working groups stay in the page when their write is refused' },
  { file: 'src/hooks/useGamePicks.ts', keys: ['write:toggle'], owner: 'to be named by the lead (low: a list of pinned games, not a game)', listed: '2026-10-10',
    why: 'pinned games are kept for the visit when their write is refused' },
];
/* Measured on 2026-10-10: 56 keys in 32 files (1 named, 39 with nothing held,
   16 owed; 55 before a function's second write got a key of its own). Well under that and the scan is not reading the tree it thinks
   it is. */
const SITE_FLOOR = 45;

console.log('7. a save a game remembers was refused is named to the seam, or listed with the reason it need not be');
let owedTotal = 0;
{
  const each = (root, visit) => { const walk = n => { visit(n); ts.forEachChild(n, walk); }; walk(root); };
  /** The function a node runs in, through useCallback and its like, or where it is otherwise. */
  const siteOwner = node => {
    for (let n = node.parent; n; n = n.parent) {
      if (!isFunction(n)) continue;
      if (n.name && ts.isIdentifier(n.name)) return n.name.text;
      const p = n.parent;
      if (p && ts.isVariableDeclaration(p) && ts.isIdentifier(p.name)) return p.name.text;
      if (p && ts.isCallExpression(p) && p.parent && ts.isVariableDeclaration(p.parent) && ts.isIdentifier(p.parent.name)) return p.parent.name.text;
      return '(anonymous)';
    }
    return '(module)';
  };
  const tryAround = node => {
    for (let n = node; n.parent; n = n.parent) {
      const p = n.parent;
      if (ts.isTryStatement(p) && p.tryBlock === n && p.catchClause) return p;
      if (isFunction(p)) return null;
    }
    return null;
  };
  const NOT_STATE = new Set(['setTimeout', 'setInterval']);
  const isSetter = name => /^set[A-Z]/.test(name) && !NOT_STATE.has(name);
  const stateOf = setter => setter[3].toLowerCase() + setter.slice(4);
  const saysSaveFailed = name => /save/i.test(name) && /(fail|refus|block|error)/i.test(name);
  const calleeName = n => ts.isIdentifier(n.expression) ? n.expression.text : ts.isPropertyAccessExpression(n.expression) ? n.expression.name.text : '';

  if (CONTROL === 'newsite') {
    const bare = sourceFiles().find(f => !read(f).includes('.setItem(') && !read(f).includes('useState'));
    if (!bare) { console.error('REFUSING TO RUN: control newsite found no file without a storage write to plant in.'); process.exit(2); }
    plant(rel(bare), "function plantedRefusedSave(setPlantedNotice: (v: boolean) => void) { try { localStorage.setItem('planted', '1'); } catch { setPlantedNotice(true); } }");
    aim.what = `${rel(bare)} state:plantedNotice`;
  }
  if (CONTROL === 'stale') {
    const entry = OWED.find(o => o.keys.some(k => k.startsWith('state:')));
    if (!entry) { console.error('REFUSING TO RUN: control stale found no OWED entry with a state to plant a hold for.'); process.exit(2); }
    const state = entry.keys.find(k => k.startsWith('state:')).slice('state:'.length);
    plant(entry.file, `function plantedHold() { if (!${state}) return undefined; return holdPendingSave(() => true); }`);
    aim.what = `${entry.file} ${entry.keys.join(' + ')}`;
  }
  if (CONTROL === 'unnamed' || CONTROL === 'deadhold') aim.what = `${NAMED[0].file} ${NAMED[0].keys.join(' + ')}`;
  /* The controls below bring their own file and their own list entry, so
     they keep working whatever the lists hold on the day. */
  const plantFile = () => {
    const bare = sourceFiles().find(f => !read(f).includes('.setItem(') && !read(f).includes('useState'));
    if (!bare) { console.error(`REFUSING TO RUN: control ${CONTROL} found no file without a storage write to plant in.`); process.exit(2); }
    return rel(bare);
  };
  if (CONTROL === 'partial') {
    const file = plantFile();
    plant(file, "function usePlantedTwoSaves() { const [plantedOneBlocked, setPlantedOneBlocked] = useState(false); const [plantedTwoBlocked, setPlantedTwoBlocked] = useState(false); const saveOne = () => { try { localStorage.setItem('planted-one', '1'); } catch { setPlantedOneBlocked(true); } }; const saveTwo = () => { try { localStorage.setItem('planted-two', '1'); } catch { setPlantedTwoBlocked(true); } }; useEffect(() => { if (!plantedOneBlocked) return undefined; return holdPendingSave(() => true); }, [plantedOneBlocked]); return { saveOne, saveTwo, plantedTwoBlocked }; }");
    OWED.push({ file, keys: ['state:plantedOneBlocked', 'state:plantedTwoBlocked'], owner: 'the control', listed: 'in memory', why: 'two refused saves in one hook, one of them held' });
    aim.what = `${file} partly: state:plantedOneBlocked named, state:plantedTwoBlocked still owed`;
  }
  if (CONTROL === 'second') {
    const file = plantFile();
    plant(file, "function plantedTwoRefusals() { try { localStorage.setItem('planted-a', '1'); } catch { return false; } try { localStorage.setItem('planted-b', '1'); } catch { return false; } return true; }");
    NOTHING_HELD.push({ file, keys: ['write:plantedTwoRefusals'], why: 'the control: an entry written when the function had one write' });
    aim.what = `${file} write:plantedTwoRefusals#2`;
  }
  if (CONTROL === 'twolists') {
    OWED.push({ file: NAMED[0].file, keys: [NAMED[0].keys[0]], owner: 'the control', listed: 'in memory', why: 'the same key as the first NAMED entry' });
    aim.what = `${NAMED[0].file} ${NAMED[0].keys[0]} twice`;
  }
  if (CONTROL === 'gone') {
    NOTHING_HELD.push({ file: NOTHING_HELD[0].file, keys: ['write:plantedNeverWritten'], why: 'the control: a key no write gives' });
    aim.what = `${NOTHING_HELD[0].file} write:plantedNeverWritten gone`;
  }
  if (CONTROL === 'floor') aim.what = 'the floor';

  const files = CONTROL === 'floor' ? sourceFiles().filter(f => rel(f).startsWith('src/lib/')) : sourceFiles();
  if (CONTROL === 'floor') console.log(`   control floor: the scan reads src/lib alone, ${files.length} of ${sourceFiles().length} files, in memory`);
  /** file -> key -> the first line that gave it */
  const sites = new Map();
  const add = (file, key, line) => {
    if (!sites.has(file)) sites.set(file, new Map());
    if (!sites.get(file).has(key)) sites.get(file).set(key, line);
  };
  /** A function's second remembered refusal is a refusal of its own:
   *  write:step, then write:step#2, in the order the file has them (review of
   *  Round 1210: with one key a function, a new one rode on the old entry and
   *  nobody had to answer for it). */
  const writesIn = new Map();
  const addWrite = (file, owner, line) => {
    const id = `${file} ${owner}`;
    const nth = (writesIn.get(id) ?? 0) + 1;
    writesIn.set(id, nth);
    add(file, nth === 1 ? `write:${owner}` : `write:${owner}#${nth}`, line);
  };
  const parsed = new Map();
  const tree = full => { if (!parsed.has(full)) parsed.set(full, parse(full)); return parsed.get(full); };
  const answers = new Set(['safeSetItem']);
  let guardedWrites = 0;
  let emptyCatches = 0;
  for (const full of files) {
    const text = read(full);
    if (text.includes('.setItem(')) {
      const sf = tree(full);
      for (const w of calls(sf, n => ts.isPropertyAccessExpression(n.expression) && n.expression.name.text === 'setItem')) {
        const t = tryAround(w);
        if (!t) continue;
        guardedWrites += 1;
        const block = t.catchClause.block;
        if (!block.statements.length) { emptyCatches += 1; continue; }
        const setters = new Set();
        let answersFalse = false;
        each(block, c => {
          if (ts.isCallExpression(c) && ts.isIdentifier(c.expression) && isSetter(c.expression.text)) setters.add(c.expression.text);
          if (ts.isReturnStatement(c) && c.expression && c.expression.kind === ts.SyntaxKind.FalseKeyword) answersFalse = true;
        });
        const owner = siteOwner(w);
        if (answersFalse && owner !== '(anonymous)' && owner !== '(module)') answers.add(owner);
        if (setters.size) for (const s of setters) add(rel(full), `state:${stateOf(s)}`, lineOf(sf, w));
        else addWrite(rel(full), owner, lineOf(sf, w));
      }
    }
    if (text.includes('useState') && /save/i.test(text)) {
      const sf = tree(full);
      each(sf, n => {
        if (!ts.isVariableDeclaration(n) || !ts.isArrayBindingPattern(n.name) || !n.initializer || !ts.isCallExpression(n.initializer)) return;
        if (!/^(React\.)?useState$/.test(n.initializer.expression.getText(sf))) return;
        const first = n.name.elements[0];
        const state = first && ts.isBindingElement(first) && ts.isIdentifier(first.name) ? first.name.text : '';
        if (saysSaveFailed(state)) add(rel(full), `state:${state}`, lineOf(sf, n));
      });
    }
  }
  /* one hop: who keeps the answer of a function that answers false */
  for (const full of files) {
    const text = read(full);
    if (![...answers].some(name => text.includes(name + '('))) continue;
    const sf = tree(full);
    for (const c of calls(sf, n => answers.has(calleeName(n)))) {
      if (ts.isExpressionStatement(c.parent) || ts.isVoidExpression(c.parent)) continue;
      add(rel(full), `keeps:${calleeName(c)}`, lineOf(sf, c));
    }
  }

  const holdsIn = file => calls(tree(path.join(ROOT, file)), n => ts.isIdentifier(n.expression) && n.expression.text === 'holdPendingSave');
  /** The names that tie a hold to a key. For state:<name> the state and every
   *  const made from it; for write:<owner> and keeps:<callee> the function's
   *  own name (a retry calls the save again). A key with no name of its own,
   *  write:(anonymous) or write:(module), cannot be tied to a hold. */
  const spellings = (sf, key) => {
    const base = key.replace(/#\d+$/, '');
    const name = base.slice(base.indexOf(':') + 1);
    if (name.startsWith('(')) return null;
    const names = new Set([name]);
    if (!base.startsWith('state:')) return names;
    for (let grew = true; grew;) {
      grew = false;
      each(sf, n => {
        if (!ts.isVariableDeclaration(n) || !ts.isIdentifier(n.name) || !n.initializer || names.has(n.name.text)) return;
        let reads = false;
        let makesFunction = false;
        each(n.initializer, c => { if (ts.isIdentifier(c) && names.has(c.text)) reads = true; if (isFunction(c)) makesFunction = true; });
        if (reads && !makesFunction) { names.add(n.name.text); grew = true; }
      });
    }
    return names;
  };
  /** Is THIS key named to the seam? Judged at the hold, one key at a time:
   *  the function that calls holdPendingSave (the innermost one, an effect's
   *  own callback, with the retry it hands over) must spell one of the key's
   *  names, or the hook call it is handed to must list one in its
   *  dependencies. The climb stops there. It used to go on through every
   *  enclosing function, and the outermost is the component or hook that
   *  declares the state, so one hold anywhere in a hook passed for every save
   *  the hook keeps (review of Round 1210, both reviewers; the controls
   *  deadhold and partial hold this). */
  const holdsKey = (file, key) => {
    const sf = tree(path.join(ROOT, file));
    const names = spellings(sf, key);
    if (!names) return false;
    const spells = node => { let found = false; each(node, c => { if (ts.isIdentifier(c) && names.has(c.text)) found = true; }); return found; };
    return holdsIn(file).some(h => {
      let fn = h.parent;
      while (fn && !isFunction(fn)) fn = fn.parent;
      if (!fn) return false;
      if (spells(fn)) return true;
      const hook = fn.parent;
      return !!hook && ts.isCallExpression(hook) && hook.arguments.some(a => a !== fn && ts.isArrayLiteralExpression(a) && spells(a));
    });
  };
  /** The keys of an entry that are judged at the hold: its states, one by
   *  one. The write: and keeps: keys of an entry that has a state are the
   *  same refusal seen from the write and ride with the states; an entry with
   *  no state is judged by those keys, one by one. */
  const judged = entry => { const states = entry.keys.filter(k => k.startsWith('state:')); return states.length ? states : entry.keys; };
  const spell = entry => `{ file: '${entry.file}', keys: [${entry.keys.map(k => `'${k}'`).join(', ')}] }`;

  const bad = [];
  const total = [...sites.values()].reduce((s, m) => s + m.size, 0);
  if (total < SITE_FLOOR) {
    bad.push(`only ${total} keys found, under the floor of ${SITE_FLOOR}: the scan is not reading the tree it thinks it is`);
    if (aim.what === 'the floor') aim.fired = true;
  }
  const lists = [['NAMED', NAMED], ['NOTHING_HELD', NOTHING_HELD], ['OWED', OWED]];
  const covered = new Map();
  for (const [listName, list] of lists) {
    for (const entry of list) {
      for (const key of entry.keys) {
        const id = `${entry.file} ${key}`;
        if (covered.has(id)) {
          bad.push(`${id} is on two lists (${covered.get(id)} and ${listName}): one refusal, one answer`);
          if (aim.what === `${id} twice`) aim.fired = true;
        }
        covered.set(id, listName);
        if (!sites.get(entry.file)?.has(key)) {
          bad.push(`${listName} is stale: the scan no longer finds ${key} in ${entry.file}. Delete or correct the entry ${spell(entry)} in scripts/simStorageWrites.mjs`);
          if (aim.what === `${id} gone`) aim.fired = true;
        }
      }
    }
  }
  for (const [file, keys] of sites) {
    for (const [key, line] of keys) {
      if (covered.has(`${file} ${key}`)) continue;
      bad.push(`${file}:${line} ${key} is on no list: a refused save is remembered here. Name it to the seam (holdPendingSave, see UsCareerBoard.tsx) and add it to NAMED, or add it to NOTHING_HELD or OWED with the reason`);
      if (aim.what === `${file} ${key}`) aim.fired = true;
    }
  }
  for (const entry of NAMED) {
    const unheld = judged(entry).filter(k => !holdsKey(entry.file, k));
    if (!unheld.length) continue;
    const holds = holdsIn(entry.file).length;
    bad.push(`NAMED names nothing for ${unheld.join(' and ')}: ${entry.file} has ${holds} holdPendingSave call(s) and none sits in a function that reads it (the state or a const made from it, or the save function by name, in the function's own body or its hook's dependency list), so a reload would throw the refused save away. A hold answers for the save its own function reads, never for the whole file`);
    if (aim.what === `${entry.file} ${entry.keys.join(' + ')}` && (CONTROL !== 'deadhold' || holds > 0)) aim.fired = true;
  }
  for (const entry of OWED) {
    if (!sites.has(entry.file)) continue;
    const keys = judged(entry);
    const held = keys.filter(k => holdsKey(entry.file, k));
    if (!held.length) continue;
    if (held.length === keys.length) {
      bad.push(`OWED is stale: ${entry.file} now names this save to the seam. Delete the entry ${spell(entry)} from OWED in scripts/simStorageWrites.mjs and add it to NAMED (the fix is good, the list is behind)`);
      if (aim.what === `${entry.file} ${entry.keys.join(' + ')}`) aim.fired = true;
      continue;
    }
    const rest = keys.filter(k => !held.includes(k));
    bad.push(`OWED is partly stale: ${entry.file} now names ${held.join(' and ')} to the seam and still does not name ${rest.join(' and ')}. In scripts/simStorageWrites.mjs take only ${held.join(' and ')} out of the entry ${spell(entry)} and give it a NAMED entry of its own; ${rest.join(' and ')} stays in OWED (a hold answers for the save its own function reads, not for the others in the file)`);
    if (aim.what === `${entry.file} partly: ${held.join(' + ')} named, ${rest.join(' + ')} still owed`) aim.fired = true;
  }
  owedTotal = OWED.length;
  const count = list => list.reduce((s, e) => s + e.keys.length, 0);
  if (bad.length) { fail(`${bad.length} remembered refusal(s) without a true answer:`); for (const b of bad) console.log('           ' + b); }
  else ok(`${guardedWrites} guarded writes, ${emptyCatches} with an empty catch; ${total} keys in ${sites.size} files, each on one list: ${count(NAMED)} named to the seam (${NAMED.length} entry), ${count(NOTHING_HELD)} with nothing held (${NOTHING_HELD.length} entries), ${count(OWED)} owed (${OWED.length} entries)`);
  for (const entry of OWED) console.log(`           owed: ${entry.file} [${entry.keys.join(', ')}], owner ${entry.owner}, listed ${entry.listed}`);
}

const AIMED = ['unnamed', 'newsite', 'stale', 'deadhold', 'partial', 'second', 'twolists', 'gone', 'floor'].includes(CONTROL);
if (AIMED && !aim.fired) {
  console.log(`\nsimStorageWrites (control ${CONTROL}): DID NOT FIRE. Section 7 never named ${aim.what}, so its green proves nothing (${failures} failed for another reason)`);
  process.exit(3);
}
console.log(`\nsimStorageWrites${CONTROL ? ` (control ${CONTROL})` : ''}: ${failures === 0 ? 'all green' : failures + ' failed'}${AIMED ? `, the control FIRED on ${aim.what}` : ''} (owed: ${owedTotal})`);
process.exit(failures ? 1 : 0);
