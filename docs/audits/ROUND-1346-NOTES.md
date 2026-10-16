# Round 1346 notes: retire from coaching, and the showcase Skip undo (NBA, NFL, MLB, NHL My Career)

Branch r1346-us-coach-retire, base origin/main d4f2c6f6 (Release BG live; src equal to bd3b6244).
Brief: C:/Users/antho/dukb-handoff/2026-10-10/briefs/brief-1346.md. Every gate below ran on a GitHub runner
(the lane's rc kit), never on the owner's PC. The four US My Careers share the coach career, the prospect
journey and the draft night, so each fix lands once for all four sports.

## The reports

- "Bug: No option to retire or autoretirement in Manager Mode" (/nba-my-career). The Round 126 coaching
  career had no ending: `CoachCareerState.done` existed and nothing set it. Now "Retire from coaching" ends it
  whenever the player chooses, behind the shared confirm. No age rule: the lead cut it (brief section 1,
  decision 1), because no other manager or coach career on the site ends at an age.
- "i accidentl ckilicke3d skipp". The one Skip on these pages that changes the career is the showcase's
  "Skip it" (draft stock -2, saved at once). It now has "Undo skip" until Draft day. Draft night skipped by
  accident can be watched again ("Watch it again").

## What changed

1. Engine (src/lib/usCoachCareer.ts, five hunks and no other line): `retireCoachCareer(prev)` returns
   `{ ...prev, done: true }` (pure, idempotent, no draw); a first body line in refreshCoachOffers,
   acceptCoachOffer, playCoachSeason and sitOutCoachSeason returns early on a done state. No new save field,
   COACH_SAVE_VERSION unchanged, ensureCoachCareer already read a missing `done` as false.
2. Confirm (USCareerActionConfirm.tsx): action 'retireCoach' with its copy in one table (title "Retire from
   coaching?", cancel "Keep coaching", confirm "Retire from coaching"); the one shot accept, the focus return
   and the trigger are the Round 886 code, unchanged.
3. Panel (CoachCareerPanel.tsx): the opener under the action card inside `[data-coach-retire]`; the done hub
   ("Coaching career complete", verdict, record, titles, win percent; the four tiles stay, The Market lists
   and never offers a Take button; no season, sit out, offer or retire button); CoachStartCard shows "Review
   coaching career" on a done career. `state.done` joined the reveal key, and the reveal now also runs on the
   first mount (skipFirst false) because the board opens the panel from the bottom of the long retirement
   screen: the walk measured the card 370 to 970 px above the screen before that fix (97ce2acb). A career
   retired before a first season reads "No seasons coached" on the done card, on the Coaching Log tile and on
   the log itself, never a 0-0 record at 0.0 percent (closing check); a live career's lines are as they were,
   which the US board fixture holds.
4. Showcase undo (careerPreDraft.ts, two new functions only): `preDraftCanUndoSkip` and `preDraftUndoSkip`.
   The skip draws nothing, so the undo is the pre skip state to the byte. Never offered after "Go all out" or
   "Play it safe" (they share one keyed grade; an undo would be a free re roll). DraftShowcaseCard takes an
   optional `onUndoSkip` (`[data-showcase-undo]`), ProspectJourney wires it through the board's
   advanceProspect, so it is saved like every other step and survives a reload.
5. Draft night replay (DraftNightSequence.tsx optional `onReplay`, ProspectJourney `nightRun`): "Watch it
   again" takes the skip's place in the same outlined box once the night is over; the card and the stage are
   keyed on the run counter so the rows and the held result arrive again. Not offered under reduced motion
   (the night starts on its last frame there). Nothing is saved. The three night buttons are min-h-11 (44 px).
6. Help: `US_COACH_RETIRE_HELP_RULE` (new src/lib/usCoachRetirement.ts) on all four pages' "?" with a worked
   example; one sentence each for the undo and the replay in the prospect journey's own help. One What's New
   entry naming the four sports.

## Bridges (existing harnesses that count or hash what this round touches)

- scripts/simUsCoachPoaching.mjs strips this round's five anchored hunks (scripts/lib/usCoachRetireHunks.mjs,
  each asserted present once in the LF text, a CRLF checkout being turned to LF first) before hashing the rebuilt
  engine; the pinned hash is unchanged.
- scripts/simUsCareerActionConfirm.mjs: CASE_COUNT 19 (was 18 in five places), `cancelBlock` anchors
  `{copy.cancel}`, the coach case joins the eight component controls' lists, and vitest's ANSI colour codes
  are stripped before the failure message regex (the `initial` control aborted on Linux on base d4f2c6f6 too).
- src/test/usBoardFixture.test.tsx: `[data-coach-retire]` in the two projection lists (lines 190 and 251).

## New harnesses

- scripts/simUsCoachRetirement.mjs: 300 careers per sport through the real engines, coached on a fixed
  policy; every state equals the BASE engine (rebuilt by stripping the five hunks, no sha needed) until the
  retirement, which adds only `done`; on every done state the four functions return their input with 0 draws;
  the coach vitest files under swaps. Controls early, drift, noretire, noguard, nosit, noaccept, norefresh.
- scripts/simUsCareerSkips.mjs: undo equals the pre skip bytes over every sport and era descriptor (16040
  states, 1099 of them clamped skips); the board cases under swaps; controls noundo, graded, leak, clamp,
  noreplay, motion.
- scripts/playUsCareerReports.mjs: walks W1 to W4 on NBA and NFL at 390x844 and 1280x800 on a served build
  with Supabase blocked; controls noretire, noundo, noreplay.

## Must not move, and did not

- simUsBoardParity (four sports replayed click for click, save for save, screen for screen): green.
- simCareerPreDraft section 9 (16 digests equal to the recording, not retaken), simUsCareerProspect (36 and 9
  unchanged: the undo case lives in src/test/usCareerReports1346.test.tsx), simUsCoaching, simUsCoachCareer,
  simUsCoachPoaching, simDraftNight, playDraftNight (49 nights), simNflTruth, playNflTruth, playHomeFold.
- No daily game imports a file this round edits. Old saves load unchanged (no write on load, board case).
- Route weight (static import closure minus the entry's, base d4f2c6f6 against head, gzip): NBA 305.3 to
  306.3 KB, NFL 226.3 to 227.3 KB, MLB 302.9 to 303.9 KB, NHL 303.4 to 304.4 KB, about +1.0 KB each.

## Owed (not this round)

- Guides (src/data/gameContent, the other lane's): no sentence of basketball.ts, football.ts, baseball.ts or
  hockey.ts mentions the coaching career, the showcase or draft night's skip, so none is false. Proposed
  additions are in the closing report.
- Soccer Career (correction 7): the wash card at src/lib/soccerCareerCorruption.ts:148 to 155 only sets
  `washArc` and adds heat, and nothing reads `washArc`. Not edited here.
- The US farewell card's "Your rating is down to N" (critic-1337 11(a)): not taken here.
- Round 1500: the dirty money desk, cut from this round by the lead.
- PR281 (codex/us-coach-retirement): its test file is on this branch byte for byte and all 14 cases pass, so
  it can be closed once this round is on main.
