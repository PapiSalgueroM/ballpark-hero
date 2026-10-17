import fs from 'node:fs';
import path from 'node:path';
import { act, cleanup, fireEvent, render, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HelmetProvider } from 'react-helmet-async';
import { MemoryRouter } from 'react-router-dom';

// Unrelated shell/transport seams follow the existing page save-retry test.
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null, refreshProfile: vi.fn(), loading: false }) }));
vi.mock('@/lib/completions', async original => ({ ...(await original<Record<string, unknown>>()),
  recordCompletion: vi.fn(), recordActivity: vi.fn(), recordStreakDay: vi.fn(), getCurrentPlayerName: () => 'Roll Tester' }));
vi.mock('@/lib/badges', () => ({ getNewlyEarnedBadges: async () => [] }));
vi.mock('sonner', () => ({ toast: Object.assign(() => undefined, { success: vi.fn(), error: vi.fn(), info: vi.fn(), message: vi.fn(), dismiss: vi.fn() }) }));
vi.mock('@/integrations/supabase/client', () => {
  const chain = (): unknown => new Proxy(() => undefined, {
    get(_target, prop) {
      if (prop === 'then') return (ok: (value: unknown) => unknown) => Promise.resolve({ data: [], error: null, count: 0 }).then(ok);
      if (typeof prop === 'symbol') return undefined;
      return () => chain();
    }, apply() { return chain(); },
  });
  return { supabase: { from: () => chain(), rpc: () => chain(), functions: { invoke: async () => ({ data: null, error: null }) } },
    SUPABASE_URL: 'https://fixture.invalid', SUPABASE_PUBLISHABLE_KEY: 'fixture-public-key' };
});
vi.mock('@/components/game/GameNavbar', () => ({ GameNavbar: () => null }));
vi.mock('@/components/game/GameHelp', () => ({ GameHelp: () => null }));
vi.mock('@/components/game/PostGameStats', () => ({ default: () => null }));
vi.mock('@/components/game/ShareButtons', () => ({ default: () => null }));
vi.mock('@/components/seo/PageSeo', () => ({ default: () => null }));
vi.mock('@/components/seo/GameSeoContent', () => ({ default: () => null }));
vi.mock('@/components/auth/AuthModal', () => ({ AuthModal: () => null }));
vi.mock('@/components/soccer-career/AppearanceBuilder', () => ({ default: () => null }));
vi.mock('@/components/soccer-career/PlayerAvatar', () => ({ default: () => null }));
vi.mock('@/components/ui/select', () => ({
  Select: ({ value, onValueChange, children }: any) => <select value={value} onChange={event => onValueChange(event.target.value)}>{children}</select>,
  SelectContent: ({ children }: any) => <>{children}</>, SelectItem: ({ value, children }: any) => <option value={value}>{children}</option>,
  SelectGroup: ({ children }: any) => <>{children}</>, SelectLabel: () => null, SelectTrigger: () => null, SelectValue: () => null,
}));

import * as E from '@/lib/soccerCareerEngine';
import { attrTreeFor, defaultPhysique } from '@/lib/soccerCareerAttributes';
import { isSoccerCareerSave, parseSoccerCareerSave } from '@/lib/soccerCareerSave';
import SoccerCareer from '@/pages/SoccerCareer';

