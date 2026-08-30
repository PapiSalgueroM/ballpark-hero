<!-- spec-part-header -->
> Part 2 of 29 of the Master Build Specification, version 1.0, August 2026.
> Covers 6 to 8. Index: `docs/spec/README.md`. previous `00-title-and-directive.md`, next `02-platform-shell.md`.
>
> The part files hold the spec verbatim. Concatenated in index order they reproduce
> the original document byte for byte, and `scripts/simSpecSplit.mjs` proves it on
> every run. Edit the spec here, never by keeping a second copy somewhere else.
<!-- /spec-part-header -->
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
