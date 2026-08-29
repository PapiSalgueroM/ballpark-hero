
# DoUKnowBall — Master Build Specification
## Product, Engineering, Game Design, Data, UX, SEO, Monetization, Safety & QA
### Version 1.0 — August 2026

---

# 0. EXECUTIVE DIRECTIVE

You are Claude Code working on the existing DoUKnowBall codebase.

This document is the product and engineering north star for the next major generation of DoUKnowBall. It is intentionally very detailed. Treat it as a requirements document, architecture guide, product roadmap, QA checklist, and acceptance-test reference.

The owner wants DoUKnowBall to become the greatest sports gaming website possible: not merely a trivia site, but a unified browser sports platform combining quick games, daily games, simulations, career modes, management modes, interactive arcade games, conquest, drafts, social competition, profiles, progression, data, live sports information, and long-term saves.

DO NOT interpret every idea below as a command to implement everything in one deployment. Build the platform in layers. The highest priority is correctness, shared infrastructure, maintainability, and flagship game quality.

## Non-negotiable development principles

1. Preserve existing working functionality unless a deliberate migration replaces it.
2. Do not destroy or rewrite the application blindly.
3. Inspect the existing repository, routes, database, components, styles, APIs, game engines, tests, and deployment configuration before changing architecture.
4. Prefer shared systems over duplicated per-game implementations.
5. Never invent sports facts when authoritative data can be obtained and validated.
6. Never hard-code historical competition formats when they vary by season.
7. Never sacrifice gameplay quality merely to increase game count.
8. Every game must have a clear objective, rules, scoring model, help UI, report-issue UI, and deterministic/validated result logic.
9. Long-running games must support reliable saves. Account-based cloud save should supersede browser-only persistence wherever possible.
10. Interactive games must feel interactive: movement, timing, input, feedback, animation, and consequences.
11. Do not use gambling/casino mechanics or real-money wagering in the core product. Use safe, non-cash virtual packs/rewards only.
12. Build for minors and adults safely: moderation, privacy, ad-safety, and family-friendly defaults are required.
13. Do not intentionally create search-engine-only pages. Every indexable page must provide meaningful user value.
14. Do not copy competitors' copyrighted assets, trademarks, source code, or exact visual identity. Take inspiration from common interaction patterns and information architecture only.
15. Do not ship known data corruption. If a source is uncertain, mark it uncertain internally and prevent it from entering player-facing verified content.
16. Every major feature must have acceptance tests.
17. Every important game should be playable in seconds, but deeper games should also support sessions lasting minutes or hours.
18. Treat the site as one connected product, not 100 unrelated games.

---

# 1. PRODUCT VISION

## 1.1 One-sentence vision

DoUKnowBall is a sports playground where a user can test sports knowledge, compete with other fans, build careers and dynasties, manage teams, play interactive sports mini-games, collect achievements, and build a persistent sports identity.

## 1.2 Product layers

### Layer A — Discovery / Snack
Fast games users can understand in under 10 seconds and complete in under 5 minutes.

Examples:
- Grids
- Connections
- Higher or Lower
- Career Path
- Missing Player/XI
- Rarity
- Stat Line
- Guess the Player
- Alphabet Sprint
- Clue Auction

### Layer B — Habit
Daily games, streaks, leaderboards, challenges, social sharing, recurring competitions, and daily score caps.

### Layer C — Depth
Career modes, dynasty modes, front-office simulations, club management, idle/tycoon games, conquest, card/draft systems, and long-running saves.

### Layer D — Identity
Profile, avatar, random username, Ball IQ, sport-specific ratings, trophies, badges, career history, dynasty history, personal records, friends, and rivalry history.

### Layer E — Live Sports Context
A live sports ticker, upcoming games, live scores, final scores, results, news/context, team pages, and sport hubs.

---

# 2. PRODUCT NORTH STAR

The site should evolve from:

"100+ sports games"

into:

"Your sports life on the internet."

A user should eventually be able to:
- play today's games;
- see live sports scores;
- build a profile;
- earn XP;
- maintain a streak;
- challenge friends;
- start a career;
- manage a club;
- draft a team;
- collect cards;
- conquer a map;
- enter tournaments;
- save long-running worlds;
- compare their history to other users;
- return tomorrow and immediately see what changed.

The platform's long-term advantage is not any single game. It is the shared ecosystem.

---

# 3. CURRENT-PRODUCT BASELINE AND OWNER REQUIREMENTS

The current public product has a large set of sports games plus long-form management/career simulations. The owner's latest update specifically requests major changes to the ticker, profiles, moderation, Club Manager, Soccer Career, other sports simulations, interactive games, conquest, drafts, data quality, SEO/indexing, and game consistency.

The owner's source notes should be treated as the originating requirements for this specification.

High-priority existing-game pain points identified by the owner include:
- sports ticker not showing current/future games correctly;
- inaccurate or incomplete profile data;
- leaderboard usernames needing safe random names and moderation;
- homepage headline being too long;
- polls needing more engagement;
- Club Manager lacking sufficient leagues/teams/eras;
- manager creation needing more depth and animated identity;
- custom league/team transfer functionality;
- god mode;
- staff and coaching hires;
- board/fan/player sentiment;
- realistic transfer/contract negotiation;
- financial operations;
- facilities upgrades;
- XP/skill trees;
- richer media/news;
- player relationships and dressing-room interactions;
- academy scouting;
- country flags rather than abbreviations where appropriate;
- squad UI improvements;
- flexible tactics and position training;
- better match simulation/animation;
- better competitions/tables/brackets;
- era-correct competition structures;
- better subs and player management;
- better front-office systems across all sports;
- college atmosphere and NIL/recruiting;
- realistic draft presentations;
- deeper player-career life simulation;
- more animation;
- removal/rework of simplistic games;
- stronger Rebuild game;
- larger Stadium Tycoon / Wonderkid Factory concept;
- better position validation;
- more puzzles;
- fixing Rarity answer leakage;
- fixing auction logic in Sign the Player;
- better Fantasy Draft;
- better Player Stock Market;
- stronger Conquest;
- Soccer Conquest for top-five leagues;
- universal sport Draft/Pack systems;
- more interactive keyboard/mouse/touch games;
- full indexability for valuable pages;
- better AdSense readiness;
- no duplicate footer;
- more new game concepts.

---

# 4. DEVELOPMENT STRATEGY

## 4.1 Do not build 100 disconnected games

Build reusable engines.

Core engines:
1. Account/Profile Engine
2. Identity/Username/Avatar Engine
3. Achievement/XP Engine
4. Leaderboard Engine
5. Daily Game Engine
6. Puzzle Engine
7. Sports Data Engine
8. Historical Data Engine
9. Competition Engine
10. Match Simulation Engine
11. Live Event/Ticker Engine
12. Transfer/Contract Negotiation Engine
13. Staff/Relationship Engine
14. Finance Engine
15. Career Engine
16. Manager Engine
17. Draft Engine
18. Card/Pack Engine
19. Conquest Engine
20. Interactive Arcade Engine
21. News/Event Engine
22. Moderation/Report Engine
23. Cloud Save Engine
24. Analytics/Telemetry Engine
25. SEO/Content Metadata Engine
26. Ad Placement Guardrails

When possible, new sports and games should configure these engines instead of duplicating logic.

---

# 5. REPOSITORY-FIRST EXECUTION RULE

Before modifying code:

### Inspect
- package manager
- framework
- folder structure
- routing
- API routes
- database schema
- auth
- Supabase usage
- data fetching
- game components
- common layout
- header/footer
- ticker
- analytics
- ad components
- SEO components
- styles
- tests
- build scripts
- deployment
- environment variables
- data import scripts

### Identify
- duplicated logic;
- dead routes;
- unused components;
- inconsistent components;
- game-specific data copies;
- browser-only save systems;
- hard-coded competition rules;
- hard-coded rosters;
- missing indexes;
- slow-loading pages.

### Then
Create an implementation map before performing destructive refactors.

Do not delete existing games simply because they are scheduled for future removal. Mark them as "rework," "deprecated," or "removed" in a central registry first.

---

# 6. SHARED DATA MODEL

Create a normalized sports data layer.

## 6.1 Player

Required fields should include:
- player_id
- canonical_name
- display_name
- date_of_birth
- nationality
- nationality_region
- secondary_nationalities where valid
- preferred_foot where applicable
- primary_position
- secondary_positions
- sport
- current_team_id
- historical_team_ids
- active_status
- career_start
- career_end
- seasons
- ratings
- potential
- market_value
- salary/wage data where applicable
- historical market values where available
- image/avatar references
- game eligibility
- aliases
- data-source provenance
- last_verified_at

## 6.2 Team

Fields:
- team_id
- canonical_name
- display_name
- sport
- league_id
- country
- region
- city
- stadium
- colors
- crest reference
- founded
- historical names
- historical leagues
- historical rosters
- prestige/reputation
- finances
- ownership
- facility levels
- data-source provenance

## 6.3 League

Fields:
- league_id
- sport
- country
- region
- current_name
- historical_names
- teams_by_season
- competition_rules_by_season
- promotion/relegation rules
- schedule rules
- playoff rules
- tie-breakers

## 6.4 Season

Fields:
- season_id
- start_date
- end_date
- era
- applicable rule sets
- competitions
- team membership
- roster snapshot
- manager snapshot

## 6.5 Competition

Fields:
- competition_id
- competition_type
- sport
- season_id
- participants
- format
- qualification
- seeding
- draw rules
- schedule
- standings
- tiebreakers
- knockout bracket
- cross-competition transfers/qualification
- historical-rule-version

---

# 7. DATA QUALITY SYSTEM

Sports data errors are a product-critical defect.

Create:
### Source
Where the fact came from.

### Verification
Whether it has been cross-checked.

### Confidence
High / Medium / Low.

### Last verified
Timestamp.

### Conflict state
If two sources disagree.

### Player-facing eligibility
Only verified data may be used for high-confidence games unless the game explicitly tolerates approximations.

Create automated checks for:
- age 0;
- future age;
- missing team;
- impossible position;
- duplicate player IDs;
- duplicate names;
- team/league mismatch;
- active player appearing in retired-only pool;
- historical player appearing in the wrong era;
- goalkeeper/midfielder impossible assignment;
- market values below zero;
- salary below zero;
- impossible game statistics;
- duplicate competition entries;
- missing country;
- missing flag.

Run these before every data deployment.

---

# 8. COUNTRY AND REGION DISPLAY

Where appropriate, show the actual flag rather than only a three-letter country abbreviation.

For football:
- show country flag;
- group academy scouting by region/continent;
- allow filtering by country;
- allow filtering by region.

Do not treat a flag as the only country identification on accessibility grounds. Provide accessible country names in text/ARIA.

---

# 9. LIVE SPORTS TICKER

## 9.1 Goal

The ticker should feel like a compact ESPN/FutMob-style live sports strip.

States:
- Upcoming
- Starting soon
- Live
- Halftime/intermission
- Delayed/postponed
- Final
- Cancelled

Examples:

Upcoming:
"FC Barcelona vs Real Madrid — 3:00 PM"

Live:
"LIVE 62' — Barcelona 1–0 Real Madrid"

Halftime:
"HT — Barcelona 1–0 Real Madrid"

Final:
"FINAL — Barcelona 2–1 Real Madrid"

## 9.2 Ticker requirements

Support:
- sport icons;
- league labels;
- team names;
- team logos if legally/technically appropriate;
- score;
- current period;
- clock;
- game status;
- upcoming start time;
- final score;
- clickable game center;
- user's followed teams;
- filtering;
- automatic refresh;
- graceful stale-data behavior.

Do not rely on manually written fixtures.

## 9.3 Data architecture

Event:
- event_id
- sport
- league
- season
- home_team
- away_team
- start_time
- status
- period
- clock
- home_score
- away_score
- venue
- data_provider
- last_updated

## 9.4 Ticker priority

Personalize:
1. user's favorite teams;
2. live events;
3. starting soon;
4. major events;
5. selected sport;
6. general upcoming events.

---

# 10. GLOBAL SITE LAYOUT

Every page should use a shared shell.

Structure:
1. Top ticker
2. Header/navigation
3. Breadcrumb where useful
4. Page content
5. Game/help/report components
6. Related games
7. Safe ad position
8. Global footer

Game pages must not independently render another global footer.

This prevents duplicate-footer bugs.

Shared shell components:
- AppShell
- Header
- SportsTicker
- Breadcrumbs
- MainContent
- GlobalFooter
- AdSlot
- ReportIssueButton
- HelpButton
- ProfileMenu

---

# 11. HOME PAGE

The home page should not show 100+ games as if they are equally important.

Primary sections:

## PLAY TODAY
Today's recommended games.

## CONTINUE PLAYING
Unfinished long-form games and saves.

## LIVE NOW
Live sports ticker/events.

## WITH FRIENDS
Challenges and multiplayer.

## CAREERS & DYNASTIES
Long-form games.

## POPULAR
Flagship games.

## NEW
Recently shipped games.

## BY SPORT
Sport hubs.

## YOUR PROFILE SUMMARY
Streak, Ball IQ, rank, achievements.

The headline should be concise.

Recommended direction:
"100+ free games across every sport."

Do not put a long legal statement in the main marketing headline. Put legal/disclaimer language in the appropriate legal/footer location.

---

# 12. USER IDENTITY SYSTEM

## 12.1 Default username

New accounts receive a random safe username, Kahoot-inspired.

Examples:
- ClutchStriker27
- SilentGoalie44
- BallWizard18
- FastBreak92

Username generation:
- deterministic collision checking;
- safe word dictionary;
- no offensive combinations;
- no protected public-figure impersonation;
- no sexual/violent terminology;
- no slurs.

## 12.2 Custom username

Allow later customization after:
- profanity/slur filtering;
- impersonation checks;
- reserved-name checking;
- duplicate handling.

If an unacceptable name is later reported:
- temporarily hide it;
- generate a replacement;
- notify the user.

---

# 13. PROFILE SYSTEM

Profile should show:

### Header
- avatar
- username
- level
- Ball IQ
- favorite sports
- title/badge

### Today
- current streak
- played today
- world rank
- daily score

### Lifetime
- games played
- games won
- total XP
- best score
- best finish
- most-played game
- favorite sport

### Recent
- recently played games
- result
- score
- time/date

### Achievements
- badges
- trophy cabinet

### Career
- active player careers
- retired careers
- career records

### Management
- current saves
- championships
- manager level
- front-office history

### Conquest
- territories won
- best campaign

### Social
- friends
- rivals
- challenges

All displayed values must be derived from source-of-truth records. Never calculate "streak" separately on each page.

---

# 14. BALL IQ

Use Ball IQ as the global sports-knowledge identity.

Do not let raw points from long simulations overwhelm quick trivia.

Maintain:
- game-specific score;
- XP;
- normalized skill rating;
- global Ball IQ.

Potential categories:
- Soccer IQ
- NBA IQ
- NFL IQ
- MLB IQ
- NHL IQ
- WNBA IQ
- College IQ
- General Sports IQ

Ball IQ should be based on validated performance across appropriate games.

---

# 15. STREAK SYSTEM

Requirements:
- one canonical streak source;
- exact timezone definition;
- daily cutoff;
- late-arriving score handling;
- missed-day logic;
- timezone edge cases;
- no duplicate scoring from refresh;
- account migration safety.

