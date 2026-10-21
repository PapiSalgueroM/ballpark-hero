/**
 * Round 1532, step 1: the PREDICTED TABLE (brief-1532 section 0 R1, critic items
 * 6, 7, 8, 20, 21, 22), computed from the base record
 * scripts/data/tycoonScorelineBaseline.json and the shared scoring law
 * (src/lib/season/law.ts, bundled, never restated). No engine is edited and no
 * engine is run on a candidate table: every number here is the law's exact
 * binomial over 90 one roll minutes per side (brief 3.3: a minute's chance is
 * lambda / 90), applied to what the base record says the bots' clubs were.
 *
 * Where a fixture is a fixed seeded stream (Round 586's policy fixture, Round
 * 587's set piece batches, simTycoonAwayMatchdays S5), the prediction also
 * REPLAYS that harness's own roll stream (two rolls a minute, ours then theirs,
 * as playMinute draws them) under the candidate chances, so it predicts the
 * number the harness would print, not only its expectation. The replay is first
 * run under the BASE chance lines and must reproduce the base measurement, or the
 * script stops (exit 2).
 *
 * Title shares come from a Monte Carlo of whole seasons whose matches are drawn
 * from the same exact binomial scores, on the real league shapes, calendars and
 * offsets (the bundled lib's newLeague and matchdayFixtures), our match always at
 * our ground (contract section 8), rival fixtures with the home side at LAW.home.
 *
 * The candidate table follows design 3.5: SQUAD_POINTS (SP) from G, the ladder
 * rivalStrength[d] = round(SP x A_d) - ARRIVAL_EDGE (AE) forced strictly rising,
 * division 0's R0 from knob 4, and RIVAL_OFFSET_POINTS 500.
 *
 *   node scripts/predictTycoonScorelines.mjs --probe586 <probe586.json> [--quick]
 * Its name does not start with sim, so runAllSims skips it.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { bundleTs, freshTmp, mulberry } from './lib/tycoonBots.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = name => { const i = process.argv.indexOf(name); return i >= 0 ? process.argv[i + 1] : undefined; };
const QUICK = process.argv.includes('--quick');
const BASE = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/data/tycoonScorelineBaseline.json'), 'utf8'));
const tmp = freshTmp('tycoon-predict');
const LW = await bundleTs(ROOT, path.join(ROOT, 'src/lib/season/law.ts'), tmp, 'law');
const T = await bundleTs(ROOT, path.join(ROOT, 'src/lib/stadiumTycoon.ts'), tmp, 'lib');
const L = await bundleTs(ROOT, path.join(ROOT, 'src/lib/leagueCore.ts'), tmp, 'core');
const { LAW, goalLambda } = LW;
const OFF = 500;
const pct = x => (100 * x).toFixed(1);
const f2 = x => (x === null || x === undefined || !Number.isFinite(x) ? 'n/a' : x.toFixed(2));
const median = xs => { const v = xs.filter(Number.isFinite).sort((a, b) => a - b); return v.length ? v[Math.floor(v.length / 2)] : null; };
const out = {};

/* ---------- A. the law, exact binomial ---------- */
const pmfCache = new Map();
function pmf(p) {
  const key = p.toPrecision(15);
  if (pmfCache.has(key)) return pmfCache.get(key);
  const a = new Array(91).fill(0);
  if (p <= 0) a[0] = 1;
  else if (p >= 1) a[90] = 1;
  else { a[0] = Math.pow(1 - p, 90); for (let k = 1; k <= 90; k += 1) a[k] = a[k - 1] * ((91 - k) / k) * (p / (1 - p)); }
  pmfCache.set(key, a);
  return a;
}
/** Our match at our ground: gap in law points, f the first team edge. */
function lambdas(gap, f = 0) { return [goalLambda(gap, LAW.home), goalLambda(-gap, LAW.away) * (1 - f)]; }
function result(lu, lt) {
  const a = pmf(lu / 90); const b = pmf(lt / 90);
  let w = 0; let d = 0; let cb = 0;
  for (let k = 0; k <= 90; k += 1) { d += a[k] * b[k]; w += a[k] * cb; cb += b[k]; }
  return { w, d, l: 1 - w - d, goals: lu + lt, lu, lt };
}
const matchAt = (gap, f = 0) => result(...lambdas(gap, f));
console.log('A) The law, exact binomial over 90 one roll minutes (brief 3.1 table recomputed)');
console.log('   gap   ours  theirs   win%  draw%  loss%  goals');
for (const g of [-10, 0, 4, 6, 8, 10, 12, 14, 20, 50]) {
  const r = matchAt(g);
  console.log(`   ${String(g).padStart(3)}  ${r.lu.toFixed(2)}   ${r.lt.toFixed(2)}   ${pct(r.w).padStart(5)}  ${pct(r.d).padStart(5)}  ${pct(r.l).padStart(5)}  ${r.goals.toFixed(2)}`);
}
const ceil0 = result(LAW.max, LAW.min * (1 - 0.39)).w; const ceilZero = 1 - Math.pow(1 - LAW.max / 90, 90);
console.log(`   never 99: at the clamp with f 0.39 a match is won ${pct(ceil0)}%; even a rival who never scores loses only ${pct(ceilZero)}% (critic item 1: our clamp bounds it)`);
out.law = { ceilingF039: ceil0, ceilingRivalZero: ceilZero };

