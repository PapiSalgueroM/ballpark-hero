/**
 * Round 119 harness: is the halftime break a decision, or is it a screen?
 *
 * Two things have to be true for this feature to be worth having, and they
 * pull against each other, which is why both are measured here.
 *
 * One: a manager who walks into the dressing room, changes nothing and walks
 * back out must get the same game he always got. The match is now played in
 * two halves instead of one, and if that alone moved the scorelines then
 * eleven rounds of balance work would have been quietly rewritten. It should
 * not, because a Poisson draw splits exactly: Poisson(L) and
 * Poisson(L/2) + Poisson(L/2) are the same distribution. This asserts it
 * rather than trusting it.
 *
 * Two: a manager who actually reacts has to finish ahead of one who never
 * opens the screen. If reacting is worth nothing then this is not a feature,
 * it is a button that wastes your time between fixtures.
 *
 * Run: node scripts/simHalftime.mjs
 * Seeded since Round 1314 (scripts/lib/seedRandom.mjs is the first import, so
 * every draw of the engine it bundles is on this file's own stream); SIM_SEED=N
 * re-measures on another stream on purpose. Section 2 plays 1200 seasons an arm
 * (the measurement is written above its RUNS).
 * Control: SIM_HALFTIME_CONTROL=deaf, a subject control: in the engine copy a
 * change made at the break is recorded and never applied, so the second half
 * reads the pre-break XI and mentality. The gain line must fail and the subs
 * and shape lines must hold: "control deaf FIRED" exits 1, "DID NOT FIRE"
 * exits 2.
 * What deaf proves, and what it does not (fix review of Round 1314): it proves
 * the gain line sees a WHOLLY deaf break. Almost all of the gain is the shape
 * change: a half deaf probe that kept only the substitute off the pitch (the
 * sub still recorded, the shape still applied; r1314-run-a, ht-halfdeaf, seed
 * 743293878) read a gain of 2.97 against 0.92 and did not fire. So a halftime
 * sub that never reaches the pitch passes every line of this file; that rule
 * is held by scripts/simLiveMatch.mjs ("onPitch was not updated"), not here.
 */
import './lib/seedRandom.mjs';
import { execSync } from 'node:child_process';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
/* Round 1314: the bundle, its entry and the engine copy live in a folder of this run's own, removed on
   exit (house hygiene; a runner already gives every label its own temp folder, so this cured no red). */
const WORK = fs.mkdtempSync(path.join(os.tmpdir(), 'simHalftime-'));
process.on('exit', () => fs.rmSync(WORK, { recursive: true, force: true }));
const ENTRY = path.join(WORK, 'htEntry.mjs');
const BUNDLE = path.join(WORK, 'ht.bundle.mjs');
const CONTROL = process.env.SIM_HALFTIME_CONTROL || '';
if (CONTROL && CONTROL !== 'deaf') {
  console.error(`SIM_HALFTIME_CONTROL=${CONTROL} is not a control this harness knows (deaf). Refusing to run.`);
  process.exit(2);
}
// These historical skip/watch/react comparisons deliberately omit the new Quick coach.
const noCoachPath = path.join(WORK, 'clubManager.halftimeNoCoach.ts');
const coachHeader = 'export function coachQuickMatch(career: CareerState): CareerState {\n';
let engineSource = fs.readFileSync(path.join(ROOT, 'src/lib/clubManager.ts'), 'utf8').replaceAll('\r\n', '\n');
if (engineSource.split(coachHeader).length !== 2) throw new Error('One coach export is required for the historical halftime arm');
engineSource = engineSource.replace(coachHeader, coachHeader + '  return career;\n');
/* Round 1314: SIM_HALFTIME_CONTROL=deaf, a SUBJECT control. In the engine copy (changeLive), a change
   made at the break is accepted and forgotten: the sub never reaches the pitch or the match record
   (only the cap still counts it, so the break's own rules hold), and the shape never reaches the match
   or its record. The second half then reads the pre-break XI and mentality: the game stops honouring
   the break. The gain line must fail; the subs and shape lines must stay green, which is what makes
   it the gain line that fired. Each rewritten block must be found exactly once, or the run refuses.
   A first version left the sub in the match record and read a gain of 0.84 against a bar of 0.91 on
   the default seed (r1314-ht): it fired, by 0.07, because the record still carries part of the
   break's worth. Forgetting the record too is the whole of "deaf". */
