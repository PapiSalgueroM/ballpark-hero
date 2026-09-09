/*
 * Round 514 harness: Club Manager start options.
 *
 * His ask, verbatim from docs/TWEAKS-2026-08-28.md: "Start options: display
 * currency, international job offers on or off, negotiation strictness
 * slider." Three settings, and one of them is dangerous.
 *
 * WHY SECTION 6 IS THE REASON THIS FILE EXISTS.
 *
 * Round 506 built the transfer haggle on a measured guarantee: repeating one
 * unchanged lowball runs the seller out of table. It rests on exactly two
 * numbers, the fraction of the gap he concedes each round and the number of
 * counters his patience allows.
 *
 * Round 513 shipped a Negotiation skill tree that raised both, and every gate in
 * that round was green while it did so. Measured afterwards over Round 506's own
 * sweep, repeating 0.76 of the ask went from 0 agreed and 23 out of patience at
 * zero points to 17 agreed and ZERO out of patience at three: from three points,
 * nothing at any multiple anywhere in the sweep ever ran out of patience. One
 * skill point had switched the mechanic off, and the harness that owned that
 * mechanic could not see it because it runs a fresh career and a fresh career
 * has no points.
 *
 * A "negotiation strictness slider" is the same defect waiting to happen, with a
 * dial the player controls directly. So the engine is arranged so leniency
 * CANNOT touch patience (it buys a smaller opening ask instead, which is priced
 * as a fraction of the ask and therefore moves the target with it), and this
 * harness runs the lowball sweep at ALL FIVE settings rather than trusting that
 * sentence. START_CONTROL=addpatience reproduces the Round 513 defect exactly
 * and section 6 must go red on it.
 *
 * Sections:
 *  1. Neutral at the defaults, and a missing or mangled block reads as them.
 *  2. The block fails closed on shape.
 *  3. Currency is DISPLAY ONLY: the symbol changes and no digit does.
 *  4. International jobs off means the country never calls, measured.
 *  5. Strictness moves the ask, and never adds a round at the table.
 *  6. Round 506's lowball guarantee holds at EVERY setting.
 *  7. Strict is hard, not impossible: a fair offer still closes at the top.
 *
 * Controls (house rule: prove the checks can fail, and prove the rewrite landed):
 *   START_CONTROL=notneutral   askPremiumScale stops being 1 at the default.
 *   START_CONTROL=addpatience  leniency ADDS a round, the Round 513 defect.
 *   START_CONTROL=jobsalwayson the off switch stops being read.
 *
 * Run: node scripts/simClubManagerStart.mjs
 */
import { execSync } from 'node:child_process';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROOT_URL = ROOT.replaceAll('\\', '/');
const TMP = os.tmpdir().replaceAll('\\', '/');
const ENTRY = `${TMP}/cmStart.entry.mjs`;
const BUNDLE = `${TMP}/cmStart.bundle.mjs`;
const START_PATH = `${ROOT}/src/lib/clubManagerStart.ts`;

const CONTROL = process.env.START_CONTROL || '';
const KNOWN = ['notneutral', 'addpatience', 'jobsalwayson'];
if (CONTROL && !KNOWN.includes(CONTROL)) {
  console.error(`START_CONTROL=${CONTROL} is not a control this harness knows (${KNOWN.join(', ')})`);
  process.exit(1);
}

/* The engine imports '@/lib/clubManagerStart' by name, so a control has to be
   aliased onto the ENGINE bundle: rewriting a copy of the source would leave
   the engine reading the real module and prove nothing. Same mechanism
   simManagerXp's deadgate uses. */
