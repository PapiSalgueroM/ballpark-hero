# Leaderboard timeout repair, 2026-09-15

## Applied change

Migration `20260915225210_leaderboard_covering_index_bounded.sql` was applied
to the live database at 22:52 UTC. It adds
`idx_game_completions_et_day_game_cover`, a partial index on Eastern date and
game, including player name, score and the original timestamp. The positive
score predicate matches the existing index, which remains valid and ready.
The new index is valid and ready, has two key columns and five total
attributes, and occupies 14,843,904 bytes.

The build used a transaction with a 500ms lock-acquisition limit and a 5s
statement limit. It succeeded. A regular index build can queue score writes
while it holds its lock; this was a bounded maintenance operation, not a
zero-blocking deployment. Public role timeouts stay unchanged, including the
anonymous 3s limit.

No function, ranking formula, filter, cache, permission, game rule, save or
client retry policy changed. An investigated function rewrite was not applied
or shipped. The existing fresh leaderboard remains the independent oracle
for cached player ranks.

## Evidence

Animation verification run [35022671056](https://github.com/PapiSalgueroM/ballpark-hero/actions/runs/35022671056)
had 313 of 314 node harnesses passing. Its one failure was
`simLeaderboardCache.mjs`, HTTP 500 with PostgreSQL 57014, a statement timeout.
The animation source did not change leaderboard code or migrations.

Before the index, the original alltime query profile exceeded 3s. A proposed
rewrite also timed out in an unprofiled anonymous call. Its diagnostic plan
showed the main scan visiting the heap for more than 216,000 score rows.
The covering index makes those values available without visiting every heap
row, where visibility permits.

After the index, the unchanged function passed one unprofiled anonymous
alltime aggregate under the same 3s limit and returned 100 rows. Its separate
`EXPLAIN (ANALYZE, BUFFERS, TIMING OFF)` measurement took **764.481ms**.
It still used 2,087/2,097 temporary read/write blocks. The unshipped candidate
took **156.938ms**, used the new index-only scan and had no temporary blocks.
These are single warm observations, not sustained-load or cold-cache claims.
Tool round-trip times are not reported as database execution times.

The unchanged `node scripts/simLeaderboardCache.mjs` passed at
22:55:43.7305929 UTC, exit 0, in 3.25757 seconds:

- The fresh leaderboard returned 100 players.
- All eight sampled cached ranks and points matched the fresh board.
- The populated today board agreed with the cached leader's rank and points.
- The Soccer Career filtered board agreed with the live filtered-rank branch.

The harness retained its existing retry policy. Its green result does not
prove every request succeeded on its first attempt. The prior failed CI run
remains failed evidence; this repair does not approve any pending feature
release or its artifacts.

Both Supabase advisors were reviewed after DDL. They reported existing
public-data and helper-function findings, with no new table, policy, grant or
function in this change. The new index initially appeared as unused before
its first query. No unrelated advisor repairs were included.

## Rollback and records

Rollback removes only the new index with a separately reviewed bounded
`DROP INDEX`, preserving the old index. Use the same transaction-local 500ms
lock and 5s statement limits; inspect the exact index and migration history
before retrying an uncertain result. There is no function change to undo.

Raw metadata, plans, aggregate hashes, advisor results and both unchanged
harness logs are in the session evidence directory:
`C:/Users/antho/AppData/Local/Temp/dukb-leaderboard-cache-20260915`.
The unused function draft is outside the migration directory, with SHA256
`423bcc105a6d44aab82293ef415bde42d2dbed072dc2592b6880c653e9a6385d`.
Its independent 21-case fixture parity and four effective controls passed,
but those results are not a reason to ship an unnecessary rewrite.

PostgreSQL documents [index-only visibility requirements](https://www.postgresql.org/docs/current/indexes-index-only-scans.html)
and [index locking and storage costs](https://www.postgresql.org/docs/current/sql-createindex.html).
The production decision uses the observed results above, not estimated plan
cost alone.
