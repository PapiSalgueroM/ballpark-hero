import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HelmetProvider } from 'react-helmet-async';
import { MemoryRouter } from 'react-router-dom';

const importRng = vi.hoisted(() => {
  const original = Math.random, values: number[] = [];
  let state = 7391;
  Math.random = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    const value = state / 4294967296; values.push(value); return value;
  };
  return { values, restore: () => { Math.random = original; } };
});

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
import { adjustClubsForYear } from '@/lib/careerEras';
import { isSoccerCareerSave, parseSoccerCareerSave, serializeSoccerCareerSave } from '@/lib/soccerCareerSave';
import { FLAG_CODES } from '@/components/FlagImg';
import { groupByConfederation } from '@/lib/confederationGroups';
import SoccerCareer from '@/pages/SoccerCareer';
importRng.restore();

const KEY = 'soccerCareerSave', OTHER = 'segunda-creation-unrelated';
type Draw = { value: number; sites: string[] };
let draws: Draw[] = [];
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
function retain(value: unknown) {
  if (!process.env.SEGUNDA_EVIDENCE_DIR) return;
  mkdirSync(process.env.SEGUNDA_EVIDENCE_DIR, { recursive: true });
  writeFileSync(join(process.env.SEGUNDA_EVIDENCE_DIR, 'creation-ui.json'),
    JSON.stringify({ importDraws: importRng.values, value }, null, 2) + '\n');
}
const mount = () => render(<HelmetProvider><MemoryRouter><SoccerCareer /></MemoryRouter></HelmetProvider>);
function options(select: HTMLSelectElement) {
  return [...select.options].map(option => ({ value: option.value, text: option.textContent }));
}
function placement(view: ReturnType<typeof render>) {
  const label = view.queryByText('Academy Placement');
  if (!label) return null;
  const card = label.parentElement!;
  const row = [...card.querySelectorAll('div')].find(node =>
    node.className.includes('font-bold') && / Youth$/.test(node.textContent!.trim()));
  if (!row) return null;
  const own = [...row.childNodes].filter(node => node.nodeType === Node.TEXT_NODE).map(node => node.textContent).join('').trim();
  return { name: own.replace(/ Youth$/, ''), text: card.textContent, html: card.outerHTML };
}
function storage() {
  return Object.fromEntries(Object.keys(localStorage).sort().map(key => [key, localStorage.getItem(key)]));
}
function openForm(name: string, nationality: string, year: string) {
  const view = mount();
  expect(view.getByText('Create Your Player')).toBeInTheDocument();
  fireEvent.change(view.getByLabelText('Player Name'), { target: { value: name } });
  const selects = [...view.container.querySelectorAll('select')];
  expect(selects).toHaveLength(3);
  for (const [index, value] of [nationality, 'CM', year].entries())
    fireEvent.change(selects[index], { target: { value } });
  fireEvent.click(view.getByRole('button', { name: /Generate Starting Potential/ }));
  act(() => { vi.advanceTimersByTime(1200); });
  return { view, selects };
}
function readSaved() {
  const raw = localStorage.getItem(KEY);
  const parsed = raw === null ? null : parseSoccerCareerSave(raw);
  return { raw, parsed, valid: isSoccerCareerSave(parsed) };
}

