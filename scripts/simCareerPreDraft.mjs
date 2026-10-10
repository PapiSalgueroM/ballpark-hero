/**
 * Round 914 harness: the road to the draft (src/lib/careerPreDraft.ts and the
 * four sport descriptors), 2,000 careers per sport and era.
 *
 * Before this round a US My Career rolled its draft pick from the rating and
 * its team at random, so the pick and the team had nothing to do with each
 * other. The control `randomteam` puts exactly that back.
 *
 * Sections, each with the control that must turn it red:
 *   1. Era rules: rounds, lottery shape, routes, ages, slot values, and the
 *      minor league ladder walked rung by rung (n seasons are the last n
 *      rungs in order, a year older each; every rung is played by someone;
 *      an undrafted player climbs from A ball, as his line says), as verified
 *      in docs/audits/US-PRE-DRAFT-RULES-2026-10.md. Controls `erarule`
 *      (straight from high school in the modern NBA), `ladderskip` (the climb
 *      skips A ball and repeats Triple-A) and `undraftedtop` (an undrafted
 *      player gets the rating based climb).
 *   2. The team always equals the holder of the pick, and the undrafted
 *      share sits in its band.                  Controls `randomteam`, `squeeze`.
 *   3. Median pick falls as the stock decile rises, the stock to pick rank
 *      correlation is strongly negative, and the two middle stock deciles
 *      land in the middle of the draft as a share of all its picks (rho and
 *      the ratio are scale free; this one is not).
 *                                              Controls `flatstock`, `squeeze`.
 *   4. NBA lottery: every drawn pick, not only the first. The frequency each
 *      seed wins pick k sits inside a |z| band around its exact chance (the
 *      verified combinations drawn without replacement; pick 1 is the table
 *      itself), the chi-square of each pick sits under its threshold, and
 *      the worst team never falls below the first pick after the drawn ones.
 *                                          Controls `flatlottery`, `flatlater`.
 *      4b. Every round after the first is plain inverse record (round 1 too
 *      without a lottery).                                Control `laterlottery`.
 *   5. Every draw comes from keyedRng: no Math.random in the five files (code
 *      only, comments stripped), a run with Math.random made to throw
 *      completes, and two runs give identical results.           Control `mathrandom`.
 *   6. Every card's words match its meter effect: what a choice applies is what
 *      preDraftEffectiveEffect prints, on mid and edge states; a showcase moves
 *      the stock by exactly the clamped table move the card quotes.
 *                                         Controls `cardwords` and `showcasewords`.
 *   7. Growth never passes the ceiling.                          Control `ceiling`.
 *   8. Old saves and corrupt blocks: a missing block, a wrong version or
 *      phase, and every block a card would crash on or leave without a button
 *      (an empty season line, a stat with no value, an empty development
 *      season, a pick with no round, a late phase with no showcase or outcome,
 *      a pending card of null) read as none; good blocks round trip; with the
 *      descriptor a renamed pending card is dropped.       Control `loadershallow`.
 *   9. Round 1220: THE SCOUTS PATH IS BYTE EQUAL TO ITS RECORDING. The 2,000
 *      roads of every sport and era pair are hashed twice, once as the states
 *      after the showcase and once as the states after the draft (sha256 of
 *      their JSON: the grade, the stock, the pick, the round, the club and
 *      every development season, every byte), and both must equal
 *      scripts/data/careerPreDraftDigest.json for this seed set. The file was
 *      written by SIM_PRE_DRAFT_RECORD=1 in a commit that touches no file
 *      under src, and carries the base sha, the Node version and a hash of
 *      each engine file as it stood, so anyone can check what it was recorded
 *      on. Beside each pair it keeps the first three roads as plain values, so
 *      a red line names a road to look at and not only "moved". This proves
 *      the engine FUNCTIONS; that the three buttons still call them is Round
 *      993's test (src/test/usCareerProspect.test.tsx), which this round does
 *      not edit.                        Controls `gradeshift` and `extradraw`.
 *
 * Bands, measured over five seed sets (SEEDSET=a..e, 2,000 careers per sport
 * and era each, 20,000 lottery draws per era each), 2026-10-03, on the tree
 * with the review fixes (undrafted full climb, rate only MLB and NHL lines):
 *   - section 2 undrafted share: 20.1% to 24.3% over the eight sport and era
 *     pairs and five sets (40 values; one value's sampling sd is about 0.9
 *     points). Band set at 15% to 30%. Control `squeeze` drafts everybody: 0%.
 *   - section 3 Spearman(stock, pick rank): -0.967 to -0.978 (40 values).
 *     Floor set at -0.90.
 *   - section 3 top decile median pick over bottom decile median pick: 0.036
 *     (NFL) to 0.153 (NBA 2003-04) over the same 40 values. Ceiling set at
 *     0.35. The bottom two deciles go undrafted in every pair, so their
 *     median is the past the last pick rank and the ratio is a real fall.
 *   - section 3 middle deciles' median pick over all picks: 0.540 to 0.655
 *     (40 values). Band set at 0.40 to 0.80.
 *   - section 3 decile step: every decile median sat at or below the one
 *     before it in all 40 runs (next over previous never above 1.000, the
 *     1.000 being the tied undrafted bottom deciles). Tolerance 1.05x + 1.
 *   - section 4 largest |z| of a seed's frequency at any drawn pick: 1.10 to
 *     3.43 over 35 values (picks 1 to 4 modern, 1 to 3 for 2003, five sets).
 *     Band set at |z| <= 4.5 per seed.
 *   - section 4 chi-square per drawn pick (13 df modern, 12 df 2003): 3.2 to
 *     25.7 over the same 35 values. Ceiling set at 36 (about the 0.999
 *     quantile of 13 df). This and the |z| band are closeness checks at a
 *     fixed N of 20,000 draws, not significance tests that a smaller sample
 *     would pass: `flatlottery` and `flatlater` show they have the power.
 *     The exact enumeration reproduces the pick 2 and 3 odds CBS Sports
 *     prints for 1996 to 2004 (21.55, 18.91, 15.84; 17.85, 17.22, 15.70).
 *   - section 6 choices checked per pair: 3,326 to 6,060. Floor set at 1,000.
 *   What each control did when measured is listed beside CONTROLS below.
 *
 * Run:      node scripts/simCareerPreDraft.mjs
 * Control:  SIM_PRE_DRAFT_CONTROL=<name> node scripts/simCareerPreDraft.mjs   (must exit 1)
 * Record:   SIM_PRE_DRAFT_RECORD=1 SIM_PRE_DRAFT_BASE=<sha> SEEDSET=<a..e> node scripts/simCareerPreDraft.mjs
 *           (section 9's file, one seed set a run; refused together with a control. Only
 *           for a round that means to move the scouts path and says so out loud.)
 */
