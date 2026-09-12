/* The achievement case, proven. Round 527, extended Round 539.
 *
 * src/lib/achievements.ts computes achievements from facts the site already
 * records. Nothing writes, so the things that can go wrong are not crashes,
 * they are quiet lies: a definition nobody can ever reach, one everybody holds
 * from the moment they arrive, a renamed id that orphans what somebody earned,
 * a predicate that edits the facts it was handed, a hidden one whose name
 * leaks through the locked list, and a bar that goes backwards when you play
 * more. This harness is those six questions and the read only claim.
 *
 * TWO OF THOSE QUESTIONS WERE BEING ASKED IN THE WRONG LAYER, and Round 539's
 * adversarial pass found both defects sitting under the gap:
 *   - Section 6 proved the earned set only grows as a hand built FACTS object
 *     grows. It was never wrong. The defect was one level down in
 *     rows -> buildAchievementFacts: the client read the 1,000 most recent
 *     game_completions rows, so the facts were computed over a SLIDING WINDOW
 *     and achievements un earned themselves as a player kept playing. Nine
 *     tiles, both hidden ones among them, walked off a real history once a
 *     thousand newer rows landed in front of them. Section 9 asks the question
 *     across the builder, where it lives.
 *   - Section 0 proved the read is a read by grepping two files for write
 *     verbs. The write was one call deep and invisible to it: loadAchievementFacts
 *     called getCurrentPlayerName, which reaches getGuestHandle, which MINTS a
 *     handle off Math.random and localStorage.setItems it. Section 10 runs the
 *     real call graph against a recording localStorage and counts, which is
 *     the only way to see a write somebody else's module performs.
 *
 * WHAT IT HOLDS:
 *   0. READ ONLY, AS CODE. Neither shipped file contains a write verb, the one
 *      database call is a read only RPC, and the case is mounted on Profile.
 *   1. REACHABLE, ONE BY ONE. A twelve step ladder of player facts, each step
 *      pointwise at or above the last. Every definition must be unearned at
 *      step 0 and earned by the top, and the step it flips is printed. Nothing
 *      in the case may be unreachable and nothing may be free.
 *   2. NOTHING TRIVIAL. An all zero facts object earns nothing at all, and a
 *      single finished game earns only the first step the case declares.
 *   3. IDS ARE PINNED. The id set is compared against the list below in both
 *      directions, so a rename is a failure rather than a silent orphan, plus
 *      the copy checks (no long dashes, nothing empty, a real rarity).
 *   4. HIDDEN STAYS HIDDEN. A hidden one is absent from the locked path until
 *      it is earned, present after, and the count of the rest names none.
 *   5. PURE. Every definition against every fixture: the facts come back deep
 *      equal to what went in, two calls agree, and earned agrees with progress.
 *   6. MONOTONE. Along the ladder the earned set only ever grows, and a sweep
 *      that lifts one fact at a time from the middle of the ladder never takes
 *      an achievement away.
 *   7. NO DEAD FACTS. Knocking each field of the facts out on its own must
 *      change what is earned, so the shape carries nothing nobody reads.
 *   8. THE BUILDER, ON REAL SLUGS. buildAchievementFacts over real registry
 *      routes maps sports, counts days and leaves its inputs alone.
 *   9. MONOTONE ACROSS THE BUILDER. A real history as ROWS, then five appends
 *      of different shapes (more of one game, games never tried, more days,
 *      and two long single game sessions that are hundreds of rows on ONE
 *      day). After every append the row derived facts must be at or above what
 *      they were and the earned set must be a superset. Plus the property all
 *      of that rests on: forty rows of one game on one day are one game day,
 *      not forty.
 *  10. NOTHING WRITTEN, AT RUNTIME. loadAchievementFacts through the real call
 *      graph against a recording localStorage, for the three reader shapes
 *      that reach the handle code, asserting zero writes and naming any key
 *      that gets one.
 *
 * NO STATISTICAL THRESHOLD ANYWHERE, on purpose. Every check here is exact: a
 * set equality, a deep equality, a comparison between two runs. There is no
 * margin to tune and so no check that passes or fails on noise.
 *
 * NEGATIVE CONTROLS (house rule: prove each check can fail). Each rewrites a
 * copy of the shipped source, refuses to run if the string it rewrites is not
 * there, and is judged only on its own section:
 *   SIM_ACH_CONTROL=write        a write put back into the read            -> 0
 *   SIM_ACH_CONTROL=unreachable  a threshold nobody can reach              -> 1
 *   SIM_ACH_CONTROL=trivial      the empty facts guard removed             -> 2
 *   SIM_ACH_CONTROL=rename       an id renamed under everybody             -> 3
 *   SIM_ACH_CONTROL=leak         hidden ones shown while locked            -> 4
 *   SIM_ACH_CONTROL=mutate       a predicate that edits its facts          -> 5
 *   SIM_ACH_CONTROL=nonmono      a measure that falls as you play          -> 6
 *   SIM_ACH_CONTROL=deadfact     a definition that reads a constant        -> 7
 *   SIM_ACH_CONTROL=builder      the per game count broken                 -> 8
 *   SIM_ACH_CONTROL=window       the 1,000 row sliding window put back     -> 9
 *   SIM_ACH_CONTROL=mint         the identity read that mints a handle     -> 10
 *
 * Run: node scripts/simAchievements.mjs
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LIB = 'src/lib/achievements.ts';
const CASE = 'src/components/profile/AchievementCase.tsx';
const PROFILE = 'src/pages/Profile.tsx';
const CONTROL = process.env.SIM_ACH_CONTROL || '';

const SECTIONS = 11;
const failures = Array.from({ length: SECTIONS }, () => 0);
let section = 0;
const fail = m => { failures[section] += 1; console.error('  FAIL: ' + m); };
const abort = m => { console.error(m); process.exit(1); };
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8').split('\r\n').join('\n');
const stripComments = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

/* ─── the controls, applied to a copy of the source ───────────────────────── */

