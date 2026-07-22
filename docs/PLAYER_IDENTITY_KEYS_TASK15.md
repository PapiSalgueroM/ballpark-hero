# Task #15 — Player identity-key (`person_key`) migration — CLOSED (2026-07-22)

Owner of record: overnight fixes+cleanup batch (2026-07-22). This doc is the durable
record for task #15 (the merged-player-identity cleanup) and the human-review backlog
of remaining collision candidates. Everything below was verified against row evidence
or a primary source, never memory.

## 1. What shipped / verified this session

### Schema (verified present)
`person_key text NULL` exists on all 16 player-history tables:
`bref_nba_player_seasons`, `href_nhl_player_seasons`, `mlb_batting_stats`,
`mlb_pitching_stats`, `nba_player_stats`, `nba_player_team_stints`, `nfl_defense_stats`,
`nfl_player_team_stints`, `nfl_qb_passing_leaders`, `nfl_rb_stats`, `nfl_wr_te_stats`,
`nhl_player_stats`, `player_market_values`, `soccer_player_career_paths`,
`soccer_player_careers_expanded`, `soccer_player_club_stints`.

Backups (full copies) exist for the two mutated tables:
`nba_player_stats_bak_20260722`, `nfl_player_team_stints_bak_20260722`.

Only the split identities are keyed today; every other row keeps `person_key = NULL`
(distinct by design). Keyed-row counts: `nba_player_stats` = 3, `nfl_player_team_stints` = 17.
All other tables = 0 keyed (column present, population deferred to per-case review below).

### Unique index (added this session)
`ux_nba_player_stats_name_personkey` — `UNIQUE (player_name, person_key)` on
`nba_player_stats`. Collision pre-check passed (0 duplicate non-null-key rows). NULLS
DISTINCT, so the 3,224 unkeyed rows are unconstrained; the index only prevents two
distinct career rows from re-merging under one `(name, key)`.

Deliberately NOT added to the stint tables (`nfl_player_team_stints`,
`nba_player_team_stints`, `soccer_player_club_stints`): those are one-row-per-stint, so a
single `person_key` legitimately spans many rows (e.g. `antonio-brown-2010` = PIT+NE+TB).
`(player_name, person_key)` is intentionally non-unique there — the collision pre-check
confirmed this (ricky-williams-1999 = 5 rows, joe-thomas-2014 = 4, etc.), which is why
the guard exists.

### The 4 resolved splits (row-verified; college is the primary-source-grade tell)
| Player | Table | person_key(s) | Evidence |
|---|---|---|---|
| Tim Hardaway | nba_player_stats | Sr. `hardati01` (1989–2003, GSW/MIA/DAL/DEN/IND); Jr. `hardati02` (2013–26) added as its own row (was missing, not merged); Penny = `hardaan01` | Basketball-Reference IDs; distinct name strings ("Tim Hardaway" vs "Tim Hardaway Jr.") |
| Ricky Williams | nfl_player_team_stints | `ricky-williams-1999` (Texas; NO/MIA/BLT) vs `ricky-williams-2002` (Texas Tech; IND) | different college + different debut season (1999 vs 2002) |
| Antonio Brown | nfl_player_team_stints | `antonio-brown-2010` (Central Michigan; PIT/NE/TB) vs `antonio-brown-2003` (West Virginia; BUF/WAS) | different college + debut (2010 vs 2003) |
| Joe Thomas | nfl_player_team_stints | `joe-thomas-2007` (Wisconsin, HOF LT, Cleveland only — CLE+CLV variants) vs `joe-thomas-2014` (South Carolina State, LB; GB/DAL/BAL/CHI) | different college + debut (2007 vs 2014). "Third Joe Thomas" hypothesis refuted — only two identities exist. |

### Validation-cache purge
`ai_validation_cache` (170 rows) holds no verdict for any corrected player.
Case-insensitive search for `tim hardaway`, `ricky williams`, `antonio brown`,
`joe thomas` returned 0 rows (only unrelated `caleb williams` / `nico williams` /
`ricky pearsall` exist, left untouched). Purge was a verified no-op — no stale merged
verdict is being served.

## 2. Human-review backlog — unverified collision candidates

Detection method (reproducible, evidence-based): in the per-stint tables, a single real
person has one contiguous, plausibly-bounded career. Group by `player_name` and flag any
name whose min-first-season → max-last-season **span exceeds the sport's all-time
longevity record** — an impossible span means two people are merged under one name. This
is the same class of signal (different college / different debut era) that surfaced the 4
resolved splits. The lists below are a **superset**: they include a handful of genuine
ultra-long single careers (marked *legit*) that human review will clear. Resolve each by
assigning a stable `person_key` per identity and, in the stint tables, correcting the
per-row team/college assignment.

