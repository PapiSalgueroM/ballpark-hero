/* Round 476: the Conquest daily cannot be replayed with the answers known.
 *
 * THE DEFECT. The season on /conquest, /conquest-nba, /conquest-mlb,
 * /conquest-nhl and /soccer-conquest is seeded from the ET date, and until
 * this round NOTHING was written down between the first pick and the final
 * screen. A player who reloaded on the last matchday was handed the identical
 * season back with every result already known, and could call every game
 * right. That is a points exploit, not a polish item, and it sat on all five
 * routes because four of them were private copies of one screen.
 *
 * THE FIX IT HOLDS. The run is recorded AS IT GOES, as an action log rather
 * than a state dump: the club the player rode plus the winner they called
 * each round, written after the pick and after every settled round, replayed
 * on mount by src/lib/conquestRun.ts.
 *
 * WHAT THIS MEASURES, through the REAL modules (conquestRun, conquestDaily,
 * imperialismEngine) with the sports the routes inject, on all five sports:
 *   1. THE LOG REPLAYS THE RUN. At every settled round of a full season, a
 *      store carrying only what had been written by then restores, through
 *      the same restoreDailyRun the board calls, a run byte identical to the
 *      live one: the same map, records, pairings, calls, hits and phase.
 *   2. NO RELOAD PAYS MORE. The season's results do not depend on the calls,
 *      so a perfect caller is computable and is the ceiling. For every round
 *      of every sport, the best score reachable by reloading there and then
 *      calling everything right is compared against simply carrying on
 *      without reloading. The gain must be zero at every one of them. The
 *      ceiling and the honest run are printed, so the size of the exploit
 *      this closes is on the record.
 *   3. A FINISHED DAY STAYS FINISHED. After the run ends, twenty reloads in a
 *      row restore nothing playable, return the same result byte for byte,
 *      leave the streak alone, and none of them re-enters a scoring run, so
 *      no sequence of reloads can record a second completion. The ceiling is
 *      also checked against the engine's own perfectScore, so no reachable
 *      run can outscore the leaderboard cap.
 *   4. THE FIVE SPORTS ARE ONE BOARD. Every conquest route renders
 *      ImperialismBoardShared with a sport injected, and no other board file
 *      exists, so sections 1 to 3 measured on five sports measured one code
 *      path five times over rather than five code paths once.
 *   5. SOURCE BACKSTOP. Every path in the board that produces a new run is
 *      DERIVED from the source (each function containing startRun or
 *      playRound), and each must write the log in the same function; the
 *      restore must sit in a useState initialiser. The count of those paths
 *      is printed and floored, so a sixth path added later cannot walk past a
 *      check written for today's two. The inline negative removes one write
 *      and the checker must go red.
 *
 * NEGATIVE CONTROLS (SIM_CONQUEST_DAILY_CONTROL=...), each running against a
 * temp copy of the real modules and refusing to run if its rewrite changed
 * nothing:
 *   nolog       saveDailyRun only writes a FINISHED run, which is exactly the
 *               shipped defect: nothing between the pick and the final
 *               screen. Sections 1 and 2 must go red.
 *   replayable  restoreDailyRun stops refusing a finished day, so a completed
 *               daily comes back playable. Section 3 must go red.
 *
 * Run: node scripts/simConquestDaily.mjs
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..').replace(/\\/g, '/');
const TMP = os.tmpdir().replace(/\\/g, '/');
const BOARD_SRC = `${ROOT}/src/components/conquest/ImperialismBoardShared.tsx`;
const CONTROL = process.env.SIM_CONQUEST_DAILY_CONTROL || '';
const KNOWN_CONTROLS = ['nolog', 'replayable'];
if (CONTROL && !KNOWN_CONTROLS.includes(CONTROL)) {
  console.error(`SIM_CONQUEST_DAILY_CONTROL=${CONTROL} is not a control this harness knows (${KNOWN_CONTROLS.join(', ')})`);
  process.exit(1);
}
const DATE = '2026-09-12';
const norm = s => s.replace(/\r\n/g, '\n');
let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };
const refuse = m => { console.error(`control ${CONTROL}: ${m}, refusing to run a dead control`); process.exit(1); };

/* ---------- the modules, copied so a control can rewrite one ----------
   conquestRun, conquestDaily and imperialismEngine import each other with
   relative paths, so a control copy of one of them only bites if all of them
   move together. conquestMomentum comes along for the same reason; everything
   they reach through the @ alias (dateUtils, dailyRecord) stays the real
   file. */
