# R6: The Build Plan

Synthesis date: July 2026. This document merges R1 (soccer sites), R2 (US sports sites), R3 (creator formats), and R5 (UI spec) into one ranked, sequenced plan for reworking all 65 games and shipping the best new ones. Routes below are copied exactly from `src/data/gameRegistry.ts`. MASTER_PLAN item numbers are cited in brackets like [#49] wherever this plan overlaps existing backlog; new work not already tracked has no bracket.

## Executive summary (read this first)

1. The UI foundation (R5's tokens, GameShell, ResultScreen, StatTile, HowToPlay) must land before almost anything else, because every per-game rework below assumes those primitives exist; building them first means every subsequent wave ships faster, not slower.
2. The single highest-leverage new mechanic across all three competitor reports is rarity/percentage scoring (lower-is-better for correctness, higher-is-better for popularity), because it self-calibrates to any skill level and has zero pay-to-win risk; we already prove it works in Soccer Grid.
3. Our clearest whitespace, confirmed by two independent reports (R1 and R2), is a true cross-game daily score in the header; no competitor anywhere has shipped this, and we already produce per-game numeric scores that just need summing [#16].
4. NHL is the weakest-covered sport in the entire competitive landscape (R2 finding 4); an NHL grid and NHL attribute-guesser are close to guaranteed whitespace wins given we already have skater points data.
5. Soccer is the one major sport in our catalog without a Perfect Season / go-unbeaten mode despite having the best supporting data (player_market_values, career graph); every other sport already has one.
6. PlayerAutocomplete [#79] is built but adopted in only one page (NbaLineup.tsx); NbaChain, NbaConnect4, FootballConnect4, and LineupBuilder still run the older bespoke suggestion components it was built to replace, so wiring it everywhere is pure migration work, not new engineering.
7. Two data tables are confirmed poisoned (ncaa_tournament_games, ncaa_basketball_champions, 53 percent false positives) and must not power any new game or grid until a cleanup step exists; this plan proposes nothing that touches them.
8. Three tables show 0 rows (tennis_daily, guess_nation_daily) alongside two games already live on daily routes with those names (/guess-tennis-player, /guess-the-nation); this is either a stale table name or a silent data gap and should be verified before those games get any rework investment.
9. IP safety is a non-issue for the entire plan: every mechanic recommended is grid crossovers, clue reveals, similarity scoring, chemistry math, Wordle-style tile feedback, or rarity scoring, none of it needs logos, crests, or photos, and this document uses flags and text only throughout.
10. Sequencing principle for all 15 waves: shared components before consumers, quick low-risk wins interleaved with risky rebuilds rather than batched together, and user-facing home/header changes land early since they touch every session regardless of which game is played.

---

# PART 1: Consolidated new-game list

Merged and deduped from R1 Part 3, R2 Part 3, and R3 Part 2. Sources that proposed near-identical formats (R1's Chemistry-scored lineup builder and R3's exclusion of the same idea because it is a mode not a page; R1's Frozen-era mystery player and R1's World Cup Statdle mode; R2's NHL grid and NHL guesser treated as one whitespace bet) are consolidated into single entries. Ranked by expected impact-to-effort ratio.

## 1. Rarity Round (Pointless/Goalless-style rarity trivia)

- **Source**: R1 Part 3 #1 (Empty Net), R2 Part 4 finding 6 (nostalgia/rarity as ego reward), R3 Format 2 (Rarity Round), all three reports independently converge on this as a top priority; this is also MASTER_PLAN [#58] Pointless/Goalless mode.
- **Spec**: Each day shows a trivia category (Ballon d'Or winners since 2000, players with 300+ Premier League appearances, World Cup winning captains). Player gets 3 guesses to name answers that are correct but as obscure as possible. A precomputed rarity rank (not live survey data, since we lack submission volume at launch) scores each correct answer; lowest total score across 3 rounds wins, 0 is a perfect "Goalless" run. Input is PlayerAutocomplete constrained to the category's valid pool. Scoring: sum of rarity ranks, displayed as "You found a 12-point answer" per Pointless convention. Share card shows the 3 answers found plus their rarity ranks out of the category's full pool.
- **Data readiness**: ballon_dor (76 clean rows) is ready to use immediately as one category. Additional categories can be built from player_market_values and career_players/career_seasons for threshold-based prompts (300+ apps, position, nationality). No new data required to launch with 3-5 categories; more categories are content curation, not engineering.
- **Size**: S.
- **Expected appeal**: High. Zero autocomplete complexity beyond what Career Quiz already solved; self-calibrates to any skill level (R2 finding 10); the format with the most cross-report validation of anything on this list.

## 2. Missing XI (lineup recall)

- **Source**: R1 Site B item 1 (Missing 11) and Part 2 #13 (Perfect Season / go-unbeaten validation via lineup-builder.co.uk's 38-0-0), R3 Format 3 (Missing XI), this is MASTER_PLAN [#57].
- **Spec**: Player sees a real historic match (competition, date, final score, formation diagram with position labels but no names) and fills all 11 starters for one team via PlayerAutocomplete. Each correct guess fills its slot; 3 wrong guesses ends the round and reveals the rest. Score is correct-out-of-11 plus a time bonus if timed mode is chosen. Daily puzzle, one match per day. Share card renders an 11-cell box grid, green check on filled slots, gray dash on missed ones, reading clearly even compressed.
- **Data readiness**: Needs new content: a table of historic match lineups (competition, date, team, formation, 11 names, positions). Nothing in player_market_values or the career graph covers match-day lineups. Estimate 50-100 curated matches to launch (World Cup finals, Champions League finals, famous derbies for name recognition), sourced from public match reports.
- **Size**: L. Mechanic is simple (structurally close to existing autocomplete-guess games); the cost is building and verifying a clean lineup dataset from nothing.
- **Expected appeal**: High. Validated by at least 5 independent competitor sites (R1: Missing11, Starting11, My Greatest 11, Guess The Lineup, Lineup Builder's Guess the Player) as a broad, proven genre, and nests one mini-Wordle-style guess per slot for more play time per session.

## 3. Chemistry score layer (mode addition, not a new page)

- **Source**: R1 Site B item 11 (SuperDraft Soccer) and Part 2 #4 and Part 3 #3, R2 Part 4 finding on synergy bonuses (17-0game.com, Sleeper's 17-0).
- **Spec**: A shared utility implementing EA FC-style chemistry math: club overlap (2/4/7 players scores 1/2/3 pts), nationality overlap (2/5/8 players), league overlap (3/5/8 players), 3-pt cap per player, summed for a lineup total (soccer max 33). Wired into the post-game summary of World XI, Build Your XI, and Perfect Lineup as a second, replayable score axis alongside whatever those games already score. No positional requirement to keep the math simple.
- **Data readiness**: player_market_values already has club and nationality; league needs a lightweight club-to-league lookup companion table (small, one-time build). Zero new player-level data.
- **Size**: S (the math is a pure function; the real cost is the club-to-league lookup table, itself small).
- **Expected appeal**: High relative to cost. Turns three existing games into replayable optimization puzzles without new content.

## 4. Attribute-tile hybrid guesser (Footle upgrade or standalone)

- **Source**: R1 Site B item 7 (Who Are Ya) and Part 2 #10, R1 Part 3 #5, this is the single most cross-referenced UI pattern in R1.
- **Spec**: Mystery player guessed via PlayerAutocomplete (not letter-by-letter); each guess returns a row of colored attribute tiles (nationality match, position match, club match, age closer/further with an arrow, market-value closer/further with an arrow, shirt-number closer/further with an arrow). Uses the R5 StatTile component directly. Ship as a secondary feedback layer added to Footle rather than a new page, since Footle already has the stat-clue system this complements.
- **Data readiness**: Fully covered by player_market_values plus shirt_number_puzzles (32 rows, enough for the number column on any puzzle where the target has a row). No new data.
- **Size**: M (mostly UI work once StatTile exists from the R5 foundation wave; the comparison logic itself is straightforward).
- **Expected appeal**: High. Confirmed appearing in some form on Who Are Ya, Wordlecup, and implied by Statdle; the single most requested-by-proxy mechanic in R1.

## 5. Soccer Perfect Season / Unbeaten mode

- **Source**: R1 Part 2 #13 and Part 3 #7 (lineup-builder.co.uk's 38-0-0/8-0-0), confirms soccer is the one sport in our catalog missing this despite having the strongest supporting data.
- **Spec**: Spin for a real club-season, draft one player from that squad into a formation slot, repeat until an XI is full, then run the existing perfectSeason.ts deterministic sim to see if the lineup could go a season unbeaten. Daily challenge with shared seed, hard mode with hidden ratings, matching the near-universal genre convention [#118 covers hard mode/daily-challenge for the other 4 Perfect Season games already; this extends the family to soccer].
- **Data readiness**: The simulation core already exists and is proven across MLB/NBA/NFL/NHL (perfectSeason.ts). Source club/season data from player_market_values (club, year columns) and career_players/career_seasons for individual spans. Lowest net-new-code item on this whole list since the hardest part is already built.
- **Size**: S (reuses existing engine; mainly wiring soccer-specific data into the wheel and draft steps).
- **Expected appeal**: High. Direct genre validation from a live competitor plus near-zero engineering risk.

## 6. NHL Immaculate-Grid-style skater grid

- **Source**: R2 Part 3 #1, confirmed NHL is the thinnest-covered sport in every category researched.
- **Spec**: New route (e.g. /hockey-grid), same 3x3 mechanic as our existing Soccer Grid/Football Grid/College Grid (row/column = team or stat threshold), rarity scoring reused from the same pattern. Scoped to skaters only since there are no goalie stats in our data, mirroring how competitor Gridlocked Hockey splits skater and goalie grids as precedent for scoping around a data gap.
- **Data readiness**: NHL skater points data already exists per the known constraints. Sufficient for team/stat-threshold criteria. No goalie rows, no new data needed for a skater-only launch.
- **Size**: M (new route, but reuses the grid engine and rarity-scoring pattern already proven three times).
- **Expected appeal**: High. Confirmed whitespace with zero incumbent breakout despite 4+ competitors trying.

## 7. NHL attribute guesser (skater-only)

- **Source**: R2 Part 3 #2, same NHL-whitespace rationale as #6 above; pairs naturally with it.
- **Spec**: Expand /hockey-career or ship as a new route using the standard 7-column Poeltl/Weddle/MLB Pickle template: team, conference, division, position, age, jersey number, plus handedness as the sport-specific twist column. Green/yellow/gray tile feedback, 8 guesses, PlayerAutocomplete input. Scoped to skaters only for the same goalie-data-gap reason as #6.
- **Data readiness**: NHL skater points data covers the standard template. No new data needed.
- **Size**: S-M (straight application of a well-understood template to data we already have).
- **Expected appeal**: High, same whitespace rationale as #6; ship together as a themed pair.

## 8. Guided question-tree guesser (20-Questions style)

- **Source**: R1 Site A item 17 (Guess the Footballer) and Part 3 #4.
- **Spec**: A structured, tap-only question interface, not free text: player picks from a fixed menu of question types (club, country, position, league, age range, market value bracket), each answered yes/no/sometimes, 3 final guesses. A running "X players remain" counter updates after each answer for a narrowing-the-field visual. Fully distinct input paradigm from everything else on the site (we have autocomplete, clue-reveal, and attribute-tile, but nothing tap-only-narrowing).
- **Data readiness**: player_market_values plus career_players/career_seasons give clean yes/no answerable facts. Build as a decision-tree UI over a filtered player pool. No new data.
- **Size**: M (the UI/decision-tree logic is new; the underlying facts are all queryable from existing tables).
- **Expected appeal**: Medium-high. Genuinely novel input paradigm for our site, but a narrower audience than autocomplete-based games since it is more deliberate/slower-paced.

## 9. Pack Battle (football trumps / stat-line duel)

- **Source**: R3 Format 1, R1 Part 3 #6 (Statto Chain), same mechanic proposed independently by both reports.
- **Spec**: Daily pack of 5 mystery player cards, one at a time. Before flipping each card, one revealed stat category (market value, and if a clean per-player stat table is confirmed, goals/assists/appearances) is shown; player guesses whether the hidden card beats a running high-score card already held, Top Trumps style. Correct calls keep the card active for the next comparison; one wrong call busts the pack. Score is the sum of banked stat values. Share card shows a 5-card strip with green/red pips per call plus final banked score.
- **Data readiness**: player_market_values (171K rows) covers the value axis outright with zero new data as a safe fallback. Non-value stat categories (goals, assists) need confirmation of a clean per-player career-totals table before committing beyond value-only.
- **Size**: M. Core loop is simple higher/lower chaining (already proven in /higher-lower-transfers); the new work is the pack/bust wrapper and card-flip UI.
- **Expected appeal**: Medium-high. Deepens an already-proven mechanic (higher/lower) with a bust-risk layer that adds real tension.

## 10. Stadium Detective (guess the ground, unlock the player)

- **Source**: R3 Format 7, sourced from Box2Box's "Guess the Stadium, Get the Player."
- **Spec**: Progressively revealing text clues about a stadium (capacity, opening year, city, notable finals hosted, tenant club's nickname, never the club or stadium name itself), guess the stadium via free text or a curated list; a correct guess reveals one player tied to that ground and adds their card to a running session squad. 5 stadiums per day.
- **Data readiness**: Needs a small curated stadium-facts table (name, capacity, city, opened year, tenant club, notable events). New but lightweight, roughly 50-100 major stadiums to launch.
- **Size**: S-M. Simple guess loop; the cost is curating clean stadium facts, entirely text-based per the no-logos rule which fits naturally here.
- **Expected appeal**: Medium. Solid variety addition, lower urgency than the top formats above since it does not fill a clear competitive gap the way Rarity Round or the NHL formats do.

## 11. Trivia Draft (correctness-gated fantasy draft)

- **Source**: R3 Format 8, sourced from Clique Productions' "NBA Trivia Draft."
- **Spec**: Player answers a trivia question each round; a correct answer unlocks a random player from a matching pool into their squad (correctly naming a Ballon d'Or year unlocks a random Ballon d'Or-adjacent player); a wrong answer skips that round. After a fixed number of rounds, the assembled squad is rated using the existing playerRating function from src/lib/squadDeal.ts.
- **Data readiness**: Fully covered by ballon_dor plus World Cup data already in the database, plus the existing playerRating export in squadDeal.ts. Zero new data.
- **Size**: S. Largely a remix of two systems we already have (trivia banks plus squad rating), closer to a content wrapper than new engineering.
- **Expected appeal**: Medium. Cheap to build given it reuses existing infrastructure end to end, good filler wave content once higher-priority items ship.

## 12. Career Contexto (differentiated similarity guesser)

- **Source**: R1 Site C, R3 Format 4, both explicitly caveat this is only worth building if clearly differentiated from our existing Who Am I.
- **Spec**: Keys similarity purely off the clean 151-player career graph (shared clubs, shared leagues, overlapping years, nationality, position) rather than Who Am I's existing 7-factor formula, and presents it as a numbered rank (1 = the secret player, higher = less similar) Contexto-style rather than Who Am I's current percentage feedback. Unlimited guesses, no strikes, pure exploration toward rank 1.
- **Data readiness**: Fully covered by the existing clean 151-player career graph. Cheapest format on this list from a data standpoint.
- **Size**: S.
- **Expected appeal**: Medium, explicitly conditional. Build only if product wants a second Contexto-style game distinct enough to avoid cannibalizing Who Am I; do not build as a default priority.

## 13. Frozen-era mystery player (World Cup extension)

- **Source**: R1 Part 2 #12 and Part 3 #8 (Time Capsule / Statdle-style era-freeze).
- **Spec**: Pick a specific past World Cup year (or any past year for a Footle-style extension); the mystery player's clues (club, market value, age, position) are locked to that specific year rather than current/final career state, letting the same real person generate a fresh, differently-difficult puzzle depending on which year is picked. Fold into the existing World Cup game (/world-cup) as a mode rather than a new page.
- **Data readiness**: player_market_values already has a year column spanning 2004-2026. Close to zero new data, purely a query and UI change layered onto existing World Cup or Footle infrastructure.
- **Size**: S.
- **Expected appeal**: Medium-high relative to cost. Multiplies replay value from data already in hand; very cheap to ship as a mode rather than standalone.

## 14. The Ringer (single-player imposter/clue-spotting)

- **Source**: R3 Format 5, adapted single-player from playfootball.games' multiplayer "Rondo Ringer."
- **Spec**: Player is shown 4 clues about a consensus mystery player and must spot which one of the 4 clues is actually about a different, decoy player (the "ringer" clue) rather than guessing the player's identity outright. Score is based on correctly flagged decoy clues across a set of rounds. Preserves the "spot the odd one out" tension without needing real-time multiplayer infrastructure.
- **Data readiness**: Needs curated clue sets per player (true attributes plus one plausible-but-false attribute borrowed from a similar player). Can bootstrap from the same tables backing Career Quiz and Stat Detective; work is clue-pair curation, not new data sourcing.
- **Size**: M. Removes the hardest part of the source format (live multiplayer voting) but still needs careful clue-pair design to avoid pairs that are trivially obvious or unfairly ambiguous.
- **Expected appeal**: Medium. Genuinely different mechanic, but curation-heavy and less proven at scale than the top-ranked items.

## 15. Untouchables (protect-5, rebuild the rest)

- **Source**: R3 Format 6, sourced from KOT4Q's rebuilding-challenge video family.
- **Spec**: Player is given a real historic team roster and must choose exactly 5 "untouchable" players to keep; the remaining roster is auto-traded away using a value-weighted return, and the resulting mini-squad's simulated performance is scored using the existing perfectSeason.ts engine. Framed as a new entry point on top of the existing simulation core rather than a new simulator.
- **Data readiness**: Soccer version well-supported by player_market_values; NBA/NFL/NHL versions reuse whatever roster/season data already backs those sports' Perfect Season games.
- **Size**: M, mostly because it should be built as a mode inside the existing Perfect Season family [#95 already covers Perfect Season mode flags including one-franchise mode] rather than shipped as its own page.
- **Expected appeal**: Medium. Solid variety, best positioned as a fold-in to [#95] rather than a standalone wave item.

### Explicitly not recommended as new pages (folded into existing items or excluded)

- **Fan Favourites / Crowd Says (popularity trivia)**: R1 Part 3 #2 proposes this as the mirror image of Rarity Round, sharing nearly all backend. Recommend shipping as a second mode of the Rarity Round page (item 1 above) rather than a 16th standalone entry, since it needs the same submission-percentage infrastructure and the two modes together justify one build.
- **Bracket Battle (community vote add-on)**: R3 Format 10. Not a standalone game; a results-screen add-on requiring event-logging infrastructure that ties to streak/leaderboard work [#101, #102]. Track as part of that infrastructure, not this new-game list.
- **Career Contexto for Baseball/Hockey**: R3 Format 11 (bonus). Explicitly flagged L-difficulty because the similarity-graph groundwork does not exist for those sports. Defer until after soccer's Career Contexto (item 12) proves out, if it ships at all.

---

# PART 2: Per-game rework spec

Grouped by category exactly as in `gameRegistry.ts`. Every block cites the route, size, and concrete deltas pulled from research; MASTER_PLAN items are cited in brackets.

## Soccer

### Transfer Market - `/higher-lower-transfers` (S)
- Already one of the newer-shell pages (R5's Problem 1 reference point for the "narrow" width). Add Pack 11-style player-selectable stat category (pick which of several shown stats to wager on) instead of one fixed axis [R1 Part 2 #9].
- Adopt R5 tile-flip/pop-correct/shake-wrong animations on the reveal moment; currently has zero reveal animation per R5 Problem 5 audit.
- Migrate to `<ResultScreen>` and `<GameShell>` once built (R5 Phase 2 names this page as the second re-skin target).
- Already produces a streak-based emoji grid; verify it matches the mandatory-emoji-grid rule in R5 3.6 once ResultScreen lands.

### Career Ladder - `/career-ladder` (S)
- Tighten reveal-or-skip loop to the proven 4-5 clue reveal / guess-or-skip / hard-stop-at-N+1 ratio from Futbol11 Legacy/Link [R1 Part 2 #7].
- Daily-seed mode still outstanding [MASTER_PLAN item 53/#136].
- Adopt StatTile for each career-stop reveal once built.
- Add rarity scoring to the final result (percent of players who reached the answer in fewer clues) once submission-volume infrastructure exists.

### Who Am I? - `/who-am-i` (S)
- Expose a configurable max-guess setting (10/20/100, Goltexto-style) instead of a fixed cap, letting cautious and expert players both self-select difficulty from one puzzle [R1 Part 2 #3].
- Already ahead of both competitor implementations on transparency and score-floor UX (documented 7-factor formula, floors at 0); no change needed to the scoring algorithm itself, only the guess-count option.
- If Career Contexto (Part 1 item 12) ships, ensure clear differentiation messaging so the two do not read as duplicates.

### World XI - `/world-xi` (M)
- Add the Chemistry score layer (Part 1 item 3): club/nationality/league overlap scoring on the post-game summary [R1 Part 2 #4].
- Needs the club-to-league lookup table shared with Build Your XI and Perfect Lineup below.
- Adopt PlayerAutocomplete if not already using the shared component (verify against the four confirmed holdout pages).

### Player Bingo - `/player-bingo` (S)
- Add a "Bingo Retro" style variant restricted to retired legends only, matching Futbol11's proven reskin-for-more-content pattern [R1 Site A item 19].
- Reinforce the existing strategic depth (saving universal players for hardest categories) in the How to Play copy once generalized [R5 3.7].
- Add richer clue types per MASTER_PLAN [#71 applies the same "richer clue types" ask to Connect 4; extend the same audit to Bingo's 12 criteria].

### Alphabet Sprint - `/alphabet-sprint` (S)
- Add a Futbol List a-style partial-credit win condition (get at least half the letters to count as a win) instead of requiring a full A-to-Z sweep, directly copying a real post-launch tuning decision another site made for the same churn problem [R1 Part 2 #15].
- Adopt shake-wrong animation on an invalid/duplicate submission [R5 4.2].

### Clue Auction - `/clue-auction` (S)
- No direct competitor equivalent found in any of the three reports; already differentiated. Only deltas: adopt ResultScreen/StatTile once built, and verify emoji-grid share output exists [#26, #115].

### Footle - `/footle` (M)
- Add the Who Are Ya attribute-tile feedback pattern (Part 1 item 4) as a secondary feedback layer alongside the existing stat-clue system; this is the single most broadly reusable pattern found across all research and directly strengthens an already-shipped game [R1 Part 2 #10].
- R5 names Footle as the first page to receive GameShell/StatTile/ResultScreen/HowToPlay, since it is the most structurally complex existing page (modal, mode toggle, difficulty pills, board, legend, PostGameStats); if the shared components survive Footle they survive everything else.
- Keyboard and feedback improvements still pending [MASTER_PLAN #76].
- Currently `max-w-7xl`, moves to the new `wide` GameShell variant (`max-w-4xl`) per R5 3.1, since the actual content (search bar plus guess board) does not need full `max-w-7xl` on desktop.

### Career Quiz - `/career` (S)
- Add difficulty tiers [MASTER_PLAN #78], matching the near-universal Easy/Normal/Hard/Legend convention found on nearly every Futbol11 game [R1 executive summary point 6].
- Adopt PlayerAutocomplete and StatTile once available.

### Higher or Lower - `/higher-lower` (M)
- Adopt Pack 11's player-selectable stat category (pick which of 5 shown stats to wager on) instead of one fixed stat per comparison [R1 Part 2 #9], same treatment as Transfer Market above; consider sharing the wager-category component between both games.
- Rewritten end-game comments already shipped [MASTER_PLAN item 69]; no further copy work needed here.

### Connections - `/connections` (M)
- Adopt an explicit design rule excluding player-position groupings as a category axis, forcing the puzzle generator toward deeper trivia (transfer paths, shared awards, nationality-plus-club combos) [R1 Part 2 #5, sourced from playfootball.games' own stated design constraint].
- Add a Hard mode that reuses the exact same daily puzzle but caps total mistakes at a stricter number, copying Futbol11 Connections' "same content, harder fail-state" trick; zero new puzzle content required [R1 Part 2 #6].
- Puzzle pool already grown 250 to 1000 [MASTER_PLAN item 77]; this rework is purely mechanic depth, not content volume.

### Build Your XI - `/build-your-xi` (M)
- Add the Chemistry score layer (Part 1 item 3), same treatment as World XI above [R1 Part 2 #4].
- Shares the club-to-league lookup table with World XI and Perfect Lineup.

### Perfect Lineup - `/perfect-lineup` (L)
- Split into an explicit "Perfect Season / go-unbeaten" mode matching the format spec in Part 1 item 5, since soccer is the one sport in our catalog missing this despite having the strongest supporting data [R1 Part 2 #13, Part 3 #7].
- Also add the Chemistry score layer as a second scoring axis on the existing build mode [R1 Part 2 #4].
- This is the largest single soccer rework on this list because it is effectively adding a new game mode (full Perfect Season sim) on top of an existing page; treat the go-unbeaten mode as sharing implementation with Part 1 item 5 rather than double-building.

### Connect 4 - `/football-connect-4` (M)
- Richer clue types (shoe deal, cover athlete, one-club man) and more puzzles per sport [MASTER_PLAN #71].
- Still on the older bespoke suggestion component (FootballConnect4Suggestions), not the shared PlayerAutocomplete; migrate as part of the sitewide autocomplete sweep [#79 built, adoption pending].

### World Cup - `/world-cup` (M)
- Add the Statdle-style "freeze the era" mode (Part 1 item 13): pick a specific past World Cup year, clues describe the player only as they were that tournament [R1 Part 2 #12].
- Skip already renamed to Hint and hint tiers broadened [MASTER_PLAN items 67, 68]; this rework is additive on top of that completed work.

### Guess The Club - `/guess-soccer-club` (S)
- Add the Guess the Footballer-style guided question-tree input mode (Part 1 item 8) as an alternative to the current daily-clue format; genuinely different input paradigm, fully IP-safe (text questions only) [R1 Part 2 #11].
- Text-only clue variant still pending [MASTER_PLAN #79]; these two items should ship together since both are about diversifying the input/clue system away from crests.

### Soccer Grid - `/soccer-grid` (L)
- Add difficulty tiers (Easy/Normal/Hard/Legend) and let players pick which empty cell to attempt next instead of a fixed order [R1 Part 2 #1, MASTER_PLAN #49/#92, this plan confirms it as the correct competitor-validated priority].
- Add a timed mode (40s/60s/90s/unlimited) as a second, purely presentational difficulty axis needing no new data [R1 Part 2 #2].
- Add "Overtime": do not hard-stop on a wrong guess with cells remaining, matching Immaculate Grid's own post-launch fix for the exact frustration [R2 Part 2 #2]; verify current hard-stop behavior first.
- Add spoiler-gated share links (a link that hides a friend's answers until they finish their own attempt) as a more copy-worthy sharing mechanic than the current emoji block [R2 Part 2 #1].
- Preserve in-progress grid state across a session rather than resetting, exploiting the Zeigarnik effect (a partially filled grid is a more naggy, spatially obvious open loop than an abstract letter guess) [R2 Part 4 finding 9].
- We already compute real rarity scores correctly from soccer_grid_selections; this is purely a variety and retention pass, not a scoring-algorithm fix.

### 2026 Bracket - `/world-cup-bracket` (S)
- No direct competitor equivalent surfaced in R1/R2/R3; keep as is structurally. Only deltas: adopt GameShell/ResultScreen once built, verify share card includes a compressed bracket-result image per the vertical-screenshot rules [R5 5.3].

### Soccer Career - `/soccer-career` (S)
- No direct competitor equivalent found (this is a BitLife-style life-sim, a distinct genre from anything catalogued in R1/R2/R3). Only deltas: adopt GameShell once built; no mechanic changes recommended by this research pass.

### Fantasy Draft - `/fantasy-draft` (S)
- Clique Productions' "trivia draft" format (Part 1 item 11) is a variant of this same shape; consider whether to fold a correctness-gated mode into this existing page instead of building Trivia Draft as fully separate, since both share the draft-against-constraints structure.
- No other direct deltas found; already differentiated from anything else on the site.

### Shirt Number - `/shirt-number` (M)
- Add a Pack-11-style chained "survival" mode: correct guess advances to a new player, one wrong guess ends the run immediately with no partial credit, as an alternate mode alongside the existing 3-attempt scored mode [R1 Part 2 #8].
- Only 32 rows in shirt_number_puzzles currently; needs pool expansion to support a chained mode with reasonable session length [ties to puzzle-pool-audit task #146].
- Cross-sport port to NBA/NFL flagged in Part 1 as its own low-cost item (R3 Format 9); if built, this page's mechanic is the template.

### Transfer Path - `/transfer-path` (M)
- Add a Missing-11-style "each hop is its own mini-Wordle" layer: once the chain narrows to 1-2 remaining hops, optionally reveal the target's name as a blank-tile letter-guess puzzle instead of pure autocomplete, adding a second skill layer [R1 Part 2 #14].
- 970 puzzles already generated and validated [MASTER_PLAN item 35]; this is a mechanic-depth pass, not a content-volume pass.

### Guess The Value - `/guess-transfer-value` (S)
- Adopt the Career Path Challenge convention of a dynamic guess count based on puzzle difficulty (fewer guesses for widely-known values, more for obscure ones) instead of a fixed count for every puzzle [R1 Part 2 #16].
- Overlaps conceptually with the still-pending "Guess the Value, Sign the Player" squad-building variant [MASTER_PLAN #54]; keep these as two distinct games (one guesses a value directly, the other earns squad slots by guessing correctly) rather than merging them.

## Pro Football

### 17-0 Perfect Season - `/perfect-season-nfl` (M)
- Ship Hard Mode with hidden ratings as the single highest-confidence must-ship feature across the entire Perfect Season family, near-universal and table stakes per every competitor researched [R2 Part 2 #6, MASTER_PLAN #118].
- Add a themed daily-challenge rotation (one-decade-only, single-franchise, alphabet gauntlet), the richest event-mode system found in the whole genre [R2 Part 2 #8].
- Add a synergy/chemistry bonus for real-life pairs (same-team, same-college, same-draft-class, named pairs like Brady+Moss), pure data-driven flavor cheap to compute from existing roster/draft tables [R2 Part 2 #10].
- Consider async head-to-head (challenge a friend to an identical spin sequence) as the MVP version of 1v1, before any live-draft infrastructure [R2 Part 2 #9].
- Cryptographically sign or server-verify final results before any public leaderboard, protecting credibility given results will be shared [R2 Part 2 #11].
- Era normalization pass and table-position framing still pending [MASTER_PLAN #93, #94]; mode flags (#95) cover the daily/hard/one-franchise items above.

### Pro Football Grid - `/football-grid` (M)
- Same three items as Soccer Grid above (Overtime, spoiler-gated share links, in-progress state preservation) since these are the shared /football-grid, /soccer-grid, /college-grid family per R2 Part 2 #1/#2.
- Already has rarity scoring and unlimited mode per R2 executive summary point 5; this is a depth and retention pass, not a scoring fix.

### Timeline - `/football-timeline` (S)
- Explicit top/bottom anchors and clearer ordering instruction already shipped [MASTER_PLAN items 65, 66]; last publish spot-check confirmed [task #1 completed]. No further deltas identified by this research pass.

### Draft Guesser - `/football-draft` (S)
- 4th hint tier and richer personal hint ladder already shipped [MASTER_PLAN item 70]. No further deltas identified; consider difficulty tiers (market-value/draft-round based per [#40]) as the next natural step, consistent with the sitewide difficulty-tier gap R1 identifies.

### NFL Career Path - `/nfl-career` (M)
- Audit against the standard 7-column attribute table (team, conference, division, position, height/weight, age, jersey number) that Poeltl/Weddle/MLB Pickle all converged on, adding a sport-specific twist column if missing [R2 Part 2 #4].
- Apply arrows only to genuinely numeric columns (age, height, weight, jersey number, draft year), not categorical ones, matching the confirmed MLB Pickle/Weddle pattern [R2 Part 2 #5].
- NFL rosters wired for autocomplete still pending [MASTER_PLAN #37]; this is a prerequisite for the column audit above since the roster data is what would populate the missing columns.

### Guess The Team - `/guess-nfl-team` (S)
- No direct competitor equivalent surfaced. Only deltas: adopt GameShell/ResultScreen, verify no logo/crest dependency (should already be text-only per site convention).

### NFL Conquest - `/conquest` (L, tracked separately)
- This game has its own extensive, already-detailed backlog block [MASTER_PLAN section H, items 81-90] covering abbreviations, team colors, geography splits, power rankings, free agency, ratings, and play-by-play sim. Nothing in R1/R2/R3 adds new findings specific to this format (it is a territory-conquest game, a genre none of the three competitor reports covered). Recommend keeping section H as the authoritative spec for this game rather than duplicating it here; sequence it as its own dedicated wave given its size (see Part 3).

## College Football

### College Grid - `/college-grid` (M)
- Same Overtime/spoiler-link/in-progress-state family treatment as the other three grids [R2 Part 2 #1/#2].
- More categories and rarities to match the NFL grid's depth still pending [MASTER_PLAN #73].
- Do not use ncaa_tournament_games or ncaa_basketball_champions for any new category; both are confirmed poisoned (53 percent false positives) [MASTER_PLAN item 74, R2 Part 3 #8]. New categories must come from cbb_programs (186, clean) and cbb_awards (clean).

### Guess The College - `/guess-the-college` (S)
- cbb_programs already expanded 132 to 186 with verified clues [MASTER_PLAN item 74]. No further deltas identified by this research pass; this game is in good shape.

## Pro Basketball

### 82-0 Perfect Season - `/perfect-season-nba` (M)
- Same Hard Mode, themed daily rotation, synergy bonus, async head-to-head, and result-signing items as the NFL Perfect Season entry above [R2 Part 2 #6-#11, MASTER_PLAN #118].
- Consider the 162-0 iOS game's three-tier Classic/Scout/Sicko difficulty ladder (ranked-by-rating, shown-but-alphabetical, hidden-and-alphabetical) as a genuinely clever middle-difficulty option not seen elsewhere [R2 Part 2 #12, R2 Part 3 #7 flags this as best-suited to MLB's clean Lahman data specifically, but the same idea applies here].

### Stat Detective - `/stat-detective` (S)
- Add a silhouette-reveal hint tier, matching Poeltl/Dangle's non-punishing shadow-outline assist mechanic; since we cannot use athlete photos, consider a blurred jersey-number or stat-bar badge as the IP-safe equivalent, fitting into the existing hint ladder (`hintsFor`, `nextHintAt` in statDetective.ts) [R2 Part 2 #3].
- Already well-regarded structurally; this is a single hint-tier addition, not a rework.

### NBA Starting 5 - `/nba-starting-5` (S)
- Spinner speed already fixed [MASTER_PLAN item 64]. Build Your 5 validation fixes (court position slots, reject invalid players at entry) in progress [MASTER_PLAN #32, task #82 in_progress]. No new research-driven deltas beyond finishing that in-progress work.

### NBA Connect 4 - `/nba-connect-4` (M)
- Richer clue types and more puzzles [MASTER_PLAN #71, same treatment as the football Connect 4].
- Still on the older NbaPlayerSuggestions component, not the shared PlayerAutocomplete; migrate as part of the sitewide sweep.

### NBA Chain - `/nba-chain` (M)
- Baseball-style fixed pick count, par and over-under scoring, target chains, non-star pool tiers, all already scoped [MASTER_PLAN #72].
- Add the 162-0-style "Scout mode" middle difficulty (shown but alphabetical rather than ranked) as a cheap addition on top of existing player-pool data [R2 Part 2 #12].
- Still on the older ChainSuggestions component; migrate to shared PlayerAutocomplete.

### Perfect Lineup: NBA - `/perfect-lineup-nba` (S)
- Add the Chemistry score layer (club/nationality/league overlap, adapted to team/conference/draft-class overlap for basketball) as a second scoring axis, same rationale as the soccer lineup-builder trio [R1 Part 2 #4 generalizes cleanly to any lineup-builder game].

## College Basketball

### Guess The CBB Program - `/guess-cbb-team` (S)
- Nav added and programs-load verified [MASTER_PLAN item 50]. No further deltas identified; consider adding difficulty tiers once cbb_programs' 186 rows are segmented by conference prominence, consistent with the sitewide difficulty-tier gap.

## Baseball

### 162-0 Perfect Season - `/perfect-season-mlb` (M)
- Same Hard Mode, themed daily rotation, synergy bonus, async head-to-head, result-signing family as the other three Perfect Season games [R2 Part 2 #6-#11].
- This is explicitly the best candidate for the three-tier Classic/Scout/Sicko difficulty ladder since Lahman data supports era-accurate alphabetical sorting cleanly across every era without gaps [R2 Part 3 #7].

### Career Path - `/baseball-career` (S)
- Audit against the standard 7-column attribute table with handedness as the sport-specific twist column (the MLB Pickle convention) [R2 Part 2 #4].
- Arrows only on the Age column, matching MLB Pickle's confirmed pattern exactly [R2 Part 2 #5].

### Connections - `/baseball-connections` (S)
- No direct new-mechanic deltas found; R2 notes the genre-leading competitor (Baseball Connections, a different product with the same name, runs 13 formats under one brand including a Bill-James similarity guesser). The similarity-guesser idea is captured separately as an MLB Bill-James guesser opportunity (see below), not a change to this existing Connections page itself.

### (New-adjacent) MLB Bill-James similarity guesser
- Not in the registry today; flagged here since R2 Part 3 #4 proposes it as a natural companion to Stat Detective using Lahman data (percent-match score, starts at 1000 points, deducts for stat differences). Not included in the Part 1 ranked list because it is narrower in appeal than the top 15, but worth a slot in a later wave if Baseball category needs more depth.

## Hockey

### 82-0 Perfect Season - `/perfect-season-nhl` (M)
- Same Perfect Season family treatment as the other three sports [R2 Part 2 #6-#11].
- Already correctly scoped around the goalie-stat gap (skater ratings from points per game, goalies from draft pedigree) [MASTER_PLAN item 47]; no data-scoping change needed, only the mode/hard-mode/synergy additions shared across the family.

### Career Path - `/hockey-career` (S)
- Audit against the standard 7-column attribute table (team, conference, division, position, age, jersey number, plus a sport-specific twist) matching Dangle's column set [R2 Part 2 #4].
- Arrows reserved for genuinely numeric columns only (age, jersey number) [R2 Part 2 #5].

### Higher / Lower - `/hockey-higher-lower` (S)
- No direct new-mechanic deltas beyond the general sitewide difficulty-tier gap; already a clean, proven mechanic (compare career points).

### Perfect Lineup: NHL - `/perfect-lineup-nhl` (S)
- Add the Chemistry-style overlap scoring (team/conference/era overlap) as a second scoring axis, same generalization as the NBA and soccer lineup builders.

## Formula 1

### Guess The F1 Driver - `/f1-driver` (S)
- No direct competitor equivalent surfaced in any of the three reports (F1-specific daily trivia was not a researched category). No deltas beyond the sitewide GameShell/PlayerAutocomplete adoption and difficulty-tier gap.

### Guess The Constructor - `/f1-constructor` (S)
- Same as above; no F1-specific competitor findings. Sitewide deltas only.

### Perfect Lineup: F1 - `/perfect-lineup-f1` (S)
- Add the Chemistry-style overlap scoring (constructor/nationality/era overlap) as a second scoring axis, generalized from the same pattern applied across every other Perfect Lineup game.

## Tennis

### Guess The Player - `/guess-tennis-player` (S)
- Flag: the known data constraint list shows tennis_daily at 0 rows while this game is live on a `daily: true` route. Verify whether tennis_daily is actually the backing table for this game (it may use a different table entirely) before any rework investment; if it genuinely has 0 rows backing a live daily game, this is a data emergency that supersedes any mechanic rework.
- Uses TennisPlayerSearch/TennisPlayerBoard components already, separate from the main PlayerAutocomplete; verify these are functionally equivalent or consider consolidating.

### Tennis Chain - `/tennis-chain` (S)
- Same Scout-mode middle-difficulty addition proposed for NBA Chain applies here structurally [R2 Part 2 #12].
- Still on the older ChainSuggestions-family component pattern per the chain-games sweep; verify PlayerAutocomplete adoption status specifically for tennis.

## Golf

- No games currently registered under this category (`games: []`). Not in scope for rework since there is nothing to rework; flagged here only so the empty category is not mistaken for an oversight in this document. Any future Golf game should draw on R2 Part 3 #3's cbb-style clean-table-first principle if golf-specific data has similar quality variance.

## NASCAR

### Guess The Driver - `/guess-nascar-driver` (S)
- No NASCAR-specific competitor findings surfaced in R1/R2/R3. Sitewide GameShell/deltas only.

### NASCAR Chain - `/nascar-chain` (S)
- Same Scout-mode addition as the other Chain games [R2 Part 2 #12].

## Combat Sports

### UFC Guesser - `/ufc` (S)
- No UFC-specific competitor findings surfaced. Sitewide GameShell/deltas only; consider difficulty tiers per the general gap.

### Combat Chain - `/ufc-chain` (S)
- Same Scout-mode addition as the other Chain games [R2 Part 2 #12].

## World & Olympic Games

### Teammates or Not? - `/teammates` (S)
- No direct competitor equivalent surfaced (a binary yes/no relationship-guessing format distinct from anything catalogued). No deltas beyond sitewide GameShell adoption.

### The Medal Games - `/olympics` (S)
- No Olympics-specific competitor findings. Sitewide deltas only; consider the attribute-tile pattern (Part 1 item 4) if an Olympics-specific attribute set (sport, country, medal count, era) would fit, as a future extension rather than immediate scope.

### Guess The Year - `/guess-the-year` (S)
- No direct competitor equivalent. Sitewide deltas only.

### Guess The Nation - `/guess-the-nation` (S)
- Flag: same data-constraint concern as Guess The Player (Tennis) above. guess_nation_daily shows 0 rows in the known constraints while this game is live on a `daily: true` route. Verify the actual backing table before any mechanic rework; treat as a potential data emergency if confirmed empty.

### Hall of Fame or Bust? - `/hof-or-bust` (S)
- No direct competitor equivalent surfaced (a binary legend/letdown judgment format). No deltas beyond sitewide GameShell adoption.

### Score Predictor - `/score-predictor` (S)
- No direct competitor equivalent surfaced. Consider the Bracket Battle-style "community vote" comparison (Part 1, excluded-formats note) as a future add-on once event-logging infrastructure exists, but no immediate mechanic change recommended.

## Game Shows

### Deal or No Deal - `/deal-or-no-deal` (M)
- Player Edition rebuild already shipped (final-case swap, smarter banker, offer history, lifetime stats) [MASTER_PLAN item 61].
- NBA and NFL player editions (contract values), daily case seed, banker taunt lines, sound toggle still pending [MASTER_PLAN #62].
- If a public leaderboard is ever added, apply the same result-signing principle recommended for Perfect Season [R2 Part 2 #11] to prevent faked screenshots, per MASTER_PLAN's own note that this applies equally here.

### Name Them All - `/list-quiz` (S)
- Sporcle's own data shows broad "name every team/league member" prompts get 5-7x more plays than narrow "name every award winner" prompts even when the narrow quiz rates higher; audit and reweight the existing 15-list pool toward broader prompts [R2 Part 2 #13, ties to puzzle-pool-audit task #146].
- Recently-observed competitor pattern worth adopting: a "get at least half correct to win" partial-credit threshold rather than requiring a perfect list, reducing churn [R1 Part 2 #15, same principle as the Alphabet Sprint recommendation above].

### Squad Deal - `/squad-deal` (M)
- Balance and ratings-spread review still pending [MASTER_PLAN #63].
- Add the Chemistry score layer as an explicit second axis alongside the existing playerRating-based grade, since this page already has EXTRAS and FORMATIONS infrastructure that the chemistry math would slot into directly [R1 Part 2 #4 generalization].

---

# PART 3: Wave plan

15 waves. Ordering principle: shared-component foundation first, then high-visibility low-risk wins, then risk-isolated rebuilds (grids, Conquest, Perfect Season family) each in their own wave rather than mixed with quick wins, then new-game waves sequenced by the Part 1 ranking, then long-tail depth and infrastructure last.

## Wave 1: UI foundation (tokens, shell, primitives)
**Contents**: Token additions to index.css/tailwind.config.ts (gold, surface-1/2/3, warn, success-glow, focus-ring-width); animation keyframes (tile-flip, pop-correct, shake-wrong, count-up-fade, reduced-motion block); build `<GameShell>`, `<ResultScreen>`, `<StatTile>`; generalize `HowToPlay.tsx` into a content-driven `<HowToPlay>`.
**Why this order**: R5 Phase 1 explicitly sequences this before any visible page change; every later wave's per-game rework assumes these primitives exist. Purely additive and inert on its own (zero visual change until consumed), so it is the lowest-risk possible wave 1 despite being a prerequisite for everything else.

## Wave 2: Prove the shell + home page refresh
**Contents**: Re-skin Footle to consume GameShell/StatTile/ResultScreen/HowToPlay; re-skin Transfer Market (HigherLowerTransfers) the same way; apply the GameCard token refresh to Index.tsx's home page grid.
**Why this order**: R5 Phase 2 names Footle as the proof case (most structurally complex existing page) and Transfer Market as the fast-follow (structurally simpler, surfaces any place the shared components over-fit to Footle). The home page refresh is low-risk (three token swaps plus one hover affordance) and highest-visibility (every visitor sees it first), a good early win to show before committing to full rollout.

## Wave 3: Header and home retention features
**Contents**: Cross-game daily score in header [#16]; Most Played Today wired to real completions [#64]; games-played-today stat wired to real data [#65]; remove Today's Daily Game section [#67].
**Why this order**: These are header/home features every session touches regardless of which game is played, so they compound in value the earlier they ship. They depend on Wave 1's token work (the header's new daily-score slot uses `text-gold`) but not on any single game's rework, so they can proceed in parallel with Wave 4.

## Wave 4: Sitewide autocomplete and validation sweep
**Contents**: Migrate NbaChain, NbaConnect4, FootballConnect4, and LineupBuilder from their bespoke suggestion components to the shared PlayerAutocomplete [#79 built, adoption incomplete]; valid-only guesses sitewide [#30]; fix suggestion text not matching typed letters [#31]; case/diacritic handling [#33]; names displayed centered and capitalized [#34].
**Why this order**: This is confirmed, scoped work (PlayerAutocomplete already exists; only 4 pages remain unmigrated) that removes a real, user-visible bug class before any new mechanic work adds more pages that could inherit the same bug. Isolated from the risky grid/Perfect Season rebuilds in later waves per the risk-isolation rule.

## Wave 5: Data integrity check and quick data wins
**Contents**: Verify tennis_daily and guess_nation_daily table status against the live /guess-tennis-player and /guess-the-nation routes (resolve whether this is a stale constraint note or a real data gap); NFL rosters wired for autocomplete [#37]; dedupe player_market_values plus autocomplete indexes [#41]; per-sport eligible-player views [#42].
**Why this order**: The tennis/nation-daily flag is a potential live-site data emergency (a daily game with an empty backing table) and must be resolved before any further investment in those two games. Bundling it with the other data-hygiene items keeps this wave focused on backend correctness rather than mixing in any user-facing mechanic risk.

## Wave 6: Rarity Round (new game)
**Contents**: Ship Rarity Round (Part 1 item 1) with 3-5 launch categories seeded from ballon_dor and player_market_values thresholds; fold in the Fan Favourites/Crowd Says popularity mode as a second mode on the same page.
**Why this order**: Highest cross-report validation of any new format, S-sized, and needs zero new data, making it the natural first new-game ship once the Wave 1-2 shared components exist to build it on top of (ResultScreen, StatTile). Shipping it alone (not bundled with another new game) isolates a genuinely new mechanic from any other risk.

## Wave 7: Soccer Grid depth pass (risk-isolated rebuild)
**Contents**: Difficulty tiers and cell-choice mode; timed mode (40/60/90/unlimited); Overtime (no hard-stop on a miss); spoiler-gated share links; in-progress state preservation across a session.
**Why this order**: This is the single most-cited priority across R1 and R2 for our soccer catalog [#49/#92], but it touches a complex, already-live game with real scoring logic, so per the risk-isolation rule it gets its own wave rather than being mixed with the Wave 6 new-game ship or with quick wins.

## Wave 8: Grid family parity (Football Grid, College Grid)
**Contents**: Apply the same Overtime/spoiler-link/in-progress-state treatment proven in Wave 7 to /football-grid and /college-grid; add College Grid categories from cbb_programs and cbb_awards only (never the poisoned NCAA tournament tables).
**Why this order**: Deliberately follows Wave 7 rather than running in parallel with it, so the Soccer Grid implementation serves as the validated template before replicating the pattern across two more grids, reducing the chance of fixing the same bug three times independently.

## Wave 9: Chemistry score layer (mode addition across lineup builders)
**Contents**: Build the shared chemistry-scoring utility plus the club-to-league lookup table; wire into World XI, Build Your XI, Perfect Lineup, Perfect Lineup: NBA, Perfect Lineup: NHL, Perfect Lineup: F1, and Squad Deal.
**Why this order**: One shared utility touching seven existing pages is exactly the kind of "build once, apply everywhere" wave R1 flags as the highest-leverage pattern; sequencing it after Waves 7-8 (grid depth) means the team is not context-switching between grid logic and lineup logic in the same week, and after Wave 6 (Rarity Round) so the newest shared-infrastructure muscle (building a scoring utility cleanly) is fresh.

## Wave 10: Missing XI (new game, content-heavy)
**Contents**: Curate 50-100 historic match lineups (competition, date, team, formation, 11 names, positions); build the Missing XI page and mechanic [#57].
**Why this order**: This is the largest single new-game build on the ranked list (L-sized, entirely because of content curation rather than engineering) and is deliberately isolated in its own wave so a long content-sourcing task does not block or get blocked by any code-only wave. Placed mid-plan so content curation can proceed in parallel with Waves 11-12's engineering-only work.

## Wave 11: NHL whitespace pair (new games)
**Contents**: Ship the NHL skater grid (/hockey-grid or similar new route) and the NHL skater attribute guesser together, both scoped to skaters only given the goalie-data gap.
**Why this order**: Confirmed whitespace with no incumbent breakout (R2 finding 4); both reuse engines already proven three times over (the grid engine from Waves 7-8, the attribute-guesser template from the Career Path family), so this is low-risk despite being net-new routes. Shipped as a themed pair since they share data and positioning.

## Wave 12: Soccer Perfect Season / Unbeaten mode
**Contents**: Extend /perfect-lineup with the go-unbeaten simulation mode (Part 1 item 5), reusing perfectSeason.ts directly.
**Why this order**: Lowest-net-new-code item on the entire new-game list since the simulation core already exists and is proven across 4 sports; sequenced after the Chemistry layer (Wave 9) lands on this same page, so Perfect Lineup receives both upgrades close together rather than in two disconnected touches months apart.

## Wave 13: Perfect Season family retention pass (all 4 sports + soccer's new mode)
**Contents**: Hard Mode with hidden ratings across NFL/NBA/MLB/NHL/soccer [#118]; themed daily-challenge rotation; synergy/chemistry bonuses for real-life pairs; async head-to-head; result-signing for future leaderboard credibility.
**Why this order**: Deliberately follows Wave 12 so soccer's new Perfect Season mode ships as a complete v1 before the whole family gets the same retention-feature pass simultaneously, avoiding a five-times-repeated partial rollout. This is the single largest confirmed-priority item from R2 across the whole Perfect Season genre and touches five pages at once, so it is isolated from any new-game risk in its own wave.

## Wave 14: Attribute-tile hybrid + cross-sport template audits
**Contents**: Ship the attribute-tile feedback layer on Footle (Part 1 item 4); audit NFL Career Path, Baseball Career Path, and Hockey Career Path against the standard 7-column template with correct arrow usage (numeric columns only) and a sport-specific twist column each.
**Why this order**: Groups every "attribute table" style rework into one wave since they share the same StatTile component and the same arrow-usage rule, letting one implementation pass validate the pattern across soccer, NFL, MLB, and NHL simultaneously rather than four separate context switches.

## Wave 15: Long-tail new games and remaining depth
**Contents**: Chemistry-adjacent items already covered; ship Soccer Perfect Season's frozen-era mode extension to World Cup (Part 1 item 13); Guided question-tree guesser (Part 1 item 8) on Guess The Club; Pack Battle (Part 1 item 9); remaining S-sized per-game deltas from Part 2 not yet covered (difficulty tiers on Career Quiz, CBB Team, Draft Guesser; Connect 4 richer clue types; NBA Chain Scout mode and fixed-pick-count scoring; Alphabet Sprint and Name Them All partial-credit win conditions).
**Why this order**: Final wave intentionally bundles the remaining S-sized, low-interdependency items so nothing on the Part 2 list is left permanently unscheduled; because every item here is small and independent, mixing them in one wave does not violate the risk-isolation rule the way mixing an L-sized rebuild with quick wins would.

### Explicitly out of this wave sequence
- **Conquest (`/conquest`)**: Section H of MASTER_PLAN (items 81-90) is large enough (L, ten sub-items) to warrant its own dedicated wave whenever it is prioritized; it has no dependency on any wave above and no competitor research applies to it specifically, so it can be slotted in at any point in the sequence without disrupting waves 1-15.
- **Accounts/streaks/leaderboards infrastructure** [#97, #100-#104, #123-#125]: Multiple items above (Soccer Grid spoiler-links, Perfect Season leaderboards, Bracket Battle) assume this infrastructure exists. Treat it as a parallel infrastructure track that Waves 7, 11, and 13 will need to check against before their leaderboard-dependent features (not the core mechanic features) can fully ship.
- **Sitewide copy and legal passes** [#106-#108, #111-#116]: Independent of game mechanics; can run on any timeline in parallel with the waves above without sequencing conflicts.
