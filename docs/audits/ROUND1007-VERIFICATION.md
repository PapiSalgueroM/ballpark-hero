# Round 1007 verification

## Verified candidate, final committed-snapshot checks pending

Candidate 79aa95b6206933b7a86252b93244c050e5f6a4bb passed review workflow
37371835269 attempt 2, job 111976104421. The tested PR merge was
4bd0aba0062c09498e143ef3c27ebb7b2e987996, merging into main 3e6c28ad.
Real app types/build, snapshot generation, review outcomes, source controls,
shared scoring guards, harness anchors and native verification all passed.

Artifact 11370694685 was downloaded and independently hash verified:
SHA256 2844deab69ed4e28ef507bd5d7dfaf83775b02627092cc6df3f7aac0d7492a1e.
All 21 mounted reports match their verification summaries. Ten normal
outcomes pass. Each of 20 source controls produces one intended rejection,
one independent Daily baseline pass and eight skips. That is 50 executed
cases: 30 passes and 20 expected failures, with 160 skipped control cases.

All four native profiles passed: 320px dark reduced-motion touch, 390px light
touch, 1280x720 dark mouse and 1280x720 light reduced-motion keyboard. Each
records eight loaded Inter/Space Grotesk faces, 19 measured layouts and zero
page errors, console errors, asset/font failures, score writes or storage
writes. Both 320px geometry controls changed layout, rejected the intended
clipping/overflow condition, and passed again after restoration.

Independent visual inspection covered the 320px shared-winner review,
390px first retry reveal and 1280px mouse retry result. Statements, winners,
separate corrected score and next/back controls are readable. Original 7/10
remains unchanged beside the separate 2/3 retry result. These are accepted
fixture checks, not a live database or record-completeness audit.

Challenge compatibility workflow 37371835322 passed real types/build,
original challenge outcomes and controls, original reveal/completion checks,
and five native walks. Its only failure was the missing new update entry in
the committed /whats-new snapshot. The three generated files from the verified
review artifact are now copied back: /whats-new HTML, sitemap and lastmod
ledger. The sitemap bytes do not change. The temporary generation step is
removed so the final workflows assess committed artifacts directly.

The first review attempt was cancelled without any steps or artifacts; it
provides no product verdict. Final candidate CI and publication remain pending.
No local build, test, browser, install or database probe was run.

## Combined 1009 integration pending

After recording the verified 1007 artifact in b1479f23, parent requested
stacking the frozen 1009 candidate 2583ec3c into this branch. Both update
entries are retained in WhatsNew.tsx. The already generated 1009 snapshot
and ledger remain paired until remote generation replaces them with the
combined entries. Temporary generation is restored for that integration
run only; its three outputs must be copied back and the step removed before
final acceptance. The 1007 review product and verification source are unchanged.
No main merge or publication is authorized by this receipt.

## Combined candidate accepted, committed-snapshot run pending

Combined candidate 7cb9dd1f68915c4c848ad5683d11b2bc73fd9b60 includes 1009
and its current-main documentation merge 5e2bf510. Review run 37386956862,
job 112022450462, passed every step including actual native verification.
Artifact 11379512684 was downloaded and SHA256 verified:
4900282ccdee17b1f874e5b53c09da7d4aba56c8fbce0be41e7fbb98ed6dd5de.

All 21 individual mounted reports again match their summaries: 30 passes,
20 expected control failures and 160 skips. All four native profiles passed
with eight loaded font faces, no page/console/font errors and no score or
storage writes. The combined generated snapshot, sitemap and ledger are
copied verbatim. Both update entries are present. Temporary generation is
removed again, so the next head is assessed against committed files.

Challenge run 37386956897 passed its product and native checks. Its only
built-reader failure was the expected missing Rugby entry before the combined
snapshot was copied. Final committed-snapshot workflows are pending; parent
owns main integration and publication after 1009 acceptance.

The final integration also retains parent 13c14f37: accepted import-only
Round 1030 from main 82d1d7f7 and the narrow career-season-review font-driver
repair. The Rugby product, both update entries and all three verified combined
snapshot files remain unchanged. Remote checks restart on this integrated head.
