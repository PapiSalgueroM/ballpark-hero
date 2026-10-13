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

## Steps (b) to (f), runner readings (GitHub runners through the rc kit)

Month award, head against the base, five seeds a run (400 careers a tree, about 6,700 seasons each):
- seed offset 0 (r1329-b): head 2,343 months over 6,675 seasons; rated 8.0+ 2.60 a season (636 seasons); rated 7.0 to
  7.5 wins any 0.03 (1,613); under the floor 0; zero goal keepers rated 6.0 or less who won 0 of 38; wrong years 0.
  Base: 5,094 months over 6,664 seasons; 8.0+ 2.11; 7.0 to 7.5 any 0.48; under the floor 976; zero goal keepers
  12 of 35; month lines with the wrong year 2,609.
- groups at 7.5 to 8.5, rating for rating (0.1 strata weighted by the whole fleet), seed offsets 1 to 4 (r1329-f3):
  all 1.10, 1.06, 1.07, 1.11; GK 0.94, 0.90, 0.95, 1.00; DEF 1.12, 1.09, 0.98, 1.12; MID 1.02, 0.88, 0.91, 1.01;
  ATT 1.18, 1.17, 1.19, 1.16. Band 30 percent: the widest reading is MID at minus 17 percent. 8.0+: 2.64, 2.61,
  2.74, 2.72 against the band 1.0 to 3.0. Base groups (unstratified, seed 0): GK 0.40, DEF 0.46, MID 0.66, ATT 2.08.
- planted: a 0 goal keeper rated 6.0 over 10,000 identities wins 0 months.
Stream (section 2, 200 careers in lockstep with the base): 0 careers with a Math.random count, phone seed or world
record off the base; about 600 month blocks and world ticks compared; the first fields to differ are always this
round's (events and awards, or the phone's clubs, world and feed with the Ballon d'Or night).
Feed (section 3): 0 real names, champion, transfer or top scorer lines in about 4,300 seasons that happened; every
season to come opens with its framing line; 0 real men off their era club; base: 17,093 real names, 29,868 claims,
1,044 winners of missed summers, 63,636 real men off their era club.
Quiz (section 4): three questions in every season on the head (base 6,659 of 6,664); 0 world questions about a
season that happened (base 7,377), 0 about a real man (base 4,561); 40 old 2028 saves holding real moves ask 0
about a real man and play a season on without a throw.
Log and panel (section 5): 0 missed past summers named in the log (base 1,059); kept for finals he played and for
summers to come; the panel's four cases follow the rule (the base shows every winner).
Inverse (section 6): 31 rows (engine 5, phone 11, quiz 5, panel 10) give the base's four files back byte for byte;
every hunk inside the regions. The regenerate recipe, from the worktree root:
  node .tmp-fx/gen-inverse.mjs c5fc5470b3e377f22d6d538f459b9f5310b08dd0 && node .tmp-fx/write-inverse.mjs
(the two generator scripts live in the worktree's .tmp-fx and are copied into the closing report's folder).

Controls, each run red once (exit 1, last line FIRED): goalsonly (section 1, 7 failures), seasonyear (1, 1),
nolegacy (2, 202), extradraw (2, 201), realmoves (3, 2), pastchampions (3, 1), summer (3, 1), arcade (4, 2),
log (5, 1), panel (5, 6), outside (6, 3).

Known reds carried (decision 5): simPhone2 and simMoney are red on their save size budgets on the base and the head
alike, and only there (simPhone2 biggest save 98.9 KB head, 99.6 KB base; simMoney 88.3 KB head, 89.5 KB base); the
sections that read this round's code (simPhone2 section 6: 840 feed items, 227 transfers on the head, 245 on the
base; simMoney section 6: 180 questions, every one answerable from the save) are green on both.

## The bundler and the legacy draws (found by playSoccerCareerDepth, fixed in 7d31c5f0)

The production build (Vite, Rollup's tree shaking) counts Math.random as pure, so the first version of the legacy
draws, whose results fed nothing, was dropped from the built game: playSoccerCareerDepth saw 170 draws in the node
and Chromium engines against 150 on the page's Next Season (r1329-i). The node harnesses cannot see this, since
they bundle without that tree shaking. The draws now feed a sum that a branch the bundler cannot rule out reads (a
sum of draws is never negative), the same calls in the same order; r1329-k checks the page again.

## The walk (scripts/playSoccerWorldTruth.mjs, r1329-walk4 at 7d6036ba)

Green at 320, 390 and 1280; WALK_CONTROL=pastfeed fired on case A at all three (3 failures). Save A was a 2012
Liverpool striker (two month lines, August 2012 and April 2013, in the 2012 season); save B missed the 2002, 2004
and 2006 summers; save C missed the 2030 World Cup. Pictures looked at: 390-A-feed (the honest lines, his own
tournaments), 390-A-quiz (an own story question), 390-A-story (the two month lines with their own years),
390-B-history ("Watched from home" on all three rows, no champion), 390-B-card and 320-B-card (no champions line,
no Bracket tile, the third tile spanning the row), 390-C-feed (the framing line heading each season, champion lines
under it), 390-C-bracket (the 2030 bracket opens). The history list opened and closed with scrollY and the
document height back where they were (390: 2143 and 14952 before, 2285 and 15094 open, 2143 and 14952 closed);
"Watched from home" is 12 px; every press measured is 44 px or more but the list's Back (32 px, owed).

Final proof readings at the last head are in the closing report
(C:/Users/antho/dukb-handoff/2026-10-10/results-g/finish-1329.md), because What's New is the round's last commit.

## Deviations from the brief's hunk list, and why

- InternationalPanel.tsx gains one import line (soccerWorldTruth), which the brief's list of panel lines leaves out
  but the rule needs; and its tile grid's class line, so a card that loses its Bracket tile spans its last tile
  across both columns. The class is added only when the tile count is odd, so every four tile card's markup stays
  the base's (careerMomentKitLift's recorded markup holds without a re-record).
- monthAwards takes the position and groups it with monthGroupOf, a copy of soccerInternational.ts positionGroup
  held equal to it for all ten positions by src/test/soccerWorldTruth.test.ts, so the engine keeps its one import
  line.
- simCareerStoryRole and simSoccerCareerDevelopment take the engine's and the phone's rows only (their bundles load
  neither the quiz nor the panel); simCareerLeagueSeasons' existing 1327 arm takes 1329 out first instead of a new
  arm; simSoccerDeckFairness section 7 compares the base with this tree with 1329 taken out.

## Owed
- Small type this round shows but did not write (PhonePanel.tsx and InternationalPanel.tsx): the feed items at
  text-[11px] (PR178's PhonePanel), the champions line text-[11px], the last tile's line text-[9px], the history
  list's Back button h-8 (32 px).
- The tournament card's Qualifying and Squad tiles, and the group table, still show his nation's simulated run in a
  summer that happened; this round's rule covers the winner only.

- F13b: sourced history (soccerWorldHistory.ts) for champions, cups, top scorers and transfers of seasons that
  happened; the repo already sources the 2026 World Cup (src/data/wc2026Results.ts) and the 2025-26 European tables
  and Champions League holders (src/data/clubManagerFinalTables2025_26.ts), both held for F13b because the game's
  world draws its own 2025 champions and 2026 edition and the Ballon d'Or honours those.
- Moving LAST_PLAYED_SEASON or LAST_PLAYED_SUMMER is a data round with its own sources.
- Transfer news for 2026 to 2032 could come from Round 1318's generated Ballon d'Or pool in a later round.