### NFL — 61 candidates (`nfl_player_team_stints`, span ≥ 20 seasons; NFL record ≈ 26)
Highest confidence = span ≥ 22 with min-season ≤ 2003 and max-season ≥ 2024 (an
early-2000s player merged with a current same-named player). Clear examples: **Mario
Edwards** (DL, 2002–2025, 9 teams = Sr. DB + Jr. DL), **Jon Runyan** (2002–2025 = Sr. T +
Jr. G), **Zach Thomas** (2002–2025 = HOF MIA LB + recent namesake), **Orlando Brown**
(2003–2025 = Sr. + Jr.), **Chris Smith**, **Marcus Williams**, **Mike Williams**, **Chris
Jones**, **Andre Carter**, **Charles Grant**, **Kris Jenkins**, **Michael Pittman**,
**Jason Taylor**, **Kenny Clark**, **Josh Norman**, **Marvin Jones**, **Patrick
Surtain**, **Antoine Winfield**, **Asante Samuel**, **Jason Peters**, **D.J. Williams**,
**Eddie Jackson**, **Joey Porter**, **Tyrone Wheatley**, plus generic-name groups (Aaron
Smith, Chris Edmonds, Eric Johnson, James Williams, Josh Williams, Justin Watson, Mike
Brown, Mike Green, Nick Harris, Aaron Beasley, Anthony McFarland, Brian Allen, James
Lynch, Jeff Smith, Leon Johnson, Ron Stone, Sam Williams, Tony Brown, John Hall, Josh
Harris, Kwamie Lassiter, Cedrick Wilson, Chris Cooper, Chris Jackson, Derrick Deese,
Brandon Jones, Bryan Cox, Jason Moore, Joe Walker, Matt Jones, Michael Young, Michael
Wiley, Sean Ryan).
Probable *legit* single careers (false positives to clear, not merges): **Tom Brady**
(2002–2022), **Aaron Rodgers** (2005–2025), **Philip Rivers** (2004–2025 — verify the
2025 stint; Rivers retired after 2020).

### NBA — 16 near-certain (`nba_player_team_stints`, span ≥ 23; NBA record = 22 seasons)
All impossible spans → merged:
George King (1951–2021, span 70), Nate Williams (1971–2024, 53), Johnny Davis
(1976–2024, 48), Greg Smith (1968–2015, 47), Luke Jackson (1964–2007, 43), **Mike
Dunleavy** (1976–2016, 40 = Sr. + Jr.), **Gerald Henderson** (1979–2016, 37 = Sr. + Jr.),
Jim Paxson (1956–1989, 33 = uncle + nephew), Jeff Taylor (1982–2014, 32), Bobby Jones
(1976–2007, 31), Reggie Williams (1987–2016, 29 = two players), Walker Russell (1982–2011,
29 = Sr. + Jr.), Brandon Williams (1997–2024, 27), Freddie Lewis (1949–1976, 27),
**Patrick Ewing** (1985–2010, 25 = Sr. + Jr.), Larry Johnson (1977–2000, 23).
Span 20–22 tier (mixed; review): Kevin Willis, Chris Smith, Eddie Johnson, Mark Jones —
all *review*; while LeBron James (2003–2024), Vince Carter (1998–2019), Dirk Nowitzki
(1998–2018), Joe Johnson (2001–2021), Kevin Garnett (1995–2015), Robert Parish
(1976–1996) are *legit* long careers (false positives).

## 3. Why `(name, person_key)`, not `(name, nationality)`

`person_key` is a stable per-person identifier (Basketball-/Pro-Football-Reference-style
ID for NBA, or `name-debutyear` for NFL). It uniquely resolves same-name players even
when they share every soft attribute. `(name, nationality)` fails exactly where it matters
most: same-nation namesakes — two American "Mario Edwards", two American "Reggie
Williams", Ewing/Dunleavy/Henderson Sr. vs Jr. — are all one nationality, so nationality
cannot separate them. Nationality is also absent from every US-sport table here (NFL/NBA
carry `college`/`debut_season`, not nationality; only the soccer tables have nationality).
Human review should therefore assign a `person_key` per distinct human and never rely on
nationality as the disambiguator.

## 4. Status: CLOSED
Migration state persisted and verified; unique index added; cache confirmed clean; backlog
recorded above for per-case human review. No further DB action required for task #15.
