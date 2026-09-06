-- Round 486, the other half: the lookup stops being accent blind.
-- APPLIED 2026-09-06.
--
-- nba-chain-validate resolves a typed name by folding accents in JS, but it
-- FETCHED with .ilike("player_name", '%<last typed word>%') against the raw
-- column. So "Jokic" never matched "JokiÄ‡" and, once the encoding was repaired,
-- would still never have matched "Jokić". Repairing the names alone changes
-- nothing for the player: both halves are needed and both shipped together.
--
-- The fold mirrors the function's own norm(): lowercase, accents stripped,
-- anything that is not a letter or digit flattened to a space, runs of space
-- collapsed, trimmed. It has to match, or the column is a second opinion
-- rather than an index.
--
-- A NOTE ON THE FOLD, because the fence caught a real disagreement here.
-- Postgres unaccent handles letters that have no canonical decomposition
-- (Turkish dotless i, German sharp s, Polish barred l, Scandinavian slashed o);
-- the function's JS did not, so "Ömer Aşık" folded to "omer asik" in the column
-- and "omer as k" in the function, and no typed spelling could have reached
-- him. The DATABASE was right and the function was corrected to match, with an
-- explicit transliteration table. simNbaChainNames section 2 compares the two
-- folds row by row so they cannot drift apart again.
--
-- This table is a static scrape and nothing in the app writes to it, so the
-- column is backfilled rather than generated (unaccent is STABLE, not
-- IMMUTABLE, so a GENERATED column cannot call it). The fence is what catches a
-- re-import that forgets to refill it.
alter table public.nba_player_team_stints
  add column if not exists name_folded text;

update public.nba_player_team_stints
   set name_folded = btrim(regexp_replace(
         regexp_replace(lower(unaccent(player_name)), '[^a-z0-9 ]+', ' ', 'g'),
         '\s+', ' ', 'g'));

create index if not exists idx_nba_stints_name_folded
  on public.nba_player_team_stints (name_folded);
