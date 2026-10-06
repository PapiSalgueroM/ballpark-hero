/**
 * Round 832: each era's squads load with the era.
 *
 * The three era bakes left the engine chunk and are fetched when an era is
 * picked or an era save is opened. That moves one risk onto the boot: an era
 * save opened before its squads have arrived. loadCareer reads a failure in
 * its repairs as "no save", so a boot that called it too early could offer a
 * fresh start over the player's career, and the next write would replace it;
 * and when its repairs happen not to read the squads it hands the career
 * back, and the first screen that does read them throws (the review measured
 * the second on a 2005, a 2010 and a 2015 save).
 *
 * This renders the REAL hook in a fresh module instance (vi.resetModules), so
 * no era is loaded when it boots, exactly like a page load:
 *
 *   1. a saved 2010-11 career waits for its squads and then resumes, the
 *      same club, season, week and squad it was saved with;
 *   2. with the 2005-06 squads unreachable (offline, a dropped connection, a
 *      deploy that replaced the chunk) the boot holds: no career, no club
 *      picker, the era named in bootError for the page's retry notice, and
 *      the save on disk untouched; the retry then fetches the squads and the
 *      career resumes;
 *   3. a modern save opens on the same pass, with no era fetched at all.
 *
 * Negative control, run 2026-10-01: the hook's boot gate opened unconditionally
 * (the boot as it was before this round) and tests 1 and 2 failed, the save
 * reading as no save; test 3 stayed green. The hook was restored byte for
 * byte afterwards.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor, act } from '@testing-library/react';

vi.mock('@/lib/completions', () => ({
  recordCompletion: vi.fn(),
  recordActivity: vi.fn(),
  recordStreakDay: vi.fn(),
}));

/* Round 832 review: the page reload a retry falls back to, watched rather than
   done (jsdom cannot navigate). */
const reloadSpy = vi.hoisted(() => vi.fn(() => true));
vi.mock('@/lib/freshBuild', () => ({ reloadToRetryChunk: reloadSpy }));

const KEY = 'dukb-club-manager-save';
/* eslint-disable @typescript-eslint/no-explicit-any */
let api: any = null;

/** Writes a save in one module instance, then hands back a FRESH hook with
 *  no era loaded, which is what the next visit to the page is. */
async function saveThenReload(club: string, eraId: string): Promise<{ useHook: () => any; eras: any; saved: string; career: any }> {
  vi.resetModules();
  const cm = await import('@/lib/clubManager');
  await cm.ensureEraRosters(eraId);
  const career = cm.startCareer(club, eraId);
  expect(cm.saveCareer(career)).toBe(true);
  const saved = localStorage.getItem(KEY)!;
  vi.resetModules();
  const eras = await import('@/lib/clubManagerEras');
  const { useClubManager } = await import('@/hooks/useClubManager');
  return { useHook: useClubManager, eras, saved, career };
}

function harnessFor(useHook: () => any) {
  return function Harness() {
    api = useHook();
    return null;
  };
}

beforeEach(() => { localStorage.clear(); api = null; vi.doUnmock('@/data/clubManagerEra2005'); reloadSpy.mockClear(); });

