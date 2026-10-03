/* Round 943: the facility ladder for every manager seat
   (src/lib/gmFacilities.ts, packs in src/data/gmFacilities/packs.ts).

   1. Every level of every building in every pack moves its value at every
      step, read through facilityEffect on a real block at that level, and
      level 1 reads exactly neutral. This is the module boundary only: no
      engine reads these keys yet, and the round that binds each pack owes
      the walk through its real consumer. The upkeep is exactly the pack's
      rate for each level ABOVE 1 (recomputed here, so a level 1 building
      costs nothing), and every price step is dearer than the one before.
   1b. Every pack opens every building at level 1 in every market tier, and
      a save with no block reads level 1 too, so binding a pack changes
      nothing for a seat that never builds.
   1c. The gym's front office, through the gym's own one decimal reputation
      (the rounding in fightGym advanceWeek is fenced here): a year of the
      cadence each level sets loses less reputation at every step, and
      level 1 loses exactly what the gym loses today.
   1d. The ten level cost steps and the growth, injury and ground steps are
      Club Manager's (read from clubManagerFacilities.ts), so the two
      ladders cannot drift apart while they are two copies.
   2. A full build out costs more than the money one season can put into
      buildings, so it stays a choice. For the four front offices that pot is
      FO_BEST_FREE_OPS_SHARE of the cap, the free operations budget of a big
      market at full trust (buildings are paid from nothing else), which
      simGmBooks measures and holds. For the fight gym it is measured here,
      by running src/lib/fightGym.ts with simFightGym's careful policy for
      three years (an established gym's purse cuts). College and Australian
      football keep no money yet: their number is DECLARED, not measured,
      the check only holds the ladder to the pack's own statement, and the
      round that binds each owes the measurement.
   3. An upgrade takes its build time: a level opens after exactly the
      pack's build periods, never sooner, one project at a time, and the
      summer finishes what is under way.

   Measured on 2026-10-03 (printed again on every run): 7 packs, 28
   effects, 232 steps, every one moving; full build outs of 9.49 seasons
   of the best free operations money for every front office (0.7595 caps
   against 0.08), 5.97 declared seasons for college, 1.34 measured seasons
   for the gym (24.1M against 18M, its established years measured at
   16.6M and 12.8M), 4.08 declared seasons for Aussie rules; a year of the
   gym's front office costs 5.2, 2.6, 1.7, 1.3, 1.0 reputation by level;
   223 builds walked, 171 longer than one period.

   Controls (GMFAC_CONTROL), each asserting its anchor exists first:
     flatladder      the front office training centre stops growing anything: section 1 must fail.
     chargelevelone  upkeep is charged on every level, level 1 too: section 1 must fail.
     bigstart        front offices open at 6, 4 and 2 by market: section 1b must fail.
     repdecimal      the gym's front office goes back to fractions of a week: section 1c must fail.
     cmdrift         the ten level cost steps drift from Club Manager's: section 1d must fail.
     cheapgym        the gym's ladder costs next to nothing: section 2 must fail.
     cheapfo         the front office ladders cost next to nothing: section 2 must fail.
     instant         every build finishes in one period: section 3 must fail.
*/
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROOT_URL = ROOT.replaceAll('\\', '/');
const CONTROL = process.env.GMFAC_CONTROL || '';

let failures = 0;
const fail = (m) => { failures += 1; console.log(`   FAIL ${m}`); };
const ok = (m) => console.log(`   ok   ${m}`);

function findEsbuild() {
  const exe = process.platform === 'win32' ? 'esbuild.cmd' : 'esbuild';
  let dir = ROOT;
  for (let i = 0; i < 6; i += 1) {
    const p = path.join(dir, 'node_modules', '.bin', exe);
    if (fs.existsSync(p)) return p;
    const up = path.dirname(dir);
    if (up === dir) break;
    dir = up;
  }
  throw new Error('esbuild not found walking up from ' + ROOT);
}

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'gmfac-'));
const lf = (s) => s.replaceAll('\r\n', '\n');
const src = {
  packs: lf(fs.readFileSync(path.join(ROOT, 'src/data/gmFacilities/packs.ts'), 'utf8')),
  engine: lf(fs.readFileSync(path.join(ROOT, 'src/lib/gmFacilities.ts'), 'utf8')),
};

