/* Manager Hot Seat: the short leash on the Club Manager engine (Round 719).

   The game is a frame around the shared engine: a real club's season played
   to its worst run of form in league weeks 6 to 14, the board dropped to 30,
   a points target for the next five league games read off those fixtures,
   and a verdict (survive, the fans' reprieve one point short, the sack, or
   the board meter's own sack at zero). Every match, meter, talk and press
   question is the engine's, imported unchanged and driven on a seeded
   stream. What this harness holds is the frame, measured by outcome:

     1) the takeover and the target are sane and the target is the club's.
        Many seeded runs across the pool: the job opens in the window, the
        board sits on 30, the target sits inside one point of a clean sweep,
        and the target RISES with the club's own strength (Pearson r over the
        runs, against the engine's strength number for the club), so a strong
        club is asked for more than a weak one. The shares of targets that
        are trivial (two points or fewer from five games) and near a clean
        sweep are measured and held to ceilings.
     2) reading the room is worth something and nothing is decided. Three
        managers play the same runs from the same takeover on the same dice:
        one who gives the talk the engine's own talkTargetNow asks for, one
        who says nothing, one who gives the talk furthest from it. Every arm
        plays balanced and answers the press the same way, so the talk is the
        only difference. The reader must take more points and keep the job
        more often than the one who talks past the room, and the silent
        manager's survival must sit inside a band that is neither never nor
        always, because a game the player can never win or never lose is not
        a game.
     3) outcomes replay. A run rebuilt from its seed and its choices matches
        the original in verdict, points, target, takeover and every score,
        and a second start from the same seed opens the same job. Ids the
        engine stamps with Date.now() are not compared, on purpose: the lib's
        header says they differ and this section says what does not. The
        daily is the same club and seed on a second read of the same date.
     4) the shared engine's session state comes back. A custom club and a
        league override registered the way a Club Manager save registers
        them survive a start, a match, a press answer and a replay, and the
        hot seat's own world never shows the registered club.

   Negative controls (house rule: prove the checks can fail), each a rewrite
   of a copy of src/lib/managerHotSeat.ts that refuses to run if its anchor
   is not in the file:
     HOT_SEAT_CONTROL=flat    TARGET_PER_POINT goes to zero, the target no
       longer reads the fixtures. Section 1's correlation must go red.
     HOT_SEAT_CONTROL=deaf    the talk is dropped before kick off, so reading
       the room is worth nothing. Section 2 must go red.
     HOT_SEAT_CONTROL=drift   withSeed stops swapping the stream in, so a
       replay walks different dice. Section 3 must go red.
     HOT_SEAT_CONTROL=leak    onStaticWorld stops restoring registrations,
       the pre fix shape. Section 4 must go red.

   Thresholds, from this harness on its own seed and on SIM_SEED=1, 2, 3
   (2026-09-30, 240 setups a run, three arms each, about two minutes a run
   on a loaded machine), set roughly midway between the fixed band and the
   control's band where a control has one. The talk's worth is measured two
   ways because the arms share the dice: the mean points gap, and the league
   results the talk flipped, counted by which arm they went to. The flip
   share is the stronger statistic (paired, not a difference of two noisy
   means) and it is the one that carries the floor:
     target vs club strength, r        fixed 0.342 to 0.392  flat NaN     floor 0.15
     distinct targets                  fixed 11              flat 1       floor 5
     trivial targets (2 or fewer)      fixed 4 to 13 of 240               ceiling 12 percent
     near sweep targets (13 or 14)     fixed 0 of 240                     ceiling 10 percent
     league results the talk flipped   fixed 116 to 174      deaf 0       floor 40
     flips that went to the reader     fixed 63.0 to 73.0    deaf none    floor 55 percent
     reader minus wrong, points        fixed +0.18 to +0.49  deaf 0       floor +0.05
     reader minus wrong, survival      fixed +5.0 to +8.3    deaf 0       floor +1 point
     silent survival, percent          fixed 69.2 to 80.8                 band 30 to 92
     board sackings, all arms          fixed 10 to 17 of 720              ceiling 15 percent
     replays compared                  fixed 24                           floor 12

   What the measurement says about the game as shipped, for whoever tunes
   it: a manager who plays balanced and says nothing keeps the job about
   three times in four. The leash is real but soft; TARGET_BASE is the
   lever, and this harness is where a new number gets measured.

   Run: node scripts/simManagerHotSeat.mjs
*/
/* Round 299: seeded stream, see scripts/lib/seedRandom.mjs. First import on purpose. */
import './lib/seedRandom.mjs';
import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROOT_URL = ROOT.replaceAll('\\', '/');
const TMP = os.tmpdir().replaceAll('\\', '/');
const CONTROL = process.env.HOT_SEAT_CONTROL || '';
if (CONTROL && !['flat', 'deaf', 'drift', 'leak'].includes(CONTROL)) {
  console.error(`HOT_SEAT_CONTROL=${CONTROL} is not a control this harness knows`);
  process.exit(1);
}
/* HOT_SEAT_SETUPS raises the sample when re-measuring the bands; the default
   is what the thresholds in the header were measured on. */
