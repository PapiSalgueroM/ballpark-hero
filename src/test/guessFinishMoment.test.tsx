import { act, cleanup, fireEvent, render, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { F1DriverBoard } from '@/components/f1-driver/F1DriverBoard';
import { ChainFinishMoment, chainOutcome, useLiveFinish } from '@/components/guess-finish/GuessFinish';
import { useFreshFinish } from '@/components/game/RestoredResult';
import { getTennisEarnedBadge } from '@/types/tennisChain';
import { getNascarEarnedBadge } from '@/types/nascarChain';
import { getEarnedBadge } from '@/types/ufcChain';

/**
 * Round 953: the clue guessers and the chains end on the shared result moment,
 * and the moment plays once, for a finish the player watched happen. The real
 * F1 driver board stands in for the five clue guessers (they share the end
 * block line for line, and GuessFinish is the one copy of the moment they
 * mount); the chain bands are walked step by step against all three games'
 * own badge tables.
 */
const fixture = vi.hoisted(() => ({
  puzzle: { id: 'fiction-racer', driverName: 'Fixture Racer', commonNames: ['Fixture Racer'], clues: ['First clue', 'Second clue', 'Third clue', 'Fourth clue', 'Fifth clue', 'Sixth clue'] },
}));
vi.mock('@/data/f1Drivers', () => ({ getDailyF1Puzzle: () => fixture.puzzle, getRandomF1Puzzle: () => fixture.puzzle,
  resolveF1Driver: (name: string) => ({ id: name === 'Fixture Racer' ? fixture.puzzle.id : 'fiction-other' }) }));
vi.mock('@/components/f1-driver/F1DriverSearch', () => ({ F1DriverSearch: ({ onGuess }: { onGuess: (name: string) => void }) => <div><button onClick={() => onGuess('Fixture Racer')}>Fixture correct guess</button><button onClick={() => onGuess('Fixture Other')}>Fixture wrong guess</button></div> }));
vi.mock('@/components/f1-driver/F1DriverHowToPlay', () => ({ F1DriverHowToPlay: () => null }));
vi.mock('@/hooks/useScrollToGame', () => ({ useScrollToGame: () => ({ current: null }) }));
vi.mock('@/components/game/GameNav', () => ({ GameNav: () => null }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null, refreshProfile: () => {} }) }));
vi.mock('@/lib/completions', () => ({ recordCompletion: vi.fn(), getCurrentPlayerName: () => 'FixtureBaller' }));
vi.mock('@/lib/badges', () => ({ getNewlyEarnedBadges: async () => [] }));

type View = ReturnType<typeof render>;
const mount = () => render(<MemoryRouter><F1DriverBoard /></MemoryRouter>);
const click = (view: View, name: string | RegExp) => fireEvent.click(view.getByRole('button', { name }));
const tick = (ms: number) => act(() => { vi.advanceTimersByTime(ms); });
const moment = (view: View) => view.container.querySelector<HTMLElement>('[data-result-moment]');
const finish = (view: View) => view.container.querySelector<HTMLElement>('[data-guess-finish]');
const pill = (view: View) => view.container.querySelector<HTMLElement>('[data-result-score]')?.textContent;
const settled = (view: View) => Boolean(finish(view)?.closest('[data-result-settled]'));
const confetti = (view: View) => view.container.querySelectorAll('.cm-confetti').length;

beforeEach(() => {
  localStorage.clear(); vi.clearAllMocks(); vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-01T16:00:00Z'));
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });

describe('a clue guesser ends on the shared result moment', () => {
  it('plays a live win with the points the board scored, and keeps the answer line, share and nothing invented', () => {
    const view = mount(); click(view, /Daily Challenge/); click(view, 'Fixture correct guess');
    expect(moment(view)).toHaveAttribute('data-result-moment', 'win');
    expect(finish(view)).toHaveAttribute('data-guess-finish', 'live');
    expect(settled(view)).toBe(false);
    expect(pill(view)).toBe('1000');
    expect(confetti(view)).toBe(28);
    expect(view.getByText('1000 pts')).toBeVisible();
    expect(view.getByText('Fixture Racer')).toBeVisible();
    tick(600);
    expect(finish(view)).toHaveAttribute('data-guess-finish', 'live');
  });

  it('walks every clue: the pill shows exactly the score the board saved', () => {
    for (const hints of [0, 1, 2, 3, 4, 5]) {
      localStorage.clear();
      const view = mount(); click(view, /Unlimited Mode/);
      for (let h = 0; h < hints; h++) click(view, /^💡 Hint/);
      click(view, 'Fixture correct guess');
      const scoreLine = view.getByText(/ pts$/, { selector: 'span' }).textContent!;
      expect(pill(view)).toBe(scoreLine.replace(' pts', ''));
      cleanup();
    }
  });

  it('plays a live loss quietly: the loss state, zero points, no confetti', () => {
    const view = mount(); click(view, /Unlimited Mode/); click(view, 'Fixture wrong guess'); tick(650);
    click(view, /^🏳️ Give Up$/); click(view, 'Yes, Give Up');
    expect(moment(view)).toHaveAttribute('data-result-moment', 'loss');
    expect(pill(view)).toBe('0');
    expect(confetti(view)).toBe(0);
    expect(finish(view)).toHaveAttribute('data-guess-finish', 'live');
    expect(view.getByText('It was Fixture Racer')).toBeVisible();
  });

  it('shows a reloaded daily settled, with the same facts and no confetti', () => {
    const first = mount(); click(first, /Daily Challenge/); click(first, 'Fixture correct guess');
    expect(finish(first)).toHaveAttribute('data-guess-finish', 'live');
    first.unmount();
    const again = mount(); click(again, /Daily Challenge/);
    expect(moment(again)).toHaveAttribute('data-result-moment', 'win');
    expect(finish(again)).toHaveAttribute('data-guess-finish', 'restored');
    expect(settled(again)).toBe(true);
    expect(pill(again)).toBe('1000');
    expect(confetti(again)).toBe(0);
  });

  it('keeps an old daily settled when it is reopened from the menu after a live unlimited game', () => {
    const first = mount(); click(first, /Daily Challenge/); click(first, 'Fixture correct guess'); first.unmount();
    const view = mount(); click(view, /Unlimited Mode/); click(view, 'Fixture correct guess');
    expect(finish(view)).toHaveAttribute('data-guess-finish', 'live');
    click(view, 'Play Again'); click(view, /Daily Challenge/);
    expect(finish(view)).toHaveAttribute('data-guess-finish', 'restored');
    expect(settled(view)).toBe(true);
    expect(confetti(view)).toBe(0);
  });
});

