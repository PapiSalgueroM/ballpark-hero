/* Activity, not completion: a simulated match must not be a finished game.

   Round 392. recordCompletion fans out to three pipelines (the anonymous
   row, the streak record, the signed in save that writes a ranked row and
   adds the score to the player's points). Round 157 put one after every
   Club Manager match so the header moved mid season; Round 300's fan out
   made that a full completion per match; Round 301 fixed the same thing in
   the eight other sims with recordActivity and left Club Manager alone
   because its comment believed the game only fired at season end. Measured
   2026-09-01: 10,254 club-manager completion rows from 83 players in a day,
   and the top of the points table held 80,246 of its 87,800 from 1,586 Club
   Manager rows, each one the running season score added again.

   WHAT THIS HOLDS:
     1. THE HOOK, RENDERED. src/hooks/useClubManager.test.ts plays a real
        season through the real hook with the completions module mocked: a
        match is a recordActivity call, a finished season is exactly one
        recordCompletion. A source check could only find the spelling of this
        bug somebody had already thought of; the test asks the hook.
     2. SOCCER CAREER, AS CODE. The per season advance pings recordActivity
        and the file has no recordCompletion of its own (the scored
        completion is the retirement, through useGameCompletion).
     3. THE PING IS LIGHT, AS CODE. recordActivity in src/lib/completions.ts
        must not reach the streak record or the signed in save; if it ever
        does, every sim is back to writing a ranked row per round.

   NEGATIVE CONTROLS (house rule: prove each check can fail):
     SIM_ACTIVITY_CONTROL=match   writes a copy of useClubManager.ts with the
                                  match pings put back to recordCompletion,
                                  points the test at it through CM_HOOK, and
                                  both tests must fail on their assertions.
     SIM_ACTIVITY_CONTROL=career  swaps Soccer Career's ping back in memory;
                                  section 2 must go red.
     SIM_ACTIVITY_CONTROL=heavy   adds a saveAuthCompletion call to the ping
                                  in memory; section 3 must go red.
   Each control refuses to run if what it rewrites is not there to rewrite,
   and is judged on its own section only.

   Run: node scripts/simActivityNotCompletion.mjs
*/
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.SIM_ACTIVITY_CONTROL || '';
const TEST = 'src/hooks/useClubManager.test.ts';

const failures = { 1: 0, 2: 0, 3: 0 };
let section = 1;
const fail = m => { failures[section] += 1; console.error('  FAIL: ' + m); };
const abort = m => { console.error(m); process.exit(1); };
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8').split('\r\n').join('\n');
const stripComments = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

function runVitest(extraEnv) {
  const r = spawnSync(
    process.execPath,
    [path.join(ROOT, 'node_modules', 'vitest', 'vitest.mjs'), 'run', TEST],
    { cwd: ROOT, encoding: 'utf8', env: { ...process.env, ...extraEnv, CI: '1', FORCE_COLOR: '0', NO_COLOR: '1' }, maxBuffer: 64 * 1024 * 1024 },
  );
  return { code: r.status, out: (r.stdout || '') + (r.stderr || '') };
}

section = 1;
console.log('1) The real hook, rendered: a match is activity, a season end is one completion');
{
  let env = {};
  let copy = null;
  if (CONTROL === 'match') {
    const src = read('src/hooks/useClubManager.ts');
    const regressed = src.split("recordActivity('/club-manager', currentSeasonScore(").join("recordCompletion('/club-manager', currentSeasonScore(");
    if (regressed === src) abort('control cannot run: useClubManager.ts has no match ping to put back');
    /* Under dist, inside the project root: vite refuses to load a module
       from outside it, and git ignores dist so a crashed run cannot leave a
       hook copy where tsc would read it. Removed again below. */
    const dir = path.join(ROOT, 'dist', '.cm-control');
    fs.mkdirSync(dir, { recursive: true });
    copy = path.join(dir, 'useClubManager.control.ts');
    fs.writeFileSync(copy, regressed);
    env = { CM_HOOK: copy.replaceAll('\\', '/') };
    console.log('   NEGATIVE CONTROL ON: the test runs against a copy of the hook with a completion after every match');
  }
  let code;
  let out;
  try {
    ({ code, out } = runVitest(env));
  } finally {
    if (copy) fs.rmSync(path.dirname(copy), { recursive: true, force: true });
  }
  if (!out.includes('useClubManager.test.ts')) abort('vitest did not report on the test file at all, so nothing was checked:\n' + out.slice(-1500));
  const summary = out.match(/Tests\s+(.+)/);
  console.log(`   vitest exit ${code}, ${summary ? summary[1].trim() : 'no summary line'}`);
  if (CONTROL === 'match') {
    /* Only an assertion counts. A copy that failed to load is a load
       error, not the check firing. */
    if (/Failed to load|Cannot find module|SyntaxError|Failed to resolve import/.test(out)) abort('control cannot run: the rewritten hook did not load:\n' + out.slice(-1500));
    const matchRed = /×.*records activity and not a completion/.test(out);
    const seasonRed = /×.*exactly one completion/.test(out);
    const assertion = /AssertionError|expected/.test(out);
    if (matchRed && assertion) fail('with a completion after every match the match test fails on its assertion, as it should');
    if (seasonRed && assertion) fail('with a completion after every match the season test counts more than one, as it should');
  } else {
    if (code !== 0) {
      const lines = out.split('\n').filter(l => /×|FAIL|AssertionError|expected/.test(l)).slice(0, 8);
      fail('the hook test is red:\n    ' + lines.join('\n    '));
    }
    if (!/2 passed/.test(out)) fail(`expected both tests to pass, vitest says: ${summary ? summary[1].trim() : 'nothing'}`);
  }
}

