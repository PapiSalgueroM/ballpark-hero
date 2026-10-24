import { useEffect, useState } from 'react';
import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { BrowserRouter, useLocation } from 'react-router-dom';
import { SiteMenu } from '@/components/layout/SiteMenu';

let previousHref: string;
let previousHistoryState: unknown;

function cssVisible(node: HTMLElement) {
  if (!node.isConnected) return false;
  for (let current: HTMLElement | null = node; current; current = current.parentElement) {
    const style = window.getComputedStyle(current);
    if (current.hidden || style.display === 'none'
      || style.visibility === 'hidden' || style.visibility === 'collapse') return false;
  }
  return true;
}

beforeEach(() => {
  previousHref = window.location.href;
  previousHistoryState = window.history.state;
  window.history.replaceState(null, '', '/search');
  const nativeRects = HTMLElement.prototype.getClientRects;
  // JSDOM has no layout. Only Menu triggers receive the existing host-test rect seam.
  vi.spyOn(HTMLElement.prototype, 'getClientRects').mockImplementation(function (this: HTMLElement) {
    if (!(this instanceof HTMLButtonElement) || this.getAttribute('aria-label') !== 'Open site menu')
      return nativeRects.call(this);
    return (cssVisible(this)
      ? [{ x: 0, y: 0, width: 44, height: 44, top: 0, right: 44, bottom: 44, left: 0 }]
      : []) as unknown as DOMRectList;
  });
});

afterEach(() => {
  // Finish any actual navigation-focus transaction through its public page-exit event.
  window.dispatchEvent(new Event('pagehide'));
  cleanup();
  vi.restoreAllMocks();
  window.history.replaceState(previousHistoryState, '', previousHref);
});

function delayedHost() {
  let revealHost: (() => void) | undefined;
  function Fixture() {
    const location = useLocation();
    const [arrived, setArrived] = useState(false);
    useEffect(() => { revealHost = () => setArrived(true); }, []);
    return <>
      <div data-testid="route-fallback" style={{ display: arrived ? 'none' : 'block' }}>
        <SiteMenu />
      </div>
      {arrived && location.pathname === '/free-kick'
        && <div data-testid="route-host" data-site-menu-host=""><SiteMenu mode="host" /></div>}
      {location.pathname === '/free-kick' && <main>
        <h1>Free Kick fixture destination</h1>
        <label>Destination input<input aria-label="Destination input" /></label>
      </main>}
      <button type="button">Focus control</button>
      <output data-testid="route-location" data-route-key={location.key}>
        {location.pathname + location.search + location.hash}
      </output>
    </>;
  }
  render(<BrowserRouter><Fixture /></BrowserRouter>);
  return {
    async arrive() {
      assert.equal(window.location.pathname, '/free-kick', 'MENU_ROUTE_HOST_AFTER_REAL_NAVIGATION');
      assert(revealHost, 'MENU_ROUTE_REAL_REACT_HOST_SETTER');
      await act(async () => { revealHost!(); });
      const wrapper = screen.getByTestId('route-host');
      const host = within(wrapper).getByRole('button', { name: 'Open site menu' });
      assert(host instanceof HTMLButtonElement, 'MENU_ROUTE_REAL_HOST_BUTTON');
      const fallback = screen.getByTestId('route-fallback');
      assert.equal(window.getComputedStyle(fallback).display, 'none', 'MENU_ROUTE_FALLBACK_CSS_HIDDEN');
      assert(host.isConnected && cssVisible(host) && host.getClientRects().length > 0,
        'MENU_ROUTE_ARRIVED_HOST_VISIBLE');
      assert.equal(screen.getAllByRole('button', { name: 'Open site menu' }).length, 1,
        'MENU_ROUTE_ONLY_HOST_VISIBLE');
      return host;
    },
  };
}

