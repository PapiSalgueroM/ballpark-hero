# Round 1302: Club Manager, VAR. The two ledgers finished and the screen cases played. THE SWITCH DID NOT MOVE.

Written 2026-10-10 by the builder of the round. Round 1218's notes (docs/audits/ROUND-1218-NOTES.md) say how the
review rule is built; this file says what Round 1302 added and why `CM_VAR_LIVE` still reads false.

## 1. Why the switch stays off

The lead's rule for this round: a figure the generator uses has to stand on two independent sources AND on two
recent seasons, and a figure that still stands on one source or one season after an honest search is thin, so
the kind of review that depends on it stays off.

- **Goals ruled out** and **penalties given after a review** both stand on one season, Serie A 2017-18 (two
  publishers, 29 and 31 goals, 34 and 35 penalties in 380 matches). That is two sources and one season, and the
  season is not recent.
- A sixth reader looked today for a season from 2022-23 on that two publishers counted, split into goals ruled
  out and penalties given. None was found. Every address opened and what it returned is in the `notUsed` list of
  `scripts/data/cmVarRates.json` (the lines that start "Round 1302"): the BBC's review of the Premier League
  2025-26 counts mistakes, not decisions by kind; a local news site's count of 2023-24 leans on the tally
  already on file; an Italian site lists episodes club by club and prints no total; the searches for La Liga,
  the Bundesliga, Ligue 1 and the Eredivisie gave totals with no split or the pages already on file.
- So by the lead's rule neither kind may be switched on, and VAR ships with neither. The ledger says so in its
  `owed` entry `recent-seasons`, and `scripts/simCmVarLedger.mjs` fails if `CM_VAR_LIVE` reads true while that
  entry is open (control `owedlive`).
- **One lead for whoever reads next.** SuperStats, a Danish statistics site, keeps a table of the rulings a
  video review changed in the Danish Superliga by kind, club by club, for every season since 2020/2021
  (https://superstats.dk/kort/dommere/var?aar=2024/2025). It is one publisher and prints no season total. If
  the Danish federation or league publishes its own count split the same way, those seasons would be the first
  recent ones counted twice. Two searches found no such count.

## 2. The penalty band (the lead's decision 4)

All the penalties of a real season are in the ledger now (`penaltiesTotal`): Serie A 2017-18 by two publishers,
120 and 126 in 380, which is 0.316 to 0.332 a match (Ligue 1 2023-24 by the league itself, 105 in 306, is on
file with one publisher). With the headroom the other bands use (0.20) the band is 0.253 to 0.398 a match.

A review's penalties come on top of the engine's own. Measured on five fleets of about 4,000 league matches
each, the same matches played both ways (runner result r1302-s4): 0.3597 to 0.3821 penalties a match without
reviews, inside the band, and 0.4515 to 0.4780 with reviews on, every fleet above the band, the nearest by 13
percent. So the engine cannot stay inside the band on the sourced rates, and by decision 4 penalties by
review stay off. What keeps them off is the ledger's open `owed` entry `penalties-total`. `scripts/simCmVar.mjs`
plays the fleet and is red when the engine is outside the band and that entry is gone (control `penaltyband`),
and red when it is inside the band with the entry still there. Only the engine closes that entry: its own
penalty rate is a balance decision outside this round's files.

## 3. The coverage ledger: all 48 competitions are read

`scripts/data/cmVarCompetitions.json` has a row for every competition a modern save can play, and nothing is
left on a not read list (the ledger harness fails if anything is, control `unread`).

- **Yes, on two publishers on two hosts each: 28.** The 15 leagues and the Champions League of Round 1218, and
  from this round the Danish Superliga, Super League Greece, the Segunda División, Serie B, both MLS
  conferences, the Brasileirão, the A-League Men and the Russian Premier League; the KNVB Cup and the Copa do
  Brasil from the round of 16; the Australia Cup in its final only (the help prints "the final only").
- **No: 2.** The EFL Championship (the agency story and the BBC's own report) and Ligue 2 (two newspapers).
- **Unknown: 18.** Liga MX and 17 domestic cups. Each row's note says what the search found. Most cups have
  not said yet for 2026-27 (the FA Cup pages speak of 2025-26), or their guides do not name the video
  assistant. An unknown row plays without reviews.
- Three rules were added to the ledger: a competition that plays a calendar year is read for 2026; a source
  with no date of its own says what the date on file is (`publishedNote`); a cup that starts later than the
  round of 16 is named in the help with its stage.
- Rows the lead may want to look at: both MLS rows and the Australia Cup stand on the organiser's or the
  referees' body's own page plus one outside report; the MLS outside report speaks of the season by its date
  and match, not in print (the same judgment as the Saudi row of Round 1218).
- The Copa do Brasil's stage (from the round of 16) stood on one filed source that names a phase. The read
  review found the federation's own page of a video review in a round of 16 tie of the 2026 cup (cbf.com.br,
  published 2026-08-05, Remo against Santos, the second leg); it is on the row since the fix, read again that
  day. The third source on the row names no round and the stage does not stand on it.
- What the read review said of the sources and is NOT mended (each says what the ledger says; the weakness is
  how independent the two are): the MLS outside report is an aggregator's rewrite; the Brasileirão's two are
  rewrites of one federation release, and Greece's are two write ups of one seminar (the ledger's fourth rule
  counts such a pair once, so a strict reader would call both rows one source short); Ligue 2's two newspapers
  were read on sites that carry them; the Saudi row's second source names the opening round, not the season.
  And the unknown rows had one search each: the DFB-Pokal note says nobody names the video assistant, and the
  reviewer's one search found two regional papers that do (from the second round on), nearly word for word the
  same, so probably one agency text, which still leaves that row one source short.

