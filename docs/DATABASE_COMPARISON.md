# Database comparison — flawu vs pzzad (live)

_Generated 2026-06-16. Read-only; nothing was modified._

## What this compares

- **flawu** = `flawuiqbvjobmkfkauhw` (dev/scratch project, reachable via the Supabase MCP).
  Counts are **exact** (`count(*)` per table).
- **pzzad** = `pzzadswiradjnvvfybol` (the LIVE site's database). Counts come from the
  **public REST API using the anon key** (read-only).

### Important caveats (read before trusting the numbers)

1. **pzzad counts can be undercounts.** Tables with Row-Level Security and no public-read
   policy return **0 via the anon key even when they hold data** (e.g. user scores,
   profiles, selections). A pzzad `0` therefore means *either* genuinely empty *or*
   RLS-masked — it is **not** proof the table is empty.
2. **pzzad table existence is reliable.** A `404 (PGRST205)` means the table does not
   exist in pzzad's schema. A `200` means it exists.
3. **"Only in pzzad" is best-effort.** pzzad's OpenAPI root returns 401, so its tables
   can't be enumerated directly. pzzad was probed for every flawu table plus every table
   named in `src/integrations/supabase/types.ts`. A pzzad-only table named in neither set
   would not be detected.

## Summary

| Metric | Value |
|---|---|
| Tables in flawu | 162 |
| Tables in flawu also present in pzzad | 13 |
| **Tables in flawu MISSING from pzzad** | **149** (137 with data, 12 empty in flawu) |
| Tables only in pzzad (of probed candidates) | 26 |
| In both but with different counts | 1 |

---

## 1. Tables in flawu but MISSING from pzzad

These exist in flawu but return 404 on the live database — i.e. the live site has no such
table. **Most of pzzad's content tables simply don't exist there**; the live games that
need this data either fall back to bundled/hardcoded data or don't read it.

### 1a. Missing AND populated in flawu — candidate data to move (137)

Sorted by flawu row count (largest first).

| Table | flawu rows | flawu RLS |
|---|--:|:--:|
| `player_market_values` | 171,567 | on |
| `lahman_fielding` | 147,080 | off |
| `nflfastr_player_stats` | 134,470 | off |
| `lahman_batting` | 110,495 | off |
| `lahman_appearances` | 110,423 | off |
| `nflfastr_rosters` | 60,350 | off |
| `lahman_pitching` | 49,430 | off |
| `ncaa_player_stats` | 43,800 | on |
| `lahman_fielding_of_split` | 34,563 | off |
| `bref_nba_player_seasons` | 30,462 | off |
| `nfl_draft_picks` | 28,015 | on |
| `lahman_salaries` | 26,428 | off |
| `nhl_draft` | 26,138 | off |
| `lahman_people` | 20,673 | off |
| `lahman_college_playing` | 17,350 | off |
| `lahman_batting_post` | 15,879 | off |
| `lahman_fielding_post` | 15,063 | off |
| `cfb_rb_stats` | 14,800 | on |
| `lahman_fielding_of` | 12,028 | off |
| `world_cup_players` | 10,585 | on |
| `mlb_pitching_stats` | 7,401 | on |
| `nba_draft_picks` | 7,013 | on |
| `lahman_awards_share_players` | 6,879 | off |
| `lahman_awards_players` | 6,531 | off |
| `nhl_player_stats` | 6,353 | on |
| `cfb_qb_stats` | 5,800 | on |
| `lahman_allstar` | 5,454 | off |
| `nba_players_extended_v2` | 5,135 | off |
| `individual_awards_v2` | 4,798 | off |
| `lahman_hof` | 4,191 | off |
| `ufc_fights_v2` | 3,917 | off |
| `lahman_managers` | 3,684 | off |
| `olympic_medals` | 3,426 | off |
| `ufc_champions` | 3,408 | on |
| `nba_all_star_rosters` | 3,376 | off |
| `ncaa_tournament_games` | 3,348 | off |
| `nba_player_stats` | 3,227 | on |
| `lahman_home_games` | 3,195 | off |
| `f1_driver_standings` | 3,095 | off |
| `lahman_teams` | 2,985 | off |
| `nfl_defense_stats` | 2,963 | on |
| `national_team_squads` | 2,784 | on |
| `hall_of_fame` | 2,782 | off |
| `trophy_winners` | 2,528 | on |
| `ncaa_tournament_results` | 2,348 | on |
| `mlb_players` | 2,280 | off |
| `nfl_team_seasons` | 2,225 | off |
| `nascar_race_results` | 2,104 | on |
| `tennis_grand_slam_winners` | 2,072 | off |
| `mlb_batting_stats` | 2,000 | on |
| `cfb_bowl_games` | 1,972 | on |
| `nhl_players` | 1,752 | off |
| `career_seasons` | 1,726 | on |
| `mlb_draft_picks` | 1,710 | on |
| `sports_awards` | 1,655 | on |
| `boxing_champions_v2` | 1,649 | off |
| `league_champions` | 1,600 | on |
| `soccer_league_champions` | 1,504 | off |
| `boxing_title_fights` | 1,436 | on |
| `golf_awards` | 1,339 | on |
| `nfl_wr_te_stats` | 1,286 | on |
| `cfb_all_americans` | 1,236 | on |
| `lahman_schools` | 1,207 | off |
| `soccer_domestic_cup_finals` | 1,202 | on |
| `tennis_tour_winners` | 1,200 | on |
| `tennis_grand_slams` | 1,017 | on |
| `nfl_rb_stats` | 999 | on |
| `boxing_champions` | 905 | on |
| `cbb_awards` | 903 | on |
| `boxing_major_fights` | 891 | off |
| `f1_drivers_full` | 879 | off |
| `soccer_awards` | 871 | on |
| `nflfastr_team_stats` | 862 | off |
| `f1_race_results` | 860 | on |
| `cfb_awards` | 850 | on |
| `nfl_qb_passing_leaders` | 845 | on |
| `career_records` | 800 | on |
| `lahman_pitching_post` | 800 | off |
| `conference_championships` | 749 | on |
| `wnba_draft_picks` | 724 | on |
| `f1_drivers` | 720 | on |
| `world_cup_matches` | 704 | on |
| `nhl_draft_picks` | 668 | on |
| `soccer_player_career_paths` | 587 | off |
| `golf_majors` | 526 | on |
| `rugby_championships` | 506 | off |
| `golf_major_results` | 502 | off |
| `nba_players_extended` | 500 | off |
| `lahman_awards_share_managers` | 425 | off |
| `soccer_continental_finals` | 423 | on |
| `golf_team_events` | 415 | on |
| `ncaa_basketball_champions` | 382 | off |
| `lahman_series_post` | 367 | off |
| `cbb_conference_tournament_champions` | 325 | off |
| `cfb_champions` | 318 | off |
| `cfb_bowl_results` | 305 | off |
| `lahman_parks` | 255 | off |
| `soccer_league_top_scorers` | 222 | off |
| `f1_constructors_full` | 214 | off |
| `f1_constructors` | 213 | on |
| `cfb_rankings` | 207 | on |
| `cbb_wooden_award` | 204 | off |
| `cfb_ap_poll_final` | 202 | off |
| `lahman_awards_managers` | 179 | off |
| `soccer_player_careers_expanded` | 175 | off |
| `career_players` | 151 | on |
| `ucl_top_scorers_by_season` | 144 | off |
| `cricket_championships` | 143 | off |
| `world_series` | 121 | on |
| `world_series_v2` | 121 | off |
| `lahman_team_franchises` | 120 | off |
| `stanley_cup_finals_v2` | 109 | off |
| `tennis_year_end_no1` | 104 | off |
| `tennis_year_end_rankings` | 104 | on |
| `cbb_naismith_winners` | 103 | off |
| `nascar_driver_careers` | 103 | off |
| `soccer_player_facts` | 96 | off |
| `lahman_managers_half` | 93 | off |
| `college_athletic_facts` | 89 | off |
| `mma_fighter_careers` | 86 | off |
| `nba_finals` | 79 | on |
| `soccer_club_puzzles` | 79 | on |
| `nascar_champions` | 77 | on |
| `nascar_cup_races` | 72 | off |
| `esports_championships` | 70 | off |
| `super_bowls` | 60 | on |
| `lahman_teams_half` | 52 | off |
| `soccer_grid_puzzles` | 50 | on |
| `boxing_career_records` | 44 | off |
| `cfb_national_champions` | 39 | on |
| `nfl_team_metadata` | 32 | off |
| `shirt_number_puzzles` | 32 | on |
| `wnba_finals` | 29 | on |
| `tennis_career_titles` | 26 | off |
| `nascar_teams` | 25 | off |
| `transfer_path_puzzles` | 20 | on |
| `nfl_team_achievements` | 1 | off |

### 1b. Missing but EMPTY in flawu — nothing to move (12)

`all_star_selections`, `ballon_dor`, `cfb_heisman_winners`, `halls_of_fame`, `href_nhl_player_seasons`, `nba_player_team_seasons`, `olympic_medalists`, `stanley_cup_finals`, `stat_leaders`, `ufc_fights`, `world_cup_player_stats`, `world_records`

---

## 2. Tables in BOTH databases

pzzad counts via anon REST (see caveat #1).

| Table | flawu rows | pzzad rows | Assessment |
|---|--:|--:|---|
| `baseball_connections_puzzles` | 60 | 60 | match |
| `cbb_programs` | 24 | 24 | match |
| `connections_puzzles` | 250 | 250 | match |
| `fantasy_draft_players` | 0 | 0 | both 0 (pzzad may be RLS-masked) |
| `guess_nation_countries` | 0 | 0 | both 0 (pzzad may be RLS-masked) |
| `guess_nation_daily` | 0 | 0 | both 0 (pzzad may be RLS-masked) |
| `guess_nation_scores` | 0 | 0 | both 0 (pzzad may be RLS-masked) |
| `nascar_drivers` | 83 | 0 | differs (pzzad 0 may be RLS-masked) |
| `question_reports` | 0 | 0 | both 0 (pzzad may be RLS-masked) |
| `tennis_daily` | 0 | 0 | both 0 (pzzad may be RLS-masked) |
| `tennis_players` | 40 | 40 | match |
| `tennis_scores` | 0 | 0 | both 0 (pzzad may be RLS-masked) |
| `user_roles` | 0 | 0 | both 0 (pzzad may be RLS-masked) |

**Different counts:** `nascar_drivers` (flawu 83 vs pzzad 0).

The three resync puzzle tables (`connections_puzzles` 250, `baseball_connections_puzzles`
60, `tennis_players` 40) **match** — confirming the pzzad-resync seed files were applied.

---

## 3. Tables ONLY in pzzad (not in flawu)

These exist on the live database but not in flawu. They are the live site's **user data and
gameplay-state tables** (scores, selections, daily puzzles, profiles, votes, brackets) that
accumulate in production and were never part of flawu. They should stay pzzad-only — there
is nothing to "move" for these. Counts are anon-visible only (caveat #1).

| Table | pzzad rows (anon-visible) |
|---|--:|
| `cbb_daily` | 0 |
| `cbb_scores` | 0 |
| `college_grid_selections` | 0 |
| `college_guess_scores` | 0 |
| `daily_badges` | 0 |
| `daily_completions` | 8 |
| `fantasy_draft_daily` | 51 |
| `fantasy_draft_votes` | 0 |
| `football_grid_selections` | 0 |
| `hof_votes` | 103 |
| `medal_games_scores` | 0 |
| `nascar_chain_scores` | 0 |
| `nascar_daily` | 0 |
| `nascar_scores` | 0 |
| `profiles` | 0 |
| `saved_brackets` | 5 |
| `soccer_career_clubs` | 81 |
| `soccer_careers` | 0 |
| `soccer_club_guess_scores` | 0 |
| `soccer_grid_selections` | 0 |
| `tennis_chain_scores` | 0 |
| `ufc_chain_scores` | 0 |
| `user_best_scores` | 0 |
| `user_game_scores` | 0 |
| `user_preferences` | 0 |
| `user_scores` | 0 |

---

## Appendix — full per-table listing

### flawu (162 tables)

| Table | flawu rows | in pzzad? | pzzad rows |
|---|--:|:--:|--:|
| `all_star_selections` | 0 | NO | — |
| `ballon_dor` | 0 | NO | — |
| `baseball_connections_puzzles` | 60 | yes | 60 |
| `boxing_career_records` | 44 | NO | — |
| `boxing_champions` | 905 | NO | — |
| `boxing_champions_v2` | 1,649 | NO | — |
| `boxing_major_fights` | 891 | NO | — |
| `boxing_title_fights` | 1,436 | NO | — |
| `bref_nba_player_seasons` | 30,462 | NO | — |
| `career_players` | 151 | NO | — |
| `career_records` | 800 | NO | — |
| `career_seasons` | 1,726 | NO | — |
| `cbb_awards` | 903 | NO | — |
| `cbb_conference_tournament_champions` | 325 | NO | — |
| `cbb_naismith_winners` | 103 | NO | — |
| `cbb_programs` | 24 | yes | 24 |
| `cbb_wooden_award` | 204 | NO | — |
| `cfb_all_americans` | 1,236 | NO | — |
| `cfb_ap_poll_final` | 202 | NO | — |
| `cfb_awards` | 850 | NO | — |
| `cfb_bowl_games` | 1,972 | NO | — |
| `cfb_bowl_results` | 305 | NO | — |
| `cfb_champions` | 318 | NO | — |
| `cfb_heisman_winners` | 0 | NO | — |
| `cfb_national_champions` | 39 | NO | — |
| `cfb_qb_stats` | 5,800 | NO | — |
| `cfb_rankings` | 207 | NO | — |
| `cfb_rb_stats` | 14,800 | NO | — |
| `college_athletic_facts` | 89 | NO | — |
| `conference_championships` | 749 | NO | — |
| `connections_puzzles` | 250 | yes | 250 |
| `cricket_championships` | 143 | NO | — |
| `esports_championships` | 70 | NO | — |
| `f1_constructors` | 213 | NO | — |
| `f1_constructors_full` | 214 | NO | — |
| `f1_driver_standings` | 3,095 | NO | — |
| `f1_drivers` | 720 | NO | — |
| `f1_drivers_full` | 879 | NO | — |
| `f1_race_results` | 860 | NO | — |
| `fantasy_draft_players` | 0 | yes | 0 |
| `golf_awards` | 1,339 | NO | — |
| `golf_major_results` | 502 | NO | — |
| `golf_majors` | 526 | NO | — |
| `golf_team_events` | 415 | NO | — |
| `guess_nation_countries` | 0 | yes | 0 |
| `guess_nation_daily` | 0 | yes | 0 |
| `guess_nation_scores` | 0 | yes | 0 |
| `hall_of_fame` | 2,782 | NO | — |
| `halls_of_fame` | 0 | NO | — |
| `href_nhl_player_seasons` | 0 | NO | — |
| `individual_awards_v2` | 4,798 | NO | — |
| `lahman_allstar` | 5,454 | NO | — |
| `lahman_appearances` | 110,423 | NO | — |
| `lahman_awards_managers` | 179 | NO | — |
| `lahman_awards_players` | 6,531 | NO | — |
| `lahman_awards_share_managers` | 425 | NO | — |
| `lahman_awards_share_players` | 6,879 | NO | — |
| `lahman_batting` | 110,495 | NO | — |
| `lahman_batting_post` | 15,879 | NO | — |
| `lahman_college_playing` | 17,350 | NO | — |
| `lahman_fielding` | 147,080 | NO | — |
| `lahman_fielding_of` | 12,028 | NO | — |
| `lahman_fielding_of_split` | 34,563 | NO | — |
| `lahman_fielding_post` | 15,063 | NO | — |
| `lahman_hof` | 4,191 | NO | — |
| `lahman_home_games` | 3,195 | NO | — |
| `lahman_managers` | 3,684 | NO | — |
| `lahman_managers_half` | 93 | NO | — |
| `lahman_parks` | 255 | NO | — |
| `lahman_people` | 20,673 | NO | — |
| `lahman_pitching` | 49,430 | NO | — |
| `lahman_pitching_post` | 800 | NO | — |
| `lahman_salaries` | 26,428 | NO | — |
| `lahman_schools` | 1,207 | NO | — |
| `lahman_series_post` | 367 | NO | — |
| `lahman_team_franchises` | 120 | NO | — |
| `lahman_teams` | 2,985 | NO | — |
| `lahman_teams_half` | 52 | NO | — |
| `league_champions` | 1,600 | NO | — |
| `mlb_batting_stats` | 2,000 | NO | — |
| `mlb_draft_picks` | 1,710 | NO | — |
| `mlb_pitching_stats` | 7,401 | NO | — |
| `mlb_players` | 2,280 | NO | — |
| `mma_fighter_careers` | 86 | NO | — |
| `nascar_champions` | 77 | NO | — |
| `nascar_cup_races` | 72 | NO | — |
| `nascar_driver_careers` | 103 | NO | — |
| `nascar_drivers` | 83 | yes | 0 |
| `nascar_race_results` | 2,104 | NO | — |
| `nascar_teams` | 25 | NO | — |
| `national_team_squads` | 2,784 | NO | — |
| `nba_all_star_rosters` | 3,376 | NO | — |
| `nba_draft_picks` | 7,013 | NO | — |
| `nba_finals` | 79 | NO | — |
| `nba_player_stats` | 3,227 | NO | — |
| `nba_player_team_seasons` | 0 | NO | — |
| `nba_players_extended` | 500 | NO | — |
| `nba_players_extended_v2` | 5,135 | NO | — |
| `ncaa_basketball_champions` | 382 | NO | — |
| `ncaa_player_stats` | 43,800 | NO | — |
| `ncaa_tournament_games` | 3,348 | NO | — |
| `ncaa_tournament_results` | 2,348 | NO | — |
| `nfl_defense_stats` | 2,963 | NO | — |
| `nfl_draft_picks` | 28,015 | NO | — |
| `nfl_qb_passing_leaders` | 845 | NO | — |
| `nfl_rb_stats` | 999 | NO | — |
| `nfl_team_achievements` | 1 | NO | — |
| `nfl_team_metadata` | 32 | NO | — |
| `nfl_team_seasons` | 2,225 | NO | — |
| `nfl_wr_te_stats` | 1,286 | NO | — |
| `nflfastr_player_stats` | 134,470 | NO | — |
| `nflfastr_rosters` | 60,350 | NO | — |
| `nflfastr_team_stats` | 862 | NO | — |
| `nhl_draft` | 26,138 | NO | — |
| `nhl_draft_picks` | 668 | NO | — |
| `nhl_player_stats` | 6,353 | NO | — |
| `nhl_players` | 1,752 | NO | — |
| `olympic_medalists` | 0 | NO | — |
| `olympic_medals` | 3,426 | NO | — |
| `player_market_values` | 171,567 | NO | — |
| `question_reports` | 0 | yes | 0 |
| `rugby_championships` | 506 | NO | — |
| `shirt_number_puzzles` | 32 | NO | — |
| `soccer_awards` | 871 | NO | — |
| `soccer_club_puzzles` | 79 | NO | — |
| `soccer_continental_finals` | 423 | NO | — |
| `soccer_domestic_cup_finals` | 1,202 | NO | — |
| `soccer_grid_puzzles` | 50 | NO | — |
| `soccer_league_champions` | 1,504 | NO | — |
| `soccer_league_top_scorers` | 222 | NO | — |
| `soccer_player_career_paths` | 587 | NO | — |
| `soccer_player_careers_expanded` | 175 | NO | — |
| `soccer_player_facts` | 96 | NO | — |
| `sports_awards` | 1,655 | NO | — |
| `stanley_cup_finals` | 0 | NO | — |
| `stanley_cup_finals_v2` | 109 | NO | — |
| `stat_leaders` | 0 | NO | — |
| `super_bowls` | 60 | NO | — |
| `tennis_career_titles` | 26 | NO | — |
| `tennis_daily` | 0 | yes | 0 |
| `tennis_grand_slam_winners` | 2,072 | NO | — |
| `tennis_grand_slams` | 1,017 | NO | — |
| `tennis_players` | 40 | yes | 40 |
| `tennis_scores` | 0 | yes | 0 |
| `tennis_tour_winners` | 1,200 | NO | — |
| `tennis_year_end_no1` | 104 | NO | — |
| `tennis_year_end_rankings` | 104 | NO | — |
| `transfer_path_puzzles` | 20 | NO | — |
| `trophy_winners` | 2,528 | NO | — |
| `ucl_top_scorers_by_season` | 144 | NO | — |
| `ufc_champions` | 3,408 | NO | — |
| `ufc_fights` | 0 | NO | — |
| `ufc_fights_v2` | 3,917 | NO | — |
| `user_roles` | 0 | yes | 0 |
| `wnba_draft_picks` | 724 | NO | — |
| `wnba_finals` | 29 | NO | — |
| `world_cup_matches` | 704 | NO | — |
| `world_cup_player_stats` | 0 | NO | — |
| `world_cup_players` | 10,585 | NO | — |
| `world_records` | 0 | NO | — |
| `world_series` | 121 | NO | — |
| `world_series_v2` | 121 | NO | — |
