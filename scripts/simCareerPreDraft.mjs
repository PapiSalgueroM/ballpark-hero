/**
 * Round 914 harness: the road to the draft (src/lib/careerPreDraft.ts and the
 * four sport descriptors), 2,000 careers per sport and era.
 *
 * Before this round a US My Career rolled its draft pick from the rating and
 * its team at random, so the pick and the team had nothing to do with each
 * other. The control `randomteam` puts exactly that back.
 *
 * Sections, each with the control that must turn it red:
 *   1. Era rules: rounds, lottery shape, routes, ages, slot values, minor
 *      league ladder, as verified in docs/audits/US-PRE-DRAFT-RULES-2026-10.md.
 *      Control `erarule` (straight from high school in the modern NBA).
 *   2. The team always equals the holder of the pick.           Control `randomteam`.
 *   3. Median pick falls as the stock decile rises, and the stock to pick
 *      rank correlation is strongly negative.                    Control `flatstock`.
 *   4. NBA lottery: the frequency each seed wins pick 1 sits inside a band
 *      around the verified combinations, the chi-square over all seeds sits
 *      under its threshold, and the worst team never falls below the first
 *      pick after the drawn ones.                                Control `flatlottery`.
 *   5. Every draw comes from keyedRng: no Math.random in the five files (code
 *      only, comments stripped), a run with Math.random made to throw
 *      completes, and two runs give identical results.           Control `mathrandom`.
 *   6. Every card's words match its meter effect: what a choice applies is what
 *      preDraftEffectiveEffect prints, on mid and edge states; a showcase moves
 *      the stock by exactly the clamped table move the card quotes.
 *                                         Controls `cardwords` and `showcasewords`.
 *   7. Growth never passes the ceiling.                          Control `ceiling`.
 *
 * Bands, measured over five seed sets (SEEDSET=a..e, 2,000 careers per sport
 * and era each, 20,000 lottery draws per era each), 2026-10-03:
 *   - section 3 Spearman(stock, pick rank): -0.966 to -0.978 across the eight
 *     sport and era pairs and five sets (40 values). Floor set at -0.90.
 *   - section 3 top decile median pick over bottom decile median pick: 0.036
 *     (NFL) to 0.136 (NBA 2003-04) over the same 40 values. Ceiling set at
 *     0.35. The bottom two deciles go undrafted in every pair, so their
 *     median is the past the last pick rank and the ratio is a real fall.
 *   - section 4 largest |z| of a seed's pick 1 frequency: 1.10 to 3.29 over
 *     the ten runs (two eras by five sets). Band set at |z| <= 4.5 per seed.
 *   - section 4 chi-square (13 df modern, 12 df 2003): 3.2 to 20.1. Ceiling
 *     set at 36 (about the 0.999 quantile of 13 df).
 *   What each control did when measured is listed beside CONTROLS below.
 *
 * Run:      node scripts/simCareerPreDraft.mjs
 * Control:  SIM_PRE_DRAFT_CONTROL=<name> node scripts/simCareerPreDraft.mjs   (must exit 1)
 */
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as esbuild from 'esbuild';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.SIM_PRE_DRAFT_CONTROL || '';
const SEEDSET = process.env.SEEDSET || 'a';
const N = 2000;
const LOTTERY_DRAWS = 20000;

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };
const ok = m => console.log('  ok: ' + m);

/* Each control is one source mutation, applied to the bundle only. The
   needle must be in the file or the harness refuses to run, so a control
   that changes nothing can never pass for a working check. */
