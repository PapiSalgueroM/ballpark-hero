# Round 1227 notes: the NFL rival plays your position on your own stat line, with the shared rival lift

Written 2026-10-10 by the builder (desktop Claude lane, session G). Branch `r1227-us-rival-nfl`, base
`origin/release-at-gate` at 980654fa. This is Round A of the critic's split: the shared lift and the NFL. MLB and
the NHL (Round B) follow on Round 1226's closed head and are not started here.

## What the round does
- `src/lib/careerRival.ts`: `rivalSeasonDraws` (the draw count law), `rivalSeasonStream` (the keyed stream a
  rival's season draws on), `rivalKindOf` (his kind by a hash of his name and position). The NBA binds to all three.
- `src/lib/careerRivalryEvents.ts`: `rosterFacts`, `rosterBeat` (the NBA's three cards as one builder, with an
  optional `own` pair for cards an older release dealt), `ALL_STAR_ROSTER` (the shared words), `ownRosterCards`
  cut out of `ownRosterBeat` unchanged. The NBA's beat 306 is `rosterBeat` now.
- `src/lib/usCareerStatLine.ts`: `nflLineAsPrinted`, `mlbLineAsPrinted`, `nhlLineAsPrinted` (the numbers a line
  prints and nothing else) and `NFL_RB_PRINTED_YARDS_A_CATCH = 8`.
- `src/lib/nflMyCareer.ts`: `nflStatLineFor` (the stat block of `simSeason`, cut by line number with no draw
  moved), `nflHeadToHeadScore` (both sides of the verdict), `nflRivalSeason` (the hook), the call site.
- `src/lib/careerAwards.ts`: `awardSlots`, a reader of the slot count already in the award tables (no table changed).
- `src/lib/nflCareerRivalryEvents.ts`: beat 206 on `rosterBeat` with its two old cards as `own`; beat 221 reworded.

## Decisions taken by the builder (the brief left them open, or the code forced them)
1. THE HEAD TO HEAD SCORE IS NAMED `nflHeadToHeadScore`, not `nflRivalScore` (critic's advice 17): it scores both sides.
2. THE PRINTERS' PARAMETER TYPES WERE NOT LOOSENED. The hook builds a whole season line for the rival (his year,
   club, age, rating, the season's games) and hands that to the player's printer and to `nflAwardPaceLine`, so no
   signature in the engine or the printer file changed.
3. THE ONE PLACE RULE (critic's correction 2) reads the slot count through `awardSlots('nfl', 'allPro', pos)`. His
   All-Pro draw is always taken on his keyed stream; at a one place position the answer is then refused in a
   season the player is on the first team. So the draw count on his stream never depends on the player.
4. `BuiltInRivalSport` no longer includes `'nfl'`: a call to `judgeRivalSeason` for the NFL without a hook does not
   compile. The NFL lines inside `simRivalSeason` are dead code now and stay until Round B deletes the three
   built in lines together (the draft's step i, outside this round's scope).
5. BEAT 221 is "The Charity Weekend" with a new emoji (the critic's two edits: the hibiscus was the mark of the
   all star week, and a charity game is a day where the card spends longer). Same id, gate, promise and apply.
6. A FLOOR AT ZERO in `nflStatLineFor` for seven counts (see "Found on the way").
7. P2 steps only the first 300 careers of a named sport season by season (each step is a whole drive on both
   trees), by halving; all 1,000 are still compared as whole saves.

## Found on the way
- A PLAYER'S OWN LINE COULD PRINT A NEGATIVE NUMBER. The stat block had no floor on a running back's rushing yards
  (below zero under a form of 56.35 with a low draw), on his, a receiver's or a tight end's catches, on a corner's
  passes defended, on a linebacker's tackles or on passing yards. The built in rival line had floors of its own
  (80 rushing yards, 400 passing yards, 4 catches), so binding the rival to the player's function would have
  shown a rival that defect too. Seen once: control `drawsnfl` shifts every stream and one of 107,396 judged
  seasons printed a player line the harness could not read. On the real seeds 1 to 5 none is seen before or
  after. The seven counts are floored at zero in the one function, in a commit of its own.
- THE STEP a TYPE ERROR. `rosterFacts` inferred its season type from the wrong argument for the NBA call; fixed in
  c1bd2e07 by naming the type. The type gate is green from that commit on (runner r1227-c3).

## The measured numbers (five seeds of 1,500 careers a sport, 2026-10-10)
My share of the head to head years, percent. Before is the base 980654fa (runner r1227-s0). After is the NFL bind
at 96c3f64d (runner r1227-c1). The full tables are in the header of scripts/simUsRivalSense.mjs.

| NFL | QB | RB | WR | TE | LB | CB | EDGE | K | all |
|---|---|---|---|---|---|---|---|---|---|
| before | 38.8 | 22.9 | 30.3 | 18.8 | 0.2 | 0.0 | 0.4 | 10.1 | 15.10 |
| after | 42.9 | 25.1 | 35.6 | 37.5 | 34.3 | 30.6 | 38.0 | 63.7 | 38.94 |
| after, as a healthy starter | 66.4 | 45.9 | 55.9 | 59.0 | 56.5 | 51.0 | 59.2 | 63.9 | |
| after, careers whose rival retired behind me | 38.2 | 0.0 | 22.2 | 26.6 | 19.9 | 10.7 | 27.2 | 78.7 | |

Before, a corner's, an edge rusher's and a kicker's rival line could not be read as his position's at all, and
where a line could be read the verdict disagreed with the two printed lines in 0.4 to 8.7 percent of judged years.
After: 0 of 107,618 rival lines off the player's shape, 0 unread, 0 judged years where the verdict disagrees.
MLB before 41.55 (SP 9.4, RP 8.3, DH 69.7) and NHL before 58.03 (D 39.4, G 62.7) are Round B's baseline.

NOTHING WAS TUNED. Two positions stand out and the cause is not the line: a running back takes 25.1 percent and no
career ends with the rival retired behind him, a kicker takes 63.7 percent and 78.7 percent of careers end that way.
The player ages on his position (a back falls off at 28, a kicker at 39) and every rival ages on one curve (from
31): the round after this one that the critic names. This table is its baseline.

## How each step was proven (GitHub runners; the result names are branches rc-results/<name> on origin)
- Step 0 (6779cfad): r1227-s0. The table before; simNbaAwardsSense with SENSE_PROVE_OTHERS=1 green on the base.
- Step a (ac7c22f9): r1227-a1 and r1227-a2. P1, L and P2 byte equal in all four sports against 6779cfad at full
  size. Controls tickdraws, liftkey and liftcard fired. The four anchors the lift moved in simNbaAwardsSense
  (rivaldraws, oldgate306, oldgateown, droppedanyyear) each fired "red in its section and nowhere else".
- Step b (dd3896ac): r1227-b1. The moved block is identical to the old one line for line apart from `c.pos`
  becoming `pos` (diffed before the commit). P1 and P2 byte equal against ac7c22f9; control cutdraw fired; the
  board recording before replays green and the truth digest passes with nothing allowed.
- Step c (96c3f64d): r1227-c1 and r1227-c2. P1 with RIVAL_MOVED=nfl: the player's lines, counters, the seasons a
  beat is dealt in and his own notes byte equal in all four sports, the NFL rival's trail moved, the other three
  byte equal, the NBA's cards word for word. P2: 1,000 of 1,000 NFL saves moved; 311 part off the rival and each
  holds every season line up to that season; 689 differ under the rival alone. Eight controls fired in their
  sections (verdictswap, oldscalenfl, fullscorenfl, offshapenfl, drawsnfl, bridge, oneslot, workload17).
- The recordings for step c (44c2e4d2, 83d42fec): their commit messages carry the attribution.

## What a later session must not trust
- Anything below marked NOT RUN.
- The AFTER numbers move if the rival's aging, his job or his form is ever changed: they are the baseline for
  that round, not a target. No share was tuned.