const SETUPS = Math.max(12, Number(process.env.HOT_SEAT_SETUPS) || 240);

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };
const ok = m => console.log('   ok  ' + m);
const lf = s => s.replaceAll('\r\n', '\n');
const isNum = v => typeof v === 'number' && Number.isFinite(v);
const mean = a => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : NaN);
const pct = (n, d) => (d ? (100 * n) / d : NaN);
function pearson(xs, ys) {
  const mx = mean(xs), my = mean(ys);
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < xs.length; i++) {
    const dx = xs[i] - mx, dy = ys[i] - my;
    sxy += dx * dy; sxx += dx * dx; syy += dy * dy;
  }
  return sxx > 0 && syy > 0 ? sxy / Math.sqrt(sxx * syy) : NaN;
}

/* A worktree inside the repo has no node_modules of its own, so walk up for
   esbuild rather than trusting ROOT/node_modules. */
function findUp(rel) {
  let dir = ROOT;
  for (let i = 0; i < 6; i += 1) {
    const p = path.join(dir, 'node_modules', rel);
    if (fs.existsSync(p)) return p;
    dir = path.dirname(dir);
  }
  return null;
}
const ESBUILD = findUp('.bin/esbuild');
if (!ESBUILD) { console.error('esbuild not found in any node_modules above the repo'); process.exit(1); }

/* ---- the lib, rewritten when a control asks ---- */
const LIB = path.join(ROOT, 'src', 'lib', 'managerHotSeat.ts');
let libPath = `${ROOT_URL}/src/lib/managerHotSeat.ts`;
function rewrite(file, edits, outName, what) {
  let src = lf(fs.readFileSync(file, 'utf8'));
  for (const [from, to] of edits) {
    if (!src.includes(from)) {
      console.error(`control cannot run: ${what} is not in the shape HOT_SEAT_CONTROL=${CONTROL} rewrites (${from.slice(0, 60)}...)`);
      process.exit(1);
    }
    src = src.replace(from, to);
  }
  const out = `${TMP}/${process.pid}.${outName}`;
  fs.writeFileSync(out, src);
  return out;
}
if (CONTROL === 'flat') {
  libPath = rewrite(LIB, [['export const TARGET_PER_POINT = 0.07;\n', 'export const TARGET_PER_POINT = 0;\n']], 'managerHotSeat.flat.ts', 'the per point term');
  console.log('NEGATIVE CONTROL ON: the target ignores the fixtures; section 1 must go red');
}
if (CONTROL === 'deaf') {
  libPath = rewrite(LIB, [['  const ready: CareerState = { ...run.state, mentality, teamTalk: talk };\n', '  const ready: CareerState = { ...run.state, mentality, teamTalk: null };\n']], 'managerHotSeat.deaf.ts', 'the team talk hand off');
  console.log('NEGATIVE CONTROL ON: the talk never reaches the engine; section 2 must go red');
}
if (CONTROL === 'drift') {
  libPath = rewrite(LIB, [['  Math.random = mulberry32(seed >>> 0);\n', '  Math.random = saved;\n']], 'managerHotSeat.drift.ts', 'the seeded stream swap');
  console.log('NEGATIVE CONTROL ON: engine calls draw from the ambient stream; section 3 must go red');
}
if (CONTROL === 'leak') {
  libPath = rewrite(LIB, [['  const swap = had.custom !== null || had.overrides !== null;\n', '  const swap = false;\n']], 'managerHotSeat.leak.ts', 'the registration swap');
  console.log('NEGATIVE CONTROL ON: the hot seat runs inside whatever the tab registered and startCareer wipes it; section 4 must go red');
}

