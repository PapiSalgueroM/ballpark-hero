/**
 * Release BT: Start over (Round 1569) must not leave a transient screen of the old career behind for the
 * NEXT career to open on. The board's reset() did not clear two of them until the Release BT fix:
 *   - intlResult (Round 1544, the result of a national team call just answered)
 *   - reveal (Round 186, the season curtain)
 * Each "leak" case asserts the correct behaviour (the new career does not open on the old screen); both were
 * red on 5572def49 (review rBTG-us, runner rBTG-us-b probe-head). Each "control" case takes the same path but
 * presses Continue before Start over, and must be green: it proves the test reaches the screens and reads them.
 * Unlike src/test/usCareerReports1569.test.tsx's report A case, these go past the create screen and draft the
 * next career, which is where the leak shows.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/lib/completions', () => ({ recordCompletion: vi.fn(), recordActivity: vi.fn(), getCurrentPlayerName: () => 'Tester' }));
vi.mock('@/lib/badges', () => ({ getNewlyEarnedBadges: () => Promise.resolve([]) }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null, refreshProfile: () => undefined }) }));
vi.mock('sonner', () => ({ toast: { success: () => undefined } }));

import UsCareerBoard from '@/components/us-career/UsCareerBoard';
import { NBA_CAREER_SPORT } from '@/lib/nbaCareerSport';
import { defaultAppearance } from '@/lib/soccerCareerAppearance';
import type { UsCareerCore } from '@/lib/usCareerSport';

const sport = NBA_CAREER_SPORT;

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The same throwback save src/test/usCareerIntlBoard.test.tsx uses: the first season is labelled 2003. */
function throwback(seasons: number, ovr: number): { c: UsCareerCore; tq: number } {
  const rng = mulberry32(1544);
  const pos = 'SF';
  const c = sport.startCareer('Old Career Guy', pos, sport.create.archetypes[pos][0], rng, defaultAppearance(), 'y2004');
  let tq = sport.rollTeamQuality(null, rng);
  sport.assignRole(c, tq, rng);
  for (let y = 0; y < seasons; y += 1) {
    sport.campBattle(c, tq, rng);
    sport.simSeason(c, tq, rng);
    sport.progress(c, rng);
    tq = sport.rollTeamQuality(tq, rng);
  }
  const line = c.seasons[c.seasons.length - 1];
  line.ovr = ovr;
  line.teamResult = line.teamResult === 'SUSPENDED' ? 'Missed the playoffs' : line.teamResult;
  Object.assign(c, { ovr, age: 24, health: 90, retired: false, suspendedSeasons: 0, contractYears: 3, pendingRivalryEvent: null, pendingRivalryChoice: null });
  return { c, tq };
}

const save = (c: UsCareerCore, tq: number) =>
  localStorage.setItem(sport.saveKey, JSON.stringify({ c, phase: 'season', teamQuality: tq, coach: null }));
const mount = () => render(<MemoryRouter><UsCareerBoard sport={sport} /></MemoryRouter>);
const q = (sel: string) => document.querySelector(sel) as HTMLElement | null;
const button = (text: string) => [...document.querySelectorAll('button')].find(b => b.textContent?.includes(text));
const flush = () => act(async () => { await new Promise(r => setTimeout(r, 0)); });
const text = () => (document.body.textContent ?? '').replace(/\s+/g, ' ').slice(0, 400);

async function startOverAndDraft() {
  fireEvent.click(button('Start over')!);
  await flush();
  const dialog = within(document.body).getByRole('alertdialog', { name: 'Start a new career?' });
  fireEvent.click(within(dialog).getByRole('button', { name: 'Start new career' }));
  await flush();
  await waitFor(() => expect(button('Enter the draft')).toBeTruthy());
  fireEvent.click(button('Enter the draft')!);
  await flush();
  await flush();
}

