-- Replace three repeated matchups in the current scheduled poll batch.
-- Every row stays a two-player head to head with the short player prompt.

do $migration$
declare
  replacement record;
  matching_rows integer;
  updated_rows integer := 0;
  updated_this_row integer;
  duplicate_pairs integer;
begin
  for replacement in
    select *
    from (values
      ('dp-2026-09-21-1', 'Babe Ruth', 'Willie Mays', 'Ted Williams', 'Stan Musial'),
      ('dp-2026-09-28-2', 'Gretzky', 'Lemieux', 'Bobby Orr', 'Nicklas Lidstrom'),
      ('dp-2026-10-05-2', 'Ali', 'Tyson', 'Manny Pacquiao', 'Roberto Duran')
    ) as rows(poll_key, old_a, old_b, new_a, new_b)
  loop
    select count(*)
      into matching_rows
    from public.daily_polls p
    where p.poll_key = replacement.poll_key
      and p.option_a = replacement.old_a
      and p.option_b = replacement.old_b
      and p.option_c is null
      and p.option_d is null;

    if matching_rows <> 1 then
      raise exception 'Expected one exact repeated poll row for %, found %',
        replacement.poll_key, matching_rows;
    end if;

    update public.daily_polls p
    set question = 'Who ranks higher all time?',
        option_a = replacement.new_a,
        option_a_emoji = '',
        option_a_flag = '',
        option_b = replacement.new_b,
        option_b_emoji = '',
        option_b_flag = '',
        option_c = null,
        option_c_emoji = null,
        option_c_flag = null,
        option_d = null,
        option_d_emoji = null,
        option_d_flag = null
    where p.poll_key = replacement.poll_key
      and p.option_a = replacement.old_a
      and p.option_b = replacement.old_b;

    get diagnostics updated_this_row = row_count;
    updated_rows := updated_rows + updated_this_row;
  end loop;

  if updated_rows <> 3 then
    raise exception 'Expected to replace 3 repeated poll rows, updated %', updated_rows;
  end if;

  select count(*)
    into duplicate_pairs
  from (
    select
      least(lower(trim(option_a)), lower(trim(option_b))) as first_side,
      greatest(lower(trim(option_a)), lower(trim(option_b))) as second_side
    from public.daily_polls
    where poll_date between date '2026-09-07' and date '2026-10-05'
    group by 1, 2
    having count(*) > 1
  ) duplicates;

  if duplicate_pairs <> 0 then
    raise exception 'Scheduled poll batch still contains % repeated matchup(s)', duplicate_pairs;
  end if;
end
$migration$;