Display:
- current streak;
- longest streak;
- streak history.

Test:
- play before midnight;
- play after midnight;
- daylight saving transitions;
- multiple tabs;
- offline then reconnect;
- duplicate submissions.

---

# 16. ACHIEVEMENT SYSTEM

Build a generic achievement framework.

Achievement examples:
- First Game
- First Win
- 7-Day Streak
- 30-Day Streak
- 100-Day Streak
- 1,000 Games
- Rare Answer
- #1 in a Game
- #1 in a Sport
- World Top 100
- First Championship
- Three Championships
- Career Hall of Fame
- Dynasty Champion
- Complete All Soccer Dailies
- Play 10 Sports
- Beat the Boss
- Perfect Game

Achievements should have:
- ID
- title
- description
- icon
- trigger condition
- XP
- rarity
- hidden/visible state
- unlock date.

---

# 17. GLOBAL GAME CONTRACT

Every game must implement:

- unique game ID;
- name;
- sport(s);
- category;
- difficulty;
- daily support;
- unlimited support if applicable;
- how-to-play;
- scoring rules;
- results;
- leaderboard contribution;
- report issue;
- analytics events;
- mobile responsiveness;
- keyboard support where relevant;
- loading state;
- error state;
- restart;
- share result;
- related games;
- SEO metadata.

Every game must expose:
- startGame();
- submitAction();
- finishGame();
- calculateScore();
- validateResult();
- recordResult();
- getShareText();
- getGameStats().

Do not invent separate incompatible patterns for every game.

---

# 18. GAME HELP / QUESTION MARK SYSTEM

Every game gets a consistent:
- "How to Play" button;
- question-mark icon;
- Objective;
- Controls;
- Scoring;
- Daily/Unlimited explanation;
- examples;
- special rules;
- accessibility instructions.

Never make users infer how Rarity, Auction, Bingo, Draft, etc. work.

---

# 19. REPORT ISSUE SYSTEM

Every game must have a working Report Issue button.

Options:
- Incorrect answer
- Incorrect player
- Incorrect team
- Incorrect stat
- Incorrect position
- Incorrect league
- Incorrect historical data
- Bug
- Visual/UI issue
- Gameplay issue
- Typo
- Too easy
- Too difficult
- Suggest a feature
- Other

Optional text box.

Automatically attach:
- user/session ID where permitted;
- game ID;
- puzzle ID;
- game version;
- route;
- timestamp;
- device/browser;
- relevant answer state;
- relevant data IDs.

Admin system:
- inbox;
- filter by game;
- status;
- priority;
- assign;
- comments;
- mark verified;
- fix reference;
- analytics dashboard.

The feature must actually deliver usable reports to the operator/admin backend. A button that only says "thanks" without storing the issue is unacceptable.

---

# 20. ANALYTICS

Track:
- game start
- first action
- hint use
- failed attempt
- completion
- score
- abandon
- share
- account creation
- login
- return visit
- save
- load
- report issue
- ad view where legally/technically appropriate
- multiplayer invite
- challenge accepted
- achievement
- level-up

Every event should include:
- timestamp
- anonymous/session ID
- user ID if authenticated
- game ID
- sport
- game version.

Use sampling or aggregation where needed for cost/privacy.

---

# 21. SEO / INDEXING

Important principle:
Do not create large numbers of pages solely to manipulate search rankings.

Each indexable page should contain real value:
- working game;
- explanation;
- rules;
- unique metadata;
- meaningful internal links;
- appropriate canonical;
- accurate structured data where applicable.

Recommended page clusters:
- /nba-games
- /nfl-games
- /soccer-games
- /mlb-games
- /nhl-games
- /wnba-games
- /cfb-games
- /cbb-games
- /soccer-trivia
- /nba-trivia
- /sports-grid-games
- /soccer-manager-game
- /nba-gm-simulator
- /nfl-gm-simulator
- /soccer-career-game

Avoid thin autogenerated pages.

---

# 22. INDEXING AUDIT

For each valuable URL verify:
- HTTP 200
- indexable
- no accidental noindex
- correct canonical
- in sitemap if appropriate
- discoverable through internal links
- unique title
- unique meta description
- one logical H1
- content renders server/client correctly
- game actually works
- mobile works
- no orphan status
- no duplicate URL variants

Do not treat "not indexed" as automatically a bug. Determine why.

---

# 23. ADSENSE / AD SAFETY

Do not design gameplay around accidental ad clicks.

Ads must be:
- clearly distinguishable from controls;
- sufficiently separated from play areas;
- not inserted directly beside high-frequency controls;
- not overlays that obscure gameplay;
- not used to trick users into clicking;
- not the dominant content.

Preferred locations:
- between content sections;
- below result;
- below instructions;
- around related games;
- at natural transitions.

Do not use:
- ad disguised as "Play";
- ad disguised as "Next";
- ad in the middle of repeated action controls;
- forced ad clicks;
- deceptive interstitial loops.

---

# 24. CASINO DECISION

Do not build a real-money casino or wagering system into the core DoUKnowBall product.

Reason:
- family-friendly positioning;
- minors may use the site;
- advertising policy complexity;
- legal/regulatory complexity;
- reputational risk.

Safe alternative:
- cosmetic packs;
- virtual packs;
- mystery lockers;
- non-cash reward wheels;
- achievement chests;
- draft reveals.

No deposits.
No withdrawals.
No cash wagering.
No "gambling with points" that imitate real-money gambling too closely.

---

# 25. CLUB MANAGER 2.0 — FLAGSHIP SIMULATION

Club Manager should become the reference implementation for the management engine.

The existing product already has a large club/league universe and historical seasons; the next version should focus on depth, correctness, realism, and presentation rather than merely adding another menu.

Core pillars:
1. Club
2. Manager
3. Staff
4. Squad
5. Transfers
6. Contracts
7. Tactics
8. Matches
9. Board
10. Fans
11. Finances
12. Facilities
13. Academy
14. Scouting
15. Media
16. League/competitions
17. International management
18. Career progression
19. Historical rules
20. World simulation

---

# 26. CLUB MANAGER — SAVE SETUP

Pre-save settings:
- current or historical season;
- club;
- manager;
- manager nationality;
- preferred foot;
- manager style;
- currency;
- transfer realism;
- negotiation difficulty;
- board strictness;
- fan expectations;
- injury severity;
- financial difficulty;
- academy difficulty;
- youth generation;
- international job offers on/off;
- god mode;
- custom rosters;
- transfer-free mode;
- real or fictional manager.

Manager options:
### Real manager
Attributes derived from the selected historical/known manager profile.

### Create manager
Fully customized:
- face
- skin
- hair
- facial hair
- clothing
- nationality
- age
- tactical style
- personality
- skill distribution.

---

# 27. CLUB MANAGER — MANAGER ATTRIBUTES

Suggested:
- Tactical IQ
- Attacking coaching
- Defensive coaching
- Player development
- Youth development
- Scouting
- Negotiation
- Man management
- Motivation
- Media
- Adaptability
- Discipline
- Recruitment
- Financial management
- Medical awareness
- Reputation

Use 0–100 or a similarly clear normalized scale.

---

# 28. MANAGER XP / SKILL TREE

Manager earns XP through:
- wins;
- trophies;
- board objectives;
- player development;
- youth promotion;
- financial performance;
- successful transfers;
- derbies;
- European success;
- rebuilding clubs;
- overperformance.

Skill trees:
### Tactics
### Recruitment
### Negotiation
### Youth
### Man Management
### Finance
### Media

Every skill point must have visible gameplay effects.

---

# 29. CLUB MANAGER — STAFF

Staff roles:
- Assistant Manager
- Attack Coach
- Defense Coach
- Goalkeeping Coach
- Fitness Coach
- Set Piece Coach
- Lead Scout
- Youth Scout
- Academy Director
- Data Analyst
- Medical Director
- Physiotherapist
- Sports Scientist

Each staff member:
- attributes
- salary
- age
- potential
- personality
- loyalty
- contract length
- reputation
- relationship with manager

Staff can:
- receive offers;
- leave;
- be extended;
- be counter-offered;
- be promoted;
- be fired.

---

# 30. CLUB MANAGER — BOARD

Board objectives should be multi-dimensional.

Categories:
- league finish;
- cup progress;
- continental progress;
- squad age;
- nationality;
- youth minutes;
- transfer profit;
- top-talent acquisition;
- potential threshold;
- financial balance;
- wage control;
- sponsorship;
- brand growth.

Objectives can be:
- Good
- Neutral
- Difficult
- Severe

Example:
"Sign at least three players aged 25 or younger."
"Add two players with 90+ potential."
"Recruit more talent from Spain."
"Reduce total wage expenditure by 8%."
"Reach Champions League quarterfinal."
"Sell one player for at least €50M."

---

# 31. FAN / BOARD / PLAYER SENTIMENT

Maintain separate meters:
- Board confidence
- Fan approval
- Player morale
- Staff morale
- Ownership confidence

The same action can help one and hurt another.

Example:
Sell a beloved veteran:
- Board +20
- Fans -30
- Players -10

The user should see why.

---

# 32. FINANCE SYSTEM

Daily/weekly/monthly projections:
Revenue:
- tickets;
- season tickets;
- concessions;
- merchandise;
- sponsors;
- media rights;
- prize money;
- transfer sales;
- competition earnings.

Expenses:
- player wages;
- staff wages;
- travel;
- stadium;
- training;
- academy;
- medical;
- scouting;
- bonuses;
- transfer installments;
- facility maintenance.

Allow user to see:
- current cash;
- projected cash;
- monthly burn;
- annual forecast;
- wage bill;
- transfer profit/loss;
- sponsor value.

---

# 33. TICKETING / CONCESSIONS / SPONSORS

User controls:
- ticket prices;
- premium/VIP pricing;
- season ticket pricing;
- concession prices;
- merchandise pricing;
- sponsor selection.

Sponsors can vary by:
- payout;
- duration;
- brand prestige;
- local/national/global;
- fan perception;
- board fit.

Do not create real-world defamatory claims about brands. Use fictional sponsor brands where a moral/reputational simulation is needed.

---

# 34. FACILITIES

Level 0–10:
- Stadium
- Training Ground
- Academy
- Medical Center
- Recovery Center
- Dressing Room
- Recruitment Department
- Analytics
- Scouting
- Youth Facilities

Each level:
- costs money;
- has maintenance;
- affects performance;
- may have diminishing returns;
- should take time where appropriate.

Large clubs should start with advanced infrastructure; smaller clubs can start low.

---

# 35. TRANSFER ENGINE

Transfer negotiation must involve:
1. club valuation;
2. user offer;
3. counteroffer;
4. negotiation history;
5. relationship;
6. financial advisor estimate;
7. player willingness;
8. contract;
9. add-ons.

Club-side options:
- fee
- installments
- sell-on %
- player swap
- add-ons
- buy-back
- sell-back
- loan
- option to buy
- obligation to buy
- release clause.

Player-side options:
- salary
- signing bonus
- length
- role
- appearance bonus
- goal bonus
- trophy bonus
- loyalty
- release clause
- agent fee.

Extreme lowball offers may:
- be rejected;
- damage relationship;
- end negotiations;
- cause club to refuse future negotiations.

---

# 36. FINANCIAL ADVISOR

A club financial advisor estimates:
- market-value range;
- reasonable purchase range;
- max acceptable fee;
- financial risk.

Example:
Market value: €60M
Advisor estimate: €120M–€160M
User can still choose €80M.

Do not automatically force the user to accept the advisor's value.

Scouting quality affects estimate accuracy.

---

# 37. SCOUTING

Scouts have:
- accuracy;
- youth specialization;
- regional specialization;
- positional specialization;
- potential recognition;
- current ability recognition;
- personality recognition.

A Level 0 scout may be wrong.

A Level 10 scout should be highly accurate, but not omniscient.

---

# 38. ACADEMY

Academy scouting filters:
- country;
- region;
- position;
- age;
- physical archetype;
- technical archetype;
- potential;
- play style.

Show:
- current ability estimate;
- potential range;
- personality;
- development trend;
- scout confidence.

---

# 39. SQUAD PAGE

Every player row/card should show:
- age;
- position;
- rating;
- potential;
- role;
- wages;
- contract;
- morale;
- fitness;
- form;
- availability;
- nationality flag.

Hover/click details:
- performance;
- morale;
- wage satisfaction;
- game-time satisfaction;
- role satisfaction;
- transfer interest.

Spacing should be readable, not cramped.

---

# 40. TACTICS

Allow:
- formation;
- player positioning;
- role;
- duty;
- width;
- mentality;
- pressing;
- tempo;
- passing;
- defensive line;
- marking;
- freedom;
- attacking runs;
- build-up.

Allow extreme custom positions, including unusual shapes.

But the engine should apply realistic consequences.

Example:
10 players forward = dangerous in attack, vulnerable in transition.

---

# 41. SUBSTITUTIONS

Bottom panel:
- starting XI;
- bench;
- reserves.

Interaction:
- select player A;
- select player B;
- swap;
- validate eligibility.

Substitution suggestions should prioritize:
- same position;
- compatible role;
- fitness;
- tactical need;
- morale;
- card status.

---

# 42. POSITION CHANGE / TRAINING

Allow player to train toward:
- primary;
- secondary;
- new position.

Training takes time.

Do not instantly convert a player.

Use:
- aptitude;
- age;
- position similarity;
- training quality;
- coaching quality.

---

# 43. MATCH CENTER

Merge "Play Match" and "Watch Live" into one Match Center.

Options:
### Quick Sim
Immediate result with full stats.

### Watch
Live event/animation playback.

### Manage
User can pause and make tactical changes.

The simulation should be deterministic enough to produce coherent stats while the presentation renders major events.

Stats:
- possession;
- shots;
- shots on target;
- xG if available;
- corners;
- fouls;
- yellow;
- red;
- offsides;
- passes;
- substitutions;
- saves;
- tackles;
- interceptions.

---

# 44. LIVE MATCH PRESENTATION

The animation must improve dramatically.

Required minimum:
- player dots have names/number labels when appropriate;
- players move into different zones;
- ball remains visually connected to player interactions;
- passes;
- dribbles;
- tackles;
- shots;
- goalkeeper saves;
- corners;
- throw-ins;
- fouls;
- cards;
- substitutions;
- injuries;
- penalties;
- goal celebrations.

Do not attempt to render every second with AAA physics. Simulate the whole game and animate meaningful events convincingly.

---

# 45. EVENT TIMELINE

Timeline examples:
09' Shot — Lewandowski
17' Corner
31' Yellow — Player
45+2' GOAL — Barcelona
45+4' HT
63' Substitution
78' Penalty
79' SAVE
90+5' FINAL

Added time must be displayed naturally:
- 45+2
- 90+5

Do not put "additional stoppage time" in an unrelated location.

---

# 46. COMPETITIONS ENGINE

Do not hard-code competition formats globally.

Store a historical rules version per season.

A competition engine must support:
- group stage;
- league phase;
- round robin;
- home/away;
- single-leg;
- two-leg;
- knockout;
- playoff;
- promotion;
- relegation;
- aggregate score;
- away-goal rules where historically relevant;
- seeding;
- coefficient/pot rules;
- qualification paths;
- cross-competition movement.

