-- Round 386, applied 2026-09-01 through the Supabase MCP as
-- round_386_folded_player_name_search. Kept here so the schema is readable
-- from the repo; the deployed database is the source of truth.
--
-- Accent-insensitive player search at the database. A plain ilike on
-- player_name misses "Kylian Mbappé" for "mbappe", so every soccer
-- autocomplete leaned on a 1,000 row prominence pool as its fallback and still
-- returned zero rows for "gundogan", "rudiger" or "yaya toure". unaccent and
-- pg_trgm are installed in public; unaccent is STABLE, so a stored generated
-- column needs an IMMUTABLE wrapper that pins the dictionary.

create or replace function public.fold_name(raw text)
returns text
language sql
immutable
parallel safe
strict
set search_path = public
as $$
  select lower(public.unaccent('public.unaccent'::regdictionary, btrim(raw)));
$$;

alter table public.player_market_values
  add column if not exists name_folded text
  generated always as (public.fold_name(player_name)) stored;

create index if not exists idx_player_market_values_name_folded_trgm
  on public.player_market_values using gin (name_folded public.gin_trgm_ops);

comment on column public.player_market_values.name_folded is
  'Round 386: lower(unaccent(player_name)). The column every soccer autocomplete searches, so an unaccented query finds an accented name.';

-- Rollback, in this order. The app falls back to the raw ilike leg on its own
-- once foldedNameColumn is removed from SOCCER_MARKET_VALUE_SOURCE.
--   drop index if exists public.idx_player_market_values_name_folded_trgm;
--   alter table public.player_market_values drop column if exists name_folded;
--   drop function if exists public.fold_name(text);
