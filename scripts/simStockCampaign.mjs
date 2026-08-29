/* Player Stock Market, Round 329: the anonymous campaign holds its own laws.
 *
 * The owner's spec: start seasons back, move year by year, show stats only,
 * never name, country or club, buy position by position until a full XI.
 *
 * WHAT IT HOLDS. The engine (assembleCampaign and the scoring) is PURE over
 * injected rows, so this harness drives it with SYNTHETIC fixture rows,
 * invented names like "Fixture Forward 041" that ship nowhere; the real
 * game's rows come from player_market_values at runtime. The laws:
 *   1. ASSEMBLY, over 200 seeds: eleven slots in formation order, four
 *      candidates each, nobody dealt twice, two buys a year across six
 *      years, every candidate priced at the offer year and resolvable at
 *      the final year, every candidate actually fitting its slot;
 *   2. THE LOCK PROOF: the punts of all eleven slots always fit the 200M
 *      wallet together, and a greedy buyer who always takes the most
 *      expensive candidate canAfford allows finishes all eleven buys with
 *      the wallet never below zero, over every seed;
 *   3. DETERMINISM: one seed, one campaign, byte identical;
 *   4. SCORING IDENTITIES: buying every slot's best ratio scores exactly
 *      100, every slot's worst exactly 0, and a mixed XI lands between;
 *   5. ANONYMITY IS ENFORCED IN THE PAGE: the buying screen's source
 *      renders no candidate name, nationality or club (comment stripped),
 *      while the reveal does name every pick.
 *
 * NEGATIVE CONTROL: SIM_STOCK_CONTROL=leaky injects a name render into a
 * copy of the buying block and section 5 must go red, proving the check
 * reads what the screen would actually show.
 *
 * Run: node scripts/simStockCampaign.mjs
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..').replace(/\\/g, '/');
let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };
const CONTROL = process.env.SIM_STOCK_CONTROL || '';
if (CONTROL && CONTROL !== 'leaky') { console.error(`SIM_STOCK_CONTROL=${CONTROL} is not a control this harness knows`); process.exit(1); }

const TMP = os.tmpdir().replace(/\\/g, '/');
const ENTRY = `${TMP}/stockCampaign.entry.mjs`;
const BUNDLE = `${TMP}/stockCampaign.bundle.mjs`;
fs.writeFileSync(ENTRY, `
export * as sm from '${ROOT}/src/lib/playerStockMarket.ts';
`);
execSync(`${ROOT}/node_modules/.bin/esbuild ${ENTRY} --bundle --format=esm --platform=node --outfile=${BUNDLE} --log-level=error --alias:@=${ROOT}/src`, { stdio: 'inherit' });
const store = new Map();
globalThis.localStorage = { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k), clear: () => store.clear() };
const { sm } = await import(pathToFileURL(BUNDLE).href);
const {
  CANDIDATES_PER_SLOT, FINAL_YEAR, STOCK_BUDGET, STOCK_FORMATION,
  assembleCampaign, canAfford, offerYearFor, puntPriceOf, scoreCampaign, startYearFor,
} = sm;

/* Synthetic fixture rows: 40 players per position vocabulary entry, values
   walking a seeded path 2014..2026. Invented names, shipped nowhere. */
