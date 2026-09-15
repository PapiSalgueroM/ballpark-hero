# Round 611 contract: College Grid judged from a generated answer key

Written 2026-09-15 by a read-only contract agent from four read-only investigations (criteria coverage, data inventory, a 75 board measurement and a cached verdict audit). It was written before the desktop lane renumbered its block: where it says Round 600 read 611, Round 601 (Soccer Grid) read 613, Round 602 (NFL grid key) read 614, Round 603 (retire the validators, audit Connect 4) read 615, and board ids cg611-001 to cg611-075. Kept as the agent wrote it.

```text
ROOT CAUSE:
ROOT CAUSE (proven). A College Grid game ends only when one player reaches 9 counted correct picks or 15 counted guesses. Since the fail closed change on 2026-07-22, any guess the tables cannot confirm is never counted while the Gemini daily allowance is used up. The allowance is used up for most of the US day, and 42 percent of cells need the AI. So players can neither win nor lose, and nothing gets recorded.

SPOT CHECK 1, mechanism and timing (rerun 2026-09-15):
(a) game_completions for college-grid: 34 rows from 24 names. 32 of them are score 900 and were written before commit 4d7b906e ("Grids/Connect4 fail closed", 2026-07-22 17:45Z). The deployed v16 header still reads "FAIL CLOSED (2026-07-22)". The last win was 2026-07-22 12:30Z. After that there are 2 rows, both score 0, from one name, on 2026-07-31, then nothing through today.
(b) Players are still active: college_grid_selections took 510 correct picks in 30 days, on 25 distinct days. Over 45 days: 627 picks on 41 board-days, 4.7 distinct cells filled per board-day, and all nine filled on only 1 board-day.
(c) Control: soccer-grid got the same change in the same commit. It went from 15 completions before to 71 after (52 names), because its data pass can refute and its default tier is settled from data.
(d) Deployed college-grid-validate v16 (get_edge_function, updated_at 1788762378949, repo copy identical):
   - evaluate() returns only true or "unknown", and the data pass returns only when both labels are true. Every other guess goes to the cache or to Gemini.
   - The prompt says "(2000-2026)".
   - A per-day 429 returns {valid:false, unverified:true, exhausted:true}.
(e) Hook: useCollegeGrid.ts:121-130 adds no guess for unverified. Exhausted also sets checkingDown, and CollegeGrid.tsx:94-98 then swaps out the search box. Lines 136-138 swallow invoke errors.
(f) Function logs: 20 "ai refused 429 DAY" lines in the 24h to 2026-09-15 05:05Z. They appear in hour bands from 14Z to 05Z, i.e. 10am to 1am Eastern.

SPOT CHECK 2, the tables can decide both ways for the labels the contract keeps:
- Round one boundary: min(round two pick) minus 1, per draft year 1970 to 2025. It sits within 2 of the number of drafting teams every year except 1990 (25 against 28, consistent with the 1989 supplemental forfeits; one source). 1966 to 1969 have no round two rows. From 1970 on, 1,263 nfl_draft_picks rows are marked round 1 but fall past that boundary.
- College, two independent sources: the draft table and the roster college in nfl_grid_players, on 4,251 players matched by name and pick. 3,592 agree exactly and 4,133 after a small alias pass. Most of the other 118 are the "Texas A&amp;M" semicolon split and spelling pairs; a handful truly differ (Kentucky vs Wyoming).
- Roster college is filled on only 7,193 of 22,008 NFL key rows, so the draft table has to lead.
- Pins checked across two tables:
   - Deion Sanders: 1989 pick 5, Florida State, CB.
   - Champ Bailey: 1999 pick 7, Georgia.
   - Rashaan Salaam: 1995 pick 21, and Heisman 1994, both Colorado.
   - Bo Jackson: 1986 pick 1 and 1987 pick 183, plus Heisman 1985, all Auburn.
   - Jalen Hurts: cfb_qb_stats lists "Alabama,Oklahoma"; draft 2020 pick 53, Oklahoma.
   - Derrick Henry: 2016 pick 45, and 2016's round one ends at 31.
- Enough answers per school: all 44 current school labels have drafted players since 1970 in all 8 position groups. First round answers range from 2 (Cincinnati) to 80 (Ohio State).

SPOT CHECK 3, the labels the contract retires have nothing that can settle them:
- all_star_selections has 0 rows.
- hall_of_fame covers Baseball, Basketball, Boxing, Hockey, Soccer (US) and Tennis only.
- No table has college conference membership by season (cfb_rankings.conference is filled on 0 of 207 rows; college_athletic_facts holds only today's conference).
- cfb_heisman_winners is complete: 91 rows for 91 years, 1935 to 2025.
- Exposure on today's 75 boards, rerun with optionImpact.mjs: 23 boards have no AI-only cell and 282 of 675 cells are AI-only, which reproduces the audit.

WHY ROUND 490 DID NOT FIX IT. Round 490 (v16, 2026-09-07) added confirm-only draft, Heisman and All-American checks, and there are still no completions 8 days later. Confirm-only data plus an AI fallback cannot end a game while conference, Pro Bowler, National Champion and Hall of Famer cells stay on 52 boards.

WRONG REFUSALS. When the AI does answer, it refuses real players and caches the refusal: 51 cached refusals, at least 5 provably wrong, several citing the 2000 to 2026 window.

STILL UNPROVEN:
- How many of the 32 July wins were accepted on error before the fail closed change (verdicts from then were not logged).
- How many players actually saw the exhausted message (unverified guesses write nothing).
- How much of the drop is traffic rather than the mechanism (pageviews were not pulled).
- Whether the two score 0 rows on 2026-07-31 came from boards with no AI cells.

SIBLINGS:
SOCCER GRID (soccer-grid-validate v23, repo copy identical). Same AI-backed shape; fix next round (601).
- Why it still finishes: its data pass can refute (194 of 448 cache rows in 30 days are data refusals, per the audit). On the default normal tier only 9.5 percent of cells need the AI, and 46 of 46 daily boards from 2026-08-01 to 09-15 had no AI cell. 71 completions since fail closed.
- Where it breaks like College Grid on exhausted days: easy tier, 31.3 percent AI cells, only 12 of 46 days with no AI cell; hard tier, 34.8 percent, 33 of 46 days.
- Data refusals that are wrong right now (rerun today):
  - "Played for Atlético Madrid" is on 36 boards, but 180 players are stored as "Atlético de Madrid" and 1 as "Atlético Madrid". 8 refusals on that label are cached.
  - "Over 100 International Caps" falls through to the nationality check. 4 cached refusals, including Cristiano Ronaldo twice and Hazard.
  - 27 labels match no stored nationality, so every player is refused (audit).
  - 3 "Played for both X and Y" labels accept a player from either club (audit).

NFL GRID (/football-grid). No AI since Round 406, but the answer key it reads (nfl_grid_players) has two proven defects; fix in Round 602 using Round 600's shared round boundary module.
- Draft round: 503 of the 2,193 rows marked round 1 carry a pick above 36. 275 fall past a boundary we can derive (1970 to 1982 drafts); the rest are in 1966 to 1969, which have no round two rows. 20 genuine first rounders are not marked. First Round Pick and Round 6 or Later Pick misjudge all of these.
- Super Bowls I to IV are invisible because the key starts in 1970. 1,213 careers "begin" in 1970 against 272 in 1971. Of the 210 of those on GB, NYJ or KC, 200 have sb_wins 0, including Joe Namath, Bart Starr, Len Dawson, Ray Nitschke, Willie Lanier and Buck Buchanan (checked today).
- football-grid-validate v12 is still deployed but nothing calls it: 0 POSTs in 24h, 204 cache rows.

NBA, MLB, NHL AND CBB FRANCHISE GRIDS. Judged in the browser against complete tables. 0 AI cells, every cell settled both ways, archives rebuilt 14 of 14. No change needed.
- Completions since August: NBA 21, NHL 2, MLB 2.
- CBB has 0 since it launched on 2026-08-31. Its page mechanic is the same as NBA's, so traffic is the first suspect; not proven a defect.

OUTSIDE THE 3x3 SHAPE, STILL AI-JUDGED. The five Connect 4 validators hold 975, 167, 49, 32 and 26 cache rows over 30 days, with 0 settled from data. Audit in Round 603.

OPTION A. Extend the validator's data pass, keep the AI as the fail closed fallback: In college-grid-validate: refute from complete tables (Heisman, pick numbers), add Top 5, 1st Overall, Won a Super Bowl, Went Undrafted, 10+ seasons and the cfb_awards trophies, fold names, fix the LSU, TCU, BYU and Texas A&amp;M aliases and the Defensive End codes, drop the 2000 to 2026 window from the prompt, redeploy, sync the repo copy, purge the 51 refusals.
  data: Better on the labels the tables hold. Pro Bowler, Hall of Famer, the five conferences, National Champion, Transferred Schools, Played Two Sports and Conference Player of the Year still rest on a single model answer with its surname and era mistakes. Butkus after 2007 and NFL MVP co-winner strings stay caveated.
  impact: Measured on today's 75 boards: boards with no AI cell go from 23 to 26, AI-only cells from 282 to 243 of 675. On an exhausted day 49 of 75 boards still cannot be won or lost, so completions stay near zero.
  cost: About one round of Deno work plus a redeploy. It keeps spending the shared Gemini allowance that Soccer Grid also needs.
  risks: Round 490 already took this path on 2026-09-07 and completions stayed at zero. Wrong AI verdicts keep piling up in the cache. Every rule change is a deployed-function change plus a repo sync.

OPTION B. A plus retire the labels no table can settle and regenerate the boards, still judged by the edge function: Same label set and generated boards as C, but the rules run in college-grid-validate (Deno, per-guess ilike reads, cache writes) with the AI branch removed.
  data: Same verdicts as C. The identity join those reads need is the same key C builds, so the key gets built either way.
  impact: Every board is finishable. Each guess still waits on a network round trip and the 30-per-minute per-IP limit, and an invoke error is still a silent non-answer (useCollegeGrid.ts:136-138).
  cost: C's data and board work plus a Deno port of the judge, a redeploy, a repo sync and an edgeDeployed.json and simEdgeSync update.
  risks: Two copies of the rules (Node generator, Deno judge) can drift. The cache holds a second copy of every verdict, which has to be purged whenever a rule changes.

OPTION C. Judge in the browser against a generated College Grid answer key, with boards generated and proven from it (recommended): The Round 405 and 406 NFL grid pattern, applied to college. scripts/genCollegeGridData.mjs derives public.college_grid_players from nfl_draft_picks, the committed NFL key, nflfastr_rosters, cfb_heisman_winners and cfb_qb_stats and cfb_rb_stats. src/lib/collegeGrid.ts judges yes, no or unknown per label. All 75 boards are regenerated so every cell has at least 3 two-source answers. The search offers only key names, and the page stops calling the validator.
  data: Every verdict comes from tables, and every answer a board depends on has two sources (draft vs roster college agree on 97.2 percent of 4,251 players before any fix). A no only comes from a complete fact: position groups, Heisman (91 of 91 years), or pick numbers with a derived round one boundary. A college miss is never charged, because no table has complete transfer histories. Aliases, boundaries and boards are all derived and re-proven by the harness.
  impact: Once the key loads, every board can be won and lost with no network call, verdicts are instant, and there is no 'come back tomorrow'. The tables settle 4 of the 5 wrong refusals as yes (Deion Sanders, Champ Bailey, Rashaan Salaam, Bo Jackson). Conference, Pro Bowler, National Champion, All-American and award labels are gone until two-source tables exist, and rarity restarts on the new board ids.
  cost: One large round, about the size of Rounds 405 plus 406 but mostly reuse: gridEngine paging, the PlayerAutocomplete source, the useFootballGrid shape and the genNflGridData helpers. One new table of roughly 35,000 rows. Zero AI spend, which frees the shared allowance for Soccer Grid.
  risks: The key download is bigger than the NFL key's 22,008 rows (measure it and set MIN_POOL_SIZE from it). Identity joins can merge or split namesakes (harness sections 6 and 7). A release-day save sits on the same daily index (the board id guard handles it). Retiring labels is a product change the owner will notice. A rollback brings back the AI path with the old window, hence retiring the dormant function in Round 603.

OPTION D. Hook only: let exhausted or unverified guesses end the board: Count an exhausted guess as a miss, or add a Finish board button that records a completion with the current score.
  data: Counting an unverified guess charges players for the checker's failure, which breaks the fail closed rule in CLAUDE.md (grid hooks treat unverified as a no-penalty retry). A finish button leaves every wrong cached refusal and the 2000 to 2026 window in place.
  impact: Completion rows would appear, but AI cells still cannot be filled for most of the day, so the rows measure quitting, not playing.
  cost: Hours.
  risks: Fixes the metric rather than the game, and breaks a rule that must never break.

OPTION E. Pay for a Gemini allowance: Move the college and soccer validators off the free tier so the daily 429 stops.
  data: Unchanged: data still only confirms, the model still refuses on its era window, and surname-only confirmations still come with a model-supplied full name.
  impact: AI cells answer all day, so more boards finish, but wrong refusals still cost guesses and are cached for everyone.
  cost: A monthly bill, which makes it an owner decision under CLAUDE.md.
  risks: Spend grows with traffic, it does nothing for data correctness, and two grids stay dependent on an outside quota.

RECOMMENDED: C

CONTRACT:
ROUND 600 (desktop lane, worktree desktop-next, merge after Round 585 is live): College Grid judged in the browser against a generated answer key, with every board generated and proven from that key.

GOAL. After the key loads, every board can be won and lost with no network call. Every verdict comes from the site's own tables. A guess costs a turn only when the tables say a definite no.

1. DATA: THE ANSWER KEY
- New scripts/lib/draftRounds.mjs.
  - firstRoundEnds(picks): for each draft year, the first round two pick minus 1, taken from nfl_draft_picks. Null for a year with no round two rows (1966 to 1969 and older years without them).
  - The raw round column is never used as a verdict. Round 602 imports this same module.
- New scripts/genCollegeGridData.mjs (reuses the helpers and the --check mode of genNflGridData.mjs). It writes scripts/data/collegeGridPlayers.json.
  - Sources:
    - scripts/data/nflGridPlayers.json (committed, 22,008 careers from 1970)
    - nfl_draft_picks, deduped on (year, pick), forfeit rows dropped
    - nflfastr_rosters (draft_number, college, position)
    - cfb_heisman_winners (91 rows)
    - cfb_qb_stats and cfb_rb_stats (school lists)
  - Rules, all written into the file's rules block:
    - IDENTITY:
      - A draft row joins a career on folded name plus either (equal draft year and pick) or (first season within 3 years of the draft and a compatible position group).
      - Unjoined draft rows with one folded name, one college and years within 3 of each other form a draft-only entry.
      - A Heisman row joins the entry with the same folded name and school; otherwise it stands alone.
      - A cfb stats row adds its schools only when its folded name matches, its last year falls within the 3 years before the entry's draft or first season, and its list already contains the entry's draft college.
    - COLLEGES:
      - Decode HTML entities before splitting on semicolons (65 to 71 players are stored as Texas A&amp;M).
      - Canonical names come from a DERIVED alias table: a roster spelling maps to a draft spelling when the two co-occur on at least 3 entries and on at least 95 percent of that roster spelling's joined entries. Measured pairs include Louisiana State to LSU 73, Miami to Miami (FL) 60, Southern California to USC 49, Mississippi to Ole Miss 48, Texas Christian to TCU 37, Brigham Young to BYU 16.
      - No alias is typed by hand.
    - COLLEGES_AGREED: a college held by two independent sources (draft plus roster, draft plus Heisman, or draft plus cfb stats).
    - GROUPS: POSITION_GROUPS from src/lib/nflGrid.ts, applied to roster codes, the draft position (word forms included) and the Heisman position (HB and FB count as RB). An ambiguous old code adds nothing.
    - DRAFT:
      - best_pick is the smallest pick across the entry's draft rows.
      - first_round is true when any row falls inside its year's firstRoundEnds, false when every row has a boundary and none falls inside it, null otherwise.
      - undrafted is copied from nflGridPlayers.json.
    - DISPLAY_NAME: the nflGrid rule (name, then name plus college, then plus draft year), so namesakes never collide.
- New supabase/migrations/20260915_round_600_college_grid_players.sql (kept as the record; applied through the Supabase MCP, then run get_advisors).
  - Table public.college_grid_players: id text primary key, display_name, name_norm, colleges text[], colleges_agreed text[], groups text[], best_pick int, first_round boolean, undrafted boolean, heisman_year int, first_season int, seasons int, dup boolean.
  - Indexes on name_norm and display_name. RLS on, with a public read policy.
  - Loaded row for row from the JSON, the way Round 405 loaded nfl_grid_players.

2. THE JUDGE (replaces the validator for this page)
- New src/lib/collegeGrid.ts:
  - COLLEGE_GRID_PLAYER_SOURCE for PlayerAutocomplete.
  - fetchCollegeGridData(), using gridEngine.fetchFranchiseGridData paged on a column that is never null.
  - MIN_POOL_SIZE set from the measured row count.
  - A closed LABELS vocabulary.
  - judgeCollegeCell(entry, row, col) returns yes, no or unknown: yes when both labels are yes, no when either label is no, unknown otherwise.
- Per label:
  - COLLEGE (the 44 draft-table spellings used today): yes when the college is in colleges. Otherwise unknown, and the toast names the schools the records hold. A college miss is never charged, because no table has a complete school list for transfers outside QB and RB.
  - QUARTERBACK, RUNNING BACK, WIDE RECEIVER, TIGHT END, OFFENSIVE LINEMAN, DEFENSIVE LINEMAN, LINEBACKER, DEFENSIVE BACK: yes when the group is in groups, no when groups is non-empty and lacks it, unknown when groups is empty.
  - HEISMAN WINNER: yes when heisman_year is set. Otherwise no, except unknown when another entry holds a winner's folded name.
  - FIRST ROUND PICK: yes when first_round is true. No when first_round is false or the entry is undrafted. Unknown when first_round is null.
  - TOP 10 PICK, TOP 5 PICK, 1ST OVERALL PICK: yes when best_pick is at most 10, 5 or 1. No when best_pick is larger or the entry is undrafted. Unknown otherwise.
- Retired from College Grid (no table settles them both ways):
  - SEC, Big Ten, Pac-12, ACC and Big 12 Conference, Conference Player of the Year
  - Pro Bowler, Pro Football Hall of Famer, NFL MVP, Won a Super Bowl
  - National Champion, All-American, Outland Trophy, Doak Walker Award, Jim Thorpe Award, Butkus Award
  - Went Undrafted, Played 10+ NFL Seasons, Transferred Schools, Played Two Sports
  - Defensive End, Defensive Tackle, Cornerback and Safety (replaced by the two position groups)
- VALIDATOR CHANGES: none deployed, nothing redeployed.
  - college-grid-validate stays at v16, only as the rollback. Its repo copy is byte-identical, and scripts/data/edgeDeployed.json and simEdgeSync do not change.
  - The page stops calling it. Retiring it is Round 603.

3. THE PAGE
- src/hooks/useCollegeGrid.ts, rewritten in the shape of useFootballGrid.ts:
  - Fetch the key once; show an error card if it cannot load.
  - Judge in memory. A name not in the key, or a player already on the board, gets a toast and costs nothing.
  - yes: measure rarity, then insert into college_grid_selections, then addDailyGuess ok.
  - no: addDailyGuess x.
  - unknown: a toast, and no charge.
  - Remove the invoke, unverified, exhausted and checkingDown paths.
  - Keep maxGuesses 15, isWon at 9 correct, useGameCompletion('college-grid', ...) and score = correct x 100.
  - Every stored action carries the board id. A restored log whose id is missing or different is cleared with reset() before play.
- src/pages/CollegeGrid.tsx:
  - Drop the checkingDown notice and add the key error card.
  - Rewrite the description and attribute strings at lines 133 to 136.
- src/components/college-grid/CollegeGridSearch.tsx:
  - PlayerAutocomplete over COLLEGE_GRID_PLAYER_SOURCE with validateOnly, following the GridPlayerSearch pattern.
  - Stop importing nflCareerPlayers (78 hand-typed players). Do not delete that file; NFL Career still uses it.
- src/data/gameContent/college.ts, the '/college-grid' entry:
  - Remove: the conference rows, the 2000 to 2026 pool, All-American, Went Undrafted, 'submit any name you can spell', the 'checker cannot verify' rule and the conference tip.
  - Say instead, casually: a guess costs a turn only when the records say no; one player per board; the criteria are schools, positions, Heisman and draft picks.
- Then run node scripts/genSearchKeywords.mjs and commit src/data/searchKeywords.json. The /college-grid snapshot and scripts/data/lastmod.json move through build:seo.

4. BOARDS (generated, never typed)
- New scripts/genCollegeGridBoards.mjs writes src/data/collegeGridPuzzles.ts. The file header names the command and the seed, and --check exits 1 when the file differs from the derivation.
- 75 boards with ids cg600-001 to cg600-075. The ids are new so rarity rows for old questions never merge with new ones.
- Each board: 3 college rows from the 44 school labels, 3 criteria columns from the 13 criteria, dealt by a seeded shuffle.
- Every cell must have:
  - at least 3 two-source yes answers. Two-source means: the college is in colleges_agreed; plus, for a position column, the group appears in both the draft and roster positions; for a pick column, the pick is equal in nfl_draft_picks and nflfastr_rosters.draft_number; for Heisman, the Heisman table plus the draft row.
  - at least one yes answer who was a first round pick or played 5 or more NFL seasons.
- At most one of Heisman Winner, Top 5 Pick or 1st Overall Pick per board. No repeated board. Label use is reported.
- Why regenerate rather than patch: applied to today's boards, this vocabulary leaves only 10 of 75 intact (measured 2026-09-15).

5. CACHE PURGE (after publish, once the page has stopped writing)
- Read first:
  select count(*) filter (where created_at > '<publish time>') as new_rows, count(*) filter (where (verdict->>'valid') = 'false') as refusals, count(*) filter (where cache_key = 'bernard|alabama|wide receiver') as bernard from ai_validation_cache where game = 'college-grid';
- Reading on 2026-09-15: 373 rows, 51 refusals, bernard 1, last write 2026-09-14 21:17Z.
- Purge only when new_rows has stayed 0 for 24 hours after publish.
- Then, in one transaction:
  begin; delete from ai_validation_cache where game = 'college-grid' and ((verdict->>'valid') = 'false' or cache_key = 'bernard|alabama|wide receiver') returning cache_key; select count(*) from ai_validation_cache where game = 'college-grid' and ((verdict->>'valid') = 'false' or cache_key = 'bernard|alabama|wide receiver');
- Commit only when the delete returned exactly the refusals plus bernard from the read and the recount is 0. Otherwise rollback.
- soccer-grid and football-grid cache rows are not touched this round.

6. HARNESSES (under scripts/, picked up by runAllSims)
Every check has a control that must turn it red, and every control asserts it changed something before judging.

New scripts/simCollegeGridKey.mjs (SIM_CGKEY_CONTROL):
1. Round one is derived.
   - Check: first_round equals (pick at most firstRoundEnds) for every year with round two rows, and is null otherwise. Pins: Derrick Henry, 2016 pick 45, false; Joe Burrow, 2020 pick 1, true.
   - Control roundcol: read the raw round column instead; it must find at least one first rounder past his year's boundary (1,263 such rows from 1970 on today).
2. Colleges come from two sources.
   - Check: draft vs roster agreement, on entries that have both, after entity decoding and the derived aliases, is at or above the first run's value minus 0.5 points (raw baseline before either fix: 4,133 of 4,251, 97.2 percent). Every alias is backed by at least 3 entries.
   - Control entity: split on semicolons before decoding; agreement must fall below the floor.
3. Boards are proven.
   - Check: 75 boards, unique ids, 3x3, closed vocabulary. Every cell has at least 3 two-source yes answers and meets the fame floor, recomputed from a fresh pull through judgeCollegeCell. genCollegeGridBoards --check is clean.
   - Control emptycell: set board 1's first row to Boise State and its first column to 1st Overall Pick (0 first overall picks from Boise State, measured); must go red.
4. Every board can finish offline, both ways.
   - Check: key in memory, network stubbed to throw. A win bot fills 9 of 9 in 9 counted guesses on 75 of 75 boards. A loss bot that submits a definite no each time ends 75 of 75 boards lost at 15 counted guesses. Report the unknown share over a fixed sample.
   - Control nocount: every verdict that is not yes becomes unknown (the world before this round); the loss bot must fail to end the boards.
5. Wrong refusals stay fixed.
   - Check: these all judge yes, each fact held in two tables and checked 2026-09-15:
     - Deion Sanders x Florida State x Defensive Back
     - Champ Bailey x Georgia x Defensive Back
     - Rashaan Salaam x Colorado x Heisman Winner
     - Bo Jackson x Auburn x 1st Overall Pick
     - Jalen Hurts x Alabama x Quarterback
   - Control window: drop entries whose first NFL season is before 2000 (the old prompt's window); the first four must stop judging yes.
6. Heisman identity.
   - Check: 91 winners, one entry each. A winner with a draft row of the same folded name and school shares that entry (81 winners have a folded-name draft match today). Any other entry with a winner's name judges unknown on Heisman Winner, never no.
   - Control nomerge: skip the join; Salaam's draft entry must judge no.
7. Undrafted probe.
   - Check: list entries marked undrafted whose folded surname and college match a draft row within a year. The count must stay at or below the first run's (today: DJ Pumphrey, who is Donnel Pumphrey, 2017 pick 132).
   - Control plantdrafted: mark Joe Burrow undrafted in memory; the probe must list him.
8. Table equals file.
   - Check: college_grid_players row count and a hash of the judged columns match the JSON. SKIPS LOUDLY when Supabase is unreachable.
   - Control droprow: remove one row in memory.

New scripts/simCollegeGridPage.mjs (SIM_CGPAGE_CONTROL; reads source with comments stripped, like simNflGridPage.mjs):
1. Judged in memory.
   - Check: the hook imports @/lib/collegeGrid, calls judgeCollegeCell and fetches the key; it contains no functions.invoke(, no exhausted and no checkingDown. The page has no checkingDown.
   - Control invoke: plant an invoke of college-grid-validate.
2. Only a no costs a guess.
   - Check: the unknown and duplicate branches never call addDailyGuess; the no branch calls addDailyGuess x.
   - Control chargeunknown: plant a charge in the unknown branch.
3. The key's names.
   - Check: the search uses COLLEGE_GRID_PLAYER_SOURCE with validateOnly and does not import nflCareerPlayers.
   - Control typedlist: plant that import.
4. The copy only asks what the pool offers.
   - Check: the /college-grid copy and the page strings carry no retired label, no 2000 to 2026 and no 'any name you can spell'. Each (player, row, column) the example states judges yes against the key; the harness first asserts each named player is still in the copy.
   - Control copy: plant 'SEC Conference' into the intro.
5. A save from another board is not shown.
   - Check: actions carry the board id, and a log with a mismatched id is cleared.
   - Control noboardid: remove the comparison.

Changes to existing harnesses:
- Delete scripts/simCollegeGrid.mjs: its conference lists ignore era, and it skips, loudly, the criteria this round retires.
- Delete scripts/simCollegeGridFromData.mjs: its sections 3 and 4 POST to and read the dormant validator. Its round boundary check and roundcol control live on in simCollegeGridKey section 1.
- Remove the 490 block from scripts/simAnswerFromRecords.mjs: it POSTs to college-grid-validate and writes ai_validation_cache.
- In scripts/simQuotaHonesty.mjs, drop useCollegeGrid.ts and CollegeGrid.tsx from HOOKS and PAGES; keep the validator entry while v16 is deployed.
- scripts/simGridRarity.mjs (measure, then insert) and scripts/simGridPuzzlePool.mjs (floor 60, dupe control on college-grid) do not change and must stay green.

7. WHAT DONE MEASURES
- Gates:
  - node_modules/.bin/tsc --noEmit -p tsconfig.app.json at 0 errors (read the exit code).
  - npm run build.
  - node scripts/runAllSims.mjs green, with every control above run once and red.
  - simEdgeSync green.
  - The full build:seo harness list, because the snapshot changes.
  - playGridCls at or under 0.05 on /college-grid.
  - playGames ONLY=/college-grid ENGINES=chromium.
- Offline outcome:
  - With no network: 75 of 75 boards won in 9, and 75 of 75 lost at 15.
  - 0 cells under 3 two-source answers.
  - 0 first rounders past a boundary.
  - The 5 pinned wrong refusals judge yes.
  - College agreement at or above the floor.
- Live outcome, read by SELECT and log reads after deploy_project:
  - 0 college-grid-validate POSTs in function_edge_logs over the 24 hours after publish (baseline 102 to 107 a day).
  - 0 ai_validation_cache rows for college-grid created after publish (baseline: last write 2026-09-14 21:17Z).
  - Purge recount at 0.
  - game_completions for college-grid gets its first row within 7 days of publish (baseline: none since 2026-07-31, and 2 since fail closed on 2026-07-22). Weekly counts are reported next to soccer-grid's 7 to 19 a week since mid August.
  - Board-days where the crowd filled all nine cells (baseline 1 of 41 over 45 days), reported for the first 14 days.
- docs/PROJECT-STATE.md and docs/WORKBOARD.md record the round, these baselines and the readings.

FOLLOW UPS:
- Round 601, Soccer Grid. Four fixes: (1) match 'Played for Atlético Madrid' to the stored 'Atlético de Madrid' (180 players, 36 boards). (2) Stop sending labels that are not nationalities to the nationality matcher; 27 labels are affected, including 'Over 100 International Caps'. (3) Make 'Played for both X and Y' require both clubs. (4) Settle the league labels from club stints so the easy and hard tiers stop depending on the AI. After those land, purge the soccer rows in classes D to I of grids/purge_candidates.sql.
- Round 602, NFL grid key. Derive draft_round with scripts/lib/draftRounds.mjs: 503 rows are marked first round with impossible picks, and 20 real first rounders are unmarked. Judge Won a Super Bowl as unknown instead of no for careers cut off at 1970 (Namath, Starr, Dawson, Nitschke, Lanier, Buchanan). Add simNflGridData sections, each with a control.
- Round 603. Retire the two dormant validators: college-grid-validate v16 and football-grid-validate v12. Delete them after College Grid has a week of completions, delete their 373 and 204 cache rows, and update scripts/data/edgeDeployed.json and simEdgeSync. In the same round, audit the five Connect 4 validators: 975, 167, 49, 32 and 26 cache rows in 30 days, 0 settled from data.
- Bring retired College Grid labels back only when a two-source table exists for them:
- All-American: rebuild cfb_all_americans with a real school column and fill the missing years (1968 and 1969, 1978 to 1980, 1991 to 2001, 2008).
- Pro Bowl: all_star_selections has 0 rows.
- Pro Football Hall of Fame: no football rows anywhere.
- Conferences: no table has membership by season.
- National Champion per player: college years exist only for QBs and RBs.
- Outland, Doak Walker and Thorpe: cfb_awards is a single source.
- Went Undrafted and Won a Super Bowl: after Round 602.
- The CBB grid has recorded 0 game_completions since it launched on 2026-08-31. Its page works the same way as the NBA grid, which has 21 completions since August. Pull its pageviews before calling it a bug.
- In docs/PROJECT-STATE.md, next to College Grid, record which labels were retired and the data each one needs to come back, so the owner can see the product change plainly.
- Scratch evidence behind this contract: C:\Users\antho\AppData\Local\Temp\claude\C--Users-antho-AppData-Roaming-Claude-scratch-workspaces-50dddb89-3f2d-489c-aa74-9f4e8b0d330b-58dca337-1c2e-45e1-8c03-c174834a78fb-scratch-2026-09-15-84009d\2e875a46-cb59-48b9-a34a-ba48e9b4b38b\scratchpad\grids\round600_feasibility.sql (per-school answer counts) and ...\grids\optionImpact.mjs. The second counts boards with no AI cells: 23 today, 26 under option A, 10 when the option C labels are applied to the current boards.
```
