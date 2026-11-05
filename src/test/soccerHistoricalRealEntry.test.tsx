import fs from 'node:fs';
import path from 'node:path';
import { act, cleanup, fireEvent, render, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HelmetProvider } from 'react-helmet-async';
import { MemoryRouter } from 'react-router-dom';

const moduleTape = vi.hoisted(() => {
  const original = Math.random, values: number[] = [];
  let seed = 7301;
  Math.random = () => { seed = seed * 16807 % 2147483647; const value = (seed - 1) / 2147483646; values.push(value); return value; };
  return { original, values };
});

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null, refreshProfile: vi.fn(), loading: false }) }));
vi.mock('@/lib/completions', async original => ({ ...(await original<Record<string, unknown>>()),
  recordCompletion: vi.fn(), recordActivity: vi.fn(), recordStreakDay: vi.fn(), getCurrentPlayerName: () => 'Entry Tester' }));
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
import { getEraStars } from '@/lib/careerEras';
import { worldClubOf } from '@/lib/soccerPhone';
import { isSoccerCareerSave, parseSoccerCareerSave, serializeSoccerCareerSave } from '@/lib/soccerCareerSave';
import { revealBallonDorResult } from '@/lib/soccerAwardReveal';
import PhonePanel from '@/components/soccer-career/PhonePanel';
import SoccerCareer from '@/pages/SoccerCareer';

Math.random = moduleTape.original;

const KEY = 'soccerCareerSave', OTHER = 'historical-entry-unrelated';
type Entry = { id: string; entryYear: number; entryClub: string };
type Versioned = { version: number; players: Entry[] };
const plain = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
const arrival = (s: E.CareerState): Versioned | undefined => (s as E.CareerState & { historicalArrivals?: Versioned }).historicalArrivals;
const own = (s: E.CareerState) => Object.prototype.hasOwnProperty.call(s, 'historicalArrivals');
const year = (s: E.CareerState) => s.seasons[s.seasons.length - 1].year;
const storage = () => Object.fromEntries(Object.keys(localStorage).sort().map(key => [key, localStorage.getItem(key)]));
let action = 'ui', uiDraws: { action: string; value: number }[], mainDraws: { action: string; value: number }[];