/* ---------- B. the candidate tables of design 3.5 ---------- */
const K = BASE.knobs.cal;
const AE_GRID = [-2, 0, 2, 4, 6, 8];
const round05 = x => Math.round(Math.round(x / 0.05) * 0.05 * 100) / 100;
console.log('\nB) Knob 1, SQUAD_POINTS = 6 / G rounded to 0.05 (G at 60 minutes unless 120 differs by more than half; calibration seeds 1 to 20)');
const SPS = [];
for (const v of ['overinvest', ...Object.keys(K.Gvariants ?? {})]) {
  const g = v === 'overinvest' ? K.G : K.Gvariants[v];
  const useG = g[60] > 0 && Math.abs(g[120] - g[60]) > g[60] / 2 ? g[120] : g[60];
  const sp = useG > 0 ? round05(6 / useG) : null;
  console.log(`   ${v.padEnd(10)} G 30/60/120 = ${g[30]} / ${g[60]} / ${g[120]} -> ${sp === null ? 'undefined (G is not positive)' : `SP ${sp}`}`);
  if (sp !== null) SPS.push({ from: v, G: useG, sp });
}
out.sp = SPS;
const A = d => K.A[d].median;
console.log(`   A_1 to A_9 (pace's Squad on the tick it went up): ${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(A).join(' ')}; S5 ${K.S5}`);
/** rivalStrength[d] for d = 1 to 9, forced strictly rising from r0. */
function ladder(sp, ae, r0) {
  const r = [r0];
  for (let d = 1; d <= 9; d += 1) { let x = Math.round(sp * A(d)) - ae; if (x <= r[d - 1]) x = r[d - 1] + 1; r.push(x); }
  return r;
}

/* ---------- C. whole seasons on the real league shapes ---------- */
const cdfCache = new Map();
function cdf(lambda) {
  const key = lambda.toPrecision(15);
  let c = cdfCache.get(key);
  if (!c) { const a = pmf(lambda / 90); c = new Float64Array(91); let s = 0; for (let k = 0; k <= 90; k += 1) { s += a[k]; c[k] = s; } cdfCache.set(key, c); }
  return c;
}
function draw(lambda, rnd) { const c = cdf(lambda); const u = rnd(); let k = 0; while (k < 90 && u >= c[k]) k += 1; return k; }
const leagueCache = new Map();
function leagueOf(division, season) {
  const key = `${division}|${season}`;
  if (!leagueCache.has(key)) {
    const lg = T.newLeague(0, division, season);
    const days = Array.from({ length: T.leagueShape(division).matchdays }, (_, m) => T.matchdayFixtures({ ...lg, matchday: m }));
    leagueCache.set(key, { lg, days });
  }
  return leagueCache.get(key);
}
function rec(c, gf, ga) { c.gf += gf; c.ga += ga; if (gf > ga) { c.w += 1; c.pts += 3; } else if (gf === ga) { c.d += 1; c.pts += 1; } else c.l += 1; }
/** One season. us(m) is our strength in law points on matchday m, R the
 *  division's rival strength, f the first team edge. True when we win it. */