const CONTROLS = {
  randomteam: ['src/lib/careerPreDraft.ts', 'const team = pick ? order[pick - 1] : teams[Math.floor(rng() * teams.length)];', 'const team = teams[Math.floor(rng() * teams.length)];'],
  flatstock: ['src/lib/careerPreDraft.ts', 'const z = (100 - clampMeter(stock)) / 100;', 'const z = 0.5 + 0 * stock;'],
  flatlottery: ['src/lib/careerPreDraft.ts', 'const pool = lotteryTeams.map((id, i) => ({ id, w: L.combos[i] ?? 0 }));', 'const pool = lotteryTeams.map((id) => ({ id, w: 1 }));'],
  mathrandom: ['src/lib/careerPreDraft.ts', "const rng = keyedRng(preDraftKey(s.seed, 'board'));", 'const rng = Math.random;'],
  cardwords: ['src/lib/careerPreDraft.ts', 's.stock += e.stock ?? 0;', 's.stock = s.stock + (option.effect.stock ?? 0);'],
  showcasewords: ['src/lib/careerPreDraft.ts', 'const move = preDraftShowcaseMove(s.stock, SHOWCASE_DELTAS[approach][grade]);', 'const move = preDraftShowcaseMove(s.stock, SHOWCASE_DELTAS.steady[grade]);'],
  erarule: ['src/lib/nbaCareerPreDraft.ts', 'routes: then ? [PREP, COLLEGE_ONE, COLLEGE_THREE] : [COLLEGE_ONE, COLLEGE_THREE],', 'routes: [PREP, COLLEGE_ONE, COLLEGE_THREE],'],
  ceiling: ['src/lib/careerPreDraft.ts', 'return Math.min(Math.max(pot, rating), rating + 1 + Math.floor(rng() * 3));', 'return rating + 1 + Math.floor(rng() * 3);'],
};
if (CONTROL && !CONTROLS[CONTROL]) { console.error(`Unknown control ${CONTROL}`); process.exit(2); }

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'predraft-'));
const ENTRY = path.join(TMP, 'entry.ts');
const BUNDLE = path.join(TMP, 'bundle.mjs');
const lib = f => path.join(ROOT, 'src/lib', f).replace(/\\/g, '/');
fs.writeFileSync(ENTRY, [
  `export * from '${lib('careerPreDraft.ts')}';`,
  `export { keyedRng } from '${lib('keyedRng.ts')}';`,
  `export { nflPreDraftDescriptor } from '${lib('nflCareerPreDraft.ts')}';`,
  `export { nbaPreDraftDescriptor, NBA_LOTTERY_NOW, NBA_LOTTERY_2003 } from '${lib('nbaCareerPreDraft.ts')}';`,
  `export { mlbPreDraftDescriptor, MLB_SLOT_2026, MLB_MINOR_LEVELS } from '${lib('mlbCareerPreDraft.ts')}';`,
  `export { nhlPreDraftDescriptor } from '${lib('nhlCareerPreDraft.ts')}';`,
].join('\n'));

const controlPlugin = {
  name: 'pre-draft-control',
  setup(b) {
    if (!CONTROL) return;
    const [file, needle, repl] = CONTROLS[CONTROL];
    const abs = path.join(ROOT, file).replace(/\\/g, '/');
    const src = fs.readFileSync(abs, 'utf-8');
    if (!src.includes(needle)) { console.error(`Control ${CONTROL}: needle not found in ${file}. Refusing to run.`); process.exit(2); }
    b.onLoad({ filter: /PreDraft\.ts$/ }, args => {
      if (args.path.replace(/\\/g, '/') !== abs) return undefined;
      const out = src.replace(needle, repl);
      if (out === src) { console.error(`Control ${CONTROL} changed nothing. Refusing to run.`); process.exit(2); }
      console.log(`  control ${CONTROL}: mutated ${file}`);
      return { contents: out, loader: 'ts' };
    });
  },
};

await esbuild.build({
  entryPoints: [ENTRY], bundle: true, format: 'esm', platform: 'node', outfile: BUNDLE,
  logLevel: 'error', alias: { '@': path.join(ROOT, 'src') }, plugins: [controlPlugin],
});
const bundleText = fs.readFileSync(BUNDLE, 'utf-8');
if (/supabase\.co/.test(bundleText)) { console.error('The bundle reaches the live database host. Refusing to run.'); process.exit(2); }
const M = await import(pathToFileURL(BUNDLE).href);

const DESCS = [
  M.nflPreDraftDescriptor('now'), M.nflPreDraftDescriptor('y2005'),
  M.nbaPreDraftDescriptor('now'), M.nbaPreDraftDescriptor('y2004'),
  M.mlbPreDraftDescriptor('now'), M.mlbPreDraftDescriptor('y2004'),
  M.nhlPreDraftDescriptor('now'), M.nhlPreDraftDescriptor('y2006'),
];
const tag = d => `${d.sport}:${d.eraId}`;
const POS = { nfl: ['QB', 'RB', 'WR', 'TE', 'LB', 'CB', 'EDGE', 'K'], nba: ['PG', 'SG', 'SF', 'PF', 'C'], mlb: ['SP', 'RP', 'C', 'SS', 'CF'], nhl: ['C', 'LW', 'D', 'G'] };

/** One whole career road. Every input comes from a keyed stream of the
 *  harness's own, so the run is the same every time for a seed set. */
