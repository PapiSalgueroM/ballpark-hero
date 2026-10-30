-- Round 1584: the namesake detection (Q1). READ ONLY: one scan of player_market_values, no write.
-- The lead runs it, once, away from 23:00 to 01:00 ET and from any gate. Builders never run it against production.
-- scripts/lib/clubNamesakeDetect.mjs computes the same rows from an array, and
-- scripts/qa/rehearseClubNamesakes1584.mjs runs this exact text in PGlite over
-- scripts/data/clubNamesakes1584/detectFixture.json and requires the two to agree (control REHEARSE_CONTROL=parity).
-- Its pass A2 adds synthetic rows (one without a nationality, twelve of a split season) so the two clauses the
-- fixture cannot reach are compared too (controls REHEARSE_CONTROL=sql14 and sqlsplit).
--
-- S1, two squads in one: the largest club year of its year, at least 5 rows above the second largest.
--     Sized from every usable row, with or without a nationality (critic advice 14).
--     The margin is to nth_value 2, so a tie at the top is margin 0 and no ordering by text is needed.
-- S2, the cheap foreign bloc: in a club year of 12 or more rows with a nationality, a nationality bloc of 3 or
--     more whose most valuable man is below percentile_cont 0.25 of the rest (6 or more rows).
-- A candidate list for a person, never a verdict. Split season rows ("A / B") are left out of the club years.
-- The names column's order among equal values is not defined: compare it as a set.
with base_all as (
  select club, year, nationality, player_name, market_value_usd::numeric as v
  from public.player_market_values
  where club is not null and market_value_usd is not null and year is not null
    and lower(club) !~ '^(retired|without club|unknown|career break)' and strpos(club, ' / ') = 0
), base as (
  select * from base_all where nationality is not null
), sizes as (
  select club, year, count(*)::int as n_all from base_all group by club, year
), sized as (
  select club, year, n_all,
         rank() over (partition by year order by n_all desc) as size_rank,
         n_all - nth_value(n_all, 2) over (partition by year order by n_all desc
                                           rows between unbounded preceding and unbounded following) as size_margin
  from sizes
), cy as (
  select club, year, count(*)::int as n,
         array_agg(v order by v) as vs,
         array_agg(nationality order by v) as ns,
         array_agg(player_name order by v) as ps
  from base group by club, year
), s2 as (
  select s.club, s.year, s.n, z.size_rank, b.nat, b.k, b.bloc_max, b.bloc_med, r.rest_q1, r.rest_med, b.names
  from cy s
  join sized z on z.club = s.club and z.year = s.year
  cross join lateral (
    select u.nat, count(*)::int as k, max(u.v) as bloc_max,
           percentile_cont(0.5) within group (order by u.v) as bloc_med,
           string_agg(u.p, ', ' order by u.v desc) as names
    from unnest(s.vs, s.ns, s.ps) as u(v, nat, p) group by u.nat having count(*) >= 3
  ) b
  cross join lateral (
    select percentile_cont(0.25) within group (order by u.v) as rest_q1,
           percentile_cont(0.5) within group (order by u.v) as rest_med, count(*)::int as rest_n
    from unnest(s.vs, s.ns) as u(v, nat) where u.nat <> b.nat
  ) r
  where s.n >= 12 and r.rest_n >= 6 and b.bloc_max < r.rest_q1
)
select 'S2' as signal, club, year, n, size_rank, nat, k, bloc_max, bloc_med, rest_q1, rest_med, names from s2
union all
select 'S1', club, year, n_all, size_rank, null, null, null, null, null, null, null
from sized where size_rank = 1 and size_margin >= 5
order by signal, k desc nulls last, year, club;
