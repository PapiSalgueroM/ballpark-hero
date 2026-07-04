# DoUKnowBall MASTER HANDOFF (end of Session 3, written 2026-07-03 evening)

This file supersedes HANDOFF_SESSION2.md and HANDOFF_SESSION3.md. Read this top to bottom before doing anything. Companion docs: docs/MASTER_PLAN.md (item ledger), docs/SMOKE_TEST.md (verification drill), docs/LEGAL_REVIEW.md (owner decisions), docs/INCENTIVES_SPEC.md (streaks/leaderboards/badges rules), docs/research/R1-R6 (competitor teardowns, UI spec, 15-wave build plan), CLAUDE.md (traps).

## 0. FIRST MOVE OF NEXT SESSION (do this before anything)

Three commits are on GitHub but NOT live because Lovable's build got stuck: 29dc2bd (Sign the Player, leaderboards, badges, IP cleanup, Connect 4 boards, NBA Chain round mode, club clues, NBA full names), a2663ed (docs), 1455c08 (NBA Conquest, mobile/loading sweeps, Squad Deal + Who Am I rebalance, era normalization, ad consent). A 26-file code audit found ZERO errors; the stall looks Lovable-side. douknowball.com still serves the last good deploy (commit 3140103) and is healthy.
UNBLOCK: Anthony (or a session with his logged-in Chrome) opens https://lovable.dev/projects/c29d224f-a662-4a15-b809-d86fa3b3f0ad, reads any build error banner, retries the build, then hits Publish. If an actual code error shows, paste it into chat; the fix will be one file.
After unblocking, VERIFY the queued features (section 7 scripts): /sign-the-player, /leaderboard (ZZTEST rows), /conquest-nba, badges on /profile, plus one old page for regressions.

## 1. Project facts

- DoUKnowBall, sports trivia. Live: https://douknowball.com (published snapshot). Preview: https://ballpark-hero.lovable.app.
- Repo on Anthony's machine: C:\Users\lemas\Documents\ballpark-hero. GitHub PapiSalgueroM/ballpark-hero, branch main. Lovable GitHub-sync ON: push rebuilds the PREVIEW only.
- Lovable project id c29d224f-a662-4a15-b809-d86fa3b3f0ad (workspace lcpFIbMcbgKPrZrTKCUf). FREE PLAN, 0 credits: NEVER use the Lovable AI agent (send_message/create_project). deploy_project and get_project are fine.
- Supabase project flawuiqbvjobmkfkauhw (the ONLY one; pzzadswiradjnvvfybol is deleted). ~165 tables + new ones below. RLS everywhere, public read.
- client.ts hardcodes and exports the live URL + anon key ON PURPOSE (Lovable injects env vars pointing at the deleted project). Never reintroduce VITE_ env reads for Supabase.
- Anthony's Fable cap blocks default agents: ALWAYS pass model "sonnet" to the Agent tool.
- 70 games registered (69 visible + Golf empty category). Last verified-live deploy: commit 3140103. HEAD: 1455c08.

## 2. THE PUBLISH FLOW (two steps, plus the traps we hit)

1. Edit files with Read/Write/Edit tools. List EVERY changed file in the single git add line of PUBLISH_GAMES.bat; one-line message in _commit_msg.txt (write it fresh each publish; agents sometimes update it too).
2. Computer use: request_access (File Explorer, ballpark-hero, Command Prompt at click tier, Run). open_application "ballpark-hero", SCREENSHOT FIRST (folder often opens scrolled to top; scroll down ~15 to reach PUBLISH_GAMES; coordinates drift between opens; a blind click once selected README instead). Double-click PUBLISH_GAMES, wait 18-20s, screenshot, CONFIRM the "main -> main" push line AND the commit line lists real files.
3. TRAP (cost us a silent no-op publish): if ANY path in the git add line does not exist, git add aborts and the run prints "no changes added to commit" + "Everything up-to-date" while still saying DONE. Always read the output screenshot for the commit hash line.
4. Wait ~100s. Call Lovable get_project and confirm BOTH latest_commit_sha == your commit AND the screenshot/preview looks built. TRAP: get_project can report status completed with sha current while the preview shows "Preview has not been built yet" (stale or failed build). Deploying then publishes the PREVIOUS build. The tokened embed_url from get_project renders the truth; a 404 on a route that should exist means old build.
5. deploy_project (id above), wait ~85s, verify live on douknowball.com with the Chrome extension (get_page_text cheap; javascript_tool for interactions).
6. Chrome extension quirks: browser_batch schema is actions:[{name, input}]. Extension ref-clicks often fail to fire React handlers; use javascript_tool with dispatched pointerdown/mousedown/mouseup/click sequences and the native input value setter + input event for typing. Regex literals with flags inside javascript_tool strings can throw; use new RegExp() or indexOf. If the extension disconnects: open_application "Run", CLICK THE RUN INPUT FIELD FIRST (cmd steals focus and is click-tier), type URL, Enter.
7. The cmd window is click-tier (no typing). Old paused cmd windows pile up; closing via X is allowed.
8. Data changes (SQL inserts) are live instantly, no publish needed. Edge function changes need Supabase MCP deploy_edge_function (nba-connect4-validate is at v2).

