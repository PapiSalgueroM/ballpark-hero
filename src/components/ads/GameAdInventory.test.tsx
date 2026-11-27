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

it.each([1280, 1254])('fits the full desktop frame beside a native scrollbar at %ipx without remounting play', viewport => {
  const frameWidth = viewport - 15;
  vi.stubGlobal('innerWidth', viewport);
  vi.spyOn(document.documentElement, 'clientWidth', 'get').mockReturnValue(frameWidth);
  const media = window.matchMedia('(hover: hover)');
  vi.spyOn(window, 'matchMedia').mockReturnValue({ ...media, matches: true });
  let reportWidth: (width: number) => void;
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
    const side = this.getAttribute('data-rail-edge');
    const x = side === 'right' ? 1160 : this.tagName === 'INPUT' ? 350 : 0;
    const width = side ? 120 : this.tagName === 'INPUT' ? 400 : 1280;
    return { left: x, right: x + width, top: 0, bottom: 2000, width, height: 2000 } as DOMRect;
  });
  vi.stubGlobal('ResizeObserver', class {
    constructor(callback: ResizeObserverCallback) {
      reportWidth ??= width => callback([{ contentRect: { width } } as ResizeObserverEntry], this);
    }
    observe() {}
    unobserve() {}
    disconnect() {}
  });
  const view = render(<MemoryRouter><GameDesktopRails active><main><input aria-label="Guess" /></main></GameDesktopRails></MemoryRouter>);
  const input = view.getByRole('textbox');
  fireEvent.change(input, { target: { value: 'in-progress guess' } });
  const rails = () => Array.from(view.container.querySelectorAll('[data-ad-rail]'), el => el.getAttribute('data-ad-rail'));
  expect(rails()).toEqual([]);
  act(() => reportWidth(frameWidth - 1));
  expect(rails()).toEqual([]);
  act(() => reportWidth(frameWidth - 1 / 3));
  expect(rails()).toEqual(['left', 'right']);
  act(() => reportWidth(frameWidth));
  expect(rails()).toEqual(['left', 'right']);
  act(() => reportWidth(frameWidth - 1));
  expect(rails()).toEqual([]);
  expect(view.getByRole('textbox')).toBe(input);
  expect(input).toHaveValue('in-progress guess');
});

it.each(['data-home-continue', 'data-home-picks'])('respects the scrollbar and clipped game cards inside %s', async shelfType => {
  let shelfLeft = 270;
  vi.spyOn(Element.prototype, 'clientWidth', 'get').mockReturnValue(1280);
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
    let x = 0, y = 0, width = 1280, height = 1800;
    const side = this.getAttribute('data-rail-edge');
    if (side) { x = side === 'right' ? 1160 : 0; width = 120; }
    if (this.hasAttribute('data-home-shelf-rail')) { x = shelfLeft; y = 300; width = 500; height = 65; }
    if (this.tagName === 'A') { x = 1060; y = 310; width = 250; height = 40; }
    return { left: x, top: y, right: x + width, bottom: y + height, width, height } as DOMRect;
  });
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
  const view = render(<MemoryRouter><GameDesktopRails active><main><section {...{ [shelfType]: '' }}>
    <div data-testid="shelf" data-home-shelf-rail="" style={{ overflowX: 'auto' }}><a data-continue-card="" href="/club-manager?slot=2">Resume slot 2</a></div>
  </section></main></GameDesktopRails></MemoryRouter>);
  const shelf = view.getByTestId('shelf'), rails = () => view.container.querySelectorAll('[data-ad-rail]').length;
  await waitFor(() => expect(rails()).toBe(2));
  shelfLeft = 269;
  fireEvent.scroll(shelf);
  await waitFor(() => expect(rails()).toBe(0));
  shelfLeft = 270;
  shelf.style.overflowX = 'visible';
  fireEvent.scroll(shelf);
  await act(() => new Promise<void>(resolve => requestAnimationFrame(() => resolve())));
  expect(rails()).toBe(0);
});

