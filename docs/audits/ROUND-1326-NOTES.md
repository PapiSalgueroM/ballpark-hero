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
| 6 money card | cd5f2ee2, notes 399920d5 | r1326-s6a, s6b, s6c, s6d, s6w | tsc 0, vitest 0, simCmCopy 0, base 1 (184), copyonly A 0, simCmLeagueRules 0, simDailyDeals 0; reader reds as on the base except two (below) | article 107, drama 57, intl 4, staff 4, finance 6, bind, binddeadline all FIRED | weight 592.1, 611.9, 622.0 |
| readers that read the old words | 9da86941 | r1326-s7b | simBoardObjectives 0 (base 1: 3), simCmShootoutOrder 0 | unsetpath 1 FIRED, news draw mutation 1 FIRED | |
| 7 the floor | 559a0c62, 82983f97 | r1326-s7a, s7c | tsc 0, vitest 0, simCmCopy 0, simClubManagerFinances 0, simSponsors 0, playSponsors 0, playCmFinanceDesk 0, simNoRivalNames 0, simHarnessAnchors 0, copyonly A 0 | desk small 9, cut 3, wrap 3 FIRED; finance 6 FIRED | weight 592.1, 611.9, 622.0 |
| 8 the close | What's New 81083982, merge 71d0ee8d | (see the closing report) | | | |

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

## Two readers that held the old words (red on 399920d5 in r1326-s6c, green on the base in r1326-s0b)
- simBoardObjectives required a title band containing 'Win the' in La Liga, Serie A and Ligue 1. It now requires
  the exact band `Win ${toLeague(name)}` (digits read as N, as the harness keys its bands), which is stricter. On
  the base with the new check: 3 failures, one per league (r1326-s7b simBoardObjectives-base).
- simCmShootoutOrder sections 4 and 5 compare every string of the save with the pre-1072 engine (5b70b05f). Its
  historical arm already cuts Round 1146's own goal call; it now also writes this round's six changed lines of
  clubManager.ts back to their old words in memory (three title labels, two weekly headlines, the drama sentence
  rule), each anchor counted exactly or the run aborts. Green on 9da86941; control unsetpath FIRED (9 rows, 37 rows
  and the old save); a mutation adding one Math.random() call at the top of generateWeeklyNews FIRED (150 rows, 300
  rows and the old save), so the arm cannot hide a moved draw.

## The floor (step 7) and what the walk found
playCmFinanceDesk on the built page, a fresh Liverpool career ten weeks by quick sim, 108 text holders, 14
buttons and 28 figures at each of 320 by 640, 390 by 844 and 1280 by 900. Its pictures of 559a0c62 showed the
signed cover and kitty figures breaking after the plus sign at 320 and 390; the walk now checks every figure of the
table sits on one line, and run against a build of 559a0c62 it reports exactly those 6 failures (r1326-s7c
prev-desk). The four signed cells are whitespace-nowrap since 82983f97.
Where the projection rows sit on a 390 by 844 phone with the desk just opened: the kitty row at document y 899,
465 px down the screen, desk top at 96 px (head). Opening scrolls nothing at 390 and 1280; at 320 the reveal moves
the page 53 px so the desk's top sits under the header at 48 px.
Lazy chunks (gzip, build log): FinancesScreen 3.41 to 3.72 kB, MatchCentre 2.28 to 2.29 kB, WorldEditorScreen 2.35
to 2.36 kB. Route rows: /club-manager 592.0 to 592.1K, /manager-hot-seat 611.7 to 611.9K, /deadline-day 621.8 to
622.0K (r1326-s0w against r1326-s7c).
Save bytes at season 15 (simClubManagerSaveSize, r1326-s0a against r1326-s6b): Real Madrid 192920 to 192904,
Everton 197117 and Lincoln City 197650 unchanged.
