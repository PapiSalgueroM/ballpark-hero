/**
 * Round 546: Soccer Career's Champions League knockout is played, not flipped.
 *
 * WHAT THIS REPLACED. The old simulateUCL decided the winner first
 * (`const won = Math.random() < winChance`) and then painted a scoreline on to
 * match: a win drew 1 to 4 goals for and strictly fewer against, a defeat drew
 * a bigger number against. There were no legs, no aggregate, no draws (a level
 * score could not be generated at all), no extra time and no penalties, and the
 * ladder was a hardcoded R16, QF, SF, Final in every season, which is wrong for
 * every year before 2003. A player asked for the second leg on 2026-09-11.
 * Club Manager has had one since Round 507; this is the flagship, about 1 in 5
 * of all pageviews, and it was the one Champions League on the site that was
 * not real.
 *
 * WHY THIS HARNESS IS MOSTLY ABOUT BALANCE. Replacing a mechanism is the easy
 * half. The dangerous half is that a career game's whole feel sits on rates a
 * player has got used to, and a new goal model that advances 10 points more
 * often would quietly turn every elite career into a European dynasty. So the
 * load bearing sections here do not check that two legs exist, they check that
 * the SAME player at the SAME club goes as far as he used to.
 *
 * WHAT THIS HOLDS:
 *   1. The format is read from uclFormatHistory, not retyped: a modern tie is
 *      two legs, the final is one, and a pre-2003 season plays no round of 16.
 *   2. The outcome is derived from the score. Across thousands of ties the
 *      aggregate and the winner agree every single time, level aggregates DO
 *      occur (they were impossible before), and every one of them is settled by
 *      away goals, extra time or penalties and never silently.
 *   3. Balance held: the advance rate per round, measured over a grid of player
 *      ratings and club tiers, sits within a measured tolerance of the model
 *      this replaced. The old win chance is reimplemented here as the baseline
 *      rather than quoted, so the comparison is against behaviour.
 *   4. Balance held again on the other axis: tournament goal totals and the top
 *      scorer rate have not moved. A two legged tie is twice the matches, so
 *      the per leg player goal chance is halved; without that the top scorer
 *      threshold of 6 would have become far easier to reach.
 *   5. Away goals appear only in the seasons that had them, and never after
 *      2020-21, which is when the competition abolished them.
 *
 * ON THE TOLERANCES, and on a mistake worth keeping written down. Section 3
 * first gated on the WORST single cell across the grid, and it went red at 11
 * points on a model that direct measurement then showed accurate to under a
 * point at high sample size. A max over sixty cells is dominated by whichever
 * one happened to have the fewest campaigns in it, which is the "never assert
 * on a max" rule in CLAUDE.md exactly. It now gates on two pooled statistics
 * over cells with at least 300 campaigns: the signed drift (which catches a
 * rebalance in one direction) and the mean absolute gap (which catches a
 * scatter). Measured on the calibrated model those sit near -0.6 and 0.8, the
 * gates are 2.5 and 3, and the uncalibrated version produced 40, so the gates
 * are nowhere near either the noise or the failure.
 *
 * NEGATIVE CONTROL: SC_UCL_CONTROL=coinflip puts the replaced model back inside
 * the bundle, deciding the tie before the score, and section 2 must go red
 * because the aggregate and the winner stop agreeing.
 *
 * Run: node scripts/simSoccerCareerUcl.mjs      (no database)
 */
import './lib/seedRandom.mjs';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };

const CONTROL = process.env.SC_UCL_CONTROL || '';
const KNOWN_CONTROLS = ['coinflip'];
if (CONTROL && !KNOWN_CONTROLS.includes(CONTROL)) {
  console.error(`SC_UCL_CONTROL=${CONTROL} is not a control this harness knows`);
  process.exit(1);
}

