# Round 1540: the NBA Front Office's earned draft, PART B (lottery night and draft night on the board)

Branch r1540-nba-draft-night, built on origin/r1321-nba-draft-earned-a (7a8750ba, Round 1321 PART A, closed and not on
main when this round started), with origin/r1537-game-screen-fixes (8cca3b31) and origin/main (e3deb2cb, Release BO)
merged in. Brief: dukb-handoff/2026-10-10/briefs/brief-1540.md (section 0 binds), critic: critic-1540.md. Every heavy
check ran on a GitHub runner through the lane's rc kit. The full closing report, with every runner result, is
dukb-handoff/2026-10-10/results-g/finish-1540.md.

## Where it stands

- Steps 1 to 8 are built and pushed: the libraries' chances and knob lines, DraftNightCard's headline, the shared
  GmEarnedDraftScreen and useGmEarnedDraft, simNbaDraftBoard (six sections, twelve controls) with its fixture
  recorded from 7a8750ba, the board bind, NbaEarnedDraft.test.tsx (cases a to k), the desk's partial lines,
  playNbaLotteryNight (eleven sections, four controls), the guide sentence with its frozen row and keywords
  regenerated on a runner, and What's New.
- STOP for the lead (critic correction 10 c): simNbaGmDesk's desk on draft night on the earned night (822bd75d) turns
  check 2 red on all three seed sets, because PART A's one season minimum deal brings a second rounder up after one
  season and gmContracts.ts nbaRestricted needs full Bird rights. Reverted by 55aa1520; the numbers are in the report.
  Settled since by the lead's two rulings (the sections below): the replay is on the earned night and green.
- Owed to the release, never done here: the prerendered /nba-front-office page (build:seo), simPrerender, the weight
  row (measured +13.6K on the route, no row exists), the release join (1321 first, then this round), the adversarial
  review, dukb-qa-hunter and dukb-visual-qa.

## After the adversarial review (fixer, 2026-10-22)

- Both lenses (results-g/review-run-1540.md, review-read-1540.md) returned FIX on one major: the STOP above, which
  also makes two lines of the desk's rules card false (gmContractRules.ts 239 and 251). Still open, the lead's to
  rule; option (b) is measured in results-g/fix-1540.md (r1540-fix-m1b).
- Fixed, each with a check that fires: the help panel's way back in view (walk H, control backfold), the refusal line
  on every stage, the screen's lottery and finish lines handed in by the board, "an 8.2%" style articles, the copy of
  the league each press is handed and his board's order (NbaEarnedDraft.test.tsx case l), the What's New link, and
  walk J's measured headroom in its header. Left: the run card's "On the clock" kicker after the last pick (shared
  card, presenter round) and the lift's "no lower than" (gmLotteryNight.ts, must not touch).

## The lead's ruling on the held major (second fixer, 2026-10-22)

- Done on this branch: gmContracts.ts `nbaRestricted` treats a man this GM drafted, at the end of his first deal
  whatever its length, as restricted (the full Bird tier is no longer asked; `norfa`'s anchor text is unchanged and
  sits at line 317 now, the comment above it grew),
  with two non wiki sources read 2026-10-22 in its comment; the rules card's rookie scale line now says a second round
  pick signs a one season deal at the league minimum; nbaSignDraftee's comment says the same.
- Proven on runners r1540-rule-a and r1540-rule-b (head 82b60919): the old draft path does not move. simNbaGmDesk as
  committed (sets 1..10, 11..20, 21..30, controls norfa, shortscale, sheetrepick, coinflip), simGmContracts and its
  seven controls, simGmDeskHost and the NFL, NHL and MLB desks all print byte for byte what 7a8750ba prints.
