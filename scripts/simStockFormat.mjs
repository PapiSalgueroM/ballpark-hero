/**
 * Round 458: the Player Stock Market in the owner's format holds its laws
 * against the REAL rows.
 *
 * The format, in his words: start seasons back, move year by year, show
 * stats only, never name, country or club, buy position by position until
 * a full XI. This harness bundles the real engine and drives it over the
 * saved real rows (scripts/data/stockMarketPools.json, pulled through the
 * engine's own fetches; --refresh rebuilds it, and a missing file is an
 * error rather than an empty pool).
 *
 * THE LAWS, every floor set from measured headroom:
 *   1. EVERY OFFERED SEASON IS DEEP ENOUGH. For every slot of the formation,
 *      the season's real players who fit the slot, are worth the pool floor
 *      and are still tracked in the latest season, divided by the slots
 *      sharing that position, must be at least four deals' worth (16). The
 *      season before the first offered one must FAIL that floor, or the
 *      floor excludes nothing and the list is a guess. Every seed assembles.
 *   2. NO CARD CARRIES A NAME, COUNTRY, CLUB OR FLAG. Read off the keys and
 *      the string values of every dealt card, against every name in the pool.
 *   3. A THINKING BUYER BEATS THE LAZY ONES. A buyer who estimates each
 *      card's future value from the printed numbers (age and output rate)
 *      and buys the best XI the wallet can carry under that estimate beats
 *      the cheapest XI, the spend it all XI and the always the first card XI
 *      on the mean and campaign by campaign, by margins measured here.
 *   4. THE YEARS ARE THE TABLE'S ROWS, NEVER INTERPOLATED. Every season value
 *      of every holding equals the saved row, and is null exactly where the
 *      table has no row; the sample must contain gaps or the path is untested.
 *   5. THE REVEAL NAMES EXACTLY THE ELEVEN BOUGHT, real names, all distinct.
 *   6. DETERMINISM, and the daily seed lands on an offered season on every
 *      date of the year, reaching every offered season.
 *   7. THE CAP IS MEASURED: the best affordable XI scores exactly 100 on
 *      every campaign and nothing scores above it, so the leaderboard cap row
 *      for player-stock-market is 100 by measurement, not by guess.
 *
 * NEGATIVE CONTROLS, each a rewrite of a copy of the lib that must find its
 * anchor or refuse to run: STOCK_FORMAT_CONTROL=leakname puts the player's
 * name on the card and section 2 must go red; STOCK_FORMAT_CONTROL=interpolate
 * fills a missing season from its neighbours and section 4 must go red.
 *
 * Run: node scripts/simStockFormat.mjs
 *      node scripts/simStockFormat.mjs --refresh   (needs the database)
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { bundleStockEngine, loadStockData, historyRowsFor } from './lib/stockMarketData.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..').replace(/\\/g, '/');
const TMP = os.tmpdir().replace(/\\/g, '/');
const REFRESH = process.argv.includes('--refresh');
const CONTROL = process.env.STOCK_FORMAT_CONTROL || '';
const KNOWN = ['leakname', 'interpolate'];
if (CONTROL && !KNOWN.includes(CONTROL)) { console.error(`STOCK_FORMAT_CONTROL=${CONTROL} is not a control this harness knows`); process.exit(1); }
const m$ = n => (n / 1e6).toFixed(1) + 'M';
const mean = a => a.reduce((s, x) => s + x, 0) / a.length;

let failures = 0;
const failed = new Set();
let section = 0;
const fail = m => { failures += 1; failed.add(section); console.error('  FAIL: ' + m); };

/* ---- the controls rewrite a copy of the lib, and refuse to run if the
   anchor is gone (CRLF normalised: the tree is CRLF on Windows). ---- */
