/**
 * Round 207 harness: the extension talk, in all four US career games.
 *
 * What the round shipped: the decision that comes BEFORE free agency. In
 * the final year of a deal your club can put an extension on the table.
 * Sign it and you are set at a number usually a little under market. Play
 * the year out and you reach the open market, which pays better on average
 * and can go badly wrong.
 *
 * A fork is only a fork if both sides really cost something, so what this
 * file mostly does is MEASURE the two sides rather than assert that they
 * exist. Specifically:
 *
 *  1. Shape. Every talk is answerable: an offer with real numbers and a
 *     line, or an honest refusal, never a blank card or a token deal.
 *  2. Who gets offered. A young star is always offered one. A 36 year old
 *     at 71 is not, and the screen says so rather than inventing something.
 *  3. The money. The offer sits BELOW the open market on average, which is
 *     the entire point: certainty has a price. Measured, not assumed.
 *  4. The push. One only. With leverage they improve; without it they can
 *     pull the offer entirely, which is the risk that makes the safe option
 *     stop being safe. Both directions measured, and the fail-closed rule
 *     checked: a pulled offer never leaves a career with no path, because
 *     free agency is guaranteed when the deal hits zero.
 *  5. Length. Nobody gets five years two seasons from the cliff.
 *  6. The four boards actually use it, on the final year and before the
 *     free agency gate, and a signed extension really does move the
 *     contract on so the same season cannot ask twice.
 *
 * Run: node scripts/simExtension.mjs
 */
/* Round 299: seeded stream, see scripts/lib/seedRandom.mjs. First import on purpose. */
import './lib/seedRandom.mjs';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ENTRY = '/tmp/extEntry.mjs';
const BUNDLE = '/tmp/ext.bundle.mjs';

fs.writeFileSync(ENTRY, `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const ext = await import('${ROOT}/src/lib/usCareerExtension.ts');
const nfl = await import('${ROOT}/src/lib/nflMyCareer.ts');
const mlb = await import('${ROOT}/src/lib/mlbMyCareer.ts');
const nba = await import('${ROOT}/src/lib/nbaMyCareer.ts');
const nhl = await import('${ROOT}/src/lib/nhlMyCareer.ts');
export { ext, nfl, mlb, nba, nhl };
`);
execSync(`${ROOT}/node_modules/.bin/esbuild ${ENTRY} --bundle --format=esm --platform=node --outfile=${BUNDLE} --log-level=error`, { stdio: 'inherit' });

const { ext, nfl, mlb, nba, nhl } = await import(BUNDLE);
const { buildExtension, pushExtension, extensionLeverage, extensionDue, extensionHeadline } = ext;

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };

/** A build request. Everything a sport wrapper feeds the engine. */
const args = (over = {}) => ({
  sport: 'nfl',
  team: 'KC',
  label: 'Kansas City',
  market: 20,
  minSalary: 0.4,
  ovr: 84,
  age: 26,
  accolades: 2,
  cliffAge: 31,
  rng: Math.random,
  ...over,
});

