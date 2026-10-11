# Round 1304: the six era fences of Club Manager, read one assertion at a time

Written 2026-10-11 by the desktop Claude lane (session G, builder of Round 1304).
Base: `origin/release-av-gate` at `f65c6d60` (Release AV's gated head).

## The short answer

Thirteen assertions are red on the base, in five harnesses. **Every one is a stale check and none is a
defect in the game.** The five harnesses read `src/data/clubManagerRosters.ts` (the value table's bake:
426 clubs, 4,401 men) as "the modern world", and since Round 1035 the game reads the joined world of
`src/data/clubManagerWorldRosters.ts` instead: the bake, less one man the A-League ledgers moved, plus
the A-League Men (12 clubs, 310 men, Round 1035) and the Russian Premier League (16 clubs, 403 men,
Round 1052). That is 454 clubs and 5,113 men. Every "leaked" man and every "unflagged" man below is a
real 2026 footballer from one of those two generated files. Nobody is invented, nobody is in a wrong year.
The two other reds are about clubs: Round 1040 gave Serie B, Ligue 2 and the Segunda to the modern world,
so 24 clubs that only the past seasons knew (15 of them in two or more eras) now have a modern league.

`scripts/simStatsCentre.mjs` is green on the base. Round 1146 already rewrote it (see the last table).

## How this was measured

All on GitHub runners, never on the owner's PC. Result branches are `origin/rc-results/<name>`.

| Request | What ran | Read |
|---|---|---|
| `r1304-base` | the six harnesses plus `simEraBakeExtend` and `simEraWorldTables` on `f65c6d60` | 18:30 to 18:38 UTC |
| `r1304-bisA` | the four `simEra20xx` harnesses on nine older commits, `simStatsCentre` on four | 18:56 to 18:59 UTC |
| `r1304-bisB` | `simEras` on four older commits | 18:57 to 19:12 UTC |

The bisect ran each harness of an older commit in its own git worktree on the runner, one commit before
the suspect and the suspect itself, so "turned red at" below means green on the parent and red on the
commit, both read to the closing line.

Base closing lines and exit codes (`r1304-base`):

| Harness | Exit | Seconds | Closing line |
|---|---|---|---|
| `simEra2005` | 1 | 13 | `simEra2005: 1 failure` |
| `simEra2010` | 1 | 12 | `simEra2010: 1 failure` |
| `simEra2015` | 1 | 12 | `simEra2015: 3 failures` |
| `simEra2020` | 1 | 9 | `simEra2020: 5 failure(s).` |
| `simEras` | 1 | 486 | `3 FAILURES` |
| `simStatsCentre` | 0 | 3 | `ALL STATS CENTRE CHECKS PASSED` |

## The table

"Line" is the line of the assertion in the harness on the base. A harness prints only the first three
leaks, so the count of men is in the row.

| # | Harness, line | First failing line on the base | What it protects | Turned red at | Verdict |
|---|---|---|---|---|---|
| 1 | `simEra2005` 257 | `2005-only Ronaldo is on the 2026 market` | A man who exists only in the 2005-06 squads is never on a modern career's market. | `5010ae3f` (Round 1052 step 5, Russia joins the engine). Green on its parent `0bdc970d`. | STALE. See note A. |
| 2 | `simEra2010` 239 | `2010-only Wendel is on the 2026 market` | The same rule for 2010-11. | `5010ae3f` (Round 1052). Green on `0bdc970d`. | STALE. Note A. |
| 3 | `simEra2015` 235 | `2015-only Hiroki Sakai is on the 2026 market` | The same rule for 2015-16. | `b777801d` (Round 1035, the A-League joins). Green on its parent `709e103f`. | STALE. Note B. |
| 4 | `simEra2015` 235 | `2015-only Mathew Leckie is on the 2026 market` | The same. | `b777801d` (Round 1035). | STALE. Note B. |
| 5 | `simEra2015` 235 | `2015-only Tom Lawrence is on the 2026 market` (a fourth man, Jhon Córdoba, is counted and not printed) | The same. | `b777801d` for Lawrence; Córdoba is added at `5010ae3f` (3 leaks become 4). | STALE. Note B. |
| 6 | `simEra2020` 251 | `2020-only Lucas Olaza is on the 2026 market` | The same rule for 2020-21. | `5010ae3f` (Round 1052). | STALE. Note B. |
| 7 | `simEra2020` 251 | `2020-only Mathew Leckie is on the 2026 market` | The same. | `b777801d` (Round 1035). | STALE. Note B. |
| 8 | `simEra2020` 251 | `2020-only Jhon Córdoba is on the 2026 market` (eight men counted: also Hiroki Sakai, Alexander Djiku, Rodrigo Becão, Eddie Salcedo, Marcel Tisserand) | The same. | `b777801d` for Leckie, Sakai and Tisserand (3 leaks); `5010ae3f` for the other five (8 leaks). | STALE. Note B. |
| 9 | `simEra2020` 649 | `only 6 era-only clubs sit in two eras; the order check has nothing to bite on` | The test that reverses `ERA_LEAGUES` and expects no club to move must have clubs it could move, or it passes on nothing. | `d557a8ae` (Round 1040, the Segunda). The count read 21 before Round 1040, 18 after Serie B (`9e9af21b`), 11 after Ligue 2 (`fa77f447`), 6 after the Segunda. | STALE. Note C. |
| 10 | `simEra2020` 651 | `an unscoped leagueOf('Cádiz') reads segunda; it has always read laliga2005` | The eras are read in the order they shipped, so a later era never takes a club an unscoped caller already reads. | `d557a8ae` (Round 1040). | STALE. Note C. |
| 11 | `simEras` 134 | `1 projected players at year zero differ from the real data` | A new career today is handed the real August 2026 data untouched: the projection at year zero is the identity. | `b777801d` (Round 1035). Green on `709e103f`. | STALE. Note D. |
| 12 | `simEras` 136 | `projected 4377 players at year zero, the bake says 4401` | The same, as a count: no real man is lost at year zero. | `b777801d` (Round 1035), where it read 4229 against 4253. | STALE. Note D. |
| 13 | `simEras` 491 | `189 players are not in the real data and are not flagged as made up` | Every made up player carries the MADE UP flag, everywhere, forever: a man without the flag must be a real footballer. | `b777801d` (Round 1035) with 89 men; 180 at `5010ae3f` (Round 1052); 189 on the base after `dead5070` grew the Russian file from 357 to 403 men. | STALE. Note E. |

## Notes

**A. Two men wearing one name (rows 1 and 2).** The Ronaldo on the 2026 market is Rostov's right winger,
25, rated 71, born 2000-12-07 (the committed ledger `scripts/data/gatheredSquads/russia2026/research.json`
has his birth date on three squad lists). The 2005 world's Ronaldo is Real Madrid's striker, 28 in that
table, born in September 1976 (besoccer.com and bdfutbol.com both print 22 September 1976, read
2026-10-11; other publishers print the 18th, the same year). The Wendel on the 2026 market is Zenit's
central midfielder, 29, born 1997-08-28 (same ledger). The 2010 world's Wendel is Bordeaux's left sided
midfielder, 27 in that table, born 8 April 1982 (ESPN's player page and besoccer.com, read 2026-10-11).
Both 2026 men are real and belong on the 2026 market. Each world is sealed: a 2005 career builds its
market from the 2005 squads only (`marketBase` in `src/lib/clubManager.ts` keys its cache on the era).

**B. The same men, years older (rows 3 to 8).** Every one is the same footballer, in a 2026 squad the
generated files hold, and his age moves by the calendar (a snapshot wobbles a year either side):

| Man | In the era table | In the 2026 world | File |
|---|---|---|---|
| Hiroki Sakai | 2015 Hannover 96, 24; 2020 Marseille, 29 | Auckland FC, 36 | A-League |
| Mathew Leckie | 2015 Ingolstadt, 23; 2020 Hertha BSC, 28 | Melbourne City, 35 | A-League |
| Tom Lawrence | 2015 Leicester City, 20 | Perth Glory, 32 | A-League |
| Marcel Tisserand | 2020 Wolfsburg, 26 | Sydney FC, 33 | A-League |
| Jhon Córdoba | 2015 Mainz, 21; 2020 Köln, 26 | Krasnodar, 33 | Russia |
| Lucas Olaza | 2020 Celta Vigo, 25 | Krasnodar, 32 | Russia |
| Alexander Djiku | 2020 Strasbourg, 25 | Spartak Moscow, 32 | Russia |
| Rodrigo Becão | 2020 Udinese, 23 | Rodina Moscow, 30 | Russia |
| Eddie Salcedo | 2020 Verona, 18 | Rubin Kazan, 25 | Russia |

The harness called them "2020-only" because its list of modern names stopped at the bake. Read against
the joined world they are shared names, and the namesake pass of each harness (same human, that many
years apart, or a listed pair of two men) is the check that judges them. Measured with the joined world:
2005 has one new name outside its age window (Ronaldo), 2010 one (Wendel), 2015 none and 2020 none.

**C. Clubs that got a modern league (rows 9 and 10).** `leagueOf` answers a club's modern league first
and only falls back to the era leagues for a club no modern league holds (Round 146's rule, restated
in Round 971's closing check). Round 1040 added Serie B, Ligue 2 and the Segunda, and with them Cádiz,
Mallorca, Sampdoria, Palermo, Saint-Étienne, Metz and others. So the set the fallback serves shrank from
53 clubs (21 in two or more eras) to 29 (6 in two or more: Wigan Athletic, Zaragoza, Chievo Verona,
Bordeaux, Caen, Leicester City), and Cádiz reads `segunda` because that is where the 2026-27 data has
them. The floor of 10 and the Cádiz pin were both typed against the Round 971 world. Nothing a player
sees is wrong: an era save reads its own league through `careerLeagueOf` and `eraLeagueOf`, which
section 8 of the same harness proves for every market row of all four eras (0 filed wrong), and the
reversal test itself is green (reversing `ERA_LEAGUES` moves 0 clubs).

**D. One man moved by a newer squad list (rows 11 and 12).** Round 1035's generator proved that Ryan
Fraser of the bake's Southampton is the Ryan Fraser of Macarthur FC's 2026-27 squad, and
`CM_ALEAGUE_SUPERSEDES` takes him out of Southampton so he is not in two squads. Southampton therefore has
23 men in the world and 24 in the bake. The harness counts a club of a different length as one mismatch
and skips its rows, which is the "1" of row 11 and the 24 missing men of row 12 (4,401 less 24). Compared
with the joined world, year zero is the identity: 454 clubs, 5,113 men, 0 differences, 0 made up.

**E. Who the 189 are (row 13).** All of them are real men of the two generated files, still in their
squads some years on: 168 in the 2031 world (77 A-League, 91 Russia), 21 in the 2036 world (12 and 9),
none in the 2046 world. Not one is outside the joined world. A sample of twenty from the 2031 world, each
with his club and his age in the 2026 file: Ethan Alagich (Adelaide United, 22), Ajak Riak (Adelaide
United, 25), Jordan Lauton (Brisbane Roar, 23), Luke Becvinovski (Central Coast Mariners, 17), Michael
Pratezina (Macarthur FC, 18), Akeem Gerald (Melbourne City, 16), James Delianov (Newcastle Jets, 26),
Trent Ostler (Perth Glory, 24), Akol Akon (Sydney FC, 17), Liam Gillion (Western Sydney Wanderers, 23),
Kelliano (Akhmat Grozny, 23), Maksim Petrov (Baltika, 25), Egor Lyubakov (Baltika, 27), Maksim Borisko
(CSKA Moscow, 26), Abdulpasha Dzhabrailov (Dynamo Makhachkala, 21), Aleksandr Koksharov (Fakel Voronezh,
21), Vladislav Shitov (Krylia Sovetov, 23), Stanislav Poroykov (Orenburg, 22), Artem Petrov (Rostov, 18),
Egor Teslenko (Rubin Kazan, 25). The real free agents file (`src/data/clubManagerFreeAgents2026.ts`, seven
men) is not involved: those men are a pool of their own, seeded only into a brand new modern career, and
none of them is in the world or on the market.

## simStatsCentre: already rewritten, green on the base

| Point | Exit | What it printed |
|---|---|---|
| `5b70b05f` (parent of the merge of Round 1072) | 0 | `53 matches -> 583 appearances, 11 per match in every bucket` |
| `ba13dc2e` (Release AL merges Round 1072, substitutions in quick sim) | 1 | six failures, first `605 total apps across 52 matches, expected 572` |
| `6b3e01ca` (parent of the fix) | 1 | the same six, first `679 total apps across 52 matches, expected 572` |
| `21fe2c06` (Round 1146, "the stats centre harness counts the men who came on") | 0 | `53 matches -> 689 appearances: 11 starters a match plus 106 men who came on, in every bucket` |

STALE from Round 1072 until Round 1146 rewrote it to eleven starters plus the men the coach sent on.
Nothing left to do there but gate it.

## Things read that are not red

- The age curve check of `simEra2020` (section 6, the era uplift) is green on the base: `top 50, uplifted
  2020 against modern, mean gap 0.12 (band +-0.5)`. This round does not touch the curve (Round 1102's
  known fault is a round of its own).
- `simEras` section 5 (a ticking clock against a frozen one) is green on the base with a champion points
  gap of 2.9 against a band of 4. On the four older trees of the bisect it read 2.0, 4.1 (red, at
  `b777801d` only), 2.1 and 3.2. It is seeded, so one tree gives one number, but the headroom is thin and
  it moves with any engine change. Not changed here; reported for the gate list.
- `simEras` section 4 reads the bake for its "which clubs are empty" and "the world lost players" bounds.
  Both pass, and both are weaker than they read, because the bake is 712 men short of the world. They are
  moved to the joined world with the three reds.

## Saves

No defect put a wrong man into any market, so no save holds one and nothing needs a reader's rule. The
count of saves a fix could touch is zero: this round changes no file under `src/`.

## What the rewrite does (the same rule, under today's design)

1. The four era harnesses read the modern world from `src/data/clubManagerWorldRosters.ts`, the one file
   both engine files read. The leak check then asks what it always asked (a name no modern source holds
   must not be on the 2026 market) and the namesake pass judges every shared name, the generated leagues'
   men included. `simEra2005` lists the Ronaldo pair and `simEra2010` the Wendel pair, each with both men's
   dates of birth and where they were read.
2. `simEra2020` section 8 keeps the reversal test, pins the shipped order of the eras itself (the rule the
   Cádiz line stood for, without hanging on one club), pins the six clubs the fallback still serves in two
   or more eras, and takes its floor from today's measured six.
3. `simEras` section 1 compares year zero with the joined world and proves the join's own accounting from
   the files (the bake, less every man the join moved, each found at his new club, plus what each generated
   league says it ships). Sections 4 and 6 read the same joined world.
4. Every rewritten sentence gets a negative control that is read to its last line.
