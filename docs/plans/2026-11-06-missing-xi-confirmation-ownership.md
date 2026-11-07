# Missing XI confirmation ownership

Status: the active entry passed actual CI and independent packet admission. Original game qualification is pending. No App fix has been authored.

Base: PR525 at a7af7ecd4a7c2ce2df95ce33cc3d03537dcdc836, tree fee34832cb8924251f217ed8f77cf225ec5fdc68. This round qualifies that preserved stack. Main integration, rebasing, merging and publishing remain held.

## Problem and bounded scope

A Give up confirmation belongs to the round where the player opened it. Missing XI currently keeps the same unkeyed GiveUpButton while switching between playing Daily and Unlimited rounds. The child owns its private confirming state, while its onGiveUp prop changes to the current Page closure.

The source prediction has two public paths:

1. Open Give up in a playing Daily, then enter Unlimited. The old Yes may remain available and reveal the new Unlimited round at 0.
2. Make a genuine Daily miss, enter Unlimited, open Give up there, then return to Daily. The old Yes may append a give action to the saved Daily, finish it at 0 and attempt one completion.

These are predictions until actual original captures show the resulting board, saved action bytes, reveal, score and completion boundary. Stale button text alone is insufficient evidence.

The relationship to master cards MX-05 and MX-09 is limited to finished-score integrity and exact-round ownership. This round does not complete those feature cards. PR510 lineup presentation and all curated facts, names, aliases, formations and hints stay held.

## Held source

| File | Git blob |
| --- | --- |
| src/pages/MissingXi.tsx | 8734de7d4ab5b6848538cc079804f10f038b39e1 |
| src/lib/missingXi.ts | 41d645db94fee5dd2fe22d19c353c9b8d2ca739a |
| src/components/game/GiveUpButton.tsx | 2462260a7b5f1d5d3b70915df2428d5d4397b0a0 |
| src/hooks/useDailyPuzzle.ts | b8a0d6ba268efe0e728c4ee96fbc6c60fcc73846 |
| src/hooks/useGameCompletion.ts | b104822551fd5d9b1c5d6ddb14f01c79e5a662b2 |
| src/components/game/PlayerAutocomplete.tsx | a0bd500b63306c75e0dea251cb6fb67ea2ed9452 |
| src/lib/playerSearch.ts | 0d19f2c23735eb30512dc7fc3a447eacef5e128f |
| src/components/game/RulesGate.tsx | ad59d4218dbd3790cad1ae7dac52fd27f459f15d |
| src/test/missingXiLineupView.test.tsx | a178e2a9d0078391d3b206c7f5578a4faa889889 |
| src/App.tsx | 8bfedf7aaa1d076e0f0c8e2216c7e46632cd8a33 |
| src/data/gameRegistry.ts | f560b40a74d1468ac72dfde4ee6fec6635a9a255 |
| public/missing-xi/index.html | e7fe5d02933d73db401c4badb130eb2bb76ed0c3 |

All 5779 base tracked paths, modes and blobs remain held. The original QA tree adds only src/test/missingXiConfirmationOwnership.test.tsx, this owned plan and .github/workflows/missing-xi-confirmation-20261106.yml. That yields 5782 tracked files and 4659 src/public/scripts paths, including only the new test. All 11 root configurations, locks, routes, catalog entries, saved pages and shared components remain held.

The new test identity is a637f262571576e6637c8a24f5c9f34352e2f2bb. Its bound source-derived contract is recorded below.

## Actual active preflight

