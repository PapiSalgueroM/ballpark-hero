# World XI ratings and club links

The October 16 visitor report asked to see player overalls after the season and inspect club chemistry. The page now shows the same card OVR returned by the existing `ratingsFor` function. Its average match rating remains out of 10. The club link button opens the actual existing club pairs, including zero links, and resets on replay. The text explains that these links do not change the season simulation.

The only library change exports the existing rating function. Its calculation and the two-argument season call are held. No player facts, simulation balance, database or save contracts change.

## Remote evidence

- Qualified baseline: `14d78a1a`, run `38878152760`, job `116898104704`. Three precise missing-display failures and one preserved real-season case, with app types passing.
- Fixed source: `259b0cba7776b47f0217622eea417ca065027f77`, tree `8a588ba93c963ca52b4e69117e4b444c1222a545`. Run `38879093470`, job `116901182681`, succeeded.
- Fixed page: four of four cases passed. Replacing both complete product files with the original version produced exactly the same three intended missing-display failures plus the preserved season case. Restoring them passed all seven new and prior respin cases.
- The actual production build, all 15 rebuilt-site readers and `simBuildYourXiFit` passed. Its 240-squad World XI digest remains `2f8cca6578202d4b1ccf3dbc45be0908cef51bf5be50b91a6ff2365722ea6c6c`.
- Source, package manifest and lockfile holds passed. No blocked external transport was credited as a success.
- Artifact `12037150701`, 35,061,578 bytes, SHA256 `ebc48f1b3af736ca7db02d857b151c20b09152b285fc20a22c4ddd3090bd40e1`, retained at `C:/Users/antho/dukb-handoff/2026-10-16/world-xi/artifact.zip`. Root reopened the current, original and restored JSON reports, source holds, all reader results and the season digest.

The first source run was blocked before tests by main's subsequently reverted wrong-database types. The first corrected-main baseline exposed a mock reset defect after the first case. The method-only repair reinstalls the actual simulator before every case; no product waiver or passing credit is taken from either failed run.

PR283 remains a draft for Claude I to integrate and publish. No live, browser screenshot or full-suite claim is made. The final documentation commit leaves the tested application, tests and workflow byte-identical.
