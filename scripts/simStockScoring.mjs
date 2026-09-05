/**
 * Round 434: the Player Stock Market has to reward investing well.
 * Round 458: the same laws, held on the format's new cards.
 *
 * WHAT WAS WRONG IN ROUND 434. The score was a SPEND RATIO. scoreCampaign
 * placed finalValue / spend between the best and worst per-slot ratio, so
 * the denominator was the money you chose to deploy rather than the money
 * you were given. Every pound you invested made the denominator bigger,
 * which meant the winning play was to leave the wallet shut. Measured
 * against the real rows over 400 seeded campaigns: the cheapest possible XI
 * (25.2M of a 200M wallet) scored 96.0 out of 100 and finished in the green
 * in every single run, while the random picker scored 18.0. The game is
 * called Invest on Stats Alone.
 *
 * WHAT IT IS NOW. The score is the return on the WHOLE wallet: what your
 * eleven are worth in the final season, placed between the worst and the
 * best eleven that the same 200M could actually have bought from the same
 * cards (an exact search over the eleven slots, budget respected). Cash you
 * never spend buys nothing, so hoarding scores near the floor, and the
 * printed stats decide the rest.
 *
 * WHY THIS HARNESS USES THE REAL ROWS. simStockCampaign drives the engine
 * with synthetic fixtures, which is right for assembly and the wallet lock,
 * and it is structurally incapable of answering the question here. Whether
 * an age, an appearance count or an output line predicts a later valuation
 * is a fact about football, not about the code, and a fixture built from a
 * random walk has no such fact in it to find. So this one runs on the saved
 * real rows (scripts/data/stockMarketPools.json, pulled through the engine's
 * own fetch; refresh with node scripts/simStockFormat.mjs --refresh) and
 * measures outcomes.
 *
 * THE LAWS, every floor set from measured headroom:
 *   1. THE CEILING IS SPENT, NOT HOARDED. The best scoring buyer deploys
 *      most of the 200M.
 *   2. HOARDING IS NOT THE WINNING PLAY. The cheapest possible XI scores
 *      BELOW the random picker (it used to be 96.0 against 18.0).
 *   3. READING THE CARD BEATS GUESSING. An XI picked on the printed age
 *      beats the random picker on the mean and campaign by campaign.
 *   4. EVERY PRINTED STAT CARRIES SIGNAL. Per slot, picking the youngest,
 *      the most matches or the most goal contributions lands on the card
 *      the score rewards more often than guessing. This section knows
 *      nothing about the scoring formula: it swaps each card into a fixed
 *      XI and asks the shipped scoreCampaign which swap it likes best, so
 *      it measures the game's own answer whatever the rule is. The cards
 *      line (yellow and red) is measured and printed in both directions
 *      but not asserted: it is on the card as a season fact a fan reads
 *      with the matches, not as a tip, and the measurement says why.
 *
 * NEGATIVE CONTROL: STOCK_SCORING_CONTROL=spendratio bundles a copy of the
 * lib with the spend ratio scoring restored exactly as it shipped, and
 * sections 1, 2 and 4 must go red. The rewrite asserts it found the text it
 * replaces, so a control that changed nothing refuses to run.
 *
 * Run: node scripts/simStockScoring.mjs
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { bundleStockEngine, loadStockData } from './lib/stockMarketData.mjs';

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

const { sm } = await bundleStockEngine(LIB, `stockScoring${CONTROL}`);
const { assembleCampaign, canAfford, scoreCampaign, START_YEARS, STOCK_BUDGET } = sm;
const data = await loadStockData();

/* Fifty seeds in every offered season, the same campaigns simStockFormat plays. */
const camps = [];
for (const year of START_YEARS) {
  const rows = data.pools[year];
  if (!rows) { console.error(`no saved pool for ${year}; run node scripts/simStockFormat.mjs --refresh`); process.exit(1); }
  let built = 0;
  for (let s = 1; s <= 50; s += 1) {
    const c = assembleCampaign(rows, s * 7919 + year, year);
    if (c) { camps.push(c); built += 1; }
  }
  console.log(`start season ${year}: ${rows.length} saved rows, ${built} of 50 campaigns assembled`);
}
if (camps.length < 100) { console.error(`simStockScoring: only ${camps.length} campaigns assembled, too thin to measure`); process.exit(1); }

/* ---- the readers. Every one of them uses only what the card prints. ---- */
function lehmer(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}
const contributions = c => c.goals + c.assists;
/* The output line read the way the guide says to read it: goals plus
   assists PER MATCH. A card whose matches were never recorded has no rate
   and sorts last. */
