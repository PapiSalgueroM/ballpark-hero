-- Verified 2025-26 memberships in transferPathGraph.ts shorten only these paths.
-- Publish the graph before updating the stored hints. Existing puzzle order and career statistics stay intact.
do $migration$
declare
  desired record;
  stored_steps integer;
  stored_hint text;
  initial_state text;
  entry_state text;
begin
  for desired in
    select * from (values
      ('tpa-134', 'Edinson Cavani', 'Trent Alexander-Arnold', 'classic', 3, 'Two middle men at least. The first was at PSG with Edinson Cavani; the last was at Liverpool with Trent Alexander-Arnold.', 2, 'One middle man does it. He was at PSG with Edinson Cavani and at Real Madrid with Trent Alexander-Arnold.'),
      ('tpa-134', 'Edinson Cavani', 'Trent Alexander-Arnold', 'europe', 3, 'Two middle men at least. The first was at PSG with Edinson Cavani; the last was at Liverpool with Trent Alexander-Arnold.', 2, 'One middle man does it. He was at PSG with Edinson Cavani and at Real Madrid with Trent Alexander-Arnold.'),
      ('tpa-213', 'Estêvão', 'Trent Alexander-Arnold', 'classic', 5, 'Four middle men at least. The first was at Palmeiras with Estêvão; the last was at Liverpool with Trent Alexander-Arnold.', 3, 'Two middle men at least. The first was at Palmeiras with Estêvão; the last was at Real Madrid with Trent Alexander-Arnold.'),
      ('tpa-550', 'Kylian Mbappé', 'Viktor Gyökeres', 'classic', 4, 'Three middle men at least. The first was at PSG with Kylian Mbappé; the last was at Brighton with Viktor Gyökeres.', 3, 'Two middle men at least. The first was at Real Madrid with Kylian Mbappé; the last was at Brighton with Viktor Gyökeres.'),
      ('tpa-550', 'Kylian Mbappé', 'Viktor Gyökeres', 'europe', 4, 'Three middle men at least. The first was at PSG with Kylian Mbappé; the last was at Brighton with Viktor Gyökeres.', 3, 'Two middle men at least. The first was at Real Madrid with Kylian Mbappé; the last was at Brighton with Viktor Gyökeres.'),
      ('tpa-912', 'Kobbie Mainoo', 'Lamine Yamal', 'active', 4, 'Three middle men at least. The first was at Manchester United with Kobbie Mainoo; the last was at Barcelona with Lamine Yamal.', 3, 'Two middle men at least. The first was at Manchester United with Kobbie Mainoo; the last was at Barcelona with Lamine Yamal.'),
      ('tpa-912', 'Kobbie Mainoo', 'Lamine Yamal', 'classic', 4, 'Three middle men at least. The first was at Manchester United with Kobbie Mainoo; the last was at Barcelona with Lamine Yamal.', 3, 'Two middle men at least. The first was at Manchester United with Kobbie Mainoo; the last was at Barcelona with Lamine Yamal.'),
      ('tpa-912', 'Kobbie Mainoo', 'Lamine Yamal', 'europe', 4, 'Three middle men at least. The first was at Manchester United with Kobbie Mainoo; the last was at Barcelona with Lamine Yamal.', 3, 'Two middle men at least. The first was at Manchester United with Kobbie Mainoo; the last was at Barcelona with Lamine Yamal.')
    ) as entries(puzzle_id, player_a, player_b, rule, old_steps, old_hint, new_steps, new_hint)
    order by puzzle_id, rule
  loop
    select case desired.rule when 'classic' then p.min_steps when 'europe' then p.europe_min_steps else p.active_min_steps end,
           case desired.rule when 'classic' then p.hint when 'europe' then p.europe_hint else p.active_hint end
      into strict stored_steps, stored_hint
    from public.transfer_path_puzzles p
    where p.puzzle_id = desired.puzzle_id and p.player_a = desired.player_a and p.player_b = desired.player_b
    for update;

    if (stored_steps, stored_hint) is not distinct from (desired.old_steps, desired.old_hint) then
      entry_state := 'old';
    elsif (stored_steps, stored_hint) is not distinct from (desired.new_steps, desired.new_hint) then
      entry_state := 'new';
    else
      raise exception 'Transfer Path % under % changed before the teammate correction', desired.puzzle_id, desired.rule;
    end if;

    if initial_state is null then
      initial_state := entry_state;
    elsif initial_state <> entry_state then
      raise exception 'Transfer Path teammate correction is only partially applied';
    end if;

    if entry_state = 'old' then
      if desired.rule = 'classic' then
        update public.transfer_path_puzzles set min_steps = desired.new_steps, hint = desired.new_hint
        where puzzle_id = desired.puzzle_id;
      elsif desired.rule = 'europe' then
        update public.transfer_path_puzzles set europe_min_steps = desired.new_steps, europe_hint = desired.new_hint
        where puzzle_id = desired.puzzle_id;
      else
        update public.transfer_path_puzzles set active_min_steps = desired.new_steps, active_hint = desired.new_hint
        where puzzle_id = desired.puzzle_id;
      end if;
    end if;
  end loop;
end
$migration$;
