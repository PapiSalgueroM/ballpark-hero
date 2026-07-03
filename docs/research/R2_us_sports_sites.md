# R2 Research: US Sports Trivia Competitors Teardown

## Executive Summary (10 lines)

1. Immaculate Grid (Sports Reference, all sports) is the category benchmark: rarity scoring where lower is better, minimal ads, no leaderboard yet, acquired by Sports Reference in 2023 and now optioned for TV.
2. The Wordle-for-sports family (Poeltl, Weddle, MLB Pickle, Dangle) has converged on a standard: 8 guesses, autocomplete search, green/yellow/gray columns, arrows only on truly numeric fields like age.
3. The perfect-season genre (82-0, 38-0.app, 20-0.com, 17-0game.com) exploded from one viral tweet in June 2026 and fragmented into 15+ clones within weeks; hard mode with hidden ratings and daily challenges are now table stakes, live 1v1 is the newest differentiator.
4. NHL is the weakest-covered sport across every category researched: fewer competitors, thinner monetization, no breakout hit, which is DoUKnowBall's clearest whitespace.
5. Our own /football-grid, /soccer-grid, and /college-grid already have rarity scoring and unlimited mode; the gap is not the mechanic, it is depth (categories, difficulty tiers, sharing polish).
6. Sporcle proves that broad "name every team" list formats beat narrow "name every award winner" formats by 5 to 7x in raw plays, useful for our own Name Them All game.
7. League and union adoption is a real pattern: NBPA runs Poeltl, MLB Play runs MLB Pickle, MLB.com runs Daily Walkoff, the NBA runs its own guesser. Independent hobby projects have a real path to institutional partnership.
8. The single most sport-specific retention lever with no word-game equivalent is nostalgia-driven rarity scoring, what fan culture calls remembering obscure players; this rewards knowledge depth rather than just correctness and has zero pay-to-win risk.
9. Monetization across this entire category is unusually light: most sites run no ads or a single modest tier ($3 to $5 a month); the rare aggressive paywall (Gridiron Trivia) draws visible App Store backlash.
10. Biggest data-constrained opportunity: NHL, college basketball with cbb_awards/cbb_programs, and MLB with Lahman data are buildable now; anything needing NFL play-by-play or the two broken NCAA tournament tables is blocked until a cleanup step exists.

---

## Part 1: Per-Site Teardowns

### 1.1 Grid Games

#### Immaculate Grid (immaculategrid.com, all sport variants)
- **Mechanic**: 3x3 grid, each row/column is a team, stat achievement, or award; one guess per cell, 9 cells total, correct answers cannot repeat within a grid.
- **Input**: free text with autocomplete dropdown.
- **Scoring**: rarity score, each cell scores the percent of players who picked the same answer that day, lower is better, empty cells penalized 100 points, score is live and shifts through the day as more people play.
- **Daily vs unlimited**: one grid per sport per day, plus a full archive to replay any past grid.
- **Share format**: shareable link with spoiler gating, your answers stay hidden from a friend until they complete their own attempt, not a Wordle-style emoji block.
- **Monetization**: effectively none found, no ads or IAP confirmed, likely monetized indirectly via traffic to Baseball-Reference and sibling sites.
- **Stickiness**: personal stats dashboard with averages and streaks, no built-in leaderboard yet despite being repeatedly requested, an "Overtime" feature now lets you keep playing after a miss instead of hard-stopping.
- **Variants confirmed**: Baseball (original, April 2023), Football (July 2023), Basketball (July 2023), Hockey (July 2023), Soccer under the separate brand "Immaculate Footy" (August 2023), Women's Basketball.
- **Notable 2025-2026 news**: acquired by Sports Reference LLC in July 2023; optioned for a TV game show by Tom Brady and Michael Strahan's production company, announced October 2025; combined franchise reportedly nearing a million plays per week.

#### Crossover Grid (crossovergrid.com)
- **Mechanic**: same 3x3 format but with 9 guesses pooled across the whole grid rather than per cell, meaning wrong guesses cost you a shared budget. Spans NBA, NFL, soccer, NHL, MLB, college football, and unusually movies.
- **Input**: free text with dropdown autocomplete.
- **Scoring/share/ads**: not independently verifiable from public pages, flagged as a real gap in this research.
- **Positioning**: markets itself explicitly against Immaculate Grid and Sporcle in its own SEO copy.

#### HoopGrids (hoopgrids.com) and Gridiron Grids
- NBA-only and NFL-only grid clones respectively, same 3x3 mechanic, new puzzle at 8pm ET daily. HoopGrids reportedly allows unlimited guesses per cell rather than capping at 9 (one source disputes this, unresolved). Reported rarity tiers with emoji badges (crown for under 0.05 percent, and so on) but not independently confirmed against the live site.

#### Puckdoku (puckdoku.com) - NHL grid
- Same grid mechanic, 9 guesses, answers lock immediately on submit, daily midnight ET reset. Monetized via Patreon, explicitly "no accounts, no paywalls, no ads that block gameplay." Launched July 2023, referenced by respected hockey-data site PuckPedia. This is the strongest NHL-native grid competitor found.