section = 2;
console.log('2) Soccer Career, as code: the season advance pings activity and the file owns no completion');
{
  let code = stripComments(read('src/pages/SoccerCareer.tsx'));
  if (CONTROL === 'career') {
    const swapped = code.replace("recordActivity('/soccer-career')", "recordCompletion('/soccer-career')");
    if (swapped === code) abort('control cannot run: SoccerCareer.tsx has no activity ping to swap');
    code = swapped;
    console.log('   NEGATIVE CONTROL ON: the season ping swapped back to a completion in memory');
  }
  const advance = code.indexOf('advanceProSeason(career, clubs)');
  if (advance < 0) fail('the season advance (advanceProSeason(career, clubs)) is not in the file, the check needs re-anchoring');
  const window_ = advance < 0 ? '' : code.slice(advance, advance + 600);
  if (!window_.includes("recordActivity('/soccer-career')")) fail("the season advance no longer pings recordActivity('/soccer-career') within 600 characters");
  const own = (code.match(/recordCompletion\('\/soccer-career'/g) || []).length;
  if (own > 0) fail(`SoccerCareer.tsx calls recordCompletion('/soccer-career') ${own} time(s); the scored completion is the retirement through useGameCompletion, a season is activity`);
  if (!/useGameCompletion\('soccer-career'/.test(code)) fail('the retirement completion (useGameCompletion(\'soccer-career\', ...)) is gone, so nothing scores a career');
  console.log(`   advance ping present: ${window_.includes("recordActivity('/soccer-career')")}, own completions: ${own}`);
}

section = 3;
console.log('3) The ping is light, as code: recordActivity reaches neither the streak record nor the signed in save');
{
  let code = stripComments(read('src/lib/completions.ts'));
  const start = code.indexOf('export function recordActivity(');
  if (start < 0) abort('recordActivity is not exported from src/lib/completions.ts, the check needs re-anchoring');
  const next = code.indexOf('\nexport ', start + 1);
  let body = code.slice(start, next < 0 ? code.length : next);
  if (CONTROL === 'heavy') {
    const heavy = body.replace('bumpLocalTodayCount(game);', 'bumpLocalTodayCount(game);\n    saveAuthCompletion(\'\', game, 0, 0);');
    if (heavy === body) abort('control cannot run: recordActivity has no bumpLocalTodayCount line to build on');
    body = heavy;
    console.log('   NEGATIVE CONTROL ON: a signed in save added to the ping in memory');
  }
  for (const heavyCall of ['recordStreakCompletion(', 'saveAuthCompletion(', 'supabase.auth.getUser(']) {
    if (body.includes(heavyCall)) fail(`recordActivity calls ${heavyCall}...), which makes every sim round a full completion again`);
  }
  if (!body.includes("('game_completions')")) fail('recordActivity no longer writes the anonymous game_completions row, so Most Played Today stops seeing live play');
  console.log(`   body ${body.length} characters, writes the anonymous row: ${body.includes("('game_completions')")}`);
}

const total = failures[1] + failures[2] + failures[3];
if (CONTROL) {
  const own = { match: 1, career: 2, heavy: 3 }[CONTROL];
  if (!own) abort(`unknown control "${CONTROL}" (match, career, heavy)`);
  if (failures[own] > 0) {
    console.log(`\ncontrol "${CONTROL}": ${failures[own]} failure(s) fired in section ${own} as expected, the check works`);
    process.exit(0);
  }
  abort(`\ncontrol "${CONTROL}": changed NOTHING in section ${own}, the check is dead`);
}
if (total > 0) {
  console.error(`\nsimActivityNotCompletion: ${total} failure(s)`);
  process.exit(1);
}
console.log('\nsimActivityNotCompletion: all green');