function road(desc, i) {
  const pick = M.keyedRng(`sim|${SEEDSET}|${tag(desc)}|${i}`);
  const route = desc.routes[Math.floor(pick() * desc.routes.length)];
  const rating = 58 + Math.floor(pick() * 21);
  const pos = POS[desc.sport][Math.floor(pick() * POS[desc.sport].length)];
  let s = M.preDraftStart(desc, { seed: `${SEEDSET}-${i}`, routeId: route.id, rating, pot: rating + 4 + Math.floor(pick() * 16), pos });
  const trail = [];
  for (let g = 0; g < 20 && s.phase !== 'showcase'; g += 1) {
    if (s.phase === 'season') s = M.preDraftPlaySeason(desc, s);
    else { const card = M.preDraftChoicePool(desc).find(c => c.id === s.pendingChoice); const k = Math.floor(pick() * card.options.length); trail.push({ before: s, card, k }); s = M.preDraftChoose(desc, s, k); trail[trail.length - 1].after = s; }
  }
  const approach = ['allout', 'steady', 'skip'][Math.floor(pick() * 3)];
  const pre = s;
  s = M.preDraftShowcase(desc, s, approach);
  const stockAtDraft = s.stock;
  s = M.preDraftRunDraft(desc, s);
  return { s, route, trail, approach, pre, stockAtDraft };
}

/* ─── Section 5 first: every draw from keyedRng ─── */
console.log('\n5. Every draw comes from keyedRng');
const stripComments = src => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');
const FILES = ['careerPreDraft.ts', 'nflCareerPreDraft.ts', 'nbaCareerPreDraft.ts', 'mlbCareerPreDraft.ts', 'nhlCareerPreDraft.ts'];
const inCode = FILES.filter(f => /Math\.random/.test(stripComments(fs.readFileSync(path.join(ROOT, 'src/lib', f), 'utf-8'))));
if (inCode.length) fail(`Math.random in the code of ${inCode.join(', ')}`); else ok('no Math.random in the code of the five files');
const realRandom = Math.random;
let RUNS = null;
Math.random = () => { throw new Error('Math.random was called'); };
try {
  RUNS = new Map(DESCS.map(d => [tag(d), Array.from({ length: N }, (_, i) => road(d, i))]));
  ok(`${DESCS.length * N} careers ran with Math.random made to throw`);
} catch (e) {
  fail(`a career drew from Math.random: ${e.message}`);
} finally { Math.random = realRandom; }
if (!RUNS) RUNS = new Map(DESCS.map(d => [tag(d), Array.from({ length: N }, (_, i) => road(d, i))]));
{
  let diff = 0;
  for (const d of DESCS) for (let i = 0; i < 200; i += 1) if (JSON.stringify(road(d, i).s) !== JSON.stringify(RUNS.get(tag(d))[i].s)) diff += 1;
  if (diff) fail(`${diff} of ${DESCS.length * 200} careers came out different on a replay`); else ok('the same seeds replay to the same careers');
}

/* ─── Section 1: era rules, as the audit verified them ─── */
console.log('\n1. Era rules');
const EXPECT = {
  'nfl:now': { rounds: 7, teams: 32 }, 'nfl:y2005': { rounds: 7, teams: 32 },
  'nba:now': { rounds: 2, teams: 30, lottery: [14, 4, [140, 140, 140, 125, 105, 90, 75, 60, 45, 30, 20, 15, 10, 5]] },
  'nba:y2004': { rounds: 2, teams: 29, lottery: [13, 3, [250, 200, 157, 120, 89, 64, 44, 29, 18, 11, 7, 6, 5]] },
  'mlb:now': { rounds: 20, teams: 30 }, 'mlb:y2004': { rounds: 50, teams: 30 },
  'nhl:now': { rounds: 7, teams: 32 }, 'nhl:y2006': { rounds: 7, teams: 30 },
};
const SLOTS = [11350600, 10507000, 9740100, 8988400, 8336500, 7746100, 7327200, 6982600, 6675300, 6393100,
  6133500, 5889300, 5661300, 5444900, 5241000, 5051900, 4868600, 4695500, 4530500, 4373900, 4224700, 4082700, 3947600, 3818700, 3696000];