beforeEach(() => {
  localStorage.clear(); localStorage.setItem(OTHER, 'untouched'); vi.clearAllMocks(); vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-11-05T00:00:00Z')); draws = [];
  vi.spyOn(Math, 'random').mockImplementation(() => {
    const sites = (new Error().stack ?? '').split('\n').filter(line =>
      /[\\/]src[\\/]/.test(line) && !/[\\/]src[\\/]test[\\/]/.test(line))
      .map(line => line.trim().replace(/.*[\\/]src[\\/]/, 'src/').replace(/\\/g, '/').replace(/:\d+:\d+/g, ''));
    draws.push({ value: 0.35, sites }); return 0.35;
  });
  vi.stubGlobal('requestAnimationFrame', () => 1); vi.stubGlobal('cancelAnimationFrame', () => undefined);
  vi.stubGlobal('IntersectionObserver', class { observe() {} unobserve() {} disconnect() {} });
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} }); window.scrollTo = vi.fn();
});
afterEach(() => { cleanup(); vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('Soccer Career Segunda creation bridge', () => {
  it('exposes Andorra and 2026 while retaining 2025 and starts at the shown FC Andorra academy', () => {
    const init = vi.spyOn(E, 'initCareer');
    const legacy = openForm('Segunda Old UI', 'Spain', '2025');
    const nationalityOptions = options(legacy.selects[0]), eraOptions = options(legacy.selects[2]);
    const shownOld = placement(legacy.view), oldBefore = { placement: shownOld, storage: storage(), html: legacy.view.container.innerHTML };
    fireEvent.click(legacy.view.getByRole('button', { name: /Begin Career/ }));
    const oldSaved = readSaved(), oldDraws = clone(draws);
    const old2025 = { before: oldBefore, saved: clone(oldSaved), initArgs: clone(init.mock.calls[0] ?? null), storage: storage(),
      html: legacy.view.container.innerHTML, draws: oldDraws };
    const observation: Record<string, unknown> = { scope: 'Actual page, creation controls, real constructor and persistence. Select primitive and unrelated shell/transport are mocked as in the existing creation-roll suite. This is not native pointer or keyboard proof.',
      nationalityOptions, eraOptions, old2025, hasAndorra: nationalityOptions.some(row => row.value === 'Andorra'),
      has2026: eraOptions.some(row => row.value === '2026'), has2025: eraOptions.some(row => row.value === '2025') };
    retain(observation);
    expect(oldSaved.valid).toBe(true); expect(shownOld).not.toBeNull();
    const old = oldSaved.parsed as E.CareerState;
    expect(old.seasons[0].year).toBe(2025); expect(old.academyClubName).toBe(shownOld!.name);
    expect(init).toHaveBeenCalledTimes(1); expect(localStorage.getItem(OTHER)).toBe('untouched');
    expect(adjustClubsForYear(E.FALLBACK_CLUBS, 2025).some(club => club.id === 'cm-fc-andorra')).toBe(false);
    expect(eraOptions.find(row => row.value === '2025')!.text).toContain('2025 start');
    expect(observation.hasAndorra && observation.has2026 && observation.has2025,
      'SC_SEGUNDA_CREATION_REACHABLE: the actual nationality and era controls must expose Andorra and 2026 while retaining 2025').toBe(true);
    expect(eraOptions.find(row => row.value === '2026')!.text).toBe('Current era (2026 start)');

    cleanup(); localStorage.clear(); localStorage.setItem(OTHER, 'untouched'); init.mockClear(); draws = [];
    const current = openForm('Segunda Current UI', 'Andorra', '2026');
    const shown = placement(current.view), before = { placement: shown, storage: storage(), html: current.view.container.innerHTML };
    fireEvent.click(current.view.getByRole('button', { name: /Begin Career/ }));
    const accepted = readSaved(), after = { saved: clone(accepted), initArgs: clone(init.mock.calls[0] ?? null), storage: storage(),
      html: current.view.container.innerHTML, draws: clone(draws) };
    observation.current2026 = { before, after };
    retain(observation);
    expect(shown?.name, 'SC_SEGUNDA_CREATION_REACHABLE:2026 Andorran placement').toBe('FC Andorra');
    expect(accepted.valid).toBe(true);
    const state = accepted.parsed as E.CareerState;
    const canonical = E.FALLBACK_CLUBS.find(club => club.id === 'cm-fc-andorra');
    expect(canonical).toMatchObject({ name: 'FC Andorra', country: 'Andorra', tier: 4, league: 'Segunda Division', color: '#1b458f' });
    expect(init).toHaveBeenCalledTimes(1); expect(init.mock.calls[0][7]).toBe(E.FALLBACK_CLUBS);
    expect(init.mock.calls[0][6]).toBe(2026); expect(init.mock.calls[0][12]).toBe('FC Andorra');
    expect(state).toMatchObject({ playerName: 'Segunda Current UI', nationality: 'Andorra', era: '2026',
      position: 'CM', age: 16, phase: 'youth', startingOverall: 50, overall: 50, academyClubName: 'FC Andorra',
      currentClub: 'FC Andorra Youth', currentClubCountry: 'Andorra', currentClubTier: 4, currentLeague: 'Segunda Division',
      currentClubColor: '#1b458f' });
    expect(state.seasons).toHaveLength(1); expect(state.seasons[0]).toMatchObject({ year: 2026, club: 'FC Andorra Youth', clubCountry: 'Andorra', type: 'youth' });
    expect(serializeSoccerCareerSave(state)).toBe(accepted.raw);
    expect(current.view.queryByText('Create Your Player')).toBeNull();
    expect(localStorage.getItem(OTHER)).toBe('untouched');
    expect(FLAG_CODES.Andorra).toBe('ad');
    expect(groupByConfederation(['Andorra'], value => value)[0]).toMatchObject({ conf: 'UEFA', items: ['Andorra'] });
  });
});
