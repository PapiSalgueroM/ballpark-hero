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
- Owed to the release, never done here: the prerendered /nba-front-office page (build:seo), simPrerender, the weight
  row (measured +13.6K on the route, no row exists), the release join (1321 first, then this round), the adversarial
  review, dukb-qa-hunter and dukb-visual-qa.

## What a later session must not trust

- A runner summary that says SETUP exit=1 right after a send: the request branch sometimes fires two workflow runs,
  the first is cancelled and publishes that line. Check the Actions API before reading it as a failure.
- simNbaDraftBoard section 1's fixture is BASE's (7a8750ba). It is never recorded again on a builder's own say.
- simNbaGmDesk measures the OLD desk on draft night (stale on purpose, until the lead rules on the STOP).

## Facts read through for the brief

- "Every man taken 13th or later never grows past the rating he is drafted at": true. The only growth is
  nbaFrontOffice.ts `p.ovr = Math.min(p.pot, ...)`, and every man of an earned class is drawn at 66 or more, so
  latePot leaves pot equal to his rating. nbaEarnedDraft.test.ts holds the 66 floor over 200 classes with a control.
- A summer the desk refuses cannot be built from the engine (runDeskOffseason ends every man's case before it checks);
  NbaEarnedDraft.test.tsx (j) plants the state such a refusal leaves and presses the finish button.
- No new real world fact is typed: the fourteen club field, four draws, the table and the 2019 to 2026 span are each
  read twice on independent publishers in scripts/data/gmDraftOrderSources.json (realSpan's third read, Yahoo Sports,
  has been there since Round 1222; the 1321 notes' count of two reads was short).