/* One CommonJS bundle: the lib (or its rewritten copy) and the engine. The
   copy imports the engine through the alias, so both see one engine module
   and one set of registrations. The process id is in every temp name so
   seeds and controls can run side by side. */
const ENTRY = `${TMP}/managerHotSeat.${process.pid}.entry.mjs`;
const BUNDLE = `${TMP}/managerHotSeat.${process.pid}.bundle.cjs`;
fs.writeFileSync(ENTRY, `
export * as hs from '${libPath}';
export * as cm from '${ROOT_URL}/src/lib/clubManager.ts';
`);
execSync(`"${ESBUILD}" "${ENTRY}" --bundle --format=cjs --platform=node --alias:@=${ROOT_URL}/src --outfile="${BUNDLE}" --log-level=error`, {
  stdio: 'inherit',
  env: { ...process.env, NODE_PATH: path.dirname(path.dirname(ESBUILD)) },
});
const store = new Map();
globalThis.localStorage = { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k), clear: () => store.clear() };
const { hs, cm } = createRequire(import.meta.url)(BUNDLE);
const {
  startHotSeat, playHotSeatMatch, answerHotSeatPress, replayHotSeat, pendingPress, hotSeatPool, dailyHotSeat,
  HOT_SEAT_LEASH, HOT_SEAT_BOARD_START, HOT_SEAT_TAKEOVER_MIN, HOT_SEAT_TAKEOVER_MAX,
} = hs;
const { talkTargetNow, TALK_ORDER, registerCustomClub, registerLeagueOverrides, engineRegistrations, activeCustomClub, playableClubs } = cm;

/* ---------- the setups: clubs spread across the pool, seeds from the harness stream ---------- */
const pool = hotSeatPool();
if (pool.length < 40) fail(`the hot seat pool has ${pool.length} clubs, the real leagues should give far more`);
const setups = [];
for (let i = 0; i < SETUPS; i++) {
  const club = pool[Math.floor((i / SETUPS) * pool.length) % pool.length];
  const seed = Math.floor(Math.random() * 4294967296) >>> 0;
  setups.push({ club: club.club, seed });
}

/* ---------- the three managers ---------- */
function toneAt(run, pick) {
  const target = talkTargetNow(run.state);
  if (target === null) return null;
  let best = 0, worst = 0;
  for (let i = 1; i < TALK_ORDER.length; i++) {
    if (Math.abs(i - target) < Math.abs(best - target)) best = i;
    if (Math.abs(i - target) > Math.abs(worst - target)) worst = i;
  }
  return TALK_ORDER[pick === 'reads' ? best : worst];
}
function playArm(start, arm) {
  let run = start;
  let guard = 0;
  while (!run.verdict && guard++ < 40) {
    const q = pendingPress(run);
    if (q) { run = answerHotSeatPress(run, 0); continue; }
    const talk = arm === 'silent' ? null : toneAt(run, arm);
    run = playHotSeatMatch(run, 'balanced', talk);
  }
  if (!run.verdict) fail(`${start.setup.club} seed ${start.setup.seed}: the ${arm} arm never reached a verdict in 40 steps`);
  return run;
}
const survived = run => run.verdict && (run.verdict.kind === 'survived' || run.verdict.kind === 'reprieve');
const PTS = { W: 3, D: 1, L: 0 };

