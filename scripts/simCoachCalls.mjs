/**
 * Round 947: coach's calls (src/lib/coachCalls.ts, packs in src/data/coachCalls).
 *
 * The base games come from the real engines, untouched: the college football
 * and college basketball dynasties (every game of every round, read from both
 * seats) and the Aussie Rules manager driven through its own reducer. The
 * calls layer then replays each game under different policies, so every
 * comparison below is paired: the same games, the same dice, only the calls
 * and the plan differ.
 *
 * Checks, each with the control that must turn it red:
 *  1. Packs are well formed: every identity scored against every tendency, no
 *     identity dominates another, 2 to 3 options a moment, every swing within
 *     one score, a moment eligible at every non blowout margin.   (dominant)
 *  2. The packs' pointsPerEdge is the engines' own scale.                 (scale)
 *  3. The calls matter: best calls minus worst calls, plan held neutral, is a
 *     win percentage gap inside a measured band.                       (noswing)
 *  4. The plan matters: best plan minus worst plan, book calls, inside a band. (noplan)
 *  5. Random sits between: random calls land a measured share of the way
 *     from worst calls to best calls.                                (randomworst)
 *  6. The roster still decides: the top quarter of rosters coached worst
 *     out-wins the bottom quarter coached best.                         (bigplan)
 *  Checks 3 and 4 add up to the best policy (plan and calls) against the
 *  worst, which also sits in a measured band.
 *  7. Calls per season inside a stated range, and a blowout never has one. (noblowout)
 *  8. Same seed, same moments, and every policy faces the same dice and the
 *     same number of moments in a game.                               (unseeded)
 *  9. No call and no game's calls together move past one score.        (uncapped)
 *  2 also measures the Aussie Rules engine's own slope, which has no
 *     constant to compare against, and holds the pack's scale to it.  (aflscale)
 *     The college basketball equality has its own control.            (scalecbb)
 * 10. Every call, step by step, under four policies: it comes up only at a
 *     margin inside its own lead range (noelig), never twice in a game
 *     (repeat), a closing moment only in the last slot (noclosing), only
 *     when every option fits what is left of one score (uncapped), it moves
 *     the margin by exactly its card's win or loss (halfswing, noswing), and
 *     the points land on the side the card says, so each side of the box
 *     score agrees with the call log (split).
 * 11. The cards say which way the numbers go: a hand written table of which
 *     of his units leading gives which tendency (swapread) and which units
 *     set each staked option's odds (swapunits).
 * 12. A better unit of yours raises an option's odds and a better unit of his
 *     lowers them, at every one of 59 steps, not only the ends.      (invertgap)
 * 13. A game won by exactly the blowout line still has a call; one point
 *     more has none.                                         (blowedge, noblowout)
 *
 * MEASURED 2026-10-05 over 8 seed bases (COACH_CALLS_SEED_BASE 0 to 700 by
 * 100; 6 football and 6 basketball seasons, 120 Aussie Rules seasons each),
 * min to max, and the band set around it, on the tree where a moment comes up
 * only inside its lead range, once a game, closing moments last and only
 * when every option fits the cap:
 *   calls gap    cfb .0082-.0129 [.004,.018]  cbb .0104-.016  [.007,.022]  afl .0378-.0475 [.032,.06]
 *   plan gap     cfb .0189-.0253 [.012,.033]  cbb .0731-.0842 [.06,.10]    afl .0283-.0381 [.02,.046]
 *   policy gap   cfb .035-.0417  [.025,.05]   cbb .0833-.0948 [.07,.115]   afl .0676-.0831 [.055,.10]
 *   random calls share of the gap: cfb .317-.605, cbb .429-.603, afl .511-.592; band [.15,.85]
 *   roster edge  cfb .472-.522 floor .35  cbb .464-.518 floor .35  afl .0325-.0722 floor .015
 *   calls a season, mean: cfb 3.90-4.53 [3.4,5]  cbb 10.76-11.45 [9.8,12.4]  afl 5.10-5.42 [4.6,5.9]
 *   calls a season, p10 to p90: cfb 1-2 to 7-8 [1,10]  cbb 6-7 to 15-16 [4,19]  afl 2-3 to 8-9 [1,12]
 *   Aussie Rules engine slope 1.554-2.029 points a rating point [1.2,2.5];
 *   the pack's 1.5 is .739-.965 of it [.6,1.15]
 * The college basketball policy gap alone does not fire under noswing (the
 * plan carries most of it there, .073-.084); the calls gap and check 10 do.
 * Football's calls gap is small because the engine's scores make three
 * games in four a blowout, which has no calls; inside close games it is
 * about four times as big. Aussie Rules' roster edge is thin because the six
 * fictional clubs are drawn from one pool and sit close together, which is
 * also why its pack's planEdge is the lowest.
 *
 * Run: node scripts/simCoachCalls.mjs            (COACH_CALLS_CONTROL=<name> for a control)
 * A harness named test* is skipped by runAllSims; this one is sim*.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROOT_URL = ROOT.replaceAll('\\', '/');
const CONTROL = process.env.COACH_CALLS_CONTROL || '';
const MEASURE = process.env.COACH_CALLS_MEASURE === '1';
const SEED_BASE = Number(process.env.COACH_CALLS_SEED_BASE || 0);

const CFB_SEASONS = 6;
const CBB_SEASONS = 6;
const AFL_SEASONS = 120;

/* Each control: the exact bundled text it rewrites and what it becomes. */
const CONTROLS = {
  noswing: ['const swing = cameOff ? opt.win : -opt.lose;', 'const swing = 0;'],
  halfswing: ['const swing = cameOff ? opt.win : -opt.lose;', 'const swing = cameOff ? opt.win : -Math.ceil(opt.lose / 2);'],
  noplan: ['points: roundSym((off + def) * pack.pointsPerEdge),', 'points: 0,'],
  uncapped: ['&& m.options.every((o) => fitsCap(pack, sofar, o))', '&& true'],
  noelig: ['(m) => inLead(m, st.margin) &&', '(m) => true &&'],
  repeat: ['!st.calls.some((c) => c.moment === m.id)', 'true'],
  noclosing: ['(last || !m.closing)', 'true'],
  split: ['return opt.winBy === "stop" ? [0, -swing] : [swing, 0];', 'return [swing, 0];'],
  invertgap: ['const gap = (mine[opt.mine] ?? 60) - (his[opt.theirs] ?? 60);', 'const gap = (his[opt.theirs] ?? 60) - (mine[opt.mine] ?? 60);'],
  blowedge: ['m > pack.blowout) return 0;', 'm >= pack.blowout) return 0;'],
  scalecbb: ['var CBB_POINTS_PER_EDGE = 1.5;', 'var CBB_POINTS_PER_EDGE = 2;'],
  aflscale: ['1.5 sits at or a little under it. */\n  pointsPerEdge: 1.5,', '1.5 sits at or a little under it. */\n  pointsPerEdge: 2.5,'],
  swapread: ['read: ["back", "mid"],', 'read: ["mid", "back"],'],
  swapunits: ['mine: "pass", theirs: "coverage"', 'mine: "coverage", theirs: "pass"'],
  unseeded: ['const dice = Array.from({ length: DICE }, () => rng());', 'const dice = Array.from({ length: DICE }, () => Math.random());'],
  noblowout: ['if (!Number.isFinite(m) || m > pack.blowout) return 0;', 'if (!Number.isFinite(m)) return 0;'],
  randomworst: ['if (policy === "random") return', 'if (policy === "random" && false) return'],
  bigplan: ['const edge = clampTo(pack.planEdge, 0, PLAN_EDGE_CAP);', 'const edge = 10 * pack.planEdge;'],
  scale: ['var CFB_POINTS_PER_EDGE = 1.5;', 'var CFB_POINTS_PER_EDGE = 2;'],
  dominant: ['vs: { "stout-front": 0, "lockdown-back": -1, "level-d": 1 }', 'vs: { "stout-front": 0, "lockdown-back": 1, "level-d": 1 }'],
};
if (CONTROL && !CONTROLS[CONTROL]) { console.error(`COACH_CALLS_CONTROL=${CONTROL} is not a control this harness knows`); process.exit(1); }

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };
const ok = m => console.log('  ok: ' + m);

