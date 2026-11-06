# Connections Streak Ownership Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans task by task. Steps use checkbox syntax for tracking.

**Goal:** Viewing an already-finished Soccer Connections board must preserve the earned streak until another round actually finishes.

**Architecture:** Keep the existing hook and public interface. First prove the terminal-mode viewing defect against the unchanged PR523 source. Choose the smallest ownership change supported by that evidence, leaving mode selection, puzzle data, scoring and completion behavior held.

**Tech Stack:** React, TypeScript, Vitest, Testing Library, GitHub Actions and pinned Playwright for later native qualification.

**Spec:** Read-only C:/Users/antho/Downloads/DoUKnowBall_Game_Expansion_Masterplan.txt, PL-05 supporting correctness. Whole PL-05 remains partial. This is not a completed feature card.

## Global Constraints

- Base PR523:3cb2528ca044c75edae96197e58d2ca525b5e1f9/tree93ba5a30f0fcb70725284702260c7c389e94a8ab.
- App/Git/runtime work uses the GitHub connector and Actions. Local native PowerShell text/JSON/hash/archive work stays outside the repo, except exact-prefix WORKBOARD appends.
- No local App/Git/Node/Python/build/test/install/browser/PROJECT-STATE writes. No rebase, merge, publish, real data, database, schema or backend writes.
- Companion Career/Club/Team-picker/KLeague/guides remain held. Grade Transfer remains retired. Never apply old zips.
- Main15652350f43fa82fa6872357bb1561f948fa150b contains external companion changes; this qualification does not cover integration with it.
- No em or en dashes in new text.

## Review Focus

- Finished Daily or Unlimited wins: viewing the result again cannot increment streak.
- Old Daily loss after a genuine Unlimited win and public Retry: returning from the new playing run cannot erase the earned streak. Direct old Unlimited-loss return after a Daily win already preserves it and must stay held.
- Legitimate new wins and losses: settle the current streak once, including a new Unlimited retry.
- A legitimately saved unfinished Daily record and same-mode clicks: preserve progress and storage. Early fallback/pending-pool transitions remain captured. Asynchronous terminal restoration is unqualified.
- Unfinished roundtrips: preserve both boards, lives, hints, selection policy, RNG tape and actual completion boundary behavior.

## Source and admitted entry

Original hook55050eccb78a6574a1524f0cfb7597c789104c73 uses one wasPlayingRef for active mode-derived gameStatus. Pageb5bd5aaba7d8877be86cc592ca4ae1616b517a5f keeps both mode buttons available after results. These are source findings, not runtime proof.

Actual active preflight42288173600 succeeded at120fa5003a635b62d7e46260dcb60a5d48f3c618/tree95a12fedb042dcb6c96ae10c19d47db8b7ca9186. Independent audit648fce5f3125245eea5ca50e76eb08a5bd3358035c35da02e710bc460504d7d8 admitted16archive bodies,5777held product path/mode/blob rows,521locked versions and zero offline bytes. Actual receipts hold5778tracked bodies including only the QA workflow. AST direct route/React lazy/uncommented Soccer object and inert21327-byte snapshot passed; canonical/connections,4492readable characters, no redirect/retired/noindex. No game test or fix had been authored before admission.

## Task 1: Original-first proof

**Files:** Create src/test/connectionsStreakOwnership.test.tsx and this owned plan. Hold src/test/connectionsModeSelection.test.tsx at e79ad2f59a671d83fba294e4bc61c400dd2b3037. QA workflow .github/workflows/connections-streak-20261106.yml is temporary and excluded from the final product.

**Interfaces:** Consume the actual useConnections return values and public Page controls. Produce complete case objects, frame captures and actual JSON Vitest results for original/fixed/control comparisons.

- [ ] Author the three source-reachable harm cases: Daily win revisits, Unlimited win revisits, and old Daily-loss revisits after a genuine Unlimited win followed by public Unlimited Retry. Assert streak and full streak-storage bytes equal the legitimately earned prefix after view-only switches.
- [ ] Capture three whole preservation cases, including direct return to an old Unlimited loss after a genuine Daily win, legitimate settlement/retry and saved unfinished restore/same-mode/nonterminal behavior. Keep all captured IDs, storage, writes, transport, RNG, completion calls and failure frames.
- [ ] Independently review the source and exact forecast census before launch. Use only bounded fictional puzzle-query responses and declared external UI/auth/completion boundaries.
- [ ] Run proper types, then actual JSON-only Vitest for the new file and the unchanged prior mode-selection file. Qualification requires the precise named business AssertionErrors on original source, complete captures and all preservation/prior cases passing. A setup, type, transport, count or unrelated error is a failed qualification.
- [ ] Audit actual original output and archive before authoring an App fix.

