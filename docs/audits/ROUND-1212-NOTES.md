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
