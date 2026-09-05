/* Buzzer Beater harness: the game can be won by reading the shot and cannot be
   won by holding one button.

   Round 445. This is the site's SECOND game you play rather than answer, and
   it runs on the same engine as the first (src/lib/arcade.ts), so it has to
   hold the same law simFreeKick holds. A shooting game whose best strategy is
   one fixed input is not a game, and this repo has shipped that mistake twice:
   the Player Stock Market's cheapest XI scoring 93.8 (Round 424's audit), and
   Free Kick's own first draft, where top left at full power beat a thinking
   player 2539 to 1206.

   What it holds, all measured over thousands of seeded runs against the real
   engine, never against a copy of it:
     1) THE ENGINE IS PURE AND DETERMINISTIC: one seed, one run, byte
        identical, so a daily is the same ten shots for everyone.
     2) SKILL BEATS SPAM, and this section is stronger than Free Kick's: it
        does not just try five inputs somebody thought of, it SWEEPS every
        fixed triple of aim, arc and power on a grid and takes the best one
        that exists. A player who solves each shot has to beat all of them.
     3) THE RUN GETS HARDER: the last three shots convert worse than the first
        three for the same skilled play.
     4) NOTHING IS UNWINNABLE OR FREE: every one of the ten shots can be made
        by some legal release, and none of them is made by every release.
     5) ARC AND THE CONTEST BOTH MATTER: the ring really does close up as the
        shot flattens (the measured window shrinks with the entry angle and
        dies near 32 degrees, which is why coaches teach arc), and a higher
        hand blocks more of the same shots.

   Negative control (house rule: prove the check can fail), and it reproduces a
   defect that was MEASURED here rather than one that was invented to have
   something to fail on:
     SIM_BUZZER_CONTROL=relativebar rewrites one line of a bundled copy of the
     engine so the strength bar becomes a PERCENTAGE OF THE STRENGTH THIS SHOT
     NEEDS instead of an absolute release speed. That is the obvious way to
     build a power bar and it is how most arcade shooting games do it, which is
     exactly why it is the right control. Section 2 must then go red, and it
     goes red hard: with a relative bar, "aim straight, maximum arc, stop it in
     the middle" scores 2620 against a player who solves every shot on 548,
     because the middle of the bar is correct on all ten distances at once. One
     constant then beats skill by nearly five to one, which is the same shape
     of failure Free Kick shipped in its first draft. The control refuses to
     run if the rewrite changed nothing.

     THE FIRST CONTROL WRITTEN HERE WAS DEAD AND IS WORTH RECORDING. It zeroed
     the spray, on the theory that a free release would make the moon ball
     dominant the way a free flight made Free Kick's top corner dominant. It
     changed the numbers and changed no verdict: 5.20x with the spray gone
     against 5.35x with it. The spray is not what stops a constant release in
     this game; the absolute bar is, because no single power can be right at
     ten different distances. A control has to be run before it can be
     believed.

   Note for whoever edits the control: a fresh checkout of this repo is CRLF,
   so the needle below is deliberately a single line with no newline in it.
   A multi line needle silently finds nothing and the control dies quiet.

   Run: node scripts/simBuzzerBeater.mjs
*/
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROOT_URL = ROOT.replaceAll('\\', '/');
const CONTROL = process.env.SIM_BUZZER_CONTROL || '';
if (CONTROL && CONTROL !== 'relativebar') { console.error(`SIM_BUZZER_CONTROL=${CONTROL} is not a control this harness knows`); process.exit(1); }

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };

const TMP = os.tmpdir().replace(/\\/g, '/');
let LIB = `${ROOT_URL}/src/lib/buzzerBeater.ts`;
if (CONTROL === 'relativebar') {
  const src = fs.readFileSync(path.join(ROOT, 'src/lib/buzzerBeater.ts'), 'utf8');
  const from = '  const clean = V_MIN + clamp(release.power, 0, 1) * (V_MAX - V_MIN);';
  if (!src.includes(from)) { console.error('control cannot run: buzzerBeater.ts is not in the shape this control rewrites'); process.exit(1); }
  LIB = `${TMP}/buzzerBeater.control.ts`;
  /* arcade.ts goes next to the rewritten copy so `./arcade` still resolves.
     That module imports nothing, on purpose, so this is the whole graph. */
  fs.copyFileSync(path.join(ROOT, 'src/lib/arcade.ts'), `${TMP}/arcade.ts`);
  fs.writeFileSync(LIB, src.replace(from, '  const clean = requiredSpeed(setup.distance, launchDeg) * (0.86 + clamp(release.power, 0, 1) * 0.28);'));
  console.log('NEGATIVE CONTROL ON: the strength bar is a percentage of the strength this shot needs, the obvious way to build it');
}
const ENTRY = `${TMP}/buzzerBeater.entry.mjs`;
const BUNDLE = `${TMP}/buzzerBeater.bundle.mjs`;
fs.writeFileSync(ENTRY, `export * as bb from '${LIB}';\n`);
execSync(`"${ROOT}/node_modules/.bin/esbuild" "${ENTRY}" --bundle --format=esm --platform=node --outfile="${BUNDLE}" --log-level=error --alias:@=${ROOT_URL}/src`, { stdio: 'inherit' });
const { bb } = await import(pathToFileURL(BUNDLE).href);
const { buildRun, takeShot, lehmer, maxRunScore, daySeed, launchDegFor, speedFor, RIM_HEIGHT, RELEASE_HEIGHT, ROUNDS_PER_RUN, FREE_THROW } = bb;

