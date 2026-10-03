# NHL waiver native verification

Run from the repository root after the final source is committed. Supply an
isolated archive of that same commit through `NHL_WAIVER_NATIVE_GATE` and give
the archive access to the root `node_modules`. The workflow creates that archive
immediately before these two serial commands:

```sh
NHL_WAIVER_NATIVE_GATE=/path/to/isolated/archive node scripts/qa/nhl-waiver970/prepare.mjs
node scripts/qa/nhl-waiver970/driver.mjs
```

Preparation compiles the actual Board, engine and receipt CSS from the archive.
Both the archive's source and the root's critical files are held by hashes.
The driver runs desktop keyboard, 390px touch and 320px reduced-motion touch
paths serially in one headless Chromium. Every request is fulfilled at a
synthetic loopback origin; no server or application transport is used.

Checks cover actual simulated waivers, exact engine values, save preservation,
immediate visibility, native focus, scroll, finite motion, dismissal, passive
return, refresh and one played round after roster recovery. Evidence is written
beside the fixture and retained by CI for one day. This is an isolated Board
fixture, not a full application, full season or live-site verification.
