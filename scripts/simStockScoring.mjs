/**
 * Round 434: the Player Stock Market has to reward investing well.
 *
 * WHAT WAS WRONG. The score was a SPEND RATIO. scoreCampaign placed
 * finalValue / spend between the best and worst per-slot ratio, so the
 * denominator was the money you chose to deploy rather than the money you
 * were given. Every pound you invested made the denominator bigger, which
 * meant the winning play was to leave the wallet shut. Measured against the
 * real rows over 400 seeded campaigns: the cheapest possible XI (25.2M of a
 * 200M wallet) scored 96.0 out of 100 and finished in the green in every
 * single run, while the random picker scored 18.0. The two stats the card
 * prints beside the price picked WORSE than random for the slot the score
 * actually rewarded: steepest value trajectory landed on it 31.1 percent of
 * the time and most goals plus assists 30.8, against 32.1 for picking at
 * random. Only the price predicted anything, and the price was in the
 * denominator. The game is called Invest on Stats Alone.
 *
 * WHAT IT IS NOW. The score is the return on the WHOLE wallet: what your
 * eleven are worth in the final year, placed between the worst and the best
 * eleven that the same 200M could actually have bought from the same offers
 * (an exact search over the eleven slots, budget respected). Cash you never
 * spend buys nothing, so hoarding scores near the floor, and the printed
 * stats decide the rest.
 *
 * WHY THIS HARNESS USES THE REAL ROWS. simStockCampaign drives the engine
 * with synthetic fixtures, which is right for assembly and the wallet lock,
 * and it is structurally incapable of answering the question here. Whether an
 * age, a trajectory or a two season output line predicts a 2026 valuation is
 * a fact about football, not about the code, and a fixture built from a
 * random walk has no such fact in it to find. So this one fetches
 * player_market_values through the real fetch and measures outcomes.
 *
 * THE LAWS, every floor set from measured headroom:
 *   1. THE CEILING IS SPENT, NOT HOARDED. The best eleven the wallet can buy
 *      deploys most of the 200M (measured 194.9M mean, 97 percent).
 *   2. HOARDING IS NOT THE WINNING PLAY. The cheapest possible XI scores
 *      BELOW the random picker (measured 19.2 against 33.5; it used to be
 *      96.0 against 18.0).
 *   3. READING THE CARD BEATS GUESSING. An XI picked on the printed age
 *      beats the random picker on the mean and campaign by campaign
 *      (measured 65.1 against 33.5, ahead on 367 of 400 campaigns).
 *   4. EVERY PRINTED STAT CARRIES SIGNAL. Per slot, picking the youngest,
 *      the steepest trajectory or the most goal contributions lands on the
 *      card the score rewards more often than one in four (measured 40.2,
 *      40.8 and 38.9 percent). This section knows nothing about the scoring
 *      formula: it swaps each candidate into a fixed XI and asks the shipped
 *      scoreCampaign which swap it likes best, so it measures the game's own
 *      answer whatever the rule is.
 *
 * NEGATIVE CONTROL: STOCK_SCORING_CONTROL=spendratio bundles a copy of the
 * lib with the spend ratio scoring restored exactly as it shipped, and
 * sections 1, 2 and 4 must go red. The rewrite asserts it found the text it
 * replaces, so a control that changed nothing refuses to run.
 *
 * Run: node scripts/simStockScoring.mjs   (needs the database)
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..').replace(/\\/g, '/');
const TMP = os.tmpdir().replace(/\\/g, '/');
const CONTROL = process.env.STOCK_SCORING_CONTROL || '';
if (CONTROL && CONTROL !== 'spendratio') {
  console.error(`STOCK_SCORING_CONTROL=${CONTROL} is not a control this harness knows`);
  process.exit(1);
}
let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };
const m$ = n => (n / 1e6).toFixed(1) + 'M';

/* The control restores the shipped spend ratio scoring in a copy of the lib.
   Both rewrites must find their text or the control refuses to run, because a
   control that changes nothing turns green into "the control did not fire". */
let LIB = `${ROOT}/src/lib/playerStockMarket.ts`;
if (CONTROL === 'spendratio') {
  /* Normalised because the working tree carries CRLF on Windows and LF in a
     fresh clone, and a multi line anchor matches neither on both. */
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
  const regressed = src
    .replace(oldGrowth, '  const growth = spend > 0 ? finalValue / spend : 0;')
    .replace(oldScore, ratioScore);
  LIB = `${TMP}/playerStockMarket.spendratio.ts`;
  fs.writeFileSync(LIB, regressed);
  console.log('NEGATIVE CONTROL ON: the spend ratio scoring is restored, sections 1, 2 and 4 must go red');
}

const ENTRY = `${TMP}/stockScoring.entry.mjs`;
const BUNDLE = `${TMP}/stockScoring.bundle.mjs`;
/* Dynamic import so the localStorage shim runs before the Supabase client's
   module scope reads it. A static `export * as` is hoisted above the shim. */
