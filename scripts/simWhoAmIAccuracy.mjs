/* Who Am I accuracy: the similarity meter is monotone in the attributes it claims.

   Round 463. The owner's note (docs/TWEAKS-2026-08-28.md): "accuracy meter as
   accurate as possible". The meter is scoreGuess in src/lib/whoAmI.ts, and its
   header lists what it claims to reward: nationality, position (group, then
   exact), club (current, else any shared club), age closeness, value closeness.
   Nothing on the site had ever measured whether the number a player sees goes
   UP when the guess is genuinely closer on those things and DOWN when it is
   farther, against the real pool. This harness does, with the real scorer, the
   real pool builder and the real club history, and nothing restated.

   What it holds, against the live pool (seeded, so two runs draw the same
   pairs):
     1. The target scores exactly 100 against itself, and no other player in
        the pool can reach 100 against it: the meter's only "you got it" value
        is reserved for the answer.
        HALF OF THAT IS A CAP, NOT A MEASUREMENT, and saying so is the point.
        scoreGuess returns `isExact ? 100 : Math.min(99, ...)`, so no wrong
        guess can reach 100 whatever the weights do; the raw total can pass
        110 and the cap eats it. What this section really measures is the
        OTHER half, that every player scores 100 against himself, which the
        exact99 control breaks. The highest non answer score is printed on
        every run because that number is the honest signal: if it sits at 99
        the cap is doing the work and the weights are too generous, and the
        round that reweights them should read it here first.
     2. DOMINANCE. Take a target and two guesses A and B where A shares every
        discrete attribute B shares (nationality, position group, exact
        position, club level: same club beats a past shared club beats none)
        and is at least as close on age and on value. A must never score below
        B. This is the exact meaning of "monotone in the attributes it claims",
        and an additive scorer with non negative weights satisfies it with zero
        violations, so the bar is zero.
     3. COUNT. Over random pairs where A simply shares MORE of the six
        attributes than B (with no dominance constraint, so the weights are
        allowed to disagree with a raw count), the share of pairs where A scores
        higher is measured and must stay above a floor set from the measured
        headroom, at three gap sizes. This is the sanity check the brief asked
        for: a weight that ranks a clearly closer player below a clearly farther
        one shows up here as a low share at the wide gaps.
     4. TOP FIVE. For a random target, the five players the meter scores
        highest must share more attributes with it than five random players do,
        by a measured margin. This is the meter doing its job: a hot guess is a
        similar player.

   Bands. "Shares age" means within a quarter of AGE_RANGE (3 years) and
   "shares value" within a quarter of VALUE_LOG_RANGE (under 1.8x apart), both
   read from the module's own constants rather than typed here.

   MEASURED on 2026-09-05 against the live pool of 600 (this is where the
   floors come from, each set well under the measurement, not at it):
     section 1, added 2026-09-06 when the claim above was corrected: 6 of
       47,920 wrong guesses, 0.013 percent, sit on the 99 ceiling rather than
       being scored by the weights (the highest is Raúl Asencio against Dean
       Huijsen, two Real Madrid centre backs of an age). So the cap is real
       but it is doing almost nothing, and the weights do not want a look on
       this evidence. It is printed on every run so the next person can see
       whether that is still true rather than trusting this line.
     section 2: 72,500 dominated pairs, 27,650 differing on a discrete
       attribute, 0 the wrong way round.
     section 3 shares: gap of 1 or more 0.954 over 122,709 pairs, gap of 2 or
       more 0.999 over 48,092, gap of 3 or more 1.000 over 13,560; floors
       0.85, 0.92, 0.97. The widest gap that scored the wrong way was 2, and
       it is the weights disagreeing with a raw count on purpose: against Ben
       White, Saka (same nation, same club) at 65 over Daniel Munoz (same exact
       position, a year apart in age, the same value) at 61. Club plus nation
       is the sharper identity clue in a guessing game, so no weight moved.
     section 4: top five share 4.42 of 6 attributes on average, five random
       players 1.78, gap 2.65; floor for the gap 1.5.

   Negative controls (house rule: each reproduces a real shape of the defect
   and refuses to run if the text it rewrites is not there; each is judged on
   its own section only):
     SIM_WHOAMI_ACCURACY_CONTROL=exact99     the answer scores 99 like everyone
       else. Section 1 must go red.
     SIM_WHOAMI_ACCURACY_CONTROL=clubpenalty sharing a club costs points instead
       of earning them. Section 2 must go red: a guess from the target's own
       club now scores below an otherwise identical stranger.

   Network: the real pool boot against the live database. If it cannot be
   built the run says SUPABASE UNREACHABLE. NOTHING WAS CHECKED. and exits 1.

   Run: node scripts/simWhoAmIAccuracy.mjs
*/
import { execSync } from 'node:child_process';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROOT_URL = ROOT.replaceAll('\\', '/');
const TMP = os.tmpdir().replaceAll('\\', '/');
const CONTROLS = ['exact99', 'clubpenalty'];
const CONTROL = process.env.SIM_WHOAMI_ACCURACY_CONTROL || '';
if (CONTROL && !CONTROLS.includes(CONTROL)) {
  console.error(`SIM_WHOAMI_ACCURACY_CONTROL=${CONTROL} is not a control this harness knows (${CONTROLS.join(', ')})`);
  process.exit(1);
}