/* ---- bundle the layer and the three engines ---- */
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), `coachCalls-${process.pid}-`));
const ENTRY = path.join(TMP, 'entry.mjs');
const BUNDLE = path.join(TMP, 'bundle.mjs');
fs.writeFileSync(ENTRY, `
export * as calls from '${ROOT_URL}/src/lib/coachCalls.ts';
export * as cfb from '${ROOT_URL}/src/lib/cfbDynasty.ts';
export * as cbb from '${ROOT_URL}/src/lib/cbbDynasty.ts';
export * as afl from '${ROOT_URL}/src/lib/aussieRulesManager.ts';
export { rngFrom } from '${ROOT_URL}/src/lib/careerEngine.ts';
`);
await build({ entryPoints: [ENTRY], bundle: true, format: 'esm', platform: 'node', outfile: BUNDLE, logLevel: 'error', alias: { '@': `${ROOT_URL}/src` } });
if (CONTROL) {
  const [from, to] = CONTROLS[CONTROL];
  const text = fs.readFileSync(BUNDLE, 'utf8');
  const hits = text.split(from).length - 1;
  if (hits !== 1) { console.error(`control cannot run: "${from}" is in the bundle ${hits} times, not once`); process.exit(1); }
  fs.writeFileSync(BUNDLE, text.replace(from, to));
  console.log(`NEGATIVE CONTROL ON: ${CONTROL}`);
}
const { calls, cfb, cbb, afl, rngFrom } = await import(pathToFileURL(BUNDLE).href);
const COACH_CALL_PACKS = Object.fromEntries(calls.CALL_SPORTS.map(s => [s, calls.callPack(s)]));

