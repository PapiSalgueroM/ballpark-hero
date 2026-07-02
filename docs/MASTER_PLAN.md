# DoUKnowBall Master Plan

Updated: 2026-07-01. This is the single source of truth for what is done, staged, built, and pending. Statuses: [DONE] live or verified, [STAGED] in batch 1 waiting for Anthony to run PUBLISH_GAMES.bat, [BUILT] code written locally and waiting to be staged in batch 2, [PENDING] not started.

## Ground rules

1. Never use the Lovable AI agent (free plan, 0 credits). Ship by editing files, listing them in PUBLISH_GAMES.bat, running the .bat.
2. Copyright safety: no team logos, no club crests, no athlete photos or faces, no video clips, no other site's name or visual design. Flags, names, stats, colors, and game mechanics are fine. Player facts are public data served from our own database. Add a non-affiliation disclaimer sitewide (see item 110).
3. No em dashes anywhere in site copy. Write like a person.
4. Verify code by Read-tool inspection, not bash cat (sandbox mount lags). Verify live behavior only after a deploy.
5. Batch discipline: never mix unverified new games into a bug-fix batch. Batch 1 files are frozen until Anthony confirms the publish.

## Batch 1 (STAGED, waiting on Anthony)

14 files, headlined by the Supabase client fallback that should fix login and all game data loads. After running the .bat: hard refresh douknowball.com, open DevTools console, try login, report the exact error if any. Full file list lives in PUBLISH_GAMES.bat.

## Batch 2 (BUILT, stage only after batch 1 is confirmed live)

New this session:
- src/pages/DealOrNoDeal.tsx (rewritten: Player Edition, final-case swap, smarter banker, offer history, lifetime stats)
- src/lib/dealPlayers.ts (new: market-value pool fetch, flags, compact formatting)
- src/pages/ListQuiz.tsx + src/lib/listQuiz.ts (new game: Name Them All, 15 lists across 10 sports)
- src/pages/PerfectSeasonMlb.tsx + src/lib/perfectSeason.ts + src/lib/perfectSeasonMlb.ts (new flagship: 162-0 Perfect Season, spin-draft-sim; rating formulas verified against 1927 Yankees and 1998 Braves)
- src/pages/HigherLowerTransfers.tsx (new game: endless higher/lower streak on market values)

To stage batch 2:
1. In src/App.tsx, next to the other page imports (around line 70):
   `import ListQuiz from "./pages/ListQuiz";`
   `import PerfectSeasonMlb from "./pages/PerfectSeasonMlb";`
   `import HigherLowerTransfers from "./pages/HigherLowerTransfers";`
   and next to the deal routes (around line 161):
   `<Route path="/list-quiz" element={<ListQuiz />} />`
   `<Route path="/perfect-season-mlb" element={<PerfectSeasonMlb />} />`
   `<Route path="/higher-lower-transfers" element={<HigherLowerTransfers />} />`
2. In src/data/gameRegistry.ts add:
   under Game Shows (or a new Multi-Sport category): `{ path: '/list-quiz', label: 'Name Them All', emoji: '📝', description: 'How many champions can you name?', isNew: true },`
   under Baseball: `{ path: '/perfect-season-mlb', label: '162-0 Perfect Season', emoji: '⚾', description: 'Spin, draft across eras, chase perfection', isNew: true },`
   under Soccer: `{ path: '/higher-lower-transfers', label: 'Transfer Market', emoji: '📈', description: 'Higher or lower on real market values', isNew: true },`
3. Append to the git add line in PUBLISH_GAMES.bat: `src/pages/DealOrNoDeal.tsx src/lib/dealPlayers.ts src/pages/ListQuiz.tsx src/lib/listQuiz.ts src/pages/PerfectSeasonMlb.tsx src/lib/perfectSeason.ts src/lib/perfectSeasonMlb.ts src/pages/HigherLowerTransfers.tsx` (App.tsx and gameRegistry.ts are already listed).
4. _commit_msg.txt: `Four game drops: 162-0 Perfect Season, Name Them All, Transfer Market higher/lower, Deal or No Deal Player Edition`

