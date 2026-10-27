# Results early applicability proposal

Status: SOURCE PROPOSAL ONLY. Runtime UNRUN. No canonical source/ref/CI mutation.

1. Freeze the behavioral contract first. On actual current source, the existing historical engine comparison must reject with exit 1 and an absent later-setup marker. On a detached worktree at the actual historical BASE, it must accept with exit 0 and a present marker. An invalid root must report infrastructure exit 2, never a mismatch/pass.
2. Author one Node standard-library-only preflight. Use the identical literal historical BASE without importing another module (the existing helper imports esbuild). This intentionally duplicates that immutable ref rather than adding a JavaScript source parser; both existing files are held and the remote control asserts the actual expected commit/blob. Compare the same UTF-8/CRLF/trim strings as the unchanged late guard. Record actual expected/current commits, trees, Git blobs, raw and normalized SHA256/length, and match status. Do not print engine bodies.
3. Insert the invocation after setup-node and before Python/npm/browser/build. Keep the original BASE declaration and late guard file completely byte-identical. Gate the existing !cancelled recorded-facts step on preflight success; build-dependent steps already require build success. Keep evidence uploads and source hold active on mismatch; capture head/tree early so the hold still has its inputs.
4. Remotely run qualify.sh on a clean full-history checkout with no dependency install. It executes real current/BASE comparisons and shell && marker gates, then an actual copied BASE-engine CRLF/outer-whitespace normalization control, an appended-token fault, and exact restoration. This catches a guard that consults only HEAD/blob identities rather than actual file bytes. All changed control source is in the disposable BASE worktree.
5. Independently inspect output/identities/markers/source holds before considering integration. If the actual Results workflow is exercised, current source must remain a failing, inapplicable historical proof with all later setup/build/browser steps skipped. The equal control establishes engine applicability only; it grants no layout, browser, whole-source, fixture, or shipping qualification.

Test-first scope:
- Freeze this plan and the qualification script before authoring the candidate preflight.
- The known late refusal is source-bound, not claimed as a newly executed baseline here.
- A remote missing-script/import error does not count as a meaningful red.
- Actual current source is the genuine negative input; actual BASE worktree is the positive control. Both copied controls are physical and their changed raw bytes are retained; the appended token must reject, while CRLF/outer whitespace must preserve normalized equality. Final restoration is exact.
- The marker is a bounded stand-in at the first later-setup boundary, not npm or a browser installation. Reading actual workflow skipped-step metadata is required for a full workflow stopping claim.

Owned proposal paths:
- scripts/qa/soccerResultsApplicability.mjs (new)
- .github/workflows/soccer-results-layout.yml (only trigger + early step + recorded-facts condition)

Held:
- scripts/qa/soccerResultsLayout.mjs including historical BASE afd8f6863681507693a3af34b6038e049dfcd419
- scripts/playSoccerResultsLayout.mjs including its late equality guard
- Every app, data, dependency and existing control source.

Expected source identities for review, not inferred runtime:
- Original workflow Git 2b5a5046f2b6af7d7c6ed369509605cccd47c5dd
- Original helper Git 47824c7a6cc12d988087f47acf0c62eca652d87b
- Late browser script Git a72482698dc53f744ed21a1962752071389e5b68
- Historical BASE engine Git 185e25df98b8299ebc1132facf1998908e9198bd
- Current unchanged main/I engine Git 1ecd36c893395485a93d91cb1905ff78c83c7741

No artifact downloads, local runtime, source writes under the protected repo, or actions/ref mutations are authorized by this proposal.
