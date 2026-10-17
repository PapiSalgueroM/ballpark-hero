# Round1406: corrected consequences in saved Soccer Career choices

Scoped verification completed on 2026-10-17 UTC. Attached draft PR323 targets
`release-bi-gate`. Actual tested source is
`33ce96e9cdaa5425435d0d160610b6b89a547bdf`, based on final1404
`dccd1e146c27c7f6c889b180f371581d60e75b4b`. This inherits PR318, PR319 and
PR321 once. Urgent PR308 and independent PR320/322 remain separate.

## Change and limits

Four JSON-restored pending choices returned obsolete saved consequences even
after their fresh catalog text was corrected. A pure string record now supplies
both the fresh catalog and the existing consequence getter, which the page uses
for choice subtitles and answer toasts. The keys are315:0,320:1,320:2 and325:0.

The catalog changes are one import and four references. Contracts gains one
import and one fallback lookup after the existing Life lookup. Whole source
inverses reproduce the original catalog and Contracts exactly. The new map has
no imports. All callbacks, eligibility, economics and random draws remain held.
Old saved button labels and descriptions are outside this narrow caption fix.
There is no page, engine, shop, save-format, calendar or competition change.

Canonical product SHA256:

- catalog31,594B: `9f69c74b02cd87e5a7739034b5ed0c3e5ecb6cd0f7257df8651dfdd5938beed1`
- Contracts3,302B: `ef9c6f6d7b9fdcb21703cfad39fe15fc1251562b29ff533d9151e8488761b3f2`
- new string map417B: `e16855d5e840927fbb08458eb7ab4db1abf16cb77d35cabc7fd60fb882600681`

Independent source review:98c878ff88108154ce15941573c2c7242d16c2ab0f4d4e96b5019886be385e10.

## Original baseline before product

Original source7317c7c5b3fc9c06879b37fcce0e81dc5161f263,
run39032500454/job117395642144 completed SUCCESS. The frozen ten-case test
reproduced exactly four named Boolean caption faults and six healthy cases.
Actual initialized careers, real catalog cards and JSON callback removal were
used. Each arm retains27 literal reads,15 whole-input holds,8 callback-free
inputs and zero getter draws. Existing18 Life tests, real application types,
521 locked versions and source holds passed. Build and browser were not run in
this baseline.

Original raw343,526B SHA256:
`600874244fd41dbc0c02a246c59bd72a340d44b9d2b1663c7d4fa21b11ccdf1a`.
Artifact12100383630 is74,596,307B,
`39b3c031bb39fb0903bf64d785fb1d54c30d23a5bd3800ae0081d8d07b64135d`.
Native physical36b2665a71dc246c28068b3f267a55a83daa767df0447f8da52c5ce80d98a303
closes51 payloads and4,876 source bodies. Independent semantic207f3e9049f479f41ac3ef509381ca6fcde50f9187361d266d9a00d979bf7f5e
closes1,204 checks with zero mismatches.

The earlier a025 baseline run39031935816 failed in setup before types or tests:
the same shell step wrote GITHUB_ENV but did not export its output variable for
its inline Node reader. A one-line export repaired only the workflow. Its23-file
artifact and source/dependency closure remain retained, with no test credit.
Native audit preparation errors and their exact corrections are retained too.

## Fixed qualification

Run39033076235/job117397323141 completed SUCCESS on the actual tested33ce head.
The fixed method passed10 cases, restored only the original two modules and
removed the new module to reproduce4 faults plus6 healthy cases, then restored
the candidate and passed10 again. The original raw exactly matches the separate
qualified baseline. All six complete preservation records match across arms.
Normal and restored raw are byte-identical343,555B,
`9867022936ef33d16e2c322589459aaccbc7951deb7a37da83d392106f8b07b8`.

The same run passed real types,18 prior Life cases,40 currency pairs across9
fields and both existing500-career drives. Normal:8,197 seasons,7,440 batches,
24,520 events,0 crashes. One-option control:8,209 seasons,7,451 batches,24,545
events,0 crashes; exactly the intended section5 failure, no collateral. The
copied control's whole source mutation was independently checked.

The production SEO build completed before all15 output readers ran. All14
unchanged page-size caps stayed fatal and passed, including Soccer Career833.1K
under834K, Manager608.5K under609K and NFL487.8K under488K. No cap was raised.
The actual three denied build-font requests and three changed rejection controls,
preload control,521 held versions,24,466 installed-body inventory entries,
176 isolated browser-tool entries,3 runtime tools,9 cached fonts plus their
manifest, source and dist holds passed. Ordinary absent transport receipts are
supported by the successful strict CI scan, not claimed as uploaded empty files.

Artifact12100972179 is83,807,384B,
`083b2ed75976d53ed441b8c67b4267868380566ef0e1727b4f5b2295e845f8dd`.
It retains124 payloads,4,877 source bodies,5 arm/source maps and784 dist bodies.
Actual generated source delta is ZERO. No output adoption or new browser journey
is claimed. Native physical0f72479863a54781a29bed1771113117842a069d28b38c193442023e953befc6
passed157,132 checks; core semanticcddd85e5ea86dca501cfebe2cbdbf8bbcfd3f5220f0c548155cc8913e887936c
passed1,492 checks; extra gatesec448419e69b6b9e0f74cf49f4a7cbb1494a52799e557af59e28d7f22b477165
passed133 checks. All have zero mismatches and distinct retained scope limits.

Frozen test SHAef4c9d79811d5453d4529ff35fe4429fa617fba3704f0f228cec75aed75b9a59,
helper9f1e292e5464212ba2b4bdd57777a573983840fa163b7a6590a8d3f1fd4fd51b,
full workflowd13869d232536d10f849ae855ace114de7a9d6f473367239657478db8acc3f06.

## Other workflow failures and release boundary

Automatic historical veteran contract-talks39033078918/job117397333341 and
transfer-terms39033078832/job117397332986 failed at Exact source and locked
dependency preparation. Their types and actual feature proofs were skipped.
The exact first failing command is unretained. A tiny talks artifact retains
only packages-final.txt and an empty source-held.log. Dedicated log reads failed
with Transport closed; the generic public-fetch fallback rejected that endpoint.
No further fallback, historical fence broadening or test waiver was used.

Their old whole-source admission fences are statically incompatible with the
pre1406 baseline too. Separately, the talks copied-source caption control still
expects the old exact getter return and would need a compatibility update if
reused on the new source. These are static findings, not attributed runtime
causes. The old workflow reds remain visible. This is scoped qualification of
1406, not a statement that every automatic workflow or the full suite is green.

Only three closing documents follow the actual tested source. Their final head,
native final-source closure and44-branch push check are recorded in the external
handoff. BII rule2: real-merge the actual tested33ce head, handle closing docs
separately, and regenerate/qualify the actual I join. I retains active1503/1504,
US1500, tournaments1509+, release selection, main and publication. The finite
12:40 checkpoint found no accepted guide handback;1504 moved to96277353 while
older closing reports remain unaccepted. This round adds no release gate and
makes no full-career, physical-device, provider, joined-release or live claim.
