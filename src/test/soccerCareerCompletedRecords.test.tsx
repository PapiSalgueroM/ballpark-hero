import fs from 'node:fs';
import path from 'node:path';
import { act, cleanup, fireEvent, render, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HelmetProvider } from 'react-helmet-async';
import { MemoryRouter } from 'react-router-dom';
import '@/components/SaveMovedNotice';

// Only shell and transport seams are replaced. Page, engine, codec and fence remain real.
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null, refreshProfile: vi.fn(), loading: false }) }));
vi.mock('@/lib/completions', async original => ({ ...(await original<Record<string, unknown>>()),
  recordCompletion: vi.fn(), recordActivity: vi.fn(), recordStreakDay: vi.fn(), getCurrentPlayerName: () => 'Records Fixture' }));
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
vi.mock('@/components/seo/GameSeoContent', () => ({ default: () => null }));
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
import { createSaveFence } from '@/lib/saveFence';
import { recordActivity, recordCompletion } from '@/lib/completions';
import SoccerCareer from '@/pages/SoccerCareer';

const KEY = 'soccerCareerSave', RECORDS = 'soccerCareerRecords:v1', OTHER = 'records-unrelated-save';
const EMPTY_BOOK = '{"version":1,"nextSequence":1,"records":[]}';
const FUTURE_BOOK = '{"version":99,"records":[{"opaque":"KEEP_FUTURE_RECORD"}],"extra":"KEEP_FUTURE_FIELD"}';
const club: E.ClubData = { id: 'records-fixture', name: 'Records Fixture FC', country: 'England',
  tier: 1, color: '#123456', league: 'Records Fixture League' };
const copy = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
let fault: 'none' | 'main' | 'records' = 'none';
let mainWrites: string[] = [], mainFailures = 0, recordsAttempts = 0, recordsFailures = 0;

function activeCareer(): E.CareerState {
  const state = E.initCareer('Record Keeper', 'England', 'CM', '2020-24',
    { pace: 75, shooting: 75, passing: 75, dribbling: 75, defending: 75, physical: 75, reflexes: 75 },
    75, 2020, [club], null, 90);
  const season: E.SeasonRecord = {
    year: 2028, age: 24, club: club.name, clubCountry: club.country, clubTier: club.tier,
    apps: 32, goals: 17, assists: 8, cleanSheets: 4, yellowCards: 2, redCards: 0, rating: 7.9, ovr: 75,
    leagueTitle: true, domesticCup: false, championsLeague: false, worldCup: false,
    ballonDor: false, ballonDorRank: null, type: 'playing',
    intApps: 4, intGoals: 2, intAssists: 1, intRating: 7.5, tournament: null, tournamentResult: null,
  };
  return { ...state, age: 24, currentClub: club.name, currentClubCountry: club.country,
    currentClubTier: club.tier, currentClubColor: club.color, currentLeague: club.league,
    phase: 'playing', retired: false, seasons: [...state.seasons, season],
    intStats: { ...state.intStats, caps: 4, goals: 2, assists: 1 } };
}
function completedCareer(): E.CareerState {
  return E.choosePostRetirement(E.manualRetire(activeCareer()), 'retire', [club]);
}
function mountPage() {
  return render(<HelmetProvider><MemoryRouter initialEntries={['/soccer-career']}><SoccerCareer /></MemoryRouter></HelmetProvider>);
}
function mountSaved(state: E.CareerState, mode: typeof fault = 'none') {
  fault = 'none';
  localStorage.setItem(KEY, serializeSoccerCareerSave(state));
  mainWrites = []; mainFailures = 0; recordsAttempts = 0; recordsFailures = 0;
  fault = mode;
  return mountPage();
}
function storedCareer() {
  const raw = localStorage.getItem(KEY);
  expect(raw, 'SC_RECORDS_SETUP_CURRENT_SOURCE_PRESENT').not.toBeNull();
  const value = parseSoccerCareerSave(raw!);
  expect(isSoccerCareerSave(value), 'SC_RECORDS_SETUP_REAL_CODEC').toBe(true);
  return { raw: raw!, state: value as E.CareerState };
}
async function acknowledged() {
  await waitFor(() => expect(mainWrites.length, 'SC_RECORDS_SETUP_REAL_MAIN_ACK').toBeGreaterThan(0));
  const saved = storedCareer();
  expect(saved.raw).toBe(mainWrites[mainWrites.length - 1]);
  return saved;
}
function bookRecords(): Record<string, unknown>[] {
  const raw = localStorage.getItem(RECORDS);
  if (raw === null) return [];
  const value: unknown = JSON.parse(raw);
  if (typeof value !== 'object' || value === null || !('records' in value) || !Array.isArray(value.records)) return [];
  return value.records.filter((row): row is Record<string, unknown> => typeof row === 'object' && row !== null && !Array.isArray(row));
}
function safeSource() {
  const raw = localStorage.getItem(KEY);
  if (raw === null) return null;
  const value = parseSoccerCareerSave(raw) as E.CareerState;
  return { name: value.playerName, phase: value.phase, retired: value.retired,
    score: value.legacy?.score ?? null, tier: value.legacy?.tier ?? null, seasons: value.seasons.length };
}
function retain(name: string, observations: unknown) {
  const value = { case: name,
    fixture: 'Real initCareer/retirement/Page/codec/fence with explicit fictional playing receipts; controlled failure inputs are not natural gameplay claims',
    observations };
  const dir = process.env.SC_CAREER_RECORDS_RAW;
  if (dir) {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, name + '.json'), JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
  }
  console.info('SC_CAREER_RECORDS_RAW ' + JSON.stringify(value));
}
function openNew(view: ReturnType<typeof render>) {
  const buttons = view.getAllByRole('button', { name: /New Career$/ });
  expect(buttons.length, 'SC_RECORDS_SETUP_EXISTING_NEW_ACTION').toBeGreaterThan(0);
  fireEvent.click(buttons[0]);
  return within(document.body).getByRole('dialog', { name: 'Start a new career?' });
}
function confirmNew(view: ReturnType<typeof render>) {
  const dialog = openNew(view);
  fireEvent.click(within(dialog).getByRole('button', { name: 'Delete & Start Over' }));
}
function cancelNew() {
  const dialog = within(document.body).queryByRole('dialog', { name: 'Start a new career?' });
  if (dialog) fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
}
function expectOtherHeld() { expect(localStorage.getItem(OTHER)).toBe('untouched'); }
function recordsPanel(view: ReturnType<typeof render>) {
  const panel = view.queryByRole('dialog', { name: 'Past careers' }) ?? view.queryByRole('region', { name: 'Past careers' });
  expect(panel).not.toBeNull();
  return within(panel!);
}

