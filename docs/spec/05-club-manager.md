<!-- spec-part-header -->
> Part 6 of 29 of the Master Build Specification, version 1.0, August 2026.
> Covers 25 to 47. Index: `docs/spec/README.md`. previous `04-analytics-seo-and-ads.md`, next `06-soccer-career.md`.
>
> The part files hold the spec verbatim. Concatenated in index order they reproduce
> the original document byte for byte, and `scripts/simSpecSplit.mjs` proves it on
> every run. Edit the spec here, never by keeping a second copy somewhere else.
<!-- /spec-part-header -->
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
