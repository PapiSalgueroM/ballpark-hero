/**
 * Round 1104 harness: NFL My Career tells the truth about football.
 *
 * WHAT IT HOLDS (each failure is tagged with its section, which the controls read):
 *   1   Seasons are as long as they really were: in the 2005 throwback every
 *       season through 2020 has at most 16 games and a healthy starter plays
 *       exactly 16; from 2021, and in every season of a 2026 career, it is 17.
 *       At least 200 season lines from 2021 on must be seen, or the check
 *       builds them (a career set to 2019 and played forward) and never
 *       passes on a count of zero.
 *   1b  A 16 game schedule does not cost a throwback career its awards. The
 *       award field was measured on 17 game seasons, so the engine scores a
 *       season on a full schedule pace. Over five seeds of 2,000 careers a
 *       position, against the 17 game arm of the same bundle:
 *         All-Pros a career within 25 percent of the 17 game arm's;
 *         MVP or DPOY a career within 0.008 of it;
 *         the Hall of Fame rate at least 0.75 of it.
 *       MEASURED 2026-10-08 on GitHub runners (requests r1104-fd and
 *       r1104-fz, the second on the tree with Round 1051's head 46229f9c
 *       merged), five seed sets (SIM_SEED 1, 6, 11, 16, 21), so 40 position
 *       cells of 10,000 careers an arm, 17 game arm -> now:
 *         All-Pros a career: 39 of the 40 cells within 3.0 percent, and one
 *           at 8.5 under (CB on seed 21, about 0.090 -> 0.082). Seed 1: QB
 *           0.079 -> 0.080, RB 0.091 -> 0.090, WR 0.140 -> 0.140, TE 0.080 ->
 *           0.082, LB 0.084 -> 0.082, CB 0.090 -> 0.091, EDGE 0.209 -> 0.206,
 *           K 0.241 -> 0.238. With the pace off (control nopace, seed 1): QB
 *           0.024, RB 0.036, WR 0.049, TE 0.026, LB 0.021, CB 0.028, EDGE
 *           0.084, K 0.086, so 60 to 75 percent under. The band sits at 25,
 *           in the middle of that gap: three times the widest healthy cell,
 *           well under half of the smallest drop. (It was first set at 10,
 *           from three seed sets whose widest cell read 2.8; the fourth and
 *           fifth sets put one cell at 8.5, too near a line at 10.)
 *         MVP or DPOY a career: every one of the 40 cells within 0.003 (EDGE
 *           on seed 1, 0.060 -> 0.057). nopace: QB 0.019 -> 0.004, LB 0.014 ->
 *           0.001, EDGE 0.060 -> 0.016. The band sits at 0.008.
 *         Hall percent: LOWER in seven positions on every seed set, and that
 *           is real, not noise: a throwback career's totals are a seventeenth
 *           short for sixteen years and the ballot reads totals. QB 27.0 ->
 *           23.8, 26.5 -> 22.9, 26.0 -> 22.7. Seed 1: RB 2.2 -> 1.9, WR 7.0 ->
 *           6.5, TE 5.7 -> 5.5, LB 6.3 -> 5.6, CB 4.7 -> 4.2, EDGE 12.2 -> 11.6.
 *           The kicker is the eighth: before Round 1051 took a kicker's field
 *           goals out of the ballot's pushes he read 5.5 -> 4.7, and since
 *           then 4.8 -> 4.7 (0.97 to 1.02 of the 17 game arm on the five
 *           sets). The lowest ratio of the 40 cells is 0.842 (CB, seed 21),
 *           then RB 0.860 (seed 1). So this line is a FLOOR that catches a
 *           collapse, never "no difference": nopace reads QB 0.80 of the 17
 *           game arm (caught by his awards), RB 0.33, WR 0.53, TE 0.66, LB
 *           0.48, CB 0.47, EDGE 0.54, K 0.37. The drop itself is printed in
 *           section 5 for Round 1051's owner and is not this round's to fix
 *           (the lead's ruling).
 *       The first cut drew its band from the run's own seed deviation at 300
 *       careers, which passed the quarterback's 3.3 point Hall drop inside a
 *       band about 3.4 wide. A band here is a fixed number now.
 *   2   Rookie pay is the draft slot. The table itself is held to its rules
 *       (32 first round rows a table, picks 1 to 32 once each, no total at or
 *       under zero, pay never rising with the pick down to the minimum; held
 *       rows counted and printed), every quick start is paid its slot in both
 *       eras, and no kicker is drafted before round four on either path to the
 *       draft.
 *       Its SOURCES (tag 2s, the lead's ruling of 2026-10-09): every figure in
 *       the table has a second source's total beside it, inside 2 percent. A
 *       figure with no second fails, marked or not. A later round end the
 *       sources do not settle is THIN: no figure at all, marked held, with a
 *       two sourced end on each side of it.
 *       Its THIN ENDS (tag 2t): each is paid on the straight line between the
 *       nearest two sourced picks, the line rebuilt in this harness from the
 *       two sourced figures alone and held to the dollar on all 192 slots of
 *       rounds two to seven, and no slot is paid the one source's estimate.
 *   3   Sacks come in halves on every new LB and EDGE season line.
 *   4   No receiver passes the record book: a 99 rated wide receiver's season
 *       is at or under 1,950 yards and 145 catches (the records are 1,964 and
 *       149) and a 99 rated tight end's is at or under 1,400 yards (the
 *       record is 1,416). The engine as found is printed beside it and must
 *       have passed a record, or the check proves nothing.
 *   5   MEASURED, asserted on nothing: numbers other rounds asked for.
 *
 * TWO ARMS, ONE BUNDLE. The engine is bundled once. The BASE arm is that
 * bundle with this round's rules patched out (17 games every year, no pace,
 * the old pay formula, tenths), which is the engine as the round found it.
 * The bundle is patched, never the source, and every patch proves its needle
 * is in the bundle exactly once before it runs.
 *
 * NEGATIVE CONTROLS, TRUTH_CONTROL=: each must turn its own section red and
 * no other; a control run exits 0 only then.
 *   seventeen  the ledger is ignored, 17 games every year      -> 1
 *   nopace     the award score reads the raw 16 game line       -> 1b
 *   oldpay     the old rookie pay formula                       -> 2
 *   kicker     kickers are drafted anywhere again               -> 2
 *   swap       two first round rows of the table trade places   -> 2
 *   onesource  pick 100 carries the one source's figure again,
 *              with no second and no mark                       -> 2s, 2t
 *   nosecond   the 32nd pick's row loses its second source      -> 2s
 *   tenths     sacks are rounded to tenths again                -> 3
 *   nocap      the three receiver caps are lifted               -> 4
 *
 * Seeds: SIM_SEED (default 1) starts the five seeds 1b reads. Sizes:
 * TRUTH_CAREERS careers a position for sections 1 and 3 (default 300; they
 * are hard rules with a floor on what must be seen, measured on seed 1:
 * 36,358 throwback seasons through 2020 and none over 16 games, 22,777
 * healthy starter seasons all exactly 16, 1,078 from 2021 all 17, 6,240 in
 * 2026 careers all 17; 19,605 LB and EDGE lines and none off a half, where
 * 79.4 percent were before). TRUTH_BAND_CAREERS careers a position and seed
 * for 1b (default 2,000, the size its bands were measured at: fewer makes a
 * run noisier, the bands do not move). Section 2c fails when more than a
 * quarter of the drafted kicker prospects sit on one pick: measured, the
 * busiest pick holds 72 of about 3,030, a tenth of that line. Section 4:
 * a 99 rated receiver passed a record in 8.9 percent of healthy seasons as
 * found, and in none now. The whole run takes about 80 seconds on a GitHub
 * runner. Nothing here reaches the network.
 *
 * Run: node scripts/simNflTruth.mjs
 */
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';
import { build } from 'esbuild';
import { pathToFileURL, fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.TRUTH_CONTROL || '';
const CONTROLS = { seventeen: ['1'], nopace: ['1b'], oldpay: ['2'], kicker: ['2'], swap: ['2'], onesource: ['2s', '2t'], nosecond: ['2s'], tenths: ['3'], nocap: ['4'] };
if (CONTROL && !CONTROLS[CONTROL]) {
  console.error(`TRUTH_CONTROL=${CONTROL} is not a control this harness knows (${Object.keys(CONTROLS).join(', ')})`);
  process.exit(1);
}
const SEED = Number(process.env.SIM_SEED || 1);
const CAREERS = Number(process.env.TRUTH_CAREERS || 300);
/* Section 1b has a size of its own: its bands were measured at 2,000 careers a position and seed. */
const BAND_CAREERS = Number(process.env.TRUTH_BAND_CAREERS || 2000);
const POSITIONS = ['QB', 'RB', 'WR', 'TE', 'LB', 'CB', 'EDGE', 'K'];

const failed = new Map();
const fail = (tag, msg) => {
  if (!failed.has(tag)) failed.set(tag, 0);
  if (failed.get(tag) < 4) console.error(`  FAIL [${tag}]: ${msg}`);
  failed.set(tag, failed.get(tag) + 1);
};
function mulberry(seed) {
  let s = seed | 0;
  return () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const store = new Map();
globalThis.localStorage ??= { getItem: k => (store.has(k) ? store.get(k) : null), setItem: (k, v) => { store.set(k, String(v)); }, removeItem: k => { store.delete(k); }, clear: () => store.clear() };
const mean = a => a.reduce((s, v) => s + v, 0) / Math.max(1, a.length);
const sd = a => { const m = mean(a); return Math.sqrt(mean(a.map(v => (v - m) ** 2))); };

/* ── the bundle and its arms ── */
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), `nfltruth-${process.pid}-`));
process.on('exit', () => { try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch { /* best effort */ } });
const ENTRY = [
  `export * as E from './src/lib/nflMyCareer.ts';`,
  `export { rookieDeal, nflSlot } from './src/lib/usCareerRookieDeal.ts';`,
  `export { NFL_ROOKIE_SCALE } from './src/data/nflRookieScale.ts';`,
  `export { stampHallCalibration } from './src/lib/careerHallOfFame.ts';`,
  `export { nflPreDraftDescriptor } from './src/lib/nflCareerPreDraft.ts';`,
  `export * as PD from './src/lib/careerPreDraft.ts';`,
].join('\n');
const rawOut = path.join(tmpDir, 'raw.mjs');
await build({ stdin: { contents: ENTRY, resolveDir: ROOT, loader: 'ts' }, bundle: true, format: 'esm', platform: 'node', outfile: rawOut, absWorkingDir: ROOT, logLevel: 'error', alias: { '@': path.join(ROOT, 'src') } });
const RAW = fs.readFileSync(rawOut, 'utf8');
function patch(text, needle, next, what) {
  const n = text.split(needle).length - 1;
  if (n !== 1) {
    console.error(`simNflTruth: the patch "${what}" needs its needle exactly once in the bundle and found it ${n} times, so it would prove nothing:\n  ${needle}`);
    process.exit(1);
  }
  return text.replace(needle, next);
}
const N_LEN = 'function nflSeasonLength(year) {';
const N_PACE = 'function nflAwardPaceLine(line, len) {';
const N_PAY = 'function nflRookieSalary(eraId, slot, pos) {';
const N_OFFSET = 'function nflPickOffset(pos) {';
const N_SACK_LB = '((form - 66) * 0.18 + rng() * 3) * g * 2) / 2';
const N_SACK_EDGE = '((form - 64) * 0.52 + rng() * 5) * g * 2) / 2';
const N_SACK_PO = '(3 + (pf - 62) * 0.35) * per * 2) / 2';
const N_ROW1 = 'row(1, 57271500, 58191906)';
const N_ROW2 = 'row(2, 54675584, 55550396)';
const N_ROW32 = 'row(32, 16783950, 16993244)';
/* The thin last pick of round three, as the bundle prints it. The control puts the one source's figure back on
   it with no mark, which is the table as it stood before the lead's ruling of 2026-10-09. */