## Task 2: Bounded streak ownership

**Files:** Modify src/hooks/useConnections.ts only after admitted original evidence. Keep Page/Board, useDailyPuzzle, useGameCompletion, fetch parser, puzzles and save schema unchanged.

**Interfaces:** Preserve every public hook field and callback. Make streak settlement belong to a newly finished round rather than entering a completed mode view.

- [ ] Choose the smallest source ownership change that fixes each admitted counterexample.
- [ ] Run the unchanged regression and prior mode tests with all cases passing. Compare both complete preservation case objects and prior traces to the admitted original without stripping fields.
- [ ] Run physical fixed/original/restored negative controls with changed-source assertions and exact inverses. Every new business check must reject its actual original control; all prior behavior and source/index/locks/521/offline holds must restore.

## Task 3: Qualification and clean draft

**Files:** Temporary native helper/QA workflow outside the final product; final delta is Hook+new regression+this plan+remote PROJECT-STATE+WORKBOARD.

- [ ] Run fresh proper types, normal build, all20required built readers and all16unchanged route budgets, with no build/reader overlap.
- [ ] Run trusted native viewport journeys through current public UI using fictional GET transport and aborted completion POST attempts. Define the precise census and scope before launch; never claim provider truth or backend writes.
- [ ] Independently audit actual archives, source custody, native receipts and screenshots.
- [ ] Freshly build a helper-free clean source tree. Join every product src/public/scripts path/mode/blob and all11root configurations to the qualified full tree; compare every built-file path, length and SHA256.
- [ ] Finalize this plan with actual outcomes and failure history, prepend remote state and append remote workboard while preserving prior bytes. Review the exact five-file product/source join before creating its stacked draft.
- [ ] Verify actual PR number, saved head/tree, open/draft/unmerged status and unchanged16earlier draft heads. Append local WORKBOARD with its exact prior byte prefix, then update external checkpoints. Never merge or publish.

## Source review correction

The first static plan forecast four harm categories. Review established that old Unlimited loss followed by a genuine Daily win clears the shared guard, so direct return to that loss already preserves the earned streak. The fourth proposed same-instance harm is not reachable without discarding that old round. It is a preservation case, not a fabricated failure. Multi-instance/cross-tab scope is excluded. The original forecast is now6new cases:3business failures and3whole preserves, plus8unchanged prior mode-selection passes,14actual rows with3expected failures and11passes. The final source-derived census below locks exact counts before launch.

## Locked original source contract

Regression src/test/connectionsStreakOwnership.test.tsx is bloba196e04d005c53c605ad092615ced0d566c7ba21,32194UTF-8 bytes,SHA25637149d9326293ce780c0d80ca9aeb82350276dc60952a56157b3b5a8dcf88221. Six cases use248 public clicks,7actual mounts and7bounded fictional read queries. Every query returns the two supplied sixteen-name boards. All116complete frames include before-mount/pending/settled loading observations and teardown-before/after; cumulative render/action/storage/RNG/completion tapes remain in RAW. Restore coverage is nonterminal only.

| Case | Original forecast | Frames | Exact test title |
|---|---|---:|---|
| current | whole preservation | 24 | CONN_STREAK_CURRENT preserves genuine settlements and a legitimate Unlimited retry |
| restore | whole preservation | 24 | CONN_STREAK_RESTORE preserves a nonterminal save same-mode views and unfinished round trips |
| unlimitedLost | whole preservation | 20 | CONN_STREAK_UNLIMITED_LOSS_PRESERVE keeps a later Daily win on a direct old Unlimited loss revisit |
| dailyWon | expected business AssertionError | 14 | CONN_STREAK_DAILY_WIN_VIEW refuses extra streak credit from viewing a finished Daily win |
| unlimitedWon | expected business AssertionError | 15 | CONN_STREAK_UNLIMITED_WIN_VIEW refuses extra streak credit from viewing a finished Unlimited win |
| dailyLost | expected business AssertionError | 19 | CONN_STREAK_DAILY_LOSS_VIEW keeps an earned streak when an old Daily loss is viewed after Retry |

The unchanged prior eight mode-selection cases contribute42frames. Original qualification must produce14actual rows,3named business failures,11passes and158complete frames, with no type/setup/import/runtime failure. Both win-view harms are forecast to earn3then incorrectly display and persist4and5 on two revisits. The old Daily-loss harm must genuinely earn1 through Unlimited, publicly Retry, then incorrectly write0on each old-loss revisit. The direct old Unlimited-loss preserve must keep its genuinely earned Daily1. These are predictions until the actual original run is admitted.

