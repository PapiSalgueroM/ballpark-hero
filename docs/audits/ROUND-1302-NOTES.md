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

The engine gives about 0.36 penalties a match without reviews and a review's penalties come on top of those:
seven fleets of Round 1218 measured 0.4515 to 0.4780 with reviews on, every one above the band, the nearest by
13 percent. So the engine cannot stay inside the band on the sourced rates, and by decision 4 penalties by
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

## 4. The review screen

- **The case the reviewer saw** (seed 2042 of the opener: my goal at 44, theirs ruled out at 45) is kept as its
  own test in `src/test/clubManagerVarScreen.test.tsx`, played from before my goal to the whistle.
- **A goal ruled out in the last two clock places of a period is drawn before its card** when it has the end of
  the period to itself (no chance and no other ruled out goal from the place before it to the whistle):
  `stagePitchInput` in `LiveSimScreen.tsx`, the `lateRoom` rule. At the whistle's own place the plan winds it up
  to end at the whistle like any last kick; one place before, it is played on time. Where it shares those
  places with a real chance it is still shown by its card alone: a goal that counts for nothing must not take
  the pitch from one that is real.
- **Played for the first time**, each on a real half: an own goal the minute after a ruled out goal; a review
  in the same minute as the other side's injury, red card and (in a second half) substitution.
- **What the engine does not hold**, so nobody can play it: two reviews in one minute, or in back to back
  minutes (none in 15,000 halves searched). Extra time is played only in a Champions League knockout tie.
