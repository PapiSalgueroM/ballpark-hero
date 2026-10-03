# NHL CPU offseason roster decisions

Affected URL: `/nhl-front-office`.

The actual-engine audit played 25 simulated seasons across five seeds.
Each produced an over-limit CPU opening. Seed 17 produced a 16-player
rival that then played four games with all 16. This is the game's
15-player simulation limit, not an official league roster rule.

The repair adds an optional human-team argument to `nhlOffseason` and
supplies that argument from the real Board. After existing aging, contract
departures, ledger rollover, replenishment and free-agent aging, CPU
clubs waive surplus reserves until they meet the limit. They protect the
actual selected contributors, including valid manual choices. Surplus
players are ordered by current rating, oldest first on equal ratings,
then name. The actual waiver helper applies fees and return blocks.
The free-agent pool is sorted and bounded to 30 only if a cut succeeds.

The human roster is never trimmed automatically. Omitted, invalid and
inherited owner keys keep the original two-argument result. Ordinary
owner-enabled seasons needing no cuts also keep the full original state
and RNG tape. No new random draws, opening ratings or sports facts are
introduced. The policy does not repair existing over-limit CPU saves
before their next owner-enabled offseason.

Eight engine outcomes passed. Ten effective copied controls execute all
eight outcomes each, with exact observed assertion rejection maps and
unaffected cases held: 88 engine case executions in total. The separate
actual Board outcome passed; removing its owner argument produces the
expected assertion failure. It measures one offseason and one save,
the unchanged human 17-player roster, the CPU 15-player roster, 287 exact
RNG draws, refreshed save bytes and an unrelated save. No console,
window or outside-transport errors were observed. Owned copies are gone.

The first engine oracle used a different order for equal-rating free
agents than the actual league iteration. Its failed result is retained;
the oracle now follows the actual team iteration with all literal cut IDs
and full-state assertions held. Initial Board-driver Windows import and
React scheduler setup failures are also retained uncredited. The driver
uses file URLs and initializes React before measuring game RNG.

Engine candidate SHA-256:
`3d60d8689d8bd6205268252f18a7bc636f3ba028335848dcf2af8b804a646311`.
Board owner-bind candidate SHA-256:
`7a46e8cc2088c7461b6b62372136b73d9d521d6113e70c6bf3a8a8ea002e8d01`.
Independent source review confirms two engine hunks and one caller hunk.

Evidence held locally:

- TEMP/dukb-nhl-cpu-roster-scout-2026-10-02/verified-report.json
- TEMP/dukb-nhl969-candidate-2026-10-02/verified-engine-summary.json
- TEMP/dukb-nhl969-candidate-2026-10-02/verified-board-summary.json

The final real app type check and build pass. Adopted CPU, roster-limit,
draft-capital, opening-rating, contributor and shared waiver checks pass.
The source guardian passes: all 596 harnesses parse and all scoped reads
normalize their source anchors. All 17 built, search and guide checks
pass. Final fingerprints hold across root and the clean gate. Full
merged-tree release acceptance remains separate. The shared
36-case save gate is open after four 120-second attempts. One unchanged
NFL corruption case passed a separate filtered diagnostic in 41 seconds,
with 35 skipped cases explicitly uncredited. This is not a full-suite pass.

This policy is a bounded simulation decision, not complete franchise AI,
prospect scouting, historical-data validation, a full native season or
publication. Claude owns the merged-tree release and publication.

The permanent engine family is `scripts/simNhlCpuRosters.mjs`, with eight
outcomes in `src/test/NhlCpuRosters.outcomes.ts`. The final runner's
source-holder shape maintenance passed eight normal cases and independent
exact-diff review. Its previous successful 88-case matrix is retained;
all cases, ten control maps, assertions and the 90-second bound are held.
The final adopted-source gate also passed its eight normal cases.

Final receipt: TEMP/dukb-nhl969-final-gate-2026-10-03/verified-summary.json.
Permanent proof: TEMP/dukb-nhl969-candidate-2026-10-02/permanent-engine-final-summary.json.
