/* Career drills harness: the three drills you play in Soccer Career can each
   be won by reading the round and cannot be won by pressing one thing.

   Round 468. Free Kick and Buzzer Beater are the two games on this site you
   play rather than answer, and the law their harnesses hold is the law here,
   because these three drills run on the same engine (src/lib/arcade.ts plus
   Free Kick's flight and keeper): SKILL BEATS SPAM by a measured margin, no
   fixed input is near optimal, the run gets harder, every round is winnable
   and none is free. This repo has shipped the opposite before, twice (the
   Player Stock Market's cheapest XI scoring 93.8, and Free Kick's own first
   draft, where top left at full power beat a thinking player 2539 to 1206),
   so it is measured, never assumed.

   What it holds, over hundreds of seeded runs against the real module,
   bundled with esbuild the way simFreeKick and simClubManagerBudget do it:
     1) ONE SEED, ONE RUN, for each drill: a daily is the same ten rounds for
        everybody at that position, and two days differ.
     2) SKILL BEATS SPAM, for each drill: a player who reads the round beats
        every named fixed input AND the best fixed input found by sweeping a
        grid of them, by a floor set from the measured gap.
     3) THE RUN GETS HARDER: the last three rounds convert worse than the first
        three for the same skilled play, in every drill.
     4) NOTHING IS UNWINNABLE OR FREE: every round of a sample run can be won
        by some legal input, and none is won by every input.
     5) THE MECHANICS ARE THE ONES THE COPY DESCRIBES: the wall blocks when it
        is shut and passes when it is open, pace reaches the wall sooner, a
        press on the man is a foul, a press on a ball at his feet is a foul,
        a press on the loose ball wins it, a full stretch takes longer than a
        hop, and a harder shot is harder to hold.
     6) GROWTH IS BOUNDED AND RESPECTS HEADROOM: a session pays at most +2,
        never more than the room under the ceiling, only to the drill's own
        attribute, only through statBoostNextSeason, and once a season.

   Negative controls (house rule: prove the check can fail). The first one
   reproduces the defect this harness actually measured while the drills were
   being tuned, rather than one invented to have something to fail on; every
   control refuses to run if its rewrite changed nothing.
     SIM_CAREER_DRILLS_CONTROL=sighted sets WALL_UNSIGHTED back to 1, so the
     keeper behind the wall reads a shot through the gap as well as Free
     Kick's keeper reads one in the open. That is the shape the wall shot was
     first written in, and it was measured on 2026-09-05: with Free Kick's
     vertical tolerance as well he held 92 percent of what came through the
     gap, the skilled player scored 0.7 of 10, and five of the sample day's
     ten rounds could not be won by any of 1950 inputs. With only the sight
     put back, which is what this control does, the skilled player falls
     from 6.9 to 1.6 of 10 and one round of the sample day goes unwinnable,
     so sections 2, 4 and 6 go red.
     SIM_CAREER_DRILLS_CONTROL=alwaysopen holds the gap open, so the timing
     press is decorative. Measured: the best swept fixed wall shot nearly
     triples (201 to 585 points, the skilled margin falls from 9.04x to
     3.10x) and section 5's shut wall check fires.
     SIM_CAREER_DRILLS_CONTROL=freeloose lowers TACKLE_LOOSE to 0, so the
     ball at his feet is no longer his and going through it is no longer a
     foul. Section 5 fires. Section 2 does NOT, and that is worth knowing: a
     fixed press still has to land on a ball whose lane and speed change
     every round, so the position axis alone keeps the tackle a game and the
     foul rule is there for the feel of it, not the margin.

     ONE CONTROL WRITTEN FIRST WAS DEAD AND IS RECORDED HERE, the way
     simBuzzerBeater records its own. "nospray" zeroed the wall shot's spray,
     on Free Kick's theory that a free flight makes full power dominant. It
     moved the skilled margin from 9.04x to 8.19x and no verdict in section
     2, because the gap still has to be timed and no fixed press is right at
     ten different phases; the only thing it tripped was one round of the
     sweep going unwinnable under the sweep's fixed generator, which is an
     accident of that generator and not a defect. A control has to be run
     before it can be believed.

   Note for whoever edits the controls: a fresh checkout is CRLF, so every
   needle below is a single line with no newline in it, and the source is
   normalised before matching.

   Run: node scripts/simCareerDrills.mjs
*/
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROOT_URL = ROOT.replaceAll('\\', '/');
const CONTROL = process.env.SIM_CAREER_DRILLS_CONTROL || '';

