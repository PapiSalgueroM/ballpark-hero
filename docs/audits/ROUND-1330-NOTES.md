# Round 1330 notes: the Soccer Career page lands on your player, the save fence bound, toasts and the action bar

Branch r1330-sc-landing, started on origin/release-bc-gate c5fc5470 (Release BB plus the Release BC join).
Brief: C:/Users/antho/dukb-handoff/2026-10-10/briefs/brief-1330.md. Every heavy check ran on a GitHub runner
(rc.sh); the result names are given beside each number.

## What changed
- src/hooks/useSaveFenceWatch.ts (new, generic): `{ moved, check }` over Round 1323's fence; one listener for a
  storage event on the fence key or a clear, pageshow, and the tab becoming visible. No adopt, release or write.
- src/pages/SoccerCareer.tsx: adopt before the save is read (never released, the reason beside it); the save write,
  New Career's removal and Delete unusable save go through `saveFence.write`; a refused write ('moved') shows the
  lazy SaveMovedNotice and writes nothing; `toast.dismiss()` once the page is stale; Begin Career lands on the player
  card through useArrivalTop (keyed "begin-" plus a count, so New Career then Begin lands again); the name wraps under
  480 px; the youth and playing bar loses its Retire (the header's "🚪 Retire" stays); every phase's bar fits 320
  (under 400 px the AGE tile is narrower; under 360 px gaps, padding and labels step down one size and the decorative
  chevron goes; no label is cut or renamed, one row); the retired screen has no Weekly Wage tile; the page's 17 toast
  calls take `{ position: "top-center" }` (the sixteen of the brief plus New Career's new refusal toast, whose words
  are Delete unusable save's); one help rule; no "Joined X!" toast (below).
- Tests: soccerCareerSaveFence.test.tsx and useSaveFenceWatch.test.tsx (new); soccerCareerSaveRetry.test.tsx (removes
  narrowed to the save key with a fence key check at 127, 135, 144 AND the reset case's removes list at 169, plus the
  toast assertion at 132, which now carries the option); soccerFarewellPage.test.tsx 264; soccerTransferBriefPage
  .test.tsx 199.
- Harnesses: simSoccerCareerSaveRetry (five anchors moved to the fenced code, same meaning), simSaveFence (the soccer
  writer list and SAVE_FENCE_CONTROL=rawsoccer), playTwoTabs (cases 10 to 14, nofence covers 10, 11, 12, 14),
  playSaveKeeper (one KEYS_ADDED_ON_PURPOSE entry), playSoccerLanding (new), simStorageWrites (one NOTHING_HELD entry:
  the soccer save's inner write answers false and the page keeps it as saveFailed, already OWED; not in the brief's
  list, needed because the refusal ledger names every function whose catch answers false).

## Base measurements (c5fc5470)
- Weight (r1330-s1): /soccer-career 828.2K over 47 files against its 829K row.
- simCreation red on the base with "a full career save is 73.8 KB, over the budget"; the same single line on head.
- simTransferBriefPageControl exits 0 on head and base; runAllSims calls it EMPTY on both (one printed line).
- simCompletionSlugs, simLeaderboardCaps, simDailySaveHardening, simReportRelay red on head AND base
  (r1330-f-node, r1330-f-fbase): the runner blocks the live database.

## The "Joined X!" ruling
The walk's picture of head 8efb9c82 at 320 (r1330-s5b, head-320x640-landing-0.jpg and -1.jpg) shows the top centre
"Joined QPR Youth!" toast over the player's avatar and name at the landing, and the walk measured the next top centre
toast, "Signed with QPR!", settled over the name heading at 320, 390 and 1280 (r1330-s6a joined-before-drop). So it
is dropped. The hub names the club inside the landing view at every size on head (r1330-f-land: QPR Youth at 258 to
275 at 320, 240 to 257 at 390, 221 to 236 at 1280). Open question recorded: two later runs of the same 8efb9c82 build
from a second worktree raised no Joined toast at all (r1330-s6b, r1330-f-land joined-at-landing), while the #!serve
build of the same commit did; not chased further because the toast is gone.

## Weight (decision 6): OVER THE ROW, for the lead
Head 829.6K over 48 files against the 829K row (sweepWeight rounds to 830 and fails), r1330-s6a and r1330-s7w.
Chunks against the base (r1330-s6c): SoccerCareer 395.09K to 395.68K (+0.59K: the fence calls, the watch hook,
the lazy notice, the help rule, the bar classes); the base's shared clubManagerUclGroups chunk (1.21K) is now named
saveFence and weighs 1.61K (+0.40K, the fence module joins it); useArrivalTop is new to this page (+0.40K). The
help rule was shortened and the watch hook given one listener (8929241c): 0.03K. No budget row was edited.
