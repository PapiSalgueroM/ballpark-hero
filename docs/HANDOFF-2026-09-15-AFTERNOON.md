# Handoff, written 2026-09-15 afternoon (about 14:30 UTC) by the Claude desktop lane

Written by Claude Code on Anthony's PC, the lane that holds the **610 to 619 block**, for whichever
Claude picks this lane up next. Read it after `CLAUDE.md`, before `docs/PROJECT-STATE.md`. It
does not replace `docs/HANDOFF-2026-09-15.md` (the early morning tycoon handoff, now fully
shipped by Codex); it covers everything the 610 lane has in flight. Everything here was checked
against git, the database and the live site when written. **Verify before trusting:**
`git fetch && git log --oneline -5 origin/main`, the top of `docs/WORKBOARD.md`, and
`curl -s https://douknowball.com/ | grep -o 'assets/index-[A-Za-z0-9_-]*\.js'`.

---

## 0. The one paragraph version

The live site serves Round 610. Three finished rounds (611 College Grid, 612 Club Manager season
one Champions League field, 616 Premier League roster moves) sit together on the pushed branch
**`release-611-612-616`**. That branch is built and type clean. Its suite was triaged: two real
defects of mine (fixed and pushed), line endings and worktree module paths (not code), and **one
real blocker: Round 612 makes `simClubManagerFinances` fail on several seeds** (section 3.6, with
a bisect table and a fallback of shipping 611 and 616 without 612). After that it needs the
tycoon harnesses and vitest rerun cleanly, browser walks, a merge to main, a Lovable deploy and
live proof. The College Grid answer key table is **already loaded in production**. Round 613 (Soccer
Grid validator v24) has a refuted, buildable contract and a **work in progress** branch that was
never run or deployed. 614 and 615 are queued. Codex is working Rounds 586, 587, 603 and 604 in
parallel; do not touch its files.

---

## 1. Who is working in this repo right now (four tools, one repo)

| Lane | Where | Owns right now |
|---|---|---|
| **Claude desktop (this lane)** | `C:\Users\antho\ballpark-hero\.claude\worktrees\*` | Rounds **610 to 619**. Also the **publisher**: Codex's Lovable editor connection stalls, so this lane runs `deploy_project` for Codex's recorded, publish-ready releases (the owner approved "deploy as soon as it's recorded" on 2026-09-15). |
| **Codex** | main checkout `C:\Users\antho\ballpark-hero` plus `.worktrees\*` | Round **586** (first team development, `codex/round-586-first-team`), **587** prep (set piece scene), **603** (Club Manager live sim match action animations), **604** (Soccer Career drill animations). Files: `playerValue.ts`, `wonderkidFactory.ts`, both tycoon hooks, `AcademyPanel.tsx`, `StadiumTycoon.tsx`, the Club Manager match screen and the career drill components. It says it stays out of Claude's Club Manager engine and data work. |
| **Cursor** | OneDrive clone `C:\Users\antho\OneDrive\Documents\ballpark-hero` (runs two vite dev servers) | The formatting files it named on the board. Do not edit them. |
| **GPT-6 Astra** | shipped Round 601 (sim animations) | Nothing open that I know of. |

Rules that came out of collisions today:
- **Claim on `docs/WORKBOARD.md` and push the claim to main before building.** A claim that only
  lives on a branch loses: my first "600" claim was on a branch while Codex pushed 600 to 602 to
  main, and I had to renumber to 610.
