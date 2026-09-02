-- Round 397: verified cache coverage for every classic-8 cell.
--
-- Every row below has two-source evidence in
-- docs/research/connect4-classic8-verified.json. The migration writes only
-- verified true verdicts. It never infers a false verdict from missing data.
--
-- The pair rows matter even though the validator can combine attribute facts:
-- it reads a pair first, so these upserts replace any stale false pair for the
-- exact verified answer. The attribute rows then make each fact reusable on
-- other boards. public.fold_name is the same lower, trim and accent folding
-- used by the autocomplete and produces the deployed validator's key shape.
with verified_cells (player_name, row_attribute, column_attribute) as (
  values
    ('Virgil van Dijk', 'Active Player (as of 2025-26)', 'Played for Liverpool'),
    ('Rodri', 'Active Player (as of 2025-26)', 'Played for Man City'),
    ('Khvicha Kvaratskhelia', 'Active Player (as of 2025-26)', 'Played for PSG'),
    ('Jude Bellingham', 'Active Player (as of 2025-26)', 'Played for Real Madrid'),
    ('Lamine Yamal', 'Active Player (as of 2025-26)', 'Played for Barcelona'),
    ('Moisés Caicedo', 'Active Player (as of 2025-26)', 'Played for Chelsea'),
    ('Cristian Romero', 'Active Player (as of 2025-26)', 'Played for Tottenham'),
    ('Sadio Mané', 'Market Value Has Exceeded €100M', 'Played for Liverpool'),
    ('Kevin De Bruyne', 'Market Value Has Exceeded €100M', 'Played for Man City'),
    ('Neymar', 'Market Value Has Exceeded €100M', 'Played for PSG'),
    ('Vinicius Junior', 'Market Value Has Exceeded €100M', 'Played for Real Madrid'),
    ('Lionel Messi', 'Market Value Has Exceeded €100M', 'Played for Barcelona'),
    ('Cole Palmer', 'Market Value Has Exceeded €100M', 'Played for Chelsea'),
    ('Harry Kane', 'Market Value Has Exceeded €100M', 'Played for Tottenham'),
    ('Mohamed Salah', 'Has/Had a 90+ Rated Player Card', 'Played for Liverpool'),
    ('Erling Haaland', 'Has/Had a 90+ Rated Player Card', 'Played for Man City'),
    ('Ousmane Dembélé', 'Has/Had a 90+ Rated Player Card', 'Played for PSG'),
    ('Kylian Mbappé', 'Has/Had a 90+ Rated Player Card', 'Played for Real Madrid'),
    ('Robert Lewandowski', 'Has/Had a 90+ Rated Player Card', 'Played for Barcelona'),
    ('N''Golo Kanté', 'Has/Had a 90+ Rated Player Card', 'Played for Chelsea'),
    ('Luka Modrić', 'Has/Had a 90+ Rated Player Card', 'Played for Tottenham'),
    ('James Milner', 'Won the Premier League', 'Played for Liverpool'),
    ('Sergio Agüero', 'Won the Premier League', 'Played for Man City'),
    ('David Beckham', 'Won the Premier League', 'Played for PSG'),
    ('Eden Hazard', 'Won the Premier League', 'Played for Real Madrid'),
    ('Thierry Henry', 'Won the Premier League', 'Played for Barcelona'),
    ('Frank Lampard', 'Won the Premier League', 'Played for Chelsea'),
    ('Sol Campbell', 'Won the Premier League', 'Played for Tottenham'),
    ('Steven Gerrard', 'Scored in a Champions League Final', 'Played for Liverpool'),
    ('İlkay Gündoğan', 'Scored in a Champions League Final', 'Played for Man City'),
    ('Sergio Ramos', 'Scored in a Champions League Final', 'Played for PSG'),
    ('Cristiano Ronaldo', 'Scored in a Champions League Final', 'Played for Real Madrid'),
    ('Samuel Eto''o', 'Scored in a Champions League Final', 'Played for Barcelona'),
    ('Didier Drogba', 'Scored in a Champions League Final', 'Played for Chelsea'),
    ('Gareth Bale', 'Scored in a Champions League Final', 'Played for Tottenham'),
    ('Darwin Núñez', 'Cost €50M+ Transfer Fee', 'Played for Liverpool'),
    ('Rúben Dias', 'Cost €50M+ Transfer Fee', 'Played for Man City'),
    ('Edinson Cavani', 'Cost €50M+ Transfer Fee', 'Played for PSG'),
    ('Aurélien Tchouaméni', 'Cost €50M+ Transfer Fee', 'Played for Real Madrid'),
    ('Antoine Griezmann', 'Cost €50M+ Transfer Fee', 'Played for Barcelona'),
    ('Enzo Fernández', 'Cost €50M+ Transfer Fee', 'Played for Chelsea'),
    ('Tanguy Ndombélé', 'Cost €50M+ Transfer Fee', 'Played for Tottenham')
),
verified_rows (kind, cache_key, full_name) as (
  select
    'pair',
    public.fold_name(player_name || '|' || row_attribute || '|' || column_attribute),
    player_name
  from verified_cells
  union all
  select
    'attr',
    'attr|' || public.fold_name(player_name) || '|' || public.fold_name(row_attribute),
    player_name
  from verified_cells
  union
  select
    'attr',
    'attr|' || public.fold_name(player_name) || '|' || public.fold_name(column_attribute),
    player_name
  from verified_cells
)
insert into public.ai_validation_cache (game, cache_key, verdict)
select
  'football-connect4',
  cache_key,
  case kind
    when 'pair' then jsonb_build_object(
      'valid', true,
      'matchesRow', true,
      'matchesColumn', true,
      'fullName', full_name,
      'reason', 'Both attributes were verified from two independent sources.',
      'source', 'round-397-two-source-verified'
    )
    else jsonb_build_object(
      'match', true,
      'fullName', full_name,
      'source', 'round-397-two-source-verified'
    )
  end
from verified_rows
on conflict (game, cache_key) do update
set verdict = excluded.verdict;