import os from 'node:os';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as esbuild from 'esbuild';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.SIM_PRE_DRAFT_CONTROL || '';
const RECORD = process.env.SIM_PRE_DRAFT_RECORD === '1';
const SEEDSET = process.env.SEEDSET || 'a';
const N = 2000;
const LOTTERY_DRAWS = 20000;

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };
const ok = m => console.log('  ok: ' + m);

/* Each control is one source mutation, applied to the bundle only. The
   needle must be in the file or the harness refuses to run, so a control
   that changes nothing can never pass for a working check.
   Measured on seed set a, 2026-10-03, each exit 1:
     randomteam    s2: about 1,500 of each pair's drafted players at the wrong team.
     flatstock     s2 undrafted share 0% and s3 rho near 0, in all eight pairs.
     flatlottery   s4: pick 1 |z| 135.6 (modern) and 146.1 (2003).
     mathrandom    s5: Math.random called, 1,520 of 1,600 replays differ.
     cardwords     s6: 104 to 120 choices per pair did not do what they said.
     showcasewords s6: over 600 showcases per pair.
     erarule       s1: the modern NBA gets a prep road drafting at 18.
     ceiling       s7: 900 to 1,950 steps past the ceiling per pair.
     ladderskip    s1: "Double-A, Triple-A, Triple-A" and "Triple-A, Triple-A".
     undraftedtop  s1: an undrafted player started in Double-A, both MLB eras.
     squeeze       s2 undrafted share 0% and s3 middle deciles at 0.01 to 0.08
                   of the draft, all eight pairs; rho (-0.97) and the ratio
                   stay inside their bands, which is why the middle band exists.
     laterlottery  4b: 200 and 192 of 200 NBA orders.
     flatlater     s4: pick 2 |z| 136.4 and 146.2 while pick 1 stays green.
     loadershallow s8: the two broken season line cases load. */
