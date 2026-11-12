-- Stage the verified 2025-2026 Barcelona link and its three tpa-912 hints.
-- Apply after Round 784, the Active refresh, Carvajal and the Liverpool correction.
do $migration$
declare
  career record;
  desired record;
  conflicts integer;
  matching integer;
  seasons_present integer := 0;
  puzzle_count integer;
  unique_sort_orders integer;
  deck_digest text;
  active_count integer;
  partial_count integer;
  hint_digests text[];
  updated integer;
  before_digests constant text[] := array[
    '865aa99ad67bc66a59f1cd143dba089e1b68a0fc36dbe04b9c74457252c316cf',
    'f190450ad4054d41b3e14c2cb166b01262566c646f7bd0f85c79f4605a8b92b7',
    'b469713aadc9e5f48df4e1e5064be79d740aa0b124d1610ab6fd31f1c5ac5940'
  ];
  after_digests constant text[] := array[
    'ba40a86a868d359b9bbc3f35039b41a1dc5c294f3a5d4d8e6ede0245f7004390',
    '9119a4e8db4637f502047ea9e6f6c45c97822ff7cc41ca116bd45153a3ed466d',
    '7b0c1f6d070e1227b86121e6cece3c9d839bd525e69731edb10fc2c64933d22e'
  ];
