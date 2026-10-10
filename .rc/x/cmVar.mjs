// Release AT review (area cm): the lead's VAR rule against Release AS (54e3820a), on the path a player really takes.
// usage, from a tree's root: node cmVar.mjs <mk|cmp> <shared dir>
//   mk : run in a worktree of 54e3820a. Starts the careers THERE (saves made by Release AS code), walks them with
//        Quick Sim as the hook calls it, and records every match two ways: quick, and live (stop at the break, go on).
//   cmp: run in the merged head on the same saves and seeds. Reviews off must equal AS byte for byte; reviews on
//        (what the hook passes for every match now) is measured against AS.
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const mode = process.argv[2];
const shared = process.argv[3];
const root = process.cwd();
const out = process.env.RC_OUT || shared;
fs.mkdirSync(shared, { recursive: true });
const work = fs.mkdtempSync(path.join(os.tmpdir(), 'cm-var-'));
const bundle = path.join(work, 'cm.cjs');
await build({ entryPoints: [path.join(root, 'src/lib/clubManager.ts')], bundle: true, platform: 'node', format: 'cjs', outfile: bundle, logLevel: 'silent', alias: { '@': path.join(root, 'src') } });
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {}, clear: () => {} };
const cm = createRequire(import.meta.url)(bundle);

