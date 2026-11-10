-- Add the verified 2025-2026 Liverpool seasons and their four Active hints atomically.
-- Prerequisite: 20260911190000_refresh_verified_active_transfer_path_hints.sql.
do $migration$
declare
  career record;
  desired record;
  conflicts integer;
  matching integer;
  seasons_present integer := 0;
  puzzle_count integer;
  active_count integer;
  partial_count integer;
  active_digest text;
  updated integer;
  before_digest constant text := '1fbcc0d7c20966886987be6c086c9c5ff640454ac1ee872a2c4038adf50564ad';
  after_digest constant text := 'f190450ad4054d41b3e14c2cb166b01262566c646f7bd0f85c79f4605a8b92b7';
begin
  for career in
    select * from (values
      ('a0000001-0000-0000-0000-000000000026'::uuid, 'Virgil van Dijk', 'Netherlands', 'CB', 12, 8, 3, 55, array[
        '0:2013-2014:Celtic', '1:2014-2015:Southampton', '2:2015-2016:Southampton',
        '3:2016-2017:Southampton', '4:2017-2018:Liverpool', '5:2018-2019:Liverpool',
        '6:2019-2020:Liverpool', '7:2020-2021:Liverpool', '8:2021-2022:Liverpool',
        '9:2022-2023:Liverpool', '10:2023-2024:Liverpool', '11:2024-2025:Liverpool'
      ]),
      ('a0000001-0000-0000-0000-000000000060'::uuid, 'Alexander Isak', 'Sweden', 'ST', 8, 4, 1, 22, array[
        '0:2017-2018:Borussia Dortmund', '1:2018-2019:Willem II', '2:2019-2020:Real Sociedad',
        '3:2020-2021:Real Sociedad', '4:2021-2022:Real Sociedad', '5:2022-2023:Newcastle',
        '6:2023-2024:Newcastle', '7:2024-2025:Newcastle'
      ])
    ) as rows(player_id, player_name, nationality, position, append_order, goals, assists, appearances, prior_spells)
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
      raise exception 'Career spells changed before the Liverpool correction for %', career.player_name;
    end if;

    select count(*), count(*) filter (
      where s.season = '2025-2026' and s.club = 'Liverpool' and s.sort_order = career.append_order
        and s.goals = career.goals and s.assists = career.assists
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
  if seasons_present = 1 then raise exception 'Only one Liverpool correction season exists'; end if;

  -- Serialize with other puzzle writers while allowing readers. Hash one JSON
  -- string array per complete Active row, separated by LF and sorted by ID in
  -- C collation, from the immutable 212-row refresh and its four replacements.
  lock table public.transfer_path_puzzles in share row exclusive mode;
  select count(*), count(*) filter (where p.active_min_steps is not null and p.active_hint is not null),
    count(*) filter (where (p.active_min_steps is null) <> (p.active_hint is null)),
    encode(sha256(convert_to(string_agg(
      to_json(array[p.puzzle_id, p.player_a, p.player_b, p.active_min_steps::text, p.active_hint])::text,
      E'\n' order by p.puzzle_id collate "C"
    ) filter (where p.active_min_steps is not null and p.active_hint is not null), 'UTF8')), 'hex')
  into puzzle_count, active_count, partial_count, active_digest
  from public.transfer_path_puzzles p;
  if puzzle_count <> 885 or active_count <> 212 or partial_count <> 0 then
    raise exception 'Liverpool correction requires the original 212 complete Active hints on 885 puzzles; found % complete, % partial, % puzzles',
      active_count, partial_count, puzzle_count;
  end if;
  if active_digest is distinct from (case when seasons_present = 0 then before_digest else after_digest end) then
    raise exception 'Active hints differ from the exact Liverpool correction state for % existing seasons', seasons_present;
  end if;
  if seasons_present = 2 then return; end if;

  insert into public.career_seasons (player_id, season, club, goals, assists, appearances, market_value, sort_order)
  values
    ('a0000001-0000-0000-0000-000000000026', '2025-2026', 'Liverpool', 8, 3, 55, 0, 12),
    ('a0000001-0000-0000-0000-000000000060', '2025-2026', 'Liverpool', 4, 1, 22, 0, 8);

  for desired in
    select * from (values
      ('tpa-207', 'Alisson', 'Sandro Tonali', 5, 'Four middle men at least. The first was at Liverpool with Alisson; the last was at Newcastle with Sandro Tonali.', 3, 'Two middle men at least. The first was at Liverpool with Alisson; the last was at Newcastle with Sandro Tonali.'),
      ('tpa-275', 'Darwin Núñez', 'Mikel Oyarzabal', 4, 'Three middle men at least. The first was at Liverpool with Darwin Núñez; the last was at Real Sociedad with Mikel Oyarzabal.', 3, 'Two middle men at least. The first was at Liverpool with Darwin Núñez; the last was at Real Sociedad with Mikel Oyarzabal.'),
      ('tpa-470', 'Rafael Leão', 'Virgil van Dijk', 6, '5 middle men at least. The first was at AC Milan with Rafael Leão; the last was at Southampton with Virgil van Dijk.', 3, 'Two middle men at least. The first was at AC Milan with Rafael Leão; the last was at Liverpool with Virgil van Dijk.'),
      ('tpa-846', 'Darwin Núñez', 'Rafael Leão', 6, '5 middle men at least. The first was at Liverpool with Darwin Núñez; the last was at AC Milan with Rafael Leão.', 4, 'Three middle men at least. The first was at Liverpool with Darwin Núñez; the last was at AC Milan with Rafael Leão.')
    ) as rows(puzzle_id, player_a, player_b, old_active_min_steps, old_active_hint, active_min_steps, active_hint)
  loop
    update public.transfer_path_puzzles p
    set active_min_steps = desired.active_min_steps, active_hint = desired.active_hint
    where p.puzzle_id = desired.puzzle_id and p.player_a = desired.player_a and p.player_b = desired.player_b
      and (p.active_min_steps, p.active_hint) is not distinct from (desired.old_active_min_steps, desired.old_active_hint);
    get diagnostics updated = row_count;
    if updated <> 1 then raise exception 'Active hint changed before the Liverpool correction for %', desired.puzzle_id; end if;
  end loop;
end
$migration$;
