-- Round 379: seed the per-attribute cache from verdicts we already paid for.
--
-- The connect-4 validator cached one row per PAIR of attributes
-- (player|rowAttribute|columnAttribute). That is the narrowest possible unit:
-- the 16 soccer boards hold 507 distinct cells but only 78 distinct attributes,
-- so a pair verdict is worth exactly one cell and is thrown away for every
-- other cell that asks about the same player.
--
-- Caching the answer to a SINGLE attribute makes each answer reusable.
-- Measured on the live cache before writing this: the 105 true verdicts already
-- stored decompose into 178 distinct player-and-attribute facts, and those
-- facts between them answer 590 cells rather than 105. Same AI spend, 5.6x the
-- coverage, and every board added later reuses them for nothing.
--
-- This matters because the quota is a DAILY one. Round 378 measured the
-- failure: 42 percent of guesses refused during a normal burst, then 14 of 14
-- once the day was spent, with a retry three seconds later recovering none. Two
-- players had already reported the game as completely unplayable.
--
-- ONLY THE TRUE VERDICTS CAN BE DECOMPOSED, and that limit is real rather than
-- an oversight: "valid: false" means the player failed AT LEAST ONE of the two
-- attributes and never says which, so nothing can be concluded about either
-- one. The 39 false rows are left alone. A true verdict is unambiguous: both
-- attributes held.
--
-- The key shape is attr|<player>|<attribute>, written ALONGSIDE the existing
-- pair rows rather than replacing them, so the 144 rows already paid for keep
-- answering until they age out. simValidatorCache section 3 checks that every
-- backfilled fact traces to a true pair verdict, so nothing here can invent one.
insert into public.ai_validation_cache (game, cache_key, verdict)
select
  c.game,
  'attr|' || c.player || '|' || c.attr,
  jsonb_build_object('match', true, 'source', 'backfill-from-pair-verdict')
from (
  select game, split_part(cache_key,'|',1) as player, split_part(cache_key,'|',2) as attr
  from public.ai_validation_cache
  where game like '%connect4' and (verdict->>'valid')::boolean is true
    and split_part(cache_key,'|',1) <> '' and split_part(cache_key,'|',2) <> ''
  union
  select game, split_part(cache_key,'|',1), split_part(cache_key,'|',3)
  from public.ai_validation_cache
  where game like '%connect4' and (verdict->>'valid')::boolean is true
    and split_part(cache_key,'|',1) <> '' and split_part(cache_key,'|',3) <> ''
) c
on conflict (game, cache_key) do nothing;
