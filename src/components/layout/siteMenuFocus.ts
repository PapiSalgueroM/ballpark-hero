function visibleTrigger(button: HTMLButtonElement | null): button is HTMLButtonElement {
  if (!button?.isConnected || button.getClientRects().length === 0) return false;
  const style = window.getComputedStyle(button);
  return style.display !== 'none' && style.visibility !== 'hidden' && style.visibility !== 'collapse';
}

export function focusSiteMenuTrigger(own: HTMLButtonElement | null) {
  if (visibleTrigger(own)) {
    own.focus({ preventScroll: true });
    return;
  }
  const host = Array.from(document.querySelectorAll<HTMLButtonElement>(
    '[data-site-menu-host] button[aria-label="Open site menu"]',
  )).find(visibleTrigger);
  (host ?? own)?.focus({ preventScroll: true });
}