/* Every control is one line rewritten in a copy of the rules module. */
const CONTROLS = {
  sighted: {
    from: 'export const WALL_UNSIGHTED = 0.45;',
    to: 'export const WALL_UNSIGHTED = 1;',
    note: 'the keeper behind the wall sees the shot as well as one in the open, the shape the wall shot was first written in',
  },
  alwaysopen: {
    from: '  return Math.max(0, Math.sin(2 * Math.PI * (t / setup.period + setup.phase)));',
    to: '  return 1;',
    note: 'the wall gap never shuts, so the timing press is decorative',
  },
  freeloose: {
    from: 'export const TACKLE_LOOSE = 0.35;',
    to: 'export const TACKLE_LOOSE = 0;',
    note: 'the ball at his feet is no longer his, so going through it is no longer a foul',
  },
};
if (CONTROL && !CONTROLS[CONTROL]) { console.error(`SIM_CAREER_DRILLS_CONTROL=${CONTROL} is not a control this harness knows`); process.exit(1); }

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };

const TMP = os.tmpdir().replace(/\\/g, '/');
let LIB = `${ROOT_URL}/src/lib/careerDrills.ts`;
if (CONTROL) {
  const c = CONTROLS[CONTROL];
  const src = fs.readFileSync(path.join(ROOT, 'src/lib/careerDrills.ts'), 'utf8').replace(/\r\n/g, '\n');
  if (!src.includes(c.from)) { console.error('control cannot run: careerDrills.ts is not in the shape this control rewrites'); process.exit(1); }
  /* The copy lives in the temp directory, so its relative imports are
     rewritten to point back at the real modules beside the original. */
  const rewritten = src
    .replace(c.from, c.to)
    .replace("from './arcade'", `from '${ROOT_URL}/src/lib/arcade'`)
    .replace("from './freeKick'", `from '${ROOT_URL}/src/lib/freeKick'`)
    .replace("from './soccerCareerEngine'", `from '${ROOT_URL}/src/lib/soccerCareerEngine'`);
  if (rewritten === src) { console.error('control cannot run: the rewrite changed nothing'); process.exit(1); }
  LIB = `${TMP}/careerDrills.control.ts`;
  fs.writeFileSync(LIB, rewritten);
  console.log(`NEGATIVE CONTROL ON: ${c.note}`);
}
const ENTRY = `${TMP}/careerDrills.entry.mjs`;
const BUNDLE = `${TMP}/careerDrills.bundle.mjs`;
fs.writeFileSync(ENTRY, `
const store = new Map();
globalThis.localStorage = {
  getItem: k => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => { store.set(k, String(v)); },
  removeItem: k => { store.delete(k); },
  key: i => [...store.keys()][i] ?? null,
  get length() { return store.size; },
  clear: () => store.clear(),
};
const mod = await import('${LIB}');
export const cd = mod;
`);
execSync(`"${ROOT}/node_modules/.bin/esbuild" "${ENTRY}" --bundle --format=esm --platform=node --outfile="${BUNDLE}" --log-level=error --alias:@=${ROOT_URL}/src`, { stdio: 'inherit' });
const { cd } = await import(pathToFileURL(BUNDLE).href);
const {
  lehmer, drillSeed, ROUNDS_PER_RUN,
  buildWallShotRun, takeWallShot, wallNextPeak, wallTravel, wallOpenAt, maxWallShotScore,
  buildTackleRun, makeTackle, tackleNextLoose, tackleBallAt, tackleFeetAt, tackleDeadline, tackleTouchAt, maxTackleScore, TACKLE_LOOSE,
  buildGloveRun, makeSave, gloveDeadline, diveTime, GLOVE_ORIGIN, GLOVE_MAX_REACH, maxGloveScore,
  sessionScore, drillBoost, drillHeadroom, applyDrillResult, drillForPosition, DRILL_META,
} = cd;

