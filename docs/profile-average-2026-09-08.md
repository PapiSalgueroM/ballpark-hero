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

Pending. No production change at the claim checkpoint.