if (CONTROL === 'deaf') {
  const DEAF = [
    '    live.onPitch[idx] = change.inId;\n',
    '    live.subs = [...(live.subs ?? []), {\n      off: going?.name ?? change.outId, on: coming.name, minute: m, offId: change.outId, onId: change.inId,\n      ...plusOf({ plus: p }),\n    }];\n',
    '    live.mentality = change.mentality;\n    state.mentality = change.mentality;\n    live.shapeChanges = [...(live.shapeChanges ?? []), { minute: m, mentality: change.mentality, ...plusOf({ plus: p }) }];\n',
  ];
  for (const block of DEAF) {
    const n = engineSource.split(block).length - 1;
    if (n !== 1) { console.error(`control cannot run: clubManager.ts holds ${n} copies of ${JSON.stringify(block)}, expected exactly one`); process.exit(2); }
    engineSource = engineSource.replace(block, '');
  }
  console.log('NEGATIVE CONTROL ON (deaf): changes made at the break are accepted and forgotten');
}
fs.writeFileSync(noCoachPath, engineSource);

fs.writeFileSync(ENTRY, `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const mod = await import('${noCoachPath.replaceAll('\\', '/')}');
export const cm = mod;
`);
execSync(`"${ROOT}/node_modules/.bin/esbuild" "${ENTRY}" --bundle --format=esm --platform=node --alias:@=${ROOT.replaceAll('\\', '/')}/src --outfile="${BUNDLE}" --log-level=error`, { stdio: 'inherit' });

const { cm } = await import(pathToFileURL(BUNDLE).href);
const {
  startCareer, playNextEntry, resumeMatch, finishSeason, startNextSeason,
  makeHalftimeSub, setHalftimeMentality, benchForHalftime, tiringAtHalftime,
  MAX_HALFTIME_SUBS,
} = cm;
/* Round 1331: the changes a match allows, by its own rule (the old constant on an engine without one). */
const capOf = s => (cm.matchRuleOf ? cm.matchRuleOf(s).subs : MAX_HALFTIME_SUBS);

let failures = 0;
let section = 0;
const failed = [];
const fail = m => { failures += 1; failed.push({ section, m }); console.error('  FAIL: ' + m); };
const mean = a => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);
const sd = a => { const m = mean(a); return Math.sqrt(mean(a.map(x => (x - m) ** 2))); };

/** The row for my club in the league table. */
function myRow(s) {
  const row = s.table.find(r => r.club === s.clubName);
  if (!row) throw new Error('my club is not in its own league table');
  return row;
}
function myPosition(s) {
  return [...s.table].sort((a, b) => b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga)).findIndex(r => r.club === s.clubName) + 1;
}
/* A harness that lets NaN through is worse than no harness: every comparison
   against NaN is false, so every assertion below it silently passes. */
const num = (label, v) => { if (!Number.isFinite(v)) { throw new Error(`${label} came out as ${v}`); } return v; };

/**
 * The three ways to play a season.
 *   'skip'   never sees halftime, which is exactly the pre-119 game
 *   'watch'  stops at halftime every match and changes nothing
 *   'react'  actually manages the break
 */
