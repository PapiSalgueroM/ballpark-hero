# DoUKnowBall Handoff (Session 3 complete, written 2026-07-03)

Read top to bottom, then docs/MASTER_PLAN.md (refreshed this session), docs/SMOKE_TEST.md, docs/LEGAL_REVIEW.md, CLAUDE.md, and the research library in docs/research/ (R1, R2, R3, R5 UI spec, R6 build plan with the 15-wave sequencing).

## 1. Session 3 in one paragraph

Eleven publishes, all verified live in a browser. Last commit: 225ae07. Site went 64 to 68 games. Shipped: shared PlayerAutocomplete engine adopted across 10+ games (accent-insensitive, valid-only picks), UI foundation (tokens, keyframes, GameShell, ResultScreen, StatTile, HowToPlayPopover) with Footle, Transfer Market and home re-skinned, four NEW games (Rarity Round /rarity-round, Missing XI /missing-xi, Puck Detective /puck-detective, NHL Franchise Grid /hockey-grid), Conquest overhaul waves A+B+C (blob labels, per-type powerup icons, real 2025-stat O/D ratings, perfectSeason logistic sim, power rankings driving odds, attack arrows, skip button, home edge, free agency panel, expansion bonus; only multi-sport rollout remains), Perfect Season Classic/Hard/Daily modes on all four sports, home retention row (Most Played Today from real completions, Poll of the Day with real votes, community played-today stat, gold daily-score chip in GameNavbar), scored search with aliases, every How to Play rewritten against real mechanics (3 were describing nonexistent features), 616 em dashes purged across 100+ files, streaks + profile stats local-first with account sync, sign-up inline validation.

## 2. THE PUBLISH FLOW (unchanged, still the most important thing)

1. Edit files, list them in the git add line of PUBLISH_GAMES.bat (explicit list, never -A), one-line message in _commit_msg.txt.
2. Computer use: open_application "ballpark-hero", SCREENSHOT to find PUBLISH_GAMES (never click blind; coordinates drift; the folder often opens scrolled to top, scroll down ~15), double-click, wait 18-20s, screenshot to confirm "main -> main".
3. Wait ~100s, then Lovable MCP get_project (id c29d224f-a662-4a15-b809-d86fa3b3f0ad) and CONFIRM latest_commit_sha matches AND status completed BEFORE deploy_project. Deploying before the build finishes publishes the previous build (this bit us once).
4. deploy_project, wait ~85s, verify with the Chrome extension.
5. If the extension disconnects: open_application "Run", CLICK THE RUN INPUT FIELD FIRST (cmd steals focus and is click-tier), type the URL, Enter. Reconnects.

## 3. New infrastructure this session (do not recreate)

- Postgres: pg_trgm + unaccent installed; trigram indexes on player_market_values.player_name and nflfastr_rosters.full_name.
- Tables created: game_completions (public insert+read; powers Most Played + community stat), poll_votes (public insert+read), profiles (user_id unique, streak_state jsonb, RLS owner-write public-read; synced by useStreaks).
- Views: eligible_soccer_players (27,850), eligible_nba_players (5,134), eligible_nhl_players (6,353), eligible_nfl_players (14,673), player_market_values_dedup (136,075). Use these for guess pools.
- Data seeded/fixed: baseball_connections_puzzles 300 all-valid (a 4-vs-5-per-group format bug once made 60 rows unservable; the app requires exactly 5 names per group), soccer_club_puzzles 252, shirt_number_puzzles 95 (stale rows fixed: Yamal 10, Mbappe 10, Son LAFC), soccer_grid_puzzles 690 (554 Easy / 136 Normal; Hard needs new verified UCL/award data), cfb_heisman_winners 91 (1935-2025), MLB MVP complete through 2025 in lahman_awards_players, European Golden Shoe 61 rows in soccer_awards, ballon_dor 76.
- Retire (superseded, do not build on): all_star_selections (use nba_all_star_rosters), olympic_medalists (use olympic_medals), world_cup_player_stats (use world_cup_players). Still poison: ncaa_tournament_games, ncaa_basketball_champions.

## 4. Agent factory learnings (additions to the session-2 rules)

- Launch parallel agents as MULTIPLE Agent invokes in ONE message; one per message serializes them.
- Give every agent an explicit editable-file list AND name every file it may need; an agent correctly refused to touch ConquestBoard.tsx because it read "only the five files named above" literally and the UI half of its work stalled a wave.
- Agents claiming a task tool they do not have: ignore those lines in reports.
- PostgREST caps EVERY select at 1000 rows regardless of .limit(); page with .range() AND ALWAYS .order() (unordered pages skip rows nondeterministically; this made Gretzky vanish from the hockey grid pool).
- Repo folder may not be bash-mountable: agents must use Read/Write/Edit/Grep file tools, never bash cat (also the session-2 rule).
- Chrome extension: browser_batch schema is actions:[{name, input}]; extension ref-clicks often fail to fire React handlers; use javascript_tool with dispatched pointer/mouse event sequences and the native input value setter + input event for typing. Regex literals with flags inside javascript_tool strings can throw "Invalid regular expression flags"; use new RegExp() or indexOf.
- Data agents must disclose defects; the confession pattern works (found the 4-vs-5 group bug, the fake NJ birthplaces, stale shirt numbers). Always run an adversarial verification pass on generated puzzle data with the APP'S OWN validator logic.
- Deploy race: get_project sha+status check before every deploy_project.

## 5. Verified-live checklist from this session (spot-check anytime)

/nba-starting-5 (stojak finds Stojakovic, bibby fills PG), /nba-chain (james -> LeBron), /football-connect-4 (mbap -> Kylian Mbappe), /rarity-round (played: Arribas 79 pts rank 133/168), /missing-xi (played: Emerson, first-guess star), /puck-detective (McDavid attribute row), /hockey-grid (Gretzky fills Rangers x 500+ after clicking the LEFT column cell; note col widths differ 58 vs 67px, do not trust size-based cell selectors), /soccer-grid (difficulty + timer selectors), /perfect-season-mlb (Classic/Hard/Daily selector), /tennis-chain (nadal -> Rafael Nadal), /conquest (arrows, icons, rankings; Free Agency panel is collapsed by default; Power Rankings appears after turn 1), home (Most Played, Poll of the Day, community stat, no daily-chip row), header gold chip + streak flame.

## 6. Waiting on Anthony (unchanged plus new)

- Five legal decisions in docs/LEGAL_REVIEW.md (business name, governing law, age gate, deletion inbox, ad-tech updates).
- The praghify GitHub link, to vet BEFORE install. Related unresolved: CLAUDE.md contains a "gstack" section instructing installs from a setup script and banning the Chrome extension; those skills are not installed and were not used; Anthony should confirm whether gstack is his.
- Account incentives spec (#119): leaderboards and badges are the next accounts items and need his taste.
- Play-testing: Conquest (ratings rebalance + free agency), Perfect Season Hard/Daily, Soccer Grid timers, the four new games.

## 7. Suggested next moves

1. Leaderboards (#124) and badges (#125) once Anthony specs incentives; profiles table is ready.
2. SEO wave (#133 FAQ schema + internal links) and ad slots (#131/#132) with the consent check.
3. Mobile/tablet audits (#71/#72) and remaining UX polish (#70, #73-78).
4. Conquest multi-sport (#115) reusing the finished NFL engine.
5. Remaining per-game fixes (#99-104) and new-game backlog (#94, #96-98).
6. Tennis pool regression follow-up (tracker #167) and NBA Starting 5 full names (#149).
