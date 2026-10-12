/* Round 1224 harness: Game Day and a bracket you play, the shared libraries
 * for the front offices, before any board mounts them.
 *
 * The libraries: src/lib/gmGameScore.ts (a score for a game an engine has
 * decided: the quick path, and the one save field of Game Day),
 * src/lib/gmGameDay.ts (the story of that final: the told path),
 * src/lib/gmBracket.ts (a postseason as a saved state machine over
 * src/lib/finalsBracket.ts), with the NFL's law and data
 * (src/lib/gameLaws/nflScore.ts, nfl.ts and nflGameDay.ts,
 * src/data/gmBrackets/nfl.ts and the words of its "?" in nflHelp.ts).
 *
 * THE FLEET (scripts/lib/gmGameDayFleet.mjs): seed sets 0 to 4, each 40
 * seasons on each of the two leagues the engine makes (fifteen man, and full
 * rosters), played by the UNTOUCHED engine the way the board plays a week,
 * with the seeded generator installed AS Math.random. 80 seasons a set are
 * 21,760 season games and 1,040 playoff games.
 *
 * Sections (each number is a count over one seed set unless it says so):
 *  1 ONE LAW, TWO PATHS. For every game of the fleet, with the chance from the
 *    engine's own winProb: the quick path's final never names another winner
 *    and is never level, and the told path tells exactly that final. Printed,
 *    not asserted: the tries by decile of the chance. The swapped share (no
 *    try in 24 gave the engine's winner) sits under a band (see MEASURED).
 *  2 EVERY STORY ADDS UP, by a checker written here that calls neither the
 *    library's sums nor the law: finals, quarters, what each play is worth by
 *    the two sourced ledger (6, 7 or 8, 3, 2), whole minutes from 1 to 60 that
 *    no two lines share, and the deciding plays and the shape by the rule.
 *  3 THE TOLD SCORES ARE THE LAW'S SCORES: against a baseline drawn in the
 *    same run (the same law, free, at the same chance), four statistics sit
 *    inside two sided bands (see MEASURED).
 *  4 THE BRACKET IS THE ENGINE'S POSTSEASON. Played by the machine with the
 *    engine's own game function and one generator, all at once and a round a
 *    press with the save through JSON between presses, it gives the engine's
 *    thirteen games, champion, next 64 draws and records, for every season;
 *    the engine's own run is held to scripts/data/gmBracketFixture.json; the
 *    data's structure; a doctored winner, a doctored pairing and a tie
 *    played out of turn are each named by bracketProblems; and the mover and
 *    the validator agree: asked for any tie in any order, a game at a time,
 *    the mover never makes a save the validator finds a problem in.
 *  5 PURE. Telling every game of a season right after the engine plays it
 *    leaves the engine's stream, its draw count, its 272 winners and its 32
 *    records exactly where they were; the same key tells the same final and
 *    story twice and through JSON; and the round's new files hold no
 *    Math.random, no Date and no localStorage (comments stripped). And THE
 *    CEILING: a score above 999 is read by neither save guard and told by
 *    nobody, without the story law being asked (with no ceiling a saved
 *    250000 threw out of the NFL's law and a saved 1e21 never came back),
 *    and the NFL tells no final above its own top score.
 *  6 THE MOUNT LIST (rewritten in Round 1305, when the first board came to
 *    import a module). Every file under src that imports one of the modules
 *    is on a list in this file, with the modules it may reach: the modules
 *    and their tests, and the NFL board for the bind and the log and nothing
 *    else. And no board imports the told path, a story law, a game day law
 *    or the words of a "?" STATICALLY (read from the syntax tree): what only
 *    a drawn card reads must not sit in a board's own chunk.
 *    Round 1307, the tile: the view lib (src/lib/gmGameDayView.ts), the shared
 *    card and the NFL's bound card join the modules. They are what a drawn
 *    card reads, so no board may import one statically, and the NFL board
 *    reaches the bound card through a lazy import and nothing else of them.
 *    Round 1308, the postseason's libraries: src/lib/gmPostseason.ts (the
 *    press and load half, sport free) and src/lib/frontOfficePostseason.ts
 *    (the NFL's bind) join the modules with their tests. Nothing else
 *    imports them yet: Round 1309 puts them on the board. And the bracket
 *    card: src/lib/gmBracketView.ts (every word it prints), the shared
 *    card and the NFL's bound card join the modules AND the story files:
 *    only a drawn card reads them, so no board may import one statically
 *    (Round 1309 reaches the bound card through a lazy part).
 *
 * ROUND 1305, THE PRESS (src/lib/frontOfficeGameDay.ts, the NFL board's bind
 * to the quick path, and src/lib/gmGameLog.ts, the save field of the
 * season's results). Each season of the fleet is played a third time the way
 * the BOARD tells it: `nflTell` on every game right after the engine has
 * played it, and on the thirteen playoff games after the one press
 * postseason has come back, inside the seeded Math.random.
 *  7 THE PRESS PATH DOES NOT MOVE. With the bind telling, the generator's
 *    state and draw count after Week 17, the 272 winners, the 32 records and
 *    the postseason's row (thirteen games, champion, next 64 draws, records
 *    after) are the untold season's, which section 4 holds to the recorded
 *    fixture. AND THE SCORES DO DIFFER: the share of games whose told score
 *    is not the engine's own sits above a floor (see MEASURED), so a run
 *    with the law switched off cannot read green.
 *  8 THE BIND'S SCORES ARE THE LAW'S. Every game: the bind never refuses,
 *    and it tells exactly the quick path's final for the chance the engine
 *    played the game at (read by the fleet BEFORE the game), under the key
 *    the board's recipe gives. The four statistics of section 3 for the
 *    bind's scores sit inside section 3's bands against the same baseline.
 *  9 THE LOG IS THE SEASON. For four GM clubs a season (the best and the
 *    worst record and two keyed picks): after every week the log's record
 *    is the club's by this harness's own count of the engine's winners, and
 *    after Week 17 the league's; one entry a week in week order; the one
 *    press finish adds exactly his playoff games; through JSON and the
 *    reader it is the same log; it reads as absent for another season,
 *    another club and a club that is no club; with any one field of the
 *    first, a middle or the last entry damaged or missing it reads as
 *    absent and nothing throws; and a log begun at week k (a save from
 *    before the round) holds one entry a week from k on, and its record is
 *    NOT the league's, which the run prints.
 * 10 EVERY GAME OF THE LOG TELLS (Round 1307, when the tile and the clock
 *    came to read the log). Section 9's logs, read back through JSON and
 *    the reader, playoff games and all: every entry gives a story from the
 *    home side and from the away side, and each is added up by section 2's
 *    own checker, which calls neither the story's own sums nor the law.
 *    Control: offbyone, which must turn this red beside section 2.
 *
 * ROUND 1308, THE POSTSEASON A ROUND AT A TIME (src/lib/gmPostseason.ts, the
 * press and load half every board shares, and src/lib/frontOfficePostseason.ts,
 * the NFL's bind: nflPlayTie and its sink, nflRoundsOf). Each season of the
 * fleet from the end of Week 17, the generator installed AS Math.random.
 * 11 THE BRACKET PATH IS THE ONE PRESS PATH. Four presses of playBracketWeek
 *    (the save through JSON between them) and playBracketAll, each with
 *    nflPlayTie, give the recorded fixture's thirteen games (round, home,
 *    away, winner, in order), champion, next 64 draws and the engine's draw
 *    count; the 32 records after are the regular season's; every told score
 *    is nflTell's on the fixture's own engine game under the same key; and
 *    nflRoundsOf is runPlayoffs' rounds told the one press way, as JSON text.
 *    WITH THE GM DESK ON (added after the review of 2026-10-12, which found
 *    that a playoff game played without the desk's edges left every check
 *    green): every new franchise opens with the desk, so for each of section
 *    9's four GM clubs a season his club is given the desk's strongest edge
 *    (DESK_EDGE, +3) and the same postseason is played the one press way
 *    (runPlayoffs and nflTell with the edges, as the board does) and the
 *    bracket way (nflPlayTie with the edges): the same games, champion, next
 *    draws, draw count, records and told rounds. A count printed beside it,
 *    and held above zero, says in how many club seasons the edge moved the
 *    postseason at all, so the desk on checks cannot hold nothing.
 * 12 THE LOAD (the library half; the validator's is Round 1309's). The first
 *    season of each league kind a set, at five stops (opened, then after
 *    each week): a sound block through JSON comes back as it is; outside the
 *    postseason the load is null whatever the block; a doctored winner, a
 *    doctored pairing and a tie out of turn are rebuilt from the block's own
 *    seeds, and seeds that mix the conferences, another season and an
 *    unknown version from fresh ones, each with the feed line, and every
 *    rebuilt bracket plays to a champion.
 * 13 THE LOG THROUGH A POSTSEASON, through the sink. The whole sink deep
 *    equals the one press path's thirteen log entries, keys included; for
 *    section 9's four GM clubs a season the log built a press at a time deep
 *    equals the one press path's log, with no entry in a week he has the bye
 *    and none after he is out, his playoff record is his record in
 *    nflRoundsOf, and after the last game the 32 records are the regular
 *    season's. With the desk on (as in section 11): the sink, and his log
 *    built a press at a time, deep equal the one press path's with the edges.
 *
 * Negative controls (GM_GAMEDAY_CONTROL=...). Each patches a string that must
 * be in its file exactly once (or the run refuses, exit 2), always exits 1
 * when its NAMED checks are among the reds, and exits 2 when they are not:
 *   winner      the winner test taken out of decidedScore            section 1
 *   level       the winner's score told for both sides               section 1 (a told final is never level)
 *   refuse      the quick path refuses a game in five by its key     section 1 (the law never refuses), and
 *               section 3's count of games told and measured
 *   lowmax      the NFL's top score typed as 30                      section 1 (no told final above it), and
 *               section 2's "every told final has a story"
 *   twopaths    the told path keys its final differently             section 1
 *   tries       the law is asked twice, not 24 times                 section 1 (the swapped share)
 *   offbyone    a field goal told as four points                     section 2
 *   olddraw     the engine's base and margin score told instead      section 3 (losers on 15 or fewer: none)
 *   pairing     the Divisional ranks swapped in the NFL data         section 4
 *   validator   the replay check answers "no problems" at once       section 4
 *   strict      the replay check calls a one game tie empty          section 4 (an over strict validator: a false
 *               problem wipes a real bracket through the repair; the machine's own games must stay green)
 *   outofturn   the mover plays a tie before an earlier week is in   section 4 (the any order walk)
 *   enginedrift the engine's margin draw changed, in the engine      section 4 (the recorded fixture ALONE: the
 *               machine still agrees with the engine it is played beside, which must stay green)
 *   random      a Math.random() planted in gameStory                 section 5
 *   stream      a Math.random() planted in decidedScore              section 5
 *   unkeyed     the story's stream keyed to a counter, not the game  section 5 (twice, and through JSON)
 *   ceiling     the library's ceiling typed as 100000                section 5 (both save guards, and the story)
 *   lawmax      the NFL's game day law claims a top score of 999     section 5 (no final above the sport's own)
 *   mounted     an import planted in memory in a route file          section 6
 *   static      a static import of the told path planted in the NFL board   section 6 (no board imports a story statically)
 *   bindstream  a Math.random() planted in nflTell                   section 7 (the draw count, the winners, the records)
 *   bindold     nflTell hands back the engine's own score            section 8 (losers on 15 or fewer: none; the quick
 *               path's final), and section 7's "the scores do differ"
 *   bindchance  nflTell reads the chance with the two clubs swapped  section 8 (the quick path's final for the chance)
 *   bindrefuse  nflTell refuses a game in five by its key            section 8 (the bind never refuses)
 *   logdrop     addToGmGameLog drops every road win                  section 9 (the record a week, one entry a week)
 *   logholes    readGmGameLog skips an entry it cannot read          section 9 (a damaged entry: the log is absent)
 *   undo        nflPlayTie takes neither the win nor the loss back    section 11 (the records; the games stay green)
 *   keydrift    nflPlayTie tells under the tie's id, not its round    section 11 (the told scores and the rounds)
 *   trust       loadGmPostseason hands any block back unrepaired      section 12 (the damages; a sound block stays green)
 *   keyrebuilt  the sink's key built from the told score              section 13 (the deep equal and the sink; the record stays green)
 *   logplayoff  the sink takes no entry                               section 13 (the deep equal and the record)
 *   noedges     nflPlayTie plays its game without the desk's edges    section 11 with the desk on (and its sink in
 *               (still told with them)                                section 13); the desk off checks stay green
 * NOT HELD HERE: the save guard and the repair with every field damaged
 * (isGmBracketSave, repairGmBracket, readGmLastGame). They are held by the
 * unit files src/lib/gmBracket.test.ts, src/lib/gmGameDay.test.ts and
 * src/lib/gmGameScore.test.ts, and seven mutations of those rules leave this
 * harness green: a gate that carries this round names all three beside it.
 * WITHOUT A CONTROL OF THEIR OWN: "a save survives JSON after every press",
 * "the fixture is of this fleet" and the five checks of the data's structure
 * (they compare constants of the data file and the fleet file with numbers
 * typed here; the `pairing` control is the one that moves the data).
 *
 * MEASURED (2026-10-10, seed sets 0 to 4, 22,800 games a set, 114,000 in
 * all; the harness prints this table when it closes, and the runs are named
 * in docs/audits/ROUND-1224-NOTES.md):
 *   Section 3, told less free, the range over the five sets:
 *     points a team game     -0.105 to +0.069   (told 22.63 to 22.74)
 *     losers on 15 or fewer  -0.0071 to +0.0074 (told 0.423 to 0.434)
 *     shutouts               -0.0028 to +0.0013 (told 0.0129 to 0.0150)
 *     sides on 40 or more    -0.0010 to +0.0033 (told 0.0510 to 0.0538)
 *   The two samples are separate draws, so one set's difference has a
 *   standard error of about 0.066, 0.0046, 0.0011 and 0.0015. The bands
 *   (0.25, 0.02, 0.005, 0.006 either side) are about four of those and 1.8 to
 *   2.7 times the widest difference the five sets showed. Under control
 *   olddraw seed set 0 reads 27.54 against 22.64 points, 0.0000 against
 *   0.4297 losers on 15 or fewer, 0.0000 against 0.0148 shutouts and 0.0716
 *   against 0.0517 sides on 40 or more: all four far outside.
 *   Section 1, the swapped share: 0.00039 to 0.00066 a set (9 to 15 games in
 *   22,800), nearly all of them road upsets at a home chance of 0.8 or more.
 *   The band is under 0.002, three times the widest seen.
 *   Printed, never asserted: 2.0 tries a game in every decile of the chance
 *   (it is 2 by construction while the law's chance is the engine's); the
 *   shapes of the 114,000 stories (trade 0.299, wire 0.218, late 0.170, rout
 *   0.169, comeback 0.144); the AFC champion won 38, 46, 47, 43 and 47 of 80
 *   title games a set, 221 of 400 (a level one is 0.582 by the arithmetic).
 *   NOT printed beside them: the league's real figures. None was read on two
 *   sources in this round, so none is typed here.
 * MEASURED FOR ROUND 1305 (2026-10-11, seed sets 0 to 4, 22,800 games a set
 * told by the bind; runner result r1305-b1):
 *   Section 7, the share of games whose told score is not the engine's own:
 *   0.9975 to 0.9982 a set (41 to 57 games in 22,800 where the law's final
 *   happened to be the engine's). One set's standard error is about 0.0003.
 *   The floor is 0.99: 0.0075 under the lowest set, about 25 of those errors,
 *   and under control bindold (the engine's score handed back) it reads 0.
 *   Section 8: the bind refused 0 games in every set, and the check is that
 *   count being zero (no band: section 1 already holds that the law never
 *   refuses). Its four statistics are section 3's told ones to the digit,
 *   because the bind's key and chance are the quick path's.
 *   Section 9 has no band: every check is an equality over 320 club seasons
 *   a set (four clubs in each of 80 seasons).
 * MEASURED FOR ROUND 1308 (2026-10-12, runner result r1308-c1): sections 11
 *   to 13 hold no band, every check is an equality. Per seed set: 80
 *   seasons; of section 13's 320 club seasons 72 to 82 had a bye and 124 to
 *   138 went out; section 12 loaded 10 stops and rebuilt 52 damaged blocks.
 *
 * Nothing here reads the network. The clock is read only to time the run
 * for its own log lines: no check and nothing that is played depends on it.
 * Run: node scripts/simGmGameDay.mjs            (SEEDSET=2 for one seed set)
 */