- **Never build in the main checkout.** Codex works there. Use a worktree under
  `.claude\worktrees\` (section 7 has the exact setup).
- Round numbers are labels, not order. Ask git `merge-base --is-ancestor`, never the head
  commit's subject.

---

## 2. What is live (verified 2026-09-15 14:15 UTC)

- **origin/main head:** `c5469143` (Codex board claim for 603 and 604). Before it `cf15dce5`
  (Codex claim 586), then `4ae5ca72` (my "Round 610 is live" record).
- **Lovable `latest_commit_sha`:** `c5469143` (docs only commits since the last deploy).
- **douknowball.com entry bundle:** `assets/index-KIfwLt2Q.js`, deployment
  `bd4b549a-1e2c-416d-b9a0-ff041e50d911` (08:28 UTC), which is **Round 610**.
- Also live from this morning: Round 585 (gems and packs, deployment `e7e24c5d`), Rounds 600 to
  602 (guide citations, sim animations, guide navigation, deployment `8513312c`), both published
  by this lane for Codex. AdSense is "Review requested", approval pending.
- **Round 610 (mine), live:** players who joined with Google can get back in while Google sign in
  is paused. Hint on the Log In tab, clearer auth errors, a "Set a password" menu item for signed
  in Google-only accounts that opens `/reset-password` (sets `password_set` in user_metadata), a
  reauthentication fallback that emails a link. Files: `src/lib/googlePaused.ts`,
  `AuthModal.tsx`, `layout/Header.tsx`, `ResetPassword.tsx`; fence `scripts/simGoogleOnlyReturn.mjs`
  plus `src/components/auth/googlePaused.test.tsx`.

---

## 3. THE RELEASE IN FLIGHT: `release-611-612-616`

**Branch:** `release-611-612-616`, pushed, head **`4c165363`**, 28 commits ahead of the old main
`4ae5ca72` and 2 docs-only commits behind the current main (a rebase or merge is trivial, both
new main commits only touch `docs/WORKBOARD.md`).
**Worktree:** `C:\Users\antho\ballpark-hero\.claude\worktrees\r611-college-grid` (the folder is
named for 611 but has the release branch checked out). Its working tree was switched to **LF line
endings** on purpose (see trap 8.1) and is clean.

### 3.1 Round 611: College Grid is finishable again

- **Why.** Zero College Grid `game_completions` since **2026-07-31 23:02 UTC**. Cause proven:
  282 of 675 cells could only be judged by the AI validator (`college-grid-validate` v16), the
  free AI allowance runs out most of the US day, unverified guesses are free retries so no game
  ever ends, and the AI cached wrong refusals from a prompt that said "2000-2026". Data gaps too
  (null colleges, LSU and Texas A&M aliases, DE versus DL codes).
- **What.** Option C of `docs/design/round-611-college-grid-contract.md`: judge in the browser
  against a generated answer key, the way the NFL grid has since Round 406.
  - `scripts/lib/draftRounds.mjs`, `scripts/genCollegeGridData.mjs` (`--check`),
    `scripts/data/collegeGridPlayers.json` (35,611 rows, columnar).
  - `src/lib/collegeGrid.ts`: `judgeCollegeCell` returns yes, no or unknown;
    `COLLEGE_GRID_PLAYER_SOURCE`, `fetchCollegeGridData`, `MIN_POOL_SIZE`.
  - `scripts/genCollegeGridBoards.mjs` and `src/data/collegeGridPuzzles.ts`: boards
    `cg611-001` to `cg611-075`, every one proven solvable from the key.
  - `src/hooks/useCollegeGrid.ts` rewritten: in-memory judging, board id on actions, rules
    key `cg-rules-seen-611` so returning players see the new rules once.
  - Page, search, how to play, `src/data/gameContent/college.ts` guide, search keywords,
    the saved page `public/college-grid/index.html`, sitemap date and ledger.
  - Fences: `scripts/simCollegeGridKey.mjs`, `scripts/simCollegeGridPage.mjs`,
    `src/test/collegeGridOffline.test.tsx`. Deleted `simCollegeGrid.mjs` and
    `simCollegeGridFromData.mjs`; edited `simAnswerFromRecords.mjs`, `simQuotaHonesty.mjs`,
    `simNoRivalNames.mjs` (SKIP_FILES).
  - Adversarial review done; nine review fix commits are on the branch (split identity blocker,
    Matt Jones at Arkansas QB, Will Grier at Florida State, Merv Pregulman namesakes and more).
- **Database, already done in production.** `public.college_grid_players` exists with RLS on and
  a public read policy, and holds **35,611 rows** (checked 14:15 UTC). The migration file
  `supabase/migrations/20260915_round_611_college_grid_players.sql` still says "NOT YET APPLIED"
  in its header comment. That line is stale, and fixing it is a one line docs edit.
- **Until this deploys, the live College Grid still calls the old validator**, and is still
  writing cache rows: 377 `college-grid` rows, last write 2026-09-15 11:52 UTC.

### 3.2 Round 612: Club Manager season one Champions League field from the real 2025-26 tables

- **Why.** A player report on 2026-09-10: season one seeded the Champions League field by squad
  tier (`initUclGroup`), while season two already read final tables (Round 547).
- **What.**
  - `src/data/clubManagerFinalTables2025_26.ts`: 15 European leagues, 145 two-source verified
    places, source citations, holders PSG, and `CM_FINAL_TABLES_PARTIAL`, following the
    `CM_PARTIAL` convention.
  - `src/lib/clubManager.ts`: `uclFieldFromTables`, `uclDirectQualifiersFromTables`,
    `seasonOneUclField(eraId)`. Historic eras and custom clubs are untouched. Your own club
    qualifies only through a direct place, never the fill place.
  - `scripts/simUclSeasonOne.mjs`: sections 1 to 11, 13 negative controls. `simUclField.mjs`
    section 5 retired with a note.
  - Evidence: `docs/design/round-612-final-tables-2025-26.json`.
- **Held as an owner decision.** Liverpool and Real Betis finished 5th and really entered through
  their countries' European Performance Spot. The game gives England and Spain 4 places, so they
  start outside Europe. Section 11 pins that so it cannot change by accident. It goes with the
  36 team league phase work.

### 3.3 Round 616: Club Manager's Premier League players leave last season's club

- 18 pending Premier League rows in `scripts/data/rosterConfirmation2026.json` were two-source
  adjudicated (evidence `docs/design/round-616-premier-league-roster-adjudication.json`). The
  result is 9 moves and 4 removals in `src/data/clubManagerRosters.ts` (meta now 3,658 players).
  The nationality map was pruned with `bakeNationalities.mjs --prune`.
- Fence `scripts/simRosterAdjudication.mjs` sections 9 to 11, controls `enciso`, `alaba` and
  `mudryk`.

### 3.4 Gates so far, and what each red actually was

Run on the combined tree from 09:27 to 12:15 UTC (a CPU starved run; Codex, Cursor and a Round
613 workflow were all busy at the same time):

- `vite build` **0**. `tsc --noEmit -p tsconfig.app.json` **0**.
- `runAllSims` **16 of 312 red**, triaged:
  - **Real, mine, fixed in `4c165363`:**
    - `simNoRivalNames`: the LALIGA standings URL in the 612 data file had the league's title
      sponsor in its path. The source now cites the API host; the full request stays in the
      docs evidence JSON, which the guard does not scan.
    - `simNoInventedQuotes`: the College Grid FAQ said "our draft, roster and college stat
      records" on the same line as Scott Frost, which reads as a real player speaking. It now
      says "the draft...". Search keywords, the saved page and the ledger hash were regenerated.
      Both guards and `simSitemap` and `simSiteSearch` are green after it.
  - **Line endings, not code:** `simSoccerStintNameFold` and `simConnect4ClubRecords`. The
    worktree had been checked out with CRLF (`core.autocrlf=true` in the system gitconfig) and
    both harnesses cut the function body at `\n}\n`. The worktree is LF now (trap 8.1).
  - **Harness base, not code:** `simUclSeasonOne` "differs from origin/main". Before 612 is on
    main it builds a reference from origin/main's src, which lacks 616's rosters, so every
    rating differs. Once 612 is on main the harness switches to its own reference by design. On
    the combined branch run it as `UCL_S1_BASE=HEAD node scripts/simUclSeasonOne.mjs`. It
    passed on the 612 branch alone.
  - **`simUclField`:** red in the starved CRLF run, **green** on the LF tree (run twice).
  - **Worktree module paths, not code:** esbuild failed in `simClubManagerEraMidSeason`,
    `simClubManagerEraUcl`, `simClubManagerMeters`, `simFantasyDraftPool`, `simMatchScreen`,
    `simSignThePlayerAuction` and `simWc2026Results` (they import react by absolute path from the
    worktree's own `node_modules`, see 3.6).
  - **Load, then two Reacts:** timing assertions failed in `simTycoonPitch` and `simTycoonRooms`
    in the starved run (`simOpposition` alone took 5,491 seconds), and in the rerun they failed
    on a duplicate React I caused (3.6). They still need a clean rerun.
  - **Real, Round 612:** `simClubManagerFinances`, see 3.6.
- `vitest`: **274 of 274 tests passed, 33 of 33 files**, but exit 1 from 150 "Timeout calling
  onTaskUpdate" RPC errors under that CPU load. Rerun it alone.
- **A rerun of all 14 ran from 14:20 UTC** in the release worktree; its result is in section 3.6.
  To rerun them yourself (react copies present only for the seven esbuild ones, see 3.6):
  ```
  cd C:\Users\antho\ballpark-hero\.claude\worktrees\r611-college-grid
  for h in simSoccerStintNameFold simConnect4ClubRecords simUclField simClubManagerEraMidSeason simClubManagerEraUcl simClubManagerMeters simFantasyDraftPool simMatchScreen simSignThePlayerAuction simWc2026Results simClubManagerFinances simTycoonPitch simTycoonRooms; do node scripts/$h.mjs > /tmp/$h.txt 2>&1; echo "$h $?"; done
  UCL_S1_BASE=HEAD node scripts/simUclSeasonOne.mjs
  node node_modules/vitest/vitest.mjs run
  ```

### 3.5 Remaining steps to ship the release, in order

1. **Green the reds above** (rerun, never while a build runs, and never edit the tree mid-run:
   the suite bundles each harness as it starts).
2. **Browser walks on the built dist**, one at a time, never during the suite:
   - `node scripts/playGridCls.mjs` (it needs `dist/`).
   - `playGames` expects a server on 127.0.0.1:4173. Serve dist with
     `scripts/lib/hostLikeServer.mjs`, never `npx serve -s`. Then run
     `MSYS_NO_PATHCONV=1 ONLY=/college-grid ENGINES=chromium node scripts/playGames.mjs`, and the
     same for `/club-manager`. Without `MSYS_NO_PATHCONV=1` Git Bash turns `/college-grid` into
     `C:/Program Files/Git/college-grid`.
   - Play a College Grid board to a win and a loss yourself in the Browser pane if you can.
3. **Integrate with main.** `git fetch`; rebase `release-611-612-616` onto origin/main (only
   WORKBOARD commits are new) or merge main in. If `docs/WORKBOARD.md` conflicts, keep both
   lanes' text. `src/data/searchKeywords.json` conflicts are resolved by rerunning
   `node scripts/genSearchKeywords.mjs`, never by hand. Push the branch, then fast-forward main:
   `git push origin release-611-612-616:main`.
4. **Wait for the sync.** Call Lovable `get_project` (project `c29d224f-a662-4a15-b809-d86fa3b3f0ad`)
   until `latest_commit_sha` equals main's head. Deploying earlier builds the previous commit.
5. **Deploy.** `deploy_project` on the same project. Record the deployment id.
6. **Prove it live, with changed strings, not the push:**
   - The entry bundle name moves off `index-KIfwLt2Q.js`.
   - A chunk carries the College Grid judge (grep the loaded chunks for
     `COLLEGE_GRID_PLAYER_SOURCE` or `college_grid_players`).
   - `https://douknowball.com/college-grid/` shows "the draft, roster and college stat records".
   - A Club Manager chunk carries the 2025-26 tables (grep for `CM_FINAL_TABLES_PARTIAL` or a
     table name string).
   - Roster moves are present in the rosters chunk.
