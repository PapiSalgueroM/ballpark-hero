/* Free Kick harness: the game can be won by aiming well and cannot be won by
   hammering one button.

   Round 433. This is the site's first game you play rather than answer, so the
   thing to prove is not "it renders": it is that SKILL BEATS LUCK and that the
   difficulty curve is real. A shooting game where the best strategy is one
   fixed input is not a game, and this repo has shipped that mistake before
   (the Player Stock Market's cheapest XI scoring 93.8, Round 424's audit).

   What it holds, all measured over thousands of seeded runs against the real
   engine, never against a copy of it:
     1) THE ENGINE IS PURE AND DETERMINISTIC: one seed, one run, byte
        identical, so a daily is the same ten kicks for everyone.
     2) SKILL BEATS SPAM: a player who aims at the corners and varies power
        outscores every one fixed input by a wide margin, and no single fixed
        input is close to the skilled line.
     3) THE CURVE IS REAL: the last three kicks are harder than the first
        three for the same skilled play, so the run gets harder.
     4) NOTHING IS UNWINNABLE OR FREE: every one of the ten kicks can be
        scored by some legal aim, and none of them can be scored by every aim.
     5) THE WALL AND THE KEEPER BOTH MATTER: shots into the wall's span are
        blocked, and a keeper with a high read saves more than a poor one.

   Negative control (house rule: prove the check can fail), and it reproduces
   the defect this harness actually caught rather than an invented one:
     SIM_FREE_KICK_CONTROL=nospray removes the accuracy cost of power from a
     bundled copy of the engine, which is exactly how the game was first
     written. Section 2 must then go red, because with a clean flight "top left
     corner, full power" beat a thinking player 2539 points to 1206 over 400
     runs and one button was the whole game. The control refuses to run if the
     rewrite changed nothing.

   ROUND 445 MOVED THE LINE THE CONTROL REWRITES. The spray law now lives in
   src/lib/arcade.ts, shared with Buzzer Beater, and freeKick.ts holds only its
   own prices for it. So the control rewrites those prices instead of the
   formula, and it copies arcade.ts into the temp directory beside the
   rewritten rules file so the bundler can still resolve the import. arcade.ts
   imports nothing for exactly this reason.

   Run: node scripts/simFreeKick.mjs
*/
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROOT_URL = ROOT.replaceAll('\\', '/');
const CONTROL = process.env.SIM_FREE_KICK_CONTROL || '';
if (CONTROL && CONTROL !== 'nospray') { console.error(`SIM_FREE_KICK_CONTROL=${CONTROL} is not a control this harness knows`); process.exit(1); }

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };

const TMP = os.tmpdir().replace(/\\/g, '/');
let LIB = `${ROOT_URL}/src/lib/freeKick.ts`;
if (CONTROL === 'nospray') {
  const src = fs.readFileSync(path.join(ROOT, 'src/lib/freeKick.ts'), 'utf8');
  const from = 'export const SPRAY: SprayConfig = { power: 0.34, distance: 0.011, vertical: 0.7 };';
  if (!src.includes(from)) { console.error('control cannot run: freeKick.ts is not in the shape this control rewrites'); process.exit(1); }
  LIB = `${TMP}/freeKick.control.ts`;
  /* arcade.ts goes next to the rewritten copy so `./arcade` still resolves. */
  fs.copyFileSync(path.join(ROOT, 'src/lib/arcade.ts'), `${TMP}/arcade.ts`);
  fs.writeFileSync(LIB, src.replace(from, 'export const SPRAY: SprayConfig = { power: 0, distance: 0, vertical: 0.7 };'));
  console.log('NEGATIVE CONTROL ON: power costs no accuracy, the shape the game was first written in');
}
const ENTRY = `${TMP}/freeKick.entry.mjs`;
const BUNDLE = `${TMP}/freeKick.bundle.mjs`;
fs.writeFileSync(ENTRY, `export * as fk from '${LIB}';\n`);
execSync(`"${ROOT}/node_modules/.bin/esbuild" "${ENTRY}" --bundle --format=esm --platform=node --outfile="${BUNDLE}" --log-level=error --alias:@=${ROOT_URL}/src`, { stdio: 'inherit' });
const { fk } = await import(pathToFileURL(BUNDLE).href);
const { buildRun, takeShot, lehmer, wallSpan, ROUNDS_PER_RUN } = fk;