const ENTRY = path.join(os.tmpdir(), 'scUclEntry.mjs');
const BUNDLE = path.join(os.tmpdir(), 'scUcl.bundle.mjs');
fs.writeFileSync(ENTRY, `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const mod = await import('${ROOT.replaceAll('\\', '/')}/src/lib/soccerCareerEngine.ts');
export const engine = mod;
`);
execSync(`${ROOT}/node_modules/.bin/esbuild ${ENTRY} --bundle --format=esm --platform=node --outfile=${BUNDLE} --log-level=error`, { stdio: 'inherit' });

if (CONTROL === 'coinflip') {
  const text = fs.readFileSync(BUNDLE, 'utf8');
  /* Put the decide-then-paint step back: force the deciding leg's aggregate to
     disagree with the result the way the old model's fabricated scoreline did. */
  const re = /(decider\.won = through;)/;
  if (!re.test(text)) {
    console.error('CONTROL coinflip cannot find the settlement line in the bundle, so it would change nothing');
    process.exit(1);
  }
  const mutated = text.replace(re, 'through = Math.random() < 0.5; $1');
  if (mutated === text) { console.error('CONTROL coinflip changed nothing'); process.exit(1); }
  fs.writeFileSync(BUNDLE, mutated);
  console.log('   NEGATIVE CONTROL ON: the tie decided by a flip again, section 2 must go red');
}

const cm = (await import(pathToFileURL(BUNDLE).href)).engine;
const { simulateUCL } = cm;
if (typeof simulateUCL !== 'function') { console.error('simulateUCL is not exported'); process.exit(1); }

const ELITE = ["Bayern Munich", "PSG", "Man City", "Real Madrid", "Barcelona", "Liverpool"];
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/** A career state carrying only what simulateUCL reads. */
const stateFor = (overall, tier, club, year) => ({
  currentClubTier: tier,
  currentClub: club,
  overall,
  position: 'ST',
  seasons: [{ year: year - 1 }],
});

/* The grid: a spread of ratings, both qualifying tiers, elite and not. */
const GRID = [];
for (const overall of [70, 75, 80, 85, 90]) {
  for (const [tier, club] of [[1, 'Real Madrid'], [1, 'Ajax'], [2, 'Sevilla']]) {
    GRID.push({ overall, tier, club });
  }
}
const RUNS = 2500;

const sample = () => {
  const rows = [];
  for (const g of GRID) {
    for (let i = 0; i < RUNS; i++) {
      const r = simulateUCL(stateFor(g.overall, g.tier, g.club, 2026), {});
      if (r.qualified) rows.push({ g, r });
    }
  }
  return rows;
};

const rows = sample();
console.log(`\nSampled ${rows.length} qualified campaigns across ${GRID.length} player/club combinations.`);

/* ------------------------------------------------------------------ */
console.log('1) The format is read from the competition\'s history, not retyped');
{
  const before = failures;
  const modern = rows[0];
  const byRound = {};
  for (const { r } of rows) for (const m of r.matches) (byRound[m.round] ??= []).push(m);
  for (const round of ['QF', 'SF']) {
    const legs = new Set((byRound[round] ?? []).map(m => m.leg));
    if (!legs.has(1) || !legs.has(2)) fail(`${round} does not play two legs (legs seen: ${[...legs].join(',') || 'none'})`);
  }
  const finalLegs = new Set((byRound['Final'] ?? []).map(m => m.leg));
  if (finalLegs.size && (finalLegs.has(2))) fail('the final was played over two legs, and it has been one match at a neutral venue for the life of the competition');
  /* A 2026 season plays a round of 16; a 1999 one does not. */
  let sawR16Modern = false;
  for (const { r } of rows) if (r.matches.some(m => m.round === 'R16')) { sawR16Modern = true; break; }
  if (!sawR16Modern) fail('a 2026 campaign never played a round of 16');
  let sawR16Old = false;
  for (let i = 0; i < 400; i++) {
    const r = simulateUCL(stateFor(88, 1, 'Real Madrid', 1999), {});
    if (r.qualified && r.matches.some(m => m.round === 'R16')) { sawR16Old = true; break; }
  }
  if (sawR16Old) fail('a 1999-2000 campaign played a round of 16, and that round did not exist until 2003-04');
  if (failures === before) console.log('   two legs per tie, one for the final, no round of 16 before 2003');
}

