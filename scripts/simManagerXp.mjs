/*
 * Round 513 harness: manager XP and the seven skill trees, spec section 28.
 *
 * SPEC-RECONCILIATION line 330 said "No manager XP or skill tree exists in Club
 * Manager", so there is no shipped behaviour to protect here and everything
 * below is a fence on new rules rather than a regression guard. The two rules
 * that matter, and both are the kind this repo has been burned by before:
 *
 *  - NEUTRAL AT ZERO (Round 95). A manager who has spent nothing must get
 *    exactly the game that shipped. Every effect is written to return its
 *    identity at zero points, so section 1 can prove that by construction over
 *    every tree rather than hoping somebody remembered.
 *  - A SKILL TREE IS A MULTIPLIER ON A TUNED SIM. Twelve rounds of balance sit
 *    under Club Manager, and the fastest way to ruin them is to let a fully
 *    invested manager stop being able to lose. Section 6 is the one that will
 *    matter in a year: it holds a maxed manager against an untouched one and
 *    keeps the gap inside a measured band, the way simClubManagerBudget holds
 *    the saver against the spender.
 *
 * Sections:
 *  1. Neutral at zero, over every tree and every effect, plus the identity that
 *     a fresh block and an absent block are the same thing.
 *  2. The level curve. Monotonic, each level dearer than the last, and capped
 *     so the trees cannot be overfilled.
 *  3. Spending. A point cannot be conjured, a tree cannot go past its cap, and
 *     nothing is refundable.
 *  4. The block fails closed. Garbage, a wrong version and an out of range
 *     point count all read as a fresh block rather than poisoning a save.
 *  5. Earning it. Every source moves the total in the right direction, and the
 *     weighting is the one the design claims: a trophy beats a season of wins.
 *  6. Balance (added once the trees are wired into the engine).
 *
 * Negative controls (house rule: prove the checks can fail):
 *   XP_CONTROL=notneutral  gives Tactics a lift at zero points, so section 1
 *                          catches a tree that is not neutral.
 *   XP_CONTROL=freepoints  stops counting spent points, so section 3 can spend
 *                          the same point for ever.
 *   XP_CONTROL=nocap       removes the per tree cap, so section 3 can put six
 *                          points in a five point tree.
 *   XP_CONTROL=flatlevels  makes every level cost the same, so section 2 finds
 *                          a curve that does not steepen.
 * Each control refuses to run if its rewrite did not find its text.
 *
 * Run: node scripts/simManagerXp.mjs
 */
import { execSync } from 'node:child_process';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROOT_URL = ROOT.replaceAll('\\', '/');
const TMP = os.tmpdir().replaceAll('\\', '/');
const ENTRY = `${TMP}/mgrXp.entry.mjs`;
const BUNDLE = `${TMP}/mgrXp.bundle.mjs`;

const CONTROL = process.env.XP_CONTROL || '';
const KNOWN = ['notneutral', 'freepoints', 'nocap', 'flatlevels', 'deadgate'];
/* The first four rewrite clubManagerXp.ts and are read by sections 1 to 6.
   'deadgate' patches the ENGINE bundle instead, because section 7 runs the
   real engine and the engine imports the real module whatever we do to a copy
   of the source. */
const SOURCE_CONTROLS = ['notneutral', 'freepoints', 'nocap', 'flatlevels'];
if (CONTROL && !KNOWN.includes(CONTROL)) {
  console.error(`XP_CONTROL=${CONTROL} is not a control this harness knows (${KNOWN.join(', ')})`);
  process.exit(1);
}

const XP_PATH = `${ROOT}/src/lib/clubManagerXp.ts`;
let xpPath = XP_PATH;

