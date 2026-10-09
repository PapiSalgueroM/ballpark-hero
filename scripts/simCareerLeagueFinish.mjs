/* Round 929: every Soccer Career season knows where the club finished.

   Before this round a playing season recorded only leagueTitle, a coin drawn
   by tier, so a player finished a season and never learned where his club
   ended up. And the elite title boost read one era blind list, so Man City
   and PSG won the league in about two seasons of three in a 1990s career
   while the era tier rules rated Man City tier 4 until 2008.

   This runs the real engine, bundled the way simCareerCleanSheets does it,
   over seeded careers, and measures:

   1. finish is 1 exactly when leagueTitle is true, every season, and a title
      season always carries a finish;
   2. a finish is never above the league size, never below 1, and a season
      in a league with a verified size always carries both fields;
   3. the tier ordering of mean finish holds over pooled seeds (elite, then
      tier 1, 2, 3, 4), each step of the ladder, not only its two ends;
   4. the current era digest: seeded careers starting in 2020 produce a state
      byte identical to the one recorded from main before this round, once the
      two new fields are taken out, so the main Math.random stream did not move
      (Round 974's story list is taken out too, see LATER_FIELDS below);
   5. the elite boost is era aware: a season played at Man City in 1995 wins
      the title at its tier's rate, at Man City in 2020 at the elite rate, and
      Real Madrid in 1995 at the elite rate (forced seasons over many seeds).

   Bands, measured on 2026-10-03 over seed offsets 0, 1, 2 and 3 (756 careers,
   6048 seasons, 5040 in a verified league, about 870 titles each):
   - section 3, mean finish share by group: elite 0.089 to 0.107, tier 1 0.198
     to 0.221, tier 2 0.424 to 0.437, tier 3 0.663 to 0.673, tier 4 0.734 to
     0.780 (tier 4 is the forced Man City 1990s seasons; no natural career
     reaches a tier 4 club in a verified league). Smallest step seen per rung:
     0.091, 0.215, 0.229, 0.061. Required: 0.05, 0.1, 0.1, 0.03, about half.
   - section 5, title rate over 240 forced seasons: Man City 1992 2.1 to 5.8%,
     PSG 2002 6.7 to 8.3% (ceiling 30%), Man City 2022 57.9 to 67.9%, Real
     Madrid 1992 61.3 to 70.0% (floor 45%). The era blind rule gave Man City
     1992 the elite rate, about 65%.
   Sections 1, 2 and 4 are exact: zero breaks, and 16 of 16 digests.

   Negative controls (each asserts its anchor exists exactly once first):
   SIM_LEAGUE_FINISH_CONTROL=notitle   the title rule leaves the module: a
     title season is drawn a finish like any other. Section 1 must go red.
   SIM_LEAGUE_FINISH_CONTROL=eliteblind the engine reads the era blind list
     again. Sections 3 and 5 must go red: 5 on the title rate, and 3 because
     the 1990s Man City rows, tier 4 by the era tables, now finish 2nd to 4th
     (measured tier 4 share 0.070 under the control).
   SIM_LEAGUE_FINISH_CONTROL=stream    the module makes one Math.random call
     per season. Section 4 must go red: the digest sees a moved stream.
   Exit 1 when a control did its job, 2 when it proved nothing or its name is
   not one this harness knows.

   Record mode: node scripts/simCareerLeagueFinish.mjs --record prints the
   per career digests of the CURRENT tree (run on main, before the round).

   Run: node scripts/simCareerLeagueFinish.mjs [careersPerTier] */
import { build } from 'esbuild';
import crypto from 'node:crypto';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { soccerTrainOutPlugin, withoutTrainFields } from './lib/soccerTrain1178.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.SIM_LEAGUE_FINISH_CONTROL || '';
/* Release AQ: notitle reddens section 4 beside section 1 now, and has to.
   Until the Soccer Career train the finish was a label and nothing read it
   back. From 2026-27 it is the place that sends his club down or brings it
   up (Round 1175), so a champion recorded somewhere else than first plays a
   different career from there on and the digests move with him. Measured
   when the release brought the controls back to life: sections 1 and 4. */
const CONTROLS = { notitle: [1, 4], eliteblind: [3, 5], stream: [4] };
if (CONTROL && !CONTROLS[CONTROL]) { console.error('unknown control ' + CONTROL + ' (known: ' + Object.keys(CONTROLS).join(', ') + ')'); process.exit(2); }
const RECORD = process.argv.includes('--record');
/* Release AQ. SIM_LEAGUE_FINISH_ATTRIBUTION=train1178 bundles this tree with
   the Soccer Career train (Rounds 1169 to 1178) taken out in memory (the
   four lists the other lane wrote for simCareerAwardsNight,
   scripts/lib/soccerTrain1178.mjs), records the 16 digests with the kept
   continental run left out, and holds them to BEFORE_TRAIN_1178, the list
   the train replaced. It is how that re-record was earned and how it can be
   checked again; it runs section 4 alone and no control beside it. */
