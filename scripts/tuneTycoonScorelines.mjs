/**
 * Round 1532, step 2a: the TUNING RUN (brief-1532 design 3.5, section 0 R1, the
 * lead's step 1 rulings S1 to S3, critic items 8, 9, 18 and 21).
 *
 * The engine is not edited to tune it. The law and the bonuses (both together,
 * critic item 9, so the table is tuned on the economy that ships) are laid onto a
 * copy of src/lib/stadiumTycoon.ts in the OS temp folder by scripts/lib/tycoonLaw.mjs,
 * one candidate table at a time, and the bots of scripts/lib/tycoonBots.mjs play it
 * at the hook's cadence. Once the lib carries the law (step 2b on) the same script
 * only swaps the table, so it can re-measure the shipped engine.
 *
 * The recipe, in its fixed order:
 *   knob 1  SQUAD_POINTS 0.85, the lead's ruling S1 (6 / G of the over4 bot at 60
 *           minutes, rounded to 0.05; printed beside the base record's G).
 *   knob 2  rivalStrength[d] = round(SP x A_d) - ARRIVAL_EDGE for d 1 to 9, forced
 *           strictly rising, A_d from scripts/data/tycoonScorelineBaseline.json.
 *   knob 4  division 0's R0, set before knob 3, start 1 (ruling S2). Three
 *           constraints, each the harness's own fixture replayed on its own seeds:
 *           (i) simTycoonLeague section 4 green (median first promotion of its ten
 *           runs no later than the median first Sell up and than 14.7) and pace's
 *           season one title share at least 0.75 over the 40 bot seeds (critic item
 *           8); (ii) section 3's gap at least 0.35 plus 2 standard errors of its two
 *           40 season rates, and its neutral arm under half the gap; (iii) section 9
 *           stuck at most 3 of 30 for Squad 3 and for Squad 6. A failure moves R0 one
 *           point toward it (down for i and iii, up for ii), at most four moves; no
 *           value meeting all three is a STOP.
 *   knob 3  ARRIVAL_EDGE from -2, 0, 2, 4, 6, 8: pace's mean win share over minutes
 *           15 to 120 on calibration seeds 1 to 20, nearest 65, ties to the SMALLER
 *           edge (the harder ladder, critic item 18). Then the holdout seeds 21 to 40
 *           must land inside 55 to 75 with headroom of at least max(3 points, 3
 *           standard errors of the seed means) and overinvest (the over4 bot, ruling
 *           S1) inside 76 to 86, or STOP: no second grid, no hand edit of one row.
 * Knob 4's constraints are measured again on the final table. Everything else the
 * targets of brief 1.3 name is printed and recorded beside it.
 *
 *   node scripts/tuneTycoonScorelines.mjs [--force]   measure; writes
 *        scripts/data/tycoonScorelineTuning.json (refuses to overwrite without --force)
 *   node scripts/tuneTycoonScorelines.mjs --apply      lay the recorded table (and the
 *        law, if the lib does not carry it yet) into src/lib/stadiumTycoon.ts
 *   node scripts/tuneTycoonScorelines.mjs --smoke      a few short runs, written to the
 *        OS temp folder, never to scripts/data
 * Its name does not start with sim, so runAllSims skips it. Exit 0 measured and the
 * recipe held; 1 the recipe says STOP (the record is still written); 2 could not run.
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readDt, bundleTs, freshTmp, runBot, mulberry, MILESTONE_IDS, BADGE_IDS } from './lib/tycoonBots.mjs';
import { lawText, ladder, hasLaw } from './lib/tycoonLaw.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LIB = path.join(ROOT, 'src/lib/stadiumTycoon.ts');
const OUT_REL = 'scripts/data/tycoonScorelineTuning.json';
const SMOKE = process.argv.includes('--smoke');
const read = f => fs.readFileSync(f, 'utf8').split('\r\n').join('\n');
const abort = m => { console.error(m); process.exit(2); };

if (process.argv.includes('--apply')) {
  const rec = JSON.parse(read(path.join(ROOT, OUT_REL)));
  const table = rec.final?.table;
  if (!table) abort(`${OUT_REL} carries no final table to apply`);
  const before = read(LIB);
  const after = lawText(before, table);
  const eol = fs.readFileSync(LIB, 'utf8').includes('\r\n') ? '\r\n' : '\n';
  fs.writeFileSync(LIB, after.split('\n').join(eol));
  console.log(`applied SQUAD_POINTS ${table.sp} and rivalStrength ${table.r.join(' ')} to src/lib/stadiumTycoon.ts (${before === after ? 'no change' : 'changed'})`);
  process.exit(0);
}
const OUT = SMOKE ? path.join(freshTmp('tycoon-tune-smoke'), 'tycoonScorelineTuning.json') : path.join(ROOT, OUT_REL);
if (!SMOKE && fs.existsSync(OUT) && !process.argv.includes('--force')) abort(`${OUT_REL} exists; pass --force to measure again`);

const BASE = JSON.parse(read(path.join(ROOT, 'scripts/data/tycoonScorelineBaseline.json')));
const LEAGUE_BASE = JSON.parse(read(path.join(ROOT, 'scripts/data/tycoonLeagueBaseline.json')));
const DT = readDt(ROOT);
const K = BASE.knobs.cal;
const A = Object.fromEntries(Object.entries(K.A).map(([d, a]) => [d, a.median]));
const round05 = x => Math.round(Math.round(x / 0.05) * 0.05 * 100) / 100;
const G_OVER4 = K.Gvariants.over4[60];
const SP = 0.85;
const AE_GRID = SMOKE ? [2, 4] : [-2, 0, 2, 4, 6, 8];
const R0_START = 1;
const CAL = Array.from({ length: SMOKE ? 3 : 20 }, (_, i) => i + 1);
const HOLD = Array.from({ length: SMOKE ? 3 : 20 }, (_, i) => i + 21);
const MIN = { pace: SMOKE ? 40 : 240, other: SMOKE ? 30 : 120, sell: SMOKE ? 30 : 240 };

const tmp = freshTmp('tycoon-tune');
const libText = read(LIB);
const libCache = new Map();
async function libFor(table, extra = []) {
  const key = JSON.stringify([table, extra]);
  if (libCache.has(key)) return libCache.get(key);
  let text = lawText(libText, table);
  for (const [from, to] of extra) {
    if (text.split(from).length - 1 !== 1) abort(`the patched lib does not carry exactly one ${JSON.stringify(from)}`);
    text = text.replace(from, () => to);
  }
  const file = path.join(tmp, `lib-${libCache.size}.ts`);
  fs.writeFileSync(file, text);
  const T = await bundleTs(ROOT, file, tmp, `lib-${libCache.size}`);
  libCache.set(key, T);
  return T;
}
const tableAt = (ae, r0) => ({ sp: SP, r: ladder(SP, A, ae, r0) });

/* ---------- simTycoonLeague's own fixtures, replayed on its own seeds ---------- */
const pinned = (T, squad) => ({ ...T.newTycoon(0), fanbase: 800, levels: { ...T.newTycoon(0).levels, squad, stands: 20 } });
function playSeasons(T, state, roll, seasons, onTick, guardMinutes = 600) {
  let s = state; let ended = 0;
  for (let step = 0; step < Math.round((guardMinutes * 60) / DT) && ended < seasons; step += 1) {
    const prev = s; const r = T.tick(s, DT, roll); s = r.state;
    if (onTick && onTick(prev, r) === 'stop') break;
    ended += r.events.filter(e => e.kind === 'title' || e.kind === 'seasonEnd').length;
  }
  return { state: s, ended };
}
/** Section 3's titleRate, verbatim in effect. */
function titleRate(T, squad, seasons) {
  let titles = 0; let played = 0;
  for (let seed = 1; seed <= seasons; seed += 1) {
    const { state } = playSeasons(T, pinned(T, squad), mulberry(seed * 977 + squad), 1, (_p, r) => { if (r.events.some(e => e.kind === 'title')) titles += 1; });
    if (state.league.season > 0 || state.league.division > 0) played += 1;
  }
  return { rate: titles / Math.max(1, played), played };
}
/** Section 4's greedyPace (the pace bot's loop), also noting how season one ended. */
function paceStart(T, seed) {
  const roll = mulberry(seed); let s = T.newTycoon(0);
  let promotion = null; let sellUp = null; let seasonOne = null;
  const everyTwo = Math.round(2 / DT);
  for (let step = 0; step < Math.round((60 * 60) / DT); step += 1) {
    const r = T.tick(s, DT, roll); s = r.state;
    const t = ((step + 1) * DT) / 60;
    if (seasonOne === null) { const end = r.events.find(e => e.kind === 'title' || e.kind === 'seasonEnd'); if (end) seasonOne = end.kind === 'title'; }
    if (promotion === null && r.events.some(e => e.kind === 'promoted')) promotion = t;
    if (sellUp === null && T.canPrestige(s)) sellUp = t;
    if ((step + 1) % everyTwo === 0) {
      for (let i = 0; i < 6; i += 1) s = T.tap(s);
      for (let guard = 0; guard < 25; guard += 1) {
        const full = T.attendance(s) >= T.capacity(s) - 5;
        const options = T.TRACKS.filter(tr => T.canBuy(s, tr.id)).sort((a, b) => T.costOf(s, a.id) * (full && a.id === 'stands' ? 0.55 : 1) - T.costOf(s, b.id) * (full && b.id === 'stands' ? 0.55 : 1));
        if (!options.length) break;
        s = T.buy(s, options[0].id);
      }
    }
    if (promotion !== null && sellUp !== null && seasonOne !== null) break;
  }
  return { promotion: promotion ?? Infinity, sellUp: sellUp ?? Infinity, seasonOne: !!seasonOne };
}
const med = xs => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
const r3 = x => (Number.isFinite(x) ? Math.round(x * 1000) / 1000 : null);

