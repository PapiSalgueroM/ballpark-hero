-- Round 531 piece 3: cbb_programs, the 24 memory-generated rows verified two source.
-- Evidence: docs/audits/cbb-programs-verification-2026-09-11.md (every URL is there).
-- Fence: scripts/simCbbPrograms.mjs, which reports these four rows as
-- "pending migration 20260911120000" until this file is applied and goes green after.
-- Twenty of the 24 rows held on two publishers and are not touched. No row was
-- UNVERIFIABLE: no championship count or conference was disputed between publishers.
-- Vacated titles are not counted (Louisville 2013 stays out, the row already says so).
-- UPDATEs are by school_name, which is unique across all 281 rows on 2026-09-11, and
-- each one checks the value it replaces so a re-run or a drifted row raises instead of
-- silently rewriting. useCbbProgram orders the pool by id, so an UPDATE moving a tuple
-- in the heap cannot shift the daily index.

begin;

do $migration$
declare
  n integer;
begin
  -- Michigan: the 2026 title. Wikipedia's champions list and ESPN's all-time winners list
  -- both carry 2026 Michigan (69-63 over UConn, 2026-04-06); mgoblue.com celebrated the
  -- second title on April 11. The live row said one title.
  --   https://en.wikipedia.org/wiki/List_of_NCAA_Division_I_men%27s_basketball_champions
  --   https://www.espn.com/mens-college-basketball/story/_/id/39445992/ncaa-mens-basketball-championship-all-winners-list
  --   https://mgoblue.com/news/2026/4/7/michigan-to-celebrate-2026-mens-basketball-national-champions-on-april-11
  update public.cbb_programs
     set championships_hint = '2 national titles (1989, 2026)'
   where school_name = 'Michigan'
     and championships_hint = '1 national title (1989)';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'Michigan: expected to update 1 row, updated %', n; end if;

  -- Gonzaga: Pac-12 from 2026-07-01. Wikipedia's program infobox, the Pac-12's own launch
  -- notice naming the seven new members, and the CBS Sports 2026-27 realignment list.
  --   https://en.wikipedia.org/wiki/Gonzaga_Bulldogs_men%27s_basketball
  --   https://pac-12.com/news/2026/6/30/general-the-new-pac-12-conference-officially-launches-with-the-addition-of-seven-full-time-members.aspx
  --   https://www.cbssports.com/college-basketball/news/college-basketball-conference-changes-2026-27-gonzaga-pac-12/
  update public.cbb_programs
     set conference_hint = 'Pac-12 Conference (joined in 2026 after decades in the West Coast Conference)'
   where school_name = 'Gonzaga'
     and conference_hint = 'West Coast Conference (WCC)';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'Gonzaga: expected to update 1 row, updated %', n; end if;

  -- Connecticut: the Hartford arena was renamed PeoplesBank Arena in June 2025. Wikipedia's
  -- program infobox and UConn's own facilities page ("PeoplesBank Arena (formerly XL Center)").
  --   https://en.wikipedia.org/wiki/UConn_Huskies_men%27s_basketball
  --   https://uconnhuskies.com/facilities/peoplesbank-arena-(formerly-xl-center)/4
  update public.cbb_programs
     set mascot_hint = 'The Huskies, who play at Gampel Pavilion and PeoplesBank Arena (formerly the XL Center)'
   where school_name = 'Connecticut'
     and mascot_hint = 'The Huskies, who play at Gampel Pavilion and the XL Center';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'Connecticut: expected to update 1 row, updated %', n; end if;

  -- Villanova: the Philadelphia arena was renamed Xfinity Mobile Arena in September 2025.
  -- Wikipedia's program infobox and Villanova's own 2025-26 schedule release
  -- ("Xfinity Mobile Arena (formerly Wells Fargo Center)").
  --   https://en.wikipedia.org/wiki/Villanova_Wildcats_men%27s_basketball
  --   https://villanova.com/news/2025/9/11/complete-2025-26-mens-basketball-slate-is-now-set.aspx
  update public.cbb_programs
     set mascot_hint = 'The Wildcats, who play at the Finneran Pavilion and Xfinity Mobile Arena (formerly the Wells Fargo Center)'
   where school_name = 'Villanova'
     and mascot_hint = 'The Wildcats, who play at the Finneran Pavilion and Wells Fargo Center';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'Villanova: expected to update 1 row, updated %', n; end if;
end
$migration$;

commit;
