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

Accepted and merged as e7c669a5 after final remote verification. Publication
is pending on a host editor authentication failure. Ownership was released
for the next working publisher. Next free 998 is unclaimed.

First remote run 37118264085 stopped at the type gate: two Testing Library
role lookups used an unsupported `exact` option. No build, test or browser
success is credited to that run. The role names already match exactly.

Second remote run 37118473998 passed type/build, all existing arcade gates,
the daily reload checks, all 17 built readers and all three native profiles.
The new mounted suite passed 14 of 15 cases; its remaining query incorrectly
looked for an accessible background slider while the rules dialog hid it.
Six controls correctly rejected their intended mutation with both baselines
passing, but the wrapper rejected ANSI-coloured assertion text. The final
repair retains actual control elements for the modal check and strips ANSI
before matching assertion types. Counts and mutation requirements stay fixed.

Screenshots exposed inherited feedback claiming back-rim contact for a shot
over two metres long. Lab-only miss copy now describes a miss without claiming
contact. An added contact control restores the false wording and requires the
existing comparison case to reject it. Final coverage is 15 cases and 16
controls. Existing physics stays unchanged.

## Accepted evidence

PR112 merged `c76a45234c9f10cefb529966f461899c2b7b61c6` as
`e7c669a5eb1d353134272d1f95a82ccde2222e23`. Actual merge and CI checkout
`6655090b82b4c40d95c07aa021f4cd2fe9f22e3a` both have tree
`0edcd65fe12992abbdc3dddb0ef29d0d2dea4c89`.

Final workflow [37119027332](https://github.com/PapiSalgueroM/ballpark-hero/actions/runs/37119027332)
passed type/build, 15 real Board outcomes and all 16 effective controls. Each
control retained two passing independent original-mode baselines. Existing
Buzzer physics, practice, contest, feedback, pause and hold/release gates passed.
The practice capture control and daily reload checks passed, including key-clear
and silent-handshake controls. All 17 built readers passed.

Native browser checks passed at 320x780 touch/reduced motion, 390x844 touch,
and 1440x1000 keyboard. All 12 exits passed. Protected saves stayed byte-identical
with zero transient score/storage write attempts, page errors or asset failures.
Desktop scroll stayed at 13px through the tested retry. Phone court, actions,
paired readings, rules and desktop dark/light views were reviewed among 25
retained screenshots. This is scoped verification, not a full repository suite
or live player-data audit. No local runtime gates were run.

Artifact11273100846 (2,110,411 bytes) SHA256 matched the published digest:
`cf3e6daf5f80c62bdb5890cbaa7c76ff72ed071400286cdf7db1a6335a96d4b6`.
Evidence: `C:/Users/antho/AppData/Local/Temp/dukb-buzzer997-ci-2026-10-03/c76a4523/evidence/`.
The twelve held raw drafts and seven stashes passed preservation after merge.

## Publication pending

As of 2026-10-03 07:34 EDT, no final publish action was sent. Lovable's editor
reported Firebase auth initialization timing out after 60 seconds. Reloading,
rebinding the existing tab and a fresh tab in the same authenticated browser
did not restore it. Project history/preview remained empty and the Publish
panel displayed only loading placeholders. The unused blank recovery tab and
stalled original were closed. Fresh publisher tab8 remains for handoff, and
the public game remains in tab6. No credentials or account settings changed.

The public domain returned200 with `/assets/index-DS-YzsM8.js`; this is still
the previously published996 build. The preview-host HTTP request timed out.
Main `8c627eca50995c30f7a5416f7469a6380c61dd3f` contains the accepted product
and acceptance docs. The next publisher should sync accepted main, publish,
and verify the live unscored Shot lab before claiming delivery. The narrow
publication claim is released, with Claude's separate lanes preserved.

Screenshots are under
`C:/Users/antho/.codex/visualizations/2026/10/03/01a10028-7165-70b1-90e1-1946dd227be4/`:
`shot-lab-preview997.png` is the verified remote build, not a live-site claim;
`shot-lab997-publisher-blocked.jpg` shows the host's unfinished publish panel.

The read-only next candidate is a Rugby League challenge inside Champ or Not,
using existing premiers/Dally M generators and revealing the actual answer.
No code or claim exists. Existing documented coverage ends in2025; no current
roster or Rugby Union model is accepted. Recheck ownership and data provenance
before implementing. Site/gameplay work remains ahead of AdSense/indexing.