## Research digest (July 2026)

Futbol11 (futbol-11.com, moving to futbol11.com, ~6.5M visits/month): 19 games. Their top five: Grid (tic-tac-toe career grid), Build-a-XI (place a player per country into a formation), Bingo (12-criteria board, players revealed one at a time), Goltexto (similarity-score guesser), Top10 lists. Retention playbook to copy: midnight reset, cross-game daily score in the header, per-game streaks, share cards, hub cross-linking, self-selected difficulty (timers and pool choices), no accounts required. Monetization: pure programmatic ads including a sticky outstream video player.

38-0.app (the site from the Miniminter video, 3.5M+ players): pick a formation, spin a wheel that only lands on club-season squads that can still fill a need, draft one player per spin with that season's rating, no player twice, then sim 38 games weighing squad strength plus luck. Chase the perfect season. Modes: daily one-attempt, hard mode (hidden ratings), one-club XI, nations event, 1v1. The relevant precedent: real names and season data used descriptively, zero logos or likenesses, explicit non-affiliation disclaimer.

Family tree of the genre: 82-0.com (NBA), 20-0.com (NFL, Classic vs hidden-ratings mode), 17-0game.com. White space nobody owns yet: MLB 162-0, NHL 82-0, F1 season.

Box2Box Show formats that convert: Footy Tic Tac Toe (adversarial grid, blocking matters), Career Path reveal ladders, Guess the Value Get the Player (trivia earns squad pieces), letter and shirt-number quickfire gauntlets. Clique Productions (NBA): constraint rebuilds, redrafts, what-if sims. Jesser: clue-shop secret player. JxmyHighroller: anonymized stat-line detective.

## THE LIST (grouped, numbered)

### A. Ship and stability
1. [STAGED] Supabase client fallback so deploys without env vars still connect (the login and games fix).
2. [DONE] Root cause diagnosis: zero requests reaching a healthy database, project ACTIVE_HEALTHY, anon key verified identical to live key.
3. [DONE] RLS plus public read-only policy on all 81 exposed tables.
4. [PENDING] Anthony runs batch 1, reports login console result.
5. [PENDING] If login still fails: check Supabase Auth Site URL and redirect URLs include https://douknowball.com, and Lovable build env vars.
6. [PENDING] Verify all 14 batch-1 changes on the live site page by page.
7. [PENDING] Set up a repeatable smoke-test checklist (login, one game per sport, share button, mobile viewport).
8. [PENDING] Investigate Lovable build env vars so the fallback becomes a safety net, not the primary path.

### B. Home screen
9. [STAGED] Soccer category ordered first.
10. [PENDING] Poll of the Day: auto-rotating daily matchup poll (two teams, tap to vote, results bar). Client-side rotation from a curated fixture list; AI-written blurb optional later.
11. [PENDING] Most Played Today: top 3 games by real completions, pulled from our own analytics table (create game_completions table with RLS-safe insert), must render on mobile.
12. [PENDING] Games-played-today stat wired to real completions instead of a placeholder.
13. [PENDING] Replace one hero stat with days-logged-in for signed-in users.
14. [PENDING] Remove Today's Daily Game section.
15. [PENDING] Search stays as is; audit result quality once registry grows past 60 games.
16. [PENDING] Cross-game daily score in the header, Futbol11 style (X correct, Y games today).

### C. Site-wide UX
17. [STAGED] Scroll to top on every new navigation; Back preserves position.
18. [STAGED] Back button in GameNavbar across 34 game pages.
19. [STAGED] Removed duplicated bottom How to Play list on 52 games.
20. [PENDING] Play Next rework: recommend by variety (different sport or format), not the adjacent registry entry.
21. [PENDING] Mobile layout audit of every game (Most Played missing on mobile is one known case).
22. [PENDING] Tablet breakpoint pass.
23. [PENDING] Rules shown on game entry: one-line goal plus a How to Play popover; question mark top-right stays.
24. [PENDING] Add nav to any game pages still missing GameNavbar (CBB one is staged; sweep the rest).
25. [PENDING] Loading and error states for every DB-backed game (skeletons, retry button, friendly failure copy).
26. [PENDING] Consistent share cards: every game ends with an emoji-grid share block.
27. [PENDING] Sitewide midnight reset convention for daily games, with a countdown to next puzzle.
28. [PENDING] Audit all CTAs for dead buttons and mislabels (Skip vs Hint class of bugs).

