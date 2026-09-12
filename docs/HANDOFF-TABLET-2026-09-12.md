# Handoff, tablet lane, 2026-09-12

For whoever picks this up next, human or Claude, with no memory of this session. Everything here
is checkable: branch names, commit subjects, SQL you can re-run, numbers you can re-measure.
Where something is open I say so plainly instead of leaving it implied.

**If you are a fresh session, read `CLAUDE.md`, `docs/SHIP-PIPELINE.md` and
`docs/PROJECT-STATE.md` first. This is the delta on top of them.** It supersedes
`HANDOFF-TABLET-2026-09-11.md`, which was deleted rather than left to rot beside it.

---

## 1. Where the work is

Branch: **`claude/douknowbll-spec-work-c3zcci`**, pushed and clean.

There is no open PR. The desktop lane's standing offer, recorded in `docs/WORKBOARD.md`, is that
the tablet lane pushes and the desktop lane merges and publishes. So the next step is either
opening a PR or telling the desktop lane the branch is ready.

Check the real head with `git log --oneline -5` rather than trusting a number written here.

**Three changes are already live in the production database and a branch revert will not undo
them.** Section 3. Read that before anything else.

---

## 2. What is on the branch, round by round

Seven rounds. **Three of them exist only to fix the other four**, and that is the most important
thing in this document: four rounds shipped defects that the type gate, the build and their own
harnesses all passed. Every one was caught afterwards by a review pass whose only job was to
disbelieve the code.

| Round | What it is | State |
|---|---|---|
| 526 | Sitewide search: `/search`, `src/lib/siteSearch.ts`, generated keyword index, `simSiteSearch` | Shipped, then fixed |
| 527 | Profile achievement case: `src/lib/achievements.ts`, `AchievementCase.tsx`, `simAchievements` | Shipped, then substantially rewritten |
| 537 | Leaderboard day ends at midnight Eastern, plus Week and Month views. **Production.** | Applied, frontend then rewritten |
| 538 | Gauntlet Draft: MLB, and the board lifted so four sports share one component | Shipped |
| 539 | The Round 527 fixes. **Production.** | Shipped |
| 540 | The Round 537 frontend fixes | Shipped |
| 541 | Score caps so the gauntlet drafts earn points. **Production.** | Shipped |

Round 537 was built and pushed under the label **528** and renumbered afterwards. The commit
subjects still say 528 on purpose: the desktop lane's rule is that round numbers are labels, and
rewriting pushed history to fix a label is a bad trade. `docs/WORKBOARD.md` carries the account.

---

## 3. The three production database changes

All three are in `supabase/migrations/` and all three are **applied to project
`flawuiqbvjobmkfkauhw`**. The files are the record; the database is the truth.

### `20260911_leaderboard_eastern_day.sql` (Round 537)

The shared leaderboard's "Today" rolled over at **20:00 Eastern**, not midnight, because
`game_completions.completed_on` defaults to a UTC date and `global_leaderboard` filtered the same
UTC date. Writer and reader agreed with each other and disagreed with the rest of the site, where
74 files use `getTodayET()`.

Measured before it ran:

- 72,460 of 356,808 completions over 30 days (**20.3%**) sat under the wrong day. By Eastern hour
  the signature was exact: everything from 20:00 to 23:59 filed wrong, everything earlier filed
  right.
- Sampled live at 23:48 Eastern: the board showed 111 players when 407 had played that day, and
  the day's real top three did not appear at all.
- A second bug found while fixing the first: the best per game per day grouping keyed on the same
  column, so one Eastern evening either side of 20:00 counted as two days and both day bests were
  summed. 1,087 of 19,799 player game days.

It rewrites `global_leaderboard` and `global_rank` to take the Eastern day from `created_at` at
query time, adds `idx_game_completions_et_day_game`, and swaps the `player_ranks` materialized
view inside one transaction. **No stored row was rewritten and `completed_on` is deliberately
untouched**, so history is corrected along with the future.

### `20260911_player_game_days.sql` (Round 539)

One read only function returning one row per distinct (game, Eastern day) for a player.
Additive, reversible with a `drop function`, touches no data. It exists because of section 4.

