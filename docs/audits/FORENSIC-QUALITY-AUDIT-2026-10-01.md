# Forensic quality audit, 2026-10-01

Status: in progress. Codex847 is evidence only. No fixes or production data
changes are included. Original requests and lane ownership are saved in
`docs/OWNER-QUALITY-PROGRAM-2026-10-01.md`.

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

URL: `https://douknowball.com/afl-higher-lower`

Game: AFL Higher or Lower. This is a deliberate corrupt-save test, not a
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

## Pending consolidation

The simulation lane has reproduced an NBA trade-roster restriction and the data
lane has verified NHL import errors. Their final receipts and affected-route
traces are still being assembled. All-site mobile render coverage is complete;
four first-pass navigation timeouts passed sequential retries and are not
reported as site defects. Search/auth locator mistakes also require corrected
audit replay, not product fixes.

The final prioritized lists, data report, page recommendations and submission
checklist will be added after evidence review. No Top20 list will be padded
with unverified suspicions. AdSense approval remains unresolved.
