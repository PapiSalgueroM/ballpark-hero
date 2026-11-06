# Soccer Grid pending-submission settlement implementation plan

Goal: settle a pending main-round guess only while its originating cell, rules and real deadline still allow it.

Spec: master SG-11 (P0, delayed timer/background/slow validation and exactly-once round settlement) plus bounded PL-05 support (coherent consequential action history). No new real sports data, schema, eligibility rules or scoring formula.

Baseline: clean PR513d3935a288f00abd556467a45076636b890d8dd25, tree47941e1282cb378018a5ed5f2e8c8f4a16d15060. Hook6beb012bbc5cd4b2402724fb2a80efe7d0fc5f0c. Main3b14650d verified. Other owner retains Team-picker/KLeague.

## Concrete source gaps
- A pending response checks only whole-round completion after awaits. If another tab fills the same cell and the waiting tab adopts eight valid cells, the old response can append a ninth ok action for an occupied cell. Rendering shows eight cells while action-count win detection/completion awards900.
- Timer completion follows a one-second nowTick render. Date.now can pass the persisted deadline before an interval fires, allowing a late result to initiate a write or mutate the result.

## Scope
- Modify useSoccerGrid.ts only as far as needed to read latest main-cell ownership, originating puzzle/rules, and wall-clock deadline at submission entry and the existing commit boundaries.
- Preserve first real-submission timer start, stored epoch, raw action codec, exact score, rarity formula, main/Overtime separation, fail-closed validation and old late-unverified toasts/checkingDown behavior.
- Expiry uses existing persisted expired flag and completion path exactly once. Ensure first-start epoch is available synchronously before any promise returns.
- Do not count or flash a wrong answer for a cell that became filled while checking. Drop superseded originating puzzle/ruleset results rather than assigning them elsewhere.
- Do not claim rollback of a request that was already sent before expiry/ownership changed. Recheck before initiating writes and before local action commit after the write reply.
- Explain the existing competitive wall-clock policy in reopenable rules if source review finds it insufficient. Time runs from first submission through checking/backgrounding; Unlimited has no deadline and Overtime remains unscored. Do not add a new pause/grace/scoring edition.

## Checks
1. Two independent fictional-fixture real-hook suites, ownership and no-interval deadline, must fail on named business assertions in original App. Preserve source/raw reports and exact failed/passed case census, no missing-import/runtime reds.
2. Make the smallest hook change after original proof. Fixed/restored suites and effective physical cell/deadline guard omissions must distinguish the defects. Preserve timely/untimed/Overtime, true ninth-cell win, initial idle start, late-unverified and reload/once-completion.
3. Proper app types, relevant existing grid/daily/deadline/settings contracts and original-current save parity where supported. Production build, all20saved-output readers and16unchanged caps. If policy copy changes, use existing route-only guide/search/snapshot derivation tools, keep unrelated reference rows/routes exact and prove stale-content controls.
4. Native remote browser keyboard/touch across phone/desktop; actual source board with explicitly marked transport-only synthetic validation for concurrency/slow responses. Abort all foreign requests, no live backend/eligibility credit. Verify exact main save, visible cells, finish/Overtime state, no jumps after target preparation and fresh screenshots.
5. Independent source/outcome/visual audits, exact clean source join, draft stacked after PR513. Update PROJECT-STATE and WORKBOARD. WholeSG11/PL05/master stay partial and global release holds remain.

All App/Git/test/build/browser execution is remote. Local source/index held. Native external evidence and append-only board writes only. Canonical master remains unchanged.

## Design review update before implementation

The original fixtures also challenge storage adoption and callback resolution in one React batch, and a rules change before its pending callback resumes. A ref updated only by this game render can still lag the authoritative save.

Add one readonly getCurrentProgress() getter to useDailyPuzzle, reading its existing synchronous guesses/status refs. This changes no existing append/restore/persistence algorithm. Soccer Grid first takes any newer stored save, then reads this authoritative progress for each eligibility check. Its settings and first-start epoch refs update synchronously at their existing setters; the request captures a meaningful puzzle/rule identity.

