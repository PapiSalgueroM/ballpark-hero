# Data verification map, 2026-09-19

Built by five read only agents, one per area (soccer, US pro, college, other sports and results, trivia banks), each listing every dataset a game reads with its row count, how it is verified, and its known gaps, checked with read only queries on the live database. A critic then re-checked every VERIFIED claim and downgraded the ones that did not hold. Answers the owner's question of 2026-09-19: is all the player info verified and correct? No.

**Counts:** 118 datasets. partial 61, verified 6, known bad 40, unverified 9, not 2. About 124 builder rounds to bring every one to verified.

**Critic:** Four of the fourteen claims hold up. transferOverlay2026 has two sources on every block, the DB matches it on the 11 rows I sampled, and it is fenced against rollback, but it covers only 241 of 5,496 2026 rows (the rest are an autumn 2025 snapshot) and one Player Bingo 'outdated transfers' report is still open. nfl_grid_players, colleges.ts and wc2026Results.ts also hold, though the World Cup scores and awards are not pinned and the France 4-6 England third-place score deserves a glance. The rest do not hold: Missing XI is KNOWN_BAD, with at least 12 wrong lineups and substitutes accepted as blank answers in at least 8. aflGoalKickers is KNOWN_BAD (Barry Hall's clubs leave out the Western Bulldogs). Transfer Path, REAL_LEAGUES with the final tables, College Grid and the four AFL/NRL tables drop to PARTIAL because their fences check derivation, structure or totals rather than each fact, and Wonderkid Factory and the retired routes hold no real data to verify.

## known bad (40)

- **soccer_player_club_stints** [soccer], 80,586 rows, 27,851 names rows, 2 rounds to verify.
  Games: Soccer Grid validator (soccer-grid-validate), Soccer Connect 4 club squares (football-connect4-validate), simTeammatesPairs
  Evidence: Derived from the market value years. simSoccerStintNameFold keeps the accent fold whole across all rows. simSoccerGridLabels proves every grid club label can be satisfied. Both validators only use this table to confirm, never to refuse, and fall through to Gemini, which fails closed.
  Gaps: It lags the verified overlay. 307 (player, club) pairs in the 2026 market rows have no stint at all: Salah is shown at Liverpool through 2026 while the overlay has him at Trabzonspor, and Goretzka (Aston Villa), Anthony Gordon (Barcelona), Bruno Guimaraes (Arsenal) and Morgan Rogers (Chelsea) are missing. Those picks fall through to the AI, and while its quota is out they get refused ('try again'). 1,425 exact duplicate stint groups (Rodri at FC Cartagena 2011 twice). Namesakes are merged: 'Rodri' carries Barcelona 2006, Betis, Almeria, Huesca, Cartagena and Guadalajara from different men. person_key is set on only 9 rows. Messi has a 2008 gap because his 2008 market value row is missing.
- **Open report 1bc9b2e5: 'some players are not in game, lucas herrington is one' (2026-09-03, footer on /)** [soccer], 1 report; 0 market value rows and 0 stint rows for him; 1 world_cup_players row rows, 1 rounds to verify.
  Games: Any game that searches player_market_values or the stints (Footle, Soccer Grid, Player Bingo, Who Am I, Club Manager rosters, Build Your XI search)
  Evidence: Read only SQL, 2026-09-19. He IS in world_cup_players 2026: Australia #25, DF, Colorado Rapids, born 2007-09-05, 4 caps. He is in no market value or stint table, and Club Manager's Colorado Rapids ships 8 real players without him.
  Gaps: PROJECT-STATE says 'Lucas Herrington is in no table', which is wrong: the two-source World Cup table has him. The real gap is market value coverage, which is the same class as Aleksandar Pavlovic (Bayern), Connor Metcalfe (St. Pauli) and Kai Trewin (NYCFC). The report is still unresolved.
- **national_team_squads** [soccer], 2,784 (World Cup 2018, 2022, 2026) rows, 1 rounds to verify.
  Games: Build Your XI nation slots (reads country and player_name only), validate-player edge function nation path
  Evidence: PROJECT-STATE (Round 482 era) records the column shift. Confirmed today: in 2026 rows, club holds '( 2000-05-17 ) May 17, 2000 (aged 26)' and position holds '1 GK'. In 2018/2022, 1,568 club values hold birth dates.
  Gaps: It is a raw wiki scrape with shifted columns on nearly every row. jersey_number is null. The 2026 set covers 39 nations where the tournament had 48. Shipped code reads only names and countries, so no wrong club reaches a screen today, but anything that reads more columns will show garbage.
- **soccer_awards** [soccer], 932 across 13 award names rows, 2 rounds to verify.
  Games: List Quiz (only European Golden Shoe, MLS MVP, Premier League Player of the Season)
  Evidence: listQuiz.ts records an audit from 2026-07-15: African and South American Footballer of the Year are marked 'DO NOT USE' (winner_name holds '1st'), and World Soccer Player of the Year is marked 'DO NOT USE' as unverified. The three awards in use spot check correct for 2019 to 2024.
  Gaps: World Cup Golden Boot, Golden Glove and Best Young Player are 393 rows of scrape junk: winner_name 'ESPN Deportes', 'Associated Press', '1', 'Colombia'; club holds scorelines like '1 -0'. The same rows are copied across all three awards, and there are 1930 rows for awards that did not exist then. Onze d'Or has 3 duplicate rows, FIFA Best Goalkeeper 7. Winner names carry '(2)' counters. No harness pins the three awards in use.
- **shirt_number_puzzles (DB) + src/data/shirtNumberPuzzles.ts (fallback)** [soccer], 154 DB rows; 33 fallback rows rows, 1 rounds to verify.
  Games: Sports Millionaire (listed, daily: 'What shirt number does X wear?'), Shirt Number (/shirt-number: unlisted from the registry, route still live)
  Evidence: There is no harness and no source note (only a Round 366 ordering fix). A cross check against the 2026 market rows today found about 17 players at a club they have left.
  Gaps: Wrong in the present tense: Kevin De Bruyne at Man City #17 (moved to Napoli in 2025), Trent Alexander-Arnold at Liverpool #66 (Real Madrid since 2025), Benzema at Real Madrid #9, Sergio Ramos at Real Madrid #4, Thiago Silva at Chelsea #6, Cavani at PSG #9. Also stale after the 2026 window: Salah (Liverpool #11), Rodri (Man City #16), Garnacho, Martinelli, Lewandowski, Rashford, Nicolas Jackson, Delap, Bailey. The fallback also has Mbappe at #9 (the table says 10).
- **ai_validation_cache rows for nba-connect4, nfl-connect4, nhl-connect4, mlb-connect4 (answers for the four US Connect 4 games)** [uspro], 402 cached verdicts (nba 211, nfl 99, nhl 56, mlb 36); none settled from data rows, 2 rounds to verify.
  Games: NBA Connect 4, NFL Connect 4, NHL Connect 4, MLB Connect 4
  Evidence: Validators (supabase/functions/*-connect4-validate) ask Gemini and cache the answer forever, with no expiry. simValidatorCache only checks that the cache gets used, not whether the answers are right. WORKBOARD Round 615 (queued) says 'none settled from data'.
  Gaps: At least 9 cached 'never played for' verdicts are contradicted by the site's own tables, so these right answers get rejected every time: Deni Avdija/Trail Blazers, Jalen Green/Suns, Khaman Maluach/Suns, Dillon Brooks/Suns, Jordan Clarkson/Knicks, Jeremy Sochan/Knicks, Cooper Flagg/Mavericks (nba_player_stats has POR, PHO, NYK, DAL for each), Mitch Marner/Golden Knights (nhl_player_stats TOR,VEG), Isaac TeSlaa/Lions (nfl_grid_players DET 2025). The AI's reasons also get facts wrong, e.g. 'Antonio Brown played 2010 to 2019'.
- **nhl_player_stats** [uspro], 6,353 career rows (year_to up to 2025-26) rows, 2 rounds to verify.
  Games: NHL Franchise Grid, NHL Connect 4 autocomplete, 82-0 Perfect Season NHL, NHL Connections authoring, Puck Detective points, Rank 'Em NHL
  Evidence: hockeyGrid.ts docstring (checked in SQL on 2026-07-03). simGridCells only checks that every cell has answers. No harness pins any value.
  Gaps: Seasons before 1967-68 are cut off: Gordie Howe shows 349 points (real 1,850), Bobby Orr 874 (real 915), and Maurice Richard and Jean Beliveau are missing. So Howe fails Red Wings x 300+ goals, and hockeyGrid.ts never says so. Chicago's pre-1986 code CBH is not merged with CHI, so 116 players fail the grid's Blackhawks cell, including Stan Mikita and Orr's Chicago years. 64 rows are column-shifted junk (for example Tommy Cross: year_from '3', points not equal to goals plus assists).
- **hockeyHLPlayers.ts** [uspro], 45 players rows, 1 rounds to verify.
  Games: NHL Higher / Lower (/hockey-higher-lower)
  Evidence: None. No source, no date and no harness (simDateDraws only checks the daily draw).
  Gaps: Typed by hand, and active players' totals are wrong compared with the site's own nhl_player_stats (through 2025-26): Crosby 1,620 vs 1,761, Ovechkin 1,610 vs 1,684, Kane 1,250 vs 1,399, McDavid 1,050 vs 1,215, MacKinnon 900 vs 1,141, Kucherov 880 vs 1,122, Draisaitl 920 vs 1,053, Matthews 690 vs 780, Makar 420 vs 503. The file puts Draisaitl above MacKinnon, so a player who correctly picks MacKinnon is marked wrong.
- **nfl_grid_players (plus scripts/data/nflGridPlayers.json)** [uspro], 22,008 (seasons 1970 to 2025) rows, 1 rounds to verify.
  Games: NFL Grid (/football-grid)
  Evidence: Built from nflverse by genNflGridData. Fenced by simNflGridData (famous careers checked against PFR and NFL.com on 2026-09-02, plus a recompute sample) and simNflGrid. WORKBOARD Round 614 (queued) records the defect below.
  Gaps: The draft round column is corrupt: 911 players from the 1968 to 1982 drafts count as first rounders, against 461 across 1995 to 2009 (the board counts 503 false ones and 20 real first rounders missing). Super Bowls I to IV are invisible because the data starts in 1970, so Joe Namath and Bart Starr both show 0 wins. Jim Kelly has no draft data (he went 1st round, 14th pick, in 1983), so he fails 'First Round Pick'.
- **nba_player_stats** [uspro], 3,227 career rows (1965-66 to 2025-26) rows, 2 rounds to verify.
  Games: NBA Franchise Grid, NBA Starting 5 validator (nba-validate-player), NBA Connections cross-check, Rank 'Em NBA
  Evidence: nbaGrid.ts docstring from 2026-07-21. Checks I re-ran match: LeBron 43,394, Kareem 38,387, Jordan 32,292, and no duplicate names, empty teams or impossible splits. simLiveBoards reads it. simGridCells only checks cell coverage. No harness pins any value.
  Gaps: No career that started before 1965-66 is in the table (Rick Barry 1965-66 is the only early row). Wilt Chamberlain, Bill Russell, Jerry West, Oscar Robertson, Elgin Baylor, Bob Cousy and John Havlicek are all missing, so the NBA Grid rejects them (for example Wilt for Lakers x 10,000 points) and the page never says so. The Starting 5 validator accepts missing players without checking them, which is at least disclosed.
- **nflCareerPlayers.ts** [uspro], 78 players rows, 1 rounds to verify.
  Games: NFL Career Path (/nfl-career)
  Evidence: None. Typed by hand, no source and no fact harness. One resolved report: Jim Kelly could not be guessed (2026-07-27).
  Gaps: Disagrees with the site's own nflverse table (nfl_grid_players, through 2025): Stafford is listed with the Seattle Seahawks, but the table has only DET and LA. Rodgers is missing the Steelers, Wilson the Giants, Davante Adams the Rams, Diggs the Patriots and Geno Smith the Raiders. Jaxon Smith-Njigba's clue says '1,000+ receiving yards in rookie season', but he had 628 in 2023.
- **baseballCareerPlayers.ts** [uspro], 35 puzzles rows, 1 rounds to verify.
  Games: Baseball Career Path (/baseball-career)
  Evidence: None. Typed by hand, no source and no harness.
  Gaps: Freddie Freeman is listed as '2x World Series Champion (2021, 2024)', but the same file gives Betts and Ohtani the 2025 Dodgers title, and Freeman was on that team. Verlander's teams leave out the 2025 Giants and Scherzer's leave out the 2025 Blue Jays. Trout's and Kershaw's stat lines are fixed numbers with no '+', so they go stale.
- **hockeyCareerPlayers.ts** [uspro], 38 puzzles rows, 1 rounds to verify.
  Games: Hockey Career Path (/hockey-career)
  Evidence: None. Typed by hand, no source and no harness. Active players use '+' totals, which keeps those numbers from going false.
  Gaps: McDavid is credited with 'Conn Smythe Trophy (2025)', but he won it in 2024 and the 2025 winner was Sam Bennett. He is also listed as '3x Ted Lindsay Award' when he has four (2017, 2018, 2021, 2023). Awards for active players need checking one by one.
- **nbaHLPlayers.ts** [uspro], 80 players rows, 1 rounds to verify.
  Games: NBA Higher or Lower, Face Off (NBA points category)
  Evidence: Built from bref_nba_player_seasons on 2026-07-22. The header's method is sound and its anchors are exact (Kareem 38,387, Jordan 32,292, Iverson 24,368). No harness pins the values (simDateDraws only checks the draw).
  Gaps: It stops at 2024-25, a season behind the site's own nba_player_stats, and the card says 'played until 2024-25' for players who are still active. LeBron shows 42,184 (table: 43,394), Curry 25,386 (26,493), and Durant 30,571 with no HOU (table: 32,564 with HOU). Face Off shows these as career totals with no season label.
- **nflHLPlayers.ts + nflHLCategories.ts** [uspro], 60 players (TDs) + 159 category rows rows, 1 rounds to verify.
  Games: NFL Higher or Lower (six stat categories)
  Evidence: Built from nflfastr_player_stats (regular season, careers from 2000 on) on 2026-07-22 and 2026-08-05, spot-checked in the header. No harness.
  Gaps: nflverse totals are off from the official record by 1 or 2: Brady 650 TD passes and 89,216 yards (official 649 and 89,214), Eli Manning 367 TD (366), Tomlinson 13,686 rushing yards (13,684). nflCareerPlayers says 649 for Brady, so the two games disagree. nflfastr ends in 2024, so active players are a season behind.
- **teammatesPairs.ts (NBA and NFL rows)** [uspro], 34 US rows (19 NBA, 15 NFL) of 50 rows, 1 rounds to verify.
  Games: Teammates or Not? (/teammates)
  Evidence: simTeammatesPairs checks only the soccer rows against the stints table. Its header says it proves the rows are consistent, not that they are verified. The US rows are never checked, even though nba_player_team_stints (13,948 rows) could check them now.
  Gaps: The true/false answers look right, but the fun facts are wrong in places. Mahomes/Kelce says 'three Super Bowls (LVII, LVIII, LIX)', but they lost LIX; the three were LIV, LVII and LVIII. Wembanyama/Chris Paul says CP3 joined the Spurs 'in 2023' for Wemby's rookie season, but the site's own stints have CP3 at GSW in 2023-24 and SAS in 2024-25. Giannis/Curry calls them 'conference rivals', but the Bucks are in the East and the Warriors in the West.
- **nba_players_extended_v2** [uspro], 5,135 (all from balldontlie) rows, 1 rounds to verify.
  Games: NBA autocomplete for Connect 4, NBA Chain and Starting 5, NBA Connections (countries, draft slots), NBA Conquest and Front Office roster checks
  Evidence: Notes in useNbaLineup.ts and nbaConnectionsPuzzles.ts. simNbaLineupSearch covers search behaviour only, not facts.
  Gaps: Manute Bol's country is 'USA' (he was born in Sudan; the Connections header already works around this). 68% of rows have no position, 1,661 have no draft year and 335 have no country. The team column holds a single team (Bol shows only 'Washington Wizards'). 66 full names are shared (for example the two Patrick Ewings, a real father and son). Only one source.
- **nhl_draft** [uspro], 26,138 = 13,069 picks each stored twice (1963 to 2025) rows, 1 rounds to verify.
  Games: 82-0 Perfect Season NHL (goalie pool)
  Evidence: The perfectSeasonNhl.ts header records it, and the code works around it.
  Gaps: Columns are shifted on import: 'nationality' holds the drafting team and 'team' holds the country (McDavid: nat=Edmonton Oilers, team=Canada). The player column is 'Name (POS)'. Every row appears exactly twice.
- **nfl_team_seasons** [uspro], 2,225 (1920 to 2025) rows, 1 rounds to verify.
  Games: 17-0 Perfect Season NFL (reads only team_name, abbr and year)
  Evidence: The 2026-09-11 provenance inventory calls the wins, head_coach and playoff_result columns scrape garbage. The game gets coaches from nflCoaches.ts instead (certainty rule).
  Gaps: wins and losses are empty. head_coach holds text like '[ 124 ]' or 'Tom Brady ( MVP , OPOY ) ... Bill Belichick ( COY )'. playoff_result sometimes holds award text ('Patrick Willis ( DROY )'). The game avoids these columns, but the junk is still in the table.
- **nfl_draft_picks (Supabase)** [college], 28,015 rows, 1936 to 2025 rows, 1 rounds to verify.
  Games: Read only offline, by the College Grid key generator and the NFL Grid key generator. No page reads it at runtime. The retired college-grid-validate edge function still references it.
  Evidence: scripts/lib/draftRounds.mjs cleanDraftPicks drops forfeit rows and keeps one row per (year, pick). The round one boundary is derived from where round two starts. simCollegeGridKey sections 1 and 12 fence the cleaned reading, not the table.
  Gaps: The raw table is dirty. The 2024 draft is stored three times (770 rows for 257 picks) and so is 2025 (747 rows). An unparsed round is saved as 1 (1982 files picks 252 to 257 as round 1). There are forfeit placeholder rows whose 'player' is a sentence. 3,282 names are mirrored as 'Last, FirstFirst Last'. 13 names end in HOF ('Paul Warfield HOF') and 2 end in a number ('Matt Snell 3'). 87 rows have no college, 568 (year, pick) slots repeat, and there is no 2026 draft. The College Grid cleans all of this in code, but any new consumer that reads the table raw inherits it.
- **ncaa_player_stats (Supabase)** [college], 43,800 rows, 42,200 distinct players by slug, 407 schools, seasons 1985-86 to 2025-26 rows, 2 rounds to verify.
  Games: College Basketball Grid (/cbb-grid): judging guesses, the search list and board generation. Also /cbb-grid/archive, through gridArchive.json.
  Evidence: Nothing checks it for truth. simCbbGrid and simGridArchive only prove that boards are solvable and agree with this same table. There is no provenance note and no second source (the slugs look like a scraped career-points leaderboard).
  Gaps: (1) 1,600 players were loaded twice as identical rows, for example Aamir McCleary (ids 22833 and 23233), Zion Williamson, Bradley Beal and Ignas Brazdeikis. (2) 3 placeholder names are searchable in the game: '_ Johnston' (New Hampshire), '_ Ford' (Maryland Eastern Shore) and '_ Eldredge' (Hofstra). 29 positions are NULL. (3) It is a truncated leaderboard: nobody under 129 career points and nothing before 1985-86, so Michael Jordan, Patrick Ewing and Bronny James are absent. (4) NAMESAKE BUG in src/lib/cbbGrid.ts: byNormalizedName keeps one row per name (the last id wins), and 1,704 names are shared by 4,114 different players, so a correct guess is charged as wrong. 'Tim Duncan' resolves to a Memphis State Tim Duncan (132 points), so the Wake Forest Tim Duncan is refused. 'David Lee' goes to Jacksonville, 'Mike Miller' to Coppin State, 'Anthony Davis' to Iowa State (not Kentucky) and 'Isaiah Thomas' to Northern Arizona.
- **src/data/gridArchive.json (the CBB section is in my area. The same file holds NBA, MLB and NHL.)** [college], 56 boards (14 per sport) and 4,032 listed answers. CBB: 14 boards, 1,008 listed answers, 859 distinct names. rows, 1 rounds to verify.
  Games: /cbb-grid/archive (also /nba-grid/archive, /mlb-grid/archive, /hockey-grid/archive)
  Evidence: simGridArchive recomputes every board from its seed and every answer with playerMatchesCell against live data (control: badanswer). It iterates rows, not typed names, so it passes namesake answers the game refuses. Round 653 on docs/WORKBOARD.md claims the placeholder, the duplicates and the staleness.
  Gaps: CBB lists '_ Eldredge' (2026-08-24, Hofstra x Played Guard). 13 CBB cells list the same player twice, for example Bradley Beal twice at Florida x Started 2010 or Later and Travis Knight twice at Connecticut x 700+ Rebounds. The CBB 'total' counts include the duplicate rows. 92 of the 859 CBB names are shared names, and 6 listed answers are ones the game refuses: Tim Duncan (Wake Forest x 700+ Rebounds, 2026-08-17), David Lee and Mike Miller (Florida, 2026-08-23) and Isaiah Thomas (three Washington cells). The archive stopped at 2026-08-30 (generated 2026-08-31) but still says 'the last 14'. The NBA and NHL name lists came back clean on my filter (it only flagged real accented names).
- **cbb_programs (Supabase); cbb_daily is empty (0 rows)** [college], 281 programs (24 audited, 257 not) rows, 2 rounds to verify.
  Games: Guess the CBB Program (/guess-cbb-team)
  Evidence: The 24 seed rows were checked two-source on 2026-09-11 (docs/audits/cbb-programs-verification-2026-09-11.md) and are fenced by simCbbPrograms (champion list 1939 to 2026, control: count). Migration 20260911120000 is applied live (Michigan 1989 and 2026, Gonzaga to the Pac-12, the UConn and Villanova arenas). The 257 rows added 2026-06-23 to 2026-07-04 are checked by nothing, and the harness says so on every run.
  Gaps: There is a duplicate 'Loyola,Chicago' row (with a dash in the name) that says '0 national titles through 2025', while its twin 'Loyola Chicago' correctly says 1 (1963). One of the two answers teaches a false fact. 'Loyola (LA)' and 'Loyola Marymount' are the same school twice. Evansville's hint breaks the shape the other hints use. The arenas, conferences and nicknames of the 257 are unchecked. The title hints on the 17 extra programs that have won titles were right on my spot check.
- **cfb_qb_stats and cfb_rb_stats (Supabase)** [college], 5,800 and 14,800 rows, 1980 to 2025 rows, 1 rounds to verify.
  Games: The source that CFB Higher or Lower was copied from. The College Grid key also uses their school lists and college positions, but only on rows that join an entry.
  Evidence: Nothing checks the tables themselves. The College Grid uses them only as a joined second source under simCollegeGridKey sections 10 and 11.
  Gaps: The round-number row counts point to a truncated leaderboard scrape. There are placeholder first names: '_ Sullivan' (UTEP 2012), '_ Hawkins' (Texas State), '_ Polamalu' (Navy 2012) and more, 3 QB rows and at least 13 RB rows. Nothing before 1980, so Elway and Marino are truncated (noted in the cfbHLPlayers header). None of the junk reaches a game today.
- **CFB Dynasty schools (src/lib/cfbDynasty.ts, CFB_SCHOOLS)** [college], 44 schools. Every player is a generated, made-up name. rows, 1 rounds to verify.
  Games: CFB Dynasty (/cfb-dynasty)
  Evidence: Players are fictional by design (see the file header), so there is no real player data to verify. simCfbDynasty fences structure only (44 schools, the 12-team playoff, roster shape). Conferences and prestige have no source note.
  Gaps: Notre Dame is filed in the ACC, but in football it is an FBS independent, so the sim can crown it ACC champion and give it the ACC auto-bid. The header says '40-program subset' but the file ships 44. Prestige ratings are editorial.
- **src/data/f1Drivers.ts** [other], 20 drivers x 6 clues rows, 1 rounds to verify.
  Games: Guess The F1 Driver (daily)
  Evidence: No source note and no fact harness; the 2026-09-11 provenance inventory (docs/audits/data-provenance-inventory-2026-09-11.md, rank 11) lists it as unsourced clue text. simDailyPoolOrder only checks the daily draw.
  Gaps: Verstappen '63 race wins through the 2025 season': 63 was his total through 2024, and the site's own F1 Higher or Lower file says 71. Gasly '2 race wins': he has one (Monza 2020). Lawson 'Red Bull Racing (2025-present), partnered with the reigning champion': he was dropped after two races of 2025. Doohan 'Alpine (2025-present)': Colapinto replaced him during 2025. Tsunoda 'RB/VCARB (2021-present), the only Japanese driver on the 2026 grid': he moved to Red Bull in 2025 and has no 2026 race seat. Hadjar 'rookie at RB' and Bearman 'youngest British driver on the grid' are out of date for 2026.
- **src/data/f1Constructors.ts** [other], 31 teams x 6 clues rows, 1 rounds to verify.
  Games: Guess The Constructor (daily)
  Evidence: No source note and no fact harness (inventory rank 11). My spot check of the title counts for Ferrari 16, Williams 9, Mercedes 8, Red Bull 6, Lotus 7, Brabham 2, Cooper 2, Renault 2 and the single-title teams found them right.
  Gaps: McLaren 'Won 9 Constructors' Championships' and 'won the title again in 2024': the real count is 10, because McLaren also won in 2025. Cadillac 'set to join the grid in 2026 ... has not yet competed': it has raced since March 2026. Sauber 'set to become an Audi works team': it has been Audi since 2026. Can be fixed in the same round as f1Drivers.
- **src/data/f1PerfectLineupPool.ts** [other], 41 drivers rows, 1 rounds to verify.
  Games: Perfect Lineup: F1 (daily)
  Evidence: Header says only 'curated pool (authored with the owner's OK)'. There is no source and no harness. The ratings are admitted to be editorial, but the team and era fields are factual claims and are shown as the subtitle ('McLaren · 1990s').
  Gaps: Each driver has one team and one era, and some pairs are false together. Prost is 'McLaren, 1990s', but his 1990s were at Ferrari and Williams. Lauda is 'Ferrari, 1980s', but his Ferrari years were 1974 to 1977. Button is 'McLaren, 2000s', but he joined McLaren in 2010. Tsunoda is 'Red Bull', though most of his career was at AlphaTauri/RB. Constraint boards built on team plus era can accept these wrong pairings.
- **tennis_grand_slam_winners (Supabase)** [other], 1,019 (1877 to 2026, singles only) rows, 1 rounds to verify.
  Games: Name Them All (Wimbledon, US Open, Australian Open and French Open lists), Tennis Chain validator, source for tennisHLPlayers
  Evidence: simListQuizSources requires only Federer and Djokovic in the Wimbledon list. The tennisHLPlayers header records the table's known defects. There is no full-table check.
  Gaps: Two junk rows: the 2026 French Open men's and women's champions are NULL. The 2026 Wimbledon and US Open rows are missing entirely. The table stores one slam per year, so it drops the December 1977 Australian Open (Gerulaitis, Goolagong). Married-name splits (Margaret Smith/Court, Helen Wills/Wills Moody/Moody, Margaret Osborne/duPont) break per-player counts. runner_up is NULL on all 1,019 rows, so Tennis Chain, which is advertised as 'a chain of Grand Slam defeats', cannot check any defeat. Its validator only checks that the two players' slam-winning eras overlap.
- **golf_majors (Supabase)** [other], 526 (1860 to 2026, includes 25 Women's British Open rows) rows, 1 rounds to verify.
  Games: Name Them All (Masters, PGA, Open and US Open lists), source for golfLegends
  Evidence: simListQuizSources requires only Nicklaus and Woods in the Masters list. The quiz's onlyNames filter hides the placeholder rows. No full-table check.
  Gaps: 25 placeholder rows with a single-dash player name for years a major was not played. They are counted as a 'player' by any aggregation, and topped my 2+ majors query with 25. Bobby Jones is split across 'Bobby Jones' (5) and 'Bobby Jones' plus a double-dagger mark (2). The 2026 Masters (McIlroy) and 2026 PGA (Aaron Rai) rows have no recorded source check. The 2026 US Open and 2026 Open are missing. A backup, golf_majors_bak_20260715, sits beside it.
- **src/data/golfLegends.ts** [other], 61 golfers rows, 1 rounds to verify.
  Games: Guess The Golfer (daily), Golf Higher or Lower (daily), Face Off
  Evidence: Header: aggregated from golf_majors on 2026-08-05. The inventory lists it as strong provenance. There is no fact harness: simNationalityFlags checks only the flags.
  Gaps: Bobby Jones is shipped with 5 majors and a first win in 1926. The real record is 7 from 1923; the error comes from the name split in the source table. The header says 'men's major champions with 2+ majors', but 28 are missing, including Willie Park Sr. (4), Denny Shute, Ralph Guldahl, Jamie Anderson and Bob Ferguson (3 each), and Johnny Miller, Tony Jacklin and Hubert Green (2 each). McIlroy's 6 (last win 2026) depends on the 2026 Masters row, which has no recorded check.
- **src/data/aflGoalKickers.ts** [other], 60 retired goalkickers rows, 0 rounds to verify (critic corrected).
  Games: AFL Higher or Lower (daily), Face Off
  Evidence: Header: two-source verified 2026-08-20 (the aflonline.com.au all-time table cross-checked against documented career records). Retired players only, so the totals cannot go stale. simAflHL pins Lockett 1360, Coventry 1299, Dunstall 1254, Franklin 1066, Wade 1057 and Ablett Sr 1031, plus structure and the retirement rule.
  Gaps: Only the six 1,000-goal totals are pinned. The other 54 rely on the one table plus the header's check; my spot check of 10 of them agreed.
- **src/data/ufcFighters.ts** [other], 112 fighters rows, 2 rounds to verify.
  Games: UFC Guesser
  Evidence: The file's own Round 561 note says 'none of it is two source verified yet'. simUfcFacts proves only internal consistency (record string against wins/losses/draws, the cross-file match, finishes not exceeding wins); its header says green means 'consistent, never verified'.
  Gaps: Alex Pereira is shown 13-2 but is 13-3 after his two 2025 fights with Ankalaev. Ciryl Gane is shown 13-3 but is 13-2 plus a no contest. Ilia Topuria is shown 16-0 at Featherweight, but he went 17-0 and became lightweight champion in June 2025. Holloway (26-8) and Volkanovski (26-4) miss their 2025 wins. In general the records look current to late 2024 at best. mma_fighter_careers carries a DO NOT USE note and must not serve as the second source.
- **src/data/ufcChainData.ts (FIGHT_RESULTS)** [other], 64 fighters, 67 fight results rows, 1 rounds to verify.
  Games: Combat Chain
  Evidence: Hand-typed with no source. simUfcFacts compares fighter records across files but never checks the fight list.
  Gaps: These fights either never happened or went the other way, and the chain accepts each one as a valid link. Aspinall beat Jones at UFC 313: they never fought, and UFC 313 was Pereira v Ankalaev. Aspinall beat Gane by round 1 TKO: UFC 321 ended as a no contest. Edgar beat Aldo at UFC 200: Aldo won. Dillashaw beat Cruz at Fight Night 81: Cruz won. Sandhagen beat Dillashaw: Dillashaw won. Silva beat Bisping at Fight Night 84: Bisping won, and both directions are in the file. Couture beat Liddell at UFC 57: Liddell won that one; Couture's win was UFC 43. Figueiredo v Moreno at UFC 256 was a draw but is stored as a win. Wrong details: Makhachev v Tsarukyan is listed as a UFC 311 submission (it was a 2019 decision), Woodley v Lawler as a decision (round 1 KO), Pereira v Blachowicz as a TKO (split decision), and Johnson v Cejudo at UFC 197 as a decision (round 1 TKO).
- **src/data/olympicsAthletes.ts** [other], 48 entries rows, 1 rounds to verify.
  Games: The Medal Games (/olympics, daily)
  Evidence: No source and no harness (inventory rank 11).
  Gaps: Wrong medal totals: Biles is shown 7 gold, 1 silver, 2 bronze, but the real total is 7-2-2, and her own clue says 11 medals. Ledecky is shown 7-2 but is 9-4-1. Fraser-Pryce is shown 2-3-1 but is 3-4-1. Kipchoge is missing his 2004 bronze. Thompson-Herah is shown 5-3 but is 5-1. Vonn is shown 1-1 but is 1-2. Griffith-Joyner is missing her 1984 silver, and Rudolph her 1956 bronze. Bolt's 2008 entry says 3 golds, but the relay gold was stripped in 2017. Duplicates: Comaneci appears twice under two spellings, and Vonn appears twice, once as the guessable name 'Lindsey Vonn (2026 Return)'. The 2026 Winter entries (Shiffrin's giant slalom gold, Brignone, Bo, Sui and Han) have no source.
- **src/data/guessTheYearPuzzles.ts (hand-typed, 50 daily puzzles x 6 clues)** [trivia], 50 puzzles, 300 clues rows, 2 rounds to verify.
  Games: Guess the Year
  Evidence: No harness checks any clue: grep of scripts/ finds the file only in lastmod.json and guideHeadingsFrozen.json. No source note in the file. The site's own cfb_heisman_winners table contradicts three of the clues.
  Gaps: About 28 wrong or misdated clues across roughly 20 of the 50 puzzles. 1998: 'A Canadian NHL team won the Stanley Cup for the last time' (Detroit won in 1998; Montreal 1993 was the last Canadian winner, and the 1993 puzzle already says so), 'A Tennessee quarterback won the Heisman' (Ricky Williams of Texas won in 1998; no Tennessee QB has ever won it), and 'legendary point guard' for Jordan (he was a shooting guard). 2008: Tebow's Heisman (2007 in the site's own table) and 'most decorated Olympian ever in Beijing' (that happened in London 2012). 1994: 'A Brazilian legend won his 3rd World Cup' (nobody did). 2000: 'RB rushed 2,000 yards and won MVP' (Terrell Davis, 1998). 2020: Burrow's Heisman (2019) and two clues about Brady's Super Bowl LV (played Feb 2021, which the 2021 puzzle also uses). 1986: the SMU death penalty (1987) and Bo Jackson's Heisman (1985). 2012: 'Kings ended a 16-year Cup drought' (it was their first Cup ever). 1996: the Tyson ear bite (1997, also in the 1997 puzzle). 2018: 'A 20-year-old became the second teenager to score in a WC final' (Mbappe was 19). 1984: Dickerson's '2,105 yards in just 9 games' (it was 16 games). 2024: 'Chiefs first to win three straight (LVIII)' (LVIII was their second in a row). 2025: 'Chiefs won an unprecedented third straight (LIX)' (they lost LIX, and the same puzzle says the Eagles beat them), plus 'Seahawks won Super Bowl LX' (played Feb 2026). 1995: 'Braves' only World Series in Atlanta' (they won again in 2021, per the 2021 puzzle). 1990: the Giants' Super Bowl XXV (Jan 1991, also in the 1991 puzzle). 1991: Lewis's 'world-record-tying' 100m (his 9.86 was a new record). 1992: 'A boxing champion was convicted and stripped of his titles' (Tyson was no longer champion when convicted). 1985: Becker called 'youngest ever' Wimbledon champion (true only for men), and Super Bowl XX (Jan 1986). 2016 and 2014: the CFP title games were played in Jan 2017 and Jan 2015, while other puzzles go by calendar year. 2005: Armstrong's seventh Tour is presented as a win although it was stripped in 2012.
- **src/data/hofPlayers.ts (hand-typed stat lines)** [trivia], 26 players rows, 2 rounds to verify.
  Games: Hall of Fame or Bust (/hof-or-bust); hof_votes stores community votes only, not facts
  Evidence: No harness reads the file, and it has no source note. Several stat lines are another player's numbers: Jordan's 33,643 points is Kobe's total in orderTheList.ts, Ortiz's 3,465 hits is Jeter's, and Jagr's 1,249 is Ron Francis's assists.
  Gaps: About 20 of the 26 entries have at least one false stat. Only Brady, Rice, Bonds, A-Rod and Gretzky are fully right, and Rose is stale. Cristiano Ronaldo is shown with 1 Champions League (he has 5) and 4 league titles (he has 7). Henry is given a World Cup Golden Ball he never won and 'trophies in Italy' he never won. Busquets is shown with 118 goals, 5 Champions Leagues (he won 3) and 18 seasons at one club (it was 15). Owen gets 2 PL titles (1) and 'two rival clubs in the same city' (false). Peyton Manning gets 3 MVPs (he has 5) and Adrian Peterson 2 (he has 1). JaMarcus Russell gets 14,580 yards and 89 TDs (4,083 and 18). Lillard shows '0 All-Star selections' (he has 9). Yao shows 3 seasons and 5,667 points (8 seasons, 9,247 points). LeBron shows 2 Finals MVPs (4) and 4 teams (3). Oden is called the '#2 pick' (he went #1). Ortiz shows 609 HR (541). Prior is called the '#1 pick' with a 4.65 ERA (he went #2, ERA 3.51). Jagr shows 402 goals, 0 Cups and 'center' (766 goals, 2 Cups, right wing). Howe shows 0 Cups and 2 Harts (4 and 6). Crosby shows 319 goals and 1 Conn Smythe (600+ and 2). Messi shows 7 Ballon d'Ors (8). Pete Rose is 'Banned from baseball', but MLB lifted that in May 2025. Real people are also labelled 'bust' (Owen, Russell, Oden, Prior, Yakupov) next to these false numbers.
- **src/data/scorePredictorPuzzles.ts (hand-typed famous matches)** [trivia], 35 matches (15 soccer, 10 NFL, 10 NBA) rows, 1 rounds to verify.
  Games: Score Predictor
  Evidence: No harness reads the file. I checked all 35 scorelines against the record here and every one is right. The board labels the two sides 'Home' and 'Away' (ScorePredictorBoard.tsx lines 70 and 78).
  Gaps: sp-12, the 1994 Milan 4-0 Barcelona final, is dated May 24, 1994; the match was on 18 May 1994. At least 8 matches have home and away swapped even though the board shows those labels: Tottenham listed at home vs Ajax (the game was in Amsterdam); Chelsea listed at home over Bayern in 2012 (Bayern was the designated home side at the Allianz); and NBA games nba-1 (2016 Game 7 was in Oakland), nba-2 (1998 Game 6 was in Utah), nba-5 (2013 Game 6 was in Miami), nba-7 (2008 Game 4 was in LA), nba-8 (2011 Game 6 was in Miami) and nba-9 (2001 Game 1 was in LA). nba-6's hint and fun fact ('record-breaking performance', Klay in the 4th) describe WCF Game 6, not Game 7.
- **ucl_top_scorers_by_season (Supabase)** [trivia], 144 rows (98 usable, 68 distinct names after cleaning) rows, 1 rounds to verify.
  Games: List Quiz / Name Them All (ucl-topscorers list)
  Evidence: The LIVE BUG FIX note in listQuiz.ts (2026-07-15) says the rows mix three different column shifts. I confirmed with SQL that 46 rows hold a goal count in the player column, and that the season column runs from '1' to 'Zlatan Ibrahimovic'. onlyNames drops the bad rows. The promised re-scrape (task #45) was never done, and no harness pins anything in this table.
  Gaps: Players whose names sit in the shifted rows (for example Morata, Griezmann, Dzeko, Inzaghi and Gabriel Jesus appear in the season column) are left out of the answer list, so correct answers get marked wrong. Four names carry a dagger suffix ('Eusebio ‡', 'Ferenc Puskas ‡', 'Alfredo Di Stefano ‡', 'Gerd Muller ‡') that stripWinCount does not remove, so the reveal can show it. The blurb says 'near the top of the all-time scoring charts', but the data is per-season top scorers (Antoniadis, Sokol and the like).
- **shirt_number_puzzles (Supabase)** [trivia], 154 rows, 1 rounds to verify.
  Games: Sports Millionaire ('What shirt number does X wear?'); the Shirt Number game also reads it
  Evidence: No harness reads this table (a grep of scripts/ finds nothing), and the file has no source note. I read all 154 rows by SQL.
  Gaps: Wrong nationality flags: Vlahovic is shown as Croatia (he is Serbian) and Leon Bailey as Ghana (he is Jamaican). Cole Palmer and Joao Pedro are both #20 at Chelsea, so at least one is wrong. The question says 'does X wear' in the present tense, but several players have moved: De Bruyne 17 at Man City (market table: Napoli), Modric 10 at Real Madrid (market table: AC Milan), Trent 66 at Liverpool (market table: Real Madrid), Garnacho 17 at Man Utd (market table: Aston Villa). This table has Rashford at Barcelona while the market table has him at Manchester United. Best and Moore are labelled Premier League although their careers were before it existed. The nationality column mixes flags with words ('Brazil', 'Germany', 'France', 'Nigeria').

## unverified (9)

- **connections_puzzles (Soccer Connections)** [soccer], 326 boards, 1,304 groups, 672 distinct categories (179 'Played for', about 219 honours, about 164 stat thresholds) rows, 3 rounds to verify.
  Games: Connections (soccer)
  Evidence: Only shape and fairness are fenced: simLiveBoards and simFairPuzzles check four groups, no name twice and no twin boards. The criterion cross check against a stats table exists for NBA only. simTournamentWinners fences the source file that once produced 115 unsolvable quarantined boards.
  Gaps: No soccer group membership is checked against any record ('Over 100 Premier League assists', 'Scored 50+ goals in a calendar year', 'Captained their country at a World Cup'). A spot check of two boards found no error, but nothing would catch a wrong member or a second valid solution.
- **Soccer Career real star lists (careerEras.ts era 'stars', REAL_CONTENDERS in soccerCareerEngine.ts)** [soccer], About a dozen real names per era window, 8 windows rows, 1 rounds to verify.
  Games: Soccer Career (rivals, the simulated Ballon d'Or field)
  Evidence: simCareerEras fences structure only (windows, league keys). The simulated awards are fenced for internal consistency by simBallonDorTruth. There is no source note on the club assignments.
  Gaps: Typed by hand, one club per whole window: the 2015 to 2019 window puts Neymar at PSG (he was at Barcelona until 2017). REAL_CONTENDERS is frozen at 2024 ('startAge in 2024'). The game attaches simulated goal totals to real names.
- **transfer_grade_pool** [soccer], 1,745 (moves 2010 to 2023) rows, 2 rounds to verify.
  Games: Grade the Transfer (RETIRED: /grade-transfer redirects home)
  Evidence: No harness or source note. Junk checks are clean: 0 same club, 0 bad values, 0 duplicates.
  Gaps: No player sees it today. Grades are derived from market value changes in the same single-source dataset. The rounds figure applies only if the game comes back.
- **soccer_club_puzzles + src/data/soccerClubPuzzles.ts** [soccer], 364 clubs rows, 1 rounds to verify.
  Games: Guess the Club (RETIRED: /guess-soccer-club redirects home)
  Evidence: simGuessSoccerClubHints covers the hint shape only. Junk checks are clean (364 distinct clubs, none without names or facts).
  Gaps: No player sees it. The title counts, kit colours and facts have no source. The rounds figure applies only if the game comes back.
- **baseball_connections_puzzles** [uspro], 299 live boards rows, 2 rounds to verify.
  Games: Baseball Connections (/baseball-connections)
  Evidence: simLiveBoards and simFairPuzzles fence shape, duplicates and board count. 9 broken boards were fixed earlier, and 3 boards that were exact copies were deleted in Round 219. The fallback file has no provenance note.
  Gaps: Nobody has checked the facts behind the groups on any of the 299 boards.
- **nbaPerfectLineupPool.ts + nhlPerfectLineupPool.ts** [uspro], 66 + 57 players rows, 1 rounds to verify.
  Games: Perfect Lineup: NBA, Perfect Lineup: NHL, Gauntlet Draft: NBA
  Evidence: Curated by hand with the owner's OK. The file says the ratings are editorial.
  Gaps: The team ('most iconic franchise') and era fields are factual claims with no source and no harness. A sample looked right.
- **CBB Dynasty schools (src/lib/cbbDynasty.ts, CBB_SCHOOLS)** [college], 40 programs. Every player is a generated, made-up name. rows, 1 rounds to verify.
  Games: CBB Dynasty (/cbb-dynasty)
  Evidence: Players are fictional by design. simCfbDynasty section 3 and the orphaned scripts/cbbDynastyTest.ts cover roster shape only. Nothing records a source for the conferences.
  Gaps: The memberships I read match 2025-26 (Arizona, BYU and Houston in the Big 12, UCLA in the Big Ten, Texas A&M in the SEC), but nothing records where they came from. Gonzaga and San Diego State sit in a mid-major bucket even though both join the Pac-12 in 2026-27. That is a bucket, not a conference claim. Prestige ratings are editorial. This could share a round with the CFB Dynasty fix.
- **tennis_players (Supabase)** [other], 98 rows, 1 rounds to verify.
  Games: Guess The Tennis Player (daily), Tennis Chain player search
  Evidence: No harness and no source note. Only simUnboundedSelects touches it, for query shape. tennis_daily is empty (0 rows).
  Gaps: The Zverev and Mirra Andreeva rows (added 2026-07-03) say both won the 2026 French Open, but the site's own slam table has that final as NULL and no source is recorded. One of the two tables is wrong or stale, and I could not settle which: it is after my knowledge cutoff. Zverev 'broke through in the mid-2020s' is wrong, since he was top 10 from 2017. Federer 'dominated ... to the 2020s' (he retired in 2022). Names are spelled differently from the slam table (Ash Barty, Evonne Goolagong Cawley, Ilie Nastase, Manolo Santana, Marin Cilic), so the two tables cannot be cross-checked automatically.
- **Unread sport tables (f1_drivers, f1_drivers_full, f1_constructors, f1_constructors_full, f1_race_results, golf_awards, golf_major_results, golf_team_events, tennis_career_titles, tennis_tour_winners, tennis_year_end_no1, tennis_year_end_rankings, ufc_champions, ufc_fights, ufc_fights_v2, mma_fighter_careers, olympic_medalists, olympic_medals, nascar_driver_careers, nascar_teams, world_cup_matches, world_cup_player_stats)** [other], 720, 879, 213, 214, 860, 1,339, 502, 415, 26, 1,200, 104, 104, 3,408, 0, 3,917, 86, 0, 3,426, 103, 25, 684, 0 rows, 0 rounds to verify.
  Games: None: no src file or edge function reads them
  Evidence: A grep of src and supabase/functions finds no reader. The simUfcFacts header carries a DO NOT USE note for mma_fighter_careers: 15 of 86 rows claim more finishes than wins, and 63 have a prose career history in weight_class.
  Gaps: Players never see these, so they are not a live correctness problem. Do not wire any of them into a game without an audit first. Three are empty (ufc_fights, olympic_medalists, world_cup_player_stats), and the backups golf_majors_bak_20260715 and tennis_grand_slam_winners_bak_20260715 also sit in public.

## partial (61)

- **player_market_values (plus the views player_market_values_dedup, eligible_soccer_players, player_peak_values, game_player_pool, player_market_tracked)** [soccer], 141,916 raw rows (2004 to 2026, 5,496 of them for 2026); dedup view 136,178; eligible/peak views 27,850 names rows, 4 rounds to verify.
  Games: Almost every soccer game: Player Bingo, Footle, Who Am I, World XI, Rarity Round, Sign the Player, Pack Battle, Alphabet Sprint, Stock Market, Rebuild, Squad Deal, Sports Millionaire, Higher Lower Transfers (hidden route, still reachable), Build Your XI records check, and the bakes for Club Manager, Soccer Career squads and national pools
  Evidence: A Transfermarkt style dataset. The 2026 rows are an autumn 2025 snapshot, patched by the transfer overlay (simTransferOverlay) and a 243 player stale sweep (staleSweep2026.json, simValueFreshness). simMarketYearScope, simPlayerBingoPool and simValidatePlayerRecords guard how games read it.
  Gaps: person_key is NULL on all 141,916 rows, so one name counts as one person. That merges namesakes (Rodri, Paulinho, Lucas Silva), and the dedup view's DISTINCT ON (player_name, year) collapses them too. 5,247 (name, year) groups are duplicated, 3,838 of them exact name+year+club copies (Carvajal 2018 x2, Brennan Johnson 2025 x2). Ages in the 2026 rows are autumn 2025. Below the top of the pool, the January and summer 2026 windows are not applied (the repo says this needs a documented dataset refresh). Real players are missing: Lucas Herrington (Colorado Rapids), Aleksandar Pavlovic (Bayern; the 2026 Bayern rows have 20 names), Connor Metcalfe (St. Pauli), Kai Trewin (NYCFC). Serge Gnabry's newest row is 2025. 22 rows for 2026 say 'Without Club', 4 'Retired'.
- **career_players + career_seasons (plus the baked fallback src/data/careerPlayers.ts)** [soccer], 253 players, 3,608 season rows (173 with null assists) rows, 3 rounds to verify.
  Games: Transfer Path (its graph and the validation of chains), Career Ladder, Soccer Grid (import)
  Evidence: The 2025-26 tranche (77 generated projections) is quarantined. Only 27 researched rows are kept, recorded in careerSeasonTruth.json and fenced by simCareerSeasonTruth (six controls). simCareerFallback holds the fallback file equal to a fresh bake. simTransferPathSeasons holds the season linking rule.
  Gaps: The roughly 3,500 seasons before 2025-26 (clubs, goals, assists, appearances, market value) have no recorded two-source audit. Round 531 found that the old fallback gave Alisson two Roma seasons he never played, which shows the hand-typed history was wrong in places. Mixed season styles ('2020-2021' vs '2020') needed a special linking rule.
- **transfer_path_puzzles** [soccer], 885 (a backup table from 2026-07-10 holds 970 and is not read) rows, 0 rounds to verify (critic corrected).
  Games: Transfer Path (classic, active and Europe modes)
  Evidence: min_steps and the hints are derived by genTransferPathHints.mjs from the career tables and fenced by simTransferPathHints: every minimum equals the graph search, all 885 are reachable, and no 'Direct link' hint sits on a refused pair. Round 637 checked the two reported chains (tpa-662, tpa-199) and closed them as correct.
  Gaps: Only as true as the career tables underneath (PARTIAL above). 17 Jonathan David pairs are quarantined. The active pair set waits on the Round 531 refresh (203 pairs vs 212).
- **soccer_grid_puzzles + the Soccer Grid answer path (world_cup_players, stints, Gemini, ai_validation_cache)** [soccer], 710 puzzles (1,883 club cells, 987 position, 472 nationality, 470 league, 360 World Cup, 51 misc, 20 UCL, 17 award); 702 cached AI verdicts (433 accept, 269 refuse) rows, 2 rounds to verify.
  Games: Soccer Grid
  Evidence: simSoccerGridLabels: every club label can be satisfied, and no cached refusal contradicts the club rule. simSoccerStintNameFold covers accents. The validator fails closed ('unverified, try again').
  Gaps: Club cells confirm from a stints table that lags the 2026 window (307 missing pairs). Position, league, award and misc cells are judged by Gemini, and 702 cached verdicts are served without anyone reviewing them. Namesake merging in the stints can confirm a pick through the wrong man with the same name.
- **Player Bingo (playerBingo.ts over player_market_values, world_cup_players, ballon_dor; open report 2e3dc3dc)** [soccer], Pool of 467 players (top 1,000 rows since 2024, each name's newest row, top 500 by value) rows, 2 rounds to verify.
  Games: Player Bingo
  Evidence: Round 450 wrote 195 two-source summer 2026 moves covering every pool player who moved (simTransferOverlay). simPlayerBingoPool holds that each pool player is on his newest row and that impostor history rows are refused (the Rodri/Messi and Grimaldo cases).
  Gaps: Open report 2e3dc3dc (2026-09-05 02:42 UTC, 'Outdated info: transfers') is still unresolved in question_reports. It was filed the day Round 450 shipped. PROJECT-STATE still lists it as needing a documented dataset for moves outside the pool and outside England. The '10M+ Instagram followers' tile is a static list with no sources. The 'World Cup winner' tile only covers 2010 to 2022. The 'Champions League winner' tile infers squad membership from valuation years. The Lucas Hernandez PSG and Messi overlap is a known false positive, kept on purpose.
- **world_cup_players** [soccer], 9,613 (1970 to 2026; 1,236 for 2026 across 48 nations) rows, 1 rounds to verify.
  Games: Player Bingo ('played at a World Cup', 'World Cup winner'), Soccer Grid World Cup cells, Club Manager roster adjudication
  Evidence: The 2026 squads were two-sourced in Round 389 (Wikipedia squad templates via the API, then Al Jazeera, with Yahoo as tiebreak). 12 names with only one source were held back. simWorldCupSquads fences 48 nations and no duplicates from 2010 on (controls 'short' and 'dupe').
  Gaps: The 1970 to 2022 rows have no recorded source audit. The Player Bingo header calls them a raw wiki scrape. The 2026 import used Wikipedia as source one, which the house rule reserves for spot checks. 2026 names do not line up with the market table: 343 of 1,236 match no market value row by exact or folded name. Some are only spelling conventions (Son Heung-min vs Heung-min Son, Kim Min-jae vs Min-jae Kim, Andy vs Andrew Robertson), and others are genuinely absent (Lucas Herrington, Aleksandar Pavlovic, Auckland FC players).
- **ballon_dor** [soccer], 76 (Men 1956 to 2025 winners only, 69 years with 2020 correctly absent; Women 2018 to 2025, 7) rows, 1 rounds to verify.
  Games: Player Bingo Ballon d'Or tile (dormant), Sports Millionaire, Rarity Round
  Evidence: simListQuizSources pins 2024 Rodri and 2025 Dembele. I checked all 69 men's and all 7 women's winners by hand today and found no error.
  Gaps: The table has no source note, and only two years are pinned. It stores winners only (rank 1); points are null on every row and women's nationality is null. Soccer Career's simulated Ballon d'Or is a separate engine, fenced by simBallonDorTruth and simBallonDorFairness.
- **src/lib/missingFive.ts and src/lib/missingNine.ts** [soccer], 14 and 10 lineups rows, 1 rounds to verify.
  Games: Missing Five (NBA), Missing Nine (MLB)
  Evidence: Header notes: Five checked against basketball-reference box scores plus Wikipedia; Nine against baseball-almanac box scores corroborated by event lines (SABR for 2016 G7). Traps documented (Ezeli, Kukoc, Keefe, Hatcher, Contreras).
  Gaps: No content pin harness; only generic daily/fairness checks. Not soccer.
- **Football Connect 4 (FOOTBALL_CONNECT4_BOARDS in src/types/footballConnect4.ts + football-connect4-validate)** [soccer], 92 board labels; 1,452 cached AI verdicts rows, 1 rounds to verify.
  Games: Connect 4 (soccer)
  Evidence: simConnect4ClubRecords: the 'Played for X' squares (92 uses, 29 clubs) are confirmed from the stints table through an exact club map, and impostor clubs (Espanyol, Barcelona SC, Berekum Chelsea) are refused. Fails closed on AI error.
  Gaps: The non-club squares are judged by Gemini with cached, unreviewed verdicts. Club confirmations inherit the stints lag (for example Salah at Trabzonspor cannot be confirmed from records).
- **Build Your XI answer path (validate-player: player_market_values records pass, then national_team_squads names, then Gemini) + player_verified_positions** [soccer], player_verified_positions 134 (63 with secondary positions); 760 cached AI verdicts (734 accept, 26 refuse) rows, 1 rounds to verify.
  Games: Build Your XI, World XI (positions)
  Evidence: simValidatePlayerRecords: the records pass can only confirm, club and position must come from the same row, and impostor clubs are refused. simLineupVerifiedPositions and simWorldXiPositions: every secondary position claim has two stored sources (all 63), and the keeper boundary holds.
  Gaps: Most verdicts come from the AI and are cached without review (734 accepts). The records pass inherits the market table's namesake and coverage gaps. player_verified_positions covers only 134 players; 71 rows have no sources, but they claim no secondary position.
- **World XI pool (player_market_values year 2026 rows + player_verified_positions)** [soccer], Every 2026 market row with a value, plus the previous year's stars rows, 0 rounds to verify.
  Games: World XI
  Evidence: Reads the 2026 rows including the overlay; year scoping is fenced by simMarketYearScope. Positions are widened only by the two-source table.
  Gaps: Inherits the market table's gaps: autumn 2025 ages, missing players such as Aleksandar Pavlovic, and namesakes.
- **src/data/clubManagerRosters.ts (CM_ROSTERS, CM_ROSTER_META, CM_PARTIAL)** [soccer], 3,658 players, 330 clubs; 138 clubs in CM_PARTIAL rows, 3 rounds to verify.
  Games: Club Manager (2026-27 world)
  Evidence: Baked 2026-09-05 from the dedup view plus 239 overlay moves. rosterConfirmation2026.json records 26 rows adjudicated against the World Cup table and two-source web checks (16 confirmed, 18 moved, 4 removed, 4 not current). Fenced by simClubManager pins and simRosterAdjudication.
  Gaps: 314 baked players are still 'pending': their newest row is 2025, so they ship at last season's club with nothing on screen saying so. 138 of 330 clubs (Aberdeen, Hearts, Toronto FC, LA Galaxy, Standard Liege and more) have fewer than 8 real players and are padded with youth, and AC Horsens and ADO Den Haag ship empty. Ages are autumn 2025. Colorado Rapids has 8 players and no Lucas Herrington. Diogo Jota was removed without a second source.
- **REAL_LEAGUES memberships + src/data/clubManagerFinalTables2025_26.ts** [soccer], 27 league definitions, 20 modern leagues, 330 clubs; final tables for 15 leagues rows, 0 rounds to verify (critic corrected).
  Games: Club Manager (league structure, season one European places)
  Evidence: 2026-27 memberships were two-sourced league by league (Rounds 72 and 18x, for example the Danish and Swiss leagues against Wikipedia plus worldfootball or Nau.ch). Final table positions come in only when two source families agree (Round 612), with the URL and read date on every row.
  Gaps: Leicester City is in no 2026-27 competition (the league they dropped to is not modelled), so Footle labels them 'Other'. Liga MX and Czechia are not modelled.
- **Club Manager era worlds (clubManagerEra2005.ts, Era2010.ts, Era2015.ts)** [soccer], 747, 802 and 1,098 players; 40, 40 and 60 clubs rows, 1 rounds to verify.
  Games: Club Manager era saves (2005-06, 2010-11, 2015-16)
  Evidence: Built from the year 2005/2010/2015 market value rows with verified window corrections (26, 11 and 134 moves). Memberships checked against Wikipedia plus worldfootball. simNationalities pins across worlds, and simEraWorldTables covers the engine.
  Gaps: Names, values and positions come from a single dataset (Transfermarkt rows), with no second source per player. Thin clubs are marked partial: Alaves and Cadiz (2005), Blackpool (2010), Frosinone and Las Palmas (2015).
- **src/data/clubSquads.ts (Soccer Career real teammates and depth chart)** [soccer], 450 club seasons, 8,155 player rows (2016 to 2026) rows, 1 rounds to verify.
  Games: Soccer Career (the flagship)
  Evidence: simClubSquads: exact club map, no wrong club grabbed, nobody in two clubs in one season, and the game shows nothing rather than guessing.
  Gaps: Baked on 2026-08-21, before both overlay migrations (Rounds 393 and 450), and nothing checks it against the live table. The 2026 squads still have Salah at Liverpool, Goretzka and Nicolas Jackson at Bayern, and Marmoush at Man City. It inherits the market table's namesake and coverage gaps.
- **src/data/players.ts (the baked fallback pool)** [soccer], Baked from the 2026 market rows plus the overlay (it replaced 748 hand-typed rows in Round 531) rows, 0 rounds to verify.
  Games: Footle fallback, Squad Deal, Club Manager, Perfect Lineup, Sports Bingo, Gauntlet Draft
  Evidence: simPlayersPool: every row matches its live row, and the file equals a fresh bake byte for byte (controls 'handedit' and 'agezero').
  Gaps: A faithful copy of a PARTIAL table. 1,375 of 1,507 pool players have no squad number (Round 443), and the games say so.
- **src/data/higherLowerPlayers.ts** [soccer], 199 players rows, 1 rounds to verify.
  Games: Higher or Lower (soccer), Face Off soccer categories
  Evidence: Round 535: 70 rows have caps two-source verified (RSSSF plus the national record); 129 carry one named publisher with a URL. Career assists and trophies were deleted.
  Gaps: Club appearance and goal totals are marked unchecked on screen. 129 cap figures have only one source.
- **bref_nba_player_seasons** [uspro], 30,462 player-team-seasons (1949-50 to 2024-25) rows, 1 rounds to verify.
  Games: NBA Stat Line, Stat Detective, 82-0 Perfect Season NBA, NBA HL bake, source of nba_player_team_stints
  Evidence: Derived from Basketball Reference, a documented source. Round 486 repaired double-encoded names, now fenced live by simNbaChainNames. simNbaStatLine and simPerfectSeason test the game engines, not the values.
  Gaps: No 2025-26 season, while nba_player_stats has it. person_key is empty on every row, so namesakes merge when rows are grouped by name (two different Charles Joneses on the 1988-89 WSB; the 'Eddie Johnson' merge was dropped from the HL pool). games is empty on every row, and pre-1951 minutes and pre-1973 steals and blocks are empty (all disclosed). No value anchors are fenced.
- **nba_player_team_stints** [uspro], 13,948 stints, 4,773 players (1949 to 2024) rows, 1 rounds to verify.
  Games: NBA Chain (nba-chain-validate)
  Evidence: Built from bref. simNbaChainNames checks name encoding, accent folding and a live battery of accented stars. The validator tells players its data runs through 2024.
  Gaps: Missing 2025-26: Durant's HOU stint and Clarkson's NYK stint are not there, and 2025 rookies (Cooper Flagg, Maluach) get 'does not appear in our NBA records (1949-2024)'. Links between two active players are deferred instead of rejected, which is honest.
- **mlb_grid_players** [uspro], 3,264 careers (1871 to 2019) rows, 1 rounds to verify.
  Games: MLB Franchise Grid, MLB Connect 4 autocomplete
  Evidence: mlbGrid.ts docstring (2026-07-21). simMlbGridPool pins Ruth ATL,BOS,NYY/714, Aaron 755 and Jeter 3,465. simGridCells checks cell coverage.
  Gaps: By design it only has careers finished by 2019 with 500+ games (the page says so), so Ohtani, Judge, Trout, Kershaw and Verlander are not in it. The 500-game floor also drops Cy Young winners Sandy Koufax, Pedro Martinez and Roy Halladay, so MLB Connect 4 never suggests them (typing the name still works). One documented dataset (Lahman), with 3 values pinned.
- **lahman_* tables (batting, pitching, people, teams, appearances)** [uspro], batting 110,495, pitching 49,430, people 20,673, teams 2,985, appearances 110,423 (ending 2021) rows, 1 rounds to verify.
  Games: 162-0 Perfect Season MLB, MLB HL bake, mlb_grid_players source
  Evidence: Lahman is a documented public dataset. simPerfectSeason section 5 checks that live squads have the right shape. No harness pins values.
  Gaps: Ends at 2021, so nothing after that exists. lahman_awards_players holds 8 rows, a truncated import (no game reads it).
- **mlbHLPlayers.ts** [uspro], 55 players rows, 1 rounds to verify.
  Games: MLB Higher or Lower, Face Off (MLB HR category)
  Evidence: Built from lahman_batting joined to lahman_people on 2026-07-22. The header lists 9 anchor values (Bonds 762, Aaron 755, Ruth 714, A-Rod 696, Mays 660, Griffey Jr. 630).
  Gaps: Only careers finished by 2019, which is honest. Single source, and no harness pins the values.
- **nflfastr_player_stats + nfl_team_defense** [uspro], 134,470 weekly rows (1999 to 2024) + 829 team-defense seasons rows, 1 rounds to verify.
  Games: 17-0 Perfect Season NFL, NFL HL bakes, NFL Connections authoring
  Evidence: nflverse is a documented dataset. nfl_team_defense is derived from it (2026-08-05). simPerfectSeason checks squad shape only.
  Gaps: No 2025 season. One duplicate player-week key. Totals drift 1 or 2 from the official record (see the NFL HL entry).
- **frontOfficePlayers.ts (NFL)** [uspro], 512 player rows (from 2,902 nflverse 2026 roster rows) rows, 1 rounds to verify.
  Games: NFL Front Office, Gauntlet Draft: NFL
  Evidence: Generated 2026-09-02 by genFrontOfficeRoster from the nflverse 2026 rosters. Fenced by simFrontOfficeRoster (defence present, rating spread, header and copy match the method). Caps come from leagueCaps.ts (two publishers, simLeagueCaps). Contracts are fictional and labelled as such.
  Gaps: The fence checks how the file was built, not who is on each team against a second source. PROJECT-STATE: ages and the pool below $60M still wait on a documented dataset. It is a snapshot from 2026-09-02.
- **mlbFoPlayers.ts** [uspro], 390 (13 per team) rows, 1 rounds to verify.
  Games: MLB Front Office, Gauntlet Draft: MLB
  Evidence: Generated 2026-08-05 from MLB StatsAPI (the league's official source). Overalls come from 2025 OPS and FIP percentiles. Contracts are fictional and labelled as such. No harness reads the file.
  Gaps: Single official source, not fenced. Moves after 2026-08-05 are missing.
- **nhlFoPlayers.ts** [uspro], 416 (13 per team) rows, 1 rounds to verify.
  Games: NHL Front Office
  Evidence: Generated 2026-08-05 from api-web.nhle.com (2026-27 rosters after free agency). Overalls come from 2025-26 stats. Contracts are fictional and labelled as such. No harness.
  Gaps: Single official source, not fenced. Moves after 2026-08-05 are missing. Players with no 2025-26 season default to 68.
- **conquestDataNba.ts NBA_TEAMS (10 per team)** [uspro], 30 teams, about 300 roster slots (368 names including legends and free agents) rows, 1 rounds to verify.
  Games: NBA Front Office, NBA My Career modern league, NBA Conquest
  Evidence: Roster audit on 2026-07-10 against NBA.com trade trackers and nba_players_extended_v2, which corrected 85 slots. The file says openly that ratings and colours are hand-set. The conquest harnesses check structure only.
  Gaps: Typed by hand, no harness pins who is on which team. Moves after 2026-07-10 are not applied (the Kawhi to TOR deal was on hold at audit time, so Leonard is still listed at LAC). Ratings are editorial.
- **nba_connections_puzzles (+ nbaConnectionsPuzzles.ts fallback)** [uspro], 20 live boards (4 offline fallback) rows, 1 rounds to verify.
  Games: NBA Connections
  Evidence: Checked against nba_player_stats, nba_players_extended_v2 and nba_draft_picks on 2026-07-21. simLiveBoards cross-checks franchise and counting-stat groups against nba_player_stats in both directions (it found and fixed 4 live boards with two solutions in Round 219).
  Gaps: Groups based on awards, draft slot or birthplace are counted but not checked. Legends missing from the table (West, Russell) are reported rather than checked.
- **nfl_connections_puzzles + nhl_connections_puzzles** [uspro], 20 + 20 live boards rows, 1 rounds to verify.
  Games: NFL Connections, NHL Connections
  Evidence: The static headers say every fact was checked against nflfastr, nfl_player_team_stints (from 2002) and nfl_draft_picks, or against nhl_player_stats, on 2026-07-22. simLiveBoards fences only shape, duplicates and board count. My spot check of nflconn-019 and nflconn-020 found no errors.
  Gaps: No harness cross-checks facts for the live NFL or NHL boards. NHL themes inherit the pre-1967 cutoff in nhl_player_stats.
- **nbaCareerPlayers.ts** [uspro], 20 players rows, 1 rounds to verify.
  Games: NBA Career Path (/nba-career)
  Evidence: The header says it was checked against nba_player_stats, nba_players_extended_v2 and nba_draft_picks on 2026-07-22. My spot check matches (LeBron 12,085 reb and 11,998 ast in the table, shown as '12,000+ Reb, 11,900+ Ast'). Active players use '+' totals.
  Gaps: No harness. Team order and awards are called 'standard record-book facts' without a second source.
- **nhl_players** [uspro], 1,752 = 876 players each stored twice rows, 1 rounds to verify.
  Games: Puck Detective (NHL who-am-I)
  Evidence: puckDetective.ts docstring (2026-07-03). No empty values. Teams match 2025-26 (Marner VGK, Rantanen DAL). The game removes the duplicates in code.
  Gaps: Every row is duplicated. It is a snapshot of current rosters with no date or source recorded. No harness on facts.
- **US My Career real-league context (era team lists, playoff formats, caps)** [uspro], 4 games (fictional player, real teams, formats and caps) rows, 1 rounds to verify.
  Games: NBA, NFL, MLB and NHL My Career
  Evidence: Playoff and postseason format histories are tier A (two sources, fenced by simNbaPlayoffFormatHistory, simNflPlayoffFormatHistory, simNhlPlayoffFormatHistory, simMlbPostseasonFormatHistory). Caps have two publishers each (simLeagueCaps). simInventedNames and simNoInventedQuotes guard names and quotes.
  Gaps: The NBA 2003-04 era team list is two-sourced only in a comment and has no harness. Modern team lists inherit the conquest data files, which are not fenced.
- **cfb_heisman_winners (Supabase)** [college], 91 rows, 1935 to 2025, 90 people (Archie Griffin won twice) rows, 1 rounds to verify.
  Games: College Grid (the Heisman Winner label, through the key) and List Quiz 'Heisman Trophy Winners'
  Evidence: simListQuizSources pins 2024 Travis Hunter and 2025 Fernando Mendoza. simCollegeGridKey section 6 fences the shape (91 rows, 91 years, 90 winners, each on exactly one key entry). The listQuiz.ts note spot-verifies 4 years. There is no recorded two-source audit of all 91 rows.
  Gaps: I read all 91 rows and found no wrong winner or school (Reggie Bush 2005 is correctly present after the 2024 reinstatement), but that read is not a documented second source. The position codes are unaudited era codes (HB, E, 'HB/QB', 'CB/WR'). Only 2 of the 91 rows are pinned.
- **src/data/cfbHLPlayers.ts** [college], 65 quarterbacks rows, 1 rounds to verify.
  Games: CFB Higher or Lower (/cfb-higher-lower)
  Evidence: The header says the values were copied from cfb_qb_stats, with 11 anchors checked against the record book on 2026-07-21. I checked all 65 against cfb_qb_stats today and all 65 agree. No harness reads the values (only playGames, simDateDraws and simPrerender touch the route).
  Gaps: Single source: the file is a copy of the same table. It follows the NCAA record book convention of not counting bowl games before 2002 (Brees 10,909 rather than 11,792). That is documented but differs from the totals some fans quote. With no fence, an edited number would ship unnoticed. The pool is frozen at the 2024 season.
- **src/data/f1HLDrivers.ts** [other], 42 drivers (8+ career wins) rows, 1 rounds to verify.
  Games: F1 Higher or Lower (daily), Face Off
  Evidence: Header: baked from f1_driver_standings on 2026-07-22, with 10 anchors checked against the canonical record (Hamilton 105, Schumacher 91 and others). The inventory lists it as strong provenance. My spot check of all 42 win totals against the record through 2025 agreed. No harness pins the numbers (simDateDraws checks only the draw).
  Gaps: This is a snapshot through 2025. Totals for drivers still racing (Verstappen 71, Hamilton 105, Norris 11, Piastri 9, Leclerc 8, Alonso 32) go stale during the 2026 season, and nothing flags it. Button's constructor list leaves out Williams, Benetton and Renault.
- **f1_driver_standings (Supabase)** [other], 3,095 (1950 to 2025, 76 seasons, 35 distinct champions) rows, 1 rounds to verify.
  Games: Name Them All (F1 champions list), source for f1HLDrivers
  Evidence: simListQuizSources requires Verstappen, Hamilton, Schumacher and Norris in the list and pins the 2025 champion (Norris). The 2026-07-15 audit_name_columns scan found the name column 0% bad. The champion count of 35 matches the real record.
  Gaps: There is no recorded second source for the full standings, only for champions via pins. Classified-out drivers carry position NULL. That does not affect the games, which read only position 1. The 2026 season is not in the table yet.
- **src/data/tennisHLPlayers.ts** [other], 44 champions rows, 1 rounds to verify.
  Games: Tennis Higher or Lower (daily), Face Off
  Evidence: Header: aggregated from tennis_grand_slam_winners on 2026-07-21, with anchors checked (Djokovic 24, Court 24, Serena 23, Nadal 22, Graf 22, Federer 20). Disputed totals (Lenglen, Cochet, Goolagong) are left out on purpose and the reason is recorded. No harness.
  Gaps: The header itself says the counts run only through the 2026 Australian Open. The French Open, Wimbledon and US Open have been played since, so Alcaraz 7, Sinner 4, Swiatek 6 and Sabalenka 4 may now be short. No fence flags the drift.
- **afl_premiers (Supabase)** [other], 129 (1897 to 2025) rows, 1 rounds to verify.
  Games: The Record Books, Champ or Not, Name Them All, Silverware Sort, Hall of Champions
  Evidence: Winners were two-source verified 2026-08-20 (afl.com.au against aflonline.com.au, agreeing on every year). simListQuizSources holds an exact ratchet: 129 seasons, 18 names, and the famous flag counts.
  Gaps: The page promises 'each club under the name it wore at the time', but 1999 is listed as North Melbourne. The club played as the Kangaroos from 1999 to 2007, so Silverware Sort counts North Melbourne 4. The winners are right. This is a naming fix that also has to move the ratchet, and it can go in one naming round with the other Record Books tables.
- **afl_brownlow (Supabase)** [other], 112 medals, 91 players (1924 to 2025) rows, 0 rounds to verify (critic corrected).
  Games: The Record Books, Name Them All, Champ or Not
  Evidence: Two-source verified 2026-08-25 (afl.com.au/brownlow-medal/history against afltables.com; two afltables vote errors were resolved from its own detail pages). simListQuizSources holds an exact ratchet: 112 rows, 91 names, the 1942 to 1945 vacancy, the twelve tie years, the four triple winners, 1996 Voss at the Brisbane Bears, and the vote range.
  Gaps: None known.
- **nrl_premiers (Supabase)** [other], 117 (1908 to 2025; 1997 twice; 2007 and 2009 vacant) rows, 1 rounds to verify.
  Games: The Record Books, Champ or Not, Name Them All, Silverware Sort, Hall of Champions
  Evidence: Winners were two-source verified 2026-08-20 (the Wikipedia premiers roll against Topend Sports, agreeing on every year). simListQuizSources holds an exact ratchet: 117 rows, 20 names, the stripped years vacant, and the famous counts. My check of every club's total agreed.
  Gaps: Club names follow two rules at once. Era names are used for Eastern Suburbs/Sydney Roosters and St George/St George Illawarra, but 'Canterbury-Bankstown Bulldogs' covers all 8 titles from 1938 to 2004: the club was 'Canterbury-Bankstown' in 1938 and 1942 and played as the Bulldogs in 2004. 'South Sydney Rabbitohs' covers all 21 titles from 1908; Manly and Parramatta also use modern names. As a result, Silverware Sort compares Roosters 4 against Canterbury 8 under different rules. The harness pins the modern names, so a fix must move the ratchet too.
- **nrl_dally_m (Supabase)** [other], 47 medals, 34 players (1979 to 2025) rows, 0 rounds to verify (critic corrected).
  Games: The Record Books, Name Them All, Champ or Not
  Evidence: Two-source verified 2026-08-25 (rugbyleagueproject.org against topendsports.com, agreeing on every year). simListQuizSources holds an exact ratchet: 47 rows, 34 names, 1997 and 2003 vacant, 2014 and 2016 shared, Thurston 4, Johns 3.
  Gaps: Winners only. The club is deliberately not shipped because only one source had it.
- **US and English champion tables (super_bowls, nba_finals, world_series_v2, stanley_cup_finals_v2, wnba_finals, cfb_national_champions, ncaa_basketball_champions, soccer_league_champions English rows)** [other], 60 + 80 + 121 + 110 + 29 + 49 + 87 (men's D1) + 127 (English top flight) = 663 rows, 1 rounds to verify.
  Games: The Record Books, Champ or Not, Who'd They Beat, Name Them All, Silverware Sort, Hall of Champions
  Evidence: Rounds 232 to 248 machine-checked each table against an independent list (Topend Sports, ESPN, NCAA, NHL), and source errors were recorded rather than copied. simListQuizSources adds year pins for recent seasons, shape fences on the four finals tables and the cfb pins; simChampOrNot also covers them. My per-club title counts for all eight matched the real record.
  Gaps: The 2026 rows (Seahawks 29-13 with Kenneth Walker III as MVP, Knicks 4-1 with Brunson as MVP, Hurricanes 4-2 over Vegas, Michigan 69-63 over UConn, Arsenal) were 'verified against news sources on 2026-08-20' with no publisher named, and only the winner is pinned, not the score, MVP or venue. Two era names break the tables' own convention (they otherwise use Oklahoma A&M, Boston Americans and Chicago Black Hawks): 1966 NCAA 'UTEP' was Texas Western, and the 1903 and 1904 English champion 'Sheffield Wednesday' was The Wednesday until 1929. 1918 'Toronto Hockey Club' is a recorded ruling against the source's 'Arenas', which is defensible but should match what the other games use.
- **src/data/recordBooks.json** [other], 12 sections, 1,068 rows rows, 1 rounds to verify.
  Games: The Record Books (/records), and the per-competition pages Round 649 is building
  Evidence: Generated by scripts/genRecordBooks.mjs from the tables above. simRecordBooks checks section floors, that rows have a champion and a year, that champion names reach the saved snapshot (with a negative control), and that the file matches the live tables.
  Gaps: simRecordBooks compares only the first 4 sections (Super Bowl, NBA, World Series, Stanley Cup) against the live database (RECORD_SECTIONS.slice(0, 4)). The other 8, including all four Australian sections, can drift from the tables unnoticed. It carries every naming issue listed above: NRL Canterbury-Bankstown 1938 to 2004 and South Sydney Rabbitohs from 1908, AFL North Melbourne 1999, English Sheffield Wednesday 1903 and 1904, NCAA UTEP 1966, and the Toronto Hockey Club 1918 ruling. The 2026 rows have no named source.
- **nascar_champions (+ nascar_drivers name table)** [other], 77 seasons (1949 to 2025); nascar_drivers 83 names rows, 1 rounds to verify.
  Games: NASCAR Chain validator, Name Them All (NASCAR champions), Guess The NASCAR Driver clues
  Evidence: Complete for every season. simListQuizSources pins Larson in the list; simNascarDriver reads championship counts against it. My check of every multi-title count (Petty, Earnhardt and Johnson 7, Gordon 4, Logano 3 and others) and of 2016 to 2025 agreed. The validator fails closed.
  Gaps: No second source is recorded for the table. nascar_drivers, the name table the chain searches, is a stub: every stat column is null, and it lacks three champions, David Pearson (3 titles), Red Byron and Bill Rexford. The validator still accepts them because it reads the champions table.
- **nascar_race_results + nascar_cup_races** [other], 2,104 + 72 rows, 1 rounds to verify.
  Games: Guess The NASCAR Driver clues (via nascarDrivers.json), NASCAR Chain validator
  Evidence: The genNascarDrivers.mjs header documents what the rows can and cannot support. Each row is used only as 'X won this race in this year' and never totalled; simNascarDriver checks that.
  Gaps: 19 seasons are missing (1952, 1954, 1955, 1957 to 1969, 1979, 1982 and 1983), which is why Junior Johnson and Ned Jarrett have no rows. Exhibition races (the Clash and the Daytona qualifiers) are mixed in with points races. No second source is recorded for the rows the clues use.
- **src/data/nascarDrivers.json** [other], 59 drivers x 6 clues rows, 1 rounds to verify.
  Games: Guess The NASCAR Driver (daily)
  Evidence: simNascarDriver section 3 parses every shipped clue and checks it against the raw table rows, with 'blank' and 'drift' negative controls. My spot check of Kulwicki's race clues (1988 Checker 500, 1991 Bud 500, 1992 Food City 500) agreed.
  Gaps: The clues are only as true as the two source tables above, which have no second source. Verifying those tables verifies this file, in the same round.
- **src/data/emojiPuzzles.ts (hand-typed emoji riddles)** [trivia], 65 puzzles rows, 1 rounds to verify.
  Games: Emoji Guess
  Evidence: The file header says every answer and hint was fact-checked when written. simDateDraws.mjs only checks the daily draw, and no harness checks the facts. I read all 65: the answers and famous facts are right (8 Ballon d'Ors, Ancelotti's 5 Champions Leagues, Kane as England's record scorer, Aguero 93:20).
  Gaps: Son's hint 'North London's smiling captain' has been stale since he joined LAFC in Aug 2025. The De Bruyne hint 'assist king of the Etihad' is past tense only by implication (he is at Napoli now). There is no second source and no fence, so an edit could introduce an error that nothing catches.
- **src/lib/minefield.ts MINEFIELD_CATEGORIES (hand-typed members and mines)** [trivia], 34 categories, about 350 tiles (members plus mines) rows, 1 rounds to verify.
  Games: Minefield
  Evidence: The header says 'hand-checked common knowledge' and most titles are locked to an era ('through 2025') so a new champion cannot turn a mine into a member. I checked every member and every mine in all 34 categories here and found none wrong. No harness checks the facts: simSafari and playIphone only check the UI.
  Gaps: There is no two-source record and no fence. One code comment is wrong ('Suarez at 82' PL goals; he scored 69), but it is not shown to players. A few categories are not era-locked ('Undisputed UFC champions', 'England 100+ caps', 'MLB 3,000-hit club'); they are safe only because every mine in them is retired.
- **src/lib/orderTheList.ts RANK_ROUNDS (career totals copied from Supabase on 2026-07-22)** [trivia], 14 rounds x 5 players rows, 1 rounds to verify.
  Games: Rank 'Em
  Evidence: The header says the values came from nba_player_stats, nhl_player_stats and mlb_batting_stats on 2026-07-22, which is one source. simFairPuzzles.mjs section 3 checks only for ties and duplicate ids. The retired players' totals match the record on my read (Kobe 33,643, Stockton 15,806, Bonds 762, Henderson 1,406, Marleau 1,779 and so on).
  Gaps: Active players' totals are frozen (Curry 4,242, Harden, Klay 2,895, Chris Paul, Ovechkin 928). Klay is 78 threes behind Ray Allen's 2,973, so the fixed order in nba-3pm is likely to become wrong during the 2026-27 season. There is no second source and nothing checks the values against the tables.
- **afl_premiers, nrl_premiers, afl_brownlow, nrl_dally_m (Supabase)** [trivia], 129 + 117 + 112 + 47 rows, 0 rounds to verify (critic corrected).
  Games: List Quiz (4 lists), Champ or Not, Silverware Sort (afl, nrl), Hall of Champions (afl, nrl wings), Record Books
  Evidence: Built from two sources in Rounds 234, 236 and 291 (afl.com.au vs aflonline, Wikipedia vs Topend, afl.com.au vs afltables, rugbyleagueproject vs topendsports). simListQuizSources.mjs pins each table exactly: row counts, every season's row count, tie and vacant years, distinct names, and the famous totals per club and player.
  Gaps: No known errors. The 2026 grand finals and medals (late Sep and Oct 2026) will need new rows, and the pinned numbers have to be raised at the same time.
- **super_bowls, nba_finals, world_series_v2, stanley_cup_finals_v2, wnba_finals, ncaa_basketball_champions (Supabase)** [trivia], 60 + 80 + 121 + 110 + 29 + 87 rows, 1 rounds to verify.
  Games: List Quiz, Champ or Not, Who'd They Beat, Silverware Sort, Hall of Champions, Quiz Board and Ball IQ (super_bowls and nba_finals through jeopardy_clues), Record Books
  Evidence: Rounds 233 to 248 repaired the shifted columns and filled in every loser, series result and score, cross-checked three ways. simListQuizSources pins the 2025 and 2026 winners, checks column shape (loser never a digit, series always winner first, person columns never hold digits) and sets minimum row and loser counts. simChampOrNot, simWhodTheyBeat, simSilverwareSort and simHallOfChampions prove the games agree with these tables. My SQL: no duplicate years, no missing losers, and the 2023 to 2026 rows match the record.
  Gaps: There is no row-by-row pin, so a wrong older winner, loser or MVP (say 1987) would pass every harness. nba_finals finals_mvp is NULL for 1947 to 1968, which is correct because the award started in 1969. Silverware Sort's Stanley Cup counts start in 1915, which leaves out pre-1915 challenge Cups (for example the original Ottawa Senators' early titles), and the board does not say so.
- **cfb_national_champions (Supabase, rebuilt Round 232)** [trivia], 49 rows, 1981 to 2025, split titles included rows, 1 rounds to verify.
  Games: List Quiz (cfb-champs), Champ or Not, Silverware Sort, Hall of Champions
  Evidence: Rebuilt season by season in Round 232 after a corrupted scrape. simListQuizSources pins 5 seasons, rejects Oregon, and requires at least 20 distinct champions. I read all 49 rows here and they match the major-selector record (1990, 1991, 1997 and 2003 splits correct).
  Gaps: There is no full row-by-row pin. There is also a display bug: Silverware Sort titles the board 'Most college football national titles' but the counts cover 1981 onward only (Alabama 7, Notre Dame 1) and nothing says so. The order it teaches can contradict all-time claims (for example Notre Dame ranked below Nebraska and Miami).
- **soccer_league_champions, English slice only (English Premier League + English First Division)** [trivia], 127 of 1,631 rows (93 First Division 1889 to 1992, 34 PL 1993 to 2026) rows, 1 rounds to verify.
  Games: List Quiz (epl-champs), Champ or Not, Silverware Sort, Hall of Champions, Quiz Board, Ball IQ
  Evidence: The 2026-07-15 audit (noted in fetchQuizBoard.ts) found only these two English leagues trustworthy. simListQuizSources requires only arsenal, liverpool and manchester united to appear. My SQL title counts per club all match the real record (Liverpool 20, Man Utd 20, Arsenal 14 including 2025-26, Man City 10, Everton 9, Villa 7 and so on down to one-title clubs).
  Gaps: There is no row-by-row pin. The other 1,504 rows (the other leagues) are known corrupt: duplicated years, and La Liga's top_scorer column holds the runner-up. They are kept out only by the league filters in each query.
- **ballon_dor (Supabase)** [trivia], 76 (69 men's 1956 to 2025 without 2020, 7 women's 2018 to 2025), rank 1 only rows, 1 rounds to verify.
  Games: Sports Millionaire, List Quiz (ballon-dor-winners), Quiz Board, Ball IQ, Rarity Round
  Evidence: simListQuizSources pins 2024 Rodri and 2025 Dembele and requires Messi. I read all 76 winners here and every one matches the record.
  Gaps: nationality is NULL on all 76 rows. The table holds winners only, with no podium. Apart from the two year pins nothing is checked, so an edit to an older year would go unnoticed.
- **cfb_heisman_winners (Supabase)** [trivia], 91 (1935 to 2025) rows, 1 rounds to verify.
  Games: List Quiz (heisman-winners)
  Evidence: Spot-checked when it was added to listQuiz.ts (2024 Hunter, 2023 Daniels, 1995 George, 1975 Griffin). simListQuizSources pins 2024 and 2025. I read all 91 rows here and they match, including Reggie Bush's 2005 award, which was restored in 2024.
  Gaps: No full pin exists. The table is correct, but Guess the Year contradicts it (Tebow 2008, Bo Jackson 1986, Burrow 2020).
- **soccer_awards, the 3 awards in use (European Golden Shoe, Premier League Player of the Season, MLS MVP)** [trivia], 61 + 32 + 30 of 932 rows rows, 1 rounds to verify.
  Games: List Quiz (golden-shoe-winners, pl-player-of-season, mls-mvps)
  Evidence: listQuiz.ts records a spot check of 2 or 3 winners per award on 2026-07-15. simListQuizSources checks only the minimum answer count and the column-shift patterns, with no pins. I read the full MLS MVP roll and it matches the record.
  Gaps: No award is pinned. The same table has corrupt awards marked DO NOT USE: African Footballer of the Year has the rank '1st' in the winner column, and World Soccer Player of the Year shows 116 distinct winners over 66 years. Repeat winners carry '(2)' suffixes that the quiz has to strip.
- **tennis_grand_slam_winners (Supabase)** [trivia], 1,019 rows, 1 rounds to verify.
  Games: List Quiz (Wimbledon, US Open, Australian Open and French Open singles lists)
  Evidence: simListQuizSources pins only Federer and Djokovic on the Wimbledon list. The year gaps match wartime cancellations (Wimbledon 138 years, AO 113) and no row looks like junk.
  Gaps: Out of date: Wimbledon and the US Open stop at 2025 while the French and Australian lists have 2026, so a first-time 2026 Wimbledon or US Open champion would be refused. Men and women are mixed in each list without a note. The other rows are not pinned.
- **golf_majors (Supabase)** [trivia], 526 (including 25 '-' rows for years not played, filtered out by onlyNames) rows, 1 rounds to verify.
  Games: List Quiz (Masters, PGA, The Open, U.S. Open lists)
  Evidence: simListQuizSources requires only Nicklaus and Woods in the Masters list. The placeholder rows line up with the real cancellations (1871, both world wars, the 2020 Open).
  Gaps: The U.S. Open and The Open stop at 2025 while the Masters and PGA have 2026 rows, so a first-time 2026 champion at either would be refused. Nothing else is pinned.
- **f1_driver_standings (position 1) and nascar_champions (Supabase)** [trivia], 76 F1 seasons 1950 to 2025 (35 distinct champions); 77 NASCAR seasons 1949 to 2025 (36 distinct) rows, 1 rounds to verify.
  Games: List Quiz (f1-champs, nascar-champs)
  Evidence: simListQuizSources pins F1 2025 Norris, requires Verstappen, Hamilton and Schumacher, and requires Larson for NASCAR. simNascarDriver also reads nascar_champions. One row per season with no gaps, and 35 distinct F1 champions matches the record through Norris.
  Gaps: No row-by-row pin for either list.
- **jeopardy_clues (Supabase VIEW built by SQL from ballon_dor, the English slice of soccer_league_champions, super_bowls and nba_finals)** [trivia], 461 clues (69 + 7 Ballon d'Or, 34 PL, 93 First Division, 60 SB, 60 SB MVP, 80 NBA, 58 Finals MVP) rows, 1 rounds to verify.
  Games: Sports Quiz Board (/quiz-board, which also serves the retired /jeopardy redirect), Ball Knowledge IQ
  Evidence: The view is regenerated from its source tables, so it cannot drift from them, and it strips '(n) †' suffixes. No harness checks the view's content (only playGames and simNoRivalNames touch it). It is as reliable as its sources, which are partly pinned (see the entries above).
  Gaps: It will be verified once ballon_dor, the English champions slice, super_bowls and nba_finals are pinned row by row. The clue dollar values are computed from now(), so a clue can move up a value tier each January (that affects difficulty, not correctness).
- **player_market_values / player_market_values_dedup year 2026 (plus the player_peak_values, player_nationality_peaks and player_position_peaks views built on it)** [trivia], about 171,567 rows across 2004 to 2026 (Sports Millionaire pages up to 10,000 rows from the 2026 slice) rows, 1 rounds to verify.
  Games: Sports Millionaire (which-club, nationality, position, worth-more questions), Who Am I, Rarity Round
  Evidence: simValueFreshness pins 243 high-value players from the two-source sweep of 2026-08-29. simTransferOverlay, simMarketYearScope and simNoZeroFacts also guard it. simWhoAmIAccuracy checks Who Am I's closeness meter and simRarityPools checks that Rarity Round pools are complete. No harness imports triviaQuestionBank.ts, so Sports Millionaire's own question generation is never tested. The two Rarity Round reports in question_reports are resolved.
  Gaps: The whole table comes from one scraped provider (CLAUDE.md flags it as the provenance exposure). Loan players resolve to their parent club, so 'Which club does Marcus Rashford play for?' answers Manchester United while shirt_number_puzzles says Barcelona. Club answers go stale every transfer window. The position question assumes each player has exactly one position. The player-level truth of this table belongs to the player-data inventory; the round counted here is for a quiz-layer harness.

## verified (6)

- **scripts/transferOverlay2026.mjs (verified 2026 transfer window moves, written to the 2026 rows by the Round 393 and 450 migrations)** [soccer], 241 entries (239 applied in the roster bake) rows, 0 rounds to verify.
  Games: Every game that reads the 2026 market value rows (Player Bingo, Footle, Rarity, player search, Sign the Player), plus the Club Manager roster bake and the Footle fallback bake
  Evidence: Every entry has two named sources: for Premier League moves, both ESPN's and Sky Sports' club by club lists; otherwise the club or league site plus ESPN, AP or Sky. simTransferOverlay fails if a re-import rolls any entry back (controls 'stale' and 'typo').
  Gaps: The scope is limited to the 467 player Bingo and Sign the Player pool plus the rest of the Premier League. Eight moves were left out as unverified (Sancho, Veltman, Reiss Nelson, Ortega, Almada, Lenglet, Fran Garcia, Ceballos). Moves below the pool outside England were only added where a second source was cheap to find. The moves have NOT reached soccer_player_club_stints or Soccer Career's clubSquads.ts (see those rows).
- **nfl_grid_players (Football Grid is the NFL grid at /football-grid)** [soccer], 22,008 rows, 0 rounds to verify.
  Games: Football Grid (NFL Grid)
  Evidence: Derived from nflverse season files (a documented dataset). simNflGridData recomputes every 500th player from source and pins famous careers against Pro Football Reference plus NFL.com (read 2026-09-02). Guesses are judged in the browser against the answer key.
  Gaps: Not a soccer table; listed because the brief named Football Grid. The legacy football-grid-validate edge function and its 204 cached AI verdicts are no longer on the page's path.
- **src/lib/missingXi.ts (the missing_xi_puzzles table is an 18 row staging table the app does not read)** [soccer], 207 lineups rows, 0 rounds to verify.
  Games: Missing XI
  Evidence: Every lineup carries a note with two or more sources (match report plus Sky, ESPN or the club). simMissingXi covers structure, one spelling per man and the pinned Atalanta XI. simMissingXiReach proves every blank answer can be submitted through the real search.
  Gaps: Only one lineup (cl-2021-r16 Atalanta) is content pinned, so a hand edit to any other XI would pass the harnesses. That lineup shipped wrong despite its note until three user reports (Round 295).
- **college_grid_players (Supabase), built from scripts/data/collegeGridPlayers.json, plus src/data/collegeGridPuzzles.ts (75 boards)** [college], 35,611 entries (the table's row count equals the file's). 75 boards. 90 entries carry a Heisman. rows, 0 rounds to verify.
  Games: College Grid (/college-grid)
  Evidence: No fact is typed by hand for any player: scripts/genCollegeGridData.mjs derives every one. simCollegeGridKey (13 sections, 14 negative controls) fences it: first round is derived from each year's draft, colleges agree between two sources on 4,269 of 4,349 careers (floor 97.9%), every board cell has 3 or more two-source yes answers, and the table hash equals the file. simCollegeGridPage fences the page.
  Gaps: One junk display name, "'Omar Ellison", has a stray leading apostrophe. It shows in the search list, but judging folds it away. The section 12 check only looks for trailing HOF or number tags. Coverage is NFL careers 1970 to 2025, draft rows 1936 to 2025, and Heisman rows, so a college player who was never drafted and never played in the NFL is 'not found' (no guess charged). Many facts are unknown rather than known: 6,039 entries have no college, 9,483 have no position group and 11,837 have first_round null. The game never charges a guess on those. Only 5,747 entries have a college confirmed by a second source, and boards deal only from those. The 2026 draft is not loaded (the draft table ends in 2025), so 2026 picks such as Fernando Mendoza's carry no pick facts. question_reports has zero reports for any college game.
- **src/data/colleges.ts** [college], 70 schools (no players) rows, 0 rounds to verify.
  Games: Guess the College (/guess-the-college)
  Evidence: Two publishers per fact, recorded row by row in docs/audits/colleges-verification-2026-09-12.md. simColleges fences it with 27 pinned anchors, the title ledgers, counts derived from those ledgers, and control: anchor.
  Gaps: 6 enrollments are withheld and Purdue's Olympic clue was removed, all marked in COLLEGE_THIN. Enrollment is fall 2023 and conferences are 2026-27, so both will age. The evidence file's method paragraph still describes football titles as BCS and Playoff champions 1998 to 2025, while the shipped ledger and the evidence table use AP or Coaches poll titles 1936 to 2025. That is doc wording only.
- **src/data/wc2026Results.ts** [other], 12 groups, 32 knockout matches, 4 awards rows, 0 rounds to verify.
  Games: 2026 Bracket (/world-cup-bracket scoring)
  Evidence: Two sources compared programmatically on 2026-09-01: the ESPN scoreboard feed and Wikipedia's articles, with the awards also checked against The Athletic and FOX Sports. simWc2026Results fences internal truth, that the page's groups equal the real groups, the round of 32 seeding, all 495 Annex C allocations and the fixture dates, with negative controls. The group line-ups match the December 2025 draw as I know it.
  Gaps: The harness proves internal consistency and does not re-fetch the sources. One value is worth a second look: the third place match, France 4-6 England, is stored with no extra time.

## Not applicable (2)

- **Wonderkid Factory (src/lib/wonderkidFactory.ts)** [soccer], No real data; every kid is generated rows, 0 rounds to verify (critic corrected).
  Games: Wonderkid Factory
  Evidence: Names come from intlNames, which is checked against every real name on the site. simWonderkid covers the economy.
  Gaps: None for data truth; there are no real players in it.
- **RETIRED, no data served: /tier-list and /overrated-underrated** [trivia], 0 (no table or data file is read) rows, 0 rounds to verify (critic corrected).
  Games: Tier List (redirects to /) and Overrated Underrated (redirects to /face-off)
  Evidence: App.tsx lines 451 and 452 redirect both routes. gameRegistry.ts line 92 records that both games were deleted on 2026-08-28 at the owner's request. The Jeopardy-style board lives on as Quiz Board (see jeopardy_clues).
  Gaps: None. This entry only records that nothing here needs checking.