const LIB = `${TMP}/conquestDailyCtl`;
fs.rmSync(LIB, { recursive: true, force: true });
fs.mkdirSync(LIB, { recursive: true });
const COPIED = ['conquestRun.ts', 'conquestDaily.ts', 'imperialismEngine.ts', 'conquestMomentum.ts'];
const sources = new Map();
for (const f of COPIED) {
  const src = norm(fs.readFileSync(`${ROOT}/src/lib/${f}`, 'utf8'));
  sources.set(f, src);
  fs.writeFileSync(`${LIB}/${f}`, src);
}
function controlRewrite(file, needle, replacement, what) {
  const src = sources.get(file);
  if (!src.includes(needle)) refuse(`the line to rewrite is not in src/lib/${file} (${needle})`);
  const rewritten = src.split(needle).join(replacement);
  if (rewritten === src) refuse('the rewrite changed nothing');
  fs.writeFileSync(`${LIB}/${file}`, rewritten);
  console.log(`NEGATIVE CONTROL ON (${CONTROL}): ${what}`);
}
if (CONTROL === 'nolog') {
  controlRewrite(
    'conquestDaily.ts',
    '  writeDailyRecord(dailySlug(sport), dateStr, { team: run.team, picks: run.picks, done: run.done, result: run.result });',
    '  if (run.done) writeDailyRecord(dailySlug(sport), dateStr, { team: run.team, picks: run.picks, done: run.done, result: run.result });',
    'only a FINISHED run is written, which is the pre Round 476 behaviour; sections 1 and 2 must go red',
  );
}
if (CONTROL === 'replayable') {
  controlRewrite(
    'conquestRun.ts',
    '  if (!saved || saved.done || !sport.teams.some(t => t.id === saved.team)) return null;',
    '  if (!saved || !sport.teams.some(t => t.id === saved.team)) return null;',
    'a finished daily is restored as a playable run; section 3 must go red',
  );
}

/* ---------- bundle the real modules ---------- */
const ENTRY = `${TMP}/conquestDaily.entry.mjs`;
const BUNDLE = `${TMP}/conquestDaily.bundle.cjs`;
fs.writeFileSync(ENTRY, `
export * as runlib from '${LIB}/conquestRun.ts';
export * as daily from '${LIB}/conquestDaily.ts';
export * as eng from '${LIB}/imperialismEngine.ts';
export * as usSports from '${ROOT}/src/data/conquestSports.ts';
export { SOCCER_IMPERIALISM, SOCCER_CONQUEST_GAME } from '${ROOT}/src/data/soccerConquest.ts';
`);
execSync(`"${ROOT}/node_modules/.bin/esbuild" "${ENTRY}" --bundle --format=cjs --platform=node --alias:@=${ROOT}/src --outfile="${BUNDLE}" --log-level=error`, {
  stdio: 'inherit',
  env: { ...process.env, NODE_PATH: `${ROOT}/node_modules` },
});

/* A real enough localStorage: writeDailyRecord walks length and key(i) to
   prune yesterday, so a stub without them would leave that code unexercised. */
const store = new Map();
globalThis.localStorage = {
  getItem: k => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: k => store.delete(k),
  clear: () => store.clear(),
  key: i => [...store.keys()][i] ?? null,
  get length() { return store.size; },
};
const { runlib, daily, eng, usSports, SOCCER_IMPERIALISM, SOCCER_CONQUEST_GAME } = createRequire(import.meta.url)(BUNDLE);