/* ------------------------------------------------------------------ */
console.log('2) The outcome is derived from the score, and a level tie is really settled');
{
  const before = failures;
  let ties = 0, disagreements = 0, level = 0;
  const settledBy = {};
  for (const { r } of rows) {
    for (const m of r.matches) {
      if (m.decidedBy === undefined) continue;
      ties += 1;
      settledBy[m.decidedBy] = (settledBy[m.decidedBy] ?? 0) + 1;
      if (m.decidedBy === 'aggregate') {
        if ((m.aggFor > m.aggAgainst) !== m.won) disagreements += 1;
      } else if (m.decidedBy === 'extraTime') {
        /* The tie was level after normal time and extra time broke it, so the
           FINAL aggregate (which includes the extra time goals) has to agree
           with who went through, exactly as for an aggregate win. */
        level += 1;
        if ((m.aggFor > m.aggAgainst) !== m.won) disagreements += 1;
      } else {
        /* Away goals and penalties both settle a tie that is still level, so
           here the aggregate must NOT separate them. */
        level += 1;
        if (m.aggFor !== m.aggAgainst) disagreements += 1;
        if (m.decidedBy === 'penalties' && (m.pensFor > m.pensAgainst) !== m.won) disagreements += 1;
      }
    }
  }
  if (disagreements > 0) fail(`${disagreements} of ${ties} ties have a winner the aggregate does not support, so the result is still being decided before the score`);
  if (level === 0) fail('not one tie was ever level on aggregate, which the old model also managed and is why it was wrong');
  const pct = (level / ties) * 100;
  if (pct < 3 || pct > 40) fail(`${pct.toFixed(1)}% of ties finished level on aggregate, which is outside anything the competition looks like`);
  if (failures === before) console.log(`   ${ties} ties, 0 disagreements, ${level} level on aggregate (${pct.toFixed(1)}%) settled as ${JSON.stringify(settledBy)}`);
}

/* ------------------------------------------------------------------ */
console.log('3) Balance held: the advance rate matches the model this replaced');
{
  const before = failures;
  /* The replaced model, reimplemented so the comparison is against behaviour
     rather than against a number somebody wrote down. */
  const oldAdvanceRate = (overall, tier, club, roundIndex) => {
    const eliteBonus = ELITE.includes(club) ? 0.15 : (tier === 1 ? 0.08 : 0);
    return clamp(0.3 + (overall - 75) * 0.012 + eliteBonus - roundIndex * 0.04, 0.15, 0.75);
  };
  const rounds = ['R16', 'QF', 'SF', 'Final'];
  /* POOLED, NOT THE WORST CELL. The first version of this section gated on the
     single largest gap across every cell, which is the thing CLAUDE.md's harness
     rules say never to do: a max over sixty cells is dominated by whichever one
     happened to have the fewest samples, and it went red at 11 points on a model
     that was later measured accurate to under a point at high n. So the gate is
     on two stable statistics, and the worst cell is printed for information and
     nothing else. */
  const MIN_N = 300;
  const cells = [];
  for (const g of GRID) {
    const mine = rows.filter(r => r.g === g);
    for (let ri = 0; ri < rounds.length; ri++) {
      const round = rounds[ri];
      const played = mine.filter(({ r }) => r.matches.some(m => m.round === round && m.decidedBy !== undefined));
      if (played.length < MIN_N) continue;
      const won = played.filter(({ r }) => r.matches.find(m => m.round === round && m.decidedBy !== undefined).won).length;
      const got = (won / played.length) * 100;
      const want = oldAdvanceRate(g.overall, g.tier, g.club, ri) * 100;
      cells.push({ n: played.length, gap: got - want, where: `${g.club} ${g.overall} ${round}`, got, want });
    }
  }
  if (cells.length < 8) {
    fail(`only ${cells.length} cells reached ${MIN_N} campaigns, so there is not enough to measure balance against`);
  } else {
    const totalN = cells.reduce((a, c) => a + c.n, 0);
    const signed = cells.reduce((a, c) => a + c.gap * c.n, 0) / totalN;
    const absolute = cells.reduce((a, c) => a + Math.abs(c.gap) * c.n, 0) / totalN;
    const worst = cells.reduce((a, c) => (Math.abs(c.gap) > Math.abs(a.gap) ? c : a), cells[0]);
    /* Measured on the calibrated model over 20,000 campaigns a cell: signed
       drift sits near -0.6 points and mean absolute near 0.8, with single cells
       reaching 2.8. The gates are set outside that and far inside the 40 point
       gap the uncalibrated version produced, which is the failure they exist to
       catch. */
    if (Math.abs(signed) > 2.5) fail(`the advance rate has drifted ${signed.toFixed(2)} points overall, which is a rebalance rather than noise`);
    if (absolute > 3) fail(`mean absolute gap ${absolute.toFixed(2)} points against the replaced model, over the 3 point gate`);
    if (failures === before) {
      console.log(`   ${cells.length} cells over ${MIN_N} campaigns: signed drift ${signed.toFixed(2)}, mean absolute ${absolute.toFixed(2)}`);
      console.log(`   worst single cell (not gated, a max is noise): ${worst.where} ${worst.got.toFixed(1)}% against ${worst.want.toFixed(1)}%`);
    }
  }
}