Example verified modern UEFA design:
The 2026/27 Champions League has 36 teams in a single league phase, eight opponents per club, four home and four away, with four pots of nine. citeturn913377search2turn913377search6
The post-2024 UEFA league-phase format replaced the old 32-team/8-group configuration with a 36-team league phase. citeturn913377search5

Historical modes must use the relevant historical rules rather than current rules.

---

# 47. TABLES AND BRACKETS

For every competition:
- current table;
- matches played;
- wins;
- draws;
- losses;
- points;
- GF;
- GA;
- GD;
- form;
- qualification status.

Format example:
GF-GA as "25-23".

Cups:
- actual bracket;
- actual groups/league phase;
- status;
- upcoming fixtures;
- current path;
- eliminated teams.

Never show a Champions League table under a Copa del Rey page.

Never display projected quarterfinal opponents as though they are confirmed.

---

# 48. SOCCER CAREER 2.0

Target feeling:
BitLife + football career + interactive sports gameplay.

Start:
- youth academy;
- young age;
- modest ability;
- potential range.

The player must work to develop.

But rare high-potential starts can exist.

---

# 49. PLAYER DEVELOPMENT

Activities:
- training;
- drills;
- rest;
- recovery;
- nutrition;
- coaching;
- individual training;
- position training;
- tactical study;
- physical development;
- mental development.

Stats should develop based on:
- age;
- potential;
- training quality;
- minutes;
- injuries;
- consistency;
- choices;
- lifestyle.

---

# 50. INTERACTIVE TRAINING DRILLS

Goalkeeper:
- diving;
- catching;
- reaction;
- penalty save;
- positioning.

Defender:
- timed tackle;
- interception;
- aerial duel;
- tracking runner.

Midfielder:
- passing targets;
- vision;
- first touch;
- decision-making.

Winger:
- dribble;
- crossing;
- 1v1.

Striker:
- finishing;
- shot timing;
- volleys;
- headers.

Free kick:
- aim;
- curve;
- power.

Interactive control should be:
- click;
- drag;
- hold;
- swipe;
- keyboard.

---

# 51. PLAYER LIFE

Add:
- family;
- friends;
- relationships;
- home;
- transportation;
- travel;
- hobbies;
- education;
- social media;
- fame;
- money;
- endorsements;
- lifestyle.

Keep outcomes focused on realistic career consequences.

Do not glamorize illicit drug use. Risky choices can exist as consequences/events, but the game should be responsible and non-instructional.

---

# 52. SPONSORSHIPS / BRAND

Potential opportunities:
- boot deal;
- apparel;
- personal brand;
- social sponsorship;
- local endorsements.

Higher fame:
- more opportunities;
- more scrutiny.

Create fictional sponsor brands unless actual licensing rights are available.

---

# 53. MEDIA / HEADLINES

Generate:
- match reaction;
- transfer rumors;
- manager quotes;
- fan reaction;
- rival quotes;
- injury reports;
- award discussion;
- form debates;
- contract rumors.

AI may help phrase stories, but the underlying fact must come from the simulation/data engine.

Database truth:
"Player scored 2 goals."

AI presentation:
"Two-goal performance sends Barcelona into the semifinal."

Never allow the language model to invent match facts.

---

# 54. PLAYER RELATIONSHIPS

Relationships:
- manager;
- teammates;
- coaches;
- fans;
- media;
- board.

Player requests:
- transfer;
- higher salary;
- more minutes;
- starting role;
- captaincy;
- new position.

Responses affect:
- morale;
- trust;
- loyalty;
- performance;
- dressing room;
- transfer behavior.

---

# 55. RIVALRY SYSTEM

A player can have:
- club rival;
- personal rival;
- media rival.

Rivalry can influence:
- headlines;
- match intensity;
- motivation;
- fan response;
- awards;
- social events.

---

# 56. INTERNATIONAL CAREER

Soccer Career:
- youth international;
- senior call-up;
- international tournaments;
- selection pressure;
- captaincy;
- national-team goals/caps.

Club Manager:
- manager may receive international job offers if enabled.

---

# 57. COLLEGE FOOTBALL DYNASTY 2.0

Treat college as its own ecosystem.

Systems:
- recruiting;
- NIL;
- transfer portal;
- academics;
- eligibility;
- scholarships;
- conference structure;
- scheduling;
- strength of schedule;
- rivalry atmosphere;
- fan traditions;
- donors;
- media;
- TV;
- coaching;
- player development.

Atmosphere:
- blackout;
- whiteout;
- rivalry week;
- student section;
- home-field effect.

Use fictional generated players when appropriate rather than pretending generated players are real people.

---

# 58. DRAFT NIGHT PRESENTATION

For:
- NFL
- NBA
- MLB
- NHL
- WNBA
- college transitions.

Sequence:
1. Pick announced
2. commissioner/broadcast intro
3. team logo
4. prospect card
5. player image/avatar
6. position
7. scouting summary
8. analysts react
9. fans react
10. next pick

Pause/animation moments should make draft night feel like an event.

---

# 59. FRONT OFFICE ENGINE — UNIVERSAL

Shared systems:
- roster;
- salary;
- trade;
- draft;
- free agency;
- scouting;
- coaches;
- owner;
- media;
- staff;
- player relations;
- fan relations;
- finances.

Sport-specific rules are configured separately.

---

# 60. NBA FRONT OFFICE

Support:
- salary cap;
- luxury tax;
- contracts;
- trades;
- free agency;
- draft;
- scouting;
- player development;
- rotation;
- playoffs;
- play-in where applicable;
- season stats;
- awards;
- retirements.

---

# 61. NFL FRONT OFFICE

Support:
- cap;
- draft;
- free agency;
- waivers;
- franchise tag;
- depth chart;
- contracts;
- scouting;
- coaches;
- trades;
- playoff;
- Super Bowl;
- player development.

---

# 62. MLB FRONT OFFICE

Support:
- 162-game season;
- roster construction;
- minor leagues;
- pitching staff;
- bullpen;
- payroll;
- arbitration;
- free agency;
- trade deadline;
- draft;
- injuries;
- postseason.

---

# 63. NHL FRONT OFFICE

Support:
- hard cap;
- lines;
- defensive pairs;
- goalie;
- contracts;
- draft;
- trades;
- free agency;
- playoffs;
- overtime;
- player development.

---

# 64. WNBA EXPANSION

Make WNBA a first-class sport.

Initial game families:
- WNBA Grid
- WNBA Connections
- WNBA Higher or Lower
- WNBA Career Path
- WNBA Starting Five
- WNBA Rarity
- WNBA Conquest
- WNBA Front Office
- WNBA My Career
- WNBA Draft
- WNBA Fantasy Draft

Do not hard-code today's league size into infrastructure. Official WNBA information says the league expands from a 44-game season in 2026 to 50 in 2027, so schedules and rules must be data-driven. citeturn913377search0turn913377search10

---

# 65. CONQUEST ENGINE 2.0

Build one reusable Conquest engine.

Modes:
- league-specific;
- country/region map;
- European top clubs;
- historical;
- fantasy;
- multiplayer;
- custom.

Soccer:
- Premier League
- La Liga
- Serie A
- Bundesliga
- Ligue 1
- European Top 100
- eventually world clubs.

Visual requirements:
- clean map;
- visible territories;
- team colors;
- team icons;
- match result;
- territory history;
- turn/date;
- current ruler;
- zoom;
- mobile support.

---

# 66. CONQUEST GAMEPLAY

Basic loop:
1. Determine matchup.
2. Simulate/present battle.
3. Winner takes territory.
4. Update map.
5. Record history.
6. Continue.
7. Final survivor/champion wins.

Optional:
- rating strength;
- fatigue;
- injuries;
- home advantage;
- custom rules;
- draft-based teams.

---

# 67. NBA / NFL / MLB / NHL CONQUEST

Use same map engine, but sport-specific territory rules.

Examples:
- NFL teams on U.S. map;
- NBA on U.S./North America map;
- MLB on U.S./North America map;
- NHL on North America map;
- college map;
- soccer on country/Europe/world map.

---

# 68. NBA STAT LINE — NEW FLAGSHIP GAME

Two modes.

## Mode A — Identify player/game
Target:
- points;
- rebounds;
- assists;
- steals;
- blocks;
- FG%;
- 3P%;
- FT%.

User selects a player and exact season/game where possible.

## Mode B — Aggregate target
Target stat profile is presented.

User selects five player-seasons.

Calculate combined/derived similarity.

Score:
- exact;
- weighted distance;
- percentage similarity.

Do not use impossible aggregate arithmetic. Clearly define whether values are sums, averages, weighted averages, or normalized totals.

Difficulty:
- current season;
- recent history;
- all time.

---

# 69. UNIVERSAL DRAFT ENGINE

Modes:
- fantasy draft;
- position draft;
- auction;
- snake;
- salary cap;
- historical;
- current roster;
- custom.

Sport-specific roster slots.

The interface must clearly show:
- current roster;
- available pool;
- pick;
- remaining spots;
- budget;
- team rating;
- bench.

Avoid excessive scrolling.

---

# 70. SIGN THE PLAYER — AUCTION REWORK

Correct structure:

1. Random position selected.
2. A strong player in that position is revealed first.
3. Market value/listed value displayed.
4. All players in the lot are not revealed at once.
5. Bidding begins only for the current revealed player.
6. If exactly one user wants them, they can win at listed price.
7. If multiple users want them, bidding battle occurs.
8. If nobody wants them, price declines until accepted or expired.
9. After the position is resolved, move to next position.
10. Continue until roster is filled.
11. Simulate final teams.

The game should reward strategic patience.

---

# 71. SPORTS BINGO

Generate a grid with constraints:
- rating threshold;
- age;
- nationality;
- league;
- award;
- position;
- team;
- historical achievement.

Open packs/players.
A player can satisfy a square.

Modes:
- solo;
- local pass-the-device;
- online;
- CPU;
- friend room;
- custom restrictions.

Packs are virtual only.
No cash.

---

# 72. SEARCH & DISCARD

Create starting XI.
Players are revealed/searchable one at a time.
Choose keep/discard.
Complete squad.
Then simulate against:
- CPU;
- friend;
- online opponent.

Compare:
- team strength;
- chemistry/fit;
- tactics;
- match result;
- stats.

---

# 73. PLAYER STOCK MARKET

Use historical stats over a wide time period.

Requirements:
- start from a historical year;
- progress through current era;
- position-by-position;
- no unnecessary biographical clues unless the mode explicitly calls for them;
- player performance changes value;
- lineup fills one position at a time.

Do not reveal the answer before the choice.

Use the referenced owner video concept only as inspiration for gameplay structure; do not copy protected content.

---

# 74. RARITY

Before guessing, clearly explain:
"Pick the answer you think the fewest players will choose."

Do not reveal the single rarest answer after submission.

Instead show:
- top 3;
or
- top 5.

Prevent exploit:
- no reset-based answer fishing;
- daily session token;
- server-side result recording;
- repeated attempts do not generate extra information.

---

# 75. WORLD XI

Position logic must be strict.

Example:
A right winger is not automatically considered equivalent to:
- LWB;
- RB;
- RWB;
- LM.

Use a position compatibility matrix.

Allow secondary positions only where supported by verified historical usage.

Example:
CF who has actually played RW may qualify for RW in a permissive mode.

---

# 76. BUILD YOUR XI

Validate:
- current/historical position;
- verified position history;
- era;
- team eligibility.

Simulation:
- better team-building logic;
- meaningful tactical fit;
- more detailed result;
- player ratings;
- role compatibility;
- chemistry/fit if applicable.

Never allow:
- goalkeeper as CM solely because a search result was broad.

---

# 77. BANKER OFFER / PLAYER DEAL GAMES

The banker should evaluate the user's actual roster.

Input:
- roster rating distribution;
- positions;
- budget;
- rarity;
- needs.

Offer should be relative to the current roster.

If user has 90-rated players everywhere, a 78-rated offer should generally be poor unless the game objective intentionally makes it attractive.

---

# 78. REBUILD GAME 2.0

Remove fake/awkward terminology.

Use understandable football-management language.

Managers:
- use real managers where appropriate and lawful;
- otherwise fictional managers with attributes.

Different clubs should have different manager pools.

Board envelopes/cards:
- Good
- Okay
- Bad
- Terrible
- Catastrophic

Make demands club-specific.

Barcelona examples:
- youth production;
- financial objectives;
- star talent;
- brand;
- revenue.

---

# 79. REBUILD LOOP

Start with:
- starting XI only;
- board envelope;
- finance envelope.

Then:
1. position roulette;
2. choose player action;
3. keep or sell;
4. if sell, choose from several replacement options;
5. bench alternative;
6. continue;
7. new board/finance events;
8. complete final team;
9. simulate league/season;
10. calculate board performance;
11. apply consequences.

If ending money is negative:
- trigger emergency sale;
- generate position;
- sell player to resolve deficit.

Punishment cards:
- only one safe card;
- other cards have different negative costs/consequences.

---

# 80. STADIUM TYCOON / SPORTS EMPIRE

Merge the strongest parts of Stadium Tycoon and Wonderkid Factory into one larger idle/management game.

Core tabs:
- Club
- Squad
- Academy
- Scouting
- Training
- Facilities
- Matches
- Finance
- Sponsors
- Packs
- Quests
- World

Progression:
- club;
- city;
- region;
- country;
- world;
- optional fictional futuristic worlds.

The "space/moon/mars" idea is acceptable only as a clearly fictional late-game expansion and should not be confused with real sports facts.

---

# 81. SPORTS EMPIRE IDLE LOOP

Resources:
- money;
- gems;
- XP;
- reputation;
- fans;
- cards;
- materials.

Actions:
- upgrade;
- scout;
- train;
- open pack;
- enter match;
- earn rewards;
- wait for timed actions;
- unlock world.

Mini-games can boost resources.

Make the game take weeks rather than one sitting.

---

# 82. INTERACTIVE SPORTS ARCADE ENGINE

This is a major future system.

Use a shared engine that supports:
- mouse;
- keyboard;
- touch;
- optional controller;
- physics-lite;
- collision;
- animation;
- scoring;
- camera.

Core sports:
- soccer;
- basketball;
- football;
- baseball;
- hockey;
- tennis;
- golf.

---

# 83. SOCCER ARCADE FLAGSHIP

Modes:
### Penalty
Aim, power, timing.

### Free Kick
Curve around wall.

### Dribble
Move through defenders.

### Score Scenario
Choose a route and execute.

### Goalkeeper
Dive and save.

### Crossing
Cross and finish.

### Defender
Timed tackle.

### Sweeper Keeper
Read through ball.

### Passing
Hit moving targets.

---

# 84. BASKETBALL ARCADE

- three-point contest;
- free throw;
- dribble course;
- pick-and-roll decision;
- clutch shot;
- defensive rotation;
- passing challenge.

---

# 85. FOOTBALL ARCADE

- QB read;
- throw placement;
- route timing;
- receiver catch;
- field goal;
- punt;
- defensive coverage;
- running gap.

---

# 86. BASEBALL ARCADE

- pitch recognition;
- batting;
- home run derby;
- fielding;
- stealing;
- pitching;
- catching.

---

# 87. HOCKEY ARCADE

- breakaway;
- slapshot;
- goalie save;
- passing;
- power play;
- penalty kill.

---

# 88. SPORTS PARTY

Browser-friendly mini-game collection inspired by party-sports design.

