# Type error backlog, found Round 54 (2026-08-12)

## The discovery that matters

The ship pipeline has been running `node_modules/.bin/tsc --noEmit` as its type
gate. That command checks **nothing**. The root `tsconfig.json` is a
solution-style config with `"files": []` and project references, so plain `tsc`
compiles an empty program and exits 0 every time.

**The real command is:**

```
node_modules/.bin/tsc --noEmit -p tsconfig.app.json
```

From Round 54 on, that is the gate. The COMMIT bats should use it too.

## What the real check found

186 pre-existing errors, none of which break the build (Vite/esbuild strips
types without checking them), but one of which was a genuine, shipped,
career-ending bug:

### FIXED in Round 54: World Cup win softlock

`src/pages/SoccerCareer.tsx` rendered four speech buttons inside
`WorldCupResultCard` that called an `onSpeech` prop the component never
received, and that branch had no Continue button.

Effect on the live site: win the World Cup, the single best moment in the game,
click any celebration button, get a `ReferenceError`. No path forward. The
career was stuck.

Fixed by giving the World Cup its own real speech (`applyWorldCupSpeech`, four
choices with actual effects) and threading a proper handler through.

## Remaining, ranked

### 1. Missing type-only imports, 38 errors, TS2304

`MlbMyCareerBoard.tsx`, `NbaMyCareerBoard.tsx`, `NhlMyCareerBoard.tsx` each
reference `<Sport>CareerState`, `<Sport>CareerPos`, `<Sport>CareerEvent`,
`<Sport>SeasonLine` without importing them.

Runtime impact: **none**. These names appear only in type positions, which
esbuild deletes. It is still worth fixing, because it means these three files
are effectively unchecked, so a real bug in them would hide exactly the way the
`onSpeech` bug hid.

Fix: add the missing `import type { ... } from "@/lib/<sport>Career"` lines.

### 2. Supabase row typing, 28 errors, TS2339 and TS2724

`mlbGrid`, `nbaGrid`, `playerSearch` and friends read properties off Supabase
query results that the generated types do not describe (usually because the
query uses a join or a view). Runtime impact: none observed, the data is really
there. Fix by regenerating types (`generate_typescript_types` via the Supabase
MCP) and adding explicit row interfaces where the generated types fall short.

### 3. Everything else, ~20 errors

`TS2769` overload mismatches, `TS2352` unsafe casts, `TS2589` deep instantiation,
`TS2300` duplicate identifiers. Low risk, worth a cleanup pass.

## Suggested plan

A single "type gate" round: fix category 1 (fast, and it unblocks real checking
of three career games), regenerate Supabase types for category 2, then switch
the bats over to `-p tsconfig.app.json` and keep it at zero from then on.
Until category 1 and 2 are done, the gate can be scoped:

```
node_modules/.bin/tsc --noEmit -p tsconfig.app.json 2>&1 | grep -v -E "MyCareerBoard|Grid.ts|playerSearch"
```