const N_THIN100 = 'lastPick: 100, lastTotal: null, years: 4, held: "last" }';
const OLD_PAY = `${N_PAY}\n  { const era0 = nflEraById(eraId); const fr0 = slot > 0 && slot <= 32; return Math.max(0.3, Math.round((fr0 ? (33 - slot) * 0.9 + 4 : 1.2) * era0.moneyScale * 10) / 10); }`;
const P = {
  seventeen: t => patch(t, N_LEN, `${N_LEN}\n  return 17;`, 'seventeen'),
  nopace: t => patch(t, N_PACE, `${N_PACE}\n  return line;`, 'nopace'),
  oldpay: t => patch(t, N_PAY, OLD_PAY, 'oldpay'),
  kicker: t => patch(t, N_OFFSET, `${N_OFFSET}\n  return 0;`, 'kicker'),
  tenths: t => patch(patch(patch(t, N_SACK_LB, N_SACK_LB.replace('* 2) / 2', '* 10) / 10'), 'tenths LB'), N_SACK_EDGE, N_SACK_EDGE.replace('* 2) / 2', '* 10) / 10'), 'tenths EDGE'), N_SACK_PO, N_SACK_PO.replace('* 2) / 2', '* 10) / 10'), 'tenths playoffs'),
  nocap: t => patch(patch(patch(t, 'var NFL_WR_REC_CAP = 145;', 'var NFL_WR_REC_CAP = 1e9;', 'nocap catches'), 'var NFL_WR_YDS_CAP = 1950;', 'var NFL_WR_YDS_CAP = 1e9;', 'nocap WR yards'), 'var NFL_TE_YDS_CAP = 1400;', 'var NFL_TE_YDS_CAP = 1e9;', 'nocap TE yards'),
  onesource: t => patch(t, N_THIN100, 'lastPick: 100, lastTotal: 6726012, years: 4 }', 'onesource'),
  nosecond: t => patch(t, N_ROW32, 'row(32, 16783950)', 'nosecond'),
  swap: t => patch(patch(t, N_ROW1, 'row(1, 54675584, 55550396)', 'swap row 1'), N_ROW2, 'row(2, 57271500, 58191906)', 'swap row 2'),
};
/* Every needle is proved present on a plain run too, so a rename in src
   cannot quietly retire a control. */
