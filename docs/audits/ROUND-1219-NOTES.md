# Round 1219 notes: a put back that survives, and a copy before a game refuses or replaces an old save

Written 2026-10-10 by the builder of the desktop Claude lane, branch `r1219-save-keeper`.
This is ROUND A of the save work. The file format, download, restore from a file, the panel and
the policy line are Round B and none of them is here.

## What was wrong (measured before anything was fixed)

Round 958's card offers a kept aside save back with "Put that save back". It swapped the two
saves in the open page and then loaded the game. `scripts/playSaveKeeper.mjs` pressed that button
in a real Chromium with a game in the page's memory, on a build whose source was origin/main
`09df145a` (remote check `r1219-s0a`): **6 of 6 walks lost the save that was put back**, on
`/stadium-tycoon`, `/wonderkid-factory` and `/idle-arena` at 390 and 1280. The save was in NO KEY
afterwards. The key's history read `x' A' x' x'`: the swap wrote the old career (A) under the open
page and removed the backup it came from, then the game's own leaving writes landed on top.

Those three games make a fresh game when they open with no save and write it with no press, so
this is the headline flow of Round 958 itself: page broke, Start a fresh game, later Put that
save back.

The grown walk (remote check `r1219-walk1`) then put real engine saves on all 21 routes and gave
Hall of Champions a catalog to open with. On the build of origin/main the save was lost on FIVE
routes, in every walk there: `/club-manager`, `/stadium-tycoon`, `/wonderkid-factory`,
`/hall-of-champions`, `/idle-arena`. They are the five long games that write their in memory game
as the page leaves. The other sixteen survived on main. (Soccer Career on main shows the put back
save's exact bytes in no key, because the game saves it again in its own shape as it loads and
main removed the backup; the save IS the game on screen there, so that is not a loss and the
walk's verdict says so.)

## What changed

- `src/lib/saveKeeper.ts` (new). A put back is STAGED (one journal record under
  `dukb-save-pending`), the page is replaced by a full load of the game, and the swap is made by
  `runSaveKeeper()` in `src/main.tsx` before React mounts, when no game is in memory. There is no
  path that applies under a live page, on any route.
- `src/lib/brokenSaveRecovery.ts`: `copyAside` is exported (the first half of `moveAside`, which
  is now `copyAside` then remove). No existing export changed what it does.
- `src/components/BrokenSaveRestore.tsx`: the button calls `restoreNow` then `reopenGame`
  (`location.replace`), the card says once what the load did, and a backup that is exactly the save
  being played is not offered.
- `src/main.tsx`: one import, one call, before `installTranslateGuard()`. The first import is
  untouched.
- `src/test/saveKeeper.test.ts` (new, 26 cases), `src/test/routeErrorRecovery.test.tsx` (the put
  back cases, plus three new ones).
- `scripts/lib/realSaves.mjs`, `scripts/simSaveKeeper.mjs`, `scripts/playSaveKeeper.mjs` (new).
- One What's New entry.

## Decisions the builder made (the lead may overrule any of them)

1. **The outcome is held in memory, not in storage.** The card that shows it mounts in the same
   page load that applied the journal, so there is no outcome key and one write fewer.
2. **The backup a put back came from is never removed** (the critic's correction 15). So that a
   put back at the cap still deletes nothing, a backup that is byte equal to the save now at the
   key does not count toward the three a game keeps, and the copy just made is never dropped. A
   game can therefore hold four: three and the one that equals the save being played.
3. **The card stays quiet about the game already being played.** When the newest backup IS the
   save now at the key, the apply marks it answered, and the card also skips any backup equal to
   the save at the key.
4. **The quiet copy at boot** is made for any version that is not the current one (older, and
   newer too: a tab on an older cached build meets a newer save and would start over), only on the
   six games that act on their version. It never prunes (it is exempt from the cap: nobody
   pressed anything), and it is marked answered so the card does not offer back a save this build
   would refuse again.
5. **A journal is good for five minutes.** Older, or stamped more than a minute in the future,
   and it is removed with nothing changed; the card says the page took too long.
6. **One crash point answers "nothing changed" and is applied by the next load anyway**: the
   store dies between the journal's write and its read back, so the record cannot be taken back
   out. Nothing is lost there; it is recorded in the unit test's loop (`refusedYetLanded`).
7. `restoreBackup` stays exported. The card no longer calls it; its unit tests and the walk's
   `inplace` control do. It must never be called under a live game again.

## What this round does NOT do (no copy anywhere may say otherwise)

- It does not make a save impossible to lose. Eleven of the 21 games hold no version in their
  save, **Soccer Career among them**, and change their saves by repair on load: they get no copy
  before an update. Owed to the other lane, listed and not written: a version field in Soccer
  Career's save (their file).
- Club Manager's parked manager slots (`dukb-cm-slot-N`) and the tycoon pair's shared ledger
  (`tycoonRewardsV1`) are not looked at.
- A second tab with the same game open can still write over a save that was just put back. The
  backup it came from is kept for exactly that reason.
- Two tabs booting in the same moment can both apply one journal and leave two copies of the
  same save. Storage has no lock that can be taken before React mounts. Known, not fixed.
- Headless Chromium does not exercise the back and forward cache, so "replace, not assign" is
  held by reading the code only. Only Chromium was walked.

## The version table, and what "no number" means

`SAVE_VERSIONS` in `src/lib/saveKeeper.ts` has ten rows. What each game does with a number other
than the one it writes, read in the engine and held by `scripts/simSaveKeeper.mjs` section 1
against each game's own loader where one is exported:

| Game | Where | Current | Oldest it opens | Another number |
|---|---|---|---|---|
| Club Manager | `saveVersion` | 3 | 3 | refuses (the save is treated as no save) |
| Rebuild | `v` | 2 | 1 | migrates 1 to 2, refuses anything else |
| Stadium Tycoon | `v` | 1 | 1 | refuses, then writes a fresh game over it with no press |
| Wonderkid Factory | `v` | 1 | 1 | refuses, then writes a fresh game over it with no press |
| Hall of Champions | `v` | 1 | 1 | refuses, then writes a fresh game over it with no press |
| Aussie Rules Manager | `version` | 2 | 2 | refuses |
| Idle Arena | `v` | 1 | 1 | ignores (the number is written and never read) |
| Fight Career | `st.version` | 1 | 1 | ignores (no pure loader exported: by reading) |
| Fight Gym | `g.version` | 1 | 1 | ignores (by reading) |
| Fight Promoter | `st.version` | 1 | 1 | ignores (by reading) |

The boot copy means something on the first six only, so only those six keys are read at boot.
A save with NO whole number at its path (older than the field, or damaged) is left alone: the
keeper cannot tell what it is, and the game's own loader decides. The other eleven games hold no
version at the top level or one level down; the harness fails the day one of them grows one, or
one of the ten changes its number, until the table says so. Club Manager's number now lives in
three places (`clubManager.ts` SAVE_VERSION, `clubManagerSlots.ts`, this table); the harness
holds this one to a real save.

## The proof (GitHub runner results; `git show origin/rc-results/<name>:summary.txt`)

- `r1219-s0a`: the loss on a build of origin/main's source, 6 of 6 walks.
- `r1219-s2`, `r1219-s3`: the type gate, the unit tests and the first asserting walk, step by
  step (the walk went from 6 LOST to 6 survived at the commit that wired the boot call).
- `r1219-sim1`, `r1219-simc`: `simSaveKeeper` all green on 84 real saves (21 games, 4 seeds) and
  its eight controls each FIRED. 777 crash points: 735 ended applied, 42 untouched, none lost a
  save, emptied a key or stacked a copy twice. An ordinary boot: zero writes in 7 storage calls,
  22 stored values byte equal, the keys read exactly the journal and six saves.
- `r1219-walk2`: the asserting walk green with its base arm. Branch 52 of 52 walks survived (8
  fresh, 42 planted over all 21 routes, 2 cross route); origin/main lost the save again on the
  five routes; journey K 27 keys on both builds, none added; the three walk controls FIRED
  (`inplace`: the cross route swapped under the open page loses the academy save, 2 of 2).
- `r1219-batA`, `r1219-batB`, `r1219-fin`: the batteries (the whole unit suite, the 24 rule
  fences, every harness that names a file this round edits with its controls, the browser
  harnesses on a served build).
- The boot pass costs, with the largest day one save of all 21 games held: 0.78 ms a pass in
  node; in Chromium at a 4x CPU throttle 1.9 ms a pass (first pass 4.6 to 5.6 ms); nothing
  measurable on an empty store. A played Club Manager save is about three times its day one
  size, so a player holding one pays more: about 3 to 5 ms on a slow phone.

## For the lead at the gate

- Redraw the saved page for `/whats-new` (`simPrerender` is red on this branch for exactly that:
  the saved page does not carry the new entry).
- `sweepWeight`: this round adds 1.5K to 1.6K of gzipped JavaScript to the entry every page
  loads (the keeper and the card; the swap must run before React mounts, so it cannot be a lazy
  chunk as it stands). On origin/main `09df145ab` the sweep is green with every row exactly on
  its budget, so thirteen rows cross by 1K or 2K: `/` 240.2 to 241.7 (budget 240),
  `/club-manager` 577.6 to 579.2 (578), `/soccer-career` 786.3 to 787.9 (786), `/stadium-tycoon`
  297.3 to 298.8 (297), `/wonderkid-factory` 271.1 to 272.6 (271), `/minefield` 289.0 to 290.5
  (289), `/footle` 345.1 to 346.6 (345), `/nfl-my-career` 468.1 to 469.6 (468), `/front-office`
  359.3 to 360.9 (359), `/soccer-grid` 313.1 to 314.7 (313), `/manager-hot-seat` 595.5 to 597.0
  (596), `/deadline-day` 605.6 to 607.1 (606), `/transfer-path` 373.6 to 375.2 (374).
  `/leaderboard` stays inside (248.3 to 249.8 against 266). Remote checks `r1219-fin` and
  `r1219-attr`. The budgets are yours.
- When this round and Round 1210 are both merged, Round 1210's `simStorageWrites.mjs` section 7
  needs two rows under NOTHING_HELD (measured, remote check `r1219-r1210`): the
  `brokenSaveRecovery.ts` entry's `write:moveAside` becomes `write:copyAside`, and a new entry
  for `src/lib/saveKeeper.ts` with `write:stageRestore` and `write:applyPending` (a put back that
  cannot be staged or applied changes nothing and holds nothing in the page).
- Gate lists: add `scripts/simSaveKeeper.mjs` (with its eight controls) and
  `scripts/playSaveKeeper.mjs` (it needs a build, Chromium, and for its base arm and journey K a
  build of origin/main: `KEEPER_BASE_DIST`; controls `inplace`, `tamper`, `extrakey`). After this
  round is on main the base arm has nothing to lose any more: point it at the commit before the
  merge, or run the walk without it.
- Owed to the other lane, listed and not written: no guide sentence is needed for this round
  (nothing a player does changed, the button is the same button). For Round B: a version field
  in Soccer Career's save.

## Things a later reader must not trust without checking

- The fixtures of the thirteen board wrapped games carry the board's opening values (a phase,
  zeros, nulls) as read on 2026-10-10. Only their top level KEYS are held to the writer's literal
  (read on the TypeScript tree). The engine state inside them is real.
- `settlePendingSaves()` is called by `restoreNow` before it stages (Round 1144's rule for a
  reload on the app's own account). `scripts/simStaleChunk.mjs` cannot see that call site (it
  reads `Footer.tsx` and `freshBuild.ts`); `src/test/saveKeeper.test.ts` holds it.
- Seen in the walk's screenshots, NOT changed: on a profile that has not answered the cookie
  banner, the banner sits on top of the kept aside card (it is portalled above everything on
  purpose, Round 117). At 390 the card's buttons are hidden behind it and the shorter outcome
  card is hidden whole; at 1280 the card's lower half is. The outcome has no timer, so it is
  there once the banner is answered. This was already true of Round 958's card.
- What the card offers after a quiet copy: nothing. The quiet copy is the newest backup and is
  marked answered, and the card only ever offers the newest, so an older backup the player never
  answered is held but no longer offered. The harness prints this in section 4.