let LIB = `${ROOT}/src/lib/playerStockMarket.ts`;
if (CONTROL) {
  const src = fs.readFileSync(LIB, 'utf8').replace(/\r\n/g, '\n');
  let regressed = src;
  if (CONTROL === 'leakname') {
    const anchor = "      return {\n        id,\n        position: normalizePosition(r.position || '') ?? 'CM',";
    if (!src.includes(anchor)) { console.error('control cannot run: the card constructor is not in the shape this control rewrites'); process.exit(1); }
    regressed = src.replace(anchor, "      return {\n        id,\n        name: r.player_name,\n        position: normalizePosition(r.position || '') ?? 'CM',");
  }
  if (CONTROL === 'interpolate') {
    const anchor = "  const row = index.get(name)?.get(year);\n  const v = row?.market_value_usd ?? null;\n  return v !== null && v > 0 ? v : null;";
    if (!src.includes(anchor)) { console.error('control cannot run: valueAt is not in the shape this control rewrites'); process.exit(1); }
    regressed = src.replace(anchor, [
      '  const row = index.get(name)?.get(year);',
      '  const v = row?.market_value_usd ?? null;',
      '  if (v !== null && v > 0) return v;',
      '  const years = index.get(name);',
      '  if (!years) return null;',
      '  let before: number | null = null; let after: number | null = null;',
      '  for (let y = year - 1; y >= year - 12 && before === null; y -= 1) { const b = years.get(y)?.market_value_usd ?? null; if (b !== null && b > 0) before = b; }',
      '  for (let y = year + 1; y <= year + 12 && after === null; y += 1) { const a = years.get(y)?.market_value_usd ?? null; if (a !== null && a > 0) after = a; }',
      '  if (before !== null && after !== null) return Math.round((before + after) / 2);',
      '  return before ?? after;',
    ].join('\n'));
  }
  if (regressed === src) { console.error('control cannot run: the rewrite changed nothing'); process.exit(1); }
  LIB = `${TMP}/playerStockMarket.${CONTROL}.ts`;
  fs.writeFileSync(LIB, regressed);
  console.log(`NEGATIVE CONTROL ON: ${CONTROL === 'leakname' ? 'the player name is on every card, section 2 must go red' : 'a missing season is filled from its neighbours, section 4 must go red'}`);
}

const { sm, sd } = await bundleStockEngine(LIB, `stockFormat${CONTROL}`);
const {
  START_YEARS, STOCK_FORMATION, CANDIDATES_PER_SLOT, POOL_FLOOR, STOCK_BUDGET,
  assembleCampaign, scoreCampaign, canAfford, bestAffordableXI, worstAffordableXI,
  buildHoldings, yearSteps, identityOf, dailyCampaignSeed, startYearFor,
} = sm;

const data = await loadStockData({ refresh: REFRESH, sm });
console.log(`saved rows from ${data.fetchedAt}, final season ${data.finalYear}: ${Object.entries(data.pools).map(([y, r]) => `${y}=${r.length}`).join(' ')}`);
const allNames = new Set(Object.values(data.pools).flat().map(r => r.player_name));

/* ---- the campaigns: fifty seeds in every offered season ---- */
const SEEDS_PER_YEAR = 50;
const camps = [];
for (const year of START_YEARS) {
  const rows = data.pools[year];
  if (!rows) { console.error(`no saved pool for ${year}; run with --refresh`); process.exit(1); }
  for (let s = 1; s <= SEEDS_PER_YEAR; s += 1) {
    const c = assembleCampaign(rows, s * 7919 + year, year);
    if (c) camps.push(c);
  }
}

/* ---- the buyers. Every one of them sees only what the card prints. ---- */
function lehmer(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}
const rng = lehmer(20260905);
/* The thinking buyer's estimate of a card's future value, from the numbers
   it prints: a youth multiplier and the output rate per match. Nothing
   here is tuned to the answer; it is what a fan would do with the card. */
function estimate(card) {
  const a = card.age;
  const ageF = a === null ? 1 : a <= 20 ? 2.2 : a <= 22 ? 1.8 : a <= 24 ? 1.4 : a <= 26 ? 1.1 : a <= 28 ? 0.85 : a <= 30 ? 0.6 : 0.4;
  const rate = (card.goals + card.assists) / Math.max(10, card.matches ?? 30);
  return card.price * ageF * (1 + Math.min(1, rate));
}
/** The best XI the wallet can carry under the estimate: an exact frontier
 *  search, the same shape the engine's scorer uses on the real finals. */