for (const k of Object.keys(P)) P[k](RAW);
async function loadArm(name, patches) {
  let t = RAW;
  for (const k of patches) t = P[k](t);
  const file = path.join(tmpDir, `${name}.mjs`);
  fs.writeFileSync(file, t);
  return import(pathToFileURL(file).href);
}
const NEW = await loadArm('new', CONTROL ? [CONTROL] : []);
/* The engine as the round found it: 17 games every year, the old pay, kickers anywhere, tenths, no receiver cap. */
const BASE = await loadArm('base', ['seventeen', 'oldpay', 'kicker', 'tenths', 'nocap']);

/* ── one career off the engine: quick start, no summer deck ── */
function career(arm, pos, era, seed, i, startYear, see) {
  const E = arm.E;
  const rng = mulberry(seed * 100003 + i * 7919 + pos.charCodeAt(0) * 31 + (era === 'y2005' ? 17 : 0));
  const archs = E.ARCHETYPES[pos];
  const c = E.startCareer(`Truth ${i}`, pos, archs[i % archs.length], rng, null, era);
  if (startYear) c.year = startYear;
  let tq = E.rollTeamQuality(null, rng);
  E.nflAssignRole(c, tq, rng);
  for (let n = 0; n < 30; n += 1) {
    E.nflCampBattle(c, tq, rng);
    const starter = c.role !== 'backup';
    const { line, notes } = E.simSeason(c, tq, rng);
    if (see) see(line, { hurt: notes.some(x => x.startsWith('🚑')), starter });
    E.progress(c, rng);
    if (E.shouldRetire(c)) break;
    tq = E.rollTeamQuality(tq, rng);
  }
  c.retired = true;
  arm.stampHallCalibration(c);
  return c;
}
console.log(`simNflTruth: seed ${SEED}, ${CAREERS} careers a position and seed (${BAND_CAREERS} for the award bands of 1b)${CONTROL ? `, control ${CONTROL}` : ''}`);

/* ── 1: the schedule ── */
console.log('1) seasons are as long as they really were');
{
  let old = 0, oldOver = 0, oldHealthy = 0, oldHealthyOff = 0, late = 0, lateOff = 0, now = 0, nowOff = 0;
  const seeThrow = (line, f) => {
    if (line.year <= 2020) {
      old += 1;
      if (line.games > 16) { oldOver += 1; fail('1', `a ${line.year} season has ${line.games} games; the league played 16 through 2020`); }
      if (f.starter && !f.hurt) { oldHealthy += 1; if (line.games !== 16) { oldHealthyOff += 1; fail('1', `a healthy starter's ${line.year} season has ${line.games} games, not 16`); } }
    } else if (f.starter && !f.hurt) {
      late += 1;
      if (line.games !== 17) { lateOff += 1; fail('1', `a healthy starter's ${line.year} throwback season has ${line.games} games, not 17`); }
    }
  };
  for (const pos of POSITIONS) for (let i = 0; i < CAREERS; i += 1) career(NEW, pos, 'y2005', SEED, i, 0, seeThrow);
  /* Careers that reach 2021 are the long ones, so the count is topped up with careers that start in 2019. */
  let built = 0;
  for (let i = 0; late < 200 && i < 400; i += 1) { career(NEW, POSITIONS[i % 8], 'y2005', SEED, 90000 + i, 2019, seeThrow); built += 1; }
  for (const pos of POSITIONS) for (let i = 0; i < Math.ceil(CAREERS / 4); i += 1) {
    career(NEW, pos, 'now', SEED, i, 0, (line, f) => { if (f.starter && !f.hurt) { now += 1; if (line.games !== 17) { nowOff += 1; fail('1', `a healthy starter's ${line.year} season in a 2026 career has ${line.games} games, not 17`); } } });
  }
  if (old < 2000) fail('1', `only ${old} throwback seasons through 2020 were seen`);
  if (oldHealthy < 1000) fail('1', `only ${oldHealthy} healthy starter seasons through 2020 were seen`);
  if (late < 200) fail('1', `only ${late} healthy starter seasons from 2021 on were seen in the throwback, after building ${built} careers from 2019`);
  if (now < 500) fail('1', `only ${now} healthy starter seasons were seen in 2026 careers`);
  console.log(`   throwback through 2020: ${old} seasons, ${oldOver} over 16 games; ${oldHealthy} healthy starter seasons, ${oldHealthyOff} not exactly 16`);
  console.log(`   throwback from 2021: ${late} healthy starter seasons (${built} careers built from 2019 to reach them), ${lateOff} not exactly 17`);
  console.log(`   2026 careers: ${now} healthy starter seasons, ${nowOff} not exactly 17`);
}