## 3. What is LIVE and verified on douknowball.com right now (build 3140103)

Everything through publish 13: 68 games; shared PlayerAutocomplete (accent-insensitive, valid-only) adopted on NBA Starting 5 (full names pending in queued build), NBA Chain, both Connect 4s, Build Your XI, NFL Grid, NFL Career, tennis + NASCAR chains, Missing XI, Rarity Round, Puck Detective, Hockey Grid, Sign-the... (Sign the Player is QUEUED, not live). New games live: Rarity Round, Missing XI, Puck Detective, NHL Franchise Grid. Conquest NFL fully overhauled (blob labels, icons, real ratings, logistic sim, power rankings, arrows, skip, home edge, free agency, expansion bonus). Perfect Season Classic/Hard/Daily on 4 sports. Soccer Grid difficulty+timers+overtime. Home: Most Played (real completions), Poll of the Day (real votes), community played-today stat, no daily-chip row, scored search with aliases. Header: gold daily chip + streak flame. Streaks local-first + profiles sync. Footle animations, Career Quiz tiers, Career Ladder daily, SEO FAQ schema + sibling links, share text with emoji grid + URL, Play Next variety + midnight countdown, every How to Play rewritten, em dashes purged.

QUEUED (on GitHub, will go live when Anthony unblocks Lovable): Sign the Player (/sign-the-player), leaderboards page rebuild + score pipeline, 11 badges on profile, IP cleanup (ESPN NBA logos + Wikipedia crests removed from NbaTeamSpinner/TeamSpinner), Connect 4 new boards (Well Traveled, Draft Pedigree), NBA Chain round-vs-par mode, Guess the Club notable-player clue tier, NBA Starting 5 full names, NBA Conquest (/conquest-nba), mobile sweep fixes, loading/error sweep (incl. GuessTheNation blank-screen fix), Squad Deal rebalance, Who Am I tuning, Perfect Season era factors + framing, ad consent gating (Essential-only).

## 4. Database infrastructure (do not recreate)

- Extensions: pg_trgm, unaccent. Trigram GIN indexes on player_market_values.player_name and nflfastr_rosters.full_name.
- Tables created this session: game_completions (game, completed_on, created_at, score int null, player_name text null; RLS public insert+read; powers Most Played, community stat, leaderboards; 5 seeded ZZTEST-* rows ids 37-41 for leaderboard testing, delete when real data flows), poll_votes (poll_key, choice; public insert+read; 3 test rows on messi-ronaldo-prime), profiles (user_id unique, streak_state jsonb, username/display_name/avatar_url; RLS owner-write public-read; synced by useStreaks).
- Views: eligible_soccer_players (27,850), eligible_nba_players (5,134), eligible_nhl_players (6,353), eligible_nfl_players (14,673), player_market_values_dedup (136,075). Use for guess pools.
- Data seeded/fixed: baseball_connections_puzzles 300 (exactly 5 names per group REQUIRED by the app; a 4-name format bug once hid 60 puzzles), soccer_club_puzzles 252, shirt_number_puzzles 95 (Yamal 10, Mbappe 10, Son LAFC fixed), soccer_grid_puzzles 690 (554 Easy/136 Normal; Hard needs new clean UCL/award sources), connections_puzzles 1000, transfer_path_puzzles 970, cbb_programs 186, cfb_heisman_winners 91 (1935-2025), MLB MVP complete to 2025 in lahman_awards_players, European Golden Shoe 61 rows in soccer_awards (skip winner_name='Not awarded' in gameplay), ballon_dor 76, tennis_players 106 with common_names aliases (8 harmless dup rows flagged).
- POISON, never build on: ncaa_tournament_games (mislabeled 1940s voting data), ncaa_basketball_champions (53% false). Superseded, do not use: all_star_selections (use nba_all_star_rosters), olympic_medalists (use olympic_medals), world_cup_player_stats (use world_cup_players). Left empty deliberately: nba_player_team_seasons, href_nhl_player_seasons, world_records, stat_leaders, fantasy_draft_players (see data agent verdicts in MASTER_PLAN).
- nba_players_extended_v2: first_name/last_name (NO full_name), position codes G/F/C/combos with 68% NULL (treat NULL as eligible), bio/draft only (no stat columns). nhl_player_stats: 6,353 rows, teams = comma franchise codes, career totals only, no goalies. PostgREST caps EVERY select at 1000 rows: page with .range() AND ALWAYS .order() (unordered pages skip rows; this made Gretzky vanish once).
- 22 edge functions ACTIVE; nba-connect4-validate at v2. Redeploy via MCP deploy_edge_function with full file content, verify_jwt true.
- Supabase row counts in list_tables are stale: always select count(*).

