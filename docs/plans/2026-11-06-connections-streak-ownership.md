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

Regression src/test/connectionsStreakOwnership.test.tsx is blobf83ee818add17199697838895ef1c35a69311c15,32246UTF-8 bytes,SHA256554cb524f1263c5921c70e4747057f5b1f28fd630c49f9f4b3a141737fd574bb. Six cases use248 public clicks,7actual mounts and7bounded fictional read queries. Every query returns the two supplied sixteen-name boards. All116complete frames include before-mount/pending/settled loading observations and teardown-before/after; cumulative render/action/storage/RNG/completion tapes remain in RAW. Restore coverage is nonterminal only.

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

Active entry only is qualified. Original tests/workflow are being authored. No original business failures, App fix, controls, build/native or clean delivery are claimed yet.