const CONTROLS = {
  randomteam: ['src/lib/careerPreDraft.ts', 'const team = pick ? order[pick - 1] : teams[Math.floor(rng() * teams.length)];', 'const team = teams[Math.floor(rng() * teams.length)];'],
  flatstock: ['src/lib/careerPreDraft.ts', 'const z = (100 - clampMeter(stock)) / 100;', 'const z = 0.5 + 0 * stock;'],
  flatlottery: ['src/lib/careerPreDraft.ts', 'const pool = lotteryTeams.map((id, i) => ({ id, w: L.combos[i] ?? 0 }));', 'const pool = lotteryTeams.map((id) => ({ id, w: 1 }));'],
  mathrandom: ['src/lib/careerPreDraft.ts', "const rng = keyedRng(preDraftKey(s.seed, 'board'));", 'const rng = Math.random;'],
  cardwords: ['src/lib/careerPreDraft.ts', 's.stock += e.stock ?? 0;', 's.stock = s.stock + (option.effect.stock ?? 0);'],
  showcasewords: ['src/lib/careerPreDraft.ts', 'const move = preDraftShowcaseMove(s.stock, SHOWCASE_DELTAS[approach][grade]);', 'const move = preDraftShowcaseMove(s.stock, SHOWCASE_DELTAS.steady[grade]);'],
  erarule: ['src/lib/nbaCareerPreDraft.ts', 'routes: then ? [PREP, COLLEGE_ONE, COLLEGE_THREE] : [COLLEGE_ONE, COLLEGE_THREE],', 'routes: [PREP, COLLEGE_ONE, COLLEGE_THREE],'],
  ceiling: ['src/lib/careerPreDraft.ts', 'return Math.min(Math.max(pot, rating), rating + 1 + Math.floor(rng() * 3));', 'return rating + 1 + Math.floor(rng() * 3);'],
  ladderskip: ['src/lib/mlbCareerPreDraft.ts', 'MLB_MINOR_LEVELS[MLB_MINOR_LEVELS.length - n + i]', 'MLB_MINOR_LEVELS[MLB_MINOR_LEVELS.length - n + i + 1]'],
  undraftedtop: ['src/lib/careerPreDraft.ts', 'const n = drafted ? preDraftDevSeasonCount(desc.postDraft, rating, dev) : desc.postDraft.max;', 'const n = preDraftDevSeasonCount(desc.postDraft, rating, dev);'],
  /* Round 1220: this needle ended in `rng);` and Round 1104 had made the line
     end in the position offset, so since then the control refused to run
     (exit 2) and proved nothing. It carries the line as it is today. */
  squeeze: ['src/lib/careerPreDraft.ts', 'const rank = preDraftBoardRank(s.stock, order.length, rng) + (desc.pickOffset?.(s.pos) ?? 0);', 'const rank = preDraftBoardRank(s.stock, teams.length, rng) + (desc.pickOffset?.(s.pos) ?? 0);'],
  laterlottery: ['src/lib/careerPreDraft.ts', 'for (let r = 2; r <= desc.rounds; r += 1) order.push(...standings);', 'for (let r = 2; r <= desc.rounds; r += 1) order.push(...first);'],
  flatlater: ['src/lib/careerPreDraft.ts', 'const total = pool.reduce((a, p) => a + p.w, 0);', 'if (d > 0) for (const p of pool) p.w = 1; const total = pool.reduce((a, p) => a + p.w, 0);'],
  loadershallow: ['src/lib/careerPreDraft.ts', 'if (!Array.isArray(r.lines) || !r.lines.every(isSeasonRecord)) return null;', 'if (!Array.isArray(r.lines)) return null;'],
  gradeshift: ['src/lib/careerPreDraft.ts', "return roll > 0.8 ? 'A' : roll > 0.5 ? 'B' : roll > 0.2 ? 'C' : 'D';", "return roll > 0.79 ? 'A' : roll > 0.5 ? 'B' : roll > 0.2 ? 'C' : 'D';"],
  extradraw: ['src/lib/careerPreDraft.ts', 'const grade = preDraftShowcaseGrade(s, rng);', 'rng(); const grade = preDraftShowcaseGrade(s, rng);'],
};
if (CONTROL && !CONTROLS[CONTROL]) { console.error(`Unknown control ${CONTROL}`); process.exit(2); }
if (CONTROL && RECORD) { console.error('A recording is never written from a mutated engine. Refusing to run.'); process.exit(2); }

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
  const shown = s;
  s = M.preDraftRunDraft(desc, s);
  return { s, route, trail, approach, pre, shown, stockAtDraft };
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
  const rungs = new Map();
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
    /* Every rung, not only the top: n seasons are the last n rungs of the
       ladder in order, a year older each, and an undrafted player climbs
       the whole ladder from A ball, as his line says. */
    if (o.devSeasons.some((x, k) => x.age !== o.ageAtDraft + k)) { bad.push('a development season has the wrong age'); break; }
    if (d.sport === 'mlb') {
      const got = o.devSeasons.map(x => x.level);
      const want = M.MLB_MINOR_LEVELS.slice(M.MLB_MINOR_LEVELS.length - dev);
      if (JSON.stringify(got) !== JSON.stringify(want)) { bad.push(`a ${dev} season climb read ${got.join(', ')}, not ${want.join(', ')}`); break; }
      if (o.pick === null && got[0] !== M.MLB_MINOR_LEVELS[0]) { bad.push(`an undrafted player started in ${got[0]}, not ${M.MLB_MINOR_LEVELS[0]}`); break; }
      for (const lv of got) rungs.set(lv, (rungs.get(lv) ?? 0) + 1);
    }
    if (d.sport === 'nhl' && new Set(o.devSeasons.map(x => x.level)).size !== 1) { bad.push('NHL development seasons changed level'); break; }
  }
  if (d.sport === 'mlb' && !bad.length && M.MLB_MINOR_LEVELS.some(lv => !(rungs.get(lv) > 0))) bad.push(`a rung nobody played: ${M.MLB_MINOR_LEVELS.map(lv => `${lv} ${rungs.get(lv) ?? 0}`).join(', ')}`);
  if (d.sport === 'mlb' && !/A ball/.test(d.undraftedLine)) bad.push('the undrafted line no longer says where the climb starts');
  if (bad.length) fail(`${tag(d)}: ${bad.join('; ')}`); else ok(`${tag(d)}: ${e.rounds} rounds, ${e.teams} teams, routes ${d.routes.map(r => r.id).join(', ')}`);
}

