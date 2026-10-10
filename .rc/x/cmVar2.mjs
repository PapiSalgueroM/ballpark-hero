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


// v2. Three process modes so both trees make the SAME calls in the same order from a cold module:
//   starts (54e3820a): start the careers, write them.          mk (54e3820a): pass 1 and pass 2.
//   cmp (head): pass 1 and pass 2 exactly as mk made them, then pass 3 with reviews on.
const noLive = s => { const { live: _l, ...rest } = s; return rest; };
const keyShas = s => Object.fromEntries(Object.entries(noLive(s)).map(([k, v]) => [k, sha(v ?? null)]));
if (mode === 'starts') {
  const clubs = [];
  cm.REAL_LEAGUES.slice(0, 20).forEach((lg, i) => {
    const list = cm.playableClubs(lg.id).filter(c => !cm.isPartialClub(c.name));
    if (list.length) clubs.push(list[(i * 3) % list.length].name);
  });
  for (const pl of ['Everton', 'Arsenal']) if (!clubs.includes(pl)) clubs.push(pl);
  const starts = clubs.map((club, c) => run(4107 + c, () => cm.startCareer(club)).value);
  fs.writeFileSync(path.join(shared, 'var-starts.json'), J({ clubs, starts }));
  console.log(`cmVar starts: ${clubs.length} careers started by this tree: ${clubs.join(', ')}`);
  process.exit(0);
}
const { clubs, starts } = JSON.parse(fs.readFileSync(path.join(shared, 'var-starts.json'), 'utf8'));
// Pass 1: the walk alone, Quick Sim as Release AS's hook asked for it. Pass 2: the walk again, each match also live.
function pass1() {
  const lines = [];
  clubs.forEach((club, c) => {
    let state = JSON.parse(J(starts[c])), played = 0;
    for (let i = 0; i < 400 && played < PER; i++) {
      const q = quick(state, seedOf(c, i)), res = q.value;
      if (res.kind === 'seasonOver' || res.state?.sacked) { lines.push({ c, i, stop: res.kind }); break; }
      const row = { c, i, kind: res.kind, stateSha: sha(noLive(res.state)), ...(i < 14 ? { keys: keyShas(res.state) } : {}) };
      if (res.kind === 'match' && res.report) { played += 1; row.quick = digest(q); }
      lines.push(row); state = res.state;
    }
  });
  return lines;
}
function pass2(lines, extraArms) {
  const byC = new Map();
  for (const l of lines) { if (!byC.has(l.c)) byC.set(l.c, []); byC.get(l.c).push(l); }
  clubs.forEach((club, c) => {
    let state = JSON.parse(J(starts[c]));
    for (const l of byC.get(c) ?? []) {
      if (l.stop) break;
      const seed = seedOf(c, l.i);
      if (l.quick) { if (extraArms) extraArms(l, state, seed, club); else l.live = digest(live(state, seed)); }
      state = quick(state, seed).value.state;
    }
  });
}
if (mode === 'mk') {
  const lines = pass1(); pass2(lines);
  fs.writeFileSync(path.join(shared, 'var-base.json'), J(lines));
  console.log(`cmVar mk: ${lines.filter(l => l.quick).length} matches recorded over ${clubs.length} careers`);
  process.exit(0);
}

