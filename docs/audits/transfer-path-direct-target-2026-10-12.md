# Transfer Path direct target, 2026-10-12

Continuing the owner-reported Transfer Path review exposed a separate UI defect.
Some committed puzzles have a one-link optimum, but the board always excludes
the target from autocomplete. The input accepts only a suggestion. Its target
card is text, and there is no other direct-completion control. The hook already
accepts and verifies a target pick. A middle-player pick adds at least two links
and earns at most 900 against the advertised one-link optimum.

This isolated maintenance branch starts from accepted main 48cb9d4b. The
Mbappe/Trent app fix in PR242 and its proof extension in PR243 stay frozen.
H retains integration, publication and the other queued work. This change is
limited to target offering when the active optimum is one, matching empty-list
behavior, help, and necessary route-specific tests/control anchors. Played
names and targets on longer puzzles stay excluded. Club-season validation,
statistics, scoring, puzzle identities and save format stay unchanged.

Remote baseline evidence preceded product edits. Actual Board/autocomplete
unit cases failed on this exact defect, with all other cases passing. Nine
browser searches used the actual committed Messi/Neymar direct puzzle at three
widths under all three rules. The baseline wrapper distinguished settled
exclusions from setup errors.
Unit cases exercise the real board/autocomplete wiring with hook/frame stubs
and supplied metadata. They make no direct-teammate claim about their stubbed
endpoints. Graph, score and save proof comes from the committed browser fixture.

The fixed pass naturally selected the target, showed one connector and 1000
points, saved one step plus one win, and restored exact bytes and result.
Unlimited preserved the daily save. Effective controls preserved graph rejection
under deliberately incorrect one-link metadata and detected omitted picks
and deleted real saved results. Every app runtime stayed remote; statistics came
unchanged from committed records, all transport used fixtures or was blocked.
No sports fact, production DB operation, release output adoption or live claim.

Remote baseline 501640a7a66df7cb330bb9f156a622970d4c94ca reproduced the
defect in run 38296133483, job 114967545053. Both exact new UI cases failed
with one expected option versus zero found, and all 32 other unit/hook cases
passed. Nine real browser searches passed 90 baseline checks and each settled
on the target-exclusion message; Enter could not create a move or win. The
browser intentionally exited one and the strict baseline wrapper verified its
status, nine exclusions and zero setup failures. This is defect reproduction,
not product acceptance. Types/build and all 521 installed versions/source
holds passed. Fixed-phase route/build-reader fences were deliberately skipped.

Baseline artifact 11767788567 is retained on GitHub: 533,700 bytes, ZIP SHA256
84e0d5ea39a51bef6035dab3982ec6bb8cf65337d1089938199669d614c0b8db.
The subsequent Board edit only changes the exclusion set when the active
optimal is one, shares that set with empty-list wording and adds one help line.
The browser method and tests stayed byte equal between baseline and fixed runs.
The full baseline artifact is retained locally: 19 entries including nine
original PNGs, all independently inspected. Its report records 72 fixture reads,
45 blocked external requests, zero app/asset errors and unchanged source.
Native product/control review found no blocker.

Frozen fixed source fc82e15e0ec181d8c513792966e80290228aed11 passed run
38297069604, job 114970596797. All 34 unit/hook cases passed with zero pending
cases and no unhandled/setup markers in the retained raw output. The exact app
type gate, full app build and all 23 scoped harnesses passed, including all 15
built-output readers. Only /transfer-path was prerendered, with zero failures.
This is scoped verification, not a fresh full-suite or full-route run.

All five source controls actually rewrote the tested source and detected their
faults. Equality produced four failed/20 passing Board cases, lowercase two/22,
strict ten/14, accent folding two/22, and direct target exclusion exactly the two
owned failures/22 preservation passes. The unchanged-library bake measured
253 names, 737 variants and 253 empty spellings, plus 885 non-direct pairs,
zero direct omissions and 1,635 empty target queries with zero wrong reasons.
Mutation arms also detected 762 equality and 58 accent-folding classifications.

The fixed browser report records nine natural daily wins across 320, 390 and
1280 widths and classic, active and Europe rules. All nine restore the exact
saved bytes, one connector, 1000 points and Everyday. Three Unlimited wins keep
their selected rule and the daily bytes. Three deliberately false one-link
minima offer the real non-direct target, then actual hook validation refuses
the pick without a move, win or save. Omitting an actual pick and deleting an
actual won save each trigger the corresponding result detector. The total is
147 natural checks plus 60 control checks, 207 altogether, with 178 fixture
reads, 162 blocked external requests and zero setup, app or owned asset errors.

All 26 original fixed PNGs were independently inspected without substitution:
nine daily wins, nine reloads, three Unlimited wins and five controls. Some 320
captures have a focus overlay over the header, clear of the chain and score.
The Unlimited captures catch the result entrance animation; their reports
confirm the wins. These are functional receipts, not broad visual approval.

All 15 core source hashes, package checks and 521 installed locked versions
held. The 253 original identities and 3,640 statistics rows stayed unchanged.
The generated ledger diff is empty and all 171 dates held. Generated build
output was retained as evidence and was not adopted into the branch.

Fixed artifact 11768484662 is retained on GitHub and locally: 2,579,756 bytes,
36 entries including 26 original PNGs, ZIP SHA256
0c7adf109f3e86834a2e687c8595b35feaa2f99ee0f23ee14567bffda616f1bb.
The complete fixed job log is retained locally with LF-normalized SHA256
86476ea6b42de9061c87298bce5455f543eab260c5b999bac7f66fcc057fcc1f.
The complete baseline log is also retained, LF-normalized SHA256
0019bcc83be670b61aec3a30bdab5da31b241b330962256c580ff35b5b241bb6.
Local evidence lives under this worktree's ignored .tmp-fx/direct-fixed-fc82e15e
and .tmp-fx/direct-baseline-501640a7 directories. Later documentation-only
commits do not extend runtime qualification beyond frozen fc82e15e. No backend,
live-site, newer-main, full-suite or integration claim is made.

Draft PR244: https://github.com/PapiSalgueroM/ballpark-hero/pull/244, attached
to this chat. Native merge preview against accepted main 48cb9d4b exited zero
without conflicts. This is a Git-only preview; no merge or integrated runtime
was performed. H retains integration and publication.
