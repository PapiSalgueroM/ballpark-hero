# Round 529: Conquest help without browser storage

NBA and NFL Arcade read their first-visit help preference after the player
selects Arcade. The preference access was outside a try/catch, so a blocked
storage getter/read or failed first-visit write could throw from the page's
effect. The startup auth fallback does not replace browser storage globally.

## Scope

Keep the existing two keys and healthy-browser behavior. If storage cannot
be read or written, open the instructions and let the player close them,
reopen them with the help button, and play. Preserve mode selection and
unfinished daily routing. Follow Footle's existing local fallback pattern.
No game rules, sports data, daily records, account or backend changes.

## Verification plan

Reproduce failure in the real page component and built app before editing.
Cover missing/seen preferences, throwing getter/read/write, each sport's
independent key, manual reopen and mode changes. Prove the regression checks
with exact changed-source controls and a dead browser help-button control.
Run both exact type configurations, production build, all fifteen generated
site fences and real phone/desktop browser interactions with synthetic reads.
Record failures separately from successful reruns. Independent review required.

## Results

Before editing, the real-page tests failed all four read/write fault cases.
The old built app on port4205 also failed those four cases, with exactly the
injected read/write errors and missing help dialogs. Its four healthy-browser
cases passed, establishing that the browser driver could navigate both games.

The final twelve real-page cases pass, including both the storage getter and
getItem failures in each denied-read case. Main reran the final harness.
Both exact TypeScript configurations and the production build pass. All
fourteen Node site fences pass through explicit ONLY with DB_PROBE=unreachable;
simPrerenderBoot passes separately on installed Chrome using port4330.

The built app on port4206 passes all sixteen browser cases: NBA and NFL, 390
and 1440 widths, missing/seen/read-denied/write-denied preferences. Each closes
help, reopens it manually, starts a real battle and returns to Modes. Four
dead-button controls replace the actual help button, require the expected
dialog timeout, restore it and complete the normal flow. All reports show zero
runtime, unexpected transport, local asset or overflow failures. Unrelated
saved data stays unchanged. Main inspected settled phone help and desktop board
screenshots; no layout change was needed. Independent production review clear.

Preview4206 serves index-Bm5MbPff.js. No snapshot, ledger, dependency, root,
backend or account changes. Previous previews remain intact. Draft only.

All eighteen source controls pass their exact contracts, producing twenty
expected assertion failures. The separate unexpected-runtime control exits1
and receives no passing credit. No unhandled or suite errors occur in green
or intended assertion-control runs.

## Evidence

- Baseline browser: `%TEMP%/dukb-conquest-help-Ho97v2/report.json`
- Final browser and screenshots: `%TEMP%/dukb-conquest-help-sCBYNg/report.json`
- Browser controls: `%TEMP%/dukb-conquest-help-RoRTG5/report.json`
- Source controls: `%TEMP%/round529-help-controls-d03a71b202f54681869d6444b4785719/results.json`
- Build/site/boot logs: `%TEMP%/dukb-round529-build.log`,
  `%TEMP%/dukb-round529-fences.log`, `%TEMP%/dukb-round529-boot.log`