7. **Record.** `docs/PROJECT-STATE.md` gets a `## LIVE 2026-09-15: Rounds 611, 612 and 616`
   section at the top (deployment id, entry before and after, gates, what shipped, what is held).
   On `docs/WORKBOARD.md` mark 611, 612 and 616 LIVE in the 610 block. Docs only commit, push.

### 3.6 Rerun result (14:20 to 14:45 UTC, LF tree) and the one real blocker

- **Green now:** `simSoccerStintNameFold`, `simConnect4ClubRecords`, `simUclField`, and
  `UCL_S1_BASE=HEAD simUclSeasonOne`, plus `simNoRivalNames`, `simNoInventedQuotes`, `simSitemap`
  and `simSiteSearch` after the fix commit.
- **Seven "esbuild failed" harnesses were not load, they cannot run in a shim-only worktree.**
  They import `<ROOT>/node_modules/react/index.js`, `@testing-library/react`, `react-router-dom`,
  `@tanstack/react-query` and `react-helmet-async` by absolute path or from an entry file in the
  temp folder, and a worktree has no real `node_modules`. With `react` and `react-dom` copied in,
  four passed (`simClubManagerMeters`, `simFantasyDraftPool`, `simMatchScreen`,
  `simWc2026Results`). Three still cannot resolve other packages: `simClubManagerEraMidSeason`,
  `simClubManagerEraUcl` (**both matter for 612**) and `simSignThePlayerAuction`.
  **The copies were a mistake for everything else:** they give vitest based harnesses two Reacts
  ("Cannot read properties of null (reading 'useState')"). That is what `simTycoonPitch` and
  `simTycoonRooms` hit, because the copy landed while they ran. The copies are deleted again,
  and the worktree is back to shims only. **Run release gates from a full clone instead:**
  `git clone https://github.com/PapiSalgueroM/ballpark-hero C:\Users\antho\dukb-release`,
  `git checkout release-611-612-616`, `npm ci`, `npm install --no-save playwright`. It is a
  separate folder, not a worktree, with no shared index and LF line endings if you clone with
  `-c core.autocrlf=false`. Run the full suite there.
