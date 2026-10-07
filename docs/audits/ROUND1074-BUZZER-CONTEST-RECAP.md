# Round 1074: Buzzer Beater contest recap

The live rack strip and final five-rack scorecard show actual settled makes,
misses and money balls. Final rack buttons select the recorded five shots.
Contest remains local and unranked. Restart resets its outcome history.
Blocked shots and shots below rim height no longer show a hypothetical rim
crossing. Their feedback describes the actual stopped or low trajectory.

The native phone journey exposed a real release-click bug: the same touch
release settled a shot and then clicked the newly rendered Next shot button.
The result action now requires a fresh pointer press. Keyboard and assistive
clicks still work. Engine scoring, RNG, existing modes and saved results are
unchanged.

## Preparation receipt

- Source: c40e5ab045cc0f9dce6bead0fde2a6b138035062.
- Tree: 23391acc3f901c6b2fa73be73281551ca05947ac.
- Remote run: https://github.com/PapiSalgueroM/ballpark-hero/actions/runs/37580808071.
- Artifact: 11464843562, buzzer-contest-recap-37580808071-1.
- ZIP SHA256: 14540a1acb641374e672aecdbb7060c1e9ccced052e55e9045cf64f66eec106a.

The real app type gate and build passed. Nine mounted outcomes and twenty
effective copied faults passed. Each fault produced its mapped assertion
failure while the independent original-mode baseline passed; seven other
cases were intentionally skipped. Twenty-one integrity reports held eleven
input sources unchanged.

Native coverage passed on320x780 touch/dark/reduced motion,390x844 touch/light,
and1280x720 keyboard/light. All75 shots came from real native inputs and the
unchanged engine. All five rack totals and every visible ball glyph reconciled.
Help, paused flight, replay, mode exits and restored Daily were exercised.
Five DOM faults caught wrong totals, small text, clipping, wrong shot glyphs
and a vertically hidden recap, with exact restoration. All eight requested
font faces loaded from retained real font responses. No external write was
forwarded. Seven source hashes were unchanged. Retained final phone and desktop
screenshots were inspected.

Original Buzzer Beater, practice, contest, shot feedback, pause, held input,
double-record, scoring coverage, shown score and scoped Daily reload regressions
passed. All four older contest controls fired. All20 closing built/search/guide/
source readers passed, including simHarnessAnchors and simSeoMetaSplit.

Generated Buzzer and What's New snapshots, sitemap, lastmod ledger, search
keywords and frozen guide headings were separately SHA checked. All six match
the committed payload. Only the two intended page ledger entries changed.
The basketball guide and frozen guide fixture stay unchanged from the base.

## Release status

The temporary preparation workflow is removed. The permanent PR workflow owns
the full scoped verification. Final PR checks still need their own accepted
receipts. This preparation receipt is not a merged or published claim.
Claude owns integration and publishing. Preserve PR163 and PR164 alongside
this round. No local runtime or production database access was used.