for (const d of DESCS) {
  const e = EXPECT[tag(d)];
  const bad = [];
  if (d.rounds !== e.rounds) bad.push(`rounds ${d.rounds} not ${e.rounds}`);
  if (d.teamIds().length !== e.teams) bad.push(`teams ${d.teamIds().length} not ${e.teams}`);
  if (e.lottery) {
    const L = d.lottery;
    if (!L || L.teams !== e.lottery[0] || L.drawn !== e.lottery[1] || JSON.stringify(L.combos) !== JSON.stringify(e.lottery[2])) bad.push('lottery is not the verified table');
    else if (d.teamIds().length - L.teams !== 16) bad.push('lottery is not the non playoff teams');
  } else if (d.lottery) bad.push('has a lottery the audit did not verify');
  const prep = d.routes.some(r => r.id === 'prep');
  if (prep !== (tag(d) === 'nba:y2004')) bad.push(prep ? 'straight from high school outside the 2003-04 era' : 'the 2003-04 era lost its prep to pro road');
  for (const r of d.routes) {
    const age = r.startAge + r.seasons;
    if (d.sport === 'nfl' && age < 21) bad.push(`${r.id} drafts at ${age}, under three seasons past high school`);
    if (d.sport === 'nba' && d.eraId === 'now' && age < 19) bad.push(`${r.id} drafts at ${age}, under 19`);
    if (d.sport === 'nhl' && age !== 18) bad.push(`${r.id} drafts at ${age}, not 18`);
    if (d.sport === 'mlb' && age !== { hs: 18, juco: 20, college: 21 }[r.id]) bad.push(`${r.id} drafts at ${age}`);
    if (r.seasons < 1 || r.seasons > 3) bad.push(`${r.id} has ${r.seasons} seasons`);
  }
  if (d.sport === 'mlb') {
    if (d.eraId === 'now') {
      if (SLOTS.some((v, i) => d.slotValue(i + 1) !== v) || d.slotValue(26) !== null) bad.push('slot values are not the verified 2026 table');
      if (!/150,000/.test(d.bonusLine(301))) bad.push('round 11 money line lost the 150,000 rule');
    } else {
      if (d.slotValue) bad.push('the 2004 era quotes a slot value before bonus pools existed');
      if (/\$/.test(d.bonusLine(1))) bad.push('the 2004 era quotes a dollar figure');
    }
  }
  for (const { s } of RUNS.get(tag(d))) {
    const o = s.draft;
    if (o.pick !== null && (o.pick > d.rounds * e.teams || o.round > d.rounds)) { bad.push(`pick ${o.pick} past the end of the draft`); break; }
    const dev = o.devSeasons.length;
    if (d.postDraft ? dev < d.postDraft.min || dev > d.postDraft.max : dev !== 0) { bad.push(`${dev} development seasons`); break; }
    if (d.sport === 'mlb' && o.devSeasons[dev - 1].level !== 'Triple-A') { bad.push('the minor league climb does not end at Triple-A'); break; }
  }
  if (bad.length) fail(`${tag(d)}: ${bad.join('; ')}`); else ok(`${tag(d)}: ${e.rounds} rounds, ${e.teams} teams, routes ${d.routes.map(r => r.id).join(', ')}`);
}

/* ─── Section 2: the team is the holder of the pick ─── */
console.log('\n2. The team always equals the holder of the pick');
for (const d of DESCS) {
  let drafted = 0, wrong = 0, notATeam = 0;
  const ids = new Set(d.teamIds());
  for (const { s } of RUNS.get(tag(d))) {
    const o = s.draft;
    if (!ids.has(o.team)) notATeam += 1;
    if (o.pick === null) continue;
    drafted += 1;
    if (M.preDraftOrder(d, s.seed).order[o.pick - 1] !== o.team) wrong += 1;
  }
  if (wrong || notATeam || drafted < N * 0.3) fail(`${tag(d)}: ${wrong} of ${drafted} drafted players joined a team that did not hold their pick, ${notATeam} joined no real team`);
  else ok(`${tag(d)}: all ${drafted} drafted players joined the holder of their pick (${N - drafted} undrafted)`);
}

