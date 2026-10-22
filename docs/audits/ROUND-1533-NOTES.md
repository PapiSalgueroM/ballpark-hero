# Round 1533 notes: NFL Front Office, fired is a chapter and not the end

Branch r1533-fo-gm-career, from origin/main 6d2d7a7d (BASE, Release BO recorded). Builder: session J.
Brief: C:/Users/antho/dukb-handoff/2026-10-10/briefs/brief-1533.md (section 0 binds), critic-1533.md.
Step order (critic correction 4, lead R1): 0, 0b, 1, 4, 5, 2, 3, 6.

## Step 0: the base run (no src file outside the new test and its fixture)

Runner result r1533-s0a on BASE 6d2d7a7d (request 631adb91):

| check | exit | closing line |
|---|---|---|
| tsc | 0 | |
| simGmXp | 0 | all checks passed |
| simGmDeskHost | 0 | all 10 checks passed on seeds 1,2,3 (4 engines, 3 seasons a seed) |
| simGmSeat | 0 | all checks passed (101 s) |
| simNflGmDesk | 0 | all seven checks passed (10 seeds x 10 seasons) |
| simGmReload | 0 | all green |
| simCollegeSeat | 0 | all sections green (S1 to S9 and SY), 209 s |
| vitest gmDeskHost.test.ts + GmCareerDesk.test.tsx | 0 | |
| vitest FrontOfficeOnePress.test.tsx | 0 | |
| vitest FrontOfficeSeasonClose.test.tsx + gmXp.test.ts | 0 | |
| simSessionMarks | 0 | green |
| simHarnessAnchors | 0 | green |
| simGmStaff | 1 | GM STAFF: 40 failure(s); first: "Arsenal natural: line 5 of 81 differs" (recorded red on main, Club Manager) |

Browser walks on BASE (playFoHub, playOwnerMandate, playGmPress, playFrontOfficeGameDay) wait for Round 1535 to
close (lead R2): its helper is merged before any walk of this round runs.

Recordings, runner result r1533-s0b on eda10277 (step 0's own commit, no src line changed but the new test file):
- simGmCareer section 1 recorded twice in two processes (record-a, record-b, exit 0, 10 s each): 10 seeds, 48
  seasons (seed 7 fired after season 3), one digest 01d932fd8b0b7c3df6ef50b600d6f0359f3e72c9; the two files are
  byte equal (cmp). Committed as scripts/data/gmCareerFixture.json.
- FrontOfficeGmCareer.test.tsx 'the default path' recorded twice (board-a, board-b, exit 0, 7 tests): 6 cases,
  13 to 15 checkpoints a case; the two files byte equal. Committed as FrontOfficeGmCareer.fixture.json beside it.
- tsc exit 0 on that commit.

THE MEASURING RUN on BASE (simGmCareer section 4, runner r1533-s0b label measure, exit 0, 77 s): 20 seeds x 12
seasons, every club graded as a GM's club, the clubs' CPU moves standing in for a GM's:
- 475 firings. First out of work screen: offers 192 (40.4%), quiet 228 (48.0%), closed 55 (11.6%).
- Of the screens with offers, last calls: 32 of 192 (16.7%).
- Re hired within three feeds (377 firings with two seasons left to read): 209 (55.4%).
- So more than 1 in 10 real firings opened on a closed screen; the first call (lead R3) is built regardless.

## What a later session must not trust
- Nothing past step 0 is built yet.