/* ---------------------------------------------------------------- 1. shape */
console.log('1) Every talk is answerable');
{
  const states = [
    ['a young star', args({ ovr: 92, age: 24, accolades: 4 })],
    ['a solid starter', args({ ovr: 80, age: 27, accolades: 1 })],
    ['a squad man', args({ ovr: 72, age: 28, accolades: 0 })],
    ['a fading veteran', args({ ovr: 71, age: 36, accolades: 0 })],
    ['a great one, late', args({ ovr: 90, age: 35, accolades: 8 })],
    ['a rookie on a thin market', args({ ovr: 68, age: 22, accolades: 0, market: 0.6 })],
    ['a huge market', args({ ovr: 95, age: 25, accolades: 6, market: 55 })],
  ];
  for (const [label, a] of states) {
    for (let i = 0; i < 40; i += 1) {
      const t = buildExtension(a);
      if (typeof t.note !== 'string' || t.note.trim().length === 0) fail(`${label}: a talk with no header line`);
      if (t.pushed || t.pulled) fail(`${label}: a fresh talk is already spent`);
      if (t.market <= 0) fail(`${label}: the market number came out ${t.market}`);
      if (!t.offer) continue;
      const o = t.offer;
      if (!(o.salary > 0) || !Number.isFinite(o.salary)) fail(`${label}: salary came out ${o.salary}`);
      if (o.salary < a.minSalary) fail(`${label}: $${o.salary}M is under the sport's floor of $${a.minSalary}M`);
      if (!(o.years >= 1 && o.years <= 5)) fail(`${label}: ${o.years} year offer`);
      if (!o.line || !o.line.trim()) fail(`${label}: an offer with nothing said about it`);
      if (!['eager', 'fair', 'reluctant'].includes(o.mood)) fail(`${label}: mood came out ${o.mood}`);
      const head = extensionHeadline(t);
      if (!head || /undefined|NaN/.test(head)) fail(`${label}: the headline reads "${head}"`);
    }
  }
  console.log(`   ${states.length} career shapes x 40 rolls, every talk answerable`);
}

/* ------------------------------------------------------- 2. who gets offered */
console.log('2) They offer when they want you, and say so when they do not');
{
  const rate = a => {
    let offered = 0;
    for (let i = 0; i < 400; i += 1) if (buildExtension(a).offer) offered += 1;
    return offered / 400;
  };
  const star = rate(args({ ovr: 93, age: 25, accolades: 5 }));
  if (star < 0.99) fail(`a 93 rated 25 year old is only offered an extension ${(star * 100).toFixed(0)}% of the time`);
  const done = rate(args({ ovr: 71, age: 36, accolades: 0, cliffAge: 30 }));
  if (done > 0.01) fail(`a 36 year old at 71 is still being offered one ${(done * 100).toFixed(0)}% of the time`);
  /* And the refusal is a real screen, not an empty one. */
  const t = buildExtension(args({ ovr: 71, age: 36, accolades: 0, cliffAge: 30 }));
  if (t.offer) fail('the fading veteran control produced an offer');
  if (!/letting your deal run out/.test(t.note)) fail(`the refusal does not explain itself: "${t.note}"`);
  const mid = rate(args({ ovr: 78, age: 30, accolades: 1, cliffAge: 31 }));
  if (mid < 0.5) fail(`a 78 rated 30 year old is offered one only ${(mid * 100).toFixed(0)}% of the time, which reads as never`);
  console.log(`   star ${(star * 100).toFixed(0)}%, honest starter ${(mid * 100).toFixed(0)}%, faded veteran ${(done * 100).toFixed(0)}%`);
}

/* ---------------------------------------------------------------- 3. money */
console.log('3) Certainty has a price: the offer sits under the market');
{
  const sample = [];
  for (const a of [args({ ovr: 92, age: 25, accolades: 4 }), args({ ovr: 82, age: 27 }), args({ ovr: 75, age: 29, accolades: 0 })]) {
    for (let i = 0; i < 300; i += 1) {
      const t = buildExtension(a);
      if (t.offer) sample.push(t.offer.salary / t.market);
    }
  }
  const mean = sample.reduce((s, x) => s + x, 0) / sample.length;
  const over = sample.filter(x => x > 1.05).length / sample.length;
  /* Measured while building the round: the mean lands near 0.88 of market
     and almost nothing clears 105 percent. If a rebalance moves the mean
     above market the fork stops being a fork, because signing would just be
     free money. */
  if (mean >= 0.99) fail(`extensions average ${(mean * 100).toFixed(0)}% of market, so signing is strictly better than the market`);
  if (mean < 0.70) fail(`extensions average ${(mean * 100).toFixed(0)}% of market, so nobody would ever sign one`);
  if (over > 0.05) fail(`${(over * 100).toFixed(0)}% of offers beat the market by more than 5%`);
  console.log(`   ${sample.length} offers, averaging ${(mean * 100).toFixed(0)}% of what the open market pays`);
}