async function knob4Measure(table) {
  const T = await libFor(table);
  const flat = await libFor(table, [["  return levelOf(s, 'squad') * SQUAD_POINTS;", '  return 0;']]);
  const starts = [...CAL, ...HOLD].map(seed => ({ seed, ...paceStart(T, seed) }));
  const ten = starts.filter(x => x.seed <= 10);
  const promo = med(ten.map(x => x.promotion)); const sell = med(ten.map(x => x.sellUp));
  const share = starts.filter(x => x.seasonOne).length / starts.length;
  const sec4 = promo <= sell && promo <= LEAGUE_BASE.medianFirstPromotionMin;
  const i = { ok: sec4 && share >= 0.75, sec4, promo: r3(promo), sell: r3(sell), promotionFirst: ten.filter(x => x.promotion <= x.sellUp).length,
    seasonOneShare: r3(share), seasonOneOf10: ten.filter(x => x.seasonOne).length, seasonOneOf20: starts.filter(x => x.seed <= 20 && x.seasonOne).length };
  const n = SMOKE ? 10 : 40;
  const hi = titleRate(T, 30, n); const lo = titleRate(T, 0, n); const nHi = titleRate(flat, 30, n); const nLo = titleRate(flat, 0, n);
  const gap = hi.rate - lo.rate; const se = Math.sqrt((hi.rate * (1 - hi.rate)) / hi.played + (lo.rate * (1 - lo.rate)) / lo.played);
  const neutral = nHi.rate - nLo.rate;
  const ii = { ok: gap >= 0.35 + 2 * se && Math.abs(neutral) < gap / 2, hi: r3(hi.rate), lo: r3(lo.rate), gap: r3(gap), se: r3(se), need: r3(0.35 + 2 * se), neutral: r3(neutral) };
  const stuck = {}; const when = {};
  for (const squad of [3, 6]) {
    stuck[squad] = 0; when[squad] = [];
    for (let seed = 1; seed <= (SMOKE ? 6 : 30); seed += 1) {
      let at = null; let step = 0;
      playSeasons(T, pinned(T, squad), mulberry(seed * 7919 + squad), 1000, (_p, r) => { step += 1; if (r.events.some(e => e.kind === 'promoted')) { at = (step * DT) / 60; return 'stop'; } return undefined; }, 180);
      if (at === null) stuck[squad] += 1; else when[squad].push(at);
    }
  }
  const iii = { ok: stuck[3] <= 3 && stuck[6] <= 3, stuck3: stuck[3], stuck6: stuck[6], median3: r3(when[3].length ? med(when[3]) : null), median6: r3(when[6].length ? med(when[6]) : null) };
  return { i, ii, iii };
}