const mean = a => a.reduce((x, y) => x + y, 0) / a.length;
const RUNS = 300;

/* ── the players ──
   Each strategy is a function from a round to an input, so "skill" is a way
   of reading the round and not a number this harness made up. */

const WALL_SKILLED = (setup, rng) => {
  const power = 0.62 + (setup.distance - 16) * 0.02 + rng() * 0.06;
  /* Sees the wall for a third of a second, then times the release so the ball
     arrives at the next peak, give or take forty milliseconds of reaction. */
  let peak = wallNextPeak(setup, 0.3);
  let press = peak - wallTravel(power) + (rng() - 0.5) * 0.08;
  if (press < 0) { peak = wallNextPeak(setup, peak + 0.1); press = peak - wallTravel(power) + (rng() - 0.5) * 0.08; }
  return { x: setup.gapCentre + (rng() - 0.5) * 0.06, y: 0.8 + rng() * 0.15, power, press };
};
const WALL_SPAM = {
  'down the middle, full power, half a second in': () => ({ x: 0, y: 0.5, power: 1, press: 0.5 }),
  'top right, full power, straight away': () => ({ x: 0.9, y: 0.9, power: 1, press: 0.3 }),
  'bottom left, medium, a second in': () => ({ x: -0.9, y: 0.1, power: 0.7, press: 1.0 }),
  'high and soft, late': () => ({ x: 0, y: 0.9, power: 0.5, press: 1.6 }),
  'random every time': (setup, rng) => ({ x: rng() * 2 - 1, y: rng(), power: 0.4 + rng() * 0.6, press: rng() * 2.5 }),
};
const WALL_GRID = [];
for (const x of [-0.8, -0.4, 0, 0.4, 0.8]) for (const y of [0.2, 0.5, 0.85]) for (const power of [0.5, 0.75, 1]) for (const press of [0.2, 0.6, 1.0, 1.4, 1.8]) WALL_GRID.push({ x, y, power, press });

const TACKLE_SKILLED = (setup, rng) => {
  /* Watches him for a third of a second, then goes for the ball at the top of
     the next touch, a fingertip wide of it and fifty milliseconds either side
     of the moment, which is what a good thumb does on a moving target. */
  let t = tackleNextLoose(setup, 0.35);
  if (t >= tackleDeadline(setup) - 0.05) t = tackleNextLoose(setup, 0.12);
  const ball = tackleBallAt(setup, t);
  return { x: ball.x + (rng() - 0.5) * 0.09, y: ball.y + (rng() - 0.5) * 0.09, press: t + (rng() - 0.5) * 0.14 };
};
const TACKLE_SPAM = {
  'the middle of the screen, early': () => ({ x: 0.5, y: 0.5, press: 0.8 }),
  'the middle of the screen, late': () => ({ x: 0.5, y: 0.5, press: 1.3 }),
  'left of centre, very early': () => ({ x: 0.3, y: 0.45, press: 0.5 }),
  'random every time': (setup, rng) => ({ x: rng(), y: 0.3 + rng() * 0.4, press: rng() * 2.5 }),
};
const TACKLE_GRID = [];
for (const x of [0.2, 0.35, 0.5, 0.65, 0.8]) for (const y of [0.35, 0.45, 0.55, 0.65]) for (const press of [0.3, 0.6, 0.9, 1.2, 1.5, 1.8]) TACKLE_GRID.push({ x, y, press });

