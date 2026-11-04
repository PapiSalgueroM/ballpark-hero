# Seventh partial SC-17: Read the pass

Design/test baseline: b570e7e68808673eeec6f383675c42d7ec3b9197, tree2bdd94faf8e9c29c9dcc3c479a6404a90e7a96c9. The clean release candidate integrates onto sixth documentation main ae17830b9daee522ac5ea738f2e36b93e888ad04. Root owns final join, build, merge and publication. This is a bounded learning session, not the complete SC-17 card.

## Contract

Objective: read the described passing space, choose the useful action, then learn why.
Five fixed fictional situations, three 44px or larger buttons each. No timer, random order or new career state. The first answer is locked. Correct first answers earn 20 points, total 0..100. A short explanation, labelled Reading feedback, appears before Next decision. The running score output is labelled Reading session score. Final See session score enters existing finish('passing', score).

The menu tile is Read the pass. Before Start reading session, show rules and a worked example: a blocked lane and a clear alternative; three correct answers score60, four score80. Reopenable Reading session rules (?) preserves the active question, answer and score. Drills/Close keep existing parent behavior. Result Try again starts a fresh reading run; the existing available/banked/practiceOnly guard still owns Bank the session.

Existing engine rules remain exact: 50+ gives +1,80+ gives +2 next-season Passing, or Distribution for GK; one bank per season. Attributes/overall do not rise immediately. Spent/repeated practice never calls the reward callback or changes the saved career. No production RNG site, coefficient, engine/Page/save/lock or real-data change. Old timed paths and their full state/draw tape must remain exact.

## Frozen situations

1. Find the open side. A defender blocks the pass to Centre. Left is unmarked and has a clear lane.
   Choices: Force the centre pass; Pass left [correct]; Carry straight at the defender.
   Reason: Left is open. The central lane runs through the defender.
2. Use the return lane. You pass to Right, then move into clear space ahead. Right can see you; your old spot is now marked. What should Right do?
   Choices: Pass into the new space [correct]; Pass back to the old spot; Dribble toward the marker.
   Reason: Return the ball into the open space, not the spot the defender has covered.
3. Support under pressure. You receive with your back to the attack. A defender is tight behind you. Support is open behind the ball.
   Choices: Turn into the defender; Hold the ball for the press; Set it back to Support [correct].
   Reason: The open support pass keeps the ball away from the defender at your back.
4. Offer a useful angle. Wide is pressed at the line. A defender blocks the straight pass to you. The diagonal space to your left is open.
   Choices: Stay behind the defender; Move into the open diagonal [correct]; Run closer along the blocked lane.
   Reason: A new angle gives Wide a passing lane; moving along the blocked line does not.
5. Choose the keeper outlet. The keeper has the ball. Centre is being pressed. Wide is unmarked with a clear short lane.
   Choices: Play into the marked centre; Wait for the press to arrive; Roll to Wide [correct].
   Reason: The wide outlet has a clear lane and time to receive.

## Scope and qualification

Production: existing src/components/soccer-career/TrainingPanel.tsx d1beb9426daab4620807139d7634b47dc3dca601 plus new lazy PassingDecisionBoard.tsx. Held Page1f4d448c, enginee88d6f91 and current save codec. New permanent src/test/trainingPassingDecision.test.tsx, six intended cases:4owned original failures and2held classic defaults.

1. Freeze tests/RAW before production. Original imports only current Panel/engine/codec. Optional new entry can be absent safely, and owned assertions inspect missing reward/session outcomes rather than earning setup-error credit.
2. Original isolated Actions must pass proper types, produce exact expected owned failures/held passes and RAW6/source/transport holds. Career owns sole acquisition of each source artifact; Root reads the retained copies and owns build/native/public artifact acquisition. Then implement only the two scoped UI files.
3. Fixed/original/restored outcomes retain complete state/draw records. One physical count-wrong-as-correct fault must change actual score60/+1 to100/+2 and fail its owned outcome; restoring source recovers full RAW. First-answer and replay guards need effective source controls too.
4. Native scope: CM/GK at320/390/1280, mixed scores60/80, locked wrong answer/explanation, Bank once, actual Page save/reload and spent replay. Strict native scroll/errors and response-body/source/dist proof use existing shared QA. Manager owns journey planning.
5. Root qualifies normal build/readers and all unchanged caps. SC cap840 remains; the current TrainingPanel is already lazy, and the new lesson body is lazy inside it. No cap or full-fleet waiver.

The two UI product files are implemented and source-qualified as recorded below. Build/native/public publication remains pending. Tests are not a natural-career, actual-provider or full-suite claim.


## Source qualification, 2026-11-04

Final product: TrainingPanel c98cb31af7d9d4298b78ffe908b26d3bbec89906, new PassingDecisionBoard ac438cb04641766b5a09be676afca5829daa2b1f, frozen test765f34735dc7cb608e0a47d9a1d712ba28091372. Eight exact Panel spans invert to the complete original d1beb9426daab4620807139d7634b47dc3dca601. Engine e88d6f91744bf14ac1d1afd43bbb26be9f9e15db, codec86ec011693fd5bc702b5e8ccec05d27775a72a76 and Page1f4d448cc9718bc3fa97b6987be5f14b27496c47 stay exact. The new lazy import uses the existing alias form so the unchanged training-motion copied-source harness still resolves it. Rules explicitly assume onside options; all five situations, choices, correct indices and reasons remain frozen.