fs.writeFileSync(ENTRY, [
  'globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };',
  `export const sm = await import('${LIB}');`,
].join('\n'));
execSync(`${ROOT}/node_modules/.bin/esbuild ${ENTRY} --bundle --format=esm --platform=node --outfile=${BUNDLE} --log-level=error --alias:@=${ROOT}/src`, { stdio: 'inherit' });
const { sm } = await import(pathToFileURL(BUNDLE).href);
const { assembleCampaign, canAfford, fetchCampaignRows, scoreCampaign, startYearFor, STOCK_BUDGET } = sm;

/* Seeds chosen so that seed % 5 walks three different start years, because
   assembleCampaign derives its own year from the seed and a harness that
   fetches one year and assembles another finds nothing. */
const SEEDS = [];
for (let i = 1; i <= 40; i += 1) for (const off of [0, 2, 4]) SEEDS.push(i * 5 * 7919 + off);
const BY_YEAR = new Map();
for (const s of SEEDS) {
  const y = startYearFor(s);
  if (!BY_YEAR.has(y)) BY_YEAR.set(y, []);
  BY_YEAR.get(y).push(s);
}

const camps = [];
for (const [year, seeds] of [...BY_YEAR.entries()].sort((a, b) => a[0] - b[0])) {
  const rows = await fetchCampaignRows(year);
  if (!rows) {
    console.log('CAMPAIGN ROWS UNREACHABLE. NOTHING WAS CHECKED.');
    console.error('simStockScoring: the real fetch returned null, which is itself worth investigating');
    process.exit(1);
  }
  let built = 0;
  for (const seed of seeds) {
    const c = assembleCampaign(rows, seed);
    if (c) { camps.push(c); built += 1; }
  }
  console.log(`start year ${year}: ${rows.length} rows, ${built} of ${seeds.length} campaigns assembled`);
}
if (camps.length < 100) { console.error(`simStockScoring: only ${camps.length} campaigns assembled, too thin to measure`); process.exit(1); }

/* ---- the readers. Every one of them uses only what the card prints. ---- */
function lehmer(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}
const trajectory = c => (c.series.length >= 2 ? c.series[c.series.length - 1].value / c.series[0].value : 1);
const contributions = c => c.output.reduce((t, o) => t + o.goals + o.assists, 0);
const RULES = {
  cheapest: (a, b) => a.price - b.price,
  dearest: (a, b) => b.price - a.price,
  youngest: (a, b) => (a.age || 99) - (b.age || 99),
  steepest: (a, b) => trajectory(b) - trajectory(a),
  mostOutput: (a, b) => contributions(b) - contributions(a),
};
const rng = lehmer(20260904);
const PICKERS = {
  'cheapest XI': cs => [...cs].sort(RULES.cheapest)[0],
  'random XI': cs => cs[Math.floor(rng() * cs.length)],
  'spend it all XI': cs => [...cs].sort(RULES.dearest)[0],
  'age reader XI': cs => [...cs].sort(RULES.youngest)[0],
  'trajectory reader XI': cs => [...cs].sort(RULES.steepest)[0],
  'output reader XI': cs => [...cs].sort(RULES.mostOutput)[0],
};

/* One run of a whole campaign, obeying the page's own affordability rule. */
function playCampaign(campaign, pick) {
  const picks = [];
  let remaining = STOCK_BUDGET;
  for (let i = 0; i < campaign.slots.length; i += 1) {
    const affordable = campaign.slots[i].candidates.filter(x => canAfford(campaign, i, x, remaining));
    const pool = affordable.length ? affordable : [[...campaign.slots[i].candidates].sort(RULES.cheapest)[0]];
    const chosen = pick(pool);
    picks.push(chosen);
    remaining -= chosen.price;
  }
  return picks;
}
const mean = a => a.reduce((s, x) => s + x, 0) / a.length;
const median = a => { const b = [...a].sort((x, y) => x - y); return b[Math.floor(b.length / 2)]; };

const table = {};
for (const [name, pick] of Object.entries(PICKERS)) {
  const scores = []; const spends = []; const finals = [];
  for (const c of camps) {
    const picks = playCampaign(c, pick);
    const r = scoreCampaign(c, picks);
    scores.push(r.score); spends.push(r.spend); finals.push(r.finalValue);
  }
  table[name] = { scores, spends, finals };
}

console.log('');
console.log(`1) the wallet the winning play deploys, over ${camps.length} real campaigns`);
{
  /* The ceiling is whichever XI the shipped score likes most among the runs
     above, so this section never has to know the formula. */
  let bestName = null; let bestMean = -Infinity;
  for (const [name, r] of Object.entries(table)) {
    const mu = mean(r.scores);
    if (mu > bestMean) { bestMean = mu; bestName = name; }
  }
  const deployed = mean(table[bestName].spends);
  const pct = (100 * deployed) / STOCK_BUDGET;
  console.log(`   the best scoring run is the ${bestName} at ${bestMean.toFixed(1)} points, and it deploys ${m$(deployed)} of the ${m$(STOCK_BUDGET)} wallet (${pct.toFixed(1)} percent)`);
  if (pct < 50) {
    fail(`the best scoring play only deploys ${pct.toFixed(1)} percent of the wallet, so the game rewards keeping the money in the bank rather than investing it`);
  }
}