/* ─── Section 2: the team is the holder of the pick ─── */
console.log('\n2. The team always equals the holder of the pick');
const UNDRAFTED_MIN = 0.15;
const UNDRAFTED_MAX = 0.30;
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
  /* The undrafted road must stay a real road: a share band, so a slip that
     drafts everybody (or nobody) goes red even with every holder right. */
  const share = (N - drafted) / N;
  const shareBad = share < UNDRAFTED_MIN || share > UNDRAFTED_MAX;
  if (wrong || notATeam || shareBad) fail(`${tag(d)}: ${wrong} of ${drafted} drafted players joined a team that did not hold their pick, ${notATeam} joined no real team, undrafted share ${(share * 100).toFixed(1)}% (band ${UNDRAFTED_MIN * 100} to ${UNDRAFTED_MAX * 100}%)`);
  else ok(`${tag(d)}: all ${drafted} drafted players joined the holder of their pick, undrafted share ${(share * 100).toFixed(1)}%`);
}

/* ─── Section 3: stock moves the pick ─── */
console.log('\n3. Median pick falls as the stock decile rises');
const SPEARMAN_MAX = -0.90;
const TOP_OVER_BOTTOM_MAX = 0.35;
const MID_MIN = 0.40;
const MID_MAX = 0.80;
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
  /* Rho and the ratio are scale free, so a slip that squeezes every career
     into the first rounds keeps both. The middle of the stock range must
     still land in the middle of the draft, as a share of all its picks. */
  const mid = (meds[4] + meds[5]) / 2 / total;
  const rise = Math.max(...meds.slice(1).map((m, k) => m / meds[k]));
  const line = `rho ${rho.toFixed(3)}, decile medians ${meds.map(m => Math.round(m)).join(' ')}, top over bottom ${ratio.toFixed(3)}, middle deciles at ${mid.toFixed(3)} of the draft, largest next over previous decile ${rise.toFixed(3)}`;
  if (rho > SPEARMAN_MAX || ratio > TOP_OVER_BOTTOM_MAX || inversions || mid < MID_MIN || mid > MID_MAX) fail(`${tag(d)}: ${line}, ${inversions} decile(s) went back up (middle band ${MID_MIN} to ${MID_MAX})`);
  else ok(`${tag(d)}: ${line}`);
}