- **REAL BLOCKER, Round 612: `simClubManagerFinances`.** The combined tree fails the default
  seed ("week 30 income: p90 error 12.6% is over the 9% band"). Bisected by seed, running the
  same harness in each worktree:

  | tree | default seed | `SIM_SEED=2` | `SIM_SEED=4` |
  |---|---|---|---|
  | main (`desktop-next`) | PASS (week 30 p90 5.3%) | PASS | PASS |
  | `r616-pl-roster` alone | PASS (7.1%) | PASS | PASS |
  | `r612-ucl-season-one` alone | PASS (6.7%) | **FAIL** "the spend projection is no tighter at week 30 than at week 5" | **FAIL** "an old save's ledger did not fill (21 weeks, 1 home, 13.902m wages)" |
  | combined release | **FAIL** 12.6% | **FAIL** (spend tightness) | **FAIL** week 5 income p90 19.1% plus the old save ledger |

  So Round 612 made the finance projection and the old save path fragile. It was only ever
  gated on the default seed, where it happened to pass alone. The likeliest cause is that season
  one now puts different clubs into the Champions League, and the income projection does not
  count the extra home ties. The "old save's ledger did not fill, 21 weeks, 1 home" failure
  looks like a different path: a pre-desk save loaded through `loadCareer` that now stops early.
  Debug it properly (systematic debugging: reproduce with `SIM_SEED=4`, read section 6 of
  `scripts/simClubManagerFinances.mjs`, trace the 21 week save) before touching bands. The bands
  were measured on main; widening them to fit 612 would be passing for the wrong reason.