const realRandom = Math.random, realNow = Date.now;
function run(seed, fn) {
  let a = seed >>> 0, draws = 0;
  Math.random = () => { draws += 1; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  Date.now = () => 1791547200000;
  try { const value = fn(); const used = draws; const next = [Math.random(), Math.random(), Math.random()]; return { value, draws: used, next }; }
  finally { Math.random = realRandom; Date.now = realNow; }
}
const sha = v => createHash('sha256').update(typeof v === 'string' ? v : JSON.stringify(v)).digest('hex').slice(0, 20);
const tl = r => r?.detail?.timeline ?? [];
const J = JSON.stringify;
// What the lead named: score, scorers, cards, substitutions, and the draws after the match.
function digest(played) {
  const res = played.value;
  if (!res || res.kind !== 'match' || !res.report) return { kind: res?.kind ?? 'none' };
  const r = res.report;
  const { live, ...rest } = res.state;
  return {
    kind: 'match', comp: r.competition,
    score: J([r.home, r.away, r.homeGoals, r.awayGoals, r.decidedBy ?? null, r.shootoutWon ?? null]),
    result: r.won ? 'W' : r.drawn ? 'D' : 'L',
    scorers: J([r.myScorers, r.oppScorers]),
    cards: J(tl(r).filter(e => e.kind === 'yellow' || e.kind === 'red').map(e => [e.minute, e.plus ?? 0, e.side, e.kind, e.text])),
    subs: J(tl(r).filter(e => e.kind === 'sub').map(e => [e.minute, e.plus ?? 0, e.side, e.text])),
    goals: r.homeGoals + r.awayGoals,
    report: sha(r), state: sha(rest), draws: played.draws, next: J(played.next),
  };
}
const quick = (pre, seed, extra) => run(seed, () => cm.playNextEntry(pre, { skipHalftime: true, ...extra }));
const live = (pre, seed, extra) => run(seed, () => {
  const stop = cm.playNextEntry(pre, { skipHalftime: false, ...extra });
  if (stop.kind !== 'halftime' || !stop.state.live) return stop;
  const second = cm.startSecondHalf(stop.state);
  return second ? cm.resumeMatch(second) : stop;
});
const PER = Number(process.env.VAR_PER_CLUB || 36);
const seedOf = (c, i) => 900001 + c * 100003 + i * 7919;

if (mode === 'mk') {
  const clubs = [];
  cm.REAL_LEAGUES.slice(0, 20).forEach((lg, i) => {
    const list = cm.playableClubs(lg.id).filter(c => !cm.isPartialClub(c.name));
    if (list.length) clubs.push(list[(i * 3) % list.length].name);
  });
  for (const pl of ['Everton', 'Arsenal']) if (!clubs.includes(pl)) clubs.push(pl);
  const starts = [], lines = [];
  clubs.forEach((club, c) => {
    let state = run(4107 + c, () => cm.startCareer(club)).value;
    starts.push(state);
    let played = 0;
    for (let i = 0; i < 400 && played < PER; i++) {
      const q = quick(state, seedOf(c, i));
      const res = q.value;
      if (res.kind === 'seasonOver' || res.state?.sacked) { lines.push({ c, i, stop: res.kind }); break; }
      const row = { c, i, kind: res.kind, stateSha: sha((({ live: _l, ...rest }) => rest)(res.state)) };
      if (res.kind === 'match' && res.report) { played += 1; row.quick = digest(q); row.live = digest(live(state, seedOf(c, i))); }
      lines.push(row);
      state = res.state;
    }
  });
  fs.writeFileSync(path.join(shared, 'var-starts.json'), J({ clubs, starts }));
  fs.writeFileSync(path.join(shared, 'var-base.json'), J(lines));
  console.log(`cmVar mk: ${clubs.length} careers started by this tree (${clubs.join(', ')}); ${lines.filter(l => l.quick).length} matches recorded`);
  process.exit(0);
}

const { clubs, starts } = JSON.parse(fs.readFileSync(path.join(shared, 'var-starts.json'), 'utf8'));
const base = JSON.parse(fs.readFileSync(path.join(shared, 'var-base.json'), 'utf8'));
const FIELDS = ['score', 'result', 'scorers', 'cards', 'subs', 'draws', 'next', 'state', 'report'];
const mkArm = () => ({ compared: 0, notCompared: 0, differs: Object.fromEntries(FIELDS.map(f => [f, 0])), first: null });
const T = { clubs: clubs.length, matches: 0, walkEqual: 0, walkDiffer: 0, firstWalkDifference: null,
  offQuick: mkArm(), offLive: mkArm(), onQuick: mkArm(), onLive: mkArm(), shownVsSkipped: mkArm(),
  on: { matchesWithReview: 0, reviews: 0, disallowed: 0, confirmed: 0, penaltyConfirmed: 0, penaltyAwarded: 0, matchesWithAwardedPenalty: 0, goalsAS: 0, goalsOn: 0, byComp: {},
    reviewWithoutItsGoal: 0, firstReviewWithoutItsGoal: null, boundStates: 0 } };
function compare(arm, a, b, tag) {
  if (a.kind !== 'match' || b.kind !== 'match') { arm.notCompared += 1; return; }
  arm.compared += 1;
  for (const f of FIELDS) if (a[f] !== b[f]) { arm.differs[f] += 1; if (!arm.first) arm.first = { ...tag, field: f, as: a.score, head: b.score, asDraws: a.draws, headDraws: b.draws }; }
}
const byC = new Map();
for (const l of base) { if (!byC.has(l.c)) byC.set(l.c, []); byC.get(l.c).push(l); }
clubs.forEach((club, c) => {
  let state = starts[c];
  if (state.realLeagueFixtures) T.on.boundStates += 1;
  for (const l of byC.get(c) ?? []) {
    if (l.stop) break;
    const seed = seedOf(c, l.i), tag = { club, entry: l.i, seed };
    const off = quick(state, seed);
    const post = sha((({ live: _l, ...rest }) => rest)(off.value.state));
    if (post === l.stateSha) T.walkEqual += 1; else { T.walkDiffer += 1; if (!T.firstWalkDifference) T.firstWalkDifference = tag; }
    if (l.quick) {
      T.matches += 1;
      compare(T.offQuick, l.quick, digest(off), tag);
      compare(T.offLive, l.live, digest(live(state, seed)), tag);
      const onQ = quick(state, seed, { varReviews: true });
      const dq = digest(onQ);
      compare(T.onQuick, l.quick, dq, tag);
      compare(T.onLive, l.live, digest(live(state, seed, { varReviews: true })), tag);
      // The screen: the same reviewed match stopped at the break against played straight through, nobody coaching.
      compare(T.shownVsSkipped, digest(quick(state, seed, { varReviews: true, noCoach: true })), digest(live(state, seed, { varReviews: true, noCoach: true })), tag);
      const rep = onQ.value.report;
      if (rep) {
        const rows = tl(rep), rv = rows.filter(e => e.kind === 'var' && e.review);
        const o = T.on;
        o.goalsAS += l.quick.goals ?? 0; o.goalsOn += dq.goals ?? 0;
        if (rv.length) { o.matchesWithReview += 1; o.byComp[rep.competition] = (o.byComp[rep.competition] ?? 0) + 1; }
        o.reviews += rv.length;
        if (rv.some(e => e.review.decision === 'awarded')) o.matchesWithAwardedPenalty += 1;
        for (const e of rv) {
          const d = e.review;
          if (d.incident === 'goal' && d.decision === 'disallowed') o.disallowed += 1;
          if (d.incident === 'goal' && d.decision === 'confirmed') {
            o.confirmed += 1;
            // Round 1146 meets Round 1181: is the goal the review confirmed still on the sheet under that name?
            const same = rows.filter(g => g.kind === 'goal' && g.minute === e.minute && (g.plus ?? 0) === (e.plus ?? 0));
            if (!same.some(g => g.text === e.text && g.side === e.side)) { o.reviewWithoutItsGoal += 1; if (!o.firstReviewWithoutItsGoal) o.firstReviewWithoutItsGoal = { ...tag, review: e, goalRowsThatMinute: same }; }
          }
          if (d.incident === 'penalty' && d.decision === 'confirmed') o.penaltyConfirmed += 1;
          if (d.incident === 'penalty' && d.decision === 'awarded') o.penaltyAwarded += 1;
        }
      }
    }
    state = off.value.state;
  }
});
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'var-compare.json'), J(T, null, 2));
const line = (name, arm) => `${name}: ${arm.compared} compared (${arm.notCompared} not), differs in score ${arm.differs.score}, result ${arm.differs.result}, scorers ${arm.differs.scorers}, cards ${arm.differs.cards}, subs ${arm.differs.subs}, draw count ${arm.differs.draws}, next three draws ${arm.differs.next}, state after ${arm.differs.state}, whole report ${arm.differs.report}`;
console.log(`cmVar cmp: ${T.matches} matches over ${T.clubs} careers started by Release AS code; walk steps equal ${T.walkEqual}, different ${T.walkDiffer}`);
console.log(line('reviews OFF, Quick Sim, head against AS', T.offQuick));
console.log(line('reviews OFF, live path, head against AS', T.offLive));
console.log(line('reviews ON (what the hook passes), Quick Sim, head against AS', T.onQuick));
console.log(line('reviews ON (what the hook passes), live path, head against AS', T.onLive));
console.log(line('reviews ON, shown (stopped at the break) against skipped, nobody coaching, head only', T.shownVsSkipped));
console.log(`reviews ON: ${J(T.on)}`);
const offClean = T.walkDiffer === 0 && FIELDS.every(f => T.offQuick.differs[f] === 0 && T.offLive.differs[f] === 0);
const ruleHolds = FIELDS.every(f => T.onQuick.differs[f] === 0 && T.onLive.differs[f] === 0);
console.log(`cmVar: default path byte equal to AS: ${offClean ? 'YES' : 'NO'}; the lead's rule (a review never moves a result): ${ruleHolds ? 'HOLDS' : 'BROKEN'}; ${T.matches >= 500 ? 'at least 500 matches' : 'FEWER THAN 500 MATCHES'}`);
process.exit(offClean && ruleHolds && T.matches >= 500 ? 0 : 1);
