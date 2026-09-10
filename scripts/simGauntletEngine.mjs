/* Gauntlet Draft, the generic engine (Round 520): the same draft-then-cup
 * game as scripts/simGauntletDraft.mjs proved for soccer, now shared by
 * src/lib/gauntletEngine.ts across three sports, and bound to two of them
 * beyond soccer this round: NBA (src/lib/gauntletDraftNba.ts) and NFL
 * (src/lib/gauntletDraftNfl.ts). NHL and MLB are not bound yet; this file
 * only covers the three sports that exist as of Round 520.
 *
 * WHAT IT HOLDS:
 *   1. THE SOCCER REGRESSION, the single most important thing this round
 *      had to prove: a hand transcribed golden copy of the PRE-REFACTOR
 *      buildDraft/runGauntlet algorithm (written directly into this file,
 *      not imported, so it cannot silently drift with the refactor it is
 *      meant to check) compared against the real, live, post-refactor
 *      src/lib/gauntletDraft.ts (which now delegates through
 *      src/lib/gauntletEngine.ts) across 300 seeds. Byte identical output,
 *      draft and gauntlet both, or the refactor changed soccer's game.
 *   2. THE DEAL LAW, NBA and NFL separately, over 300 seeded drafts each:
 *      the right number of distinct fitting picks, no duplicate dealt in
 *      one draft, and a measured genuine-choice floor (best card vs worst
 *      card in a pick separated by a real measured gap, floor set from
 *      measured headroom, not a number that felt right; see the floor
 *      comments below for the actual measurements).
 *   3. DETERMINISM, NBA and NFL: one seed one draft, one finished squad one
 *      cup run, byte identical on the replay; a year of daily seeds deals a
 *      year of genuinely different drafts.
 *   4. THE CUP REWARDS THE DRAFT, NBA and NFL, measured not hoped: over 300
 *      drafts each, the always-best-card squad clears more rounds on
 *      average than the always-worst-card squad by a wide measured margin,
 *      and lifts the trophy a real share of the time while the worst-card
 *      squad almost never does.
 *   5. THE DAILY LOCK, NBA and NFL: a finished daily run saved under its
 *      date reads back byte identical, another date reads nothing, and a
 *      record that is tampered, stale or wreckage reads null so the page
 *      deals a fresh daily instead of drawing a screen that adds up to
 *      nothing.
 *
 * NEGATIVE CONTROLS, both applied through the shared engine now rather than
 * a per-sport file, because the engine is what actually runs every sport:
 *   SIM_GAUNTLET_ENGINE_CONTROL=flatdeal collapses the band spread inside a
 *   bundled copy of src/lib/gauntletEngine.ts (every card drawn from one
 *   band instead of five), and section 2's genuine-choice floor must go
 *   red for NBA and NFL both.
 *   SIM_GAUNTLET_ENGINE_CONTROL=blindload removes the generic daily record
 *   validator's consistency check in the same bundled copy, and section
 *   5's tampered record must then load for both sports.
 * Both controls patch gauntletEngine.ts, not gauntletDraftNba.ts or
 * gauntletDraftNfl.ts, because the algorithm they target now lives there;
 * each sport's own bundled copy has its `from '@/lib/gauntletEngine'`
 * import rewritten to the patched file so the sport config actually runs
 * through the patched engine rather than the real one. Under a control
 * only the section that control targets runs, matching simGauntletDraft.mjs.
 *
 * Run: node scripts/simGauntletEngine.mjs
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..').replace(/\\/g, '/');
let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };
const CONTROL = process.env.SIM_GAUNTLET_ENGINE_CONTROL || '';
if (CONTROL && CONTROL !== 'flatdeal' && CONTROL !== 'blindload') {
  console.error(`SIM_GAUNTLET_ENGINE_CONTROL=${CONTROL} is not a control this harness knows`);
  process.exit(1);
}

const TMP = os.tmpdir().replace(/\\/g, '/');
const store = new Map();
globalThis.localStorage = {
  getItem: k => store.get(k) ?? null,
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: k => store.delete(k),
  clear: () => store.clear(),
};

/**
 * Writes a patched copy of gauntletEngine.ts for the given control, and
 * patched copies of gauntletDraftNba.ts / gauntletDraftNfl.ts whose only
 * change is importing that patched engine instead of the real one. Refuses
 * (exit 1) rather than run a dead control if the needle it targets is not
 * in the current source, per house rule.
 */
