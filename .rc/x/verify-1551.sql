-- Round 1551 VERIFY, READ ONLY (one SELECT, no write), for supabase/migrations/20261022120000_round_1551_2026_season_rows.sql.
-- Before the apply expect: afl_premiers 129 0, nrl_premiers 117 0, afl_brownlow 112 0, nrl_dally_m 47 0.
-- After the apply expect:  afl_premiers 130 1, nrl_premiers 118 1, afl_brownlow 113 1, nrl_dally_m 48 1 (four 2026 rows).
select 'afl_premiers' as t, count(*) as n, count(*) filter (where year = 2026 and premier = 'Brisbane Lions') as y2026 from public.afl_premiers
union all select 'nrl_premiers', count(*), count(*) filter (where year = 2026 and premier = 'Sydney Roosters' and competition = 'NRL') from public.nrl_premiers
union all select 'afl_brownlow', count(*), count(*) filter (where year = 2026 and winner = 'Nick Daicos' and club = 'Collingwood' and votes = 47) from public.afl_brownlow
union all select 'nrl_dally_m', count(*), count(*) filter (where year = 2026 and winner = 'Nathan Cleary') from public.nrl_dally_m;