const CONTROLS = {
  write: {
    sec: 0, file: LIB,
    old: "    const rows = await fetchOwnCompletions(",
    now: "    await (supabase.from as any)('game_completions').insert({ game: 'control' });\n    const rows = await fetchOwnCompletions(",
    say: 'an insert put back into the read',
  },
  unreachable: {
    sec: 1, file: LIB,
    old: 'f => f.longestStreak, 60)',
    now: 'f => f.longestStreak, 60000)',
    say: 'the two month streak moved to sixty thousand days',
  },
  trivial: {
    sec: 2, file: LIB,
    old: 'return need > 0 && have >= need;',
    now: 'return have >= need;',
    say: 'the empty facts guard removed from gauge()',
  },
  rename: {
    sec: 3, file: LIB,
    old: "id: 'first-finish'",
    now: "id: 'first-play'",
    say: 'an id renamed under everybody who earned it',
  },
  leak: {
    sec: 4, file: LIB,
    old: 'if (def.hidden && !earned) continue;',
    now: 'if (def.hidden && earned && !earned) continue;',
    say: 'hidden ones left in the locked list',
  },
  mutate: {
    sec: 5, file: LIB,
    old: 'const tally = (r: Record<string, number>): number => Object.keys(r).length;',
    now: 'const tally = (r: Record<string, number>): number => { (r as any).__counted = 1; return Object.keys(r).length; };',
    say: 'a predicate helper that writes into the facts it was handed',
  },
  nonmono: {
    sec: 6, file: LIB,
    old: 'f => f.mostGamesInOneDay, 3)',
    now: 'f => Math.max(0, 6 - f.mostGamesInOneDay), 3)',
    say: 'the triple header measured backwards, so playing more loses it',
  },
  deadfact: {
    sec: 7, file: LIB,
    old: 'f => f.bestGameStreak, 10)',
    now: 'f => 999, 10)',
    say: 'a definition that reads a constant instead of a fact',
  },
  builder: {
    sec: 8, file: LIB,
    old: 'playsByGame[row.game] = (playsByGame[row.game] ?? 0) + 1;',
    now: 'playsByGame[row.game] = 1;',
    say: 'the per game count flattened to one',
  },
  /* The Round 527 defect itself, put back at the layer it lived at. The client
     read the 1,000 most recent rows, so the facts were a window on the end of
     a history rather than the history. 1,000 is the number that actually
     shipped, not a number picked to make the control fire. */
  window: {
    sec: 9, file: LIB,
    old: '  for (const row of rows) {',
    now: '  for (const row of rows.slice(-1000)) {',
    say: 'the 1,000 row sliding window put back into the builder',
  },
  /* The other Round 527 defect. Swapping the identifier everywhere fixes the
     import too, so the control compiles and the call really does reach
     getGuestHandle, which mints off Math.random and stores the result. A
     control that only rewrote the call site would leave an undefined name,
     throw, be swallowed by the catch and prove nothing. */
  mint: {
    sec: 10, file: LIB,
    old: 'peekCurrentPlayerName',
    now: 'getCurrentPlayerName',
    say: 'the identity read swapped back to the one that mints and stores a handle',
  },
};

if (CONTROL && !CONTROLS[CONTROL]) abort(`unknown control "${CONTROL}" (${Object.keys(CONTROLS).join(', ')})`);

/** The source of a file as this run should see it: the shipped bytes, or the
 *  control's rewrite of them. A control that finds nothing to rewrite aborts,
 *  because a control that changed nothing is a green that means nothing. */
const sourceCache = new Map();
function sourceOf(file) {
  if (sourceCache.has(file)) return sourceCache.get(file);
  let src = read(file);
  const c = CONTROL ? CONTROLS[CONTROL] : null;
  if (c && c.file === file) {
    if (!src.includes(c.old)) abort(`control "${CONTROL}" cannot run: ${file} does not contain ${JSON.stringify(c.old)}`);
    src = src.split(c.old).join(c.now);
  }
  sourceCache.set(file, src);
  return src;
}

/* ─── load the library, through the control's copy when one is on ─────────── */

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'dukb-ach-'));
const p = f => f.replaceAll('\\', '/');
let libPath = p(path.join(ROOT, LIB));
if (CONTROL && CONTROLS[CONTROL].file === LIB) {
  libPath = p(path.join(TMP, 'achievements.control.ts'));
  fs.writeFileSync(libPath, sourceOf(LIB));
  console.log(`NEGATIVE CONTROL "${CONTROL}" ON: ${CONTROLS[CONTROL].say}`);
}
const ENTRY = path.join(TMP, 'entry.mjs');
const OUT = path.join(TMP, 'bundle.mjs');
/* A RECORDING localStorage, not the no op one this used to install.
   Round 527's write was one call deep, in another module: loadAchievementFacts
   asked getCurrentPlayerName for a name, that reaches getGuestHandle, and
   getGuestHandle mints a handle off Math.random and setItems it when there is
   not one stored. A setItem that does nothing swallows that in silence and
   section 0's source grep cannot see it either, because the verb is not in
   either file it reads. So every read and every write is recorded here and
   section 10 counts them.
   The store is real, so a mint is visible to the next read exactly as it is in
   a browser, and reset(seed) sets up one case.
   fetch is stubbed on purpose too. Nothing in this harness may reach the live
   project, and the write control injects an insert into game_completions: a
   test run must never be able to put a row in production. */
fs.writeFileSync(ENTRY, `
const store = new Map();
const writes = [];
const reads = [];
globalThis.__dukbStorage = {
  writes, reads,
  reset(seed) {
    store.clear();
    for (const k of Object.keys(seed || {})) store.set(k, String(seed[k]));
    writes.length = 0;
    reads.length = 0;
  },
};
globalThis.localStorage = {
  getItem(k) { const key = String(k); reads.push(key); return store.has(key) ? store.get(key) : null; },
  setItem(k, v) { const key = String(k); writes.push({ op: 'setItem', key, value: String(v) }); store.set(key, String(v)); },
  removeItem(k) { const key = String(k); writes.push({ op: 'removeItem', key, value: null }); store.delete(key); },
  clear() { writes.push({ op: 'clear', key: '*', value: null }); store.clear(); },
  get length() { return store.size; },
  key(i) { return Array.from(store.keys())[i] ?? null; },
};
globalThis.fetch = () => Promise.reject(new Error('simAchievements: the network is stubbed, nothing here talks to the live project'));
export const storage = globalThis.__dukbStorage;
export const ach = await import('${libPath}');
export const registry = await import('${p(path.join(ROOT, 'src/data/gameRegistry.ts'))}');
`);
await build({
  entryPoints: [ENTRY], bundle: true, format: 'esm', platform: 'node',
  outfile: OUT, logLevel: 'error', alias: { '@': path.join(ROOT, 'src') },
});
const { ach, registry, storage } = await import(pathToFileURL(OUT).href);
const {
  ACHIEVEMENTS, earnedAchievements, achievementProgress, visibleAchievements,
  hiddenRemaining, emptyAchievementFacts, buildAchievementFacts, loadAchievementFacts,
} = ach;

/* ─── small tools ─────────────────────────────────────────────────────────── */

function deepEqual(a, b) {
  if (a === b) return true;
  if (typeof a !== typeof b || a === null || b === null) return false;
  if (typeof a !== 'object') return Number.isNaN(a) && Number.isNaN(b);
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const ka = Object.keys(a), kb = Object.keys(b);
  if (ka.length !== kb.length) return false;
  for (const k of ka) if (!Object.prototype.hasOwnProperty.call(b, k) || !deepEqual(a[k], b[k])) return false;
  return true;
}
const clone = v => structuredClone(v);
const idsOf = list => list.map(d => d.id).sort();
const earnedIds = f => earnedAchievements(f).map(d => d.id);

/* ─── the ladder ──────────────────────────────────────────────────────────────
   Twelve steps of one player getting deeper into the site. Every parameter
   rises or holds, never falls, so the facts built from them rise too and
   section 6 is asking about the code rather than about the fixture. The site's
   own sport count is held fixed across the ladder because it is a property of
   the site and not of the player: a sport being added is not the player
   playing less. The numbers come from the measured play recorded in the header
   of src/lib/achievements.ts, so the top of the ladder is roughly the deepest
   handle the site has actually seen. */

const SPORT_COUNT = emptyAchievementFacts().totalSports;

