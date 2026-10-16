# Club detail league fixtures, 2026-10-16

Base: `a758fcec4392c57c639aa54cda840810c8e44663`. Branch: `codex/manager-club-fixtures`.

Status: tests and remote workflow prepared. Product remains the base component. No runtime has run locally. A qualifying remote baseline is required before implementation.

The requested view is a plain Fixtures action inside the existing club header, opening a separate league fixture view with Back. The initial squad structure, values, player rows and outer navigation stay intact. No extra default `.bg-card` wrapper or sibling between club header and squad is permitted, because retained roster unit and browser consumers use those seams.

The reader will use the save's own `leagueClubs` for the managed league, or another league's saved `world[id].table` membership, following WorldTablesCard. It calls the existing `careerRoundPairs` with that membership and league id. Own progress counts league entries in `calendar.slice(0, week)`; world progress uses that league's `world[id].round`. A calendar index is not a league round. Odd-league byes are omitted. Clubs without saved league membership get an unavailable message, never an invented cup or Champions League schedule.

`pairResults[leagueId]['home|away']` is a single `[homeGoals, awayGoals]` tuple. Its reverse is a separate match. Only completed rounds can expose valid nonnegative integer scores. Missing legacy results are labelled `Result not recorded`; unplayed matches say `Upcoming`. Table totals cannot reconstruct a score. Repeated occurrences of one directed pairing cannot be assigned a single ledger tuple unambiguously and must remain unrecorded. No core, calendar, save schema, sport data, roster or RNG changes are in scope.

Ten actual component cases are declared: seven feature cases and three preservation cases. Feature cases also call the actual pure reader after the Fixtures action succeeds. A Vite glob keeps the absent new reader from causing a baseline import error. Baseline must have exactly the seven named Boolean missing-action faults and three passes, with zero pending cases, setup failures or transport attempts. Fixed requires all ten, whole original-component control reproducing the same seven faults, then restored ten plus all eleven existing roster unit outcomes. The save test uses the actual `loadCareer`, rather than claiming JSON parsing proves a loader.

The remote workflow retains source archive, installed package versions, real app types, JSON reports and complete logs, then fixed build and all fifteen rebuilt-site readers. Source and package bytes are held after controls. Production database, AI validators, app browser and local runtime are unused.

## Existing roster source fences

`scripts/simClubDetailCurrentRoster.mjs` reconstructs the complete component from `082fc277` and its four roster substitutions. Its core-ref environment option does not admit additive UI. `scripts/playClubDetailCurrentRoster.mjs` checks the same exact source and inverse. Implementation therefore needs a deliberate reversible fixtures join on those two source bindings while retaining every original roster span, eight named cases, three original-control failures and five preservation passes. The old workflow is frozen to its original packet, so it will not be rewritten or credited as this branch's workflow. The current branch runs the actual current roster test files directly, and any old source-fence join must be reviewed separately before fixed verification.