/* ---- the base games, from the engines as they are ---- */
const asRoster = players => players.map(p => ({ pos: p.pos, ovr: p.ovr }));
const avg = xs => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0);

/** One coaching seat: a game seen from one side. */
function seatPair(out, sport, season, round, home, away, hs, as, key) {
  const pack = COACH_CALL_PACKS[sport];
  const hu = calls.readUnits(pack, home.roster), au = calls.readUnits(pack, away.roster);
  out.push({ sport, season, team: home.id, round, myScore: hs, oppScore: as, mine: hu, his: au, strength: home.strength, key: `${key}|h` });
  out.push({ sport, season, team: away.id, round, myScore: as, oppScore: hs, mine: au, his: hu, strength: away.strength, key: `${key}|a` });
}

function collegeSeats(sport, eng, seasons, seedOff) {
  const out = [];
  const schools = sport === 'cfb' ? eng.CFB_SCHOOLS : eng.CBB_SCHOOLS;
  const rounds = sport === 'cfb' ? eng.CFB_ROUNDS : eng.CBB_ROUNDS;
  for (let s = 0; s < seasons; s += 1) {
    const rng = rngFrom(seedOff + SEED_BASE + s);
    const st = sport === 'cfb' ? eng.initCfb(schools[0].id, rng, { depth: true }) : eng.initCbb(schools[0].id, rng, { depth: true });
    const strengthOf = sport === 'cfb' ? eng.cfbStrength : eng.cbbStrength;
    for (let r = 1; r <= rounds; r += 1) {
      st.round = r;
      const view = id => ({ id, roster: asRoster(st.teams[id].players), strength: strengthOf(st.teams[id]) });
      const { games } = sport === 'cfb' ? eng.simCfbRound(st, rng) : eng.simCbbRound(st, rng);
      games.forEach((g, i) => seatPair(out, sport, s, r, view(g.home), view(g.away), g.hs, g.as, `${s}|${r}|${i}|${g.home}|${g.away}`));
    }
  }
  return out;
}

function aflSeats(seasons, seedOff) {
  const out = [];
  for (let s = 0; s < seasons; s += 1) {
    const seed = seedOff + SEED_BASE + s;
    let st = afl.createManager(seed, `club-${s % 6}`);
    const clubs = st.clubs;
    while (st.phase !== 'complete') {
      const before = st;
      if (st.phase === 'prepare') st = afl.reduceManager(st, { type: 'prepare', choice: st.round % 2 === 0 ? 'train' : 'rest' });
      else if (st.phase === 'quarter') st = afl.reduceManager(st, { type: 'play', tactic: afl.opponentTactic(st) });
      else st = afl.reduceManager(st, { type: 'next' });
      if (st === before) throw new Error(`the Aussie Rules manager stalled in phase ${st.phase}`);
    }
    const view = id => {
      const club = clubs.find(c => c.id === id);
      return { id, roster: club.players.map(p => ({ pos: p.role, ovr: p.skill })), strength: avg(afl.automaticLineup(club).starters.map(pid => club.players.find(p => p.id === pid).skill)) };
    };
    st.results.forEach((m, i) => seatPair(out, 'afl', s, m.round, view(m.homeId), view(m.awayId), m.homeScore.total, m.awayScore.total, `${s}|${m.round}|${i}|${m.homeId}|${m.awayId}`));
  }
  return out;
}

const t0 = Date.now();
const SEATS = {
  cfb: collegeSeats('cfb', cfb, CFB_SEASONS, 1000),
  cbb: collegeSeats('cbb', cbb, CBB_SEASONS, 2000),
  afl: aflSeats(AFL_SEASONS, 3000),
};
console.log(`base games: cfb ${SEATS.cfb.length / 2}, cbb ${SEATS.cbb.length / 2}, afl ${SEATS.afl.length / 2} (${((Date.now() - t0) / 1000).toFixed(1)}s)`);

/* ---- replay every seat under a plan and a call policy ---- */
const share = r => (r.result === 'win' ? 1 : r.result === 'draw' ? 0.5 : 0);
const lcg = seed => { let x = (seed >>> 0) % 2147483647 || 1; return () => (x = (x * 16807) % 2147483647) / 2147483647; };