function retain(name: string, value: unknown) {
  const out = process.env.SC_HISTORICAL_ENTRY_EVIDENCE;
  if (!out) return;
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, name + '.json'), JSON.stringify({ importDraws: moduleTape.values, value }, null, 2) + '\n');
}
function record(s: E.CareerState, label: string) {
  const saved = serializeSoccerCareerSave(s), parsed = parseSoccerCareerSave(saved);
  expect(isSoccerCareerSave(parsed), 'SC_ENTRY_VALID_COMPLETE_SAVE').toBe(true);
  expect(parsed, 'SC_ENTRY_COMPLETE_CODEC').toEqual(plain(s));
  return { action: label, year: year(s), phase: s.phase, state: plain(s), saved, drawsThrough: mainDraws.length };
}
function seedMain(seed = 1) {
  action = 'public-api';
  vi.mocked(Math.random).mockImplementation(() => {
    seed = seed * 16807 % 2147483647;
    const value = (seed - 1) / 2147483646;
    mainDraws.push({ action, value }); return value;
  });
}
const mount = () => render(<HelmetProvider><MemoryRouter><SoccerCareer /></MemoryRouter></HelmetProvider>);
async function createFromUi(era = '2005-09') {
  const init = vi.spyOn(E, 'initCareer');
  const view = mount();
  expect(view.getByText('Create Your Player')).toBeInTheDocument();
  fireEvent.change(view.getByPlaceholderText('Enter your player name...'), { target: { value: 'Entry Tester' } });
  const selects = view.container.querySelectorAll('select');
  expect(selects).toHaveLength(3);
  for (const [index, value] of ['Spain', 'CM', era].entries()) fireEvent.change(selects[index], { target: { value } });
  fireEvent.click(view.getByRole('button', { name: /Generate Starting Potential|Roll again/ }));
  act(() => { vi.advanceTimersByTime(1200); });
  expect(view.getByRole('button', { name: /Begin Career/ })).toBeEnabled();
  await act(async () => { fireEvent.click(view.getByRole('button', { name: /Begin Career/ })); });
  expect(init).toHaveBeenCalledTimes(1);
  const bytes = localStorage.getItem(KEY);
  expect(bytes, 'SC_ENTRY_UI_ACTUAL_SAVE').not.toBeNull();
  const state = parseSoccerCareerSave(bytes!);
  expect(isSoccerCareerSave(state)).toBe(true);
  const s = state as E.CareerState;
  expect(s.era).toBe(era); expect(s.phase).toBe('youth'); expect(s.age).toBe(16);
  expect(s.playerName).toBe('Entry Tester'); expect(s.nationality).toBe('Spain'); expect(s.position).toBe('CM');
  const result = { state: plain(s), bytes: bytes!, args: plain(init.mock.calls[0]), storage: storage(),
    html: view.container.innerHTML, uiDraws: plain(uiDraws) };
  cleanup(); init.mockRestore(); seedMain();
  return result;
}
function journey(start: E.CareerState, target: number) {
  let current = plain(start), actions = 0;
  const frames = [record(current, 'actual-ui-save')];
  const priorArrivalWrites: { action: string; before: unknown; after: unknown }[] = [];
  function step(label: string, fn: (s: E.CareerState) => E.CareerState) {
    expect(++actions, 'SC_ENTRY_PUBLIC_ACTION_BOUND').toBeLessThanOrEqual(300);
    action = label;
    const input = current, before = arrival(input) === undefined ? null : plain(arrival(input));
    current = fn(input);
    priorArrivalWrites.push({ action: label, before, after: arrival(input) === undefined ? null : plain(arrival(input)) });
    frames.push(record(current, label));
  }
  while (year(current) < target) {
    expect(current.retired, 'SC_ENTRY_LIVE_PUBLIC_JOURNEY').toBe(false);
    switch (current.phase) {
      case 'youth': step('advanceYouthYear', s => E.advanceYouthYear(s, E.FALLBACK_CLUBS)); break;
      case 'playing': step('advanceProSeason', s => E.advanceProSeason(s, E.FALLBACK_CLUBS)); break;
      case 'newspaper': step('dismissNewspaper', E.dismissNewspaper); break;
      case 'season_summary': step('dismissSummary', s => E.dismissSummary(s, E.FALLBACK_CLUBS)); break;
      case 'international_debut': step('dismissDebut', s => E.dismissDebut(s, E.FALLBACK_CLUBS)); break;
      case 'world_cup': step('dismissWorldCup', s => E.dismissWorldCup(s, E.FALLBACK_CLUBS)); break;
      case 'ballon_dor':
        expect(current.pendingBallonDor).not.toBeNull();
        if (!current.pendingBallonDor!.revealed && !current.pendingBallonDor!.speech) step('revealBallonDorResult', revealBallonDorResult);
        else step('dismissBallonDor', s => E.dismissBallonDor(s, E.FALLBACK_CLUBS));
        break;
      case 'rivalry_event': step('dismissRivalryEvent', s => E.dismissRivalryEvent(s, E.FALLBACK_CLUBS)); break;
      case 'social_media_action': step('dismissSocialMediaPhase', s => E.dismissSocialMediaPhase(s, E.FALLBACK_CLUBS)); break;
      case 'random_events':
        expect(current.pendingEvents[0]?.choices.length).toBeGreaterThan(0);
        step('applyActualEventChoice0', s => E.applyEventChoice(s, 0, E.FALLBACK_CLUBS)); break;
      case 'moral_dilemma':
        if (current.pendingMoralDilemma) {
          const index = current.pendingMoralDilemma.choices.length - 1;
          step('applyActualLastMoralChoice', s => E.applyMoralDilemmaChoice(s, index));
        } else step('dismissMoralDilemma', s => E.dismissMoralDilemma(s, E.FALLBACK_CLUBS));
        break;
      case 'rehab_choice': step('actualFullRehabChoice1', s => E.applyRehabChoice(s, 1)); break;
      case 'red_card_appeal_result': step('dismissAppealResult', s => E.dismissAppealResult(s, E.FALLBACK_CLUBS)); break;
      case 'retirement_suggestion': step('declineRetirementSuggestion', s => E.declineRetirementSuggestion(s, E.FALLBACK_CLUBS)); break;
      case 'transfer_window': step('stayAtClub', E.stayAtClub); break;
      case 'contract_offer': {
        const offer = current.pendingOffers.find(o => o.isHomegrown) ?? current.pendingOffers[0];
        expect(offer, 'SC_ENTRY_REAL_GENERATED_OFFER').toBeDefined();
        step('acceptActualGeneratedOffer', s => E.acceptOffer(s, offer)); break;
      }
      default: throw new Error('Unsupported actual public phase: ' + current.phase);
    }
  }
  expect(year(current)).toBe(target);
  return { state: current, frames, priorArrivalWrites };
}
function wholeLoad(s: E.CareerState) {
  const bytes = serializeSoccerCareerSave(s), parsed = parseSoccerCareerSave(bytes);
  expect(isSoccerCareerSave(parsed)).toBe(true);
  const input = plain(parsed) as E.CareerState, before = plain(input);
  const loaded = E.repairCareer(input);
  return { before, state: loaded, bytes, loadedBytes: serializeSoccerCareerSave(loaded) };
}

