# Round 1572 notes: Aussie Rules Manager plays the 18 real AFL clubs by name

Branch r1572-afl-club-names, base origin/main 65b3e291a (Release BS live plus board commits). Brief:
C:/Users/antho/dukb-handoff/2026-10-10/briefs/brief-1572.md, its critic and its draft. The report behind it is
54f3fed9 of 2026-10-26 ("Other: weird team names", timezone Australia/Perth). Every heavy gate ran on a GitHub
runner through the lane's rc kit; the result names are below.

## What each step built

1. The base record, on the untouched engine. scripts/recordAussieV2SaveFixture1572.mjs (with
   scripts/lib/aflClubNames1572.mjs, the one bot, bundler and mask the harness shares) wrote
   scripts/data/aussieV2SaveFixture1572.json: hashes and recipes only, 72 fleet careers (seeds 1 to 24 by club-00,
   club-06, club-17, two seasons each) and 16 save recipes covering prepare, quarter, a break after a swap, report,
   the last home and away round, a finals week with no game, its report, season over, summer, a draft with picks
   made, season 2 and season 3, plus one club of every tier. It asserted all 8 bundled files were 65b3e291a's text.
   Remote check r1572-s1 re-recorded it on Linux and `git diff --exit-code` found it byte identical.
2. The data. src/data/aflClubs2026.ts (data only, imports nothing) and its receipts
   scripts/data/aflClubNames2026.json. See "The sources" below.
3. The engine, with the real set dormant. src/lib/aussieRulesLeague.ts: `ClubSetId`, `CURRENT_CLUB_SET`,
   `clubIdentities(set)` (memoised at call time; a real club takes the k-th CLUBS slot of its 2026 ladder band, the
   bands being the running totals of CLUBS' tier counts, so its id, style and tier are that slot's), `setOf`,
   `clubFull` and `clubShort` (an empty or unknown id prints as itself), the optional save field `clubSet?: 'afl2026'`,
   `createLeagueWorld(seed, set)` and `createLeague(seed, club, set = 'fictional')`, the validator (no key is the
   invented league, the one other way is exactly 'afl2026'; names are checked against the save's own set), and
   `hubTiles`. `clubLabel` and `placeOf` are gone and every board call site reads the save's set.
4. Turned on. The hook starts new careers with `CURRENT_CLUB_SET`. The menu groups the clubs under "Finished 1st to
   3rd in 2026" and so on (TIER_NAMES and "Battlers" are gone), the tile line says "Control style in this game", the
   honour board and the season over line print one form for both clubs, the page's rules and subheading say what is
   real and what is made up, What's New has the entry, and src/test/aussieRulesManagerBoard.test.tsx line 64 now reads
   the new blurb (critic correction 1). aussieRulesFormat.ts lines 8 to 9 are a comment only edit (critic advice 9).
5. The switch. `switchClubSet(state)` renames every club and `clubName`, adds `clubSet` right after `clubName`
   (createLeague's key order) and changes nothing else; the hook's `switchNames()` writes it; the Club panel of an
   invented league career shows one card with an in place confirm ("Switch to the real names", then "Keep these
   names" or "Switch").
6. The browser walk scripts/playAflClubNames.mjs at 390 by 844 and 1280 by 800 with its bundlename control.

## The sources (all read 2026-10-29)

Every printed string has two independent non wiki publishers; AFL.com.au and the club sites count as ONE publisher
(critic advice 8). Raw pages were fetched with curl and quoted from the raw text; the ledger holds each line.
- AFL: https://www.afl.com.au/ladder, the "Club Sites" list (Adelaide Crows, Brisbane, ..., Gold Coast SUNS, GWS
  GIANTS, ..., Western Bulldogs).
- Austadiums: https://www.austadiums.com/sport/comp/afl/teams (18 names, "Tasmania Devils" under Future Teams).
- AFL Tables: https://afltables.com/afl/seas/2026.html, the "2026 Ladder" table. Band edges read twice (curl and a
  second fetch): 3 Brisbane Lions 64 pts 121.7, 4 Hawthorn 64 pts 120.1, 11 St Kilda 40 pts 102.8, 12 Greater Western
  Sydney 40 pts 98.9.
- Zero Hanger: https://www.zerohanger.com/afl/afl-ladder/. Confirmed the 2026 season: every row matches AFL Tables
  2026 (P 23, points, for, against, percentage, for example "1 - FREMANTLE FRE 23 19 4 0 2 76 2286 1666 137.2"); the
  "2027" text on the page is next season's fixture.
- ABC News: the score centre page titled "GWS Giants v Geelong Cats - Round 20, 2026 - AFL Score Centre - Live AFL
  Scores - ABC News", and the headline (the page's h1) of the article of 2026-05-25 ("How GWS exposed the back half
  problem threatening Brisbane's AFL flag hopes", re-read 2026-10-29 by the fixer; the earlier receipt here quoted a
  photo caption from the page's data, not the article body).
- Fox Sports Australia: https://www.foxsports.com.au/afl/ladder, its ladder data (`"name":"Geelong Cats"`, played 23,
  points 60, position 5) and its AFL teams menu (`{"label":"GWS Giants","url":"/afl/teams/greater-western-sydney-giants"}`).