/* ── 1b: the awards on a 16 game schedule, five seeds, against the 17 game arm ── */
console.log(`1b) a 16 game schedule does not cost a throwback career its awards (five seeds of ${BAND_CAREERS} careers, by position; 17 game arm -> now)`);
const awardsOf = (arm, pos, seed) => {
  let allPro = 0, big = 0, hall = 0, mine = 0, his = 0;
  for (let i = 0; i < BAND_CAREERS; i += 1) {
    const c = career(arm, pos, 'y2005', seed, i, 0, null);
    allPro += c.allPros; big += c.mvps; if (arm.E.legacyOf(c).hof) hall += 1;
    mine += c.rival?.myYears ?? 0; his += c.rival?.hisYears ?? 0;
  }
  return { allPro: allPro / BAND_CAREERS, big: big / BAND_CAREERS, hall: 100 * hall / BAND_CAREERS, h2h: 100 * mine / Math.max(1, mine + his) };
};
/* THE BANDS: fixed, and measured (the fix pass of 2026-10-08; the numbers are in the header). The first cut read
   "the 17 game arm's five seed mean plus or minus three seed standard deviations, never narrower than a
   floor", at 300 careers a seed. That is a no difference test whose band widens as the sample shrinks: at 300
   a quarterback's Hall band came out about 3.4 points wide and passed a real 3.3 point drop that 2,000 careers
   a seed shows on every seed set. So a band no longer comes from the run's own noise. Each is a fixed number
   with the measured room on both sides of it written down, and fewer careers make a run noisier, never
   easier. The Hall line is a FLOOR and not "no difference", because the difference is real (see the header). */
const BAND = { allPro: 0.25, big: 0.008, hallFloor: 0.75 };
const measured1b = {};
for (const pos of POSITIONS) {
  const seeds = [0, 1, 2, 3, 4].map(k => SEED + k);
  const base = seeds.map(s => awardsOf(BASE, pos, s));
  const next = seeds.map(s => awardsOf(NEW, pos, s));
  const m = measured1b[pos] = {};
  for (const k of ['allPro', 'big', 'hall']) {
    const b = base.map(x => x[k]); const n = next.map(x => x[k]);
    m[k] = { base: mean(b), sd: sd(b), now: mean(n) };
  }
  m.h2h = { base: mean(base.map(x => x.h2h)), now: mean(next.map(x => x.h2h)) };
  if (!(m.allPro.base > 0)) fail('1b', `${pos}: the 17 game arm won no All-Pro at all, so the band has nothing to stand on`);
  if (Math.abs(m.allPro.now - m.allPro.base) > BAND.allPro * m.allPro.base) fail('1b', `${pos} All-Pros a career: the throwback reads ${m.allPro.now.toFixed(3)} against the 17 game arm's ${m.allPro.base.toFixed(3)}, more than ${100 * BAND.allPro} percent apart`);
  if (Math.abs(m.big.now - m.big.base) > BAND.big) fail('1b', `${pos} MVP or DPOY a career: the throwback reads ${m.big.now.toFixed(3)} against the 17 game arm's ${m.big.base.toFixed(3)}, more than ${BAND.big} apart`);
  if (m.hall.now < BAND.hallFloor * m.hall.base) fail('1b', `${pos} Hall percent: the throwback reads ${m.hall.now.toFixed(1)} against the 17 game arm's ${m.hall.base.toFixed(1)}, under ${BAND.hallFloor} of it`);
  console.log(`   ${pos.padEnd(4)} All-Pros a career ${m.allPro.base.toFixed(3)} -> ${m.allPro.now.toFixed(3)} (${(100 * (m.allPro.now / m.allPro.base - 1)).toFixed(1)} percent); MVP or DPOY ${m.big.base.toFixed(3)} -> ${m.big.now.toFixed(3)}; Hall percent ${m.hall.base.toFixed(1)} -> ${m.hall.now.toFixed(1)} (${(m.hall.now / Math.max(1e-9, m.hall.base)).toFixed(3)} of it)`);
}