#### Anything Grid (anythinggrid.com) - not sports-specific but relevant precedent
- General knowledge grid with a $3/month premium tier unlocking all answers, score breakdowns, and history, framed explicitly as "covers server costs." This is the clearest paid-tier precedent found anywhere in the grid genre.

#### Crossover Games (crossover.games) - portfolio model
- Broader daily-puzzle hub beyond grids: roster mode, a detective mode, a snake game, slots, and rankings, spanning NBA, NFL, MLB, NHL, soccer, and even WWE. Relevant as a format-diversity reference, not a single-mechanic clone.

---

### 1.2 Wordle-for-Sports Family

#### Poeltl (poeltl.nbpa.com) - NBA
- **Origin**: built by Gabe Danon in 2022, relaunched February 2024 as an official NBPA partnership with player Jakob Poeltl, the most institutionalized success story in the genre.
- **Columns (7)**: Team, Conference, Division, Position, Height, Age, Jersey Number.
- **Feedback**: green exact match; yellow means different things per column (team = played there before but not now, position = shares at least one position, height/age/number = within 2 units); gray/black = no match. Arrows are widely claimed by third parties but not confirmed in official rules text, treat as unverified.
- **Guesses**: 8. Input: autocomplete search bar.
- **Share**: Wordle-style emoji grid.
- **Monetization**: none found.
- **Stickiness**: optional silhouette hint button that reveals a shadowy player outline, this is the game that popularized that mechanic across the whole genre; streak counter; a promised full leaderboard announced in 2024 still appears unshipped, a real execution gap worth noting.

#### Weddle (weddlegame.com) - NFL
- **Origin**: two anonymous US high schoolers, launched spring 2022, named after and endorsed by NFL safety Eric Weddle. About 213,000 monthly visits as of April 2026 per Similarweb, rising trend, monetized via the Raptive ad network.
- **Columns (7)**: Team, Division, Position, Height, Age, Jersey Number, Weight (weight added since original launch).
- **Feedback**: green exact; yellow for division means right conference wrong division, height/weight/age within 2 units, and in hard mode position-yellow means same side of the ball but different position. No arrows found anywhere in current or historical source material, a real point of difference from Poeltl-style up/down signaling.
- **Guesses**: 8 normal, 10 hard mode (hard mode opens the player pool beyond skill positions).
- **Portfolio strategy (most important finding for us)**: the site now hosts Weddles, Draftles, a crossword called Mossword, Units, Grids, Scramble, 2 Minute Drill, and Film Room, each with Daily and Unlimited variants, several with per-team variants across all 32 NFL teams plus a separate college football version. This is the deepest "portfolio of dailies under one game name" strategy found in the entire research pass.

#### MLB Pickle (mlbpickle.com, mirrored at mlb.com/play/games/pickle)
- **Origin**: built by Jeremy Frank and Zach Ellis as an independent game called WARdle, rebranded MLB Pickle under an exclusive MLB Play sponsorship, the second confirmed case (after Poeltl) of a league body formally adopting an indie clone.
- **Columns (7)**: Team, League/Division combined, Bats, Throws, Born, Age, Position. No height, weight, jersey number, or draft year, uses handedness as its sport-specific twist the way Weddle uses weight and Poeltl uses jersey number.
- **Feedback**: green exact; yellow for league/division means right league or right division but not both, age within 2 years, position-yellow means logged 10+ games (5+ for pitchers) at that position without it being primary. Arrows confirmed only on the Age column, the sole fully-orderable numeric field.
- **Guesses**: 9. Monetization: none found, consistent with an official MLB-owned property.

#### Dangle (dangle.games) - NHL
- Poeltl-equivalent for hockey. Columns: Team, Position, Conference, Division, Age, Jersey Number. Green exact; yellow for age within 2 years, number within 5, or "played for that team at some point." 8 guesses, has the same non-punishing silhouette hint as Poeltl.