## 5. Agent factory playbook (hard-won)

- Model "sonnet" always. Launch parallel agents as MULTIPLE Agent invokes in ONE message (one per message serializes; this was fumbled twice).
- Every agent gets: explicit editable-file whitelist (name EVERY file, including UI hosts like ConquestBoard.tsx, or the agent will rightly stop at the boundary), read-first list, house rules (hooks above returns / no em dashes / no logos-crests-photos / supabase import from '@/integrations/supabase/client' / verify by Read-tool readback, never bash cat), and a terse-report cap.
- Repo is NOT bash-mountable: agents use file tools only. Glob is unreliable on this mount: verify with Read, enumerate with Grep.
- Data agents: INSERT-only by default; narrow UPDATE/DELETE scopes only for named repairs; demand disclosure of defects (the confession pattern caught a format bug, fake facts, stale numbers); verify generated puzzles with the APP'S OWN validator logic; web-verify external facts, 2+ sources.
- Agents may claim task-tool actions they cannot do; ignore those lines. Agent reports can be cut off mid-response ("Connection closed"): their WORK is usually on disk; check files before relaunching, and a fresh agent can finish (state "previous attempt wrote nothing/partial, verified").
- Linux build is case-sensitive; Windows file tools are not. Audit exact import-path casing on new files.
- New games: agent creates exactly lib + page; MAIN session registers (App.tsx import + route, gameRegistry entry) and appends the .bat list.

## 6. Tracker: the 12 open items (everything else in the 168-item list is done)

- #74 GameNavbar sweep for stragglers (grep pages missing GameNavbar/GameShell; small agent).
- #78 CTA audit (dead buttons/mislabels; needs interactive play or careful code audit).
- #80/81/83/84 (one theme): confirm no free-text guess inputs remain anywhere; close all four after a grep audit (most games migrated; these are audit-and-close items).
- #88 difficulty tiers beyond big names sitewide (Career Quiz, Soccer Grid, Rarity Round have them; extend pattern where pools allow).
- #126 Supabase auth email templates + redirect URLs point at douknowball.com (needs the Supabase DASHBOARD, no MCP tool; Anthony or Chrome-with-login).
- #137 Five legal decisions (docs/LEGAL_REVIEW.md; Anthony + maybe a lawyer).
- #147 UI overhaul completion: adopt GameShell/ResultScreen on remaining ~40 older pages (batch agents, 8-10 pages each, publish per batch).
- #152 Edge functions review: read all 22 in supabase/functions/, check input validation + rate limiting (nba-connect4-validate is the good template), patch worst offenders via MCP deploy.
- #168 Lovable unblock (section 0).
- Also flagged inside completed items: index.html loads adsbygoogle.js unconditionally (should be consent-gated; needs index.html edit + publish), AdSense slot IDs look like placeholders (Anthony checks AdSense console), 8 dup tennis rows (optional DELETE cleanup), ZZTEST leaderboard rows (optional cleanup once real scores flow), buildXi.ts/BuildXi.tsx untracked strays in repo (unknown origin, uncommitted, decide keep-or-delete).

## 7. Verification quick scripts (post-unblock)

