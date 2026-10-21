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
  out.r0[sp] = { start, strict: span(true), relaxed: span(false), rows };
  console.log(`     feasible R0 (season one share >= 0.75 and P(6+ of 10) >= 0.9; sec3 P(green) >= 0.95; sec9 P(green) >= 0.95 both): with the 2 SE term ${JSON.stringify(span(true))}, without it ${JSON.stringify(span(false))}`);
}
