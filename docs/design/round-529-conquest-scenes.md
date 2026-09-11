# Round 529 design contract: Conquest looks and feels like the videos

Written 2026-09-11 by the desktop lane, from a research pass over the format's sources the
same day. His words, twice: 2026-08-28 "the map presentation is far behind the imperialism
style videos the format comes from. Watch them, screenshot the FORMAT (region map, team
territories, takeover flow) and rebuild the visuals. Original colors and names only, never
logos." And 2026-09-11: "the conquest games to look and feel exactly like there youtube
version."

## What "the youtube version" is

Two lineages share the name, and both were read.

**The web map (real results).** Started on the college football subreddit in September 2017:
the USA split by county to the nearest stadium, every real game moves land, a weekly image.
It lives on today as imperialismmap.com (Voronoi cells from stadium points on a dark ground,
the team's full name in caps fitted inside its land plus a stadium dot, a week slider, a result
feed of "Winner 13 to 10 Loser, +1 territory" lines, a Teams Remaining sidebar ranked with bars
and a "controls 6% of the map" line, and season records at the end: Biggest Land Grab, Longest
Reign, Most Conquered, Biggest Collapse). Rules: winner takes ALL the loser's land, ties move
nothing, a landless team keeps playing and jumps back on by beating a landholder.

**The video series (simulated, wheel driven).** The one his screenshot came from. A creator
puts every team on a blank state map (flat team colour, the logo centred on the land), spins a
wheel to pick the attacker, spins an arrow for a direction, cuts to the sports game to sim the
matchup, cuts back and recolours the loser's land to the winner, and the loser is gone. Vacant
land is claimed without a game. Last team standing owns the map. The camera zooms to the region
where the fight is. Fifty to eighty minutes of narration. No sidebar, no counter, no eliminated
list on screen: the logo simply disappears from the map.

**What we already have.** The shared engine (`imperialismEngine.ts`) plays the web map's rules
exactly (winner takes all, no draws, the wiped out keep playing, random pairing rounds then an
eight club playoff). The shared renderer (`ConquestRegionMap.tsx`, Round 457) draws one label per
empire with a takeover wave. Arcade mode on the NFL and NBA routes already has the wheel and the
direction spin. What is missing is everything that makes the videos FEEL like the videos: the
map is a 560px box under three status pills, a round is a list of thirteen result lines, the
featured game is a card with two buttons, nothing zooms, nothing is a scene, and the imperialism
mode has no "?" help at all (the help button only mounts in arcade).

## The gate questions

Different from an existing game? It is not a new game. It is the presentation layer of five
routes that already exist and share one board, so the work lands once. Engine, rules, daily seed,
save shape, scoring: unchanged. Replay value comes from the daily already; this makes the daily
worth watching.

## Objective in one sentence

Pick a team, watch the season play out on a map that fills the screen, one fight at a time, and
see who ends up ruling the map.

## What changes, in the order a player meets it

1. **The map is the stage.** Edge to edge on a phone, up to 760px on desktop. Flat team colour
   fills, crisp dark borders between empires, faint inside them. One name per empire in caps,
   larger, letter spaced, fitted (the code where the name does not fit, as now). A small ring at
   each team's home region ("the stadium dot"). Patterned looks stay for near twin colours (the
   measured rule from Round 457), but the pattern is finer so the flat colour reads first.

2. **A round is a sequence of scenes, not a list.** After the player calls the featured game
   and presses Play, the round's games play out one by one on the map:
   - the matchup card slides in (attacker on the left in its colour, defender on the right,
     empire counts and records under each),
   - the map camera zooms to the bounding box of the two empires (a CSS transform on the map
     group, 450ms, eased), the attacker's land pulses, the arrow draws,
   - a beat, then the score slams in as its final value ("27 to 24, FINAL", never a count up:
     Round 147's rule),
   - the takeover wave spreads across the loser's land, the "+N states" chip lands on the
     winner, the standings strip reorders,
   - next game. Scenes play in the ENGINE'S order (the round's pairing order), because the
     engine applies transfers in that order and `ImpGame.flipped` records exactly what each
     game moved; reordering would show land moving that did not move. The featured game is
     marked when its turn comes, with the player's call on the card and the hit or miss landing
     with it.
   A Skip button jumps to the end of the round at any point. On reduced motion every scene
   lands on its final frame with no camera move, and the round shows its recap directly.

3. **The wheel and the arrow.** Before the featured game's scene, the wheel spins: a ring of
   team colour wedges with names, decorative and deterministic, it always lands on the engine's
   attacker. Then the direction arrow spins and lands pointing from the attacker's empire to the
   defender's. Pure decoration over a value the engine already fixed, so a reload cannot change
   anything (the run is replayed from the club plus the calls, Round 476).