import fs from 'node:fs';
import path from 'node:path';
import { ENGINE_ENTRY, FLEET, FLEET_FILE, NEXT_DRAWS, ROOT, bundle, enginePostseason, gameText, playRegularSeason, readSrc, recordsOf, seasonId, seedsOf, sha1, withMathRandom } from './lib/gmGameDayFleet.mjs';

const CONTROL = process.env.GM_GAMEDAY_CONTROL || '';
const SEEDSETS = process.env.SEEDSET !== undefined && process.env.SEEDSET !== '' ? process.env.SEEDSET.split(',').map(Number) : FLEET.sets;
if (SEEDSETS.some(s => !FLEET.sets.includes(s))) { console.error(`SEEDSET must be among ${FLEET.sets.join(', ')}`); process.exit(2); }

const SCORE = 'src/lib/gmGameScore.ts';
const DAY = 'src/lib/gmGameDay.ts';
const BRACKET = 'src/lib/gmBracket.ts';
const NFL_DAY = 'src/lib/gameLaws/nflGameDay.ts';
const NFL_DATA = 'src/data/gmBrackets/nfl.ts';
const NFL_HELP = 'src/data/gmBrackets/nflHelp.ts';
/* Round 1305: the save field of the season's results and the NFL board's bind to the quick path */
const LOG = 'src/lib/gmGameLog.ts';
const BIND = 'src/lib/frontOfficeGameDay.ts';
/* Round 1307: every word on the tile, decided in a lib; it rides with a card */
const VIEW = 'src/lib/gmGameDayView.ts';
/* the shared tile and the NFL's bound card: one lazy chunk a week box asks for */
const CARD = 'src/components/front-office-shared/GmGameDayCard.tsx';
const NFL_CARD = 'src/components/front-office/NflGameDay.tsx';
/* Round 1308: the postseason a board plays a round at a time, the press and load half (sport free) and the NFL's bind */
const POST = 'src/lib/gmPostseason.ts';
const NFL_POST = 'src/lib/frontOfficePostseason.ts';
/* the bracket card: every word it prints (sport free), the shared card and the NFL's bound card; they ride with a card */
const BRACKET_VIEW = 'src/lib/gmBracketView.ts';
const BRACKET_CARD = 'src/components/front-office-shared/GmBracketCard.tsx';
const NFL_BRACKET_CARD = 'src/components/front-office/NflBracket.tsx';
const NEW_FILES = [SCORE, DAY, BRACKET, NFL_DAY, NFL_DATA, NFL_HELP, LOG, BIND, VIEW, CARD, NFL_CARD, POST, NFL_POST, BRACKET_VIEW, BRACKET_CARD, NFL_BRACKET_CARD];
/* the round whose header a new file opens with: section 5 proves the comment stripper took it out */
const ROUND_OF = { [LOG]: 'Round 1305', [BIND]: 'Round 1305', [VIEW]: 'Round 1307', [CARD]: 'Round 1307', [NFL_CARD]: 'Round 1307', [POST]: 'Round 1308', [NFL_POST]: 'Round 1308', [BRACKET_VIEW]: 'Round 1308', [BRACKET_CARD]: 'Round 1308', [NFL_BRACKET_CARD]: 'Round 1308' };
const ROUTE_FILE = 'src/pages/FrontOffice.tsx';
const NFL_BOARD = 'src/components/front-office/FrontOfficeBoard.tsx';
const BOARDS = [NFL_BOARD, 'src/components/nba-front-office/NbaFrontOfficeBoard.tsx', 'src/components/mlb-front-office/MlbFrontOfficeBoard.tsx', 'src/components/nhl-front-office/NhlFrontOfficeBoard.tsx'];
/* what only a drawn card reads: the told path, the NFL's story law, its game day law and the words of the two "?" */
const STORY_FILES = [DAY, 'src/lib/gameLaws/nfl.ts', NFL_DAY, NFL_HELP, VIEW, CARD, NFL_CARD, BRACKET_VIEW, BRACKET_CARD, NFL_BRACKET_CARD];
/* Round 1308's review (2026-10-12): the strength points a GM desk's staff hands his club in a playoff game
   (nflDeskEdges). 3 is the most the NFL staff pack gives: the head coach's 0.75 and a coordinator's 2.25 at each end
   (src/data/gmStaff/packs.ts), weighted 0.72 and 0.28 (src/lib/nflGmDesk.ts, nflStaffEdge). The strongest edge a desk
   plays, so the strongest signal for sections 11 and 13 with the desk on. */
const DESK_EDGE = 3;

/* `labels`: pieces of the check labels that must ALL be among the reds of the control's section for it to count
   as fired. `elsewhere`: pieces that must ALSO be among the reds, in whatever section they sit. `clean`: pieces that
   must be among no red at all (the control is aimed at one fence, not its neighbour). */
