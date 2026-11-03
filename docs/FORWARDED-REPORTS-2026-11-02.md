# Forwarded reports intake, November 2, 2026

Baseline: cc9a55a2. The six Manager requests below are intake, not new feature claims, verified sports facts or release claims.

## Club Manager

Source: the forwarded November 2 report attachment.

Seven submissions contain six unique requests. The international request repeats eleven seconds later. Shared browser details do not establish separate users. Every submission names /club-manager, November 2 and build index-l-CJtBqI.js.

- M: 432x813 CSS pixels, DPR 2.5, Android 10, Chrome 156, fr-FR, Europe/Paris.
- D: 1366x651 CSS pixels, DPR 1, Windows, Chrome 156, en-US, Africa/Nairobi.

| Submitted at, UTC | Context | Request | Status and existing owner |
| --- | --- | --- | --- |
| 05:56:00.811 | M | Annual Intercontinental Cup | Implementation gap. The existing one-off engine covers domestic and UEFA cups (worldOneOffs.ts, a51b2435). K's October 29 design, proposals-cm-depth.md Proposal 9, already puts this beside the existing feature lane's Club World Cup Proposal 12. No ownership release. The user's format description remains unverified. |
| 06:42:58.816 | D | More realistic AI moves: rivals, smaller clubs and repeated one-season stays | Unverified realism report with a confirmed policy limitation. generateHeadlines, lines 12175-12216, filters affordable buyers and excludes the seller and my club, then chooses locally or globally. It has no rival, stature or multi-season tenure check there. joinedHisClubThisSeason, line 10170, blocks a further sale only during that season. I1344/1508 persistent-world work, K Proposal 5 and free-agency 1598/1599 overlap. Measure frequency before tuning; not every move to a smaller club is a bug. |
| 07:20:05.306 | D | Champions League league phase | Already exists for the watched modern cup: worldUclFormatOf, line 13856, selects l36. The player's own club still uses initUclGroup, line 13482, with three opponents and a four-club table; openWorldComp, line 14104, excludes that participant from the watched slice. Held PR223/227 own the participant gap. K1595's access and qualifying work depends on coordinating them. |
| 17:22:51.062 | M | End-season Ballon d'Or top 10; Kopa, Cruyff, best club and Yashin top 5 | Implementation gap. SeasonAwards in clubManagerLeagueBoards.ts, line 178, holds boot, assists, glove and XI, not these world-award shortlists. The October 28 split assigned the earlier Ballon d'Or/Cruyff ask to the existing feature lane. K Proposal 7 is still a design needing an ownership claim. The requested list sizes are preferences, not verified award rules. |
| 17:23:36.385 | M | Spend transfer kitty to raise the wage ceiling | New feature request, absent from the current desk. wageCapFrom, line 8500, sets opening room; nextWageCap, line 8527, adjusts it by season performance. FinancesScreen.tsx (9377bb4f) exposes ticket, concessions and sponsor actions, with wages covered separately by the board. This overlaps the existing feature lane's budget/Go to the board Proposal 4 and needs a measured economic tradeoff. |
| 17:26:04.108; duplicate 17:26:15.037 | M | Deeper international job, more tournaments and qualification | Already exists as a summer simulation. nationOfferFor, line 2345, offers the joint job; the summer calls runManagerSummer at line 23507. soccerInternational.ts (c614da7b), line 1067, runs World Cup/continental tournaments and qualifying automatically. Hands-on control and additional competitions remain requests. Draft PR407 already carries national-management work with build, browser and balance integration still owed. |

Unqualified line numbers refer to pinned clubManager.ts blob cf378e00.

## Soccer Career: 98 overall became 75

Submitted at 2026-11-02T13:57:57.162Z through game-report-button, on build index-l-CJtBqI.js. Context: 775x734 CSS pixels, Windows, Edge 156, timezone Africa/Johannesburg. No save, player age, attributes, current phase or last action was supplied.

The reported 98-to-75 drop remains unreproduced. Corrected baseline a663ac4f, run 41564510864/job 125682664171, passed proper app types and ran all 13 Soccer cases: 12 passed. Actual ST/GK editor starts at 98 stayed consistent through save, codec, a neutral choice and a healthy year. Age and prison cost checks also passed.

The one failure found a separate consistency bug: after the existing five-point PED skill penalty, attributes and derived overall were 93, while cached, displayed and saved overall stayed 98. The narrow fix recalculates that cached value. It keeps the penalty, ban and RNG behavior; it does not restore lost skills or change aging.

K's progression, potential, creation and hub work stays held. The other active chat owns Shield and Press compatibility. No broader protected hunk is claimed here.

## Fantasy Draft: the AI won without defenders