/* ----------------------------------------------------------------- 4. push */
console.log('4) One push, and it can cost you the offer');
{
  /* With leverage: they find money, and the push is spent either way. */
  let improved = 0, held = 0, pulled = 0, rounds = 0;
  for (let i = 0; i < 500; i += 1) {
    const a = args({ ovr: 92, age: 25, accolades: 4 });
    const t = buildExtension(a);
    if (!t.offer) continue;
    rounds += 1;
    const after = pushExtension(t, { ovr: a.ovr, age: a.age, accolades: a.accolades, cliffAge: a.cliffAge, rng: Math.random });
    if (!after.pushed) fail('a push did not spend the one negotiation');
    if (after.pulled) pulled += 1;
    else if (after.offer.salary > t.offer.salary) improved += 1;
    else held += 1;
    /* And the second push does nothing at all. */
    const twice = pushExtension(after, { ovr: a.ovr, age: a.age, accolades: a.accolades, cliffAge: a.cliffAge, rng: Math.random });
    if (JSON.stringify(twice) !== JSON.stringify(after)) fail('a second push moved the offer');
  }
  if (improved / rounds < 0.9) fail(`a 92 rated star only improves his offer ${((improved / rounds) * 100).toFixed(0)}% of the time`);
  if (pulled > 0) fail(`a 92 rated star had ${pulled} offers pulled, which should never happen`);

  /* Without leverage: they can walk, and that is the whole risk. */
  let lowPulled = 0, lowRounds = 0;
  for (let i = 0; i < 800; i += 1) {
    /* Leverage in the 0.18 to 0.35 band: good enough to be offered
       something, not good enough to lean on anybody. A 74 rated player is
       not offered an extension AT ALL (checked in section 2), so the risk
       arm has to be a man who gets an offer and cannot defend it. */
    const a = args({ ovr: 79, age: 30, accolades: 0, cliffAge: 31 });
    const t = buildExtension(a);
    if (!t.offer) continue;
    lowRounds += 1;
    const after = pushExtension(t, { ovr: a.ovr, age: a.age, accolades: a.accolades, cliffAge: a.cliffAge, rng: Math.random });
    if (after.pulled) {
      lowPulled += 1;
      if (after.offer) fail('a pulled offer is still on the table');
      if (!/pulled the offer/.test(after.note)) fail(`a pulled offer does not say so: "${after.note}"`);
      if (extensionHeadline(after) !== 'The offer is gone. Free agency it is.') {
        fail(`a pulled offer's headline reads "${extensionHeadline(after)}"`);
      }
    }
  }
  const pullRate = lowRounds ? lowPulled / lowRounds : 0;
  if (lowRounds < 50) fail(`only ${lowRounds} low leverage offers in 800 rolls, the risk arm never ran`);
  if (pullRate < 0.05) fail(`a marginal player never loses his offer (${(pullRate * 100).toFixed(1)}%), so pushing is free`);
  if (pullRate > 0.45) fail(`a marginal player loses his offer ${(pullRate * 100).toFixed(0)}% of the time, which is not a push, it is a trap`);
  console.log(`   star: ${((improved / rounds) * 100).toFixed(0)}% improved, ${held} held, 0 pulled; marginal: ${(pullRate * 100).toFixed(0)}% pulled`);
}

/* --------------------------------------------------------------- 5. length */
console.log('5) Nobody gets five years two seasons from the cliff');
{
  let worstLate = 0, bestEarly = 0, n = 0;
  for (let i = 0; i < 400; i += 1) {
    const late = buildExtension(args({ ovr: 88, age: 32, accolades: 3, cliffAge: 31 }));
    if (late.offer) { worstLate = Math.max(worstLate, late.offer.years); n += 1; }
    const early = buildExtension(args({ ovr: 88, age: 23, accolades: 1, cliffAge: 31 }));
    if (early.offer) bestEarly = Math.max(bestEarly, early.offer.years);
  }
  if (n === 0) fail('the late career arm never produced an offer, the length check never ran');
  if (worstLate > 3) fail(`a player past his cliff was offered ${worstLate} years`);
  if (bestEarly < 4) fail(`a 23 year old never gets more than ${bestEarly} years`);
  console.log(`   past the cliff, at most ${worstLate} years; eight years clear of it, up to ${bestEarly}`);
}