function planXI(c) {
  let points = [{ spend: 0, est: 0, picks: [] }];
  for (const slot of c.slots) {
    const grown = [];
    for (const p of points) {
      for (const card of slot.candidates) {
        const spend = p.spend + card.price;
        if (spend > c.budget) continue;
        grown.push({ spend, est: p.est + estimate(card), picks: [...p.picks, card] });
      }
    }
    if (grown.length === 0) return null;
    grown.sort((a, b) => a.spend - b.spend || b.est - a.est);
    const kept = []; let edge = -Infinity;
    for (const p of grown) if (p.est > edge) { kept.push(p); edge = p.est; }
    points = kept;
  }
  return points.reduce((b, p) => (p.est > b.est ? p : b)).picks;
}
/** Slot by slot under the page's own affordability rule. */
function playSlotBySlot(c, pick) {
  const picks = [];
  let remaining = STOCK_BUDGET;
  for (let i = 0; i < c.slots.length; i += 1) {
    const affordable = c.slots[i].candidates.filter(x => canAfford(c, i, x, remaining));
    const pool = affordable.length ? affordable : [[...c.slots[i].candidates].sort((a, b) => a.price - b.price)[0]];
    const chosen = pick(pool, c.slots[i].candidates);
    picks.push(chosen);
    remaining -= chosen.price;
  }
  return picks;
}
const BUYERS = {
  'thinking buyer': c => planXI(c) ?? playSlotBySlot(c, cs => [...cs].sort((a, b) => estimate(b) - estimate(a))[0]),
  'cheapest XI': c => playSlotBySlot(c, cs => [...cs].sort((a, b) => a.price - b.price)[0]),
  'spend it all XI': c => playSlotBySlot(c, cs => [...cs].sort((a, b) => b.price - a.price)[0]),
  'always the first card': c => playSlotBySlot(c, (cs, dealt) => dealt.find(x => cs.includes(x)) ?? cs[0]),
  'random XI': c => playSlotBySlot(c, cs => cs[Math.floor(rng() * cs.length)]),
};

/* ================================================================ 1 */
section = 1;
console.log(`\n1) every offered season is deep enough for a full XI with real choice in every slot (${camps.length} campaigns assembled)`);
const FLOOR = 4 * CANDIDATES_PER_SLOT;
function depth(year) {
  const byName = new Map();
  for (const r of data.pools[year] ?? []) {
    if (!r.player_name || !r.market_value_usd || !r.final_value_usd) continue;
    const prev = byName.get(r.player_name);
    if (!prev || prev.market_value_usd < r.market_value_usd) byName.set(r.player_name, r);
  }
  const eligible = [...byName.values()].filter(r => r.market_value_usd >= POOL_FLOOR && r.final_value_usd > 0);
  return STOCK_FORMATION.slots.map(slot => {
    const key = slot.allowed.join(',');
    const sharing = STOCK_FORMATION.slots.filter(s => s.allowed.join(',') === key).length;
    const fit = eligible.filter(r => { const p = sd.normalizePosition(r.position || ''); return p !== null && slot.allowed.includes(p); }).length;
    return { label: slot.label, fit, sharing, perSlot: fit / sharing };
  });
}
let shallowest = Infinity;
{
  for (const year of START_YEARS) {
    const d = depth(year);
    const worst = d.reduce((w, s) => (s.perSlot < w.perSlot ? s : w));
    shallowest = Math.min(shallowest, worst.perSlot);
    const assembled = camps.filter(c => c.startYear === year).length;
    console.log(`   ${year}: ${d.map(s => `${s.label} ${s.sharing > 1 ? `${s.fit}/${s.sharing}` : s.fit}`).join(' ')}; shallowest slot ${worst.label} at ${worst.perSlot} real choices; ${assembled} of ${SEEDS_PER_YEAR} seeds assembled`);
    if (worst.perSlot < FLOOR) fail(`${year} is offered but its ${worst.label} slot has ${worst.perSlot} real choices, under the floor of ${FLOOR}`);
    if (assembled < SEEDS_PER_YEAR) fail(`${year}: only ${assembled} of ${SEEDS_PER_YEAR} seeds assembled a full XI`);
  }
  const before = START_YEARS[0] - 1;
  const d = depth(before);
  if (d.length === 0 || !data.pools[before]) fail(`no saved pool for ${before}, so nothing proves the depth floor excludes anything; refresh`);
  else {
    const worst = d.reduce((w, s) => (s.perSlot < w.perSlot ? s : w));
    console.log(`   ${before} (not offered): shallowest slot ${worst.label} at ${worst.perSlot}, ${worst.perSlot < FLOOR ? 'fails the floor as it should' : 'CLEARS THE FLOOR'}`);
    if (worst.perSlot >= FLOOR) fail(`${before} clears the floor of ${FLOOR} and is not offered, so the floor is not what decides the list`);
  }
  console.log(`   measured: at least ${shallowest} real choices in every slot of every offered season`);
}

