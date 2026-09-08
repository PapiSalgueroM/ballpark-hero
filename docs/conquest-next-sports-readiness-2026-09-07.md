# NFL and NBA Conquest readiness

Audit date: September 7, 2026. Tree inspected at `8391f67f`. This is a local, read-only readiness audit against `docs/conquest-reference-audit-2026-09-07.md`. It does not claim that NFL or NBA Attack, the reference powers, or new sports data are implemented.

## Finding

The existing US polygon map and the 10-player team tables are useful inputs, but neither current mode is the requested game. The safest next slice is a separate, versioned Attack mode on each existing route. It can reuse the map renderer and current roster cards, but it needs a deterministic elimination engine, full player objects in moving rosters, explicit power lifetimes, and a new save namespace.

Two real-data gates remain:

1. Bloom cannot be implemented honestly. Neither Conquest roster has a structured rookie, draft year, or experience field.
2. Early expansion recruits need a newly verified current free-agent pool for each sport. The local pools are mixed current and recent lists without per-row sources or an as-of field, and the NBA power path currently starts from the shared football pool.

## Existing local coverage

Counts below come from the exported TypeScript literals, not database estimates.

| Surface | NFL | NBA | Contract impact |
|---|---:|---:|---|
| Teams | 32 | 30 | Full league IDs and colors exist in `src/data/conquestData.ts` and `src/data/conquestDataNba.ts`. |
| Roster cards | 320, all unique, 10 per team | 300, all unique, 10 per team | Enough for steals, weakest and strongest selection, and temporary borrowing. These are selected cards, not full active rosters. |
| Player rating range | 75 to 99 | 70 to 99 | Supports deterministic game modifiers if the saved snapshot preserves the original rating. |
| Structured quarterback coverage | 32, exactly 1 per team | Not applicable | NFL Gunslinger can target `position === 'QB'` without new facts. |
| Structured rookie coverage | 0 | 0 | Bloom requires new verified data. Do not parse `keyStat` prose. |
| Rendered map regions | 56 | 58 | Both use geographic US polygon paths from `src/data/usStatesPaths.ts`. |
| Visible neutral regions at Arcade start | 24 | 0 | NFL has expansion land. NBA's 58 rendered regions are all assigned at start. |
| Docked free-agency candidates | 14 | 12 | Fields are `name`, `position`, `overall`, `blurb`. Status is not source-backed per row. |
| Shared power free agents | 20 | The same 20 are imported | `src/data/conquestPowerups.ts` is football-flavored and must not seed an NBA expansion pool. |

Player card fields are `name`, `position`, `overall`, and `keyStat` in `ConquestPlayer` at `src/data/conquestData.ts:81` and `NbaPlayer` at `src/data/conquestDataNba.ts:44`. Team fields also include `rating`, `offense`, `defense`, `overall`, colors, and an unused empty `roster` array. There is no stable player ID, `originTeam`, rookie flag, draft year, experience, per-card source, or roster data version.

The separate `src/data/nflCareerPlayers.ts` has structured `draftYear`, but only 31 of its 78 names overlap the 320 NFL Conquest cards. `src/data/nbaCareerPlayers.ts` has 20 historical puzzles, only one name overlaps the NBA Conquest cards, and draft information is display text. Neither file can close the Bloom gate.

## Map and targeting seams

- `src/data/usStatesPaths.ts` owns 60 total polygons. `NFL_STATES` filters out four NBA-only splits for 56 regions. `NBA_STATES` filters out two NFL-only parent regions for 58 regions.
- `src/lib/conquestMapGeometry.ts` owns the 56-region NFL border graph and derives the NBA graph by replacing the California and Texas parent regions with finer splits. `src/components/conquest/ConquestRegionMap.tsx` already renders solid owners, neutral land, frontier borders, labels, takeover waves, power markers, and an attack arrow from region anchors.
- `src/data/conquestData.ts:543` contains centers for all 60 region IDs. `src/data/conquestSports.ts:31` contains 32 NFL stadium coordinates and `seedNflEmpires()` assigns every rendered NFL region. NBA has no equivalent arena-coordinate table. `INITIAL_TERRITORIES_NBA` is a hand-tuned complete assignment.
- Current Arcade targeting is not the reference ray rule. `src/hooks/useConquest.ts:218` restricts candidates to adjacent regions, then uses empire centroids and a 67-degree cone. `src/hooks/useConquestNba.ts:152` scans every team and neutral region by centroid without the polygon adjacency gate. Neither asks which polygon the direction ray first intersects.
- NBA Arcade builds state from all 60 `STATE_POSITIONS` at `src/hooks/useConquestNba.ts:88`, although its map renders 58. The two excluded parent regions, `CA_N` and `TX_S`, begin neutral, can be targeted, and receive the only initial NBA power markers. They are invisible. A new mode must build owners from `NBA_STATES` or its adjacency keys, never the shared 60-position list.

The existing initial assignments can support a game-labeled geographic Attack map without new venue facts. If copy claims territories are computed from the nearest NBA arena, verified arena coordinates and a reproducible seeding method would be new data work. The current hand-tuned NBA assignment alone does not prove that claim.

## Roster movement and expansion

