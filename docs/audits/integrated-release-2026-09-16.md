# Integrated animation and policy release

The exact source `a96ed002809ed78d3a9bb19a9e66a77cfbb634e8` passed
[run 35048332634, attempt 1](https://github.com/PapiSalgueroM/ballpark-hero/actions/runs/35048332634)
at verification commit `3a7e54b3ad42e0a61186a1b5bcf89a3a29c25988`.
The verification commit adds only the reviewed workflow. It does not change the app.

## Evidence

- Proper app types, SEO build and all workflow browser checks passed.
- All 323 discovered node harnesses passed, with the exact source-derived file set.
- All 321 component tests passed across 39 files, including 18 motion and 7 navbar cases.
- All 101 explicit control receipts passed. The discovered Pitch runner also exercises
  its eight error controls; no skipped node test is counted as a pass.
- The live College Grid comparison checked 35,611 rows and hash `62d875f9e9e21bad`.
  Both parser controls proved that a skipped comparison would fail.
- The downloaded archives match GitHub's digests. All 1,980 recorded inputs and 717
  generated outputs match their exact hashes, with no before/after gate deltas.
- Only the 170 approved generated repository files were imported. The exact `dist`
  remains separate for deployment, without rebuilding it.

The [acceptance receipt](integrated-release-acceptance-2026-09-16.json) records source,
run, archive and log identities. Candidate parity is checked separately against
current main, allowing only newer documentation and exact generated outputs.

## Loading size

The existing CI weight gate passed all 11 routes. A separate local-only check of
the exact downloaded `dist` also passed strict raw gzip limits. It used Vite preview,
preserved each route's pathname and waited for game guides to finish loading.
All remote HTTP and WebSocket requests were blocked.

Tight margins include Club Manager at 634,717 of 634,880 bytes, Wonderkid Factory
at 276,364 of 276,480, and NFL Career at 408,999 of 409,600. See the
[raw measurements](integrated-release-raw-weight-2026-09-16.json).
Earlier measurements from a temporary Python server had redirects, incomplete
guide loading or a refused local asset connection. They are retained in temporary
evidence and are not used as release proof.

## Publication

The exact accepted dist is live at https://douknowball.anacatu2025.chatgpt.site
as Sites version 3, from hosting commit `e96f6df3b95774295a53a55cba694f33abc4d683`.
Deployment succeeded at 04:39:43 UTC on September 16. No rebuild was performed.
All 377 public assets match their artifact hashes. All 169 HTML pages match after
removing only the known 938-character Cloudflare challenge script; four negative
controls prove that content and script changes remain detectable. The refreshed
homepage also rendered in the in-app browser. See the
[publication receipt](integrated-release-publication-2026-09-16.json).
The main domain remains on its existing host pending GoDaddy sign-in.

## Included work

This release combines first-team academy progression, manager action scenes,
career drills, multisport conquest scenes, watched set pieces and title gear.
It preserves Claude's College Grid, competition and squad work already on main.
It also includes the navbar read lifecycle, recoverable rarity cache, test-write
cleanup, smaller initial loading, related-game memo and truthful policy wording.

The later NFL specialist-stat fix, kicker season illustration, Soccer Connect 4
description and storage-blocked consent recovery are separate follow-ups. This
artifact does not claim to verify or publish them. It also does not establish
AdSense approval, regional CMP delivery or an improvement in remaining Disk IO.