Mini-games:
- penalty kicks;
- home-run derby;
- free throws;
- field goals;
- putting;
- tennis serve;
- hockey shootout.

Modes:
- solo;
- local;
- friend room.

Do not attempt to clone a specific commercial game's exact assets or UI.

---

# 89. TOWER DEFENSE — ATHLETE HEROES

Concept:
Athlete-inspired fictionalized heroes/towers.

Examples of gameplay archetypes:
- swimmer: water-only range;
- sharpshooter basketball archetype: extreme range;
- power forward archetype: nearby buffs;
- striker archetype: high damage;
- combat archetype: high close-range damage;
- sprinter archetype: fast movement.

Use licensed rights or fictionalized archetypes rather than implying endorsement from living athletes.

Systems:
- 20+ initial heroes;
- 10+ enemy types;
- 10 maps;
- upgrade trees;
- abilities;
- waves;
- bosses;
- difficulty;
- achievements.

---

# 90. MULTIPLAYER PRIVATE ROOMS

Room:
- public/private;
- code;
- host;
- participants;
- teams;
- rules.

Host settings:
- sport;
- era;
- roster;
- salary;
- trade restrictions;
- simulation speed;
- injury;
- transfer rules;
- difficulty;
- max players.

Use asynchronous simulation first.
Live multiplayer later.

---

# 91. CROSS-PLATFORM CAREER PIPELINE

Long-term goal:
A player can:
- play CFB;
- enter NFL;
- carry relevant fictional career identity into NFL;
- preserve stats/awards.

Similar:
- college basketball → WNBA/NBA where structurally appropriate;
- youth soccer → pro soccer.

Do not fabricate real-world historical transitions for real players. This is for fictional user-controlled careers.

---

# 92. GAME DEPRECATION POLICY

The owner wants some shallow games removed/reworked.

Current candidates:
- Overrated or Underrated
- Tier List

Do not silently delete.
Mark:
- deprecated;
- replacement game;
- redirect;
- historical record if needed.

Billion Dollar Game:
- retain only if rebuilt with stronger pacing/scoring/value.

---

# 93. HOME / GAME DESIGN SYSTEM

Every game should provide:
- immediate start;
- visible objective;
- minimal loading;
- clear feedback;
- score;
- progress;
- restart;
- share;
- report issue;
- help.

Avoid:
- long loading;
- unexplained mechanics;
- inconsistent controls;
- different help systems;
- random UI patterns.

---

# 94. PERFORMANCE

Target:
- fast first meaningful paint;
- lazy-load game-specific code;
- do not load all game engines on homepage;
- preload only likely next content;
- compress images;
- cache stable data;
- use CDN;
- batch API calls;
- avoid N+1 requests.

Interactive games:
- target stable 60fps where practical on supported devices;
- degrade gracefully on low-end hardware.

---

# 95. MOBILE

Every game must work on:
- phone portrait;
- phone landscape where useful;
- tablet;
- desktop.

Controls:
- touch targets large enough;
- no hover-only critical behavior;
- keyboard optional;
- labels available;
- responsive tables.

---

# 96. ACCESSIBILITY

Support:
- keyboard navigation;
- visible focus;
- semantic buttons;
- screen-reader labels;
- reduced motion;
- non-color-only feedback;
- accessible tables;
- accessible dialogs;
- readable contrast;
- captions/text equivalents where relevant.

Animations should have a reduced-motion mode.

---

# 97. ANIMATION SYSTEM

Shared states:
- idle;
- hover;
- select;
- success;
- failure;
- reveal;
- celebration;
- injury;
- warning;
- level-up;
- trophy;
- pack reveal.

Use a consistent visual language.

Don't add motion to every element just because it is possible.

---

# 98. CARD ART SYSTEM

Card templates:
- base;
- rare;
- epic;
- legendary;
- historical;
- special event.

Card fields:
- player;
- position;
- rating;
- sport;
- season;
- team;
- card type.

Animations:
- pack opening;
- reveal;
- rarity glow;
- walkout-style presentation.

Avoid unlicensed official card designs/logos.

---

# 99. SPORTS BINGO + DRAFT + CARDS SHARED DATA

Cards should be backed by canonical player records.

A card can reference:
- player ID;
- season;
- sport;
- team;
- rating;
- card rarity.

Do not create separate player databases for card games.

---

# 100. NEWS ENGINE

Events generate:
- headline;
- body;
- sentiment;
- importance;
- related entities;
- timestamp.

Possible event sources:
- simulation;
- transfer;
- injury;
- record;
- upset;
- trophy;
- coaching change.

The news engine should not fabricate underlying facts.

---

# 101. SOCIAL LAYER

Future:
- friends;
- follow;
- rivals;
- direct challenge;
- weekly competition;
- private leagues;
- seasonal rankings;
- team fandom;
- sport fandom.

A friend page should show:
- recent score;
- current streak;
- sport strengths;
- achievements;
- shared games.

---

# 102. SHARE CARDS

Every shareable game should generate a visual result.

Example:
DoUKnowBall
NBA Stat Line
Score: 92%
Top 8%
🔥 17-day streak

Share options:
- copy;
- native share;
- X/social link;
- messaging.

Do not expose personal email or private data in public share cards.

---

# 103. DAILY GAME ENGINE

One daily puzzle per game per day.

Server authority:
- date;
- puzzle ID;
- seed;
- score cap;
- attempt rules.

Prevent:
- refreshing to change puzzle;
- changing client clock;
- unlimited score farming.

Allow unlimited practice separately where appropriate.

---

# 104. GLOBAL LEADERBOARD

Views:
- Today
- This Week
- This Month
- Season
- All Time

Filters:
- World
- Sport
- Country/region where safe and useful
- Friends

Display:
- avatar;
- safe username;
- rank;
- score;
- trend.

Do not allow one long-form simulation to dominate simply because it has more raw play time. Normalize appropriately.

---

# 105. POINT SYSTEM

Game-specific score models.

Examples:
### Grid
Rarity-based score.

### Connections
Accuracy + time.

### Higher/Lower
Streak + difficulty.

### Stat Line
Distance from target.

### Draft
Final roster quality.

### Front Office
season accomplishments with caps.

### Career
accomplishments.

### Arcade
performance.

Then map to a bounded global leaderboard contribution.

---

# 106. SPORT-SPECIFIC DIFFICULTY

Difficulty should consider:
- era;
- player popularity;
- statistical uniqueness;
- data confidence;
- number of valid answers;
- position ambiguity;
- user performance.

Avoid difficulty based only on arbitrary random numbers.

---

# 107. QUALITY CONTROL FOR PUZZLES

Puzzle generator pipeline:
1. Generate candidate
2. Validate entities
3. Validate answer uniqueness
4. Validate rules
5. Validate difficulty
6. Validate scoring
7. QA
8. Publish
9. Monitor user reports

Failed validation = cannot publish.

---

# 108. WHO AM I / RODRI-TYPE DATA BUGS

Add regression tests:
- no age 0;
- no value 0 unless explicitly true/unknown;
- player has current team;
- player has sport;
- player position valid;
- image fallback exists.

Any invalid record should display a graceful fallback rather than nonsense.

---

# 109. FOOTLE / CAREER QUIZ / HIGHER-LOWER / CONNECTIONS

Keep expanding the puzzle pools through the puzzle factory.

Requirements:
- current data refresh;
- historical data options;
- duplicate prevention;
- difficulty distribution;
- seasonal refresh;
- more puzzles.

---

# 110. CAREER LADDER

Show actual country flags alongside clubs where appropriate.

Maintain a large enough player pool.

Do not allow puzzle repetition too quickly.

---

# 111. MISSING XI

Show:
- competing team flags;
- club colors where appropriate;
- clean non-overlapping player bubbles;
- validated positions.

Add many puzzles.

---

# 112. CLUE AUCTION / ALPHABET SPRINT / BINGO

Every one gets:
- larger content pools;
- strict rules;
- examples;
- validation;
- difficulty;
- time limits;
- score model.

Alphabet Sprint:
- explicitly require full player name where appropriate;
- accept normalized spelling variants only when configured.

---

# 113. FANTASY DRAFT UX

Replace excessive page scrolling with:
- sticky roster;
- compact player browser;
- filter;
- position filter;
- search;
- sort;
- budget display;
- draft order;
- selected player confirmation.

Clearly label whether users are:
- building a lineup;
- building a roster;
- selecting starters;
- drafting bench.

---

# 114. WORLD CUP / EVENT-SPECIFIC GAMES

Past tournaments should remain only when they provide historical value.

Current events should replace them in daily discovery.

Historical versions may be accessible from an archive.

---

# 115. SPORTS TICKER + GAME PAGES

Clicking a ticker event can open:
- live match center;
- preview;
- completed result;
- stats;
- relevant games.

This is how the site feels connected to real sports.

---

# 116. FOOTBALL/SOCCER TERMINOLOGY

Use consistent terminology per market:
- football/soccer depending page;
- manager;
- coach;
- transfer;
- lineup;
- squad;
- fixture;
- matchday.

Do not randomly alternate terms inside the same experience.

---

# 117. HISTORICAL ERA ARCHITECTURE

A historical save needs:
- era;
- data snapshot;
- rules snapshot;
- roster snapshot;
- league membership;
- competitions;
- transfer context;
- managers;
- ratings.

Never let the live 2026 database silently overwrite a 2005 save.

---

# 118. REAL-TIME DATA VS SIMULATION DATA

Separate:
### Live data
Current real-world events.

### Simulation data
User-created fictional world.

### Historical data
Archived real-world state.

Never mix them accidentally.

---

# 119. LEGAL / RIGHTS SAFEGUARDS

Do not guarantee "we can't get sued." The engineering goal is risk reduction and compliance.

Rules:
- use data/assets only with a lawful basis or appropriate license;
- maintain source/provenance;
- do not imply league affiliation;
- use disclaimers where necessary;
- avoid unlicensed athlete likenesses;
- do not copy competitor code;
- do not copy competitor's exact UI;
- use original branding/art;
- do not publish defamatory claims;
- have legal counsel review commercial expansion where appropriate.

For generated athlete personas, clearly distinguish fictional users/players from real athletes.

---

# 120. PLAYER LIKENESS / AVATAR STRATEGY

Preferred:
- stylized fictional avatars;
- licensed images where available;
- public-domain/appropriately licensed assets;
- clearly transformative original UI.

Do not generate an image that implies a real athlete endorses DoUKnowBall.

---

# 121. AI USAGE POLICY

AI can be used for:
- code assistance;
- draft copy;
- news wording from verified facts;
- puzzle generation;
- QA;
- data conflict detection;
- content moderation support.

AI must not be the ultimate authority for:
- score;
- player identity;
- official stat;
- current team;
- historical rules;
- final match result.

Those come from deterministic data/services.

---

# 122. ADMIN CONSOLE

Admin needs:
- reports;
- users;
- usernames;
- games;
- puzzle pool;
- data errors;
- leaderboard anomalies;
- flagged content;
- source status;
- data refresh status;
- live ticker status;
- failed data imports;
- analytics.

---

# 123. REPORT ISSUE ADMIN WORKFLOW

Statuses:
- New
- Investigating
- Confirmed
- Fixed
- Not a bug
- Duplicate
- Won't fix

Priority:
- Critical
- High
- Medium
- Low

Critical examples:
- wrong score;
- leaderboard corruption;
- save loss;
- security issue;
- broken game for everyone.

---

# 124. TESTING STRATEGY

Every major system needs:
### Unit tests
rules/calculations.

### Integration tests
database/API/game submission.

### E2E
real user flows.

### Visual regression
UI.

### Data validation
sport records.

### Load tests
ticker/leaderboards.

---

# 125. CORE ACCEPTANCE TESTS

## Profile
- streak accurate;
- badges accurate;
- recent games accurate;
- best scores accurate;
- world rank accurate.

## Leaderboard
- duplicate points prevented;
- safe names;
- correct sorting;
- correct daily reset.

## Ticker
- upcoming event appears;
- live score updates;
- final state appears;
- stale status handled.

## Saves
- save;
- logout;
- login elsewhere;
- load same world;
- no corruption.

## Club Manager
- transfer negotiation;
- player contract;
- staff hire/fire;
- board objective;
- fan reaction;
- facility upgrade;
- competition table;
- historical rules.

---

# 126. PERFORMANCE ACCEPTANCE

Critical pages should:
- load quickly;
- avoid blocking the main thread;
- lazy-load heavy game engines;
- show progress during unavoidable loading;
- never sit on blank screen.

A user should understand the page is loading within moments.

---

# 127. ERROR HANDLING

Never show:
- raw stack traces;
- database errors;
- undefined;
- NaN;
- null;
- age 0 due to parsing;
- missing-player blank state.

Show:
"Something went wrong. Your progress was not lost."
where appropriate.

Log details privately.

---

# 128. SAVE SYSTEM

Long-form games should support:
- autosave;
- manual save;
- multiple saves;
- cloud save;
- local recovery;
- save versioning;
- migration.

When migrating old saves:
- use version numbers;
- write migration scripts;
- never overwrite without backup.

---

# 129. OFFLINE / CONNECTION RESILIENCE

For lightweight games:
- cache puzzle;
- permit short offline session where safe;
- queue result;
- resolve conflict server-side.

For live games:
- show connection status;
- prevent double submission.

---

# 130. SECURITY

Protect:
- user IDs;
- admin routes;
- reports;
- email;
- authentication;
- save data.

Never trust client-submitted:
- score;
- username;
- leaderboard points;
- card ownership;
- currency;
- achievement state.

Server validates.

---

# 131. ANTI-CHEAT

Potential signals:
- impossible completion time;
- repeated submissions;
- manipulated timestamps;
- impossible score;
- client tampering;
- multiple attempts on daily puzzle.

Do not automatically ban solely on one signal.
Flag for review.

---

# 132. VIRTUAL ECONOMY

Use virtual currencies only for:
- cosmetics;
- packs;
- upgrades;
- idle resources.

Currencies:
- coins;
- gems;
- XP;
- reputation.

Define sinks and sources.

Avoid infinite inflation.

---

# 133. NO PAY-TO-WIN CORE LEADERBOARD

Paid features should not directly buy:
- leaderboard points;
- championships;
- correct answers.

Premium can offer:
- ad-free;
- cosmetics;
- enhanced stats;
- extra save slots;
- profile customization.

---

# 134. SOCIAL CHALLENGES

Challenge:
- specific game;
- specific puzzle;
- score target;
- time target;
- friend.

Modes:
- asynchronous;
- timed;
- first-to-finish.

---

# 135. PRIVATE LEAGUES

Host creates:
- name;
- sport;
- season;
- teams;
- rules;
- number of managers.

Invite code.

Standings:
- wins;
- losses;
- points;
- trophies;
- user managers.

---

# 136. SEASONAL PLATFORM

Create DoUKnowBall seasons.

Each season:
- global leaderboard;
- sport rankings;
- awards;
- special games;
- events;
- achievements;
- Hall of Fame entries.

Keep archived history.

---

# 137. DOUKNOWBALL HALL OF FAME

Permanent records:
- most points;
- longest streak;
- most wins;
- most championships;
- best dynasty;
- best career;
- rarest answers;
- most games played;
- most sports mastered.

---

# 138. DAILY SOCIAL EVENT

Each day:
- today's puzzle list;
- global participation;
- median score;
- top score;
- percentile.

End screen:
"You beat 93% of players today."

