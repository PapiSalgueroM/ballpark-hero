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
     SIM_ACTIVITY_CONTROL=noping  (Round 1314) removes Soccer Career's ping in
                                  memory; section 2 must fail on the ping
                                  line alone.
     SIM_ACTIVITY_CONTROL=twocalls (Round 1314) adds a second advance call in
                                  memory; section 2 must fail on the "called
                                  more than once" line alone.
     SIM_ACTIVITY_CONTROL=twodotted (fix review of Round 1314) the same, with
                                  the second call written
                                  advanceProSeason(s.career, clubs); section 2
                                  must fail on that line alone.
   Each control refuses to run if what it rewrites is not there to rewrite,
   and is judged on its own section only; career, noping and twocalls are
   judged on their exact sentences too (career: the ping line and the
   completion line, never the anchor line). A control that fired prints
   "fired in section N as expected" and exits 0; anything else exits 1.

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
const firedKeys = { 1: new Set(), 2: new Set(), 3: new Set() };
const fail = (m, key = '') => { failures[section] += 1; if (key) firedKeys[section].add(key); console.error('  FAIL: ' + m); };
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
  /* Round 1314: the anchor is the CALL, not its argument names. Round 1047
     (1c8ce33c) wrapped the advance as
     stepWithMomentsBanked(c => advanceProSeason(c, clubs)), which renamed
     the first argument and left this section red on a rule that still held
     (the ping sat nine lines below it in the same handler). Now the one
     call advanceProSeason(...) in the comment stripped file is the
     anchor; none fails, and more than one fails too, because a second
     advance is a new site this check has to be told about. */
  if (CONTROL === 'noping') {
    const gone = code.split("recordActivity('/soccer-career')").join('');
    if (gone === code) abort('control cannot run: SoccerCareer.tsx has no activity ping to remove');
    code = gone;
    console.log("   NEGATIVE CONTROL ON: the season ping removed in memory");
  }
  /* Fix review of Round 1314: every call is counted, whatever its first
     argument is. The first cut counted only advanceProSeason(<bare name>,
     so a second advance written as advanceProSeason(s.career, clubs) in a
     handler that never pings passed as "1 call". The import list has no
     parenthesis after the name, so it is not counted. */
  const CALL = /\badvanceProSeason\s*\(/g;
  if (CONTROL === 'twocalls' || CONTROL === 'twodotted') {
    if (!CALL.test(code)) abort('control cannot run: SoccerCareer.tsx has no advance call to duplicate');
    CALL.lastIndex = 0;
    code += CONTROL === 'twocalls'
      ? '\nfunction controlSecondAdvance(c, clubs) { return advanceProSeason(c, clubs); }\n'
      : '\nfunction controlSecondAdvance(s, clubs) { return advanceProSeason(s.career, clubs); }\n';
    console.log(`   NEGATIVE CONTROL ON: a second advance call (${CONTROL === 'twocalls' ? 'a bare name' : 'a dotted first argument'}) added in memory`);
  }
  const calls = [...code.matchAll(CALL)];
  if (calls.length === 0) fail('the season advance (a call advanceProSeason(...)) is not in the file, the check needs re-anchoring', 'anchor');
  if (calls.length > 1) fail(`the season advance is called ${calls.length} times; a second call is a new site this check must be told about`, 'anchor');
  const advance = calls.length > 0 ? calls[0].index : -1;
  const window_ = advance < 0 ? '' : code.slice(advance, advance + 600);
  const pingAt = advance < 0 ? -1 : code.indexOf("recordActivity('/soccer-career')", advance);
  const distance = pingAt < 0 ? 'no ping' : `ping ${pingAt - advance} characters`;
  if (!window_.includes("recordActivity('/soccer-career')")) fail("the season advance no longer pings recordActivity('/soccer-career') within 600 characters", 'ping');
  const own = (code.match(/recordCompletion\('\/soccer-career'/g) || []).length;
  if (own > 0) fail(`SoccerCareer.tsx calls recordCompletion('/soccer-career') ${own} time(s); the scored completion is the retirement through useGameCompletion, a season is activity`, 'completion');
  if (!/useGameCompletion\('soccer-career'/.test(code)) fail('the retirement completion (useGameCompletion(\'soccer-career\', ...)) is gone, so nothing scores a career', 'retirement');
  console.log(`   advance calls: ${calls.length}, ${distance} after the call (window 600), advance ping present: ${window_.includes("recordActivity('/soccer-career')")}, own completions: ${own}`);
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
  const own = { match: 1, career: 2, heavy: 3, noping: 2, twocalls: 2, twodotted: 2 }[CONTROL];
  if (!own) abort(`unknown control "${CONTROL}" (match, career, heavy, noping, twocalls, twodotted)`);
  /* Round 1314: the section 2 controls are judged on their own SENTENCES,
     not just on their section going red: career must fire the ping and
     the completion lines and not the anchor line (before this round the
     stale anchor made it fire for the wrong reason), noping the ping line
     alone, twocalls the anchor line alone. */
  const SENTENCES = { career: ['ping', 'completion'], noping: ['ping'], twocalls: ['anchor'], twodotted: ['anchor'] }[CONTROL];
  if (SENTENCES) {
    const got = [...firedKeys[own]].sort();
    const want = [...SENTENCES].sort();
    if (got.join(',') !== want.join(',') || failures[own] !== want.length) {
      abort(`\ncontrol "${CONTROL}": section ${own} fired [${got.join(', ')}] (${failures[own]} failure(s)), expected exactly [${want.join(', ')}], the check is not doing what it says`);
    }
  }
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