function playSeason(club, mode) {
  let s = startCareer(club);
  let subsMade = 0, shapeChanges = 0, breaks = 0, guard = 0;
  while (s.week < s.calendar.length && guard < 200) {
    guard++;
    const r = playNextEntry(s, { skipHalftime: mode === 'skip' });
    s = r.state;
    if (r.kind === 'seasonOver') break;
    if (r.kind !== 'halftime') continue;
    breaks++;
    if (mode === 'react') {
      const live = s.live;
      const behind = live.myGoals < live.oppGoals;
      const comfortable = live.myGoals - live.oppGoals >= 2;
      const want = behind ? 'attacking' : comfortable ? 'defensive' : 'balanced';
      if (want !== live.mentality) { s = setHalftimeMentality(s, want); shapeChanges++; }
      // Freshen up: the most tired player off, the best bench player on, but
      // only when the bench genuinely helps.
      for (let i = 0, cap = capOf(s); i < cap; i++) {
        const tired = tiringAtHalftime(s);
        const bench = benchForHalftime(s);
        if (!tired.length || !bench.length) break;
        const off = tired[0];
        const on = bench.find(b => b.rating >= off.rating - 2);
        if (!on) break;
        const next = makeHalftimeSub(s, off.id, on.id);
        if (!next) break;
        s = next; subsMade++;
      }
    }
    s = resumeMatch(s).state;
  }
  const row = myRow(s);
  return { points: num('points', row.pts), gf: num('gf', row.gf), ga: num('ga', row.ga), pos: myPosition(s), subsMade, shapeChanges, breaks };
}

/* ---------- 1. The break itself must be free ---------- */
section = 1;
console.log('1) Stopping at halftime and changing nothing must not change the game');
{
  const RUNS = 60;
  const skip = [], watch = [];
  for (let i = 0; i < RUNS; i++) skip.push(playSeason('Everton', 'skip'));
  for (let i = 0; i < RUNS; i++) watch.push(playSeason('Everton', 'watch'));
  const sp = num('skip points', mean(skip.map(r => r.points))), wp = num('watch points', mean(watch.map(r => r.points)));
  const sg = mean(skip.map(r => r.gf)), wg = mean(watch.map(r => r.gf));
  const sa = mean(skip.map(r => r.ga)), wa = mean(watch.map(r => r.ga));
  console.log(`   never sees halftime: ${sp.toFixed(1)} pts, ${sg.toFixed(1)} scored, ${sa.toFixed(1)} conceded`);
  console.log(`   sees it, does nothing: ${wp.toFixed(1)} pts, ${wg.toFixed(1)} scored, ${wa.toFixed(1)} conceded`);
  // Standard error of the difference of two means; 3 SE is a wide net on purpose,
  // because the point is to catch a SHIFT, not to chase noise.
  const se = Math.sqrt(sd(skip.map(r => r.points)) ** 2 / RUNS + sd(watch.map(r => r.points)) ** 2 / RUNS);
  const gap = Math.abs(sp - wp);
  console.log(`   difference ${gap.toFixed(2)} points, 3 standard errors is ${(3 * se).toFixed(2)}`);
  if (gap > 3 * se) fail(`splitting the match into halves moved the league by ${gap.toFixed(2)} points on its own`);
  /* Round 127: these two used to be a flat "more than four goals is a shift",
     and four goals is only about two and a bit standard errors on a stat whose
     season to season spread is ten. It failed on noise alone in roughly one run
     in four, and it did that on the code as it stood BEFORE Round 127 as well,
     measured three runs an arm against the committed file: same means, same
     spread, and a 5.08 goal gap on the old code in one of them. So it gets the
     same three standard error treatment the points line above it already had,
     which is Round 125's lesson written down again: pick the margin from
     measured headroom, not from a round number that sounds strict. */
  const seG = Math.sqrt(sd(skip.map(r => r.gf)) ** 2 / RUNS + sd(watch.map(r => r.gf)) ** 2 / RUNS);
  const seA = Math.sqrt(sd(skip.map(r => r.ga)) ** 2 / RUNS + sd(watch.map(r => r.ga)) ** 2 / RUNS);
  console.log(`   goals for gap ${Math.abs(sg - wg).toFixed(2)} against 3se of ${(3 * seG).toFixed(2)}, goals against gap ${Math.abs(sa - wa).toFixed(2)} against 3se of ${(3 * seA).toFixed(2)}`);
  if (Math.abs(sg - wg) > 3 * seG) fail(`goals scored moved by ${Math.abs(sg - wg).toFixed(1)} just from playing two halves`);
  if (Math.abs(sa - wa) > 3 * seA) fail(`goals conceded moved by ${Math.abs(sa - wa).toFixed(1)} just from playing two halves`);
  if (mean(watch.map(r => r.breaks)) < 30) fail('the watching manager barely saw any halftimes, so this measured nothing');
  if (mean(skip.map(r => r.breaks)) > 0) fail('skipHalftime still stopped at halftime');
}