## 4. The review screen

- **The case the reviewer saw** (seed 2042 of the opener: my goal at 44, theirs ruled out at 45) is kept as its
  own test in `src/test/clubManagerVarScreen.test.tsx`, played from before my goal to the whistle.
- **Every goal a review rules out is drawn before its card** (the fix that followed the round's two reviews;
  until then 10 of the 23 late ones a scan found, and every one that shared its clock place with a real chance,
  were a card on its own). Where the plan has room it plays on the clock, as Round 1218 built it. Where it has
  none (a real chance has its clock place, or it falls in the last two places of a period) the match clock
  STOPS for it: the goal is played out from the frame on the screen, its card opens with the ball in the net,
  and the clock goes on when the card closes. `LiveSimScreen.tsx`, "the stoppage". The plan never stages it
  there, so nothing real is moved, shortened or left out for a goal that counts for nothing.
- **When the clock stops for it:** at the first instant from its own place on at which nothing else is playing
  (ahead of a real last kick that is just before the wind up, one clock place before the minute the card
  prints). When real chances run back to back to the whistle, or the goal is at the whistle's own place, it
  stops AT the whistle: the last real action is over and counted, the ruled out goal is played and reviewed,
  and the period ends when the card closes.
- **What that corner did before, and the reviews found:** with no free instant the card opened 0.05 before the
  whistle on whatever was there. League match 2 of the fresh Everton career, seed 42322: a card that said "goal
  ruled out" for an Aston Villa goal sat on Everton's own real goal in Villa's net at 1 - 0, and the half then
  ended 2 - 0. Seeds 2219, 4670 and 6203: the card sat on the last picture of a real shot or save. All four are
  cases of the screen test now, with a fifth for the stop just before a real last kick (seed 1987).
- **The rule of the first build of this round (`lateRoom`: a late goal staged in the plan when it had the end of
  the period to itself) is gone.** The stoppage does the same job with the card at the minute it prints (the
  staged one opened one or two clock places early), and the mutations of it the run review tried cannot be
  written any more. What they did (my real shot at 45+3 dropped so the ruled out goal could be the last kick,
  seed 6203) is held by the test: with a late goal staged in the plan again it fails.
- **Played for the first time**, each on a real half: an own goal the minute after a ruled out goal; a review
  in the same minute as the other side's injury, red card and (in a second half) substitution; a review in
  extra time (only a Champions League knockout tie plays extra time: a fresh Arsenal career walked to the
  second leg of its first knockout tie); and the two late goals with reduced motion.
