# Task 3 report: playable Soccer Attack board

Date: 2026-09-07

## Result

Soccer Attack is now a complete, unlimited, local-only mode beside Daily Season. It uses the generated English map and real engine snapshots from Task 2. Every gameplay transition is committed before it is revealed, the Attack slot is isolated from the Daily Season slot, and no ranking or completion hook is called.

The shipped visible subtitle changes with the selected mode. The shared SEO and guide copy remains for Task 4, as assigned in the plan.

## Files

- `src/components/conquest/AttackMap.tsx`
- `src/components/conquest/SoccerAttackBoard.tsx`
- `src/components/conquest/SoccerAttackBoard.test.tsx`
- `src/lib/conquestAttackSave.ts`
- `src/lib/conquestAttackSave.test.ts`
- `src/pages/SoccerConquest.tsx`

No database, Club Manager, host, publishing, old Daily Season scoring, or old Daily Season save code was changed.

## Architecture

### Mode entry

`SoccerConquest.tsx` owns the `Daily Season` and `Attack` selection. An unfinished Daily Season keeps first resume priority. With no unfinished daily, a valid unfinished Attack opens automatically. Switching modes does not mutate either save.

Attack has its own concise rules button and mode-accurate subtitle. The intro explains that this slice covers England, that borders and outcomes are generated or simulated, and that the unlimited mode does not award ranked points.

### Durable save boundary

The dedicated key is exactly `dukb-conquest-attack-soccer-v1`. Its value is direct `AttackState` JSON so test and browser fixtures can seed the state without an adapter envelope.

`loadAttackSave` distinguishes empty, saved, damaged, and blocked storage. A structurally valid old `dataVersion` remains resumable because its complete map and roster are embedded in the snapshot.

`commitAttackSave` uses a Web Lock and compares the exact raw value read by the caller with the current raw value. It writes only on an exact match, then verifies the exact stored bytes. A missing lock API, blocked storage, corrupt record, or newer tab never causes an overwrite.

The board creates the next immutable engine snapshot once, saves it, and only then reveals it. A failed save retains the prior phase and the exact candidate for retry. A conflict restores the newer committed tab. Damaged records are kept byte for byte until the player explicitly replaces them or chooses unsaved play. Unsaved play is clearly labelled and never touches the damaged bytes.

### Board and map

The board covers team, direction, target, recap, and finished phases. Reduced-motion users skip the wheel motion. Controls sit beside the map on desktop and directly beneath it on smaller screens. `useRevealScroll` keeps phase transitions near the controls without a page jump.

The SVG map uses blue sea, white neutral land, solid club colors, and dark region borders. The saved `originRegion` is the only source for the attack ray origin, including a defender win where the attacker has been removed and a later launch from a claimed frontier.

Default labels are bold three-letter markers. Their deterministic placement searches progressively wider rows around each actual club anchor and keeps collision boxes apart. Selecting a club zooms to its region and reveals the full name. The select and every region remain available for accessible inspection. Keyboard zoom, pan, reset, pointer drag, and external pan buttons support dense areas without covering any land or label.

Inspection and view changes stay outside `AttackState`, so they do not change saved game bytes.

## Test-driven work

The first save test failed because `conquestAttackSave` did not exist. It then covered corrupt reads, exact compare-and-swap writes, missing storage and locks, and valid older embedded snapshots.

The first board test failed because the board did not exist. Later focused red cases caught the missing mode entry, inaccessible club-focus zoom, generic daily subtitle, full-name labels that became unreadable when scaled, and the BRE/BRI collision plus in-map pan overlay. Each was made green before the next change.

The final focused command was:

```text
npm test -- src/lib/conquestAttackSave.test.ts src/components/conquest/SoccerAttackBoard.test.tsx --reporter=verbose
```

Actual result:

```text
Test Files  2 passed (2)
Tests       14 passed (14)
Duration    39.37s
```

The cases include exact reload controls at every phase, a failed write and exact seed retry, two-tab conflict restore, a full 160-action seed 9 run through the UI, no ranked completion, defender-win and frontier ray origins, replacement confirmation, damaged-byte preservation, dense label separation, map inspection, keyboard navigation, and Daily Season resume priority.

## Static verification

```text
node_modules/.bin/tsc --noEmit -p tsconfig.app.json --pretty false
```

Exit 0 with no output.

```text
node scripts/simNoRivalNames.mjs
```

Actual result: 1,613 files scanned, 74 names checked, 0 findings.

```text
npm run build
```

Actual result: 2,839 modules transformed, 148 snapshots updated, build completed in 32.26s. Existing warnings remained for old Browserslist data, one ambiguous duration utility, and large chunks.

## Built browser verification

All browser scripts used `scripts/lib/playwrightLoader.mjs` and the isolated local server at `127.0.0.1:4178`.

```text
node .superpowers/sdd/2026-09-07-conquest-attack/browser-labels.mjs
```

Actual final label measurements:

```text
320: 10.27px effective text, 20 labels, 0 overlaps
390: 12.97px effective text, 20 labels, 0 overlaps
1440: 15.12px effective text, 20 labels, 0 overlaps
```

```text
node .superpowers/sdd/2026-09-07-conquest-attack/browser-acceptance.mjs
```

Actual result: 55 assertions passed. Widths 320, 390, 430, and 1440 had zero horizontal overflow and no undersized task buttons or selects. Keyboard zoom, pan and reset worked. Inspection preserved save bytes. Resolution persisted once without a scroll jump. Defender-win, frontier, and finished fixtures preserved their exact origin and exact reload state.

```text
node .superpowers/sdd/2026-09-07-conquest-attack/browser-durability.mjs
node .superpowers/sdd/2026-09-07-conquest-attack/browser-legacy-entry.mjs
```

Actual result: blocked writes retained the prior screen and retried the exact candidate, competing tabs produced one committed spin, unsaved play preserved damaged bytes, the complete seed 9 browser run matched the engine's final snapshot after 160 committed actions, finish reload stayed exact, no ranked completion was added, and unfinished Daily Season retained precedence while both save namespaces survived switches and reload.

## Concerns and follow-up

- Attack currently covers England only. The intro says this directly.
- Direct snapshots are intentionally larger than a small progress envelope because durable resume must retain the exact embedded map and roster across data-version changes.
- Page metadata and shared guide content still describe Daily Season. Task 4 owns that planned update. The visible in-page subtitle is already mode accurate.
- Build warnings listed above predate this task and are outside its scope.