/* ------------------------------------------------------------------ */
console.log('4) Balance held: tournament goals and the top scorer rate have not moved');
{
  const before = failures;
  const goals = rows.map(({ r }) => r.playerGoals);
  const mean = goals.reduce((a, b) => a + b, 0) / goals.length;
  const topScorerRate = rows.filter(({ r }) => r.isTopScorer).length / rows.length;
  /* The replaced model gave an attacker a 40% chance of 1 to 2 goals per match
     over at most four matches, so the mean sat near 1.2 and six goals was rare.
     A two legged tie is twice the matches, which is why the per leg chance is
     halved. These gates are the measured range of the replaced model. */
  if (mean < 0.6 || mean > 2.2) fail(`mean tournament goals ${mean.toFixed(2)}, outside the replaced model's range of roughly 0.6 to 2.2`);
  if (topScorerRate > 0.12) fail(`top scorer in ${(topScorerRate * 100).toFixed(1)}% of campaigns, which the six goal threshold was never meant to hand out`);
  if (failures === before) console.log(`   mean ${mean.toFixed(2)} goals a campaign, top scorer ${(topScorerRate * 100).toFixed(1)}% of the time`);
}

/* ------------------------------------------------------------------ */
console.log('5) Away goals only in the seasons that had them');
{
  const before = failures;
  const modernAway = rows.filter(({ r }) => r.matches.some(m => m.decidedBy === 'awayGoals')).length;
  if (modernAway > 0) fail(`${modernAway} campaigns in 2026 were settled on away goals, abolished in every UEFA competition from 2021-22`);
  let oldAway = 0;
  for (let i = 0; i < 1500; i++) {
    const r = simulateUCL(stateFor(82, 1, 'Ajax', 2015), {});
    if (r.qualified && r.matches.some(m => m.decidedBy === 'awayGoals')) oldAway += 1;
  }
  if (oldAway === 0) fail('not one 2015-16 tie was ever settled on away goals, and that rule was in force that season');
  if (failures === before) console.log(`   none in 2026, ${oldAway} in 1500 campaigns of 2015-16`);
}

/* ------------------------------------------------------------------ */
if (CONTROL === 'coinflip') {
  if (failures > 0) { console.log('\n   CONTROL FIRED: the flipped result was caught'); process.exit(0); }
  console.error('\n   CONTROL DID NOT FIRE: the harness cannot see a result decided before the score');
  process.exit(1);
}

if (failures) { console.error(`\n${failures} failure(s)`); process.exit(1); }
console.log('\nsimSoccerCareerUcl: all green');
