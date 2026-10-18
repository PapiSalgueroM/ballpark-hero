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
  "Your club's place was settled before you arrived. Your first super cup is the next one your club earns, from
  next summer." (fix-1510: the critic's second sentence promised a place the club may not earn.) The game never
  plays my club without me.
- Every other country and every era save: no row, so nothing is followed or played, and the tile says Not confirmed
  (fix-1510: never "None here", since no 'none' row stands on two families). The card says why: where the round
  looked (CM_ONE_OFF_PARTIAL) the game could not confirm it on two sources, elsewhere it has not confirmed one yet.

## What a night runs (the lead's ruling 2b), in playMyMatch's order
- isKnockout includes 'oneOff', so a level match goes to the shootout (extra time first only on an 'et' row,
  oneOffPlaysExtraTime), with the shootout order; suspendedNow is read as for any match, so a man banned sits it
  out and the ban counts down by it (the game's rule for any red).
- The board's ordinary swing (confDelta from the result alone; no cup or European bonus arm reads 'oneOff'), the
  form guide (noteForm, noteFormOne), the head to head and the result log, careerStats (so nationStanding's win
  rate), bumpComp under the 'other' bucket.
- completeOneOffNight writes mine[n] by replacing the slice; a won final pushes the minor trophy and trophyWon.
- settleDecisionDesk runs unedited, as after any match (its straight reds read from this match).
- A press promise made before it is settled by it, as by any match (the board, the press mood, the squad's morale).
- nightSquadTick in place of tickWeek: the week's recovery and the match's cost to the men who played, nothing else
  (no knock, no injury or retraining countdown, no facilities, no books, no severance count).
- The window countdown is skipped on `entry.night` (no window week), and myMatchWeeks skips a night.
- generateWeeklyNews and maybeAskPress run as after any match (the arm a cup match takes).
- matchAttendance on the row's venue: a neutral ground ('n', the only played row) is 'neutral', so no gate and no
  travel; a 'c' or 'w' row would pay the home gate or book an away trip like any match.
- The skip branch of playNextEntry (a night my club does not play) moves the week on with no tick.

## The data (S0)
scripts/data/cmOneOffFormats.json and its receipt; src/data/cmOneOffRows.ts. Verified on an official page and a press
page each: eng-2026 (name, shape, decider, entry, double rule, place, venue rule) and eng-2026-s1 (Arsenal and
Manchester City, the Principality Stadium). The decider's official line is Arsenal FC's preview of the 2026 edition
(found by the closing check of 2026-10-18; before it, Liverpool FC's page on the 2025 edition stood alone, and it
still corroborates). The edition's clubs are also the game's own verified 2025-26 data
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

## Where it stands
- Round 1509's closed head f2bb6325 is merged (fb54fb19); simWorldUcl section 2 compares saves bare of
  worldComps.dsc too (0a6d6fba); the Round 1081 pin is retaken last on the merged tree (0e168502).
- The final proof (r1510-fin-b): with worldComps.dsc stripped and a participant's nights left off its calendar
  (scripts/lib/oneOffNights1510.mjs, proofWorldUclFleet --dsc-nights-off), 190 journeys (60 participants, 130
  watchers, both coach modes, eval and old saves) are byte equal to f2bb6325 on every step, draws equal.
- simOneOffCups green (123,395 checks) with every control firing; playOneOffCups green at 320, 390 and 1280.
- WEIGHT: +3.7K on each of the three engine rows (624.4K, 641.5K, 651.0K), 0.2K over the lead's accepted +3.5K:
  stopped and reported.

## The fix round (fix-1510, two adversarial reviews)
- simOneOffCups: never falls across every join with control carryseen (section 1); the week 0 readers
  (leagueStarted, the preview's positions) after a night with control leaguestarted, and every man's fitness after a
  night by ruling 2b's exact rule with control norecovery (section 2); section 4's weighing arms each in their own
  fresh engine (it was red on the unmutated head with two seasons).
- The Super cup tile says Not confirmed for every country with no row, its card says why and is never empty;
  playOneOffCups opens that card (controls norowline) and reads the hub's season line and League tile after the
  Shield (controls hubweek, tileweek); a unit test walks one new career per league of every world.
- worldNights.test.ts runs the placer on every engine calendar and the 2020 late seasons; oneOffNightsDone counts
  through the shared nightsDoneAt; the stats centre's splits check counts the Super cups bucket; the card's why
  lines follow the row's entry and double rules. Full account: dukb-handoff/2026-10-10/results-g/fix-1510.md.

## Proofs and owed items
See finish-1510.md for every runner result name, exit code and number, what was not run and why, and what the lead
must do by hand (the weight rows, the 1081 pin if main moves, the guide sentence owed to the other lane).
