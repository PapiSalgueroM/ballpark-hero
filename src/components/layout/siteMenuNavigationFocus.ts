import { focusSiteMenuTrigger } from './siteMenuFocus';

export interface MenuNavigationSelection {
  link: HTMLAnchorElement;
  fromHref: string;
  toHref: string;
}

let cancelPending: (() => void) | null = null;
const visible = (node: HTMLElement | null): node is HTMLElement => {
  if (!node?.isConnected || node.getClientRects().length === 0) return false;
  const style = window.getComputedStyle(node);
  return style.display !== 'none' && style.visibility !== 'hidden' && style.visibility !== 'collapse';
};
const openModal = () => Array.from(document.querySelectorAll<HTMLElement>(
  '[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"], dialog[open]',
)).some(visible);
const routeKey = () => typeof window.history.state?.key === 'string' ? window.history.state.key : null;

export function restoreMenuNavigationFocus(
  own: HTMLButtonElement | null,
  selection: MenuNavigationSelection,
  allowed: () => boolean,
) {
  cancelPending?.();
  const { link, fromHref, toHref } = selection;
  const active = document.activeElement;
  const closingPanel = link.closest('[role="dialog"]');
  if (!allowed() || openModal() || ![fromHref, toHref].includes(window.location.href)
    || (active !== document.body && active !== own && !closingPanel?.contains(active))) return;

  focusSiteMenuTrigger(own);
  if (new URL(fromHref).pathname === new URL(toHref).pathname
    || (document.activeElement !== own && document.activeElement !== document.body)) return;

  let arrived = window.location.href === toHref;
  let key = routeKey();
  const stop = () => {
    observer.disconnect();
    window.clearTimeout(timer);
    document.removeEventListener('focusin', focused, true);
    document.removeEventListener('pointerdown', stop, true);
    document.removeEventListener('keydown', stop, true);
    document.removeEventListener('dukb-site-menu-open', stop);
    document.removeEventListener('visibilitychange', hidden);
    window.removeEventListener('popstate', stop);
    window.removeEventListener('pagehide', stop);
    window.removeEventListener('blur', stop);
    if (cancelPending === stop) cancelPending = null;
  };
  const focused = (event: FocusEvent) => { if (event.target !== own && event.target !== document.body) stop(); };
  const hidden = () => { if (document.hidden) stop(); };
  const check = () => {
    const href = window.location.href, nextKey = routeKey(), now = document.activeElement;
    if (!allowed() || openModal() || document.hidden
      || (href !== fromHref && href !== toHref)
      || (arrived && (href !== toHref || nextKey !== key))
      || (!arrived && href === fromHref && nextKey !== key)
      || (now !== own && now !== document.body)) { stop(); return; }
    if (href === toHref && !arrived) { arrived = true; key = nextKey; }
    if (!arrived || visible(own)) return;
    const host = Array.from(document.querySelectorAll<HTMLButtonElement>(
      '[data-site-menu-host] button[aria-label="Open site menu"][aria-expanded="false"]',
    )).find(button => !button.disabled && visible(button));
    if (host) { stop(); host.focus({ preventScroll: true }); }
  };
  const observer = new MutationObserver(check);
  observer.observe(document.body, { childList: true, subtree: true, attributes: true,
    attributeFilter: ['class', 'style', 'hidden', 'aria-hidden', 'aria-modal', 'data-state'] });
  const timer = window.setTimeout(stop, 5000);
  document.addEventListener('focusin', focused, true);
  document.addEventListener('pointerdown', stop, true);
  document.addEventListener('keydown', stop, true);
  document.addEventListener('dukb-site-menu-open', stop);
  document.addEventListener('visibilitychange', hidden);
  window.addEventListener('popstate', stop);
  window.addEventListener('pagehide', stop);
  window.addEventListener('blur', stop);
  cancelPending = stop;
  check();
}
