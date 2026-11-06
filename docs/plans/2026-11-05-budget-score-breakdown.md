# BB-09: earned score breakdown, bounded proposal

Status: original-first candidate only. No App changes, refs, execution or new sports data.
Canonical master: line 3667, BB-09, P0 / S. This is a bounded slice of the card.
Master SHA256: fda0f7eef07d41f2ba91e89dff3542fef98cd3bd9aabcbe02f70b649797d357a.

## Source pins

Budget is unchanged from PR514. The supplied provisional ref a65eb565a2aeca5ce332ab2911dd64f56c943a25 returned GitHub404 during preparation, so these immutable blobs are the positive source authority:

- src/hooks/useBudgetBuilder.ts: 02ec7d7971bbcf96723e4a15fe285c5c0edf2ad2
- src/components/budget-builder/BudgetBuilderBoard.tsx: 526213213e4a5e1b625e1b6505227b623f76ad26
- src/test/budgetSigning.test.tsx: 97cb3fa452184995a52a77381c7ecc45d25d2c03
- src/lib/squadDeal.ts: 726c554d99de4c285604e23cbe1d6def78477bcb
- src/lib/squadShape.ts: b116f1dfb7cde01be9904c98e263c514bfc114aa
- src/lib/dartDraft.ts: 1dd73605180c08731cfe31335ea67aadfb259ac9
- src/lib/dateUtils.ts: 12c9de0ed37b0797492f3e936bcba70bdc03d585

The existing test leaf has nine actual-hook/Board cases, including original XI, score, series, completion and sharing preservation.

## Demonstrated production gap

Hook lines232-245 already have one exact formula. Board lines354-391 show rating, spend and remaining before Final, then one score and generic formula after Final. The earned components are not itemized. Existing signing-preview lines294-305 show replacement refund, remaining, rating and demand condition, but do not show score points or their signed change.

## Held arithmetic and state

Keep the current arithmetic exactly:

- Incomplete XI: finalScore0.
- Complete XI: rounded teamRating + floor(max(0, remaining)/200) + (criterionMet ?10:0) + series bonus.
- Series bonus: win15, draw5, loss0, pending0.
- Pending must explicitly say Pending and0 so far. It is not a forecast.
- Existing sign/replacement already sets series=null. Projected signing points therefore remove any old15/5 bonus.
- A replacement refunds the current player's original marketValue before charging the new player.
- The real daily criterion applies only to a complete XI.
- Preserve playerRating, formation, pool order/cap, signing validation, series simulation, RNG, completion, share text and storage behavior.

Retain the immutable original hook and its full formula before authoring. A tiny pure helper for this existing arithmetic is justified because it will serve the hook's scalar, current UI and preview. The helper can be called at all three sites without adding fields to BudgetBuilderState. Do not invent a second score formula or a production test seam.

## Product slice

1. Add an accessible Score breakdown region on a complete XI, before and after Final. A native definition list has Squad quality, Savings, Board demand, Series outcome, and Total. Points stay exact integers. Series text is Pending (0 so far), Win (+15), Draw (+5), or Loss (+0).
2. Add an accessible Score impact after signing region inside the existing signing preview. Show the same projected components plus Total change, including an explicit sign such as +0, +1 or -15. Its projected series is pending0 because committing a signing invalidates the old Final.
3. Keep the existing post-Final Score: N output and all nine old assertions. Incomplete squads remain unscored and do not auto-play, record completion or consume RNG during inspection.
4. Add compact instructions before play and reopenable help explaining the unchanged components and that replacing a player requires a new Final. Refresh only the approved route's derived guide/search/snapshot through existing generators when the source is qualified.

## Original-first test candidate

Suggested leaf: src/test/budgetScoreBreakdown.test.tsx
Blob: 86de81375d764be5bf7a13642081495fe5c09927
Ten cases, predicted original9 named business AssertionErrors plus one preservation pass. These predictions need remote type and actual original admission.

The leaf imports existing exports only. It renders the actual Board and actual hook. Its hook wrapper records the state and returns it unchanged. Only the fetched pool and external completion/auth/badge boundaries are fictional/offline. The real dailyIndex selects a day with the real no-galactico criterion. The real rating and three-leg simulation are retained.

Literal fixture oracles:
- Ten60M age22 players rate85; the40M keeper rates82; the199/200/201M keepers rate91;400M rates95.
- Keeper200: XI86, remaining200, savings1, demand10, pending0, total97.
- Keeper199/200/201: remaining201/200/199 and savings1/1/0, totals97/97/96.
- Keeper400 costs more than one third of the1000M budget: demand0, remaining0, XI86, total86.
- Actual win/draw/loss: bonuses15/5/0 and totals112/102/97. Declared legal tapes consume42/33/42 real draws and produce three1-0/0-0/0-1 legs.
- Replacing keeper40 with201: quality85->86, savings1->0, total96->96, delta+0.
- Replacing keeper201 with199: actual refund yields spent799, remaining201, total97, delta+1.
- Replacing keeper200 after a real win:112->97, delta-15; the committed XI has series=null.
- Partial and complete preview/cancel/rerender preserve all scoring state, storage, completion count and unfiltered observed random draws.

Optional full evidence file: BB_SCORE_BREAKDOWN_RAW, absolute path, fresh file. It retains all ten case IDs, full serializable input pool and actual hook states, HTML/text, completion/clipboard calls, search inputs, transport boundary and every observed random draw. No stack filtering or global draw-count relaxation.

## Qualification and physical controls

After the original census is admitted:
1. Implement the small helper and UI only, then proper app tsc plus all ten new and nine old cases.
2. Run fixed, original Board+hook, meaningful physical faults and restored. Every mutation must assert unique actual anchors, changed source hashes, exact case-title/AssertionError sets, retained raw output and finally exact restoration.
3. Useful independent faults: hide the new overview; round savings instead of floor; always award the demand; give a drawn Final the win bonus; ignore replacement refund; carry the old series into a preview; mutate a preview/sign on inspection. Exact failed sets must be derived from the eventual source and admitted from actual output, not assumed.
4. Compare every existing serializable state field, pool and complete RNG tape between original/fixed/restored. Only the added UI differs. Retain exact original formula and inverse behavior. No threshold or old-assertion changes.
5. Native browser proof on the baked App should inspect pre-Final points, replacement preview/cancel/commit, actual Final and reload boundaries at phone/desktop widths. No source, RNG or clock overrides in that browser proof. It does not verify real player records.
6. Follow the normal type/build, all saved-page readers, immutable caps, source/lock/version/offline and derived-output gates. No live database or whole-suite credit without actual corresponding evidence.

No branch, ref, App source or local runtime was changed during this proposal.
