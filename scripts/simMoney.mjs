/**
 * Round 134 harness: money is a game you can get wrong.
 *
 * The owner's note: "In the bank there should be more options on what u can do
 * with ur money... Like if u invest in stocks but u actually have to choose
 * correctly when to buy or sell and such. Or crypto. Or other stuff like that
 * or just leave it in an index fund or your savings to get at least a little
 * apy... And there should be a lot more things u can do with ur money... Also
 * there should be a limit on how much of ur previous transactions are shown."
 *
 * Eight things this measures, all of them over hundreds of careers rather than
 * one lucky run:
 *
 *  1. the catalogue is clean: every asset and every new item has a real
 *     effect, nothing names another company's product, no em or en dashes
 *  2. the market itself: savings beats a mattress, the fund beats savings on
 *     average, the wild one genuinely loses, and none of them is a printer
 *  3. timing matters: buying cheap and selling dear finishes measurably richer
 *     than buying blindly, and buying dear finishes measurably poorer, and the
 *     whole spread is small enough that football is still the game
 *  4. wealth changes something you can measure, so it is not a scoreboard
 *  5. the card school on the bus loses more often than it wins, is capped
 *     twice, closes itself for good, and can never take a career down
 *  6. the phone quiz only ever asks things the save can actually answer
 *  7. the statement and the whole save stay bounded over a 20 season career
 *  8. a save from before this round opens on every screen and then plays
 *
 * Run: node scripts/simMoney.mjs [careers]
 */
import { build } from 'esbuild';
import os from 'node:os';
import { pathToFileURL } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ENTRY = path.join(os.tmpdir(), 'moneyEntry.mjs');
const BUNDLE = path.join(os.tmpdir(), 'money.bundle.mjs');
const CAREERS = Number(process.argv[2] || 260);

fs.writeFileSync(ENTRY, `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const engine = await import('${ROOT.replaceAll('\\', '/')}/src/lib/soccerCareerEngine.ts');
const money = await import('${ROOT.replaceAll('\\', '/')}/src/lib/soccerMoney.ts');
const arcade = await import('${ROOT.replaceAll('\\', '/')}/src/lib/soccerArcade.ts');
const phone = await import('${ROOT.replaceAll('\\', '/')}/src/lib/soccerPhone.ts');
export { engine, money, arcade, phone };
`);
await build({
  entryPoints: [ENTRY], bundle: true, format: 'esm', platform: 'node',
  outfile: BUNDLE, logLevel: 'error', alias: { '@': './src' },
});
const { engine, money, arcade, phone } = await import(pathToFileURL(BUNDLE).href);

const {
  initCareer, advanceYouthYear, advanceProSeason, applyMoneyAction,
  repairCareer, SPENDING_ITEMS, getSpendingItem, FALLBACK_CLUBS,
} = engine;
const {
  ASSETS, ensureMoney, moneySeasonTick, moneyWealth, investedValue, holdingValue,
  priceRead, anchorOf, spendable, bankSummary, cardCap, cardStatus,
  MAX_LEDGER, MAX_HISTORY, PAR, SAVINGS_RATE, CARD_WIN, CARD_PAYS, CARD_MAX,
  CARD_SHUT, ARCADE_PRIZE,
} = money;
const { arcadeQuestions } = arcade;
const { phoneWorld } = phone;

let failures = 0;
const fail = msg => { failures += 1; console.error('  FAIL: ' + msg); };
const flat = o => ({ pace: o, shooting: o, passing: o, dribbling: o, defending: o, physical: o, reflexes: o });
const DASH = /[–—]/;
/* Word boundaries and no bare "2K", because "€2k/month" is a price and not a
   product. simNoRivalNames.mjs learned the same lesson about ordinary English. */
const BRANDS = /\b(BitLife|NBA ?2K|FIFA\s*\d|EA\s+Sports|Madden|Football\s+Manager|Grand\s+Theft\s+Auto|GTA)\b/i;  // rival-names-allow: this list IS the check, same as the other lint sims
const NATIONS = ['England', 'Spain', 'France', 'Brazil', 'Germany', 'Argentina', 'Portugal', 'Italy'];
const POSITIONS = ['ST', 'CM', 'CB', 'LW', 'GK', 'CAM', 'RB'];

