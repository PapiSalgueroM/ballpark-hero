# Fantasy Draft player-pool read recovery

This is an original-first plan on PR526, committed base beaa2d99f74219fbbccf112f461862278cf5ead0 and tree 5d19ebc7d16c92a8a338f1cfcdeb94f2f65a6608. The original Page remains d1b38c9aaae0ead2c68d746866e0ccb3b47adccd. No App fix, original run, fixed run, negative control, native journey, build or release is qualified by this plan.

## Admitted entry, source and scope

The completed active preflight is Actions42337220745 at e541e517163e2de8ef726ce9cf33b3fe0589f131, tree d7ba6500c98a8a2d939880af385f97b94cdd9c79. Artifact13559473685 is 1,011,205 ZIP bytes, SHA256 af926a6a89cbb55ed6624fecdc5e5fb48e157c84839740463a9eb3dc889f2ecd. All16 artifact bodies were independently admitted; independent audit SHA256 is 281fac91d5767af360e2dc5a5e45cec6156cd1a453a46c19384eef52f1b793eb.

That evidence establishes the actual direct /fantasy-draft JSX route, React lazy Page import and Soccer catalog object, plus the inert saved document. The saved public/fantasy-draft/index.html is21,557 bytes, SHA256 52568e65fbaa99b3aab1c88c2870c262b087c3a5fb3d497ca2a0f01b1f9f61d4, with canonical https://douknowball.com/fantasy-draft, readable FANTASY DRAFT SHOWDOWN content, no retired marker or redirect meta and no noindex. It establishes source/public entry availability. It does not establish game runtime, native browser reachability, backend data truth or recovery behavior.

Original source pins:
- Page src/pages/FantasyDraft.tsx: d1b38c9aaae0ead2c68d746866e0ccb3b47adccd.
- PlayerPool: 08a84d008390d68293482de3e818fada9120c5b3.
- DraftRoster: 61d938308edcded2adffc810c01b7d9c12fd3a35.
- fantasyCriteria: f6f7d27ee0af80e4386e650a9d7128cd89702f90.
- searchDiscard: 2ae5bc4d6b728e9d5e0f102ece352e59708a0b16.
- completions: 61daf9b6c528f884551cd1d42f71357681c8728a.
- Unchanged criteria-start regression: src/test/fantasyDraftCriteriaStart.test.tsx, blob4e9d54803677696454ef0cbbf155182192e03769.
- Formation regression: src/test/fantasyDraftFormation.test.tsx, blob4db9e392fdc40f01e2c668342e45eafcf37b79f6. Its source is held; it is outside this two-file original invocation.

The bounded candidate is ordinary resolved player-pool read failure in a started draft. The original mount-time started effect draws the seat, issues fantasy_draft_players.select(...).order('name'), uses only data and clears loading. An ordinary {data:null,error:...} response therefore returns to a started empty pool without a public retry. Neither this source observation nor an error label alone is the final harm oracle. The original regression must show that public recovery cannot produce the exact legal roster and subsequent turn under the same started round.

This slice holds criteria, seat, snake-turn rules, eligibility, rating, roster position limits, transport query, real data and all shared presentation. Rejection, indefinitely pending transport, cancellation/unmount races, stale callbacks, mid-draft refresh policy, complete22-pick verdict/season behavior and backend reliability remain outside the proposed ordinary resolved-error scope unless later evidence explicitly adds them.

## Original qualification is pending

The new source path is src/test/fantasyDraftPoolRecovery.test.tsx, binding ab43be6a72f000cbf50c0bb557408e1f7108201c. Its source, exact titles, markers, schema, fixture bodies, public action journal, frame labels and per-case census must be frozen, independently reviewed and inserted before the original workflow can launch.