function planFor(pack, seat, which, pick) {
  if (which === 'none') return null;
  if (which === 'random') {
    const p = side => pack.plan[side].identities[Math.floor(pick() * pack.plan[side].identities.length)].id;
    return { off: p('off'), def: p('def') };
  }
  return calls.pickPlan(pack, seat.his, which);
}

function replay(seat, planWhich, policy, salt = 0) {
  const pack = COACH_CALL_PACKS[seat.sport];
  const pick = lcg(seat.season * 7919 + seat.round * 104729 + seat.key.length * 31 + salt + (seat.key.endsWith('h') ? 1 : 2));
  const plan = planFor(pack, seat, planWhich, pick);
  return calls.playCalls(pack, { seed: seat.season + 1, gameKey: seat.key, myScore: seat.myScore, oppScore: seat.oppScore, mine: seat.mine, his: seat.his, plan }, policy, pick);
}

const COMBOS = [['none', 'book'], ['none', 'best'], ['none', 'worst'], ['none', 'random'], ['best', 'book'], ['worst', 'book'], ['best', 'best'], ['worst', 'worst'], ['random', 'random']];
const STATS = {};
for (const sport of Object.keys(SEATS)) {
  const seats = SEATS[sport];
  const wp = {};
  for (const [pl, po] of COMBOS) wp[`${pl}/${po}`] = avg(seats.map(s => share(replay(s, pl, po))));
  wp.base = avg(seats.map(s => (s.myScore > s.oppScore ? 1 : s.myScore === s.oppScore ? 0.5 : 0)));
  STATS[sport] = { wp };
}

/* ---- per seat facts under best play: calls, caps, blowouts, determinism ---- */
const pct = (xs, q) => { const s = [...xs].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(q * s.length))]; };
for (const sport of Object.keys(SEATS)) {
  const pack = COACH_CALL_PACKS[sport];
  const seats = SEATS[sport];
  const perTeamSeason = new Map();
  let overCall = 0, overGame = 0, blowoutCalls = 0, blowouts = 0, countDiff = 0, diceDiff = 0, rerunDiff = 0, swingTotal = 0;
  const tendencyCount = {};
  seats.forEach((s, i) => {
    const r = replay(s, 'best', 'best');
    const k = `${s.season}|${s.team}`;
    perTeamSeason.set(k, (perTeamSeason.get(k) ?? 0) + r.calls.length);
    for (const c of r.calls) { if (Math.abs(c.swing) > pack.oneScore) overCall += 1; swingTotal += Math.abs(c.swing); }
    if (Math.abs(r.calls.reduce((a, c) => a + c.swing, 0)) > pack.oneScore) overGame += 1;
    if (Math.abs(s.myScore - s.oppScore) > pack.blowout) { blowouts += 1; if (r.calls.length) blowoutCalls += 1; }
    if (i % 4 === 0) {
      const input = { seed: s.season + 1, gameKey: s.key, myScore: s.myScore, oppScore: s.oppScore, mine: s.mine, his: s.his, plan: null };
      const a = calls.startCalls(pack, input), b = calls.startCalls(pack, { ...input, plan: calls.pickPlan(pack, s.his, 'worst') });
      if (a.count !== b.count) countDiff += 1;
      if (JSON.stringify(a.dice) !== JSON.stringify(b.dice)) diceDiff += 1;
      if (JSON.stringify(replay(s, 'best', 'best')) !== JSON.stringify(r)) rerunDiff += 1;
    }
    for (const side of ['off', 'def']) { const t = `${side}:${calls.readTendency(pack, side, s.his).id}`; tendencyCount[t] = (tendencyCount[t] ?? 0) + 1; }
  });
  const sums = [...perTeamSeason.values()];
  Object.assign(STATS[sport], {
    callsMean: avg(sums), callsP10: pct(sums, 0.1), callsP90: pct(sums, 0.9),
    overCall, overGame, blowouts, blowoutCalls, countDiff, diceDiff, rerunDiff,
    swingPerCall: swingTotal / Math.max(1, sums.reduce((a, b) => a + b, 0)),
    tendencies: Object.fromEntries(Object.entries(tendencyCount).map(([k, v]) => [k, +(v / seats.length).toFixed(3)])),
  });
  /* The roster: the top and bottom quarter of team seasons by strength, book play, no plan. */
  const byTeam = new Map();
  for (const s of seats) {
    const k = `${s.season}|${s.team}`;
    const e = byTeam.get(k) ?? { strength: s.strength, w: 0, wb: 0, ww: 0, n: 0 };
    e.w += share(replay(s, 'none', 'book')); e.wb += share(replay(s, 'best', 'best')); e.ww += share(replay(s, 'worst', 'worst')); e.n += 1; byTeam.set(k, e);
  }
  const teams = [...byTeam.values()].sort((a, b) => a.strength - b.strength);
  const q = Math.max(1, Math.floor(teams.length / 4));
  const wpOf = (xs, f = 'w') => xs.reduce((a, t) => a + t[f], 0) / xs.reduce((a, t) => a + t.n, 0);
  STATS[sport].rosterSpread = wpOf(teams.slice(-q)) - wpOf(teams.slice(0, q));
  /* A top quarter roster coached worst against a bottom quarter roster coached best. */
  STATS[sport].rosterEdge = wpOf(teams.slice(-q), 'ww') - wpOf(teams.slice(0, q), 'wb');
}