- NOT delivered: simNbaGmDesk's desk on replay on the earned night (brief 0 R2). The 115 "is not restricted" failures
  are gone, but check 2 fails three floors measured on the old desk (sheets 26 / 18 / 17 against 34; gone and full
  draft copies 7 / 4 / 5 against 11). A STOP for the lead (critic correction 10 c). The harness change, header measured
  and control `fullbird` (115 failures, check 2 alone), waits on branch r1540-r2-earned-desk. Also found there: on
  about one stream in twenty a man let go on a sheet is at no club after the summer (the rival's waiver, likely).

## The lead's second ruling, items 6 to 8 (third fixer, 2026-10-22)

- Item 6, DONE: r1540-r2-earned-desk (923fbfbe) is folded in (a fast forward), so simNbaGmDesk's desk on draft night
  is the earned night the board runs (brief 0 R2 delivered). Check 2's three sheet floors are existence floors,
  re-banded by the ruling at half the smallest calibration set: sets 1..10 / 11..20 / 21..30 on runner r1540-f3-c
  measured sheets 26 / 18 / 17 and gone and full draft copies 7 / 4 / 5, so minSheets 8 (old desk 34), minSheetGone 2
  (11) and minSheetFull 2 (11); the held out set 31..40 clears all three (23, 7, 7). Check 2 prints the old floors
  beside the new ones; the ruling is in the harness header (b6547cda). Control fullbird (the old nbaRestricted) still
  brings the 115 failures back, in check 2 alone.
- Item 7, STOP FOR THE LEAD with the evidence: the vanishing sheet man is older code reached by this round. Traced on
  runner r1540-f3-a with debug prints: gmContracts.ts runDeskOffseason (Round 1018) puts a man let go on a sheet on the
  club written down even when the draft has taken it over fifteen (every arrival logged, 18 of 18 and 8 of 8, landed on
  a roster of 16 or 17 with him); the engine's summer (nbaFrontOffice.ts, Round 722) waives a CPU club above fifteen by its
  lowest rated man, which was he (a one season second rounder at 66 or 67); the pool keeps its best 30 (a cut older
  than Round 722: it has been in nbaFrontOffice.ts since the file's first commit, 7bb8c39d, 2026-08-11), so he left the
  league. Earned streams SIM_SEED 10..29 (runner r1540-f3-b): it happened on SIM_SEED 10 only; the old desk over
  SIM_SEED 1..30 never lost a man. Every fix point is outside this round (the engine is must not touch, and
  runDeskOffseason is shared by all four desks, so a fix there moves the old desk's byte equal proof), so nothing is
  changed. The NHL desk's summer has the same waive and slice shape and its harness never checks where a let go sheet
  man ends up: unmeasured, for the lead.
- Item 7, measured further after the third closing check (still NOT FIXED, still the lead's to rule; full report
  results-g/fix2-1540.md). How often, both kinds of check 2 line counted: 0 of 140 independent careers on the
  committed name (walk seeds 1..140; runner r1540-fx2-a ran 41..140); 3 of 59 fresh streams red (SIM_SEED 6 and 10 at
  seed 10 season 2, SIM_SEED 35 at seed 7 season 4, full draft copy only; runners r1540-fx2-a and r1540-fx2-c), so not
  one spot, about one ten season career in 240. A probe following every man let go on a sheet by id through the summer
  (runner r1540-fx2-b, positive control SIM_SEED 10 found both lost lines): the earned night's committed stream 14
  arrivals, all on a roster of 17, none lost; the OLD desk's committed stream (70593dd4's harness) 40 arrivals, 23 of
  them over fifteen, none waived, none lost; the NHL desk 7 streams, 178 arrivals, none over its limit, none lost; the
  NFL and MLB desks have no sheets. So a fix that makes room before he arrives would run on the old desk's stream
  (likely moving its byte equal proof), while one that only spares a sheet arrival from the waiver or the pool cut
  would, by inference, leave the old desk and the NHL streams as they are. The NHL is latent until its earned draft
  bind brings the same trigger.
- Item 8, the Arenas residual: reported in results-g/fix-1540.md, not changed (Round 1018's sheet rule, not this
  round's code; no card line claims the league's limit).

## What a later session must not trust

- A runner summary that says SETUP exit=1 right after a send: the request branch sometimes fires two workflow runs,
  the first is cancelled and publishes that line. Check the Actions API before reading it as a failure.
- simNbaDraftBoard section 1's fixture is BASE's (7a8750ba). It is never recorded again on a builder's own say.
- simNbaGmDesk measures the earned night since b6547cda; its green holds on its own committed stream. On about one
  fresh stream in twenty check 2 fails on "is at no rival club" (item 7 above, older code, held for the lead): a
  red there on a copy under another name is that, not a new defect.
- A harness copied under another file name walks another stream: seedRandom seeds Math.random from the file name.
  Numbers from such a copy are a fresh sample, never the committed harness's own.

## Facts read through for the brief

- "Every man taken 13th or later never grows past the rating he is drafted at": true. The only growth is
  nbaFrontOffice.ts `p.ovr = Math.min(p.pot, ...)`, and every man of an earned class is drawn at 66 or more, so
  latePot leaves pot equal to his rating. nbaEarnedDraft.test.ts holds the 66 floor over 200 classes with a control.
- A summer the desk refuses cannot be built from the engine (runDeskOffseason ends every man's case before it checks);
  NbaEarnedDraft.test.tsx (j) plants the state such a refusal leaves and presses the finish button.
- No new real world fact is typed: the fourteen club field, four draws, the table and the 2019 to 2026 span are each
  read twice on independent publishers in scripts/data/gmDraftOrderSources.json (realSpan's third read, Yahoo Sports,
  has been there since Round 1222; the 1321 notes' count of two reads was short).