The old-hook single-tab parity adapter needs a snapshot getter shim because the historical hook lacks this new API. That shim reads the historical hook's own returned guesses/status and cannot claim same-batch semantics. Run all available old/current daily consumers and existing shape/record/stale tests; preserve every old raw save/outcome. No production compatibility fallback or duplicate storage parser.

This slice guards stale originating requests and real deadlines for a fixed selected ruleset. It does not redesign pre-play setting availability, backend idempotency, ranking cohorts or legacy forged logs. Those master-card parts stay open.


## Qualification and retained failures

- Original gameplay proof: run42132883712, head4d40f819393aa0d272a42dc85de0748cf8800a95. Exact24cases:12owned assertion reds,12preservation passes, propertypes0. Artifact13464616714,416322bytes,SHA256a28a2d26492242139580eea4861234847580211e8a946cd761b687ba474bed0a.
- Original typed policy proof: run42134331715, head9451be9344be4696b85f6224eaaf31b0750764b3. Two missing-copy business assertion reds, types0. Artifact13465130716,396830bytes,SHA2562b466b17d5456ae67f7908c23916a2887a5d58cac92112687048f6168a5c461e. Earlier42133811151 used five unsupported RTL role-query exact options and failed types; retained, with no App credit.
- First fixed source run42135076782 at3ce77666852b0377ca8d630b3ecd9ccbd908915e: all26newcases,183existing/1intentional fixture-writer skip, all39consumer parity (511steps/362old saves), shared contract and record negative controls pass.
- Run42135715517 at6b193d848fd81e7b2aa38bda9b825e6e84b7500b passes all312control rows and both production builds, but the saved-policy assertion fails. Prerender deliberately holds the pool request, leaving the game skeleton, and strips dialogs. The original saved page737884893e96b41b304a01668cd9936aae2bac34 has neither policy nor example. Readers/caps/browser did not run. Artifact13465187280,1167035bytes,SHA256e88ffc3573fb3e1d261ae4d2e970059ee99c57418eaed30ee0dc81f1b6abf188 is retained.
- Add only the approved policy item and worked-example section to the permanent Soccer Grid guide, reversing them recreates the complete original soccer2.ts byte-for-byte. Scope pre-play test/browser queries to the actual40ssettings container, so the bottom guide cannot satisfy a missing pre-play note. Every prior assertion, action and help-dialog scope remains.

## Completed source and build qualification

Run42136658673 atbf9d8a39cd422f25a4a478551bd01589e7516a9b, tree3242ed524baf800bb5bee1efd46ad511bd7d64c8:

- Propertypes0,26fixed/restored cases. Twelve physical source states produce312results:278passes and34exact named business failures, with red counts0/12/1/1/6/5/1/2/2/2/2/0. All144gameplay preservation objects match the fixed run across states. Effective controls include original hook, render-only progress/settings, absent wall-clock/cell checks, exclusive deadline boundary, missing post-rarity/post-insert/wrong guards and original policy page. No test/fixture mutation, skipped row, runtime/setup red or absent-anchor replacement is credited.
- Existing11files have183passes plus1intentional fixture-writer skip. Source-discovered full parity and retained unfiltered JSON/stdout agree on39consumers (plus1diagnostic skip),511steps and362old saves with0problems. Historical commit617b8354b722c703407074e78a86665d4f7633b5 supplies hook blob3486bb42c9626752236be858651e6f7332bc5d24. The old snapshot getter shim covers ordinary single-tab parity, not same-batch behavior.
- Both production builds, scoped prerender and all20readers pass: simAdsense, simBrand, simHeadTags, simHiddenPages, simHubs, simIndexNow, simIndexing, simInternalLinks, simNoRivalNames, simPrerender, simPrerenderBoot, simRetiredRoutes, simSchema, simSitemap, simSnapshotAssets, simSiteSearch, simGuideHeadings, simSeoMetaSplit, simHomeCopy and simHarnessAnchors. All16existing route download caps pass, allguard/measurement files unchanged versusPR513.
- Existing generators change only2owned frozen reference entries across131guides, the owned search row/source stamp across133keys, and the owned snapshot/ledger route. The other171dated routes retain their ledger entries. Permanent fences are unchanged.
- Full artifact13465094870:11221688bytes,SHA2560a045fb4b18b8f280fbfd3a06121b4b54deac6cc7f5162a6b7b36a0005260e7c. All669archive bodies verified independently. Disttar6980759bytes,SHA256640a6f32e28e4aa7857a26e7362dac3c48dc2d648580d83d2925e454011bc6f0, all849bodies/23844492bytes match both browser manifests.
- Functional browser1769checks across6actual-day journeys:360frames,156actions,12literal reloads. Three genuine distinct ninth-cell wins record900once each; three real40second deadlines record0once each and keep Overtime separate. Actual expiry observations40831/40831/40825ms. All282foreign attempts are36fictional validator fulfilments plus246aborts;30selection and6completion attempts are blocked. No production forwarding.
- Initial six phase captures were personally reviewed. Four mobile captures are clear; both desktop captures contain the existing sticky ticker because the photo retained scrollY431. They are retained without desktop visual approval.

