# Related-game calculation memoization

Source measured: db1c520259e1c5c2a4e7f80fbf365e2b52d041c8. The two-line repair imports React useMemo and evaluates relatedGamesFor(path) with dependency [path]. No picker algorithm, registry, rendered links, guide data, JSON-LD, game state or query changed.

Stadium Tycoon's page owns useStadiumTycoon. Its animation-frame loop commits state when accumulated time reaches 0.2 seconds, and GameSeoContent is a direct child, so that page update previously reran the deterministic related-game calculation. The standalone Wonderkid Factory page keeps the academy hook inside its child AcademyPanel, so its own clock does not force this same parent-render pattern.

One bounded offline observation on this busy Windows host at 2026-09-16T02:27:19.249Z, using the actual 124-game registry:

| Route | Calls timed | Batch milliseconds | Milliseconds per call | Hash calls per calculation |
| --- | ---: | ---: | ---: | ---: |
| /stadium-tycoon | 1000 | 676.2926 | 0.6762926 | 980 |
| /wonderkid-factory | 1000 | 694.6129 | 0.6946129 | 986 |

Timing used the uninstrumented function after 30 warm-up calls. A separate single-call counter insertion measured stableHash calls and its six-link result exactly matched the unmodified function. The count probe changed only an asserted unique function entry anchor, outside the repository. This is a small avoidable repeated calculation; it does not establish the cause of the prolonged Pitch test, browser frame rate, or end-to-end latency improvement.

Source-scope proof confirmed exactly the two approved replacements. Diff check passed. Raw edited file SHA256: 3dc5d56a39576bde197652f6cf7176896c9231da0232e5543d61a074439b26ed. LF-normalized SHA256: 9b3c5a3658b7d035aa64dc95fdf53e8aeb87998ab0733fffd29896f94be3fd0f.

Root integrated the repair commit 27fd06b6 as a96ed002 and launched strict CI 35048332634. No local app type or build was run for this repair because that CI covers the final source. After the CPU lane was released, the unchanged node scripts/simRelatedGames.mjs completed with exit 0 and ALL RELATED GAMES CHECKS PASSED. All six sections ran: valid picks, inbound balance, whole-graph reachability, deterministic output, missing-route behavior and insertion stability. Worst insertion case was 13 of 124 pages changing; the new game received 8 inbound links. Raw output is in graph.log. No browser or production network call was made.