function seasonOnce(division, season, rnd, us, R, f = 0) {
  const { lg, days } = leagueOf(division, season);
  const clubs = lg.clubs.map(c => ({ ...c }));
  const str = i => R + clubs[i].offset * OFF;
  days.forEach((fixtures, m) => {
    for (const [h, a] of fixtures) {
      if (h === 0 || a === 0) {
        const o = h === 0 ? a : h;
        const [lu, lt] = lambdas(us(m) - str(o), f);
        const gf = draw(lu, rnd); const ga = draw(lt, rnd);
        rec(clubs[0], gf, ga); rec(clubs[o], ga, gf);
      } else {
        const gh = str(h) - str(a);
        const hg = draw(goalLambda(gh, LAW.home), rnd); const ag = draw(goalLambda(-gh, LAW.away), rnd);
        rec(clubs[h], hg, ag); rec(clubs[a], ag, hg);
      }
    }
  });
  return T.leagueStandings({ ...lg, clubs })[0] === clubs[0];
}
function titleShare(division, us, R, n, seed, f = 0) {
  const rnd = mulberry(seed);
  let t = 0;
  for (let k = 0; k < n; k += 1) if (seasonOnce(division, k % 7, rnd, us, R, f)) t += 1;
  return t / n;
}
const SEASONS_PER_CELL = QUICK ? 600 : 3000;
console.log(`\nC) Title share per season by our gap to the average rival (Monte Carlo, ${SEASONS_PER_CELL} seasons a cell, real shapes and offsets)`);
console.log('   gap   6 clubs one leg (div 0 to 2)   8 clubs two legs (3 to 5)   10 clubs two legs (6 to 9)');
out.titleTable = {};
for (const g of [0, 4, 8, 12, 14]) {
  const row = [0, 3, 6].map(d => titleShare(d, () => g, 0, SEASONS_PER_CELL, 1532 + g * 7 + d));
  out.titleTable[g] = row;
  console.log(`   ${String(g).padStart(3)}   ${row.map(x => x.toFixed(2).padStart(26)).join('')}`);
}
const titleGrid = new Map();
/** Title share at a constant gap, from a cached grid at whole points. */
function titleAt(division, gap) {
  const shape = division <= 2 ? 0 : division <= 5 ? 3 : 6;
  const g0 = Math.max(-30, Math.min(60, Math.floor(gap)));
  const at = g => { const k = `${shape}|${g}`; if (!titleGrid.has(k)) titleGrid.set(k, titleShare(shape, () => g, 0, QUICK ? 300 : 1500, 7000 + shape * 211 + g)); return titleGrid.get(k); };
  const t = Math.max(0, Math.min(1, gap - g0));
  return at(g0) * (1 - t) + at(g0 + 1) * t;
}
/** Title share in one fixed league (division, season): the league a fixture meets. */
function titleShareFixed(division, season, us, R, n, seed, f = 0) {
  const rnd = mulberry(seed);
  let t = 0;
  for (let k = 0; k < n; k += 1) if (seasonOnce(division, season, rnd, us, R, f)) t += 1;
  return t / n;
}
const binomPmf = (n, p) => { const a = new Array(n + 1).fill(0); a[0] = Math.pow(1 - p, n); for (let k = 1; k <= n; k += 1) a[k] = p >= 1 ? (k === n ? 1 : 0) : a[k - 1] * ((n - k + 1) / k) * (p / (1 - p)); if (p >= 1) { a.fill(0); a[n] = 1; } return a; };
const atLeast = (n, p, k) => binomPmf(n, p).slice(k).reduce((x, y) => x + y, 0);
const atMost = (n, p, k) => binomPmf(n, p).slice(0, k + 1).reduce((x, y) => x + y, 0);
/** P(X - Y >= k) for X ~ Bin(n, p), Y ~ Bin(n, q), independent. */
function diffAtLeast(n, p, q, k) { const a = binomPmf(n, p); const b = binomPmf(n, q); let s = 0; for (let x = 0; x <= n; x += 1) for (let y = 0; y <= n; y += 1) if (x - y >= k) s += a[x] * b[y]; return s; }

