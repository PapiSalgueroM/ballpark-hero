import { act, cleanup, fireEvent, render, within, type RenderResult } from '@testing-library/react';
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute } from 'node:path';
import FantasyDraft from '@/pages/FantasyDraft';
import type { DraftPlayer } from '@/components/fantasy-draft/PlayerPool';
import { settleSeason } from '@/lib/searchDiscard';
import { recordCompletion } from '@/lib/completions';

type CriteriaResponse = { data: { criteria: string | null } | null; error: unknown };
const remote = vi.hoisted(() => ({
  players: [] as DraftPlayer[],
  criteria: null as Promise<CriteriaResponse> | null,
  criteriaRequests: 0,
  marketRequests: 0,
  draws: [] as number[],
  toast: vi.fn(),
}));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: { invoke: vi.fn((name: string) => {
      if (name !== 'fantasy-draft-daily' || !remote.criteria) throw new Error('Unexpected criteria request');
      remote.criteriaRequests += 1;
      return remote.criteria;
    }) },
    from: vi.fn((table: string) => {
      if (table !== 'fantasy_draft_players') throw new Error('Unexpected fixture table: ' + table);
      remote.marketRequests += 1;
      return { select: () => ({ order: async () => ({ data: remote.players, error: null }) }) };
    }),
  },
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null }) }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: remote.toast }) }));
vi.mock('@/components/game/GameNavbar', () => ({ GameNavbar: () => null }));
vi.mock('@/components/game/GameHelp', () => ({ GameHelp: () => null }));
vi.mock('@/components/seo/PageSeo', () => ({ default: () => null }));
vi.mock('@/components/seo/GameSeoContent', () => ({ default: () => null }));
vi.mock('@/lib/completions', () => ({ recordCompletion: vi.fn(), getCurrentPlayerName: () => 'Fixture Manager' }));
vi.mock('@/lib/searchDiscard', async original => {
  const actual = await original<typeof import('@/lib/searchDiscard')>();
  return { ...actual, settleSeason: vi.fn(actual.settleSeason) };
});

const UNDER25 = 'Under 25s: Every player must be 25 or younger';
const LEGACY = 'Golden Era XI';
const VETERAN = 'Fixture Veteran FWD';
const raw = { version: 1, scope: 'Actual FantasyDraft page, PlayerPool, DraftRoster, eligibility and seat/AI timers. Only external transport, auth/completion and non-game shell boundaries are mocked. Every player is fictional.',
  cases: {} as Record<string, { frames: unknown[] }> };
let pending: ReturnType<typeof deferred<CriteriaResponse>>;
let mounted: RenderResult | null = null;
let activeCase = '';

