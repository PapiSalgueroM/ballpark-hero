<!-- spec-part-header -->
> Part 25 of 29 of the Master Build Specification, version 1.0, August 2026.
> Covers D101 to D117. Index: `docs/spec/README.md`. previous `23-blueprint-careers.md`, next `25-blueprint-profile-social-and-safety.md`.
>
> The part files hold the spec verbatim. Concatenated in index order they reproduce
> the original document byte for byte, and `scripts/simSpecSplit.mjs` proves it on
> every run. Edit the spec here, never by keeping a second copy somewhere else.
<!-- /spec-part-header -->
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
