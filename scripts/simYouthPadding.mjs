/* Round 632: a youth pad is not a money printer, and a graduate is still an asset.
 *
 * THE DEFECT. makeYouth's kids (the thin club padding on day one, the padding
 * and the summer intake at every rollover, the padding a job move builds)
 * carried no stored value, so sellValue priced them off the raw curve times the
 * 0.4 youth factor. Measured on the engine before the round, every playable
 * club in all four eras: 290 of 330 clubs padded on day one today, 39 of 60 in
 * 2015, 23 of 40 in 2010, 26 of 40 in 2005; the kids sold for a median 7m and
 * up to 16m, bids ran to 21m, a padded club held a median 66m of them (Lommel
 * 141.7m), and listing them in the first window banked about 11m a club in
 * every era, for players who cost nothing. The market's own teenagers of that
 * level (rated 55 to 68) are valued 0.8m to 1.5m.
 *
 * THE RULE (see youthPadValue in src/lib/clubManager.ts): a pad carries, from
 * creation, what a real teenager of his rating and age is worth, 0.03 of the
 * raw curve, 0.3m to 1.3m; a save written before the round gets the same value
 * on load; an academy graduate or a scouted boy keeps no stored value and is
 * priced off the curve as before.
 *
 * SECTIONS, on the real engine bundled with esbuild, every era:
 *   1) no pad can be sold in his first season for more than the rule allows.
 *      Every day one pad at every padded club, plus the kids a rollover makes,
 *      transfer listed; the window opening pass sampled three times and every
 *      bid rejected once to take the improved offer too. The best pad the rule
 *      can make (68, aged 17) is worth 1.3m, sells at 1.2m, and a contested bid
 *      improved after a rejection reaches 1.2 x 1.35 x 1.15 = 1.86m, so the p95
 *      of every offer must sit at or under PAD_BID_BOUND. Never the max.
 *   2) a season one career that lists every pad and takes every bid the squad
 *      rules allow, through the whole summer window, against the same career
 *      (same seed) that sells none. The budget difference is the money the pads
 *      printed. Clubs chosen where the most pads can actually leave (the squad
 *      floor, canLeaveSquad, stops a sale at fifteen). Pooled p90 bounded.
 *   3) an academy graduate who developed keeps his earned value: promoted off a
 *      real intake, three summers of growth, and his price is still the curve's
 *      price for his rating and age, many times what a pad of his level fetches.
 *   4) a save written by the engine as it stood before the round (the in memory
 *      copy with the creation value and the load repair taken out) loads with
 *      the value applied to every pad in the squad, out on loan and in the free
 *      agent list, with every wage, every real player and every graduate left
 *      exactly as saved, and then plays the rest of season one identically to
 *      the same save played by the old engine, bar the pads' value field.
 *
 * MEASURED, default seed and SIM_SEED 1, 2 and 3, each run on its own TEMP.
 *   section 1  p95 of pad offers      fixed 1.30m on all four   novalue 16.9 to 17.1m    bound 2.0m
 *              (about 9,600 offers for about 3,050 pads a run; the p50 is 0.5m, was 6.7m)
 *   section 2  pooled p90 gain        fixed 2.56 to 3.28m       novalue 31.4 to 38.4m    bound 5.0m
 *              (48 paired careers, 127 to 136 sales a run; the median gain is 1.5 to 1.8m)
 *   section 3  grad / curve median    fixed 1.00                flatgrads 0.04 to 0.05   floor 0.95
 *              grad / pad median      fixed 32.0 to 32.5        flatgrads 1.4 to 1.5     floor 8
 *              (83 to 95 graduates promoted a run, every one grew 3 or more points)
 *   section 4  pads valued on load    fixed 106 of 106          noload 0 of 106
 *              seasons played alike   fixed 8 of 8, 0 wages moved
 *
 * CONTROLS (YOUTH_PAD_CONTROL=name). Each edits an in memory copy of the engine
 * after asserting its anchor appears exactly once, and must turn exactly its
 * own sections red:
 *   novalue    makeYouth stores no value at creation          -> sections 1 and 2
 *   noload     loadCareer skips the repair                     -> section 4
 *   flatgrads  promoteProspect prices a graduate like a pad    -> section 3
 *
 * Nothing here reads dist or the clock (Date.now is only in generated ids), so
 * it is safe to run between builds.
 *
 * Run: node scripts/simYouthPadding.mjs
 */
