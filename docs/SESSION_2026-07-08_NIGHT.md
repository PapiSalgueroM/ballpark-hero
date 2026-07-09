# Session log — 2026-07-08 night ("autopilot" run)

Owner brief: the giant tweaks message (polls = real matches of the day, one world
leaderboard, header stats stuck at 0, per-game fixes, delete weak games, build FULL new
games, fix all data). This file is the running roadmap; every item from the brief is
either DONE below or QUEUED with enough detail for the next session to execute.

## Root causes discovered (read before touching "broken" games)

1. **Lovable AI gateway is dead (0 credits)** → every LLM-backed edge function returns
   "validation error". Fix = GEMINI_API_KEY secret (see ANTHONY_TODO.md) + the 3-line
   shim (see soccer-grid-validate / football-grid-validate for the pattern: __GEMINI_KEY,
   __AI_URL, model swap). **15 functions still need the shim + redeploy** (deploy via
   Supabase MCP `deploy_edge_function`): evaluate-lineup, nba-evaluate-lineup,
   football-connect4-validate, nba-connect4-validate, nba-chain-validate,
   tennis-chain-validate, nascar-chain-validate, college-grid-validate, validate-player,
   suggest-players, nba-validate-player, nba-suggest-players, football-connect4-suggest,
   simulate-season, analyze-squads.
2. **soccer-grid-validate had NBA Connect-4's code deployed** (slug mixup on 7/6) →
   fixed, v4 live with the correct soccer validator.
3. **Header stats read tables that don't exist in prod** (user_scores /
   daily_completions) and skipped guests entirely → rewritten on game_completions +
   global_rank RPC (works logged-out).
4. **Who Am I used peak-year market rows** (Messi age 30, Özil at Arsenal) → pool now
   latest-year (2025+) per player; retired players can't be secrets.
5. The old **per-game leaderboards** are gone: `global_leaderboard` + `global_rank`
   Postgres functions normalize every game to a 0-100 best-run-per-day scale (spam-proof)
   — top 100 + your world rank, today + all-time, optional per-sport filter.

## Shipped this session (in the repo, staged in PUBLISH_GAMES.bat)

- **Polls of the Day 3.0**: rotates at NOON ET; daily_polls extended to 4 options +
  flag columns; Jul 9-19 reseeded with the REAL bracket (Fra-Mar 7/9, Esp-Bel 7/10,
  Nor-Eng + Arg-SUI 7/11 — the old seed had Argentina vs Colombia), 4-way Golden Boot
  (Messi 8 / Mbappé 7 / Haaland 7 / Kane 6), semifinal 4-ways that are valid whatever
  the QF results, and owner-style fallback debates (LeBron/Jordan, 09 Barça/15 Madrid).
  Real flag IMAGES via FlagImg (Windows renders flag emoji as letters).
  ⚠️ After each QF/SF, update the later trophy polls via SQL if a listed favorite got
  knocked out (DB-only change, no deploy needed).
- **World Leaderboard**: one board, total points, Top 100, "Your world rank #N of M",
  Today/All-Time, per-sport filter. Header chips (points today / rank / games today /
  streak) now real for guests too, and update on every completion event.
- **NEW GAME: Club Manager** (/club-manager, Soccer tab): full FM-style sim — 20 clubs,
  4 tiers, tactics + mentality, 38-game league, domestic cup + Champions League,
  transfers in 2 windows, injuries/suspensions/morale, board confidence + sackings,
  job offers, multi-season aging + youth intake, trophy cabinet, localStorage save.
- **World XI**: real slot-machine reel spin on every draw; multi-position eligibility
  (Raphinha fits RW *and* LW; FB↔WB, CM↔CDM/CAM, ST↔CF).
- **Player Bingo**: continue-the-board after a bingo (+1 strike, per-line bonus,
  BLACKOUT +500), new verified squares (WC winner 2010-22, played with Messi, UCL winner
  2011-25, 10M+ IG followers).
- **Guess the Value**: current guess pinned, all guesses hottest→coldest, red=warm /
  blue=cold continuous scale, direction arrows, post-solve summary.