## Exact clean build and repaired native captures

Closure42140111926 atba6414400a056f7e5ccb81434254db35e0a42b26, tree01e9ca03e7a445776bfba1bfc8b0db7fa233b9d8:

- Provisional clean App tree9822a9cc8304d25889a54fde41c714c9fcf5ac76 rebuilds with propertypes0. Every849built file is byte-identical to the completed qualification. All4650source/public/script rows join with exactly5generated blobs admitted and only2remote QA helpers excluded. Final clean delivery excludes both helpers and the qualification workflow.
- Photo-only helper5b5775705f3173618609605b2bf33c3ec6971cbc adds native focus/Home preparation and measured zero-scroll/chrome-clearance/full-storage holds. Every gameplay assertion, fixture and journey outside photo() is byte-held.
- Fresh browser1835checks,372frames,162actions,12reloads,6native capture-preparation receipts and6phase PNGs pass. All six fresh images personally reviewed by root and an independent reviewer, including both fully visible desktop top rows. No App/style/DOM/save injection or clock/RNG override.
- Artifact13467193432:3670086bytes,SHA25625a6afb1981ddf64f5c3e7722d2bba526c3a18202255301cc49d7de9b291d4ed. Fresh image artifact13467877847:480866bytes,SHA2562ed36a52a343657b6071884ef0f3d586aff722c2fb6a41bb78ba50fc0bfbdf18.
- Exact generated Git blobs: public/sitemap.xml981606b65138f7dac610761f948e1aad21567e05; public/soccer-grid/index.html65fcae9819d92e53462c9f7826bd7d2fa2012fe4; scripts/data/lastmod.jsonb915a96d55a0bae4f148020467c297799a0cfec9; scripts/data/guideHeadingsFrozen.json4b17b3417a2a4616ef0385f30f61d5ce5abf9bb4; src/data/searchKeywords.jsonc29800086aaab26ebbe09bf181f7b5010bc1f6d3.
- Source/locks, all521installed versions and the precreated empty Node transport receipt hold. Evidence retained under C:/Users/antho/dukb-handoff/2026-11-05/soccer-grid-settlement/.

## Limits and next work

Fictional validator verdicts prove settlement and transport handling, not real player eligibility or backend writes. No rollback of already initiated requests, backend idempotency, native RNG or OS suspension is claimed. Browser visibility samples stayed visible; unit cases own the no-interval deadline boundary and same-React-batch races. Deadline RAW omits unused queue counts and resolved reply bodies; policy RAW may differ in the live next-puzzle countdown.

SG11/PL05 and the409-card master remain partial. No merge, publication or global gate waiver. Broader full-suite/practice/history/US replay/live Reach holds remain. Canonical master444117bytes and SHA256fda0f7eef07d41f2ba91e89dff3542fef98cd3bd9aabcbe02f70b649797d357a are unchanged. Local App/index held, only native external evidence and append-only local board writes.

Next candidate is XI-03: warn before admitting an incomplete Club year record, using the age/value metadata already loaded. Preserve every fact and the existing unrated result. The other owner retains Team-picker/KLeague.
