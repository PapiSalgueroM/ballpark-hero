<!-- spec-part-header -->
> Part 13 of 29 of the Master Build Specification, version 1.0, August 2026.
> Covers 108 to 118. Index: `docs/spec/README.md`. previous `11-social-daily-and-leaderboards.md`, next `13-legal-admin-and-testing.md`.
>
> The part files hold the spec verbatim. Concatenated in index order they reproduce
> the original document byte for byte, and `scripts/simSpecSplit.mjs` proves it on
> every run. Edit the spec here, never by keeping a second copy somewhere else.
<!-- /spec-part-header -->
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
