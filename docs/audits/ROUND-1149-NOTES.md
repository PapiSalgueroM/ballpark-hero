# Round 1149 notes: the NFL, MLB and NHL My Careers get what the NBA rival got

Branch `r1149-us-rival-truth`, cut from `origin/release-as-int` at 808dbbdc (Release AS, which holds main).
Brief: `C:/Users/antho/dukb-handoff/2026-10-07/briefs-e/brief-1149.md`. This file is rewritten after every pushed
step, so a later session can finish from it. What is not listed under DONE is not done.

## The plan, in the brief's order

| Step | What | State |
|---|---|---|
| a | The Trophy Case tile row for every award, NFL, MLB and NHL, with its test and harness section | DONE, green on runners at 8da17c5f |
| b | The shared lift: one fact beat builder in `careerRivalryEvents.ts`, the NBA's beat 306 moved onto it | DONE at aea08239 and green on runners |
| c | MLB beat 206 read off the season, no coin | DONE at e2dd37a9 and green on runners; recordings 3f52f0de and 53d241a2. Its second card was REWRITTEN in step d, see there |
| d | NHL beat 306 read off the season, no coin; the beat lifted into `ownRosterBeat`; the second card reads the season before, not the ratings | DONE at e5105752 and green on runners; recordings 3b473626 and 9597ce5d |
| e | NFL beats 206 and 219, no coin | DONE at 925a7f12 and green on runners; recordings fde5f872 and bb6c560b |
| f | One What's New entry, the merge of origin/main, the last gates | BUILT: the entry is in, origin/main is merged, the last gates are in the table at the bottom |

## Step a, the tile (DONE in code, proof listed below)

`otherAwardsRow(seasons, named)` in `src/lib/careerHub.ts` is the one function for the row. The NBA's inline row
now calls it (no change in what it counts), and the NFL, MLB and NHL sport files each hand it the awards their own
rows already count, in the engine's own words:

- NFL: `MVP`, `Defensive Player of the Year` (both on `c.mvps`), `All-Pro`. The row adds the two Rookie of the Year awards.
- MLB: `MVP`, `Cy Young` (both on `c.mvpCys`), `All-Star`. The row adds Rookie of the Year, Gold Glove, Silver
  Slugger, Batting Title, Home Run Champion, ERA Title, Saves Leader, Comeback Player of the Year.
- NHL: `Hart`, `Norris`, `Vezina` (all on `c.harts`), `All-Star`, `Conn Smythe`. The row adds Calder Trophy, Rocket
  Richard, Art Ross, Selke Trophy, William Jennings, Masterton Nominee, Comeback Player of the Year.

Measured 2026-10-10 on this PC (shrunk NBA fleet, the other three sports at their full 500 careers a seed, seeds 1
to 5): tile equals rings plus awards on 2,500 of 2,500 careers in each sport. Careers whose only awards are the
lesser ones: NFL 12, 20, 19, 22, 12 a seed; MLB 22, 22, 16, 17, 13; NHL 16, 17, 6, 16, 11. With the row taken out
again (seed 1) the tile is short of the case in 32 of 500 NFL careers, 157 of 500 MLB and 164 of 500 NHL, so before
this round one MLB or NHL career in three showed fewer honours on the tile than its case listed.

