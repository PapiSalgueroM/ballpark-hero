# Points economy V2: one spec, Rounds 673 to 698

**Status, 2026-09-28.** A design, not a build. Nothing in it is applied, published or merged to main.
It supersedes the release order in the top entry of `docs/PROJECT-STATE.md` on `points-economy`
("Unapplied, and the order", steps 1 to 6) and the migrations `20260928_round_646_caps_at_real_ceilings.sql`,
`20260928_round_648_profile_clamp.sql` and `20260928_round_648_profile_recompute.sql`, which are never
applied (Round 673 guards them, Round 675 deletes them). Round 644's migration is superseded too and
never applied (section 9).

**Where it comes from.** The six economy rounds as merged on `points-economy` (`917fea00`), the three
adversarial reviews of the merged economy (player lens R0, data lens R1, fence lens R2: 2 blockers,
21 majors, 19 minors), three competing designs (skill and fairness, exploits and integrity, data and
rollout) and two judges who scored them and listed every conflict between them. This spec takes:

- the **data spine** from the data design: rows stamped with the scale they were recorded on, caps
  kept in periods, one SQL view that values every row for every surface, a linear migration chain
  with a ledger, no recompute of history ever, the Eastern day everywhere;
- the **door** from the integrity design: the account tables are written only by a SECURITY DEFINER
  save with fixed SQL, direct grants revoked, applied now as Round 673; one ranked result per
  identity per game per Eastern day, claimed by the server for accounts; every decision saved before
  its result is shown; tabs as views of one run record;
- the **scoring** from the skill design: every game day is worth 0 to 100, points start past a
  knowledge line measured on the moves a player with no knowledge really makes, 100 is a play the
  board really allows, luck is the show and never the score, and a game that cannot meet that is
  "for fun" until it is rebuilt.

Every conflict the judges found is settled in section 4, with the reason. Every review defect is
mapped to the round that closes it in section 14, and what is deliberately left is in section 15.

**Before building.** Reserve Rounds 673 to 698 on `docs/WORKBOARD.md` **on main**. A claim made on
a branch is invisible to main (the 2026-09-17 lane collision). Each round is built on its own branch
from `points-economy` and merged back into it. Every migration here is applied only by the lead,
after an adversarial review of the round (every round that changes a rule, a rating or a grant gets
one before merge), through the Supabase MCP, and followed by `get_advisors`.

---

## 1. The rules

Nine rules. Every part of the design implements one, and every rule has a fence (section 12).

1. **One unit.** A game day is worth 0 to 100 points in every game. One SQL view,
   `public.scored_plays`, turns a recorded row into points, and every surface that says "points"
   reads it: the result card's total, the header's Points today, the profile's Total Points and
   rank, the World Leaderboard (all time, today, week, month), the points badges. No browser code
   adds scores into a public total.
2. **A row is worth what its own scale says, forever.** Every scored row carries the scale it was
   recorded on. Caps are kept per (game, scale) as periods and are never edited in place. A change in
   how a game scores ships a new scale or a new period that opens at an Eastern midnight. Past days
   never change worth, and nothing ever recomputes a stored total.
3. **Points start past the knowledge line, and 100 is reachable.** On every paying game, each move
   policy a player with no knowledge really uses (the top listed option, a constant answer, random,
   the biggest number on screen, following a lifeline, standing pat) averages at most 5 of 100, driven
   through the game's own moves. A perfect play on each board records exactly 100. A game that cannot
   meet this records plays with no score ("for fun") until it is rebuilt.
4. **Luck is the show, not the score.** A seeded season, a shootout, a knockout bracket, a pack's
   dollars, a Millionaire ladder's money are shown and shared. Points come from what the player
   chose, valued in expectation where chance follows the choice.
5. **One ranked result per identity, per game, per Eastern day.** For a signed in player the server
   holds the claim. For a signed out player the browser's run record holds it, and the World
   Leaderboard counts at most one day's worth (at most 100) per name per game per day. Every other
   finish is practice: it counts as a play and pays nothing.
6. **A decision is final when it is made.** Every step is saved before its result is shown. A result
   is recorded the moment it is fixed, not when its animation ends. Tabs are views of one run record,
   read again before every step. A ranked run that cannot be brought back ends at what it had banked.
7. **Only the save writes the account tables.** `user_scores`, `user_game_scores`,
   `user_best_scores` and `daily_completions` are written only by SECURITY DEFINER functions with
   fixed SQL. The server stamps every time and day. Nothing public reads a number a browser can write
   except through a bound of at most 100 a name a game a day.
8. **The Eastern day everywhere** a day is taken for points, the daily tick, the streak, Games Today
   and the daily legend: `public.et_day(t) = (t at time zone 'America/New_York')::date` in SQL,
   `getTodayET` and `getEtDateString` in the browser.
9. **Help makes it practice, and practice never shows a ranked answer.** Anything that makes a ranked
   run easier (unlimited guesses, an easier tier, a hint beyond the rules) turns that run into
   practice for good. A practice pool never holds an answer from the next 365 days of a daily.

---

## 2. Production as it is

Read only on production by the design pass and the two judges on 2026-09-28 and 2026-09-29 (project
`flawuiqbvjobmkfkauhw`, Postgres 17.6). The Supabase MCP did not connect for this synthesis, so
nothing below was re-read today. **That is why every migration in section 9 re-reads its own
preconditions and refuses on any drift, before any write.**

- **The save.** `public.record_auth_completion(text, integer, integer)` is the Round 569 body, md5 of
  `pg_get_functiondef` `5ae76ef7cbf874d58d65ee9050e2023c`: SECURITY INVOKER, owned by postgres, adds
  the raw score to `user_scores.total_points`, days on UTC.
- **Grants.** anon and authenticated hold INSERT, UPDATE, DELETE and TRUNCATE on `user_scores`,
  `user_game_scores`, `user_best_scores`, `daily_completions`, `game_completions` and
  `game_score_caps`. RLS is the only barrier:
  - `user_scores`: INSERT and UPDATE policies of only `auth.uid() = user_id`, over every column, so a
    player can PATCH their own `total_points` and streaks (R1.D4);
  - `user_game_scores`: INSERT of only `auth.uid() = user_id`, no bound on score, no CHECK, no
    trigger, `created_at` client suppliable;
  - `game_completions`: INSERT `WITH CHECK (true)` for anon and authenticated, and the column grant
    includes `created_at` and `completed_on`, so anyone can post a backdated row under any name;
  - `daily_badges`: the client inserts its own Daily Legend badge (`useDailyLegend.ts:103`) with any
    date and streak.
- **The live client writes none of the account tables directly.** Checked on main again for this
  spec: the only writes are `record_auth_completion`, the `game_completions` insert of exactly
  `{game, score, player_name}` (`src/lib/completions.ts`), and the `daily_badges` insert. No trigger,
  cron job or other function writes the account tables; `handle_new_user` writes only `profiles`.
- **pg_graphql 1.5.11 is installed** and `graphql_public.graphql` is executable by anon and
  authenticated. Several mutations in one GraphQL request run in one transaction (judge 2).
- **Unapplied.** `private` holds only `app_secrets`: Rounds 644, 646 and 648 are not applied.
  Round 644's client has been live since Release D.
- **Accounts.** 840 auth users (0 anonymous), 637 `user_scores` rows, 2,664,720 stored points, median
  1,829, top 61,839. 22 of 637 accounts have a profile display name.
- **No sign of abuse yet.** 0 accounts above the raw sum of their own rows, 0 `user_game_scores` rows
  above 100,000 or below 0 or off the allowlist, 0 future dated rows, no backdated
  `game_completions` row, longest streak 25. The holes are open, not yet used.
- **Load.** `game_completions` 717,338 rows (329,578 scored), 14,000 to 25,000 a day from 300 to 630
  names. `club-manager` wrote 56,037 scored rows in 7 days through `recordActivity` (a mid season
  number per match), up to 992 for one name in one day. `user_game_scores` 22,375 rows. 10,671 names
  on the board, 6,463 of them word pattern guest handles. Cron `refresh-player-ranks` every 5 minutes.
- **Soccer Career.** First row on the 644 scale (a score that is not a multiple of 50): id 593987 at
  2026-09-23 00:24:53 UTC, none before it. About 808 clean new scale rows since, 677 at exactly 50
  or 100, 47 old tab rows above 100 up to 2026-09-28 02:20 UTC. The board pays the new scale rows a
  tenth: 891 player days, 650 names, 72,991 board points missing.
- **Floating caps.** 21 caps are NULL; seven with scored rows float on a daily 99th percentile, so
  their past days move every day: perfect-season-nhl 81, clue-auction 60, nba-stat-line 96,
  player-bingo 1700, list-quiz 28, cbb-grid 900, higher-lower-transfers 2.
- **Days.** 1,179 of 5,227 `daily_completions` rows (22.6 percent) sit on a UTC date that is not their
  Eastern day. One measured evening (2026-09-27, 20:00 to 24:00 ET) wrote 8 daily ticks.
- **Fingerprints** (the data design): `global_leaderboard` md5 `56a5f15c1f180dfdc82278391f3e52a8`,
  `global_rank` `4da21bd9801909bd0187e654c34ba52f`, `player_ranks` view definition
  `397d0f5ff1d102bcd9e7fd3cb1db24a9`, caps content `3345521c72ef299052bc4c0b31997561` (151 rows).
- **Edge.** `nba-evaluate-lineup` deployed v5 has no working AI, so every NBA Starting 5 under the
  645b client records 0. The repo copy is backward compatible with the live client.

---

## 3. What each surface means after Release G

| Surface | Reads | Unit |
|---|---|---|
| Result card | the game's own result, then `pointsFor` of the engine | "Points: 62 of 100" |
| Header, Points today (signed in) | `account_points(uid).today` | day points |
| Header, Points today (signed out) | `global_rank(handle, 'today')` | day points |
| Profile, Total Points | `account_points(uid).total` (live, not a cached total) | day points |
| Profile, rank | `account_ranks`, labelled "#N of M signed in players" | rank |
| Profile, World Leaderboard line | `global_rank(board name, 'alltime')`, labelled | rank |
| World Leaderboard | `scored_days` where surface = 'board' | day points |
| Best Scores | `account_bests`: best day points per game and its day | day points |
| Points badges (signed in) | new total, or a kept award in `account_awards` | day points |
| Points badges (signed out) | board total for the handle, or the browser's kept set | day points |

`user_scores.total_points` stops moving at T0 and is kept as the legacy total. Nothing adds to it
again.

---

## 4. The conflicts, settled

Every conflict both judges listed, with the decision and the reason.