/* ---------- 2. Reacting has to be worth something ---------- */
section = 2;
console.log('2) A manager who works the break finishes ahead of one who does not');
{
  /* 250 seasons an arm, not 60. At 60 the gain sat right on top of its own
     standard error and the answer flipped between runs, which is a measurement
     problem and not a design one. The honest fix is to measure it properly
     rather than to inflate the effect until a thin test goes green: one good
     substitution should not swing a season, and if it did the game would be
     silly. Standard error falls with the square root of the sample, so this
     buys a clean read on an effect worth roughly one extra win a year. */
  /* 500 an arm now, up from 250, and the reason is worth being exact about
     because the first explanation for it was wrong. Round 121 gave the other
     manager a half time too, and the obvious worry was that it would eat the
     payoff: one 250 season read came back at 1.8 points, inside its own noise,
     and it looked like the feature had been hollowed out. It had not. At 250
     the reading swung between roughly 1.8 and 3.0 depending on the run, which
     is a sample too small for the size of the effect and nothing more. At 500
     it settles near 4 points against two standard errors of about 1.4. The
     lesson is the same one this file already learned once: when an effect and
     its error bar are the same size, take more samples before believing a
     story about why the number moved. */
  /* Round 127: 800 an arm now, and the reason is the same one that took this
     block from 250 to 500. The payoff was measured properly against the
     committed pre Round 127 engine, three readings of 500 an arm on each side:
     the old code gained 2.45, 2.20 and 2.91 points and the new code 3.05, 2.77
     and 3.20, so the break is worth MORE since players started noticing whether
     they get on the pitch, which is exactly what you would expect when a half
     time substitution is now a promise kept. But the bar here is two standard
     errors, which at 500 an arm is about 1.47, and an effect of two and a half
     against a bar of one and a half fails on an unlucky draw roughly one run in
     ten. It did, twice, and it would have done on the old code too. Eight
     hundred drops two standard errors to about 1.15 and gives the real effect
     more than double the headroom it needs. */
  /* Round 1314: 1200 an arm, and seeded (the first import of this file). Eight
     hundred was still a coin toss: unseeded lane runs read gains from 0.91 to
     3.29 against bars of about 1.1, and Release AV's lane C went red at 0.91
     against 1.11 (rAV-gC). The rule taken: the smallest size at which the ten
     seed mean gain, less its bar, is at least three times the seed to seed
     spread of the gain. Measured on db2d5083 (origin/main 21941630, Release
     AY, merged into this round's branch, plus this round's harness edits,
     none to this file; AY moves no Club Manager code: git diff --stat
     35f85630 21941630 -- src/lib lists only gmGameDayView.ts, its test and
     gmGameLog.ts. The fix review corrected this base, which first read
     35f85630), runner results r1314-ht800,
     r1314-ht1200a and b, r1314-ht1500a and b, seeds 1 to 10 through
     SIM_SEED with this file's RUNS changed in a probe copy:
       800:  3.20 2.80 2.79 1.74 2.32 2.10 2.99 1.15 2.51 1.88, mean 2.35,
             spread 0.64, mean bar 1.12: margin 1.9 spreads (seed 8 sat 0.02
             over its bar). Fails.
       1200: 2.33 2.38 2.72 1.61 2.17 2.30 2.54 2.24 2.83 2.60, mean 2.37,
             spread 0.34, mean bar 0.91: margin 4.3 spreads (3.2 sampling
             errors, reading the bar as two of them). Passes, so 1200.
       1500: 1.93 2.29 2.79 2.34 2.17 2.78 2.46 2.91 2.25 2.35, mean 2.43,
             spread 0.31, mean bar 0.81: margin 5.2 spreads.
     The default seed (this file's own, 743293878) read 2.74 against 1.11 at
     800 (twice, byte equal logs), 3.02 against 0.92 at 1200 and 2.65 against
     0.82 at 1500. The break is still worth about two and a half points, a
     little under the 3.0 Round 127 measured. The bar stays two standard
     errors: never a wider bound. Seed 4 is red in SECTION 1 (goals for gap
     4.37 against a 3 SE bar of 4.13, 60 an arm). That is ONE measurement:
     section 1 runs before section 2 on the same stream, so section 2's size
     cannot reach it, and the three sizes above read the same sample three
     times. Twenty more seeds (11 to 30, the fix review's r1314-run-s, section
     1 alone) were all green with signed z means near zero, so it reads as a
     tail at three standard errors, left as it is. Seeding moves that tail
     from each run to each engine change: a SECTION 1 red after a change to
     Club Manager's engine (Release AZ is the first) is a moved sample to be
     measured over several seeds, never waved through, never a wider bound. */
  const RUNS = 1200;
  const ignore = [], react = [];
  for (let i = 0; i < RUNS; i++) ignore.push(playSeason('Everton', 'skip'));
  for (let i = 0; i < RUNS; i++) react.push(playSeason('Everton', 'react'));
  const ip = num('ignore points', mean(ignore.map(r => r.points))), rp = num('react points', mean(react.map(r => r.points)));
  const ipos = mean(ignore.map(r => r.pos)), rpos = mean(react.map(r => r.pos));
  console.log(`   ignores the break: ${ip.toFixed(1)} pts, average finish ${ipos.toFixed(1)}`);
  console.log(`   works the break:   ${rp.toFixed(1)} pts, average finish ${rpos.toFixed(1)}`);
  console.log(`   he made ${mean(react.map(r => r.subsMade)).toFixed(1)} subs and changed shape ${mean(react.map(r => r.shapeChanges)).toFixed(1)} times a season`);
  const se = Math.sqrt(sd(ignore.map(r => r.points)) ** 2 / RUNS + sd(react.map(r => r.points)) ** 2 / RUNS);
  console.log(`   gain ${(rp - ip).toFixed(2)} points, 2 standard errors is ${(2 * se).toFixed(2)}`);
  if (rp <= ip) fail('working the halftime break is worth nothing at all, so it is a screen and not a decision');
  if (rp - ip < 2 * se) fail(`the gain of ${(rp - ip).toFixed(2)} points is inside the noise, so nobody would ever feel it`);
  if (rp - ip > 25) fail(`working the break is worth ${(rp - ip).toFixed(1)} points, which makes ignoring it unplayable`);
  if (mean(react.map(r => r.subsMade)) < 3) fail('the reacting manager hardly ever found a substitution worth making');
  if (mean(react.map(r => r.shapeChanges)) < 3) fail('the reacting manager hardly ever changed shape, so the arms barely differ');
}