beforeEach(() => {
  localStorage.clear(); localStorage.setItem(OTHER, 'untouched'); vi.clearAllMocks();
  fault = 'none'; mainWrites = []; mainFailures = 0; recordsAttempts = 0; recordsFailures = 0;
  window.history.replaceState({}, '', '/soccer-career');
  vi.spyOn(Date, 'now').mockReturnValue(Date.UTC(2026, 10, 3, 12));
  vi.spyOn(Math, 'random').mockReturnValue(0.52);
  vi.stubGlobal('requestAnimationFrame', () => 1); vi.stubGlobal('cancelAnimationFrame', () => undefined);
  vi.stubGlobal('IntersectionObserver', class { observe() {} unobserve() {} disconnect() {} });
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  const setItem = Storage.prototype.setItem;
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key: string, value: string) {
    if (key === KEY && fault === 'main') {
      mainFailures++; throw new DOMException('Controlled current-save quota refusal', 'QuotaExceededError');
    }
    if (key === RECORDS) {
      recordsAttempts++;
      if (fault === 'records') {
        recordsFailures++; throw new DOMException('Controlled record-book quota refusal', 'QuotaExceededError');
      }
    }
    setItem.call(this, key, value);
    if (key === KEY) mainWrites.push(value);
  });
});
afterEach(() => {
  cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); localStorage.clear();
  window.history.replaceState({}, '', '/');
});

