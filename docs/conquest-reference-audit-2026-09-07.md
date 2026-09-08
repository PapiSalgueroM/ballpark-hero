# Conquest: the owner's reference correction

Research date: September 7, 2026. Round 511. This is source evidence and a proposed
build contract, not a claim that the new games are implemented or published.

## The request that replaces the old design

Soccer follows JarradHD's [700 Team Global Imperialism](https://www.youtube.com/watch?v=BmxyYaADb0U),
not the earlier Premier League video. Offer Premier League, La Liga, Europe and
World maps, with leagues the player can include or exclude.

NFL and NBA should use the geographic map style and power-up ideas in Deansworld's
[NFL IMPERIALISM RETURNS in Madden 26](https://www.youtube.com/watch?v=35OCnB27MWA).
The owner has not supplied an exact NBA episode. An NBA adaptation is our design,
not a claim that this football video establishes basketball-specific rules.

The owner also rejected the number of players valued on soccer club tiles. Remove
that display and its help promises, retaining the total, internal coverage fields
and partial-data warning. Do not market the new game by its club count.

## What was actually inspected

Both original videos were located by exact title. Their primary auto-caption
transcripts were exported and relevant rule passages read. Selected map and power
card frames were inspected. This was not a continuous watch of both whole videos.
Auto-captions are not a trustworthy roster source. No player names, ratings,
transfers or current league membership are imported from them.

### Soccer evidence

| Video time | Observed rule |
|---|---|
| 0:24 to 1:07 | A team wheel and direction spin select an attack. A defeated club is eliminated and its best player goes to the winner. |
| 1:36 to 1:58 | The winner also takes all players that the defeated club had captured earlier. |
| 2:15 to 2:32 | A country's only included club starts with that whole country. |
| 3:38 to 3:57 | Claiming empty land gives the highest-rated player a +2 game-rating upgrade. |
| 4:12 to 4:29 | A losing attacker is eliminated too. |
| 8:30 to 8:51 | Owning Finland does not permit Helsinki to cross water. The direction is redrawn; the narration says a continent must be conquered first. |
| 9:07 to 9:36 | An empty country gives +2 to the best player; completing a country with clubs gives +4; completing a continent gives +1 to each starter. |
| 10:30 to 10:38 | A wheel breaks a tie for the highest-rated player receiving an upgrade. |
| 22:45 to 23:06 | A dense-city inset handles Buenos Aires. It is an explicit grid exception to the geographic map. |
| 36:26 to 37:07 | Crossing water within the same league or footballing pyramid is allowed. Bastia crosses to face Marseille; Wellington and Australian clubs are explicitly covered by the same exception. |
| 59:30 to 59:41 | The direction ray can miss an opponent's territory and reach empty land instead. |

The map uses blue water, white unclaimed land, solid ownership colours, strong
territory outlines and local/world views. Our map must use text markers, not the
creator's club logos or copied artwork. Generated game borders must not be passed
off as real administrative boundaries.

Two rules need an explicit implementation choice. The early water explanation
mentions nation or continent, but the later Finland example rejects nation-only
unlocking. The same-pyramid island exception is explicit, but Part 1 does not show
a universal international crossing unlocked by conquering an island. Draws also vary:
several fixtures replay, while a later watched match
uses penalties. Bonus stacking on simultaneous country/continent completion is
not established by the inspected passages. Do not silently label any chosen
interpretation an exact creator rule.

### NFL evidence

| Video time | Observed rule |
|---|---|
| 0:00 to 0:12 | Team wheel, direction, attack or expansion, one survivor. Conquest steals a player; an empty state recruits from the free-agent pool. |
| 0:17 | Evolved boosts the two weakest players to the strongest player's game rating. |
| 0:22 | DNA duplicates the next acquired power. |
| 0:33 | Double Trouble gives two player steals per conquest. |
| 0:38 | Bandit steals from two randomly chosen teams. |
| 0:50 | Clover adds two entries to the team's selection wheel. |
| 0:55 | Bloom boosts two rookies to 99 in the simulated roster. |
| 5:48, 22:00 | A losing attacker is eliminated; the winner takes the defeated empire. |
| 6:29 | The remainder of an eliminated roster supplies expansion recruits. |
| 15:44 | Dead Rising revives two eliminated teams into random states. |
| 24:39 | The arrow must intersect territory, not an overlapping team logo. |
| 29:25 | Acid Rain places three more powers on the map. |
| 29:39 | Afterlife grants an extra life; Gunslinger boosts the quarterback's game rating to 99. |
| 33:26 | Prisoner of War temporarily borrows a player before each match. |
| 26:12 | Tennessee's wheel has one entry after conquering Clover-holder Kansas City. Clover does not transfer here. |
| 34:48, 50:58 | Prisoner of War and Double Trouble transfer with conquest. |
| 36:55 | Afterlife prevents losing land but still permits a player steal. |
| 41:45 | Expansion recruitment happens before upgrades. |
| 44:08 | Tornado is described as relocating half the surviving empires. The demonstration swaps three pairs among eleven survivors. |

The counter can be resolved from play: two expansions occur in turn one, while
turn twenty advances despite Afterlife preventing elimination (36:55 to 37:07).
Count resolved matches, not expansions or eliminations, for events after 8, 16
and 24. DNA's later narration contradicts its card, and the creator acknowledges
an error in the Tornado implementation. Use documented, testable app rules, not
an accidental recreation of editing mistakes.

Proposed interpretations where the episode is inconsistent: DNA arms one copy
of the next newly acquired power, then is consumed, following its card rather
than retroactively copying an existing ability. Tornado selects distinct teams
without replacement, in the nearest even number to half the survivors, ties
rounded upward, then swaps their complete territory sets in pairs. These choices
must appear in help and tests before implementation, not as claims about the video.

Keep power lifetimes distinct: Double Trouble and Prisoner of War are transferable
ongoing effects; Clover is owner-bound; Afterlife is a consumed extra life; Bandit
is a one-time steal; upgrades remain on affected game-roster entries without
re-running merely because a territory or player changes hands.

Powers should be described as optional team/game modifiers. Do not attribute
fictional abilities, dialogue or conduct to a named real athlete. Named roster
facts remain factual; any simulation adjustment must be visibly a game modifier.

## Existing implementation, measured rather than assumed

- Soccer currently runs random whole-field fixtures, keeps landless clubs playing
  and ends in a playoff. It is a season prediction game, not this elimination loop.
- Soccer's 96 clubs cover five leagues. Its board is a hex cartogram, not geographic
  club territory. No verified local soccer stadium-coordinate table was found.
- The existing world asset has 173 country outlines, but no club coordinates. UK
  is one shape; several small European countries are absent. Its continent labels
  and geometry need checking before they drive attack or continent-completion rules.
- The Club Manager registry contains 330 clubs and 3,667 player rows, with 136
  partial clubs and 27 empty squads. Those are coverage measurements, not proof of
  a complete, current global pool. Do not fill empty squads with invented real data.
- NFL and NBA already have separate directional Arcade hooks and shared geographic
  rendering. Their powers, loss rules and randomness are not this episode's contract.
- The existing daily save contains no league configuration or data version. Filtering
  its roster would reinterpret old action logs. Do not change those saves in place.

## Proposed build contract

Objective: keep expanding until one team owns the map.

Reuse the current Conquest routes and shared map rendering. A replacement of the
existing season engine in place would scramble saved dailies; an unrelated new
route would duplicate the game. The recommended path is a versioned Attack mode
within the existing routes, preserving the current daily until explicitly migrated.

The common loop is setup, team spin, direction spin, legal target preview, match
or expansion, reward, ownership update, next spin. A territory ray determines
the target, never a label's size. Winning against either attacker or defender
transfers the defeated empire, subject to documented extra-life rules.

Keep the map as the main screen. Use tap-friendly zoom, local/world navigation,
team names and colours, an attack arrow and a small result panel. Team inspection,
captured roster, power cards and history open in drawers rather than pushing the
map down a long page. Instructions and a worked example appear before play and
reopen from a question-mark button. Results stay in view without page jumps.

Soccer map presets and league toggles determine both participating clubs and
territory generation. Excluded clubs are absent, not decorative opponents. The
first playable slice should be one verified league, then both named leagues,
Europe and World. This order does not shrink the owner's final request.

Use a deterministic pure engine with a saved seed and RNG position. Save the
rules version, data version, preset, sorted selected leagues, roster snapshot and
committed actions in a new namespace. Resume must reproduce the same map, powers,
rosters and next result. Preserve the older daily data without rewriting it.

Start the configurable mode as unlimited, with no ranked points from randomly
favourable spins. The existing daily's capped prediction scoring stays unchanged.
Any later ranked Attack daily needs a separate comparable scoring contract.

Data gate: every enabled league needs verified membership, locations and roster
coverage sufficient for player capture. Two independent sources for new real
facts. Generated territory polygons are game geometry, clearly labelled as such.
No guessed world dataset and no reuse of historical video rosters as current ones.

Verification must measure ownership conservation, termination with one survivor,
eliminated-team wheel exclusion, every reward's actual effect, exact reload replay,
league exclusion, legal coast/direction handling and phone usability. Negative
controls must break a real transition, transfer, wheel weight or save, not merely
change explanatory text. Follow with type, build, relevant sims and browser play.

Not implemented in Round 511's copy slice: the new engine, geographic soccer
territories, league filters, new power rules, disasters or versioned Attack saves.