import './lib/seedRandom.mjs';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.YOUTH_PAD_CONTROL || '';
const KNOWN = ['novalue', 'noload', 'flatgrads'];
if (CONTROL && !KNOWN.includes(CONTROL)) {
  console.log(`   FAIL unknown control ${CONTROL} (known: ${KNOWN.join(', ')})`);
  process.exit(1);
}

let checks = 0;
let failures = 0;
const fail = (m) => { checks += 1; failures += 1; console.log(`   FAIL ${m}`); };
const ok = (m) => { checks += 1; console.log(`   ok   ${m}`); };

/* ---------- the engine, pristine and rewritten ---------- */
const PRISTINE = fs.readFileSync(path.join(ROOT, 'src/lib/clubManager.ts'), 'utf8').replaceAll('\r\n', '\n');

const VALUE_LINE = '  kid.value = youthPadValue(kid.rating, kid.age);\n';
const LOAD_LINE = '    ensureYouthPadValues(parsed);\n';
const GRAD_LINE = '    academyGrad: true,\n    potential: pr.potential,';

/* Every rewrite asserts its anchor exactly once, or the run stops: a control
   that matches nothing leaves the harness green for the wrong reason. */
function rewrite(src, anchor, replacement, why) {
  const n = src.split(anchor).length - 1;
  if (n !== 1) {
    console.log(`   FAIL ${why}: anchor appears ${n} times, so the rewrite would not change exactly one thing`);
    console.log(`simYouthPadding: stopped, ${failures + 1} failure`);
    process.exit(1);
  }
  return src.replace(anchor, () => replacement);
}