The owner forwarded this report without an exact time, build, save or team lists. The particular result remains unreproduced.

Source review found that the page settled teams by length and gave the AI only a keeper urgency rule. The actual-page baseline then confirmed three gaps: an AI reached settlement with 1 GK, 10 FWD, 0 DEF and 0 MID; a fourth human forward stayed selectable; and daily criteria blocked a needed defender while unrelated legal attackers remained.

This round's separate WORKBOARD claim covers the correction: both sides fill 4-3-3 (1 GK, 4 DEF, 3 MID, 3 FWD), criteria can relax only inside open positions, and settlement requires two valid XIs. The shared scoring engine, ratings, win probabilities, player pool, snake order and AI random calls stay unchanged. DraftRoster is unchanged in this correction.

The tests mount the actual page, use its timers and picks, and call through to real settlement. Their invented fixture players are explicitly fictional. They check roster legality and inputs, not that the AI must lose. The permanent pool harness separately checks the existing archived real pool without refreshing or importing data.

## Verification and boundaries

The earlier d15fdfdb run stopped at a test-only TypeScript selector error; neither scenario ran there. The a663ac4f run is the observed RED baseline. Both failed runs remain retained.

Fixed source 2b3746f6, tree 1bb2439e, passed scoped QA in run 41567721076/job 125693171708. Proper app types and the build passed. The raw unit reports show 24 unique healthy cases: 13 Soccer, 3 Fantasy, 7 existing pool-filter cases and 1 selected Fantasy score case. Whole-old-source controls reproduced the owned failures: Soccer had 12 passes and the PED 98-versus-93 failure; Fantasy had all three formation failures. Restoring the fixed sources returned 13/13 and 3/3 to green.

Three related Soccer simulations passed. The permanent Fantasy pool check completed 700 drafts with no invalid XIs; its unfiltered control fired, and removing the formation gate produced 1,381 invalid XIs with the expected failing exit. All 18 generated-output readers and 16 unchanged download caps passed. Source hashes held outside the five expected generated paths, and repeated keyword generation was byte-identical. The generated review found only Fantasy guide, keyword, snapshot, sitemap and lastmod changes.

Raw limits stay visible: 15 unselected score tests did not run and receive no pass credit. The reports omit the runtime-error-suite counter, so it remains unknown. Offline receipts record 3 blocked font attempts during build and 16 font plus 4 flag attempts during the weight sweep; these are refused requests, not successful network access or zero transport.

The generated-page review found an existing winner-description mismatch. Two literal copy changes corrected the metadata and page fallback while holding qualified gameplay and tests. Source 8256dd9e/tree 941df69f passed run 41570429219/job 125701774247: proper app types, normal metadata-part and Fantasy guide generation, deterministic keywords, build, 20 reader scopes and all 16 unchanged caps. Only the six expected generated files changed. The metadata checks compare 133 saved pages and all 133 table entries; the additional browser head/part check is scoped to Fantasy Draft.

Browser source 79e44a8a passed run 41572156528/job 125707318482 on that exact completed build (artifact 13200804430, dist tar SHA256 07ba862613295edf069ba10b259879b30beea3227667603dce39bfbeb1609f45). At 320x800 and 1280x900, each context completed 11 human clicks and 11 native timed AI picks. Both XIs were 1 GK, 4 DEF, 3 MID and 3 FWD; visible counts matched the rendered players, and real settlement supplied both verdicts. Source and dist stayed unchanged, with no horizontal overflow, page errors or unexpected console errors. All eight original PNGs were reviewed. This uses the archived pool, a declared local daily-rule fixture and fallback fonts, not live data or actual-font pixel proof. Each context recorded 19 deliberately aborted external requests.

The first browser run (41571523736) remains failed. It completed the draft assertions but its final console check rejected Chromium's exact .Inspector suffix on refused requests. The QA-only correction accepts that literal suffix only for the blocked-client error, still requires a recorded aborted origin, and rejects changed-text and changed-origin controls. No site code or build changed between those browser runs.

The clean branch is codex/ratings-draft-ready-20261102. It contains product, permanent tests, normal generated files and this handoff, with no temporary QA workflows or browser drivers. Main integration and publication remain with K. This is scoped proof, not a full default-suite or live release claim.

The Manager requests keep their existing owners. PR454 remains a separate qualified guide/display handoff. No sports data, database writes or new research were added. Source-only intake limits describe the initial investigation; the remote baseline and scoped proof above are later work. K retains main integration and publication.

A separate visual follow-up is recorded for the existing compact roster: narrow columns heavily truncate player names. It is unchanged here. The new position counts remain legible; keeping each position/count pair together is a minor later refinement.
