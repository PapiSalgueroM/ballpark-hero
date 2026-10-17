# Round 1340 notes: Club Manager match day screens

Branch r1340-cm-matchday, started from d8aaa4cb (release-bi-gate after part one, by the lead's base override).
The brief is C:/Users/antho/dukb-handoff/2026-10-10/briefs/brief-1340.md. This file is kept current at every push.

## Steps

- a1. src/lib/cmMatchDisplay.ts with the order helpers only (myClubFirst, inFixtureOrder, mineFirstOfReport) and
  src/lib/cmMatchDisplay.test.ts. No caller yet.
- a2. The report and the timeline. MatchReportCard: StatBar and StatsBlock take mineFirst; the scorer columns, the
  stats header, the balance of play row, the momentum legend (each name keeps its arrow), the shots row and the best
  columns are built once per side and drawn in the scoreline's order (new side attributes data-cm-scorer-col,
  data-cm-legend, data-cm-shots, data-cm-best; every old attribute rides with its element). The board word is
  boardMeter's band in the meter's tone class, and under No sacking the header's own words below the edge, through
  the new optional noSack prop that ClubManager.tsx passes as noSackFrom(g.career) !== null. MatchTimeline: a
  mineFirst prop, the header and both columns in that order, every entry wraps (no truncate), the name span carries
  data-cm-tl-name, the mark rides at the end of the name's last line, the toggle is 44 px, the chevron has
  motion-reduce:transition-none. New src/test/cmReportBoardWord.test.tsx. Repoints: simMatchScreen section 2 (the
  first possession number is the home side's share) and its bareposs anchor (the them and ragged anchors still
  match as they were), simCmMatchCentre statBars (by attribute inside each bar), managerScorerMarks (finds the name by
  data-cm-tl-name). New scripts/simCmMatchDay.mjs sections 1, 2, 3 and 7 with controls neutralaway, oldorder,
  truncate and homeflip.
- a3. Live and half time. LiveSimScreen: mineFirst beside opponent (liveNow.home while live, the report's own order at
  the whistle); the score digits, the strip, the folded card, the interval card (whose two numbers now carry
  data-cm-score-of like the strip's), LiveStats (header, possession, the bar, whose inline transition is now a class
  with motion-reduce:transition-none) and every StatCell (each number marked data-cm-live-stat-n mine or theirs) and
  the line under the pitch, all home side first, my club in green wherever it sits. LiveMatchHelp gains the order
  bullet and an away worked example. HalftimeScreen's score card in the same order, my name in green. Repoints:
  simCmMatchCentre liveCells (by data-cm-live-stat-n), clubManagerVarScreen snap and the readScore of
  liveSimMotion and pitchOwnGoal (read "me - opp" off the two marked digits), liveSimMotion's statline test (in the
  order drawn) plus a new away case, managerHalftimeLineups (the venue's order), playClubManager (reads the half time
  card's venue word). simCmMatchDay section 4 and the live half of section 7; the fleet now loads the era squads
  first (ensureAllEraRosters), which is why the a2 run could not start Everton 2005-06.
- a4. The hub's next match card names the home side first (myClubFirst on the fixture's home), your club in green
  wherever it sits, the stadium mark kept in front on a neutral ground and the venue line unchanged; the names carry
  data-cm-next-side and the line data-cm-next-match. The Match Centre's tie (two name blocks, your colour dot kept
  beside your name and toward VS), the form rows and the two Ones to watch columns are home side first, each side
  marked data-cm-mc-side; the venue line, the first leg sentence, the odds and the meetings are unchanged.
  playCmLeagueFixtures reads the card as "<home> vs <away> <venue>". simCmMatchDay section 5 (the Match Centre, with
  oldorder firing there too) and the home and neutral Match Centres in section 7.
- a5. NEW scripts/playCmMatchDay.mjs: the built site at 320 by 640, 390 by 844 and 1280 by 900 and again at 390
  with reduced motion, saves A (Liverpool, away league match next), B (the same career, home), C (a final on a
  neutral ground) and E (an away second leg, pictures only), planted from the real engine on a seeded stream.
  Controls swap, cut and jump (DOM level, save A at 390).
- a6. playCmMatchDay with MATCHDAY_COMPARE_DIST compares the head build against a build of d8aaa4cb (r1340-a6 on
  b1251a25): one build walked twice gives the same save to the byte; on A, B and C at 320, 390 and 1280 every save
  after the same seeded taps is the base's to the byte (71582, 75889 and 160896 bytes) and no screen has more text
  under 12 px (hub 35 to 40, centre 46 to 71, live 72 to 98, interval 131 to 133, report 232 to 285, equal on both).
  Heights (head against base): the hub, the live stage and the interval equal; the report taller by 61 to 327 px
  (timeline names now wrap instead of cutting, and the toggle is 44 px, by design); the Match Centre taller by 8 to
  11 px, which was the form rows' new wrapper spans taking the card's line height, fixed by making them inline-flex.
  simMatchDetail's one red on a3c (h1 stoppage 5 for a half with 2 stoppages, an engine band this round cannot
  move) reran green twice on the head and once on the base (r1340-a6).