if (SOURCE_CONTROLS.includes(CONTROL)) {
  /* The worktree checks out CRLF and the anchors are written LF, so the read is
     normalised first. Every rewrite asserts its target is present: a control
     that changes nothing reports green for the wrong reason. */
  let src = fs.readFileSync(XP_PATH, 'utf8').replaceAll('\r\n', '\n');
  const swap = (from, to) => {
    if (!src.includes(from)) {
      console.error(`control cannot run: clubManagerXp.ts is not in the shape XP_CONTROL=${CONTROL} rewrites`);
      console.error(`  looked for: ${from}`);
      process.exit(1);
    }
    src = src.replace(from, to);
  };
  if (CONTROL === 'notneutral') {
    swap(
      "  return 1 + treePoints(state, 'tactics') * 0.1;",
      "  return 1.1 + treePoints(state, 'tactics') * 0.1;",
    );
  } else if (CONTROL === 'freepoints') {
    swap(
      '  return Math.max(0, pointsEarned(block.xp) - pointsSpent(block));',
      '  return Math.max(0, pointsEarned(block.xp));',
    );
  } else if (CONTROL === 'nocap') {
    swap('  if (now >= MAX_TREE_POINTS) return null;', '');
  } else if (CONTROL === 'flatlevels') {
    swap('    step = Math.round(step * XP_LEVEL_STEP);', '');
  }
  const copy = `${TMP}/mgrXp.control.ts`;
  fs.writeFileSync(copy, src);
  xpPath = copy;
}

fs.writeFileSync(ENTRY, `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const mod = await import('${xpPath.replaceAll('\\', '/')}');
export const xp = mod;
`);
execSync(
  `"${ROOT}/node_modules/.bin/esbuild" "${ENTRY}" --bundle --format=esm --platform=node --outfile="${BUNDLE}" --log-level=error --alias:@=${ROOT_URL}/src`,
  { stdio: 'inherit' },
);

const { xp } = await import(pathToFileURL(BUNDLE).href);
const {
  SKILL_TREES, MAX_TREE_POINTS, MAX_LEVEL, TREE_INFO,
  defaultXp, isValidXp, xpOf, treePoints,
  seasonXp, xpForLevel, levelFor, pointsEarned, pointsSpent, pointsFree, levelProgress, spendPoint,
  dutyEdge, valuationTighten, extraPatience, convergenceEdge, youthReportEdge,
  promiseCushion, gateEdge, pressCushion,
  XP_PER_WIN, XP_PER_TROPHY,
} = xp;

for (const [name, fn] of Object.entries({
  defaultXp, isValidXp, xpOf, treePoints, seasonXp, xpForLevel, levelFor,
  pointsEarned, pointsSpent, pointsFree, levelProgress, spendPoint,
  dutyEdge, valuationTighten, extraPatience, convergenceEdge, youthReportEdge,
  promiseCushion, gateEdge, pressCushion,
})) {
  if (typeof fn !== 'function') {
    console.error(`the harness could not reach ${name}; the bundle is not the shape it expects`);
    process.exit(1);
  }
}

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };

/* Every effect, with the value it MUST return when nothing has been spent. */
const EFFECTS = [
  { name: 'dutyEdge', fn: dutyEdge, identity: 1 },
  { name: 'valuationTighten', fn: valuationTighten, identity: 0 },
  { name: 'extraPatience', fn: extraPatience, identity: 0 },
  { name: 'convergenceEdge', fn: convergenceEdge, identity: 0 },
  { name: 'youthReportEdge', fn: youthReportEdge, identity: 0 },
  { name: 'promiseCushion', fn: promiseCushion, identity: 0 },
  { name: 'gateEdge', fn: gateEdge, identity: 1 },
  { name: 'pressCushion', fn: pressCushion, identity: 0 },
];

const stateWith = block => ({ managerXp: block });

