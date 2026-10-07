/* simCareerHall.mjs, Round 915: the retirement talk and the Hall of Fame on
   careers the four US engines really play.

   Run: node scripts/simCareerHall.mjs <nfl|nba|mlb|nhl> [careers, default 2000]
        SIM_CONTROL=<name> runs one negative control (the list is CONTROLS below).
   With no sport (how runAllSims calls it) it runs all four, one child each,
   and exits with the worst code; give a sport to keep a run short.

   WHAT IT HOLDS, per sport, each with a control that must turn it red:
     1. iff        inducted if and only if the sport's own legacyOf says hof,
                   read straight from the engine (exported by the bundle
                   entry), never through the Hall binding, and the record's
                   score is that legacyOf score. Controls everyonein (the
                   ballot) and bindhof (the binding).
     1b. outcome   every career outside the Hall: off the ballot exactly under
                   half the Hall line; on it, a Hall with a ballot limit drops
                   him (early only under the stay floor, and no earlier ballot
                   under it), one without a limit keeps him waiting. Where the
                   Hall has a stay floor, a real share falls off early.
                   Controls outcomeswap, nominationgone, oldcurve (mlb only).
     2. table      the data file's rules equal the audit table in
                   docs/audits/US-HALL-RULES-2026-10.md, and every career's
                   first class is its last season, read off the save, plus
                   that table's offset. Control waitoff.
     3. rises      the first ballot share rises with the score. Measured two
                   ways: on the real careers, at every one of the nine cuts
                   between score deciles of the Hall of Famers (all deciles
                   above the cut against all below), and on a ladder of
                   synthetic candidates walked step by step up the Hall band.
                   Control flatfirst.
     4. promise    a score at the verdict's first ballot line always goes in
                   first ballot. Control nopromise.
     5. keyed      no Math.random draw while the Hall record and the speech
                   are made, and the same career gives the same record twice.
                   Control mathrandom.
     6. sides      every elected share is at or over the threshold, every
                   other share under it, no more ballots than the Hall allows,
                   and an early fall off is under the floor. Controls
                   sharesides, and shownraw (mlb only: the fall off reads the
                   raw share, not the one the card prints).
     7. talk       the retirement talk comes exactly when an independent
                   reading of the rule says, and reaches a real share of
                   careers before the hard stop. Control notalk.
     7b. answers   the loop answers the talk as a board would: a quarter of
                   the careers never answer, a quarter play one more year
                   every time, a quarter retire at the first talk, a quarter
                   announce a farewell. Retire now ends the career on that
                   season, one more year plays the next, a farewell plays
                   exactly one more season marked as the farewell. The talk
                   check reads the answers too. Controls farewelloff, retireoff.
     8. jersey     the jersey goes to the club with the most seasons (ties to
                   games, then the first club), named by the engine's own
                   club label, never a bare id. Controls jerseyfirst, jerseyraw.

   ROUND 1039, sections 9 to 14: the same rules on the BOARD's own loop. The
   real binding (nflCareerSport.ts and its siblings), its summer deal and
   answers (usCareerSummer.ts) and the talk where the board asks it
   (usCareerRetirementFlow.ts): season, progress, the hard stop or a chosen
   end, the deal with the talk filter, the talk, every card. Each career runs
   on its own keyed stream, so two policies on one career draw the same
   numbers until they really differ. 400 careers a policy by default
   (SIM_BOARD_CAREERS), 100 a league era for section 13 (SIM_ERA_CAREERS),
   800 a build for section 14 (SIM_BALANCE_CAREERS).
     9. identity   careers that answer 'one more year' every time are byte
                   for byte the loop with no talk at all (the deck's
                   retirement cards held out by this file's own reading of
                   the rule), but for the answers block. Control talkdraws
                   (one Math.random in pendingTalk).
    10. ends       Retire now ends on the talk's season; a farewell, said at
                   the talk or on a deck card ("Next season is your last"),
                   ends exactly one season later and that season is marked.
                   Controls farewelloff (Round 915's) and deckfarewelloff (the
                   deck's answers back to the bare flag).
    11. once       no offseason that has the talk is offered a deck retirement
                   card, and RETIREMENT_CARD_IDS is every card whose answer
                   writes a farewell or says it does, read off the engine's
                   own deck builders, with no id that is never dealt. Control
                   twice (the filter off). Since the review fix of 2026-10-07
                   the loop asks the talk where the board does in every case:
                   right after the deal, after a card whose answer moved the
                   rating into the rule (before the next card, or on the hub),
                   and on the hub after a banned year, which deals no summer
                   and has no hard stop, as on the board. Only the cards from
                   the talk on are checked. The deck's retirement cards lift
                   morale, so the deal never puts one in a later slot, and the
                   mid-summer path never meets one here: the seek time filter
                   and the declined clause are held by the vitest file
                   src/test/usCareerHallBoard.test.tsx, whose controls do fire.
    11b. seek      (closing check fix, 2026-10-07) so the seek time hold-out
                   is held here too: the first 300 careers the oneMore policy
                   brings to the talk are caught there, before the answer,
                   and a summer is forged to stand on each deck retirement
                   card the deck really holds then, at card 1 (a save
                   restored on a card dealt before the talk) and at card 2,
                   with the talk pending and again after 'One more year'.
                   The board's seek (seekSummerCard with talkDeckFilter) must
                   never land on one; with no hold-out the same seek must
                   land on some (the floor), so it cannot pass on nothing.
                   At card 2 the rating rule already skips every one of them
                   (0 landed with no hold-out in every run), so the hold-out
                   is load-bearing at card 1 only. Control seekexclude (the
                   review's mutation M2, the hold-out dropped from the seek).
    12. deckJersey a club that retired the number on a deck card is the club
                   the card names (even where another club has more seasons),
                   on real careers and on synthetic ones with twelve seasons
                   elsewhere; a wait answer writes no club. Control
                   jerseyignore (the recorded club ignored).
    13. era        the card the board renders, for careers in every league era
                   and for synthetic ballots on both sides of the line, prints
                   "Class of X" and the class years only when the first class
                   is at or after the audit table's verifiedFromClass, and no
                   year and no rule line before it. Control eraunguarded.
    14. balance    (nhl only) the walk away card wrote OVR 63 for the farewell
                   year; now it writes the farewell. The same careers built
                   once with the old answer, measured: the farewell season's
                   own line where both builds took it the same offseason, and
                   the median legacy and Hall share over every career.

   BANDS for sections 9 to 14, measured 2026-10-06 and 07 (Round 1039) on a
   machine shared with other builders, 400 board careers a policy:
     9 to 13 are exact: zero misses in every run. Their floors only stop a
     check from passing on nothing (talks answered, ends of each kind, talk
     offseasons, synthetic jerseys, both sides of the era line). Default
     seed: talks answered one more year nfl 1118, nba 1328, mlb 1277, nhl
     1202; deck farewells nfl 28, nba 8, mlb 36, nhl 124; talk offseasons
     2577 to 3054; deck retired numbers nfl 57 (5 at a club with fewer
     seasons), nba 90 (30), mlb 75 (14), nhl none (its deck has no jersey
     card, so the synthetic careers carry section 12 there); throwback eras
     below the verified class nfl 28, nba 31, nhl 4 of 100, mlb 0 (its line
     is the Class of 2014, so the synthetic boundary ballots carry it).
     Re-measured 2026-10-07 on the review fix's loop (the talk asked
     mid-summer and after a banned year, no summer after a banned year),
     default seed, all four green: talks answered one more year nfl 1122,
     nba 1325, mlb 1281, nhl 1206; talk offseasons nfl 2585, nba 3048, mlb
     2952, nhl 2781, of them asked mid-summer 9, 0, 9, 6 and after a banned
     year 11, 42, 10, 32; deck farewells and deck retired numbers unchanged
     (nfl 57, 5 elsewhere; nba 90, 30; mlb 75, 14); section 14 unchanged.
     14, six NHL seeds (default and SIM_SEED 1 to 5), 800 careers a build:
       walk away farewells taken the same offseason in both builds 16, 12,
       12, 21, 17, 10 (of 56, 42, 43, 56, 60, 58). Band: at least 5.
       that farewell season's OVR, old build 63.0 every time, now 83.3 to
       86.3 (a gain of 20.3 to 23.3); points (wins for a goalie) 14.8 to
       18.7 became 48.0 to 70.0. Band: OVR gain at least 10.
       Hall share over every career moved -0.12 to -0.75 points. Band: 2.5.
       median legacy over every career moved 0 to -7. Band: 15.
       (Seeds 1 to 3 ran before the bands were set and were red only on the
       placeholder case floor of 30; every other check was green.)

   A control run exits 1 only when the check it targets is red (FIRED), and 0
   when it is not (DID NOT FIRE), whatever else went red.

   BANDS, from measured headroom. Measured 2026-10-03 at 2000 careers a sport,
   the default seed plus SIM_SEED 1 to 5 (six runs a sport), on the tree with
   the answers loop (a quarter of careers retire at the first talk):
     rises, real careers: at each of the nine decile cuts, the first ballot
       share above the cut minus below it. Smallest cut of six runs:
       nfl 0.312, nba 0.142, mlb 0.298, nhl 0.341. Band: every cut at least
       0.06. (A single decile against its neighbour is too small a sample:
       mlb's second decile came out under its first in one run.)
     outcome, early fall off where the Hall has a stay floor (mlb): early
       fall offs over careers on the ballot outside the Hall, 28.1 to 31.5
       percent in six runs (2 in 1053 before the review's curve change).
       Band: at least 10 percent.
     sides, the floor sweep (mlb): synthetic ballots shown at exactly the
       floor, 345 to 379 in six runs (under shownraw 178 of them miss).
       Band: at least 100, so the 4.96 shown as 5.0 guard is really exercised.
     rises, ladder: ten steps up the Hall band, 4000 synthetic candidates a
       step, every step must rise. The expected step is 0.07; the smallest
       step of all 24 seeded runs was 0.036 (nhl). Band: every step over 0.015.
     talk reach: share of careers asked at least once before the hard stop.
       Lowest of six: nfl 86.8, nba 100, mlb 100, nhl 97.2. Band: at least 70.
     iff: inducted is 19.6 to 21.6 percent (nfl), 28.2 to 31.1 (nba), 36.2 to
       39.4 (mlb), 28.1 to 31.1 (nhl) of these careers. Band: at least 5
       percent, so the check can never pass on an empty Hall.
     mlb careers under ten seasons with games that reach the Hall or the
       ballot (printed, not checked; the real ballot needs ten): 0 in all six.
   Everything else is exact: zero misses, every run, every seed.
   These careers pick event answers at random and never change teams by
   choice, so the shares are this loop's, not the game's; the checks are about
   the Hall reading the verdict right, which holds for any career. */

