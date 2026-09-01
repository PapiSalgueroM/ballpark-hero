/**
 * Round 365: every useDailyPuzzle caller honours the contract its selection
 * memo depends on.
 *
 * THE CONTRACT, in useDailyPuzzle's own words. Its puzzle selection memo lists
 * only [supabasePuzzle, todayStr] and carries an eslint-disable plus a comment
 * saying "puzzles and getPuzzleId are expected to be stable references
 * (module-level arrays / functions defined outside the render cycle)". That is
 * a deliberate design: the memo is narrow because it gates the localStorage
 * restore, and widening it would reset in progress boards for every consumer
 * the moment a pool lands. So the real selection is meant to arrive through
 * supabasePuzzle.
 *
 * WHAT BREAKS WHEN A CALLER IGNORES IT, measured on transfer-path before this
 * round. It passed `puzzles: puzzlePool`, which is STATE: it starts as the 21
 * entry fallback and becomes the 902 row live pool when the fetch lands. The
 * memo never re-ran, so the daily was always drawn from those 21 and 881
 * puzzles could never appear. Worse, both pools are fetched but only the PLAYER
 * pool was consumed, so the served puzzle was a fallback puzzle validated
 * against live careers. The fallback file's header states that its minimums and
 * hints are derived from the fallback player pool and that the live table
 * "carries its own hints, which differ where the pools differ". That is the
 * Round 294 hint versus rule mismatch arriving by a different route.
 *
 * WHY A SOURCE CHECK AND NOT A DATA CHECK. simTransferPathHints already
 * verifies fallback against fallback and live against live, and it passed
 * throughout, because each pool is internally consistent. The defect was the
 * PAIRING, produced by a React dependency array. No amount of data checking
 * sees that. This reads the shape instead.
 *
 * What it holds:
 *   1. Every useDailyPuzzle caller either passes a module-level array as
 *      `puzzles`, or passes `supabasePuzzle` as well. Passing anything
 *      component scoped as `puzzles` with no supabasePuzzle is the defect and
 *      fails. Round 384: "component scoped" and not "declared with useState".
 *      The first version of this scan looked for useState names, and
 *      useGame.ts passed a useMemo derived from state, which it called a
 *      module-level ref. Footle's daily came from the 748 entry fallback file
 *      for as long as that verdict was green, with the live pool at 1,507.
 *      A name is module level when the file declares it at column zero or
 *      imports it; everything else lives inside the component.
 *   2. Every caller that passes supabasePuzzle also passes getPuzzleId, because
 *      without it the restore cannot tell one puzzle from another.
 *
 * NEGATIVE CONTROLS: DPCONTRACT_CONTROL=memo rewrites useGame's call to its
 * pre-Round-384 shape (puzzles: dailyPool, the useMemo, no supabasePuzzle) in
 * memory and section 1 must go red on it, which the useState scan could not.
 * DPCONTRACT_CONTROL=regress rewrites useTransferPath's in
 * memory copy back to the shape it had before this round (state as `puzzles`,
 * no supabasePuzzle), refusing to run if that shape is not there to restore,
 * and section 1 must go red.
 *
 * Run: node scripts/simDailyPuzzleContract.mjs   (no database needed)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.DPCONTRACT_CONTROL || '';
if (CONTROL && !(['regress', 'memo'].includes(CONTROL))) {
  console.error(`DPCONTRACT_CONTROL=${CONTROL} is not a control this harness knows`);
  process.exit(1);
}

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.tsx?$/.test(e.name)) out.push(p);
  }
  return out;
}

/* Comments are stripped before matching. This repo has been bitten repeatedly
   by a guard satisfied by the prose explaining the guard, and the note added to
   useTransferPath in this round contains the words "puzzles" and
   "supabasePuzzle" many times over. */
