# Round 521: pair the profile average's inputs

Claimed September 8, 2026, from Round 520 9865eb3e. Local review candidate only.

The own-profile calculation divides the displayed maximum of account/browser
points by browser-only plays. Those values do not describe the same set of
games. Existing source inspection gives a synthetic reproducible case:
account 550 points, eleven score rows, browser 50 points and one completed
game. The current average displays 550, although this browser's average is 50.

## Bounded plan

1. Write a real Profile component test with actual local streak readers,
   mocked auth/backend boundaries, frozen time and no permitted backend writes.
   Reproduce the wrong average before changing production.
2. Use browser points/browser plays for the own-profile average. Keep the
   Avg Score label with a visible This browser scope. Show Not yet when no
   local plays exist. Other-player averages and Total Points stay unchanged.
3. Verify the fixture, empty browser, other profile, local-only points and
   unchanged stored totals. Prove the old mixed numerator and absent scope
   label with exact-failure controls. Run exact types, build, scoped browser
   checks and all fifteen generated-site fences before backing up a draft.

This does not restore account history, establish authoritative lifetime
aggregates or fix cross-device/date-boundary problems. profiles.streak_state
is a copied browser snapshot, not an account-wide aggregate. Separate account
points and score-count writes must not be assumed atomic. Never manufacture
missing history or add browser/server totals with unknown overlap.

## Results

The pre-fix real-component run failed five of eight assertions: the mixed
average, missing scope, empty-browser display, genuine zero-score average and
own-username route. Other-account and local-only cases passed. There were no
unexpected boundary calls, storage changes, console errors or unhandled errors.

After the three-line calculation change and scope caption, all eight tests
pass in a fresh main-agent run. The tests preserve the full seeded storage
snapshot. The other profile's empty-account average remains zero; own empty
browser now says Not yet, which is distinct from a real zero-score completion.
The first exact type gate caught an obsolete MemoryRouter future prop in
the new test, which the installed router no longer accepts. Removing that
test-only prop corrected it without suppressing the type error. Exact app
types and the production build then passed (37.54 seconds, 2,841 modules).
All fifteen generated-site fences pass, including actual snapshot boot and
eleven retired-route redirects. ActivityDays' six cases and SessionMarks
also pass. Main independently reran the eight-case wrapper and the mixed,
caption and blocked-backend source controls; their exact assertions fired.
The test author ran all eleven source controls successfully: mixed inputs,
missing scope, empty browser, genuine zero, other profile, other empty profile,
other-profile scope, rounding, unchanged Total Points, storage mutation and
caught backend write. Each changes exactly one anchor in a unique OS-temp
source copy and requires the exact named AssertionError failures, with no
extra failures or unhandled errors. Temporary copies/config/cache are cleaned.
The config type gate also passes.

The first full browser matrix got all average, scope, points, storage and
network-boundary outcomes right but failed its geometry assertion. The test
incorrectly treated a paragraph's line box as a clipping boundary. Both the
existing Avg Score label and new caption had this property. At 320px the
page's scroll/client widths were both 320; the card ran from x=167 to303.
Main inspected the saved 390px and1440px screenshots with no visible clipping.
The first report remains at the local temporary directory
`dukb-profile-average-OE1DnN`, not counted as a passing run. The corrected
test must measure actual clip boundaries and prove a clipped-card control.
The corrected full matrix passes28rendered states at320/390/430/1440, including
reloads, empty browser, another profile,55,000account points and123-day streak.
There are zero unexpected backend/write/runtime errors. All external HTTP is
blocked or explicitly fulfilled from synthetic fixtures; all WebSockets and
service workers are blocked. No real login or account operation was performed.
Value, scope and actual-clipping DOM controls each fail exactly their named
assertion, then restore the changed node/style. The clip control narrows the
card from171px to48px with overflow:hidden; caption ink reaches261.39px past
the real250px clip boundary. Main reran the390px normal and clipping control,
read all four result reports, and inspected final390/1440wide screenshots.

Final local evidence folders (all below the Windows OS temp directory):
normal `dukb-profile-average-Xs8Rj0`, value `dukb-profile-average-XKvoBy`,
scope `dukb-profile-average-iLImqr`, geometry `dukb-profile-average-Jd6Guk`.
Each report includes observations, boundary logs and screenshot paths.
Final review then found a specificity gap: the width-based clip also trips
the existing horizontal-overflow check. That is a real detected clip, but it
does not independently prove the new ink-clip check. Before handoff, replace
it with a height-only clip and require every other geometry condition to
remain healthy while an ink-boundary check fails. The stronger height-only
control now passes. It changes height from 99px to 40px, keeps width at 171px
and every paragraph's client/scroll width at 123px. All non-clipping geometry
conditions are explicitly required to pass. The clip bottom is 785px while
text bottoms reach 806, 822 and 836.5px. Main independently reran it, and final
review confirms the specificity issue is resolved. No production change.

The settled full matrix was rerun successfully: 28 states at all four widths,
plus all three exact controls, with zero boundary/runtime errors. Final
evidence folders superseding the earlier passes: normal
`dukb-profile-average-XzFzqd`, value `dukb-profile-average-vStHLX`, scope
`dukb-profile-average-Ua767z`, and height clip `dukb-profile-average-b1ZpWf`.
The old width control was also run with the new isolation requirement and
failed that requirement, as intended (`dukb-profile-average-XY5fjT`).
Main's final height-control run is `dukb-profile-average-o8GID4`.

Independent read-only review of the production diff, real-component tests
and initial harnesses found no actionable issues. Browser measurement review
found and resolved the control-specificity gap above. No remaining actionable
review findings. No committed snapshots, sitemap ledger,
package files, auth implementation or backend source changed. Preview4194
serves `index-DfNBd-Iv.js`, `Profile-CNVG3sa7.js` and `index-C2w-JxlF.css`.
The default broad suite stays unrun because of its production write paths.

## Separate next finding, not fixed here

Read-only review found that switching profiles can retain the previous
player's optional data. user_scores, brackets and preferences are assigned
only when populated; a successful empty response does not clear them. The
load effect also has no stale-response guard. A signed-in player viewing
someone else and then using My Profile can therefore inherit that person's
displayed minutes, which the existing own-profile timer may subsequently
write under the signed-in ID. This is source evidence only at this point.
Round 522 should reproduce it with deferred mocked requests before fixing
per-load defaults, stale responses and timer readiness. No production
records, history restoration or backend migration belongs in that fix.