const ATTRIBUTION = process.env.SIM_LEAGUE_FINISH_ATTRIBUTION || '';
if (ATTRIBUTION && (ATTRIBUTION !== 'train1178' || CONTROL || RECORD)) { console.error('SIM_LEAGUE_FINISH_ATTRIBUTION knows train1178 only, with no control and no --record beside it'); process.exit(2); }
const trainOut = ATTRIBUTION ? soccerTrainOutPlugin(ROOT, path, fs) : null;
const TMP = process.env.TEMP || process.env.TMP || os.tmpdir();
const WORK = path.join(TMP, `sc-leaguefinish-${process.pid}`);
fs.mkdirSync(WORK, { recursive: true });
const OUT = path.join(WORK, 'bundle.mjs');
const ENTRY = path.join(WORK, 'entry.mjs');
const lib = `${ROOT}/src/lib/`.replaceAll('\\', '/');

/* A control edits a COPY. The copies live outside src/lib, so their relative
   imports are pointed back at the real files, except the engine's import of
   the league module when the league module is the copy being mutated. */
function mutate(file, anchor, replacement) {
  const src = fs.readFileSync(`${ROOT}/src/lib/${file}`, 'utf8');
  const n = src.split(anchor).length - 1;
  if (n !== 1) { console.error(`control ${CONTROL}: the anchor appears ${n} times in ${file}, refusing to run a dead control`); process.exit(2); }
  return src.replace(anchor, replacement);
}
/* Release AQ: every relative import is pointed back, not only a sibling's.
   The engine has imported ./season/momentsSave since Round 1047 and the
   league module ../data files since Round 1100, and a copy outside src/lib
   could resolve neither, so all three controls died in the bundler
   ("Could not resolve") instead of turning their section red. Found when
   the release ran them; they fire again. */