Original source run41919402001/source23a88678e556cff3458278b663c3505d0e34a6ed, artifact13366551699 (611547bytes,SHA2561262b61e185de3e919fda9498b9265331250495986342510a1ddd43f2c694183), admitted proper App types,4owned AssertionErrors/2held cases andRAW6. First testd2c004c2 was strengthened before fixed runtime: fake time now begins immediately before Start, after real lazy readiness, and remains active through90seconds and completion. Five tiny setup spans invert exactly, with all6identities/reward/default contracts held. Final765f is also qualified against the complete original below, so predecessor evidence is not substituted for final test credit.

First fixed run41923170519/source dc83f94b9fee675954fdadb67ed4853cb3e8f80a, artifact13369080060 (613560bytes,SHA2565ba08bd9c57fb393f390126d1ba9e89320a436c6429384cd2c3b82f4b1634e91), passes proper types,6cases andRAW6. CM60 queues passing+1; GK80 queues passing+2/Distribution while current98skills/overall and morale72 stay held. First-answer/rules/90second behavior and spent100replay hold. Both classic RAW files are byte-identical to the original; classic paid still consumes its existing five0.5draws, spent classic consumes none and makes no callback.

Final source qualification run41925837123/job126909891164/source970976c2117251192e2d4c0cf7f384e6b2358749, artifact13369846353 (781056bytes,SHA25607644b8e4002f02a5ae377ad8b150fe4a7f965dc2601220a013132e4d2f3fa39), passes final765f fixed6, complete old Panel/Board-removed4owned+2held, restored6 and allRAWbyte restoration. Five effective source faults each select one owned AssertionError and restore its exact complete RAW: wrong answers counted60to100/reward1to2; overwritten first answer80to100; a real hidden30second deadline80to0 after90seconds; spent retry callback1to2 while the engine annual reward stays held; an extra global random call consumes0to5draws. Each selected fault/restore has5unselected skipped-or-pending rows with noRAW or case credit. No setup failures are credited. All5723tracked source hashes, pins, statuses and14empty offline receipts held. Optional runtime counters remain UNKNOWN.

The source owner acquired every original once and checked byte count/SHA256 before extraction. Root reads those same retained copies under C:/Users/antho/dukb-handoff/2026-11-04/masterlist-seventh/career/. No local App/Node/Python/helper/browser/Git runtime or index edits; all application execution is isolated Actions and Git writes use the connector.

Adjacent52cases/three existing Panel consumers and the unchanged training-feedback motion harness (normal12/four existing controls) remain pending at this preparation stage. One new normal frozen-host Bun build, proper types, all20output readers/all16unchanged caps, actual Bank10px control before nativeCM/GK6 and six reviewed photos, exact custom-domain public6/assets/audit/IndexNow and docs closure are required before release. No seventh production claim. SC-17/book409 remain partial; historical fleet/parity and original98to75 limits remain unwaived.


## Compatibility and compiled qualification

The adjacent run41927157420/job126914425883, artifact13369457908 (686729bytes,SHA25625e3fe06dbe284c0ee429f17ed3646e38b645cb7d73d54039870f8d97d9e6d16), passes52unchanged cases across keeper11/classic6/keyboard35. All six classic RAW/input/storage frames and all35keyboard routing/tape checks hold. The unchanged feedback-motion harness has12normal passes and four effective existing binding controls: unshot/unmarker each5owned failures/7held, unresult/unbank each6owned failures/6held, with their actual closing output and outer native0. Source5721/status/diff/six offline receipts held; optional runtime counters UNKNOWN.

Single normal build source0cc7afa91d44183401ba57ff2dab1ea6d98374fd/tree5e6e84e0ab75e214d5729e50f1ce0137dc035b92, run41929484381/job126922430291, completedSUCCESS. Proper App types, existing save/home/records guards, frozen Bun1.4.4 build, all20output readers and all16unchanged caps pass. Actual SC838.0KiB fits840; CM648.3fits648rounded; FO390.1fits390. Completed payload848files, tar6983157bytes/SHA256541e40b16ecc8a963a12485adbc0cabf480d1b1938f8b2992b1da9b5b9b7b98b, manifestSHA2566f4d51fa77e97d72e2cfc613e0115cef0422e7c7e781bf5dc4f457f80bd3be57. Originalartifact13370149485 (9452473bytes,SHA25645570e5487b5e1820639479034b637e12dc4852996baf1eabb8f55f107a29dfe) acquired once by Root and checked before extraction.

The unchanged records guard's generated exact JSON leaf is owned and retained/readback-hashed before only that ordinary leaf is removed; its final report is explicitly the last negative control1FAIL/11PASS, while healthy12/three caught defects are verified in the native log. Allsource-after/diff/status captures happen before any final hold comparison, preserving evidence even on failure.

Before normal journeys, one real trusted CM60 Bank click moves the actual document0to10px. The unchanged SC_READING_APP_NO_JUMP:bank guard fails with native1; the complete accepted saved career still exactly matches the existing reference reward. All other errors and source/dist/manifest/model-bundle holds pass, so this effective control qualifies the strict guard, without normal-journey credit.

Then all6controlled CM/GK sessions at320/390/1280 pass and all6actual screenshots are reviewed. Literal CM60/+1Passing and GK80/+2Distribution, first-answer lock including30native attempts on disabled alternatives, help/score, same-panel retry reset, codec reload, perfect100spent practice and current skills hold.60answer checks and234measured X/Y action pairs pass.852actual asset-body reads over71unique assets match the completed payload. All5728source hashes before/after match SHA2565eef35e56731377d616f843269a44315902810ec8abc002d7745e897a088ad7d;848completed files hold, source/statusdiff0 and all unexpected browser errors0. No normal browser clock or RNG override. Public release and final custom-domain6 verification remain pending.