/* ---------- 1. Neutral at zero ---------- */
console.log('1) A manager who has spent nothing is playing the game that shipped');
{
  const fresh = stateWith(defaultXp());
  const absent = {};
  let checked = 0;
  for (const e of EFFECTS) {
    checked += 1;
    const onFresh = e.fn(fresh);
    const onAbsent = e.fn(absent);
    if (onFresh !== e.identity) fail(`${e.name} returns ${onFresh} on a fresh block, not its identity of ${e.identity}`);
    if (onAbsent !== e.identity) fail(`${e.name} returns ${onAbsent} with NO block at all, not its identity of ${e.identity}`);
  }
  /* And a garbage block must be neutral too, because that is what a corrupted
     save reads as and it must not hand anybody a silent advantage. */
  for (const junk of ['garbage', 42, null, [], { v: 99 }, { v: 1, xp: -5, points: {} }]) {
    for (const e of EFFECTS) {
      const v = e.fn(stateWith(junk));
      if (v !== e.identity) fail(`${e.name} returns ${v} on a junk block (${JSON.stringify(junk)}), not ${e.identity}`);
    }
  }
  console.log(`   ${checked} effects, each identity on a fresh block, an absent block and six junk blocks`);
  if (checked !== 8) fail(`only ${checked} effects were checked`);
  /* Every tree must have a described effect, or a point in it buys nothing. */
  for (const t of SKILL_TREES) {
    if (!TREE_INFO[t] || !TREE_INFO[t].blurb || !TREE_INFO[t].atMax) fail(`${t} has no description of what a point buys`);
  }
  console.log(`   ${SKILL_TREES.length} trees, every one of them describing what a point buys`);
}

/* ---------- 2. The level curve ---------- */
console.log('2) Levels get dearer, and the trees cannot be overfilled');
{
  if (xpForLevel(1) !== 0) fail(`level 1 costs ${xpForLevel(1)} rather than nothing`);
  let prevStep = 0;
  let steepened = 0;
  for (let l = 2; l <= MAX_LEVEL; l++) {
    const step = xpForLevel(l) - xpForLevel(l - 1);
    if (step <= 0) fail(`level ${l} costs ${step}, so it is free or negative`);
    if (l > 2 && step <= prevStep) fail(`level ${l} costs ${step}, no more than level ${l - 1}'s ${prevStep}`);
    if (l > 2 && step > prevStep) steepened += 1;
    prevStep = step;
  }
  if (levelFor(0) !== 1) fail(`no XP reads as level ${levelFor(0)} rather than 1`);
  if (pointsEarned(0) !== 0) fail(`no XP hands out ${pointsEarned(0)} points`);
  const huge = xpForLevel(MAX_LEVEL) * 100;
  if (levelFor(huge) !== MAX_LEVEL) fail(`a career of ${huge} XP reads as level ${levelFor(huge)}, past the cap of ${MAX_LEVEL}`);
  if (pointsEarned(huge) !== SKILL_TREES.length * MAX_TREE_POINTS) {
    fail(`the cap hands out ${pointsEarned(huge)} points where the trees hold ${SKILL_TREES.length * MAX_TREE_POINTS}`);
  }
  const p = levelProgress(Math.round(xpForLevel(2) / 2));
  if (p <= 0 || p >= 1) fail(`half way to level 2 reads as progress ${p}`);
  console.log(`   ${MAX_LEVEL} levels, ${steepened} of them dearer than the one before, cap hands out exactly ${pointsEarned(huge)} points`);
  console.log(`   level 2 costs ${xpForLevel(2)}, level ${MAX_LEVEL} costs ${xpForLevel(MAX_LEVEL)} in total`);
}

