# Simulation audit, 2026-10-01

Read-only hostile QA in an isolated headless Chromium context at 390x844, reduced motion. Actual live App plus independently built clean baseline at http://127.0.0.1:4930. Original UI, pools, engines and clocks. Local saves belong only to this disposable browser. Supabase reads allowed; all server mutations, analytics and ads intercepted. No gameplay source edits, no engine-only results credited as UI play.

Live entry: `/assets/index-Bj5VrkKR.js`. Clean local entry: `/assets/index-4ldJKi6e.js`. The local baseline is the completed physical build in `dukb-round842-845-production`, served by the parent agent on port 4930.

## Verified problems

### SIM-01: Depth players are unreachable in both trade paths (P1)

URL: https://douknowball.com/nba-front-office

1. Start Boston Celtics. Open Trades.
2. After first tipoff or offseason, compare Roster names with Trade Finder.
3. Select DET. Compare You send and You get choices with both saved rosters.

Expected: Every under-contract player eligible under trade rules can be selected or reached through paging or search.

Actual: Boston has 13 under-contract players, but each own-player trade list shows only 8. Five saved players cannot be reached, with no paging or search. The opponent list is also capped at 8.

Cause: {"file":"src/components/nba-front-office/NbaFrontOfficeBoard.tsx","lines":[889,939,947],"binding":"rating-sort.slice(0,8)"}

Boundary: Actual live App UI and original generated save. No engine substitution or server mutation.

Screenshot: C:/Users/antho/AppData/Local/Temp/dukb-hostile-audit-2026-10-01/nba-trade-hidden-players-live.png

### SIM-02: Academy toast intercepts the main advance button on a narrow pointer viewport (P2)

URL: https://douknowball.com/soccer-career

1. Use a 390x844 pointer viewport. Create a player and click Begin Career.
2. Keep the pointer at the bottom advance area where the Joined toast appears.
3. Try Next Year while the toast remains hovered, then move the pointer away and wait.

Expected: The primary career advance action remains reachable while success notifications show.

Actual: Next Year rectangle (12, 778.25, 225.17, 48) is covered by the Joined Real Sociedad Youth toast. Native pointer clicks remained blocked for 5 and 12 seconds. Moving away cleared the toast within 4.6 seconds.

Cause: {"files":["src/pages/SoccerCareer.tsx:770","src/pages/SoccerCareer.tsx:4200","src/components/ui/sonner.tsx:10"],"possible":"Bottom-right Sonner toast overlays fixed bottom career actionbar; hover pauses dismissal."}

Boundary: Actual live App with mouse or pointer at a narrow 390px viewport. Native touchscreen hover persistence was not verified.

Screenshot: C:/Users/antho/AppData/Local/Temp/dukb-hostile-audit-2026-10-01/soccer-toast-blocked-live.png

### SIM-03: Completed regular seasons have unequal game counts, but standings rank raw wins (P1)

URL: https://douknowball.com/nba-front-office and https://douknowball.com/mlb-front-office

1. Start Boston in NBA Front Office and play all 20 rounds through the recap.
2. Read final regular-season wins and losses for all 30 clubs in the original save.
3. Repeat on the clean local NBA build. Separately play all 27 MLB rounds from a Dodgers start.

Expected: Comparable complete regular seasons before playoff seeding: 82 NBA games and 162 MLB games, or an explicitly different fair game format.

Actual: Live NBA Boston finished 57-26 (83 games), with clubs ranging from 64 to 93 games. Clean NBA Boston finished 43-37 (80), with clubs ranging from 68 to 94. Live MLB clubs ranged from 148 to 175 despite the 162-game copy. Standings use raw wins, so clubs have unequal win opportunities.

Cause: {"files":["src/lib/nbaFrontOffice.ts:299","src/lib/nbaFrontOffice.ts:311","src/lib/mlbFrontOffice.ts:218","src/lib/mlbFrontOffice.ts:229"],"binding":"Random opponent selection with a 50 percent per-team skip, without a fixed balanced schedule. Standings compare raw wins.","sourceBoundary":"Read from the frozen clean audit baseline"}

Boundary: Actual native fullseasonUI observations. Source explains the measured result; no engine-only run credited. Postseason series do not mutate regularseason wins/losses.

