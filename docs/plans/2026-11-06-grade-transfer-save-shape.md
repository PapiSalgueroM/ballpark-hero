# PL-03 supporting slice: Grade the Transfer saved-state recovery

The master remains read-only: C:/Users/antho/Downloads/DoUKnowBall_Game_Expansion_Masterplan.txt,409 cards,444117 bytes,SHA256 fda0f7eef07d41f2ba91e89dff3542fef98cd3bd9aabcbe02f70b649797d357a. PL-03 lines6889-6901 stays partial. This is a supporting recovery fix for one daily game, not named career slots, backups, sync or migrations.

## Existing problem and proposed boundary

loadSaved in useGradeTransfer returns JSON.parse(raw) as its declared type without validating it. The state initializers trust grades and index; the fetch callback reads the same function to recognize a restored finish.

A payload with grades:{} and index:0 reaches a grading card, then the existing grade callback spreads a non-iterable object. A valid grades array with index:-1 reaches current:null and the actual Board returns null after loading. These are source-confirmed candidates; runtime proof is still owed.

Keep the change inside loadSaved. Parse to unknown and accept only a non-null object carrying an array of grades and a nonnegative integer index. Grade entries must be null or an existing GRADES member, the only values the current initialization/button writer emits. Reject other shapes through the existing null/fresh-day fallback.

Do not require exactly five entries, impose an index upper bound, require grade/index coherence, add case IDs, or change unknown extra fields. The reader already tolerates shorter arrays via grades[i]??null and recognizes finished indices at or beyond the loaded case count. Preserve those behaviors. Do not delete or rewrite storage on read; the unchanged save writer replaces invalid bytes only after actual play.

Hold pickDaily/shuffledRange, scoring, crowd calculations, vote requests, save key/shape, restore-completion guard, Page/Board/copy and all real data. No new schema or data migration.

## Original-first acceptance

Use fictional transfer rows through the existing Supabase transport boundary with actual fetchTransferGrades/fetchAllRows, pickDaily, Hook and Board/Page where relevant. Preserve the real completion logic while substituting external auth/recording boundaries. Unit-only storage setup may provide malformed records. Capture actual state, HTML, exceptions, storage, vote/crowd payloads and completion calls before named business assertions.

Malformed cases should demonstrate:
- A non-array grades object must recover to a usable first card and permit one normal grade, rather than throwing before the vote path.
- Negative, fractional or non-number indices must recover to the first card instead of a missing card or string-concatenated Next index.
- An invalid grade entry must not become a revealed grade, React child or earned score.

Preserve cases should cover missing storage and the existing malformed-JSON fallback, valid empty/short arrays, a valid in-progress record, a valid revealed card awaiting Next, and a finished record. Compare valid records' full restored rounds/current index/status/score/exact/share/storage and completion behavior. A finished reload must retain the existing restored-finish suppression. Current valid grading, Next and vote/crowd payloads must remain unchanged. Do not demand a fixed test count until the original cases execute.

First run the new tests on the original Hook and admit only actual named business failures plus valid preservation passes. Apply the small loadSaved guard only after that evidence is reviewed, then require the same cases and complete preservation vectors to pass. Causal source controls should prove both array/item and index checks are exercised, with exact source restoration.

## Native and delivery limits

Malformed storage belongs only to unit boundary fixtures. Native proof must not inject storage or override App/DOM/clock/RNG/in-memory pools. It may load fictional rows through bounded transport, play a fresh card through real controls, observe the actual save, reload and continue. Abort other foreign traffic and claim no successful backend write or real-player validation.

All App/Git/runtime work remains remote. Local App/Git/runtime and merge/publish remain held. Normal type/build/readers/caps and appropriate native/source/build joins are owed before a clean draft. Companion Career, Club Manager, Team-picker, K League and guide ownership remains untouched.

## Pinned source evidence

Base product PR519, headf1ce570f140443f161e566e2a6974410e8d92185, tree46e419a6514473e8e7fffe2ba3f30ba3cede90b3. The pending Connections change owns only its distinct Hook and does not change these files.

- src/components/grade-transfer/GradeTransferBoard.tsx: 79d6c0a974bf0f8edb9914edd0ecdcf27eec5af8
- src/hooks/useGameCompletion.ts: b104822551fd5d9b1c5d6ddb14f01c79e5a662b2
- src/hooks/useGradeTransfer.ts: 5e677e844f8af33de27c206673fcf66849ad5930
- src/lib/dateUtils.ts: 12c9de0ed37b0797492f3e936bcba70bdc03d585
- src/lib/fetchAllRows.ts: 16a6d21750405e7a647576ff513ed8ee11d5ba6b
- src/lib/fetchTransferGrades.ts: c7e8db542217df61adc4022facb0f2f8ca62423c
- src/lib/restoredFinish.ts: a7707c36eba160b36eb31713039329658eebe51a
- src/pages/GradeTransfer.tsx: 518f865c38c043e08048b4270a644baf50c48ce1

Hook evidence: loadSaved lines50-55; state initializers74-75; restored-finish read88; current selection104; unchecked array spread146. Actual Board evidence: current:null returns null at105; grade buttons invoke grade(g) at160. These are source findings, not executed test results.