const SPORTS = [
  { sport: usSports.NFL_IMPERIALISM, game: usSports.NFL_CONQUEST_GAME },
  { sport: usSports.NBA_IMPERIALISM, game: usSports.NBA_CONQUEST_GAME },
  { sport: usSports.MLB_IMPERIALISM, game: usSports.MLB_CONQUEST_GAME },
  { sport: usSports.NHL_IMPERIALISM, game: usSports.NHL_CONQUEST_GAME },
  { sport: SOCCER_IMPERIALISM, game: SOCCER_CONQUEST_GAME },
];

/* ---------- the board's own loop, over the real modules ----------
   start, then preview -> playRound -> recap -> continueRun, with the daily
   record written exactly where ImperialismBoardShared writes it (section 5
   holds it to that). A snapshot is the store as it stood after each write,
   which is what a reload at that moment would read. */
function playDaily(sport, favorite, caller) {
  store.clear();
  const rng = daily.dailyConquestRng(sport.key, DATE);
  let run = runlib.startRun(sport, favorite, rng);
  daily.saveDailyRun(sport.key, runlib.dailyRunRecord(run), DATE);
  const snaps = [];
  let guard = 0;
  while (run.phase !== 'done') {
    if (guard++ > 400) throw new Error('the season did not end');
    if (run.phase === 'preview') {
      const call = caller(run, snaps.length);
      run = runlib.playRound(sport, run, call, rng);
      daily.saveDailyRun(sport.key, runlib.dailyRunRecord(run), DATE);
      snaps.push({ run, store: new Map(store) });
    } else {
      run = runlib.continueRun(sport, run, rng);
    }
  }
  const result = {
    date: DATE,
    team: run.favorite,
    score: runlib.runScore(run),
    empire: eng.statesOf(run.owners, run.favorite).length,
    calls: run.hits,
    callsTotal: run.picks.length,
    champion: run.champion,
    championWasYou: run.champion === run.favorite,
  };
  const streak = daily.saveDailyResult(sport.key, result, DATE, run.picks);
  return { run, snaps, result, streak, finalStore: new Map(store) };
}

/** The winner of the game the player was asked to call, each round in order.
 *  Independent of what the player called, which is what makes a perfect
 *  caller computable and makes it the ceiling. */
function calledWinners(sport, favorite) {
  const homeCaller = run => runlib.featuredPairing(sport, run)[0];
  const played = playDaily(sport, favorite, homeCaller);
  return played.snaps.map(s => {
    const featured = runlib.featuredPairing(sport, { ...s.run, pairings: s.run.pairings });
    const g = runlib.featuredResult(s.run, featured);
    return g ? g.winner : null;
  });
}

const restoreInto = (snapStore, sport) => {
  store.clear();
  for (const [k, v] of snapStore) store.set(k, v);
  return runlib.restoreDailyRun(sport, DATE);
};

const canon = run => JSON.stringify({
  favorite: run.favorite, owners: run.owners, records: run.records, round: run.round,
  bracket: run.bracket, pairings: run.pairings, champion: run.champion,
  madePlayoffs: run.madePlayoffs, picks: run.picks, hits: run.hits, phase: run.phase,
  lastRound: run.lastRound && { round: run.lastRound.round, label: run.lastRound.label, headlines: run.lastRound.headlines, games: run.lastRound.games },
});

