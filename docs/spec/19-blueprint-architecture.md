<!-- spec-part-header -->
> Part 20 of 29 of the Master Build Specification, version 1.0, August 2026.
> Covers APPENDIX D to D20. Index: `docs/spec/README.md`. previous `18-appendices-a-to-c.md`, next `20-blueprint-simulation-and-club-manager.md`.
>
> The part files hold the spec verbatim. Concatenated in index order they reproduce
> the original document byte for byte, and `scripts/simSpecSplit.mjs` proves it on
> every run. Edit the spec here, never by keeping a second copy somewhere else.
<!-- /spec-part-header -->
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