/* ================================================================ 2 */
section = 2;
console.log('2) no card carries a name, country, club or flag');
{
  const IDENTITY = /name|club|nation|country|flag|photo/i;
  const ALLOWED = new Set(['id', 'position', 'age', 'matches', 'goals', 'assists', 'yellowCards', 'redCards', 'price', 'final']);
  let cards = 0; const leaks = new Set();
  for (const c of camps) {
    for (const slot of c.slots) {
      for (const card of slot.candidates) {
        cards += 1;
        for (const k of Object.keys(card)) {
          if (IDENTITY.test(k)) leaks.add(`field "${k}"`);
          else if (!ALLOWED.has(k)) leaks.add(`unexpected field "${k}"`);
        }
        for (const v of Object.values(card)) if (typeof v === 'string' && allNames.has(v)) leaks.add(`a real name as a value`);
      }
    }
  }
  console.log(`   ${cards} cards read: fields ${[...ALLOWED].join(', ')}; identity leaks ${leaks.size}`);
  for (const l of leaks) fail(`a dealt card carries ${l}`);
}

/* ================================================================ 3 */
section = 3;
console.log('3) a thinking buyer beats the lazy ones');
const table = {};
for (const [name, buy] of Object.entries(BUYERS)) {
  const scores = []; const spends = [];
  for (const c of camps) {
    const picks = buy(c);
    const r = scoreCampaign(c, picks);
    scores.push(r.score); spends.push(r.spend);
  }
  table[name] = { scores, spends };
}
{
  for (const [name, r] of Object.entries(table)) {
    console.log(`   ${name}: mean ${mean(r.scores).toFixed(1)}, deploys ${m$(mean(r.spends))} of ${m$(STOCK_BUDGET)}`);
  }
  const think = table['thinking buyer'].scores;
  /* Floors from measured headroom (2026-09-05, 400 campaigns on the saved
     rows): the thinking buyer scored 60.7 against 24.5 for the cheapest XI,
     37.6 for spend it all and 36.7 for the first card, gaps of 36.2, 23.1
     and 24.0 points, ahead on 91.0, 78.5 and 82.0 percent of campaigns. A
     floor of 12 points and 65 percent sits well under every one of those and
     well above a broken game (the Round 434 defect put the cheapest XI 77
     points AHEAD of a spender). */
  for (const rival of ['cheapest XI', 'spend it all XI', 'always the first card']) {
    const other = table[rival].scores;
    const gap = mean(think) - mean(other);
    const ahead = think.filter((v, i) => v > other[i]).length;
    const pct = (100 * ahead) / camps.length;
    console.log(`   thinking buyer against ${rival}: ${gap >= 0 ? '+' : ''}${gap.toFixed(1)} points, ahead on ${ahead} of ${camps.length} (${pct.toFixed(1)} percent)`);
    if (gap < 12) fail(`the thinking buyer is only ${gap.toFixed(1)} points ahead of ${rival}, which is not a game about reading the card`);
    if (pct < 65) fail(`the thinking buyer is ahead of ${rival} on only ${pct.toFixed(1)} percent of campaigns, so the edge is noise`);
  }
}