const G = 9.81;
const RISE = RIM_HEIGHT - RELEASE_HEIGHT;

/* The strength a shot really needs, solved from the same parabola the engine
   uses, then turned back into a bar position. This is what "knowing the shot"
   means, and it is the only thing the skilled player below knows that a
   spammer does not. */
function powerFor(distance, arc) {
  const theta = (launchDegFor(arc) * Math.PI) / 180;
  const climb = distance * Math.tan(theta) - RISE;
  if (climb <= 0) return null;
  const v = Math.sqrt((G * distance * distance) / (2 * Math.cos(theta) * Math.cos(theta) * climb));
  const lo = speedFor(0);
  const span = speedFor(1) - lo;
  const p = (v - lo) / span;
  return p >= 0 && p <= 1 ? p : null;
}

/* A clean flight, for working out what a release WOULD do before taking it.
   rng() of 0.5 makes the spray exactly zero, so this reads the shot rather
   than gambling on it, and it does not touch the run's own generator. */
const NO_SPRAY = () => 0.5;

/* The players. Each is a function from a shot to a release, so "skill" is a
   strategy and not a number this harness made up.

   SKILLED knows exactly one thing, and it is the thing the game's own guide
   teaches: shoot it high from close, a touch flatter as you back up, and
   higher again when there is a hand in your face. That is not a rule invented
   to make this harness pass. It is what the physics says, and it is the
   opposite of the obvious answer: from the free throw line the ball needs so
   little speed that a big arc is free, while from deep the same arc has to be
   thrown so hard that the release starts to spray. The player picks the arc
   off a coarse grid that lands nearest that entry angle while clearing the
   contest, takes the strength that arc really needs, and misses the bar by a
   human amount. It does not read the spray constants, so the negative control
   cannot quietly make it play differently. */
const ARC_GRID = [0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1];
const SKILLED = (setup, rng) => {
  const contest = setup.contestReach > 0 ? (setup.contestReach - 2.3) / 0.76 : 0;
  const targetEntry = 60 - (setup.distance - FREE_THROW) * 1.8 + contest * 8;
  const fade = -setup.contestSide * contest * 0.2;
  let pick = null;
  for (const arc of ARC_GRID) {
    const want = powerFor(setup.distance, arc);
    if (want === null || want > 0.97) continue;
    const clean = takeShot({ x: fade, arc, power: want }, setup, NO_SPRAY);
    if (clean.blocked) continue;
    const off = Math.abs(clean.entryDeg - targetEntry);
    if (!pick || off < pick.off) pick = { arc, want, off };
  }
  if (!pick) return { x: 0, arc: 0.9, power: 0.92 };
  /* A human sized miss on the bar, and it is a BELL rather than a flat band.
     A uniform error makes every shot either certain or impossible, because the
     window is either wider than the error bound or narrower than it, and the
     make rate then jumps off a cliff instead of sloping. Three draws averaged
     gives tails, which is what a thumb on a sweeping bar really does. */
  const wobble = ((rng() + rng() + rng()) / 3 - 0.5) * 0.16;
  return {
    x: fade + (rng() - 0.5) * 0.06,
    arc: pick.arc,
    power: Math.max(0, Math.min(1, pick.want + wobble)),
  };
};

const SPAMMERS = {
  'always flat and hard': () => ({ x: 0, arc: 0.06, power: 0.92 }),
  'always a moon ball': () => ({ x: 0, arc: 1, power: 0.92 }),
  'always the middle of everything': () => ({ x: 0, arc: 0.5, power: 0.5 }),
  'always the free throw release': () => ({ x: 0, arc: 0.62, power: 0.16 }),
  'random every time': (setup, rng) => ({ x: rng() * 2 - 1, arc: rng(), power: rng() }),
};