const r3 = x => +x.toFixed(4);
for (const sport of Object.keys(STATS)) {
  const S = STATS[sport];
  S.callsGap = S.wp['none/best'] - S.wp['none/worst'];
  S.planGap = S.wp['best/book'] - S.wp['worst/book'];
  S.policyGap = S.wp['best/best'] - S.wp['worst/worst'];
  S.randomShare = (S.wp['random/random'] - S.wp['worst/worst']) / (S.policyGap || 1e-9);
  S.randomCallShare = (S.wp['none/random'] - S.wp['none/worst']) / (S.callsGap || 1e-9);
  S.rosterRatio = S.rosterSpread / (S.policyGap || 1e-9);
  console.log(`${sport}: callsGap ${r3(S.callsGap)} planGap ${r3(S.planGap)} policyGap ${r3(S.policyGap)} randomShare ${r3(S.randomShare)} randomCallShare ${r3(S.randomCallShare)} rosterSpread ${r3(S.rosterSpread)} rosterRatio ${r3(S.rosterRatio)} rosterEdge ${r3(S.rosterEdge)}`);
  console.log(`${sport}: calls/season mean ${r3(S.callsMean)} p10 ${S.callsP10} p90 ${S.callsP90}; swing/call ${r3(S.swingPerCall)}; blowouts ${S.blowouts} with calls ${S.blowoutCalls}; over cap call ${S.overCall} game ${S.overGame}; count/dice/rerun diffs ${S.countDiff}/${S.diceDiff}/${S.rerunDiff}`);
  if (MEASURE) console.log(`${sport}: wp ${JSON.stringify(Object.fromEntries(Object.entries(S.wp).map(([k, v]) => [k, r3(v)])))} tendencies ${JSON.stringify(S.tendencies)}`);
}
console.log(`replays done (${((Date.now() - t0) / 1000).toFixed(1)}s)`);

/* ---- the checks ---- */
const BANDS = {
  policyGap: { cfb: [0.025, 0.05], cbb: [0.07, 0.115], afl: [0.055, 0.1] },
  callsGap: { cfb: [0.004, 0.018], cbb: [0.007, 0.022], afl: [0.032, 0.06] },
  planGap: { cfb: [0.012, 0.033], cbb: [0.06, 0.1], afl: [0.02, 0.046] },
  randomCallShare: { cfb: [0.15, 0.85], cbb: [0.15, 0.85], afl: [0.15, 0.85] },
  rosterEdgeFloor: { cfb: 0.35, cbb: 0.35, afl: 0.015 },
  callsMean: { cfb: [3.4, 5], cbb: [9.8, 12.4], afl: [4.6, 5.9] },
  /* Stated ranges: 80 percent of a coach's seasons fall inside these. */
  callsRange: { cfb: [1, 10], cbb: [4, 19], afl: [1, 12] },
  /* Aussie Rules' scale: the engine's measured slope, and the pack's
   * pointsPerEdge as a share of it. */
  aflSlope: [1.2, 2.5],
  aflPpeShare: [0.6, 1.15],
};
let checks = 0;
const check = (cond, msg) => { checks += 1; if (cond) ok(msg); else fail(msg); };
const inBand = (v, [lo, hi]) => v >= lo && v <= hi;