/* ================================================================ 4 */
section = 4;
console.log('4) the years are the table\'s own rows, never interpolated');
const sample = camps.filter((_, i) => i % 5 === 0);
{
  let cells = 0; let gaps = 0; const wrong = [];
  for (const c of sample) {
    const picks = BUYERS['thinking buyer'](c);
    const names = picks.map(p => identityOf(c, p));
    const holdings = buildHoldings(c, picks, historyRowsFor(data, names));
    const steps = yearSteps(holdings, c.startYear, c.finalYear);
    if (steps.length !== c.finalYear - c.startYear) wrong.push(`${steps.length} steps for ${c.startYear} to ${c.finalYear}`);
    holdings.forEach((h, i) => {
      const truth = new Map((data.histories[names[i]] ?? []).filter(([, v]) => v > 0).map(([y, v]) => [y, v]));
      for (let k = 0; k < h.series.length; k += 1) {
        const y = c.startYear + k;
        const real = truth.has(y) ? truth.get(y) : null;
        const got = h.series[k];
        cells += 1;
        if (real === null) {
          gaps += 1;
          if (got !== null) wrong.push(`${names[i]} ${y}: shown ${got} where the table has no row`);
        } else if (got !== real) wrong.push(`${names[i]} ${y}: shown ${got}, the table says ${real}`);
        if (k > 0) {
          const line = steps[k - 1].lines[i];
          if (line.value !== got) wrong.push(`${names[i]} ${y}: the step shows ${line.value}, the holding ${got}`);
        }
      }
      if (h.series[h.series.length - 1] !== h.final && h.series[h.series.length - 1] !== null) wrong.push(`${names[i]}: final season ${h.series[h.series.length - 1]} disagrees with the card's final ${h.final}`);
    });
    for (const st of steps) {
      if (st.known !== st.lines.filter(l => l.value !== null).length) wrong.push(`${st.year}: known count ${st.known} disagrees with the lines`);
    }
  }
  console.log(`   ${sample.length} campaigns, ${cells} holding seasons checked: ${gaps} with no row (shown as such), ${wrong.length} wrong`);
  for (const w of wrong.slice(0, 6)) fail(w);
  if (wrong.length > 6) fail(`and ${wrong.length - 6} more`);
  if (gaps === 0) fail('the sample has no season without a row, so the "no row" path was never exercised; widen the sample');
}

/* ================================================================ 5 */
section = 5;
console.log('5) the reveal names exactly the eleven bought');
{
  let checked = 0;
  for (const c of sample) {
    const picks = BUYERS['random XI'](c);
    const names = picks.map(p => identityOf(c, p));
    const holdings = buildHoldings(c, picks, historyRowsFor(data, names));
    checked += 1;
    if (holdings.length !== picks.length) fail(`${holdings.length} holdings for ${picks.length} picks`);
    if (new Set(names).size !== names.length) fail(`the reveal names a player twice: ${names.join(', ')}`);
    holdings.forEach((h, i) => {
      if (h.name !== names[i]) fail(`holding ${i} reveals ${h.name}, the pick was ${names[i]}`);
      if (!allNames.has(h.name)) fail(`the reveal names "${h.name}", which is not a player in the saved pool`);
      if (h.slot !== c.slots[i].slot.label) fail(`holding ${i} is labelled ${h.slot}, the slot was ${c.slots[i].slot.label}`);
      if (h.price !== picks[i].price || h.final !== picks[i].final) fail(`holding ${i} carries a different price or final than the card bought`);
    });
    if (Object.keys(c.identities).length !== c.slots.length * CANDIDATES_PER_SLOT) fail(`${Object.keys(c.identities).length} identities for ${c.slots.length * CANDIDATES_PER_SLOT} cards`);
  }
  console.log(`   ${checked} campaigns: eleven real, distinct names, each on the card that was bought`);
}