/* Round 299: seeded stream, see scripts/lib/seedRandom.mjs. First import on purpose. */
import './lib/seedRandom.mjs';
import os from 'node:os';
import path from 'node:path';
import { build } from 'esbuild';
import { readFileSync, unlinkSync } from 'node:fs';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const SELF = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(SELF), '..');
const SPORT = process.argv[2];
const CAREERS = Number(process.argv[3] || 2000);
const CONTROL = process.env.SIM_CONTROL || '';

const ENGINES = {
  nfl: { file: 'nflMyCareer.ts', hall: 'NFL_CAREER_HALL', legacy: 'legacyOf', label: 'teamLabelOf', arch: 'ARCHETYPES', start: 'startCareer', season: 'simSeason', progress: 'progress', event: 'drawEvent', stop: 'shouldRetire', roll: 'rollTeamQuality', binding: 'NFL_CAREER_SPORT', eras: 'NFL_ERAS', positions: ['QB', 'RB', 'WR', 'TE', 'LB', 'CB', 'EDGE', 'K'] },
  nba: { file: 'nbaMyCareer.ts', hall: 'NBA_CAREER_HALL', legacy: 'nbaLegacyOf', label: 'nbaTeamLabelOf', arch: 'NBA_ARCHETYPES', start: 'startNbaCareer', season: 'simNbaSeason', progress: 'nbaProgress', event: 'drawNbaEvent', stop: 'nbaShouldRetire', roll: 'nbaRollTeamQuality', binding: 'NBA_CAREER_SPORT', eras: 'NBA_ERAS', positions: ['PG', 'SG', 'SF', 'PF', 'C'], banned: { ppg: 0, rpg: 0, apg: 0 } },
  mlb: { file: 'mlbMyCareer.ts', hall: 'MLB_CAREER_HALL', legacy: 'mlbLegacyOf', label: 'mlbTeamLabelOf', arch: 'MLB_ARCHETYPES', start: 'startMlbCareer', season: 'simMlbSeason', progress: 'mlbProgress', event: 'drawMlbEvent', stop: 'mlbShouldRetire', roll: 'mlbRollTeamQuality', binding: 'MLB_CAREER_SPORT', eras: 'MLB_ERAS', positions: ['SP', 'RP', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH'] },
  nhl: { file: 'nhlMyCareer.ts', hall: 'NHL_CAREER_HALL', legacy: 'nhlLegacyOf', label: 'nhlTeamLabelOf', arch: 'NHL_ARCHETYPES', start: 'startNhlCareer', season: 'simNhlSeason', progress: 'nhlProgress', event: 'drawNhlEvent', stop: 'nhlShouldRetire', roll: 'nhlRollTeamQuality', binding: 'NHL_CAREER_SPORT', eras: 'NHL_ERAS', positions: ['C', 'LW', 'RW', 'D', 'G'] },
};
if (!SPORT) {
  // runAllSims calls every harness with no arguments: run the four sports, one child each.
  let worst = 0;
  for (const s of Object.keys(ENGINES)) {
    const r = spawnSync(process.execPath, [SELF, s, String(CAREERS)], { stdio: 'inherit', env: process.env, cwd: ROOT });
    worst = Math.max(worst, r.status ?? 1);
  }
  console.log(`simCareerHall: ${worst ? 'RED' : 'all four sports green'}`);
  process.exit(worst);
}
const E = ENGINES[SPORT];
if (!E) { console.error(`usage: node scripts/simCareerHall.mjs <${Object.keys(ENGINES).join('|')}> [careers]`); process.exit(2); }

/* Each control rewrites one string in one source file as it is bundled. The
   string must be there, or the control refuses to run: a control that
   changes nothing would leave the harness green for the wrong reason. */
const CONTROLS = {
  everyonein: { file: 'careerHallOfFame.ts', from: 'if (cand.hof) {', to: 'if (true) {' },
  bindhof: { file: 'careerHallOfFame.ts', from: 'return { score: l.score, hof: l.hof };', to: 'return { score: l.score, hof: true };' },
  outcomeswap: { file: 'careerHallOfFame.ts', from: 'rules.ballotYears !== null ? "fellOff" : "waiting"', to: 'rules.ballotYears === null ? "fellOff" : "waiting"' },
  nominationgone: { file: 'careerHallOfFame.ts', from: 'if (cand.score < lines.hofLine * HALL_GAME_RULES.nominationShare) {', to: 'if (false) {' },
  waitoff: { file: `${SPORT}CareerHall.ts`, re: /firstClassOffset: (\d+),/, to: (m, n) => `firstClassOffset: ${Number(n) + 1},` },
  flatfirst: { file: 'careerHallOfFame.ts', from: 'return f + (1 - f) * bandFraction(score, lines);', to: 'return f;' },
  nopromise: { file: 'careerHallOfFame.ts', from: 'if (score >= lines.firstBallotScore) return 1;', to: 'if (score >= lines.firstBallotScore) return 0.5;' },
  mathrandom: { file: 'careerHallOfFame.ts', from: 'const rng = keyedRng(`hall:${rules.sport}:${cand.key}`);', to: 'const rng = Math.random;' },
  // MLB only (the one Hall with a stay floor): the opening share curve before the review, under which almost nobody fell off early.
  oldcurve: { file: 'careerHallOfFame.ts', from: 'let share = (t - 10) * reach ** 4 * (0.3 + 0.7 * rng());', to: 'let share = (t - 10) * reach * reach * (0.6 + 0.4 * rng());' },
  // MLB only (the one Hall with a stay floor): the fall off reads the raw share, not the one the card prints.
  shownraw: { file: 'careerHallOfFame.ts', from: 'if (rules.stayFloor !== null && shown < rules.stayFloor) {', to: 'if (rules.stayFloor !== null && share < rules.stayFloor) {' },
  sharesides: { file: 'careerHallOfFame.ts', from: 'const final = Math.min(99.7, t + ', to: 'const final = Math.min(99.7, t - 20 + ' },
  farewelloff: { file: 'careerRetirement.ts', from: 'return block.farewellYear !== undefined && year >= block.farewellYear;', to: 'return block.farewellYear !== undefined && year > block.farewellYear;' },
  retireoff: { file: 'careerRetirement.ts', from: 'if (block.retiredYear !== undefined && year >= block.retiredYear) return true;', to: 'if (false) return true;' },
  notalk: { file: 'careerRetirement.ts', from: 'if (drop >= rule.dropFromPeak) return', to: 'if (false) return' },
  jerseyfirst: { file: 'careerHallOfFame.ts', from: 't.seasons > best.seasons ||', to: 't.seasons < best.seasons ||' },
  jerseyraw: { file: 'careerHallOfFame.ts', from: 'teamName: (team, c) => def.teamLabel(team, c.eraId),', to: 'teamName: (team) => team,' },
  // Round 1039, sections 9 to 13.
  talkdraws: { file: 'usCareerRetirementFlow.ts', from: 'if (!hall || c.retired || c.seasons.length === 0) return null;', to: 'Math.random(); if (!hall || c.retired || c.seasons.length === 0) return null;' },
  deckfarewelloff: { file: `${SPORT}CareerLifeB.ts`, re: /announceFarewell\(cc\);/g, to: '' },
  twice: { file: 'usCareerRetirementFlow.ts', from: 'return e => RETIREMENT_CARD_IDS.has(e.id) && talkThisOffseason(c, hall);', to: 'return e => false && RETIREMENT_CARD_IDS.has(e.id);' },
  // Closing check fix, 2026-10-07: the seek time hold-out dropped (the review's mutation M2), section 11b.
  seekexclude: { file: 'usCareerSummer.ts', from: 'if (card && !(exclude && exclude(card)) && (s.at === 0', to: 'if (card && (s.at === 0' },
  jerseyignore: { file: 'careerHallOfFame.ts', from: 'sport.recordedJersey?.(c) ?? jerseyFor(', to: 'jerseyFor(' },
  eraunguarded: { file: 'HallOfFameCard.tsx', from: 'rec.firstClass >= rules.verifiedFromClass', to: 'true' },
};
if (CONTROL && !CONTROLS[CONTROL]) { console.error(`unknown SIM_CONTROL ${CONTROL}`); process.exit(2); }
let controlFired = false;
const controlPlugin = {
  name: 'control',
  setup(b) {
    if (!CONTROL) return;
    const ctl = CONTROLS[CONTROL];
    b.onLoad({ filter: /\.tsx?$/ }, args => {
      if (path.basename(args.path) !== ctl.file) return undefined;
      const src = readFileSync(args.path, 'utf8');
      const hit = ctl.re ? ctl.re.test(src) : src.includes(ctl.from);
      if (!hit) throw new Error(`control ${CONTROL}: its string is not in ${ctl.file}, refusing to run`);
      controlFired = true;
      return { contents: ctl.re ? src.replace(ctl.re, ctl.to) : src.replace(ctl.from, ctl.to), loader: args.path.endsWith('x') ? 'tsx' : 'ts' };
    });
  },
};

const OUT = path.join(os.tmpdir(), `career-hall-${SPORT}-${CONTROL || 'base'}-${process.pid}.mjs`);
const entry = [
  // The engine's own legacyOf, read straight from the engine, so the iff check
  // never goes through the Hall binding it is checking.
  `export { ${E.legacy} as LEGACY, ${E.label} as LABEL, ${E.arch} as ARCH, ${E.start} as start, ${E.season} as season, ${E.progress} as progress, ${E.event} as drawEvent, ${E.stop} as stop, ${E.roll} as roll } from './src/lib/${E.file}';`,
  `export { ${E.hall} as HALL } from './src/lib/${SPORT}CareerHall.ts';`,
  `export { hallRecordFor, runHallBallot } from './src/lib/careerHallOfFame.ts';`,
  `export { giveHallSpeech, HALL_SPEECHES } from './src/lib/careerHallSpeech.ts';`,
  `export { retirementTalk, answerRetirement, careerEndsAfter, isFarewellSeason } from './src/lib/careerRetirement.ts';`,
  // Round 1039: the board's own pieces, for sections 9 to 14.
  `export { ${E.binding} as SPORTB } from './src/lib/${SPORT}CareerSport.ts';`,
  `export { ${E.eras} as ERAS } from './src/lib/${E.file}';`,
  `export { startSummer, answerSummerCard, seekSummerCard, summerCardAt, summerSeason } from './src/lib/usCareerSummer.ts';`,
  `export { pendingTalk, answerTalk, endsAfterSeason, talkDeckFilter, RETIREMENT_CARD_IDS } from './src/lib/usCareerRetirementFlow.ts';`,
  `export { HallOfFameCard, hallYearsShown, hallHeadline, ballotLine, hallRuleLines } from './src/components/career/HallOfFameCard.tsx';`,
  `export { renderToStaticMarkup } from 'react-dom/server';`,
  `export { createElement } from 'react';`,
].join('\n');
await build({
  stdin: { contents: entry, resolveDir: ROOT, loader: 'ts' },
  bundle: true, format: 'esm', platform: 'node', outfile: OUT, absWorkingDir: ROOT,
  logLevel: 'error', alias: { '@': './src' }, plugins: [controlPlugin], jsx: 'automatic', banner: { js: "import { createRequire as __hallRequire } from 'node:module'; const require = __hallRequire(import.meta.url);" },
});
// Round 1039: the bindings read localStorage; this run keeps it in memory.
const store = new Map();
globalThis.localStorage ??= { getItem: k => (store.has(k) ? store.get(k) : null), setItem: (k, v) => { store.set(k, String(v)); }, removeItem: k => { store.delete(k); }, clear: () => store.clear(), key: () => null, length: 0 };
const eng = await import(pathToFileURL(OUT).href);
try { unlinkSync(OUT); } catch { /* the temp file is only a copy */ }
if (CONTROL && !controlFired) { console.error(`control ${CONTROL} never reached its file, refusing to report`); process.exit(2); }
const { HALL } = eng;

/* Math.random draws are counted only while the Hall record and the speech are made. */
const seeded = Math.random;
let counting = false, hallDraws = 0;
Math.random = () => { if (counting) hallDraws += 1; return seeded(); };

const rule = HALL.retirement;
const careers = [];
let crashes = 0, talkMismatch = 0, talkBeforeAge = 0;
for (let i = 0; i < CAREERS; i += 1) {
  try {
    const pos = E.positions[i % E.positions.length];
    const archs = eng.ARCH[pos];
    const c = eng.start(`Hall ${i}`, pos, archs[i % archs.length], Math.random, null);
    let tq = null, talks = 0, firstTalkAge = null, guard = 0;
    // The retirement block the save would carry, and this loop's own note of the answer that matters.
    let block, answer = null;
    const declined = new Set();
    while (!c.retired && guard++ < 30) {
      if ((c.suspendedSeasons ?? 0) > 0) {
        c.suspendedSeasons -= 1;
        c.seasons.push({ year: c.year, team: c.team, age: c.age, ovr: c.ovr, games: 0, ...(E.banned ?? {}), awards: [], teamResult: 'SUSPENDED', salary: 0 });
      } else {
        tq = eng.roll(tq, Math.random);
        eng.season(c, tq, Math.random);
      }
      eng.progress(c, Math.random);
      const ev = eng.drawEvent(c, Math.random);
      if (ev) ev.options[Math.floor(Math.random() * ev.options.length)].apply(c, Math.random);
      if (eng.stop(c)) c.retired = true;
      const year = c.seasons.at(-1).year;
      if (answer && answer.choice === 'farewell' && year === answer.year + 1 && eng.isFarewellSeason(block, year)) answer.flagged = true;
      // The talk, read after the offseason, exactly where a board would ask it.
      const snap = HALL.snapshot(c);
      const talk = eng.retirementTalk(rule, snap, block);
      // An independent reading of the rule, from the save and this loop's own record of the answers.
      const peak = Math.max(c.ovr, ...c.seasons.map(s => s.ovr));
      const ended = answer !== null && answer.choice !== 'oneMore';
      const expect = !eng.stop(c) && !ended && !declined.has(year) && c.age >= rule.minAge && (peak - c.ovr >= rule.dropFromPeak || c.ovr <= rule.floor);
      if (Boolean(talk) !== expect) talkMismatch += 1;
      if (talk && c.age < rule.minAge) talkBeforeAge += 1;
      if (talk) {
        talks += 1;
        if (firstTalkAge === null) firstTalkAge = c.age;
        // The answer: policy 0 never answers, 1 always plays one more, 2 retires at the first talk, 3 announces a farewell.
        // One answer per full cycle of positions, so every position gets all four (i % 4 tied them to positions).
        const choice = [null, 'oneMore', 'retireNow', 'farewell'][Math.floor(i / E.positions.length) % 4];
        if (choice) {
          block = eng.answerRetirement(block, year, choice);
          if (choice === 'oneMore') declined.add(year);
          if (!answer || answer.choice === 'oneMore') answer = { choice, year, flagged: false };
        }
      }
      if (eng.careerEndsAfter(block, year)) c.retired = true;
    }
    const legacy = eng.LEGACY(c);
    counting = true;
    const rec = eng.hallRecordFor(HALL, c);
    const again = eng.hallRecordFor(HALL, c);
    let speech = null;
    if (rec.outcome === 'inducted') speech = eng.giveHallSpeech(undefined, rec, HALL.key(c), eng.HALL_SPEECHES[i % eng.HALL_SPEECHES.length].id);
    counting = false;
    careers.push({
      score: legacy.score, hof: legacy.hof, rec, same: JSON.stringify(rec) === JSON.stringify(again),
      // Read off the save, not through HALL.lastSeasonYear, which is under test.
      last: c.seasons.at(-1)?.year ?? Number.NaN, seasons: c.seasons.map(s => ({ team: s.team, games: s.games })),
      // Round 1039: the club a deck card retired the number at, and every season line, for section 8.
      numberRetiredBy: c.numberRetiredBy ?? null, allSeasons: c.seasons.map(s => ({ team: s.team })),
      talks, firstTalkAge, speech, finalAge: c.age, seasonsPlayed: c.seasons.length, eraId: c.eraId, answer,
    });
  } catch (err) {
    counting = false;
    crashes += 1;
    if (crashes <= 3) console.error(`career ${i} crashed:`, err && err.message);
  }
}

/* ─── Measure ─────────────────────────────────────────────────────────── */
const { rules, lines } = HALL;
const pct = (n, d) => (d ? Math.round((1000 * n) / d) / 10 : 0);
const share = (list, f) => (list.length ? list.filter(f).length / list.length : 0);
const inducted = careers.filter(c => c.rec.outcome === 'inducted').sort((a, b) => a.score - b.score);
const third = Math.floor(inducted.length / 3);
const fbLow = share(inducted.slice(0, third), c => c.rec.firstBallot);
const fbHigh = share(inducted.slice(inducted.length - third), c => c.rec.firstBallot);
/* Score deciles of the real Hall of Famers, and every cut between two of
   them: the first ballot share of all the deciles above the cut minus all
   those below. Each of the nine cuts must open a gap, so the share rises
   across the whole ladder of deciles, and neither side of a cut is one small
   decile on its own. */
const DECILES = 10;
const decile = k => inducted.slice(Math.floor((k * inducted.length) / DECILES), Math.floor(((k + 1) * inducted.length) / DECILES));
const decileShares = Array.from({ length: DECILES }, (_, k) => share(decile(k), c => c.rec.firstBallot));
const decileCuts = Array.from({ length: DECILES - 1 }, (_, k) => {
  const cut = Math.floor(((k + 1) * inducted.length) / DECILES);
  return share(inducted.slice(cut), c => c.rec.firstBallot) - share(inducted.slice(0, cut), c => c.rec.firstBallot);
});

// The audit table, read from the file the data files cite.
const doc = readFileSync(path.join(ROOT, 'docs/audits/US-HALL-RULES-2026-10.md'), 'utf8');
const tableBlock = doc.split('<!-- hall-table:start -->')[1].split('<!-- hall-table:end -->')[0];
const row = tableBlock.split(String.fromCharCode(10)).find(l => l.startsWith(`| ${SPORT} |`));
const cells = row.split('|').map(s => s.trim()).filter(Boolean);
const num = v => (v === 'none' ? null : Number(v));
const table = { waitSeasons: num(cells[1]), ballotYears: num(cells[2]), threshold: num(cells[3]), stayFloor: num(cells[4]), firstClassOffset: num(cells[5]), verifiedFromClass: num(cells[6]) };
const tableDiffs = Object.keys(table).filter(k => rules[k] !== table[k]);
const offsetMiss = careers.filter(c => c.rec.firstClass !== c.last + table.firstClassOffset).length;

// The ladder: synthetic Hall of Famers walked up the band, step by step.
const SEED = process.env.SIM_SEED || 'base';
const STEPS = 10, PER_STEP = 4000;
const ladder = [];
for (let k = 0; k < STEPS; k += 1) {
  const score = lines.hofLine + ((k + 0.5) / STEPS) * (lines.firstBallotScore - lines.hofLine);
  let fb = 0;
  for (let j = 0; j < PER_STEP; j += 1) {
    if (eng.runHallBallot(rules, lines, { key: `ladder:${SEED}:${k}:${j}`, hof: true, score, lastSeasonYear: 2030 }).firstBallot) fb += 1;
  }
  ladder.push(fb / PER_STEP);
}
const ladderSteps = ladder.slice(1).map((v, k) => v - ladder[k]);
let promiseMiss = 0, promiseN = 0;
for (let j = 0; j < 500; j += 1) {
  promiseN += 1;
  if (!eng.runHallBallot(rules, lines, { key: `top:${SEED}:${j}`, hof: true, score: lines.firstBallotScore + (j % 200), lastSeasonYear: 2030 }).firstBallot) promiseMiss += 1;
}
for (const c of careers) if (c.hof && c.score >= lines.firstBallotScore) { promiseN += 1; if (!c.rec.firstBallot) promiseMiss += 1; }

// Ballot sides.
let sideMiss = 0;
for (const c of careers) {
  const r = c.rec;
  if (rules.ballotYears !== null && r.ballots.length > rules.ballotYears) sideMiss += 1;
  r.ballots.forEach((b, j) => {
    if (b.elected ? b.share < rules.threshold : b.share >= rules.threshold) sideMiss += 1;
    if (b.classYear !== r.firstClass + j) sideMiss += 1;
  });
  const early = r.outcome === 'fellOff' && rules.ballotYears !== null && r.ballots.length < rules.ballotYears;
  if (early && !(rules.stayFloor !== null && r.ballots.at(-1).share < rules.stayFloor)) sideMiss += 1;
}

/* The three answers, held to their button words on these careers. Retire now:
   the season he answered after was his last. One more year: he plays the next
   season. Farewell: exactly one more season, marked as the farewell, then done. */
let answerMiss = 0;
const answered = { retireNow: 0, oneMore: 0, farewell: 0 };
for (const c of careers) {
  const a = c.answer;
  if (!a) continue;
  answered[a.choice] += 1;
  if (a.choice === 'retireNow' && c.last !== a.year) answerMiss += 1;
  if (a.choice === 'oneMore' && !(c.last > a.year)) answerMiss += 1;
  if (a.choice === 'farewell' && (c.last !== a.year + 1 || !a.flagged)) answerMiss += 1;
}

/* The stay floor read on 20000 synthetic candidates from the nomination line
   up, so a share shown at exactly the floor (a raw 4.96 printed 5.0 stays on)
   comes up hundreds of times a run instead of once or twice in the careers. */
let atFloor = 0;
if (rules.stayFloor !== null) {
  for (let j = 0; j < 20000; j += 1) {
    const score = lines.hofLine * (0.5 + 0.3 * ((j % 200) / 200));
    const r = eng.runHallBallot(rules, lines, { key: `floor:${SEED}:${j}`, hof: false, score, lastSeasonYear: 2030 });
    r.ballots.forEach((b, k) => {
      if (b.share === rules.stayFloor) atFloor += 1;
      if (k < r.ballots.length - 1 && b.share < rules.stayFloor) sideMiss += 1;
    });
    const early = r.outcome === 'fellOff' && rules.ballotYears !== null && r.ballots.length < rules.ballotYears;
    if (early && !(r.ballots.at(-1).share < rules.stayFloor)) sideMiss += 1;
  }
}

// The jersey, read independently: most seasons, ties to games, then the first club.
const club = seasons => {
  const t = new Map();
  seasons.forEach((s, i) => { if (!s.team || !(s.games > 0)) return; const e = t.get(s.team) ?? { team: s.team, seasons: 0, games: 0, first: i }; e.seasons += 1; e.games += s.games; t.set(s.team, e); });
  return [...t.values()].sort((a, b) => b.seasons - a.seasons || b.games - a.games || a.first - b.first)[0] ?? null;
};
let jerseyMiss = 0, jerseys = 0, jerseyRaw = 0;
for (const c of careers) {
  const best = club(c.seasons);
  const promised = lines.jerseyScore !== null && c.score >= lines.jerseyScore;
  const due = best && (promised || (c.rec.outcome === 'inducted' && best.seasons >= 5) || (best.seasons >= 12 && c.score >= lines.hofLine * 0.85));
  const want = c.numberRetiredBy
    ? { team: c.numberRetiredBy.team, seasons: c.allSeasons.filter(s => s.team === c.numberRetiredBy.team).length }
    : due ? { team: best.team, seasons: best.seasons } : null;
  const got = c.rec.jersey ? { team: c.rec.jersey.team, seasons: c.rec.jersey.seasons } : null;
  if (JSON.stringify(want) !== JSON.stringify(got)) jerseyMiss += 1;
  // The card names the club with the engine's own label, never a bare abbreviation it knows.
  if (c.rec.jersey && c.rec.jersey.teamName !== eng.LABEL(c.rec.jersey.team, c.eraId)) jerseyMiss += 1;
  // A bare abbreviation on the card. Not "name equals id": a club abroad (an MLB career's
  // seasons in Japan, "Yomiuri Giants") already carries its full name as its id.
  if (c.rec.jersey && /^[A-Z]{2,4}$/.test(c.rec.jersey.teamName ?? c.rec.jersey.team)) jerseyRaw += 1;
  if (c.rec.jersey) jerseys += 1;
}

const iffMiss = careers.filter(c => (c.rec.outcome === 'inducted') !== c.hof || c.rec.score !== c.score).length;

/* The outcome of every career outside the Hall, read from the rule as the
   card prints it. Off the ballot exactly under half the Hall line (the game
   rule nominationShare, 0.5). On the ballot: where the Hall has a ballot limit
   every one falls off, and only the last ballot may sit under the stay floor;
   where it claims no limit nobody falls off, so he is still waiting. */
const NOMINATION = 0.5;
let outcomeMiss = 0, onBallotOut = 0, offBallot = 0, earlyFalls = 0;
for (const c of careers) {
  const r = c.rec;
  if (r.outcome === 'inducted') continue;
  const off = c.score < NOMINATION * lines.hofLine;
  if (off) {
    offBallot += 1;
    if (r.outcome !== 'notOnBallot' || r.ballots.length !== 0) outcomeMiss += 1;
    continue;
  }
  onBallotOut += 1;
  if (r.ballots.length === 0) { outcomeMiss += 1; continue; }
  const want = rules.ballotYears !== null ? 'fellOff' : 'waiting';
  if (r.outcome !== want) outcomeMiss += 1;
  if (rules.stayFloor !== null && r.ballots.slice(0, -1).some(b => b.share < rules.stayFloor)) outcomeMiss += 1;
  if (rules.ballotYears !== null && r.ballots.length < rules.ballotYears) {
    earlyFalls += 1;
    if (!(rules.stayFloor !== null && r.ballots.at(-1).share < rules.stayFloor)) outcomeMiss += 1;
  }
}
const notSame = careers.filter(c => !c.same).length;
const talked = share(careers, c => c.talks > 0);
const outcomes = {};
for (const c of careers) outcomes[c.rec.outcome] = (outcomes[c.rec.outcome] ?? 0) + 1;
const fbAll = share(inducted, c => c.rec.firstBallot);

console.log(`simCareerHall ${SPORT}: ${careers.length} careers, ${crashes} crashed, seed ${SEED}${CONTROL ? `, CONTROL ${CONTROL}` : ''}`);
console.log(`  hof ${pct(inducted.length, careers.length)}% (${inducted.length}), first ballot ${pct(fbAll * 1000, 1000)}% of them; bottom third ${pct(fbLow * 1000, 1000)}%, top third ${pct(fbHigh * 1000, 1000)}%`);
console.log(`  outcomes ${JSON.stringify(outcomes)}; jerseys ${jerseys}; talk reached ${pct(talked * 1000, 1000)}% of careers`);
console.log(`  ladder ${ladder.map(v => v.toFixed(3)).join(' ')}; smallest step ${Math.min(...ladderSteps).toFixed(3)}`);
console.log(`  deciles ${decileShares.map(v => v.toFixed(2)).join(' ')}; cuts ${decileCuts.map(v => v.toFixed(2)).join(' ')}; smallest cut ${Math.min(...decileCuts).toFixed(3)}`);
console.log(`  misses: iff ${iffMiss}, outcome ${outcomeMiss}, table [${tableDiffs.join(',')}], offset ${offsetMiss}, promise ${promiseMiss}/${promiseN}, draws ${hallDraws}, notSame ${notSame}, sides ${sideMiss}, talk ${talkMismatch}+${talkBeforeAge}, jersey ${jerseyMiss}`);
// Printed, not checked: careers under ten seasons with games (MLB's real ballot needs ten, which the model leaves to legacyOf).
const shortCareer = c => c.seasons.filter(s => s.games > 0).length < 10;
if (SPORT === 'mlb') console.log(`  under ten seasons played: ${careers.filter(c => shortCareer(c) && c.rec.outcome === 'inducted').length} inducted, ${careers.filter(c => shortCareer(c) && c.rec.ballots.length > 0 && c.rec.outcome !== 'inducted').length} on the ballot outside the Hall`);
const med = a => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : null; };
console.log(`  talk timing: talks a career, median ${med(careers.map(c => c.talks))}; first talk at ${med(careers.filter(c => c.firstTalkAge !== null).map(c => c.firstTalkAge))}; career ends at ${med(careers.map(c => c.finalAge))}; non finite scores ${careers.filter(c => !Number.isFinite(c.score)).length}`);

/* ─── Sections 9 to 14 (Round 1039): the board's own loop ────────────────
   The sections above run Round 915's loop on the engine. These run the
   board's: the real binding (SPORTB), its summer deal and answers
   (usCareerSummer.ts) and the talk exactly where the board asks it
   (usCareerRetirementFlow.ts). One offseason: the season, its progress, the
   hard stop or a chosen end, the deal (with the talk filter), the talk, then
   every card. Each career runs on its own stream (mulberry32 keyed to the
   seed and the career), so two policies on one career draw the same numbers
   until they really differ, and card answers come off a second stream. */
// The board loop costs about ten engine careers a career (the summer probes every later card), so it runs
// 400 careers a policy by default; SIM_BOARD_CAREERS=2000 is the long measuring run.
const BOARD_N = Number(process.env.SIM_BOARD_CAREERS || Math.min(CAREERS, 400));
const FAREWELL_EFFECT = 'Next season is your last';
const hashStr = s => { let h = 0x811c9dc5 >>> 0; for (let k = 0; k < s.length; k += 1) { h ^= s.charCodeAt(k); h = Math.imul(h, 0x01000193) >>> 0; } return h >>> 0; };
const streamFor = key => {
  let a = hashStr(`${SEED}:${key}`);
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};
const ruleHolds = (c, X = eng) => {
  const SB = X.SPORTB, HALL = X.HALL;
  // Section 9's own reading of the talk rule, never through pendingTalk.
  const r = HALL.retirement;
  if (c.retired || !c.seasons.length || SB.shouldRetire(c)) return false;
  if (c.retirement?.farewellYear !== undefined || c.retirement?.retiredYear !== undefined) return false;
  const peak = Math.max(c.ovr, ...c.seasons.map(s => s.ovr));
  return c.age >= r.minAge && (peak - c.ovr >= r.dropFromPeak || c.ovr <= r.floor);
};
/* Policies. asks: the board's own talk. answer: what the talk gets. filter:
   the deal's filter (the board's, or section 9's own reading). */
const POLICIES = {
  oneMore: { asks: true, answer: () => 'oneMore', filter: (c, X) => X.talkDeckFilter(c, X.SPORTB.hall) },
  retireNow: { asks: true, answer: () => 'retireNow', filter: (c, X) => X.talkDeckFilter(c, X.SPORTB.hall) },
  farewell: { asks: true, answer: () => 'farewell', filter: (c, X) => X.talkDeckFilter(c, X.SPORTB.hall) },
  // Today's engine loop: no talk at all, the deck's retirement cards held out by section 9's own reading.
  noTalk: { asks: false, answer: () => null, filter: (c, X) => e => X.RETIREMENT_CARD_IDS.has(e.id) && ruleHolds(c, X) },
};
let probeCareers = 0;
const deckSeen = new Set(), farewellCards = new Set(), probedTimes = new Map();
// Section 11b: careers caught the moment the board asks the talk, before the answer.
const SEEK_N = 300, seekSnaps = [];
function probeDeck(c, SB = eng.SPORTB) {
  // The deck as the engine builds it now, each answer tried on a copy, on throwaway streams.
  const keep = Math.random;
  Math.random = streamFor(`probe:${c.name}:${c.year}`);
  try {
    for (const e of SB.eventDeck(JSON.parse(JSON.stringify(c)), streamFor(`probe-deck:${c.name}:${c.year}`))) {
      deckSeen.add(e.id);
      // Each card's answers are tried on its first five deals: what an answer writes is the card's, not the career's.
      const n = probedTimes.get(e.id) ?? 0;
      if (n >= 5) continue;
      probedTimes.set(e.id, n + 1);
      e.options.forEach((o, k) => {
        const copy = JSON.parse(JSON.stringify(c));
        try { o.apply(copy, streamFor(`probe-apply:${c.name}:${c.year}:${e.id}:${k}`)); } catch { return; }
        if (copy.retirement?.farewellYear !== undefined && c.retirement?.farewellYear === undefined) farewellCards.add(e.id);
        if (o.effect === FAREWELL_EFFECT) farewellCards.add(e.id);
      });
    }
  } finally { Math.random = keep; }
}
function boardCareer(i, policyName, eraId, X = eng) {
  const policy = POLICIES[policyName];
  const SB = X.SPORTB;
  const keep = Math.random;
  Math.random = streamFor(`board:${eraId ?? 'default'}:${i}`);
  const pick = streamFor(`pick:${eraId ?? 'default'}:${i}`);
  const log = { offseasons: [], talks: [], deckFarewells: [], farewellSeasons: [], waitJersey: 0, waitWrote: 0, walkAway: null, endedBy: null, midTalks: 0 };
  try {
    const pos = E.positions[i % E.positions.length];
    const archs = X.ARCH[pos];
    const c = SB.startCareer(`Board ${i}`, pos, archs[i % archs.length], Math.random, null, eraId);
    let tq = null, banned = false;
    // The talk exactly where the board asks it: on the hub or before the next card. True when it ended the career.
    const askTalk = (year, at, o) => {
      if (o.talkAt !== null) return false;
      if (!policy.asks) { if (ruleHolds(c, X)) o.talkAt = at; return false; }
      if (!X.pendingTalk(c, SB.hall)) return false;
      if (policyName === 'oneMore' && X === eng && seekSnaps.length < SEEK_N) seekSnaps.push(JSON.parse(JSON.stringify(c)));
      o.talkAt = at;
      log.talks.push(year);
      if (at > 0) log.midTalks += 1;
      const choice = policy.answer();
      X.answerTalk(c, choice);
      if (choice !== 'retireNow') return false;
      c.retired = true; delete c.summer; log.endedBy = 'talk';
      return true;
    };
    for (let guard = 0; guard < 32 && !c.retired; guard += 1) {
      // The board rolls the next season's team quality when an offseason ends, never after a banned year.
      if (!banned) tq = SB.rollTeamQuality(tq, Math.random);
      banned = (c.suspendedSeasons ?? 0) > 0;
      if (banned) {
        c.suspendedSeasons -= 1;
        c.seasons.push(SB.suspendedLine(c));
        SB.progress(c, Math.random);
        /* The board's banned year: a chosen end still ends it, but there is no
           hard stop and no summer; the talk, if the rule holds, is asked on the hub. */
        const year = c.seasons.at(-1).year;
        if (X.isFarewellSeason(c.retirement, year)) log.farewellSeasons.push(year);
        if (X.endsAfterSeason(c, year)) { c.retired = true; log.endedBy = 'choice'; break; }
        const o = { year, talkAt: null, shown: [], banned: true };
        if (askTalk(year, 0, o)) break;
        log.offseasons.push(o);
        continue;
      }
      SB.campBattle(c, tq, Math.random);
      SB.simSeason(c, tq, Math.random);
      SB.progress(c, Math.random);
      const year = c.seasons.at(-1).year;
      if (X.isFarewellSeason(c.retirement, year)) log.farewellSeasons.push(year);
      if (SB.shouldRetire(c)) { c.retired = true; log.endedBy = 'stop'; break; }
      if (X.endsAfterSeason(c, year)) { c.retired = true; log.endedBy = 'choice'; break; }
      if (probeCareers < 150 && i < 150 && policyName === 'oneMore') probeDeck(c, SB);
      const filter = policy.filter(c, X);
      let ev = X.startSummer(c, SB, Math.random, filter);
      /* An offseason has the talk from the card it was asked before (talkAt):
         right after the deal, or, when a card's answer moved the rating into
         the rule, before the next card or on the hub when the summer is over.
         For the no talk loop, from where the rule first held. */
      const o = { year, talkAt: null, shown: [] };
      if (askTalk(year, 0, o)) break;
      let ended = false;
      while (ev) {
        o.shown.push(ev.id);
        const k = Math.floor(pick() * ev.options.length);
        if (ev.options[k].effect === FAREWELL_EFFECT && c.retirement?.farewellYear === undefined) log.deckFarewells.push(year);
        const waits = /wait until you are done/i.test(ev.options[k].label) && c.numberRetiredBy === undefined;
        if (ev.id === 'nhlB_walkAwayHealthy' && k === 0 && !log.walkAway) log.walkAway = { year };
        ev = X.answerSummerCard(c, SB, ev, k, Math.random, filter).next;
        if (waits) { log.waitJersey += 1; if (c.numberRetiredBy !== undefined) log.waitWrote += 1; }
        if (askTalk(year, o.shown.length, o)) { ended = true; break; }
      }
      if (ended) break;
      log.offseasons.push(o);
    }
    if (policyName === 'oneMore' && i < 150) probeCareers += 1;
    return { c, log };
  } finally {
    Math.random = keep;
  }
}


const strip = c => { const o = JSON.parse(JSON.stringify(c)); delete o.retirement; return JSON.stringify(o); };
const runs = { oneMore: [], retireNow: [], farewell: [], noTalk: [] };
let boardCrashes = 0;
for (let i = 0; i < BOARD_N; i += 1) {
  for (const p of Object.keys(runs)) {
    try { runs[p].push(boardCareer(i, p)); } catch (err) {
      boardCrashes += 1;
      if (boardCrashes <= 3) console.error(`board career ${i} (${p}) crashed:`, err && err.message);
    }
  }
}

/* 9. identity: one more year every time is today's loop, byte for byte, but
   for the answers block itself. */
let identityMiss = 0, identityTalks = 0;
for (let i = 0; i < Math.min(runs.oneMore.length, runs.noTalk.length); i += 1) {
  if (strip(runs.oneMore[i].c) !== strip(runs.noTalk[i].c)) identityMiss += 1;
  identityTalks += runs.oneMore[i].log.talks.length;
}

/* 10. ends: retire now ends on the talk's season; a farewell, at the talk or
   on a deck card, ends exactly one season later and that season is marked. */
let endsMiss = 0, endsRetire = 0, endsFarewell = 0, endsDeck = 0;
const lastOf = c => c.seasons.at(-1).year;
for (const { c, log } of runs.retireNow) {
  if (!log.talks.length) continue;
  endsRetire += 1;
  if (lastOf(c) !== log.talks[0] || log.endedBy !== 'talk') endsMiss += 1;
}
for (const { c, log } of runs.farewell) {
  if (!log.talks.length) continue;
  endsFarewell += 1;
  const want = log.talks[0] + 1;
  if (lastOf(c) !== want || !log.farewellSeasons.includes(want)) endsMiss += 1;
}
for (const p of Object.keys(runs)) {
  for (const { c, log } of runs[p]) {
    if (!log.deckFarewells.length) continue;
    // The talk's own farewell or retirement can come first only on the talk policies, and only before the card.
    if ((p === 'retireNow' || p === 'farewell') && log.talks.length && log.talks[0] < log.deckFarewells[0]) continue;
    endsDeck += 1;
    const want = log.deckFarewells[0] + 1;
    if (lastOf(c) !== want || !log.farewellSeasons.includes(want)) endsMiss += 1;
  }
}

/* 11. once: no offseason with the talk is offered a deck retirement card,
   and the board's list of those cards is every card whose answer announces
   a farewell, as the engine's own deck builders hand them out. */
let onceMiss = 0, talkOffseasons = 0, eligibleClashes = 0, midTalkOffseasons = 0, bannedTalkOffseasons = 0;
for (const p of ['oneMore', 'farewell', 'noTalk']) {
  for (const { log } of runs[p]) {
    for (const o of log.offseasons) {
      if (o.talkAt === null) continue;
      talkOffseasons += 1;
      if (o.talkAt > 0) midTalkOffseasons += 1;
      if (o.banned) bannedTalkOffseasons += 1;
      // Only the cards from the talk on: a card the talk came after was shown before it existed.
      if (o.shown.slice(o.talkAt).some(id => eng.RETIREMENT_CARD_IDS.has(id))) onceMiss += 1;
    }
  }
}
const listedHere = [...eng.RETIREMENT_CARD_IDS].filter(id => deckSeen.has(id));
const unlisted = [...farewellCards].filter(id => !eng.RETIREMENT_CARD_IDS.has(id));

/* 11b. seek (closing check fix, 2026-10-07). The loop above never meets a
   deck retirement card after the deal (they lift morale, so the later slots
   never take one), so it cannot see the seek time hold-out in
   seekSummerCard. This checks it on careers caught the moment the board asks
   the talk: a summer forged to stand on each deck retirement card the deck
   really holds then, at card 1 (a save restored on a card dealt before the
   talk) and at a later card (one the talk came in front of), with the talk
   pending and again after 'One more year'. The board's seek must never land
   on one. With no hold-out the same seek must land on it (met), so the check
   cannot pass on nothing. Control seekexclude. */
let seekMiss = 0, seekMet = 0, seekTried = 0;
const seekMetAt = [0, 0];
{
  const SB = eng.SPORTB;
  const keep = Math.random;
  try {
    seekSnaps.forEach((snap, j) => {
      for (const declined of [false, true]) {
        const base = JSON.parse(JSON.stringify(snap));
        if (declined) eng.answerTalk(base, 'oneMore');
        const year = base.summer?.year ?? eng.summerSeason(base);
        for (const id of eng.RETIREMENT_CARD_IDS) {
          for (const at of [0, 1]) {
            Math.random = streamFor(`seek:${j}:${id}:${at}:${declined}`);
            const forge = () => { const f = JSON.parse(JSON.stringify(base)); f.summer = { year, ids: [id, id], at }; return f; };
            // Only a card the deck really holds for this career now.
            if (!eng.summerCardAt(forge(), SB, at)) continue;
            seekTried += 1;
            const open = eng.seekSummerCard(forge(), SB, null);
            if (open && open.id === id) { seekMet += 1; seekMetAt[at] += 1; }
            const c = forge();
            const got = eng.seekSummerCard(c, SB, eng.talkDeckFilter(c, SB.hall));
            if (got && eng.RETIREMENT_CARD_IDS.has(got.id)) seekMiss += 1;
          }
        }
      }
    });
  } finally { Math.random = keep; }
}


/* 12. jersey: a club that retired the number on a deck card is the club the
   card names, even where another club has more seasons; a wait answer
   records nothing, so jerseyFor still decides (section 8 reads those). */
let jerseyRecMiss = 0, jerseyRecN = 0, jerseyRecElsewhere = 0, jerseySynMiss = 0, jerseySynN = 0, waitAnswers = 0, waitWrote = 0;
for (const p of Object.keys(runs)) {
  for (const { c, log } of runs[p]) {
    waitAnswers += log.waitJersey;
    waitWrote += log.waitWrote;
    if (!c.numberRetiredBy) continue;
    jerseyRecN += 1;
    const most = club(c.seasons);
    if (most && most.team !== c.numberRetiredBy.team) jerseyRecElsewhere += 1;
    const rec = eng.hallRecordFor(HALL, c);
    if (!rec.jersey || rec.jersey.team !== c.numberRetiredBy.team || rec.jersey.teamName !== eng.LABEL(c.numberRetiredBy.team, c.eraId)) jerseyRecMiss += 1;
  }
}
// Synthetic, every sport: the first club recorded, then twelve seasons somewhere else.
for (const { c } of runs.noTalk.slice(0, 300)) {
  if (!c.seasons.length) continue;
  const copy = JSON.parse(JSON.stringify(c));
  copy.numberRetiredBy = { team: copy.seasons[0].team, year: copy.seasons[0].year };
  for (let k = 0; k < 12; k += 1) copy.seasons.push({ ...copy.seasons.at(-1), team: 'ZZZ', year: copy.seasons.at(-1).year + 1, games: 80 });
  jerseySynN += 1;
  const rec = eng.hallRecordFor(HALL, copy);
  if (!rec.jersey || rec.jersey.team !== copy.seasons[0].team) jerseySynMiss += 1;
}

/* 13. era class: a class year (and the rule lines) only where the audit
   anchors the first class, read off the card the board renders. */
const auditFrom = table.verifiedFromClass;
const ERA_N = Number(process.env.SIM_ERA_CAREERS || 100);
const YEAR_RE = /\b(19|20)\d\d\b/;
let eraMiss = 0;
const eraCounts = {};
const cardText = rec => eng.renderToStaticMarkup(eng.createElement(eng.HallOfFameCard, { record: rec, rules, onSpeech() {}, onDismiss() {} })).replace(/<[^>]+>/g, ' ');
const eraCheck = (rec, last, tag) => {
  const first = last + table.firstClassOffset;
  const text = cardText(rec);
  const side = first >= auditFrom ? 'above' : 'below';
  eraCounts[tag] ??= { below: 0, above: 0 };
  eraCounts[tag][side] += 1;
  if (side === 'above') {
    if (!text.includes(`Eligible from the Class of ${first}.`)) eraMiss += 1;
    rec.ballots.forEach((b, k) => { if (!text.includes(`${first + k}: `)) eraMiss += 1; });
  } else if (YEAR_RE.test(text) || hallRuleCount(text)) {
    eraMiss += 1;
  }
};
const hallRuleCount = text => eng.hallRuleLines(rules).filter(l => text.includes(l)).length;
for (const era of eng.ERAS) {
  for (let i = 0; i < ERA_N; i += 1) {
    const { c } = boardCareer(100000 + i, 'oneMore', era.id);
    eraCheck(eng.hallRecordFor(HALL, c), lastOf(c), era.id);
  }
}
// The boundary, both sides of it, on synthetic ballots.
for (const last of [auditFrom - table.firstClassOffset - 1, auditFrom - table.firstClassOffset]) {
  for (let j = 0; j < 50; j += 1) {
    for (const hof of [true, false]) {
      const rec = { ...eng.runHallBallot(rules, lines, { key: `era:${SEED}:${last}:${j}:${hof}`, hof, score: hof ? lines.hofLine + 3 * j : lines.hofLine * 0.7, lastSeasonYear: last }), jersey: null };
      eraCheck(rec, last, 'boundary');
    }
  }
}


/* 14. NHL balance (nhl only): the walk away card used to cap the rating at
   63 for the farewell year; now it writes the farewell and the year is played
   at the rating he has. The same careers on the same streams, built once with
   the old answer, measured against today's: the farewell season's own line
   and the legacy and Hall shift. Reported; the bands are from seeds. */
let balance = null;
if (SPORT === 'nhl') {
  const OLD_FROM = 'apply: (cc) => { announceFarewell(cc); cc.health = 100;';
  const OLD_TO = 'apply: (cc) => { cc.ovr = Math.min(cc.ovr, 63); cc.health = 100;';
  const oldPlugin = {
    name: 'old-walk-away',
    setup(b) {
      b.onLoad({ filter: /nhlCareerLifeB\.ts$/ }, args => {
        const src = readFileSync(args.path, 'utf8');
        if (!src.includes(OLD_FROM)) throw new Error('section 14: the walk away answer is not where it was, refusing to measure');
        return { contents: src.replace(OLD_FROM, OLD_TO), loader: 'ts' };
      });
    },
  };
  const OUT_OLD = path.join(os.tmpdir(), `career-hall-nhl-old-${process.pid}.mjs`);
  await build({
    stdin: { contents: entry, resolveDir: ROOT, loader: 'ts' },
    bundle: true, format: 'esm', platform: 'node', outfile: OUT_OLD, absWorkingDir: ROOT,
    logLevel: 'error', alias: { '@': './src' }, plugins: [oldPlugin], jsx: 'automatic', banner: { js: "import { createRequire as __hallRequire } from 'node:module'; const require = __hallRequire(import.meta.url);" },
  });
  const old = await import(pathToFileURL(OUT_OLD).href);
  try { unlinkSync(OUT_OLD); } catch { /* the temp file is only a copy */ }
  const nowRuns = [], oldRuns = [];
  // Its own count: the walk away answer comes in about one NHL career in thirteen.
  const N14 = Number(process.env.SIM_BALANCE_CAREERS || 800);
  for (let i = 0; i < N14; i += 1) {
    nowRuns.push(boardCareer(200000 + i, 'oneMore', undefined, eng));
    oldRuns.push(boardCareer(200000 + i, 'oneMore', undefined, old));
  }
  /* The farewell season itself is compared only where both builds took the
     walk away answer in the same offseason. They can part earlier: Round
     1038's deal sorts card 1's stand in by whether it moves the rating, and
     the old answer did (the cap), so the old build deals some summers
     differently. The legacy and Hall lines below are over every career. */
  const cases = [];
  let walkNow = 0;
  nowRuns.forEach((r, i) => {
    if (!r.log.walkAway) return;
    walkNow += 1;
    if (oldRuns[i].log.walkAway?.year !== r.log.walkAway.year) return;
    const y = r.log.walkAway.year + 1;
    const a = r.c.seasons.find(s => s.year === y), b = oldRuns[i].c.seasons.find(s => s.year === y);
    if (a && b) cases.push({ now: a, old: b, nowC: r.c, oldC: oldRuns[i].c });
  });
  const mean = xs => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0);
  const median = xs => { const s = [...xs].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : 0; };
  const legacyOf = (X, c) => X.LEGACY(c);
  balance = {
    cases: cases.length, walkNow,
    ptsNow: mean(cases.map(k => k.now.points ?? k.now.wins ?? 0)), ptsOld: mean(cases.map(k => k.old.points ?? k.old.wins ?? 0)),
    ovrNow: mean(cases.map(k => k.now.ovr)), ovrOld: mean(cases.map(k => k.old.ovr)),
    gamesNow: mean(cases.map(k => k.now.games)), gamesOld: mean(cases.map(k => k.old.games)),
    lineNow: cases[0] ? eng.SPORTB.statLine(cases[0].now, cases[0].nowC.pos) : '', lineOld: cases[0] ? old.SPORTB.statLine(cases[0].old, cases[0].oldC.pos) : '',
    caseLegacyNow: median(cases.map(k => legacyOf(eng, k.nowC).score)), caseLegacyOld: median(cases.map(k => legacyOf(old, k.oldC).score)),
    legacyNow: median(nowRuns.map(r => legacyOf(eng, r.c).score)), legacyOld: median(oldRuns.map(r => legacyOf(old, r.c).score)),
    hallNow: share(nowRuns, r => legacyOf(eng, r.c).hof), hallOld: share(oldRuns, r => legacyOf(old, r.c).hof),
  };
  console.log(`  14 balance: ${balance.walkNow} walk away farewells, ${balance.cases} taken the same offseason in both builds; that farewell season: OVR ${balance.ovrOld.toFixed(1)} -> ${balance.ovrNow.toFixed(1)}, games ${balance.gamesOld.toFixed(1)} -> ${balance.gamesNow.toFixed(1)}, points (wins for a goalie) ${balance.ptsOld.toFixed(1)} -> ${balance.ptsNow.toFixed(1)}`);
  console.log(`     first case's farewell line: old "${balance.lineOld}" now "${balance.lineNow}"`);
  console.log(`     median legacy of those careers ${balance.caseLegacyOld} -> ${balance.caseLegacyNow}; all careers median ${balance.legacyOld} -> ${balance.legacyNow}; Hall share ${(100 * balance.hallOld).toFixed(1)} -> ${(100 * balance.hallNow).toFixed(1)} percent`);
}

