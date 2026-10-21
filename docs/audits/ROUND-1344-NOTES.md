# Round 1344 notes: Club Manager AI transfers, part A, step 1 (the measurement)

Branch r1344-cm-world-moves from origin/main d4f2c6f6 (Release BG live; src equal to bd3b6244). Step 1 only: NO
product code. The lead's brief (decision 2) stops the round here for rulings on save size, the world's shape and the
rule questions below. Every number was taken on a GitHub runner (remote checks named in brackets).

## What is committed
- scripts/lib/cmAiRecordProbe1344.mjs: a throwaway measurement probe, never composed by default, never product code.
  Nine anchored edits of src/lib/clubManager.ts that record the AI deals of the post seed flush, January and the
  summer through recordActualRosterTransfer (the hijack, the walk away and joinClubNow are not patched).
- scripts/simCmWorldMoves.mjs: sections 0 (anchors present on BASE), 1 (ownership, RED on BASE by design), 6
  (legacy; green by construction at step 1, not evidence) and 9 (the shape, printed, nothing asserted), plus
  --combine for the paired statistic and the control CM_WORLD_MOVES_CONTROL=seedless.

## Gates at step 1
- section 0: exit 0 (r1344-wm3). Section 1 on BASE: exit 1 in 2026-27, 2015-16 and 2005-06, as it must (r1344-wm,
  r1344-wm3). Section 1 with the probe: exit 0 in all three worlds (r1344-wm, r1344-wm3). Section 6: exit 0 in all
  three worlds; seedless control exit 1, FIRED, 18 failures (r1344-wm3).
- PR269's unit test (never committed; written from 1923d291 on the runner, blob sha256 0a40806a... equal at 2fa832ff):
  on BASE exactly its baseline, 4 missing fail, 4 preservations pass (r1344-szb); on the probe 6 of 8 pass, the
  hijack and the walk away still fail as expected (r1344-wm).

## Save size (season 15, budget 203,000) [r1344-szb, r1344-szp, r1344-szc]
BASE 186,495 to 201,112 over six streams; PROBE 191,625 to 206,555, over the budget on 11 of 18 rows (Everton 5 of
6, Lincoln City 6 of 6). Paired increase about +3,800 to +6,600 a row. Slope under the 2,000 cap on both. The
defect arm (uncapped), default stream: BASE 221,730 to 234,318, PROBE 227,507 to 239,176.
Slots (budget 532,500): BASE 506,031 to 510,811, PROBE 522,522 to 525,766 (green, headroom about 7,000 to 10,000).

## simCmLedgerBound [r1344-szb, r1344-szp, r1344-szc]
Records at season 15: BASE 34 to 38, PROBE 94 to 120 (6,349 to 7,841 units); slope from season 15 under the cap on
both. PROBE red on section 4 (5, deterministic: men I sold are bought on by an AI club while their deal with me
lasts) and, with other lines beside it, on section 1 (matchday time; green when rerun alone, ratio 2.3 to 2.9
against the 2.5 x + 5 ms limit).

## The world's shape [r1344-shape; the full table is the lead's results file finish-1344-shape.txt]
2026-27 trio (Real Madrid, Everton, Aberdeen), 15 seasons, seeds 1 to 10 against BASE on the same seeds, BASE
against BASE on seeds 11 to 20. Statistic: the mean of the paired per seed differences and its standard error, z
against BASE against BASE.
- each league's top five and bottom five: XI average unchanged (top five at season 10: -0.02, se 0.01, z -0.5;
  season 15: -0.05, se 0.02, z -1.2); surplus over the slot count +0.03 to +0.06 men a club; age unchanged.
- clubs that bought in an AI deal: +0.67 men a club over their slot count from season 5 on and flat (0.69, 0.67,
  0.68; z 14 to 25); XI +0.24 to +0.33; age +0.19 at season 15.
- clubs that sold: XI -0.22 to -0.33; a man short at season 5 (-0.36) then +0.16 at season 15.
- AI deals a window about 4.5 on both; ledger records +37, +67, +82 at seasons 5, 10, 15 (+2,392, +3,906, +4,858
  units); the market +1, +10, +19 men.
- the January entry (playNextEntry returning 'window'): 37.8 ms on BASE, about 255 ms with the probe (+217 ms, se
  8.8, z 24.5): over the 3 x + 5 ms rule the critic proposed (correction 20).

## For the lead (rulings owed before step 2)
1. Save size lever: a budget move by the header's recipe (the probe's healthy top 206,555, the defect's bottom
   227,507), or a compact store for AI records, or pruning, or AI moves kept as keys into the projection.
2. Shape: may part A ship without a shedding rule (buyers carry +0.67 men a club, flat; sellers recover).
3. A man you sold: may an AI club buy him while his deal with you lasts (simCmLedgerBound section 4 says no today).
4. The January entry time: record a window's deals with one compaction (the critic's correction 20) as part of 2a.

## Steps 2 to 6, after the lead's rulings (2026-10-16)
The rulings (dukb-handoff/2026-10-10/briefs/lead-rulings-1344.md): SIZE_BUDGET 214,000 by the header's recipe; part A
ships without a shedding rule (section 9 asserts the tiers and the buyers' surplus); an AI club never takes a man the
ledger holds from a deal of mine; one compaction a window; careers started before 13 October in a round of their own.

What changed in product code: generateHeadlines records every deal of a seeded career as it closes (a working copy of
the ledger, packed once a window) and skips a deal the ledger would refuse after its three draws; startCareer records
a fresh career's opening window once its seed is drawn; the hijack and the walk away record the rival's deal;
joinClubNow keeps the run in's ledger and this season's names of deals between other clubs; the screen's market
(marketForScreen) lists a man another club bought this season at his new club and every door refuses him until the
summer; loadCareer mends this season's missing moves of a seeded save inside its own fail safe; the dailies strip the
ledger with the seed. The two ledger writers gained an optional `pack` parameter (ruling 4).

Proof: scripts/simCmWorldMoves.mjs sections 0 to 8 and 12 (section 9 by --combine), every control firing;
scripts/lib/cmNoAiMoves1344.mjs, the bridge (four anchors); scripts/playCmWorldMoves.mjs, the walk;
src/lib/clubManagerWorldMoves.test.ts. The remote checks and every number are in the round's finish report
(dukb-handoff/2026-10-10/results-g/finish-1344.md). The step 1 probe was removed at step 2 (history: ee949025).

Where it stands (2026-10-16, end of the run): steps 2 to 6 done and proven on GitHub runners; origin/main 1027b08c
(Release BH) merged; the final proof on the merged head green (remote check r1344-fin3), the walk green (r1344-w4).
The lead's ruling 5 (careers started before 13 October brought into the living world at their next summer) is NOT in
this round: it needs the writer guard to accept a ledger with no seed and a ruling on what simCmUnseededWorld asserts
after an old save's rollover, so it is its own round. Retaken by decision 7: scripts/data/cmLeagueRulesDigest.json
(bridge leg green whole) and the 1081 pin (last). Fixture edits, each one line with a comment, where a new seeded
career's flushed ledger broke a "no ledger yet" precondition: clubManagerWorldRoster.test.ts, clubManagerOwnClubLevel
.test.ts, clubDetailCurrentRoster.test.tsx, clubDetailOwnClub.test.tsx (with its span in simClubDetailCurrentRoster),
simFreeAgents and simClubManagerSaveSize section 6. simClubManagerDecisions (the other lane's) loses three press cards'
coverage on the head (green on the base and with the bridge): owed to that lane.