### D. Autocomplete and validation (site-wide)
29. [PENDING] Shared PlayerAutocomplete component: type 3+ letters, debounced DB search, accent-insensitive, surname matching, centered and capitalized suggestions.
30. [PENDING] Valid-only guesses: input resolves to a real entity from the game's eligible pool or it cannot be submitted.
31. [PENDING] Fix suggestion text not matching typed letters (normalization bug).
32. [PENDING] Build Your 5: court position slots selectable, no full-name requirement, reject invalid players at entry, fix submit-time rejection of valid lineups.
33. [PENDING] Case and diacritic handling everywhere (Mbappe matches Mbappé).
34. [PENDING] Names always displayed centered and capitalized.

### E. Data expansion
35. [DONE] transfer_path_puzzles loaded, then mass-generated to 970 puzzles (104 easy one-step, 710 two-step, 156 hard three-step), every one validated as solvable against the game's own career graph, hints auto-written from real shared clubs. shirt_number_puzzles loaded (32). Live in the database now, no publish needed.
36. [DONE] Database verified: ~165 tables, roughly 1.3M rows, all game reads healthy.
37. [PENDING] NFL players and rosters wired for autocomplete (DE for Bears must suggest correctly). nflfastr_rosters has 60K rows; connect it.
38. [PENDING] Fill or retire empty tables: fantasy_draft_players, ballon_dor, world_records, stat_leaders, all_star_selections, cfb_heisman_winners, world_cup_player_stats, olympic_medalists, nba_player_team_seasons, href_nhl_player_seasons. Retire duplicates superseded by v2 tables (ufc_fights, stanley_cup_finals, halls_of_fame).
39. [IN PROGRESS] Individual awards: ballon_dor table seeded with 76 clean winner rows (men 1956-2025, women 2018-2025) rescued from misaligned scrape data in individual_awards_v2. Live now. Still to add: Golden Boot, MVPs across sports for Bingo criteria.
40. [PENDING] Expand beyond big-name players in every game: difficulty tiers driven by market value, career length, or draft round.
41. [PENDING] Deduplicate player_market_values by player-year on write, add indexes for autocomplete queries (ilike on player_name).
42. [PENDING] Per-sport eligible-player views to make valid-guess pools cheap to query.
43. [PENDING] England flag emoji fix in shirt_number_puzzles (re-run pzzad-resync/P5_shirt_number.sql if rendering bugs).
44. [PENDING] NFL play-by-play stays out of scope until a source is found; NFL games that need it stay blocked and hidden.

### F. New games (from research, ranked)
45. [BUILT] Name Them All list quiz, 15 lists across 10 sports, relaxed and timed modes.
46. [BUILT] Perfect Season engine v1 for MLB (162-0): spin team plus era wheel with no dead spins, draft by position with season ratings, animated sim with skip, share card. White space nobody owns.
47. [LIVE] Perfect Season NHL 82-0 on the shared engine: franchise plus decade wheel (222 entries), skater ratings from points per game, goalies from draft pedigree (no goalie stats exist in our data), verified live at /perfect-season-nhl.
48. [PENDING] Perfect Season NBA and NFL variants (differentiate from 82-0.com and 20-0.com with cross-era spins and our rarity data).
49. [PENDING] Soccer Grid upgrade toward Futbol11 Grid: difficulty modes, choose-cell-on-multi-fit, rarity scores from a guess-log table.
50. [PENDING] Build-a-XI: 11 random countries, place one valid player per country into a formation, timer options. Reuses FORMATIONS from squadDeal.
51. [PENDING] Sports Bingo: 12-criteria board, random players revealed one at a time, place or skip.
52. [PENDING] Goltexto-style similarity guesser: similarity score from club history, league, position, age, nationality overlap. Few clones exist, high wow factor.
53. [LIVE] Career Ladder (soccer): career revealed stint by stint, suggestion-only guessing so invalid names are impossible, 1000 point scoring, verified live at /career-ladder. Daily-seed mode still to add.
54. [PENDING] Guess the Value, Sign the Player: guess market value within a band to add the player to your XI, 11 rounds, rate the squad.
55. [BUILT] Higher/Lower: Transfer Market (endless streak on market values, best streak saved on device).
56. [PENDING] Stat Detective daily (NBA, NFL, MLB): anonymized stat line plus era hints, Poeltl-style attribute feedback arrows.
57. [PENDING] Missing XI: show a famous lineup with one player blanked, name the missing man.
58. [PENDING] Pointless/Goalless mode: score by rarity, lowest total wins, needs the guess-log table from item 49.
59. [PENDING] Alphabet Sprint quickfire: 60 seconds, name a valid player per letter or shirt number.
60. [PENDING] Clue Auction secret player: start with 100 points, buy clues, guess anytime.

