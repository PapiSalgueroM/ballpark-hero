/* Round 640: a created club's made up founders are priced like real players of their level.
 *
 * THE DEFECT. buildCustomSquad stored the whole raw curve (baseValue) as each
 * founder's value, and the raw curve is not a price: a real player's value is
 * 0.028 to 0.232 of it, depending on rating and age. Measured
 * on the engine before the round, every league a club can be founded in, all
 * four eras: a mid tier founding (24 men, mean 67.5) was worth 826.6m, a median
 * 19 times the value a head of the real squads within two rating points in the
 * same league; small 420.4m, big 1,602.6m, a slider 88 squad 7,353.9m; and
 * listing the founders in the first summer window banked a median 143m (small),
 * 261m (mid) and 585m (big) over selling nobody, against budgets of 15m, 40m
 * and 90m.
 *
 * THE RULE (see customFounderValue in src/lib/clubManager.ts): a founder
 * carries the bakes' own money for his rating in his era (bakedValueForRating,
 * with a historic rating taken back below the uplift first), which is the
 * median real value at that rating in every league, era and age band; his wage
 * follows through ensureContracts. A save written before the round is repriced
 * on load (ensureCustomClubValues), each founder rebuilt from the spec. Two
 * rules the honest prices made necessary: a created club's wage cap is the one
 * a real club with its budget has (realCapForBudget), never less than its own
 * bill based cap; and the quality slider stays free (Round 160: found the club
 * you want, not the one the wallet dictates), but every founder carries a sale
 * cap (founderSaleCap), what he is worth in the squad the tier's money could
 * have bought, budget / 0.16 (customQualityCap), and sellValue pays no more.
 *
 * SECTIONS, on the real engine bundled with esbuild, all four eras:
 *   1) a created squad is worth what the real squads of its level in its own
 *      league are worth: every league a club can be founded in, the three budget
 *      tiers and the quality slider at 55, 66, 77 and 88, three founding names.
 *      Value a head against the median value a head of the real players of the
 *      real squads in the same league whose mean rating is within two points
 *      (a head, so a 17 man real squad and a 24 man founding compare). Pooled
 *      p10 and p90 inside the band. Never a max. And a squad founded above its
 *      tier's ceiling keeps, man by man, the rating the slider gave him on the
 *      engine as it stood before the round, his honest value and his honest
 *      wage: the sale cap touches the sale and nothing else.
 *   2) listing every founder in the first summer window and taking every bid the
 *      squad floor allows, against the same career (same seed) selling nobody.
 *      The budget difference is what the founders were worth to sell, taken as
 *      a multiple of the budget the tier handed over.
 *      (a) the tiers' own squads (anchors 62, 68 and 74) and the form's default
 *      (slider 66 on the middle budget): the bound is 1, the whole of that
 *      budget, 1 x 15m on the smallest tier, because the squad a tier builds by
 *      itself must never sell for more than the tier's own cheque.
 *      (b) every slider setting on every tier in every era, 55 to 88 (408
 *      settings), 88 on the smallest budget included. A squad at the ceiling is
 *      the squad a real club with that budget holds, and above it the founders
 *      sell for no more than they would at the ceiling, so it may sell for what
 *      a real club with that budget sells for: the same sell off on 66 real
 *      clubs inside the budget clamp banks p50 2.69 and p90 3.31 of their own
 *      budget (3.85 in the 60m to 120m band), and the bound, 4 x the tier's
 *      budget, sits on the top of that. Pooled over every setting and,
 *      separately, over the settings above the ceiling. sellValue never prices
 *      a capped founder above his cap, and above the ceiling the squad's sale
 *      ceiling (each man at the lower of value and cap) is held to budget / 0.16.
 *   3) real players are priced exactly as before: a real club career plays its
 *      first window and weeks identically on the engine as it stood before the
 *      round and survives a save and load unchanged; the market a created club
 *      sees is the same market; a real player it buys carries the same value and
 *      wage; and a created club save from before the round that bought real
 *      players loads with every real player's value and wage exactly as saved.
 *   4) a created club save written by the engine as it stood before the round
 *      (two weeks in, one founder out on loan) loads with every founder carrying
 *      exactly today's creation value and sale cap and nothing else moved, a load is done
 *      once (a second load moves nothing), and the rest of season one plays
 *      exactly as the old engine plays the same save with the old values, bar
 *      the founders' value and what is read straight off it (the bids for them,
 *      the two amounts in an agent's renewal quote). The one place a value steers
 *      the random stream, the value sorted pick of who gets an unsolicited bid,
 *      is sorted by rating in both copies for that comparison (see liveBlind),
 *      and the literal comparison is printed beside it. A save a whole season
 *      on moves every founder by the ratio of the new creation value to the old,
 *      then plays on the same way.
 *   5) a created club can spend its budget the way a real club with that budget
 *      can: each tier founded in four leagues today and two in each past era,
 *      two names, opens on the larger of its bill based cap and realCapForBudget,
 *      then makes three signings through buyPlayer, each the best rated real
 *      player the money left can pay for with the signings still to come. Its
 *      bill over its cap afterwards, p90, must sit no higher than that of real
 *      clubs with a budget within 0.7 to 1.4 times its own doing the same thing,
 *      plus a band. And an old created save whose cap is under the line loads
 *      at the line with every contract as signed, while an old save's higher cap
 *      and a new save's own lowered cap load untouched (the floor runs once).
 *
 * MEASURED, default seed and SIM_SEED 1, 2 and 3, each run on its own TEMP;
 * the control figures are the default seed with the control applied.
 *   section 1  a head, pooled p10       fixed 0.76 to 0.81    rawcurve 10.11    floor 0.5
 *              a head, pooled p90       fixed 1.39 to 1.45    rawcurve 28.04    ceiling 2.0
 *              (about 260 of 567 created squads a run have a real squad within two
 *              points in their league; the small tier and slider 55 squads have none
 *              anywhere, so they are priced by the same line but banded only man by man)
 *              man by man, p10          fixed 0.87 to 0.90    rawcurve 7.77     floor 0.75
 *                                                             capall 0.34
 *              man by man, p90          fixed 1.02 to 1.03    rawcurve 24.17    ceiling 1.3
 *              (5,192 to 6,032 founders a run with 8 or more real players of their
 *              era, rating and age band)
 *              capped founders moved    fixed 0 of 744        capall 744 of 744 must be 0
 *              in rating, value, wage                         rawcurve 744 of 744
 *              (31 foundings above a tier's ceiling a run, every era and tier)
 *   section 2a p90 gain / tier budget   fixed 0.52 to 0.59    rawcurve 2.83     bound 1.0
 *              (104 paired careers and about 1,040 sales a run; p90 gain small 6.3 to
 *              7.0m, mid 19.3 to 21.8m, big 51.6 to 64.5m, slider 66 on 40m 12.5 to
 *              14.8m, against 183m, 378m, 719m and 296m on the old curve with no
 *              sale cap; rawcurve reads lower now because the cap holds it)
 *   section 2b every setting, p90       fixed 2.40 to 2.58    nosalecap 7.92    bound 4.0
 *              gain / tier budget
 *              above the ceiling, p90   fixed 2.73 to 2.91    nosalecap 14.99   bound 4.0
 *              88 on 15m, each seed     fixed 1.22 to 3.12    nosalecap 12.69 to 48.10
 *              sale ceiling /           fixed 0.97 to 0.98                      ceiling 1.15
 *              (budget / 0.16), p90
 *              capped founders priced   fixed 0 of 2,760      nosalecap 2,534   must be 0
 *              above the cap
 *              (408 settings, 115 of them above their tier's ceiling, and 4,080
 *              sales a run; the ceilings are 72, 78 and 82 today, 72, 78 and 85
 *              in 2015 and 2010, 72, 79 and 88 in 2005)
 *   section 5  bill / cap after          fixed 0.37 to 0.44    tightcap 1.31      real p90 1.01
 *              spending, p90 by tier                          to 1.49            to 1.02, band 0.1
 *              (tightcap also opens 60 of 60 foundings off the line and loads the
 *              lowered old save at 100k instead of 910k)
 *              (60 foundings, the budget spent p10 0.99; real clubs of a similar
 *              budget land right on their cap after the same spending, and a
 *              created club, whose founders cost what their level costs, keeps
 *              more than half its cap free)
 *   section 3  30 real club careers and 30 of their saves identical, 16 created club
 *              markets and 48 real signings identical, 48 of 48 real players in old
 *              created club saves unmoved on load (realtoo: 48 of 48 moved)
 *   section 4  460 of 460 founders and 20 of 20 loans repriced on load, 0 wages moved,
 *              20 of 20 seasons alike, a season on 68 to 80 founders all moved by the
 *              ratio and 4 of 4 alike (noload: 0 of 460 repriced). With the old values
 *              kept and the value sorted targeting live, 20 of 20 alike on seeds 0 to
 *              2 and 19 of 20 on seed 3.
 *
 * CONTROLS (CUSTOM_VALUE_CONTROL=name). Each edits an in memory copy of the
 * engine after asserting its anchor appears exactly once, and must turn exactly
 * its own sections red:
 *   rawcurve   buildCustomSquad stores the old full curve again      -> sections 1 and 2
 *   noload     loadCareer skips the repricing                         -> section 4
 *   realtoo    the repricing treats a real player as a founder too    -> section 3
 *   nosalecap  sellValue ignores the founder's sale cap               -> section 2
 *   capall     the sale cap lowers the founder's value too            -> section 1
 *   tightcap   the bill based cap only, at the founding and on load   -> section 5
 *
 * Nothing here reads dist or the clock (Date.now is only in generated ids), so
 * it is safe to run between builds.
 *
 * Run: node scripts/simCustomClubValues.mjs
 */
import './lib/seedRandom.mjs';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.CUSTOM_VALUE_CONTROL || '';
const KNOWN = ['rawcurve', 'noload', 'realtoo', 'nosalecap', 'capall', 'tightcap',
  'halfcap', 'stingycap', 'overprice', 'noerabake', 'stickycap', 'noresale'];
if (CONTROL && !KNOWN.includes(CONTROL)) {
  console.log(`   FAIL unknown control ${CONTROL} (known: ${KNOWN.join(', ')})`);
  process.exit(1);
}

let checks = 0;
let failures = 0;
const failedSections = new Set();
let section = 0;
const fail = (m) => { checks += 1; failures += 1; failedSections.add(section); console.log(`   FAIL ${m}`); };
const ok = (m) => { checks += 1; console.log(`   ok   ${m}`); };

/* ---------- the engine, pristine and rewritten ---------- */
const PRISTINE = fs.readFileSync(path.join(ROOT, 'src/lib/clubManager.ts'), 'utf8').replaceAll('\r\n', '\n');