const mulberry32 = a => () => {
  a |= 0; a = (a + 0x6D2B79F5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const REAL_RANDOM = Math.random;
const avg = (arr, f = v => v) => arr.length ? arr.reduce((s, r) => s + f(r), 0) / arr.length : 0;
const sd = (arr, f = v => v) => {
  if (arr.length < 2) return 0;
  const m = avg(arr, f);
  return Math.sqrt(arr.reduce((s, r) => s + (f(r) - m) ** 2, 0) / (arr.length - 1));
};
const q = (arr, p) => {
  if (!arr.length) return 0;
  const s = arr.slice().sort((a, b) => a - b);
  return s[Math.max(0, Math.min(s.length - 1, Math.floor(p * (s.length - 1))))];
};

/* ---------- 1. Catalogue lint ---------- */
console.log(`1) Catalogue: ${ASSETS.length} tradable things, ${SPENDING_ITEMS.length} things to buy`);
{
  const ids = new Set();
  for (const a of ASSETS) {
    if (ids.has(a.id)) fail(`duplicate asset id ${a.id}`);
    ids.add(a.id);
    for (const str of [a.name, a.blurb]) {
      if (DASH.test(str)) fail(`asset ${a.id}: dash in "${str}"`);
      if (BRANDS.test(str)) fail(`asset ${a.id}: product name in "${str}"`);
    }
    if (!(a.vol > 0 && a.vol < 0.8)) fail(`asset ${a.id}: volatility ${a.vol} out of bounds`);
    if (!(a.pull > 0 && a.pull <= 0.8)) fail(`asset ${a.id}: pull ${a.pull} out of bounds`);
    if (!(a.drift >= 0 && a.drift <= 0.09)) fail(`asset ${a.id}: drift ${a.drift} out of bounds`);
  }
  const kinds = new Set(ASSETS.map(a => a.kind));
  if (!kinds.has('fund')) fail('nowhere safe and boring to leave money');
  if (!kinds.has('coin')) fail('nothing genuinely risky to get wrong');
  if (ASSETS.filter(a => a.risk === 'steady').length < 2) fail('only one low risk option');

  /* The new Round 134 items are the answer to "a lot more things u can do with
     ur money", so each one has to actually do something every season. */
  const perSeason = SPENDING_ITEMS.filter(i => i.perSeason || i.sponsorMult || i.injuryDrop);
  console.log(`   ${perSeason.length} items now change something every season you own them`);
  if (perSeason.length < 14) fail(`only ${perSeason.length} items with an ongoing effect`);
  for (const item of SPENDING_ITEMS) {
    for (const str of [item.name, item.description, item.effect || '']) {
      if (DASH.test(str)) fail(`item ${item.id}: dash in "${str.slice(0, 40)}"`);
      if (BRANDS.test(str)) fail(`item ${item.id}: product name in "${str.slice(0, 40)}"`);
    }
    const p = item.perSeason;
    if (!p) continue;
    if (!item.effect) fail(`item ${item.id} has an ongoing effect nobody is told about`);
    if (Math.abs(p.morale ?? 0) > 3) fail(`item ${item.id}: ${p.morale} morale a season is too much`);
    if (Math.abs(p.popularity ?? 0) > 3) fail(`item ${item.id}: ${p.popularity} popularity a season is too much`);
    if ((p.statAmount ?? 0) > 1) fail(`item ${item.id}: ${p.statAmount} stat a season is too much`);
  }
  const owned = SPENDING_ITEMS.filter(i => i.sponsorMult);
  const stacked = owned.reduce((m, i) => m * i.sponsorMult, 1);
  console.log(`   sponsorship items stack to ${stacked.toFixed(2)}x before the 1.35x cap`);
}

/* ---------- helpers ---------- */

function freshCareer(seed) {
  Math.random = mulberry32(seed);
  const c = initCareer(
    `P${seed}`,
    NATIONS[seed % NATIONS.length],
    POSITIONS[seed % POSITIONS.length],
    'modern', flat(58), 58, 2020, FALLBACK_CLUBS, null, 76 + (seed % 14),
  );
  Math.random = REAL_RANDOM;
  return c;
}

const wealthOf = c => Math.round((c.netWorth + moneyWealth(c)) * 100) / 100;

function act(c, action) {
  const res = applyMoneyAction(c, action);
  return res.state;
}

/* The five strategies. Each one gets the SAME career seed, so the only thing
   that differs between two runs is what the player did with the money. */
const STRATS = {
  mattress: () => [],
  savings: c => {
    const free = spendable(c);
    return free > 1 ? [{ t: 'deposit', amount: free * 0.8 }] : [];
  },
  hold: c => {
    const free = spendable(c);
    return free > 1 ? [{ t: 'buy', id: 'ladder', amount: free * 0.7 }] : [];
  },
  timer: c => {
    const m = ensureMoney(c);
    const out = [];
    // Sell anything that has run dear.
    for (const a of ASSETS) {
      if ((m.hold[a.id] ?? 0) <= 0) continue;
      if (priceRead(m, a.id).ratio >= 1.18) out.push({ t: 'sell', id: a.id, frac: 1 });
    }
    // Buy the cheapest thing on the board, when it is genuinely cheap.
    const cheap = ASSETS.slice().sort((x, y) => priceRead(m, x.id).ratio - priceRead(m, y.id).ratio)[0];
    const free = spendable(c);
    if (free > 1 && priceRead(m, cheap.id).ratio <= 0.88) out.push({ t: 'buy', id: cheap.id, amount: free * 0.7 });
    else if (free > 1) out.push({ t: 'deposit', amount: free * 0.7 });
    return out;
  },
  chaser: c => {
    const m = ensureMoney(c);
    const out = [];
    // Sells in a panic when something is cheap, buys whatever is hottest.
    for (const a of ASSETS) {
      if ((m.hold[a.id] ?? 0) <= 0) continue;
      if (priceRead(m, a.id).ratio <= 0.85) out.push({ t: 'sell', id: a.id, frac: 1 });
    }
    const dear = ASSETS.slice().sort((x, y) => priceRead(m, y.id).ratio - priceRead(m, x.id).ratio)[0];
    const free = spendable(c);
    if (free > 1 && priceRead(m, dear.id).ratio >= 1.1) out.push({ t: 'buy', id: dear.id, amount: free * 0.7 });
    return out;
  },
};

function runCareer(seed, strat, opts = {}) {
  let c = freshCareer(seed);
  const play = STRATS[strat];
  let guard = 0;
  const buys = [];
  while (!c.retired && guard < 34) {
    guard += 1;
    if (c.phase !== 'youth') {
      /* Spending comes first on purpose. A player decides what his life looks
         like and then invests what is left, not the other way round, and doing
         it the other way round meant the spender arm never had a penny of cash
         to spend and the whole comparison measured nothing. */
      if (opts.spend) c = spendOnLife(c, buys);
      for (const action of play(c)) c = act(c, action);
      if (opts.cards) {
        const cap = cardCap(c);
        if (cap > 0 && cardStatus(c).open) c = act(c, { t: 'cards', stake: cap });
      }
    }
    Math.random = mulberry32(seed * 7919 + guard);
    c = c.phase === 'youth' ? advanceYouthYear(c, FALLBACK_CLUBS) : advanceProSeason(c, FALLBACK_CLUBS);
    if (c.transferSituation) c = { ...c, transferSituation: null };
    Math.random = REAL_RANDOM;
  }
  return { state: c, buys };
}

/* The spender buys the things that change the game, cheapest first, and only
   what he can comfortably afford. The hoarder buys nothing at all. */
const LIFE_WANTS = [
  'staff_family_cook', 'staff_analyst', 'driver_car', 'home_gym', 'staff_physio_call',
  'home_by_training', 'give_food_bank', 'staff_media', 'give_kid_career', 'home_pitch',
  'biz_five_a_side', 'give_home_club', 'staff_perf_team', 'classic_car', 'home_quiet',
  'staff_kids_tutor', 'give_ward',
];
function spendOnLife(c, log) {
  for (const id of LIFE_WANTS) {
    if ((c.purchasedItems ?? []).includes(id)) continue;
    const item = getSpendingItem(id);
    if (!item) continue;
    // Cheap first, and never on money he would miss.
    if (c.netWorth < item.cost * 1.6 + 0.6) continue;
    if (item.minNetWorth && c.netWorth < item.minNetWorth) continue;
    const res = applyMoneyAction(c, { t: 'buyItem', id });
    if (res.state !== c) { c = res.state; log.push(id); }
    break; // one a season, so this is a career of decisions rather than a spree
  }
  return c;
}

/* ---------- 2. The market on its own ---------- */
console.log('2) 2000 markets, 20 seasons each, nobody trading');
{
  const end = {}, low = {}, high = {}, dip = {};
  for (const a of ASSETS) { end[a.id] = []; low[a.id] = []; high[a.id] = []; dip[a.id] = []; }
  for (let i = 0; i < 2000; i++) {
    const s = { playerName: `M${i}`, seasons: [{ year: 2020 }], netWorth: 50, morale: 60, karma: 50, lifestyleCostPerYear: 0.5 };
    s.money = ensureMoney(s);
    s.money.seed = (i * 2654435761 + 17) >>> 0 || 1;
    const mins = {}, maxs = {}, dips = {};
    for (const a of ASSETS) { mins[a.id] = Infinity; maxs[a.id] = 0; dips[a.id] = Infinity; }
    for (let k = 1; k <= 20; k++) {
      s.seasons = [{ year: 2020 + k }];
      moneySeasonTick(s, 2020 + k);
      for (const a of ASSETS) {
        const p = s.money.price[a.id];
        if (p < mins[a.id]) mins[a.id] = p;
        if (p > maxs[a.id]) maxs[a.id] = p;
        /* Cheapest this thing ever got against what it was worth at the time,
           which is the only measure of "there was a moment to buy" that means
           anything once the anchor is climbing. */
        const r = p / anchorOf(a, k);
        if (r < dips[a.id]) dips[a.id] = r;
      }
    }
    for (const a of ASSETS) {
      end[a.id].push(s.money.price[a.id]);
      low[a.id].push(mins[a.id]);
      high[a.id].push(maxs[a.id]);
      dip[a.id].push(dips[a.id]);
    }
    if (s.money.hist[ASSETS[0].id].length > MAX_HISTORY) fail('price history is not capped');
  }
  const mattress = PAR;
  const savings = PAR * Math.pow(1 + SAVINGS_RATE, 20);
  console.log(`   a mattress after 20 seasons: ${mattress}. Savings at ${(SAVINGS_RATE * 100).toFixed(1)}% a season: ${savings.toFixed(0)}`);
  for (const a of ASSETS) {
    console.log(
      `   ${a.emoji} ${a.name.padEnd(20)} p10 ${q(end[a.id], 0.1).toFixed(0).padStart(4)}  median ${q(end[a.id], 0.5).toFixed(0).padStart(4)}  p90 ${q(end[a.id], 0.9).toFixed(0).padStart(4)}` +
      `   typical low ${q(low[a.id], 0.5).toFixed(0).padStart(3)}  typical high ${q(high[a.id], 0.5).toFixed(0).padStart(4)}` +
      `   cheapest against its own level ${(q(dip[a.id], 0.5) * 100).toFixed(0)}%`,
    );
  }
  if (savings <= mattress) fail('savings does not beat a mattress');
  const fund = end.ladder;
  if (q(fund, 0.5) <= savings) fail('the index fund does not beat savings on the median');
  if (q(fund, 0.1) <= mattress) fail('the safe fund lost money one time in ten, that is not safe');
  const coin = end.spark;
  if (q(coin, 0.1) >= PAR * 0.8) fail('the wild one never actually loses, so it is not a risk');
  if (q(coin, 0.5) > PAR * 1.6) fail('holding the wild one is a free ride');
  for (const a of ASSETS) {
    if (q(end[a.id], 0.99) > PAR * 12) fail(`${a.id} reached ${q(end[a.id], 0.99).toFixed(0)}, that is a printer`);
    /* Every one of them has to go on sale at some point in a career, or the
       "buy it cheap" half of the decision does not exist. The fund is allowed
       to be the boring one and only ever dips a little. */
    const want = a.id === 'ladder' ? 0.97 : 0.9;
    if (q(dip[a.id], 0.5) > want) {
      fail(`${a.id} only ever got down to ${(q(dip[a.id], 0.5) * 100).toFixed(0)}% of its own level, there is no moment to buy`);
    }
  }
}

/* ---------- 3. Timing, against holding, against a mattress ---------- */
console.log(`3) ${CAREERS} careers per strategy, same seeds, only the money decisions differ`);
{
  const runs = {};
  for (const name of Object.keys(STRATS)) runs[name] = [];
  for (let i = 0; i < CAREERS; i++) {
    for (const name of Object.keys(STRATS)) {
      try {
        runs[name].push(runCareer(6000 + i, name).state);
      } catch (e) {
        fail(`${name} career ${i} crashed: ${e && e.message}`);
        i = CAREERS;
        break;
      }
    }
  }
  const line = (label, arr) =>
    `   ${label.padEnd(9)} median wealth ${q(arr.map(wealthOf), 0.5).toFixed(1).padStart(7)}m   mean ${avg(arr, wealthOf).toFixed(1).padStart(7)}m` +
    `   worst tenth ${q(arr.map(wealthOf), 0.1).toFixed(1).padStart(6)}m   best tenth ${q(arr.map(wealthOf), 0.9).toFixed(1).padStart(7)}m`;
  for (const name of Object.keys(STRATS)) console.log(line(name, runs[name]));

  const n = runs.mattress.length;
  if (n < 120) fail(`only ${n} careers completed`);
  const mean = name => avg(runs[name], wealthOf);
  /* Paired, because every strategy played the SAME career on the same seed and
     the only difference between two arms is what was done with the money. The
     unpaired version of this reads two sigma lower on identical data, purely
     because two thirds of the spread in final wealth is which club signed him
     at nineteen, and that part is shared. Round 125 repaired three guards that
     failed on noise alone, so the margins below come off the measured spread
     of the DIFFERENCES rather than off a number that sounds strict. */
  const paired = (a, b) => {
    const d = runs[a].map((c, i) => wealthOf(c) - wealthOf(runs[b][i]));
    const se = sd(d) / Math.sqrt(d.length);
    return { gap: avg(d), se, sigma: avg(d) / Math.max(se, 1e-9), won: d.filter(v => v > 0).length, n: d.length };
  };
  const report = (label, a, b) => {
    const r = paired(a, b);
    console.log(`   ${label.padEnd(24)} ${r.gap >= 0 ? '+' : ''}${r.gap.toFixed(2)}m  (${r.sigma.toFixed(1)} sigma, ahead in ${r.won} of ${r.n} careers)`);
    return r;
  };
  const rSave = report('savings over a mattress', 'savings', 'mattress');
  const rHold = report('the fund over savings', 'hold', 'savings');
  const rTime = report('timing over holding', 'timer', 'hold');
  const rChase = report('holding over chasing', 'hold', 'chaser');

  if (rSave.sigma <= 3) fail('leaving it in savings is inside the noise of doing nothing');
  if (rHold.sigma <= 3) fail('the fund is inside the noise of savings');
  if (rTime.sigma <= 3) fail('timing the market is worth nothing measurable');
  if (rChase.sigma <= 3) fail('buying dear and selling cheap costs nothing, so there is nothing to get wrong');
  if (rTime.won < n * 0.6) fail(`timing only came out ahead in ${rTime.won} of ${n}, that is a coin flip`);

  /* And the ceiling. Money is a thing you do beside football, not instead of
     it, so the whole spread between the best and the worst money player has to
     stay inside the same order of magnitude. */
  const ratio = mean('timer') / mean('mattress');
  console.log(`   best money player finishes ${ratio.toFixed(2)}x the wealth of the one who never invested`);
  if (ratio > 3.2) fail(`timing is worth ${ratio.toFixed(2)}x, money has become the whole game`);
  if (ratio < 1.05) fail('doing money well is worth nothing at all');

  const losers = runs.timer.filter(c => wealthOf(c) < 1).length;
  const chaseLosers = runs.chaser.filter(c => wealthOf(c) < 1).length;
  console.log(`   careers that ended under 1m: ${losers} timing, ${chaseLosers} chasing, of ${n} each`);
  for (const name of Object.keys(STRATS)) {
    for (const c of runs[name]) {
      if (!Number.isFinite(c.netWorth)) fail(`${name}: net worth went to ${c.netWorth}`);
      if (c.netWorth < -3) fail(`${name}: a career ended at ${c.netWorth.toFixed(1)}m, the floor failed`);
      const m = ensureMoney(c);
      for (const a of ASSETS) if ((m.hold[a.id] ?? 0) < 0) fail(`${name}: negative holding in ${a.id}`);
      if (m.vault < 0) fail(`${name}: negative savings`);
    }
  }
}

/* ---------- 4. Wealth changes something you can measure ---------- */
console.log('4) Spending it against hoarding it, same seeds');
{
  const spenders = [], hoarders = [];
  const bought = [];
  for (let i = 0; i < Math.max(140, Math.floor(CAREERS * 0.6)); i++) {
    try {
      /* Neither arm invests a penny, so this measures one thing and one thing
         only: what happens when the money leaves the account and becomes a
         house, a physio, an analyst and a food bank. */
      const s = runCareer(7300 + i, 'mattress', { spend: true });
      spenders.push(s.state); bought.push(s.buys.length);
      hoarders.push(runCareer(7300 + i, 'mattress').state);
    } catch (e) {
      fail(`spend career ${i} crashed: ${e && e.message}`);
      break;
    }
  }
  const peak = c => c.peakOverall ?? c.overall;
  const apps = c => c.seasons.reduce((s, x) => s + x.apps, 0);
  const legacy = c => c.integrityBonus ?? 0;
  const pop = c => c.popularity;
  const mor = c => c.morale;
  const show = (label, arr) =>
    `   ${label.padEnd(9)} peak ${avg(arr, peak).toFixed(2)}  apps ${avg(arr, apps).toFixed(0)}  morale ${avg(arr, mor).toFixed(1)}  popularity ${avg(arr, pop).toFixed(1)}  legacy credit ${avg(arr, legacy).toFixed(1)}  wealth ${avg(arr, wealthOf).toFixed(1)}m`;
  console.log(show('spends', spenders));
  console.log(show('hoards', hoarders));
  console.log(`   the spender bought ${avg(bought).toFixed(1)} things over a career`);

  /* Paired again, and it matters even more here than it did on the money:
     nearly all of the spread in career appearances is which club signed him
     and whether his knee held up at twenty five, and both arms share every bit
     of that because they are the same career with the same seeds. */
  const n = spenders.length;
  const pairs = f => {
    const d = spenders.map((c, i) => f(c) - f(hoarders[i]));
    const se = sd(d) / Math.sqrt(d.length);
    return { gap: avg(d), sigma: avg(d) / Math.max(se, 1e-9) };
  };
  const rPeak = pairs(peak), rApps = pairs(apps), rLeg = pairs(legacy), rPop = pairs(pop), rMor = pairs(mor);
  console.log(`   peak overall ${rPeak.gap >= 0 ? '+' : ''}${rPeak.gap.toFixed(2)} (${rPeak.sigma.toFixed(1)} sigma), appearances ${rApps.gap >= 0 ? '+' : ''}${rApps.gap.toFixed(0)} (${rApps.sigma.toFixed(1)} sigma)`);
  console.log(`   morale ${rMor.gap >= 0 ? '+' : ''}${rMor.gap.toFixed(1)} (${rMor.sigma.toFixed(1)} sigma), popularity ${rPop.gap >= 0 ? '+' : ''}${rPop.gap.toFixed(1)} (${rPop.sigma.toFixed(1)} sigma), legacy credit ${rLeg.gap >= 0 ? '+' : ''}${rLeg.gap.toFixed(1)} (${rLeg.sigma.toFixed(1)} sigma)`);
  if (avg(bought) < 6) fail('the spender never actually got to buy anything');
  // A football outcome, not just a nicer set of numbers on the profile.
  if (rPeak.sigma < 3 && rApps.sigma < 3) fail('spending money changes nothing on the pitch');
  if (rPeak.gap > 6) fail(`spending is worth ${rPeak.gap.toFixed(2)} peak overall, that is pay to win`);
  if (rApps.gap > 60) fail(`spending is worth ${rApps.gap.toFixed(0)} appearances, that is pay to win`);
  if (rLeg.sigma < 3) fail('giving money away leaves no mark at all');
  if (rMor.sigma < 3) fail('a better life leaves him in exactly the same mood');
  // Spending has to cost something, or it is not a decision.
  if (avg(spenders, wealthOf) >= avg(hoarders, wealthOf)) fail('spending money left the player richer, so nothing was spent');
}

/* ---------- 5. The card school ---------- */
console.log('5) The card school on the bus');
{
  let wins = 0, plays = 0, net = 0;
  const nets = [];
  for (let i = 0; i < 900; i++) {
    let c = { playerName: `C${i}`, seasons: [{ year: 2020 }], netWorth: 30, morale: 60, karma: 50, events: [], lifestyleCostPerYear: 0.5 };
    c.money = ensureMoney(c);
    c.money.seed = (i * 40503 + 7) >>> 0 || 1;
    const before = c.netWorth;
    for (let k = 1; k <= 25; k++) {
      c = { ...c, seasons: [{ year: 2020 + k }] };
      const cap = cardCap(c);
      if (cap > 0 && cardStatus(c).open) {
        const beforeWorth = c.netWorth;
        const res = applyMoneyAction(c, { t: 'cards', stake: cap });
        if (res.state !== c) {
          plays += 1;
          if (res.state.netWorth > beforeWorth) wins += 1;
          c = res.state;
        }
        // A second sitting in the same season must be refused.
        const again = applyMoneyAction(c, { t: 'cards', stake: cap });
        if (again.state !== c) fail('the card school dealt twice in one season');
      }
      moneySeasonTick(c, 2020 + k);
    }
    net += c.netWorth - before;
    nets.push(c.netWorth - before);
  }
  const rate = wins / Math.max(plays, 1);
  console.log(`   ${plays} sittings, ${wins} of them won: ${(rate * 100).toFixed(1)}% (the written figure is ${(CARD_WIN * 100).toFixed(0)}%)`);
  console.log(`   average career result on the bus: ${(net / 900 * 1000).toFixed(0)}k, worst ${(q(nets, 0) * 1000).toFixed(0)}k, best ${(q(nets, 1) * 1000).toFixed(0)}k`);
  if (Math.abs(rate - CARD_WIN) > 0.05) fail(`win rate ${rate.toFixed(3)} is not the ${CARD_WIN} on the screen`);
  if (rate >= 0.5) fail('you win more often than you lose, which is not what gambling is');
  if (net / 900 >= 0) fail('the card school pays out on average, which is a slot machine');
  if (q(nets, 0) < -(CARD_SHUT + CARD_MAX + 0.01)) fail(`somebody lost ${q(nets, 0).toFixed(2)}m, past the point it is supposed to close`);
  // It has to shut itself, and it has to be reachable.
  const shut = nets.filter(v => v <= -CARD_SHUT).length;
  console.log(`   careers where the school closed itself for good: ${shut} of 900`);
  if (shut === 0) fail('the closing rule never fires, so it is not really a limit');
  // Nobody skint gets to sit in.
  const skint = { playerName: 'skint', seasons: [{ year: 2025 }], netWorth: 0.2, morale: 50, karma: 50, events: [] };
  skint.money = ensureMoney(skint);
  if (cardCap(skint) !== 0) fail('a player with nothing was allowed to sit in');
  if (cardStatus(skint).open) fail('the card school opened for a player with nothing');
  const big = { playerName: 'big', seasons: [{ year: 2025 }], netWorth: 400, morale: 50, karma: 50, events: [] };
  big.money = ensureMoney(big);
  if (cardCap(big) > CARD_MAX + 1e-9) fail(`a rich player could stake ${cardCap(big)}m`);
  console.log(`   the biggest stake anybody can ever put in is ${(CARD_MAX * 1000).toFixed(0)}k, and it closes at ${(CARD_SHUT * 1000).toFixed(0)}k down`);
}

/* ---------- 6. The quiz only asks what the save can answer ---------- */
console.log('6) The game inside the game');
{
  let asked = 0, careers = 0;
  const optionCounts = new Set();
  for (let i = 0; i < 60; i++) {
    let c = freshCareer(8800 + i);
    for (let k = 0; k < 8 && !c.retired; k++) {
      Math.random = mulberry32(8800 + i + k);
      c = c.phase === 'youth' ? advanceYouthYear(c, FALLBACK_CLUBS) : advanceProSeason(c, FALLBACK_CLUBS);
      if (c.transferSituation) c = { ...c, transferSituation: null };
      Math.random = REAL_RANDOM;
    }
    const qs = arcadeQuestions(c);
    if (qs.length !== 3) { fail(`a career eight seasons in produced ${qs.length} questions`); continue; }
    careers += 1;
    const world = phoneWorld(c);
    const played = c.seasons.filter(x => x.type !== 'youth');
    for (const item of qs) {
      asked += 1;
      optionCounts.add(item.options.length);
      if (item.options.length !== 4) fail(`a question offered ${item.options.length} options`);
      if (new Set(item.options).size !== item.options.length) fail(`duplicate options in "${item.q}"`);
      if (item.answer < 0 || item.answer >= item.options.length) fail(`"${item.q}" has no answer in its own options`);
      for (const str of [item.q, item.source, ...item.options]) {
        if (DASH.test(str)) fail(`dash in quiz copy "${str.slice(0, 40)}"`);
        if (BRANDS.test(str)) fail(`product name in quiz copy "${str.slice(0, 40)}"`);
      }
      /* Truthfulness. Every right answer has to appear somewhere in the state
         the rest of the game reads, which is the same rule the sports feed has
         lived by since Round 130. */
      const right = item.options[item.answer];
      const known = new Set();
      for (const ss of played) {
        known.add(String(ss.goals)); known.add(String(ss.apps)); known.add(String(ss.assists));
        known.add(String(ss.year)); known.add(ss.club);
      }
      if (world) {
        known.add(world.ucl);
        for (const v of Object.values(world.leagues)) known.add(v);
        for (const mv of world.moves) { known.add(mv.to); known.add(mv.from); }
        if (world.topScorer) { known.add(String(world.topScorer.goals)); known.add(world.topScorer.club); }
      }
      if (!known.has(right)) fail(`the quiz answered "${right}" to "${item.q}", which is not in the save`);
    }
    // Once a season, and the prize is pocket money.
    const before = c.netWorth;
    let res = applyMoneyAction(c, { t: 'arcade', right: 3 });
    if (res.state === c) fail('a fresh career could not play the quiz');
    const gained = res.state.netWorth - before;
    if (Math.abs(gained - ARCADE_PRIZE) > 1e-6) fail(`a perfect round paid ${gained}, not ${ARCADE_PRIZE}`);
    const again = applyMoneyAction(res.state, { t: 'arcade', right: 3 });
    if (again.state !== res.state) fail('the quiz paid out twice in one season');
  }
  console.log(`   ${asked} questions across ${careers} careers, every one of them answerable from the save`);
  console.log(`   a perfect round is worth ${(ARCADE_PRIZE * 1000).toFixed(0)}k and two points of morale, once a season`);
  if (asked < 150) fail('not enough questions generated to trust the check');
}

/* ---------- 7. The statement, and the save ---------- */
console.log('7) Transaction history and save size over a full career');
{
  const sizes = [], shares = [], entries = [];
  for (let i = 0; i < 24; i++) {
    const r = runCareer(9100 + i, 'timer', { spend: true, cards: true });
    const c = r.state;
    const m = ensureMoney(c);
    if (m.log.length > MAX_LEDGER) fail(`${m.log.length} transactions kept, cap is ${MAX_LEDGER}`);
    for (const a of ASSETS) {
      if ((m.hist[a.id] ?? []).length > MAX_HISTORY) fail(`${a.id} kept ${m.hist[a.id].length} prices, cap is ${MAX_HISTORY}`);
    }
    const bank = bankSummary(c);
    if (bank.entries.length > MAX_LEDGER) fail('the bank screen offered more rows than the cap');
    entries.push(m.log.length);
    sizes.push(Buffer.byteLength(JSON.stringify(c)));
    shares.push(Buffer.byteLength(JSON.stringify(c.money ?? {})));
  }
  console.log(`   whole save: median ${(q(sizes, 0.5) / 1024).toFixed(1)} KB, biggest ${(Math.max(...sizes) / 1024).toFixed(1)} KB`);
  console.log(`   the money system's share: mean ${(avg(shares) / 1024).toFixed(2)} KB, biggest ${(Math.max(...shares) / 1024).toFixed(2)} KB`);
  console.log(`   transactions kept at the end of a career: ${Math.max(...entries)} at most, cap ${MAX_LEDGER}`);
  if (Math.max(...sizes) > 46 * 1024) fail(`biggest save is ${(Math.max(...sizes) / 1024).toFixed(1)} KB`);
  if (Math.max(...shares) > 1.6 * 1024) fail('the money system alone is eating more than 1.6 KB');
}

/* ---------- 8. A save from before this round ---------- */
console.log('8) Pre Round 134 saves open cold and then play');
{
  for (let i = 0; i < 30; i++) {
    let c = freshCareer(300 + i);
    for (let k = 0; k < 5 && !c.retired; k++) {
      Math.random = mulberry32(300 + i + k);
      c = c.phase === 'youth' ? advanceYouthYear(c, FALLBACK_CLUBS) : advanceProSeason(c, FALLBACK_CLUBS);
      if (c.transferSituation) c = { ...c, transferSituation: null };
      Math.random = REAL_RANDOM;
    }
    const old = JSON.parse(JSON.stringify(c));
    delete old.money;
    // Every screen the phone can open, on an unrepaired save, before any step.
    try {
      const m = ensureMoney(old);
      if (Object.keys(m.price).length !== ASSETS.length) fail('an old save opened with an incomplete market');
      for (const a of ASSETS) if (m.price[a.id] !== PAR) fail('an old save did not start its market at par');
      if (moneyWealth(old) !== 0) fail('an old save invented money');
      if (investedValue(m) !== 0) fail('an old save invented holdings');
      bankSummary(old);
      arcadeQuestions(old);
      cardCap(old); cardStatus(old);
      for (const a of ASSETS) { priceRead(m, a.id); holdingValue(m, a.id); }
      if (old.money !== undefined) fail('reading an old save wrote to it');
    } catch (e) {
      fail(`opening an old save threw: ${e && e.message}`);
      continue;
    }
    // Repaired on load, the way the page does it.
    const loaded = repairCareer(JSON.parse(JSON.stringify(old)));
    if (!loaded.money) fail('loading an old save did not build a market');
    // And then it plays, and the money works.
    let next = loaded;
    try {
      for (let k = 0; k < 4 && !next.retired; k++) {
        Math.random = mulberry32(555 + i + k);
        if (next.phase !== 'youth' && spendable(next) > 1) {
          next = act(next, { t: 'buy', id: 'ladder', amount: 1 });
          next = act(next, { t: 'deposit', amount: 0.5 });
        }
        next = next.phase === 'youth' ? advanceYouthYear(next, FALLBACK_CLUBS) : advanceProSeason(next, FALLBACK_CLUBS);
        if (next.transferSituation) next = { ...next, transferSituation: null };
        Math.random = REAL_RANDOM;
      }
    } catch (e) {
      fail(`an old save crashed on the next season: ${e && e.message}`);
      continue;
    }
    if (!next.retired && !next.money) fail('an old save never grew a market');
  }
  console.log('   30 stripped saves opened cold on every money screen, loaded, and then traded');
}

Math.random = REAL_RANDOM;
console.log(failures === 0 ? '\nALL MONEY ROUND 134 CHECKS PASSED' : `\n${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
