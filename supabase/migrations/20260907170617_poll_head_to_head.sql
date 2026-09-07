-- Polls are now one named player or team against another, with two choices.
-- This updates the remaining scheduled batch and fails if the batch shape has
-- drifted, so a partial edit cannot quietly land.

do $$
declare
  replaced_count integer;
  normalized_count integer;
begin
  with replacements(poll_key, option_a, option_b) as (
    values
      ('dp-2026-09-09-2', 'Federer', 'Djokovic'),
      ('dp-2026-09-12-1', 'Hamilton', 'Verstappen'),
      ('dp-2026-09-20-2', 'Messi', 'Ronaldo'),
      ('dp-2026-09-21-1', 'Babe Ruth', 'Willie Mays'),
      ('dp-2026-09-27-2', 'Real Madrid', 'Barcelona'),
      ('dp-2026-09-28-2', 'Gretzky', 'Lemieux'),
      ('dp-2026-10-03-1', 'Packers', 'Bears'),
      ('dp-2026-10-05-2', 'Ali', 'Tyson')
  )
  update public.daily_polls as poll
  set option_a = replacements.option_a,
      option_b = replacements.option_b
  from replacements
  where poll.poll_key = replacements.poll_key;

  get diagnostics replaced_count = row_count;
  if replaced_count <> 8 then
    raise exception 'Expected 8 nonparticipant poll matchups, updated %', replaced_count;
  end if;

  update public.daily_polls
  set question = case
        when poll_key = any (array[
          'dp-2026-09-08-1',
          'dp-2026-09-10-2',
          'dp-2026-09-12-2',
          'dp-2026-09-13-2',
          'dp-2026-09-16-1',
          'dp-2026-09-23-1',
          'dp-2026-09-24-1',
          'dp-2026-09-25-1',
          'dp-2026-09-27-2',
          'dp-2026-10-03-1'
        ])
          then 'Who you got?'
        else 'Who ranks higher all time?'
      end,
      option_c = null,
      option_c_emoji = null,
      option_c_flag = null,
      option_d = null,
      option_d_emoji = null,
      option_d_flag = null
  where poll_date between date '2026-09-07' and date '2026-10-05';

  get diagnostics normalized_count = row_count;
  if normalized_count <> 58 then
    raise exception 'Expected 58 scheduled poll rows, updated %', normalized_count;
  end if;
end
$$;