const CONTROLS = {
  winner: { section: 1, labels: ['never names another winner'], patches: [{ file: SCORE, from: 'if ((s[0] > s[1]) === d.homeWon) return', to: 'if (s[0] !== s[1]) return' }] },
  level: { section: 1, labels: ['a told final is never level'], patches: [{ file: SCORE, from: 'return { home: s[0], away: s[1], tries: t + 1, swapped: false };', to: 'return { home: s[0], away: s[0], tries: t + 1, swapped: false };' }] },
  refuse: { section: 1, labels: ['never refuses a game of the fleet'], elsewhere: ['every game of the fleet was told and measured'], patches: [{ file: SCORE, from: "typeof f.away !== 'string' || f.home === f.away) return null;", to: "typeof f.away !== 'string' || f.home === f.away || f.key.length % 5 === 0) return null;" }] },
  twopaths: { section: 1, labels: ["tells the quick path's final"], patches: [{ file: DAY, from: 'const told = quickGame(score, f);', to: 'const told = quickGame(score, { ...f, key: f.key + "|again" });' }] },
  tries: { section: 1, labels: ['the swapped share'], patches: [{ file: SCORE, from: 'export const SCORE_TRIES = 24;', to: 'export const SCORE_TRIES = 2;' }] },
  offbyone: { section: 2, labels: ['adds up by the independent checker'], elsewhere: ['every game of the log tells a story that the same checker adds up'], patches: [{ file: DAY, from: 'events.push({ ...e, side });', to: 'events.push({ ...e, side, pts: e.kind === "fg" ? 4 : e.pts });' }] },
  olddraw: { section: 3, labels: ['losers15 told 0.0000'], patches: [{ file: SCORE, from: 'const s = law.score(d.pHome, keyedRng(`${key}|score|${t}`), d);', to: 'const r = keyedRng(`${key}|score|${t}`); const base = 16 + Math.floor(r() * 15); const margin = 1 + Math.floor(r() * 17); const s = d.homeWon ? [base + margin, base] : [base, base + margin];' }] },
  pairing: { section: 4, labels: ['playBracketAll gives', 'four presses of playBracketWeek'], patches: [
    { file: NFL_DATA, from: 'home: { seed: top }, away: { rankedWinnerOf: wc, rank: 2 }', to: 'home: { seed: top }, away: { rankedWinnerOf: wc, rank: 0 }' },
    { file: NFL_DATA, from: 'home: { rankedWinnerOf: wc, rank: 0 }, away: { rankedWinnerOf: wc, rank: 1 }', to: 'home: { rankedWinnerOf: wc, rank: 1 }, away: { rankedWinnerOf: wc, rank: 2 }' },
  ] },
  validator: { section: 4, labels: ['names a doctored winner', 'names a doctored pairing', 'names a tie played out of turn'], patches: [{ file: BRACKET, from: 'const seen = new Set<string>();', to: 'const seen = new Set<string>(); if (seen.size === 0) return problems;' }] },
  strict: { section: 4, labels: ['bracketProblems finds nothing in a bracket the machine played', 'finds nothing after any game'], clean: ['playBracketAll gives', 'four presses of playBracketWeek'], patches: [{ file: BRACKET, from: 'if (p.games.length === 0) problems.push(`${p.id} is listed with no game`);', to: 'if (p.games.length <= 1) problems.push(`${p.id} is listed with no game`);' }] },
  outofturn: { section: 4, labels: ['finds nothing after any game'], clean: ['playBracketAll gives', 'four presses of playBracketWeek'], patches: [{ file: BRACKET, from: 'if (!format.order && format.ties.some(t => t.week < tie.week && !done[t.id])) return save;', to: '' }] },
  enginedrift: { section: 4, labels: ['is the recorded one'], clean: ['playBracketAll gives', 'four presses of playBracketWeek'], patches: [{ file: 'src/lib/frontOffice.ts', from: 'const margin = 1 + Math.floor(rng() * 17);', to: 'const margin = 1 + Math.floor(rng() * 16);' }] },
  random: { section: 5, labels: ['holds no Math.random', 'takes no draw from Math.random'], patches: [{ file: DAY, from: "const flip = viewAs === 'away';", to: "const flip = viewAs === 'away'; Math.random();" }] },
  stream: { section: 5, labels: ['holds no Math.random', 'takes no draw from Math.random', 'moves none of its 272 winners'], patches: [{ file: SCORE, from: 'let first: [number, number] | null = null;', to: 'let first: [number, number] | null = null; Math.random();' }] },
  unkeyed: { section: 5, labels: ['the same story twice', 'through JSON, tells the same story'], patches: [{ file: DAY, from: 'keyedRng(`${g.key}|story|${g.homeScore}-${g.awayScore}`)', to: 'keyedRng(`${g.key}|story|${(globalThis.__gmDayCalls = (globalThis.__gmDayCalls ?? 0) + 1)}`)' }] },
  ceiling: { section: 5, labels: ['the save guards refuse a score above the ceiling', 'a final above the ceiling is told nothing'], patches: [{ file: SCORE, from: 'export const GM_SCORE_CEILING = 999;', to: 'export const GM_SCORE_CEILING = 100000;' }] },
  lawmax: { section: 5, labels: ["tells no final above the sport's own top score"], patches: [{ file: NFL_DAY, from: 'maxScore: NFL_MAX_SCORE,', to: 'maxScore: 999,' }] },
  lowmax: { section: 1, labels: ["has a side above the sport's own top score"], elsewhere: ['every told final has a story'], patches: [{ file: NFL_DAY, from: 'export const NFL_MAX_SCORE = 7 * DRIVES + 3;', to: 'export const NFL_MAX_SCORE = 30;' }] },
  mounted: { section: 6, labels: ['no file under src imports'], patches: [], plant: { file: ROUTE_FILE, text: "\nimport { gameStory } from '@/lib/gmGameDay';\n" } },
  static: { section: 6, labels: ['import no story law'], patches: [], plant: { file: NFL_BOARD, text: "\nimport { gameStory } from '@/lib/gmGameDay';\n" } },
  bindstream: { section: 7, labels: ['with the bind takes no draw from Math.random', 'with the bind moves none of its 272 winners', 'with the bind moves none of its 32 records'], patches: [{ file: BIND, from: 'const key = nflGameKey(season, where, g);', to: 'const key = nflGameKey(season, where, g); Math.random();' }] },
  bindold: { section: 8, labels: ['losers15 by the bind 0.0000', "tells the quick path's final for the chance"], elsewhere: ["do differ from the engine's"], patches: [{ file: BIND, from: 'game: { ...g, homeScore: told.homeScore, awayScore: told.awayScore }, last: makeGmLastGame(told, where), byLaw: true', to: 'game: g, last: makeGmLastGame(told, where), byLaw: true' }] },
  bindrefuse: { section: 8, labels: ['the bind never refuses a game of the fleet'], patches: [{ file: BIND, from: 'if (told && toldWinner(told) !== g.winner) told = null;', to: 'if (told && (toldWinner(told) !== g.winner || key.length % 5 === 0)) told = null;' }] },
  bindchance: { section: 8, labels: ["tells the quick path's final for the chance"], patches: [{ file: BIND, from: 'const home = teams[g.home], away = teams[g.away];', to: 'const home = teams[g.away], away = teams[g.home];' }] },
  logdrop: { section: 9, labels: ["after every week the log's record is the club's", 'one entry a week, in week order'], patches: [{ file: LOG, from: 'return { v: 1, season, games: [...kept, ...games] };', to: 'return { v: 1, season, games: [...kept, ...games.filter(g => g.winner === g.home)] };' }] },
  /* Round 1308 */
  undo: { section: 11, labels: ['the bracket path leaves the 32 records'], clean: ["give the fixture's thirteen games", 'playBracketAll with nflPlayTie gives the same'], patches: [
    { file: NFL_POST, from: '    teams[g.winner].wins -= 1;', to: '' },
    { file: NFL_POST, from: '    teams[g.winner === g.home ? g.away : g.home].losses -= 1;', to: '' },
  ] },
  keydrift: { section: 11, labels: ["each told score is nflTell's on the fixture's own engine game", "nflRoundsOf is runPlayoffs' rounds told"], clean: ["give the fixture's thirteen games"], patches: [{ file: NFL_POST, from: 'const t = nflTell(g, teams, season, tie.round, edges);', to: 'const t = nflTell(g, teams, season, tie.id, edges);' }] },
  trust: { section: 12, labels: ['rebuilt unplayed with the feed line'], clean: ['comes back as it is'], patches: [{ file: POST, from: 'const repair = repairGmBracket(format, known, season, () => sport.seeds(league), isClub, seeds => sport.seedsOk(seeds, league));', to: 'const repair = { save: known ?? block, rebuilt: null, line: null, problems: [] };' }] },
  keyrebuilt: { section: 13, labels: ["deep equal the one press path's", 'the sink holds every game'], clean: ['his playoff record in the log'], patches: [{ file: NFL_POST, from: 'if (t.last) told.push(t.last);', to: 'if (t.last) told.push({ ...t.last, key: `${season}|${tie.round}|${t.game.home}|${t.game.away}|${t.game.homeScore}-${t.game.awayScore}` });' }] },
  logplayoff: { section: 13, labels: ["deep equal the one press path's", 'his playoff record in the log is his record in nflRoundsOf'], patches: [{ file: NFL_POST, from: 'if (t.last) told.push(t.last);', to: '' }] },
  /* Round 1308's review: the desk's edges dropped from the playoff game (still told with them) */
  noedges: { section: 11, labels: ['with the desk on (his club', 'with the desk on, nflRoundsOf'], elsewhere: ['with the desk on, the sink holds every game'], clean: ["give the fixture's thirteen games", 'playBracketAll with nflPlayTie gives the same', 'so the desk on checks hold something'], patches: [{ file: NFL_POST, from: "const g = simGame({ week: 0, home, away, homeScore: 0, awayScore: 0, winner: '' }, teams, rng, edges);", to: "const g = simGame({ week: 0, home, away, homeScore: 0, awayScore: 0, winner: '' }, teams, rng);" }] },
  logholes: { section: 9, labels: ['with any one field of an entry damaged the log reads as absent'], patches: [{ file: LOG, from: 'if (!g || (g.home !== club && g.away !== club) || keys.has(g.key)) return null;', to: 'if (!g) continue; if ((g.home !== club && g.away !== club) || keys.has(g.key)) return null;' }] },
};
if (CONTROL && !CONTROLS[CONTROL]) { console.error(`unknown GM_GAMEDAY_CONTROL ${CONTROL} (${Object.keys(CONTROLS).join(', ')})`); process.exit(2); }
const PATCHES = CONTROL ? CONTROLS[CONTROL].patches : [];

/* A source file as this run sees it: the control's patches applied, so the scans of sections 5 and 6 read what the bundle runs. */
function readPatched(rel) {
  let src = readSrc(rel);
  for (const p of PATCHES.filter(x => x.file === rel)) {
    if (src.split(p.from).length !== 2) { console.error(`control ${CONTROL}: its string is not exactly once in ${rel}, refusing to run: ${p.from.slice(0, 80)}`); process.exit(2); }
    src = src.replace(p.from, () => p.to);
  }
  const plant = CONTROL ? CONTROLS[CONTROL].plant : undefined;
  return plant && plant.file === rel ? src + plant.text : src;
}

/* ─── The bundle: the untouched engine, the libraries, the NFL's law and data, the ledger ─── */
const t0 = Date.now();
let M;
let fired;
try {
  ({ M, fired } = await bundle([
    ...ENGINE_ENTRY,
    "export * as score from './src/lib/gmGameScore.ts';",
    "export * as day from './src/lib/gmGameDay.ts';",
    "export * as bracket from './src/lib/gmBracket.ts';",
    "export * as nflDay from './src/lib/gameLaws/nflGameDay.ts';",
    "export * as nflData from './src/data/gmBrackets/nfl.ts';",
    "export { NFL_SCORE_LAW } from './src/lib/gameLaws/nflScore.ts';",
    "export { NFL_SCORING, NFL_CLOCK } from './src/data/usLeagueShape.ts';",
    "export { keyedRng } from './src/lib/keyedRng.ts';",
    "export { finalTie } from './src/lib/finalsBracket.ts';",
    "export * as log from './src/lib/gmGameLog.ts';",
    "export * as bind from './src/lib/frontOfficeGameDay.ts';",
    "export * as post from './src/lib/gmPostseason.ts';",
    "export * as nflPost from './src/lib/frontOfficePostseason.ts';",
  ], PATCHES, CONTROL || 'base'));
} catch (e) {
  console.error(`simGmGameDay: the bundle refused${CONTROL ? ` (control ${CONTROL})` : ''}: ${e && e.message ? e.message.split('\n')[0] : e}`);
  process.exit(2);
}
if (fired.size !== PATCHES.length) { console.error(`control ${CONTROL}: ${fired.size} of ${PATCHES.length} patches reached their file, refusing to report`); process.exit(2); }
const { engine: E, score: S, day: D, bracket: B, nflDay, nflData, NFL_SCORE_LAW: LAW, NFL_SCORING, NFL_CLOCK, log: L, bind: N, post: P, nflPost: NP } = M;
const GAME_DAY = nflDay.NFL_GAME_DAY;
const FORMAT = nflData.NFL_BRACKET;
console.log(`bundled in ${Date.now() - t0} ms; seed sets ${SEEDSETS.join(', ')}; ${FLEET.perKind} seasons a league kind a set${CONTROL ? `; CONTROL ${CONTROL}` : ''}`);

/* ─── Failure bookkeeping, by section ─── */
let checks = 0;
const failsBy = new Map();
function check(section, label, ok, detail = '') {
  checks += 1;
  if (ok) return;
  const key = String(section);
  failsBy.set(key, [...(failsBy.get(key) ?? []), label]);
  console.error(`  FAIL (section ${section}): ${label}${detail ? `: ${detail}` : ''}`);
}
/* A check over many games: how many broke it, and the first one that did. */
function tally() { return { n: 0, bad: 0, first: '' }; }
function count(t, ok, what) { t.n += 1; if (!ok) { t.bad += 1; if (!t.first) t.first = typeof what === 'function' ? what() : what; } }
function settle(section, label, t) { check(section, `${label} (${t.n} looked at)`, t.bad === 0 && t.n > 0, t.n === 0 ? 'nothing was looked at' : `${t.bad} broke it, the first: ${t.first}`); }

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/* Source text with comments taken out, strings and templates left as they are (a guard reads the code, not the prose about it). */
function stripComments(src) {
  let out = '';
  let i = 0;
  let quote = '';
  while (i < src.length) {
    const c = src[i];
    const d = src[i + 1];
    if (quote) {
      out += c;
      if (c === '\\') { out += d ?? ''; i += 2; continue; }
      if (c === quote) quote = '';
      i += 1;
    } else if (c === '/' && d === '*') {
      const end = src.indexOf('*/', i + 2);
      i = end === -1 ? src.length : end + 2;
      out += ' ';
    } else if (c === '/' && d === '/') {
      const end = src.indexOf('\n', i);
      i = end === -1 ? src.length : end;
    } else {
      if (c === '"' || c === "'" || c === '`') quote = c;
      out += c;
      i += 1;
    }
  }
  return out;
}

/* ─── Section 2's checker: a story against the rules, with its own arithmetic ─── */
const WORTH = { td: [NFL_SCORING.touchdown, NFL_SCORING.touchdown + NFL_SCORING.kickAfter, NFL_SCORING.touchdown + NFL_SCORING.twoPointTry], fg: [NFL_SCORING.fieldGoal], safety: [NFL_SCORING.safety] };
const HOUR = NFL_CLOCK.quarters * NFL_CLOCK.minutes;
function storyProblems(story, quick, view) {
  const out = [];
  const us = view === 'home' ? quick.homeScore : quick.awayScore;
  const them = view === 'home' ? quick.awayScore : quick.homeScore;
  const ev = story.game.events;
  if (story.game.us !== us || story.game.them !== them) out.push('the final is not the told final');
  if ((story.game.home === true) !== (view === 'home')) out.push('the view is the wrong side');
  let sumUs = 0;
  let sumThem = 0;
  const quarters = { us: [0, 0, 0, 0], them: [0, 0, 0, 0] };
  const minutes = new Set();
  let before = 0;
  for (const e of ev) {
    if (!WORTH[e.kind] || !WORTH[e.kind].includes(e.pts)) out.push(`a ${e.kind} worth ${e.pts}`);
    if (!Number.isInteger(e.min) || e.min < 1 || e.min > HOUR) out.push(`minute ${e.min}`);
    if (minutes.has(e.min)) out.push(`two lines on minute ${e.min}`);
    if (e.min < before) out.push('not minute ordered');
    before = e.min;
    minutes.add(e.min);
    if (e.side === 'us') sumUs += e.pts; else if (e.side === 'them') sumThem += e.pts; else out.push(`side ${e.side}`);
    const q = Math.floor((e.min - 1) / NFL_CLOCK.minutes);
    if (quarters[e.side] && q >= 0 && q < 4) quarters[e.side][q] += e.pts;
  }
  if (sumUs !== us || sumThem !== them) out.push(`the plays sum to ${sumUs}-${sumThem}, the final is ${us}-${them}`);
  if (!same(story.periods, quarters)) out.push(`the quarters read ${JSON.stringify(story.periods)}, the plays make ${JSON.stringify(quarters)}`);
  /* the deciding plays, by the rule: walk the lead of the side that won */
  const win = us > them ? 'us' : 'them';
  let lead = 0;
  let last = -1;
  let hole = 0;
  ev.forEach((e, i) => { lead += e.side === win ? e.pts : -e.pts; if (lead <= 0) last = i; if (-lead > hole) hole = -lead; });
  const goAhead = ev[last + 1];
  const want = [];
  for (let i = last; i >= 0; i -= 1) if (ev[i].side !== win) { want.push(ev[i]); break; }
  want.push(goAhead);
  for (let i = ev.length - 1; i > last + 1; i -= 1) if (ev[i].side === win) { want.push(ev[i]); break; }
  if (story.deciding.length !== want.length || story.deciding.some((e, i) => e !== want[i])) out.push('the deciding plays are not the rule\'s');
  if (story.deciding.some(e => !ev.includes(e))) out.push('a deciding play is not a play of the game');
  if (story.goAhead !== goAhead) out.push('the go ahead the story names is not the rule\'s');
  const margin = Math.abs(us - them);
  const shape = margin >= nflDay.NFL_ROUT ? 'rout' : hole >= nflDay.NFL_COMEBACK ? 'comeback' : goAhead && goAhead.min > HOUR - NFL_CLOCK.minutes ? 'late' : last === -1 ? 'wire' : 'trade';
  if (story.shape !== shape) out.push(`shape ${story.shape}, the rule says ${shape}`);
  return out;
}

