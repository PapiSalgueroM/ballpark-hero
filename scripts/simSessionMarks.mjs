/**
 * Round 195 harness: per-session play marks, S-1's last open edge.
 *
 * What Round 195 shipped: the header's games-played chip counts a session
 * of ANY sim the moment you actually play it, not only when you finish
 * with a score. Club Manager has marked scored season ends since Round
 * 157 and Soccer Career has marked every played season unscored since
 * Round 159; this round carries that rule to the nine games that never
 * counted: the four Front Office boards mark every played week or round,
 * the four My Career boards mark every played season, and Stadium Tycoon
 * marks once per session on the first meaningful action through a ref so
 * a thousand taps stay one mark.
 *
 * The contract, statically guarded here because the calls are one-liners
 * a refactor could silently drop or, worse, turn scored:
 *   1. every board imports recordCompletion and calls it UNSCORED with
 *      its exact route path, once, inside its play function, after the
 *      null guard (never at module level, so loading a page is never
 *      "playing" it);
 *   2. the scored legacy path (useGameCompletion) survives untouched in
 *      all eight boards;
 *   3. the tycoon's mark is once-per-session by ref, called first in
 *      doBuy, doHire and doTap;
 *   4. the marked paths are real routes in App.tsx, so the header's
 *      per-slug attribution can never dangle;
 *   5. the Round 157/159 precedents themselves still stand.
 *
 * playSessionMarks.mjs proves the same contract dynamically by counting
 * the actual POST bodies a browser sends. Static guard harnesses are the
 * simNoRivalNames precedent.
 *
 * Run: node scripts/simSessionMarks.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf-8');

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };

/* file, route path, play function name, null guard line */
const BOARDS = [
  ['src/components/front-office/FrontOfficeBoard.tsx', '/front-office', 'playWeek', 'if (!league || !my) return;'],
  ['src/components/nba-front-office/NbaFrontOfficeBoard.tsx', '/nba-front-office', 'playRound', 'if (!league || !my) return;'],
  ['src/components/nhl-front-office/NhlFrontOfficeBoard.tsx', '/nhl-front-office', 'playRound', 'if (!league || !my) return;'],
  ['src/components/mlb-front-office/MlbFrontOfficeBoard.tsx', '/mlb-front-office', 'playRound', 'if (!league || !my) return;'],
  ['src/components/nfl-my-career/NflMyCareerBoard.tsx', '/nfl-my-career', 'playSeason', 'if (!career || teamQuality == null) return;'],
  ['src/components/nba-my-career/NbaMyCareerBoard.tsx', '/nba-my-career', 'playSeason', 'if (!career || teamQuality == null) return;'],
  ['src/components/nhl-my-career/NhlMyCareerBoard.tsx', '/nhl-my-career', 'playSeason', 'if (!career || teamQuality == null) return;'],
  ['src/components/mlb-my-career/MlbMyCareerBoard.tsx', '/mlb-my-career', 'playSeason', 'if (!career || teamQuality == null) return;'],
];
const TYCOON = 'src/hooks/useStadiumTycoon.ts';