| # | Conflict | Decision | Why |
|---|---|---|---|
| 1 | Who writes the ledger: a DEFINER door with grants revoked, or an INVOKER save behind a `dukb.save` setting trigger | **DEFINER, fixed SQL, direct grants revoked.** `simAuthSave` section 3 flips from "never DEFINER" to "DEFINER, fixed SQL, no `execute`, no `format(`, `auth.uid()` only, pinned empty `search_path`, EXECUTE to authenticated only, no direct write grant". | The INVOKER save needs the player to hold write grants, which is the R1.D4 hole. The setting gate is plausibly bypassed by one GraphQL request whose first mutation calls the save (which sets the setting for the transaction) and whose second patches `user_scores`. The exec_sql lesson is about arbitrary SQL, and the door runs none; its behaviour is executed in PGlite, not grepped. |
| 2 | Three function contracts: two different `record_play` signatures, and a 4 argument `record_auth_completion` overload | **One new function, `public.record_play`, one signature, never overloaded.** `record_auth_completion(text, integer, integer)` keeps its signature as the old tab shim. | A 4 argument overload with a default makes every 3 argument call ambiguous ("function is not unique", PostgREST PGRST203), which would fail every signed in save from the live client. `simPlayDoor` requires exactly one `pg_proc` row per door name. |
| 3 | What a stored score means: day points with `scale = 1`, raw with a text tag valued on read, or raw priced by `least(best, cap)` | **Raw result plus a text scale tag, valued on read.** A game on the knowledge line records its day points on scale `dp` (cap 100 for every game). A game whose line is 0 and whose ceiling every board reaches (typed answers, grids) records its raw score on scale `g`, valued at its engine ceiling. | The knowledge line is per board, so only the client can compute day points; the server still values every row through one view and one cap table, and keeps raw results where they mean something. One mechanism, two tags. |
| 4 | Rounds 644, 646, 648: apply 644 then never 646 and 648; forbid 644 and delete 646 and 648; apply 644 then 646 and keep 648's recompute | **The data design's path.** 644 is superseded (its file refuses once `private.economy_steps` exists), 646 and both 648 files are deleted, their derivations live on in `scripts/genScaleCaps.mjs`. | 646 before 644 deadlocks (R1.D0); 648 revalues history on every cap change (R1.D3); 644's division is replaced by a scale rule that rewrites no recorded score. Every step's precondition looks only backward. |
| 5 | Profile total: a function cache, a materialized view, or the stored total incremented by `v_add` | **`account_points(uid)`, a live STABLE function over `scored_days`, plus `account_ranks` (materialized, 5 minutes) for rank only.** `total_points` is frozen at T0. | A stored running total is the thing a player could write and the thing a recompute rewrites. A live function has no lag after a play (judge 2's point on a 5 minute view). |
| 6 | What counts in a day: the first ranked row (a name keyed unique index), the first claim, or the day's best | **The ranked result.** Accounts: one server claim per (account, game, Eastern day) and a unique index on `user_game_scores (user_id, game_type, ranked_day)`. Guests: the browser run record sends one scored row; the view takes the day's best per name, which for an honest browser is that one row. | A unique index keyed on a public name lets anyone post a 0 under every name at midnight and void their day (judge 2). The best of the day cannot be griefed down, only inflated to at most 100, which is what a perfect player earns. |
| 7 | When the day is spent: at start or at finish | **At the first scored action** for a shared daily board (first guess, vote, pick, call); **at the deal** for a game with a fresh deal per run (so a bad deal cannot be rerolled unseen); **at week one** for a season; **at the finish** for a multi day career. | A claim at page open would spend the day of anybody who only looked; a claim at finish lets a free game be rerolled by abandoning before the finish (judge 2). |
| 8 | Day boundary: Eastern everywhere, UTC in the door, Eastern only in an index | **Eastern everywhere.** The door writes `puzzle_date`, the daily tick and the streak on the Eastern day; the shim switches at T0; readers move to `coalesce(ranked_day, et_day(created_at))`. The only history rewrite is the one evening window of `daily_completions` whose unique key would otherwise collide (section 9, T0). | 22.6 percent of ticks sit on the wrong day today. Readers move to computed days, so stored UTC dates never need rewriting except where a unique key forces it. |
| 9 | Identity: guest keys with server owned names, or client names | **Accounts own their names; guest handles stay unowned.** The door names an account's board row itself; the insert policy refuses a name that belongs to another account (`public.name_is_owned`). No guest keys (section 15, item 2). | Guest keys as designed let a script claim the top guests' handles first and inherit their history, and a global registration throttle is a lever to keep every new visitor off the board (judge 2). A legacy handle cannot be proven by anyone. Guest names stay bounded instead. |
| 10 | Seasons: value added at commit, 647's ledger plus session claims, or 647's ledger best of the day | **Release G: 647's ledger plus a season claim at week one** (one ranked season a day, abandoning a claimed season forfeits it at 0 behind a confirm). **Release H (692, 693): value added in expectation at commit.** | The claim closes the abandon reroll (R0.D8) now. Value added closes R0.D7 but needs deterministic offseasons in six engines and a measured expert; it is built, not assumed, and a sport whose expert does not beat greedy stays on the ledger. |
| 11 | Big and dollar scores: refuse a save over 100,000; refuse nothing; rebuild on calls and rungs | **Refuse nothing. Rebuild Pack Battle on calls landed and Sports Millionaire on rungs climbed (Round 682).** The door clamps a score to its scale's cap and counts the clamp. | Refusing a save loses the tick, the streak and the best (R0.D4, R0.D5); production refuses nothing today, so a refusal would be a regression. Worth is bounded by the cap anyway. |
| 12 | Sign the Player: paid nothing as a "dollar game", 697 on the 646 ceiling, or a house expert | **A house expert on the same seed makes the perfect reachable (Round 685).** | It records at most 697 points, not dollars; zeroing it misclassifies a skill game (judge 1). |
| 13 | The scale: knowledge line, linear from 0 against 646 ceilings, or raw | **The knowledge line for every paying game** (`g` games have a line of 0 and a ceiling every board reaches, so their linear map is the knowledge line). | 646's ceilings leave the blocker in place: a flawless Perfect Lineup pays 82 to 86, the always HOF clicker 73 (judge 1). |
| 14 | HOF or Bust and Score Predictor: for fun, rank each item once, or pay at 646 caps | **For fun until their data rebuilds (695, 696).** | One binary decision a day cannot pass the line; ranking each item once leaves a regular on practice for good after one cycle (19 days for HOF). |
| 15 | Unlimited leaks: disjoint pools and a generated Rank 'Em, or an empty Rank 'Em Unlimited | **Disjoint pools (686); Rank 'Em for fun until its generated daily (697).** | With 14 rounds, a disjoint split leaves a 7 day memory test. |
| 16 | Badges: seed kept awards from the largest tally with no cut, or keep 648's cut and floor | **Server awards from the stored total at T0; the browser's kept set from the largest local tally, as the page showed it.** | The owner's rule is that a badge earned is never taken away. The server total never held a pack's dollars (no pack-battle row in `user_game_scores`); a browser's inflated badge is private and ranks nothing (section 15, item 9). |
| 17 | Fences: replace `simFreePoints` with `simKnowledgeLine`; rewire `simCapsAreCeilings`; add a DEFINER door fence | **All three.** `simKnowledgeLine` owns the rule; `simCapsAreCeilings` checks the generated `g` rows; `simPlayDoor` and `simEconomyMigrations` own the database; `simProfileTotal` retires with 648's code. | Each fence then holds one rule, not a copy of it. |
| 18 | `recordActivity` with or without a score | **Without.** The parameter is removed, so tsc refuses a scored activity ping. | Club Manager writes about 56,000 mid season rows a week onto the board through it (R2.D4). |
| 19 | Order on production | **673 now; 675, 676, 677 on normal days after Release F; the rules seed the day before release; T0 at the release midnight.** No step waits on a quiet window. | Any gate that counts rows a visitor can write can be held off by a visitor (R1.D9, and judge 2 on two of the designs). |
| 20 | Balanced answer keys (exactly 5 true, 3 right per position) | **Independent keys with a per day line.** Each item's answer is drawn on its own; the day's line is set on the day's own key so a constant answer pays exactly 0 and random averages at most 5. | With balanced keys and a reveal after each question, counting what is left pays about 16.9 on Ball IQ and 7.4 on Champ or Not (judge 2). Independent items carry no information about each other. |
| 21 | Old tabs after the release | **Rows valued on the legacy scale only in games whose scoring did not change.** In every game whose scale or rules changed, the legacy period closes at the release midnight, so an old tab's row there is worth 0. | An old tab keeps the old exploits (a top name Perfect Lineup) for up to a week otherwise. Round 667's stale chunk reload already moves most tabs to the new bundle on their next navigation. |

---

## 5. Data shape

### Server, by the step that creates it

All `private` tables: no grants to anon or authenticated, RLS on, no policies. Every public table:
RLS on in the same statement block, public read, no API write. Every step then runs `get_advisors`.

**L1 (Round 673).**
- `private.economy_steps (step text primary key, seq integer unique not null, applied_at timestamptz
  not null default now(), undone_at timestamptz, installed jsonb not null, prior jsonb not null)`.
  `installed` holds the md5 of every function body, view definition, policy and grant set the step
  created or replaced; `prior` holds the text it replaced, so an undo restores byte for byte.

**E1 (Round 675).**
- `public.et_day(timestamptz) returns date`: SQL, IMMUTABLE, PARALLEL SAFE.
- `public.score_scales (scale text primary key, note text not null)`: `legacy` (every row recorded
  before its game carried a tag), `644` (Soccer Career's legacy score out of 100, Player Bingo
  scored), `g` (raw, valued at the engine ceiling), `dp` (day points, 0 to 100).
- `public.game_scale_caps (game text references game_score_caps(game) on delete cascade, scale text
  references score_scales, valid_from timestamptz not null default '-infinity', valid_until
  timestamptz not null default 'infinity', cap numeric not null check (cap >= 1), note text not null,
  primary key (game, scale, valid_from), check (valid_from < valid_until))`. No overlap per (game,
  scale), checked by every step that writes it and by `simOneWorth`.
- `public.legacy_scale_rules (game text primary key, from_ts timestamptz not null, max_score integer,
  scale text references score_scales, note text not null)`: two rows, (`soccer-career`, P644, 100,
  `644`) and (`player-bingo`, `-infinity`, NULL, `644`). One rule a game, so the join cannot fan out.
- Columns, all nullable with no default (a catalog only change, taken under `lock_timeout = '3s'`
  between two cron refreshes): `game_completions.score_scale text`, `game_completions.ranked_day
  date`, `user_game_scores.score_scale text`, `user_game_scores.ranked_day date`. No account id goes
  on `game_completions`: it is public, and one there would tie a guest handle to an account.
- `public.scored_plays` (security_invoker):

```sql
with src as (
  select 'board'::text as surface, gc.player_name as who, gc.game, gc.score, gc.created_at,
         coalesce(gc.ranked_day, public.et_day(gc.created_at)) as day, gc.score_scale
    from public.game_completions gc
   where gc.score > 0 and gc.player_name is not null
  union all
  select 'account', s.user_id::text, s.game_type, s.score, s.created_at,
         coalesce(s.ranked_day, public.et_day(s.created_at)), s.score_scale
    from public.user_game_scores s
   where s.score > 0)
select src.surface, src.who, src.game, src.day, src.created_at,
       coalesce(src.score_scale, r.scale, 'legacy') as scale,
       100.0 * least(src.score, k.cap)::numeric / k.cap as worth
  from src
  left join public.legacy_scale_rules r
    on src.score_scale is null and r.game = src.game and src.created_at >= r.from_ts
   and (r.max_score is null or src.score <= r.max_score)
  join public.game_scale_caps k
    on k.game = src.game and k.scale = coalesce(src.score_scale, r.scale, 'legacy')
   and src.created_at >= k.valid_from and src.created_at < k.valid_until
 where src.day <= public.et_day(now());
```

  A tag with no cap row (a forged scale, a closed period) joins nothing and is worth nothing. A future
  day counts nothing on either surface. This expression is the only place a score becomes points.
- `public.scored_days` = `select surface, who, game, day, max(worth) as points from scored_plays
  group by 1, 2, 3, 4`.
- E1b, outside a transaction: `create index concurrently idx_gc_scored_day_cover on
  public.game_completions ((coalesce(ranked_day, public.et_day(created_at))), game) include
  (player_name, score, created_at, score_scale) where score > 0`. The old covering index is dropped
  only after the refresh plan is seen using the new one.
- Legacy caps: one `legacy` period per allowlisted game from `-infinity`, at the cap in force at E1's
  apply; the seven floating NULL caps frozen at the denominator the live view gives at apply; a NULL
  cap game with no scored row gets its `g` value, never 1, so an untagged forged 1 cannot pay 100.

**E2 (Round 676).**
- `global_leaderboard`, `global_rank`, `player_ranks` rebuilt on `scored_days where surface =
  'board'`, Round 537's period filters, ordering and limits unchanged.
- `public.account_ranks` materialized view: every `user_scores` user, total over `scored_days where
  surface = 'account'`, `game_days`, `rank`, `accounts`; unique index on `user_id`; refreshed
  CONCURRENTLY by the same cron command as `player_ranks`.
- `public.account_points(p_user uuid) returns table (total integer, today integer, game_days
  integer)`: SQL, STABLE, SECURITY INVOKER, `search_path = ''`, over `scored_days` for that user.
- `public.account_bests` view: per (user, game) the best day points and the day.

**E3 (Round 677).**
- `public.game_rules (game text primary key references game_score_caps(game) on delete cascade,
  family text not null, scale text references score_scales, pays boolean not null, claim text not
  null check (claim in ('first-action','deal','week-one','finish')), round text not null)`. Public
  read. Empty until E3b.
- `private.ranked_claims (user_id uuid, game text, et_day date, run_id uuid not null, step integer not
  null default 0, state text not null check (state in ('open','settled','forfeit')), score integer,
  claimed_at timestamptz not null default now(), settled_at timestamptz, primary key (user_id, game,
  et_day))`, plus a partial unique index allowing one open season claim per (user_id, game).
- `private.season_closes (user_id uuid, game text, save_id uuid, season integer, closed_at timestamptz
  not null default now(), primary key (user_id, game, save_id, season))`: a restored older save
  cannot close season N twice.
- `private.play_refusals (day date, game text, reason text, n integer not null default 0, primary key
  (day, game, reason))`: counts only, no identity.
- `public.name_is_owned(p_name text, p_caller uuid) returns boolean`: SECURITY DEFINER, STABLE, fixed
  SQL, `search_path = ''`: true when a profile other than `p_caller` has that display name or
  username, case folded. Returns a boolean, never an id. Indexes on `lower(display_name)` and
  `lower(username)` in `profiles` if absent.
- `public.record_play(...)`, section 6.
- `game_completions` insert: column grant becomes `(game, score, player_name, score_scale,
  ranked_day)`; the policy bounds game 1 to 64 characters, name 1 to 40,
  `score_scale is null or score_scale in (select scale from public.score_scales)`, `ranked_day is
  null or ranked_day between public.et_day(now()) - 1 and public.et_day(now())`, and
  `not public.name_is_owned(player_name, auth.uid())`.
- E3c, outside a transaction: `create unique index concurrently ugs_one_ranked_day on
  public.user_game_scores (user_id, game_type, ranked_day) where ranked_day is not null`.

**E3b (Round 691, the day before release).** The generated seed from the frozen release tree:
`game_rules` rows, `g` and `dp` cap rows (valid from `-infinity`, since tagged rows exist only from
the new client), and the release midnight as `valid_until` on the `legacy` period of every game whose
scale or rules changed in the release.

**T0 (Round 691, the release midnight).** `public.points_recount (user_id primary key, legacy_total
integer not null, recount_total integer not null, recounted_at timestamptz not null)` and
`public.account_awards (user_id uuid, award_id text, earned_at timestamptz, source text check (source
in ('legacy-total')), primary key (user_id, award_id))`, both RLS select own row; `private.t0_daily_bak`;
the shim's new body; the `game_score_caps` mirror (each `max_score` set to the open cap of the game's
current scale, for any old reader); Rarity Round's `updated_at` set to P644 so its "today standing"
counts again.

