/**
 * ROUND 720: CONTRACT CHAOS, THE HARNESS.
 *
 * Contract Chaos (src/lib/contractChaos.ts) deals a generated footballer's
 * offer window off the shared free agency engine, then plays each offer out
 * over five seasons and scores the career. This holds it to what the game
 * promises, measured over many deals rather than asserted on one:
 *
 *   1. SEEDED. The same seed deals the same player, offers, push results and
 *      five seasons; two different days deal different players.
 *   2. GENERATED ONLY. Every club in every deal is one of Stadium Tycoon's
 *      generated names and every player one of intlNames' generated names,
 *      the two banks whose own harnesses prove no real club or player is in
 *      them.
 *   3. THE MARKET IS HONEST. Across outside offers, title chasers pay the
 *      least against the market and rebuilds the most, the shared engine's
 *      rule, and the chasers really are the stronger clubs.
 *   4. POTENTIAL IS A CEILING. No season of any career ends above the
 *      player's potential (the Rounds 96 and 116 regression).
 *   5. THE ROLE IS REAL. Starter seasons get more minutes than rotation
 *      seasons, and rotation more than squad seasons, by measured margins.
 *   6. THE CHOICE MATTERS. Across deals, the gap between the best and the
 *      worst offer's score is wide on average, and no single rule of thumb
 *      (take the most money, take the strongest club, stay put) is the right
 *      answer every time.
 *   7. THE SCORE. Every score is a whole number from 0 to 100, every part is
 *      inside its cap, and every daily for a year has an offer worth taking.
 *
 * NEGATIVE CONTROLS (CONTRACT_CHAOS_CONTROL). Each edits only the in memory
 * copy of the lib that gets bundled, refuses to run if its anchor is missing,
 * and must turn exactly its own section red:
 *   unseeded   the playout draws from Math.random          section 1
 *   realclub   the club bank is swapped for a real list     section 2
 *   flatmarket every kind of club pays the same share       section 3
 *   headroom   the potential clamp is removed               section 4
 *   flatrole   every role plays the same minutes            section 5
 *   onedeal    every offer plays out as the first one       section 6
 * Under a control the harness exits 1 when exactly the predicted section is
 * red (the break was caught) and 2 when it is not (the control proves nothing).
 *
 * Run: node scripts/simContractChaos.mjs
 */
import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LIB = path.join(ROOT, 'src/lib/contractChaos.ts');
const FA = path.join(ROOT, 'src/lib/usCareerFreeAgency.ts');

/* A worktree inside the repo has no node_modules of its own: walk up. */
function findUp(rel) {
  let dir = ROOT;
  for (let i = 0; i < 6; i += 1) {
    const p = path.join(dir, rel);
    if (fs.existsSync(p)) return p;
    dir = path.dirname(dir);
  }
  return null;
}
const esbuildPkg = findUp('node_modules/esbuild/package.json');
if (!esbuildPkg) { console.error('simContractChaos: cannot run: esbuild not found'); process.exit(2); }
const esbuild = createRequire(esbuildPkg)('esbuild');