The regular-season length references are the official [NBA 2026-27 schedule](https://pr.nba.com/2026-27-nba-regular-season-schedule) and [MLB 2026 schedule announcement](https://www.mlb.com/amp/press-release/colorado-rockies-announce-2026-regular-season-schedule.html). Postseason series do not add to the saved regular-season wins and losses. All 30 club totals from each completed run are retained in simulation.json.

### SIM-04: A structurally corrupt career save traps the route in repeatable crash recovery (P2)

URL: http://127.0.0.1:4930/soccer-career

1. Create and play a career. Preserve an original valid save.
2. Change only soccerCareerSave.seasons to null in localStorage.
3. Reload, then click Try this page again.

Expected: Reject or recover malformed saved state into a usable creator or explicit local-reset path.

Actual: Both loads render This page broke. The corrupt save is retained, so Try this page again repeats the failure. New Career and local reset controls cannot be reached.

Cause: {"files":["src/pages/SoccerCareer.tsx:660","src/pages/SoccerCareer.tsx:762","src/lib/soccerCareerEngine.ts:2481"],"possible":"repairCareer returns the unchecked seasons field; render accesses career.seasons.length."}

Boundary: Clean actual App; manually malformed only a disposable local save. Ordinary valid save and syntactically bad JSON recovery passed.

Screenshot: C:/Users/antho/AppData/Local/Temp/dukb-hostile-audit-2026-10-01/soccer-corrupt-save-clean.png

## Actual coverage

Three complete regular-season UI runs, two NBA and one MLB. Four original native draft picks. There are 25 recorded coverage observations; setup diagnostics are retained separately in the actions array.

| Game | Actually exercised | Outcome |
|---|---|---|
| NBA Front Office | Live Boston start, 20 rounds, playoff recap, two draft picks, offseason, refresh, rapid advance and trade accept | Progress and refresh worked. Draft advanced 2026 to 2027. Double accept consumed one pick and preserved unique player IDs. |
| NBA Front Office, clean local | Fresh Boston, all 20 rounds, both trade pickers, restart | Schedule and hidden-player defects reproduced. Restart cleared the save. |
| Soccer Career | Native creator, one youth advance, first contract, one professional season, newspaper, summary, awards, refresh, cancel and confirmed restart | Age 16 to 18, three season rows including the initial youth row. Weekly wage label was €7k/wk Wage for a generated simulation salary. Normal progress and restart worked. |
| Soccer Career, clean local | Valid played save restore, then seasons:null corruption and retry | Repeatable error boundary, with corrupt bytes retained. Restoring valid bytes recovered the game. |
| MLB Front Office | Dodgers start, 27 rounds, World Series recap, two draft picks, offseason and refresh | Reached the 2027 hub. Actual season records exposed the schedule defect. |
| MLB hostile management | Six contributor DFAs, rapid confirmation, nine-player floor, released-player signing attempt, one replacement double signing, over-budget attempt and reload | Floor and same-season return constraints held. Dead money totaled $62.7M. Replacement appeared once. A $5M signing was disabled with $2.5M negative room, and save bytes stayed held after click and reload. |
| Save recovery | Broken JSON in Soccer and MLB, unknown NBA team, native restart paths | These variants returned usable creation screens; Soccer structurally malformed seasons did not. |

## Limits

Club Manager, NFL Front Office and NHL Front Office were not exercised in this lane. Soccer Career retirement, optional social choice, full life and training systems, MLB maximum roster and trade negotiations remain untested. This is bounded hostile play, not proof that every transaction exploit is absent. The toast failure was observed with a pointer at a narrow viewport; native touchscreen hover behavior remains untested.

Uncaught pageerror events: 0. One caught Soccer Career render failure was verified separately. All 71 server mutation requests were locally intercepted, with no real database writes. Driver locator errors are setup diagnostics, not product findings.

Inspected screenshots: soccer-toast-blocked-live.png, soccer-corrupt-save-clean.png, nba-season-end-clean.png, mlb-playoff-recap-live.png. Raw club totals, action receipts and failed setup observations remain in simulation.json. Earlier simulation-first-subset.json and simulation-first-subset.md were preserved.

Browser cleanup: {"browserStopped":true}. The root-owned local server was left running.