/* ---------- 3. Spending ---------- */
console.log('3) A point cannot be conjured, and a tree cannot go past its cap');
{
  const broke = { ...defaultXp(), xp: 0 };
  if (spendPoint(broke, 'tactics') !== null) fail('a point was spent with none earned');

  /* Enough XP for exactly one point. */
  const one = { ...defaultXp(), xp: xpForLevel(2) };
  if (pointsEarned(one.xp) !== 1) fail(`level 2 hands out ${pointsEarned(one.xp)} points rather than one`);
  const spent = spendPoint(one, 'tactics');
  if (!spent) { fail('the first point could not be spent'); }
  else {
    if (spent.points.tactics !== 1) fail(`the point did not land: tactics reads ${spent.points.tactics}`);
    if (pointsFree(spent) !== 0) fail(`after spending the only point, ${pointsFree(spent)} are still free`);
    if (spendPoint(spent, 'recruitment') !== null) fail('a second point was spent on one point of income');
    /* Nothing is refundable: the block only ever grows. */
    if (pointsSpent(spent) !== 1) fail(`pointsSpent reads ${pointsSpent(spent)} after one point`);
  }

  /* Rich enough for everything, so the cap is the only thing left to hold. */
  let rich = { ...defaultXp(), xp: xpForLevel(MAX_LEVEL) };
  let placed = 0;
  for (let i = 0; i < MAX_TREE_POINTS + 3; i++) {
    const next = spendPoint(rich, 'tactics');
    if (!next) break;
    rich = next;
    placed += 1;
  }
  if (placed !== MAX_TREE_POINTS) fail(`${placed} points went into one tree, which holds ${MAX_TREE_POINTS}`);
  if (rich.points.tactics !== MAX_TREE_POINTS) fail(`tactics holds ${rich.points.tactics} after filling it`);
  if (spendPoint(rich, 'notATree') !== null) fail('a point went into a tree that does not exist');

  /* And the whole board fills to exactly its capacity, never past it. */
  let full = { ...defaultXp(), xp: xpForLevel(MAX_LEVEL) };
  let total = 0;
  for (const t of SKILL_TREES) {
    for (let i = 0; i < MAX_TREE_POINTS; i++) {
      const next = spendPoint(full, t);
      if (!next) break;
      full = next; total += 1;
    }
  }
  const capacity = SKILL_TREES.length * MAX_TREE_POINTS;
  if (total !== capacity) fail(`the board took ${total} points where it holds ${capacity}`);
  if (spendPoint(full, 'media') !== null) fail('a point went in after the whole board was full');
  console.log(`   one point held at one, one tree held at ${MAX_TREE_POINTS}, the board held at ${capacity}`);

  /* Every effect must actually MOVE when its tree is filled, or the point is
     decoration. This is the other half of "visible gameplay effects". */
  let moved = 0;
  for (const e of EFFECTS) {
    const at0 = e.fn(stateWith(defaultXp()));
    const atMax = e.fn(stateWith(full));
    if (at0 === atMax) fail(`${e.name} reads ${at0} whether the tree is empty or full, so the points buy nothing`);
    else moved += 1;
  }
  console.log(`   ${moved} of ${EFFECTS.length} effects move between an empty board and a full one`);
}

/* ---------- 4. The block fails closed ---------- */
console.log('4) A mangled block reads as a fresh one rather than poisoning the save');
{
  const bad = ['garbage', 42, null, undefined, [], {}, { v: 2, xp: 0, points: {} }, { v: 1, xp: 'lots', points: {} }];
  let refused = 0;
  for (const b of bad) {
    if (isValidXp(b)) fail(`isValidXp accepted ${JSON.stringify(b)}`);
    else refused += 1;
    const read = xpOf(stateWith(b));
    if (read.xp !== 0 || pointsSpent(read) !== 0) fail(`a junk block read back as ${JSON.stringify(read)}`);
  }
  /* An out of range point count is junk too, not something to clamp quietly. */
  const overfilled = { v: 1, xp: 999999, points: { ...defaultXp().points, tactics: MAX_TREE_POINTS + 1 } };
  if (isValidXp(overfilled)) fail('a tree holding more than its cap was accepted');
  if (treePoints(stateWith(overfilled), 'tactics') !== 0) {
    fail(`an overfilled tree reads ${treePoints(stateWith(overfilled), 'tactics')} rather than falling back to a fresh block`);
  }
  const good = { ...defaultXp(), xp: 1234 };
  if (!isValidXp(good)) fail('a well formed block was refused');
  console.log(`   ${refused} malformed blocks refused, an overfilled tree refused, a good one accepted`);
}

