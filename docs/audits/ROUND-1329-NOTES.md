# Round 1329 notes: Soccer Career's world tells the truth (F13a)

Branch r1329-sc-world-truth. Kept current at every push.

## Base

origin/release-bc-gate c5fc5470b3e377f22d6d538f459b9f5310b08dd0 (Release BC's join; origin/main 36cc9ffe had no
Release BC commit when the round started on 2026-10-13). Blobs on the base: soccerCareerEngine.ts 7bcaad3c,
soccerPhone.ts d5c9f014, soccerArcade.ts bf52d2bc, InternationalPanel.tsx d64af844.

## The boundary and its sources (src/lib/soccerWorldTruth.ts, read 2026-10-13)

LAST_PLAYED_SEASON = 2025 (season Y is Y/Y+1):
- European autumn to spring leagues, 2025/26 over: src/data/clubManagerFinalTables2025_26.ts (two source families,
  read 2026-09-15: UEFA and the leagues' own data; ESPN and other press).
- Saudi Pro League 2025/26 over on 21 May 2026: spl.com.sa news 1069886 ("2025-26 SPL Awards winners"); ESPN
  2025-26 Saudi Pro League standings (ksa.1).
- Calendar year leagues the eras list (MLS, Brasileirao, K League 1), the game's season Y is the year Y:
  MLS Cup 2025 on 6 December 2025 (mlssoccer.com "Inter Miami CF Win 2025 MLS Cup presented by Audi"; ESPN gameId
  762182); Brasileirao 2025 settled 3 December 2025 (cbf.com.br "Flamengo e campeao do Brasileirao Betano 2025";
  ESPN Brasil artigo 16041438); K League 1 2025 settled 18 October 2025 (The Korea Herald article 10596261;
  the-afc.com "East Asia Wrap: Jeonbuk lift K League title").
LAST_PLAYED_SUMMER = 2026: the 2026 World Cup ended 19 July 2026 (src/data/wc2026Results.ts, ESPN's scoreboard feed
for all 104 matches; The Athletic and FOX Sports for the awards).
None of these champions is printed: they are held for F13b (see Owed).

## Step (a): the boundary module, its unit file and the harness red on the base

Month award design numbers, tuned on a base fleet probe of 200 careers (3,244 season rows; starts 1990 to 2020):
season ratings run p10 6.1, median 7.2, p75 7.8, p90 8.4. Base award means per season by rating, ATT: 7.0 to 7.5
1.04, 8.0 to 8.5 2.56, 8.5+ 3.51; GK: 0.33, 0.40, 0.59 (the goals lottery). 179 of 538 zero goal seasons with 10+
games won at least one month. monthAwards on the same rows (20 streams each): 8.0 to 8.5 2.16, 8.5+ 3.61 (8.0+
together about 2.7), 7.0 to 7.5 any 0.03, under 6.8 none; at 8.0 to 8.5 GK 2.03, DEF 2.05, MID 1.98, ATT 2.38;
overall 0.70 a season against the base's 0.88 (card 4 is dealt less, decision 3 (vi)).

simSoccerWorldTruth on the base (local smoke, one seed, 80 careers): section 1 red (223 seasons under the floor won,
2 of 3 zero goal keepers rated 6.0 or less won, 517 month lines with the season's year for January to May, groups
GK 0.37 DEF 0.29 MID 0.72 ATT 2.0 at 7.5 to 8.5); section 3 red (3,414 real names in past seasons, 5,971 past
champion, transfer or scorer lines, 209 winners of missed summers, 6,364 real moves, 2,099 real top scorers, 12,868
real men off their era club); section 4 red (1,488 world questions about a season that happened, 920 about a real
man); section 5 red (213 missed past summers named in the log; the panel shows the champion, bracket and last tile
winner for a missed 2006).

## Owed

- F13b: sourced history (soccerWorldHistory.ts) for champions, cups, top scorers and transfers of seasons that
  happened; the repo already sources the 2026 World Cup (src/data/wc2026Results.ts) and the 2025-26 European tables
  and Champions League holders (src/data/clubManagerFinalTables2025_26.ts), both held for F13b because the game's
  world draws its own 2025 champions and 2026 edition and the Ballon d'Or honours those.
- Moving LAST_PLAYED_SEASON or LAST_PLAYED_SUMMER is a data round with its own sources.
- Transfer news for 2026 to 2032 could come from Round 1318's generated Ballon d'Or pool in a later round.