const VALUE_LINE = '      value: customFounderValue(rating, eraId),\n';
const OLD_VALUE_LINE = '      value: preRound640FounderValue(rating, age),\n';
const LOAD_LINE = '      const repriced = ensureCustomClubValues(parsed);\n';
const NO_LOAD = '      const repriced = false;\n';
const MARK_LINE = '    state.customValues = CUSTOM_VALUES_VERSION;\n';
const REAL_LINE = '  if (!p.generated || p.isYouth || p.academyGrad) return null;\n';
const SALE_CAP_LINE = '    const worth = p.founderSaleRatio !== undefined ? p.value * p.founderSaleRatio : p.value;\n';
const FOUNDER_CAP_LINE = '    if (aboveCeiling && saleRatio < 1) founder.founderSaleRatio = saleRatio;\n';
const CAP_FLOOR_LINE = '  if (custom) state.wageCap = Math.max(state.wageCap, realCapForBudget(club.budget) + (state.founderWageRoom ?? 0));\n';
const ROOM_AT_FOUNDING = '  if (custom) state.founderWageRoom = foundersWageRoom(state) || undefined;\n';
const ROOM_AT_SUMMER = '  state.founderWageRoom = roomNow || undefined;\n';
const CAP_LOAD_LINE = '      if (repriced) ensureCustomClubWageCap(parsed);\n';
const PRICE_LINE = '  return Math.max(JOURNEYMAN_VALUE, Math.round(bakedValueForRating(eraBakeRating(eraId, rating)) * 10) / 10);\n';
const LINE_K = 'export const REAL_CAP_PER_BUDGET_K = 37.13;\n';
const ROLLOVER_CAP = '    : nextWageCap(Math.max(60, (career.wageCap ?? wageCapFrom(wageBill(career))) - (career.founderWageRoom ?? 0)), club.expectation, prevPos, seasonTrophyCount) + roomNow;\n';
const OLD_ROLLOVER_CAP = '    : nextWageCap(career.wageCap ?? wageCapFrom(wageBill(career)), club.expectation, prevPos, seasonTrophyCount);\n';
const FOUNDER_RESCALE = '    rescaleSaleFigures(state, p.id, oldSell, sellValue(p), loan);\n  };\n  for (const p of state.squad ?? []) reprice(p);\n';

/* Every rewrite asserts its anchor exactly once, or the run stops: a control
   that matches nothing leaves the harness green for the wrong reason. */
function rewrite(src, anchor, replacement, why) {
  const n = src.split(anchor).length - 1;
  if (n !== 1) {
    console.log(`   FAIL ${why}: anchor appears ${n} times, so the rewrite would not change exactly one thing`);
    console.log(`simCustomClubValues: stopped, ${failures + 1} failure`);
    process.exit(1);
  }
  return src.replace(anchor, () => replacement);
}

let live = PRISTINE;
if (CONTROL === 'rawcurve') live = rewrite(live, VALUE_LINE, OLD_VALUE_LINE, 'control rawcurve');
if (CONTROL === 'noload') live = rewrite(live, LOAD_LINE, NO_LOAD, 'control noload');
if (CONTROL === 'realtoo') {
  live = rewrite(live, REAL_LINE,
    '  if (!p.generated && !p.isYouth) return p;\n  if (p.isYouth || p.academyGrad) return null;\n', 'control realtoo');
}
/* sellValue pays a founder his full value whatever his sale cap says. */
if (CONTROL === 'nosalecap') live = rewrite(live, SALE_CAP_LINE, '    const worth = p.value;\n', 'control nosalecap');
/* The cap lowers the founder's own value too, not just his sale price. */
if (CONTROL === 'capall') {
  live = rewrite(live, VALUE_LINE, '      value: Math.min(customFounderValue(rating, eraId), customFounderValue(ceilingRating, eraId)),\n', 'control capall');
}
/* The bill based cap only, at the founding and on load. */
if (CONTROL === 'tightcap') {
  live = rewrite(rewrite(live, CAP_FLOOR_LINE, '', 'control tightcap, founding'), CAP_LOAD_LINE, '', 'control tightcap, load');
}
/* The budget's cap line at half what real clubs run. */
if (CONTROL === 'halfcap') live = rewrite(live, LINE_K, 'export const REAL_CAP_PER_BUDGET_K = 18.565;\n', 'control halfcap');
/* A sale ratio half what the money bought, below the squad the tier buys. */
if (CONTROL === 'stingycap') {
  live = rewrite(live, FOUNDER_CAP_LINE, '    if (aboveCeiling && saleRatio < 1) founder.founderSaleRatio = saleRatio * 0.5;\n', 'control stingycap');
}
/* Founders priced 25 percent over the market. */
if (CONTROL === 'overprice') {
  live = rewrite(live, PRICE_LINE, '  return Math.max(JOURNEYMAN_VALUE, Math.round(bakedValueForRating(eraBakeRating(eraId, rating)) * 1.25 * 10) / 10);\n', 'control overprice');
}
/* A historic founder priced by his engine rating, the era's uplift not taken back. */
if (CONTROL === 'noerabake') {
  live = rewrite(live, PRICE_LINE, '  return Math.max(JOURNEYMAN_VALUE, Math.round(bakedValueForRating(rating) * 10) / 10);\n', 'control noerabake');
}
/* The summer moves the whole cap on, founders' room and all, as before the review. */
if (CONTROL === 'stickycap') live = rewrite(live, ROLLOVER_CAP, OLD_ROLLOVER_CAP, 'control stickycap');
/* The repricing moves the founders but leaves bids, clauses and loan options on the old money. */
if (CONTROL === 'noresale') live = rewrite(live, FOUNDER_RESCALE, '  };\n  for (const p of state.squad ?? []) reprice(p);\n', 'control noresale');
if (CONTROL) console.log(`   [control ${CONTROL} applied to an in memory copy of the engine]`);
/* The engine as it stood before Round 640: the full curve at creation, no
   repricing on load, no version mark on a new created club, no founder sale
   ratio, the bill based cap only and the summer cap as it was. The slider
   was free then and is free now. */
let pre = PRISTINE;
for (const [anchor, to, why] of [
  [VALUE_LINE, OLD_VALUE_LINE, 'creation value'], [LOAD_LINE, NO_LOAD, 'load repricing'], [MARK_LINE, '', 'version mark'],
  [FOUNDER_CAP_LINE, '', 'founder sale ratio'], [CAP_FLOOR_LINE, '', 'cap floor'], [CAP_LOAD_LINE, '', 'cap floor on load'],
  [ROLLOVER_CAP, OLD_ROLLOVER_CAP, 'summer cap'], [ROOM_AT_FOUNDING, '', 'founders room at the founding'],
  [ROOM_AT_SUMMER, '', 'founders room at the summer'],
]) pre = rewrite(pre, anchor, to, `pre round engine, ${why}`);
/* Section 4's second pair of copies. generateIncomingBids picks who gets an
   unsolicited bid from the eight most VALUABLE men rated 74 or more, and a man
   already holding a bid is skipped before later loops draw for him, so a new
   value can pick a different man and move the random stream from that window
   on. That is the value doing its job, not the load touching something else.
   Measured on the first build of this harness: with the old values kept, 19 of
   20 repriced saves on SIM_SEED 3 (20 of 20 on seeds 0, 1 and 2) still played
   season one identically, and the one that parted, a big tier save, played it
   identically once both copies sorted those targets by rating instead. So the
   season is compared on copies that sort the targets by rating, and the literal
   comparison is printed beside it. */
const TARGET_SORT = '    .sort((a, b) => (b.value ?? 0) - (a.value ?? 0))\n';
const BY_RATING = '    .sort((a, b) => b.rating - a.rating)\n';
const liveBlind = rewrite(live, TARGET_SORT, BY_RATING, 'value blind copy, bid targets');
const preBlind = rewrite(pre, TARGET_SORT, BY_RATING, 'value blind pre round copy, bid targets');

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'customvalues-'));
async function bundle(source, out) {
  await build({
    stdin: { contents: "export * as cm from '@/lib/clubManager'; export * as eras from '@/lib/clubManagerEras';", resolveDir: ROOT, loader: 'ts' },
    bundle: true, format: 'cjs', platform: 'node', outfile: out, logLevel: 'error',
    alias: { '@': path.join(ROOT, 'src') },
    /* One engine behind everything: the sibling modules import it through the
       alias, and this serves them the same rewritten text. */
    plugins: [{
      name: 'engine-copy',
      setup(b) { b.onLoad({ filter: /[\\/]src[\\/]lib[\\/]clubManager\.ts$/ }, () => ({ contents: source, loader: 'ts' })); },
    }],
  });
}
const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => { store.set(k, String(v)); },
  removeItem: (k) => { store.delete(k); },
};
await bundle(live, path.join(TMP, 'live.cjs'));
await bundle(pre, path.join(TMP, 'pre.cjs'));
await bundle(liveBlind, path.join(TMP, 'liveBlind.cjs'));
await bundle(preBlind, path.join(TMP, 'preBlind.cjs'));
const req = createRequire(import.meta.url);
const { cm, eras } = req(path.join(TMP, 'live.cjs'));
const old = req(path.join(TMP, 'pre.cjs')).cm;
const cmBlind = req(path.join(TMP, 'liveBlind.cjs')).cm;
const oldBlind = req(path.join(TMP, 'preBlind.cjs')).cm;

/* ---------- helpers ---------- */
const SEED_BASE = Number.isFinite(Number(process.env.SIM_SEED)) ? Number(process.env.SIM_SEED) : 0;
const mulberry32 = (a) => () => {
  a |= 0; a = (a + 0x6D2B79F5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const hash = (s) => { let h = 2166136261 >>> 0; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h; };
const outer = Math.random;
const seeded = (key, fn) => {
  Math.random = mulberry32((hash(String(key)) + SEED_BASE * 7919) >>> 0);
  try { return fn(); } finally { Math.random = outer; }
};
const pct = (xs, q) => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.min(s.length - 1, Math.floor(q * s.length))] : NaN; };
const median = (xs) => pct(xs, 0.5);
const m1 = (x) => (Number.isFinite(x) ? `${x.toFixed(1)}m` : String(x));
const f2 = (x) => (Number.isFinite(x) ? x.toFixed(2) : String(x));
const clone = (x) => JSON.parse(JSON.stringify(x));
const r1 = (x) => Math.round(x * 10) / 10;
/* The path of the first place two states disagree, for a failure message. */
function firstDiff(a, b, at = '') {
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
      const d = firstDiff(a[k], b[k], `${at}.${k}`);
      if (d) return d;
    }
    return null;
  }
  return a === b ? null : `${at}: ${JSON.stringify(a)?.slice(0, 120)} against ${JSON.stringify(b)?.slice(0, 120)}`;
}
/* Keys sorted, because two engine copies can build an object's fields in a
   different order. And the parts of an id that come from this process rather
   than the career dropped: the last part of a press question and an inbox
   message id (pressSeq and msgSeq, module counters of what each engine copy
   has generated, Round 632's finding), and the clock and counter in a youth
   pad's, a scout report's and a prospect's id (Date.now and youthSeq, so two
   copies making the same boy a millisecond apart name him differently). The
   seeded draw in each id stays, and nothing else is normalised. */
