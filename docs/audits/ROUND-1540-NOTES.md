# Round 1540: the NBA Front Office's earned draft, PART B (lottery night and draft night on the board)

Branch r1540-nba-draft-night, built on origin/r1321-nba-draft-earned-a (7a8750ba, Round 1321 PART A, closed and not on
main when this round started). Brief: dukb-handoff/2026-10-10/briefs/brief-1540.md (section 0 binds), critic:
critic-1540.md. Every heavy check ran on a GitHub runner through the lane's rc kit; the runner result names are below.

## Where it stands (keep current)

- Steps 1 to 3 (the split point, nothing a player sees) are done and green: the libraries' chances and knob lines,
  DraftNightCard's optional headline, the shared GmEarnedDraftScreen and its glue hook useGmEarnedDraft.
- Step 4 is done: scripts/simNbaDraftBoard.mjs sections 1 and 6, and scripts/data/nbaDraftBoardFixture.json recorded
  from 7a8750ba on runner r1540-s4 (90 plays), in its own commit, before the board changed.
- Step 5a (the board bind, NbaEarnedDraft.test.tsx, the desk's partial lines) is done and green on r1540-s5a and
  r1540-s5a-b, except one test line fixed after (see below).
- Step 5b (simNbaDraftBoard sections 2 to 5) is being made green: section 2's library replay disagreed with the board
  at the open on every night (r1540-s5b, r1540-s5b2); the first cause found was the replay starting from the raw save
  where the board's load path reconciles rotations (fixed), the next is being read with SIM_NBA_DRAFT_BOARD_DEBUG.
- Step 5c (simNbaGmDesk's desk on draft night is the earned night) is committed; its run on three seed sets, the
  base's numbers and all 18 controls is r1540-s5c.
- Not started: step 6 (the walk), 7 (guide sentence, frozen row, keywords, weight, final proof), 8 (What's New).

## What a later session must not trust

- A runner summary that says SETUP exit=1 right after a send: the request branch sometimes fires two workflow runs,
  the first is cancelled and publishes that line. Check the Actions API before reading it as a failure.
- simNbaDraftBoard section 1's fixture is BASE's (7a8750ba). It is never recorded again on a builder's own say.

## Facts read through for the brief

- "Every man taken 13th or later never grows past the rating he is drafted at": true. The only growth is
  nbaFrontOffice.ts `p.ovr = Math.min(p.pot, ...)`, and every man of an earned class is drawn at 66 or more, so
  latePot leaves pot equal to his rating. nbaEarnedDraft.test.ts holds the 66 floor over 200 classes with a control.
- A summer the desk refuses cannot be built from the engine (runDeskOffseason ends every man's case before it checks);
  NbaEarnedDraft.test.tsx (j) plants the state such a refusal leaves and presses the finish button.
- No new real world fact is typed: the fourteen club field, four draws, the table and the 2019 to 2026 span are each
  read twice on independent publishers in scripts/data/gmDraftOrderSources.json (realSpan's third read, Yahoo Sports,
  has been there since Round 1222; the 1321 notes' count of two reads was short).