async function knob4(ae, start) {
  let r0 = start; const tried = [];
  for (let move = 0; move <= 4; move += 1) {
    const m = await knob4Measure(tableAt(ae, r0));
    tried.push({ r0, ...m });
    console.log(`  knob 4 at R0 ${r0} (AE ${ae}): (i) ${m.i.ok ? 'ok' : 'FAILS'} sec4 promo ${m.i.promo} vs Sell up ${m.i.sell}, season one ${m.i.seasonOneShare} (${m.i.seasonOneOf10}/10, ${m.i.seasonOneOf20}/20); (ii) ${m.ii.ok ? 'ok' : 'FAILS'} ${m.ii.hi} - ${m.ii.lo} = ${m.ii.gap} need ${m.ii.need}, neutral ${m.ii.neutral}; (iii) ${m.iii.ok ? 'ok' : 'FAILS'} stuck ${m.iii.stuck3} and ${m.iii.stuck6} of 30`);
    const down = !m.i.ok || !m.iii.ok; const up = !m.ii.ok;
    if (!down && !up) return { r0, ok: true, tried };
    if (down && up) return { r0, ok: false, why: `R0 ${r0} fails both ways, so no value meets all three`, tried };
    r0 += up ? 1 : -1;
  }
  return { r0, ok: false, why: 'four moves did not reach a value that meets all three', tried };
}