const GLOVE_SKILLED = (setup, rng) => {
  /* Reads the side off the tell and the height off the first frames of the
     flight, and leaves as late as the dive allows: after the ball is struck
     when the shot gives him that long, before it when it does not. */
  const dx0 = setup.target.x - GLOVE_ORIGIN.x;
  const dy0 = setup.target.y - GLOVE_ORIGIN.y;
  const reach = Math.min(1, Math.hypot(dx0, dy0) / GLOVE_MAX_REACH);
  const arrival = gloveDeadline(setup);
  const latest = arrival - diveTime(reach);
  let release;
  let jx;
  let jy;
  if (latest >= setup.shotAt + 0.12) { release = setup.shotAt + 0.12 + rng() * 0.05; jx = 0.28; jy = 0.28; }
  else if (latest >= setup.tellAt + 0.15) { release = latest - 0.02 - rng() * 0.03; jx = 0.2; jy = 0.45; }
  else { release = setup.tellAt + 0.15 + rng() * 0.05; jx = 0.3; jy = 0.6; }
  return { dx: dx0 + (rng() - 0.5) * 2 * jx, dy: dy0 + (rng() - 0.5) * 2 * jy, release };
};
const GLOVE_SPAM = {
  'full stretch low left, a second in': () => ({ dx: -2.6, dy: -0.5, release: 1.0 }),
  'full stretch high right, later': () => ({ dx: 2.4, dy: 1.0, release: 1.3 }),
  'never move': () => ({ dx: 0, dy: 0, release: 0.5 }),
  'random every time': (setup, rng) => ({ dx: (rng() * 2 - 1) * 2.8, dy: (rng() * 2 - 1) * 1.4, release: rng() * 2.2 }),
};
const GLOVE_GRID = [];
for (const dx of [-2.4, -1.2, 0, 1.2, 2.4]) for (const dy of [-0.6, 0.2, 1.0]) for (const release of [0.5, 0.9, 1.3, 1.7]) GLOVE_GRID.push({ dx, dy, release });

const DRILLS = {
  wallshot: {
    build: buildWallShotRun, max: maxWallShotScore,
    play: (input, setup, rng) => { const r = takeWallShot(input, setup, rng); return { won: r.won, points: r.points, r }; },
    skilled: WALL_SKILLED, spam: WALL_SPAM, grid: WALL_GRID,
    sweep: setup => { const out = []; for (let xi = -9; xi <= 9; xi += 2) for (let yi = 1; yi <= 9; yi += 2) for (const power of [0.5, 0.75, 1]) for (let p = 0; p <= 2.4; p += 0.2) out.push({ x: xi / 10, y: yi / 10, power, press: p }); return out; },
  },
  tackle: {
    build: buildTackleRun, max: maxTackleScore,
    play: (input, setup) => { const r = makeTackle(input, setup); return { won: r.won, points: r.points, r }; },
    skilled: TACKLE_SKILLED, spam: TACKLE_SPAM, grid: TACKLE_GRID,
    sweep: setup => { const out = []; const end = tackleDeadline(setup); for (let xi = 1; xi <= 9; xi += 1) for (let yi = 6; yi <= 14; yi += 1) for (let p = 0.1; p < end; p += 0.1) out.push({ x: xi / 10, y: yi / 20, press: p }); return out; },
  },
  gloves: {
    build: buildGloveRun, max: maxGloveScore,
    play: (input, setup) => { const r = makeSave(input, setup); return { won: r.saved, points: r.points, r }; },
    skilled: GLOVE_SKILLED, spam: GLOVE_SPAM, grid: GLOVE_GRID,
    sweep: () => { const out = []; for (let dx = -2.8; dx <= 2.81; dx += 0.4) for (let dy = -1.0; dy <= 1.41; dy += 0.3) for (let r = 0.2; r <= 2.2; r += 0.2) out.push({ dx, dy, release: r }); return out; },
  },
};

function playRun(drill, seed, strategy) {
  const run = drill.build(seed);
  const rng = lehmer(seed ^ 0x5eed1234);
  let score = 0;
  let count = 0;
  const per = [];
  for (const setup of run) {
    const input = typeof strategy === 'function' ? strategy(setup, rng) : strategy;
    const out = drill.play(input, setup, rng);
    score += out.points;
    if (out.won) count += 1;
    per.push(out);
  }
  return { score, count, per, run };
}

/* The floors, set from measured headroom (2026-09-05, 300 runs each): skilled
   sat at 9.04x the best fixed wall shot, 4.36x the best fixed tackle and
   6.46x the best fixed dive, named or swept. Free Kick's floor is 1.35
   against a measured margin near 2x; these sit at 2.5, well under the
   weakest of the three and well over the 1.0 a one input drill shows, so a
   change that halved a margin would still pass and a change that made one
   press optimal would not. */
const RATIO_FLOOR = { wallshot: 2.5, tackle: 2.5, gloves: 2.5 };

