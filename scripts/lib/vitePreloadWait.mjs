/* Round 1338: a chunk that fails to download waits for the site's one reload
   instead of answering empty.

   Vite's build wraps every dynamic import whose specifier is a plain string in
   its preload helper, a virtual module whose code is the source of Vite's own
   preload function. When the import fails, the helper's handlePreloadError
   dispatches a cancelable vite:preloadError on window and rethrows only when
   nobody cancelled it. When a listener does cancel it, the function simply
   returns, so the import RESOLVES to undefined. React's lazy then reads
   .default off undefined and the page throws "Cannot read properties of
   undefined (reading 'default')" in the instant before the reload lands.
   Read in vite 5.4.21 (package-lock.json), 5.4.19 (bun.lock, the host) and
   upstream main: all three return normally on a cancel.

   In this site only src/lib/freshBuild.ts cancels that event, and only in a
   page that has already asked for its stale chunk reload. So this plugin adds
   one statement right after the rethrow, inside handlePreloadError:
   a cancelled failure returns a promise that never settles, and "never" lasts
   until the fresh document replaces the page. A healthy import never calls
   handlePreloadError, so nothing else changes. A failed CSS dep calls it in a
   loop that ignores its result and still loads the module, as before.

   It fails the build closed: the helper was loaded but the branch was not
   found exactly once, or the helper was patched more than once, or any
   emitted chunk dispatches vite:preloadError without the wait. A build with
   no dynamic import has no helper at all; that is logged and passes.

   Proved by scripts/simPreloadWait.mjs (Vite's real wrapper run both ways,
   the dist, and the vite.config.ts entry) and scripts/playChunkReloadWait.mjs
   (the browser walk). */
import { version as viteVersion } from 'vite';

export const PRELOAD_HELPER_ID = String.fromCharCode(0) + 'vite/preload-helper.js';
export const WAIT_STATEMENT = 'return new Promise(() => {});';

/* the one branch: if (!<event>.defaultPrevented) { throw <error>; } */
const BRANCH = /if\s*\(\s*!\s*[A-Za-z_$][\w$]*\.defaultPrevented\s*\)\s*\{\s*throw\s+[A-Za-z_$][\w$]*\s*;?\s*\}/g;
/* the helper's dispatch, in source and minified form; freshBuild.ts only listens */
export const DISPATCH_RE = /new\s+Event\(\s*["'`]vite:preloadError["'`]/g;
/* the rethrow followed by the wait, braces and semicolons optional so it reads the minified form too */
export const WAIT_RE = /\.defaultPrevented\s*\)\s*\{?\s*throw\s+[A-Za-z_$][\w$]*\s*;?\s*\}?\s*;?\s*return\s*new\s+Promise\(\s*\(\s*\)\s*=>\s*\{\s*\}\s*\)/;
const REACH = 600;

export function patchPreloadHelper(code) {
  const found = [...code.matchAll(BRANCH)];
  if (found.length !== 1) {
    throw new Error(`[dukb] preload wrapper: found ${found.length} copies of "if (!<event>.defaultPrevented) { throw <error>; }" in the preload helper of vite ${viteVersion}, expected exactly one. Vite changed its wrapper: read scripts/lib/vitePreloadWait.mjs before building again.`);
  }
  const end = found[0].index + found[0][0].length;
  return code.slice(0, end) + WAIT_STATEMENT + code.slice(end);
}

/* How many places dispatch vite:preloadError, and how many of them are followed by the wait. */
export function wrapperState(code) {
  let dispatches = 0; let waits = 0; let snippet = '';
  for (const m of code.matchAll(DISPATCH_RE)) {
    dispatches++;
    const after = code.slice(m.index, m.index + REACH);
    const w = after.match(WAIT_RE);
    if (w) { waits++; if (!snippet) snippet = after.slice(0, w.index + w[0].length); }
  }
  return { dispatches, waits, snippet };
}

export function preloadWait() {
  let seen = 0; let patched = 0;
  return {
    name: 'dukb-preload-wait',
    apply: 'build',
    enforce: 'post',
    buildStart() { seen = 0; patched = 0; },
    transform(code, id) {
      if (id !== PRELOAD_HELPER_ID) return null;
      seen++;
      let out;
      try { out = patchPreloadHelper(code); } catch (e) { this.error(e.message); }
      patched++;
      return { code: out, map: null };
    },
    generateBundle(_options, bundle) {
      if (seen !== patched || patched > 1) {
        this.error(`[dukb] preload wrapper: the helper was loaded ${seen} time(s) and patched ${patched} time(s) in vite ${viteVersion}, expected one and one. Read scripts/lib/vitePreloadWait.mjs.`);
      }
      const bare = [];
      for (const file of Object.values(bundle)) {
        if (file.type !== 'chunk') continue;
        const s = wrapperState(file.code);
        if (s.dispatches !== s.waits) bare.push(file.fileName);
      }
      if (bare.length) {
        this.error(`[dukb] preload wrapper: ${bare.join(', ')} dispatch vite:preloadError without the wait (vite ${viteVersion}), so a cancelled chunk error would answer empty again. Read scripts/lib/vitePreloadWait.mjs.`);
      }
      if (!seen) console.log(`[dukb] preload wrapper: no preload wrapper in this build (vite ${viteVersion})`);
      else console.log(`[dukb] preload wrapper: a cancelled chunk error waits for the reload (vite ${viteVersion})`);
    },
  };
}