const LADDER = [
  { label: 'nothing yet',    games: 0,  gameEach: 0,  gameTop: 0,   sports: 0,  sportEach: 0,  sportTop: 0,   streak: 0,  gStreak: 0,  days: 0,   gamesDay: 0,  sportsDay: 0, scored: 0,  ppp: 0 },
  { label: 'one game',       games: 1,  gameEach: 0,  gameTop: 1,   sports: 1,  sportEach: 0,  sportTop: 1,   streak: 1,  gStreak: 1,  days: 1,   gamesDay: 1,  sportsDay: 1, scored: 0,  ppp: 5 },
  { label: 'had a look',     games: 3,  gameEach: 1,  gameTop: 2,   sports: 2,  sportEach: 1,  sportTop: 2,   streak: 3,  gStreak: 2,  days: 3,   gamesDay: 2,  sportsDay: 2, scored: 2,  ppp: 10 },
  { label: 'first week',     games: 5,  gameEach: 2,  gameTop: 5,   sports: 3,  sportEach: 2,  sportTop: 5,   streak: 4,  gStreak: 3,  days: 5,   gamesDay: 3,  sportsDay: 3, scored: 4,  ppp: 15 },
  { label: 'settling in',    games: 7,  gameEach: 3,  gameTop: 8,   sports: 4,  sportEach: 3,  sportTop: 10,  streak: 5,  gStreak: 4,  days: 8,   gamesDay: 4,  sportsDay: 4, scored: 6,  ppp: 20 },
  { label: 'regular',        games: 10, gameEach: 4,  gameTop: 15,  sports: 5,  sportEach: 3,  sportTop: 20,  streak: 7,  gStreak: 5,  days: 10,  gamesDay: 5,  sportsDay: 4, scored: 8,  ppp: 25 },
  { label: 'keen',           games: 14, gameEach: 6,  gameTop: 25,  sports: 6,  sportEach: 3,  sportTop: 25,  streak: 10, gStreak: 7,  days: 14,  gamesDay: 6,  sportsDay: 4, scored: 10, ppp: 30 },
  { label: 'in deep',        games: 18, gameEach: 8,  gameTop: 40,  sports: 8,  sportEach: 4,  sportTop: 40,  streak: 14, gStreak: 8,  days: 20,  gamesDay: 7,  sportsDay: 4, scored: 12, ppp: 45 },
  { label: 'serious',        games: 25, gameEach: 12, gameTop: 60,  sports: 10, sportEach: 5,  sportTop: 60,  streak: 21, gStreak: 10, days: 25,  gamesDay: 8,  sportsDay: 4, scored: 15, ppp: 60 },
  { label: 'obsessed',       games: 35, gameEach: 16, gameTop: 100, sports: 12, sportEach: 6,  sportTop: 90,  streak: 30, gStreak: 12, days: 40,  gamesDay: 9,  sportsDay: 4, scored: 20, ppp: 75 },
  { label: 'the lot',        games: 40, gameEach: 20, gameTop: 120, sports: 13, sportEach: 8,  sportTop: 120, streak: 40, gStreak: 14, days: 60,  gamesDay: 10, sportsDay: 5, scored: 25, ppp: 80 },
  { label: 'lifer',          games: 50, gameEach: 24, gameTop: 200, sports: 13, sportEach: 12, sportTop: 200, streak: 60, gStreak: 20, days: 100, gamesDay: 12, sportsDay: 6, scored: 30, ppp: 120 },
];

function spread(prefix, count, top, each) {
  const out = {};
  for (let i = 0; i < count; i += 1) out[`${prefix}${i}`] = i === 0 ? top : each;
  return out;
}

function factsFor(step) {
  const playsByGame = spread('game-', step.games, step.gameTop, step.gameEach);
  const playsBySport = spread('Sport ', step.sports, step.sportTop, step.sportEach);
  const sum = r => Object.values(r).reduce((a, b) => a + b, 0);
  const totalPlays = Math.max(sum(playsByGame), sum(playsBySport));
  return {
    totalPlays,
    totalPoints: totalPlays * step.ppp,
    longestStreak: step.streak,
    bestGameStreak: step.gStreak,
    daysPlayed: step.days,
    mostGamesInOneDay: step.gamesDay,
    mostSportsInOneDay: step.sportsDay,
    playsByGame,
    playsBySport,
    bestScoreByGame: spread('scored-', step.scored, 100, 100),
    totalSports: SPORT_COUNT,
  };
}

/* FRESH EVERY TIME, and this is not tidiness. The first draft built the
   fixtures once and shared them across sections, and the purity control went
   green: the mutation it injects writes the same key with the same value every
   time, so once section 2 had already stamped it on the shared objects,
   section 5 compared a polluted object against a polluted copy and saw
   nothing. A section that asks whether the facts were touched has to start
   from facts nothing has touched. */
const rungs = () => LADDER.map(factsFor);

/** The ladder must actually rise, or section 6 is measuring the fixture. */
function ladderRises(RUNGS) {
  const numeric = ['totalPlays', 'totalPoints', 'longestStreak', 'bestGameStreak', 'daysPlayed', 'mostGamesInOneDay', 'mostSportsInOneDay'];
  const records = ['playsByGame', 'playsBySport', 'bestScoreByGame'];
  for (let i = 1; i < RUNGS.length; i += 1) {
    const lo = RUNGS[i - 1], hi = RUNGS[i];
    for (const k of numeric) {
      if (hi[k] < lo[k]) return `${LADDER[i].label}: ${k} fell from ${lo[k]} to ${hi[k]}`;
    }
    for (const k of records) {
      for (const [key, v] of Object.entries(lo[k])) {
        if ((hi[k][key] ?? 0) < v) return `${LADDER[i].label}: ${k}.${key} fell from ${v} to ${hi[k][key] ?? 0}`;
      }
    }
    if (hi.totalSports !== lo.totalSports) return `${LADDER[i].label}: the site's sport count moved, hold it fixed`;
  }
  return null;
}

const zeroFacts = () => ({
  totalPlays: 0, totalPoints: 0, longestStreak: 0, bestGameStreak: 0,
  daysPlayed: 0, mostGamesInOneDay: 0, mostSportsInOneDay: 0,
  playsByGame: {}, playsBySport: {}, bestScoreByGame: {}, totalSports: 0,
});

/** One finished game and nothing else. Whatever this earns is what the case
 *  calls a first step, and section 2 pins it. */
const oneFinish = () => ({
  ...zeroFacts(),
  totalSports: SPORT_COUNT,
  totalPlays: 1, totalPoints: 10, longestStreak: 1, bestGameStreak: 1,
  daysPlayed: 1, mostGamesInOneDay: 1, mostSportsInOneDay: 1,
  playsByGame: { 'game-0': 1 }, playsBySport: { 'Sport 0': 1 }, bestScoreByGame: { 'game-0': 40 },
});

const FIRST_STEPS = ['first-finish'];

/* Two players of the same size and opposite shape. One plays one game into the
   ground, the other tries everything once. They are the baseline that catches
   a predicate reading the wrong fact: a breadth test satisfied by depth, or a
   depth test satisfied by breadth, shows up here and nowhere else. */
