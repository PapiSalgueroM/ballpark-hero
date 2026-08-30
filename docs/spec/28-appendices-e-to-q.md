<!-- spec-part-header -->
> Part 29 of 29 of the Master Build Specification, version 1.0, August 2026.
> Covers APPENDIX E to APPENDIX Q. Index: `docs/spec/README.md`. previous `27-blueprint-rules-and-milestones.md`.
>
> The part files hold the spec verbatim. Concatenated in index order they reproduce
> the original document byte for byte, and `scripts/simSpecSplit.mjs` proves it on
> every run. Edit the spec here, never by keeping a second copy somewhere else.
<!-- /spec-part-header -->
# APPENDIX E — GAME-BY-GAME ROADMAP

## E1. Games to retire/rework
- Overrated or Underrated
- Tier List
- Billion Dollar Game
- Rebuild
- Stadium Tycoon
- Wonderkid Factory
- Banker's Offer
- Player Stock Market
- Fantasy Draft
- Sign the Player

## E2. Games to maintain/expand
- Soccer Grid
- Connect 4
- Connections
- Footle
- Career Quiz
- Higher or Lower
- Transfer Path
- World XI
- Missing XI
- Player Bingo
- Clue Auction
- Alphabet Sprint
- Rarity

## E3. New flagship candidates
- NBA Stat Line
- Soccer Conquest
- Universal Draft
- Sports Bingo
- Search & Discard
- Interactive Soccer
- Sports Empire
- Tower Defense
- Sports Party

---

# APPENDIX F — NBA STAT LINE DETAILED SPEC

## Goal

Create a game that rewards deep statistical knowledge rather than name recognition alone.

## Mode 1 — Game Finder
Given a stat line, identify:
- player;
- opponent;
- date/game if required.

## Mode 2 — Season Finder
Identify the player-season.

## Mode 3 — Five-Season Aggregation
Pick five player-seasons that approximate a target aggregate profile.

## Mode 4 — Similarity Battle
Two users compete to produce the closest stat profile.

## Mode 5 — Historical
Only players from specified era.

## Scoring

Weighted components:
- PTS
- REB
- AST
- STL
- BLK
- FG%
- 3P%
- FT%

Weights vary by mode.

Display:
- overall similarity;
- component bars;
- exactness;
- rank.

---

# APPENDIX G — UNIVERSAL POSITION COMPATIBILITY MATRIX

Create a sport-specific matrix.

Soccer example:

GK:
- compatible: GK

RB:
- RWB, CB in permissive mode

RWB:
- RB, RM, RW in permissive mode

CB:
- CB, DM in permissive mode

LB:
- LWB, LM in permissive mode

CM:
- DM, AM

RW:
- RM, RF, CF only if verified for player

LW:
- LM, LF, CF only if verified

ST:
- CF

The "strict" mode uses verified historical usage rather than theoretical compatibility.

---

# APPENDIX H — PLAYER SEARCH/SELECTION RULE

When a user searches a player:
- show exact matches first;
- current team;
- primary position;
- flag;
- active status.

Filters:
- era;
- sport;
- team;
- league;
- position.

Never show a Premier League player in a La Liga-filtered player list unless the game explicitly allows cross-league history.

---

# APPENDIX I — GAME RESULT SCREEN STANDARD

Result screen:
1. headline;
2. score;
3. percentile/rank;
4. XP;
5. streak;
6. badges earned;
7. share;
8. play another;
9. related game;
10. report issue.

For longer sims:
- season summary;
- trophies;
- finances;
- manager/athlete development;
- next season.

---

# APPENDIX J — SOCIAL RESULT COPY

Examples:

"DoUKnowBall — NBA Stat Line
Score 94%
Top 6%
Can you beat me?"

"DoUKnowBall Soccer Grid
9/9
Rarity 31
Streak 42"

"DoUKnowBall Club Manager
Season 6
La Liga Champion
Champions League winner"

Never include private financial/account information.

---

# APPENDIX K — IMPLEMENTATION ORDER BY REUSABILITY

Highest leverage first:
1. data;
2. identity;
3. result/scoring;
4. saves;
5. competition;
6. simulation;
7. animation/presentation;
8. social;
9. economy;
10. experimental games.

---

# APPENDIX L — CLAUDE CODE OPERATING INSTRUCTIONS

When working inside the repository:

## Before editing
- inspect;
- understand;
- map dependencies;
- identify reusable components;
- run tests/build if available.

## While editing
- make small reversible changes;
- preserve existing routes;
- add tests with new logic;
- reuse shared components;
- update types;
- update schemas;
- validate data.

## After editing
- run tests;
- run build;
- run lint/typecheck where configured;
- inspect affected pages;
- inspect mobile layouts;
- verify database migration;
- verify analytics events;
- verify SEO metadata.