| Evidence | Actual admitted value |
| --- | --- |
| Run | 42321774793, completed success |
| Workflow head | 8e18d6a134f39dbbb7888b4edfdcfd72d09a2efd |
| Workflow tree | 65359f540b7b8771cba2c7705c5893cb6ff95b20 |
| Workflow blob | 1330d89e3d4ad54114056af2639cda05fd46eee3 |
| Artifact | 13553467150 |
| ZIP | 1010823 bytes, SHA256 6d6f73ed8b43679c72f1282c7b8bf9b71a75ddd8c29ea9cc2879c1ebc685edac |
| Bodies | All 16 actual archive bodies admitted |
| Source join | 5780 QA index rows, all 5779 base rows held,4658 source paths and 11 root configs |
| Actual entry | Direct /missing-xi Route to MissingXi, actual React.lazy import, uncommented Soccer Missing XI catalog object |
| Saved page | 21382 bytes, SHA256 92e2821ae08f31061a2f6dcacb457486b3b6d3311dd79dcf95b7585658a0d41d |
| Inert DOM | Canonical https://douknowball.com/missing-xi,4803 readable characters, MISSING XI heading,no retirement/refresh/noindex |
| Holds | All 521 installed locked versions, physical source/index/locks before-final held,0 offline badcalls |
| Root independent admission | SHA256 5e69d7afa0f4349e496f59777b331765586a534deec85edbd3b16c47b04eb425 |
| Separate independent audit | SHA256 b583e28622d91f1564ef74271f81700b4e1dfe46a0838ee5e0d56a92561448cc |

This admits the active source and public saved entry. It supplies no game reproduction, fix, build, native or real-data truth credit.

## Original test contract

The planned order is currentRound, normalConfirmation, dailyToUnlimited, unlimitedToDaily. The first two are whole preservation vectors; the last two target the public cross-round harms. Final titles, precise business markers, frame/action/query/selector census and complete RAW schema must come from the completed test source.

