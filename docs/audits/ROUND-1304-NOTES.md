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

## What was done (added after the table was pushed)

No file under `src/` changed. Six harnesses and five walks did.

**The harnesses, green on a runner (`r1304-s2`, head `f17dec1b`).**

| Harness | Exit | Seconds | What it printed |
|---|---|---|---|
| `simEra2005` | 0 | 20 | 1712 era-exclusive names, 0 leaks; 15 names shared with 2026, 13 listed pairs, 0 unexplained |
| `simEra2010` | 0 | 18 | 1715 era-exclusive names, 0 leaks; 36 shared, 11 listed pairs, 0 unexplained |
| `simEra2015` | 0 | 17 | 1430 era-exclusive names, 0 leaks; 229 shared, 19 listed pairs, 0 unexplained |
| `simEra2020` | 0 | 13 | 939 era-exclusive names, 0 leaks; 835 shared, 10 listed pairs, 0 unexplained; 29 era-only clubs, 6 in two or more eras, the reversal moves 0, 6 of 6 pinned clubs read the league they always have |
| `simEras` | 0 | 786 | 454 clubs, 5113 players compared; "the bake's 4401, less 1 moved by a newer squad list (Ryan Fraser from Southampton), plus 713 in 2 generated leagues (A-League Men 310, Russian Premier League 403) = 5113" |
| `simStatsCentre` | 0 | 3 | all checks passed (no assertion changed) |

`simEras` section 5 read 0.00 goals a game, 2.9 champion points and 0.2 of my points, the same three numbers
as the base, as it must with no engine file touched.

**"It has always read", proven.** A probe printed an unscoped `leagueOf` for the six pinned clubs on four
trees (`r1304-s2`, labels `pins971`, `pinsPre1035`, `pinsPre1040seg`, `pinsHead`): Round 971's closing
commit `1a8e68b7` where the fixed order shipped, `709e103f`, `fa77f447` and this branch. On all four: Wigan
Athletic `premier2010`, Zaragoza `laliga2010`, Chievo Verona `seriea2010`, Bordeaux `ligue12010`, Caen
`ligue12010`, Leicester City `premier2015`. Cádiz read `laliga2005` on the first three and `segunda` on
this branch. Era-only clubs and those in two or more eras: 45 and 17 at `1a8e68b7`, 53 and 21 at
`709e103f`, 37 and 11 at `fa77f447`, 29 and 6 today.

**The negative controls, each read to its last line (`r1304-s2c` on `f17dec1b`, `r1304-s2d` on `712196e7`).**
Every one exits 1 and prints the sentence it is aimed at.

| Harness | Control | What it breaks, in memory | The line that fired |
|---|---|---|---|
| all four `simEra20xx` | `leak` (new) | the modern save is handed the era's market at year zero | `2005-only Lucas Pereira is on the 2026 market` (1712 leaks); 2010: Zlatan Ibrahimović (1715); 2015: Carlos Bacca (1430); 2020: Ismaël Bennacer (939) |
| `simEra2005` | `unlisted` (new) | the Ronaldo pair leaves the list | `2005 vs 2026: 1 shared names age impossibly: Ronaldo (28 -> 25)` |
| `simEra2010` | `unlisted` (new) | the Wendel pair leaves the list | `Wendel: aged 2 years between 2010 (27) and 2026 (29), same name, different person?` |
| `simEra2015`, `simEra2020` | `joinage` (new) | one man of a generated league reads ten years older | `1 shared 2015/2026 names age impossibly: Hiroki Sakai (24 -> 46)`; 2020: `Hiroki Sakai (2020 29, now 46)` |
| `simEra2020` | `shiporder` (new) | the engine's era order retyped oldest first as it is bundled | the order pin, and the pins of Wigan Athletic, Zaragoza, Chievo Verona and Bordeaux (5 failures) |
| `simEra2020` | `eraorder` (old) | the fixed order taken out as the engine is bundled | `leagueOf's era fallback hangs on the order of ERA_LEAGUES: Wigan Athletic premier2010 -> premier2005; ...` |
| `simEras` | `dropman` (new) | one real man missing from the year zero world | `1 projected players at year zero differ from the real data` and `projected 5094 players at year zero, the real data says 5113` |
| `simEras` | `unflag` (new) | one made up man of the 2031 world loses his flag | `1 players are not in the real data and are not flagged as made up` |
| `simStatsCentre` | `nosubs` (new) | the men who came on are not counted | `664 total apps across 51 matches with 0 men coming on, expected 561` and six more |

The first cut of `leak` only flipped the save's era, so the save read the era's world two decades on, where
the real men have retired: it was inert in `simEra2005` (exit 0, read on `r1304-s2c`) and fired on only 9, 90
and 258 men in the others. It now sets the era's start year too and exits 2 when the market it handed over
holds no era-only man. The 24 controls the four era harnesses already had all still exit 1 (`r1304-s2c`).

## The walks, and what the pictures found