Proof: `src/test/usTrophyTile.test.ts` (12 tests: each lesser award by name, the old rows reading Empty, a named
award counted once, and 120 seeded careers a sport on the real engines) and `scripts/simNbaAwardsSense.mjs` section
K, which now runs on all four fleets. New controls, each red in K and nowhere else: `norownfl`, `norowmlb`,
`norownhl`, `twicecounted` (MLB's Cy Young counted by two rows). The NBA's `norow` control was re-anchored on the
shared call.

## Step b, the shared lift (built; nothing a player sees moves)

`src/lib/careerRivalryEvents.ts` gained three things, and the NBA binding uses them:

- `factBeat({ id, emoji, title, cards })` builds a beat from cards. A card has `when` (the facts support it),
  `description`, `consequence` (what it promises), `move` (what the tap does) and `line` (what it logs). The beat
  is dealt when a card is supported. The tap finds its card BY THE PROMISE PRINTED ON THE PENDING CARD and only
  then moves anything, so nothing is drawn, the tap does what the card says, and a save sitting on a card dealt
  on the old coin (its promise reads "50/50 outcome") resolves with no effect: Continue only logs its title.
  For that, `applyRivalryEvent` now hands `apply` the pending card as a fifth argument (soccer and every other
  beat ignore it).
- `withSeasonPlayed(c, season)` is the save as the roll must see it (the season is pushed after the roll). It was
  one line inside the NBA tick.
- `lastSeasonHolds(p, award)` reads an award off the last season, for the three sports whose fact is an award word.

The NBA's beat 306 is now three cards on `factBeat`, with not a word or a number changed.

Harness: `scripts/simCareerRivalryEvents.mjs` has one shared `factBeatCheck` (each card at four rolls, nothing
drawn, the move is the promise, the old card moves nothing, every promise of a beat is different). Control
`coin306` now swaps the shared builder (the tap picks a card by a draw) and a new control `oldcard` makes the tap
ignore the card it was shown. `scripts/simNbaAwardsSense.mjs` got section Q, this round's before and after proof
(`SENSE_PROVE_1149=808dbbdc`): all four sports' players, rivals and season notes byte equal, a beat dealt in the
same seasons, the NBA's cards word for word the same, and each sport the round has moved (`Q_MOVED`, all false
at step b) differing in its cards. Control `tickdraws` (one more draw in the MLB tick) turns Q red.
`oldgate306` was re-anchored on the "only him" card.

Local, shrunk (seed 1): Q all ok, 2,230 NBA beats and 4,614 NFL, 5,624 MLB, 6,229 NHL beats compared, 0 differ.
Controls fired locally: coin306 (45 failures), oldcard (6), oldgate306 (92 of 157 cards dealt when neither made
it), tickdraws (Q red, MLB).

## Step c, MLB beat 206 (built)

The beat is `factBeat` with two cards, titled "All-Star Rosters" like the NBA's, read off the award word
`simMlbSeason` writes on the season just played (`MLB_ROSTER_AWARD`, "All-Star"):

- he made it: "The All-Star rosters are out and you are on one. It goes down as one more line in the argument
  between you and (rival)." Morale +5. Dealt whatever the two ratings are.
- he missed it, while both are rated 80 or better (the old gate): "The All-Star rosters are out and you are not on
  one, in a year people had you and (rival) both in the conversation." Morale -5.

No card says anything about the rival's roster. `mlbRivalryTick` now REQUIRES the season just played (a roll
without it would read last year's season), and `simMlbSeason` hands it over.

THE PART LEFT for the round that moves the MLB rival onto the player's stat line: the cards that name his roster
(only you, only him, both), as the NBA's 306 has them.

Measured locally (500 careers a seed, seeds 1 to 5): dealt 51, 52, 55, 66, 50 times a seed; he made it 16, 15,
13, 11, 15; he missed it 35, 37, 42, 55, 35; none contradicts its season. 4.1 to 5.0 percent of judged MLB
seasons hold an All-Star, so the honest card is the miss about seven times in ten where the coin said five.
Against 808dbbdc: players, rivals and notes byte equal, a beat dealt in the same seasons, 407 of 28,193 beats
read differently (a different pool some seasons, so a different card is picked).

Harness: `ownRosterBeatCheck` in the rivalry harness (shared by the three sports), section S in
`simNbaAwardsSense.mjs`, controls `oldgate206mlb` and `lastyearmlb` (S red), `tickdraws` re-anchored.

## Step d, NHL beat 306, and the beat as one shared builder (built)

MLB's beat and the NHL's are the same beat, so step d lifted it: `ownRosterBeat({ id, emoji, title, award, made,
dropped })` in `careerRivalryEvents.ts` builds it on `factBeat`, and `ALL_STAR_OWN_ROSTER` holds the words MLB and
the NHL share. Each sport's binding is one line. `nhlRivalryTick` requires the season just played, like MLB's.

THE SECOND CARD CHANGED between step c and step d, on a measurement. Step c shipped "he missed it while both are
rated 80 or better" (the coin beat's gate). Measured on the fleets that card was dealt 35 to 55 times a seed in
MLB against 11 to 16 for making it, and 145 to 167 against 15 to 29 in the NHL, where one season in twenty holds
the honour: a morale tax on being ordinary. So the second card is now a fact of the player's own record too:

