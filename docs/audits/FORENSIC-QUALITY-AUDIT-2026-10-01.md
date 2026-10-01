# Forensic quality audit, 2026-10-01

Status: in progress. Codex847 is evidence only. No fixes or production data
changes are included. Original requests and lane ownership are saved in
`docs/OWNER-QUALITY-PROGRAM-2026-10-01.md`.

Current inventory: `evidence847/inventory-current.csv` and the JSON companion.
The shared audit is `SHARED-PRODUCT-AUDIT-2026-10-01.md`. Fields marked untested
or not established remain open; a successful initial render is not completion.

## Baselines and boundaries

- Live entry: `/assets/index-Bj5VrkKR.js`, observed independently by two lanes.
- Clean local production baseline:8542bf83, runtime identical to40947bbc.
  Real app type check and production build pass. Unaccepted842-846 drafts are
  excluded. The isolated server is4930; the shared checkout's dist is untouched.
- Inventory:132 registered games,170 sitemap URLs,193 total route patterns and
  concrete addresses including utility/redirect/fallback routes. These are
  inventory counts, not counts of complete games.
- Three lanes audit shared/live pages, simulations and data. Root tests short
  games and consolidates evidence. Automated exploratory interaction is not a
  complete game run. Data-backed answer validation and signed-in saves need
  their own evidence.
- Browser tests block ads, analytics and score/report mutations. No real ad
  click or impression, test score, signup or historical data update is sent.
  Filled ad creatives therefore remain untested.

## Verified issues delivered so far

### QA847-01, P1: abandoned soccer answer changes a new game

URL: `https://douknowball.com/higher-lower`

Game: Soccer Higher or Lower.

1. Choose a stat.
2. Before its three-second reveal ends, click Give up, then Yes, reveal it.
3. Immediately click Play Again.
4. Wait without choosing anything.

Expected: the new pair stays at streak0 until a new answer.

Actual: an old correct answer awards streak1 and replaces the fresh pair. An
old wrong answer ends the fresh game. Both paths reproduced at1280px and320px,
with restart completed in892 to1011ms, well before the3000ms reveal callback.
All four cases used the observed live entry above.

Possible cause: committed `src/hooks/useHigherLower.ts` starts unowned timeout
callbacks and does not cancel them on giveUp/reset. A paused846 draft addresses
this but has not been accepted, published or credited as a fix in this audit.

Evidence: `evidence847/soccer-timer.json` (original pairs, new pairs, timing,
screen text and observed bundle). Four screenshots remain in
`TEMP/dukb-hostile-audit-2026-10-01/`.

### QA847-02, P2: a stale Daily tab overwrites newer progress

URL: `https://douknowball.com/afl-higher-lower`

Game: AFL Higher or Lower.

1. Open today's Daily in two tabs of the same browser.
2. Answer two rounds in the first tab.
3. Answer round1 in the second tab, which still shows the first pair.
4. Refresh the first tab.

Expected: the stale tab cannot overwrite newer decided rounds.

Actual: the saved guess log drops from two rounds to one. Refresh resumes at
round2. Both tabs initially displayed the same pair. No clock change or storage
edit was used for this reproduction.

Possible cause: `useDailyPuzzle` writes each tab's in-memory log without checking
the newer stored state or subscribing to storage updates. Other consumers are
potentially affected, but this issue's verified URL is the one above.

Evidence: `evidence847/daily-save.json`, including exact saved bytes before and
after the second tab's answer.

### QA847-03, P2: well-formed but malformed Daily saves crash the page

Verified URLs: `/nfl-higher-lower`, `/nba-higher-lower`, `/mlb-higher-lower`,
`/hockey-higher-lower`, `/cfb-higher-lower`, `/f1-higher-lower`,
`/tennis-higher-lower`, `/golf-higher-lower` and `/afl-higher-lower`, all on
`https://douknowball.com`.

Game family: nine ten-round Higher or Lower games. This is a deliberate corrupt-save test, not a
spontaneous ordinary-play crash or an exploit against another player.

