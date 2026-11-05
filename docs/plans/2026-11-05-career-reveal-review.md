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