function patchedEngineBundle(control) {
  const enginePath = `${ROOT}/src/lib/gauntletEngine.ts`;
  const engineSrc = fs.readFileSync(enginePath, 'utf8');
  let needle, replacement, describe;
  if (control === 'flatdeal') {
    needle = 'for (const [lo, hi] of [[0, 0.12], [0.15, 0.4], [0.3, 0.6], [0.5, 0.8], [0.8, 1]] as const) {';
    replacement = 'for (const [lo, hi] of [[0.4, 0.6], [0.4, 0.6], [0.4, 0.6], [0.4, 0.6], [0.4, 0.6]] as const) {';
    describe = 'the band spread collapsed in a bundled copy of gauntletEngine.ts, the genuine-choice floor must now go red';
  } else {
    needle = 'if (!consistent) return null;';
    replacement = 'if (!consistent && false) return null;';
    describe = 'the daily record validator no longer checks that the run adds up, in a bundled copy of gauntletEngine.ts, the tampered record must now load';
  }
  if (!engineSrc.includes(needle)) {
    console.error(`control run: the ${control} needle is not in src/lib/gauntletEngine.ts, refusing to run a dead control`);
    process.exit(1);
  }
  const patchedEnginePath = `${TMP}/gauntletEngine.${control}.ts`;
  fs.writeFileSync(patchedEnginePath, engineSrc.replace(needle, replacement));

  const sportPaths = {};
  for (const sport of ['gauntletDraftNba', 'gauntletDraftNfl']) {
    const src = fs.readFileSync(`${ROOT}/src/lib/${sport}.ts`, 'utf8');
    const importNeedle = "from '@/lib/gauntletEngine'";
    if (!src.includes(importNeedle)) {
      console.error(`control run: ${sport}.ts no longer imports the engine the control patches, refusing`);
      process.exit(1);
    }
    const patchedPath = `${TMP}/${sport}.${control}.ts`;
    fs.writeFileSync(patchedPath, src.replace(importNeedle, `from '${patchedEnginePath}'`));
    sportPaths[sport] = patchedPath;
  }
  console.log(`NEGATIVE CONTROL ON: ${describe}`);
  return { enginePath: patchedEnginePath, nbaPath: sportPaths.gauntletDraftNba, nflPath: sportPaths.gauntletDraftNfl };
}

async function bundle(entrySrc, name) {
  const entry = `${TMP}/simGauntletEngine.${name}.entry.mjs`;
  const out = `${TMP}/simGauntletEngine.${name}.bundle.mjs`;
  fs.writeFileSync(entry, entrySrc);
  execSync(`${ROOT}/node_modules/.bin/esbuild ${entry} --bundle --format=esm --platform=node --outfile=${out} --log-level=error --alias:@=${ROOT}/src`, { stdio: 'inherit' });
  return import(pathToFileURL(out).href);
}

/* ================= GOLDEN REFERENCE: the algorithm as it stood before
   Round 520's refactor, transcribed by hand from the pre-refactor
   src/lib/gauntletDraft.ts so section 1 does not depend on git history and
   cannot silently start comparing the engine against itself. If this ever
   needs to change, it means soccer's actual rules changed, which is a
   product decision, not a refactor; do not edit this to make a red
   comparison pass. ================= */