console.log('1) one seed, one run: the daily is the same ten rounds for everybody at that position');
{
  for (const [kind, drill] of Object.entries(DRILLS)) {
    const a = JSON.stringify(drill.build(drillSeed(kind, '2026-09-05')));
    const b = JSON.stringify(drill.build(drillSeed(kind, '2026-09-05')));
    const c = JSON.stringify(drill.build(drillSeed(kind, '2026-09-06')));
    if (a !== b) fail(`${kind}: buildRun is not deterministic, so two players would get different dailies`);
    if (a === c) fail(`${kind}: two different days build the same run, so the daily never changes`);
    const one = playRun(drill, 777, drill.skilled);
    const two = playRun(drill, 777, drill.skilled);
    if (one.score !== two.score) fail(`${kind}: the same seed and strategy scored ${one.score} then ${two.score}, so the engine is not pure`);
    console.log(`   ${kind}: 2026-09-05 is stable, differs from the next day, and a replay of seed 777 scores ${one.score} twice`);
  }
  const seeds = new Set(['wallshot', 'tackle', 'gloves'].map(k => drillSeed(k, '2026-09-05')));
  if (seeds.size !== 3) fail('the three drills share a seed on the same day');
  if (drillForPosition('GK') !== 'gloves' || drillForPosition('CB') !== 'tackle' || drillForPosition('CDM') !== 'tackle' || drillForPosition('ST') !== 'wallshot' || drillForPosition('CM') !== 'wallshot') fail('a position is not routed to the drill the guide says it gets');
}

console.log('2) skill beats spam: reading the round is worth more than any one fixed input, named or swept');
const skilledCounts = {};
for (const [kind, drill] of Object.entries(DRILLS)) {
  const skilled = [];
  for (let s = 1; s <= RUNS; s += 1) skilled.push(playRun(drill, s * 7919, drill.skilled));
  const skilledScore = mean(skilled.map(r => r.score));
  const skilledCount = mean(skilled.map(r => r.count));
  skilledCounts[kind] = skilledCount;
  console.log(`   ${kind} skilled: ${skilledScore.toFixed(0)} points, ${skilledCount.toFixed(1)} of ${ROUNDS_PER_RUN} ${DRILL_META[kind].verb}`);
  let best = { name: null, score: -1, count: 0 };
  for (const [name, strategy] of Object.entries(drill.spam)) {
    const runs = [];
    for (let s = 1; s <= RUNS; s += 1) runs.push(playRun(drill, s * 7919, strategy));
    const sc = mean(runs.map(r => r.score));
    const c = mean(runs.map(r => r.count));
    console.log(`   ${kind} ${name}: ${sc.toFixed(0)} points, ${c.toFixed(1)} ${DRILL_META[kind].verb}`);
    if (sc > best.score) best = { name, score: sc, count: c };
  }
  /* The sweep: every fixed input on a grid, over a third of the seeds, and
     the best one that exists is what skill has to beat. */
  let bestGrid = { input: null, score: -1 };
  for (const input of drill.grid) {
    let total = 0;
    for (let s = 1; s <= RUNS; s += 3) total += playRun(drill, s * 7919, input).score;
    const sc = total / Math.ceil(RUNS / 3);
    if (sc > bestGrid.score) bestGrid = { input, score: sc };
  }
  console.log(`   ${kind} best of ${drill.grid.length} swept fixed inputs: ${JSON.stringify(bestGrid.input)} at ${bestGrid.score.toFixed(0)}`);
  if (bestGrid.score > best.score) best = { name: `swept ${JSON.stringify(bestGrid.input)}`, score: bestGrid.score, count: 0 };
  const ratio = skilledScore / Math.max(best.score, 1);
  console.log(`   ${kind} best fixed input is "${best.name}" at ${best.score.toFixed(0)}; skilled is ${ratio.toFixed(2)}x that`);
  if (ratio < RATIO_FLOOR[kind]) fail(`${kind}: the best fixed input scores ${best.score.toFixed(0)} against skilled ${skilledScore.toFixed(0)} (${ratio.toFixed(2)}x, floor ${RATIO_FLOOR[kind]}); one input is close to optimal, so this is not a drill of skill`);
  if (skilledCount < 4) fail(`${kind}: a skilled player wins only ${skilledCount.toFixed(1)} of ${ROUNDS_PER_RUN}, which is too punishing to bank a session from`);
  if (skilledCount > 9) fail(`${kind}: a skilled player wins ${skilledCount.toFixed(1)} of ${ROUNDS_PER_RUN}, so there is nothing to lose`);
}

