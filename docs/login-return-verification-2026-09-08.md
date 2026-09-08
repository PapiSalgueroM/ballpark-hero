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

## Verification

Clean npm ci installed 543 packages, applied the pinned auth-js patch, and
reported zero audit vulnerabilities. Both exact TypeScript configs pass.
Production build passes in 37.74 seconds with the same index-CW6_-zdC.js entry
as Round 524. No app, snapshot, package, lockfile or sitemap-ledger file changed.
Existing build warnings remain. Install/build logs are dukb-round525-install.log
and dukb-round525-build.log in the OS temp directory.

The normal login-return check passes all five sections. All 55 measured phone
points hit the splash, none hit the crawler copy, and three nonfixture page
requests are aborted. The wall control produces exactly four named failures
and measures all 55 points on the copy. The stuck control produces exactly
one missing-pageshow-listener failure. Every other assertion remains green.

Independent review found that inline template exceptions could leave a good
splash on screen and go unreported. A pageerror listener now registers before
navigation and records page-runtime as a separate failed check. Re-review
found no remaining actionable code issue. This is an early static-template
measurement, not a real authentication test or a claim about later app runtime.

The scoped runner now classifies simLoginReturn as a browser harness. Without
--browser it explicitly skips it and reports zero executed checks. With
--browser it runs and passes the actual measurement. The temporary runner
server used free port 4210 and stopped afterwards. DB_PROBE=unreachable kept
that classification test from calling the runner's unrelated database probe.

The HTTP route handler allows only exact GET fixture document/logo requests;
everything else is aborted. WebSockets are closed separately and service
workers are blocked. Browser preconnect/background networking is outside this
page-routing claim; no machine firewall or whole-process isolation was added.

All fifteen generated-site fences pass, fourteen through the scoped runner
and simPrerenderBoot directly with installed Chrome. Its three app boot samples
have zero failed requests and all eleven retired addresses reach their target.
The scoped runner log is dukb-round525-fences.log in the OS temp directory.

## Checks on the checker

Six probes ran on exact temporary copies of the final harness; all copy/root/
import and control rewrites require one matching anchor. Main verified that
the recorded source hash matches the final script and inspected the reports.

- An unrelated failed assertion under stuck exits 1 rather than earning credit.
- A Node exception under stuck exits 1.
- An actually executed inline browser throw under stuck exits 1 with both
  page-runtime and pageshow-listener. Removing exactly the pageerror listener
  makes the same throw incorrectly earn stuck success, proving the new check.
- Two synthetic same-origin loopback GET/POST requests have zero collector
  receipts under the actual default abort. Mutating only that exact collector
  URL/method routing allows both requests through, with the expected empty GET
  and synthetic-round525 POST bodies. No real destination was allowed.

The first cross-origin collector attempt also got no receipts with routing
allowed, because Chrome rejected that request independently. It was not counted
as evidence. The same-origin control above proves the measured distinction.

Artifacts and reproducible runner: C:/Users/antho/AppData/Local/Temp/
round525-login-probes-2756a9982e6d4d8c84ac303e64b7b552. Includes results.json,
manifest.json, verify-login-return.mjs, exact temporary copies and all logs.
These are local verification artifacts, not product code or a general network
sandbox. The final change is limited to simLoginReturn.mjs and these docs.
