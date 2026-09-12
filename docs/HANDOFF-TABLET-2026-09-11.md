# Handoff, tablet lane, 2026-09-11

Written for whoever picks this up next, human or Claude, with no memory of this session.
Everything here is checkable: branch names, commit subjects, SQL you can re-run, numbers you can
re-measure. Where something is still open I say so plainly rather than leaving it implied.

**If you are a fresh session, read `CLAUDE.md`, `docs/SHIP-PIPELINE.md` and
`docs/PROJECT-STATE.md` first. This file is the delta on top of them.**

---

## 1. Where the work is

Branch: **`claude/douknowbll-spec-work-c3zcci`**, pushed. 19 commits ahead of `origin/main`,
34 files, roughly +4,700 / -655.

There is no open PR for it. The desktop lane's standing offer (recorded in `docs/WORKBOARD.md`)
is that the tablet lane pushes and the desktop lane merges and publishes, so the next step is
either opening a PR or telling the desktop lane the branch is ready.

The head of the branch as of this writing is `f23ff1cb`. Verify with `git log --oneline -3`
rather than trusting that, it goes stale the moment anyone pushes.

---

## 2. What is on the branch, round by round

Six rounds. Two of them are fixes to the other four, found by adversarial review, and that is
the most important thing in this document: **four of these six rounds shipped defects that the
build, the type gate and their own harnesses all passed.** Every one was caught by a review pass
whose only job was to disbelieve the code.

| Round | What it is | State |
|---|---|---|
| 526 | Sitewide search: `/search`, `src/lib/siteSearch.ts`, a generated keyword index, `simSiteSearch` | Shipped, then fixed. See below. |
| 527 | The profile achievement case: `src/lib/achievements.ts`, `AchievementCase.tsx`, `simAchievements` | Shipped, then substantially rewritten by Round 539. |
| 537 | The leaderboard's day ends at midnight Eastern, not 8pm, plus the Week and Month views | **Applied to the production database.** Frontend then rewritten by Round 540. |
| 538 | Gauntlet Draft: MLB, and the board lifted so four sports share one component | Shipped. |
| 539 | The Round 527 fixes. **Applied to the production database.** | Shipped, harness work still in flight, see section 5. |
| 540 | The Round 537 frontend fixes | Shipped. |

Round 537 was built and pushed under the label **528** and renumbered afterwards. The commit
subjects still say 528 and that is deliberate: the desktop lane's rule is that round numbers are
labels, and rewriting pushed history to fix a label is a bad trade. `docs/WORKBOARD.md` carries
the full account under the heading for that round.

---

## 3. The two production database changes, because these are the ones you cannot undo by reverting a branch

Both are in `supabase/migrations/` and both have been **applied to project
`flawuiqbvjobmkfkauhw`**. The files are the record; the database is the truth.

### `20260911_leaderboard_eastern_day.sql` (Round 537)

The shared leaderboard's "Today" was rolling over at **20:00 Eastern**, not midnight, because
`game_completions.completed_on` defaults to a UTC date and `global_leaderboard` filtered the same
UTC date. Writer and reader agreed with each other and disagreed with the rest of the site, where
74 files use `getTodayET()`.

Measured on production before it ran, not argued:

- 72,460 of 356,808 completions over 30 days (**20.3%**) sat under the wrong day. Grouped by
  Eastern hour the signature was exact: everything from 20:00 to 23:59 filed wrong, everything
  before 20:00 filed right.
- Sampled live at 23:48 Eastern: the board showed 111 players when 407 had played that day, and
  the day's real top three did not appear at all.
- A second bug found while fixing the first: the best per game per day grouping keyed on the same
  column, so one Eastern evening either side of 20:00 counted as two days and both day bests were
  summed. 1,087 of 19,799 player game days, inflating the all time board.

It rewrites `global_leaderboard` and `global_rank` to derive the Eastern day from `created_at` at
query time, adds `idx_game_completions_et_day_game`, and swaps the `player_ranks` materialized
view inside one transaction so nothing sees a missing view. **No stored row was rewritten and
`completed_on` and its default are deliberately untouched**, so history is corrected as well as
the future without leaving a column that means UTC before a date and Eastern after it.

### `20260911_player_game_days.sql` (Round 539)

Adds one read only function, `public.player_game_days(p_player text)`, returning one row per
distinct (game, Eastern day) for a player. Additive, reversible with a `drop function`, and it
touches no data. 11ms and 942 buffers for the heaviest handle on the site.

It exists because of the single most important correction on this branch, which is section 4.

---

## 4. The thing most likely to bite you next: game_completions is not a list of finishes

`recordActivity` in `src/lib/completions.ts` inserts a row **per Club Manager match** and **per
Soccer Career season**, not per session. Anything that counts rows in that table and calls the
answer "games played" is wrong, and wrong by a lot.

Measured on production, 2026-09-11, re-runnable:

- 376,818 rows collapse to **25,182** distinct (player, game, Eastern day) triples. A factor of 15
  site wide.
- The busiest handle's **6,440 rows are 49 real game days**. A factor of 131.
- Across all 6,981 handles that have ever played, in game days: median 2, top twentieth 14, top
  hundredth 28, top thousandth 59, and the deepest handle on the site has **121**.
- Other ceilings worth knowing: 43 distinct days played, 53 different games, 43 days on one single
  game, 36 different games in one day.

Round 527 counted rows and handed out a legendary trophy for "Finish 1,000 games", which was
reachable off a single Club Manager save. Round 539 fixed it by counting game days and rescaling
every threshold to the measurements above.

