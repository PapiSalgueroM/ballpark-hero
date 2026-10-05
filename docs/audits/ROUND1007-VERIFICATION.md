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