const CONTROLS = {
  unseeded: { file: 'lib', section: 1, from: 'const rng = mulberry32(hash32(deal.seed, 4, strHash(o.fa.team)));', to: 'const rng = Math.random;' },
  realclub: { file: 'lib', section: 2, from: 'const bank = allOpponentNames();', to: "const bank = ['Arsenal', 'Real Madrid', 'Juventus', 'Ajax', 'Benfica', 'Celtic', 'Porto', 'Lyon'];" },
  flatmarket: { file: 'fa', section: 3, from: 'const TIER_MONEY: Record<FaTier, [number, number]> = {', to: 'const TIER_MONEY_UNUSED: Record<FaTier, [number, number]> = {' , extra: "\nconst TIER_MONEY: Record<FaTier, [number, number]> = { contender: [0.95, 1.07], playoff: [0.95, 1.07], rebuild: [0.95, 1.07] };\n" },
  headroom: { file: 'lib', section: 4, from: 'ovr = clamp(ovr, 40, p.pot);', to: 'ovr = clamp(ovr, 40, 99);' },
  flatrole: { file: 'lib', section: 5, from: 'const ROLE_MINUTES: Record<Role, number> = { starter: 0.86, rotation: 0.55, squad: 0.22 };', to: 'const ROLE_MINUTES: Record<Role, number> = { starter: 0.86, rotation: 0.86, squad: 0.86 };' },
  onedeal: { file: 'lib', section: 6, from: 'const o = deal.offers[index];', to: 'const o = deal.offers[0];' },
};
const CONTROL = process.env.CONTRACT_CHAOS_CONTROL || '';
if (CONTROL && !CONTROLS[CONTROL]) {
  console.error(`CONTRACT_CHAOS_CONTROL=${CONTROL} is not a control this harness knows (${Object.keys(CONTROLS).join(', ')})`);
  process.exit(2);
}

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'simContractChaos-'));
const ENTRY = path.join(TMP, 'entry.mjs');
const BUNDLE = path.join(TMP, 'bundle.mjs');
const rel = p => p.replaceAll('\\', '/');
fs.writeFileSync(ENTRY, [
  `export * from '${rel(LIB)}';`,
  `export { allOpponentNames } from '${rel(path.join(ROOT, 'src/lib/stadiumTycoon.ts'))}';`,
  `export { allIntlNames } from '${rel(path.join(ROOT, 'src/lib/intlNames.ts'))}';`,
].join('\n'));

let controlHit = false;
const controlPlugin = {
  name: 'control',
  setup(build) {
    if (!CONTROL) return;
    const c = CONTROLS[CONTROL];
    const target = c.file === 'lib' ? LIB : FA;
    const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const base = path.basename(target);
    build.onLoad({ filter: new RegExp(`${esc(base)}$`) }, args => {
      if (path.resolve(args.path) !== path.resolve(target)) return undefined;
      let src = fs.readFileSync(args.path, 'utf8');
      if (!src.includes(c.from)) {
        console.error(`control ${CONTROL} cannot run: its anchor is not in ${base}`);
        process.exit(2);
      }
      const before = src;
      src = src.replace(c.from, c.to) + (c.extra ?? '');
      if (src !== before) controlHit = true;
      return { contents: src, loader: 'ts' };
    });
  },
};

await esbuild.build({
  entryPoints: [ENTRY],
  bundle: true,
  format: 'esm',
  platform: 'node',
  outfile: BUNDLE,
  logLevel: 'error',
  tsconfig: path.join(ROOT, 'tsconfig.json'),
  plugins: [controlPlugin],
});
if (CONTROL && !controlHit) { console.error(`control ${CONTROL} changed nothing`); process.exit(2); }
if (CONTROL) console.log(`   NEGATIVE CONTROL ON: ${CONTROL}, section ${CONTROLS[CONTROL].section} must go red`);
const C = await import(pathToFileURL(BUNDLE).href);
fs.rmSync(TMP, { recursive: true, force: true });

const red = new Set();
let section = 0;
const fail = m => { red.add(section); console.error(`  FAIL (section ${section}): ${m}`); };
const head = (n, t) => { section = n; console.log(`${n}) ${t}`); };
const mean = a => a.reduce((x, y) => x + y, 0) / Math.max(1, a.length);

const N = 1500;
const seeds = Array.from({ length: N }, (_, i) => C.freeSeed(((i * 2654435761) % 1000003) / 1000003));
const deals = seeds.map(s => C.buildDeal(s));
const outcomes = deals.map(d => C.allOutcomes(d));

head(1, 'seeded: the same seed is the same game, different days differ');
{
  let mismatch = 0;
  for (let i = 0; i < 200; i += 1) {
    const a = JSON.stringify([C.buildDeal(seeds[i]), C.allOutcomes(C.buildDeal(seeds[i]))]);
    const b = JSON.stringify([deals[i], outcomes[i]]);
    if (a !== b) mismatch += 1;
    const p1 = JSON.stringify(C.pushOffer(deals[i], 1));
    const p2 = JSON.stringify(C.pushOffer(C.buildDeal(seeds[i]), 1));
    if (p1 !== p2) mismatch += 1;
  }
  const days = [];
  for (let d = 0; d < 60; d += 1) {
    const dt = new Date(Date.UTC(2026, 9, 1 + d)).toISOString().slice(0, 10);
    days.push(C.buildDeal(C.dailySeed(dt)).player.name + '|' + C.buildDeal(C.dailySeed(dt)).offers.map(o => o.fa.label).join(','));
  }
  const distinct = new Set(days).size;
  console.log(`   ${mismatch} replays of 400 differed; ${distinct} distinct deals over 60 days`);
  if (mismatch > 0) fail(`${mismatch} replays of the same seed came out different`);
  if (distinct < 58) fail(`only ${distinct} distinct daily deals in 60 days`);
}