#### Gordle - confirmed NOT golf, it is NHL surname guessing
- Named for Gordie Howe, structurally identical to original Wordle (guess letters of a player's last name), not an attribute-comparison game at all. 6 guesses, standard green/yellow/gray letter feedback. Created by Sean McIndoe (The Athletic, Puck Soup podcast) in January 2022. No single canonical URL remains, now lives mainly via clone-portal mirrors, appears semi-dormant, no 2024-2026 chatter found. Real editorial pedigree but low current activity.

#### CraftedNBA "Guess the Player" (craftednba.com)
- A hybrid: instead of repeated full-player guesses, you click to reveal individual stat cards (position, age, height, weight, conference, division, and a dozen box-score rate stats). 10 guesses, score-based up to 1000 for a first-try solve. Closer to "20 questions with real box scores" than Wordle. This is the deepest stat set of any attribute guesser found.

#### League-official pattern worth flagging
Three of four major North American leagues now run or officially partner on this genre: NBPA (Poeltl), MLB Play and Baseball Savant (MLB Pickle, plus their own separate photo/pitch-ID games), and the NBA itself (Full Court Guess at play.nba.com). Only the NFL notably lacks a league-official version, Weddle remains fully independent there.

#### Multi-sport hub sites worth studying as format
- **Sportsdle.com**: one templated attribute guesser reused across NFL, MLB, NHL, soccer, UFC, and F1 with sport-appropriate column swaps, has a mobile app.
- **Sportdle.net**: broader still, covers NBA/NFL/NHL/EPL/EuroLeague/Tennis/F1/UFC plus esports, ships 4-5 distinct modes per league (Classic, Silhouette, Career Path, Clue Ladder, Stat Line), the richest mode variety confirmed anywhere in this research.
- **Dynasty Daddy (dynasty-daddy.com)**: a fantasy-football-adjacent hub running 10+ format types under one domain, Wordle clones, Immaculate-Grid-style, a Connections clone, a Strands clone, and a salary-cap lineup builder.

---

### 1.3 Perfect Season Family

**Framing**: this is not one company's product line, it is a viral genre that exploded from a single origin point in June 2026. **82-0.com** (NBA), built by Roy Saar and published by Vaulty Studios/PlayVault, went viral starting June 3, 2026 when an NBA player tweeted a lineup screenshot that hit 5+ million views. PlayVault's CEO has stated on record that every other "X-0" site is an unauthorized mimic, not a licensed sibling. Two of the four sites named in scope turned out to be different products than assumed.

#### 82-0.com - NBA, the genre origin
- **Mechanic**: 5 rounds, each spins a random NBA team plus decade (1960s-2020s), draft one player per round into PG/SG/SF/PF/C, one team re-spin and one era re-spin allowed per run.
- **Modes**: Classic (stats shown); Hoop IQ/Blind Draft (hard mode, no stats, alphabetical list, draft from memory); Daily Challenge (same 5 spins for everyone); 1v1 mode confirmed via app store reviews though described as buggy.
- **Scoring**: combines PPG/RPG/APG/SPG/BPG into a Strength Rating run through a season sim; the exact algorithm is explicitly undisclosed, the CEO calls it "the secret sauce."
- **Monetization**: no display ads observed, funded via Ko-fi donations, raised its funding goal after going viral due to server costs. Free iOS app.
- **Known live bugs**: App Store reviewers report streaks not saving across sessions and mobile-web plays not counting toward the leaderboard as of this research.

#### 38-0.app - CORRECTION: this is soccer, not NFL or college football
- English top-flight football, 1992-93 to present, plus a World Cup mode. Built solo by Josh Pavey, launched June 4, 2026.
- **Mechanic**: wheel spin lands on a club plus season, draft one player from that squad into a formation, repeat until an XI is full, simulate a 38-game season.
- **Modes**: Classic; Hard Mode (ratings hidden); Daily Challenge with explicit streak framing; One-Club XI (draft only from one club's history, has its own trophy set and leaderboard); Leagues (multiplayer, live drafting "coming soon"); Nations Trophy (a limited-time international tournament mode, signed-in only, permanent trophy on win).
- **Simulation**: models team balance, not just aggregate rating, an all-attack weak-defense XI explicitly leaks goals; results are re-simulated and cryptographically signed server-side specifically to prevent faked screenshots, worth studying as an anti-cheat idea.
- **Monetization**: AdSense plus a Buy Me a Coffee tip jar, explicitly free with no paywall.
- **Self-reported growth**: 45M+ impressions, 18M+ page views, 8M+ visits, 50k+ signups within about two weeks of launch.

#### 20-0.com - confirmed NFL, all-time players
- Built by an independent developer, unrelated to PlayVault. "20" means 17 regular season plus 3 playoff games, a stricter definition than standard 17-0 games.
- **Mechanic**: spin for franchise plus era, 12 roster slots split offense then defense, one re-roll per side of the ball, team+era combos never repeat within a run.
- **Modes (the richest confirmed list in the entire genre)**: Classic vs Gridiron IQ (hidden stats); Daily Challenge with rotating themed variants (one-decade-only, single-franchise, an "alphabet gauntlet"); Head-to-head (challenge a friend to an identical spin sequence); Ranked ladder (persistent Elo); Casual public pools; Tournaments (recurring hourly single-elimination brackets with in-game currency prizes); Leagues (private standings among friends); Single-Team Mode; a Daily Arcade sub-hub with an "Exact Record" weekly-prize mode and a "Higher Rated" comparison mini-game.
- **Scoring**: era-normalized 0-100 player rating blending era-relative production with durable accolades, position-weighted non-linear win curve (QB weighted 1.5x, EDGE/CB 1.2x), ratings hidden from the player at all times, not just in an optional hard mode. Site claims only 4 percent of runs go undefeated.
- **Monetization**: core game fully free, confirmed paid tiers of $4.99/month and $39.99/year for ad removal and cosmetics only, plus a cosmetic currency ladder from $1.99 to $49.99, explicitly "nothing is paywalled."
- **Sister satellite sites, same developer**: 98-0 (NBA beta), 16-0 (college football), 162-0 (MLB beta), 18-0 (golf beta), 40-0 (college basketball), 8-0 (World Cup soccer), 98-0 (NHL), 53-0 (WNBA).

#### 17-0game.com - confirmed NFL plus a bundled 12-0 college football mode
- **Mechanic**: spin for franchise plus decade or school plus year, no repeat eras allowed across rounds (unlike 82-0/38-0 which permit repeats), 8 roster slots, 2 team skips and 2 era rerolls per game explicitly numbered.
- **This is the weakest mode list of any active site in the genre**: hidden team rating is always-on by default rather than an optional hard mode toggle, but there is no daily challenge, no leaderboard, and no 1v1/head-to-head mode found anywhere, confirmed via direct fetch and a site-restricted search that indexes only the single homepage.
- **Scoring**: a described non-linear formula combining peak stats, accolades, chemistry, and hidden modifiers, including named synergy bonuses for real pairs (Brady and Moss, Mahomes and Kelce) and a weakest-link penalty capping the ceiling if one pick is bad.
- **Monetization**: no ads, subscription, or IAP language found anywhere, a real contrast with every other genre competitor.
- **This is a genuine, confirmed competitive gap**: it sits in the same genre as 20-0.com but lacks the daily challenge, leaderboard, and retention features its direct siblings have already shipped.

#### Other perfect-season sites worth noting
- **84-0.com**: multi-sport hub with the most concretely detailed live 1v1 confirmed anywhere, a top-nav banner promoting "Play 1v1 LIVE," described as a snake draft where a taken player can't be redrafted by the opponent, plus a "Hall of Perfection" leaderboard with All-Time/Month/Week/Today windows.
- **162-0.net (MLB, indie)**: explicitly credits 82-0 in its own credits modal, hitters-only, explicit era-normalization language ("50 homers in the 1920s isn't 50 homers today"), Classic/Challenge modes, Daily Mode with 5 locked plus 4 free picks, Ko-fi funded, "no ads."
- **"162-0: Historic Lineup Game" (iOS, solo dev)**: three named difficulty tiers, Classic (stats, ranked by skill), Scout (stats shown but sorted alphabetically instead of by rating, a genuinely clever middle-difficulty twist not seen elsewhere), Sicko (no stats, alphabetical, hardest). Daily, weekly, and monthly leaderboards.
- **PerThirtySix (perthirtysix.com)**: mandatory (not optional) era-lock requiring one pre-1995, one 1995-2009, and one 2010+ pick on every standard board; a live Arena room drafting mode with named Elo ranks from Practice Squad up to a single top seat called "Ultimate Knower of Ball"; "twist boards" that flip scoring to reward contrarian picks; a hard-mode variant with no player list at all, you must type from memory with no autocomplete.
- **databallr.com/sixrings (NBA)**: scored via real advanced metrics rather than a win-loss ladder, has the most mature head-to-head system found anywhere, ranked 1v1 plus free-for-all/trio drafts, Elo, rematches, tournaments, plus a Daily Arena with speed-bonus timers.
- **Sleeper's 17-0**: a real-life-connection "Chemistry" bonus system (plus 2 for same team, plus 1 for past teammates, plus 2 for same college, plus 1 for same draft class) and a hard free-play cap of 5 plays before requiring the Sleeper app, a metered-freemium approach distinct from ads or subscriptions.

**Direct answer on the four flagged priority modes:**
- **Hard mode/hidden ratings**: near-universal and table stakes across the genre.
- **1v1/head-to-head**: real and mechanically deep in several implementations (84-0's live snake draft, 20-0's ranked ladder, PerThirtySix's Arena, databallr's Duels) but NOT universal, a real differentiation opportunity rather than a checkbox.
- **Special event modes**: confirmed to exist as rotating/limited-time content (38-0's Nations Trophy, 20-0's themed daily challenges and hourly tournaments) but an extensive search found zero evidence of calendar-holiday theming (Christmas, Thanksgiving, and so on) anywhere in the genre. This is genuine first-mover whitespace.
- **Daily challenge**: confirmed universal and foundational across nearly every serious competitor, same-seed-for-everyone with a streak counter. 17-0game.com is the notable exception lacking it entirely.

---

### 1.4 Sporcle

- **Scale**: Sports category has over 615,000 quizzes and 1.13 billion total plays. Founded 2007, crossed 6 billion total plays in February 2025.
- **Most popular formats by plays**: NFL Teams (8.7M plays), 2014 World Cup Stars (~7.8M), NBA Teams (~6.8M), Big 4 US Sports Teams (~5.6M), NBA Logic Puzzle (~5.2M), MLB Teams (~3.9M). By contrast a narrower quiz like NBA MVPs has only 1.18M plays despite a higher rating. **Key finding: broad, low-friction "name the teams" formats dramatically outperform narrower "name every award winner" formats in raw volume, by 5 to 7x, even when the narrower quiz is rated higher.**
- **Formats**: classic type-in list quizzes, Blitz (fast fixed-timer variants, sometimes 60 seconds), Picture Click/image click, and Logic Puzzle/Minefield style.
- **Mechanic**: single text box, answers fill into a pre-drawn grid of blanks, live running score, variable timer per quiz (roughly 6-7 minutes for a 30-70 answer list), an untimed Practice Mode exists but forfeits badge/challenge credit.
- **Monetization ("Sporcle Orange")**: Individual $3.99/month or $43.99/year, Family $6.99/month or $74.99/year, removes ads and adds advanced stats, unlimited lessons, bonus games, and a monthly virtual currency spent on badge unlocks and a streak-saver.
- **Stickiness**: over 1,400 badges collected 70 million+ times cumulatively, streaks with a purchasable Streak Saver, async Challenges plus real-time Showdown 1v1, a separate Sporcle Party mobile app for group trivia, a formal user-generated-content pipeline with volunteer Curators per subcategory.

---

### 1.5 NBA-Specific Daily Games

- **HoopGrids**: real, distinct NBA-only grid clone of Immaculate Grid's own NBA tab, so it competes rather than fills a gap.
- **StatMuse**: confirmed NOT a trivia or game product, it is a natural-language stats search engine, no gamification, no streaks, no daily challenge. Monetized via a $20/month StatMuse+ subscription plus ads and a licensed API.
- **Dunkest**: confirmed a FALSE LEAD, it is an Italian season-long fantasy basketball platform spanning NBA, EuroLeague, and Serie A, founded 2013, 200,000+ active managers, zero connection to daily trivia.
- **NBAdle**: open-source-origin Wordle clone, same mechanic as Poeltl, many near-identical unofficial mirrors, fragmented with low differentiation.
- **Bottom line**: Poeltl remains the only NBA daily game with unambiguous institutional backing (NBPA); HoopGrids is real but redundant with Immaculate Grid's existing NBA vertical.

---

### 1.6 NFL / MLB / NHL Additional Daily Trivia (beyond the well-known names)

**NFL**: Pro Football Network's in-house guessing game (8 guesses, 6 clue columns, point-decay scoring); Gridiron Trivia (a 5-mode hub with a real freemium stack, $4.99/month or $39.99/year or $59.99 lifetime, drawing App Store backlash for aggressive paywalling, a cautionary example); NFLdle (8 clue columns, the deepest attribute set found for NFL); FUMBLL (has an irreversible Hard Mode toggle that hides "close" indicators and tags the shared result).

**MLB**: Winfield Game (winfieldgame.com) is the standout indie stickiness case study in this entire research pass, a documented 306-day streak leaderboard proves real long-term engagement, plus a "Cal Ripken Jr. Ironman Streak" leaderboard framing and a confirmed copy-paste share block. Baseball Connections runs 13 distinct daily formats under one brand including a Bill-James-style similarity guesser with a percent-match score. Daily Walkoff is a clean indie-to-licensed success story, built independently then absorbed into MLB.com's official free-to-play lineup alongside Beat the Streak.

**NHL**: this category is real but noticeably thinner than NFL or MLB, no NHL-native game showed hard proof of scale comparable to Weddle or Winfield. Hertl (hertl.app) notably has both a daily AND a confirmed unlimited/practice mode, rare in this category. Gridlocked Hockey (mobile app) separates skater grids from goalie grids, relevant given our own data gap (see Part 3). Sportsdle's NHL mode is the clearest freemium NHL implementation, ads plus rewarded-video ads that let you earn an extra guess or shield a streak, and a $2.99 CAD/month ad-free tier.

**Aggregator note**: a cluster of near-identical "best sports Wordle" directory sites (Listdle, Alldle, dailydle.org, dle.games) trace back to one shared open-source template, do not treat these as 5 independent competitors. Betting-affiliate companies (Shurzy) and sports-media brands (ClutchPoints) use these listicles as SEO funnels, worth knowing when reading "best of" roundups as market research rather than neutral rankings.

---

## Part 2: Adopt/Adapt List Mapped to Our Existing Games (Ranked)

Note: several of our grids already have rarity scoring and unlimited mode (`/football-grid`, `/soccer-grid`, `/college-grid` per `useFootballGrid.ts`, `useSoccerGrid.ts`, `useCollegeGrid.ts`), so recommendations below build on that foundation rather than duplicating it. Task #92 (Soccer Grid upgrade) and #101 (College Grid categories) already exist in the tracker; ranking here should inform how those get scoped.

1. **/football-grid, /soccer-grid, /college-grid: spoiler-gated share links, not just an emoji block.** Immaculate Grid's actual sharing mechanism is a link that hides your answers from a friend until they finish their own attempt. Our current share format (task #134, emoji-grid block) is a fine baseline but a gated-reveal link is the more copy-worthy mechanic if we want the "send this to a friend" loop Immaculate Grid gets real credit for.
2. **/football-grid, /soccer-grid, /college-grid: add "Overtime" so a wrong guess does not hard-stop the grid.** Immaculate Grid added this specifically because players hated dying with 2 cells left. Check whether our grids currently hard-stop on a miss; if so this is a low-effort, high-goodwill fix.
3. **/stat-detective: add a silhouette-reveal hint tier.** Poeltl and Dangle both use a non-punishing shadow-outline hint as their signature assist mechanic. Stat Detective already has hint tiers (`hintsFor`, `nextHintAt` in `statDetective.ts`); a visual silhouette hint (even a simple blurred jersey-number badge if we cannot use photos for IP reasons) would fit the existing hint ladder.
4. **/nfl-career, /baseball-career, /hockey-career, /nba-chain-adjacent guessers: adopt the standard 7-column attribute table.** Poeltl/Weddle/MLB Pickle converged on team, conference/league, division, position, height/weight, age, and a sport-specific twist column (jersey number for NBA/NFL, handedness for MLB). Our career-guess games should audit against this standard column set and specifically add the "one sport-specific twist column" idea (handedness-equivalent for each sport) since that is what makes each site feel native rather than templated.
5. **/nfl-career, /hockey-career: arrows only on genuinely numeric columns, not on categorical ones.** Confirmed pattern: MLB Pickle only arrows the Age column; Weddle has no arrows at all despite numeric columns, because it treats "close" as binary not directional. Do not over-apply arrows sitewide (task #26/#134 share-card work); reserve them for age, height, weight, jersey number, draft year.
6. **/perfect-season-nfl, /perfect-season-nba, /perfect-season-mlb, /perfect-season-nhl: ship Hard Mode with hidden ratings as the single highest-confidence must-ship feature.** This is confirmed near-universal across every perfect-season competitor and is explicitly named in task #118. 20-0.com's version (ratings hidden at all times, not just optional) versus 82-0's Hoop IQ (alphabetical, no stats) are two valid implementations; recommend the always-hidden version paired with an explicit toggle for players who want the easier classic mode, since 17-0game.com's always-on-hidden design was called out as harsh with no opt-out.
7. **All four Perfect Season games: ship a real Daily Challenge with a shared seed and streak counter, if not already present.** Confirmed universal and foundational; 17-0game.com is the one competitor confirmed to lack it and that is treated as a real weakness in the research, not a footnote. This maps directly to task #118.
8. **Perfect Season family: add a themed daily-challenge rotation (one-decade-only, single-franchise, alphabet gauntlet).** 20-0.com's rotating themed dailies were the richest event-mode system found in the genre. This is a cheap way to add the "special event mode" the product spec called out without building full 1v1 infrastructure.
9. **Perfect Season family: consider async head-to-head before live 1v1.** 20-0.com's "challenge a friend to an identical spin sequence" is async and much simpler to build than 84-0's live snake draft. Recommend this as the MVP version of the 1v1 mode named in the spec, with live drafting as a stretch goal.
10. **Perfect Season family: add a synergy/chemistry bonus for real-life pairs.** 17-0game.com (Brady+Moss, Mahomes+Kelce) and Sleeper's 17-0 (same-team, same-college, same-draft-class bonuses) both use this. This is pure data-driven flavor, cheap to compute from existing roster/draft tables, and adds a reason to draft "correctly" beyond raw rating.
11. **Perfect Season family: cryptographically sign or server-verify final results.** 38-0.app re-simulates and signs results server-side specifically to stop faked screenshots. Given results will be shared publicly, this protects the credibility of any future leaderboard (task #124).
12. **/nba-chain, /ufc-chain, /tennis-chain, /nascar-chain: add a "Scout mode" middle difficulty.** The 162-0 iOS game's three-tier system (Classic ranked by rating, Scout shown but alphabetical, Sicko hidden and alphabetical) is a genuinely clever difficulty ladder not seen elsewhere; our chain games currently seem to be single-difficulty per the file scan, adding a middle "alphabetical but visible" tier is a cheap addition on top of existing player-pool data.
13. **/list-quiz (Name Them All): prioritize broad "name every team/league member" prompts over narrow "name every award winner" prompts.** Sporcle's own data shows 5-7x more plays on broad list quizzes even when the narrow quiz is rated higher. Audit our list-quiz prompt set (task #146 puzzle pool audit) with this weighting in mind.
14. **Any game with a hint system: consider a rewarded-hint-for-streak-shield mechanic.** Sportsdle's NHL mode lets a rewarded ad grant an extra guess or shield a streak. This is a monetization-and-retention combo worth testing once our ad infrastructure is standardized (task #113) and before streaks ship (task #123).
15. **/deal-or-no-deal and /squad-deal: nothing to adopt directly from this research batch**, these are closer to game-show format (covered in a different research thread), but the anti-cheat server-signing idea from #11 above applies equally if these ever get a public leaderboard.
16. **Sitewide: avoid the Gridiron Trivia mistake.** Its 5-mode hub is well-built but draws real, named App Store backlash for forcing payment to "literally play." Any monetization added per task #112/#113 should stay closer to the Anything Grid or Sporcle Orange model (a modest ad-removal tier, not a play-gate).
17. **Sitewide: none of our current games appear to have a spoiler-free social share tuned for pre-existing fan communities (subreddits, group chats).** Immaculate Grid's virality is directly traceable to being shared into the Baseball subreddit and a specific Twitter account, not organic discovery. This is more a distribution/marketing note than a code change, but it should inform which share format we prioritize for task #115 (rarity scores and streak numbers are what people paste into group chats, not raw completion booleans).

---

## Part 3: Ranked New-Game List (with data notes)

Data constraints repeated for reference: `nflfastr_rosters` (60K rows) exists but there is NO NFL play-by-play; `ncaa_tournament_games` is unusable and `ncaa_basketball_champions` is 53 percent false positives, do not propose anything needing those without a cleanup step first; `cbb_awards` and `cbb_programs` (186 rows) are clean; Lahman baseball data exists; NHL skater points data exists but there are no goalie stats.

1. **NHL Immaculate-Grid-style skater grid (new route, e.g. /hockey-grid).** NHL is confirmed the thinnest-covered sport in every category researched, and no NHL-native grid has broken out despite 4+ competitors trying (Puckdoku, NHL Grid, Sportsdle's grid, Gridlocked Hockey). This is a genuine whitespace with a clear template to follow. Data need: skater points data already exists per the constraint notes, sufficient for team/stat-threshold row-column criteria; must scope to skaters only since there are no goalie stats, mirroring Gridlocked Hockey's own skater/goalie split as precedent for scoping around a data gap rather than blocking on it.

2. **NHL Wordle-style guesser (new route, e.g. /hockey-guess or expand /hockey-career).** Same rationale, NHL has the weakest field (Dangle and Hertl are the only credible attribute guessers and neither shows strong scale signals). Data need: skater points data covers the standard 7-column template (team, conference, division, position, age, jersey number, plus handedness as the sport-specific twist column); again scope to skaters given the goalie-stat gap.

3. **College basketball Immaculate-Grid-style grid (new route, e.g. /cbb-grid) using cbb_awards and cbb_programs.** These are explicitly flagged clean (186 programs, plus awards data), unlike the two broken NCAA tournament tables. This lets us build a real college basketball grid competitor without touching the poisoned tournament data. Row/column criteria could use program (from the 186-row clean table) crossed with individual award (from cbb_awards), avoiding any need for tournament-result criteria entirely.

4. **MLB Bill-James-style similarity guesser (new route, e.g. /mlb-similarity) using Lahman data.** Baseball Connections' Similarity game (percent-match score, starts at 1000 points, deducts for stat differences) is a distinct scoring mechanic from anything we currently run, and Lahman data is confirmed to exist and is exactly the shape of data (career stat lines across eras) this mechanic needs. This is a good complement to our existing /stat-detective rather than a replacement.

5. **Perfect-season "themed daily" event layer, not a standalone game but a mode addition (applies across all 4 existing Perfect Season routes).** Listed here rather than in Part 2 because it is closer to new content production (writing weekly themed prompts: one-decade-only, single-franchise, alphabet gauntlet) than a code change. Data need: none beyond what each Perfect Season game already has, this is a prompt-generation and rotation-scheduling task.

6. **NFL "attribute guesser using nflfastr_rosters" (expand /nfl-career rather than a new route).** Confirmed buildable within the stated NFL play-by-play block: rosters data supports the standard 7-column template (team, conference, division, position, height, age, jersey number) without ever touching play-by-play. This directly follows the Weddle/NFLdle template and is the safest new NFL content given the play-by-play block; do not attempt any "guess the play call" or drive-outcome game, those genuinely need play-by-play and are correctly blocked per task #91.

7. **MLB perfect-season "Scout mode" middle-difficulty tier retrofit (applies to /perfect-season-mlb specifically, since Lahman data supports era-accurate alphabetical sorting cleanly).** Not a new game, but flagged here because it is the single most novel scoring/difficulty idea found in the entire perfect-season research (three-tier Classic/Scout/Sicko from the 162-0 iOS game) and MLB is the sport with the cleanest supporting data (Lahman) to sort alphabetically-but-accurately across every era without gaps.

8. **Do not build: any grid, guesser, or perfect-season game using ncaa_tournament_games or ncaa_basketball_champions as-is.** Explicitly called out per the brief. If a future data-cleanup task fixes the 53 percent false-positive rate, a "March Madness Immaculate Grid" (bracket-result criteria crossed with program) would be a strong, competitive-parity idea since no incumbent found in this research does college basketball tournament history well, but it must wait for the cleanup step.

---

## Part 4: Retention Playbook Findings Specific to US Sports Dailies

Ranked from most generic (every daily puzzle uses these) to most sport-specific (only sports trivia can use these):

1. **Streak loss aversion.** Once a streak exists, motivation flips from playing to gain to playing to avoid losing what is already banked, losses feel roughly twice as painful as equivalent gains feel good. Sports culture already reveres streak language (a 56-game hit streak, a 2,632-game ironman streak), so a trivia streak maps onto a frame sports fans already over-index on emotionally, stronger than in a neutral context. Duolingo's own data shows a streak-wager feature drove a measurable retention lift, this is not just anecdotal.

2. **Single daily puzzle scarcity.** Capping access to one puzzle a day avoids the endless-drip feeling of infinite-play games and leaves players wanting more rather than burning out. Sports fans already live on a scarcity rhythm, one game per team per day or week, a finite season, so a single daily puzzle fits a cadence fans already accept.

3. **Fixed, local reset time.** A midnight local reset anchors the game as a fixed point on an individual's personal daily calendar. Sports fans already structure their day around fixed time anchors like game start times, so a consistent reset reinforces a ritual fans are primed to accept. This directly supports task #27 (sitewide midnight reset convention), it is a real retention lever, not just cosmetic polish.

4. **Deliberate absence of push notifications, except one well-timed nudge.** The genre's most successful examples explicitly avoid nagging, most sports apps already lean hard on constant notification pressure (score alerts, injury news), so a calmer trivia product can differentiate on trust. A single "your streak needs you" nudge threads the needle better than constant pings.

5. **Social proof via a spoiler-free share format seeded into pre-existing fan communities.** A shareable result that lets players brag without revealing the answer resolves the tension between wanting credit and not wanting to ruin it for others. Sports fandom already has built-in social graphs for comparison, fantasy leagues, team subreddits, family group chats organized around a shared team, that a generic word game does not have access to. Immaculate Grid's virality is directly traceable to being shared into an existing baseball subreddit and a specific sports Twitter account, not cold discovery. This is the single highest-leverage, lowest-cost lever available and should shape how task #115 (share cards) gets prioritized: design for "what gets pasted into a group chat," which research shows is a rarity score or a streak number, not a raw completion checkmark.

6. **Nostalgia and stats-knowledge as an ego reward, the mechanic with no word-game equivalent.** Rarity scoring shifts the goal from getting it right to getting it right cleverly, rewarding recall of forgotten journeymen and old trades. Fan culture already does this informally in conversation, sometimes called "remembering some guys." This formalizes a behavior sports fans already perform for free and has zero pay-to-win risk since it rewards knowledge, not purchases, which is exactly why a paid-hint mechanic would undercut it (see finding 8 below).

7. **Low time commitment, low friction to start.** No app download, no forced account, roughly 3 minutes to play, is a precondition for habit formation. Evidence exists of fans stacking multiple sport-specific dailies into one 15-20 minute morning routine. For a multi-game catalog like ours this compounds: frictionless individual games let a session become "play 4 or 5 games" rather than just one, which supports task #70 (recommend by variety) and argues against adding friction (forced sign-in, long loading) to any single game.

8. **Skill expression without pay-to-win.** Every player gets the identical puzzle and identical attempt count, outcomes are attributed to knowledge and logic, not purchases. Sports-fan identity is tied to earned knowledge built over years; a pay-to-win mechanic (buying hints or extra guesses) directly undercuts that ego reward. This is exactly the criticism Gridiron Trivia draws in App Store reviews for aggressive paywalling, a live cautionary example to avoid as ad/monetization policy (tasks #112, #113) gets finalized.

9. **The Zeigarnik effect, an unfinished task is a cognitive itch.** People fixate on unfinished tasks far more than completed ones; an empty grid is a deliberately visible open loop. A partially-filled grid (6 of 9 cells solved) is a more naggy, spatially obvious open loop than an abstract letter guess. For grid-format games specifically, preserving visible in-progress state across a session (rather than resetting) could measurably increase same-session completion and next-day return, worth testing on /football-grid, /soccer-grid, /college-grid.

10. **Desirable difficulty that self-calibrates to any skill level.** Fan knowledge varies enormously by sport, era, and team, unlike a word game's roughly uniform floor. Rarity scoring elegantly self-calibrates, a casual fan gets the easy common answer and still completes the grid, a die-hard fan chases the rare answer for the ego reward, without needing fixed difficulty tiers built by hand. This argues for prioritizing rarity/score-based feedback over hand-authored difficulty tiers where the two approaches compete for engineering time.

11. **League and union adoption as a growth path, a business-model finding rather than a mechanic.** Independent hobby projects (Poeltl, MLB Pickle, Daily Walkoff) have a real, repeated path to institutional partnership once they show traction. Not directly actionable for DoUKnowBall today, but worth knowing as a long-horizon distribution option if any single game here breaks out.

12. **Format proliferation as proof of format-market fit.** The Wordle mechanic was forked into sport-specific versions almost immediately and cheaply by independent hobbyists, and the same rapid-clone pattern just repeated for the perfect-season genre in June 2026. This validates a strategy of building sport-specific variants of a few proven core formats (grid, attribute-guesser, perfect-season) across our under-covered sports (NHL especially) rather than inventing an entirely new mechanic per sport.

---

## Sources and Confidence Notes

All findings sourced via public web search and page fetches only, no logins, no accounts created, no purchases made, consistent with the IP-safety instruction to research mechanics without touching logos, crests, or athlete photos, and without copying names, copy, or design from any competitor. Confidence varies by claim: grid mechanics for Immaculate Grid and the Poeltl/Weddle/MLB Pickle column and feedback tables are corroborated across multiple independent sources and treated as high-confidence. Crossover Grid's scoring formula and ad presence, several NHL games' guess-input details, and a few App Store price points hit rate limits during verification and are flagged inline above as unconfirmed rather than stated as fact. Where a claim rests on a single secondary source (for example HoopGrids' guess-limit rule, which had one direct contradiction), that conflict is noted rather than resolved.
