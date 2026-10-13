# Round 1311 notes: Club Manager's league leaders and awards on screen (league book B2)

Branch r1311-cm-league-boards, base origin/main b6eb78e7 (Release AX). Brief:
C:/Users/antho/dukb-handoff/2026-10-10/briefs/brief-1311.md. Every heavy check ran on a GitHub runner as a
remote check; the result of a check is read with `git show origin/rc-results/<name>:summary.txt`.

## What the round is, step by step

1. THE DOOR AND THE TILES (commits 339188d6, the Round 1081 pin b6135d8e). `leagueBoardsOf` in
   src/lib/clubManager.ts beside `leagueBookOf`: the one door every screen and award reads the league book
   through. It builds the reader's input once from the active save (each rival roster asked for once) and
   answers null for no book, a book the careful reader refuses, or one that does not add up to the table.
   `leagueBookRules` hands the card the rule a rival's goals are dealt by. `dealShares` in
   src/lib/clubManagerLeagueBook.ts says what `dealGoals` gives each man on average (the worked example is
   computed from it, never typed; a unit line holds it against 20,000 dealt goals and shows it tells the
   taker rule on from off). `BOOK_FULL_SHARE = 95` and `AWARD_FLOOR = 73` in
   src/lib/clubManagerLeagueBoards.ts, each held by a unit line. NEW
   src/components/club-manager/LeagueLeadersCard.tsx: no book (two wordings), a book with nothing on it yet,
   the three tiles, one board drawn alone with a back button, the honest thin data line, the late line, the
   keepers line, and a "?" with the rules and the worked example. StatsScreen.tsx mounts it above the award
   races on the All comps and League views; a board open is the whole screen and Back puts the page where
   it stood. The golden boot lines say what they are. The help sentence (ClubManagerHelp.tsx, the stats
   centre paragraph). The engine's awards still read the old race in this step.
2. THE AWARDS, ONE PUSH (commits 1b3958c1, the pin 977c3eca, the digest after it). `goldenBootTable` reads
   the book's Goals board on a season the book decides (a whole book with at least 73 in 100 rival goals on
   record) and its old body to the letter otherwise; the player of the season and the world award follow
   it. `finishSeason` asks the door once and writes `awards` (the top scorer, most assists, most clean
   sheets and the share on record) into the summary and the season's record, only on a season the book
   decides. The award races card drops its golden boot lines on such a season; the season review names the
   two new awards, or says in plain words why they are withheld; the help sentence and the card's "?" say
   so. scripts/simCmOwnGoals.mjs reads history without awards (its one line). scripts/simAwardRaces.mjs and
   scripts/simCmLeagueBook.mjs gain the sections and controls the brief names.

3. PAST WINNERS AND THE WALK (060fdc8e, 2ee92ebc). A fourth tile once a season has closed with the league's
   awards: one season at a time, newest first, two step buttons and the back button. NEW
   scripts/playCmLeagueLeaders.mjs: five saves built by the engine bundle, three sizes, five sections, six
   controls (swap, wide, stack, thin, younglate, write), a measuring pass (LEADERS_REPORT=1).
