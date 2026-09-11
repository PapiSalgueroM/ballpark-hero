# Real fact inventory and provenance, 2026-09-11

Read-only inventory taken by the desktop lane on 2026-09-11 for the owner's ask "correct info on
all basis". It is the backlog for Round 531 (the two source re-verification sweep) and the
reference for anyone adding facts. Nothing was changed when it was written. Roughly 73 files
under `src/data/` carry real world facts. 28 carry real provenance, 8 carry honesty markers,
about 30 have no fact level harness at all.

## The shape to copy (three tiers already in the repo)

Tier A, the reference pages: `src/lib/uclFormatHistory.ts` and `src/lib/nflPlayoffFormatHistory.ts`.
An exported VERIFIED_ON date, an exported SOURCES list (publisher, title, url) printed on the page,
every row citing its source ids so a harness can assert two publishers per period, single source
facts omitted rather than shipped, disagreements recorded rather than resolved silently, blocked
fetches named and not cited.

Tier B, the Record Books: `src/lib/records.ts` over the audited champion tables, baked to
`recordBooks.json`, checked against the live database by `simRecordBooks`. A blank cell means never
scraped, never guessed.

Tier C, `src/data/gridArchive.json`: a generatedFor date, a method note, per cell counts,
recomputed independently by `simGridArchive`.

The closest data files to Tier A: `soccerConquest.ts` (two named sources per league with read
dates, per club colour source codes, single and neutral flags, SOCCER_CONQUEST_PARTIAL),
`wc2026Results.ts` (two sources compared programmatically), `missingXi.ts` (a source field on
every one of 209 lineups).

## Files with strong provenance (leave alone unless a report names them)

aflGoalKickers, cfbHLPlayers, clubManagerEra2005/2010/2015 (ERA_PARTIAL markers), clubManagerRosters
(CM_PARTIAL on 133 clubs), clubSquads, conquestDataNba (roster audit 2026-07-10; ratings and colours
admitted hand set), f1HLDrivers, footleEnrichment (admits single source), frontOfficePlayers
(nflverse 2026-09-02), golfLegends, mlbFoPlayers, mlbHLPlayers, nationalPools, nbaCareerPlayers,
the NBA/NFL/NHL connections puzzles, nbaHLPlayers, nflCoaches (certainty rule), nflHLCategories,
nflHLPlayers, nhlFoPlayers, playerNationalities (fail closed bake), soccerConquest, tennisHLPlayers
(records a source disagreement), transferPathVerifiedActive, wc2026Results, worldMapGeo,
gridArchive.json, nascarDrivers.json, recordBooks.json, uclEngineShapes.json.

## Exposed: hand typed facts with no source and no fact harness, ranked by exposure over verification

| Rank | Target | Rows | Why it matters | Suggested shape |
|---|---|---|---|---|
| 1 | `src/data/players.ts` | 748 players, 9 fact fields each | The Footle fallback pool and read by useGame, squadDeal, clubManager, perfectLineup. One comment ("as of Feb 2026"), no source, no harness. Fossilises transfers. | A `bakePlayers.mjs` beside bakeClubManagerRosters from player_market_values_dedup plus the verified 2026 overlay; keep what two sources carry; mark thin rows |
| 2 | `src/data/careerPlayers.ts` | 151 players, 1,648 seasons | Fallback for Career Ladder and Transfer Path, and Transfer Path validates guesses off the graph built from it, so a wrong club season refuses a right answer. No header at all. Cristiano Ronaldo's 2022-23 is absent. | Extend the careerSeasonTruth disposition model from Round 509 to the static fallback; quarantine one source rows |
| 3 | `cbb_programs` (live table, 24 rows) | 24 | Its own audit doc says every field came from memory with a Jan 2026 cutoff, championship counts and 2024-25 realignment flagged highest risk, never verified, playable at /guess-cbb-team | Two source each row; a simCbbPrograms that pins counts and conferences |
| 4 | Transfer Path's 17 mixed season key clubs | 17 clubs | Open since Round 294; real teammates never link and the refusal claims they were never at the same club | One key rule in scripts/lib/transferPathHints.mjs and useTransferPath.ts, then re-derive every hint |
| 5 | `src/data/higherLowerPlayers.ts` | 204 players, 5 stats | Two games decided purely by these numbers; Pele's row ships the disputed all matches total; trophies and caps unsourced | Bake from a named source per sport the way nbaHLPlayers and mlbHLPlayers do, anchors in the header |
| 6 | `src/data/colleges.ts` | 70 schools, about 490 facts | Championship counts stated in prose ("18 national championships"), no provenance, the audit left the game's data home undecided | Two source the counting claims; move counts into typed fields a harness can pin |
| 7 | `docs/data/soccer-data.json` tournament_winners | | Root cause of 115 quarantined Connections puzzles, still wrong in the repo | Rebuild the tournament to squad mapping from national_team_squads and world_cup_players |
| 8 | `teammatesPairs.ts` (50), `ufcFighters.ts` (112), `ufcChainData.ts` (64) | 226 | Every row is a binary answer; the two UFC files duplicate records with no cross check | Two source each; one harness pinning famous records and asserting the UFC files agree |
| 9 | Club Manager era UCL group tiebreak | | Open: ranks level clubs on goal difference where 2003-04 to 2023-24 used head to head first, so the round of 16 can seed the wrong group winner | Head to head first for those eras; simUclFormatHistory already has the rule shape |
| 10 | The four front office cap constants | 4 | frontOffice.ts:20 (260, +5%), nbaFrontOffice.ts:15 (155, +7%), nhlFrontOffice.ts:22 (104), mlbFrontOffice.ts:21 (244, +3%): real CBA numbers, no publisher, no read date, invented escalators, pricing every contract in four sims | Copy soccerCurrency.ts: a CAPS_AS_OF date, two publishers per figure, the date printed on the cap screen |
| 11 | nflTeamFacts (128), nflTeamPuzzles (32), f1Drivers (23), f1Constructors (34), worldCupPuzzles (60), olympicsAthletes (48), scorePredictorPuzzles (36) | about 360 clues | The clue text is the fact; no provenance, no harness, seven games | One shared simAuthoredClues that pins the countable claims against the audited tables where they exist |
| 12 | `conquestSports.ts` STADIUM_COORDS and the four US conquest colour and rating sets | 32 coords, 4 leagues | The coordinates drive the Voronoi opening map; colours are every team's identity; only the NBA file admits its colours are hand set | Port soccerConquest's per entry colour source model; cite a geo source and a read date |