The exact reviewed regression is ab43be6a72f000cbf50c0bb557408e1f7108201c, 27564 UTF-8 bytes, SHA256 0ec1daae5d526040455191b2e06d1442d390ef892c6cb8498eb67c443381cd68. The source manifest is SHA256 b1c74150a1eff5322b51559ec465749ab05f4153f7e445d510b9405a643e6150. Independent refreshed source review dd4873803421c0b3c5e9fc23f0ed434c7bcb5ec7244720e5b0308a581f5cacab passed. Source-only3f0 was superseded by one ES2020 indexed-access correction before any run. The following is the exact authored forecast and capture contract. It is not actual execution evidence.

```json
{
  "source": {
    "file": "C:/Users/antho/dukb-handoff/2026-11-05/fantasy-draft-pool-error/original-test-refreshed.tsx",
    "bytes": 27564,
    "blob": "ab43be6a72f000cbf50c0bb557408e1f7108201c",
    "sha256": "0ec1daae5d526040455191b2e06d1442d390ef892c6cb8498eb67c443381cd68"
  },
  "cases": [
    {
      "key": "normalUser",
      "title": "preserves ordinary user-first pool admission legal picks and the snake AI turns",
      "seat": "user",
      "randomValue": 0.1,
      "firstPoolResponse": "success",
      "originalExpectedStatus": "passed",
      "marker": null,
      "labels": [
        "before-mount",
        "criterion-pending",
        "criterion-ready",
        "first-pool-pending",
        "first-pool-success",
        "over-age-refused",
        "first-human-picked",
        "next-ai-before-deadline",
        "next-ai-picked",
        "snake-ai-before-deadline",
        "legal-progress-complete",
        "before-teardown",
        "after-teardown"
      ],
      "frames": 13,
      "actions": [
        {
          "name": "mount",
          "kind": "harness-mount"
        },
        {
          "name": "settle-criterion",
          "kind": "controlled-response"
        },
        {
          "name": "start-draft",
          "kind": "public-button"
        },
        {
          "name": "settle-first-pool",
          "kind": "controlled-response"
        },
        {
          "name": "over-age-pick-opportunity",
          "kind": "public-player-pick"
        },
        {
          "name": "first-human-pick",
          "kind": "public-player-pick"
        },
        {
          "name": "next-ai-before-deadline",
          "kind": "unit-clock"
        },
        {
          "name": "next-ai-deadline",
          "kind": "unit-clock"
        },
        {
          "name": "snake-ai-before-deadline",
          "kind": "unit-clock"
        },
        {
          "name": "snake-ai-deadline",
          "kind": "unit-clock"
        },
        {
          "name": "cleanup",
          "kind": "harness-cleanup"
        }
      ],
      "actionJournalEntries": 11,
      "originalFinalProgress": {
        "turn": "user",
        "round": 2,
        "pick": 4,
        "total": 22,
        "human": [
          "Fixture FWD 00"
        ],
        "ai": [
          "Fixture FWD 01",
          "Fixture FWD 02"
        ]
      },
      "requiredSuccessfulFinalProgress": {
        "turn": "user",
        "round": 2,
        "pick": 4,
        "total": 22,
        "human": [
          "Fixture FWD 00"
        ],
        "ai": [
          "Fixture FWD 01",
          "Fixture FWD 02"
        ]
      },
      "finalUnitClockMilliseconds": 4000
    },
    {
      "key": "normalAi",
      "title": "preserves ordinary AI-first pool admission legal picks and the snake AI turns",
      "seat": "ai",
      "randomValue": 0.9,
      "firstPoolResponse": "success",
      "originalExpectedStatus": "passed",
      "marker": null,
      "labels": [
        "before-mount",
        "criterion-pending",
        "criterion-ready",
        "first-pool-pending",
        "first-pool-success",
        "initial-ai-before-deadline",
        "initial-ai-picked",
        "over-age-refused",
        "first-human-picked",
        "second-human-picked",
        "next-ai-before-deadline",
        "next-ai-picked",
        "snake-ai-before-deadline",
        "legal-progress-complete",
        "before-teardown",
        "after-teardown"
      ],
      "frames": 16,
      "actions": [
        {
          "name": "mount",
          "kind": "harness-mount"
        },
        {
          "name": "settle-criterion",
          "kind": "controlled-response"
        },
        {
          "name": "start-draft",
          "kind": "public-button"
        },
        {
          "name": "settle-first-pool",
          "kind": "controlled-response"
        },
        {
          "name": "initial-ai-before-deadline",
          "kind": "unit-clock"
        },
        {
          "name": "initial-ai-deadline",
          "kind": "unit-clock"
        },
        {
          "name": "over-age-pick-opportunity",
          "kind": "public-player-pick"
        },
        {
          "name": "first-human-pick",
          "kind": "public-player-pick"
        },
        {
          "name": "second-human-pick",
          "kind": "public-player-pick"
        },
        {
          "name": "next-ai-before-deadline",
          "kind": "unit-clock"
        },
        {
          "name": "next-ai-deadline",
          "kind": "unit-clock"
        },
        {
          "name": "snake-ai-before-deadline",
          "kind": "unit-clock"
        },
        {
          "name": "snake-ai-deadline",
          "kind": "unit-clock"
        },
        {
          "name": "cleanup",
          "kind": "harness-cleanup"
        }
      ],
      "actionJournalEntries": 14,
      "originalFinalProgress": {
        "turn": "user",
        "round": 3,
        "pick": 6,
        "total": 22,
        "human": [
          "Fixture FWD 00",
          "Fixture FWD 01"
        ],
        "ai": [
          "Fixture FWD 05",
          "Fixture MID 00",
          "Fixture MID 01"
        ]
      },
      "requiredSuccessfulFinalProgress": {
        "turn": "user",
        "round": 3,
        "pick": 6,
        "total": 22,
        "human": [
          "Fixture FWD 00",
          "Fixture FWD 01"
        ],
        "ai": [
          "Fixture FWD 05",
          "Fixture MID 00",
          "Fixture MID 01"
        ]
      },
      "finalUnitClockMilliseconds": 6000
    },
    {
      "key": "errorUser",
      "title": "recovers the user-first round through a public retry after a resolved pool error",
      "seat": "user",
      "randomValue": 0.1,
      "firstPoolResponse": "resolved-error",
      "originalExpectedStatus": "failed",
      "marker": "FD_POOL_USER_ERROR",
      "labels": [
        "before-mount",
        "criterion-pending",
        "criterion-ready",
        "first-pool-pending",
        "first-pool-error",
        "error-after-service-wait",
        "retry-pending",
        "duplicate-retry-pending",
        "retry-pool-settled",
        "over-age-refused",
        "first-human-picked",
        "next-ai-before-deadline",
        "next-ai-picked",
        "snake-ai-before-deadline",
        "legal-progress-complete",
        "before-teardown",
        "after-teardown"
      ],
      "frames": 17,
      "actions": [
        {
          "name": "mount",
          "kind": "harness-mount"
        },
        {
          "name": "settle-criterion",
          "kind": "controlled-response"
        },
        {
          "name": "start-draft",
          "kind": "public-button"
        },
        {
          "name": "settle-first-pool",
          "kind": "controlled-response"
        },
        {
          "name": "service-recovered-without-user-retry",
          "kind": "unit-clock"
        },
        {
          "name": "retry-player-pool",
          "kind": "public-button"
        },
        {
          "name": "duplicate-retry-opportunity",
          "kind": "public-button"
        },
        {
          "name": "settle-retry-pool",
          "kind": "controlled-response"
        },
        {
          "name": "over-age-pick-opportunity",
          "kind": "public-player-pick"
        },
        {
          "name": "first-human-pick",
          "kind": "public-player-pick"
        },
        {
          "name": "next-ai-before-deadline",
          "kind": "unit-clock"
        },
        {
          "name": "next-ai-deadline",
          "kind": "unit-clock"
        },
        {
          "name": "snake-ai-before-deadline",
          "kind": "unit-clock"
        },
        {
          "name": "snake-ai-deadline",
          "kind": "unit-clock"
        },
        {
          "name": "cleanup",
          "kind": "harness-cleanup"
        }
      ],
      "actionJournalEntries": 15,
      "originalFinalProgress": {
        "turn": "user",
        "round": 1,
        "pick": 1,
        "total": 22,
        "human": [],
        "ai": []
      },
      "requiredSuccessfulFinalProgress": {
        "turn": "user",
        "round": 2,
        "pick": 4,
        "total": 22,
        "human": [
          "Fixture FWD 00"
        ],
        "ai": [
          "Fixture FWD 01",
          "Fixture FWD 02"
        ]
      },
      "finalUnitClockMilliseconds": 8000
    },
    {
      "key": "errorAi",
      "title": "recovers the AI-first round through a public retry after a resolved pool error",
      "seat": "ai",
      "randomValue": 0.9,
      "firstPoolResponse": "resolved-error",
      "originalExpectedStatus": "failed",
      "marker": "FD_POOL_AI_ERROR",
      "labels": [
        "before-mount",
        "criterion-pending",
        "criterion-ready",
        "first-pool-pending",
        "first-pool-error",
        "error-after-service-wait",
        "retry-pending",
        "duplicate-retry-pending",
        "retry-pool-settled",
        "initial-ai-before-deadline",
        "initial-ai-picked",
        "over-age-refused",
        "first-human-picked",
        "second-human-picked",
        "next-ai-before-deadline",
        "next-ai-picked",
        "snake-ai-before-deadline",
        "legal-progress-complete",
        "before-teardown",
        "after-teardown"
      ],
      "frames": 20,
      "actions": [
        {
          "name": "mount",
          "kind": "harness-mount"
        },
        {
          "name": "settle-criterion",
          "kind": "controlled-response"
        },
        {
          "name": "start-draft",
          "kind": "public-button"
        },
        {
          "name": "settle-first-pool",
          "kind": "controlled-response"
        },
        {
          "name": "service-recovered-without-user-retry",
          "kind": "unit-clock"
        },
        {
          "name": "retry-player-pool",
          "kind": "public-button"
        },
        {
          "name": "duplicate-retry-opportunity",
          "kind": "public-button"
        },
        {
          "name": "settle-retry-pool",
          "kind": "controlled-response"
        },
        {
          "name": "initial-ai-before-deadline",
          "kind": "unit-clock"
        },
        {
          "name": "initial-ai-deadline",
          "kind": "unit-clock"
        },
        {
          "name": "over-age-pick-opportunity",
          "kind": "public-player-pick"
        },
        {
          "name": "first-human-pick",
          "kind": "public-player-pick"
        },
        {
          "name": "second-human-pick",
          "kind": "public-player-pick"
        },
        {
          "name": "next-ai-before-deadline",
          "kind": "unit-clock"
        },
        {
          "name": "next-ai-deadline",
          "kind": "unit-clock"
        },
        {
          "name": "snake-ai-before-deadline",
          "kind": "unit-clock"
        },
        {
          "name": "snake-ai-deadline",
          "kind": "unit-clock"
        },
        {
          "name": "cleanup",
          "kind": "harness-cleanup"
        }
      ],
      "actionJournalEntries": 18,
      "originalFinalProgress": {
        "turn": "ai",
        "round": 1,
        "pick": 1,
        "total": 22,
        "human": [],
        "ai": []
      },
      "requiredSuccessfulFinalProgress": {
        "turn": "user",
        "round": 3,
        "pick": 6,
        "total": 22,
        "human": [
          "Fixture FWD 00",
          "Fixture FWD 01"
        ],
        "ai": [
          "Fixture FWD 05",
          "Fixture MID 00",
          "Fixture MID 01"
        ]
      },
      "finalUnitClockMilliseconds": 10000
    }
  ],
  "census": {
    "newCases": 4,
    "predictedOriginalPasses": 2,
    "predictedOriginalBusinessFailures": 2,
    "newFrames": 66,
    "actionJournalEntries": 58,
    "wholePreserveKeys": [
      "normalUser",
      "normalAi"
    ],
    "wholePreserveFrames": 29,
    "priorCases": 4,
    "totalFreshReportRows": 8,
    "predictedTotalPasses": 6,
    "predictedTotalBusinessFailures": 2,
    "originalCriteriaRequests": 4,
    "originalPlayerRequests": 4,
    "originalExactQueryLegs": 16,
    "fixedForecastCriteriaRequests": 4,
    "fixedForecastPlayerRequests": 6,
    "fixedForecastExactQueryLegs": 22,
    "scope": "All counts are forecasts derived from source. Actual original qualification must independently reconcile every complete report row, frame and action."
  },
  "raw": {
    "env": "FD_POOL_RECOVERY_RAW",
    "encoding": "UTF8 without BOM, compact JSON and one LF",
    "output": "Absolute caller-provided fresh path. afterAll writes with flag wx.",
    "topLevel": [
      "version",
      "scope",
      "criteria",
      "fixture",
      "cases"
    ],
    "caseKeys": [
      "key",
      "title",
      "seat",
      "firstPoolResponse",
      "frames",
      "complete",
      "error"
    ],
    "frameKeys": [
      "label",
      "at",
      "page",
      "storage",
      "storageOps",
      "draws",
      "transport",
      "pendingResponses",
      "unexpectedTransport",
      "clock",
      "actions",
      "completions",
      "toast",
      "failures"
    ],
    "pageKeys": [
      "html",
      "text",
      "turn",
      "turnHTML",
      "turnText",
      "round",
      "pick",
      "total",
      "criterion",
      "criterionHTML",
      "start",
      "retry",
      "allButtons",
      "formation",
      "ruleStatus",
      "rosters",
      "pool",
      "verdicts"
    ],
    "controlKeys": [
      "present",
      "text",
      "disabled",
      "html"
    ],
    "formationKeys": [
      "name",
      "text",
      "html"
    ],
    "rosterKeys": [
      "html",
      "slots"
    ],
    "slotKeys": [
      "index",
      "pick",
      "name",
      "fixturePlayer",
      "html",
      "text"
    ],
    "poolKeys": [
      "html",
      "text",
      "search",
      "status",
      "rows"
    ],
    "searchKeys": [
      "value",
      "html"
    ],
    "poolRowKeys": [
      "name",
      "fixturePlayer",
      "disabled",
      "title",
      "html",
      "text"
    ],
    "drawKeys": [
      "at",
      "value"
    ],
    "clockKeys": [
      "now",
      "fakeTimers",
      "observations"
    ],
    "timerObservationsKeys": [
      "scheduled",
      "cleared"
    ],
    "scheduledTimerKeys": [
      "handlerType",
      "delay",
      "arguments",
      "resultType",
      "id"
    ],
    "clearedTimerKeys": [
      "id"
    ],
    "actionKeys": [
      "name",
      "kind",
      "startedAt",
      "endedAt",
      "drawsBefore",
      "drawsAfter",
      "requestsBefore",
      "requestsAfter",
      "details"
    ],
    "transportKeys": [
      "id",
      "kind",
      "startedAt",
      "calls",
      "consumedAt",
      "settledAt",
      "response"
    ],
    "transportCallKeys": [
      "method",
      "args",
      "at"
    ],
    "storage": {
      "areas": [
        "local",
        "session"
      ],
      "opsKeys": [
        "at",
        "area",
        "method",
        "args",
        "result",
        "before",
        "after"
      ],
      "methods": [
        "getItem",
        "setItem",
        "removeItem",
        "clear",
        "key"
      ],
      "snapshotReader": "Use original getItem so evidence reads do not add their own getItem calls. Every actual observed API call passes through unchanged.",
      "seed": {
        "local": {
          "fd-pool-unrelated": "held"
        },
        "session": {
          "fd-pool-session": "held"
        }
      },
      "voidRepresentation": "setItem/removeItem/clear collector rows use result:null as a deliberate representation of actual void/undefined. It is not an observed null return. getItem/key rows retain their actual string/null value."
    },
    "failureKeys": [
      "kind",
      "message"
    ],
    "failureSources": [
      "window error",
      "window unhandledrejection",
      "separate Vitest report and log remain authoritative for Node unhandled exceptions"
    ],
    "caseCompleteMeaning": "The scenario action plan reached its end before finally. This field alone does not prove teardown or test success. Both exact before/after teardown labels, pending0/timer0 and the actual test report are independently required. Business AssertionErrors execute after runCase returns from finally.",
    "actionDetailKeys": {
      "harness-mount": [
        "mounted"
      ],
      "public-button": [
        "pattern",
        "matches",
        "clicked"
      ],
      "public-player-pick": [
        "playerName",
        "searchPresent",
        "matches",
        "button",
        "clicked"
      ],
      "controlled-response": [
        "kind",
        "ordinal",
        "response",
        "delivered",
        "requestId"
      ],
      "unit-clock": [
        "milliseconds",
        "before",
        "after"
      ],
      "harness-cleanup": [
        "mounted"
      ]
    },
    "timerScope": "Pass-through vi.spyOn snapshots retain every setTimeout/clearTimeout call and returned handle observed during the case. The collector does not claim to intercept callback delivery. Actual clock advances and captured roster transitions prove timed picks."
  },
  "transport": {
    "mode": "Deferred exact Supabase query-builder and function boundary only. No actual provider request or write.",
    "criteria": {
      "calls": [
        {
          "method": "invoke",
          "args": [
            "fantasy-draft-daily"
          ]
        }
      ],
      "response": {
        "data": {
          "criteria": "Under 25s: Every player must be 25 or younger"
        },
        "error": null
      }
    },
    "players": {
      "calls": [
        {
          "method": "from",
          "args": [
            "fantasy_draft_players"
          ]
        },
        {
          "method": "select",
          "args": [
            "id, name, position, nationality, market_value_millions, dominant_foot, age"
          ]
        },
        {
          "method": "order",
          "args": [
            "name"
          ]
        }
      ],
      "error": {
        "data": null,
        "error": {
          "message": "Fictional player pool temporarily unavailable",
          "details": "",
          "hint": "",
          "code": "FIXTURE_POOL_UNAVAILABLE"
        },
        "count": null,
        "status": 503,
        "statusText": "Service Unavailable"
      },
      "success": {
        "data": "Exact complete fixture array below",
        "error": null,
        "count": null,
        "status": 200,
        "statusText": "OK"
      }
    },
    "responseDelivery": "A controlled-response action retains its planned response and delivered flag. Only an actually consumed request has its response and settledAt set. On original, absent retry means the second delivery records delivered false and requestId null. It never creates a request or fabricates recovery.",
    "unknown": "Record request and refuse any unknown function, table, projection, order arguments or repeated terminal. All writes and story/analysis endpoints are refused."
  },
  "fixtureIdentity": "Exact existing criteria-start fictional27 values. New test owns a separate copy while prior source stays byte-held.",
  "RNG": "Per-case constant .1 for user, .9 for AI, with every global call retained. Action ranges count the full tape and no call is dropped. Assert the captured start range draws once and retry never draws. UI proves seat. AI top6 is hand-derived from fixture value ordering and legal Under25 rows, with .1 choosing index0 and .9 choosing index5.",
  "clocks": "Unit fake Date starts 2026-11-06T12:00:00Z. Explicit 1999 then1 ticks prove each actual 2000ms AI delay and snake turn. Error cases spend4000ms before deliberate retry and record no automatic recovery. No native clock claim.",
  "oracle": {
    "firstHarmAssertion": "Exact final public legal roster and turn matrix with the marker. It executes after finally completes both teardown frames.",
    "allFramesBeforeBusinessAssertions": true,
    "publicConditionals": "Retry candidate count/disabled and player search/result/button availability only. No original/fixed/source identity branch. Missing controls and disabled actions remain complete journal rows.",
    "additional": "Current criterion/seat/rosters/storage survive retry. Exactly one extra read, duplicate pending opportunity inactive, known rule blocks veteran, proper1999ms no-pick states, no premature verdict/completion, all known deferred responses settled and after-teardown timers0.",
    "futureWholeJoins": "Whole normalUser and normalAi case objects are unique literal compact RAW slices. Capture actual offsets/bytes/SHA from admitted original. Require complete slice equality in fixed and all controls. No timestamp, HTML ID, tape or field normalization."
  },
  "prior": {
    "path": "src/test/fantasyDraftCriteriaStart.test.tsx",
    "blob": "4e9d54803677696454ef0cbbf155182192e03769",
    "bytes": 11319,
    "cases": 4,
    "env": "FD_RULES_START_RAW",
    "writer": "Existing pretty JSON and LF unchanged. Retain and later compare complete prior RAW bytes.",
    "expectedCaseKeys": [
      "success",
      "rejection",
      "null",
      "legacy"
    ],
    "expectedTitles": [
      "FD_RULES_PENDING_SUCCESS refuses premature admission and resumes after the deferred callback",
      "FD_RULES_PENDING_REJECTION refuses premature admission and resumes after the deferred callback",
      "FD_RULES_SETTLED_NULL preserves permissive picks and the original AI turn sequence",
      "FD_RULES_SETTLED_LEGACY preserves permissive picks and the original AI turn sequence"
    ]
  },
  "runCompatibility": {
    "invocation": "node_modules/.bin/vitest run src/test/fantasyDraftPoolRecovery.test.tsx src/test/fantasyDraftCriteriaStart.test.tsx --reporter=json --testTimeout=60000 --no-file-parallelism --outputFile=<absolute-or-relative-report>",
    "newRAW": "FD_POOL_RECOVERY_RAW=<fresh-absolute-path>",
    "priorRAW": "FD_RULES_START_RAW=<separate-fresh-absolute-path>",
    "hookTimeout": "Default10000ms unchanged",
    "properTypes": "Run node_modules/.bin/tsc --noEmit -p tsconfig.app.json first",
    "admission": "Fresh exact8 rows. Precisely two named business AssertionErrors expected in original. No runtime/import/setup/timeout/unhandled failure counts as a planned red."
  }
}
```