const SHAPES = [
  {
    label: 'the specialist (one game, 200 times, one sport)',
    mk: () => ({
      ...zeroFacts(), totalSports: SPORT_COUNT,
      totalPlays: 200, totalPoints: 10000, longestStreak: 30, bestGameStreak: 25,
      daysPlayed: 35, mostGamesInOneDay: 1, mostSportsInOneDay: 1,
      playsByGame: { 'game-0': 200 }, playsBySport: { 'Sport 0': 200 },
      bestScoreByGame: { 'game-0': 900 },
    }),
    holds: ['first-finish', 'favourite-five', 'plays-10', 'plays-25', 'plays-60', 'plays-100', 'one-game-25', 'sport-15', 'streak-5', 'streak-21', 'game-streak-10', 'days-10', 'days-30', 'points-5000'],
    lacks: ['three-games', 'two-sports', 'games-10', 'games-25', 'games-50', 'triple-header', 'every-sport', 'every-sport-deep', 'scored-10', 'days-40', 'streak-60', 'points-25000', 'points-100000', 'hidden-marathon', 'hidden-four-sports'],
  },
  {
    label: 'the tourist (39 games once each, every sport, three big days)',
    mk: () => ({
      ...zeroFacts(), totalSports: SPORT_COUNT,
      totalPlays: 39, totalPoints: 800, longestStreak: 2, bestGameStreak: 1,
      daysPlayed: 3, mostGamesInOneDay: 13, mostSportsInOneDay: 5,
      playsByGame: spread('game-', 39, 1, 1),
      playsBySport: spread('Sport ', SPORT_COUNT, 3, 3),
      bestScoreByGame: spread('scored-', 12, 50, 50),
    }),
    holds: ['first-finish', 'three-games', 'two-sports', 'games-10', 'games-25', 'triple-header', 'plays-10', 'plays-25', 'scored-10', 'every-sport', 'every-sport-deep', 'hidden-marathon', 'hidden-four-sports'],
    lacks: ['favourite-five', 'one-game-25', 'plays-60', 'plays-100', 'games-50', 'streak-5', 'streak-21', 'streak-60', 'game-streak-10', 'days-10', 'days-30', 'days-40', 'sport-15', 'points-5000', 'points-25000', 'points-100000'],
  },
];

const fixtures = () => [
  ...rungs().map((f, i) => ({ label: `ladder ${i} (${LADDER[i].label})`, facts: f })),
  { label: 'all zero', facts: zeroFacts() },
  { label: 'one finish', facts: oneFinish() },
  ...SHAPES.map(s => ({ label: s.label, facts: s.mk() })),
];

