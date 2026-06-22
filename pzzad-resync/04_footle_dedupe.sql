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