```json
{
  "version": 1,
  "testBlob": "a637f262571576e6637c8a24f5c9f34352e2f2bb",
  "testBytes": 25392,
  "testSHA256": "d36dd86fc6d0b780a1befddba9f64aa921c7d244ab1eb18f501e804c1eac7ec4",
  "cases": [
    {
      "key": "currentRound",
      "title": "preserves current-round cancel same-mode progress and a genuine Daily finish across restore",
      "marker": "MX_CONFIRM_CURRENT_ROUND_PRESERVED",
      "status": "passed",
      "frames": 21,
      "labels": [
        "before-mount",
        "mounted-help",
        "ready",
        "daily-first-searched",
        "daily-first-picked",
        "daily-first-missed",
        "daily-duplicate-searched",
        "daily-duplicate-picked",
        "duplicate-rejected",
        "current-daily-armed",
        "same-mode-still-armed",
        "current-round-kept",
        "daily-second-searched",
        "daily-second-picked",
        "daily-second-won",
        "same-mode-finished",
        "finished-unmounted",
        "restored-mounted-help",
        "restored-ready",
        "before-teardown",
        "after-teardown"
      ],
      "actionJournalEntries": 15
    },
    {
      "key": "normalConfirmation",
      "title": "preserves ordinary same-round confirmations scoring and fresh Unlimited lineups",
      "marker": "MX_CONFIRM_NORMAL_CONFIRMATIONS_PRESERVED",
      "status": "passed",
      "frames": 18,
      "labels": [
        "before-mount",
        "mounted-help",
        "ready",
        "daily-ordinary-armed",
        "daily-ordinary-lost",
        "ordinary-unlimited-start",
        "unlimited-first-searched",
        "unlimited-first-picked",
        "unlimited-first-won",
        "ordinary-new-lineup",
        "unlimited-first-miss-searched",
        "unlimited-first-miss-picked",
        "unlimited-first-miss-missed",
        "unlimited-ordinary-armed",
        "unlimited-ordinary-lost",
        "ordinary-finished-daily-return",
        "before-teardown",
        "after-teardown"
      ],
      "actionJournalEntries": 14
    },
    {
      "key": "dailyToUnlimited",
      "title": "keeps an old Daily confirmation from ending the newly entered Unlimited round",
      "marker": "MX_CONFIRM_DAILY_TO_UNLIMITED",
      "status": "failed",
      "frames": 11,
      "labels": [
        "before-mount",
        "mounted-help",
        "ready",
        "daily-progress-searched",
        "daily-progress-picked",
        "daily-progress-missed",
        "old-daily-armed",
        "new-unlimited-current",
        "old-daily-confirmation-opportunity",
        "before-teardown",
        "after-teardown"
      ],
      "actionJournalEntries": 7
    },
    {
      "key": "unlimitedToDaily",
      "title": "keeps an old Unlimited confirmation from prematurely losing the unfinished Daily",
      "marker": "MX_CONFIRM_UNLIMITED_TO_DAILY",
      "status": "failed",
      "frames": 12,
      "labels": [
        "before-mount",
        "mounted-help",
        "ready",
        "daily-progress-searched",
        "daily-progress-picked",
        "daily-progress-missed",
        "unlimited-current",
        "old-unlimited-armed",
        "unfinished-daily-current",
        "old-unlimited-confirmation-opportunity",
        "before-teardown",
        "after-teardown"
      ],
      "actionJournalEntries": 8
    }
  ],
  "expectedOriginal": {
    "freshReportRows": 8,
    "passes": 6,
    "namedBusinessAssertionFailures": 2,
    "newRAWFrames": 62,
    "newActionJournalEntries": 44,
    "legacyCases": 4,
    "legacyRAW": false
  },
  "rawSchema": {
    "top": [
      "version",
      "scope",
      "limits",
      "cases"
    ],
    "case": [
      "key",
      "title",
      "frames",
      "closed"
    ],
    "frame": [
      "label",
      "at",
      "clock",
      "page",
      "daily",
      "storage",
      "sessionStorage",
      "storageOps",
      "globalRNG",
      "selectors",
      "transport",
      "unexpectedTransport",
      "pendingResponses",
      "completions",
      "renders",
      "results",
      "actions",
      "focus"
    ],
    "storageOp": [
      "at",
      "area",
      "method",
      "args",
      "result"
    ],
    "publicActionKinds": {
      "click": [
        "kind",
        "at",
        "name",
        "available",
        "disabled"
      ],
      "old-confirmation-opportunity": [
        "kind",
        "at",
        "name",
        "available",
        "disabled"
      ],
      "help-dismiss": [
        "kind",
        "at",
        "name",
        "available"
      ],
      "type": [
        "kind",
        "at",
        "name"
      ],
      "select-option": [
        "kind",
        "at",
        "name",
        "requestedName",
        "available",
        "html"
      ]
    }
  },
  "wholePreserves": {
    "keys": [
      "currentRound",
      "normalConfirmation"
    ],
    "frames": 39,
    "proof": "Future literal whole case objects, including every result.props.at/clock/storage/HTML ID and tape. No projection or normalization."
  },
  "perCaseClock": {
    "fixedDate": "2026-11-06T17:00:00.000Z",
    "fake": [
      "Date",
      "setTimeout",
      "clearTimeout",
      "setInterval",
      "clearInterval"
    ],
    "searchAdvanceMS": 201,
    "otherActionsAdvanceMS": 0,
    "scope": "unit-only, no native timing/trust/geometry claim"
  },
  "sourceOnlyOracleCorrection": "Before first original execution, one normalConfirmation within-case result assertion was changed to compare its complete actual result HTML. Two intervening searches advance unit time402ms, so collector-added result.props.at changes on return. Every RAW/result timestamp remains recorded, including later two entire original/fixed case joins. Prior cd1 source stays retained unexecuted."
}
```

The new regression keeps the actual Page, Missing XI selectors/data/generator/resolver/hints/scoring, GiveUpButton, daily persistence, shared completion hook, PlayerAutocomplete and local search merge. It may record actual selector/daily return values without changing them. Private Unlimited action state is not exported and must not be invented from a reconstructed log.

Search is bounded at the actual query-builder boundary with empty remote rows for the exact observed player_market_values search shapes; unknown transport and writes are rejected. Real local roster names come from held source. External auth, record-completion, badges/toasts and peripheral shell/SEO/share boundaries may be isolated as described in the test source. No fabricated lineup replaces the actual new-test selectors.

Unit Date/timer/RNG instrumentation is explicit. The complete per-case RNG tape begins with instrumentation before mount and includes calls after that point. Import-time and whole-process RNG are outside the measured window. Actual selector calls have their own retained return/draw observations. No unexplained call is attributed to the generator.

