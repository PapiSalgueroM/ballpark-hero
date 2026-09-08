# Geographic Soccer Attack Implementation Plan

> For agentic workers: use superpowers:subagent-driven-development. Steps use checkbox syntax. The owner asked to continue after reviewing the direction; execute without repeated approval requests.

**Goal:** A playable geographic English-league Attack mode on Soccer Conquest, with directional battles, captured players, upgrades and safe resume.

**Architecture:** A deterministic serializable engine consumes an immutable map/roster snapshot. A generated geographic dataset supplies polygons, home points and game-only neutral land. A separate board saves every action before displaying it; the existing daily board remains unchanged and reachable.

**Tech Stack:** React, TypeScript, Vitest, SVG. Build-time geometry may use pinned public-domain Natural Earth boundaries and small geometry libraries; no live map SDK or paid service.

**Spec:** docs/conquest-reference-audit-2026-09-07.md. This is its first geographic league slice, not the complete multi-sport/world request.

## Global Constraints

- No real sports facts without two-source verification; reuse existing documented roster/value assets without inventing missing players.
- No club logos, kits, player photos or rival product names in shipped code. No em or en dashes in new copy, comments or commit messages.
- Powers and rating changes describe this game's simulated squad, not real people's abilities or conduct.
- Do not modify Club Manager, existing daily save keys or scored completion behavior.
- New Attack is unlimited, with no ranked points. Saved games must survive reload without a reroll.
- Distinct seed, rulesVersion and dataVersion travel with the saved roster and map snapshot.
- Every new engine test must fail before implementation and have a proven negative control for its key invariant.
- No publication or host change. Type, build, focused tests, all generated-site fences and browser play must be read before completion claims.

## Task 1: Pure directional engine and save validation

**Files:** create src/lib/conquestAttack.ts and src/lib/conquestAttack.test.ts. No other production files in this task.

**Interfaces:** export Point = [number, number]; AttackPlayer { id, name, rating, originTeam }; AttackTeam { id, name, color, overall, homeRegion, players: AttackPlayer[] }; AttackRegion { id, name, rings: Point[][], anchor: Point, initialOwner: string | null }; AttackSetup { dataVersion, seed: number, teams: AttackTeam[], regions: AttackRegion[], bounds: {width,height} }; AttackState containing version:1, setup snapshot, rng:number, revision:number, owners, teams, phase ('team'|'direction'|'target'|'recap'|'finished'), selectedTeam, bearing, targetRegion, lastResult and champion. Export createAttack(setup), advanceAttack(state), parseAttackSave(value: unknown): AttackState | null, attackStrength(state,teamId), rayTarget(state,teamId,bearing). All transitions return new state without mutating inputs.

- [ ] Write tests using three fictional teams and adjacent rectangular land cells. Test a bearing due east hits the first non-owned polygon, crosses owned cells, and misses off-map directions. A screen label or centroid must not replace polygon intersection.
```ts
expect(rayTarget(state, 'A', 90)).toBe('middle');
expect(rayTarget(state, 'A', 270)).toBeNull();
```
- [ ] Implement ray/polygon intersection from the team's home anchor, or an owned region anchor if its old home is no longer owned. Bearings use north=0, east=90. Skip own polygons, choose the first land intersection. One-country V1 has no sea jumps. When spinning direction, use valid bearings from the integer 0..359 set, chosen with the seeded RNG. This avoids infinite off-map respins; help must state that the wheel skips directions leaving the map.
  - Rings use SVG evenodd semantics, including holes and disconnected parts. A ray must leave continuous owned land directly into another land cell. It cannot jump a sea gap, cross a hole or target a cell touched only at a vertex. Detached neutral islands may remain until the last surviving club receives them. Reject an enabled setup if a living owner has no legal direction; never substitute the nearest opponent.