function rewrite(name, which, anchor, replacement) {
  if (!src[which].includes(anchor)) {
    console.log(`   FAIL control ${name}: its anchor is not in the source, so it would change nothing`);
    process.exit(1);
  }
  src[which] = src[which].replace(anchor, replacement);
  console.log(`   control ${name} applied`);
}

if (CONTROL === 'flatladder') {
  rewrite('flatladder', 'packs', "effects: [mult('growthMult', 'Growth', 0.013, 3,", "effects: [mult('growthMult', 'Growth', 0, 3,");
} else if (CONTROL === 'cheapgym') {
  rewrite('cheapgym', 'packs', 'costStep: [0.7, 1.2, 1.9, 2.9],', 'costStep: [0.001, 0.002, 0.003, 0.004],');
} else if (CONTROL === 'instant') {
  rewrite('instant', 'engine', 'const periods = Math.max(1, Math.round(pack.buildPeriods[level - 1] ?? 1));', 'const periods = 1;');
} else if (CONTROL === 'chargelevelone') {
  rewrite('chargelevelone', 'engine', 'pack.upkeepPerLevel * (facilityLevel(pack, f, x) - 1) * scale', 'pack.upkeepPerLevel * facilityLevel(pack, f, x) * scale');
} else if (CONTROL === 'bigstart') {
  rewrite('bigstart', 'packs', 'startLevel: [1, 1, 1],\n    upkeepPerLevel: Math.round((cap * FO_UPKEEP_SHARE', 'startLevel: [6, 4, 2],\n    upkeepPerLevel: Math.round((cap * FO_UPKEEP_SHARE');
} else if (CONTROL === 'repdecimal') {
  rewrite('repdecimal', 'packs', "amount('repDecayEvery', 'Weeks for each 0.1 reputation lost', 1, 1, 0,", "amount('repDecayEvery', 'Weeks for each 0.1 reputation lost', 1, 0.2, 1,");
} else if (CONTROL === 'cmdrift') {
  rewrite('cmdrift', 'packs', 'const TEN_LEVEL_STEPS = [4, 6, 9, 13, 19, 27, 38, 54, 75];', 'const TEN_LEVEL_STEPS = [4, 6, 9, 13, 19, 27, 38, 54, 80];');
} else if (CONTROL === 'cheapfo') {
  rewrite('cheapfo', 'packs', 'export const FO_COST_PER_CAP = 0.001;', 'export const FO_COST_PER_CAP = 0.00001;');
} else if (CONTROL) {
  console.log(`   FAIL unknown control ${CONTROL}`);
  process.exit(1);
}

const packsPath = path.join(TMP, 'packs.ts').replaceAll('\\', '/');
const enginePath = path.join(TMP, 'gmFacilities.ts').replaceAll('\\', '/');
fs.writeFileSync(packsPath, src.packs);
fs.writeFileSync(enginePath, src.engine);
const ENTRY = path.join(TMP, 'entry.ts');
fs.writeFileSync(ENTRY, [
  "export * as fac from '@/lib/gmFacilities';",
  "export * as packs from '@/data/gmFacilities/packs';",
  "export * as gym from '@/lib/fightGym';",
  "export * as fc from '@/lib/fightCareer';",
  "export { NBA_SALARY_CAP_2026_27, NFL_SALARY_CAP_2026, NHL_UPPER_LIMIT_2026_27, MLB_CBT_THRESHOLD_2026 } from '@/lib/leagueCaps';",
].join('\n'));
const BUNDLE = path.join(TMP, 'bundle.mjs');
const aliases = [`--alias:@/lib/gmFacilities=${enginePath}`, `--alias:@/data/gmFacilities/packs=${packsPath}`, `--alias:@=${ROOT_URL}/src`];
execSync(`"${findEsbuild()}" "${ENTRY}" --bundle --format=esm --platform=node --outfile="${BUNDLE}" --log-level=error ${aliases.join(' ')}`, { stdio: 'inherit' });
const M = await import(pathToFileURL(BUNDLE).href);
const F = M.fac;
const PACKS = Object.values(M.packs.GM_FACILITY_PACKS);

/** A block for this pack with every building at `level`. */
function blockAt(pack, level) {
  const f = F.newFacilities(pack, 3);
  for (const d of pack.facilities) f.levels[d.id] = level;
  return f;
}