### G. Per-game fixes
61. [BUILT] Deal or No Deal: Player Edition (cases hold real footballers at market value, flags not faces), classic keep-or-swap ending, EV-based banker with mood noise, offer after each late case, offer history, lifetime localStorage stats, better verdict and share copy.
62. [PENDING] Deal or No Deal next round: NBA and NFL player editions (contract values), daily case seed, banker taunt lines, sound toggle.
63. [PENDING] Squad Deal: review balance, ratings spread, and end-screen evaluation copy.
64. [STAGED] NBA Starting 5 spinner speed.
65. [STAGED] Football Timeline clearer ordering instruction (earliest at top).
66. [PENDING] Timeline: add explicit top and bottom anchors plus an example in the popover.
67. [STAGED] World Cup game: Skip renamed to Hint.
68. [PENDING] World Cup game: broaden beyond World Cup winners since it guesses World Cup players generally; more hint tiers.
69. [STAGED] Higher/Lower end-game comments rewritten (no nan, three variations per tier, not British).
70. [PENDING] Draft Guesser: more personal hint ladder (college story, draft-day fact, career highlight), each hint reveals more; include later-round picks by difficulty tier.
71. [PENDING] Connect 4 grids: richer clue types (shoe deal, cover athlete, one-club man), more puzzles per sport.
72. [PENDING] NBA Chain: baseball-style fixed pick count, par and over-under scoring, target chains, non-star pool tiers.
73. [PENDING] College Grid: more categories and rarities to match the NFL grid depth.
74. [PENDING] Guess the College: more puzzles and clue variety.
75. [STAGED] Guess CBB Team: top nav added; [PENDING] verify programs actually load once the client fix ships (empty-load bug was almost certainly the fetch failure).
76. [PENDING] Footle: verify daily and unlimited work post-fix, then improve keyboard and feedback.
77. [PENDING] Connections: verify post-fix, then load more puzzle batches (250 exist, target 1000+; puzzles are hand-curated so budget time).
78. [PENDING] Career Quiz: verify post-fix, add difficulty tiers.
79. [PENDING] Guess the Club: verify load post-fix, then text-only clue variant (no crests ever).
80. [PENDING] Guess the Pro Team: click highlights but does not auto-start; add explicit Start button; then build the athlete version with the same clue format for every player in the DB.

### H. Conquest overhaul
81. [PENDING] Team abbreviations centered on area mass of each territory.
82. [PENDING] Team colors per territory from a team_colors table (hex pairs per franchise, hand-curated, colors are not trademarks when used as plain colors).
83. [PENDING] Shared states split by real geography (Browns and Bengals split Ohio by county proximity to city coordinates; Jags, Dolphins, Bucs split Florida; etc.).
84. [PENDING] Unoccupied-state capture: merge blob, single centered label; decide the bonus (free-agency pick or +1 rating point, pick one and test).
85. [PENDING] Power-up icons per type, centered.
86. [PENDING] Power rankings panel that updates per conquest and drives win probability (better team wins more often, upsets still possible).
87. [PENDING] Free agency tab on the opposite side.
88. [PENDING] Offense, defense, and overall ratings per team, seeded from our stats plus judgment.
89. [PENDING] Play-by-play sim with Skip to result button, attack arrows showing who is attacking whom, home-field advantage, bigger rosters.
90. [PENDING] Roll Conquest out to every sport once the NFL version is right; zoom or hover fix so small states and cities are readable.