/* ---------- the bots' numbers ---------- */
const meanSE = xs => { const v = xs.filter(Number.isFinite); const n = v.length; if (!n) return { mean: null, se: null, n }; const m = v.reduce((a, b) => a + b, 0) / n; const sd = n > 1 ? Math.sqrt(v.reduce((a, b) => a + (b - m) ** 2, 0) / (n - 1)) : 0; return { mean: m, se: sd / Math.sqrt(n), n }; };
const inWin = (run, a, b) => run.matches.filter(m => m.t >= a && m.t < b);
function results(runs, a, b) {
  const per = runs.map(run => { const ms = inWin(run, a, b); const n = ms.length || NaN; return {
    w: (100 * ms.filter(m => m.res === 'w').length) / n, d: (100 * ms.filter(m => m.res === 'd').length) / n,
    goals: ms.reduce((x, m) => x + m.gf + m.ga, 0) / n, gap: ms.some(m => m.gap !== null) ? ms.reduce((x, m) => x + m.gap, 0) / n : NaN,
    streak: ms.reduce((x, m) => x + Math.min(m.streak, 10), 0) / n, gemsHour: (ms.reduce((x, m) => x + m.gems, 0) * 60) / (b - a), matches: ms.length }; });
  const out = {};
  for (const k of ['w', 'd', 'goals', 'gap', 'streak', 'gemsHour', 'matches']) { const x = meanSE(per.map(p => p[k])); out[k] = { mean: r3(x.mean), se: r3(x.se) }; }
  return out;
}
function titleShare(runs, a, b) {
  const per = runs.map(run => { const ss = run.seasons.filter(x => x.t >= a && x.t < b); return ss.length ? ss.filter(x => x.title).length / ss.length : NaN; });
  const pooled = runs.reduce((x, run) => x + run.seasons.filter(s => s.t >= a && s.t < b && s.title).length, 0) / Math.max(1, runs.reduce((x, run) => x + run.seasons.filter(s => s.t >= a && s.t < b).length, 0));
  const m = meanSE(per);
  return { mean: r3(m.mean), se: r3(m.se), pooled: r3(pooled) };
}
const play = (T, policy, seeds, minutes) => seeds.map(seed => runBot(T, { policy, seed, minutes, dt: DT }));
const WINDOWS = [[15, 30], [30, 60], [60, 120], [120, 240]];

/* ---------- run the recipe ---------- */
const started = Date.now();
const secs = () => ((Date.now() - started) / 1000).toFixed(0);
const record = { note: 'Round 1532 step 2a: the tuning run of brief-1532 design 3.5 on the engine with the law and the bonuses, laid onto a temp copy by scripts/lib/tycoonLaw.mjs. Win, draw and goal figures are means over seeds of each seed\'s share in the window, with the standard error of those means.', capturedAt: new Date().toISOString().slice(0, 10) };
record.lib = hasLaw(libText) ? 'the lib already carries the law: the table was swapped in' : 'the engine before the law, patched in a temp copy';
record.commit = (() => { try { return execSync('git rev-parse HEAD', { cwd: ROOT, encoding: 'utf8' }).trim(); } catch { return null; } })();
record.dt = DT;
record.knob1 = { sp: SP, ruling: 'S1: overinvest is the over4 bot; SQUAD_POINTS 0.85', gOver4At60: G_OVER4, sixOverG: round05(6 / G_OVER4) };
record.knob2 = { A, formula: 'rivalStrength[d] = round(SP x A_d) - ARRIVAL_EDGE, forced strictly rising' };
console.log(`Round 1532 tuning at dt ${DT}: SQUAD_POINTS ${SP} (6 / G over4 ${G_OVER4} = ${round05(6 / G_OVER4)}); A_d ${Object.values(A).join(' ')}`);