/* ---------- 1: every level of every building moves its consumer ---------- */
console.log('\n1. Every level of every building moves what it feeds');
let effectsWalked = 0, stepsWalked = 0;
const flat = [], notNeutral = [], upkeepFlat = [], priceFlat = [], upkeepWrong = [];
for (const pack of PACKS) {
  for (const d of pack.facilities) {
    for (const e of d.effects) {
      effectsWalked += 1;
      if (F.facilityEffect(pack, blockAt(pack, 1), d.id, e.key) !== e.neutral) notNeutral.push(`${pack.id}.${d.id}.${e.key}`);
      for (let l = 2; l <= pack.maxLevel; l += 1) {
        stepsWalked += 1;
        const was = F.facilityEffect(pack, blockAt(pack, l - 1), d.id, e.key);
        const now = F.facilityEffect(pack, blockAt(pack, l), d.id, e.key);
        if (now === was || now === null) flat.push(`${pack.id}.${d.id}.${e.key} ${l - 1}->${l}`);
      }
    }
    for (let l = 1; l <= pack.maxLevel; l += 1) {
      /* The pack's rate for every level ABOVE 1, recomputed here: level 1 is free. */
      const want = Math.round(pack.upkeepPerLevel * (l - 1) * 1000) / 1000;
      if (F.upkeepPerPeriod(pack, blockAt(pack, l), d.id) !== want) upkeepWrong.push(`${pack.id}.${d.id} level ${l}: ${F.upkeepPerPeriod(pack, blockAt(pack, l), d.id)} not ${want}`);
      if (l >= 2 && F.upkeepPerPeriod(pack, blockAt(pack, l), d.id) <= F.upkeepPerPeriod(pack, blockAt(pack, l - 1), d.id)) upkeepFlat.push(`${pack.id}.${d.id} ${l - 1}->${l}`);
    }
    const ladder = F.facilityCostLadder(pack, d.id);
    for (let i = 1; i < ladder.length; i += 1) if (!(ladder[i] > ladder[i - 1])) priceFlat.push(`${pack.id}.${d.id} step ${i + 1}`);
  }
}
console.log(`   ${PACKS.length} packs, ${effectsWalked} effects, ${stepsWalked} steps walked`);
if (PACKS.length !== 7) fail(`expected 7 packs (four front offices, college, gym, Aussie rules), found ${PACKS.length}`);
if (flat.length === 0) ok(`every one of the ${stepsWalked} steps moves its value`);
else fail(`${flat.length} steps change nothing: ${flat.slice(0, 6).join(', ')}`);
if (notNeutral.length === 0) ok('every effect reads exactly neutral at level 1');
else fail(`not neutral at level 1: ${notNeutral.join(', ')}`);
if (upkeepFlat.length === 0) ok('upkeep rises at every level of every building');
else fail(`upkeep does not rise: ${upkeepFlat.slice(0, 6).join(', ')}`);
if (priceFlat.length === 0) ok('every price step is dearer than the one before');
else fail(`price steps not rising: ${priceFlat.slice(0, 6).join(', ')}`);
if (upkeepWrong.length === 0) ok('upkeep is exactly the pack\'s rate for each level above 1: a level 1 building costs nothing');
else fail(`${upkeepWrong.length} levels charge the wrong upkeep: ${upkeepWrong.slice(0, 4).join(', ')}`);

/* ---------- 1b: every seat opens neutral ---------- */
console.log('\n1b. Every pack opens every building at level 1, in every market');
const notNeutralStart = [];
for (const pack of PACKS) {
  for (const tier of [1, 2, 3]) {
    for (const [how, f] of [['new', F.newFacilities(pack, tier)], ['no block', F.facilitiesOf(pack, undefined, tier)]]) {
      const off = pack.facilities.filter(d => f.levels[d.id] !== 1).map(d => `${d.id} ${f.levels[d.id]}`);
      if (off.length || F.upkeepPerPeriod(pack, f) !== 0) notNeutralStart.push(`${pack.id} tier ${tier} (${how}): ${off.join(', ') || 'upkeep'}`);
    }
  }
}
if (notNeutralStart.length === 0) ok(`all ${PACKS.length} packs open level 1 everywhere with no upkeep, new seat or old save, so binding a pack changes nothing for a seat that never builds`);
else fail(`${notNeutralStart.length} openings are not neutral: ${notNeutralStart.slice(0, 4).join('; ')}`);

