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
 * on load (ensureCustomClubValues), each founder rebuilt from the spec.
 *
 * SECTIONS, on the real engine bundled with esbuild, all four eras:
 *   1) a created squad is worth what the real squads of its level in its own
 *      league are worth: every league a club can be founded in, the three budget
 *      tiers and the quality slider at 55, 66, 77 and 88, three founding names.
 *      Value a head against the median value a head of the real players of the
 *      real squads in the same league whose mean rating is within two points
 *      (a head, so a 17 man real squad and a 24 man founding compare). Pooled
 *      p10 and p90 inside the band. Never a max.
 *   2) listing every founder in the first summer window and taking every bid the
 *      squad floor allows, against the same career (same seed) selling nobody.
 *      The budget difference is what the founders were worth to sell, taken as
 *      a multiple of the budget the tier handed over. The bound is 1, the whole
 *      of that budget, and for the smallest tier that is 1 x 15m: selling the
 *      squad a tier builds must never pay more than the tier's own cheque, or
 *      picking the tier would mean nothing. The tiers' own squads (anchors 62, 68
 *      and 74) and the form's defaults (slider 66 on the middle budget).
 *   3) real players are priced exactly as before: a real club career plays its
 *      first window and weeks identically on the engine as it stood before the
 *      round and survives a save and load unchanged; the market a created club
 *      sees is the same market; a real player it buys carries the same value and
 *      wage; and a created club save from before the round that bought real
 *      players loads with every real player's value and wage exactly as saved.
 *   4) a created club save written by the engine as it stood before the round
 *      (two weeks in, one founder out on loan) loads with every founder carrying
 *      exactly today's creation value and nothing else moved, a load is done
 *      once (a second load moves nothing), and the rest of season one plays
 *      exactly as the old engine plays the same save with the old values, bar
 *      the founders' value and what is read straight off it (the bids for them,
 *      the two amounts in an agent's renewal quote). The one place a value steers
 *      the random stream, the value sorted pick of who gets an unsolicited bid,
 *      is sorted by rating in both copies for that comparison (see liveBlind),
 *      and the literal comparison is printed beside it. A save a whole season
 *      on moves every founder by the ratio of the new creation value to the old,
 *      then plays on the same way.
 *
 * MEASURED, default seed and SIM_SEED 1, 2 and 3, each run on its own TEMP;
 * the rawcurve figures are the default seed with the old creation value.
 *   section 1  a head, pooled p10       fixed 0.76 to 0.81    rawcurve 10.11    floor 0.5
 *              a head, pooled p90       fixed 1.39 to 1.45    rawcurve 28.04    ceiling 2.0
 *              (259 to 263 of 567 created squads a run have a real squad within two
 *              points in their league; the small tier and slider 55 squads have none
 *              anywhere, so they are priced by the same line but banded only man by man)
 *              man by man, p10          fixed 0.87 to 0.90    rawcurve 7.77     floor 0.75
 *              man by man, p90          fixed 1.02 to 1.03    rawcurve 24.17    ceiling 1.3
 *              (5,192 to 6,032 founders a run with 8 or more real players of their
 *              era, rating and age band)
 *   section 2  p90 gain / tier budget   fixed 0.52 to 0.59    rawcurve 10.85    bound 1.0
 *              (104 paired careers and about 1,040 sales a run; p90 gain small 6.3 to
 *              7.0m, mid 19.3 to 21.8m, big 51.6 to 64.5m, slider 66 on 40m 12.5 to
 *              14.8m, against 183m, 378m, 719m and 296m on the old curve)
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
const KNOWN = ['rawcurve', 'noload', 'realtoo', 'freeslider', 'tightcap'];
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
const LOAD_LINE = '      ensureCustomClubValues(parsed);\n';
const MARK_LINE = '    state.customValues = CUSTOM_VALUES_VERSION;\n';
const REAL_LINE = '  if (!p.generated || p.isYouth || p.academyGrad) return null;\n';
const CEILING_LINE = '    if (worth > allowed) break;\n';
const CLAMP_LINE = '    if (spec.quality !== undefined) spec.quality = Math.min(spec.quality, customQualityCap(spec.budgetTier, era.id));\n';
const CAP_FLOOR_LINE = '  if (custom) state.wageCap = Math.max(state.wageCap, realCapForBudget(club.budget));\n';
const CAP_LOAD_LINE = '      ensureCustomClubWageCap(parsed);\n';

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
if (CONTROL === 'noload') live = rewrite(live, LOAD_LINE, '', 'control noload');
if (CONTROL === 'realtoo') {
  live = rewrite(live, REAL_LINE,
    '  if (!p.generated && !p.isYouth) return p;\n  if (p.isYouth || p.academyGrad) return null;\n', 'control realtoo');
}
/* The slider's ceiling never stops climbing, so every tier reaches 88. */
if (CONTROL === 'freeslider') live = rewrite(live, CEILING_LINE, '', 'control freeslider');
/* The bill based cap only, at the founding and on load. */
if (CONTROL === 'tightcap') {
  live = rewrite(rewrite(live, CAP_FLOOR_LINE, '', 'control tightcap, founding'), CAP_LOAD_LINE, '', 'control tightcap, load');
}
if (CONTROL) console.log(`   [control ${CONTROL} applied to an in memory copy of the engine]`);
/* The engine as it stood before Round 640: the full curve at creation, no
   repricing on load, no version mark on a new created club, a slider that
   reaches 88 on any budget, and the bill based cap only. */