- he made it: the season just played holds the award. Morale +5.
- he dropped off: the season just played does not hold it and the season before did. "The All-Star rosters are out
  and you are not on one, a year after you were. It goes down as one more line in the argument between you and
  (rival)." Morale -5.

A year he was never on it and is not on it now deals nothing. No rating is read. Measured (500 careers a seed,
seeds 1 to 5): MLB dealt 28, 24, 24, 29, 30 (made 16, 15, 13, 11, 15; dropped off 12, 9, 11, 18, 15); NHL dealt
42, 30, 34, 35, 35 (made 29, 19, 15, 21, 20; dropped off 13, 11, 19, 14, 15); none contradicts its seasons.
Against 808dbbdc 941 of 28,193 MLB beats and 2,833 of 31,055 NHL beats read differently, with every player,
rival and note byte equal.

Controls: `oldgateown` (the shared builder back on the ratings) replaces `oldgate206mlb`; `droppedanyyear`,
`lastyearnhl` are new; all S red.

## Step e, the NFL's two beats (built)

THE BRIEF'S PREMISE DOES NOT HOLD FOR THE NFL, on two points, and both are decided here:

1. Beat 206 (Ballot Squeeze) flipped a coin for "the Pro Bowl ballot". `simSeason` picks NO Pro Bowl. The one all
   league honour the NFL engine decides is the first team All-Pro (`allPro` in careerAwards.ts), which is on the
   season card and in the Trophy Case. So the beat reads that: it is `ownRosterBeat` with the award word
   `All-Pro`, titled "All-Pro Team". He made the first team (Morale +5), or he is off it a year after he was on it
   (Morale -5). Nothing about the rival's team.
2. The "second 50/50 beat near line 242" is beat 219, Joint Practice. It is not an All-Star beat: it flipped a
   coin for who got the better of camp practices, a result the game plays and records nowhere, so there is no
   fact to read it off. The lead's rule is no coin anywhere, so the card now names no winner: Morale +3 and the
   rivalry intensifies, the shape the NBA's summer pickup run (321) has. It is a one card `factBeat`, so a save on
   the old "50/50 outcome" card resolves with no effect.