const KEY = 'soccerCareerSave', OTHER = 'creation-unrelated-save';
const raw: Record<string, unknown> = {};
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
function retain(name: string, value: unknown) {
  raw[name] = clone(value);
  if (!process.env.SC_CREATION_ROLL_RAW) return;
  const target = path.resolve(process.env.SC_CREATION_ROLL_RAW);
  fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, JSON.stringify(raw, null, 2) + '\n');
}
function saved(): E.CareerState | null {
  const bytes = localStorage.getItem(KEY); if (bytes === null) return null;
  const state = parseSoccerCareerSave(bytes); expect(isSoccerCareerSave(state)).toBe(true); return state as E.CareerState;
}
const mount = () => render(<HelmetProvider><MemoryRouter><SoccerCareer /></MemoryRouter></HelmetProvider>);
function prepare() {
  const view = mount();
  expect(view.getByText('Create Your Player')).toBeInTheDocument();
  fireEvent.change(view.getByPlaceholderText('Enter your player name...'), { target: { value: 'Roll Tester' } });
  const selects = view.container.querySelectorAll('select'); expect(selects).toHaveLength(3);
  for (const [index, value] of ['England', 'ST', '2020-24'].entries()) fireEvent.change(selects[index], { target: { value } });
  expect(begin(view)).toBeDisabled(); expect(localStorage.getItem(KEY)).toBeNull();
  return view;
}
const begin = (view: ReturnType<typeof render>) => view.getByRole('button', { name: /Begin Career/ }) as HTMLButtonElement;
function position(view: ReturnType<typeof render>, value: string) {
  fireEvent.change(view.container.querySelectorAll('select')[1], { target: { value } });
  expect(view.container.querySelectorAll('select')[1]).toHaveValue(value);
}
function roll(view: ReturnType<typeof render>) {
  const button = view.getByRole('button', { name: /Generate Starting Potential|Roll again/ });
  expect(button).toBeEnabled(); fireEvent.click(button);
}
function settle() { act(() => { vi.advanceTimersByTime(1200); }); }
function preview(view: ReturnType<typeof render>, pos: string) {
  const heading = view.queryByRole('heading', { name: 'Starting Stats' }); if (!heading) return null;
  const card = heading.parentElement!.parentElement!;
  const stats = Object.fromEntries(attrTreeFor(pos).map(family => {
    const label = within(card).getByText(family.label, { exact: true });
    const row = label.parentElement!.parentElement!;
    return [family.key, Number(row.lastElementChild!.textContent)];
  }));
  return { overall: Number(heading.parentElement!.lastElementChild!.textContent), stats };
}
function snapshot(view: ReturnType<typeof render>, pos: string) {
  return { position: view.container.querySelectorAll('select')[1]?.value ?? null,
    creating: view.queryByText('Create Your Player') !== null,
    beginDisabled: view.queryByRole('button', { name: /Begin Career/ })?.hasAttribute('disabled') ?? null,
    preview: preview(view, pos), storage: Object.fromEntries(Object.keys(localStorage).sort().map(key => [key, localStorage.getItem(key)])),
    draws: vi.mocked(Math.random).mock.results.map(result => result.value) };
}
function assertStarted(view: ReturnType<typeof render>, pos: string, shown: NonNullable<ReturnType<typeof preview>>) {
  const state = saved(); expect(state).not.toBeNull();
  expect(state!.playerName).toBe('Roll Tester'); expect(state!.nationality).toBe('England'); expect(state!.position).toBe(pos);
  expect(state!.era).toBe('2020-24'); expect(state!.age).toBe(16); expect(state!.phase).toBe('youth');
  expect(state!.startingOverall).toBe(shown.overall); expect(state!.overall).toBe(shown.overall);
  for (const [key, value] of Object.entries(shown.stats)) expect(state![key as keyof E.CareerState]).toBe(value);
  expect(state!.physique).toEqual(defaultPhysique(pos)); expect(state!.attrShape).toEqual({});
  expect(state!.potential).toBeGreaterThanOrEqual(state!.overall); expect(state!.potential).toBeLessThanOrEqual(99);
  expect(state!.seasons).toHaveLength(1); expect(state!.seasons[0].apps).toBe(0);
  expect(view.queryByText('Create Your Player')).toBeNull(); expect(localStorage.getItem(OTHER)).toBe('untouched');
  return state!;
}
beforeEach(() => {
  localStorage.clear(); localStorage.setItem(OTHER, 'untouched'); vi.clearAllMocks(); vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-16T12:00:00Z')); vi.spyOn(Math, 'random').mockReturnValue(0.52);
  vi.stubGlobal('requestAnimationFrame', () => 1); vi.stubGlobal('cancelAnimationFrame', () => undefined);
  vi.stubGlobal('IntersectionObserver', class { observe() {} unobserve() {} disconnect() {} });
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} }); window.scrollTo = vi.fn();
});
afterEach(() => { cleanup(); vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('Soccer Career creation roll belongs to its selected position', () => {
  it('creation roll preservation: a fresh settled roll starts and saves the displayed player', () => {
    const view = prepare(); roll(view); settle(); const shown = preview(view, 'ST');
    expect(shown).not.toBeNull(); expect(begin(view)).toBeEnabled();
    const before = snapshot(view, 'ST'); fireEvent.click(begin(view));
    retain('fresh-start', { before, after: snapshot(view, 'ST'), saved: saved() });
    assertStarted(view, 'ST', shown!);

  });
  it('creation roll stale settled: changing position requires a new roll before Begin Career', () => {
    const view = prepare(); roll(view); settle(); expect(preview(view, 'ST')).not.toBeNull(); expect(begin(view)).toBeEnabled();
    const before = snapshot(view, 'ST'); position(view, 'GK');
    const switched = snapshot(view, 'GK'); fireEvent.click(begin(view));
    retain('settled-position-change', { before, switched, afterPress: snapshot(view, 'GK'), saved: saved() });
    expect(switched.beginDisabled === true, 'creation roll settled position leaves Begin Career enabled without a usable preview').toBe(true);
    expect(switched.preview).toBeNull(); expect(localStorage.getItem(KEY)).toBeNull(); expect(localStorage.getItem(OTHER)).toBe('untouched');
  });
  it('creation roll stale in-flight: a previous position roll cannot publish after the switch', () => {
    const view = prepare(); roll(view); act(() => { vi.advanceTimersByTime(300); });
    expect(preview(view, 'ST')).toBeNull(); expect(begin(view)).toBeDisabled();
    const before = snapshot(view, 'ST'); position(view, 'GK'); const switched = snapshot(view, 'GK'); settle();
    const settled = snapshot(view, 'GK'); fireEvent.click(begin(view));
    retain('in-flight-position-change', { before, switched, settled, afterPress: snapshot(view, 'GK'), saved: saved() });
    expect(settled.preview === null && settled.beginDisabled === true, 'creation roll in-flight position publishes an abandoned preview').toBe(true);
    expect(localStorage.getItem(KEY)).toBeNull(); expect(localStorage.getItem(OTHER)).toBe('untouched');
  });
  it('creation roll preservation: a new position reroll starts with its displayed stats', () => {
    const view = prepare(); roll(view); settle(); position(view, 'GK'); roll(view); settle();
    const shown = preview(view, 'GK'); expect(shown).not.toBeNull(); expect(begin(view)).toBeEnabled();
    const before = snapshot(view, 'GK'); fireEvent.click(begin(view));
    retain('new-position-start', { before, after: snapshot(view, 'GK'), saved: saved() });
    const state = assertStarted(view, 'GK', shown!); expect(state.reflexes).toBeGreaterThan(state.shooting);
  });
});