let failures = 0;
let section = 0;
const bySection = { 1: 0, 2: 0, 3: 0, 4: 0 };
const fail = m => { failures += 1; bySection[section] += 1; console.error('  FAIL: ' + m); };
const abort = m => { console.error(m); process.exit(1); };

/* A worktree checks out CRLF and the anchors below are written LF, so the
   source is normalised before a control looks for its text. */
const readLf = p => fs.readFileSync(p, 'utf8').replaceAll('\r\n', '\n');

const aliases = [];
function control(relative, alias, fixed, broken, note) {
  const file = path.join(ROOT, relative);
  const src = readLf(file);
  if (!src.includes(fixed)) {
    abort(`control cannot run: ${relative} is not in the shape SIM_WHOAMI_ACCURACY_CONTROL=${CONTROL} rewrites`);
  }
  const copy = `${TMP}/whoAmIAccuracy.${CONTROL}.${path.basename(relative)}`;
  fs.writeFileSync(copy, src.replace(fixed, broken));
  aliases.push(`--alias:${alias}=${copy}`);
  console.log('NEGATIVE CONTROL ON: ' + note);
}

if (CONTROL === 'exact99') {
  control(
    'src/lib/whoAmI.ts', '@/lib/whoAmI',
    '  const score = isExact ? 100 : Math.min(99, Math.round(total));',
    '  const score = isExact ? 99 : Math.min(99, Math.round(total));',
    'the secret player scores 99 against itself, like everybody else',
  );
}
if (CONTROL === 'clubpenalty') {
  control(
    'src/lib/whoAmI.ts', '@/lib/whoAmI',
    '  if (sameClub) total += WEIGHTS.sameClub;\n  else if (sharedClubPast) total += WEIGHTS.sharedClub;',
    '  if (sameClub) total -= WEIGHTS.sameClub;\n  else if (sharedClubPast) total -= WEIGHTS.sharedClub;',
    'sharing a club costs points instead of earning them',
  );
}

const ENTRY = `${TMP}/whoAmIAccuracy.entry.mjs`;
const BUNDLE = `${TMP}/whoAmIAccuracy.bundle.mjs`;
fs.writeFileSync(ENTRY, `export * as w from '@/lib/whoAmI';\n`);
execSync(
  `"${ROOT}/node_modules/.bin/esbuild" "${ENTRY}" --bundle --format=esm --platform=node --outfile="${BUNDLE}" --log-level=error --alias:@=${ROOT_URL}/src ${aliases.join(' ')}`,
  { stdio: 'inherit' },
);

/* The supabase client reads localStorage while its module evaluates. */
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const { w } = await import(pathToFileURL(BUNDLE).href);