let pre = PRISTINE;
for (const [anchor, to, why] of [
  [VALUE_LINE, OLD_VALUE_LINE, 'creation value'], [LOAD_LINE, '', 'load repricing'], [MARK_LINE, '', 'version mark'],
  [CLAMP_LINE, '', 'slider ceiling'], [CAP_FLOOR_LINE, '', 'cap floor'], [CAP_LOAD_LINE, '', 'cap floor on load'],
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
/* Measured over four seeds (see the header): a head, p10 0.76 to 0.81 and p90
   1.39 to 1.45, so the band leaves 0.26 below the worst p10 and 0.55 above the
   worst p90; man by man, p10 0.87 to 0.90 and p90 1.02 to 1.03, so 0.12 below
   and 0.27 above. The full curve sits at 8 and more on both. */
const BAND_LO = 0.5;
const BAND_HI = 2.0;
const MAN_LO = 0.75;
const MAN_HI = 1.3;
{
  const realOf = new Map();
  /* And every real player's value by era, rating and age band, for the man by
     man comparison (the raw curve's own age bands). */
  const ageBand = (a) => (a <= 21 ? 0 : a <= 24 ? 1 : a <= 28 ? 2 : a <= 31 ? 3 : a <= 34 ? 4 : 5);
  const realByRating = new Map();
  for (const era of ERAS) for (const lg of leaguesOf(era)) {
    realOf.set(`${era}|${lg.id}`, clubsOf(era, lg.id).map((club) => {
      const st = seeded(`s1real|${era}|${club}`, () => cm.startCareer(club, era));
      const real = st.squad.filter(p => !p.isYouth && !p.generated);
      for (const p of real) {
        const k = `${era}|${p.rating}|${ageBand(p.age)}`;
        if (!realByRating.has(k)) realByRating.set(k, []);
        realByRating.get(k).push(p.value);
      }
      return { club, mean: meanR(real), head: perHead(real) };
    }));
  }
  const manByMan = [];
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
  console.log(`   ${squads} created squads (${founderCount} founders), ${ratios.length} with a real squad of the same league within two rating points`);
  console.log(`   value a head over the real squads': ${Object.entries(byCfg).map(([k, v]) => `${k} p50 ${f2(median(v))} (${v.length})`).join(', ')}`);
  console.log(`   no real squad that close in the league: ${Object.entries(noMatch).map(([k, v]) => `${k} ${v}`).join(', ') || 'none'}`);
  console.log(`   pooled p10 ${f2(pct(ratios, 0.1))}, p50 ${f2(median(ratios))}, p90 ${f2(pct(ratios, 0.9))}`);
  if (ratios.length < 150) fail(`only ${ratios.length} created squads had a real squad to compare with, too few to read a p10 and a p90`);
  else if (!(pct(ratios, 0.1) >= BAND_LO && pct(ratios, 0.9) <= BAND_HI)) {
    fail(`a created squad's value a head runs p10 ${f2(pct(ratios, 0.1))} to p90 ${f2(pct(ratios, 0.9))} of the real squads of its level, outside ${BAND_LO} to ${BAND_HI}`);
  } else ok(`a created squad's value a head runs p10 ${f2(pct(ratios, 0.1))} to p90 ${f2(pct(ratios, 0.9))} of the real squads of its level in its league, inside ${BAND_LO} to ${BAND_HI}`);
  console.log(`   man by man, ${manByMan.length} founders against the median real player of the same era, rating and age band (8 or more of them): p10 ${f2(pct(manByMan, 0.1))}, p50 ${f2(median(manByMan))}, p90 ${f2(pct(manByMan, 0.9))}`);
  if (manByMan.length < 3000) fail(`only ${manByMan.length} founders had 8 real players of their era, rating and age band to compare with`);
  else if (!(pct(manByMan, 0.1) >= MAN_LO && pct(manByMan, 0.9) <= MAN_HI)) {
    fail(`a founder is worth p10 ${f2(pct(manByMan, 0.1))} to p90 ${f2(pct(manByMan, 0.9))} of the real players of his era, rating and age band, outside ${MAN_LO} to ${MAN_HI}`);
  } else ok(`a founder is worth p10 ${f2(pct(manByMan, 0.1))} to p90 ${f2(pct(manByMan, 0.9))} of the real players of his era, rating and age band, inside ${MAN_LO} to ${MAN_HI}`);
  if (founderCount < 5000) fail(`only ${founderCount} founders measured`);
  else if (wrongValue) fail(`${wrongValue} of ${founderCount} founders were not created carrying customFounderValue for their rating and era`);
  else ok(`all ${founderCount} founders were created carrying customFounderValue for their rating and era`);
}

/* ================================================================== */
section = 2;
console.log('2) selling the founders never pays more than the budget the tier bought them with');
/* The tiers' own squads and the form's default: measured p90 0.52 to 0.59 of
   the tier's budget over four seeds, 0.41 of headroom. */
const GAIN_BOUND = 1.0;
/* Every slider setting a tier allows: a squad at the ceiling is what a real
   club with that budget holds, so it may sell for what a real club with that
   budget sells for. The same sell off on 66 real clubs inside the budget clamp
   (all four eras) banks p50 2.69 and p90 3.31 of their own budget, 3.85 in the
   60m to 120m band; the bound sits on the top of those. The squad itself is
   held to budget / 0.16 (the rule), with the name wobble's headroom. Both
   measured over four seeds in the header. */
const SLIDER_BOUND = 4.0;
const WORTH_BOUND = 1.15;
{
  const LEAGUES = {
    now: ['premier', 'championship', 'laliga', 'eredivisie', 'scottish', 'mlsEast'],
    era2015: ['premier2015', 'laliga2015', 'seriea2015'],
    era2010: ['premier2010', 'laliga2010'],
    era2005: ['premier2005', 'laliga2005'],
  };
  /* List every founder at the founding, take every bid the squad floor allows
     through the summer window, against the same career (same seed) selling
     nobody. The budget difference is what the founders sold for. */
  const sellOff = (key, era, spec) => {
    const arm = (sell) => seeded(key, () => {
      let st = cm.startCareer(spec.name, era, spec);
      const worth = founders(st).reduce((s, p) => s + p.value, 0);
      const quality = st.customClub?.quality;
      const ids = new Set(founders(st).map(p => p.id));
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
      return { budget: st.budget, n, worth, quality };
    });
    const a = arm(true);
    const b = arm(false);
    return { gain: a.budget - b.budget, n: a.n, worth: a.worth, quality: a.quality };
  };

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

  /* (b) every slider setting each tier allows, in every era, from 55 to the
     tier's ceiling, plus a founding that asks for 88 on every tier. The league
     turns over with the setting and the name with the seed. */
  const all = [];
  const top = [];
  const worthShare = [];
  const byTier = {};
  let settings = 0;
  let asked88 = 0;
  let sold2 = 0;
  for (const era of ERAS) {
    const lgs = leaguesOf(era).map(l => l.id);
    for (const tier of Object.keys(TIERS)) {
      const ceiling = cm.customQualityCap(tier, era);
      const qs = [];
      for (let q = 55; q <= ceiling; q++) qs.push(q);
      qs.push(88);
      qs.forEach((q, i) => {
        const name = NAMES[(i + SEED_BASE) % NAMES.length];
        const lg = lgs[(i * 7 + SEED_BASE) % lgs.length];
        const r = sellOff(`s2b|${era}|${tier}|${q}|${name}`, era, specOf(name, { budgetTier: tier, quality: q }, lg));
        const s = r.gain / TIERS[tier];
        all.push(s);
        if (q > ceiling - 3) {
          top.push(s);
          worthShare.push(r.worth / (TIERS[tier] / 0.16));
        }
        (byTier[`${era} ${tier}`] ??= { ceiling, gains: [] }).gains.push(s);
        sold2 += r.n;
        if (q === 88) asked88 += 1; else settings += 1;
      });
    }
  }
  for (const [k, v] of Object.entries(byTier)) {
    console.log(`   ${k.padEnd(13)} ceiling ${v.ceiling}: gain / budget p50 ${f2(median(v.gains))}, p90 ${f2(pct(v.gains, 0.9))}`);
  }
  console.log(`   ${settings} allowed settings and ${asked88} foundings that asked for 88, ${sold2} founders sold; gain / tier budget over all p50 ${f2(median(all))}, p90 ${f2(pct(all, 0.9))}; the top three settings of each tier (and the asks for 88) p90 ${f2(pct(top, 0.9))}`);
  console.log(`   at each tier's top three settings and the asks for 88, squad worth / (tier budget / 0.16): p50 ${f2(median(worthShare))}, p90 ${f2(pct(worthShare, 0.9))} (${worthShare.length})`);
  if (settings < 250) fail(`only ${settings} slider settings covered`);
  else if (!(pct(all, 0.9) <= SLIDER_BOUND && pct(top, 0.9) <= SLIDER_BOUND)) {
    fail(`selling the founders pays p90 ${f2(pct(all, 0.9))} of the tier's budget over every allowed setting and ${f2(pct(top, 0.9))} at the top settings, above ${SLIDER_BOUND}, what a real club with that budget banks`);
  } else ok(`over ${settings} allowed settings, selling the founders pays p90 ${f2(pct(all, 0.9))} of the tier's budget, and ${f2(pct(top, 0.9))} at each tier's top three and when 88 is asked for, inside the ${SLIDER_BOUND} a real club with that budget banks`);
  if (!(pct(worthShare, 0.9) <= WORTH_BOUND)) fail(`a founding squad at the top of its tier is worth p90 ${f2(pct(worthShare, 0.9))} of what a real club with its budget holds, above ${WORTH_BOUND}`);
  else ok(`a founding squad at the top of its tier is worth p90 ${f2(pct(worthShare, 0.9))} of what a real club with its budget holds (budget / 0.16), inside ${WORTH_BOUND}`);
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
     must still match; only its two amounts are masked. */
  const stripFounderValue = (st) => {
    const s = clone(st);
    const ids = new Set();
    for (const p of s.squad ?? []) if (p.generated && !p.isYouth) { delete p.value; ids.add(p.id); }
    for (const l of s.loanedOut ?? []) if (l.player?.generated) delete l.player.value;
    delete s.incomingBids;
    delete s.customValues;
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
        if (p.value === today.get(p.id)?.value) foundersRight += 1;
        if (p.wage !== was.get(p.id)?.wage) wagesMoved += 1;
      }
      for (const l of loaded.loanedOut ?? []) {
        if (!l.player?.generated) continue;
        loans += 1;
        if (l.player.value === today.get(l.player.id)?.value) loanRight += 1;
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
  else if (foundersRight !== foundersOnLoad || loans < saves || loanRight !== loans) fail(`${foundersOnLoad - foundersRight} of ${foundersOnLoad} founders in the squad and ${loans - loanRight} of ${loans} out on loan loaded without today's creation value`);
  else ok(`every one of ${foundersOnLoad} founders in ${saves} old saves, and all ${loans} out on loan, loaded carrying today's creation value`);
  if (wagesMoved || othersMoved || reloadMoved) fail(`the load moved ${wagesMoved} wages and ${othersMoved} other things it should not touch, and ${reloadMoved} saves moved again on a second load`);
  else ok('the load moved no wage and nothing but the founders\' value, and a second load moved nothing');
  if (weeksPlayed < played * 30) fail(`only ${weeksPlayed} calendar weeks played across ${played} saves, so the comparison did not cover a season`);
  else if (playedDiff) fail(`${playedDiff} of ${played} repriced saves played season one differently from the old engine`);
  else ok(`all ${played} repriced saves played the rest of season one (${weeksPlayed} calendar weeks in all) exactly as the old engine played them, bar the founders' value`);
  if (movedFounders < 60) fail(`only ${movedFounders} founders in the saves a season on`);
  else if (movedRight !== movedFounders || laterDiff) fail(`a season on, ${movedFounders - movedRight} of ${movedFounders} founders did not move by the ratio of the new creation value to the old, and ${laterDiff} of ${laterPlayed} saves played on differently`);
  else ok(`a season on, all ${movedFounders} founders moved by the ratio of the new creation value to the old, and all ${laterPlayed} saves played the next weeks exactly as the old engine did`);
}

/* ================================================================== */
section = 5;
console.log('5) a created club can spend its budget the way a real club with that budget can');
/* Measured over four seeds in the header. The created club's bill over its
   cap after spending may run to the real clubs' p90 plus the band. */
const CAP_BAND = 0.1;
{
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
     the same way in every league, see realCapForBudget). */
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
            const want = Math.max(Math.max(60, Math.round(cm.wageBill(st) * 1.15)), cm.realCapForBudget(B));
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
    console.log(`   ${tier.padEnd(5)} ${TIERS[tier]}m: created bill / cap after spending p50 ${f2(median(created[tier]))}, p90 ${f2(pct(created[tier], 0.9))} (${created[tier].length}); real clubs of a similar budget p50 ${f2(median(real[tier] ?? []))}, p90 ${f2(pct(real[tier] ?? [], 0.9))} (${(real[tier] ?? []).length})`);
  }
  console.log(`   ${dayOne} created clubs founded, ${dayOneShort} not on max(bill based cap, realCapForBudget); budget spent p50 ${f2(median(spent))}, p10 ${f2(pct(spent, 0.1))}`);
  if (dayOne < 60 || dayOneShort) fail(`${dayOneShort} of ${dayOne} created clubs did not open on the larger of their bill based cap and the cap a real club with their budget has`);
  else ok(`all ${dayOne} created clubs opened on the larger of their bill based cap and the cap a real club with their budget has`);
  if (!(pct(spent, 0.1) >= 0.7)) fail(`the spending only used p10 ${f2(pct(spent, 0.1))} of the budget, so the cap was never really tested`);
  const bad = Object.keys(TIERS).filter(t => !((real[t] ?? []).length >= 6 && pct(created[t], 0.9) <= pct(real[t], 0.9) + CAP_BAND));
  if (bad.length) fail(`after spending its budget a created club runs further over its cap than real clubs of its budget on the ${bad.join(', ')} tier${bad.length === 1 ? '' : 's'} (p90 against the real p90 plus ${CAP_BAND})`);
  else ok(`on every tier a created club that spends its budget sits no further over its cap than real clubs of that budget do (p90 against their p90 plus ${CAP_BAND})`);

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
