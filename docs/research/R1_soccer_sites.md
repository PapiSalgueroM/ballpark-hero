# R1: Soccer Trivia Competitor Teardown

Research date: July 2026. Public pages only, no logins, no paywall bypassing.

## Executive summary (read this first)

1. Futbol11 (the futbol-11.com / futbol11.com dual-domain site) is the category leader at roughly 6.5M visits/month and runs 19 distinct daily games off three reusable engines: lineup-builder, Wordle-clone, and grid/bingo.
2. Every top competitor resets at midnight and stores stats in the browser (localStorage), not accounts. None of them have a real cross-game score in the header, that gap is wide open for us.
3. playfootball.games (Missing11's parent) is the most mechanically inventive site: it ships a per-game daily completion counter "PLAYED 8/17 W8-8L" in its header, the closest thing to cross-game scoring anyone has shipped.
4. Rarity scoring (percentage of players who picked the same correct answer, lower is better) is now a default expectation for any grid or bingo game, both Futbol11 Grid and Box2Box use it live off real submission data. We already compute this correctly in Soccer Grid.
5. The single most copied mechanic pattern is "reveal one clue, guess or skip, repeat" (Legacy, Link, Statdle, Career Path Challenge, Contextinho) built on four to nine clue slots with capped attempts, we already do a version of this in Career Ladder and Who Am I.
6. Difficulty tiers (Easy/Normal/Hard/Legend) and optional timers (40s/60s/90s/unlimited) appear on nearly every futbol11.com game and are the top usability gap versus our soccer catalog.
7. Pointless-style rarity trivia (Goalless) and Family-Fortunes-style popularity trivia (Fan Favourites) are both live and popular formats we do not have anywhere on the site.
8. Our own Who Am I already matches or beats Futbol11's Goltexto on scoring sophistication (verified 7-factor weighted formula vs. their unlisted black-box algorithm).
9. Chemistry scoring (FIFA/EA FC style: club/nation/league overlap across a lineup) is a differentiator used by SuperDraft Soccer that none of our lineup-builder games have.
10. No competitor site enforces logos, crests, or player photos as a mechanical necessity, every mechanic below can be rebuilt with text, flag emoji, and stat tiles only, which is exactly our existing IP posture.

---

## Part 1: Per-site teardown

### Site A: Futbol11 (futbol-11.com and futbol11.com, same product, two domains)

Scale: approximately 6.49M visits/month (Similarweb, Feb 2026 snapshot), average session 12+ minutes, direct traffic is the largest channel (55%), meaning this is a bookmark/habit site, not one riding search traffic. 19 games total, confirmed via the site's own internal stats page at futbol11.com/viewstats which lists every game's tracking key.

Global mechanics shared across the whole site:
- Midnight local-time reset on every game.
- Stats stored in-browser only. A manual "Transfer Stats" migration page lets players copy old-domain stats into the new domain by hand, no account system, no server-side persistence.
- Most games offer optional timers: unlimited, 90s, 60s, 40s.
- Most games offer 2 to 4 difficulty tiers (commonly Easy / Normal / Hard, occasionally a "Legend" tier).
- Share button copies results to clipboard for Twitter/WhatsApp, standard Wordle-style emoji block.
- Company runs sister single-purpose Wordle sites for other sports (basketball-5.com, wrestleplay.com) using the same shell, confirming they treat "one Wordle-style domain per sport" as a scalable content template.

Game-by-game inventory:

1. **Futbol11 (flagship / World Cup 2026 lineup builder)** at /futbol11
   - Mechanic: countries appear one at a time in random order; you assign a player from that country to any open XI slot. Locking a slot removes it for future countries.
   - Input: text autocomplete on player surname.
   - Scoring: binary complete/incomplete; no rarity layer.
   - Daily vs unlimited: one daily lineup, difficulty toggle Easy (top countries only) / Normal (full 48-nation pool).
   - Share: results card with completion time if timed.
   - Sticky hook: the "which slot do I use this player for" tension mirrors Wordle's information-elimination loop but for team-building.

2. **Futbol11 Grid** at /futbol11-grid
   - Mechanic: classic 3x3 Immaculate-Grid crossover (row = club/country, column = club/country), pick a player who satisfies both.
   - Input: text autocomplete, must be a real career-verified player (club or country ever represented, no minimum caps required).
   - Scoring: implied rarity (site explicitly plans/uses percentage-based scoring per the wider Immaculate Grid genre; confirmed live in the sibling Box2Box product).
   - Difficulty: 4 tiers, Easy through Legend, controls pool size of clubs/countries used to build the grid.
   - Daily vs unlimited: one grid per day, no stated unlimited/practice mode.
   - Sticky hook: "if only one player fits a cell, they're auto-placed" removes decision paralysis while preserving challenge on multi-fit cells.

3. **Futbol11 Bingo** at /futbol11-bingo
   - Mechanic: 3x4 (12-cell) bingo board, one random player shown at a time, click the matching category cell (club ever played for, nationality, award, treble winner, etc.) or Skip.
   - Input: no typing, pure recognition and cell selection.
   - Scoring: cells filled out of 12; timed modes add pressure.
   - Retention trick called out explicitly in their own copy: "save your universal players (Ronaldo-tier) for your hardest, most specific categories, spend common players early" is a genuine strategic layer, not just trivia recall.
   - Also ships a "Bingo Retro" variant restricted to retired legends only.

4. **Futbol11 Wordle** at /futbol11-wordle
   - Mechanic: standard Wordle letter-position feedback (green/yellow/grey) against a footballer's surname, 6 tries.
   - Two modes: Easy (any word accepted, no footballer restriction) and Normal (guesses must be real footballer names).
   - This "Easy = any word, Normal = real names only" split is worth copying, it lets non-committed players free-play while purists get a stricter mode.

5. **Futbol11 Connections** at /futbol11-connections
   - Mechanic: NYT Connections clone, 16 players into 4 groups of 4 by hidden theme (club history, nationality, transfer path, award).
   - 3 difficulty tiers: Easy (obvious club-based groups), Normal (deeper trivia), Hard (same puzzle as Normal but capped at 5 total mistakes, survival mode layered onto an otherwise identical puzzle).
   - The "same content, harder fail-state" trick for Hard mode is cheap to implement and worth stealing broadly: it multiplies difficulty options without needing new puzzle content.

6. **Futbol11 Statdle** at /futbol11-statdle
   - Mechanic: World Cup-specific mystery player. Reveals the target tournament year immediately, then clues (appearances, goals, assists, country, club at the time, position, market value at the time) come in random order, guess-or-skip per clue, 5 guesses max.
   - Hard mode locks the two most identifying clues (club, country) and only shows 7 of 9 clues.
   - Sticky hook: freezing the era (a specific World Cup year) makes the same player identifiable in wildly different ways depending on which tournament is picked (peak-year Messi vs. rookie-year Messi), which multiplies replay value from one player database.

7. **Futbol11 World Cup 2026** at /futbol11-worldcup
   - Same lineup-builder engine as flagship Futbol11, restricted to 2026 World Cup qualified nations. Effectively a reskinned, timely variant of the same mechanic.

8. **Futbol11 Retro** at /futbol11-retro
   - Same lineup-builder engine, but rows are historical club squads by season (Liverpool 24/25, Real Madrid 17/18) rather than countries. Two difficulty tiers (recent decade only vs. full historical database).
   - Notable rule: a player can only be used once total across the whole lineup even if they qualify for multiple historical squads (e.g., someone can't fill both their Ajax slot and their later Juventus slot).

9. **Futbol11 Top10** at /futbol11-top10
   - Mechanic: type in 10 names to complete a themed top-10 list (Champions League scorers 2000-2010 etc.). Each answer's nationality shown upfront as a permanent freebie clue.
   - Modes: untimed or 2-minute timer.
   - This is a Tenable/TenaBall clone; note their own copy admits stats are only refreshed "up to start of 2025/26 season," i.e., stale-data risk is real and visible to players who catch outdated lists, worth avoiding on our own Top-10 style builds.

10. **Futbol11 Goltexto** at /futbol11-goltexto
    - Mechanic: Contexto-style secret player, every guess returns a similarity score.
    - Their own worked example (target = Harry Maguire): teammates sharing exact position score in the 80s-90s, league+position overlap mid-40s, single trait overlap near zero, no overlap scores negative (as low as -52).
    - Configurable max-guess cap: 10 / 20 / 100, letting players choose their own difficulty without new content.
    - This is the exact same mechanic as our Who Am I, but our scoring is transparent and documented (see src/lib/whoAmI.ts) versus their unlisted "smart algorithm," and importantly, ours never goes negative, it floors at a clean 0-100 scale which is friendlier UX.

11. **Futbol11 Legacy** at /futbol11-legacy
    - Mechanic: 4 clubs shown one at a time (order randomized, not chronological), guess-or-skip, name the player who played for all 4. 4 attempts max total.
    - This is structurally identical to our Career Ladder concept but capped much tighter (4 clues, 4 guesses vs. our fuller career-stop reveal).

12. **Futbol11 Impostor** at /futbol11-impostor
    - Mechanic: a category is shown (e.g., "Played for Barcelona") with a mixed board of matching players and impostors. Pick every correct player, one wrong pick (impostor) ends the game.
    - Two modes: Normal (select all at once) and One by One (sequential, any miss ends immediately, higher tension).
    - This is a lightweight, fast, highly shareable format that needs almost no new UI, just a category + a curated true/false player list. Good phone-first, low-attention-span format.

13. **Futbol11 Pyramid** at /futbol11-pyramid
    - Mechanic: rank 10 players into a tiered pyramid by a stat category (most trophies, Champions League goals, FC 26 rating), drag-and-drop or click-to-swap.
    - Easy mode reveals which pyramid tier a player belongs in before placement (removes the "which tier" question, leaves only "where within the tier"). Normal mode gives zero hints.
    - One-use "Help" button reveals which of your current placements are already correct.
    - At game end, actual stat values are revealed next to your placements, turning a guessing game into a stat-literacy lesson, a smart "aha" moment that increases perceived fairness even on a loss.

14. **Futbol11 Clubs** at /futbol11-clubs
    - Same lineup-builder engine, rows are clubs instead of countries. Easy tier = top clubs only (Real Madrid, Man United, PSG), Normal = full club database.

15. **Futbol11 Link** at /futbol11-link
    - Mechanic: 5 former/current teammates shown one at a time (non-chronological), guess-or-skip, identify the player who has shared a pitch with all 5. Explicitly excludes youth academy appearances, senior football only. 5 attempts.
    - Nearly identical to Legacy but keyed on teammates instead of clubs, proof that one clue-reveal engine can power multiple "guess from N attributes" games just by swapping the attribute type (clubs, teammates, stats, countries).

16. **Futbol11 America** at /futbol11-america
    - Same lineup-builder engine, restricted to South American clubs (Boca Juniors, Flamengo, Palmeiras, Santos, etc.), demonstrating that regional reskins of one engine are a cheap way to add "new" games for underserved fan segments (useful for us with MLS/Liga MX if we ever expand US soccer coverage).

17. **Guess the Footballer** at /guess-the-footballer
    - Mechanic: Akinator-style, ask up to 10 yes/no questions (club, country, position, league, age threshold, etc.) via a structured question picker (not free text), then get 3 guesses.
    - Explicit ruling: league questions only trigger "yes" if the player made a top-flight appearance in that country, an important precision detail for any of our similar "did they play in X" logic.
    - This is a completely different input paradigm (guided question tree instead of autocomplete or clue-reveal) that we do not have anywhere in our soccer catalog.

18. **Futbol11 Legends** at /futbol11-legends
    - Same lineup-builder engine restricted to national-team legends (players with 50+ caps historically). Toggle between "retired only" and "all eligible legends."

19. **Futbol11 Bingo Retro** at /futbol11-bingo-retro
    - Same bingo engine as #3, restricted to retired legends, same 12-category board.

Engine reuse count: of the 19 games, 6 are the lineup-builder engine reskinned (Countries/flagship, World Cup 2026, Retro, Clubs, America, Legends), 2 are the bingo engine (Bingo, Bingo Retro), leaving 11 genuinely distinct engines: Grid, Wordle, Connections, Statdle, Goltexto, Legacy, Impostor, Pyramid, Link, Guess the Footballer, Top10. This 3-engine-does-6-games pattern is the single most replicable growth trick on the site.

Monetization observed: no display ads visible in fetched page content (may be JS-injected and not captured by static fetch); Discord, TikTok, YouTube, Instagram, X, Facebook all linked in footer, suggesting community/social growth is the primary retention channel rather than ad revenue optimization.

---

### Site B: playfootball.games (parent of Missing11.com)

This is the most feature-rich competitor found, roughly 19 games plus 3 real-time multiplayer formats. It is an Astro-built site with dedicated per-game guide pages (a content-marketing/SEO layer none of the other sites bother with).

Header mechanic (the most important finding of this whole research pass): the homepage displays "PLAYED 8/17 · W8-8L · Complete today's quizzes · New quizzes at midnight" as a persistent cross-game tracker. This is the single closest thing to a true cross-game daily score seen anywhere in this research. It is a completion counter and simple win/loss tally, not a points score, but it proves the underlying UX pattern (a header widget showing today's aggregate progress across every daily game) works and is technically simple.

Daily games:

1. **Missing 11** (/missing-11/) with region variants for Brazil and Argentina
   - Mechanic: each of the 11 starting XI slots from a real historic match is its own mini-Wordle. 6 tries per player, Mastermind-style green/yellow/grey letter feedback.
   - This nests one proven mechanic (Wordle) inside another (lineup recall), effectively giving you 11 Wordles per day disguised as one game, a strong "more play time per session" trick.
   - Share card: standard clipboard-copy emoji grid.
   - Archive/Yesterday replay links reduce daily-reset frustration for latecomers.

2. **Football Bingo** (/football-bingo/) with World Cup and multiplayer "Room" variants
   - Mechanic: identical to Futbol11's Bingo (16-category board here vs. 12 there), one random player at a time, pick a matching cell.
   - Ships an actual multiplayer room mode (compete head-to-head against friends) and an App Store/Google Play native app, neither of which any other competitor in this research has.

3. **Box2Box** (/box2box/) with Global, World Cup, and 7 individual league variants (Premier League, LaLiga, Serie A, Ligue 1, Eredivisie, Argentine Primera, Brasileirão)
   - Mechanic: 3x3 grid, 3-minute hard timer. Primary goal is just completing the grid fast; once complete, remaining time becomes a bonus round to name as many additional valid players as possible per cell (a "how many can you name" overtime, not just a stop-the-clock finish).
   - Rarity score confirmed live and explicit in the site's own community posts (players screenshot grids with "SCORE: 324," lower is better, matching the Immaculate Grid genre standard).
   - Per-league variants from one grid engine again shows the reskin-for-more-games pattern.

4. **GoalLess** (/goalless/)
   - Mechanic: direct Pointless clone. Each trivia question has a set of correct answers; you win by finding the least popular (rarest) correct answer, not by being right. Score is based on how obscure your correct pick is.
   - We have zero equivalent game on our entire site. This is a distinct genre from rarity-scored grids (grids reward finding an obscure valid combination; Pointless-style rewards finding the single least-guessed valid answer to a single prompt).

5. **Football Connections** (/football-connections/)
   - Same NYT Connections mechanic as Futbol11's version. One documented design rule stated on their own page: "Connections will never be based upon player positions," meaning they deliberately exclude the most obvious grouping axis to force harder trivia thinking, worth adopting as an explicit design constraint for our own Connections puzzle generation.

6. **Contextinho** (/contextinho/)
   - Same Contexto/Goltexto mechanic. Site is localized into English, Spanish, and US-English variants, showing real investment in LatAm audience capture (relevant given our player_market_values and career_players data includes global nationalities).

7. **Who Are Ya?** (/who-are-ya/) with Big-4 and per-league variants (Premier League, Bundesliga, La Liga, Serie A, MLS, Brasileirão, Primeira Liga, Ligue 1)
   - Mechanic: blurred player photo that sharpens with each wrong guess (Show Photo mode) or a photo-free harder mode (Hide Photo). 8 total guesses.
   - Tile feedback per guess: 5 or 6 attribute tiles (nationality, league, club, position, age, shirt number) turn green on match, exactly like Wordle's letter feedback but applied to structured attributes instead of letters. This attribute-tile-feedback pattern is one of the most reusable ideas in this whole report, it works for literally any structured player-attribute dataset (which we have via player_market_values).
   - "Reveal Clue" unlocks after 3 failed guesses as a pity mechanic.
   - Calendar icon lets players replay any past day's puzzle, a backlog/archive feature none of our games currently offer.

8. **Career Path Challenge** (/career-path-challenge/)
   - Mechanic: guess count is dynamic based on how many clubs the target player actually played for (not a fixed 6), each guess reveals the next club chronologically in a Wikipedia-style table.
   - Directly comparable to our own Career Ladder and Career Quiz games.

9. **Football Wordle / Footbl** (/football-wordle/)
   - Standard Wordle clone, 5 or 6 letter surname formats, 6 tries.

10. **Guess the Football Club** (/guess-the-football-club/)
    - Logo-recognition quiz. This is the one format in this entire research pass that is fundamentally blocked for us by our own IP-safety rule (crests are trademarked marks, not just copyrighted images) so this is a "do not copy" flag, not an adopt target, though a text/flag-only "guess the club from clues" variant (which we already partially have in Guess The Club) sidesteps the IP problem entirely.

11. **SuperDraft Soccer** (/superdraft-soccer/) with Remix and Chemistry modes
    - Mechanic: build an XI from a random pool of clubs/nations/leagues (same lineup-builder genre as Futbol11's family), but layers an explicit "Chemistry" score modeled directly on EA FC's in-game chemistry system: club overlap (2 players = 1 pt, 4 = 2 pts, 7 = 3 pts per player), nationality overlap (2/5/8 players), league overlap (3/5/8 players), each player capped at 3 chemistry points, max lineup total 33.
    - This is the single most transferable "new scoring layer" in this research: it turns any lineup-builder game (we already have World XI, Build Your XI, Perfect Lineup, Squad Deal, Fantasy Draft) into a build-optimization puzzle with a second, replayable score axis, without needing any new data.
    - Explicitly does not require correct player positions to count chemistry, simplifying the math versus real EA FC.

12. **Pack 11** (/pack-11/)
    - Mechanic: football-trumps card game. Each of 11 sequential player cards shows 5 random stats; you pick which stat will beat (or tie) the next card's same stat. One wrong pick sends you home immediately (single mistake ends the run, no lives).
    - This is structurally a chained Higher/Lower with player-selectable stat categories instead of one fixed stat, meaningfully deeper than our current single-stat Higher or Lower.

13. **Footy TenaBall / Football Tenable** (/football-tenable/)
    - Same Tenable/Top-10 mechanic as Futbol11's Top10.

14. **Fan Favourites** (/fan-favourites/)
    - Family Fortunes clone: "we asked 100 fans each question, guess the answers they gave first, score points based on popularity of your guess." A second genre we have zero equivalent of (distinct from Pointless: this rewards guessing the most popular answer, not the rarest).

15. **Futbol List a** (/futbol-list-a/)
    - Mechanic: name as many correct answers as possible to an open-ended daily prompt ("name every player who...")). Recently patched to a "get at least half correct to win" threshold rather than requiring a perfect list, a good example of a competitor tuning win-rate after launch to reduce frustration/churn.

16. **Tiki-Taka-Toe / Footy Tic-Tac-Toe** (/footy-tic-tac-toe/)
    - Real-time multiplayer tic-tac-toe where each square requires answering a trivia prompt correctly to claim it. Also shipped as a standalone iOS/Android app.

17. **Rondo Ringer** (/rondo-ringer/)
    - Football-flavored multiplayer social-deduction "impostor" party game (Among Us style), distinct from Futbol11's single-player Impostor trivia format.

18. **Possession Play** (/possession-play/)
    - 1v1 real-time multiplayer "territory battle" game, the most unusual format in this research, gamifies possession/territory control rather than trivia recall directly.

19. **The Heatmap** (/the-heatmap/)
    - Newest addition seen during this pass, "build heat across the football grid," appears to be a spatial/positional trivia format layered on the grid genre.

Also referenced but not deeply explored: a wider WhoAreYa.games multi-sport network (tennis, basketball, NFL, baseball, volleyball, ice hockey, golf, cricket, racing, celebrities) run by the same operator, confirming the "one attribute-tile engine, many sport reskins" strategy scales across an entire portfolio, directly analogous to our own 65-game, 15-category catalog strategy.

Monetization observed: rewarded-video prompts ("Watch this video to get your reward!") appear on several game detail pages, native iOS/Android apps for at least 2 games (Tiki-Taka-Toe, Box2Box unlimited), suggesting a real ad + app-install revenue strategy, more aggressive than Futbol11's apparent community-only approach.

---

### Site C: Goltexto and similarity-guess games (Contexto genre)

Goltexto is not an independently branded product, it is Futbol11's name for their Contexto-style game (see Site A, item 10). The wider genre is more accurately called "football Contexto clones," and playfootball.games ships its own version as Contextinho (see Site B, item 6). A third, app-only version exists as "Contexto Football Quiz" on iOS/Google Play (not evaluated, app store listing only, outside the public-web-page scope of this research).

Cross-site comparison of the genre:
- Futbol11 Goltexto: unlisted proprietary algorithm, score range appears to go negative (-52 to 100 in their own example), configurable max guesses (10/20/100).
- Contextinho: same core mechanic, localized into 3 languages, no published scoring formula found in static content.
- Our Who Am I: documented, weighted 7-factor formula (nationality, position group, exact position bonus, club match tiered by current-vs-ever, age closeness on a linear decay, market value closeness on a log scale), floors at 0, caps non-exact guesses at 99, guessing the exact answer always returns exactly 100.

Verdict: our implementation is already ahead of both competitors on transparency and score-floor UX (never showing a demoralizing negative number). The gap versus competitors is entirely about polish and options, not underlying algorithm quality: Futbol11 lets players choose their own guess-count difficulty (10/20/100), which we do not expose.

---

### Site D: Wordle-family soccer games (WhoAreYa, Footballe/Footbl, Box2Box's own Wordle)

WhoAreYa.org (standalone, distinct from playfootball.games' own "Who Are Ya?" despite the nearly identical name) is a separate operator running a multi-vertical Wordle network (football, celebrities, cricketers). Key differentiators found:
- Full account system with Login/Sign Up (not just localStorage), a real differentiator versus every other site in this research, all of which are anonymous-only.
- "Big 4" league filter groups Premier League, La Liga, Serie A, Ligue 1 into one combined daily pool, a clever way to widen the answer pool for a "moderate difficulty" default without launching new games.
- 8 guesses, hint system ("Hint (0/2)" visible in the UI), leaderboard mentioned in marketing copy (implies a real backend, consistent with the account system).
- FAQ schema clearly present in on-page content (explicit Q&A blocks for "What does Big 4 mean," "How many guesses," "When is the next quiz"), good for SEO, a pattern worth matching in our own GameSeoContent blocks.

Footbl (playfootball.games' Wordle, see Site B item 9) and Futbol11's own Wordle (Site A item 4) are both textbook Wordle clones with no major differentiation beyond the Easy/Normal split already covered above.

FootballWordle.com, WorldCupWordle.com, Wordlecup.today, and footballminigames.com/wordle all surfaced as smaller, single-purpose Wordle clones (not deeply fetched, low differentiation value beyond confirming the format's ubiquity). Wordlecup's variant is notable for using 8 structured clues (league, club, nation, position, age, height, shirt number, preferred foot) rather than pure letter-guessing, effectively a hybrid of Wordle and the attribute-tile format seen in Who Are Ya.

---

### Site E: Other notable sites

**Guess the Kit** (guessthekit.com) and **KitTok** (kittok.co.uk): football-kit (jersey) recognition Wordle-style games. Both are fundamentally logo/kit-image recognition games and are IP-risk formats for us (kit designs and crests are protected marks), flagged as do-not-copy but confirming the "guess the visual asset" genre exists and is popular; our equivalent must stay strictly text/stat-based (e.g., "guess the club from all-time roster stats," which we already do via Guess The Club).

**Starting11.co.uk** (Future Publishing property, quiz engine licensed from "Kwizly"): guess a full historic starting XI by club/fixture. Distinctive mechanic: the number of letters in each hidden player's name is shown beneath their shirt silhouette before any guessing starts (a permanent, universal hint), only 3 hints total per game (revealing one letter each), full account registration required including date of birth (likely for ad-compliance/COPPA reasons), and a "Challenge a friend" share flow distinct from the generic "Share results" pattern seen everywhere else, it frames sharing as a direct social dare rather than a broadcast.

**Lineup-builder.co.uk**: runs its own quiz suite (Guess the Player, Football Tic-Tac-Toe, Football Tenable, Football Connections, Football Bingo, Wikipedia Career Path) plus, critically, **"38-0-0"** and **"8-0-0"** games: "spin for real clubs and seasons, draft your dream team, find out if it could go a whole season unbeaten." This is functionally identical to our own Perfect Lineup / Perfect Season family (soccer does not yet have its own Perfect Season entry in our registry, only Perfect Lineup at /perfect-lineup exists for soccer while MLB/NBA/NFL/NHL all have dedicated Perfect Season 82-0/162-0/17-0 games). This is strong external validation that a soccer-specific "go unbeaten" perfect-season format is proven and currently missing from our soccer category specifically.

**My Greatest 11** (mygreatest11.com) and **Guess The Lineup** (guessthelineup.com): both are straightforward lineup-recall quizzes for iconic World Cup/Euros/Champions League/club matches, no major mechanical differentiation beyond confirming Missing-11-style lineup recall is a broad, multi-operator proven genre (at least 5 independent sites run some version of it: Missing11, Starting11, My Greatest 11, Guess The Lineup, Lineup Builder's own Guess The Player).

**FootballTransferQuiz.com**: lean, single-purpose site, guess a player from their transfer history in 6 guesses, directly comparable to Career Path Challenge and our own Career Ladder/Career Quiz, no unique mechanic beyond a tighter 6-guess cap.

**FootballTransfers.com/games**: the "Games" section of this major transfer-news publisher is a near-empty stub (a single embedded FIFA-24 minigame widget), evidence that even large, well-resourced football media brands have not seriously invested in a trivia-game product, reinforcing that this is a genuine underserved-but-provable-demand category rather than a saturated one.

---

## Part 2: Adopt/adapt list, mapped to our existing soccer games

Ranked by expected impact-to-effort ratio (highest first). Each cites the exact game and route from src/data/gameRegistry.ts.

1. **Soccer Grid** (/soccer-grid) should add difficulty tiers and a cell-choice mode like Futbol11 Grid's Easy/Normal/Hard/Legend system. We already compute real rarity scores from soccer_grid_selections (verified in src/hooks/useSoccerGrid.ts), the only gap is difficulty variety and letting players pick which empty cell to attempt next instead of a fixed order, this is already flagged as backlog item #49/#92, this research confirms it is the correct, competitor-validated priority.

2. **Soccer Grid** (/soccer-grid) should add a timed mode (40s/60s/90s/unlimited) matching the near-universal Futbol11 timer convention. Adds a second, purely presentational difficulty axis with no new data needed.

3. **Who Am I?** (/who-am-i) should expose a configurable max-guess setting (10/20/100 like Goltexto) instead of a fixed guess cap, letting cautious and expert players both self-select difficulty from the same puzzle and data pool.

4. **World XI** (/world-xi) and **Build Your XI** (/build-your-xi) and **Perfect Lineup** (/perfect-lineup) should all add a SuperDraft-style Chemistry score: club overlap, nationality overlap, and league overlap tiers, each capped per player, summed for a lineup total. This needs zero new data (player_market_values already has club, nationality, and can be joined to a league lookup) and turns three existing build-a-team games into replayable optimization puzzles with a persistent leaderboard-able score.

5. **Connections** (/connections) should adopt an explicit design rule excluding player-position groupings as a category axis, matching playfootball.games' stated design constraint, this forces our category generator toward deeper trivia (transfer paths, shared awards, shared nationality-plus-club combos) instead of the easiest, most-guessable axis.

6. **Connections** (/connections) should add a "Hard" mode that reuses the exact same daily puzzle but caps total mistakes at a stricter number (e.g., 3 instead of a looser default), copying Futbol11 Connections' "same content, harder fail-state" trick, this is pure logic, no new puzzle content required.

7. **Career Ladder** (/career-ladder) should tighten its reveal-or-skip loop to match the tautly designed Legacy/Link format: exactly 4-5 clue reveals, guess-or-skip after each, hard stop at N+1 total guesses. Verify our current implementation's pacing against this proven 4-clue/4-guess ratio.

8. **Shirt Number** (/shirt-number) already uses the higher/lower hint pattern well; add a Pack-11-style chained mode where a correct guess advances to a new player and one wrong guess ends the run immediately (no partial credit), as an alternate "survival" mode alongside the existing 3-attempt scored mode.

9. **Higher or Lower** (/higher-lower) and **Transfer Market** (/higher-lower-transfers) should adopt Pack 11's player-selectable stat category (pick which of 5 shown stats to wager on) instead of one fixed stat per comparison, meaningfully deepening a currently single-axis mechanic using data we already have.

10. **Footle** (/footle) should add the Who Are Ya attribute-tile feedback pattern (nationality/league/club/position/age/shirt-number tiles that light up green on match after each guess) as a secondary feedback layer alongside its existing stat-clue system, this is the most broadly reusable UI pattern found in this whole research and directly strengthens an already-shipped game.

11. **Guess The Club** (/guess-soccer-club) should add the Guess the Footballer-style guided question-tree input mode (structured yes/no questions on club/country/position/league instead of free-text guesses) as an alternative to its current daily-clue format, this is a genuinely different input paradigm we have nowhere on the site and is fully IP-safe (text questions only).

12. **World Cup** (/world-cup) should add a Statdle-style "freeze the era" mode: pick a specific past World Cup year, clues describe the player only as they were that tournament (club at the time, stats at the time, market value at the time), letting the same player be a different, harder puzzle depending on which year is chosen. Multiplies replay value from data we likely already have via player_market_values' year column.

13. **Perfect Lineup** (/perfect-lineup) should be split into an explicit soccer "Perfect Season / go-unbeaten" mode matching lineup-builder.co.uk's 38-0-0 and 8-0-0 format and our own existing MLB/NBA/NFL/NHL Perfect Season games, soccer is the one major sport in our catalog without this mechanic despite having the strongest supporting data (player_market_values, career_players/career_seasons).

14. **Transfer Path** (/transfer-path) should add a Missing-11-style "each hop is its own mini-Wordle" layer: instead of pure autocomplete for each intermediate player, optionally reveal the target's name as a blank-tile puzzle solvable via letter guesses once the chain narrows to 1-2 remaining hops, adding a second skill layer to an already-shipped game.

15. **Alphabet Sprint** (/alphabet-sprint) should add a Futbol List a-style partial-credit win condition ("get at least half the letters to count as a win") instead of requiring a full A-to-Z sweep, reducing churn from players who stall on 2-3 hard letters, directly copying a real post-launch tuning decision another site made for the same frustration.

16. **Guess The Value** (/guess-transfer-value) should add the Career Path Challenge convention of a dynamic guess count based on puzzle difficulty (e.g., fewer guesses allowed for players with widely-known values, more for obscure ones) instead of a fixed guess count for every puzzle.

---

## Part 3: New game formats, ranked, with build specs

Formats proven by competitors that we do not have anywhere in the soccer category (or the site).

### 1. Pointless-style rarity trivia ("Empty Net" or similar text-only name, avoid "Goalless"/"Pointless")
The direct GoalLess/Pointless clone: show a trivia prompt with many valid correct answers (e.g., "name a player who has scored a Champions League final goal"), score is based on how obscure/rare your correct answer is versus what other players have already submitted, the rarest correct answer wins. Build: reuse the same live-submission-percentage infrastructure already built for Soccer Grid's rarity score (soccer_grid_selections pattern), just applied to a single open prompt instead of a 3x3 grid. Data source: player_market_values plus career_players/career_seasons can generate hundreds of "name a player who..." prompts (by nationality, by club, by position, by value bracket, by ballon_dor appearance). Ballon Dor's 76 winners table alone can seed a dedicated "name a Ballon d'Or winner" prompt rotation. This is the single highest-priority new format: it needs no new player-level data modeling, just prompt authoring plus the rarity-tracking table pattern we've already proven works.

### 2. Family-Fortunes-style popularity trivia ("Crowd Says" or similar text-only name, avoid "Fan Favourites")
The Fan Favourites clone: survey-style prompts ("most popular answer to: name a player who should have won the Ballon d'Or but didn't"), score based on matching the most popular submitted answer rather than the rarest. This is the structural mirror image of format #1 above and can share nearly all the same backend (same submission-percentage table, opposite scoring direction: reward high percentage instead of low). Because it shares infrastructure with #1, ship them together as two modes of one new page rather than two separate builds. Data source: same as #1, plus this format works especially well seeded from ballon_dor and connections_puzzles' existing category themes since those are already curated "interesting question" pools.

### 3. Chemistry-scored lineup builder (build directly into World XI, Build Your XI, or Perfect Lineup rather than as a new page, see adopt/adapt #4 above)
Not a new page but worth restating as a standalone spec since it is high-value: implement the EA FC-style chemistry table (club: 2/4/7 players for 1/2/3 pts, nationality: 2/5/8 players, league: 3/5/8 players, 3-pt max per player, no positional requirement) as a shared utility function in src/lib/, then wire it into any existing lineup-builder game's post-game summary screen. Needs a club-to-league lookup added to or derived from player_market_values (club column already exists; league can be inferred or added as a lightweight companion table).

### 4. Guided question-tree guesser ("20 Questions" style, distinct name required, avoid "Guess the Footballer" and "Akinator")
A structured, tap-only question interface (not free text): player picks from a fixed menu of question types (club? country? position? league? age range? market value bracket?), each answered yes/no/sometimes (for "ever played for" vs "currently plays for" distinctions), 3 final guesses. Fully distinct input paradigm from everything else on our site (autocomplete, clue-reveal, or attribute-tile). Data source: player_market_values plus career_players/career_seasons give clean yes/no answerable facts (current club, all-time clubs, nationality, position, age bracket, value bracket). Build as a decision-tree UI over a filtered player pool, recomputing the remaining-candidate count after each answer for a satisfying "narrowing the field" visual (a running "X players remain" counter is a strong, cheap dopamine hook already proven by the genre).

### 5. Attribute-tile Wordle hybrid ("Kit Number" style crossed with tile feedback, or extend Footle directly, see adopt/adapt #10)
As a standalone new page if not folded into Footle: a mystery player is guessed via full-name autocomplete (not letter-by-letter), and each guess returns a row of colored attribute tiles (nationality match, position match, club match, age closer/further with an up/down arrow, market-value closer/further with an up/down arrow, shirt-number closer/further with an up/down arrow) rather than word-letter feedback. This is the single most requested-by-proxy mechanic in this research (it appears, in some form, on Who Are Ya, Wordlecup's soccer mode, and is implied by Statdle's clue set) and is trivially buildable from player_market_values plus shirt_number_puzzles' existing number data, giving us up to 6-7 comparable attributes per guess versus most competitors' 5-6.

### 6. Football-trumps chained higher/lower ("Statto Chain" or similar, distinct name required, avoid "Pack 11" and "Top Trumps")
Sequential player cards, 5 random stats shown per card, player picks which stat to wager will beat (or tie) the next card's same stat, one wrong pick ends the run immediately (survival, no partial credit, no lives). Distinct from our existing Higher or Lower (single fixed stat, presumably multiple lives or point-based scoring) by forcing a stat choice each round and using a harsher single-mistake fail-state. Data source: career_players/career_seasons has enough per-player career totals (goals, assists, appearances, trophies if tracked) to generate 5-stat card sets; ballon_dor and shirt_number_puzzles can supplement award-based and number-based stat categories respectively for variety.

### 7. Soccer Perfect Season / "Unbeaten" mode (see adopt/adapt #13, restating as build spec)
Spin for real clubs and season-years (or draft an all-time XI across eras), then run a deterministic simulation to see if the lineup could go a season unbeaten, directly matching our own already-built perfectSeason.ts simulation core (confirmed shipped for MLB/NBA/NFL/NHL per CLAUDE.md and the completed-tasks list) but never extended to soccer specifically. Build: reuse the existing deterministic sim engine, source club/season/era data from player_market_values (club, year columns) and career_players/career_seasons for individual-player career spans, this is the lowest-net-new-code item on this whole list since the hardest part (the simulation core) already exists and is proven across 4 other sports.

### 8. Frozen-era mystery player ("Time Capsule" or similar, extend World Cup game directly, see adopt/adapt #12)
As a standalone new page if not folded into World Cup: pick any past year, the mystery player's clues (club, market value, age, position) are all locked to that specific year rather than their current/final career state, letting the same real person generate a fresh, differently-difficult puzzle for every year they have a row. Data source: player_market_values already has a year column spanning 2004-2026 per its own field documentation in src/lib/whoAmI.ts, meaning this format is close to zero-new-data, purely a query and UI change layered onto the existing Who Am I or Footle infrastructure.

---

## Part 4: Retention playbook

Concrete, competitor-sourced patterns, translated into a spec for us.

### Midnight reset
Every single competitor site in this research resets at local midnight with no exception. This is the universal, unquestioned convention of the genre, our existing sitewide midnight reset backlog item (#27) is correctly scoped and should not deviate from local-midnight in favor of any other schedule (e.g., a fixed UTC time), since local-midnight is what trains the daily habit loop players already have from Wordle and every competitor listed here.

Spec for us: every daily game's countdown-to-next-puzzle display should read "New puzzle in Xh Ym" computed against the player's local midnight, not server midnight, matching Who Are Ya's explicit FAQ answer ("every day at midnight local time"). Backlog item #27 already targets this correctly.

### Streaks
No competitor site in this research publicly displays or emphasizes a numeric streak counter as heavily as the Wordle-descended genre generally does elsewhere (e.g., NYT Wordle/Connections), most rely on the share-card itself (a visible emoji grid posted to social) as the streak-proof artifact rather than an in-app streak number. The one exception is WhoAreYa.org's marketing copy, which explicitly promises "see where you stand on the leaderboard" for signed-in players, implying account-gated streak/leaderboard visibility rather than an anonymous one.

Spec for us: our existing backlog item #101 (daily streak system, per-game and global) should implement streaks as (a) a small persistent counter visible before and after each play, matching the psychological "don't break the chain" hook, and (b) bake the current streak number directly into the share-card text itself (e.g., "Day 14 streak") since every competitor's actual retention artifact is the shareable card, not an in-app-only number. Streak data should be tied to the account system (backlog #100 Profile page, #97 Account incentives) since the one competitor that explicitly promises richer streak/leaderboard features (WhoAreYa.org) gates it behind login, validating that account-required streak tracking is an acceptable, expected trade for deeper features.

### Cross-game score
This is the single biggest opportunity this research surfaced. No competitor has a true unified cross-game points score. The closest is playfootball.games' header widget showing "PLAYED 8/17 W8-8L," which is a completion tally, not a points total.

Spec for us: our existing backlog item #16 (cross-game daily score in header) should go one step further than any competitor by summing actual per-game scores (we already produce numeric or percentage scores in Soccer Grid's rarity score, Who Am I's similarity score, Shirt Number's tiered point values, Transfer Path's point-minus-penalty score, etc.) into one daily aggregate number, not just a completion count. Since we already have per-game numeric scoring on most soccer games, this is closer to "wire up the header widget" than "invent a new scoring system," and it would be a genuinely novel feature versus the entire competitive set researched here, not just an improvement.

### Share cards
Universal convention: clipboard-copy of an emoji-block result grid (Wordle-style), a "Game copied to clipboard" toast confirmation, and native mobile share-sheet integration where available. Several sites (Career Path Challenge, SuperDraft Soccer's Chemistry mode) explicitly offer a "Share Image" button distinct from the plain-text clipboard copy, generating an actual shareable image/screenshot rather than just emoji text, this is a step up in shareability (works natively on Instagram Stories and TikTok, where plain text pastes poorly) that most competitors have not universally adopted yet.

Spec for us: our existing backlog items #26 (consistent emoji-grid share cards) and #116 (TikTok-ready vertical results screens) are correctly prioritized; add the site URL to every share card's text (backlog #115 already covers this) since several competitor share-card examples found in this research (e.g., the Julio Piñeiro Box2Box screenshot on X) omit a URL entirely and rely purely on hashtags and screenshots for attribution, we should not repeat that gap given our smaller current brand recognition versus a 6.5M-visit incumbent.

### Difficulty and timers as a retention lever, not just a difficulty lever
The Easy/Normal/Hard/Legend plus 40s/60s/90s/unlimited timer combination seen across nearly every Futbol11 game is not really about difficulty tuning, it is a cheap way to let one piece of daily content serve casual, competitive, and speedrunning player segments simultaneously without authoring 3x the puzzles. This directly supports our own backlog item #40 (difficulty tiers beyond big-name players) and should be read as a retention feature (multiple play-styles return to the same daily puzzle) rather than purely an accessibility feature.

---

## IP-safety confirmation

Every mechanic recommended above is a game-logic pattern (grid crossovers, clue-reveal sequencing, similarity scoring, chemistry math, Wordle-style feedback, guess-or-skip loops, rarity/popularity scoring), none of it requires club crests, national team badges, kit designs, or athlete photographs to function, and none of the specs above suggest reusing another site's product name, marketing copy, or visual layout. The two formats found in this research that do inherently depend on protected visual assets (Guess the Football Club's logo-recognition mode, Who Are Ya's blurred-photo mode, KitTok/Guess the Kit's jersey-image mode) are explicitly flagged as do-not-copy above and excluded from every recommendation in Parts 2 and 3. All new-game names proposed in Part 3 are original placeholders, not copied from any competitor's branding.