function goldenRng(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}
function goldenBuildDraft(pool, seed, FORMATIONS, playerRating, gdFits) {
  const rng = goldenRng(seed);
  const seen = new Set();
  const deduped = pool.filter(p => {
    if (seen.has(p.name)) return false;
    seen.add(p.name);
    return true;
  });
  const formation = FORMATIONS[Math.floor(rng() * FORMATIONS.length)];
  const used = new Set();
  const slotOrder = formation.slots
    .map((slot, index) => ({ slot, index, supply: deduped.filter(p => gdFits(p, slot)).length }))
    .sort((a, b) => a.supply - b.supply);
  const picksByIndex = new Array(formation.slots.length);
  for (const { slot, index } of slotOrder) {
    const fits = deduped.filter(p => gdFits(p, slot) && !used.has(p.name))
      .sort((a, b) => playerRating(b) - playerRating(a));
    const grab = (lo, hi) => {
      const a = Math.floor(lo * fits.length);
      const b = Math.max(a + 1, Math.floor(hi * fits.length));
      const band = fits.slice(a, b).filter(p => !used.has(p.name));
      const src = band.length ? band : fits.filter(p => !used.has(p.name));
      return src[Math.floor(rng() * src.length)];
    };
    const choices = [];
    for (const [lo, hi] of [[0, 0.12], [0.15, 0.4], [0.3, 0.6], [0.5, 0.8], [0.8, 1]]) {
      let c = grab(lo, hi);
      let hops = 0;
      while (choices.includes(c) && hops < 10) { c = grab(lo, hi); hops += 1; }
      if (!choices.includes(c)) { choices.push(c); used.add(c.name); }
    }
    picksByIndex[index] = { slot, choices };
  }
  return { formation, picks: picksByIndex };
}
function goldenSquadRatingOf(squad, playerRating) {
  const players = squad.filter(p => p !== null);
  if (players.length === 0) return 0;
  return Math.round(players.reduce((s, p) => s + playerRating(p), 0) / players.length);
}
function goldenSeedFromSquad(squad) {
  const key = squad.map(p => (p ? p.name : '-')).join('|');
  let h = 2166136261 >>> 0;
  for (let i = 0; i < key.length; i += 1) { h ^= key.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return (h % 2147483646) + 1;
}
function goldenRunGauntlet(squad, GAUNTLET_ROUNDS, playerRating) {
  const rating = goldenSquadRatingOf(squad, playerRating);
  const rng = goldenRng(goldenSeedFromSquad(squad));
  const matches = [];
  let cleared = 0;
  for (const round of GAUNTLET_ROUNDS) {
    const gap = rating - round.rating;
    const myExp = Math.max(0.35, 1.45 + gap / 7);
    const theirExp = Math.max(0.35, 1.45 - gap / 7);
    const goals = exp => { let g = 0; for (let i = 0; i < 6; i += 1) if (rng() < exp / 6) g += 1; return g; };
    let mine = goals(myExp);
    let theirs = goals(theirExp);
    let wonOnPens = null;
    if (mine === theirs) {
      const extraMine = rng() < myExp / 8 ? 1 : 0;
      const extraTheirs = rng() < theirExp / 8 ? 1 : 0;
      mine += extraMine; theirs += extraTheirs;
      if (mine === theirs) {
        const p = 0.5 + gap / 120;
        wonOnPens = rng() < Math.max(0.25, Math.min(0.75, p));
      }
    }
    const won = wonOnPens !== null ? wonOnPens : mine > theirs;
    matches.push({ round, yourGoals: mine, theirGoals: theirs, wonOnPens, won });
    if (!won) break;
    cleared += 1;
  }
  const champion = cleared === GAUNTLET_ROUNDS.length;
  const score = Math.min(100, cleared * 16 + (champion ? 20 : 0));
  return { rating, matches, roundsCleared: cleared, champion, score };
}

async function section1() {
  console.log('1) the soccer regression: golden reference vs the live, post-refactor game');
  const { gd, POOL } = await bundle(`
export * as gd from '${ROOT}/src/lib/gauntletDraft.ts';
export { players as POOL } from '${ROOT}/src/data/players.ts';
`, 'soccer');
  const { FORMATIONS, playerRating } = await bundle(`
export { FORMATIONS, playerRating } from '${ROOT}/src/lib/squadDeal.ts';
`, 'squaddeal');
  const gdFits = (p, slot) => gd.gdFits(p, slot);
  const DRAFTS = 300;
  let draftMismatches = 0;
  const fp = d => d.formation.name + '|' + d.picks.map(p => p.choices.map(c => c.name).join(',')).join(';');
  for (let s = 1; s <= DRAFTS; s += 1) {
    const seed = s * 7919 + 3;
    const golden = goldenBuildDraft(POOL, seed, FORMATIONS, playerRating, gdFits);
    const live = gd.buildDraft(POOL, seed);
    if (fp(golden) !== fp(live)) draftMismatches += 1;
  }
  if (draftMismatches > 0) fail(`${draftMismatches} of ${DRAFTS} drafts differed between the golden reference and the live game after the refactor`);

  let runMismatches = 0;
  const RUNS = 150;
  for (let s = 1; s <= RUNS; s += 1) {
    const seed = s * 4001 + 17;
    const d = gd.buildDraft(POOL, seed);
    const squad = d.picks.map(p => p.choices[s % p.choices.length]);
    const golden = goldenRunGauntlet(squad, gd.GAUNTLET_ROUNDS, playerRating);
    const live = gd.runGauntlet(squad);
    if (JSON.stringify(golden) !== JSON.stringify(live)) runMismatches += 1;
  }
  if (runMismatches > 0) fail(`${runMismatches} of ${RUNS} gauntlet runs differed between the golden reference and the live game after the refactor`);
  if (draftMismatches === 0 && runMismatches === 0) {
    console.log(`   ${DRAFTS} drafts and ${RUNS} gauntlet runs, byte identical to the pre-refactor algorithm on every one`);
  }
}

function draftWith(draft, chooser, ratingOf) {
  return draft.picks.map(pick => chooser(pick.choices, ratingOf));
}
const bestOf = (choices, ratingOf) => [...choices].sort((a, b) => ratingOf(b) - ratingOf(a))[0];
const worstOf = (choices, ratingOf) => [...choices].sort((a, b) => ratingOf(a) - ratingOf(b))[0];

/* Measured over 500 seeded drafts on the shipped code (2026-09-10): NBA's
   67 player curated pool never dealt a pick under an 8 point spread, NFL's
   flattened skill-position pool never dealt one under 21. Collapsed under
   SIM_GAUNTLET_ENGINE_CONTROL=flatdeal, the same 500 drafts never exceeded
   a 4 point spread for NBA or a 9 point spread for NFL. These floors sit
   comfortably inside both gaps. */
const SPREAD_FLOOR = { nba: 6, nfl: 12 };

async function section2(label, config, floor, slots) {
  console.log(`2) the deal law, ${label}, 300 seeded drafts`);
  let flat = 0;
  let spreadSum = 0;
  let picks = 0;
  const DRAFTS = 300;
  for (let s = 1; s <= DRAFTS; s += 1) {
    const d = config.__engine.buildDraft(config, s * 9973 + 11);
    if (d.picks.length !== slots) fail(`${label} seed ${s}: ${d.picks.length} picks for ${slots} slots`);
    const names = new Set();
    for (const pick of d.picks) {
      if (pick.choices.length !== 5) { fail(`${label} seed ${s}: a pick dealt ${pick.choices.length} cards`); continue; }
      for (const c of pick.choices) {
        if (names.has(config.nameOf(c))) fail(`${label} seed ${s}: ${config.nameOf(c)} dealt twice in one draft`);
        names.add(config.nameOf(c));
      }
      const rs = pick.choices.map(config.ratingOf);
      const spread = Math.max(...rs) - Math.min(...rs);
      spreadSum += spread; picks += 1;
      if (spread < floor) flat += 1;
    }
  }
  const meanSpread = spreadSum / picks;
  if (CONTROL === 'flatdeal') {
    if (flat > DRAFTS) { console.log(`   ${label} control: green. Collapsed, ${flat} of ${picks} picks fell under the ${floor} point floor (mean spread ${meanSpread.toFixed(1)}).`); return true; }
    console.error(`   ${label} control: RED. Only ${flat} of ${picks} picks fell under the floor with the bands collapsed.`);
    return false;
  }
  if (flat > 0) fail(`${label}: ${flat} of ${picks} picks offered no genuine choice (spread under ${floor})`);
  console.log(`   ${label}: ${DRAFTS} drafts, ${slots} distinct fitting cards a draft, nobody dealt twice, mean spread ${meanSpread.toFixed(1)} rating points`);
  return true;
}

async function section3(label, config, roundsLen) {
  console.log(`3) determinism, ${label}`);
  const a = config.__engine.buildDraft(config, 823543);
  const b = config.__engine.buildDraft(config, 823543);
  const fp = d => d.formation.name + '|' + d.picks.map(p => p.choices.map(c => config.nameOf(c)).join(',')).join(';');
  if (fp(a) !== fp(b)) fail(`${label}: the same seed dealt two different drafts`);
  const squad = draftWith(a, bestOf, config.ratingOf);
  if (JSON.stringify(config.__engine.runGauntlet(config, squad)) !== JSON.stringify(config.__engine.runGauntlet(config, squad))) {
    fail(`${label}: the same squad ran two different gauntlets`);
  }
  const prints = new Set();
  const d0 = new Date(Date.UTC(2026, 0, 1));
  for (let i = 0; i < 365; i += 1) {
    const d = new Date(d0.getTime() + i * 86400000);
    const str = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
    prints.add(fp(config.__engine.buildDraft(config, config.__engine.dailySeedFor(config, str))));
  }
  if (prints.size < 300) fail(`${label}: a year of daily seeds dealt only ${prints.size} distinct drafts`);
  else console.log(`   ${label}: drafted twice byte identical, ran twice byte identical, 365 dailies gave ${prints.size} distinct drafts`);
  if (roundsLen !== 5) fail(`${label}: rounds ladder is length ${roundsLen}, not 5, breaking the shared 16-per-round-plus-20 scoring identity`);
}

/* Measured on the final tuned ladders over 300 seeded drafts, five
   independent seed streams (2026-09-10): NBA's best-card five clears 3.26
   to 3.38 rounds and lifts the trophy 9.3 to 13.0 percent of runs; its
   worst-card five clears 0.78 to 0.93 rounds and never wins the cup. NFL's
   best-card seven clears 3.38 to 3.43 rounds and lifts the trophy 8.7 to
   13.0 percent; its worst-card seven clears under 0.06 rounds and also
   never wins. Floors below sit under every one of those measured runs. */
async function section4(label, config) {
  console.log(`4) the cup rewards the draft, ${label}, 300 drafts`);
  let bestRounds = 0, worstRounds = 0, bestTrophies = 0, worstTrophies = 0;
  const DRAFTS = 300;
  for (let s = 1; s <= DRAFTS; s += 1) {
    const d = config.__engine.buildDraft(config, s * 104729 + 7);
    const runBest = config.__engine.runGauntlet(config, draftWith(d, bestOf, config.ratingOf));
    const runWorst = config.__engine.runGauntlet(config, draftWith(d, worstOf, config.ratingOf));
    bestRounds += runBest.roundsCleared;
    worstRounds += runWorst.roundsCleared;
    if (runBest.champion) bestTrophies += 1;
    if (runWorst.champion) worstTrophies += 1;
  }
  const meanBest = bestRounds / DRAFTS;
  const meanWorst = worstRounds / DRAFTS;
  if (meanBest - meanWorst < 1.5) fail(`${label}: best-card squads clear only ${(meanBest - meanWorst).toFixed(2)} more rounds than worst-card squads`);
  if (bestTrophies / DRAFTS < 0.06) fail(`${label}: best-card squads lifted only ${bestTrophies} trophies in ${DRAFTS} runs`);
  if (worstTrophies > DRAFTS * 0.05) fail(`${label}: worst-card squads lifted ${worstTrophies} trophies, the gauntlet is not a test`);
  console.log(`   ${label}: best-card squads ${meanBest.toFixed(2)} rounds and ${bestTrophies} trophies; worst-card squads ${meanWorst.toFixed(2)} and ${worstTrophies}, over ${DRAFTS} drafts`);
}

async function section5(label, config, dateStr) {
  console.log(`5) the daily lock, ${label}: the saved run comes back, nothing else does`);
  const key = `${config.gameId}-daily-${dateStr}`;
  const engine = config.__engine;
  const run = engine.runGauntlet(config, draftWith(engine.buildDraft(config, engine.dailySeedFor(config, dateStr)), bestOf, config.ratingOf));
  store.clear();
  engine.saveDailyRun(config, dateStr, run);
  if (JSON.stringify(engine.loadDailyRun(config, dateStr)) !== JSON.stringify(run)) fail(`${label}: the saved run did not read back byte identical`);
  const otherDate = dateStr === '2026-09-04' ? '2026-09-05' : '2026-09-04';
  if (engine.loadDailyRun(config, otherDate) !== null) fail(`${label}: another date read today's run`);

  const tampered = JSON.parse(store.get(key));
  tampered.run.roundsCleared = config.rounds.length;
  tampered.run.champion = true;
  tampered.run.score = 100;
  store.set(key, JSON.stringify(tampered));
  const tamperedLoaded = engine.loadDailyRun(config, dateStr) !== null;
  if (CONTROL === 'blindload') {
    if (tamperedLoaded) { console.log(`   ${label} control: green. Without the consistency check a run claiming the trophy on its matches loaded.`); return true; }
    console.error(`   ${label} control: RED. The tampered run was still refused with the check removed.`);
    return false;
  }
  if (tamperedLoaded) fail(`${label}: a run whose trophy and score do not follow from its matches loaded`);

  const wreckage = [
    'not json at all {', '{"v":1,"cash":12', '{"v":999,"version":999}', '{}', 'null', '[]',
    JSON.stringify({ v: 1, date: otherDate, run }),
    JSON.stringify({ v: 1, date: dateStr, run: { ...run, matches: [] } }),
    JSON.stringify({ v: 1, date: dateStr, run: { ...run, rating: 'NaN pts' } }),
  ];
  for (const form of wreckage) {
    store.set(key, form);
    let out;
    try { out = engine.loadDailyRun(config, dateStr); } catch (e) { fail(`${label}: loadDailyRun threw on ${form}: ${e.message}`); continue; }
    if (out !== null) fail(`${label}: a broken record read as a run: ${form}`);
  }
  console.log(`   ${label}: round trip byte identical, another date null, a tampered run refused, ${wreckage.length} broken records refused without throwing`);
  return true;
}

async function main() {
  if (CONTROL === 'flatdeal') {
    const paths = patchedEngineBundle('flatdeal');
    const mod = await bundle(`
export { NBA_GAUNTLET_CONFIG } from '${paths.nbaPath}';
export { NFL_GAUNTLET_CONFIG } from '${paths.nflPath}';
export * as engine from '${paths.enginePath}';
`, 'flatdeal');
    const nba = { ...mod.NBA_GAUNTLET_CONFIG, __engine: mod.engine };
    const nfl = { ...mod.NFL_GAUNTLET_CONFIG, __engine: mod.engine };
    const nbaOk = await section2('NBA', nba, SPREAD_FLOOR.nba, 5);
    const nflOk = await section2('NFL', nfl, SPREAD_FLOOR.nfl, 7);
    if (nbaOk && nflOk) process.exit(0);
    process.exit(1);
  }
  if (CONTROL === 'blindload') {
    const paths = patchedEngineBundle('blindload');
    const mod = await bundle(`
export { NBA_GAUNTLET_CONFIG } from '${paths.nbaPath}';
export { NFL_GAUNTLET_CONFIG } from '${paths.nflPath}';
export * as engine from '${paths.enginePath}';
`, 'blindload');
    const nba = { ...mod.NBA_GAUNTLET_CONFIG, __engine: mod.engine };
    const nfl = { ...mod.NFL_GAUNTLET_CONFIG, __engine: mod.engine };
    const nbaOk = await section5('NBA', nba, '2026-09-04');
    const nflOk = await section5('NFL', nfl, '2026-09-06');
    if (nbaOk && nflOk) process.exit(0);
    process.exit(1);
  }

  await section1();

  const mod = await bundle(`
export { NBA_GAUNTLET_CONFIG } from '${ROOT}/src/lib/gauntletDraftNba.ts';
export { NFL_GAUNTLET_CONFIG } from '${ROOT}/src/lib/gauntletDraftNfl.ts';
export * as engine from '${ROOT}/src/lib/gauntletEngine.ts';
`, 'sports');
  const nba = { ...mod.NBA_GAUNTLET_CONFIG, __engine: mod.engine };
  const nfl = { ...mod.NFL_GAUNTLET_CONFIG, __engine: mod.engine };

  await section2('NBA', nba, SPREAD_FLOOR.nba, 5);
  await section2('NFL', nfl, SPREAD_FLOOR.nfl, 7);
  await section3('NBA', nba, nba.rounds.length);
  await section3('NFL', nfl, nfl.rounds.length);
  await section4('NBA', nba);
  await section4('NFL', nfl);
  await section5('NBA', nba, '2026-09-04');
  await section5('NFL', nfl, '2026-09-06');

  console.log('');
  if (failures > 0) { console.error(`simGauntletEngine: ${failures} failure${failures === 1 ? '' : 's'}`); process.exit(1); }
  console.log('simGauntletEngine: green. Soccer plays exactly as it did, and NBA and NFL are the same game wearing their own pool and ladder.');
}

main();