head(2, 'generated only: every club and every player comes from a generated bank');
{
  const clubs = new Set(C.allOpponentNames());
  const people = new Set(C.allIntlNames());
  let badClub = 0; let badName = 0; const examples = [];
  deals.forEach((d, i) => {
    if (!people.has(d.player.name)) { badName += 1; examples.push(d.player.name); }
    for (const o of d.offers) if (!clubs.has(o.fa.label)) { badClub += 1; examples.push(o.fa.label); }
    for (const out of outcomes[i]) for (const s of out.seasons) if (!clubs.has(s.club)) { badClub += 1; examples.push(s.club); }
  });
  console.log(`   ${badClub} club names and ${badName} player names outside the generated banks`);
  if (badClub || badName) fail(`not generated: ${[...new Set(examples)].slice(0, 5).join(', ')}`);
}

head(3, 'the market is honest: chasers pay least, rebuilds most, chasers are stronger');
{
  const share = { contender: [], playoff: [], rebuild: [] };
  const quality = { contender: [], playoff: [], rebuild: [] };
  for (const d of deals) for (const o of d.offers) {
    if (o.fa.incumbent) continue;
    share[o.fa.tier].push(o.fa.salary / d.market);
    quality[o.fa.tier].push(o.fa.quality);
  }
  const s = Object.fromEntries(Object.entries(share).map(([k, v]) => [k, mean(v)]));
  const q = Object.fromEntries(Object.entries(quality).map(([k, v]) => [k, mean(v)]));
  console.log(`   salary over market: chasers ${s.contender.toFixed(3)}, top half ${s.playoff.toFixed(3)}, rebuild ${s.rebuild.toFixed(3)}; strength ${q.contender.toFixed(1)}, ${q.playoff.toFixed(1)}, ${q.rebuild.toFixed(1)}`);
  if (!(s.rebuild - s.playoff >= 0.08)) fail(`rebuilds pay ${s.rebuild.toFixed(3)} of market against ${s.playoff.toFixed(3)} for the top half, wanted a gap of 0.08 or more`);
  if (!(s.playoff - s.contender >= 0.08)) fail(`the top half pays ${s.playoff.toFixed(3)} against ${s.contender.toFixed(3)} for chasers, wanted a gap of 0.08 or more`);
  if (!(q.contender - q.rebuild >= 15)) fail(`chasers are only ${(q.contender - q.rebuild).toFixed(1)} stronger than rebuilds`);
}

head(4, 'potential is a ceiling: no season ends above it');
{
  let over = 0; let grew = 0;
  deals.forEach((d, i) => {
    for (const out of outcomes[i]) for (const s of out.seasons) {
      if (s.ovr > d.player.pot) over += 1;
      if (s.ovr > s.ovrStart) grew += 1;
    }
  });
  console.log(`   ${over} seasons above potential, ${grew} seasons of growth`);
  if (over > 0) fail(`${over} seasons ended above the player's potential`);
  if (grew < 1000) fail(`only ${grew} seasons of growth, so this check measured nothing`);
}

head(5, 'the role is real: starters play more than rotation, rotation more than squad');
{
  const by = { starter: [], rotation: [], squad: [] };
  for (const outs of outcomes) for (const out of outs) for (const s of out.seasons) by[s.role].push(s.minutes);
  const m = Object.fromEntries(Object.entries(by).map(([k, v]) => [k, mean(v)]));
  console.log(`   mean minutes: starter ${m.starter.toFixed(3)} (${by.starter.length}), rotation ${m.rotation.toFixed(3)} (${by.rotation.length}), squad ${m.squad.toFixed(3)} (${by.squad.length})`);
  if (!(m.starter - m.rotation >= 0.15)) fail(`starters play only ${(m.starter - m.rotation).toFixed(3)} more than rotation`);
  if (!(m.rotation - m.squad >= 0.15)) fail(`rotation plays only ${(m.rotation - m.squad).toFixed(3)} more than squad`);
}