let alias = '';
if (CONTROL) {
  let src = fs.readFileSync(START_PATH, 'utf8').replaceAll('\r\n', '\n');
  const swap = (from, to) => {
    if (!src.includes(from)) {
      console.error(`control cannot run: clubManagerStart.ts is not in the shape START_CONTROL=${CONTROL} rewrites`);
      console.error(`  looked for: ${from}`);
      process.exit(1);
    }
    src = src.replace(from, to);
  };
  if (CONTROL === 'notneutral') {
    swap('  const table: Record<number, number> = { 1: 0.5, 2: 0.75, 3: 1, 4: 1.35, 5: 1.7 };',
         '  const table: Record<number, number> = { 1: 0.5, 2: 0.75, 3: 1.2, 4: 1.35, 5: 1.7 };');
  } else if (CONTROL === 'addpatience') {
    /* The Round 513 defect, restored: leniency buys rounds at the table. */
    swap('  const table: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: -1, 5: -1 };',
         '  const table: Record<number, number> = { 1: 2, 2: 1, 3: 0, 4: -1, 5: -1 };');
    swap('  return d > 0 ? 0 : d;', '  return d;');
  } else if (CONTROL === 'jobsalwayson') {
    swap('  return startOptionsOf(state).nationJobs;', '  return true;');
  }
  const copy = `${TMP}/cmStart.control.ts`;
  fs.writeFileSync(copy, src);
  alias = ` "--alias:@/lib/clubManagerStart=${copy.replaceAll('\\', '/')}"`;
}

fs.writeFileSync(ENTRY, `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
export const engine = await import('${ROOT_URL}/src/lib/clubManager.ts');
export const start = await import('${(CONTROL ? `${TMP}/cmStart.control.ts` : START_PATH).replaceAll('\\', '/')}');
`);
execSync(
  `"${ROOT}/node_modules/.bin/esbuild" "${ENTRY}" --bundle --format=esm --platform=node --outfile="${BUNDLE}" --log-level=error${alias} --alias:@=${ROOT_URL}/src`,
  { stdio: 'inherit' },
);

const mod = await import(pathToFileURL(BUNDLE).href);
const { startCareer, buildMarket, startNegotiation, makeOffer, money, nationOfferFor } = mod.engine;
const {
  CURRENCY_CODES, CURRENCIES, STRICTNESS_MIN, STRICTNESS_MAX, STRICTNESS_DEFAULT,
  defaultStartOptions, isValidStartOptions, startOptionsOf, ensureStartOptions, setStartOption,
  askPremiumScale, patienceDelta, nationJobsOn, currencySymbol,
} = mod.start;

for (const [name, fn] of Object.entries({
  startCareer, buildMarket, startNegotiation, makeOffer, money, nationOfferFor,
  defaultStartOptions, isValidStartOptions, startOptionsOf, ensureStartOptions, setStartOption,
  askPremiumScale, patienceDelta, nationJobsOn, currencySymbol,
})) {
  if (typeof fn !== 'function') {
    console.error(`the harness could not reach ${name}; the bundle is not the shape it expects`);
    process.exit(1);
  }
}

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };
const withOpts = o => ({ startOptions: { ...defaultStartOptions(), ...o } });

/* ---------- 1. Neutral at the defaults ---------- */
console.log('1) The defaults are the game exactly as it played');
{
  const fresh = { startOptions: defaultStartOptions() };
  const absent = {};
  let checked = 0;
  for (const [label, state] of [['a fresh block', fresh], ['no block at all', absent]]) {
    checked += 1;
    if (askPremiumScale(state) !== 1) fail(`askPremiumScale is ${askPremiumScale(state)} with ${label}, not 1`);
    if (patienceDelta(state) !== 0) fail(`patienceDelta is ${patienceDelta(state)} with ${label}, not 0`);
    if (nationJobsOn(state) !== true) fail(`nationJobsOn is false with ${label}; the international job shipped on`);
    if (currencySymbol(state) !== '£') fail(`currencySymbol is ${currencySymbol(state)} with ${label}, not a pound`);
  }
  /* And a garbage block, because that is what a corrupted save reads as and it
     must not quietly hand anybody a different game. */
  for (const junk of ['garbage', 42, null, [], { v: 99 }, { v: 1, currency: 'XXX', nationJobs: true, strictness: 3 }]) {
    checked += 1;
    const st = { startOptions: junk };
    if (askPremiumScale(st) !== 1 || patienceDelta(st) !== 0 || nationJobsOn(st) !== true || currencySymbol(st) !== '£') {
      fail(`a junk block (${JSON.stringify(junk)}) did not read as the defaults`);
    }
  }
  console.log(`   ${checked} states checked, all reading as the shipped game`);
  if (checked < 8) fail(`only ${checked} states were checked, so this section proved little`);
}