Results: "Geelong Cats" ships (Austadiums, ABC, Fox Sports); "GWS" alone ships as the short form (Zero Hanger, ABC).
Not used: Footywire (a Cloudflare challenge page; not bypassed) and ESPN (only a summarising fetch printed "Geelong
Cats" and "GWS GIANTS"). Ladder places come from AFL Tables and Zero Hanger for all 18.

The mapping (decision 3): club-00 Fremantle, club-07 Sydney Swans, club-14 Brisbane Lions (tier 1); club-02 Hawthorn,
club-04 Geelong Cats, club-09 Adelaide Crows, club-13 Melbourne (tier 2); club-01 Western Bulldogs, club-06
Collingwood, club-11 Carlton, club-15 St Kilda (tier 3); club-03 GWS Giants, club-08 Gold Coast Suns, club-12 North
Melbourne, club-16 Port Adelaide (tier 4); club-05 West Coast Eagles, club-10 Richmond, club-17 Essendon (tier 5).

## The proof (closing runs on 3250c0f28; every line is in dukb-handoff/2026-10-10/results-g/rc-1572.txt)

- scripts/simAflClubNames.mjs, sections 0, 1, 2a, 2b, 3, 4 (with 4i), 5: "45 checks, 0 failures", 32.1 s (r1572-final).
- The whole fleet, AFL_NAMES_LONG=1 (critic advice 10, R6), run after step 3 (r1572-s3, 123.2 s) and in the closing
  proof (r1572-final, 137.9 s): "(a) no set: 72 careers, 216 checkpoints (LONG, the whole fleet of 72) in 59.5 s",
  "216 of 216 checkpoints equal the base's raw and masked hashes"; "(b) real set: 72 careers, 216 checkpoints in
  65.6 s", "216 of 216 checkpoints equal the base's MASKED hash (the same game with other names on it)".
- Strings pulled from the screens, the same count in both sets: header 5, hub 3, premier 2, score 6, events 87,
  results 22, ladder 90, finals 4, history 6, draft 9.
- Controls, each with the line that fired it: typo and onesource ("target section 0 RED, independent section 2a
  green"), ladder (1 red, 2a green), simdrift (2b red, 2a green), oldsave and mixed (3 red, 0 green), screen (4 red,
  4i green), switchlost (5 red, 3 green), all "RED as intended"; the walk's bundlename ("2 scripts rewritten, (a)
  RED ... RED as intended").
- Unedited and green: simAussieRulesSeason (52.3 s) and all 31 of its controls; simAussieRulesLeagueBoard (15 tests)
  and its 4 controls; simAussieRulesManager; simAussieRulesManagerBoard and its 10 controls (after the one line of
  critic correction 1); simInventedNames; simHomeFront; simResultMoment; simTrustCopy; simAccessibility;
  simNoRivalNames (0 findings); the type gate; the build.
- The walk at 390 and 1280: "36 checks, 0 failures (a 0, b 0, c 0), 2 viewports, 4 routes walked".

## Rollback note (critic advice 18)

A real club save carries a top level key (`clubSet`) that the validator of every release before this one refuses.
If the release carrying 1572 is rolled back, every career started on it loads as "This save could not be read" and is
overwritten on the next Start. Saves from before it are untouched either way. Do not roll that release back casually.