/* ─── Section 4: the NBA lottery ─── */
console.log('\n4. NBA lottery frequencies against the verified combinations');
const Z_MAX = 4.5;
const CHI2_MAX = 36;
/** Exact chance that seed i wins drawn pick k: the verified combinations,
 *  drawn without replacement (a combination of a team already drawn is
 *  drawn again). Pick 1 is the table itself; for 1996 to 2004 this
 *  reproduces the published pick 2 and pick 3 odds (see the header). */
function exactLottery(w, drawn) {
  const P = Array.from({ length: drawn }, () => new Array(w.length).fill(0));
  const dfs = (rem, prob, depth) => {
    if (depth === drawn) return;
    const tot = rem.reduce((a, j) => a + w[j], 0);
    for (const j of rem) { const p = prob * w[j] / tot; P[depth][j] += p; dfs(rem.filter(x => x !== j), p, depth + 1); }
  };
  dfs(w.map((_, i) => i), 1, 0);
  return P;
}
for (const d of DESCS.filter(x => x.lottery)) {
  const L = d.lottery;
  const P = exactLottery(L.combos, L.drawn);
  const wins = Array.from({ length: L.drawn }, () => new Array(L.teams).fill(0));
  let worstTooLow = 0;
  for (let t = 0; t < LOTTERY_DRAWS; t += 1) {
    const o = M.preDraftOrder(d, `lottery|${SEEDSET}|${t}`);
    for (let k = 0; k < L.drawn; k += 1) wins[k][o.standings.indexOf(o.order[k])] += 1;
    if (o.order.indexOf(o.standings[0]) > L.drawn) worstTooLow += 1;
  }
  const bad = [];
  const parts = [];
  for (let k = 0; k < L.drawn; k += 1) {
    const zs = wins[k].map((w, i) => { const p = P[k][i]; return (w / LOTTERY_DRAWS - p) / Math.sqrt(p * (1 - p) / LOTTERY_DRAWS); });
    const chi2 = wins[k].reduce((a, w, i) => { const e = LOTTERY_DRAWS * P[k][i]; return a + (w - e) ** 2 / e; }, 0);
    const outside = zs.filter(z => Math.abs(z) > Z_MAX).length;
    parts.push(`pick ${k + 1}: largest |z| ${Math.max(...zs.map(Math.abs)).toFixed(2)}, chi-square ${chi2.toFixed(1)}`);
    if (outside || chi2 > CHI2_MAX) bad.push(`pick ${k + 1} has ${outside} seed(s) outside the band, chi-square ${chi2.toFixed(1)}`);
  }
  if (Math.abs(P[0][0] * 1000 - L.combos[0]) > 1e-9) bad.push('the exact pick 1 odds are not the table');
  if (worstTooLow) bad.push(`worst team fell past pick ${L.drawn + 1} ${worstTooLow} times`);
  const line = `seed 1 won pick 1 ${(wins[0][0] / LOTTERY_DRAWS * 100).toFixed(2)}% (verified ${L.combos[0] / 10}%); ${parts.join('; ')}`;
  if (bad.length) fail(`${tag(d)}: ${line}; ${bad.join('; ')}`); else ok(`${tag(d)}: ${line}`);
}

