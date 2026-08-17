# Past eras: the complete build plan

Written 2026-08-16 by the session that removed the future eras (Round 139) and built the
league waves (140, 142, 143), so every integration point below was mapped against the real
code that day. This is owner feedback item 3, "the big one". A fresh session should be able
to build phase one from this file alone without re-deriving anything.

The ask, his words: "u could take control of diffrent teams in diffrent eras meaning current
or the pass."

## Why this is buildable honestly

`player_market_values` in Supabase holds real Transfermarkt history: measured 2026-08-16,
about 6,000 real named players a year, EVERY year 2004 through 2026, over 1,000 distinct
clubs a year. A 2010 probe of all 40 clubs in the 2010-11 Premier League and La Liga found
every single club present, most with 15 to 29 real players (Barcelona 29 with Messi at 108M
USD, Real Madrid 21 with Ronaldo at 97M, Arsenal 36). The thin tails (Blackpool 6, Levante
10, Hércules 11) follow the CM_PARTIAL precedent that already ships.

## Phase one scope

ONE era, **2010-11**, TWO leagues, **Premier League and La Liga**. Marquee appeal: prime
Messi Barcelona, Mourinho's Madrid, Ferguson's United. Do not attempt all 22 years or all
leagues in one round. The architecture below generalises; the data work is per era.

### Verified 2010-11 memberships (cross-check against the table before baking)

Premier League: Arsenal, Aston Villa, Birmingham City, Blackburn Rovers, Blackpool, Bolton
Wanderers, Chelsea, Everton, Fulham, Liverpool, Manchester City, Manchester United,
Newcastle, Stoke City, Sunderland, Tottenham, West Brom, West Ham, Wigan Athletic, Wolves.

La Liga: Almería, Athletic Club, Atlético Madrid, Barcelona, Deportivo La Coruña, Espanyol,
Getafe, Hércules, Levante, Málaga, Mallorca, Osasuna, Racing Santander, Real Madrid, Real
Sociedad, Sevilla, Sporting Gijón, Valencia, Villarreal, Zaragoza.

Second source: the market values table itself. A club's 2010 rows existing at these names IS
corroboration of top-flight membership (the import was value-ranked, and these squads are
dense). DB name variants confirmed in the 2010 probe: 'FC Barcelona', 'Real Madrid',
'Manchester United', 'Chelsea FC', 'Arsenal FC', 'Liverpool FC', 'Manchester City',
'Tottenham Hotspur', 'Valencia CF', 'Sevilla FC', 'Atlético de Madrid', 'Villarreal CF',
'Everton FC', 'Aston Villa', 'Newcastle United', 'Wigan Athletic', 'Blackpool FC',
'Stoke City', 'Wolverhampton Wanderers', 'West Bromwich Albion', 'Bolton Wanderers',
'Blackburn Rovers', 'Birmingham City', 'Fulham FC', 'Sunderland AFC', 'West Ham United',
'Hércules CF', 'UD Almería', 'Real Zaragoza', 'RCD Mallorca', 'Sporting Gijón',
'Racing Santander', 'Levante UD', 'Real Sociedad', 'Getafe CF', 'RCD Espanyol',
'CA Osasuna', 'Deportivo de La Coruña', 'Athletic Bilbao', 'Málaga CF'.

## The data bake

Follow the Round 140/142/143 supplement recipe exactly (see PROJECT-STATE item 6 for how,
and /tmp is gone so re-dump):

1. Dump via Supabase MCP, one call per league:
   `SELECT json_agg(json_build_array(player_name, position, age, market_value_usd)) FROM
   (SELECT DISTINCT ON (player_name) ... FROM player_market_values WHERE year = 2010 AND
   club IN (...) ORDER BY player_name) t;`
   NOTE: use `player_market_values` (the base table), not the dedup view, and year = 2010
   exactly. No 2009 fallback in phase one; thin is honest.
