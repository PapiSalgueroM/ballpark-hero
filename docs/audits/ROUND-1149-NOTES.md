# Round 1149 notes: the NFL, MLB and NHL My Careers get what the NBA rival got

Branch `r1149-us-rival-truth`, cut from `origin/release-as-int` at 808dbbdc (Release AS, which holds main).
Brief: `C:/Users/antho/dukb-handoff/2026-10-07/briefs-e/brief-1149.md`. This file is rewritten after every pushed
step, so a later session can finish from it. What is not listed under DONE is not done.

## The plan, in the brief's order

| Step | What | State |
|---|---|---|
| a | The Trophy Case tile row for every award, NFL, MLB and NHL, with its test and harness section | BUILT, see below |
| b | The shared lift: one fact beat builder in `careerRivalryEvents.ts`, the NBA's beat 306 moved onto it | not started |
| c | MLB beat 206 read off the season, no coin | not started |
| d | NHL beat 306 read off the season, no coin | not started |
| e | NFL beats 206 and 219, no coin | not started |
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

## Decisions taken (the lead may overrule)

Recorded as they are made. None yet beyond the brief.

## Owed to the other lane (guide sentences that become false)

None found yet. The guides are Codex's files and are not edited here.

## What a later session must not trust

- A runner result named below is for the commit named beside it and no later one.
- `scripts/data/usBoardFixture.json` holds hub screens. The tile row changes what the hub prints for a career with
  a lesser award, so `simUsBoardParity` may be red until the fixture is recorded again (see the gate table).

## Gates (runner results, each with the commit it ran on)

Filled in as results come back.
