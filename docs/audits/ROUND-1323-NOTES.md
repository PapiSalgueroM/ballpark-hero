# Round 1323: one tab wins

Branch `r1323-save-fence`, base origin/main `8fea14e2` (Release AY plus the board claim). Brief:
`C:/Users/antho/dukb-handoff/2026-10-10/briefs/brief-1323.md`. Closes cm B1 (a stale tab wipes the other tab's
matches), cm M1 (a stale tab replays a finished match and swaps its result), cm m16 (a damaged save drops the
player on the picker with no word) and the first half of gm POLISH 24 (Hot Seat's carry on lands one press short).

## What changed

- NEW `src/lib/saveFence.ts`. Generic, no imports. Every write of a fenced save moves a generation kept in its own
  key, `dukb-fence:<saveKey>`; the save's bytes and shape do not change. A page adopts the generation before it
  reads the save and writes only while the stored generation is still the one it holds. A page that never adopted
  writes as a claim (moves the generation, checks nothing, never starts holding). An absent or unreadable fence
  value is never a move. A fence write the browser refuses never stops the save; a save refused after the fence
  moved puts the fence back. It is not a lock (one storage call wide window, said in its header).
- The page fence works over `window.localStorage`. In a node sim with no window it has no store and every write
  goes straight through, byte for byte as before. That is a deliberate change from the brief's "the sims' stub
  stores": `scripts/simClubManagerSlots.mjs` (not this round's to edit) pins the store to exactly one key in its
  section 4 and snapshots the whole store in section 3. `scripts/simSaveFence.mjs` plants a window to model tabs.
- Every writer of the Club Manager save goes through it: `saveCareer` and `clearCareer` (clubManager.ts, the named
  hunks only; the import sits beside saveCareer), the slot swap's SAVE_KEY step and `deleteSlot`
  (clubManagerSlots.ts), and through saveCareer Hot Seat's carry on (managerHotSeat.ts is not edited). The writes
  inside the fence keep the names `saveCareer` and `switchSlot`, so `simStorageWrites` section 7 follows them to
  every caller that keeps the answer exactly as before (no list entry was changed).
- The hook: adopt at boot before `loadCareer`; a refused write because the career moved sets `saveMoved` (never
  `saveFailed`); the leave write is refused by the fence; unmount writes last, then releases (a stale page only once its
  unmount is over, see the review fixes below); a new effect in EVERY
  phase listens for storage events on the fence key, `pageshow` and the tab turning visible. Round 928's
  `holdsActiveSlot` layer stays.
- NEW `src/components/SaveMovedNotice.tsx`, generic: a fixed alertdialog portalled to body, everything else inert,
  focus on Reload, no animation, no key reaching a window listener behind it, named by its words. Mounted lazily in
  ClubManager.tsx in one hunk after the save failed banner (the lazy line beside 49), with the
  words "This career moved on in another tab. Reload to carry on."
- Damaged saves: the boot lands on the managers screen when a slot is unreadable; the tile says it can be cleared
  and a copy is kept; Clear sets the bytes aside through `setAsideSave` before `clearCareer` (no room: nothing is
  cleared and the screen says so). loadCareer repairs a budget that is not a finite number (a number spelled as
  text keeps its value, anything else is 0), a squad under 11, too few to name an eleven (`ensureSquadCoverage`, then `ensureRoles`) and XI
  ids that name nobody (only those slots, by `autoPickXI` over the unused men).
- A NEGATIVE budget is NOT repaired: `startNextSeason` clamps one with `Math.max(0, career.budget)` (19939 on
  the base) and `realCapForBudget` with `Math.max(0, budget)`, so the engine itself expects a negative (the fixer
  found no debit of today that can write one: every one checks the kitty first; an older or hand edited save can). The
  "£0k" display it gives is for the lead to rule into F2 or F3.
- Carry on landing: `markLandOnHub` (src/lib/clubManagerLanding.ts, sessionStorage, one shot) is written by CarryOnCard
  just before the page changes; the boot takes it and opens the career on its hub.
- Help: one appended block "One tab at a time" with a worked example. What's New: one entry, October 2026.

## Proof (runner result names; full logs: `git show origin/rc-results/<name>:logs/<label>.log`)

- r1323-s1 (6f009411): tsc 0, vitest saveFence 0 (10 tests), simStorageWrites 0.
- r1323-s2 / r1323-s2w (516a56a8): simSaveFence 0; controls nofence and rawwrite exit 1 and FIRED; simClubManagerSlots,
  simManagerAppealIsolation, simClubManagerSave, simClubManagerSaveSize, simManagerHotSeat, simDailyDeals,
  simDeadlineDay, simManagerMatchPlans 0; walks playClubManagerSlots, playClubManagerSaveLeave, managerMatchPlans1079,
  playStorageBlocked (826 checks) 0. simStorageWrites 1 there (fixed in step 3).
- r1323-s3w (6932de59): playCmQuickSubs, playClubManagerSaveLeave, playClubManagerSlots, managerMatchPlans1079,
  playHomeFold 0; playSaveKeeper 0 with KEEPER_NO_BASE=1 (branch arm only).
- r1323-s4 (fc0569e5): simSaveFence fleet with FENCE_BASE=8fea14e2: 1458 saves, 0 in a repair condition, 1458
  faces (both saves' bytes and the draw count) equal to the base; 4 of 4 realSaves Club Manager saves written by
  the base open to the same JSON on head and base. fleet-loaddraw and fleet-repairall exit 1 and FIRED. tsc,
  vitest (15 files), simStorageWrites, simClubManagerSave, simSaveKeeper, simErrorBoundary, simClubManagerSlots,
  simManagerAppealIsolation 0; simCmLeagueBook with BOOK_BASE=8fea14e2 (default fleet) 0.
- r1323-walk2 (ed9e6ef0): playTwoTabs green at 320, 390 and 1280; controls nofence (cases 1, 2, 3, 6), nolanding
  (case 4) and nokeep (case 5) each exit 1 and FIRED.
- r1323-weight2 / r1323-final-f: sweepWeight green. /club-manager 590.3K (row 590; base 588.8K), /manager-hot-seat
  606.8K (row 607; base 606.1K), /deadline-day 616.7K (row 617; base 616.2K). The carry on mark sits in its own
  `src/lib/clubManagerLanding.ts` because in clubManagerSlots.ts it put /manager-hot-seat at 607.6K (red).
- r1323-final-a (ed9e6ef0): simCmLeagueBook with BOOK_BASE=8fea14e2, default and full fleets, SEEDSET 0 to 4: all
  green; vitest over every Club Manager, Hot Seat, fence and keeper unit file: 35 files, 424 passed.
- r1323-final-d found a real defect: harnesses that copy clubManager.ts into a temp folder resolve only the @ alias,
  so a relative './saveFence' failed to build there. c4314ed0 imports '@/lib/saveFence' in both files.
- r1323-final-e and r1323-final-f (c4314ed0, the last code commit): tsc, simCmRealFixtures plus
  playCmRealFixtures, simClubManagerSlots and its six controls, simManagerAppealIsolation, simSaveFence with
  FENCE_BASE, playTwoTabs, sweepWeight, playClubManagerSaveLeave, playClubManagerSlots: green.
- Red on head AND base with the same first line, not this round's: simActivityNotCompletion, managerWorldBrowser1077
  ("One auth startup storage probe"), simWritesAreSent ("could not drive Guess the Nation"). Environment only:
  simPrerender (needs build:seo), simSchemaNames and simLeaderboardCaps (need the live database).
- playSaveKeeper with a build of origin/main as KEEPER_BASE_DIST: journey K reports exactly one added key,
  `dukb-fence:dukb-club-manager-save`, which is this round's key by design; its five loss control FAILs need a
  build from before Round 1219. With KEEPER_NO_BASE=1 it is green. (Corrected by the closing fixes below: the
  gate's base is pinned before the keeper, so that red would NOT have gone away once on main.)
- The whole runAllSims does not fit a remote check (712 harnesses against a 70 minute command cap). Every sim
  that reads a file this round touched (135) was run instead: by name above, and 104 through runAllSims ONLY lists
  (r1323-sims0, -sims1, -sims2): all green except simGmCalendar, simGmDealTableFixture, simGmStaff and
  simCmQuickSubs (EMPTY), which are red identically on the base 8fea14e2 (r1323-cmp1), and simSoccerConquest
  (live database). simBracketMoment, red there for want of Playwright, is green in r1323-cmp1.
- Full report: C:/Users/antho/dukb-handoff/2026-10-10/results-g/finish-1323.md.

## Owed to the lead

- The manifest hashes of `scripts/fixtures/managerAppealIsolation1081/manifest.json` are retaken on this branch;
  the second of 1323 and 1326 to merge retakes them again (both edit clubManager.ts).
- `src/test/clubManagerSlots.test.tsx` had one assertion on the old confirm words ("no undo"), which this round makes
  false by brief; it now reads the new words. One line.

## Review fixes (2026-10-13, after review-run-1323 and review-read-1323)

- MAJOR, the stale tab's Back mid Play Live (both reviews): the hook released the fence at unmount, then the live
  viewer's own unmount write (Round 543's onMark) ran as a claim and put the stale career back over three matches.
  A page another tab has moved on now stays held through its unmount and lets go in a microtask, unless a page has
  adopted the save since (so a same document Hot Seat carry on afterwards still lands). playTwoTabs case 9 walks it
  (in by a link, Back mid Play Live and on the hub, then a carry on in that document). Proven by mutation on
  r1323-fx1: the old unconditional release clobbers ("week 0, 0 results, live minute 23"), a release before the last
  write clobbers on the hub too, and a page that never lets go refuses the later carry on; the head is green
  (r1323-fx2 walk9 at 320, 390 and 1280).
- MAJOR, the squad repair on an engine written squad: the line moved from under 14 to under 11. The engine writes 12
  (two loans in, loans out to the floor of 14, both loans broken). simSaveFence's fleet plays that squeeze (465
  saves under 14 men, every seed reaching it, all loaded byte for byte as the base does), with control squadline.
- MAJOR, weight: the notice is a lazy chunk (about 0.75K gzipped on its own); on a failed fetch the page reloads the
  site's way (reloadToRetryChunk), offline it stays put. Measured on the merged head: see fix-1323.md.
- Minors: a negative budget pin in the fleet (control budgetneg); the notice's accessible name and the key stop; the
  VAR line in ClubManagerHelp.tsx put back; the help example now says Reload opens the managers screen; the
  simSaveFence header carries its numbers.
- Merged origin/main 36cc9ffe (Release BB): What's New keeps both entries; the appeal manifest took main's pins and
  the two hashes this round moves were retaken in commits of their own after the runner proof.
- Full report: C:/Users/antho/dukb-handoff/2026-10-10/results-g/fix-1323.md.

## Closing fixes (2026-10-13, after the closing check verify-1323)

- playSaveKeeper journey K: the release gate runs it with KEEPER_BASE_DIST built from fb8d6811, a build from
  before the keeper that its base arm needs, so journey K compares every later build with that one for good. The
  fence key would have read as an added key at every gate, not only until main carries it. The key is now named in
  KEYS_ADDED_ON_PURPOSE in scripts/playSaveKeeper.mjs (exact name, with this round), every other added key still
  fails, and the new control KEEPER_CONTROL=extrafence plants a key with the same prefix that is not on the list
  and must fire. Proof on the runner: r1323-fz2a (the gate's recipe on this head, plus both journey K controls) and
  r1323-fz2b (the harness as it was, the same recipe: red on the fence key alone). Full report:
  C:/Users/antho/dukb-handoff/2026-10-10/results-g/fix2-1323.md.
- Not changed, by ruling: breakLoan has no squad floor (a 12 man squad loads as written; a transfer desk rule for a
  later Club Manager round); /club-manager's thin headroom (inside its row; re-measure on any join with 1325, 1326
  or 1328); src/lib/clubManagerLanding.ts stays a module of its own (only Club Manager files import
  clubManagerSlots.ts, so the mark there would pull that file into /manager-hot-seat).
