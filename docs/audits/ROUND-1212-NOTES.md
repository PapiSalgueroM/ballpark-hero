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