/* ─── The bands of sections 1 and 3 (see MEASURED in the header) ─── */
const SWAPPED_MOST = 0.002;
const BANDS = { points: 0.25, losers15: 0.02, shutouts: 0.005, forty: 0.006 };
/* Section 7: the least share of games whose told score is not the engine's own (see MEASURED, Round 1305) */
const DIFFER_LEAST = 0.99;
/* The fields of a log entry, each with a value that is not one (section 9 damages every one in turn) */
const ENTRY_DAMAGE = { v: 2, key: '', where: '', home: 'NO SUCH CLUB', away: 'NO SUCH CLUB', homeScore: 1000, awayScore: -1 };

/* What one seed set measured, kept for the closing table. */
const measured = [];
const CLUBS = new Set(M.FO_TEAMS.map(t => t.abbr));
const isClub = id => CLUBS.has(id);
const fixturePath = path.join(ROOT, 'scripts', 'data', 'gmBracketFixture.json');
const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
/* The fixture records every file its record was taken from, each with its hash: what the engine bundle read (the
   engine, its rosters and all they import) and the fleet. A changed file is NOT a red by itself (a comment, or a
   function no postseason reads, moves no game): the fence is the digest of what is PLAYED. The hashes only say, when
   a digest has moved, where to look: which recorded inputs changed, and which files the engine reads today that the
   record never saw. Worked out only when a digest is red (it costs a second bundle). */
const fixtureInputs = Object.entries(fixture.inputs ?? {});
async function fixtureFiles() {
  const hashNow = rel => { try { return sha1(readSrc(rel)); } catch { return 'gone'; } };
  const moved = fixtureInputs.filter(([rel, hash]) => hashNow(rel) !== hash).map(([rel]) => rel);
  const { inputs: today } = await bundle(ENGINE_ENTRY, [], 'inputs');
  const unseen = [...today, FLEET_FILE].filter(rel => !(rel in (fixture.inputs ?? {})));
  return `${moved.length ? `recorded inputs that are NOT the files the fixture was recorded from: ${moved.join(', ')}` : `all ${fixtureInputs.length} recorded inputs are the files the fixture was recorded from`}`
    + `; files the engine reads today that the fixture never recorded: ${unseen.join(', ') || 'none'}`
    + `${CONTROL ? '; this run is under a control, which patches the bundle and not the files' : ''}`;
}
check(4, 'the fixture is of this fleet', same(fixture.fleet, { ...FLEET, nextDraws: NEXT_DRAWS }));
check(4, `the fixture records the files it was taken from (${fixtureInputs.length}: the engine, the fleet and what the engine imports)`, fixtureInputs.length >= 3 && ['src/lib/frontOffice.ts', FLEET_FILE].every(rel => rel in (fixture.inputs ?? {})));

/* One playoff game as the engine's one press postseason plays it: the engine's game at week 0, then the win and the loss taken back. */
const engineTie = (teams, after) => (home, away, tie) => {
  const g = E.simGame({ week: 0, home, away, homeScore: 0, awayScore: 0, winner: '' }, teams, Math.random);
  teams[g.winner].wins -= 1;
  teams[g.winner === g.home ? g.away : g.home].losses -= 1;
  if (after) after(g, tie);
  return { homeScore: g.homeScore, awayScore: g.awayScore, winner: g.winner };
};
/* What the machine played, written the way enginePostseason writes the engine's. */
const machineRow = (save, teams, next) => ({
  seeds: save.seeds.join(','),
  games: B.bracketRounds(FORMAT, save).flatMap(r => r.games.map(g => gameText(r.name, g))),
  champion: B.bracketChampion(FORMAT, save),
  next: sha1(next.join(',')),
  records: sha1(recordsOf(teams)),
});
const decile = p => Math.min(9, Math.floor(p * 10));

