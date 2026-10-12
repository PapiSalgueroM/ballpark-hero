# Round 1319: the combine you run, part A (the engine, nothing a player sees)

Branch `r1319-us-combine-a`, base `origin/main` 48cb9d4b (Release AY). Built 2026-10-12 by the desktop
Claude lane (session H's workflow). Brief: dukb-handoff/2026-10-10/briefs/brief-1319.md (its section 1
binds, the critic's corrections in its section 2 bind where section 1 says so).

This is ROUND A of the critic's split (its item 18): the showcase grade lifted so that a number from a
player's own hands can feed it, the stations each sport offers (plain names, plus the NHL `now` pair
audit row 65 backs), the played path (open, resolve, settle, the cuts, the curves), the reload rule that
hands an unfinished attempt to the scouts' keyed draw, and the measurement of what hands are worth
against that draw. Nothing in the product can open an attempt yet: the guard in preDraftShowcase and
the settle in the loader are new code that runs on every load but is INERT, because no screen writes
`combine`. Round B (the next number) puts the tile, the stations dialog and the walk on this head.

## Step table

| Step | What | Head | Runner result | Read |
|---|---|---|---|---|
| 0 | notes, collision diff, readers, baseline on the base | 48cb9d4b (base) | `r1319-s0`, `r1319-s0loop` | below |

## Step 0: the baseline on the base (48cb9d4b), measured on GitHub runners

- `simCareerPreDraft` seed sets a to e (remote check `r1319-s0`, three at a time): each ALL GREEN,
  exit 0, 2 s each on the runner.
- The two pre draft steps of `.github/workflows/prospect-journey.yml` copied as written and timed
  (`r1319-s0loop`, one at a time): `simUsCareerProspect` 36 outcomes and its 15 controls each
  "4 named assertion failures and 4 independent legacy passes", 60 s in all; the vitest
  `careerPreDraft.test.tsx` 26 passed, the default run ALL GREEN in about 1 s, and the 14 controls each
  exit 1 with "control X: mutated" and "FAILURE(S)" (randomteam 24, flatstock 24, flatlottery 4,
  mathrandom 10, cardwords 16, showcasewords 16, erarule 2, ceiling 16, ladderskip 4, undraftedtop 6,
  squeeze 32, laterlottery 4, flatlater 4, loadershallow 1), 24 s in all. The whole of both steps:
  84 s, against the job's 60 minute limit.
- The three receipts of `simUsSeasonCentre` (US_SEASON_DIGEST=compare, receipts law, lay and seam):
  each exit 0, "11 digests, 0 moved" on the base. They are in no gate. This round edits the NBA and NFL
  descriptors, so a compare on this head is expected to exit 3 ("inputs moved under the digest"):
  never re-recorded here.
- Weight on the base, a served build (`r1319-s0`, the probe measures the way sweepWeight's section 1
  does: iPhone 13, load plus 1.5 s, gzipped): /nfl-my-career 483.4K over 47 files (sweepWeight: 483K
  against its 485K row, green), /nba-my-career 568.9K, /mlb-my-career 556.8K, /nhl-my-career 559.3K.
  The engine and the descriptors ride in the shared chunk usCareerSeasonReview (147.6K) on all four.

## The collision diff and the readers (at 48cb9d4b)

- `git diff --name-only origin/main...<branch>` over the round's files, on all 274 origin branches named
  r13*, release-a*, release-b* and codex/*: none touches a file of this round.
- Readers of the five lib files and of the harness in scripts, src/test and .github:
  prospect-journey.yml; scripts/data/careerPreDraftDigest.json and the three usSeason*Digest.json
  receipts; playDraftNight.mjs; qa/career993.mjs; qa/usCareerSaveRecovery1084.mjs; simCareerPreDraft;
  simNflTruth; simUsCareerProspect; careerDraftNight.test; careerPreDraft.test;
  usCareerDraftNightBoard.test; usCareerProspect.test; usCareerSaveRetry.test.

## Owed to Round B (by number, in full)

(filled in below as the round goes)
