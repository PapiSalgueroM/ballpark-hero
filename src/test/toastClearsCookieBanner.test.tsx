/**
 * Round 1144: a toast anchors above the cookie banner while the banner is up.
 *
 * Measured on main at 390 wide, a first visit, a save refused: the toast sat
 * 675 to 748 and the banner 701 to 844, 47px of one over the other. The fix
 * lives in src/components/ui/sonner.tsx, which reads the banner's height off
 * the page while the document carries the banner's own mark.
 *
 * jsdom has no layout, so the banner here is a stand in with a height it is
 * told to report. What this holds is the wiring: the anchor follows the mark
 * and the height, and goes back when the mark goes. The real boxes are
 * measured in a browser by scripts/playUsCareerSaveSeam.mjs (its banner
 * check and its sitover control).
 */
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Toaster, toast } from '@/components/ui/sonner';

const RESTING = 'calc(6rem + env(safe-area-inset-bottom, 0px))';
const toaster = () => document.querySelector<HTMLElement>('[data-sonner-toaster]');
const anchor = () => ({
  phone: toaster()?.style.getPropertyValue('--mobile-offset-bottom') ?? null,
  wide: toaster()?.style.getPropertyValue('--offset-bottom') ?? null,
});
/* the mark is watched with a MutationObserver, which answers a moment later */
const settle = () => act(async () => { for (let i = 0; i < 3; i += 1) await new Promise(resolve => setTimeout(resolve, 0)); });

function banner(height: number): HTMLElement {
  const el = document.createElement('div');
  el.setAttribute('aria-label', 'Cookie choices');
  el.getBoundingClientRect = () => ({ x: 0, y: 0, top: 0, left: 0, right: 390, bottom: height, width: 390, height, toJSON: () => ({}) });
  document.body.appendChild(el);
  return el;
}

beforeEach(() => { delete document.body.dataset.consentPending; });
afterEach(() => {
  toast.dismiss();
  cleanup();
  delete document.body.dataset.consentPending;
  document.querySelectorAll('[aria-label="Cookie choices"]').forEach(el => el.remove());
});

describe('the toasts and the cookie banner', () => {
  it('rest where they always did when no banner is up', async () => {
    render(<Toaster />);
    await act(async () => { toast.error('Your latest changes could not be saved.'); });
    await settle();
    expect(toaster()).not.toBeNull();
    expect(anchor().phone).toBe(RESTING);
    /* sonner's own resting place on a wide screen, whatever it is: not ours to set */
    expect(anchor().wide).not.toMatch(/155px/);
  });

  it('anchor above the banner while it is up, by its measured height and a gap, and go back when it is answered', async () => {
    render(<Toaster />);
    await act(async () => { toast.error('Your latest changes could not be saved.'); });
    await settle();
    const wideBefore = anchor().wide;
    /* the banner comes up 143 tall and marks the document, as CookieConsent does */
    banner(143);
    await act(async () => { document.body.dataset.consentPending = '1'; });
    await settle();
    expect(anchor().phone).toBe(`max(${RESTING}, 155px)`);
    expect(anchor().wide).toBe('155px');
    /* answered: the mark goes and so does the lift */
    await act(async () => { delete document.body.dataset.consentPending; });
    await settle();
    expect(anchor().phone).toBe(RESTING);
    expect(anchor().wide).toBe(wideBefore);
  });

  it('a banner that is already up when the page mounts is cleared from the first toast', async () => {
    banner(180);
    document.body.dataset.consentPending = '1';
    render(<Toaster />);
    await act(async () => { toast.error('Your latest changes could not be saved.'); });
    await settle();
    expect(anchor().phone).toBe(`max(${RESTING}, 192px)`);
    expect(anchor().wide).toBe('192px');
  });

  it('the mark alone, with no banner on the page, lifts nothing', async () => {
    document.body.dataset.consentPending = '1';
    render(<Toaster />);
    await act(async () => { toast.error('Your latest changes could not be saved.'); });
    await settle();
    expect(anchor().phone).toBe(RESTING);
  });
});