Also cheap: `src/lib/clubData.ts` is dead (no importers) and its clubLeagueMap contradicts the
verified 2026-27 memberships in clubManager.ts (West Ham and Southampton listed in the Premier
League). Delete it rather than verify it.

Also unsourced with zero harness, lower traffic: hofPlayers (26), timelinePlayers (76 draft years),
draftGuesserPlayers (about 76 combine numbers), guessTheYearPuzzles (50 by 6 clues),
soccerClubPuzzles (79, league_titles), nflCareerPlayers (78), baseballCareerPlayers (35),
hockeyCareerPlayers (39), the three hand rating pools (nba 67, nhl 58, f1 42: the rating is
editorial and says so, the franchise and era fields are factual claims).

## Every fact table read from src, with its readers

`player_market_values` is read by 13 games (auctionHouse, dartDraft, dartMap, Footle's pool,
Rebuild, the club notables, the transfer value pool, localLineupEval, playerBingo, rarityRound,
squadDeal, whoAmI, worldXi). `player_market_values_dedup` by 6 (alphabetSprint, dealPlayers,
packBattle, playerStockMarket, signThePlayer, triviaQuestionBank) plus the Club Manager bakes.
`bref_nba_player_seasons` by 4 NBA games, `nhl_player_stats` by 3, the Lahman tables by Perfect
Season MLB, `nflfastr_player_stats` and `nfl_team_seasons` by Perfect Season NFL,
`ncaa_player_stats` by CBB Grid, `nba_players_extended_v2` by every NBA guess game through
playerSearch, `cbb_programs`, `tennis_players`, `guess_nation_countries`, `national_team_squads`,
`world_cup_players`, `ballon_dor`, `jeopardy_clues`, `fantasy_draft_players`, `game_player_pool`,
`rebuild_clubs`, `transfer_grade_pool`, `transfer_path_puzzles`, the five connections tables and
the three puzzle tables through their fetch libs, and the twelve audited champion tables through
records.ts, champOrNot.ts and listQuiz.ts.

## Known wrong data reports and their status

- Player Bingo transfers outdated (four owner reports): DONE, Round 450.
- Transfer Path active evidence was projections: PART, 77 rows quarantined, restore migration
  deliberately unapplied.
- Transfer Path mixed season keys at 17 clubs: OPEN since Round 294.
- Club Manager era UCL group tiebreak order: OPEN.
- nfl_team_seasons head_coach, wins, playoff_result columns are scrape garbage: worked around in
  nflCoaches.ts, the columns still there.
- Soccer Connections 25 broken and MLB Connections 9 broken: fixed, gaps to the target counts
  flagged.
- 115 Connections puzzles traced to a wrong tournament to squad mapping: QUARANTINED, source
  JSON still wrong.
- cbb_programs generated from memory: APPLIED 2026-06-14, never verified.
- Guess the Nation, Guess the College, Guess the Year candidate sets: audit only, nothing applied.
- The owner's 2026-08-12 directive "audit every puzzle in every game for wrong answers": ongoing,
  never completed sitewide.
- Two "wrong answer" player reports (Transfer Path 2026-08-19, World XI 2026-07-03) carried no
  context and cannot be acted on.
