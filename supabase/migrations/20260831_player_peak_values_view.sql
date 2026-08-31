-- Round 367: one row per player, carrying the peak market value.
-- APPLIED 2026-08-31.
--
-- WHY. Rarity Round built every category pool by selecting from
-- player_market_values ACROSS ALL YEARS with .limit(1000), ordered by value
-- descending, then collapsing to distinct players on the client. PostgREST caps
-- at 1,000 regardless of the limit asked for, so that window filled with a few
-- hundred stars and the pools the player actually got were a fraction of the
-- real ones: Brazil has 1,722 distinct players in the table and 206 were
-- reachable; Centre-Forward has 2,457 and 241 were.
--
-- The number is not internal. It is rendered to the player as the size of the
-- field they are picking from, it feeds scoreRound, and any answer outside the
-- pool is refused outright with "that player doesn't count for this category",
-- so the obscure answers the game exists to reward were exactly the ones being
-- truncated away, and the player was told they were wrong.
--
-- The file's own comments named the pools it meant to have ("Verified pool
-- sizes: Brazil 1680, Centre-Forward 2396, Centre-Back 2381"). This view
-- reproduces those to within one (1,681 / 2,396 / 2,381), which is what makes
-- the aggregate below the shape the author intended rather than a new
-- invention, and it is why the fix is verifiable instead of a matter of taste.
--
-- player_market_values_dedup does not help here: it is one row per player-year,
-- 136,178 rows.
--
-- The nationality and position carried here are the most recently tagged
-- values, which is what the position comment already specified ("most recent
-- position tag"). Peak is a max across every year, which is exactly what
-- rankPool computes on the client today, so the client does the same
-- arithmetic over a tenth of the rows.
--
-- NOT USED FOR THE CLUB POOLS, deliberately: that filter means "ever played for
-- this club", and this view carries only a player's most recent club, so it
-- would silently drop everyone who has since moved on. Those stay on
-- player_market_values and were paged instead.
create or replace view public.player_peak_values as
  select
    player_name,
    max(market_value_usd) as peak_value_usd,
    (array_agg(nationality order by year desc nulls last))[1] as nationality,
    (array_agg(position    order by year desc nulls last))[1] as position
  from public.player_market_values
  where player_name is not null and market_value_usd is not null
  group by player_name;

-- Round 361 raised exactly this as an ERROR on a view created without it.
-- Without security_invoker a view runs with its owner's rights: it exposes
-- nothing here, because player_market_values already carries a public read
-- policy, but it would go on serving those rows if that table were ever
-- restricted. get_advisors after applying this: zero ERROR.
alter view public.player_peak_values set (security_invoker = true);

comment on view public.player_peak_values is
  'Round 367. One row per player with their peak market value and most recent nationality and position. Exists so Rarity Round can read a whole category pool instead of the top 1,000 rows of an all-years table. Read only, derived entirely from player_market_values.';
