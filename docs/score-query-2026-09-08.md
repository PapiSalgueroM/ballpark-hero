# Round 519: bounded complete score queries

Base: Round 518 `2e6519ac`, draft PR69. Query and test changes only.

## Reproduction and plan

1. Execute real fetchLiveScores against a mock REST endpoint with 130 early
   soccer finals and two later live games. Before the fix it returns only the
   earliest 60 finals. Verify every expected ID, live-first sorting and all
   represented sports after the fix.
2. Page in stable `start_at.asc,id.asc` order using a 200-row request size and
   at most ten requests. Advance by raw returned rows, not filtered rows, and
   confirm completion with an empty page. A smaller server cap is not an end
   marker. Deduplicate IDs. Return the existing empty failure result when the
   query cannot finish, instead of returning a silently partial result.
3. Validate individual row shapes before score filtering. Retain valid values
   unchanged, including real zero scores. Never fill absent scores with zero.
   A bad row must not discard unrelated valid games.
4. Use deterministic mocked REST tests for completeness, ties, server caps,
   malformed data, later-page errors, duplicate pages and request bounds. Prove
   each new check fails its intended source-mutating control. The fake transport
   must record protocol errors outside production's catch.
5. Update existing browser fixtures to honor offsets. Run exact types/build,
   query/ticker tests, real built-app ticker and all fifteen generated-site
   fences. Keep independent review and whole-suite limitations explicit.

The ten-request limit is a network safety budget, not a claim about the number
of fixtures in the world. Offset pages are not an atomic snapshot when upstream
rows change during a read. This round does not change the existing time window,
five-minute hook, database schema, provider, real sports data, billing, accounts,
or game engines. No merge or publish.

## Current documentation

The current Supabase changelog was inspected for relevant API/pagination changes.
No applicable breaking change was identified for this existing table read.
Supabase requires an ordered range for predictable paging; PostgREST accepts
limit/offset parameters and may return fewer rows than requested.

- https://supabase.com/changelog.md
- https://supabase.com/docs/reference/javascript/using-modifiers-range
- https://postgrest.org/en/stable/references/api/pagination_count.html

## Other lane status at claim

Claude's tracked root tree is clean at `73d61f54`. Its completed 265-harness run
and follow-up results are documented there: the note reports six not green,
four backend-dependent checks passed on retry, Connect4 remains red, and
simPress is under baseline investigation. No runAllSims process was found in
the latest local process check. These are that lane's results, not a passing
full suite for this candidate. Do not edit or build in its checkout.
