# Round 970 resume preparation, 2026-10-03

Prepared only. No product test, type check, build or browser ran in this
resume. The shared 36-case save gate and round 970 acceptance remain open.
The application Board is still the verified pre970 source. No publication
was attempted. Four authored JavaScript files passed syntax checks only.

The quiet-lane monitor ran for ten minutes, required two consecutive
samples without active type/build/test jobs and at least 2GB free RAM,
and never launched its queued test. Its complete samples are in
`quiet-lane.jsonl`. No unowned process was stopped. All owned extraction
and monitor processes finished; nothing is queued after this checkpoint.

## Reviewed preparation

`frontOfficeSaveRecovery.test.tsx.txt` contains only a test-driver proposal:
import `within`, retain the asserted recovery alert, and find the same
Delete unusable save button by its role and accessible name inside that
alert. This avoids calculating accessible names for all 32 club buttons
in every corruption case. All 36 cases, assertions, deadlines and both
pool/period rejection maps are held. Past timings identify a plausible
hotspot, not a measured fix. The actual root test was restored to its
original bytes after archival. Apply these three small hunks to current
source after checking ownership, never replace a changed test wholesale.

The revised `NhlWaiverReceipt.outcomes.tsx.txt` supersedes only the original
draft's outcome fixture. It builds complete hub save fixtures with the real
owner-mandate helpers and checks entire saved objects after actual waivers,
ordinary play and repeated callbacks. Simulated non-default press tilt and
trade text make metadata loss observable. All eight case names remain.

The revised `simNhlWaiverReceipt.mjs.txt` uses physical pre970 reference
`98cc4cc6`, preserving round 969's human-owner offseason argument. The
earlier draft default `4ac35aad` omitted that argument. A captured actual
pre970 Board can still be provided through NHL_WAIVER_REFERENCE_FILE.
The new metadata control resets persisted press tilt and trade text and
provisionally expects rows 1, 3, 4, 5, 6 and 7 to fail. All six control maps
and the physical-before map require actual execution before acceptance.

The original receipt component, CSS, component tests and seven Board hunks
in the parent directory are unchanged. The retained seven component passes
apply to that original component only, not the new outcome/native drafts.

## Isolated source and browser fixtures

A separate source checkout was prepared from `504efc82` at:

`C:/Users/antho/AppData/Local/Temp/dukb-nhl970-clean-gate-2026-10-03-resume`

It excludes the twelve paused root drafts. Five original files were restored
after checking their normalized hashes, all seven Board hunks matched once,
and the resulting Board matched the original candidate hash. The strengthened
outcomes and runner then replaced their draft versions in this gate only.
`prepared-source.json` records those final prepared bytes. The actual root
Board and engine remain unchanged. This gate is neither a merged-tree pass
nor a substitute for checking newer source on the next resume.

`prepare-source.mjs.txt` records the exact preparation. It fails if restore
targets already exist, so do not rerun it against the prepared gate.

The `native/` text artifacts preserve the new browser fixture. Their README
contains serial preparation and execution commands. Preparation compiles CSS
from the supplied source gate. The driver uses one owned headless Chromium
with serial desktop keyboard, 390px touch and 320px reduced-motion touch
contexts. Requests are fulfilled at a synthetic loopback origin without a
host process; outside transport fails. No browser was opened in this resume.

Immediate receipt visibility, focus and scroll are measured before any
locator can scroll to the new receipt. This is a real pending risk: the draft
inserts the receipt above the roster while removing the focused confirmation
row. Preserve failures and fix the actual behavior if those checks reject it.
Other checks cover exact engine values, finite 420ms/static motion, passive
tab identity, quiet refresh, saves/RNG and existing 44px controls. Direct
callback probes are separately labeled. Native save scope is explicitly
limited; the separate outcome fixture owns the complete-save comparison.

## Resume order

1. Pull and check the newest masters and ownership. Keep paused drafts and
   stashes untouched. Coordinate one quiet serial lane with Claude.
2. Apply the reviewed alert-query proposal, then run the complete existing
   shared save runner with FRONT_OFFICE_SAVE_CONTROL=all. Require normal36,
   exact pool4 and period2 rejections with all other cases passing. Do not
   raise deadlines or credit filtered cases as the full gate.
3. Review the prepared970 source against current source. Run real app types,
   build, eight outcomes, physical-before and six effective controls serially.
   Run the component cases and all required built readers after the build.
4. Prepare and execute the native fixture from final candidate bytes. Inspect
   the screenshots as well as the computed layout/motion checks. No source
   regex or syntax check substitutes for browser behavior.
5. Only after actual acceptance, apply the owned component files and narrow
   Board hunks to the shared checkout. Preserve the round969 owner argument,
   verify final source, stage explicit owned files and update both masters.
   Claude retains Release Z merged-tree acceptance and publication.

Next free round remains 971. This work resumed the existing claim.