/* ---------- 3. The rules of the break hold ---------- */
section = 3;
console.log('3) The break cannot be abused');
{
  let s = startCareer('Arsenal');
  let r = playNextEntry(s);
  let guard = 0;
  while (r.kind !== 'halftime' && guard < 40) { guard++; r = playNextEntry(r.state); }
  s = r.state;
  if (!s.live) { fail('never reached a halftime at all'); }
  else {
    if (s.live.onPitch.length !== s.live.startXi.length) fail('the pitch did not start with a full XI');
    const bench = benchForHalftime(s);
    if (bench.length === 0) fail('there is nobody on the bench');
    let made = 0;
    for (let i = 0; i < 6; i++) {
      const on = benchForHalftime(s)[0];
      const off = s.live.onPitch[i % s.live.onPitch.length];
      const next = makeHalftimeSub(s, off, on ? on.id : 'nope');
      if (next) { s = next; made++; }
    }
    console.log(`   tried six substitutions, ${made} went through (cap ${capOf(s)})`);
    if (made > capOf(s)) fail('the substitution cap does not hold');
    if (makeHalftimeSub(s, 'not-a-real-id', bench[0].id)) fail('substituting a player who is not on the pitch worked');
    if (makeHalftimeSub(s, s.live.onPitch[0], s.live.onPitch[1])) fail('a player already on the pitch was brought on');
    const week = s.live.week;
    const done = resumeMatch(s);
    if (done.kind !== 'match' || !done.report) fail('resuming the match did not produce a report');
    if (done.state.live) fail('the live match was not cleared after the final whistle');
    if (done.state.week !== week + 1) fail('the calendar did not move on after the match finished');
    const rep = done.report;
    const mineHome = rep.home === s.clubName;
    const ftMine = num('full time mine', mineHome ? rep.homeGoals : rep.awayGoals);
    const ftOpp = num('full time theirs', mineHome ? rep.awayGoals : rep.homeGoals);
    if (ftMine < s.live.myGoals) fail('the final score is lower than the score at halftime');
    if (ftOpp < s.live.oppGoals) fail('the opposition score went down in the second half');
    console.log(`   halftime ${s.live.myGoals}-${s.live.oppGoals}, full time ${ftMine}-${ftOpp}, week ${week} -> ${done.state.week}`);
  }
}