/* ---------- D. knob 4: division 0's rival strength R0, its feasible interval ---------- */
/* Season one, matchday by matchday: the median over all 40 pace seeds of the
   Squad the chances read in each of the first five matches (base record `early`). */
const early = m => median(BASE.policies.pace.map(r => (r.early?.[m] && r.early[m][1] === 0 ? r.early[m][2] : null)));
const SEASON1 = [0, 1, 2, 3, 4].map(early);
console.log(`\nD) Knob 4. pace's Squad in season one, match by match (median of 40 seeds): ${SEASON1.map(x => x.toFixed(1)).join(', ')}`);
const N4 = QUICK ? 600 : 3000;
out.r0 = {};
for (const { from, sp } of SPS) {
  const start = Math.round(sp * K.S5) - 14;
  console.log(`   SP ${sp} (${from}): the recipe's start R0 = round(SP x S5) - 14 = ${start}`);
  console.log('     R0 | season one title (i)  P(6+ of 10) | sec3 Sq30  Sq0   P(green)  strict | sec9 Sq3 P(green)  Sq6 P(green)');
  const rows = [];
  const line = row => `     ${String(row.r0).padStart(3)} | ${row.p1.toFixed(2).padStart(10)}        ${row.g4.toFixed(3)}    | ${row.p30.toFixed(2)}  ${row.p0.toFixed(2)}  ${row.g3.toFixed(3)}    ${row.strict ? 'yes' : 'no '}   | ${row.p3.toFixed(2)}  ${row.g9a.toFixed(3)}    ${row.p6.toFixed(2)}  ${row.g9b.toFixed(3)}`;
  for (let r0 = start - 30; r0 <= start + 16; r0 += 1) {
    const p1 = titleShareFixed(0, 0, m => sp * SEASON1[m], r0, N4, 41 + r0);
    const p30 = titleShareFixed(0, 0, () => sp * 30, r0, N4, 977 + r0);
    const p0 = titleShareFixed(0, 0, () => 0, r0, N4, 1977 + r0);
    const p3 = titleShare(0, () => sp * 3, r0, N4, 2977 + r0);
    const p6 = titleShare(0, () => sp * 6, r0, N4, 3977 + r0);
    const g4 = atLeast(10, p1, 6);
    const g3 = diffAtLeast(40, p30, p0, 14);
    const strict = p30 - p0 >= 0.35 + 2 * Math.sqrt((p30 * (1 - p30) + p0 * (1 - p0)) / 40);
    const g9a = atMost(30, Math.pow(1 - p3, 17), 3); const g9b = atMost(30, Math.pow(1 - p6, 17), 3);
    const row = { r0, p1, g4, p30, p0, g3, strict, p3, g9a, p6, g9b };
    rows.push(row);
  }
  const ok = (row, useStrict) => row.p1 >= 0.75 && row.g4 >= 0.9 && row.g3 >= 0.95 && (!useStrict || row.strict) && row.g9a >= 0.95 && row.g9b >= 0.95;
  const span = useStrict => { const v = rows.filter(r => ok(r, useStrict)).map(r => r.r0); return v.length ? [Math.min(...v), Math.max(...v)] : null; };
  const relaxed = span(false);
  const lo = Math.min(start, relaxed ? relaxed[0] : start) - 3; const hi = Math.max(start, relaxed ? relaxed[1] : start) + 3;
  for (const row of rows) if (row.r0 >= lo && row.r0 <= hi) console.log(line(row) + (row.r0 === start ? '   <- recipe start' : ''));
  out.r0[sp] = { start, strict: span(true), relaxed: span(false), rows: rows.map(r => [r.r0, r.p1, r.g4, r.p30, r.p0, r.g3, r.strict, r.p3, r.g9a, r.p6, r.g9b].map(x => (typeof x === 'number' ? Math.round(x * 1e4) / 1e4 : x))) };
  console.log(`     feasible R0 (season one share >= 0.75 and P(6+ of 10) >= 0.9; sec3 P(green) >= 0.95; sec9 P(green) >= 0.95 both): with the 2 SE term ${JSON.stringify(span(true))}, without it ${JSON.stringify(span(false))}`);
}
/** The R0 the later parts read: the recipe's start, clamped into the relaxed interval. */
const r0For = sp => { const r = out.r0[sp]; return r.relaxed ? Math.max(r.relaxed[0], Math.min(r.relaxed[1], r.start)) : r.start; };

