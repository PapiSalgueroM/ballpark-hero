# Higher or Lower soccer pool, verification record

Round 535. Started 2026-09-12. Target file `src/data/higherLowerPlayers.ts`, read by
`src/hooks/useHigherLower.ts` (/higher-lower) and by `src/lib/faceOff.ts` (/face-off).

Status: IN PROGRESS. Source discovery done, row by row verification running.
Every row lands in the table at the bottom with a status of VERIFIED, CORRECTED,
REMOVED or MARKED, its old and new numbers, and the two URLs behind it.
