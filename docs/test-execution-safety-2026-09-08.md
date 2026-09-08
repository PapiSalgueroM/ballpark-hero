# Test execution safety audit, 2026-09-08

## Outcome and scope

The default `scripts/runAllSims.mjs` group is not read-only. Do not launch it
under a no-production-writes boundary merely by excluding `simPublicWrites` or
installing a `globalThis.fetch` preload. Direct insert probes and validator calls
with possible cache writes are selected by default. A fetch hook does not cover
the whole process tree or every available transport.

The inspected source tree is Round 519 commit
`ac84b9130e74f0354748cf156c90cc64ebd439eb` (`ac84b913`). Tracked-file line anchors
below refer to that tree, not a later dependency cleanup. Installed dependency
implementation notes refer to the Round 519 worktree's installed copies at the
time of inspection; `node_modules` is not part of the commit.

This was a bounded source audit. The broad suite was not launched. No production
API or database probe was made, and no deployed-function behavior was verified.
The cache-write findings below describe local function source, not confirmation
that the same source is deployed. Static source inventory and a standalone
browser-classifier regex check were performed. No network isolation control was
implemented or runtime-verified. This document does not claim whole-project
green, merge readiness or deployment readiness.

## Default runner selection and its own network request

At the inspected tree, static inventory found 329 discoverable harness files:
271 default Node harnesses and 58 browser-classified harnesses. No `play*` or
`sweep*` file was found in the default Node group at that time. These counts are
an inventory result, not a list of executed checks.

- `scripts/runAllSims.mjs:57`: `needsBrowser` reads the top-level file and applies
  a regex looking for Playwright import syntax.
- `scripts/runAllSims.mjs:69`: discovery includes matching `sim*`, `play*` and
  `sweep*` `.mjs` files. Lines 79 and 80 divide the chosen files into groups.
- `scripts/runAllSims.mjs:108`: each harness starts in a new Node process. The
  runner copies its environment but does not forward `process.execArgv`.
- `scripts/runAllSims.mjs:190`: `databaseReachable` reads the real Supabase
  constants and performs a REST GET. Its call at line 217 happens before the
  harness pool at line 223. `DB_PROBE=unreachable` bypasses this one request but
  does not prevent any harness request.
- `scripts/runAllSims.mjs:225`: the current skip rule depends on a failing
  harness printing `NOTHING WAS CHECKED` and the database probe being negative.
  It is not a network-denial policy. A harness can catch an error and report
  success, so offline execution needs independent blocked-request accounting.
- `scripts/runAllSims.mjs:254`: browser mode starts a local server and later
  launches the browser harnesses. Serving the page locally does not prevent its
  application bundle from contacting external services.

The browser classifier is an execution convenience, not a security boundary.
The standalone regex check recognized `import { chromium } from 'playwright'`
but did not recognize `await import('playwright')`, `require('playwright')` or
`import { launch } from './browserHelper.mjs'`. The last form can load Playwright
transitively. A script could also spawn a browser without a direct import.
No current misclassified browser launch was established by this audit.

## Direct production table-write attempts

These are actual request paths in the default scripts, not merely write-capable
APIs imported by an otherwise read-only test.

| Source anchor | Behavior and risk |
| --- | --- |
| `scripts/simPublicWrites.mjs:69` | The `post` helper reads the real project constants and POSTs rows with the public key. The default checks attempt 11 writes: eight bounded tables, two daily tables and `game_score_caps`. They expect rejection, but an accepted probe can insert a row if the tested protection regresses. |
| `scripts/simPublicWrites.mjs:110` | The optional `PUBWRITES_CONTROL=unbounded` adds an insert into deliberately unbounded `cbb_scores`. This is a live mutation control, not suitable for an offline or no-write session. |
| `scripts/simLeaderboardCaps.mjs:246` | Separately POSTs `game_score_caps` with `game: 'anon-write-probe'`. Its failure message explicitly says an accepted row needs manual deletion. |

