import { useLayoutEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { CONSENT_CHANGED_EVENT, CONSENT_EFFECTIVE_CHANGED_EVENT, getEffectiveConsent } from '@/lib/consentPreferences';
import { normalizeRoutePath } from '@/lib/routePath';
import { AD_EXCLUDED_SCREEN, isPublicAdAddress, isPublicAdDocument } from './publicAdEligibility';

export function usePublicAdEligibility(mediaQuery: string): boolean {
  const { pathname, search, hash } = useLocation();
  const path = normalizeRoutePath(pathname);
  const publicAddress = isPublicAdAddress(path, search, hash);
  const address = path + search;
  const [allowedAddress, setAllowedAddress] = useState<string | null>(null);
  const home = useRef({ hadSlot: false, retired: false });
  useLayoutEffect(() => { home.current = { hadSlot: false, retired: false }; }, [path]);

  useLayoutEffect(() => {
    if (!publicAddress) {
      setAllowedAddress(null);
      return;
    }
    const media = window.matchMedia(mediaQuery);
    let watchHomeSlot = false;
    const rememberHomeSlot = () => {
      if (watchHomeSlot && document.querySelector('[data-dukb-manual-ad]')) {
        home.current.hadSlot = true;
        watchHomeSlot = false;
      }
    };
    const check = () => {
      const advertising = getEffectiveConsent().advertising;
      watchHomeSlot = path === '/' && advertising && !home.current.hadSlot;
      rememberHomeSlot();
      if (path === '/' && home.current.hadSlot && document.querySelector('[data-home-search-active]')) home.current.retired = true;
      setAllowedAddress(!home.current.retired && media.matches && advertising && isPublicAdDocument() ? address : null);
    };
    const head = new MutationObserver(check);
    head.observe(document.head, { childList: true, subtree: true, attributes: true, attributeFilter: ['href', 'content', 'name', 'rel'] });
    const screenMarkers = AD_EXCLUDED_SCREEN + ',[data-cm-playing]';
    const screen = new MutationObserver(records => {
      // Preserve the first allocation even if the publisher later reports it unfilled.
      rememberHomeSlot();
      for (const record of records) {
        if (record.type === 'attributes' || [...record.addedNodes, ...record.removedNodes].some(node =>
          node instanceof Element && (node.matches(screenMarkers) || node.querySelector(screenMarkers)))) {
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
  }, [address, path, publicAddress, mediaQuery]);

  return publicAddress && allowedAddress === address;
}
