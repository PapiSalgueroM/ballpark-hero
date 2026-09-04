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
 *   4. SCORING IDENTITIES, AGAINST A BRUTE FORCED ORACLE (rewritten in Round
 *      434, when the score stopped being a spend ratio): every one of the
 *      4^11 XIs is enumerated and the affordable ones kept, and the most
 *      valuable of those must score exactly 100, the least valuable exactly
 *      0, a mixed XI strictly between, and the cheapest possible XI below
 *      100. The engine's own search has to agree with the oracle to the
 *      dollar. The oracle borrows nothing from the engine, which is the
 *      point: a check that used the engine's optimiser would test itself;
 *   5. ANONYMITY IS ENFORCED IN THE PAGE: the buying screen's source
 *      renders no candidate name, nationality or club (comment stripped),
 *      while the reveal does name every pick;
 *   6. THE DAILY SEED LANDS ON A REAL START YEAR ON EVERY DATE (Round 427):
 *      365 dates from 2026-09-03 walk the real dailyCampaignSeed and
 *      startYearFor path, the seed is never negative and the year is always
 *      one of START_YEARS. dailyPrngSeed can return a negative number, and
 *      before Round 427 that left Daily mode unstartable on 128 of those
 *      365 days (year=in.(NaN) to Postgres, a 400 read as "Couldn't open
 *      the market right now").
 *
 * NEGATIVE CONTROLS: SIM_STOCK_CONTROL=leaky injects a name render into a
 * copy of the buying block and section 5 must go red, proving the check
 * reads what the screen would actually show. SIM_STOCK_CONTROL=signed
 * bundles a copy of the lib with the seed left signed and the lookup left
 * unwrapped, and section 6 must go red on the 128 dates that were broken.
 * SIM_STOCK_CONTROL=spendratio puts the Round 434 defect back, the score as
 * a spend ratio, and section 4 must go red. Every rewrite asserts it found
 * the text it replaces, so a control that changed nothing refuses to run.
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
const KNOWN = ['leaky', 'signed', 'spendratio'];
if (CONTROL && !KNOWN.includes(CONTROL)) { console.error(`SIM_STOCK_CONTROL=${CONTROL} is not a control this harness knows`); process.exit(1); }

const TMP = os.tmpdir().replace(/\\/g, '/');
const ENTRY = `${TMP}/stockCampaign.entry.mjs`;
const BUNDLE = `${TMP}/stockCampaign.bundle.mjs`;
/* Round 427: SIM_STOCK_CONTROL=signed bundles a copy of the lib with the
   seed left signed and the start year lookup left unwrapped, the pre-fix
   shape, and section 6 must then go red on the dates that were broken. */
let LIB = `${ROOT}/src/lib/playerStockMarket.ts`;
if (CONTROL === 'signed') {
  const src = fs.readFileSync(LIB, 'utf8');
  let regressed = src.replace('return ((dailyPrngSeed(dateStr) ^ 0x50534d32) >>> 0) || 13;', 'return (dailyPrngSeed(dateStr) ^ 0x50534d32) || 13;');
  regressed = regressed.replace('return START_YEARS[((Math.trunc(seed) % n) + n) % n];', 'return START_YEARS[seed % n];');
  if (regressed === src || regressed.includes('>>> 0) || 13') || regressed.includes('((Math.trunc(seed) % n) + n) % n')) {
    console.error('control cannot run: playerStockMarket.ts is not in the shape this control rewrites');
    process.exit(1);
  }
  LIB = `${TMP}/playerStockMarket.control.ts`;
  fs.writeFileSync(LIB, regressed);
  console.log('NEGATIVE CONTROL ON: the daily seed stays signed and the start year lookup is unwrapped');
}
/* Round 434: SIM_STOCK_CONTROL=spendratio puts the shipped spend ratio scoring
   back, the shape where investing could only hurt, and section 4 must go red
   because the XI the wallet can most profitably buy stops scoring 100.
   Normalised for line endings: the tree is CRLF on Windows and LF in a fresh
   clone, and a multi line anchor matches neither on both. */
if (CONTROL === 'spendratio') {
  const src = fs.readFileSync(LIB, 'utf8').replace(/\r\n/g, '\n');
  const oldGrowth = '  const growth = campaign.budget > 0 ? finalValue / campaign.budget : 0;';
  const oldScore = [
    '  const score = bestValue === worstValue',
    '    ? 100',
    '    : Math.max(0, Math.min(100, Math.round((100 * (finalValue - worstValue)) / (bestValue - worstValue))));',
  ].join('\n');
  if (!src.includes(oldGrowth) || !src.includes(oldScore)) {
    console.error('control cannot run: playerStockMarket.ts is not in the shape this control rewrites');
    process.exit(1);
  }
  const ratioScore = [
    '  let bSpend = 0; let bFinal = 0; let wSpend = 0; let wFinal = 0;',
    '  for (const slot of campaign.slots) {',
    '    const byRatio = [...slot.candidates].sort((a, b) => candidateRatio(b) - candidateRatio(a));',
    '    bSpend += byRatio[0].price; bFinal += byRatio[0].final;',
    '    const w = byRatio[byRatio.length - 1];',
    '    wSpend += w.price; wFinal += w.final;',
    '  }',
    '  const bestGrowth = bSpend > 0 ? bFinal / bSpend : 1;',
    '  const worstGrowth = wSpend > 0 ? wFinal / wSpend : 1;',
    '  const score = bestGrowth === worstGrowth',
    '    ? 100',
    '    : Math.max(0, Math.min(100, Math.round((100 * (growth - worstGrowth)) / (bestGrowth - worstGrowth))));',
  ].join('\n');
  LIB = `${TMP}/playerStockMarket.spendratio.ts`;
  fs.writeFileSync(LIB, src.replace(oldGrowth, '  const growth = spend > 0 ? finalValue / spend : 0;').replace(oldScore, ratioScore));
  console.log('NEGATIVE CONTROL ON: the spend ratio scoring is restored, section 4 must go red');
}
fs.writeFileSync(ENTRY, `
export * as sm from '${LIB}';
`);
execSync(`${ROOT}/node_modules/.bin/esbuild ${ENTRY} --bundle --format=esm --platform=node --outfile=${BUNDLE} --log-level=error --alias:@=${ROOT}/src`, { stdio: 'inherit' });
const store = new Map();
globalThis.localStorage = { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k), clear: () => store.clear() };
const { sm } = await import(pathToFileURL(BUNDLE).href);
const {
  CANDIDATES_PER_SLOT, FINAL_YEAR, STOCK_BUDGET, STOCK_FORMATION,
  assembleCampaign, bestAffordableXI, canAfford, offerYearFor, puntPriceOf,
  scoreCampaign, startYearFor, worstAffordableXI,
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

  console.log('4) scoring identities, against a brute forced oracle');
  {
    /* Round 434: the ends of the scale are the most and least valuable XI the
       200M could actually have bought, so the only honest way to check them is
       to enumerate every one of the 4^11 XIs and keep the affordable ones. The
       oracle knows nothing about how the engine searches, which is the point:
       a harness that borrowed the engine's own optimiser would be testing
       itself. */
    const c = assembleCampaign(ROWS, 31337);
    if (!c) { fail('no campaign for the scoring fixture'); }
    else {
      const cheapestFrom = new Array(c.slots.length + 1).fill(0);
      for (let i = c.slots.length - 1; i >= 0; i -= 1) {
        cheapestFrom[i] = cheapestFrom[i + 1] + Math.min(...c.slots[i].candidates.map(x => x.price));
      }
      const bruteForce = (better, seed) => {
        let edge = seed; let keep = null; let leaves = 0;
        const picks = new Array(c.slots.length);
        const walk = (i, spend, value) => {
          if (i === c.slots.length) {
            leaves += 1;
            if (better(value, edge)) { edge = value; keep = picks.slice(); }
            return;
          }
          for (const cand of c.slots[i].candidates) {
            const next = spend + cand.price;
            if (next + cheapestFrom[i + 1] > c.budget) continue;
            picks[i] = cand;
            walk(i + 1, next, value + cand.final);
          }
        };
        walk(0, 0, 0);
        return { xi: keep, value: edge, leaves };
      };
      const t0 = Date.now();
      const top = bruteForce((v, e) => v > e, -Infinity);
      const bottom = bruteForce((v, e) => v < e, Infinity);
      const worth = xi => xi.reduce((s, x) => s + x.final, 0);
      const cost = xi => xi.reduce((s, x) => s + x.price, 0);
      if (!top.xi || !bottom.xi) fail('the oracle could not find an affordable XI at all');
      else {
        console.log(`   ${top.leaves} affordable XIs enumerated in ${Date.now() - t0}ms: the best is worth ${Math.round(top.value / 1e6)}M for ${Math.round(cost(top.xi) / 1e6)}M, the worst ${Math.round(bottom.value / 1e6)}M`);
        /* Halfway between the two ends, found by the same enumeration, so it
           is an XI that provably exists rather than a hopeful hand pick: the
           first draft used candidates[i % 4] and that happened to BE the
           optimum on this fixture, which would have read as a scoring bug. */
        const mid = (top.value + bottom.value) / 2;
        const middle = bruteForce((v, e) => Math.abs(v - mid) < Math.abs(e - mid), Infinity);
        const sBest = scoreCampaign(c, top.xi).score;
        const sWorst = scoreCampaign(c, bottom.xi).score;
        const sMid = scoreCampaign(c, middle.xi).score;
        const cheapXi = c.slots.map(s => [...s.candidates].sort((a, b) => a.price - b.price)[0]);
        const sCheap = scoreCampaign(c, cheapXi).score;
        if (sBest !== 100) fail(`the most valuable XI the wallet can buy scores ${sBest}, not 100`);
        if (sWorst !== 0) fail(`the least valuable XI the wallet can buy scores ${sWorst}, not 0`);
        if (!(sMid > 0 && sMid < 100)) fail(`the middling XI scores ${sMid}, expected strictly between`);
        if (sCheap >= 100) fail(`the cheapest possible XI scores ${sCheap}, so shutting the wallet is still the winning play`);
        /* The engine's own search has to agree with the oracle, or the ends of
           the scale the player is measured against are not the real ends. */
        if (worth(bestAffordableXI(c)) !== top.value) fail(`bestAffordableXI found ${worth(bestAffordableXI(c))}, the oracle found ${top.value}`);
        if (worth(worstAffordableXI(c)) !== bottom.value) fail(`worstAffordableXI found ${worth(worstAffordableXI(c))}, the oracle found ${bottom.value}`);
        if (cost(bestAffordableXI(c)) > c.budget) fail('bestAffordableXI returned an XI the wallet cannot pay for');
        console.log(`   the oracle's best scores ${sBest}, its worst ${sWorst}, the middling XI ${sMid}, the cheapest possible XI ${sCheap}`);

        /* THE LAW THE WHOLE ROUND IS ABOUT, and it asks nothing about how the
           score is computed: of two XIs the wallet can pay for, the one worth
           more in the final year must never score lower. The old spend ratio
           broke this thousands of times over, which is what made shutting the
           wallet the winning play. Sampled with a stride so the walk stays
           bounded whatever the fixture offers. */
        const stride = Math.max(1, Math.ceil(top.leaves / 4000));
        const sample = [];
        {
          let seen = 0;
          const picks = new Array(c.slots.length);
          const walk = (i, spend, value) => {
            if (i === c.slots.length) {
              if (seen % stride === 0) sample.push({ value, xi: picks.slice() });
              seen += 1;
              return;
            }
            for (const cand of c.slots[i].candidates) {
              const next = spend + cand.price;
              if (next + cheapestFrom[i + 1] > c.budget) continue;
              picks[i] = cand;
              walk(i + 1, next, value + cand.final);
            }
          };
          walk(0, 0, 0);
        }
        const scored = sample.map(s => ({ value: s.value, score: scoreCampaign(c, s.xi).score }))
          .sort((a, b) => a.value - b.value);
        let inversions = 0; let worstDrop = 0;
        for (let i = 1; i < scored.length; i += 1) {
          if (scored[i].score < scored[i - 1].score) {
            inversions += 1;
            worstDrop = Math.max(worstDrop, scored[i - 1].score - scored[i].score);
          }
        }
        console.log(`   ${scored.length} affordable XIs sampled (every ${stride} of ${top.leaves}): ${inversions} where a MORE valuable portfolio scored LOWER`);
        if (inversions > 0) {
          fail(`the score falls as the portfolio gets more valuable on ${inversions} of ${scored.length - 1} steps, worst drop ${worstDrop} points, so investing well can cost you points`);
        }
      }
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

console.log('6) the daily seed lands on a real start year on every date of the year');
{
  const { dailyCampaignSeed, START_YEARS } = sm;
  let bad = 0; let negative = 0; let first = null;
  const start = Date.UTC(2026, 8, 3);
  for (let d = 0; d < 365; d += 1) {
    const dateStr = new Date(start + d * 86400000).toISOString().slice(0, 10);
    const seed = dailyCampaignSeed(dateStr);
    if (!(seed >= 0)) negative += 1;
    const year = startYearFor(seed);
    if (!START_YEARS.includes(year)) { bad += 1; if (!first) first = `${dateStr}: seed ${seed}, start year ${year}`; }
  }
  console.log(`   365 dates from 2026-09-03: negative seeds ${negative}, dates with no valid start year ${bad}`);
  if (negative > 0) fail(`dailyCampaignSeed came back negative on ${negative} date(s)`);
  if (bad > 0) fail(`${bad} date(s) have no valid start year, first: ${first}; Daily mode cannot open on those days`);
}

if (CONTROL === 'signed' || CONTROL === 'spendratio') {
  if (failures > 0) { console.log(`\nsimStockCampaign control "${CONTROL}": ${failures} failure(s) fired as expected, the check works`); process.exit(0); }
  console.error(`\nsimStockCampaign control "${CONTROL}": changed NOTHING, the check is dead`);
  process.exit(1);
}

console.log('');
if (failures > 0) { console.error(`simStockCampaign: ${failures} failure${failures === 1 ? '' : 's'}`); process.exit(1); }
console.log('simStockCampaign: green. The market sells numbers, never names, and the wallet always finishes.');