function lehmer(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}
const POSITIONS = ['GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'LW', 'RW', 'ST', 'CF'];
function fixtureRows(seed) {
  const rng = lehmer(seed);
  const rows = [];
  let id = 0;
  for (const pos of POSITIONS) {
    for (let n = 0; n < 40; n += 1) {
      id += 1;
      const name = `Fixture ${pos} ${id}`;
      let value = 2_000_000 + Math.floor(rng() * 60_000_000);
      const age0 = 17 + Math.floor(rng() * 12);
      for (let year = 2014; year <= 2026; year += 1) {
        value = Math.max(500_000, Math.round(value * (0.75 + rng() * 0.6)));
        rows.push({
          player_name: name, club: 'Fixture FC', position: pos, age: age0 + (year - 2014),
          nationality: 'Fixtureland', year, market_value_usd: value,
          goals: Math.floor(rng() * 20), assists: Math.floor(rng() * 12),
        });
      }
    }
  }
  return rows;
}
const ROWS = fixtureRows(4242);

if (CONTROL !== 'leaky') {
  console.log('1) assembly law, 200 seeds');
  {
    let bad = 0;
    for (let seed = 1; seed <= 200; seed += 1) {
      const c = assembleCampaign(ROWS, seed);
      if (!c) { bad += 1; if (bad <= 3) fail(`seed ${seed}: no campaign assembled`); continue; }
      if (c.slots.length !== STOCK_FORMATION.slots.length) fail(`seed ${seed}: ${c.slots.length} slots`);
      const names = new Set();
      c.slots.forEach((s, i) => {
        if (s.offerYear !== offerYearFor(c.startYear, i)) fail(`seed ${seed}: slot ${i} offered in ${s.offerYear}`);
        if (s.candidates.length !== CANDIDATES_PER_SLOT) fail(`seed ${seed}: slot ${i} dealt ${s.candidates.length}`);
        for (const cand of s.candidates) {
          if (names.has(cand.name)) fail(`seed ${seed}: ${cand.name} dealt twice`);
          names.add(cand.name);
          if (!(cand.price > 0) || !(cand.final > 0)) fail(`seed ${seed}: a candidate without a price or a final value`);
          if (cand.series.length === 0 || cand.series[cand.series.length - 1].year !== s.offerYear) fail(`seed ${seed}: a series not ending at the offer year`);
          if (!(s.slot.allowed).includes(cand.position)) fail(`seed ${seed}: a ${cand.position} dealt for ${s.slot.label}`);
        }
      });
    }
    if (bad === 0) console.log('   200 campaigns: 11 slots, 4 fitting candidates each, nobody twice, two buys a year, every card resolvable');
  }

  console.log('2) the lock proof: the wallet can always finish');
  {
    let broke = 0;
    for (let seed = 1; seed <= 200; seed += 1) {
      const c = assembleCampaign(ROWS, seed);
      if (!c) continue;
      const puntTotal = c.slots.reduce((s, slot) => s + puntPriceOf(slot), 0);
      if (puntTotal > STOCK_BUDGET) { broke += 1; fail(`seed ${seed}: the punts alone cost ${puntTotal}`); continue; }
      let remaining = STOCK_BUDGET;
      for (let i = 0; i < c.slots.length; i += 1) {
        const affordable = c.slots[i].candidates.filter(x => canAfford(c, i, x, remaining));
        if (affordable.length === 0) { broke += 1; fail(`seed ${seed}: slot ${i} has nothing affordable with ${remaining} left`); break; }
        const splashiest = affordable.sort((a, b) => b.price - a.price)[0];
        remaining -= splashiest.price;
        if (remaining < 0) { broke += 1; fail(`seed ${seed}: the wallet went to ${remaining}`); break; }
      }
    }
    if (broke === 0) console.log('   200 greedy runs: the punts always fit the wallet and the splashiest affordable buy never strands a later slot');
  }

  console.log('3) determinism');
  {
    const fp = c => c.startYear + '|' + c.slots.map(s => s.candidates.map(x => `${x.name}:${x.price}`).join(',')).join(';');
    const a = assembleCampaign(ROWS, 777);
    const b = assembleCampaign(ROWS, 777);
    if (!a || !b || fp(a) !== fp(b)) fail('the same seed assembled two different campaigns');
    const yearsSeen = new Set();
    for (let seed = 1; seed <= 25; seed += 1) yearsSeen.add(startYearFor(seed));
    if (yearsSeen.size < 4) fail(`only ${yearsSeen.size} distinct start years across 25 seeds`);
    console.log(`   one seed one campaign, ${yearsSeen.size} distinct start years in 25 seeds`);
  }

  console.log('4) scoring identities');
  {
    const c = assembleCampaign(ROWS, 31337);
    if (!c) { fail('no campaign for the scoring fixture'); }
    else {
      const ratio = x => x.final / x.price;
      const bestXi = c.slots.map(s => [...s.candidates].sort((a, b) => ratio(b) - ratio(a))[0]);
      const worstXi = c.slots.map(s => [...s.candidates].sort((a, b) => ratio(a) - ratio(b))[0]);
      const mixed = c.slots.map((s, i) => s.candidates[i % s.candidates.length]);
      const sBest = scoreCampaign(c, bestXi).score;
      const sWorst = scoreCampaign(c, worstXi).score;
      const sMix = scoreCampaign(c, mixed).score;
      if (sBest !== 100) fail(`the per slot best XI scores ${sBest}, not 100`);
      if (sWorst !== 0) fail(`the per slot worst XI scores ${sWorst}, not 0`);
      if (!(sMix > 0 && sMix < 100)) fail(`a mixed XI scores ${sMix}, expected strictly between`);
      console.log(`   best 100, worst 0, a mixed XI lands at ${sMix}`);
    }
  }
}

console.log('5) anonymity is enforced in the page');
{
  const strip = t => t.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ').replace(/\{\/\*[\s\S]*?\*\/\}/g, ' ');
  let src = strip(fs.readFileSync(`${ROOT}/src/pages/PlayerStockMarket.tsx`, 'utf8'));
  const buyStart = src.indexOf("phase === 'buying'");
  const buyEnd = src.indexOf("phase === 'done'");
  if (buyStart === -1 || buyEnd === -1 || buyEnd <= buyStart) { console.error('the page no longer has the buying and done blocks this check reads, rewrite the check'); process.exit(1); }
  let buying = src.slice(buyStart, buyEnd);
  if (CONTROL === 'leaky') buying += ' <span>{c.name}</span> ';
  const reveal = src.slice(buyEnd);
  const leaks = ['c.name', 'c.nationality', 'c.club', '.name}', '.nationality}', '.club}'].filter(n => buying.includes(n));
  if (CONTROL === 'leaky') {
    if (leaks.length > 0) { console.log(`simStockCampaign control: green. The planted name render was caught (${leaks.join(', ')}).`); process.exit(0); }
    console.error('simStockCampaign control: RED. A planted name render in the buying screen went unseen.');
    process.exit(1);
  }
  if (leaks.length > 0) fail(`the buying screen renders identity: ${leaks.join(', ')}`);
  if (!reveal.includes('c.name')) fail('the reveal no longer names the picks');
  console.log('   the buying screen renders no name, nationality or club; the reveal names every pick');
}

console.log('');
if (failures > 0) { console.error(`simStockCampaign: ${failures} failure${failures === 1 ? '' : 's'}`); process.exit(1); }
console.log('simStockCampaign: green. The market sells numbers, never names, and the wallet always finishes.');