function playRun(seed, strategy) {
  const shots = buildRun(seed);
  const rng = lehmer(seed ^ 0x5eed1234);
  let score = 0;
  let made = 0;
  const perShot = [];
  for (const setup of shots) {
    const r = takeShot(strategy(setup, rng), setup, rng);
    score += r.points;
    if (r.made) made += 1;
    perShot.push(r);
  }
  return { score, made, perShot, shots };
}

const RUNS = 400;
const mean = a => a.reduce((x, y) => x + y, 0) / a.length;

console.log('1) one seed, one run: the daily is the same ten shots for everyone');
{
  const a = JSON.stringify(buildRun(20260904));
  const b = JSON.stringify(buildRun(20260904));
  if (a !== b) fail('buildRun is not deterministic, so two players would get different dailies');
  const c = JSON.stringify(buildRun(20260905));
  if (a === c) fail('two different days build the same run, so the daily never changes');
  const one = playRun(777, SKILLED);
  const two = playRun(777, SKILLED);
  if (one.score !== two.score) fail(`the same seed and strategy scored ${one.score} then ${two.score}, so the engine is not pure`);
  console.log(`   run 20260904 is stable, differs from the next day, and a replay of seed 777 scores ${one.score} twice`);
}

console.log('2) skill beats spam: reading the shot is worth more than any one fixed release');
{
  const skilled = [];
  for (let s = 1; s <= RUNS; s += 1) skilled.push(playRun(s * 7919, SKILLED));
  const skilledScore = mean(skilled.map(r => r.score));
  const skilledMade = mean(skilled.map(r => r.made));
  console.log(`   skilled: ${skilledScore.toFixed(0)} points, ${skilledMade.toFixed(1)} of ${ROUNDS_PER_RUN} made`);
  for (const [name, strategy] of Object.entries(SPAMMERS)) {
    const runs = [];
    for (let s = 1; s <= RUNS; s += 1) runs.push(playRun(s * 7919, strategy));
    console.log(`   ${name}: ${mean(runs.map(r => r.score)).toFixed(0)} points, ${mean(runs.map(r => r.made)).toFixed(1)} made`);
  }

  /* THE STRONGER SIGNAL, and the reason this section is not just five named
     spammers: sweep every fixed triple on a grid and take the best one that
     exists, so the claim is "no constant release is close", not "the four I
     thought of are not close". The sweep is on a smaller sample because it is
     585 strategies; the skilled line is re-measured on the same sample so the
     two numbers are comparable. */
  const SWEEP_RUNS = 60;
  const seeds = Array.from({ length: SWEEP_RUNS }, (_, i) => (i + 1) * 31337);
  const scoreOf = strategy => mean(seeds.map(s => playRun(s, strategy).score));
  const skilledSmall = scoreOf(SKILLED);
  let best = { label: null, score: -1 };
  for (let xi = -2; xi <= 2; xi += 1) {
    for (let ai = 0; ai <= 8; ai += 1) {
      for (let pi = 0; pi <= 12; pi += 1) {
        const rel = { x: xi / 2.5, arc: ai / 8, power: pi / 12 };
        const sc = scoreOf(() => rel);
        if (sc > best.score) best = { label: `aim ${rel.x.toFixed(1)}, arc ${rel.arc.toFixed(2)}, power ${rel.power.toFixed(2)}`, score: sc };
      }
    }
  }
  const ratio = skilledSmall / Math.max(best.score, 1);
  console.log(`   swept 585 fixed releases; the best is ${best.label} at ${best.score.toFixed(0)}`);
  console.log(`   skilled on the same sample: ${skilledSmall.toFixed(0)}, which is ${ratio.toFixed(2)}x the best constant`);
  /* The floor comes from measured headroom, not a number that felt right. On
     healthy code this ratio sits around 5.3, and it stayed at 5.2 even with
     the spray removed entirely, so the distribution is nowhere near 1.35. The
     control puts it at 0.21. Free Kick's equivalent floor is the same 1.35
     against a healthy 1.74, which is a tighter margin than this one has, so
     the two games are held to the same bar and this one clears it further. */
  if (ratio < 1.35) fail(`the best fixed release scores ${best.score.toFixed(0)} against skilled ${skilledSmall.toFixed(0)} (${ratio.toFixed(2)}x); one constant is close to optimal, so this is not a game of skill`);
  if (skilledMade < 3) fail(`a skilled player makes only ${skilledMade.toFixed(1)} of ${ROUNDS_PER_RUN}, which is too punishing to be fun`);
  if (skilledMade > 9) fail(`a skilled player makes ${skilledMade.toFixed(1)} of ${ROUNDS_PER_RUN}, so there is nothing to miss`);
}

