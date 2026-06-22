# pzzad resync — create + seed the live DB's missing tables

## Why this exists

The **live site, douknowball.com, runs on Supabase project `pzzadswiradjnvvfybol` (pzzad)**.
That project lives in the **Supabase account linked through Lovable** — a *different*
account from the one our local tooling can reach.

- The repo's `SUPABASE_ACCESS_TOKEN` and the Supabase MCP (`.mcp.json` →
  `--project-ref=flawuiqbvjobmkfkauhw`) can **only** see project **`flawuiqbvjobmkfkauhw`
  (flawu)**. `supabase projects list` with that token returns flawu and nothing else.
- pzzad is **not** reachable from this token/MCP/CLI at all. The only programmatic
  access to pzzad is its public REST API with the anon key in `.env` — read-only
  (RLS blocks anon writes).

**Consequence:** a batch of DB work (Connections, Baseball Connections, Tennis seeds)
was applied to **flawu**, but the live site reads **pzzad**, where those tables were
never created. On pzzad, `connections_puzzles` returns 404 (table missing), so the live
Connections game is currently served by the bundled `connectionsPuzzles.ts` fallback
instead of the cloud table. These files fix that by creating and seeding the missing
tables directly in pzzad.

## How to run (the only path that works)

You **cannot** run these from this repo (MCP/CLI/token can't reach pzzad). Run them in
the **Supabase dashboard SQL editor, logged into the account that owns pzzad**:

1. Open **Lovable → your project → Settings → Supabase integration** and follow the link
   to the connected Supabase project (that's the account that owns pzzad). Or log in at
   `https://supabase.com/dashboard/project/pzzadswiradjnvvfybol` with the email that owns it.
2. Open the **SQL Editor**.
3. Run the files **in numbered order**, one at a time, pasting each file's full contents.

All files are plain SQL with no comments. Files `01`–`03` are
`CREATE TABLE IF NOT EXISTS` + RLS policy + idempotent `UPSERT` — safe to re-run.

| Order | File | Action | Expected after running |
|------|------|--------|------------------------|
| 1 | `pzzad-resync/01_connections.sql` | create + seed `connections_puzzles` | 250 rows |
| 2 | `pzzad-resync/02_baseball_connections.sql` | create + seed `baseball_connections_puzzles` | 60 rows |
| 3 | `pzzad-resync/03_tennis.sql` | create + seed `tennis_players` | 40 rows |
| 4 | `pzzad-resync/04_footle_dedupe.sql` | **DELETE** duplicate `player_market_values` rows (Footle) | see below |

Verify counts after each:

```sql
select count(*) from public.connections_puzzles;          -- expect 250
select count(*) from public.baseball_connections_puzzles; -- expect 60
select count(*) from public.tennis_players;               -- expect 40
```

## File 4 (Footle) is destructive — read first

`04_footle_dedupe.sql` is **not** a seed. It **deletes** duplicate rows from the
pre-existing `player_market_values` table (the 2026 import ran multiple times, leaving
up to ~9 copies per player, which pollutes the Footle pool). It keeps **one row per
`player_name`** — the highest `market_value_usd` (tie-break by physical `ctid`). It is
idempotent (running it on an already-clean table deletes nothing).

**Before running it, preview exactly what it will delete** and run the delete only if the
"to_delete" number looks right:

```sql
-- how many 2026 rows exist, how many distinct players, how many would be removed
select
  count(*)                                   as total_2026_rows,
  count(distinct player_name)                as distinct_players,
  count(*) - count(distinct player_name)     as to_delete
from public.player_market_values
where year = 2026;

-- the actual duplicate rows that will be removed (everything except the kept row per player)
select a.*
from public.player_market_values a
join (
  select player_name,
         (array_agg(ctid order by market_value_usd desc nulls last, ctid))[1] as keep_ctid
  from public.player_market_values
  where year = 2026
  group by player_name
) k
  on a.year = 2026
 and a.player_name = k.player_name
 and a.ctid <> k.keep_ctid
order by a.player_name;
```

`to_delete` should equal the row count returned by the second query. After running
`04_footle_dedupe.sql`, re-run the first preview query: `to_delete` should be `0`.

If `player_market_values` does not exist on pzzad, or `total_2026_rows` is `0`, **stop** —
do not run file 4; the Footle data source isn't where we assumed and needs investigating.

## Provenance of the data

- `01_connections.sql` — generated from `src/data/connectionsPuzzles.ts` (250 puzzles),
  the same source flawu was seeded from.
- `02_baseball_connections.sql` — generated from `src/data/baseballConnectionsPuzzles.ts`
  (60 puzzles).
- `03_tennis.sql` — generated from `pzzad-resync/_tennis_flawu.json`, which was pulled
  **read-only** from flawu (there is no tennis data file in the repo). Note: the
  `tennis_players` DDL here adds `unique (player_name)` so the UPSERT has a clean conflict
  key; flawu's copy lacks that constraint, but the data has no duplicate names so the
  difference is cosmetic.
- `04_footle_dedupe.sql` — mirrors `supabase/migrations/20260526000008_dedupe_player_market_values_2026.sql`.

Regenerate any time with: `node scripts/_gen_replay.cjs`

## Related (frontend)

Creating these tables only matters once the deployed frontend actually reads them. The
fetch helpers (`fetchConnectionsPuzzles`, `fetchBaseballConnectionsPuzzles`, tennis hook)
live on branch `db-resync-and-fixes`, which is **not yet merged to `main`** (Lovable
deploys from `main`). Until that merges, these tables sit ready but unused, and the games
keep serving their bundled fallbacks. Creating the tables early is harmless.
