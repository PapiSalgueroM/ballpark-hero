/**
 * Round 1225 review: a new Club Manager career that is waiting for its league's
 * real fixture list.
 *
 * The review found three things in the hook's wait (confirmClub). A list that
 * failed, or was still out after eight seconds, started the career on generated
 * fixtures without a word. The wait was never cancelled, so the timer and the
 * fetch built a whole career up to eight seconds later whatever page was on
 * screen by then. And nothing tested any of it.
 *
 * This renders the REAL hook against the REAL registry. Only the data files
 * are held back: each league's file is gated, so its fetch stays out until the
 * test opens the gate or fails it. One league a test, because a list that has
 * arrived stays for the life of the module.
 *
 * How "no career was built" is seen without mocking the engine: startCareer
 * draws from Math.random hundreds of times, and nothing else in these windows
 * draws at all.
 *
 * Negative control, on a runner 2026-10-10: with src/hooks/useClubManager.ts
 * put back to the reviewed commit f238da12 every test here fails.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

vi.mock('@/lib/completions', () => ({ recordCompletion: vi.fn(), recordActivity: vi.fn(), recordStreakDay: vi.fn() }));
vi.mock('@/lib/freshBuild', async importOriginal => ({ ...(await importOriginal<typeof import('@/lib/freshBuild')>()), reloadToRetryChunk: vi.fn(() => false) }));

const gates = vi.hoisted(() => {
  const make = () => {
    let open!: () => void, fail!: () => void;
    const held = new Promise<void>((resolve, reject) => { open = resolve; fail = () => reject(new Error('the list file was refused')); });
    held.catch(() => {});
    return { held, open, fail };
  };
  return { laliga: make(), seriea: make(), eredivisie: make(), bundesliga: make(), primeira: make() };
});
vi.mock('@/data/clubManagerLaLigaFixtures2026', async importOriginal => { await gates.laliga.held; return importOriginal(); });
vi.mock('@/data/clubManagerSerieAFixtures2026', async importOriginal => { await gates.seriea.held; return importOriginal(); });
vi.mock('@/data/clubManagerEredivisieFixtures2026', async importOriginal => { await gates.eredivisie.held; return importOriginal(); });
vi.mock('@/data/clubManagerBundesligaFixtures2026', async importOriginal => { await gates.bundesliga.held; return importOriginal(); });
vi.mock('@/data/clubManagerPrimeiraFixtures2026', async importOriginal => { await gates.primeira.held; return importOriginal(); });

import { useClubManager } from '@/hooks/useClubManager';
import { eraById } from '@/lib/clubManagerEras';
import { ensureRealLeagueFixtures, realLeagueFixturesLoaded } from '@/lib/clubManagerFixtures';
import { reloadToRetryChunk } from '@/lib/freshBuild';

const LABEL = eraById('now').label;
const EIGHT_SECONDS = 8000;

/** The picker as the page drives it: the club tap passes the era (that is what asks for the list), then the dugout step. */
async function tapAndConfirm(club: string) {
  localStorage.clear();
  const rendered = renderHook(() => useClubManager());
  await waitFor(() => expect(rendered.result.current.phase).toBe('clubSelect'));
  act(() => rendered.result.current.chooseClub(club, 'now'));
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
  act(() => rendered.result.current.confirmClub('now'));
  return rendered;
}
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

describe('Club Manager: a start that is waiting for its fixture list', () => {
  it('waits by name, then says the list did not load and asks, and starts on generated fixtures only when told to', async () => {
    const { result } = await tapAndConfirm('Barcelona');
    expect(result.current.phase).toBe('boot');
    expect(result.current.startWait).toEqual({ label: LABEL, failed: false });
    act(() => { vi.advanceTimersByTime(EIGHT_SECONDS - 1); });
    expect(result.current.startWait).toEqual({ label: LABEL, failed: false });
    act(() => { vi.advanceTimersByTime(1); });
    expect(result.current.startWait).toEqual({ label: LABEL, failed: true });
    expect(result.current.career).toBeNull();
    /* Try again on a list that is only slow: back to waiting, eight more seconds, no reload. */
    act(() => result.current.retryStart());
    expect(result.current.startWait).toEqual({ label: LABEL, failed: false });
    expect(reloadToRetryChunk).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(EIGHT_SECONDS); });
    expect(result.current.startWait).toEqual({ label: LABEL, failed: true });
    expect(result.current.career).toBeNull();
    act(() => result.current.startWithoutList());
    expect(result.current.phase).toBe('hub');
    expect(result.current.startWait).toBeNull();
    expect(result.current.career.clubName).toBe('Barcelona');
    expect('realLeagueFixtures' in result.current.career).toBe(false);
  });

  it('builds no career once the page has been left, neither at eight seconds nor when the list arrives', async () => {
    const { unmount } = await tapAndConfirm('Juventus');
    unmount();
    const draws = vi.spyOn(Math, 'random');
    act(() => { vi.advanceTimersByTime(EIGHT_SECONDS * 2); });
    expect(draws).not.toHaveBeenCalled();
    vi.useRealTimers();
    gates.seriea.open();
    await ensureRealLeagueFixtures('seriea-2026-27-v1');
    expect(realLeagueFixturesLoaded('seriea-2026-27-v1')).toBe(true);
    await new Promise(resolve => setTimeout(resolve, 50));
    expect(draws).not.toHaveBeenCalled();
  });

  it('a list that is refused says so at once, Try again asks for a new page, and nothing starts by itself', async () => {
    gates.eredivisie.fail();
    const { result } = await tapAndConfirm('Ajax');
    vi.useRealTimers();
    await waitFor(() => expect(result.current.startWait).toEqual({ label: LABEL, failed: true }));
    expect(result.current.career).toBeNull();
    act(() => result.current.retryStart());
    expect(reloadToRetryChunk).toHaveBeenCalledTimes(1);
    expect(result.current.startWait).toEqual({ label: LABEL, failed: true });
    act(() => result.current.startWithoutList());
    expect(result.current.phase).toBe('hub');
    expect('realLeagueFixtures' in result.current.career).toBe(false);
  });

  it('a list that turns up while the notice is on screen starts the career on it', async () => {
    const { result } = await tapAndConfirm('Bayern Munich');
    act(() => { vi.advanceTimersByTime(EIGHT_SECONDS); });
    expect(result.current.startWait).toEqual({ label: LABEL, failed: true });
    vi.useRealTimers();
    gates.bundesliga.open();
    await waitFor(() => expect(result.current.phase).toBe('hub'));
    expect(result.current.startWait).toBeNull();
    expect(result.current.career.realLeagueFixtures).toBe('bundesliga-2026-27-v1');
  });

  it('a list that arrives inside the wait starts the career on it, once', async () => {
    const { result } = await tapAndConfirm('Benfica');
    expect(result.current.startWait).toEqual({ label: LABEL, failed: false });
    vi.useRealTimers();
    gates.primeira.open();
    await waitFor(() => expect(result.current.phase).toBe('hub'));
    const career = result.current.career;
    expect(career.realLeagueFixtures).toBe('primeira-2026-27-v1');
    await new Promise(resolve => setTimeout(resolve, 50));
    expect(result.current.career).toBe(career);
    expect(result.current.startWait).toBeNull();
  });
});