The current hooks store rosters as names. That loses a moved player's card in the battle engines: `getPlayersByPos()` in `src/lib/conquestBattle.ts:50` and `src/lib/conquestBattleNba.ts:68` look only in the player's current team's original table, then fall back to position `?` and overall 75. A captured or borrowed player therefore stops carrying reliable position and rating data after moving.

NFL's eliminated-player pool at `src/hooks/useConquest.ts:409` correctly reads each eliminated team's final live roster and uses a global name lookup. NBA's version at `src/hooks/useConquestNba.ts:317` rereads the eliminated team's original static cards instead, so prior captures or signings are not preserved. Neither mode recruits on expansion. Expansion currently adds a team rating drift of 1 at `src/hooks/useConquest.ts:777` and `src/hooks/useConquestNba.ts:572`.

For Attack, save full cards with a stable generated ID, original team, position, base rating, current modifier, and rookie flag when verified. Then the remainder of an eliminated final roster can supply later expansion recruits without new sports facts. Expansion before any elimination still needs a verified sport-specific free-agent snapshot, or a documented no-recruit result when the pool is empty.

## Reference power support

| Reference effect | Supported by current facts? | Required implementation or data |
|---|---|---|
| Evolved | Yes | Rank saved player cards by current rating and persist boosts to the two weakest. Seed all ties. |
| DNA | Yes | Engine-only armed and consumed lifecycle. It copies the next newly acquired power. |
| Double Trouble | Yes | Full-card roster transfer can move two selected steals. Preserve identity and origin. |
| Bandit | Yes | Engine-only seeded team selection plus full-card roster transfer. |
| Clover | Yes | Engine-only owner-bound wheel weight. Keep it out of conquest transfer. |
| Bloom | No | Add two-source verified rookie status to every eligible roster snapshot. The three NBA `keyStat` strings containing the word rookie are incomplete prose, not a dataset. |
| Dead Rising | Yes | Engine-only resurrection and valid random region placement, with ownership conservation checks. |
| Acid Rain | Yes | Engine-only placement of three additional power cards on eligible map regions. |
| Afterlife | Partly | Current `invincibility` is only a rough starting point. Arcade repels a losing attacker before consuming protection, while the reference eliminates either loser. The reference also permits a player steal while land is protected. |
| Gunslinger | NFL only | NFL has exactly one structured QB card per team. NBA needs an explicit basketball adaptation or omission. It cannot literally implement a quarterback boost. |
| Prisoner of War | Yes | Borrow a full player card for one match, then return it. Name-only rosters are not sufficient. |
| Tornado | Yes | Engine-only seeded selection and pair swaps of complete territory sets. |

Current `POWERUPS` at `src/data/conquestPowerups.ts:71` has only `invincibility`, `free_agent`, `upgrade`, `legend`, and `territory_steal`. `teamSavedPowerups` does not transfer on conquest, there is no owner-bound versus transferable metadata, and upgrades are one-battle overrides rather than persistent card changes. The turn counter also increments on both expansions and matches, so it cannot drive the reference events after 8, 16, and 24 resolved matches.

The current loss rule is intentionally opposite to the reference. `src/hooks/useConquest.ts:908` and `src/hooks/useConquestNba.ts:678` repel a losing attacker without eliminating it. `src/hooks/useConquestNba.test.tsx:35` and `scripts/simConquestNbaArcade.mjs` explicitly protect that behavior. A new Attack harness must test the new mode separately instead of weakening the Arcade guard.

## Save boundary and next build gate

Arcade has no run save. Its hooks use React state only. The only Arcade localStorage keys on the route are help-seen flags in `src/pages/Conquest.tsx:23` and `src/pages/ConquestNba.tsx:23`.

Imperialism daily uses `conquest-nfl-daily-YYYY-MM-DD` and `conquest-nba-daily-YYYY-MM-DD` through `src/lib/dailyRecord.ts`. Its `ConquestDailyRun` at `src/lib/conquestDaily.ts:85` stores only `team`, ordered `picks`, `done`, and `result`, then replays from the date seed and current static sport data. It has no roster snapshot, power state, rules version, data version, match counter, or RNG position. Do not reinterpret or migrate those records in place.

Use separate keys such as `dukb-conquest-attack-nfl-v1` and `dukb-conquest-attack-nba-v1`. The strict payload needs `rulesVersion`, `dataVersion`, sport, seed and RNG position, revision, rendered region snapshot, original and current full-card rosters, owners, power placements and ownership, consumed effects, resolved-match counter, and committed actions. Validate on load and serialize cross-tab writes before reveal.

`src/lib/conquestAttack.ts` is a useful structural seam for polygon-ray targeting, deterministic transitions, full snapshot validation, and player origin tracking. Its current `AttackPlayer` is only `id`, `name`, `rating`, and `originTeam`, and its save schema has no position, rookie status, powers, or expansion recruits. Reuse requires an explicit extension or sport adapter. It is not a drop-in NFL or NBA engine.

Before either sport can be called ready, the focused harness should prove: first polygon hit, elimination of either losing side, owner and player conservation, original-best plus prior-capture transfer, expansion recruitment order, every power's effect and lifetime, match-only event counts, exact reload replay, hidden-region exclusion, and the NFL versus NBA Gunslinger rule. Each new check needs a live negative control.