const base = JSON.parse(fs.readFileSync(path.join(shared, 'var-base.json'), 'utf8'));
const baseAt = new Map(base.map(l => [`${l.c}:${l.i}`, l]));
const REPORT = ['score', 'result', 'scorers', 'cards', 'subs', 'draws', 'next', 'report'];
const WITH_STATE = [...REPORT, 'state'];
const mkArm = fields => ({ compared: 0, notCompared: 0, differs: Object.fromEntries(fields.map(f => [f, 0])), first: null });
const T = { clubs: clubs.length, matches: 0, walkSteps: 0, walkEqual: 0, walkDiffer: 0, firstWalkDifference: null,
  offQuick: mkArm(WITH_STATE), offLive: mkArm(WITH_STATE), onQuick: mkArm(REPORT), onLive: mkArm(REPORT), shownVsSkipped: mkArm(REPORT),
  on: { matchesWithReview: 0, reviews: 0, disallowed: 0, confirmed: 0, penaltyConfirmed: 0, penaltyAwarded: 0, matchesWithAwardedPenalty: 0, goalsAS: 0, goalsOn: 0, byComp: {}, matchesByComp: {},
    confirmedGoalIsOwnGoalOnSheet: 0, confirmedGoalMissingFromSheet: 0, confirmedGoalOtherName: 0, disallowedGoalStillOnSheet: 0, awardedPenaltyWithoutPenaltyRow: 0, scoreSheetMismatch: 0, examples: [] } };