/* ---------- 1: the log replays the run, at every round ---------- */
console.log(`1) A store holding only what was written by round N restores the identical run, every N, every sport (${DATE})`);
const played = new Map();
{
  for (const { sport } of SPORTS) {
    const favorite = sport.teams[3].id;
    const winners = calledWinners(sport, favorite);
    /* A caller that is right sometimes and wrong sometimes, so hits, misses
       and the score all have to survive the replay rather than a run of one. */
    const mixed = (run, i) => (i % 3 === 0 ? winners[i] : runlib.featuredPairing(sport, run).find(id => id !== winners[i]) ?? winners[i]);
    const live = playDaily(sport, favorite, mixed);
    played.set(sport.key, { live, winners, favorite });
    let same = 0, differed = [];
    for (let i = 0; i < live.snaps.length; i++) {
      const restored = restoreInto(live.snaps[i].store, sport);
      if (!restored) { differed.push(`round ${i + 1}: nothing restored`); continue; }
      if (canon(restored.run) === canon(live.snaps[i].run)) same += 1;
      else differed.push(`round ${i + 1}: the restored run is not the live one`);
    }
    console.log(`   ${sport.key}: ${live.snaps.length} settled rounds, ${same} restored identical, ${live.run.hits}/${live.run.picks.length} called, champion ${live.run.champion}, score ${live.result.score}`);
    for (const d of differed.slice(0, 3)) fail(`${sport.key} ${d}`);
    if (differed.length > 3) fail(`${sport.key}: and ${differed.length - 3} more rounds did not restore`);
    if (live.snaps.length < 4) fail(`${sport.key} settled only ${live.snaps.length} rounds, too few to have measured anything`);
  }
}

/* ---------- 2: no reload pays more than carrying on ---------- */
console.log('2) Reloading at any round and then calling everything right pays no more than not reloading');
{
  for (const { sport } of SPORTS) {
    const { live, winners, favorite } = played.get(sport.key);
    const rounds = winners.length;
    /* The ceiling: every call right from the first round. Under the old code
       this was reachable from ANY reload, because a reload dealt the same
       season back with nothing recorded. */
    const perfect = playDaily(sport, favorite, (_run, i) => winners[i]);
    const ceiling = perfect.result.score;
    played.get(sport.key).ceiling = ceiling;

    /* Carrying on without reloading: the live run's calls up to N, then every
       remaining call right. Reloading at N and doing the same must land on
       exactly this, or the reload bought something. */
    const continueFrom = (n, viaReload) => {
      const seed = viaReload ? restoreInto(live.snaps[n - 1].store, sport) : null;
      if (viaReload && !seed) return null;
      const rng = daily.dailyConquestRng(sport.key, DATE);
      let run = viaReload ? seed.run : runlib.replayRun(sport, favorite, live.run.picks.slice(0, n), rng);
      const useRng = viaReload ? seed.rng : rng;
      let i = n;
      let guard = 0;
      while (run.phase !== 'done') {
        if (guard++ > 400) throw new Error('the continuation did not end');
        if (run.phase === 'preview') { run = runlib.playRound(sport, run, winners[i], useRng); i += 1; }
        else run = runlib.continueRun(sport, run, useRng);
      }
      return runlib.runScore(run);
    };

    /* The results do not depend on the calls, so every one of these runs
       ends on the same map with the same crown and differs from the ceiling
       by exactly the calls already missed. That is the arithmetic statement
       of "the calls already made are locked", and it is what is asserted
       rather than a loose inequality. */
    let worstGain = 0, gains = 0, missing = 0, wrongLock = 0, biggestLock = 0;
    for (let n = 1; n < rounds; n++) {
      const straight = continueFrom(n, false);
      const reloaded = continueFrom(n, true);
      if (reloaded == null) { missing += 1; continue; }
      const gain = reloaded - straight;
      if (gain > 0) gains += 1;
      if (gain > worstGain) worstGain = gain;
      const missed = n - live.snaps[n - 1].run.hits;
      const locked = missed * eng.POINTS_PER_CALL;
      if (locked > biggestLock) biggestLock = locked;
      if (reloaded !== ceiling - locked) wrongLock += 1;
    }
    console.log(`   ${sport.key}: ceiling ${ceiling} (every call right), honest run ${live.result.score}; ${rounds - 1} reload points, ${gains} where reloading gained points (biggest ${worstGain}), ${wrongLock} where the score did not equal the ceiling minus the calls already missed; most a reload could have bought before this round ${biggestLock}`);
    if (missing > 0) fail(`${sport.key}: ${missing} reload points restored nothing at all`);
    if (gains > 0) fail(`${sport.key}: reloading gained points at ${gains} of ${rounds - 1} rounds, up to ${worstGain}`);
    if (wrongLock > 0) fail(`${sport.key}: at ${wrongLock} reload points the reachable score was not the ceiling minus the calls already missed, so the log is not what decides the score`);
    if (biggestLock <= 0) fail(`${sport.key}: the live run missed nothing, so there was no locked call for a reload to be denied and this section measured nothing`);
    if (ceiling <= live.result.score) fail(`${sport.key}: the perfect run does not outscore the honest one (${ceiling} vs ${live.result.score}), so this section has no exploit to measure`);
  }
}