/* ---------- 2. The block fails closed ---------- */
console.log('2) A mangled block reads as a fresh one rather than poisoning the save');
{
  const bad = ['x', 7, null, undefined, [], {}, { v: 2 }, { v: 1, currency: 'GBP', nationJobs: 'yes', strictness: 3 },
    { v: 1, currency: 'GBP', nationJobs: true, strictness: 0 }, { v: 1, currency: 'GBP', nationJobs: true, strictness: 6 },
    { v: 1, currency: 'ZZZ', nationJobs: true, strictness: 3 }];
  let refused = 0;
  for (const b of bad) if (!isValidStartOptions(b)) refused += 1;
  if (refused !== bad.length) fail(`${bad.length - refused} malformed blocks were accepted as valid`);
  if (!isValidStartOptions(defaultStartOptions())) fail('the default block does not validate');
  /* Idempotent, because every ensure here runs at least twice on a normal load. */
  const st = { startOptions: 'rubbish' };
  const once = JSON.stringify(ensureStartOptions(st));
  const twice = JSON.stringify(ensureStartOptions(st));
  if (once !== twice) fail(`ensureStartOptions is not idempotent: ${once} then ${twice}`);
  console.log(`   ${refused} of ${bad.length} malformed blocks refused, a good one accepted, the repair is idempotent`);
}