- **If 612 cannot be fixed quickly, ship 611 and 616 without it.** They do not depend on it.
  Cut a branch from main, cherry-pick 611's commits (`8e61c708` to `ede4510b`), 616's two
  (`a1bd91be`, `a61fed75`) and the parts of the fix commit `4c165363` that are not 612's (the
  College Grid copy, keywords, saved page, ledger). 612 is `97515d3f`, `ab74e173`, `3c5a551d`,
  `6e615400`, `b9da62cb` and `3f54d169`, plus the LALIGA URL line in `4c165363`. Then rerun the
  gates on that branch.

---

## 4. AFTER 611 IS LIVE: obligations that are easy to forget

From `docs/design/round-611-college-grid-contract.md` sections 5 and 7:

- **Watch the old validator die.** `college-grid-validate` POSTs in `function_edge_logs` should
  fall to 0 over the 24 hours after publish (baseline 102 to 107 a day). No new
  `ai_validation_cache` rows for `game = 'college-grid'` after the deploy time (last write before
  it: 2026-09-15 11:52 UTC, 377 rows).
- **Purge only after 24 hours with 0 new rows.** Contract section 5 has the exact SQL: read
  `new_rows`, `refusals` and `bernard` first, then in one transaction delete every
  `college-grid` row with `verdict->>'valid' = 'false'` plus the key
  `bernard|alabama|wide receiver`, recount, and commit only when the delete returned exactly the
  refusals plus bernard and the recount is 0. The contract's reading (373 rows, 51 refusals) is
  stale because the live page kept writing (377 rows at 14:15 UTC), so take a fresh read.
  Background and the soccer classes are in `docs/design/round-613-grid-cache-purge-candidates.sql`.
- **The success signal:** the first new `game_completions` row with `game = 'college-grid'` since
  2026-07-31. Log it in PROJECT-STATE when it shows up.
- Retiring the deployed `college-grid-validate` function is Round 615's job, not 611's.

---

## 5. ROUND 613: Soccer Grid stops refusing real answers (contract ready, build started, NOT deployed)

- **Branch `r613-soccer-grid`, pushed, head `6ffbc8fd`**, cut from `4ae5ca72`. Worktree
  `C:\Users\antho\ballpark-hero\.claude\worktrees\r613-soccer-grid` (still CRLF, switch it to
  LF the same way before running harnesses).