/* ---------- 3: a finished day stays finished ---------- */
console.log('3) After the season ends, twenty reloads restore nothing playable and the result never moves');
{
  for (const { sport } of SPORTS) {
    const { live } = played.get(sport.key);
    let playable = 0, drifted = 0, streakMoved = 0;
    const first = JSON.stringify(live.result);
    for (let i = 0; i < 20; i++) {
      const restored = restoreInto(live.finalStore, sport);
      if (restored) playable += 1;
      const back = daily.loadDailyResult(sport.key, DATE);
      if (JSON.stringify(back) !== first) drifted += 1;
      if (daily.loadDailyStreak(sport.key, DATE) !== live.streak) streakMoved += 1;
    }
    const cap = eng.perfectScore(sport);
    const ceiling = played.get(sport.key).ceiling;
    console.log(`   ${sport.key}: 20 reloads, ${playable} restored a playable run, ${drifted} changed the stored result, ${streakMoved} moved the streak; ceiling ${ceiling} against the leaderboard cap ${cap}`);
    if (playable > 0) fail(`${sport.key}: ${playable} of 20 reloads walked back into a scoring run, so a second completion can be recorded`);
    if (drifted > 0) fail(`${sport.key}: the stored result changed on ${drifted} of 20 reloads`);
    if (streakMoved > 0) fail(`${sport.key}: the streak moved on ${streakMoved} of 20 reloads`);
    if (ceiling > cap) fail(`${sport.key}: the best reachable run scores ${ceiling}, above the leaderboard cap ${cap}`);
  }
}

/* ---------- 4: the five sports are one board ---------- */
console.log('4) Every conquest route renders the one shared board with a sport injected');
const stripComments = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
{
  const dir = `${ROOT}/src/components/conquest`;
  const boards = fs.readdirSync(dir).filter(f => /^Imperialism.*\.tsx$/.test(f));
  const pages = [
    ['Conquest.tsx', 'NFL_IMPERIALISM'],
    ['ConquestNba.tsx', 'NBA_IMPERIALISM'],
    ['ConquestMlb.tsx', 'MLB_IMPERIALISM'],
    ['ConquestNhl.tsx', 'NHL_IMPERIALISM'],
    ['SoccerConquest.tsx', 'SOCCER_IMPERIALISM'],
  ];
  let wired = 0;
  for (const [file, sportName] of pages) {
    const src = stripComments(norm(fs.readFileSync(`${ROOT}/src/pages/${file}`, 'utf8')));
    const rendersShared = /<ImperialismBoardShared\b/.test(src) && src.includes(`sport={${sportName}}`);
    if (rendersShared) wired += 1;
    else fail(`src/pages/${file} does not render ImperialismBoardShared with sport={${sportName}}`);
  }
  console.log(`   imperialism board files in src/components/conquest: ${boards.join(', ')}; routes wired to the shared board: ${wired} of ${pages.length}`);
  if (boards.length !== 1 || boards[0] !== 'ImperialismBoardShared.tsx') {
    fail(`expected exactly one imperialism board, found ${boards.length}: ${boards.join(', ')}`);
  }
  /* Five sport keys, five completion keys, no two routes sharing a record. */
  const keys = SPORTS.map(s => s.sport.key);
  const ids = SPORTS.map(s => s.game.gameId);
  const slugs = keys.map(k => daily.dailySlug(k));
  console.log(`   sport keys ${keys.join(', ')}; daily record slugs ${slugs.join(', ')}`);
  if (new Set(keys).size !== 5) fail('two sports share a key, so they share a daily record');
  if (new Set(ids).size !== 5) fail('two sports share a completion key');
  if (new Set(slugs).size !== 5) fail('two sports share a daily record slug');
}