/* ---------- E. the fixed fixtures ---------- */
/** A base state whose current opponent carries `offset`: the base chance lines
 *  are read off the bundled lib itself, never retyped here. */
const stateCache = new Map();
function stateWith(division, squad, offset, matchNo = 0, baseMatchNo = 0) {
  const key = `${division}|${squad}|${offset}|${matchNo}|${baseMatchNo}`;
  if (!stateCache.has(key)) stateCache.set(key, stateWithFresh(division, squad, offset, matchNo, baseMatchNo));
  return stateCache.get(key);
}
function stateWithFresh(division, squad, offset, matchNo, baseMatchNo) {
  const s = T.newTycoon(0);
  const lg = T.newLeague(0, division, 0, undefined, baseMatchNo);
  const clubs = lg.clubs.map(c => ({ ...c }));
  clubs[T.yourOpponentIndex(lg)].offset = offset;
  return { ...s, levels: { ...s.levels, squad }, league: { ...lg, clubs }, matchNo };
}
const headU = gap => goalLambda(gap, LAW.home) / 90;
const headT = (gap, f = 0) => (goalLambda(-gap, LAW.away) * (1 - f)) / 90;
/** One watched match on a roll stream, two rolls a minute, ours then theirs. */
function playOn(roll, pu, pt) { let gf = 0; let ga = 0; for (let m = 0; m < 90; m += 1) { if (roll() < pu) gf += 1; if (roll() < pt) ga += 1; } return gf > ga ? 'w' : gf === ga ? 'd' : 'l'; }
const meanSe = xs => { const n = xs.length; const m = xs.reduce((a, b) => a + b, 0) / n; const sd = Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / Math.max(1, n - 1)); return { mean: m, se: sd / Math.sqrt(n) }; };
let replayBroken = false;
console.log('\nE) The fixed fixtures (gap = our strength - the division\'s rival strength - the opponent offset x 500). R0 for the ladder: the recipe start clamped into the relaxed interval.');
out.fixtures = {};

/* E1. Round 586's policy fixture: Squad 40, division 3, opponents from match 70,
   ten 14 match seasons per arm on rng(seed), first team edge per match from the probe. */
