/* simCareerHall.mjs, Round 915: the retirement talk and the Hall of Fame on
   careers the four US engines really play.

   Run: node scripts/simCareerHall.mjs <nfl|nba|mlb|nhl> [careers, default 2000]
        SIM_CONTROL=<name> runs one negative control (the list is CONTROLS below).
   With no sport (how runAllSims calls it) it runs all four, one child each,
   and exits with the worst code; give a sport to keep a run short.

   WHAT IT HOLDS, per sport, each with a control that must turn it red:
     1. iff        inducted if and only if the sport's own legacyOf says hof,
                   read straight from the engine (exported by the bundle
                   entry), never through the Hall binding, and the record's
                   score is that legacyOf score. Controls everyonein (the
                   ballot) and bindhof (the binding).
     1b. outcome   every career outside the Hall: off the ballot exactly under
                   half the Hall line; on it, a Hall with a ballot limit drops
                   him (early only under the stay floor, and no earlier ballot
                   under it), one without a limit keeps him waiting. Where the
                   Hall has a stay floor, a real share falls off early.
                   Controls outcomeswap, nominationgone, oldcurve (mlb only).
     2. table      the data file's rules equal the audit table in
                   docs/audits/US-HALL-RULES-2026-10.md, and every career's
                   first class is its last season, read off the save, plus
                   that table's offset. Control waitoff.
     3. rises      the first ballot share rises with the score. Measured two
                   ways: on the real careers, at every one of the nine cuts
                   between score deciles of the Hall of Famers (all deciles
                   above the cut against all below), and on a ladder of
                   synthetic candidates walked step by step up the Hall band.
                   Control flatfirst.
     4. promise    a score at the verdict's first ballot line always goes in
                   first ballot. Control nopromise.
     5. keyed      no Math.random draw while the Hall record and the speech
                   are made, and the same career gives the same record twice.
                   Control mathrandom.
     6. sides      every elected share is at or over the threshold, every
                   other share under it, no more ballots than the Hall allows,
                   and an early fall off is under the floor. Controls
                   sharesides, and shownraw (mlb only: the fall off reads the
                   raw share, not the one the card prints).
     7. talk       the retirement talk comes exactly when an independent
                   reading of the rule says, and reaches a real share of
                   careers before the hard stop. Control notalk.
     7b. answers   the loop answers the talk as a board would: a quarter of
                   the careers never answer, a quarter play one more year
                   every time, a quarter retire at the first talk, a quarter
                   announce a farewell. Retire now ends the career on that
                   season, one more year plays the next, a farewell plays
                   exactly one more season marked as the farewell. The talk
                   check reads the answers too. Controls farewelloff, retireoff.
     8. jersey     the jersey goes to the club with the most seasons (ties to
                   games, then the first club), named by the engine's own
                   club label, never a bare id. Controls jerseyfirst, jerseyraw.

   ROUND 1039, sections 9 to 14: the same rules on the BOARD's own loop. The
   real binding (nflCareerSport.ts and its siblings), its summer deal and
   answers (usCareerSummer.ts) and the talk where the board asks it
   (usCareerRetirementFlow.ts): season, progress, the hard stop or a chosen
   end, the deal with the talk filter, the talk, every card. Each career runs
   on its own keyed stream, so two policies on one career draw the same
   numbers until they really differ. 400 careers a policy by default
   (SIM_BOARD_CAREERS), 100 a league era for section 13 (SIM_ERA_CAREERS),
   800 a build for section 14 (SIM_BALANCE_CAREERS).
     9. identity   careers that answer 'one more year' every time are byte
                   for byte the loop with no talk at all (the deck's
                   retirement cards held out by this file's own reading of
                   the rule), but for the answers block. Control talkdraws
                   (one Math.random in pendingTalk).
    10. ends       Retire now ends on the talk's season; a farewell, said at
                   the talk or on a deck card ("Next season is your last"),
                   ends exactly one season later and that season is marked.
                   Controls farewelloff (Round 915's) and deckfarewelloff (the
                   deck's answers back to the bare flag).
    11. once       no offseason that has the talk is offered a deck retirement
                   card, and RETIREMENT_CARD_IDS is every card whose answer
                   writes a farewell or says it does, read off the engine's
                   own deck builders, with no id that is never dealt. Control
                   twice (the filter off). Since the review fix of 2026-10-07
                   the loop asks the talk where the board does in every case:
                   right after the deal, after a card whose answer moved the
                   rating into the rule (before the next card, or on the hub),
                   and on the hub after a banned year, which deals no summer
                   and has no hard stop, as on the board. Only the cards from
                   the talk on are checked. The deck's retirement cards lift
                   morale, so the deal never puts one in a later slot, and the
                   mid-summer path never meets one here: the seek time filter
                   and the declined clause are held by the vitest file
                   src/test/usCareerHallBoard.test.tsx, whose controls do fire.
    11b. seek      (closing check fix, 2026-10-07) so the seek time hold-out
                   is held here too: the first 300 talks the oneMore policy's
                   careers are asked in the board loop are caught, before
                   the answer, and a summer is forged to stand on each deck
                   retirement card the deck really holds then, at card 1 (a save
                   restored on a card dealt before the talk) and at card 2,
                   with the talk pending and again after 'One more year'.
                   The board's seek (seekSummerCard with talkDeckFilter) must
                   never land on one; with no hold-out the same seek must
                   land on some (the floor), so it cannot pass on nothing.
                   At card 2 the rating rule already skips every one of them
                   in nfl, nba and mlb (an answer moves the rating), so there
                   the hold-out is load-bearing at card 1 only; the NHL cards
                   leave the rating alone and land at card 2 as well. Control
                   seekexclude (the review's mutation M2, the hold-out dropped
                   from the seek): FIRED in all four sports with only seek
                   red (80 board careers, so every talk is under the cap of
                   300: met nfl 614 of 1228, nba 762 of 1524, mlb 636 of
                   1272, all at card 1; nhl 1696 of 1696, 848 at card 1 and
                   848 at card 2).
    12. deckJersey a club that retired the number on a deck card is the club
                   the card names (even where another club has more seasons),
                   on real careers and on synthetic ones with twelve seasons
                   elsewhere; a wait answer writes no club. Control
                   jerseyignore (the recorded club ignored).
    13. era        the card the board renders, for careers in every league era
                   and for synthetic ballots on both sides of the line, prints
                   "Class of X" and the class years only when the first class
                   is at or after the audit table's verifiedFromClass, and no
                   year and no rule line before it. Control eraunguarded.
    14. balance    (nhl only) the walk away card wrote OVR 63 for the farewell
                   year; now it writes the farewell. The same careers built
                   once with the old answer, measured: the farewell season's
                   own line where both builds took it the same offseason, and
                   the median legacy and Hall share over every career.

   BANDS for sections 9 to 14, measured 2026-10-06 and 07 (Round 1039) on a
   machine shared with other builders, 400 board careers a policy:
     9 to 13 are exact: zero misses in every run. Their floors only stop a
     check from passing on nothing (talks answered, ends of each kind, talk
     offseasons, synthetic jerseys, both sides of the era line). Default
     seed: talks answered one more year nfl 1118, nba 1328, mlb 1277, nhl
     1202; deck farewells nfl 28, nba 8, mlb 36, nhl 124; talk offseasons
     2577 to 3054; deck retired numbers nfl 57 (5 at a club with fewer
     seasons), nba 90 (30), mlb 75 (14), nhl none (its deck has no jersey
     card, so the synthetic careers carry section 12 there); throwback eras
     below the verified class nfl 28, nba 31, nhl 4 of 100, mlb 0 (its line
     is the Class of 2014, so the synthetic boundary ballots carry it).
     Re-measured 2026-10-07 on the review fix's loop (the talk asked
     mid-summer and after a banned year, no summer after a banned year),
     default seed, all four green: talks answered one more year nfl 1122,
     nba 1325, mlb 1281, nhl 1206; talk offseasons nfl 2585, nba 3048, mlb
     2952, nhl 2781, of them asked mid-summer 9, 0, 9, 6 and after a banned
     year 11, 42, 10, 32; deck farewells and deck retired numbers unchanged
     (nfl 57, 5 elsewhere; nba 90, 30; mlb 75, 14); section 14 unchanged.
     14, six NHL seeds (default and SIM_SEED 1 to 5), 800 careers a build:
       walk away farewells taken the same offseason in both builds 16, 12,
       12, 21, 17, 10 (of 56, 42, 43, 56, 60, 58). Band: at least 5.
       that farewell season's OVR, old build 63.0 every time, now 83.3 to
       86.3 (a gain of 20.3 to 23.3); points (wins for a goalie) 14.8 to
       18.7 became 48.0 to 70.0. Band: OVR gain at least 10.
       Hall share over every career moved -0.12 to -0.75 points. Band: 2.5.
       median legacy over every career moved 0 to -7. Band: 15.
       (Seeds 1 to 3 ran before the bands were set and were red only on the
       placeholder case floor of 30; every other check was green.)
     AT THE BRIEF'S SIZE, measured 2026-10-07 by the closing check fix:
     SIM_BOARD_CAREERS=2000 (2000 board careers a policy) and 2000 engine
     careers, the default seed plus SIM_SEED 1 to 5, all four sports, 24
     runs, every one green on its closing line with zero misses in sections
     9 to 13 and 11b. Ranges over the six seeds:
       talks answered one more year nfl 5677 to 5829, nba 6668 to 6758,
         mlb 6500 to 6655, nhl 6147 to 6282.
       retire now (and talk farewells, the same count) nfl 1699 to 1721,
         nba 1972 to 1979, mlb 1961 to 1972, nhl 1822 to 1866; deck farewells
         nfl 80 to 166, nba 84 to 112, mlb 100 to 140, nhl 520 to 696.
       talk offseasons nfl 13075 to 13361 (26 to 55 asked mid-summer, 69 to
         106 after a banned year), nba 15313 to 15491 (3 to 18, 95 to 170),
         mlb 14965 to 15280 (39 to 63, 58 to 88), nhl 14137 to 14430 (51
         to 62, 135 to 157).
       11b, forged summers landed with no hold-out (300 talks caught):
         nfl 780 to 808 of 1560 to 1616, nba 786 to 850 of 1572 to 1700,
         mlb 714 to 812 of 1428 to 1624 (all at card 1), nhl 2000 to 2148
         of as many (card 1 and card 2 alike). Band: at least 300, about
         half the smallest measured anywhere (614, nfl at 80 careers).
       deck retired numbers nfl 227 to 308 (13 to 29 at a club with fewer
         seasons), nba 308 to 373 (56 to 106), mlb 282 to 315 (27 to 56).
       section 13 (100 a league era, unchanged by SIM_BOARD_CAREERS):
         throwback careers below the verified class nfl 27 to 35, nba 22
         to 36, nhl 3 to 6, mlb 0. Section 14 as above.
     One run took 36 to 72 minutes on the shared machine, so runAllSims
     keeps 400 board careers on the default seed; rerun the long form above
     after any change to the board, the summer, the talk or a life B deck.

   ROUND 1051, sections 15 to 20: the legacy recalibration. The legacy score
   reads a table per CALIBRATION (legacyRead, careerHallOfFame.ts) and a
   career is judged on the one it retired on: the save that retires it is
   stamped (hallCal), a retired save with no stamp is calibration 1. Every
   loop here stamps the career it retires, as the board does, so sections 1
   to 14 measure the live game (calibration 2).
     SIM_CAL=1         no loop stamps: every career is read on calibration 1.
                       The attribution switch: with it every line of the
                       Round 1039 log comes back exactly (measured 2026-10-07
                       on e21ea05a, full runs, nfl, nba and mlb: zero
                       differing lines against the logs of the base commit).
     SIM_SKIP_BOARD=1  sections 9 to 14 and 20 play no board career. The run
                       prints BOARD SECTIONS SKIPPED and exits 3 whatever
                       else happened, so it can never be read as green. The
                       six seed measuring runs end on that line by design;
                       runAllSims never sets it.
     SIM_DUMP_ROWS=f   one row a career (totals, awards, both scores) to f,
                       the input of scripts/genCareerHallMarks.mjs.
     15. v1         (a) every save of src/test/fixtures/careerHallV1.json
                    (recorded by scripts/recordCareerHallV1.mjs on the base's
                    code, none stamped) reads today the legacy and the Hall
                    record it was told, whole objects. (b) legacyOf stamped 1
                    equals the four Round 123 formulas restated here, on
                    every engine career. (c) the calibration rule, exact.
                    (d) calibration 2 as recorded (scripts/data/
                    careerHallV2.json): the sport's calibration 2 table and
                    the two scoring rules whole, and what each fixture save
                    is told when stamped 2. A career retired on 2 keeps its
                    ballot, so after the release that first ships 2 the
                    table is never edited: a later change is calibration 3.
                    Before that release a deliberate change is recorded
                    again with SIM_RECORD_V2=1 (never a green run).
                    Controls v1drift (a, b), calflip (a, c), v2drift (d: one
                    to mark plus one, too small to move a recorded save, so
                    the recorded table itself has to catch it).
     16. neverbelow calibration 2 contains calibration 1 unchanged and only
                    adds; no career scores lower, loses a verdict tier or
                    leaves the Hall on 2. Control below.
     17. standout   (a) the marks, the tripwire for a round that moves an
                    engine's stats: a cell's share of careers at or over its
                    from mark, the pooled share at or over from and at or
                    over to (never a per cell check on to: a count of 0 to
                    5). (b) the table is the ledger: the half rule both ways,
                    every mark, the ramp floor, and the anchors' decisions.
                    (c) among each family's top 5 percent the Hall share on
                    2 against 1, pooled, and the standout's own part (in on 2
                    against the same score with the standout taken out).
                    (d) the score on 2 restated: one family, capped.
                    Controls markdrift, todrift (a), noramp, catchersteals
                    (b), nostandout (c red, a green), twofamilies (d: every
                    paying family added up instead of the best one taken).
     18. anchors    real career shapes, two sourced, and the ballot the real
                    Hall gave them (scripts/data/careerHallAnchors.json; its
                    selection rule was written before any score). Raw and
                    books readings on 1 and on 2, the engine's ballot by the
                    majority of 400 keyed copies. Agreement on 2 may not fall
                    under agreement on 1, and stays within two of the count
                    recorded in the file. Where it fell, the anchors made the
                    table smaller (a standout halved, then dropped; a base
                    halved, then dropped) and the file records each decision
                    with its counts. And one thing a count cannot see is
                    held exactly, in both readings: NOBODY IS MOVED PAST HIS
                    REAL BALLOT (in for a real never, first ballot for a
                    real later, and read lower on calibration 1). A man who
                    was out on 1 and goes straight in on the first ballot on
                    2, where the real Hall made him wait, is wrong before
                    and wrong after, so the agreement count does not move;
                    the closing check of 2026-10-08 found three such men in
                    football and the anchors decided on them (the file's
                    decisionRule). A SPORT WHOSE ANCHORS ARE NOT BUILT
                    ASSERTS NOTHING HERE and says so on its closing line.
                    Built: baseball (2026-10-07), basketball, hockey and
                    football (2026-10-08). A row is a man on a family list;
                    a man on two lists is two rows and is counted once in
                    the shape check (8 men a sport, two of each ballot).
                    Controls: anchorwiki (the ledger's shape), and for the
                    agreement the one that can fire in the sport, which the
                    harness works out exactly (the band asked of today's
                    table with every push tripled, and with every push off)
                    and records in the ledger: standoutbig where tripling
                    the push sends a real never or later man in or first
                    (baseball, basketball, and football since its receiver
                    pushes were halved: a real later man read later goes
                    first again), standoutgone where switching it off puts
                    out more men than the band allows (hockey),
                    decisionback where the anchors took a push out or cut
                    it (football: the kicker's field goals planted again;
                    baseball: the left fielder's steals back to full size),
                    and basebig for the base (football: the edge rusher's
                    base five times its size sends two real later men first
                    in the raw reading; no other sport holds a real never
                    or later man at a base position).
                    Each refuses, exit 2, in a sport where it cannot fire,
                    and says why. Hockey cannot fail high at all: every
                    real top of the books career there went straight in,
                    and the harness prints that on every run. And for (c),
                    the majority call against firstBallotChance: ballotflip
                    (the ballot draws against the wrong side of the chance).
     19. base, words (a) the base terms are the ledger's and the median
                    career of a base position earns what was measured. (b)
                    the Hall share on 2 is at or over 1 and under its
                    ceiling (never over 45 percent: that is the lead's call).
                    (c) the two lines of the "?" carry the rule's numbers,
                    the worked example holds on the engine, and the ballot
                    card prints the voters' line on calibration 2 only.
                    Controls nobase (football only now) and plantbase (a
                    base term planted where the ledger gives none, every
                    sport) for (a); seasonbig (calibration 2 pays every
                    season double) for (b); examplelie, nocardline,
                    clausealways and wholesheet for (c).
     20. boardstamp every career the board loop retires is stamped and scored
                    on today's calibration (none under SIM_CAL=1). Control
                    nostamp (the stamp writes nothing): 15 (c) goes red on
                    any run and this check on a run that plays the board
                    loop. The loop stamps through the engine's own
                    stampHallCalibration; the board's React side (persist,
                    stampOnRetirement) is held by the vitest cases in
                    src/test/usCareerHallBoard.test.tsx and by the browser
                    walk scripts/playCareerHallLine.mjs.

   BANDS for sections 17 and 19 live in scripts/data/careerHallMarks.json
   and are computed by scripts/genCareerHallMarks.mjs (its header has the
   recipe and the rule for each band). Measured 2026-10-07, the default seed
   and SIM_SEED 1 to 5, 2000 careers a run (2750 in baseball for the marks,
   the first 2000 of each run for the bands), the board skipped:
     marks: at least 1,500 pooled careers a position. A cell's share at or
       over from: nfl 6.4 to 15.2 percent, nba 6.3 to 14.5, mlb 5.0 to 17.0,
       nhl 7.5 to 13.0 (band: that envelope widened a quarter each side).
       Pooled at or over from: nfl 9.90 to 10.50, nba 9.41 to 10.41, mlb
       9.60 to 11.63, nhl 9.42 to 11.06; at or over to: nfl 0.40 to 1.07,
       nba 0.64 to 1.14, mlb 0.78 to 1.35, nhl 0.63 to 1.33 (bands: the six
       run range widened by half its width each side).
     Hall share on 1 and on 2: nfl 19.6 to 21.4 and 25.4 to 27.0, nba 30.3
       to 32.5 and 32.3 to 34.9, mlb 36.4 to 40.5 and 37.4 to 41.3, nhl 29.3
       to 31.8 and 30.3 to 33.1. Ceiling: the largest plus the spread (nfl
       28.5, nba 37.6, nhl 35.9; mlb 45.0, the hard stop).
     top 5 percent by family, pooled gain 2 over 1: nfl 30.2 to 39.1 points
       (needs 15.1), nba 19.4 to 28.7 (9.7), mlb 15.0 to 28.0 (7.5), nhl
       16.3 to 35.0 (8.1). The standout's own part: nfl 11.1 to 19.7 (5.5),
       nba 12.5 to 17.9 (6.3), mlb 3.6 to 10.0 (1.8), nhl 5.8 to 7.9 (2.9).
       Each floor is half the smallest of the six.
     base, median credit: TE 110.5 to 113.3, LB 107.9 to 110.8, CB 107.5 to
       111.9, EDGE 107.1 to 110.2 (bands: the range widened by half).
     points paid (the legacy is the finished game's score), median on 1 and
       on 2: nfl 293 to 314 and 348 to 372, nba 348 to 362 and 356 to 368,
       mlb 420 to 434 and 424 to 436, nhl 356 to 372 and 360 to 375.
     anchors, baseball, in or out and exact, calibration 1 > 2: raw 9 > 9
       and 6 > 6 of 9, books 4 > 4 and 3 > 3 of 4, after three decisions (a
       left fielder's steals halved; the reliever's saves standout and his
       base dropped). Before them: raw 9 > 7 and 6 > 4, books 8 > 6, 5 > 3.
     anchors, basketball (14 men, built 2026-10-08): raw 12 > 12 and 12 > 12
       of 14, books 10 > 10 and 10 > 10 of 10. No decision: the one real
       never with a books reading stays out on 2 at 486 against 500.
     anchors, hockey (16 men in 17 rows, built 2026-10-08; the All-Star
       count is the season-end First and Second Team, the engine's own):
       raw 12 > 14 and 11 > 12 of 17, books 7 > 10 and 7 > 9 of 10. No
       decision. Every list man went straight in, so hockey cannot say the
       push is too big.
     anchors, football (22 men in 25 rows, built 2026-10-08; one of them a
       seniors committee choice, printed apart): raw 21 > 23 and 15 > 17 of
       24, books 11 > 14 and 7 > 7 of 14, after two decisions (a receiver's
       touchdown catches and a kicker's field goals, both dropped: halved,
       each still sent a real later or never man in or first). Before
       them: raw 21 > 22 and 15 > 16, books 21 > 22 and 14 > 11 of 24.
     football, re-measured 2026-10-08 after those two decisions (the six
       seeds again; the lines above this block give the first measurement,
       and for football these replace them): Hall share on 2 25.3 to 26.8
       (ceiling 28.2); pooled at or over from 9.77 to 10.57, at or over to
       0.46 to 1.14; top 5 percent pooled gain 33.6 to 43.6 points (needs
       16.8), the standout's own part 11.0 to 19.2 (5.5); points paid,
       median on 2, 348 to 371.
     football again, the closing pass of 2026-10-08 (three more decisions
       by the moved past rule: an edge rusher's sacks standout dropped, a
       receiver's receiving yards and catches halved; these lines replace
       the two football blocks above): anchors raw 21 > 23 and 15 > 17 of
       24, books 8 > 9 and 5 > 6 of 9, nobody moved past his real ballot
       (three were, in the books reading, before). Six seeds on the new
       table: Hall share on 2 25.2 to 26.8 (ceiling 28.3); pooled at or
       over from 9.75 to 10.52, at or over to 0.46 to 1.14; top 5 percent
       pooled gain 33.6 to 43.6 points (needs 16.8), the standout's own
       part 11.8 to 19.5 (5.9); points paid, median on 2, 348 to 370. What
       the three decisions cost on the engine's own careers, default seed,
       2,000: Hall share 25.7 to 25.6, edge rushers 37.6 to 37.2, receivers
       22.8 unchanged, newly in 93 to 92, over the first ballot line on 2
       and not on 1 52 to 47.
   Controls run 2026-10-08, board skipped: standoutbig FIRED in baseball
   and basketball, and in football after the closing pass (it refused there
   before), and refuses in hockey; basebig FIRED in football and refuses in
   the other three; standoutgone FIRED in
   hockey and refuses in the other three; decisionback FIRED in football
   and baseball and refuses in the other two; plantbase FIRED in all four;
   anchorwiki FIRED; twofamilies, ballotflip, seasonbig and nostamp (on
   15 c) FIRED in all four.
   Controls of sections 15 to 19, run 2026-10-07 with the board skipped
   (which is enough: none of them reads a board career): on 109b6ce8 all
   four sports FIRED on v1drift, calflip, below, markdrift, todrift, noramp
   and catchersteals, and football and baseball on nobase (basketball and
   hockey have no base and refuse). nostandout fired everywhere but in
   football, where the base alone kept the pooled gain up; the standout's
   own part was added for that and is what it now turns red.
   A control that refuses to run (its string is not in the source) exits 2,
   never the 1 that means FIRED.

   A control run exits 1 only when the check it targets is red (FIRED), and 0
   when it is not (DID NOT FIRE), whatever else went red.

   BANDS, from measured headroom. Measured 2026-10-03 at 2000 careers a sport,
   the default seed plus SIM_SEED 1 to 5 (six runs a sport), on the tree with
   the answers loop (a quarter of careers retire at the first talk):
     rises, real careers: at each of the nine decile cuts, the first ballot
       share above the cut minus below it. Smallest cut of six runs:
       nfl 0.312, nba 0.142, mlb 0.298, nhl 0.341. Band: every cut at least
       0.06. (A single decile against its neighbour is too small a sample:
       mlb's second decile came out under its first in one run.)
     outcome, early fall off where the Hall has a stay floor (mlb): early
       fall offs over careers on the ballot outside the Hall, 28.1 to 31.5
       percent in six runs (2 in 1053 before the review's curve change).
       Band: at least 10 percent.
     sides, the floor sweep (mlb): synthetic ballots shown at exactly the
       floor, 345 to 379 in six runs (under shownraw 178 of them miss).
       Band: at least 100, so the 4.96 shown as 5.0 guard is really exercised.
     rises, ladder: ten steps up the Hall band, 4000 synthetic candidates a
       step, every step must rise. The expected step is 0.07; the smallest
       step of all 24 seeded runs was 0.036 (nhl). Band: every step over 0.015.
     talk reach: share of careers asked at least once before the hard stop.
       Lowest of six: nfl 86.8, nba 100, mlb 100, nhl 97.2. Band: at least 70.
     iff: inducted is 19.6 to 21.6 percent (nfl), 28.2 to 31.1 (nba), 36.2 to
       39.4 (mlb), 28.1 to 31.1 (nhl) of these careers. Band: at least 5
       percent, so the check can never pass on an empty Hall.
     mlb careers under ten seasons with games that reach the Hall or the
       ballot (printed, not checked; the real ballot needs ten): 0 in all six.
   Everything else is exact: zero misses, every run, every seed.
   These careers pick event answers at random and never change teams by
   choice, so the shares are this loop's, not the game's; the checks are about
   the Hall reading the verdict right, which holds for any career. */

