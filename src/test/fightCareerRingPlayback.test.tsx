/**
 * Round 1518: enter the actual saved game plan and start its fictional bout.
 * These checks first fail on the missing ring and playback controls, after
 * confirming that Fight has already stored exactly one completed outcome.
 */
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import FightCareerBoard from '@/components/fight-career/FightCareerBoard';
import FightRing from '@/components/fight-career/FightRing';
import { applyResult, type BoutResult, type RoundLog } from '@/lib/fightCareer';
import * as fightFlow from '@/lib/fightCareerLifeFlow';
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
    expect(view.queryByText('Round 1', { exact: true }), 'Paused playback must not reveal the opening round').not.toBeInTheDocument();
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

const RECAP_ROUND: RoundLog = {
  round: 1, tactic: 'press', oppTactic: 'counter', stance: 'counter', switched: false,
  playerLanded: 12, oppLanded: 4, playerScore: 10, oppScore: 8, knockdown: 'player', note: 'Opponent knocked down.',
};

function ringPose(container: HTMLElement, side: 'player' | 'opp') {
  return container.querySelector(`[data-fighter="${side}"]`)?.getAttribute('data-pose');
}

function controlledRecap(result: BoutResult) {
  const st = lifeRunCamp(
    lifeNewCareer('Ring Tester', 'welter', 'outboxer', 'allround', 'family', 'round-1518-ring'),
    { conditioning: 2, power: 2, defence: 1, speed: 1 },
  );
  const offer = st.offers[0];
  offer.rounds = 8;
  offer.opponent.name = 'Recap Opponent';
  const state = { ...applyResult(st, offer, result), life: st.life };
  const stub = vi.spyOn(fightFlow, 'lifeTakeFight').mockReturnValue({ state, result, offer, takeHome: 0.1 });
  localStorage.setItem(SAVE_KEY, JSON.stringify({ st, phase: 'plan', offerId: offer.id }));
  const view = render(<FightCareerBoard />);
  fireEvent.click(view.getByRole('button', { name: 'Fight' }));
  const savedBytes = localStorage.getItem(SAVE_KEY);
  expect(JSON.parse(savedBytes!).st.history).toEqual(state.history);
  return { view, stub, savedBytes };
}

