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

## What a later session must not trust
- Anything below marked NOT RUN.
- The AFTER numbers move if the rival's aging, his job or his form is ever changed: they are the baseline for
  that round, not a target. No share was tuned.
