/* Round 347: light mode.
 *
 * The dark palette lives directly on :root in index.css and is the site's
 * default and identity; the .light class on <html> overrides the tokens and
 * everything built on bg-background, text-foreground and friends follows.
 *
 * Two deliberate choices, both owner-facing:
 * - The default is ALWAYS dark. prefers-color-scheme is not read: the
 *   prerendered snapshots, the social image and the AdSense review all show
 *   the dark site, and a first visit must match what those promised.
 * - The choice is applied in main.tsx before React renders, so a returning
 *   light-mode player gets at most the same flash any styled page has, and
 *   nothing here touches index.html, which is frozen during the review.
 */
export type SiteTheme = 'dark' | 'light';

const KEY = 'dukb-theme';

export function storedTheme(): SiteTheme {
  try {
    return localStorage.getItem(KEY) === 'light' ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
}

export function applyTheme(theme: SiteTheme): void {
  document.documentElement.classList.toggle('light', theme === 'light');
}

export function setTheme(theme: SiteTheme): void {
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    /* storage blocked: the toggle still works for this page view */
  }
  applyTheme(theme);
}
