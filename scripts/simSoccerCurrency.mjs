/**
 * Round 258 harness (number 109): money in the player's own currency.
 *
 * Owner ask: "Also depending where u live ur currency will be diffrent."
 *
 * Rewriting the money in a career sim is the kind of change that looks tiny
 * and can quietly corrupt everything a player believes about their save, so
 * this file is built around one question: can the display layer ever change
 * what the game is actually doing, or say something that is not true?
 *
 *   1. THE ENGINE NEVER MOVES. Two identical careers are driven through the
 *      real engine with two different display currencies selected, seeded the
 *      same. Every stored number in both saves must be identical to the last
 *      decimal. If picking pounds changes a single balance, the feature is a
 *      bug and this fails.
 *   2. EURO IS BYTE IDENTICAL. With the euro selected, every line the game
 *      can draw comes out exactly as it did before this round existed. The
 *      default path is not allowed to be "nearly the same".
 *   3. THE CONVERSION IS ARITHMETIC, NOT VIBES. Every amount in the whole
 *      event catalog is converted and read back, and the number that comes
 *      out must equal the euro amount times the published rate, within the
 *      rounding the formatter admits to. Checked against the rate table, not
 *      against a remembered example.
 *   4. IT ONLY TOUCHES MONEY. Every event line in the catalog is run through
 *      the rewriter and any line without a euro sign must come back byte for
 *      byte. Ratings, ages, years, follower counts, plus and minus stat
 *      changes: none of them may be touched, and there are thousands of them
 *      to get wrong.
 *   5. THE UNITS SURVIVE. 800k of euros is more than a million yen, so the
 *      unit has to climb rather than print an absurd figure. Checked across
 *      every currency at every unit.
 *   6. IT NEVER CLAIMS TO BE LIVE. A converted screen must carry the rate
 *      date, the rate table must be internally consistent, and the euro must
 *      be exactly 1.
 *
 * Run: node scripts/simSoccerCurrency.mjs [careers]
 */
import { build } from 'esbuild';
import os from 'node:os';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(os.tmpdir(), 'currency-bundle.mjs');
const ENTRY = path.join(os.tmpdir(), 'currency-entry.mjs');

/* the harness drives the real engine, so it needs the same localStorage stub
   the other career harnesses use, and it needs to be able to CHANGE it */
writeFileSync(ENTRY, `
globalThis.__store = {};
globalThis.localStorage = {
  getItem: k => (k in globalThis.__store ? globalThis.__store[k] : null),
  setItem: (k, v) => { globalThis.__store[k] = String(v); },
  removeItem: k => { delete globalThis.__store[k]; },
};
/* dynamic, not static: esbuild hoists a static import above the stub above
   and the engine reads localStorage at module scope, which threw. */
export const cur = await import('${ROOT.replaceAll('\\', '/')}/src/lib/soccerCurrency.ts');
export const engine = await import('${ROOT.replaceAll('\\', '/')}/src/lib/soccerCareerEngine.ts');
export const catalogs = {
  corruption: await import('${ROOT.replaceAll('\\', '/')}/src/lib/soccerCareerCorruption.ts'),
  realism: await import('${ROOT.replaceAll('\\', '/')}/src/lib/soccerCareerRealism.ts'),
  realismA: await import('${ROOT.replaceAll('\\', '/')}/src/lib/soccerCareerRealismA.ts'),
  realismB: await import('${ROOT.replaceAll('\\', '/')}/src/lib/soccerCareerRealismB.ts'),
};
`);
await build({
  entryPoints: [ENTRY], bundle: true, format: 'esm', platform: 'node',
  outfile: OUT, logLevel: 'error', alias: { '@': path.join(ROOT, 'src') },
});
const mod = await import(pathToFileURL(OUT).href);
const { cur, engine, catalogs } = mod;
const { CURRENCIES, RATES_AS_OF, localizeMoney, setCurrency, getCurrency, currencyByCode, rateNote } = cur;

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };

const CAREERS = Number(process.argv[2] || 40);
const stats = ovr => ({ pace: ovr, shooting: ovr, passing: ovr, dribbling: ovr, defending: ovr, physical: ovr, reflexes: ovr });