/* ---------- 1. the takeover and the target ---------- */
console.log(`1) The takeover and the target over ${SETUPS} seeded runs`);
const starts = [];
const targets = [], strengths = [];
let trivial = 0, sweep = 0;
for (const setup of setups) {
  const run = startHotSeat(setup);
  starts.push(run);
  const t = run.takeover;
  const tag = `${setup.club} seed ${setup.seed}`;
  if (t.week < HOT_SEAT_TAKEOVER_MIN || t.week > HOT_SEAT_TAKEOVER_MAX) fail(`${tag}: the job opened after league week ${t.week}`);
  if (run.state.boardConfidence !== HOT_SEAT_BOARD_START) fail(`${tag}: the board sits on ${run.state.boardConfidence}, not ${HOT_SEAT_BOARD_START}`);
  if (run.state.sacked) fail(`${tag}: the manager walks in already sacked`);
  if (run.leash !== HOT_SEAT_LEASH) fail(`${tag}: the leash is ${run.leash} games`);
  if (!Number.isInteger(run.target) || run.target < 1 || run.target > 3 * run.leash - 1) fail(`${tag}: the target is ${run.target} from ${run.leash} games`);
  if (t.position < 1 || t.position > t.clubs) fail(`${tag}: position ${t.position} of ${t.clubs}`);
  if (t.form.length === 0) fail(`${tag}: no form to read at the takeover`);
  if (run.verdict) fail(`${tag}: a verdict before a ball is kicked`);
  const mine = run.state.clubStrengths[run.state.clubName];
  if (!isNum(mine)) fail(`${tag}: the engine has no strength for ${run.state.clubName}`);
  targets.push(run.target);
  strengths.push(mine);
  if (run.target <= 2) trivial += 1;
  if (run.target >= 3 * run.leash - 2) sweep += 1;
}
const distinct = new Set(targets).size;
const r = pearson(targets, strengths);
console.log(`   targets: mean ${mean(targets).toFixed(2)}, ${distinct} distinct, ${trivial} trivial, ${sweep} near a sweep, r vs club strength ${isNum(r) ? r.toFixed(3) : 'NaN'}`);
if (!(r >= 0.15)) fail(`the target does not rise with the club's strength: r=${isNum(r) ? r.toFixed(3) : 'NaN'} (floor 0.15)`);
if (distinct < 5) fail(`only ${distinct} distinct targets across ${SETUPS} runs (floor 5)`);
if (pct(trivial, SETUPS) > 12) fail(`${trivial} of ${SETUPS} targets ask for two points or fewer (ceiling 12 percent)`);
if (pct(sweep, SETUPS) > 10) fail(`${sweep} of ${SETUPS} targets sit within a point of a clean sweep (ceiling 10 percent)`);
ok(`${SETUPS} takeovers in league weeks ${HOT_SEAT_TAKEOVER_MIN} to ${HOT_SEAT_TAKEOVER_MAX}, every board on ${HOT_SEAT_BOARD_START}, every target inside a point of a sweep`);

