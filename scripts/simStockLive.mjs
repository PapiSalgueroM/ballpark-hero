/**
 * Round 364: Player Stock Market's affordability guarantee holds against the
 * REAL fetch, not against fixtures.
 *
 * WHY THIS EXISTS SEPARATELY FROM simStockCampaign. That harness drives
 * assembleCampaign with injected rows, which is the right way to test the
 * engine and is why it is staying. But injected rows contain cheap players, and
 * the live fetch did not, so the harness proved arithmetic that production
 * could not perform. It was structurally incapable of seeing the bug:
 *
 *   fetchCampaignRows asked for .limit(4000) and PostgREST returned 1,000
 *   (measured: Content-Range 0-999/24939). Sorted value descending, so the
 *   query asked for players from $2,000,000 up and the cheapest row it could
 *   ever return was $38,000,000. 18,211 of those 24,939 rows sit in the $2m to
 *   $8m band, so 73 percent of the intended pool was discarded.
 *
 *   PUNT_CEILING is $8,000,000. The punt filter could therefore never match,
 *   and the code fell back to the cheapest available. The comment on the punt
 *   promises that eleven punts always fit inside the wallet and a run can never
 *   strand a slot unaffordable. Eleven punts at $38m is $418m against a $200m
 *   budget. The guarantee was false in production and green in the harness.
 *
 * So this one calls the real fetch and asserts the property the comment claims.
 *
 * What it holds, per start year:
 *   1. The fetch returns the whole pool, not a truncated page.
 *   2. The pool spans the price range: its cheapest offer-year row is at or
 *      under PUNT_CEILING, which is the precondition the punt depends on.
 *   3. Every assembled campaign really offers a punt at or under PUNT_CEILING
 *      in every slot.
 *   4. The affordability guarantee: taking the cheapest candidate in every slot
 *      fits inside STOCK_BUDGET, so a run can never strand a slot.
 *
 * NEGATIVE CONTROL: STOCKLIVE_CONTROL=truncate keeps only the 1,000 most
 * valuable rows before assembling, which is exactly what production did before
 * this round, and sections 2 to 4 must go red.
 *
 * Run: node scripts/simStockLive.mjs   (needs the database)
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.STOCKLIVE_CONTROL || '';
if (CONTROL && CONTROL !== 'truncate') {
  console.error(`STOCKLIVE_CONTROL=${CONTROL} is not a control this harness knows`);
  process.exit(1);
}

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };
const money = n => '$' + Number(n).toLocaleString('en-US');

const ENTRY = path.join(os.tmpdir(), 'stockLiveEntry.mjs');
const BUNDLE = path.join(os.tmpdir(), 'stockLive.bundle.mjs');
const rel = r => path.join(ROOT, r).replaceAll('\\', '/');
/* Dynamic import so the localStorage shim runs before the Supabase client's
   module scope reads it. */
fs.writeFileSync(ENTRY, [
  'globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };',
  `const m = await import('${rel('src/lib/playerStockMarket.ts')}');`,
  'export const fetchCampaignRows = m.fetchCampaignRows;',
  'export const assembleCampaign = m.assembleCampaign;',
  'export const STOCK_BUDGET = m.STOCK_BUDGET;',
  'export const PUNT_CEILING = m.PUNT_CEILING;',
  'export const FINAL_YEAR = m.FINAL_YEAR;',
  'export const startYearFor = m.startYearFor;',
].join('\n'));
execSync(`"${path.join(ROOT, 'node_modules', '.bin', 'esbuild')}" "${ENTRY}" --bundle --format=esm --platform=node --outfile="${BUNDLE}" --log-level=error`);
const lib = await import(pathToFileURL(BUNDLE).href);

/* assembleCampaign derives its own start year from the seed (startYearFor), so
   a harness that fetches one year and assembles another finds nothing and
   reports a product bug that is really its own. Drive it from the seeds and let
   each seed name the year it needs. */
const SEEDS = [1, 7, 42, 1234, 99999];
const BY_YEAR = new Map();
for (const seed of SEEDS) {
  const y = lib.startYearFor(seed);
  if (!BY_YEAR.has(y)) BY_YEAR.set(y, []);
  BY_YEAR.get(y).push(seed);
}
console.log(`seeds map to start years: ${[...BY_YEAR.entries()].map(([y, s]) => `${y}=[${s.join(',')}]`).join(' ')}`);

