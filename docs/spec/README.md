# The Master Build Specification, split for reading

This directory is the owner's Master Build Specification, version 1.0 of August 2026,
cut into 29 parts so a session can load the one section it needs instead of
7691 lines of everything. The operating contract asks for exactly this split.

**Nothing here is a summary.** Every part holds the spec verbatim, and concatenating the
parts in the order below reproduces the original document byte for byte. Each part carries
a short header between `<!-- spec-part-header -->` and `<!-- /spec-part-header -->` markers, which the check
strips before comparing, so the header is the only text in this directory that the owner
did not write.

## Before you claim spec work

Read `docs/SPEC-RECONCILIATION.md` first. It classifies all 361 sections against the round
history (38 done, 187 partial, 96 new, 32 decided, 10 constrained by standing law), and its
section numbers are the same numbers used here. The spec is the north star, not the queue:
the live queue is `docs/WORKBOARD.md`, and `docs/OPERATING-CONTRACT-2026-08.md` beats this
document on what to build and in what order.

Standing law also beats the spec where they disagree. Two known cases, both recorded in
`docs/OWNER-DIRECTIVES-2026-08.md`: the site is free forever, which overrides the spec's
premium mentions, and the casino idea is parked.

## The parts

| File | Covers | Sections | Count |
|---|---|---|---|
| [`00-title-and-directive.md`](./00-title-and-directive.md) | Title, executive directive, vision, strategy, repository rule | the title block and 0 to 5 | 7 |
| [`01-data-model-and-quality.md`](./01-data-model-and-quality.md) | Shared data model, data quality, country display | 6 to 8 | 3 |
| [`02-platform-shell.md`](./02-platform-shell.md) | Live ticker, site layout, home page, identity, profile | 9 to 13 | 5 |
| [`03-progression-and-game-contract.md`](./03-progression-and-game-contract.md) | Ball IQ, streaks, achievements, game contract, help, report issue | 14 to 19 | 6 |
| [`04-analytics-seo-and-ads.md`](./04-analytics-seo-and-ads.md) | Analytics, SEO and indexing, indexing audit, AdSense, casino decision | 20 to 24 | 5 |
| [`05-club-manager.md`](./05-club-manager.md) | Club Manager 2.0 end to end, through competitions and brackets | 25 to 47 | 23 |
| [`06-soccer-career.md`](./06-soccer-career.md) | Soccer Career 2.0, development, drills, life, brand, media, international | 48 to 56 | 9 |
| [`07-dynasty-and-front-office.md`](./07-dynasty-and-front-office.md) | College dynasty, draft night, the four front offices, WNBA | 57 to 64 | 8 |
| [`08-conquest-and-flagship-games.md`](./08-conquest-and-flagship-games.md) | Conquest, NBA Stat Line, draft, auction, bingo, rarity, XI games, Rebuild | 65 to 79 | 15 |
| [`09-tycoon-and-arcade.md`](./09-tycoon-and-arcade.md) | Stadium tycoon, arcade engine, the five sport arcades, party, tower defense, rooms | 80 to 92 | 13 |
| [`10-design-performance-and-mobile.md`](./10-design-performance-and-mobile.md) | Design system, performance, mobile, accessibility, animation, card art | 93 to 99 | 7 |
| [`11-social-daily-and-leaderboards.md`](./11-social-daily-and-leaderboards.md) | News, social layer, share cards, daily engine, leaderboards, points, difficulty | 100 to 107 | 8 |
| [`12-puzzle-games-and-data-rules.md`](./12-puzzle-games-and-data-rules.md) | Puzzle game specs, terminology, historical eras, live versus simulated data | 108 to 118 | 11 |
| [`13-legal-admin-and-testing.md`](./13-legal-admin-and-testing.md) | Legal safeguards, likeness, AI policy, admin console, testing, errors, saves, security | 119 to 131 | 13 |
| [`14-economy-and-events.md`](./14-economy-and-events.md) | Virtual economy, no pay to win, challenges, private leagues, seasons, hall of fame | 132 to 139 | 8 |
| [`15-new-game-ideas.md`](./15-new-game-ideas.md) | The twelve new game ideas, Deadline Day through Career Rescue | 140 to 151 | 12 |
| [`16-discovery-and-data-operations.md`](./16-discovery-and-data-operations.md) | Discovery, personalization, refresh pipeline, databases, scheduling, releases | 152 to 159 | 8 |
| [`17-roadmap-and-quality-bar.md`](./17-roadmap-and-quality-bar.md) | Priority matrix, the 90 day, 6 month and 12 month targets, quality bar, philosophy | 160 to 178 | 19 |
| [`18-appendices-a-to-c.md`](./18-appendices-a-to-c.md) | Appendix A priority phrases, B master checklist, C sources | the title block and APPENDIX A to APPENDIX C | 4 |
| [`19-blueprint-architecture.md`](./19-blueprint-architecture.md) | Appendix D opens: domain model, database, API, flags, registry, puzzles, UI state | APPENDIX D to D20 | 21 |
| [`20-blueprint-simulation-and-club-manager.md`](./20-blueprint-simulation-and-club-manager.md) | World and match simulation, animation, Club Manager internals, media, ticker truth | D21 to D44 | 24 |
| [`21-blueprint-seo-and-frontend.md`](./21-blueprint-seo-and-frontend.md) | Hubs, SEO templates, structured data, budgets, moderation, friends, saves, design | D45 to D68 | 24 |
| [`22-blueprint-components-and-data.md`](./22-blueprint-components-and-data.md) | Shared components, eligibility, roster policy, competition tests, era selector, markets | D69 to D83 | 15 |
| [`23-blueprint-careers.md`](./23-blueprint-careers.md) | Retirement, life events, fame, brand, legacy, college depth, the five career loops | D84 to D100 | 17 |
| [`24-blueprint-cards-conquest-and-multiplayer.md`](./24-blueprint-cards-conquest-and-multiplayer.md) | Draft UI, cards and packs, bingo server, conquest, multiplayer, party, tower defense, empire | D101 to D117 | 17 |
| [`25-blueprint-profile-social-and-safety.md`](./25-blueprint-profile-social-and-safety.md) | Customization, cosmetics, sharing, invites, search, notifications, legal and brand safety | D118 to D130 | 13 |
| [`26-blueprint-quality-and-qa.md`](./26-blueprint-quality-and-qa.md) | Design scorecard, feature review, bug priority, the seven QA matrices, release notes, owner dashboards | D131 to D145 | 15 |
| [`27-blueprint-rules-and-milestones.md`](./27-blueprint-rules-and-milestones.md) | The eleven product development rules and the six implementation milestones | D146 to D163 | 18 |
| [`28-appendices-e-to-q.md`](./28-appendices-e-to-q.md) | Appendix E through Q: roadmap, Stat Line spec, positions, standards, operating rules, do not ship, success | APPENDIX E to APPENDIX Q | 13 |

## What proves this is still the spec

`node scripts/simSpecSplit.mjs` reads every part, strips the headers, concatenates them in
manifest order and compares the SHA-256 against the one recorded in `MANIFEST.json`. It also
checks that the index above lists every part, that no part is missing from the index, and that
every section heading in the files matches the manifest. `SPEC_SPLIT_CONTROL=drop` deletes a
section in memory and the check must go red, which is what makes a green run mean something.

To rebuild the single file version, concatenate the part bodies in the order above with one
newline between them. The check does exactly that, so read it rather than trusting this
paragraph.