1. Answer a round to create a real save.
2. Keep its v, date and puzzleIndex, but replace guesses with null, an object,
   or an array containing null.
3. Refresh.

Expected: reject the malformed state and recover safely or offer recovery.

Actual: all three shapes show "This page broke" with zero answer controls.
The console reports a null length, missing map function or null correct field.
For the null save, Try this page again reproduced the same failure and held the
bad saved bytes. Invalid JSON was safely rejected; manually deleting the bad
key restored both answer controls. Retry timing for the other two variants was
not established and is not claimed.

Possible cause: shared restore validates version/date/puzzle but accepts the
game's deserializer type assertion without validating the guess array/items.

Evidence: `evidence847/daily-save.json`. This is one defect family, not three
separate bugs merely because three corrupt values triggered it.

All nine URLs also completed a real ten-round Daily through native buttons at
320px. Scores matched an independent calculation from decided-round logs.
Immediate refresh during rounds3 and10 kept exact saved bytes. Daily state held
while Unlimited/Hard started and returned. Malformed-null saves then crashed
each game, and manual key deletion restored play. Initial Hockey driver
timeouts were a help-dialog locator race, resolved by closing its real dialog;
they are not site findings. Receipts: `evidence847/hl-family.json` and
`evidence847/hl-family-retry.json`.

### QA847-04, P2: skip navigation has no target on19 routes

The full URL list and native live/local replay are in the shared report.
`/free-kick` demonstrates the failure: Enter on Skip to main content keeps
focus on that link because no `#dukb-main` exists. `/footle` focuses its MAIN
in the independent comparison. Target absence was measured on17 game routes,
reset-password and the tested unknown route. Only free-kick was keyboard
replayed. Recommended repair: give each affected actual main landmark the
global skip target, without adding duplicate IDs.

### QA847-05, P2: closing account dialogs loses opener focus

URL: `https://douknowball.com/`, shared header Log In and Sign Up.
Escape closes both dialogs, then focus becomes BODY instead of their opener.
The live and clean local replay agree. Recommended repair: retain and restore
the exact connected opener in Header/AuthModal. Footle's help correctly restores
its own opener as an independent comparison.

### QA847-06, P2: account copy contradicts guest scoring

URL: `https://douknowball.com/`, Sign Up dialog.
It says "Streaks, points and world rank only count once you have an account."
The signed-out live leaderboard explains guest participation, and the recorder
books guest completion/local streak before checking authentication. No test
score was submitted. Recommended repair: describe account-linked persistence
accurately in `src/components/auth/AuthModal.tsx`.

### QA847-07, P3: initial help traps keyboard away from visible cookie choices

URL: `https://douknowball.com/footle`, fresh context without a saved choice.
Twelve Tab and six Shift+Tab presses cycle only inside the help modal, while
cookie choices remain visible and pointer-hit-testable. Escape closes help and
the banner becomes reachable later in the normal tab order. This is a keyboard
usability defect with a workaround, not a verified consent-policy violation.
Recommended repair: coordinate initial cookie/help focus in CookieConsent and
the shared dialog without hiding or changing the user's consent choices.

## Pending consolidation

The reports now include actual NBA, MLB, NFL and NHL Front Office season runs,
one Club Manager season and return into season two, Footle Daily and Unlimited,
and a Soccer Career from native creation at16 to retirement at45. Four American
create-a-player modes are receiving a final bounded native pass. The 111-route
short-game exploratory sweep completed with no reproduced flagged failures and
three named driver limits. Mode toggles and blocked validators mean those
clicks do not establish game completion.

Claude's Release P landed during the audit and was merged without touching
paused drafts. Current live replays observe `/assets/index-E8L0RxXO.js`, SHA256
`640820ed3b9ead81190861c4b061326a372e9c942067b3440d16e5e8cdea2e0b`.
Older measurements retain their original bundle identity. Root's clean4930
build remains8542bf83. No audit-authored gameplay or historical data fix landed.

