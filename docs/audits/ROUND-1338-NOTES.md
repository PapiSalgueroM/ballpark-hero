# Round 1338: lazy chunks wait for the reload

Branch r1338-lazy-reload, started from origin/main d4f2c6f6, merged with origin/main ae14cf97 (Release BH).

## What changed

- NEW scripts/lib/vitePreloadWait.mjs (and its .d.mts) plus one entry in the plugins array of vite.config.ts. At build
  time it patches Vite's own dynamic import wrapper (the virtual module `\0vite/preload-helper.js`): right after
  `if (!e.defaultPrevented) { throw err; }` inside handlePreloadError it adds `return new Promise(() => {});`. So a
  failed chunk whose vite:preloadError a page listener cancelled waits, instead of resolving to undefined and making
  React throw "Cannot read properties of undefined (reading 'default')" in the instant before the reload. It fails the
  build closed when the branch is not found exactly once, when the helper is patched more than once, or when any
  emitted chunk dispatches vite:preloadError without the wait; a build with no dynamic import logs "no preload wrapper
  in this build" and passes. The build prints `[dukb] preload wrapper: a cancelled chunk error waits for the reload
  (vite 5.4.21)`.
- src/lib/freshBuild.ts: a page flag `reloadAsked`, set right after `window.location.reload()` returns inside
  reloadOnceForStaleChunk, and the stale chunk listener now cancels on it first, so a second chunk failure in a page
  whose reload is on its way waits with the first. One comment paragraph. check(), reloadToRetryChunk,
  isStaleChunkError, isOptionalChunkError and STALE_KEY are unchanged.
- src/pages/SoccerCareer.tsx line 93 only: the CareerStory loader keeps its never settling catch and loses the
  reloadToRetryChunk call inside it (no once flag: it looped on the retired screen, and under blocked storage threw away
  a career held in memory).
- No What's New entry (the lead's decision 5: nothing a player chooses).

## The minified wait, as the runner build emits it

In the entry chunk: `...i.payload=a,window.dispatchEvent(i),!i.defaultPrevented)throw a;return new Promise(()=>{})`.
The regex the plugin, simPreloadWait section 3 and the lead's live check share is WAIT_RE in
scripts/lib/vitePreloadWait.mjs, read after the helper's dispatch `new Event("vite:preloadError"`.
Head against the stock control (simPreloadWait section 4): of 562 chunk names only index-#.js differs, by the 27
characters `;return new Promise(()=>{})`.

## Proof

- scripts/simPreloadWait.mjs: 1 the real wrapper both ways (stock resolves undefined on a cancel, patched waits), 2 the
  patch is exact and the plugin fails closed (mutated helper, stripped wait, minify off, no wrapper), 3 the dist, 4 head
  against the stock control, 5 the stock control against the base built twice (with a null arm), 6 the vite.config.ts
  entry ungated and every runtime import( a plain string. Controls: stock, stockdist, extra, extrabase, noplugin,
  gated, dynamicspec.
- `node scripts/simPreloadWait.mjs --build-stock <dir>` builds the stock control dist: vite.config.ts with the
  dukb-preload-wait plugin filtered out (a real stock Vite build; a post plugin stripping the wait would trip the
  plugin's own fail closed bundle check).
- scripts/simStaleChunk.mjs section 7 (the page flag; controls nowait, flagfirst) and section 8 (no import() chain
  reloads from its own catch, the two SaveMovedNotice loaders excepted; control catchreload).
- src/test/freshBuildReloadWait.test.ts (eight cases) and src/test/freshBuildOptionalChunk.test.ts (a fresh page per
  test; line 74's assertion turned round on purpose: the second failure in the same page is now cancelled).
- scripts/playChunkReloadWait.mjs: rows A (/soccer-career cold), B (/ About chunk), C (/club-manager search part then
  guide 500 ms later), D (/ then a TAPPED Soccer Career tile) at 390 and 1280, each with a null arm as its console
  baseline; the reload's document request is held 2.5 s and the page reports itself every 100 ms through a binding
  (an evaluate from outside is refused while a navigation is pending). Control PLAY_RELOAD_WAIT_CONTROL=stock walks the
  stock control dist and must fire on every row.

## Known residuals

- RouteErrorBoundary's own reload (RouteErrorBoundary.tsx, the stale chunk branch of componentDidCatch) still paints
  "This page broke" during its reload on the rare road where the listener stood down over a refused save: the cached
  rejection rethrows on the re-render. Left alone this round, as the critic advised (item 10).
- After this round the CareerStory open tap does nothing on the roads with no reload coming (offline, a refused save,
  the tab's second failure, blocked storage): owed to the other lane, give the open mount a CentreMountBoundary.
- .github/workflows/soccer-career-save-writer.yml line 46 pins the OLD CareerStory line byte for byte; it fires only on
  a push to codex/soccer-career-save-size, so it goes red the next time that branch is pushed with main merged.

## Measured on the final source (56b049cf, merged with main ae14cf97)

- Runner results: r1338-s5a, r1338-s5b, r1338-s5c, r1338-s5d (head), r1338-s5base (base ae14cf97). All green but the
  three live database fences (red on base too, the runner blocks the database).
- Entry chunk: 49 characters over base before gzip (22 the page flag, 27 the wait); the SoccerCareer chunk 7 shorter.
- Weight rows at the tenth, base then head: four move by 0.1K (/stadium-tycoon 302.0 to 302.1, /wonderkid-factory
  275.8 to 275.9, /nfl-my-career 486.3 to 486.4, /transfer-path 377.7 to 377.8); /, /club-manager and /soccer-career
  (832.4K of 834K) unchanged; none over budget.
- Saved pages /soccer-career, /club-manager and /footle: identical on base and head.
- playChunkReloadWait: 8 of 8 rows green, waits of 2502 to 2554 ms against a 2500 ms hold; the stock control fired on
  8 of 8. playSoccerCareerBuildLazy: 3 of 3 green on head and on base, "reading 'default'" in none of the six logs.
