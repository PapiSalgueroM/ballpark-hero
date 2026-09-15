-- READ ONLY. SELECT form of the rows a fix round should purge from ai_validation_cache.
-- Nothing here deletes. A fix round turns the final SELECT into a DELETE ... USING (same predicates)
-- only AFTER the deployed validators are corrected, otherwise the same wrong verdicts are re-cached.
-- Primary key of ai_validation_cache is (game, cache_key).

with w(y, nat) as (values (1970,'Brazil'),(1974,'West Germany'),(1978,'Argentina'),(1982,'Italy'),(1986,'Argentina'),(1990,'West Germany'),(1994,'Brazil'),(1998,'France'),(2002,'Brazil'),(2006,'Italy'),(2010,'Spain'),(2014,'Germany'),(2018,'France'),(2022,'Argentina'),(2026,'Spain')),
sq as (
  select x.world_cup_year y, x.player_name, x.position,
         trim(regexp_replace(lower(public.unaccent(x.player_name)), '[^a-z0-9]+', ' ', 'g')) fn
  from world_cup_players x join w on w.y = x.world_cup_year and w.nat = x.nationality
),
c as (
  select game, cache_key, verdict, created_at,
         split_part(cache_key,'|',1) p,
         trim(regexp_replace(lower(public.unaccent(split_part(cache_key,'|',1))), '[^a-z0-9]+', ' ', 'g')) pf,
         coalesce(substring(split_part(cache_key,'|',2) from '^(\d{4}) world cup winner$'),
                  substring(split_part(cache_key,'|',3) from '^(\d{4}) world cup winner$'))::int wcy
  from ai_validation_cache
),
candidates as (
  -- A. College Grid: every refusal. All 51 were written by the AI path (the data pass never writes a
  --    refusal), i.e. all were judged under the "(2000-2026)" prompt window. Minimum set is B.
  select 'A college refusal judged under 2000-2026 window' why, game, cache_key from c
  where game = 'college-grid' and (verdict->>'valid') = 'false'

  union all
  -- B. College Grid refusals a table contradicts (one record satisfies both labels, or the typed
  --    name is a spelling/nickname/surname of such a record). Subset of A; listed for the minimum purge.
  select 'B college refusal contradicted by tables', game, cache_key from c
  where game = 'college-grid' and cache_key in (
    'champ bailey|georgia|cornerback', 'deion sanders|florida state|cornerback', 'rashaan salaam|colorado|heisman winner',
    'bo jackson|running back|all-american', 'tommy frazier|quarterback|nebraska', 'zachariah branch|georgia|wide receiver',
    'zach branch|georgia|wide receiver', 'demond williams|washington|quarterback', 'dante moore|oregon|quarterback',
    'miller moss|louisville|quarterback', 'conor weigman|houston|quarterback', 'will howard|ohio state|national champion',
    'hunter|colorado|heisman winner', 'jkoby williams|big 12 conference|running back')

  union all
  -- C. Legacy name-guard refusals (Round 501 made this outcome uncacheable; old rows remain).
  select 'C cached name-guard refusal', game, cache_key from c
  where (verdict->>'valid') = 'false' and verdict->>'reason' = 'That name did not match a player we could verify.'

  union all
  -- D. Soccer Grid: records-pass refusals on a caps label that parseCriterion routes to the nationality matcher.
  select 'D soccer caps label misrouted to nationality', game, cache_key from c
  where game = 'soccer-grid' and (verdict->>'valid') = 'false'
    and verdict->>'reason' ~* 'does not satisfy "[^"]*(international caps|100\+? caps)'

  union all
  -- E. Soccer Grid: records-pass refusals on club labels the substring rule cannot reach
  --    ("Atlético Madrid" vs stored "Atlético de Madrid", "Man United" vs "Manchester United").
  select 'E soccer club alias gap refusal', game, cache_key from c
  where game = 'soccer-grid' and (verdict->>'valid') = 'false'
    and verdict->>'reason' ~* 'does not satisfy "played for (atlético madrid|atletico madrid|man united|man city)"'

  union all
  -- F. Soccer Grid: "YYYY World Cup Winner" refusals whose typed name is a near spelling of a member
  --    of that year's winning squad (trigram similarity >= 0.6).
  select 'F soccer WC refusal of a misspelt squad member', c.game, c.cache_key from c
  where c.game = 'soccer-grid' and (c.verdict->>'valid') = 'false' and c.wcy is not null
    and verdict->>'reason' ~* 'does not satisfy "[0-9]{4} world cup winner'
    and exists (select 1 from sq where sq.y = c.wcy
                and greatest(public.similarity(c.pf, sq.fn), public.word_similarity(c.pf, sq.fn),
                             public.similarity(replace(c.pf,' ',''), replace(sq.fn,' ',''))) >= 0.6)

  union all
  -- G. Soccer Grid refusals contradicted by soccer tables that no pattern above catches.
  select 'G soccer refusal contradicted by tables', game, cache_key from c
  where game = 'soccer-grid' and cache_key in (
    'julian alvarez|played for atletico madrid|forward (fwd)', 'sandro tonali|played for tottenham hotspur|midfielder (mid)',
    'jackson|played for chelsea|forward (fwd)', 'jackson|played for bayern munich|forward (fwd)',
    'acheampong|played for chelsea|defender (def)', 'nicholas jackson|played for bayern munich|forward (fwd)',
    'michael olise|played for bayern munich|midfielder (mid)', 'calhanoglu|played for inter milan|midfielder (mid)',
    'romario|played for barcelona|forward (fwd)', 'mariano|played for real madrid|forward (fwd)',
    'cristiano ronaldo|played for sporting cp|played in premier league')

  union all
  -- H. Soccer Grid confirmations on a WC label where the typed text is a fragment, not a whole token,
  --    of the squad name the substring check matched ("ram" -> Sergio Ramos).
  select 'H soccer WC confirmation from a name fragment', c.game, c.cache_key from c
  where c.game = 'soccer-grid' and (c.verdict->>'valid') = 'true' and c.wcy is not null
    and exists (select 1 from sq where sq.y = c.wcy and (sq.fn like '%' || c.pf || '%' or c.pf like '%' || sq.fn || '%'))
    and not exists (select 1 from sq where sq.y = c.wcy and (sq.fn like '%' || c.pf || '%' or c.pf like '%' || sq.fn || '%')
                    and (c.pf = sq.fn or c.pf = any(string_to_array(sq.fn, ' ')) or c.pf like '% %'))

  union all
  -- I. Confirmations of a nonexistent or wrong person, or a cross-person merge (listed by key).
  select 'I confirmation of wrong/nonexistent person', game, cache_key from c
  where (game = 'soccer-grid' and cache_key in (
          'qwerty uiop|won the pfa player of the year|scored in the milan derby',
          'romario|1994 world cup winner|defender (def)',
          'ruggeri|1986 world cup winner|defender (def)',
          'frank|1990 world cup winner|forward (fwd)'))
     or (game = 'college-grid' and cache_key = 'bernard|alabama|wide receiver')

  union all
  -- J. NFL grid (dormant since Round 406, the page no longer calls football-grid-validate): hard
  --    "does not satisfy Played for X" refusals where nfl_grid_players puts the named player on that team.
  select 'J nfl grid team refusal contradicted by nfl_grid_players', c.game, c.cache_key from c
  join nfl_grid_players g on g.name_norm = trim(regexp_replace(lower(public.unaccent(coalesce(c.verdict->>'fullName', c.p))), '[^a-z0-9]+', ' ', 'g'))
  where c.game = 'football-grid' and (c.verdict->>'valid') = 'false'
    and (case substring(c.verdict->>'reason' from 'does not satisfy "Played for ([^"]+)"')
          when 'Patriots' then 'NE' when 'Ravens' then 'BAL' when 'Eagles' then 'PHI' when 'Broncos' then 'DEN'
          when 'Falcons' then 'ATL' when 'Colts' then 'IND' when 'Raiders' then 'LV' when 'Packers' then 'GB'
          when 'Steelers' then 'PIT' when 'Commanders' then 'WAS' when 'Jaguars' then 'JAX' when 'Chiefs' then 'KC'
          when 'Saints' then 'NO' when 'Vikings' then 'MIN' when 'Giants' then 'NYG' when 'Cowboys' then 'DAL'
          when 'Bills' then 'BUF' when '49ers' then 'SF' when 'Bears' then 'CHI' when 'Seahawks' then 'SEA'
          when 'Dolphins' then 'MIA' when 'Cardinals' then 'ARI' when 'Chargers' then 'LAC' when 'Lions' then 'DET'
          when 'Jets' then 'NYJ' when 'Bengals' then 'CIN' when 'Titans' then 'TEN' when 'Panthers' then 'CAR'
          when 'Texans' then 'HOU' when 'Buccaneers' then 'TB' when 'Rams' then 'LA' when 'Browns' then 'CLE' end) = any(g.teams)
)
select why, game, cache_key from candidates order by why, game, cache_key;