async function selectFreeKick() {
  const fallback = within(screen.getByTestId('route-fallback'))
    .getByRole('button', { name: 'Open site menu' });
  assert(fallback instanceof HTMLButtonElement, 'MENU_ROUTE_REAL_FALLBACK');
  assert(cssVisible(fallback) && fallback.getClientRects().length > 0,
    'MENU_ROUTE_FALLBACK_VISIBLE_BEFORE_SELECTION');
  assert.equal(screen.queryByTestId('route-host'), null, 'MENU_ROUTE_NO_EARLY_HOST');
  const beforeKey = screen.getByTestId('route-location').getAttribute('data-route-key');
  fallback.focus();
  assert.equal(document.activeElement === fallback, true, 'MENU_ROUTE_OPEN_FROM_REAL_TRIGGER_FOCUS');
  fireEvent.click(fallback);
  const dialog = await screen.findByRole('dialog', { name: 'Menu' });
  await waitFor(() => assert.equal(document.activeElement ===
    within(dialog).getByRole('heading', { name: 'Menu' }), true, 'MENU_ROUTE_REAL_SHEET_OPEN_FOCUS'));
  const field = within(dialog).getByRole('searchbox', { name: 'Find a game' });
  assert(field instanceof HTMLInputElement, 'MENU_ROUTE_ACTUAL_FINDER_FIELD');
  fireEvent.change(field, { target: { value: 'Free Kick' } });
  const results = within(dialog).getByRole('region', { name: 'Game results' });
  const link = within(results).getAllByRole('link')
    .find(candidate => candidate.getAttribute('href') === '/free-kick');
  assert(link instanceof HTMLAnchorElement, 'MENU_ROUTE_REAL_FREE_KICK_FINDER_LINK');
  link.focus();
  assert.equal(document.activeElement === link, true, 'MENU_ROUTE_SELECTED_LINK_FOCUS_FOUNDATION');
  await act(async () => { fireEvent.click(link, { button: 0 }); });
  await waitFor(() => {
    assert.equal(window.location.pathname, '/free-kick', 'MENU_ROUTE_BROWSER_URL_CHANGED');
    assert.equal(screen.getByTestId('route-location').textContent, '/free-kick',
      'MENU_ROUTE_ROUTER_LOCATION_CHANGED');
    assert.notEqual(screen.getByTestId('route-location').getAttribute('data-route-key'), beforeKey,
      'MENU_ROUTE_REAL_LOCATION_KEY_CHANGED');
    assert.equal(screen.queryByRole('dialog', { name: 'Menu' }), null, 'MENU_ROUTE_REAL_SHEET_CLOSED');
    assert.equal(document.activeElement === fallback, true, 'MENU_ROUTE_FALLBACK_FOCUS_BEFORE_HOST_ARRIVAL');
  });
  assert.equal(screen.queryByTestId('route-host'), null, 'MENU_ROUTE_HOST_STILL_DELAYED_AFTER_CLOSE');
  assert(cssVisible(fallback), 'MENU_ROUTE_FALLBACK_STILL_VISIBLE_AFTER_CLOSE');
  return fallback;
}

function requireFocus(target: HTMLElement, marker: string) {
  assert(cssVisible(target), marker + '_CSS_VISIBLE');
  assert.equal(document.activeElement === target, true, marker);
}

function proveChangedFocusControl(target: HTMLElement, alternative: HTMLElement, marker: string) {
  alternative.focus();
  assert.equal(document.activeElement === alternative, true, marker + '_CONTROL_CHANGED_ACTUAL_FOCUS');
  assert.equal(document.activeElement !== target, true, marker + '_CONTROL_IS_EFFECTIVE');
  assert.throws(() => requireFocus(target, marker),
    { name: 'AssertionError', code: 'ERR_ASSERTION', message: new RegExp(marker) },
    marker + '_CONTROL_OWNS_NATIVE_ASSERTION');
  target.focus({ preventScroll: true });
  requireFocus(target, marker);
}

describe('Menu route focus', () => {
  it('moves focus to a delayed visible host after a real finder route selection', async () => {
    const fixture = delayedHost();
    const fallback = await selectFreeKick();
    const host = await fixture.arrive();
    assert.equal(fallback.getClientRects().length, 0, 'MENU_ROUTE_OLD_TRIGGER_NO_VISIBLE_RECT');
    await waitFor(() => requireFocus(host, 'MENU_ROUTE_DELAYED_HOST_FOCUS'));
    assert.equal(host.getAttribute('aria-expanded'), 'false', 'MENU_ROUTE_HOST_DID_NOT_OPEN_SECOND_SHEET');
    proveChangedFocusControl(host, screen.getByRole('button', { name: 'Focus control' }),
      'MENU_ROUTE_DELAYED_HOST_FOCUS');
  });

  it('keeps explicit destination input focus when the delayed host arrives', async () => {
    const fixture = delayedHost();
    const fallback = await selectFreeKick();
    const input = screen.getByRole('textbox', { name: 'Destination input' });
    assert(input instanceof HTMLInputElement, 'MENU_ROUTE_REAL_DESTINATION_INPUT');
    input.focus();
    fireEvent.pointerDown(input, { button: 0, pointerId: 1, isPrimary: true });
    requireFocus(input, 'MENU_ROUTE_EXPLICIT_INPUT_FOCUS_BEFORE_ARRIVAL');
    const host = await fixture.arrive();
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });
    assert.equal(fallback.getClientRects().length, 0, 'MENU_ROUTE_USER_INTENT_OLD_TRIGGER_HIDDEN');
    requireFocus(input, 'MENU_ROUTE_USER_FOCUS_NOT_STOLEN');
    assert.equal(host.getAttribute('aria-expanded'), 'false', 'MENU_ROUTE_USER_INTENT_HOST_STAYS_CLOSED');
    proveChangedFocusControl(input, host, 'MENU_ROUTE_USER_FOCUS_NOT_STOLEN');
  });
});