The source forecast is four new cases: normalUser, normalAi, errorUser and errorAi. The two normal cases must preserve ordinary success for both seat outcomes, including the exact legal human and AI picks, current turn, criteria and non-completion effects. The two harmful cases use a resolved fictional error on the exact player-pool query, then attempt only actually exposed public Retry and legal pick controls. A missing control remains an explicit observed opportunity; it cannot short-circuit the rest of capture or be substituted with an internal state setter.

The strongest proposed oracle is the final exact legal roster and turn after bounded public recovery attempts and real scheduled AI picks. Retrying must stay in the current started draft and preserve its chosen seat, original criterion and empty pre-pick rosters. This plan does not prescribe an App implementation. The author's complete source contract will determine the actual captures and expected original traces, before any run.

Use fictional27-row prior fixture only, with all names, ages, positions, values, IDs, nationalities and foot fields captured. The two new seat cases use constant0.1 and0.9 RNG values. Retain the complete call tape, stage boundaries and captured public roster and turn outcomes. Never infer a fixed global RNG census from the seat and AI path or normalize away unattributed calls. The existing criteria-start regression separately retains its own original0 RNG behavior.

All new case captures, conditional opportunity journals and teardown settle before the first named final business assertion. Retain the complete actual Page HTML, control availability, rosters, current pick/seat/turn, input fixture and bounded query legs, pending responses, timer observations, RNG tape, local/session storage and completion/settlement observations as actually authored. Do not claim an area or seam is observed unless the final collector records it.