- a7 (help and What's New, sent ahead of a6 so the build says what it does): ClubManagerHelp.tsx's match paragraph
  (line 48) gains one sentence on the order; one What's New entry, true of 1340a alone.
- Owed to the other lane: src/data/gameContent/clubManagement.ts grepped on this head for dots, shirt, number, vs,
  Match Centre, home side, scoreboard, on the left or right: no sentence this round makes false. None owed.
- confidenceLabel (src/lib/clubManager.ts) has no caller in src after a2. It is dead code; the export stays, because
  clubManager.ts is not this round's file.

## Positional readers (critic correction 1's grep, run before a2 on d8aaa4cb)

`grep -rnE "POSSESSION|cm-live-score|cm-stat-n|cm-live-stat=" scripts src/test` plus the literal score regexes found:
scripts/simMatchScreen.mjs 403 (POSSESSION, repointed in a2), scripts/simCmMatchCentre.mjs 216 (statBars, a2) and
224 (liveCells, a3), src/test/clubManagerVarScreen.test.tsx 151 (a3), src/test/liveSimMotion.test.tsx 163, 1409 and
1792 (a3), src/test/pitchOwnGoal.test.tsx 687 (a3), scripts/playClubManager.mjs 495 (a3), scripts/playLiveMatchFit.mjs
404, 678, 1275 and 1286 (read by attribute or as a change of text: no edit). scripts/simClubManagerMeters.mjs 499 reads
the league table's goals pair, not a match screen.

## 1340b, the pitch and the tile

- a fix found by 1340a's final proof (r1340-F4 on 604bc788): at 320 one (O.G) mark dropped alone onto a third line
  under "Giorgi Mamardashvili" (the mark span was white-space pre, and Chromium broke the line in front of its
  leading space). 349aea26 makes it nowrap, which holds the space to the name's last word; a Chromium probe over
  every column width from 60 to 220 px is sent with the walk (r1340-m1).
- b1 (93c6e3b7, 80bf6edc): pitchName and pitchInitials in src/lib/cmMatchDisplay.ts, their unit file pinning the
  brief's names and the whole pool's properties (r1340-x1 unit green on 80bf6edc).
- b2 (9a330320): LABELS_BEFORE_320 recorded on abf78608 (whose pitch is 1340a's), playLiveMatchFit at 320 by 568,
  three seeds twice each (r1340-b2): the walk's own seed 3208792607 2.417 and 2.375, seed 1340 3.208 and 2.792, seed
  2026 2.375 and 2.375 overlapping pairs a frame; mean 2.590, spread 0.417 (seed 1340's two runs); cut a frame 13.917,
  14.958 and 15.0; every one of the 504 to 528 label readings began with a digit.
- b3: the dots wear pitchName (initials from pitchInitials in labelsShort's crowd, a nameless opponent his slot's
  role), my dot's label for a screen reader is the man's whole name, the two comments rewritten (labelsAbove and
  labelsShort's code unchanged), liveSimMotion's aria test reads the whole name, the help's pitch sentence, the
  live help's surname bullet and the What's New entry extended in the same commit. simCmMatchDay section 6 with
  control numbers; section 7 masks the pitch labels. playLiveMatchFit holds 320 to LABELS_BEFORE_320's ceiling and
  every size to no label beginning with a digit, controls widelabels and digits.
- b4: the hub's Stats tile prints the leader's pitch name (`${pitchName(ts.name)} leads with ...`); the help's
  shootout sentence and the Tactics tab's (TacticsScreen.tsx, the shootout order note) both now say "anyone you
  left out follows in the order of your eleven with the keeper last": the tab lists the eleven in xiIds order
  (slot order) and shootoutTakerOrder takes the men not listed in onPitch order, which is slot order, keeper last.
  playCmMatchDay save D: Eintracht Frankfurt with Ayoube Amaimouni-Echghouyab (pitch name Amaimouni-Echghouyab, the
  longest in the pool at 20 characters, printed by cmMatchDisplay.test.ts) on 12 goals, a LAYOUT PLANT so he leads
  the tile; at 320 the tile must read "Amaimouni-Echghouyab leads with 12" on at most two lines; control fullname.
- Pitch name list (b1's unit file prints every real name whose pitch name differs from the old last word, 190 of
  9337): no first name alone is produced. The agnome names print as ruled ("Pedro Neto", "José Neto", "Martim
  Neto", "Carlos Júnior", "Luiz Júnior", "Mauro Júnior", "Roque Júnior", "Vinicius Junior", "Robinho Junior",
  "Amoako Junior"); the generational suffixes drop ("Cásseres", "Markanich", "Eremenko").
- The mark (correction of the fix above): r1340-m1's probe found white-space nowrap wraps exactly the same entries as
  pre (110 of 1610 over widths 60 to 220 px), because every one of them is a mark that has no room on the name's last
  line: "Mamardashvili (O.G)" in bold is wider than a 320 phone's timeline column. No white-space rule keeps it up
  without splitting the surname, so the class is back to the base's pre, and playCmMatchDay's mark check now passes
  a mark that starts the very next line only when the last line plus the mark are wider than the column (printed as
  "on the next line, no room on the last"); a mark off its line with room on it is still red. The probe (v2, sent
  with the walk, never committed) proves the rule on the real Entry markup and catches a display:block control.
