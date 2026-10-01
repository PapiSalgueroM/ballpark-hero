import { useLocation } from 'react-router-dom';
import { normalizeRoutePath } from '@/lib/routePath';

/** Round 745: the current route in its one spelling, trailing slash stripped.
 *  Use this, not location.pathname, wherever the path is looked up. */
export function useRoutePath(): string {
  const { pathname } = useLocation();
  return normalizeRoutePath(pathname);
}