- [ ] Test and implement the phase loop: team spin selects only living owners uniformly; direction spin commits bearing and target; resolve target commits expansion or match; recap advances to next team; last surviving team is champion and receives remaining neutral land. Each action advances revision exactly once. Use a small seeded PRNG whose state lives on the save, never Math.random or wall time in transitions.
- [ ] Test match outcomes with fixed seeds: both attacker win and defender win transfer ALL loser regions, remove loser from future wheels, and preserve total region count. Match probability uses rating gap plus 2-point home edge, base-10 logistic divisor 22, clamped 0.08..0.92. Produce internally consistent simulated soccer scorelines and a shootout marker when needed. No real results are claimed.
- [ ] Test and implement captures: winner takes loser's highest-rated original player (tie resolved using the seeded RNG) plus every player previously captured from other clubs, exactly once per identity. Remove moved players from loser roster. Captures change strength through the best available eleven: baseline club overall plus difference between current and original best-eleven average, bounded 45..99. Original roster rating baseline is retained in the setup snapshot.
- [ ] Test empty-land expansion boosts a seeded tie-selected highest-rated squad entry by 2, capped 99. Completing this one-country map adds 4 instead of the expansion's 2, once only. Result records the actual capture/upgrade and exact changed regions, so UI does not invent outcome text. Country/continent stacking outside this one-country map is deferred.
- [ ] Save parser rejects malformed version, duplicate IDs, unknown owners, missing home regions, non-finite/out-of-range numeric fields, invalid phase/target combinations and malformed rosters. Validate bounded array sizes and compare state roster identities against immutable setup; do not trust arbitrary JSON as a state. Preserve valid snapshots regardless of later source dataset changes.
- [ ] Test JSON round-trip resumes byte-identically through a complete run. Test every seeded run finishes within available expansions plus teams minus one matches; input state remains unchanged. Run the focused Vitest file; report exact red and green output and mutation controls in task report.

## Task 2: Source-backed geographic map and soccer adapter

**Files:** create scripts/genSoccerAttackMap.mjs, scripts/data/soccerAttackLocations.json, src/data/soccerAttackMap.json, src/data/soccerAttack.ts, src/lib/conquestAttackMap.test.ts. Geometry helpers may live in src/lib/conquestAttackGeometry.ts with focused tests. Update package.json/package-lock.json only for required build-time geometry dependencies.

**Interfaces:** consumes Task 1 AttackSetup/AttackRegion/AttackTeam. Export makeSoccerAttackSetup(seed: number): AttackSetup. Generated asset contains bounds, clipped polygon rings, anchor points and initial owner IDs.

- [ ] Read docs/conquest-premier-locations-2026-09-07.md. Import only verified ground locations. If an entry lacks two independent sources, resolve it before enabling the league. Preserve provenance URLs and pinned boundary version in scripts/data.
- [ ] Generate England's geographic land outline from Natural Earth map-subunit data. Voronoi cells around grounds plus deterministic neutral points are clipped to land. Neutral regions use game labels, not invented real region names. Preserve holes and disconnected polygons; every club home must lie on its own nonzero land cell. Sources and generator must be reproducible.
  - Pinned boundary: https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/ne_10m_admin_0_map_subunits.geojson, select SUBUNIT=England. Preflight confirmed HTTP 200, seven polygons and 1,896 vertices. All 20 researched ground anchors are inside this outline without moving any coordinates. Preserve the extracted boundary and provenance/hash as build inputs, so regeneration does not depend on an unpinned network response.
- [ ] Test that every enabled club has one home, all cells have finite nonzero land geometry, homes lie inside their cells, every polygon fits bounds, and the sum of region areas matches the land outline within measured floating-point tolerance. A negative control must move a home offshore or omit a cell and fail a real geometry check.
- [ ] Adapter reuses existing SOCCER_CLUBS colours/values and CM_ROSTERS documented player pool for the included clubs, without loading the Club Manager engine. Use explicit existing name aliases where required. No age/value fields need shipping in Attack, only names and simulated ratings. Fail the league data gate if any included club has no usable original roster. Preserve source dataset date in dataVersion.
- [ ] Run focused geometry/adapter tests and measure full seeded engine runs on the actual generated map. Reject unreachable living clubs or endless direction states. Do not silently fall back to nearest arbitrary opponent.
  - Check concave coast trapping after captures, not only opening positions. If a reproducible map state has no home-based legal ray, report that seed before changing the launch-origin contract. Measure transition runtime and serialized save size on this actual dataset as well.
  - Approved correction after seed 9 trapped HUL at revision 151: launch from the owned home when it has a legal direction. Otherwise choose the closest owned region anchor with a legal direction, measured from the original home anchor, with region ID lexical order breaking equal distances. Never choose an opponent by distance and never jump water. Commit `originRegion: string | null` in AttackState at team selection, preserve it through target/recap/finished and clear it for the next team phase. It is null only in team phase. Task 2 may update the engine and focused engine tests for this correction. Validate the committed origin against legal ownership and the deterministic choice before resolution, and against result-winner ownership after resolution. The UI must draw from that saved anchor and explain when the launch has moved. This is an explicit app interpretation for concave-map playability, not a claimed rule observed in the video.

