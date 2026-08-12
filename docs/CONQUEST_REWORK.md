# NFL Conquest rework plan (task 83 research, 2026-08-05)

Anthony asked for a research pass on the real "imperialism map" format and a
proper rework. Here is how the canonical format works, per
imperialismmap.com/rules (the site the viral Reddit maps standardized on):

## The real format

1. Starting territory is a Voronoi split: every point on the map belongs to
   whichever team's stadium is nearest. No state lines, no drafting.
2. When two teams play, the WINNER CONQUERS ALL of the loser's territory.
   Margin of victory is irrelevant.
3. A team that loses everything stays in the running: it keeps playing its
   schedule, and if it wins a later game it takes the winner's ENTIRE empire
   and storms back onto the map. Comebacks are the whole drama.
4. Ties change nothing.
5. Territory compounds: beating a team that owns half the country hands you
   half the country. Late wins beat early wins.

## What our current game does instead

useConquest.ts (1,094 lines) runs a wheel-spun battle sim where you steal
players from losers and states flip one at a time, with power-ups. Fun, but
it is not the imperialism format, which is what people recognize.

## Rework design (contained, reuses the existing sim)

- KEEP the play-by-play battle sim and the team strength model. They become
  the per-game resolver.
- REPLACE state-by-state flipping with empire sets:
  ownership: Map<team, Set<stateId>>. Seed each state to its nearest NFL
  stadium (a static STATE_HOME map baked at build time; states-level Voronoi
  approximation, no county data needed). Alaska/Hawaii go to SEA/LV per
  nearest-stadium math.
- Game resolution: winner's set absorbs the loser's whole set. Loser stays
  in the fixture list (landless comeback rule). Ties = no change.
- Schedule: 18 weekly rounds of random pairings (or a real-schedule mode
  later if per-game results data gets loaded; nflfastr player stats cannot
  reconstruct winners reliably because kicking data is missing, so do NOT
  fake "real 2023 results").
- The player-steal and power-up mechanics can stay as an optional "Arcade"
  mode toggle so nothing Anthony liked is deleted; the new "Imperialism"
  mode is the default and matches the format people know.
- End state: one team owns all 50 states, or after week 18 the biggest
  empire wins. Share text: final map emoji rows by region.

## Effort estimate

- STATE_HOME nearest-stadium table: 30 min (verifiable geometry, one-time).
- Empire-set refactor in useConquest: the ownership model is localized to a
  few reducers; est. 2-3 hours including the comeback rule.
- Map render already exists (ConquestBoard); only ownership coloring feeds
  change.

Sources: imperialismmap.com/rules, /nfl, /about (fetched 2026-08-05).