for (const [startYear, seeds] of BY_YEAR) {
  console.log(`--- start year ${startYear}`);
  let rows = await lib.fetchCampaignRows(startYear);
  if (!rows) {
    console.log('CAMPAIGN ROWS UNREACHABLE. NOTHING WAS CHECKED.');
    console.error('simStockLive: the fetch returned null, which is itself worth investigating');
    process.exit(1);
  }

  if (CONTROL === 'truncate') {
    const before = rows.length;
    rows = [...rows].sort((a, b) => (b.market_value_usd ?? 0) - (a.market_value_usd ?? 0)).slice(0, 1000);
    if (rows.length >= before) { console.error('control cannot run: there were not enough rows to truncate'); process.exit(1); }
    console.log(`   NEGATIVE CONTROL ON: ${before} rows cut to the 1,000 most valuable, which is what production did, sections 2 to 4 must go red`);
  }

  const offerYears = new Set(Array.from({ length: 6 }, (_, i) => startYear + i));
  const offerRows = rows.filter(r => offerYears.has(r.year) && (r.market_value_usd ?? 0) >= 2_000_000);

  console.log('1) the fetch returns a whole pool rather than one page');
  console.log(`   ${rows.length} rows total, ${offerRows.length} in the offer years`);
  if (CONTROL !== 'truncate' && rows.length <= 1000) {
    fail(`the fetch returned ${rows.length} rows, which is at or under PostgREST's single page cap, so it is still truncated`);
  }

  console.log('2) the pool spans the price range');
  {
    const cheapest = Math.min(...offerRows.map(r => r.market_value_usd ?? Infinity));
    const dearest = Math.max(...offerRows.map(r => r.market_value_usd ?? 0));
    const cheapCount = offerRows.filter(r => (r.market_value_usd ?? 0) <= lib.PUNT_CEILING).length;
    console.log(`   cheapest ${money(cheapest)}, dearest ${money(dearest)}, ${cheapCount} rows at or under the punt ceiling of ${money(lib.PUNT_CEILING)}`);
    if (cheapest > lib.PUNT_CEILING) {
      fail(`the cheapest player in the pool is ${money(cheapest)}, above the punt ceiling of ${money(lib.PUNT_CEILING)}, so no slot can ever offer a real punt`);
    }
  }

  console.log('3) every slot really offers a punt');
  {
    let checked = 0, missing = 0;
    for (const seed of seeds) {
      const campaign = lib.assembleCampaign(rows, seed);
      if (!campaign) { fail(`seed ${seed}: no campaign could be assembled at all`); continue; }
      for (const slot of campaign.slots) {
        checked += 1;
        const cheapest = Math.min(...slot.candidates.map(c => c.price ?? c.value ?? Infinity));
        if (!(cheapest <= lib.PUNT_CEILING)) {
          missing += 1;
          if (missing <= 3) fail(`seed ${seed}, slot ${slot.label ?? checked}: cheapest candidate is ${money(cheapest)}, above the punt ceiling`);
        }
      }
    }
    console.log(`   ${checked - missing} of ${checked} slots offered a candidate at or under the punt ceiling`);
  }

  console.log('4) the affordability guarantee holds');
  {
    let worst = 0, worstSeed = 0, runs = 0;
    for (const seed of seeds) {
      const campaign = lib.assembleCampaign(rows, seed);
      if (!campaign) continue;
      runs += 1;
      const floorCost = campaign.slots.reduce(
        (sum, slot) => sum + Math.min(...slot.candidates.map(c => c.price ?? c.value ?? Infinity)), 0);
      if (floorCost > worst) { worst = floorCost; worstSeed = seed; }
    }
    console.log(`   over ${runs} runs the dearest possible cheapest-in-every-slot total was ${money(worst)} against a budget of ${money(lib.STOCK_BUDGET)}`);
    if (worst > lib.STOCK_BUDGET) {
      fail(`seed ${worstSeed}: buying the cheapest candidate in every slot costs ${money(worst)}, which is over the ${money(lib.STOCK_BUDGET)} budget, so that run can strand a slot unaffordable`);
    }
  }
  console.log('');
}

if (CONTROL === 'truncate') {
  if (failures > 0) { console.log(`simStockLive control: green. Reproducing the truncation broke the guarantee and it was caught (${failures} finding${failures === 1 ? '' : 's'}).`); process.exit(0); }
  console.error('simStockLive control: RED. The pool was cut to what production used to see and every check still passed.');
  process.exit(1);
}
if (failures > 0) { console.error(`simStockLive: ${failures} failure${failures === 1 ? '' : 's'}`); process.exit(1); }
console.log('simStockLive: green. The real fetch spans the price range and every run is affordable.');