## Additional verified simulation and product issues

### QA847-08, P1: NBA and NHL trade lists omit eligible roster depth

URLs: `https://douknowball.com/nba-front-office` and
`https://douknowball.com/nhl-front-office`.

Start Boston (NBA) or Florida (NHL), then compare Roster with Trades, Trade
Finder, the manual send list and an opponent's receive list. Each roster has13
players, while the controls expose the top8 with no paging or search. Florida's
missing five include both goalies. Expected: all eligible players are reachable,
with genuine trade constraints applied to the selected proposal.

Possible cause: three rating-sorted `.slice(0,8)` calls in each board. Proposed
repair: expose the existing full eligible roster with a compact list/search,
preserving the engine's evaluation and salary rules. Do not make proposals
automatically succeed. NBA evidence is old live plus clean local; NHL was
replayed on the current live entry. The NHL lane classed its example P2; this
combined finding is P1 because core roster-management choices are missing.

Evidence: `SIMULATION-AUDIT-2026-10-01.md` and
`NFL-NHL-SIMULATION-AUDIT-2026-10-01.md`, with original rosters and UI counts.

### QA847-09, P1: completed NBA/MLB seasons give clubs unequal opportunities

URLs: `https://douknowball.com/nba-front-office` and
`https://douknowball.com/mlb-front-office`.

Start Boston or the Dodgers, play all20 NBA or27 MLB rounds, then compare each
club's final regular-season wins plus losses before playoffs. Live NBA totals
range64 to93 games; the independent clean NBA run ranges68 to94. Live MLB
ranges148 to175. Standings compare raw wins. Expected: a fair schedule with the
declared season length, or a clearly described alternative competition.

Possible cause: random per-team skip/opponent choices replace a balanced
schedule. Proposed repair: construct a sport-specific fixed schedule and book
each result once; seed postseason from the correctly completed league records.
Changing only the displayed record would hide the defect. This affects
simulation results, not historical NBA/MLB records. Three actual native full
seasons support the finding; postseason playoff games did not change the
regular-season record.

Evidence: `evidence847/simulation.json`, all30 team totals for each run.

### QA847-10, P2: Soccer Career toast covers its advance action

URL: `https://douknowball.com/soccer-career`.

Create a player at390x844, begin the career, then leave the pointer over the
bottom Joined toast and try Next Year. The toast intercepts the action for5
and12 seconds. Moving away lets it clear within4.6 seconds. Expected: a
notification does not cover the main advance control.

Possible cause: bottom-right Sonner toast overlaps the fixed career actionbar,
and hover pauses dismissal. Proposed repair: reserve notification space above
the actionbar or choose a non-overlapping placement. The persistent-hover
case is a narrow pointer viewport; native touchscreen hover was not proved.
Evidence: `evidence847/simulation.json` and the simulation report.

### QA847-11, P2: structured corrupt saves leave three simulations unusable

URLs: `https://douknowball.com/soccer-career`,
`https://douknowball.com/front-office` and
`https://douknowball.com/nhl-front-office`.

Create a valid local save. Deliberately change only Soccer `seasons` to null,
NFL `league.week` to0 (or remove schedule), or remove NHL `league.freeAgents`.
Reload and choose Try this page again. Each repeats This page broke, preserves
the corrupt bytes and offers no usable in-game reset. Invalid JSON instead
returns to usable creation/picker screens. Expected: reject or recover invalid
nested shapes and offer an explicit local recovery action.

Possible cause: permissive restores followed by unchecked nested dereferences.
Proposed repair: validate the actual persisted shape/version and offer a
confirmed reset/restore route that remains usable at the error boundary.
Preserve recoverable saves. All three cases were replayed on the current live
entry. Deliberate corruption is the prerequisite; ordinary-play corruption
and legacy migration failures are not established.

Evidence: `CURRENT-LIVE-SAVE-REPLAY-2026-10-01.md` and the NFL/NHL report.

### QA847-12, P2: Footle results relabel USD values as euros