const data = await w.fetchWhoAmIPool();
if (!data || !Array.isArray(data.pool) || data.pool.length === 0) abort('\nSUPABASE UNREACHABLE. NOTHING WAS CHECKED.');
const { pool, clubHistory } = data;
const secretSize = Math.min(w.SECRET_POOL_SIZE, pool.length);
console.log(`pool ${pool.length} players (POOL_SIZE ${w.POOL_SIZE}), secret pool ${secretSize} (SECRET_POOL_SIZE ${w.SECRET_POOL_SIZE}), club history for ${clubHistory.size}`);
console.log(`weights: ${Object.entries(w.WEIGHTS).map(([k, v]) => `${k} ${v}`).join(', ')}; age range ${w.AGE_RANGE}, value log range ${w.VALUE_LOG_RANGE}`);
/* Measured 600 on 2026-09-05. The floor says "the real pool loaded", well
   under the measurement, so a short pool cannot pass the sections on nothing. */
if (pool.length < 300) fail(`the pool came back with ${pool.length} players, too few to be the real pool`);

/* Seeded so the pairs are the same on every run. */
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(463);
const pickIndex = () => Math.floor(rand() * pool.length);

const AGE_BAND = w.AGE_RANGE / 4;
const VALUE_BAND = w.VALUE_LOG_RANGE / 4;

/* Which of the claimed attributes a guess shares with a target, read through
   the module's own helpers so the definition of "same nationality" or "same
   club" is the scorer's, not this file's. */
function attrs(g, t) {
  const gNat = w.primaryNationality(g.nationality);
  const nat = gNat !== '' && gNat === w.primaryNationality(t.nationality);
  const posGroup = w.positionGroup(g.position) === w.positionGroup(t.position);
  const posExact = posGroup && g.position !== '' && w.normalizeName(g.position) === w.normalizeName(t.position);
  const gk = w.clubKey(g.club);
  const club = gk !== '' && gk === w.clubKey(t.club);
  let shared = false;
  if (!club) {
    const gh = clubHistory.get(g.name);
    const th = clubHistory.get(t.name);
    if (gh && th) for (const c of gh) if (th.has(c)) { shared = true; break; }
  }
  const ageDiff = Math.abs(t.age - g.age);
  const valueDiff = Math.abs(Math.log10(Math.max(1, t.value) / Math.max(1, g.value)));
  const ageBand = ageDiff <= AGE_BAND;
  const valueBand = valueDiff <= VALUE_BAND;
  const clubLevel = club ? 2 : shared ? 1 : 0;
  const count = (nat ? 1 : 0) + (posGroup ? 1 : 0) + (posExact ? 1 : 0) + (clubLevel > 0 ? 1 : 0) + (ageBand ? 1 : 0) + (valueBand ? 1 : 0);
  return { nat, posGroup, posExact, clubLevel, ageDiff, valueDiff, ageBand, valueBand, count };
}
const score = (g, t) => w.scoreGuess(g, t, clubHistory).score;
const describe = a => `nat ${a.nat ? 'y' : 'n'} group ${a.posGroup ? 'y' : 'n'} exact ${a.posExact ? 'y' : 'n'} club ${['none', 'past', 'same'][a.clubLevel]} age ${a.ageDiff}y value ${a.valueDiff.toFixed(2)} log10`;

/* ------------------------------------------------------------------ */
section = 1;
console.log('1) The answer scores exactly 100 against itself, and nobody else can');
{
  let notHundred = 0, firstNot = '';
  for (const p of pool) {
    const s = score(p, p);
    if (s !== 100) { notHundred += 1; if (!firstNot) firstNot = `${p.name} scores ${s} against himself`; }
  }
  const TARGETS = 80;
  let impostors = 0, firstImpostor = '', highest = 0, highestWhere = '', compared = 0, atCap = 0;
  for (let i = 0; i < TARGETS; i++) {
    const t = pool[Math.floor(rand() * secretSize)];
    for (const g of pool) {
      if (g === t) continue;
      const s = score(g, t);
      compared += 1;
      if (s >= 100) { impostors += 1; if (!firstImpostor) firstImpostor = `${g.name} scores ${s} against ${t.name}`; }
      if (s > highest) { highest = s; highestWhere = `${g.name} against ${t.name}`; }
      if (s === 99) atCap += 1;
    }
  }
  console.log(`   ${pool.length} self scores checked, ${compared} other players scored against ${TARGETS} secrets; highest non answer ${highest} (${highestWhere})`);
  /* THE CAP'S SHADOW. The 99 above is the ceiling doing the work, not the
     weights, so the number worth watching is how many guesses the ceiling is
     holding down: every one of them reads the same to a player who is not
     actually close in the same way. It is printed rather than failed on
     because there is no measured floor for it yet and a threshold picked by
     feel is the coin toss this file's own rules ban. If it climbs, the
     weights want a look, and that round starts here. */
  console.log(`   ${atCap} of ${compared} wrong guesses (${(atCap / compared * 100).toFixed(3)} percent) are sat on the 99 ceiling rather than scored by the weights`);
  if (notHundred > 0) fail(`${notHundred} players do not score 100 against themselves: ${firstNot}`);
  if (impostors > 0) fail(`${impostors} wrong guesses reached 100: ${firstImpostor}`);
  if (notHundred === 0 && impostors === 0) console.log('   only the answer reaches 100');
}