console.log('\n4b. Every round after the first is plain inverse record');
for (const d of DESCS) {
  const n = d.teamIds().length;
  let badOrders = 0;
  for (let t = 0; t < 200; t += 1) {
    const o = M.preDraftOrder(d, `rounds|${SEEDSET}|${t}`);
    const same = r => JSON.stringify(o.order.slice((r - 1) * n, r * n)) === JSON.stringify(o.standings);
    let okOrder = o.order.length === n * d.rounds;
    for (let r = 2; r <= d.rounds; r += 1) okOrder = okOrder && same(r);
    if (!d.lottery) okOrder = okOrder && same(1);
    if (!okOrder) badOrders += 1;
  }
  if (badOrders) fail(`${tag(d)}: ${badOrders} of 200 orders had a later round that was not inverse record`);
  else ok(`${tag(d)}: 200 orders, rounds 2 to ${d.rounds} all inverse record${d.lottery ? '' : ', round 1 too'}`);
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
  const mlbDone = RUNS.get('mlb:now').find(r => r.s.draft.devSeasons.length).s;
  const mid = RUNS.get('nba:now').find(r => r.trail.length).trail[0].before;
  /* Each case is a block a card would crash on or leave with no button:
     the cards read every one of these fields. */
  const cases = [undefined, null, { ...done, v: 2 }, { ...done, phase: 'lunch' }, { ...done, draft: null },
    { ...done, lines: done.lines.map((line, i) => i ? line : {}) },
    { ...done, lines: done.lines.map((line, i) => i ? line : { ...line, stats: [{ label: 'PPG' }] }) },
    { ...mlbDone, draft: { ...mlbDone.draft, devSeasons: [{}] } }, { ...done, draft: { ...done.draft, pick: 3, round: null } },
    { ...done, showcase: null }, { ...done, phase: 'draft' }, { ...mid, pendingChoice: null }, { ...mid, draft: {} }];
  const wrong = cases.map((c, i) => [i, M.loadPreDraft(c)]).filter(([, got]) => got !== null).map(([i]) => i);
  const trips = [done, mlbDone, mid].filter(b => JSON.stringify(M.loadPreDraft(JSON.parse(JSON.stringify(b)))) !== JSON.stringify(b)).length;
  /* With the descriptor, a pending card a later round renamed is dropped and
     the road goes on, so the player always has a button to press. */
  const d = DESCS.find(x => tag(x) === 'nba:now');
  const healed = M.loadPreDraft({ ...mid, pendingChoice: 'retired_card' }, d);
  const healOk = healed && healed.pendingChoice === null && (healed.phase === 'season' || healed.phase === 'showcase');
  if (wrong.length || trips || !healOk) fail(`corrupt cases loaded: ${wrong.join(', ') || 'none'}; ${trips} good blocks failed to round trip; renamed card healed: ${!!healOk}`);
  else ok(`${cases.length} missing or corrupt blocks read as none, 3 good ones round trip, a renamed pending card is dropped`);
}