### Client

- `src/lib/knowledgeLine.ts` (pure, no clock, no storage): `type DayPoints = number & { readonly
  __dayPoints: true }`; `lineFor(board, policies)`; `dayPoints(result, line, perfect): DayPoints`;
  `pointsFromCeiling(raw, ceiling): DayPoints`. Only these functions make a `DayPoints`, so tsc refuses
  a recorder handed a raw number.
- `src/lib/naivePolicies.ts`: the no knowledge player, each driven through a game's own move API
  (section 7.1).
- `src/data/pointsFamilies.ts`: every scored completion key, exactly once, with `family`, `scale`
  (`'dp' | 'g' | null`), `pays`, `claim`, its naive policies and, when it does not pay, the
  `forFun` reason and the round that brings it back. `scripts/genGameRules.mjs` writes the SQL seed
  from it; `scripts/genScaleCaps.mjs` writes the `g` rows from `scripts/lib/scoreCeilingTable.mjs`.
- Each engine exports `pointsFor(board, result): { points: DayPoints; result: number; line: number;
  perfect: number; unit: string }`. The card, the share line, the recorder and the fence all call it.
- `src/lib/playLedger.ts`: the only module that calls `record_play` or inserts into
  `game_completions`. `recordActivity(path)` and `recordPlay(path)` take no score.
- `src/lib/rankedRun.ts`: one record per game per day in localStorage, `{v, game, day, runId, family,
  seq, steps, banked, assisted?, item?, dealVersion, settled?}`. `step(update)` is a read modify write
  that bumps `seq` and runs before the step's result is shown; a `storage` listener adopts a newer
  `seq` from another tab; `markAssisted(reason)` is sticky; `finish(points)` sets `settled` locally
  then calls the ledger; `forfeit()` settles at what was banked. Seasons use `openSession(game,
  saveId)`, `beginSeason(n)`, `closeSeason(n, points)`, `abandon()`. Every timer and async callback a
  step schedules carries the run id and `seq` it was scheduled for, and a callback for a stale run is
  dropped.
- `useGameCompletion(slug, done, run, points: DayPoints | undefined, correct)`: the boolean `ranked`
  goes; a run handle carries it.
- `src/lib/legacyAwards.ts`: seeds `dukb-awards-v1 = { kept: string[], legacyTally, seededAt }` once
  and never rewrites it.
- Removed with 648's code: `pointsRule.ts`'s tally and allowance cut, `scoreCaps.ts`'s cache, the held
  plays, `useProfileTotal`'s client sum.

---

## 6. The door

```sql
public.record_play(
  p_game        text,     -- a key in game_rules
  p_phase       text,     -- 'start' or 'finish'
  p_run         uuid,     -- the browser's run id; a save id for a season or career
  p_step        integer,  -- the season number for a season, else 0
  p_score       integer,  -- finish only; the game's recorded number on its scale
  p_correct     integer,
  p_player_name text      -- used only when the account has no profile name
) returns jsonb
```

SECURITY DEFINER, owned by postgres, `set search_path = ''`, EXECUTE to authenticated only. Fixed SQL:
no `execute`, no `format(`, every table schema qualified, no parameter ever names a user, every
statement scoped to `auth.uid()`. Because the owner bypasses RLS, that scoping is the whole of the
safety, and `simEconomyMigrations` proves it by running the SQL, not by reading it.

Every call, in order:
1. `auth.uid()` or raise `needs a signed in user`.
2. The game must be in `game_rules`, else it is counted in `play_refusals` as `unknown game` and
   answered `{ranked: false, reason: 'old client'}` with an unscored board row.
3. A per player advisory transaction lock.

`start`:
- Shared daily (`first-action`), fresh deal (`deal`): `insert into ranked_claims ... on conflict do
  nothing` on (user, game, today). Answers `{claimed, owner: 'this run' | 'another run', settled,
  points}`.
- Season (`week-one`): a claim only when no season claim is open for (user, game) and none was made
  today. A claim open for a different save is forfeited at 0 (the client has already shown the confirm
  dialog; this is the server half of the abandon rule).
- Career (`finish`): no claim at start.

`finish`:
1. `p_score` is clamped to `0 .. cap of (game, game_rules.scale)`; a clamp is counted, never refused.
   A for fun game (`pays = false`) records an unscored board row and answers `{ranked: false, reason:
   'fun'}`.
2. The claim for this run: today's, or an open one from yesterday for the same run within 24 hours
   of its claim (a run keeps the day it was dealt, Round 428's rule, which also gives HOF or Bust the
   day pin it lacks). No claim and the slot free: the finish claims (claim at finish, also the old tab
   path). A slot held by another run: practice. A claim already settled by this run: the stored
   answer (retries are idempotent).
3. A season finish must match the open claim's (run, step), and inserts into `season_closes`.
4. A ranked settle writes, in one transaction with one `now()`:
   - `user_game_scores` (score, `score_scale = game_rules.scale`, `ranked_day = claim day`,
     `puzzle_date = claim day`, `correct_answers`);
   - the `game_completions` board row with the same score, scale and `ranked_day`, under the
     account's profile display name, else its username, else `p_player_name` when it is 1 to 40
     characters and not owned by another account, else no board row (counted as `name taken`);
   - `daily_completions` on the claim day, `on conflict do nothing`;
   - the streak in `user_scores` on Eastern days (`current_streak`, `longest_streak`,
     `last_played_at`, `games_played_today`). **Never `total_points`.**
   - It returns `{ranked: true, day, points}` with `points` read back from `scored_days`.
5. A practice finish writes one unscored board row under the same name and answers `{ranked: false,
   reason}`. A finish is always exactly one board row.

**The shim.** `record_auth_completion(text, integer, integer)` stays for tabs from before the
release. From L1 to T0 it is the Round 569 arithmetic verbatim, now DEFINER. At T0 its body becomes a
claim at finish through the same internals as the door, on the Eastern day, rows untagged (so the
legacy rule values them), no add to `total_points`, and it still writes `user_best_scores`, which the
old profile reads. It is dropped on a fixed date in Round 694.

---

## 7. Points: the knowledge line, by family, games named

### 7.1 The formula