it.each(['/footle', '/soccer', '/'])('measures the controls inside wide wrappers and skips both rails inside 150px on %s', async path => {
  let left = 270, right = 1010;
  let controlTop = 400;
  let boardTop = 919;
  let guideTop = 0;
  vi.spyOn(Element.prototype, 'clientWidth', 'get').mockReturnValue(1280);
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
    const side = this.getAttribute('data-rail-edge');
    const box = this.hasAttribute('data-game-play-area');
    const help = this.classList.contains('mx-auto');
    let x = 0, y = 0, width = 1280, height = 1700;
    if (side) { x = side === 'right' ? 1160 : 0; width = 120; }
    if (box) { x = 270; width = 740; }
    if (help) { x = 180; y = guideTop; width = 920; height = 0; }
    if (this.tagName === 'BUTTON') { x = left; y = controlTop; width = right - left; height = 44; }
    if (this.tagName === 'CANVAS') { y = boardTop; width = 700; height = 320; }
    return { x, left: x, right: x + width, width, y, top: y, bottom: y + height, height } as DOMRect;
  });
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
  const view = render(<MemoryRouter initialEntries={[path]}><GameDesktopRails active><main><div data-game-play-area=""><button>Play</button></div><div data-testid="help" className="mx-auto max-w-4xl" data-seo-content="loading" /></main></GameDesktopRails></MemoryRouter>);
  const control = view.getByRole('button'), rails = () => view.container.querySelectorAll('[data-ad-rail]').length;
  expect(rails()).toBe(0);
  const help = view.getByTestId('help');
  const pendingHelp = document.createElement('span');
  pendingHelp.hidden = true;
  pendingHelp.setAttribute('data-game-help-pending', '');
  help.append(pendingHelp);
  help.setAttribute('data-seo-content', 'ready');
  await act(() => new Promise<void>(resolve => requestAnimationFrame(() => resolve())));
  expect(rails()).toBe(0);
  pendingHelp.remove();
  await waitFor(() => expect(rails()).toBe(2));
  control.focus();
  left = 269;
  control.className = 'left';
  await waitFor(() => expect(rails()).toBe(0));
  if (path === '/footle') {
    guideTop = 1100;
    fireEvent.scroll(control);
    await waitFor(() => expect(rails()).toBe(2));
    const frame = control.closest('[data-playable-route]') as HTMLElement;
    expect(parseFloat(frame.style.getPropertyValue('--rail-start'))).toBe(462);
    guideTop = 0;
  }
  left = 270;
  control.className = 'center';
  await waitFor(() => expect(rails()).toBe(2));
  right = 1011;
  control.className = 'right';
  await waitFor(() => expect(rails()).toBe(0));
  controlTop = 1200;
  control.className = 'below';
  await waitFor(() => expect(rails()).toBe(2));
  control.style.position = 'fixed';
  await waitFor(() => expect(rails()).toBe(0));
  control.style.removeProperty('position');
  await waitFor(() => expect(rails()).toBe(2));
  const board = document.createElement('canvas');
  control.after(board);
  await waitFor(() => expect(rails()).toBe(0));
  boardTop = 920;
  board.className = 'below';
  await waitFor(() => expect(rails()).toBe(2));
  boardTop = 919;
  fireEvent.scroll(window);
  await act(() => new Promise<void>(resolve => requestAnimationFrame(() => resolve())));
  expect(rails()).toBe(2);
  fireEvent.scroll(board);
  await waitFor(() => expect(rails()).toBe(0));
  boardTop = 920;
  fireEvent.scroll(board);
  await waitFor(() => expect(rails()).toBe(2));
  expect(view.getByRole('button')).toBe(control);
  expect(control).toHaveFocus();
  const menu = document.createElement('button');
  menu.setAttribute('aria-label', 'Open site menu');
  document.body.append(menu);
  try {
    menu.setAttribute('aria-expanded', 'true');
    await waitFor(() => expect(rails()).toBe(0));
    menu.setAttribute('aria-expanded', 'false');
    await act(() => new Promise<void>(resolve => requestAnimationFrame(() => resolve())));
    expect(rails()).toBe(0);
  } finally {
    menu.remove();
  }
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
