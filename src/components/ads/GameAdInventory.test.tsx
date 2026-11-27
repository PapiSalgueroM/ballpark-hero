import { readFileSync } from 'node:fs';
import { act, fireEvent, render, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import { GameDesktopRails, isPublicDesktopRailRoute } from './GameDesktopRails';
import { GameAdInventory } from './GameAdInventory';

vi.mock('./usePublicAdEligibility', () => ({ usePublicAdEligibility: () => true }));
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

it('mounts one shared ad after the footer and excludes private, legal and unknown routes', () => {
  const app = readFileSync('src/App.tsx', 'utf8');
  expect(app.match(/<PublicFooterAd \/>/g)).toHaveLength(1);
  expect(app).toMatch(/<Footer soccerControls \/> : <Footer \/>\}\s*<PublicFooterAd \/>/);
  expect(['/', '/club-manager', '/soccer', '/records'].every(isPublicDesktopRailRoute)).toBe(true);
  expect(['/profile', '/admin', '/privacy', '/terms', '/absent'].some(isPublicDesktopRailRoute)).toBe(false);
});

it('requires 1280px of actual frame space and keeps the same game mounted through a resize', () => {
  let reportWidth: (width: number) => void;
  vi.stubGlobal('ResizeObserver', class {
    constructor(callback: ResizeObserverCallback) {
      reportWidth = width => callback([{ contentRect: { width } } as ResizeObserverEntry], this);
    }
    observe() {}
    unobserve() {}
    disconnect() {}
  });
  const view = render(<MemoryRouter><GameDesktopRails active><input aria-label="Guess" /></GameDesktopRails></MemoryRouter>);
  const input = view.getByRole('textbox');
  fireEvent.change(input, { target: { value: 'in-progress guess' } });
  const rails = () => Array.from(view.container.querySelectorAll('[data-ad-rail]'), el => el.getAttribute('data-ad-rail'));
  expect(rails()).toEqual([]);
  act(() => reportWidth(1279));
  expect(rails()).toEqual([]);
  act(() => reportWidth(1280));
  expect(rails()).toEqual(['left', 'right']);
  act(() => reportWidth(1279));
  expect(rails()).toEqual([]);
  expect(view.getByRole('textbox')).toBe(input);
  expect(input).toHaveValue('in-progress guess');
});

it('skips both game rails when a control comes within 149px of either edge', async () => {
  let left = 270, right = 1010;
  vi.spyOn(Element.prototype, 'clientWidth', 'get').mockReturnValue(1280);
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
    const side = this.getAttribute('data-rail-edge');
    const box = this.hasAttribute('data-game-play-area');
    const help = this.classList.contains('mx-auto');
    const x = side === 'right' ? 1160 : this.tagName === 'BUTTON' ? left : box ? 270 : help ? 180 : 0;
    const width = side ? 120 : this.tagName === 'BUTTON' ? right - left : box ? 740 : help ? 920 : 1280;
    const height = help ? 0 : 44;
    return { x, left: x, right: x + width, width, y: 0, top: 0, bottom: height, height } as DOMRect;
  });
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
  const view = render(<MemoryRouter initialEntries={['/footle']}><GameDesktopRails active><main><div data-game-play-area=""><button>Play</button></div><div data-testid="help" className="mx-auto max-w-4xl" /></main></GameDesktopRails></MemoryRouter>);
  const control = view.getByRole('button'), rails = () => view.container.querySelectorAll('[data-ad-rail]').length;
  expect(rails()).toBe(0);
  const help = view.getByTestId('help');
  help.className = '';
  help.setAttribute('data-seo-content', 'loading');
  expect(rails()).toBe(0);
  help.setAttribute('data-seo-content', 'ready');
  await waitFor(() => expect(rails()).toBe(2));
  left = 269;
  control.className = 'left';
  await waitFor(() => expect(rails()).toBe(0));
  left = 270;
  control.className = 'center';
  await waitFor(() => expect(rails()).toBe(2));
  right = 1011;
  control.className = 'right';
  await waitFor(() => expect(rails()).toBe(0));
  expect(view.getByRole('button')).toBe(control);
});

it('keeps all standard reservations empty and inaccessible', () => {
  const { container } = render(<GameAdInventory />);
  const inventory = container.querySelector('[data-game-ad-inventory]')!;
  expect(inventory).toHaveAttribute('aria-hidden', 'true');
  expect(inventory).toHaveAttribute('data-no-prerender');
  const slots = Array.from(inventory.querySelectorAll('[data-ad-reservation]'));
  expect(slots.map(slot => slot.getAttribute('data-ad-reservation'))).toEqual(['728x90', '300x250', '300x600', '320x50']);
  expect(slots.every(slot => slot.childNodes.length === 0)).toBe(true);
  expect(inventory.querySelector('[data-dukb-manual-ad], [data-ad-slot], .adsbygoogle, script, iframe, a, button, [tabindex]')).toBeNull();
});