/* ================================================================ 6 */
section = 6;
console.log('6) determinism, and the daily seed reaches every offered season');
{
  const fp = c => c.startYear + '|' + c.slots.map(s => s.candidates.map(x => `${c.identities[x.id]}:${x.price}`).join(',')).join(';');
  const rows = data.pools[START_YEARS[3]];
  if (fp(assembleCampaign(rows, 777, START_YEARS[3])) !== fp(assembleCampaign(rows, 777, START_YEARS[3]))) fail('the same seed assembled two different campaigns');
  const seen = new Map();
  let bad = 0;
  const start = Date.UTC(2026, 8, 5);
  for (let d = 0; d < 365; d += 1) {
    const dateStr = new Date(start + d * 86400000).toISOString().slice(0, 10);
    const seed = dailyCampaignSeed(dateStr);
    const year = startYearFor(seed);
    if (!(seed >= 0) || !START_YEARS.includes(year)) bad += 1;
    seen.set(year, (seen.get(year) ?? 0) + 1);
  }
  console.log(`   365 dates from 2026-09-05: ${bad} without an offered season; ${[...seen.entries()].sort((a, b) => a[0] - b[0]).map(([y, n]) => `${y} x${n}`).join(' ')}`);
  if (bad > 0) fail(`${bad} date(s) do not land on an offered season`);
  for (const y of START_YEARS) if (!seen.has(y)) fail(`no date in the year opens the ${y} market`);
}

/* ================================================================ 7 */
section = 7;
console.log('7) the cap, measured');
{
  let top = -Infinity; let bestNot100 = 0; let worstNot0 = 0;
  for (const c of camps) {
    const b = scoreCampaign(c, bestAffordableXI(c)).score;
    const w = scoreCampaign(c, worstAffordableXI(c)).score;
    if (b !== 100) bestNot100 += 1;
    if (w !== 0) worstNot0 += 1;
    top = Math.max(top, b, ...Object.values(table).map(r => 0));
  }
  const everything = Object.values(table).flatMap(r => r.scores);
  const over = everything.filter(s => s > 100).length;
  console.log(`   the best affordable XI scores 100 on ${camps.length - bestNot100} of ${camps.length} campaigns, the worst scores 0 on ${camps.length - worstNot0}; ${everything.length} scored runs, ${over} above 100`);
  if (bestNot100 > 0) fail(`${bestNot100} campaign(s) where the best affordable XI does not score 100, so the cap is not 100`);
  if (worstNot0 > 0) fail(`${worstNot0} campaign(s) where the worst affordable XI does not score 0`);
  if (over > 0) fail(`${over} run(s) scored above 100`);
  console.log('   measured cap: 100, the score of the best XI the wallet can buy from the day\'s cards');
}

/* ================================================================ */
console.log('');
if (CONTROL === 'leakname') {
  if (failed.has(2)) { console.log(`simStockFormat control "leakname": section 2 went red as expected (${failures} failure(s)), the check works`); process.exit(0); }
  console.error('simStockFormat control "leakname": the name was on every card and section 2 stayed green, the check is dead');
  process.exit(1);
}
if (CONTROL === 'interpolate') {
  if (failed.has(4)) { console.log(`simStockFormat control "interpolate": section 4 went red as expected (${failures} failure(s)), the check works`); process.exit(0); }
  console.error('simStockFormat control "interpolate": missing seasons were filled and section 4 stayed green, the check is dead');
  process.exit(1);
}
if (failures > 0) { console.error(`simStockFormat: ${failures} failure${failures === 1 ? '' : 's'}`); process.exit(1); }
console.log(`simStockFormat: green. Every offered season deals real choice, no card names anyone, reading the card beats every lazy buyer, the years are the table's rows, and the cap is 100.`);