const canon = (x) => JSON.stringify(x, (k, v) => (v && typeof v === 'object' && !Array.isArray(v)
  ? Object.fromEntries(Object.keys(v).sort().map(key => [key, v[key]])) : v))
  .replace(/"(pq|msg)-(\d+)-(\d+)-\d+"/g, '"$1-$2-$3"')
  .replace(/"youth-[0-9a-z]+-\d+-(\d+)/g, '"youth-$1')
  .replace(/"sc-[0-9a-z]+-(\d+)/g, '"sc-$1')
  .replace(/"pr-[0-9a-z]+-(\d+)-(\d+)/g, '"pr-$1-$2');
const ERAS = ['now', 'era2015', 'era2010', 'era2005'];
const leaguesOf = (era) => (era === 'now' ? cm.REAL_LEAGUES : cm.ERA_LEAGUES[era]);
const clubsOf = (era, lg) => (era === 'now' ? cm.playableClubs(lg).map(c => c.name) : cm.eraPlayableClubs(era, lg).map(c => c.name));
const CREST = { shape: 1, pattern: 3, color1: '#059669', color2: '#f8fafc', initials: 'FT' };
const TIERS = { small: 15, mid: 40, big: 90 };
const CONFIGS = [
  { tag: 'small', budgetTier: 'small' }, { tag: 'mid', budgetTier: 'mid' }, { tag: 'big', budgetTier: 'big' },
  { tag: 'q55', budgetTier: 'small', quality: 55 }, { tag: 'q66', budgetTier: 'mid', quality: 66 },
  { tag: 'q77', budgetTier: 'mid', quality: 77 }, { tag: 'q88', budgetTier: 'big', quality: 88 },
];
const NAMES = [`Fence Town ${SEED_BASE}`, `Harbour Athletic ${SEED_BASE}`, `Northgate ${SEED_BASE}`];
const specOf = (name, cfg, leagueId) => ({
  name, stadium: `${name} Park`, crest: { ...CREST }, budgetTier: cfg.budgetTier, leagueId, replacedClub: '',
  ...(cfg.quality !== undefined ? { quality: cfg.quality } : {}),
});
const founders = (st) => st.squad.filter(p => p.generated && !p.isYouth && !p.academyGrad);
const meanR = (xs) => xs.reduce((s, p) => s + p.rating, 0) / xs.length;
const perHead = (xs) => xs.reduce((s, p) => s + (p.value ?? 0), 0) / xs.length;
/* What the founder would have been sold for before the round, the full curve. */
const oldCreation = (r, a) => Math.max(0.3, r1(eras.rawCurveValue(r, a)));
const KEY_OF = () => [...store.keys()].find(k => k.startsWith('dukb-club-manager')) ?? 'dukb-club-manager-save';
function playOn(engine, st, entries) {
  for (let i = 0; i < entries && st.week < st.calendar.length; i++) {
    const r = engine.playNextEntry(st, { skipHalftime: true });
    st = r.state;
    if (r.kind === 'seasonOver') break;
  }
  return st;
}

console.log(`simCustomClubValues: seed base ${SEED_BASE}${CONTROL ? `, control ${CONTROL}` : ''}`);

/* ================================================================== */
section = 1;
console.log('1) a created squad is worth what the real squads of its level in its league are worth');
/* Measured over four seeds (see the header). A head: p10 0.75 to 0.81, p50
   0.92 to 1.00, p90 1.39 to 1.45. Man by man: p10 0.87 to 0.90, p50 0.95 to
   0.96, p90 1.00 to 1.03. The bands leave that headroom and no more than it
   needs: founders priced 25 percent over the market (control overprice) move
   the man by man median to about 1.19 and the p90s to about 1.29 and 1.8, all
   outside, and the full curve sits at 8 and more. */
const BAND_P10 = 0.6;
const BAND_P50 = [0.8, 1.15];
const BAND_P90 = 1.65;
const MAN_P10 = 0.8;
const MAN_P50 = [0.88, 1.08];
const MAN_P90 = 1.15;
/* The top of the historic eras: measured in the header; noerabake (a founder
   priced by his uplifted engine rating in the era's money) reads 2 and more. */
const TOP_P50 = [0.7, 1.4];
/* Every real club's day one budget and cap, for section 5's line check. */
const realCaps = [];
{
  const realOf = new Map();
  /* And every real player's value by era, rating and age band, for the man by
     man comparison (the raw curve's own age bands), and by era and rating for
     the top end of the historic eras. */
  const ageBand = (a) => (a <= 21 ? 0 : a <= 24 ? 1 : a <= 28 ? 2 : a <= 31 ? 3 : a <= 34 ? 4 : 5);
  const realByRating = new Map();
  const realByEraRating = new Map();
  for (const era of ERAS) for (const lg of leaguesOf(era)) {
    realOf.set(`${era}|${lg.id}`, clubsOf(era, lg.id).map((club) => {
      const st = seeded(`s1real|${era}|${club}`, () => cm.startCareer(club, era));
      realCaps.push({ era, club, budget: st.budget, cap: st.wageCap });
      const real = st.squad.filter(p => !p.isYouth && !p.generated);
      for (const p of real) {
        const k = `${era}|${p.rating}|${ageBand(p.age)}`;
        if (!realByRating.has(k)) realByRating.set(k, []);
        realByRating.get(k).push(p.value);
        const e = `${era}|${p.rating}`;
        if (!realByEraRating.has(e)) realByEraRating.set(e, []);
        realByEraRating.get(e).push(p.value);
      }
      return { club, mean: meanR(real), head: perHead(real) };
    }));
  }
  const manByMan = [];
  const topEnd = [];
  const ratios = [];
  const byCfg = {};
  let squads = 0;
  let wrongValue = 0;
  let founderCount = 0;
  const noMatch = {};
  for (const era of ERAS) {
    for (const lg of leaguesOf(era)) {
      for (const cfg of CONFIGS) {
        for (const name of NAMES) {
          const st = seeded(`s1|${era}|${lg.id}|${cfg.tag}|${name}`, () => cm.startCareer(name, era, specOf(name, cfg, lg.id)));
          const f = founders(st);
          squads += 1;
          founderCount += f.length;
          for (const p of f) {
            if (p.value !== cm.customFounderValue(p.rating, era)) wrongValue += 1;
            const same = realByRating.get(`${era}|${p.rating}|${ageBand(p.age)}`) ?? [];
            if (same.length >= 8) manByMan.push(p.value / median(same));
            /* Historic founders above the uplift pivot, against the era's real
               players the engine rates within a point of him. */
            if (era !== 'now' && p.rating > 80) {
              const near = [-1, 0, 1].flatMap(d => realByEraRating.get(`${era}|${p.rating + d}`) ?? []);
              if (near.length >= 3) topEnd.push(p.value / median(near));
            }
          }
          const m = meanR(f);
          const near = realOf.get(`${era}|${lg.id}`).filter(r => Math.abs(r.mean - m) <= 2);
          if (!near.length) { noMatch[cfg.tag] = (noMatch[cfg.tag] ?? 0) + 1; continue; }
          const ratio = perHead(f) / median(near.map(r => r.head));
          ratios.push(ratio);
          (byCfg[cfg.tag] ??= []).push(ratio);
        }
      }
    }
  }
  const inBand = (x, [lo, hi]) => x >= lo && x <= hi;
  console.log(`   ${squads} created squads (${founderCount} founders), ${ratios.length} with a real squad of the same league within two rating points`);
  console.log(`   value a head over the real squads': ${Object.entries(byCfg).map(([k, v]) => `${k} p50 ${f2(median(v))} (${v.length})`).join(', ')}`);
  console.log(`   no real squad that close in the league: ${Object.entries(noMatch).map(([k, v]) => `${k} ${v}`).join(', ') || 'none'}`);
  console.log(`   pooled p10 ${f2(pct(ratios, 0.1))}, p50 ${f2(median(ratios))}, p90 ${f2(pct(ratios, 0.9))}`);
  if (ratios.length < 150) fail(`only ${ratios.length} created squads had a real squad to compare with, too few to read a p10 and a p90`);
  else if (!(pct(ratios, 0.1) >= BAND_P10 && inBand(median(ratios), BAND_P50) && pct(ratios, 0.9) <= BAND_P90)) {
    fail(`a created squad's value a head runs p10 ${f2(pct(ratios, 0.1))}, p50 ${f2(median(ratios))}, p90 ${f2(pct(ratios, 0.9))} of the real squads of its level, outside p10 ${BAND_P10}, p50 ${BAND_P50.join(' to ')}, p90 ${BAND_P90}`);
  } else ok(`a created squad's value a head runs p10 ${f2(pct(ratios, 0.1))}, p50 ${f2(median(ratios))}, p90 ${f2(pct(ratios, 0.9))} of the real squads of its level in its league (bands p10 ${BAND_P10}, p50 ${BAND_P50.join(' to ')}, p90 ${BAND_P90})`);
  console.log(`   man by man, ${manByMan.length} founders against the median real player of the same era, rating and age band (8 or more of them): p10 ${f2(pct(manByMan, 0.1))}, p50 ${f2(median(manByMan))}, p90 ${f2(pct(manByMan, 0.9))}`);
  if (manByMan.length < 3000) fail(`only ${manByMan.length} founders had 8 real players of their era, rating and age band to compare with`);
  else if (!(pct(manByMan, 0.1) >= MAN_P10 && inBand(median(manByMan), MAN_P50) && pct(manByMan, 0.9) <= MAN_P90)) {
    fail(`a founder is worth p10 ${f2(pct(manByMan, 0.1))}, p50 ${f2(median(manByMan))}, p90 ${f2(pct(manByMan, 0.9))} of the real players of his era, rating and age band, outside p10 ${MAN_P10}, p50 ${MAN_P50.join(' to ')}, p90 ${MAN_P90}`);
  } else ok(`a founder is worth p10 ${f2(pct(manByMan, 0.1))}, p50 ${f2(median(manByMan))}, p90 ${f2(pct(manByMan, 0.9))} of the real players of his era, rating and age band (bands p10 ${MAN_P10}, p50 ${MAN_P50.join(' to ')}, p90 ${MAN_P90})`);
  console.log(`   the top of the past eras, ${topEnd.length} founders rated over 80 against the era's real players the engine rates within a point of him (3 or more): p10 ${f2(pct(topEnd, 0.1))}, p50 ${f2(median(topEnd))}, p90 ${f2(pct(topEnd, 0.9))}`);
  if (topEnd.length < 200) fail(`only ${topEnd.length} historic founders over 80 had real players of their engine rating to compare with`);
  else if (!inBand(median(topEnd), TOP_P50)) fail(`a historic founder over 80 is worth ${f2(median(topEnd))} of the era's real players of his engine rating at the median, outside ${TOP_P50.join(' to ')}: the era's uplift is not being taken back before he is priced`);
  else ok(`a historic founder over 80 is worth ${f2(median(topEnd))} of the era's real players of his engine rating at the median, inside ${TOP_P50.join(' to ')}, so the uplift is taken back before he is priced (eraBakeRating)`);
  if (founderCount < 5000) fail(`only ${founderCount} founders measured`);
  else if (wrongValue) fail(`${wrongValue} of ${founderCount} founders were not created carrying customFounderValue for their rating and era`);
  else ok(`all ${founderCount} founders were created carrying customFounderValue for their rating and era (the engine against its own function: this catches a creation path that skips the rule, not a wrong rule; the three checks above test the rule against real players)`);

  /* A squad founded above what its money buys is exactly as good, as valuable
     and as dear as it would have been: the sale ratio touches the sale and
     nothing else. Every tier in every era, just above its ceiling, a few
     points above, and at 88. The men it binds are found without reading the
     ratio (whose honest value is above the same man's in the founding at the
     ceiling), so a rule that also cut the value cannot hide by dropping the
     ratio. Each against the same founding on the engine as it stood before the
     round (the rating the slider gave him then), against customFounderValue
     for that rating (his honest value) and against wageFor on that value (his
     honest wage). The last two are the engine against its own functions: they
     catch the cap reaching the value or the wage (control capall), not a
     wrong price, which the checks above own. */
  let capped = 0;
  let movedByCap = 0;
  let foundings = 0;
  const firstMoved = [];
  for (const era of ERAS) {
    const lg = leaguesOf(era)[0].id;
    for (const tier of Object.keys(TIERS)) {
      const ceiling = cm.customQualityCap(tier, era);
      for (const q of [...new Set([ceiling + 1, ceiling + 4, 88])].filter(x => x > ceiling && x <= 88)) {
        const name = NAMES[(q + SEED_BASE) % NAMES.length];
        const spec = specOf(name, { budgetTier: tier, quality: q }, lg);
        const st = seeded(`s1cap|${era}|${tier}|${q}`, () => cm.startCareer(name, era, spec));
        const was = seeded(`s1cap|${era}|${tier}|${q}`, () => old.startCareer(name, era, spec));
        const atCeiling = new Map(cm.buildCustomSquad({ ...spec, quality: ceiling }, era).map(p => [p.id, p]));
        const before = new Map(was.squad.map(p => [p.id, p]));
        foundings += 1;
        for (const p of founders(st)) {
          const honest = cm.customFounderValue(p.rating, era);
          const c = atCeiling.get(p.id);
          if (!c || !(c.value < honest)) continue;
          capped += 1;
          const b = before.get(p.id);
          const wage = cm.wageFor({ ...p, value: honest });
          if (!b || b.rating !== p.rating || p.value !== honest || p.wage !== wage) {
            movedByCap += 1;
            if (firstMoved.length < 1) firstMoved.push(`${p.name} (${era}, ${tier}, ${q}): rating ${p.rating} was ${b?.rating}, value ${p.value} honest ${honest}, wage ${p.wage} honest ${wage}`);
          }
        }
      }
    }
  }
  console.log(`   ${foundings} foundings above their tier's ceiling, ${capped} founders worth more than the same man at the ceiling; ${movedByCap} of them moved in rating, value or wage${firstMoved.length ? `, first: ${firstMoved[0]}` : ''}`);
  if (capped < 300) fail(`only ${capped} founders above their tier's ceiling, too few to say the ratio leaves them alone`);
  else if (movedByCap) fail(`${movedByCap} of ${capped} founders above the ceiling lost rating, value or wage to the sale ratio; it may only touch what they sell for`);
  else ok(`all ${capped} founders above the ceiling keep the rating the slider gave them, their honest value and their honest wage`);
}

/* ================================================================== */
section = 2;
console.log('2) selling the founders never pays more than their tier\'s money allows');
/* The tiers' own squads and the form's default: measured p90 0.52 to 0.59 of
   the tier's budget over four seeds, 0.41 of headroom. */
const GAIN_BOUND = 1.0;
/* Every slider setting on every tier: a squad at the tier's ceiling is what a
   real club with that budget holds, and above the ceiling its founders sell at
   the ceiling squad's prices, so it may sell for what a real club with that
   budget sells for. That figure is measured here, on real clubs inside the
   budget clamp doing the same sell off (REAL_SELL_OFF), and the bound is its
   p90 times SLIDER_HEADROOM: the created settings measure 0.8 to 0.9 of the
   real p90 over four seeds, and the real p90 itself moves about 10 percent
   seed to seed. The squad's sale ceiling (every founder at his value times his
   ratio) is held to budget / 0.16, the rule, with the name wobble's headroom,
   and each above ceiling founder's sale basis to the same man's value in the
   squad founded at the ceiling (a separate founding, not the ratio read back),
   from both sides: a ratio below that (control stingycap) withholds money the
   tier's own money bought. */
const SLIDER_HEADROOM = 1.2;
const WORTH_BOUND = 1.15;
const BASIS_BAND = [0.95, 1.05];
{
  const LEAGUES = {
    now: ['premier', 'championship', 'laliga', 'eredivisie', 'scottish', 'mlsEast'],
    era2015: ['premier2015', 'laliga2015', 'seriea2015'],
    era2010: ['premier2010', 'laliga2010'],
    era2005: ['premier2005', 'laliga2005'],
  };
  /* List every founder (or, at a real club, every man) at the founding, take
     every bid the squad floor allows through the summer window, against the
     same career (same seed) selling nobody. The budget difference is what the
     squad sold for. */
  const sellOffOf = (key, make, who) => {
    const arm = (sell) => seeded(key, () => {
      let st = make();
      const listed = who(st);
      /* What the squad could be cashed out for at most: every founder at his
         value times his sale ratio. */
      const worth = listed.reduce((s, p) => s + (p.value ?? 0) * (p.founderSaleRatio ?? 1), 0);
      const quality = st.customClub?.quality;
      /* And whether sellValue pays the ratio, man by man, on day one. The
         engine against its own rule: this catches a sale path that ignores
         the ratio (control nosalecap), not a wrong ratio, which the basis
         check and the sell off below own. */
      const binds = (p) => p.founderSaleRatio !== undefined && p.founderSaleRatio < 1;
      const over = listed.filter(p => binds(p)
        && cm.sellValue(p) > Math.max(0.3, Math.round(p.value * p.founderSaleRatio * 0.9 * 10) / 10)).length;
      const bound = listed.filter(binds).length;
      const ids = new Set(listed.map(p => p.id));
      if (sell) for (const id of ids) st = cm.setTransferStatus(st, id, 'listed');
      let n = 0;
      let guard = 0;
      while (st.transferWindow !== null && guard++ < 12) {
        st = cm.playNextEntry(st, { skipHalftime: true }).state;
        if (!sell || st.transferWindow === null) continue;
        for (const b of [...(st.incomingBids ?? [])]) {
          if (b.loan || !ids.has(b.playerId)) continue;
          const next = cm.acceptBid(st, b.playerId);
          if (next) { st = next; n += 1; }
        }
      }
      return { budget: st.budget, n, worth, quality, over, bound };
    });
    const a = arm(true);
    const b = arm(false);
    return { gain: a.budget - b.budget, n: a.n, worth: a.worth, quality: a.quality, over: a.over, bound: a.bound };
  };
  const sellOff = (key, era, spec) => sellOffOf(key, () => cm.startCareer(spec.name, era, spec), founders);

  /* The real baseline: every third real club of every era whose budget sits
     inside the 8m to 200m clamp (outside it the budget is not 0.16 of the
     squad), the whole squad listed. */
  const realShare = [];
  let realSold = 0;
  for (const era of ERAS) {
    const pool = realCaps.filter(r => r.era === era && r.budget > 8 && r.budget < 200);
    pool.filter((_, i) => i % 3 === SEED_BASE % 3).forEach((r) => {
      const res = sellOffOf(`s2real|${era}|${r.club}`, () => cm.startCareer(r.club, era), st => st.squad);
      realShare.push(res.gain / r.budget);
      realSold += res.n;
    });
  }
  const REAL_SELL_OFF = pct(realShare, 0.9);
  const SLIDER_BOUND = Math.round(REAL_SELL_OFF * SLIDER_HEADROOM * 100) / 100;
  console.log(`   real baseline: ${realShare.length} real clubs inside the budget clamp, ${realSold} sold; gain / own budget p50 ${f2(median(realShare))}, p90 ${f2(REAL_SELL_OFF)}; bound ${SLIDER_HEADROOM} x that = ${f2(SLIDER_BOUND)}`);
  if (realShare.length < 40) fail(`only ${realShare.length} real clubs in the baseline`);

  /* (a) the tiers' own squads and the form's default setting. */
  const S2 = CONFIGS.filter(c => ['small', 'mid', 'big', 'q66'].includes(c.tag));
  const share = [];
  const byCfg = {};
  let sold = 0;
  let careers = 0;
  for (const era of ERAS) {
    for (const lg of LEAGUES[era]) {
      for (const cfg of S2) {
        for (const name of NAMES.slice(0, 2)) {
          const r = sellOff(`s2|${era}|${lg}|${cfg.tag}|${name}`, era, specOf(name, cfg, lg));
          share.push(r.gain / TIERS[cfg.budgetTier]);
          (byCfg[cfg.tag] ??= []).push(r.gain);
          sold += r.n;
          careers += 1;
        }
      }
    }
  }
  for (const [k, v] of Object.entries(byCfg)) {
    const budget = TIERS[S2.find(c => c.tag === k).budgetTier];
    console.log(`   ${k.padEnd(5)} budget ${budget}m: gain over selling nobody p50 ${m1(median(v))}, p90 ${m1(pct(v, 0.9))} (${f2(pct(v, 0.9) / 15)} x the smallest tier, ${f2(pct(v, 0.9) / budget)} of its own)`);
  }
  console.log(`   ${careers} paired careers, ${sold} founders sold; gain as a share of the tier's budget p50 ${f2(median(share))}, p90 ${f2(pct(share, 0.9))}`);
  if (sold < careers * 5) fail(`only ${sold} founders were sold across ${careers} careers, too few to say what selling them pays`);
  else if (!(pct(share, 0.9) <= GAIN_BOUND)) fail(`selling every founder beats selling nobody by ${f2(pct(share, 0.9))} of the tier's budget at the p90 of ${careers} careers, above ${GAIN_BOUND}`);
  else ok(`over ${careers} paired careers and ${sold} sales, selling every founder beats selling nobody by ${f2(median(share))} of the tier's budget at the median and ${f2(pct(share, 0.9))} at the p90, inside ${GAIN_BOUND}`);

  /* (b) every slider setting on every tier, in every era, 55 to 88, 88 on the
     smallest budget included. The league turns over with the setting and the
     name with the seed. Above the ceiling, each founder's sale basis against
     the same man in a founding at the ceiling. */
  const all = [];
  const above = [];
  const worthShare = [];
  const basis = [];
  const byTier = {};
  let settings = 0;
  let aboveSettings = 0;
  let sold2 = 0;
  let boundMen = 0;
  let overMen = 0;
  const small88 = [];
  for (const era of ERAS) {
    const lgs = leaguesOf(era).map(l => l.id);
    for (const tier of Object.keys(TIERS)) {
      const ceiling = cm.customQualityCap(tier, era);
      for (let q = 55; q <= 88; q++) {
        const i = q - 55;
        const name = NAMES[(i + SEED_BASE) % NAMES.length];
        const lg = lgs[(i * 7 + SEED_BASE) % lgs.length];
        const spec = specOf(name, { budgetTier: tier, quality: q }, lg);
        const r = sellOff(`s2b|${era}|${tier}|${q}|${name}`, era, spec);
        const s = r.gain / TIERS[tier];
        all.push(s);
        if (q > ceiling) {
          above.push(s);
          aboveSettings += 1;
          worthShare.push(r.worth / (TIERS[tier] / 0.16));
          const st = seeded(`s2basis|${era}|${tier}|${q}`, () => cm.startCareer(name, era, spec));
          const atCeiling = new Map(cm.buildCustomSquad({ ...spec, quality: ceiling }, era).map(p => [p.id, p]));
          for (const p of founders(st)) {
            const c = atCeiling.get(p.id);
            if (!c || !(c.value < p.value)) continue;
            basis.push((p.value * (p.founderSaleRatio ?? 1)) / c.value);
          }
        }
        if (tier === 'small' && q === 88) small88.push(s);
        (byTier[`${era} ${tier}`] ??= { ceiling, gains: [] }).gains.push(s);
        sold2 += r.n;
        boundMen += r.bound;
        overMen += r.over;
        settings += 1;
      }
    }
  }
  for (const [k, v] of Object.entries(byTier)) {
    console.log(`   ${k.padEnd(13)} ceiling ${v.ceiling}: gain / budget p50 ${f2(median(v.gains))}, p90 ${f2(pct(v.gains, 0.9))}`);
  }
  console.log(`   ${settings} settings (${aboveSettings} above their tier's ceiling), ${sold2} founders sold; gain / tier budget over all p50 ${f2(median(all))}, p90 ${f2(pct(all, 0.9))}; above the ceiling p50 ${f2(median(above))}, p90 ${f2(pct(above, 0.9))}; 88 on 15m ${small88.map(f2).join(', ')}`);
  console.log(`   above the ceiling, the squad's sale ceiling / (tier budget / 0.16): p50 ${f2(median(worthShare))}, p90 ${f2(pct(worthShare, 0.9))} (${worthShare.length}); ${boundMen} founders with a ratio, ${overMen} priced above it by sellValue`);
  console.log(`   above the ceiling, a founder's sale basis over the same man founded at the ceiling (${basis.length} men): p10 ${f2(pct(basis, 0.1))}, p50 ${f2(median(basis))}, p90 ${f2(pct(basis, 0.9))}`);
  if (settings < 400 || aboveSettings < 100) fail(`only ${settings} slider settings covered, ${aboveSettings} of them above a ceiling`);
  else if (!(pct(all, 0.9) <= SLIDER_BOUND && pct(above, 0.9) <= SLIDER_BOUND)) {
    fail(`selling the founders pays p90 ${f2(pct(all, 0.9))} of the tier's budget over every setting and ${f2(pct(above, 0.9))} above the ceiling, above ${f2(SLIDER_BOUND)} (${SLIDER_HEADROOM} x the ${f2(REAL_SELL_OFF)} real clubs bank)`);
  } else ok(`over all ${settings} settings, selling the founders pays p90 ${f2(pct(all, 0.9))} of the tier's budget, and ${f2(pct(above, 0.9))} above the tier's ceiling, 88 on 15m included, inside ${f2(SLIDER_BOUND)} (${SLIDER_HEADROOM} x the ${f2(REAL_SELL_OFF)} real clubs with a budget bank, measured above)`);
  if (boundMen < 1000) fail(`only ${boundMen} founders had a sale ratio`);
  else if (overMen) fail(`sellValue prices ${overMen} of ${boundMen} founders above their value times their sale ratio`);
  else ok(`sellValue prices all ${boundMen} founders with a ratio at or under their value times that ratio`);
  if (!(pct(worthShare, 0.9) <= WORTH_BOUND)) fail(`above the ceiling a founding squad can be sold for p90 ${f2(pct(worthShare, 0.9))} of what a real club with its budget holds, above ${WORTH_BOUND}`);
  else ok(`above the ceiling a founding squad can be sold for at most p90 ${f2(pct(worthShare, 0.9))} of what a real club with its budget holds (budget / 0.16), inside ${WORTH_BOUND}`);
  if (basis.length < 1000) fail(`only ${basis.length} founders above a ceiling had a sale basis to read`);
  else if (!(pct(basis, 0.1) >= BASIS_BAND[0] && pct(basis, 0.9) <= BASIS_BAND[1])) fail(`a founder above the ceiling sells on a basis of p10 ${f2(pct(basis, 0.1))} to p90 ${f2(pct(basis, 0.9))} of the same man founded at the ceiling, outside ${BASIS_BAND.join(' to ')}: the ratio withholds more (or less) than the slider handed out`);
  else ok(`a founder above the ceiling sells on a basis of p10 ${f2(pct(basis, 0.1))} to p90 ${f2(pct(basis, 0.9))} of the same man founded at the ceiling, inside ${BASIS_BAND.join(' to ')}: the ratio withholds the slider's gift and nothing the money bought`);
}

/* ================================================================== */
section = 3;
console.log('3) a real player is priced exactly as he was before the round');
{
  /* (a) a real club career, old engine and new, same seed: day one, the window
     and three weeks, and a save written by the old engine loaded by both. */
  let realCareers = 0;
  let realDiff = 0;
  let realLoads = 0;
  let realLoadDiff = 0;
  for (const era of ERAS) {
    for (const lg of leaguesOf(era).slice(0, era === 'now' ? 4 : 2)) {
      const clubs = clubsOf(era, lg.id);
      for (const club of [clubs[0], clubs[Math.floor(clubs.length / 2)], clubs[clubs.length - 1]]) {
        const key = `s3real|${era}|${club}`;
        const a = seeded(key, () => playOn(cm, cm.startCareer(club, era), 7));
        const b = seeded(key, () => playOn(old, old.startCareer(club, era), 7));
        realCareers += 1;
        if (canon(a) !== canon(b)) {
          realDiff += 1;
          if (realDiff === 1) console.log(`   first difference, ${club} (${era}): ${firstDiff(JSON.parse(canon(a)), JSON.parse(canon(b)))}`);
        }
        store.clear();
        old.saveCareer(b);
        const raw = store.get(KEY_OF());
        const la = cm.loadCareer();
        store.set(KEY_OF(), raw);
        const lb = old.loadCareer();
        realLoads += 1;
        if (!la || !lb || canon(la) !== canon(lb)) realLoadDiff += 1;
      }
    }
  }
  /* (b) the market a created club sees, and (c) the real men it buys. */
  let markets = 0;
  let marketDiff = 0;
  let bought = 0;
  let boughtDiff = 0;
  const oldSaves = [];
  for (const era of ERAS) {
    for (const lg of leaguesOf(era).slice(0, 2)) {
      for (const cfg of CONFIGS.filter(c => ['mid', 'big'].includes(c.tag))) {
        const name = NAMES[0];
        const key = `s3cust|${era}|${lg.id}|${cfg.tag}`;
        const buyThree = (engine) => seeded(key, () => {
          let st = engine.startCareer(name, era, specOf(name, cfg, lg.id));
          const market = engine.buildMarket(st);
          const picks = market.filter(m => !m.generated && m.price <= 4).sort((x, y) => x.price - y.price || x.name.localeCompare(y.name)).slice(0, 3);
          for (const mp of picks) { const next = engine.buyPlayer(st, mp); if (next) st = next; }
          return { st, market, picks };
        });
        const a = buyThree(cm);
        const b = buyThree(old);
        markets += 1;
        const sig = (ms) => canon(ms.map(m => [m.name, m.club, m.value, m.price, m.rating, m.age]));
        if (sig(a.market) !== sig(b.market)) marketDiff += 1;
        for (const mp of a.picks) {
          const pa = a.st.squad.find(p => p.name === mp.name);
          const pb = b.st.squad.find(p => p.name === mp.name);
          bought += 1;
          if (!pa || !pb || pa.value !== mp.value || pa.value !== pb.value || pa.wage !== pb.wage) boughtDiff += 1;
        }
        /* The old engine's career, two weeks on, is a save written before the
           round with real players in it, for (d). */
        oldSaves.push({ era, club: name, st: seeded(`${key}|on`, () => playOn(old, b.st, 2)) });
      }
    }
  }
  /* (d) that save loaded by today's engine: every real player exactly as saved. */
  let realInSaves = 0;
  let realMoved = 0;
  for (const { st } of oldSaves) {
    store.clear();
    old.saveCareer(st);
    const loaded = cm.loadCareer();
    const was = new Map(st.squad.map(p => [p.id, p]));
    for (const p of loaded?.squad ?? []) {
      if (p.generated || p.isYouth) continue;
      const w = was.get(p.id);
      realInSaves += 1;
      if (!w || w.value !== p.value || w.wage !== p.wage) realMoved += 1;
    }
  }
  console.log(`   ${realCareers} real club careers played on both engines, ${realDiff} differ; ${realLoads} old real club saves loaded by both, ${realLoadDiff} differ`);
  console.log(`   ${markets} created club markets compared, ${marketDiff} differ; ${bought} real signings, ${boughtDiff} priced differently`);
  console.log(`   ${oldSaves.length} old created club saves carrying ${realInSaves} real players; ${realMoved} moved on load`);
  if (realCareers < 20) fail(`only ${realCareers} real club careers compared`);
  else if (realDiff || realLoadDiff) fail(`${realDiff} of ${realCareers} real club careers played differently and ${realLoadDiff} of ${realLoads} real club saves loaded differently on today's engine`);
  else ok(`all ${realCareers} real club careers played day one, the window and three weeks exactly as before, and all ${realLoads} of their saves loaded exactly as before`);
  if (markets < 10 || bought < 20) fail(`only ${markets} markets and ${bought} signings compared`);
  else if (marketDiff || boughtDiff) fail(`${marketDiff} of ${markets} created club markets and ${boughtDiff} of ${bought} real signings were priced differently from before the round`);
  else ok(`all ${markets} created club markets are the market as it was, and all ${bought} real signings carry their market value and the wage they always did`);
  if (realInSaves < 20) fail(`only ${realInSaves} real players in the old created club saves, so the load was never tested on one`);
  else if (realMoved) fail(`${realMoved} of ${realInSaves} real players in an old created club save changed value or wage on load`);
  else ok(`all ${realInSaves} real players bought by a created club before the round load with their value and wage exactly as saved`);
}

/* ================================================================== */
section = 4;
console.log('4) a created club save written before the round loads repriced and plays the same season');
{
  let saves = 0;
  let foundersOnLoad = 0;
  let foundersRight = 0;
  let loanRight = 0;
  let loans = 0;
  let wagesMoved = 0;
  let othersMoved = 0;
  let reloadMoved = 0;
  let played = 0;
  let playedDiff = 0;
  let weeksPlayed = 0;
  let literalSame = 0;
  /* What may differ is the founders' value and what is read straight off it:
     the bids for them (sellValue), and the money in an agent's renewal quote
     for one of them (renewalTerms prices the wage off the larger of his wage
     and what his value earns, and a season on his value has grown past his
     wage on the old footing). The quote's player, week, words and options
     must still match; only its two amounts are masked. And the sale ratio the
     load gives each founder, which the old engine never wrote, and a loan's
     buy option, which the load moves with his price (checked below). */
  const stripFounderValue = (st) => {
    const s = clone(st);
    const ids = new Set();
    for (const p of s.squad ?? []) if (p.generated && !p.isYouth) { delete p.value; delete p.founderSaleRatio; ids.add(p.id); }
    for (const l of s.loanedOut ?? []) if (l.player?.generated) { delete l.player.value; delete l.player.founderSaleRatio; delete l.optionFee; }
    /* A founder waiting in the free agent list is repriced too (checked below). */
    for (const f of s.freeAgents ?? []) if (f.generated) { delete f.value; delete f.founderSaleRatio; }
    delete s.incomingBids;
    delete s.customValues;
    delete s.founderWageRoom;
    const mask = (t) => (typeof t === 'string' ? t.replace(/£[0-9.,]+[mk]?/g, '£?').replace(/\d+k a week/g, '?k a week') : t);
    for (const m of s.inbox ?? []) {
      if (m.kind !== 'agent' || !ids.has(m.playerId)) continue;
      m.text = mask(m.text);
      for (const o of m.options ?? []) o.label = mask(o.label);
    }
    return s;
  };
  const todays = (spec, era) => new Map(cm.buildCustomSquad(spec, era).map(p => [p.id, p]));
  const S4 = CONFIGS.filter(c => ['small', 'mid', 'big', 'q66', 'q88'].includes(c.tag));
  for (const era of ERAS) {
    for (const cfg of S4) {
      const lg = leaguesOf(era)[0].id;
      const name = NAMES[1];
      const spec = specOf(name, cfg, lg);
      /* The old engine writes the save two weeks in, with one founder sent out
         on loan at a fixed fee in the window, the way a player's save from
         before the round really looks. */
      const oldCareer = seeded(`s4|${era}|${cfg.tag}`, () => {
        let st = old.startCareer(name, era, spec);
        const loanee = founders(st).sort((x, y) => x.rating - y.rating || x.id.localeCompare(y.id))[0];
        const lent = old.loanOutPlayer(st, loanee.id, clubsOf(era, lg)[0], 0.5);
        if (lent) st = lent;
        return playOn(old, st, 2);
      });
      if (oldCareer.customValues !== undefined || founders(oldCareer).some(p => p.value !== oldCreation(p.rating, p.age))) {
        fail('the old engine copy does not write founders at the full curve, so this section proves nothing');
        continue;
      }
      store.clear();
      old.saveCareer(oldCareer);
      const raw = store.get(KEY_OF());
      saves += 1;
      const loaded = cm.loadCareer();
      store.set(KEY_OF(), raw);
      const loadedOld = old.loadCareer();
      if (!loaded || !loadedOld) { fail(`${name} (${era}) did not load at all`); continue; }
      const today = todays(spec, era);
      const was = new Map(oldCareer.squad.map(p => [p.id, p]));
      for (const p of founders(loaded)) {
        foundersOnLoad += 1;
        const t = today.get(p.id);
        if (t && p.value === t.value && p.founderSaleRatio === t.founderSaleRatio) foundersRight += 1;
        if (p.wage !== was.get(p.id)?.wage) wagesMoved += 1;
      }
      for (const l of loaded.loanedOut ?? []) {
        if (!l.player?.generated) continue;
        loans += 1;
        const t = today.get(l.player.id);
        if (t && l.player.value === t.value && l.player.founderSaleRatio === t.founderSaleRatio) loanRight += 1;
      }
      /* Nothing but the founders' value (and the version mark) may differ. */
      if (canon(stripFounderValue(loaded)) !== canon(stripFounderValue(loadedOld))) {
        othersMoved += 1;
        if (othersMoved === 1) console.log(`   first difference on load, ${name} (${era}, ${cfg.tag}): ${firstDiff(JSON.parse(canon(stripFounderValue(loaded))), JSON.parse(canon(stripFounderValue(loadedOld))))}`);
      }
      /* A second load is a no-op. */
      store.clear();
      cm.saveCareer(loaded);
      const again = cm.loadCareer();
      if (!again || canon(again.squad.map(p => [p.id, p.value])) !== canon(loaded.squad.map(p => [p.id, p.value]))) reloadMoved += 1;
      /* And the rest of season one plays identically, on the copies whose bid
         targeting does not read the value (see liveBlind above). */
      store.set(KEY_OF(), raw);
      const blindNew = cmBlind.loadCareer();
      store.set(KEY_OF(), raw);
      const blindOld = oldBlind.loadCareer();
      const a = seeded(`s4play|${era}|${cfg.tag}`, () => playOn(cmBlind, blindNew, 200));
      const b = seeded(`s4play|${era}|${cfg.tag}`, () => playOn(oldBlind, blindOld, 200));
      weeksPlayed += a.week - blindNew.week;
      played += 1;
      if (canon(stripFounderValue(a)) !== canon(stripFounderValue(b))) {
        playedDiff += 1;
        if (playedDiff === 1) console.log(`   first difference in play, ${name} (${era}, ${cfg.tag}): ${firstDiff(JSON.parse(canon(stripFounderValue(a))), JSON.parse(canon(stripFounderValue(b))))}`);
      }
      /* The literal comparison, printed: today's engine against the old one,
         old values kept, value sorted targeting live. */
      const la = seeded(`s4play|${era}|${cfg.tag}`, () => playOn(cm, loaded, 200));
      const lb = seeded(`s4play|${era}|${cfg.tag}`, () => playOn(old, loadedOld, 200));
      if (canon(stripFounderValue(la)) === canon(stripFounderValue(lb))) literalSame += 1;
    }
  }
  /* A save a whole season on: every founder's value has moved since he was
     made, so the load moves it by the ratio of the new creation value to the
     old one, and the season after plays on identically. */
  let movedFounders = 0;
  let movedRight = 0;
  let laterPlayed = 0;
  let laterDiff = 0;
  let laterLiteralSame = 0;
  for (const era of ERAS) {
    const cfg = CONFIGS.find(c => c.tag === 'mid');
    const lg = leaguesOf(era)[0].id;
    const name = NAMES[2];
    const spec = specOf(name, cfg, lg);
    const seasonTwo = seeded(`s4two|${era}`, () => {
      let st = old.startCareer(name, era, spec);
      st = playOn(old, st, 400);
      st = old.startNextSeason(st);
      return playOn(old, st, 2);
    });
    store.clear();
    old.saveCareer(seasonTwo);
    const raw = store.get(KEY_OF());
    const loaded = cm.loadCareer();
    store.set(KEY_OF(), raw);
    const loadedOld = old.loadCareer();
    if (!loaded || !loadedOld) { fail(`${name} (${era}) did not load a season on`); continue; }
    const day = new Map(cm.buildCustomSquad(spec, era).map(p => [p.id, p]));
    const saved = new Map(seasonTwo.squad.map(p => [p.id, p]));
    for (const p of founders(loaded)) {
      const f = day.get(p.id);
      const s = saved.get(p.id);
      if (!f || !s || s.value === undefined) continue;
      movedFounders += 1;
      const want = s.value === oldCreation(f.rating, f.age)
        ? f.value
        : Math.max(0.2, r1(s.value * (f.value / oldCreation(f.rating, f.age))));
      if (p.value === want) movedRight += 1;
    }
    store.set(KEY_OF(), raw);
    const blindNew = cmBlind.loadCareer();
    store.set(KEY_OF(), raw);
    const blindOld = oldBlind.loadCareer();
    const a = seeded(`s4twoplay|${era}`, () => playOn(cmBlind, blindNew, 12));
    const b = seeded(`s4twoplay|${era}`, () => playOn(oldBlind, blindOld, 12));
    laterPlayed += 1;
    const la = seeded(`s4twoplay|${era}`, () => playOn(cm, loaded, 12));
    const lb = seeded(`s4twoplay|${era}`, () => playOn(old, loadedOld, 12));
    if (canon(stripFounderValue(la)) === canon(stripFounderValue(lb))) laterLiteralSame += 1;
    if (canon(stripFounderValue(a)) !== canon(stripFounderValue(b))) {
      laterDiff += 1;
      if (laterDiff === 1) console.log(`   first difference a season on (${era}): ${firstDiff(JSON.parse(canon(stripFounderValue(a))), JSON.parse(canon(stripFounderValue(b))))}`);
    }
  }
  console.log(`   ${saves} old saves two weeks in, ${foundersOnLoad} founders in the squad; ${foundersRight} carry today's creation value, ${loanRight} of ${loans} out on loan; ${wagesMoved} wages moved, ${othersMoved} other changes, ${reloadMoved} moved again on a second load`);
  console.log(`   ${played - playedDiff} of ${played} played the rest of season one identically (${weeksPlayed} calendar weeks); a season on, ${movedRight} of ${movedFounders} founders moved by the ratio and ${laterPlayed - laterDiff} of ${laterPlayed} played on identically`);
  console.log(`   (with the value sorted bid targeting live and the old values kept: ${literalSame} of ${played} and ${laterLiteralSame} of ${laterPlayed} still identical, not asserted)`);
  if (foundersOnLoad < 200) fail(`only ${foundersOnLoad} founders in the old saves`);
  else if (foundersRight !== foundersOnLoad || loans < saves || loanRight !== loans) fail(`${foundersOnLoad - foundersRight} of ${foundersOnLoad} founders in the squad and ${loans - loanRight} of ${loans} out on loan loaded without today's creation value and sale cap`);
  else ok(`every one of ${foundersOnLoad} founders in ${saves} old saves, and all ${loans} out on loan, loaded carrying today's creation value and sale cap`);
  if (wagesMoved || othersMoved || reloadMoved) fail(`the load moved ${wagesMoved} wages and ${othersMoved} other things it should not touch, and ${reloadMoved} saves moved again on a second load`);
  else ok('the load moved no wage and nothing but the founders\' value, and a second load moved nothing');
  if (weeksPlayed < played * 30) fail(`only ${weeksPlayed} calendar weeks played across ${played} saves, so the comparison did not cover a season`);
  else if (playedDiff) fail(`${playedDiff} of ${played} repriced saves played season one differently from the old engine`);
  else ok(`all ${played} repriced saves played the rest of season one (${weeksPlayed} calendar weeks in all) exactly as the old engine played them, bar the founders' value`);
  if (movedFounders < 60) fail(`only ${movedFounders} founders in the saves a season on`);
  else if (movedRight !== movedFounders || laterDiff) fail(`a season on, ${movedFounders - movedRight} of ${movedFounders} founders did not move by the ratio of the new creation value to the old, and ${laterDiff} of ${laterPlayed} saves played on differently`);
  else ok(`a season on, all ${movedFounders} founders moved by the ratio of the new creation value to the old, and all ${laterPlayed} saves played the next weeks exactly as the old engine did`);

  /* Round 640 review: the old money a created club save can hold, and the
     founders the first repair could not find. Written by the old engine: four
     founders listed with the window's bids on the table, a starter renewed
     with a clause, a young founder out on loan with his buy option, a founder
     whose deal ran out waiting in the free agent list, and a founder the old
     engine signed back out of that list under a free agent id. After the load
     each figure must sit on the man's new sale price (a bid at most 1.35 x
     1.15 of it, a clause 1.5 x, an option 1.15 x, above the engine's floors),
     and both lost founders must carry today's creation value and ratio. On the
     middle tier's own squad and on a slider 88 squad over it, in every era. */
  let figures = 0;
  const figureProblems = [];
  let lost = 0;
  let lostRight = 0;
  const lostProblems = [];
  const oldFigures = [];
  for (const era of ERAS) {
    for (const cfg of CONFIGS.filter(c => ['mid', 'q88'].includes(c.tag))) {
      const lg = leaguesOf(era)[0].id;
      const name = NAMES[0];
      const spec = specOf(name, cfg, lg);
      const save = seeded(`s4money|${era}|${cfg.tag}`, () => {
        let st = old.startCareer(name, era, spec);
        const fs0 = founders(st).sort((x, y) => y.rating - x.rating || x.id.localeCompare(y.id));
        const listed = fs0.slice(11, 15).map(p => p.id);
        for (const id of listed) st = old.setTransferStatus(st, id, 'listed');
        old.generateIncomingBids(st, false);
        const starter = st.squad.find(p => p.id === fs0[0].id);
        starter.releaseClause = old.renewalTermsWithClause(starter).clause;
        const young = fs0.filter(p => p.age <= 21 && !listed.includes(p.id)).sort((x, y) => x.id.localeCompare(y.id))[0];
        const lent = old.loanOutPlayer(st, young.id);
        if (lent) st = lent;
        const rest = fs0.filter(p => p.id !== young.id && p.id !== fs0[0].id && !listed.includes(p.id));
        const walker = rest[rest.length - 1];
        st.squad = st.squad.filter(p => p.id !== walker.id);
        st.xiIds = st.xiIds.map(id => (id === walker.id ? null : id));
        st.freeAgents = [...(st.freeAgents ?? []), {
          name: walker.name, position: walker.position, age: walker.age, rating: walker.rating,
          value: walker.value, generated: true, since: 1, reason: 'expired', fromMyClub: true,
        }];
        const back = rest[rest.length - 2];
        const i = st.squad.findIndex(p => p.id === back.id);
        const faId = `fa-${back.id.slice(2)}-s1`;
        st.xiIds = st.xiIds.map(id => (id === back.id ? faId : id));
        st.squad[i] = { ...st.squad[i], id: faId };
        return { st, listed, starter: starter.id, loaned: young.id, walker: walker.name, faId };
      });
      oldFigures.push(`${era} ${cfg.tag}: bids ${(save.st.incomingBids ?? []).filter(b => save.listed.includes(b.playerId) && !b.loan).map(b => b.offer).join('/')}m, clause ${save.st.squad.find(p => p.id === save.starter)?.releaseClause}m, option ${save.st.loanedOut?.[0]?.optionFee}m`);
      store.clear();
      old.saveCareer(save.st);
      const loaded = cm.loadCareer();
      if (!loaded) { fail(`the old money save for ${era} ${cfg.tag} did not load`); continue; }
      const byName = new Map(cm.buildCustomSquad(spec, era).map(p => [p.name, p]));
      for (const b of (loaded.incomingBids ?? []).filter(x => save.listed.includes(x.playerId) && !x.loan)) {
        const p = loaded.squad.find(x => x.id === b.playerId);
        if (!p) continue;
        figures += 1;
        if (b.offer > Math.max(0.3, 1.6 * cm.sellValue(p))) figureProblems.push(`${era} ${cfg.tag}: a bid of ${b.offer}m on a founder selling for ${cm.sellValue(p)}m`);
      }
      const starter = loaded.squad.find(p => p.id === save.starter);
      if (starter) {
        figures += 1;
        if (starter.releaseClause > Math.max(0.5, 1.6 * cm.sellValue(starter))) figureProblems.push(`${era} ${cfg.tag}: a clause of ${starter.releaseClause}m on a founder selling for ${cm.sellValue(starter)}m`);
      }
      const loan = (loaded.loanedOut ?? []).find(l => l.player.id === save.loaned);
      if (loan) {
        figures += 1;
        if (loan.optionFee > Math.max(0.5, 1.2 * cm.sellValue(loan.player))) figureProblems.push(`${era} ${cfg.tag}: a loan buy option of ${loan.optionFee}m on a founder selling for ${cm.sellValue(loan.player)}m`);
      }
      const inPool = (loaded.freeAgents ?? []).find(f => f.name === save.walker);
      const t1 = byName.get(save.walker);
      lost += 1;
      if (inPool && t1 && inPool.value === t1.value && inPool.founderSaleRatio === t1.founderSaleRatio) lostRight += 1;
      else lostProblems.push(`${era} ${cfg.tag}: the founder in the free agent list loaded at ${inPool?.value}m ratio ${inPool?.founderSaleRatio}, today's ${t1?.value}m ratio ${t1?.founderSaleRatio}`);
      const signedBack = loaded.squad.find(p => p.id === save.faId);
      const t2 = signedBack ? byName.get(signedBack.name) : undefined;
      lost += 1;
      if (signedBack && t2 && signedBack.value === t2.value && signedBack.founderSaleRatio === t2.founderSaleRatio) lostRight += 1;
      else lostProblems.push(`${era} ${cfg.tag}: the founder signed back under ${save.faId} loaded at ${signedBack?.value}m ratio ${signedBack?.founderSaleRatio}, today's ${t2?.value}m ratio ${t2?.founderSaleRatio}`);
    }
  }
  console.log(`   old money in the saves: ${oldFigures.join('; ')}`);
  console.log(`   after the load: ${figures} figures checked, ${figureProblems.length} still on the old money; ${lostRight} of ${lost} founders in the free agent list or signed back under a free agent id repriced${figureProblems.length ? `; first: ${figureProblems[0]}` : ''}${lostProblems.length ? `; ${lostProblems[0]}` : ''}`);
  if (figures < 30) fail(`only ${figures} old money figures made it into the saves, so the repair was not tested`);
  else if (figureProblems.length) fail(`${figureProblems.length} of ${figures} bids, clauses and loan options kept the old money after the load`);
  else ok(`all ${figures} bids, clauses and loan options the old engine priced off a founder's old value load moved onto his new sale price`);
  if (lost < 16 || lostRight !== lost) fail(`${lost - lostRight} of ${lost} founders in the free agent list or signed back under a free agent id loaded without today's value and ratio`);
  else ok(`all ${lost} founders waiting in the free agent list or signed back under a free agent id load with today's value and sale ratio`);
}

/* ================================================================== */
section = 5;
console.log('5) a created club can spend its budget the way a real club with that budget can');
/* The line itself against the real clubs it was fitted to, measured here:
   day one cap over realCapForBudget(budget) for every real club inside the
   budget clamp, all four eras (measured median 1.00, p10 0.95, p90 1.05 when
   fitted). A line at half (control halfcap) reads 2. */
const LINE_P50 = [0.93, 1.07];
const LINE_TAILS = [0.85, 1.15];
/* The created club's bill over its cap after spending, at the median, may run
   to the real clubs' median plus the band (a median of 20 foundings a tier
   against a median of 12 to 24 real clubs, rather than a p90 of that few,
   which is a max in disguise). Measured over four seeds: created medians
   0.36 to 0.43, real 1.00 to 1.01, tightcap 1.28 to 1.44. */
const CAP_BAND = 0.1;
/* After a summer with the founders above the money gone, the cap over the
   line: nextWageCap moves a cap by 0.94 to 1.16 a season, so 1.2 is the most
   the line alone can have grown to. With stickycap (the whole cap moved on,
   founders' room and all) it reads several times the line. */
const DRIFT_BOUND = 1.2;
{
  const inBand = (x, [lo, hi]) => x >= lo && x <= hi;
  const lineRatios = realCaps.filter(r => r.budget > 8 && r.budget < 200).map(r => r.cap / cm.realCapForBudget(r.budget));
  console.log(`   the line against ${lineRatios.length} real clubs inside the budget clamp: day one cap / realCapForBudget p10 ${f2(pct(lineRatios, 0.1))}, p50 ${f2(median(lineRatios))}, p90 ${f2(pct(lineRatios, 0.9))}`);
  if (lineRatios.length < 150) fail(`only ${lineRatios.length} real clubs to hold the line against`);
  else if (!(inBand(median(lineRatios), LINE_P50) && pct(lineRatios, 0.1) >= LINE_TAILS[0] && pct(lineRatios, 0.9) <= LINE_TAILS[1])) {
    fail(`real clubs run p10 ${f2(pct(lineRatios, 0.1))}, p50 ${f2(median(lineRatios))}, p90 ${f2(pct(lineRatios, 0.9))} of realCapForBudget, outside p50 ${LINE_P50.join(' to ')} and tails ${LINE_TAILS.join(' to ')}: the line is not the cap a real club with that budget has`);
  } else ok(`real clubs run p10 ${f2(pct(lineRatios, 0.1))}, p50 ${f2(median(lineRatios))}, p90 ${f2(pct(lineRatios, 0.9))} of realCapForBudget: the line is the cap a real club with that budget has`);

  /* Three signings through the real buy path, each the best rated real player
     the budget still left can pay for with two, one or no more signings to
     come after it (price at most what is left over the signings left), ties to
     the dearer man and then the name. The same for the created club and for
     real clubs of a similar budget. */
  const spend = (st) => {
    const start = st.budget;
    let bought = 0;
    for (let i = 0; i < 3; i++) {
      const limit = st.budget / (3 - i);
      const picks = cm.buildMarket(st)
        .filter(m => !m.generated && m.price <= limit)
        .sort((x, y) => y.rating - x.rating || y.price - x.price || x.name.localeCompare(y.name));
      for (const mp of picks.slice(0, 10)) {
        const next = cm.buyPlayer(st, mp);
        if (next) { st = next; bought += 1; break; }
      }
    }
    return { st, spent: (start - st.budget) / start, bought, over: cm.wageBill(st) / st.wageCap };
  };
  /* Real clubs of a similar budget in the same era (the cap follows the budget
     the same way in every league, as the check above shows). */
  const realPool = {};
  for (const era of ERAS) {
    realPool[era] = [];
    for (const lg of leaguesOf(era)) for (const club of clubsOf(era, lg.id)) {
      const b = (era === 'now' ? cm.clubDefFor(club) : cm.eraClubDefFor(club, era)).budget;
      realPool[era].push({ club, budget: b });
    }
  }
  const LEAGUES5 = { now: ['premier', 'eredivisie', 'scottish', 'championship'], era2015: ['premier2015', 'seriea2015'], era2010: ['premier2010', 'laliga2010'], era2005: ['premier2005', 'laliga2005'] };
  let dayOne = 0;
  let dayOneShort = 0;
  const created = {};
  const real = {};
  const spent = [];
  for (const era of ERAS) {
    for (const tier of Object.keys(TIERS)) {
      const B = TIERS[tier];
      for (const lg of LEAGUES5[era]) {
        for (const name of NAMES.slice(0, 2)) {
          const r = seeded(`s5|${era}|${lg}|${tier}|${name}`, () => {
            const st = cm.startCareer(name, era, specOf(name, { budgetTier: tier }, lg));
            dayOne += 1;
            /* The engine against its own rule: catches a founding that skips
               the line, not a wrong line, which the check above owns. */
            const want = Math.max(Math.max(60, Math.round(cm.wageBill(st) * 1.15)), cm.realCapForBudget(B) + cm.foundersWageRoom(st));
            if (st.wageCap !== want) dayOneShort += 1;
            return spend(st);
          });
          (created[tier] ??= []).push(r.over);
          spent.push(r.spent);
        }
      }
      const peers = realPool[era].filter(c => c.budget >= B * 0.7 && c.budget <= B * 1.4).slice(0, 6);
      for (const c of peers) {
        const r = seeded(`s5r|${era}|${c.club}`, () => spend(cm.startCareer(c.club, era)));
        (real[tier] ??= []).push(r.over);
      }
    }
  }
  for (const tier of Object.keys(TIERS)) {
    console.log(`   ${tier.padEnd(5)} ${TIERS[tier]}m: created bill / cap after spending p50 ${f2(median(created[tier]))} (${created[tier].length}); real clubs of a similar budget p50 ${f2(median(real[tier] ?? []))} (${(real[tier] ?? []).length})`);
  }
  console.log(`   ${dayOne} created clubs founded, ${dayOneShort} not on max(bill based cap, realCapForBudget + foundersWageRoom); budget spent p50 ${f2(median(spent))}, p10 ${f2(pct(spent, 0.1))}`);
  if (dayOne < 60 || dayOneShort) fail(`${dayOneShort} of ${dayOne} created clubs did not open on the larger of their bill based cap and the cap a real club with their budget has plus their founders' room`);
  else ok(`all ${dayOne} created clubs opened on the larger of their bill based cap and the cap a real club with their budget has plus their founders' room`);
  if (!(pct(spent, 0.1) >= 0.7)) fail(`the spending only used p10 ${f2(pct(spent, 0.1))} of the budget, so the cap was never really tested`);
  const bad = Object.keys(TIERS).filter(t => !((real[t] ?? []).length >= 6 && median(created[t]) <= median(real[t]) + CAP_BAND));
  if (bad.length) fail(`after spending its budget a created club runs further over its cap than real clubs of its budget on the ${bad.join(', ')} tier${bad.length === 1 ? '' : 's'} (median against the real median plus ${CAP_BAND})`);
  else ok(`on every tier a created club that spends its budget sits no further over its cap than real clubs of that budget do (median against their median plus ${CAP_BAND})`);

  /* A squad founded above what its money buys: its founders' wage room is on
     the cap while they are there, and comes off as they go. Every tier in
     every era whose ceiling is under 88, founded at 88. Kept: a summer on,
     the cap still covers the bill. Gone: every founder with a sale ratio off
     the books before the summer (sold, released, walked), and a summer on the
     cap is back near the budget's line. */
  const keepRoom = [];
  const gone = [];
  for (const era of ERAS) {
    for (const tier of Object.keys(TIERS)) {
      if (cm.customQualityCap(tier, era) >= 88) continue;
      const lg = leaguesOf(era)[0].id;
      const name = NAMES[2];
      const spec = specOf(name, { budgetTier: tier, quality: 88 }, lg);
      const st = seeded(`s5drift|${era}|${tier}`, () => cm.startCareer(name, era, spec));
      const kept = seeded(`s5driftk|${era}|${tier}`, () => cm.startNextSeason(clone(st)));
      keepRoom.push(kept.wageCap / cm.wageBill(kept));
      const without = clone(st);
      const leaving = new Set(without.squad.filter(p => p.founderSaleRatio !== undefined).map(p => p.id));
      without.squad = without.squad.filter(p => !leaving.has(p.id));
      without.xiIds = without.xiIds.map(id => (leaving.has(id) ? null : id));
      const after = seeded(`s5driftg|${era}|${tier}`, () => cm.startNextSeason(without));
      gone.push({ tag: `${era} ${tier}`, founding: st.wageCap, after: after.wageCap, line: cm.realCapForBudget(TIERS[tier]), room: cm.foundersWageRoom(after) });
    }
  }
  const driftRatios = gone.map(g => g.after / g.line);
  console.log(`   founded at 88 above the ceiling (${gone.length} tier and era pairs): kept a summer on, cap / bill p50 ${f2(median(keepRoom))}; with every founder carrying a ratio gone, the cap went ${gone.slice(0, 3).map(g => `${g.founding}k to ${g.after}k (line ${g.line}k)`).join(', ')}; after / line p50 ${f2(median(driftRatios))}, p90 ${f2(pct(driftRatios, 0.9))}`);
  if (gone.length < 8) fail(`only ${gone.length} tier and era pairs founded above the ceiling`);
  else if (!(median(keepRoom) >= 1.0)) fail(`a summer on with the founders still there, the cap covers only ${f2(median(keepRoom))} of the bill at the median`);
  else if (!(median(driftRatios) <= DRIFT_BOUND)) fail(`with the founders gone the cap sits at ${f2(median(driftRatios))} of the budget's line at the median a summer on, above ${DRIFT_BOUND}: their wage room did not leave with them`);
  else ok(`a squad above the money keeps room for its bill while it is there (cap ${f2(median(keepRoom))} of the bill a summer on) and, with its founders gone, falls back to ${f2(median(driftRatios))} of the budget's line a summer on (bound ${DRIFT_BOUND})`);

  /* A created club save from before the round with its cap somehow under the
     line loads with the line, contracts untouched; one with the old inflated
     cap loads unchanged; and a save this engine wrote keeps a cap the career
     brought down, because the floor runs once. */
  const oldSave = seeded('s5old', () => old.startCareer(NAMES[0], 'now', specOf(NAMES[0], { budgetTier: 'big' }, 'premier')));
  const floor = cm.realCapForBudget(TIERS.big);
  const lowered = { ...clone(oldSave), wageCap: 100 };
  store.clear();
  old.saveCareer(lowered);
  const la = cm.loadCareer();
  store.clear();
  old.saveCareer(oldSave);
  const lb = cm.loadCareer();
  const newSave = seeded('s5new', () => cm.startCareer(NAMES[0], 'now', specOf(NAMES[0], { budgetTier: 'big' }, 'premier')));
  store.clear();
  cm.saveCareer({ ...clone(newSave), wageCap: 100 });
  const lc = cm.loadCareer();
  const wagesSame = !!la && canon(la.squad.map(p => [p.id, p.wage])) === canon(lowered.squad.map(p => [p.id, p.wage]));
  console.log(`   old save with its cap at 100k loads at ${la?.wageCap}k (line ${floor}k); old save with its own cap (${oldSave.wageCap}k) loads at ${lb?.wageCap}k; a new save brought down to 100k loads at ${lc?.wageCap}k`);
  if (!la || la.wageCap !== floor || !wagesSame) fail(`an old created save with its cap under the line loaded at ${la?.wageCap}k, not the ${floor}k line, or its contracts moved`);
  else ok(`an old created save with its cap under the line loads at the ${floor}k line with every contract as signed`);
  if (!lb || lb.wageCap !== oldSave.wageCap || !lc || lc.wageCap !== 100) fail('the floor moved a cap it should have left alone (the old inflated one, or a new save\'s own)');
  else ok('the floor leaves an old save\'s higher cap and a new save\'s own cap exactly as saved');
}

fs.rmSync(TMP, { recursive: true, force: true });
const red = [...failedSections].sort().join(', ');
console.log(`simCustomClubValues: ${checks} checks, ${failures} failure${failures === 1 ? '' : 's'}${red ? ` (sections ${red})` : ''}${CONTROL ? ` (control ${CONTROL})` : ''}`);
process.exit(failures ? 1 : 0);
