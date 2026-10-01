# Shared simulation audit, NFL and NHL Front Office

Audit only. Current finding replay: index-E8L0RxXO.js, SHA256 640820ed3b9ead81190861c4b061326a372e9c942067b3440d16e5e8cdea2e0b. Local reproductions: root clean 4930, 8542bf83, runtime 40947.

## Verified findings

### SHARED-SIM-01: P2, NHL trade screen makes roster players below the first eight unreachable

URL: https://douknowball.com/nhl-front-office

Steps:
1. Start a Florida Panthers franchise, answer the opening press question and open Trades.
2. Compare the 13-player roster to Trade Finder and the manual send list.
3. Choose Anaheim as the trading partner and inspect the receive list.

Expected: The roster players eligible for the existing trade helpers should be reachable, directly or through paging/filter controls.

Actual: Finder and send list each expose the eight highest-rated Florida players. Aaron Ekblad, Gustav Forsling, Uvis Balinskis, Akira Schmid and Jacob Markstrom are absent, including both available goalies. Anaheim receive rows expose eight IDs from its 13-player roster. There is no paging or targeting control to reveal the remaining players.

Possible cause: Three explicit rating-sorted slice(0, 8) calls in NhlFrontOfficeBoard.tsx bound Finder, manual send and receive.

Boundary: Manual targeting was inspected without accepting a trade. This does not allege that all proposals should be accepted or that injured/invalid proposals must pass.

Evidence: shared-sims-current-trade.json. Screenshots: sim-current-NHL-trade.png, sim-NHL-320-trade.png, sim-NHL-1440-trade.png.

### SHARED-SIM-02: P2, Structured corrupted saves trap NFL and NHL in a permanent error/retry loop

URL: https://douknowball.com/front-office, https://douknowball.com/nhl-front-office

Prerequisite: Deliberately corrupted localStorage save. This was not encountered during ordinary season play.

Steps:
1. Create a native saved franchise.
2. For NFL, edit front-office-save-v1 so league.week is 0, preserving the rest of its valid JSON. Alternatively delete league.schedule.
3. For NHL, delete league.freeAgents in nhl-front-office-save-v1 while preserving the rest of its valid JSON.
4. Reload, then activate Try this page again.

Expected: Reject the invalid saved shape and permit a fresh franchise or provide a safe clear-save/reset recovery action.

Actual: Both routes render This page broke. Try this page again reloads into the same error. The raw damaged save is retained and the game reset is unavailable in that error screen. The recovery buttons are retry and Back to the games; neither clears the unusable game state.

Possible cause: Restore accepts any object containing league/myTeam, then renders unchecked nested fields. NFL dereferences schedule[week - 1].find; NHL maps freeAgents. RouteErrorBoundary preserves the broken save but provides no game-specific reset.

Boundary: Malformed JSON safely returns to the club picker in both games. No natural corruption event, legacy migration regression or loss of an otherwise valid save was established.

Evidence: shared-sims-current-entry.json, shared-sims-corruption-final.json. Screenshots: sim-current-NFL-corrupt.png, sim-current-NHL-corrupt.png, sim-corrupt-final-NFL-zeroPeriod-local.png, sim-corrupt-final-NHL-missingFreeAgents-local.png.

## Coverage and healthy outcomes

- NFL, 320px, no-preference: 17 periods, playoffs, 3 draft picks, 2027 hub. Initial/recap/next-season saves resume with exact bytes. One season/champion entry, zero runtime errors and page overflow.
- NFL, 1440px, reduce: 17 periods, playoffs, 3 draft picks, 2027 hub. Initial/recap/next-season saves resume with exact bytes. One season/champion entry, zero runtime errors and page overflow.
- NHL, 320px, no-preference: 20 periods, playoffs, 2 draft picks, 2027 hub. Initial/recap/next-season saves resume with exact bytes. One season/champion entry, zero runtime errors and page overflow.
- NHL, 1440px, reduce: 20 periods, playoffs, 2 draft picks, 2027 hub. Initial/recap/next-season saves resume with exact bytes. One season/champion entry, zero runtime errors and page overflow.
- 74 native periods and 10 draft picks in the four complete campaigns.
- NFL exposes all 15 roster players, including its lowest-rated original player. Staging a choice does not write the save.
- Held final-action Enter books one season. Held draft Enter chooses one prospect; subsequent native double click settles distinct remaining picks without duplicate IDs or a duplicate offseason.
- Malformed JSON returns to the picker in both games. Structured missing/range-invalid fields trigger the reported recovery issue.

## Limits

- No authenticated score, account, signup, report, impression or analytics write was made. All non-GET and vendor requests were aborted in disposable contexts.
- Recorded booking network calls were blocked, so successful remote booking is not credited. Local franchise saves and native game outcomes were inspected.
- Real-player roster/stat correctness was not independently researched in this lane. Generated simulation outcomes were not presented as sports facts.
- One franchise per game was completed at each viewport; unlimited multi-season longevity and every club/offer were not tested.
- The NHL guide explicitly calls the season roughly four games per round / 82-game-shaped, so variable played-game totals are not labeled an absent feature or a defect here.
- Initial failed locators, a slow live fetch and premature reload checks are preserved below as harness limitations. They are not site findings.
- Early rapid-action copies re-injected their initial save on every document; their reload/draft conclusions are invalid and are superseded by one-time injection receipts.
- One late corruption replay observed a loading page before mount; that observation is not recovery credit. Current-entry replay waits for mounted game/error content and confirms both error loops.

Cleanup: all owned browser contexts/browser processes closed, no owned server, root 4930 untouched. No product edits, Git changes or external writes.
