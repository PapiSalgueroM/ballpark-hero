# Footle saved practice Daily rollover

A saved five-puzzle run excludes the Daily answer on the day it starts. After Eastern midnight, restoring an unfinished run can expose the new Daily answer through the practice Give up control.

## Reproduce on the original source

- Start a practice run through Footle's public controls. Keep the authentic saved run and record the selected target without completing the round.
- Remount the same Page after Eastern midnight with that save. Verify the newly selected Daily is still playing and the saved practice target matches it.
- Confirm Give up in the saved practice round. Capture the visible answer disclosure and the Daily and Unlimited ownership records.
- Check a normal practice round, and run the held practice, Daily and Unlimited tests. Require the exact rollover failure on the original source before changing the product.

The active-entry preflight passed on PR537 at `15b74eb41d984a264c922356d02811f3dd37fef6`. [Active Footle entry](https://github.com/PapiSalgueroM/ballpark-hero/actions/runs/42370765351)


## Qualification

The active App route, uncommented Soccer catalog entry and 21,873-byte canonical saved snapshot passed. The frozen original regression reproduced a new Daily disclosure and saved Practice loss. All 54 fixed cases passed, including the ordinary Practice, Daily and Unlimited controls. The two-file physical controls restored the exact fixed product bytes. Three Chromium viewports verified the pause and same-round resume. [Original](https://github.com/PapiSalgueroM/ballpark-hero/actions/runs/42372278434) · [Fixed](https://github.com/PapiSalgueroM/ballpark-hero/actions/runs/42762361123) · [Physical controls](https://github.com/PapiSalgueroM/ballpark-hero/actions/runs/42762970118) · [Full](https://github.com/PapiSalgueroM/ballpark-hero/actions/runs/42767078265) · [Clean](https://github.com/PapiSalgueroM/ballpark-hero/actions/runs/42768334595)