const sportIds = [...eng.RETIREMENT_CARD_IDS].filter(id => id.startsWith({ nfl: 'lifeB_', nba: 'nbaB_', mlb: 'mlbB_', nhl: 'nhlB_' }[SPORT]));
const deadIds = sportIds.filter(id => !deckSeen.has(id));
const eraBoundary = eraCounts.boundary ?? { below: 0, above: 0 };
console.log(`  board loop: ${BOARD_N} careers a policy, ${boardCrashes} crashed; talks answered one more year ${identityTalks}; identity misses ${identityMiss}`);
console.log(`  ends: retire now ${endsRetire}, talk farewells ${endsFarewell}, deck farewells ${endsDeck}, misses ${endsMiss}`);
console.log(`  once: ${talkOffseasons} offseasons with the talk (${midTalkOffseasons} asked mid-summer, ${bannedTalkOffseasons} after a banned year), ${onceMiss} offered a retirement card; listed ids seen ${listedHere.length}, unseen [${deadIds.join(',')}], farewell cards not listed [${unlisted.join(',')}] (decks probed on ${probeCareers} careers)`);
console.log(`  seek: ${seekSnaps.length} careers caught at the talk, ${seekTried} forged summers on a deck retirement card, ${seekMet} landed on it with no hold-out (at card 1 ${seekMetAt[0]}, at a later card ${seekMetAt[1]}), ${seekMiss} with the board's`);
console.log(`  jersey (deck): ${jerseyRecN} recorded, ${jerseyRecElsewhere} at a club other than the one with most seasons, ${jerseyRecMiss} misnamed; synthetic ${jerseySynN}, ${jerseySynMiss} missed; wait answers ${waitAnswers}, ${waitWrote} wrote a club`);
console.log(`  era: verified from the Class of ${auditFrom}; ${JSON.stringify(eraCounts)}; misses ${eraMiss}`);

