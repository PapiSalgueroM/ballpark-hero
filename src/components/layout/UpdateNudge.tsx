import { useEffect } from 'react';
import { toast } from 'sonner';

/**
 * Stale-build detector (Aug 2026).
 *
 * Why this exists: the owner spent a week looking at a cached pre-Aug-5 build
 * of douknowball.com while the server was already serving the fixed site. An
 * old copy of index.html in the browser's HTTP cache keeps pointing at an old
 * hashed bundle, and nothing ever tells the player the site moved on.
 *
 * What it does: every few minutes (and when the tab regains focus) it fetches
 * a fresh index.html with the cache bypassed, extracts the hashed bundle
 * filename, and compares it to the bundle this page is actually running. If
 * they differ, the site has shipped an update; show a one-time toast with a
 * Refresh button. Never auto-reloads (that could eat someone's half-finished
 * game), and never prompts twice for the same version.
 */

const CHECK_EVERY_MS = 5 * 60 * 1000;
const FIRST_CHECK_AFTER_MS = 45 * 1000;
const FOCUS_CHECK_COOLDOWN_MS = 2 * 60 * 1000;
const BUNDLE_RE = /assets\/index-[\w-]+\.js/;

function currentBundle(): string | null {
  // In the production build, the entry script is /assets/index-<hash>.js.
  // In dev it's /src/main.tsx, in which case this whole feature no-ops.
  const scripts = Array.from(document.querySelectorAll<HTMLScriptElement>('script[src]'));
  for (const s of scripts) {
    const m = s.getAttribute('src')?.match(BUNDLE_RE);
    if (m) return m[0];
  }
  return null;
}

export function UpdateNudge() {
  useEffect(() => {
    const running = currentBundle();
    if (!running) return; // dev server or unexpected markup: do nothing

    let lastCheck = 0;
    let prompted: string | null = null;

    const check = async () => {
      lastCheck = Date.now();
      try {
        const res = await fetch(`${window.location.origin}/`, { cache: 'no-store' });
        if (!res.ok) return;
        const html = await res.text();
        const fresh = html.match(BUNDLE_RE)?.[0];
        if (!fresh || fresh === running || fresh === prompted) return;
        prompted = fresh;
        toast('DoUKnowBall just got an update', {
          description: 'Refresh to load the newest version of the site.',
          duration: 30_000,
          action: {
            label: 'Refresh',
            onClick: () => window.location.reload(),
          },
        });
      } catch {
        /* offline or blocked: try again next tick, never break the app */
      }
    };

    const firstTimer = window.setTimeout(check, FIRST_CHECK_AFTER_MS);
    const interval = window.setInterval(check, CHECK_EVERY_MS);
    const onVisible = () => {
      if (document.visibilityState === 'visible' && Date.now() - lastCheck > FOCUS_CHECK_COOLDOWN_MS) {
        check();
      }
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      window.clearTimeout(firstTimer);
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  return null;
}