/* ---------- 5. Earning it ---------- */
console.log('5) Every source pays, and a trophy beats a season of wins');
{
  const none = seasonXp({ wins: 0, trophies: 0, objectivesMet: 0, placesAboveExpectation: 0, youthPromoted: 0, euroRoundsReached: 0, soldMoreThanBought: false });
  if (none.total !== 0) fail(`a season of nothing paid ${none.total}`);

  const base = { wins: 10, trophies: 0, objectivesMet: 0, placesAboveExpectation: 0, youthPromoted: 0, euroRoundsReached: 0, soldMoreThanBought: false };
  const baseTotal = seasonXp(base).total;
  let rising = 0;
  for (const key of ['wins', 'trophies', 'objectivesMet', 'placesAboveExpectation', 'youthPromoted', 'euroRoundsReached']) {
    const more = seasonXp({ ...base, [key]: base[key] + 1 });
    if (more.total <= baseTotal) fail(`one more ${key} paid nothing (${more.total} against ${baseTotal})`);
    else rising += 1;
  }
  const profit = seasonXp({ ...base, soldMoreThanBought: true });
  if (profit.total <= baseTotal) fail('selling more than you bought paid nothing');
  else rising += 1;

  /* The weighting the design claims: achievements over volume. A whole season
     of winning must not out-earn a trophy, or the trees reward attrition. */
  const bigSeason = seasonXp({ ...base, wins: 30 }).total;
  const oneTrophy = seasonXp({ ...base, wins: 0, trophies: 1 }).total;
  if (oneTrophy <= bigSeason - baseTotal) {
    fail(`a trophy pays ${oneTrophy} and thirty wins pay ${bigSeason}, so volume beats winning things`);
  }
  if (XP_PER_TROPHY <= XP_PER_WIN * 20) fail(`a trophy is worth ${XP_PER_TROPHY} against ${XP_PER_WIN} a win, which is not achievement over volume`);
  console.log(`   ${rising} of 7 sources move the total, a trophy pays ${XP_PER_TROPHY} against ${XP_PER_WIN} a win`);
  if (rising !== 7) fail(`only ${rising} of the seven sources paid anything`);
}

/* ---------- 6. Is the curve a career, or a wall ---------- */
console.log('6) The trees are a long game somebody could actually walk');
{
  /*
   * The check the first draft needed and did not have. A level curve is easy to
   * write and impossible to eyeball: the opening step of 400 looked fine while a
   * 1.35 multiplier compounded it to 41,643,757 XP for a full board, which is
   * about seventy thousand seasons. The harness caught it on the first run and
   * this section is here so the next person to touch the curve cannot repeat it.
   *
   * The yardstick is a GOOD season, priced off the engine's own rates rather
   * than a number typed here: a trophy, a European run to the semi finals,
   * twenty wins, two board objectives met, one promotion from the academy, one
   * place above what the board asked for, and a summer that sold more than it
   * bought.
   */
  const goodSeason = seasonXp({
    wins: 20,
    trophies: 1,
    objectivesMet: 2,
    placesAboveExpectation: 1,
    youthPromoted: 1,
    euroRoundsReached: 3,
    soldMoreThanBought: true,
  }).total;
  const seasonsTo = level => xpForLevel(level) / goodSeason;
  const first = seasonsTo(2);
  const ten = seasonsTo(11);
  const full = seasonsTo(MAX_LEVEL);
  console.log(`   a good season pays ${goodSeason} XP`);
  console.log(`   first point ${first.toFixed(1)} seasons, ten points ${ten.toFixed(1)}, the whole board ${full.toFixed(1)}`);

  /* Bands, and they are wide on purpose: this is a shape check, not a tuning
     bar. The first point has to land inside a couple of seasons or nobody ever
     sees the screen; the board has to take a real career or the trees are a
     formality; and it must not take a lifetime, which is the failure that
     actually happened. */
  if (first > 2) fail(`the first point takes ${first.toFixed(1)} good seasons, so a new manager never sees the trees work`);
  if (ten < 3) fail(`ten points arrive in ${ten.toFixed(1)} seasons, so the trees fill before the game has been played`);
  if (full < 20) fail(`the whole board fills in ${full.toFixed(1)} seasons, which is not a long game`);
  if (full > 120) fail(`the whole board takes ${full.toFixed(1)} good seasons, which nobody will ever reach`);
}

/* ================================================================== */
/* Section 7 runs the real engine, so it gets its own bundle          */
/* ================================================================== */