Keep both complete ordinary new case objects unchanged as original-to-fixed preservation baselines, including every captured ID, timestamp, DOM string and event/RNG/query tape. Capture labels and other envelope fields are not a license to strip fields. This original plan does not bind guessed new frame/action/timer counts.

## Original-only QA workflow

The planned workflow is .github/workflows/fantasy-draft-pool-error-20261106.yml, push branch codex/soccer-fantasy-draft-pool-error-original-qa-20261106. Its four strict open slots are the test blob, this final plan blob, source-derived report contract JSON and complete new RAW validator/admission source. The workflow refuses all unresolved placeholders before installation, parsing or tests. This plan template is not launchable.

The exact base has5,781 tracked product files and4,659 files under src/public/scripts. Exactly the new test, plan and QA workflow are owned additions, yielding5,784 tracked and4,660 scoped files, plus11 root configuration pins. Every base path, mode and blob remains exact. The original source must remain untouched, and the current commit must have the sole PR526 product parent.

The workflow installs through npm ci against the held package-lock.json and records all521 actual installed package versions before and after. It runs the proper type gate node_modules/.bin/tsc --noEmit -p tsconfig.app.json before the test stage. A type, import, setup, timeout, runtime or transport-fixture failure cannot count as a business red.

The original stage then authenticates and retains the completed preflight's run/job/artifact metadata, exact ZIP and every16 independently pinned physical body, including its copied inert snapshot. It repeats the code-only AST/inert saved-page gate on the current unchanged source. Its product source, index, tracked physical bodies, locks, installed versions and zero-byte offline receipt hold before and after.

