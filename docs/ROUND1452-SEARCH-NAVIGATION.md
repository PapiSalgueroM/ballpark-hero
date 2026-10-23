# Round1452: search navigation resets


## Root Round1452 claim: search navigation resets, 2026-10-23 UTC

Root is continuing Anthony's shared-site improvement request from main 0ca8c1fc065f1ca282c9454683dca31911852638, after menu PR373 merged. Lovable preview metadata reports that exact commit and ready status. This does not establish production publication. I remains the sole publisher; protected game lanes stay assigned to their existing owners.

The next bounded shared-site fix is src/pages/Search.tsx. Source review found that its URL reader watches only search parameters and skips a value equal to its last write. A same-path Search Games navigation while the 250ms query write is pending can leave the draft and timer alive. This is a source hypothesis until the actual Router regression reproduces it remotely. Search ranking, registry, game picks, saved games and all other application paths remain held.

Plan: first push an isolated actual Search/Router test and ordinary-push baseline workflow on codex/search-navigation. Require the primary pending-query reset case to fail for its owned behavior assertion with clean type, import, process, transport and source/dependency holds. No production change is authored before that baseline is admitted. Then make the smallest navigation-identity and timer-cancellation correction, keeping the existing 250ms replace behavior and unrelated URL parameters. Verify all focused outcomes, an effective old-source control, real built phone/desktop Search and Menu navigation, standard build/readers/HomeFold and every unchanged page-size cap.

Private packet: C:/Users/antho/dukb-handoff/2026-10-23/search-navigation. Only native text, JSON, hash and archive work runs locally; all application parsing, imports, compilation, tests, build and browser execution stays in ordinary remote Actions. Purpose-built GitHub APIs preserve the primary and old Git/index/source state. No workflow dispatch, rerun, cancellation, provider or account change, dependency or cap increase, cleanup, or real sports data edit is authorized by this round. Small new leaves use CreateNew with a fresh64MiB floor. Old preservation gaps remain unwaived. No new Anthony approval or other-chat message is required or implied.
