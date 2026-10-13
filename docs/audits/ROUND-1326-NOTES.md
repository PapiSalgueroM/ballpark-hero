# Round 1326: Club Manager says what it means (copy only, no draw moves)

Branch `r1326-cm-copy`, base origin/main `c9c77eba` (Release BB). Every check below ran on a GitHub runner
(the rc kit); the result name is the branch `rc-results/<name>`. Exit codes are the real ones.

| Step | Commit | Runner result | Exit codes | Controls | Notes |
|---|---|---|---|---|---|
| 0 base on file | c9c77eba | r1326-s0a, s0b, s0c, s0w | tsc 0, vitest 0; reds listed below | | 163 harnesses and walks |
| 1 the proof | 18069c90 | r1326-s1 | fleets A to D 0 (67 careers, no rewrite, draws equal) | draw 1 FIRED, word 1 FIRED | base against base |
| 2 articles | 836e8bb6, pin f28ea3c4 | r1326-s2a | tsc 0, vitest 0, simCmCopy 0, base 1 (162), copyonly A 0, B 0, rules base leg 0, head 1 (37) | article 1 FIRED | digest re-taken once for steps 2 to 5 |
| 3 to 5 drama, break note, staff | 6c0a8686, pin ea84ed63 | r1326-s5a | tsc 0, vitest 0, simCmCopy 0, base 1 (178), copyonly A,B,C,D 0, rules base leg 0, head 1 (63) | drama, intl, staff 1 FIRED | every rewrite fired |
| digest | 14b27ba4 | r1326-s5a legs | rules-write 0 | | 130 hashes, words only |
| 6 money card | cd5f2ee2 | (pending) | | finance (local FIRED) | |

## Red on the base c9c77eba before any edit (r1326-s0a to s0w), with the first failing line
- the live database, which the runner blocks: simWindow2026Bundesliga, simSchemaNames, simSoccerConquest,
  simLeaderboardCaps ("fetch failed")
- known red on main: simGmStaff (16, "Arsenal natural: line 5 of 81 differs"), simGmDealTableFixture (section B
  no longer replays), simGmCalendar (Everton seasonDays hash)
- the request's shape, not the code: simBracketMoment, simWritesAreSent, simResultMoment need Playwright (sent
  without #!playwright); playCmRealFixtures and playCmQuickSubs need their font cache folders
- others: simCmVar (ENOENT on its own .sim-control temp file), playLiveMatchFit ("under reduced motion the frame
  with the new score reads phase pass"), playCmVar (case 390-reduced-ruledOut-plain)

## The rewrites the proof allows, and how often they fired (r1326-s5a, fleets A to D, 67 careers)
Counts are string differences explained, summed over every entry compared, so one headline that sits in the
feed for eight entries counts eight times.
- A: article-news 1440, article-board 462, intl 710, drama 96, staff 91
- B (simCmLeagueRules' own 47 saves): article-news 2189, article-board 411, intl 3689, drama 93, staff 138
- C (the four committed old saves): article-news 165, article-board 7, intl 76, drama 15
- D (level 9 staff, every approach matched while it can be): intl 148, drama 15, article-board 13, staff 57
Draws equal on both trees after every entry of every career. now|saudi held whole (no rewrite), which is the
one modern digest save that did not move.

## The staff desk recording (simGmStaff, red on main: NOT re-recorded)
GM_STAFF_RECORD=1 on the base and on ea84ed63 (r1326-s5a staff-rec-base and staff-rec-head, both exit 0), diffed
with a line diff: 2782 lines each, 136 differ, every one an approach tick line whose part before " | " is equal
and whose headline goes from "Match them or lose him: N matches left this season." to the new words (116 with
offers left, the count carried; 20 with none left), plus the 35 hashes that follow the lines. Nothing else.
simGmStaff is red on main (16 failures, first "Arsenal natural: line 5 of 81 differs"); on ea84ed63 it is red
with 40, the extra being these approach lines. For Round 1316: those words are Round 1326's.

## What else moves the kitty in a season (the paragraph under the projection names these)
Read from every write of budget in src/lib/clubManager*.ts (line numbers at 6c0a8686). In the projection's lines
already: the gate (playMyMatch 17124: tickets and food), the sponsor (signSponsorWith 2293), signings and sales
(signFreeAgent 7526, completeSigning 9203, exerciseLoanOption 9309, settleAgreedDeal 10360, acceptBid 10451,
loanOutPlayer 10691, all on seasonSignings), facilities (clubManagerFacilities.ts upgradeFacility 204), staff fees
(clubManagerStaff.ts hireStaff 377, sackStaff 391). NOT in the lines, so named in the paragraph:
- a ground expansion: expandGround, clubManager.ts 2373
- contract renewals: renewContract 7701, renewContractWithClause 7719 (also through answerMessage 9907)
- role settlements: setSquadRole 7978 (also through answerMessage 9853)
- broken loans and loan recalls: breakLoan 9334, recallLoanedPlayer 10799
- fines: answerMessage 'fine' 9865 (money in); the board's top ups: answerMessage 'fundAsk' 9882
- the academy: upgradeAcademy 17372; scout trips: hireScout 17401; promoted prospects: promoteProspect 17582
- the decisions desk: clubManagerDecisions.ts answerDecision 457
- the summer (startNextSeason 20057 to 20397) sets the new kitty between seasons, outside any season's table.