/* ── 2: rookie pay is the slot, and where kickers go ── */
console.log('2) rookie pay is the draft slot, and no kicker goes before round four');
{
  /* 2a: the table, held to its own rules. Tag 2 is its shape; tag 2s is its SOURCES (the lead's ruling of
     2026-10-09: no figure ships on one source). A figure is two sourced when the table carries a second
     source's total beside it and the two are inside 2 percent. A figure with no second beside it fails here
     whether or not it is marked. A later round end with no figure (null) is THIN and must be marked `held`. */
  const T = NEW.NFL_ROOKIE_SCALE;
  const apart = (a, b) => Math.abs(a - b) / Math.min(a, b);
  let heldRows = 0;
  for (const [era, scale] of Object.entries(T)) {
    if ('heldAs' in scale) { heldRows += 1; console.log(`   table ${era}: HELD as a whole, paid the ${scale.heldAs.of} slot times ${scale.heldAs.scale}`); continue; }
    const picks = scale.firstRound.map(r => r.pick).sort((a, b) => a - b);
    if (picks.length !== 32 || picks.some((p, i) => p !== i + 1)) fail('2', `table ${era}: round one must be picks 1 to 32 once each, found ${picks.length} rows`);
    let twoSourced = 0;
    for (const r of scale.firstRound) {
      if (!(r.total > 0) || !(r.years > 0)) fail('2', `table ${era} pick ${r.pick}: a total or a length at or under zero`);
      if (typeof r.second !== 'number' || r.held) { fail('2s', `table ${era} pick ${r.pick}: ONE SOURCED. Its figure (${r.total}) has no second source beside it, and round one has no rule for a thin pick, so it cannot ship`); continue; }
      if (r.second < r.total) fail('2', `table ${era} pick ${r.pick}: the stored total must be the lower of the two sources`);
      if (apart(r.second, r.total) > 0.02) { fail('2s', `table ${era} pick ${r.pick}: the two sources are more than 2 percent apart (${r.total} and ${r.second}): they disagree, so neither ships`); continue; }
      twoSourced += 1;
    }
    const rounds = scale.laterRounds.map(r => r.round);
    if (rounds.join(',') !== '2,3,4,5,6,7') fail('2', `table ${era}: later rounds must be 2 to 7 in order, found ${rounds.join(',')}`);
    /* Every pick from 33 on belongs to exactly one round: each round starts on the pick after the one before
       it ended (the real ends are pinned, two sourced, in src/test/usCareerRookieDeal.test.ts). */
    let endOfRoundBefore = 32;
    const sourcedEnds = [], thinEnds = [];
    for (const r of scale.laterRounds) {
      if (r.firstPick !== endOfRoundBefore + 1) fail('2', `table ${era} round ${r.round}: it starts at pick ${r.firstPick}, and the round before it ended at ${endOfRoundBefore}`);
      endOfRoundBefore = r.lastPick;
      if (r.firstPick >= r.lastPick || !(r.years > 0)) fail('2', `table ${era} round ${r.round}: picks out of order, or a length at or under zero`);
      for (const [end, pick, total, second] of [['first', r.firstPick, r.firstTotal, r.firstSecond], ['last', r.lastPick, r.lastTotal, r.lastSecond]]) {
        const marked = r.held === end || r.held === 'both';
        if (total === null || total === undefined) {
          thinEnds.push(pick); heldRows += 1;
          if (!marked) fail('2s', `table ${era} pick ${pick}: no figure and not marked held`);
          if (second !== undefined) fail('2s', `table ${era} pick ${pick}: a thin end still carries a second figure (${second})`);
          continue;
        }
        if (!(total > 0)) fail('2', `table ${era} pick ${pick}: a total at or under zero`);
        if (marked) fail('2s', `table ${era} pick ${pick}: marked held and still carries a figure (${total}). A thin end ships no figure`);
        if (typeof second !== 'number') { fail('2s', `table ${era} pick ${pick}: ONE SOURCED and not marked. Its figure (${total}) has no second source beside it`); continue; }
        if (apart(second, total) > 0.02) { fail('2s', `table ${era} pick ${pick}: the two sources are more than 2 percent apart (${total} and ${second}): they disagree, so neither ships`); continue; }
        sourcedEnds.push(pick);
      }
    }
    /* A thin end is paid on the line between the two sourced ends either side of it, so it needs one each side. */
    for (const q of thinEnds) {
      if (!sourcedEnds.some(p => p < q) || !sourcedEnds.some(p => p > q)) fail('2s', `table ${era} pick ${q}: thin, with no two sourced pick on both sides of it to draw the line between`);
    }
    if (!(scale.undrafted > 0)) fail('2', `table ${era}: the minimum is at or under zero`);
    console.log(`   table ${era} (${scale.season}): 32 first round rows, ${twoSourced} two sourced within 2 percent; later round ends two sourced within 2 percent: ${sourcedEnds.join(', ')}; THIN, no figure in the table: ${thinEnds.join(', ') || 'none'}`);
  }
  console.log(`   held values in the tables: ${heldRows}`);
  /* Pay never rises with the pick, from the first pick to the minimum. */
  for (const era of ['now', 'y2005']) {
    let prev = Infinity, rises = 0;
    for (let pick = 1; pick <= 224; pick += 1) { const s = NEW.rookieDeal('nfl', era, pick).salary; if (s > prev) { rises += 1; fail('2', `${era}: pick ${pick} is paid ${s}, more than pick ${pick - 1} on ${prev}`); } prev = s; }
    if (NEW.rookieDeal('nfl', era, 0).salary > prev) fail('2', `${era}: the undrafted minimum is over the last pick's pay`);
    console.log(`   ${era}: pick 1 ${NEW.rookieDeal('nfl', era, 1).salary}M a year, pick 32 ${NEW.rookieDeal('nfl', era, 32).salary}M, pick 33 ${NEW.rookieDeal('nfl', era, 33).salary}M, pick 97 ${NEW.rookieDeal('nfl', era, 97).salary}M, pick 224 ${NEW.rookieDeal('nfl', era, 224).salary}M, undrafted ${NEW.rookieDeal('nfl', era, 0).salary}M; ${rises} rises`);
  }
  /* 2d (tag 2t): a thin end is paid on the line, never an estimate. The line is rebuilt HERE from the table's two
     sourced ends alone (a figure with its second inside 2 percent), by real pick number, and every slot of
     rounds two to seven must be paid the point on it to the dollar. So a figure the table carries on one
     source cannot be what a slot is paid without this going red. Then each thin end's own slot is held
     against the one source's figure for it: the seven estimates are kept in this harness, and nowhere in src,
     only so the check can say no slot is paid one. The list is also the table's thin list, to the pick: a
     hold lifted or added has to touch this line too. Measured on the table of 2026-10-09: the line is 0.09M a
     year under the estimate at pick 100, 0.16M over it at pick 101 and 0.04M to 0.05M over it from 141 on. */
  {
    const ONE_SOURCE_ESTIMATES = { 100: 6726012, 101: 5707632, 141: 4955668, 181: 4724112, 182: 4714212, 216: 4590172, 217: 4564644 };
    const now = T.now;
    const sourced = [], thin = [];
    for (const r of now.laterRounds) {
      for (const [pick, total, second] of [[r.firstPick, r.firstTotal, r.firstSecond], [r.lastPick, r.lastTotal, r.lastSecond]]) {
        if (typeof total === 'number' && typeof second === 'number' && Math.abs(second - total) / Math.min(second, total) <= 0.02) sourced.push([pick, total]);
        else thin.push(pick);
      }
    }
    if (thin.join(',') !== Object.keys(ONE_SOURCE_ESTIMATES).join(',')) fail('2t', `the table's thin ends are [${thin.join(', ')}] and this check knows the estimates for [${Object.keys(ONE_SOURCE_ESTIMATES).join(', ')}]: a hold was lifted or added without this list`);
    const lineAt = q => {
      let a = null, b = null;
      for (const e of sourced) { if (e[0] <= q) a = e; if (e[0] >= q && b === null) b = e; }
      if (!a || !b) return null;
      return a[0] === b[0] ? a[1] : a[1] + (b[1] - a[1]) * (q - a[0]) / (b[0] - a[0]);
    };
    let slots = 0, offLine = 0;
    for (let pick = 33; pick <= 224; pick += 1) {
      const round = Math.ceil(pick / 32);
      const r = now.laterRounds.find(x => x.round === round);
      const q = r.firstPick + (r.lastPick - r.firstPick) * ((pick - (round - 1) * 32 - 1) / 31);
      const want = lineAt(q);
      const got = NEW.nflSlot(now, pick).perYear * r.years;
      slots += 1;
      if (want === null || Math.abs(got - want) > 1) { offLine += 1; fail('2t', `slot ${pick} (real pick ${q.toFixed(1)}) is paid ${Math.round(got)} over ${r.years} years, and the line between the two sourced picks either side of it says ${want === null ? 'nothing' : Math.round(want)}`); }
    }
    const said = [];
    for (const [key, estimate] of Object.entries(ONE_SOURCE_ESTIMATES)) {
      const q = Number(key);
      const r = now.laterRounds.find(x => x.firstPick === q || x.lastPick === q);
      if (!r) { fail('2t', `real pick ${q} is not the end of a round in the table`); continue; }
      const slot = (r.round - 1) * 32 + (r.firstPick === q ? 1 : 32);
      const got = NEW.nflSlot(now, slot).perYear * r.years;
      if (Math.abs(got - estimate) <= 1) fail('2t', `slot ${slot} (real pick ${q}) is paid ${Math.round(got)} over ${r.years} years: that is the one source's own figure, which the table may not ship`);
      said.push(`${q} ${Math.round(got)} (${got > estimate ? '+' : ''}${(100 * (got - estimate) / estimate).toFixed(1)} percent on the estimate)`);
    }
    if (slots !== 192) fail('2t', `only ${slots} later round slots were read, so the check is not whole`);
    console.log(`   thin ends: ${slots} slots of rounds two to seven read, ${offLine} off the line between two sourced picks; what the ${thin.length} thin ends are paid over four years: ${said.join('; ')}`);
  }
  /* 2b: every quick start is paid its slot; the base arm's first pick is printed beside it. */
  for (const era of ['now', 'y2005']) {
    let n = 0, off = 0, kickers = 0, early = 0, earliest = Infinity;
    const rng = mulberry(SEED * 7 + (era === 'now' ? 1 : 2));
    for (let i = 0; i < 20000; i += 1) {
      const pos = POSITIONS[i % 8];
      const c = NEW.E.startCareer('Pay', pos, NEW.E.ARCHETYPES[pos][i % NEW.E.ARCHETYPES[pos].length], rng, null, era);
      n += 1;
      if (c.salary !== NEW.rookieDeal('nfl', era, c.draftPick, c.pos).salary) { off += 1; fail('2', `${era} ${pos} pick ${c.draftPick} is paid ${c.salary}, the slot is ${NEW.rookieDeal('nfl', era, c.draftPick, c.pos).salary}`); }
      if (pos === 'K') { kickers += 1; earliest = Math.min(earliest, c.draftPick); if (c.draftPick < 97) { early += 1; fail('2', `${era}: a kicker was drafted at pick ${c.draftPick}, before round four`); } }
    }
    /* A draw sequence that makes the best prospect the engine can roll, so both arms hand back the first pick. */
    const top = arm => { const seq = [0.999, 0.5]; let k = 0; return arm.E.startCareer('Pay', 'QB', arm.E.ARCHETYPES.QB[0], () => (k < seq.length ? seq[k++] : 0), null, era); };
    const oldTop = top(BASE), newTop = top(NEW);
    console.log(`   ${era}: ${n} quick starts, ${off} not paid their slot; ${kickers} kickers, ${early} before pick 97 (earliest ${earliest}); pick ${newTop.draftPick} is paid ${newTop.salary}M a year (the old formula paid pick ${oldTop.draftPick} ${oldTop.salary}M)`);
  }
  /* 2c: the road to the draft. Kicker prospects through the real draft run. */
  for (const era of ['now', 'y2005']) {
    const desc = NEW.nflPreDraftDescriptor(era);
    let drafted = 0, early = 0, undrafted = 0; const at = new Map();
    for (let i = 0; i < 4000; i += 1) {
      const stock = 20 + ((i * 37) % 76);
      const start = NEW.PD.preDraftStart(desc, { seed: `truth-${era}-${SEED}-${i}`, routeId: desc.routes[0].id, rating: 70, pot: 82, pos: 'K' });
      const out = NEW.PD.preDraftRunDraft(desc, { ...start, stock, phase: 'draft' });
      const pick = out.draft?.pick ?? null;
      if (pick === null) { undrafted += 1; continue; }
      drafted += 1; at.set(pick, (at.get(pick) ?? 0) + 1);
      if (pick < 97) { early += 1; fail('2', `${era}: a kicker prospect with stock ${stock} was drafted at pick ${pick}`); }
    }
    const most = Math.max(0, ...at.values());
    if (drafted < 1000) fail('2', `${era}: only ${drafted} of 4000 kicker prospects were drafted, so the check is close to empty`);
    if (most > drafted / 4) fail('2', `${era}: ${most} of ${drafted} drafted kicker prospects sit on one pick, so the stock stopped mattering`);
    console.log(`   ${era} road to the draft: 4000 kicker prospects, ${drafted} drafted, ${undrafted} undrafted, ${early} before pick 97, the busiest pick holds ${most}`);
  }
}

