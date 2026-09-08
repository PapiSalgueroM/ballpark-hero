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

GameNav has 134 source call sites across 116 files, but inspection found at most
one rendered GameNav per route state. Multiple calls in a board are exclusive
early-return branches. The duplicate section comes from GameSeoContent's separate
six-link related-game graph, not a second simultaneously rendered GameNav.

Move that existing stable graph into the compact GameNav and remove its duplicate
from GameSeoContent. Explicitly add GameNav to these active pages that have none:
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

The navigation implementer paused with no edits/tests when Anthony asked the
AdSense status question. Main's Footer.test.tsx is present with three intentional
RED results; no footer production changes have happened yet.
