# Round 1510: Club Manager's season opens with its country's super cup (the FA Community Shield first)

Branch r1510-cm-super-cups, based on r1509-cm-europa-watch at cad4edcf (the lead's override). Brief:
dukb-handoff/2026-10-10/briefs/brief-1510.md. The closing report with every runner result is
dukb-handoff/2026-10-10/results-g/finish-1510.md.

## What a player gets
- Every season of a Club Manager career in England opens with the FA Community Shield on the Wednesday before the
  first league game (the game's own calendar): last season's Premier League champions against the FA Cup winners,
  the league runners up when one club won both, one match on a neutral ground, straight to penalties when level.
- A club not in it follows it on a fourth Cups tile, Super cup, whose card names the cup, how it is played, the
  ground (the verified edition's in season one, else the rule), each club and why it is in, the date, the score and
  the winner. Season one's edition is the real 2025-26 one (Arsenal against Manchester City, the Principality Stadium
  in Cardiff), played by the game's own simulation.
- From his second summer in charge, a manager whose club earned a place plays it as his first match of the season,
  like any other (live or quick sim, extra time only where the row says so, the shootout and its order). It is a
  NIGHT: no wage week, no window week, the men who played pay its fitness cost and get a midweek's recovery.
- A win is a minor trophy: in the cabinet, the season's summary and history, the record; never weighed where a
  season is judged or paid (weighedTrophies at every weighing reader). The stats centre gains a Super cups view.
- Season one with my club in it (Arsenal, Manchester City) and a move into an entrant with a night ahead are stubs:
  "Your club's place was settled before you arrived. Your first super cup is next summer." The game never plays
  my club without me.
- Every other country and every era save: no row (the ledger could not stand on one), so nothing is followed or
  played, and the tile says the game could not confirm it (or that there is none).

## The data (S0)
scripts/data/cmOneOffFormats.json and its receipt; src/data/cmOneOffRows.ts. Verified on an official page and a press
page each: eng-2026 (name, shape, decider, entry, double rule, place, venue rule) and eng-2026-s1 (Arsenal and
Manchester City, the Principality Stadium). The edition's clubs are also the game's own verified 2025-26 data
(CM_FINAL_TABLES_2025_26's champions, Round 1509's SEASON_ONE_CUP_WINNERS.premier), checked by section 0. Marked
partial (toVerify, no constant): eng-2005, eng-2010, eng-2015, eng-2020, esp-2026, ita-2026, ger-2026, fra-2026.

## The code, by step
- S1 src/lib/worldOneOffs.ts (rows, entrants by the entry and double rules, fixtures and grounds, the prefix
  evaluation over settleTie on keyed streams) and src/lib/worldNights.ts (the shared night: NightRef, NightResult,
  the one placer placeNights over types and DATES with a redraw guard, nightDateAt, nightsDoneAt), unit files.
- S2 the plumbing that moves nothing: Competition 'oneOff', CompBucket 'other', Trophy minor and weighedTrophies,
  CalendarEntry night, the skip guard, the night tick (nightSquadTick, the lifted fitnessAfterWeek), the window
  skip (playMyMatch and myMatchWeeks), the VAR key, playsExtraTime's arm, setWorldComp keeping other keys and the
  dsc writer setOneOffSlice, finishedLeagueTables and cupFinalistsOf, buildCalendar exported.
- S3 the followed cup: startCareer's one line (in NAMED_BLOCKS of cmWorldSeed1250.mjs), the read beside watchTables
  before registerLeagueOverrides, the open after the cup bracket, the carry in joinClubNow, the view
  (clubManagerWorldView.ts superCupView, WorldCompScreen.tsx's fourth tile and card), the help block, What's New.
- S4a a participant's nights spliced into its calendar at the placer's slots; leagueStarted for the week 0 readers
  (ClubManager.tsx 1035, 1102 and the League tile's caller, the match preview's two positions); the calendar's
  emoji, label and maybe.
- S4b the match: entryInvolvesMe and fixtureFor, the completion (the slice replaced with my result, a won final a
  minor trophy and trophyWon), the shootout link, the stats view, help line 50, the help and What's New rewritten.

## Proofs and owed items
See finish-1510.md for every runner result name, exit code and number, what was not run and why, and what the lead
must do by hand (the weight rows, the 1081 pin if main moves, the guide sentence owed to the other lane).
