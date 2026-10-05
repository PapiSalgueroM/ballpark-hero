# Round 1030: preserve unknown counts during player imports

Status: implementation prepared, remote verification pending.

The fallback bake previously rejected an otherwise eligible player whenever goals
or assists were null. The live Footle mapper and Player type already preserve null
as an unknown count. The bake now accepts an explicit null for either field while
preserving real zero and positive whole counts. Undefined, omitted values, negative
counts, fractions, NaN, infinities, strings, booleans, arrays and objects still fail
closed. The existing pool smell fence calls the same pure invalidPlayerCounts
boundary as the bake parser, so both paths accept the same nullable data shape.

This fixes import behavior only. No bake was run and no factual player rows, table
data, frontend code or saved puzzles changed. In particular, Messi's stored zeroes
have not been verified or replaced. The older bake receipt calls the table counts
an autumn 2025 snapshot but gives no precise competition, season definition, cutoff
or independent sources for those statistics. Parser acceptance does not verify a
sporting fact.

## Verification contract

`node scripts/simFootleStatImport.mjs` runs offline against the actual exported
`rowToPlayer`, `renderFile` and `invalidPlayerCounts` functions. Fictional fixtures
check seven outcomes:

- Null in either field retains the whole eligible player and exact unknowns.
- Zero and positive whole counts retain their exact values.
- Invalid or omitted values in either field reject the row.
- The generated TypeScript module imports with null, zero and other fields intact.
- Ordinary populated rows and unrelated eligibility rejections remain unchanged.
- The shared pool boundary accepts valid counts and reports exactly the invalid fields.
- The actual pool smell loop imports the boundary and passes its findings to fail.

Eleven source controls each alter one unique anchor in a temporary module or the
in-memory pool fence source. Each must fail only its mapped outcomes while every
independent outcome passes. They cover dropping unknown players, inventing zeroes,
erasing real zeroes, accepting
invalid counts, changing null during serialization and bypassing the pool boundary.
Shared-validator mutations must fail both the whole-row parser and pool-boundary
cases. The pool binding check parses executable TypeScript syntax, so a comment
cannot satisfy it; its bypass control keeps the old call only in a comment and
must fail that binding case alone. The
harness blocks fetch, requires zero network attempts and checks that actual bake,
pool-fence and player-file bytes stay unchanged. It never calls the bake CLI,
loadApp or a database function.

No local runtime, build, installation or database verification was performed.
Remote results will be added after execution. The existing database-backed
simPlayersPool was not run as part of this offline change.

## Saved-puzzle boundary

This round changes no save format or restore behavior. A future factual data bake
must account for frozen Unlimited and five-puzzle pools. Daily saves preserve
rendered clue cells and identify a puzzle by its target name, so a same-day factual
refresh must not silently mix older saved clues with newer comparisons. That
rollout is separate from preserving explicit unknowns at import time.
