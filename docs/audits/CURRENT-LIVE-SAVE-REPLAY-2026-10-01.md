# Current live Soccer save replay, 2026-10-01

URL: https://douknowball.com/soccer-career. Published entry `/assets/index-E8L0RxXO.js`.

The previously local-only SIM-04 is now confirmed on the current live build.

1. In a new isolated browser, create Audit Live Save Replay, Spain, Striker, Current era, with a normal native potential roll and Begin Career.
2. Preserve the actual youth save, age 16 with one season row.
3. Change only `soccerCareerSave.seasons` to `null`, then reload.
4. Click Try this page again.

Both loads show This page broke. The corrupt bytes stay in storage after the first crash, and retry fails again. Expected behavior is a usable recovery or local reset path. The page instead keeps the bad save while hiding the career's New Career controls. This remains P2, grouped with the original SIM-04 rather than counted as another defect.

The original valid save was restored afterward and the normal Next Year action returned. Its serialized bytes were not identical after load, so this check credits usable recovery only, not byte-exact restore preservation. The disposable browser then closed. No account, server write, code, Git, publication or original simulation report changed.

Evidence: `current-live-save-replay.json` and inspected `current-live-save-replay.png` in this directory. The earlier country-option locator timeout is retained in `current-live-save-replay-before-option-label.json` as a setup diagnostic, with no product-failure credit.