- /sign-the-player: pick Daily, guess a value, confirm sign/miss verdict + budget math; finish 11 rounds to see squad rating.
- /leaderboard: pick Soccer Grid, Today tab shows ZZTEST-Alpha 950 + Bravo 720 (until cleaned); All-time adds none; empty game shows friendly state.
- /profile: badges grid 11 entries, earned ones lit after playing.
- /conquest-nba: 30 teams render, start, battle shows basketball plays with real names, SAC/SAS/CHA/TOR all have territory; then /conquest NFL one battle to confirm unchanged.
- /nba-starting-5: filled slot shows "First Last".
- /football-connect-4 board cycle to "Well Traveled"; /nba-connect-4 to "Draft Pedigree" (Ben Wallace for Undrafted).
- /guess-soccer-club: clue 5 shows real notable players.
- Cookie banner: "Essential only" button exists; with it chosen, ad slots render "Ads are off" placeholder, no AdSense request.
- Regression trio: /footle, /soccer-grid, / (home) render with no console errors.

## 8. Waiting on Anthony (full list)

1. Lovable editor: read/clear the stuck build, then Publish (#168).
2. Five legal decisions in docs/LEGAL_REVIEW.md (business entity, governing law + venue, COPPA/age-gate posture, deletion inbox, ad-tech list upkeep).
3. Supabase dashboard: auth email templates + Site URL/redirects to douknowball.com (#126).
4. AdSense console: confirm real slot IDs; decide on the outstream video test (#132 follow-up).
5. The praghify GitHub link he mentioned, so it can be vetted BEFORE install (unvetted skills are instruction bundles). Related: CLAUDE.md's "gstack" section tells sessions to install skills via a setup script and to never use the Chrome extension; those skills are not installed, were never used, and Anthony should confirm whether gstack is his or stale/foreign. Until confirmed, do not run that setup script.
6. Play-testing: Conquest (both sports), Perfect Season Hard/Daily, Soccer Grid timers, Sign the Player, Rarity Round, Missing XI, the NHL pair, streak flame, leaderboard, badges. Report anything that feels off; taste calls (banker meanness, rating spreads, difficulty labels) are his to tune.
7. Account incentives: docs/INCENTIVES_SPEC.md is drafted with defaults; edit freely, next session implements deltas.

## 9. Suggested next-session order

1. Section 0 unblock + section 7 verification.
2. Close the audit items (#74, #78, #80/81/83/84 sweep) in one agent wave.
3. index.html consent-gated AdSense loader + placeholder-slot check with Anthony.
4. UI overhaul batches (#147) 8-10 pages at a time, publish per batch.
5. Edge function review (#152).
6. Then new content: NHL/MLB Conquest variants (fork pattern proven), College Grid authored puzzles, Hard-tier soccer grid data, next R6 wave games (Chemistry layer, Pack Battle, guided question-tree).
7. Keep the factory discipline: parallel Sonnet agents, disjoint file scopes, publish in verified batches, update MASTER_PLAN.md at session end.

## 10. FINAL SESSION-3 STATE (written at the very end)

Tracker finished 167 of 168. Everything below is LIVE and verified at commit 28ec0c8: full R5 shell across ~50 pages (10 boards intentionally self-themed), difficulty tiers (Puck Detective 876-pool splits, Who Am I, NHL Grid), navbar on all 16 stragglers, Transfer Path validated autocomplete, consent-gated AdSense (index.html loader + mid-session inject), hardened edge functions v2, and the legal decisions: individual operator d/b/a DoUKnowBall, Massachusetts law + venue, soft COPPA posture, contact = DoUknowBall.com@gmail.com (Anthony must ensure this inbox exists and is monitored).

THE ONLY OPEN ITEM: #126 Supabase auth config. The dashboard serves an EMPTY page to automated tabs (zero DOM, zero console; verified twice), so a human must do it: supabase.com/dashboard > project flawuiqbvjobmkfkauhw > Authentication > URL Configuration > Site URL = https://douknowball.com, add it to redirect allow list, and skim Auth email templates. Two minutes.

## 11. PUBLISH PIPELINE, FINAL FORM (three ghosts, all dead)

1. cmd 8191-char line limit: NEVER extend one git add line; add new short lines (the .bat has a warning comment).
2. Appends can land inside REM comments if someone restructures the .bat; always Read the .bat before editing the add list.
3. CLICKING INSIDE A CONSOLE WINDOW FREEZES THE RUNNING SCRIPT (Windows select mode; title becomes "Select cmd.exe"). Never click a console to "check on it". Use the headless flow instead: run PUBLISH_HEADLESS.bat (wraps PUBLISH_GAMES.bat with output to docs/research/publish_out.txt and stdin from nul so pause exits), then Read publish_out.txt for the commit + push lines. Launch it by double-clicking in Explorer or via the Run dialog. publish_out.txt stays untracked scratch.
