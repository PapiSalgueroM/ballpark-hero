/* ─── Round 90: stop serving stale builds to returning players ───
   He shipped fixes, reloaded douknowball.com, and still saw the OLD page:
   his browser had index.html cached, so it kept requesting the previous
   content-hashed JS chunks even though the new ones were live. Every
   returning player hits this after any deploy, which means bug fixes look
   like they never happened.

   The asset files are content-hashed and safe to cache forever; only
   index.html must stay fresh. This checks the live index.html when the tab
   regains focus, compares the main module script it points at against the
   one this page actually booted with, and reloads once if the build moved on.

   Loop safety, which matters more than the feature: we only ever reload for
   a given filename ONCE per tab (sessionStorage), we never reload within the
   first 10 seconds of a page load, and any network or parse failure is
   swallowed and simply does nothing. */

const SEEN_KEY = 'dukb-reloaded-for';
const MIN_AGE_MS = 10_000;
const MIN_GAP_MS = 60_000;

let lastCheck = 0;
const bootedAt = Date.now();

/** The hashed entry script this page is actually running. */
function currentEntry(): string | null {
  const el = document.querySelector<HTMLScriptElement>('script[type="module"][src]');
  if (!el) return null;
  const m = el.src.match(/[^/]+\.js(?:\?.*)?$/);
  return m ? m[0].split('?')[0] : null;
}

async function liveEntry(): Promise<string | null> {
  // Cache-busted so we read what the CDN is serving right now, not our copy.
  const res = await fetch(`/?fresh=${Date.now()}`, { cache: 'no-store' });
  if (!res.ok) return null;
  const html = await res.text();
  const m = html.match(/src="\/assets\/(index-[A-Za-z0-9_-]+\.js)"/);
  return m ? m[1] : null;
}

async function check(): Promise<void> {
  try {
    if (Date.now() - bootedAt < MIN_AGE_MS) return;
    if (Date.now() - lastCheck < MIN_GAP_MS) return;
    lastCheck = Date.now();

    const mine = currentEntry();
    const live = await liveEntry();
    if (!mine || !live || mine === live) return;

    // Only ever reload once per new build, per tab.
    let seen: string | null = null;
    try { seen = sessionStorage.getItem(SEEN_KEY); } catch { return; }
    if (seen === live) return;
    try { sessionStorage.setItem(SEEN_KEY, live); } catch { return; }

    window.location.reload();
  } catch {
    /* offline, blocked, or odd hosting: never break the page over this */
  }
}

/** Wire the freshness check. Safe to call once at startup. */
export function watchForNewBuild(): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void check();
  });
  window.addEventListener('focus', () => void check());
  reloadOnStaleChunk();
}

/* ─── Round 667: a stale lazy chunk reloads the page, once, instead of breaking it ───
   The focus check above only runs when a tab comes BACK. A tab that stays open
   across a deploy keeps its old entry bundle, and the first time that bundle
   asks for a lazily loaded chunk (Club Manager's tactics and board panels,
   every route level page) the old hashed filename is gone from the host, the
   import rejects, React throws, and RouteErrorBoundary paints "This page
   broke" with "Back to the games" as its first button. Two players reported
   exactly that in the days after the 2026-09-22 deploy: one that changing a
   tactic in Club Manager "sends me to the home screen", one that Soccer
   Career "says it broke and the advance buttons stop working". Nothing in
   either game navigates home; the boundary does.

   Vite fires vite:preloadError on the window when a dynamic import fails.
   Cancelling the event stops the throw, and one reload picks up the new
   index.html and its chunks. The same loop guard as check(): at most one
   reload per tab for this reason, ever, so a host that is genuinely down
   shows the boundary on the second failure rather than spinning. */
const STALE_KEY = 'dukb-reloaded-stale-chunk';

export function isStaleChunkError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : typeof err === 'string' ? err : '';
  return /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Unable to preload CSS/i.test(msg);
}

/** True when this call performed the reload, so a caller can stop rendering. */
export function reloadOnceForStaleChunk(): boolean {
  /* Never under the prerenderer. It hands every route the built bundle, so a
     chunk cannot be stale there, and a reload mid capture would leave it
     waiting on a document that was just replaced. The flag is the one the
     404 marker in index.html already honours. */
  if ((window as unknown as { __DUKB_PRERENDER__?: boolean }).__DUKB_PRERENDER__) return false;
  try {
    if (sessionStorage.getItem(STALE_KEY) === '1') return false;
    sessionStorage.setItem(STALE_KEY, '1');
  } catch {
    return false;
  }
  window.location.reload();
  return true;
}

/* Round 832 review: a "Try again" after a lazy chunk failed has to reload.
   Chromium keeps a dynamic import that failed as failed for the life of the
   page (the module map holds the failure), so calling import() again rejects
   at once without asking the network, and a retry button that only does that
   is dead in Chrome however good the connection gets. A new page fetches the
   chunk afresh. Only when the player asks (never on its own, so it cannot
   loop), never when the browser says it is offline (a reload then lands on the
   browser's own offline page instead of our notice), never under the
   prerenderer. True when it reloaded. */
export function reloadToRetryChunk(): boolean {
  if (typeof window === 'undefined') return false;
  if ((window as unknown as { __DUKB_PRERENDER__?: boolean }).__DUKB_PRERENDER__) return false;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return false;
  window.location.reload();
  return true;
}

/* Round 1132: a chunk the page works without. The sound kit is fetched only
   for a visitor who switched sound on, and its file name changes with every
   deploy. Reloading the page because it failed to load would restart a live
   match, or land an offline player on the browser's offline page, for a
   tick. So the listener leaves it alone: no reload, and no cancel either,
   so the import rejects and src/lib/sound.ts goes quiet for the tab.
   The build names the chunk after its file, src/lib/soundKit.ts, and
   scripts/simSound.mjs holds the file there. Known limit: WebKit's message
   for a failed import names no file, so there this chunk is still treated
   like any other and the tab reloads once. */
export function isOptionalChunkError(payload: unknown): boolean {
  const msg = payload instanceof Error ? payload.message : typeof payload === 'string' ? payload : '';
  return /\/soundKit-[\w-]+\.js/.test(msg);
}

function reloadOnStaleChunk(): void {
  window.addEventListener('vite:preloadError', (event: Event) => {
    if (isOptionalChunkError((event as Event & { payload?: unknown }).payload)) return;
    if (reloadOnceForStaleChunk()) event.preventDefault();
  });
}