### `20260911_gauntlet_draft_score_caps.sql` (Round 541)

Three rows in `game_score_caps`. See section 5.

**Also run, and not a migration:** `ANALYZE public.game_completions;`. The Round 537 migration
created an expression index and never analysed, so the planner had no statistics for it and was
underestimating rows by 97x. The week board measured **5,135 ms** with an external merge sort
spilling to disk. After the ANALYZE it measures **1,580 ms** with no spill. This would have
self-corrected in roughly two days via autoanalyze. **If you ever add an expression index to this
table, run ANALYZE in the same breath.**

---

## 4. The trap most likely to bite you next: game_completions is not a list of finishes

`recordActivity` in `src/lib/completions.ts` inserts a row **per Club Manager match** and **per
Soccer Career season**, not per session. Anything that counts rows in that table and calls the
answer "games played" is wrong, and wrong by a lot.

Measured 2026-09-11, re-runnable:

- 376,818 rows collapse to **25,182** distinct (player, game, Eastern day) triples. 15x site wide.
- The busiest handle's **6,440 rows are 49 real game days**. 131x.
- Across all 6,981 handles ever, in game days: median 2, top twentieth 14, top hundredth 28, top
  thousandth 59, deepest **121**.
- Other ceilings: 43 distinct days played, 53 different games, 43 days on one single game, 36
  different games in one day.

Round 527 counted rows and gave out a legendary trophy for "Finish 1,000 games", reachable off a
single Club Manager save. Round 539 counts game days and rescales every threshold to the numbers
above.

**`src/lib/badges.ts` still counts raw rows**, capped at 500, and was not touched. Same defect,
second location, which is exactly the Round 426 pattern `CLAUDE.md` warns about. Open item.

---

## 5. The trap that is quieter and just cost three rounds: a new game earns nothing until someone says so

`public.game_score_caps` is an **allowlist, not a tuning table**. `global_leaderboard` and
`global_rank` inner join `game_denominators` over it, so a game key with no row is dropped from
every board and every rank with nothing anywhere reporting it. That is deliberate: it is the
defence against somebody inventing a game key and posting completions under it, and the
`20260830` migration says so.

The cost is that a genuinely new game ships earning zero. Soccer's `/gauntlet-draft` has had a cap
since 2026-08-30. **The NBA and NFL boards shipped in Round 520 without one and the MLB board
shipped in Round 538 without one**, so every player who finished any of them earned exactly
nothing. Fixed in Round 541; nothing needed backfilling because the boards derive on read.

Two things worth carrying:

- **A missing cap is not always a bug.** The same sweep surfaced `draft-duel`, `nascar-driver`,
  `nrl-my-career` and `qa-test`. `draft-duel` had its cap dropped **on purpose** in Round 480 as
  an invented key no code has ever written. The other three are not in `src/data/gameRegistry.ts`
  at all. Checked exactly against the 124 registry slugs: **the only real gaps were the three
  gauntlet drafts.** Do not add a cap to a key no shipped game writes.
- **The fence for this exists and could not run here.** `scripts/simLeaderboardCaps.mjs` is
  exactly the check that every key the source can send has a cap row, and its header explains this
  precise failure mode. It reads the live database, and this sandbox blocks that host
  (`403 Host not in allowlist: flawuiqbvjobmkfkauhw.supabase.co`), so it silently was not part of
  any gate on this lane. **On this lane, run its check through the Supabase MCP instead**, or
  three more rounds will ship games that score zero. That is how all three of these got through.

---

## 6. What the reviews found and what is still open

Four adversarial review passes ran this session. Their confirmed findings, and honestly which are
fixed.

### Fixed

- **Search returned the whole catalog for any query with no ASCII letters.** `isBrowse` asked "did
  this tokenise" when it meant "is the box empty", so `хоккей`, `サッカー`, `!` and `🏒` all fell
  into the browse branch and the home page rendered all 123 games as matches, replacing the
  curated layout. The ranking it replaced showed an honest no results state. Fixed, plus
  `isUnreadableQuery`, plus the control `SIM_SEARCH_CONTROL=catalogdump` that reproduces it.