### I. Perfect Season engine (shared)
91. [BUILT] Deterministic sim core in src/lib/perfectSeason.ts: seeded RNG, weighted overall, logistic win probability capped at .985, momentum wobble. Perfection rare but reachable for god squads.
92. [BUILT] Wheel spin with no-dead-spin logic (respins internally until the squad can fill an open slot).
93. [BUILT] Season-specific ratings from Lahman (OPS-based bats, ERA plus K/BB arms, verified on real rosters). [PENDING] era normalization pass.
94. [BUILT] Result card with record, overall, spin count, near-miss taunt. [PENDING] table position framing per sport.
95. [PENDING] Mode flags: daily one-attempt, hidden-ratings hard mode, one-franchise mode. Engine doubles as the Conquest match sim.

### J. Accounts and retention
96. [STAGED] Header shows the user's name next to the avatar.
97. [PENDING] Define account incentives: streaks, days logged in, badges, saved stats across devices (Anthony to spec what he wants; proposal: guest-first play, account saves streaks and leaderboards).
98. [PENDING] Sign-up flow: verify post-fix, add inline validation errors so it never silently rejects info.
99. [PENDING] Copy check: use "Log in" (verb, button) and "Login" only as a noun; audit everywhere.
100. [PENDING] Profile page: games played, streaks, best scores, days logged in.
101. [PENDING] Daily streak system with per-game and global streaks, local-first then synced to account.
102. [PENDING] Leaderboards (daily and all-time) once completions are tracked server-side.
103. [PENDING] Badges: first perfect grid, 7-day streak, every-sport-played, etc.
104. [PENDING] Email: confirm Supabase auth email templates and redirect URLs point at douknowball.com.

### K. Copy and writing
105. [STAGED] Em dashes removed from HowToPlay component; Higher/Lower and Footle help rewritten.
106. [PENDING] Full em-dash purge across ~146 files (careful pass, code strings only, never touch logic).
107. [PENDING] Rewrite every How to Play in plain human language, one pass per game, reviewed against the actual mechanics.
108. [PENDING] Kill AI-sounding phrasing sitewide (delve, dive, elevate, unleash); punchy short sentences.

### L. Legal and safety
109. [PENDING] Privacy Policy and Terms review: ads, analytics, accounts, kids, cookie consent if ad networks require it.
110. [PENDING] Sitewide non-affiliation disclaimer (not affiliated with NFL, NBA, MLB, NHL, FIFA, or any league, team, or player; stats used descriptively).
111. [PENDING] IP audit: confirm zero logos, crests, athlete photos, or lifted copy anywhere; flags and colors only.
112. [PENDING] Ad policy sanity check (ad density, consent management platform like the Snigel setup Futbol11 uses).

### M. Growth and monetization
113. [PENDING] Ad slots: standardize placements (one banner under game, one in results screen), then test an outstream video unit.
114. [PENDING] SEO: per-game landing copy is in place; add FAQ schema and internal links between sibling games.
115. [PENDING] Shareability: every result card includes the site URL and an emoji grid that looks good in a group chat.
116. [PENDING] TikTok-ready design: results screens legible in a vertical phone screenshot.

## Next actions, in order
1. Anthony runs PUBLISH_GAMES.bat (batch 1), reports login result.
2. Verify batch 1 live, then stage batch 2 (instructions above).
3. Build Perfect Season MLB engine (items 46, 91-95).
4. Autocomplete component (items 29-34), then wire NFL rosters (37).
5. Grid rarity + guess-log table (49), then Bingo (51) and Build-a-XI (50).
