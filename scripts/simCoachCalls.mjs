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
 *
 * MEASURED 2026-10-03 over 8 seed bases (COACH_CALLS_SEED_BASE 0 to 700 by
 * 100; 6 football and 6 basketball seasons, 120 Aussie Rules seasons each),
 * min to max, and the band set around it:
 *   calls gap    cfb .0076-.0126 [.004,.018]  cbb .0119-.0158 [.007,.022]  afl .0415-.0492 [.032,.06]
 *   plan gap     cfb .0189-.0253 [.012,.033]  cbb .0733-.086  [.06,.10]    afl .0275-.0365 [.02,.046]
 *   policy gap   cfb .0338-.0385 [.025,.05]   cbb .085-.0969  [.07,.115]   afl .0692-.0845 [.055,.10]
 *   random calls share of the gap: cfb .325-.645, cbb .409-.562, afl .50-.571; band [.15,.85]
 *   roster edge  cfb .471-.524 floor .35  cbb .463-.518 floor .35  afl .032-.075 floor .005
 *   calls a season, mean: cfb 4.02-4.66 [3.5,5.2]  cbb 11.26-12.02 [10.3,13]  afl 6.62-6.99 [6,7.6]
 *   calls a season, p10 to p90: cfb 1-2 to 7-9 [1,10]  cbb 7 to 16-17 [5,19]  afl 3 to 10-11 [2,13]
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
  noswing: ['const swing = cappedSwing(pack, st, cameOff ? opt.win : -opt.lose);', 'const swing = 0;'],
  noplan: ['points: roundSym((off + def) * pack.pointsPerEdge),', 'points: 0,'],
  uncapped: ['return clampTo(sofar + one, -pack.oneScore, pack.oneScore) - sofar;', 'return raw;'],
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
const { COACH_CALL_PACKS } = calls;

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
  rosterEdgeFloor: { cfb: 0.35, cbb: 0.35, afl: 0.005 },
  callsMean: { cfb: [3.5, 5.2], cbb: [10.3, 13], afl: [6, 7.6] },
  /* Stated ranges: 80 percent of a coach's seasons fall inside these. */
  callsRange: { cfb: [1, 10], cbb: [5, 19], afl: [2, 13] },
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

fs.rmSync(TMP, { recursive: true, force: true });
console.log(`\nsimCoachCalls: ${checks} checks, ${failures} failed${CONTROL ? ` (control ${CONTROL})` : ''}`);
process.exit(failures ? 1 : 0);