/* ------------------------------------------------------------------ */
/* One sample of (target, guesses) shared by sections 2 and 3, so both read
   the same pairs. */
const TARGETS = 400;
const GUESSES = 30;
const samples = [];
for (let i = 0; i < TARGETS; i++) {
  const t = pool[pickIndex()];
  const guesses = [];
  const seen = new Set([t.name]);
  while (guesses.length < GUESSES) {
    const g = pool[pickIndex()];
    if (seen.has(g.name)) continue;
    seen.add(g.name);
    guesses.push({ g, a: attrs(g, t), s: score(g, t) });
  }
  samples.push({ t, guesses });
}

section = 2;
console.log('2) DOMINANCE: a guess that shares everything another shares, and is as close or closer on age and value, never scores lower');
{
  const dominates = (x, y) =>
    (x.nat || !y.nat) && (x.posGroup || !y.posGroup) && (x.posExact || !y.posExact) &&
    x.clubLevel >= y.clubLevel && x.ageDiff <= y.ageDiff && x.valueDiff <= y.valueDiff;
  let pairs = 0, strict = 0, violations = 0, firstViolation = '';
  for (const { t, guesses } of samples) {
    for (let i = 0; i < guesses.length; i++) {
      for (let j = 0; j < guesses.length; j++) {
        if (i === j) continue;
        const A = guesses[i], B = guesses[j];
        if (!dominates(A.a, B.a)) continue;
        pairs += 1;
        const differs = A.a.nat !== B.a.nat || A.a.posGroup !== B.a.posGroup || A.a.posExact !== B.a.posExact || A.a.clubLevel !== B.a.clubLevel;
        if (differs) strict += 1;
        if (A.s < B.s) {
          violations += 1;
          if (!firstViolation) firstViolation = `secret ${t.name}: ${A.g.name} (${describe(A.a)}) scores ${A.s}, below ${B.g.name} (${describe(B.a)}) at ${B.s}`;
        }
      }
    }
  }
  console.log(`   ${pairs} dominated pairs across ${samples.length} secrets, ${strict} of them differing on a discrete attribute; ${violations} scored the wrong way round`);
  if (pairs < 5000) fail(`only ${pairs} dominated pairs were found, too few to measure`);
  if (strict < 500) fail(`only ${strict} dominated pairs differ on a discrete attribute, so the weights were barely exercised`);
  if (violations > 0) fail(`${violations} dominated pairs scored the wrong way round: ${firstViolation}`);
  else console.log('   no dominated pair scored the wrong way round');
}