/* ---------- 1c: the gym's front office through the gym's one decimal reputation ---------- */
console.log('\n1c. The gym\'s front office, a year at a time, through the gym\'s own rounding');
const gymSrc = lf(fs.readFileSync(path.join(ROOT, 'src/lib/fightGym.ts'), 'utf8'));
const DECAY_LINE = 'reputation: clamp(Math.round((next.reputation - 0.08) * 10) / 10, 0, 100),';
if (!gymSrc.includes(DECAY_LINE)) fail('fightGym advanceWeek no longer forgets reputation with the one decimal rule this check models; revisit the gym front office ladder');
const gymPackForRep = M.packs.GYM_FACILITY_PACK;
const repEffect = gymPackForRep.facilities.find(d => d.id === 'frontOffice')?.effects.find(e => e.key === 'repDecayEvery');
const clampN = (v, a, b) => Math.max(a, Math.min(b, v));
/** A year (52 weeks) from 30.0, forgetting 0.1 in a week whose number divides by the cadence, as the gym rounds it. */
function yearLoss(every) {
  let rep = 30;
  for (let w = 1; w <= 52; w += 1) if (w % every === 0) rep = clampN(Math.round((rep - 0.08) * 10) / 10, 0, 100);
  return Math.round((30 - rep) * 10) / 10;
}
const today = (() => { let rep = 30; for (let w = 1; w <= 52; w += 1) rep = clampN(Math.round((rep - 0.08) * 10) / 10, 0, 100); return Math.round((30 - rep) * 10) / 10; })();
const losses = [];
const repMisses = [];
if (!repEffect) repMisses.push('the gym front office has no repDecayEvery effect');
else {
  for (let l = 1; l <= gymPackForRep.maxLevel; l += 1) {
    const v = F.effectValueAt(repEffect, l);
    if (!Number.isInteger(v) || v < 1) { repMisses.push(`level ${l} cadence ${v} is not a whole number of weeks`); continue; }
    losses.push(yearLoss(v));
    if (l === 1 && losses[0] !== today) repMisses.push(`level 1 loses ${losses[0]} a year, the gym today loses ${today}`);
    if (l >= 2 && !(losses[l - 1] < losses[l - 2])) repMisses.push(`level ${l - 1}->${l} loses ${losses[l - 2]} then ${losses[l - 1]}`);
  }
}
console.log(`   a year of reputation lost by level: ${losses.join(', ')} (the gym today: ${today})`);
if (repMisses.length === 0) ok('every level of the gym front office forgets less, and level 1 is the gym as it is');
else fail(repMisses.join('; '));

/* ---------- 1d: the ladder is Club Manager's ---------- */
console.log('\n1d. The ten level steps and the shared effect steps are Club Manager\'s');
const cmFac = lf(fs.readFileSync(path.join(ROOT, 'src/lib/clubManagerFacilities.ts'), 'utf8'));
const listOf = (s, re) => { const m = s.match(re); return m ? m[1].split(',').map(x => Number(x.trim())) : null; };
const cmSteps = listOf(cmFac, /const COST_STEP = \[([\d, ]+)\];/);
const ourSteps = listOf(src.packs, /const TEN_LEVEL_STEPS = \[([\d, ]+)\];/);
const numOf = (re) => { const m = cmFac.match(re); return m ? Number(m[1]) : NaN; };
const cmGrowth = numOf(/return 1 \+ ([\d.]+) \* \(facilityLevel\(state, 'trainingGround'\) - 1\);/);
const cmMedical = numOf(/const mult = 1 - ([\d.]+) \* \(facilityLevel\(state, 'medical'\) - 1\);/);
const cmGround = numOf(/return 1 \+ ([\d.]+) \* \(clamp\(level, 1, FACILITY_MAX\) - 1\);/);
const stepOf = (packId, facId, key) => M.packs.GM_FACILITY_PACKS[packId].facilities.find(d => d.id === facId)?.effects.find(e => e.key === key)?.step;
const cmMisses = [];
if (!cmSteps || !ourSteps || JSON.stringify(cmSteps) !== JSON.stringify(ourSteps)) cmMisses.push(`cost steps: Club Manager ${JSON.stringify(cmSteps)}, packs ${JSON.stringify(ourSteps)}`);
if (stepOf('nfl', 'training', 'growthMult') !== cmGrowth) cmMisses.push(`growth step ${stepOf('nfl', 'training', 'growthMult')} against Club Manager's ${cmGrowth}`);
if (stepOf('nfl', 'medical', 'injurySpellMult') !== -cmMedical) cmMisses.push(`injury step ${stepOf('nfl', 'medical', 'injurySpellMult')} against Club Manager's -${cmMedical}`);
if (stepOf('college', 'stadium', 'crowdMult') !== cmGround) cmMisses.push(`ground step ${stepOf('college', 'stadium', 'crowdMult')} against Club Manager's ${cmGround}`);
if (cmMisses.length === 0) ok(`cost steps ${JSON.stringify(ourSteps)} and the growth ${cmGrowth}, injury ${cmMedical} and ground ${cmGround} steps match Club Manager's`);
else fail(cmMisses.join('; '));