/* ---------- 4. Old saves, and the fast forward ---------- */
section = 4;
console.log('4) A save from before this existed, and Round 93 fast forward');
{
  const s = startCareer('Ajax');
  delete s.live;
  const r = playNextEntry(s, { skipHalftime: true });
  if (r.kind === 'halftime') fail('skipHalftime stopped at halftime on a legacy save');
  if (!r.state) fail('a save with no live field could not be played at all');
  // and a run of fixtures back to back never stops
  let st = startCareer('Everton');
  let stops = 0;
  for (let i = 0; i < 10; i++) {
    const res = playNextEntry(st, { skipHalftime: true });
    st = res.state;
    if (res.kind === 'halftime') stops++;
    if (res.kind === 'seasonOver') break;
  }
  console.log(`   ten fixtures fast forwarded, ${stops} stopped at halftime`);
  if (stops > 0) fail('fast forward stopped at halftime, which is the one thing it must never do');
}

if (CONTROL === 'deaf') {
  /* Fired: the gain line failed, the subs and shape lines held, and nothing else failed. */
  const gain = failed.filter(f => f.section === 2 && /inside the noise|worth nothing at all/.test(f.m));
  const arms = failed.filter(f => f.section === 2 && /hardly ever/.test(f.m));
  const other = failed.length - gain.length;
  if (gain.length > 0 && arms.length === 0 && other === 0) {
    console.error('\nsimHalftime: control deaf FIRED: with the break deaf, the gain line failed and the subs and shape lines held');
    process.exit(1);
  }
  console.error(`\nsimHalftime: control deaf DID NOT FIRE as designed: gain line failures ${gain.length}, subs or shape failures ${arms.length}, other failures ${other}`);
  process.exit(2);
}
console.log(failures === 0 ? '\nALL HALFTIME CHECKS PASSED' : `\n${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
