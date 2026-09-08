# Round 515 startup storage safety

Branch: `codex/round-515-storage-startup`, based on main `a4579db3`.
Worktree: `.worktrees/round-515-storage-startup`. Not merged or published.

## Measured defects and bounded changes

- `client.ts` evaluated the browser storage getter while importing the module.
  A denied getter prevented the app from starting. The SDK now selects its own
  auth-only memory fallback when persistent storage is unavailable.
- Independent review caught an additional case after the first fix: SDK 2.95.3
  tests storage writes but not reads. A denied auth-key read left the real
  AuthProvider at `Checking session`, with three unhandled promise rejections.
  The client now probes that same auth key before enabling persistence. The
  explicit key matches the SDK's old default, preserving existing sessions.
- Actual browser injection then caught an earlier failure that the auth-key-only
  test could not see. With all reads denied but writes allowed, auth-js read
  `supabase.gotrue-js.locks.debug` during module evaluation and stopped React from
  mounting. The trace reached the built entry bundle before our client ran.
  A versioned dependency patch now probes reads inside the SDK's existing guarded
  capability check, before its write probe. Both ESM and CommonJS builds carry the
  same one-line fix, and the package source stays consistent with them.
- The homepage caught value parsing failures but not storage length/key access.
  Enumeration is now inside a catch. This does not change date or score rules.
- The streak reminder read and wrote its dismissal key without a catch. It now
  stays out of the way if unreadable, and can dismiss for the visit if unwritable.
- CookieConsent read and wrote without a catch. Unreadable consent shows choices.
  Failed acceptance keeps the choices open with an accessible explanation and
  loads no vendors. Essential only can dismiss for the visit without pretending
  that the choice persisted. The prompt returns after reload in that case.

There is no global storage shim, game-save format change, database write,
Supabase SDK upgrade, OAuth change, billing change or Google CMP configuration change.
The auth SDK selects its adapter at construction. Storage permission revocation
after successful startup is a pre-existing limitation, not solved by this round.

## Evidence so far

Initial production failed eight of the first twelve focused cases, with two
uncaught write exceptions. The expanded real AuthProvider read-denial case then
failed separately, reproducing the stuck session state and three rejections.

The first fourteen focused cases passed across five files. A sixth test file
then reproduced the module-import crash above with one failed test. It passed
after the dependency patch, finishing signed out without a network request.
The combined fifteen-case rerun and replayable controls are tracked below.

- Real SDK startup with a denied getter and full storage.
- Real SDK restoration of the unchanged stored session key and game-save bytes.
- Real AuthProvider finishing startup when auth reads throw but writes work.
- Real SDK import and session lookup when every localStorage read throws.
- Actual homepage and search with denied length, key and getItem access.
- Dismissal of a real existing streak reminder without altering its streak save.
- Actual cookie UI, failed acceptance, successful retry, essential-only behavior,
  reload-equivalent remount and both healthy stored choices. Script DOM is real;
  tests make no network requests and use no live credentials.

The healthy SDK session case uses a separate isolated test file because Vitest's
module reset does not reset the externalized CommonJS SDK's cached storage probe.
That was a test-isolation failure, not a reason to change production behavior.

An optional Playwright install unexpectedly re-resolved local packages. No tracked
package file changed. `npm ci` restored the exact lock before the fourteen-test
run above. Browser tooling now uses an ignored local junction to the bundled
Playwright runtime, without upgrading app dependencies.

## Dependency patch and install evidence

`patches/@supabase+auth-js+2.95.3.patch` adds a guarded read to the existing
capability probe in `dist/main`, `dist/module` and the package's TypeScript source.
The separately guarded app auth-key probe remains necessary for key-specific
denial. No lock implementation, token, endpoint or session format changes.

The same missing read probe was confirmed in the
[upstream helper](https://github.com/supabase/supabase-js/blob/master/packages/core/auth-js/src/lib/helpers.ts),
alongside the import-time read in the
[upstream locks module](https://github.com/supabase/supabase-js/blob/master/packages/core/auth-js/src/lib/locks.ts).
This is a local compatibility patch, not a claim of an upstream fix or release.

`patch-package` 8.0.1 is the only added direct development dependency. Comparing
the new lock against HEAD found zero changed or removed existing package versions
and 25 added transitive entries. Its documented
[install-time patch workflow](https://github.com/ds300/patch-package#usage) is
also run explicitly by the dev and build scripts, with failure stopping the build.
A clean `npm ci --no-audit --no-fund` exited 0 and printed that the auth-js 2.95.3
patch applied. A future SDK upgrade must review or remove this patch and rerun
the storage checks; the patch must not be silently discarded.
The direct Supabase package is pinned to 2.95.3 while this version-specific patch
is needed. This only tightens the manifest and root lock spec; the resolved
versions are unchanged.

Before this final patch, the type gate, production build and all fifteen generated
site fences passed. `simPrerenderBoot` first needed the supported `CHROME_PATH`
because the bundled browser binary was absent, then had one non-reproduced
`/whats-new` navigation timeout. A fresh-port replay passed every route. Those
results describe the earlier build, not the final patched bundle.

## Still pending

The final patched exact type gate and production build passed. Build output:
2,823 modules, 53.54 seconds, entry `index-DmhtB4jm.js`. The install-time patch
applied again successfully at the start of the build. Independent source review
found no remaining production or consent regression after the SDK version pin.

Real-browser fault injection, replayable negative controls and all fifteen
generated-site fences are running against this settled build. Their final
results must be recorded here.
No whole-site or AdSense all-clear, merge or publication is claimed.
