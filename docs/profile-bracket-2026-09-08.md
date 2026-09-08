# Round 524: saved bracket profile summary

Completed September 8, 2026 from Round 523 `8c3d1153`. Local draft candidate.

## Evidence and scope

WorldCupPredictor.handleSaveBracket saves predictions, playoffPicks,
selectedThirds, knockoutPicks, awards and a top-level champion. The current
Profile summary ignores that champion, reading knockoutWinners.final and
awards.champion only. It also parses legacy strings without a catch and
trusts any truthy nested value as a React child. Missing normal summaries,
malformed JSON, parsed null and object-valued legacy champions are candidates
for real-component reproduction. The baseline failures are recorded below.

This is a summary-reader fix, not a saved-bracket repair or save protocol
change. No storage, real account, backend, tournament data or other game
changes. Only valid nonempty strings may become the champion label. Prefer
the current top-level field, then preserve the old awards.champion priority
over knockoutWinners.final. Keep Bracket saved and the existing bracket link
when no valid champion is available. No inference from knockout picks.

## Plan and acceptance

1. Reproduce real Profile outcomes with synthetic current writer-shaped,
   serialized, legacy and malformed payloads. Assert the card and exact link,
   profile remains usable, storage unchanged and unexpected backend calls fail.
2. Make the smallest safe shape-checked reader change in Profile.tsx.
3. Prove precise source controls, rerun related profile cases, both types,
   build and all fifteen generated-site fences. Test real built phone/desktop
   screens with denied transport. Independent review before draft push.

## Results

Baseline setup passed: exact app types, all 36 existing profile cases,
543 installed packages with zero reported audit vulnerabilities, pinned
auth-js patch applied. No production edits yet.

The real built Round 523 browser reproduced five named failures across seven
synthetic payloads at 390px. Current writer object and serialized object both
show Bracket saved instead of their saved champion. Malformed JSON blanks the
page with a JSON syntax error. Parsed null blanks it while reading
knockoutWinners. An object-valued awards champion blanks it with React error31
(invalid child with key label). Both legacy summaries still work, their links
and geometry pass, and protected storage remains unchanged. There are zero
harness failures or boundary/transport violations. These three product runtime
errors are expected baseline evidence, not a green runtime check.

Baseline reports: C:/Users/antho/AppData/Local/Temp/dukb-profile-bracket-RQ5EPu/report.json
and the settled link-hitbox version in dukb-profile-bracket-C3Nhyb/report.json.

The test author and main independently reproduced eight exact assertion
failures and five positives in thirteen real-component groups. The test error
boundary records fixture-specific JSON/null/invalid-child errors but still
requires zero caught errors and a real usable profile to pass. Unknown errors
are never accepted as a valid fallback. Main's baseline ran in 3.42 seconds.

Production changes twelve lines and removes four, all in the inline Profile
summary reader. The raw payload is unknown, only string JSON parsing is caught,
root and legacy containers are checked, and each candidate is validated before
priority is applied. Valid strings are trimmed for display. No helper module,
state, save writer/loader or migration was added.

The first combined run passed all 49 cases (13 bracket, 12 avatar, 16 isolation,
8 average), both exact type gates and build in 25.14 seconds (2841 modules).
All fifteen generated-site fences passed. Preview 4200 serves index-CW6_-zdC.js
and Profile-BMb1RwEp.js. ActivityDays and SessionMarks passed. Related built
avatar checks passed eighteen states, isolation eight and average 28, with
their existing clipping controls. These use local fixtures, not live accounts.

Independent review found a test-fixture weakness: the decoy knockout winner
used final instead of the real f-0 key. That fixture now uses f-0 and the
inference control must target it. Main also corrected the requested synthetic
prediction shape to a match score at A-0 rather than a group-name array. Neither
test correction required a production change. Final control verification and
post-correction type/test reruns are recorded in the resumed verification below.

The final built browser passes fourteen payload states at 390/1440, four exact
DOM identity/link controls and two height-only actual-clipping controls. Every
normal state keeps its exact saved bracket link and protected storage bytes.
There are zero runtime, transport or denied-boundary errors. The browser author
viewed all sixteen normal/clipping screenshots. Main independently inspected
phone/desktop current champion, malformed fallback and clipped-control shots.

Final browser artifacts under C:/Users/antho/AppData/Local/Temp:

- dukb-profile-bracket-RN7ugc/report.json and its screenshots.
- Current, legacy, fallback and link controls: wu7Tdr, qTSRdg, Zb3pM3 and
  YcLVFb, each with the dukb-profile-bracket- prefix and report.json.
- Related matrices: dukb-profile-avatar-rglxJt,
  dukb-profile-isolation-FlbVK7, dukb-profile-average-LAHjVf.

No real backend/account data, saved picks, provider or calendar was changed.
No default full suite, merge or publication. This fixes only the profile
summary; the shared bracket loader remains a separate code path.

## Resumed verification, September 8

Recovered the unchanged implementation after the interrupted chat. Both exact
type gates pass. Fresh production build passes in 22.04 seconds and produces
the same index-CW6_-zdC.js entry. All 49 related Profile cases pass, followed
by the thirteen-case bracket harness. ActivityDays and SessionMarks pass.

The scoped runner passed fourteen generated-site fences and explicitly skipped
simPrerenderBoot as a browser harness. It is not counted as a fifteenth pass.
The direct simPrerenderBoot run then passed all three boot samples and eleven
retired redirects with CHROME_PATH pointing at installed Chrome. This resolves
the previous session's missing bundled-browser error without changing code.

The fresh built browser matrix passes all fourteen phone/desktop payload
states, including both clipping controls, with zero boundary/runtime errors.
Artifacts: C:/Users/antho/AppData/Local/Temp/dukb-profile-bracket-t2ztzT.
Main visually inspected writer-390.png and malformed-json-1440.png.
Read-only independent code/test review found no actionable issue.

All sixteen source controls passed their exact contracts, totaling 65 expected
assertion failures with every other case green. The unexpected-runtime control
exited 1 and rejected thirteen extra boundary failures, never receiving passing
control credit. Every temporary source copy was cleaned. Logs and results.json:
C:/Users/antho/AppData/Local/Temp/round524-bracket-controls-2365326e5f0b4398a0516caae9c44d33.

Fresh current, legacy, fallback and link browser controls each fired exactly
once with one expected assertion and zero boundary/runtime errors. Their
artifact directories in OS temp are dukb-profile-bracket-CroiLS,
dukb-profile-bracket-f3umm1, dukb-profile-bracket-DFirlr and
dukb-profile-bracket-URyH4d. Together they checked 28 payload states.

Build, generated-site and browser command logs are in the OS temp directory
as dukb-round524-resume-build.log, dukb-round524-resume-fences.log and
dukb-round524-resume-browser.log. No default full-suite pass is claimed.

Next bounded verification repair: simLoginReturn still imports Playwright
directly, bypassing the shared browser fallback, and leaves unmatched browser
requests unhandled. Reproduce its launch failure, use the shared loader, then
verify its static-template browser measurement with complete local fixtures.
The broad suite still needs actual process-tree network isolation; the audit
did not establish a safe executor and no production probes were launched.