let live = PRISTINE;
if (CONTROL === 'novalue') live = rewrite(live, VALUE_LINE, '', 'control novalue');
if (CONTROL === 'noload') live = rewrite(live, LOAD_LINE, '', 'control noload');
if (CONTROL === 'flatgrads') {
  live = rewrite(live, GRAD_LINE,
    '    academyGrad: true,\n    value: youthPadValue(pr.rating, pr.age),\n    potential: pr.potential,', 'control flatgrads');
}
if (CONTROL) console.log(`   [control ${CONTROL} applied to an in memory copy of the engine]`);
/* The engine as it stood before Round 632, for the save section 4 loads. */
const pre = rewrite(rewrite(PRISTINE, VALUE_LINE, '', 'pre round engine, creation value'), LOAD_LINE, '', 'pre round engine, load repair');

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'youthpad-'));
async function bundle(source, out) {
  await build({
    stdin: { contents: "export * as cm from '@/lib/clubManager';", resolveDir: ROOT, loader: 'ts' },
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
const req = createRequire(import.meta.url);
const cm = req(path.join(TMP, 'live.cjs')).cm;
const old = req(path.join(TMP, 'pre.cjs')).cm;

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
const m1 = (x) => (Number.isFinite(x) ? `${x.toFixed(2)}m` : String(x));
const clone = (x) => JSON.parse(JSON.stringify(x));
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
const ERAS = ['now', 'era2015', 'era2010', 'era2005'];
const clubsOf = (era) => (era === 'now'
  ? cm.REAL_LEAGUES.flatMap(l => cm.playableClubs(l.id).map(c => c.name))
  : (cm.ERA_LEAGUES[era] ?? []).flatMap(l => cm.eraPlayableClubs(era, l.id).map(c => c.name)));
const pads = (st) => st.squad.filter(p => p.isYouth);
/* What the curve would have priced him at: the same man with no stored value,
   which is exactly the pricing the engine gave every pad before this round. */
const curvePrice = (p) => cm.sellValue({ ...p, value: undefined });
function runWindowOrSeason(engine, st, untilWindowShut) {
  let guard = 0;
  while (guard++ < 160) {
    if (untilWindowShut && st.transferWindow === null) break;
    if (st.week >= st.calendar.length) break;
    const r = engine.playNextEntry(st, { skipHalftime: true });
    st = r.state;
    if (r.kind === 'seasonOver') break;
  }
  return st;
}

console.log(`simYouthPadding: seed base ${SEED_BASE}${CONTROL ? `, control ${CONTROL}` : ''}`);

/* ================================================================== */
console.log('1) no youth pad sells for more than the rule allows in his first season');
const PAD_BID_BOUND = 2.0;
const dayOneByEra = {};
{
  const offers = [];
  const curve = [];
  let kids = 0;
  let wrongValue = 0;
  let clubs = 0;
  const sampleBids = (st, ids, key) => {
    let listed = st;
    for (const id of ids) listed = cm.setTransferStatus(listed, id, 'listed');
    for (let k = 0; k < 3; k++) {
      seeded(`${key}|bids|${k}`, () => {
        const c = clone(listed);
        cm.generateIncomingBids(c);
        for (const b of c.incomingBids ?? []) {
          if (!ids.includes(b.playerId) || b.loan) continue;
          offers.push(b.offer);
          const r = cm.rejectBid(c, b.playerId);
          const imp = (r.incomingBids ?? []).find(x => x.playerId === b.playerId && x.status === 'improved');
          if (imp) offers.push(imp.offer);
        }
      });
    }
  };
  for (const era of ERAS) {
    const list = clubsOf(era);
    const rows = [];
    for (const club of list) {
      const st = seeded(`s1|${era}|${club}`, () => cm.startCareer(club, era));
      const kidsHere = pads(st);
      if (!kidsHere.length) continue;
      clubs += 1;
      kids += kidsHere.length;
      rows.push({ club, st, n: kidsHere.length, sellable: Math.min(kidsHere.length, st.squad.length - 14) });
      for (const p of kidsHere) {
        curve.push(curvePrice(p));
        if (p.value !== cm.youthPadValue(p.rating, p.age)) wrongValue += 1;
      }
      sampleBids(st, kidsHere.map(p => p.id), `s1|${era}|${club}`);
    }
    dayOneByEra[era] = rows;
    /* The kids a rollover makes (the summer intake and the rollover padding,
       both makeYouth), in THEIR first window, at every sixth club. */
    list.filter((_, i) => i % 6 === 0).forEach((club) => {
      seeded(`s1r|${era}|${club}`, () => {
        const st = cm.startCareer(club, era);
        const before = new Set(st.squad.map(p => p.id));
        const next = cm.startNextSeason(st);
        const fresh = next.squad.filter(p => p.isYouth && !before.has(p.id));
        kids += fresh.length;
        for (const p of fresh) {
          curve.push(curvePrice(p));
          if (p.value !== cm.youthPadValue(p.rating, p.age)) wrongValue += 1;
        }
        if (fresh.length) sampleBids(next, fresh.map(p => p.id), `s1r|${era}|${club}`);
      });
    });
  }
  console.log(`   ${kids} pads at ${clubs} padded clubs plus a rollover at every sixth club, ${offers.length} offers`);
  console.log(`   the curve would have sold these same kids at p50 ${m1(median(curve))}, p95 ${m1(pct(curve, 0.95))}`);
  console.log(`   offers now: p50 ${m1(median(offers))}, p90 ${m1(pct(offers, 0.9))}, p95 ${m1(pct(offers, 0.95))}`);
  if (offers.length < 2000) fail(`only ${offers.length} offers for pads, too few to read a p95`);
  else if (!(pct(offers, 0.95) <= PAD_BID_BOUND)) fail(`the p95 offer for a pad is ${m1(pct(offers, 0.95))}, above the ${m1(PAD_BID_BOUND)} the rule allows`);
  else ok(`the p95 offer for a pad is ${m1(pct(offers, 0.95))}, inside the ${m1(PAD_BID_BOUND)} bound (measured 1.30m on four seeds, 16.9m to 17.1m with no stored value)`);
  if (kids < 1000) fail(`only ${kids} pads measured`);
  else if (wrongValue > 0) fail(`${wrongValue} of ${kids} pads were not created carrying youthPadValue for their rating and age`);
  else ok(`all ${kids} pads were created carrying youthPadValue for their rating and age`);
}

/* ================================================================== */
console.log('2) selling every pad in the first window prints no real money');
/* Measured pooled p90 2.56m to 3.28m on four seeds, 31.4m to 38.4m with no
   stored value; 5.0m leaves 1.7m of headroom over the worst seed. */
const GAIN_BOUND = 5.0;
{
  const gains = [];
  let sold = 0;
  let careers = 0;
  for (const era of ERAS) {
    const pickClubs = [...dayOneByEra[era]]
      .sort((a, b) => b.sellable - a.sellable || a.club.localeCompare(b.club))
      .slice(0, 6)
      .map(r => r.club);
    const eraGains = [];
    let eraSold = 0;
    for (const club of pickClubs) {
      for (let s = 0; s < 2; s++) {
        const arm = (sell) => seeded(`s2|${era}|${club}|${s}`, () => {
          let st = cm.startCareer(club, era);
          const ids = new Set(pads(st).map(p => p.id));
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
          return { budget: st.budget, n };
        });
        const a = arm(true);
        const b = arm(false);
        eraGains.push(a.budget - b.budget);
        eraSold += a.n;
        careers += 1;
      }
    }
    gains.push(...eraGains);
    sold += eraSold;
    console.log(`   ${era}: ${pickClubs.join(', ')}; ${eraSold} pads sold, gain over selling none p50 ${m1(median(eraGains))}, p90 ${m1(pct(eraGains, 0.9))}`);
  }
  if (sold < 20) fail(`only ${sold} pads were sold across ${careers} careers, too few to say what selling them pays`);
  else if (!(pct(gains, 0.9) <= GAIN_BOUND)) fail(`selling every pad beats selling none by ${m1(pct(gains, 0.9))} at the p90 of ${careers} careers, above ${m1(GAIN_BOUND)}`);
  else ok(`over ${careers} paired careers and ${sold} sales, selling every pad beats selling none by ${m1(median(gains))} at the median and ${m1(pct(gains, 0.9))} at the p90, inside ${m1(GAIN_BOUND)} (measured p90 2.56m to 3.28m on four seeds, 31.4m to 38.4m with no stored value)`);
}

/* ================================================================== */
console.log('3) an academy graduate who developed keeps the value he earned');
{
  const toCurve = [];
  const toPad = [];
  let promoted = 0;
  let valuedAtPromotion = 0;
  for (const era of ERAS) {
    for (const club of clubsOf(era).slice(0, 4)) {
      for (let s = 0; s < 2; s++) {
        seeded(`s3|${era}|${club}|${s}`, () => {
          let st = cm.startNextSeason(cm.startCareer(club, era));
          const start = new Map();
          for (const pr of (st.academy?.prospects ?? []).filter(x => x.source === 'Academy')) {
            const next = cm.promoteProspect(st, pr.id);
            if (!next) continue;
            st = next;
            const g = st.squad.find(p => p.name === pr.name);
            promoted += 1;
            if (g.value !== undefined) valuedAtPromotion += 1;
            start.set(g.id, g.rating);
          }
          for (let y = 0; y < 3; y++) st = cm.startNextSeason(st);
          for (const g of st.squad.filter(p => p.academyGrad && start.has(p.id))) {
            if (g.rating - start.get(g.id) < 3) continue;
            const padTwin = { ...g, isYouth: true, academyGrad: undefined, value: cm.youthPadValue(g.rating, g.age) };
            toCurve.push(cm.sellValue(g) / curvePrice(g));
            toPad.push(cm.sellValue(g) / cm.sellValue(padTwin));
          }
        });
      }
    }
  }
  console.log(`   ${promoted} graduates promoted, ${toCurve.length} of them grew 3 or more points over three summers`);
  console.log(`   developed graduate's price / the curve's price for him: median ${median(toCurve).toFixed(2)}; / a pad of his rating and age: median ${median(toPad).toFixed(1)}`);
  if (toCurve.length < 20) fail(`only ${toCurve.length} developed graduates, too few to read a median`);
  else {
    if (valuedAtPromotion > 0) fail(`${valuedAtPromotion} of ${promoted} graduates came up carrying a stored value, so the curve no longer prices them`);
    else ok(`none of the ${promoted} graduates carries a stored value, so the curve prices what he becomes`);
    if (!(median(toCurve) >= 0.95)) fail(`a developed graduate sells for ${median(toCurve).toFixed(2)} of the curve's price for him at the median, not the 0.95 he earned (measured 1.00 on four seeds, 0.04 to 0.05 flattened)`);
    else ok(`a developed graduate sells for ${median(toCurve).toFixed(2)} of the curve's price for his rating and age at the median (floor 0.95)`);
    if (!(median(toPad) >= 8)) fail(`a developed graduate fetches only ${median(toPad).toFixed(1)} times a pad of his level at the median, under 8 (measured 32.0 to 32.5 on four seeds, 1.4 to 1.5 flattened)`);
    else ok(`a developed graduate fetches ${median(toPad).toFixed(1)} times a pad of his rating and age at the median (floor 8)`);
  }
}

/* ================================================================== */
console.log('4) a save written before the round loads valued and plays the same season');
{
  const KEY_OF = () => [...store.keys()].find(k => k.startsWith('dukb-club-manager')) ?? 'dukb-club-manager-save';
  let savesChecked = 0;
  let padsOnLoad = 0;
  let padsValued = 0;
  let wageMoved = 0;
  let othersMoved = 0;
  let playedDiff = 0;
  let playedCompared = 0;
  let weeksPlayed = 0;
  const stripPadValue = (st) => {
    const s = clone(st);
    for (const p of s.squad ?? []) if (p.isYouth) delete p.value;
    for (const l of s.loanedOut ?? []) if (l.player?.isYouth) delete l.player.value;
    delete s.incomingBids;
    return s;
  };
  /* Keys sorted, because the two engines build a pad's fields in a different
     order. And the last part of a press question id and an inbox message id
     dropped: those are pressSeq and msgSeq, module counters of what this
     process has generated, so two engine copies with different histories
     number the same question or message differently. Nothing else is
     normalised, and nothing else differs. */
  const canon = (x) => JSON.stringify(x, (k, v) => (v && typeof v === 'object' && !Array.isArray(v)
    ? Object.fromEntries(Object.keys(v).sort().map(key => [key, v[key]])) : v))
    .replace(/"(pq|msg)-(\d+)-(\d+)-\d+"/g, '"$1-$2-$3"');
  for (const era of ERAS) {
    const club = [...dayOneByEra[era]].sort((a, b) => b.n - a.n || a.club.localeCompare(b.club))[0].club;
    for (let s = 0; s < 2; s++) {
      /* The old engine writes the save, two weeks in, the way a player's save
         from before this round really looks. */
      const oldCareer = seeded(`s4|${era}|${club}|${s}`, () => {
        let st = old.startCareer(club, era);
        for (let w = 0; w < 2; w++) st = old.playNextEntry(st, { skipHalftime: true }).state;
        return st;
      });
      if (pads(oldCareer).some(p => p.value !== undefined)) { fail('the old engine copy still stores a value on its pads, so this section proves nothing'); continue; }
      store.clear();
      old.saveCareer(oldCareer);
      const raw = store.get(KEY_OF());
      savesChecked += 1;

      const loaded = cm.loadCareer();
      store.set(KEY_OF(), raw);
      const loadedOld = old.loadCareer();
      if (!loaded || !loadedOld) { fail(`${club} (${era}) did not load at all`); continue; }
      const before = new Map(oldCareer.squad.map(p => [p.id, p]));
      for (const p of loaded.squad) {
        const was = before.get(p.id);
        if (!was) continue;
        if (p.wage !== was.wage) wageMoved += 1;
        if (p.isYouth) {
          padsOnLoad += 1;
          if (p.value === cm.youthPadValue(p.rating, p.age)) padsValued += 1;
        } else if (p.value !== was.value) othersMoved += 1;
      }
      /* Nothing but the pads' value may differ between the two loads. */
      if (canon(stripPadValue(loaded)) !== canon(stripPadValue(loadedOld))) othersMoved += 1;

      /* And the rest of season one plays identically on both engines. */
      const a = seeded(`s4play|${era}|${club}|${s}`, () => runWindowOrSeason(cm, loaded, false));
      const b = seeded(`s4play|${era}|${club}|${s}`, () => runWindowOrSeason(old, loadedOld, false));
      /* Played, not skipped: a comparison of two untouched saves is not one. */
      weeksPlayed += a.week - loaded.week;
      playedCompared += 1;
      if (canon(stripPadValue(a)) !== canon(stripPadValue(b))) {
        playedDiff += 1;
        if (playedDiff === 1) console.log(`   first difference, ${club} (${era}): ${firstDiff(JSON.parse(canon(stripPadValue(a))), JSON.parse(canon(stripPadValue(b))))}`);
      }
    }
  }
  /* Every other place a pad can sit in an old save, on one hand built copy:
     out on loan, waiting in the free agent list, re-signed after his deal ran
     out (no longer flagged a pad, still wearing the suffix), beside a graduate
     who must stay unvalued. */
  const shapes = seeded('s4shapes', () => {
    const most = [...dayOneByEra.now].sort((a, b) => b.n - a.n || a.club.localeCompare(b.club))[0].club;
    const st = old.startCareer(most, 'now');
    const kids = pads(st);
    const onLoan = kids[0];
    const resigned = { ...kids[1], id: 'resigned-pad', isYouth: false };
    delete resigned.value;
    const grad = { ...st.squad.find(p => !p.isYouth), id: 'grad-x', name: 'Grad Example', academyGrad: true };
    delete grad.value;
    const save = {
      ...st,
      squad: [...st.squad.filter(p => p.id !== onLoan.id && p.id !== kids[1].id), resigned, grad],
      loanedOut: [{ player: onLoan, club: 'Elsewhere', fee: 0.1, season: 1 }],
      freeAgents: [...(st.freeAgents ?? []), { name: 'Walked Example (Youth)', position: 'CM', age: 20, rating: 63, since: 1, reason: 'expired', fromMyClub: true }],
    };
    store.clear();
    old.saveCareer(save);
    return cm.loadCareer();
  });
  const loanP = shapes?.loanedOut?.[0]?.player;
  const poolP = shapes?.freeAgents?.find(f => f.name === 'Walked Example (Youth)');
  const resP = shapes?.squad?.find(p => p.id === 'resigned-pad');
  const gradP = shapes?.squad?.find(p => p.id === 'grad-x');
  const shapeProblems = [];
  if (!loanP || loanP.value !== cm.youthPadValue(loanP.rating, loanP.age)) shapeProblems.push('the pad out on loan');
  if (!poolP || poolP.value !== cm.youthPadValue(poolP.rating, poolP.age)) shapeProblems.push('the pad in the free agent list');
  if (!resP || resP.value !== cm.youthPadValue(resP.rating, resP.age)) shapeProblems.push('the re-signed pad');
  if (!gradP || gradP.value !== undefined) shapeProblems.push('the graduate (he must stay unvalued)');

  console.log(`   ${savesChecked} old saves, ${padsOnLoad} pads in them; ${padsValued} valued on load, ${wageMoved} wages moved, ${othersMoved} other changes; ${playedCompared - playedDiff} of ${playedCompared} seasons played identically`);
  if (padsOnLoad < 20) fail(`only ${padsOnLoad} pads in the old saves`);
  else if (padsValued !== padsOnLoad) fail(`${padsOnLoad - padsValued} of ${padsOnLoad} pads in an old save loaded without youthPadValue`);
  else ok(`every one of ${padsOnLoad} pads in ${savesChecked} old saves loaded carrying youthPadValue`);
  if (shapeProblems.length) fail(`an old save loaded wrong for ${shapeProblems.join(', ')}`);
  else ok('an old save also values the pad out on loan, the pad in the free agent list and a re-signed pad, and leaves a graduate unvalued');
  if (wageMoved || othersMoved) fail(`the repair changed ${wageMoved} wages and ${othersMoved} other things it should not touch`);
  else ok('the repair moved no wage and nothing but the pads\' value');
  if (weeksPlayed < playedCompared * 30) fail(`only ${weeksPlayed} calendar weeks played across ${playedCompared} saves, so the comparison did not cover a season`);
  else if (playedDiff) fail(`${playedDiff} of ${playedCompared} repaired saves played season one differently from the old engine`);
  else ok(`all ${playedCompared} repaired saves played the rest of season one (${weeksPlayed} calendar weeks in all) exactly as the old engine played them, bar the pads' value`);
}

fs.rmSync(TMP, { recursive: true, force: true });
console.log(`simYouthPadding: ${checks} checks, ${failures} failure${failures === 1 ? '' : 's'}${CONTROL ? ` (control ${CONTROL})` : ''}`);
process.exit(failures ? 1 : 0);