for (const set of SEEDSETS) {
  const t1 = Date.now();
  const s1 = { winner: tally(), level: tally(), refused: tally(), paths: tally(), top: tally() };
  const s2 = { story: tally(), adds: tally() };
  const s4 = { all: tally(), weeks: tally(), sound: tally(), json: tally(), dWinner: tally(), dPairing: tally(), dTurn: tally(), anyOrder: tally() };
  const s5 = { state: tally(), calls: tally(), winners: tally(), records: tally(), twice: tally(), reload: tally(), bracket: tally() };
  const told = { games: 0, points: 0, losers15: 0, shutouts: 0, forty: 0, swapped: 0 };
  const free = { games: 0, points: 0, losers15: 0, shutouts: 0, forty: 0 };
  const tries = Array.from({ length: 10 }, () => ({ n: 0, tries: 0, swapped: 0 }));
  const shapes = {};
  let afcTitles = 0;
  const lines = [];
  /* Round 1305, sections 7 to 9: the season as the BOARD tells it, through the bind and into the log */
  const s7 = { state: tally(), calls: tally(), winners: tally(), records: tally(), row: tally() };
  const s8 = { refused: tally(), quick: tally() };
  const s9 = { weekly: tally(), order: tally(), playoff: tally(), json: tally(), other: tally(), damage: tally(), late: tally() };
  /* Round 1307, section 10: the stories of the games a log holds */
  const s10 = { story: tally(), adds: tally() };
  /* Round 1308, sections 11 to 13: the postseason a round at a time through the NFL's bind */
  const s11 = { weeks: tally(), all: tally(), records: tally(), told: tally(), rounds: tally() };
  const s12 = { sound: tally(), outside: tally(), rebuilt: tally(), plays: tally() };
  const s12kinds = new Set();
  const s13 = { sink: tally(), when: tally(), entries: tally(), record: tally(), records: tally() };
  const s13seen = { bye: 0, out: 0 };
  /* the same two sections with the GM desk on (his club DESK_EDGE), against the one press path played with the edges */
  const s11d = { games: tally(), rounds: tally() };
  const s13d = { sink: tally(), entries: tally() };
  const deskSeen = { runs: 0, qualified: 0, moved: 0 };
  const bound = { games: 0, points: 0, losers15: 0, shutouts: 0, forty: 0, differ: 0 };
  let lateSeen = '';
  const addScore = (o, home, away) => {
    const lo = Math.min(home, away);
    o.games += 1;
    o.points += home + away;
    if (lo <= 15) o.losers15 += 1;
    if (lo === 0) o.shutouts += 1;
    o.forty += (home >= 40 ? 1 : 0) + (away >= 40 ? 1 : 0);
  };
  /* One game told by the bind, right after the engine's game and inside the seeded Math.random. `pHome` is the chance
     the engine played it at, read by the caller BEFORE the game where it can be. */
  const seeBind = (id, g, t, pHome, key) => {
    count(s8.refused, t.byLaw === true, () => `${id} ${key}`);
    const want = S.quickGame(LAW, { key, home: g.home, away: g.away, decided: { homeWon: g.winner === g.home, pHome } });
    count(s8.quick, want !== null && t.game.homeScore === want.homeScore && t.game.awayScore === want.awayScore && t.game.winner === g.winner && t.game.home === g.home && t.game.away === g.away && t.last !== null && t.last.key === key && t.last.homeScore === want.homeScore && t.last.awayScore === want.awayScore,
      () => `${id} ${key}: the bind told ${t.game.homeScore}-${t.game.awayScore}, the quick path ${want ? `${want.homeScore}-${want.awayScore}` : 'nothing'}`);
    addScore(bound, t.game.homeScore, t.game.awayScore);
    if (t.game.homeScore !== g.homeScore || t.game.awayScore !== g.awayScore) bound.differ += 1;
  };
  /* One game told the way a board will tell it (the quick path in the press, the story for the card), and every
     per game check of sections 1, 2, 3 and 5. Called INSIDE the seeded Math.random, right after the engine's game. */
  const tell = (id, key, g, pHome, view) => {
    const f = { key, home: g.home, away: g.away, decided: { homeWon: g.winner === g.home, pHome } };
    const quick = S.quickGame(LAW, f);
    count(s1.refused, quick !== null, () => `${id} ${key}`);
    if (!quick) return;
    count(s1.level, quick.homeScore !== quick.awayScore, () => `${id} ${key}: ${quick.homeScore}-${quick.awayScore}`);
    count(s1.winner, S.toldWinner(quick) === g.winner, () => `${id} ${key}: told ${quick.homeScore}-${quick.awayScore}, the engine's winner is ${g.winner}`);
    count(s1.top, quick.homeScore <= GAME_DAY.maxScore && quick.awayScore <= GAME_DAY.maxScore, () => `${id} ${key}: told ${quick.homeScore}-${quick.awayScore}, the sport's top score is ${GAME_DAY.maxScore}`);
    const t = D.tellGame(LAW, GAME_DAY, f, view);
    count(s1.paths, t !== null && same(t.told, quick), () => `${id} ${key}: told ${t ? `${t.told.homeScore}-${t.told.awayScore}` : 'nothing'}, quick ${quick.homeScore}-${quick.awayScore}`);
    const story = t ? t.story : null;
    count(s5.twice, same(S.quickGame(LAW, f), quick) && same(D.gameStory(GAME_DAY, quick, view), story), () => `${id} ${key}`);
    const saved = S.readGmLastGame(JSON.parse(JSON.stringify(S.makeGmLastGame(quick, 'w'))), isClub);
    count(s5.reload, saved !== null && same(D.gameStory(GAME_DAY, saved, view), story), () => `${id} ${key}`);
    count(s2.story, story !== null, () => `${id} ${key}: no story for ${quick.homeScore}-${quick.awayScore}`);
    if (story) {
      const probs = storyProblems(story, quick, view);
      count(s2.adds, probs.length === 0, () => `${id} ${key} (${quick.homeScore}-${quick.awayScore}): ${probs[0]}`);
      shapes[story.shape] = (shapes[story.shape] ?? 0) + 1;
    }
    /* section 3: the told final, and the same law left free at the same chance on a stream of its own */
    const add = (o, home, away) => {
      const lo = Math.min(home, away);
      o.games += 1;
      o.points += home + away;
      if (lo <= 15) o.losers15 += 1;
      if (lo === 0) o.shutouts += 1;
      o.forty += (home >= 40 ? 1 : 0) + (away >= 40 ? 1 : 0);
    };
    add(told, quick.homeScore, quick.awayScore);
    const [fh, fa] = LAW.score(pHome, M.keyedRng(`free|${key}`));
    add(free, fh, fa);
    const how = S.decidedScore(LAW, f.decided, key);
    const cell = tries[decile(pHome)];
    cell.n += 1;
    cell.tries += how ? how.tries : 0;
    if (how && how.swapped) { cell.swapped += 1; told.swapped += 1; }
  };

  for (const kind of FLEET.kinds) {
    for (let i = 0; i < FLEET.perKind; i += 1) {
      const id = seasonId(set, kind, i);
      /* A: the season as the engine plays it, nothing told */
      const winnersA = [];
      const A = playRegularSeason(M, set, kind, i, g => { winnersA.push(g.winner); });
      const regular = { state: A.gen.state, calls: A.calls, records: recordsOf(A.lg.teams), teams: JSON.stringify(A.lg.teams) };
      const rowA = enginePostseason(M, A);
      lines.push(JSON.stringify({ id, user: A.user, ...rowA }));
      if (rowA.games[12].split('|')[5] === rowA.games[12].split('|')[1]) afcTitles += 1;
      const seeds = rowA.seeds.split(',');

      /* section 4: the machine on the same league and the same generator, all at once and a round a press */
      for (const mode of ['all', 'weeks']) {
        A.gen.state = regular.state;
        const teams = JSON.parse(regular.teams);
        const { value: row } = withMathRandom(A.gen, () => {
          let save = B.openBracket(FORMAT, A.lg.season, seeds);
          if (mode === 'all') save = B.playBracketAll(FORMAT, save, engineTie(teams));
          else {
            for (let press = 0; press < 4; press += 1) {
              const next = B.playBracketWeek(FORMAT, save, engineTie(teams));
              const back = JSON.parse(JSON.stringify(next));
              count(s4.json, same(back, next) && B.isGmBracketSave(back, isClub), id);
              count(s4.sound, B.bracketProblems(FORMAT, back, isClub).length === 0, () => `${id} after press ${press + 1}: ${B.bracketProblems(FORMAT, back, isClub)[0]}`);
              save = back;
            }
          }
          const next = Array.from({ length: NEXT_DRAWS }, () => Math.random());
          return { save, row: machineRow(save, teams, next) };
        });
        count(mode === 'all' ? s4.all : s4.weeks, same(row.row, rowA), () => `${id}: ${row.row.games.find((g, k) => g !== rowA.games[k]) ?? `champion ${row.row.champion} against ${rowA.champion}, or the draws or records after`}`);
        if (mode === 'all') {
          /* three doctored saves, each of which the replay must name */
          const flip = JSON.parse(JSON.stringify(row.save));
          const g0 = flip.played[0];
          g0.games[0].winner = g0.games[0].winner === g0.home ? g0.away : g0.home;
          count(s4.dWinner, B.bracketProblems(FORMAT, flip, isClub).length > 0, id);
          const swap = JSON.parse(JSON.stringify(row.save));
          [swap.played[0].away, swap.played[1].away] = [swap.played[1].away, swap.played[0].away];
          count(s4.dPairing, B.bracketProblems(FORMAT, swap, isClub).length > 0, id);
          const turn = JSON.parse(JSON.stringify(row.save));
          turn.played = turn.played.filter(p => p.id !== 'NFC-WC-3');
          count(s4.dTurn, B.bracketProblems(FORMAT, turn, isClub).length > 0, id);
        }
      }

      /* section 4, the mover against the validator: any tie asked for in any order, a game at a time, with a keyed coin
         for a game (nothing of the engine: no draw from Math.random). The validator must find nothing after any game. */
      {
        const pick = M.keyedRng(`any order|${id}`);
        const coin = (home, away) => (pick() < 0.5 ? { homeScore: 24, awayScore: 17, winner: home } : { homeScore: 17, awayScore: 24, winner: away });
        let save = B.openBracket(FORMAT, A.lg.season, seeds);
        let wrong = '';
        for (let ask = 0; ask < 2000 && !wrong && B.bracketChampion(FORMAT, save) === null; ask += 1) {
          const next = B.playBracketGame(FORMAT, save, FORMAT.ties[Math.floor(pick() * FORMAT.ties.length)].id, coin);
          if (next === save) continue;
          save = JSON.parse(JSON.stringify(next));
          wrong = B.bracketProblems(FORMAT, save, isClub)[0] ?? '';
        }
        count(s4.anyOrder, !wrong && B.bracketChampion(FORMAT, save) !== null, () => `${id}: ${wrong || 'the walk did not reach a champion'}`);
      }

      /* B: the same season with every game told the moment the engine has played it (sections 1, 2, 3 and 5) */
      const winnersB = [];
      const told17 = playRegularSeason(M, set, kind, i, (g, pHome, week, lg) => {
        winnersB.push(g.winner);
        tell(id, `${lg.season}|w${week}|${g.home}|${g.away}|${g.homeScore}-${g.awayScore}`, g, pHome, winnersB.length % 2 ? 'home' : 'away');
      });
      count(s5.state, told17.gen.state === regular.state, id);
      count(s5.calls, told17.calls === regular.calls, () => `${id}: ${told17.calls} draws with the games told, ${regular.calls} without`);
      count(s5.winners, winnersB.length === 272 && winnersB.join() === winnersA.join(), id);
      count(s5.records, recordsOf(told17.lg.teams) === regular.records, id);
      /* and a postseason with every game told inside the press: the engine's row again, the generator where the engine leaves it */
      const teamsB = told17.lg.teams;
      const { value: rowB } = withMathRandom(told17.gen, () => {
        const save = B.playBracketAll(FORMAT, B.openBracket(FORMAT, told17.lg.season, seedsOf(E, teamsB)), engineTie(teamsB, (g, tie) => {
          tell(id, `${told17.lg.season}|${tie.round}|${g.home}|${g.away}|${g.homeScore}-${g.awayScore}`, g, E.winProb(teamsB[g.home], teamsB[g.away]), 'home');
        }));
        return machineRow(save, teamsB, Array.from({ length: NEXT_DRAWS }, () => Math.random()));
      });
      count(s5.bracket, same(rowB, rowA), id);

      /* C (Round 1305): the same season the way the BOARD tells it. The bind is called on every game right after the
         engine has played it, and on the thirteen playoff games after the one press postseason has come back, each
         time inside the seeded Math.random (sections 7 and 8). What the bind hands back goes into the log (section 9). */
      const winnersC = [];
      const weeks = Array.from({ length: E.REGULAR_WEEKS }, () => []);
      const C = playRegularSeason(M, set, kind, i, (g, pHome, week, lg) => {
        winnersC.push(g.winner);
        const t = N.nflTell(g, lg.teams, lg.season, N.nflWhere(week));
        seeBind(id, g, t, pHome, `${lg.season}|w${week}|${g.home}|${g.away}|${g.homeScore}-${g.awayScore}`);
        weeks[week - 1].push({ g, t });
      });
      count(s7.state, C.gen.state === regular.state, id);
      count(s7.calls, C.calls === regular.calls, () => `${id}: ${C.calls} draws with the bind telling, ${regular.calls} without`);
      count(s7.winners, winnersC.length === 272 && winnersC.join() === winnersA.join(), id);
      count(s7.records, recordsOf(C.lg.teams) === regular.records, id);
      const post = [];
      const rowC = enginePostseason(M, C, (g, round) => {
        const t = N.nflTell(g, C.lg.teams, C.lg.season, round);
        seeBind(id, g, t, E.winProb(C.lg.teams[g.home], C.lg.teams[g.away]), `${C.lg.season}|${round}|${g.home}|${g.away}|${g.homeScore}-${g.awayScore}`);
        post.push({ g, t, round });
      });
      count(s7.row, same(rowC, rowA) && post.length === 13, () => `${id}: ${rowC.games.find((g, k) => g !== rowA.games[k]) ?? `champion ${rowC.champion} against ${rowA.champion}, or the draws or records after`}`);

      /* section 9: the log of four GM clubs, the best and the worst record of the season and two keyed picks */
      const season = C.lg.season;
      const table = Object.values(C.lg.teams).map(t => t.abbr).sort((a, b) => C.lg.teams[b].wins - C.lg.teams[a].wins || (a < b ? -1 : 1));
      const pick = M.keyedRng(`log clubs|${id}`);
      const four = [table[0], table[table.length - 1]];
      while (four.length < 4) { const c = table[Math.floor(pick() * table.length)]; if (!four.includes(c)) four.push(c); }
      const logsOf = new Map();
      for (const club of four) {
        let log = null;
        let won = 0;
        let lost = 0;
        let wrong = '';
        for (let week = 1; week <= E.REGULAR_WEEKS; week += 1) {
          const mine = weeks[week - 1].find(x => x.g.home === club || x.g.away === club);
          log = L.addToGmGameLog(log, season, mine && mine.t.last ? [mine.t.last] : []);
          /* the club's record by this harness's own count of the ENGINE's winners */
          if (mine) { if (mine.g.winner === club) won += 1; else lost += 1; }
          const r = L.gmLogRecord(log, club, N.nflIsRegular);
          if (!wrong && (r.won !== won || r.lost !== lost || r.lostBeyond !== 0)) wrong = `after week ${week} the log reads ${r.won}-${r.lost}, the club is ${won}-${lost}`;
        }
        count(s9.weekly, !wrong && won === C.lg.teams[club].wins && lost === C.lg.teams[club].losses, () => `${id} ${club}: ${wrong || `the count ${won}-${lost} is not the league's ${C.lg.teams[club].wins}-${C.lg.teams[club].losses}`}`);
        count(s9.order, log !== null && log.games.length === won + lost && won + lost === E.REGULAR_WEEKS && log.games.every((g, k) => g.where === `w${k + 1}`), () => `${id} ${club}: ${log ? log.games.map(g => g.where).join(',') : 'no log'}`);
        /* the one press finish adds exactly his playoff games, in the order they were played, under their rounds' names */
        const mineP = post.filter(x => x.g.home === club || x.g.away === club);
        const full = L.addToGmGameLog(log, season, mineP.map(x => x.t.last));
        logsOf.set(club, { log, full });
        const reg = L.gmLogRecord(full, club, N.nflIsRegular);
        const all = L.gmLogRecord(full, club);
        const wonP = mineP.filter(x => x.g.winner === club).length;
        count(s9.playoff, full !== null && log !== null && full.games.length === log.games.length + mineP.length && reg.won === won && reg.lost === lost && all.won === won + wonP && all.lost === lost + mineP.length - wonP
          && full.games.slice(log.games.length).every((g, k) => g.where === mineP[k].round) && same(L.lastGmGame(full), mineP.length ? mineP[mineP.length - 1].t.last : log.games[log.games.length - 1]),
          () => `${id} ${club}: ${mineP.length} playoff games, the log grew by ${full && log ? full.games.length - log.games.length : 'nothing'}`);
        if (!full || !log) continue; /* only a control gets here: the checks above are already red */
        /* through JSON and the reader it is the same log; it is nobody else's and no other season's */
        const text = JSON.stringify(full);
        const back = L.readGmGameLog(JSON.parse(text), isClub, season, club);
        count(s9.json, back !== null && same(back, full), () => `${id} ${club}`);
        /* section 10: every game of the log tells. The entries as a board reads them back (through JSON and the
           reader), each from both sides, by section 2's own checker: the tile and the clock tell a game from the
           log and from nothing else. */
        for (const g of (back ?? full).games) {
          for (const side of ['home', 'away']) {
            const st = D.gameStory(GAME_DAY, g, side);
            count(s10.story, st !== null, () => `${id} ${club} ${g.where} (${side}): no story for ${g.homeScore}-${g.awayScore}`);
            if (st) { const probs = storyProblems(st, g, side); count(s10.adds, probs.length === 0, () => `${id} ${club} ${g.where} (${side}, ${g.homeScore}-${g.awayScore}): ${probs[0]}`); }
          }
        }
        const stranger = table.find(c => full.games.some(g => g.home !== c && g.away !== c));
        count(s9.other, L.readGmGameLog(JSON.parse(text), isClub, season + 1, club) === null && L.readGmGameLog(JSON.parse(text), isClub, season, stranger) === null && L.readGmGameLog(JSON.parse(text), isClub, season, 'constructor') === null, () => `${id} ${club}`);
        if (club !== four[0]) continue;
        /* every field of the first, a middle and the last entry, damaged and then missing: the log reads as absent, and nothing throws */
        for (const at of [0, Math.floor(full.games.length / 2), full.games.length - 1]) {
          for (const field of [...Object.keys(ENTRY_DAMAGE), 'winner']) {
            for (const how of ['damaged', 'missing']) {
              const hurt = JSON.parse(text);
              const e = hurt.games[at];
              if (how === 'missing') delete e[field];
              else e[field] = field === 'winner' ? (e.winner === e.home ? e.away : e.home) : ENTRY_DAMAGE[field];
              let read = 'threw';
              try { read = L.readGmGameLog(hurt, isClub, season, club); } catch { /* counted as a failure below */ }
              count(s9.damage, read === null, () => `${id} ${club}: entry ${at} with ${field} ${how} was read`);
            }
          }
        }
        /* a save from before this round adopts the log in the middle of a season: it starts at week k, and its record is
           NOT the league's (no screen may print it as his season) */
        const k = 2 + Math.floor(pick() * (E.REGULAR_WEEKS - 1));
        let late = null;
        for (let week = k; week <= E.REGULAR_WEEKS; week += 1) {
          const mine = weeks[week - 1].find(x => x.g.home === club || x.g.away === club);
          late = L.addToGmGameLog(late, season, mine && mine.t.last ? [mine.t.last] : []);
        }
        const lr = L.gmLogRecord(late, club, N.nflIsRegular);
        count(s9.late, late !== null && late.games.length === E.REGULAR_WEEKS - k + 1 && late.games.every((g, j) => g.where === `w${k + j}`) && lr.won + lr.lost === late.games.length && lr.won + lr.lost < won + lost
          && same(L.readGmGameLog(JSON.parse(JSON.stringify(late)), isClub, season, club), late), () => `${id} ${club}: begun at week ${k}`);
        if (!lateSeen && late) lateSeen = `${id} ${club}: a log begun at week ${k} holds ${late.games.length} games and reads ${lr.won}-${lr.lost}, where the league's record is ${won}-${lost}`;
      }
      /* Round 1308, sections 11 to 13: the postseason played a round at a time through the NFL's bind (nflPlayTie and its
         sink), against the one press path the board takes today: the engine's own run, each game told under its round's
         name. Both from the end of Week 17 with the same generator, installed AS Math.random. */
      {
        A.gen.state = regular.state;
        const teamsE = JSON.parse(regular.teams);
        const { value: eng, calls: engCalls } = withMathRandom(A.gen, () => {
          const r = E.runPlayoffs(teamsE, Math.random);
          return { ...r, next: sha1(Array.from({ length: NEXT_DRAWS }, () => Math.random()).join(',')) };
        });
        const onePress = eng.rounds.map(r => ({ name: r.name, told: r.games.map(g => N.nflTell(g, teamsE, A.lg.season, r.name)) }));
        const toldRounds = onePress.map(r => ({ name: r.name, games: r.told.map(t => t.game) }));
        const oneLasts = onePress.flatMap(r => r.told.map(t => t.last));
        /* the recorded fixture's games: the bracket path tells other scores, never other games */
        const fixGames = rowA.games.map(s => s.split('|'));
        const bare = fixGames.map(([round, home, away, , , winner]) => `${round}|${home}|${away}|${winner}`);
        /* each fixture game told by the bind under its round's name: what the bracket path must have saved */
        const wantTold = fixGames.map(([round, home, away, hs, as, winner]) => N.nflTell({ week: 0, home, away, homeScore: Number(hs), awayScore: Number(as), winner }, teamsE, A.lg.season, round).game);
        const paths = {};
        for (const mode of ['weeks', 'all']) {
          A.gen.state = regular.state;
          const teams = JSON.parse(regular.teams);
          const sink = [];
          const added = [];
          const { value: run, calls } = withMathRandom(A.gen, () => {
            const play = NP.nflPlayTie(teams, Math.random, A.lg.season, undefined, sink);
            let save = B.openBracket(FORMAT, A.lg.season, NP.NFL_POSTSEASON.seeds({ ...A.lg, teams }));
            if (mode === 'all') save = B.playBracketAll(FORMAT, save, play);
            else for (let press = 0; press < 4; press += 1) { const from = sink.length; save = JSON.parse(JSON.stringify(B.playBracketWeek(FORMAT, save, play))); added.push({ save, games: sink.slice(from) }); }
            return { save, next: sha1(Array.from({ length: NEXT_DRAWS }, () => Math.random()).join(',')) };
          });
          paths[mode] = { save: run.save, sink, added, teams };
          const rounds = B.bracketRounds(FORMAT, run.save);
          const games = rounds.flatMap(r => r.games.map(g => `${r.name}|${g.home}|${g.away}|${g.winner}`));
          const champ = B.bracketChampion(FORMAT, run.save);
          count(s11[mode], same(games, bare) && champ === rowA.champion && run.next === rowA.next && calls === engCalls,
            () => `${id} (${mode}): ${games.find((g, k) => g !== bare[k]) ?? `champion ${champ} against ${rowA.champion}, or the next draws, or ${calls} draws against the engine's ${engCalls}`}`);
          count(s11.records, sha1(recordsOf(teams)) === rowA.records && recordsOf(teams) === regular.records, () => `${id} (${mode}): the records after the bracket are not the regular season's`);
          const toldNow = rounds.flatMap(r => r.games);
          const bad = toldNow.findIndex((g, k) => !wantTold[k] || g.homeScore !== wantTold[k].homeScore || g.awayScore !== wantTold[k].awayScore || g.winner !== wantTold[k].winner);
          count(s11.told, toldNow.length === 13 && bad === -1, () => `${id} (${mode}): game ${bad + 1} saved ${toldNow[bad] ? `${toldNow[bad].homeScore}-${toldNow[bad].awayScore}` : 'nothing'}, nflTell ${wantTold[bad] ? `${wantTold[bad].homeScore}-${wantTold[bad].awayScore}` : 'nothing'}`);
          count(s11.rounds, same(NP.nflRoundsOf(FORMAT, run.save), toldRounds), () => `${id} (${mode})`);
          /* section 13, the whole sink: every game in play order as the one press path's log entry, keys included */
          count(s13.sink, sink.length === 13 && same(sink, oneLasts), () => `${id} (${mode}): ${sink.length} entries; the first that differs: ${JSON.stringify(sink.find((x, k) => !same(x, oneLasts[k])) ?? null)}`);
        }

        /* section 12: the load, for the first season of each league kind, at every stop of the bracket */
        if (i === 0) {
          const league = { ...A.lg, teams: paths.weeks.teams, week: E.REGULAR_WEEKS + 1 };
          const fresh = NP.NFL_POSTSEASON.seeds(league);
          const load = (block, inPost = true) => P.loadGmPostseason(NP.NFL_POSTSEASON, league, A.lg.season, inPost, block);
          const coin = (home, away, tie) => (M.keyedRng(`rebuilt|${id}|${tie.id}`)() < 0.5 ? { homeScore: 24, awayScore: 17, winner: home } : { homeScore: 17, awayScore: 24, winner: away });
          const stops = [B.openBracket(FORMAT, A.lg.season, seeds), ...paths.weeks.added.map(a => a.save)];
          stops.forEach((stop, k) => {
            const text = JSON.stringify(stop);
            const back = JSON.parse(text);
            const r = load(back);
            count(s12.sound, !!r && r.kind === 'bracket' && r.format === FORMAT && r.repair.save === back && r.repair.rebuilt === null && r.repair.line === null, () => `${id} stop ${k}: ${r ? (r.kind === 'refused' ? r.refused : r.repair.rebuilt) : 'null'}`);
            count(s12.outside, [JSON.parse(text), undefined, null, { v: 2 }, 'x'].every(b => load(b, false) === null), () => `${id} stop ${k}`);
            const damaged = [];
            const doc = () => JSON.parse(text);
            if (stop.played.length >= 1) { const d = doc(); const g0 = d.played[0]; g0.games[0].winner = g0.games[0].winner === g0.home ? g0.away : g0.home; damaged.push(['a doctored winner', d, 'seeds']); }
            if (stop.played.length >= 2) { const d = doc(); [d.played[0].away, d.played[1].away] = [d.played[1].away, d.played[0].away]; damaged.push(['a doctored pairing', d, 'seeds']); }
            if (stop.played.some(p => FORMAT.ties.find(t => t.id === p.id).week >= 2)) { const d = doc(); d.played = d.played.filter(p => p.id !== 'NFC-WC-3'); damaged.push(['a tie out of turn', d, 'seeds']); }
            { const d = doc(); [d.seeds[0], d.seeds[7]] = [d.seeds[7], d.seeds[0]]; damaged.push(['seeds that mix the conferences', d, 'fresh']); }
            { const d = doc(); d.season += 1; damaged.push(['a block of another season', d, 'fresh']); }
            { const d = doc(); d.v = 2; damaged.push(['a block of an unknown version', d, 'fresh']); }
            for (const [what, d, kind] of damaged) {
              s12kinds.add(what);
              const rr = load(JSON.parse(JSON.stringify(d)));
              const want = B.openBracket(FORMAT, A.lg.season, kind === 'seeds' ? d.seeds : fresh);
              const ok = !!rr && rr.kind === 'bracket' && rr.repair.rebuilt === kind && rr.repair.line === B.BRACKET_REBUILT_LINES[kind] && same(rr.repair.save, want);
              count(s12.rebuilt, ok, () => `${id} stop ${k}, ${what}: ${rr ? (rr.kind === 'refused' ? rr.refused : `rebuilt ${rr.repair.rebuilt}`) : 'null'}`);
              if (!ok) continue;
              const done = B.playBracketAll(FORMAT, rr.repair.save, coin);
              count(s12.plays, B.bracketChampion(FORMAT, done) !== null && B.bracketProblems(FORMAT, done, isClub).length === 0, () => `${id} stop ${k}, ${what}`);
            }
          });
        }

        /* section 13: his log through the bracket, a round a press, for the four clubs of section 9 */
        const w = paths.weeks;
        const roundsW = NP.nflRoundsOf(FORMAT, w.save);
        for (const [club, { log, full }] of logsOf) {
          let blog = log;
          let wrong = '';
          let out = -1;
          const bye = seeds[0] === club || seeds[7] === club;
          if (bye) s13seen.bye += 1;
          w.added.forEach((a, k) => {
            const mine = a.games.filter(g => g.home === club || g.away === club);
            if (k === 0 && bye && mine.length > 0) wrong = wrong || `an entry in the week he has the bye`;
            if (out >= 0 && mine.length > 0) wrong = wrong || `an entry in press ${k + 1}, after he went out in press ${out + 1}`;
            if (out < 0 && mine.some(g => g.winner !== club)) { out = k; s13seen.out += 1; }
            blog = L.addToGmGameLog(blog, season, mine);
          });
          count(s13.when, !wrong, () => `${id} ${club}: ${wrong}`);
          count(s13.entries, blog !== null && full !== null && same(blog, full), () => `${id} ${club}: the bracket path's log holds ${blog ? blog.games.length : 0} games, the one press path's ${full ? full.games.length : 0}`);
          const inRounds = roundsW.flatMap(r => r.games).filter(g => g.home === club || g.away === club);
          const wonR = inRounds.filter(g => g.winner === club).length;
          const all = L.gmLogRecord(blog, club);
          const reg = L.gmLogRecord(blog, club, N.nflIsRegular);
          count(s13.record, all.won - reg.won === wonR && all.lost - reg.lost === inRounds.length - wonR, () => `${id} ${club}: the log's playoff record ${all.won - reg.won}-${all.lost - reg.lost}, nflRoundsOf's ${wonR}-${inRounds.length - wonR}`);
        }
        count(s13.records, recordsOf(w.teams) === regular.records, () => `${id}: the records after the last playoff game are not the regular season's`);

        /* sections 11 and 13 WITH THE GM DESK ON (the review of 2026-10-12, its finding F1). Every new franchise opens with
           the desk, and its staff hands his club strength points in the playoffs too: the board's one press path hands
           nflDeskEdges to runPlayoffs and to nflTell, and the bracket path hands the same to nflPlayTie. Desk off, the
           recorded fixture is the reference; desk on, the one press path played right here is. For each of section 9's
           four GM clubs, his club given DESK_EDGE: the postseason from the end of Week 17, the same generator, played the
           one press way and the bracket way (four presses with the save through JSON, and playBracketAll), gives the same
           games, champion, next draws, draw count and records, the same told rounds, the same sink and the same log. */
        for (const [club, { log }] of logsOf) {
          const edges = { [club]: DESK_EDGE };
          A.gen.state = regular.state;
          const teamsD = JSON.parse(regular.teams);
          const { value: one, calls: oneCalls } = withMathRandom(A.gen, () => {
            const r = E.runPlayoffs(teamsD, Math.random, edges);
            return { ...r, next: sha1(Array.from({ length: NEXT_DRAWS }, () => Math.random()).join(',')) };
          });
          const toldD = one.rounds.map(r => ({ name: r.name, told: r.games.map(g => N.nflTell(g, teamsD, A.lg.season, r.name, edges)) }));
          const roundsD = toldD.map(r => ({ name: r.name, games: r.told.map(t => t.game) }));
          const lastsD = toldD.flatMap(r => r.told.map(t => t.last));
          const bareD = one.rounds.flatMap(r => r.games.map(g => `${r.name}|${g.home}|${g.away}|${g.winner}`));
          deskSeen.runs += 1;
          if (seeds.includes(club)) deskSeen.qualified += 1;
          if (bareD.join() !== bare.join()) deskSeen.moved += 1;
          for (const mode of ['weeks', 'all']) {
            A.gen.state = regular.state;
            const teams = JSON.parse(regular.teams);
            const sink = [];
            const presses = [];
            const { value: run, calls } = withMathRandom(A.gen, () => {
              const play = NP.nflPlayTie(teams, Math.random, A.lg.season, edges, sink);
              let save = B.openBracket(FORMAT, A.lg.season, NP.NFL_POSTSEASON.seeds({ ...A.lg, teams }));
              if (mode === 'all') save = B.playBracketAll(FORMAT, save, play);
              else for (let press = 0; press < 4; press += 1) { const from = sink.length; save = JSON.parse(JSON.stringify(B.playBracketWeek(FORMAT, save, play))); presses.push(sink.slice(from)); }
              return { save, next: sha1(Array.from({ length: NEXT_DRAWS }, () => Math.random()).join(',')) };
            });
            const games = B.bracketRounds(FORMAT, run.save).flatMap(r => r.games.map(g => `${r.name}|${g.home}|${g.away}|${g.winner}`));
            const champ = B.bracketChampion(FORMAT, run.save);
            count(s11d.games, same(games, bareD) && champ === one.champion && run.next === one.next && calls === oneCalls && recordsOf(teams) === regular.records && recordsOf(teamsD) === regular.records,
              () => `${id} ${club} +${DESK_EDGE} (${mode}): ${games.find((g, k) => g !== bareD[k]) ?? `champion ${champ} against ${one.champion}, or the next draws, the draw count (${calls} against ${oneCalls}) or the records after`}`);
            count(s11d.rounds, same(NP.nflRoundsOf(FORMAT, run.save), roundsD), () => `${id} ${club} +${DESK_EDGE} (${mode})`);
            count(s13d.sink, sink.length === 13 && same(sink, lastsD), () => `${id} ${club} +${DESK_EDGE} (${mode}): ${sink.length} entries; the first that differs: ${JSON.stringify(sink.find((x, k) => !same(x, lastsD[k])) ?? null)}`);
            if (mode === 'weeks') {
              const mine = g => g.home === club || g.away === club;
              const blog = presses.reduce((l, games) => L.addToGmGameLog(l, season, games.filter(mine)), log);
              const fullD = L.addToGmGameLog(log, season, lastsD.filter(mine));
              count(s13d.entries, blog !== null && fullD !== null && same(blog, fullD), () => `${id} ${club} +${DESK_EDGE}: the bracket path's log holds ${blog ? blog.games.length : 0} games, the one press path's ${fullD ? fullD.games.length : 0}`);
            }
          }
        }
      }
    }
  }

  /* ─── This seed set's verdicts ─── */
  settle(1, `set ${set}: the law never refuses a game of the fleet`, s1.refused);
  settle(1, `set ${set}: a told final is never level`, s1.level);
  settle(1, `set ${set}: a told final never names another winner than the engine's`, s1.winner);
  settle(1, `set ${set}: the told path tells the quick path's final`, s1.paths);
  settle(1, `set ${set}: no told final of the fleet has a side above the sport's own top score`, s1.top);
  const swappedShare = told.games ? told.swapped / told.games : 1;
  check(1, `set ${set}: the swapped share ${swappedShare.toFixed(5)} is under ${SWAPPED_MOST}`, swappedShare < SWAPPED_MOST);
  settle(2, `set ${set}: every told final has a story`, s2.story);
  settle(2, `set ${set}: every story adds up by the independent checker`, s2.adds);
  const games = FLEET.kinds.length * FLEET.perKind * (272 + 13);
  check(3, `set ${set}: every game of the fleet was told and measured (${told.games} of ${games})`, told.games === games && free.games === games);
  const stat = o => ({ points: o.points / (2 * o.games), losers15: o.losers15 / o.games, shutouts: o.shutouts / o.games, forty: o.forty / (2 * o.games) });
  const T = stat(told);
  const F = stat(free);
  for (const k of Object.keys(BANDS)) check(3, `set ${set}: ${k} told ${T[k].toFixed(4)} against the free law's ${F[k].toFixed(4)}, inside ${BANDS[k]}`, Math.abs(T[k] - F[k]) < BANDS[k]);
  settle(4, `set ${set}: playBracketAll gives the engine's thirteen games, champion, next ${NEXT_DRAWS} draws and records`, s4.all);
  settle(4, `set ${set}: four presses of playBracketWeek, the save through JSON between them, give the same`, s4.weeks);
  settle(4, `set ${set}: a save survives JSON after every press`, s4.json);
  settle(4, `set ${set}: bracketProblems finds nothing in a bracket the machine played`, s4.sound);
  settle(4, `set ${set}: bracketProblems names a doctored winner`, s4.dWinner);
  settle(4, `set ${set}: bracketProblems names a doctored pairing`, s4.dPairing);
  settle(4, `set ${set}: bracketProblems names a tie played out of turn`, s4.dTurn);
  settle(4, `set ${set}: asked for any tie in any order, a game at a time, the mover makes a save in which bracketProblems finds nothing after any game`, s4.anyOrder);
  const rec = fixture.sets[set];
  const recorded = !!rec && rec.seasons === lines.length && rec.digest === sha1(lines.join('\n'));
  check(4, `set ${set}: the engine's postseason over the set is the recorded one (scripts/data/gmBracketFixture.json)`, recorded,
    recorded ? '' : rec ? `digest ${sha1(lines.join('\n')).slice(0, 12)} against the recorded ${String(rec.digest).slice(0, 12)}; the first kept season that differs: ${(rec.kept.find(k => !lines.includes(JSON.stringify(k))) ?? { id: 'none of the kept ones' }).id}; ${await fixtureFiles()}. If the change is meant, record again in the same commit: node scripts/recordGmBracketFixture.mjs` : 'the fixture has no such set');
  check(4, `set ${set}: the fixture's kept seasons are played to the letter`, !!rec && rec.kept.length === 6 && rec.kept.every(k => lines.includes(JSON.stringify(k))));
  settle(5, `set ${set}: telling a season leaves the engine's generator where it was`, s5.state);
  settle(5, `set ${set}: telling a season takes no draw from Math.random`, s5.calls);
  settle(5, `set ${set}: telling a season moves none of its 272 winners`, s5.winners);
  settle(5, `set ${set}: telling a season moves none of its 32 records`, s5.records);
  settle(5, `set ${set}: a postseason told inside the press is the engine's postseason, draw for draw`, s5.bracket);
  settle(5, `set ${set}: the same key tells the same final and the same story twice`, s5.twice);
  settle(5, `set ${set}: the saved last game, through JSON, tells the same story`, s5.reload);
  /* Round 1305, sections 7 to 9 */
  settle(7, `set ${set}: telling a season with the bind leaves the engine's generator where it was`, s7.state);
  settle(7, `set ${set}: telling a season with the bind takes no draw from Math.random`, s7.calls);
  settle(7, `set ${set}: telling a season with the bind moves none of its 272 winners`, s7.winners);
  settle(7, `set ${set}: telling a season with the bind moves none of its 32 records`, s7.records);
  settle(7, `set ${set}: the one press postseason, told by the bind after it, is the engine's thirteen games, champion, next ${NEXT_DRAWS} draws and records`, s7.row);
  const differShare = bound.games ? bound.differ / bound.games : 0;
  check(7, `set ${set}: the told scores do differ from the engine's own: the share ${differShare.toFixed(4)} is above ${DIFFER_LEAST}`, differShare > DIFFER_LEAST);
  settle(8, `set ${set}: the bind never refuses a game of the fleet`, s8.refused);
  settle(8, `set ${set}: the bind tells the quick path's final for the chance the engine played the game at, under the board's key`, s8.quick);
  check(8, `set ${set}: every game of the fleet was told by the bind (${bound.games} of ${games})`, bound.games === games);
  const Bn = stat(bound);
  for (const k of Object.keys(BANDS)) check(8, `set ${set}: ${k} by the bind ${Bn[k].toFixed(4)} against the free law's ${F[k].toFixed(4)}, inside ${BANDS[k]}`, Math.abs(Bn[k] - F[k]) < BANDS[k]);
  /* the same key and the same chance tell the same final, so the bind's four numbers are section 3's told ones exactly */
  check(8, `set ${set}: the bind's four statistics are the quick path's own to the digit (points ${Bn.points.toFixed(4)}, losers on 15 or fewer ${Bn.losers15.toFixed(4)}, shutouts ${Bn.shutouts.toFixed(4)}, forty ${Bn.forty.toFixed(4)})`, same(Bn, T));
  settle(9, `set ${set}: after every week the log's record is the club's, and after Week 17 the league's`, s9.weekly);
  settle(9, `set ${set}: the log holds one entry a week, in week order`, s9.order);
  settle(9, `set ${set}: the one press finish adds exactly his playoff games, in order, and the regular season's record does not move`, s9.playoff);
  settle(9, `set ${set}: the log through JSON and the reader is the same log`, s9.json);
  settle(9, `set ${set}: the log reads as absent for another season, for another club and for a club that is no club`, s9.other);
  settle(9, `set ${set}: with any one field of an entry damaged the log reads as absent, and nothing throws`, s9.damage);
  settle(9, `set ${set}: a log begun at week k holds one entry a week from k on and none before, and its record is not the league's`, s9.late);
  settle(10, `set ${set}: every game of the log tells a story, from both sides`, s10.story);
  settle(10, `set ${set}: every game of the log tells a story that the same checker adds up, from both sides`, s10.adds);
  /* Round 1308 */
  settle(11, `set ${set}: four presses of playBracketWeek with nflPlayTie, the save through JSON between them, give the fixture's thirteen games (home, away, winner, in order), champion, next ${NEXT_DRAWS} draws and draw count`, s11.weeks);
  settle(11, `set ${set}: playBracketAll with nflPlayTie gives the same`, s11.all);
  settle(11, `set ${set}: the bracket path leaves the 32 records the regular season's`, s11.records);
  settle(11, `set ${set}: each told score is nflTell's on the fixture's own engine game, under the same key`, s11.told);
  settle(11, `set ${set}: nflRoundsOf is runPlayoffs' rounds told the one press way, name for name and game for game`, s11.rounds);
  settle(12, `set ${set}: a sound block through JSON comes back as it is, at every stop of the bracket`, s12.sound);
  settle(12, `set ${set}: outside the postseason the load is null, whatever the block`, s12.outside);
  settle(12, `set ${set}: a doctored winner, a doctored pairing, a tie out of turn, seeds that mix the conferences, a block of another season and one of an unknown version are each rebuilt unplayed with the feed line`, s12.rebuilt);
  settle(12, `set ${set}: every rebuilt bracket plays to a champion the validator finds nothing in`, s12.plays);
  check(12, `set ${set}: every damage of the section was made (${s12kinds.size} of 6)`, s12kinds.size === 6);
  settle(13, `set ${set}: the sink holds every game in play order as the one press path's log entry, keys included`, s13.sink);
  settle(13, `set ${set}: no log entry in a week he has the bye, and none after he is out`, s13.when);
  settle(13, `set ${set}: his playoff entries on the bracket path deep equal the one press path's, keys included`, s13.entries);
  settle(13, `set ${set}: his playoff record in the log is his record in nflRoundsOf`, s13.record);
  settle(13, `set ${set}: after the last playoff game the 32 records are the regular season's`, s13.records);
  check(13, `set ${set}: the four clubs a season took a bye (${s13seen.bye}) and went out (${s13seen.out}) somewhere in the set`, s13seen.bye > 0 && s13seen.out > 0);
  /* with the GM desk on (the review of 2026-10-12): the one press path played with the edges is the reference */
  settle(11, `set ${set}: with the desk on (his club +${DESK_EDGE}), four presses and playBracketAll with nflPlayTie give the one press path's thirteen games, champion, next ${NEXT_DRAWS} draws, draw count and records`, s11d.games);
  settle(11, `set ${set}: with the desk on, nflRoundsOf is runPlayoffs' rounds told with the edges, name for name and game for game`, s11d.rounds);
  check(11, `set ${set}: the desk's edge moved the one press postseason in ${deskSeen.moved} of ${deskSeen.runs} club seasons (${deskSeen.qualified} of them in the bracket), so the desk on checks hold something`, deskSeen.moved > 0);
  settle(13, `set ${set}: with the desk on, the sink holds every game in play order as the one press path's log entry, keys included`, s13d.sink);
  settle(13, `set ${set}: with the desk on, his playoff entries on the bracket path deep equal the one press path's, keys included`, s13d.entries);
  console.log(`set ${set}, the bracket a round a press: ${s11.weeks.n} seasons; club seasons of section 13 with a bye ${s13seen.bye}, that went out ${s13seen.out}; stops loaded ${s12.sound.n}, damaged blocks rebuilt ${s12.rebuilt.n}; desk on: ${deskSeen.runs} club seasons, ${deskSeen.qualified} in the bracket, the edge moved the postseason in ${deskSeen.moved}`);
  console.log(`set ${set}, the board's way: ${bound.games} games told by the bind; told scores that are not the engine's ${differShare.toFixed(4)}; refused ${s8.refused.bad}; points a team game ${Bn.points.toFixed(2)}, losers on 15 or fewer ${Bn.losers15.toFixed(4)}, shutouts ${Bn.shutouts.toFixed(4)}, sides on 40 or more ${Bn.forty.toFixed(4)}; ${lateSeen}`);
  const afcShare = afcTitles / lines.length;
  measured.push({ set, T, F, swappedShare, tries, shapes, afcShare, games: told.games, differShare, refused: s8.refused.bad });
  console.log(`set ${set}: ${lines.length} seasons, ${told.games} games told in ${Date.now() - t1} ms; points a team game ${T.points.toFixed(2)} (free ${F.points.toFixed(2)}); losers on 15 or fewer ${T.losers15.toFixed(4)} (free ${F.losers15.toFixed(4)}); shutouts ${T.shutouts.toFixed(4)} (free ${F.shutouts.toFixed(4)}); sides on 40 or more ${T.forty.toFixed(4)} (free ${F.forty.toFixed(4)}); swapped ${swappedShare.toFixed(5)}; the AFC champion won ${afcTitles} of ${lines.length} title games`);
}

/* ─── Section 4, the data's structure (once) ─── */
{
  const ties = FORMAT.ties;
  const weeks = [...new Set(ties.map(t => t.week))].sort((a, b) => a - b);
  check(4, 'the NFL bracket is thirteen ties over four weeks for fourteen seeds', ties.length === 13 && same(weeks, [1, 2, 3, 4]) && FORMAT.qualifiers === 14);
  check(4, 'one tie decides it and it is the last one', M.finalTie(ties)?.id === ties[12].id && ties.filter(t => t.week === 4).length === 1);
  const inWeek1 = new Set(ties.filter(t => t.week === 1).flatMap(t => [t.home, t.away]).map(s => s.seed));
  const byes = B.bracketByes(FORMAT);
  check(4, 'every seed plays in the first week or has the bye, and the byes are the two top seeds', same(byes, [1, 8]) && Array.from({ length: 14 }, (_, k) => k + 1).every(n => inWeek1.has(n) !== byes.includes(n)));
  const rounds = [...new Set(ties.map(t => t.round))];
  check(4, 'the rounds are the seven the engine names, in its order', same(rounds, ['AFC Wild Card', 'NFC Wild Card', 'AFC Divisional', 'NFC Divisional', 'AFC Championship', 'NFC Championship', 'Super Bowl']));
  check(4, 'every tie is one game', ties.every(t => (FORMAT.winsNeeded[t.week] ?? 1) === 1));
}

/* ─── Section 5, the source: no Math.random, no Date, no localStorage in the round's new files ─── */
{
  const FORBIDDEN = [['Math.random', /Math\s*\.\s*random/], ['Date', /\bDate\b/], ['localStorage', /localStorage/]];
  let seen = 0;
  for (const rel of NEW_FILES) {
    const raw = readPatched(rel);
    const code = stripComments(raw);
    /* the stripper really stripped: the header's own words are gone, the code is still there */
    const mark = ROUND_OF[rel] ?? 'Round 1224';
    check(5, `${rel}: comments are stripped before it is read`, raw.includes(mark) && !code.includes(mark) && code.includes('export '));
    for (const [name, re] of FORBIDDEN) { seen += 1; check(5, `${rel} holds no ${name}`, !re.test(code)); }
  }
  check(5, 'the source scan looked at every new file', seen === NEW_FILES.length * FORBIDDEN.length);
}

/* ─── Section 5, the ceiling (once): one damaged number in a save never reaches a story law ─── */
{
  const [a, b] = [...CLUBS];
  /* the numbers are typed here, not read off the library: a control that moves the library's ceiling must not move them */
  const AT = 999;
  const OVER = [1000, 250000, 1e21];
  const last = n => JSON.parse(JSON.stringify({ v: 1, key: 'ceiling', where: 'w1', home: a, away: b, homeScore: n, awayScore: 17, winner: a }));
  const tie = n => JSON.parse(JSON.stringify({ v: 1, format: FORMAT.id, season: 2026, seeds: [a, b], played: [{ id: 'x', home: a, away: b, games: [{ homeScore: n, awayScore: 17, winner: a }] }] }));
  const told = n => ({ key: 'ceiling', home: a, away: b, homeScore: n, awayScore: 17 });
  check(5, `the library's ceiling is ${AT} and the save guards read a score of ${AT}`, S.GM_SCORE_CEILING === AT && S.readGmLastGame(last(AT), isClub) !== null && B.isGmBracketSave(tie(AT), isClub) === true);
  const read = OVER.filter(n => S.readGmLastGame(last(n), isClub) !== null || B.isGmBracketSave(tie(n), isClub) !== false);
  check(5, `the save guards refuse a score above the ceiling (a saved last game and a saved bracket game on ${OVER.join(', ')})`, read.length === 0, `read: ${read.join(', ')}`);
  /* a sport that claims no top score of its own: the library's ceiling alone must keep the law from being asked */
  let asked = 0;
  const anything = { ...GAME_DAY, maxScore: Number.POSITIVE_INFINITY, story: { ...GAME_DAY.story, events: (h, w, rng) => { asked += 1; return GAME_DAY.story.events(h, w, rng); } } };
  const toldOver = OVER.filter(n => D.gameStory(anything, told(n), 'home') !== null);
  check(5, `a final above the ceiling is told nothing and its law is never asked (${OVER.join(', ')})`, toldOver.length === 0 && asked === 0, `told: ${toldOver.join(', ') || 'none'}; the law was asked ${asked} times`);
  const top = nflDay.NFL_MAX_SCORE;
  check(5, `the NFL tells a final of ${top} to 17 and tells no final above the sport's own top score`, D.gameStory(GAME_DAY, told(top), 'home') !== null && D.gameStory(GAME_DAY, told(top + 1), 'home') === null && D.gameStory(GAME_DAY, { ...told(17), awayScore: top + 1 }, 'away') === null);
}

/* ─── Section 6: the mount list (rewritten in Round 1305, as the first board comes to import a module) ─── */
{
  const ts = (await import('typescript')).default;
  const noExt = f => f.replace(/\.tsx?$/, '');
  const TARGETS = new Set(NEW_FILES.map(noExt));
  /* WHO MAY IMPORT WHICH OF THE MODULES. '*': any of them (the modules themselves and their tests). A set: those
     targets and no other. A file that is not here may import none. A round that mounts a card adds its files here,
     in the commit that first imports them. */
  const MOUNT_ALLOW = new Map([
    ...NEW_FILES.map(f => [f, '*']),
    ...['src/lib/gmGameScore.test.ts', 'src/lib/gmGameDay.test.ts', 'src/lib/gmBracket.test.ts', 'src/lib/gmGameLog.test.ts', 'src/lib/frontOfficeGameDay.test.ts', 'src/lib/gmGameDayView.test.ts', 'src/components/front-office-shared/GmGameDayCard.test.tsx',
      'src/lib/gmPostseason.test.ts', 'src/lib/frontOfficePostseason.test.ts', 'src/test/gmBracketLedger.test.ts',
      'src/lib/gmBracketView.test.ts', 'src/components/front-office-shared/GmBracketCard.test.tsx'].map(f => [f, '*']),
    /* Round 1305, the press: the NFL board tells scores and keeps the log. The bind and the log, and nothing else. */
    [NFL_BOARD, new Set([noExt(BIND), noExt(LOG), noExt(NFL_CARD)])],
    /* Round 1307, the tile: the board reaches the bound card (through a lazy import: the check below) and nothing
       else of the card's files; its tile test reads the log, the bind's words and the view lib's own answers */
    ['src/components/front-office/FrontOfficeTile.test.tsx', new Set([noExt(LOG), noExt(BIND), noExt(VIEW), noExt(NFL_DAY), noExt(SCORE)])],
    /* its board tests read the log, the bind's words for a week and the quick path's final */
    ['src/components/front-office/FrontOfficeGameDay.test.tsx', new Set([noExt(LOG), noExt(BIND), noExt(SCORE)])],
    ['src/components/front-office/FrontOfficeOnePress.test.tsx', new Set([noExt(LOG)])],
  ]);
  /* an import's path from the repo root: the alias, or a path from the importing file; a package is nobody's */
  const target = (from, spec) => {
    const s = noExt(spec);
    if (s.startsWith('@/')) return `src/${s.slice(2)}`;
    return s.startsWith('.') ? path.posix.normalize(path.posix.join(path.posix.dirname(from), s)) : '';
  };
  const walk = dir => {
    let list;
    try { list = fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true }); } catch { return []; /* a directory another harness made under src and took away while this one walked */ }
    return list.flatMap(d => (d.isDirectory() ? walk(`${dir}/${d.name}`) : /\.tsx?$/.test(d.name) ? [`${dir}/${d.name}`] : []));
  };
  const files = walk('src');
  for (const must of [ROUTE_FILE, ...BOARDS]) if (!files.includes(must)) { console.error(`simGmGameDay: ${must} is gone, a control of section 6 has nowhere to plant: refusing to report`); process.exit(2); }
  const importers = [];
  let own = 0;
  for (const rel of files) {
    let text;
    try { text = readPatched(rel); } catch { continue; /* a file another harness wrote and took away while this one walked */ }
    const hits = ts.preProcessFile(text, true, true).importedFiles.map(f => target(rel, f.fileName)).filter(t => TARGETS.has(t));
    if (hits.length === 0) continue;
    const may = MOUNT_ALLOW.get(rel);
    if (may === undefined) { importers.push(rel); continue; }
    const beyond = may === '*' ? [] : hits.filter(t => !may.has(t));
    if (beyond.length > 0) importers.push(`${rel} (reaches ${beyond.join(', ')}, which its line of the mount list does not name)`); else own += 1;
  }
  check(6, `no file under src imports the new modules but the files on the mount list, each within its own line of it (${files.length} files read)`, importers.length === 0, importers.slice(0, 5).join(', '));
  /* the scan can see an import at all: the libraries import each other and the tests import them */
  check(6, `the scan sees the modules' own imports (${own} of the ${MOUNT_ALLOW.size} files on the mount list import one)`, own >= 8);
  /* the board really is bound: a mount list that allows an import nobody makes would be holding nothing */
  const boardText = stripComments(readPatched(NFL_BOARD));
  check(6, 'the NFL board imports the bind and the log, and calls nflTell on the week and on the one press postseason',
    /from '@\/lib\/frontOfficeGameDay'/.test(boardText) && /from '@\/lib\/gmGameLog'/.test(boardText) && boardText.split('nflTell(').length - 1 === 2);
  /* NO BOARD READS THE STORY IN ITS OWN CHUNK. A press needs the score law, the bind and the log in the same tick, so
     those are static imports of a board. What only a drawn card reads (the told path, the story law, the game day law
     and the words of the "?") must reach a board through a lazy part or not at all, or a route that is on its weight
     budget pays for a card nobody has opened. Read from the syntax tree: an import DECLARATION that is not type only. */
  const STORY = new Set(STORY_FILES.map(noExt));
  let statics = 0;
  const heavy = [];
  for (const rel of BOARDS) {
    const tree = ts.createSourceFile(rel, readPatched(rel), ts.ScriptTarget.Latest, false, ts.ScriptKind.TSX);
    for (const st of tree.statements) {
      if (!ts.isImportDeclaration(st) || st.importClause?.isTypeOnly) continue;
      statics += 1;
      const t = target(rel, st.moduleSpecifier.text);
      if (STORY.has(t)) heavy.push(`${rel} imports ${t}`);
    }
  }
  check(6, `the four boards import no story law, no game day law and no help words statically (${statics} static imports read)`, heavy.length === 0 && statics >= 40, heavy.join(', ') || `only ${statics} static imports were seen`);
  /* Round 1307: the tile is mounted, and through a lazy import made once at module level (a mount list that allowed a
     card nobody mounts would be holding nothing, and a lazy part made inside a render remounts on every save) */
  const lazyCard = boardText.split(`lazyPart<GmGameDayMount>(() => import('@/components/front-office/NflGameDay'))`).length - 1;
  check(6, 'the NFL board mounts the bound Game Day card through one lazy import, made before the component', lazyCard === 1 && boardText.indexOf('lazyPart<GmGameDayMount>') < boardText.indexOf('export default function FrontOfficeBoard') && /<NflGameDay\b/.test(boardText));
}

