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
Final fix verification and publication are pending.

First fix run 38281133521 on adeb5f2a passed 16 hook cases. Its browser
setup ignored the package lock while installing Playwright and upgraded
application dependencies (including SWC and esbuild), then the app type gate
failed in unchanged cbbGrid.ts. No build, control, generated-site or browser
credit is taken from that run. The repaired setup installs browser tools
outside the app dependency tree and verifies every locked installed version
and both package-file hashes before proceeding.
