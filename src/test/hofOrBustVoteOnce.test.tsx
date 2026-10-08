/**
 * Round 1142 review: HoF or Bust never sends the community vote twice for
 * want of a marker.
 *
 * The daily save is the only thing that remembers a vote was cast. With
 * storage full that save used to throw before the vote was sent, so a full
 * browser sent no vote at all. The first cut of this round made the save
 * quiet, and then the vote went out while nothing remembered it: the page
 * offered the vote again on every revisit and counted the same player each
 * time. Now a vote that cannot be remembered is not sent. Under blocked
 * storage the save is kept for the visit, so the vote goes out once a visit,
 * the same as a private window.
 */
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const sent = vi.hoisted(() => ({ insert: vi.fn() }));
vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: () => undefined }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => ({
      insert: (row: unknown) => { sent.insert(row); return { then: () => undefined }; },
      select: () => ({ eq: async () => ({ data: [] }) }),
    }),
  },
}));

const NAMES = ['localStorage', 'sessionStorage'] as const;
const original = new Map<string, PropertyDescriptor | undefined>();
function denied(): never {
  throw new DOMException("Failed to read the 'localStorage' property from 'Window': Access is denied for this document.", 'SecurityError');
}
/** One page load: fresh modules, so the seam meets storage the way a real load does. */
async function pageLoad() {
  vi.resetModules();
  const { useHofOrBust } = await import('@/hooks/useHofOrBust');
  return useHofOrBust;
}

beforeEach(() => {
  for (const name of NAMES) original.set(name, Object.getOwnPropertyDescriptor(window, name));
  window.localStorage.clear();
  sent.insert.mockClear();
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  for (const name of NAMES) {
    const d = original.get(name);
    if (d) Object.defineProperty(window, name, d); else delete (window as unknown as Record<string, unknown>)[name];
  }
});

describe('the HoF or Bust community vote', () => {
  it('a browser that stores normally: sent once, and a return visit finds the vote and sends nothing', async () => {
    const first = renderHook(await pageLoad());
    expect(first.result.current.status).toBe('voting');
    await act(async () => { first.result.current.vote('hof'); });
    expect(first.result.current.status).toBe('revealed');
    expect(sent.insert).toHaveBeenCalledTimes(1);
    expect(sent.insert.mock.calls[0][0]).toMatchObject({ vote: 'hof' });
    first.unmount();
    const again = renderHook(await pageLoad());
    expect(again.result.current.status).toBe('revealed');
    expect(again.result.current.userVote).toBe('hof');
    expect(sent.insert).toHaveBeenCalledTimes(1);
  });

  it('storage full: the verdict and the score still show, and the vote is not sent, on this visit or the next two', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('The quota has been exceeded.', 'QuotaExceededError');
    });
    for (let visit = 0; visit < 3; visit += 1) {
      const view = renderHook(await pageLoad());
      /* nothing was kept, so the page offers the vote again: this is the revisit that used to count twice */
      expect(view.result.current.status).toBe('voting');
      await act(async () => { view.result.current.vote('bust'); });
      expect(view.result.current.status).toBe('revealed');
      expect(view.result.current.userVote).toBe('bust');
      view.unmount();
    }
    expect(sent.insert).not.toHaveBeenCalled();
  });

  it('storage blocked: kept for the visit, so sent once and not again when the page is opened a second time', async () => {
    for (const name of NAMES) Object.defineProperty(window, name, { configurable: true, get: denied });
    const useHofOrBust = await pageLoad();
    const first = renderHook(useHofOrBust);
    await act(async () => { first.result.current.vote('hof'); });
    expect(sent.insert).toHaveBeenCalledTimes(1);
    first.unmount();
    /* the same visit: the same modules and the same stand in */
    const again = renderHook(useHofOrBust);
    expect(again.result.current.status).toBe('revealed');
    expect(sent.insert).toHaveBeenCalledTimes(1);
  });

  it('unlimited mode keeps no marker and is sent as before', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('The quota has been exceeded.', 'QuotaExceededError');
    });
    const view = renderHook(await pageLoad());
    await act(async () => { view.result.current.switchToUnlimited(); });
    await act(async () => { view.result.current.vote('hof'); });
    expect(sent.insert).toHaveBeenCalledTimes(1);
  });
});
