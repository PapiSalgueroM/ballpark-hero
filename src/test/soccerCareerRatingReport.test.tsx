import fs from 'node:fs';
import path from 'node:path';
import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HelmetProvider } from 'react-helmet-async';
import { MemoryRouter } from 'react-router-dom';
import '@/components/SaveMovedNotice';

const captured = vi.hoisted(() => ({ context: null as Record<string, unknown> | null }));
// Only shell and transport seams are mocked. Engine, codec, repair, save fence and page actions remain real.
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null, refreshProfile: vi.fn(), loading: false }) }));
vi.mock('@/lib/completions', async original => ({ ...(await original<Record<string, unknown>>()),
  recordCompletion: vi.fn(), recordActivity: vi.fn(), recordStreakDay: vi.fn(), getCurrentPlayerName: () => 'Report Fixture' }));
vi.mock('@/lib/badges', () => ({ getNewlyEarnedBadges: async () => [] }));
vi.mock('sonner', () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn(), info: vi.fn(), message: vi.fn(), dismiss: vi.fn() }) }));
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
vi.mock('@/components/seo/GameSeoContent', () => ({
  default: ({ reportGameContext }: { reportGameContext?: Record<string, unknown> }) => {
    captured.context = reportGameContext ? JSON.parse(JSON.stringify(reportGameContext)) : null;
    return <output data-testid="sc-report-context">{JSON.stringify(captured.context)}</output>;
  },
}));
vi.mock('@/components/auth/AuthModal', () => ({ AuthModal: () => null }));
vi.mock('@/components/soccer-career/AppearanceBuilder', () => ({ default: () => null }));
vi.mock('@/components/soccer-career/PlayerAvatar', () => ({ default: () => null }));
vi.mock('@/components/ui/select', () => ({
  Select: ({ value, onValueChange, children }: any) => <select value={value} onChange={event => onValueChange(event.target.value)}>{children}</select>,
  SelectContent: ({ children }: any) => <>{children}</>, SelectItem: ({ value }: any) => <option value={value}>{value}</option>,
  SelectGroup: ({ children }: any) => <>{children}</>, SelectLabel: () => null, SelectTrigger: () => null, SelectValue: () => null,
}));

import * as E from '@/lib/soccerCareerEngine';
import { isSoccerCareerSave, parseSoccerCareerSave, serializeSoccerCareerSave } from '@/lib/soccerCareerSave';
import { buildReportContext } from '@/lib/reportContext';
import { recordActivity } from '@/lib/completions';
import SoccerCareer from '@/pages/SoccerCareer';

const KEY = 'soccerCareerSave', FENCE = 'dukb-fence:soccerCareerSave', OTHER = 'report-unrelated-save';
const PRIVATE = 'PRIVATE_PLAYER_SENTINEL', NEWS = 'PRIVATE_NEWS_SENTINEL', EVENT = 'PRIVATE_EVENT_SENTINEL';
const copy = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
const nativeCareer = () => E.initCareer(PRIVATE, 'England', 'CM', '2020-24',
  { pace: 75, shooting: 75, passing: 75, dribbling: 75, defending: 75, physical: 75, reflexes: 75 },
  98, 2020, E.FALLBACK_CLUBS, null, 99);
