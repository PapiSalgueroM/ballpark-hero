import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import type { ComponentType } from 'react';
import { TennisChainBoard } from '@/components/tennis-chain/TennisChainBoard';
import { NascarChainBoard } from '@/components/nascar-chain/NascarChainBoard';
import { CombatChainBoard } from '@/components/ufc-chain/CombatChainBoard';
import { recordCompletion } from '@/lib/completions';
import { getTennisEarnedBadge } from '@/types/tennisChain';
import { getNascarEarnedBadge } from '@/types/nascarChain';
import { getEarnedBadge } from '@/types/ufcChain';

/**
 * Round 953 review fix: the three chain BOARDS are mounted and played, so
 * the pill is checked against what each board itself built (the links the
 * test added, the timeline it drew) and against the score it filed, never
 * against a number the test hands the moment. Every name, fighter and
 * validator answer below is a synthetic fixture.
 */
const boundary = vi.hoisted(() => ({ invoke: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => {
  type Reply = { data: never[]; count: number; error: null };
  type Query = { select: () => Query; order: () => Query; limit: () => Query; gt: () => Query; insert: () => Promise<{ error: null }>; then: (done: (reply: Reply) => unknown) => Promise<unknown> };
  const query: Query = { select: () => query, order: () => query, limit: () => query, gt: () => query, insert: async () => ({ error: null }), then: done => Promise.resolve({ data: [], count: 0, error: null }).then(done) };
  return { supabase: { functions: { invoke: boundary.invoke }, from: () => query } };
});
vi.mock('@/data/ufcChainData', () => {
  const UFC_FIGHTERS = Array.from({ length: 13 }, (_, i) => ({ name: `Fixture Link ${i}`, weightClass: 'Fixture class', record: '1-1-0', wins: 1, losses: 1, draws: 0 }));
  const at = (name: string) => UFC_FIGHTERS.findIndex(f => f.name === name);
  return {
    UFC_FIGHTERS, getFightResult: () => undefined, getHallOfFamers: () => [], getFightersByWeightClass: () => UFC_FIGHTERS,
    getFightersWhoBeat: (name: string) => UFC_FIGHTERS.slice(at(name) + 1, at(name) + 2),
    getRandomStartingFighter: () => UFC_FIGHTERS[0], getDailyStartingFighter: () => UFC_FIGHTERS[0],
  };
});
vi.mock('@/components/tennis-chain/TennisChainSearch', () => ({ TennisChainSearch: ({ onSelect }: { onSelect: (name: string) => void }) => <div>{Array.from({ length: 13 }, (_, i) => <button key={i} onClick={() => onSelect(`Fixture Link ${i}`)}>Pick Fixture Link {i}</button>)}</div> }));
vi.mock('@/components/nascar-chain/NascarChainSearch', () => ({ NascarChainSearch: ({ onSelect }: { onSelect: (name: string) => void }) => <div>{Array.from({ length: 13 }, (_, i) => <button key={i} onClick={() => onSelect(`Fixture Link ${i}`)}>Pick Fixture Link {i}</button>)}</div> }));
vi.mock('@/components/ufc-chain/UfcChainSearch', () => ({ UfcChainSearch: ({ onSelect }: { onSelect: (fighter: { name: string }) => void }) => <div>{Array.from({ length: 13 }, (_, i) => <button key={i} onClick={() => onSelect({ name: `Fixture Link ${i}` })}>Pick Fixture Link {i}</button>)}</div> }));
vi.mock('@/components/tennis-chain/TennisChainTimeline', () => ({ TennisChainTimeline: ({ chain }: { chain: unknown[] }) => <ol>{chain.map((_, i) => <li key={i} data-fixture-link />)}</ol> }));
vi.mock('@/components/nascar-chain/NascarChainTimeline', () => ({ NascarChainTimeline: ({ chain }: { chain: unknown[] }) => <ol>{chain.map((_, i) => <li key={i} data-fixture-link />)}</ol> }));
vi.mock('@/components/ufc-chain/ChainTimeline', () => ({ ChainTimeline: ({ chain }: { chain: unknown[] }) => <ol>{chain.map((_, i) => <li key={i} data-fixture-link />)}</ol> }));
vi.mock('@/hooks/useScrollToGame', () => ({ useScrollToGame: () => ({ current: null }) }));
vi.mock('@/components/game/GameNav', () => ({ GameNav: () => null }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null, refreshProfile: () => {} }) }));
vi.mock('@/lib/completions', () => ({ recordCompletion: vi.fn(), getCurrentPlayerName: () => 'ChainFixtureGuest' }));
vi.mock('@/lib/badges', () => ({ getNewlyEarnedBadges: async () => [] }));
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock('@/lib/dateUtils', () => ({ getTodayET: () => '2026-10-02' }));

