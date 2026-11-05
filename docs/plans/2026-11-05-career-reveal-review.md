# Career Quiz reveal review implementation plan

> For agentic workers: use the existing remote execution lane. Never execute the held local App or Git index.

Goal: make the existing first-opening sequence reviewable after a Career Quiz finish, and copy that sequence without player or season spoilers.

Spec: canonical master CRQ-08, P1, especially its acceptance that actual sequence is reconstructed without assigning unused clues. This is a bounded partial slice. It does not infer which clue caused a solve or rank intelligence.

Architecture: add CareerRevealReview as ResultScreen children. Read the existing insertion-ordered revealedCells Set and existing counts. Reuse careerCellValue. Do not modify hook, data, daily action/save shape, scoring, shared result component or board.

Base: PR511 head271e8af48b87ac36500c56138b81595b00d50775. Main3b14650d verified. Other owner holds Club Manager Team-picker and K League. Draft-only stack remains506,505,508,510,511.

## Scope and behavior
- Add src/components/career/CareerRevealReview.tsx, mount it only inside the finished result in src/pages/CareerGame.tsx.
- Native collapsed Review your reveals button opens a compact review. Show guesses and boxes separately. Describe that hints are included, the final full-board reveal is excluded, and no causal claim is inferred.
- Previous reveal and Next reveal move through first-open order, not row/year/column order. Print row, season, column label and existing formatted value. Do not invent missing statistics.
- Read Set insertion order without sorting or mutating inputs. Only valid covered-board keys can appear, never the always-visible season column. Repeated cell actions remain one reveal.
- Copy map header: Career Quiz reveal map; outcome; guesses; boxes; Columns: Club | Apps | Goals | Assists | Value; row lines with first-opening ordinal or a dot. Row numbers only, never target/club/season/value. Explicitly explain dots and numbers. Zero reveals has a truthful empty review.
- Copy uses native clipboard, with live success or manual-copy fallback text. No game action, RNG or completion runs from review controls.
- Visible controls use44px minimum height; narrow map scroll stays inside its container; opening and stepping do not scroll the document automatically.

## Steps and checks
1. Add real-page tests using real hook/board/daily storage and generated fixtures, with only shell/network/completion boundaries stubbed. Run on original App first. Require named business assertion failures and zero import/runtime failures.
2. Implement minimal component/page mount. Prove fixed/restored tests, exact save/completion/data/RNG holds, daily finish/reload, hint inclusion, zero reveals, loss, unlimited reset/mode isolation, unknown values and clipboard failure. Use physical reverse-order, all-board, spoiler and wrong-value controls, each changed source asserted.
3. Run proper app types, focused existing Career tests and old/current daily parity. Production build follows locked dependency install. Run all15required saved-output readers plus existing guide/search/meta/home/anchor fences and all16unchanged route caps. No snapshot source changes expected because review is postgame only.
4. Extend existing actual-day browser qualification with native review/clipboard/keyboard/reload walks and phone/desktop screenshots. Abort external requests. Review generated images and inspect raw receipts independently.
5. Deliver a clean draft PR on PR511 with only owned App/test/docs leaves. Update PROJECT-STATE and WORKBOARD. Local board append-only; external evidence only. No merge/publish and no waiver of wider held gates.

## Review focus
- Automatic finish reveal must not become a recorded clue.
- Daily wrong/won/give markers and duplicate cells cannot reorder the clue trail.
- A reloaded finish must not pay again.
- Null/zero valuation stays the existing n/a rendering.
- Spoiler-free map must encode only row/column/order/count/outcome.

## Qualified result, 2026-11-05 UTC

Product pins: component5909beb8225f5e994301bbdc4c1591b58ba57a1b, pagef85280d6f4379c62c81fba10eb0aae88039af422, testbf675c0fbfab439bd655cece31932ba71eadaf04. The rest of App sources, hooks, data, scoring, saves, shared board/result and all permanent scripts are held.

