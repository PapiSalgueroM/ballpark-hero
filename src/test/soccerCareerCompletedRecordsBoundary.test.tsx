import fs from 'node:fs';
import path from 'node:path';
import { cleanup, fireEvent, render, waitFor, within } from '@testing-library/react';
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
import { recordCompletion } from '@/lib/completions';
import { isSoccerCareerSave, parseSoccerCareerSave, serializeSoccerCareerSave } from '@/lib/soccerCareerSave';
import SoccerCareer from '@/pages/SoccerCareer';

const KEY = 'soccerCareerSave', RECORDS = 'soccerCareerRecords:v1', OTHER = 'records-boundary-unrelated';
const EMPTY_BOOK = '{"version":1,"nextSequence":1,"records":[]}';
const club: E.ClubData = { id: 'boundary-fiction', name: 'Boundary Fixture FC', country: 'England',
  tier: 1, color: '#123456', league: 'Boundary Fixture League' };
let mainFault: 'none' | 'ignore' | 'alter' | 'throw' = 'none', recordsRefuse = false, removalIgnored = false;
let attempts: string[] = [], writes = 0, mainFaults = 0, recordAttempts = 0, recordRefusals = 0, removeAttempts = 0;
let nativeSet: typeof Storage.prototype.setItem;

function completed(phase: 'retired' | 'retirement_ceremony' = 'retired'): E.CareerState {
  const start = E.initCareer('Boundary Keeper', 'England', 'CM', '2020-24',
    { pace: 75, shooting: 75, passing: 75, dribbling: 75, defending: 75, physical: 75, reflexes: 75 },
    75, 2020, [club], null, 90);
  const season: E.SeasonRecord = { year: 2028, age: 24, club: club.name, clubCountry: club.country, clubTier: 1,
    apps: 32, goals: 17, assists: 8, cleanSheets: 4, yellowCards: 2, redCards: 0, rating: 7.9, ovr: 75,
    leagueTitle: true, domesticCup: false, championsLeague: false, worldCup: false,
    ballonDor: false, ballonDorRank: null, type: 'playing',
    intApps: 4, intGoals: 2, intAssists: 1, intRating: 7.5, tournament: null, tournamentResult: null };
  const playing = { ...start, age: 24, currentClub: club.name, currentClubCountry: club.country,
    currentClubTier: 1, currentClubColor: club.color, currentLeague: club.league,
    phase: 'playing' as const, retired: false, seasons: [...start.seasons, season],
    intStats: { ...start.intStats, caps: 4, goals: 2, assists: 1 } };
  let state = E.manualRetire(playing);
  if (phase === 'retired') state = E.choosePostRetirement(state, 'retire', [club]);
  // Stabilize this declared fixture through the same real codec/repair path used on mount.
  for (let i = 0; i < 2; i++) state = E.repairCareer(parseSoccerCareerSave(serializeSoccerCareerSave(state)) as E.CareerState);
  return state;
}
function resetCounters() { attempts = []; writes = 0; mainFaults = 0; recordAttempts = 0; recordRefusals = 0; removeAttempts = 0; }
function mount(raw: string, mode: typeof mainFault = 'none', refuseRecords = false) {
  expect(isSoccerCareerSave(parseSoccerCareerSave(raw)), 'SC_RECORD_BOUNDARY_REAL_SOURCE').toBe(true);
  mainFault = 'none'; recordsRefuse = false; removalIgnored = false;
  nativeSet.call(localStorage, KEY, raw); nativeSet.call(localStorage, RECORDS, EMPTY_BOOK);
  resetCounters(); mainFault = mode; recordsRefuse = refuseRecords;
  return render(<HelmetProvider><MemoryRouter initialEntries={['/soccer-career']}><SoccerCareer /></MemoryRouter></HelmetProvider>);
}
async function attempted() {
  await waitFor(() => expect(attempts.length, 'SC_RECORD_BOUNDARY_REAL_WRITE_ATTEMPT').toBeGreaterThan(0));
}
function ordinaryConfirm(view: ReturnType<typeof render>) {
  fireEvent.click(view.getAllByRole('button', { name: /New Career$/ })[0]);
  const dialog = within(document.body).getByRole('dialog', { name: 'Start a new career?' });
  fireEvent.click(within(dialog).getByRole('button', { name: 'Delete & Start Over' }));
  return dialog;
}
const discardButton = (dialog: HTMLElement) => within(dialog).queryByRole('button', { name: 'Delete without keeping this record' });
const stillCareer = (view: ReturnType<typeof render>) => view.queryAllByRole('button', { name: /New Career$/ }).length > 0;
function raw(name: string, observations: unknown) {
  const value = { case: name, fixture: 'Real Page/engine/codec/fence; explicit fictional completed career and declared Storage faults, not natural gameplay', observations };
  const dir = process.env.SC_CAREER_RECORDS_BOUNDARY_RAW;
  if (dir) { fs.mkdirSync(dir, { recursive: true }); fs.writeFileSync(path.join(dir, name + '.json'), JSON.stringify(value, null, 2) + '\n', { flag: 'wx' }); }
  console.info('SC_CAREER_RECORDS_BOUNDARY_RAW ' + JSON.stringify(value));
}
function otherHeld() { expect(localStorage.getItem(OTHER), 'SC_RECORD_BOUNDARY_UNRELATED_KEY').toBe('untouched'); }