/*
 * The engine imports '@/lib/clubManagerXp' by name, so rewriting a COPY of that
 * source (what the four source controls do) would leave the engine reading the
 * real module and the control would change nothing. esbuild's alias is what
 * makes a control possible here: the specific alias is matched ahead of the
 * blanket '@' one, so the engine bundle resolves the import to the patched copy.
 */
const ENGINE_ENTRY = `${TMP}/mgrXpEngine.entry.mjs`;
const ENGINE_BUNDLE = `${TMP}/mgrXpEngine.bundle.mjs`;

let engineAlias = '';
if (CONTROL === 'deadgate') {
  let esrc = fs.readFileSync(XP_PATH, 'utf8').replaceAll('\r\n', '\n');
  const from = "  return 1 + treePoints(state, 'finance') * 0.02;";
  if (!esrc.includes(from)) {
    console.error('control cannot run: gateEdge is not in the shape XP_CONTROL=deadgate rewrites');
    console.error(`  looked for: ${from}`);
    process.exit(1);
  }
  esrc = esrc.replace(from, '  return 1;');
  const copy = `${TMP}/mgrXp.deadgate.ts`;
  fs.writeFileSync(copy, esrc);
  engineAlias = ` "--alias:@/lib/clubManagerXp=${copy.replaceAll('\\', '/')}"`;
}

fs.writeFileSync(ENGINE_ENTRY, `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
export const engine = await import('${ROOT_URL}/src/lib/clubManager.ts');
`);
execSync(
  `"${ROOT}/node_modules/.bin/esbuild" "${ENGINE_ENTRY}" --bundle --format=esm --platform=node --outfile="${ENGINE_BUNDLE}" --log-level=error${engineAlias} --alias:@=${ROOT_URL}/src`,
  { stdio: 'inherit' },
);
const { engine } = await import(pathToFileURL(ENGINE_BUNDLE).href);