---

# 139. MIXED SPORTS MODES

New game:
### Sports Survival
Random sport every round.

New game:
### Sports Roulette
Spin sport → game → era → difficulty.

New game:
### Against the World
One challenge, global percentile.

New game:
### Sports Battle Royale
Players eliminated across rounds.

---

# 140. NEW GAME IDEA — DEADLINE DAY

Players have a limited in-game window to:
- sell;
- buy;
- loan;
- extend;
- negotiate.

Events happen in real-time/simulation time.

---

# 141. NEW GAME IDEA — TRADE MACHINE

User proposes trade.
System grades:
- each side;
- cap legality;
- fit;
- draft value;
- risk.

AI-generated commentary must be based on deterministic evaluation.

---

# 142. NEW GAME IDEA — DRAFT STEAL

Choose a prospect others overlook.
Simulate 5–10 years.
See whether you found a steal.

---

# 143. NEW GAME IDEA — MANAGER HOT SEAT

You have:
- board confidence;
- fan confidence;
- player morale.

One poor run can lead to dismissal.

---

# 144. NEW GAME IDEA — CONTRACT CHAOS

Compare competing offers based on:
- money;
- role;
- location;
- trophies;
- stability;
- playing time.

---

# 145. NEW GAME IDEA — SCOUT COMBINE

Test fictional prospects.
Estimate:
- current ability;
- potential;
- physical;
- technical.

Then reveal truth.

---

# 146. NEW GAME IDEA — FRANCHISE RESCUE

Worst team.
Fixed time horizon.
Win enough to survive.

---

# 147. NEW GAME IDEA — DYNASTY KILLER

Take over a champion and try to keep winning after roster turnover.

---

# 148. NEW GAME IDEA — SPORTS COURT

Fictional sports-management crisis.
Read evidence.
Choose response.
Manage reputation.

No real person allegations.

---

# 149. NEW GAME IDEA — OWNER MODE

Manage:
- manager;
- club;
- facilities;
- finances;
- philosophy;
- brand.

---

# 150. NEW GAME IDEA — SPORTS MEDIA

Player chooses predictions/headlines/ratings.
Compare accuracy.

---

# 151. NEW GAME IDEA — CAREER RESCUE

Try to revive a fictional declining athlete.

---

# 152. GAME DISCOVERY / RECOMMENDATION ENGINE

Use user behavior:
- favorite sports;
- games played;
- difficulty success;
- completion;
- session length.

Recommend:
- similar;
- new;
- deeper;
- easier;
- competitive.

Don't recommend only what they've already played.

---

# 153. HOMEPAGE PERSONALIZATION

Logged-out:
- general popular/daily/live.

Logged-in:
- continue;
- favorite sport;
- friends;
- streak;
- recommended;
- saved careers.

---

# 154. DATA REFRESH PIPELINE

Per sport:
- schedule refresh;
- roster refresh;
- standings refresh;
- player status refresh;
- historical refresh.

Log:
- fetched;
- changed;
- rejected;
- verified.

Never silently overwrite.

---

# 155. HISTORICAL FOOTBALL DATABASE

For each season:
- clubs;
- leagues;
- competitions;
- managers;
- squads;
- player histories;
- competition format;
- qualification;
- transfers;
- ratings.

Historical modes must be internally consistent.

---

# 156. CURRENT SPORTS DATABASE

For current season:
- schedules;
- rosters;
- standings;
- stats;
- injuries if data source supports;
- transactions;
- competition context.

---

# 157. SCHEDULING

Use a server-side authoritative clock.

Daily reset should not rely entirely on browser timezone.

Define:
- reset time;
- timezone;
- grace behavior.

---

# 158. OBSERVABILITY

Monitor:
- page errors;
- API errors;
- data import failure;
- game crash;
- save failure;
- ticker stale time;
- slow page;
- score anomaly;
- report volume.

Alerts:
- critical failures;
- widespread game failure;
- data mismatch.

---

# 159. RELEASE PROCESS

For major game:
1. design;
2. data;
3. implementation;
4. internal QA;
5. mobile QA;
6. accessibility;
7. SEO;
8. analytics;
9. performance;
10. release;
11. monitor;
12. iterate.

Never ship an untested "prototype" as if it were a finished game.

---

# 160. PRODUCT PRIORITY MATRIX

## P0 — Fix immediately
- data correctness;
- account/profile correctness;
- leaderboard correctness;
- ticker;
- duplicate footer;
- report issue;
- global help component;
- save integrity;
- broken tables/competitions;
- position validation;
- wrong team/league mapping;
- performance bottlenecks.

## P1 — Flagship depth
- Club Manager 2.0;
- Soccer Career 2.0;
- competition engine;
- match center;
- universal manager engine;
- cloud saves.

## P2 — Platform expansion
- Conquest 2.0;
- universal Draft;
- Sports Bingo;
- card engine;
- interactive arcade engine;
- WNBA games.

## P3 — Social
- friend system;
- challenges;
- private rooms;
- leagues;
- tournaments.

## P4 — Experimental
- tower defense;
- Sports Party;
- giant Sports Empire;
- futuristic worlds.

---

# 161. 90-DAY BUILD TARGET

## Weeks 1–2
Audit repository and data.

## Weeks 2–4
Fix:
- profile;
- leaderboard;
- ticker;
- footer;
- report system;
- game help.

## Weeks 3–6
Central data validation.

## Weeks 5–10
Club Manager infrastructure overhaul.

## Weeks 7–12
Cloud save + competition engine + match center groundwork.

Do not simultaneously start 10 giant games.

---

# 162. 6-MONTH TARGET

Ship:
- Club Manager 2.0;
- Soccer Career major overhaul;
- WNBA game family;
- Conquest engine;
- universal Draft;
- share cards;
- achievements;
- social challenges.

---

# 163. 12-MONTH TARGET

Aim for:
- unified profile;
- deep career systems;
- multiplayer leagues;
- interactive arcade engine;
- Sports Empire;
- tower defense prototype;
- large seasonal competitions;
- native/PWA polish if justified by user behavior.

---

# 164. "GREATEST WEBSITE EVER" QUALITY BAR

A feature is not done because:
- code compiles;
- page loads;
- button exists.

A feature is done when:
- it is fun;
- it is understandable;
- it is correct;
- it is responsive;
- it is accessible;
- it is fast;
- it is tested;
- it is measurable;
- it integrates with the platform;
- it does not create regressions.

---

# 165. DEFINITION OF DONE — GAME

A game is complete only if:
- objective is clear;
- rules are accurate;
- controls are reliable;
- data is validated;
- scoring is deterministic;
- result is stored;
- profile updates;
- leaderboard contribution works;
- mobile works;
- accessibility works;
- help exists;
- report issue exists;
- share exists where appropriate;
- loading/error states work;
- QA passes;
- analytics fire;
- SEO is configured if indexable.

---

# 166. DEFINITION OF DONE — SIMULATION

Additionally:
- save/load works;
- state versioning exists;
- season advancement works;
- schedules correct;
- standings correct;
- contracts work;
- transfers work;
- injuries work;
- news reflects facts;
- board/fan/player systems interact;
- financials balance;
- historical mode uses correct rules;
- simulations do not produce impossible state.

---

# 167. DEFINITION OF DONE — INTERACTIVE GAME

Additionally:
- controls tested on keyboard;
- touch;
- mouse;
- player movement;
- collision;
- animation;
- scoring;
- fail/retry;
- difficulty;
- frame rate;
- input latency;
- pause;
- reduced motion;
- audio optional/mutable.

---

# 168. REGRESSION TEST LIST

Before every major release:
- home;
- ticker;
- login;
- logout;
- profile;
- leaderboard;
- daily game;
- one game from each engine;
- Club Manager;
- Soccer Career;
- mobile;
- ads;
- footer;
- SEO metadata;
- save/load.

---

# 169. PRODUCT PHILOSOPHY

The platform should feel like:
- sports-first;
- playful;
- fast;
- competitive;
- data-rich;
- slightly chaotic/fun;
- deep when desired.

It should not feel like:
- a spreadsheet pretending to be a game;
- a casino;
- a content farm;
- a cluttered quiz directory;
- a slow stats database.

---

# 170. COMPETITOR INSPIRATION RULE

Study:
- FIFA / EA Sports for management depth and familiar concepts;
- NBA 2K for presentation, media, social, career framing;
- Madden for franchise architecture;
- Football Manager for management depth;
- FutMob for information architecture and live match presentation;
- Score! Hero for swipe-based football interaction;
- Sporcle for game breadth;
- Immaculate Grid for daily/social puzzle behavior;
- Coolmath Games for simple interactive browser-game controls;
- Sports Star Idle for idle/upgrade inspiration.

But:
- do not copy source code;
- do not reproduce copyrighted assets;
- do not clone exact UI;
- do not copy content word-for-word;
- use inspiration to create original systems.

---

# 171. EXTERNAL-FACT VERIFICATION RULE

When the game depends on real-world rules, current schedules, league size, competition format, expansion, or current player/team status:
- verify against authoritative/current sources;
- timestamp the verification;
- preserve historical versions.

Example: UEFA's current 2026/27 Champions League league phase has 36 clubs, 8 opponents per club, and four pots of nine; that should come from versioned competition data, not a permanent hard-coded assumption. citeturn913377search2turn913377search6

Example: UEFA explicitly notes the newer 36-team league phase replaced the former eight-group 32-team format. Historical seasons therefore require separate rule versions. citeturn913377search5

Example: the WNBA has announced a 50-game regular season beginning in 2027, so WNBA schedule logic must be season-configurable. citeturn913377search0

---

# 172. GOOGLE / ADS / SEARCH RULE OF THUMB

The product must provide real user value first.

Google states that scaled content created primarily to manipulate rankings without meaningful user value can violate its spam policies. citeturn913377search1

Google also cautions that ads near game controls can create accidental clicks and that game pages must be designed so users can navigate to the game without being tricked into clicking ads. citeturn913377search12turn913377search13

Therefore:
- never build SEO spam farms;
- never put ads beside repeated high-frequency controls;
- never disguise ads as navigation;
- never prioritize ad clicks over the game.

---

# 173. THE META-GAME

Ultimately every product should connect to:

## Your DoUKnowBall Identity

Metrics:
- Ball IQ;
- sport IQ;
- XP;
- level;
- streak;
- achievements;
- trophies;
- rankings;
- careers;
- dynasties;
- conquest;
- cards;
- friends;
- records.

The platform should remember the user.

---

# 174. THE "SPORTS LIFE" LOOP

Target ideal loop:

Google/social discovery
→ quick game
→ score
→ profile
→ leaderboard
→ friend challenge
→ deeper game
→ account
→ save
→ achievement
→ return tomorrow
→ longer-term career
→ share story
→ invite friend
→ repeat.

---

# 175. THE BIGGEST PRODUCT OPPORTUNITY

Do not optimize solely for:
- number of games.

Optimize for:
- retained users;
- daily active users;
- session length;
- games per user;
- save continuation;
- challenge participation;
- share rate;
- account creation;
- week-4 retention.

The question is:
"Why does this person come back tomorrow?"

---

# 176. GAME PORTFOLIO STRATEGY

Maintain tiers.

### S-tier
Flagship, polished, marketing focus.

### A-tier
Strong acquisition/retention.

### B-tier
Supporting variety/SEO.

### Experimental
Cheap tests.

Every quarter:
- promote;
- maintain;
- rework;
- retire.

---

# 177. FINAL VISION

DoUKnowBall should eventually feel like a combination of:

- daily sports puzzle platform;
- browser arcade;
- sports social network;
- career simulator;
- franchise management simulator;
- fantasy/draft platform;
- sports card collection;
- conquest game;
- sports data/live-score hub.

The user should be able to enter for 60 seconds and stay for hours.

---

# 178. FINAL INSTRUCTION TO CLAUDE CODE

Do not attempt to "finish this document" by blindly implementing every feature at once.

Instead:

1. Inspect the repository.
2. Build a dependency graph.
3. Identify existing reusable components.
4. Create a prioritized implementation plan.
5. Fix P0 infrastructure/data issues first.
6. Create shared engines.
7. Rebuild Club Manager as the flagship proof of the architecture.
8. Generalize the successful systems to other sports.
9. Add interactive gameplay after the shared platform is stable.
10. Add social/multiplayer after identity and save systems are reliable.
11. Keep everything tested and data-validated.

When you encounter an ambiguity:
- choose the most maintainable interpretation;
- prefer data-driven and configurable architecture;
- do not ask the operator to manually configure something that can be derived safely;
- do not fabricate data;
- document the decision.

When you implement a feature:
- implement it fully enough to be useful;
- do not ship fake UI;
- do not add buttons that do nothing;
- do not hide known broken behavior.

The objective is not to produce the longest codebase.

The objective is to produce the best sports gaming product.

---

# APPENDIX A — OWNER'S PRIORITY PHRASES TRANSLATED INTO ENGINEERING REQUIREMENTS

"Way more animated" =>
Use shared animation/state machines, event-driven presentation, and interactive controls.

"Everything FIFA has plus more" =>
Do not literally copy FIFA; create a broader configurable management system with original implementation.

"Everything imaginable" =>
Prioritize by user value and reusable systems; do not build redundant features.

"Make it fully indexable" =>
Audit every valuable route for discoverability, rendering, canonical, sitemap, metadata, and content value.

"Make it accurate" =>
Centralize data and implement validation/regression tests.

"Make it work" =>
No placeholder interactions in production.

"More puzzles" =>
Automate validated puzzle generation.

"More realistic" =>
Use rules and consequences, not just text labels.

"More animation" =>
Animate meaningful state transitions and game moments.

"More like FIFA/FutMob/2K" =>
Study interaction/information patterns, then implement original designs.

---

# APPENDIX B — MASTER CHECKLIST

## Platform
- [ ] global shell
- [ ] no duplicate footer
- [ ] shared help
- [ ] shared reports
- [ ] shared analytics
- [ ] shared ads
- [ ] shared profile
- [ ] shared saves
- [ ] shared leaderboard
- [ ] shared achievements

## Data
- [ ] canonical players
- [ ] teams
- [ ] leagues
- [ ] seasons
- [ ] competitions
- [ ] validation
- [ ] historical snapshots
- [ ] current snapshots
- [ ] source provenance

## UX
- [ ] clear homepage
- [ ] continue playing
- [ ] play today
- [ ] live ticker
- [ ] favorite teams
- [ ] profile
- [ ] share
- [ ] help
- [ ] report issue

## Club Manager
- [ ] manager
- [ ] staff
- [ ] board
- [ ] fans
- [ ] finances
- [ ] transfers
- [ ] contracts
- [ ] scouting
- [ ] academy
- [ ] tactics
- [ ] matches
- [ ] competitions
- [ ] historical eras
- [ ] facilities
- [ ] manager XP
- [ ] news

## Soccer Career
- [ ] academy
- [ ] development
- [ ] drills
- [ ] matches
- [ ] contracts
- [ ] transfers
- [ ] life
- [ ] fame
- [ ] media
- [ ] relationships
- [ ] sponsorship
- [ ] injuries
- [ ] national team
- [ ] legacy

## Other sports
- [ ] NBA
- [ ] NFL
- [ ] MLB
- [ ] NHL
- [ ] WNBA
- [ ] CFB
- [ ] CBB
- [ ] soccer
- [ ] future sports