Five walks that open a past season were red on the base, none of them for the game's sake
(`r1304-walks`, the build of this branch, whose `src` is the base's):

| Walk | First failing line | Cause | Verdict |
|---|---|---|---|
| `playEra2005`, `playEra2010`, `playEra2015`, `playEra2020`, `playNationalities` | the first check after "England, Premier League" (for example `2005 Wigan are a pickable club`), then a timeout on the next press | Since Round 1052 the line under the page title names "the Russian Premier League", so the press on `text=Premier League` landed on that sentence and the league step never moved on. | STALE press. It targets the league tile now. |
| `playEra2005`, `playEra2010` | `Germany correctly absent from 2005` (and 2010) | Rounds 902 and 901 made both seasons a full big five. | STALE. They ask what `playEra2015` asks since Round 899: Italy, Germany and France offered, the Netherlands not. |
| `playEra2005`, `playEra2010`, `playEra2015` | `no 2026 player leaked into 2005` (2010, 2015) | The line read the whole page body for Haaland or Bruno Fernandes. Since Round 971 the guide under the game names both as 2020-21 men. | STALE. The line reads the game without its guide (`namedInGame` in `scripts/lib/eraDressingRoom.mjs`), with a control, `ERA_CONTROL=ghost`. |

The same press was in four walks of today's game. `playReleaseClause`, `playSponsors` and `playWilderness`
are red as committed and green with the one press changed (`r1304-walks2`, labels `try*`), so they got it
too, in a commit of their own. `playNationJob` is red as committed on the same press and still red with it
changed, further on (`the tile says the country is calling (Managers)`, then a wait for
`[data-nation-offer]`): another cause, left alone and reported.

A walk written for this round and not committed (`walkEraMarket`, kept beside the closing report) read the
transfer market off the screen in all five worlds, 120 views a past season and 560 today, and compared
every name with that season's squads (`r1304-walks2`): 1,611 men in 2005-06, 1,636 in 2010-11, 1,545 in
2015-16, 1,665 in 2020-21 and 4,858 in 2026-27 across 27 leagues. No stranger, no man listed at a club
that season does not have, and 16 men of the other worlds searched by name in each: none listed.

**And one real defect, which no harness guards.** The pictures of the 2010-11 market show this under
"Around the league": `Burnley sign Antonio Cassano from Sampdoria for £16m`, `Brentford sign Andrés
Iniesta from Barcelona for £56m`, `The window's biggest deal so far: Andrés Iniesta to Brentford for £56m`.
Neither club is in the 2010-11 world. The men are right and the buyers are not: in `src/lib/clubManager.ts`,
`generateHeadlines` draws the buying club from `REAL_LEAGUES`, today's 454 clubs with today's budgets, in
every past season, and the same deals go into Latest Transfers. The rival who "just entered the race" in a
negotiation is drawn the same way, from the top five of each of today's leagues, and can close the deal.
So a 2005-06 save can print a club that was not founded yet. Round 146 already wrote the rule three times
in this file (`buyerPool`, `approachSuitors` and the job suitors all branch on the era: "a 2010 manager
cannot be poached by a 2026 club"); these two places never got it. Verdict: DEFECT, a club of the wrong
year on a player's screen. See the closing report for what was done about it.

## The defect, fixed at its cause

**The test first (commit `269ef5ea`).** `scripts/simEra2020.mjs` got a section 9 that plays nothing: for
every past season it starts 100 seeded saves and reads the transfer log the opening window wrote, and
it runs 60 seeded negotiations until a rival enters, each against the clubs of that season's leagues.
On the engine as it stood it is red on eight lines:

| Season | Deals in the news | Bought by a club not of that season | Rivals | Not of that season | One it printed |
|---|---|---|---|---|---|
| 2010-11 | 469 | 106 | 37 | 30 | `Al-Hilal sign Lassana Diarra from Real Madrid` |
| 2015-16 | 428 | 72 | 33 | 26 | `Leeds United sign Pierre-Emerick Aubameyang from Borussia Dortmund` |
| 2005-06 | 472 | 99 | 34 | 29 | `Bournemouth sign Ruud van Nistelrooy from Manchester United` |
| 2020-21 | 440 | 27 | 32 | 21 | `Nottingham Forest sign Cristiano Ronaldo from Juventus` |

**The fix (commit `754b0b2b`).** One helper in `src/lib/clubManager.ts`, `actingClubsByLeague(state)`: the
era's own leagues through `eraPlayableClubs` in a past season, and exactly today's expression otherwise.
`generateHeadlines` and the rival bidder in `makeOffer` read it. Against the base the engine file is 17
lines added and 2 removed in three hunks, none naming an appeal, and the Round 1081 manifest pin follows
it (`d4aa57b9...` to `f98e849f...`). On the fixed engine section 9 reads 0 of 466, 419, 472 and 435 deals
and 0 of 35, 31, 32 and 33 rivals. Its two controls put the old line back as the engine is bundled:
`modernnews` fails the news sentence in all four eras (106, 72, 99 and 27, the base's own numbers) with
no rival wrong, and `modernwar` fails the rival sentence (27, 20, 25 and 25) with no deal wrong.

**What moved, and the proof that nothing else did.** A career that starts today reads the same clubs in the
same order. `scripts/simCmLeagueRules.mjs` holds that as hashes: on the fix (`r1304-fx2`) its 27 modern
entries and 48 pure entries match untouched, and all 20 era entries differ, every one in the three hashes
of a whole state (`start`, `whole`, `wholeNext`), which holds the headlines and the transfer log. Eleven
differ in nothing else. Four era seasons also play out differently (`era2010|bundesliga2010`,
`era2010|ligue12010`, `era2015|ligue12015`, `era2005|bundesliga2005`), because the pool of clubs that can
afford a man has another size, so a deal exists or does not and the stream after it shifts. On the commit
before the fix the same harness is green on the file as it stood (`r1304-fx2a`), so nothing else in the
round moved a hash. The 20 era entries were then written with `--part=eras --write` on the tree and the
harness ran green whole on the same runner (commit `c9269787`, with the paragraph in the harness header).

**Saves.** A past season save from before the fix can hold up to eight headlines and up to 80 Latest
Transfers rows that name a club of today. Nothing rewrites them: the headlines are replaced at the next
window and the log rolls off at 80 rows. No signing of the player's own is touched, because the defect
never moved a man, it only named a buyer. The count of saves it could touch: every past season save ever
started (each opens with a window), which is why a reader leaves them alone rather than editing history.

**One What's New entry** says it in plain words, at the top of October 2026.