4. THE FACTS (merge of Round F 121a42e7; 08aece03). Section facts of simCmLeagueBook reads
   scripts/data/cmLeagueBookFacts.json (USED figures only, by the harness's own reading of its rule), prints
   the fleet's top scorer by season length beside the real leagues, and binds one band on 38 match seasons.
   It cannot tell the taker rule on from off; control bookleak turns it red.
5. THE TEAM OF THE SEASON (bf7d5701, the pin 5090d373, the fixes 90cadf5f, the digest a8afccfe, the line
   666cc281). teamOfSeason, a 4-4-2 by the engine's own lines, never padded; `xi` on the awards, kept on the
   newest five records with awards (keepTeams). NEW SeasonHonoursCard in Past winners; one tile on the season
   review. Controls teamsheets and nocap.
6. WHAT'S NEW, these notes, the owed list.

## The ruled numbers and the measured ones

- BOOK_FULL_SHARE 95 and AWARD_FLOOR 73 (the lead's rulings), each held by a unit line.
- The floor table (BOOK_MEASURE=floor, r1311-s2b): 33 leagues decided by the book in every career, 14 in none,
  none split, with two and with four careers a league. One of my men won the boot in 15 of 188 careers; in the
  14 leagues under the floor 4 of 56 (the book's board would have given 14).
- simAwardRaces section 2 on the book: thirty seasons, mean 27.27, standard deviation 2.50, band 24.5 to 30.0.
- The back four of the team of the season: 1.42 to 1.60 men of one club under the rule, 2.74 to 2.93 under
  teamsheets (full fleets, seed sets 0 to 4); line 2.17, judged on 20 teams or more.
- Save size (simClubManagerSaveSize, six streams, after step 5): healthy top 199,135 bytes at season 15 against
  SIZE_BUDGET 203,000; slope top 1,330 against SLOPE_CAP 2,000; control uncapped FIRED. No budget moved.

## Owed by hand (the lead)

- The weight rows of scripts/sweepWeight.mjs (/club-manager, /manager-hot-seat, /deadline-day): measured and
  reported in the closing report; this round edits no row. On the final head they read 590.7, 608.0 and 618.1
  against 590, 607 and 617 (base 588.8, 606.1, 616.2: +1.9 each, all in the shared engine chunk), so
  sweepWeight is red on those three rows until the lead sets them, once, on the tree that also holds Release AZ.
- Whichever of this branch and Release AZ reaches main second retakes the Round 1081 pin and
  scripts/data/cmLeagueRulesDigest.json, and runs simCmLeagueBook (full fleet, seed sets 0 to 4) and
  simAwardRaces on the joined tree (the lead's decision 2). The same tree also wants
  scripts/simClubManagerSlots.mjs with SLOTS_CONTROL=dupe: this round moved its BUDGET (8ae54839) and Release
  AZ edits that file's digest too (it reads the packed world roster), so the joined total is unmeasured.
- The saved What's New page (public/whats-new/index.html) is redrawn at release.
- OWED TO THE OTHER LANE: one sentence on the league leaders, the awards and the past winners for
  src/data/gameContent/clubManagement.ts; and whether its line 121 "wherever a scorer is listed" wants
  narrowing (the boards list men and totals, not goals). Not written here.

## What must not move, and how it is held

- Steps 1, 3 and 4 change no engine behaviour: simCmLeagueBook default and full fleets, seed sets 0 to 4,
  with BOOK_BASE at the base commit: every face (the whole save but the book, and the count of draws) equal.
- Step 2 moves only the honours: the stream face leaves out the four moved fields of the summary and each
  record's awards and nothing else; section awards holds the WHOLE summary and record to the base commit on
  every season the book does not decide.
- Old saves in play when the book shipped: oldsave (vi) carries both committed recordings (and, with
  BOOK_BASE, three saves the base writes afresh) to the season's end, finishes it, and prints each one's
  closing share and what it was given; awards only from a whole book at or over the floor (decision 3, the
  critic's advice 21 (iii)). Measured (r1311-f8a): the Hertha BSC recording closes on record 41 in 100 and gets
  no awards (the old race keeps the golden boot); the Everton recording closes on 100 and gets the awards and a
  team; of the saves the base writes afresh, Hertha closes on 55 (none), Southampton on 92 (awards).


## The critic's corrections, how each was taken

- 2 (no thin line from a young book): bookShare leaves a late book's opening goals out (Round 1306's u0); the
  walk asserts S3 after its match reads "Counting from round N" and NO thin line, and control younglate proves
  the check can fail.
- 3 (simCmOwnGoals): its one line reads history without awards in both arms, with the sentence why.
- 4 (the help): the stats centre paragraph of ClubManagerHelp.tsx, written in step 1 and amended in steps 2
  and 5, each true of its own build.
- 5 (no board without its words): option (ii): tiles first with the old race still deciding, then the
  re-point, the awards and the dropped golden boot lines in one push (step 2), no feature constant.
- 6 (a floor for awards): AWARD_FLOOR 73, the floor table printed for all 47 leagues (BOOK_MEASURE=floor).
- 8 (controls for every check): the walk's three more (stack, thin, write) and younglate; check 5's left out
  keys are named in the walk's header (none: the page's clock is fixed in both contexts).
- 10 (the worked example follows the rule): dealShares over the engine's own rule object; a unit line holds it
  against 20,000 dealt goals; the render test compares the printed numbers with the module's.
- 11 (the old race's arm through noBook): simAwardRaces section 2b deletes the book and passes noBook.
- 12 (the trains): managerHotSeat.ts untouched this round; WhatsNew.tsx shared with Release AY (merged).
- 13 (weight rows): measured after steps 1, 2 and 5 and reported; no row edited.
- 14 (B2's order, pins and digests in the same push): every push that edits clubManager.ts carries the Round
  1081 pin in its own commit; steps 2 and 5 retake the league rules digest by its attribution legs.
- Advice 17 (the back four's tie, the cap): the sum on the club's keepers' rows or the largest on a
  defender's row; xi kept on the five newest records with awards. 18 (a roster once): leagueBoardsOf asks
  each rival roster once; finishSeason asks the door once. 19 (the band and the taker): said in section facts'
  header. 20 (i) (the stream face): only the four moved fields and the records' awards are left out.
  21 (i) the golden boot race's lines are headed; (ii) two wordings of the empty state; (iii) a mid season
  book that is whole but was thin gives awards only over the floor (its cov is kept); (iv) at 320 a row may
  cut the club and never the name or the number, measured on the rectangles in the walk.

## The review fixes (review-run-1311 and review-read-1311)

- Round F's reviewed tip (r1310-cm-league-facts 302b4969) is merged in, so the facts file carries Strasbourg's
  27 played in Ligue 1 2019-20, Sky Sport Italia's cards as the page prints them and the laliga.com citation by
  host, and its fence carries Round F's later controls. The USED figures did not change.
- The Round 1081 pin takes scripts/simClubManagerSlots.mjs again (attribution on remote check r1311-fx-pin).
- Unit and render lines now hold the floor's edge (73 decides, 72 does not, a late book never does), the honest
  line in a league between 73 and 94 on the card and the review, and the review's late book wording.
- Copy: the review's withheld line counts "the other clubs' goals"; the card's "?", the Past winners tile and
  the help say a season the book cannot settle has no most assists, most clean sheets or team, that a thin
  league can go every year without them, that own goals and a thin squad's empty places count for nobody, and
  that the team is kept for five seasons; the race note points at the Top scorers board only when it is drawn,
  in 9 px; Past winners names each season's league; the review's club lines read "Your top scorer" and "Your
  most assists", and its golden boot and player of the season lines wrap as text.
- simCmLeagueBook judges the 38 match facts band only on a fleet of 20 such seasons or more (the full fleet);
  control bookleak runs on the full fleet. Since the closing check, the controls bookleak and teamsheets play
  the full fleet whatever BOOK_FLEET says, so a gate's plain line (BOOK_CONTROL=bookleak, no BOOK_FLEET) fires
  with exit 1 instead of ending "DID NOT FIRE" with exit 3 on a fleet that cannot judge it.
- Not changed: dealShares stays in the book module (control twoman patches a line of it, and the weight rows
  are the lead's); What's New keeps the brief's own text (decision 7).