## Current outcome

Active entry only is qualified. The two failed original attempts below remain unqualified; the next original attempt uses only a measured runner execution adjustment. No original business failures, App fix, controls, build/native or clean delivery are claimed.

## Retained first original qualification failure

Run42294868639 at4f29d314c1df8a31d6041bae6a2acbc7ebab7bf3/tree75977145c43bc0d9afcc56f7aa647e50d8fbdcdd remains FAILED. Proper App tsc reported four TS2769 errors in the new regression at89/96/97/109: installed Testing Library ByRoleOptions does not accept exact:true. The regression command never ran. Zero game cases and zero RAW frames are credited; no original streak business proof or App fix is claimed.

Artifact13541042797 is1010768ZIP bytes/SHA256c279751198d6470ac3f44b0e240b09f0313669a583e6ea382fbd203e760651a0, saved with all17retained bodies outside the repo. Source/index/locks/521versions/offline holds passed. The original Hook55050 and Pageb5 remain held. Preflight retention and the unit report/RAW/admission steps were skipped after types failed.

The refreshed test a196e04d005c53c605ad092615ced0d566c7ba21,32194B/SHA25637149d9326293ce780c0d80ca9aeb82350276dc60952a56157b3b5a8dcf88221 removes exactly four unsupported comma-space exact:true options. A unique-line inverse reconstructs the entire originalf83ee818add17199697838895ef1c35a69311c15/32246B source. Every other byte, literal accessible name, public action, assertion, label and capture DTO is unchanged. The six-case3/3,116frame/248click/7read forecast and prior8/42remain predictions. First source/manifest remain saved. The refreshed manifest SHA2563b20dc48454669a1f11ef9ab240a05b2d4e13d2fb64481f200886db1d0d0e9bd records this correction. No RAW equality with the first run can be claimed because no first RAW exists.

## Retained second original qualification failure and finite runner experiment

Run42296698793 atacaebff895e672918b842248f425b951c02251df/treecc1242df9f67879e3ef2ccc72bd277e637d31b71 remains FAILED. Proper App types passed with0bytes of diagnostics. Vitest reported14rows,7passes and7failures, so the strict expected14/3/11 gate rejected it. Six new rows and the first prior mode-selection row have registration STACK_TRACE_ERROR traces, not the required named business AssertionErrors. Their real durations were6053/8797/6986/7816/5656/6736/8076ms. The files began1ms apart. Parallel execution is observed; CPU causation is not measured.

The complete retained RAW records43new frames, distributed7/7/7/8/7/7 rather than116, and61new public action records rather than248. The prior capture retains42frames. Every mounted new capture is still playing with streak2, without a result heading or completion attempt. Teardown observations overlap an in-flight click, but captured foreign case labels have not been established. There is no qualified streak business proof. No incomplete capture is normalized or removed.

Artifact13541124502 is3173285ZIP bytes/SHA25641871ad40b823777dde4b29cfda301c16fcdf7b827f680df82161409390cc5fd, saved outside the repo with all45bodies including16retained preflight bodies, reports, logs and both complete-as-written RAW files. New partial RAW is2814978bytes and prior RAW394640bytes. Source/index/locks/521versions/offline holds passed; original-admission.json is absent.

Pinned Vitest3.2.7 source resolves Node testTimeout5000/hookTimeout10000 when the held repository config supplies no override. runner/src/suite.ts creates the registration STACK_TRACE_ERROR and passes it to the timeout wrapper; runner/src/context.ts260-271 uses that registration stack for timeout errors, explaining the generic report. Official immutable source: https://github.com/vitest-dev/vitest/blob/v3.2.7/packages/vitest/src/node/config/resolveConfig.ts#L890 and https://github.com/vitest-dev/vitest/blob/v3.2.7/packages/runner/src/context.ts#L260 .

The next QA-only experiment adds exactly --testTimeout=60000 --no-file-parallelism to the same single JSON-only Vitest command. The pinned resolver sets one worker when fileParallelism is false. Hook timeout remains10000 because no hook-timeout failure was observed. This is a finite wall-clock execution allowance, not a game-timer change or a relaxed oracle. Testa196, all assertions, actions, labels, fixtures, render/storage/RNG/completion observations and expected14/3/11 plus158frames remain held. Any further timeout, runtime error or incomplete census still fails qualification. No App fix is authorized before actual original admission.