/* The players. Each is a function from a kick to an aim, so "skill" is a
   strategy and not a number this harness made up. */
const SKILLED = (setup, rng) => {
  /* Aim away from the keeper's lean, high enough to clear the wall, hard
     enough to reach from distance but not so hard the curve dies. */
  const side = setup.keeperLean > 0 ? -1 : 1;
  return {
    x: side * (0.72 + rng() * 0.16),
    y: 0.52 + rng() * 0.3,
    power: 0.62 + (setup.distance - 11) * 0.014 + rng() * 0.08,
    curve: -side * (0.35 + rng() * 0.3),
  };
};
const SPAMMERS = {
  'always down the middle, full power': () => ({ x: 0, y: 0.3, power: 1, curve: 0 }),
  'always top left, full power': () => ({ x: -0.9, y: 0.95, power: 1, curve: 0 }),
  'always bottom right, full power': () => ({ x: 0.9, y: 0.05, power: 1, curve: 0 }),
  'always the same soft chip': () => ({ x: 0, y: 0.7, power: 0.4, curve: 0 }),
  'random every time': (setup, rng) => ({ x: rng() * 2 - 1, y: rng(), power: 0.4 + rng() * 0.6, curve: rng() * 2 - 1 }),
};

function playRun(seed, strategy) {
  const kicks = buildRun(seed);
  const rng = lehmer(seed ^ 0x5eed1234);
  let score = 0;
  let goals = 0;
  const perKick = [];
  for (const setup of kicks) {
    const aim = strategy(setup, rng);
    const r = takeShot(aim, setup, rng);
    score += r.points;
    if (r.scored) goals += 1;
    perKick.push(r);
  }
  return { score, goals, perKick, kicks };
}

const RUNS = 400;
const mean = a => a.reduce((x, y) => x + y, 0) / a.length;

console.log('1) one seed, one run: the daily is the same ten kicks for everyone');
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

console.log('2) skill beats spam: aiming is worth more than any one fixed input');
{
  const skilled = [];
  for (let s = 1; s <= RUNS; s += 1) skilled.push(playRun(s * 7919, SKILLED));
  const skilledScore = mean(skilled.map(r => r.score));
  const skilledGoals = mean(skilled.map(r => r.goals));
  console.log(`   skilled: ${skilledScore.toFixed(0)} points, ${skilledGoals.toFixed(1)} of ${ROUNDS_PER_RUN} scored`);
  let best = { name: null, score: -1, goals: 0 };
  for (const [name, strategy] of Object.entries(SPAMMERS)) {
    const runs = [];
    for (let s = 1; s <= RUNS; s += 1) runs.push(playRun(s * 7919, strategy));
    const sc = mean(runs.map(r => r.score));
    const g = mean(runs.map(r => r.goals));
    console.log(`   ${name}: ${sc.toFixed(0)} points, ${g.toFixed(1)} scored`);
    if (sc > best.score) best = { name, score: sc, goals: g };
  }
  /* The margin floor comes from the measured gap, not a number that felt
     right: skilled sits far above the best fixed input, so a fix that made
     one button optimal would collapse the ratio well past this. */
  const ratio = skilledScore / Math.max(best.score, 1);
  console.log(`   best fixed input is "${best.name}" at ${best.score.toFixed(0)}; skilled is ${ratio.toFixed(2)}x that`);
  if (ratio < 1.35) fail(`the best fixed input scores ${best.score.toFixed(0)} against skilled ${skilledScore.toFixed(0)} (${ratio.toFixed(2)}x); one button is close to optimal, so this is not a game of skill`);
  if (skilledGoals < 3) fail(`a skilled player scores only ${skilledGoals.toFixed(1)} of ${ROUNDS_PER_RUN}, which is too punishing to be fun`);
  if (skilledGoals > 9) fail(`a skilled player scores ${skilledGoals.toFixed(1)} of ${ROUNDS_PER_RUN}, so there is nothing to miss`);
}

