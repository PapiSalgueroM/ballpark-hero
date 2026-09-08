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

Pending. No production changes at claim time.