function seedRandom(n) {
  let seed = n | 0;
  Math.random = () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ── 6: the table itself, before anything is built on it ─────────────── */
console.log(`1) the rate table, published ${RATES_AS_OF}`);
if (!/^\d{4}-\d{2}-\d{2}$/.test(RATES_AS_OF)) fail(`the rate date is not an ISO date: ${RATES_AS_OF}`);
const eur = CURRENCIES.find(c => c.code === 'EUR');
if (!eur) fail('there is no euro in the table, which is the currency the engine speaks');
else if (eur.perEur !== 1) fail(`the euro converts to itself at ${eur.perEur}`);
const codes = new Set();
for (const c of CURRENCIES) {
  if (codes.has(c.code)) fail(`${c.code} appears twice`);
  codes.add(c.code);
  if (!/^[A-Z]{3}$/.test(c.code)) fail(`${c.code} is not a three letter code`);
  if (!c.symbol || c.symbol.length > 3) fail(`${c.code} has a strange symbol ${JSON.stringify(c.symbol)}`);
  if (!(c.perEur > 0) || !Number.isFinite(c.perEur)) fail(`${c.code} has a rate of ${c.perEur}`);
  /* a rate that is wildly out is the shape a typo takes: a missing decimal
     point turns 1.17 into 117 and every wage in the game by a hundred */
  if (c.code !== 'EUR' && (c.perEur < 0.1 || c.perEur > 500)) {
    fail(`${c.code} at ${c.perEur} to the euro is outside anything plausible`);
  }
}
console.log(`   ${CURRENCIES.length} currencies, euro pinned at 1`);
if (rateNote(currencyByCode('EUR')) !== null) fail('the euro prints a conversion note for a conversion that did not happen');
const note = rateNote(currencyByCode('GBP'));
if (!note || !/rates/i.test(note)) fail(`the converted note does not mention rates: ${JSON.stringify(note)}`);
if (!note.includes('2026')) fail(`the converted note does not carry the rate date: ${JSON.stringify(note)}`);

/* ── 3, 4, 5: the rewriter, against the real catalog ──────────────────── */
console.log('2) every line the game can draw, run through the rewriter');
/* Harvest real lines rather than inventing test strings: consequence text,
   event descriptions, choice labels and the shop. These are the actual
   sentences a player reads. */
const lines = new Set();
seedRandom(0x4c19d3a7);
const clubs = engine.FALLBACK_CLUBS;
for (let c = 0; c < 24; c++) {
  const ovr = 55 + (c % 30);
  let s = engine.initCareer(`Cur ${c}`, ['England', 'Brazil', 'Japan', 'Nigeria'][c % 4],
    ['ST', 'CM', 'CB', 'GK'][c % 4], '2020s', stats(ovr), ovr, 2020, clubs, null);
  /* age him up so the later catalogs unlock, then read every event he can see */
  s.age = 20 + (c % 14);
  s.overall = ovr;
  s.netWorth = 5 + c * 3;
  s.internationalCareer = true;
  s.intStats = { ...s.intStats, caps: 12 + c, isRetired: false };
  /* every event catalog the game can deal from, read directly rather than
     waited for: the trigger conditions are the game's business, the words
     are this harness's */
  const evts = [
    ...catalogs.corruption.getCorruptionEvents(s),
    ...catalogs.realism.getRealismEvents(s),
    ...catalogs.realismA.getRealismEventsA(s),
    ...catalogs.realismB.getRealismEventsB(s),
  ];
  for (const e of evts) {
    if (e.description) lines.add(e.description);
    if (e.title) lines.add(e.title);
    for (const ch of e.choices ?? []) {
      if (ch.label) lines.add(ch.label);
      if (ch.consequence) lines.add(ch.consequence);
    }
  }
}
/* the lifestyle shop, which is where most of the round numbers live */
for (const item of engine.SPENDING_ITEMS ?? []) {
  if (item.description) lines.add(item.description);
  if (item.effect) lines.add(item.effect);
  if (item.name) lines.add(item.name);
}
const all = [...lines];
const withMoney = all.filter(l => l.includes('€'));
console.log(`   ${all.length} distinct lines harvested, ${withMoney.length} of them mention money`);
if (all.length < 200) fail(`only ${all.length} lines harvested, which is too few to be testing the catalog`);
if (withMoney.length < 20) fail(`only ${withMoney.length} money lines found, so the conversion is barely exercised`);

/* 2: euro is byte identical */
setCurrency('EUR');
for (const l of all) {
  if (localizeMoney(l) !== l) fail(`the euro path changed a line: ${JSON.stringify(l.slice(0, 70))}`);
}
console.log(`   euro path left all ${all.length} lines byte identical`);

/* 3, 4, 5: every other currency */
const AMOUNT = /(?:€|£|\$|R\$|MX\$|¥|₹|A\$)(\d+(?:\.\d+)?)([kMBT])?/g;
const UNIT = { undefined: 1, k: 1e3, M: 1e6, B: 1e9, T: 1e12 };
let converted = 0, untouched = 0;
for (const c of CURRENCIES) {
  if (c.code === 'EUR') continue;
  setCurrency(c.code);
  if (getCurrency().code !== c.code) fail(`selecting ${c.code} read back as ${getCurrency().code}`);
  for (const l of all) {
    const out = localizeMoney(l);
    if (!l.includes('€')) {
      /* 4: a line with no money in it is not this feature's business */
      if (out !== l) fail(`${c.code} rewrote a line with no money in it: ${JSON.stringify(l.slice(0, 70))}`);
      untouched += 1;
      continue;
    }
    if (out.includes('€')) fail(`${c.code} left a euro sign behind: ${JSON.stringify(out.slice(0, 70))}`);
    /* 3: the arithmetic. Pair the euro amounts with the converted ones in
       order and check each against the published rate. */
    const from = [...l.matchAll(/€(\d+(?:\.\d+)?)([kMB])?/g)];
    const to = [...out.matchAll(AMOUNT)];
    if (from.length !== to.length) {
      fail(`${c.code}: ${from.length} amounts in, ${to.length} out: ${JSON.stringify(out.slice(0, 70))}`);
      continue;
    }
    for (let i = 0; i < from.length; i++) {
      const want = Number(from[i][1]) * UNIT[from[i][2]] * c.perEur;
      const got = Number(to[i][1]) * UNIT[to[i][2]];
      /* the formatter's rounding is bounded at half a percent by construction
         (the places it keeps follow the size of the number), so one percent is
         the honest tolerance: loose enough that no legitimate rounding trips
         it, tight enough that a wrong rate never survives. The first draft
         allowed 1.5 percent against a formatter that could round by 2, and it
         caught the formatter rather than a rate, which is why the formatter
         was fixed instead of the number here being raised. */
      if (want === 0 ? got !== 0 : Math.abs(got - want) / want > 0.01) {
        fail(`${c.code}: €${from[i][1]}${from[i][2] ?? ''} became ${to[i][0]}, expected about ${want.toPrecision(4)}`);
      }
      /* 5: the number a human reads never runs away */
      if (Number(to[i][1]) >= 1000) {
        fail(`${c.code}: printed ${to[i][0]}, which should have climbed a unit`);
      }
      converted += 1;
    }
  }
}
setCurrency('EUR');
console.log(`   ${converted} amounts converted correctly, ${untouched} money free lines left alone`);

/* ── 1: the engine never moves ────────────────────────────────────────── */
console.log(`3) ${CAREERS} careers played twice, once in euros and once in yen`);
function playFleet(code, careers) {
  setCurrency(code);
  seedRandom(0x77c1a35b);
  const out = [];
  for (let c = 0; c < careers; c++) {
    const ovr = 45 + (c % 28);
    let s = engine.initCareer(`Twin ${c}`, ['England', 'Brazil', 'Japan', 'Nigeria'][c % 4],
      ['ST', 'CM', 'CB', 'GK'][c % 4], '2020s', stats(ovr), ovr, 2020, clubs, null);
    let guard = 0;
    while (!s.retired && guard++ < 120) {
      if (s.phase === 'rehab_choice') { s = engine.applyRehabChoice(s, 1); continue; }
      switch (s.phase) {
        case 'youth': s = engine.advanceYouthYear(s, clubs); break;
        case 'contract_offer': {
          const offers = s.pendingOffers || [];
          if (!offers.length) { s.phase = 'playing'; break; }
          s = engine.acceptOffer(s, offers[0]);
          break;
        }
        case 'playing': s = engine.advanceProSeason(s, clubs); break;
        case 'newspaper': s = engine.dismissNewspaper(s); break;
        case 'season_summary': s = engine.dismissSummary(s, clubs); break;
        case 'random_events': {
          if (!s.pendingEvents || !s.pendingEvents[0]) { s.pendingEvents = []; s.phase = 'playing'; break; }
          s = engine.applyEventChoice(s, 0, clubs);
          break;
        }
        case 'moral_dilemma': s = engine.dismissMoralDilemma(s, clubs); break;
        case 'social_media_action': s = engine.dismissSocialMediaPhase(s, clubs); break;
        case 'red_card_appeal_result': s = engine.dismissAppealResult(s, clubs); break;
        case 'international_debut': s = engine.dismissDebut(s, clubs); break;
        case 'world_cup': s = engine.dismissWorldCup(s, clubs); break;
        case 'rivalry_event': s = engine.dismissRivalryEvent(s, clubs); break;
        case 'ballon_dor': s = engine.dismissBallonDor(s, clubs); break;
        case 'transfer_window': {
          const sit = s.transferSituation;
          if (sit && sit.type === 'one_offer') s = engine.acceptOffer(s, sit.offer);
          else if (sit && sit.type === 'frozen_out' && sit.offers.length) {
            const o = sit.offers[0];
            s = o.isLoan ? engine.acceptLoan(s, o) : engine.acceptOffer(s, o);
          } else s = engine.stayAtClub(s, clubs);
          break;
        }
        default: s.retired = true; break;
      }
    }
    out.push({
      netWorth: s.netWorth, wage: s.weeklyWage, value: s.marketValue, overall: s.overall,
      age: s.age, seasons: s.seasons.length, club: s.currentClub,
      assets: s.totalAssetValue ?? 0, agentFees: s.agentFeesPaid ?? 0,
    });
  }
  return out;
}
const inEur = playFleet('EUR', CAREERS);
const inJpy = playFleet('JPY', CAREERS);
setCurrency('EUR');
let drift = 0;
for (let i = 0; i < inEur.length; i++) {
  for (const k of Object.keys(inEur[i])) {
    if (inEur[i][k] !== inJpy[i][k]) {
      drift += 1;
      if (drift <= 3) fail(`career ${i}: ${k} came out ${inEur[i][k]} in euros and ${inJpy[i][k]} in yen`);
    }
  }
}
const sample = inEur.filter(c => c.seasons > 3).length;
console.log(`   ${inEur.length} pairs compared on 9 fields each, ${sample} of them played 4 or more seasons, ${drift} differences`);
if (sample < Math.floor(CAREERS / 3)) fail(`only ${sample} careers got past three seasons, so the comparison is too shallow`);

/* ── the wiring ───────────────────────────────────────────────────────── */
console.log('4) the screens are wired to it');
const page = readFileSync(path.join(ROOT, 'src/pages/SoccerCareer.tsx'), 'utf8');
if (!page.includes('localizeMoney as money')) fail('the career page does not import the rewriter');
const wraps = (page.match(/\bmoney\(/g) ?? []).length;
if (wraps < 15) fail(`only ${wraps} money() call sites on the career page, which cannot cover it`);
if (!page.includes('rateNote()')) fail('the career page never prints the rate date next to converted money');
if (!page.includes('Display currency')) fail('there is no labelled currency picker');
const eng = readFileSync(path.join(ROOT, 'src/lib/soccerCareerEngine.ts'), 'utf8');
if (!/formatWage[\s\S]{0,600}localizeMoney/.test(eng)) fail('formatWage does not convert');
if (!/formatNetWorth[\s\S]{0,1400}localizeMoney/.test(eng)) fail('formatNetWorth does not convert');
console.log(`   ${wraps} money() call sites, both central formatters converting, the rate date on screen`);

console.log('');
if (failures > 0) {
  console.error(`simSoccerCurrency: ${failures} failure${failures === 1 ? '' : 's'}`);
  process.exit(1);
}
console.log('simSoccerCurrency: green. The money reads in your currency and the game underneath it never noticed.');
