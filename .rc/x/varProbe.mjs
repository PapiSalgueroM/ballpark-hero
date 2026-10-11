// Release AT, the lead's VAR rule: measured, not asserted by reading code.
// usage (from a tree's root): node varProbe.mjs [full|off]
//   full: arms A (reviews on: live path against quick path), B (reviews on against off), and the off digest
//   off : only the off digest, for a tree from before VAR was merged
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const mode = process.argv[2] || 'full';
const root = process.cwd();
const out = process.env.RC_OUT || path.join(root, '.tmp-fx');
const work = fs.mkdtempSync(path.join(os.tmpdir(), 'var-probe-'));
const bundle = path.join(work, 'cm.cjs');
await build({ entryPoints: [path.join(root, 'src/lib/clubManager.ts')], bundle: true, platform: 'node', format: 'cjs', outfile: bundle, logLevel: 'silent', alias: { '@': path.join(root, 'src') } });
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {}, clear: () => {} };
const cm = createRequire(import.meta.url)(bundle);
for (const k of ['startCareer', 'playNextEntry', 'startSecondHalf', 'resumeMatch']) if (typeof cm[k] !== 'function') { console.error('engine export missing: ' + k); process.exit(2); }

// A seeded stream that counts its draws and can show where it stands.
const realRandom = Math.random, realNow = Date.now;
function run(seed, fn) {
  let a = seed >>> 0, draws = 0;
  Math.random = () => { draws += 1; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  Date.now = () => 1791547200000;
  try { const value = fn(); const used = draws; const next = [Math.random(), Math.random(), Math.random()]; return { value, draws: used, next }; }
  finally { Math.random = realRandom; Date.now = realNow; }
}
const sha = v => createHash('sha256').update(typeof v === 'string' ? v : JSON.stringify(v)).digest('hex');
const timeline = r => r?.detail?.timeline ?? [];
const view = r => ({
  score: [r.home, r.away, r.homeGoals, r.awayGoals, r.decidedBy, r.shootoutWon ?? null],
  scorers: [r.myScorers, r.oppScorers],
  cards: timeline(r).filter(e => e.kind === 'yellow' || e.kind === 'red'),
});
const reviewsOf = r => timeline(r).filter(e => e.kind === 'var');

const CLUBS = ['Everton', 'Arsenal', 'Real Madrid', 'Napoli', 'Ajax', 'Wolves', 'Lyon', 'Celtic'];
const PER_CLUB = Number(process.env.VAR_PROBE_MATCHES || 50);
const tally = { clubs: CLUBS.length, perClub: PER_CLUB, matches: 0, offDigest: null,
  A: { compared: 0, reportEqual: 0, scoreEqual: 0, scorersEqual: 0, cardsEqual: 0, drawsEqual: 0, nextEqual: 0, tableEqual: 0, notCompared: 0, firstDifference: null },
  B: { compared: 0, reportEqual: 0, scoreDiffers: 0, scorersDiffer: 0, cardsDiffer: 0, resultDiffers: 0, drawsDiffer: 0, nextDiffers: 0,
    matchesWithReview: 0, reviews: 0, disallowed: 0, confirmedGoals: 0, penaltyConfirmed: 0, penaltyAwarded: 0, goalsOff: 0, goalsOn: 0, firstDifference: null },
  offMatchesWithReviewLines: 0 };
const offLines = [];
const outcome = r => (r.won ? 'W' : r.drawn ? 'D' : 'L');

for (let c = 0; c < CLUBS.length; c++) {
  const club = CLUBS[c];
  let state = run(4107 + c, () => cm.startCareer(club)).value;
  let played = 0;
  for (let i = 0; i < 400 && played < PER_CLUB; i++) {
    const seed = 900001 + c * 100003 + i * 7919;
    const pre = state;
    const off = run(seed, () => cm.playNextEntry(pre, { skipHalftime: true, noCoach: true }));
    const res = off.value;
    if (res.kind === 'seasonOver' || res.state?.sacked) break;
    state = res.state;
    if (res.kind !== 'match' || !res.report) continue;
    played += 1; tally.matches += 1;
    const row = s => (s.table ?? []).find(t => t.club === club) ?? null;
    offLines.push(JSON.stringify([club, i, res.report, row(res.state), off.draws, off.next]));
    if (reviewsOf(res.report).length) tally.offMatchesWithReviewLines += 1;
    if (mode !== 'full') continue;

    // B: the same match from the same save and seed, reviews on, quick path.
    const on = run(seed, () => cm.playNextEntry(pre, { skipHalftime: true, noCoach: true, varReviews: true }));
    const onRes = on.value;
    if (onRes.kind === 'match' && onRes.report) {
      const B = tally.B, a = view(res.report), b = view(onRes.report);
      B.compared += 1;
      const rv = reviewsOf(onRes.report);
      if (rv.length) B.matchesWithReview += 1;
      B.reviews += rv.length;
      for (const e of rv) {
        const d = e.review ?? {};
        if (d.incident === 'goal' && d.decision === 'disallowed') B.disallowed += 1;
        if (d.incident === 'goal' && d.decision === 'confirmed') B.confirmedGoals += 1;
        if (d.incident === 'penalty' && d.decision === 'confirmed') B.penaltyConfirmed += 1;
        if (d.incident === 'penalty' && d.decision === 'awarded') B.penaltyAwarded += 1;
      }
      B.goalsOff += res.report.homeGoals + res.report.awayGoals;
      B.goalsOn += onRes.report.homeGoals + onRes.report.awayGoals;
      const same = JSON.stringify(res.report) === JSON.stringify(onRes.report);
      if (same) B.reportEqual += 1;
      if (JSON.stringify(a.score) !== JSON.stringify(b.score)) B.scoreDiffers += 1;
      if (JSON.stringify(a.scorers) !== JSON.stringify(b.scorers)) B.scorersDiffer += 1;
      if (JSON.stringify(a.cards) !== JSON.stringify(b.cards)) B.cardsDiffer += 1;
      if (outcome(res.report) !== outcome(onRes.report)) B.resultDiffers += 1;
      if (off.draws !== on.draws) B.drawsDiffer += 1;
      if (JSON.stringify(off.next) !== JSON.stringify(on.next)) B.nextDiffers += 1;
      if (!same && !B.firstDifference) B.firstDifference = { club, entry: i, seed, off: a.score, on: b.score, reviews: rv.map(e => e.review), drawsOff: off.draws, drawsOn: on.draws };
    }

    // A: reviews on, the live path (stop at the break, second half, full time) against the quick path.
    const live = run(seed, () => {
      const stop = cm.playNextEntry(pre, { noCoach: true, varReviews: true });
      if (stop.kind !== 'halftime' || !stop.state.live) return stop;
      const second = cm.startSecondHalf(stop.state);
      return second ? cm.resumeMatch(second) : stop;
    });
    const liveRes = live.value;
    const A = tally.A;
    if (onRes.kind !== 'match' || liveRes.kind !== 'match' || !liveRes.report) { A.notCompared += 1; continue; }
    A.compared += 1;
    const q = view(onRes.report), l = view(liveRes.report);
    const equal = JSON.stringify(onRes.report) === JSON.stringify(liveRes.report);
    if (equal) A.reportEqual += 1;
    if (JSON.stringify(q.score) === JSON.stringify(l.score)) A.scoreEqual += 1;
    if (JSON.stringify(q.scorers) === JSON.stringify(l.scorers)) A.scorersEqual += 1;
    if (JSON.stringify(q.cards) === JSON.stringify(l.cards)) A.cardsEqual += 1;
    if (on.draws === live.draws) A.drawsEqual += 1;
    if (JSON.stringify(on.next) === JSON.stringify(live.next)) A.nextEqual += 1;
    if (JSON.stringify(row(onRes.state)) === JSON.stringify(row(liveRes.state))) A.tableEqual += 1;
    if (!equal && !A.firstDifference) A.firstDifference = { club, entry: i, seed, quick: q.score, live: l.score, reviews: reviewsOf(onRes.report).map(e => e.review), drawsQuick: on.draws, drawsLive: live.draws };
  }
}
tally.offDigest = sha(offLines.join(String.fromCharCode(10)));
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, `var-probe-${mode}-${path.basename(root)}.json`), JSON.stringify(tally, null, 2));
console.log(JSON.stringify(tally));
console.log(`varProbe ${mode}: ${tally.matches} matches over ${CLUBS.length} clubs; off digest ${tally.offDigest}`);
if (mode === 'full') {
  const { A, B } = tally;
  console.log(`A (reviews on, live path against quick path): ${A.reportEqual} of ${A.compared} whole reports equal; score ${A.scoreEqual}, scorers ${A.scorersEqual}, cards ${A.cardsEqual}, table row ${A.tableEqual}, draw count ${A.drawsEqual}, next three draws ${A.nextEqual}; ${A.notCompared} not compared`);
  console.log(`B (reviews on against off, same save and seed): ${B.reportEqual} of ${B.compared} whole reports equal; score differs in ${B.scoreDiffers}, result (W, D, L) in ${B.resultDiffers}, scorers in ${B.scorersDiffer}, cards in ${B.cardsDiffer}, draw count in ${B.drawsDiffer}, next three draws in ${B.nextDiffers}; ${B.matchesWithReview} matches had a review (${B.reviews} reviews: ${B.disallowed} goals ruled out, ${B.confirmedGoals} goals confirmed, ${B.penaltyConfirmed} penalties confirmed, ${B.penaltyAwarded} penalties awarded); goals ${B.goalsOff} off, ${B.goalsOn} on`);
  const ok = A.compared >= 300 && A.reportEqual === A.compared && A.drawsEqual === A.compared && A.nextEqual === A.compared && tally.offMatchesWithReviewLines === 0;
  console.log(ok ? 'varProbe: A HOLDS (showing a review or skipping it is the same match)' : 'varProbe: A DOES NOT HOLD or fewer than 300 matches compared');
  process.exit(ok ? 0 : 1);
}
