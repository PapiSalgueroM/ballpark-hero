import { useLayoutEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { CONSENT_CHANGED_EVENT, CONSENT_EFFECTIVE_CHANGED_EVENT, getEffectiveConsent } from '@/lib/consentPreferences';
import { normalizeRoutePath } from '@/lib/routePath';
import { AD_EXCLUDED_SCREEN, isPublicAdDocument, isPublicDesktopRailRoute } from './publicAdEligibility';

export function usePublicAdEligibility(mediaQuery: string): boolean {
  const { pathname, search, hash } = useLocation();
  const path = normalizeRoutePath(pathname);
  const [allowedPath, setAllowedPath] = useState<string | null>(null);

  useLayoutEffect(() => {
    if (search || hash || !isPublicDesktopRailRoute(path)) {
      setAllowedPath(null);
      return;
    }
    const media = window.matchMedia(mediaQuery);
    const check = () => setAllowedPath(media.matches && getEffectiveConsent().advertising && isPublicAdDocument() ? path : null);
    const head = new MutationObserver(check);
    head.observe(document.head, { childList: true, subtree: true, attributes: true, attributeFilter: ['href', 'content', 'name', 'rel'] });
    const screen = new MutationObserver(records => {
      for (const record of records) {
        if (record.type === 'attributes' || [...record.addedNodes, ...record.removedNodes].some(node =>
          node instanceof Element && (node.matches(AD_EXCLUDED_SCREEN) || node.querySelector(AD_EXCLUDED_SCREEN)))) {
          check();
          break;
        }
      }
    });
    screen.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-home-search-active'] });
    media.addEventListener('change', check);
    window.addEventListener(CONSENT_CHANGED_EVENT, check);
    window.addEventListener(CONSENT_EFFECTIVE_CHANGED_EVENT, check);
    check();
    return () => {
      head.disconnect();
      screen.disconnect();
      media.removeEventListener('change', check);
      window.removeEventListener(CONSENT_CHANGED_EVENT, check);
      window.removeEventListener(CONSENT_EFFECTIVE_CHANGED_EVENT, check);
    };
  }, [path, search, hash, mediaQuery]);

  return !search && !hash && allowedPath === path;
}
