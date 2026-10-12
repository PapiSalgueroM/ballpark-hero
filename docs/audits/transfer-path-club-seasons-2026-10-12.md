# Transfer Path teammate report, 2026-10-12

Report: tpa-770, Trent Alexander-Arnold to Victor Osimhen, Everyday rule,
rejected Kylian Mbappé after Trent. The reported pool has 253 players.

Verified fact: Trent Alexander-Arnold (England) and Kylian Mbappé (France)
were Real Madrid teammates in 2025/26. Both started the competitive league
match against Osasuna on 19 August 2025.

Independent source receipts:

- Real Madrid, [official starting XI, 19 August 2025](https://www.realmadrid.com/en-US/news/football/first-team/latest-news/once-inicial-del-real-madrid-ante-osasuna-19-08-2025), names both in the starting eleven. The [same-day club preview](https://www.realmadrid.com/en-US/news/football/first-team/fixtures/previa-real-madrid-osasuna-liga-19-08-2025) identifies the campaign as 2025/26.
- BBC Sport, [Real Madrid v Osasuna, 19 August 2025](https://www.bbc.co.uk/sport/football/live/c4gzk4k918jt), independently names both starters, with Trent substituted at 68 minutes.

Their nationalities identify the existing career pool entries. No active-player
eligibility, season totals, values, dates of later transfers or later seasons
are inferred from this evidence.

Cause: the September 7 quarantine removed unverified projected statistical
rows for both players at Madrid in 2025-2026. Transfer Path derived membership
only from those statistical rows, so the truthful membership disappeared too.
The committed career bake retains Trent's Liverpool history through 2024-2025
and Mbappé's Madrid history only through 2024-2025.

Correction: two membership-only records supplement existing pool identities
by normalized name plus nationality. The game merges their club and season
with historical spells when building its graphs. Career Ladder statistics and
database tables stay untouched. Everyday and Europe use the verified link;
Active players only retains its independent verified identity requirement.

When supplemental membership changes a shortest path, the game derives its
minimum and hint from that same graph. Puzzle order, IDs, endpoints, unchanged
hints and saved action formats remain held. Scores for puzzles with a shorter
verified route use the new minimum. Existing completed score submissions are
not rewritten by this patch.

Red proof: remote run 38280414905, job 114916070114, commit 80792452.
The actual hook refused all four reported cases (fetched/fallback and
Everyday/Europe). Eleven existing or preserved-history cases passed.
Final scoped verification is recorded below; integration and publication are pending.

First fix run 38281133521 on adeb5f2a passed 16 hook cases. Its browser
setup ignored the package lock while installing Playwright and upgraded
application dependencies (including SWC and esbuild), then the app type gate
failed in unchanged cbbGrid.ts. No build, control, generated-site or browser
credit is taken from that run. The repaired setup installs browser tools
outside the app dependency tree and verifies every locked installed version
and both package-file hashes before proceeding.

The bugfix gate builds the complete app and regenerates only the Transfer Path
snapshot. All 15 generated-site fences remain in the gate. The earlier
49f2b7d1 full-snapshot request remains separate evidence, with no full-build
acceptance credited while it is still running. No unrelated snapshot output
is adopted into this branch.

Scoped run 38284413880 on 8cb012f8 passed types, the full app build with one
snapshot, 16 hook cases, 11 focused outcomes and the missing-membership
control. Its fence request passed 21 harnesses, but simCareerSeasonTruth
could not read its historical evidence commit from the shallow checkout.
The browser-classified simPrerenderBoot was not discovered without --browser.
Neither its missing coverage nor the skipped report browser is credited.
The next request fetches full Git history and explicitly includes browser
harness discovery.

Final accepted scoped source: 2dfee3048450e2dd61479473c7a1f48861b7512b.
Remote run [38285493476](https://github.com/PapiSalgueroM/ballpark-hero/actions/runs/38285493476),
job 114932739718, completed SUCCESS. All 521 installed locked dependency
versions and both package-file hashes were held. The real app type gate,
complete production app build, one-route snapshot (zero failures), 16 hook
cases, 11 focused outcomes and the actual missing-membership control passed.
All 23 requested harnesses passed, including all 15 generated-site fences and
simPrerenderBoot. Live table sections were explicitly skipped with local-only
flags; no production database proof or whole-suite claim is made.

Actual browser report: six journeys, 108 checks, 48 fixture requests, 24
external requests aborted, zero failures. Everyday and Europe at 320, 390
and 1280 all painted Trent followed by Mbappé with the Real Madrid connector
and saved the accepted action. Each received the unchanged 3,640 statistics
rows. All six original outcome pictures were viewed. The displayed reported
minimum remains three. Browser coverage is the acceptance journey, not a
full reveal, moved-hint or browser-reload walk; daily reload is covered by the
real-hook test. Refreshed direct-link metadata is independently asserted,
while new shortened paths with middle players have bounded source review.

Artifact 11763630478, 697,173 bytes, retained locally under ignored
.tmp-fx/transfer-path-proof and on GitHub. Its ZIP SHA256 is
8a55eeb158dee90124ebc6113a4486a99de4ba3791a844b9f250e88541d56311.
The archive has 15 entries (12 original PNGs, report, installed versions and
package hashes). Two independent source reviews found no blocking issue.

[PR242](https://github.com/PapiSalgueroM/ballpark-hero/pull/242) remains a draft
for G's integration/publication. It was forked from accepted b6eb78e7; later
main changes require the lead's integration checks. No live acceptance is
claimed. This final evidence addition changes documentation only.

The separate 49f2b7d1 full-snapshot request (38282308974) later completed
cancelled during the snapshot build. Types and hook checks had passed, but
its build and downstream gates receive no acceptance credit. Its retained
artifact 11763806237 is 5,645 bytes, ZIP digest
014ab5ff377f8f2f4aed5f83b56c96112bc74720262d194245bea92c94ece908.
That historical result does not replace the completed scoped success above.