type View = ReturnType<typeof render>;
type Game = { label: string; Board: ComponentType; daily: RegExp; validated: boolean; badgeAt: (n: number) => { name: string } | undefined };
const games: Game[] = [
  { label: 'Tennis Chain', Board: TennisChainBoard, daily: /Daily Challenge/, validated: true, badgeAt: getTennisEarnedBadge },
  { label: 'NASCAR Chain', Board: NascarChainBoard, daily: /Daily Challenge/, validated: true, badgeAt: getNascarEarnedBadge },
  { label: 'Combat Chain', Board: CombatChainBoard, daily: /Daily/, validated: false, badgeAt: getEarnedBadge },
];

const q = (view: View, selector: string) => view.container.querySelector<HTMLElement>(selector);
const pill = (view: View) => q(view, '[data-result-score]')?.textContent;
const links = (view: View) => view.container.querySelectorAll('[data-fixture-link]').length;
const confetti = (view: View) => view.container.querySelectorAll('.cm-confetti').length;
const finalScore = (view: View) => Number(view.getByText(/^Final Score:/).textContent!.replace(/\D/g, ''));
const filedScore = () => vi.mocked(recordCompletion).mock.calls.at(-1)?.[1];

async function play(game: Game, add: number, end: 'give up' | 'wrong link') {
  const view = render(<MemoryRouter><game.Board /></MemoryRouter>);
  await act(async () => { fireEvent.click(view.getAllByRole('button', { name: game.daily })[0]); });
  for (let i = 1; i <= add; i++) {
    if (game.validated) boundary.invoke.mockResolvedValueOnce({ data: { valid: true, fullName: `Fixture Link ${i}`, connection: 'Synthetic fixture connection' }, error: null });
    await act(async () => { fireEvent.click(view.getByRole('button', { name: `Pick Fixture Link ${i}` })); });
  }
  if (end === 'give up') await act(async () => { fireEvent.click(view.getByRole('button', { name: 'Give Up' })); });
  else {
    if (game.validated) boundary.invoke.mockResolvedValueOnce({ data: { valid: false, reason: 'Synthetic: that link does not hold.' }, error: null });
    await act(async () => { fireEvent.click(view.getByRole('button', { name: `Pick Fixture Link ${add + 2}` })); });
  }
  return view;
}

beforeEach(() => { vi.clearAllMocks(); boundary.invoke.mockReset(); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

for (const game of games) describe(game.label, () => {
  const firstBadge = Array.from({ length: 26 }, (_, n) => n).find(n => game.badgeAt(n) !== undefined)!;

  it(`${game.label}: giving up on the starting name is a loss, the pill 0 and the board's score 0`, async () => {
    const view = await play(game, 0, 'give up');
    expect(links(view)).toBe(1);
    expect(q(view, '[data-result-moment]')).toHaveAttribute('data-result-moment', 'loss');
    expect(pill(view)).toBe('0');
    expect(view.getByRole('heading', { level: 2 })).toHaveTextContent('Game Over!');
    expect(view.getByText('You gave up!')).toBeVisible();
    expect(finalScore(view)).toBe(0);
    expect(filedScore()).toBe(0);
    expect(confetti(view)).toBe(0);
    expect(q(view, '[data-guess-finish]')).toHaveAttribute('data-guess-finish', 'live');
  });

  it(`${game.label}: a wrong link after two is close, the pill the two links the board built`, async () => {
    const view = await play(game, 2, 'wrong link');
    expect(links(view)).toBe(3);
    expect(q(view, '[data-result-moment]')).toHaveAttribute('data-result-moment', 'close');
    expect(pill(view)).toBe(String(links(view) - 1));
    expect(q(view, '[data-chain-end-reason]')?.textContent).toBeTruthy();
    expect(finalScore(view)).toBe(200);
    expect(filedScore()).toBe(finalScore(view));
    expect(confetti(view)).toBe(0);
    expect(q(view, '[data-guess-finish]')).toHaveAttribute('data-guess-finish', 'live');
  });

  it(`${game.label}: a run to the first badge is a win under that badge, with confetti`, async () => {
    const view = await play(game, firstBadge, 'wrong link');
    expect(links(view)).toBe(firstBadge + 1);
    expect(q(view, '[data-result-moment]')).toHaveAttribute('data-result-moment', 'win');
    expect(pill(view)).toBe(String(firstBadge));
    expect(view.getByRole('heading', { level: 2 })).toHaveTextContent(game.badgeAt(firstBadge)!.name);
    expect(filedScore()).toBe(finalScore(view));
    expect(finalScore(view)).toBeGreaterThan(0);
    expect(confetti(view)).toBe(28);
    expect(q(view, '[data-guess-finish]')).toHaveAttribute('data-guess-finish', 'live');
  });
});