console.log('1. packs are well formed');
for (const pack of Object.values(COACH_CALL_PACKS)) {
  const sides = ['off', 'def'].map(side => {
    const s = pack.plan[side];
    const ts = s.tendencies.map(t => t.id);
    const scored = s.identities.every(i => ts.every(t => [-1, 0, 1].includes(i.vs[t])));
    const dominated = s.identities.some(a => s.identities.some(b => a !== b && ts.every(t => a.vs[t] >= b.vs[t]) && ts.some(t => a.vs[t] > b.vs[t])));
    return scored && !dominated && s.identities.length >= 3 && s.identities.length <= 4;
  });
  check(sides.every(Boolean), `${pack.sport}: 3 to 4 identities a side, each scored on every tendency, none dominates another`);
  const optsOk = pack.moments.every(m => m.options.length >= 2 && m.options.length <= 3 && m.options.every(o => o.win >= 0 && o.lose >= 0 && o.win <= pack.oneScore && o.lose <= pack.oneScore));
  check(optsOk, `${pack.sport}: 2 to 3 options a moment, every swing within one score (${pack.oneScore})`);
  let uncovered = 0;
  for (let m = -pack.blowout; m <= pack.blowout; m += 1) if (!pack.moments.some(d => m >= d.lead[0] && m <= d.lead[1])) uncovered += 1;
  check(uncovered === 0, `${pack.sport}: a moment can come up at every margin inside the blowout line (${uncovered} uncovered)`);
}

console.log('2. the packs use the engines\' own points per edge');
check(COACH_CALL_PACKS.cfb.pointsPerEdge === cfb.CFB_POINTS_PER_EDGE, `cfb ${COACH_CALL_PACKS.cfb.pointsPerEdge} = CFB_POINTS_PER_EDGE ${cfb.CFB_POINTS_PER_EDGE}`);
check(COACH_CALL_PACKS.cbb.pointsPerEdge === cbb.CBB_POINTS_PER_EDGE, `cbb ${COACH_CALL_PACKS.cbb.pointsPerEdge} = CBB_POINTS_PER_EDGE ${cbb.CBB_POINTS_PER_EDGE}`);
/* The Aussie Rules engine has no such constant, so its scale is measured: the
 * least squares slope of the final margin on the two lineups' strength gap,
 * over every game the harness played. */
{
  const xs = [], ys = [];
  for (let i = 0; i + 1 < SEATS.afl.length; i += 2) { xs.push(SEATS.afl[i].strength - SEATS.afl[i + 1].strength); ys.push(SEATS.afl[i].myScore - SEATS.afl[i].oppScore); }
  const mx = avg(xs), my = avg(ys);
  const slope = xs.reduce((s, x, i) => s + (x - mx) * (ys[i] - my), 0) / xs.reduce((s, x) => s + (x - mx) ** 2, 0);
  const ppe = COACH_CALL_PACKS.afl.pointsPerEdge;
  console.log(`  afl: engine slope ${r3(slope)} points a rating point over ${xs.length} games, pack pointsPerEdge ${ppe}`);
  check(inBand(slope, BANDS.aflSlope) && inBand(ppe / slope, BANDS.aflPpeShare), `afl: the engine's own slope ${r3(slope)} sits in [${BANDS.aflSlope}] and the pack's ${ppe} is ${r3(ppe / slope)} of it, band [${BANDS.aflPpeShare}]`);
}

for (const sport of Object.keys(STATS)) {
  const S = STATS[sport];
  const b = k => BANDS[k][sport];
  console.log(`3 to 9. ${sport}`);
  check(inBand(S.callsGap, b('callsGap')), `${sport}: calls matter, best calls beat worst by ${r3(S.callsGap)} of win share, band [${b('callsGap')}]`);
  check(inBand(S.planGap, b('planGap')), `${sport}: the plan matters, best plan beats worst by ${r3(S.planGap)}, band [${b('planGap')}]`);
  check(inBand(S.policyGap, b('policyGap')), `${sport}: best policy beats worst by ${r3(S.policyGap)}, band [${b('policyGap')}]`);
  check(inBand(S.randomCallShare, b('randomCallShare')), `${sport}: random calls sit between, ${r3(S.randomCallShare)} of the way from worst to best, band [${b('randomCallShare')}]`);
  check(S.rosterEdge >= b('rosterEdgeFloor'), `${sport}: the roster still decides, a top quarter roster coached worst out-wins a bottom quarter roster coached best by ${r3(S.rosterEdge)} (floor ${b('rosterEdgeFloor')})`);
  check(inBand(S.callsMean, b('callsMean')), `${sport}: ${r3(S.callsMean)} calls a season, band [${b('callsMean')}]`);
  check(S.callsP10 >= b('callsRange')[0] && S.callsP90 <= b('callsRange')[1], `${sport}: 80 percent of seasons have ${S.callsP10} to ${S.callsP90} calls, stated range [${b('callsRange')}]`);
  check(S.blowouts > 0 && S.blowoutCalls === 0, `${sport}: none of ${S.blowouts} blowouts had a call (${S.blowoutCalls} did)`);
  check(S.countDiff === 0 && S.diceDiff === 0 && S.rerunDiff === 0, `${sport}: same seed, same moments; a plan never changes the dice or the count (diffs ${S.countDiff}/${S.diceDiff}/${S.rerunDiff})`);
  check(S.overCall === 0 && S.overGame === 0, `${sport}: no call and no game moved past one score (${S.overCall} calls, ${S.overGame} games)`);
}

