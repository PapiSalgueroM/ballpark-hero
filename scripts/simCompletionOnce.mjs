/* Completion once harness: a finish restored from storage is not a new finish.

   Round 399. useGameCompletion recorded a completion whenever isComplete was
   true and a per-mount ref said it had not yet, so every game that restores a
   finished state from localStorage recorded it again on every visit: another
   anonymous row, and for a signed in player the score added to their points
   again. Measured 2026-09-01: 1,516 of 3,039 signed in saves outside the two
   big sims were repeats of a same day save, 152 of 234 accounts, 596,072
   points, a retired Soccer Career legacy re-paid on every reload. Some of
   those repeats are honest replays (the result screen records a play-again
   on purpose, Missing XI replays through Play Again), which is why the fix
   is the mechanism, not a database rule.

   Two restore shapes, two rules. A game that restores in a state initializer
   is complete on its first render, so the hook records only a transition it
   witnessed. useDailyPuzzle (38 games) restores in an effect after mount,
   which to the hook is a transition, so that hook announces a restored
   finish through src/lib/restoredFinish.ts and the completion hook consumes
   the mark before recording.

   WHAT THIS HOLDS:
     1. THE HOOK, RENDERED. src/hooks/useGameCompletion.test.ts renders the
        real hook: mounting already complete records nothing, a restored
        finish records nothing and a later real one records once, a witnessed
        finish records once, a reset and a new finish records again.
     2. THE LIB'S DIRECT CALLERS, AS CODE. Every recordCompletion call outside
        the hook sits in an event handler or a guarded mount that a replay
        legitimately reaches, never at module scope and never in a bare
        effect keyed on restored state. Read as code, comments stripped. A
        per mount latch satisfies this and only holds on a page that does
        not restore its finished state; the bracket page persists its latch
        for that reason.
     3. THE DAILY HOOK SAYS SO, AS CODE. useDailyPuzzle's restore path calls
        markRestoredFinish before it sets a status it read from storage, and
        the completion hook calls consumeRestoredFinish before it records.

   NEGATIVE CONTROLS (house rule: prove each check can fail):
     SIM_COMPLETION_CONTROL=mount    a copy of the hook without the witness
                                     rule; the mounts-finished case must fail
                                     while the other three pass on the copy.
     SIM_COMPLETION_CONTROL=restore  a copy of the hook that ignores the
                                     restore mark; the restored case must fail
                                     while the other three pass.
     SIM_COMPLETION_CONTROL=silent   the daily hook's mark call removed in
                                     memory; section 3 must go red.
   Each control refuses to run if what it rewrites is not there, and is
   judged on its own section only.

   Run: node scripts/simCompletionOnce.mjs
*/
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.SIM_COMPLETION_CONTROL || '';
const TEST = 'src/hooks/useGameCompletion.test.ts';
const failures = { 1: 0, 2: 0, 3: 0 };
let section = 1;
const fail = m => { failures[section] += 1; console.error('  FAIL: ' + m); };
const abort = m => { console.error(m); process.exit(1); };
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8').split('\r\n').join('\n');
const stripComments = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

function runVitest(extraEnv) {
  const r = spawnSync(process.execPath, [path.join(ROOT, 'node_modules', 'vitest', 'vitest.mjs'), 'run', TEST],
    { cwd: ROOT, encoding: 'utf8', env: { ...process.env, ...extraEnv, CI: '1', FORCE_COLOR: '0', NO_COLOR: '1' }, maxBuffer: 64 * 1024 * 1024 });
  return { code: r.status, out: (r.stdout || '') + (r.stderr || '') };
}

section = 1;
console.log('1) The real hook, rendered: a restored finish records nothing, a witnessed finish records once');
{
  let env = {};
  let copy = null;
  if (CONTROL === 'mount' || CONTROL === 'restore') {
    const src = read('src/hooks/useGameCompletion.ts');
    const regressed = CONTROL === 'mount'
      ? src.replace(/const seenIncompleteRef = useRef\(!isComplete\);/, 'const seenIncompleteRef = useRef(true);')
      : src.replace('if (consumeRestoredFinish(gameSlug)) return;', 'if (consumeRestoredFinish(gameSlug) && false) return;');
    if (regressed === src) abort(`control cannot run: the hook is not in the shape the "${CONTROL}" control rewrites`);
    const dir = path.join(ROOT, 'dist', '.completion-control');
    fs.mkdirSync(dir, { recursive: true });
    copy = path.join(dir, 'useGameCompletion.control.ts');
    fs.writeFileSync(copy, regressed);
    env = { COMPLETION_HOOK: copy.replaceAll('\\', '/') };
    console.log(`   NEGATIVE CONTROL ON: the test runs against a copy of the hook with the "${CONTROL}" rule removed`);
  }
  let code, out;
  try { ({ code, out } = runVitest(env)); } finally { if (copy) fs.rmSync(path.dirname(copy), { recursive: true, force: true }); }
  if (!out.includes('useGameCompletion.test.ts')) abort('vitest did not report on the test file at all, so nothing was checked:\n' + out.slice(-1500));
  const summary = out.match(/Tests\s+(.+)/);
  console.log(`   vitest exit ${code}, ${summary ? summary[1].trim() : 'no summary line'}`);
  if (CONTROL === 'mount' || CONTROL === 'restore') {
    if (/Failed to load|Cannot find module|SyntaxError|Failed to resolve import/.test(out)) abort('control cannot run: the rewritten hook did not load:\n' + out.slice(-1500));
    const others = {
      mount: ['records a finish it witnessed exactly once', 'records again after a reset', 'daily puzzle hook restored'],
      restore: ['mounts already finished', 'records a finish it witnessed exactly once', 'records again after a reset'],
    }[CONTROL];
    const target = { mount: 'mounts already finished', restore: 'daily puzzle hook restored' }[CONTROL];
    const loaded = others.every(n => new RegExp('✓.*' + n).test(out));
    if (!loaded) abort('control cannot run: the other three tests did not pass on the copy, so a red here is a load error and not the check');
    if (new RegExp('×.*' + target).test(out) && /AssertionError|expected/.test(out)) fail(`with the "${CONTROL}" control on, the "${target}" case fails on its assertion, as it should`);
  } else {
    if (code !== 0) fail('the hook test is red:\n    ' + out.split('\n').filter(l => /×|FAIL|AssertionError|expected/.test(l)).slice(0, 8).join('\n    '));
    if (!/4 passed/.test(out)) fail(`expected all four tests to pass, vitest says: ${summary ? summary[1].trim() : 'nothing'}`);
  }
}