describe('Fight Career revealed round truth', () => {
  it('puts only the actual knockdown victim down', () => {
    const view = render(<FightRing round={RECAP_ROUND} condition={{ round: 1, player: 97, opp: 80 }} finished={null} />);
    expect(ringPose(view.container, 'player'), 'The knockdown scorer stays upright').toBe('pressure');
    expect(ringPose(view.container, 'opp'), 'The player-scored knockdown victim is the opponent').toBe('down');
    view.rerender(<FightRing round={{ ...RECAP_ROUND, knockdown: 'opp' }} condition={{ round: 1, player: 80, opp: 97 }} finished={null} />);
    expect(ringPose(view.container, 'player'), 'The opponent-scored knockdown victim is the player').toBe('down');
    expect(ringPose(view.container, 'opp'), 'The opponent scorer stays upright').toBe('counter');
  });

  it('shows a completed KO loser down and a TKO without a knockdown stopped upright', () => {
    const round = { ...RECAP_ROUND, knockdown: null };
    const view = render(<FightRing round={round} condition={{ round: 1, player: 0, opp: 80 }} finished={{ method: 'KO', winner: 'opp' }} />);
    expect(ringPose(view.container, 'player'), 'A completed KO shows the actual loser down').toBe('down');
    expect(ringPose(view.container, 'opp')).toBe('counter');
    view.rerender(<FightRing round={round} condition={{ round: 1, player: 90, opp: 0 }} finished={{ method: 'TKO', winner: 'player' }} />);
    expect(ringPose(view.container, 'opp'), 'A TKO without a current knockdown does not invent a fall').toBe('stopped');
    expect(ringPose(view.container, 'player')).toBe('pressure');
    expect(view.getByRole('img', { name: /boxing ring/i })).toHaveAccessibleDescription();
  });

  it('leaves both figures upright after a decision even when the last round had a knockdown', () => {
    const view = render(<FightRing round={RECAP_ROUND} condition={{ round: 1, player: 97, opp: 80 }} finished={{ method: 'UD', winner: 'player' }} />);
    expect(ringPose(view.container, 'player')).toBe('pressure');
    expect(ringPose(view.container, 'opp'), 'The decision is over and both fighters are upright').toBe('counter');
  });

  it('does not let later rounds change the first revealed recap', () => {
    const second: RoundLog = { ...RECAP_ROUND, round: 2, tactic: 'counter', playerLanded: 60, oppLanded: 35, knockdown: null };
    const first: BoutResult = {
      rounds: [RECAP_ROUND, second], winner: 'player', method: 'KO', endedRound: 2,
      playerCard: 20, oppCard: 16, damageTaken: 2, damageDealt: 4, roundsWon: 2,
    };
    const future: BoutResult = {
      rounds: [RECAP_ROUND, { ...second, playerLanded: 6, oppLanded: 9 }, { ...second, round: 3, playerLanded: 20, oppLanded: 10 }, { ...second, round: 4, playerLanded: 18, oppLanded: 11 }],
      winner: 'opp', method: 'UD', endedRound: 4, playerCard: 36, oppCard: 38, damageTaken: 9, damageDealt: 2, roundsWon: 1,
    };
    const frames = [first, future].map(result => {
      const { view, stub, savedBytes } = controlledRecap(result);
      fireEvent.click(view.getByRole('button', { name: 'Next round' }));
      const current = view.container.querySelector('[data-current-round="1"]')!;
      expect(current.querySelector('[data-round-tactics]')?.textContent).toContain('You: Pressure. Opponent: Counter.');
      expect(current.querySelector('[data-round-landed]')?.textContent).toBe('You landed 12. Opponent landed 4.');
      expect(view.container.querySelector('[data-fight-cards]')?.textContent).toContain('after 1 of 8');
      expect(view.queryByText('Round 2', { exact: true })).not.toBeInTheDocument();
      expect(localStorage.getItem(SAVE_KEY)).toBe(savedBytes);
      const frame = {
        current: current.innerHTML,
        cards: view.container.querySelector('[data-fight-cards]')?.textContent,
        summary: view.container.querySelector('[data-fight-ring] desc')?.textContent,
        player: ringPose(view.container, 'player'), opponent: ringPose(view.container, 'opp'),
      };
      view.unmount();
      stub.mockRestore();
      return frame;
    });
    expect(frames[0], 'Future rounds must not change current counts, scale, ring or scheduled length').toEqual(frames[1]);
  });

  it('waits a full readable interval after Play before revealing the next round', () => {
    const { view, savedBytes } = startSavedBout();
    act(() => { vi.advanceTimersByTime(2999); });
    expect(view.container.querySelector('[data-current-round]')).toHaveAttribute('data-current-round', '0');
    act(() => { vi.advanceTimersByTime(1); });
    expect(view.container.querySelector('[data-current-round]')).toHaveAttribute('data-current-round', '1');
    fireEvent.click(view.getByRole('button', { name: 'Pause' }));
    act(() => { vi.advanceTimersByTime(20_000); });
    expect(view.container.querySelector('[data-current-round]')).toHaveAttribute('data-current-round', '1');
    fireEvent.click(view.getByRole('button', { name: 'Play' }));
    act(() => { vi.advanceTimersByTime(2999); });
    expect(view.container.querySelector('[data-current-round]')).toHaveAttribute('data-current-round', '1');
    act(() => { vi.advanceTimersByTime(1); });
    expect(view.container.querySelector('[data-current-round]')).toHaveAttribute('data-current-round', '2');
    expect(localStorage.getItem(SAVE_KEY)).toBe(savedBytes);
  });

  it('skips to the saved verdict and keeps earlier cards collapsed by default', () => {
    const { view, expected, savedBytes } = startSavedBout();
    fireEvent.click(view.getByRole('button', { name: 'Skip to the decision' }));
    expect(view.container.querySelector('[data-current-round]')).toHaveAttribute('data-current-round', String(expected.result.rounds.length));
    expect(view.container.querySelector('[data-fight-ring]')).toHaveAttribute('data-round', String(expected.result.rounds.length));
    expect(view.getByRole('button', { name: 'Next' })).toBeInTheDocument();
    expect(view.queryByRole('button', { name: 'Play' })).not.toBeInTheDocument();
    expect(view.container.querySelector('[data-round-scorecards]')).not.toHaveAttribute('open');
    expect(localStorage.getItem(SAVE_KEY)).toBe(savedBytes);
    fireEvent.click(view.getByRole('button', { name: 'Next' }));
    expect(view.queryByRole('img', { name: /boxing ring/i })).not.toBeInTheDocument();
    expect(localStorage.getItem(SAVE_KEY)).toBe(savedBytes);
  });
});
