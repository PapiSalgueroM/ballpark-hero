import { HUB_NAV } from '@/lib/sportHubNav';
import { normalizeRoutePath } from '@/lib/routePath';
import { EDITORIAL_RAIL_ROUTES } from './editorialRailRoutes';

const browsingPages = new Set(['/', ...HUB_NAV.map(hub => hub.route), ...EDITORIAL_RAIL_ROUTES]);
const browsingPage = (url: Pick<Location, 'search' | 'hash' | 'pathname'>) =>
  !url.search && !url.hash && browsingPages.has(normalizeRoutePath(url.pathname));

// Only transitions between public browsing pages could ever use a vignette.
// An ordinary game URL can open an existing save without a query parameter.
export function protectVignetteLinks() {
  const root = document.body;
  const current = new URL(window.location.href);
  const browsing = browsingPage(current);
  function protect(link: HTMLAnchorElement) {
    if (link.getAttribute('data-google-vignette') === 'false' || link.closest('ins.adsbygoogle, .google-auto-placed')) return;
    if (browsing && !link.hasAttribute('download') && !link.closest('[role="dialog"], [role="menu"], [data-home-search-active]')) {
      if (link.origin === current.origin && browsingPage(link) && normalizeRoutePath(link.pathname) !== normalizeRoutePath(current.pathname)) return;
    }
    link.setAttribute('data-google-vignette', 'false');
  }
  function scan(element: Element) {
    if (element instanceof HTMLAnchorElement && element.hasAttribute('href')) protect(element);
    element.querySelectorAll<HTMLAnchorElement>('a[href]').forEach(protect);
  }
  scan(root);
  const observer = new MutationObserver(changes => {
    for (const change of changes) {
      if (change.type === 'attributes' && change.target instanceof Element) scan(change.target);
      for (const node of change.addedNodes) if (node instanceof Element) scan(node);
    }
  });
  observer.observe(root, { subtree: true, childList: true, attributes: true, attributeFilter: ['href', 'data-home-search-active', 'role'] });
  return () => observer.disconnect();
}