head(6, 'the choice matters and no rule of thumb always wins');
{
  const gaps = []; let moneyBest = 0; let strongBest = 0; let stayBest = 0; let multi = 0;
  deals.forEach((d, i) => {
    if (d.offers.length < 2) return;
    multi += 1;
    const sc = outcomes[i].map(o => o.score);
    const best = Math.max(...sc);
    gaps.push(best - Math.min(...sc));
    const byMoney = d.offers.map((o, k) => [C.totalValue(o), k]).sort((a, b) => b[0] - a[0])[0][1];
    const byStrength = d.offers.map((o, k) => [o.fa.quality, k]).sort((a, b) => b[0] - a[0])[0][1];
    if (sc[byMoney] === best) moneyBest += 1;
    if (sc[byStrength] === best) strongBest += 1;
    if (sc[0] === best) stayBest += 1;
  });
  const g = mean(gaps);
  const r = x => x / Math.max(1, multi);
  console.log(`   mean best to worst gap ${g.toFixed(1)} over ${multi} deals; the best offer was the most money ${(100 * r(moneyBest)).toFixed(0)}%, the strongest club ${(100 * r(strongBest)).toFixed(0)}%, staying ${(100 * r(stayBest)).toFixed(0)}%`);
  if (!(g >= 12)) fail(`the best and worst offers are only ${g.toFixed(1)} points apart on average`);
  for (const [label, v] of [['the most money', moneyBest], ['the strongest club', strongBest], ['staying put', stayBest]]) {
    if (r(v) > 0.75) fail(`${label} was the best choice in ${(100 * r(v)).toFixed(0)}% of deals, so the game has one answer`);
  }
}

head(7, 'the score: whole, inside 0 to 100, parts capped, every daily winnable');
{
  let bad = 0;
  for (const outs of outcomes) for (const o of outs) {
    const p = o.parts;
    if (!Number.isInteger(o.score) || o.score < 0 || o.score > 100) bad += 1;
    if (p.growth < 0 || p.growth > 30 || p.minutes < 0 || p.minutes > 25 || p.trophies < 0 || p.trophies > 25 || p.money < 0 || p.money > 20) bad += 1;
    if (p.growth + p.minutes + p.trophies + p.money !== o.score) bad += 1;
  }
  const bestDaily = []; let thin = 0;
  for (let d = 0; d < 365; d += 1) {
    const dt = new Date(Date.UTC(2026, 9, 1 + d)).toISOString().slice(0, 10);
    const deal = C.buildDeal(C.dailySeed(dt));
    if (deal.offers.length < 2) thin += 1;
    bestDaily.push(Math.max(...C.allOutcomes(deal).map(o => o.score)));
  }
  bestDaily.sort((a, b) => a - b);
  const p10 = bestDaily[Math.floor(bestDaily.length * 0.1)];
  const under = bestDaily.filter(x => x < 40).length;
  console.log(`   ${bad} bad scores; over 365 dailies the best offer scores ${bestDaily[0]} at the lowest, ${p10} at the 10th percentile, ${under} days under 40; ${thin} days with one offer`);
  if (bad) fail(`${bad} scores broke the 0 to 100 rules`);
  if (thin) fail(`${thin} dailies dealt a single offer, which is no choice`);
  if (under > 18) fail(`${under} of 365 dailies have no offer worth 40, wanted 18 or fewer`);
}

const reds = [...red].sort();
if (CONTROL) {
  const want = CONTROLS[CONTROL].section;
  if (reds.length === 1 && reds[0] === want) {
    console.log(`control ${CONTROL}: exactly section ${want} went red, the check works`);
    process.exit(1);
  }
  console.error(`control ${CONTROL}: expected only section ${want} red, got [${reds.join(', ')}], the control proves nothing`);
  process.exit(2);
}
if (reds.length) {
  console.error(`simContractChaos: ${reds.length} section(s) red: ${reds.join(', ')}`);
  process.exit(1);
}
console.log('simContractChaos: all 7 sections green');