/* ---------- 2. reading the room ---------- */
console.log('2) Reading the room against talking past it, on the same dice');
const arms = { reads: [], silent: [], wrong: [] };
let boardSackings = 0, verdicts = 0;
for (const start of starts) {
  for (const arm of Object.keys(arms)) {
    const run = playArm(start, arm);
    arms[arm].push(run);
    if (run.verdict) {
      verdicts += 1;
      if (run.verdict.kind === 'boardSacked') boardSackings += 1;
      if (run.log.filter(m => m.counts).length !== run.leaguePlayed) fail(`${start.setup.club}: the log and the count disagree on league games`);
      if (run.verdict.kind === 'survived' && run.points < run.target) fail(`${start.setup.club}: survived on ${run.points} of ${run.target}`);
      if (run.verdict.kind === 'sacked' && run.points >= run.target) fail(`${start.setup.club}: sacked on ${run.points} of ${run.target}`);
      if (run.verdict.kind === 'reprieve' && run.target - run.points !== 1) fail(`${start.setup.club}: a reprieve ${run.target - run.points} short`);
    }
  }
}
const ptsOf = arm => mean(arms[arm].map(x => x.points));
const survOf = arm => pct(arms[arm].filter(survived).length, arms[arm].length);
for (const arm of Object.keys(arms)) console.log(`   ${arm.padEnd(6)} mean points ${ptsOf(arm).toFixed(2)}, survival ${survOf(arm).toFixed(1)} percent`);
const ptsGap = ptsOf('reads') - ptsOf('wrong');
const survGap = survOf('reads') - survOf('wrong');
/* The arms share the dice, so the two runs of one setup differ only where the
   talk flipped a result. Count those league matches and which way they went. */
let flips = 0, flipsToReader = 0;
for (let i = 0; i < starts.length; i++) {
  const a = arms.reads[i].log.filter(m => m.counts), b = arms.wrong[i].log.filter(m => m.counts);
  for (let k = 0; k < Math.min(a.length, b.length); k++) {
    const da = PTS[a[k].res], db = PTS[b[k].res];
    if (da !== db) { flips += 1; if (da > db) flipsToReader += 1; }
  }
}
console.log(`   reader minus wrong: ${ptsGap >= 0 ? '+' : ''}${ptsGap.toFixed(2)} points, ${survGap >= 0 ? '+' : ''}${survGap.toFixed(1)} survival points; ${flips} league results flipped by the talk, ${flipsToReader} toward the reader (${pct(flipsToReader, flips).toFixed(1)} percent); board sackings ${boardSackings} of ${verdicts}`);
if (flips < 40) fail(`the talk flipped only ${flips} league results across ${starts.length} paired runs (floor 40)`);
if (!(pct(flipsToReader, flips) >= 55)) fail(`only ${pct(flipsToReader, flips).toFixed(1)} percent of the flipped results went to the reader (floor 55)`);
if (!(ptsGap >= 0.05)) fail(`reading the room is worth ${ptsGap.toFixed(2)} points over talking past it (floor +0.05)`);
if (!(survGap >= 1)) fail(`reading the room keeps the job ${survGap.toFixed(1)} points more often than talking past it (floor +1)`);
if (!(survOf('silent') >= 30 && survOf('silent') <= 92)) fail(`the silent manager survives ${survOf('silent').toFixed(1)} percent of the time (band 30 to 92)`);
if (pct(boardSackings, verdicts) > 15) fail(`${boardSackings} of ${verdicts} arms were sacked by the meter before the leash ran out (ceiling 15 percent)`);
ok(`the reader takes more points and keeps the job more often, and the game can be won and lost`);