console.log('10. every call, step by step: where its words allow, once, closing last, inside the cap, exactly the card');
for (const sport of Object.keys(SEATS)) {
  const pack = COACH_CALL_PACKS[sport];
  const v = { calls: 0, outLead: 0, repeats: 0, earlyClose: 0, overCap: 0, broken: 0, wrongSide: 0, box: 0, boxed: 0 };
  const seen = new Set();
  SEATS[sport].forEach((seat, i) => {
    for (const policy of ['best', 'worst', 'random', 'book']) {
      const pick = lcg(i * 4 + policy.length + 17);
      const input = { seed: seat.season + 1, gameKey: seat.key, myScore: seat.myScore, oppScore: seat.oppScore, mine: seat.mine, his: seat.his, plan: policy === 'book' ? null : calls.pickPlan(pack, seat.his, policy === 'worst' ? 'worst' : 'best') };
      let st = calls.startCalls(pack, input);
      for (let m = calls.nextMoment(pack, st); m; m = calls.nextMoment(pack, st)) {
        const net = calls.callsNet(st);
        if (st.margin < m.def.lead[0] || st.margin > m.def.lead[1]) v.outLead += 1;
        if (st.calls.some(c => c.moment === m.def.id)) v.repeats += 1;
        if (m.def.closing && m.slot !== st.count - 1) v.earlyClose += 1;
        if (m.def.options.some(o => Math.abs(net + o.win) > pack.oneScore || Math.abs(net - o.lose) > pack.oneScore)) v.overCap += 1;
        const before = st.margin;
        st = calls.answerMoment(pack, st, calls.chooseOption(pack, st, m, policy, pick));
        const c = st.calls[st.calls.length - 1];
        const o = m.def.options.find(x => x.id === c.option);
        if (c.swing !== (c.cameOff ? o.win : -o.lose) || st.margin - before !== c.swing) v.broken += 1;
        /* The card says where the points land: a stop comes off his score, a miss off yours. */
        const want = c.swing > 0 ? (o.winBy === 'stop' ? [0, -c.swing] : [c.swing, 0]) : c.swing < 0 ? (o.loseBy === 'miss' ? [c.swing, 0] : [0, -c.swing]) : [0, 0];
        if (c.forYou !== want[0] || c.forThem !== want[1]) v.wrongSide += 1;
        v.calls += 1;
        seen.add(m.def.id);
      }
      const r = calls.finishCalls(pack, st);
      if (!r.overtime && r.myScore > 0 && r.oppScore > 0) {
        v.boxed += 1;
        const p = r.planPoints;
        if (r.myScore !== seat.myScore + Math.max(0, p) + r.calls.reduce((a, c) => a + c.forYou, 0) || r.oppScore !== seat.oppScore + Math.max(0, -p) + r.calls.reduce((a, c) => a + c.forThem, 0)) v.box += 1;
      }
    }
  });
  const unseen = pack.moments.filter(m => !seen.has(m.id)).map(m => m.id);
  check(v.calls > 1000 && unseen.length === 0, `${sport}: the walk made ${v.calls} calls and every moment came up (${unseen.join(', ') || 'none missing'})`);
  check(v.outLead === 0, `${sport}: every moment came up at a margin inside its own lead range (${v.outLead} did not)`);
  check(v.repeats === 0, `${sport}: no moment came up twice in a game (${v.repeats} did)`);
  check(v.earlyClose === 0, `${sport}: a closing moment only ever filled the last slot (${v.earlyClose} did not)`);
  check(v.overCap === 0, `${sport}: every option of every moment fit what was left of one score (${v.overCap} did not)`);
  check(v.broken === 0, `${sport}: every call moved the margin by exactly its card's win or loss (${v.broken} did not)`);
  check(v.wrongSide === 0 && v.box === 0 && v.boxed > 1000, `${sport}: the points landed on the side the card says, and each side of ${v.boxed} box scores agrees with the call log (${v.wrongSide} calls, ${v.box} scores off)`);
}

console.log('11. the cards say which way the numbers go');
/* Written once by hand from the labels and blurbs (src/lib/coachCalls.test.ts
 * holds the same table): which of HIS units leading gives which tendency, and
 * which of your units and his set each staked option's odds. */