const P586 = arg('--probe586');
const probe = P586 && fs.existsSync(P586) ? JSON.parse(fs.readFileSync(P586, 'utf8')) : null;
function run586(rows, pu, pt) {
  return rows.map(r => {
    const wins = {};
    for (const arm of ['sell', 'hold']) { const roll = mulberry(r.seed); wins[arm] = r[arm].filter(([ok, f]) => playOn(roll, pu(ok), pt(ok, f)) === 'w').length; }
    return wins;
  });
}
if (!probe) console.log('   E1 586: no --probe586 file given, skipped');
else {
  const baseU = ok => T.goalChancePerMin(stateWith(3, 40, ok / 1e5, 70, 70));
  const baseT = (ok, f) => T.oppChancePerMin(stateWith(3, 40, ok / 1e5, 70, 70), f);
  for (const set of ['calibration', 'holdout']) {
    const got = run586(probe[set].rows, baseU, baseT);
    const sell = meanSe(got.map(g => g.sell)).mean; const hold = meanSe(got.map(g => g.hold)).mean;
    const off = Math.abs(sell - probe[set].sellWins) + Math.abs(hold - probe[set].holdWins);
    console.log(`   E1 586 replay under the BASE lines, ${set}: sell ${sell} hold ${hold} against the probe's ${probe[set].sellWins} and ${probe[set].holdWins} (first team edge averaged per match; off by ${off.toFixed(4)})`);
    if (off > 0.25) replayBroken = true;
  }
  out.fixtures.p586 = [];
  console.log('   E1 586 under the law (rival lambda x (1 - f)): SP AE | R3 gap | cal sell hold effect -> floor (half) | holdout gain +- SE | clears floor | gain > 2 SE');
  console.log('     (squad 40 is the committed fixture; "par" and "par+6" are what the fixture would read re-anchored to division 3, Squad round(R3 / SP) and that plus ceil(6 / SP) levels)');
  for (const { sp } of SPS) for (const ae of AE_GRID) {
    const R3 = ladder(sp, ae, r0For(sp))[3];
    const par = Math.round(R3 / sp);
    for (const [label, squad] of [['40', 40], ['par', par], ['par+6', par + Math.ceil(6 / sp)]]) {
      const gapOf = ok => squad * sp - R3 - (ok / 1e5) * OFF;
      const cal = run586(probe.calibration.rows, ok => headU(gapOf(ok)), (ok, f) => headT(gapOf(ok), f));
      const hol = run586(probe.holdout.rows, ok => headU(gapOf(ok)), (ok, f) => headT(gapOf(ok), f));
      const ce = meanSe(cal.map(g => g.hold - g.sell)); const he = meanSe(hol.map(g => g.hold - g.sell));
      const sell = meanSe(cal.map(g => g.sell)).mean; const hold = meanSe(cal.map(g => g.hold)).mean;
      const floor = ce.mean / 2;
      const row = { sp, ae, R3, squad, label, gap: squad * sp - R3, sell, hold, effect: ce.mean, floor, holdoutGain: he.mean, holdoutSe: he.se, clears: he.mean > floor, hardStopClear: he.mean > 2 * he.se };
      out.fixtures.p586.push(row);
      console.log(`     ${sp} ${String(ae).padStart(2)} ${label.padStart(5)}(Sq${squad}) | ${String(R3).padStart(3)} ${f2(row.gap).padStart(6)} | ${f2(sell)} ${f2(hold)} ${f2(ce.mean)} -> ${f2(floor)} | ${f2(he.mean)} +- ${f2(he.se)} | ${row.clears ? 'yes' : 'NO '} | ${row.hardStopClear ? 'yes' : 'NO (R2 HARD STOP)'}`);
    }
  }
}

/* E2. Round 587's set piece band: Squad 40 against newLeague(0, 3, 0, undefined,
   70)'s matchday 0 opponent, match k on mulberry32(k x 101). A perfect kicker
   adds one goal to an unchanged stream, so the uplift is the draw share. */
const comp = T.newLeague(0, 3, 0, undefined, 70);
const off587 = comp.clubs[T.yourOpponentIndex(comp)].offset;
function uplift(from, count, pu, pt) { let d = 0; for (let k = from; k < from + count; k += 1) if (playOn(L.mulberry32(k * 101), pu, pt) === 'd') d += 1; return d / count; }
{
  const st = stateWith(3, 40, off587, 70, 70);
  const b = [uplift(1, 2000, T.goalChancePerMin(st), T.oppChancePerMin(st)), uplift(2001, 2000, T.goalChancePerMin(st), T.oppChancePerMin(st)), uplift(4001, 2000, T.goalChancePerMin(st), T.oppChancePerMin(st))];
  console.log(`\n   E2 587 replay under the BASE lines: calibration ${b[0]} and ${b[1]} (the harness header: 0.1225 and 0.11), holdout ${b[2]}; opponent offset ${off587}`);
  if (Math.abs(b[0] - 0.1225) > 1e-9 || Math.abs(b[1] - 0.11) > 1e-9) replayBroken = true;
  out.fixtures.p587base = b;
}
out.fixtures.p587 = [];
console.log('   E2 587 under the law: SP AE squad | R3 gap | expected draw% | replayed cal1 cal2 -> band [0.5c, 1.5c] | holdout | inside');
for (const { sp } of SPS) for (const ae of AE_GRID) {
  const R3 = ladder(sp, ae, r0For(sp))[3];
  const par = Math.round(R3 / sp);
  for (const [label, squad] of [['40', 40], ['par', par], ['par+6', par + Math.ceil(6 / sp)]]) {
    const gap = squad * sp - R3 - off587 * OFF;
    const pu = headU(gap); const pt = headT(gap);
    const c1 = uplift(1, 2000, pu, pt); const c2 = uplift(2001, 2000, pu, pt); const h = uplift(4001, 2000, pu, pt);
    const c = (c1 + c2) / 2;
    const row = { sp, ae, R3, squad, label, gap, draw: matchAt(gap).d, c1, c2, band: [c / 2, (3 * c) / 2], holdout: h, inside: h >= c / 2 && h <= (3 * c) / 2, oldBandHolds: h >= 0.058125 && h <= 0.174375 };
    out.fixtures.p587.push(row);
    console.log(`     ${sp} ${String(ae).padStart(2)} ${label.padStart(5)}(Sq${squad}) | ${String(R3).padStart(3)} ${f2(gap).padStart(6)} | ${pct(row.draw)} | ${pct(c1)} ${pct(c2)} -> [${pct(c / 2)}, ${pct(1.5 * c)}] | ${pct(h)} | ${row.inside ? 'yes' : 'NO'}; old band [5.81, 17.44] ${row.oldBandHolds ? 'holds' : 'red'}`);
  }
}

