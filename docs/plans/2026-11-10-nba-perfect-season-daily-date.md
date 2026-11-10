# NBA Perfect Season Daily date

Scope is the active `/perfect-season-nba` Daily game. The page pins the Eastern date when it mounts and uses that date for the theme, attempt gate, and save. A tab opened before midnight should finish that same puzzle even if the player enters Daily after midnight. R0180 is an unspecified bug lead and this is an independently identified behavior.

1. Run `src/test/perfectSeasonNbaDailyDate.test.tsx` on the admitted parent. Mount and enter before midnight, mount before and enter after, then mount and enter after. The real Daily page drives six spins and six picks from synthetic archive rows, runs the actual 82-game simulation, and writes the dated attempt. Verify all three completed journeys in the raw receipt. The original should fail only at `NBA_DAILY_PICKER_MOUNT_DATE`.
2. After the original red run is admitted, pass the pinned Eastern date through the existing Daily picker API. Verify the crossover wheel and simulation match the before-midnight run, the new mount gets the next puzzle, and all five held archive retry tests still pass.
3. Run the isolated control, type, build, and native gates. Verify the dated attempts and unchanged site surfaces before preparing a clean draft.

The test fixture has two eight-row pools. November 9 selects Three-Point Boom and November 10 selects 2000s Basketball. The prior-day picker should draw zero-based ordinals 2, 4, 3, 5, 5, 3 with simulation seed 1326654265. The next-day picker should draw 3, 5, 7, 7, 6, 4 with seed 1249224418. The crossover on the original is expected to keep the prior-day theme and save while using the next-day ordinals and seed.