Excluding only `simPublicWrites` leaves the second table probe and the validator
paths below in the default group. Invalid input is not a write-prevention
mechanism when the purpose of the check is to discover that validation broke.

## Validator calls and indirect writes

`scripts/simValidatorCache.mjs:92` POSTs to
`football-connect4-validate`. Its coverage probes use `cacheOnly`, but local
`supabase/functions/football-connect4-validate/index.ts:301` upserts newly
determined facts into `ai_validation_cache` before the `cacheOnly` check at
line 321. The flag prevents the AI fallback on a miss, not all cache writes.
The same function has another cache upsert at line 511.

`scripts/simAnswerFromRecords.mjs:38` calls several deployed validator endpoints
without a `cacheOnly` flag. Local function source includes these cache writes:

- `supabase/functions/validate-player/index.ts:266`, `:306` and `:371`.
- `supabase/functions/soccer-grid-validate/index.ts:349`, `:356` and `:433`.
- `supabase/functions/college-grid-validate/index.ts:221` and `:289`.

Some cases can also reach AI fallback. Whether a particular call writes depends
on data, cache state and deployed implementation. Neither a deterministic
answer nor an endpoint name establishes read-only behavior. The audit did not
establish cache writes for every other chain validator.

The static inventory found explicit production POST sites in 14 default
scripts. This is a lower bound on direct request sites, not an exhaustive
inventory of indirect network activity through imported app code.

| Category | Script and request anchor |
| --- | --- |
| Direct table probe | `scripts/simPublicWrites.mjs:70` |
| Direct table probe | `scripts/simLeaderboardCaps.mjs:246` |
| Validator probe | `scripts/simAnswerFromRecords.mjs:38` |
| Validator probe | `scripts/simChainFailClosed.mjs:164` |
| Validator probe | `scripts/simCollegeGridFromData.mjs:128` and `:140` |
| Validator probe | `scripts/simConnect4ClubRecords.mjs:244` |
| Validator probe | `scripts/simNascarChainSpans.mjs:134` and `:151` |
| Validator probe | `scripts/simNbaChainNames.mjs:140` |
| Validator probe | `scripts/simSoccerGridLabels.mjs:176` and `:218` |
| Validator probe | `scripts/simUnboundedSelects.mjs:151` |
| Validator probe | `scripts/simValidatorCache.mjs:92` |
| RPC reader | `scripts/simAdminAccess.mjs:97`, `has_role` |
| RPC reader | `scripts/simLeaderboardCache.mjs:65`, leaderboard/rank RPCs |
| RPC reader | `scripts/simMostPlayed.mjs:60`, most-played RPC helper |

The three RPC entries are reader calls in these tests. A POST is not itself
proof of a write. Conversely, an HTTP-method allowlist cannot prove semantic
read-only behavior for arbitrary RPCs or edge functions. The proposed offline
boundary avoids depending on those semantics by denying external requests.

## Why a global fetch preload is insufficient

An early fetch hook would intercept the direct fetch sites above and ordinary
Supabase REST calls using the default SDK transport. Installed
`@supabase/supabase-js/src/lib/fetch.ts` delegates to the supplied custom fetch
or global fetch. That is useful coverage, not full enforcement.

1. **Process inheritance is not automatic.** The runner does not forward CLI
   preload flags. Many harnesses spawn Node or Vitest again, including
   `scripts/simSeedRandom.mjs:35` and `scripts/simFootleStorage.mjs:123`.
   Installed `vitest/dist/chunks/coverage.DfSpMS-b.js:3336` filters
   `process.execArgv` to selected profiling flags, although its worker
   environment spreads `process.env` at line 3346. An inherited `NODE_OPTIONS`
   preload is a candidate for Node descendants, but both fork and worker
   coverage need executable proof. Editing only the default Vitest setup would
   miss wrappers with their own generated configuration.
