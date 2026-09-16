# Cookie choice storage recovery

Isolated from frozen `a96ed002809ed78d3a9bb19a9e66a77cfbb634e8` on
`codex/cookie-storage-recovery`. Independent production source review passed.
On September 16, the six real-component cases passed and all nine controls
failed at their exact intended assertions, with no unhandled errors. The proper
app type check and plain production build also passed later on September 16.
Release verification remains pending; no release approval is claimed.

## Behavior

- A failed initial storage read shows the real banner with a storage warning.
- A failed Accept write keeps the banner visible and does not start optional
  scripts. The message does not claim that the choice was saved.
- Essential only dismisses the banner for this page even when saving fails.
- A page-lifetime failure flag blocks subsequent ad and analytics loader calls,
  ad mounts and consent events from reviving a stale stored Accept value.
  Only a successful explicit choice save clears that flag.
- Normal cross-tab acceptance, withdrawal reload and manual ad-slot gating
  remain in place. This is fail-closed startup/recovery, not retroactive
  unloading of previously executed vendor scripts.

The flag lives in the existing consentedScripts module. No new consent service,
vendor, persisted key, remote endpoint or generic framework was added.

## Prepared verification

`src/test/cookieStorageRecovery.test.tsx` renders actual CookieConsent and
AdBanner components with the actual script loader. jsdom does not fetch their
inserted external script tags; fetch is stubbed to reject accidental calls.

Run after the test lane is authorized:

```powershell
node scripts/simCookieStorageRecovery.mjs
$env:COOKIE_STORAGE_CONTROL='read' # Repeat for each value below.
node scripts/simCookieStorageRecovery.mjs
Remove-Item Env:COOKIE_STORAGE_CONTROL
node node_modules/typescript/bin/tsc --noEmit -p tsconfig.app.json
```

Controls: `read`, `accept`, `essential`, `mount`, `event`, `ads`, `analytics`,
`retry`, `crossaccept`. Each requires a unique source anchor and changed bytes,
then a failure in its selected real-component test. Temporary copies remain
outside src. Each control also requires its specific assertion message; an
unrelated failure in the same case cannot prove the control. The read control
removes banner recovery rather than throwing an artificial React error.
Healthy is expected to exit 0; each control must print both
`CONTROL MUTATED` and `CONTROL PROVED` and exit 1. Crashes, signals and unhandled
errors do not count as successful control proof.

Every run prints a retained OS-temp evidence directory, separate from cleaned
fixtures. It contains the Vitest JSON report when produced, stdout, stderr,
runner log and summary. Unexpected failures preserve the same evidence.

No production requests, commits or pushes were made for this draft.

## Local receipt, September 16

The healthy run exited 0. Each control printed its mutation and proof markers
and exited 1. No source or assertion repair was needed during this batch.
The process-level non-loopback network guard remained at 130 bytes before and
after all ten runs, with zero new blocked attempts. The component tests also
asserted no fetch calls. No compiler, browser or build was launched during
that focused test batch.

The retained evidence index is
`C:/Users/antho/AppData/Local/Temp/dukb-cookie-storage-proof-20260916.json`.
It records exact source hashes, all ten evidence directories and report/log
hashes. Evidence index SHA-256:
`4c66e22ed7c9a6356dd83287eb16509fdb5608dfb64a36968ae9c3caaa0eb67d`.

## Compile receipt, September 16

The proper `node node_modules/typescript/bin/tsc --noEmit -p tsconfig.app.json`
check exited 0 at 00:46 EDT. The sequential `npm run build` exited 0 at 00:47
EDT, with the existing Browserslist-data, ambiguous Tailwind utility and chunk
size warnings. This was the plain production build, not SEO regeneration or
a browser download-budget check. No public snapshot source files changed.

All five production/test/runner hashes match the tested source and the
before/after compile manifest. The network guard remained at 130 bytes, with
zero new blocked attempts. Logs, results and manifests are retained in
`C:/Users/antho/AppData/Local/Temp/dukb-cookie-compile-14bab24dd4ce400abdb0eb9e602bc4d3`.
Its `proof.json` SHA-256 is
`f999d337d13851e904c0ec86c34d6357ff45daa9c2968e52bc2bc974e9b06a53`.
This follow-up remains isolated from the published a96 combined release.