- **Achievements un-earned themselves**, counted activity pings as finishes, used the wrong day,
  and minted a `localStorage` handle from a file whose header promised it wrote nothing. All four
  fixed in Round 539.
- **The leaderboard wedged permanently.** Opening 7 Days and clicking away before it landed left
  one shared `loading` flag true forever, gating all four panels, recoverable only by reload. A
  keyboard user hit it every time because a Radix tab strip activates as the arrow key moves. A
  filter change could also blank a window for good. Both fixed in Round 540 with one generation
  counter and per window state.
- **Three gauntlet games earning zero.** Round 541.
- **The expression index had no statistics.** ANALYZE, section 3.
- **Copy that was not true:** "No points yet" on the 7 Days tab for 4,555 of 5,501 scoring
  players; the NBA board calling a level game a shootout; a comment claiming Today and All Time
  were served by the cached view when `global_leaderboard` never references it.

### Open, in the order I would take them

1. **`global_rank` returns no row for `p_games` null plus an unrecognised period**, and a NULL
   period returns an empty board from both functions through three valued logic. The migration
   claims "an unrecognised p_period still behaves as alltime", which is true of
   `global_leaderboard` and false of `global_rank`. Not reachable from `Leaderboard.tsx`, which is
   typed to four literals, but reachable by any direct RPC caller and a live trap for the next
   period added to the board but not the cache. Suggested fix: make branch B's guard the
   complement of branch A's, `where not (p_games is null and p_period in ('today','alltime'))`.
2. **The navbar was left on a UTC day while the leaderboard moved to Eastern**, so they now
   contradict each other for four hours every evening. `src/hooks/useGameNavbarStats.ts` and
   `src/pages/Index.tsx` build `todayUtc` from `toISOString()` and filter `completed_on`, while
   the points and rank beside them come from the Eastern `global_rank`. A player who played at
   15:00 and opens the site at 21:00 on another device sees "0 games, 312 points, Today #14" in
   one strip. Same unconverted bucketing in `src/lib/badges.ts`, `src/pages/RarityRound.tsx` and
   `src/hooks/useMostPlayed.ts`.
3. **`src/lib/badges.ts` counts raw rows.** Section 4, second location. Fixing it also removes a
   duplicate 500 row read of `game_completions` on every profile view.
4. **The Today rank card and the Today board disagree for up to about 5.5 minutes after midnight
   Eastern.** The card reads the cron refreshed `player_ranks`, whose `today` partition is
   evaluated at refresh time; the board is live. The cron is every 5 minutes and its worst
   observed run was 20.7 s. Pre-existing, but it now sits beside copy saying the board resets at
   midnight.
5. **The migration's impact paragraph states one direction of a two directional change.** It says
   756 players lose inflation. Recomputed: of 755 changed, **364 went up** and 391 down, biggest
   gain +398.3 against worst drop -377.9. The code is right, a UTC day legitimately splits into
   two Eastern days; the prose is what is wrong, and anyone reading it to explain a changed total
   will mislead 364 people.
6. **`games_played` on the board is a game day count wearing a game label**, rendered as "N scored
   games". Pre-existing label problem whose magnitude the Round 537 regrouping changed.
7. **The NHL gauntlet draft is deliberately not built.** The pool in
   `src/data/nhlPerfectLineupPool.ts` is 58 players. With five cards a slot and nobody dealt twice,
   the top card in the goalie and left wing slots is the same player nearly every day, and
   `runGauntlet` is deterministic in the squad, so over 600 drafts the always best card six is
   only **2 distinct squads** against the NBA's 171 and the MLB's 600. Perfect play took the
   trophy 0 percent of the time where random play took it 3.7 percent. Letting wingers play either
   wing moved it to 6. **It is the pool, not the ladder and not the shape.** Widening that file is
   its own round and improves Perfect Lineup: NHL at the same time.
8. **`player_ranks` is anon selectable and was re-granted `all` rather than `select`.** Supabase's
   advisor fires `materialized_view_in_api` on it and it is the only such object. Matviews cannot
   carry RLS, so only the grant is tightenable. Anon can page all 5,496 rows where the UI shows
   100. Low severity: 0 of 5,496 names contain an `@` and 5,474 match generated handle shapes.
