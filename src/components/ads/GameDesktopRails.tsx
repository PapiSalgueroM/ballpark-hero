import { useEffect, useRef, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { ALL_GAMES } from '@/data/gameRegistry';
import { HUB_NAV } from '@/lib/sportHubNav';
import { CONSENT_CHANGED_EVENT, CONSENT_EFFECTIVE_CHANGED_EVENT, getEffectiveConsent } from '@/lib/consentPreferences';
import { loadGameSideRailAds } from '@/lib/consentedScripts';
import styles from './GameDesktopRails.module.css';

export const PUBLIC_DESKTOP_RAIL_ROUTES = [
  ...ALL_GAMES.map(game => game.path),
  ...HUB_NAV.map(hub => hub.route),
] as const;
const eligiblePublicRoutes: ReadonlySet<string> = new Set(PUBLIC_DESKTOP_RAIL_ROUTES);
export const isPublicDesktopRailRoute = (path: string): boolean => eligiblePublicRoutes.has(path);
const desktopRails = '(min-width: 1280px)';

function useEligibleAutoRails(active: boolean, element: React.RefObject<HTMLDivElement>) {
  const { pathname, search, hash } = useLocation();
  useEffect(() => {
    if (!active || search || hash || !isPublicDesktopRailRoute(pathname) || !element.current) return;
    if ((window as Window & { __DUKB_PRERENDER__?: boolean }).__DUKB_PRERENDER__) return;
    const media = window.matchMedia(desktopRails);
    let frame = 0;
    let started = false;
    const maybeStart = () => {
      if (started || frame || !media.matches || !getEffectiveConsent().advertising) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        if (!media.matches || !getEffectiveConsent().advertising ||
            window.location.pathname !== pathname || window.location.search || window.location.hash) return;
        const canonicals = [...document.querySelectorAll<HTMLLinkElement>('head link[rel="canonical"]')];
        if (!canonicals.some(link => link.getAttribute('href') === 'https://douknowball.com' + pathname)) return;
        if (element.current && loadGameSideRailAds(element.current)) {
          started = true;
          observer.disconnect();
        }
      });
    };
    const observer = new MutationObserver(maybeStart);
    observer.observe(document.head, { subtree: true, childList: true, attributes: true, attributeFilter: ['content', 'href'] });
    media.addEventListener('change', maybeStart);
    window.addEventListener(CONSENT_CHANGED_EVENT, maybeStart);
    window.addEventListener(CONSENT_EFFECTIVE_CHANGED_EVENT, maybeStart);
    maybeStart();
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      media.removeEventListener('change', maybeStart);
      window.removeEventListener(CONSENT_CHANGED_EVENT, maybeStart);
      window.removeEventListener(CONSENT_EFFECTIVE_CHANGED_EVENT, maybeStart);
    };
  }, [active, element, hash, pathname, search]);
}

/** Keep the game itself and its controls out of both desktop Auto ad rails. */
export function GameDesktopRails({ active, children }: { active: boolean; children: ReactNode }) {
  const content = useRef<HTMLDivElement>(null);
  useEligibleAutoRails(active, content);
  if (!active) return children;
  return (
    <div ref={content} className={styles.game} data-game-desktop-rails="" google-side-rail-overlap="false">
      {children}
    </div>
  );
}