- **Footle**: insane = genuinely obscure (sub-$8M pool, ~1,500+ global rank, honest club
  → league labels); tier-pure daily/unlimited answers; full pool still guessable.
- **Who Am I**: current-season data only (Messi 39 @ Inter Miami), retired players out.
- **Alphabet Sprint**: type + submit; no autocomplete answer key; unique-surname rule.
- **Missing XI**: hints never repeat visible info; no "Wikipedia/CONMEBOL" source dumps.
- **Home**: 3 personal chips for everyone (games available / days visited / played
  today); Most Played Today already live (no view counts, by design).
- **Registry**: retired NFL Timeline + Guess The NFL Team (routes kept); College
  Football + College Basketball merged into one College Sports tab; Game Shows tab
  dissolved into its sports; logo bigger/stretched; three Play Next suggestions.
- **Edge**: soccer-grid-validate v4 (correct code + shim), football-grid-validate v4
  (shim). Repo copies updated to match.

## Queued next (from the brief, roughly in order)

1. Shim + redeploy the 15 remaining edge functions (mechanical, pattern above).
2. Local fallback scoring for Build-Your-XI / NBA Starting 5 when the AI eval is down.
3. Squad Deal: 10+ per position all-time pools, randomized per run, fair banker math
   (offer ≥ pool minimum), full names on elimination, stay/swap prompt at final 2,
   manager/fans/budget as deal-or-no-deal boards, WC-2026-only theme.
4. NFL Conquest overhaul (abbr labels centered, rugged borders, FA rules — everyone
   unclaimed in pool, sign only onto open land, eliminated players enter FA, stolen
   players re-stealable — choosable power-up targets, adjacency-only matchups,
   eliminated teams out of power rankings, accurate battle logs, 2026 ratings) and the
   same pass for NBA Conquest (fix team locations + rosters; Vucevic double-team bug).
5. Soccer Career: era-locked opponent pools that advance with time, position-based
   starting stats, era-correct Ballon d'Or (top 30), capped starting ratings, WAY more
   life events (relationships, kids, scandals, interviews, streakers, rivals,
   contracts, child support...), injuries that actually fire. Target: better than BitLife.
6. Sign the Player → box2box auction (3 bidders × £1B, themed 33-player pools, 2nd-best
   → best → 3rd bidding order, ratings, simulate showdown).
7. 17-0 / 82-0: decade mode, PPG-style stats, defense, playoffs → Super Bowl/Finals run
   with MVP + beat-by-beat, kinder records, richer post-sim analysis; copy the proven
   82-0 format first, then exceed it.
8. WC Bracket page: final real groups + knockout paths, no playoff slots, fixed FIFA
   rankings (bracket data is now known through the QFs — encode it).
9. Stat Detective depth, NBA Chain constraint rules (e.g. CP3→Curry using <10 PPG
   careers only), F1 hint ordering small→big, Millionaire + Guess-the-Club + Career
   Quiz + Connections puzzle expansions, NFL Draft Guesser 5th-guess bug + depth,
   NFL Career Path more/nicher clues, college games accuracy pass.
10. Theme-vs-AI Fantasy Draft: draft clicks do nothing — debug (fantasy-draft-daily
    edge fn returns 200, so it's client-side).
11. Transfer Path: purge wrong puzzles (Rooney→Ronaldo→Mbappé "connected" is false),
    raise difficulty, or delete if it can't be made solid.
12. New games pipeline: mine box2box/Sidemen/MMG/KOT4Q formats for 3+ more full games.
13. Data expansion: bulk import more players/leagues into player_market_values +
    career tables so "every player can be guessed" everywhere.

## Verification honesty

The sandbox VM died mid-session (disk full → I/O errors), so `tsc`/build could not run.
Mitigation: agents type-audited their own diffs, all data claims were checked with
read-only SQL against prod, and every large new file was re-read end-to-end for
truncation. Standard procedure per CLAUDE.md still applies: verify via deploy + manual
play-test. Play-test list: /club-manager (full season), /leaderboard (rank card),
/world-xi (spin), /player-bingo (continue board), /footle insane, /who-am-i (Messi row),
/alphabet-sprint (typing), /guess-transfer-value (heat), home polls after noon ET.
