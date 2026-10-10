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
