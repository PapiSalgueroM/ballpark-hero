# Soccer Career lossless save storage, 14 October 2026

Draft [PR 270](https://github.com/PapiSalgueroM/ballpark-hero/pull/270), branch `codex/soccer-career-save-size`, based on current main `082fc2774c8aa9f919c14efa33bfc3fbfc599597`. Current and recent Career PR status was checked before implementation. The existing raw save blocker was still present; PR 237's verification storage pilot was not an application save fix. No merge or publication occurred. H owns integration and publishing.

## Change and compatibility

Application changes are confined to `src/lib/soccerCareerSave.ts` and the existing restore/write calls in `src/pages/SoccerCareer.tsx`. The serializer keeps saves of at most 60,000 JavaScript characters as literal JSON. Larger saves use the already installed `lz-string` UTF16 codec for the complete `seasons` and optional `story` arrays, and choose the packed representation only when shorter. All root fields, including home Continue metadata, stay ordinary JSON. No dependency, engine, real data, Manager, gameplay or interface feature changed.

The parser supports both literal legacy arrays and the explicit `lz-string-utf16` envelope, then hands the restored object to the existing validator and migration. Unknown fields inside histories survive. A claimed malformed or future history envelope refuses before optional story repair, so unreadable packed histories are refused instead of being discarded by that repair. Existing non-envelope legacy story repair stays intact. The save failure warning and retry continue to use the current career without replaying a season.

The original `simCreation` limit remains 60,000. It now measures the actual serializer and checks complete JSON restoration. Its separate 900-character added-field limit still uses the raw field delta. SaveKeeper's Soccer-only fixture writer/readers and two existing long-career test readers use the same codec; their gameplay assertions and the other games' writers are unchanged. Two save-retry copied-fault anchors follow the actual serializer call; their outcome assertions and effective-control requirements remain unchanged.

## Remote results

All install, app, test, build, simulation and browser execution occurred on GitHub Actions. Native local operations were source/text/JSON/hash/Git/HTTP/archive inspection and original image viewing.

- Baseline `9bf3e399`, [run 38515445460](https://github.com/PapiSalgueroM/ballpark-hero/actions/runs/38515445460), job `115693087222`: qualified expected red. Original `simCreation` completed with exactly one failure, the 73.8 KB raw save exceeding 60,000. The unchanged-source diagnostic retained 235 genuine phase states from twelve actually played ST/GK/CB/CM careers, with 195 oversized states and an original maximum of 127,733 characters.
- Fixed application/proofs `cf453d2f311579e051bb19f77c196e77f73392ee`, [run 38520323234](https://github.com/PapiSalgueroM/ballpark-hero/actions/runs/38520323234), job `115708303136`: success. All 235 states restore the complete original JSON, remain valid, preserve input and root metadata, serialize deterministically and consume no codec RNG. All 195 originally oversized states fit, with a stored maximum of 57,363 characters. The actual next engine step and its draws match for 187 states. The deliberate plain-writer control changes serialization and produces the expected size failures.
- App types, 23 focused tests, the complete build, all 15 rebuilt-output readers plus Creation/SaveKeeper/FlagshipWeight/new size harness (19 total), and the full ordinary unit suite passed. The full suite reports 7,880 passed and 58 existing skipped tests, 507 passed and two skipped files. Download weights remain inside unchanged limits: Soccer Career 829.8 KB below 830, Club Manager 602.2 KB below 604. Final source and package hash holds passed.
- Actual built-page browser proof passed 164 checks in twelve journeys at 390 and 1280 pixels. The genuine largest sampled playing fixture is 119,989 raw characters and 46,187 stored. Raw and packed journeys check home Continue, complete normalized restored state, all club stints, Stats/record book, earliest/latest story, stable reload bytes and the actual chance-wheel acknowledgement reducer. Eight corrupt/future seasons/story cases refuse without overwriting the original save.
- Writer compatibility `eb408883a51a29a2967e4cde1db6492ff60d917a`, [run 38523794837](https://github.com/PapiSalgueroM/ballpark-hero/actions/runs/38523794837), job `115719307919`: success. The job first proves every app/test/main save-proof/package byte equals the qualified `cf453d2f` source. Actual app types, all eight original save-retry outcomes and all sixteen effective copied faults pass. Direct `simCareerLeagueSeasons`, with complete stderr and current main as its comparison base, passes every section, including twelve identical careers and 429 compared season/dugout rows. Final source holds pass.

The duplicate full run `38523794721` on the proof-only writer commit was canceled after exact application/proof equality and the dedicated writer run passed. It receives no passing credit. The full qualification above remains tied to its exact tested application source.

## Retained evidence and review

Complete artifact ZIPs and official raw job logs are retained under the primary folder `C:\Users\antho\ballpark-hero\.tmp-fx\soccer-career-save-size-1368`. These are local evidence, not committed build output.

| Packet | Artifact | ZIP bytes | ZIP SHA256 |
| --- | --- | ---: | --- |
| `baseline` | 11871304068 | 38,516,306 | `74a0131aaa4962ebc82b8c19843c86eef6206ed43b353da790e33e019ab9e80d` |
| `fixed-cf453d2f` | 11875350013 | 53,231,774 | `ce92c5b8d82a6dc7d2252aa7fffa2aebacc797c38c65f6f58d95f6057207fb59` |
| `writer-eb408883` | 11874788581 | 1,298,004 | `499ee1958f8c2dab78bb81609c02ca9923770b0d73594766fe765356fc7fd78e` |

The fixed official raw log is 7,978,454 bytes, SHA256 `81a07f417521aea5e82578be37e1dac64d98e28455763dab5a4656165d1f3318`. The writer official raw log is 928,296 bytes, SHA256 `0b50021fca5a75b7c51a310dd32c61b7d7e5f9556d83eff0a259985395b2c72c`.

Independent source review found no blocker in the codec, page integration, fixture writers or proof consumers. All 24 original PNGs were individually inspected without cropping or transformation: root inspected twelve desktop originals and the browser reviewer inspected twelve phone originals. Raw/packed histories are readable and equivalent, and the refusal notice is visible. The phone reviewer independently matched full-state and acknowledgement outputs by native SHA256; the phone receipt is `fixed-cf453d2f/files/browser/phone-image-review.md`.

## Earlier failures and limits

Earlier fixed attempt `fe4941b9` passed the codec tests but failed two old test readers which still assumed literal history arrays, with 7,878 tests passing. Those readers now parse the actual format. Attempt `beb34c11` passed types/focused/build/weights and the other rebuilt readers, but normal fleet discovery rejected the new size harness's two-line output. Three measured outcome lines now satisfy that existing discovery contract. Complete failed artifacts/logs are retained as `fixed-fe4941b9` and `fixed-beb34c11`; neither run receives full qualification credit.

Other historically pinned PR workflows still report old source/layout bindings and are not claimed green or weakened. Five complete earlier official job logs are retained in `older-pr-checks-fe4941b9`. The attributable save-retry source anchors are repaired and separately proven above; the direct current-main league diagnostic also passes. Historical workflow maintenance and the broader integration release gate remain H's.

Specifically, ResultsLayout stops at its unchanged original engine-base assertion, VeteranTalks at its historical source preflight, and NumberFormatting at its historical test/source bindings after its six normal outcomes and nine controls pass. OfferReview passes nine outcomes and nineteen controls (also nine/twelve native cases/controls), then hits the archived-base league bundle error and historical source guard. Retry's sixteen-control run initially lacked the two writer anchors; the dedicated current writer run closes those. The older workflow pins stay unchanged.

The size measurement covers actual playing careers through retirement and initial manager/pundit/owner choices. It is not a promise about arbitrary future data or unlimited later tail seasons. Browser journeys check reload, history and acknowledgement, while the simulation checks subsequent advancement. Browser transport is offline with actual cached fonts and inert external flags, zero external forwarded requests; these results do not claim a live-service or production publish check. Small screenshot captions limit fine-text visual inspection, and no new per-control rectangle or hit-test proof is claimed. No full all-game simulation or browser sweep was run for this bounded change.

The newly relayed Manager, Transfer Path and feature reports are separately recorded, unverified, in `docs/audits/reported-issues-2026-10-14.md`. They caused no other application change.