console.log('3) the run gets harder: the last three kicks are meaner than the first three');
{
  const early = [];
  const late = [];
  for (let s = 1; s <= RUNS; s += 1) {
    const r = playRun(s * 104729, SKILLED);
    early.push(r.perKick.slice(0, 3).filter(k => k.scored).length / 3);
    late.push(r.perKick.slice(-3).filter(k => k.scored).length / 3);
  }
  const e = mean(early);
  const l = mean(late);
  console.log(`   first three scored ${(e * 100).toFixed(0)}% of the time, last three ${(l * 100).toFixed(0)}%`);
  if (!(e > l + 0.05)) fail(`the last three kicks convert at ${(l * 100).toFixed(0)}% against the first three at ${(e * 100).toFixed(0)}%, so the run does not get harder`);
}

console.log('4) every kick is winnable and none of them is free');
{
  const kicks = buildRun(20260904);
  const rngFor = () => lehmer(99);
  let unwinnable = 0;
  let free = 0;
  for (const setup of kicks) {
    let scored = 0;
    let tried = 0;
    for (let xi = -9; xi <= 9; xi += 2) {
      for (let yi = 1; yi <= 9; yi += 2) {
        for (const power of [0.45, 0.7, 0.95]) {
          for (const curve of [-0.6, 0, 0.6]) {
            tried += 1;
            if (takeShot({ x: xi / 10, y: yi / 10, power, curve }, setup, rngFor()).scored) scored += 1;
          }
        }
      }
    }
    if (scored === 0) { unwinnable += 1; console.log(`   UNWINNABLE: ${setup.label}`); }
    if (scored === tried) { free += 1; console.log(`   FREE: ${setup.label}`); }
  }
  console.log(`   ${kicks.length} kicks swept over 450 aims each: ${unwinnable} unwinnable, ${free} free`);
  if (unwinnable > 0) fail(`${unwinnable} kick(s) cannot be scored by any aim`);
  if (free > 0) fail(`${free} kick(s) are scored by every aim, so they ask nothing`);
}

console.log('5) the wall and the keeper both matter');
{
  const withWall = buildRun(20260904).find(k => k.wallSize >= 3);
  if (!withWall) fail('no kick in the sample run has a wall of three or more, so the wall cannot be checked');
  else {
    const span = wallSpan(withWall);
    const intoWall = takeShot({ x: (span.lo + span.hi) / 2, y: 0.2, power: 0.7, curve: 0 }, withWall, lehmer(5));
    const overWall = takeShot({ x: (span.lo + span.hi) / 2, y: 0.85, power: 0.7, curve: 0 }, withWall, lehmer(5));
    console.log(`   low into the wall: ${intoWall.verdict}; the same spot raised: ${overWall.verdict}`);
    if (!intoWall.hitWall) fail('a low shot through the middle of the wall was not blocked, so the wall does nothing');
    if (overWall.hitWall) fail('a shot at head height was blocked by the wall, so height does not beat it');
  }
  /* A better keeper saves more of the same shots. */
  const shots = [];
  for (let i = 0; i < 600; i += 1) {
    const rng = lehmer(i + 1);
    shots.push({ x: rng() * 1.6 - 0.8, y: rng() * 0.9, power: 0.55 + rng() * 0.4, curve: rng() * 1.2 - 0.6 });
  }
  const rate = skill => {
    const setup = { distance: 18, wallSize: 0, keeperSkill: skill, keeperLean: 0, label: 'probe' };
    const saved = shots.filter((a, i) => takeShot(a, setup, lehmer(i + 500)).saved).length;
    const onT = shots.filter((a, i) => takeShot(a, setup, lehmer(i + 500)).onTarget).length;
    return onT ? saved / onT : 0;
  };
  const poor = rate(0.2);
  const great = rate(0.8);
  console.log(`   a 0.2 keeper saves ${(poor * 100).toFixed(0)}% of what reaches him, a 0.8 keeper ${(great * 100).toFixed(0)}%`);
  if (!(great > poor + 0.08)) fail(`the good keeper saves ${(great * 100).toFixed(0)}% against the poor keeper's ${(poor * 100).toFixed(0)}%, so keeper quality does nothing`);
}

if (CONTROL) {
  if (failures > 0) { console.log(`\ncontrol "${CONTROL}": ${failures} failure(s) fired as expected, the check works`); process.exit(0); }
  console.error(`\ncontrol "${CONTROL}": changed NOTHING, the check is dead`);
  process.exit(1);
}
if (failures > 0) { console.error(`\nsimFreeKick: ${failures} failure(s)`); process.exit(1); }
console.log('\nsimFreeKick: green. The corners pay, one button does not, and the keeper is real.');