/* ---------- 1. Eight boards: unscored, once, in the right place ---------- */
console.log('1) Every board marks its play unscored, once, after the guard');
for (const [file, route, fn, guard] of BOARDS) {
  const t = read(file);
  if (!t.includes("import { recordCompletion } from '@/lib/completions';")) {
    fail(`${file}: no recordCompletion import`);
    continue;
  }
  const unscored = `recordCompletion('${route}');`;
  const calls = t.split(unscored).length - 1;
  if (calls !== 1) { fail(`${file}: expected exactly 1 unscored mark, found ${calls}`); continue; }
  if (t.includes(`recordCompletion('${route}',`)) {
    fail(`${file}: a SCORED direct call exists; scores belong to useGameCompletion only`);
  }
  /* one call in the whole file: the unscored one (imports aside) */
  const allCalls = [...t.matchAll(/recordCompletion\(/g)].length;
  if (allCalls !== 1) fail(`${file}: ${allCalls} recordCompletion call sites, expected the single unscored mark`);
  const fnIdx = t.indexOf(`const ${fn} = () => {`);
  const callIdx = t.indexOf(unscored);
  const guardIdx = t.indexOf(guard, fnIdx);
  if (fnIdx < 0) { fail(`${file}: ${fn} not found`); continue; }
  if (!(fnIdx < guardIdx && guardIdx < callIdx)) {
    fail(`${file}: the mark is not after the ${fn} null guard`);
  }
  if (callIdx - fnIdx > 500) {
    fail(`${file}: the mark drifted ${callIdx - fnIdx} chars from the top of ${fn}; it must fire on every play, before any early return below the guard`);
  }
}

/* ---------- 2. The scored legacy path survives ---------- */
console.log('2) useGameCompletion still writes the scored legacy in all eight');
for (const [file] of BOARDS) {
  const t = read(file);
  if (!t.includes('useGameCompletion')) fail(`${file}: the scored completion path is GONE`);
}

/* ---------- 3. The tycoon: once per session, by ref ---------- */
console.log('3) Stadium Tycoon marks once per session, on the first real action');
{
  const t = read(TYCOON);
  if (!t.includes("import { recordCompletion } from '@/lib/completions';")) {
    fail('tycoon: no recordCompletion import');
  }
  if (t.split("recordCompletion('/stadium-tycoon');").length - 1 !== 1) {
    fail('tycoon: expected exactly one unscored mark');
  }
  if (t.includes("recordCompletion('/stadium-tycoon',")) fail('tycoon: the idle game must never send a score');
  /* the once-per-session shape: guard, latch, mark, in that order */
  const shape = ['const sessionMarkedRef = useRef(false);',
    'if (sessionMarkedRef.current) return;',
    'sessionMarkedRef.current = true;',
    "recordCompletion('/stadium-tycoon');"];
  let at = 0, ok = true;
  for (const line of shape) {
    const i = t.indexOf(line, at);
    if (i < 0) { ok = false; break; }
    at = i;
  }
  if (!ok) fail('tycoon: the sessionMarkedRef guard shape is broken (guard, latch, mark, in order)');
  /* first line of each meaningful action */
  for (const action of ['doBuy', 'doHire', 'doTap']) {
    const i = t.indexOf(`const ${action} = useCallback(`);
    if (i < 0) { fail(`tycoon: ${action} not found`); continue; }
    const head = t.slice(i, i + 200);
    if (!head.includes('markSessionPlay();')) fail(`tycoon: ${action} does not mark the session first`);
  }
  const invocations = t.split('markSessionPlay();').length - 1;
  if (invocations !== 3) fail(`tycoon: markSessionPlay() invoked ${invocations} times, expected exactly doBuy + doHire + doTap`);
}

/* ---------- 4. Every marked path is a real route ---------- */
console.log('4) The marked paths are routes App.tsx actually serves');
{
  const app = read('src/App.tsx');
  const paths = [...BOARDS.map(b => b[1]), '/stadium-tycoon', '/club-manager', '/soccer-career'];
  for (const p of paths) {
    if (!app.includes(`path="${p}"`)) fail(`App.tsx: no route for ${p}, the header attribution would dangle`);
  }
}

/* ---------- 5. The precedents still stand ---------- */
console.log('5) Round 157 and Round 159 marks are untouched');
{
  const cm = read('src/hooks/useClubManager.ts');
  const scored = [...cm.matchAll(/recordCompletion\('\/club-manager',/g)].length;
  if (scored < 5) fail(`useClubManager: only ${scored} scored season marks remain, Round 157 expected at least 5`);
  const soccer = read('src/pages/SoccerCareer.tsx');
  if (!soccer.includes("recordCompletion('/soccer-career');")) {
    fail('SoccerCareer: the Round 159 unscored season mark is gone');
  }
}

/* ---------- 6. Copy discipline ---------- */
console.log('6) No em or en dash in any touched file');
{
  const DASHES = /[\u2013\u2014]/; /* by codepoint, the simEras convention */
  for (const f of [...BOARDS.map(b => b[0]), TYCOON]) {
    const t = read(f);
    if (DASHES.test(t)) {
      const line = t.split('\n').findIndex(l => DASHES.test(l)) + 1;
      fail(`${f}: dash at line ${line}`);
    }
  }
}

console.log('');
if (failures > 0) {
  console.error(`simSessionMarks: ${failures} failure${failures === 1 ? '' : 's'}`);
  process.exit(1);
}
console.log('simSessionMarks: green. Nine games count the day you play them, none of them invented a score to do it.');
