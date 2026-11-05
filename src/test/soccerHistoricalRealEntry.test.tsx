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

describe('Soccer Career first historical real entry', () => {
  it('the actual 2005 creation path admits Neymar once at Santos in 2009', async () => {
    const ui = await createFromUi();
    const run = journey(ui.state, 2009);
    retain('entry', { ui, ...run, uiDraws, mainDraws, storage: storage() });
    const entrant = arrival(run.state)?.players;
    expect(entrant, 'SC_REAL_ENTRY_2009').toEqual([{ id: 'soccer:neymar', entryYear: 2009, entryClub: 'Santos' }]);
    expect(arrival(run.state)?.version).toBe(1);
    for (const frame of run.frames.filter(f => f.year < 2009)) expect(arrival(frame.state)?.players).toEqual([]);
    for (const row of run.priorArrivalWrites) expect(row.after, row.action).toEqual(row.before);
    expect(localStorage.getItem(OTHER)).toBe('untouched');
  });

  it('the actual entry survives complete reload and the 2015 era club change', async () => {
    const ui = await createFromUi();
    const to2009 = journey(ui.state, 2009), load2009 = wholeLoad(to2009.state);
    const to2015 = journey(load2009.state, 2015), load2015 = wholeLoad(to2015.state);
    const resolved = worldClubOf(load2015.state, 'Neymar');
    const poolRow = getEraStars(2015).find(row => row.name === 'Neymar');
    retain('continuity', { ui, to2009, load2009, to2015, load2015, resolved, poolRow, uiDraws, mainDraws, storage: storage() });
    expect(arrival(load2015.state)?.players, 'SC_REAL_ENTRY_CONTINUITY').toEqual([{ id: 'soccer:neymar', entryYear: 2009, entryClub: 'Santos' }]);
    expect(poolRow?.club, 'SC_REAL_ENTRY_ACTUAL_2015_POOL').toBe('PSG');
    expect(resolved, 'SC_REAL_ENTRY_SAVED_CLUB_RESOLVER').toBe('Santos');
    expect(load2009.loadedBytes).toBe(load2009.bytes); expect(load2015.loadedBytes).toBe(load2015.bytes);
    for (const row of [...to2009.priorArrivalWrites, ...to2015.priorArrivalWrites]) expect(row.after, row.action).toEqual(row.before);
    expect(localStorage.getItem(OTHER)).toBe('untouched');
  });

  it('SportsFeed keeps the sourced entry separate from the persistent career world club', async () => {
    const ui = await createFromUi(), run = journey(ui.state, 2009);
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
    expect(region!.textContent).toMatch(/Senior debut/i);
    expect(region!.textContent).toMatch(/7 March 2009/);
    expect(region!.textContent).toMatch(/Brazil/);
    expect(region!.textContent).toMatch(/Attacker/i);
    expect(region!.textContent).toMatch(/\b17\b/);
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
    const run = journey(initial, 2010), loaded = wholeLoad(run.state);
    const opaque = { version: 999, players: [{ id: 'future:opaque', entryYear: 2009, club: 'opaque saved club', moves: [] }], extension: { keep: ['all', 'fields'] } };
    // Declared future-version codec boundary, not an enabled arrival or a real player row.
    const future = Object.assign(plain(run.state), { historicalArrivals: plain(opaque) });
    const futureLoaded = wholeLoad(future), futureInput = plain(futureLoaded.state);
    const beforeFuture = plain((futureInput as typeof future).historicalArrivals);
    const afterFuture = E.repairCareer(futureInput), futureRun = journey(afterFuture, 2011);
    retain('legacy', { uiArgs: ui.args.slice(0, 13), initial, run, loaded, opaque, futureLoaded,
      afterFuture, futureRun, beforeFuture, uiDraws, mainDraws, storage: storage() });
    expect(own(initial)).toBe(false); expect(own(run.state)).toBe(false); expect(own(loaded.state)).toBe(false);
    expect(loaded.loadedBytes).toBe(loaded.bytes);
    expect((afterFuture as typeof future).historicalArrivals).toEqual(opaque);
    expect((futureRun.state as typeof future).historicalArrivals).toEqual(opaque);
    expect((futureInput as typeof future).historicalArrivals).toEqual(beforeFuture);
    expect(futureLoaded.loadedBytes).toBe(futureLoaded.bytes);
    expect(localStorage.getItem(OTHER)).toBe('untouched');
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
