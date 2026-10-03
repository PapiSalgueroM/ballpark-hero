/* Round 943: the facility ladder for every manager seat
   (src/lib/gmFacilities.ts, packs in src/data/gmFacilities/packs.ts).

   1. Every level of every building in every pack moves its consumer value
      at every step, read through facilityEffect on a real block at that
      level, and level 1 reads exactly neutral. The upkeep the books charge
      moves at every step too, and every price step is dearer than the one
      before it.
   2. A full build out costs more than one good season's income on that
      pack's scale, so it stays a choice. For the four front offices the
      good season is FO_GOOD_SEASON_SHARE of the cap, which simGmBooks
      measures and holds; for the fight gym it is measured here, by running
      src/lib/fightGym.ts with simFightGym's careful policy for three years
      and reading the third year's purse cuts (an established gym), and the
      pack's declared number must sit at or above that mean. College and
      Australian football keep no money yet, so their declared number is
      the game scale the pack states, and the check holds the ladder to it.
   3. An upgrade takes its build time: a level opens after exactly the
      pack's build periods, never sooner, one project at a time, and the
      summer finishes what is under way.

   Measured on 2026-10-02 (printed again on every run): 7 packs, 28
   effects, 232 steps, every one moving; full build outs of 1.08 to 1.09
   good seasons for the four front offices (0.7595 caps against 0.7),
   5.97 for college, 1.34 for the gym (24.1M against 18M, the gym's
   established years measured at 16.6M and 12.8M), 4.08 for Aussie rules;
   223 builds walked, 171 longer than one period.

   Controls (GMFAC_CONTROL), each asserting its anchor exists first:
     flatladder  the front office training centre stops growing anything: section 1 must fail.
     cheapgym    the gym's ladder costs next to nothing: section 2 must fail.
     instant     every build finishes in one period: section 3 must fail.
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
const flat = [], notNeutral = [], upkeepFlat = [], priceFlat = [];
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
    for (let l = 2; l <= pack.maxLevel; l += 1) {
      if (F.upkeepPerPeriod(pack, blockAt(pack, l), d.id) <= F.upkeepPerPeriod(pack, blockAt(pack, l - 1), d.id)) upkeepFlat.push(`${pack.id}.${d.id} ${l - 1}->${l}`);
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

/* ---------- 2: a full build out costs more than one good season ---------- */
console.log('\n2. A full build out costs more than one good season\'s income');
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
for (const pack of PACKS) {
  const cost = F.fullBuildOutCost(pack);
  const margin = cost / pack.goodSeasonIncome;
  console.log(`   ${pack.id}: full build out ${cost.toFixed(3)} ${pack.unit}, good season ${pack.goodSeasonIncome} ${pack.unit}, ${margin.toFixed(2)}x`);
  if (cost > pack.goodSeasonIncome) ok(`${pack.id}: a full build out costs ${margin.toFixed(2)} good seasons`);
  else fail(`${pack.id}: a full build out (${cost.toFixed(3)}) costs no more than one good season (${pack.goodSeasonIncome})`);
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