describe('useLiveFinish plays only a finish it watched', () => {
  const watch = () => renderHook(({ gameKey, done }: { gameKey: string | null; done: boolean }) => useLiveFinish(gameKey, done), { initialProps: { gameKey: null as string | null, done: false } });

  it('forgets the game at the menu, so a live finish reopened under the same key stays settled', () => {
    const view = watch();
    view.rerender({ gameKey: 'daily:fixture', done: false });
    expect(view.result.current).toBe(false);
    view.rerender({ gameKey: 'daily:fixture', done: true });
    expect(view.result.current).toBe(true);
    view.rerender({ gameKey: null, done: false });
    view.rerender({ gameKey: 'daily:fixture', done: true });
    expect(view.result.current).toBe(false);
  });

  /* The four Round 951 dailies call the same hook with no key: one game per
     mount, a loading render never counts as play, a restored finish never plays. */
  it('keeps Round 951 dailies on their rule when no key is given', () => {
    const fresh = renderHook(({ ready, done }: { ready: boolean; done: boolean }) => useFreshFinish(ready, done), { initialProps: { ready: false, done: false } });
    fresh.rerender({ ready: false, done: true });
    expect(fresh.result.current).toBe(false);
    fresh.rerender({ ready: true, done: false });
    fresh.rerender({ ready: true, done: true });
    expect(fresh.result.current).toBe(true);
    const restored = renderHook(({ ready, done }: { ready: boolean; done: boolean }) => useFreshFinish(ready, done), { initialProps: { ready: false, done: false } });
    restored.rerender({ ready: true, done: true });
    expect(restored.result.current).toBe(false);
  });

  it('keeps a different game that arrives already finished settled', () => {
    const view = watch();
    view.rerender({ gameKey: 'unlimited:fixture-a', done: false });
    view.rerender({ gameKey: 'unlimited:fixture-a', done: true });
    expect(view.result.current).toBe(true);
    view.rerender({ gameKey: 'daily:fixture-b', done: true });
    expect(view.result.current).toBe(false);
  });
});

describe('a chain ends on the shared result moment', () => {
  const tables = [
    { game: '/tennis-chain', badgeAt: getTennisEarnedBadge },
    { game: '/nascar-chain', badgeAt: getNascarEarnedBadge },
    { game: '/ufc-chain', badgeAt: getEarnedBadge },
  ];

  /* Every chain ends on a break, so the state never follows the badge. The
     walk runs every length from 0 to 25, and each game's own table is checked
     to reward some of those lengths and not others, so the walk covers a
     close run with a badge and one without. Whether the board shows them is
     guessFinishChainBoards' job. */
  it('calls every chain that added a link close, badge or not, at every length from 0 to 25', () => {
    for (const { badgeAt } of tables) {
      const firstBadge = Array.from({ length: 26 }, (_, n) => n).find(n => badgeAt(n) !== undefined)!;
      expect(firstBadge).toBeGreaterThan(1);
      for (let length = 0; length <= 25; length++) {
        expect(chainOutcome(length)).toBe(length === 0 ? 'loss' : 'close');
      }
    }
  });

  it('shows the chain length, the badge the game earned and the reason it gave, and plays only when live', () => {
    for (const { game, badgeAt } of tables) {
      expect(badgeAt(2)).toBeUndefined();
      expect(badgeAt(12)).toBeDefined();
      for (const length of [0, 2, 12]) {
        const badge = badgeAt(length);
        const reason = length === 0 ? 'You gave up!' : 'Incorrect! That link does not hold.';
        for (const live of [true, false]) {
          const view = render(<ChainFinishMoment chainLength={length} badge={badge} reason={reason} gamePath={game} live={live} />);
          expect(moment(view)).toHaveAttribute('data-result-moment', length === 0 ? 'loss' : 'close');
          expect(pill(view)).toBe(String(length));
          expect(view.getByRole('heading', { level: 2 })).toHaveTextContent(badge ? badge.name : 'Game Over!');
          expect(view.getByText(reason)).toBeVisible();
          expect(settled(view)).toBe(!live);
          expect(confetti(view)).toBe(0);
          cleanup();
        }
      }
    }
  });
});
