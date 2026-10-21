/**
 * Round 1518: enter the actual saved game plan and start its fictional bout.
 * These checks first fail on the missing ring and playback controls, after
 * confirming that Fight has already stored exactly one completed outcome.
 */
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import FightCareerBoard from '@/components/fight-career/FightCareerBoard';
import { lifeNewCareer, lifeRunCamp, lifeTakeFight } from '@/lib/fightCareerLifeFlow';

vi.mock('@/lib/completions', () => ({ recordCompletion: vi.fn(), getCurrentPlayerName: () => null }));
vi.mock('@/lib/badges', () => ({ getNewlyEarnedBadges: async () => [] }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null, refreshProfile: vi.fn() }) }));

const SAVE_KEY = 'fight-career-save-v1';

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers();
  vi.stubGlobal('requestAnimationFrame', () => 1);
  vi.stubGlobal('cancelAnimationFrame', () => undefined);
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function startSavedBout() {
  const st = lifeRunCamp(
    lifeNewCareer('Ring Tester', 'welter', 'outboxer', 'allround', 'family', 'round-1518-ring'),
    { conditioning: 2, power: 2, defence: 1, speed: 1 },
  );
  const offer = st.offers[0];
  offer.opponent.name = 'Recap Opponent';
  const expected = lifeTakeFight(st, offer.id, ['box', 'press', 'counter']);
  expect(expected, 'The saved offer must produce a bout before presentation is tested').not.toBeNull();
  expect(expected!.result.rounds.length, 'The playback fixture must have a second round').toBeGreaterThan(1);
  localStorage.setItem(SAVE_KEY, JSON.stringify({ st, phase: 'plan', offerId: offer.id }));

  const view = render(<FightCareerBoard />);
  expect(view.getByText('Tonight')).toBeInTheDocument();
  expect(view.getByText('Recap Opponent')).toBeInTheDocument();
  expect(view.getByRole('checkbox', { name: 'Play the fight out round by round' })).toBeChecked();
  fireEvent.click(view.getByRole('button', { name: 'Fight' }));

  const savedBytes = localStorage.getItem(SAVE_KEY);
  expect(savedBytes).not.toBeNull();
  const saved = JSON.parse(savedBytes!);
  expect(saved.phase).toBe('hub');
  expect(saved.st.fightNo).toBe(1);
  expect(saved.st.history).toEqual(expected!.state.history);
  expect(saved.st.rngTick).toBe(expected!.state.rngTick);
  expect(view.queryByRole('button', { name: 'Fight' })).not.toBeInTheDocument();
  expect(view.getByText('Recap Opponent')).toBeInTheDocument();
  return { view, savedBytes, expected: expected! };
}

describe('Fight Career ring playback', () => {
  it('shows a boxing ring when the real saved-plan Fight action starts its recap', () => {
    const { view, savedBytes } = startSavedBout();
    expect(view.queryByRole('img', { name: /boxing ring/i })).toBeInTheDocument();
    expect(localStorage.getItem(SAVE_KEY)).toBe(savedBytes);
  });

  it('lets Pause hold the unrevealed round without changing the saved bout', () => {
    const { view, savedBytes } = startSavedBout();
    const pause = view.queryByRole('button', { name: 'Pause' });
    expect(pause).toBeInTheDocument();
    fireEvent.click(pause!);
    act(() => { vi.advanceTimersByTime(20_000); });
    expect(view.queryByText('Round 1', { exact: true })).not.toBeInTheDocument();
    expect(view.getByRole('button', { name: 'Play' })).toBeInTheDocument();
    expect(localStorage.getItem(SAVE_KEY)).toBe(savedBytes);
  });

  it('lets Next round reveal one round and hold it without replaying the saved fight', () => {
    const { view, savedBytes } = startSavedBout();
    const nextRound = view.queryByRole('button', { name: 'Next round' });
    expect(nextRound).toBeInTheDocument();
    fireEvent.click(nextRound!);
    expect(view.getAllByText('Round 1', { exact: true }).length).toBeGreaterThan(0);
    expect(view.queryByText('Round 2', { exact: true })).not.toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(20_000); });
    expect(view.getAllByText('Round 1', { exact: true }).length).toBeGreaterThan(0);
    expect(view.queryByText('Round 2', { exact: true })).not.toBeInTheDocument();
    expect(view.getByRole('button', { name: 'Play' })).toBeInTheDocument();
    expect(localStorage.getItem(SAVE_KEY)).toBe(savedBytes);
  });
});
