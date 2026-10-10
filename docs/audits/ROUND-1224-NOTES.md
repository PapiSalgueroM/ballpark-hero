# Round 1224 notes: Game Day and a bracket you play, the shared libraries for the front offices

Branch `r1224-gm-gameday-libs`, base `origin/r1221-nfl-score-law` at `5d6ffbef` (Round 1221, the NFL score law in
`src/lib/gameLaws`). Written by the builder, rewritten after every step. Two adversarial reviews followed (one
major, fifteen minors); the section THE FIX PASS near the foot says what each finding became, and the sections
above it were brought up to date where the fix pass changed a fact.
Nothing a player sees changes in this round: NEW FILES ONLY, and nothing under `src` imports them but their own
tests (section 6 of the harness holds that). No What's New entry, no guide sentence, no screen, no saved page.

## What the round is

The four front offices decide a game with one draw and then make a score up, and their whole postseason is one
press. This round is the second of four (the critic's split): the game day and the bracket as shared, sport
neutral libraries with the NFL as the first law bound. The next round mounts Game Day on the NFL board, the one
after plays the NFL postseason a round a press.

| File | What it holds |
|---|---|
| `src/lib/gmGameScore.ts` | THE QUICK PATH. `decidedScore(law, decided, key)`: a `ScoreLaw`'s final for a game whose winner an engine already decided (24 tries on keyed streams, the first that is not level and has the winner ahead; after 24 misses the first try handed to the winner, `swapped`; null when the law gives nothing usable). `quickGame`, `toldWinner`, the types `GameDayFixture`, `ToldGame` (with the optional mark `beyond`), `ToldScore`. THE CEILING: `GM_SCORE_CEILING` (999) and `isGmScore`, the one definition of a score for everything that reads one. THE SAVE FIELD `GmLastGame` with `makeGmLastGame` and `readGmLastGame` (a press writes it and a save validator reads it, so it lives with the quick path). Imports the keyed stream and types only, so it can sit in a board's chunk. |
| `src/lib/gmGameDay.ts` | THE TOLD PATH, which rides with a card alone. `gameStory(law, told, viewAs)`: the scoring plays, the score by period, the one to three deciding plays, the go ahead among them and the shape of a told final, from one club's side, in the shape the Season Center's match clock is handed. `tellGame` (the quick path's final, then its story). `decidingPlays`. The type `GameDayLaw` (`story`, `maxScore`, `periods`, `shape`, and for a sport with an extra period `storyBeyond` and `periods.regulation`). |
| `src/lib/gameLaws/nflGameDay.ts` | What the NFL hands Game Day on top of its story law: four quarters, `NFL_MAX_SCORE` (73: ten drives of seven and the three a level game adds), `NFL_ROUT` 21, `NFL_COMEBACK` 10, `nflShapeWords`, `NFL_GAME_DAY`, and the "?" (`NFL_GAME_DAY_HELP`, a `HelpWords`). |
| `src/lib/gmBracket.ts` | A postseason as a saved state machine over `src/lib/finalsBracket.ts` (not edited): `BracketFormat`, `GmBracketSave`, `openBracket`, `playBracketGame`, `playBracketWeek`, `playBracketAll`, `bracketWeek`, `bracketPairings`, `bracketOutcomes`, `bracketChampion`, `bracketOut`, `bracketByes`, `bracketRounds`, and the guard, the replay check and the repair: `isGmBracketSave`, `bracketProblems`, `repairGmBracket`, `BRACKET_REBUILT_LINES`. |
| `src/data/gmBrackets/nfl.ts` | The NFL postseason as data (`NFL_BRACKET`, id `nfl-14`), the seasons it is true for, its sources, `nflBracketFor`, `NFL_TITLE_GAME_LEAN`. What a press and a save validator need. |
| `src/data/gmBrackets/nflHelp.ts` | The words of the bracket's "?" (`NFL_BRACKET_HELP`), apart from the data so only a drawn card loads them. |
| `src/lib/gmGameScore.test.ts`, `gmGameDay.test.ts`, `gmBracket.test.ts` | 14, 31 and 18 unit tests (11, 22 and 12 before the fix pass). |
| `scripts/simGmGameDay.mjs` | The harness: six sections, nineteen negative controls (twelve before the fix pass). |
| `scripts/lib/gmGameDayFleet.mjs` | The one definition of the fleet the harness walks and the recorder records. |
| `scripts/recordGmBracketFixture.mjs`, `scripts/data/gmBracketFixture.json` | The engine's one press postseason over the fleet, recorded. |

No existing file was edited. `src/lib/frontOffice.ts`, `src/lib/finalsBracket.ts`, `src/lib/gameLaws/types.ts`,
`nfl.ts` and `nflScore.ts` are byte for byte the base's (`git diff --stat origin/r1221-nfl-score-law -- src/lib/frontOffice.ts src/lib/finalsBracket.ts src/lib/gameLaws/types.ts src/lib/gameLaws/nfl.ts src/lib/gameLaws/nflScore.ts` prints nothing).

## The rules the libraries keep

- THE ENGINE DECIDES, THE LAW TELLS. The winner is never moved. Every draw of a score or a story comes from a
  stream keyed to the game (`src/lib/keyedRng.ts`): `${key}|score|${try}` and `${key}|story|${home}-${away}`.
- ONE LAW, TWO PATHS. `tellGame` asks `quickGame` for the final and tells that final, so a watched game and the
  same game only scored cannot differ.
- FAILS CLOSED. A level final, a final with a side above the ceiling (999) or above the sport's own top score
  (the NFL's 73), a final the law has no list for (a side on 1 or 4 in the NFL), a list that does not add up, a
  minute outside the clock, a game marked past regulation in a sport that tells no such game, a law that throws:
  null, and a card shows the final alone. A final above either number is refused BEFORE the law is asked: a
  story law's work grows with the score, and with no ceiling one damaged number in a save threw out of the NFL's
  law (250000) or never came back (1e21).
- TEAM LEVEL ONLY. A line names a club. No man is credited, there is no speaker and no quotation mark.
- THE SAVE BLOCKS ARE OPTIONAL, GUARDED AND REPAIRABLE. `readGmLastGame` answers null for anything that does not
  read as a last game (mark, never fill). `repairGmBracket` hands a sound bracket back untouched and rebuilds
  anything else UNPLAYED, from its own seeds when they still read, else from fresh ones, with one line for the
  feed. A sound save is also shown to the league's own check (`seedsOk`): the block cannot know its seeds are
  the wrong clubs. Neither ever throws on a damaged block (the repair throws only when the caller's own fresh
  seeds do not open a bracket, a bind's bug). Every field is damaged one at a time in the unit tests (48 cases
  for the last game and fifteen scores above the ceiling; 75 for the bracket's outer shape, 13 saves that read
  but do not replay, 11 that cannot keep their seeds).
- THE MOVER AND THE VALIDATOR AGREE. `playBracketGame` plays no tie out of turn (in a format with no order of
  its own, before every tie of an earlier week is settled), because `bracketProblems` names such a save and the
  repair then wipes it. Held by a keyed walk in the unit file (three formats) and in the harness (80 a seed set).

## The facts, and where they are written

`src/data/gmBrackets/nfl.ts` carries them in its header. Read on the web on 2026-10-10:
- The top seed meets the lowest seed left after the Wild Card round: NBC Sports (7 January 2026), Sports
  Illustrated (10 January 2026); also Fox Sports (22 December 2025) and the Rochester Democrat and Chronicle
  (6 January 2025, as carried by Yahoo Sports).
- The better seed hosts every game through the conference championships: NBC Sports and the Democrat and
  Chronicle (both state all three rounds).
- The Super Bowl: NBC Sports calls it a neutral site game, the Democrat and Chronicle a predetermined site. The
  "?" claims only what both support: a site picked beforehand, so neither club hosts it by its seed.
- Fourteen clubs, seven a conference, one bye, 2 v 7, 3 v 6, 4 v 5: already two sourced in
  `src/lib/nflPlayoffFormatHistory.ts` and `src/data/usLeagueShape.ts`; the unit test holds the data to that
  ledger (field size, first season).
- Two CBS Sports pages were read and state none of these; they are not cited.
- THIN, and marked thin in the "?": four quarters of 15 minutes (the ledger's own mark, `NFL_CLOCK`). OWED
  before a card shows the sheet: the read reviewer found the league's own rulebook states it (2026 Official
  Playing Rules, Rule 4, Section 1, Article 1: sixty minutes in four periods of fifteen). The ledger row in
  `src/data/usLeagueShape.ts` is its owner's file, not this round's; once it is completed the sentence becomes
  "Real: four quarters of 15 minutes." and the unit test's demand for the word thin goes with it.
- DATED: the format is the one in use in 2025 (`NFL_BRACKET_SEASONS`), and the "?" says so.
- THIS SIM'S OWN, said in the "?": the title game leans to the AFC champion 58 times in 100 at level strength
  (the engine names it first and gives the first club two points; the unit test holds 58 to `winProb`), the
  seeds are the engine's own standings, nobody heals between rounds, the 21 and the 10 of the shapes.
- NOT DONE: the league's real points a team game, share of low scores and shutouts were not read on two
  sources, so the harness prints none beside its measured numbers.

## The proof

Everything heavy ran on GitHub runners (`origin/rc-results/<name>` holds the logs; read one with
`git show origin/rc-results/<name>:logs/<label>.log | tail -60`). A harness is green on its closing line AND its
exit code; a control is red on its verdict line (`RED AT THE NAMED CHECK`), never on the exit code alone.

### The harness, `node scripts/simGmGameDay.mjs`

THE FLEET (`scripts/lib/gmGameDayFleet.mjs`): seed sets 0 to 4, each 40 seasons on each of the two leagues the
engine makes (fifteen man, and full rosters with the GM's club cut down first), played by the untouched engine
the way the board plays a week (the injury pass, the computer clubs' moves, the week's games). 80 seasons a set:
21,760 season games and 1,040 playoff games, 114,000 games in all. The seeded generator is installed AS
`Math.random` and the engine is handed `Math.random`, as on the board, so a stray draw in anything that runs
between two engine calls moves the engine here as it would on the site.

| Section | What it holds |
|---|---|
| 1 | One law, two paths: for every game, with the chance from the engine's `winProb`, the quick path never names another winner, is never level, never refuses, and the told path tells exactly that final. The swapped share sits under 0.002. |
| 2 | Every story adds up, by a checker written in the harness that calls neither the library's sums nor the law: finals, quarters, what each play is worth by the ledger (6, 7 or 8, 3, 2), whole minutes from 1 to 60 that no two lines share, the deciding plays and the shape by the rule. |
| 3 | The told scores are the law's scores: against a baseline drawn in the same run (the same law, free, at the same chance) four statistics sit inside two sided bands. |
| 4 | The bracket is the engine's postseason: `playBracketAll`, and four presses of `playBracketWeek` with the save through JSON between them, give the engine's thirteen games, champion, next 64 draws and 32 records for every season; the engine's own run is the recorded fixture; the data's structure; a doctored winner, a doctored pairing and a tie played out of turn are each named; and asked for any tie in any order, a game at a time (80 keyed walks a set), the mover never makes a save the validator finds a problem in. |
| 5 | Pure: telling every game of a season right after the engine plays it leaves the engine's generator, its draw count, its 272 winners and its 32 records where they were; a postseason told inside the press is the engine's, draw for draw; the same key tells the same final and story twice, and through the saved last game and JSON; the six new source files hold no `Math.random`, no `Date`, no `localStorage` (comments stripped). And the ceiling: neither save guard reads a score above 999 (1000, 250000 and 1e21 on a saved last game and on a saved bracket game), a final above it is told nothing without the story law being asked, and the NFL tells no final above its own top score. |
| 6 | Nobody mounts it yet: of every `.ts` and `.tsx` under `src`, only the new modules and their three tests import a new module (imports read with the TypeScript scanner, so a comment is never an import). |

The nineteen controls (`GM_GAMEDAY_CONTROL=`), each a string that must be in its file exactly once: `winner`,
`level`, `refuse`, `lowmax`, `twopaths`, `tries` (section 1), `offbyone` (2), `olddraw` (3), `pairing`,
`validator`, `strict`, `outofturn`, `enginedrift` (4), `random`, `stream`, `unkeyed`, `ceiling`, `lawmax` (5),
`mounted` (6). A control is counted as fired only when the checks it NAMES are among the reds (`refuse` and
`lowmax` also name a check of another section); `enginedrift`, `strict` and `outofturn` also need the machine's
two checks to stay green (each is aimed at one fence alone). An unknown control exits 2. The seven added in the
fix pass: `level` (a told final is never level), `refuse` (the law never refuses a game, and every game was
told and measured), `lowmax` (the NFL's top score typed as 30: a told final above it, and stories lost),
`strict` (an over strict validator: a false problem would wipe a real bracket through the repair), `outofturn`
(the mover's refusal taken out: 67 of 80 walks of seed set 0 then make a save the validator condemns),
`ceiling` (the library's ceiling typed as 100000) and `lawmax` (the NFL claims a top score of 999).
WITHOUT A CONTROL OF THEIR OWN, and said so in the harness header: "a save survives JSON after every press",
"the fixture is of this fleet" and the five checks of the data's structure.
NOT HELD BY THE HARNESS AT ALL: the save guards and the repair with every field damaged. The three unit files
hold them, and seven mutations of those rules leave the harness green (the run reviewer's table).

### MEASURED (identical on Linux and on Windows)

Told less free, the range over the five seed sets (22,800 games a set):

| Statistic | Told | Told less free | Standard error of one set's difference | Band |
|---|---|---|---|---|
| points a team game | 22.63 to 22.74 | -0.105 to +0.069 | 0.066 | 0.25 |
| losers on 15 or fewer | 0.423 to 0.434 | -0.0071 to +0.0074 | 0.0046 | 0.02 |
| shutouts | 0.0129 to 0.0150 | -0.0028 to +0.0013 | 0.0011 | 0.005 |
| sides on 40 or more | 0.0510 to 0.0538 | -0.0010 to +0.0033 | 0.0015 | 0.006 |

Each band is about four standard errors and 1.8 to 2.7 times the widest difference seen. Under `olddraw`
(the engine's base and margin score told instead) seed set 0 reads 27.54 against 22.64 points, 0.0000 against
0.4297 losers on 15 or fewer (the critic's correction 4: the loser of the old draw is never under 16), 0.0000
against 0.0148 shutouts and 0.0716 against 0.0517 sides on 40 or more.

- Swapped share: 0.00039 to 0.00066 a set (9 to 15 games in 22,800; 63 of 114,000), 49 of the 63 at a home
  chance of 0.8 or more. Band: under 0.002. With the law asked twice instead of 24 times (`tries`) it is 0.223.
- Tries a game: 2.0 in every decile of the chance (1.93 to 2.14). It is 2 by construction while the law's
  chance is the engine's, so it is printed and never asserted.
- Shapes of the 114,000 stories: trade 0.299, wire 0.218, late 0.170, rout 0.169, comeback 0.144.
- The AFC champion won 38, 46, 47, 43 and 47 of 80 title games a set: 221 of 400, 0.5525. A LEVEL title game is
  0.582 by the engine's arithmetic (1 / (1 + 10^(-2/14))); the fleet's games are not level. Printed, never
  asserted. The engine is not edited; the lean is a finding for the engine's next rules round.
- No story was null over the fleet: no told final had a side on 1 or 4.
- The whole harness takes about 30 s on a runner and 50 s on the owner's PC; one control the same.

### The recorded fixture

`scripts/data/gmBracketFixture.json` (25 KB): a digest a seed set over its 80 seasons and the first three seasons
of each league kind in full (seeds, thirteen games, champion, a hash of the next 64 draws and of the 32
records). The recorder bundles only the engine, so it runs on the commit before the round: recorded on a runner
in a worktree of the base `5d6ffbef` and at the round's head, both files are the committed file byte for byte
(`cmp`), and the committed file was itself written on Windows. The fence is the digest of what is PLAYED: an
edit to the engine file that moves no postseason (a comment, a function no playoff reads) is not a red, and
when the digest does move the harness names the files to look at. Since the fix pass the fixture records, under
`inputs`, the hash of EVERY file it was taken from (eight: the engine, the two roster files, `foNames`,
`leagueCaps`, `entityIds`, `frontOfficeCuts`, by esbuild's own list of what the engine bundle read, and the
fleet), and a red line names the recorded inputs that changed and the files the engine reads today that the
record never saw. So a roster refresh that moves the record is named as one. The file was taken again for that
header only: its five digests, season counts, thirty kept seasons and fleet are equal before and after, field
for field. A change that is MEANT to `runPlayoffs`, to `simGame`, to anything that moves
the fleet's seasons (the schedule, the injury pass, the computer clubs' weekly moves, the rosters), to
`finalsBracket.ts` or to the NFL data must record the fixture again in the same commit
(`node scripts/recordGmBracketFixture.mjs`) and say why.

(The first version of the harness, the one the runner results `r1224-s2` to `r1224-f6` below ran, also failed
two checks of its own when either file's hash had moved at all. They were taken out as the last change of the
round: a hash is not an outcome, and a comment edit in a 1,500 line engine file would have turned a fence red
for nothing. That is why those results print 171 checks and the builder's last head made 169. Since the fix
pass the harness makes 188.)

## What the NBA, MLB and NHL front offices must supply (data plus events, no new engine)

Nothing in `gmGameScore.ts`, `gmGameDay.ts` or `gmBracket.ts` knows a sport. A bind brings:

1. A SCORE LAW, `src/lib/gameLaws/<sport>Score.ts`, a `ScoreLaw` that imports nothing but types:
   `score(pHome, rng, decided?)` gives `[home, away]`, whole numbers, for a home side that wins `pHome` of the
   time. It should lean the way its chance says (the quick path asks up to 24 times for the engine's winner; the
   NFL's needs 2.0 tries a game). It binds the PRESENT DAY era (`nbaScore` in `src/lib/season/nba.ts` takes an
   era as a fourth argument; it moves here the way the NFL's did in Round 1221). The NHL's must read
   `decided.beyond`: its engine draws whether a game went past regulation, and the law must tell a one goal game
   with an extra period when it did. MLB's and the NHL's score laws do not exist yet. No side of a final may be
   above `GM_SCORE_CEILING` (999): a score above it is not a score to the quick path, the guards or the story.
2. A STORY LAW, `src/lib/gameLaws/<sport>.ts`, a `StoryLaw`: `events(home, away, rng)` (the scoring plays of a
   final, the HOME club as `us`, each with whole `pts` that sum to the final and a minute inside the clock, or
   null when no list makes it), `clock` and `line(event, club)`.
3. A GAME DAY LAW, `src/lib/gameLaws/<sport>GameDay.ts`, a `GameDayLaw`: `story`, `maxScore` (the highest score
   a side can have in a final its score law gives, stated from the law's own constants: `gameStory` tells no
   final above it and never asks the story law for one), `periods` (how many, which one a minute falls in, its
   short name: four quarters, three periods, nine innings) and `shape` (the margin that makes a rout, the
   deficit that makes a comeback, one sentence a shape whose verbs read the same for a club named in the
   singular or the plural), plus its "?" as a `HelpWords` with real, sim's own and one worked example.
   A SPORT WITH AN EXTRA PERIOD (the fix pass, the reviewers' findings 4 and 8) also states `storyBeyond`, the
   scoring plays of a final that went past regulation, and `periods.regulation`, how many of its periods a game
   in regulation has (three of four for hockey). The mark travels by itself: `DecidedGame.beyond` from the
   engine, kept on `ToldGame` by `quickGame`, saved on `GmLastGame`, read back by `readGmLastGame`, and
   `gameStory` tells a marked game by `storyBeyond` and any other by `story.events`. The same final in sixty
   minutes and in the extra period are then two stories, before and after a reload, and `late` is the last
   period that game was played to. `StoryLaw` in Round 1221's `types.ts` is not touched (new files only).
4. A BRACKET, `src/data/gmBrackets/<sport>.ts`, a `BracketFormat` with its sources in the header (two
   publishers that are not a wiki a fact, the seasons it is true for, thin marked thin): `qualifiers`, `ties`
   (slots are a seed, a winner, a loser, or the Nth best seeded of several winners), `winsNeeded` by week (the
   series lengths) and, for these three, `order`. All three engines play one conference or league to its end
   before the other (`runNbaPlayoffs`, `runMlbPlayoffs`, `runNhlFoPlayoffs`), so week order is not their draw
   order: with `order` set to the engine's own, `playBracketAll` can be held equal to the old function draw for
   draw, while the round a press path plays week by week and makes no such claim. The unit test holds both
   shapes: a ten club conference with a play in (a `loserOf` slot) and best of seven rounds, and a format with
   an order of its own. The NBA's play in is exactly that; MLB's is byes for seeds 1 and 2 with series of three,
   five and seven (`winsNeeded` 2, 3, 4, 4); the NHL's is a fixed bracket by division.
5. A `play: PlayTie` that restates the engine's own series game (for the NBA one draw against one chance for the
   whole series, `playSeries` in `nbaFrontOffice.ts`), and seeds from the engine's own standings function.
6. ONE ADDITIVE, OPTIONAL FIELD ON THE ENGINE'S ROUND REPORT: `simRound`, `simMlbRound` and `simNhlRound` hand
   back only the GM's wins and losses for the four to six games of a press. To tell them a bind needs the GM
   club's games of the round (opponent, home or away, who won, the chance), with no new draw.
7. A FIXTURE recorded from the engine's one press postseason and a harness section like section 4 here, and the
   one save field each: `GmLastGame` for the last told game, `GmBracketSave` while a bracket is open (read
   through `isGmBracketSave` in that sport's own validator, repaired through `repairGmBracket` on load).

## For the next round (the NFL bind), what this round settled and what it left

- THE LAST TOLD GAME IS A SAVE FIELD, not the schedule (the critic's correction 1): `GmLastGame`, absent on a
  bye and on every older save; with nothing saved the card draws nothing until the next press. The bind builds
  the key (`${season}|${where}|${home}|${away}|${the engine's own score}`), so two saves do not tell one game
  the same way.
- The score for a press is `quickGame` (static in the board); the story is `gameStory` on the saved final
  (lazy, with the card). The board must read `playoffs` inside `persist` the way `gm` is read (correction 10).
- A `playoffs` block on a save whose season already has a champion, or whose week is not 18, is DROPPED by the
  board, not repaired: `repairGmBracket` only answers "what bracket does this open postseason play on from".
- A level told final cannot be saved (`makeGmLastGame` answers null): every front office game has a winner.
- The copy of both "?" sheets describes controls the cards do not have yet (Watch, 3x, Results; one press a
  round, Sim the rest). The round that draws the cards checks the words against the cards as built.
- The NFL bind's seven a conference check goes in as `repairGmBracket`'s last argument (`seedsOk`). Since the
  fix pass it is asked of a save that replays soundly too, and a refusal is a rebuild from fresh seeds.
- ASK FIRST WHETHER THE SAVE IS IN ITS POSTSEASON, THEN REPAIR. `repairGmBracket` answers an absent block
  (undefined: every save from before the bracket) like a damaged one: rebuilt `fresh`, with the line that the
  bracket could not be read. A board that called it on every load would open a bracket on a save that never had
  one and print a false line. Its header says so and a unit case pins it.
- NOTHING READS `playoffs` OFF A SAVE BEFORE THE REPAIR HAS. `bracketWeek`, `bracketPairings`, `bracketRounds`,
  `bracketChampion`, `bracketOut` and the three movers take a `GmBracketSave` on trust and throw a TypeError on
  a block whose `played` is not a list.
- `isClub` IS A REAL MEMBERSHIP TEST (a Set, or `Object.hasOwn`). Both guards compare with `=== true`, and a
  bare lookup such as `id => !!teams[id]` says yes to `constructor`.
- `repairGmBracket` THROWS when the bind's own `freshSeeds()` does not open a bracket the validator reads (the
  wrong number, a seed twice, a seed that is not a club). The league's validator runs before it on a load, so a
  player never meets that; a bind's test will.
- THE PLAY A CARD CALLS THE ONE THAT DECIDED IT is `GameStory.goAhead` (one of `deciding`, which can hold three
  plays). The Game Day "?" speaks of that play.
- THE WEIGHT. What a press and a validator import statically is `gmGameScore.ts` (the quick path, the ceiling,
  the save field), `gmBracket.ts` and `src/data/gmBrackets/nfl.ts`. `gmGameDay.ts`, `gameLaws/nflGameDay.ts`,
  `gameLaws/nfl.ts` and `gmBrackets/nflHelp.ts` ride with a card that is drawn. /front-office was 359.3K on a
  budget of 359 before anything was mounted.

## Judgment calls, so the lead can overrule them

1. NO EDIT TO ROUND 1221'S FILES. Its closing report expected this round to add `periods`, `shape` and `help` to
   `src/lib/gameLaws/types.ts` and `nfl.ts`. The brief says new files only, so the type is `GameDayLaw` in
   `src/lib/gmGameDay.ts` and the NFL's is the new `src/lib/gameLaws/nflGameDay.ts`.
2. ONE FILE THE BRIEF DOES NOT NAME: `scripts/lib/gmGameDayFleet.mjs`, so the recorder and the harness share
   one fleet and cannot drift.
3. `help` IS THE SEASON CENTER'S `HelpWords` (correction 13 iii), by a type only import from
   `src/components/season-centre/SeasonCentreHelp.tsx`; nothing of that file is in a bundle.
4. DECIDING PLAY (2) HAS NO CONDITION. The draft kept the loser's last score before the go ahead only "if it
   had made it level or put the loser ahead". That is always so (the go ahead is the first score after the LAST
   such moment), and the unit test holds it over the 1,892 finals from 0-0 to 45-45 the NFL law can tell.
5. `bracketProblems` skips its "out of turn by week" rule for a format with an `order`, where a later week of
   one side is rightly played before the first week of the other; a tie whose sides are not known is still named.
6. `playBracketGame` THROWS on a `play` that names a third club as the winner: that is a bug in a bind, not a
   state to carry. Everything that reads a SAVE never throws.
7. THE SUPER BOWL IS WORDED AS "a site picked beforehand", because the two sources use two words.
8. 21 AND 10 for a rout and a comeback are this builder's choice (three touchdowns; two scores). They are this
   sim's own, said in the "?", and one constant each.
9. THREE CONTROLS MORE THAN THE DRAFT (`tries`, `enginedrift`, `unkeyed`) and the critic's `stream`.
10. No league figure is printed beside the measured numbers: none was read on two sources.

## Runner results

| Result | Commit | What ran | Outcome |
|---|---|---|---|
| `r1224-s1` | `3962f8c1` | the type gate; the two new unit files and gameLawNfl; simLiveScores, simNoRivalNames, simHarnessAnchors, simNoInventedQuotes, simInventedNames | all exit 0; 52 tests |
| `r1224-s2` | `5c7c12a4` | the type gate; the three new unit files and gameLawNfl; the harness; the recorder at the head and in a worktree of the base, each `cmp` with the committed fixture; ten fences (the five above, simNoInventedConduct, simNumberFormatting, simLegalPages, simTrustCopy, simStorageWrites) | all exit 0; 64 tests; `simGmGameDay: 171 checks, 0 failed`; both recordings are the committed file |
| `r1224-s2c` | `5c7c12a4` | the first nine controls and an unknown one | nine exit 1, each `RED AT THE NAMED CHECK`; the unknown one exit 2 |
| `r1224-f1` | `be21930c` | the type gate; the four unit files; the harness; all twelve controls and an unknown one; both recordings; `git diff --name-status` against the base | gate 0; 64 tests; `171 checks, 0 failed`; twelve controls exit 1, each `RED AT THE NAMED CHECK` with every check it names among the reds (`enginedrift` with the machine's two checks green); unknown exit 2; both recordings the committed file; every changed file is new |
| `r1224-f2` | `be21930c` | a build, then the 24 rule fences one at a time | 19 exit 0. Five exit 1, none of them this round's and all five red on the base: simSchemaNames and simLeaderboardCaps (the live database is unreachable from a runner by design), simWritesAreSent and simResultMoment (a browser library path that is not on the runner), simDailySaveHardening (/olympics, fixed on Round 1210's branch) |
| `r1224-f3` | `be21930c` | the whole unit suite in three shards | see below |
| `r1224-f4` | `be21930c` | a served build, `SWEEP_OFFLINE=1 node scripts/sweepWeight.mjs` | exit 0, green; /front-office 359.3K over 34 files, /nfl-my-career 468.1K over 47, /soccer-career 786.3K over 45: the base's rows to the tenth |
| `r1224-f5` | `be21930c` | `src/test/throughBallDrill.test.ts` alone: at the head, in a worktree of the base, at the head again | exit 0 all three times (the file passes in about 3.5 s alone, at the head and at the base) |

The whole unit suite (`r1224-f3`, `node_modules/.bin/vitest run --shard=k/3 --testTimeout=300000 --hookTimeout=120000`):

| Shard | Exit | Totals |
|---|---|---|
| 1 of 3 | 0 | 130 files passed, 1 skipped; 1,780 tests passed, 10 skipped |
| 2 of 3 | 1 | 129 files passed, 1 FAILED, 1 skipped; 2,070 tests passed, 1 failed, 4 skipped |
| 3 of 3 | 1 | 130 files passed, 1 FAILED; 1,534 tests passed, 1 failed, 41 skipped |

393 test files, three more than the base's 390: this round's three. Neither failure is in a file of this round:
- Shard 3: `src/test/dailySaveShapes.test.tsx > a damaged daily save resets itself > /olympics`, red on main and
  on the base (Round 1221's `r1221-b5`), fixed on Round 1210's branch.
- Shard 2: `src/test/throughBallDrill.test.ts > seeded Through Ball rules > settles every verdict the rules name,
  and no round is free`: `Test timed out in 20000ms` (the test carries its own 20 second limit, and three shards
  shared one runner; the shard took 522 s). A timing red, so it was run alone: alone it passes at the head, in a worktree of the base and at the head again, in about 3.5 s each time (`r1224-f5`, exit 0 three times). It is not red.

The pushed head's own last check (the type gate, the harness, the unit files) is named in the closing report,
`C:/Users/antho/dukb-handoff/2026-10-10/results-g/finish-1224.md`.

## THE FIX PASS (2026-10-10, after the two adversarial reviews of `bf6d9696`)

The reviews: `C:/Users/antho/dukb-handoff/2026-10-10/results-g/review-run-1224.md` (verdict FIX: one major, five
minors) and `review-read-1224.md` (verdict SHIP: ten minors). The fixer's closing report, with every command and
runner result: `C:/Users/antho/dukb-handoff/2026-10-10/results-g/fix-1224.md`. One commit a fix:

| Commit | Findings | What changed |
|---|---|---|
| `bb513cff` | 1 (MAJOR) | A score has a ceiling. `GM_SCORE_CEILING` (999) and `isGmScore` are the one definition of a score for `decidedScore`, `gameStory`, `readGmLastGame` and `isGmBracketSave`; a `GameDayLaw` states `maxScore` (the NFL's 73) and `gameStory` refuses a final above either before the law is asked. Before: a saved 250000 was read by the guard and threw a RangeError out of the NFL's story law, a saved 1e21 never came back. |
| `f2944bd4` | 2, 3, 6, 7, 9 | `playBracketGame` plays no tie out of turn (the validator condemned what the mover allowed). `repairGmBracket` asks `seedsOk` of a sound save, throws on the caller's own bad fresh seeds, and its header says an absent block is answered like a damaged one. The unit test named for the better seed hosting checks it. |
| `0a7bffc0` | 4, 8 | A game past regulation keeps its mark: `ToldGame.beyond` and `GmLastGame.beyond` (kept when true, absent otherwise, so the NFL saves what it saved), `GameDayLaw.storyBeyond`. |
| `19416ed9` | 10, 15 | A law that throws has refused (null from `decidedScore` and `gameStory`). `GameStory.goAhead`. `periods.regulation`: `late` is the last period that game had. |
| `34457c13` | 12 | What a press needs sits apart from what only a card needs: the save field moved to `gmGameScore.ts`, the bracket's help words to `src/data/gmBrackets/nflHelp.ts`. |
| `1a05fcb2` | 5, 11, 16 | The harness: the ceiling, the mover against the validator, the go ahead, seven more controls, a control may name checks of other sections, the walk of `src` survives a directory removed under it, the header says what the clock is read for and what is not held here. |
| `946d461f` | 13 | The fixture records every file it was taken from (eight) and a red line names the ones that moved. The file was taken again for that header only; no recorded game moved. |
| this commit | 14, 15 | The thin sentence of the Game Day "?" in words a player can read; these notes. |

NOT FIXED, and why:
- Finding 14, the sourcing itself: the ledger row is in `src/data/usLeagueShape.ts`, its owner's file, and this
  round is new files only. Owed above.
- Finding 15, parts b and c: the `controls` sentences of both "?" sheets name buttons, and the bracket's sheet
  says nobody heals between playoff rounds. Both are the next two rounds' to keep true or to change; nothing
  mounts the sheets yet.
- Finding 11, in part: three check families keep no control of their own (a save survives JSON, the fixture is
  of this fleet, the five structure checks). The harness header says so.
- Finding 8's suggested fourth argument on `StoryLaw.events`: not taken, because `src/lib/gameLaws/types.ts` is
  Round 1221's file. `GameDayLaw.storyBeyond` carries the same thing inside this round's own type.

The fix pass's runner results are in the table of the fixer's closing report (the queue held a request for over
an hour that afternoon, so they were read after this file was written).

## Not run, and why

- Nothing that reads or writes the live database (no MCP SQL, no deploy). simSchemaNames and simLeaderboardCaps
  need it and are red on a runner for that reason alone; the lead runs them at release.
- simWritesAreSent and simResultMoment did not run their checks on the runner (`ERR_MODULE_NOT_FOUND`).
- `npm run build:seo`, the prerenderer, the snapshot harnesses, `runAllSims`, `sweepGames`, `playGames`, any
  browser walk: not run. No page, route, guide, component or snapshot changes, and nothing mounts the new files.
- WebKit: not run.
- No type gate, build or unit suite ran on the owner's PC. What ran there: git, the recorder (10 s), the
  harness (50 s for all five seed sets, 10 s for one) and three small probes.

## Owed, and what a later session must not trust

- GATE LIST: `simGmGameDay` belongs in the release gate from this round on (the critic's point 23): its section
  4 is the fence that sees a later edit to `runPlayoffs`, `simGame`, `finalsBracket.ts` or the NFL data. AND THE
  THREE UNIT FILES, BY NAME, in every gate that carries this round: `src/lib/gmBracket.test.ts`,
  `src/lib/gmGameDay.test.ts`, `src/lib/gmGameScore.test.ts`. The save guards and the repair are held by them
  alone (seven of the run reviewer's fifteen mutations leave the harness green and are caught only there).
- OWED BY THE LEDGER'S OWNER before a card shows the Game Day "?": the `NFL_CLOCK` row of
  `src/data/usLeagueShape.ts` completed with the league's rulebook, then the thin sentence and the unit test's
  demand for the word thin go (see the facts section above).
- Nothing is owed to the other lane: no guide sentence changes. When Game Day is mounted, the /front-office
  guide (`src/data/gameContent/football.ts`) should gain it; that is the mounting round's note to write.
- The board sentence of the critic's correction 9 (the two cards and the four boards are this lane's for these
  rounds) is still the lead's to write before a card is drawn.
- DO NOT TRUST: that section 6 is a permanent rule. The round that mounts a card must turn it into "the cards
  are lazy" in the same commit, or the harness goes red the moment a board imports `gmGameScore`.
- DO NOT TRUST: the "?" copy against a card that does not exist yet (its `controls` sentences).
- DO NOT TRUST: `SCORE_TRIES` = 24 for another sport without measuring its swapped share. The games that run
  out of tries here are road upsets at a home chance of 0.8 or more (49 of the 63 swapped games in 114,000).