function compare(arm, a, b, tag) {
  if (!a || !b || a.kind !== 'match' || b.kind !== 'match') { arm.notCompared += 1; return; }
  arm.compared += 1;
  for (const f of Object.keys(arm.differs)) if (a[f] !== b[f]) { arm.differs[f] += 1; if (!arm.first) arm.first = { ...tag, field: f, as: a.score, head: b.score, asDraws: a.draws, headDraws: b.draws }; }
}
const mine = pass1();
if (mine.length !== base.length) console.log(`cmVar: the walks have different lengths, AS ${base.length}, head ${mine.length}`);
base.forEach((b, k) => {
  const h = mine[k];
  if (!h || b.stop || h.stop) return;
  T.walkSteps += 1;
  if (h.stateSha === b.stateSha) T.walkEqual += 1;
  else { T.walkDiffer += 1; if (!T.firstWalkDifference) T.firstWalkDifference = { club: clubs[b.c], entry: b.i, kind: b.kind, keysThatDiffer: b.keys && h.keys ? Object.keys({ ...b.keys, ...h.keys }).filter(x => b.keys[x] !== h.keys[x]) : 'not recorded this deep' }; }
  if (b.quick) { T.matches += 1; compare(T.offQuick, b.quick, h.quick, { club: clubs[b.c], entry: b.i }); }
});
pass2(mine);
base.forEach((b, k) => { if (b.quick && mine[k]) compare(T.offLive, b.live, mine[k].live, { club: clubs[b.c], entry: b.i }); });
const named = (g, e) => g.side === e.side && (g.text === e.text || g.text.startsWith(e.text + ' (assist:'));
pass2(mine, (l, state, seed, club) => {
  const b = baseAt.get(`${l.c}:${l.i}`), tag = { club, entry: l.i, seed };
  const onQ = quick(state, seed, { varReviews: true }), dq = digest(onQ);
  compare(T.onQuick, b.quick, dq, tag);
  compare(T.onLive, b.live, digest(live(state, seed, { varReviews: true })), tag);
  compare(T.shownVsSkipped, digest(quick(state, seed, { varReviews: true, noCoach: true })), digest(live(state, seed, { varReviews: true, noCoach: true })), tag);
  const rep = onQ.value.report;
  if (!rep) return;
  const o = T.on, rows = tl(rep), rv = rows.filter(e => e.kind === 'var' && e.review);
  const note = (what, extra) => { if (o.examples.length < 14) o.examples.push({ what, ...tag, match: `${rep.home} ${rep.homeGoals}-${rep.awayGoals} ${rep.away}`, ...extra }); };
  o.matchesByComp[rep.competition] = (o.matchesByComp[rep.competition] ?? 0) + 1;
  o.goalsAS += b.quick.goals ?? 0; o.goalsOn += dq.goals ?? 0;
  if (rv.length) { o.matchesWithReview += 1; o.byComp[rep.competition] = (o.byComp[rep.competition] ?? 0) + 1; }
  o.reviews += rv.length;
  if (rv.some(e => e.review.decision === 'awarded')) o.matchesWithAwardedPenalty += 1;
  const atHome = rep.home === club;
  const meRows = rows.filter(g => g.kind === 'goal' && g.side === 'me').length, oppRows = rows.filter(g => g.kind === 'goal' && g.side === 'opp').length;
  if (meRows !== (atHome ? rep.homeGoals : rep.awayGoals) || oppRows !== (atHome ? rep.awayGoals : rep.homeGoals)) { o.scoreSheetMismatch += 1; note('score and goal rows disagree', { meRows, oppRows }); }
  for (const e of rv) {
    const d = e.review, here = rows.filter(g => g.minute === e.minute && (g.plus ?? 0) === (e.plus ?? 0));
    const goalsHere = here.filter(g => g.kind === 'goal');
    if (d.incident === 'goal' && d.decision === 'disallowed') { o.disallowed += 1; if (goalsHere.some(g => named(g, e))) { o.disallowedGoalStillOnSheet += 1; note('a ruled out goal is still on the sheet', { review: e, goalsHere }); } }
    if (d.incident === 'goal' && d.decision === 'confirmed') {
      o.confirmed += 1;
      if (!goalsHere.some(g => named(g, e))) {
        if (goalsHere.some(g => g.og)) { o.confirmedGoalIsOwnGoalOnSheet += 1; note('VAR confirmed a goal for one man and the sheet gives it as an own goal by another', { review: e, goalsHere }); }
        else if (!goalsHere.length) { o.confirmedGoalMissingFromSheet += 1; note('VAR confirmed a goal the sheet does not have', { review: e }); }
        else { o.confirmedGoalOtherName += 1; note('VAR confirmed a goal under another name', { review: e, goalsHere }); }
      }
    }
    if (d.incident === 'penalty' && d.decision === 'confirmed') o.penaltyConfirmed += 1;
    if (d.incident === 'penalty' && d.decision === 'awarded') { o.penaltyAwarded += 1; if (!here.some(g => g.kind === 'penalty' && g.side === e.side)) { o.awardedPenaltyWithoutPenaltyRow += 1; note('a penalty awarded by review has no penalty row', { review: e, here }); } }
  }
});
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'var-compare.json'), J(T, null, 2));
const line = (name, arm) => `${name}: ${arm.compared} compared (${arm.notCompared} not), differs in ` + Object.entries(arm.differs).map(([k, v]) => `${k} ${v}`).join(', ');
console.log(`cmVar cmp: ${T.matches} matches over ${T.clubs} careers started by Release AS code; walk steps ${T.walkSteps}, state after equal ${T.walkEqual}, different ${T.walkDiffer}; first difference ${J(T.firstWalkDifference)}`);
console.log(line('reviews OFF, Quick Sim, head against AS', T.offQuick));
console.log(line('reviews OFF, live path, head against AS', T.offLive));
console.log(line('reviews ON (what the hook passes), Quick Sim, head against AS', T.onQuick));
console.log(line('reviews ON (what the hook passes), live path, head against AS', T.onLive));
console.log(line('reviews ON, stopped at the break against played through, nobody coaching, head only', T.shownVsSkipped));
console.log(`reviews ON: ${J({ ...T.on, examples: T.on.examples.length })}`);
const clean = arm => Object.values(arm.differs).every(n => n === 0);
const offClean = T.walkDiffer === 0 && clean(T.offQuick) && clean(T.offLive);
const ruleHolds = clean(T.onQuick) && clean(T.onLive);
console.log(`cmVar: default path byte equal to AS: ${offClean ? 'YES' : 'NO'}; the lead's rule (a review never moves a result): ${ruleHolds ? 'HOLDS' : 'BROKEN'}; ${T.matches >= 500 ? 'at least 500 matches' : 'FEWER THAN 500 MATCHES'}`);
process.exit(offClean && ruleHolds && T.matches >= 500 ? 0 : 1);