## New engines
- [ ] Conquest
- [ ] Draft
- [ ] Cards
- [ ] Bingo
- [ ] Interactive Arcade
- [ ] Sports Party
- [ ] Sports Empire
- [ ] Tower Defense
- [ ] Multiplayer

## Safety
- [ ] moderation
- [ ] username filter
- [ ] reports
- [ ] privacy
- [ ] ad-safe placement
- [ ] no cash gambling
- [ ] rights review
- [ ] fictional sponsor safety

## SEO
- [ ] sitemap
- [ ] canonical
- [ ] metadata
- [ ] internal links
- [ ] no accidental noindex
- [ ] valuable pages
- [ ] no scaled low-value content
- [ ] fast render

## QA
- [ ] unit
- [ ] integration
- [ ] e2e
- [ ] visual regression
- [ ] mobile
- [ ] accessibility
- [ ] data validation
- [ ] save migration
- [ ] leaderboard
- [ ] ticker
- [ ] ads

---

# APPENDIX C — SOURCES / CURRENT-FACT REFERENCES

Official/current references used for examples in this specification:

DoUKnowBall Club Manager:
https://douknowball.com/club-manager

DoUKnowBall What's New:
https://douknowball.com/whats-new

UEFA 2026/27 Champions League league phase:
https://www.uefa.com/uefachampionsleague/news/02a8-215821715a96-9a3b43fad585-1000--uefa-champions-league-league-phase-draw/

UEFA Champions League format change:
https://www.uefa.com/uefachampionsleague/news/0268-12157d69ce2d-9f011c70f6fa-1000--new-format-for-champions-league-post-2024-everything-you-need-to-know/

WNBA 2027 schedule expansion:
https://www.wnba.com/news/wnba-expands-to-50-game-regular-season

Google Search spam policies:
https://developers.google.com/search/docs/essentials/spam-policies

Google AdSense gameplay-page ad guidance:
https://support.google.com/adsense/answer/2768340

Google Ad placement policies:
https://support.google.com/adsense/answer/1346295

---

# END OF MASTER SPECIFICATION

This document is intentionally written as a living master spec. Maintain a changelog, version the schema, and update the implementation status as the product evolves.


---

# APPENDIX D — IMPLEMENTATION BLUEPRINT

This appendix turns the product vision into concrete engineering contracts. The objective is to reduce interpretation for an AI coding agent and make the implementation composable.

# D1. DOMAIN MODEL OVERVIEW

The platform should use these major domains:

## Identity Domain
Entities:
- User
- Username
- Avatar
- Preferences
- FavoriteTeams
- FavoriteSports
- SafetyFlags
- Roles

## Sports Data Domain
Entities:
- Sport
- Country
- Region
- Player
- Team
- League
- Competition
- Season
- Venue
- StatRecord
- RosterSnapshot
- Transfer
- Contract
- HistoricalSnapshot

## Game Domain
Entities:
- GameDefinition
- GameMode
- Puzzle
- PuzzleAnswer
- Session
- Attempt
- Score
- Result
- DailyInstance
- GameVersion

## Simulation Domain
Entities:
- Save
- World
- Club
- Manager
- StaffMember
- SquadState
- FinanceState
- FacilityState
- RelationshipState
- Objective
- Event
- CompetitionState
- MatchState

## Social Domain
Entities:
- Friend
- Follow
- Challenge
- Room
- PrivateLeague
- Tournament
- Notification
- SharedResult

## Economy Domain
Entities:
- Currency
- Wallet
- Transaction
- Reward
- Card
- Pack
- Collection
- Upgrade

## Content Domain
Entities:
- NewsItem
- Headline
- Poll
- Record
- Guide
- FAQ
- ReleaseNote

## Operations Domain
Entities:
- Report
- ModerationAction
- DataConflict
- ImportJob
- Deployment
- FeatureFlag

---

# D2. DATABASE DESIGN PRINCIPLES

1. Use stable IDs, never player names as primary keys.
2. Use season IDs for every historical state.
3. Use snapshot/version IDs when data changes.
4. Use foreign keys where supported.
5. Add indexes for common lookups:
   - player by sport;
   - player by current team;
   - player by historical team;
   - team by league;
   - team by season;
   - competition by season;
   - game result by user;
   - leaderboard by score/date;
   - report by status/priority.
6. Keep immutable historical snapshots.
7. Store timestamps in UTC and render in user-local time.
8. Use integer/decimal values for money, not floating-point where exact accounting matters.
9. Use transactions for leaderboard/currency/save updates.
10. Never trust a browser's claimed score, level, currency, or achievement.

---

# D3. EXAMPLE USER TABLE

Suggested fields:
- id
- created_at
- updated_at
- username_id
- email_provider
- last_login_at
- account_status
- moderation_status
- timezone
- locale
- favorite_sport
- avatar_id
- level
- total_xp
- ball_iq
- current_streak
- longest_streak
- last_daily_activity_date

Do not store derived metrics in multiple unrelated tables unless there is a strong caching reason and a canonical source is clearly documented.

---

# D4. EXAMPLE GAME RESULT TABLE

Fields:
- id
- user_id
- game_id
- mode_id
- puzzle_id
- session_id
- started_at
- completed_at
- raw_score
- normalized_score
- leaderboard_points
- accuracy
- completion_time_ms
- attempts
- version
- metadata_json

A result must be immutable after finalization except for an explicit correction/audit process.

---

# D5. LEADERBOARD ARCHITECTURE

Do not calculate a global leaderboard by scanning every result at page-load time.

Use:
- append-only result records;
- aggregation jobs;
- materialized rankings;
- cache for frequently requested views;
- server-side pagination.

Leaderboard keys:
- daily;
- weekly;
- monthly;
- season;
- lifetime;
- sport;
- game;
- friends.

Tie-breakers must be defined per leaderboard.

---

# D6. SCORE NORMALIZATION

Every game returns:
- raw_score;
- max_possible;
- normalized_0_100;
- leaderboard_weight;
- difficulty_multiplier.

Example:

normalized_score = raw_score / max_possible * 100

Then apply game-specific weighting.

Do not allow longer games to overwhelm shorter games merely because they have more opportunities to generate raw points.

---

# D7. XP VS SCORE

Keep these separate.

## Score
A result for that game.

## XP
Progression reward.

## Ball IQ
Skill/knowledge identity.

## Leaderboard points
Competitive normalized contribution.

This prevents a user from spending four hours in one simulator and automatically becoming the world's highest "trivia" player.

---

# D8. API LAYER

Prefer domain-oriented API endpoints.

Examples:

GET /api/me
GET /api/me/profile
GET /api/me/stats
GET /api/me/achievements
GET /api/me/saves
POST /api/game/session
POST /api/game/result
GET /api/game/:id
GET /api/game/:id/daily
POST /api/game/:id/report
GET /api/leaderboard
GET /api/ticker
GET /api/competitions/:id
GET /api/teams/:id
GET /api/players/:id

For simulations:
POST /api/save
GET /api/save/:id
POST /api/save/:id/advance
POST /api/save/:id/action
POST /api/save/:id/transfer-offer
POST /api/save/:id/contract-offer
POST /api/save/:id/tactics
POST /api/save/:id/substitution

Validate authorization on every mutating endpoint.

---

# D9. SERVER AUTHORITATIVE GAME FLOW

1. Client requests session.
2. Server creates session ID and puzzle/state seed.
3. Client plays.
4. Client sends final actions/result.
5. Server verifies:
   - puzzle;
   - rules;
   - time;
   - answer;
   - score.
6. Server writes result.
7. Server calculates XP/leaderboard changes.
8. Server updates profile aggregates.
9. Server returns canonical result.
10. Client renders result.

Do not let the client decide the final leaderboard score.

---

# D10. FEATURE FLAGS

Use flags for:
- new game versions;
- beta features;
- experimental matchmaking;
- new scoring models;
- UI redesign;
- data migrations;
- new ad placements.

Allow:
- per-user;
- percentage rollout;
- admin;
- environment.

Never hard-delete a feature while old saves or URLs can still reference it.

---

# D11. GAME REGISTRY

Create a registry such as:

game_id
- slug
- title
- sport
- category
- status
- engine
- daily_enabled
- indexable
- multiplayer
- premium
- leaderboard_weight
- current_version
- release_date
- updated_at

Statuses:
- active
- beta
- experimental
- deprecated
- archived

This becomes the source of truth for navigation and game discovery.

---

# D12. GAME VERSIONING

Each game should have:
- game version;
- rules version;
- data version.

A result must record all three.

If scoring changes:
- old results retain old scoring context;
- new results use the new version.

---

# D13. DAILY PUZZLE GENERATION

Daily jobs:
1. Generate candidate pool.
2. Validate.
3. Estimate difficulty.
4. Deduplicate.
5. Publish daily instance.
6. Freeze.
7. Monitor reports.
8. If critical error occurs, replace with a versioned emergency puzzle.
9. Never silently change a completed day's result.

---

# D14. PUZZLE GENERATION TESTS

For each generated puzzle:
- exactly one intended answer unless the mode explicitly permits many;
- all clues resolve;
- entities exist;
- entity dates fit;
- positions fit;
- sport matches;
- team/league matches;
- difficulty within range;
- no forbidden data;
- no duplicate puzzle within cooldown;
- correct scoring metadata.

---

# D15. GAME UI STATE MACHINE

Every game should define:
- idle;
- loading;
- ready;
- playing;
- paused;
- success;
- failure;
- results;
- error.

Never rely on a dozen unrelated boolean flags if a small state machine makes the behavior clearer.

---

# D16. GLOBAL LOADING EXPERIENCE

Do not show a blank page.

Use:
- skeletons;
- progress message;
- retry;
- cached content.

For heavier games:
"Loading match engine..."
"Loading player data..."
"Preparing your save..."

Avoid fake progress bars that jump randomly.

---

# D17. GLOBAL ERROR EXPERIENCE

Every user-facing error should:
- explain what happened in plain language;
- say whether progress is safe;
- provide retry;
- provide report option.

Example:
"Your result could not be saved. We kept your local session. Try again."

---

# D18. SPORTS DATA IMPORT PIPELINE

Pipeline:
1. Fetch.
2. Parse.
3. Normalize.
4. Validate.
5. Diff.
6. Review material changes.
7. Write new snapshot.
8. Publish.
9. Invalidate relevant cache.
10. Run regression tests.

Critical changes:
- player moves team;
- competition format;
- league membership;
- player position;
- active/retired state.

---

# D19. DATA DIFF VIEW

Admin should see:
"Rodri age: 29 → 30"
"Player X team: A → B"
"Team Y league: L1 → L2"

Allow accept/reject for manually reviewed imports.

---

# D20. HISTORICAL SNAPSHOT RULE

Never mutate a historical save merely because current data changed.

Example:
2005-06 Barcelona should remain 2005-06 Barcelona even if a player record is later updated in the current-season database.

Historical saves should refer to:
- season snapshot;
- roster snapshot;
- rules snapshot.

---

# D21. WORLD SIMULATION

A management game world should advance:
- every fixture;
- transfers;
- injuries;
- player development;
- retirements;
- youth generation;
- staff changes;
- financial movement;
- board state;
- media events.

Not every team needs expensive detailed simulation. Use tiered simulation:
- user's club: detailed;
- major rivals: medium;
- distant leagues: simplified.

---

# D22. SIMULATION DETERMINISM

Where practical, use seeded randomness.

A seed should allow:
- reproducible debugging;
- replay;
- QA;
- bug reports.

Store:
- world seed;
- match seed;
- event seed.

---

# D23. MATCH SIMULATION MODEL

Inputs:
- team strength;
- player ratings;
- tactics;
- fatigue;
- injuries;
- morale;
- form;
- home advantage;
- weather if relevant and sourced;
- competition context.

Outputs:
- score;
- shots;
- shots on target;
- possession;
- corners;
- cards;
- fouls;
- substitutions;
- player ratings;
- event timeline.

Do not make every match a random coin flip.

---

# D24. EVENT PROBABILITY MODEL

An event probability should consider:
- time;
- score state;
- team strength;
- tactical state;
- fatigue;
- player role;
- recent event history.

Example:
A trailing team in the final 10 minutes should generally increase attacking risk if tactics allow it.

---

# D25. MATCH PRESENTATION ENGINE

Input:
MatchEvent.

Output:
- animation;
- commentary;
- stat update;
- scoreboard update;
- timeline entry;
- crowd effect.

One event should update all relevant UI in a predictable way.

---

# D26. MATCH EVENT TYPES

Soccer:
- kickoff
- pass
- shot
- goal
- save
- deflection
- corner
- throw-in
- foul
- yellow
- red
- offside
- penalty awarded
- penalty saved
- penalty scored
- substitution
- injury
- VAR
- halftime
- fulltime

NBA:
- possession
- three-pointer
- two-pointer
- free throw
- rebound
- assist
- steal
- block
- foul
- timeout
- substitution
- quarter end.

NFL:
- snap;
- run;
- pass;
- completion;
- incompletion;
- interception;
- sack;
- fumble;
- touchdown;
- field goal;
- punt;
- penalty;
- turnover;
- timeout;
- quarter/half/end.

MLB:
- pitch;
- ball;
- strike;
- foul;
- walk;
- hit;
- home run;
- stolen base;
- error;
- out;
- inning.

NHL:
- shot;
- goal;
- save;
- rebound;
- hit;
- penalty;
- power play;
- faceoff;
- period;
- overtime.

WNBA follows basketball event architecture with league-specific roster/schedule rules.

---

# D27. SOCCER MATCH ANIMATION V1

Do not attempt full freeform 3D.

Implement:
- 2D pitch;
- 22 player sprites/dots;
- role-based position anchors;
- dynamic movement between anchors;
- possession carrier;
- ball path;
- passing lines;
- shot trajectory;
- keeper animation;
- event-specific animations.

Player labels should not overlap permanently.
Allow tap/click for player details.

---

# D28. SOCCER MATCH ANIMATION V2

Add:
- contextual movement;
- overlap avoidance;
- defensive lines;
- attacking runs;
- pressing;
- counterattacks;
- set-piece layouts;
- corner routines.

---

# D29. SOCCER MATCH ANIMATION V3

Possible future:
- higher-fidelity character sprites;
- skeletal animation;
- richer camera;
- crowd;
- stadium effects;
- audio commentary.

Only build this once the simulation layer is solid.

---

# D30. CLUB MANAGER HOME SCREEN

Primary widgets:
- next fixture;
- league position;
- board confidence;
- fan confidence;
- player morale;
- transfer window status;
- injuries;
- finances;
- inbox;
- current objective;
- manager XP.

Quick actions:
- Squad
- Tactics
- Transfers
- Staff
- Academy
- Finances
- Competitions
- News
- Facilities

---

# D31. CLUB MANAGER INBOX

Inbox should be event-driven.

Message examples:
- player requests;
- contract requests;
- scout report;
- staff offer;
- board request;
- sponsor offer;
- injury update;
- transfer bid;
- media request;
- federation notice.

Each message can have actions.

---

# D32. CLUB MANAGER MESSAGE CONSEQUENCES

A response can change:
- player trust;
- staff trust;
- board;
- fans;
- media reputation;
- finances;
- morale;
- future event probability.

Store decision history.

---

# D33. CLUB MANAGER NEGOTIATION TIMER