## Before finalizing
Provide a concise change summary internally to the operator and list:
- implemented;
- tested;
- known limitations;
- next recommended task.

Do not claim a feature is complete when only its UI exists.

---

# APPENDIX M — AI CODING AGENT RULES

1. Do not hallucinate APIs.
2. Do not invent package names.
3. Read existing package.json and lockfile.
4. Use the project's existing framework conventions.
5. Reuse existing data providers.
6. Do not introduce a second auth system.
7. Do not introduce a second database unless justified.
8. Do not duplicate layout components.
9. Do not duplicate player/team schemas.
10. Do not delete production code until replacements are verified.
11. Never hard-code current schedules.
12. Never hard-code historical tournament formats.
13. Never trust client-side scores.
14. Never expose secrets.
15. Never store secrets in client bundles.
16. Never use unlicensed scraped images.
17. Never create fake quotes from real people.
18. Never add cash gambling.
19. Always test edge cases.
20. Favor reusable systems.

---

# APPENDIX N — "DO NOT SHIP" LIST

Do not ship:
- wrong player position;
- age 0 caused by missing data;
- current team in historical mode;
- incorrect league table;
- cup page showing another competition;
- broken bracket;
- stale ticker presented as live;
- random score changes on refresh;
- duplicate leaderboard points;
- duplicate footer;
- game with no help;
- game with no report mechanism;
- game button that does nothing;
- fake live score;
- fake news quote;
- unmoderated public username system;
- unlicensed image batch;
- ad overlapping game controls;
- casino/wagering system;
- search pages with no meaningful user value.

---

# APPENDIX O — SUCCESS DEFINITION

The product is succeeding when:

A new visitor can understand it immediately.

A returning user knows exactly what to do today.

A sports fan can find their sport in seconds.

A trivia fan can play dozens of strong games.

A simulation fan can spend hours inside a save.

A friend can challenge a friend.

A user can build a persistent identity.

The site's real-world sports information feels alive.

The games are fast and accurate.

The simulations are deep.

The interface is polished.

The data can be trusted.

The site earns revenue without ruining the experience.

And most importantly:

**DoUKnowBall feels like one world, not a pile of games.**

---

# APPENDIX P — OWNER'S FEATURE TRANSLATION MATRIX

| Owner request | Engineering interpretation |
| --- | --- |
| "Ticker like ESPN" | Central live-event stream + ticker UI |
| "Random Kahoot names" | Safe username generator + moderation |
| "More animated profiles" | Avatar engine |
| "More flags" | Shared country/region component |
| "Fully like FIFA" | Expand management systems, not literal cloning |
| "FutMob formatting" | Information architecture inspiration |
| "More eras" | Versioned historical data |
| "God mode" | Sandbox configuration |
| "More coaches" | Staff engine |
| "Board/fans/players" | Independent sentiment systems |
| "Finance everything" | Finance ledger |
| "More realistic transfers" | Multi-stage negotiation engine |
| "Better live match" | Simulation + event presentation |
| "More drills" | Interactive skill-game engine |
| "BitLife soccer" | Universal career/life event system |
| "Transfer everything to NBA/NFL/etc." | Shared career/manager engine |
| "WNBA" | Sport configuration + WNBA-specific rules |
| "Conquest" | Shared map engine |
| "FIFA Bingo" | Pack + constraint + board engine |
| "Search & Discard" | Draft/selection engine |
| "Sports Star Idle" | Idle economy engine |
| "Tower defense athletes" | Hero/tower engine |
| "Wii Olympics" | Browser sports-party arcade |
| "More SEO" | Search-intent landing pages + technical indexing |
| "AdSense" | Ad-safe layout and policy-aware implementation |
| "Don't get sued" | Rights-aware content/assets + moderation + legal review |
| "More puzzles" | Automated validated puzzle factory |
| "More realistic" | Rules + consequences + data |
| "Everything works" | Full acceptance-test gates |

---

# APPENDIX Q — FINAL BUILD COMMANDMENT

If a shortcut creates a feature that looks impressive but is fake, choose correctness.

If adding another game would make the core platform worse, choose the core platform.

If real data is unavailable, do not invent it.

If a feature can be built once and reused 20 times, build the reusable engine.

If a player can spend 30 minutes in a game, save their progress reliably.

If a user can compete with another user, make the result fair.

If ads make gameplay worse, redesign the ad placement rather than the game.

If animation makes a moment more exciting, animate it.

If animation adds nothing, do not add it.

If a historical mode exists, preserve history.

If the site says "live," it must actually be live or clearly marked delayed.

If a user reports an error, make sure the operator can find and act on it.

The final objective is not maximum feature count.

The final objective is maximum **quality × depth × retention × trust**.