/* ------------------------------------------------------------------ */
section = 3;
console.log('3) COUNT: sharing more of the six attributes scores higher, measured at three gap sizes');
{
  const byGap = { 1: { n: 0, up: 0 }, 2: { n: 0, up: 0 }, 3: { n: 0, up: 0 } };
  let worstGap = 0, worstWhere = '';
  for (const { t, guesses } of samples) {
    for (let i = 0; i < guesses.length; i++) {
      for (let j = 0; j < guesses.length; j++) {
        if (i === j) continue;
        const A = guesses[i], B = guesses[j];
        const gap = A.a.count - B.a.count;
        if (gap < 1) continue;
        for (const g of [1, 2, 3]) {
          if (gap >= g) { byGap[g].n += 1; if (A.s > B.s) byGap[g].up += 1; }
        }
        if (A.s <= B.s && gap > worstGap) {
          worstGap = gap;
          worstWhere = `secret ${t.name}: ${A.g.name} shares ${A.a.count} (${describe(A.a)}) for ${A.s}, ${B.g.name} shares ${B.a.count} (${describe(B.a)}) for ${B.s}`;
        }
      }
    }
  }
  /* Floors from the 2026-09-05 measurement in the header, each well under it. */
  const FLOORS = { 1: 0.85, 2: 0.92, 3: 0.97 };
  for (const g of [1, 2, 3]) {
    const { n, up } = byGap[g];
    const share = n ? up / n : 0;
    console.log(`   gap of ${g} or more: ${n} pairs, the closer guess scores higher in ${(100 * share).toFixed(1)}% (floor ${(100 * FLOORS[g]).toFixed(0)}%)`);
    if (n < 200) fail(`only ${n} pairs at a gap of ${g} or more, too few to measure`);
    else if (share < FLOORS[g]) fail(`at a gap of ${g} or more the closer guess scores higher in only ${(100 * share).toFixed(1)}% of pairs, under the ${(100 * FLOORS[g]).toFixed(0)}% floor`);
  }
  if (worstWhere) console.log(`   widest gap scored the wrong way: ${worstGap} attributes, ${worstWhere}`);
}

/* ------------------------------------------------------------------ */
section = 4;
console.log('4) TOP FIVE: the meter\'s hottest five share more with the secret than five random players');
{
  const N = 200;
  let topSum = 0, randSum = 0, topN = 0, randN = 0;
  for (let i = 0; i < N; i++) {
    const t = pool[Math.floor(rand() * secretSize)];
    const scored = [];
    for (const g of pool) {
      if (g === t) continue;
      scored.push({ g, s: score(g, t) });
    }
    scored.sort((x, y) => y.s - x.s || x.g.name.localeCompare(y.g.name));
    for (const { g } of scored.slice(0, 5)) { topSum += attrs(g, t).count; topN += 1; }
    for (let k = 0; k < 5; k++) {
      let g = pool[pickIndex()];
      while (g === t) g = pool[pickIndex()];
      randSum += attrs(g, t).count;
      randN += 1;
    }
  }
  const topMean = topSum / topN;
  const randMean = randSum / randN;
  const gap = topMean - randMean;
  /* Measured 4.42 against 1.78 on 2026-09-05, a gap of 2.65; the floor is a
     little over half of it. */
  const FLOOR = 1.5;
  console.log(`   over ${N} secrets: hottest five share ${topMean.toFixed(2)} of 6 attributes on average, five random players ${randMean.toFixed(2)}, gap ${gap.toFixed(2)} (floor ${FLOOR})`);
  if (gap < FLOOR) fail(`the hottest five share only ${gap.toFixed(2)} more attributes than random players, under the ${FLOOR} floor, so a hot guess is not a similar player`);
  else console.log('   a hot guess is a similar player');
}

/* ------------------------------------------------------------------ */
console.log('');
if (CONTROL) {
  const targetSection = { exact99: 1, clubpenalty: 2 }[CONTROL];
  const fired = bySection[targetSection];
  const elsewhere = failures - fired;
  if (fired === 0) {
    console.error(`CONTROL DID NOT FIRE: section ${targetSection} stayed green with SIM_WHOAMI_ACCURACY_CONTROL=${CONTROL}${elsewhere ? ` (${elsewhere} failure(s) elsewhere do not count)` : ''}`);
    process.exit(1);
  }
  console.log(`CONTROL FIRED: section ${targetSection} went red as it must (${fired} findings)${elsewhere ? ` (${elsewhere} elsewhere, not counted)` : ''}`);
  process.exit(0);
}
if (failures > 0) {
  console.error(`simWhoAmIAccuracy: ${failures} findings (section 1: ${bySection[1]}, 2: ${bySection[2]}, 3: ${bySection[3]}, 4: ${bySection[4]})`);
  process.exit(1);
}
console.log('simWhoAmIAccuracy: all four sections green');