const TENDENCY_WHEN_LEADS = {
  cfb: { off: { front: 'stout-front', coverage: 'lockdown-back' }, def: { run: 'run-first', pass: 'pass-first' } },
  cbb: { off: { perimeter: 'perimeter-d', paint: 'rim-d' }, def: { perimeter: 'shooters', paint: 'post-o' } },
  afl: { off: { back: 'strong-back', mid: 'press-mid' }, def: { fwd: 'forward-heavy', mid: 'mid-run' } },
};
const OPTION_UNITS = {
  cfb: { 'fourth-short/go': ['run', 'front'], 'two-point/two': ['pass', 'coverage'], 'onside/onside': ['kick', 'pass'], 'kneel/score': ['run', 'front'] },
  cbb: { 'foul-up-three/defend': ['perimeter', 'perimeter'], 'foul-up-three/foul': ['paint', 'paint'], 'press/press': ['perimeter', 'perimeter'], 'zone-or-man/zone': ['paint', 'perimeter'], 'ice/ice': ['perimeter', 'perimeter'] },
  afl: { 'tag/tag': ['mid', 'mid'], 'flood/shape': ['back', 'fwd'], 'flood/flood': ['back', 'fwd'], 'extra-stoppage/extra': ['ruck', 'ruck'], 'swing-tall/swing': ['fwd', 'back'] },
};
const flat = (pack, v) => Object.fromEntries(Object.keys(pack.units).map(u => [u, v]));
for (const pack of Object.values(COACH_CALL_PACKS)) {
  const bad = [];
  for (const side of ['off', 'def']) {
    for (const [unit, id] of Object.entries(TENDENCY_WHEN_LEADS[pack.sport][side])) {
      const got = calls.readTendency(pack, side, { ...flat(pack, 70), [unit]: 80 }).id;
      if (got !== id) bad.push(`${side} ${unit}->${got}`);
    }
    if (calls.readTendency(pack, side, flat(pack, 70)).id !== pack.plan[side].tendencies[2].id) bad.push(`${side} level`);
  }
  check(bad.length === 0, `${pack.sport}: his tendency reads the way its label says on both sides (${bad.join(', ') || 'all four plus level'})`);
  const swaps = [];
  let staked = 0;
  for (const m of pack.moments) for (const o of m.options) {
    if (o.win === 0 && o.lose === 0) continue;
    staked += 1;
    const want = OPTION_UNITS[pack.sport][`${m.id}/${o.id}`];
    if (!want || want[0] !== o.mine || want[1] !== o.theirs) swaps.push(`${m.id}/${o.id}`);
  }
  check(swaps.length === 0 && staked === Object.keys(OPTION_UNITS[pack.sport]).length, `${pack.sport}: each of ${staked} staked options names the units its blurb does (${swaps.join(', ') || 'none off'})`);
}

console.log('12. a better unit raises the odds, every step of the ladder');
for (const pack of Object.values(COACH_CALL_PACKS)) {
  let wrong = 0, still = 0, options = 0;
  for (const m of pack.moments) for (const o of m.options) {
    if (o.win === 0 && o.lose === 0) continue;
    options += 1;
    let rose = 0, fell = 0;
    for (let v = 41; v <= 99; v += 1) {
      const up = calls.optionOdds(o, { ...flat(pack, 70), [o.mine]: v }, flat(pack, 70)), was = calls.optionOdds(o, { ...flat(pack, 70), [o.mine]: v - 1 }, flat(pack, 70));
      const down = calls.optionOdds(o, flat(pack, 70), { ...flat(pack, 70), [o.theirs]: v }), before = calls.optionOdds(o, flat(pack, 70), { ...flat(pack, 70), [o.theirs]: v - 1 });
      if (up < was || down > before) wrong += 1;
      if (up > was) rose += 1;
      if (down < before) fell += 1;
    }
    if (!rose || !fell) still += 1;
  }
  check(wrong === 0 && still === 0, `${pack.sport}: over ${options} staked options and 59 steps each way, odds never fell with your unit or rose with his (${wrong}), and every one moved (${still} did not)`);
}

console.log('13. the blowout line, exactly');
for (const pack of Object.values(COACH_CALL_PACKS)) {
  let off = 0;
  for (let d = 0; d < 1; d += 0.01) {
    if (calls.momentCount(pack, pack.blowout, d) < 1 || calls.momentCount(pack, -pack.blowout, d) < 1) off += 1;
    if (calls.momentCount(pack, pack.blowout + 1, d) !== 0 || calls.momentCount(pack, -pack.blowout - 1, d) !== 0) off += 1;
  }
  check(off === 0, `${pack.sport}: a game won by exactly ${pack.blowout} still has a call and one won by ${pack.blowout + 1} has none (${off} dice off)`);
}

fs.rmSync(TMP, { recursive: true, force: true });
console.log(`\nsimCoachCalls: ${checks} checks, ${failures} failed${CONTROL ? ` (control ${CONTROL})` : ''}`);
process.exit(failures ? 1 : 0);
