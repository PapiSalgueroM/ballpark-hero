# Four-sport career practice, round 992

Accepted on 2026-10-03. PR107 merged as fd81dcc3. Publication remains a
separate release step; this receipt confirms the implementation and tests.

## What players get

NFL, NBA, MLB and NHL careers each expose four playable drills from the season
screen. Instructions and a worked example appear before play and reopen from
the help button. A score below 50 gives no rating, 50 through 79 earns up to +1,
and 80 or more earns up to +2. Gains stop at the player's existing potential.
Banking consumes the season's session, including when already at that ceiling.
Leaving before banking keeps the session available. The real overall rating
carries into camp and the next simulated season.

The implementation binds the reviewed shared career Board and training modules.
It preserves the four existing save keys and keeps practice lazy loaded. Soccer
Career's training remains on its existing binding. Old saves need no migration.

## Evidence

Exact source head: `5f603c7f942f950dc3adf763be2c90629e8dc7e1`.

- [Career acceptance run37105852120](https://github.com/PapiSalgueroM/ballpark-hero/actions/runs/37105852120): app types, production build and every workflow stage passed.
- 32 actual Board cases cover old saves, rewards, duplicates, reloads, ceilings,
  cancellation, rules, pending choices, reset and the real next season.
- 12 effective source controls each fail four named assertions while four
  independent old-save restores pass. Import errors and deadlines do not count.
- Original 900 career replay and both controls pass without regenerating its
  recording. Shared 913 drill outcomes and six timing controls pass too.
- All 13 scoped career regression families and all 17 built/search/guide readers pass.
- Six native built-site paths pass: every sport at 390px touch, NBA at 320px with
  reduced motion, and NBA at 1440px keyboard. These include timed native drill
  input, banking, focus, reload, the session lock and exact saved-byte checks.
- [NHL run37105852157](https://github.com/PapiSalgueroM/ballpark-hero/actions/runs/37105852157) also passed on this source head.

Native execution completed 2026-10-03 at 07:26:52 UTC. The retained local evidence
is under `C:/Users/antho/AppData/Local/Temp/dukb-career992-ci-37105852120`.
Phone and desktop screenshots were reviewed. This is evidence for the scoped
practice integration, not a claim that every game or the live publication is
complete. The full merged release gate remains separate.