console.log('knob 4 (division 0), measured at ARRIVAL_EDGE 4, the predictor\'s pick:');
const k4 = await knob4(4, R0_START);
record.knob4 = { start: R0_START, ...k4 };
let stop = k4.ok ? null : `knob 4: ${k4.why}`;
const R0 = k4.r0;
console.log(`  R0 = ${R0}${k4.ok ? '' : ` (STOP: ${k4.why})`} [${secs()} s]`);

console.log('knob 3 (ARRIVAL_EDGE), pace on calibration seeds, minutes 15 to 120:');
const grid = [];
for (const ae of AE_GRID) {
  const T = await libFor(tableAt(ae, R0));
  const runs = play(T, 'pace', CAL, MIN.other);
  const res = results(runs, 15, 120);
  grid.push({ ae, table: tableAt(ae, R0).r, win: res.w, draw: res.d, goals: res.goals, gap: res.gap });
  console.log(`  AE ${ae}: ${tableAt(ae, R0).r.join(' ')} -> win ${res.w.mean} (se ${res.w.se}), draw ${res.d.mean}, goals ${res.goals.mean}, gap ${res.gap.mean} [${secs()} s]`);
}
const pick = [...grid].sort((x, y) => Math.abs(x.win.mean - 65) - Math.abs(y.win.mean - 65) || x.ae - y.ae)[0].ae;
record.knob3 = { grid, pick, rule: 'nearest 65, ties to the smaller edge (the harder ladder)' };
const table = tableAt(pick, R0);
console.log(`  pick ARRIVAL_EDGE ${pick}: rivalStrength ${table.r.join(' ')}`);