/* ---------- 3. Currency is display only ---------- */
console.log('3) The currency changes the symbol and not one digit');
{
  const amounts = [0, 0.4, 0.6, 1, 12.5, 180, 999.9, 1000, 2400];
  let compared = 0;
  const digitsOf = s => String(s).replace(/^[^0-9]*/, '');
  for (const code of CURRENCY_CODES) {
    const st = withOpts({ currency: code });
    for (const n of amounts) {
      compared += 1;
      const base = money(n);
      const here = money(n, st);
      if (digitsOf(base) !== digitsOf(here)) {
        fail(`money(${n}) reads ${base} in pounds and ${here} in ${code}: the number changed, not just the symbol`);
      }
      if (!here.startsWith(CURRENCIES[code].symbol)) {
        fail(`money(${n}) in ${code} is ${here}, which does not start with ${CURRENCIES[code].symbol}`);
      }
    }
  }
  console.log(`   ${compared} amounts across ${CURRENCY_CODES.length} currencies, symbol differs and digits never do`);
  if (compared < amounts.length * CURRENCY_CODES.length) fail('the currency sweep did not cover every pair');
  /* The engine must not read it. A career differing ONLY in currency has to
     produce a byte identical opening negotiation. */
  const seeded = seed => { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  const withSeed = (seed, fn) => { const s = Math.random; Math.random = seeded(seed); try { return fn(); } finally { Math.random = s; } };
  const asks = CURRENCY_CODES.map(code => withSeed(99, () => {
    const c = startCareer('Arsenal');
    c.startOptions = { ...defaultStartOptions(), currency: code };
    const mkt = buildMarket(c).filter(m => m.price <= c.budget);
    if (!mkt.length) return null;
    const opened = startNegotiation(c, mkt[0]);
    return opened && opened.negotiation ? opened.negotiation.theirAsk : null;
  }));
  const real = asks.filter(a => a !== null);
  if (real.length < 2) fail('the currency sweep could not open two negotiations, so the engine check proved nothing');
  if (new Set(real).size !== 1) fail(`the seller's ask differs by currency (${real.join(', ')}), so the display setting is reaching the engine`);
  console.log(`   the opening ask is ${real[0]} under every currency, so the engine never reads it`);
}

/* ---------- 4. International jobs off ---------- */
console.log('4) Turned off, the country never calls');
{
  const CLUBS = ['Real Madrid', 'Arsenal', 'Bayern Munich', 'Barcelona', 'Liverpool', 'Man City'];
  let onOffers = 0, offOffers = 0, tested = 0;
  for (const club of CLUBS) {
    for (const standing of [70, 80, 90, 100]) {
      const base = startCareer(club);
      base.careerStats = { ...base.careerStats, wins: 400, played: 500, losses: 40 };
      base.trophies = Array.from({ length: 12 }, (_, i) => ({ name: 'League', emoji: '\u{1F3C6}', season: i + 1 }));
      base.boardConfidence = standing;
      const on = { ...JSON.parse(JSON.stringify(base)), startOptions: { ...defaultStartOptions(), nationJobs: true } };
      const off = { ...JSON.parse(JSON.stringify(base)), startOptions: { ...defaultStartOptions(), nationJobs: false } };
      tested += 1;
      if (nationOfferFor(on)) onOffers += 1;
      if (nationOfferFor(off)) offOffers += 1;
    }
  }
  console.log(`   ${tested} strong careers: ${onOffers} got an offer with the setting on, ${offOffers} with it off`);
  if (tested < 12) fail(`only ${tested} careers were tried, too few to conclude anything`);
  if (offOffers !== 0) fail(`${offOffers} careers were offered a national team with international jobs turned OFF`);
  if (onOffers === 0) fail('not one career was offered a national team even with the setting ON, so the off case proves nothing');
}

/* ---------- 5. Strictness moves the ask and never the table ---------- */
console.log('5) Strictness moves what he asks for, and never how long he will sit there');
{
  const scales = [];
  for (let n = STRICTNESS_MIN; n <= STRICTNESS_MAX; n++) {
    const st = withOpts({ strictness: n });
    scales.push({ n, scale: askPremiumScale(st), pat: patienceDelta(st) });
  }
  console.log('   ' + scales.map(s => `${s.n}:ask x${s.scale} patience ${s.pat >= 0 ? '+' : ''}${s.pat}`).join('  '));
  /* THE SAFETY PROPERTY, and it is the whole reason the file is shaped this
     way: no setting may ever ADD a round. */
  for (const s of scales) {
    if (s.pat > 0) fail(`strictness ${s.n} adds ${s.pat} rounds at the table, which is exactly how Round 513 deleted Round 506's guarantee`);
  }
  /* Monotone, so the slider means something in the direction it is labelled. */
  for (let i = 1; i < scales.length; i++) {
    if (!(scales[i].scale > scales[i - 1].scale)) {
      fail(`strictness ${scales[i].n} asks x${scales[i].scale}, not more than ${scales[i - 1].n} at x${scales[i - 1].scale}`);
    }
  }
  const mid = scales.find(s => s.n === STRICTNESS_DEFAULT);
  if (!mid || mid.scale !== 1 || mid.pat !== 0) fail('the middle notch is not the identity, so the default is not the shipped game');
  /* And every notch must actually differ, or a slider position buys nothing. */
  if (new Set(scales.map(s => s.scale)).size !== scales.length) {
    fail('two strictness settings ask for the same thing, so one of them is a decoration');
  }
  console.log(`   ${scales.length} settings, all distinct, none adds a round, the middle is the identity`);
}

/* ---------- 6. Round 506's guarantee, at every setting ---------- */
console.log('6) Repeating a lowball runs the seller out of table at EVERY setting');
{
  const LOWBALL = 0.76;
  const RUNS = 24;
  const CLUBS = ['Aston Villa', 'Napoli', 'Sevilla', 'Ajax'];
  const rows = [];
  for (let n = STRICTNESS_MIN; n <= STRICTNESS_MAX; n++) {
    let agreed = 0, ranOut = 0, hijacked = 0, stuck = 0, opened = 0;
    for (let i = 0; i < RUNS; i++) {
      const c = startCareer(CLUBS[i % CLUBS.length]);
      c.startOptions = { ...defaultStartOptions(), strictness: n };
      const mkt = buildMarket(c);
      const top = Math.min(45, Math.max(1, c.budget * 0.8));
      const bottom = Math.min(12, Math.max(0.5, top * 0.4));
      const target = mkt.find(m => m.price >= bottom && m.price <= top && !m.generated);
      if (!target) continue;
      let s = startNegotiation(c, target);
      if (!s || !s.negotiation) continue;
      opened += 1;
      const bid = s.negotiation.theirAsk * LOWBALL;
      let k = 0;
      while (s.negotiation && s.negotiation.status === 'open' && s.negotiation.phase !== 'terms') {
        if (++k > 30) { stuck += 1; break; }
        const nx = makeOffer(s, bid);
        if (!nx) break;
        s = nx;
      }
      const neg = s.negotiation;
      if (neg && neg.phase === 'terms') agreed += 1;
      else if (neg && neg.status === 'collapsed') ranOut += 1;
      else if (neg && neg.status === 'hijacked') hijacked += 1;
    }
    rows.push({ n, agreed, ranOut, hijacked, stuck, opened });
    console.log(`   strictness ${n}: ${agreed} agreed, ${ranOut} ran out, ${hijacked} hijacked, of ${opened} opened`);
  }
  for (const r of rows) {
    if (r.opened < RUNS * 0.5) fail(`strictness ${r.n} only opened ${r.opened} of ${RUNS} deals, so its row measured almost nothing`);
    if (r.stuck) fail(`strictness ${r.n} left ${r.stuck} negotiations unresolved in 30 rounds`);
    /* The floor is 3 rather than something tighter because this runs 24 deals a
       row and a chunk of them are hijacked by a rival before patience can bind.
       Measured on correct code every row ran out several times over; the broken
       shape is a flat ZERO, which is what Round 513 produced and what this
       separates cleanly. */
    if (!(r.ranOut >= 3)) {
      fail(`at strictness ${r.n} a repeated ${LOWBALL} lowball ran the seller out of patience only ${r.ranOut} times of ${r.opened} (floor 3). A setting has switched off the mechanic Round 506 built.`);
    }
    if (r.agreed > 6) {
      fail(`at strictness ${r.n} a repeated ${LOWBALL} lowball landed ${r.agreed} times of ${r.opened} (ceiling 6), which is the free lunch Round 506 removed`);
    }
  }
}

/* ---------- 7. Strict is hard, not impossible ---------- */
console.log('7) Even at the top setting a fair offer still closes');
{
  const RUNS = 24;
  const CLUBS = ['Aston Villa', 'Napoli', 'Sevilla', 'Ajax'];
  let agreed = 0, opened = 0;
  for (let i = 0; i < RUNS; i++) {
    const c = startCareer(CLUBS[i % CLUBS.length]);
    c.startOptions = { ...defaultStartOptions(), strictness: STRICTNESS_MAX };
    const mkt = buildMarket(c);
    const top = Math.min(45, Math.max(1, c.budget * 0.8));
    const bottom = Math.min(12, Math.max(0.5, top * 0.4));
    const target = mkt.find(m => m.price >= bottom && m.price <= top && !m.generated);
    if (!target) continue;
    let s = startNegotiation(c, target);
    if (!s || !s.negotiation) continue;
    opened += 1;
    /* Paying the ask outright, which must always be able to close: a setting
       that makes the game unwinnable is a bug, not a difficulty. */
    const bid = s.negotiation.theirAsk;
    let k = 0;
    while (s.negotiation && s.negotiation.status === 'open' && s.negotiation.phase !== 'terms') {
      if (++k > 30) break;
      const nx = makeOffer(s, bid);
      if (!nx) break;
      s = nx;
    }
    if (s.negotiation && s.negotiation.phase === 'terms') agreed += 1;
  }
  console.log(`   at strictness ${STRICTNESS_MAX}, paying the ask closed ${agreed} of ${opened} deals`);
  if (opened < RUNS * 0.5) fail(`only ${opened} of ${RUNS} deals opened, so section 7 measured almost nothing`);
  if (!(agreed >= Math.floor(opened * 0.5))) {
    fail(`paying the full ask closed only ${agreed} of ${opened} at the strictest setting, so strict has become impossible rather than hard`);
  }
}

if (CONTROL) {
  console.log(`\nNEGATIVE CONTROL ${CONTROL} was on; ${failures} finding(s). A control run is expected to be red.`);
  process.exitCode = failures > 0 ? 0 : 1;
} else if (failures) {
  console.error(`\nsimClubManagerStart: ${failures} FAILURES`);
  process.exitCode = 1;
} else {
  console.log('\nsimClubManagerStart: green. The defaults are the shipped game, the currency never reaches the engine, and no setting can switch off the haggle.');
}