/* ── 3: sacks in halves ── */
console.log('3) sacks come in halves');
{
  const count = arm => {
    let lines = 0, off = 0;
    for (const pos of ['LB', 'EDGE']) for (const era of ['now', 'y2005']) for (let i = 0; i < CAREERS; i += 1) {
      career(arm, pos, era, SEED, 50000 + i, 0, line => { lines += 1; if (Math.abs((line.sacks ?? 0) * 2 - Math.round((line.sacks ?? 0) * 2)) > 1e-9) off += 1; });
    }
    return { lines, off };
  };
  const now = count(NEW), base = count(BASE);
  if (now.lines < 2000) fail('3', `only ${now.lines} LB and EDGE season lines were seen`);
  if (now.off > 0) fail('3', `${now.off} of ${now.lines} LB and EDGE season lines carry sacks that are not a whole or a half`);
  if (base.off === 0) fail('3', 'the base arm had no tenths either, so this check proves nothing');
  console.log(`   ${now.lines} LB and EDGE season lines, ${now.off} not in halves; the engine as found: ${base.off} of ${base.lines} (${(100 * base.off / Math.max(1, base.lines)).toFixed(1)} percent)`);
}

/* ── a forced season: a starter of a given rating on an average team, healthy, 27 ── */
function forced(arm, pos, ovr, n, era, see) {
  const E = arm.E;
  const seedRng = mulberry(SEED * 977 + ovr * 13 + pos.charCodeAt(0));
  const c = E.startCareer('Forced', pos, E.ARCHETYPES[pos][0], seedRng, null, era);
  Object.assign(c, { ovr, pot: Math.max(c.pot, ovr), morale: 80, age: 27, health: 100, role: 'starter', rival: null });
  if (era === 'now') c.year = 2026;
  const snap = JSON.stringify(c);
  for (let i = 0; i < n; i += 1) {
    const cc = JSON.parse(snap);
    const { line, notes } = E.simSeason(cc, 78, seedRng);
    if (!notes.some(x => x.startsWith('🚑'))) see(line);
  }
}

