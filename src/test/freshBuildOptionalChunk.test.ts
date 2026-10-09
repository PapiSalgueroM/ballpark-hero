/**
 * Round 1132: the sound kit is a chunk the page works without.
 *
 * A stale lazy chunk reloads the page once (Round 667). The kit must not: it
 * is only ever asked for when sound is on, and a reload for a tick would
 * restart a live match or strand an offline player. So the stale chunk
 * listener leaves a preload error that names the kit alone, with no reload
 * and no cancel, and every other chunk still reloads once per tab.
 *
 * jsdom cannot navigate, so a reload here is read two ways: the guard's own
 * once flag in sessionStorage plus the cancelled event (the listener cancels
 * only when it reloaded), and jsdom's own "not implemented: navigation"
 * report, counted.
 */
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { isOptionalChunkError, watchForNewBuild } from '@/lib/freshBuild';

const STALE_KEY = 'dukb-reloaded-stale-chunk';
const KIT_CHROMIUM = 'Failed to fetch dynamically imported module: https://douknowball.com/assets/soundKit-D1G9IZR4.js';
const KIT_FIREFOX = 'error loading dynamically imported module: https://douknowball.com/assets/soundKit-a_b-C9.js';
const OTHER = 'Failed to fetch dynamically imported module: https://douknowball.com/assets/TacticsPanel-Bq1x77Zk.js';

describe('Round 1132: which preload errors name the optional chunk', () => {
  it('the kit, as each browser that names the file words it', () => {
    expect(isOptionalChunkError(new Error(KIT_CHROMIUM))).toBe(true);
    expect(isOptionalChunkError(new Error(KIT_FIREFOX))).toBe(true);
    expect(isOptionalChunkError(KIT_CHROMIUM)).toBe(true);
  });
  it('nothing else', () => {
    expect(isOptionalChunkError(new Error(OTHER))).toBe(false);
    expect(isOptionalChunkError(new Error('Failed to fetch dynamically imported module: https://douknowball.com/assets/NotsoundKit-D1G9IZR4.js'))).toBe(false);
    expect(isOptionalChunkError(new Error('Failed to fetch dynamically imported module: https://douknowball.com/assets/soundKit.js'))).toBe(false);
    expect(isOptionalChunkError(new Error('Unable to preload CSS for /assets/index-abc.css'))).toBe(false);
    expect(isOptionalChunkError(undefined)).toBe(false);
    expect(isOptionalChunkError({ message: KIT_CHROMIUM })).toBe(false);
  });
  it('the known limit: a message that names no file is not recognised', () => {
    expect(isOptionalChunkError(new Error('Importing a module script failed.'))).toBe(false);
  });
});

describe('Round 1132: the stale chunk listener and the optional chunk', () => {
  let navigations = 0;
  beforeAll(() => { watchForNewBuild(); });
  beforeEach(() => {
    window.sessionStorage.clear();
    navigations = 0;
    vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
      if (args.some(a => String(a).includes('Not implemented: navigation'))) navigations += 1;
    });
  });
  afterEach(() => { vi.restoreAllMocks(); });

  const preloadError = (message: string): Event => {
    const event = new Event('vite:preloadError', { cancelable: true });
    (event as Event & { payload?: unknown }).payload = new Error(message);
    window.dispatchEvent(event);
    return event;
  };

  it('a kit that will not load neither reloads the page nor cancels the error', () => {
    const event = preloadError(KIT_CHROMIUM);
    expect(event.defaultPrevented).toBe(false);
    expect(window.sessionStorage.getItem(STALE_KEY)).toBeNull();
    expect(navigations).toBe(0);
  });

  it('any other chunk still reloads once per tab, and a kit error after it changes nothing', () => {
    const first = preloadError(OTHER);
    expect(first.defaultPrevented).toBe(true);
    expect(window.sessionStorage.getItem(STALE_KEY)).toBe('1');
    expect(navigations).toBe(1);
    const second = preloadError(OTHER);
    expect(second.defaultPrevented).toBe(false);
    expect(navigations).toBe(1);
    const kit = preloadError(KIT_FIREFOX);
    expect(kit.defaultPrevented).toBe(false);
    expect(navigations).toBe(1);
  });

  it('a kit error first does not use up the one reload a real stale chunk gets', () => {
    preloadError(KIT_CHROMIUM);
    const real = preloadError(OTHER);
    expect(real.defaultPrevented).toBe(true);
    expect(navigations).toBe(1);
  });
});