/* E3. simTycoonAwayMatchdays S5: 60 clubs, division 3 + k % 7, rep k % 3, sixteen
   away matchdays asked from matchday 0 on mulberry(8800 + k). Fence: win share gap 0.5. */
const S5 = Array.from({ length: 60 }, (_, k) => {
  const division = 3 + (k % 7);
  const lg = T.newLeague(k % 3, division, 0);
  const n = Math.min(16, T.leagueShape(division).matchdays - 1);
  const offs = Array.from({ length: n }, (_, j) => lg.clubs[T.yourOpponentIndex({ ...lg, matchday: j })].offset);
  return { k, division, lg, offs };
});
function awayShare(pu, pt) {
  let w = 0; let all = 0;
  for (const c of S5) { const roll = mulberry(8800 + c.k); c.offs.forEach((off, j) => { if (playOn(roll, pu(c, off, j), pt(c, off, j)) === 'w') w += 1; all += 1; }); }
  return w / all;
}
{
  const st = (c, j, squad) => ({ ...T.newTycoon(0), levels: { ...T.newTycoon(0).levels, squad }, league: { ...c.lg, matchday: j }, matchNo: j, bestDivision: c.division });
  const strong = awayShare((c, off, j) => T.goalChancePerMin(st(c, j, 50)), (c, off, j) => T.oppChancePerMin(st(c, j, 50)));
  const weak = awayShare((c, off, j) => T.goalChancePerMin(st(c, j, 0)), (c, off, j) => T.oppChancePerMin(st(c, j, 0)));
  out.fixtures.awayBase = [strong, weak];
  console.log(`\n   E3 away S5 replay under the BASE lines: Squad 50 wins ${pct(strong)}%, Squad 0 ${pct(weak)}% (compare simTycoonAwayMatchdays S5's note on the same base)`);
}
out.fixtures.away = [];
console.log('   E3 away S5 under the law: SP AE | c = ceil(20 / SP) | re-anchored strong - weak (fence 0.5) | unanchored Squad 50 - Squad 0');
for (const { sp } of SPS) for (const ae of AE_GRID) {
  const R = ladder(sp, ae, r0For(sp));
  const c = Math.ceil(20 / sp);
  const share = squadOf => awayShare((cl, off) => headU(squadOf(cl) * sp - R[cl.division] - off * OFF), (cl, off) => headT(squadOf(cl) * sp - R[cl.division] - off * OFF));
  const par = cl => Math.round(R[cl.division] / sp);
  const strong = share(cl => par(cl) + c); const weak = share(cl => Math.max(0, par(cl) - c));
  const s50 = share(() => 50); const s0 = share(() => 0);
  out.fixtures.away.push({ sp, ae, c, strong, weak, s50, s0 });
  console.log(`     ${sp} ${String(ae).padStart(2)} | ${c} | ${pct(strong)} - ${pct(weak)} = ${(strong - weak).toFixed(3)} ${strong - weak >= 0.5 ? 'green' : 'RED'} | ${pct(s50)} - ${pct(s0)} = ${(s50 - s0).toFixed(3)} ${s50 - s0 >= 0.5 ? 'green' : 'RED'}`);
}