beforeEach(() => {
  localStorage.clear();
  vi.spyOn(Math, 'random').mockImplementation(mulberry32(1544));
  vi.stubGlobal('requestAnimationFrame', () => 1);
  vi.stubGlobal('cancelAnimationFrame', () => undefined);
  Object.defineProperty(Element.prototype, 'scrollIntoView', { value: () => undefined, configurable: true, writable: true });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('Start over leaves no screen of the old career behind', () => {
  it('leak-intl: Start over on the national team result, then Enter the draft', async () => {
    const { c, tq } = throwback(1, 90);
    save(c, tq);
    mount();
    await waitFor(() => expect(q('[data-intl-call]')).toBeTruthy(), { timeout: 20000 });
    fireEvent.click(q('[data-intl-answer="go"]')!);
    await waitFor(() => expect(q('[data-intl-result]')).toBeTruthy(), { timeout: 20000 });
    expect(button('Start over'), 'Round 1569 draws Start over on the result screen').toBeTruthy();
    await startOverAndDraft();
    const fresh = JSON.parse(localStorage.getItem(sport.saveKey) ?? 'null') as { c?: { name?: string; age?: number; year?: number; seasons?: unknown[]; intl?: unknown } } | null;
    console.log(`PROBE leak-intl new career on the save: ${fresh?.c?.name}, age ${fresh?.c?.age}, year ${fresh?.c?.year}, ${fresh?.c?.seasons?.length} seasons, intl ${JSON.stringify(fresh?.c?.intl ?? null)}; the screen reads: ${text()}`);
    expect(q('[data-intl-result]'), `the new career opens on the old career's national team result: ${text()}`).toBeNull();
  }, 60000);

  it('control-intl: Continue first, then Start over and Enter the draft', async () => {
    const { c, tq } = throwback(1, 90);
    save(c, tq);
    mount();
    await waitFor(() => expect(q('[data-intl-call]')).toBeTruthy(), { timeout: 20000 });
    fireEvent.click(q('[data-intl-answer="go"]')!);
    await waitFor(() => expect(q('[data-intl-result]')).toBeTruthy(), { timeout: 20000 });
    fireEvent.click(q('[data-intl-continue]')!);
    await waitFor(() => expect(q('[data-intl-result]')).toBeNull());
    await startOverAndDraft();
    expect(q('[data-intl-result]')).toBeNull();
    expect(q('[data-season-reveal]')).toBeNull();
  }, 60000);

  it('leak-curtain: Start over on the season curtain, then Enter the draft', async () => {
    const { c, tq } = throwback(1, 70);
    save(c, tq);
    mount();
    await waitFor(() => expect(button(`Play the ${c.year} season`)).toBeTruthy(), { timeout: 20000 });
    fireEvent.click(button(`Play the ${c.year} season`)!);
    await waitFor(() => expect(q('[data-season-reveal]')).toBeTruthy(), { timeout: 20000 });
    console.log(`PROBE curtain before Start over: ${text()}`);
    expect(button('Start over'), 'Round 1569 draws Start over on the curtain').toBeTruthy();
    await startOverAndDraft();
    const fresh = JSON.parse(localStorage.getItem(sport.saveKey) ?? 'null') as { c?: { name?: string; age?: number; seasons?: unknown[] } } | null;
    console.log(`PROBE leak-curtain new career on the save: ${fresh?.c?.name}, age ${fresh?.c?.age}, ${fresh?.c?.seasons?.length} seasons; the screen's curtain reads: ${(q('[data-season-reveal]')?.textContent ?? '(none)').replace(/\s+/g, ' ').slice(0, 300)}`);
    expect(q('[data-season-reveal]'), `the new career opens on the old career's season curtain: ${text()}`).toBeNull();
  }, 60000);

  it('control-curtain: Continue first, then Start over and Enter the draft', async () => {
    const { c, tq } = throwback(1, 70);
    save(c, tq);
    mount();
    await waitFor(() => expect(button(`Play the ${c.year} season`)).toBeTruthy(), { timeout: 20000 });
    fireEvent.click(button(`Play the ${c.year} season`)!);
    await waitFor(() => expect(q('[data-season-reveal]')).toBeTruthy(), { timeout: 20000 });
    fireEvent.click(button('Continue')!);
    await waitFor(() => expect(q('[data-season-reveal]')).toBeNull());
    await startOverAndDraft();
    expect(q('[data-season-reveal]')).toBeNull();
  }, 60000);
});