console.log('3) the run gets harder: the last three rounds are meaner than the first three');
for (const [kind, drill] of Object.entries(DRILLS)) {
  const early = [];
  const late = [];
  for (let s = 1; s <= RUNS; s += 1) {
    const r = playRun(drill, s * 104729, drill.skilled);
    early.push(r.per.slice(0, 3).filter(k => k.won).length / 3);
    late.push(r.per.slice(-3).filter(k => k.won).length / 3);
  }
  const e = mean(early);
  const l = mean(late);
  console.log(`   ${kind}: first three won ${(e * 100).toFixed(0)}% of the time, last three ${(l * 100).toFixed(0)}%`);
  if (!(e > l + 0.05)) fail(`${kind}: the last three convert at ${(l * 100).toFixed(0)}% against the first three at ${(e * 100).toFixed(0)}%, so the run does not get harder`);
}

console.log('4) every round is winnable and none of them is free');
for (const [kind, drill] of Object.entries(DRILLS)) {
  const run = drill.build(drillSeed(kind, '2026-09-05'));
  let unwinnable = 0;
  let free = 0;
  let swept = 0;
  for (const setup of run) {
    const inputs = drill.sweep(setup);
    swept = inputs.length;
    let won = 0;
    for (const input of inputs) if (drill.play(input, setup, lehmer(99)).won) won += 1;
    if (won === 0) { unwinnable += 1; console.log(`   UNWINNABLE ${kind}: ${setup.label}`); }
    if (won === inputs.length) { free += 1; console.log(`   FREE ${kind}: ${setup.label}`); }
  }
  console.log(`   ${kind}: ${run.length} rounds swept over about ${swept} inputs each: ${unwinnable} unwinnable, ${free} free`);
  if (unwinnable > 0) fail(`${kind}: ${unwinnable} round(s) cannot be won by any input`);
  if (free > 0) fail(`${kind}: ${free} round(s) are won by every input, so they ask nothing`);
}