/* ---------- 2: a full build out costs more than one good season ---------- */
console.log('\n2. A full build out costs more than the money one season can put into buildings');
const { gym, fc } = M;
const TACTICS = ['box', 'press', 'counter', 'brawl'];
const bestTactic = (style) => TACTICS.find(t => fc.tacticEdge(t, style) > 0) || 'box';
const styleThatBeats = (t) => ['outboxer', 'swarmer', 'slugger', 'counter'].find(s => fc.tacticEdge(t, s) < 0);
function smartLine(style, n) {
  const out = [];
  let expect = style;
  for (let i = 0; i < n; i += 1) {
    const t = bestTactic(expect);
    out.push(t);
    expect = styleThatBeats(t) || style;
  }
  return out;
}
/** simFightGym's careful policy, three years; the purse cuts of each 52 week year. */
function gymYears(seed) {
  let g = gym.newGym(`G${seed}`, `gymseed-${seed}`);
  for (let w = 0; w < 156 && !g.closed; w += 1) {
    for (const f of g.roster.slice()) if (f.damage >= 52) { const r = gym.releaseFighter(g, f.id); if (r) g = r; }
    if (g.roster.length < 4) {
      const affordable = g.prospects.filter(p => p.fee <= g.money * 0.6);
      if (affordable.length) { const s = gym.signProspect(g, affordable[affordable.length - 1].id); if (s) g = s; }
    }
    const able = g.roster.filter(f => f.damage < 80).sort((a, b) => a.damage - b.damage);
    if (able.length) {
      const offers = gym.offersForFighter(g, able[0].id);
      if (offers.length) {
        const o = offers[Math.min(1, offers.length - 1)];
        const res = gym.takeGymFight(g, able[0].id, o, smartLine(o.opponent.style, o.rounds));
        if (res) g = res.state;
      }
    } else if (g.money > gym.TRAIN_COST * 3 && g.roster.length) {
      const t = gym.trainFighter(g, g.roster[0].id);
      if (t) g = t;
    }
    g = gym.advanceWeek(g);
  }
  const years = [0, 0, 0];
  for (const h of g.history) { const y = Math.floor((h.week - 1) / 52); if (y >= 0 && y < 3) years[y] += h.cut; }
  return { years: years.map(x => Math.round(x * 1000) / 1000), closed: g.closed };
}
const GYM_SEEDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const third = [], first = [], second = [];
let closedGyms = 0;
for (const s of GYM_SEEDS) { const r = gymYears(s); first.push(r.years[0]); second.push(r.years[1]); third.push(r.years[2]); if (r.closed) closedGyms += 1; }
const mean = (a) => a.reduce((n, x) => n + x, 0) / a.length;
const sorted = third.slice().sort((a, b) => a - b);
console.log(`   fight gym, careful policy, purse cuts by year over ${GYM_SEEDS.length} seeds: first ${mean(first).toFixed(3)}M, second ${mean(second).toFixed(3)}M, third ${mean(third).toFixed(3)}M (median ${sorted[Math.floor(sorted.length / 2)].toFixed(3)}M), ${closedGyms} gyms closed`);
console.log(`   third years: ${third.map(x => x.toFixed(2)).join(' ')}`);
const gymPack = M.packs.GYM_FACILITY_PACK;
/* GYM band. Measured 2026-10-02 over these ten seeds: first year 6.486M,
   second 16.641M, third 12.780M (one gym closed and earned nothing in its
   third; the other nine took 10.1 to 17.1M). The declared good season must
   sit at or above the mean of BOTH established years, so the build out is
   never held against an underestimate; the pack declares 18. */