/* E4. tycoonPacks.test 205: Squad 200 at minute 88 of a fresh ground (the critic's
   item 22 read it as Squad 0), every roll 0.01: only we may score. */
{
  const lg = T.newLeague(0, 0, 0);
  const off = lg.clubs[T.yourOpponentIndex(lg)].offset;
  for (const { sp } of SPS) {
    const r0 = r0For(sp); const gap = 200 * sp - r0 - off * OFF;
    const ok = headU(gap) > 0.01 && headT(gap) <= 0.01;
    console.log(`   E4 tycoonPacks.test 205 at SP ${sp}, R0 ${r0}: gap ${f2(gap)}, our minute chance ${headU(gap).toFixed(4)}, theirs ${headT(gap).toFixed(4)}: ${ok ? 'only we score, the test holds' : 'RED'}`);
  }
}
if (replayBroken) { console.error('a replay under the base lines did not reproduce the base measurement, so the replays prove nothing'); process.exit(2); }

/* ---------- F. each policy's predicted matchGap and results per window (critic item 21) ---------- */
/* Priced on the BASE trajectories: where each bot's clubs were (division, Squad,
   opponent) when the timer won everything. Under the law a club climbs slower
   and meets each division with more Squad, so for a club that keeps pace these
   are the gaps of a club that climbs as fast as the base did: a floor on its gap
   while it is still climbing, not a measurement of the head. */
function priceHist(h, R, sp) {
  let n = 0; let gap = 0; let w = 0; let d = 0; let goals = 0;
  for (const [k, cnt] of Object.entries(h ?? {})) {
    const [div, sq, ok] = k.split('|').map(Number);
    const g = sq * sp - R[div] - (ok / 1e5) * OFF;
    const r = matchAt(g);
    n += cnt; gap += cnt * g; w += cnt * r.w; d += cnt * r.d; goals += cnt * r.goals;
  }
  return n ? { n, gap: gap / n, w: w / n, d: d / n, goals: goals / n } : null;
}
const merge = (...hs) => { const m = {}; for (const h of hs) for (const [k, v] of Object.entries(h ?? {})) m[k] = (m[k] ?? 0) + v; return m; };
const WIN = ['15-30', '30-60', '60-120'];
out.windows = [];
console.log('\nF) Predicted mean matchGap, win%, draw% and goals a match per window, calibration seeds, on the base trajectories');
console.log('   SP AE policy      | 15-120: gap  win% draw% goals | win% 15-30 30-60 60-120 | 120-240 (pace)');
const AE_PICK = {};
for (const { sp, from } of SPS) {
  let best = null;
  for (const ae of AE_GRID) {
    const R = ladder(sp, ae, r0For(sp));
    for (const policy of ['pace', 'overinvest', from, 'nosquad']) {
      const h = BASE.hist[policy]?.cal ?? {};
      const all = priceHist(merge(...WIN.map(w => h[w])), R, sp);
      if (!all) continue;
      const per = WIN.map(w => priceHist(h[w], R, sp));
      const late = policy === 'pace' ? priceHist(h['120-240'], R, sp) : null;
      out.windows.push({ sp, ae, policy, all, per, late });
      console.log(`   ${sp} ${String(ae).padStart(2)} ${policy.padEnd(10)} | ${f2(all.gap).padStart(6)} ${pct(all.w).padStart(5)} ${pct(all.d).padStart(5)} ${all.goals.toFixed(2)} | ${per.map(p => (p ? pct(p.w) : 'n/a').padStart(5)).join(' ')} | ${late ? `${f2(late.gap)} ${pct(late.w)}%` : ''}`);
      if (policy === 'pace' && (best === null || Math.abs(all.w - 0.65) < Math.abs(best.w - 0.65) - 1e-12)) best = { ae, w: all.w };
    }
  }
  AE_PICK[sp] = best.ae;
  console.log(`   SP ${sp}: knob 3 on the base trajectories picks AE ${best.ae} (pace ${pct(best.w)}% over 15 to 120, nearest 65, ties to the smaller AE, the harder ladder; critic item 18). Step 2a measures it on the head.`);
}
out.aePick = AE_PICK;