- **What the engine does not hold**, so nobody can play it on a real half: two reviews in one minute, or in
  back to back minutes (none in 7,500 first and 7,500 second halves searched). By reading: one review at a
  time, each ruled out goal drawn before its own card, the second after the first has closed.
- **Not this round's, and live today with VAR off** (the run review measured it on halves with no review): a
  real goal in the last clock place of a first half is drawn and counted and never gets its scorer card, and of
  two goals in the last two places only one is drawn. For the Club Manager lane's list.

## 5. What holds it

- `scripts/simCmVarLedger.mjs`: every row a reading somebody can open; a used figure on two publishers on two
  hosts; the stricter count; the season total of penalties on two publishers; what the generated file says the
  ledger owes is its open `owed` entries; the switch false while any is open; all 48 competitions as rows, an
  unknown row with a note; the help's names the rows that say yes, a late cup with its stage. Controls (each
  exits 1 and ends FIRED): thin, wiki, figure, missing, extra, onesource, receipt, handedit, highest, names,
  owedlive, and from this round stage and unread.
- `scripts/simCmVar.mjs`: Round 1218's outcomes, and in the bands the season total of penalties (control
  `penaltyband`; a caught control exits 0 and prints CAUGHT in this harness). Its coverage outcome reads the
  ledger, so the twelve new yes rows needed no hand there.
- `src/test/clubManagerVarScreen.test.tsx`: 28 cases on real halves of the engine on the shipped rates. Under
  the card of a ruled out goal it asks for the ball in the net THAT goal went into (the rule it had, "a goal
  stopped in a net", passed a card on somebody's real goal), and under any other card for no action at all.
- `scripts/playCmVar.mjs`: 40 cases and 2 help views at 390 and 1280 on a LIT build (it exits 2 on a dark one),
  with the same look under every card and the page's position read inside the page at every change.
- `scripts/simLiveSimMotion.mjs`: its `redraw` control anchors on a statement this round put over two lines, and
  its `pause` control on the clock's guard, which gained `reviewEvent` when the review screen was merged (dead
  on main since then) and `stopped` in the fix. Both anchors follow the code again and both controls fire.

## 6. For whoever turns VAR on

1. Close `recent-seasons`: two seasons from 2022-23 on, each counted by two publishers, as rows of
   `scripts/data/cmVarRates.json`. Then `node scripts/genCmVarRates.mjs` (the rates move with the new stricter
   count, so measure the bands again: `CM_VAR_BANDS_SEEDS=... node scripts/simCmVar.mjs` on five seed sets).
2. Close `penalties-total`: the engine's penalties a match with reviews on has to come inside 0.253 to 0.398.
   Until it does, a switch may only turn on goals ruled out, and that needs a rate of its own for the penalty
   kind to be zero, which the generator does not write today (both kinds are derived or neither).
3. Then the switch commit of Round 1218's closing fix (`origin/r1218-cm-var-switch`, three files), the What's
   New entry reworded for 28 competitions, and the lit walk on the plain build.
4. Still open on the screen, none of it reachable while the switch is off:
   - A review in a second half and one in extra time are held by the jsdom test only. The lit walk plays first
     halves. Two reviews in one minute are played nowhere (the engine gave none in 15,000 halves).
   - A penalty a review GIVES at the very end of a half whose last places real chances fill has not been looked
     at the way the ruled out goals were: its one case ("a review at the very end of a crowded half is still
     shown once") asks that the card comes once and the half ends on the engine's score, not what is under it.
   - A ruled out goal one place before a real last kick is played just before the wind up, so its card (say
     45+3') opens with the clock one place earlier (LIVE 45+2'). In order, and one label early.
5. The bands of `scripts/simCmVar.mjs`, for whoever next moves a rate or the default seeds. Goals ruled out:
   the band is 0.0611 to 0.0979 a match, and over the ten fleets on record the mean is 0.0760 and the standard
   deviation 0.0058, so the low edge is 2.6 of those under the mean (a fleet on seeds 901 to 906 gave 0.0644),
   not the 3.5 the harness header says. The penalty band's headroom (0.20) is the other bands', not measured
   for penalties: without reviews the engine is at 0.3597 to 0.3821 against a top of 0.3979, a margin of 4
   percent that is printed and not asserted. Neither decides anything while the default seeds stand.