describe('Soccer Career completed record retention', () => {
  it('keeps an acknowledged completed record before New Career removes the source save', async () => {
    let view = mountSaved(completedCareer());
    const saved = await acknowledged();
    expect(saved.state.phase).toBe('retired'); expect(saved.state.retired).toBe(true);
    expect(saved.state.legacy).not.toBeNull();
    confirmNew(view);
    const records = bookRecords();
    retain('keep-before-restart', { sourceAfter: safeSource(), records, mainAcknowledged: true,
      sourceRemoved: localStorage.getItem(KEY) === null, otherHeld: localStorage.getItem(OTHER) === 'untouched' });
    expect(localStorage.getItem(KEY)).toBeNull(); expectOtherHeld();
    expect(records.length, 'SC_RECORDS_KEEP_BEFORE_RESTART').toBe(1);
    expect(records[0].legacy).toEqual(saved.state.legacy);
    expect(records[0]).toMatchObject({ goals: 17, trophies: 1, ballonDors: 0, caps: 4 });
    cleanup(); view = mountPage();
    const opener = view.getByRole('button', { name: 'Past careers' });
    const beforeRead = localStorage.getItem(RECORDS);
    const completionCalls = vi.mocked(recordCompletion).mock.calls.length;
    const activityCalls = vi.mocked(recordActivity).mock.calls.length;
    const randomCalls = vi.mocked(Math.random).mock.calls.length;
    fireEvent.click(opener);
    await waitFor(() => expect(view.getByRole('heading', { name: 'Past careers' })).toBeVisible());
    const panel = recordsPanel(view);
    expect(panel.getByText(saved.state.playerName)).toBeVisible();
    expect(panel.getByText(saved.state.legacy!.tier)).toBeVisible();
    expect(localStorage.getItem(KEY)).toBeNull(); expect(localStorage.getItem(RECORDS)).toBe(beforeRead);
    expect(vi.mocked(recordCompletion).mock.calls.length).toBe(completionCalls);
    expect(vi.mocked(recordActivity).mock.calls.length).toBe(activityCalls);
    fireEvent.click(panel.getByRole('button', { name: 'Back' }));
    await waitFor(() => expect(opener).toHaveFocus());
    expect(vi.mocked(Math.random).mock.calls.length).toBe(randomCalls);
  });

  it('dedupes the same playing record and replaces it with the latest lower saved legacy', async () => {
    const first = completedCareer();
    first.legacy = { score: 84, tier: 'LEGEND', breakdown: [{ label: 'Controlled saved legacy', points: 84 }] };
    let view = mountSaved(first);
    const savedFirst = await acknowledged(), firstRecords = copy(bookRecords());
    cleanup();
    const later = copy(savedFirst.state);
    later.age += 2;
    later.legacy = { score: 55, tier: 'JOURNEYMAN', breakdown: [{ label: 'Controlled later saved legacy', points: 55 }] };
    view = mountSaved(later);
    const savedLater = await acknowledged(), records = bookRecords();
    retain('latest-lower', { firstLegacy: savedFirst.state.legacy, laterLegacy: savedLater.state.legacy,
      firstRecords, records, mainAcknowledged: true, samePlayingRows: JSON.stringify(savedFirst.state.seasons.filter(row => row.type === 'playing')) === JSON.stringify(savedLater.state.seasons.filter(row => row.type === 'playing')) });
    expect(savedFirst.state.legacy?.score).toBe(84); expect(savedLater.state.legacy?.score).toBe(55);
    expect(savedLater.state.seasons).toEqual(savedFirst.state.seasons); expectOtherHeld();
    expect(records.map(row => row.legacy), 'SC_RECORDS_LATEST_ACK_REPLACES').toEqual([savedLater.state.legacy]);
    expect(firstRecords).toHaveLength(1); expect(records[0].key).toBe(firstRecords[0].key);
    expect(typeof records[0].key).toBe('string');
    cleanup(); view = mountSaved(savedLater.state); await acknowledged();
    expect(bookRecords()).toHaveLength(1);
    expect(bookRecords()[0].legacy).toEqual(savedLater.state.legacy);
  });

  it('creates no ghost record and refuses New Career when the current save was not acknowledged', async () => {
    const state = completedCareer(), original = serializeSoccerCareerSave(state);
    const view = mountSaved(state, 'main');
    await waitFor(() => expect(view.getByRole('button', { name: 'Retry save' })).toBeVisible());
    expect(mainFailures).toBeGreaterThan(0); expect(mainWrites).toHaveLength(0);
    expect(localStorage.getItem(KEY)).toBe(original); expect(localStorage.getItem(RECORDS)).toBeNull();
    confirmNew(view);
    retain('current-save-failed', { sourceAfter: safeSource(), mainFailures, successfulMainWrites: mainWrites.length,
      sourceHeld: localStorage.getItem(KEY) === original, recordsRaw: localStorage.getItem(RECORDS) });
    expect(localStorage.getItem(RECORDS)).toBeNull(); expectOtherHeld();
    expect(localStorage.getItem(KEY), 'SC_RECORDS_MAIN_FAILURE_BLOCKS_CLEAR').toBe(original);
    cancelNew(); fault = 'none';
    fireEvent.click(view.getByRole('button', { name: 'Retry save' }));
    await acknowledged();
    expect(bookRecords()).toHaveLength(1);
  });

  it('keeps a saved career after record-book quota refusal and recovers through Retry', async () => {
    const view = mountSaved(completedCareer(), 'records');
    const saved = await acknowledged();
    confirmNew(view);
    retain('archive-quota', { sourceAfter: safeSource(), recordsAttempts, recordsFailures,
      sourceHeld: localStorage.getItem(KEY) === saved.raw, recordsRaw: localStorage.getItem(RECORDS) });
    expectOtherHeld();
    expect({ sourceHeld: localStorage.getItem(KEY) === saved.raw, attempted: recordsAttempts > 0, refused: recordsFailures > 0 },
      'SC_RECORDS_QUOTA_BLOCKS_CLEAR').toEqual({ sourceHeld: true, attempted: true, refused: true });
    expect(localStorage.getItem(RECORDS)).toBeNull();
    cancelNew(); fault = 'none';
    fireEvent.click(view.getByRole('button', { name: 'Retry record' }));
    await waitFor(() => expect(bookRecords()).toHaveLength(1));
    confirmNew(view);
    expect(localStorage.getItem(KEY)).toBeNull(); expect(bookRecords()).toHaveLength(1);
    expectOtherHeld();
  });

  it('preserves a future record book and refuses ordinary destructive confirmation', async () => {
    localStorage.setItem(RECORDS, FUTURE_BOOK);
    const view = mountSaved(completedCareer());
    const saved = await acknowledged();
    confirmNew(view);
    retain('future-store', { sourceAfter: safeSource(), sourceHeld: localStorage.getItem(KEY) === saved.raw,
      recordsRaw: localStorage.getItem(RECORDS), recordsAttempts });
    expect(localStorage.getItem(RECORDS)).toBe(FUTURE_BOOK); expectOtherHeld();
    expect(localStorage.getItem(KEY), 'SC_RECORDS_FUTURE_STORE_BLOCKS_CLEAR').toBe(saved.raw);
    expect(recordsAttempts).toBe(0);
    cancelNew();
    fireEvent.click(view.getByRole('button', { name: 'Past careers' }));
    await waitFor(() => expect(view.getByRole('heading', { name: 'Past careers' })).toBeVisible());
    expect(recordsPanel(view).getByText(/kept|unchanged|read.only|different format/i)).toBeVisible();
    expect(localStorage.getItem(RECORDS)).toBe(FUTURE_BOOK); expect(localStorage.getItem(KEY)).toBe(saved.raw);
  });

  it('leaves unfinished phases unarchived and preserves the record book during an active restart', async () => {
    localStorage.setItem(RECORDS, EMPTY_BOOK);
    let view = mountSaved(E.manualRetire(activeCareer()));
    const ceremony = await acknowledged();
    expect(ceremony.state.retired).toBe(true); expect(ceremony.state.phase).toBe('retirement_ceremony');
    const afterCeremony = localStorage.getItem(RECORDS);
    cleanup();
    view = mountSaved(activeCareer());
    const active = await acknowledged();
    expect(active.state.retired).toBe(false); expect(active.state.phase).toBe('playing');
    confirmNew(view);
    retain('unfinished', { ceremonyPhase: ceremony.state.phase, afterCeremony, afterActiveRestart: localStorage.getItem(RECORDS),
      sourceRemoved: localStorage.getItem(KEY) === null, recordsAttempts });
    expect(afterCeremony).toBe(EMPTY_BOOK); expect(localStorage.getItem(RECORDS)).toBe(EMPTY_BOOK);
    expect(recordsAttempts).toBe(0); expect(localStorage.getItem(KEY)).toBeNull(); expectOtherHeld();
  });

  it('keeps both storage keys when the real save fence refuses a stale confirmation', async () => {
    const view = mountSaved(completedCareer());
    const saved = await acknowledged(), archiveBefore = localStorage.getItem(RECORDS);
    const dialog = openNew(view);
    const newer = copy(saved.state); newer.playerName = 'Newer Record Keeper';
    const newerRaw = serializeSoccerCareerSave(newer);
    const otherTab = createSaveFence(localStorage); otherTab.adopt(KEY);
    let written: ReturnType<typeof otherTab.write> | null = null;
    act(() => { written = otherTab.write(KEY, () => { localStorage.setItem(KEY, newerRaw); return true; }); });
    expect(written).toBe('written');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete & Start Over' }));
    await waitFor(() => expect(within(document.body).getByText('This career moved on in another tab. Reload to carry on.')).toBeVisible());
    retain('moved', { sourceHeld: localStorage.getItem(KEY) === newerRaw, archiveHeld: localStorage.getItem(RECORDS) === archiveBefore,
      newerSource: safeSource(), fenceOutcome: written });
    expect(localStorage.getItem(KEY)).toBe(newerRaw); expect(localStorage.getItem(RECORDS)).toBe(archiveBefore);
    expectOtherHeld();
  });
});
