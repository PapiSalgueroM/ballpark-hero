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

The simulation lane has reproduced an NBA trade-roster restriction and unequal
NBA/MLB season schedules affecting seeding. The data lane has verified NHL and
MLB import errors. Final receipts and affected-route traces are still being
assembled. All-site mobile render coverage is complete;
four first-pass navigation timeouts passed sequential retries and are not
reported as site defects. Search/auth locator mistakes also require corrected
audit replay, not product fixes.

The final prioritized lists, data report, page recommendations and submission
checklist will be added after evidence review. No Top20 list will be padded
with unverified suspicions. AdSense approval remains unresolved.