beforeEach(() => {
  localStorage.clear(); localStorage.setItem(OTHER, 'untouched'); vi.clearAllMocks(); resetCounters();
  mainFault = 'none'; recordsRefuse = false; removalIgnored = false;
  window.history.replaceState({}, '', '/soccer-career');
  vi.spyOn(Date, 'now').mockReturnValue(Date.UTC(2026, 10, 3, 12));
  vi.spyOn(Math, 'random').mockReturnValue(0.52);
  vi.stubGlobal('requestAnimationFrame', () => 1); vi.stubGlobal('cancelAnimationFrame', () => undefined);
  vi.stubGlobal('IntersectionObserver', class { observe() {} unobserve() {} disconnect() {} });
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  nativeSet = Storage.prototype.setItem;
  const nativeRemove = Storage.prototype.removeItem;
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key: string, value: string) {
    if (key === KEY) {
      attempts.push(value);
      if (mainFault !== 'none') {
        mainFaults++;
        if (mainFault === 'ignore') return;
        if (mainFault === 'alter') { nativeSet.call(this, key, value + ' '); return; }
        throw new DOMException('Controlled source-save refusal', 'QuotaExceededError');
      }
    }
    if (key === RECORDS) {
      recordAttempts++;
      if (recordsRefuse) { recordRefusals++; throw new DOMException('Controlled records refusal', 'QuotaExceededError'); }
    }
    nativeSet.call(this, key, value);
    if (key === KEY) writes++;
  });
  vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(function (this: Storage, key: string) {
    if (key === KEY) { removeAttempts++; if (removalIgnored) return; }
    nativeRemove.call(this, key);
  });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); localStorage.clear(); window.history.replaceState({}, '', '/'); });