/* ------------------------------------------------- 6. the four sports use it */
console.log('6) All four games open the talk on the final year, before free agency');
{
  if (extensionDue({ contractYears: 1 }) !== true) fail('a final year does not count as due');
  if (extensionDue({ contractYears: 2 }) !== false) fail('a deal with two years left is being treated as final');
  if (extensionDue({ contractYears: 0 }) !== false) fail('an expired deal is being offered an extension instead of free agency');
  if (extensionDue({ contractYears: 1, retired: true }) !== false) fail('a retired player is being offered an extension');

  /* The sport wrappers exist and feed the engine their own economies. */
  const WRAPPERS = [
    ['nfl', nfl, 'buildNflExtension', 'nflExtPushArgs'],
    ['mlb', mlb, 'buildMlbExtension', 'mlbExtPushArgs'],
    ['nba', nba, 'buildNbaExtension', 'nbaExtPushArgs'],
    ['nhl', nhl, 'buildNhlExtension', 'nhlExtPushArgs'],
  ];
  for (const [sport, mod, build, push] of WRAPPERS) {
    if (typeof mod[build] !== 'function') { fail(`${sport} has no ${build}`); continue; }
    if (typeof mod[push] !== 'function') fail(`${sport} has no ${push}`);
  }

  /* And the boards call it in the right place: on the final year, ahead of
     the free agency gate, with a signed deal moving the contract on. */
  const BOARDS = [
    ['src/components/nfl-my-career/NflMyCareerBoard.tsx', 'buildNflExtension'],
    ['src/components/mlb-my-career/MlbMyCareerBoard.tsx', 'buildMlbExtension'],
    ['src/components/nba-my-career/NbaMyCareerBoard.tsx', 'buildNbaExtension'],
    ['src/components/nhl-my-career/NhlMyCareerBoard.tsx', 'buildNhlExtension'],
  ];
  for (const [rel, build] of BOARDS) {
    const t = fs.readFileSync(path.join(ROOT, rel), 'utf-8');
    if (!t.includes(build)) { fail(`${rel}: never builds an extension`); continue; }
    if (!t.includes('<ExtensionCard')) fail(`${rel}: never renders the card`);
    if (!t.includes('extensionDue(c)')) fail(`${rel}: does not gate on the final year`);
    /* Order matters: an expired deal must reach free agency, so the
       extension gate has to sit ABOVE the contractYears <= 0 check. */
    const gate = t.indexOf('extensionDue(c)');
    const fa = t.indexOf('if (c.contractYears <= 0)');
    if (gate < 0 || fa < 0 || gate > fa) fail(`${rel}: the extension gate is not above the free agency gate`);
    /* Signing writes the year being played plus the new years. */
    if (!/c\.contractYears = 1 \+ o\.years;/.test(t)) fail(`${rel}: signing does not extend the contract correctly`);
    if (!/c\.salary = o\.salary;/.test(t)) fail(`${rel}: signing does not change the money`);
    /* Turning it down must not ask again in the same season. */
    if (!t.includes('extDeclinedRef.current = true;')) fail(`${rel}: turning it down would ask again`);
  }
  console.log('   4 engines, 4 wrappers, 4 boards, gate above free agency in all of them');
}

console.log('');
if (failures > 0) {
  console.error(`simExtension: ${failures} failure${failures === 1 ? '' : 's'}`);
  process.exit(1);
}
console.log('simExtension: green. The last year of a deal is a decision in all four games now.');