/* ─── Section 9: the scouts path, byte for byte ─── */
console.log('\n9. The scouts path is byte equal to its recording');
{
  const DIGEST_FILE = path.join(ROOT, 'scripts/data/careerPreDraftDigest.json');
  const sha = text => crypto.createHash('sha256').update(text).digest('hex');
  /* The first three roads as plain values: a hash only says "moved". */
  const firstOf = rs => rs.slice(0, 3).map(r => ({ approach: r.approach, grade: r.s.showcase.grade, stock: r.stockAtDraft, pick: r.s.draft.pick, team: r.s.draft.team }));
  const now = Object.fromEntries(DESCS.map(d => {
    const rs = RUNS.get(tag(d));
    return [tag(d), { showcase: sha(JSON.stringify(rs.map(r => r.shown))), draft: sha(JSON.stringify(rs.map(r => r.s))), first: firstOf(rs) }];
  }));
  if (RECORD) {
    const base = process.env.SIM_PRE_DRAFT_BASE || '';
    if (!/^[0-9a-f]{40}$/.test(base)) { console.error('SIM_PRE_DRAFT_BASE must be the full sha the engine stood at. Refusing to record.'); process.exit(2); }
    if (failures) { console.error('Sections 1 to 8 are not green on this engine. Refusing to record.'); process.exit(2); }
    /* A hash of each engine file with LF endings, so the recording names the
       engine it was taken on whatever a checkout does to line endings. */
    const srcOf = Object.fromEntries([...FILES, 'keyedRng.ts'].map(f => [f, sha(fs.readFileSync(path.join(ROOT, 'src/lib', f), 'utf-8').replace(/\r\n/g, '\n'))]));
    const prev = fs.existsSync(DIGEST_FILE) ? JSON.parse(fs.readFileSync(DIGEST_FILE, 'utf-8')) : null;
    const same = prev && prev.base === base && prev.node === process.version && prev.roads === N && JSON.stringify(prev.src) === JSON.stringify(srcOf);
    const sets = { ...(same ? prev.sets : {}), [SEEDSET]: now };
    const out = {
      what: 'Round 1220: sha256 of the 2,000 road states of each sport and era pair, after the showcase and after the draft, per seed set. Written by SIM_PRE_DRAFT_RECORD=1 node scripts/simCareerPreDraft.mjs, checked by its section 9.',
      base, node: process.version, roads: N, src: srcOf,
      sets: Object.fromEntries(Object.keys(sets).sort().map(k => [k, sets[k]])),
    };
    fs.writeFileSync(DIGEST_FILE, JSON.stringify(out, null, 2) + '\n');
    ok(`recorded seed set ${SEEDSET} on ${process.version} at ${base.slice(0, 8)}: ${Object.keys(out.sets).length} set(s) in the file`);
  } else if (!fs.existsSync(DIGEST_FILE)) {
    fail('scripts/data/careerPreDraftDigest.json is missing, so nothing says what the scouts path was');
  } else {
    const rec = JSON.parse(fs.readFileSync(DIGEST_FILE, 'utf-8'));
    const set = rec.sets?.[SEEDSET];
    const major = v => String(v).split('.')[0];
    const nodeNote = major(rec.node) === major(process.version) ? '' : ` (recorded on Node ${rec.node}, this is ${process.version}: check on the recording's major before reading this as a moved engine)`;
    if (rec.roads !== N || !set) fail(`the recording has no seed set ${SEEDSET} of ${N} roads`);
    else {
      let moved = 0;
      for (const d of DESCS) {
        const want = set[tag(d)], got = now[tag(d)];
        const halves = ['showcase', 'draft'].filter(h => !want || want[h] !== got[h]);
        if (!halves.length) continue;
        moved += 1;
        fail(`${tag(d)}: the states after the ${halves.join(' and after the ')} are not the recorded bytes${nodeNote}. First three roads recorded ${JSON.stringify(want?.first ?? null)}, now ${JSON.stringify(got.first)}`);
      }
      if (!moved) ok(`all ${DESCS.length * 2} digests of seed set ${SEEDSET} equal the recording (${DESCS.length * N} roads, recorded on ${rec.node} at ${String(rec.base).slice(0, 8)})`);
    }
  }
}

fs.rmSync(TMP, { recursive: true, force: true });
console.log(`\nsimCareerPreDraft${CONTROL ? ` [control ${CONTROL}]` : ''} [seed set ${SEEDSET}]: ${failures === 0 ? 'ALL GREEN' : `${failures} FAILURE(S)`}`);
process.exit(failures === 0 ? 0 : 1);