/* ---------- the final table: knob 4 again, then every target of brief 1.3 ---------- */
console.log('the final table:');
const k4final = pick === 4 ? k4.tried[k4.tried.length - 1] : { r0: R0, ...(await knob4Measure(table)) };
if (pick !== 4) console.log(`  knob 4 again at the pick: (i) ${k4final.i.ok} season one ${k4final.i.seasonOneShare}, sec4 ${k4final.i.promo} vs ${k4final.i.sell}; (ii) ${k4final.ii.ok} gap ${k4final.ii.gap} need ${k4final.ii.need}; (iii) ${k4final.iii.ok} stuck ${k4final.iii.stuck3} and ${k4final.iii.stuck6}`);
const T = await libFor(table);
const runs = {};
for (const [policy, minutes] of [['pace', MIN.pace], ['over4', MIN.other], ['nosquad', MIN.other], ['paceSell', MIN.sell]]) {
  runs[policy] = { cal: play(T, policy, CAL, minutes), hold: play(T, policy, HOLD, minutes) };
  console.log(`  played ${policy} [${secs()} s]`);
}
const final = { table, R0, arrivalEdge: pick, knob4: k4final, policies: {} };
for (const [policy, sets] of Object.entries(runs)) {
  final.policies[policy] = {};
  for (const [set, rs] of Object.entries(sets)) {
    const minutes = rs[0].minutes;
    final.policies[policy][set] = {
      all: results(rs, 15, 120),
      windows: Object.fromEntries(WINDOWS.filter(([a, b]) => b <= minutes).map(([a, b]) => [`${a}-${b}`, results(rs, a, b)])),
      titles: minutes >= 240 ? titleShare(rs, 15, 240) : titleShare(rs, 15, minutes),
    };
  }
}
const P = final.policies;
const checks = [];
const check = (name, ok, detail, recipe = false) => { checks.push({ name, ok, detail, recipe }); console.log(`  ${ok ? 'ok  ' : 'MISS'} ${name}: ${detail}`); };
const hw = P.pace.hold.all.w; const room = Math.max(3, 3 * hw.se);
check('holdout pace wins 55 to 75 with headroom', hw.mean >= 55 + room && hw.mean <= 75 - room, `${hw.mean} (se ${hw.se}), headroom needed ${r3(room)}`, true);
for (const set of ['cal', 'hold']) {
  const o = P.over4[set].all.w.mean; const p = P.pace[set].all.w.mean;
  check(`${set} overinvest (over4) wins 76 to 86`, o >= 76 && o <= 86, `${o}`, set === 'hold');
  check(`${set} overinvest at least 4 above pace`, o - p >= 4, `${r3(o - p)}`);
  for (const [k, w] of Object.entries(P.pace[set].windows)) if (k !== '120-240') check(`${set} pace window ${k} inside 50 to 80`, w.w.mean >= 50 && w.w.mean <= 80, `${w.w.mean}`);
  for (const [k, w] of Object.entries(P.over4[set].windows)) check(`${set} overinvest window ${k} under 90`, w.w.mean < 90, `${w.w.mean}`);
  check(`${set} pace draws 15 to 27`, P.pace[set].all.d.mean >= 15 && P.pace[set].all.d.mean <= 27, `${P.pace[set].all.d.mean}`);
  check(`${set} pace goals 2.5 to 3.0`, P.pace[set].all.goals.mean >= 2.5 && P.pace[set].all.goals.mean <= 3.0, `${P.pace[set].all.goals.mean}`);
  check(`${set} pace titles a season 15 to 240 in 0.40 to 0.90`, P.pace[set].titles.mean >= 0.4 && P.pace[set].titles.mean <= 0.9, `${P.pace[set].titles.mean} (pooled ${P.pace[set].titles.pooled})`);
  check(`${set} nosquad clearly under pace`, P.pace[set].all.w.mean - P.nosquad[set].all.w.mean > 10, `pace ${P.pace[set].all.w.mean} nosquad ${P.nosquad[set].all.w.mean}`);
}
check('knob 4 holds on the final table', k4final.i.ok && k4final.ii.ok && k4final.iii.ok, `season one ${k4final.i.seasonOneShare}, sec4 ${k4final.i.promo} vs ${k4final.i.sell}, sec3 gap ${k4final.ii.gap} need ${k4final.ii.need}, sec9 ${k4final.iii.stuck3} and ${k4final.iii.stuck6}`, true);
final.checks = checks;
if (!stop && checks.some(c => c.recipe && !c.ok)) stop = `knob 3: ${checks.filter(c => c.recipe && !c.ok).map(c => c.name).join('; ')}`;