describe('Club Manager: an era save waits for its era', () => {
  it('a 2010-11 save resumes once its squads arrive, exactly as saved', async () => {
    const { useHook, eras, career } = await saveThenReload('Barcelona', 'era2010');
    expect(eras.eraRostersLoaded('era2010')).toBe(false);
    const Harness = harnessFor(useHook);
    render(<Harness />);
    await waitFor(() => expect(api.phase).toBe('resume'), { timeout: 20000 });
    expect(eras.eraRostersLoaded('era2010')).toBe(true);
    expect(api.bootError).toBe(null);
    expect(api.career.eraId).toBe('era2010');
    expect(api.career.clubName).toBe('Barcelona');
    expect(api.career.season).toBe(career.season);
    expect(api.career.week).toBe(career.week);
    expect(api.career.squad.map((p: any) => p.name)).toEqual(career.squad.map((p: any) => p.name));
    console.log(`  2010-11 Barcelona resumed with ${api.career.squad.length} players`);
  }, 60000);

  it('with the 2005-06 squads unreachable the boot holds, keeps the save, and the retry resumes it', async () => {
    const { useHook, eras, saved } = await saveThenReload('Chelsea', 'era2005');
    /* The 2005 bake goes unreachable, the way a failed chunk fetch looks to
       the dynamic import. */
    vi.doMock('@/data/clubManagerEra2005', () => { throw new Error('Failed to fetch dynamically imported module'); });
    const Harness = harnessFor(useHook);
    render(<Harness />);
    await waitFor(() => expect(api.bootError).toBe('2005-06'), { timeout: 20000 });
    expect(api.phase).toBe('boot');
    expect(api.career).toBe(null);
    expect(eras.eraRostersLoaded('era2005')).toBe(false);
    expect(localStorage.getItem(KEY)).toBe(saved);
    console.log('  offline: the boot holds on the retry notice and the save is untouched');
    vi.doUnmock('@/data/clubManagerEra2005');
    await act(async () => { api.retryBoot(); });
    await waitFor(() => expect(api.phase).toBe('resume'), { timeout: 20000 });
    expect(api.bootError).toBe(null);
    expect(api.career.eraId).toBe('era2005');
    expect(api.career.clubName).toBe('Chelsea');
    console.log('  back online: the retry fetched the squads and the career resumed');
  }, 60000);

  /* Round 832 review: in Chromium a dynamic import that failed stays failed for
     the life of the page, so Try again calling import() again never reaches
     the network (measured on the built page: zero requests after the click,
     the career never opened; Firefox refetched). A retry that still fails
     reloads the page instead, which is a fresh fetch, and the first failure
     never reloads on its own. On the code before this check the retry only set
     the notice again and the reload was never asked for. */
  it('a retry that fails again reloads the page, the first failure does not', async () => {
    const { useHook, saved } = await saveThenReload('Chelsea', 'era2005');
    vi.doMock('@/data/clubManagerEra2005', () => { throw new Error('Failed to fetch dynamically imported module'); });
    const Harness = harnessFor(useHook);
    render(<Harness />);
    await waitFor(() => expect(api.bootError).toBe('2005-06'), { timeout: 20000 });
    expect(reloadSpy).not.toHaveBeenCalled();
    await act(async () => { api.retryBoot(); });
    await waitFor(() => expect(reloadSpy).toHaveBeenCalledTimes(1), { timeout: 20000 });
    expect(api.career).toBe(null);
    expect(localStorage.getItem(KEY)).toBe(saved);
  }, 60000);

  /* Round 832 review: the round's promise that the engine refuses a past
     season on today's squads had no check. Before this round an era with no
     world quietly answered with 2026's; a fallback put back that way would
     start a 2010-11 Barcelona with no Messi in it (he is at Inter Miami in
     the 2026 data) and write it into the save. */
  it('the engine refuses a past season before its squads arrive, and plays the real one after', async () => {
    vi.resetModules();
    const cm = await import('@/lib/clubManager');
    expect(cm.eraRostersLoaded('era2010')).toBe(false);
    expect(() => cm.startCareer('Barcelona', 'era2010')).toThrow(/not loaded yet/);
    await cm.ensureEraRosters('era2010');
    const s = cm.startCareer('Barcelona', 'era2010');
    expect(s.squad.some((p: { name: string; age: number }) => p.name === 'Lionel Messi' && p.age <= 23)).toBe(true);
  }, 60000);

  it('a modern save opens on the same pass and fetches no era', async () => {
    const { useHook, eras } = await saveThenReload('Arsenal', 'now');
    const Harness = harnessFor(useHook);
    render(<Harness />);
    await waitFor(() => expect(api.phase).toBe('resume'), { timeout: 20000 });
    expect(api.career.clubName).toBe('Arsenal');
    for (const id of ['era2005', 'era2010', 'era2015', 'era2020']) expect(eras.eraRostersLoaded(id)).toBe(false);
  }, 60000);
});