/* ── 4: the record book ── */
console.log('4) no receiver passes the record book');
{
  const over = (arm, pos, test) => { let n = 0, bad = 0, top = 0; forced(arm, pos, 99, 4000, 'now', line => { n += 1; if (test(line)) bad += 1; top = Math.max(top, line.recYds ?? 0); }); return { n, bad, top }; };
  const wrNew = over(NEW, 'WR', l => (l.recYds ?? 0) > 1950 || (l.rec ?? 0) > 145);
  const wrOld = over(BASE, 'WR', l => (l.recYds ?? 0) > 1964 || (l.rec ?? 0) > 149);
  const teNew = over(NEW, 'TE', l => (l.recYds ?? 0) > 1400);
  const teOld = over(BASE, 'TE', l => (l.recYds ?? 0) > 1416);
  if (wrNew.n < 2000 || teNew.n < 2000) fail('4', `only ${wrNew.n} WR and ${teNew.n} TE healthy seasons at 99 were seen`);
  if (wrNew.bad > 0) fail('4', `${wrNew.bad} of ${wrNew.n} seasons by a 99 rated wide receiver passed 1,950 yards or 145 catches`);
  if (teNew.bad > 0) fail('4', `${teNew.bad} of ${teNew.n} seasons by a 99 rated tight end passed 1,400 yards`);
  if (wrOld.bad === 0) fail('4', 'the engine as found never passed the wide receiver records either, so this check proves nothing');
  console.log(`   WR at 99: ${wrNew.n} healthy seasons, ${wrNew.bad} over the cap; the engine as found passed a record (1,964 yards or 149 catches) in ${wrOld.bad} of ${wrOld.n} (${(100 * wrOld.bad / Math.max(1, wrOld.n)).toFixed(1)} percent)`);
  console.log(`   TE at 99: ${teNew.n} healthy seasons, ${teNew.bad} over the cap; the engine as found passed the record (1,416 yards) in ${teOld.bad} of ${teOld.n} (${(100 * teOld.bad / Math.max(1, teOld.n)).toFixed(1)} percent)`);
}

