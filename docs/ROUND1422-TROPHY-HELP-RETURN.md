# Round 1422: trophy cabinet help return caption

Status: READY for Claude I's release integration. Not published by this lane.

Help opened from a selected winning season said "Back to wins", although it correctly returned to that season.
The existing tests deliberately require the selected season, heading focus and list position to survive help.
The correction names that destination without changing the navigation.

## Change

Base: `775564305e9da84dab59f2b9fe246d044a3cc8e9`.
Original diagnostic: `6270057479b799c94cc61bcf68a4c0ca10e5c690`.
TESTED fixed source: `450bb91aaf1d4fdedccd488f2ce85e7ea931bea7`.

Exactly three existing source files changed after the original diagnostic:

- TrophyCabinet: one caption expression, `picked ? 'Back to season' : 'Back to wins'`.
- trophyCabinet.test: two selected-season role-name lookups.
- trophyCabinetCampaign.test: two selected-season role-name lookups.

All existing assertions and list-context names remain held. The exact whole-source inverse returns the
original component and both suites. The fixed component SHA256 is
`c646d0a44f2b0129f853cd338d3dbbf5ac1a64fc8a482d7e925f4681cf6d7b75`.
The two fixed suite hashes are
`95ac91c11c6104dd3e60336cb185c5c571dabc306ff8e1b88fb55aec4ec9327b` and
`45b6bbbb0f41ea289ac129be5b0440cf1e9a672e21e8a91ef70dca2a189e456c`.
Independent source review held every other 4915 source body between the original and fixed commits.

## Original proof before adoption

[Original run 39132125750](https://github.com/PapiSalgueroM/ballpark-hero/actions/runs/39132125750),
job 117689260739, succeeded on the unchanged app and both original test suites.
All 30 existing component tests passed. The four actual production-route Chromium journeys measured:

| Journey | Actual caption | Actual destination | Finding |
| --- | --- | --- | --- |
| detail-help-390 | Back to wins | Selected season, heading focused | Wrong caption |
| list-help-390 | Back to wins | Same wins list, help opener focused | Healthy |
| detail-help-1280 | Back to wins | Selected season, heading focused | Wrong caption |
| list-help-1280 | Back to wins | Same wins list, help opener focused | Healthy |

Native saved-evidence admission passed 254649 checks, zero errors.
Receipt SHA256 `2895eb400ff66f6bf37bf9f84f09e1322cd99925f3b25493d7b89815edf5a968`.
Artifact 12138119467: 99902311 bytes, 708 payloads, SHA256
`2a9317513f3308a667ad3e1812ceaa6b941d83bf26e0ebe8f37b7928eedfb864`.
Canonical source ZIP SHA256:
`bea16c2233e2380f28c4e5df787bbb3f128a3339228f1d046c32f8168ded3cd1`.

The admitted original predates app adoption by 43.35 seconds.
Adoption receipt SHA256 `70f57bbe06ff75487b48342eeac7862de12d9b7b172ca8dd2127b9e2d3e7304e`.
Independent adoption/source review SHA256
`558a7840af3ab9467a020df6fb6cb4910466fcc580f9a6c4765877c35d055702`.

## Fixed proof

[Fixed run 39133586912](https://github.com/PapiSalgueroM/ballpark-hero/actions/runs/39133586912),
job 117693510950, succeeded on the tested fixed head.

- Normal: all 30 existing component tests passed.
- Copied original-caption control: exactly three existing caption-sensitive tests failed with the expected missing
  "Back to season" accessible-button error; the other 27 stayed healthy.
- Restored: all 30 passed again. The exclusive two-file control copy was removed and all tracked bodies held.
- Actual production route: all four detail/list journeys passed at 390 and 1280 pixels, zero caption faults.
  Detail help says "Back to season"; list help says "Back to wins".
- Full post-mount career, local/session storage, RNG journal, document identity, parent trigger and outer scroll held.
  Native return, heading/list focus, All wins, body lock and final opener restoration passed.
- Real app types, serial plain build, all 15 built-site readers and all 14 unchanged fatal caps passed.
  Actual weights: Soccer Career 834.0 / 835, Club Manager 618.3 / 619, NFL My Career 490.2 / 491.

Fixed native admission passed 308949 checks, zero errors.
Receipt SHA256 `1a327b623298d445c4fdce08b35ddcaf3764e5b8d0926bded80ab44e013c4747`.
Artifact 12139446067: 100434270 bytes, 721 payloads, SHA256
`92b98b796892fd98b5cb5662be0dbe76c64b041414b98fe595538dcbc01a7b7a`.
Canonical fixed source ZIP SHA256:
`4965484555fd870883b5107fcece0da2e070da26acd09d4cfef8cf42b97c9dc0`.
Both complete source maps contain 4918 files; both builds contain 787 dist files.

The same frozen workflow, browser and unit helper ran on the original and fixed sources.
All 280 successful responses per build have physical body and gzip joins to the completed dist or the declared
font cache. Eight actual viewport screenshots per build are retained. Setup, transport, source and budget
predicates were not weakened.

## Evidence scope and limits

Outside packet: `C:/Users/antho/dukb-handoff/2026-10-18/soccer-trophy-help-1422/`.

The fixture uses a real engine-generated first-offer career plus two explicitly fictional saved league-win
navigation rows and declared age metadata. Those rows are display inputs, not simulated wins or historical results.
The full fixture inverse, actual save admission and all post-mount bytes are retained.

Only native mouse clicks on the actual built route were driven. This is not Safari, a physical touch device,
assistive technology, a whole-career walk, the full sim suite, release integration or a live claim.
Installed package/runtime inventories are CI receipts; their executable bodies are not delivered.
Timestamp-bearing Vitest JSON is not compared byte-for-byte between arms; exact titles, statuses and failure
fields are checked. Raw traces retain opener HTML/focus and one document request. Live opener node identity
and cold-before-click ordering are assertions of the frozen executed driver, not independently timestamped
raw observations. The exact history operation behind same-document frame events is not inferred.

Unexecuted native audit source-construction and reviewer precedence errors were retained separately, corrected
before acceptance, and never credited as application faults. Both actual CI requests and both full saved-evidence
admissions passed on their first runtime attempt.

Closing changes are exactly this document, PROJECT-STATE and WORKBOARD. The final source closure, PR URL and
push/handoff readbacks follow outside the repo. Prior 59 report heads are immutable; Claude I retains protected
Soccer Career/Manager/tournament work and actual release/main/publish.