/* ─── Check ───────────────────────────────────────────────────────────── */
const BAND = { minInducted: 0.05, decileCut: 0.06, ladderStep: 0.015, talkReach: 0.70, earlyFall: 0.10, atFloor: 100, balanceCases: 5, farewellOvrGain: 10, seekMet: 1, hallShift: 0.025, legacyShift: 15 };
const smallestCut = Math.min(...decileCuts);
const fellEarlyEnough = rules.stayFloor === null || earlyFalls >= BAND.earlyFall * onBallotOut;
const checks = [
  ['crashes', crashes === 0 && careers.length === CAREERS, `${crashes} crashed of ${CAREERS}`],
  ['iff', iffMiss === 0 && inducted.length >= BAND.minInducted * careers.length, `${iffMiss} disagree with the engine's own legacyOf, ${inducted.length} inducted`],
  ['outcome', outcomeMiss === 0 && offBallot > 0 && onBallotOut > 0 && fellEarlyEnough, `${outcomeMiss} careers outside the Hall with the wrong outcome; ${offBallot} off the ballot, ${onBallotOut} on it, ${earlyFalls} early fall offs${rules.stayFloor === null ? '' : ` (needs ${100 * BAND.earlyFall} percent of those on it)`}`],
  ['table', tableDiffs.length === 0 && offsetMiss === 0, `rules off the audit table: [${tableDiffs.join(',')}], ${offsetMiss} careers on the wrong first class`],
  ['rises', smallestCut >= BAND.decileCut && Math.min(...ladderSteps) > BAND.ladderStep, `smallest of the nine decile cuts ${smallestCut.toFixed(3)} (needs ${BAND.decileCut}), smallest ladder step ${Math.min(...ladderSteps).toFixed(3)} (needs over ${BAND.ladderStep})`],
  ['promise', promiseMiss === 0 && promiseN >= 500, `${promiseMiss} of ${promiseN} promised first ballots missed`],
  ['keyed', hallDraws === 0 && notSame === 0, `${hallDraws} Math.random draws, ${notSame} records that changed on a second run`],
  ['sides', sideMiss === 0 && (rules.stayFloor === null || atFloor >= BAND.atFloor), `${sideMiss} ballots on the wrong side of a rule${rules.stayFloor === null ? '' : `, ${atFloor} synthetic ballots shown at exactly the floor`}`],
  ['talk', talkMismatch === 0 && talkBeforeAge === 0 && talked >= BAND.talkReach, `${talkMismatch} talks off the rule, ${talkBeforeAge} before the age, reached ${(100 * talked).toFixed(1)} percent (needs ${100 * BAND.talkReach})`],
  ['answers', answerMiss === 0 && Object.values(answered).every(n => n > 0), `${answerMiss} answers that did not do what the button says; answered ${JSON.stringify(answered)}`],
  ['jersey', jerseyMiss === 0 && jerseyRaw === 0 && jerseys > 0, `${jerseyMiss} jerseys off the rule or misnamed, ${jerseyRaw} named by a bare club id, ${jerseys} retired`],
  ['identity', boardCrashes === 0 && identityMiss === 0 && identityTalks > 0, `${identityMiss} careers answering one more year that differ from the loop with no talk (${identityTalks} talks answered), ${boardCrashes} board careers crashed`],
  ['ends', endsMiss === 0 && endsRetire > 0 && endsFarewell > 0 && endsDeck > 0, `${endsMiss} chosen ends off by a season or unmarked (retire now ${endsRetire}, talk farewells ${endsFarewell}, deck farewells ${endsDeck})`],
  ['once', onceMiss === 0 && talkOffseasons > 0 && unlisted.length === 0 && deadIds.length === 0 && sportIds.length > 0, `${onceMiss} of ${talkOffseasons} talk offseasons offered a retirement card; not listed [${unlisted.join(',')}], listed but never dealt [${deadIds.join(',')}]`],
  ['seek', seekMiss === 0 && seekMet >= BAND.seekMet, `${seekMiss} of ${seekTried} forged summers where the board's seek landed on a deck retirement card; ${seekMet} landed on one with no hold-out (needs ${BAND.seekMet})`],
  ['deckJersey', jerseyRecMiss === 0 && jerseySynMiss === 0 && waitWrote === 0 && jerseySynN > 0 && (SPORT === 'nhl' || jerseyRecN > 0), `${jerseyRecMiss} of ${jerseyRecN} deck retired numbers not on the card, ${jerseySynMiss} of ${jerseySynN} synthetic, ${waitWrote} wait answers that wrote a club`],
  ['era', eraMiss === 0 && eraBoundary.below > 0 && eraBoundary.above > 0, `${eraMiss} cards printing a class year or rule off the audit's verified class (${auditFrom}); ${JSON.stringify(eraCounts)}`],
  ...(balance ? [['balance', balance.cases >= BAND.balanceCases && balance.ovrNow - balance.ovrOld >= BAND.farewellOvrGain && Math.abs(balance.hallNow - balance.hallOld) <= BAND.hallShift && Math.abs(balance.legacyNow - balance.legacyOld) <= BAND.legacyShift, `${balance.cases} walk away farewells (needs ${BAND.balanceCases}); farewell OVR gain ${(balance.ovrNow - balance.ovrOld).toFixed(1)} (needs ${BAND.farewellOvrGain}); Hall share shift ${(100 * (balance.hallNow - balance.hallOld)).toFixed(2)} points (band ${100 * BAND.hallShift}); median legacy shift ${balance.legacyNow - balance.legacyOld} (band ${BAND.legacyShift})`]] : []),
];
for (const [name, ok, detail] of checks) console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${name}: ${detail}`);
const red = checks.filter(c => !c[1]).map(c => c[0]);
if (CONTROL) {
  const WANT = { everyonein: 'iff', bindhof: 'iff', outcomeswap: 'outcome', nominationgone: 'outcome', oldcurve: 'outcome', waitoff: 'table', shownraw: 'sides', flatfirst: 'rises', nopromise: 'promise', mathrandom: 'keyed', sharesides: 'sides', notalk: 'talk', farewelloff: 'answers', retireoff: 'answers', jerseyfirst: 'jersey', jerseyraw: 'jersey', talkdraws: 'identity', deckfarewelloff: 'ends', twice: 'once', seekexclude: 'seek', jerseyignore: 'deckJersey', eraunguarded: 'era' }[CONTROL];
  console.log(`simCareerHall ${SPORT} CONTROL ${CONTROL}: wanted ${WANT} red, red [${red.join(',')}], ${red.includes(WANT) ? 'FIRED' : 'DID NOT FIRE'}`);
  // Exit 1 only when the check this control targets went red, so the exit
  // code alone proves the control hit its own check. Any other red is printed.
  process.exit(red.includes(WANT) ? 1 : 0);
}
console.log(`simCareerHall ${SPORT}: ${red.length ? `RED [${red.join(',')}]` : `all ${checks.length} checks green`}`);
process.exit(red.length ? 1 : 0);
