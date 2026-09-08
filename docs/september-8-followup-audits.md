# Source audits for the September 8 tweaks

Read-only inspections based on `671ffc0c`. These are not deployed changes.

## Ticker

Confirmed in source: useLiveScores refetches every five minutes. TopTicker holds
each fresh sport for 1500 ms, then fitting groups dwell for 5 to 14 seconds. The
crawl itself moves at 75 px/s. The score query caps all sports together at 60 rows
ordered by start time; updated_at is carried but not used to reject stale live
scores. A busy sport can crowd later games out before client sorting.

Project notes describe a 20-minute server schedule. If that is still deployed,
the combined cadence can approach 25 minutes of delay. Verify actual cron and
deployed function duration before stating that as the current live configuration.

The audit found nine ticker sport keys across 20 feeds. F1, Golf, Aussie Rules,
NASCAR, Combat Sports and mixed World/Olympic events need coverage work. Racing
and tournament feeds need leader/event cards, not fake home-versus-away rows.

Suggested next round: shorter measured sport handoffs, safe pagination, explicit
live-score freshness behavior, and tests with more than 60 rows and stale timestamps.
Then verify and improve backend cadence within existing request/expense limits.

## One next-game section

The initial audit was incomplete. A later registry-derived browser pass found
18 more initial-state routes missing navigation after removing the SEO copy's
related section. Thirteen had no GameNav anywhere, and five had one only inside
later board branches. Those now have explicit page ownership; six descendant
copies were removed from the five conditional boards. The corrected 121-route
built inventory is required before this change is called verified.

The initial source count was 134 call sites across 116 files, with at most
one rendered GameNav per route state. Multiple calls in a board are exclusive
early-return branches. The duplicate section comes from GameSeoContent's separate
six-link related-game graph, not a second simultaneously rendered GameNav.

Move that existing stable graph into the compact GameNav and remove its duplicate
from GameSeoContent. The first pass added GameNav to these active pages:
/perfect-lineup-nba, /perfect-lineup-f1, /perfect-lineup-nhl, /transfer-path.
Do not add it to retired /perfect-lineup. Guess NFL Team already has child-owned
GameNav and is unregistered/noindexed. GridArchive has GameNav but its archive URL
is not a registry game. Preserve an explicit fallback for those routes.

Do not place GameNav inside GameSeoContent, which would duplicate child-owned nav.
Do not keep data-no-prerender on the stable related-game links. Keep it on volatile
countdowns/fallback recommendations. Preserve useful guide text and the only H1
where GameSeoContent supplies it. Check raw snapshots as well as React: current
prerendering rebuilds readable markup and must not lose closed disclosure content
or flatten the compact layout into another forced wall of text.

Navigation implementation resumed after Anthony prioritized AdSense readiness.
Footer passes its three focused tests after the initial RED run. Full guide and
footer disclosure capture passed a real fixture with a working negative control
and seven raw no-JavaScript snapshot checks. Full generation was stopped for the
navigation correction above and must run again before shipping.

## Accounts

Read-only audit found profile stats mixing server points with local games/streaks.
Stored profiles.streak_state is not hydrated on sign-in. Completion writes are
sequential, can partially fail without surfaced query errors, and use a vulnerable
read/modify/write score aggregate. Profile rank differs from the public leaderboard's
normalized scoring. Dates mix UTC and Eastern. History is capped at five rows and
uses a manual label map that misses many saved game slugs.

Do not blindly recompute totals from raw history: existing duplicate pollution
means raw sums are not automatically authoritative. Older leaderboard rows lack
user_id and cannot safely be attached to accounts by a guessed name. Preserve
chosen profile names; plan a reversible backfill for clearly blank profiles only.

Google/Apple buttons remain deliberately disabled pending provider and branding
verification. Google has mocked focused tests but no new real OAuth proof. Apple's
paid developer prerequisite and setup remain unverified. Share cards have separate
game/profile implementations and currently inherit questionable profile numbers.

Suggested order: atomic/idempotent error-checked completions, one server stats/rank
model and streak hydration, labeled paginated history, carefully scoped name
backfill, then share-card improvement and verified provider activation. No database
or OAuth mutations were made in this audit. Aggregate account counts are omitted
from this public handoff because the actionable defects do not require them.