/* ─── Section 3: stock moves the pick ─── */
console.log('\n3. Median pick falls as the stock decile rises');
const SPEARMAN_MAX = -0.90;
const TOP_OVER_BOTTOM_MAX = 0.35;
function ranks(xs) {
  const idx = xs.map((x, i) => [x, i]).sort((a, b) => a[0] - b[0]);
  const r = new Array(xs.length);
  for (let i = 0; i < idx.length;) {
    let j = i; while (j + 1 < idx.length && idx[j + 1][0] === idx[i][0]) j += 1;
    for (let k = i; k <= j; k += 1) r[idx[k][1]] = (i + j) / 2;
    i = j + 1;
  }
  return r;
}
function pearson(a, b) {
  const n = a.length, ma = a.reduce((x, y) => x + y, 0) / n, mb = b.reduce((x, y) => x + y, 0) / n;
  let sab = 0, saa = 0, sbb = 0;
  for (let i = 0; i < n; i += 1) { sab += (a[i] - ma) * (b[i] - mb); saa += (a[i] - ma) ** 2; sbb += (b[i] - mb) ** 2; }
  return sab / Math.sqrt(saa * sbb);
}
const median = xs => { const s = [...xs].sort((a, b) => a - b); return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2; };
for (const d of DESCS) {
  const total = d.rounds * d.teamIds().length;
  const rows = RUNS.get(tag(d)).map(r => ({ stock: r.stockAtDraft, rank: r.s.draft.pick ?? total + 1 }));
  const rho = pearson(ranks(rows.map(r => r.stock)), ranks(rows.map(r => r.rank)));
  const sorted = [...rows].sort((a, b) => a.stock - b.stock);
  const meds = Array.from({ length: 10 }, (_, k) => median(sorted.slice(Math.floor(k * N / 10), Math.floor((k + 1) * N / 10)).map(r => r.rank)));
  const inversions = meds.slice(1).filter((m, k) => m > meds[k] * 1.05 + 1).length;
  const ratio = meds[9] / meds[0];
  const line = `rho ${rho.toFixed(3)}, decile medians ${meds.map(m => Math.round(m)).join(' ')}, top over bottom ${ratio.toFixed(3)}`;
  if (rho > SPEARMAN_MAX || ratio > TOP_OVER_BOTTOM_MAX || inversions) fail(`${tag(d)}: ${line}, ${inversions} decile(s) went back up`);
  else ok(`${tag(d)}: ${line}`);
}

/* ─── Section 4: the NBA lottery ─── */
console.log('\n4. NBA lottery frequencies against the verified combinations');
const Z_MAX = 4.5;
const CHI2_MAX = 36;
for (const d of DESCS.filter(x => x.lottery)) {
  const L = d.lottery;
  const wins = new Array(L.teams).fill(0);
  let worstTooLow = 0;
  for (let t = 0; t < LOTTERY_DRAWS; t += 1) {
    const o = M.preDraftOrder(d, `lottery|${SEEDSET}|${t}`);
    wins[o.standings.indexOf(o.order[0])] += 1;
    if (o.order.indexOf(o.standings[0]) > L.drawn) worstTooLow += 1;
  }
  const zs = wins.map((w, i) => { const p = L.combos[i] / 1000; return (w / LOTTERY_DRAWS - p) / Math.sqrt(p * (1 - p) / LOTTERY_DRAWS); });
  const chi2 = wins.reduce((a, w, i) => { const e = LOTTERY_DRAWS * L.combos[i] / 1000; return a + (w - e) ** 2 / e; }, 0);
  const outside = zs.filter(z => Math.abs(z) > Z_MAX).length;
  const zmax = Math.max(...zs.map(Math.abs));
  const line = `seed 1 won ${(wins[0] / LOTTERY_DRAWS * 100).toFixed(2)}% (verified ${L.combos[0] / 10}%), largest |z| ${zmax.toFixed(2)}, chi-square ${chi2.toFixed(1)}`;
  if (outside || chi2 > CHI2_MAX || worstTooLow) fail(`${tag(d)}: ${line}, ${outside} seed(s) outside the band, worst team fell past pick ${L.drawn + 1} ${worstTooLow} times`);
  else ok(`${tag(d)}: ${line}`);
}