const established = Math.max(mean(second), mean(third));
if (gymPack.goodSeasonIncome >= established) ok(`the gym's declared good season (${gymPack.goodSeasonIncome}M) sits at or above the measured mean established year (${established.toFixed(3)}M)`);
else fail(`the gym earns ${established.toFixed(3)}M in an established year, above the ${gymPack.goodSeasonIncome}M its pack declares`);
/* Where each pack's season number comes from: measured by a harness, or only declared by the pack. */
const HOW = { nfl: 'measured in simGmBooks', nba: 'measured in simGmBooks', nhl: 'measured in simGmBooks', mlb: 'measured in simGmBooks', gym: 'measured above', college: 'DECLARED, owed by the binding round', aussie: 'DECLARED, owed by the binding round' };
for (const pack of PACKS) {
  const cost = F.fullBuildOutCost(pack);
  const margin = cost / pack.goodSeasonIncome;
  console.log(`   ${pack.id}: full build out ${cost.toFixed(3)} ${pack.unit}, a season's building money ${pack.goodSeasonIncome} ${pack.unit} (${HOW[pack.id] ?? 'unknown source'}), ${margin.toFixed(2)}x`);
  if (!HOW[pack.id]) fail(`${pack.id}: nobody says where its season number comes from`);
  if (cost > pack.goodSeasonIncome) ok(`${pack.id}: a full build out costs ${margin.toFixed(2)} seasons of building money`);
  else fail(`${pack.id}: a full build out (${cost.toFixed(3)}) costs no more than one season's building money (${pack.goodSeasonIncome})`);
}

/* ---------- 3: an upgrade takes its build time ---------- */
console.log('\n3. Every build takes its build time, one at a time, and the summer finishes it');
let builds = 0;
const early = [], late = [], doubled = [], summer = [];
for (const pack of PACKS) {
  for (const d of pack.facilities) {
    for (let l = 1; l < pack.maxLevel; l += 1) {
      builds += 1;
      const start = F.startUpgrade(pack, blockAt(pack, l), d.id, 1e9);
      if (!start) { late.push(`${pack.id}.${d.id} ${l} refused`); continue; }
      const other = pack.facilities.find(x => x.id !== d.id);
      if (other && F.startUpgrade(pack, start.state, other.id, 1e9)) doubled.push(`${pack.id}.${d.id} ${l}`);
      const kept = F.rolloverFacilities(pack, start.state, false);
      if (!kept || kept.levels[d.id] !== l + 1 || kept.build !== null || kept.seasonSpend !== 0) summer.push(`${pack.id}.${d.id} ${l}`);
      let f = start.state;
      const need = pack.buildPeriods[l - 1];
      for (let t = 1; t <= need; t += 1) {
        f = F.tickFacilities(pack, f).state;
        if (t < need && f.levels[d.id] !== l) early.push(`${pack.id}.${d.id} ${l}->${l + 1} after ${t} of ${need}`);
      }
      if (f.levels[d.id] !== l + 1) late.push(`${pack.id}.${d.id} ${l}->${l + 1}`);
    }
  }
}
const multiPeriod = PACKS.reduce((n, p) => n + p.buildPeriods.filter(x => x > 1).length * p.facilities.length, 0);
console.log(`   ${builds} builds walked, ${multiPeriod} of them longer than one period`);
if (multiPeriod < builds / 2) fail(`only ${multiPeriod} of ${builds} builds take more than a period, so the timing check barely tests anything`);
if (early.length === 0) ok('no level opens before its build time');
else fail(`${early.length} levels opened early: ${early.slice(0, 5).join(', ')}`);
if (late.length === 0) ok('every level opens exactly when its build time runs out');
else fail(`${late.length} levels did not open on time: ${late.slice(0, 5).join(', ')}`);
if (doubled.length === 0) ok('a second project never starts while one is under way');
else fail(`${doubled.length} second projects started: ${doubled.slice(0, 5).join(', ')}`);
if (summer.length === 0) ok('the summer finishes a build in progress and resets the season\'s spend');
else fail(`the summer mishandled ${summer.length} builds: ${summer.slice(0, 5).join(', ')}`);

fs.rmSync(TMP, { recursive: true, force: true });
console.log(`\nsimGmFacilities: ${failures === 0 ? 'ALL GREEN' : `${failures} FAILURE(S)`}${CONTROL ? ` (control ${CONTROL})` : ''}`);
process.exit(failures === 0 ? 0 : 1);