/* Round 299: seeded stream, see scripts/lib/seedRandom.mjs. First import on purpose. */
import './lib/seedRandom.mjs';
import os from 'node:os';
import path from 'node:path';
import { build } from 'esbuild';
import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const SELF = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(SELF), '..');
const SPORT = process.argv[2];
const CAREERS = Number(process.argv[3] || 2000);
const CONTROL = process.env.SIM_CONTROL || '';
/* Round 1051. SIM_CAL=1: no loop stamps a career as it retires, so every
   career is read on calibration 1, the attribution switch (every number of
   the Round 1039 header must come back exactly). SIM_SKIP_BOARD=1: sections
   9 to 14 and 20 play no board career; the run prints BOARD SECTIONS SKIPPED
   and exits 3 whatever else happened, so it can never be read as green. */
const CAL1 = process.env.SIM_CAL === '1';
const SKIP_BOARD = process.env.SIM_SKIP_BOARD === '1';

const ENGINES = {
  nfl: { file: 'nflMyCareer.ts', hall: 'NFL_CAREER_HALL', legacy: 'legacyOf', label: 'teamLabelOf', arch: 'ARCHETYPES', start: 'startCareer', season: 'simSeason', progress: 'progress', event: 'drawEvent', stop: 'shouldRetire', roll: 'rollTeamQuality', binding: 'NFL_CAREER_SPORT', eras: 'NFL_ERAS', positions: ['QB', 'RB', 'WR', 'TE', 'LB', 'CB', 'EDGE', 'K'] },
  nba: { file: 'nbaMyCareer.ts', hall: 'NBA_CAREER_HALL', legacy: 'nbaLegacyOf', label: 'nbaTeamLabelOf', arch: 'NBA_ARCHETYPES', start: 'startNbaCareer', season: 'simNbaSeason', progress: 'nbaProgress', event: 'drawNbaEvent', stop: 'nbaShouldRetire', roll: 'nbaRollTeamQuality', binding: 'NBA_CAREER_SPORT', eras: 'NBA_ERAS', positions: ['PG', 'SG', 'SF', 'PF', 'C'], banned: { ppg: 0, rpg: 0, apg: 0 } },
  mlb: { file: 'mlbMyCareer.ts', hall: 'MLB_CAREER_HALL', legacy: 'mlbLegacyOf', label: 'mlbTeamLabelOf', arch: 'MLB_ARCHETYPES', start: 'startMlbCareer', season: 'simMlbSeason', progress: 'mlbProgress', event: 'drawMlbEvent', stop: 'mlbShouldRetire', roll: 'mlbRollTeamQuality', binding: 'MLB_CAREER_SPORT', eras: 'MLB_ERAS', positions: ['SP', 'RP', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH'] },
  nhl: { file: 'nhlMyCareer.ts', hall: 'NHL_CAREER_HALL', legacy: 'nhlLegacyOf', label: 'nhlTeamLabelOf', arch: 'NHL_ARCHETYPES', start: 'startNhlCareer', season: 'simNhlSeason', progress: 'nhlProgress', event: 'drawNhlEvent', stop: 'nhlShouldRetire', roll: 'nhlRollTeamQuality', binding: 'NHL_CAREER_SPORT', eras: 'NHL_ERAS', positions: ['C', 'LW', 'RW', 'D', 'G'] },
};
// Round 1051: the engine's own career totals, its legacy tables and the award counts the legacy reads.
const LEGACY_INPUT = {
  nfl: { totals: 'careerTotals', weights: 'NFL_LEGACY_WEIGHTS', awards: ['rings', 'mvps', 'allPros'] },
  nba: { totals: 'nbaCareerTotals', weights: 'NBA_LEGACY_WEIGHTS', awards: ['rings', 'mvps', 'finalsMvps', 'allNbas'] },
  mlb: { totals: 'mlbCareerTotals', weights: 'MLB_LEGACY_WEIGHTS', awards: ['rings', 'mvpCys', 'allStars'] },
  nhl: { totals: 'nhlCareerTotals', weights: 'NHL_LEGACY_WEIGHTS', awards: ['cups', 'harts', 'connSmythes', 'allStars'] },
};
if (!SPORT) {
  // runAllSims calls every harness with no arguments: run the four sports, one child each.
  let worst = 0;
  for (const s of Object.keys(ENGINES)) {
    const r = spawnSync(process.execPath, [SELF, s, String(CAREERS)], { stdio: 'inherit', env: process.env, cwd: ROOT });
    worst = Math.max(worst, r.status ?? 1);
  }
  console.log(`simCareerHall: ${worst ? 'RED' : 'all four sports green'}`);
  process.exit(worst);
}
const E = ENGINES[SPORT];
if (!E) { console.error(`usage: node scripts/simCareerHall.mjs <${Object.keys(ENGINES).join('|')}> [careers]`); process.exit(2); }

/* Each control rewrites one string in one source file as it is bundled. The
   string must be there, or the control refuses to run: a control that
   changes nothing would leave the harness green for the wrong reason. */
const CONTROLS = {
  everyonein: { file: 'careerHallOfFame.ts', from: 'if (cand.hof) {', to: 'if (true) {' },
  bindhof: { file: 'careerHallOfFame.ts', from: 'return { score: l.score, hof: l.hof };', to: 'return { score: l.score, hof: true };' },
  outcomeswap: { file: 'careerHallOfFame.ts', from: 'rules.ballotYears !== null ? "fellOff" : "waiting"', to: 'rules.ballotYears === null ? "fellOff" : "waiting"' },
  nominationgone: { file: 'careerHallOfFame.ts', from: 'if (cand.score < lines.hofLine * HALL_GAME_RULES.nominationShare) {', to: 'if (false) {' },
  waitoff: { file: `${SPORT}CareerHall.ts`, re: /firstClassOffset: (\d+),/, to: (m, n) => `firstClassOffset: ${Number(n) + 1},` },
  flatfirst: { file: 'careerHallOfFame.ts', from: 'return f + (1 - f) * bandFraction(score, lines);', to: 'return f;' },
  nopromise: { file: 'careerHallOfFame.ts', from: 'if (score >= lines.firstBallotScore) return 1;', to: 'if (score >= lines.firstBallotScore) return 0.5;' },
  mathrandom: { file: 'careerHallOfFame.ts', from: 'const rng = keyedRng(`hall:${rules.sport}:${cand.key}`);', to: 'const rng = Math.random;' },
  // MLB only (the one Hall with a stay floor): the opening share curve before the review, under which almost nobody fell off early.
  oldcurve: { file: 'careerHallOfFame.ts', from: 'let share = (t - 10) * reach ** 4 * (0.3 + 0.7 * rng());', to: 'let share = (t - 10) * reach * reach * (0.6 + 0.4 * rng());' },
  // MLB only (the one Hall with a stay floor): the fall off reads the raw share, not the one the card prints.
  shownraw: { file: 'careerHallOfFame.ts', from: 'if (rules.stayFloor !== null && shown < rules.stayFloor) {', to: 'if (rules.stayFloor !== null && share < rules.stayFloor) {' },
  sharesides: { file: 'careerHallOfFame.ts', from: 'const final = Math.min(99.7, t + ', to: 'const final = Math.min(99.7, t - 20 + ' },
  farewelloff: { file: 'careerRetirement.ts', from: 'return block.farewellYear !== undefined && year >= block.farewellYear;', to: 'return block.farewellYear !== undefined && year > block.farewellYear;' },
  retireoff: { file: 'careerRetirement.ts', from: 'if (block.retiredYear !== undefined && year >= block.retiredYear) return true;', to: 'if (false) return true;' },
  notalk: { file: 'careerRetirement.ts', from: 'if (drop >= rule.dropFromPeak) return', to: 'if (false) return' },
  jerseyfirst: { file: 'careerHallOfFame.ts', from: 't.seasons > best.seasons ||', to: 't.seasons < best.seasons ||' },
  jerseyraw: { file: 'careerHallOfFame.ts', from: 'teamName: (team, c) => def.teamLabel(team, c.eraId),', to: 'teamName: (team) => team,' },
  // Round 1039, sections 9 to 13.
  talkdraws: { file: 'usCareerRetirementFlow.ts', from: 'if (!hall || c.retired || c.seasons.length === 0) return null;', to: 'Math.random(); if (!hall || c.retired || c.seasons.length === 0) return null;' },
  deckfarewelloff: { file: `${SPORT}CareerLifeB.ts`, re: /announceFarewell\(cc\);/g, to: '' },
  twice: { file: 'usCareerRetirementFlow.ts', from: 'return e => RETIREMENT_CARD_IDS.has(e.id) && talkThisOffseason(c, hall);', to: 'return e => false && RETIREMENT_CARD_IDS.has(e.id);' },
  // Closing check fix, 2026-10-07: the seek time hold-out dropped (the review's mutation M2), section 11b.
  seekexclude: { file: 'usCareerSummer.ts', from: 'if (card && !(exclude && exclude(card)) && (s.at === 0', to: 'if (card && (s.at === 0' },
  jerseyignore: { file: 'careerHallOfFame.ts', from: 'sport.recordedJersey?.(c) ?? jerseyFor(', to: 'jerseyFor(' },
  eraunguarded: { file: 'HallOfFameCard.tsx', from: 'rec.firstClass >= rules.verifiedFromClass', to: 'true' },
  // Round 1051, sections 15 on. v1drift: the first award weight of the sport's calibration 1 table plus one.
  below: { cur: true, file: `${SPORT}MyCareer.ts`, re: /(_LEGACY_V\d: LegacyWeights = \{\s+awards: \{ \w+: )(\d+)/, to: (m, a, n) => `${a}${Number(n) - 1}` },
  nostandout: { file: 'careerHallOfFame.ts', from: 'LEGACY_GAME_RULES = { standoutTop: 300,', to: 'LEGACY_GAME_RULES = { standoutTop: 0,' },
  // One from mark halved (the first standout of the sport's table).
  markdrift: { cur: true, file: `${SPORT}MyCareer.ts`, re: /(standout: \[\s+\{ stat: '\w+', from: )([\d.]+)/, to: (m, a, n) => `${a}${Number(n) / 2}` },
  // Every to mark of the sport times 0.9.
  todrift: { file: `${SPORT}MyCareer.ts`, re: /(, to: )([\d.]+)(, label: )/g, to: (m, a, n, b) => `${a}${Number(n) * 0.9}${b}` },
  // One to mark set to its from mark plus one.
  noramp: { cur: true, file: `${SPORT}MyCareer.ts`, re: /(standout: \[\s+\{ stat: '\w+', from: )([\d.]+)(, to: )([\d.]+)/, to: (m, a, n, b) => `${a}${n}${b}${Number(n) + 1}` },
  // A family planted where the half rule gives none: a catcher's steals, a point guard's rebounds, a linebacker's sacks, a defenceman's goals.
  catchersteals: { cur: true, file: `${SPORT}MyCareer.ts`, re: { mlb: /(\n    C: \{\s+terms: \[[^\n]*\],\s+standout: \[)/, nba: /(\n    PG: \{\s+terms: \[[^\n]*\],\s+standout: \[)/, nfl: /(\n    LB: \{\s+terms: \[[^\n]*\],\s+standout: \[)/, nhl: /(\n    D: \{\s+terms: \[[^\n]*\],\s+standout: \[)/ }[SPORT], to: (m, a) => `${a} { stat: '${{ mlb: 'sb', nba: 'reb', nfl: 'sacks', nhl: 'goals' }[SPORT]}', from: 30, to: 40, label: 'planted' },` },
  // The base emptied at one position (football's tight end, baseball's reliever; basketball and hockey have no base).
  nobase: { cur: true, file: `${SPORT}MyCareer.ts`, re: { nfl: /(\n    TE: \{\s+terms: \[)[^\n]*(\],)/, mlb: /(\n    RP: \{\s+terms: \[\{ stat: 'hr', per: 4 \}, \{ stat: 'rbi', per: 60 \})[^\n]*(\],)/ }[SPORT] ?? /a string that is in no file, so this control refuses to run here/, to: (m, a, b) => `${a}${b}` },
  // The example's push typed as a literal instead of read off the rule.
  examplelie: { file: 'careerHallOfFame.ts', from: 'const top = n.top ?? LEGACY_GAME_RULES.standoutTop;', to: 'const top = 250;' },
  // The card's line switched off.
  nocardline: { file: 'HallOfFameCard.tsx', from: '{record.weighs && <p data-hall-weighs', to: '{false && <p data-hall-weighs' },
  // The card's floor dropped: any standout is said, a push of a point included.
  clausealways: { file: 'careerHallOfFame.ts', from: 'Math.round(standout.credit) >= LEGACY_GAME_RULES.standoutSaid ? standout : null;', to: 'standout.credit >= 0 ? standout : null;' },
  // The card's second sentence typed by hand again instead of read off the table (every position told the whole stat sheet counts).
  wholesheet: { file: 'careerHallOfFame.ts', from: 'return `${words.weighs} Then your seasons${list}.`;', to: 'return `${words.weighs} Then your seasons and the whole stat sheet.`;' },
  // Section 18. The standout three times its size, an explicit top included: real never and later anchors go in or go first on 2.
  standoutbig: { file: 'careerHallOfFame.ts', from: 'const credit = (s.top ?? LEGACY_GAME_RULES.standoutTop) * share;', to: 'const credit = (s.top ?? LEGACY_GAME_RULES.standoutTop) * 3 * share;' },
  // Section 18, the other side of the band: the push switched off, so an anchor who is in on the push alone falls out (the same edit as nostandout, aimed at the anchors).
  standoutgone: { file: 'careerHallOfFame.ts', from: 'LEGACY_GAME_RULES = { standoutTop: 300,', to: 'LEGACY_GAME_RULES = { standoutTop: 0,' },
  // Section 18, the decisions themselves: one push the real anchors took out or cut is put back whole (football: the kicker's field goals planted again; baseball: the left fielder's steals back to the full size). It refuses in a sport whose anchors decided nothing.
  decisionback: { cur: true, file: `${SPORT}MyCareer.ts`, re: { nfl: /(\n    K: \{\s+terms: \[\],)/, mlb: /(\{ stat: 'sb', from: [\d.]+, to: [\d.]+, label: 'steals'), top: \d+( \})/ }[SPORT] ?? /a string that is in no file, so this control refuses to run here/, to: (m, a, b) => (SPORT === 'nfl' ? `${a} standout: [{ stat: 'fgMade', from: 512, to: 564, label: 'field goals' }],` : `${a}${b}`) },
  // Section 18, the base's side of "the anchors may only make things smaller": the edge rusher's base five times its size (every per divided by five). Two real later men
  // the base alone reads later in the raw reading (out on 1) go first, so they are moved past their real ballot. Football only: no other sport holds a real never or later
  // man at a base position (the reliever's base is gone, basketball and hockey have none), and there it refuses.
  basebig: { cur: true, file: `${SPORT}MyCareer.ts`, re: { nfl: /(\n    EDGE: \{\s+terms: \[\{ stat: 'sacks', per: )2\.5( \}, \{ stat: 'tackles', per: )41( \}, \{ stat: 'forcedFum', per: )1\.3( \}\],)/ }[SPORT] ?? /a string that is in no file, so this control refuses to run here/, to: (m, a, b, c, d) => `${a}0.5${b}8.2${c}0.26${d}` },
  // Section 19 (a), for every sport: a base term planted at a position the ledger gives none (a point guard's assists, a kicker's field goals, the reliever's saves back, a defenceman's assists).
  plantbase: { cur: true, file: `${SPORT}MyCareer.ts`, re: { nba: /(\n    PG: \{\s+terms: \[\{ stat: 'pts', per: 430 \})(\],)/, nfl: /(\n    K: \{\s+terms: \[)(\],)/, mlb: /(\n    RP: \{ terms: \[\{ stat: 'hr', per: 4 \}, \{ stat: 'rbi', per: 60 \})(\] \},)/, nhl: /(\n    D: \{\s+terms: \[\{ stat: 'points', per: 18 \})(\],)/ }[SPORT], to: (m, a, b) => `${a}${SPORT === 'nfl' ? '' : ', '}{ stat: '${{ nba: 'ast', nfl: 'fgMade', mlb: 'saves', nhl: 'assists' }[SPORT]}', per: 8 }${b}` },
  // Section 17 (d): every paying family added up instead of the best one taken.
  twofamilies: { file: 'careerHallOfFame.ts', from: 'if (credit > 0 && (!standout || credit > standout.credit)) standout = { stat: s.stat, label: s.label, total, credit };', to: 'if (credit > 0) standout = { stat: s.stat, label: s.label, total, credit: credit + (standout ? standout.credit : 0) };' },
  // Section 15 (d): one to mark of the calibration 2 table plus one (too small to move a recorded save: the recorded table itself must catch it).
  v2drift: { file: `${SPORT}MyCareer.ts`, re: /(, to: )([\d.]+)(, label: )/, to: (m, a, n, b) => `${a}${Number(n) + 1}${b}` },
  // Section 15 (e), Round 1301: the same on the table of calibration 3 (the NHL's own table; elsewhere the calibration 2 table, which 3 reads).
  v3drift: { cur: true, file: `${SPORT}MyCareer.ts`, re: /(, to: )([\d.]+)(, label: )/, to: (m, a, n, b) => `${a}${Number(n) + 1}${b}` },
  // Section 18 (c): the ballot draws its first call against the wrong side of the chance.
  ballotflip: { file: 'careerHallOfFame.ts', from: 'if (rng() >= firstBallotChance(cand.score, lines)) {', to: 'if (rng() >= 1 - firstBallotChance(cand.score, lines)) {' },
  // Section 19 (b): calibration 2 pays every season double, so the Hall fills past its ceiling.
  seasonbig: { cur: true, file: `${SPORT}MyCareer.ts`, re: /(_LEGACY_V\d: LegacyWeights = \{\s+awards: \{[^}]*\},\s+season: )(\d+)/, to: (m, a, n) => `${a}${Number(n) * 2}` },
  // Sections 15 (c) and 20: the stamp writes nothing, so a career the loops retire is read on calibration 1.
  nostamp: { file: 'careerHallOfFame.ts', from: 'if (c.retired && c.hallCal === undefined) c.hallCal = HALL_CALIBRATION;', to: 'if (false) c.hallCal = HALL_CALIBRATION;' },
  // The ledger with one source host swapped for a wiki (done in memory where the ledger is read).
  anchorwiki: { file: 'careerHallOfFame.ts', from: 'export type HallCalibration = 1 | 2 | 3;', to: 'export type HallCalibration = 1 | 2 | 3;' },
  calflip: { file: 'careerHallOfFame.ts', from: 'return c.retired ? 1 : HALL_CALIBRATION;', to: 'return HALL_CALIBRATION;' },
  v1drift: { file: `${SPORT}MyCareer.ts`, re: /(_LEGACY_V1: LegacyWeights = \{\s+awards: \{ \w+: )(\d+)/, to: (m, a, n) => `${a}${Number(n) + 1}` },
};
if (CONTROL && !CONTROLS[CONTROL]) { console.error(`unknown SIM_CONTROL ${CONTROL}`); process.exit(2); }
/* Round 1301. The table a career retiring today is read on, by its name in the
   sport's own file: the last entry of its <SPORT>_LEGACY_WEIGHTS map (the NHL's
   is NHL_LEGACY_V3; football, basketball and baseball map calibration 3 to
   their V2 table, so theirs is still V2). A control marked `cur` edits that
   table and nothing before it in the file: the source is cut at the table's
   declaration and the control's string is looked for from there on, so in the
   NHL a mark of calibration 2 (which no career retiring today reads) is never
   the one that moves. */
const SPORT_SRC = readFileSync(path.join(ROOT, 'src/lib', E.file), 'utf8');
const CUR_TABLE = (SPORT_SRC.match(/_LEGACY_WEIGHTS: Record<HallCalibration, LegacyWeights> = \{([^}]*)\}/)?.[1] ?? '').split(',').map(s => s.split(':')[1]?.trim()).filter(Boolean).at(-1);
const CUR_ANCHOR = `const ${CUR_TABLE}: LegacyWeights = {`;
if (!CUR_TABLE || SPORT_SRC.split(CUR_ANCHOR).length !== 2) { console.error(`simCareerHall ${SPORT}: cannot find the table of today's calibration in ${E.file} (read "${CUR_TABLE}"), refusing to run`); process.exit(2); }
let controlFired = false;
const controlPlugin = {
  name: 'control',
  setup(b) {
    if (!CONTROL) return;
    const ctl = CONTROLS[CONTROL];
    b.onLoad({ filter: /\.tsx?$/ }, args => {
      if (path.basename(args.path) !== ctl.file) return undefined;
      const whole = readFileSync(args.path, 'utf8');
      const at = ctl.cur ? whole.indexOf(CUR_ANCHOR) : 0;
      if (at < 0) throw new Error(`control ${CONTROL}: its string is not in ${ctl.file}, refusing to run`);
      const kept = whole.slice(0, at), src = whole.slice(at);
      const hit = ctl.re ? ctl.re.test(src) : src.includes(ctl.from);
      if (!hit) throw new Error(`control ${CONTROL}: its string is not in ${ctl.file}, refusing to run`);
      controlFired = true;
      return { contents: kept + (ctl.re ? src.replace(ctl.re, ctl.to) : src.replace(ctl.from, ctl.to)), loader: args.path.endsWith('x') ? 'tsx' : 'ts' };
    });
  },
};

const OUT = path.join(os.tmpdir(), `career-hall-${SPORT}-${CONTROL || 'base'}-${process.pid}.mjs`);
const entry = [
  // The engine's own legacyOf, read straight from the engine, so the iff check
  // never goes through the Hall binding it is checking.
  `export { ${E.legacy} as LEGACY, ${E.label} as LABEL, ${E.arch} as ARCH, ${E.start} as start, ${E.season} as season, ${E.progress} as progress, ${E.event} as drawEvent, ${E.stop} as stop, ${E.roll} as roll } from './src/lib/${E.file}';`,
  `export { ${E.hall} as HALL } from './src/lib/${SPORT}CareerHall.ts';`,
  `export { hallRecordFor, runHallBallot, firstBallotChance } from './src/lib/careerHallOfFame.ts';`,
  // Round 1051: the totals the legacy reads and the sport's tables, for sections 15 on.
  `export { ${LEGACY_INPUT[SPORT].totals} as TOTALS, ${LEGACY_INPUT[SPORT].weights} as WEIGHTS } from './src/lib/${E.file}';`,
  `export { legacyRead, hallCalibrationOf, sanitizeHallCal, stampHallCalibration, HALL_CALIBRATION, LEGACY_GAME_RULES, hallVoterRulesFor, hallWeighLine } from './src/lib/careerHallOfFame.ts';`,
  `export { ${SPORT.toUpperCase()}_HALL_WORDS as WORDS } from './src/lib/${SPORT}CareerHall.ts';`,
  `export { formatNumber } from './src/lib/formatNumber.ts';`,
  `export { giveHallSpeech, HALL_SPEECHES } from './src/lib/careerHallSpeech.ts';`,
  `export { retirementTalk, answerRetirement, careerEndsAfter, isFarewellSeason } from './src/lib/careerRetirement.ts';`,
  // Round 1039: the board's own pieces, for sections 9 to 14.
  `export { ${E.binding} as SPORTB } from './src/lib/${SPORT}CareerSport.ts';`,
  `export { ${E.eras} as ERAS } from './src/lib/${E.file}';`,
  `export { startSummer, answerSummerCard, seekSummerCard, summerCardAt, summerSeason } from './src/lib/usCareerSummer.ts';`,
  `export { pendingTalk, answerTalk, endsAfterSeason, talkDeckFilter, RETIREMENT_CARD_IDS } from './src/lib/usCareerRetirementFlow.ts';`,
  `export { HallOfFameCard, hallYearsShown, hallHeadline, ballotLine, hallRuleLines } from './src/components/career/HallOfFameCard.tsx';`,
  `export { renderToStaticMarkup } from 'react-dom/server';`,
  `export { createElement } from 'react';`,
].join('\n');
try {
  await build({
    stdin: { contents: entry, resolveDir: ROOT, loader: 'ts' },
    bundle: true, format: 'esm', platform: 'node', outfile: OUT, absWorkingDir: ROOT,
    logLevel: CONTROL ? 'silent' : 'error', alias: { '@': './src' }, plugins: [controlPlugin], jsx: 'automatic', banner: { js: "import { createRequire as __hallRequire } from 'node:module'; const require = __hallRequire(import.meta.url);" },
  });
} catch (err) {
  // Round 1051: a control whose string is not in the source refuses to run, and that is exit 2, never the 1 that means FIRED.
  const refused = /refusing to run/.test(String(err && err.message));
  console.error(refused ? `simCareerHall ${SPORT} CONTROL ${CONTROL}: REFUSED, its string is not in the source (not a FIRED)` : String(err && err.message));
  process.exit(2);
}
// Round 1039: the bindings read localStorage; this run keeps it in memory.
const store = new Map();
globalThis.localStorage ??= { getItem: k => (store.has(k) ? store.get(k) : null), setItem: (k, v) => { store.set(k, String(v)); }, removeItem: k => { store.delete(k); }, clear: () => store.clear(), key: () => null, length: 0 };
const eng = await import(pathToFileURL(OUT).href);
try { unlinkSync(OUT); } catch { /* the temp file is only a copy */ }
if (CONTROL && !controlFired) { console.error(`control ${CONTROL} never reached its file, refusing to report`); process.exit(2); }
const { HALL } = eng;

/* Math.random draws are counted only while the Hall record and the speech are made. */
const seeded = Math.random;
let counting = false, hallDraws = 0;
Math.random = () => { if (counting) hallDraws += 1; return seeded(); };

const rule = HALL.retirement;
const careers = [];
let crashes = 0, talkMismatch = 0, talkBeforeAge = 0;
for (let i = 0; i < CAREERS; i += 1) {
  try {
    const pos = E.positions[i % E.positions.length];
    const archs = eng.ARCH[pos];
    const c = eng.start(`Hall ${i}`, pos, archs[i % archs.length], Math.random, null);
    let tq = null, talks = 0, firstTalkAge = null, guard = 0;
    // The retirement block the save would carry, and this loop's own note of the answer that matters.
    let block, answer = null;
    const declined = new Set();
    while (!c.retired && guard++ < 30) {
      if ((c.suspendedSeasons ?? 0) > 0) {
        c.suspendedSeasons -= 1;
        c.seasons.push({ year: c.year, team: c.team, age: c.age, ovr: c.ovr, games: 0, ...(E.banned ?? {}), awards: [], teamResult: 'SUSPENDED', salary: 0 });
      } else {
        tq = eng.roll(tq, Math.random);
        eng.season(c, tq, Math.random);
      }
      eng.progress(c, Math.random);
      const ev = eng.drawEvent(c, Math.random);
      if (ev) ev.options[Math.floor(Math.random() * ev.options.length)].apply(c, Math.random);
      if (eng.stop(c)) c.retired = true;
      const year = c.seasons.at(-1).year;
      if (answer && answer.choice === 'farewell' && year === answer.year + 1 && eng.isFarewellSeason(block, year)) answer.flagged = true;
      // The talk, read after the offseason, exactly where a board would ask it.
      const snap = HALL.snapshot(c);
      const talk = eng.retirementTalk(rule, snap, block);
      // An independent reading of the rule, from the save and this loop's own record of the answers.
      const peak = Math.max(c.ovr, ...c.seasons.map(s => s.ovr));
      const ended = answer !== null && answer.choice !== 'oneMore';
      const expect = !eng.stop(c) && !ended && !declined.has(year) && c.age >= rule.minAge && (peak - c.ovr >= rule.dropFromPeak || c.ovr <= rule.floor);
      if (Boolean(talk) !== expect) talkMismatch += 1;
      if (talk && c.age < rule.minAge) talkBeforeAge += 1;
      if (talk) {
        talks += 1;
        if (firstTalkAge === null) firstTalkAge = c.age;
        // The answer: policy 0 never answers, 1 always plays one more, 2 retires at the first talk, 3 announces a farewell.
        // One answer per full cycle of positions, so every position gets all four (i % 4 tied them to positions).
        const choice = [null, 'oneMore', 'retireNow', 'farewell'][Math.floor(i / E.positions.length) % 4];
        if (choice) {
          block = eng.answerRetirement(block, year, choice);
          if (choice === 'oneMore') declined.add(year);
          if (!answer || answer.choice === 'oneMore') answer = { choice, year, flagged: false };
        }
      }
      if (eng.careerEndsAfter(block, year)) c.retired = true;
    }
    // Round 1051: the live game stamps a career as it retires (SIM_CAL=1 leaves it on calibration 1).
    if (!CAL1) eng.stampHallCalibration(c);
    const legacy = eng.LEGACY(c);
    counting = true;
    const rec = eng.hallRecordFor(HALL, c);
    const again = eng.hallRecordFor(HALL, c);
    let speech = null;
    if (rec.outcome === 'inducted') speech = eng.giveHallSpeech(undefined, rec, HALL.key(c), eng.HALL_SPEECHES[i % eng.HALL_SPEECHES.length].id);
    counting = false;
    careers.push({
      score: legacy.score, hof: legacy.hof, rec, same: JSON.stringify(rec) === JSON.stringify(again),
      // Read off the save, not through HALL.lastSeasonYear, which is under test.
      last: c.seasons.at(-1)?.year ?? Number.NaN, seasons: c.seasons.map(s => ({ team: s.team, games: s.games })),
      // Round 1039: the club a deck card retired the number at, and every season line, for section 8.
      numberRetiredBy: c.numberRetiredBy ?? null, allSeasons: c.seasons.map(s => ({ team: s.team })),
      talks, firstTalkAge, speech, finalAge: c.age, seasonsPlayed: c.seasons.length, eraId: c.eraId, answer,
      // Round 1051: the career itself, for sections 15 on (scored again per calibration).
      c, pos, policy: Math.floor(i / E.positions.length) % 4,
    });
  } catch (err) {
    counting = false;
    crashes += 1;
    if (crashes <= 3) console.error(`career ${i} crashed:`, err && err.message);
  }
}

/* ─── Measure ─────────────────────────────────────────────────────────── */
const { rules, lines } = HALL;
const pct = (n, d) => (d ? Math.round((1000 * n) / d) / 10 : 0);
const share = (list, f) => (list.length ? list.filter(f).length / list.length : 0);
const inducted = careers.filter(c => c.rec.outcome === 'inducted').sort((a, b) => a.score - b.score);
const third = Math.floor(inducted.length / 3);
const fbLow = share(inducted.slice(0, third), c => c.rec.firstBallot);
const fbHigh = share(inducted.slice(inducted.length - third), c => c.rec.firstBallot);
/* Score deciles of the real Hall of Famers, and every cut between two of
   them: the first ballot share of all the deciles above the cut minus all
   those below. Each of the nine cuts must open a gap, so the share rises
   across the whole ladder of deciles, and neither side of a cut is one small
   decile on its own. */
const DECILES = 10;
const decile = k => inducted.slice(Math.floor((k * inducted.length) / DECILES), Math.floor(((k + 1) * inducted.length) / DECILES));
const decileShares = Array.from({ length: DECILES }, (_, k) => share(decile(k), c => c.rec.firstBallot));
const decileCuts = Array.from({ length: DECILES - 1 }, (_, k) => {
  const cut = Math.floor(((k + 1) * inducted.length) / DECILES);
  return share(inducted.slice(cut), c => c.rec.firstBallot) - share(inducted.slice(0, cut), c => c.rec.firstBallot);
});

// The audit table, read from the file the data files cite.
const doc = readFileSync(path.join(ROOT, 'docs/audits/US-HALL-RULES-2026-10.md'), 'utf8');
const tableBlock = doc.split('<!-- hall-table:start -->')[1].split('<!-- hall-table:end -->')[0];
const row = tableBlock.split(String.fromCharCode(10)).find(l => l.startsWith(`| ${SPORT} |`));
const cells = row.split('|').map(s => s.trim()).filter(Boolean);
const num = v => (v === 'none' ? null : Number(v));
const table = { waitSeasons: num(cells[1]), ballotYears: num(cells[2]), threshold: num(cells[3]), stayFloor: num(cells[4]), firstClassOffset: num(cells[5]), verifiedFromClass: num(cells[6]) };
const tableDiffs = Object.keys(table).filter(k => rules[k] !== table[k]);
const offsetMiss = careers.filter(c => c.rec.firstClass !== c.last + table.firstClassOffset).length;

// The ladder: synthetic Hall of Famers walked up the band, step by step.
const SEED = process.env.SIM_SEED || 'base';
const STEPS = 10, PER_STEP = 4000;
const ladder = [];
for (let k = 0; k < STEPS; k += 1) {
  const score = lines.hofLine + ((k + 0.5) / STEPS) * (lines.firstBallotScore - lines.hofLine);
  let fb = 0;
  for (let j = 0; j < PER_STEP; j += 1) {
    if (eng.runHallBallot(rules, lines, { key: `ladder:${SEED}:${k}:${j}`, hof: true, score, lastSeasonYear: 2030 }).firstBallot) fb += 1;
  }
  ladder.push(fb / PER_STEP);
}
const ladderSteps = ladder.slice(1).map((v, k) => v - ladder[k]);
let promiseMiss = 0, promiseN = 0;
for (let j = 0; j < 500; j += 1) {
  promiseN += 1;
  if (!eng.runHallBallot(rules, lines, { key: `top:${SEED}:${j}`, hof: true, score: lines.firstBallotScore + (j % 200), lastSeasonYear: 2030 }).firstBallot) promiseMiss += 1;
}
for (const c of careers) if (c.hof && c.score >= lines.firstBallotScore) { promiseN += 1; if (!c.rec.firstBallot) promiseMiss += 1; }

// Ballot sides.
let sideMiss = 0;
for (const c of careers) {
  const r = c.rec;
  if (rules.ballotYears !== null && r.ballots.length > rules.ballotYears) sideMiss += 1;
  r.ballots.forEach((b, j) => {
    if (b.elected ? b.share < rules.threshold : b.share >= rules.threshold) sideMiss += 1;
    if (b.classYear !== r.firstClass + j) sideMiss += 1;
  });
  const early = r.outcome === 'fellOff' && rules.ballotYears !== null && r.ballots.length < rules.ballotYears;
  if (early && !(rules.stayFloor !== null && r.ballots.at(-1).share < rules.stayFloor)) sideMiss += 1;
}

/* The three answers, held to their button words on these careers. Retire now:
   the season he answered after was his last. One more year: he plays the next
   season. Farewell: exactly one more season, marked as the farewell, then done. */
let answerMiss = 0;
const answered = { retireNow: 0, oneMore: 0, farewell: 0 };
for (const c of careers) {
  const a = c.answer;
  if (!a) continue;
  answered[a.choice] += 1;
  if (a.choice === 'retireNow' && c.last !== a.year) answerMiss += 1;
  if (a.choice === 'oneMore' && !(c.last > a.year)) answerMiss += 1;
  if (a.choice === 'farewell' && (c.last !== a.year + 1 || !a.flagged)) answerMiss += 1;
}

/* The stay floor read on 20000 synthetic candidates from the nomination line
   up, so a share shown at exactly the floor (a raw 4.96 printed 5.0 stays on)
   comes up hundreds of times a run instead of once or twice in the careers. */
let atFloor = 0;
if (rules.stayFloor !== null) {
  for (let j = 0; j < 20000; j += 1) {
    const score = lines.hofLine * (0.5 + 0.3 * ((j % 200) / 200));
    const r = eng.runHallBallot(rules, lines, { key: `floor:${SEED}:${j}`, hof: false, score, lastSeasonYear: 2030 });
    r.ballots.forEach((b, k) => {
      if (b.share === rules.stayFloor) atFloor += 1;
      if (k < r.ballots.length - 1 && b.share < rules.stayFloor) sideMiss += 1;
    });
    const early = r.outcome === 'fellOff' && rules.ballotYears !== null && r.ballots.length < rules.ballotYears;
    if (early && !(r.ballots.at(-1).share < rules.stayFloor)) sideMiss += 1;
  }
}

// The jersey, read independently: most seasons, ties to games, then the first club.
const club = seasons => {
  const t = new Map();
  seasons.forEach((s, i) => { if (!s.team || !(s.games > 0)) return; const e = t.get(s.team) ?? { team: s.team, seasons: 0, games: 0, first: i }; e.seasons += 1; e.games += s.games; t.set(s.team, e); });
  return [...t.values()].sort((a, b) => b.seasons - a.seasons || b.games - a.games || a.first - b.first)[0] ?? null;
};
let jerseyMiss = 0, jerseys = 0, jerseyRaw = 0;
for (const c of careers) {
  const best = club(c.seasons);
  const promised = lines.jerseyScore !== null && c.score >= lines.jerseyScore;
  const due = best && (promised || (c.rec.outcome === 'inducted' && best.seasons >= 5) || (best.seasons >= 12 && c.score >= lines.hofLine * 0.85));
  const want = c.numberRetiredBy
    ? { team: c.numberRetiredBy.team, seasons: c.allSeasons.filter(s => s.team === c.numberRetiredBy.team).length }
    : due ? { team: best.team, seasons: best.seasons } : null;
  const got = c.rec.jersey ? { team: c.rec.jersey.team, seasons: c.rec.jersey.seasons } : null;
  if (JSON.stringify(want) !== JSON.stringify(got)) jerseyMiss += 1;
  // The card names the club with the engine's own label, never a bare abbreviation it knows.
  if (c.rec.jersey && c.rec.jersey.teamName !== eng.LABEL(c.rec.jersey.team, c.eraId)) jerseyMiss += 1;
  // A bare abbreviation on the card. Not "name equals id": a club abroad (an MLB career's
  // seasons in Japan, "Yomiuri Giants") already carries its full name as its id.
  if (c.rec.jersey && /^[A-Z]{2,4}$/.test(c.rec.jersey.teamName ?? c.rec.jersey.team)) jerseyRaw += 1;
  if (c.rec.jersey) jerseys += 1;
}

const iffMiss = careers.filter(c => (c.rec.outcome === 'inducted') !== c.hof || c.rec.score !== c.score).length;

/* The outcome of every career outside the Hall, read from the rule as the
   card prints it. Off the ballot exactly under half the Hall line (the game
   rule nominationShare, 0.5). On the ballot: where the Hall has a ballot limit
   every one falls off, and only the last ballot may sit under the stay floor;
   where it claims no limit nobody falls off, so he is still waiting. */
const NOMINATION = 0.5;
let outcomeMiss = 0, onBallotOut = 0, offBallot = 0, earlyFalls = 0;
for (const c of careers) {
  const r = c.rec;
  if (r.outcome === 'inducted') continue;
  const off = c.score < NOMINATION * lines.hofLine;
  if (off) {
    offBallot += 1;
    if (r.outcome !== 'notOnBallot' || r.ballots.length !== 0) outcomeMiss += 1;
    continue;
  }
  onBallotOut += 1;
  if (r.ballots.length === 0) { outcomeMiss += 1; continue; }
  const want = rules.ballotYears !== null ? 'fellOff' : 'waiting';
  if (r.outcome !== want) outcomeMiss += 1;
  if (rules.stayFloor !== null && r.ballots.slice(0, -1).some(b => b.share < rules.stayFloor)) outcomeMiss += 1;
  if (rules.ballotYears !== null && r.ballots.length < rules.ballotYears) {
    earlyFalls += 1;
    if (!(rules.stayFloor !== null && r.ballots.at(-1).share < rules.stayFloor)) outcomeMiss += 1;
  }
}
const notSame = careers.filter(c => !c.same).length;
const talked = share(careers, c => c.talks > 0);
const outcomes = {};
for (const c of careers) outcomes[c.rec.outcome] = (outcomes[c.rec.outcome] ?? 0) + 1;
const fbAll = share(inducted, c => c.rec.firstBallot);

console.log(`simCareerHall ${SPORT}: ${careers.length} careers, ${crashes} crashed, seed ${SEED}${CONTROL ? `, CONTROL ${CONTROL}` : ''}`);
console.log(`  hof ${pct(inducted.length, careers.length)}% (${inducted.length}), first ballot ${pct(fbAll * 1000, 1000)}% of them; bottom third ${pct(fbLow * 1000, 1000)}%, top third ${pct(fbHigh * 1000, 1000)}%`);
console.log(`  outcomes ${JSON.stringify(outcomes)}; jerseys ${jerseys}; talk reached ${pct(talked * 1000, 1000)}% of careers`);
console.log(`  ladder ${ladder.map(v => v.toFixed(3)).join(' ')}; smallest step ${Math.min(...ladderSteps).toFixed(3)}`);
console.log(`  deciles ${decileShares.map(v => v.toFixed(2)).join(' ')}; cuts ${decileCuts.map(v => v.toFixed(2)).join(' ')}; smallest cut ${Math.min(...decileCuts).toFixed(3)}`);
console.log(`  misses: iff ${iffMiss}, outcome ${outcomeMiss}, table [${tableDiffs.join(',')}], offset ${offsetMiss}, promise ${promiseMiss}/${promiseN}, draws ${hallDraws}, notSame ${notSame}, sides ${sideMiss}, talk ${talkMismatch}+${talkBeforeAge}, jersey ${jerseyMiss}`);
// Printed, not checked: careers under ten seasons with games (MLB's real ballot needs ten, which the model leaves to legacyOf).
const shortCareer = c => c.seasons.filter(s => s.games > 0).length < 10;
if (SPORT === 'mlb') console.log(`  under ten seasons played: ${careers.filter(c => shortCareer(c) && c.rec.outcome === 'inducted').length} inducted, ${careers.filter(c => shortCareer(c) && c.rec.ballots.length > 0 && c.rec.outcome !== 'inducted').length} on the ballot outside the Hall`);
const med = a => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : null; };
console.log(`  talk timing: talks a career, median ${med(careers.map(c => c.talks))}; first talk at ${med(careers.filter(c => c.firstTalkAge !== null).map(c => c.firstTalkAge))}; career ends at ${med(careers.map(c => c.finalAge))}; non finite scores ${careers.filter(c => !Number.isFinite(c.score)).length}`);

/* ─── Sections 9 to 14 (Round 1039): the board's own loop ────────────────
   The sections above run Round 915's loop on the engine. These run the
   board's: the real binding (SPORTB), its summer deal and answers
   (usCareerSummer.ts) and the talk exactly where the board asks it
   (usCareerRetirementFlow.ts). One offseason: the season, its progress, the
   hard stop or a chosen end, the deal (with the talk filter), the talk, then
   every card. Each career runs on its own stream (mulberry32 keyed to the
   seed and the career), so two policies on one career draw the same numbers
   until they really differ, and card answers come off a second stream. */
// The board loop costs about ten engine careers a career (the summer probes every later card), so it runs
// 400 careers a policy by default; SIM_BOARD_CAREERS=2000 is the long measuring run.
const BOARD_N = SKIP_BOARD ? 0 : Number(process.env.SIM_BOARD_CAREERS || Math.min(CAREERS, 400));
const FAREWELL_EFFECT = 'Next season is your last';
const hashStr = s => { let h = 0x811c9dc5 >>> 0; for (let k = 0; k < s.length; k += 1) { h ^= s.charCodeAt(k); h = Math.imul(h, 0x01000193) >>> 0; } return h >>> 0; };
const streamFor = key => {
  let a = hashStr(`${SEED}:${key}`);
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};
const ruleHolds = (c, X = eng) => {
  const SB = X.SPORTB, HALL = X.HALL;
  // Section 9's own reading of the talk rule, never through pendingTalk.
  const r = HALL.retirement;
  if (c.retired || !c.seasons.length || SB.shouldRetire(c)) return false;
  if (c.retirement?.farewellYear !== undefined || c.retirement?.retiredYear !== undefined) return false;
  const peak = Math.max(c.ovr, ...c.seasons.map(s => s.ovr));
  return c.age >= r.minAge && (peak - c.ovr >= r.dropFromPeak || c.ovr <= r.floor);
};
/* Policies. asks: the board's own talk. answer: what the talk gets. filter:
   the deal's filter (the board's, or section 9's own reading). */
const POLICIES = {
  oneMore: { asks: true, answer: () => 'oneMore', filter: (c, X) => X.talkDeckFilter(c, X.SPORTB.hall) },
  retireNow: { asks: true, answer: () => 'retireNow', filter: (c, X) => X.talkDeckFilter(c, X.SPORTB.hall) },
  farewell: { asks: true, answer: () => 'farewell', filter: (c, X) => X.talkDeckFilter(c, X.SPORTB.hall) },
  // Today's engine loop: no talk at all, the deck's retirement cards held out by section 9's own reading.
  noTalk: { asks: false, answer: () => null, filter: (c, X) => e => X.RETIREMENT_CARD_IDS.has(e.id) && ruleHolds(c, X) },
};
let probeCareers = 0;
const deckSeen = new Set(), farewellCards = new Set(), probedTimes = new Map();
// Section 11b: careers caught the moment the board asks the talk, before the answer.
const SEEK_N = 300, seekSnaps = [];
let seekOpen = true; // closed once 11b has read them, so sections 13 and 14 add none
function probeDeck(c, SB = eng.SPORTB) {
  // The deck as the engine builds it now, each answer tried on a copy, on throwaway streams.
  const keep = Math.random;
  Math.random = streamFor(`probe:${c.name}:${c.year}`);
  try {
    for (const e of SB.eventDeck(JSON.parse(JSON.stringify(c)), streamFor(`probe-deck:${c.name}:${c.year}`))) {
      deckSeen.add(e.id);
      // Each card's answers are tried on its first five deals: what an answer writes is the card's, not the career's.
      const n = probedTimes.get(e.id) ?? 0;
      if (n >= 5) continue;
      probedTimes.set(e.id, n + 1);
      e.options.forEach((o, k) => {
        const copy = JSON.parse(JSON.stringify(c));
        try { o.apply(copy, streamFor(`probe-apply:${c.name}:${c.year}:${e.id}:${k}`)); } catch { return; }
        if (copy.retirement?.farewellYear !== undefined && c.retirement?.farewellYear === undefined) farewellCards.add(e.id);
        if (o.effect === FAREWELL_EFFECT) farewellCards.add(e.id);
      });
    }
  } finally { Math.random = keep; }
}
function boardCareer(i, policyName, eraId, X = eng) {
  const policy = POLICIES[policyName];
  const SB = X.SPORTB;
  const keep = Math.random;
  Math.random = streamFor(`board:${eraId ?? 'default'}:${i}`);
  const pick = streamFor(`pick:${eraId ?? 'default'}:${i}`);
  const log = { offseasons: [], talks: [], deckFarewells: [], farewellSeasons: [], waitJersey: 0, waitWrote: 0, walkAway: null, endedBy: null, midTalks: 0 };
  try {
    const pos = E.positions[i % E.positions.length];
    const archs = X.ARCH[pos];
    const c = SB.startCareer(`Board ${i}`, pos, archs[i % archs.length], Math.random, null, eraId);
    let tq = null, banned = false;
    // The talk exactly where the board asks it: on the hub or before the next card. True when it ended the career.
    const askTalk = (year, at, o) => {
      if (o.talkAt !== null) return false;
      if (!policy.asks) { if (ruleHolds(c, X)) o.talkAt = at; return false; }
      if (!X.pendingTalk(c, SB.hall)) return false;
      if (seekOpen && policyName === 'oneMore' && X === eng && seekSnaps.length < SEEK_N) seekSnaps.push(JSON.parse(JSON.stringify(c)));
      o.talkAt = at;
      log.talks.push(year);
      if (at > 0) log.midTalks += 1;
      const choice = policy.answer();
      X.answerTalk(c, choice);
      if (choice !== 'retireNow') return false;
      c.retired = true; delete c.summer; log.endedBy = 'talk';
      return true;
    };
    for (let guard = 0; guard < 32 && !c.retired; guard += 1) {
      // The board rolls the next season's team quality when an offseason ends, never after a banned year.
      if (!banned) tq = SB.rollTeamQuality(tq, Math.random);
      banned = (c.suspendedSeasons ?? 0) > 0;
      if (banned) {
        c.suspendedSeasons -= 1;
        c.seasons.push(SB.suspendedLine(c));
        SB.progress(c, Math.random);
        /* The board's banned year: a chosen end still ends it, but there is no
           hard stop and no summer; the talk, if the rule holds, is asked on the hub. */
        const year = c.seasons.at(-1).year;
        if (X.isFarewellSeason(c.retirement, year)) log.farewellSeasons.push(year);
        if (X.endsAfterSeason(c, year)) { c.retired = true; log.endedBy = 'choice'; break; }
        const o = { year, talkAt: null, shown: [], banned: true };
        if (askTalk(year, 0, o)) break;
        log.offseasons.push(o);
        continue;
      }
      SB.campBattle(c, tq, Math.random);
      SB.simSeason(c, tq, Math.random);
      SB.progress(c, Math.random);
      const year = c.seasons.at(-1).year;
      if (X.isFarewellSeason(c.retirement, year)) log.farewellSeasons.push(year);
      if (SB.shouldRetire(c)) { c.retired = true; log.endedBy = 'stop'; break; }
      if (X.endsAfterSeason(c, year)) { c.retired = true; log.endedBy = 'choice'; break; }
      if (probeCareers < 150 && i < 150 && policyName === 'oneMore') probeDeck(c, SB);
      const filter = policy.filter(c, X);
      let ev = X.startSummer(c, SB, Math.random, filter);
      /* An offseason has the talk from the card it was asked before (talkAt):
         right after the deal, or, when a card's answer moved the rating into
         the rule, before the next card or on the hub when the summer is over.
         For the no talk loop, from where the rule first held. */
      const o = { year, talkAt: null, shown: [] };
      if (askTalk(year, 0, o)) break;
      let ended = false;
      while (ev) {
        o.shown.push(ev.id);
        const k = Math.floor(pick() * ev.options.length);
        if (ev.options[k].effect === FAREWELL_EFFECT && c.retirement?.farewellYear === undefined) log.deckFarewells.push(year);
        const waits = /wait until you are done/i.test(ev.options[k].label) && c.numberRetiredBy === undefined;
        if (ev.id === 'nhlB_walkAwayHealthy' && k === 0 && !log.walkAway) log.walkAway = { year };
        ev = X.answerSummerCard(c, SB, ev, k, Math.random, filter).next;
        if (waits) { log.waitJersey += 1; if (c.numberRetiredBy !== undefined) log.waitWrote += 1; }
        if (askTalk(year, o.shown.length, o)) { ended = true; break; }
      }
      if (ended) break;
      log.offseasons.push(o);
    }
    if (policyName === 'oneMore' && i < 150) probeCareers += 1;
    // Round 1051: the board stamps the calibration on the save that retires a career.
    if (!CAL1) X.stampHallCalibration(c);
    return { c, log };
  } finally {
    Math.random = keep;
  }
}


const strip = c => { const o = JSON.parse(JSON.stringify(c)); delete o.retirement; return JSON.stringify(o); };
const runs = { oneMore: [], retireNow: [], farewell: [], noTalk: [] };
let boardCrashes = 0;
for (let i = 0; i < BOARD_N; i += 1) {
  for (const p of Object.keys(runs)) {
    try { runs[p].push(boardCareer(i, p)); } catch (err) {
      boardCrashes += 1;
      if (boardCrashes <= 3) console.error(`board career ${i} (${p}) crashed:`, err && err.message);
    }
  }
}

/* 9. identity: one more year every time is today's loop, byte for byte, but
   for the answers block itself. */
let identityMiss = 0, identityTalks = 0;
for (let i = 0; i < Math.min(runs.oneMore.length, runs.noTalk.length); i += 1) {
  if (strip(runs.oneMore[i].c) !== strip(runs.noTalk[i].c)) identityMiss += 1;
  identityTalks += runs.oneMore[i].log.talks.length;
}

/* 10. ends: retire now ends on the talk's season; a farewell, at the talk or
   on a deck card, ends exactly one season later and that season is marked. */
let endsMiss = 0, endsRetire = 0, endsFarewell = 0, endsDeck = 0;
const lastOf = c => c.seasons.at(-1).year;
for (const { c, log } of runs.retireNow) {
  if (!log.talks.length) continue;
  endsRetire += 1;
  if (lastOf(c) !== log.talks[0] || log.endedBy !== 'talk') endsMiss += 1;
}
for (const { c, log } of runs.farewell) {
  if (!log.talks.length) continue;
  endsFarewell += 1;
  const want = log.talks[0] + 1;
  if (lastOf(c) !== want || !log.farewellSeasons.includes(want)) endsMiss += 1;
}
for (const p of Object.keys(runs)) {
  for (const { c, log } of runs[p]) {
    if (!log.deckFarewells.length) continue;
    // The talk's own farewell or retirement can come first only on the talk policies, and only before the card.
    if ((p === 'retireNow' || p === 'farewell') && log.talks.length && log.talks[0] < log.deckFarewells[0]) continue;
    endsDeck += 1;
    const want = log.deckFarewells[0] + 1;
    if (lastOf(c) !== want || !log.farewellSeasons.includes(want)) endsMiss += 1;
  }
}

/* 11. once: no offseason with the talk is offered a deck retirement card,
   and the board's list of those cards is every card whose answer announces
   a farewell, as the engine's own deck builders hand them out. */
let onceMiss = 0, talkOffseasons = 0, eligibleClashes = 0, midTalkOffseasons = 0, bannedTalkOffseasons = 0;
for (const p of ['oneMore', 'farewell', 'noTalk']) {
  for (const { log } of runs[p]) {
    for (const o of log.offseasons) {
      if (o.talkAt === null) continue;
      talkOffseasons += 1;
      if (o.talkAt > 0) midTalkOffseasons += 1;
      if (o.banned) bannedTalkOffseasons += 1;
      // Only the cards from the talk on: a card the talk came after was shown before it existed.
      if (o.shown.slice(o.talkAt).some(id => eng.RETIREMENT_CARD_IDS.has(id))) onceMiss += 1;
    }
  }
}
const listedHere = [...eng.RETIREMENT_CARD_IDS].filter(id => deckSeen.has(id));
const unlisted = [...farewellCards].filter(id => !eng.RETIREMENT_CARD_IDS.has(id));

/* 11b. seek (closing check fix, 2026-10-07). The loop above never meets a
   deck retirement card after the deal (they lift morale, so the later slots
   never take one), so it cannot see the seek time hold-out in
   seekSummerCard. This checks it on careers caught the moment the board asks
   the talk: a summer forged to stand on each deck retirement card the deck
   really holds then, at card 1 (a save restored on a card dealt before the
   talk) and at a later card (one the talk came in front of), with the talk
   pending and again after 'One more year'. The board's seek must never land
   on one. With no hold-out the same seek must land on it (met), so the check
   cannot pass on nothing. Control seekexclude. */
seekOpen = false;
const seekCaught = seekSnaps.length;
let seekMiss = 0, seekMet = 0, seekTried = 0;
const seekMetAt = [0, 0];
{
  const SB = eng.SPORTB;
  const keep = Math.random;
  try {
    seekSnaps.forEach((snap, j) => {
      for (const declined of [false, true]) {
        const base = JSON.parse(JSON.stringify(snap));
        if (declined) eng.answerTalk(base, 'oneMore');
        const year = base.summer?.year ?? eng.summerSeason(base);
        for (const id of eng.RETIREMENT_CARD_IDS) {
          for (const at of [0, 1]) {
            Math.random = streamFor(`seek:${j}:${id}:${at}:${declined}`);
            const forge = () => { const f = JSON.parse(JSON.stringify(base)); f.summer = { year, ids: [id, id], at }; return f; };
            // Only a card the deck really holds for this career now.
            if (!eng.summerCardAt(forge(), SB, at)) continue;
            seekTried += 1;
            const open = eng.seekSummerCard(forge(), SB, null);
            if (open && open.id === id) { seekMet += 1; seekMetAt[at] += 1; }
            const c = forge();
            const got = eng.seekSummerCard(c, SB, eng.talkDeckFilter(c, SB.hall));
            if (got && eng.RETIREMENT_CARD_IDS.has(got.id)) seekMiss += 1;
          }
        }
      }
    });
  } finally { Math.random = keep; }
}


/* 12. jersey: a club that retired the number on a deck card is the club the
   card names, even where another club has more seasons; a wait answer
   records nothing, so jerseyFor still decides (section 8 reads those). */
let jerseyRecMiss = 0, jerseyRecN = 0, jerseyRecElsewhere = 0, jerseySynMiss = 0, jerseySynN = 0, waitAnswers = 0, waitWrote = 0;
for (const p of Object.keys(runs)) {
  for (const { c, log } of runs[p]) {
    waitAnswers += log.waitJersey;
    waitWrote += log.waitWrote;
    if (!c.numberRetiredBy) continue;
    jerseyRecN += 1;
    const most = club(c.seasons);
    if (most && most.team !== c.numberRetiredBy.team) jerseyRecElsewhere += 1;
    const rec = eng.hallRecordFor(HALL, c);
    if (!rec.jersey || rec.jersey.team !== c.numberRetiredBy.team || rec.jersey.teamName !== eng.LABEL(c.numberRetiredBy.team, c.eraId)) jerseyRecMiss += 1;
  }
}
// Synthetic, every sport: the first club recorded, then twelve seasons somewhere else.
for (const { c } of runs.noTalk.slice(0, 300)) {
  if (!c.seasons.length) continue;
  const copy = JSON.parse(JSON.stringify(c));
  copy.numberRetiredBy = { team: copy.seasons[0].team, year: copy.seasons[0].year };
  for (let k = 0; k < 12; k += 1) copy.seasons.push({ ...copy.seasons.at(-1), team: 'ZZZ', year: copy.seasons.at(-1).year + 1, games: 80 });
  jerseySynN += 1;
  const rec = eng.hallRecordFor(HALL, copy);
  if (!rec.jersey || rec.jersey.team !== copy.seasons[0].team) jerseySynMiss += 1;
}

/* 13. era class: a class year (and the rule lines) only where the audit
   anchors the first class, read off the card the board renders. */
const auditFrom = table.verifiedFromClass;
const ERA_N = SKIP_BOARD ? 0 : Number(process.env.SIM_ERA_CAREERS || 100);
const YEAR_RE = /\b(19|20)\d\d\b/;
let eraMiss = 0;
const eraCounts = {};
const cardText = rec => eng.renderToStaticMarkup(eng.createElement(eng.HallOfFameCard, { record: rec, rules, onSpeech() {}, onDismiss() {} })).replace(/<[^>]+>/g, ' ');
const eraCheck = (rec, last, tag) => {
  const first = last + table.firstClassOffset;
  const text = cardText(rec);
  const side = first >= auditFrom ? 'above' : 'below';
  eraCounts[tag] ??= { below: 0, above: 0 };
  eraCounts[tag][side] += 1;
  if (side === 'above') {
    if (!text.includes(`Eligible from the Class of ${first}.`)) eraMiss += 1;
    rec.ballots.forEach((b, k) => { if (!text.includes(`${first + k}: `)) eraMiss += 1; });
  } else if (YEAR_RE.test(text) || hallRuleCount(text)) {
    eraMiss += 1;
  }
};
const hallRuleCount = text => eng.hallRuleLines(rules).filter(l => text.includes(l)).length;
for (const era of eng.ERAS) {
  for (let i = 0; i < ERA_N; i += 1) {
    const { c } = boardCareer(100000 + i, 'oneMore', era.id);
    eraCheck(eng.hallRecordFor(HALL, c), lastOf(c), era.id);
  }
}
// The boundary, both sides of it, on synthetic ballots.
for (const last of [auditFrom - table.firstClassOffset - 1, auditFrom - table.firstClassOffset]) {
  for (let j = 0; j < 50; j += 1) {
    for (const hof of [true, false]) {
      const rec = { ...eng.runHallBallot(rules, lines, { key: `era:${SEED}:${last}:${j}:${hof}`, hof, score: hof ? lines.hofLine + 3 * j : lines.hofLine * 0.7, lastSeasonYear: last }), jersey: null };
      eraCheck(rec, last, 'boundary');
    }
  }
}


/* 14. NHL balance (nhl only): the walk away card used to cap the rating at
   63 for the farewell year; now it writes the farewell and the year is played
   at the rating he has. The same careers on the same streams, built once with
   the old answer, measured against today's: the farewell season's own line
   and the legacy and Hall shift. Reported; the bands are from seeds. */
let balance = null;
if (SPORT === 'nhl' && !SKIP_BOARD) {
  const OLD_FROM = 'apply: (cc) => { announceFarewell(cc); cc.health = 100;';
  const OLD_TO = 'apply: (cc) => { cc.ovr = Math.min(cc.ovr, 63); cc.health = 100;';
  const oldPlugin = {
    name: 'old-walk-away',
    setup(b) {
      b.onLoad({ filter: /nhlCareerLifeB\.ts$/ }, args => {
        const src = readFileSync(args.path, 'utf8');
        if (!src.includes(OLD_FROM)) throw new Error('section 14: the walk away answer is not where it was, refusing to measure');
        return { contents: src.replace(OLD_FROM, OLD_TO), loader: 'ts' };
      });
    },
  };
  const OUT_OLD = path.join(os.tmpdir(), `career-hall-nhl-old-${process.pid}.mjs`);
  await build({
    stdin: { contents: entry, resolveDir: ROOT, loader: 'ts' },
    bundle: true, format: 'esm', platform: 'node', outfile: OUT_OLD, absWorkingDir: ROOT,
    logLevel: 'error', alias: { '@': './src' }, plugins: [oldPlugin], jsx: 'automatic', banner: { js: "import { createRequire as __hallRequire } from 'node:module'; const require = __hallRequire(import.meta.url);" },
  });
  const old = await import(pathToFileURL(OUT_OLD).href);
  try { unlinkSync(OUT_OLD); } catch { /* the temp file is only a copy */ }
  const nowRuns = [], oldRuns = [];
  // Its own count: the walk away answer comes in about one NHL career in thirteen.
  const N14 = Number(process.env.SIM_BALANCE_CAREERS || 800);
  for (let i = 0; i < N14; i += 1) {
    nowRuns.push(boardCareer(200000 + i, 'oneMore', undefined, eng));
    oldRuns.push(boardCareer(200000 + i, 'oneMore', undefined, old));
  }
  /* The farewell season itself is compared only where both builds took the
     walk away answer in the same offseason. They can part earlier: Round
     1038's deal sorts card 1's stand in by whether it moves the rating, and
     the old answer did (the cap), so the old build deals some summers
     differently. The legacy and Hall lines below are over every career. */
  const cases = [];
  let walkNow = 0;
  nowRuns.forEach((r, i) => {
    if (!r.log.walkAway) return;
    walkNow += 1;
    if (oldRuns[i].log.walkAway?.year !== r.log.walkAway.year) return;
    const y = r.log.walkAway.year + 1;
    const a = r.c.seasons.find(s => s.year === y), b = oldRuns[i].c.seasons.find(s => s.year === y);
    if (a && b) cases.push({ now: a, old: b, nowC: r.c, oldC: oldRuns[i].c });
  });
  const mean = xs => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0);
  const median = xs => { const s = [...xs].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : 0; };
  const legacyOf = (X, c) => X.LEGACY(c);
  balance = {
    cases: cases.length, walkNow,
    ptsNow: mean(cases.map(k => k.now.points ?? k.now.wins ?? 0)), ptsOld: mean(cases.map(k => k.old.points ?? k.old.wins ?? 0)),
    ovrNow: mean(cases.map(k => k.now.ovr)), ovrOld: mean(cases.map(k => k.old.ovr)),
    gamesNow: mean(cases.map(k => k.now.games)), gamesOld: mean(cases.map(k => k.old.games)),
    lineNow: cases[0] ? eng.SPORTB.statLine(cases[0].now, cases[0].nowC.pos) : '', lineOld: cases[0] ? old.SPORTB.statLine(cases[0].old, cases[0].oldC.pos) : '',
    caseLegacyNow: median(cases.map(k => legacyOf(eng, k.nowC).score)), caseLegacyOld: median(cases.map(k => legacyOf(old, k.oldC).score)),
    legacyNow: median(nowRuns.map(r => legacyOf(eng, r.c).score)), legacyOld: median(oldRuns.map(r => legacyOf(old, r.c).score)),
    hallNow: share(nowRuns, r => legacyOf(eng, r.c).hof), hallOld: share(oldRuns, r => legacyOf(old, r.c).hof),
  };
  console.log(`  14 balance: ${balance.walkNow} walk away farewells, ${balance.cases} taken the same offseason in both builds; that farewell season: OVR ${balance.ovrOld.toFixed(1)} -> ${balance.ovrNow.toFixed(1)}, games ${balance.gamesOld.toFixed(1)} -> ${balance.gamesNow.toFixed(1)}, points (wins for a goalie) ${balance.ptsOld.toFixed(1)} -> ${balance.ptsNow.toFixed(1)}`);
  console.log(`     first case's farewell line: old "${balance.lineOld}" now "${balance.lineNow}"`);
  console.log(`     median legacy of those careers ${balance.caseLegacyOld} -> ${balance.caseLegacyNow}; all careers median ${balance.legacyOld} -> ${balance.legacyNow}; Hall share ${(100 * balance.hallOld).toFixed(1)} -> ${(100 * balance.hallNow).toFixed(1)} percent`);
}

const sportIds = [...eng.RETIREMENT_CARD_IDS].filter(id => id.startsWith({ nfl: 'lifeB_', nba: 'nbaB_', mlb: 'mlbB_', nhl: 'nhlB_' }[SPORT]));
const deadIds = sportIds.filter(id => !deckSeen.has(id));
const eraBoundary = eraCounts.boundary ?? { below: 0, above: 0 };
console.log(`  board loop: ${BOARD_N} careers a policy, ${boardCrashes} crashed; talks answered one more year ${identityTalks}; identity misses ${identityMiss}`);
console.log(`  ends: retire now ${endsRetire}, talk farewells ${endsFarewell}, deck farewells ${endsDeck}, misses ${endsMiss}`);
console.log(`  once: ${talkOffseasons} offseasons with the talk (${midTalkOffseasons} asked mid-summer, ${bannedTalkOffseasons} after a banned year), ${onceMiss} offered a retirement card; listed ids seen ${listedHere.length}, unseen [${deadIds.join(',')}], farewell cards not listed [${unlisted.join(',')}] (decks probed on ${probeCareers} careers)`);
console.log(`  seek: ${seekCaught} talks caught in the board loop, ${seekTried} forged summers on a deck retirement card, ${seekMet} landed on it with no hold-out (at card 1 ${seekMetAt[0]}, at a later card ${seekMetAt[1]}), ${seekMiss} with the board's`);
console.log(`  jersey (deck): ${jerseyRecN} recorded, ${jerseyRecElsewhere} at a club other than the one with most seasons, ${jerseyRecMiss} misnamed; synthetic ${jerseySynN}, ${jerseySynMiss} missed; wait answers ${waitAnswers}, ${waitWrote} wrote a club`);
console.log(`  era: verified from the Class of ${auditFrom}; ${JSON.stringify(eraCounts)}; misses ${eraMiss}`);

/* ─── Sections 15 to 20 (Round 1051): the legacy recalibration ───────────
   These run on the engine careers of sections 1 to 8, each scored again per
   calibration (a shallow copy with the stamp set), so both arms are the same
   careers. */
const scoreOn = (c, cal) => eng.LEGACY({ ...c, retired: true, hallCal: cal });
/* One row a career, both calibrations on the same career: the population every
   mark, band and table of sections 16 to 19 is measured on (the answers loop
   of sections 1 to 8, never a loop that plays every career to the hard stop).
   SIM_DUMP_ROWS=<file> writes them out, which is how the marks were frozen. */
const AWARD_KEYS = LEGACY_INPUT[SPORT].awards;
// Today's table with every standout list taken out: the base and the old terms alone.
const NO_STANDOUT = { ...eng.WEIGHTS[eng.HALL_CALIBRATION], positions: Object.fromEntries(Object.entries(eng.WEIGHTS[eng.HALL_CALIBRATION].positions).map(([p, v]) => [p, { terms: v.terms }])) };
const rows = careers.map(k => {
  const one = scoreOn(k.c, 1), two = scoreOn(k.c, eng.HALL_CALIBRATION);
  const totals = eng.TOTALS(k.c);
  const plain = eng.legacyRead(NO_STANDOUT, { pos: k.pos, seasons: k.c.seasons.length, awards: Object.fromEntries(AWARD_KEYS.map(a => [a, k.c[a]])), totals }).score;
  return {
    hof2b: plain >= lines.hofLine,
    pos: k.pos, seasons: k.c.seasons.length, policy: k.policy,
    aw: Object.fromEntries(AWARD_KEYS.map(a => [a, k.c[a]])), t: eng.TOTALS(k.c),
    s1: one.score, hof1: one.hof, v1: one.verdict, s2: two.score, hof2: two.hof, v2: two.verdict,
    standout: two.standout ? { stat: two.standout.stat, credit: two.standout.credit } : null,
  };
});
if (process.env.SIM_DUMP_ROWS) writeFileSync(process.env.SIM_DUMP_ROWS, JSON.stringify(rows));
const medOf = xs => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : 0; };
const meanOf = xs => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0);
const W1 = eng.WEIGHTS[1], W2 = eng.WEIGHTS[eng.HALL_CALIBRATION];

/* 16. Never below (exact). The calibration 2 table contains calibration 1
   unchanged and only adds: the same awards and season weight, and each
   position's old terms first, in order. And on every engine career the score
   on 2 is at least the score on 1, the verdict tier is the same or higher,
   and a career in the Hall on 1 is in on 2. */
const sameJson = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const ruleAMiss = [];
if (!sameJson(W1.awards, W2.awards)) ruleAMiss.push('awards');
if (W1.season !== W2.season) ruleAMiss.push('season');
for (const pos of new Set([...E.positions, ...Object.keys(W1.positions), ...Object.keys(W2.positions)])) {
  const old = (W1.positions[pos] ?? W1.positions['*']).terms;
  const now = (W2.positions[pos] ?? W2.positions['*']).terms;
  if (!sameJson(old, now.slice(0, old.length))) ruleAMiss.push(`terms of ${pos}`);
}
// The tier order, read off the careers themselves: a verdict ranks by the lowest score that earned it.
const tierFloor = new Map();
for (const r of rows) for (const [s, v] of [[r.s1, r.v1], [r.s2, r.v2]]) tierFloor.set(v, Math.min(tierFloor.get(v) ?? Infinity, s));
let belowMiss = 0, movedUp = 0, newlyIn = 0, tierUp = 0;
for (const r of rows) {
  if (r.s2 < r.s1 || (r.hof1 && !r.hof2) || tierFloor.get(r.v2) < tierFloor.get(r.v1)) belowMiss += 1;
  if (r.s2 > r.s1) movedUp += 1;
  if (r.hof2 && !r.hof1) newlyIn += 1;
  if (tierFloor.get(r.v2) > tierFloor.get(r.v1)) tierUp += 1;
}
console.log(`  16 never below: table misses [${ruleAMiss.join(', ')}]; ${belowMiss} of ${rows.length} careers lower on 2; ${movedUp} moved up, ${tierUp} up a verdict tier, ${newlyIn} newly in the Hall`);

/* 19 (b). The Hall share by position on 1 and on 2, and the points paid (the
   legacy score is also the finished game's recorded score). */
const shareOf = (list, f) => (list.length ? (100 * list.filter(f).length) / list.length : 0);
const hall1 = shareOf(rows, r => r.hof1), hall2 = shareOf(rows, r => r.hof2);
console.log(`  19 (b) Hall share ${hall1.toFixed(1)} -> ${hall2.toFixed(1)} percent; legacy score median ${medOf(rows.map(r => r.s1))} -> ${medOf(rows.map(r => r.s2))}, mean ${meanOf(rows.map(r => r.s1)).toFixed(1)} -> ${meanOf(rows.map(r => r.s2)).toFixed(1)} (points paid)`);
console.log(`     by position: ${E.positions.map(p => { const m = rows.filter(r => r.pos === p); return `${p} ${shareOf(m, r => r.hof1).toFixed(1)} -> ${shareOf(m, r => r.hof2).toFixed(1)}`; }).join(', ')}`);

/* 15 (a). The version 1 recording: every save in the fixture, unstamped, reads
   today what the base's code told it, whole objects. */
const V1_FIXTURE = JSON.parse(readFileSync(path.join(ROOT, 'src/test/fixtures/careerHallV1.json'), 'utf8'));
const v1Saves = V1_FIXTURE.sports[SPORT] ?? [];
let v1ReplayMiss = 0;
for (const e of v1Saves) {
  const save = JSON.parse(JSON.stringify(e.save));
  if (JSON.stringify(eng.LEGACY(save)) !== JSON.stringify(e.legacy)) v1ReplayMiss += 1;
  if (JSON.stringify(eng.hallRecordFor(HALL, save)) !== JSON.stringify(e.hall)) v1ReplayMiss += 1;
}

/* 15 (d). The calibration 2 recording (scripts/data/careerHallV2.json): the
   sport's calibration 2 table and the two scoring rules, whole, and what each
   save of the version 1 fixture is told when it is stamped 2 (the score, the
   Hall call, the standout, and the Hall record without the card's sentence,
   which is copy). A career retired on calibration 2 keeps the ballot it was
   told, so once the release that first ships calibration 2 is out, this table
   is never edited again: a later change is calibration 3 beside it. Until
   then a deliberate change is recorded again with SIM_RECORD_V2=1, a run
   that never ends green. */
const V2_FILE = path.join(ROOT, 'scripts/data/careerHallV2.json');
const toldOn = cal => e => {
  const save = { ...JSON.parse(JSON.stringify(e.save)), retired: true, hallCal: cal };
  const l = eng.LEGACY(save);
  const { weighs: _copy, ...hall } = eng.hallRecordFor(HALL, save);
  return { id: e.id, score: l.score, hof: l.hof, standout: l.standout ?? null, hall };
};
const toldOn2 = toldOn(2);
const v2Now = { table: eng.WEIGHTS[2], readings: v1Saves.map(toldOn2) };
const v2RulesNow = { standoutTop: eng.LEGACY_GAME_RULES.standoutTop, standoutCap: eng.LEGACY_GAME_RULES.standoutCap };
const RECORD_V2 = process.env.SIM_RECORD_V2 === '1';
if (RECORD_V2) {
  if (CONTROL || CAL1) { console.error('SIM_RECORD_V2 records the tree as it is: no control, no SIM_CAL'); process.exit(2); }
  const file = existsSync(V2_FILE) ? JSON.parse(readFileSync(V2_FILE, 'utf8')) : { sports: {} };
  file.sports[SPORT] = v2Now;
  const body = Object.keys(ENGINES).filter(s => file.sports[s]).map(s => `    ${JSON.stringify(s)}: {\n      "table": ${JSON.stringify(file.sports[s].table)},\n      "readings": [\n${file.sports[s].readings.map(r => `        ${JSON.stringify(r)}`).join(',\n')}\n      ]\n    }`).join(',\n');
  const note = 'Round 1051: calibration 2 of the Hall of Fame legacy score as recorded, for section 15 (d) of scripts/simCareerHall.mjs. Per sport: the calibration 2 table whole, and what each save of src/test/fixtures/careerHallV1.json is told when stamped 2. Written by SIM_RECORD_V2=1 node scripts/simCareerHall.mjs <sport>; never edited by hand. Once the release that first ships calibration 2 is out, never recorded again: a career retired on calibration 2 keeps the ballot it was told, so a later change is calibration 3.';
  writeFileSync(V2_FILE, `{\n  "note": ${JSON.stringify(note)},\n  "rules": ${JSON.stringify(v2RulesNow)},\n  "sports": {\n${body}\n  }\n}\n`);
}
const V2_RECORDED = existsSync(V2_FILE) ? JSON.parse(readFileSync(V2_FILE, 'utf8')) : null;
const v2Was = V2_RECORDED?.sports?.[SPORT];
const v2TableSame = Boolean(v2Was) && sameJson(v2Was.table, v2Now.table) && sameJson(V2_RECORDED.rules, v2RulesNow);
const v2ReadMiss = v2Was ? v2Now.readings.filter((r, i) => !sameJson(r, v2Was.readings[i])).length + Math.abs(v2Now.readings.length - v2Was.readings.length) : v2Now.readings.length;
console.log(`  15 (d) calibration 2 as recorded: the table and the rules ${v2TableSame ? 'equal' : 'DIFFER FROM'} the recording; ${v2ReadMiss} of ${v2Now.readings.length} recorded saves are told something else on 2 (${v2Now.readings.filter(r => r.standout).length} of them with a standout)${RECORD_V2 ? '; RECORDED ON THIS RUN' : ''}`);

/* 15 (e), Round 1301. The calibration 3 recording (scripts/data/careerHallV3.json),
   the same promise for the next calibration: the sport's calibration 3 table
   whole, and what each save of the version 1 fixture is told when it is
   stamped 3. Football, basketball and baseball read 3 on their calibration 2
   table, so their recording of 3 is their recording of 2 line for line; the
   NHL's holds the marks measured on the 84 game season. Recorded with
   SIM_RECORD_V3=1 (a run that never ends green); once the release that first
   ships calibration 3 is out it is never recorded again, and a later change
   is calibration 4 beside it. */
const V3_FILE = path.join(ROOT, 'scripts/data/careerHallV3.json');
const v3Now = { table: eng.WEIGHTS[3], readings: v1Saves.map(toldOn(3)) };
const RECORD_V3 = process.env.SIM_RECORD_V3 === '1';
if (RECORD_V3) {
  if (CONTROL || CAL1) { console.error('SIM_RECORD_V3 records the tree as it is: no control, no SIM_CAL'); process.exit(2); }
  const file = existsSync(V3_FILE) ? JSON.parse(readFileSync(V3_FILE, 'utf8')) : { sports: {} };
  file.sports[SPORT] = v3Now;
  const body = Object.keys(ENGINES).filter(s => file.sports[s]).map(s => `    ${JSON.stringify(s)}: {\n      "table": ${JSON.stringify(file.sports[s].table)},\n      "readings": [\n${file.sports[s].readings.map(r => `        ${JSON.stringify(r)}`).join(',\n')}\n      ]\n    }`).join(',\n');
  const note = 'Round 1301: calibration 3 of the Hall of Fame legacy score as recorded, for section 15 (e) of scripts/simCareerHall.mjs. Per sport: the calibration 3 table whole, and what each save of src/test/fixtures/careerHallV1.json is told when stamped 3. Football, basketball and baseball read calibration 3 on their calibration 2 table; the NHL table holds the standout marks measured on the 84 game season. Written by SIM_RECORD_V3=1 node scripts/simCareerHall.mjs <sport>; never edited by hand. Once the release that first ships calibration 3 is out, never recorded again: a career retired on calibration 3 keeps the ballot it was told, so a later change is calibration 4.';
  writeFileSync(V3_FILE, `{\n  "note": ${JSON.stringify(note)},\n  "rules": ${JSON.stringify(v2RulesNow)},\n  "sports": {\n${body}\n  }\n}\n`);
}
const V3_RECORDED = existsSync(V3_FILE) ? JSON.parse(readFileSync(V3_FILE, 'utf8')) : null;
const v3Was = V3_RECORDED?.sports?.[SPORT];
const v3TableSame = Boolean(v3Was) && sameJson(v3Was.table, v3Now.table) && sameJson(V3_RECORDED.rules, v2RulesNow);
const v3ReadMiss = v3Was ? v3Now.readings.filter((r, i) => !sameJson(r, v3Was.readings[i])).length + Math.abs(v3Now.readings.length - v3Was.readings.length) : v3Now.readings.length;
console.log(`  15 (e) calibration 3 as recorded: the table and the rules ${v3TableSame ? 'equal' : 'DIFFER FROM'} the recording; ${v3ReadMiss} of ${v3Now.readings.length} recorded saves are told something else on 3 (${v3Now.readings.filter(r => r.standout).length} of them with a standout)${RECORD_V3 ? '; RECORDED ON THIS RUN' : ''}`);

/* 15 (b). Calibration 1 is the Round 123 formula: the four one line formulas
   restated here, independent of the tables, against legacyOf stamped 1 on
   every engine career. */
const V1_FORMULA = {
  nfl: (c, t) => { let s = c.rings * 80 + c.mvps * 230 + c.allPros * 150 + c.seasons.length * 11; if (c.pos === 'QB') s += t.passYds / 800 + t.passTd * 0.5; if (c.pos === 'RB') s += t.rushYds / 120; if (c.pos === 'WR') s += t.recYds / 140; return Math.round(s); },
  nba: (c, t) => Math.round(c.rings * 95 + c.mvps * 155 + c.finalsMvps * 90 + c.allNbas * 48 + c.seasons.length * 8 + t.pts / 430),
  mlb: (c, t) => { let s = c.rings * 85 + c.mvpCys * 220 + c.allStars * 70 + c.seasons.length * 9; s += c.pos === 'SP' ? t.wins * 0.5 + t.so / 70 : t.hr * 0.25 + t.rbi / 60; return Math.round(s); },
  nhl: (c, t) => { let s = c.cups * 85 + c.harts * 160 + c.connSmythes * 85 + c.allStars * 45 + c.seasons.length * 7; s += c.pos === 'G' ? t.wins / 6.5 : t.points / 18; return Math.round(s); },
};
let v1FormulaMiss = 0;
for (const k of careers) {
  const want = V1_FORMULA[SPORT](k.c, eng.TOTALS(k.c));
  const got = scoreOn(k.c, 1);
  if (got.score !== want || got.hof !== (want >= lines.hofLine) || 'standout' in got) v1FormulaMiss += 1;
}
/* 17. The standout, held to the measured ledger (scripts/data/careerHallMarks.json,
   written by scripts/genCareerHallMarks.mjs; its header says how to re-derive). */
const MARKS = JSON.parse(readFileSync(path.join(ROOT, 'scripts/data/careerHallMarks.json'), 'utf8'));
/* What the real anchors decided (section 18): a standout halved or dropped at
   a position, a base halved or dropped. They may only make things smaller,
   and each is recorded with its reason and its counts in the anchors file. */
const DECISIONS = (JSON.parse(readFileSync(path.join(ROOT, 'scripts/data/careerHallAnchors.json'), 'utf8')).decisions ?? []).filter(d => d.sport === SPORT);
const decided = (pos, kind, stat, action) => DECISIONS.some(d => d.pos === pos && d.kind === kind && (kind === 'base' || d.stat === stat) && d.action === action);
/* Round 1301. A sport's marks are those of the latest calibration that
   measured it again: the ledger's first block (`sports`) is calibration 2,
   and a later calibration that moved a sport's marks adds a block of its own
   under `calibrations` (the NHL on 3). A sport no later calibration moved
   reads the first block, and its table of today must then BE its calibration
   2 table, the same object (17 (b) holds that). */
const MARKS_CAL = (() => { for (let cal = eng.HALL_CALIBRATION; cal > 2; cal -= 1) if (MARKS.calibrations?.[String(cal)]?.sports?.[SPORT]) return cal; return 2; })();
const ML = MARKS_CAL === 2 ? MARKS.sports[SPORT] : MARKS.calibrations[String(MARKS_CAL)].sports[SPORT];
const TOP = eng.LEGACY_GAME_RULES.standoutTop, CAP = eng.LEGACY_GAME_RULES.standoutCap;
const tableCells = E.positions.flatMap(pos => (W2.positions[pos]?.standout ?? []).map(s => ({ pos, s })));
const inBand = (x, b) => x >= b.lo && x <= b.hi;

/* 17 (a). The marks, the tripwire for a later round that moves an engine's
   stats: the share of a position's careers at or over a from mark (about one
   in ten by construction), per cell and pooled, and the pooled share at or
   over a to mark. Never a per cell check on to (a count of 0 to 5). */
let fromHits = 0, toHits = 0, cellN = 0;
const cellOut = [];
for (const { pos, s } of tableCells) {
  const mine = rows.filter(r => r.pos === pos);
  const over = mine.filter(r => (r.t[s.stat] ?? 0) >= s.from).length;
  const cellShare = mine.length ? over / mine.length : 0;
  if (!inBand(cellShare, ML.bands.fromCell)) cellOut.push(`${pos} ${s.stat} ${(100 * cellShare).toFixed(1)}`);
  fromHits += over; toHits += mine.filter(r => (r.t[s.stat] ?? 0) >= s.to).length; cellN += mine.length;
}
const fromPooled = cellN ? fromHits / cellN : 0, toPooled = cellN ? toHits / cellN : 0;
const fromOk = cellOut.length === 0 && inBand(fromPooled, ML.bands.fromPooled);
const toOk = inBand(toPooled, ML.bands.toPooled);
console.log(`  17 (a) marks: ${tableCells.length} standout cells; at or over from, pooled ${(100 * fromPooled).toFixed(2)} percent (band ${(100 * ML.bands.fromPooled.lo).toFixed(2)} to ${(100 * ML.bands.fromPooled.hi).toFixed(2)}), cells out of ${(100 * ML.bands.fromCell.lo).toFixed(1)} to ${(100 * ML.bands.fromCell.hi).toFixed(1)}: [${cellOut.join(', ')}]; at or over to, pooled ${(100 * toPooled).toFixed(2)} percent (band ${(100 * ML.bands.toPooled.lo).toFixed(2)} to ${(100 * ML.bands.toPooled.hi).toFixed(2)})`);

/* 17 (b). The table is the ledger, exactly: the list is the half rule both
   ways (a family is on a position's list if and only if its from mark is
   above zero and at least half the sport's largest for that family, and it is
   not excluded by hand), every mark and label is the ledger's, every ramp
   clears the floor, and a family's own top may only be smaller than the rule's. */
const halfMiss = [];
if (eng.WEIGHTS[eng.HALL_CALIBRATION] !== eng.WEIGHTS[MARKS_CAL]) halfMiss.push(`the table of calibration ${eng.HALL_CALIBRATION} is not the table the ledger's block of calibration ${MARKS_CAL} measured (a new table needs a block of its own)`);
const famsAll =Object.keys(ML.positions[E.positions[0]].families).filter(f => !(f in MARKS.excluded[SPORT]));
const onTable = new Set(tableCells.map(c => `${c.pos}:${c.s.stat}`));
for (const f of famsAll) {
  const largest = Math.max(...E.positions.map(p => ML.positions[p].families[f].from));
  for (const pos of E.positions) {
    const m = ML.positions[pos].families[f];
    const due = largest > 0 && m.from > 0 && m.from >= MARKS.rules.half * largest;
    const dropped = decided(pos, 'standout', f, 'dropped');
    if (dropped ? (!due || onTable.has(`${pos}:${f}`)) : due !== onTable.has(`${pos}:${f}`)) halfMiss.push(`${pos} ${f} ${dropped ? 'dropped by the anchors and still on the list (or never due)' : due ? 'due and missing' : 'on the list and not due'}`);
  }
}
const flatRamps = [];
for (const { pos, s } of tableCells) {
  const m = ML.positions[pos]?.families[s.stat];
  if (!m || s.stat in MARKS.excluded[SPORT]) { halfMiss.push(`${pos} ${s.stat} is not a family of the ledger`); continue; }
  if (s.from !== m.from || s.to !== m.to || s.label !== MARKS.labels[SPORT][s.stat]) halfMiss.push(`${pos} ${s.stat} off the ledger's marks`);
  // Round 1301: the generator's own allowance (its sigUp rounds a floor up less 1e-9). 720 times 1.10 is 792.0000000000001 in a double, and 792 is the floor.
  if (!(s.to >= s.from * MARKS.rules.rampFloor - 1e-9)) halfMiss.push(`${pos} ${s.stat} ramp under the floor`);
  // A family's own top exists only where the anchors halved it, and is exactly half.
  if ((s.top !== undefined) !== decided(pos, 'standout', s.stat, 'halved') || (s.top !== undefined && s.top !== TOP / 2)) halfMiss.push(`${pos} ${s.stat} top ${s.top} against the anchors' decisions`);
  const perSeason = s.from / Math.max(1, ML.positions[pos].medianSeasons);
  flatRamps.push(`${pos} ${s.stat} ${((s.to - s.from) / perSeason).toFixed(1)}s x${(s.to / Math.max(1, m.median)).toFixed(2)}${m.floored ? ' floor' : ''}${s.top !== undefined ? ` top ${s.top}` : ''}`);
}
console.log(`  17 (b) half rule and ledger: ${halfMiss.length} misses [${halfMiss.slice(0, 6).join('; ')}]`);
console.log(`     ramps (width in seasons at the from mark's own rate, to over the median): ${flatRamps.join(', ')}`);

/* 17 (c). The outcome: among each cell's top 5 percent by that family, the
   Hall share on 2 against 1, pooled over the cells calibration 1 left under
   90 percent in (pooled, so no single small cell decides it). Printed too:
   how many careers the standout alone carries over the first ballot line. */
let gIn1 = 0, gIn2 = 0, gN = 0, sIn = 0, sOut = 0, sN = 0;
const cellGains = [];
for (const { pos, s } of tableCells) {
  const mine = rows.filter(r => r.pos === pos).sort((x, y) => (y.t[s.stat] ?? 0) - (x.t[s.stat] ?? 0));
  const top = mine.slice(0, Math.ceil(ML.outcome.topShare * mine.length));
  const a = top.filter(r => r.hof1).length, b = top.filter(r => r.hof2).length;
  if (top.length) cellGains.push(`${pos} ${s.stat} ${Math.round((100 * a) / top.length)}>${Math.round((100 * b) / top.length)}`);
  // The standout's own part: in on 2, against the same score with the standout taken out.
  sIn += b; sOut += top.filter(r => r.hof2b).length; sN += top.length;
  if (!top.length || a / top.length >= ML.outcome.covered) continue;
  gIn1 += a; gIn2 += b; gN += top.length;
}
const pooledGain = gN ? (gIn2 - gIn1) / gN : 0;
const standoutGain = sN ? (sIn - sOut) / sN : 0;
const firstLine = lines.firstBallotScore;
const liftedFirst = rows.filter(r => r.s2 >= firstLine && r.s1 < firstLine);
console.log(`  17 (c) outcome: top 5 percent by family, Hall share on 1 > on 2: ${cellGains.join(', ')}`);
console.log(`     pooled over the cells under ${100 * ML.outcome.covered} percent on 1: ${gIn1} -> ${gIn2} of ${gN} careers, a gain of ${(100 * pooledGain).toFixed(1)} points (needs ${(100 * ML.outcome.pooledGain.floor).toFixed(1)}); over the first ballot line (${firstLine}) on 2 and not on 1: ${liftedFirst.length} careers (${liftedFirst.filter(r => !r.hof1).length} of them newly in the Hall)`);
console.log(`     the standout's own part, every cell: ${sOut} in with the standout taken out, ${sIn} with it, of ${sN}, a gain of ${(100 * standoutGain).toFixed(1)} points (needs ${(100 * ML.outcome.standoutGain.floor).toFixed(1)})`);

/* 17 (d). The cap and the single family, exact: the score on 2 restated here
   (awards, seasons, the terms, and only the largest standout credit, never
   over the rule's top times its cap) against legacyOf on every career. */
let capMiss = 0, paidCareers = 0;
for (const k of careers) {
  const t = eng.TOTALS(k.c);
  const p = W2.positions[k.pos] ?? W2.positions['*'];
  let best = 0, bestStat = null;
  for (const s of p.standout ?? []) {
    const credit = (s.top ?? TOP) * Math.min(CAP, Math.max(0, ((t[s.stat] ?? 0) - s.from) / (s.to - s.from)));
    if (credit > best) { best = credit; bestStat = s.stat; }
  }
  let aw = 0;
  for (const a of AWARD_KEYS) aw += k.c[a] * W2.awards[a];
  let production = 0;
  for (const term of p.terms) production += (t[term.stat] ?? 0) / term.per;
  const got = scoreOn(k.c, eng.HALL_CALIBRATION);
  if (got.score !== Math.round(aw + k.c.seasons.length * W2.season + production + best) || (got.standout?.stat ?? null) !== bestStat || best > TOP * CAP + 1e-9 || (got.standout ? Math.abs(got.standout.credit - best) > 1e-9 : best > 0)) capMiss += 1;
  if (best > 0) paidCareers += 1;
}
console.log(`  17 (d) cap: ${capMiss} of ${careers.length} careers off the restated score on 2; the standout paid on ${paidCareers}`);

/* 19 (a). The base: the table's added terms are the ledger's, the median
   career of each base position earns what was measured, and a position the
   ledger gives no base has none (the kicker). */
const baseOf = pos => (W2.positions[pos] ?? W2.positions['*']).terms.slice((W1.positions[pos] ?? W1.positions['*']).terms.length);
const baseMiss = [], baseSeen = [];
for (const pos of Object.keys(ML.base)) {
  if (!decided(pos, 'base', null, 'dropped')) continue;
  baseSeen.push(`${pos} dropped by the anchors`);
  if (baseOf(pos).length) baseMiss.push(`${pos} keeps a base the anchors dropped`);
}
for (const [pos, band] of Object.entries(ML.outcome.baseCredit)) {
  const terms = baseOf(pos);
  if (!sameJson(terms, ML.base[pos].map(t => ({ stat: t.stat, per: t.per })))) baseMiss.push(`${pos} terms off the ledger`);
  const med = medOf(rows.filter(r => r.pos === pos).map(r => terms.reduce((s, t) => s + (r.t[t.stat] ?? 0) / t.per, 0)));
  baseSeen.push(`${pos} ${med.toFixed(1)} (${band.lo.toFixed(1)} to ${band.hi.toFixed(1)})`);
  if (!inBand(med, band)) baseMiss.push(`${pos} median base credit ${med.toFixed(1)}`);
}
for (const pos of E.positions) if (!ML.base[pos] && baseOf(pos).length) baseMiss.push(`${pos} has a base the ledger does not`);
for (const d of DECISIONS) if (d.kind === 'base' && d.action !== 'dropped') baseMiss.push(`${d.pos}: a base decision the harness does not know (${d.action})`);
console.log(`  19 (a) base: median base credit ${baseSeen.join(', ') || 'no base position in this sport'}; misses [${baseMiss.join('; ')}]`);
/* 19 (c). The words. The "?" lines carry the rule's own numbers; the worked
   example holds on the engine (an ordinary career of the example's position,
   then the same career with the example's family at its to mark, scores at
   least the push more on 2 and not on 1); the example family kept the full
   push and its to mark is the 99th percentile, so "more than 99 of 100" is
   true; and the ballot card prints the voters' line for a career on
   calibration 2 (naming the standout when one counted) and nothing for a
   career on calibration 1. */
const WORDS = eng.WORDS;
const wordMiss = [], exampleSeen = [];
const helpRules = eng.hallVoterRulesFor(WORDS, W2);
if (helpRules.length !== 2) wordMiss.push('the "?" does not add exactly two lines');
if (!helpRules[0]?.includes(`up to ${Math.round(TOP * CAP)} legacy points`)) wordMiss.push('rule 1 does not carry the cap');
if (/[\u2013\u2014]/.test(helpRules.join(' ') + WORDS.weighs)) wordMiss.push('a dash in the copy');
for (const pos of WORDS.example.positions) {
  const s = (W2.positions[pos]?.standout ?? []).find(x => x.stat === WORDS.example.stat);
  if (!s) { wordMiss.push(`${pos} ${WORDS.example.stat} is not a standout of the table`); continue; }
  const push = s.top ?? TOP;
  if (s.top !== undefined) wordMiss.push(`${pos} ${s.stat} did not keep the full push`);
  if (ML.positions[pos].families[s.stat].floored) wordMiss.push(`${pos} ${s.stat}: its to mark is the ramp floor, not the 99th percentile`);
  if (!helpRules[1]?.includes(`at least ${push} legacy points more`)) wordMiss.push(`rule 2 does not say the push of ${pos} ${s.stat} (${push})`);
  if (!helpRules[1]?.includes(`more ${s.label} than 99 of 100`)) wordMiss.push(`rule 2 does not name the card's own noun (${s.label})`);
  // An ordinary career: the median by this family among the position's careers no standout paid.
  const plain = rows.filter(r => r.pos === pos && !r.standout).sort((a, b) => (a.t[s.stat] ?? 0) - (b.t[s.stat] ?? 0));
  const typical = plain[Math.floor(plain.length / 2)];
  if (!typical) { wordMiss.push(`${pos}: no ordinary career to try the example on`); continue; }
  const facts = { pos, seasons: typical.seasons, awards: typical.aw, totals: typical.t };
  const lifted = { ...facts, totals: { ...typical.t, [s.stat]: s.to } };
  const gain2 = eng.legacyRead(W2, lifted).score - eng.legacyRead(W2, facts).score;
  const gain1 = eng.legacyRead(W1, lifted).score - eng.legacyRead(W1, facts).score;
  exampleSeen.push(`${pos} ${s.stat} ${typical.t[s.stat]} to ${s.to}: +${gain2} on 2, +${gain1} on 1`);
  if (!(gain2 >= push) || !(gain1 < push)) wordMiss.push(`${pos} ${s.stat}: the example gains ${gain2} on 2 and ${gain1} on 1`);
}
// The card's line, on every engine career, both calibrations, restated here from the table. A standout is
// said only from standoutSaid whole points up (a push of a point or two was called "a real push" before
// the review of 2026-10-08). With none said, the second sentence names the position's own terms and no
// other stat the sport's words can name, so the card cannot promise a stat the voters never see.
const SAID = eng.LEGACY_GAME_RULES.standoutSaid;
const readNouns = Object.values(WORDS.reads);
let lineMiss = 0, linesWithStandout = 0, quietStandouts = 0;
for (const k of careers) {
  const r1 = eng.hallRecordFor(HALL, { ...k.c, retired: true, hallCal: 1 });
  const r2 = eng.hallRecordFor(HALL, { ...k.c, retired: true, hallCal: eng.HALL_CALIBRATION });
  const st = scoreOn(k.c, eng.HALL_CALIBRATION).standout ?? null;
  if ('weighs' in r1) lineMiss += 1;
  if (typeof r2.weighs !== 'string' || !r2.weighs.startsWith(`${WORDS.weighs} Then your seasons`)) { lineMiss += 1; continue; }
  if (st && Math.round(st.credit) >= SAID) {
    linesWithStandout += 1;
    if (!r2.weighs.endsWith(`and your ${eng.formatNumber(st.total)} ${st.label} sat near the top of this game's books.`)) lineMiss += 1;
    continue;
  }
  if (st) quietStandouts += 1;
  const second = r2.weighs.slice(WORDS.weighs.length + 1);
  const own = WORDS.readsBy?.[k.pos];
  const terms = (W2.positions[k.pos] ?? W2.positions['*']).terms.map(t => WORDS.reads[t.stat]);
  if (second.includes('sat near the top')) lineMiss += 1;
  else if (own ? second !== own : !terms.length ? second !== 'Then your seasons.' : (terms.some(n => !n || !second.includes(n)) || readNouns.some(n => !terms.includes(n) && second.includes(n)))) lineMiss += 1;
}
// The floor itself, exact, on a made up standout a point under it and one on it (so the check does not wait for a career that happens to sit there).
{
  const exPos = WORDS.example.positions[0];
  const exS = (W2.positions[exPos]?.standout ?? []).find(x => x.stat === WORDS.example.stat);
  if (!exS || !(SAID > 0)) wordMiss.push('no example family or no floor to try the card on');
  else {
    const under = { stat: exS.stat, label: exS.label, total: exS.from + 1, credit: SAID - 0.6 };
    if (eng.hallWeighLine(WORDS, W2, exPos, under).includes('sat near the top')) wordMiss.push(`a standout worth under ${SAID} points is said on the card`);
    if (!eng.hallWeighLine(WORDS, W2, exPos, { ...under, credit: SAID }).includes('sat near the top')) wordMiss.push(`a standout worth ${SAID} points is not said on the card`);
  }
}
// The longest line the table can print, in characters. The phone budget is four lines of small text at 390
// wide: the review of 2026-10-08 saw 219 characters run to five lines and 135 to three, and the browser walk
// (scripts/playCareerHallLine.mjs) counts the lines on the real card. This is the cheap tripwire beside it.
const LINE_BUDGET = 200;
let longestLine = '';
for (const [pos, p] of Object.entries(W2.positions)) {
  if (pos === '*') continue;
  for (const s of [null, ...(p.standout ?? [])]) {
    const line = eng.hallWeighLine(WORDS, W2, pos, s && { stat: s.stat, label: s.label, total: Math.round(s.from + (s.to - s.from) * CAP), credit: TOP });
    if (line.length > longestLine.length) longestLine = line;
  }
}
if (longestLine.length > LINE_BUDGET) wordMiss.push(`the longest card line is ${longestLine.length} characters (budget ${LINE_BUDGET})`);
// And on the card itself: the line is there for calibration 2, absent for 1 and on the folded card.
const sampleC = careers.find(k => scoreOn(k.c, eng.HALL_CALIBRATION).standout)?.c ?? careers[0]?.c;
const markupOf = (rec, folded = false) => eng.renderToStaticMarkup(eng.createElement(eng.HallOfFameCard, { record: rec, rules, folded, onSpeech() {}, onDismiss() {} }));
if (sampleC) {
  const rec2 = eng.hallRecordFor(HALL, { ...sampleC, retired: true, hallCal: eng.HALL_CALIBRATION });
  const rec1 = eng.hallRecordFor(HALL, { ...sampleC, retired: true, hallCal: 1 });
  if (!markupOf(rec2).includes('data-hall-weighs')) wordMiss.push('the card does not print the line on calibration 2');
  if (markupOf(rec1).includes('data-hall-weighs')) wordMiss.push('the card prints the line on calibration 1');
  if (markupOf(rec2, true).includes('data-hall-weighs')) wordMiss.push('the folded card prints the line');
} else wordMiss.push('no career to render');
console.log(`  19 (c) words: example ${exampleSeen.join('; ')}; card lines off ${lineMiss} of ${2 * careers.length} records (${linesWithStandout} name a standout, ${quietStandouts} had one worth under ${SAID} points and stay quiet); longest line the table can print ${longestLine.length} characters (budget ${LINE_BUDGET}); misses [${wordMiss.join('; ')}]`);
/* 18. The real anchors (scripts/data/careerHallAnchors.json): real career
   shapes, two sourced, and the ballot the real Hall gave them. Each is scored
   through the one scorer (legacyRead on the sport's table, the same sum
   section 17 (d) holds legacyOf to) on calibration 1 and on 2, and the ballot
   is the engine's own (runHallBallot) on 400 keyed copies, called first,
   later or never by the majority. Two readings, both printed: raw (the real
   line at real scale) and books (the anchor's family set to the table's to
   mark, the rest of his line scaled by the same factor, seasons capped at the
   hard stop). Ids only: no real name is printed. */
const ANCHOR_FILE = process.env.SIM_ANCHOR_FILE || path.join(ROOT, 'scripts/data/careerHallAnchors.json');
let anchorText = readFileSync(path.join(ROOT, 'scripts/data/careerHallAnchors.json'), 'utf8');
if (CONTROL === 'anchorwiki') {
  // The control: one source host swapped for a wiki, in memory. It must change a byte or it proves nothing.
  // An anchor's own source (the first swap tried here hit a skipped name's link, which the shape check did not read, and the control did not fire).
  const HOST = 'https://www.baseball-reference.com/players/r/riverma01.shtml';
  if (!anchorText.includes(HOST)) { console.error('control anchorwiki: its string is not in the ledger, refusing to run'); process.exit(2); }
  const swapped = anchorText.replace(HOST, 'https://en.wikipedia.org/wiki/riverma01');
  if (swapped === anchorText) { console.error('control anchorwiki: the swap changed nothing, refusing to run'); process.exit(2); }
  anchorText = swapped;
  controlFired = true;
} else if (process.env.SIM_ANCHOR_FILE) anchorText = readFileSync(ANCHOR_FILE, 'utf8');
const ANCHORS = JSON.parse(anchorText);
const WIKI_HOSTS = ['wikipedia.org', 'wikiwand.com', 'fandom.com', 'wikimedia.org'];
const hostOf = u => { try { return new URL(u).hostname.toLowerCase(); } catch { return ''; } };
const isWiki = u => { const h = hostOf(u); return !h || h.includes('wiki') || WIKI_HOSTS.some(w => h.endsWith(w)); };
const BALLOTS = ['first', 'later', 'never'];
const shapeMiss = [];
if (!ANCHORS.selection?.writtenBeforeScoring || !(ANCHORS.selection?.rule?.length >= 5)) shapeMiss.push('the selection rule is missing');
if (!/^\d{4}-\d{2}-\d{2}$/.test(ANCHORS.read ?? '')) shapeMiss.push('no read date');
// The family lists and the skipped names cite pages too: no wiki there either.
for (const s of [...(ANCHORS.lists ?? []), ...(ANCHORS.skipped ?? []).filter(k => k.url)]) if (isWiki(s.url)) shapeMiss.push(`${s.family} ${s.player ?? 'list'}: a wiki source (${hostOf(s.url)})`);
for (const a of ANCHORS.anchors) {
  for (const group of ['line', 'awards', 'hall']) {
    const list = a.sources?.[group] ?? [];
    if (list.length < 2 || new Set(list.map(s => s.publisher)).size < 2) shapeMiss.push(`${a.id} ${group}: fewer than two publishers`);
    for (const s of list) {
      if (!s.publisher || !s.says || !/^\d{4}-\d{2}-\d{2}$/.test(s.read ?? '')) shapeMiss.push(`${a.id} ${group}: a source without its publisher, its words or its read date`);
      if (isWiki(s.url)) shapeMiss.push(`${a.id} ${group}: a wiki source (${hostOf(s.url)})`);
    }
  }
  if (!BALLOTS.includes(a.hall?.ballot) || !['main', 'committee'].includes(a.hall?.route)) shapeMiss.push(`${a.id}: ballot or route`);
  if (!(a.seasons > 0) || !(a.lastSeason > 1900) || !a.pos || !a.family) shapeMiss.push(`${a.id}: seasons, last season, position or family`);
  for (const [k, v] of Object.entries(a.totals ?? {})) if (v === null ? !a.nulls?.[k] : !(typeof v === 'number' && v >= 0)) shapeMiss.push(`${a.id}: total ${k}`);
  // Each anchor carries its own sport's award counts (the file holds every sport; this run reads one).
  for (const k of LEGACY_INPUT[a.sport]?.awards ?? ['no such sport']) if (!(Number.isInteger(a.awards?.[k]) && a.awards[k] >= 0)) shapeMiss.push(`${a.id}: award ${k}`);
}
const builtSports = ANCHORS.selection?.sportsBuilt ?? [];
const anchorsBuilt = builtSports.includes(SPORT);
const mine = ANCHORS.anchors.filter(a => a.sport === SPORT);
const counted = mine.filter(a => a.hall.route === 'main');
// A row is a man on a family list, so the counts the rule asks for are of men: a man on two lists is two rows and one man.
const menOf = list => new Set(list.map(a => a.player)).size;
const byBallot = Object.fromEntries(BALLOTS.map(b => [b, menOf(counted.filter(a => a.hall.ballot === b))]));
if (anchorsBuilt && (menOf(mine) < 8 || BALLOTS.some(b => byBallot[b] < 2))) shapeMiss.push(`${SPORT}: ${menOf(mine)} men in ${mine.length} rows, ${JSON.stringify(byBallot)} (needs 8 men and two of each ballot)`);
// A pair's second row names the first: the same man, another family, the same facts.
for (const a of mine.filter(x => x.sameAs)) {
  const first = mine.find(x => x.id === a.sameAs);
  if (!first || first.player !== a.player || first.family === a.family || JSON.stringify([first.totals, first.awards, first.hall, first.seasons]) !== JSON.stringify([a.totals, a.awards, a.hall, a.seasons])) shapeMiss.push(`${a.id}: its pair ${a.sameAs} is not the same man on another list with the same facts`);
}
for (const [player, n] of Object.entries(mine.reduce((m, a) => ({ ...m, [`${a.player}|${a.family}`]: (m[`${a.player}|${a.family}`] ?? 0) + 1 }), {}))) if (n > 1) shapeMiss.push(`${player}: the same man twice on one list`);
for (const a of mine.filter(x => !x.sameAs)) if (mine.some(x => x !== a && !x.sameAs && x.player === a.player)) shapeMiss.push(`${a.id}: a second row for the same man that names no pair`);
// The first eligible class outside baseball is arithmetic on a two sourced rule: the rule and its sources must be in the file.
if (anchorsBuilt && SPORT !== 'mlb') {
  const el = ANCHORS.eligibility?.[SPORT];
  if (!el?.rule || !(el.sources?.length >= 2) || new Set(el.sources.map(s => s.publisher)).size < 2 || el.sources.some(s => isWiki(s.url) || !s.says)) shapeMiss.push(`${SPORT}: the eligibility rule is not two sourced`);
  for (const a of counted) if (a.hall.ballot !== 'never' && (a.hall.ballot === 'first') !== (a.hall.class <= a.hall.firstEligibleClass)) shapeMiss.push(`${a.id}: ballot ${a.hall.ballot} against class ${a.hall.class} and first eligible ${a.hall.firstEligibleClass}`);
}
if (!anchorsBuilt && mine.length) shapeMiss.push(`${SPORT}: anchors in the file for a sport it says is not built`);

const HARD_STOP = { nfl: 19, nba: 21, mlb: 21, nhl: 22 }[SPORT];
const span = lines.firstBallotScore - lines.hofLine;
const firstFrom = Math.ceil(lines.hofLine + ((0.5 - 0.3) / 0.7) * span); // the score from which the majority call is first
const readAnchor = (a, W, facts, tag) => {
  const score = eng.legacyRead(W, facts).score;
  const hof = score >= lines.hofLine;
  let first = 0, later = 0;
  for (let j = 0; j < 400; j += 1) {
    const r = eng.runHallBallot(rules, lines, { key: `anchor:${a.id}:${tag}:${j}`, hof, score, lastSeasonYear: a.lastSeason });
    if (r.outcome === 'inducted') { if (r.firstBallot) first += 1; else later += 1; }
  }
  const call = !hof ? 'never' : first >= later ? 'first' : 'later';
  return { score, hof, call, chance: hof ? eng.firstBallotChance(score, lines) : 0 };
};
const anchorRows = [], callMiss = [];
for (const a of mine) {
  const totals = Object.fromEntries(Object.entries(a.totals).map(([k, v]) => [k, v ?? 0]));
  const raw = { pos: a.pos, seasons: a.seasons, awards: a.awards, totals };
  const cell = (W2.positions[a.pos]?.standout ?? []).find(s => s.stat === a.family);
  let books = null;
  if (a.fromList && cell && totals[a.family] > 0) {
    const factor = cell.to / totals[a.family];
    books = { pos: a.pos, seasons: Math.min(a.seasons, HARD_STOP), awards: a.awards, totals: Object.fromEntries(Object.entries(totals).map(([k, v]) => [k, k === a.family ? cell.to : Math.round(v * factor)])) };
  }
  const row = { a, books, raw, raw1: readAnchor(a, W1, raw, 'raw1'), raw2: readAnchor(a, W2, raw, 'raw2'), books1: books && readAnchor(a, W1, books, 'books1'), books2: books && readAnchor(a, W2, books, 'books2') };
  for (const k of ['raw1', 'raw2', 'books1', 'books2']) {
    const r = row[k];
    if (!r || !r.hof) continue;
    // (c) the binding and the ballot agree wherever the chance is clear of a coin toss.
    if ((r.chance < 0.4 && r.call !== 'later') || (r.chance > 0.6 && r.call !== 'first')) callMiss.push(`${a.id} ${k}`);
  }
  anchorRows.push(row);
}
const agree = (list, key) => ({
  n: list.filter(r => r[key]).length,
  inOut: list.filter(r => r[key] && (r.a.hall.ballot !== 'never') === r[key].hof).length,
  exact: list.filter(r => r[key] && r.a.hall.ballot === r[key].call).length,
});
const inCount = anchorRows.filter(r => r.a.hall.route === 'main');
const AG = { raw1: agree(inCount, 'raw1'), raw2: agree(inCount, 'raw2'), books1: agree(inCount, 'books1'), books2: agree(inCount, 'books2') };
const fmt = r => (r ? `${r.score} ${r.call}` : 'none');
// Moved past his real ballot: the engine's call on 2 is above the ballot the real Hall gave him (in for a
// real never, first for a real later) and its call on 1 was lower. The rule the anchors decide by names
// exactly this as the loss ("a real never pushed in, a real later pushed to first ballot"), and a count of
// agreements cannot see it when calibration 1 had the man out: wrong before, wrong after, the same count.
// So it is held exactly, in both readings: none. (Closing check, 2026-10-08: three real later men in
// football's books reading went from never on 1 to first on 2 and the count said nothing.)
const RANK = { never: 0, later: 1, first: 2 };
const movedPast = (r, was, now) => Boolean(was && now && RANK[now.call] > RANK[r.a.hall.ballot] && RANK[now.call] > RANK[was.call]);
const PAST = { raw: inCount.filter(r => movedPast(r, r.raw1, r.raw2)), books: inCount.filter(r => movedPast(r, r.books1, r.books2)) };
// What each agreement control can reach in this sport. Two counts for the reader: the real never or later
// men with a books reading (standoutbig needs one the push has not already sent in on the first ballot), and
// the men who agree on 2 by the push alone (standoutgone needs more than two: the band allows two under the
// recorded count). And the exact answer, which is what a control's refusal rests on: the band itself, asked of
// today's table with every push tripled and with every push switched off (the two tables those controls
// build, restated here). All four are recorded in the ledger and held to it on a run with no control.
const realNotFirst = inCount.filter(r => r.books2 && r.a.hall.ballot !== 'first').length;
const pushAlone = inCount.filter(r => {
  if (!r.books2 || !r.books) return false;
  const realIn = r.a.hall.ballot !== 'never';
  return realIn === r.books2.hof && realIn !== (eng.legacyRead(NO_STANDOUT, r.books).score >= lines.hofLine);
}).length;
const pushedTable = topOf => ({ ...W2, positions: Object.fromEntries(Object.entries(W2.positions).map(([pos, p]) => [pos, p.standout ? { ...p, standout: p.standout.map(s => ({ ...s, top: topOf(s) })) } : p])) });
const agreeOnTable = W => {
  const list = inCount.map(r => ({ a: r.a, raw2: readAnchor(r.a, W, r.raw, 'raw2'), books2: r.books && readAnchor(r.a, W, r.books, 'books2') }));
  return { raw2: agree(list, 'raw2'), books2: agree(list, 'books2'), past: inCount.filter((r, i) => movedPast(r, r.raw1, list[i].raw2) || movedPast(r, r.books1, list[i].books2)).length };
};
const measuredAg = ANCHORS.measured?.[SPORT];
const notFewer = (now, was) => now.inOut >= was.inOut && now.exact >= was.exact;
const nearMeasured = (now, m) => m && now.inOut >= m.inOut - 2 && now.exact >= m.exact - 2;
// The band the anchors check holds, as a question that can be asked of any table's agreement.
const bandHolds = ag => Boolean(ag.past === 0 && notFewer(ag.books2, AG.books1) && notFewer(ag.raw2, AG.raw1) && nearMeasured(ag.books2, measuredAg?.books2) && nearMeasured(ag.raw2, measuredAg?.raw2));
const bigFires = anchorsBuilt && !CONTROL ? !bandHolds(agreeOnTable(pushedTable(s => (s.top ?? TOP) * 3))) : null;
const goneFires = anchorsBuilt && !CONTROL ? !bandHolds(agreeOnTable(pushedTable(s => s.top ?? 0))) : null;
if (anchorsBuilt) {
  console.log(`  18 anchors: ${menOf(mine)} men in ${mine.length} rows (${JSON.stringify(byBallot)} men on the main ballot, ${mine.length - counted.length} by a committee, printed apart); the majority call is first from a score of ${firstFrom}`);
  if (!CONTROL) {
    const whyNotBig = realNotFirst === 0
      ? 'EVERY REAL TOP OF THE BOOKS CAREER HERE WENT STRAIGHT IN, so these anchors cannot say the push is too big in this sport: a green here is no proof that 300 is right'
      : 'THE REAL NEVER AND LATER MEN IN THE BOOKS READING GET THE SAME CALL WITH THE PUSH TRIPLED (the push at its present size already sends them in on the first ballot, or they are in on hardware), so tripling it cannot turn this red: a green here is no proof that 300 is not too big';
    console.log(`     what the agreement's controls can reach here: a real never or later in the books reading ${realNotFirst}, and the band with every push tripled ${bigFires ? 'breaks (standoutbig can fire)' : 'holds (standoutbig CANNOT fire)'}; agreeing on 2 by the push alone ${pushAlone}, and the band with every push switched off ${goneFires ? 'breaks (standoutgone can fire)' : 'holds (standoutgone CANNOT fire)'}${bigFires ? '' : `. ${whyNotBig}`}`);
  }
  for (const r of anchorRows) console.log(`     ${r.a.id} ${r.a.pos} ${r.a.family} real ${r.a.hall.ballot}${r.a.hall.route === 'committee' ? ' (committee later, outside the count)' : ''}: raw ${fmt(r.raw1)} > ${fmt(r.raw2)}; books ${fmt(r.books1)} > ${fmt(r.books2)}${r.books2 ? '' : ' (raw only: his position does not carry the family, or he is not off a list)'}`);
  console.log(`     agreement, in or out and exact ballot, calibration 1 > 2: raw ${AG.raw1.inOut} > ${AG.raw2.inOut} and ${AG.raw1.exact} > ${AG.raw2.exact} of ${AG.raw1.n}; books ${AG.books1.inOut} > ${AG.books2.inOut} and ${AG.books1.exact} > ${AG.books2.exact} of ${AG.books1.n}; decisions the anchors made: ${JSON.stringify((ANCHORS.decisions ?? []).filter(d => d.sport === SPORT).map(d => `${d.pos} ${d.what} ${d.action}`))}`);
  console.log(`     moved past his real ballot by calibration 2 (in for a real never, first for a real later, and read lower on 1), must be none: raw [${PAST.raw.map(r => r.a.id).join(', ')}], books [${PAST.books.map(r => r.a.id).join(', ')}]`);
} else {
  console.log(`  18 anchors: NOT BUILT FOR ${SPORT.toUpperCase()} (${ANCHORS.selection?.sportsNotBuilt?.[SPORT] ?? 'no reason recorded'}). Nothing here says the standout or the base agrees with real careers in this sport.`);
}
// A control aimed at the agreement refuses where it cannot fire, so a run that could not go red is never read as a green.
// The refusal rests on what a run with no control recorded (the band asked of the very table the control builds).
if (CONTROL === 'standoutbig' || CONTROL === 'standoutgone') {
  const can = !anchorsBuilt ? null : CONTROL === 'standoutbig' ? measuredAg?.standoutbigFires === true : measuredAg?.standoutgoneFires === true;
  if (!can) {
    console.error(`simCareerHall ${SPORT} CONTROL ${CONTROL}: REFUSED, it cannot fire in this sport (${!anchorsBuilt ? 'its real anchors are not built' : CONTROL === 'standoutbig' ? `the band holds with every push tripled: the books reading holds ${measuredAg?.realNotFirstInBooks ?? 0} real never or later men, and no call of theirs moves past the band` : `the band holds with every push switched off: ${measuredAg?.pushAlone ?? 0} anchors agree on 2 by the push alone and the band allows two`})`);
    process.exit(2);
  }
}
if (CONTROL === 'decisionback' && !DECISIONS.some(d => d.kind === 'standout')) {
  console.error(`simCareerHall ${SPORT} CONTROL decisionback: REFUSED, the anchors took no standout back in this sport`);
  process.exit(2);
}
// On a run with no control the recorded reach must be today's, or a refusal above would rest on a stale file.
const reachOk = Boolean(CONTROL) || (measuredAg?.realNotFirstInBooks === realNotFirst && measuredAg?.pushAlone === pushAlone && measuredAg?.standoutbigFires === bigFires && measuredAg?.standoutgoneFires === goneFires);
const anchorsOk = !anchorsBuilt || (AG.books1.n > 0 && reachOk && PAST.raw.length === 0 && PAST.books.length === 0 && notFewer(AG.books2, AG.books1) && notFewer(AG.raw2, AG.raw1) && nearMeasured(AG.books2, measuredAg?.books2) && nearMeasured(AG.raw2, measuredAg?.raw2));
const HALL_STOP = 0.45; // the brief's hard stop: a sport over 45 percent in is the lead's call, never a band to widen
const hallShareOk = hall2 >= hall1 && hall2 / 100 <= Math.min(ML.outcome.hallCeiling, HALL_STOP);

/* 15 (c). Who is read on which calibration, exact: a valid stamp wins; with
   none a retired career is 1 and a live one is today's; a junk stamp is no
   stamp. And on every engine career the legacy follows that rule. */
const CAL_NOW = eng.HALL_CALIBRATION;
const calCases = [
  [{ retired: true }, 1], [{ retired: false }, CAL_NOW], [{}, CAL_NOW],
  [{ retired: true, hallCal: CAL_NOW }, CAL_NOW], [{ retired: false, hallCal: 1 }, 1], [{ retired: true, hallCal: 1 }, 1],
  [{ retired: true, hallCal: CAL_NOW + 1 }, 1], [{ retired: true, hallCal: '2' }, 1], [{ retired: true, hallCal: 1.5 }, 1], [{ retired: true, hallCal: null }, 1], [{ retired: true, hallCal: {} }, 1], [{ retired: true, hallCal: 0 }, 1],
  [{ retired: false, hallCal: 'x' }, CAL_NOW],
];
let calRuleMiss = calCases.filter(([c, want]) => eng.hallCalibrationOf(c) !== want).length;
for (const k of careers) {
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  if (!same(eng.LEGACY({ ...k.c, retired: true, hallCal: undefined }), scoreOn(k.c, 1))) calRuleMiss += 1;
  if (!same(eng.LEGACY({ ...k.c, retired: false, hallCal: undefined }), scoreOn(k.c, CAL_NOW))) calRuleMiss += 1;
}
const stampedEngine = careers.filter(k => k.c.hallCal === CAL_NOW).length;

/* 20. The board loop's stamp: every career the loop retired carries today's
   calibration and is scored on it (none under SIM_CAL=1). */
const boardRetired = Object.values(runs).flat().filter(r => r.c.retired);
const boardStamped = boardRetired.filter(r => r.c.hallCal === CAL_NOW).length;
const boardScoreMiss = boardRetired.filter(r => eng.LEGACY(r.c).score !== scoreOn(r.c, CAL1 ? 1 : CAL_NOW).score).length;
console.log(`  15 (c) calibration rule: ${calRuleMiss} misses over ${calCases.length} cases and ${careers.length} careers; engine careers stamped ${stampedEngine}${CAL1 ? ' (SIM_CAL=1)' : ''}`);
console.log(`  20 board stamp: ${boardRetired.length} board careers retired, ${boardStamped} stamped ${CAL_NOW}, ${boardScoreMiss} scored on another calibration`);
console.log(`  15 v1: ${v1Saves.length} recorded saves (base ${String(V1_FIXTURE.baseCommit).slice(0, 8)}), ${v1ReplayMiss} read differently today; ${v1FormulaMiss} of ${careers.length} engine careers off the Round 123 formula on calibration 1`);

/* ─── Check ───────────────────────────────────────────────────────────── */
const BAND = { minInducted: 0.05, decileCut: 0.06, ladderStep: 0.015, talkReach: 0.70, earlyFall: 0.10, atFloor: 100, balanceCases: 5, farewellOvrGain: 10, seekMet: 300, hallShift: 0.025, legacyShift: 15 };
const smallestCut = Math.min(...decileCuts);
const fellEarlyEnough = rules.stayFloor === null || earlyFalls >= BAND.earlyFall * onBallotOut;
const checks = [
  ['crashes', crashes === 0 && careers.length === CAREERS, `${crashes} crashed of ${CAREERS}`],
  ['iff', iffMiss === 0 && inducted.length >= BAND.minInducted * careers.length, `${iffMiss} disagree with the engine's own legacyOf, ${inducted.length} inducted`],
  ['outcome', outcomeMiss === 0 && offBallot > 0 && onBallotOut > 0 && fellEarlyEnough, `${outcomeMiss} careers outside the Hall with the wrong outcome; ${offBallot} off the ballot, ${onBallotOut} on it, ${earlyFalls} early fall offs${rules.stayFloor === null ? '' : ` (needs ${100 * BAND.earlyFall} percent of those on it)`}`],
  ['table', tableDiffs.length === 0 && offsetMiss === 0, `rules off the audit table: [${tableDiffs.join(',')}], ${offsetMiss} careers on the wrong first class`],
  ['rises', smallestCut >= BAND.decileCut && Math.min(...ladderSteps) > BAND.ladderStep, `smallest of the nine decile cuts ${smallestCut.toFixed(3)} (needs ${BAND.decileCut}), smallest ladder step ${Math.min(...ladderSteps).toFixed(3)} (needs over ${BAND.ladderStep})`],
  ['promise', promiseMiss === 0 && promiseN >= 500, `${promiseMiss} of ${promiseN} promised first ballots missed`],
  ['keyed', hallDraws === 0 && notSame === 0, `${hallDraws} Math.random draws, ${notSame} records that changed on a second run`],
  ['sides', sideMiss === 0 && (rules.stayFloor === null || atFloor >= BAND.atFloor), `${sideMiss} ballots on the wrong side of a rule${rules.stayFloor === null ? '' : `, ${atFloor} synthetic ballots shown at exactly the floor`}`],
  ['talk', talkMismatch === 0 && talkBeforeAge === 0 && talked >= BAND.talkReach, `${talkMismatch} talks off the rule, ${talkBeforeAge} before the age, reached ${(100 * talked).toFixed(1)} percent (needs ${100 * BAND.talkReach})`],
  ['answers', answerMiss === 0 && Object.values(answered).every(n => n > 0), `${answerMiss} answers that did not do what the button says; answered ${JSON.stringify(answered)}`],
  ['jersey', jerseyMiss === 0 && jerseyRaw === 0 && jerseys > 0, `${jerseyMiss} jerseys off the rule or misnamed, ${jerseyRaw} named by a bare club id, ${jerseys} retired`],
  ['identity', boardCrashes === 0 && identityMiss === 0 && identityTalks > 0, `${identityMiss} careers answering one more year that differ from the loop with no talk (${identityTalks} talks answered), ${boardCrashes} board careers crashed`],
  ['ends', endsMiss === 0 && endsRetire > 0 && endsFarewell > 0 && endsDeck > 0, `${endsMiss} chosen ends off by a season or unmarked (retire now ${endsRetire}, talk farewells ${endsFarewell}, deck farewells ${endsDeck})`],
  ['once', onceMiss === 0 && talkOffseasons > 0 && unlisted.length === 0 && deadIds.length === 0 && sportIds.length > 0, `${onceMiss} of ${talkOffseasons} talk offseasons offered a retirement card; not listed [${unlisted.join(',')}], listed but never dealt [${deadIds.join(',')}]`],
  ['seek', seekMiss === 0 && seekMet >= BAND.seekMet, `${seekMiss} of ${seekTried} forged summers where the board's seek landed on a deck retirement card; ${seekMet} landed on one with no hold-out (needs ${BAND.seekMet})`],
  ['deckJersey', jerseyRecMiss === 0 && jerseySynMiss === 0 && waitWrote === 0 && jerseySynN > 0 && (SPORT === 'nhl' || jerseyRecN > 0), `${jerseyRecMiss} of ${jerseyRecN} deck retired numbers not on the card, ${jerseySynMiss} of ${jerseySynN} synthetic, ${waitWrote} wait answers that wrote a club`],
  ['era', eraMiss === 0 && eraBoundary.below > 0 && eraBoundary.above > 0, `${eraMiss} cards printing a class year or rule off the audit's verified class (${auditFrom}); ${JSON.stringify(eraCounts)}`],
  ['v1replay', v1ReplayMiss === 0 && v1Saves.length >= 16, `${v1ReplayMiss} readings of ${v1Saves.length} recorded saves differ from the version 1 recording`],
  ['v2replay', v2TableSame && v2ReadMiss === 0 && v2Now.readings.length >= 16, `calibration 2 against its recording: the table and the rules ${v2TableSame ? 'equal' : 'differ'}, ${v2ReadMiss} of ${v2Now.readings.length} recorded saves told something else (a shipped calibration is never edited: add calibration 3)`],
  ['v3replay', v3TableSame && v3ReadMiss === 0 && v3Now.readings.length >= 16, `calibration 3 against its recording: the table and the rules ${v3TableSame ? 'equal' : 'differ'}, ${v3ReadMiss} of ${v3Now.readings.length} recorded saves told something else (a shipped calibration is never edited: add calibration 4)`],
  ['v1formula', v1FormulaMiss === 0 && careers.length > 0, `${v1FormulaMiss} of ${careers.length} engine careers score off the Round 123 formula on calibration 1`],
  ['calrule', calRuleMiss === 0 && stampedEngine === (CAL1 ? 0 : careers.length), `${calRuleMiss} readings off the calibration rule; ${stampedEngine} of ${careers.length} engine careers stamped`],
  ['boardstamp', boardScoreMiss === 0 && boardRetired.length > 0 && boardStamped === (CAL1 ? 0 : boardRetired.length), `${boardStamped} of ${boardRetired.length} retired board careers stamped ${CAL_NOW}, ${boardScoreMiss} scored on another calibration`],
  ['neverbelow', ruleAMiss.length === 0 && belowMiss === 0 && rows.length > 0, `calibration 2 drops or changes [${ruleAMiss.join(', ')}] of calibration 1; ${belowMiss} of ${rows.length} careers score lower, lose a tier or leave the Hall on 2 (${movedUp} moved up)`],
  ['marks', tableCells.length > 0 && fromOk && toOk, `at or over from: pooled ${(100 * fromPooled).toFixed(2)} percent, ${cellOut.length} cells out of band [${cellOut.join(', ')}]; at or over to: pooled ${(100 * toPooled).toFixed(2)} percent`],
  ['halfrule', halfMiss.length === 0 && tableCells.length > 0, `${halfMiss.length} cells off the half rule, the ledger's marks or the ramp floor [${halfMiss.slice(0, 4).join('; ')}]`],
  ['standoutgain', gN > 0 && pooledGain >= ML.outcome.pooledGain.floor && standoutGain >= ML.outcome.standoutGain.floor, `top 5 percent by family: ${gIn1} -> ${gIn2} of ${gN} in the Hall, a gain of ${(100 * pooledGain).toFixed(1)} points (needs ${(100 * ML.outcome.pooledGain.floor).toFixed(1)}); owed to the standout alone ${(100 * standoutGain).toFixed(1)} points (needs ${(100 * ML.outcome.standoutGain.floor).toFixed(1)})`],
  ['standoutcap', capMiss === 0 && paidCareers > 0, `${capMiss} careers off the restated score on 2 (one family, capped); the standout paid on ${paidCareers}`],
  ['base', baseMiss.length === 0, `${baseMiss.length} base misses [${baseMiss.join('; ')}]`],
  ['words', wordMiss.length === 0 && lineMiss === 0 && linesWithStandout > 0 && exampleSeen.length === WORDS.example.positions.length, `${wordMiss.length} misses in the rule, the example or the card [${wordMiss.slice(0, 3).join('; ')}]; ${lineMiss} card lines off`],
  ['anchorshape', shapeMiss.length === 0 && ANCHORS.anchors.length > 0, `${shapeMiss.length} misses in the ledger's shape [${shapeMiss.slice(0, 3).join('; ')}]; ${ANCHORS.anchors.length} anchors in the file, sports built [${builtSports.join(', ')}]`],
  ['anchors', anchorsOk, anchorsBuilt ? `agreement on 2 against 1: raw in or out ${AG.raw1.inOut} > ${AG.raw2.inOut}, exact ${AG.raw1.exact} > ${AG.raw2.exact}; books in or out ${AG.books1.inOut} > ${AG.books2.inOut}, exact ${AG.books1.exact} > ${AG.books2.exact} (must not fall, and must stay within two of the measured ${JSON.stringify(measuredAg ?? null)}); a real never or later in the books reading ${realNotFirst}, agreeing by the push alone ${pushAlone}, the band breaks with every push tripled ${bigFires}, with every push off ${goneFires} (all four as recorded: ${reachOk}); moved past a real ballot by calibration 2: raw ${PAST.raw.length}, books ${PAST.books.length} (must be none)` : 'NOT BUILT for this sport: nothing asserted'],
  ['anchorcalls', callMiss.length === 0, `${callMiss.length} anchor readings whose majority call is not the one firstBallotChance gives [${callMiss.slice(0, 4).join(', ')}]`],
  ['hallshare', hallShareOk, `Hall share ${hall1.toFixed(1)} -> ${hall2.toFixed(1)} percent (ceiling ${(100 * Math.min(ML.outcome.hallCeiling, HALL_STOP)).toFixed(1)})`],
  ...(balance ? [['balance', balance.cases >= BAND.balanceCases && balance.ovrNow - balance.ovrOld >= BAND.farewellOvrGain && Math.abs(balance.hallNow - balance.hallOld) <= BAND.hallShift && Math.abs(balance.legacyNow - balance.legacyOld) <= BAND.legacyShift, `${balance.cases} walk away farewells (needs ${BAND.balanceCases}); farewell OVR gain ${(balance.ovrNow - balance.ovrOld).toFixed(1)} (needs ${BAND.farewellOvrGain}); Hall share shift ${(100 * (balance.hallNow - balance.hallOld)).toFixed(2)} points (band ${100 * BAND.hallShift}); median legacy shift ${balance.legacyNow - balance.legacyOld} (band ${BAND.legacyShift})`]] : []),
];
const BOARD_CHECKS = ['identity', 'ends', 'once', 'seek', 'deckJersey', 'era', 'balance', 'boardstamp'];
const shown = SKIP_BOARD ? checks.filter(c => !BOARD_CHECKS.includes(c[0])) : checks;
for (const [name, ok, detail] of shown) console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${name}: ${detail}`);
const red = shown.filter(c => !c[1]).map(c => c[0]);
if (CONTROL) {
  const WANT = { everyonein: 'iff', bindhof: 'iff', outcomeswap: 'outcome', nominationgone: 'outcome', oldcurve: 'outcome', waitoff: 'table', shownraw: 'sides', flatfirst: 'rises', nopromise: 'promise', mathrandom: 'keyed', sharesides: 'sides', notalk: 'talk', farewelloff: 'answers', retireoff: 'answers', jerseyfirst: 'jersey', jerseyraw: 'jersey', talkdraws: 'identity', deckfarewelloff: 'ends', twice: 'once', seekexclude: 'seek', jerseyignore: 'deckJersey', eraunguarded: 'era',
    // Round 1051. An array wants every one of its checks red.
    v1drift: ['v1replay', 'v1formula'], calflip: ['v1replay', 'calrule'],
    examplelie: 'words', nocardline: 'words', clausealways: 'words', wholesheet: 'words', standoutbig: 'anchors', standoutgone: 'anchors', decisionback: 'anchors', basebig: 'anchors', anchorwiki: 'anchorshape', plantbase: 'base',
    below: 'neverbelow', markdrift: 'marks', todrift: 'marks', noramp: 'halfrule', catchersteals: 'halfrule', nobase: 'base',
    twofamilies: 'standoutcap', ballotflip: 'anchorcalls', seasonbig: 'hallshare', v2drift: 'v2replay',
    // Round 1301. In the NHL calibration 3 has a table of its own, so its drift must leave the recording of 2 alone.
    v3drift: SPORT === 'nhl' ? { red: ['v3replay'], green: ['v2replay'] } : 'v3replay',
    // The board loop's own stamp check only exists on a run that plays the board loop.
    nostamp: SKIP_BOARD ? 'calrule' : ['calrule', 'boardstamp'],
    // An object also names checks that must stay green: the standout switched off moves the outcome, never the marks.
    nostandout: { red: ['standoutgain'], green: ['marks'] } }[CONTROL];
  const wantRed = WANT && WANT.red ? WANT.red : [].concat(WANT);
  const wantGreen = WANT && WANT.green ? WANT.green : [];
  const fired = wantRed.every(n => red.includes(n)) && wantGreen.every(n => !red.includes(n));
  console.log(`simCareerHall ${SPORT} CONTROL ${CONTROL}: wanted ${wantRed.join(' and ')} red${wantGreen.length ? ` and ${wantGreen.join(' and ')} green` : ''}, red [${red.join(',')}], ${fired ? 'FIRED' : 'DID NOT FIRE'}`);
  // Exit 1 only when the check this control targets went red, so the exit
  // code alone proves the control hit its own check. Any other red is printed.
  process.exit(fired ? 1 : 0);
}
if (RECORD_V2) {
  console.log(`simCareerHall ${SPORT}: CALIBRATION 2 RECORDED INTO scripts/data/careerHallV2.json, NOT A GREEN RUN (${red.length ? `red [${red.join(',')}]` : 'nothing red'})`);
  process.exit(3);
}
if (RECORD_V3) {
  console.log(`simCareerHall ${SPORT}: CALIBRATION 3 RECORDED INTO scripts/data/careerHallV3.json, NOT A GREEN RUN (${red.length ? `red [${red.join(',')}]` : 'nothing red'})`);
  process.exit(3);
}
if (SKIP_BOARD) {
  console.log(`simCareerHall ${SPORT}: BOARD SECTIONS SKIPPED, NOT A GREEN RUN (${red.length ? `red [${red.join(',')}]` : `the ${shown.length} checks that ran are green`})`);
  process.exit(3);
}
console.log(`simCareerHall ${SPORT}: ${red.length ? `RED [${red.join(',')}]` : `all ${checks.length} checks green`}${CAL1 ? ' (SIM_CAL=1, calibration 1 everywhere)' : ''}${anchorsBuilt ? '' : ' (REAL ANCHORS NOT BUILT FOR THIS SPORT: section 18 asserted nothing about it)'}`);
process.exit(red.length ? 1 : 0);
