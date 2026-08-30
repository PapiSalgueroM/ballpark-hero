<!-- spec-part-header -->
> Part 9 of 29 of the Master Build Specification, version 1.0, August 2026.
> Covers 65 to 79. Index: `docs/spec/README.md`. previous `07-dynasty-and-front-office.md`, next `09-tycoon-and-arcade.md`.
>
> The part files hold the spec verbatim. Concatenated in index order they reproduce
> the original document byte for byte, and `scripts/simSpecSplit.mjs` proves it on
> every run. Edit the spec here, never by keeping a second copy somewhere else.
<!-- /spec-part-header -->
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