console.log('5) the mechanics are the ones the copy describes');
{
  /* The wall: shut blocks, open passes, pace arrives sooner. */
  const w = buildWallShotRun(drillSeed('wallshot', '2026-09-05'))[2];
  const peak = wallNextPeak(w, 0.5);
  const shutAt = peak + w.period / 2;
  const power = 0.7;
  const atPeak = takeWallShot({ x: w.gapCentre, y: 0.5, power, press: peak - wallTravel(power) }, w, lehmer(5));
  const atShut = takeWallShot({ x: w.gapCentre, y: 0.5, power, press: shutAt - wallTravel(power) }, w, lehmer(5));
  console.log(`   wall at its widest: ${atPeak.verdict} (open ${atPeak.open.toFixed(2)}); the same shot half a cycle later: ${atShut.verdict} (open ${atShut.open.toFixed(2)})`);
  if (atPeak.hitWall) fail('a shot through the middle of the gap at its widest hit the wall, so the gap does nothing');
  if (!atShut.hitWall) fail('a shot at the gap while the wall was shut went through, so timing does nothing');
  if (!(wallTravel(1) < wallTravel(0.5) - 0.1)) fail(`pace does not buy time to the wall: ${wallTravel(1)} against ${wallTravel(0.5)}`);
  if (wallOpenAt(w, shutAt) > 0.001) fail('the wall is not shut half a cycle after its peak');

  /* The tackle: the man is a foul, the ball at his feet is a foul, the loose ball is won. */
  const tk = buildTackleRun(drillSeed('tackle', '2026-09-05'))[1];
  const tLoose = tackleNextLoose(tk, 0.3);
  const tTight = tLoose + tk.touchPeriod / 2;
  const ballLoose = tackleBallAt(tk, tLoose);
  const feetLoose = tackleFeetAt(tk, tLoose);
  const ballTight = tackleBallAt(tk, tTight);
  const onBall = makeTackle({ x: ballLoose.x, y: ballLoose.y, press: tLoose }, tk);
  const onMan = makeTackle({ x: feetLoose.x, y: feetLoose.y, press: tLoose }, tk);
  const atFeet = makeTackle({ x: ballTight.x, y: ballTight.y, press: tTight }, tk);
  const wide = makeTackle({ x: ballLoose.x + 0.3, y: ballLoose.y, press: tLoose }, tk);
  console.log(`   on the loose ball: ${onBall.verdict}; on the man: ${onMan.verdict}; on the ball at his feet: ${atFeet.verdict}; wide: ${wide.verdict}`);
  if (!onBall.won) fail('a press on the ball at the top of a touch did not win it');
  if (!onMan.foul) fail('a press on the man was not a foul');
  if (!atFeet.foul) fail('a press on the ball while it sat at his feet was not a foul, so timing does not matter');
  if (wide.won || wide.foul) fail('a press well wide of the ball counted as something');
  if (tackleTouchAt(tk, tTight) > TACKLE_LOOSE) fail('the ball is not at his feet half a touch after it was furthest');
  const gone = makeTackle({ x: 0.5, y: tk.lane, press: tackleDeadline(tk) + 0.1 }, tk);
  if (!gone.late) fail('a press after he left the screen was not called late');

  /* The gloves: a full stretch takes longer than a hop, pace shrinks the hands. */
  const g = buildGloveRun(drillSeed('gloves', '2026-09-05'))[9];
  const arrival = gloveDeadline(g);
  const far = { dx: g.target.x - GLOVE_ORIGIN.x, dy: g.target.y - GLOVE_ORIGIN.y };
  const reachFar = Math.min(1, Math.hypot(far.dx, far.dy) / GLOVE_MAX_REACH);
  const inTime = makeSave({ ...far, release: arrival - diveTime(reachFar) - 0.01 }, g);
  const tooLate = makeSave({ ...far, release: arrival - diveTime(reachFar) * 0.45 }, g);
  console.log(`   full stretch (${reachFar.toFixed(2)}) leaving in time: ${inTime.verdict}; leaving at less than half the dive: ${tooLate.verdict}`);
  if (!inTime.saved) fail('a dive aimed exactly at the ball that left in time did not save it');
  if (tooLate.saved) fail('a full stretch that left with less than half its dive time to go still saved it, so reach costs no time');
  if (!(diveTime(1) > diveTime(0.2) + 0.3)) fail(`a full stretch is not slower than a hop: ${diveTime(1)} against ${diveTime(0.2)}`);
  const soft = makeSave({ dx: 0, dy: 0, release: 0.1 }, { ...g, pace: 0.1, target: { x: 0.5, y: 1.0 } });
  const hard = makeSave({ dx: 0, dy: 0, release: 0.1 }, { ...g, pace: 1.0, target: { x: 0.5, y: 1.0 } });
  if (!(soft.radius > hard.radius + 0.08)) fail(`pace does not shrink what a glove holds: ${soft.radius} against ${hard.radius}`);
  const late = makeSave({ ...far, release: arrival + 0.05 }, g);
  if (!late.late || late.saved) fail('a dive that started after the ball crossed was not called late');
}

