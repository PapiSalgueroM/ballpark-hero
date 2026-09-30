/**
 * Round 745: one spelling of the current route.
 *
 * The router matches /soccer-career/ and /soccer-career to the same page, but
 * every lookup keyed on the path (the registry, the guide loader, the seo meta
 * table, the rules gate's storage key, the nav's category) compared the raw
 * location.pathname against '/soccer-career' and found nothing for the slash
 * form. Codex's Round 741 live audit measured it: /soccer-career/ dropped an
 * 11,086 character guide and all 8 FAQ questions after React mounted, and
 * /club-manager/ dropped 15,345 characters and 10 questions, while the saved
 * page the host served for the slash form carried both. Every component that
 * reads the location goes through here now, so a trailing slash (or a doubled
 * one) never changes what a page shows.
 */
export function normalizeRoutePath(pathname: string): string {
  const collapsed = pathname.replace(/\/{2,}/g, '/');
  if (collapsed.length > 1 && collapsed.endsWith('/')) return collapsed.replace(/\/+$/, '') || '/';
  return collapsed || '/';
}