/* ─── Section 6: words match effects ─── */
console.log('\n6. Every card says what it does');
const sign = n => (n > 0 ? `+${n}` : `${n}`);
const wordsFor = e => [e.stock ? `Draft stock ${sign(e.stock)}` : '', e.rating ? `Rating ${sign(e.rating)}` : '', e.health ? `Health ${sign(e.health)}` : ''].filter(Boolean).join(', ') || 'No change';
for (const d of DESCS) {
  let checked = 0, bad = 0;
  const check = (before, card, k, after) => {
    checked += 1;
    const eff = M.preDraftEffectiveEffect(before, card.options[k].effect);
    const got = { stock: after.stock - before.stock, rating: after.rating - before.rating, health: after.health - before.health };
    const promised = { stock: eff.stock ?? 0, rating: eff.rating ?? 0, health: eff.health ?? 0 };
    if (JSON.stringify(got) !== JSON.stringify(promised) || M.preDraftEffectText(eff) !== wordsFor(eff)) {
      bad += 1;
      if (bad <= 2) console.error(`    ${card.id}[${k}] says "${M.preDraftEffectText(eff)}" but did ${JSON.stringify(got)}`);
    }
  };
  for (const r of RUNS.get(tag(d))) for (const t of r.trail) check(t.before, t.card, t.k, t.after);
  const base = M.preDraftStart(d, { seed: 'edge', routeId: d.routes[0].id, rating: 70, pot: 72 });
  const edges = [base, { ...base, stock: 99, health: 96, rating: 72 }, { ...base, stock: 1, health: 3 }, { ...base, stock: 100, health: 100 }, { ...base, stock: 0, health: 0, rating: 1, pot: 1 }];
  for (const card of M.preDraftChoicePool(d)) for (let k = 0; k < card.options.length; k += 1) for (const e of edges) {
    const before = { ...e, phase: 'choice', pendingChoice: card.id };
    check(before, card, k, M.preDraftChoose(d, before, k));
  }
  let showBad = 0, showN = 0, sameGrade = 0;
  for (const r of RUNS.get(tag(d))) {
    const sc = r.s.showcase;
    const table = sc.approach === 'skip' ? M.SKIP_DELTA : M.SHOWCASE_DELTAS[sc.approach][sc.grade];
    /* The card prints preDraftShowcaseMove(stock, table): the table number,
       clamped at the ends of the meter. Unclamped, it must be the table
       number itself, so the card can never quote a number the table lacks. */
    const promised = M.preDraftShowcaseMove(r.pre.stock, table);
    const unclamped = r.pre.stock + table >= 0 && r.pre.stock + table <= 100;
    showN += 1;
    if (sc.stockDelta !== promised || r.stockAtDraft - r.pre.stock !== promised || (unclamped && promised !== table)) showBad += 1;
    if (sc.approach !== 'skip') {
      const other = M.preDraftShowcase(d, r.pre, sc.approach === 'allout' ? 'steady' : 'allout').showcase;
      if (other.grade === sc.grade && other.drill === sc.drill) sameGrade += 1; else showBad += 1;
    }
  }
  if (bad || showBad || checked < 1000) fail(`${tag(d)}: ${bad} of ${checked} choices and ${showBad} showcases did not do what their words say`);
  else ok(`${tag(d)}: ${checked} choices and ${showN} showcases did exactly what they said; ${sameGrade} drills graded the same whichever approach`);
}

/* ─── Section 7: growth stays under the ceiling, every step ─── */
console.log('\n7. Growth never passes the ceiling');
for (const d of DESCS) {
  let over = 0, steps = 0;
  for (const r of RUNS.get(tag(d))) {
    const states = [...r.trail.flatMap(t => [t.before, t.after]), r.pre, r.s];
    for (const st of states) { steps += 1; if (st.rating > Math.max(st.pot, 0)) over += 1; }
    steps += 1; if (r.s.draft.ratingAfter > r.s.pot) over += 1;
  }
  if (over) fail(`${tag(d)}: ${over} of ${steps} steps had a rating past the ceiling`); else ok(`${tag(d)}: ${steps} steps, none past the ceiling`);
}

/* ─── Section 8: old saves ─── */
console.log('\n8. Old saves and corrupt blocks');
{
  const done = RUNS.get('nba:now')[0].s;
  const cases = [[undefined, null], [null, null], [{ ...done, v: 2 }, null], [{ ...done, phase: 'lunch' }, null], [{ ...done, draft: null }, null]];
  const wrong = cases.filter(([inp, want]) => M.loadPreDraft(inp) !== want).length;
  const trip = JSON.stringify(M.loadPreDraft(JSON.parse(JSON.stringify(done)))) === JSON.stringify(done);
  if (wrong || !trip) fail(`${wrong} corrupt or missing blocks were not reset, round trip ${trip}`); else ok('a missing or corrupt block reads as none, a good one round trips');
}

fs.rmSync(TMP, { recursive: true, force: true });
console.log(`\nsimCareerPreDraft${CONTROL ? ` [control ${CONTROL}]` : ''} [seed set ${SEEDSET}]: ${failures === 0 ? 'ALL GREEN' : `${failures} FAILURE(S)`}`);
process.exit(failures === 0 ? 0 : 1);