One JSON-only serialized Vitest command runs precisely the new four cases and unchanged criteria-start four cases. It sets FD_POOL_RECOVERY_RAW and FD_RULES_START_RAW to separate absolute destinations, uses --testTimeout=60000 --no-file-parallelism, and leaves the hook timeout at the held default. Capture the complete stdout/stderr setup log, JSON report, exit status, report-error records and both full RAW files. No second hidden invocation or reporter substitution may supply the census.

The expected original report forecast is8 rows:2 precise named new business AssertionErrors,2 new normal passes and4 unchanged criteria-start passes. The actual unit invocation must exit1 and its reporter success must be false for that declared qualification. The Actions qualification can succeed only after validating every expected row and rejecting unrelated errors. The final source-derived contract will replace this forecast with exact titles/markers before launch.

The unchanged criteria-start source independently determines four keys success/rejection/null/legacy and14 captured frames. Retain all14 full HTML/state/inputPool frames and the entire FD_RULES_START_RAW body from this actual invocation. Validate pending-rule admission, successful/rejected/null/legacy criteria behavior, exact legal human/AI rosters, original seat/AI RNG draws and non-completion state. This grants current criteria-start unit evidence only. It grants no formation run, historical RAW, full suite, HTTP or native evidence.

No build, snapshot regeneration, reader/cap sweep, native browser execution, real player data request, backend write, schema change or publish occurs in this original QA stage. The offline transport receipt must remain zero. Final source/index/physical/locks/521 checks and artifact upload run even on a failure; an incomplete or failing packet stays failed.

## Evidence debt and next gates

1. Freeze and independently review the new test, complete semantic validator, source-derived case census, final plan and workflow binding. Do not launch a template.
2. Run on the untouched original Page. Independently admit the actual run conclusion, every artifact body, reports and both entire RAW bodies. Preserve failed attempts and correct only proven harness defects with exact inverse and source identity.
3. Only an admitted original business-red packet permits a minimal App fix to be authored. Keep it Page-local if the actual cause supports that boundary; preserve real data, shared hooks/components, query, criterion, seat, scoring and presentation.
4. A later fixed stage must reuse the exact regression and compare both whole normal new case objects and the entire criteria-start RAW literally to the admitted original. Independently qualify all expected passes.
5. A later physical original negative control and exact fixed restoration must prove the check responds to the actual Page fault. No control is admitted merely because its script exists.
6. Full/build/reader/cap and native public-control qualification, a fresh clean source/build join, product diff review and draft PR readiness remain separate future gates. No such credit is claimed here. Integration with newer main and publication remain held.

The present state is active preflight GO only. Original source and QA evidence authoring are in progress. No original qualification, App fix or broader runtime is admitted by this plan.