`nflRivalryTick` requires the season just played. Measured (500 careers a seed, seeds 1 to 5): 206 dealt 5, 8, 9,
5, 10 times a seed (made 1, 4, 6, 3, 7; dropped off 4, 4, 3, 2, 3); 1.3 to 1.5 percent of judged NFL seasons hold
a first team All-Pro. Against 808dbbdc 783 of 23,030 NFL beats read differently, players, rivals and notes byte
equal. The engine fleet never deals 219 (it never changes clubs and the rival is drafted onto the player's), so
219's proof is the rivalry harness (section 4) and simNflCareer, which both now also assert that four different
rolls land one end for every one of the 24 newer beats (no coin left in the four US tables).

LEFT ALONE, FOR A RULING: NFL beat 221 (All Star Week) says "You and (rival) both make the all star roster" on
the two ratings (82 or better each, two teams). The NFL engine picks no such roster for anybody, so the card
contradicts nothing the game prints, and it is not a coin. It is still a claim with no fact behind it. Not in
the brief, not touched.

## Decisions taken (the lead may overrule)

1. The tap finds its card by the promise printed on the pending card (not by a new save field and not by a new
   beat id). That gives the old card rule with no change to any save, so a recording moves only where a card
   really changed.
2. In a sport whose rival has no season on the player's line, the roster beat has two cards, both read off the
   player's own record: he made it, and he is off it a year after he was on it. Neither says a word about the
   rival's roster, and no rating is read. Morale +5 and -5, the coin's own two ends. The beat is in the pool
   far less often than the coin beat was (it was there whenever both were rated 80 or better).
3. The title becomes "All-Star Rosters" in MLB and the NHL, the NBA's title since Round 1112, and "All-Pro Team"
   in the NFL.
4. NFL 206 reads the first team All-Pro, because the engine holds no Pro Bowl.
5. NFL 219 names no winner (Morale +3, rivalry intensifies) instead of reading a rating or the head to head.

## Owed to the other lane (guide sentences that become false)

None found yet. The guides are Codex's files and are not edited here.

## The recordings, one commit each

| Commit | File | What moved |
|---|---|---|
| 8da17c5f | usBoardFixture.json | step a. NFL, NBA byte equal. MLB 28 fields and NHL 41, all hub screens (the Trophy Case box), no click and no save |
| 3f52f0de | usBoardFixture.json | step c. MLB only: the fixed save noRole, 262 fields; the click path is byte equal |
| 53d241a2 | usCareerTruthDigest.json | step c. 19 of 22 MLB keys, 35 of 152 careers, no season count |
| 3b473626 | usBoardFixture.json | step d. NHL only: same 415 clicks, another beat from path step 292; 128 path fields, 55 on two fixed saves |
| 9597ce5d | usCareerTruthDigest.json | step d. All 10 NHL keys and 17 MLB keys (the second card), 79 of 216 careers, no season count |
| fde5f872 | usBoardFixture.json | step e. NFL only: differs from step 86, clicks part at 96; 459 clicks for 468, still 24 seasons |
| bb6c560b | usCareerTruthDigest.json | step e. All 16 NFL keys, 67 of 128 careers, one season count |

The board recorder stamps the runner's throwaway request commit; each stamp was set to the branch commit whose
tree it is (the `recordedFrom` line of the fixture), the step Round 1112 also took by hand. The digest was
recorded with `DIGEST_ALLOW` naming only the sport of the step, which refuses any other key that moved.

## What the lead must do by hand

1. SAVED PAGES at release: `/whats-new` changes (one new entry). Nothing under `public/` was written here and
   `build:seo` was not run.
2. GATE LIST should gain, for this release only (a one round proof, stale once another round edits these
   engines): `SENSE_PROVE_1149=808dbbdc node scripts/simNbaAwardsSense.mjs`. And for good: the sense controls
   norownfl, norowmlb, norownhl, twicecounted, oldgateown, droppedanyyear, lastyearmlb, lastyearnhl,
   lastyearnfl, soldascoin, tickdraws (the last needs SENSE_PROVE_1149); the rivalry control oldcard.
   `SENSE_PROVE_AGAINST` (Round 1112's section P) is stale now: against 808dbbdc the NBA rival's line does not
   move, so its "the rival did move" check would be red. Do not run it.
3. RULINGS WANTED: NFL beat 221 (All Star Week) claims a roster the engine never picks, on the two ratings; the
   three design calls under "Decisions taken"; and whether NFL 219 should name a winner off some fact instead of
   naming none.
4. NEXT ROUND, named by decision 2 of the brief: move the MLB, NHL and NFL rivals onto the player's own stat
   line (the hook is `RivalSeasonPlay` in careerRival.ts, the NBA binding is `nbaRivalSeason`). Then each
   sport's roster beat can name the rival's roster: replace its `ownRosterBeat` binding with three `factBeat`
   cards, as the NBA's 306 has them.
5. Nothing is owed to the other lane: no guide sentence about these beats or the tile was found in
   football.ts, baseball.ts or hockey.ts (grepped for coin, 50/50, ballot, Trophy Case).

## What a later session must not trust

- A runner result named below is for the commit named beside it and no later one.
- `scripts/data/usBoardFixture.json` holds hub screens. The tile row changes what the hub prints for a career with
  a lesser award, so `simUsBoardParity` may be red until the fixture is recorded again (see the gate table).

## Gates (GitHub runner results, each with the commit it ran on)

Every heavy check ran on a runner (`rc.sh`), none on the owner's PC. "fired" means a negative control went red
as designed (exit 1; the sense harness would exit 3 had it not).

| Commit | What ran | Result |
|---|---|---|
| 62b7752f (step a) | simNbaAwardsSense full size with SENSE_PROVE_OTHERS=1 | 167 checks, 0 failed |
| 62b7752f | sense controls norow, norownfl, norowmlb, norownhl, twicecounted | all fired |
| 62b7752f | simCareerHall | exit 0, all four sports green (476 s) |
| 62b7752f | simCareerRivalryEvents, simNflCareer, simMlbCareer, simNhlCareer, simNbaCareer, simHarnessAnchors, simNoRivalNames, simNoInventedQuotes | exit 0 each |
| 8da17c5f (step a, test fix and fixture) | tsc, vitest (the two tile files), simUsBoardParity, simHarnessAnchors | exit 0 each |
| aea08239 (step b) | tsc; vitest (tile files, usCareerTruthDigest); simUsBoardParity | exit 0 each: the lift moved no recording |
| aea08239 | simNbaAwardsSense full size with SENSE_PROVE_1149=808dbbdc and SENSE_PROVE_OTHERS=1 | 186 checks, 0 failed |
| aea08239 | sense controls oldgate306, tickdraws; rivalry controls coin306 (45 failures), oldcard (6), deaf, collision, beatlie, beatheat | all fired |
| aea08239 | simCareerRivalryEvents, the four career sims, anchors, rival names, quotes | exit 0 each |
| e2dd37a9 (step c) | tsc; simNbaAwardsSense full size (Q, C, S) | exit 0; 188 checks, 0 failed |
| e2dd37a9 | sense controls oldgate206mlb, lastyearmlb, tickdraws; rivalry controls coin306 (71), oldcard (10) | all fired |
| e2dd37a9 | usCareerTruthDigest plain, simUsBoardParity | RED as meant (MLB moved); both recorded again on the runner |
| e5105752 (step d) | tsc; simNbaAwardsSense full size (Q, C, S) | exit 0; 190 checks, 0 failed |
| e5105752 | sense controls oldgateown, droppedanyyear, lastyearmlb, lastyearnhl, tickdraws; rivalry controls coin306 (97), oldcard (14) | all fired |
| e5105752 | usCareerTruthDigest plain, simUsBoardParity | RED as meant (NHL new, MLB's second card); both recorded again |
| e5105752 | simCareerRivalryEvents, the four career sims, anchors, rival names, quotes | exit 0 each |
| 925a7f12 (step e) | tsc; simNbaAwardsSense full size (Q, C, S) | exit 0; 193 checks, 0 failed |
| 925a7f12 | sense controls oldgateown, droppedanyyear, lastyearnfl, soldascoin, oldgate306; rivalry controls coin306 (130 failures), oldcard (20), deaf (121), beatlie (8), beatheat (4); simNflCareer control rivalwords (8) | all fired |
| 925a7f12 | usCareerTruthDigest plain, simUsBoardParity | RED as meant (NFL moved); both recorded again |
| 925a7f12 | simCareerRivalryEvents, the four career sims, anchors, rival names, quotes | exit 0 each |
| f85c97e7 (THE MERGED HEAD: every step, the recordings, the What's New entry, origin/main) | tsc | exit 0 |
| f85c97e7 | vitest: usCareerTruthDigest, usTrophyTile, nbaTrophyTile | exit 0 |
| f85c97e7 | simNbaAwardsSense full size with SENSE_PROVE_1149=808dbbdc and SENSE_PROVE_OTHERS=1 | 193 checks, 0 failed |
| f85c97e7 | simUsBoardParity | green, four sports click for click, save for save, screen for screen |
| f85c97e7 | simCareerRivalryEvents | green |
| f85c97e7 | sense controls norow, norownfl, norowmlb, norownhl, twicecounted, lastyearmlb, lastyearnhl, tickdraws, nearlie; rivalry controls coin306 (130 failures), oldcard (20), collision (7) | all fired |
| f85c97e7 | simNflCareer, simMlbCareer, simNhlCareer, simNbaCareer, simUsCareerDeckC, simCareerParity, simAwards, simCareerRealism | exit 0 each |
| f85c97e7 | simHarnessAnchors, simNoRivalNames (0 findings), simNoInventedQuotes, simNoInventedConduct, simInventedNames, simTrustCopy, simSiteSearch | exit 0 each |
| f85c97e7 | served build, playGames ONLY=/nfl-my-career, /mlb-my-career, /nhl-my-career, /nba-my-career | 0 findings each |
| f85c97e7 | the whole vitest suite | exit 0: 388 files passed, 2 skipped; 5,334 tests passed, 55 skipped |
| f85c97e7 | simCareerHall | exit 0, all four sports green (879 s) |

The commits after f85c97e7 change this notes file only.

NOT RUN: anything that reads or writes the live Supabase project; `npm run build:seo`, the prerenderer and every
harness that reads `dist` or the saved pages (the lead's at release); the CRLF gate clone (never touched), so no
Windows line ending pass; WebKit; the whole `playGames` walk and `sweepGames` (only the four career routes);
`sweepWeight`; `simUsCareerSummer` (the long kit), `simUsSeasonCentre` and the rest of `runAllSims` beyond the
list above; the US board parity controls (the harness is unchanged apart from its header); and no adversarial
review pass (the reviewer after this builder is the check).
