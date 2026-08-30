<!-- spec-part-header -->
> Part 12 of 29 of the Master Build Specification, version 1.0, August 2026.
> Covers 100 to 107. Index: `docs/spec/README.md`. previous `10-design-performance-and-mobile.md`, next `12-puzzle-games-and-data-rules.md`.
>
> The part files hold the spec verbatim. Concatenated in index order they reproduce
> the original document byte for byte, and `scripts/simSpecSplit.mjs` proves it on
> every run. Edit the spec here, never by keeping a second copy somewhere else.
<!-- /spec-part-header -->
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