console.log('3) the run gets harder: the last three shots are meaner than the first three');
{
  const early = [];
  const late = [];
  for (let s = 1; s <= RUNS; s += 1) {
    const r = playRun(s * 104729, SKILLED);
    early.push(r.perShot.slice(0, 3).filter(k => k.made).length / 3);
    late.push(r.perShot.slice(-3).filter(k => k.made).length / 3);
  }
  const e = mean(early);
  const l = mean(late);
  console.log(`   first three made ${(e * 100).toFixed(0)}% of the time, last three ${(l * 100).toFixed(0)}%`);
  if (!(e > l + 0.05)) fail(`the last three shots convert at ${(l * 100).toFixed(0)}% against the first three at ${(e * 100).toFixed(0)}%, so the run does not get harder`);
}

console.log('4) every shot is winnable and none of them is free');
{
  const shots = buildRun(20260904);
  let unwinnable = 0;
  let free = 0;
  for (const setup of shots) {
    let made = 0;
    let tried = 0;
    for (let xi = -4; xi <= 4; xi += 2) {
      for (let ai = 0; ai <= 10; ai += 1) {
        for (let pi = 0; pi <= 40; pi += 1) {
          tried += 1;
          if (takeShot({ x: xi / 5, arc: ai / 10, power: pi / 40 }, setup, lehmer(99)).made) made += 1;
        }
      }
    }
    if (made === 0) { unwinnable += 1; console.log(`   UNWINNABLE: ${setup.label}`); }
    if (made === tried) { free += 1; console.log(`   FREE: ${setup.label}`); }
  }
  console.log(`   ${shots.length} shots swept over 2255 releases each: ${unwinnable} unwinnable, ${free} free`);
  if (unwinnable > 0) fail(`${unwinnable} shot(s) cannot be made by any release`);
  if (free > 0) fail(`${free} shot(s) go in from every release, so they ask nothing`);
}

console.log('5) the ring closes as the shot flattens, and a higher hand blocks more');
{
  /* The measured window against the entry angle. This is the one piece of real
     geometry the whole game hangs on: the ring keeps its width but loses its
     depth as the ball comes in flatter, and near 32 degrees there is no depth
     left at all. Read it off the engine rather than asserting the formula. */
  const probe = { distance: 6.6, contestReach: 0, contestDist: 0, contestSide: 0, label: 'probe' };
  const rows = [];
  for (const arc of [0.1, 0.35, 0.6, 0.85]) {
    const p = powerFor(probe.distance, arc);
    if (p === null) continue;
    const r = takeShot({ x: 0, arc, power: p }, probe, lehmer(3));
    rows.push({ arc, entry: r.entryDeg, window: r.depthWindow });
  }
  for (const r of rows) console.log(`   arc ${r.arc.toFixed(2)}: arrives at ${r.entry.toFixed(0)} degrees, depth window ${(r.window * 100).toFixed(1)} cm`);
  if (rows.length < 3) fail('fewer than three arcs could even reach the ring from 6.6 m, so this section measured nothing');
  else {
    const flat = rows[0];
    const high = rows[rows.length - 1];
    if (!(high.window > flat.window * 2)) fail(`the flattest arc gets a ${(flat.window * 100).toFixed(1)} cm window and the highest ${(high.window * 100).toFixed(1)} cm; arc buys nothing, so the shape of the shot does not matter`);
    if (flat.entry >= 33 && flat.window > 0.02) fail(`a ${flat.entry.toFixed(0)} degree entry still has a ${(flat.window * 100).toFixed(1)} cm window, so the flat shot is not being punished`);
  }

  /* A higher hand blocks more of the same releases. */
  const releases = [];
  for (let i = 0; i < 600; i += 1) {
    const rng = lehmer(i + 1);
    releases.push({ x: rng() * 1.2 - 0.6, arc: rng(), power: 0.3 + rng() * 0.6 });
  }
  const blockRate = reach => {
    const setup = { distance: 6.6, contestReach: reach, contestDist: 0.9, contestSide: 1, label: 'probe' };
    return releases.filter((rel, i) => takeShot(rel, setup, lehmer(i + 500)).blocked).length / releases.length;
  };
  const low = blockRate(2.4);
  const high = blockRate(3.0);
  console.log(`   a 2.40 m hand blocks ${(low * 100).toFixed(0)}% of the same releases, a 3.00 m hand ${(high * 100).toFixed(0)}%`);
  if (!(high > low + 0.08)) fail(`the big hand blocks ${(high * 100).toFixed(0)}% against the low hand's ${(low * 100).toFixed(0)}%, so the defender does nothing`);
}

