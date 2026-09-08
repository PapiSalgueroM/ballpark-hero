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

## Implemented verification

- Initial real-module RED: fifteen of sixteen cases failed. The 132-row fixture
  returned sixty rows and zero live games. One malformed row also discarded
  unrelated valid scores.
- Final query fence: all 24 cases pass, including exact request/window/auth
  shape, later live sports, multiple pages, smaller server caps, raw offsets,
  tied start times, duplicate IDs, malformed individual rows, zero/missing
  scores, unknown and reserved sport keys, optional status text, unused metadata,
  malformed/updated duplicates, later HTTP/JSON/object/network failure, empty
  confirmation and both sides of the request-budget boundary.
- All 25 in-memory controls were rerun by the main agent and proved their exact
  named assertion. No import, transport, runtime error or unrelated failure is
  accepted as proof. A control succeeds with exit 0 only after confirming its
  intended behavioral failure. Temporary bundles use guarded unique OS paths;
  none remained after the final runs. No real account or database was contacted.
- The private shape guard checks only fields consumed by ticker grouping,
  rendering and sorting. Existing isShowable behavior stays separate. Source
  review confirmed the poller's write shape, not production schema nullability:
  no tracked migration or generated type defines live_scores. Empty/nullish
  status text and unused metadata remain permissive. Reserved object-property
  sport keys are rejected without banning ordinary unknown sports.
- Ten requests include empty-page confirmation. At 200 rows per page, 1,800
  rows can complete; 1,801 is refused rather than partially returned. A smaller
  server cap lowers that capacity. This is not a 2,000-row completeness promise.
  Later valid duplicate values replace earlier values without coercion.
- Exact app types and scoped ESLint pass. Build passed in 39.97 seconds with
  2,839 modules and entry `index-De_hcUyy.js`. CSS stays `index-u8YcqwVc.css`.
  Existing dependency/build warnings remain. No package, lockfile, snapshot or
  sitemap ledger changed.
- simTicker and simLiveScores pass. All fifteen generated-site fences pass:
  simAdsense, simBrand, simHeadTags, simHiddenPages, simHubs, simIndexNow,
  simIndexing, simInternalLinks, simNoRivalNames, simPrerender, simPrerenderBoot,
  simRetiredRoutes, simSchema, simSitemap and simSnapshotAssets. Three boot samples
  have zero failed requests; all eleven retired routes redirect.
- The real built-app playLiveTicker walk passes with offset-aware fixtures.
  Its first run reached section 7 and timed out on page.goto after 30 seconds.
  A separate local HTTP read returned 200 in 137ms. The unchanged isolated
  rerun passed all nine sections, including 272px of resumed motion. The timeout
  remains recorded; no production defect was inferred or timeout relaxed.
- The full handoff/focus/long-slate scenarios pass again at 320 and 1440px with
  this build's CSS. Main-agent artifacts: local OS temp `ticker-handoffs-EilMVK`.
  Four-width coverage and controls remain independently recorded in Round 518.
- Additional local preview is 4190. Existing previews 4186 and 4188 stay intact.
  This is a draft candidate, not a publication or full-suite all-clear.
- Independent read-only review found no actionable issue in the final source
  or harness. The main agent independently reran every query case and control.

## Broader suite safety discovery

The planned full default run was not started. Inspecting simPublicWrites showed
that it POSTs real invalid rows to live tables and explicitly warns that a
regressed constraint can let a probe persist. Other harnesses POST to validators
and RPCs whose side effects need review. That conflicts with the overnight
no-production-writes boundary. A safe broad/offline execution mode is the next
bounded verification task; omitted backend checks must stay visibly unverified,
never reported as passes. No live write probes were sent by this round.

PostgREST v14.2 source was checked while evaluating empty-page behavior: absent
an explicit total count, its range status is 200, including empty results. This
query does not request count. Reference:
https://raw.githubusercontent.com/PostgREST/postgrest/v14.2/src/PostgREST/RangeQuery.hs.