function deferred<T>() {
  let resolve!: (value: T) => void, reject!: (reason: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
function fixture(): DraftPlayer[] {
  const young = ([['GK', 4, 10], ['DEF', 8, 20], ['MID', 6, 30], ['FWD', 8, 40]] as const)
    .flatMap(([position, count, value]) => Array.from({ length: count }, (_, i) => ({
      id: 'fixture-' + position + '-' + i, name: 'Fixture ' + position + ' ' + String(i).padStart(2, '0'),
      position, nationality: 'Fixture Country', dominant_foot: 'Right', market_value_millions: value, age: 24,
    })));
  return [...young, { id: 'fixture-veteran', name: VETERAN, position: 'FWD',
    nationality: 'Fixture Country', dominant_foot: 'Right', market_value_millions: 900, age: 40 }];
}
const flush = async () => { await act(async () => {}); };
function storage() {
  return Object.fromEntries(Object.keys(localStorage).sort().map(key => [key, localStorage.getItem(key)]));
}
function names(view: RenderResult, side: 'Your XI' | 'AI XI') {
  const heading = within(view.container).queryByText(side, { exact: true });
  if (!heading) return [];
  const column = heading.parentElement!.parentElement!;
  return [...column.querySelectorAll('[data-draft-slot]')].flatMap(slot => {
    const name = slot.querySelector('[title]')?.getAttribute('title');
    return name ? [name] : [];
  });
}
function observe(label: string, view: RenderResult) {
  const state = {
    startPresent: !!within(view.container).queryByRole('button', { name: 'Start Draft' }),
    poolPresent: !!within(view.container).queryByRole('heading', { name: 'Player Pool' }),
    userTurn: !!within(view.container).queryByText('Your Pick', { exact: true }),
    human: names(view, 'Your XI'), ai: names(view, 'AI XI'), draws: [...remote.draws],
    criteriaRequests: remote.criteriaRequests, marketRequests: remote.marketRequests,
    settleCalls: vi.mocked(settleSeason).mock.calls.length, completions: vi.mocked(recordCompletion).mock.calls.length,
    storage: storage(),
  };
  (raw.cases[activeCase] ??= { frames: [] }).frames.push({
    label, state, inputPool: remote.players.map(player => ({ ...player })), html: view.container.innerHTML,
  });
  return state;
}
function playerButton(view: RenderResult, name: string, id: string) {
  const search = within(view.container).queryByRole('textbox', { name: 'Search players' });
  expect(search, id + ' actual search is available').not.toBeNull();
  fireEvent.change(search!, { target: { value: name } });
  const heading = within(view.container).queryByRole('heading', { name: 'Player Pool' });
  expect(heading, id + ' actual pool is available').not.toBeNull();
  const match = within(heading!.parentElement!.parentElement!).queryByText(name, { selector: 'p', exact: true });
  expect(match, id + ' fixture candidate is displayed').not.toBeNull();
  const button = match!.closest('button');
  expect(button, id + ' fixture has a native selection control').not.toBeNull();
  return button!;
}
async function start(view: RenderResult, id: string) {
  const button = within(view.container).queryByRole('button', { name: 'Start Draft' });
  expect(button, id + ' settled response leaves Start available').not.toBeNull();
  expect(button, id + ' settled response permits Start').toBeEnabled();
  fireEvent.click(button!);
  await flush();
  expect(within(view.container).queryByRole('heading', { name: 'Player Pool' }), id + ' Start opens actual pool').not.toBeNull();
}
async function twoAiPicks() {
  await act(async () => { vi.advanceTimersByTime(2000); });
  await act(async () => { vi.advanceTimersByTime(2000); });
}
function expectRunning(view: RenderResult, human: string, ai: string[], id: string) {
  const actual = observe('after-native-human-and-two-ai-picks', view);
  expect(actual, id + ' original seat, snake turns, pool and non-completion effects').toEqual({
    startPresent: false, poolPresent: true, userTurn: true, human: [human], ai, draws: [0, 0, 0],
    criteriaRequests: 1, marketRequests: 1, settleCalls: 0, completions: 0, storage: { 'fd-unrelated': 'held' },
  });
}

beforeEach(async () => {
  // Initialize React's async-act scheduler before observing application draws.
  await flush();
  localStorage.clear(); localStorage.setItem('fd-unrelated', 'held');
  vi.clearAllMocks(); vi.useFakeTimers();
  remote.players = fixture(); remote.draws = []; remote.criteriaRequests = 0; remote.marketRequests = 0;
  pending = deferred<CriteriaResponse>(); remote.criteria = pending.promise;
  vi.spyOn(Math, 'random').mockImplementation(() => { remote.draws.push(0); return 0; });
  mounted = null; activeCase = '';
});
afterEach(() => {
  if (mounted) observe('final-before-cleanup', mounted);
  cleanup(); vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks(); localStorage.clear();
});
afterAll(() => {
  const destination = process.env.FD_RULES_START_RAW;
  if (!destination) return;
  if (!isAbsolute(destination)) throw new Error('FD_RULES_START_RAW must be absolute');
  mkdirSync(dirname(destination), { recursive: true });
  writeFileSync(destination, JSON.stringify(raw, null, 2) + '\n', { flag: 'wx' });
});

describe('Fantasy Draft waits for the daily criterion before starting', () => {
  for (const outcome of ['success', 'rejection'] as const) {
    it('FD_RULES_PENDING_' + outcome.toUpperCase() + ' refuses premature admission and resumes after the deferred callback', async () => {
      activeCase = outcome; const id = 'FD_RULES_PENDING_' + outcome.toUpperCase();
      const view = mounted = render(<FantasyDraft />);
      await flush();
      fireEvent.click(within(view.container).getByRole('button', { name: 'Start Draft' }));
      await flush();
      // Exercise the real harmful path if the original page exposes it early.
      if (within(view.container).queryByRole('heading', { name: 'Player Pool' })) {
        fireEvent.click(playerButton(view, VETERAN, id));
        await flush();
      }
      const beforeCallback = observe('pending-after-start-and-possible-pick', view);
      await act(async () => {
        if (outcome === 'success') pending.resolve({ data: { criteria: UNDER25 }, error: null });
        else pending.reject(new Error('Fictional criteria transport unavailable'));
      });
      const afterCallback = observe('deferred-criteria-settled', view);
      const waiting = {
        startPresent: true, poolPresent: false, userTurn: false, human: [], ai: [], draws: [],
        criteriaRequests: 1, marketRequests: 0, settleCalls: 0, completions: 0, storage: { 'fd-unrelated': 'held' },
      };
      expect([beforeCallback, afterCallback], id + ' no draft, seat draw or player admission before the rule settles')
        .toEqual([waiting, waiting]);
      await start(view, id);
      const veteran = playerButton(view, VETERAN, id);
      if (outcome === 'success') {
        expect(veteran, id + ' late known rule blocks an over-age forward').toBeDisabled();
        fireEvent.click(veteran);
        expect(names(view, 'Your XI'), id + ' refused over-age selection leaves XI empty').toEqual([]);
        fireEvent.click(playerButton(view, 'Fixture FWD 00', id));
      } else {
        expect(veteran, id + ' settled unavailable criterion keeps existing unrestricted behavior').toBeEnabled();
        fireEvent.click(veteran);
      }
      await twoAiPicks();
      expectRunning(view, outcome === 'success' ? 'Fixture FWD 00' : VETERAN,
        outcome === 'success' ? ['Fixture FWD 01', 'Fixture FWD 02'] : ['Fixture FWD 00', 'Fixture FWD 01'], id);
    });
  }

  for (const [key, criteria] of [['null', null], ['legacy', LEGACY]] as const) {
    it('FD_RULES_SETTLED_' + key.toUpperCase() + ' preserves permissive picks and the original AI turn sequence', async () => {
      activeCase = key; const id = 'FD_RULES_SETTLED_' + key.toUpperCase();
      const view = mounted = render(<FantasyDraft />);
      await act(async () => { pending.resolve({ data: { criteria }, error: null }); });
      observe('criterion-settled-before-start', view);
      if (criteria) expect(within(view.container).queryByText(criteria, { exact: true }), id + ' legacy label remains visible').not.toBeNull();
      await start(view, id);
      const veteran = playerButton(view, VETERAN, id);
      expect(veteran, id + ' existing unenforced criterion permits over-age player').toBeEnabled();
      fireEvent.click(veteran);
      await twoAiPicks();
      expectRunning(view, VETERAN, ['Fixture FWD 00', 'Fixture FWD 01'], id);
    });
  }
});