/* ---------- 5: source backstop, with the paths derived ---------- */
console.log('5) Every path in the board that produces a new run writes the log in the same function');
{
  const raw = stripComments(norm(fs.readFileSync(BOARD_SRC, 'utf8')));
  /** Every `const name = (...) => { ... }` body, by brace matching. */
  function bodies(code) {
    const out = [];
    const re = /const\s+([A-Za-z_$][\w$]*)\s*=\s*\([^)]*\)\s*=>\s*\{/g;
    let m;
    while ((m = re.exec(code))) {
      const open = m.index + m[0].length - 1;
      let depth = 0, close = -1;
      for (let i = open; i < code.length; i += 1) {
        if (code[i] === '{') depth += 1;
        else if (code[i] === '}') { depth -= 1; if (depth === 0) { close = i; break; } }
      }
      if (close > 0) out.push({ name: m[1], body: code.slice(open, close + 1) });
    }
    return out;
  }
  function audit(code) {
    const producers = bodies(code).filter(b => /\bstartRun\s*\(|\bplayRound\s*\(/.test(b.body));
    const unwritten = producers.filter(b => !/\bsaveDailyRun\s*\(/.test(b.body)).map(b => b.name);
    const restores = /useState<[^>]*>\(\s*\(\)\s*=>\s*restoreDailyRun\s*\(/.test(code);
    return { producers: producers.map(b => b.name), unwritten, restores };
  }
  const real = audit(raw);
  console.log(`   run producing paths: ${real.producers.join(', ') || 'none'}; without a log write: ${real.unwritten.join(', ') || 'none'}; restore sits in a useState initialiser: ${real.restores ? 'yes' : 'NO'}`);
  if (real.producers.length < 2) fail(`only ${real.producers.length} path(s) in the board produce a run, which is fewer than the pick and the round, so this section read the wrong thing`);
  if (real.unwritten.length > 0) fail(`these board paths change the run without recording it: ${real.unwritten.join(', ')}`);
  if (!real.restores) fail('the board does not restore through restoreDailyRun in a useState initialiser, so a reload lands after the first paint');
  /* The inline negative: the same audit on a copy with one write removed must
     name that path, or green above means the audit did not look. */
  const cut = raw.replace(/\bsaveDailyRun\s*\([^;]*\);/, '');
  if (cut === raw) fail('the section 5 negative could not remove the write it just found');
  else {
    const without = audit(cut);
    if (without.unwritten.length === 0) fail('the backstop stays green with a log write removed, the check is dead');
    else console.log(`   negative: with one saveDailyRun call removed the audit names ${without.unwritten.join(', ')}, so it is reading the code`);
  }
}

if (CONTROL) {
  if (failures > 0) { console.log(`\ncontrol "${CONTROL}": ${failures} failure(s) fired as expected, the check works`); process.exitCode = 0; }
  else { console.error(`\ncontrol "${CONTROL}": changed NOTHING, the check is dead`); process.exitCode = 1; }
} else {
  console.log(failures === 0 ? '\nALL CONQUEST DAILY CHECKS PASSED' : `\n${failures} FAILURES`);
  process.exitCode = failures === 0 ? 0 : 1;
}