const backToSrc = rel => path.posix.join(lib, rel);
const relocate = (src, keep = '') => src
  .replace(/from (['"])(\.\.?\/[A-Za-z0-9_./-]+)\1/g, (m, q, rel) => rel === `./${keep}` ? m : `from ${q}${backToSrc(rel)}${q}`)
  .replace(/import\((['"])(\.\.?\/[A-Za-z0-9_./-]+)\1\)/g, (m, q, rel) => rel === `./${keep}` ? m : `import(${q}${backToSrc(rel)}${q})`);
let enginePath = `${ROOT}/src/lib/soccerCareerEngine.ts`;
if (CONTROL === 'notitle') {
  const league = mutate('soccerCareerLeague.ts', 'if (input.leagueTitle) return { leagueFinish: 1', 'if (false) return { leagueFinish: 1');
  fs.writeFileSync(path.join(WORK, 'soccerCareerLeague.ts'), relocate(league));
  enginePath = path.join(WORK, 'soccerCareerEngine.ts');
  fs.writeFileSync(enginePath, relocate(fs.readFileSync(`${ROOT}/src/lib/soccerCareerEngine.ts`, 'utf8'), 'soccerCareerLeague'));
} else if (CONTROL === 'stream') {
  const league = mutate('soccerCareerLeague.ts', 'const rng = forkRng(input.seedKey);', 'const rng = forkRng(input.seedKey); Math.random();');
  fs.writeFileSync(path.join(WORK, 'soccerCareerLeague.ts'), relocate(league));
  enginePath = path.join(WORK, 'soccerCareerEngine.ts');
  fs.writeFileSync(enginePath, relocate(fs.readFileSync(`${ROOT}/src/lib/soccerCareerEngine.ts`, 'utf8'), 'soccerCareerLeague'));
} else if (CONTROL === 'eliteblind') {
  const engine = mutate('soccerCareerEngine.ts', 'const isElite = eliteInYear(ELITE_CLUBS, state.currentClub, seasonYear);', 'const isElite = ELITE_CLUBS.includes(state.currentClub);');
  enginePath = path.join(WORK, 'soccerCareerEngine.ts');
  fs.writeFileSync(enginePath, relocate(engine));
}

/* Same two stage entry with a localStorage stub as simCareerEngaged: the
   engine's import chain reaches the Supabase client module, which reads
   localStorage as it loads. Nothing here fetches anything. */
fs.writeFileSync(ENTRY, `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const mod = await import('${enginePath.replaceAll('\\', '/')}');
export const engine = mod;
export const league = await import('${lib}soccerCareerLeague.ts');
export const eras = await import('${lib}careerEras.ts');
export const world = await import('${lib}soccerCareerLeagueWorld.ts');
`);
await build({ entryPoints: [ENTRY], bundle: true, format: 'esm', platform: 'node', outfile: OUT, logLevel: 'error', alias: { '@': './src' }, absWorkingDir: ROOT, plugins: trainOut ? [trainOut.plugin] : [] });
const { engine, league, eras, world } = await import(pathToFileURL(OUT).href);
try { fs.rmSync(WORK, { recursive: true, force: true }); } catch { /* temp only */ }
const NEED = ['initCareer', 'advanceYouthYear', 'acceptOffer', 'advanceProSeason', 'dismissSummary', 'dismissNewspaper', 'dismissDebut', 'dismissWorldCup', 'dismissRivalryEvent', 'dismissBallonDor', 'applyEventChoice', 'dismissMoralDilemma', 'dismissSocialMediaPhase', 'dismissAppealResult', 'applyBdorSpeech', 'applyWorldCupSpeech', 'acceptRetirementSuggestion', 'stayAtClub', 'applyRehabChoice', 'FALLBACK_CLUBS'];
for (const k of NEED) if (!engine[k]) { console.error('engine export missing: ' + k + ', so nothing below measures anything'); process.exit(1); }
const clubs = engine.FALLBACK_CLUBS;

/* Deterministic: a seeded generator stands in for Math.random for the length
   of each career, so every red here reproduces. */
function seeded(seed) { let x = (seed * 2654435761) >>> 0 || 1; return () => { x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; }; }
const stats = v => ({ pace: v, shooting: v, passing: v, dribbling: v, defending: v, physical: v, reflexes: v });
const POSITIONS = ['ST', 'CM', 'CB', 'GK', 'LW', 'CAM', 'RB', 'CDM'];

/* simCareerCleanSheets' full phase switch: every pause the engine can raise
   between seasons is answered, an unknown one is nudged once. */
function step(s) {
  const e = engine;
  switch (s.phase) {
    case 'youth': return e.advanceYouthYear(s, clubs);
    case 'contract_offer': { const offers = s.pendingOffers || []; return offers.length ? e.acceptOffer(s, offers[0]) : { ...s, phase: 'playing' }; }
    case 'playing': return e.advanceProSeason(s, clubs);
    case 'newspaper': return e.dismissNewspaper(s);
    case 'season_summary': return e.dismissSummary(s, clubs);
    case 'international_debut': return e.dismissDebut(s, clubs);
    case 'world_cup': return e.dismissWorldCup(s, clubs);
    case 'rehab_choice': return e.applyRehabChoice(s, 1);
    case 'rivalry_event': return e.dismissRivalryEvent(s, clubs);
    case 'ballon_dor': return e.dismissBallonDor(s, clubs);
    case 'bdor_speech': return e.applyBdorSpeech(s, 0);
    case 'wc_speech': return e.applyWorldCupSpeech(s, 0);
    case 'moral_dilemma': return e.dismissMoralDilemma(s, clubs);
    case 'social_media_action': return e.dismissSocialMediaPhase(s, clubs);
    case 'red_card_appeal_result': return e.dismissAppealResult(s, clubs);
    case 'retirement_suggestion': return e.acceptRetirementSuggestion(s);
    case 'retirement_ceremony': case 'retired': return { ...s, retired: true };
    case 'random_events': {
      const ev = (s.pendingEvents || [])[0];
      if (!ev || !ev.choices || !ev.choices.length) return { ...s, phase: 'playing', pendingEvents: [] };
      return e.applyEventChoice(s, ev.choices.length - 1, clubs);
    }
    case 'contract_expiring': case 'transfer_window': return e.stayAtClub(s);
    default: { const n = e.advanceProSeason(s, clubs); return n.phase === s.phase ? { ...n, retired: true } : n; }
  }
}

function runCareer(seed, { era = '2020-24', startYear = 2020, proSeasons = 10, ovr = 64, nation = 'England', until = null } = {}) {
  const realRandom = Math.random;
  Math.random = seeded(seed * 7919 + 13);
  try {
    const position = POSITIONS[seed % POSITIONS.length];
    let s = engine.initCareer(`Sim ${seed}`, nation, position, era, stats(ovr), ovr, startYear, clubs, null, 82);
    let guard = 0;
    const played = () => (s.seasons || []).filter(r => r.type === 'playing').length;
    while (!s.retired && guard++ < 500 && played() < proSeasons) {
      if (until && until(s)) return s;
      s = step(s);
    }
    return s;
  } finally {
    Math.random = realRandom;
  }
}

/* The digest drops the two new fields and nothing else. Everything the engine
   writes into the state goes in, so a moved Math.random stream anywhere in a
   season shows up as a changed hash. */
const NEW_FIELDS = ['leagueFinish', 'leagueSize'];
/* Round 974 (the Soccer Career career story) landed beside this round and adds
   one saved field, the top level story list: each season's year, age, club and
   log lines, copied out of state the digest already hashes. It draws nothing
   from Math.random. Measured on the Release AA merge (2026-10-03): over all 16
   digest seeds the engine makes the same number of Math.random calls at every
   one of the 85 to 104 steps as the Round 929 tree, and once story is out the
   two states are equal leaf for leaf. So it leaves the digest by name, and
   nothing else does; the stream control below still turns section 4 red.
   Only the top level key goes: a random event card on main already carries
   its own story id (pendingEvents[n].story, "podcastLaunch"), and that one
   stays in the hash. */
const LATER_FIELDS = ['story'];
/* Round 1011 (every season's rating in the history) adds one key to each
   played season row, ovr, the overall the season was played at. It is copied
   from state.overall when the row is built and draws nothing from
   Math.random. Measured on 2026-10-05 by scripts/simCareerSeasonRatings.mjs
   section 3: over 16 seeds the engine with the key and a copy without it make
   the same number of Math.random calls at every step, and once ovr is out of
   the season rows the two states are equal leaf for leaf. So it leaves the
   digest on season shaped objects only (they carry both rating and
   leagueTitle, which also covers pendingSummary); an ovr anywhere else stays
   in the hash. The stream control below still turns section 4 red.
   Round 1041 (the domestic cup run) adds one more season row key, cupRun,
   drawn from its own keyed generator after the season: scripts/
   simCareerDomesticCup.mjs section 1 measures the same Math.random calls in
   every one of 2400 forced seasons with the run drawn and with no run, and
   every row field but cupRun equal. It leaves the digest the same way. */
const SEASON_ROW_FIELDS = ['ovr', 'cupRun'];
const isSeasonRow = o => o && typeof o === 'object' && 'rating' in o && 'leagueTitle' in o;
function digest(state) {
  /* with the train out, the two things it writes that no patch takes back (they draw nothing) leave the hash too */
  const s = ATTRIBUTION ? JSON.parse(JSON.stringify(state, withoutTrainFields)) : state;
  const json = JSON.stringify(s, function (k, v) { return NEW_FIELDS.includes(k) || (this === s && LATER_FIELDS.includes(k)) || (SEASON_ROW_FIELDS.includes(k) && isSeasonRow(this)) ? undefined : v; });
  return crypto.createHash('sha256').update(json).digest('hex').slice(0, 16);
}
const DIGEST_SEEDS = 16;
/* Recorded with --record on the untouched tree at origin/main 5f2622fd, before
   any line of this round existed, and twice to prove the digest is stable.
   Re-recorded by Round 1013 (twice, identical) after proving this harness
   green on origin/main 47197830 with the old digests: the round appends 51
   clubs to FALLBACK_CLUBS and the market draws a league before a club (two
   Math.random calls where pick made one), so every seeded career signs
   somewhere else. Sections 1, 2, 3 and 5 stayed green on the branch.
   Re-recorded at Release AD (2026-10-05, twice, identical): careers 1, 2 and 8 move
   because Round 972 draws continental opponents from FALLBACK_CLUBS and Round
   1013 appends 51 clubs to it. Proven on a tree of 1013 plus 972 alone (13 of
   16 matched, the same three moved); each round alone was green on its branch.
   RE-RECORDED by Round 1012 (club derbies in Soccer Career), on purpose. The
   derby swing moves popularity and morale, which gate events and dilemmas, so
   the stream after a derby season legitimately moves. What was measured first
   (2026-10-05, on the Round 1012 tree):
   - the round's three rewords alone (event 1 "Late Winner!", tunnel_brawl and
     ultras_tattoo no longer say derby), in a build with the derbies switched
     off, give 16 of these 16 old digests unchanged;
   - scripts/simCareerDerbies.mjs section 5 runs these same 16 careers in a
     build with no derbies and a build that resolves them with the swing off:
     16 of 16 equal once the derbies key is dropped, with 140 derby seasons
     played, so detecting and resolving a derby draws nothing from
     Math.random; only the bounded swing moves the stream.
   Round 1012 then merged Release AD (origin/main 37ce6d5e, Rounds 1011,
   1013 and 972) and was re-recorded once more on the merged tree
   (2026-10-06, twice, identical). On that tree simCareerDerbies section 5's
   bundle A (no derbies, rewords in) prints exactly Release AD's list,
   ['6d58659a6c7b6b19', '7a49293de3b64362', '518382abade8e4ad',
   'c2bdd490d39bf359', '0c7560cb51205a9b', 'c15c06e5974a981a',
   '18b8f7ea19915bd9', 'd32f82153f14e7d1', '66cf56b8d2f68fe1',
   'c3ccc66a13f5a240', 'c3c71a1c15ca6276', '29c2e2b92372a2ce',
   '1901945635fde622', 'bce7f1d20b6ad693', '48123ee52e75b684',
   '3e5b99f018877dbe'], 16 of 16, and bundle B (derbies resolved, swing off)
   equals it 16 of 16. With Round 1013's clubs the 16 careers play 160
   derby seasons between them and all 16 digests move, only through the
   swing. The stream control below still turns section 4 red.
   Re-recorded by Round 1024 on its merge with main 37ce6d5e (twice,
   identical) after proving main's digests green on a clean export of that
   main: the round adds one star to the 2025-2029 Ballon d'Or field and
   moves three 2020-2024 clubs, so every 2020 career draws more on its
   first awards night. Sections 1, 2, 3 and 5 stayed green.
   Re-recorded by Round 1016 (2026-10-06, twice, identical): the back line and
   holding midfielders get a defensive credit in calcSeasonRating, and the
   rating feeds development, offers and the title boost, so careers 2, 6, 7,
   10, 14 and 15 (CB, RB and CDM) move. Attribution: the same tree with the
   rule's one line taken out records 16 of 16 equal to the digests before
   this one, and the ten careers at other positions never moved.
   Re-recorded at Release AF (2026-10-06, twice, identical) on the merged
   tree of Rounds 1012, 1024 and 1016, which also carries Round 1027 (World
   Cups and continental cups play the format their year had), a fourth cause
   that no list before this one recorded. Attribution, each in a throwaway
   copy of the merged tree with the other rounds taken back out (1012 as
   simCareerDerbies bundle A: no derby detected and the swing off; 1016 its
   one credit line; 1024 the era stars fold of f0802b27 reversed; 1027
   soccerInternational.ts as at 37ce6d5e; Round 1015's rosters and
   nationality map and the continental cup citation fix as before them):
   with all of them out the tree records Release AD's list 16 of 16; with
   only 1012 in, 1012's own list 16 of 16; only 1024, 1024's 16 of 16;
   only 1016, 1016's 16 of 16 (careers 2, 6, 7, 10, 14 and 15 moved); only
   1015 or only the citation fix, Release AD's list unchanged; only 1027,
   all 16 moved. So nothing else in the release moves a digest.
   Re-recorded by Round 1037 (2026-10-06, twice, identical), on purpose:
   these careers start in 2020, so their seasons to 2025-26 are past ones,
   now played in the league each club was really in (the league ledgers),
   with derbies only against clubs in the same league that year; and the
   round releases Round 1022's seven held labels (West Ham, Wolves, Girona,
   Hertha Berlin, Nantes, River Plate Asuncion, Persija Jakarta), which
   moves the market's league groups. 9 of 16 moved (careers 1, 2, 3, 4, 5,
   8, 9, 12 and 16). Attribution, each a throwaway copy: the round taken
   out (release-ah fc30942e) records the list below it 16 of 16; only the
   seven labels released, 9 of 16 match it; only the binds (the labels put
   back), 14 of 16. Sections 1, 2, 3 and 5 stayed green; section 2 now
   sizes a season by its real league (leagueKeyInYear). The list it
   replaced (release-ah's): ['a7c772c3784e216a', '759bf037c867971d',
   '74e7fc332f6821fb', 'fafb27882724df58', 'cc6fa1f296a3bde8',
   'b829c5dd07cfb3af', 'f539f12f1794c921', 'a5de9a434ad21895',
   '52e3772cb77b5986', '120dd615a6cd5dc1', '5372f38d44597423',
   'f810d1daa7ffd030', 'f47e78ff107bf228', 'e3e83a57c9b96439',
   '8ae2cceb487c0598', '55bf134cb33eacee'].
   Re-recorded by Round 1041 (2026-10-07, twice, identical), on purpose:
   careers 1, 8 and 11 win a cup the table names, and the season's log line
   now says so ("Won the FA Cup with ..." where it said "the Domestic Cup"),
   a line of state the digest hashes. Nothing else moved. Attribution, each
   a throwaway copy of this harness with parts of the round taken back out
   in memory: the cup's name, the coin kept in a season with no cup and the
   world's old league keyed rule all out records the list it replaced 16 of
   16; only the name in, careers 1, 8 and 11 move, the same three as the
   whole round; only the coin fix in, or only the world rule in, 16 of 16
   unchanged. The cupRun key leaves the digest as a season row field (see
   SEASON_ROW_FIELDS). The list it replaced (release-ai-int 182d83ba):
   ['9376570a25d3a155', 'fcb98e5a6f7c482c', 'ee8e07e3bb4c47f8',
   '4bc40153f6613fc8', 'db3a34cd89e14e3d', 'b829c5dd07cfb3af',
   'f539f12f1794c921', '29e192b38eae5882', 'd763d6e12bcf7689',
   '120dd615a6cd5dc1', '5372f38d44597423', '63a6b8575832dc54',
   'f47e78ff107bf228', 'e3e83a57c9b96439', '8ae2cceb487c0598',
   '7498856a14c25cc2'].
   Re-recorded by Round 1100 (2026-10-08, twice, identical), on purpose:
   Round 1100: the career club pool grew from 241 to 460 clubs (every Club
   Manager league, whole), so the clubs a career is offered change, and
   eight plain leagues got a size and a derby cadence, so the Championship's
   two sourced derbies are played. 12 of the 16 careers move. Attribution,
   each the committed tree with source files swapped on a CI runner: main's
   pool file put back (51 generated rows, an empty ladder) gives 12 of the 16
   old digests; all seven source files the round changed read from Release
   AL's gated tree (the pool, the ledger names, the rivalry spellings, the
   format, cadence and size rows, the era table) gives 16 of 16 and the
   whole harness green. Nothing else in the round moves a digest. The list
   it replaced (release-al-gate b00b057d):
   ['c73abbaa2e800104', 'fcb98e5a6f7c482c', 'ee8e07e3bb4c47f8',
   '4bc40153f6613fc8', 'db3a34cd89e14e3d', 'b829c5dd07cfb3af',
   'f539f12f1794c921', '26e4c881bf412db7', 'd763d6e12bcf7689',
   '120dd615a6cd5dc1', '01b2d4b82109c7c6', '63a6b8575832dc54',
   'f47e78ff107bf228', 'e3e83a57c9b96439', '8ae2cceb487c0598',
   '7498856a14c25cc2']. */
/* (the recording history, continued)
   Re-recorded at Release AQ (2026-10-09, twice, identical), on purpose: the
   Soccer Career train (the other lane's Rounds 1169 to 1178) moves a career
   in every era: a red card ban is served the season after (1176), a deal
   after 30 follows form (1177), a listed player's move completes itself
   (1178), the award field turns over (1172, 1174) and from 2026-27 clubs
   change division (1175). All 16 digests move. Attribution, on a GitHub
   runner on the release branch (dd651c9d): SIM_LEAGUE_FINISH_ATTRIBUTION=
   train1178 bundles the same tree with the train taken out in memory (the
   four lists the other lane wrote for simCareerAwardsNight, as one:
   scripts/lib/soccerTrain1178.mjs) and records the list it replaced 16 of
   16, so nothing but the train moved them. That list stays below as
   BEFORE_TRAIN_1178 and the mode can be run again while the anchors hold.
   The same release made section 2 read a 2026 on season's size off the
   field the row saves (seasonSize above). The stream control still turns
   section 4 red. */
/* The list before the Soccer Career train (Release AP, 2026-10-09). Kept for
   SIM_LEAGUE_FINISH_ATTRIBUTION=train1178, which must record it again. */
const BEFORE_TRAIN_1178 = ['8cf1c83794b5292c', 'fcb98e5a6f7c482c', '5bf2fb10985c3c57', '777fb5fac5b6035b', 'd22dfbc0a3673f01', 'ef0fa7c25d6b1287', '9e04cfcf7ce6fa60', 'd9879baa033424cf', 'de3f258b856b5094', 'b4a01376c0a3f518', '16493c48f4e1d265', '63a6b8575832dc54', 'f47e78ff107bf228', 'e3e83a57c9b96439', '083646089db0b478', '9b739fcf66c4063e'];
const BASELINE = ['6426d16cbf9ba999', '3306c9fe9aa5342a', 'a3fe5aa3598f0c39', 'c023471be22bf543', '9d4b42b5fdfeda8a', '2cddcac6f2c00050', '7f91286e11eda2ba', 'da376f05543b07dc', '961ae0e31447de8e', '40149a1bee050088', '5ed3c74ce0481b01', 'e867cd9651716b7b', '62e945046c9d16cf', '094f3daa34552ccf', 'de9566531c5f5fec', '389df779dd2b1e8a'];
if (ATTRIBUTION) {
  let same = 0;
  const moved = [];
  for (let i = 1; i <= DIGEST_SEEDS; i++) { if (digest(runCareer(i)) === BEFORE_TRAIN_1178[i - 1]) same += 1; else moved.push(i); }
  console.log(`ATTRIBUTION ${ATTRIBUTION}: ${trainOut.seen().join(', ')} bundled with the train taken out; ${same} of ${DIGEST_SEEDS} careers record the digest the list held before the train${moved.length ? ` (moved: ${moved.join(', ')})` : ''}`);
  process.exit(same === DIGEST_SEEDS ? 0 : 1);
}
if (RECORD) {
  const out = [];
  for (let i = 1; i <= DIGEST_SEEDS; i++) out.push(digest(runCareer(i)));
  console.log(JSON.stringify(out));
  process.exit(0);
}

let failures = 0;
const red = new Set();
let section = 0;
const fail = m => { failures += 1; red.add(section); console.error('  FAIL: ' + m); };
const ELITE = ['Bayern Munich', 'PSG', 'Man City', 'Real Madrid', 'Barcelona', 'Liverpool'];

/* The pool: every era start, six nations whose academies feed the five
   verified leagues and beyond, three starting levels so every tier is
   reached. */
const PER = Number(process.argv[2] || 6);
/* A second argument shifts every seed, so the bands can be measured over several draws. */
const OFFSET = Number(process.argv[3] || 0);
const STARTS = [[1990, '1990-94'], [1995, '1995-99'], [2000, '2000-04'], [2005, '2005-09'], [2010, '2010-14'], [2015, '2015-19'], [2020, '2020-24']];
const NATIONS = ['England', 'Spain', 'Germany', 'Italy', 'France', 'Netherlands'];
const OVRS = [56, 64, 72];
const seasons = [];
let careers = 0;
for (const [startYear, era] of STARTS) for (const nation of NATIONS) for (const ovr of OVRS) for (let i = 0; i < PER; i++) {
  const seed = startYear * 1000 + NATIONS.indexOf(nation) * 100 + ovr + i * 7 + OFFSET * 1000003;
  const s = runCareer(seed, { era, startYear, proSeasons: 8, ovr, nation });
  careers += 1;
  for (const r of s.seasons || []) if (r.type === 'playing') seasons.push(r);
}
const leagueOf = name => (clubs.find(c => c.name === name) || {}).league || '';
/* Round 1037: a season is played in the league the club was really in that
   year (the league ledgers before 2026-27), not today's label */
const seasonLeague = r => league.leagueKeyInYear({ name: r.club, league: leagueOf(r.club) }, r.year) ?? '';
/* Release AQ (Round 1175, the league world): from 2026-27 a season in one of
   the five two division models is played in the division the CAREER has the
   club in, and the row saves that field (leagueWorld.members). A club that
   went down from the Premier League plays a 24 club Championship season, so
   its verified size is the saved field's and not its static label's: read
   against the label, section 2 called 6 right sizes wrong. A row whose
   saved field does not read (readLeagueWorldSeason refuses a size that
   disagrees with its own field) falls back to the label and still fails. */
const seasonSize = r => world.readLeagueWorldSeason(r)?.members.length ?? league.leagueSizeFor(seasonLeague(r), r.year);
const sized = seasons.filter(r => seasonSize(r));
console.log(`pool: ${careers} careers, ${seasons.length} playing seasons, ${sized.length} in a league with a verified size, ${seasons.filter(r => r.leagueTitle).length} titles`);
if (seasons.length < careers * 4) { section = 1; fail(`only ${seasons.length} playing seasons over ${careers} careers, the walk is not reaching the season loop`); }

/* Forced seasons: a career walked to its first pro season, then put at one
   club, era correct tier and league, for one season, over many seeds. They
   feed section 5, and the Man City 1990s rows give section 3 its tier 4 step,
   which no natural career reaches in a verified league. */
const FORCED = 240;
function forcedSeasons(club, startYear, era) {
  let titles = 0, n = 0, year = null;
  const rows = [];
  for (let i = 1; i <= FORCED; i++) {
    const seed = 50000 + startYear * 7 + i + OFFSET * 1000003;
    let s = runCareer(seed, { era, startYear, until: x => x.phase === 'playing' && !(x.seasons || []).some(r => r.type === 'playing') });
    if (s.phase !== 'playing') continue;
    const next = (s.seasons[s.seasons.length - 1]?.year ?? startYear) + 1;
    const adj = eras.adjustClubsForYear(clubs, next).find(c => c.name === club);
    s = { ...s, currentClub: club, currentClubTier: adj.tier, currentLeague: adj.league, currentClubCountry: adj.country };
    const realRandom = Math.random;
    Math.random = seeded(seed * 31 + 7);
    try { s = engine.advanceProSeason(s, clubs); } finally { Math.random = realRandom; }
    const row = (s.seasons || []).filter(r => r.type === 'playing').pop();
    if (!row || row.club !== club) continue;
    n += 1; year = row.year; rows.push(row); if (row.leagueTitle) titles += 1;
  }
  return { rate: n ? titles / n : 0, n, year, rows };
}
const CASES = [
  ['Man City', 1990, '1990-94', 'tier'], ['Man City', 2020, '2020-24', 'elite'],
  ['Real Madrid', 1990, '1990-94', 'elite'], ['PSG', 2000, '2000-04', 'tier'],
];
const FORCED_RESULTS = {};
for (const [club, startYear, era, want] of CASES) FORCED_RESULTS[club + want] = forcedSeasons(club, startYear, era);

section = 1;
console.log('1) finish is 1 exactly when leagueTitle is true');
{
  let bad = 0, titled = 0, titledNoFinish = 0, firstsNoTitle = 0;
  for (const r of seasons) {
    if (r.leagueTitle) { titled += 1; if (r.leagueFinish !== 1) { titledNoFinish += 1; bad += 1; } }
    else if (r.leagueFinish === 1) { firstsNoTitle += 1; bad += 1; }
  }
  console.log(`   ${titled} title seasons, ${titledNoFinish} of them without a 1st; ${firstsNoTitle} seasons 1st without the title`);
  if (titled < 20) fail(`only ${titled} title seasons in the pool, too few to say anything`);
  if (bad) fail(`${bad} seasons break the rule`);
}

section = 2;
console.log('2) never above the league size, never below 1, and a verified league always carries both');
{
  let over = 0, under = 0, missing = 0, wrongSize = 0, unsizedClaim = 0, cutShort = 0;
  for (const r of seasons) {
    const size = seasonSize(r);
    if (r.leagueFinish !== undefined && r.leagueFinish < 1) under += 1;
    if (r.leagueSize !== undefined && r.leagueFinish > r.leagueSize) over += 1;
    /* A severe injury stops the season at the rehab choice and drops the
       title roll (Round 850); the finish goes with it, by design. */
    if (size && r.leagueFinish === undefined && r.injurySevere && !r.leagueTitle) { cutShort += 1; continue; }
    if (size && (r.leagueFinish === undefined || r.leagueSize !== size)) { if (r.leagueFinish === undefined) missing += 1; else wrongSize += 1; }
    if (!size && r.leagueSize !== undefined) unsizedClaim += 1;
    if (!size && r.leagueFinish !== undefined && r.leagueFinish !== 1) unsizedClaim += 1;
  }
  console.log(`   over ${over}, under ${under}, verified without a finish ${missing}, wrong size ${wrongSize}, a claim in an unverified league ${unsizedClaim}; ${cutShort} seasons cut short by a severe injury carry none, by design`);
  if (sized.length < seasons.length * 0.3) fail(`only ${sized.length} of ${seasons.length} seasons in a verified league, the pool is not testing the sizes`);
  if (over + under + missing + wrongSize + unsizedClaim) fail('a finish sits outside its table, or a size is claimed where none is verified');
}

section = 3;
console.log('3) the tier ladder of mean finish, as a share of the table, every step');
const STEP_MIN = [0.05, 0.1, 0.1, 0.03];
const groupOf = r =>(league.eliteInYear(ELITE, r.club, r.year) ? 'elite' : `tier ${Math.min(4, r.clubTier)}`);
const LADDER = ['elite', 'tier 1', 'tier 2', 'tier 3', 'tier 4'];
const groups = Object.fromEntries(LADDER.map(g => [g, []]));
const forcedLow = FORCED_RESULTS['Man Citytier'].rows;
for (const r of [...sized, ...forcedLow]) if (r.leagueFinish !== undefined && r.leagueSize) groups[groupOf(r)].push(r.leagueFinish / r.leagueSize);
const mean = a => a.reduce((x, y) => x + y, 0) / (a.length || 1);
const means = LADDER.map(g => mean(groups[g]));
console.log('   ' + LADDER.map((g, i) => `${g}: ${means[i].toFixed(3)} over ${groups[g].length}`).join(', '));
for (let i = 1; i < LADDER.length; i++) {
  const [a, b] = [LADDER[i - 1], LADDER[i]];
  if (groups[a].length < 15 || groups[b].length < 15) { fail(`${a} (${groups[a].length}) or ${b} (${groups[b].length}) has fewer than 15 seasons, the step cannot be read`); continue; }
  if (!(means[i] - means[i - 1] >= STEP_MIN[i - 1])) fail(`${b} mean share ${means[i].toFixed(3)} is not at least ${STEP_MIN[i - 1]} below ${a} ${means[i - 1].toFixed(3)}`);
}

section = 4;
console.log('4) a current era career is byte identical to main once the two new fields are out');
{
  let same = 0, withFinish = 0, totalSeasons = 0;
  for (let i = 1; i <= DIGEST_SEEDS; i++) {
    const s = runCareer(i);
    if (digest(s) === BASELINE[i - 1]) same += 1;
    for (const r of s.seasons || []) if (r.type === 'playing') { totalSeasons += 1; if (r.leagueFinish !== undefined) withFinish += 1; }
  }
  console.log(`   ${same} of ${DIGEST_SEEDS} careers match the main digest; ${withFinish} of their ${totalSeasons} playing seasons carry a finish`);
  if (same !== DIGEST_SEEDS) fail(`${DIGEST_SEEDS - same} careers moved: the main Math.random stream or something else in the state changed`);
  if (withFinish === 0) fail('no digest season carries a finish, so the match above proves nothing about the new fields');
}

section = 5;
console.log('5) the elite boost reads the era: forced first seasons over many seeds');
const ELITE_MIN = 0.45;
const TIER_MAX = 0.3;
for (const [club, , , want] of CASES) {
  const r = FORCED_RESULTS[club + want];
  console.log(`   ${club}, first pro season ${r.year}: title rate ${(r.rate * 100).toFixed(1)}% over ${r.n} seasons, expected the ${want} rate`);
  if (r.n < FORCED * 0.6) { fail(`${club}: only ${r.n} forced seasons landed, the setup is not reaching the season`); continue; }
  if (want === 'elite' && r.rate < ELITE_MIN) fail(`${club} ${r.year}: ${(r.rate * 100).toFixed(1)}% is under the elite floor ${ELITE_MIN * 100}%`);
  if (want === 'tier' && r.rate > TIER_MAX) fail(`${club} ${r.year}: ${(r.rate * 100).toFixed(1)}% is over the era tier ceiling ${TIER_MAX * 100}%, the era blind boost is back`);
}

console.log('');
if (CONTROL) {
  const want = CONTROLS[CONTROL];
  const got = [...red].sort();
  const same = got.length === want.length && want.every(w => red.has(w));
  if (same) { console.log(`simCareerLeagueFinish: control ${CONTROL} turned section ${want.join(', ')} red and nothing else. The check works.`); process.exit(1); }
  console.log(`simCareerLeagueFinish: control ${CONTROL} should have reddened exactly section ${want.join(', ')}, got [${got.join(', ') || 'none'}]. The control proves nothing.`);
  process.exit(2);
}
if (failures) { console.error(`simCareerLeagueFinish: ${failures} failure(s) in section(s) ${[...red].sort().join(', ')}`); process.exit(1); }
console.log(`simCareerLeagueFinish: green. ${careers} careers, ${seasons.length} seasons, ${sized.length} in a verified league; finish and title agree, the ladder holds, main's stream is untouched and the elite boost reads the era.`);
