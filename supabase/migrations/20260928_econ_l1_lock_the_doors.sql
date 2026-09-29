-- Round 673, economy step L1: lock the doors.
--
-- Spec: docs/design/POINTS-ECONOMY-V2.md on the points-economy branch,
-- sections 2, 5 (L1), 9 (the chain, row L1) and 13 (Round 673). One
-- deliberate change from the spec, the lead's call after the round's review:
-- the save REFUSES what a player could abuse from L1 on, instead of waiting
-- for the door in Round 677 (see THE DOOR'S REFUSALS below).
--
-- NOT APPLIED BY THE ROUND THAT WROTE IT. The lead applies it after the
-- round's adversarial review, with the steps under APPLY below. It does not
-- wait for any release: it changes nothing a player sees and does not change
-- what any game pays.
--
-- REHEARSED IN PGLITE, NEVER ON PRODUCTION. scripts/simEconomyMigrations.mjs
-- loads scripts/data/economySchema.sql (the objects below, read from
-- production with SELECTs only) into PGlite and runs this file there: every
-- refusal, the Round 569 arithmetic byte for byte on sample saves, a second
-- apply refused, the undo restoring the catalog, the reapply. A
-- BEGIN ... ROLLBACK on production takes the same AccessExclusive locks a real
-- apply takes and stalls live saves while it runs, so nothing here is ever
-- rehearsed there.
--
-- =====================================================================
-- WHAT WAS WRONG, read only on production 2026-09-28
-- =====================================================================
-- anon and authenticated held INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES
-- and TRIGGER on user_scores, user_game_scores, user_best_scores,
-- daily_completions, game_completions and game_score_caps. Row level
-- security was the only barrier, and on the account tables it said only
-- auth.uid() = user_id, over every column:
--   user_scores       INSERT and UPDATE policies: a player could PATCH their
--                     own total_points and streaks straight through the API.
--   user_game_scores  INSERT policy, no bound on score, created_at client
--                     suppliable.
--   user_best_scores  INSERT and UPDATE policies.
--   daily_completions INSERT policy.
--   game_completions  INSERT WITH CHECK (true) for anon and authenticated, and
--                     the table grant covered created_at and completed_on, so
--                     anyone could post a backdated board row under any name.
-- pg_graphql is installed and executable by anon and authenticated, so the
-- same grants were reachable as GraphQL mutations too. No sign the holes
-- have been used yet (section 2 of the spec). They are open.
--
-- And the save itself took any score, any correct count and any slug: one
-- rpc('record_auth_completion') with p_score 2000000000 set a player's total
-- and best to two billion, a negative score took the total back down, and a
-- 5000 character slug ticked a daily for a game that does not exist (the
-- round's review, 2026-09-28). Taking the PATCH away while leaving that open
-- would have closed one door and kept the same power behind the next.
--
-- =====================================================================
-- WHAT THIS DOES, in one DO block, so it is one statement and one
-- transaction: every precondition is read before the first write, every
-- result is proved before the block ends, and any failure anywhere rolls
-- the whole thing back with nothing changed.
-- =====================================================================
--   0. LOCK ORDER. The first write takes game_completions in ACCESS EXCLUSIVE
--      mode, before anything touches an account table. The five minute
--      refresh-player-ranks cron reads game_completions for 4 s on average
--      (51 s at worst); if L1 has to wait for it, it waits holding nothing,
--      so signed in saves are never queued behind it. lock_timeout is 1 s:
--      anon's statement_timeout is 3 s, so a board insert queued behind the
--      wait is delayed at most a second, never cancelled. Past 1 s the block
--      gives up with nothing changed.
--   1. private.economy_steps, the ledger every later economy step checks
--      (L1 is its first row). RLS on, no policies, no grants.
--   2. private.game_hard_max, one row per game in game_score_caps: the most
--      one save may record for that game (the table under HARD MAXIMUM
--      below). RLS on, no policies, no grants: only the save reads it.
--   3. public.record_auth_completion(text, integer, integer) is replaced by a
--      SECURITY DEFINER body that is the Round 569 body with four refusals in
--      front of it. From its first insert to its end it is the Round 569 body
--      byte for byte (raw add to total_points, UTC day), proved below against
--      the body it replaces, so every save it accepts lands exactly as today.
--      Its two old refusals stay verbatim. search_path stays pinned empty.
--      EXECUTE stays authenticated only. The owner (postgres) bypasses row
--      level security, so the body's own auth.uid() scoping is the whole of
--      its safety: it takes the player from auth.uid() and never from a
--      parameter, and it runs fixed SQL (no execute, no format().
--   4. revoke INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER on the
--      six tables from anon and authenticated. SELECT is kept, so every read
--      in the site keeps working.
--   5. drop the six client write policies on the four account tables:
--      user_scores_ins, user_scores_upd, user_game_scores_ins,
--      user_best_scores_ins, user_best_scores_upd, daily_completions_ins.
--      The read policies stay.
--   6. game_completions: grant INSERT on (game, score, player_name) only, the
--      exact columns src/lib/completions.ts sends, so created_at and
--      completed_on come from their defaults (the server stamps the time),
--      and its insert policy's WITH CHECK (true) becomes length bounds:
--      game 1 to 64 characters, player_name 1 to 40. No score bound on the
--      board row: what a play is worth there is Round 675's, not this.
--      Measured before choosing the bounds, read only, 2026-09-28: longest
--      game key sent in 30 days 27, longest player_name 21, 0 empty or null
--      names; longest profile display_name 12, username 16. The profile form
--      now holds a display name to 40 and the client cuts a longer name to 40
--      before it sends (Round 673), so no real board row meets the bound.
--
-- =====================================================================
-- THE DOOR'S REFUSALS (new in the save, each before its first write)
-- =====================================================================
-- Every refusal raises SQLSTATE 22023 (invalid_parameter_value) with a
-- message that starts "record_auth_completion refused:" and names the value.
-- PostgREST answers it as a 400. The client (src/lib/completions.ts) logs it
-- as a warning with that message, and the play still counts on the device:
-- the local streak and point tally are written before the save is sent.
--   a. p_game_slug longer than 64 characters (the board insert's bound).
--   b. p_game_slug not a game in public.game_score_caps, the allowlist the
--      board already scores by (simLeaderboardCaps holds every key the
--      source can send to that table). Read 2026-09-29: 0 of 22,375
--      user_game_scores rows and 0 daily_completions rows are off it.
--   c. p_score below 0 or above the game's hard maximum (a null score is
--      0, as in Round 569). Read 2026-09-29: 0 stored scores are negative,
--      and no game's highest stored score is above its hard maximum.
--   d. p_correct, when sent, below 0 or above 1000. Highest stored: 127.
-- A refused save writes nothing: no score row, no daily tick, no total.
--
-- =====================================================================
-- HARD MAXIMUM, per game, generous on purpose so no real play is refused
-- =====================================================================
-- THE RULE, as the lead set it and then widened in two places:
--   CEILING  games whose engine exports the most it can record (Round 646's
--            ceilings, read from origin/points-economy: the tuples of
--            20260928_round_646_caps_at_real_ceilings.sql, plus the three
--            Round 644 owns in scripts/lib/scoreCeilingTable.mjs,
--            soccer-career 100, player-bingo 1700, rarity-round 500):
--            the larger of TWICE the ceiling and TWICE the highest score
--            production holds for the game. The ceiling is doubled too
--            because 646 read it from the points-economy tree, whose engines
--            differ from main's in places: Perfect Lineup's Go Unbeaten mode
--            records up to 38 x 3 = 114 on main against 646's 100.
--   OPEN     games with no ceiling on main: the thirteen 646 lists as
--            endless or open sums, the six front offices and dynasties
--            (646's 100 is Round 647's per season scale, and main still
--            records titles x 100 + seasons x 5), the seven that record no
--            score, and the twelve retired keys only an old tab could send:
--            the larger of TEN times the highest held score and 10,000.
--            Twice a thin record is no bound a real play respects:
--            higher-lower-transfers holds one row, a 2.
--   "Held" is the highest of user_game_scores.score, user_best_scores and
--   game_completions.score (score > 0) for the game, read only on
--   2026-09-29 04:31 UTC. The largest value is 540,000,000 (pack-battle,
--   dollars), inside integer range.
-- The values, one per game_score_caps row (class is ceiling, or one of the four
-- OPEN kinds: open, season, unscored, retired; then ceiling, held, hard max):
--   'afl-higher-lower'            ceiling       325       270        650
--   'alphabet-sprint'             open            -        26      10000
--   'ball-iq'                     ceiling      1600      1600       3200
--   'baseball-career'             ceiling      1000      1000       2000
--   'baseball-connections'        ceiling      1000       500       2000
--   'blind-rank'                  retired         -        60      10000
--   'budget-builder'              ceiling       126      1120       2240
--   'build-your-xi'               ceiling       500       500       1000
--   'buzzer-beater'               ceiling      3045      1144       6090
--   'career'                      ceiling       700       700       1400
--   'career-ladder'               ceiling      1000      1000       2000
--   'career-path'                 retired         -       700      10000
--   'cbb-dynasty'                 season        100      1495      14950
--   'cbb-grid'                    ceiling       900       900       1800
--   'cbb-program'                 retired         -      1000      10000
--   'cfb-dynasty'                 season        100       790      10000
--   'cfb-higher-lower'            ceiling       325       325        650
--   'champ-or-not'                ceiling        10         8         20
--   'club-manager'                ceiling       130       130        260
--   'clue-auction'                ceiling       100       100        200
--   'college-grid'                ceiling       900       900       1800
--   'connections'                 ceiling      1000      1000       2000
--   'conquest-imperialism'        ceiling       943       818       1886
--   'conquest-mlb-imperialism'    ceiling       849       799       1698
--   'conquest-nba-imperialism'    ceiling       849       774       1698
--   'conquest-nhl-imperialism'    ceiling       899       874       1798
--   'conquest-soccer-imperialism' ceiling      1037       953       2074
--   'dart-draft'                  ceiling       824       813       1648
--   'darts'                       retired         -       334      10000
--   'darts-501'                   retired         -        50      10000
--   'emoji-guess'                 ceiling       500       500       1000
--   'f1-constructor'              ceiling      1000      1000       2000
--   'f1-driver'                   ceiling      1000      1000       2000
--   'f1-higher-lower'             ceiling       325       325        650
--   'face-off'                    ceiling      1900      1480       3800
--   'fantasy-draft'               ceiling       100        90        200
--   'fight-career'                ceiling       100        32        200
--   'fight-gym'                   ceiling       100        11        200
--   'fight-promoter'              ceiling       100         2        200
--   'football-connect-4'          ceiling       500         0       1000
--   'football-draft'              ceiling      1500      1500       3000
--   'football-grid'               ceiling       900      1000       2000
--   'football-timeline'           ceiling       500       500       1000
--   'footle'                      ceiling       700       700       1400
--   'free-kick'                   ceiling      3490      1903       6980
--   'front-office'                season        100      2460      24600
--   'gauntlet-draft'              ceiling       100       100        200
--   'golf-higher-lower'           ceiling       325       180        650
--   'grade-transfer'              ceiling       500         0       1000
--   'guess-cbb-team'              ceiling      1000      1000       2000
--   'guess-nascar-driver'         ceiling      1000      1000       2000
--   'guess-nfl-team'              ceiling      1200      1200       2400
--   'guess-soccer-club'           ceiling      1200      1200       2400
--   'guess-soccer-club-questions' ceiling      1000       870       2000
--   'guess-tennis-player'         ceiling      1000       800       2000
--   'guess-the-college'           ceiling      1200      1200       2400
--   'guess-the-golfer'            ceiling       600       600       1200
--   'guess-the-nation'            ceiling      1200      1200       2400
--   'guess-the-year'              ceiling      1000      1000       2000
--   'guess-transfer-value'        ceiling       900         0       1800
--   'hall-of-champions'           unscored        -         0      10000
--   'higher-lower'                open            -      7000      70000
--   'higher-lower-transfers'      open            -         2      10000
--   'hockey-career'               ceiling      1000      1000       2000
--   'hockey-grid'                 ceiling       900       900       1800
--   'hockey-higher-lower'         ceiling       325       325        650
--   'hof-or-bust'                 ceiling      1000      1000       2000
--   'idle-arena'                  unscored        -         0      10000
--   'jeopardy'                    ceiling     15000     15000      30000
--   'lineup-builder'              retired         -       500      10000
--   'list-quiz'                   open            -        28      10000
--   'minefield'                   ceiling       440       390        880
--   'missing-eleven'              ceiling       100       100        200
--   'missing-five'                ceiling       100       100        200
--   'missing-nine'                ceiling       100       100        200
--   'missing-xi'                  ceiling       100       100        200
--   'mlb-connect-4'               ceiling       500         0       1000
--   'mlb-front-office'            season        100      2790      27900
--   'mlb-gauntlet-draft'          ceiling       100       100        200
--   'mlb-grid'                    ceiling       900       900       1800
--   'mlb-higher-lower'            ceiling       325       325        650
--   'mlb-my-career'               open            -      2281      22810
--   'mystery-box'                 ceiling       960       760       1920
--   'nascar-chain'                open            -      2000      20000
--   'nba-career'                  ceiling      1000      1000       2000
--   'nba-chain'                   open            -      4600      46000
--   'nba-connect-4'               ceiling       500         0       1000
--   'nba-connections'             ceiling      1000      1000       2000
--   'nba-front-office'            season        100      5080      50800
--   'nba-gauntlet-draft'          ceiling       100       100        200
--   'nba-grid'                    ceiling       900       900       1800
--   'nba-higher-lower'            ceiling       325       325        650
--   'nba-lineup'                  retired         -       500      10000
--   'nba-my-career'               open            -      2893      28930
--   'nba-starting-5'              ceiling       500       500       1000
--   'nba-stat-line'               ceiling       100        96        200
--   'nfl-career'                  ceiling         6         6         12
--   'nfl-connect-4'               ceiling       500         0       1000
--   'nfl-connections'             ceiling      1000      1000       2000
--   'nfl-gauntlet-draft'          ceiling       100       100        200
--   'nfl-higher-lower'            ceiling       325       325        650
--   'nfl-my-career'               open            -      3677      36770
--   'nhl-connect-4'               ceiling       500         0       1000
--   'nhl-connections'             ceiling      1000      1000       2000
--   'nhl-front-office'            season        100      2125      21250
--   'nhl-my-career'               open            -      2543      25430
--   'olympics'                    ceiling      1000      1000       2000
--   'overrated-underrated'        retired         -       800      10000
--   'pack-battle'                 open            -  54000000  540000000
--   'perfect-lineup'              ceiling       100        75        200
--   'perfect-lineup-f1'           ceiling       100        94        200
--   'perfect-lineup-nba'          ceiling       100        96        200
--   'perfect-lineup-nhl'          ceiling       100        93        200
--   'perfect-season-mlb'          ceiling       162       140        324
--   'perfect-season-nba'          ceiling        82        81        164
--   'perfect-season-nfl'          ceiling        17        17         34
--   'perfect-season-nhl'          ceiling        82        82        164
--   'player-bingo'                ceiling      1700      1700       3400
--   'player-stock-market'         ceiling       100       100        200
--   'puck-detective'              ceiling        80        50        160
--   'rank-em'                     ceiling      1000      1000       2000
--   'rarity-round'                ceiling       500       500       1000
--   'rebuild'                     ceiling       990       940       1980
--   'score-predictor'             ceiling      1000      1000       2000
--   'search-and-discard'          ceiling       100        85        200
--   'shirt-number'                ceiling      1000      1000       2000
--   'sign-the-player'             ceiling       697  56000000  112000000
--   'silverware-sort'             ceiling        15        15         30
--   'soccer-career'               ceiling       100      1000       2000
--   'soccer-grid'                 ceiling       900       950       1900
--   'sports-bingo'                ceiling       100       100        200
--   'sports-millionaire'          ceiling   1000000   1000000    2000000
--   'squad-deal'                  ceiling       100       100        200
--   'stadium-draft'               retired         -       350      10000
--   'stadium-tycoon'              unscored        -         0      10000
--   'stat-detective'              unscored        -         0      10000
--   'teammates'                   ceiling      1000      1000       2000
--   'tennis-chain'                open            -       750      10000
--   'tennis-higher-lower'         ceiling       325       220        650
--   'tennis-player'               retired         -       800      10000
--   'tier-list'                   retired         -       800      10000
--   'transfer-path'               ceiling      1000      1000       2000
--   'ufc'                         ceiling       700       700       1400
--   'ufc-chain'                   open            -       450      10000
--   'ufc-game'                    retired         -       600      10000
--   'who-am-i'                    unscored        -         0      10000
--   'whod-they-beat'              ceiling        10         6         20
--   'wonderkid-factory'           unscored        -         0      10000
--   'world-cup'                   ceiling      1000       800       2000
--   'world-cup-bracket'           unscored        -         0      10000
--   'world-xi'                    ceiling        11        11         22
--
-- A game added to game_score_caps after this needs a row here in the same
-- migration, or its signed in saves are refused: simEconomyMigrations
-- section 8 fails on any later migration that inserts a cap row without one.
--
-- =====================================================================
-- PRECONDITIONS, every one read before any write. Any drift refuses.
-- =====================================================================
--   a. The ledger holds no live L1 and no live later step. (After an undo,
--      L1 may be applied again: its row is marked undone.)
--   b. record_auth_completion(text, integer, integer) exists once in public
--      (no overload), is owned by postgres, and md5(pg_get_functiondef) is
--      5ae76ef7cbf874d58d65ee9050e2023c: the Round 569 body, SECURITY INVOKER,
--      read on production 2026-09-28 and again 2026-09-29. Never a comment
--      marker.
--   c. No Round 644, 646 or 648 object exists: private.r644_state,
--      private.r644_soccer_scores_bak, private.r646_caps_bak,
--      public.game_score_cap_history. Those files are superseded by the spec
--      and never applied; 644's now refuses once this ledger exists. And
--      private.game_hard_max does not exist yet (an undo drops it).
--   d. user_game_scores.created_at and game_completions.created_at default to
--      now(), and game_completions.completed_on has a default (read from
--      pg_attrdef): the client stops being able to send them, so the defaults
--      are the only source.
--   e. The six tables exist, have RLS on, are not FORCE RLS, are owned by the
--      save's owner (so the DEFINER save bypasses RLS on them), and carry no
--      user trigger (a trigger would run as the writer and could need a grant
--      this takes away).
--   f. The write policies (every non SELECT policy) on the six tables are
--      exactly the seven read on 2026-09-28, by name, command, roles and
--      expressions.
--   g. The games in game_score_caps are exactly the 151 the hard maximum
--      table below carries. game_score_caps is written only by migrations, so
--      no visitor can hold this off; a game added or dropped since
--      2026-09-29 is a refusal: re-read, re-derive its row, rewrite.
--
-- =====================================================================
-- PROVED BEFORE THE BLOCK ENDS
-- =====================================================================
--   the save is DEFINER, search_path pinned empty, one signature, anon and
--   PUBLIC cannot execute it, authenticated can; its body has no carriage
--   return (the file must reach apply_migration with LF line endings), its
--   md5(prosrc) is the one pinned here, and from its first insert to its end
--   it equals the body it replaced; private.game_hard_max holds exactly the
--   games of game_score_caps. has_table_privilege is false for INSERT,
--   UPDATE, DELETE, TRUNCATE, REFERENCES and TRIGGER on all six tables for
--   anon and authenticated; no column level UPDATE or REFERENCES anywhere;
--   column INSERT only on game_completions and only game, player_name,
--   score (so has_column_privilege is false on created_at and completed_on);
--   SELECT still held and the read policies unchanged; no write policy left
--   on the four account tables or game_score_caps; the one on
--   game_completions is the bounded one. Then, executed as anon and as
--   authenticated: a read of each table works, the client's insert shape
--   passes the privilege check, every direct write is refused for want of
--   privilege, a board row with a 41 character name, an empty game or a 65
--   character game is refused by the bound; anon cannot call the save; and,
--   as authenticated with a probe user id, the save refuses a 65 character
--   slug, a game off the allowlist, a negative score, a score one above a
--   game's hard maximum and a correct count of 1001. Every probe either
--   touches no row or must be refused before its first write: if one were
--   accepted, the block raises and the whole migration rolls back with it.
--
-- =====================================================================
-- APPLY (the lead, after the round's adversarial review)
-- =====================================================================
--   1. Read only, before: the migration checks its own preconditions, but
--      look first so a refusal is not a surprise:
--        select md5(pg_get_functiondef('public.record_auth_completion(text,integer,integer)'::regprocedure)),
--               to_regclass('private.economy_steps'), to_regclass('private.r644_state'),
--               to_regclass('private.r646_caps_bak'), to_regclass('public.game_score_cap_history'),
--               to_regclass('private.game_hard_max'), (select count(*) from public.game_score_caps);
--      Expect 5ae76ef7cbf874d58d65ee9050e2023c, five nulls and 151. Then
--      node scripts/simEconomyMigrations.mjs --held-query prints one read
--      only SELECT that sets every game's highest stored score beside its
--      hard maximum here; run it through execute_sql and expect no row (a
--      row is a game whose stored scores outgrew this file: re-derive it).
--   2. TIME IT. refresh-player-ranks runs every five minutes and reads
--      game_completions for about 4 s. Read only:
--        select status, start_time, end_time from cron.job_run_details
--         where command ilike '%player_ranks%' order by start_time desc limit 1;
--      Apply within the minute after its end_time, never in the minute
--      before the next five minute mark.
--   3. apply_migration, name econ_l1_lock_the_doors, query = this whole file
--      WITH LF LINE ENDINGS (a Windows checkout has CRLF; the save's body
--      would carry the carriage returns and the proof refuses it). If it
--      fails on lock_timeout it changed nothing: go back to step 2.
--   4. get_advisors, type security. Expect exactly one NEW finding, a WARN
--      that authenticated can execute the SECURITY DEFINER function
--      public.record_auth_completion. That is the design: it is the door. An
--      INFO about RLS with no policy on private.economy_steps or
--      private.game_hard_max, if listed, is also by design. Anything else new
--      is a stop: apply the undo (below).
--   5. Read only, after:
--        select step, seq, applied_at, undone_at from private.economy_steps;
--        select count(*) from private.game_hard_max;
--      One row, L1, seq 1, undone_at null; 151.
--   6. node scripts/simPlayDoor.mjs --query prints the catalog query. Run it
--      through execute_sql (read only), put its JSON in
--      scripts/data/playDoorCatalog.json as "catalog", set "source" to
--      "production" and "captured" to the date, and commit that. Then
--      node scripts/simPlayDoor.mjs must end green with the live probes shut.
--      Until the fixture says production, a shut door fails the harness on
--      purpose, so nobody forgets this step.
--   7. node scripts/simAuthSave.mjs and node scripts/simLeaderboardCaps.mjs
--      green (both probe the live database as anon).
--   8. Within the hour, read only, that saves still land:
--        select count(*) from public.user_game_scores where created_at > '<apply time>';
--        select count(*) from public.game_completions where created_at > '<apply time>';
--      Both grow at their usual rates (game_completions 14,000 to 25,000 a
--      day). get_logs service api: rpc/record_auth_completion answers 200 and
--      POST /rest/v1/game_completions shows no new 4xx. Any 400 on the save
--      is a refusal: read its message in the postgres log. A refusal of a
--      real play (a score a game can really make) is a stop: apply the undo.
--      A spike of 401 or 403 on game_completions is a stop: apply the undo.
--
-- UNDO: supabase/migrations/ROLLBACK_20260928_econ_l1_lock_the_doors.sql.
-- It restores the grants and policies from this step's ledger row, puts the
-- save back to the exact definition it replaced (the Round 569 body,
-- SECURITY INVOKER, md5 5ae76ef7... again), drops private.game_hard_max, and
-- marks L1 undone, so L1 can be applied again.
--
-- NOT IN THIS FILE, on purpose: daily_badges (Round 694 closes it), any score
-- bound on the board row or clamp (Round 675 and the door in 677), any
-- Eastern day change (677, 689), anything that values a row. The per save
-- bound here does not stop a player saving many times: one ranked result per
-- day is the door's, in Round 677.

do $l1$
declare
  v_save oid := to_regprocedure('public.record_auth_completion(text,integer,integer)');
  v_six constant text[] := array['daily_completions', 'game_completions', 'game_score_caps',
                                 'user_best_scores', 'user_game_scores', 'user_scores'];
  v_roles constant text[] := array['anon', 'authenticated'];
  v_revoked constant text[] := array['INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER'];
  -- Every non SELECT policy on the six tables, read on production 2026-09-28,
  -- in the order the query below produces (table, then name, byte order).
  v_writes_expected constant jsonb := $json$[
    {"t": "daily_completions", "n": "daily_completions_ins", "cmd": "INSERT", "roles": "{public}", "using": null, "check": "(auth.uid() = user_id)"},
    {"t": "game_completions", "n": "Anyone can log a completion", "cmd": "INSERT", "roles": "{anon,authenticated}", "using": null, "check": "true"},
    {"t": "user_best_scores", "n": "user_best_scores_ins", "cmd": "INSERT", "roles": "{public}", "using": null, "check": "(auth.uid() = user_id)"},
    {"t": "user_best_scores", "n": "user_best_scores_upd", "cmd": "UPDATE", "roles": "{public}", "using": "(auth.uid() = user_id)", "check": "(auth.uid() = user_id)"},
    {"t": "user_game_scores", "n": "user_game_scores_ins", "cmd": "INSERT", "roles": "{public}", "using": null, "check": "(auth.uid() = user_id)"},
    {"t": "user_scores", "n": "user_scores_ins", "cmd": "INSERT", "roles": "{public}", "using": null, "check": "(auth.uid() = user_id)"},
    {"t": "user_scores", "n": "user_scores_upd", "cmd": "UPDATE", "roles": "{public}", "using": "(auth.uid() = user_id)", "check": "(auth.uid() = user_id)"}
  ]$json$;
  -- The hard maximum per game: [most one save may record, why]. The rule and
  -- the evidence are in the header, HARD MAXIMUM.
  v_hard_max constant jsonb := (select jsonb_object_agg(s.game, jsonb_build_array(s.hard_max, s.basis)) from (values
    ('afl-higher-lower',                  650, '2 x ceiling 325'),
    ('alphabet-sprint',                 10000, 'open: floor 10000 (held 26)'),
    ('ball-iq',                          3200, '2 x ceiling 1600'),
    ('baseball-career',                  2000, '2 x ceiling 1000'),
    ('baseball-connections',             2000, '2 x ceiling 1000'),
    ('blind-rank',                      10000, 'retired: floor 10000 (held 60)'),
    ('budget-builder',                   2240, '2 x held 1120 (ceiling 126)'),
    ('build-your-xi',                    1000, '2 x ceiling 500'),
    ('buzzer-beater',                    6090, '2 x ceiling 3045'),
    ('career',                           1400, '2 x ceiling 700'),
    ('career-ladder',                    2000, '2 x ceiling 1000'),
    ('career-path',                     10000, 'retired: floor 10000 (held 700)'),
    ('cbb-dynasty',                     14950, 'season: 10 x held 1495'),
    ('cbb-grid',                         1800, '2 x ceiling 900'),
    ('cbb-program',                     10000, 'retired: 10 x held 1000'),
    ('cfb-dynasty',                     10000, 'season: floor 10000 (held 790)'),
    ('cfb-higher-lower',                  650, '2 x ceiling 325'),
    ('champ-or-not',                       20, '2 x ceiling 10'),
    ('club-manager',                      260, '2 x ceiling 130'),
    ('clue-auction',                      200, '2 x ceiling 100'),
    ('college-grid',                     1800, '2 x ceiling 900'),
    ('connections',                      2000, '2 x ceiling 1000'),
    ('conquest-imperialism',             1886, '2 x ceiling 943'),
    ('conquest-mlb-imperialism',         1698, '2 x ceiling 849'),
    ('conquest-nba-imperialism',         1698, '2 x ceiling 849'),
    ('conquest-nhl-imperialism',         1798, '2 x ceiling 899'),
    ('conquest-soccer-imperialism',      2074, '2 x ceiling 1037'),
    ('dart-draft',                       1648, '2 x ceiling 824'),
    ('darts',                           10000, 'retired: floor 10000 (held 334)'),
    ('darts-501',                       10000, 'retired: floor 10000 (held 50)'),
    ('emoji-guess',                      1000, '2 x ceiling 500'),
    ('f1-constructor',                   2000, '2 x ceiling 1000'),
    ('f1-driver',                        2000, '2 x ceiling 1000'),
    ('f1-higher-lower',                   650, '2 x ceiling 325'),
    ('face-off',                         3800, '2 x ceiling 1900'),
    ('fantasy-draft',                     200, '2 x ceiling 100'),
    ('fight-career',                      200, '2 x ceiling 100'),
    ('fight-gym',                         200, '2 x ceiling 100'),
    ('fight-promoter',                    200, '2 x ceiling 100'),
    ('football-connect-4',               1000, '2 x ceiling 500'),
    ('football-draft',                   3000, '2 x ceiling 1500'),
    ('football-grid',                    2000, '2 x held 1000 (ceiling 900)'),
    ('football-timeline',                1000, '2 x ceiling 500'),
    ('footle',                           1400, '2 x ceiling 700'),
    ('free-kick',                        6980, '2 x ceiling 3490'),
    ('front-office',                    24600, 'season: 10 x held 2460'),
    ('gauntlet-draft',                    200, '2 x ceiling 100'),
    ('golf-higher-lower',                 650, '2 x ceiling 325'),
    ('grade-transfer',                   1000, '2 x ceiling 500'),
    ('guess-cbb-team',                   2000, '2 x ceiling 1000'),
    ('guess-nascar-driver',              2000, '2 x ceiling 1000'),
    ('guess-nfl-team',                   2400, '2 x ceiling 1200'),
    ('guess-soccer-club',                2400, '2 x ceiling 1200'),
    ('guess-soccer-club-questions',      2000, '2 x ceiling 1000'),
    ('guess-tennis-player',              2000, '2 x ceiling 1000'),
    ('guess-the-college',                2400, '2 x ceiling 1200'),
    ('guess-the-golfer',                 1200, '2 x ceiling 600'),
    ('guess-the-nation',                 2400, '2 x ceiling 1200'),
    ('guess-the-year',                   2000, '2 x ceiling 1000'),
    ('guess-transfer-value',             1800, '2 x ceiling 900'),
    ('hall-of-champions',               10000, 'unscored: floor 10000 (held 0)'),
    ('higher-lower',                    70000, 'open: 10 x held 7000'),
    ('higher-lower-transfers',          10000, 'open: floor 10000 (held 2)'),
    ('hockey-career',                    2000, '2 x ceiling 1000'),
    ('hockey-grid',                      1800, '2 x ceiling 900'),
    ('hockey-higher-lower',               650, '2 x ceiling 325'),
    ('hof-or-bust',                      2000, '2 x ceiling 1000'),
    ('idle-arena',                      10000, 'unscored: floor 10000 (held 0)'),
    ('jeopardy',                        30000, '2 x ceiling 15000'),
    ('lineup-builder',                  10000, 'retired: floor 10000 (held 500)'),
    ('list-quiz',                       10000, 'open: floor 10000 (held 28)'),
    ('minefield',                         880, '2 x ceiling 440'),
    ('missing-eleven',                    200, '2 x ceiling 100'),
    ('missing-five',                      200, '2 x ceiling 100'),
    ('missing-nine',                      200, '2 x ceiling 100'),
    ('missing-xi',                        200, '2 x ceiling 100'),
    ('mlb-connect-4',                    1000, '2 x ceiling 500'),
    ('mlb-front-office',                27900, 'season: 10 x held 2790'),
    ('mlb-gauntlet-draft',                200, '2 x ceiling 100'),
    ('mlb-grid',                         1800, '2 x ceiling 900'),
    ('mlb-higher-lower',                  650, '2 x ceiling 325'),
    ('mlb-my-career',                   22810, 'open: 10 x held 2281'),
    ('mystery-box',                      1920, '2 x ceiling 960'),
    ('nascar-chain',                    20000, 'open: 10 x held 2000'),
    ('nba-career',                       2000, '2 x ceiling 1000'),
    ('nba-chain',                       46000, 'open: 10 x held 4600'),
    ('nba-connect-4',                    1000, '2 x ceiling 500'),
    ('nba-connections',                  2000, '2 x ceiling 1000'),
    ('nba-front-office',                50800, 'season: 10 x held 5080'),
    ('nba-gauntlet-draft',                200, '2 x ceiling 100'),
    ('nba-grid',                         1800, '2 x ceiling 900'),
    ('nba-higher-lower',                  650, '2 x ceiling 325'),
    ('nba-lineup',                      10000, 'retired: floor 10000 (held 500)'),
    ('nba-my-career',                   28930, 'open: 10 x held 2893'),
    ('nba-starting-5',                   1000, '2 x ceiling 500'),
    ('nba-stat-line',                     200, '2 x ceiling 100'),
    ('nfl-career',                         12, '2 x ceiling 6'),
    ('nfl-connect-4',                    1000, '2 x ceiling 500'),
    ('nfl-connections',                  2000, '2 x ceiling 1000'),
    ('nfl-gauntlet-draft',                200, '2 x ceiling 100'),
    ('nfl-higher-lower',                  650, '2 x ceiling 325'),
    ('nfl-my-career',                   36770, 'open: 10 x held 3677'),
    ('nhl-connect-4',                    1000, '2 x ceiling 500'),
    ('nhl-connections',                  2000, '2 x ceiling 1000'),
    ('nhl-front-office',                21250, 'season: 10 x held 2125'),
    ('nhl-my-career',                   25430, 'open: 10 x held 2543'),
    ('olympics',                         2000, '2 x ceiling 1000'),
    ('overrated-underrated',            10000, 'retired: floor 10000 (held 800)'),
    ('pack-battle',                 540000000, 'open: 10 x held 54000000'),
    ('perfect-lineup',                    200, '2 x ceiling 100'),
    ('perfect-lineup-f1',                 200, '2 x ceiling 100'),
    ('perfect-lineup-nba',                200, '2 x ceiling 100'),
    ('perfect-lineup-nhl',                200, '2 x ceiling 100'),
    ('perfect-season-mlb',                324, '2 x ceiling 162'),
    ('perfect-season-nba',                164, '2 x ceiling 82'),
    ('perfect-season-nfl',                 34, '2 x ceiling 17'),
    ('perfect-season-nhl',                164, '2 x ceiling 82'),
    ('player-bingo',                     3400, '2 x ceiling 1700'),
    ('player-stock-market',               200, '2 x ceiling 100'),
    ('puck-detective',                    160, '2 x ceiling 80'),
    ('rank-em',                          2000, '2 x ceiling 1000'),
    ('rarity-round',                     1000, '2 x ceiling 500'),
    ('rebuild',                          1980, '2 x ceiling 990'),
    ('score-predictor',                  2000, '2 x ceiling 1000'),
    ('search-and-discard',                200, '2 x ceiling 100'),
    ('shirt-number',                     2000, '2 x ceiling 1000'),
    ('sign-the-player',             112000000, '2 x held 56000000 (ceiling 697)'),
    ('silverware-sort',                    30, '2 x ceiling 15'),
    ('soccer-career',                    2000, '2 x held 1000 (ceiling 100)'),
    ('soccer-grid',                      1900, '2 x held 950 (ceiling 900)'),
    ('sports-bingo',                      200, '2 x ceiling 100'),
    ('sports-millionaire',            2000000, '2 x ceiling 1000000'),
    ('squad-deal',                        200, '2 x ceiling 100'),
    ('stadium-draft',                   10000, 'retired: floor 10000 (held 350)'),
    ('stadium-tycoon',                  10000, 'unscored: floor 10000 (held 0)'),
    ('stat-detective',                  10000, 'unscored: floor 10000 (held 0)'),
    ('teammates',                        2000, '2 x ceiling 1000'),
    ('tennis-chain',                    10000, 'open: floor 10000 (held 750)'),
    ('tennis-higher-lower',               650, '2 x ceiling 325'),
    ('tennis-player',                   10000, 'retired: floor 10000 (held 800)'),
    ('tier-list',                       10000, 'retired: floor 10000 (held 800)'),
    ('transfer-path',                    2000, '2 x ceiling 1000'),
    ('ufc',                              1400, '2 x ceiling 700'),
    ('ufc-chain',                       10000, 'open: floor 10000 (held 450)'),
    ('ufc-game',                        10000, 'retired: floor 10000 (held 600)'),
    ('who-am-i',                        10000, 'unscored: floor 10000 (held 0)'),
    ('whod-they-beat',                     20, '2 x ceiling 10'),
    ('wonderkid-factory',               10000, 'unscored: floor 10000 (held 0)'),
    ('world-cup',                        2000, '2 x ceiling 1000'),
    ('world-cup-bracket',               10000, 'unscored: floor 10000 (held 0)'),
    ('world-xi',                           22, '2 x ceiling 11')
  ) as s(game, hard_max, basis));
  -- md5(prosrc) of the save this file installs. prosrc is the text between
  -- the dollar quotes below, byte for byte, so a CRLF checkout changes it.
  v_new_src_md5 constant text := '0f4e31715514d98757f0080f555d995a';
  -- Where the Round 569 arithmetic starts in both bodies.
  v_tail_at constant text := '  insert into public.user_game_scores (';
  v_probe_user constant text := '00000000-0000-0000-0000-000000000673';
  v_me text := current_user;
  v_ledger_exists boolean := to_regclass('private.economy_steps') is not null;
  v_owner oid;
  v_prior jsonb;
  v_prior_src text;
  v_new_src text;
  v_installed jsonb;
  v_reads_before text;
  v_bad text;
  v_r text;
  v_gc_policy record;
  v_probe_game text;
  v_probe_max integer;
begin
  set local lock_timeout = '1s';

  -- ---------------------------------------------------------------
  -- PRECONDITIONS. Reads only. Nothing below this block writes until
  -- every one of them has passed.
  -- ---------------------------------------------------------------

  -- a. the ledger
  if v_ledger_exists then
    if exists (select 1 from private.economy_steps where step = 'L1' and undone_at is null) then
      raise exception 'Round 673 L1: already applied (private.economy_steps holds a live L1 row). Nothing was changed.';
    end if;
    if exists (select 1 from private.economy_steps where step <> 'L1' and undone_at is null) then
      raise exception 'Round 673 L1: a later economy step is applied and not undone, so L1 cannot be applied under it. Nothing was changed.';
    end if;
  end if;

  -- b. the save is the Round 569 body, INVOKER, one signature, owned by postgres
  if v_save is null then
    raise exception 'Round 673 L1: public.record_auth_completion(text, integer, integer) does not exist. Nothing was changed.';
  end if;
  if (select count(*) from pg_proc where proname = 'record_auth_completion' and pronamespace = 'public'::regnamespace) <> 1 then
    raise exception 'Round 673 L1: record_auth_completion has more than one signature in public (an overload makes every 3 argument call ambiguous). Nothing was changed.';
  end if;
  if md5(pg_get_functiondef(v_save)) <> '5ae76ef7cbf874d58d65ee9050e2023c' then
    raise exception 'Round 673 L1: record_auth_completion is not the Round 569 body read on 2026-09-28 (md5 % , expected 5ae76ef7cbf874d58d65ee9050e2023c). Something changed it; re-read it before going on. Nothing was changed.',
      md5(pg_get_functiondef(v_save));
  end if;
  select proowner, prosrc into v_owner, v_prior_src from pg_proc where oid = v_save;
  if pg_get_userbyid(v_owner) <> 'postgres' then
    raise exception 'Round 673 L1: record_auth_completion is owned by %, not postgres. Nothing was changed.', pg_get_userbyid(v_owner);
  end if;
  if strpos(v_prior_src, v_tail_at) = 0 then
    raise exception 'Round 673 L1: the Round 569 body has no line starting "%". Nothing was changed.', v_tail_at;
  end if;

  -- c. no Round 644, 646 or 648 object, and no hard maximum table yet
  if to_regclass('private.r644_state') is not null
     or to_regclass('private.r644_soccer_scores_bak') is not null
     or to_regclass('private.r646_caps_bak') is not null
     or to_regclass('public.game_score_cap_history') is not null then
    raise exception 'Round 673 L1: a Round 644, 646 or 648 object exists, so one of those superseded files has run. The chain assumes none has. Nothing was changed.';
  end if;
  if to_regclass('private.game_hard_max') is not null then
    raise exception 'Round 673 L1: private.game_hard_max already exists, but no live L1 made it. Read it before going on. Nothing was changed.';
  end if;

  -- e. (before d, which names the tables) the six tables
  select string_agg(n, ', ') into v_bad from unnest(v_six) n where to_regclass('public.' || n) is null;
  if v_bad is not null then
    raise exception 'Round 673 L1: missing table(s): %. Nothing was changed.', v_bad;
  end if;
  select string_agg(c.relname::text, ', ') into v_bad
    from pg_class c
   where c.relnamespace = 'public'::regnamespace and c.relname::text = any (v_six)
     and (not c.relrowsecurity or c.relforcerowsecurity or c.relowner <> v_owner);
  if v_bad is not null then
    raise exception 'Round 673 L1: RLS off, FORCE RLS on, or an owner other than the save''s on: %. The DEFINER save relies on its owner bypassing RLS. Nothing was changed.', v_bad;
  end if;
  select string_agg(c.relname::text || '.' || t.tgname::text, ', ') into v_bad
    from pg_trigger t join pg_class c on c.oid = t.tgrelid
   where not t.tgisinternal and c.relnamespace = 'public'::regnamespace and c.relname::text = any (v_six);
  if v_bad is not null then
    raise exception 'Round 673 L1: user trigger(s) on the tables: %. None existed on 2026-09-28; read them before going on. Nothing was changed.', v_bad;
  end if;

  -- d. the defaults the server stamps with
  if (select pg_get_expr(d.adbin, d.adrelid) from pg_attrdef d join pg_attribute a on a.attrelid = d.adrelid and a.attnum = d.adnum
       where d.adrelid = 'public.user_game_scores'::regclass and a.attname = 'created_at') is distinct from 'now()'
     or (select pg_get_expr(d.adbin, d.adrelid) from pg_attrdef d join pg_attribute a on a.attrelid = d.adrelid and a.attnum = d.adnum
          where d.adrelid = 'public.game_completions'::regclass and a.attname = 'created_at') is distinct from 'now()'
     or not exists (select 1 from pg_attrdef d join pg_attribute a on a.attrelid = d.adrelid and a.attnum = d.adnum
                     where d.adrelid = 'public.game_completions'::regclass and a.attname = 'completed_on') then
    raise exception 'Round 673 L1: user_game_scores.created_at or game_completions.created_at does not default to now(), or game_completions.completed_on has no default. The client will not be able to send them after this. Nothing was changed.';
  end if;

  -- f. the write policies, exactly as read
  if (select coalesce(jsonb_agg(jsonb_build_object('t', tablename, 'n', policyname, 'cmd', cmd, 'roles', roles::text, 'using', qual, 'check', with_check)
                                order by tablename::text collate "C", policyname::text collate "C"), '[]'::jsonb)
        from pg_policies
       where schemaname = 'public' and tablename::text = any (v_six) and cmd <> 'SELECT')
     is distinct from v_writes_expected then
    raise exception 'Round 673 L1: the write policies on the six tables are not the seven read on 2026-09-28. Read pg_policies before going on. Nothing was changed.';
  end if;

  -- g. the games the hard maximum covers are exactly the allowlist's
  select string_agg(x.game || ' (' || x.side || ')', ', ' order by x.game collate "C") into v_bad
    from (select c.game::text as game, 'in game_score_caps, no hard maximum here' as side
            from public.game_score_caps c where not (v_hard_max ? c.game)
          union all
          select k, 'has a hard maximum here, not in game_score_caps'
            from jsonb_object_keys(v_hard_max) k
           where not exists (select 1 from public.game_score_caps c where c.game = k)) x;
  if v_bad is not null then
    raise exception 'Round 673 L1: game_score_caps is not the 151 games this file carries a hard maximum for: %. Re-derive those rows (header, HARD MAXIMUM). Nothing was changed.', v_bad;
  end if;

  -- ---------------------------------------------------------------
  -- WRITES
  -- ---------------------------------------------------------------

  -- 0. game_completions first, while holding nothing else (header, step 0)
  lock table public.game_completions in access exclusive mode;

  -- the text everything below replaces, so the undo restores it exactly
  select md5(coalesce(jsonb_agg(jsonb_build_object('t', tablename, 'n', policyname, 'cmd', cmd, 'roles', roles::text, 'using', qual)
                                order by tablename::text collate "C", policyname::text collate "C"), '[]'::jsonb)::text)
    into v_reads_before
    from pg_policies where schemaname = 'public' and tablename::text = any (v_six) and cmd = 'SELECT';
  v_prior := jsonb_build_object(
    'save_def', pg_get_functiondef(v_save),
    'save_def_md5', md5(pg_get_functiondef(v_save)),
    'save_src_md5', md5(v_prior_src),
    'save_acl', (select proacl::text from pg_proc where oid = v_save),
    'table_acl', (select jsonb_object_agg(c.relname::text, c.relacl::text) from pg_class c
                   where c.relnamespace = 'public'::regnamespace and c.relname::text = any (v_six)),
    'gc_column_acl', coalesce((select jsonb_object_agg(a.attname::text, a.attacl::text) from pg_attribute a
                                where a.attrelid = 'public.game_completions'::regclass and a.attacl is not null), '{}'::jsonb),
    'write_policies', (select jsonb_agg(jsonb_build_object('t', tablename, 'n', policyname, 'cmd', cmd, 'permissive', permissive,
                                                           'roles', to_jsonb(roles), 'using', qual, 'check', with_check)
                                        order by tablename::text collate "C", policyname::text collate "C")
                         from pg_policies where schemaname = 'public' and tablename::text = any (v_six) and cmd <> 'SELECT'),
    'read_policies_md5', v_reads_before);

  -- 1. the ledger
  if not v_ledger_exists then
    create table private.economy_steps (
      step text primary key,
      seq integer unique not null,
      applied_at timestamptz not null default now(),
      undone_at timestamptz,
      installed jsonb not null,
      prior jsonb not null
    );
    alter table private.economy_steps enable row level security;
    revoke all on table private.economy_steps from public, anon, authenticated;
    comment on table private.economy_steps is
      'Points economy V2 migration ledger (docs/design/POINTS-ECONOMY-V2.md section 9). One row per step: installed holds the md5 of everything the step created or replaced, prior the text it replaced, so an undo restores it exactly. Each step requires the previous one live and refuses if its own row is live.';
  end if;

  -- 2. the hard maximum per game
  create table private.game_hard_max (
    game text primary key,
    hard_max integer not null check (hard_max >= 1),
    basis text not null
  );
  alter table private.game_hard_max enable row level security;
  revoke all on table private.game_hard_max from public, anon, authenticated;
  comment on table private.game_hard_max is
    'Round 673 (economy step L1): the most one record_auth_completion call may record per game. Only the save reads it. The rule and the evidence for every value are in supabase/migrations/20260928_econ_l1_lock_the_doors.sql, HARD MAXIMUM.';
  insert into private.game_hard_max (game, hard_max, basis)
  select k, (v->>0)::integer, v->>1 from jsonb_each(v_hard_max) as e(k, v);

  -- 3. the save runs as its owner: the Round 569 body behind four refusals.
  --    The body below is not indented to the block on purpose: from its
  --    first insert on it must be the Round 569 text byte for byte.
  create or replace function public.record_auth_completion(
    p_game_slug text,
    p_score integer,
    p_correct integer
  )
  returns jsonb
  language plpgsql
  security definer
  set search_path = ''
  as $$
declare
  v_user uuid := auth.uid();
  v_today date := (now() at time zone 'utc')::date;
  v_games integer;
  v_total integer;
  v_streak integer;
  v_longest integer;
  v_hard_max integer;
begin
  if v_user is null then
    raise exception 'record_auth_completion needs a signed in user';
  end if;
  if p_game_slug is null or length(p_game_slug) = 0 then
    raise exception 'record_auth_completion needs a game slug';
  end if;

  -- Round 673: refuse what a player could abuse, before any write.
  if length(p_game_slug) > 64 then
    raise exception 'record_auth_completion refused: a game slug is at most 64 characters, this one is %', length(p_game_slug)
      using errcode = '22023';
  end if;
  select h.hard_max into v_hard_max
    from public.game_score_caps c
    join private.game_hard_max h on h.game = c.game
   where c.game = p_game_slug;
  if not found then
    raise exception 'record_auth_completion refused: "%" is not a game this site records', p_game_slug
      using errcode = '22023';
  end if;
  if coalesce(p_score, 0) < 0 or coalesce(p_score, 0) > v_hard_max then
    raise exception 'record_auth_completion refused: score % for "%" is outside 0 to %', p_score, p_game_slug, v_hard_max
      using errcode = '22023';
  end if;
  if p_correct < 0 or p_correct > 1000 then
    raise exception 'record_auth_completion refused: correct count % is outside 0 to 1000', p_correct
      using errcode = '22023';
  end if;

  insert into public.user_game_scores (user_id, game_type, score, correct_answers, puzzle_date)
  values (v_user, p_game_slug, coalesce(p_score, 0), coalesce(p_correct, 0), v_today);

  insert into public.daily_completions (user_id, game_slug, date)
  values (v_user, p_game_slug, v_today)
  on conflict (user_id, game_slug, date) do nothing;

  select count(*) into v_games
  from public.daily_completions
  where user_id = v_user and date = v_today;

  insert into public.user_scores as s
    (user_id, total_points, games_played_today, last_played_at, updated_at, current_streak, longest_streak)
  values
    (v_user, coalesce(p_score, 0), greatest(v_games, 1), now(), now(), 1, 1)
  on conflict (user_id) do update set
    total_points = s.total_points + excluded.total_points,
    games_played_today = excluded.games_played_today,
    current_streak = case
      when (s.last_played_at at time zone 'utc')::date = v_today then coalesce(s.current_streak, 0)
      when (s.last_played_at at time zone 'utc')::date = v_today - 1 then coalesce(s.current_streak, 0) + 1
      else 1
    end,
    longest_streak = greatest(
      coalesce(s.longest_streak, 0),
      case
        when (s.last_played_at at time zone 'utc')::date = v_today then coalesce(s.current_streak, 0)
        when (s.last_played_at at time zone 'utc')::date = v_today - 1 then coalesce(s.current_streak, 0) + 1
        else 1
      end
    ),
    last_played_at = now(),
    updated_at = now()
  returning total_points, current_streak, longest_streak into v_total, v_streak, v_longest;

  insert into public.user_best_scores as b (user_id, game_type, best_score)
  values (v_user, p_game_slug, coalesce(p_score, 0))
  on conflict (user_id, game_type) do update set
    best_score = excluded.best_score,
    achieved_at = now()
  where excluded.best_score > b.best_score;

  return jsonb_build_object(
    'total_points', v_total,
    'current_streak', v_streak,
    'longest_streak', v_longest,
    'games_played_today', greatest(v_games, 1)
  );
end;
$$;
  revoke all on function public.record_auth_completion(text, integer, integer) from public;
  revoke all on function public.record_auth_completion(text, integer, integer) from anon;
  grant execute on function public.record_auth_completion(text, integer, integer) to authenticated;

  -- 4. no direct write grant on the six tables
  revoke insert, update, delete, truncate, references, trigger
    on table public.user_scores, public.user_game_scores, public.user_best_scores,
             public.daily_completions, public.game_completions, public.game_score_caps
    from anon, authenticated;

  -- 5. no client write policy on the four account tables
  drop policy user_scores_ins on public.user_scores;
  drop policy user_scores_upd on public.user_scores;
  drop policy user_game_scores_ins on public.user_game_scores;
  drop policy user_best_scores_ins on public.user_best_scores;
  drop policy user_best_scores_upd on public.user_best_scores;
  drop policy daily_completions_ins on public.daily_completions;

  -- 6. the board insert: three columns, bounded lengths, no score bound
  grant insert (game, score, player_name) on table public.game_completions to anon, authenticated;
  alter policy "Anyone can log a completion" on public.game_completions
    with check (length(game) between 1 and 64 and length(player_name) between 1 and 40);

  -- ---------------------------------------------------------------
  -- PROOFS. Any failure raises, and the whole block rolls back.
  -- ---------------------------------------------------------------

  -- the save
  select prosrc into v_new_src from pg_proc where oid = v_save;
  if position(chr(13) in v_new_src) > 0 then
    raise exception 'Round 673 L1 proof: the save''s body carries carriage returns, so this file reached the database with CRLF line endings. Apply it with LF line endings (APPLY step 3). Nothing was changed.';
  end if;
  if md5(v_new_src) <> v_new_src_md5 then
    raise exception 'Round 673 L1 proof: the save''s body md5 is %, not the % this file pins. Nothing was changed.', md5(v_new_src), v_new_src_md5;
  end if;
  if strpos(v_new_src, v_tail_at) = 0
     or substr(v_new_src, strpos(v_new_src, v_tail_at)) <> substr(v_prior_src, strpos(v_prior_src, v_tail_at)) then
    raise exception 'Round 673 L1 proof: from its first insert to its end the save is not the Round 569 body it replaced. The arithmetic must land exactly as before. Nothing was changed.';
  end if;
  if not (select prosecdef from pg_proc where oid = v_save) then
    raise exception 'Round 673 L1 proof: record_auth_completion is not SECURITY DEFINER.';
  end if;
  if (select proconfig from pg_proc where oid = v_save) is distinct from array['search_path=""'] then
    raise exception 'Round 673 L1 proof: record_auth_completion search_path is not pinned empty.';
  end if;
  if (select count(*) from pg_proc where proname = 'record_auth_completion' and pronamespace = 'public'::regnamespace) <> 1 then
    raise exception 'Round 673 L1 proof: record_auth_completion has more than one signature.';
  end if;
  if has_function_privilege('anon', v_save, 'EXECUTE')
     or not has_function_privilege('authenticated', v_save, 'EXECUTE')
     or exists (select 1 from pg_proc p, aclexplode(p.proacl) x where p.oid = v_save and x.grantee = 0) then
    raise exception 'Round 673 L1 proof: record_auth_completion EXECUTE is not authenticated only.';
  end if;

  -- the hard maximum table
  if (select count(*) from private.game_hard_max) <> (select count(*) from public.game_score_caps)
     or exists (select 1 from public.game_score_caps c where not exists (select 1 from private.game_hard_max h where h.game = c.game)) then
    raise exception 'Round 673 L1 proof: private.game_hard_max does not hold exactly the games of game_score_caps.';
  end if;
  if has_table_privilege('anon', 'private.game_hard_max', 'SELECT') or has_table_privilege('authenticated', 'private.game_hard_max', 'SELECT')
     or not (select relrowsecurity from pg_class where oid = 'private.game_hard_max'::regclass) then
    raise exception 'Round 673 L1 proof: private.game_hard_max is reachable by a client role or has RLS off.';
  end if;

  -- table and column privileges
  select string_agg(r || ' ' || p || ' ' || t, ', ') into v_bad
    from unnest(v_roles) r, unnest(v_six) t, unnest(v_revoked) p
   where has_table_privilege(r, 'public.' || t, p);
  if v_bad is not null then
    raise exception 'Round 673 L1 proof: table write privilege still held: %', v_bad;
  end if;
  select string_agg(r || ' ' || p || ' ' || t, ', ') into v_bad
    from unnest(v_roles) r, unnest(v_six) t, unnest(array['UPDATE', 'REFERENCES']) p
   where has_any_column_privilege(r, 'public.' || t, p);
  if v_bad is not null then
    raise exception 'Round 673 L1 proof: column level privilege still held: %', v_bad;
  end if;
  select string_agg(r || ' INSERT ' || t, ', ') into v_bad
    from unnest(v_roles) r, unnest(v_six) t
   where t <> 'game_completions' and has_any_column_privilege(r, 'public.' || t, 'INSERT');
  if v_bad is not null then
    raise exception 'Round 673 L1 proof: column INSERT held outside game_completions: %', v_bad;
  end if;
  foreach v_r in array v_roles loop
    if (select string_agg(a.attname::text, ',' order by a.attname::text collate "C")
          from pg_attribute a
         where a.attrelid = 'public.game_completions'::regclass and a.attnum > 0 and not a.attisdropped
           and has_column_privilege(v_r, a.attrelid, a.attnum, 'INSERT')) is distinct from 'game,player_name,score' then
      raise exception 'Round 673 L1 proof: % may insert game_completions columns other than exactly game, player_name, score.', v_r;
    end if;
  end loop;
  select string_agg(r || ' ' || t, ', ') into v_bad
    from unnest(v_roles) r, unnest(v_six) t
   where not has_table_privilege(r, 'public.' || t, 'SELECT');
  if v_bad is not null then
    raise exception 'Round 673 L1 proof: SELECT lost: %', v_bad;
  end if;

  -- policies
  if exists (select 1 from pg_policies where schemaname = 'public' and cmd <> 'SELECT'
              and tablename::text = any (array['user_scores', 'user_game_scores', 'user_best_scores', 'daily_completions', 'game_score_caps'])) then
    raise exception 'Round 673 L1 proof: a write policy is left on an account table or game_score_caps.';
  end if;
  if (select count(*) from pg_policies where schemaname = 'public' and tablename = 'game_completions' and cmd <> 'SELECT') <> 1 then
    raise exception 'Round 673 L1 proof: game_completions does not have exactly one write policy.';
  end if;
  select policyname, cmd, roles::text as roles, with_check into v_gc_policy
    from pg_policies where schemaname = 'public' and tablename = 'game_completions' and cmd <> 'SELECT';
  if v_gc_policy.policyname <> 'Anyone can log a completion' or v_gc_policy.cmd <> 'INSERT'
     or v_gc_policy.roles <> '{anon,authenticated}' or v_gc_policy.with_check = 'true'
     or position('length(game)' in v_gc_policy.with_check) = 0
     or position('length(player_name)' in v_gc_policy.with_check) = 0 then
    raise exception 'Round 673 L1 proof: the game_completions insert policy is not the bounded one (%).', v_gc_policy.with_check;
  end if;
  if (select md5(coalesce(jsonb_agg(jsonb_build_object('t', tablename, 'n', policyname, 'cmd', cmd, 'roles', roles::text, 'using', qual)
                                    order by tablename::text collate "C", policyname::text collate "C"), '[]'::jsonb)::text)
        from pg_policies where schemaname = 'public' and tablename::text = any (v_six) and cmd = 'SELECT') <> v_reads_before then
    raise exception 'Round 673 L1 proof: a read policy changed.';
  end if;

  -- executed as each client role. Every write below either touches no row
  -- (where false) or must be refused; an accepted probe raises P0673, which
  -- rolls its own rows back, and then the whole block.
  select h.game, h.hard_max into v_probe_game, v_probe_max
    from private.game_hard_max h order by h.game collate "C" limit 1;
  v_bad := null;
  foreach v_r in array v_roles loop
    perform set_config('role', v_r, true);

    perform 1 from public.user_scores limit 1;
    perform 1 from public.user_game_scores limit 1;
    perform 1 from public.user_best_scores limit 1;
    perform 1 from public.daily_completions limit 1;
    perform 1 from public.game_completions limit 1;
    perform 1 from public.game_score_caps limit 1;

    -- the live client's board insert, exactly its columns
    insert into public.game_completions (game, score, player_name) select 'l1-probe', 1, 'l1-probe' where false;

    begin
      update public.user_scores set total_points = total_points where false;
      v_bad := concat_ws(', ', v_bad, v_r || ' may UPDATE user_scores');
    exception when insufficient_privilege then null;
    end;
    begin
      insert into public.user_scores (user_id) select null::uuid where false;
      v_bad := concat_ws(', ', v_bad, v_r || ' may INSERT user_scores');
    exception when insufficient_privilege then null;
    end;
    begin
      insert into public.user_game_scores (user_id, game_type, score) select null::uuid, 'x', 0 where false;
      v_bad := concat_ws(', ', v_bad, v_r || ' may INSERT user_game_scores');
    exception when insufficient_privilege then null;
    end;
    begin
      update public.user_best_scores set best_score = best_score where false;
      v_bad := concat_ws(', ', v_bad, v_r || ' may UPDATE user_best_scores');
    exception when insufficient_privilege then null;
    end;
    begin
      delete from public.daily_completions where false;
      v_bad := concat_ws(', ', v_bad, v_r || ' may DELETE daily_completions');
    exception when insufficient_privilege then null;
    end;
    begin
      update public.game_score_caps set max_score = max_score where false;
      v_bad := concat_ws(', ', v_bad, v_r || ' may UPDATE game_score_caps');
    exception when insufficient_privilege then null;
    end;
    begin
      update public.game_completions set score = score where false;
      v_bad := concat_ws(', ', v_bad, v_r || ' may UPDATE game_completions');
    exception when insufficient_privilege then null;
    end;
    begin
      insert into public.game_completions (game, player_name, created_at) select 'x', 'x', now() where false;
      v_bad := concat_ws(', ', v_bad, v_r || ' may set game_completions.created_at');
    exception when insufficient_privilege then null;
    end;
    begin
      insert into public.game_completions (game, player_name, completed_on) select 'x', 'x', current_date where false;
      v_bad := concat_ws(', ', v_bad, v_r || ' may set game_completions.completed_on');
    exception when insufficient_privilege then null;
    end;

    -- the bound, on rows that must be refused
    begin
      insert into public.game_completions (game, score, player_name) values ('l1-bound-probe', 0, repeat('x', 41));
      raise exception using errcode = 'P0673', message = 'accepted';
    exception
      when insufficient_privilege then null;
      when sqlstate 'P0673' then v_bad := concat_ws(', ', v_bad, v_r || ' posted a 41 character name');
    end;
    begin
      insert into public.game_completions (game, score, player_name) values ('', 0, 'l1-bound-probe');
      raise exception using errcode = 'P0673', message = 'accepted';
    exception
      when insufficient_privilege then null;
      when sqlstate 'P0673' then v_bad := concat_ws(', ', v_bad, v_r || ' posted an empty game');
    end;
    begin
      insert into public.game_completions (game, score, player_name) values (repeat('g', 65), 0, 'l1-bound-probe');
      raise exception using errcode = 'P0673', message = 'accepted';
    exception
      when insufficient_privilege then null;
      when sqlstate 'P0673' then v_bad := concat_ws(', ', v_bad, v_r || ' posted a 65 character game');
    end;

    -- the save's refusals. anon may not call it at all; authenticated, with a
    -- probe user id that owns no row, must be refused before any write.
    perform set_config('request.jwt.claim.sub', v_probe_user, true);
    if v_r = 'anon' then
      begin
        perform public.record_auth_completion(v_probe_game, 0, 0);
        raise exception using errcode = 'P0673', message = 'accepted';
      exception
        when insufficient_privilege then null;
        when sqlstate 'P0673' then v_bad := concat_ws(', ', v_bad, 'anon called the save');
      end;
    else
      begin
        perform public.record_auth_completion(repeat('g', 65), 0, 0);
        raise exception using errcode = 'P0673', message = 'accepted';
      exception
        when invalid_parameter_value then null;
        when sqlstate 'P0673' then v_bad := concat_ws(', ', v_bad, 'the save took a 65 character slug');
      end;
      begin
        perform public.record_auth_completion('l1-probe-not-a-game', 0, 0);
        raise exception using errcode = 'P0673', message = 'accepted';
      exception
        when invalid_parameter_value then null;
        when sqlstate 'P0673' then v_bad := concat_ws(', ', v_bad, 'the save took a game off the allowlist');
      end;
      begin
        perform public.record_auth_completion(v_probe_game, -1, 0);
        raise exception using errcode = 'P0673', message = 'accepted';
      exception
        when invalid_parameter_value then null;
        when sqlstate 'P0673' then v_bad := concat_ws(', ', v_bad, 'the save took a negative score');
      end;
      begin
        perform public.record_auth_completion(v_probe_game, v_probe_max + 1, 0);
        raise exception using errcode = 'P0673', message = 'accepted';
      exception
        when invalid_parameter_value then null;
        when sqlstate 'P0673' then v_bad := concat_ws(', ', v_bad, 'the save took a score above ' || v_probe_game || '''s hard maximum');
      end;
      begin
        perform public.record_auth_completion(v_probe_game, 0, 1001);
        raise exception using errcode = 'P0673', message = 'accepted';
      exception
        when invalid_parameter_value then null;
        when sqlstate 'P0673' then v_bad := concat_ws(', ', v_bad, 'the save took a correct count of 1001');
      end;
    end if;
    perform set_config('request.jwt.claim.sub', '', true);

    perform set_config('role', v_me, true);
  end loop;
  if v_bad is not null then
    raise exception 'Round 673 L1 proof, executed: %', v_bad;
  end if;

  -- the ledger row
  if has_table_privilege('anon', 'private.economy_steps', 'SELECT') or has_table_privilege('authenticated', 'private.economy_steps', 'SELECT')
     or not (select relrowsecurity from pg_class where oid = 'private.economy_steps'::regclass) then
    raise exception 'Round 673 L1 proof: private.economy_steps is reachable by a client role or has RLS off.';
  end if;
  v_installed := jsonb_build_object(
    'save_def_md5', md5(pg_get_functiondef(v_save)),
    'save_src_md5', md5(v_new_src),
    'save_acl', (select proacl::text from pg_proc where oid = v_save),
    'hard_max_md5', (select md5(jsonb_object_agg(h.game, jsonb_build_array(h.hard_max, h.basis))::text) from private.game_hard_max h),
    'table_acl_md5', (select jsonb_object_agg(c.relname::text, md5(c.relacl::text)) from pg_class c
                       where c.relnamespace = 'public'::regnamespace and c.relname::text = any (v_six)),
    'gc_column_acl', coalesce((select jsonb_object_agg(a.attname::text, a.attacl::text) from pg_attribute a
                                where a.attrelid = 'public.game_completions'::regclass and a.attacl is not null), '{}'::jsonb),
    'write_policies_md5', (select md5(coalesce(jsonb_agg(jsonb_build_object('t', tablename, 'n', policyname, 'cmd', cmd, 'roles', roles::text, 'using', qual, 'check', with_check)
                                                         order by tablename::text collate "C", policyname::text collate "C"), '[]'::jsonb)::text)
                             from pg_policies where schemaname = 'public' and tablename::text = any (v_six) and cmd <> 'SELECT'),
    'read_policies_md5', v_reads_before);
  insert into private.economy_steps (step, seq, installed, prior)
  values ('L1', 1, v_installed, v_prior)
  on conflict (step) do update
    set applied_at = now(), undone_at = null, installed = excluded.installed, prior = excluded.prior;

  raise notice 'Round 673 L1 applied: record_auth_completion is SECURITY DEFINER (the Round 569 arithmetic behind four refusals), direct writes revoked on six tables, six write policies dropped, the board insert bounded to three columns and two lengths, a hard maximum for each of % games. Save md5 now %.',
    (select count(*) from private.game_hard_max), v_installed->>'save_def_md5';
end
$l1$;
