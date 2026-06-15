-- Migration 20260526000008: dedupe player_market_values year-2026 rows
-- The 2026 import ran multiple times, leaving up to 9 identical copies per
-- player (10,241 rows, only 5,393 distinct). fetchFootlePlayerPool does not
-- dedupe, so the Footle pool was polluted. Keep one row per player_name —
-- the highest market_value_usd (tie-break by physical ctid). Idempotent:
-- re-running on an already-deduped table is a no-op.

delete from public.player_market_values a
using (
  select player_name,
         (array_agg(ctid order by market_value_usd desc nulls last, ctid))[1] as keep_ctid
  from public.player_market_values
  where year = 2026
  group by player_name
) k
where a.year = 2026
  and a.player_name = k.player_name
  and a.ctid <> k.keep_ctid;
