# Manager record retention boundary, test-only handoff

This branch starts at Claude I1343's exact source
`5053712fdf440201bc61a9f5dcf953e2d35ac120`. Application, existing I tests/proofs,
packages and release kit stay unchanged. I owns the product correction and release.

Source review found that playMyMatch appends to h2h and slices its last300 entries
before calling noteHighestScoring. An upgraded save without a stored highestScoring
record is then seeded from that already-trimmed book. A highest5-4 match that was
still available as the oldest entry can disappear during the next lower-scoring
match and be replaced by a lower record. It also incorrectly counts that newly
evicted match as previously unknown. The available legacy winner needs to be
captured before eviction, with the existing missing-match accounting preserved.

The new test-only proof uses actual public match/save APIs with explicitly prepared
retained legacy histories. Their scores are declared counterexamples, not real
results or naturally played seasons. It must distinguish precise record assertions
from setup/transport/process errors, retain whole state/RNG observations before
classification, and preserve neighboring boundary/stored/null cases. Actual app
types and the unchanged I1343 related tests also remain required. All runtime is
remote/offline, with source/installed/521-version holds and retained evidence.

No runtime reproduction or product correction is claimed by this preparation.
Root and independent native reviews closed the new six-case method. Seven paired
observations retain eighteen whole-state/save/RNG holds each. Fresh actual module
instances give both arms identical press/message counters; no IDs or fields are
normalized. Two exact Boolean failures and four preservation passes are the only
accepted baseline. The unchanged three related I files contain51 cases. Latest
I1343 daa3ead7 has identical core and records blobs to5053712f, so the explicitly
frozen defect source still matches. No new application source binding is implied.

Frozen test SHA2565a83097cb26a7e36072caae3bdf03d840152b4d5d89d4a594ce733ec4ffcc81e;
helperf1fb6e2f6100d8956ed96bad56c8793ccc33e0663d42c2269601388543f4a249;
workflow94ffbab1b18d7560d8479962565c994a00b253fec96d4126c566d53503758fb2.
Remote baseline dispatch follows. I should run the unit directly after correcting
the product; the helper intentionally accepts only this frozen defective baseline.

This defect is separate from the known startMidSeason manager-record contamination.
Our PR287 clears decisions only and does not reset careerStats or h2h. No named
stats-reset follow-on was verified, so that separate obligation remains open.

Remote baseline4932e1912bf34b013507ed22499b22b5176aedaf passed its strict defect
contract in run38907874597/job116995946152: six completed cases, exactly two
record Boolean faults, four preservation passes, zero setup faults,51 unchanged
related passes and empty type output. In both fault arms, an actual public seed1
Everton match ended5-1 with1350 draws. The old available5-4 was lost, producing
missed1 instead of0 or51 instead of50. Save/load preserved the wrong record,
without another draw. The other299 historical rows stayed exact.

Artifact12049106802 is38,746,751bytes, SHA256
c01283965e1fa2eb096ef8e7ea28c3dd212bf895afb22df1070980c43fe2e068,
retained under dukb-handoff/2026-10-16/manager-record-boundary. Root reopened raw
states and classifications; independent review verified all25 physical files,
3727source/package entries, eight exact Git bindings,521versions and24466 installed
file hold receipts. All seven actual/reference reports, whole non-record states,
JSON saves, loaded states and RNG streams agree. Sixteen holds per pair were
independently recomputed from raw. The two input-immutability holds are passing
in-process deep-equality assertions; post-call input snapshots were not retained,
so those two are not independently reconstructible from the raw artifact.

PR292 is ready as a TEST-ONLY defect handoff, never merge alone. I owns the
seed-before-eviction product correction. Run the new unit directly after fixing;
the baseline helper intentionally refuses a corrected application. No product fix,
build, full-suite or live claim. No fresh runtime is needed for docs-only closure.