beforeEach(() => {
  localStorage.clear(); localStorage.setItem(OTHER, 'untouched');
  uiDraws = []; mainDraws = []; action = 'ui';
  vi.useFakeTimers(); vi.setSystemTime(new Date('2026-11-05T12:00:00Z'));
  vi.spyOn(Math, 'random').mockImplementation(() => { const value = 0.52; uiDraws.push({ action, value }); return value; });
  vi.stubGlobal('requestAnimationFrame', () => 1); vi.stubGlobal('cancelAnimationFrame', () => undefined);
  vi.stubGlobal('IntersectionObserver', class { observe() {} unobserve() {} disconnect() {} });
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
  window.scrollTo = vi.fn();
});
afterEach(() => { cleanup(); vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('Soccer Career four historical real entries', () => {
  it('the actual 2005 creation path admits Neymar once at Santos in 2009', async () => {
    const ui = await createFromUi();
    const run = journey(ui.state, 2009);
    retain('entry', { ui, ...run, uiDraws, mainDraws, storage: storage() });
    const entrant = arrival(run.state)?.players;
    expect(entrant, 'SC_REAL_ENTRY_2009').toEqual([{ id: 'soccer:neymar', entryYear: 2009, entryClub: 'Santos' }]);
    expect(arrival(run.state)?.version).toBe(2);
    for (const frame of run.frames.filter(f => f.year < 2009)) expect(arrival(frame.state)?.players).toEqual([]);
    for (const row of run.priorArrivalWrites) expect(row.after, row.action).toEqual(row.before);
    expect(localStorage.getItem(OTHER)).toBe('untouched');
  });

  it('all four entries survive complete reload and later era club changes', async () => {
    const ui = await createFromUi();
    const to2009 = journey(ui.state, 2009), load2009 = wholeLoad(to2009.state);
    const to2019 = journey(load2009.state, 2019), load2019 = wholeLoad(to2019.state);
    const expected = [
      { id: 'soccer:neymar', name: 'Neymar', entryYear: 2009, entryClub: 'Santos' },
      { id: 'soccer:mbappe', name: 'Kylian Mbappé', entryYear: 2015, entryClub: 'Monaco' },
      { id: 'soccer:haaland', name: 'Erling Haaland', entryYear: 2016, entryClub: 'Bryne' },
      { id: 'soccer:bellingham', name: 'Jude Bellingham', entryYear: 2019, entryClub: 'Birmingham City' },
    ];
    retain('continuity', { ui, to2009, load2009, to2019, load2019, uiDraws, mainDraws, storage: storage() });
    expect(arrival(load2019.state)?.players, 'SC_REAL_ENTRY_CONTINUITY').toEqual(expected.map(({ name, ...entry }) => entry));
    for (const frame of [...to2009.frames, ...to2019.frames])
      expect(arrival(frame.state)?.players, 'SC_REAL_ENTRY_DUE_YEAR').toEqual(expected.filter(p => p.entryYear <= frame.year).map(({ name, ...entry }) => entry));
    for (const player of expected)
      expect(worldClubOf(load2019.state, player.name), 'SC_REAL_ENTRY_OWN_SAVED_CLUB').toBe(player.entryClub);
    expect(getEraStars(2015).find(row => row.name === 'Neymar')?.club).toBe('PSG');
    expect(Object.keys(load2019.state.phone!.clubs).length).toBeLessThanOrEqual(28);
    expect(Object.prototype.hasOwnProperty.call(load2019.state.phone!.clubs, 'Kylian Mbappe')).toBe(false);
    expect(load2009.loadedBytes).toBe(load2009.bytes); expect(load2019.loadedBytes).toBe(load2019.bytes);
    for (const row of [...to2009.priorArrivalWrites, ...to2019.priorArrivalWrites]) expect(row.after, row.action).toEqual(row.before);
    expect(localStorage.getItem(OTHER)).toBe('untouched');
  });

  it('SportsFeed keeps the sourced entry separate from the persistent career world club', async () => {
    const ui = await createFromUi(), run = journey(ui.state, 2019);
    // Declared transient-feed pruning boundary, derived from the actual UI career.
    const input = plain(run.state);
    expect(input.phone).toBeDefined(); input.phone!.feed = [];
    const before = serializeSoccerCareerSave(input), beforeStorage = storage(), beforeDraws = mainDraws.length;
    const view = render(<PhonePanel career={input} onAnswer={() => undefined} onMoney={() => undefined} onBuyItem={() => undefined} onClose={() => undefined} />);
    fireEvent.click(view.getByRole('button', { name: /SportsFeed/ }));
    const first = view.container.innerHTML;
    fireEvent.click(view.getByRole('button', { name: /Home/ }));
    fireEvent.click(view.getByRole('button', { name: /SportsFeed/ }));
    const region = view.queryByRole('region', { name: 'Real player arrivals' });
    const after = serializeSoccerCareerSave(input);
    retain('phone-card', { ui, run, condition: 'Actual UI career with only the transient feed cleared; no entrant is inserted',
      input, before, after, firstHtml: first, reopenedHtml: view.container.innerHTML,
      beforeStorage, afterStorage: storage(), beforeDraws, afterDraws: mainDraws.length, uiDraws, mainDraws });
    expect(region, 'SC_REAL_ENTRY_PHONE_CARD').not.toBeNull();
    const card = within(region!);
    expect(card.getByText('Neymar', { exact: true })).toBeInTheDocument();
    for (const name of ['Neymar', 'Kylian Mbappé', 'Erling Haaland', 'Jude Bellingham'])
      expect(card.getByText(name, { exact: true })).toBeInTheDocument();
    for (const entry of ['2009 at Santos', '2015 at Monaco', '2016 at Bryne', '2019 at Birmingham City'])
      expect(region!.textContent).toContain(entry);
    expect(region!.textContent).toMatch(/First-team entry/i);
    expect(region!.textContent).toMatch(/Development and results are simulated/i);
    expect(card.getAllByRole('link')).toHaveLength(8);
    expect(region!.textContent).toMatch(/Career world/i);
    expect(region!.textContent).toMatch(/Santos/);
    expect(after).toBe(before); expect(storage()).toEqual(beforeStorage); expect(mainDraws).toHaveLength(beforeDraws);
  });

  it('legacy unmarked APIs and opaque future save versions keep their complete state and draw path', async () => {
    const ui = await createFromUi();
    const args = ui.args.slice(0, 13) as unknown as Parameters<typeof E.initCareer>;
    seedMain();
    action = 'legacy-init-with-existing-ui-arguments';
    const initial = E.initCareer(...args);
    localStorage.setItem(KEY, serializeSoccerCareerSave(initial));
    const run = journey(initial, 2010), loaded = wholeLoad(run.state);
    const opaque = { version: 999, players: [{ id: 'future:opaque', entryYear: 2009, club: 'opaque saved club', moves: [] }], extension: { keep: ['all', 'fields'] } };
    // Declared future-version codec boundary, not an enabled arrival or a real player row.
    const future = Object.assign(plain(run.state), { historicalArrivals: plain(opaque) });
    const futureLoaded = wholeLoad(future), futureInput = plain(futureLoaded.state);
    const beforeFuture = plain((futureInput as typeof future).historicalArrivals);
    const afterFuture = E.repairCareer(futureInput), futureRun = journey(afterFuture, 2011);
    retain('legacy', { condition: 'Declared legacy storage boundary: exact codec bytes from the real unmarked constructor replace only the earlier UI setup save', uiArgs: ui.args.slice(0, 13), initial, run, loaded, opaque, futureLoaded,
      afterFuture, futureRun, beforeFuture, uiDraws, mainDraws, storage: storage() });
    expect(own(initial)).toBe(false); expect(own(run.state)).toBe(false); expect(own(loaded.state)).toBe(false);
    expect(loaded.loadedBytes).toBe(loaded.bytes);
    expect((afterFuture as typeof future).historicalArrivals).toEqual(opaque);
    expect((futureRun.state as typeof future).historicalArrivals).toEqual(opaque);
    expect((futureInput as typeof future).historicalArrivals).toEqual(beforeFuture);
    expect(futureLoaded.loadedBytes).toBe(futureLoaded.bytes);
    expect(localStorage.getItem(OTHER)).toBe('untouched');
  });

  it('the authentic original version1 save keeps Neymar only and its original source card', async () => {
    const fixture = JSON.parse(fs.readFileSync(path.resolve('scripts/data/soccerHistoricalV1UiFixture.json'), 'utf8')) as { saved: string };
    const parsed = parseSoccerCareerSave(fixture.saved);
    expect(isSoccerCareerSave(parsed)).toBe(true);
    const original = parsed as E.CareerState;
    expect(serializeSoccerCareerSave(original), 'SC_REAL_ENTRY_AUTHENTIC_V1_CODEC').toBe(fixture.saved);
    expect(arrival(original)).toEqual({ version: 1, players: [] });
    const input = plain(original);
    seedMain();
    const repaired = E.repairCareer(input), run = journey(repaired, 2019), loaded = wholeLoad(run.state);
    expect(serializeSoccerCareerSave(original)).toBe(fixture.saved);
    expect(arrival(loaded.state), 'SC_REAL_ENTRY_V1_NOT_UPGRADED').toEqual({ version: 1, players: [
      { id: 'soccer:neymar', entryYear: 2009, entryClub: 'Santos' },
    ] });
    expect(loaded.loadedBytes).toBe(loaded.bytes);
    expect(worldClubOf(loaded.state, 'Neymar')).toBe('Santos');
    const display = plain(loaded.state);
    display.phone!.feed = [];
    const before = serializeSoccerCareerSave(display), beforeStorage = storage(), beforeDraws = mainDraws.length;
    const view = render(<PhonePanel career={display} onAnswer={() => undefined} onMoney={() => undefined} onBuyItem={() => undefined} onClose={() => undefined} />);
    fireEvent.click(view.getByRole('button', { name: /SportsFeed/ }));
    const region = view.getByRole('region', { name: 'Real player arrivals' });
    expect(region.textContent).toMatch(/Senior debut/i);
    expect(region.textContent).toMatch(/7 March 2009/);
    expect(region.textContent).toMatch(/Brazil/);
    expect(region.textContent).toMatch(/Attacker/i);
    expect(region.textContent).toMatch(/\b17\b/);
    for (const name of ['Kylian Mbappé', 'Erling Haaland', 'Jude Bellingham'])
      expect(within(region).queryByText(name, { exact: true })).toBeNull();
    expect(serializeSoccerCareerSave(display)).toBe(before);
    expect(storage()).toEqual(beforeStorage); expect(mainDraws).toHaveLength(beforeDraws);
    retain('original-v1', { fixture, original, repaired, run, loaded, uiDraws, mainDraws, storage: storage() });
  });

  it('the actual newer era creation UI keeps its unmarked saved default', async () => {
    const ui = await createFromUi('2025'), loaded = wholeLoad(ui.state);
    retain('newer-ui', { ui, loaded, uiDraws, mainDraws, storage: storage() });
    expect(year(ui.state)).toBe(2025); expect(ui.args).toHaveLength(13);
    expect(own(ui.state)).toBe(false); expect(own(loaded.state)).toBe(false);
    // Fresh creation has the existing load-default normalization; both full frames are retained.
    expect(localStorage.getItem(OTHER)).toBe('untouched');
  });
});