**`src/lib/badges.ts` still counts raw rows** (capped at 500) and was not touched. It is the same
defect in a second place, which is exactly the Round 426 pattern CLAUDE.md warns about. It is a
real open item, listed in section 6.

---

## 5. What is in flight and not finished

**`scripts/simAchievements.mjs` is being extended and that work is NOT on the branch yet.** A
background agent was asked to close the two gaps the review found in it:

1. Monotonicity is tested over hand built facts, one layer above where the bug was. It needs a
   section that appends rows and asserts the earned set only ever grows across
   `buildAchievementFacts` itself.
2. The read only claim is checked by grepping two files for write verbs. The actual write was one
   call deep and invisible to that. It needs a recording `localStorage` and an assertion that
   `loadAchievementFacts` writes nothing.

Both need negative controls, per the house rule. If that work landed, you will see it in
`git log`. If it did not, **do it before this branch merges**: the harness currently passes on
code whose defects it cannot see, which is worse than no harness.

Note the harness's inverted control convention: with `SIM_ACH_CONTROL` set, exit 0 means the
control FIRED and exit 1 means it did not.

---

## 6. Open items, honestly listed

Nothing here is blocking a merge in my judgement, but nothing here is done either.

1. **`src/lib/badges.ts` counts raw rows.** Same defect as section 4, second location. It should
   read `player_game_days` too. It also issues its own 500 row select on every profile view
   alongside the achievement read, so fixing it also removes a duplicate query on the table
   Round 370 exists to protect.
2. **The NHL gauntlet draft is deliberately not built**, and the measurement is why. The pool in
   `src/data/nhlPerfectLineupPool.ts` is 58 players. With five cards dealt a slot and nobody dealt
   twice, the top card in the goalie and left wing slots is the same player nearly every day, and
   `runGauntlet` is deterministic in the squad, so over 600 drafts the always best card six is
   only **2 distinct squads** against the NBA's 171 and the MLB's 600. Perfect play took the
   trophy 0 percent of the time where random play took it 3.7 percent, which is indefensible.
   Letting wingers play either wing moved it to 6. **It is the pool, not the ladder and not the
   shape.** Widening that file is its own round and it improves Perfect Lineup: NHL at the same
   time.
3. **The Today rank card and the Today board disagree for a few minutes after midnight.** The card
   reads the cron refreshed `player_ranks` view, the board is computed live. Measured at 00:47
   Eastern: 19 players in the cache against 20 live. So a player who just finished their first
   game of the day can appear on the board while their own card says no points yet. Pre-existing,
   not from this branch, but it now sits next to copy that says the board resets at midnight
   Eastern.
4. **`simSiteSearch` section 3's top 5 floor erodes as games are added.** It is at 86.2% against a
   floor of 80, down from a documented 87.6% at 121 games, because each new "Guess ..." game
   dilutes it. It will go red on growth rather than on a bug.
5. **Ten Codex branches, `origin/codex/round-526-*` through `round-535-*`, carry the same round
   numbers this lane and the desktop lane are using.** None is an ancestor of `main`. Before
   anyone merges one, read the numbering note at the top of `docs/WORKBOARD.md`.

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

Controls, which are the part worth actually running, because a harness whose control does not fire
is green for the wrong reason:

```
SIM_SEARCH_CONTROL=catalogdump node scripts/simSiteSearch.mjs
SIM_GAUNTLET_ENGINE_CONTROL=badscore node scripts/simGauntletEngine.mjs
SIM_GAUNTLET_ENGINE_CONTROL=flatdeal node scripts/simGauntletEngine.mjs
SIM_GAUNTLET_ENGINE_CONTROL=blindload node scripts/simGauntletEngine.mjs
```

Every one of those was verified firing in this session. A bogus control name must exit 1.

**Not yet run on this branch:** the 15 built site fences (`simAdsense`, `simBrand`, `simHeadTags`,
`simHiddenPages`, `simHubs`, `simIndexNow`, `simIndexing`, `simInternalLinks`, `simNoRivalNames`,
`simPrerender`, `simPrerenderBoot`, `simRetiredRoutes`, `simSchema`, `simSitemap`,
`simSnapshotAssets`) after a full `build:seo`. Round 538 adds a route (`/mlb-gauntlet-draft`), so
that suite has to run before this ships, and per CLAUDE.md it must be **all** of them rather than
a hand picked few. `npm run build` alone is green.

**Also not run:** the browser sweeps (`scripts/sweepGames.mjs`, `scripts/playGames.mjs`). Use
`ENGINES=chromium`.

---

## 8. The one habit worth carrying forward

Four of the six rounds on this branch passed `tsc`, passed `npm run build`, and passed their own
harnesses while carrying defects a user would have hit: a search box that answered a Russian word
by rendering all 123 games as matches, a trophy case that took achievements back off people as
they played, a leaderboard tab that wedged the page on a spinner forever if you clicked away too
early. Every one was found by a separate pass that started from the assumption the code was wrong
and went looking for the specific input that proved it.

The harnesses did not catch them because a harness tests what somebody already thought of. Two of
them were green **on exactly the failing inputs**, asserting only that nothing threw. CLAUDE.md
already says a harness that only proves "no crash" is close to worthless; this branch is what that
costs in practice.

So: build the round, then review it as though somebody else wrote it and you suspect them.

---

*Written by the tablet lane session, 2026-09-11. Numbers in section 4 were measured against
production the same day and are worth re-measuring rather than trusting if you are reading this
more than a couple of weeks later.*
