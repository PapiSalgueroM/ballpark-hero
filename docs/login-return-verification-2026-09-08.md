# Round 525: login-return verification portability

Based on Round 524 f51cbe5e, draft PR75. Claimed September 8, 2026.

## Scope and reproduction

simLoginReturn dynamically imports Playwright directly and launches its pinned
Chromium. On this machine the expected chromium_headless_shell-1234 executable
does not exist. A launch-only probe reproduced exit 1. The same probe using
scripts/lib/playwrightLoader.mjs with CHROME_PATH launched installed Chrome
152.0.7977.77 successfully. Neither probe opened a page or contacted an account.

The harness also only intercepts the home document, app JS asset path and logo.
Other template requests can escape those fixtures. Its missing-package branch
prints a skip but still allows an overall green, and its controls accept any
positive number of failures. These are verification gaps, not evidence of a
production login defect.

## Bounded plan

1. Use the existing shared loader through a static import so the suite can
   classify the harness as a browser check. Require browser execution.
2. Fulfill only the local static template and logo; intercept and abort all
   other requests before any page opens. Block service workers. No real sign-in.
3. Preserve every existing splash/spinner check and tighten each control to its
   exact expected failures. Prove unrelated failures cannot earn control credit.
4. Run exact types/build, fifteen generated-site fences, normal harness and its
   controls, then independent review. Keep prior previews and Claude's root.

The default broad suite still contains production probes. This one browser
fixture repair does not establish whole-process offline isolation.
