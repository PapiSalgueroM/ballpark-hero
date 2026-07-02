# NFL play-by-play sourcing decision

Decision date: 2026-07-02. Status: decided, load deferred until an NFL game needs it.

## The blocker
Several planned NFL game ideas (drive-by-drive trivia, clutch moments, situational stat detective) need play-by-play data. Our database has season and weekly aggregates (nflfastr_player_stats, 134K rows; nflfastr_rosters, 60K) but no play-level table.

## Decision
Source from the nflverse project (the same public project our existing nflfastr_* tables came from). It publishes complete play-by-play for every season since 1999 as CSV/parquet releases on GitHub (nflverse/nflverse-data). Free, public, actively maintained, and license-compatible with descriptive stat use.

## How to load when needed
1. Download the per-season play_by_play_YYYY files (roughly 45k-50k plays each, ~370 columns; we only need ~15: game_id, week, posteam, defteam, qtr, down, ydstogo, yardline_100, desc, play_type, yards_gained, epa, td_player_name, passer, rusher, receiver).
2. Trim columns before loading; one season of trimmed plays is ~10-15 MB, well within Supabase free-tier limits if we load 5-10 modern seasons rather than all 25.
3. Create table nfl_plays with RLS public-read like every other table, load via the Supabase SQL editor or MCP in batched inserts.
4. Start with 2020-2025 (6 seasons, ~300K plays) and expand only if a game needs history.

## What stays blocked until then
Nothing currently live. NFL games that only need player/roster/season data (17-0 Perfect Season, grids, draft guesser) are unblocked already and shipped.