2. Bake into a NEW file `src/data/clubManagerEra2010.ts`, same `BakedPlayer` shape
   ({n,p,a,v,r}), same `ratingOf`/`gbpM` curves as `bakeClubManagerRosters.mjs`, plus
   `ERA2010_META` (year, players, clubs) and `ERA2010_PARTIAL` (clubs under 8 real players).
   Do NOT touch `clubManagerRosters.ts`: the 2026 world and the 2010 world are separate
   files, separate name-spaces, and a player may legitimately appear in both (2010 Messi and
   2026 Messi are different rows of the same man; the era decides which file is read, so the
   engine's one-name-one-player rule holds WITHIN each era).

## Engine integration points (all mapped 2026-08-16)

- `clubManagerEras.ts`: add the 2010 era to `CM_ERAS` (id 'era2010', startYear 2010,
  honesty line citing real data with measured real-player share). Rewrite simEras section 7:
  `startYear < CM_BASE_YEAR` stops being an automatic failure ONLY for eras whose id is in a
  new `HISTORIC_ERAS` set backed by a bake file; the no-future rule stays absolute.
- **Era league defs**: a new `ERA_LEAGUES: Record<string, LeagueDef[]>` keyed by era id,
  holding the two 2010 league defs (ids 'premier2010', 'laliga2010', euro true, EURO_SLOTS
  for 2010: England top 4 CL, Spain top 4 CL, EL 5th, no Conference League in 2010, so
  uecl: 0 and the ladder skips that band when uecl is 0. Small leagueDemand tweak: skip the
  uecl band when slots.uecl is falsy).
- `startCareer(clubName, eraId)`: when the era is historic, resolve the league from
  ERA_LEAGUES, build the squad from the era bake, and generate strengths from era-roster XI
  averages (mirror `bakedXIAvg` against the era file).
- `leagueOf(clubName)`: extend to consult ERA_LEAGUES AFTER REAL_LEAGUES for clubs that
  exist only in an era (Blackpool, Hércules...). For dual-era clubs (Barcelona), leagueOf
  returns the 2026 def, whose `.clubs` list is WRONG for a 2010 save. The three in-season
  consumers of `.clubs` that matter and must read `career.leagueClubs` instead when the
  save is historic: `nearestRival` (thread leagueClubs through `buildBoardObjectives`),
  `generateHeadlines`'s buyer pools, and the suitor list in `finishSeason`. The weekly news
  (Round 141) already reads the table, so it is era-correct for free.
- `marketBase` / `buildMarket`: for a historic save, the market is the era file's pool
  (both era leagues), full stop. Key the cache by era id, not just yearsOn.
- **Ageing forward**: a 2010 save that plays deep uses the SAME curve as today, anchored on
  the 2010 file, with generated fillers labelled exactly like the future projection did.
  Phase one does NOT try to hand the save real 2011 data as seasons pass; the sim diverges
  from history the moment the first match kicks off, and that is what a sim is.
- UI: the era picker already maps CM_ERAS generically. The tile copy must say REAL DATA
  with the measured share, and the picker footnote (ClubManager.tsx around line 290)
  gets rewritten since "no past eras yet" stops being true.

## The harness, non negotiable

`simEra2010.mjs`, measuring outcomes:
1. Year-zero identity: every player in a fresh 2010 Barcelona save exists in the era file
   with identical name, age, rating; zero `generated` on day one at dense clubs.
2. Era isolation, both directions: no 2026-only player reachable in a 2010 market (Bellingham
   must not exist), and vice versa. Strongest signal: intersect the two files' name sets and
   assert every shared name differs in age by roughly the year gap.
3. Ladder sanity over all 40 era clubs (reuse simBoardObjectives helpers): 2010 Barcelona
   told to win it, Blackpool told to stay up, and NO Conference League band anywhere in 2010.
4. A full season plays to completion at a club from each league, table plausible (Barcelona
   or Madrid top four, Blackpool bottom half) over N seeds, margins from measured headroom.
5. simNoInventedQuotes gains the 2010 name set in its roster harvest.

## Traps already hit once, do not hit them twice

- Diacritics: fold before word-boundary checks (the Jérémy Doku false positive).
- Same-name different-person collisions are fine ACROSS eras (separate files), fatal WITHIN
  one (engine is name-keyed).
- The gate direction in generateIncomingBids style rolls: the threshold IS the probability.
- Wikipedia tables strip in markdown fetches; use prose pages, official league sites, or
  season previews, and corroborate with the table.