console.log('2) hoarding is not the winning play');
{
  const cheap = mean(table['cheapest XI'].scores);
  const rand = mean(table['random XI'].scores);
  const splurge = mean(table['spend it all XI'].scores);
  console.log(`   cheapest XI ${cheap.toFixed(1)} (spends ${m$(mean(table['cheapest XI'].spends))}), random XI ${rand.toFixed(1)}, spend it all XI ${splurge.toFixed(1)} (spends ${m$(mean(table['spend it all XI'].spends))})`);
  if (cheap > rand - 8) {
    fail(`the cheapest possible XI scores ${cheap.toFixed(1)} against the random picker's ${rand.toFixed(1)}, so leaving the wallet shut is at least as good as playing`);
  }
  if (splurge < cheap) {
    fail(`spending the whole wallet scores ${splurge.toFixed(1)}, below the cheapest XI's ${cheap.toFixed(1)}, so investing is punished as such`);
  }
}

console.log('3) reading the card beats guessing');
{
  const reader = table['age reader XI'];
  const rand = table['random XI'];
  const gap = mean(reader.scores) - mean(rand.scores);
  const ahead = reader.scores.filter((v, i) => v > rand.scores[i]).length;
  const aheadPct = (100 * ahead) / camps.length;
  console.log(`   age reader ${mean(reader.scores).toFixed(1)} (median ${median(reader.scores)}) against random ${mean(rand.scores).toFixed(1)} (median ${median(rand.scores)}): a gap of ${gap.toFixed(1)} points, ahead on ${ahead} of ${camps.length} campaigns (${aheadPct.toFixed(1)} percent)`);
  if (gap < 15) fail(`a card reader is only ${gap.toFixed(1)} points ahead of a random picker, which is not a game about reading stats`);
  if (aheadPct < 75) fail(`the card reader is only ahead on ${aheadPct.toFixed(1)} percent of campaigns, so the edge is noise rather than skill`);
}

console.log('4) every stat printed on the card carries signal');
{
  /* For each slot, swap each of its four candidates into an otherwise fixed
     XI and ask the SHIPPED score which swap it likes best. That is the card
     the game rewards, whatever the scoring rule happens to be. */
  const hits = { youngest: 0, steepest: 0, mostOutput: 0, cheapest: 0, dearest: 0 };
  let slots = 0;
  let randomHits = 0;
  for (const c of camps) {
    const base = playCampaign(c, cs => [...cs].sort(RULES.cheapest)[0]);
    for (let i = 0; i < c.slots.length; i += 1) {
      const scored = c.slots[i].candidates.map(cand => {
        const trial = [...base];
        trial[i] = cand;
        const spend = trial.reduce((s, x) => s + x.price, 0);
        if (spend > STOCK_BUDGET) return { cand, score: -1 };
        return { cand, score: scoreCampaign(c, trial).score };
      });
      const top = Math.max(...scored.map(s => s.score));
      const winners = new Set(scored.filter(s => s.score === top).map(s => s.cand));
      if (winners.size === c.slots[i].candidates.length) continue; /* every swap ties: nothing to read */
      slots += 1;
      for (const [name, cmp] of Object.entries(RULES)) {
        if (winners.has([...c.slots[i].candidates].sort(cmp)[0])) hits[name] += 1;
      }
      if (winners.has(c.slots[i].candidates[Math.floor(rng() * c.slots[i].candidates.length)])) randomHits += 1;
    }
  }
  const rate = k => (100 * hits[k]) / slots;
  const randRate = (100 * randomHits) / slots;
  /* The baseline is MEASURED rather than assumed to be one in four, because
     several swaps can tie at the top and a tie counts for every rule that
     picked one of them, which lifts every rate including the guesser's. */
  console.log(`   ${slots} slots where the swaps disagree. Picking at random lands on the card the score rewards ${randRate.toFixed(1)} percent of the time.`);
  console.log(`   youngest ${rate('youngest').toFixed(1)}%, steepest trajectory ${rate('steepest').toFixed(1)}%, most goal contributions ${rate('mostOutput').toFixed(1)}%, cheapest ${rate('cheapest').toFixed(1)}%, dearest ${rate('dearest').toFixed(1)}%`);
  for (const k of ['youngest', 'steepest', 'mostOutput']) {
    if (rate(k) < randRate + 5) {
      fail(`reading "${k}" off the card lands on the card the score rewards ${rate(k).toFixed(1)} percent of the time against ${randRate.toFixed(1)} for guessing, so that stat is printed for nothing`);
    }
  }
}

if (CONTROL === 'spendratio') {
  if (failures > 0) { console.log(`\nsimStockScoring control "spendratio": ${failures} failure(s) fired as expected, the check works`); process.exit(0); }
  console.error('\nsimStockScoring control "spendratio": the shipped spend ratio scoring was restored and every check still passed, the harness is dead');
  process.exit(1);
}
console.log('');
if (failures > 0) { console.error(`simStockScoring: ${failures} failure${failures === 1 ? '' : 's'}`); process.exit(1); }
console.log('simStockScoring: green. The wallet is there to be spent, hoarding scores near the floor, and every number on the card is worth reading.');