function read(): E.CareerState {
  const state = parseSoccerCareerSave(localStorage.getItem(KEY)!);
  expect(isSoccerCareerSave(state), 'SC_REPORT_SETUP_VALID_CODEC').toBe(true);
  return state as E.CareerState;
}
function mount(raw?: string) {
  if (raw !== undefined) localStorage.setItem(KEY, raw);
  return render(<HelmetProvider><MemoryRouter initialEntries={['/soccer-career']}><SoccerCareer /></MemoryRouter></HelmetProvider>);
}
function rating(career: E.CareerState | null, flags = { saveFailed: false, saveMoved: false, saveError: false }) {
  const last = career?.seasons[career.seasons.length - 1];
  return {
    phase: career?.phase ?? 'creation', age: career?.age ?? null, position: career ? 'CM' : null,
    overall: career?.overall ?? null, derivedOverall: career ? E.calcOverall(career, career.position) : null,
    skills: career ? { pace: career.pace, shooting: career.shooting, passing: career.passing,
      dribbling: career.dribbling, defending: career.defending, physical: career.physical, reflexes: career.reflexes } : null,
    seasonCount: career?.seasons.length ?? 0, lastSeason: last ? { year: last.year, ovr: last.ovr ?? null } : null,
    ...flags,
  };
}
function observe() {
  const context = copy(captured.context);
  return { context, envelope: buildReportContext(context ?? {}) };
}
function retain(key: string, observations: unknown) {
  const receipt = { case: key, fixture: 'Fictional real-engine career; stored 98 versus seven skills at 75 is a crafted diagnostic fixture, not a reproduction of the original report', observations };
  const dir = process.env.SC_RATING_REPORT_RAW;
  if (dir) {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, key + '.json'), JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' });
  }
  console.info('SC_RATING_REPORT_CONTEXT ' + JSON.stringify(receipt));
}
function assertReport(observation: ReturnType<typeof observe>, expected: ReturnType<typeof rating>, key: string, club?: string) {
  const text = JSON.stringify(observation.envelope);
  expect(text.length, 'SC_REPORT_BOUNDED_ENVELOPE').toBeLessThan(1500);
  expect(JSON.parse(text)).toEqual(observation.envelope);
  expect(observation.envelope).toMatchObject({ path: '/soccer-career', source: 'game-report-button', contextTruncated: false });
  for (const sentinel of [PRIVATE, NEWS, EVENT, 'PRIVATE_QUERY_SENTINEL', '9876543.21', '87654321', club].filter(Boolean)) {
    expect(text, 'SC_REPORT_NO_PERSONAL_SAVE_CONTENT').not.toContain(sentinel);
  }
  // This owned assertion comes after the real page/save preservation checks and raw observation.
  expect(observation.context, 'SC_RATING_REPORT_CONTEXT_' + key).toEqual({ careerRating: expected });
}
function next(view: ReturnType<typeof render>) {
  const button = view.container.querySelector<HTMLButtonElement>('[data-career-action-bar] button');
  expect(button, 'SC_REPORT_SETUP_REAL_NEXT_ACTION').toBeInstanceOf(HTMLButtonElement);
  fireEvent.click(button!);
}
beforeEach(() => {
  localStorage.clear(); localStorage.setItem(OTHER, 'untouched'); vi.clearAllMocks(); captured.context = null;
  window.history.replaceState({}, '', '/soccer-career?private=PRIVATE_QUERY_SENTINEL#private');
  vi.spyOn(Date, 'now').mockReturnValue(Date.UTC(2026, 10, 3, 12));
  vi.spyOn(Math, 'random').mockReturnValue(0.52);
  vi.stubGlobal('requestAnimationFrame', () => 1); vi.stubGlobal('cancelAnimationFrame', () => undefined);
  vi.stubGlobal('IntersectionObserver', class { observe() {} unobserve() {} disconnect() {} });
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); localStorage.clear(); window.history.replaceState({}, '', '/'); });

