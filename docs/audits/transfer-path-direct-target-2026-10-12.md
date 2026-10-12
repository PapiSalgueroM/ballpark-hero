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

Remote baseline evidence must precede product edits. Actual Board/autocomplete
unit cases must fail on this exact defect, with all other cases passing. Nine
browser searches use the actual committed Messi/Neymar direct puzzle at three
widths under all three rules. Correct fixture data and settled exclusions must
be distinguished from setup errors. No passing product or runtime claim yet.
Unit cases exercise the real board/autocomplete wiring with hook/frame stubs
and supplied metadata. They make no direct-teammate claim about their stubbed
endpoints. Graph, score and save proof comes from the committed browser fixture.

The fixed pass must naturally select the target, show one connector and 1000
points, save one step plus one win, and restore exact bytes and result. Unlimited
must preserve the daily save. Effective controls must preserve graph rejection
even under deliberately incorrect one-link metadata and detect omitted picks
and deleted real saved results. Every app runtime stays remote; statistics come
unchanged from committed records, all transport uses fixtures or is blocked.
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
The browser method and tests stay held. Fresh fixed-source proof is pending.
The full baseline artifact is retained locally: 19 entries including nine
original PNGs, all independently inspected. Its report records 72 fixture reads,
45 blocked external requests, zero app/asset errors and unchanged source.
Native product/control review found no blocker; all actual fixed runtime gates
remain required before qualification.