describe('Soccer Career completed record storage boundaries', () => {
  it.each([false, true])('records retirement only after the career save succeeds, with archive refusal %s', async refuseArchive => {
    const view = mount(serializeSoccerCareerSave(completed('retirement_ceremony')));
    await attempted();
    const ceremony = localStorage.getItem(KEY);
    const savedAtCompletion: (string | null)[] = [];
    vi.mocked(recordCompletion).mockImplementationOnce(() => { savedAtCompletion.push(localStorage.getItem(KEY)); });
    mainFault = 'throw';
    recordsRefuse = refuseArchive;
    fireEvent.click(view.getByRole('button', { name: /Retire and Enjoy Life/ }));
    const retry = (await view.findAllByRole('button', { name: 'Retry save' }))[0];
    expect(localStorage.getItem(KEY)).toBe(ceremony);
    expect(recordAttempts).toBe(0);
    expect(recordCompletion).not.toHaveBeenCalled();

    mainFault = 'none';
    fireEvent.click(retry);
    await waitFor(() => expect(recordCompletion).toHaveBeenCalledTimes(1));
    const saved = localStorage.getItem(KEY)!;
    const retired = parseSoccerCareerSave(saved) as E.CareerState;
    expect(retired.phase).toBe('retired');
    expect(recordCompletion).toHaveBeenCalledWith('/soccer-career', retired.legacy?.score, 'Records Fixture', 0);
    expect(savedAtCompletion).toEqual([saved]);
    expect(recordRefusals).toBe(refuseArchive ? 1 : 0);
    cleanup();
    const restored = mount(saved);
    await restored.findAllByRole('button', { name: /Share Legacy/ });
    expect(recordCompletion).toHaveBeenCalledTimes(1);
  });

  it.each(['ignore', 'alter'] as const)('rejects a nonthrowing %s source write before archive or discard', async mode => {
    // Pretty valid JSON differs from the real canonical serializer, so ignored writes cannot accidentally match.
    const original = JSON.stringify(completed(), null, 2);
    const view = mount(original, mode);
    await attempted();
    const dialog = ordinaryConfirm(view);
    const observations = { mode, attempted: attempts.length, actualFaults: mainFaults, successfulWrites: writes,
      storedMatchesAttempt: localStorage.getItem(KEY) === attempts[attempts.length - 1],
      sourcePresent: localStorage.getItem(KEY) !== null, archiveAttempts: recordAttempts,
      bookHeld: localStorage.getItem(RECORDS) === EMPTY_BOOK, discardOffered: !!discardButton(dialog), careerStillVisible: stillCareer(view) };
    raw('source-' + mode, observations);
    expect(mainFaults, 'SC_RECORD_BOUNDARY_ACTUAL_NONTHROWING_FAULT').toBeGreaterThan(0); otherHeld();
    expect(observations, 'SC_RECORD_BOUNDARY_SOURCE_READBACK_' + mode.toUpperCase()).toMatchObject({
      successfulWrites: 0, storedMatchesAttempt: false, sourcePresent: true, archiveAttempts: 0,
      bookHeld: true, discardOffered: false, careerStillVisible: true });
  });

  it('refuses restart when an existing current acknowledgement no longer matches disk', async () => {
    const view = mount(serializeSoccerCareerSave(completed()));
    await attempted();
    expect(writes, 'SC_RECORD_BOUNDARY_INITIAL_ACK').toBeGreaterThan(0);
    const before = { main: attempts.length, archive: recordAttempts, book: localStorage.getItem(RECORDS) };
    const replacement = serializeSoccerCareerSave({ ...completed(), playerName: 'Other Saved Player' });
    nativeSet.call(localStorage, KEY, replacement);
    const dialog = ordinaryConfirm(view);
    const observations = { sourceHeld: localStorage.getItem(KEY) === replacement, careerStillVisible: stillCareer(view),
      extraMainAttempts: attempts.length - before.main, extraArchiveAttempts: recordAttempts - before.archive,
      bookHeld: localStorage.getItem(RECORDS) === before.book, discardOffered: !!discardButton(dialog) };
    raw('source-mismatch', observations); otherHeld();
    expect(observations, 'SC_RECORD_BOUNDARY_SOURCE_MISMATCH').toEqual({ sourceHeld: true, careerStillVisible: true,
      extraMainAttempts: 0, extraArchiveAttempts: 0, bookHeld: true, discardOffered: false });
  });

  it('keeps the current career mounted when removal returns without deleting its bytes', async () => {
    const view = mount(serializeSoccerCareerSave(completed()));
    await attempted();
    const before = localStorage.getItem(KEY);
    removalIgnored = true;
    ordinaryConfirm(view);
    const observations = { actualRemoveAttempts: removeAttempts, sourceHeld: localStorage.getItem(KEY) === before,
      careerStillVisible: stillCareer(view), creationVisible: view.queryByRole('heading', { name: 'Create Your Player' }) !== null };
    raw('ignored-removal', observations);
    expect(removeAttempts, 'SC_RECORD_BOUNDARY_REAL_REMOVE_FAULT').toBeGreaterThan(0); otherHeld();
    expect(observations, 'SC_RECORD_BOUNDARY_REMOVAL_READBACK').toMatchObject({ sourceHeld: true, careerStillVisible: true, creationVisible: false });
  });

  it('allows explicit archive discard only after refusal with a valid current acknowledgement', async () => {
    const view = mount(serializeSoccerCareerSave(completed()), 'none', true);
    await attempted();
    const validDialog = ordinaryConfirm(view), validDiscard = discardButton(validDialog);
    if (validDiscard) fireEvent.click(validDiscard);
    const valid = { offered: !!validDiscard, actualArchiveRefusals: recordRefusals, successfulMainWrites: writes,
      sourceRemoved: localStorage.getItem(KEY) === null, bookHeld: localStorage.getItem(RECORDS) === EMPTY_BOOK };
    const original = attempts[attempts.length - 1];
    cleanup();
    const failedView = mount(original, 'throw', true);
    await attempted();
    const failedDialog = ordinaryConfirm(failedView), failedDiscard = discardButton(failedDialog);
    if (failedDiscard) fireEvent.click(failedDiscard);
    const failed = { actualMainRefusals: mainFaults, successfulMainWrites: writes,
      attemptedBytesAlreadyStored: attempts.every(value => value === original),
      sourceHeld: localStorage.getItem(KEY) === original, archiveAttempts: recordAttempts,
      discardOffered: !!failedDiscard, careerStillVisible: stillCareer(failedView) };
    raw('explicit-discard', { valid, failed }); otherHeld();
    expect(valid.actualArchiveRefusals, 'SC_RECORD_BOUNDARY_REAL_ARCHIVE_REFUSAL').toBeGreaterThan(0);
    expect(failed.actualMainRefusals, 'SC_RECORD_BOUNDARY_REAL_MAIN_REFUSAL').toBeGreaterThan(0);
    expect(failed.attemptedBytesAlreadyStored, 'SC_RECORD_BOUNDARY_IDENTICAL_BYTES_ARE_NOT_ACK').toBe(true);
    expect(valid, 'SC_RECORD_BOUNDARY_VALID_ACK_DISCARD').toMatchObject({ offered: true, sourceRemoved: true, bookHeld: true });
    expect(failed, 'SC_RECORD_BOUNDARY_FAILED_ACK_NO_DISCARD').toMatchObject({
      successfulMainWrites: 0, sourceHeld: true, archiveAttempts: 0, discardOffered: false, careerStillVisible: true });
  });
});
