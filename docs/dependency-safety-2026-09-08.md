# Round 520: build-tool dependency safety

Claimed September 8, 2026, from Round 519 ac84b913. This is a local review
candidate, not a production release or a claim that all security risk is gone.

## Plan and acceptance

1. Recheck the prior audit's five affected packages against current primary
   advisories, registry metadata and the actual config. Record the baseline
   audit before implementation. Never use an unreviewed force upgrade.
2. Make the smallest supported manifest and lock updates. Preserve the exact
   Supabase 2.95.3 pin and its patch. Inspect all transitive changes and peers.
3. Verify a clean install applies the patch, the exact app type check passes,
   production builds, local mocked screens still work, and all fifteen
   generated-site fences pass. Report warnings and any failed attempts.
4. Rerun the dependency audit and request independent diff review. Back up only
   as a draft candidate; do not merge, publish or change existing servers.

The source audit, five affected packages and proposed versions are recorded in
docs/dependency-audit-2026-09-08.md. Versions there are proposals to verify, not
changes already made. Runtime account/provider behavior is outside this round.

## Broad test boundary

The default runAllSims runner is not read-only. Its production table probes can
insert if safeguards regress, and validator endpoints can populate caches.
No new full suite was launched. A global fetch replacement alone cannot cover
browser, native transport and native child processes. Do not label unexecuted
backend gates as green. Continue explicitly mocked bounded checks while a
separate process-tree isolation design remains pending.

## Results

Baseline npm ci installed 544 packages. The existing three-file auth SDK patch
applied successfully, and the exact app type gate passed. The independent
compatibility review found no required source/config migration. Local Node
24.14.1 meets Vite 6.4.3's supported engine range. Hosted Node and the
LOVABLE_DEV_SERVER=true tagger feature path remain unverified.

The main-agent baseline npm audit exited 1, confirming five affected packages:
two high, two moderate and one low, covering eight advisory objects. It reports
Vite 5.4.21, esbuild 0.21.5, humanfs/node 0.16.6, Browserslist 4.25.1 and
postcss-selector-parser 6.1.2. This is dependency inventory evidence, not proof
of exploitation or a reachable browser-runtime attack. Targets were checked
against registry metadata and the primary advisories before the manifest edit.

## Final scoped verification

The final clean install added 543 packages and audited 544. The SDK patch
applied again. npm ls reports valid peers, one Vite 6.4.3 and one deduplicated
esbuild 0.25.12. The entire Supabase lock family and patch bytes are unchanged.
The fresh npm audit exits 0 with no reported vulnerabilities. That is a dated
dependency-audit result, not a whole-site security or AdSense guarantee.

| Dependency | Previous | Final lock |
| --- | --- | --- |
| vite | 5.4.21 | 6.4.3 |
| esbuild | 0.21.5, nested 0.25.0 | 0.25.12, deduplicated |
| @humanfs/node | 0.16.6 | 0.16.8 |
| browserslist | 4.25.1 | 4.28.9 |
| postcss-selector-parser | 6.1.2 | 6.1.4 |

Only Vite's direct manifest range changes. The remaining lock changes are
their expected dependency/platform packages and deduplication. Independent
review checked 38 changed/added package entries against registry URLs and
integrities, with no dependency or peer conflicts. The root lock metadata is
separate: 36 existing entries changed including root, three were added and 25
were removed. Typography's separate exact parser 6.0.10 stays unchanged.

- Both app and Node-config type gates pass before and after the updates.
- Production build passes in 48.61 seconds, 2,841 modules. Entry:
  `index-DqHV_WlN.js`; CSS: `index-C2w-JxlF.css`. Assets are injected into all
  148 applicable snapshots, with eleven signposts left alone.
- All fifteen generated-site fences pass. Three real snapshot boot samples
  have zero failed requests; eleven redirects reach their destination.
- simFlagshipWeight passes: 2,167 KB raw under its existing 2,250 KB ceiling,
  with the manager chunk still lazy. No threshold was changed.
- simLiveScoreQuery passes all 24 cases and all 25 exact-failure controls
  under the new esbuild version.
- simStorageStartup passes 15 tests and five exact controls, including the
  copied-SDK baseline and read-denial control. simFootleStorage passes five
  tests and its original-effect control. Temporary control files are gone.