begin
  for career in
    select * from (values
      ('a0000001-0000-0000-0000-000000000004'::uuid, 'Robert Lewandowski', 'Poland', 'ST', 16, 19, 46, array[
        '0:2009-2010:Borussia Dortmund', '1:2010-2011:Borussia Dortmund', '2:2011-2012:Borussia Dortmund',
        '3:2012-2013:Borussia Dortmund', '4:2013-2014:Borussia Dortmund', '5:2014-2015:Bayern Munich',
        '6:2015-2016:Bayern Munich', '7:2016-2017:Bayern Munich', '8:2017-2018:Bayern Munich',
        '9:2018-2019:Bayern Munich', '10:2019-2020:Bayern Munich', '11:2020-2021:Bayern Munich',
        '12:2021-2022:Bayern Munich', '13:2022-2023:Barcelona', '14:2023-2024:Barcelona',
        '15:2024-2025:Barcelona'
      ]),
      ('a0000001-0000-0000-0000-000000000024'::uuid, 'Marcus Rashford', 'England', 'LW', 10, 14, 49, array[
        '0:2015-2016:Manchester United', '1:2016-2017:Manchester United', '2:2017-2018:Manchester United',
        '3:2018-2019:Manchester United', '4:2019-2020:Manchester United', '5:2020-2021:Manchester United',
        '6:2021-2022:Manchester United', '7:2022-2023:Manchester United', '8:2023-2024:Manchester United',
        '9:2024-2025:Aston Villa'
      ])
    ) as rows(player_id, player_name, nationality, position, append_order, goals, appearances, prior_spells)
    order by player_id
  loop
    perform 1 from public.career_players p
    where p.id = career.player_id and p.player_name = career.player_name
      and p.nationality = career.nationality and p.position = career.position
    for update;
    if not found then raise exception 'Career identity changed for %', career.player_name; end if;

    perform 1 from public.career_seasons s where s.player_id = career.player_id
    order by s.sort_order, s.id for update;
    if (select array_agg(concat(s.sort_order, ':', s.season, ':', s.club) order by s.sort_order)
        from public.career_seasons s
        where s.player_id = career.player_id and s.sort_order <> career.append_order)
      is distinct from career.prior_spells then
      raise exception 'Career spells changed before the Barcelona correction for %', career.player_name;
    end if;

    select count(*), count(*) filter (
      where s.season = '2025-2026' and s.club = 'Barcelona' and s.sort_order = career.append_order
        and s.goals = career.goals and s.assists is null
        and s.appearances = career.appearances and s.market_value = 0
    ) into conflicts, matching
    from public.career_seasons s
    where s.player_id = career.player_id
      and (s.sort_order = career.append_order or btrim(s.season) = '2025-2026');
    if conflicts <> matching or matching > 1 then
      raise exception 'Conflicting 2025-2026 career row for %', career.player_name;
    end if;
    seasons_present := seasons_present + matching;
  end loop;
  if seasons_present = 1 then raise exception 'Only one Barcelona correction season exists'; end if;

  perform 1 from public.career_seasons s
  where s.season = '2025-2026' and s.club = 'Liverpool' and s.market_value = 0
    and (s.player_id, s.sort_order, s.goals, s.assists, s.appearances) in (
      ('a0000001-0000-0000-0000-000000000026'::uuid, 12, 8, 3, 55),
      ('a0000001-0000-0000-0000-000000000060'::uuid, 8, 4, 1, 22)
    )
  order by s.player_id for share;
  get diagnostics matching = row_count;
  if matching <> 2 then raise exception 'Barcelona correction requires both Liverpool career seasons'; end if;

  -- The Daily selector depends on the ordered deck. Keep its IDs, endpoints and order exact.
  lock table public.transfer_path_puzzles in share row exclusive mode;
  select count(*), count(distinct p.sort_order),
    encode(sha256(convert_to(string_agg(to_json(array[
      p.puzzle_id, p.player_a, p.player_b, p.sort_order::text
    ])::text, E'\n' order by p.sort_order), 'UTF8')), 'hex')
  into puzzle_count, unique_sort_orders, deck_digest
  from public.transfer_path_puzzles p;
  if puzzle_count <> 885 or unique_sort_orders <> 885
    or deck_digest is distinct from '25f63ba02e4f5d29e93ebc6aa045b3d087bffa3c1e43a68dc0bc61eebf150f56' then
    raise exception 'Barcelona correction requires the exact ordered Daily deck';
  end if;

  with hint_rows as (
    select p.puzzle_id, p.player_a, p.player_b, h.rule, h.min_steps, h.hint
    from public.transfer_path_puzzles p
    cross join lateral (values
      ('classic', p.min_steps, p.hint),
      ('active', p.active_min_steps, p.active_hint),
      ('europe', p.europe_min_steps, p.europe_hint)
    ) h(rule, min_steps, hint)
  ), by_rule as (
    select rule, count(*) filter (where min_steps is not null and hint is not null) as complete,
      count(*) filter (where (min_steps is null) <> (hint is null)) as partial,
      encode(sha256(convert_to(string_agg(to_json(array[
        puzzle_id, player_a, player_b, min_steps::text, hint
      ])::text, E'\n' order by puzzle_id collate "C")
        filter (where min_steps is not null and hint is not null), 'UTF8')), 'hex') as digest
    from hint_rows
    group by rule
  )
  select max(complete) filter (where rule = 'active'), sum(partial),
    array_agg(digest order by case rule when 'classic' then 1 when 'active' then 2 else 3 end)
  into active_count, partial_count, hint_digests
  from by_rule;
  if active_count <> 212 or partial_count <> 0
    or hint_digests is distinct from (case when seasons_present = 0 then before_digests else after_digests end) then
    raise exception 'Barcelona correction requires the exact career correction and Active refresh hint state';
  end if;
  if seasons_present = 2 then return; end if;

  insert into public.career_seasons (player_id, season, club, goals, assists, appearances, market_value, sort_order)
  values
    ('a0000001-0000-0000-0000-000000000004', '2025-2026', 'Barcelona', 19, null, 46, 0, 16),
    ('a0000001-0000-0000-0000-000000000024', '2025-2026', 'Barcelona', 14, null, 49, 0, 10);

  for desired in
    select * from (values
      ('tpa-912', 'Kobbie Mainoo', 'Lamine Yamal', 'classic', 4, 'Three middle men at least. The first was at Manchester United with Kobbie Mainoo; the last was at Barcelona with Lamine Yamal.', 3, 'Two middle men at least. The first was at Manchester United with Kobbie Mainoo; the last was at Barcelona with Lamine Yamal.'),
      ('tpa-912', 'Kobbie Mainoo', 'Lamine Yamal', 'active', 4, 'Three middle men at least. The first was at Manchester United with Kobbie Mainoo; the last was at Barcelona with Lamine Yamal.', 3, 'Two middle men at least. The first was at Manchester United with Kobbie Mainoo; the last was at Barcelona with Lamine Yamal.'),
      ('tpa-912', 'Kobbie Mainoo', 'Lamine Yamal', 'europe', 4, 'Three middle men at least. The first was at Manchester United with Kobbie Mainoo; the last was at Barcelona with Lamine Yamal.', 3, 'Two middle men at least. The first was at Manchester United with Kobbie Mainoo; the last was at Barcelona with Lamine Yamal.')
    ) as rows(puzzle_id, player_a, player_b, rule, old_min_steps, old_hint, min_steps, hint)
  loop
    update public.transfer_path_puzzles p
    set min_steps = case when desired.rule = 'classic' then desired.min_steps else p.min_steps end,
        hint = case when desired.rule = 'classic' then desired.hint else p.hint end,
        active_min_steps = case when desired.rule = 'active' then desired.min_steps else p.active_min_steps end,
        active_hint = case when desired.rule = 'active' then desired.hint else p.active_hint end,
        europe_min_steps = case when desired.rule = 'europe' then desired.min_steps else p.europe_min_steps end,
        europe_hint = case when desired.rule = 'europe' then desired.hint else p.europe_hint end
    where p.puzzle_id = desired.puzzle_id and p.player_a = desired.player_a and p.player_b = desired.player_b
      and (case desired.rule when 'classic' then p.min_steps when 'active' then p.active_min_steps else p.europe_min_steps end,
           case desired.rule when 'classic' then p.hint when 'active' then p.active_hint else p.europe_hint end)
        is not distinct from (desired.old_min_steps, desired.old_hint);
    get diagnostics updated = row_count;
    if updated <> 1 then raise exception 'tpa-912 % hint changed before the Barcelona correction', desired.rule; end if;
  end loop;
end
$migration$;