- **The contract is law:** `docs/design/round-613-soccer-grid-contract.md` (on that branch). It
  was drafted by one read-only agent and attacked by a second, which found 2 blockers and 13
  should fix issues. All of them are applied in the file you are reading. The raw map, draft,
  refutation and probe scripts are in `docs/design/round-613/` (the `probes/` folder has the World
  Cup band implementation, routing probe and the SQL used for every number).
- **Decision recorded in the contract:** fix the records pass in the validator now; do not move
  Soccer Grid to a browser key this round. Soccer Grid still gets finished (86 completions since
  07-01, the latest today at 12:01 UTC). The tables cannot give honest definite "no" answers for
  clubs, leagues or honours, and a key would be two or three rounds.
- **What v24 does:**
  - Derived club identity replaces the substring test. Barcelona stops accepting Espanyol,
    Arsenal stops accepting Arsenal Tula, Rangers stops accepting QPR (Adel Taarabt is cached
    wrongly as YES), and Atlético Madrid finally reaches the 180 "Atlético de Madrid" players.
  - A club miss is never a NO.
  - A closed label classifier: honours and caps never reach the nationality matcher again.
  - "both X and Y" needs both clubs, on one person.
  - Exact nationality with a shared citizenship table.
  - World Cup name bands A to F replace substring matching, so "ram" and "pirl" stop confirming.
  - A one person test using `player_market_values` birth years before combining two rows, so
    Romário x 1994 x Defender stops confirming.
  - A generated ids block inside the function, built by `scripts/genSoccerGridIds.mjs`, with a
    `--check` mode.
  - An 11 section harness `scripts/simSoccerGridJudge.mjs` with a replay mode for the cache
    purge.
- **What exists on the branch (written by a build agent that was stopped part way, never run
  through a harness):** `scripts/genSoccerGridIds.mjs`, `scripts/data/soccerGridIds.json`, the
  v24 rewrite of `supabase/functions/soccer-grid-validate/index.ts` (judge block markers are in
  place), a 7 line start on `src/hooks/useSoccerGrid.ts`, an edited `scripts/simQuotaHonesty.mjs`,
  and `scripts/simSoccerGridLabels.mjs` deleted (it POSTs to the live function).
- **What does NOT exist yet:**
  - `scripts/simSoccerGridJudge.mjs`.
  - The page half of the per cell "allowance used up" change (`src/pages/SoccerGrid.tsx` near
    line 216 still swaps the whole search for the message).
  - Any run of the generator's `--check`, the existing soccer harnesses
    (`simTeammatesPairs` and `simSoccerStintNameFold` lift `TRANSLIT` and `norm` by line
    position), tsc, or a review.
  - Treat every line on that branch as a draft to verify against the contract, not as done work.
- **How I was going to finish it** (the workflow script is saved under the session's workflows
  folder, but a new session should just rebuild it):
  1. A harness writer who has not seen the build writes `simSoccerGridJudge` from contract part 5.
  2. A converge loop runs the harness plain and every control, and fixes whichever side
     disagrees with the contract.
  3. Three review lenses (fail closed, data identity, contract and harness honesty), each
     finding verified, then fixed.
  4. The lead deploys through the Supabase MCP `deploy_edge_function`, reads it back with
     `get_edge_function` (version 24, CRLF normalised sha256 equal to the repo file), updates
     `scripts/data/edgeDeployed.json` in the same commit (soccer-grid-validate is at v23 today,
     sha `6aad2815...`), then runs the cache purge exactly as contract part 4 says (export,
     replay, SELECT with base64 keys, guarded DELETE, recount 0, straggler sweep 30 minutes
     later).
- **Include the hook and page change in the same release.** v24 sends more guesses to the AI
  (every club miss, near miss names, 25 labels that used to be refused outright). Today one
  "exhausted" answer locks the whole Soccer Grid board for the session. The per cell change keeps
  cells that records can settle playable. The src half needs a Lovable deploy; the function goes
  live the moment it is deployed, so ship the src first or together.
- **Owner decision to raise (money):** whether to pay for a Gemini allowance for the grid
  validators. In the 24 hours to 06:00 UTC on 2026-09-15 the free one logged 7 day-limit
  refusals, the first at 15:59 UTC on 2026-09-14.
  Nothing in 613 depends on the answer.

---

## 6. Queued after 613, and loose ends

