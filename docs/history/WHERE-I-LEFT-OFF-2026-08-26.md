# Where I left off, 2026-08-26 (session of 08-25 into 08-26 UTC)

Short version for whoever picks this up next (Anthony, or the next Claude session reading
`CLAUDE.md` and `docs/PROJECT-STATE.md`).

## Everything is pushed and live

- `origin/main` is at **Round 294** (`3d0eb21f`). Rounds 258 through 293 went up through
  `SHIP154.bat` (clicked from this session over the desktop bridge, 36 rounds, every one
  "pushed" in `ship_log154.txt`), then Round 294 through `FIX294.bat`.
- Why `FIX294.bat` exists: a claude.ai/code cloud session pushed a docs-only commit
  (`e8d3df68`, "the never push rule was only ever true of Cowork sessions") on top of 293
  while `RUN294.bat` was running, so the first 294 push was refused. `FIX294.bat` moved the
  branch to origin, laid the round down again from `ROUND294B_FILES.zip` (same code, the two
  docs files merged with what landed) and pushed. `ROUND294_FILES.zip`, `RUN294.bat`,
  `SHIP155.bat` and `ROUND294_SOURCES_SAFETY.zip` in the folder are superseded; nothing
  needs clicking.
- Lovable synced (`latest_commit_sha` = `3d0eb21f`) and `deploy_project` was called at
  02:03 UTC. Checked in a real browser afterwards: douknowball.com/whats-new shows the Round
  294 entry at the top, the ticker carries real MLB and soccer scores, /transfer-path renders.
- `node scripts/indexnowSubmit.mjs` could NOT run from this sandbox (no egress to
  douknowball.com, the script refuses when it cannot see the key file). Run it from a session
  that can reach the site. `scripts/auditLive.mjs` was blocked the same way.
- Anthony still needs to **request the AdSense review** and **restart the Search Console
  validation**, now that 258 through 294 are live.

## Round 294 (Transfer Path hints), what it did

- All 902 `transfer_path_puzzles` rows carry a derived `min_steps` and `hint` under the
  game's real rule (same club, same season). Applied live on 2026-08-26 through the console,
  verified by md5 against the generated file and by a recursive search inside Postgres
  (0 unreachable, 0 minimum mismatches). The "Alisson" career row lost its two false Roma
  seasons (2014-15, 2015-16).
- In the repo: `scripts/lib/transferPathHints.mjs`, `scripts/genTransferPathHints.mjs`,
  `scripts/simTransferPathHints.mjs` (controls `TPH_CONTROL=stale|club|min|direct`),
  `scripts/data/transferPathPull/`, the migration
  `supabase/migrations/20260826_transfer_path_hints_temporal.sql` (already applied),
  `src/data/transferPathPuzzles.ts` regenerated, board copy fixed, What's New entry, docs,
  a CLAUDE.md database rule (derived puzzle metadata is generated, never typed).
- `question_reports`: the Transfer Path report (`9eff46d4`) and the soccer grid sg-678
  report (`b6a53685`) are marked resolved. Still to mark resolved now that 292 is live: the
  two Ballon d'Or rows `b7505600-7ae5-4b91-b747-bbc1dadaacbf` and
  `ecdc20de-32a9-48c7-8c47-f4444a9f176d`.

## The pipeline changed under this session, read the docs before building

The other cloud session's commit says Anthony's instruction is that the build loop moves to
claude.ai/code cloud sessions (they push directly, no zips, no bats) and his computer stops
being part of the pipeline; a 3-hourly scheduled task fires those sessions. Whatever session
picks this up: read the head of `docs/PROJECT-STATE.md` and the "Which pipeline are you on"
section of `docs/SHIP-PIPELINE.md` first, and take the next round number from `git log`,
not from memory. The bat pipeline is documented as the Cowork path only.

## Waiting on Anthony

- **AdSense consent shape.** Asked 2026-08-25, no answer yet: "keep" (ads only after
  Accept, for everyone) or "outside Europe" (ads load by default outside the EEA and UK,
  still gated behind Accept in Europe and the UK; banner and privacy wording updated). If
  "outside Europe": `consentRequiredHere()` in `src/lib/consentedScripts.ts` mirrored in the
  index.html inline gate, and `simAdsense` sections 2 and 5b rewritten as a behavioural test
  of the gate with an `ADS_CONTROL=leak` control.
- Unchanged older decisions: competitor name research docs (delete or gitignore), Apple sign
  in ($99), the 27 placeholder ad slot ids, the rules dialog interstitial, Supabase host on
  the Claude network allowlist (optional; it would let the DB-backed fences run in a sandbox).

## Findings not yet acted on

- `playGames` ran 81 of the routes before this session stopped it to free the build:
  everything green except three STALL lines (`/college-grid`, `/dart-draft`,
  `/football-grid`), all games that need Supabase, which the sandbox cannot reach, so they
  are the environment, not the games. `simNoInventedQuotes` did not run. Run the full board
  before the next big ship from a session with egress; the node board was fully green on
  2026-08-25.
- `career_players` has two rows for one man, "Alisson" and "Alisson Becker". Left alone
  because Career Ladder and the Career game index the pool for their daily pick; merging
  needs a round that pins the daily picks across the change.
- Open `question_reports`, too vague to act on: three `missing-xi` "Wrong answer" notes,
  one `nba-connect-4` "anything you pick is wrong" (classic-3, 2026-07-21), one
  `higher-lower-transfers` "Outdated info", one `world-xi` "Wrong answer".
- Parked content: AFL grand final runner-ups and the Coleman Medal (no second source).

## Ideas for the next round, in the order I would take them

1. Whatever Anthony answers on AdSense.
2. A pass over other hand-typed puzzle metadata for the disease Round 294 found: any table
   column that encodes a rule the code has since changed. Start with the grid validators'
   `ai_validation_cache` (a wrong cached verdict is permanent) and the connect-4 boards.
3. The Alisson duplicate, with the daily-pick shift handled.