For a board (one day's deal, or one free deal):

- `result` is the game's own number: right answers, a board rating, expected wins, calls landed.
- `perfect` is the best play the site itself makes on that board: an exact oracle, or a scripted
  house expert on the same seed where the optimum cannot be computed. It must be reachable by moves
  the page offers.
- `line` is the smallest threshold at which every naive policy of the game's family averages at most
  5 points on that board, and never below the result of the best deterministic naive policy on that
  board (so the top listed name, a constant answer or standing pat pays exactly 0 every day). Exact
  where the distribution is computable (the choice dailies), otherwise from 200 seeded samples with
  the day's salt, so the fence reproduces it.
- `points = round(100 * clamp((result - line) / (perfect - line), 0, 1))`.
- A board with `perfect <= line` has no room: a daily never deals one (the deal redraws with the next
  salt, and the fence proves no day of 2026 or 2027 does), a free game redeals.
- The line is shown on the result card, after play, never before (it would leak the day's key).

Naive policies (`src/lib/naivePolicies.ts`):

| Policy | What the player does |
|---|---|
| `topListed` | the first option exactly as the screen lists it |
| `constant` | the same answer on every item, once for each answer position |
| `random` | a uniform legal choice |
| `counter` | on a game that reveals each answer, picks the option revealed least so far |
| `biggestNumber` | the option with the largest number on screen (rating, value, OVR, a stat line) |
| `medianCall` | where a value is shown and the next hidden: "higher" when the shown value is under the pool median |
| `suggestionBox` | types two letters and takes the first highlighted suggestion |
| `structureStacker` | maximises a visible bonus (same team or era for chemistry) |
| `lifelineReader` | spends every lifeline and follows it |
| `speedTapper` | answers at once |
| `firstSlot` | puts each pull in the first open slot |
| `idle` | changes nothing (the seasons, the sims) |

The headroom check: a 70 percent knowledge policy (the oracle's move 7 times in 10, else random)
must average at least 15, or the game has no room for skill and is for fun. The six season games are
the one listed exception at Release G (section 7.6), printed by name with Round 693 beside them; the
list may only shrink.

### 7.2 Choice dailies: fixed items, fixed options (Rounds 681, 682)

Every item's answer is drawn independently (no balancing), so neither `constant` nor `counter` can
learn anything, and the line is set on the day's own key.

| Game | Format | Change | Points count |
|---|---|---|---|
| Higher or Lower dailies: afl, cfb, f1, golf, hockey, mlb, nba, nfl, tennis (one shared deal and score) | 10 pairs, value shown | close call deal: the next athlete's value lies within a band of the shown one, the direction is a seeded coin per pair, and a shown value without partners on both sides is never dealt, so `medianCall` is a coin | the streak score, lined on the day |
| Face Off | 10 pairs, names only | which athlete is listed first is a coin per pair | right answers only; speed still decides the match against the rival and the share line |
| Champ or Not | 10 true or false | independent coin per round (it is already one) | right answers |
| Who'd They Beat | 10, four options | answer position uniform and independent | right answers |
| Ball IQ | 12, four options | answer position uniform and independent | right answers; the IQ stays on the card as the story |
| Sports Millionaire | chain of up to 15, four options, three lifelines | records rungs climbed | rungs, lined from `random`, `topListed`, `lifelineReader`; dollars and safe havens are the story |
| Pack Battle (rebuilt) | 10 cards, 9 calls, a wrong call ends the pack | close call deal as Higher or Lower; 645c's per call filing and `dealVersion` kept | calls landed; the banked dollars are the story |

Estimates (Guess Transfer Value, Grade Transfer) join this family with `constant` meaning the pool
median guess. Silverware Sort and Football Timeline (ordering) get a seeded shuffle of the list order
and exact lines by enumeration (Round 686).

### 7.3 Name the answer: typed answers, clue ladders, grids, connections, chains (Round 687)

Footle, Career, Career Ladder, the NBA, Baseball and Hockey careers, Olympics, Guess the College,
Nation, NFL Team, CBB Team, NASCAR Driver, Tennis Player, Golfer, Year, F1 Driver, F1 Constructor,
Transfer Path, Teammates, Emoji Guess, Shirt Number, UFC, Puck Detective, NBA Stat Line, World XI,
Missing XI, Eleven, Five and Nine, the seven grids, the Connections, the Connect 4s, the quiz board,
Clue Auction, Player Bingo, Sports Bingo, List Quiz, Alphabet Sprint, the chains.

- Scale `g`: the line is 0, a blank or random typed answer scores nothing, and the value is `100 *
  least(raw, ceiling) / ceiling` with the ceiling from `scoreCeilingTable.mjs`, where every board
  reaches it. A game whose best varies by day records on `dp` with the day's perfect instead.
- `suggestionBox` must pay at most 5. World XI already passes (645b's fix: strikes on a wrong
  position, positions no longer printed in the suggestions); the fence drives the policy through
  every game here that has a suggestion list.
- Football Grid's unlimited guesses: Round 680 (rule 9).
- Endless games (Higher or Lower endless, Higher or Lower Transfers, the NBA, NASCAR, Tennis and UFC
  chains, List Quiz, Alphabet Sprint): a fixed length daily with a ceiling, or for fun.

### 7.4 Pick the players (Rounds 683, 684, 685)

Perfect Lineup (NBA, NHL, F1; the classic soccer page has redirected home since Round 34, so its key
records nothing and is left alone), the four Gauntlets, the four Perfect Seasons, Search and
Discard, Fantasy Draft, Build Your XI, NBA Starting 5, Football Draft, Stadium Draft.

- **No list order and no number during a pick may rank the choices.** Pickers list alphabetically by
  surname (search box and the 40 row window kept); ratings appear on the result card. The Gauntlet
  shuffles its five choices per pick by a seeded draw (today `gauntletEngine.ts` deals them in band
  order, elite first) and drops the rating number and `bandClass` border from the choice cards. The
  Perfect Season daily is hard mode (ratings hidden) with the squad alphabetical; its per 36 stat line
  is a number on screen, so `biggestNumber` on it is one of its policies, and if that fails the line
  the stat line is hidden during the pick too.
- **Points value the squad, not one run of it.** Perfect Lineup: the board rating. Gauntlet: the
  squad rating (the knockout is the show). Perfect Season: expected wins, the engine's own per game
  win probability summed, never the seeded season, so moving the seed pays nothing. Search and
  Discard and Fantasy: the settled squad's expected season. Build Your XI: the deterministic market
  read that already exists, lined against random legal XIs and the best legal XI under the page's own
  gate. NBA Starting 5: the challenge's own stat for the five picked, lined against random legal fives
  and the best legal five, computed from the table the search reads when the day is dealt.
- **Line:** `topListed` (now alphabetical), `random`, `structureStacker`, `biggestNumber` where a
  number is shown. **Perfect:** the board's best squad by oracle, which the fence also plays through
  the page's move API and which must record exactly 100 on every board.
- **The AI referee is commentary.** Build Your XI and Starting 5 show its verdict under the points;
  the points never wait on it or change with it. A quota outage or an undeployed edge function can no
  longer move a score.

### 7.5 Work the numbers (Rounds 685, 687)

Budget Builder, Sign the Player, Mystery Box, Squad Deal, Rebuild, Player Stock Market, the five
Conquest maps, Dart Draft, Minefield. Numbers stay visible, because using them well is the skill, so
`biggestNumber` and `firstSlot` are naive policies and only better than greedy play scores.
Perfect is reachable: Budget Builder by an exact knapsack over slots and budget; Mystery Box by the
best online placement policy (the hindsight optimum sees future pulls and is not a play); Sign the
Player, Squad Deal, Rebuild, Player Stock Market, Conquest and Dart Draft by a scripted house expert
on the same seed. Beating the expert pays 100. That ends Search and Discard's 114 point season,
Mystery Box's 960, Budget Builder's 126 against a best live 112 and Sign the Player's 697.

### 7.6 Seasons and sims

- **The six season games** (NFL, NBA, MLB, NHL front offices; CFB, CBB dynasties).
  - Release G: Round 647's ledger, scale `dp`, cap 100, with the season claim of Round 688. It meets
    the no free points rule (an untouched season pays 2 to 4 of 100), and the claim ends the abandon
    reroll. It does not yet pay real management well (R0.D7): the card says so plainly.
  - Release H (692, 693): value added in expectation, fixed at commit. At the close of season s minus
    1 the board files the league and an offseason seed; the live offseason runs on that seed, so an
    untouched offseason reproduces the filed idle league exactly and pays 0 by construction. At the
    GM's first regular season sim, `dV = V(actual league) - V(idle league)`, both the mean of 647's
    `seasonValue` for the GM's team over `projectionRuns` with the same salt (common random numbers),
    weighted 0.6 this season and 0.4 next after an idle offseason. `points = 100 * clamp((dV - L) /
    (H - L), 0, 1)`, where `L` is the greedy GM's mean `dV` plus the margin that holds greedy to at
    most 5, and `H` is the house expert's mean `dV`, both per sport and fifth of pick, measured by the
    fence over 480 picks and stored as a generated constant table the fence regenerates and compares.
    The expert is a value greedy search: at each offseason decision it takes the action that raises
    the projection most, using the projection itself. A sport whose expert does not beat greedy by at
    least `H_MIN` in every fifth stays on 647's ledger, printed. Only one projection runs at commit,
    in a Web Worker with a progress line.
- **Club Manager** records Round 633's season score, **Soccer Career** its legacy score out of 100
  (644 scale until T0, `dp` after), both under the one ranked result rule. Round 687 measures their
  `idle` policies. **The flagship does not go for fun silently:** a red there is a scoring round of its
  own, and Release G waits for it.
- **The four My Careers and the fight games** are measured in Round 687. A red goes for fun at
  Release G, and Round 698 (reserved) brings them back on value added.

### 7.7 For fun until rebuilt (Round 686)

- **HOF or Bust:** one binary decision a day cannot pass the line, the pool is 26 players (15 in, 5
  out, 6 borderline), and its verdicts are partly editorial. It records plays with no score. Rebuild in
  Round 695: an 8 player ballot, 4 in and 4 not, from a two source verified table of hall status.
- **Score Predictor:** one match a day from 36, and its Unlimited walks the daily's own list. Rebuild
  in Round 696: five finals a day from the verified finals tables Champ or Not already uses.
- **Rank 'Em:** 14 rounds cycle the daily and Unlimited prints their answers. Rebuild in Round 697: a
  generated daily of 7 athletes from verified stat pools (never a stat on `HL_UNVERIFIED_STATS`),
  scored by pairs in the right order out of 21.
- Any other game the fence finds unable to meet rule 3 at release, each listed on What's New with
  its reason and the round that brings it back.

---

## 8. One ranked result a day

| Family (`claim`) | Games | Claim moment | Reload, other tab, other device, abandon |
|---|---|---|---|
| Shared daily (`first-action`) | every game with a daily board: the grids, connections, careers dailies, missing XIs, the nine Higher or Lower dailies, Transfer Path, Football Timeline, the guess games, Face Off, Champ or Not, Who'd They Beat, Silverware Sort, Ball IQ, Quiz Board, Olympics, Shirt Number, the chains, Perfect Season, Perfect Lineup, the Gauntlets, Conquest, Pack Battle, Rarity Round, Sports Bingo, Player Stock Market, Buzzer Beater, Free Kick, Minefield, Sports Millionaire, Mystery Box | the first scored action on today's board | one saved run in every tab, read again before each step; a finish after midnight ET keeps its deal's day; another device's claim shows a notice and this run becomes practice |
| Fresh deal (`deal`) | games with no daily and a new deal per run: Budget Builder, Rebuild, Dart Draft, Career Ladder, World XI, Player Bingo, Alphabet Sprint, Clue Auction, Sign the Player, Build Your XI, NBA Starting 5, Fantasy Draft, Squad Deal, Search and Discard, List Quiz, Teammates, the Connect 4s and the rest the family table assigns | the deal of the first run of the Eastern day, made when the player presses Start after the how to play | later runs are practice; a run that cannot be restored ends at what it banked |
| Season (`week-one`) | the four front offices, the two dynasties, Club Manager | the first sim of a season, when no season claim is open and none was made today | one claim open at a time; a new save while one is open asks first, then forfeits it at 0 and plays practice until the next Eastern day; a season number closes once per save; every week's result is saved before it is shown |
| Career (`finish`) | Soccer Career, the four My Careers, Fight Career | the first retirement of the Eastern day | later retirements that day are practice (section 15, item 4) |

The family of each game is written once in `src/data/pointsFamilies.ts`, keyed by its recorder slug,
and `simOneDoor` proves each recorder's shape matches its family, so a game filed in the wrong family
fails the gate. Fight Promoter and Fight Gym are assigned by their shape in that table.

**Signed out.** The run record enforces the same rule in the browser. Nothing on the server can tell
two browsers of one guest apart, so a private window is a second guest (section 15, item 3). The
board counts at most one day's worth per name per game per day.

**Signed in, network down at the claim moment.** The claim is local, and the finish claims at finish
on the server (idempotent by run id), so a dropped start costs nothing.

---

## 9. The migration chain

Every step is one DO block with `set local lock_timeout = '3s'`, applied through `apply_migration`
after review, followed by `get_advisors`. Each step:

1. requires the previous step's ledger row, applied and not undone, and refuses if its own row exists
   and is not undone;
2. requires the live md5 of every body it replaces to equal what the previous step recorded (or, for
   L1, the fingerprints in section 2), never a comment marker and never an `xmin` test;
3. reads no count over a table a visitor can write, and waits for no quiet period;
4. writes, proves its result with executable checks before the block ends, and records its ledger row
   with the md5 of what it installed and the text of what it replaced.

Undo of step N refuses unless step N+1 is absent or undone, restores the recorded prior bodies,
grants and policies, and marks N undone, so N can be applied again. Nothing is rehearsed on production
inside a transaction that takes a lock: the chain is rehearsed in PGlite (`simEconomyMigrations`);
on production only read only SELECTs of the preconditions run before an apply.

| Step | Round | File | When | Precondition on production as it is | Checked before commit |
|---|---|---|---|---|---|
| L1 | 673 | `2026mmdd_econ_l1_lock_the_doors.sql` | now, before anything else | save md5 `5ae76ef7...` (the 569 body, INVOKER); no 644, 646 or 648 object (`private.r644_state`, `private.r646_caps_bak`, `game_score_cap_history` absent); `user_game_scores.created_at` defaults to `now()` (read from `pg_attrdef`), and so does `game_completions.created_at`; the policies it drops exist under the names read at apply | the save is DEFINER with `search_path` empty; `has_table_privilege` false for INSERT, UPDATE, DELETE, TRUNCATE on the five tables for anon and authenticated; `has_column_privilege` false on `game_completions.created_at` and `completed_on`; a SELECT still works as anon |
| E1 | 675 | `2026mmdd_econ_e1_scales_and_worth.sql` | a normal day after Release F is live | L1 applied; section 2's board and caps fingerprints; still no 644, 646, 648 object; P644 evidence by id order (below) | every allowlisted game has one open legacy cap; no overlapping periods; the view's board points per (player, game, Eastern day) equal Round 537's formula over E1's frozen caps on every day, except days holding a 644 scale soccer row, each of which equals the recomputation at 100 (891 days, +72,991 on 2026-09-29) |
| E1b | 675 | `2026mmdd_econ_e1b_cover_index.sql`, `execute_sql` | after E1 | index absent | `explain` of the refresh uses it |
| E2 | 676 | `2026mmdd_econ_e2_board_on_one_view.sql` | after E1b, between two cron ticks | E1 applied; Round 537 bodies unchanged since E1 | builds `player_ranks_next` and `account_ranks`, runs the equality proof again (drift of a floating cap since E1 printed per game), then swaps `player_ranks` last; refresh under 10 s, `account_points` for one user under 300 ms |
| E3 | 677 | `2026mmdd_econ_e3_the_door.sql` | a normal day after E2 | E2 applied; the save's md5 equals L1's recorded one | catalog checks only (no test row is ever written to production): `record_play` is DEFINER with `search_path` empty and exactly one signature, anon cannot execute it, the column grant and insert policy on `game_completions` are as written, `name_is_owned` is on the allowlist; its behaviour (two rows with one `created_at`, a second finish practice, an owned name refused) is proved in PGlite by `simEconomyMigrations` before review |
| E3c | 677 | `2026mmdd_econ_e3c_one_ranked_day.sql`, `execute_sql` | after E3 | index absent | `pg_index.indisvalid` true |
| E3b | 691 | `2026mmdd_econ_e3b_rules_seed.sql`, generated | the day before release | E3 applied; the seed's md5 equals what `genGameRules.mjs --check` prints on the frozen release tree | every `game_rules` row has an open cap for its scale; every for fun game has none; no `legacy` period closes before the release midnight |
| T0 | 691 | `2026mmdd_econ_t0.sql` | 00:00 to 01:00 America/New_York on release night | E3b applied; the time is inside that window (asserted); the save's md5 equals L1's | the shim's new body in place; no `daily_completions` row written since the release midnight sits on a date other than its Eastern day; `points_recount` and `account_awards` hold one row set per account; both views refreshed |
| C1 | 694 | `2026mmdd_econ_c1_close_old_doors.sql` | T0 plus 14 days, a fixed date | T0 applied | shim dropped; `daily_badges` insert revoked and `claim_daily_badge()` in place; the three chain tables refuse inserts |

**P644.** The completion time of Lovable deployment `c902a3af` (Release D), read from the deployment
record. E1 refuses unless it falls after Release D's main landing and no soccer-career row with an id
below the first row at or after P644 has a score that is not a multiple of 50 (read by id order,
which a forged `created_at` cannot move). If the record cannot be read, P644 is 2026-09-23 00:24:53
UTC, the first proven new row.

**The T0 day fix, the only history rewrite.** The rows stored on the new Eastern day D but played on
the evening of D minus 1 (after 20:00 Eastern, when the UTC date had already turned) would collide
with day D's tick on `daily_completions`' unique key. Those rows only are re-dated to D minus 1,
backed up first to `private.t0_daily_bak`; a tick that would duplicate one already on D minus 1 is
deleted instead. One measured evening wrote 8. Every other stored UTC date (`completed_on`,
`puzzle_date`, `daily_badges.date`) stays as it is, because every reader moves to
`coalesce(ranked_day, et_day(created_at))` in Round 689.

**Round 644's file** gets a first block that raises when `private.economy_steps` exists (added in
Round 673): it must never run over this chain, because it would divide rows the view already values.
Its purpose is met without rewriting a recorded score: past soccer days keep their worth on the
legacy scale, days since P644 get theirs on the 644 scale, old tabs stay on the legacy scale, Player
Bingo and Rarity Round get their caps, and there is no totals delta to compute because no total is
stored.

---

## 10. Releases

**Release F** (660, 661, 668, 669, 670) ships first, at its own Eastern midnight.

**Round 673 does not wait for any release.** It changes nothing a real player can see and closes the
live write hole, so it is applied as soon as it passes review.

**Release G** publishes in the first minutes after an Eastern midnight, at least one full Eastern day
after Release F is proven, never on the night of 2026-11-01. It carries the whole `points-economy`
client plus Rounds 674 to 690. **Its floor** is the infrastructure (673 to 680, 688 to 691): if a game
round from 681 to 687 has not landed, its games go for fun at release through `pointsFamilies.ts` and
come back later as that round lands, each with a new cap period at its own Eastern midnight.

Why an Eastern midnight: many dailies change their deal in this release (independent keys, close call
decks, shuffled lists), and every save carries `dealVersion`, so a day never straddles two deals. And
between 00:00 and 20:00 Eastern the UTC and Eastern dates agree, so an old tab's UTC "today" and a
new tab's Eastern "today" agree for the whole morning and afternoon after the flip.

**Rule for the lanes:** `points-economy` must not land on main before E1 and E3 are applied, or the
preview's tagged inserts fail on columns that do not exist yet.

**Release H** (692, 693, 694 and the rebuilds 695 to 698) ships round by round, each game coming back
on points at its own Eastern midnight with its own cap period.

---

## 11. What players see

All copy is casual, carries no invented quote from a real person and no em or en dash. Guide edits
rerun `node scripts/genSearchKeywords.mjs` and update the `simGuideHeadings` fixture in the same round.
Every game's how to play gets a Points section, shown before play and re-openable from "?": what 0
means, what 100 means, a worked example, and when the day's ranked go is spent.

- **Result card.** The game's own result, then `Points: 62 of 100`, then one line from its family
  (`pointsHowTo(slug)`):
  - choice: "Guessing gets about 5 of 10 here. Points started at 8 right today."
  - draft: "Random picks get about 74 on this board. Today's best lineup rated 91."
  - typed: "Every right answer counts. A perfect board is 100."
  - season, Release G: "Points are rare here for now. A season scores only when it beats what this
    roster does 19 times in 20." (647's recap line, with its projection, stays under it.)
  - season, Release H: "Standing pat adds nothing. Our expert's offseason on a roster like yours adds
    3.1 wins. You added 2.0, so 65 points."
- **Practice**, on the shared result note:
  - "Practice: you already played today's ranked [game]."
  - "Practice: today's [game] is going in another tab or on another device."
  - "Practice: unlimited guesses were on for this one."
  - "Practice: this franchise started after today's ranked season."
  - "Practice: this tab is out of date. Reload to play for points."
- **For fun:** "For fun: this one doesn't pay points yet."
- **Notices:**
  - another device: "Today's daily is going on another device. Finish it there, or play this one for
    practice."
  - Football Grid toggle: "Unlimited guesses turns today's grid into practice. No points for it. Turn
    it on?"
  - abandon: "Start over? Today's ranked season ends at 0, and a new franchise plays for practice
    until tomorrow."
  - a run that could not be brought back: "This run couldn't be brought back, so it ended at [N]."
- **Header and profile.** Points today and Total Points in one unit, with "up to 100 per game, per
  day". Rank reads "#N of M signed in players", and a second line says where the account's name
  stands on the World Leaderboard. Best Scores shows the best day in points per game.
- **Once, after the release,** dismissed per browser: "We recounted your points on <date>. Every game
  now pays up to 100 a day, the same count the World Leaderboard uses, so a perfect day is worth the
  same in every game. Your badges stay. Before the recount you had 14,013."
- **What's New:** the one unit, the games now for fun with their reasons, Face Off's speed, the
  ratings hidden during picks, one ranked go a day, the Soccer Career correction on the board (from
  Round 676).

---

## 12. Fences

Every check comes with a negative control that asserts its anchor exactly once in comment stripped
code, turns only its own section red, writes its copies to a per run `mkdtemp` and proves the copy was
loaded. Green means the closing summary line and exit code 0. Every harness run gets its own TEMP and
TMP. `@electric-sql/pglite` is added to `devDependencies` (free, in node), never a `--no-save` install,
which any `npm install` drops.

| Fence | Round | Holds | Controls |
|---|---|---|---|
| `simPlayDoor` (new; live read only plus the migrations) | 673, grows in 677, 694 | rule 7: no write grant for anon or authenticated on the ledger tables, `game_completions` insert only on the listed columns; no INSERT or UPDATE policy on the four account tables; every SECURITY DEFINER function in `public` is on an allowlist (`admin_exists`, `has_role`, `handle_new_user`, `record_auth_completion` while it lives, `record_play`, `name_is_owned`, `claim_daily_badge`); definer bodies hold no `execute` and no `format(` and pin `search_path` empty; each body's md5 is in `economy_steps`; exactly one `pg_proc` row per door name | `grant`, `policy`, `definer`, `body`, `overload`, planted into the fetched snapshot |
| `simAuthSave` (section 3 flipped) | 673 | the save is DEFINER, fixed SQL, `auth.uid()` only, pinned `search_path`, EXECUTE to authenticated only, and the four tables carry no direct write grant; the header states why the rule inverted | `invoker` (the migration back to INVOKER); the old `definer` control retires with the rule it tested |
| `simEconomyMigrations` (new; PGlite on a committed schema snapshot `scripts/data/economySchema.sql`, dumped read only) | 673, grows in every SQL round | applies the chain in order; applies each step out of order and twice and asserts a refusal before any write (table checksums unchanged); undoes and reapplies every step; the 569 arithmetic gives byte identical tables before and after L1; direct writes denied as anon and authenticated; E1's equality proof; the door's cases: another account's rows untouchable through any parameter, a clamp counted not refused, a second finish practice, a retry idempotent, a season forfeit, a save scummed close refused, a run across midnight keeps its day, the shim claims at finish, a name owned by another account refused; the Eastern day at 23:30 and 00:30 Eastern and on 2026-11-01 | `nochain`, `dropfirst` (E2 drops before its checks), `soccer1000`, `readafter` (the door reads the day after inserting), `noclaim`, `overload` (a 4 argument shim makes a 3 argument call fail as ambiguous), `nosetrole` |
| `simOneWorth` (new) | 675, 676 | the only worth expression is in `scored_plays`; the board functions, `account_ranks`, `account_points` and `account_bests` read `scored_days`; no src module sums scores into a public total; no migration after E1 updates `game_scale_caps.cap` in place; every period boundary other than infinity and P644 is an Eastern midnight written before it opens; every sendable key has an open cap for its `game_rules` scale | `ownleast`, `directread`, `capupdate` |
| `simKnowledgeLine` (new, replaces `simFreePoints` row by row) | 678, grows in 681 to 687 | section 1: every scored key in exactly one family with scale, pays and claim, and the generated seed matches; section 2: for every paying game, over the 365 dailies of 2026 (static pools) or 400 seeded boards (database pools, from snapshot fixtures), every naive policy of its family, driven through the game's own move API, averages at most 5; the oracle or expert records exactly 100 on every board; the 70 percent policy averages at least 15 (the season exception printed with its round); section 3: each recorder's points argument, read as code with comments stripped, resolves to that engine's `pointsFor` | `sortbest`, `bandorder`, `truthcoin`, `balanced` (the counting exploit comes back), `wideband`, `fourcalls`, `top114`, `rawrecord` |
| `simOneDoor` (extends `simRankedRecorder`) | 679 | only `playLedger.ts` writes the ledger or calls the door; `recordActivity` and `recordPlay` take no score; the run handle ratchet reaches zero boolean `ranked` flags; the registry's `daily` flag matches each game's family | the 645a helper that files free wins through `recordActivity` (m645a-3), a score parameter put back, a registry mismatch |
| `playGames` addition | 679 | fails on any POST or PATCH to `/rest/v1/<account table>` and on any door refusal other than a practice reason | a planted direct insert |
| `simTwoTabs` (new; two React roots on one jsdom localStorage with synthetic storage events) | 680 | HOF hints in tab A then the vote in tab B; a `useDailyPuzzle` grid; Football Grid; the Gauntlet board for NBA, NFL, MLB; Pack Battle toggled during a reveal; a chain given up during verification: exactly one ranked door call per day, and the card equals what was sent | `mountonly`, `m645c1`, `m645c2`, `stalestep` |
| `simAssists` (new) | 680 | every input to `maxGuesses`, the hint count, the tier or the timer inside a daily is constant within a run or goes through `markAssisted` | `unlimited` |
| `simRerolls` (new) | 684, 688 | Perfect Season records at compute, before the reveal; a remount mid reveal restores done; an unrestorable run ends at what it banked; a front office abandon forfeits and a new franchise is practice; a restored older save cannot close a season twice; a week's result is saved before it is shown; a second deal of a fresh deal game the same day is practice | `revealsave`, `noforfeit`, `rescum`, `weekreload`, `redeal` |
| `simDailyLeak` (new) | 686 | practice pools share no answer with the next 365 dailies; prints every daily's cycle length | `hofshare` |
| `simEasternDay` (new) | 689 | no UTC day on the points, daily, streak, Games Today or legend path in src or the live save bodies, against an allowlist where every entry carries its reason | `utcchecklist` |
| `simAwardsKept` (vitest) | 690 | a stored 14,013 and a local 8,810,000 keep every award they met; a recount to 1,500 keeps them; a second seed removes nothing; a guest earns a new badge from the board total for the handle | `newtotalseed` |
| `simSeasonValue` (new) | 692, 693 | through the real engines, 480 picks a sport: idle exactly 0 every season; greedy at most 5; the expert between 90 and 100 on average; a half expert between 25 and 75 with a gap of at most 10 between the weak and strong fifth of picks; the replay reproduces the actual league byte for byte; a second commit the same day unranked; the commit inside its budget on a 4x throttled CPU; the constants table regenerated equals the committed one | `idlepay`, `nopair`, `staleconst` |
| `simEconomyLive` (new; read only) | 691 | at +1 hour, +1 day, +7 days: legacy rows after T0 per game, no account row written outside the door or shim, account totals equal the view, the board's top 100 equal the view, refresh time, `get_advisors` | none (it reads production) |
| `simChainChampions` (new; read only, network) | 674 | `genChainChampions.mjs --check` finds no champion in `nascar_champions` or `tennis_grand_slam_winners` missing from the bundled name lists | a champion added to a fixture |
| Fence debt, repaired in place | 674 | `simGmReload`, `simCfbDynasty`, `simRankedRecorder`, `simCapsAreCeilings`, `completionKeys`, `simDailyReload`, `simNoDoubleRecord` as listed in Round 674 | m647-3, m645a-1, m645a-2, m646-3, two controls in parallel |
| Rewired | 675 | `simCapsAreCeilings` sections 4 and 6 read the generated `g` rows instead of 646's migration; `simScoreShown` section 4 checks the soccer legacy and 644 scales instead of 644's division | their existing controls, reanchored |
| Retired | 690 | `simProfileTotal` with 648's code; its leftover `dist/.profile-total-control` removed | |

---

## 13. The rounds

Days are honest estimates for one builder, gates included. Each round: its own branch from
`points-economy`, merged back after its gates and its adversarial review; PROJECT-STATE and the
workboard updated in the same round.

### 673. Lock the doors (database, apply first). 2 days.
- **Scope.** Migration L1 (section 9): `private.economy_steps`; `alter function
  public.record_auth_completion(text, integer, integer) security definer` with the body unchanged (the
  569 arithmetic, so the live profile moves exactly as today); `revoke insert, update, delete,
  truncate, references, trigger` on `user_scores`, `user_game_scores`, `user_best_scores`,
  `daily_completions`, `game_score_caps` and `game_completions` from anon and authenticated; drop the
  client INSERT and UPDATE policies on the four account tables; `grant insert (game, score,
  player_name) on game_completions` and replace its `WITH CHECK (true)` with the length bounds. No
  score bound, no refusal of any save. A raising first block added to Round 644's, 646's and both
  648 files ("superseded by POINTS-ECONOMY-V2"). PGlite as a devDependency; the schema snapshot.
- **Fence.** `simAuthSave` flipped, `simPlayDoor` new, `simEconomyMigrations` new (L1 cases).
- **Controls.** `invoker`, `grant`, `policy`, `definer`, `body`, `overload`, `nochain`.
- **Migration.** L1. Precondition as in section 9. Undo restores the grants and policies from the
  ledger and sets the save back to INVOKER.
- **Player sees.** Nothing. A signed in save lands exactly as before. A forged backdated board row or
  a patched total is refused.

### 674. Fence debt. 2 days.
- **Scope.** The fence lens gaps no later round replaces: the board side season wiring (render each of
  the six boards' season close and compare the recorded row with the engine's own standings, not with
  the row itself: R2.D3); the unranked note actually renders on the result card (R2.D5); the literal
  `false` flag rule reads the recorder's own mode detection, not the registry's `daily` field (R2.D6);
  `simCapsAreCeilings`' UNSCORED check and `completionKeys.scanSource` read comment stripped code and
  skip test files (R2.D9); `simGmReload` and `simCfbDynasty` write control copies to a per run
  `mkdtemp` and never delete `ROOT/dist` wholesale (R2.D10); every Higher or Lower hook clears its
  timer on unmount (the `useHockeyHL` teardown red) and the `simDailyReload` lockin control is made
  load independent (R2.D11); `simChainChampions` runs `genChainChampions.mjs --check` read only in
  the suite (the 645c leftover). Merge main into `points-economy` and regenerate `searchKeywords.json`.
- **Fence.** The six named harnesses themselves.
- **Controls.** m647-3 (NHL board drops `otLosses`), m645a-1 (Buzzer Beater's note on the per shot
  card), m645a-2 (`useUfcChain` flag false), m646-3 (Stat Detective's old call left in a comment), a
  parallel run of two controls that must both fire, a champion added to a fixture.
- **Migration.** None.
- **Player sees.** Nothing.

### 675. One worth: scales, cap periods, the view. 2 days.
- **Scope.** Migrations E1 and E1b; `scripts/genScaleCaps.mjs` (the `g` rows from
  `scoreCeilingTable.mjs`, the `dp` rows at 100, checked but not applied until E3b); 646's migration
  and both 648 migrations deleted from the branch; `simCapsAreCeilings` and `simScoreShown` rewired;
  `simOneWorth` sections on the view; `simEconomyMigrations` for E1 and its undo.
- **Fence.** `simOneWorth` (view sections), `simEconomyMigrations` (E1, E1b, undo, the equality
  proof), `simCapsAreCeilings` and `simScoreShown` rewired.
- **Controls.** `ownleast`, `capupdate`, `soccer1000`, `nochain`.
- **Migration.** E1, E1b. Preconditions in section 9, on a normal day after Release F is live.
- **Player sees.** Nothing yet: the board still reads Round 537's functions.

### 676. The board on the view, and the account views. 1 day.
- **Scope.** Migration E2 (board rebuilt on `scored_days`, built next, proved, swapped last;
  `account_ranks`, `account_points`, `account_bests`; one cron command refreshing both views).
  **`game_score_caps` is not mirrored here** (the old client reads caps; the mirror waits for T0).
- **Fence.** `simOneWorth` complete; `simEconomyMigrations` E2.
- **Controls.** `directread`, `dropfirst`.
- **Migration.** E2, between two cron ticks.
- **Player sees.** The World Leaderboard pays Soccer Career days since 2026-09-22 in full (+72,991 over
  891 player days, at most +90 on a day, measured 2026-09-29), and the seven floating caps stop moving.
  A What's New line says so.

### 677. The door in SQL. 2 days.
- **Scope.** Migrations E3 and E3c: `record_play`, `ranked_claims`, `season_closes`,
  `play_refusals`, `name_is_owned` and the profile name indexes, the `game_completions` column grant
  and policy for `score_scale`, `ranked_day` and owned names, the empty `game_rules`, the one ranked
  day index; the T0 shim body written and fenced but not applied. `simPlayDoor` allowlist grows.
- **Fence.** `simEconomyMigrations` (every door case in section 12), `simPlayDoor`.
- **Controls.** `readafter`, `noclaim`, `overload`, `nosetrole`.
- **Migration.** E3, E3c, on a normal day after E2. Additive: nothing calls `record_play` yet. The
  name rule is live at once: a guest insert under another account's display name or username is
  refused; an account's own tab inserts under its own name as before (it carries its JWT). The client
  of Round 679 mints a fresh handle once on that refusal.
- **Player sees.** Nothing, unless they were posting under somebody else's account name.

### 678. The knowledge line core and the families. 2 days.
- **Scope.** `knowledgeLine.ts`, `naivePolicies.ts` (with `counter`), `pointsFamilies.ts` classifying
  every scored key with its family, scale, pays, claim and round; `genGameRules.mjs` with a check mode;
  the shared `PointsLine` card piece and `pointsHowTo` copy source; `simKnowledgeLine` sections 1 and
  3 and the section 2 framework, reusing `scoreCeilingTable.mjs`' perfect run drivers for the perfect
  side. No recorder changes yet.
- **Fence.** `simKnowledgeLine` sections 1 and 3; tsc holds the `DayPoints` brand.
- **Controls.** `rawrecord`, a key in two families, an unclassified key.
- **Migration.** None.
- **Player sees.** Nothing.

### 679. The client door. 2 days.
- **Scope.** `playLedger.ts` as the one writer; `recordActivity` and `recordPlay` lose their score
  (Club Manager's calls at `useClubManager.ts:371` and `:418`); a signed in finish calls `record_play`
  (start at the claim moment, finish), a signed out finish inserts the tagged row with `score_scale`
  and `ranked_day`; a refused name mints a fresh handle once; the practice reasons on the shared
  result note; `dealVersion` on saves.
- **Fence.** `simOneDoor`, the `playGames` network assertion.
- **Controls.** m645a-3, `scoreparam`, `registrymismatch`, a planted direct insert.
- **Migration.** None (uses E3).
- **Player sees.** Practice notes on the result card when a finish is not the day's ranked one.

### 680. Two tabs are one run. 2 days.
- **Scope.** `rankedRun.ts`; `useDailyPuzzle.addGuess` reads the day's stored log first and adopts a
  longer log or a finished status (38 games), with a `storage` listener and "Updated from your other
  tab"; HOF or Bust's vote reads the stored hint count and its run keeps its deal's day (the day pin
  645c left); Football Grid's toggle during a daily calls `markAssisted('unlimited')` behind a confirm,
  and the pre play card says so when it is already on; Soccer Grid's tier becomes the day's item;
  Pack Battle's reveal timer and the NASCAR and Tennis verify callbacks scoped to the run; the settled
  flag replaces the 5 second restore mark on games moved to the run record; Gauntlet board reload rows
  for NBA, NFL and MLB (R2.D0).
- **Fence.** `simTwoTabs`, `simAssists`, `simDailyReload` rows.
- **Controls.** `mountonly`, m645c-1, m645c-2, `stalestep`, `unlimited`.
- **Migration.** None.
- **Player sees.** A daily open in two tabs stays one daily. Unlimited guesses on today's grid asks
  first and makes it practice.

### 681. Choice dailies I. 2 days.
- **Scope.** The close call deal and the per day line in the shared Higher or Lower daily (nine
  hooks, one engine); Face Off (a coin for the listing, points from right answers); Champ or Not, Who'd
  They Beat, Ball IQ (independent keys, per day lines); `pointsFor` exports, cards, guides.
- **Fence.** `simKnowledgeLine` rows for all thirteen.
- **Controls.** `wideband`, `truthcoin`, `balanced`.
- **Migration.** None (their `dp` rows go in E3b).
- **Player sees.** "Points: N of 100" with the day's line after play; Face Off's speed decides the
  match but not the points.

### 682. Choice dailies II: Sports Millionaire and Pack Battle. 2 days.
- **Scope.** Millionaire records rungs, lined on `random`, `topListed`, `lifelineReader`; Pack Battle
  rebuilt as a 10 card close call pack scoring calls landed, with 645c's per call filing and
  `dealVersion`; dollars stay the story on both cards.
- **Fence.** `simKnowledgeLine` rows; `simDailyLockEdges` pack rows moved to the new deck.
- **Controls.** `fourcalls`.
- **Migration.** None.
- **Player sees.** A new Pack Battle: ten cards, call each one, a wrong call ends it. Points for calls
  landed; the dollars are still shown and shared.

### 683. Pick the players: Perfect Lineup and the Gauntlets. 2 days.
- **Scope.** Perfect Lineup NBA, NHL and F1 through their shared engine (`perfectLineupEngine.ts`,
  `GenericLineupBoard.tsx`): alphabetical pickers, a per board line and an oracle perfect (the
  blocker, R0.D0); the four Gauntlets through one engine: a
  seeded shuffle of the five choices, rating and band colour hidden until the result, points from the
  squad rating.
- **Fence.** `simKnowledgeLine` rows (the oracle records exactly 100 on all 365 dailies).
- **Controls.** `sortbest`, `bandorder`.
- **Migration.** None.
- **Player sees.** Names listed A to Z with no ratings during the pick; ratings on the result card;
  a flawless day pays 100.

### 684. Perfect Season: decisions final, scored in expectation. 2 days.
- **Scope.** The four Perfect Seasons: each pick saved as assigned; the result computed, saved and
  recorded in the same effect that computes it, before the 2.5 second reveal; a remount mid reveal
  restores done; hard mode daily with the squad alphabetical; points from expected wins; the stat line
  tested as `biggestNumber` and hidden during the pick if it fails.
- **Fence.** `simRerolls` rows for all four; `simKnowledgeLine` rows.
- **Controls.** `revealsave`.
- **Migration.** None.
- **Player sees.** Ratings hidden on the daily; reloading during the reveal changes nothing.

### 685. Unreachable perfects and the lineups. 3 days.
- **Scope.** Search and Discard (ratings hidden at the keep, a per deal perfect) and Fantasy Draft;
  Budget Builder's exact knapsack; Mystery Box's online expert; Squad Deal's and Sign the Player's
  house experts; Build Your XI on the deterministic market read and NBA Starting 5 on the challenge's
  own stat, the AI verdict shown as commentary (R0.D16, R0.D18); lines with `biggestNumber`,
  `firstSlot` and `random`.
- **Fence.** `simKnowledgeLine` rows.
- **Controls.** `top114`, a Build Your XI recorder that waits on the AI verdict.
- **Migration.** None.
- **Player sees.** A best possible run pays 100 on every deal; Starting 5 pays whether or not the AI
  answers.

### 686. For fun, leaks and orderings. 1 day.
- **Scope.** HOF or Bust, Score Predictor and Rank 'Em to for fun with card and guide copy; HOF
  Unlimited deals only players outside the daily pool; Silverware Sort and Football Timeline shuffled
  with exact lines.
- **Fence.** `simDailyLeak`; `simKnowledgeLine` rows.
- **Controls.** `hofshare`.
- **Migration.** None.
- **Player sees.** "For fun: this one doesn't pay points yet" on three games.

### 687. Every other paying game through the line. 3 days.
- **Scope.** The typed answer family on `pointsFromCeiling` with the `suggestionBox` check; the
  arcade games on the day's reachable perfect (Buzzer Beater, Free Kick without its post zone ceiling,
  darts, the drills); Rebuild, Player Stock Market, the five Conquest maps, Dart Draft, Minefield,
  Football and Stadium Draft experts; endless games to a fixed daily with a ceiling, or for fun; the
  `idle` measurement of Club Manager, Soccer Career, the four My Careers and the fight games; the
  headroom check printed for every game; every game still red set for fun with its reason and a
  reserved round.
- **Fence.** `simKnowledgeLine` complete: every paying key has a row, and it is green.
- **Controls.** A typed game whose suggestions highlight the fitting position.
- **Migration.** None.
- **Player sees.** What's New lists every game that goes for fun and why.

### 688. Sessions: one ranked season a day. 2 days.
- **Scope.** Save ids in the six season saves and Club Manager through the shared
  `FrontOfficeSeasonClose` shape; `beginSeason` at week one, `closeSeason` with the ledger score,
  abandon forfeits behind the confirm; every week's result saved before it is shown; careers rank the
  first retirement of the day; the recap and how to play state how a season scores (R0.D14, R0.D15);
  a check that each sibling engine sharing the shape carries the same guard.
- **Fence.** `simRerolls` season rows, `simGmReload` and `simCfbDynasty` rows for abandon, a new
  franchise as practice, a restored snapshot.
- **Controls.** `noforfeit`, `rescum`, `weekreload`.
- **Migration.** None (uses E3's season claims).
- **Player sees.** "Start over?" before an abandon; one ranked season a day.

### 689. The Eastern day everywhere. 1 day.
- **Scope.** The T0 file's day half (the shim on the Eastern day, the evening window re-date of
  `daily_completions` with its backup); the reader sweep to `getTodayET` and
  `coalesce(ranked_day, et_day(created_at))`: `DailyChecklist`, `useDailyLegend` and `daily_badges`,
  `gamesToday`, `most_played_today` and `useMostPlayed`, `badges.ts` per day counts, `PostGameStats`,
  Rarity Round's standing, `Index.tsx`.
- **Fence.** `simEasternDay`; `simEconomyMigrations` day cases.
- **Controls.** `utcchecklist`.
- **Migration.** Part of T0.
- **Player sees.** A play after 8pm Eastern counts on that Eastern day for the checklist, the legend,
  the streak and Games Today.

### 690. Profile, header and badges on one unit, and the recount. 2 days.
- **Scope.** The T0 file's recount half (`points_recount`, `account_awards` seeded from each stored
  total: Point Hunter at 1,000 for 480 accounts, Point Master at 10,000 for 63, the achievements at
  5,000 for 150 and 25,000 for 11, measured 2026-09-29); the profile on `account_points`,
  `account_ranks` and `account_bests` with both ranks labelled; the signed out header on the board
  total for the handle; `legacyAwards.ts`; badges and achievements earned by the new total, a kept
  award, or the local kept set; the recount card; 648's tally, caps cache, held plays and
  `useProfileTotal` sum removed; `simProfileTotal` retired.
- **Fence.** `simAwardsKept`; `simOneWorth` src checks.
- **Controls.** `newtotalseed`.
- **Migration.** Part of T0.
- **Player sees.** Total Points recounted once in the one unit (median about 1,829 to about 200), the
  recount card with the old number, every badge kept.

### 691. Release G. 1 day, plus the gates.
- **Scope.** Days ahead: deploy `nba-evaluate-lineup` from the repo copy (commentary only now),
  probe random legal fives, mark it synced in `edgeDeployed.json`. The day before: gate the merged
  release tree in the CRLF gate clone after fetching real origin (runAllSims, `npm run build:seo`, the
  snapshot readers, the browser group), generate E3b from the frozen tree and apply it. 23:45 Eastern:
  push to main. 00:00, once `get_project` shows the merge sha: apply T0, refresh both views,
  `deploy_project`, prove by finding the recount card's text in the live entry chunk. Then
  `simEconomyLive` at +1 hour, +1 day, +7 days; `get_advisors`; PROJECT-STATE and What's New.
- **Fence.** The whole suite on the frozen tree (green means each closing summary line and exit 0),
  `simEconomyLive`, `simEdgeSync` with `nba-evaluate-lineup` synced.
- **Controls.** Every control of every fence above, run once on the frozen tree.
- **Migration.** E3b, T0.
- **Player sees.** Everything in section 11.

### 692. Seasons value added I: the engine. 3 days.
- **Scope.** `src/lib/seasonValueAdded.ts`: seeded, replayable offseasons for the six engines with a
  byte for byte replay proof; idle, greedy and the value greedy expert per sport; common random
  number projections over two seasons; the generated constant table of `L` and `H` per sport and
  fifth of pick; headless `simSeasonValue`.
- **Fence.** `simSeasonValue` (headless sections).
- **Controls.** `idlepay`, `nopair`, `staleconst`.
- **Migration.** None.
- **Player sees.** Nothing yet.

### 693. Seasons value added II: the six boards. 2 days.
- **Scope.** Points fixed and filed in the save at commit, before the first sim is shown; the Web
  Worker with a progress line; the recap states the added wins against the expert's; 647's bar kept
  as recap story only; board tests for all four front offices and both dynasties.
- **Fence.** `simSeasonValue` board sections; `simGmReload` and `simCfbDynasty` rows for a commit
  filed before the first sim and an abandon after commit leaving the ranked row alone.
- **Controls.** `nofirst`.
- **Migration.** A ledger step at its release midnight that records the rule change in `game_rules`
  for the six games. The `dp` cap stays 100, so no period moves and no past season changes worth.
  Precondition: the six games are on `dp` with Round 647's rule.
- **Player sees.** "Standing pat adds nothing. Our expert's offseason on a roster like yours adds 3.1
  wins. You added 2.0, so 65 points." Moves after tip off do not change that season's points, and the
  how to play says so.

### 694. Close the old doors. 1 day.
- **Scope.** On T0 plus 14 days, a fixed date that no visitor can hold off: drop the shim;
  `public.claim_daily_badge()` (DEFINER, fixed SQL: today only, a streak consistent with yesterday's
  row, and the day's server ticks covering a generated SQL copy of `LEGEND_SLUGS`, fenced by
  `simDailyLegend`) and revoke the client's `daily_badges` insert; the three chain nickname boards read
  the ledger through a read function and inserts on their tables are revoked (the 645c minor).
- **Fence.** `simPlayDoor` expected state; `simDailyLegend`.
- **Migration.** C1.
- **Player sees.** A tab left open for two weeks is asked to reload.

### 695. HOF or Bust ballot. 2 days, a data round under `dukb-data-guardian`.
- **Scope.** A two source verified hall status table for the Pro Football, Naismith, Baseball and
  Hockey halls (inducted, or retired and eligible for years and not inducted); an 8 player ballot a
  day, 4 in and 4 not, hints charged per player; line 6 of 8 right; Unlimited only from players
  outside the daily pool; back on points with a new cap period.
- **Fence.** `simKnowledgeLine` row (always HOF and always Bust pay 0, random at most 5, the 70
  percent voter at least 15); `simDailyLeak`; a two source check over every hall row.
- **Controls.** `hofshare`, a ballot of 5 in and 3 not, a hall row with one source.
- **Migration.** The hall status table (RLS on, public read), then a ledger step at a release
  midnight that sets `game_rules` for `hof-or-bust` to pay on `dp` and opens its cap period.
  Precondition: `hof-or-bust` does not pay and has no open `dp` period.
- **Player sees.** An 8 player ballot a day, and points again.

### 696. Score Predictor five finals. 2 days, a data round.
- **Scope.** Five finals a day from the verified finals tables with scores Champ or Not uses, lined
  against the constant most common scoreline; Unlimited from a disjoint set; back on points.
- **Fence.** `simKnowledgeLine` row (the constant scoreline pays 0); `simDailyLeak`; every final's
  score read from the verified table, never typed.
- **Controls.** A final shared by the daily and Unlimited; a score typed beside the table.
- **Migration.** A ledger step at a release midnight: `game_rules` pays, a `dp` cap period opens.
  Precondition: `score-predictor` does not pay.
- **Player sees.** Five finals to call a day, and points again.

### 697. Rank 'Em generated daily. 2 days, a data round.
- **Scope.** A daily of 7 athletes on one stat from verified stat pools (never a stat on
  `HL_UNVERIFIED_STATS`), list order a seeded shuffle, scored by pairs out of 21 (line 14, chance
  pays about 3.5), Unlimited through `firstDraw`; back on points.
- **Fence.** `simKnowledgeLine` row; `simDailyLeak`; a check that no dealt stat is on
  `HL_UNVERIFIED_STATS`.
- **Controls.** An unverified stat added to the pool; the list order sorted by the stat.
- **Migration.** A ledger step at a release midnight: `game_rules` pays, a `dp` cap period opens.
  Precondition: `rank-em` does not pay.
- **Player sees.** A new ranking every day, and points again.

### 698. Careers on the line (reserved). 2 to 3 days.
- **Scope.** Set by Round 687's measurement: the four My Careers and any fight game it put for fun,
  on value added in the shape of Round 692.
- **Fence.** `simSeasonValue` career sections; `simKnowledgeLine` rows.
- **Controls.** `idlepay`.
- **Migration.** A ledger step at a release midnight per game brought back.
  Precondition: the game does not pay.
- **Player sees.** Those careers pay points again.

**Total.** Release G: 19 rounds, about 36 days (its floor, the infrastructure, about 21). Release H:
7 rounds, about 15 days.

---

## 14. Every review defect, and where it closes

### Player lens (R0)

| Defect | Round | How |
|---|---|---|
| R0.D0 blocker, Perfect Lineup pays the perfect board for the top name | 683 | alphabetical pickers, a per board line, an oracle perfect that records 100 |
| R0.D1 binary, choice and ordering dailies pay constants and random | 681, 686 | independent keys, per day exact lines, the `counter` policy fenced; HOF, Score Predictor and Rank 'Em for fun |
| R0.D2 Unlimited hands out future dailies | 686, 697 | disjoint practice pools, `simDailyLeak`; Rank 'Em for fun until generated |
| R0.D3 the Gauntlet's best play is the biggest number | 683 | shuffled choices, rating and band colour hidden, squad rating points |
| R0.D4 Pack Battle pays luck and dollars, and a big pack's save is refused | 682, 675, 677 | rebuilt on calls landed; worth bounded; nothing refused |
| R0.D5 Sports Millionaire's best runs pay nothing | 682, 675, 677 | rungs on a line; nothing refused |
| R0.D6 Total Points rewards which game you play | 675, 676, 690 | one 0 to 100 unit on every surface through one view |
| R0.D7 real management pays idle or less | 692, 693 | value added in expectation against the paired idle league, greedy as the line, a measured expert as the unit; at Release G the ledger stays with honest copy |
| R0.D8 the season score pays for rerolls through abandon | 688 | one season claim a day at week one, abandon forfeits behind a confirm, `season_closes` |
| R0.D9 a second tab replays a daily | 680, 677 | the run record read before every step, a storage listener, one server claim |
| R0.D10 unreachable perfects | 685 | per deal reachable perfects by oracle or house expert |
| R0.D11 Football Grid's unlimited guesses on the ranked daily | 680 | a sticky assisted mark, a confirm, pre play copy |
| R0.D12 Perfect Season rerolls by reload | 684 | picks saved as made, result recorded at compute |
| R0.D13 Perfect Season shows ratings best first | 684 | hard mode daily, alphabetical, the stat line tested |
| R0.D14 no guide says how a season scores | 678, 688 | a Points section in every how to play, before play |
| R0.D15 the recap threshold is unreadable | 688, 693 | plain words at Release G; added wins against the expert's at Release H |
| R0.D16 Build Your XI's referee baseline calibrated on a stand in | 685 | points from the deterministic market read; the AI is commentary |
| R0.D17 Mystery Box and Squad Deal scored above impossible worst play | 685 | lines from `firstSlot`, a random opener and greedy |
| R0.D18 every Starting 5 records 0 until a redeploy | 685, 691 | points from the challenge's own stat; the deploy is commentary only |

### Data lens (R1)

| Defect | Round | How |
|---|---|---|
| R1.D0 blocker, the 644, 646, 648 order deadlocks | 673, 675 | 644 superseded and guarded, 646 and 648 deleted, a linear chain whose preconditions read only the ledger, md5s and id ordered evidence |
| R1.D1 the 100,000 bound does not exist; 8.8M lands | 675, 677 | worth bounded by construction, the door clamps, nothing refused, the stored total frozen |
| R1.D2 past season days frozen at the wrong worth | 675 | rows carry their scale; no apply time boundary; no quiet window |
| R1.D3 profile history revalued on every cap change | 675, 690 | no recompute exists; the profile reads the same view as the board |
| R1.D4 players can write their total and insert unbounded rows | 673, 677 | DEFINER save, direct grants revoked, server stamped times, future days excluded |
| R1.D5 646 drops `player_ranks` before its checks | 676 | build next, prove, swap last under `lock_timeout` |
| R1.D6 646's undo cannot reapply; 648 tests only a backup exists | 675 | the ledger with prior bodies; undo refuses unless the next step is undone; rehearsed in PGlite |
| R1.D7 648 recognises its save by a comment; the `xmin` test | 673, 675 | md5 fingerprints in the ledger; no same transaction step exists |
| R1.D8 profile, board and rank disagree | 676, 690 | one view and one unit; two labelled ranks; account names owned |
| R1.D9 648's gate counts rows anon can write; old tab soccer rows | 675 | no gate reads a visitor writable count; an untagged soccer row above 100 after P644 stays on the legacy scale |
| R1.D10 the Starting 5 zero window | 685, 691 | scoring no longer depends on the edge function; the deploy goes first anyway |

### Fence lens (R2)

| Defect | Round | How |
|---|---|---|
| R2.D0 the Gauntlet board's finished daily is unfenced | 680 | reload rows for NBA, NFL, MLB; m645c-1 and m645c-2 as controls |
| R2.D1 the 648 SQL fenced by substring | 675, 677 | the file is deleted; the door's SQL runs in PGlite |
| R2.D2 `simFreePoints` binds its own zero | 678 | section 3 requires the recorder to resolve to the engine's `pointsFor`, which the fence drives |
| R2.D3 the 647 fences copy the board's record | 674 | the board test compares against the engine's standings |
| R2.D4 `recordActivity` writes scored rows no scan reads | 679 | no score parameter (tsc), `simOneDoor`, the `playGames` network check |
| R2.D5 the unranked note may not render on the result card | 674 | a rendered result card check |
| R2.D6 a literal `false` passes where the registry lacks `daily` | 674 | the recorder's own mode detection |
| R2.D7 the 646 fence does not parse the upsert or check B | 675 | the migration is deleted; the `g` rows are generated and checked |
| R2.D8 the 63 UNPLAYED games have no recorder to ceiling check | 678, 687 | every paying game's perfect records exactly 100 through its own moves, or it is for fun |
| R2.D9 scans that read comments | 674 | comment stripped, test files skipped |
| R2.D10 control copies in a fixed `ROOT/dist` | 674 | per run `mkdtemp`, proved loaded |
| R2.D11 coin toss reds | 674 | timers cleared on unmount, the lockin control load independent |

### The rounds' own open calls

| Item | Round | How |
|---|---|---|
| 647, equal added rating | 692 | decided as equal share of the expert's headroom, per fifth of pick |
| 647, dominant college picks | 692 | headroom measured per fifth; a cell under `H_MIN` keeps the sport on the ledger, printed |
| 647, the draft counts only past the board's first names | 692 | value added counts every action against the idle league |
| 647 against 648, many idle seasons a day | 688 | one ranked season a day |
| 646, Perfect Lineup's cap of 100 no board reaches | 683 | a per board perfect |
| 646, Face Off's tie path ceiling | 681 | points from right answers |
| 646, the free kick post zone | 687 | the day's reachable perfect |
| 646, Budget Builder 126 and Sign the Player 697 | 685 | knapsack and house expert |
| 646, thirteen games with no ceiling | 687 | a fixed daily with a ceiling, or for fun |
| 646, history of title rows and old Budget Builder rows | 675 | kept at their day's worth on the legacy scale (rule 2) |
| 645b, old bests on inflated scales | 690 | Best Scores in best day points from `account_bests` |
| 645c, HOF or Bust has no day pin | 680 | the run keeps its deal's day |
| 645c, champion bundles go stale | 674 | `simChainChampions` in the suite |
| 645c, the NASCAR and Tennis alias writer against reader | 680, 677 | the settled flag and one claim make a reopened day practice |
| 645c, the chain boards' nickname form | 694 | the boards read the ledger |
| 648, the Pack Battle residue | 682 | a scale of its own |
| 645a, the stale restore mark | 680 | the settled flag |
| 645a, an unranked play filed under the guest handle | 677, 679 | the door names the row |

### What the judges found in the designs, and how this spec avoids it

| Finding | Avoided by |
|---|---|
| A first row index keyed on a public name can be squatted at midnight | the unique index is keyed on `user_id`; names use the day's best |
| A 4 argument overload makes every 3 argument call ambiguous | one new name, one signature; `overload` control |
| Balanced keys plus reveals let counting beat the line | independent keys; `counter` policy; `balanced` control |
| "First finish" still lets a free game be rerolled | claim at the deal |
| Gates a visitor can hold off (a quiet window, a 48 hour `via_door` wait) | fixed dates and ledger preconditions only |
| Guest keys: name takeover and a registration throttle as a denial of service | no guest keys; accounts own names |
| A whole save refused over 100,000 | nothing refused; clamps counted |
| Sign the Player zeroed as a dollar game | a house expert |
| 648's INVOKER file would break every save after the revokes | 673 guards it, 675 deletes it |
| The `dukb.save` setting gate bypassed in one GraphQL transaction | DEFINER with grants revoked |
| The day's best keeps best of N | ranked claims and the run record |
| Client supplied scale and name | the door takes the scale from `game_rules`; names bounded, account names owned; worth at most 100 a name a game a day |
| The owner's 2026-09-19 recompute read as dividing by the cap | flagged as owner visible call 1 |
| Rehearsing in BEGIN and ROLLBACK on production takes real locks | PGlite only; production sees read only precondition SELECTs |
| A profile total from a 5 minute view lags a play | `account_points(uid)` is live |
| Guests have no way to earn a new points badge without a tally | the board total for the handle |
| Kept awards from an inflated tally | server awards from the stored total; local ones are private (section 15, item 9) |
| Mirroring caps before the new client ships | the mirror waits for T0 |
| A broad re-date of history at T0 | only the one `daily_completions` evening window |
| A column and a validated CHECK with no lock timeout | `lock_timeout = '3s'`, between cron ticks, no validated CHECK added |
| PGlite installed with `--no-save` | a devDependency |
| A claim at first reveal spends a phone glance | the claim is the first scored action |
| Forfeiting a flagship career on a restart | careers claim at finish |
| An expert GM that does not exist | built in 692, measured, and a sport it cannot beat greedy in stays on the ledger |
| A 3 second commit asserted, not measured | one projection at commit, timed on a throttled CPU |

---

## 15. What this spec deliberately leaves, and why

1. **Scores are computed in the browser.** A forger can post a perfect day once per identity per game
   per day: once per account, and under any number of guest names. Closing it needs the server to
   score fixed answer dailies from submitted answers, a later tier. Bounded here at 100 a name a game
   a day, which is what a perfect player earns.
2. **Guest board names stay unowned.** Anyone can post under a guest handle. A handle on the board
   before any key existed cannot be proven by anyone, so every guest key scheme either hands a top
   guest's name and history to whoever claims it first or renames every existing guest, and a global
   registration throttle becomes a lever to keep new visitors off the board. Account names are owned
   (the insert refuses them), and a guest's worth is bounded.
3. **A second identity can peek at a daily** (a private window, a friend): the same as looking the
   answer up.
4. **Careers rank the first retirement of each Eastern day.** Abandoning a career to reroll costs a
   whole career of play, and forfeiting abandoned careers would punish the flagship's common restart.
   `simEconomyLive` prints retirements per account per day; revisit if the board shows farming.
5. **Moves after tip off do not change a season's points under value added** (Release H). Stated in
   the how to play.
6. **Rarity Round refuses a saved answer later renamed in its pool.** It fails closed and re-deals;
   the settled flag stops a second ranked record. Tracking renames is a data round of its own.
7. **History is not revalued.** Past days keep the worth they were paid under (rule 2), including
   Club Manager's per match rows and no skill payouts from before Release G. The one unit holds from
   the release forward, and an old tab after it counts only in games whose scoring did not change.
8. **`profiles.streak_state` and the browser's kept badges are client writable.** They are private,
   read only by that player, and rank nothing.
9. **A kept local badge can come from an inflated tally** (the owner's 8.8M Pack Battle tally keeps
   what it showed). The owner's rule is that an earned badge stays; it is private and ranks nothing.
10. **The four My Careers and any fight game that fails the line pay nothing between Release G and
    Round 698**, listed on What's New.
11. **Soccer Career and Club Manager are measured, not redesigned**, in Round 687; a red there is its
    own scoring round, and Release G waits for it.

---

## 16. Calls this spec makes that Anthony will see

None is money: PGlite is free, nothing uses a Supabase branch, and the extra refresh of one
materialized view every 5 minutes sits inside the Pro plan with the spend cap on. None is on the owed
list. Each is decided here and stated plainly on What's New and in PROJECT-STATE:

1. **Every total changes unit once.** His 2026-09-19 direction was to recompute every total "to the
   rule the public leaderboard already applies"; the recompute that morning kept the day's best but
   did not divide by the cap, so on this branch's caps a perfect Ball IQ day (1,600) is worth 160
   perfect Champ or Not days (10) on the profile while the board pays both 100. This spec follows the leaderboard's rule, the only way to
   close R0.D6: the median profile total goes from about 1,829 to about 200, the top from 61,839 to
   about 7,247. Badges stay.
2. **HOF or Bust, Score Predictor and Rank 'Em pay no points** until their data rebuilds land, plus any
   game the release gate finds paying for no skill (likely the four My Careers).
3. **Face Off's speed no longer pays points**; it still decides the match.
4. **Only the first ranked go of the day counts**, in every game.
5. **Ratings are hidden during picks** in Perfect Lineup, the Gauntlets and the Perfect Season daily.
6. **Pack Battle becomes a ten card pack** scored on calls landed, and Sports Millionaire scores rungs;
   the dollars stay on screen.
7. **Front office and dynasty seasons**: one ranked season a day, and abandoning a ranked season
   forfeits it; from Release H a season scores on the value added at tip off.
8. **Guest names stay unowned**; account names are owned.
