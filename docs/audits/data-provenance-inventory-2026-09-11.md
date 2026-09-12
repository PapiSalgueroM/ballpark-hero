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
gridArchive.json, nascarDrivers.json, recordBooks.json, uclEngineShapes.json. Since Round 531 also
players (baked, simPlayersPool), careerPlayers (baked, simCareerFallback) and leagueCaps
(two publishers per figure, simLeagueCaps).

## Exposed: hand typed facts with no source and no fact harness, ranked by exposure over verification

| Rank | Target | Rows | Why it matters | Suggested shape |
|---|---|---|---|---|
| 1 | DONE, Round 531: `src/data/players.ts` | 534 players (was 748 typed) | Baked by `scripts/bakePlayers.mjs` from `player_market_values` 2026 plus the verified overlay, league from the club through the 2026-27 memberships, fenced by `simPlayersPool` (live table row for row, smell list, fresh bake byte identical); nine stray club spellings normalised live and four seed names rejoined on the re-bake | Done; evidence `docs/audits/players-bake-2026-09-11.md` |
| 2 | DONE, Round 531: `src/data/careerPlayers.ts` | 253 players, 3,608 seasons (was 151 and 1,648) | Baked by `scripts/bakeCareerPlayers.mjs` from the live career tables, fenced by `simCareerFallback`; Transfer Path re-derived on the bigger pool (90 identities, 212 active paths, guarded refresh migration staged); Cristiano Ronaldo 2022-23 is absent from the LIVE table too, finding 2 of the evidence | Done; evidence `docs/audits/career-bake-2026-09-11.md` and `docs/audits/transfer-path-active-identities-2026-09-11.md` |
| 3 | DONE, Round 531: `cbb_programs` (the 24 memory rows) | 24 of 281 | Two source verified row by row, four corrections applied live on 2026-09-11 (`20260911120000_cbb_programs_verified.sql`: Michigan 2 titles, Gonzaga Pac-12, the UConn and Villanova arena names), pinned by `simCbbPrograms` against the live table | Done for the 24; the other 257 rows are rank 14 below; evidence `docs/audits/cbb-programs-verification-2026-09-11.md` |
| 4 | Transfer Path's 17 mixed season key clubs | 17 clubs | Open since Round 294; real teammates never link and the refusal claims they were never at the same club | One key rule in scripts/lib/transferPathHints.mjs and useTransferPath.ts, then re-derive every hint |
| 5 | `src/data/higherLowerPlayers.ts` | 204 players, 5 stats | Two games decided purely by these numbers; Pele's row ships the disputed all matches total; trophies and caps unsourced | Bake from a named source per sport the way nbaHLPlayers and mlbHLPlayers do, anchors in the header |
| 6 | `src/data/colleges.ts` | 70 schools, about 490 facts | Championship counts stated in prose ("18 national championships"), no provenance, the audit left the game's data home undecided | Two source the counting claims; move counts into typed fields a harness can pin |
| 7 | `docs/data/soccer-data.json` tournament_winners | | Root cause of 115 quarantined Connections puzzles, still wrong in the repo | Rebuild the tournament to squad mapping from national_team_squads and world_cup_players |
| 8 | `teammatesPairs.ts` (50), `ufcFighters.ts` (112), `ufcChainData.ts` (64) | 226 | Every row is a binary answer; the two UFC files duplicate records with no cross check | Two source each; one harness pinning famous records and asserting the UFC files agree |
| 9 | Club Manager era UCL group tiebreak | | Open: ranks level clubs on goal difference where 2003-04 to 2023-24 used head to head first, so the round of 16 can seed the wrong group winner | Head to head first for those eras; simUclFormatHistory already has the rule shape |
| 10 | DONE, Round 531: the four front office cap constants | 4 | `src/lib/leagueCaps.ts` holds the four figures with `CAPS_AS_OF` and two publishers each (NFL 260 to 301.2 and NBA 155 to 164.961 were wrong and are corrected; NHL 104 and MLB 244 confirmed), the four engines import it, every cap screen prints the date, fenced by `simLeagueCaps` | Done; evidence `docs/audits/league-caps-2026-09-11.md` |
| 11 | nflTeamFacts (128), nflTeamPuzzles (32), f1Drivers (23), f1Constructors (34), worldCupPuzzles (60), olympicsAthletes (48), scorePredictorPuzzles (36) | about 360 clues | The clue text is the fact; no provenance, no harness, seven games | One shared simAuthoredClues that pins the countable claims against the audited tables where they exist |
| 12 | `conquestSports.ts` STADIUM_COORDS and the four US conquest colour and rating sets | 32 coords, 4 leagues | The coordinates drive the Voronoi opening map; colours are every team's identity; only the NBA file admits its colours are hand set | Port soccerConquest's per entry colour source model; cite a geo source and a read date |
| 13 | Round 535: the LIVE Footle pool's club to league maps, `CLUB_TO_LEAGUE` in `src/data/footleEnrichment.ts` and `INSANE_CLUB_LEAGUE` in `src/lib/fetchFootlePlayerPool.ts` | 2 maps, 2025/26 by their own comments | Found by the Round 531 bake: the live pool still labels Burnley, West Ham and Wolves as Premier League and Coventry, Hull and Ipswich as Championship, and Girona, Mallorca, Nantes and Leicester by last season, while the baked fallback follows the verified 2026-27 memberships, so the live pool and the fallback disagree on those clubs until the maps are re-based. The bake also skipped 24 seed names at clubs no map on the site places in a league (Antalyaspor, Al-Sadd, Al Ahly, Al-Rayyan, Al-Wahda, Al-Gharafa, Al-Jazira, Colo-Colo, Fortaleza, Stade Reims, Wydad Casablanca, FC Rapid 1923, FC Sochi, Machida Zelvia) | Re-base both maps on the 2026-27 memberships `REAL_LEAGUES` already verifies, add the missing clubs with a two source division, and fence the maps against `REAL_LEAGUES` so a promoted or relegated club can never sit in last season's league |
| 14 | Round 535: the 257 `cbb_programs` rows outside the verified 24 | 257 (added 2026-06-23, 07-03 and 07-04) | Playable at /guess-cbb-team and never verified by any audit; `simCbbPrograms` counts them on every run and already notes two shapes: the second Loyola Chicago row spells its school name with a long dash (the style rule bans it and no guess would type it), and Evansville's championships hint reads "0 Division I national titles through 2025" rather than the "N national title" shape every other row uses | Two source each row the way the 24 were done (count derived from the agreed champion list, conference from the 2026-27 membership, arena from the school's own site), normalise the two shapes by a guarded migration, extend the harness pins |

