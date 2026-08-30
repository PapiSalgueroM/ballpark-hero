<!-- spec-part-header -->
> Part 1 of 29 of the Master Build Specification, version 1.0, August 2026.
> Covers the title block and 0 to 5. Index: `docs/spec/README.md`. next `01-data-model-and-quality.md`.
>
> The part files hold the spec verbatim. Concatenated in index order they reproduce
> the original document byte for byte, and `scripts/simSpecSplit.mjs` proves it on
> every run. Edit the spec here, never by keeping a second copy somewhere else.
<!-- /spec-part-header -->

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