Negotiations can have:
- patience;
- relationship;
- deadline;
- number of counters;
- walk-away threshold.

Do not make every negotiation fail after exactly the same number of turns.

---

# D34. CLUB MANAGER TRANSFER AI

Other clubs should consider:
- budget;
- squad need;
- age profile;
- player value;
- tactical fit;
- reputation;
- manager preference;
- rivalry;
- relationship;
- financial pressure.

---

# D35. CLUB MANAGER PLAYER VALUE MODEL

Suggested inputs:
- current ability;
- potential;
- age;
- contract length;
- position scarcity;
- recent performance;
- reputation;
- league level;
- market trend;
- demand;
- injuries.

The "market value" is a simulation estimate, not a guaranteed real price.

---

# D36. PLAYER CONTRACT SYSTEM

Fields:
- wages;
- contract years;
- signing bonus;
- appearance bonus;
- goal/assist bonus;
- clean-sheet bonus;
- trophy bonus;
- role;
- release clause;
- buyout;
- agent fee.

Players can be:
- satisfied;
- neutral;
- dissatisfied.

---

# D37. PLAYER MORALE SYSTEM

Inputs:
- minutes;
- starts;
- wages;
- form;
- manager relationship;
- role;
- team success;
- promises;
- injuries.

Outputs:
- morale;
- performance modifier where appropriate;
- transfer interest;
- conversation frequency.

Avoid huge hidden modifiers that users cannot understand.

---

# D38. FAN MODEL

Inputs:
- results;
- rivalries;
- ticket prices;
- transfer strategy;
- youth use;
- attacking style;
- trophies;
- controversial decisions;
- stadium investment.

Output:
- attendance;
- mood;
- social reaction;
- pressure.

---

# D39. BOARD MODEL

Inputs:
- results;
- finances;
- brand;
- objectives;
- facilities;
- transfers;
- long-term plan.

Output:
- confidence;
- patience;
- bonuses;
- warnings;
- sacking probability.

---

# D40. SACKING SYSTEM

Never randomly fire without a visible cause.

Show:
- current confidence;
- target;
- projected risk;
- trend.

Possible:
"Secure."
"Under review."
"At risk."
"Final warning."

---

# D41. MEDIA SYSTEM

Media content should be generated from real in-game events.

Types:
- breaking news;
- match preview;
- match report;
- rumors;
- transfer;
- injury;
- controversy;
- board pressure;
- award race;
- tactical analysis;
- fan reaction.

Each article references event IDs.

---

# D42. POLL SYSTEM

Polls should be interactive.

Examples:
"Should Barcelona sell Player X?"
"Who wins the Ballon d'Or?"
"Who should start?"

Show:
- vote percentage;
- number of votes;
- result;
- optional user prediction accuracy.

Avoid manipulative or inflammatory wording.

---

# D43. TICKER SOURCE OF TRUTH

Ticker reads from the live-event data domain.

Never use separate hardcoded arrays on different pages.

Pages can filter the same event stream.

---

# D44. LIVE TICKER FAILURE MODES

If live provider is delayed:
- show last updated time;
- don't display stale information as current;
- mark data as delayed where needed.

If no data:
"Live scores temporarily unavailable."

Do not invent a score.

---

# D45. SPORTS HUBS

Every sport hub should contain:
1. Hero
2. Play Today
3. Live
4. Flagship games
5. Career/Manager
6. Conquest
7. Draft
8. Quick games
9. All games
10. FAQ/SEO content

---

# D46. GAME PAGE SEO TEMPLATE

Title:
"[Game Name] — Free [Sport] Game | DoUKnowBall"

Description:
"Play [Game Name], a free [sport] game on DoUKnowBall..."

H1:
Game name.

Content:
- short introduction;
- how to play;
- scoring;
- game area;
- related games.

Do not repeat the same generic paragraph across every game.

---

# D47. STRUCTURED DATA

Where appropriate, use valid structured data for:
- WebSite;
- BreadcrumbList;
- WebApplication/Game where supported;
- Article for genuine articles;
- FAQ only where page visibly contains the content and current search guidelines permit/use it.

Never mark up fake reviews or fake ratings.

---

# D48. INTERNAL LINKING

Every game page should link to:
- sport hub;
- related games;
- flagship game;
- career/manager game;
- daily games.

Every orphan page should be investigated.

---

# D49. PERFORMANCE BUDGET

Set budgets for:
- JavaScript shipped on homepage;
- image size;
- font count;
- API calls;
- layout shift;
- main-thread work.

Heavy engines should be dynamically imported.

---

# D50. GAME ENGINE CODE SPLIT

Example:
Homepage imports only:
- shared shell;
- profile preview;
- ticker;
- light game cards.

Opening Soccer Career loads:
- career engine;
- soccer data;
- career UI;
- animation assets.

Opening Club Manager loads:
- manager engine;
- competition engine;
- finance engine;
- transfer engine.

---

# D51. ACCESSIBILITY ACCEPTANCE

Each game must support:
- keyboard where logically possible;
- labels;
- focus;
- reduced motion;
- accessible errors;
- readable text;
- touch targets.

For fast reflex games, provide a non-reflex alternative only where feasible so the experience is not inaccessible by design.

---

# D52. MODERATION SYSTEM

User content requiring moderation:
- usernames;
- custom bios;
- team names;
- club names;
- chat/messages if later added;
- public league names;
- shared text.

Moderation layers:
1. local filter;
2. backend validation;
3. report queue;
4. admin override.

Avoid automatically censoring ordinary sports words just because a substring resembles profanity.

---

# D53. RESERVED NAMES

Protect names such as:
- admin;
- moderator;
- support;
- DoUKnowBall;
- system;
- official;
- verified.

Also protect obvious impersonation patterns.

---

# D54. FRIEND SYSTEM

Start with:
- friend request;
- accept;
- decline;
- remove;
- block.

Later:
- follow;
- mute;
- direct challenge.

Never expose private account information.

---

# D55. BLOCKING

Blocked users:
- cannot challenge;
- cannot follow;
- cannot send interactions;
- do not appear in friend surfaces.

---

# D56. NOTIFICATION SYSTEM

Types:
- streak reminder;
- challenge;
- friend request;
- achievement;
- dynasty event;
- transfer offer;
- career event.

Allow per-category preferences.

Do not spam.

---

# D57. SAVE UI

"My Saves" should show:
- game;
- save name;
- club/player;
- season;
- last played;
- progress;
- last result.

Actions:
- Continue;
- Rename;
- Duplicate;
- Archive;
- Delete.

Delete must require confirmation.

---

# D58. SAVE RECOVERY

For long-form sims:
- maintain last good state;
- atomic write;
- version number;
- backup state;
- rollback on corruption.

Never overwrite the previous good save until the new save validates.

---

# D59. GAME ROUTING

All game routes should be canonical.

Avoid duplicate routes:
- /game/name
- /games/name
- /play/name

Choose one canonical structure and redirect others.

---

# D60. ANALYTICS DASHBOARD

Admin metrics:
- DAU;
- WAU;
- MAU;
- games/user;
- session length;
- retention;
- completion;
- abandon;
- share rate;
- account conversion;
- save continuation;
- report rate;
- error rate.

Per game:
- starts;
- completions;
- average score;
- average time;
- repeat plays;
- retention.

---

# D61. FLAGSHIP GAME KPIs

Club Manager:
- save starts;
- saves continued;
- seasons completed;
- average save age;
- return rate.

Soccer Career:
- career starts;
- careers completed;
- average seasons;
- interactive drill completion.

Daily games:
- daily participants;
- next-day return;
- share rate.

---

# D62. GAME EXPERIMENTATION

A/B test:
- home page ordering;
- CTA text;
- game preview;
- instruction wording;
- result screen;
- share CTA.

Do not A/B test core scoring randomly on the same leaderboard season unless the experience is carefully segmented.

---

# D63. DESIGN SYSTEM

Define:
- typography;
- spacing;
- card radius;
- buttons;
- chips;
- tables;
- tabs;
- modal;
- tooltips;
- stat blocks;
- badges;
- status colors;
- animation timing.

Create reusable components rather than page-specific styles.

---

# D64. SPORTS VISUAL LANGUAGE

Use sport-specific accents:
- soccer;
- basketball;
- football;
- baseball;
- hockey;
- WNBA;
- college;
- racing;
- tennis;
- golf.

Keep the core brand consistent.

---

# D65. ICONOGRAPHY

Use a single icon family.

Do not mix unrelated icon styles.

Icons must have labels/tooltips when their meaning is not obvious.

---

# D66. TABLE DESIGN

Tables should:
- align numeric columns;
- keep headers clear;
- support horizontal scrolling on mobile;
- highlight relevant row;
- show current status;
- avoid excessive abbreviation.

---

# D67. MATCH CENTER MOBILE

Mobile layout:
- scoreboard;
- timeline;
- key stats;
- lineup;
- substitutions;
- tabs.

Avoid squeezing 20 columns onto a phone.

---

# D68. CLUB MANAGER MOBILE

Use:
- bottom navigation;
- sticky action area;
- expandable cards;
- tabs for dense data.

Do not simply shrink a desktop spreadsheet.

---

# D69. PLAYER PROFILE COMPONENT

Common player card:
- avatar/image;
- name;
- team;
- position;
- age;
- rating;
- status;
- country;
- quick stats.

Click opens details.

Used everywhere.

---

# D70. TEAM PROFILE COMPONENT

Common team card:
- crest;
- name;
- country;
- league;
- record;
- current form;
- key players.

---

# D71. FLAG COMPONENT

One reusable CountryFlag component.
Inputs:
- country code;
- country name;
- size;
- show name;
- accessibility text.

Never reimplement flags differently per page.

---

# D72. PLAYER POSITION COMPATIBILITY

Store:
- primary position;
- secondary positions;
- historic positions;
- strict/permissive mode.

Strict games use primary/verified secondary.
Permissive fantasy games may allow configurable compatibility.

---

# D73. PLAYER ELIGIBILITY

Eligibility must be computed from:
- sport;
- era;
- team;
- position;
- activity status;
- game-specific restrictions.

This avoids stale or impossible options.

---

# D74. CURRENT-ERA ROSTER POLICY

Games using current rosters must have:
- refresh date;
- source version;
- effective date.

Historical games should never pull current roster accidentally.

---

# D75. SPORTS DATA FALLBACKS

If data missing:
- use cached verified data;
- show stale marker where appropriate;
- do not replace with made-up data.

---

# D76. COMPETITION RULE TEST SUITE

Test:
- number of teams;
- number of rounds;
- qualification;
- tiebreakers;
- home/away;
- knockout;
- advancement;
- elimination.

Create fixture-based test files for known historical seasons.

---

# D77. FOOTBALL COMPETITION EXAMPLES

At minimum, verify representative:
- old Champions League group format;
- modern Champions League league phase;
- Europa League group era;
- modern Europa league phase;
- domestic league;
- domestic cup;
- promotion/relegation;
- two-legged knockout.

---

# D78. FOOTBALL SUPER-LEAGUE / CUSTOM LEAGUE

Custom mode should let users:
- move clubs between competitions;
- set competition size;
- set schedule;
- set points;
- set qualification;
- set relegation;
- choose cup;
- choose transfer rules.

God mode should allow:
- free transfers;
- edited rosters;
- custom league structure;
- custom money.

---

# D79. ERA SELECTOR

UI:
- Current
- Historical
- Custom

Historical selector:
- 2000s
- 2010s
- 2020s
- specific season.

Warn:
"Data depth varies by era."

Never silently substitute current data.

---

# D80. CLUB MANAGER ACADEMY LOOP

1. Scout region.
2. Generate prospects.
3. View ranges.
4. Invite.
5. Evaluate.
6. Sign.
7. Develop.
8. Promote/loan/sell.
9. Track growth.

Potential should be a range until enough scouting is performed.

---

# D81. YOUTH GENERATION

Generated fictional prospects should:
- have unique IDs;
- have generated names;
- have age;
- position;
- personality;
- ability range;
- potential range;
- development traits.

Never imply a generated player is a real person.

---

# D82. STAFF MARKET

At season/month boundaries:
- staff can receive offers;
- free agents enter pool;
- salaries update;
- reputation changes.

---

# D83. MANAGER MARKET

Managers have:
- reputation;
- tactical preferences;
- salary expectations;
- club preferences;
- career history.

AI clubs hire managers based on fit.

---

# D84. CAREER RETIREMENT

Retirement can result from:
- age;
- repeated injury;
- choice;
- low ability;
- reputation;
- offers.

Generate:
- retirement article;
- legacy;
- career statistics;
- honors.

---

# D85. SOCCER CAREER LIFE EVENTS

Possible events:
- family event;
- friendship;
- media scandal;
- endorsement;
- injury;
- transfer rumor;
- manager conflict;
- fan support;
- national-team selection;
- financial decision.

Every event must have:
- trigger;
- options;
- consequences;
- cooldown where needed.

---

# D86. LIFE-CHOICE SAFETY

Avoid instructional content about illegal drugs or harmful self-injury.
Use responsible framing and consequences.
Do not make dangerous behavior a required optimal strategy.

---

# D87. CAREER FAME

Fame affects:
- sponsors;
- media attention;
- fan expectations;
- transfer interest;
- scrutiny.

Fame can increase risk of negative headlines.

---

# D88. CAREER SOCIAL MEDIA

Use fictional social-media framing.
Examples:
- fans praising;
- fans criticizing;
- teammate reactions;
- transfer rumors.

Do not fabricate statements from real people and present them as actual quotes.

---

# D89. CAREER BRAND

Player can pursue:
- sponsorship;
- boots;
- apparel;
- social content;
- business investments.

Use fictional sponsor companies unless licensed.

---

# D90. PLAYER CAREER LEGACY

At retirement:
- games;
- goals;
- assists;
- trophies;
- awards;
- clubs;
- national team;
- wealth;
- fan reputation;
- rivalries.

Generate a career summary.

---

# D91. COLLEGE DYNASTY ATMOSPHERE

Track:
- rivalry intensity;
- home field;
- student enthusiasm;
- blackout/whiteout event;
- attendance;
- donor interest;
- media interest.

Atmosphere should be a modifier with visible explanation.

---

# D92. COLLEGE RECRUITING

Recruit profiles:
- stars;
- position;
- region;
- academics;
- interest;
- NIL expectations;
- development;
- personality.

User can target:
- region;
- position;
- scheme fit;
- star threshold.

---

# D93. CFB CUSTOM SCHEDULE

Allow:
- protected rivalries;
- conference games;
- non-conference;
- strength of schedule;
- future opponents.

Avoid creating impossible schedules for the configured rules.

---

# D94. COLLEGE TV RIGHTS

Fictionalized network/media partners:
- revenue;
- exposure;
- game windows;
- recruiting boost;
- conflict.

Use fictional network names when not licensed.

---

# D95. ACADEMIC SYSTEM

Academic GPA/eligibility can exist as a fictional game system.
Use nonjudgmental framing.
Do not model real students.

---

# D96. NBA CAREER INTERACTIVE LOOP

Season:
- training;
- games;
- role;
- coach conversations;
- contracts;
- media;
- endorsements.

Interactive moments:
- shooting;
- defense;
- dribble;
- pick-and-roll.

---

# D97. NFL CAREER INTERACTIVE LOOP

Interactive:
- quarterback reads;
- throwing;
- route timing;
- catching;
- defensive positioning;
- kicking.