const code = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const files = walk(path.join(ROOT, 'src'))
  .map(p => ({ rel: path.relative(ROOT, p).replaceAll('\\', '/'), src: fs.readFileSync(p, 'utf8') }))
  .filter(f => /useDailyPuzzle\s*[<(]/.test(code(f.src)) && !f.rel.endsWith('useDailyPuzzle.ts'));

console.log('1) no caller passes anything component scoped as `puzzles` without a supabasePuzzle');
{
  console.log(`   ${files.length} hooks call useDailyPuzzle`);
  if (files.length < 5) fail(`only ${files.length} callers found, so this scan is not reading the source properly`);

  for (const f of files) {
    let c = code(f.src);

    if (CONTROL === 'memo' && f.rel.endsWith('useGame.ts')) {
      const before = c;
      c = c.replace(/puzzles:\s*players,\s*supabasePuzzle:\s*todaysTarget,\s*getPuzzleId:[^,]+,/, 'puzzles: dailyPool,');
      if (c === before) { console.error('control cannot run: useGame is not in the shape this control rewrites'); process.exit(1); }
      console.log('   NEGATIVE CONTROL ON: useGame rewritten to its pre-Round-384 shape, section 1 must go red');
    }
    if (CONTROL === 'regress' && f.rel.endsWith('useTransferPath.ts')) {
      const before = c;
      c = c.replace(/puzzles:\s*fallbackPuzzles,\s*supabasePuzzle:\s*todaysPuzzle,\s*getPuzzleId:[^,]+,/, 'puzzles: puzzlePool,');
      if (c === before) { console.error('control cannot run: useTransferPath is not in the shape this control rewrites'); process.exit(1); }
      console.log('   NEGATIVE CONTROL ON: useTransferPath rewritten to its pre-Round-365 shape, section 1 must go red');
    }

    /* Every name this file declares at module level or imports. Anything
       else is component scoped: state, a memo over state, a plain array
       literal rebuilt on render. None of those can be `puzzles` alone. */
    const moduleNames = new Set([
      ...[...c.matchAll(/^(?:export\s+)?(?:const|let|var|function)\s+([A-Za-z_$][\w$]*)/gm)].map(m => m[1]),
      ...[...c.matchAll(/^import\s+(?:type\s+)?\{([^}]*)\}\s*from/gm)].flatMap(m => m[1].split(',').map(x => x.trim().split(/\s+as\s+/).pop()).filter(Boolean)),
      ...[...c.matchAll(/^import\s+([A-Za-z_$][\w$]*)\s*(?:,|from)/gm)].map(m => m[1]),
    ]);

    /* The options object of each useDailyPuzzle call. Bounded window, and the
       bound is generous because these option blocks carry inline callbacks. */
    for (const call of c.matchAll(/useDailyPuzzle\s*(?:<[^>]*>)?\s*\(\s*\{/g)) {
      const body = c.slice(call.index, call.index + 1200);
      const puzzlesArg = body.match(/puzzles:\s*([A-Za-z_$][\w$]*)/);
      if (!puzzlesArg) continue;
      const name = puzzlesArg[1];
      const hasSupabase = /supabasePuzzle:/.test(body);
      const isModule = moduleNames.has(name);
      const verdict = isModule ? 'module-level ref' : (hasSupabase ? 'component scoped + supabasePuzzle' : 'COMPONENT SCOPED, NO supabasePuzzle');
      console.log(`   ${f.rel.padEnd(40)} puzzles: ${name.padEnd(16)} ${verdict}`);
      if (!isModule && !hasSupabase) {
        fail(`${f.rel} passes the component scoped "${name}" as \`puzzles\` and no supabasePuzzle, so the selection memo never re-runs and the daily is frozen to whatever that value held on the first render`);
      }
    }
  }
}

console.log('2) every caller that passes supabasePuzzle also passes getPuzzleId');
{
  let checked = 0;
  for (const f of files) {
    const c = code(f.src);
    for (const call of c.matchAll(/useDailyPuzzle\s*(?:<[^>]*>)?\s*\(\s*\{/g)) {
      const body = c.slice(call.index, call.index + 1200);
      if (!/supabasePuzzle:/.test(body)) continue;
      checked += 1;
      if (!/getPuzzleId:/.test(body)) {
        fail(`${f.rel} passes supabasePuzzle without getPuzzleId, so the saved board cannot be matched to the puzzle it belongs to`);
      }
    }
  }
  console.log(`   ${checked} callers pass supabasePuzzle, all with getPuzzleId`);
}

console.log('');
if (CONTROL) {
  if (failures > 0) { console.log(`simDailyPuzzleContract control "${CONTROL}": green. The old shape was caught (${failures} finding${failures === 1 ? '' : 's'}).`); process.exit(0); }
  console.error(`simDailyPuzzleContract control "${CONTROL}": RED. The old shape passed.`);
  process.exit(1);
}
if (failures > 0) { console.error(`simDailyPuzzleContract: ${failures} failure${failures === 1 ? '' : 's'}`); process.exit(1); }
console.log('simDailyPuzzleContract: green. Every caller honours the contract the selection memo depends on.');