URL: `https://douknowball.com/footle`.

Play Daily through eight distinct valid suggestions, then compare the value
tiles with the revealed answer fact. Tiles use USD; the Haaland result says
EUR216M. An Unlimited result similarly says EUR54M for Romero. The pool reads
`market_value_usd` and comparison formatting uses dollars, while Footle's
result fact hardcodes a euro prefix. Expected: retain the stored currency or
perform and explain a real conversion.

Proposed repair: use the shared currency formatter for the result fact in
`src/pages/Footle.tsx`. This verifies an internal unit mismatch, not the real
valuation itself. Two native completed games reproduce it on the current
entry. Evidence: `FOOTLE-AUDIT-2026-10-01.md` and `evidence847/footle-audit.json`.

### QA847-13, P2: Accessibility's untimed-play claim is contradicted

URLs: `https://douknowball.com/accessibility` and the demonstrating game
`https://douknowball.com/alphabet-sprint`.

Read Accessibility's no-time-pressure paragraph, then open Alphabet Sprint
without changing its default and click Start45s run. After five seconds its
clock drops from45s to40s without an answer. Accessibility says the one head
to head mode has a shot clock and everything else waits for the player.
Expected: accessibility information describes solo timed modes accurately.

Proposed repair: correct that paragraph in `src/pages/Accessibility.tsx`,
state which modes are timed and point to actual untimed alternatives. Its
skip-link claim also needs the QA847-04 repair. Current live native receipt:
`evidence847/accessibility-time-claim.json`. The initial60s locator was a
TEMP-driver assumption, corrected to the actual45s default; it is not a bug.

### QA847-14, P1: declining retirement silently loses a season

URL: `https://douknowball.com/soccer-career`.

1. Play a native-created career until Next Season presents a retirement warning.
2. Choose Not Done Yet: Keep Playing.
3. Continue the season loop and compare age with recorded seasons/timeline.

Expected: declining retirement resumes the pending playable season, including
its results, consequences and history, without consuming an unplayed year.

Actual: a full native-created career, resumed from its observed age25 save,
reached retirement at45 with missing seasons at33,37,41,42,43 and44. Each missing
age exactly matches a Next Season, warning, Keep Playing sequence with an
unchanged season count. The four late warnings advance age40 to44 while the
count stays23. Forced retirement at45 adds only the retirement row. The first
year2025 at age16 becomes2048 at45, six years behind the continuous2054 calendar.
The deliberate PED ban at39 has its own zero-app row and is excluded.

Possible cause: `advanceProSeason` increments age before the suggestion's
early returns. `declineRetirement` only changes phase to playing, leaving the
deferred season unplayed. Proposed repair: either ask before committing the
advance or resume that exact pending season on decline. Preserve intended
retirement and injury rules, finance/development consequences and save recovery.

The successful root path used native controls and original randomness, not an
engine-only simulation or fabricated progressed save. Age16 to25 was played on
the earlier live build; the observed save was returned on Release P and played
to45. An independent agent reviewed the receipt and current source, without
claiming an additional gameplay replay. Evidence: `SOCCER-CAREER-LIFETIME-AUDIT-2026-10-01.md`,
`evidence847/soccer-full-career-before-return.json` and
`evidence847/soccer-full-career-final.json`.

## Data findings delivered

`DATA-QUALITY-AUDIT-2026-10-01.md` contains seven distinct data findings/flags,
22 production dataset entries and local source/date/validation inventory.
The69 NHL and161 MLB corrupt records are counted by unions, not by adding
overlapping failed checks. Lundqvist's recorded46 points differs from
two-source27. Bo Nix's one-yard difference is unresolved publisher disagreement.
No historical correction or gameplay edit was made, and no permanent test
was added. All64 selected source/ledger RAW hashes held.

Final rankings, page decisions, disclosure checks and the pre-submission
checklist follow the final evidence consolidation. No Top20 list will be
padded with unverified suspicions. AdSense approval remains unresolved.