Career:
- high school/college entry;
- draft;
- roster;
- contracts;
- injuries;
- playoffs;
- legacy.

---

# D98. MLB CAREER INTERACTIVE LOOP

Interactive:
- batting;
- pitching;
- fielding;
- running.

Career:
- draft;
- minors;
- call-up;
- contracts;
- arbitration/free agency;
- awards.

---

# D99. NHL CAREER INTERACTIVE LOOP

Interactive:
- skating;
- shooting;
- passing;
- defense;
- goalie.

Career:
- draft;
- minors;
- contracts;
- trades;
- playoffs;
- awards.

---

# D100. WNBA CAREER

Build same universal career engine with WNBA-specific:
- roster rules;
- schedule;
- draft;
- contracts;
- travel;
- playoffs;
- player awards.

Rules must be versioned by season.

---

# D101. UNIVERSAL DRAFT ENGINE UI

Header:
- round;
- pick;
- time;
- budget.

Main:
- player pool;
- filters;
- search;
- sort.

Sidebar:
- roster.

Footer:
- confirm pick.

---

# D102. CARD ENGINE

Cards can have:
- sport;
- player;
- season;
- type;
- rarity;
- rating;
- image;
- serial/cosmetic ID.

Collection:
- owned;
- duplicates;
- set completion.

No cash-value claims.

---

# D103. PACK ENGINE

Pack:
- number of cards;
- rarity probabilities;
- guaranteed slot types.

Server generates pack results.
Client only animates the server result.

---

# D104. PACK ANIMATION

Sequence:
1. pack enters;
2. user opens;
3. background;
4. card silhouette;
5. rarity cue;
6. reveal;
7. player;
8. stats;
9. add to collection.

Do not let animation determine rewards.

---

# D105. SPORTS BINGO SERVER LOGIC

Board generated server-side.

Each player sees:
- puzzle ID;
- board;
- pack seed.

Results checked server-side.

---

# D106. CONQUEST DATA MODEL

Map:
- map_id
- region polygons
- team ownership
- adjacency graph
- start_state
- season
- mode

Each battle:
- attacker;
- defender;
- result;
- territory;
- timestamp.

---

# D107. CONQUEST MAP UI

Map actions:
- zoom;
- pan;
- hover;
- tap;
- filter;
- timeline;
- team legend.

Mobile:
- pinch zoom;
- tap territory;
- bottom-sheet details.

---

# D108. CONQUEST MAP HISTORY

Add:
- current map;
- round history;
- turn replay;
- "how we got here."

That creates shareable stories.

---

# D109. CONQUEST MULTIPLAYER

Each player:
- claims a team;
- receives territory;
- turn/battle;
- winner takes territory.

Host controls:
- map;
- rules;
- simulation speed;
- team selection.

---

# D110. PRIVATE ROOM ARCHITECTURE

Room:
- room_id;
- join_code;
- host_id;
- mode;
- config;
- status;
- players;
- created_at;
- started_at;
- ended_at.

Use expiring codes.

---

# D111. MULTIPLAYER ANTI-CHEAT

Server controls:
- timers;
- picks;
- budgets;
- player availability;
- game result.

Client is presentation only.

---

# D112. CHAT SAFETY

When chat is added:
- report;
- block;
- mute;
- profanity filter;
- rate limit;
- age-appropriate moderation.

The product can function without open chat initially; asynchronous challenges are safer and simpler.

---

# D113. SPORTS PARTY ARCHITECTURE

Mini-games must plug into shared:
- score;
- player;
- timer;
- result;
- leaderboard.

This allows 20 mini-games without a unique platform per mini-game.

---

# D114. TOWER DEFENSE ARCHITECTURE

Entities:
- hero;
- tower;
- enemy;
- wave;
- map;
- projectile;
- ability;
- modifier;
- reward.

Heroes use fictionalized archetypes unless licensing exists.

---

# D115. TOWER DEFENSE GAME LOOP

1. Select map.
2. Pick heroes.
3. Place.
4. Start wave.
5. Earn currency.
6. Upgrade.
7. Use ability.
8. Survive boss.
9. Earn rewards.
10. Unlock next.

---

# D116. SPORTS EMPIRE ARCHITECTURE

Tabs:
- Club;
- Squad;
- Academy;
- Training;
- Scouting;
- Facilities;
- Finance;
- Sponsors;
- Packs;
- Matches;
- World.

Idle timers should be server-authoritative enough to prevent clock manipulation.

---

# D117. SPORTS EMPIRE ECONOMY

Sources:
- matches;
- sponsors;
- facilities;
- quests;
- achievements.

Sinks:
- upgrades;
- training;
- scouting;
- packs;
- cosmetics.

Avoid runaway exponential growth without progression gates.

---

# D118. USER CUSTOMIZATION

Avatar:
- face;
- hair;
- facial hair;
- skin tone;
- eyes;
- clothing;
- accessories;
- colors.

Do not imply the avatar is a real athlete.

---

# D119. ANIMATED PROFILE

Possible:
- idle breathing;
- blink;
- expression;
- small celebration;
- sport-themed pose.

Respect reduced-motion.

---

# D120. PROFILE COSMETICS

Unlock:
- banners;
- frames;
- titles;
- badges;
- backgrounds.

Earn through gameplay.

---

# D121. SHARING

Every result should provide:
- short text;
- image/card;
- deep link.

Shared URL should open the game result or challenge without exposing private data.

---

# D122. INVITE FLOW

When user shares:
"Beat my score."

Recipient:
- lands on result;
- sees challenge;
- plays;
- gets own result;
- can challenge sender.

---

# D123. FRIEND LEADERBOARD

Sort by:
- today;
- week;
- season;
- game.

Show:
- avatar;
- safe username;
- score;
- rank change.

---

# D124. PLATFORM SEARCH

Search:
- games;
- sports;
- players;
- teams;
- leagues.

Never expose unfiltered admin data.

---

# D125. SPORT SEARCH

Examples:
"NBA"
→ NBA games, teams, players, news.

"Barcelona"
→ club page, relevant games, saves if user owns them, historical content.

---

# D126. NOTIFICATION PREFERENCES

Categories:
- daily;
- streak;
- challenges;
- saves;
- transfers;
- career;
- friends.

Allow:
- in-app;
- push where implemented;
- email only if user opts in and compliant.

---

# D127. LEGAL/SAFETY CHECKPOINTS

Before launching:
- privacy policy current;
- terms current;
- cookie/consent behavior reviewed as applicable;
- rights/assets checked;
- ad placements checked;
- moderation checked;
- data retention reviewed.

For material commercial growth, obtain professional legal review.

---

# D128. RIGHTS-AWARE ASSET PIPELINE

Every image/asset in the repository should have:
- source;
- license/right;
- attribution if needed;
- allowed usage;
- expiration if applicable.

Do not scrape random athlete images from search results.

---

# D129. BRAND SAFETY

Avoid:
- defamatory fictional headlines about real athletes;
- fake quotes;
- fake allegations;
- fake endorsements;
- political statements attributed to athletes;
- sexualized content involving athletes;
- gambling-oriented promotion.

---

# D130. SAFER REAL-PERSON GAME DESIGN

Use real statistics and career facts for knowledge games where lawful.

For creative simulation:
- clearly label fictional/generated scenarios;
- don't attribute invented quotes or behavior to a real person.

---

# D131. GAME DESIGN SCORECARD

Before shipping:
- Fun
- Clarity
- Depth
- Replayability
- Data accuracy
- Performance
- Mobile
- Accessibility
- Social potential
- SEO value
- Monetization compatibility

Score each 1–5.
A game should not ship if critical categories are below threshold unless explicitly experimental.

---

# D132. FEATURE REVIEW

Every proposed feature gets:
- user value;
- technical complexity;
- reusable benefit;
- risk;
- priority.

Prioritize high-value reusable infrastructure.

---

# D133. BUG PRIORITY

P0:
- data corruption;
- lost saves;
- security;
- wrong results globally;
- payment issue if introduced.

P1:
- major game broken;
- leaderboard broken;
- ticker wrong;
- competition wrong.

P2:
- game-specific bug;
- visual bug;
- minor scoring edge case.

P3:
- polish.

---

# D134. QA TEST MATRIX FOR GAMES

Test:
- first visit;
- returning user;
- logged out;
- logged in;
- mobile;
- desktop;
- slow connection;
- refresh;
- tab close;
- duplicate click;
- back button;
- invalid input;
- max input;
- empty input;
- edge-case answer;
- data source unavailable.

---

# D135. QA TEST MATRIX FOR SIMULATIONS

Test:
- new save;
- load;
- advance one day;
- advance week;
- advance season;
- transfer window open;
- transfer window closed;
- contract expiry;
- injury;
- retirement;
- promotion;
- relegation;
- cup advancement;
- user firing;
- staff firing;
- financial deficit;
- negative budget;
- corrupted state recovery.

---

# D136. QA TEST MATRIX FOR HISTORICAL MODES

Test representative:
- 2000s;
- 2010s;
- 2020s;
- current.

Verify:
- clubs;
- rosters;
- rules;
- competition;
- managers;
- transfers;
- schedule.

---

# D137. QA TEST MATRIX FOR LEADERBOARDS

Test:
- tie;
- same score;
- duplicate result;
- replay;
- midnight;
- timezone;
- invalid score;
- blocked user;
- renamed user;
- deleted user.

---

# D138. QA TEST MATRIX FOR TICKER

Test:
- upcoming;
- live;
- halftime;
- final;
- postponed;
- cancelled;
- overtime;
- extra time;
- delayed data;
- provider outage.

---

# D139. QA TEST MATRIX FOR ADS

Test:
- ad loading;
- no ad;
- slow ad;
- mobile;
- gameplay;
- result screen.

Verify:
- no overlap;
- no accidental click path;
- no ad-looking-like-game-control;
- no pop-up blocking gameplay.

---

# D140. QA TEST MATRIX FOR SEO

For each indexable page:
- title;
- description;
- H1;
- canonical;
- robots;
- sitemap;
- internal links;
- render;
- content;
- no duplicate issue.

---

# D141. RELEASE NOTES

Every meaningful release should include:
- what changed;
- games affected;
- data changes;
- bug fixes;
- known issues.

The public What's New page should become a polished changelog rather than an unstructured dump.

---

# D142. OWNER ADMIN DASHBOARD — DAILY VIEW

Show:
- site health;
- active users;
- games today;
- live events;
- error rate;
- report queue;
- data freshness;
- save errors;
- leaderboard anomalies.

---

# D143. OWNER DASHBOARD — GAME VIEW

For each game:
- starts;
- finishes;
- completion rate;
- average time;
- share rate;
- error rate;
- reports;
- most common report reason;
- data freshness.

---

# D144. OWNER DASHBOARD — DATA VIEW

Show:
- imports today;
- failures;
- conflicts;
- stale data;
- invalid records;
- last successful update by sport.

---

# D145. OWNER DASHBOARD — MONETIZATION VIEW

Where applicable:
- impressions;
- page RPM;
- session RPM;
- revenue;
- ad viewability;
- ad error rate.

Do not display sensitive ad data to ordinary users.

---

# D146. PRODUCT DEVELOPMENT RULE

Whenever a bug is discovered in one game and the pattern could exist elsewhere:
- fix the root shared component;
- add a regression test;
- audit sibling games.

Example:
If one game has wrong country flag rendering, inspect the shared flag component rather than patching only one page.

---

# D147. PRODUCT DEVELOPMENT RULE — NO FAKE DEPTH

Do not add:
- meaningless menus;
- decorative attributes;
- buttons that do nothing;
- fake simulations;
- fake negotiations;
- fake statistics.

Every feature must affect the world or be clearly cosmetic.

---

# D148. PRODUCT DEVELOPMENT RULE — EXPLAIN CONSEQUENCES

If user action changes:
- morale;
- finance;
- tactics;
- board;
- fans;
- reputation;

show enough feedback that the user can understand the cause.

---

# D149. PRODUCT DEVELOPMENT RULE — PLAYER AGENCY

When practical, allow:
- multiple solutions;
- custom strategies;
- different routes to success.

Do not make every management mode a single correct path.

---

# D150. PRODUCT DEVELOPMENT RULE — FAIL FOR A REASON

If a deal fails:
show:
- value too low;
- player not interested;
- budget insufficient;
- role unacceptable;
- club refuses.

Don't simply say:
"Rejected."

---

# D151. PRODUCT DEVELOPMENT RULE — DIFFICULTY

Difficulty can modify:
- information certainty;
- opponent intelligence;
- time;
- budget;
- injury;
- simulation volatility.

Don't simply lower the score multiplier.

---

# D152. PRODUCT DEVELOPMENT RULE — NEVER PUNISH REFRESH

A normal browser refresh should not:
- delete save;
- change daily puzzle;
- duplicate result;
- reset account.

---

# D153. PRODUCT DEVELOPMENT RULE — SERVER TIME

Critical timing uses server UTC time:
- daily reset;
- transfer windows;
- auctions;
- room timers;
- idle rewards.

---

# D154. PRODUCT DEVELOPMENT RULE — MOBILE FIRST FOR GAMES

For interactive games:
- test touch early;
- use larger hitboxes;
- avoid hover dependency;
- account for browser safe areas;
- prevent accidental page scrolling during gestures.

---

# D155. PRODUCT DEVELOPMENT RULE — ACCESSIBILITY FIRST

Do accessibility while building the component, not after launch.

---

# D156. PRODUCT DEVELOPMENT RULE — TEST THE HAPPY PATH AND THE WEIRD PATH

For every feature ask:
- What happens when everything works?
- What happens when data is missing?
- What happens when user clicks twice?
- What happens when they leave?
- What happens when they return?
- What happens when the season changes?
- What happens when the source changes?

---

# D157. FIRST IMPLEMENTATION MILESTONE

The first milestone should produce a stable platform shell:

- shared header;
- ticker;
- footer;
- accounts;
- profiles;
- leaderboard;
- achievements;
- reports;
- game registry;
- data validation;
- analytics;
- SEO framework.

It should not require building another game.

---

# D158. SECOND IMPLEMENTATION MILESTONE

Upgrade Club Manager.

Success means:
- player/team data correct;
- historical save;
- transfers;
- contracts;
- staff;
- board;
- finance;
- competition;
- tactics;
- match center;
- save/load.

---

# D159. THIRD IMPLEMENTATION MILESTONE

Upgrade Soccer Career.

---

# D160. FOURTH IMPLEMENTATION MILESTONE

Create shared Conquest, Draft, Card and Interactive Arcade engines.

---

# D161. FIFTH IMPLEMENTATION MILESTONE

Expand into:
- WNBA;
- other sports;
- multiplayer;
- Sports Empire;
- Tower Defense;
- Sports Party.

---

# D162. SIXTH IMPLEMENTATION MILESTONE

Personalization and social:
- friends;
- challenges;
- private leagues;
- seasonal events;
- Hall of Fame.

---

# D163. FINAL PRODUCT QUALITY GATE

Before calling the platform "mature":
- no widespread data errors;
- no recurring save corruption;
- no major leaderboard abuse;
- live ticker reliable;
- all active games have help/report/scoring;
- flagship simulations have real depth;
- mobile is first-class;
- SEO pages are useful;
- ads don't interfere with gameplay;
- moderation works;
- admin tools work;
- observability works.

---

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

