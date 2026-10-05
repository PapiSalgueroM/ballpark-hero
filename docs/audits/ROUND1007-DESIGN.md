# Round 1007: Rugby League review and missed-call retry

## Product contract

Finish ten calls, understand each result, then retry the ones you missed.
This extends the existing Rugby League challenge inside Champ or Not. It is
not a new game, record bank or scoring system.

The original ten claims, earned score and five-per-category totals stay fixed.
The completed result offers Review ten calls. Ten numbered 44px tiles select
one compact claim card showing the original statement, original CHAMP or NOT
choice, whether the statement was true and every real winner for that year.
Back to original results returns to the review opener with preventScroll.
Future original claims cannot be reviewed before the run finishes.

A run with misses also offers Retry N missed calls. Its queue contains only
the original missed indexes, in their original order, with each appearing once.
Each retry keeps the existing CHAMP/NOT decision and explicit reveal/Next flow.
The retry result reports corrected calls separately. A 7/10 original result
remains 7/10 even after 3/3 corrections. A perfect original run has no empty retry.
Back to original results retains a partial retry and offers Resume missed calls.
After the retry finishes, View retry result reopens its receipt. Try missed calls
again is an explicit new retry attempt; nothing loops or awards points silently.
Play another ten clears all original review and retry state.

Rules explain the separate scores before play and remain reopenable. All new
actions have 44px targets. Review uses a tile picker and one card, not a stack of
ten cards. Phase changes use the existing reveal hook and preventScroll focus;
review opens with the selected tile focused, and tile changes keep focus there. Normal and reduced-motion
flows must keep the selected statement, explanation and next/back action readable.

## State and data boundaries

Only RugbyLeagueChallenge.tsx changes product behavior. The generator, legacy
Champ hook, database loaders and completion pipeline remain untouched. Original
answers are correctness booleans, so original choices are reconstructed from
the frozen round truth and that boolean. Retry choices and score are separate.
The same synchronous phase ref guards double answers, advances and retry starts.

Use only the original run's ChampRound objects from the existing nrl_premiers
and nrl_dally_m records, through 2025. Preserve shared winners verbatim. Do not
add narrative facts, new fetches, Union/Aussie Rules records or statistics.
The representative fixture and provenance remain those accepted in Round 998.
This round is not a production completeness audit.

State survives existing within-page mode changes. Reload still starts over,
as the UI says. No new browser save, ranked score, completion request or Daily
record change is introduced.

## Verification contract

Mounted tests must measure a mixed original run, review all ten exact claims and
original choices, verify all shared winners, retry exactly its missed indexes,
and retain the original total/category scores throughout. Prove partial retry
and revealed retry survive mode return and Back/Resume, duplicate answer/advance
guards, perfect-run behavior, explicit repeated retry, new-run reset, safe help,
focus recovery and no early review. Hold Daily saves and completion calls.

Effective source controls must change a real selection, displayed fact, retry
score isolation or phase guard and fail the exact intended outcome while an
independent original-game baseline stays green. No timeout/import error counts.

Remote verification includes real app types/build, new outcomes/controls,
existing Round 998 outcomes/controls and original Champ reveal/no-double-record
regressions, plus all 17 built readers. Native 320/390 and desktop touch/mouse/
keyboard profiles, dark/light and reduced motion must inspect review and retry
context without a driver scroll hiding a product failure. Measure bounds,
focus, protected bytes, console/page errors and attempted score writes with all
external transport stubbed. Retain screenshots and perform independent visual
review. New geometry guards need changed-layout rejection/restoration controls.

No local builds, tests, browser processes, installs or database probes.

## Status

Product source is ready for remote verification. No runtime acceptance or
publication is claimed. Root owns Git, CI, integration and release receipts.