section = 2;
console.log("2) The lib's direct callers, as code: no completion is recorded from a bare effect on restored state");
{
  const walk = (dir, out = []) => { for (const e of fs.readdirSync(dir, { withFileTypes: true })) { const p = path.join(dir, e.name); if (e.isDirectory()) walk(p, out); else if (/\.tsx?$/.test(e.name) && !/\.test\.tsx?$/.test(e.name)) out.push(p); } return out; };
  let sites = 0;
  for (const file of walk(path.join(ROOT, 'src'))) {
    const rel = path.relative(ROOT, file).replaceAll('\\', '/');
    if (rel === 'src/lib/completions.ts' || rel === 'src/hooks/useGameCompletion.ts') continue;
    const code = stripComments(fs.readFileSync(file, 'utf8'));
    for (const m of code.matchAll(/recordCompletion\(/g)) {
      sites += 1;
      const before = code.slice(Math.max(0, m.index - 400), m.index);
      /* a call reached through useEffect must sit behind a ref latch */
      const inEffect = /useEffect\(\s*\(\)\s*=>\s*\{[^}]*$/.test(before);
      if (inEffect && !/\w+\.current\s*=/.test(before)) fail(`${rel}: recordCompletion inside a useEffect without a ref latch, a restored state would record on every mount`);
      /* module scope: no function boundary between the file start and the call */
      const line = code.slice(0, m.index).split('\n').length;
      const indent = (code.split('\n')[line - 1].match(/^\s*/) || [''])[0].length;
      if (indent === 0) fail(`${rel}:${line}: recordCompletion at module scope, loading the page would record a play`);
    }
  }
  console.log(`   ${sites} direct call sites read`);
}

section = 3;
console.log("3) The daily hook says so, as code: the restore marks itself and the completion hook asks first");
{
  let daily = stripComments(read('src/hooks/useDailyPuzzle.ts'));
  if (CONTROL === 'silent') {
    const quiet = daily.replace(/^\s*if \(saved\.gameStatus !== 'playing'\) markRestoredFinish\(gameSlug\);\n/m, '');
    if (quiet === daily) abort('control cannot run: the daily hook has no mark call to remove');
    daily = quiet;
    console.log('   NEGATIVE CONTROL ON: the daily hook restores a finished status without saying so, in memory');
  }
  const set = daily.indexOf('setGameStatus(saved.gameStatus)');
  if (set < 0) fail('useDailyPuzzle no longer restores through setGameStatus(saved.gameStatus), the check needs re-anchoring');
  const before = set < 0 ? '' : daily.slice(Math.max(0, set - 300), set);
  if (set >= 0 && !/markRestoredFinish\(gameSlug\)/.test(before)) fail('useDailyPuzzle sets a restored status without calling markRestoredFinish(gameSlug) first, so every reload of a finished daily is a completion again');
  const hook = stripComments(read('src/hooks/useGameCompletion.ts'));
  const consume = hook.indexOf('consumeRestoredFinish(gameSlug)');
  const record = hook.indexOf('recordCompletion(');
  if (consume < 0 || record < 0 || consume > record) fail('useGameCompletion does not ask consumeRestoredFinish(gameSlug) before it records');
  console.log(`   mark before restore: ${/markRestoredFinish\(gameSlug\)/.test(before)}, consume before record: ${consume >= 0 && record >= 0 && consume < record}`);
}

const own = { mount: 1, restore: 1, silent: 3 }[CONTROL];
const total = failures[1] + failures[2] + failures[3];
if (CONTROL) {
  if (!own) abort(`unknown control "${CONTROL}" (mount, restore, silent)`);
  if (failures[own] > 0) { console.log(`\ncontrol "${CONTROL}": ${failures[own]} failure(s) fired in section ${own} as expected, the check works`); process.exit(0); }
  abort(`\ncontrol "${CONTROL}": changed NOTHING in section ${own}, the check is dead`);
}
if (total > 0) { console.error(`\nsimCompletionOnce: ${total} failure(s)`); process.exit(1); }
console.log('\nsimCompletionOnce: all green');
