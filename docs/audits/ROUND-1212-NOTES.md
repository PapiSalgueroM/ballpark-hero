# Round 1212 notes: MLB My Career, watch your season game by game (hitters; pitchers held)

Branch `r1212-mlb-week-by-week`. Base: Release AU's integration branch at 20f2f475, with Round 1226
(2c86ecc7, the true MLB and NHL seasons) and Round 1300 (d48ca6a9, the playoff deriver) merged first. The commit
after those two merges, 60188732, is "the base" of every proof below. Two builders worked on this round on
2026-10-10; this file is the committed record, the runner result names are in it.

## What a player gets

A 📺 Week by week button on the MLB My Career hub for every hitter (C, 1B, 2B, 3B, SS, LF, CF, RF, DH). Press
it instead of Play the season and the season that press just played opens one game at a time on the shared
Season Center: innings on the clock, his line every game (hits and at bats, home runs, RBI, doubles, steals),
the record, the halfway poster (with the All-Star sentence exactly when the saved line holds the award), the
last game, and from the 2022 season the playoff path round by round with each series score. Nothing is stored:
the saved string is the same whether or not he watches.

## What it does not do, and says before he presses

Each of these shows a muted line on the hub where the button would be (the whole sentences are typed in
src/test/usSeasonMlb.test.ts, src/test/usSeasonCentreEntry.test.tsx and the harness's own table):

- Pitchers (SP, RP): "No week by week for pitchers yet: this view cannot yet show which games were your wins."
  A win is a claim about one game's result and the season core cannot hold one yet. That is its own round.
- A club whose real season was not 162 games that year, read club by club from the two sourced ledger
  (src/data/usSeasonLedgerMlb.ts): the 60 game 2020 season (58 for the Tigers and the Cardinals), a 163rd
  game, a game never made up. In 2026 that is the Orioles and the Yankees (161) and nobody else.
- A club outside the league. The engine's "Japan is offering" card sets `team` to a real Japanese club for two
  seasons; the view lays out no Major League season for it. Its own line, its own harness check, its own
  control (`outside`).
- A team id that is not in the era's own list, and a year the ledger does not hold: held (fail closed).

Not laid out and said in the "?": walks (the on base percentage is the season card's), the first round bye,
who he played in October (the path shows rounds and scores and names nobody).

## Builder's decisions the lead should know

1. The MLB number file reads Round 1211's ledger through Round 1226's reader (src/lib/usSeasonShape.ts).
   src/data/usSeasonLengths.ts and US_LEAGUE_SHAPES were NOT widened, so the eager chunk of the NBA and NFL hubs
   did not grow and no ledger recording was needed (the file is untouched).
2. The eager held words live in src/lib/mlbSeasonHeld.ts, beside the engine, and not under src/lib/season, so
   nothing eager imports the lazy season folder (the harness's section 8 walks the MLB route for that).
3. The path names no opponent (`pathNamed: false`): "the World Series is the only round against the other
   league" is one source in the ledger (THIN), so a round is not placed in a league.
4. THIN in the ledger and therefore this career's own, said in the "?": how thirteen games against a division
   rival fall into series, which park a league series is played in, the 81 home games.
5. A home run of his is not a team floor in the core (the core lifts a score to the floor after the score law
   and that levelled a 0-1 game: 13 of 113 probe seasons were refused). `finish` swaps whole lines between two
   games he played so his home runs stay inside his team's runs; every total and cap is kept.
6. Critic's correction 2 as ruled: the misfit rule is an MLB option on the bind (`pathNeedsFit`), the shared
   default and the NBA test are as they were. Since Round 1226 the engine holds October to the year's rounds, so
   the harness measures 0 misfits and asserts under 1 percent.
7. The harness's medians for baseball are judged on the five seed sets pooled (as the NBA's are): "Lost the
   Wild Card Game" exists in nine years only and one seed set holds 22 to 38 such seasons from about ten
   careers; its median ran 88 on seed set 0 and 93 on seed set 1 of the same tree.
8. A control run of the harness may name its own sport alone (`SPORTS=mlb US_SEASON_CONTROL=hits`). The gate
   run still refuses to skip a bound sport.

## Proof, all on GitHub runners (result names; each line was read)

- The base (60188732): r1212-base and r1212-base-walk. Green except sweepWeight (13 failures on the base, the
  release line's own; /nfl-my-career 476.9K against a budget of 469) and, in the whole vitest suite
  (r1212-0c-all), two Soccer Career tests that were red on the base and on release-au-int 20f2f475 too
  (r1212-3 ran them on all three trees). The release line fixed both later.
- The seam (5a1fe0d7): r1212-0c. Type gate 0, the US tests 0, the harness 98 checks 0 failed, the seam receipt
  "11 digests, 0 moved", the NBA and NFL screens equal to the recording made on the base.
- The number file (cca4c5a4): r1212-1 and r1212-3b. The truth digest (58 keys) and the board replay are green
  with no re-record: the engine's draws did not move.
- The bind (0ed60fba): r1212-4a (type gate, nine US test files, the harness "148 checks, 0 failed" on five seed
  sets, the seam receipt 0 moved, the board replay, the weight rule, the fences), r1212-4d (the copy fences and
  soccer's Season Centre harnesses), r1212-4b (the whole vitest suite: only the base's two reds).
- The merged head (64e0f09c, the release line at 611c3f4e merged in): r1212-5a (the same set, all green, the
  seam receipt still 0 moved) and r1212-5b (the whole vitest suite: 431 files passed, 2 skipped, 6,356 tests
  passed, exit 0).

- The first walk of the bind (r1212-4c) found two defects, both fixed in e8b676d7: the review's AVG tile
  printed 0.276 where the season card prints .276 (one optional member on the shared view, `tileText`, set by
  baseball only), and the walk's `write` control wrote to the NBA's and the NFL's save keys only, so it did
  not fire on baseball (it writes to the walked sports' own keys now).
- The code's last commit (e8b676d7): r1212-6a (type gate, the US tests with the NBA and NFL screens, the
  harness "148 checks, 0 failed", the seam receipt 0 moved, the board replay, the fences: all exit 0), r1212-6b
  (the whole vitest suite: 431 files passed, exit 0) and r1212-6c on a served build: playUsSeasonCentre "217
  checks, 0 failed" (the NBA, the NFL and MLB at 390 by 844 and 1280 by 800), its controls write, static,
  count, cover, playfirst and nohandover each red at the named check on baseball (and write on the NBA),
  playCareerHub, playSeasonReveal, playReducedMotion and playGames on /mlb-my-career green. On the merged head
  before that fix (r1212-5c): playExtension, playFreeAgency, playDepthChart, playUsCareerSaveSeam,
  playDraftNight, simMobileChrome and sweepGames green.
- sweepWeight is red with the same 13 routes as on the base (budgets are the lead's). Measured on the last
  commit: /mlb-my-career 551.6K gz, /nhl-my-career 554.1K, /nba-my-career 564.0K, /nfl-my-career 478.3K (its
  budget is 469K and it was 476.9K on the base; the rise since the bind is the release line's merge, the bind
  itself moved the four routes by +1.0K, +0.5K, -0.1K and 0). Baseball's number file is a 6.9K chunk loaded
  on the first press. From the press to the first card: about 565 ms for 162 games, of which 500 ms is the
  walk's own delay on the viewer chunk (the NBA's 82 games: 542 ms).

The controls, each run once on r1212-4a, each exit 1, each closing with its own red line:

    control mlbstage: RED AT THE NAMED CHECK (section 1); sections red: 1, 4; 330 seasons carry the unknown result, 330 of them shown with no band and no path
    control mlbformula: RED AT THE NAMED CHECK (section 5); sections red: 5; its named check "follows the formula" is among the reds; 337 seasons meet a division rival off the formula
    control series: RED AT THE NAMED CHECK (section 5); sections red: 5; its named check "follows the formula" is among the reds; 337 seasons are not played in series
    control hits: RED AT THE NAMED CHECK (section 3); sections red: 3; its named check "independent checker" is among the reds; 741 seasons show hits that do not round to the saved average
    control rbi: RED AT THE NAMED CHECK (section 3); sections red: 3; its named check "independent checker" is among the reds; 617 seasons show more RBI than his team has runs
    control allstar: RED AT THE NAMED CHECK (section 3); sections red: 3; its named check "independent checker" is among the reds; 650 seasons print the All-Star sentence with no award on the line
    control pitcher: RED AT THE NAMED CHECK (section 2); sections red: 2, 3; its named check "every pitcher's season is held" is among the reds
    control club: RED AT THE NAMED CHECK (section 2); sections red: 2; its named check "every 2026 season of the Orioles or the Yankees is held" is among the reds
    control outside: RED AT THE NAMED CHECK (section 2); sections red: 2; its named check "at a club outside the league is held" is among the reds
    control mlbwho: RED AT THE NAMED CHECK (section 2); sections red: 2; its named check "the hub's held line is there exactly when the binding holds the season" is among the reds
    control pathyear: RED AT THE NAMED CHECK (section 4); sections red: 4; its named check "playoff path follows" is among the reds; 38 seasons draw a path before the ledger holds the rounds
    control mlblevel: RED AT THE NAMED CHECK (section 7); sections red: 3, 7; its named check "no game is level" is among the reds; 11631 level games
    control seam: RED AT THE NAMED CHECK (the season digest of every sport moved on every seed set of this run; the careers, the counts and the stray draws held)

The older controls whose shared code this round touched fired too (static, length, stage, poscore, nflheld,
stream).

## Measured (five seed sets, 40 careers a set, r1212-4a)

4,621 MLB seasons; 3,757 open; 3,756 derived; 1 refused (in finish). No repair in 86.2 percent. Runs a team
game 4.56 against the ledger's 4.48 (present day) and 4.89 against 4.81 (throwback). A side shut out in 4.2
percent of team games, one run games 26.3 percent, games past the ninth 7.9 percent, his at bats a game 3.754,
hitless games 26.3 percent. Held: 50 seasons at the club outside the league, 14 seasons of the Orioles or the
Yankees of 2026, 118 hitter seasons at a club not on 162 (outside 2020), 126 seasons of 2020. Playoff paths: 966
drawn, 589 playoff seasons before 2022 with none, 0 whose saved games do not fit. The twin save test in vitest
(12 presses each way at 162 games) took 2.5 seconds.

## Owed, not built here

- To the other lane (guide, src/data/gameContent/baseball.ts, the /mlb-my-career guide): the two sentences the
  NBA guide has: the Week by week sentence, and who and which seasons have no game by game view (pitchers, a
  season that was not 162 games for his club, throwback seasons unnamed). No sentence there became false.
- The engine writes a real Japanese club's name as a team id and then plays MLB seasons and Octobers for it
  (critic's correction 1). The view holds those seasons; the season card is the engine's and was not touched.
- A hitter's RBI can be lower than his home runs in a 40 to 45 game bench season (critic 14 a): `finish`
  refuses such a line, counted under "refused" in the harness.
- A second source for "the World Series is the only round against the other league", then the path can name
  opponents. Series by series stops and a "next series" jump in the shared viewer (after PR216's viewer work).
- Pitchers' game lines (the season core needs win and loss marks). The NHL bind (Round B).
- The saved page of What's New is redrawn at the release build.

## The fix pass (2026-10-10, after the two adversarial reviews)

Head before it: 1e1066fb. Two reviews (one that runs things, one that reads) found three majors and ten minors.
Every commit below is one fix, pushed on its own; the full account with every command, exit code and number is
C:/Users/antho/dukb-handoff/2026-10-10/results-g/fix-1212.md.

- 97f3bf7a, the innings (major). A side's runs were shared over its innings by a clumpy weight with a cap of
  the side's whole total: a side scored in 20.6 percent of its innings, one team game in four held an inning of
  five or more, and an inning of ten to twenty three runs could be printed. `mlbSpreadRuns` now draws every
  inning by the score law's own chances given the total (cap nine, one keyed draw an inning, so no score, line
  or record moved). Five seed sets: 30.3 percent of nine, 8.9 percent, 0 of 1,216,944 team games over nine.
  Harness section 7 holds all three; controls `mlbinnings` and `mlbcap`.
- 6c18910b, an older save's first exit (major). The live engine writes "Lost the Wild Card series" in every
  year; read by the year's own ladder that word had no band before 2022, so Watch again laid such a season out
  around .500 beside a playoff exit. One optional bind member, `olderBand`, gives it a first exit's 84 to 95
  wins; the line under the review says why there is no path. Baseball has an older save twin in the harness now
  (`mlbOldTwin`): 332 twins on the five sets, 0 refused, median 89 wins; control `mlbold`. A line with no
  playoff games at all reads "your season card holds no playoff games".
- 5581c383, nine innings (major, a record defect: the fact was true). Recorded on the league's glossary and
  rulebook (one source: the league), Britannica Students and ESPN; `MLB_GAME_RULES.innings` is 9 and the number
  file reads it. The ledger harness holds it (check M11; controls `mlbinnings` and `inningsleague`).
- b76dfb3a, the order of the series and the bands (minors). A club no longer comes round again one series
  later (76.5 percent of named seasons before, 0 after) and no more than three series run in one park (the
  longest homestand went from 12 games at the median to 10). Every derived season of baseball is a new draw of
  the same saved line. Two checks and control `mlborder`. The six older bands were narrowed to about fifteen to
  twenty times the seed set spread around the five set numbers.
- 156ee0fc stale comments; df12471a the playoff line ("7 games", one optional view member `postLabels`);
  b041529a the Watch again test moves him to another club both ways (the reviewer's mutation is red against it
  now); 868fdcb0 What's New's last sentence; 50b52b0d the walk's review picture waits for the reveal; 14d883c0
  the held line set snug on a phone (the words unchanged).

Five seed sets on the head of the fixes (runner r1212-fx4a, 14d883c0): simUsSeasonCentre 156 checks, 0 failed.
4,621 MLB seasons; 3,757 open; 3,756 derived; 1 refused. Runs a team game 4.556 against 4.48 and 4.885 against
4.81; shut out 4.2 percent; one run games 26.4; past the ninth 7.9; at bats 3.753; no hit 26.3; a side scores
in 30.3 percent of nine innings; biggest inning five or more 8.9 percent; no inning over nine; no club again
one series later; no series past three in one park. All 18 controls run there are RED AT THE NAMED CHECK.
The seam receipt still says 11 digests, 0 moved, so nothing the NBA and NFL Season Centers are handed moved.

Re-record: scripts/data/usSeasonLawDigest.json (Round 1221's receipt, in no gate) is taken again at the end of
this pass, because three of its bundled inputs are no longer the record's (src/lib/season/us.ts and
src/data/usLeagueShape.ts are this round's seam, src/lib/careerRival.ts came with Round 1226). Proven on runner
r1212-fx-law: with those three put back the old record replays green (11 digests, 0 moved), with this round's
two put back it stops on careerRival.ts alone, and a fresh print of the head equals the old record in all 42
values. scripts/data/usSeasonLayDigest.json (Round 1300's) is left for the lead: ten inputs moved, nine of them
not this round's.

Still owed after the fix pass (beside the list above): the words of the held line for a club stay long (they
are the ledger's own and are typed whole in the tests and the harness); the guide sentences are the other
lane's; the saved page of What's New is redrawn at the release build.

## The second fix pass (2026-10-11, after the closing check)

Two things changed, each its own commit; the other five items of the closing check are the lead's or another
round's and are listed in the closing report (dukb-handoff/2026-10-10/results-g/fix2-1212.md).

1241bdac: the headers of src/data/usSeasonLedgerMlb.ts and src/data/usSeasonLedgerNhl.ts no longer say that
nothing imports them. Comments only. Neither file is an input of the law or the lay receipt.

8f06909a: a sixth at bat only in a game his side scores enough in. A best game of "4 for 6" was seen in a 3-0
win that ended in nine. The at bats of a game had one cap, six, whatever his side scored, and a day with a home
run and a double starts two at bats up, so the sixes landed on his best days whatever the score. The rule now,
this sim's own: six at bats only where his side scores seven, or ten in a home win (it does not bat in a ninth
it leads); five in every other game; never fewer than his own home runs and doubles need. The thinking behind
seven and ten: a side's trips to the plate are its outs, its runs and the men it leaves on; the first batter's
sixth trip is the 46th; twelve left on is a generous ceiling. `mlbAtBatsCap` in src/lib/season/mlb.ts, read by
`finish` and by the bind's `check`.

Measured on the five seed sets (runner r1212-f2-a, 469,598 games he played, 3,756 derived seasons):
- the old cap (control `absix`): 6,278 games on six at bats (1.3 percent), 5,208 of them in a game his side
  scores too few for a sixth, in 2,491 of 3,756 seasons (two seasons in three), some in games his side is shut
  out in;
- the rule: 1,077 games on six at bats (0.2 percent), 1 of them in such a game, and that one is his own line's
  (home runs and doubles that add up to six).
His at bats a game (3.753), the share of games with no hit (26.3 percent), runs a team game and the one
refused season of 3,757 did not move. simUsSeasonCentre: 158 checks, 0 failed. Control `absix` is RED AT THE
NAMED CHECK (the independent checker; 502 seasons on seed set 0, 2,491 on the five). The seam receipt and the
law receipt still say 11 digests, 0 moved: the NBA and the NFL do not read this file.

What moves for a player: a season in which the old cap dealt such a six is drawn with other at bats, hits and
RBI game by game (the sums are the saved line's either way). Nothing is stored, so no save moves.

Owed, seen while fixing and not built: one game in 469,598 holds three home runs and three doubles of his in a
game his side scores under seven. That is the season core's spread of the two sums (each capped at three a
game, neither looking at the other), not the at bats; a rule for extra base hits in one game would be its own
small round.
