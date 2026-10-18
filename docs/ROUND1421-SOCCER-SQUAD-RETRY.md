# Round 1421: Soccer Career squad Retry

Status: CLOSED, NONFIND. No app fix and no product PR.

## Question and result

The original SquadTile makes a new lazy component for the same emitted SquadSheet module URL when the player
presses Retry. A source comment about failed-import caching suggested a candidate, but did not prove a fault.
The diagnostic had to reach an actual failed cold download while offline, reconnect, and press the native Retry.
A pending timeout could not count as a product finding.

The original recovered directly at both tested widths. Keep the original app behavior.

| Journey | Native result | Sheet requests / responses | Actual document requests |
| --- | --- | --- | --- |
| offline-retry-390 | Failed while offline, Retry loaded the real sheet | 2 / 1 | 1 |
| healthy-cold-390 | Real sheet opened normally | 1 / 1 | 1 |
| offline-retry-1280 | Failed while offline, Retry loaded the real sheet | 2 / 1 | 1 |
| healthy-cold-1280 | Real sheet opened normally | 1 / 1 | 1 |

All four cases passed the real squadView eleven-player oracle, Back and opener focus. The full career,
stores and seven RNG draws stayed unchanged through these read-only actions. Both raw frame navigation events
per case are retained; both belong to the same document. The exact history operation was not inferred. No global reload
or spent reload flag was exercised. Six screenshots are retained.

## Frozen source and scope

Base main: `775564305e9da84dab59f2b9fe246d044a3cc8e9`.
Qualified diagnostic head: `2067ec6823eb2f89c073ae136aa4f08a416f4f3e`.

Only the diagnostic browser script and workflow were added before closing documentation:

- `scripts/qa/playSquadChunkRetry.mjs`: 31462 bytes, SHA256
  `40b4b11619b4322b723723b1c6fe1a2f5fc210c83556cfe3be0cb2b5b64e191e`.
- `.github/workflows/squad-chunk-retry.yml`: 20373 bytes, SHA256
  `7c41352832cbfcd4c0826f4d3fcd6d81b729b7d33a7449c197ee05fbbbc742fb`.

Original SquadTile remained the whole main blob
`e34a7cace4e17f41a94167ef74f9f2692d24edb0`, canonical SHA256
`d3cf17342debaa1410044642fd112e576a7cb636d8c19aefe7ef7891abde98ab`.
SquadSheet, freshBuild, saveFence, page, engine, model and real sports data stayed held.

The production route ran under Chromium with an explicitly fictional full career, progressed through the real
engine's youth, offer and repair path in the runner. The browser received the complete save once per context.
Node engine code was not injected into the browser. Real offline state and one exact emitted sheet request
failure were observed before reconnection. The healthy result required actual emitted sheet bytes and the
engine's real squad oracle, not a private handler call or an invented cache state.

Emitted sheet: `assets/SquadSheet-Csbv_NwM.js`, 22390 bytes, SHA256
`217bbd09ae3361ecbcf053f995c39381c96e8f0d7147294f5a3ef63c4998a4cf`.

## Remote qualification

[Qualified run 39128646293](https://github.com/PapiSalgueroM/ballpark-hero/actions/runs/39128646293),
job 117679025122, completed successfully on the qualified head.

- All four native browser journeys passed, zero observed faults, two direct recoveries and two healthy cold opens.
- Real app TypeScript gate and 60 literal existing related tests passed.
- Plain build completed before all 15 built-site readers and all 14 unchanged fatal weight caps.
- Observed weights: Soccer Career 834.1 / 835, Club Manager 618.4 / 619, NFL My Career 490.3 / 491.
- Ordinary runtime used the offline transport preload. No cap, source, predicate or transport waiver.

Artifact 12137660638: 99141982 bytes, SHA256
`bc2741b0596f8d80a9fce3119decf69ba7535f7f0497db73d67074ebe158d6b6`, 671 delivered payloads.
Canonical qualified source ZIP SHA256:
`26617b992d1fdaf2eb27f122e091d4659a68837e1a8c6b009a26cdc1c24ae3c5`.

Native saved-evidence admission passed 177049 checks, zero errors, verdict
`NONFIND-original-recovers`. Receipt `native-original-admission-attempt2.json`, SHA256
`194d5ce7b7ddaefb5e150b38333b1dfa829659902f4b08fab062f3cd00eb6b24`.
It binds all 671 delivered payloads, 4917 canonical source files, 787 dist files, physical response bodies,
gzip sizes, screenshots, all 60 test titles and CI dependency/tool/font inventories.

## Retained failures and method repairs

1. Original diagnostic head `56937d773782ac2279a0d77144b699f5e47be3a6`,
   run 39127958368, job 117676957591, failed the browser observer before the offline Retry step.
   It counted two `framenavigated` events as two document loads. The retained UUID and actual requests
   showed one document and an additional same-document frame event. Both ordinary healthy cases already passed.
   Artifact 12136623851 SHA256
   `cea3a2858c4211b57d640a4c50dd4edf74b9be3d02c4efba4a63ea41c008f63d`
   remains in `original-5693-failed/`. Its evidence review passed 41404 checks without converting the failed
   run into product evidence.
2. A three-span observer repair retained every frame event and added actual main-frame document request counts.
   Whole-source inverse and independent review held every other browser span, workflow and app source.
   Only the corrected original was rerun. A product edit never followed the failed observer.
3. The first native admission failed at check 103983 because a local PowerShell variable collided with
   readonly HOME. The failed receipt is retained with SHA256
   `93239c05a137daa3596e4ad08c8d08746f16216cac6ff4479a1dfbf46e12f5d2`.
   A distinct auditor changed only five variable-name tokens, with whole-source inverse and peer review.
   The second admission above passed against the same qualified artifact. No app, packet or predicate changed.

Outside evidence root:
`C:/Users/antho/dukb-handoff/2026-10-18/soccer-squad-retry-1421/`.
The final canonical archive and document-only closure will bind the final commit to the tested head without
rerunning project runtime. Closing changes are exactly this file, PROJECT-STATE and WORKBOARD.

## Limits and handoff

This finite result refutes this specific initial offline, unspent-policy candidate in the tested Chromium
version and viewports. It does not qualify Safari, a physical device, every import cache failure, the global
reload branch, full-career play, release integration or the live site. Installed package inventories are
runner receipts; package executable bodies were not physically delivered in the artifact.

No unit control or product patch was invented for a nonfinding. No PR was opened to merge diagnostic-only files.
All prior 58 report heads stay immutable. Round 1420 remains ready in draft
[PR 335](https://github.com/PapiSalgueroM/ballpark-hero/pull/335), final
`ac322751c9fcde1e858a80010100a0f7e7e7e455`.
Claude I keeps protected Soccer Career and Manager/tournament work, actual release join, main and publish.
Nothing in this round is claimed published.