2. **Other Node transports exist.** Installed
   `jsdom/lib/jsdom/living/helpers/http-request.js:2` and `:3` import `http` and
   `https`, and line 100 calls the selected request implementation. jsdom XHR
   and resource requests need not use global fetch. Installed
   `@supabase/realtime-js/src/RealtimeClient.ts:220` and `:224` open a transport
   or WebSocket. These are available bypass paths; this audit did not establish
   current external writes through jsdom or Realtime.
3. **Fetch is intentionally replaceable in real tests.** Some harnesses install
   synthetic fetch implementations. Others capture and forward the real one:
   `scripts/simMissingXiReach.mjs:101` captures fetch and line 107 forwards
   non-GET methods unchanged. Freezing global fetch would disrupt legitimate
   mocks, while a replaceable global is not a complete network boundary.
4. **Native and shell children are outside a JavaScript hook.** Many harnesses
   compile with esbuild via shell commands. For example,
   `scripts/simMissingXiReach.mjs:95` and `scripts/simWc2026Results.mjs:98`.
   `scripts/simBrand.mjs:167` probes Python and subsequently runs the logo
   generator. Other harnesses invoke Git. No current curl or shell HTTP write
   was established, but these processes do not inherit a Node fetch hook.
   Allowing an unrestricted shell is not equivalent to allowing only a known
   compiler invocation.
5. **Browsers have their own network stack.** A preload in the driver cannot
   enforce request blocking in the browser process. The classifier limitations
   also mean absence from the browser group cannot prove absence of a browser.

The inspected Node runtime was v24.14.1. Its help exposed permission controls
but no network permission switch. A Node permission flag was therefore not
established as a ready process-tree network boundary.

## Pending protection, not implemented

The smallest trustworthy whole-suite boundary is a dedicated isolated executor
that denies external network access for the entire descendant process tree,
including native tools and browsers. Do not implement this by changing the
shared Windows host's global firewall policy or affecting other work lanes.

A bounded follow-up could add an explicit offline runner mode that:

1. Requires that isolation boundary and fails closed when it is unavailable.
2. Skips the runner's own production database probe.
3. Records blocked or network-dependent checks as unverified, separately from
   passing assertions. A caught request denial and exit code zero must not
   become a clean whole-suite result.
4. Keeps browser execution out of the initial scope unless its native process
   tree receives the same protection.

A JavaScript preload can provide early rejection and useful diagnostics as
defense in depth. A fetch-only implementation must not be advertised as full
offline or read-only protection. In the absence of reliable isolation, keep the
broad suite unlaunched and use explicitly mocked, bounded checks. A source
allowlist alone is not protection against a newly introduced network path.

## Proposed synthetic negative controls

This is a test design proposal, not implemented or executed coverage.

- Create a unique OS temp directory. Resolve and validate its exact parent and
  expected prefix before cleanup. Use only synthetic credentials and endpoints,
  never real project constants or accounts.
- Run a synthetic request collector outside the protected child boundary. Give
  it a test-only address reachable in the unprotected control and denied in the
  protected run. Its placement must match the chosen executor; loopback inside
  a separate network namespace is not the parent's collector.
- Exercise fetch including a `Request` object, SDK REST and function invocation,
  HTTP/HTTPS, a redirect to a denied destination, jsdom XHR, WebSocket, a Node
  descendant, Vitest forks/workers and one native child. Add a real browser
  transport case only if browser support is in scope.
- For each path, assert zero collector receipts while protected. Remove only
  the relevant protection in an isolated source control and require exactly the
  named synthetic receipt. Assert that the control anchor exists and that the
  source mutation actually changed it.
- Include a child that catches a denied request and exits zero. Independent
  accounting must still produce a blocked/unverified result. Include missing
  preload inheritance and absent-isolation cases that fail before production
  probes or harness execution can begin.
- Exercise dynamic Playwright import and transitive-helper classification with
  synthetic fixtures. Classification must never be the final network boundary.
- Require exact expected assertion failures for each control. Import failures,
  syntax errors, unrelated exceptions, extra receipts or additional assertion
  failures do not count as a successful negative control.

Until those controls demonstrate the actual chosen executor and all allowed
descendant paths, reliable offline whole-suite execution remains pending.
