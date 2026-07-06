# THE OPUS MASTER GUIDE TO DOUKNOWBALL

Written 2026-07-06. This is the one document a brand new AI session should read start to finish before touching anything. It replaces the need to read every other doc in the repo, though the source docs (docs/HANDOFF_SESSION4.md, docs/MASTER_PLAN.md, docs/LEGAL_REVIEW.md, docs/INCENTIVES_SPEC.md, docs/research/R1-R6, CLAUDE.md) still exist and can be read for more detail on any single topic. Nothing in those files contradicts this one; if it ever seems to, trust the live site and the live database over any doc, and update this doc.

Plain language throughout. No em dashes (matches the site's own house rule; if this document ever needs an em dash it should use a comma or period instead). Read this whole thing before making any changes, publishing anything, or telling Anthony something is done.

---

## 1. WHO ANTHONY IS AND HOW TO WORK WITH HIM

Anthony (email anthonysalguero3010@gmail.com) owns DoUKnowBall. He is **not a technical person**. He does not read code, does not know what an edge function is, and should never be asked to debug anything. He works entirely through chat and through the live website.

How he actually works:
- He says things like "keep going," "yes do that," or just leaves the room and expects the AI session to run for a long time with full autonomy. He is delegating almost everything. Do not stop and ask permission for routine engineering decisions. Make the call, document it, keep moving.
- His feedback arrives as stream-of-consciousness: a rambling paragraph mixing three unrelated complaints, a vibe check, and a vague idea for a new game, all in one message. The job is to **parse that into concrete, scoped tickets** (see section 9, the open backlog, for what this looks like in practice) rather than trying to action his raw words literally. He will not write you a spec. You write the spec by reading between the lines of what he said and what would actually make the site better.
- He plays the games himself and reports what feels off. Treat his gut reactions as real signal even when he can't articulate the mechanism ("this feels boring," "this game show doesn't have any tension") because he is, in effect, the site's first real playtester.

What he hates (do not build these, and flag them if you see them):
- Inline rules clutter. He does not want walls of rule text jammed into the game itself. Rules belong in a popover/modal, triggered by a clear affordance, not paragraphs sitting in the middle of gameplay.
- Games without a give-up button. If a player gets stuck, they need a clean way to bail out and see the answer, not be trapped.
- Easy bingo. Bingo-style games where the criteria are trivially satisfiable are boring to him; he wants real difficulty, real thinking, real stakes.
- Simple one-mechanic games. A game that is "type a name, get told right or wrong" and nothing else does not hold his interest. He wants layers: scoring nuance, risk/reward, tiers, something to master.

What he loves (lean into these when proposing or building anything new):
- Drama and spice in career-simulation-style games (Soccer Career is the existing example; it got an explicit ask for "outta-pocket event cards" to make the life-sim feel less flat and more chaotic/funny).
- Game-show formats: things modeled on Deal or No Deal, The Chase, Who Wants to Be a Millionaire, Pointless, Family Feud, The Price Is Right. He responded very well to Deal or No Deal: Player Edition and Squad Deal, and the open backlog explicitly calls for more of this genre (see section 9, item on new game-show games).
- Real-event polls. Poll of the Day (soccer matchup polls) is a format he likes; the backlog calls for "Poll of the Day 2.0" with multiple topical daily polls, not just one.

Decision authority: everything is delegated to the AI session by default. The one carve-out is **security-relevant decisions** (auth posture, RLS changes, anything that touches what data is publicly readable or writable, anything that could expose user data) should be flagged to him even if you also make a reasonable default call and move forward. Legal decisions were already made once (see docs/LEGAL_REVIEW.md, all five are resolved and documented in section 8 below) so do not re-litigate those; only flag genuinely new legal or security territory.

Bottom line: act like a trusted, senior, fully-autonomous engineer who happens to report to a non-technical founder. Ship things. Verify things actually work before saying they work. Turn his rambling into a todo list. Don't wait around for him to specify details he isn't equipped to specify; use your judgment and move.

---

## 2. THE STACK AND ACCOUNTS

**Frontend**: React + TypeScript + Vite, styled with Tailwind CSS and shadcn/ui components. Built and hosted through Lovable.

**Lovable**:
- Project id `c29d224f-a662-4a15-b809-d86fa3b3f0ad` (workspace `lcpFIbMcbgKPrZrTKCUf`).
- Preview URL: https://ballpark-hero.lovable.app
- **FREE PLAN, 0 credits.** This is the single most important constraint on the whole project. NEVER use the Lovable AI agent (the "send_message" / "create_project" style tools, or the "Add agent integrations," "Try to fix," or "Try to fix all" buttons in the Lovable editor UI). Every one of those either costs credits you don't have or runs an autonomous agent that can push its own commits without asking. See incident 2026-07-05 in section 8a: someone clicked into the Lovable AI agent from the editor and it pushed two unreviewed commits (including a whole MCP integration nobody asked for) that had to be reverted.
- The Lovable MCP tools `get_project` and `deploy_project` are safe and expected to be used constantly; they are read-only or trigger a deploy of code that is already reviewed and on GitHub. Never confuse these with the AI-agent tools.

**Supabase** (Postgres backend):
- Project ref `flawuiqbvjobmkfkauhw`. This is the ONLY live Supabase project. A second project, `pzzadswiradjnvvfybol`, existed earlier and was deleted; it is dead and must never be referenced. If you ever see an env var, config value, or stray reference pointing at `pzzadswiradjnvvfybol`, that is a bug, not a valid alternative target.
- RLS (row level security) is enabled on every public table, with public read-only policies as the default posture. A couple of tables (`game_completions`, `poll_votes`) also allow public INSERT because they are the write path for anonymous gameplay data (completions, poll votes). This is intentional, not a hole.

**GitHub**: `PapiSalgueroM/ballpark-hero`, public repo, branch `main`. Lovable's GitHub sync is ON, meaning every push to `main` automatically triggers a PREVIEW rebuild on Lovable. This is the entire mechanism by which code changes reach Lovable; there is no separate "upload" step.

**Domains**:
- `https://douknowball.com` is the **published snapshot**. This is what real players and Google see. It does NOT move just because you pushed to GitHub.
- `https://ballpark-hero.lovable.app` is the **preview**. This moves automatically about 1-2 minutes after a GitHub push, assuming the build succeeds.
- These two can and do drift apart. The single most expensive mistake possible on this project is forgetting to publish after pushing: the live site once served a stale June build for weeks while GitHub and the preview were both current, because the final Publish step was skipped. See section 3 for the exact ritual that prevents this.

**Local repo**: `C:\Users\lemas\Documents\ballpark-hero` on Anthony's machine. This is a real filesystem path, not a sandbox; edits here are edits to the actual source of truth.

---

## 3. THE PUBLISH PIPELINE, EXACT RITUAL

This is the part of the job with the most ways to fail silently. Follow it exactly, in order, every time.

### Step 1: Edit the files
Use Read/Write/Edit tools directly on the repo at `C:\Users\lemas\Documents\ballpark-hero`. Standard file editing, nothing special here.

### Step 2: Stage the publish batch
1. Open `PUBLISH_GAMES.bat` and add the path of every changed file to the `git add` line(s).
   - **Keep each `git add` line SHORT.** cmd.exe has an 8191-character line limit. Never extend one giant `git add` line; add a new short line instead. The .bat file has a comment warning about this; respect it.
   - **If ANY path in a `git add` line does not exist, that entire `git add` invocation silently aborts and adds nothing**, while the script still prints "DONE" at the end. This is the single most dangerous trap in the whole pipeline: a typo'd path can produce a completely silent no-op publish that looks successful. Always double check every path you add is exactly correct (case matters conceptually even though Windows itself is not case-sensitive; the actual Linux build environment is, so get the casing right).
   - If someone has ever restructured the .bat file, some appends can land inside a REM (comment) line by accident. Always Read the .bat file before editing it to confirm you're appending to a live `git add` line, not a comment.
2. Write a single, fresh, one-line commit message into `_commit_msg.txt`. Do this every publish; do not assume the old message is still appropriate.

### Step 3: Run the publish script HEADLESSLY
- Run `PUBLISH_HEADLESS.bat`, not `PUBLISH_GAMES.bat` directly. `PUBLISH_HEADLESS.bat` wraps the real script, redirects all output to `docs/research/publish_out.txt`, and feeds stdin from `nul` so the trailing `pause` doesn't hang waiting for a keypress.
- Launch it by **double-clicking it in File Explorer**, or via the Windows Run dialog. Do not launch it in a way that leaves an interactive console window in front of you.
- **NEVER click inside a console window that is running this script**, even just to "check on it." Clicking inside a Windows cmd.exe window puts it into Quick Edit / Select mode (the title bar literally changes to "Select cmd.exe"), which **freezes the running process** until something presses a key to release selection mode. This has cost real time before. If you need to check progress, read `docs/research/publish_out.txt` instead of looking at the console.
- Wait roughly 18-20 seconds for the script itself to finish its local git work.

### Step 4: Verify the commit and push actually happened
- Read `docs/research/publish_out.txt`. Confirm:
  - The commit line shows a real commit hash and a commit message that matches what you expect, listing real files (not "no changes added to commit").
  - The push line shows something like `<old-sha>..<new-sha>  main -> main`, not "Everything up-to-date."
- If the output shows "no changes added to commit" plus "Everything up-to-date" while still printing "DONE," that is the silent-no-op failure from Step 2. Go back, find the bad path, fix it, and re-run.

### Step 5: Wait for Lovable to build the preview
- Wait about 100 seconds after a confirmed push.
- Call the Lovable MCP `get_project` tool (project id `c29d224f-a662-4a15-b809-d86fa3b3f0ad`).
- Confirm BOTH of these are true:
  1. `latest_commit_sha` equals the commit hash you just pushed.
  2. The build status is `completed` AND the embedded preview screenshot/URL actually reflects a working, current build.
- **Trap**: `get_project` can report `status: completed` with the correct sha while the actual preview still shows "Preview has not been built yet," or shows an old/broken build. The status field lies more often than you'd like. Always sanity check the screenshot or hit an actual route that should exist (if it 404s or looks wrong, the "completed" status was misleading).
- If you deploy while the preview is actually stale or unbuilt, you will publish the WRONG (previous) build to production. Do not skip this verification step to save time.

### Step 6: Deploy to production
- Call the Lovable MCP `deploy_project` tool with project id `c29d224f-a662-4a15-b809-d86fa3b3f0ad`.
- Wait about 85 seconds.
- **This step is not optional and is not implied by the push.** Pushing to GitHub only ever updates the preview. `douknowball.com` serves whatever was last explicitly deployed/published, and stays frozen on that old version indefinitely if you forget this step. This exact mistake once caused the live site to serve a June build for weeks.

### Step 7: Verify live
- Confirm the change is really live on `https://douknowball.com` (not just the preview). Use whatever browsing tool is available in the session (see the gstack note below) to load the actual page and confirm the change is visible and functional.
- Do not mark anything "done" to Anthony without this live verification. See section 10 for the full verification bar.

### Important exceptions: things that do NOT need this whole pipeline
- **Database-only changes** (SQL inserts/updates through the Supabase MCP `execute_sql` or `apply_migration` tools) are live **instantly**. No git commit, no push, no deploy needed. If you add 50 new puzzle rows to a table, they are live the moment the INSERT completes.
- **Edge function changes** need their own path: redeploy through the Supabase MCP `deploy_edge_function` tool, passing the full file content and `verify_jwt: true`. This is separate from and does not require the git/Lovable pipeline at all.

---

## 4. HOUSE RULES (verbatim, apply to everything you touch)

- **Hooks above conditional returns.** Every React hook (`useState`, `useEffect`, etc.) must execute unconditionally, before any early `return`. An early loading-state return placed above a hook throws React error #310 in production. This exact bug hit TransferPathBoard once (the loading check sat above a `useState`). Audit for this pattern specifically whenever touching or reviewing a page component.
- **No em dashes anywhere in user-facing copy.** Site copy, How to Play text, result screens, everything. Use a comma, a period, or restructure the sentence. This has already been enforced through a full sitewide purge (616 replaced across 102 files in one earlier pass, plus a follow-up cleanup pass); do not reintroduce them.
- **No logos, no crests, no athlete photos.** Flags and plain text only. This is a hard IP-safety rule, not a style preference: no team logos, no club crests, no player photos or likenesses anywhere on the site, in any game, ever. Stats, names, flags, colors, and game mechanics are all fine; visual trademarks and photos are not.
- **Supabase import path is fixed.** Always import `SUPABASE_URL` / `SUPABASE_PUBLISHABLE_KEY` from `@/integrations/supabase/client`, never read `import.meta.env.VITE_SUPABASE_*` directly. `client.ts` hardcodes the real project URL and public anon key ON PURPOSE, because Lovable's build injects `VITE_SUPABASE_*` env vars that point at the deleted `pzzadswiradjnvvfybol` project. Reading those env vars directly breaks every database call in production while looking completely fine locally. This is documented at length in section 8's incident history because it caused a real outage.
- **PostgREST caps every `select` at 1000 rows.** Any query against a large table must page with `.range()` and must ALWAYS include an `.order()` clause. An unordered paginated query can silently skip rows between pages (this is exactly how Gretzky once vanished from an NHL query result). Never assume default row order is stable across paginated calls.
- **Every dialog needs backdrop-click-to-close, Escape-to-close, and an explicit X button.** No modal should be a dead end. This applies to How to Play popovers, rules modals, any confirmation dialog.
- **Mobile-first, roughly 380px as the reference width.** Design and test at phone width first. A meaningful share of the real player base is on a phone screenshotting a result screen, not a desktop browser.
- **Valid-only autocomplete everywhere, with exactly one documented exception.** Every player/team/entity input across the site should be constrained to a real, valid entity from that game's eligible pool; free-text guesses that can't resolve to a real answer should not be submittable. The one deliberate exception is Alphabet Sprint, where typed-but-not-yet-matched 2-letter suggestions are wanted as part of that specific game's pacing; do not "fix" that one to match the rest of the site.
- **CORS `allowedOrigins` in every edge function must include both `douknowball.com` and `www.douknowball.com`.** This was missed sitewide until a fix on 2026-07-06 (see section 8, CORS incident) added it to all 17 (see the discrepancy note in section 6) live edge functions in one pass. Any new edge function must include both origins from the start, or API calls from the live site will silently fail with CORS errors while working fine from the Lovable preview or localhost.

---

## 5. AGENT FACTORY (how to run sub-agents on this project)

This project is run by fanning work out to sub-agents (via the `Agent` tool) rather than doing everything in the main session. Hard-won rules for doing that well:

- **Always pass `model: "sonnet"` explicitly.** Anthony's account has a "Fable" cap that blocks default-model agents from running at all. If you don't pass `sonnet` explicitly, the agent can silently fail to do useful work or not run as expected.
- **Launch parallel agents as multiple `Agent` tool calls inside ONE message.** If you send them one message at a time, they serialize instead of running in parallel, which defeats the entire point of fanning out. This has been fumbled before; watch for it.
- **Give every agent an explicit editable-file whitelist.** Name every single file the agent is allowed to touch, including shared UI host files it might need to update (for example, a board component like `ConquestBoard.tsx` that a new-game agent needs to wire into, not just the new files it's creating). If a file isn't named, a well-behaved agent will correctly refuse to touch it, which is good, but only if you actually named every file it legitimately needs.
- **Give every agent a read-first instruction list** (which files to read before writing anything) plus the house rules from section 4 (hooks above returns, no em dashes, no logos/crests/photos, correct Supabase import path, read-tool verification instead of bash `cat`).
- **Require DEFECT CONFESSION.** Every data-generation or content-authoring agent must be explicitly told to disclose any defect it finds or introduces (a format bug, a fabricated fact, a stale number) rather than silently working around it or hiding it. This pattern has caught real bugs before (a puzzle format bug, fabricated facts in generated content, stale numbers).
- **Verify agent claims; do not trust them at face value.** Agents sometimes claim to have taken actions they do not actually have the tools to perform. Always check the actual files/state after an agent reports success, the same way you'd verify any contractor's work.
- **The repo is not bash-mountable for agents.** Sub-agents must use file tools (Read/Write/Edit/Grep) only, not shell commands against the repo.
- **Glob is unreliable on this mount.** Enumerate files with Grep or targeted Read calls instead of trusting Glob to find everything; it has produced empty or incomplete results against real, existing files during this project (this guide's own authoring process hit that directly: Glob returned nothing for files that Grep and direct Read both found seconds later).
- **Data agents default to INSERT-only.** Grant UPDATE/DELETE scope only for a specifically named repair task, never as a blanket permission. Demand web-verification (2+ independent sources) for any external fact an agent introduces, and demand the agent validate generated content against the actual app's own validator logic, not just "looks plausible."
- **Agent reports can be truncated mid-response** ("Connection closed" or similar). The agent's actual work is usually still on disk even if the final summary got cut off. Before relaunching a fresh agent for the same task, check the files it was supposed to produce; a fresh agent can often finish the job faster if told explicitly "a previous attempt wrote nothing / partial work here, verified as follows."
- **New-game division of labor**: a content/build agent creates exactly the new page component plus its supporting lib/hook file(s). The MAIN session (not the sub-agent) is responsible for registering the new game: the `App.tsx` import and `<Route>`, the `gameRegistry.ts` entry, and appending the new files to the publish batch. Keeping registration centralized in the main session avoids conflicting edits to shared files like `App.tsx` when multiple game-building agents run in parallel.

---

## 6. DATABASE MAP

Supabase project `flawuiqbvjobmkfkauhw`. Row counts below were pulled live via `execute_sql` on 2026-07-06; **table-list row counts shown anywhere else (including the Supabase dashboard's own table list) can be stale, always trust a live `select count(*)`.**

### Core app-infrastructure tables (own data, not sourced from any dataset)

| Table | Rows | Purpose |
|---|---|---|
| `game_completions` | 198 | Every completed game run: `game` (slug), `completed_on` (date), `created_at`, `score` (nullable int), `player_name` (nullable text). RLS: public INSERT and SELECT. Powers Most Played, the community completions stat, and both leaderboard tabs. |
| `poll_votes` | 32 | `poll_key`, `choice`, `created_at`. RLS: public INSERT and SELECT. Powers Poll of the Day. |
| `profiles` | 0 (still empty; populates only when a signed-in user's streak syncs) | `id`, `user_id` (unique), `username`, `display_name`, `avatar_url`, `streak_state` (jsonb), `created_at`, `updated_at`. RLS: owner-write, public-read. |
| `user_preferences` | 0 | `id`, `user_id`, `favourite_game`, `favourite_team`, `favourite_player`, `time_spent_minutes`, timestamps. Exists but currently unused/empty; not a bug, just not wired to a write path yet. |
| `user_roles` | 0 | `id`, `user_id`, `role` (enum). Exists, empty, no admin-role assignment flow currently exercising it. |
| `question_reports` | 2 | `id`, `game_type`, `game_context` (jsonb), `description`, `resolved`, `resolved_at`, `created_at`. Backs the in-game "Report" button (`src/components/game/ReportQuestion.tsx`), which Privacy Policy Section 8 also references. |

### Key views (read-only, used for valid-guess pools)

- `eligible_soccer_players` (27,850 as of last handoff check)
- `eligible_nba_players` (5,134)
- `eligible_nhl_players` (6,353)
- `eligible_nfl_players` (14,673)
- `player_market_values_dedup` (136,075)

These views all have `security_invoker = true` set (a security-advisor-driven fix; see section 8). Use these views, not raw joins against the underlying tables, wherever a game needs a "what counts as a valid guess" pool.

### Data health notes (do not rebuild what already works, do not trust what's poisoned)

- **POISON, never build anything new on these**: `ncaa_tournament_games` (mislabeled 1940s voting data mixed in with real rows) and `ncaa_basketball_champions` (53% false positive rows, including fully fabricated champions like a fake Columbia 1951 or Vermont 1992). Any future NCAA-tournament-flavored game or grid category must either build a strict junk filter first or find/clean a different source; do not query these tables directly for anything player-facing.
- **Superseded, use the newer table instead**: use `nba_all_star_rosters` instead of `all_star_selections` (0 rows, dead); use `olympic_medals` instead of `olympic_medalists` (0 rows, dead); use `world_cup_players` instead of `world_cup_player_stats` (0 rows, dead); use `boxing_champions_v2`/`ufc_fights_v2`/`world_series_v2`/`stanley_cup_finals_v2` over their non-v2 counterparts where both exist (several non-v2 versions, like `stanley_cup_finals` and `ufc_fights`, are literally 0 rows now, fully dead husks left over from a migration).
- **Left empty on purpose (not a bug to fix reflexively)**: `nba_player_team_seasons`, `href_nhl_player_seasons`, `world_records`, `stat_leaders`, `fantasy_draft_players`, `all_star_selections`, `olympic_medalists`, `world_cup_player_stats`, `halls_of_fame` (all 0 rows). These were evaluated and deliberately not filled; see MASTER_PLAN's data-agent verdicts for the reasoning per table before spending effort filling any of them.
- **Known live-empty tables tied to daily games that are worth double-checking before any rework**: `tennis_daily`, `guess_nation_daily`, `tennis_scores`, `guess_nation_scores` are all 0 rows. `/guess-tennis-player` and `/guess-the-nation` are both live `daily: true` routes. R6's own research flagged this exact discrepancy as a potential "data emergency" worth verifying before investing in either game's rework; as of this writing it has not caused a visible failure (both games are confirmed live and playable per the smoke-test history), which strongly suggests these particular tables are simply not the real backing store for those two games' daily mode (a different table or a client-side seeded fallback is actually doing the work), but this has not been re-confirmed against current code in this pass. Verify the actual data source in `fetchGuessTheNation`/`fetchTennisPlayer`-style lib files before assuming either is broken or fine.
- **Row-count highlights worth knowing at a glance**: `player_market_values` (171,567 rows, the single largest and most load-bearing content table on the site, backs autocomplete and market-value games across soccer); `nflfastr_rosters` (60,350) and `nflfastr_player_stats` (134,470) for NFL; `lahman_people`/`lahman_batting`/`lahman_pitching`/`lahman_fielding` (the MLB Lahman dataset, over 100K rows each) backing every baseball game; `nhl_draft` (26,138); `nba_draft_picks` (7,013); `world_cup_players` (10,585); `ufc_champions` (3,408) and `ufc_fights_v2` (3,917); `hall_of_fame` (2,782, distinct from `halls_of_fame` which is dead).
- **Puzzle-content tables and their current sizes** (all seeded incrementally across multiple sessions, all validated against the app's own gameplay logic before being trusted): `baseball_connections_puzzles` (300, exactly 5 names per group is a hard requirement the app enforces), `soccer_club_puzzles` (353), `shirt_number_puzzles` (154), `soccer_grid_puzzles` (690, split roughly 554 Easy / 136 Normal, Hard tier still needs cleaner UCL/award sourcing to grow), `connections_puzzles` (1000), `transfer_path_puzzles` (970, split 104 easy one-step / 710 two-step / 156 hard three-step, all validated solvable against the game's own career graph), `cbb_programs` (281, up from an original 132), `cfb_heisman_winners` (91, complete 1935-2025), `ballon_dor` (76 clean rows), `tennis_players` (106, with alias support for common names).
- **Extensions enabled**: `pg_trgm` and `unaccent`, with trigram GIN indexes on `player_market_values.player_name` and `nflfastr_rosters.full_name`, supporting fast accent-insensitive autocomplete.

### Edge functions

The live Supabase project currently shows **17 non-internal edge functions** plus one internal-looking `mcp` function (see below), all status `ACTIVE`:

`analyze-squads` (v3), `cbb-daily` (v1), `college-grid-validate` (v2), `evaluate-lineup` (v2), `fantasy-draft-daily` (v1), `football-connect4-suggest` (v2), `football-connect4-validate` (v2), `football-grid-validate` (v2), `guess-nation-daily` (v1), `nascar-chain-validate` (v2), `nascar-daily` (v1), `nba-chain-validate` (v2), `nba-connect4-validate` (v3), `nba-evaluate-lineup` (v2), `nba-suggest-players` (v2), `nba-validate-player` (v2), `simulate-season` (v3), `soccer-grid-validate` (v3), `suggest-players` (v2), `tennis-chain-validate` (v2), `tennis-daily` (v1), `validate-player` (v2).

That is 22 functions total by direct count (recounting the list above carefully: analyze-squads, cbb-daily, college-grid-validate, evaluate-lineup, fantasy-draft-daily, football-connect4-suggest, football-connect4-validate, football-grid-validate, guess-nation-daily, nascar-chain-validate, nascar-daily, nba-chain-validate, nba-connect4-validate, nba-evaluate-lineup, nba-suggest-players, nba-validate-player, simulate-season, soccer-grid-validate, suggest-players, tennis-chain-validate, tennis-daily, validate-player = 22), matching the handoff doc's "22 edge functions" figure and CLAUDE.md. The task brief's "17 edge functions" figure appears to underscount; use 22 as the authoritative number, or recount live via the Supabase MCP `list_edge_functions` tool if this ever matters (for example, before an edge-function-wide change like the CORS fix).

Plus a 23rd function, `mcp` (v1), which is the leftover from the 2026-07-05 Lovable AI agent incident (section 8a). It was overwritten with a 410 stub after the incident; it is not a real feature and should not be extended, only left alone or eventually deleted.

`nba-connect4-validate` is the best-written function in the set (input validation plus rate limiting) and was used as the template during the edge-function security review; `soccer-grid-validate` is at v3 after its own hardening pass. Redeploy any function through the Supabase MCP `deploy_edge_function` tool with the full file content and `verify_jwt: true`; the source of truth for each function's code lives in `supabase/functions/<slug>/` in the repo.

---

## 7. PER-GAME MAP

Read from `src/data/gameRegistry.ts` (the game catalog, grouped into `CATEGORIES`) and `src/App.tsx` (routes). As of this writing there are 13 categories (Golf is registered but empty, `games: []`, intentionally, since no golf data exists yet) and roughly 76 routed games. Soccer is deliberately ordered first in the registry.

Every game follows the pattern: route in `App.tsx` -> page component in `src/pages/` -> supporting hook in `src/hooks/` and/or lib in `src/lib/` -> data pulled from Supabase tables/views listed in section 6 via a `src/lib/fetch*.ts` helper.

### Soccer (ordered first; largest category)
- `/higher-lower-transfers` Transfer Market — higher/lower on real market values. **Flagged for retirement** (see section 9).
- `/career-ladder` Career Ladder — guess the player one career stop at a time. Has a daily-seed mode.
- `/who-am-i` Who Am I? — similarity-score secret player hunt. **Open rework**: rules clarity + full player pool suggestions (section 9).
- `/world-xi` World XI — pick a formation, fill it with 11 random countries. **Open rework**: slot-machine spin, unlimited respins, AI season sim (section 9).
- `/player-bingo` Player Bingo — fill 12 criteria tiles as players are revealed. **Open rework**: move to 5x5, harder categories, 3 strikes, no hints (section 9).
- `/alphabet-sprint` Alphabet Sprint — name a player per letter against the clock. **Open item**: live suggestions after 2 letters (section 9); this is the one game where typed-but-unmatched suggestions are the intended design, not a bug.
- `/clue-auction` Clue Auction — buy clues, save points, name the secret player.
- `/rarity-round` Rarity Round — Pointless-style rarity scoring, daily. **Flagged for retirement** (section 9).
- `/missing-xi` Missing XI — name the missing player from a famous real lineup, daily. **Open item**: expand toward 200+ lineups (section 9); currently around 101.
- `/sign-the-player` Sign the Player — guess market value to sign your XI, daily. Retirement decision pending (section 9, grouped with the other two retirement candidates as "decide").
- `/footle` Footle — guess the soccer player from stats (the site's flagship Wordle-style game; received the attribute-tile hybrid upgrade in R6 Wave 14).
- `/career` Career Quiz — guess from career history, has difficulty tiers.
- `/higher-lower` Higher or Lower — compare all-time career stats.
- `/connections` Connections — find groups of 4 connected players, 1000-puzzle pool.
- `/build-your-xi` Build Your XI — create a lineup, get it rated. Was P0-fixed for invalid picks and a network error; long-term plan is to merge with Perfect Lineup.
- `/perfect-lineup` Perfect Lineup — build an XI under random league/country constraints then simulate, daily; carries the Go Unbeaten (Perfect Season) mode.
- `/football-connect-4` Connect 4 — soccer trivia meets Connect 4.
- `/world-cup` World Cup — guess the World Cup legend, daily; has the Frozen Era mode.
- `/guess-soccer-club` Guess The Club — identify the mystery club, daily; has the question-tree (20 Questions) mode at the same route with a `-questions` variant.
- `/soccer-grid` Soccer Grid — 3x3 grid with rarity scores, difficulty + timers + overtime, daily.
- `/world-cup-bracket` 2026 Bracket — predict every World Cup 2026 match.
- `/soccer-career` Soccer Career — BitLife-style life sim, career from youth academy to legend. Was P0-fixed (wouldn't load/start) with added "outta-pocket" drama event cards per Anthony's love of spice/drama in career games.
- `/fantasy-draft` Fantasy Draft — draft your XI against an AI opponent.
- `/shirt-number` Shirt Number — guess the kit number a player wears, daily.
- `/transfer-path` Transfer Path — connect two players through shared clubs, daily.
- `/guess-transfer-value` Guess The Value — guess a player's transfer market value, daily.
- `/pack-battle` Pack Battle — daily 5-card pack, higher/lower on market value, one miss busts the pack. The final R6-wave new game shipped.

### Pro Football
- `/perfect-season-nfl` 17-0 Perfect Season — draft an offense across eras, run the table.
- `/football-grid` Pro Football Grid — 3x3 grid, daily.
- `/football-timeline` Timeline — order players by draft year, daily.
- `/football-draft` Draft Guesser — guess the draft round, daily.
- `/nfl-career` NFL Career Path — guess the NFL player from clues, daily.
- `/guess-nfl-team` Guess The Team — identify the franchise, daily.
- `/conquest` NFL Conquest — 32 teams, 50 states, one champion, daily. Fully overhauled (real ratings, logistic sim, power rankings, free agency, geography-based state splits).

### College Football
- `/college-grid` College Grid — 3x3 grid, daily. Must never query the two poisoned NCAA tables (section 6); use `cbb_programs`/`cbb_awards` only.
- `/guess-the-college` Guess The College — guess the D1 school from clues, daily.

### Pro Basketball
- `/perfect-season-nba` 82-0 Perfect Season — spin team seasons, draft a six-man rotation.
- `/stat-detective` Stat Detective — name the player behind the mystery stat line.
- `/nba-starting-5` NBA Starting 5 — build a lineup with stat challenges; shows full names now.
- `/nba-connect-4` NBA Connect 4.
- `/nba-chain` NBA Chain — build a chain of connected players; has fixed pick count, par/over-under scoring.
- `/perfect-lineup-nba` Perfect Lineup: NBA — build a starting 5 under random constraints, daily.
- `/conquest-nba` NBA Conquest — 30 teams, 50 states, daily, built on the same engine as NFL Conquest.

### College Basketball
- `/guess-cbb-team` Guess The CBB Program — daily.

### Baseball
- `/perfect-season-mlb` 162-0 Perfect Season.
- `/baseball-career` Career Path — daily.
- `/baseball-connections` Connections — daily.

### Hockey
- `/perfect-season-nhl` 82-0 Perfect Season — franchise/decade wheel, skater ratings from points per game, goalies from draft pedigree (no goalie stats exist in the data, scoped around that gap on purpose).
- `/puck-detective` Puck Detective — mystery NHL player with attribute clues, daily.
- `/hockey-grid` NHL Franchise Grid — 3x3 with franchises and career milestones, daily. Part of the confirmed NHL whitespace pair (R6 Wave 11); NHL is the weakest-covered sport across every competitor researched, so this and Puck Detective are genuine differentiation, not just parity plays.
- `/hockey-career` Career Path — daily.
- `/hockey-higher-lower` Higher/Lower — compare career points, daily.
- `/perfect-lineup-nhl` Perfect Lineup: NHL — daily.

### Formula 1
- `/f1-driver` Guess The F1 Driver — daily.
- `/f1-constructor` Guess The Constructor — daily.
- `/perfect-lineup-f1` Perfect Lineup: F1 — 5-driver squad under constraints, daily.

### Tennis
- `/guess-tennis-player` Guess The Player — daily. See the `tennis_daily`/`tennis_scores` empty-table flag in section 6 before reworking.
- `/tennis-chain` Tennis Chain — build a chain of Grand Slam defeats.

### Golf
- Category registered, zero games (`games: []`). Not an oversight, just no golf data sourced yet.

### NASCAR
- `/guess-nascar-driver` Guess The Driver — daily.
- `/nascar-chain` NASCAR Chain — build a chain of Cup champions.

### Combat Sports
- `/ufc` UFC Guesser.
- `/ufc-chain` Combat Chain — build a chain of fighters who beat each other.

### World & Olympic Games
- `/teammates` Teammates or Not? — were they ever teammates.
- `/olympics` The Medal Games — daily.
- `/guess-the-year` Guess The Year — daily.
- `/guess-the-nation` Guess The Nation — daily, date-seeded. See the `guess_nation_daily`/`guess_nation_scores` empty-table flag in section 6 before reworking.
- `/hof-or-bust` Hall of Fame or Bust? — daily.
- `/score-predictor` Score Predictor — predict the final score of famous matches, daily.

### Game Shows
- `/deal-or-no-deal` Deal or No Deal — Player Edition, real footballers at market value, flags not faces, smarter EV-based banker.
- `/list-quiz` Name Them All — how many champions can you name, 15 lists across 10 sports.
- `/squad-deal` Squad Deal — build an XI, Deal or No Deal style. The flagship pattern: page (`src/pages/SquadDeal.tsx`) + hook (`src/hooks/useSquadDeal.ts`) + lib (`src/lib/squadDeal.ts`, exporting `FORMATIONS`, `EXTRAS`, `playerRating`). New game-show formats are the explicit open backlog ask here (Chaser, Millionaire, Pointless, Feud, Price is Right; section 9).

### Non-game routes worth knowing
`/`  home. `/leaderboard`, `/profile`, `/profile/:username`  account/stats pages, part of the streaks/badges/leaderboard system (see docs/INCENTIVES_SPEC.md for the full identity model: guest handle vs signed-in display name, local-first streaks, `game_completions`-driven leaderboards, the 11-badge system in `src/lib/badges.ts`). `/privacy`, `/terms`  legal pages (section 8's legal decisions are baked into these). `/admin/login`, `/admin/reports`  the Report-button review flow backed by `question_reports`.

### Adding a new game (the standard procedure)
1. Create `src/pages/<Game>.tsx` (plus a hook/lib as needed, following the Squad Deal pattern above for anything with meaningful game state).
2. Register a route in `src/App.tsx` (import plus `<Route>`, added above the catch-all `*` route).
3. Add a `GameDef` entry (`{ path, label, emoji, description, daily?, isNew? }`) under the right category in `src/data/gameRegistry.ts`.
4. Add the new files to the publish batch (section 3) and ship it.

---

## 8. INCIDENT HISTORY

Read this section before assuming any weird behavior is new; there is a good chance it already happened once and has a known cause and fix.

**a. The env-var disaster.** Lovable's build process injects `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` (or similarly named vars) that point at the deleted `pzzadswiradjnvvfybol` Supabase project, not the live `flawuiqbvjobmkfkauhw` one. Any code that reads those env vars directly gets a client pointed at a dead project: logins fail, every game's data fetch fails, and it looks completely fine in local development (where the env vars either aren't set or point somewhere real) while being totally broken in production. The fix, already shipped and permanent: `src/integrations/supabase/client.ts` hardcodes the real project URL and public anon key and exports them; every other file that talks to Supabase must import `SUPABASE_URL`/`SUPABASE_PUBLISHABLE_KEY` from that one file. Never revert this to read env vars "to be more correct." It would immediately break production again.

**b. Publish script ghosts (three of them, all understood and dead now).** (1) The cmd.exe 8191-character line limit on `git add` lines: fixed by using multiple short lines instead of one long one, permanently, in `PUBLISH_GAMES.bat`. (2) Appends accidentally landing inside a REM comment block if the .bat file's structure ever gets edited carelessly: fixed by the standing rule to always Read the .bat before editing its `git add` section. (3) The silent no-op publish when a path in `git add` doesn't exist: not really "fixed" so much as understood and guarded against by always reading `publish_out.txt` after every run (section 3, step 4) rather than trusting the "DONE" banner alone.

**c. Console-click freeze.** Clicking inside a running cmd.exe window (to "check on it") silently puts Windows console into Quick Edit / text-selection mode, which pauses the underlying process until a key is pressed to release selection. This looks exactly like a hang. Resolution: never click inside a console window; use the headless publish flow (`PUBLISH_HEADLESS.bat`, output redirected to a file) instead of watching a live console at all.

**d. Lovable stale-build race.** The Lovable MCP `get_project` tool's `status: completed` field can be true while the actual preview build is stale, broken, or literally unbuilt ("Preview has not been built yet"). Deploying at that moment publishes the previous build to production, not your new changes, with no error shown anywhere. Resolution: always cross-check the embedded screenshot/URL or hit a real route on the preview before calling `deploy_project`, never trust the status field alone.

**e. Supabase dashboard needs a real login.** Automated/headless browser tabs hitting supabase.com/dashboard render a completely empty page (zero DOM, zero console output), which looked at first like a platform outage or a broken project. It was simply a logged-out browser. Any task that requires the actual Supabase dashboard UI (not reachable via the MCP tools, like Authentication > URL Configuration) needs a human-logged-in browser session, not an automated one.

**f. The localhost Site URL email bug.** Supabase Auth's Site URL was left at its default `localhost:3000` long after the real domain existed. Real users signed up, got confirmation emails whose links pointed at `localhost:3000` (useless to them), and got stuck unconfirmed. This was found only after real signups happened: 6 signups in the first 2 days, 4 confirmed fine (their timing missed the bug window or they figured out to just retry), 2 stuck. Fixed by setting Site URL to `https://douknowball.com` and adding both `douknowball.com/**` and `ballpark-hero.lovable.app/**` to the redirect allow list. The 2 already-stuck accounts could be force-confirmed via direct SQL, bypassing email verification entirely; this was deliberately left as **Anthony's decision, not made unilaterally**, since it trades email-verification integrity for user convenience. Also worth knowing: the auth-template body editor in the Supabase dashboard auto-inserts a stray closing `>` at the end of typed HTML; always End+Backspace and zoom the last line before saving a template.

**g. The Lovable AI agent incident (2026-07-05).** Someone (not this session's normal workflow) ran the Lovable AI agent directly from the editor UI via "Add agent integrations/MCP." Despite the free-plan/0-credit constraint, it ran anyway and pushed two unreviewed commits to `main`: one plain "Changes" commit and one merge titled "Added MCP agent integration," touching 9 files including a `vite.config.ts` edit, adding an `@lovable.dev/mcp-js` dependency, and auto-generating and self-deploying a `supabase/functions/mcp` edge function. Its own build then reported "Build unsuccessful." Resolution: `git revert -m 1` on the merge commit (the revert commit is `9c2a8ef`; a reference script `REVERT_MCP.bat` is kept untracked in the repo root), the build recovered and was redeployed, and the orphaned `mcp` edge function was overwritten with a harmless 410 stub via the Supabase MCP rather than left live. Judgment call made under delegation: the MCP integration has zero player-facing value and is not worth the build-pipeline risk, so it was killed rather than repaired. **Standing rule going forward**: never click "Try to fix" or "Try to fix all" in the Lovable editor UI. Each click invokes the paid agent, and its own typecheck step has produced false-positive "errors" on files that compile fine in the real build (specific past false positives: `useCareerGame`, `hockeyGrid`, `playerBingo`).

**h. CORS sitewide bug (2026-07-06).** Edge functions were missing `douknowball.com` (and/or its `www.` variant) in their CORS `allowedOrigins` list, which would cause API calls made from the real production domain to fail silently with a CORS error in the browser console, while the exact same calls worked fine from the Lovable preview domain or from localhost during testing. This is exactly the kind of bug that passes every dev-environment check and only breaks in production. Fixed in the same publish wave that also fixed several P0 issues (profile save, Soccer Career loading, World Cup modal traps, Build Your XI validation): CORS `douknowball.com` was added to all 17 (recounted as 22, see section 6's discrepancy note) live edge functions in one pass, commit `8771a04`. Going forward, any brand-new edge function must include both `douknowball.com` and `www.douknowball.com` in its allowed origins from the very first version, per the house rules in section 4.

---

## 9. OPEN BACKLOG

This is the live todo list as of 2026-07-06, phrased as concrete tickets (this is exactly the "turn stream-of-consciousness into tickets" process described in section 1).

1. **UX sitewide convention rollout**: rules should auto-popup once on first entry to a game (not just be available behind a `?` icon), the `?` icon should still exist to re-open the rules any time, every game needs an explicit give-up/reveal-answer button (matches Anthony's stated hatred of games with no escape hatch, section 1), and every navigation should scroll to the top of the page.
2. **Retire Transfer Market (`/higher-lower-transfers`) and Rarity Round (`/rarity-round`).** Both are candidates for removal from the registry; also **decide** what happens to Sign the Player (`/sign-the-player`), which is grouped with these two as a related judgment call rather than a confirmed retirement. This needs an actual decision (keep, cut, or rework each) before code changes, since removing a live route affects the sitemap, internal links, and any existing player muscle memory.
3. **Poll of the Day 2.0**: move from a single daily poll to multiple topical daily polls running at once. Matches Anthony's stated love of real-event polls (section 1); the current one-poll version undersells that appetite.
4. **Rework Player Bingo**: move from the current board to a 5x5 grid, make the categories genuinely harder, cap it at 3 strikes, and remove hints entirely. This is a direct response to Anthony's "easy bingo is boring" complaint (section 1); the fix is specifically about raising real difficulty, not just changing the grid size cosmetically.
5. **Rework Who Am I**: clarify the rules (current phrasing/UX around the similarity-score mechanic is apparently not obvious enough) and expand suggestions to draw from the full player pool rather than a narrower one.
6. **Rework World XI**: convert the flow to a slot-machine style spin with unlimited respins, and add an AI season simulation on top of the completed XI (this pairs conceptually with the existing Perfect Season engine in `src/lib/perfectSeason.ts`; reuse it rather than building a second simulator).
7. **Alphabet Sprint**: add live suggestions after the player has typed just 2 letters (this is the one game where showing typed-but-unmatched suggestions is the intended design per section 4's autocomplete exception, so this ticket is about tuning that existing behavior, not introducing a new exception).
8. **New game-show format games**: Anthony has explicitly asked for more of this genre. Candidates named: a Chaser-style pursuit format, a Who Wants to Be a Millionaire-style ladder, a Pointless-style rarity format (distinct from the retiring Rarity Round, presumably a fresh take), a Family Feud-style survey-matching format, and a Price Is Right-style value-guessing format. All should lean into drama/tension/hosting-personality flavor per section 1's stated preferences, not just be a reskinned trivia quiz.
9. **Missing XI**: expand the lineup pool toward 200+ (currently around 101, itself already grown from an original 41 through fact-checked additions).
10. **Merge Build-Your-XI and Perfect Lineup.** Both games do a variant of "assemble an XI under constraints"; Build Your XI already got a P0 validation fix and the long-term plan (noted at the time of that fix) is to fold it into Perfect Lineup rather than maintaining two parallel lineup-builder codepaths.
11. **Force-confirm the 2 stuck pre-fix user accounts** (from incident 8f). This is explicitly Anthony's decision to make (bypassing email verification is a real trade-off), not something to do unilaterally.
12. **Custom SMTP.** Once signups outgrow Supabase's built-in, rate-limited transactional email sender, set up custom SMTP under Authentication > Emails > SMTP Settings. Needs Anthony's own SMTP credentials; parked until volume actually justifies it.
13. **Google Search Console submission.** The sitemap (`sitemap.xml`) was rebuilt and is current; submitting it to Google Search Console is still an outstanding, purely administrative step.
14. **Tuning constants that need a human feel-pass, not more engineering**: chemistry-score weights (the EA-FC-style club/nation/league overlap math wired into World XI, Build Your XI, Perfect Lineup and its NBA/NHL/F1 siblings, and Squad Deal), the Unbeaten mode's `DRAW_SHARE` constant (currently `0.28`) and its rating map inside the Perfect Season/Unbeaten engine, and Pack Battle's balance constants (currently untuned v1, "none" specifically called out as needing a pass). These are all playtesting/balance calls, best made by Anthony actually playing and reacting, not something to guess at algorithmically.

---

## 10. VOICE AND QUALITY BAR

**How site copy should sound.** Plain, human, short sentences. Say the thing directly instead of dressing it up. Explicitly banned: AI-sounding filler words like "delve," "dive into," "elevate," "unleash," and similar corporate-blog inflation. No em dashes anywhere (section 4). If a sentence sounds like it came out of a marketing deck, rewrite it like you're texting a friend who plays a lot of sports trivia.

**Difficulty tiers philosophy.** Real games have Easy/Normal/Hard-style tiers, and the tiers should mean something (pool depth, obscurity, timer pressure), not just relabel the same content. Anthony's stated hatred of "easy bingo" (section 1) generalizes: a difficulty tier that isn't actually harder is worse than no tier at all, because it teaches players the label is meaningless.

**The "fun first" test.** Before shipping any new game or mode, ask: does this have real tension, a way to fail meaningfully, and something to master beyond "type the right word"? If the honest answer is "it's just a trivia lookup with extra steps," it fails the test and needs another layer (scoring nuance, risk/reward, a bust condition, a drafting/spinning mechanic, anything that isn't pure recall). This is the same instinct behind why Anthony likes Deal or No Deal and Squad Deal (real stakes, a banker/opponent with apparent agency, an actual decision every round) and dislikes flat one-mechanic quizzes.

**The verification bar.** Never tell Anthony something is "done" without live verification on `https://douknowball.com` itself, not the preview, not a local read of the code. The standard flow: publish (section 3, all seven steps, including the actual deploy), then load the real page and interact with it (or at minimum fetch its rendered text) to confirm the change is visibly present and functioning. Database-only or edge-function-only changes still need a live check against production behavior (a real query, a real function call) even though they skip the git/Lovable pipeline. "The code looks right" and "I read the file back and it matches what I wrote" are necessary but not sufficient; only a live, working result on the production domain counts as done. This bar exists because of real past failures (the multi-week stale-June-build incident, the CORS bug that only showed up in production, the stuck-signup email bug that only surfaced from real user behavior) where everything looked correct in every place except the one place that actually mattered.