describe('Soccer Career safe rating report context', () => {
  it('describes creation without inventing a player or writing a career', () => {
    const view = mount(), observation = observe();
    retain('creation', observation);
    expect(view.container.textContent).toContain('Create Your Player');
    expect(localStorage.getItem(KEY)).toBeNull(); expect(localStorage.getItem(OTHER)).toBe('untouched');
    assertReport(observation, rating(null), 'CREATION');
  });

  it('keeps stored and derived ratings distinct, omits personal data and never substitutes match rating for missing historical overall', () => {
    const career = nativeCareer();
    delete career.seasons[career.seasons.length - 1].ovr;
    career.seasons[career.seasons.length - 1].rating = 8.7;
    career.pendingNews = [{ newspaper: NEWS, headline: NEWS, body: NEWS, type: 'positive' }];
    career.events.push(EVENT); career.netWorth = 9876543.21; career.weeklyWage = 87654321;
    const input = serializeSoccerCareerSave(career), before = JSON.stringify(career);
    expect(isSoccerCareerSave(parseSoccerCareerSave(input))).toBe(true);
    expect(E.calcOverall(career, career.position)).toBe(75);
    mount(input);
    const saved = read(), observation = observe(), held = localStorage.getItem(KEY);
    retain('mismatch', { observation, savedRating: rating(saved), codecValid: isSoccerCareerSave(saved) });
    expect(saved.overall).toBe(98);
    expect([saved.pace, saved.shooting, saved.passing, saved.dribbling, saved.defending, saved.physical, saved.reflexes]).toEqual([75, 75, 75, 75, 75, 75, 75]);
    expect(saved.seasons[saved.seasons.length - 1].rating).toBe(8.7);
    expect(saved.seasons[saved.seasons.length - 1].ovr).toBeUndefined();
    expect(saved.playerName).toBe(PRIVATE); expect(saved.pendingNews).toEqual(career.pendingNews); expect(saved.events).toContain(EVENT);
    expect(JSON.stringify(career)).toBe(before); expect(localStorage.getItem(OTHER)).toBe('untouched');
    observe(); expect(localStorage.getItem(KEY)).toBe(held);
    assertReport(observation, rating(saved), 'MISMATCH', saved.currentClub);
  });

  it('reports the current state after one real academy season without replaying progress', () => {
    const view = mount(serializeSoccerCareerSave(nativeCareer())), before = read(), first = observe();
    next(view);
    const after = read(), second = observe();
    retain('advance', { first, second, before: rating(before), after: rating(after) });
    expect(after.age).toBe(before.age + 1); expect(after.seasons).toHaveLength(before.seasons.length + 1);
    expect(after.overall).toBe(E.calcOverall(after, after.position)); expect(recordActivity).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem(OTHER)).toBe('untouched');
    assertReport(first, rating(before), 'ADVANCE_BEFORE');
    assertReport(second, rating(after), 'ADVANCE_AFTER');
  });

  it('keeps rating diagnostics safe on the real retirement ceremony phase', () => {
    const career = E.manualRetire(nativeCareer()), view = mount(serializeSoccerCareerSave(career));
    const saved = read(), observation = observe();
    retain('retirement', { observation, savedRating: rating(saved) });
    expect(saved.retired).toBe(true); expect(saved.phase).toBe('retirement_ceremony');
    expect(saved.legacy?.score).toBe(career.legacy?.score); expect(view.container.textContent).not.toContain('Create Your Player');
    expect(localStorage.getItem(OTHER)).toBe('untouched');
    assertReport(observation, rating(saved), 'RETIREMENT', saved.currentClub);
  });

  it('reports a real refused save and clears the flag after Retry without advancing the career', () => {
    const raw = serializeSoccerCareerSave(nativeCareer()), original = Storage.prototype.setItem;
    localStorage.setItem(KEY, raw);
    let blocked = true;
    const attempts: string[] = [];
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (key, value) {
      if (key === KEY) { attempts.push(String(value)); if (blocked) throw new DOMException('Save refused', 'QuotaExceededError'); }
      original.call(this, key, value);
    });
    const view = mount(), failed = observe(), attempted = parseSoccerCareerSave(attempts[attempts.length - 1]) as E.CareerState;
    const warningBefore = view.container.querySelector('[data-soccer-save-status="failed"]') !== null;
    blocked = false;
    const retry = Array.from(view.container.querySelectorAll<HTMLButtonElement>('button')).find(button => button.textContent === 'Retry save');
    if (!retry) throw new Error('The real Retry save button is missing');
    fireEvent.click(retry);
    const saved = read(), recovered = observe();
    retain('save-failed', { failed, recovered, warningBefore, attemptedRating: rating(attempted), savedRating: rating(saved) });
    expect(warningBefore).toBe(true); expect(isSoccerCareerSave(attempted)).toBe(true);
    expect(saved).toEqual(attempted); expect(view.container.querySelector('[data-soccer-save-status="failed"]')).toBeNull();
    expect(recordActivity).not.toHaveBeenCalled(); expect(localStorage.getItem(OTHER)).toBe('untouched');
    assertReport(failed, rating(attempted, { saveFailed: true, saveMoved: false, saveError: false }), 'SAVE_FAILED');
    assertReport(recovered, rating(saved), 'SAVE_RECOVERED');
  });

  it('reports a real cross-tab move while preserving the newer tab save', async () => {
    const view = mount(serializeSoccerCareerSave(nativeCareer())), before = read();
    const theirs = E.advanceYouthYear(copy(before), E.FALLBACK_CLUBS), bytes = serializeSoccerCareerSave(theirs);
    const fence = String(Number(localStorage.getItem(FENCE) ?? '0') + 1);
    localStorage.setItem(FENCE, fence); localStorage.setItem(KEY, bytes);
    await act(async () => { window.dispatchEvent(new StorageEvent('storage', { key: FENCE })); await Promise.resolve(); });
    await waitFor(() => expect(document.body.querySelector('[data-testid="save-moved-notice"]')).not.toBeNull());
    const observation = observe();
    retain('save-moved', { observation, pageRating: rating(before), newerRating: rating(read()) });
    expect(localStorage.getItem(KEY)).toBe(bytes); expect(localStorage.getItem(FENCE)).toBe(fence);
    expect(view.container.querySelector('[data-soccer-save-status="failed"]')).toBeNull();
    expect(localStorage.getItem(OTHER)).toBe('untouched');
    assertReport(observation, rating(before, { saveFailed: false, saveMoved: true, saveError: false }), 'SAVE_MOVED');
  });

  it('reports an unreadable save without exposing or deleting its bytes', () => {
    const raw = '{PRIVATE_EVENT_SENTINEL';
    const view = mount(raw), observation = observe();
    retain('save-error', observation);
    expect(view.container.textContent).toContain("We couldn't open this save.");
    expect(localStorage.getItem(KEY)).toBe(raw); expect(localStorage.getItem(OTHER)).toBe('untouched');
    assertReport(observation, rating(null, { saveFailed: false, saveMoved: false, saveError: true }), 'SAVE_ERROR');
  });
});