/* ═══ 0: read only, as code ═══════════════════════════════════════════════ */
section = 0;
console.log('0) read only, as code: neither file writes anything and the case is mounted');
{
  const WRITES = [
    [/\.insert\s*\(/, '.insert('],
    [/\.upsert\s*\(/, '.upsert('],
    [/\.update\s*\(/, '.update('],
    [/\.delete\s*\(/, '.delete('],
    [/\.rpc\s*\(/, '.rpc('],
    [/localStorage\s*\.\s*(setItem|removeItem|clear)/, 'a localStorage write'],
    [/\brecordCompletion\s*\(/, 'recordCompletion('],
    [/\brecordActivity\s*\(/, 'recordActivity('],
    [/\bsaveAuthCompletion\s*\(/, 'saveAuthCompletion('],
    [/\brecordStreakDay\s*\(/, 'recordStreakDay('],
    [/\brecordGameCompletion\s*\(/, 'recordGameCompletion('],
  ];
  for (const file of [LIB, CASE]) {
    const code = stripComments(sourceOf(file));
    for (const [re, name] of WRITES) {
      if (re.test(code)) fail(`${file} contains ${name}, this round is supposed to be read only`);
    }
  }
  /* The one database call, and its shape rather than its spelling. Round 539
     moved it off a table select onto player_game_days, which groups a player's
     activity log into one row per (game, Eastern day) in SQL. So the case
     touches no table directly at all now, and a supabase.from appearing in
     here is either a write or a return to the raw rows. */
  const lib = stripComments(sourceOf(LIB));
  const fromHits = lib.match(/supabase\.from/g) || [];
  if (fromHits.length !== 0) fail(`${LIB} touches supabase.from ${fromHits.length} time(s), the case reads through the player_game_days RPC and nothing else`);
  const rpcHits = lib.match(/supabase\.rpc/g) || [];
  if (rpcHits.length !== 1) fail(`${LIB} touches supabase.rpc ${rpcHits.length} times, expected exactly the one read`);
  const at = lib.indexOf('supabase.rpc');
  const callWindow = at < 0 ? '' : lib.slice(at, at + 400);
  if (!/['"]player_game_days['"]/.test(callWindow)) fail('the database call in achievements.ts is not the player_game_days read');
  /* mounted for real */
  const profile = stripComments(read(PROFILE));
  if (!/<AchievementCase/.test(profile)) fail('AchievementCase is not mounted in src/pages/Profile.tsx');
  console.log(`   ${LIB} and ${CASE} clean, supabase.rpc used ${rpcHits.length} time(s) and supabase.from ${fromHits.length}, mounted on Profile: ${/<AchievementCase/.test(profile)}`);
}

/* ═══ 1: reachable, one by one ════════════════════════════════════════════ */
section = 1;
console.log('1) reachable: every achievement unlocks somewhere on the ladder, and the right ones for the right player');
{
  const RUNGS = rungs();
  const bad = ladderRises(RUNGS);
  if (bad) abort(`the fixture ladder does not rise, fix the harness before reading anything else: ${bad}`);

  const unlockAt = new Map();
  RUNGS.forEach((f, i) => {
    for (const id of earnedIds(f)) if (!unlockAt.has(id)) unlockAt.set(id, i);
  });
  const never = ACHIEVEMENTS.filter(d => !unlockAt.has(d.id));
  for (const d of never) fail(`"${d.id}" is earned by nothing on the ladder, so nobody can reach it`);
  const free = ACHIEVEMENTS.filter(d => unlockAt.get(d.id) === 0);
  for (const d of free) fail(`"${d.id}" is already earned at step 0 with no play at all`);

  const byStep = RUNGS.map((f, i) => `${i}:${earnedIds(f).length}`).join(' ');
  console.log(`   ${ACHIEVEMENTS.length} definitions, ${unlockAt.size} reachable, earned per step ${byStep}`);
  const lines = ACHIEVEMENTS.map(d => `${d.id}@${unlockAt.has(d.id) ? unlockAt.get(d.id) : 'never'}`);
  for (let i = 0; i < lines.length; i += 5) console.log('   ' + lines.slice(i, i + 5).join('  '));

  /* Depth and breadth, told apart. The ladder raises everything together, so a
     definition reading the wrong fact would still unlock on it. These two
     players are the same case from opposite ends: each one names what it must
     hold and what it must not, so a breadth test satisfied by depth is a
     failure with a name on it. */
  for (const shape of SHAPES) {
    const f = shape.mk();
    const has = new Set(earnedIds(f));
    for (const id of shape.holds) if (!has.has(id)) fail(`${shape.label} does not earn "${id}" and should`);
    for (const id of shape.lacks) if (has.has(id)) fail(`${shape.label} earns "${id}" and should not`);
    console.log(`   ${shape.label}: ${has.size} earned, ${shape.holds.length} expected held, ${shape.lacks.length} expected missing`);
  }
}

/* ═══ 2: nothing trivially earned ═════════════════════════════════════════ */
section = 2;
console.log('2) nothing trivial: an empty player earns nothing, one game earns only the first step');
{
  const onZero = earnedIds(zeroFacts());
  if (onZero.length) fail(`an all zero facts object earns ${onZero.join(', ')}`);
  const onOne = earnedIds(oneFinish()).sort();
  const want = [...FIRST_STEPS].sort();
  if (onOne.join('|') !== want.join('|')) {
    fail(`one finished game earns ${onOne.join(', ') || 'nothing'}, the declared first steps are ${want.join(', ')}`);
  }
  /* the empty facts the component seeds with are the real ones, registry sport
     count and all, so they get the same question asked of them */
  const onSeed = earnedIds(emptyAchievementFacts());
  if (onSeed.length) fail(`emptyAchievementFacts() already earns ${onSeed.join(', ')}`);
  console.log(`   zero earns ${onZero.length}, seed earns ${onSeed.length}, one finish earns ${onOne.join(', ') || 'nothing'}`);
}

/* ═══ 3: ids pinned, copy sound ═══════════════════════════════════════════ */
section = 3;
console.log('3) ids: pinned against the list, unique, and the copy is shaped right');
{
  /* Pinned on purpose. An id is the only handle anything has on an
     achievement, so a rename is a silent orphan and has to be a decision
     somebody made here rather than a find and replace that went wide. */
  /* Round 539 re-cut the ladder against real game days rather than activity
     log rows, so five ids moved with it: plays-500, plays-1000, one-game-100,
     sport-25 and days-100 were unreachable by four to eight times once a Club
     Manager evening stopped counting as forty finishes, and are now plays-60,
     plays-10, one-game-25, sport-15 and days-40. The list is re-pinned, which
     is the deliberate decision this check exists to force. */
  const PINNED = [
    'days-10', 'days-30', 'days-40', 'every-sport', 'every-sport-deep',
    'favourite-five', 'first-finish', 'game-streak-10', 'games-10', 'games-25',
    'games-50', 'hidden-four-sports', 'hidden-marathon', 'one-game-25',
    'plays-10', 'plays-100', 'plays-25', 'plays-60', 'points-100000',
    'points-25000', 'points-5000', 'scored-10', 'sport-15', 'streak-21',
    'streak-5', 'streak-60', 'three-games', 'triple-header', 'two-sports',
  ].sort();
  const live = idsOf(ACHIEVEMENTS);
  for (const id of PINNED) if (!live.includes(id)) fail(`pinned id "${id}" is gone from the case, earned state for it is orphaned`);
  for (const id of live) if (!PINNED.includes(id)) fail(`"${id}" is new and not pinned, add it to the list in this harness deliberately`);
  if (new Set(live).size !== live.length) fail('two definitions share an id');

  const RARITIES = ['common', 'uncommon', 'rare', 'legendary'];
  for (const d of ACHIEVEMENTS) {
    if (!/^[a-z0-9-]+$/.test(d.id)) fail(`id "${d.id}" is not a plain lower case slug`);
    if (!d.title || !d.description || !d.emoji) fail(`"${d.id}" is missing a title, description or emoji`);
    if (!RARITIES.includes(d.rarity)) fail(`"${d.id}" has rarity "${d.rarity}"`);
    if (typeof d.hidden !== 'boolean') fail(`"${d.id}" has no hidden flag`);
    if (d.title.length > 30) fail(`"${d.id}" title is ${d.title.length} characters, too long for a tile`);
    for (const s of [d.title, d.description]) {
      for (const ch of s) {
        const c = ch.charCodeAt(0);
        if (c === 8211 || c === 8212) fail(`"${d.id}" copy carries a long dash: ${s}`);
      }
      if (/%/.test(s)) fail(`"${d.id}" copy quotes a percentage: ${s}`);
    }
  }
  const tiers = RARITIES.map(r => `${r} ${ACHIEVEMENTS.filter(d => d.rarity === r).length}`).join(', ');
  console.log(`   ${live.length} ids, all pinned and unique. Tiers: ${tiers}. Hidden: ${ACHIEVEMENTS.filter(d => d.hidden).length}`);
}

/* ═══ 4: hidden stays hidden ══════════════════════════════════════════════ */
section = 4;
console.log('4) hidden: absent from the locked path until earned, counted but never named');
{
  const hidden = ACHIEVEMENTS.filter(d => d.hidden);
  if (hidden.length === 0) fail('there is no hidden achievement, the spec asks for hidden state');
  for (const { label, facts } of fixtures()) {
    const shown = visibleAchievements(facts);
    for (const d of hidden) {
      const entry = shown.find(e => e.def.id === d.id);
      const isEarned = d.earned(facts);
      if (!isEarned && entry) fail(`${label}: locked hidden "${d.id}" is in the shown list`);
      if (isEarned && !entry) fail(`${label}: earned hidden "${d.id}" is missing from the shown list`);
    }
    const remaining = hiddenRemaining(facts);
    const trulyLeft = hidden.filter(d => !d.earned(facts)).length;
    if (remaining !== trulyLeft) fail(`${label}: hiddenRemaining says ${remaining}, ${trulyLeft} are actually still out`);
    /* the shown list is the only thing the display walks, so a locked hidden
       one must not be reachable through it by any field */
    const blob = JSON.stringify(shown.map(e => [e.def.id, e.def.title, e.def.description]));
    for (const d of hidden) {
      if (!d.earned(facts) && (blob.includes(d.id) || blob.includes(d.title))) {
        fail(`${label}: "${d.id}" leaks through the shown list's copy`);
      }
    }
  }
  const R = rungs();
  const top = visibleAchievements(R[R.length - 1]);
  console.log(`   ${hidden.length} hidden, none shown while locked. At the top of the ladder ${top.length} of ${ACHIEVEMENTS.length} are on show, ${hiddenRemaining(R[0])} secret at step 0`);
}

/* ═══ 5: pure ═════════════════════════════════════════════════════════════ */
section = 5;
console.log('5) pure: facts go in untouched, two calls agree, earned agrees with progress');
{
  let calls = 0, mismatches = 0;
  /* fixtures() and not the ones the sections above have already walked: see
     the note on rungs(). A mutation that writes the same thing every time is
     invisible on an object somebody has already called a predicate on. */
  const FRESH = fixtures();
  for (const { label, facts } of FRESH) {
    for (const d of ACHIEVEMENTS) {
      const before = clone(facts);
      const a = d.earned(facts);
      const pa = d.progress(facts);
      if (!deepEqual(facts, before)) {
        fail(`${label}: "${d.id}" changed the facts it was handed`);
        for (const k of Object.keys(facts)) if (!(k in before)) delete facts[k];
        Object.assign(facts, clone(before));
      }
      const b = d.earned(clone(facts));
      const pb = d.progress(clone(facts));
      if (a !== b) fail(`${label}: "${d.id}" answered ${a} then ${b} for the same facts`);
      if (!deepEqual(pa, pb)) fail(`${label}: "${d.id}" reported different progress for the same facts`);
      if (typeof pa.have !== 'number' || typeof pa.need !== 'number' || !Number.isFinite(pa.have) || !Number.isFinite(pa.need)) {
        fail(`${label}: "${d.id}" progress is not two finite numbers`);
      }
      const consistent = pa.need > 0 && pa.have >= pa.need;
      if (consistent !== a) {
        mismatches += 1;
        fail(`${label}: "${d.id}" says earned=${a} while progress says ${pa.have}/${pa.need}`);
      }
      const clamped = achievementProgress(d, facts);
      if (clamped.have > clamped.need) fail(`${label}: "${d.id}" clamped progress ${clamped.have}/${clamped.need} runs past its end`);
      calls += 1;
    }
    /* the display path is held to the same rule */
    const before = clone(facts);
    visibleAchievements(facts);
    hiddenRemaining(facts);
    earnedAchievements(facts);
    if (!deepEqual(facts, before)) {
      fail(`${label}: the display helpers changed the facts they were handed`);
      Object.assign(facts, before);
    }
  }
  console.log(`   ${calls} predicate calls over ${FRESH.length} untouched fixtures, ${mismatches} earned/progress disagreements`);
}

/* ═══ 6: monotone ═════════════════════════════════════════════════════════ */
section = 6;
console.log('6) monotone: more play never takes an achievement away');
{
  const RUNGS = rungs();
  let held = new Set();
  const counts = [];
  RUNGS.forEach((f, i) => {
    const now = new Set(earnedIds(f));
    for (const id of held) {
      if (!now.has(id)) fail(`"${id}" was earned before step ${i} (${LADDER[i].label}) and is not earned at it`);
    }
    if (now.size < held.size) fail(`step ${i} (${LADDER[i].label}) earns ${now.size}, down from ${held.size}`);
    counts.push(now.size);
    held = now;
  });

  /* one fact at a time, lifted off the middle of the ladder. The ladder moves
     everything together, which would hide a definition that reads fact A while
     claiming to measure fact B; this does not. */
  const mid = RUNGS[5];
  const base = new Set(earnedIds(mid));
  let lifts = 0, movers = 0;
  const NUMERIC = ['totalPlays', 'totalPoints', 'longestStreak', 'bestGameStreak', 'daysPlayed', 'mostGamesInOneDay', 'mostSportsInOneDay'];
  for (const k of NUMERIC) {
    for (const mult of [2, 5, 20, 500]) {
      const lifted = { ...clone(mid), [k]: Math.max(1, Math.round(mid[k] * mult)) };
      const now = new Set(earnedIds(lifted));
      for (const id of base) if (!now.has(id)) fail(`lifting ${k} by ${mult}x took "${id}" away`);
      if (now.size > base.size) movers += 1;
      lifts += 1;
    }
  }
  for (const k of ['playsByGame', 'playsBySport', 'bestScoreByGame']) {
    for (const extra of [1, 10, 60]) {
      const grown = clone(mid);
      for (const key of Object.keys(grown[k])) grown[k][key] += 20;
      for (let i = 0; i < extra; i += 1) grown[k][`${k}-extra-${i}`] = 20;
      const now = new Set(earnedIds(grown));
      for (const id of base) if (!now.has(id)) fail(`growing ${k} by ${extra} entries took "${id}" away`);
      if (now.size > base.size) movers += 1;
      lifts += 1;
    }
  }
  console.log(`   earned along the ladder: ${counts.join(' -> ')}`);
  console.log(`   ${lifts} single fact lifts off step 5, ${movers} of them earned something more, none took anything back`);
}

/* ═══ 7: no dead facts ════════════════════════════════════════════════════ */
section = 7;
console.log('7) no dead facts: every field of the facts drives something');
{
  const RUNGS = rungs();
  const top = RUNGS[RUNGS.length - 1];
  const full = new Set(earnedIds(top));
  const dead = [];
  for (const k of Object.keys(top)) {
    if (k === 'totalSports') continue; /* proved by every-sport below, not by knocking it out */
    const knocked = clone(top);
    knocked[k] = typeof top[k] === 'number' ? 0 : {};
    const now = new Set(earnedIds(knocked));
    const lost = [...full].filter(id => !now.has(id));
    if (lost.length === 0) dead.push(k);
    else console.log(`   ${k}: ${lost.length} lost when it is knocked out (${lost.slice(0, 3).join(', ')}${lost.length > 3 ? '...' : ''})`);
  }
  for (const k of dead) fail(`no definition reads facts.${k}, it is dead weight in the shape`);
  /* totalSports is the site's own number, so the check is that the bar moves
     with it rather than sitting on a constant somebody typed */
  const fewer = { ...clone(top), totalSports: SPORT_COUNT + 50 };
  const lostBySports = [...full].filter(id => !new Set(earnedIds(fewer)).has(id));
  if (lostBySports.length === 0) fail('adding 50 sports to the site changed nothing, so every-sport is not reading the registry');
  console.log(`   totalSports: ${lostBySports.join(', ')} go when the site grows 50 sports`);
}

/* ═══ 8: the builder, on real slugs ═══════════════════════════════════════ */
section = 8;
console.log('8) the builder: real routes in, coherent facts out, inputs untouched');
{
  const cats = registry.CATEGORIES.filter(c => c.games.length > 0);
  if (cats.length !== SPORT_COUNT) fail(`the registry has ${cats.length} sports with games, emptyAchievementFacts says ${SPORT_COUNT}`);
  const slugOf = g => g.path.replace(/^\//, '');

  /* one row for the first game of every sport on day one, plus twelve more of
     the very first game spread over twelve days */
  const rows = [];
  for (const c of cats) rows.push({ game: slugOf(c.games[0]), completed_on: '2026-09-01' });
  const favourite = slugOf(cats[0].games[0]);
  for (let i = 0; i < 12; i += 1) rows.push({ game: favourite, completed_on: `2026-09-${String(i + 2).padStart(2, '0')}` });
  rows.push({ game: 'a-route-that-no-longer-exists', completed_on: '2026-09-01' });

  const streaks = {
    version: 1,
    global: { current: 4, longest: 9, lastDate: '2026-09-13' },
    perGame: { [favourite]: { current: 4, longest: 12, lastDate: '2026-09-13' } },
    loginDates: ['2026-09-01'], totalPlays: 40, totalPoints: 6000,
  };
  const scores = { [favourite]: 500 };
  const rowsBefore = clone(rows), streaksBefore = clone(streaks), scoresBefore = clone(scores);
  const f = buildAchievementFacts(rows, streaks, scores, 1200);

  if (!deepEqual(rows, rowsBefore)) fail('buildAchievementFacts edited the rows it was handed');
  if (!deepEqual(streaks, streaksBefore)) fail('buildAchievementFacts edited the streak state it was handed');
  if (!deepEqual(scores, scoresBefore)) fail('buildAchievementFacts edited the scores it was handed');

  /* Round 539: totalPlays is the count of distinct (game, day) pairs and
     nothing else. It used to be Math.max(rows.length, streaks.totalPlays), and
     both of those were inflated: the rows are an activity log, and
     recordStreakDay bumps the local tally outside its own once a day guard.
     The local tally here is 40 against 26 real game days, so an assertion that
     lands on 26 pins that the inflated number is no longer consulted. */
  const distinctPairs = new Set(rows.map(r => `${r.game}|${r.completed_on}`)).size;
  if (f.totalPlays !== distinctPairs) fail(`totalPlays ${f.totalPlays}, expected ${distinctPairs} distinct game days (the local tally of ${streaks.totalPlays} is inflated and must not be consulted)`);
  if (f.totalPoints !== 6000) fail(`totalPoints ${f.totalPoints}, expected the larger of 1200 and the local 6000`);
  if (f.longestStreak !== 9) fail(`longestStreak ${f.longestStreak}, expected 9`);
  if (f.bestGameStreak !== 12) fail(`bestGameStreak ${f.bestGameStreak}, expected 12`);
  if (f.daysPlayed !== 13) fail(`daysPlayed ${f.daysPlayed}, expected 13 distinct days`);
  if (f.mostGamesInOneDay !== cats.length + 1) fail(`mostGamesInOneDay ${f.mostGamesInOneDay}, expected ${cats.length + 1} on day one`);
  if (f.mostSportsInOneDay !== cats.length) fail(`mostSportsInOneDay ${f.mostSportsInOneDay}, expected ${cats.length} on day one`);
  if (Object.keys(f.playsBySport).length !== cats.length) fail(`${Object.keys(f.playsBySport).length} sports mapped from real slugs, expected ${cats.length}`);
  if (f.playsByGame[favourite] !== 13) fail(`the favourite game counted ${f.playsByGame[favourite]} times, expected 13`);
  if (f.playsByGame['a-route-that-no-longer-exists'] !== 1) fail('a retired slug was dropped from the per game counts');
  if (Object.values(f.playsBySport).some(v => v < 1)) fail('a sport came out of the builder with no plays');
  if (f.totalSports !== cats.length) fail(`totalSports ${f.totalSports}, expected ${cats.length}`);

  const earned = earnedIds(f);
  if (!earned.includes('every-sport')) fail('a row in every sport did not earn every-sport');
  if (earned.includes('every-sport-deep')) fail('one row per sport earned the three deep version');
  console.log(`   ${rows.length} real rows over ${cats.length} sports: ${f.daysPlayed} days, best day ${f.mostGamesInOneDay} games and ${f.mostSportsInOneDay} sports, earns ${earned.length}`);
}

/* ═══ 9: monotone across the builder, which is where it broke ═════════════ */
section = 9;
console.log('9) the builder is monotone: appending rows never takes an achievement away');
{
  /* WHY THIS IS NOT SECTION 6 AGAIN. Section 6 walks hand built facts objects
     and proves the earned set only grows as those numbers grow. That layer was
     never wrong. The defect was underneath it: the client read the 1,000 most
     recent game_completions rows, so buildAchievementFacts saw a WINDOW on the
     end of a history rather than the history, and a player who kept playing
     pushed their own past out of it. On a real handle that took nine tiles
     away, both hidden ones included. So the fixture here is ROWS, the thing
     that grows is the row list, and nothing is hand built except the history
     itself.
     The streak state and the saved scores are held fixed across every step on
     purpose: they come from elsewhere, and holding them still means every
     movement in the earned set below is the rows talking. */
  const cats = registry.CATEGORIES.filter(c => c.games.length > 0);
  const slugOf = g => g.path.replace(/^\//, '');
  const DAY_ONE = Date.UTC(2026, 4, 1);
  const day = n => new Date(DAY_ONE + n * 86400000).toISOString().slice(0, 10);

  const firstOfEachSport = cats.map(c => slugOf(c.games[0]));
  const allSlugs = cats.flatMap(c => c.games.map(slugOf));
  const wider = allSlugs.filter(s => !firstOfEachSport.includes(s));
  const favourite = firstOfEachSport[0];
  /* Club Manager is the honest example of the shape that broke this: Round 392
     put an activity ping behind every MATCH, so one evening on it is hundreds
     of rows on one day. Fall back to the favourite if the route ever goes. */
  const burstGame = allSlugs.includes('club-manager') ? 'club-manager' : favourite;

  const STREAKS = {
    version: 1,
    global: { current: 4, longest: 22, lastDate: day(31) },
    perGame: { [favourite]: { current: 4, longest: 11, lastDate: day(31) } },
    loginDates: [day(0)], totalPlays: 40, totalPoints: 30000,
  };
  const SCORES = Object.fromEntries(allSlugs.slice(0, 12).map(s => [s, 250]));

  /* A history somebody could really have, built as rows. One game in every
     sport on the first day, the same again twice so every sport has depth,
     three weeks of coming back to one game, then a spread of other games. */
  const rows = [];
  const put = (game, n) => rows.push({ game, completed_on: day(n) });
  for (const n of [0, 1, 2]) for (const s of firstOfEachSport) put(s, n);
  for (let n = 3; n <= 24; n += 1) put(favourite, n);
  wider.slice(0, 17).forEach((s, i) => put(s, 25 + (i % 7)));
  const startRows = rows.length;

  const APPENDS = [
    {
      label: 'six more days of the game they keep coming back to',
      make: () => Array.from({ length: 6 }, (_, i) => ({ game: favourite, completed_on: day(32 + i) })),
    },
    {
      label: 'twenty five games they had never tried, in one sitting',
      make: () => wider.slice(17, 42).map(s => ({ game: s, completed_on: day(38) })),
    },
    {
      label: 'a quiet week, one game a day',
      make: () => Array.from({ length: 7 }, (_, i) => ({ game: wider[i], completed_on: day(39 + i) })),
    },
    {
      /* The one that matters. 400 rows on ONE day is one game day, and under
         the old read it was 400 rows of window spent on it. */
      label: 'a long evening on one game, 400 rows on one day',
      make: () => Array.from({ length: 400 }, () => ({ game: burstGame, completed_on: day(46) })),
    },
    {
      label: 'a second session the same day, 900 rows more',
      make: () => Array.from({ length: 900 }, () => ({ game: burstGame, completed_on: day(46) })),
    },
  ];

  const ROW_NUMERIC = ['totalPlays', 'daysPlayed', 'mostGamesInOneDay', 'mostSportsInOneDay'];
  const ROW_RECORDS = ['playsByGame', 'playsBySport'];
  /* The earned set comes off a COPY of the facts every time. Whether a
     predicate edits what it is handed is section 5's question, and a predicate
     that does would stamp a key onto the facts this section then compares
     against the next step's fresh ones, which reads as a count that fell. This
     section is about the builder, so it keeps its own fixtures untouched. */
  const earnedFrom = f => new Set(earnedIds(clone(f)));

  let prevFacts = buildAchievementFacts(rows, STREAKS, SCORES, 0);
  let prevEarned = earnedFrom(prevFacts);
  const baseEarned = new Set(prevEarned);

  /* A superset test over a player who earned nothing passes every time and
     means nothing, so the starting history has to be somebody real first. */
  if (baseEarned.size === 0) fail('the starting history earns nothing, so every superset test below would pass for the wrong reason');
  /* And it has to earn the DEEP ones, because those are what a window takes
     away. If the fixture stops reaching them the section still passes while
     testing nothing, which is the same failure wearing a different hat. */
  const MUST_REACH = ['every-sport', 'every-sport-deep', 'games-25', 'one-game-25', 'days-30', 'hidden-marathon', 'hidden-four-sports'];
  for (const id of MUST_REACH) {
    if (!prevEarned.has(id)) fail(`the starting history does not earn "${id}", so this section has nothing deep for an append to take away`);
  }
  console.log(`   start: ${startRows} rows, ${prevFacts.totalPlays} game days over ${prevFacts.daysPlayed} days, ${baseEarned.size} earned`);

  for (const step of APPENDS) {
    rows.push(...step.make());
    const f = buildAchievementFacts(rows, STREAKS, SCORES, 0);

    for (const k of ROW_NUMERIC) {
      if (f[k] < prevFacts[k]) fail(`after "${step.label}" facts.${k} fell from ${prevFacts[k]} to ${f[k]}, the history only grew`);
    }
    for (const k of ROW_RECORDS) {
      for (const [key, v] of Object.entries(prevFacts[k])) {
        if ((f[k][key] ?? 0) < v) fail(`after "${step.label}" ${k}.${key} fell from ${v} to ${f[k][key] ?? 0}`);
      }
    }
    const now = earnedFrom(f);
    const lost = [...prevEarned].filter(id => !now.has(id));
    if (lost.length) {
      fail(`after "${step.label}" (${rows.length} rows) ${lost.length} achievement(s) un earned themselves: ${lost.slice(0, 6).join(', ')}${lost.length > 6 ? ' and more' : ''}`);
    }
    const gained = [...now].filter(id => !prevEarned.has(id));
    console.log(`   + ${step.label}: ${rows.length} rows, ${f.totalPlays} game days, ${now.size} earned${gained.length ? ` (new: ${gained.join(', ')})` : ''}`);
    prevFacts = f;
    prevEarned = now;
  }

  const lostOverall = [...baseEarned].filter(id => !prevEarned.has(id));
  if (lostOverall.length) fail(`over the whole run ${lostOverall.length} achievement(s) went missing: ${lostOverall.join(', ')}`);
  console.log(`   ${APPENDS.length} append steps, ${startRows} rows to ${rows.length}, earned ${baseEarned.size} -> ${prevEarned.size}, never fewer`);

  /* A history is a set, not a queue, so where a row sits in the list cannot
     matter. If it does, something is reading a slice rather than the lot, and
     that is the defect itself in one line: the same rows in the other order. */
  const reversedFacts = buildAchievementFacts([...rows].reverse(), STREAKS, SCORES, 0);
  for (const k of ROW_NUMERIC) {
    if (reversedFacts[k] !== prevFacts[k]) {
      fail(`the same ${rows.length} rows in the opposite order give facts.${k} of ${reversedFacts[k]} instead of ${prevFacts[k]}, so something is reading a slice of the history`);
    }
  }
  const reversedEarned = earnedFrom(reversedFacts);
  const orderDiff = [...prevEarned].filter(id => !reversedEarned.has(id));
  if (orderDiff.length || reversedEarned.size !== prevEarned.size) {
    fail(`the same ${rows.length} rows in the opposite order earn ${reversedEarned.size} instead of ${prevEarned.size}${orderDiff.length ? `, missing ${orderDiff.slice(0, 6).join(', ')}` : ''}`);
  }
  console.log(`   the same ${rows.length} rows reversed: ${reversedFacts.totalPlays} game days, ${reversedEarned.size} earned, identical`);

  /* The property all of the above rests on: a row is an ACTIVITY, a finish is
     a game on a day. Measured on production, 376,818 rows are 25,182 distinct
     (player, game, Eastern day) triples, and the busiest handle's 6,440 rows
     are 49 real game days, a factor of 131. The local tally handed in here is
     40, the inflated number that used to win a Math.max, so this pins both
     halves at once. */
  const oneEvening = Array.from({ length: 40 }, () => ({ game: burstGame, completed_on: day(60) }));
  const evening = buildAchievementFacts(oneEvening, STREAKS, {}, 0);
  if (evening.totalPlays !== 1) fail(`40 rows of one game on one day came out as ${evening.totalPlays} finishes, they are one game day`);
  if (evening.playsByGame[burstGame] !== 1) fail(`40 rows of one game on one day counted ${evening.playsByGame[burstGame]} plays of it, expected 1`);
  if (evening.daysPlayed !== 1) fail(`40 rows on one day counted ${evening.daysPlayed} days`);
  if (evening.mostGamesInOneDay !== 1) fail(`40 rows of ONE game counted ${evening.mostGamesInOneDay} different games in the day`);
  console.log(`   40 rows of ${burstGame} on one day: ${evening.totalPlays} finish, ${evening.daysPlayed} day, ${evening.mostGamesInOneDay} game (local tally handed in was ${STREAKS.totalPlays})`);
}

/* ═══ 10: nothing written, through the real call graph ════════════════════ */
section = 10;
console.log('10) read only, at runtime: loadAchievementFacts against a recording localStorage');
{
  /* WHY THIS IS NOT SECTION 0 AGAIN. Section 0 greps two files for write
     verbs. The write was in neither: loadAchievementFacts called
     getCurrentPlayerName in src/lib/completions.ts, that falls through to
     getGuestHandle, and getGuestHandle mints a handle off Math.random and
     stores it when there is not one. Opening /profile as a signed in user
     whose row carries no display_name and no username therefore wrote. No
     grep of these two files could ever see that, so this runs the call and
     counts what the storage was asked to do.
     The key is spelled out here rather than imported because completions.ts
     keeps it private. If it is ever renamed this check goes red asking why,
     which is the right conversation to have. */
  const GUEST_KEY = 'dukb-guest-handle';
  const CASES = [
    {
      label: 'signed in, profile row has neither a display name nor a username',
      seed: {},
      profile: { display_name: null, username: null },
    },
    {
      label: 'a guest with nothing stored yet',
      seed: {},
      profile: null,
    },
    {
      /* Round 318 regenerates a pre Round 299 handle on sight, so the minting
         path writes for this one even though a handle IS stored. A reader must
         leave it alone. */
      label: 'a guest still holding a pre Round 318 handle',
      seed: { [GUEST_KEY]: 'Baller-1234' },
      profile: undefined,
    },
  ];

  /* The supabase client reads its own auth key once on load, asynchronously,
     so let that land before the first case. Left alone it turns up inside
     whichever case happens to be running and the per case output moves about.
     A WRITE from module load would be a different matter, so it is checked
     rather than waved through. */
  await new Promise(r => { setTimeout(r, 50); });
  for (const w of storage.writes.slice()) {
    fail(`loading the achievement case wrote "${w.key}" (${w.op}) before anything was called`);
  }

  let totalWrites = 0;
  for (const c of CASES) {
    storage.reset(c.seed);
    const facts = await loadAchievementFacts(c.profile, {}, 0);
    const wrote = storage.writes.slice();
    const readKeys = [...new Set(storage.reads)];

    /* Zero writes because the call never got there is not a pass. The handle
       key is the exact spot that used to mint, so the call has to have read
       it for the count above to mean anything. */
    if (!readKeys.includes(GUEST_KEY)) {
      fail(`${c.label}: the call never read ${GUEST_KEY}, so counting zero writes proves nothing about the path that used to mint`);
    }
    for (const w of wrote) {
      fail(`${c.label}: loadAchievementFacts did ${w.op} on "${w.key}"${w.value === null ? '' : ` = "${w.value}"`}, the case promises it writes nothing`);
    }
    if (!facts || typeof facts.totalSports !== 'number') fail(`${c.label}: no facts came back from loadAchievementFacts`);
    totalWrites += wrote.length;
    console.log(`   ${c.label}: ${wrote.length} writes, read ${readKeys.length} key(s) (${readKeys.join(', ')})`);
  }
  console.log(`   ${CASES.length} reader shapes through the real call graph, ${totalWrites} localStorage writes in total`);
}

/* ─── verdict ─────────────────────────────────────────────────────────────── */
try { fs.rmSync(TMP, { recursive: true, force: true }); } catch { /* temp only */ }

const total = failures.reduce((a, b) => a + b, 0);
console.log('');
if (CONTROL) {
  const own = CONTROLS[CONTROL].sec;
  if (failures[own] > 0) {
    console.log(`control "${CONTROL}": ${failures[own]} failure(s) fired in section ${own} as expected, the check works`);
    process.exit(0);
  }
  abort(`control "${CONTROL}": changed NOTHING in section ${own}, the check is dead`);
}
if (total > 0) {
  console.error(`simAchievements: ${total} failure${total === 1 ? '' : 's'} (${failures.map((n, i) => `${i}:${n}`).filter(s => !s.endsWith(':0')).join(' ')})`);
  process.exit(1);
}
console.log('simAchievements: all green. Every one reachable, none free, none writing.');