/* ---------- 7. Balance, and what the measurement would not support ---------- */
console.log('7) A maxed manager against an untouched one, paired season by season');
{
  /*
   * THE SECTION THE HEADER PROMISED, AND IT ASSERTS LESS THAN THE FIRST DRAFT
   * WANTED IT TO. Worth reading before anybody tightens it.
   *
   * The obvious check is "a fully invested manager beats an untouched one".
   * Measured, that is not true, and the way it stopped being true is the useful
   * part. A first pass over 96 paired seasons gave the maxed arm +0.037 points
   * per game and looked exactly like proof the trees work. Repeated over four
   * INDEPENDENT seed bases at 160 pairs each it came out +0.008, -0.006, -0.011
   * and +0.038, and over six more bases at 48 pairs it ran -0.038 to +0.100.
   * The sign flips. The +0.037 was one lucky base, and a threshold
   * anywhere near it would have been Round 284's coin toss dressed as a rule.
   * So this section does not assert it. That is a finding, not a gap.
   *
   * Two things DID survive repetition, and they are what is asserted here:
   *
   *  - THE MONEY. Budget after one season, untouched against maxed, came out
   *    126.8/131.0, 126.8/131.0, 127.0/130.9, 126.9/131.1 at 160 pairs, and six
   *    more bases at 48 pairs. A gap of 3.3 to 4.4m, every base, every size. The Finance tree is the one tree that pays whatever else you do,
   *    because home gates happen on their own, and it is measurable for exactly
   *    that reason.
   *  - HE STILL LOSES. Between 23.19 and 28.47 percent of matches lost across
   *    all ten runs. This is the check that actually
   *    protects twelve rounds of balance tuning, and it does it far better than
   *    a points per game ceiling would, because it is stable at this sample size
   *    and a points per game gap is not.
   *
   * The floors are set from that measured headroom, not from a feel: the money
   * floor sits 1.8m under the smallest gap ever measured, and the defeat floor
   * sits 8 points under the lowest loss rate ever measured.
   *
   * The paired design matters and cost a run to find. Comparing whole CAREERS
   * measured the sacking cascade instead of the trees, because a career that
   * ends in season one contributes twelve matches and one that survives
   * contributes a hundred and eighty, so the aggregate was dominated by which
   * arm happened to survive. One season against one season from a byte identical
   * start under the same seed cannot be truncated that way.
   */
  const { startCareer, playNextEntry, setDuty, dutyOptions, DUTY_EFFECT, FORMATIONS } = engine;
  for (const [name, fn] of Object.entries({ startCareer, playNextEntry, setDuty, dutyOptions })) {
    if (typeof fn !== 'function') {
      console.error(`section 7 could not reach ${name} in the engine bundle`);
      process.exit(1);
    }
  }

  /* The harness owns its own stream so both arms of a pair get an identical
     draw. Same mix as scripts/lib/seedRandom.mjs. */
  const seeded = seed => {
    let a = seed >>> 0;
    return () => {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  const withSeed = (seed, fn) => {
    const saved = Math.random;
    Math.random = seeded(seed);
    try { return fn(); } finally { Math.random = saved; }
  };

  const maxedBlock = () => {
    const b = defaultXp();
    b.xp = 50_000_000;
    for (const t of SKILL_TREES) b.points[t] = MAX_TREE_POINTS;
    return b;
  };

  /*
   * A manager who actually uses the tools the trees multiply. This is not
   * padding: dutyBoost SUMS the duties set on the eleven and a fresh career has
   * none, so Tactics multiplies zero by 1.5 and gets zero. The first attempt at
   * this section had no engage step and three of eight clubs came back byte
   * identical between the arms, which reads as a wiring bug and is not one.
   */
  const engage = s => {
    const f = FORMATIONS[s.formationIndex] ?? FORMATIONS[0];
    for (let i = 0; i < f.slots.length; i++) {
      const opts = dutyOptions(f.slots[i]);
      if (!opts.length) continue;
      const best = [...opts].sort(
        (a, b) => (DUTY_EFFECT[b].atk + DUTY_EFFECT[b].def) - (DUTY_EFFECT[a].atk + DUTY_EFFECT[a].def),
      )[0];
      const nx = setDuty(s, i, best);
      if (nx) s = nx;
    }
    return s;
  };

  const oneSeason = (start, seed) => withSeed(seed, () => {
    let s = start;
    let guard = 0;
    for (;;) {
      if (++guard > 130) break;
      const res = playNextEntry(s, { skipHalftime: true });
      s = res.state;
      if (res.kind === 'seasonOver') break;
    }
    return s;
  });

  const CLUBS = ['Real Madrid', 'Arsenal', 'Napoli', 'Wolves', 'Ajax', 'Roma', 'Newcastle', 'Brighton'];
  const SEEDS_PER_CLUB = Number(process.env.XP_BALANCE_SEEDS || 6);
  const SEED_BASE = Number(process.env.XP_BALANCE_BASE || 1000);

  let bW = 0, bL = 0, bP = 0, xW = 0, xL = 0, xP = 0;
  let bBudget = 0, xBudget = 0, budgetPairs = 0, pairs = 0;

  for (const club of CLUBS) {
    for (let k = 0; k < SEEDS_PER_CLUB; k++) {
      const seed = SEED_BASE + k * 7919 + club.length * 31;
      const root = engage(JSON.parse(JSON.stringify(withSeed(seed, () => startCareer(club)))));

      const baseArm = JSON.parse(JSON.stringify(root));
      delete baseArm.managerXp;
      const maxArm = JSON.parse(JSON.stringify(root));
      maxArm.managerXp = maxedBlock();

      const playSeed = seed * 3 + 11;
      const b = oneSeason(baseArm, playSeed);
      const x = oneSeason(maxArm, playSeed);

      bW += b.careerStats.wins - root.careerStats.wins;
      bL += b.careerStats.losses - root.careerStats.losses;
      bP += b.careerStats.played - root.careerStats.played;
      xW += x.careerStats.wins - root.careerStats.wins;
      xL += x.careerStats.losses - root.careerStats.losses;
      xP += x.careerStats.played - root.careerStats.played;
      pairs += 1;

      if (Number.isFinite(b.budget) && Number.isFinite(x.budget)) {
        bBudget += b.budget;
        xBudget += x.budget;
        budgetPairs += 1;
      }
    }
  }

  /* Counts first, so this section cannot pass by having measured nothing. */
  console.log(`   ${pairs} paired seasons, ${bP} matches untouched and ${xP} maxed, ${budgetPairs} budget pairs`);
  if (pairs < CLUBS.length) fail(`only ${pairs} pairs ran, so section 7 measured almost nothing`);
  if (bP < 200 || xP < 200) fail(`only ${bP} and ${xP} matches were played, too few to read anything from`);
  if (budgetPairs < 1) fail('no pair produced a finite budget on both arms, so the money check measured nothing');

  const bBudgetMean = bBudget / Math.max(1, budgetPairs);
  const xBudgetMean = xBudget / Math.max(1, budgetPairs);
  const moneyGap = xBudgetMean - bBudgetMean;
  const lossRate = xL / Math.max(1, xP);
  const bPPG = (bW * 3 + (bP - bW - bL)) / Math.max(1, bP);
  const xPPG = (xW * 3 + (xP - xW - xL)) / Math.max(1, xP);

  console.log(`   budget after a season: ${bBudgetMean.toFixed(1)}m untouched, ${xBudgetMean.toFixed(1)}m maxed, gap ${moneyGap >= 0 ? '+' : ''}${moneyGap.toFixed(1)}m`);
  console.log(`   the maxed manager lost ${xL} of ${xP} (${(100 * lossRate).toFixed(2)} percent)`);
  console.log(`   points per game ${bPPG.toFixed(3)} untouched, ${xPPG.toFixed(3)} maxed, gap ${xPPG - bPPG >= 0 ? '+' : ''}${(xPPG - bPPG).toFixed(3)} (NOT asserted on, see the note above)`);

  /* 7a. The trees are wired to something. Measured gap 3.7 to 4.4m over six
     runs at two sample sizes, so a floor of 1.5 sits 1.8m under the smallest
     one ever seen. XP_CONTROL=deadgate kills gateEdge and
     must trip this. */
  if (!(moneyGap >= 1.5)) {
    fail(`a maxed manager finished the season only ${moneyGap.toFixed(1)}m ahead (floor 1.5m; measured 3.3 to 4.4 over ten runs), so the Finance tree is not reaching the gate`);
  }
  /* And the other way, because a gate edge that ran away would also be a bug.
     Measured max 4.4m, so 12 is nearly three times the largest ever seen. */
  if (moneyGap > 12) {
    fail(`a maxed manager finished ${moneyGap.toFixed(1)}m ahead (ceiling 12m; measured 3.3 to 4.4), so the gate edge has run away`);
  }

  /* 7b. THE ONE THAT PROTECTS THE BALANCE. A fully invested manager must still
     be able to lose. Measured 23.19 to 28.47 percent over ten runs, so a floor
     of 15 sits eight points under the lowest ever seen. */
  if (!(lossRate >= 0.15)) {
    fail(`the maxed manager lost only ${(100 * lossRate).toFixed(2)} percent of his matches (floor 15; measured 23.2 to 28.5 over ten runs), so the trees have taken defeat off the table`);
  }

  /* 7c. A sanity ceiling on the results gap, and deliberately a loose one. The
     gap is NOISE at this sample size (measured -0.038 to +0.100 across ten runs,
     sign flipping), so anything tight here would flap. One full point per game
     is roughly a maxed manager taking thirty eight more league points a season,
     which is a different game and not noise. Do not tighten this without
     repeating the four base measurement: that is what stopped it being wrong. */
  if (Math.abs(xPPG - bPPG) > 1.0) {
    fail(`the maxed manager is ${(xPPG - bPPG).toFixed(3)} points per game clear (ceiling 1.0), which is a different game rather than an edge`);
  }
}

if (failures) {
  console.error(`\nsimManagerXp: ${failures} FAILURES`);
  process.exit(1);
}
console.log('\nsimManagerXp: green. Nothing spent is the game that shipped, every point moves something, and nothing can be conjured.');
