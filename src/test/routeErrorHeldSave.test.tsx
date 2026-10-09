/**
 * Round 1144 review: the route boundary and a save a game was holding.
 *
 * A US career whose save the browser refused keeps it in the open page for
 * the player's Retry, and names it to the storage seam so no reload the app
 * makes throws it away. But when an error reaches the route boundary the game
 * is unmounted, and the save it was holding is gone with it. The first cut of
 * the round still refused the stale chunk reload there, for the sake of a
 * save that no longer existed: a chunk failing inside the board painted
 * "This page broke" where, before the round, one reload gave a working page.
 * And the screen said the save "is still on this device" either way.
 *
 * Held here: the boundary gives each waiting save one last retry, lets go of
 * the hold, and then the reload goes ahead; and when a save was still refused
 * the screen says the latest changes did not make it.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { RouteErrorBoundary } from '@/components/RouteErrorBoundary';
import { hasPendingSaves, holdPendingSave } from '@/lib/safeStorage';

const reload = vi.fn();
function Thrower({ error }: { error: Error }): never { throw error; }
const STALE = new Error('Failed to fetch dynamically imported module: https://douknowball.com/assets/FarewellCard-abc123.js');
const BUG = new Error('Cannot read properties of undefined (reading "seasons")');
const lost = () => document.querySelector('[data-dukb-unsaved-lost]');
const broke = () => (document.body.textContent ?? '').includes('This page broke');
const mount = (error: Error) => render(<RouteErrorBoundary resetKey="/nba-my-career"><Thrower error={error} /></RouteErrorBoundary>);

beforeEach(() => {
  window.sessionStorage.clear();
  reload.mockClear();
  vi.stubGlobal('location', { ...window.location, reload });
  /* React and the boundary both log a caught error: that is the point of them, not noise worth reading here */
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('the route boundary lets go of a save the game under it was holding', () => {
  it('a chunk that fails inside a game with a refused save: one last retry, then the reload goes ahead', () => {
    const retry = vi.fn(() => false);
    const release = holdPendingSave(retry);
    mount(STALE);
    expect(retry).toHaveBeenCalledTimes(1);
    expect(hasPendingSaves()).toBe(false);
    expect(reload).toHaveBeenCalledTimes(1);
    expect(window.sessionStorage.getItem('dukb-reloaded-stale-chunk')).toBe('1');
    release();
  });

  it('a page that broke for its own reasons over a refused save says the latest changes did not make it', () => {
    const retry = vi.fn(() => false);
    const release = holdPendingSave(retry);
    mount(BUG);
    expect(broke()).toBe(true);
    expect(retry).toHaveBeenCalledTimes(1);
    expect(reload).not.toHaveBeenCalled();
    expect(lost()).not.toBeNull();
    expect(lost()!.textContent).toContain('had not been saved yet');
    /* the line that was there before still is: what was saved earlier is untouched */
    expect(document.body.textContent).toContain('still on this device');
    release();
  });

  it('says nothing of the kind when that last retry goes through, or when nothing was waiting', () => {
    const retry = vi.fn(() => true);
    const release = holdPendingSave(retry);
    mount(BUG);
    expect(broke()).toBe(true);
    expect(retry).toHaveBeenCalledTimes(1);
    expect(lost()).toBeNull();
    release();
    cleanup();
    mount(BUG);
    expect(broke()).toBe(true);
    expect(lost()).toBeNull();
  });
});