4. **Teams Remaining, always on.** The hidden standings toggle becomes a strip under the map:
   ranked chips with a territory bar and count, the player's team pinned first, "N of 32 hold
   land, M wiped out" on the right. Top eight plus "+N more" on a phone, the whole league on
   desktop. Tapping a chip highlights that empire on the map.

5. **The timeline.** A scrubber under the strip: Start, Wk 1 ... Final. The owners map after
   every settled round is kept in memory for the run (rebuilt from the replay on reload, so
   nothing new is saved), and scrubbing shows the map as it was. It is the "how we got here"
   the spec's D108 asks for and the week slider the web map has.

6. **The ending.** When the map is one colour: the winner's colour floods the map with the
   wave, a Conquest Complete banner slams in with the celebration kit, and four season records
   computed from the run's own game log: Biggest Land Grab (largest single game swing),
   Longest Reign (most consecutive rounds as the largest empire), Most Conquered (most times
   wiped out), Biggest Collapse (largest empire lost in one game). Each names the team and the
   round. Share line unchanged.

7. **Help.** The imperialism mode gets its own How to Play (rules, the wheel, what a takeover
   means, a worked round), shown before the first run on a route and reopenable from the "?"
   the arcade mode already has. Five routes, one component, sport nouns injected.

## What does not change

The engine, the rules, the daily seed and its replay log, the completion id and the score
model (+25 per correct call, the empire bonus), the pick screen, the arcade mode's own loop
(it inherits the renderer's map size, labels and camera through the battle prop and nothing
else). No rule toggle ("take one" or "loser stays in") ships in this round; the engine plays
one rule set per sport and the daily must stay comparable across days.

## Controls, mobile first

Every tap target 30px or more (the sweep's floor). The scene player sits under the map inside
the reveal ref so a new scene never moves the page (the no scroll rule). Skip and Continue are
full width buttons on a phone. The timeline is a range input with a 30px thumb.

## Data

None new. The map spec, teams and colours are the existing per sport data. The NFL stadium
coordinates carry no source line yet (the provenance inventory, rank 12); Round 531 adds it, this
round does not touch data files.

## Legal

Colour and name text only. No logo, crest, kit or photograph, on the map or on the wheel. The
wheel wedge is a colour and a name. The "stadium dot" is a ring, not a mark.

## The harness

`scripts/simConquestScenes.mjs`, node, renders the real components through react-dom/server
inside a MemoryRouter over seeded runs for all five sports, and asserts the strongest signals:

1. The scene list for a settled round is exactly that round's games in engine order. No scene
   shows a game the engine did not play (nothing invented).
2. Every scene's score is the engine's score, and the score element does not exist before its
   scene (no number through false values).
3. The takeover of each scene marks exactly the regions that game flipped, recomputed by
   applying the round's games in scene order to the pre round map.
4. The four season records equal an independent recomputation over the run's history, on a run
   played to the end, for every sport.
5. The timeline holds one map per settled round, the first equals the opening map and the last
   equals the run's owners.
6. The wheel's landing wedge is the featured attacker and the arrow's target is the defender.
7. Reduced motion: the rendered style lands every scene animation on its final frame and the
   camera transform is none.
8. No board in `src/components/conquest` draws a scene, a wheel or a timeline except the shared
   files (comments stripped first).

Negative controls, each refusing to run if its rewrite changes nothing: `SCENE_CONTROL=extra`
(a scene for a game not in the round, section 1 must go red), `SCENE_CONTROL=fakescore` (a
scene carrying a score one off the engine's, section 2), `SCENE_CONTROL=records` (Biggest Land
Grab reported from the second largest swing, section 4).

`scripts/playConquestScenes.mjs`, Chromium at 390 and 430 wide, plays a free run on `/conquest`
and `/soccer-conquest`: the map is at least 60% of the viewport width tall on the phone, Play
starts the scenes and the score element appears only after its card, Skip ends the round, the
timeline scrubs to Start and back, the page's scroll position never moves during a scene (the
no scroll rule), every button is 30px or taller, and the ending banner mounts with the crown.

## Files

`src/components/conquest/ConquestRegionMap.tsx` (camera, labels, home dots, size),
`src/lib/conquestMapLook.ts` (finer patterns, label sizing), `src/lib/conquestRun.ts` (history
and records, pure), new `src/lib/conquestScenes.ts` (the scene list and the wheel and arrow
values, pure), new `src/components/conquest/ConquestScenePlayer.tsx`, new
`ConquestWheel.tsx`, new `ConquestTimeline.tsx`, new `ConquestStandingsStrip.tsx`, new
`ImperialismHowToPlay.tsx`, `ImperialismBoardShared.tsx` (mounts all of it), the five pages
(help button in imperialism mode), `scripts/simConquestScenes.mjs`, `scripts/playConquestScenes.mjs`,
`scripts/simConquestMap.mjs` (label and size sections updated), the five routes' SEO copy
(howToPlay lines mention the scenes).
