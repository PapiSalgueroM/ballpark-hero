import { ALL_GAMES } from '@/data/gameRegistry';
import { normalizeRoutePath } from '@/lib/routePath';
import { HUB_NAV } from '@/lib/sportHubNav';
import { EDITORIAL_RAIL_ROUTES } from './editorialRailRoutes';

const routes = new Set([
  '/', ...ALL_GAMES.map(game => game.path), ...HUB_NAV.map(hub => hub.route), ...EDITORIAL_RAIL_ROUTES,
]);

export function isPublicDesktopRailRoute(pathname: string): boolean {
  return routes.has(normalizeRoutePath(pathname));
}

// These screens can open without changing the address.
export const AD_EXCLUDED_SCREEN = [
  '[data-home-search-active]', '#soccer-career-slots', '#nrl-save-slots',
  '[data-cm-startup]', '[data-testid="cm-slots"]', '[data-testid="cm-points"]', '[data-dukb-set-aside]',
].join(',');

export function isPublicAdDocument(): boolean {
  const path = normalizeRoutePath(location.pathname);
  if (location.search || location.hash || !isPublicDesktopRailRoute(path) || Reflect.get(window, '__DUKB_PRERENDER__')) return false;
  if (document.documentElement.hasAttribute('data-dukb-ad-load-failed')) return false;
  if (document.querySelector('meta[name="robots"][content*="noindex" i]') || document.querySelector(AD_EXCLUDED_SCREEN)) return false;
  return Array.from(document.querySelectorAll('head link[rel="canonical"]'))
    .some(link => link.getAttribute('href') === 'https://douknowball.com' + path);
}
