# Soccer Attack cross-tab save visibility

September 8, 2026. Found during Round 540. This issue is NOT fixed by the
Round 540 unsaved-choice guard. It is the next Round 541 candidate.

## Actual browser reproduction

The two tabs share an origin and browser context. Both reach the real seed9
Attack target through UI actions. Tab1's next write is deliberately refused
once, leaving the real pending recap. Tab2 holds the actual Web Lock, queues
a confirmed seed88 restart, then tab1 queues Retry. On release:

1. Tab2 successfully writes seed88, revision0, and reads it back.
2. Tab1 runs next under the same Web Lock but reads cached seed9, revision2.
3. Tab1 accepts that old expected value and writes seed9, revision3.
4. Both tabs eventually show seed9, revision3. The confirmed restart is lost.

The write wrappers call native Storage methods; no saved state or engine result
is injected. The unsaved-choice repair still works: a second native click
reaches the old enabled DOM, but no unsaved session begins while Retry owns it.

Two raw-queue runs failed: `%TEMP%/dukb-attack-save-choice-wfFtxS` and
`%TEMP%/dukb-attack-save-choice-hJl4pj`. The latter report contains both tabs'
read/write receipts. A third run, `4Hhq35`, passed. This is an intermittent
concurrency defect, not an assertion that every queue will lose a write.
The exact pre-barrier browser source is retained beside hJl4pj as
`playSoccerAttackSaveChoice.unbarriered.source.mjs`.

Reproduce from this branch's built preview with PowerShell:

```powershell
$env:ATTACK_SAVE_CHOICE_BASE='http://127.0.0.1:4216'
$env:ATTACK_SAVE_CHOICE_WIDTHS='390'
$env:ATTACK_SAVE_CHOICE_BARRIER='none'
node scripts/playSoccerAttackSaveChoice.mjs
```

Default browser coverage deliberately inserts another real lock holder until
tab1 receives the native seed88 storage event and reads the new save. Its
passing ownership checks do not establish raw-queue durability. The driver
records the selected barrier and has no fixed sleep intended to hide this race.

## Direction for the next repair

HTML does not specify consistent interaction between localStorage areas across
agent clusters. A Web Lock serializes callbacks but does not supply a cache
visibility guarantee. See the [HTML storage specification](https://html.spec.whatwg.org/multipage/webstorage.html#introduction).

Use one authoritative IndexedDB record. Read the record, compare the expected
save and write the next record within the SAME readwrite transaction. Report
success only after transaction completion. Later overlapping transactions must
observe earlier committed changes. See the [IndexedDB transaction rules](https://www.w3.org/TR/IndexedDB/#transaction-scheduling).

The migration needs explicit coverage before shipping:

- Import valid legacy localStorage only when the authoritative record is absent.
  Preserve the old bytes as backup. Never fall back to stale legacy bytes once
  an authoritative record exists, including storage failures.
- Initial and recovery reads become asynchronous; controls must stay locked
  until they finish. Late reads must not replace a newer committed state.
- Cross-tab notifications may request a fresh database read. They are hints,
  not the authority for accepting a write.
- Preserve damaged-save recovery, deliberate unsaved play, quota failure and
  unchanged-run reload. Verify transaction aborts without partial success.
- Exercise actual IndexedDB and real competing browser tabs, including the
  unbarriered queue and negative controls that remove the transaction compare.

No migration, database dependency or save-format change was made in Round 540.
Keep this work in a new isolated draft round; preserve all current previews.