The new RAW keeps full ordered case objects, all actual HTML and IDs, public observations, literal saved strings and storage API tapes, actual selector/daily render history, input/focus, query/result/error tapes, completion boundary calls and result-render observations, clock and settled teardown observations. Every outcome is captured before named business assertions. An old Yes is attempted only when it is actually publicly present, with that availability/action captured in both original and future fixed executions.

## Fresh prior lineup fence

Unchanged a178 supplies four actual lineup-view cases in the same invocation. Its existing fictional selector mock remains confined to that isolated legacy file. It has no RAW environment or file writer.

Require all four fresh JSON assertion rows to pass with exact source held. Do not claim a prior whole-RAW comparison. The later literal original/fixed preservation proof uses the two complete new-test preservation case objects.

## Original admission gates

1. Check out one fresh original QA head on the exact PR525 source, with only the three owned leaves added. Check every base path/mode/blob, physical source receipts, index,11 configs and locks.
2. Perform a fresh npm ci and compare all 521 actual installed versions to the held package-lock.
3. Revalidate the direct TypeScript AST route/import/catalog and inert saved page. Retain the completed active-preflight metadata, exact ZIP and all 16 actual bodies.
4. Pass the proper App type command: node_modules/.bin/tsc --noEmit -p tsconfig.app.json.
5. Run exactly the new regression and unchanged prior lineup file with the JSON-only reporter, testTimeout=60000 and no-file-parallelism. Keep default hookTimeout=10000 and held Vitest config. Testing Library ByRoleOptions must use supported options without exact:true.
6. Preserve the real exit, report/log and every report error. Original admission is green only when the exact source-derived business cases fail with their named AssertionError, all preservation and prior cases pass, and all expected RAW captures/strong outcomes are complete. Setup/type/import/runtime/timeout errors or missing/partial captures fail qualification.
7. Recheck complete physical source/index/locks, all 521 versions and0 offline badcalls. Upload the actual packet on both success and failure. A failed qualification stays FAILED with its archive retained.

Expected business failures qualify the original evidence only. They do not turn the unchanged App into a passing implementation.

## Subsequent work remains gated

After actual original admission and independent archive review, consider only a Page-local confirmation ownership change. Shared confirmation/daily/completion behavior, data and PR510 lineup presentation stay held. No fix source is part of this original round.

A later fixed run must pass every actual new/prior case and preserve both complete new baseline objects literally, including strings, IDs and all tapes. Physical original/restored controls follow actual fixed admission. Normal build, all required readers, unchanged route caps, bounded native journeys, clean-source/build join and final docs follow their own source reviews and actual packet admissions.

No whitespace/ID/tape normalization can substitute for the whole-object preservation proof. No provider truth, backend write, native gesture/accessibility, async race, cross-tab, new-day, full test/sim-suite, integration or release claim is made here.

## Fixed-stage contract and qualified-original bindings

The preceding c706 original-first plan is retained verbatim as its historical source record. The original run below completed its declared business-red qualification and received independent actual admission. The fixed stage remains pending; the binding table records its authenticated original reference and independently reviewed Page-local source.

The fixed execution is separately pending. Its only App source change is the independently reviewed `key={playMode}` on the existing GiveUpButton at Page line 360. The key makes the existing child confirmation state belong to the active Daily or Unlimited view. Same-mode renders retain that child, while a mode change remounts its local confirmation state. No shared GiveUpButton, Daily logic, selector, completion hook, roster, lockfile or test source changes are part of this fix.

| Required input | Strict binding |
| --- | --- |
| Qualified original run | 42326812138 |
| Original source head | eecf9e47eb5cf867c9a7c8fc2c1cd5e5b0487ca3 |
| Original source tree | b1236874603e9af23efd67248395f2b6bd9a3122 |
| Original artifact | 13555371817 |
| Original ZIP bytes | 3141136 |
| Original ZIP SHA256 | f1afd8c60d1e292cd8717f299703024db814c4afedbe2be80768f6b2838312c7 |
| Original complete RAW bytes | 2106788 |
| Original complete RAW SHA256 | 3fa20b460e959934027510183edce2fbc858b9a999f7c75d5c474e299bb168e3 |
| Independent actual original audit | 50e8e20b8c692e2c047599766ff835495015950f0f6c1b3422af649b06a6ff96 |
| Reviewed fixed Page blob | 4692624a6ce6435b881ce4671df6169696a75858 |
| Independent fixed-source review | ada40929b95eae097eaa0ae48a7dd0f1dc855a7b8198838bcadb8eec4e69ae4b |

