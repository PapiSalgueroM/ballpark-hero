/* Gauntlet Draft, the generic engine (Round 520): the same draft-then-cup
 * game as scripts/simGauntletDraft.mjs proved for soccer, now shared by
 * src/lib/gauntletEngine.ts across five sports: soccer, NBA
 * (src/lib/gauntletDraftNba.ts) and NFL (src/lib/gauntletDraftNfl.ts) from
 * Round 520, MLB (src/lib/gauntletDraftMlb.ts) from Round 538 and NHL
 * (src/lib/gauntletDraftNhl.ts) from Round 724. Every non soccer sport is held
 * to every section below; soccer is held by section 1 and section 8.
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
 *   2. THE DEAL LAW, NBA, NFL, MLB and NHL separately, over 300 seeded drafts
 *      each: the right number of distinct fitting picks, no duplicate dealt in
 *      one draft, and a measured genuine-choice floor (best card vs worst
 *      card in a pick separated by a real measured gap, floor set from
 *      measured headroom, not a number that felt right; see the floor
 *      comments below for the actual measurements). Since Round 724 also the
 *      lineup law (LINEUP_LAW below, written here by hand rather than read off
 *      the binding under test): the sport's slots are the ones it really lines
 *      up with, every card dealt plays a position its slot takes, and every
 *      position a slot takes really does get dealt into it.
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
 *   6. THE SCOREBOARD (Round 538), see the section's own comment.
 *   7. THE POOL IS THE SOURCE (Round 724), NFL, MLB and NHL, the three
 *      sports whose pool is derived from a roster data file rather than being
 *      a curated list itself: every card dealt is a row of that file with the
 *      same name, position, rating and club, nothing is added and nothing is
 *      re-rated, and every eligible row is in the pool. For the NHL also: no
 *      card sits at the roster generator's 68 placeholder (see
 *      src/lib/gauntletDraftNhl.ts for why those are left out).
 *   8. ONE SAVE SHAPE (Round 724), all five sports: the daily record each
 *      sport writes sits under `${gameId}-daily-${date}`, is the only key the
 *      save writes, and has exactly the same field structure as every other
 *      sport's, so the NHL save cannot drift into a fork of its own.
 *   9. HOW IT WAS SETTLED (Round 826), all five sports: see the section's own
 *      comment. Every match records whether regulation, the extra burst or
 *      the decider settled it, the record agrees with a hand transcribed
 *      reference that writes the phase down as it happens, every screen says
 *      so in the sport's own words, a daily saved before the round still
 *      loads, and not one result for a seed moved.
 *   Section 3 also holds, since Round 724, that the daily for a date deals
 *   the same draft twice and that no two consecutive days in a year deal the
 *   same draft.
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
 *   SIM_GAUNTLET_ENGINE_CONTROL=badscore (Round 538) hands the decider's
 *   bump to the loser, and section 6 must go red.
 *   SIM_GAUNTLET_ENGINE_CONTROL=invented (Round 724) appends one made up
 *   player to the NHL pool in a bundled copy of gauntletDraftNhl.ts, and
 *   section 7 must go red.
 *   SIM_GAUNTLET_ENGINE_CONTROL=keepdefault (Round 724) drops the NHL pool's
 *   68 placeholder filter in the same kind of copy, so the four goalies at 68
 *   are dealt again, and section 7 must go red.
 *   SIM_GAUNTLET_ENGINE_CONTROL=forkedsave (Round 724) makes the bundled
 *   engine write one extra field into the NHL save only, and section 8 must
 *   go red.
 *   Four lineup law controls (Round 724), each on a bundled copy of
 *   gauntletDraftNhl.ts, each running section 2 for the NHL only and each
 *   required to turn red the named checks of that section:
 *     anyfit     fitsSlot lets anybody into any slot (a goalie at centre),
 *                the fit check must fire.
 *     nogoalie   the goal slot takes a defenseman instead of a goalie, the
 *                shape and fit checks must fire.
 *     wingonly   the wing slots stop taking centres, the shape and reach
 *                checks must fire.
 *     narrowfit  fitsSlot quietly keeps centres off the wing while the slot
 *                list still says they may play there, so only the reach check
 *                can see it, and it must fire.
 *   Three settled controls (Round 826), each running section 9 only, all five
 *   sports, and each required to turn red the named check of that section:
 *     nolabel    the bundled engine stops recording an extra time result as
 *                one (it stays 'regulation'), the label check must fire.
 *     noline     decidedNote in the bundled engine drops the extra time
 *                words, so the record is right and every screen is silent
 *                about it, the words check must fire.
 *     handlabel  the shared board goes back to printing a label only for the
 *                decider, the way it did before this round, read in memory,
 *                and the screens check must fire.
 * Every control refuses to run when the text it rewrites is not in the
 * source, so a control can never pass by changing nothing.
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
/* Round 724: the lineup law controls and the section 2 checks each must fire. */
const LAW_CONTROLS = { anyfit: ['fit'], nogoalie: ['shape', 'fit'], wingonly: ['shape', 'reach'], narrowfit: ['reach'] };
/* Round 826: the settled controls and the section 9 check each must fire. */
const SETTLED_CONTROLS = { nolabel: ['label'], noline: ['words'], handlabel: ['screens'] };
if (CONTROL && !['flatdeal', 'blindload', 'badscore', 'invented', 'keepdefault', 'forkedsave', ...Object.keys(LAW_CONTROLS), ...Object.keys(SETTLED_CONTROLS)].includes(CONTROL)) {
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
  /* Round 724: line endings folded on the read, because the badscore needle
     spans three lines and a Windows checkout writes CRLF, so it refused as a
     dead control there while matching on an LF clone. */
  const engineSrc = fs.readFileSync(enginePath, 'utf8').replace(/\r\n/g, '\n');
  let needle, replacement, describe;
  if (control === 'flatdeal') {
    needle = 'for (const [lo, hi] of [[0, 0.12], [0.15, 0.4], [0.3, 0.6], [0.5, 0.8], [0.8, 1]] as const) {';
    replacement = 'for (const [lo, hi] of [[0.4, 0.6], [0.4, 0.6], [0.4, 0.6], [0.4, 0.6], [0.4, 0.6]] as const) {';
    describe = 'the band spread collapsed in a bundled copy of gauntletEngine.ts, the genuine-choice floor must now go red';
  } else if (control === 'badscore') {
    /* Round 538. displayScore is the one place a rendered board can contradict
       the result it came from: the winner is decided upstream from the goals
       and only then drawn through the sport's own scoreline. Handing the
       decider's bump to the loser is exactly the shape of that mistake, and
       section 6 must catch it on real runs rather than on made up numbers. */
    needle = `  return m.wonOnPens
    ? { mine: mine + config.tiebreakBump, theirs }
    : { mine, theirs: theirs + config.tiebreakBump };`;
    replacement = `  return m.wonOnPens
    ? { mine, theirs: theirs + config.tiebreakBump }
    : { mine: mine + config.tiebreakBump, theirs };`;
    describe = 'the decider bump is awarded to the loser in a bundled copy of gauntletEngine.ts, so a won match renders a losing scoreline and section 6 must go red';
  } else if (control === 'forkedsave') {
    /* Round 724. One sport growing a save field of its own is exactly the
       drift section 8 exists for, so the control does it to the NHL only. */
    needle = 'writeDailyRecord(config.gameId, date, { run });';
    replacement = "writeDailyRecord(config.gameId, date, config.gameId === 'nhl-gauntlet-draft' ? { run, lines: 2 } : { run });";
    describe = 'the NHL save carries one extra field in a bundled copy of gauntletEngine.ts, and section 8 must go red';
  } else if (control === 'nolabel') {
    /* Round 826. The defect this round fixed, put back in the record: a
       match settled by the extra burst is written down as regulation. */
    needle = "      decidedIn = 'extra';\n";
    replacement = '';
    describe = 'an extra time result is recorded as regulation in a bundled copy of gauntletEngine.ts, and the section 9 label check must go red';
  } else if (control === 'noline') {
    /* Round 826. The same defect one step later: the record is right and the
       words every screen prints from it leave extra time out. */
    needle = "  if (m.decidedIn === 'extra') return m.won ? config.extraTime.won : config.extraTime.lost;\n";
    replacement = '';
    describe = 'decidedNote drops the extra time words in a bundled copy of gauntletEngine.ts, and the section 9 words check must go red';
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
  for (const sport of ['gauntletDraftNba', 'gauntletDraftNfl', 'gauntletDraftMlb', 'gauntletDraftNhl']) {
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
  /* Round 826: soccer too, so section 9 can run all five sports through the
     patched engine. Its file names the engine twice (the import and a type
     re-export), so every mention is rewritten. */
  const soccerSrc = fs.readFileSync(`${ROOT}/src/lib/gauntletDraft.ts`, 'utf8');
  if (!soccerSrc.includes("from '@/lib/gauntletEngine'")) {
    console.error('control run: gauntletDraft.ts no longer imports the engine the control patches, refusing');
    process.exit(1);
  }
  const soccerPath = `${TMP}/gauntletDraft.${control}.ts`;
  fs.writeFileSync(soccerPath, soccerSrc.split("from '@/lib/gauntletEngine'").join(`from '${patchedEnginePath}'`));
  console.log(`NEGATIVE CONTROL ON: ${describe}`);
  return {
    enginePath: patchedEnginePath,
    soccerPath,
    nbaPath: sportPaths.gauntletDraftNba,
    nflPath: sportPaths.gauntletDraftNfl,
    mlbPath: sportPaths.gauntletDraftMlb,
    nhlPath: sportPaths.gauntletDraftNhl,
  };
}

/**
 * Round 724: the two section 7 controls patch the NHL binding, not the engine,
 * because the pool is built there, and so do the four lineup law controls,
 * because the slots and the fit rule live there too. Same refusal rule as
 * above. wingonly rewrites all four wing slots, so it also refuses unless it
 * finds exactly four.
 */
function patchedNhlBinding(control) {
  const src = fs.readFileSync(`${ROOT}/src/lib/gauntletDraftNhl.ts`, 'utf8').replace(/\r\n/g, '\n');
  let needle, replacement, describe, count = 1;
  const fitNeedle = 'fitsSlot: (p, slot) => slot.allowed.includes(p.pos),';
  if (control === 'invented') {
    needle = '.map(s => ({ name: s.name, pos: s.pos, ovr: s.ovr, team: abbr })));';
    replacement = ".map(s => ({ name: s.name, pos: s.pos, ovr: s.ovr, team: abbr })))\n  .concat([{ name: 'Invented Skater', pos: 'C', ovr: 97, team: 'EDM' }]);";
    describe = 'one made up player is appended to the NHL pool in a bundled copy of gauntletDraftNhl.ts, and section 7 must go red';
  } else if (control === 'anyfit') {
    needle = fitNeedle;
    replacement = 'fitsSlot: () => true,';
    describe = 'fitsSlot lets any player into any slot in a bundled copy of gauntletDraftNhl.ts, and the section 2 fit check must go red';
  } else if (control === 'narrowfit') {
    needle = fitNeedle;
    replacement = "fitsSlot: (p, slot) => slot.allowed.includes(p.pos) && !(slot.label === 'W' && p.pos === 'C'),";
    describe = 'fitsSlot keeps centres off the wing while the wing slots still list them, in a bundled copy of gauntletDraftNhl.ts, and the section 2 reach check must go red';
  } else if (control === 'nogoalie') {
    needle = "{ label: 'G', allowed: ['G'] },";
    replacement = "{ label: 'G', allowed: ['D'] },";
    describe = 'the goal slot takes a defenseman instead of a goalie in a bundled copy of gauntletDraftNhl.ts, and the section 2 shape and fit checks must go red';
  } else if (control === 'wingonly') {
    needle = "{ label: 'W', allowed: ['W', 'C'] },";
    replacement = "{ label: 'W', allowed: ['W'] },";
    count = 4;
    describe = 'the four wing slots stop taking centres in a bundled copy of gauntletDraftNhl.ts, and the section 2 shape and reach checks must go red';
  } else {
    needle = '.filter(s => s.ovr !== NHL_NO_SEASON_DEFAULT)';
    replacement = '.filter(s => s.ovr !== -1)';
    describe = 'the 68 placeholder filter is gone from a bundled copy of gauntletDraftNhl.ts, so the goalies at 68 are dealt again, and section 7 must go red';
  }
  const found = src.split(needle).length - 1;
  if (found !== count) {
    console.error(`control run: the ${control} needle is in src/lib/gauntletDraftNhl.ts ${found} time(s), not ${count}, refusing to run a dead control`);
    process.exit(1);
  }
  const patched = `${TMP}/gauntletDraftNhl.${control}.ts`;
  fs.writeFileSync(patched, src.split(needle).join(replacement));
  console.log(`NEGATIVE CONTROL ON: ${describe}`);
  return patched;
}

/* Round 724: a worktree inside the repo has no node_modules of its own, so
   walk up for esbuild rather than trusting ROOT/node_modules, the way
   simGuideHeadings does. On a plain checkout the first step finds it. */
function findEsbuild() {
  let dir = ROOT;
  for (let i = 0; i < 6; i += 1) {
    const p = `${dir}/node_modules/.bin/esbuild`;
    if (fs.existsSync(p)) return p;
    dir = path.dirname(dir).replace(/\\/g, '/');
  }
  console.error('simGauntletEngine: esbuild not found in any node_modules above the repo');
  process.exit(1);
}
const ESBUILD = findEsbuild();

async function bundle(entrySrc, name) {
  const entry = `${TMP}/simGauntletEngine.${name}.entry.mjs`;
  const out = `${TMP}/simGauntletEngine.${name}.bundle.mjs`;
  fs.writeFileSync(entry, entrySrc);
  execSync(`${ESBUILD} ${entry} --bundle --format=esm --platform=node --outfile=${out} --log-level=error --alias:@=${ROOT}/src`, { stdio: 'inherit' });
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

/* Round 826: a run with the record of how each match was settled taken off,
   the shape the golden reference and a pre Round 826 save both have. */
const withoutHow = run => ({ ...run, matches: run.matches.map(({ decidedIn, ...m }) => m) });

/* Round 826: the golden reference once more, transcribed by hand from the
   same pre-refactor algorithm as goldenRunGauntlet, with the phase written
   down as it happens: regulation, the extra burst, or the decider after it.
   Section 9 holds it to goldenRunGauntlet on every run (the same number of
   matches), and the engine's own decidedIn to it, so the label is checked
   against how the score really came about and not against the final score,
   which cannot tell a regulation 2-1 from a 1-1 settled by the extra goal. */
function goldenPhases(squad, rounds, playerRating) {
  const rating = goldenSquadRatingOf(squad, playerRating);
  const rng = goldenRng(goldenSeedFromSquad(squad));
  const phases = [];
  for (const round of rounds) {
    const gap = rating - round.rating;
    const myExp = Math.max(0.35, 1.45 + gap / 7);
    const theirExp = Math.max(0.35, 1.45 - gap / 7);
    const goals = exp => { let g = 0; for (let i = 0; i < 6; i += 1) if (rng() < exp / 6) g += 1; return g; };
    let mine = goals(myExp);
    let theirs = goals(theirExp);
    let phase = 'regulation';
    let wonOnPens = null;
    if (mine === theirs) {
      phase = 'extra';
      mine += rng() < myExp / 8 ? 1 : 0;
      theirs += rng() < theirExp / 8 ? 1 : 0;
      if (mine === theirs) {
        phase = 'decider';
        wonOnPens = rng() < Math.max(0.25, Math.min(0.75, 0.5 + gap / 120));
      }
    }
    phases.push(phase);
    if (!(wonOnPens !== null ? wonOnPens : mine > theirs)) break;
  }
  return phases;
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
    /* Round 826: the live run also writes down how each match was settled
       (decidedIn), which the pre-refactor algorithm never recorded. It is set
       aside here, never edited into the golden copy, and section 9 holds it,
       along with every result for a seed in all five sports. */
    const live = withoutHow(gd.runGauntlet(squad));
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
/* MLB floor, measured rather than guessed, the same way the other two were.
   Over 300 drafts the per pick spread runs: overall min 7, 1st percentile 8,
   median 17, mean 17.7. Ten of the eleven slots never come in under 11. The
   floor is the CLOSER slot and it is a real property of the sport rather than
   a defect: relief pitchers are rated off a compressed percentile band, so CL
   measures min 7, median 10, where every other slot medians 14 to 22. A floor
   of 5 therefore sits under the measured minimum with room, and the collapsed
   control still buries it. */
/* NHL floor (Round 724), measured the same way over five seed streams of 300
   drafts, 16500 picks (2026-10-01): the per pick spread runs min 11, 1st
   percentile 11, median 16, mean 16.4, and every stream's own minimum is 11;
   the goalie slot is the widest (median 20). Collapsed under flatdeal the same
   16500 picks run min 0, median 3, max 5. A floor of 8 sits three under the
   real minimum and three over the collapsed maximum. */
const SPREAD_FLOOR = { nba: 6, nfl: 12, mlb: 5, nhl: 8 };

/* ── THE LINEUP LAW, added Round 724 for section 2 ──
   Section 2 used to count the cards in a pick and never ask whether they
   belonged in the slot, so a binding whose fitsSlot let anybody in, or whose
   goal slot took a defenseman, stayed green. This is each sport's lineup as
   the sport plays it, transcribed by hand the same way the section 1 golden
   reference is, and never imported: a check that read the slots off the
   config under test would agree with whatever that config says. Each row is
   a slot label and every position a card in that slot may play. A real rules
   change edits the binding and this table together, on purpose.
     NBA  the Perfect Lineup starting five, src/data/nbaPerfectLineupPool.ts.
     NFL  the skill position offense, src/lib/gauntletDraftNfl.ts.
     MLB  the lineup card, src/lib/gauntletDraftMlb.ts.
     NHL  two forward lines, two defense pairs and a goalie: a centre may play
          the wing, a winger does not take the draws, and defense and goal
          take only their own (src/lib/gauntletDraftNhl.ts says why). */
const MLB_BATS = ['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH'];
const LINEUP_LAW = {
  nba: [['PG', ['PG', 'SG']], ['SG', ['SG', 'PG', 'SF']], ['SF', ['SF', 'SG', 'PF']], ['PF', ['PF', 'SF', 'C']], ['C', ['C', 'PF']]],
  nfl: [['QB', ['QB']], ['RB', ['RB']], ['RB', ['RB']], ['WR', ['WR']], ['WR', ['WR']], ['WR', ['WR']], ['TE', ['TE']]],
  mlb: [['C', ['C']], ['1B', ['1B']], ['2B', ['2B']], ['3B', ['3B']], ['SS', ['SS']], ['LF', ['LF', 'RF']], ['CF', ['CF']],
    ['RF', ['RF', 'LF']], ['DH', MLB_BATS], ['SP', ['SP']], ['CL', ['CL', 'RP']]],
  nhl: [['C', ['C']], ['W', ['W', 'C']], ['W', ['W', 'C']], ['C', ['C']], ['W', ['W', 'C']], ['W', ['W', 'C']],
    ['D', ['D']], ['D', ['D']], ['D', ['D']], ['D', ['D']], ['G', ['G']]],
};

/* Section 2 returns how many problems each lineup law check found, so the
   law controls can require the exact check they target to fire. Three checks:
     shape  the sport has the one formation the law says, slot for slot, and
            every draft's picks come back in that order;
     fit    every card dealt plays a position the law lets into its slot, and
            the binding's own fitsSlot agrees it fits;
     reach  every position the law lets into a slot, and the pool holds, is
            dealt into that slot at least once over the 300 drafts. This is
            the one that sees a fitsSlot narrower than the slot list says.
   The reach counts are fixed by the seeds, so this is not a coin toss. On the
   shipped code (2026-10-01) the rarest pairing over the 300 drafts is dealt
   356 times for the NBA (13 pairings), 1500 for the NFL (4), 99 for MLB (22)
   and 1500 for the NHL (5, the goalie slot being the rarest at one slot times
   five cards times 300), printed as "the rarest" on the green line; each
   broken rule the controls below plant takes its pairing to 0. */
async function section2(label, config, floor, law) {
  console.log(`2) the deal law, ${label}, 300 seeded drafts`);
  const before = failures;
  const slots = law.length;
  const sameSet = (a, b) => a.length === b.length && [...a].sort().join('|') === [...b].sort().join('|');
  const counts = { shape: 0, fit: 0, reach: 0 };
  const firsts = {};
  const note = (kind, what) => { counts[kind] += 1; if (!firsts[kind]) firsts[kind] = what; };

  if (config.formations.length !== 1) note('shape', `${config.formations.length} formations, the law knows one`);
  const formation = config.formations[0];
  if (formation.slots.length !== slots) note('shape', `${formation.slots.length} slots, the law has ${slots}`);
  formation.slots.forEach((slot, i) => {
    const row = law[i];
    if (row && (slot.label !== row[0] || !sameSet(slot.allowed, row[1]))) {
      note('shape', `slot ${i + 1} is ${slot.label} taking ${slot.allowed.join('/')}, the law says ${row[0]} taking ${row[1].join('/')}`);
    }
  });

  let flat = 0;
  let spreadSum = 0;
  let picks = 0;
  const dealt = new Map();
  const DRAFTS = 300;
  for (let s = 1; s <= DRAFTS; s += 1) {
    const d = config.__engine.buildDraft(config, s * 9973 + 11);
    if (d.picks.length !== slots) fail(`${label} seed ${s}: ${d.picks.length} picks for ${slots} slots`);
    const names = new Set();
    for (const [i, pick] of d.picks.entries()) {
      const row = law[i];
      if (!row || pick.slot.label !== row[0]) note('shape', `seed ${s} pick ${i + 1} is a ${pick.slot.label} slot, the law says ${row ? row[0] : 'nothing'}`);
      if (pick.choices.length !== 5) { fail(`${label} seed ${s}: a pick dealt ${pick.choices.length} cards`); continue; }
      for (const c of pick.choices) {
        if (names.has(config.nameOf(c))) fail(`${label} seed ${s}: ${config.nameOf(c)} dealt twice in one draft`);
        names.add(config.nameOf(c));
        if (!row) continue;
        const pos = config.positionOf(c);
        if (!row[1].includes(pos) || !config.fitsSlot(c, pick.slot)) {
          note('fit', `seed ${s}: ${config.nameOf(c)} (${pos}) dealt into the ${row[0]} slot, which takes ${row[1].join('/')}`);
        } else {
          dealt.set(`${row[0]}:${pos}`, (dealt.get(`${row[0]}:${pos}`) ?? 0) + 1);
        }
      }
      const rs = pick.choices.map(config.ratingOf);
      const spread = Math.max(...rs) - Math.min(...rs);
      spreadSum += spread; picks += 1;
      if (spread < floor) flat += 1;
    }
  }

  const inPool = new Set(config.pool.map(config.positionOf));
  const pairings = [...new Set(law.flatMap(([slotLabel, allowed]) => allowed.filter(p => inPool.has(p)).map(p => `${slotLabel}:${p}`)))];
  for (const k of pairings) if (!dealt.get(k)) note('reach', `${k.replace(':', ' slot never dealt a ')} in ${DRAFTS} drafts, though the law lets one in and the pool holds them`);
  const fewest = Math.min(...pairings.map(k => dealt.get(k) ?? 0));

  const meanSpread = spreadSum / picks;
  if (CONTROL === 'flatdeal') {
    if (flat > DRAFTS) { console.log(`   ${label} control: green. Collapsed, ${flat} of ${picks} picks fell under the ${floor} point floor (mean spread ${meanSpread.toFixed(1)}).`); return { ok: true, ...counts }; }
    console.error(`   ${label} control: RED. Only ${flat} of ${picks} picks fell under the floor with the bands collapsed.`);
    return { ok: false, ...counts };
  }
  if (flat > 0) fail(`${label}: ${flat} of ${picks} picks offered no genuine choice (spread under ${floor})`);
  if (counts.shape) fail(`${label}: ${counts.shape} lineup shape problem(s), first: ${firsts.shape}`);
  if (counts.fit) fail(`${label}: ${counts.fit} card(s) dealt into a slot their position cannot play, first: ${firsts.fit}`);
  if (counts.reach) fail(`${label}: ${counts.reach} slot and position pairing(s) the law allows were never dealt, first: ${firsts.reach}`);
  if (failures === before) {
    console.log(`   ${label}: ${DRAFTS} drafts, ${slots} slots exactly as the sport lines up, every card plays a position its slot takes, all ${pairings.length} slot and position pairings dealt (the rarest ${fewest} times), nobody dealt twice, mean spread ${meanSpread.toFixed(1)} rating points`);
  }
  return { ok: failures === before, ...counts };
}

async function section3(label, config, roundsLen) {
  console.log(`3) determinism, ${label}`);
  const before = failures;
  const a =config.__engine.buildDraft(config, 823543);
  const b = config.__engine.buildDraft(config, 823543);
  const fp = d => d.formation.name + '|' + d.picks.map(p => p.choices.map(c => config.nameOf(c)).join(',')).join(';');
  if (fp(a) !== fp(b)) fail(`${label}: the same seed dealt two different drafts`);
  const squad = draftWith(a, bestOf, config.ratingOf);
  if (JSON.stringify(config.__engine.runGauntlet(config, squad)) !== JSON.stringify(config.__engine.runGauntlet(config, squad))) {
    fail(`${label}: the same squad ran two different gauntlets`);
  }
  const prints = new Set();
  const d0 = new Date(Date.UTC(2026, 0, 1));
  /* Round 724: the daily is the same draft for everyone on a date and a new
     one the next day. Asked directly, per date, rather than inferred from the
     year's distinct count: the date's draft dealt twice must match, and no day
     may deal the draft the day before it dealt. */
  let restable = 0, sameAsYesterday = 0, prev = null;
  for (let i = 0; i < 365; i += 1) {
    const d = new Date(d0.getTime() + i * 86400000);
    const str = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
    const today = fp(config.__engine.buildDraft(config, config.__engine.dailySeedFor(config, str)));
    if (today !== fp(config.__engine.buildDraft(config, config.__engine.dailySeedFor(config, str)))) restable += 1;
    if (prev !== null && today === prev) sameAsYesterday += 1;
    prev = today;
    prints.add(today);
  }
  if (restable > 0) fail(`${label}: ${restable} dates dealt a different daily the second time they were asked`);
  if (sameAsYesterday > 0) fail(`${label}: ${sameAsYesterday} days dealt the same daily draft as the day before`);
  if (prints.size < 300) fail(`${label}: a year of daily seeds dealt only ${prints.size} distinct drafts`);
  if (roundsLen !== 5) fail(`${label}: rounds ladder is length ${roundsLen}, not 5, breaking the shared 16-per-round-plus-20 scoring identity`);
  if (failures === before) console.log(`   ${label}: drafted twice byte identical, ran twice byte identical, 365 dailies gave ${prints.size} distinct drafts, every date dealt the same draft twice and none repeated the day before`);
}

/* Measured on the final tuned ladders over 300 seeded drafts, five
   independent seed streams (2026-09-10): NBA's best-card five clears 3.26
   to 3.38 rounds and lifts the trophy 9.3 to 13.0 percent of runs; its
   worst-card five clears 0.78 to 0.93 rounds and never wins the cup. NFL's
   best-card seven clears 3.38 to 3.43 rounds and lifts the trophy 8.7 to
   13.0 percent; its worst-card seven clears under 0.06 rounds and also
   never wins. Floors below sit under every one of those measured runs.
   NHL (Round 724, the same five stream recipe, 2026-10-01): the best-card
   eleven rates 95.0, clears 3.42 to 3.60 rounds and lifts the Cup in 11.0 to
   18.0 percent of runs; the worst-card eleven rates 78.6, clears 0.69 to 0.74
   rounds and lifted it 0 times in 1500. The best-minus-worst gap runs 2.72 to
   2.92 rounds against the 1.5 floor, the trophy share 11.0 at its lowest
   against the 6 percent floor. */
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
  const before = failures;
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
  /* Round 724: the success line only when this sport's checks all held, so a
     log never reads green beside a red. */
  if (failures === before) console.log(`   ${label}: round trip byte identical, another date null, a tampered run refused, ${wreckage.length} broken records refused without throwing`);
  return true;
}

/* ── 6: THE SCOREBOARD, added Round 538 with the display layer it checks ──
   Round 520 printed the engine's raw goal counts on every board, so the NBA
   game showed "4 - 2" as a basketball result and the NFL one showed scores no
   football game has ever ended on. Each sport now maps a goal count onto its
   own scale through config.scoreline, for DISPLAY ONLY.

   That map is the dangerous kind of small function: the winner is decided
   upstream from the goals, then drawn through this, so a map that is not
   strictly increasing could print a losing scoreline over a match the player
   won and there is nothing else in the system that would notice. So this
   section does not read the comment promising monotonicity, it measures it
   across the whole range the engine can produce, and then checks the rendered
   board against the actual result over real runs rather than over made up
   numbers.

   It also checks the words, because Round 522 shipped an NFL board that told
   the player their game was decided by a shootout. */
async function section6(sports) {
  console.log('6) the scoreboard says what happened, every sport');
  for (const [label, config] of sports) {
    const e = config.__engine;
    const before = failures;

    /* Strictly increasing over the full range. The engine draws goals from six
       Bernoulli trials plus one extra time burst, so 0 to 7 is everything it
       can produce; 0 to 12 is measured anyway, with headroom, because the
       model could widen and this check should not have to be remembered. */
    let lastVal = -Infinity;
    for (let g = 0; g <= 12; g += 1) {
      const v = config.scoreline(g);
      if (!Number.isFinite(v)) { fail(`${label}: scoreline(${g}) is not a finite number`); break; }
      if (!Number.isInteger(v)) fail(`${label}: scoreline(${g}) is ${v}, and a scoreboard shows whole numbers`);
      if (v <= lastVal) {
        fail(`${label}: scoreline is not strictly increasing, ${g} maps to ${v} after ${lastVal}. A losing scoreline can now be printed over a won match`);
        break;
      }
      lastVal = v;
    }
    if (!(config.tiebreakBump > 0)) fail(`${label}: tiebreakBump is ${config.tiebreakBump}, so a game settled by the decider still shows level`);

    /* And the rendered board against the real result, over real runs. This is
       the assertion that matters: whatever the map is, the bigger number on
       the screen must belong to whoever actually won. */
    let checked = 0, level = 0, decided = 0;
    for (let s = 1; s <= 300; s += 1) {
      const d = e.buildDraft(config, s * 7919 + 3);
      const squad = d.picks.map(p => p.choices[s % p.choices.length]);
      const run = e.runGauntlet(config, squad);
      for (const m of run.matches) {
        const shown = e.displayScore(config, m);
        checked += 1;
        if (m.won && shown.mine <= shown.theirs) fail(`${label}: a match the player WON renders ${shown.mine}-${shown.theirs}`);
        if (!m.won && shown.theirs <= shown.mine) fail(`${label}: a match the player LOST renders ${shown.mine}-${shown.theirs}`);
        if (m.wonOnPens !== null) {
          decided += 1;
          if (m.yourGoals !== m.theirGoals) fail(`${label}: a match went to the decider from ${m.yourGoals}-${m.theirGoals}, which was not level`);
        } else if (m.yourGoals === m.theirGoals) {
          level += 1;
        }
        /* The line the result screen and the share grid both print. */
        const line = e.matchLine(config, m);
        if (!line.includes(m.round.opp)) fail(`${label}: the match line does not name the opponent: ${line}`);
        if (m.wonOnPens !== null) {
          const word = (m.wonOnPens ? config.tiebreak.won : config.tiebreak.lost).toLowerCase();
          if (!line.includes(word)) fail(`${label}: a decided match does not say how: ${line}`);
        }
      }
    }
    if (checked < 300) fail(`${label}: only ${checked} matches rendered, too few to mean anything`);
    if (decided === 0) fail(`${label}: no match in 300 runs reached the decider, so the tiebreak path is untested here`);
    if (level > 0) fail(`${label}: ${level} matches ended level without going to the decider, which no board should ever show`);

    /* The sport's own words, not another sport's. A shootout is a hockey and a
       soccer thing; Round 522 put one on the NFL board. */
    const words = `${config.tiebreak.phrase} ${config.tiebreak.won} ${config.tiebreak.lost}`.toLowerCase();
    if (/shootout/.test(words) && !/hockey|nhl|soccer|gauntlet draft$/i.test(config.gameName)) {
      fail(`${label} calls its decider a shootout, and ${config.gameName} is not a sport that has one`);
    }
    if (!config.squadNoun || !config.slotsPhrase || !config.gameName || !config.gamePath) {
      fail(`${label}: the presentation half of the config is incomplete, and the shared board draws from it`);
    }
    if (failures === before) console.log(`   ${label}: scoreline strictly increasing over 0..12, ${checked} rendered matches agree with their result, ${decided} reached the decider, none shown level`);
  }
}

/* ── 7: THE POOL IS THE SOURCE, added Round 724 ──
   A draft card is a claim: this real player, this rating. The pool for three
   sports is built from a roster data file by a filter and a map, and the one
   thing that must never happen in that step is a name or a number the file
   does not hold. So every card is matched back to a row of the file on all
   four fields, as a multiset so a duplicate cannot hide behind its twin, and
   every row the binding's rule admits must be dealt from. The source rows are
   read from the data files directly, never from the binding under test. */
const keyOf = p => JSON.stringify([p.name, p.pos, p.ovr, p.team]);
function section7(sports) {
  console.log('7) the pool is the source: every card is a real row, nothing added, nothing re-rated');
  const before = failures;
  for (const { label, config, rows, eligible, extra } of sports) {
    const sportBefore = failures;
    const want = new Map();
    for (const r of rows.filter(eligible)) want.set(keyOf(r), (want.get(keyOf(r)) ?? 0) + 1);
    const got = new Map();
    for (const p of config.pool) got.set(keyOf(p), (got.get(keyOf(p)) ?? 0) + 1);
    const notInSource = [...got].filter(([k, n]) => (want.get(k) ?? 0) < n).map(([k]) => k);
    const neverDealt = [...want].filter(([k, n]) => (got.get(k) ?? 0) < n).map(([k]) => k);
    if (notInSource.length) fail(`${label}: ${notInSource.length} pool card(s) are not a row of the source data, first ${notInSource[0]}`);
    if (neverDealt.length) fail(`${label}: ${neverDealt.length} eligible source row(s) never reach the pool, first ${neverDealt[0]}`);
    if (config.pool.length < 100) fail(`${label}: the pool holds ${config.pool.length} cards, too few for the check to mean anything`);
    if (extra) extra(config);
    if (failures === sportBefore) console.log(`   ${label}: ${config.pool.length} cards, each one a row of ${rows.length} source rows (${rows.filter(eligible).length} eligible) on name, position, rating and club`);
  }
  return failures - before;
}

/* ── 8: ONE SAVE SHAPE, added Round 724 ──
   CLAUDE.md lists the save shape and the daily record shape among the things
   that must not differ per sport. This writes a real finished daily for each
   sport into a clean store and compares what lands there: the key, how many
   keys, and the full field structure of the record, arrays collapsed so a
   run that went out in round one compares with a run that lifted the trophy. */
function shapeOf(value, prefix = '', out = new Set()) {
  if (Array.isArray(value)) { for (const v of value) shapeOf(v, `${prefix}[]`, out); return out; }
  if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) { out.add(`${prefix}.${k}`); shapeOf(v, `${prefix}.${k}`, out); }
  }
  return out;
}
function section8(writers, dateStr) {
  console.log('8) one save shape: every sport writes the same daily record');
  const before = failures;
  const shapes = [];
  for (const { label, gameId, write } of writers) {
    store.clear();
    write(dateStr);
    const keys = [...store.keys()];
    const want = `${gameId}-daily-${dateStr}`;
    if (keys.length !== 1 || keys[0] !== want) { fail(`${label}: the save wrote ${JSON.stringify(keys)}, not the one key ${want}`); continue; }
    const rec = JSON.parse(store.get(want));
    if (rec.v !== 1 || rec.date !== dateStr) fail(`${label}: the record's version and date are ${rec.v} and ${rec.date}`);
    shapes.push({ label, shape: [...shapeOf(rec)].sort() });
  }
  const [ref, ...rest] = shapes;
  for (const s of rest) {
    const extra = s.shape.filter(k => !ref.shape.includes(k));
    const missing = ref.shape.filter(k => !s.shape.includes(k));
    if (extra.length || missing.length) fail(`${s.label}: the saved record's shape differs from ${ref.label}'s (extra ${extra.join(', ') || 'none'}; missing ${missing.join(', ') || 'none'})`);
  }
  if (ref && failures === before) console.log(`   ${shapes.map(s => s.label).join(', ')}: one key each under {gameId}-daily-{date}, ${ref.shape.length} field paths, identical in every sport`);
  return failures - before;
}

/* The writers section 8 compares: soccer through its own module, the rest
   through the engine with their config, each from a real draft of its own. */
function saveWriters(statics, gd, POOL) {
  return [
    { label: 'Soccer', gameId: 'gauntlet-draft', write: date => {
      const d = gd.buildDraft(POOL, gd.dailyDraftSeed(date));
      gd.saveDailyRun(date, gd.runGauntlet(d.picks.map(p => p.choices[0])));
    } },
    ...statics.map(([label, config]) => ({ label, gameId: config.gameId, write: date => {
      const e = config.__engine;
      const run = e.runGauntlet(config, draftWith(e.buildDraft(config, e.dailySeedFor(config, date)), bestOf, config.ratingOf));
      e.saveDailyRun(config, date, run);
    } })),
  ];
}

async function sourceRows() {
  const src = await bundle(`
export { FO_TEAMS } from '${ROOT}/src/data/frontOfficePlayers.ts';
export { MLB_FO_ROSTERS } from '${ROOT}/src/data/mlbFoPlayers.ts';
export { NHL_FO_ROSTERS } from '${ROOT}/src/data/nhlFoPlayers.ts';
`, 'sources');
  const flatAbbr = rosters => Object.entries(rosters).flatMap(([abbr, seeds]) => seeds.map(s => ({ name: s.name, pos: s.pos, ovr: s.ovr, team: abbr })));
  return {
    nfl: src.FO_TEAMS.flatMap(t => t.players.map(p => ({ name: p.name, pos: p.pos, ovr: p.ovr, team: `${t.city} ${t.name}` }))),
    mlb: flatAbbr(src.MLB_FO_ROSTERS),
    nhl: flatAbbr(src.NHL_FO_ROSTERS),
  };
}

const NHL_PLACEHOLDER = 68;
function poolSports(rows, nfl, mlb, nhl) {
  return [
    { label: 'NFL', config: nfl, rows: rows.nfl, eligible: r => ['QB', 'RB', 'WR', 'TE'].includes(r.pos) },
    { label: 'MLB', config: mlb, rows: rows.mlb, eligible: () => true },
    { label: 'NHL', config: nhl, rows: rows.nhl, eligible: r => r.ovr !== NHL_PLACEHOLDER, extra: config => {
      const atDefault = config.pool.filter(p => p.ovr === NHL_PLACEHOLDER);
      if (atDefault.length) fail(`NHL: ${atDefault.length} card(s) sit at the ${NHL_PLACEHOLDER} placeholder, first ${atDefault[0].name}`);
      /* The exclusion must exclude something, or the rule above is untested. */
      if (!rows.nhl.some(r => r.ovr === NHL_PLACEHOLDER)) fail(`NHL: no source row sits at ${NHL_PLACEHOLDER} any more, so revisit the exclusion in gauntletDraftNhl.ts`);
    } },
  ];
}

/* ── 9: HOW IT WAS SETTLED, added Round 826 ──
   The engine gives a level game an extra burst (one more short chance a
   side) and only then a weighted decider. Before this round only the decider
   was recorded (wonOnPens), so a game won by the one extra burst goal had
   wonOnPens null and every screen printed it as a regulation win, in all five
   sports, because all five run the same engine. Round 724's reviewer found it
   on the NHL board; it was everybody's.

   Five checks, each counted on its own so a control can require the one it
   targets:
     outcome  every run for a seed is the golden reference's run once the new
              record is set aside, so the fix moved no result, in any sport
              (soccer included, which section 1 also holds), and the traced
              reference below agrees with the golden one on every run.
     label    every match's decidedIn is the phase the traced golden
              reference wrote down as it happened.
     words    the note every screen prints (decidedNote, and soccer's
              matchNote) is exactly the sport's words below for that phase
              and that result, nothing for regulation; and for the four
              shared board sports the result line ends with that note.
     save     a daily with an extra time match reads back byte identical; a
              daily saved before this round (no decidedIn anywhere) loads as
              it always did and prints no new label; a record whose decidedIn
              is unknown or disagrees with its score is refused.
     screens  the soccer page and the shared board print the note through
              the one function, read off their code with the comments
              stripped, and neither keeps a hand written decider only label
              (the shape that hid this bug).

   SETTLED_WORDS is each sport's language, written here by hand and never
   read off the config under test, the way LINEUP_LAW is: a check that read
   the words off the binding would agree with whatever the binding says. A
   real copy change edits the binding and this table together.

   Measured on the shipped code (2026-10-01): the extra burst settles about
   one match in twenty and the decider about one in nine. Over this section's
   600 runs a sport (300 seeds, an index pick squad and a best card squad)
   the counts are fixed by the seeds, printed on the green line (extra 96 to
   107 and decider 194 to 224 across the five sports), and the floors below
   sit well under them so a sport whose extra time path stopped
   being reached cannot pass by measuring nothing. A one off probe over 2,000
   seeds a sport against origin/main's own engine and bindings found 0 of
   10,000 runs moved. */
const SETTLED_WORDS = {
  Soccer: { extra: 'after extra time', decider: 'on penalties' },
  NBA: { extra: 'in overtime', decider: 'in overtime' },
  NFL: { extra: 'in overtime', decider: 'in overtime' },
  MLB: { extra: 'in extra innings', decider: 'in extra innings' },
  NHL: { extra: 'in overtime', decider: 'in overtime' },
};
const SETTLED_FLOOR = { extra: 40, decider: 80 };

function settledSports(gd, POOL, playerRating, statics) {
  return [
    { label: 'Soccer', rounds: gd.GAUNTLET_ROUNDS, ratingOf: playerRating, nameOf: p => p.name,
      draft: seed => gd.buildDraft(POOL, seed), run: squad => gd.runGauntlet(squad), noteOf: m => gd.matchNote(m), lineOf: null,
      save: (date, run) => gd.saveDailyRun(date, run), load: date => gd.loadDailyRun(date), key: date => `gauntlet-draft-daily-${date}` },
    ...statics.map(([label, config]) => {
      const e = config.__engine;
      return { label, rounds: config.rounds, ratingOf: config.ratingOf, nameOf: config.nameOf,
        draft: seed => e.buildDraft(config, seed), run: squad => e.runGauntlet(config, squad),
        noteOf: m => e.decidedNote(config, m), lineOf: m => e.matchLine(config, m),
        save: (date, run) => e.saveDailyRun(config, date, run), load: date => e.loadDailyRun(config, date),
        key: date => `${config.gameId}-daily-${date}` };
    }),
  ];
}

/* The code of a screen with its comments taken out, so a check cannot be
   satisfied by the prose explaining it. */
const codeOf = src => src.replace(/\r\n/g, '\n').replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1').replace(/\{\s*\}/g, '');

function section9(sports) {
  console.log('9) how each match was settled: the record, the words, the save, and not one result moved');
  const counts = { outcome: 0, label: 0, words: 0, save: 0, screens: 0 };
  const firsts = {};
  const note = (kind, what) => { counts[kind] += 1; if (!firsts[kind]) firsts[kind] = what; };
  const lines = [];
  for (const sp of sports) {
    const words = SETTLED_WORDS[sp.label];
    const how = { regulation: 0, extra: 0, decider: 0 };
    let runs = 0;
    let sample = null;
    for (let s = 1; s <= 300; s += 1) {
      const d = sp.draft(s * 6151 + 29);
      for (const squad of [d.picks.map(p => p.choices[s % p.choices.length]), draftWith(d, bestOf, sp.ratingOf)]) {
        runs += 1;
        const live = sp.run(squad);
        const wrapped = squad.map(p => (p ? { name: sp.nameOf(p), p } : null));
        const rate = w => sp.ratingOf(w.p);
        const golden = goldenRunGauntlet(wrapped, sp.rounds, rate);
        const phases = goldenPhases(wrapped, sp.rounds, rate);
        if (JSON.stringify(withoutHow(live)) !== JSON.stringify(golden)) note('outcome', `${sp.label} seed ${s}: the run is not the golden reference's run`);
        if (phases.length !== golden.matches.length) note('outcome', `${sp.label} seed ${s}: the traced reference played ${phases.length} matches, the golden one ${golden.matches.length}`);
        live.matches.forEach((m, i) => {
          const phase = phases[i];
          if (!phase) return;
          how[phase] += 1;
          if (m.decidedIn !== phase) note('label', `${sp.label} seed ${s}: ${m.round.name} ${m.yourGoals}-${m.theirGoals} was settled in ${phase} and is recorded as ${m.decidedIn}`);
          const want = phase === 'regulation' ? null : `${m.won ? 'Won' : 'Lost'} ${words[phase]}`;
          const got = sp.noteOf(m);
          if (got !== want) note('words', `${sp.label} seed ${s}: a match settled in ${phase} prints ${JSON.stringify(got)}, the sport says ${JSON.stringify(want)}`);
          if (sp.lineOf) {
            const line = sp.lineOf(m);
            const tail = want === null ? `v ${m.round.opp}` : `v ${m.round.opp}, ${want.toLowerCase()}`;
            if (!line.endsWith(tail)) note('words', `${sp.label} seed ${s}: the result line "${line}" does not end "${tail}"`);
          }
        });
        /* the first run with an extra time match, traded up once for one that
           also reached the decider, so every sport tests all four bad records */
        if (phases.includes('extra') && (!sample || (sample.deciderIndex < 0 && phases.includes('decider')))) sample ={ run: live, extraIndex: phases.indexOf('extra'), deciderIndex: phases.indexOf('decider') };
      }
    }
    if (how.extra < SETTLED_FLOOR.extra) fail(`${sp.label}: only ${how.extra} matches in ${runs} runs went to the extra burst, too few for this section to mean anything`);
    if (how.decider < SETTLED_FLOOR.decider) fail(`${sp.label}: only ${how.decider} matches in ${runs} runs reached the decider, too few for this section to mean anything`);

    /* The save. */
    if (!sample) { fail(`${sp.label}: no run reached the extra burst, so the save checks measured nothing`); continue; }
    const date = '2026-10-02';
    store.clear();
    sp.save(date, sample.run);
    const stored = store.get(sp.key(date));
    if (!stored) { fail(`${sp.label}: the daily was not written under ${sp.key(date)}`); continue; }
    if (JSON.stringify(sp.load(date)) !== JSON.stringify(sample.run)) note('save', `${sp.label}: a run with an extra time match did not read back byte identical`);
    const legacy = JSON.parse(stored);
    for (const m of legacy.run.matches) delete m.decidedIn;
    store.set(sp.key(date), JSON.stringify(legacy));
    const old = sp.load(date);
    if (!old) note('save', `${sp.label}: a daily saved before Round 826, with no decidedIn, was refused`);
    else {
      if (JSON.stringify(old) !== JSON.stringify(withoutHow(sample.run))) note('save', `${sp.label}: a daily saved before Round 826 did not load as it was saved`);
      if (old.matches.some(m => 'decidedIn' in m)) note('save', `${sp.label}: a daily saved before Round 826 came back with a decidedIn it never had`);
      if (old.matches.some(m => m.wonOnPens === null && sp.noteOf(m) !== null)) note('save', `${sp.label}: a daily saved before Round 826 prints a label for a match it has no record of`);
    }
    const ei = sample.extraIndex;
    const bad = [
      ['an unknown decidedIn', r => { r.run.matches[ei].decidedIn = 'golden goal'; }],
      ['a decider with no decider result', r => { r.run.matches[ei].decidedIn = 'decider'; }],
      ['an extra time match two goals apart', r => { const m = r.run.matches[ei]; m.decidedIn = 'extra'; if (m.won) m.yourGoals += 1; else m.theirGoals += 1; }],
    ];
    if (sample.deciderIndex >= 0) bad.push(['a decider labelled extra time', r => { r.run.matches[sample.deciderIndex].decidedIn = 'extra'; }]);
    for (const [what, mutate] of bad) {
      const rec = JSON.parse(stored);
      mutate(rec);
      store.set(sp.key(date), JSON.stringify(rec));
      let out;
      try { out = sp.load(date); } catch (err) { note('save', `${sp.label}: loading a daily with ${what} threw: ${err.message}`); continue; }
      if (out !== null) note('save', `${sp.label}: a daily with ${what} loaded`);
    }
    lines.push(`${sp.label} ${runs} runs, ${how.regulation} regulation, ${how.extra} extra, ${how.decider} decider, ${bad.length} bad records refused`);
  }

  /* The screens. The soccer page prints its own lines and the four other
     sports share the board, so both are read: the note comes from the one
     function, twice on each (the running card and the result line), and
     wonOnPens is not read at all any more, which is the decider only label
     this round replaced. */
  /* The counts are the calls each file makes today: the soccer page twice on
     its running card (the test and the text) and once in its own result
     line; the board twice on its running card and matchLine twice (the share
     grid and the result list). */
  const screens = [
    ['src/pages/GauntletDraft.tsx', [['matchNote(m)', 3]]],
    ['src/components/gauntlet/GauntletBoard.tsx', [['decidedNote(config, m)', 2], ['matchLine(config, m)', 2]]],
  ];
  for (const [file, calls] of screens) {
    let src = fs.readFileSync(`${ROOT}/${file}`, 'utf8').replace(/\r\n/g, '\n');
    if (CONTROL === 'handlabel' && file.endsWith('GauntletBoard.tsx')) {
      const from = '{decidedNote(config, m) && <p className="text-xs text-muted-foreground">{decidedNote(config, m)}</p>}';
      const to = '{m.wonOnPens !== null && <p className="text-xs text-muted-foreground">{m.wonOnPens ? config.tiebreak.won : config.tiebreak.lost}</p>}';
      if (src.split(from).length - 1 !== 1) { console.error('control run: the handlabel needle is not in GauntletBoard.tsx exactly once, refusing to run a dead control'); process.exit(1); }
      src = src.replace(from, to);
      console.log('NEGATIVE CONTROL ON: the shared board prints a label for the decider only, read in memory, and the section 9 screens check must go red');
    }
    const code = codeOf(src);
    for (const [call, times] of calls) {
      const used = code.split(call).length - 1;
      if (used < times) note('screens', `${file} calls ${call} ${used} time(s), where the screens it draws need ${times}`);
    }
    if (/\bwonOnPens\b/.test(code)) note('screens', `${file} still reads wonOnPens itself, a decider only label beside the one function`);
  }

  if (counts.outcome) fail(`${counts.outcome} run(s) moved or the references disagree, first: ${firsts.outcome}`);
  if (counts.label) fail(`${counts.label} match(es) record the wrong way they were settled, first: ${firsts.label}`);
  if (counts.words) fail(`${counts.words} note(s) or line(s) say the wrong thing, first: ${firsts.words}`);
  if (counts.save) fail(`${counts.save} save problem(s), first: ${firsts.save}`);
  if (counts.screens) fail(`${counts.screens} screen problem(s), first: ${firsts.screens}`);
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  if (total === 0) for (const l of lines) console.log(`   ${l}`);
  if (total === 0) console.log('   every result as it was, every label the way the score came about, in each sport\'s own words, on every screen, and a daily from before the round loads');
  return counts;
}

async function main() {
  if (SETTLED_CONTROLS[CONTROL]) {
    const before = failures;
    let sportsMod, soccerMod;
    if (CONTROL === 'handlabel') {
      sportsMod = await bundle(`
export { NBA_GAUNTLET_CONFIG } from '${ROOT}/src/lib/gauntletDraftNba.ts';
export { NFL_GAUNTLET_CONFIG } from '${ROOT}/src/lib/gauntletDraftNfl.ts';
export { MLB_GAUNTLET_CONFIG } from '${ROOT}/src/lib/gauntletDraftMlb.ts';
export { NHL_GAUNTLET_CONFIG } from '${ROOT}/src/lib/gauntletDraftNhl.ts';
export * as engine from '${ROOT}/src/lib/gauntletEngine.ts';
`, CONTROL);
      soccerMod = await bundle(`
export * as gd from '${ROOT}/src/lib/gauntletDraft.ts';
export { players as POOL } from '${ROOT}/src/data/players.ts';
export { playerRating } from '${ROOT}/src/lib/squadDeal.ts';
`, `${CONTROL}.soccer`);
    } else {
      const paths = patchedEngineBundle(CONTROL);
      sportsMod = await bundle(`
export { NBA_GAUNTLET_CONFIG } from '${paths.nbaPath}';
export { NFL_GAUNTLET_CONFIG } from '${paths.nflPath}';
export { MLB_GAUNTLET_CONFIG } from '${paths.mlbPath}';
export { NHL_GAUNTLET_CONFIG } from '${paths.nhlPath}';
export * as engine from '${paths.enginePath}';
`, CONTROL);
      soccerMod = await bundle(`
export * as gd from '${paths.soccerPath}';
export { players as POOL } from '${ROOT}/src/data/players.ts';
export { playerRating } from '${ROOT}/src/lib/squadDeal.ts';
`, `${CONTROL}.soccer`);
    }
    const statics = [['NBA', sportsMod.NBA_GAUNTLET_CONFIG], ['NFL', sportsMod.NFL_GAUNTLET_CONFIG], ['MLB', sportsMod.MLB_GAUNTLET_CONFIG], ['NHL', sportsMod.NHL_GAUNTLET_CONFIG]]
      .map(([l, c]) => [l, { ...c, __engine: sportsMod.engine }]);
    const r = section9(settledSports(soccerMod.gd, soccerMod.POOL, soccerMod.playerRating, statics));
    const silent = SETTLED_CONTROLS[CONTROL].filter(kind => !r[kind]);
    if (silent.length === 0) {
      console.log(`\n   control: green. ${SETTLED_CONTROLS[CONTROL].map(kind => `${kind} ${r[kind]}`).join(', ')}, every check this control targets fired (${failures - before} failure line(s) in all).`);
      process.exit(0);
    }
    console.error(`\n   control: RED. The defect was put back and the ${silent.join(' and ')} check(s) stayed quiet, so they prove nothing.`);
    process.exit(1);
  }
  if (CONTROL === 'invented' || CONTROL === 'keepdefault') {
    const nhlPath = patchedNhlBinding(CONTROL);
    const mod = await bundle(`
export { NFL_GAUNTLET_CONFIG } from '${ROOT}/src/lib/gauntletDraftNfl.ts';
export { MLB_GAUNTLET_CONFIG } from '${ROOT}/src/lib/gauntletDraftMlb.ts';
export { NHL_GAUNTLET_CONFIG } from '${nhlPath}';
`, CONTROL);
    const rows = await sourceRows();
    const fired = section7(poolSports(rows, mod.NFL_GAUNTLET_CONFIG, mod.MLB_GAUNTLET_CONFIG, mod.NHL_GAUNTLET_CONFIG));
    if (fired > 0) { console.log(`\n   control: green. ${fired} failure(s) fired in section 7, as they must.`); process.exit(0); }
    console.error('\n   control: RED. The NHL pool was changed and section 7 still passed, so it proves nothing.');
    process.exit(1);
  }
  if (CONTROL === 'forkedsave') {
    const paths = patchedEngineBundle('forkedsave');
    const mod = await bundle(`
export { NBA_GAUNTLET_CONFIG } from '${paths.nbaPath}';
export { NFL_GAUNTLET_CONFIG } from '${paths.nflPath}';
export { MLB_GAUNTLET_CONFIG } from '${paths.mlbPath}';
export { NHL_GAUNTLET_CONFIG } from '${paths.nhlPath}';
export * as engine from '${paths.enginePath}';
`, 'forkedsave');
    const { gd, POOL } = await bundle(`
export * as gd from '${ROOT}/src/lib/gauntletDraft.ts';
export { players as POOL } from '${ROOT}/src/data/players.ts';
`, 'soccer');
    const statics = [['NBA', mod.NBA_GAUNTLET_CONFIG], ['NFL', mod.NFL_GAUNTLET_CONFIG], ['MLB', mod.MLB_GAUNTLET_CONFIG], ['NHL', mod.NHL_GAUNTLET_CONFIG]]
      .map(([l, c]) => [l, { ...c, __engine: mod.engine }]);
    const fired = section8(saveWriters(statics, gd, POOL), '2026-10-01');
    if (fired > 0) { console.log(`\n   control: green. ${fired} failure(s) fired in section 8, as they must.`); process.exit(0); }
    console.error('\n   control: RED. The NHL save grew a field of its own and section 8 still passed, so it proves nothing.');
    process.exit(1);
  }
  if (CONTROL === 'flatdeal') {
    const paths = patchedEngineBundle('flatdeal');
    const mod = await bundle(`
export { NBA_GAUNTLET_CONFIG } from '${paths.nbaPath}';
export { NFL_GAUNTLET_CONFIG } from '${paths.nflPath}';
export { MLB_GAUNTLET_CONFIG } from '${paths.mlbPath}';
export { NHL_GAUNTLET_CONFIG } from '${paths.nhlPath}';
export * as engine from '${paths.enginePath}';
`, 'flatdeal');
    const nba = { ...mod.NBA_GAUNTLET_CONFIG, __engine: mod.engine };
    const nfl = { ...mod.NFL_GAUNTLET_CONFIG, __engine: mod.engine };
    const mlb = { ...mod.MLB_GAUNTLET_CONFIG, __engine: mod.engine };
    const nhl = { ...mod.NHL_GAUNTLET_CONFIG, __engine: mod.engine };
    const results = [
      await section2('NBA', nba, SPREAD_FLOOR.nba, LINEUP_LAW.nba),
      await section2('NFL', nfl, SPREAD_FLOOR.nfl, LINEUP_LAW.nfl),
      await section2('MLB', mlb, SPREAD_FLOOR.mlb, LINEUP_LAW.mlb),
      await section2('NHL', nhl, SPREAD_FLOOR.nhl, LINEUP_LAW.nhl),
    ];
    if (results.every(r => r.ok)) process.exit(0);
    process.exit(1);
  }
  if (LAW_CONTROLS[CONTROL]) {
    const nhlPath = patchedNhlBinding(CONTROL);
    const mod = await bundle(`
export { NHL_GAUNTLET_CONFIG } from '${nhlPath}';
export * as engine from '${ROOT}/src/lib/gauntletEngine.ts';
`, CONTROL);
    const r = await section2('NHL', { ...mod.NHL_GAUNTLET_CONFIG, __engine: mod.engine }, SPREAD_FLOOR.nhl, LINEUP_LAW.nhl);
    const silent = LAW_CONTROLS[CONTROL].filter(kind => !r[kind]);
    if (silent.length === 0) {
      console.log(`\n   control: green. ${LAW_CONTROLS[CONTROL].map(kind => `${kind} ${r[kind]}`).join(', ')}, every check this control targets fired.`);
      process.exit(0);
    }
    console.error(`\n   control: RED. The NHL lineup rule was broken and the ${silent.join(' and ')} check(s) stayed quiet, so they prove nothing.`);
    process.exit(1);
  }
  if (CONTROL === 'badscore') {
    const paths = patchedEngineBundle('badscore');
    const mod = await bundle(`
export { NBA_GAUNTLET_CONFIG } from '${paths.nbaPath}';
export { NFL_GAUNTLET_CONFIG } from '${paths.nflPath}';
export { MLB_GAUNTLET_CONFIG } from '${paths.mlbPath}';
export { NHL_GAUNTLET_CONFIG } from '${paths.nhlPath}';
export * as engine from '${paths.enginePath}';
`, 'badscore');
    const before = failures;
    await section6([
      ['NBA', { ...mod.NBA_GAUNTLET_CONFIG, __engine: mod.engine }],
      ['NFL', { ...mod.NFL_GAUNTLET_CONFIG, __engine: mod.engine }],
      ['MLB', { ...mod.MLB_GAUNTLET_CONFIG, __engine: mod.engine }],
      ['NHL', { ...mod.NHL_GAUNTLET_CONFIG, __engine: mod.engine }],
    ]);
    const fired = failures - before;
    if (fired > 0) { console.log(`\n   control: green. ${fired} failure(s) fired in section 6, as they must.`); process.exit(0); }
    console.error('\n   control: RED. The bump was handed to the loser and section 6 still passed, so it proves nothing.');
    process.exit(1);
  }
  if (CONTROL === 'blindload') {
    const paths = patchedEngineBundle('blindload');
    const mod = await bundle(`
export { NBA_GAUNTLET_CONFIG } from '${paths.nbaPath}';
export { NFL_GAUNTLET_CONFIG } from '${paths.nflPath}';
export { MLB_GAUNTLET_CONFIG } from '${paths.mlbPath}';
export { NHL_GAUNTLET_CONFIG } from '${paths.nhlPath}';
export * as engine from '${paths.enginePath}';
`, 'blindload');
    const nba = { ...mod.NBA_GAUNTLET_CONFIG, __engine: mod.engine };
    const nfl = { ...mod.NFL_GAUNTLET_CONFIG, __engine: mod.engine };
    const mlb = { ...mod.MLB_GAUNTLET_CONFIG, __engine: mod.engine };
    const nhl = { ...mod.NHL_GAUNTLET_CONFIG, __engine: mod.engine };
    const nbaOk = await section5('NBA', nba, '2026-09-04');
    const nflOk = await section5('NFL', nfl, '2026-09-06');
    const mlbOk = await section5('MLB', mlb, '2026-09-08');
    const nhlOk = await section5('NHL', nhl, '2026-10-01');
    if (nbaOk && nflOk && mlbOk && nhlOk) process.exit(0);
    process.exit(1);
  }

  await section1();

  const mod = await bundle(`
export { NBA_GAUNTLET_CONFIG } from '${ROOT}/src/lib/gauntletDraftNba.ts';
export { NFL_GAUNTLET_CONFIG } from '${ROOT}/src/lib/gauntletDraftNfl.ts';
export { MLB_GAUNTLET_CONFIG } from '${ROOT}/src/lib/gauntletDraftMlb.ts';
export { NHL_GAUNTLET_CONFIG } from '${ROOT}/src/lib/gauntletDraftNhl.ts';
export * as engine from '${ROOT}/src/lib/gauntletEngine.ts';
`, 'sports');
  const nba = { ...mod.NBA_GAUNTLET_CONFIG, __engine: mod.engine };
  const nfl = { ...mod.NFL_GAUNTLET_CONFIG, __engine: mod.engine };
  const mlb = { ...mod.MLB_GAUNTLET_CONFIG, __engine: mod.engine };
  const nhl = { ...mod.NHL_GAUNTLET_CONFIG, __engine: mod.engine };

  await section2('NBA', nba, SPREAD_FLOOR.nba, LINEUP_LAW.nba);
  await section2('NFL', nfl, SPREAD_FLOOR.nfl, LINEUP_LAW.nfl);
  await section2('MLB', mlb, SPREAD_FLOOR.mlb, LINEUP_LAW.mlb);
  await section2('NHL', nhl, SPREAD_FLOOR.nhl, LINEUP_LAW.nhl);
  await section3('NBA', nba, nba.rounds.length);
  await section3('NFL', nfl, nfl.rounds.length);
  await section3('MLB', mlb, mlb.rounds.length);
  await section3('NHL', nhl, nhl.rounds.length);
  await section4('NBA', nba);
  await section4('NFL', nfl);
  await section4('MLB', mlb);
  await section4('NHL', nhl);
  await section5('NBA', nba, '2026-09-04');
  await section5('NFL', nfl, '2026-09-06');
  await section5('MLB', mlb, '2026-09-08');
  await section5('NHL', nhl, '2026-10-01');
  await section6([['NBA', nba], ['NFL', nfl], ['MLB', mlb], ['NHL', nhl]]);
  section7(poolSports(await sourceRows(), nfl, mlb, nhl));
  const { gd, POOL, playerRating } = await bundle(`
export * as gd from '${ROOT}/src/lib/gauntletDraft.ts';
export { players as POOL } from '${ROOT}/src/data/players.ts';
export { playerRating } from '${ROOT}/src/lib/squadDeal.ts';
`, 'soccer9'); /* its own name: section 1's 'soccer' bundle is already cached by URL without playerRating */
  section8(saveWriters([['NBA', nba], ['NFL', nfl], ['MLB', mlb], ['NHL', nhl]], gd, POOL), '2026-10-01');
  section9(settledSports(gd, POOL, playerRating, [['NBA', nba], ['NFL', nfl], ['MLB', mlb], ['NHL', nhl]]));

  console.log('');
  if (failures > 0) { console.error(`simGauntletEngine: ${failures} failure${failures === 1 ? '' : 's'}`); process.exit(1); }
  console.log('simGauntletEngine: green. Soccer plays exactly as it did, and NBA, NFL, MLB and NHL are the same game wearing their own pool, ladder and scoreboard, with every derived pool card a real source row, one save shape across all five, and every result saying how it was settled.');
}

main();