/* ─── What was measured, for the header and the notes ─── */
if (measured.length > 0) {
  const span = f => { const xs = measured.map(f); return `${Math.min(...xs).toFixed(4)} to ${Math.max(...xs).toFixed(4)}`; };
  console.log('');
  console.log(`MEASURED over seed sets ${measured.map(m => m.set).join(', ')} (${measured.reduce((a, m) => a + m.games, 0)} games):`);
  for (const k of Object.keys(BANDS)) console.log(`  ${k}: told ${span(m => m.T[k])}, free ${span(m => m.F[k])}, told less free ${span(m => m.T[k] - m.F[k])} (band ${BANDS[k]} either side)`);
  console.log(`  swapped share ${span(m => m.swappedShare)} (band: under ${SWAPPED_MOST})`);
  console.log(`  the board's way (Round 1305): told scores that are not the engine's own ${span(m => m.differShare)} (floor: above ${DIFFER_LEAST}); games the bind refused ${measured.map(m => m.refused).join(', ')} a set (held at zero)`);
  const all = Array.from({ length: 10 }, (_, d) => measured.reduce((a, m) => ({ n: a.n + m.tries[d].n, tries: a.tries + m.tries[d].tries, swapped: a.swapped + m.tries[d].swapped }), { n: 0, tries: 0, swapped: 0 }));
  console.log(`  tries a game by decile of the home chance (games, mean tries, swapped): ${all.map((c, d) => `${d / 10}: ${c.n}, ${c.n ? (c.tries / c.n).toFixed(2) : 'none'}, ${c.swapped}`).join(' | ')}`);
  const shapeAll = {};
  for (const m of measured) for (const [k, v] of Object.entries(m.shapes)) shapeAll[k] = (shapeAll[k] ?? 0) + v;
  const stories = Object.values(shapeAll).reduce((a, b) => a + b, 0);
  console.log(`  shapes of ${stories} stories: ${Object.entries(shapeAll).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${(v / stories).toFixed(3)}`).join(', ')}`);
  console.log(`  the AFC champion's share of title games ${span(m => m.afcShare)} a set (a level title game is ${(1 / (1 + 10 ** (-2 / 14))).toFixed(3)} by the engine's arithmetic; printed, never asserted)`);
}

/* ─── Closing ─── */
const failed = [...failsBy.values()].reduce((a, l) => a + l.length, 0);
console.log('');
if (CONTROL) {
  const c = CONTROLS[CONTROL];
  const red = [...failsBy.keys()].sort();
  const mine = failsBy.get(String(c.section)) ?? [];
  const every = [...failsBy.values()].flat();
  const named = c.labels.filter(l => mine.some(x => x.includes(l)));
  const far = (c.elsewhere ?? []).filter(l => every.some(x => x.includes(l)));
  const dirty = (c.clean ?? []).filter(l => every.some(x => x.includes(l)));
  const ok = mine.length > 0 && named.length === c.labels.length && far.length === (c.elsewhere ?? []).length && dirty.length === 0;
  const which = `its named checks red: ${named.length} of ${c.labels.length} (${c.labels.map(l => `"${l}"`).join(', ')})${c.elsewhere ? `; its named checks of other sections red: ${far.length} of ${c.elsewhere.length} (${c.elsewhere.map(l => `"${l}"`).join(', ')})` : ''}${c.clean ? `; checks that had to stay green and did not: ${dirty.length ? dirty.join(', ') : 'none'}` : ''}`;
  console.log(ok
    ? `control ${CONTROL}: RED AT THE NAMED CHECK (section ${c.section}); ${which}; sections red: ${red.join(', ')}`
    : `control ${CONTROL}: DID NOT FIRE AT ITS NAMED CHECK (section ${c.section}); ${which}; sections red: ${red.join(', ') || 'none'}`);
  console.log(`simGmGameDay: ${checks} checks, ${failed} failed (control ${CONTROL})`);
  process.exit(ok ? 1 : 2);
}
console.log(`simGmGameDay: ${checks} checks, ${failed} failed`);
process.exit(failed ? 1 : 0);
