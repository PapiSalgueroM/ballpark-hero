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
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ENTRY = '/tmp/htEntry.mjs';
const BUNDLE = '/tmp/ht.bundle.mjs';

fs.writeFileSync(ENTRY, `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const mod = await import('${ROOT}/src/lib/clubManager.ts');
export const cm = mod;
`);
execSync(`${ROOT}/node_modules/.bin/esbuild ${ENTRY} --bundle --format=esm --platform=node --outfile=${BUNDLE} --log-level=error`, { stdio: 'inherit' });

const { cm } = await import(BUNDLE);
const {
  startCareer, playNextEntry, resumeMatch, finishSeason, startNextSeason,
  makeHalftimeSub, setHalftimeMentality, benchForHalftime, tiringAtHalftime,
  MAX_HALFTIME_SUBS,
} = cm;

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };
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
      for (let i = 0; i < MAX_HALFTIME_SUBS; i++) {
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
  if (Math.abs(sg - wg) > 4) fail(`goals scored moved by ${Math.abs(sg - wg).toFixed(1)} just from playing two halves`);
  if (Math.abs(sa - wa) > 4) fail(`goals conceded moved by ${Math.abs(sa - wa).toFixed(1)} just from playing two halves`);
  if (mean(watch.map(r => r.breaks)) < 30) fail('the watching manager barely saw any halftimes, so this measured nothing');
  if (mean(skip.map(r => r.breaks)) > 0) fail('skipHalftime still stopped at halftime');
}

/* ---------- 2. Reacting has to be worth something ---------- */
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
  const RUNS = 500;
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
    console.log(`   tried six substitutions, ${made} went through (cap ${MAX_HALFTIME_SUBS})`);
    if (made > MAX_HALFTIME_SUBS) fail('the substitution cap does not hold');
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

console.log(failures === 0 ? '\nALL HALFTIME CHECKS PASSED' : `\n${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