The entire original archive inventory is pinned in the fixed workflow and retained with all actual bodies. Its source must show original Page 8734, held test a637, original plan c706 and original workflow 756d, with actual 8 rows/6passes/2precise business reds and62 complete frames/44 journal entries. Original business failures remain original failures; they supply no fixed outcome.

The two original whole preservation case pins are authenticated and remain literal comparison inputs:

[{"key":"currentRound","frames":21,"bytes":755723,"sha256":"bdd5f880a735033f836a687e1923a69dc51eb15fa8560ee1a522cbbdab1ddd23","rawOffset":450,"entireCaseLiteral":true},{"key":"normalConfirmation","frames":18,"bytes":644606,"sha256":"de44a88f3f96a874d6576a50eb51ab2999e67946c471aa518b08b91f92f2135e","rawOffset":756174,"entireCaseLiteral":true}]

Use the same unchanged a637 test, complete 62-frame/44-journal capture schema and one JSON-only two-file invocation. Keep testTimeout=60000, no-file-parallelism, default hookTimeout=10000, proper App types and all 521 locked versions. Prior a178 still supplies only its four fresh report rows.

Both formerly harmful cross-mode paths must now retain a playing destination round. The old confirmation opportunity is recorded as publicly absent, never silently skipped without a journal entry. The newly entered Unlimited keeps the legitimate Daily miss and saved bytes with 0 completion. Returning to Daily keeps the exact one-miss log, playing status, saved bytes and 0 completion. Ordinary current-round Give up/Yes, Keep playing, same-mode confirmation, duplicate behavior, 70/100/0 scoring, genuine new lineups and finished Daily restore remain held.

A green fixed report requires 8 actual passes and 0 failures, with all 62 captures and44 journal entries complete. Every after-teardown frame must show pendingResponses=0 and fakeTimers=0 before later test cleanup. Do not convert a partial/setup/runtime failure into a planned business result.

Both entire original currentRound and normalConfirmation case objects (39 frames) must literally equal the fresh fixed objects, including every timestamp, result.props.at, HTML ID, storage/session string, selector/render/action/transport/RNG/completion tape and all metadata. Authenticate the complete original RAW first, locate each whole case body in its actual bytes and compare complete byte slices. No projected fields, removed IDs or whitespace/clock/tape normalization may replace that join. Entire harmful-case RAW equality is not expected because the actual destination outcome changes.

The fixed QA branch is codex/soccer-missing-xi-confirmation-fixed-qa-20261106. Relative to PR525, only the reviewed Page plus owned held test, updated plan and standalone QA workflow may differ. All 5778 other base paths/modes/blobs and all 11 configs remain held. Relative to qualified original, exclude only Page/plan/workflow and hold all 5779 other rows, including a637 and its legacy helpers. The tracked/scoped census remains 5782/4659. Physical source, index, locks, all 521 versions and 0 offline badcalls must hold before/final.

Controls, normal build/readers/unchanged caps, native journeys, clean-source/build join and final state/board docs remain later gates. No native, real-provider/backend-write, full-suite, integration, merge, publish or release credit follows from this template.


The actual original reference is run 42326812138 at eecf9e47eb5cf867c9a7c8fc2c1cd5e5b0487ca3/tree b1236874603e9af23efd67248395f2b6bd9a3122. Its root audit closes all 45 actual ZIP bodies, all 62 complete frames and storage operation replays, the 5,782-row source index, all 521 versions, proper types, index/locks/physical holds and offline badcalls=0. It admits exactly 8 rows, 6 passes and the 2 named original business AssertionErrors, with 44 action journal entries and 14 actual query legs. The original independent literal preservation audit is df0278a33d3e130191e147db0ffb5281dd49791bd0f133703ead250d5ae51bca. These original business failures are retained as evidence and are not successful fixed tests.