9. **`simSiteSearch` section 3's top 5 floor erodes as games are added.** 86.2% against a floor of
   80, down from 87.6% at 121 games, because each new "Guess ..." game dilutes it. It will go red
   on growth rather than on a bug.
10. **Ten Codex branches, `origin/codex/round-526-*` through `round-535-*`, carry the same round
    numbers this lane and the desktop lane are using.** None is an ancestor of `main`. Read the
    numbering note at the top of `docs/WORKBOARD.md` before merging one.

---

## 7. How to verify all of this yourself

```
npm install
npm install --no-save playwright
pip3 install fonttools pillow

node_modules/.bin/tsc --noEmit -p tsconfig.app.json   # must be 0. Plain tsc is a no-op here.
npm run build
node scripts/simGauntletEngine.mjs
node scripts/simSiteSearch.mjs
node scripts/simAchievements.mjs
node scripts/simNoRivalNames.mjs
```

The controls are the part actually worth running, because a harness whose control does not fire is
green for the wrong reason:

```
SIM_SEARCH_CONTROL=catalogdump node scripts/simSiteSearch.mjs
SIM_GAUNTLET_ENGINE_CONTROL=badscore  node scripts/simGauntletEngine.mjs
SIM_GAUNTLET_ENGINE_CONTROL=flatdeal  node scripts/simGauntletEngine.mjs
SIM_GAUNTLET_ENGINE_CONTROL=blindload node scripts/simGauntletEngine.mjs
for c in write unreachable trivial rename leak mutate nonmono deadfact builder window mint; do
  SIM_ACH_CONTROL=$c node scripts/simAchievements.mjs > /dev/null; echo "$c -> $?"
done
```

Every one of those was verified firing in this session, each scoped to its own section. Note
`simAchievements` inverts exit codes under a control: **0 means the control fired**, 1 means it
did not. A bogus control name exits 1, and a control whose target string is gone aborts with
"cannot run" rather than passing green. That last property was proved by renaming the target out
of the source and watching it abort.

**NOT yet run on this branch, and both must be before it ships:**

- The 15 built site fences after a full `build:seo`: `simAdsense`, `simBrand`, `simHeadTags`,
  `simHiddenPages`, `simHubs`, `simIndexNow`, `simIndexing`, `simInternalLinks`,
  `simNoRivalNames`, `simPrerender`, `simPrerenderBoot`, `simRetiredRoutes`, `simSchema`,
  `simSitemap`, `simSnapshotAssets`. Round 538 adds `/mlb-gauntlet-draft`, so this is required,
  and per `CLAUDE.md` it must be **all** of them rather than a hand picked few.
- `scripts/simLeaderboardCaps.mjs`, which cannot run in this sandbox. Section 5.

Also not run: the browser sweeps, `scripts/sweepGames.mjs` and `scripts/playGames.mjs`. Use
`ENGINES=chromium`.

---

## 8. The habit worth carrying forward

Four of the seven rounds on this branch passed `tsc`, passed `npm run build`, and passed their own
harnesses while carrying defects a user would hit: a search box that answered a Russian word by
rendering all 123 games as matches, a trophy case that took achievements back off people as they
played, a leaderboard tab that wedged the page on a spinner forever, three games that scored zero.

The harnesses missed them because a harness tests what somebody already thought of. Two of them
were green **on exactly the failing inputs**, asserting only that nothing threw. `CLAUDE.md`
already says a harness that only proves "no crash" is close to worthless; this branch is what that
costs in practice. The achievements harness was worse than that: it was green through all three
P1s because every section tested one layer above where the defects lived, over hand built facts
rather than over the rows those facts are derived from.

So: build the round, then review it as though somebody else wrote it and you suspect them. Then
check that the harness fails when you break the thing it claims to check.

---

*Written by the tablet lane session, 2026-09-12. The production numbers were measured on
2026-09-11. If you are reading this more than a couple of weeks later, re-measure rather than
trust them.*