console.log('6) growth is bounded and respects headroom: at most +2, never past the ceiling, once a season');
{
  const state = (overall, potential, extra = {}) => ({
    overall, potential, potentialEarned: 0, position: 'ST', morale: 50, events: [],
    seasons: [{ year: 2030 }], statBoostNextSeason: {}, shooting: 70, defending: 60, reflexes: 40,
    pace: 70, passing: 70, dribbling: 70, physical: 70, ...extra,
  });
  const cases = [
    { s: state(70, 80), count: 8, want: 2 },
    { s: state(70, 80), count: 5, want: 1 },
    { s: state(70, 80), count: 4, want: 0 },
    { s: state(79, 80), count: 10, want: 1 },
    { s: state(80, 80), count: 10, want: 0 },
    { s: state(85, 80), count: 10, want: 0 },
  ];
  for (const c of cases) {
    const out = applyDrillResult(c.s, 'wallshot', c.count);
    const got = out.statBoostNextSeason.shooting || 0;
    if (got !== c.want) fail(`overall ${c.s.overall}, ceiling ${c.s.potential}, ${c.count} of 10: expected +${c.want} shooting, got +${got}`);
    if (out.shooting !== c.s.shooting) fail('a drill changed the attribute directly instead of through statBoostNextSeason');
    for (const k of ['pace', 'passing', 'dribbling', 'defending', 'physical', 'reflexes']) if (out.statBoostNextSeason[k]) fail(`a wall shot session paid ${k}, which is not its attribute`);
    if (out.events.length !== 1) fail('a banked session did not write exactly one event line');
  }
  console.log(`   70 with an 80 ceiling: 8 of 10 pays +2, 5 of 10 pays +1, 4 of 10 pays 0; 79 pays at most +1; at or past 80 pays 0`);
  /* Every combination in the sweep: never more than 2, never more than the room. */
  let worst = 0;
  for (let ovr = 50; ovr <= 99; ovr += 1) for (let pot = 50; pot <= 99; pot += 1) for (const count of [5, 8, 10]) {
    const s = state(ovr, pot);
    const out = applyDrillResult(s, 'tackle', count);
    const got = out.statBoostNextSeason.defending || 0;
    const room = Math.max(0, Math.min(99, Math.max(pot, ovr)) - ovr);
    if (got > 2 || got > room) { worst += 1; if (worst < 4) fail(`overall ${ovr}, ceiling ${pot}, ${count} of 10 paid +${got} against room ${room}`); }
  }
  console.log(`   2500 overall and ceiling pairs times three scores: ${worst} paid past the ceiling or past +2`);
  /* Once a season, and the stat the position's drill trains. */
  const first = applyDrillResult(state(60, 80), 'gloves', 9);
  const again = applyDrillResult(first, 'gloves', 10);
  if (again !== first) fail('a second session in the same season was banked');
  if ((first.statBoostNextSeason.reflexes || 0) !== 2) fail(`a 9 of 10 glove session paid +${first.statBoostNextSeason.reflexes || 0} reflexes, expected +2`);
  const nextYear = applyDrillResult({ ...first, seasons: [{ year: 2031 }] }, 'gloves', 9);
  if ((nextYear.statBoostNextSeason.reflexes || 0) !== 4) fail('a session the following season did not bank on top of the last');
  if (sessionScore(5) !== 50 || sessionScore(8) !== 80 || sessionScore(12) !== 100) fail('the session score is not wins times ten on a 0 to 100 scale');
  if (drillBoost(80, 10) !== 2 || drillBoost(50, 10) !== 1 || drillBoost(80, 1) !== 1 || drillBoost(80, 0) !== 0 || drillBoost(49, 10) !== 0) fail('drillBoost does not pay 50 as +1 and 80 as +2 under the headroom');
  if (drillHeadroom(state(70, 80)) !== 10 || drillHeadroom(state(85, 80)) !== 0) fail('drillHeadroom is not the room between overall and the ceiling');
  /* And the skilled player from section 2 can actually reach a bank. */
  for (const [kind, c] of Object.entries(skilledCounts)) {
    if (c < 5) fail(`${kind}: a skilled player averages ${c.toFixed(1)} of 10, under the 5 the guide says earns +1, so the promise is empty`);
  }
  console.log(`   once a season, only the drill's attribute, and a skilled run averages ${Object.values(skilledCounts).map(c => c.toFixed(1)).join(', ')} wins against the 5 that pays`);
}

if (CONTROL) {
  if (failures > 0) { console.log(`\ncontrol "${CONTROL}": ${failures} failure(s) fired as expected, the check works`); process.exit(0); }
  console.error(`\ncontrol "${CONTROL}": changed NOTHING, the check is dead`);
  process.exit(1);
}
if (failures > 0) { console.error(`\nsimCareerDrills: ${failures} failure(s)`); process.exit(1); }
console.log('\nsimCareerDrills: green. The gap has to be timed, the ball has to be loose, the corner has to be left for early, and nobody grows past his ceiling.');
