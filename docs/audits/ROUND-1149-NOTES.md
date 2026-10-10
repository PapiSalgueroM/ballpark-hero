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
| e | NFL beats 206 and 219, no coin | BUILT, see below; recordings follow |
| f | One What's New entry, the merge of origin/main, the last gates | not started |

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

## What a later session must not trust

- A runner result named below is for the commit named beside it and no later one.
- `scripts/data/usBoardFixture.json` holds hub screens. The tile row changes what the hub prints for a career with
  a lesser award, so `simUsBoardParity` may be red until the fixture is recorded again (see the gate table).

## Gates (runner results, each with the commit it ran on)

Filled in as results come back.