/* ---------- S8, the economy beside the base record (printed, no fence here) ---------- */
const medOrNull = xs => { const v = xs.map(x => (x === null || x === undefined ? Infinity : x)).sort((a, b) => a - b); const m = v[Math.floor(v.length / 2)]; return Number.isFinite(m) ? r3(m) : null; };
const baseCal = p => BASE.policies[p].filter(r => r.seed <= 20);
const econ = {};
for (const [policy, basePolicy] of [['pace', 'pace'], ['over4', 'over4'], ['nosquad', 'nosquad'], ['paceSell', 'paceSell']]) {
  const rs = runs[policy].cal;
  econ[policy] = {
    firstSellUp: { head: medOrNull(rs.map(r => r.sellUp)), base: medOrNull(baseCal(basePolicy).map(r => r.sellUp)) },
    income: Object.fromEntries([30, 60, 120].map(c => [c, { head: medOrNull(rs.map(r => r.checkpoints[c]?.income)), base: medOrNull(baseCal(basePolicy).map(r => r.checkpoints[c]?.income)) }])),
    squad: Object.fromEntries([15, 30, 60, 120].map(c => [c, { head: medOrNull(rs.map(r => r.checkpoints[c]?.sq)), base: medOrNull(baseCal(basePolicy).map(r => r.checkpoints[c]?.sq)) }])),
    division: Object.fromEntries([15, 30, 60, 120].map(c => [c, { head: medOrNull(rs.map(r => r.checkpoints[c]?.div)), base: medOrNull(baseCal(basePolicy).map(r => r.checkpoints[c]?.div)) }])),
    meanStreak: P[policy].cal.all.streak.mean,
    gemsHour: P[policy].cal.all.gemsHour.mean,
  };
}
econ.pace.firstPromotion = { head: medOrNull(runs.pace.cal.map(r => r.promotions[0]?.t)), base: K.firstPromotion.pace };
econ.pace.divisionMinutes = Object.fromEntries(Array.from({ length: 9 }, (_, i) => i + 1).map(d => [d, medOrNull(runs.pace.cal.map(r => r.promotions.find(p => p.div === d)?.t))]));
econ.pace.winBonusSecAt120 = { head: medOrNull(runs.pace.cal.map(r => { const w = r.winBonusSec.filter(([t]) => t <= 120); return w.length ? w[w.length - 1][1] : null; })), base: K.winBonusSecAt120 };
econ.paceSell.stars = [0, 1, 2].map(k => ({ head: medOrNull(runs.paceSell.cal.map(r => r.stars[k]?.t)), base: medOrNull(baseCal('paceSell').map(r => r.stars[k]?.[0])) }));
econ.pace.firsts = Object.fromEntries([...MILESTONE_IDS, ...BADGE_IDS].map(id => [id, { head: medOrNull(runs.pace.cal.map(r => r.firsts[id])), base: medOrNull(baseCal('pace').map(r => r.firsts[id])) }]));
final.economy = econ;
console.log('S8, the economy (calibration medians, head against base):');
console.log(`  pace first Sell up ${econ.pace.firstSellUp.head} (base ${econ.pace.firstSellUp.base}); first promotion ${econ.pace.firstPromotion.head} (base ${econ.pace.firstPromotion.base}); win bonus at 120 = ${econ.pace.winBonusSecAt120.head} s of income (base ${econ.pace.winBonusSecAt120.base})`);
console.log(`  pace income at 30 / 60 / 120: ${[30, 60, 120].map(c => `${econ.pace.income[c].head} (base ${econ.pace.income[c].base})`).join(' / ')}`);
console.log(`  pace Squad at 15 / 30 / 60 / 120: ${[15, 30, 60, 120].map(c => `${econ.pace.squad[c].head} (${econ.pace.squad[c].base})`).join(' / ')}; division ${[15, 30, 60, 120].map(c => `${econ.pace.division[c].head} (${econ.pace.division[c].base})`).join(' / ')}`);
console.log(`  pace minute of reaching divisions 1 to 9: ${Object.values(econ.pace.divisionMinutes).join(' ')}`);
console.log(`  mean capped streak: ${['pace', 'over4', 'nosquad'].map(p => `${p} ${econ[p].meanStreak}`).join(', ')}; gems an hour: ${['pace', 'over4', 'nosquad'].map(p => `${p} ${econ[p].gemsHour}`).join(', ')}`);
console.log(`  paceSell stars at ${econ.paceSell.stars.map(x => `${x.head} (${x.base})`).join(' / ')} minutes; first Sell up over4 ${econ.over4.firstSellUp.head} (${econ.over4.firstSellUp.base})`);
console.log(`  milestones and badges: ${Object.entries(econ.pace.firsts).map(([id, x]) => `${id} ${x.head ?? 'later'} (${x.base ?? 'later'})`).join(', ')}`);
console.log('  matchGap per window (critic item 21), calibration: ' + ['pace', 'over4', 'nosquad'].map(p => `${p} ${Object.entries(P[p].cal.windows).map(([k, w]) => `${k} ${w.gap.mean}`).join(', ')}`).join('; '));

record.final = final;
record.stop = stop;
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(record, null, 1) + '\n');
if (process.env.RC_OUT) fs.copyFileSync(OUT, path.join(process.env.RC_OUT, 'tycoonScorelineTuning.json'));
fs.rmSync(tmp, { recursive: true, force: true });
const misses = checks.filter(c => !c.ok);
console.log(`wrote ${SMOKE ? OUT : OUT_REL} in ${secs()} s`);
if (stop) { console.log(`tuneTycoonScorelines: STOP (${stop}); ${misses.length} target${misses.length === 1 ? '' : 's'} missed`); process.exit(1); }
if (misses.length) { console.log(`tuneTycoonScorelines: table chosen, ${misses.length} target${misses.length === 1 ? '' : 's'} missed: ${misses.map(c => c.name).join('; ')}`); process.exit(1); }
console.log(`tuneTycoonScorelines: table chosen (SQUAD_POINTS ${SP}, R0 ${R0}, ARRIVAL_EDGE ${pick}: ${table.r.join(' ')}), every target of brief 1.3 met`);
