# Round997: Buzzer Beater Shot lab

## Design contract

Learn what changes a jump shot by repeating one setup and comparing actual
releases. This is an additional mode inside Buzzer Beater, using its existing
physics, court and flight timing. It is not a second basketball game.

The loop is choose Power, Arc and Fade, shoot, inspect the landing, retry with
one adjustment, then compare. Retry retains the same distance, defender and
controls. The lab repeats its random seed for that setup so the player's change
can be compared without an unrelated random draw. Changing setup clears the
comparison. The interface explains that this is controlled, unscored practice.

There is no lab score, leaderboard or completion reward. Existing daily,
unlimited, ten-shot Steady practice and 25-shot contest rules stay unchanged.
Lab attempts never change daily saves or sitewide completions. The lab remains
available after a completed daily and offers direct exits to the existing modes.

Controls use the existing steady sliders and explicit Shoot button. The
primary actions are Retry this shot, Change setup and Leave lab. Worked
instructions appear before entry and remain available from a rules button.
Keyboard focus follows aiming and results without page jumps. Touch targets
aim for 44px, never below 30px. Pause, help and reduced motion remain supported.

## Visual direction

The court is the main display. Compare a dashed amber previous actual shot with
a solid contrasting current actual shot, using a visible text legend. The
clean aiming preview remains clearly identified as a preview. A compact paired
readout shows the actual release settings, rim crossing and entry angle. Blocked
shots and shots that never reach rim height show their actual stopped outcome
without hypothetical rim metrics. Far misses clamp to the inset edge, which the
legend states. Labels and line styles carry the distinction as well as colour.

Keep the existing court palette, app typography and rounded controls. No new
fonts, generic status dashboard or decorative motion. The existing ball flight
responds to the player's release and uses the path returned by the engine.

## Data and scope

No new real player, team, stat, rule or external asset is introduced. Existing
simulation dimensions and source provenance are unchanged. Product scope is
BuzzerBeaterBoard and a small adjacent comparison component if needed. Shared
arcade physics, flight and storage modules remain unchanged.

## Verification contract

- Actual mounted Board outcomes: exact repeated trajectory at identical inputs;
  retained controls; changed trajectory and a measured improvement at adjusted
  inputs; correct paired actual results; no stale comparison after setup change.
- Duplicate release, help/pause, keyboard/touch, reduced motion and exit checks.
- Daily save bytes and completion counts held through lab entry, retries, setup
  changes and exit, including an already completed daily.
- Effective executable-code controls, each with a named expected rejection and
  proof the mutation changed its target. Preserve the original mode baselines.
- Existing Buzzer, practice, contest, input, pause and storage regressions.
- Real app type gate and production build, then all 17 built readers.
- Native 320/390/1440 views, keyboard/touch and reduced motion, measuring overflow,
  focus and actual rendered paths. Screenshots of the comparison are reviewed.

All runtime verification runs remotely because the local machine is loaded.
No live database probes, search submissions or score writes are part of QA.

## Status

Claimed on main 9a99a87b. Implementation and remote verification are in progress.
No acceptance or publication is claimed yet. Next free 998 is unclaimed.

First remote run 37118264085 stopped at the type gate: two Testing Library
role lookups used an unsupported `exact` option. No build, test or browser
success is credited to that run. The role names already match exactly.