console.log('6) the game is actually wired into the site');
{
  /* The same shape simSportsBingo carries. A route that builds and plays but is
     not in the registry, not routed, or has no guide bundle entry is a page
     nobody can find and a "?" button with nothing behind it, and none of the
     other five sections can see any of that. */
  const read = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8');
  const registry = read('src/data/gameRegistry.ts');
  const app = read('src/App.tsx');
  const loader = read('src/data/gameContent/loader.ts');
  const basketball = read('src/data/gameContent/basketball.ts');
  if (!/path: '\/buzzer-beater'/.test(registry)) fail('no registry row for /buzzer-beater, so the game is unreachable from the home page');
  if (!/path="\/buzzer-beater"/.test(app)) fail('no route for /buzzer-beater in src/App.tsx');
  if (!/'\/buzzer-beater': 'basketball'/.test(loader)) fail('no PATH_BUNDLE guide entry for /buzzer-beater, so the how to play button has nothing behind it');
  if (!/'\/buzzer-beater': \{/.test(basketball)) fail('no guide written for /buzzer-beater in the basketball content file');
  /* The cap row is a database fact, so this only checks the migration that
     carries it exists and names a number; simLeaderboardCaps holds the live
     table. */
  const caps = fs.readdirSync(path.join(ROOT, 'supabase/migrations'))
    .filter(f => /caps_allowlist/.test(f))
    .map(f => read(`supabase/migrations/${f}`))
    .join('\n');
  if (!/'buzzer-beater',\s*\d+/.test(caps)) fail('no committed migration puts buzzer-beater in game_score_caps with a measured cap, so every point earned would be discarded');
  console.log('   registry row, App route, guide bundle entry and cap migration all present');
}

console.log('7) a perfect run is worth what the leaderboard cap says it is');
{
  /* The cap in public.game_score_caps has to be a MEASURED perfect run, not a
     guess: too low and honest scores are clipped, too high and the game can
     never rank. Print it so the number in the migration has a source. */
  let lo = Infinity;
  let hi = -Infinity;
  const day = new Date(Date.UTC(2026, 0, 1));
  for (let i = 0; i < 800; i += 1) {
    const iso = day.toISOString().slice(0, 10);
    const ceiling = maxRunScore(buildRun(daySeed(iso)));
    if (ceiling < lo) lo = ceiling;
    if (ceiling > hi) hi = ceiling;
    day.setUTCDate(day.getUTCDate() + 1);
  }
  console.log(`   over 800 consecutive real dates a flawless run pays ${lo} to ${hi}`);
  /* The cap committed in supabase/migrations is the top of that range. If the
     scoring changes and the ceiling moves past it, honest scores start getting
     clipped in silence, so the number is held here against the migration that
     carries it. */
  const capSql = fs.readdirSync(path.join(ROOT, 'supabase/migrations'))
    .filter(f => /caps_allowlist_buzzer_beater/.test(f))
    .map(f => fs.readFileSync(path.join(ROOT, 'supabase/migrations', f), 'utf8'))
    .join('\n');
  const capped = Number((capSql.match(/'buzzer-beater',\s*(\d+)/) || [])[1]);
  console.log(`   the committed leaderboard cap is ${capped || 'MISSING'}`);
  if (!capped) fail('the committed migration does not name a cap for buzzer-beater');
  else if (capped < hi) fail(`the cap is ${capped} but a flawless run can pay ${hi}, so the best runs would be clipped`);
  else if (capped > hi * 1.15) fail(`the cap is ${capped} against a real ceiling of ${hi}, which is high enough that nobody can rank near it`);
  if (hi < 1200) fail(`a flawless run is only worth ${hi}, which is too thin to rank against the rest of the board`);
}

if (CONTROL) {
  if (failures > 0) { console.log(`\ncontrol "${CONTROL}": ${failures} failure(s) fired as expected, the check works`); process.exit(0); }
  console.error(`\ncontrol "${CONTROL}": changed NOTHING, the check is dead`);
  process.exit(1);
}
if (failures > 0) { console.error(`\nsimBuzzerBeater: ${failures} failure(s)`); process.exit(1); }
console.log('\nsimBuzzerBeater: green. Arc pays, the hand is real, and no one release solves ten shots.');