- **614, NFL grid answer key.** `nfl_grid_players` copied the corrupt draft round column: 503
  players from the 1968 to 1982 drafts count as first round picks and 20 real first rounders do
  not. Super Bowls I to IV are invisible because the key starts in 1970 (Namath and Starr judge
  "no" on Won a Super Bowl): make pre 1970 Super Bowls unknown rather than no. Derive the round
  with `scripts/lib/draftRounds.mjs` (already written for 611). Files `scripts/genNflGridData.mjs`,
  `scripts/data/nflGridPlayers.json`, `src/lib/nflGrid.ts`, the table.
- **615, retire dead validators and audit Connect 4.** `college-grid-validate` (after 611 is live
  and the purge is done) and `football-grid-validate` (uncalled since Round 406) are still
  deployed. The five Connect 4 validators hold about 1,250 cache rows in 30 days with none settled
  from data. `football-connect4-validate` maps "atletico madrid" to the 1 name "Atlético Madrid"
  instead of the 180 at "Atlético de Madrid": regenerate its map from 613's
  `scripts/data/soccerGridIds.json`.
- **617 to 619 are unclaimed** inside this lane's block.
- **Club Manager data follow-ups:** Carvajal and other 2026 rows overtaken by the summer window;
  21 ledger rows that came from World Cup tables need rechecking; Liverpool and Betis extra
  European spots wait for the 36 team league phase.
- **A leaderboard write hardening round** is owed (score caps derived from each game's own rules
  first, then enforced server side). Its details live in the untracked
  `LEADERBOARD-SECURITY-2026-08-26.md` in Anthony's local folder. **Never commit that file; it
  describes an open hole in a public repo.** It was scheduled for after 2026-09-16 10:42 UTC.
- **Backlog position (recount 2026-09-15, `docs/design/backlog-recount-2026-09-15.md`):** the
  owner's tweak list is 68.4% done with half credit for partial (111 complete, 49 partial, 38
  open of 198). The master build spec is 45.9% (33 complete, 223 partial, 59 open of 315
  actionable). Those numbers predate 585, 600 to 602 and 610 going live.

---

## 7. How to work in this lane (setup that works on this machine)

- **Worktree:** `git worktree add -b <branch> .claude/worktrees/<name> origin/main`. Then give it
  `.bin` shims only:
  ```
  mkdir -p .claude/worktrees/<name>/node_modules
  cp -r .claude/worktrees/r611-college-grid/node_modules/.bin .claude/worktrees/<name>/node_modules/
  cp -r .claude/worktrees/r611-college-grid/node_modules/vitest .claude/worktrees/<name>/node_modules/
  ```
  Modules resolve from `C:\Users\antho\ballpark-hero\node_modules` by walking up. **Never
  junction `node_modules`** (removing a junctioned worktree empties the real one).
- **Switch a new worktree to LF** before running harnesses:
  ```
  git config extensions.worktreeConfig true
  git config --worktree core.autocrlf false
  git config --worktree core.eol lf
  git ls-files -z | xargs -0 rm -f -- ; git checkout-index -f -a
  git add -u
  git diff --cached --name-only
  ```
  The last command must print nothing. `git add -u` only clears the stale "modified" status that
  the rewrite leaves behind; content hashes are identical.
- **Supabase:** use the MCP server whose tools are named
  `mcp__9d9a185c-c543-44f6-a63a-4dee0f9f19b5__*` (`execute_sql`, `apply_migration`,
  `get_advisors`, `get_edge_function`, `deploy_edge_function`, `query_logs`), project
  `flawuiqbvjobmkfkauhw`. The server named plain `supabase` times out.
  - **Never invoke an edge function yourself.** Each call writes `ai_validation_cache` and spends
    players' AI allowance.
  - Load big data the Round 405 way: `net.http_get` of the raw GitHub file at a pushed commit,
    then a guarded insert in one transaction (the 611 migration header shows the pattern).
  - Run `get_advisors` after any DDL.
  - Columns people get wrong: `game_completions` has `game` and `created_at` (not `game_slug`,
    not `completed_at`).
- **Lovable:** MCP tools `get_project` and `deploy_project` only (0 credits; never
  `send_message`).
- **Commits:** explicit `git add <paths>` only, never `-A` (it sweeps about 900 debris files in
  the main checkout). Read `git status` before every commit. `&&` between a gate and a commit.
  End messages with the attribution line the session gives you. No em or en dashes anywhere.