/* ── 5: MEASURED, asserted on nothing ── */
console.log('5) MEASURED, asserted on nothing');
{
  const meanOf = (pos, ovr, key) => { let s = 0, n = 0; forced(NEW, pos, ovr, 3000, 'now', line => { s += line[key] ?? 0; n += 1; }); return s / Math.max(1, n); };
  console.log(`   for a later round (not fixed here): a 95 rated linebacker averages ${meanOf('LB', 95, 'tackles').toFixed(0)} tackles a full season; a 95 rated tight end ${meanOf('TE', 95, 'recYds').toFixed(0)} yards`);
  console.log(`   a 95 rated starter's mean full season today (Round 1104 did not ship the means by rating band): QB ${meanOf('QB', 95, 'passYds').toFixed(0)} pass yards and ${meanOf('QB', 95, 'passTd').toFixed(1)} touchdowns; RB ${meanOf('RB', 95, 'rushYds').toFixed(0)} rush yards; EDGE ${meanOf('EDGE', 95, 'sacks').toFixed(1)} sacks; WR ${meanOf('WR', 95, 'recYds').toFixed(0)} yards`);
  for (const era of ['now', 'y2005']) {
    const row = POSITIONS.map(pos => { const c = NEW.E.startCareer('Pay', pos, NEW.E.ARCHETYPES[pos][0], mulberry(5), null, era); return `${pos} ${[75, 85, 95].map(o => NEW.E.marketSalary({ ...c, ovr: o })).join('/')}`; });
    console.log(`   for Round 1123, open market pay at 75/85/95 in ${era} (M a year): ${row.join(', ')}`);
  }
  /* Round 1227: the rival plays the season's real length now (nflRivalSeason), so the two arms read alike. Until
     then he kept a 17 game line against a 16 game player and every position's share fell in the throwback
     (measured on the tree before: QB 41.2 to 33.7, K 12.9 to 6.8). */
  console.log(`   the head to head share of decided years in the throwback, 17 game arm -> now (printed, not judged; scripts/simUsRivalSense.mjs holds the rival to the season's real length):${POSITIONS.map(pos => `${pos} ${measured1b[pos].h2h.base.toFixed(1)} -> ${measured1b[pos].h2h.now.toFixed(1)}`).join(', ')}`);
  console.log(`   for Round 1051's owner, the Hall percent by position in the throwback, 17 game arm -> now: ${POSITIONS.map(pos => `${pos} ${measured1b[pos].hall.base.toFixed(1)} -> ${measured1b[pos].hall.now.toFixed(1)}`).join(', ')}`);

  /* The 2026 top of the market by position, millions a year, beside what the engine's open market pays a 95.
     For Round 1123; nothing here enters src and nothing is asserted. Two sources a position, read 2026-10-08:
     A = ESPN, "2026 NFL contracts: Next to get a big deal at every position", 11 June 2026, as carried by ABC7
         Los Angeles (it prints the top deal at each position).
     B = CBS Sports as summarised by Fantasy Nerds, "NFL's Highest-Paid Players by Position for 2026: A
         Financial Snapshot", 9 September 2026.
     QB 63.4 in A, 63 in B. WR 42.2 in A, 42.15 in B. TE 19.1 in both. LB 21 in both. EDGE 50 in both.
     RB: A's figure (20.6) is older than two August deals; B gives three years and 67.5M, and theScore, "Lions
         make Gibbs highest-paid RB with 3-year deal worth up to $75.75M" (worth 67.5M before incentives), the
         same: 22.5 a year.
     CB: A's figure (31) is older than a September deal; B gives 33.75 and NESN's list of the highest paid
         cornerbacks of 2026 gives four years, 135M, 33.75 a year.
     K: B gives 7; the Associated Press, 21 April 2026, as carried by KSAT, "the first kicker with a $7 million
         annual average". */
  const TOP_OF_MARKET_2026 = { QB: 63, RB: 22.5, WR: 42.15, TE: 19.1, LB: 21, CB: 33.75, EDGE: 50, K: 7 };
  {
    const cells = POSITIONS.map(pos => {
      const c = NEW.E.startCareer('Pay', pos, NEW.E.ARCHETYPES[pos][0], mulberry(5), null, 'now');
      const at95 = NEW.E.marketSalary({ ...c, ovr: 95 });
      return `${pos} ${at95} against ${TOP_OF_MARKET_2026[pos]} (${(at95 / TOP_OF_MARKET_2026[pos]).toFixed(2)}x)`;
    });
    console.log(`   for Round 1123, the engine's open market pay for a 95 against the real 2026 top of the market, two sourced (M a year): ${cells.join(', ')}`);
  }

  /* The MLB (2004) and NHL (2006-07) throwbacks, for Round 1137: which season years a throwback career reaches
     and how long a season the engine plays in each. Measured off the two bindings, the way the board drives
     them. THE CANDIDATE LISTS BELOW ARE UNVERIFIED: written from memory as places for Round 1137 to look, two
     sourced by nobody, and they never leave this file. A candidate season is one whose real schedule may not
     have been the full one; a candidate club is one in the era's list that may have moved or been renamed
     inside the years a throwback career reaches. */
  const CANDIDATES_UNVERIFIED = {
    mlb: {
      seasons: [2020],
      clubs: [/Expos/, /Devil Rays/, /Florida/, /Anaheim/, /Indians/, /Oakland/],
    },
    nhl: {
      seasons: [2012, 2019, 2020],
      clubs: [/Thrashers/, /Phoenix/, /Mighty Ducks/],
    },
  };
  const out2 = path.join(tmpDir, 'others.mjs');
  await build({
    stdin: { contents: [`export { MLB_CAREER_SPORT } from './src/lib/mlbCareerSport.ts';`, `export { NHL_CAREER_SPORT } from './src/lib/nhlCareerSport.ts';`, `export { MLB_ERAS } from './src/lib/mlbMyCareer.ts';`, `export { NHL_ERAS } from './src/lib/nhlMyCareer.ts';`].join('\n'), resolveDir: ROOT, loader: 'ts' },
    bundle: true, format: 'esm', platform: 'node', outfile: out2, absWorkingDir: ROOT, logLevel: 'error', alias: { '@': path.join(ROOT, 'src') },
  });
  const O = await import(pathToFileURL(out2).href);
  for (const [slug, sport, eras] of [['mlb', O.MLB_CAREER_SPORT, O.MLB_ERAS], ['nhl', O.NHL_CAREER_SPORT, O.NHL_ERAS]]) {
    const era = eras.find(e => e.id !== 'now');
    const rng = mulberry(SEED * 4099 + slug.charCodeAt(0));
    const keep = Math.random; Math.random = rng;
    const byYear = new Map();
    let careers = 0;
    try {
      for (let i = 0; i < 160; i += 1) {
        const pos = sport.create.positions[i % sport.create.positions.length];
        const archs = sport.create.archetypes[pos];
        const c = sport.startCareer(`Era ${i}`, pos, archs[i % archs.length], rng, null, era.id);
        let tq = sport.rollTeamQuality(null, rng);
        sport.assignRole(c, tq, rng);
        for (let n = 0; n < 30; n += 1) {
          sport.campBattle(c, tq, rng);
          sport.simSeason(c, tq, rng);
          sport.progress(c, rng);
          if (sport.shouldRetire(c)) break;
          tq = sport.rollTeamQuality(tq, rng);
        }
        careers += 1;
        for (const s of c.seasons) {
          const y = byYear.get(s.year) ?? { lines: 0, longest: 0 };
          y.lines += 1; y.longest = Math.max(y.longest, s.games); byYear.set(s.year, y);
        }
      }
    } finally { Math.random = keep; }
    const years = [...byYear.keys()].sort((a, b) => a - b);
    if (!years.length) { fail('5', `${slug}: the throwback probe saw no season at all`); continue; }
    /* The longest line of a year is what a healthy everyday player was given: the schedule the engine plays.
       A late year only a few old careers reach can show less (nobody healthy was left to play it all), so
       each year that differs from the longest of all is printed with how many lines it rests on. */
    const longest = years.reduce((m, y) => (byYear.get(y).longest > m ? byYear.get(y).longest : m), 0);
    const odd = years.filter(y => byYear.get(y).longest !== longest).map(y => `${y} ${byYear.get(y).longest} games on ${byYear.get(y).lines} lines`);
    const spans = [{ from: years[0], to: years[years.length - 1], games: longest }];
    if (odd.length) console.log(`   (the ${slug.toUpperCase()} years whose longest line is shorter than ${longest}: ${odd.join(', ')})`);
    const cand = CANDIDATES_UNVERIFIED[slug];
    const hit = cand.seasons.map(y => `${y}: ${byYear.get(y)?.lines ?? 0} season lines, the engine played ${byYear.get(y)?.longest ?? 'no'} games`);
    const clubs = era.teams.filter(t => cand.clubs.some(rx => rx.test(`${t.city} ${t.name}`))).map(t => `${t.city} ${t.name} (${t.id})`);
    console.log(`   for Round 1137, the ${slug.toUpperCase()} throwback (${era.label}): ${careers} careers reach season years ${spans[0].from} to ${spans[0].to}, and the engine plays a ${spans[0].games} game season in ${years.length - odd.length} of those ${years.length} years ${odd.length ? '(the rest are listed above, each on a handful of lines)' : '(every one of them)'}`);
    console.log(`      UNVERIFIED candidate seasons (from memory, for Round 1137 to check): ${hit.join('; ')}`);
    console.log(`      UNVERIFIED candidate clubs in the era's list of ${era.teams.length} that may have moved or been renamed in those years: ${clubs.length ? clubs.join(', ') : 'none matched'}`);
  }
}

/* ── the verdict ── */
const tags = [...failed.keys()].sort();
console.log('');
if (CONTROL) {
  const must = CONTROLS[CONTROL];
  const missing = must.filter(t => !tags.includes(t));
  const stray = tags.filter(t => !must.includes(t));
  if (!missing.length && !stray.length) {
    console.log(`simNflTruth control ${CONTROL}: green. Section ${must.join(', ')} went red (${failed.get(must[0])} findings) and nothing else did, so this harness works.`);
    process.exit(0);
  }
  console.error(`simNflTruth control ${CONTROL}: RED. Expected exactly [${must.join(', ')}] to fail and got [${tags.join(', ')}].`);
  process.exit(1);
}
if (tags.length) {
  console.error(`simNflTruth: ${tags.length} section${tags.length === 1 ? '' : 's'} failed (${tags.map(t => `${t}: ${failed.get(t)}`).join(', ')})`);
  process.exit(1);
}
console.log('simNflTruth: green. Seasons are their real length, awards survive a 16 game schedule, rookies are paid their slot, kickers go in round four or later, sacks come in halves, and no receiver passes the record book.');