`src/lib/clubData.ts` (dead, contradicted the 2026-27 memberships) was deleted in Round 531.

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
- Transfer Path active evidence was projections: 77 rows quarantined, and the 2026-09-07 restore
  is APPLIED live (203 pairs read on 2026-09-11, contrary to the "unapplied" line PROJECT-STATE
  still carries). Round 531 re-derived on the baked pool (90 identities, 212 pairs) and staged
  the guarded refresh `20260911190000_refresh_verified_active_transfer_path_hints.sql`, to apply
  only after the Round 531 frontend is live; the harnesses print PENDING until it is.
- Transfer Path mixed season keys at 17 clubs: OPEN since Round 294.
- Club Manager era UCL group tiebreak order: OPEN.
- nfl_team_seasons head_coach, wins, playoff_result columns are scrape garbage: worked around in
  nflCoaches.ts, the columns still there.
- Soccer Connections 25 broken and MLB Connections 9 broken: fixed, gaps to the target counts
  flagged.
- 115 Connections puzzles traced to a wrong tournament to squad mapping: QUARANTINED, source
  JSON still wrong.
- cbb_programs generated from memory: the 24 memory rows DONE in Round 531 (verified two source,
  four corrections applied live 2026-09-11); the 257 later rows are rank 14 above.
- Guess the Nation, Guess the College, Guess the Year candidate sets: audit only, nothing applied.
- The owner's 2026-08-12 directive "audit every puzzle in every game for wrong answers": ongoing,
  never completed sitewide.
- Two "wrong answer" player reports (Transfer Path 2026-08-19, World XI 2026-07-03) carried no
  context and cannot be acted on.