- **Workflows:** run two or three heavy agents at a time, not five. A burst of parallel
  workflows used up the 5 hour session window in 3 hours and killed every agent in flight. Make
  builders commit early to a branch.

---

## 8. Traps hit today, each with its fix

1. **CRLF worktrees break source reading harnesses.** `core.autocrlf=true` is set in
   `C:\Program Files\Git\etc\gitconfig`, so every new worktree checks out CRLF, and harnesses that
   slice code at `\n}\n` read nothing. Symptom: `simSoccerStintNameFold` "no longer looks the
   player up on name_folded" on an unchanged file. Fix: section 7's LF switch.
2. **A starved machine produces fake reds.** esbuild exits with no message and timing
   assertions fail. Before blaming code, list node processes
   (`Get-CimInstance Win32_Process -Filter "Name='node.exe'"`) and check what Codex and Cursor
   are running. Never run the suite during a build or next to a workflow that bundles.
3. **`vitest` exit 1 with every test passing** means RPC timeouts under load. Read the summary
   line, rerun alone.
4. **Git Bash rewrites route arguments.** `PRERENDER_ONLY=/college-grid` became
   `C:/Program Files/Git/college-grid` and prerender refused. Prefix `MSYS_NO_PATHCONV=1` for
   anything that takes a route (`PRERENDER_ONLY`, `ONLY`).
5. **Regenerate one saved page without a full `build:seo`:** `vite build`, then
   `MSYS_NO_PATHCONV=1 PRERENDER_ONLY=/route node scripts/prerender.mjs`, then
   `node scripts/genSitemap.mjs`, then `vite build` again. Commit only the real changes
   (`git diff --ignore-cr-at-eol`); a full `build:seo` in a CRLF tree produced about 164
   line ending noise files.
6. **Guide copy edits need `node scripts/genSearchKeywords.mjs`,** or `simSiteSearch` section 7
   fails on the guide hash.
7. **The rival names guard scans URLs too.** Sponsor names in league API paths trip it. Cite the
   host in `src` and keep the full request in `docs/`.
8. **The invented quote guard reads first person words** ("our", "we") on a line that names a
   real player as speech. Rephrase; never weaken the detector.
9. **`simUclSeasonOne` compares against origin/main's src before 612 merges,** so any other round
   on the same branch that changes Club Manager data makes it red. Use `UCL_S1_BASE=HEAD` on a
   combined branch.
10. **The Write tool once turned `\u2013` escapes into literal dashes inside a regex.** Build dash
    characters with `String.fromCharCode(0x2013, 0x2014)` in harness code.
11. **A killed harness run can leave control directories** (`src/.google-paused-control-*`). The
    610 harness now cleans them at start; check `git status` for stray `src/.*-control-*` after
    any interrupted control run.
12. **`git worktree remove` fails while your shell sits inside the worktree.** `cd` out,
    `git worktree prune`, remove the empty folder.
13. **Deploy only after the sync.** `get_project.latest_commit_sha` must equal main's head, or
    the deploy builds the previous commit and the proof greps pass on nothing.
14. **A shim-only worktree cannot run every harness.** About seven harnesses import packages by
    absolute `<ROOT>/node_modules/...` paths or from temp entry files, and copying packages into
    the worktree creates a second React for vitest based ones. Build in worktrees; run the full
    release suite in a full clone (section 3.6).
15. **Gate a Club Manager engine change on more than one seed.** `SIM_SEED=2` and `SIM_SEED=4`
    caught what the default seed hid in Round 612 (section 3.6).
16. **Auth logs contain players' personal emails.** If a query pulls them into view, do not copy
    them anywhere, including handoffs and commit messages.

---

## 9. Decisions owed by Anthony (only these; decide everything else yourself)

- **Google sign in:** switch the Google Cloud Branding support email to the project address and
  publish the brand. Then flip `OAUTH_PROVIDERS.google` in `src/lib/authProviders.ts`, and
  Round 610's hints go quiet on their own.
- **Auth email delivery:** no auth email has provably gone out since 2026-08-12; custom SMTP has
  been pending since then.
- **Money:** a paid Gemini allowance for grid validators (section 5).
- **Club Manager:** model the extra European Performance Spots (Liverpool, Real Betis) or keep 4
  places.
- **Still open from before:** `docs/research/R1_soccer_sites.md` and `R3_creator_formats.md`
  name competitors in a public repo; delete or gitignore.