## Section lookup

Every heading, reproduced exactly as the owner wrote it so that searching for a heading
finds it here. That is why this one table carries punctuation the repo's style rules keep
out of anything we write ourselves: it is a quotation, and the check above compares these
rows against the headings in the files, so editing them breaks the build.

| Section | File |
|---|---|
| DoUKnowBall — Master Build Specification | [`00-title-and-directive.md`](./00-title-and-directive.md) |
| 0. EXECUTIVE DIRECTIVE | [`00-title-and-directive.md`](./00-title-and-directive.md) |
| 1. PRODUCT VISION | [`00-title-and-directive.md`](./00-title-and-directive.md) |
| 2. PRODUCT NORTH STAR | [`00-title-and-directive.md`](./00-title-and-directive.md) |
| 3. CURRENT-PRODUCT BASELINE AND OWNER REQUIREMENTS | [`00-title-and-directive.md`](./00-title-and-directive.md) |
| 4. DEVELOPMENT STRATEGY | [`00-title-and-directive.md`](./00-title-and-directive.md) |
| 5. REPOSITORY-FIRST EXECUTION RULE | [`00-title-and-directive.md`](./00-title-and-directive.md) |
| 6. SHARED DATA MODEL | [`01-data-model-and-quality.md`](./01-data-model-and-quality.md) |
| 7. DATA QUALITY SYSTEM | [`01-data-model-and-quality.md`](./01-data-model-and-quality.md) |
| 8. COUNTRY AND REGION DISPLAY | [`01-data-model-and-quality.md`](./01-data-model-and-quality.md) |
| 9. LIVE SPORTS TICKER | [`02-platform-shell.md`](./02-platform-shell.md) |
| 10. GLOBAL SITE LAYOUT | [`02-platform-shell.md`](./02-platform-shell.md) |
| 11. HOME PAGE | [`02-platform-shell.md`](./02-platform-shell.md) |
| 12. USER IDENTITY SYSTEM | [`02-platform-shell.md`](./02-platform-shell.md) |
| 13. PROFILE SYSTEM | [`02-platform-shell.md`](./02-platform-shell.md) |
| 14. BALL IQ | [`03-progression-and-game-contract.md`](./03-progression-and-game-contract.md) |
| 15. STREAK SYSTEM | [`03-progression-and-game-contract.md`](./03-progression-and-game-contract.md) |
| 16. ACHIEVEMENT SYSTEM | [`03-progression-and-game-contract.md`](./03-progression-and-game-contract.md) |
| 17. GLOBAL GAME CONTRACT | [`03-progression-and-game-contract.md`](./03-progression-and-game-contract.md) |
| 18. GAME HELP / QUESTION MARK SYSTEM | [`03-progression-and-game-contract.md`](./03-progression-and-game-contract.md) |
| 19. REPORT ISSUE SYSTEM | [`03-progression-and-game-contract.md`](./03-progression-and-game-contract.md) |
| 20. ANALYTICS | [`04-analytics-seo-and-ads.md`](./04-analytics-seo-and-ads.md) |
| 21. SEO / INDEXING | [`04-analytics-seo-and-ads.md`](./04-analytics-seo-and-ads.md) |
| 22. INDEXING AUDIT | [`04-analytics-seo-and-ads.md`](./04-analytics-seo-and-ads.md) |
| 23. ADSENSE / AD SAFETY | [`04-analytics-seo-and-ads.md`](./04-analytics-seo-and-ads.md) |
| 24. CASINO DECISION | [`04-analytics-seo-and-ads.md`](./04-analytics-seo-and-ads.md) |
| 25. CLUB MANAGER 2.0 — FLAGSHIP SIMULATION | [`05-club-manager.md`](./05-club-manager.md) |
| 26. CLUB MANAGER — SAVE SETUP | [`05-club-manager.md`](./05-club-manager.md) |
| 27. CLUB MANAGER — MANAGER ATTRIBUTES | [`05-club-manager.md`](./05-club-manager.md) |
| 28. MANAGER XP / SKILL TREE | [`05-club-manager.md`](./05-club-manager.md) |
| 29. CLUB MANAGER — STAFF | [`05-club-manager.md`](./05-club-manager.md) |
| 30. CLUB MANAGER — BOARD | [`05-club-manager.md`](./05-club-manager.md) |
| 31. FAN / BOARD / PLAYER SENTIMENT | [`05-club-manager.md`](./05-club-manager.md) |
| 32. FINANCE SYSTEM | [`05-club-manager.md`](./05-club-manager.md) |
| 33. TICKETING / CONCESSIONS / SPONSORS | [`05-club-manager.md`](./05-club-manager.md) |
| 34. FACILITIES | [`05-club-manager.md`](./05-club-manager.md) |
| 35. TRANSFER ENGINE | [`05-club-manager.md`](./05-club-manager.md) |
| 36. FINANCIAL ADVISOR | [`05-club-manager.md`](./05-club-manager.md) |
| 37. SCOUTING | [`05-club-manager.md`](./05-club-manager.md) |
| 38. ACADEMY | [`05-club-manager.md`](./05-club-manager.md) |
| 39. SQUAD PAGE | [`05-club-manager.md`](./05-club-manager.md) |
| 40. TACTICS | [`05-club-manager.md`](./05-club-manager.md) |
| 41. SUBSTITUTIONS | [`05-club-manager.md`](./05-club-manager.md) |
| 42. POSITION CHANGE / TRAINING | [`05-club-manager.md`](./05-club-manager.md) |
| 43. MATCH CENTER | [`05-club-manager.md`](./05-club-manager.md) |
| 44. LIVE MATCH PRESENTATION | [`05-club-manager.md`](./05-club-manager.md) |
| 45. EVENT TIMELINE | [`05-club-manager.md`](./05-club-manager.md) |
| 46. COMPETITIONS ENGINE | [`05-club-manager.md`](./05-club-manager.md) |
| 47. TABLES AND BRACKETS | [`05-club-manager.md`](./05-club-manager.md) |
| 48. SOCCER CAREER 2.0 | [`06-soccer-career.md`](./06-soccer-career.md) |
| 49. PLAYER DEVELOPMENT | [`06-soccer-career.md`](./06-soccer-career.md) |
| 50. INTERACTIVE TRAINING DRILLS | [`06-soccer-career.md`](./06-soccer-career.md) |
| 51. PLAYER LIFE | [`06-soccer-career.md`](./06-soccer-career.md) |
| 52. SPONSORSHIPS / BRAND | [`06-soccer-career.md`](./06-soccer-career.md) |
| 53. MEDIA / HEADLINES | [`06-soccer-career.md`](./06-soccer-career.md) |
| 54. PLAYER RELATIONSHIPS | [`06-soccer-career.md`](./06-soccer-career.md) |
| 55. RIVALRY SYSTEM | [`06-soccer-career.md`](./06-soccer-career.md) |
| 56. INTERNATIONAL CAREER | [`06-soccer-career.md`](./06-soccer-career.md) |
| 57. COLLEGE FOOTBALL DYNASTY 2.0 | [`07-dynasty-and-front-office.md`](./07-dynasty-and-front-office.md) |
| 58. DRAFT NIGHT PRESENTATION | [`07-dynasty-and-front-office.md`](./07-dynasty-and-front-office.md) |
| 59. FRONT OFFICE ENGINE — UNIVERSAL | [`07-dynasty-and-front-office.md`](./07-dynasty-and-front-office.md) |
| 60. NBA FRONT OFFICE | [`07-dynasty-and-front-office.md`](./07-dynasty-and-front-office.md) |
| 61. NFL FRONT OFFICE | [`07-dynasty-and-front-office.md`](./07-dynasty-and-front-office.md) |
| 62. MLB FRONT OFFICE | [`07-dynasty-and-front-office.md`](./07-dynasty-and-front-office.md) |
| 63. NHL FRONT OFFICE | [`07-dynasty-and-front-office.md`](./07-dynasty-and-front-office.md) |
| 64. WNBA EXPANSION | [`07-dynasty-and-front-office.md`](./07-dynasty-and-front-office.md) |
| 65. CONQUEST ENGINE 2.0 | [`08-conquest-and-flagship-games.md`](./08-conquest-and-flagship-games.md) |
| 66. CONQUEST GAMEPLAY | [`08-conquest-and-flagship-games.md`](./08-conquest-and-flagship-games.md) |
| 67. NBA / NFL / MLB / NHL CONQUEST | [`08-conquest-and-flagship-games.md`](./08-conquest-and-flagship-games.md) |
| 68. NBA STAT LINE — NEW FLAGSHIP GAME | [`08-conquest-and-flagship-games.md`](./08-conquest-and-flagship-games.md) |
| 69. UNIVERSAL DRAFT ENGINE | [`08-conquest-and-flagship-games.md`](./08-conquest-and-flagship-games.md) |
| 70. SIGN THE PLAYER — AUCTION REWORK | [`08-conquest-and-flagship-games.md`](./08-conquest-and-flagship-games.md) |
| 71. SPORTS BINGO | [`08-conquest-and-flagship-games.md`](./08-conquest-and-flagship-games.md) |
| 72. SEARCH & DISCARD | [`08-conquest-and-flagship-games.md`](./08-conquest-and-flagship-games.md) |
| 73. PLAYER STOCK MARKET | [`08-conquest-and-flagship-games.md`](./08-conquest-and-flagship-games.md) |
| 74. RARITY | [`08-conquest-and-flagship-games.md`](./08-conquest-and-flagship-games.md) |
| 75. WORLD XI | [`08-conquest-and-flagship-games.md`](./08-conquest-and-flagship-games.md) |
| 76. BUILD YOUR XI | [`08-conquest-and-flagship-games.md`](./08-conquest-and-flagship-games.md) |
| 77. BANKER OFFER / PLAYER DEAL GAMES | [`08-conquest-and-flagship-games.md`](./08-conquest-and-flagship-games.md) |
| 78. REBUILD GAME 2.0 | [`08-conquest-and-flagship-games.md`](./08-conquest-and-flagship-games.md) |
| 79. REBUILD LOOP | [`08-conquest-and-flagship-games.md`](./08-conquest-and-flagship-games.md) |
| 80. STADIUM TYCOON / SPORTS EMPIRE | [`09-tycoon-and-arcade.md`](./09-tycoon-and-arcade.md) |
| 81. SPORTS EMPIRE IDLE LOOP | [`09-tycoon-and-arcade.md`](./09-tycoon-and-arcade.md) |
| 82. INTERACTIVE SPORTS ARCADE ENGINE | [`09-tycoon-and-arcade.md`](./09-tycoon-and-arcade.md) |
| 83. SOCCER ARCADE FLAGSHIP | [`09-tycoon-and-arcade.md`](./09-tycoon-and-arcade.md) |
| 84. BASKETBALL ARCADE | [`09-tycoon-and-arcade.md`](./09-tycoon-and-arcade.md) |
| 85. FOOTBALL ARCADE | [`09-tycoon-and-arcade.md`](./09-tycoon-and-arcade.md) |
| 86. BASEBALL ARCADE | [`09-tycoon-and-arcade.md`](./09-tycoon-and-arcade.md) |
| 87. HOCKEY ARCADE | [`09-tycoon-and-arcade.md`](./09-tycoon-and-arcade.md) |
| 88. SPORTS PARTY | [`09-tycoon-and-arcade.md`](./09-tycoon-and-arcade.md) |
| 89. TOWER DEFENSE — ATHLETE HEROES | [`09-tycoon-and-arcade.md`](./09-tycoon-and-arcade.md) |
| 90. MULTIPLAYER PRIVATE ROOMS | [`09-tycoon-and-arcade.md`](./09-tycoon-and-arcade.md) |
| 91. CROSS-PLATFORM CAREER PIPELINE | [`09-tycoon-and-arcade.md`](./09-tycoon-and-arcade.md) |
| 92. GAME DEPRECATION POLICY | [`09-tycoon-and-arcade.md`](./09-tycoon-and-arcade.md) |
| 93. HOME / GAME DESIGN SYSTEM | [`10-design-performance-and-mobile.md`](./10-design-performance-and-mobile.md) |
| 94. PERFORMANCE | [`10-design-performance-and-mobile.md`](./10-design-performance-and-mobile.md) |
| 95. MOBILE | [`10-design-performance-and-mobile.md`](./10-design-performance-and-mobile.md) |
| 96. ACCESSIBILITY | [`10-design-performance-and-mobile.md`](./10-design-performance-and-mobile.md) |
| 97. ANIMATION SYSTEM | [`10-design-performance-and-mobile.md`](./10-design-performance-and-mobile.md) |
| 98. CARD ART SYSTEM | [`10-design-performance-and-mobile.md`](./10-design-performance-and-mobile.md) |
| 99. SPORTS BINGO + DRAFT + CARDS SHARED DATA | [`10-design-performance-and-mobile.md`](./10-design-performance-and-mobile.md) |
| 100. NEWS ENGINE | [`11-social-daily-and-leaderboards.md`](./11-social-daily-and-leaderboards.md) |
| 101. SOCIAL LAYER | [`11-social-daily-and-leaderboards.md`](./11-social-daily-and-leaderboards.md) |
| 102. SHARE CARDS | [`11-social-daily-and-leaderboards.md`](./11-social-daily-and-leaderboards.md) |
| 103. DAILY GAME ENGINE | [`11-social-daily-and-leaderboards.md`](./11-social-daily-and-leaderboards.md) |
| 104. GLOBAL LEADERBOARD | [`11-social-daily-and-leaderboards.md`](./11-social-daily-and-leaderboards.md) |
| 105. POINT SYSTEM | [`11-social-daily-and-leaderboards.md`](./11-social-daily-and-leaderboards.md) |
| 106. SPORT-SPECIFIC DIFFICULTY | [`11-social-daily-and-leaderboards.md`](./11-social-daily-and-leaderboards.md) |
| 107. QUALITY CONTROL FOR PUZZLES | [`11-social-daily-and-leaderboards.md`](./11-social-daily-and-leaderboards.md) |
| 108. WHO AM I / RODRI-TYPE DATA BUGS | [`12-puzzle-games-and-data-rules.md`](./12-puzzle-games-and-data-rules.md) |
| 109. FOOTLE / CAREER QUIZ / HIGHER-LOWER / CONNECTIONS | [`12-puzzle-games-and-data-rules.md`](./12-puzzle-games-and-data-rules.md) |
| 110. CAREER LADDER | [`12-puzzle-games-and-data-rules.md`](./12-puzzle-games-and-data-rules.md) |
| 111. MISSING XI | [`12-puzzle-games-and-data-rules.md`](./12-puzzle-games-and-data-rules.md) |
| 112. CLUE AUCTION / ALPHABET SPRINT / BINGO | [`12-puzzle-games-and-data-rules.md`](./12-puzzle-games-and-data-rules.md) |
| 113. FANTASY DRAFT UX | [`12-puzzle-games-and-data-rules.md`](./12-puzzle-games-and-data-rules.md) |
| 114. WORLD CUP / EVENT-SPECIFIC GAMES | [`12-puzzle-games-and-data-rules.md`](./12-puzzle-games-and-data-rules.md) |
| 115. SPORTS TICKER + GAME PAGES | [`12-puzzle-games-and-data-rules.md`](./12-puzzle-games-and-data-rules.md) |
| 116. FOOTBALL/SOCCER TERMINOLOGY | [`12-puzzle-games-and-data-rules.md`](./12-puzzle-games-and-data-rules.md) |
| 117. HISTORICAL ERA ARCHITECTURE | [`12-puzzle-games-and-data-rules.md`](./12-puzzle-games-and-data-rules.md) |
| 118. REAL-TIME DATA VS SIMULATION DATA | [`12-puzzle-games-and-data-rules.md`](./12-puzzle-games-and-data-rules.md) |
| 119. LEGAL / RIGHTS SAFEGUARDS | [`13-legal-admin-and-testing.md`](./13-legal-admin-and-testing.md) |
| 120. PLAYER LIKENESS / AVATAR STRATEGY | [`13-legal-admin-and-testing.md`](./13-legal-admin-and-testing.md) |
| 121. AI USAGE POLICY | [`13-legal-admin-and-testing.md`](./13-legal-admin-and-testing.md) |
| 122. ADMIN CONSOLE | [`13-legal-admin-and-testing.md`](./13-legal-admin-and-testing.md) |
| 123. REPORT ISSUE ADMIN WORKFLOW | [`13-legal-admin-and-testing.md`](./13-legal-admin-and-testing.md) |
| 124. TESTING STRATEGY | [`13-legal-admin-and-testing.md`](./13-legal-admin-and-testing.md) |
| 125. CORE ACCEPTANCE TESTS | [`13-legal-admin-and-testing.md`](./13-legal-admin-and-testing.md) |
| 126. PERFORMANCE ACCEPTANCE | [`13-legal-admin-and-testing.md`](./13-legal-admin-and-testing.md) |
| 127. ERROR HANDLING | [`13-legal-admin-and-testing.md`](./13-legal-admin-and-testing.md) |
| 128. SAVE SYSTEM | [`13-legal-admin-and-testing.md`](./13-legal-admin-and-testing.md) |
| 129. OFFLINE / CONNECTION RESILIENCE | [`13-legal-admin-and-testing.md`](./13-legal-admin-and-testing.md) |
| 130. SECURITY | [`13-legal-admin-and-testing.md`](./13-legal-admin-and-testing.md) |
| 131. ANTI-CHEAT | [`13-legal-admin-and-testing.md`](./13-legal-admin-and-testing.md) |
| 132. VIRTUAL ECONOMY | [`14-economy-and-events.md`](./14-economy-and-events.md) |
| 133. NO PAY-TO-WIN CORE LEADERBOARD | [`14-economy-and-events.md`](./14-economy-and-events.md) |
| 134. SOCIAL CHALLENGES | [`14-economy-and-events.md`](./14-economy-and-events.md) |
| 135. PRIVATE LEAGUES | [`14-economy-and-events.md`](./14-economy-and-events.md) |
| 136. SEASONAL PLATFORM | [`14-economy-and-events.md`](./14-economy-and-events.md) |
| 137. DOUKNOWBALL HALL OF FAME | [`14-economy-and-events.md`](./14-economy-and-events.md) |
| 138. DAILY SOCIAL EVENT | [`14-economy-and-events.md`](./14-economy-and-events.md) |
| 139. MIXED SPORTS MODES | [`14-economy-and-events.md`](./14-economy-and-events.md) |
| 140. NEW GAME IDEA — DEADLINE DAY | [`15-new-game-ideas.md`](./15-new-game-ideas.md) |
| 141. NEW GAME IDEA — TRADE MACHINE | [`15-new-game-ideas.md`](./15-new-game-ideas.md) |
| 142. NEW GAME IDEA — DRAFT STEAL | [`15-new-game-ideas.md`](./15-new-game-ideas.md) |
| 143. NEW GAME IDEA — MANAGER HOT SEAT | [`15-new-game-ideas.md`](./15-new-game-ideas.md) |
| 144. NEW GAME IDEA — CONTRACT CHAOS | [`15-new-game-ideas.md`](./15-new-game-ideas.md) |
| 145. NEW GAME IDEA — SCOUT COMBINE | [`15-new-game-ideas.md`](./15-new-game-ideas.md) |
| 146. NEW GAME IDEA — FRANCHISE RESCUE | [`15-new-game-ideas.md`](./15-new-game-ideas.md) |
| 147. NEW GAME IDEA — DYNASTY KILLER | [`15-new-game-ideas.md`](./15-new-game-ideas.md) |
| 148. NEW GAME IDEA — SPORTS COURT | [`15-new-game-ideas.md`](./15-new-game-ideas.md) |
| 149. NEW GAME IDEA — OWNER MODE | [`15-new-game-ideas.md`](./15-new-game-ideas.md) |
| 150. NEW GAME IDEA — SPORTS MEDIA | [`15-new-game-ideas.md`](./15-new-game-ideas.md) |
| 151. NEW GAME IDEA — CAREER RESCUE | [`15-new-game-ideas.md`](./15-new-game-ideas.md) |
| 152. GAME DISCOVERY / RECOMMENDATION ENGINE | [`16-discovery-and-data-operations.md`](./16-discovery-and-data-operations.md) |
| 153. HOMEPAGE PERSONALIZATION | [`16-discovery-and-data-operations.md`](./16-discovery-and-data-operations.md) |
| 154. DATA REFRESH PIPELINE | [`16-discovery-and-data-operations.md`](./16-discovery-and-data-operations.md) |
| 155. HISTORICAL FOOTBALL DATABASE | [`16-discovery-and-data-operations.md`](./16-discovery-and-data-operations.md) |
| 156. CURRENT SPORTS DATABASE | [`16-discovery-and-data-operations.md`](./16-discovery-and-data-operations.md) |
| 157. SCHEDULING | [`16-discovery-and-data-operations.md`](./16-discovery-and-data-operations.md) |
| 158. OBSERVABILITY | [`16-discovery-and-data-operations.md`](./16-discovery-and-data-operations.md) |
| 159. RELEASE PROCESS | [`16-discovery-and-data-operations.md`](./16-discovery-and-data-operations.md) |
| 160. PRODUCT PRIORITY MATRIX | [`17-roadmap-and-quality-bar.md`](./17-roadmap-and-quality-bar.md) |
| 161. 90-DAY BUILD TARGET | [`17-roadmap-and-quality-bar.md`](./17-roadmap-and-quality-bar.md) |
| 162. 6-MONTH TARGET | [`17-roadmap-and-quality-bar.md`](./17-roadmap-and-quality-bar.md) |
| 163. 12-MONTH TARGET | [`17-roadmap-and-quality-bar.md`](./17-roadmap-and-quality-bar.md) |
| 164. "GREATEST WEBSITE EVER" QUALITY BAR | [`17-roadmap-and-quality-bar.md`](./17-roadmap-and-quality-bar.md) |
| 165. DEFINITION OF DONE — GAME | [`17-roadmap-and-quality-bar.md`](./17-roadmap-and-quality-bar.md) |
| 166. DEFINITION OF DONE — SIMULATION | [`17-roadmap-and-quality-bar.md`](./17-roadmap-and-quality-bar.md) |
| 167. DEFINITION OF DONE — INTERACTIVE GAME | [`17-roadmap-and-quality-bar.md`](./17-roadmap-and-quality-bar.md) |
| 168. REGRESSION TEST LIST | [`17-roadmap-and-quality-bar.md`](./17-roadmap-and-quality-bar.md) |
| 169. PRODUCT PHILOSOPHY | [`17-roadmap-and-quality-bar.md`](./17-roadmap-and-quality-bar.md) |
| 170. COMPETITOR INSPIRATION RULE | [`17-roadmap-and-quality-bar.md`](./17-roadmap-and-quality-bar.md) |
| 171. EXTERNAL-FACT VERIFICATION RULE | [`17-roadmap-and-quality-bar.md`](./17-roadmap-and-quality-bar.md) |
| 172. GOOGLE / ADS / SEARCH RULE OF THUMB | [`17-roadmap-and-quality-bar.md`](./17-roadmap-and-quality-bar.md) |
| 173. THE META-GAME | [`17-roadmap-and-quality-bar.md`](./17-roadmap-and-quality-bar.md) |
| 174. THE "SPORTS LIFE" LOOP | [`17-roadmap-and-quality-bar.md`](./17-roadmap-and-quality-bar.md) |
| 175. THE BIGGEST PRODUCT OPPORTUNITY | [`17-roadmap-and-quality-bar.md`](./17-roadmap-and-quality-bar.md) |
| 176. GAME PORTFOLIO STRATEGY | [`17-roadmap-and-quality-bar.md`](./17-roadmap-and-quality-bar.md) |
| 177. FINAL VISION | [`17-roadmap-and-quality-bar.md`](./17-roadmap-and-quality-bar.md) |
| 178. FINAL INSTRUCTION TO CLAUDE CODE | [`17-roadmap-and-quality-bar.md`](./17-roadmap-and-quality-bar.md) |
| APPENDIX A — OWNER'S PRIORITY PHRASES TRANSLATED INTO ENGINEERING REQUIREMENTS | [`18-appendices-a-to-c.md`](./18-appendices-a-to-c.md) |
| APPENDIX B — MASTER CHECKLIST | [`18-appendices-a-to-c.md`](./18-appendices-a-to-c.md) |
| APPENDIX C — SOURCES / CURRENT-FACT REFERENCES | [`18-appendices-a-to-c.md`](./18-appendices-a-to-c.md) |
| END OF MASTER SPECIFICATION | [`18-appendices-a-to-c.md`](./18-appendices-a-to-c.md) |
| APPENDIX D — IMPLEMENTATION BLUEPRINT | [`19-blueprint-architecture.md`](./19-blueprint-architecture.md) |
| D1. DOMAIN MODEL OVERVIEW | [`19-blueprint-architecture.md`](./19-blueprint-architecture.md) |
| D2. DATABASE DESIGN PRINCIPLES | [`19-blueprint-architecture.md`](./19-blueprint-architecture.md) |
| D3. EXAMPLE USER TABLE | [`19-blueprint-architecture.md`](./19-blueprint-architecture.md) |
| D4. EXAMPLE GAME RESULT TABLE | [`19-blueprint-architecture.md`](./19-blueprint-architecture.md) |
| D5. LEADERBOARD ARCHITECTURE | [`19-blueprint-architecture.md`](./19-blueprint-architecture.md) |
| D6. SCORE NORMALIZATION | [`19-blueprint-architecture.md`](./19-blueprint-architecture.md) |
| D7. XP VS SCORE | [`19-blueprint-architecture.md`](./19-blueprint-architecture.md) |
| D8. API LAYER | [`19-blueprint-architecture.md`](./19-blueprint-architecture.md) |
| D9. SERVER AUTHORITATIVE GAME FLOW | [`19-blueprint-architecture.md`](./19-blueprint-architecture.md) |
| D10. FEATURE FLAGS | [`19-blueprint-architecture.md`](./19-blueprint-architecture.md) |
| D11. GAME REGISTRY | [`19-blueprint-architecture.md`](./19-blueprint-architecture.md) |
| D12. GAME VERSIONING | [`19-blueprint-architecture.md`](./19-blueprint-architecture.md) |
| D13. DAILY PUZZLE GENERATION | [`19-blueprint-architecture.md`](./19-blueprint-architecture.md) |
| D14. PUZZLE GENERATION TESTS | [`19-blueprint-architecture.md`](./19-blueprint-architecture.md) |
| D15. GAME UI STATE MACHINE | [`19-blueprint-architecture.md`](./19-blueprint-architecture.md) |
| D16. GLOBAL LOADING EXPERIENCE | [`19-blueprint-architecture.md`](./19-blueprint-architecture.md) |
| D17. GLOBAL ERROR EXPERIENCE | [`19-blueprint-architecture.md`](./19-blueprint-architecture.md) |
| D18. SPORTS DATA IMPORT PIPELINE | [`19-blueprint-architecture.md`](./19-blueprint-architecture.md) |
| D19. DATA DIFF VIEW | [`19-blueprint-architecture.md`](./19-blueprint-architecture.md) |
| D20. HISTORICAL SNAPSHOT RULE | [`19-blueprint-architecture.md`](./19-blueprint-architecture.md) |
| D21. WORLD SIMULATION | [`20-blueprint-simulation-and-club-manager.md`](./20-blueprint-simulation-and-club-manager.md) |
| D22. SIMULATION DETERMINISM | [`20-blueprint-simulation-and-club-manager.md`](./20-blueprint-simulation-and-club-manager.md) |
| D23. MATCH SIMULATION MODEL | [`20-blueprint-simulation-and-club-manager.md`](./20-blueprint-simulation-and-club-manager.md) |
| D24. EVENT PROBABILITY MODEL | [`20-blueprint-simulation-and-club-manager.md`](./20-blueprint-simulation-and-club-manager.md) |
| D25. MATCH PRESENTATION ENGINE | [`20-blueprint-simulation-and-club-manager.md`](./20-blueprint-simulation-and-club-manager.md) |
| D26. MATCH EVENT TYPES | [`20-blueprint-simulation-and-club-manager.md`](./20-blueprint-simulation-and-club-manager.md) |
| D27. SOCCER MATCH ANIMATION V1 | [`20-blueprint-simulation-and-club-manager.md`](./20-blueprint-simulation-and-club-manager.md) |
| D28. SOCCER MATCH ANIMATION V2 | [`20-blueprint-simulation-and-club-manager.md`](./20-blueprint-simulation-and-club-manager.md) |
| D29. SOCCER MATCH ANIMATION V3 | [`20-blueprint-simulation-and-club-manager.md`](./20-blueprint-simulation-and-club-manager.md) |
| D30. CLUB MANAGER HOME SCREEN | [`20-blueprint-simulation-and-club-manager.md`](./20-blueprint-simulation-and-club-manager.md) |
| D31. CLUB MANAGER INBOX | [`20-blueprint-simulation-and-club-manager.md`](./20-blueprint-simulation-and-club-manager.md) |
| D32. CLUB MANAGER MESSAGE CONSEQUENCES | [`20-blueprint-simulation-and-club-manager.md`](./20-blueprint-simulation-and-club-manager.md) |
| D33. CLUB MANAGER NEGOTIATION TIMER | [`20-blueprint-simulation-and-club-manager.md`](./20-blueprint-simulation-and-club-manager.md) |
| D34. CLUB MANAGER TRANSFER AI | [`20-blueprint-simulation-and-club-manager.md`](./20-blueprint-simulation-and-club-manager.md) |
| D35. CLUB MANAGER PLAYER VALUE MODEL | [`20-blueprint-simulation-and-club-manager.md`](./20-blueprint-simulation-and-club-manager.md) |
| D36. PLAYER CONTRACT SYSTEM | [`20-blueprint-simulation-and-club-manager.md`](./20-blueprint-simulation-and-club-manager.md) |
| D37. PLAYER MORALE SYSTEM | [`20-blueprint-simulation-and-club-manager.md`](./20-blueprint-simulation-and-club-manager.md) |
| D38. FAN MODEL | [`20-blueprint-simulation-and-club-manager.md`](./20-blueprint-simulation-and-club-manager.md) |
| D39. BOARD MODEL | [`20-blueprint-simulation-and-club-manager.md`](./20-blueprint-simulation-and-club-manager.md) |
| D40. SACKING SYSTEM | [`20-blueprint-simulation-and-club-manager.md`](./20-blueprint-simulation-and-club-manager.md) |
| D41. MEDIA SYSTEM | [`20-blueprint-simulation-and-club-manager.md`](./20-blueprint-simulation-and-club-manager.md) |
| D42. POLL SYSTEM | [`20-blueprint-simulation-and-club-manager.md`](./20-blueprint-simulation-and-club-manager.md) |
| D43. TICKER SOURCE OF TRUTH | [`20-blueprint-simulation-and-club-manager.md`](./20-blueprint-simulation-and-club-manager.md) |
| D44. LIVE TICKER FAILURE MODES | [`20-blueprint-simulation-and-club-manager.md`](./20-blueprint-simulation-and-club-manager.md) |
| D45. SPORTS HUBS | [`21-blueprint-seo-and-frontend.md`](./21-blueprint-seo-and-frontend.md) |
| D46. GAME PAGE SEO TEMPLATE | [`21-blueprint-seo-and-frontend.md`](./21-blueprint-seo-and-frontend.md) |
| D47. STRUCTURED DATA | [`21-blueprint-seo-and-frontend.md`](./21-blueprint-seo-and-frontend.md) |
| D48. INTERNAL LINKING | [`21-blueprint-seo-and-frontend.md`](./21-blueprint-seo-and-frontend.md) |
| D49. PERFORMANCE BUDGET | [`21-blueprint-seo-and-frontend.md`](./21-blueprint-seo-and-frontend.md) |
| D50. GAME ENGINE CODE SPLIT | [`21-blueprint-seo-and-frontend.md`](./21-blueprint-seo-and-frontend.md) |
| D51. ACCESSIBILITY ACCEPTANCE | [`21-blueprint-seo-and-frontend.md`](./21-blueprint-seo-and-frontend.md) |
| D52. MODERATION SYSTEM | [`21-blueprint-seo-and-frontend.md`](./21-blueprint-seo-and-frontend.md) |
| D53. RESERVED NAMES | [`21-blueprint-seo-and-frontend.md`](./21-blueprint-seo-and-frontend.md) |
| D54. FRIEND SYSTEM | [`21-blueprint-seo-and-frontend.md`](./21-blueprint-seo-and-frontend.md) |
| D55. BLOCKING | [`21-blueprint-seo-and-frontend.md`](./21-blueprint-seo-and-frontend.md) |
| D56. NOTIFICATION SYSTEM | [`21-blueprint-seo-and-frontend.md`](./21-blueprint-seo-and-frontend.md) |
| D57. SAVE UI | [`21-blueprint-seo-and-frontend.md`](./21-blueprint-seo-and-frontend.md) |
| D58. SAVE RECOVERY | [`21-blueprint-seo-and-frontend.md`](./21-blueprint-seo-and-frontend.md) |
| D59. GAME ROUTING | [`21-blueprint-seo-and-frontend.md`](./21-blueprint-seo-and-frontend.md) |
| D60. ANALYTICS DASHBOARD | [`21-blueprint-seo-and-frontend.md`](./21-blueprint-seo-and-frontend.md) |
| D61. FLAGSHIP GAME KPIs | [`21-blueprint-seo-and-frontend.md`](./21-blueprint-seo-and-frontend.md) |
| D62. GAME EXPERIMENTATION | [`21-blueprint-seo-and-frontend.md`](./21-blueprint-seo-and-frontend.md) |
| D63. DESIGN SYSTEM | [`21-blueprint-seo-and-frontend.md`](./21-blueprint-seo-and-frontend.md) |
| D64. SPORTS VISUAL LANGUAGE | [`21-blueprint-seo-and-frontend.md`](./21-blueprint-seo-and-frontend.md) |
| D65. ICONOGRAPHY | [`21-blueprint-seo-and-frontend.md`](./21-blueprint-seo-and-frontend.md) |
| D66. TABLE DESIGN | [`21-blueprint-seo-and-frontend.md`](./21-blueprint-seo-and-frontend.md) |
| D67. MATCH CENTER MOBILE | [`21-blueprint-seo-and-frontend.md`](./21-blueprint-seo-and-frontend.md) |
| D68. CLUB MANAGER MOBILE | [`21-blueprint-seo-and-frontend.md`](./21-blueprint-seo-and-frontend.md) |
| D69. PLAYER PROFILE COMPONENT | [`22-blueprint-components-and-data.md`](./22-blueprint-components-and-data.md) |
| D70. TEAM PROFILE COMPONENT | [`22-blueprint-components-and-data.md`](./22-blueprint-components-and-data.md) |
| D71. FLAG COMPONENT | [`22-blueprint-components-and-data.md`](./22-blueprint-components-and-data.md) |
| D72. PLAYER POSITION COMPATIBILITY | [`22-blueprint-components-and-data.md`](./22-blueprint-components-and-data.md) |
| D73. PLAYER ELIGIBILITY | [`22-blueprint-components-and-data.md`](./22-blueprint-components-and-data.md) |
| D74. CURRENT-ERA ROSTER POLICY | [`22-blueprint-components-and-data.md`](./22-blueprint-components-and-data.md) |
| D75. SPORTS DATA FALLBACKS | [`22-blueprint-components-and-data.md`](./22-blueprint-components-and-data.md) |
| D76. COMPETITION RULE TEST SUITE | [`22-blueprint-components-and-data.md`](./22-blueprint-components-and-data.md) |
| D77. FOOTBALL COMPETITION EXAMPLES | [`22-blueprint-components-and-data.md`](./22-blueprint-components-and-data.md) |
| D78. FOOTBALL SUPER-LEAGUE / CUSTOM LEAGUE | [`22-blueprint-components-and-data.md`](./22-blueprint-components-and-data.md) |
| D79. ERA SELECTOR | [`22-blueprint-components-and-data.md`](./22-blueprint-components-and-data.md) |
| D80. CLUB MANAGER ACADEMY LOOP | [`22-blueprint-components-and-data.md`](./22-blueprint-components-and-data.md) |
| D81. YOUTH GENERATION | [`22-blueprint-components-and-data.md`](./22-blueprint-components-and-data.md) |
| D82. STAFF MARKET | [`22-blueprint-components-and-data.md`](./22-blueprint-components-and-data.md) |
| D83. MANAGER MARKET | [`22-blueprint-components-and-data.md`](./22-blueprint-components-and-data.md) |
| D84. CAREER RETIREMENT | [`23-blueprint-careers.md`](./23-blueprint-careers.md) |
| D85. SOCCER CAREER LIFE EVENTS | [`23-blueprint-careers.md`](./23-blueprint-careers.md) |
| D86. LIFE-CHOICE SAFETY | [`23-blueprint-careers.md`](./23-blueprint-careers.md) |
| D87. CAREER FAME | [`23-blueprint-careers.md`](./23-blueprint-careers.md) |
| D88. CAREER SOCIAL MEDIA | [`23-blueprint-careers.md`](./23-blueprint-careers.md) |
| D89. CAREER BRAND | [`23-blueprint-careers.md`](./23-blueprint-careers.md) |
| D90. PLAYER CAREER LEGACY | [`23-blueprint-careers.md`](./23-blueprint-careers.md) |
| D91. COLLEGE DYNASTY ATMOSPHERE | [`23-blueprint-careers.md`](./23-blueprint-careers.md) |
| D92. COLLEGE RECRUITING | [`23-blueprint-careers.md`](./23-blueprint-careers.md) |
| D93. CFB CUSTOM SCHEDULE | [`23-blueprint-careers.md`](./23-blueprint-careers.md) |
| D94. COLLEGE TV RIGHTS | [`23-blueprint-careers.md`](./23-blueprint-careers.md) |
| D95. ACADEMIC SYSTEM | [`23-blueprint-careers.md`](./23-blueprint-careers.md) |
| D96. NBA CAREER INTERACTIVE LOOP | [`23-blueprint-careers.md`](./23-blueprint-careers.md) |
| D97. NFL CAREER INTERACTIVE LOOP | [`23-blueprint-careers.md`](./23-blueprint-careers.md) |
| D98. MLB CAREER INTERACTIVE LOOP | [`23-blueprint-careers.md`](./23-blueprint-careers.md) |
| D99. NHL CAREER INTERACTIVE LOOP | [`23-blueprint-careers.md`](./23-blueprint-careers.md) |
| D100. WNBA CAREER | [`23-blueprint-careers.md`](./23-blueprint-careers.md) |
| D101. UNIVERSAL DRAFT ENGINE UI | [`24-blueprint-cards-conquest-and-multiplayer.md`](./24-blueprint-cards-conquest-and-multiplayer.md) |
| D102. CARD ENGINE | [`24-blueprint-cards-conquest-and-multiplayer.md`](./24-blueprint-cards-conquest-and-multiplayer.md) |
| D103. PACK ENGINE | [`24-blueprint-cards-conquest-and-multiplayer.md`](./24-blueprint-cards-conquest-and-multiplayer.md) |
| D104. PACK ANIMATION | [`24-blueprint-cards-conquest-and-multiplayer.md`](./24-blueprint-cards-conquest-and-multiplayer.md) |
| D105. SPORTS BINGO SERVER LOGIC | [`24-blueprint-cards-conquest-and-multiplayer.md`](./24-blueprint-cards-conquest-and-multiplayer.md) |
| D106. CONQUEST DATA MODEL | [`24-blueprint-cards-conquest-and-multiplayer.md`](./24-blueprint-cards-conquest-and-multiplayer.md) |
| D107. CONQUEST MAP UI | [`24-blueprint-cards-conquest-and-multiplayer.md`](./24-blueprint-cards-conquest-and-multiplayer.md) |
| D108. CONQUEST MAP HISTORY | [`24-blueprint-cards-conquest-and-multiplayer.md`](./24-blueprint-cards-conquest-and-multiplayer.md) |
| D109. CONQUEST MULTIPLAYER | [`24-blueprint-cards-conquest-and-multiplayer.md`](./24-blueprint-cards-conquest-and-multiplayer.md) |
| D110. PRIVATE ROOM ARCHITECTURE | [`24-blueprint-cards-conquest-and-multiplayer.md`](./24-blueprint-cards-conquest-and-multiplayer.md) |
| D111. MULTIPLAYER ANTI-CHEAT | [`24-blueprint-cards-conquest-and-multiplayer.md`](./24-blueprint-cards-conquest-and-multiplayer.md) |
| D112. CHAT SAFETY | [`24-blueprint-cards-conquest-and-multiplayer.md`](./24-blueprint-cards-conquest-and-multiplayer.md) |
| D113. SPORTS PARTY ARCHITECTURE | [`24-blueprint-cards-conquest-and-multiplayer.md`](./24-blueprint-cards-conquest-and-multiplayer.md) |
| D114. TOWER DEFENSE ARCHITECTURE | [`24-blueprint-cards-conquest-and-multiplayer.md`](./24-blueprint-cards-conquest-and-multiplayer.md) |
| D115. TOWER DEFENSE GAME LOOP | [`24-blueprint-cards-conquest-and-multiplayer.md`](./24-blueprint-cards-conquest-and-multiplayer.md) |
| D116. SPORTS EMPIRE ARCHITECTURE | [`24-blueprint-cards-conquest-and-multiplayer.md`](./24-blueprint-cards-conquest-and-multiplayer.md) |
| D117. SPORTS EMPIRE ECONOMY | [`24-blueprint-cards-conquest-and-multiplayer.md`](./24-blueprint-cards-conquest-and-multiplayer.md) |
| D118. USER CUSTOMIZATION | [`25-blueprint-profile-social-and-safety.md`](./25-blueprint-profile-social-and-safety.md) |
| D119. ANIMATED PROFILE | [`25-blueprint-profile-social-and-safety.md`](./25-blueprint-profile-social-and-safety.md) |
| D120. PROFILE COSMETICS | [`25-blueprint-profile-social-and-safety.md`](./25-blueprint-profile-social-and-safety.md) |
| D121. SHARING | [`25-blueprint-profile-social-and-safety.md`](./25-blueprint-profile-social-and-safety.md) |
| D122. INVITE FLOW | [`25-blueprint-profile-social-and-safety.md`](./25-blueprint-profile-social-and-safety.md) |
| D123. FRIEND LEADERBOARD | [`25-blueprint-profile-social-and-safety.md`](./25-blueprint-profile-social-and-safety.md) |
| D124. PLATFORM SEARCH | [`25-blueprint-profile-social-and-safety.md`](./25-blueprint-profile-social-and-safety.md) |
| D125. SPORT SEARCH | [`25-blueprint-profile-social-and-safety.md`](./25-blueprint-profile-social-and-safety.md) |
| D126. NOTIFICATION PREFERENCES | [`25-blueprint-profile-social-and-safety.md`](./25-blueprint-profile-social-and-safety.md) |
| D127. LEGAL/SAFETY CHECKPOINTS | [`25-blueprint-profile-social-and-safety.md`](./25-blueprint-profile-social-and-safety.md) |
| D128. RIGHTS-AWARE ASSET PIPELINE | [`25-blueprint-profile-social-and-safety.md`](./25-blueprint-profile-social-and-safety.md) |
| D129. BRAND SAFETY | [`25-blueprint-profile-social-and-safety.md`](./25-blueprint-profile-social-and-safety.md) |
| D130. SAFER REAL-PERSON GAME DESIGN | [`25-blueprint-profile-social-and-safety.md`](./25-blueprint-profile-social-and-safety.md) |
| D131. GAME DESIGN SCORECARD | [`26-blueprint-quality-and-qa.md`](./26-blueprint-quality-and-qa.md) |
| D132. FEATURE REVIEW | [`26-blueprint-quality-and-qa.md`](./26-blueprint-quality-and-qa.md) |
| D133. BUG PRIORITY | [`26-blueprint-quality-and-qa.md`](./26-blueprint-quality-and-qa.md) |
| D134. QA TEST MATRIX FOR GAMES | [`26-blueprint-quality-and-qa.md`](./26-blueprint-quality-and-qa.md) |
| D135. QA TEST MATRIX FOR SIMULATIONS | [`26-blueprint-quality-and-qa.md`](./26-blueprint-quality-and-qa.md) |
| D136. QA TEST MATRIX FOR HISTORICAL MODES | [`26-blueprint-quality-and-qa.md`](./26-blueprint-quality-and-qa.md) |
| D137. QA TEST MATRIX FOR LEADERBOARDS | [`26-blueprint-quality-and-qa.md`](./26-blueprint-quality-and-qa.md) |
| D138. QA TEST MATRIX FOR TICKER | [`26-blueprint-quality-and-qa.md`](./26-blueprint-quality-and-qa.md) |
| D139. QA TEST MATRIX FOR ADS | [`26-blueprint-quality-and-qa.md`](./26-blueprint-quality-and-qa.md) |
| D140. QA TEST MATRIX FOR SEO | [`26-blueprint-quality-and-qa.md`](./26-blueprint-quality-and-qa.md) |
| D141. RELEASE NOTES | [`26-blueprint-quality-and-qa.md`](./26-blueprint-quality-and-qa.md) |
| D142. OWNER ADMIN DASHBOARD — DAILY VIEW | [`26-blueprint-quality-and-qa.md`](./26-blueprint-quality-and-qa.md) |
| D143. OWNER DASHBOARD — GAME VIEW | [`26-blueprint-quality-and-qa.md`](./26-blueprint-quality-and-qa.md) |
| D144. OWNER DASHBOARD — DATA VIEW | [`26-blueprint-quality-and-qa.md`](./26-blueprint-quality-and-qa.md) |
| D145. OWNER DASHBOARD — MONETIZATION VIEW | [`26-blueprint-quality-and-qa.md`](./26-blueprint-quality-and-qa.md) |
| D146. PRODUCT DEVELOPMENT RULE | [`27-blueprint-rules-and-milestones.md`](./27-blueprint-rules-and-milestones.md) |
| D147. PRODUCT DEVELOPMENT RULE — NO FAKE DEPTH | [`27-blueprint-rules-and-milestones.md`](./27-blueprint-rules-and-milestones.md) |
| D148. PRODUCT DEVELOPMENT RULE — EXPLAIN CONSEQUENCES | [`27-blueprint-rules-and-milestones.md`](./27-blueprint-rules-and-milestones.md) |
| D149. PRODUCT DEVELOPMENT RULE — PLAYER AGENCY | [`27-blueprint-rules-and-milestones.md`](./27-blueprint-rules-and-milestones.md) |
| D150. PRODUCT DEVELOPMENT RULE — FAIL FOR A REASON | [`27-blueprint-rules-and-milestones.md`](./27-blueprint-rules-and-milestones.md) |
| D151. PRODUCT DEVELOPMENT RULE — DIFFICULTY | [`27-blueprint-rules-and-milestones.md`](./27-blueprint-rules-and-milestones.md) |
| D152. PRODUCT DEVELOPMENT RULE — NEVER PUNISH REFRESH | [`27-blueprint-rules-and-milestones.md`](./27-blueprint-rules-and-milestones.md) |
| D153. PRODUCT DEVELOPMENT RULE — SERVER TIME | [`27-blueprint-rules-and-milestones.md`](./27-blueprint-rules-and-milestones.md) |
| D154. PRODUCT DEVELOPMENT RULE — MOBILE FIRST FOR GAMES | [`27-blueprint-rules-and-milestones.md`](./27-blueprint-rules-and-milestones.md) |
| D155. PRODUCT DEVELOPMENT RULE — ACCESSIBILITY FIRST | [`27-blueprint-rules-and-milestones.md`](./27-blueprint-rules-and-milestones.md) |
| D156. PRODUCT DEVELOPMENT RULE — TEST THE HAPPY PATH AND THE WEIRD PATH | [`27-blueprint-rules-and-milestones.md`](./27-blueprint-rules-and-milestones.md) |
| D157. FIRST IMPLEMENTATION MILESTONE | [`27-blueprint-rules-and-milestones.md`](./27-blueprint-rules-and-milestones.md) |
| D158. SECOND IMPLEMENTATION MILESTONE | [`27-blueprint-rules-and-milestones.md`](./27-blueprint-rules-and-milestones.md) |
| D159. THIRD IMPLEMENTATION MILESTONE | [`27-blueprint-rules-and-milestones.md`](./27-blueprint-rules-and-milestones.md) |
| D160. FOURTH IMPLEMENTATION MILESTONE | [`27-blueprint-rules-and-milestones.md`](./27-blueprint-rules-and-milestones.md) |
| D161. FIFTH IMPLEMENTATION MILESTONE | [`27-blueprint-rules-and-milestones.md`](./27-blueprint-rules-and-milestones.md) |
| D162. SIXTH IMPLEMENTATION MILESTONE | [`27-blueprint-rules-and-milestones.md`](./27-blueprint-rules-and-milestones.md) |
| D163. FINAL PRODUCT QUALITY GATE | [`27-blueprint-rules-and-milestones.md`](./27-blueprint-rules-and-milestones.md) |
| APPENDIX E — GAME-BY-GAME ROADMAP | [`28-appendices-e-to-q.md`](./28-appendices-e-to-q.md) |
| APPENDIX F — NBA STAT LINE DETAILED SPEC | [`28-appendices-e-to-q.md`](./28-appendices-e-to-q.md) |
| APPENDIX G — UNIVERSAL POSITION COMPATIBILITY MATRIX | [`28-appendices-e-to-q.md`](./28-appendices-e-to-q.md) |
| APPENDIX H — PLAYER SEARCH/SELECTION RULE | [`28-appendices-e-to-q.md`](./28-appendices-e-to-q.md) |
| APPENDIX I — GAME RESULT SCREEN STANDARD | [`28-appendices-e-to-q.md`](./28-appendices-e-to-q.md) |
| APPENDIX J — SOCIAL RESULT COPY | [`28-appendices-e-to-q.md`](./28-appendices-e-to-q.md) |
| APPENDIX K — IMPLEMENTATION ORDER BY REUSABILITY | [`28-appendices-e-to-q.md`](./28-appendices-e-to-q.md) |
| APPENDIX L — CLAUDE CODE OPERATING INSTRUCTIONS | [`28-appendices-e-to-q.md`](./28-appendices-e-to-q.md) |
| APPENDIX M — AI CODING AGENT RULES | [`28-appendices-e-to-q.md`](./28-appendices-e-to-q.md) |
| APPENDIX N — "DO NOT SHIP" LIST | [`28-appendices-e-to-q.md`](./28-appendices-e-to-q.md) |
| APPENDIX O — SUCCESS DEFINITION | [`28-appendices-e-to-q.md`](./28-appendices-e-to-q.md) |
| APPENDIX P — OWNER'S FEATURE TRANSLATION MATRIX | [`28-appendices-e-to-q.md`](./28-appendices-e-to-q.md) |
| APPENDIX Q — FINAL BUILD COMMANDMENT | [`28-appendices-e-to-q.md`](./28-appendices-e-to-q.md) |
