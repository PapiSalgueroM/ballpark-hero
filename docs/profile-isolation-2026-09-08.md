# Round 522: isolate profile loads

Claimed September 8, 2026, from Round 521 77ad583f. Local review candidate.

## Evidence and scope

Profile conditionally assigns user_scores, saved brackets and preferences.
A successful empty response therefore retains values from the previous
viewed player. The same component is used by the profile routes. A signed-in
player B can open A, then click My Profile to return to B without a full page
reload. The existing minute timer can save the retained A minutes under B.
The loading effect also has no cleanup guard for old lookups, detail batches
or rank queries. Those can overwrite or redirect a newer profile.

This is source evidence at claim time, not a production data investigation.
No real accounts or backend records may be read or changed for reproduction.

## Bounded plan

1. Render the real Profile with actual storage/streak logic and explicit
   synthetic backend fixtures. Reproduce populated A to empty B, stale lookup,
   detail and rank responses, an old missing-profile redirect, and the minute
   writer. Expected writes are captured locally; all other operations fail.
2. Assign per-load empty defaults, ignore obsolete async work after each await,
   and enable minute writes only for the settled current own-profile identity.
   Clear edit mode when the target changes. Do not alter the average formula,
   point accounting, historical data, date rules or authentication protocol.
3. Prove regressions with exact-failure source controls. Run exact types,
   build, related average/activity tests, the built mocked profile checks and
   all fifteen generated-site fences. Review independently before draft push.

A route key alone is insufficient: old closures can still navigate or toast,
and a fresh own-profile mount still needs to wait for its time data to load.
No broad account-store architecture or backend migration belongs in this fix.

## Results

The corrected initial real-component baseline had twelve exact assertion
failures across thirteen cases; the current-account 17 to 18 minute positive
case passed. Failures covered optional-data reset, B receiving minute 778,
pending preferences, stale found/missing lookups, stale details/rank, old
fallback row/no-row, editor carryover and mismatched cached auth identity.
The first deferred-case setup used a polling helper with fake interval timers
and timed out. Those were harness setup errors, not credited regression
evidence. Explicit React act/microtask barriers corrected the setup.

Two additional editor cases were each observed failing before their fixes:
the own username route started with blank editor fields, and returning from
A to B with no profile row left A's editor fields behind. All fifteen cases
now pass in a main-agent run. The existing eight average tests also passed
after the first isolation fix; the final combined rerun is in progress.

Production uses existing loading and viewed-user identity for readiness,
not a duplicate loaded-target state. Cached profiles and named-route ownership
must match the signed-in user ID. Badges wait for and use the loaded own
profile instead of the potentially stale auth cache. Optional results always
assign defaults. Each awaited lookup, details batch and rank continuation
checks cancellation before setters, navigation or toasts. The timer waits
for the settled own profile and cleans up during reloads. Editor fields are
seeded from each loaded identity, including the account-metadata fallback.
No history, average formula, date, auth protocol or backend implementation
changed. Every expected test write is captured locally, never transmitted.

The built Round 521 baseline also reproduced all three browser scenarios at
390px: B retained A's 7,770 points, an old missing lookup redirected B home,
and pending B preferences still attempted a minute write. The redirect caused
seven unrecognized home-page requests and the premature timer one POST; all
were blocked by the test boundary. The corrected baseline report is in the
OS-temp directory `dukb-profile-isolation-GFvOLR`. The first report
`dukb-profile-isolation-dTslHK` is retained separately because a 1ms pause
target raced the real clock in its slow-preference case. The corrected clock
setup uses a 1000ms lead and validates the paired score-feed window against
the controlled clock with a 2000ms delivery tolerance (observed 32 to 41ms).

The combined fifteen isolation and eight average tests passed (23 total).
The next exact type gate found unsupported `exact` options on the new tests'
ByRole calls. Those browser-only options were removed from the component
tests; no type suppression or production workaround was used. No build ran
before that failed type gate.

Independent review then found an introduced error-path regression: after B
had loaded 17 minutes, a failed same-account preferences refresh would now
default to zero and the timer would write one. A new targeted sixteenth case
reproduced that exact outcome before the availability fix. Successful empty
rows and failed reads must not be conflated. Preferences now carry a read
availability flag, separate from identity/loading. On failure the time card
says Unavailable, inputs are disabled with a refresh instruction, and both
the timer and save callback refuse writes. Successful empty rows still start
from zero. The positive retry must restore B's stored 17 and write 18 next.

The final combined component run passed all 24 cases (16 isolation and eight
average). Both exact app/config type gates passed. The build passed in 43.25s
with 2,841 modules and the pinned auth patch applied. All fifteen generated
site fences passed against that completed build, followed by ActivityDays
(six cases) and SessionMarks. The unchanged average browser matrix passed
all 28 states at 320, 390, 430 and 1440 with zero boundary/runtime errors;
its report is `dukb-profile-average-BmdiBl` in OS temp.

The isolated wrapper passed all sixteen tests. All 26 source controls
changed one exact anchor in a unique temporary copy and passed exact
failure-set verification (68 intended AssertionErrors total, no extras or
unhandled errors). Main independently repeated normal plus cancel,
prefserror, prefssave and backend controls. Temporary source copies were
cleaned after each run. Production and dist were not mutated by controls.

The first built isolation matrix passed seven of eight cases, with no
runtime or boundary errors. Its only failure was a text-fit proxy: the
desktop Unavailable paragraph had scrollWidth 66 and clientWidth 63, but
its full text stayed inside the actual card with about 21px clearance.
Main and the browser author inspected the screenshot. No production font
change was made to appease this false positive. The browser guard now uses
actual text ink against card and clipping ancestors, checks overlap and
viewport overflow, and has a height-only clipping control whose other
geometry conditions must stay healthy. Original report:
`dukb-profile-isolation-9ZcArX`.

The final settled browser run passed all eight cases at 390/1440 and both
height-only clipping controls, with zero boundary/runtime errors. Report:
`dukb-profile-isolation-JF6qmA` in OS temp. All ten screenshots were inspected
by the author; main inspected phone and desktop failed-load views. Only four
POSTs were locally fulfilled, each the expected B minute one after settled
transition/slow-pref cases. Old lookups and HTTP 503 cases emitted none.
The final guard verifies actual computed overflow is hidden during its
clipping control and restores the original DOM afterward. Preview 4196
serves index-CE_EUMo0.js and Profile-DyZ0G6Ls.js.

Final read-only review cleared the preferences failure/recovery fix and
found no further actionable source or test-boundary issue. This is scoped
verification, not a claim that the default full suite passed. The broad
runner remains excluded because it includes production writes/cache probes.