## Task 3: Playable board and isolated durable progress

**Files:** create src/components/conquest/SoccerAttackBoard.tsx, src/components/conquest/AttackMap.tsx, src/components/conquest/SoccerAttackBoard.test.tsx; modify src/pages/SoccerConquest.tsx. Create src/lib/conquestAttackSave.ts and its focused test only if needed to isolate storage behavior.

**Interfaces:** consumes makeSoccerAttackSetup, createAttack, advanceAttack, parseAttackSave and AttackState.

- [ ] Add an Attack mode beside the existing Daily Season entry. An unfinished old daily still resumes automatically and stays selectable. New Attack uses its own key dukb-conquest-attack-soccer-v1. No old key or score callback is reused.
- [ ] Test board action persistence before reveal. A failed write keeps the prior visible state and exposes Retry, never a fresh seed. A second tab with a newer revision causes restore/conflict messaging rather than overwriting. Serialize writes with Web Locks where available; if safe persistence is unavailable, explicitly offer an unsaved session without claiming it will resume.
  - Do not silently overwrite a damaged or unsupported save. Offer a clearly labelled new run or an unsaved session. Resetting an unfinished valid run requires the player's explicit confirmation. Persist the committed originRegion as well as the result so an eliminated attacker's launch point remains correct in the recap.
- [ ] Render the big geographic map with white neutral land, blue sea, team colours, dark borders and legible text markers. Tap a region to inspect its owner and roster. Use a compact inspect panel/drawer, not a permanent full-roster stack. Provide zoom, reset view, and pan controls that work by touch and keyboard.
  - Keep the current action and result close to the map. On wide screens use the map beside a compact control panel; on phones avoid a full-roster stack and overlapping London labels. An accessible club list must offer the same inspection as tapping small map regions. The direction arrow must use the engine's actual launch point, not a shifted label position.
- [ ] Show distinct team wheel and direction wheel stages. Outcome is committed before animation; reduced-motion skips animation only. The next action is disabled during animation. Show the selected attacker, target and ray before resolving. Result panel derives scores, captures, upgrades and territory change exclusively from lastResult.
- [ ] Before a first run show short rules and one worked fictional example. Reopen from a question-mark button. Say this is the English-league first slice, not the requested complete World mode. Explain generated game borders, simulated ratings, legal-angle selection and no ranked points.
  - Show one help control for the selected mode, not both the old generic guide and a second Attack guide. Keep the initial rules concise enough that the map is visible before starting. Use the existing site fonts and controls around the reference's blue-water, white-land map.
- [ ] Test full play, reload at each phase, controls with keyboard, storage failure, competing tabs and finishing exactly once without ranked completion. Browser-check at 320, 390, 430 and 1440 with no horizontal overflow, 30px minimum tap targets and result visibility without page jumps.

## Task 4: Integration gates, metadata and review

**Files:** add scripts/simConquestAttack.mjs; update src/data/gameContent/soccer2.ts only to explain both actual modes; update docs/PROJECT-STATE.md, docs/WORKBOARD.md and this plan. Regenerate public/soccer-conquest/index.html, scripts/data/lastmod.json and public/sitemap.xml after verified build.

- [ ] Harness runs the real Vitest tests and prints actual per-test outcomes, not filler lines. Its control mode must prove a changed production transition causes the intended invariant to fail.
- [ ] Run node_modules/.bin/tsc --noEmit -p tsconfig.app.json, npm run build, focused engine/geometry/board checks, existing Conquest sims, then all 15 built-site fences after scoped prerender/sitemap/rebuild. Do not run those fences during a build.
- [ ] Independently review task diffs for spec compliance and quality, fix material findings and recheck only their affected tests. Then run a whole-change review and browser play of the actual built mode.
- [ ] Save verified code on the codex branch and hand off through a draft PR if the full combined suite is still pending. No merge to main or publish merely because a preview works. Update project state to distinguish playable English slice from the still-open La Liga/Europe/World and NFL/NBA powers work.

## Execution record

- [x] Task 1 complete (807ca0e3, 81 focused tests, review clean)
- [ ] Task 2 complete
- [ ] Task 3 complete
- [ ] Task 4 complete