- playStorageStartup passes 50 browser checks and its vendor-request control.
  playCookieChoices passes 47 checks and its previous-handler control.
- New playBuildCompatibility passes all four cases on both the built server
  and the local Vite dev server. Each of its four controls was run in both
  modes and produced only its named AssertionError, eight control runs total.
  Records renders twelve sections and expands/collapses the Super Bowl table
  through 12/60/12 rows. Four archives render all 56 board tables and their
  stored cells. Actual home-tile hover changes rgb(240,242,245) to
  rgb(43,171,111), matching emitted foreground/primary colors.
- playLiveTicker passes all nine sections on this build, including 271px of
  forward movement after Resume and working touch versus mouse hover behavior.
- Final source-name, indexing and whitespace checks pass after the new harness.
  Independent dependency and harness reviews have no remaining findings.

The stored JSON is an input fixture for the rendering checks, not a fresh
verification of its sporting facts. Records' supplemental columns are not
covered by the new row comparator. Dev checks exercise initial TSX/CSS
compilation and client navigation, not an HMR edit or hosted tagger override.
The broad suite remains unexecuted because of its production write paths.

## Verification mistakes retained

The first hover control hit SecurityError while trying to inspect a blocked
cross-origin font stylesheet, before deleting the target rule. That run failed
and was not accepted as a successful control. The final version ignores
off-origin stylesheets before CSSOM access, while still failing on unexpected
local-sheet errors. Its control then deleted one actual rule and failed only
the hover assertion.

Independent review found that dev mode initially checked only navigation and
could pass against the production server. Main reproduced the false positive
(four passes with DEV=1 against port 4192). Boot now also requires a successful
JavaScript response for the parsed module entry. The same wrong-server probe
exits 1 with only the boot assertion failing; the actual dev server on 4193
passes. Both complete final mode/control matrices were rerun after this fix.

The ambiguous duration utility and large-chunk build warnings predate this
round and remain. The old Browserslist-age warning is gone with the data
update. npm still reports package deprecations, which are not the same as
reported audit vulnerabilities. No warning thresholds were relaxed.

## Review state and next unit

Preview http://127.0.0.1:4192/ serves this build. The temporary local dev server
is on 4193. Prior previews 4186, 4188 and 4190 remain unchanged. No source game,
account/provider logic, Vite config, committed snapshots or sitemap ledger
changed. No merge or publication. See docs/test-execution-safety-2026-09-08.md
for the separate source audit behind the full-suite restriction.

Next bounded client-only accuracy fix: own Profile average currently divides
max(account points, browser points) by browser plays. In the existing audit's
synthetic fixture, server 550 points plus local 50 points/one play displays
550 as the average. Pair browser points with browser plays and label that
scope. Show Not yet when the browser has no plays. Leave Total Points, other
profiles, historical totals, account restoration and date boundaries alone.
Use a real-component test with mocked auth/backend boundaries, reject writes,
and prove the original mixed numerator and missing scope label as controls.

## Primary references checked for this round

- https://vite.dev/releases
- https://v6.vite.dev/guide/migration
- https://github.com/vitejs/vite/security/advisories/GHSA-fx2h-pf6j-xcff
- https://github.com/vitejs/vite/security/advisories/GHSA-4w7w-66w2-5vf9
- https://github.com/vitejs/launch-editor/security/advisories/GHSA-v6wh-96g9-6wx3
- https://github.com/humanwhocodes/humanfs/security/advisories/GHSA-p498-v437-472g
- https://github.com/postcss/postcss-selector-parser/releases/tag/6.1.3
- https://github.com/postcss/postcss-selector-parser/compare/6.1.3...6.1.4
- https://github.com/browserslist/browserslist/releases/tag/4.28.8
- https://github.com/browserslist/browserslist/releases/tag/4.28.9

Current release policy includes Vite 6.4 security backports. Version 6.4.3
covers the reported Vite issues; a jump to Vite 8 is not necessary for them
and would exceed the current tagger/Vitest peer ranges. Existing plugins
accept Vite 6. No special migration flags are justified by this app's config.
The parser's 6.1.3 security fix broke Tailwind 3 group/peer variants; 6.1.4
corrects that regression while retaining the depth guard. That upstream
finding is why the real emitted-CSS hover check belongs in this round.