const rateOf = c => (c.matches === null ? -1 : contributions(c) / Math.max(1, c.matches));
const cardsOf = c => c.yellowCards + 3 * c.redCards;
const RULES = {
  cheapest: (a, b) => a.price - b.price,
  dearest: (a, b) => b.price - a.price,
  youngest: (a, b) => (a.age ?? 99) - (b.age ?? 99),
  mostMatches: (a, b) => (b.matches ?? -1) - (a.matches ?? -1),
  mostOutput: (a, b) => contributions(b) - contributions(a),
  bestRate: (a, b) => rateOf(b) - rateOf(a),
  fewestCards: (a, b) => cardsOf(a) - cardsOf(b),
  mostCards: (a, b) => cardsOf(b) - cardsOf(a),
};
const rng = lehmer(20260904);
const PICKERS = {
  'cheapest XI': cs => [...cs].sort(RULES.cheapest)[0],
  'random XI': cs => cs[Math.floor(rng() * cs.length)],
  'spend it all XI': cs => [...cs].sort(RULES.dearest)[0],
  'age reader XI': cs => [...cs].sort(RULES.youngest)[0],
  'matches reader XI': cs => [...cs].sort(RULES.mostMatches)[0],
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
  /* For each slot, swap each of its four cards into an otherwise fixed XI
     and ask the SHIPPED score which swap it likes best. That is the card the
     game rewards, whatever the scoring rule happens to be. */
  /* A stat can only be read where the four cards print DIFFERENT values for
     it: four keepers at 0 goals, or four right backs whose matches were never
     recorded, hand the reader a tie broken by deal order, which is a guess
     wearing the stat's name. So every rule is measured on the slots where
     its own value varies, against a random pick drawn once per slot and
     scored on those same slots. Round 458: the first draft measured output
     over every slot and read 30.7 against 26.9, five of eleven slots being
     defenders and a keeper. */
  const KEY = {
    cheapest: c => c.price, dearest: c => c.price,
    youngest: c => c.age ?? -1, mostMatches: c => c.matches ?? -1,
    mostOutput: contributions, bestRate: rateOf, fewestCards: cardsOf, mostCards: cardsOf,
  };
  const hits = Object.fromEntries(Object.keys(RULES).map(k => [k, 0]));
  const readable = Object.fromEntries(Object.keys(RULES).map(k => [k, 0]));
  const randOn = Object.fromEntries(Object.keys(RULES).map(k => [k, 0]));
  let slots = 0;
  for (const c of camps) {
    const base = playCampaign(c, cs => [...cs].sort(RULES.cheapest)[0]);
    for (let i = 0; i < c.slots.length; i += 1) {
      const cands = c.slots[i].candidates;
      const scored = cands.map(cand => {
        const trial = [...base];
        trial[i] = cand;
        const spend = trial.reduce((s, x) => s + x.price, 0);
        if (spend > STOCK_BUDGET) return { cand, score: -1 };
        return { cand, score: scoreCampaign(c, trial).score };
      });
      const top = Math.max(...scored.map(s => s.score));
      const winners = new Set(scored.filter(s => s.score === top).map(s => s.cand));
      if (winners.size === cands.length) continue; /* every swap ties: nothing to read */
      slots += 1;
      const guess = cands[Math.floor(rng() * cands.length)];
      for (const [name, cmp] of Object.entries(RULES)) {
        if (new Set(cands.map(KEY[name])).size < 2) continue; /* the stat reads the same on every card */
        readable[name] += 1;
        if (winners.has([...cands].sort(cmp)[0])) hits[name] += 1;
        if (winners.has(guess)) randOn[name] += 1;
      }
    }
  }
  const rate = k => (100 * hits[k]) / readable[k];
  const randRate = k => (100 * randOn[k]) / readable[k];
  const line = k => `${rate(k).toFixed(1)}% against ${randRate(k).toFixed(1)}% guessing on ${readable[k]} readable slots`;
  /* The baseline is MEASURED rather than assumed to be one in four, because
     several swaps can tie at the top and a tie counts for every rule that
     picked one of them, which lifts every rate including the guesser's. */
  console.log(`   ${slots} slots where the swaps disagree.`);
  console.log(`   youngest ${line('youngest')}`);
  console.log(`   most matches ${line('mostMatches')}`);
  console.log(`   most goal contributions ${line('mostOutput')}`);
  console.log(`   best rate, contributions per match ${line('bestRate')}`);
  console.log(`   cheapest ${line('cheapest')}; dearest ${line('dearest')}`);
  console.log(`   the cards line, measured and not asserted: fewest cards ${line('fewestCards')}; most cards ${line('mostCards')}`);
  /* Floors from each stat's own measured headroom (2026-09-05, 400
     campaigns on the saved rows): youngest +15.7 and most matches +9.5 over
     guessing, so 5 is well under both. The output line is thinner: goals
     plus assists +4.0 (30.9 against 26.9 on 3,963 slots, about five
     standard errors, so it is signal and not noise) and the per match rate
     +3.5. A season's output is on the card because a season card without
     goals is not the format he asked for, and its floor is 2, half of what
     it measures; the spend ratio control drives it to -14.6, so the floor
     still separates a healthy game from a broken one. */
  const FLOOR = { youngest: 5, mostMatches: 5, mostOutput: 2 };
  for (const k of ['youngest', 'mostMatches', 'mostOutput']) {
    if (readable[k] < 500) fail(`only ${readable[k]} slots where "${k}" can be read, too few to measure`);
    if (rate(k) < randRate(k) + FLOOR[k]) {
      fail(`reading "${k}" off the card lands on the card the score rewards ${rate(k).toFixed(1)} percent of the time against ${randRate(k).toFixed(1)} for guessing, under its floor of +${FLOOR[k]}, so that stat is printed for nothing`);
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
