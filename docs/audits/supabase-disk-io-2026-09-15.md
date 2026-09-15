# Supabase Disk I/O: 2026-09-15 observation and harness repair

## Scope and status

Anthony confirmed the Disk I/O email arrived today. This audit used project
`flawuiqbvjobmkfkauhw`, read-only database statistics, catalog metadata and
managed logs. It made no application-table scans, query profiles, database
changes or new production harness runs. The frontend publication problem is
separate: moving its host would still leave these Supabase reads in place.

The isolated repair starts at main `97d688943b498d577df98e349c09df6e633a8bd8`.
It changes three verification harnesses and two harness-only helpers, adds
an offline regression harness, and does not change application code, SQL,
ranking, permissions, timeouts or spend settings. Production performance
and the three live harness outcomes have not been remeasured after this patch.

## What the observations establish

At 23:28:39.602287 UTC, the project was `ACTIVE_HEALTHY`, with 18 idle client
sessions and no active client query or client I/O wait. At 23:32:18.322574,
19 client sessions were idle. During those 218.72 seconds, database counters
increased by 31,761,628 temporary bytes and 15 shared blocks read (120 KiB).
This quiet interval does not prove the earlier budget alert has cleared.

`work_mem` was 2,184 KiB and shared buffers were 224 MiB.
`track_io_timing` was off, so zero I/O timing counters are not evidence of
zero I/O. Database temporary-byte totals had no usable reset timestamp;
statement statistics reset on June 14 and individual retained entries began
on different dates. Their cumulative totals cannot be called today's usage.

Selected retained statement statistics, grouped by sanitized query shape:

| Shape | Calls | Temporary blocks written | Interpretation |
| --- | ---: | ---: | --- |
| Anonymous market-value read | 11,849 | 3,457,988 | About 26.38 GiB since this entry began on August 31 |
| `player_ranks` materialized-view refresh | 4,321 | 2,847,022 | About 21.72 GiB; active cron runs every five minutes |
| One stint read shape | 4,077 | 1,941,203 | About 14.81 GiB cumulative |
| Another stint read shape | 5,723 | 1,927,610 | About 14.71 GiB cumulative |

Managed REST logs from 04:00 UTC (midnight EDT) through 23:31:30 UTC showed
100,885 market-value requests, of which 92,460 had Node/undici-style user
agents, and 5,638 stint requests, of which 5,431 had those agents. There
were 202 logged statement timeouts today, with none in the 23:00 hour up to
that cutoff. A Node-style agent does not identify an individual CI job or
prove that verification caused the entire alert. No logged out-of-memory
message or temporary-file message was found; absent logging does not rule
out swapping or temporary-file activity.

The available evidence does not expose remaining Disk I/O budget percent,
compute class, operating-system swap, physical throughput, or the exact email
timestamp. Supabase describes the budget as burst capacity above a compute
baseline and documents query spills, memory pressure and cache misses as
possible causes. Database Health and its metrics are needed for direct budget
and host-level observations. See [Disk I/O guidance](https://supabase.com/docs/guides/troubleshooting/exhaust-disk-io)
and [Metrics API](https://supabase.com/docs/guides/observability/metrics).

## Concrete avoidable work and repair

### Two stint readers

`simConnect4ClubRecords.mjs` and `simSoccerStintNameFold.mjs` each fetched
1,000-row offset pages ordered by raw `player_name,club`. Catalog inspection
found no matching index. The existing primary key is `id`; other indexes
cover folded/lowercase names and unrelated fields. The estimated 80,586 live
rows imply 81 pages per reader at that size, not an exact row-count claim.

Both readers now request `id` alongside their original columns, order by
`id.asc`, and continue with `id > last_id`. Every page must have safe integer
IDs that strictly advance, including across page boundaries. Their original
four attempts, delays, data thresholds, record/name assertions and live lookup
checks remain intact. The old 200-page ceiling now rejects an incomplete scan
instead of silently accepting the first 200,000 rows. There is no cached scan.

For a static table, the local proof confirms identical complete row payloads.
As before, independent REST pages are not one transaction snapshot. Concurrent
inserts, deletions or edits can affect a live scan. Primary-key order also
changes insertion order in the harness collections: the 12 spread hard-name
samples in the fold check and candidates selected by the Connect4 records
check can differ. Their eligibility rules and checks are unchanged; exact
sample identity is not promised. The index-friendly traversal is a source and
catalog inference, not a measured latency or I/O reduction.

### Rarity agreement prominence reads

Static AST inspection found 33 single-equality filtered categories: 13 club,
10 nationality and 10 position. Section 1 runs 36 prefixes for each. In its
healthy path, this requests 1,188 direct searches plus 1,188 identical-per-category
prominence pools. The new invocation-local memo reduces that prominence leg
to 33 fetches and 1,155 reuses, retaining all 1,188 direct searches. Section 2
adds one live direct search and reuses the goalkeeper prominence response.
Pool/view checks and their data-dependent page counts are unchanged. The
healthy modeled total for these two search legs is 2,378 requests becoming
1,222 fetches, with 1,156 successful-response reuses.

Only the exact market-value GET shape used for prominence, with limit 1,000,
the existing value/year/name order and one equality filter, is eligible.
The key includes the full URL and all headers. Direct name filters, other
queries and already-aborted requests bypass it. Only HTTP-success responses
whose cloned body parses as an array are retained; errors, malformed JSON,
wrong shapes and thrown requests remain retryable. Original response bodies,
headers and status are preserved. Each invocation starts fresh. This makes
one category's prominence data stable within a run; a mid-run source change
can still appear through uncached direct searches and pool/view reads.

`simPlayerSearchAccents.mjs` is unchanged, including its ten independent
identical live requests that check ordering stability. No application cache
was added, and no persistent artifact replaces a fresh standalone harness read.

## Local verification

`node scripts/simDatabaseReadEfficiency.mjs` passes four sections without
network access. Both stint projections match an independent sorted full
fixture at sizes 0, 999, 1,000, 1,001, 2,000 and 2,503, including repeated
names and boundary IDs. It checks invalid/duplicate/descending/unsafe IDs,
read failures, exact-multiple termination, and the 200-page limit. The memo
proof compares response body, status and headers with direct fixture responses,
models all 1,188 direct searches, and checks auth/Range identity, error recovery,
aborts and a new invocation.

All 11 source mutations change one unique executable anchor and fail their
intended assertion: `skip`, `duplicate`, `order`, `invalid`, `cap`, `nomemo`,
`failed`, `body`, `direct`, `key`, `abort`. Changed files also pass Node syntax
checks. This is local harness validation, not a green live database suite.

## Next evidence-backed steps

Keep duplicate full verification runs stopped while the current usage warning
is investigated. After review, use this patch in future necessary runs and
compare the logged live/reused request counts. Read Database Health's budget,
throughput and memory/swap charts before deciding whether query changes or
paid compute are justified. More disk capacity alone need not raise the
compute I/O ceiling. See [Compute and Disk](https://supabase.com/docs/guides/platform/compute-and-disk).

The earlier leaderboard covering index is retained. It restored the unchanged
fresh leaderboard under the existing timeout, but its single warm profile
still wrote 2,097 temporary blocks. The faster unapplied query draft could be
considered separately; this audit does not authorize deploying it, changing
the five-minute ranking refresh, or raising global memory/timeouts.

The sanitized observation file remains outside the repository at
`%TEMP%/dukb-disk-io-20260915/read-only-statistics-and-logs.json`.
Its SHA-256 is `a47c89b6002e6e3a4a05b50a93b314d321560396c242765205bbaf06289c9389`.
