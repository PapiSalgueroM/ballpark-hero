import { CLUB_MANAGER_ACTIVE_RESUME_QUERY } from '@/lib/clubManagerSaveKeys';
import { ALL_GAMES } from '@/data/gameRegistry';
import { normalizeRoutePath } from '@/lib/routePath';
import { HUB_NAV } from '@/lib/sportHubNav';
import { EDITORIAL_RAIL_ROUTES } from './editorialRailRoutes';

export const DESKTOP_RAIL_MEDIA = '(min-width: 1280px), (min-width: 1254px) and (hover: hover) and (pointer: fine)';

const routes = new Set([
  '/', ...ALL_GAMES.map(game => game.path), ...HUB_NAV.map(hub => hub.route), ...EDITORIAL_RAIL_ROUTES,
]);

export function isPublicDesktopRailRoute(pathname: string): boolean {
  return routes.has(normalizeRoutePath(pathname));
}

// These four manifest launch addresses carry the same fixed public marker.
const installedLaunchPages = new Set(['/', '/soccer-career', '/club-manager', '/face-off']);

export function isPublicAdAddress(path: string, search: string, hash: string): boolean {
  return !hash && isPublicDesktopRailRoute(path) &&
    (!search || (search === '?source=pwa' && installedLaunchPages.has(normalizeRoutePath(path))) ||
      (search === CLUB_MANAGER_ACTIVE_RESUME_QUERY && normalizeRoutePath(path) === '/club-manager'));
}

// These screens can open without changing the address.
export const AD_EXCLUDED_SCREEN = [
  '[data-home-search-active]', '#soccer-career-slots', '#nrl-save-slots',
  '[data-cm-startup]', '[data-cm-save-files]', '[data-testid="cm-slots"]', '[data-testid="cm-points"]', '[data-dukb-set-aside]',
].join(',');

export function isPublicAdDocument(): boolean {
  const path = normalizeRoutePath(location.pathname);
  if (!isPublicAdAddress(path, location.search, location.hash) || Reflect.get(window, '__DUKB_PRERENDER__')) return false;
  if (location.search === CLUB_MANAGER_ACTIVE_RESUME_QUERY && !document.querySelector('[data-cm-playing]')) return false;
  if (document.documentElement.hasAttribute('data-dukb-ad-load-failed')) return false;
  if (document.querySelector('meta[name="robots"][content*="noindex" i]') || document.querySelector(AD_EXCLUDED_SCREEN)) return false;
  return Array.from(document.querySelectorAll('head link[rel="canonical"]'))
    .some(link => link.getAttribute('href') === 'https://douknowball.com' + path);
}
