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
}