/* ---------- 3. outcomes replay ---------- */
console.log('3) A run rebuilt from its seed and choices matches the original');
const sig = run => JSON.stringify({
  v: run.verdict, pts: run.points, target: run.target, tk: run.takeover, played: run.leaguePlayed,
  log: run.log.map(m => [m.competition, m.opponent, m.home, m.myGoals, m.oppGoals, m.res, m.counts, m.board, m.fans]),
});
let replays = 0;
for (let i = 0; i < starts.length; i += Math.max(1, Math.floor(starts.length / 24))) {
  const original = arms.reads[i];
  const again = replayHotSeat(original.setup, original.actions);
  replays += 1;
  if (sig(again) !== sig(original)) fail(`${original.setup.club} seed ${original.setup.seed}: the replay differs from the run`);
  const opened = startHotSeat(original.setup);
  if (opened.target !== starts[i].target || opened.takeover.week !== starts[i].takeover.week || opened.takeover.points !== starts[i].takeover.points) {
    fail(`${original.setup.club} seed ${original.setup.seed}: a second start opens a different job (${opened.target} vs ${starts[i].target}, week ${opened.takeover.week} vs ${starts[i].takeover.week})`);
  }
}
if (replays < 12) fail(`only ${replays} replays compared (floor 12)`);
const d1 = dailyHotSeat('2026-09-30'), d2 = dailyHotSeat('2026-09-30');
if (d1.club !== d2.club || d1.seed !== d2.seed) fail('the same date gives two different dailies');
const dailyClubs = new Set();
for (let d = 1; d <= 28; d++) dailyClubs.add(dailyHotSeat(`2026-10-${String(d).padStart(2, '0')}`).club);
if (dailyClubs.size < 10) fail(`28 October dailies visit only ${dailyClubs.size} clubs`);
ok(`${replays} replays match their runs in verdict, points, target, takeover and every score; a second start opens the same job; the daily is stable and varied`);

/* ---------- 4. the shared engine's session state comes back ---------- */
console.log('4) A Club Manager save\'s registrations survive a hot seat run');
const spec = {
  name: 'Harness Athletic', stadium: 'Harness Park', budgetTier: 'mid', leagueId: 'premier', replacedClub: '',
  crest: { shape: 0, pattern: 0, color1: '#123456', color2: '#abcdef', initials: 'HA' }, quality: 70,
};
const overrides = { premier: [...playableClubs('premier').map(c => c.name).slice(1), 'Harness Athletic'] };
registerCustomClub(spec, undefined, 70);
registerLeagueOverrides(overrides);
const before = engineRegistrations();
if (activeCustomClub() !== spec) fail('the probe could not register its custom club');
if (!playableClubs('premier').some(c => c.name === 'Harness Athletic')) fail('the probe could not register its league override');
const probe = setups[0];
let hot = startHotSeat(probe);
hot = playHotSeatMatch(hot, 'balanced', null);
if (pendingPress(hot)) hot = answerHotSeatPress(hot, 0);
hot = playHotSeatMatch(hot, 'attacking', 'rally');
replayHotSeat(probe, hot.actions);
hotSeatPool();
const after = engineRegistrations();
if (activeCustomClub() !== spec) fail(`after the run the active custom club is ${activeCustomClub()?.name ?? 'null'}, not the save's`);
if (after.overrides !== before.overrides) fail('after the run the league overrides are not the save\'s object');
if (!playableClubs('premier').some(c => c.name === 'Harness Athletic')) fail('after the run the save\'s promoted club has left its league');
if (hot.state.table.some(row => row.club === 'Harness Athletic')) fail('the hot seat table carries the save\'s custom club');
if (hotSeatPool().some(c => c.club === 'Harness Athletic')) fail('the hot seat pool carries the save\'s custom club');
if (hot.log.length !== 2 && hot.log.length !== 3) fail(`the probe run logged ${hot.log.length} matches from two plays`);
registerCustomClub(null);
registerLeagueOverrides(null);
ok('a custom club and a league override registered before the run are the same objects after a start, two matches, a press answer and a replay, and the hot seat world never shows them');

/* ---------- verdict ---------- */
for (const f of [ENTRY, BUNDLE, libPath.startsWith(TMP) ? libPath : null]) { if (f) { try { fs.unlinkSync(f); } catch { /* fine */ } } }
if (failures) {
  console.error(`\nsimManagerHotSeat: ${failures} failure(s)`);
  process.exit(1);
}
console.log('\nsimManagerHotSeat: green. The target is the club\'s, reading the room pays, outcomes replay and a Club Manager save keeps its registrations.');