Original42122371013 at11ff4831087a66197756756e8882538b625e30b2 has9exact missing-review AssertionError reds, zero runtime banners, and source/lock holds. OriginalZIP13458657802,389577bytes,SHA256ac63464eccece6d120905db20a2179cfd550404ce709c1dc5a5d18439259eb2c. Earlier42122086596 has the same9businessreds but its wrapper incorrectly read an absent reporter field as0; that wrapper preparation failure is retained and is not green credit.

Fixed App1b36dfbe19797bbb4509d5c5fef005c703baca98, tree4c16d194d2bc4e1797df07beb3f07e1cff63c73b, qualification42123433679. Proper types0;9fixed/restored real-page cases;7effective physical faults with exact6/9/8/1/2/1/9failure sets across81rows; existing early-club11 and record/stale3 pass. Old/current daily parity has3plays/12steps/12saves and lost/playing/won with0problems. The source arm audit is aa76272ea3e7c9bf0352c44be480532b9c521e3ca82587aa307cd7bd496f01ee.

Production build25.05seconds. All20saved-output readers and all16unchanged route caps pass. All521installed versions, source/lock inventories and239protected public/guide/index/ledger references held. No guide/search/snapshot/ledger refresh was needed for postgame UI. Archived dist.tgz6982040bytes,SHA256eb2ad1b2286bfb1c16c0626eefdc48293abbed6211ca7fa67d6a5346474ab51c;849files/23842282expandedbytes match every before/after browser manifest entry. Independent non-browser audit dfd9eb577874b52d07013e711504bc2cdecdc75c99c7c05f23baabe624bd670a.

Browser:9140checks,5native actual-day wins,510frames,247actions,10literal reloads,10review phases and10real clipboard sentinel/readbacks. Core320/390/1280 keep the full11club+4random-stat path;430/1440 use bounded3reveal paths. All100foreign requests, including5completionPOST attempts, were aborted. Each win has1guess and700score; local completion is once percontext, no successful backend write claimed. Source/data/849distfiles held. Five fresh review viewport PNGs personally viewed by root and independent reviewer. Seventeen totalPNGhashes verified; the older12captures are not given additional visual-review credit. Scroll holds apply after target viewport preparation.

Executed helperaf4b2ca26f17344085aa931971a786aa7ee471ee checks exact step text and native navigation/copy. A later43c254e682c5b033fe439051b34d5079ac0f53ce adds explicit isVisible calls and did not execute in42123433679. Independent replay found152rendered counter/cell frames and142step observations in actual body.innerText; this proves rendered text, not every step's within-viewport pixel visibility. Browser admission843b54d72bb7a72ac2783f436f6bc9617f7a7e222b904aed2d739f6291d62b60 retains this boundary.

Final artifact13460705269,14589673bytes,SHA256a183d23723759fa87653fe9539698fdc606d7497abfc8b1a176d10aff1901587, retained at C:/Users/antho/dukb-handoff/2026-11-05/career-reveal-review/final/packet.zip. Source artifact13460340677,329208bytes,SHA2561f6e49005a8422f620e88788366d65387508cf10c4bdb0d938421730fc7e2a9b. All archive bytes were verified before extraction.

This is CRQ-08 partial: ordered review/map only. No inferred decisive/rare clue, timestamps, guess interleaving or hint grouping. Whole master remains partial. Clean delivery excludes temporary workflows/QA scripts and stacks after PR511. Wider release-wide full suite, inherited veteran/phone/US checks and live Reach remain unwaived. No merge or publication.

Next bounded task: CRQ-03 public suggestion ordering. Actual original42124906855 onf9a1c1eb4db2827b81284194b9cd8fe12a353a82 reproduces4public-order assertion reds and4preservation passes with fictional delayed cohorts. No current live roster mismatch is claimed. Product/qualification pending for that separate slice.
