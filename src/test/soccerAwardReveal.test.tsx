import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render } from '@testing-library/react';
import { AwardsNightCard } from '@/components/career/AwardsNightCard';
import { careerBeforeBallonDorReveal, ballonDorSeasonForDisplay, revealBallonDorResult } from '@/lib/soccerAwardReveal';
import { getCareerTotals, SOCCER_BALLON_DOR, type BallonDorResult, type CareerState, type SeasonRecord } from '@/lib/soccerCareerEngine';

vi.mock('@/hooks/useSoundPlan', () => ({ stillMotion: () => false, useSoundPlan: () => undefined }));
vi.mock('@/components/soccer-career/CareerFx', () => ({ Confetti: () => <div data-testid="confetti" /> }));

const row = (year: number, won = false): SeasonRecord => ({
  year, age: 25, club: 'Harbour Town', clubCountry: 'England', clubTier: 1,
  type: 'playing', apps: 40, goals: 35, assists: 10, rating: 8,
  leagueTitle: true, domesticCup: false, championsLeague: false, worldCup: false,
  ballonDor: won, ballonDorRank: won ? 1 : 3,
} as SeasonRecord);
const nominee = (name: string, points: number, isPlayer = false) => ({
  name, points, isPlayer, nationality: 'Brazil', position: 'ST', club: 'Harbour Town', goals: 35, trophies: ['League'],
});
const ballot = (won: boolean): BallonDorResult => ({
  year: 2030, playerRank: won ? 1 : 3, playerPoints: won ? 90 : 70, playerNominated: true,
  nominees: won ? [nominee('You', 90, true), nominee('Second', 80), nominee('Third', 70)]
    : [nominee('Winner', 90), nominee('Second', 80), nominee('You', 70, true)],
});
const source = (won: boolean): CareerState => ({
  playerName: 'You', phase: 'season_summary', seasons: [row(2029, true), row(2030, won)],
  pendingSummary: row(2030, won), pendingBallonDor: ballot(won),
  awards: [{ year: 2029, name: "Ballon d'Or", emoji: '🏅' }, ...(won ? [{ year: 2030, name: "Ballon d'Or", emoji: '🏅' }] : [])],
  events: ['A complete season', "You won the Ballon d'Or"], bdorSnubFuel: true,
  pendingNews: [{ newspaper: 'The Daily Sport', type: 'negative', headline: "ROBBED! You Misses Out On Ballon d'Or AGAIN", body: '35 goals and still no golden ball.' }],
  story: [{ year: 2029, age: 24, club: 'Harbour Town', lines: ["A previous Ballon d'Or win"] }],
} as unknown as CareerState);

afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });

describe('Soccer award reveal boundary', () => {
  it.each([true, false])('keeps a saved %s outcome out of current-year views until the list without rewriting it', won => {
    const saved = source(won);
    const bytes = JSON.stringify(saved);
    const hidden = careerBeforeBallonDorReveal(saved);
    expect(hidden.seasons[0]).toBe(saved.seasons[0]);
    expect(hidden.seasons[1].ballonDor).toBe(false);
    expect(hidden.seasons[1].ballonDorRank).toBeNull();
    expect(hidden.pendingSummary?.ballonDor).toBe(false);
    expect(ballonDorSeasonForDisplay(saved, saved.seasons[1]).ballonDorRank).toBeNull();
    expect(getCareerTotals(hidden.seasons).ballonDors).toBe(1);
    expect(hidden.awards.filter(a => a.name === "Ballon d'Or")).toHaveLength(1);
    expect(hidden.pendingNews[0].headline).not.toMatch(/robbed|misses out|wins/i);
    expect(hidden.pendingNews[0].body).toContain('has not been announced');
    expect(hidden.events).toEqual(['A complete season']);
    expect(hidden.story).toEqual(saved.story);
    expect(hidden.pendingBallonDor).toBe(saved.pendingBallonDor);
    expect(JSON.stringify(saved)).toBe(bytes);
    const seen = revealBallonDorResult({ ...saved, phase: 'ballon_dor' });
    expect(seen.pendingBallonDor?.revealed).toBe(true);
    expect({ ...seen.pendingBallonDor, revealed: undefined }).toEqual({ ...saved.pendingBallonDor, revealed: undefined });
    expect(seen.seasons).toBe(saved.seasons);
    expect(seen.awards).toBe(saved.awards);
    expect(careerBeforeBallonDorReveal(seen)).toBe(seen);
    expect(getCareerTotals(seen.seasons).ballonDors).toBe(won ? 2 : 1);
    expect(revealBallonDorResult(seen)).toBe(seen);
  });

  it('keeps already announced old saves and a given speech visible', () => {
    const saved = source(true);
    expect(careerBeforeBallonDorReveal({ ...saved, pendingBallonDor: null }).seasons).toBe(saved.seasons);
    const spoken = { ...saved, pendingBallonDor: { ...saved.pendingBallonDor!, speech: { id: 'thanks', line: 'Thanks', moved: '' } } };
    expect(careerBeforeBallonDorReveal(spoken)).toBe(spoken);
    expect(revealBallonDorResult(saved)).toBe(saved);
    const decided = { ...saved, phase: 'playing' as const };
    expect(careerBeforeBallonDorReveal(decided)).toBe(decided);
    const stale = { ...saved, pendingBallonDor: { ...saved.pendingBallonDor!, year: 2029 } };
    expect(careerBeforeBallonDorReveal(stale)).toBe(stale);
    expect(stale.seasons[0].ballonDor).toBe(true);
    expect(stale.pendingBallonDor?.nominees).toBe(saved.pendingBallonDor?.nominees);
  });
});

function Card({ won, onReveal, complete = false }: { won: boolean; onReveal: () => void; complete?: boolean }) {
  return <AwardsNightCard night={ballot(won)} award={SOCCER_BALLON_DOR.award} copy={SOCCER_BALLON_DOR.copy}
    detail={c => c.club} score={c => `${c.points}pts`} scoreDetail={c => `${c.goals}G`} confetti={false}
    reveal={{ complete, onComplete: onReveal }} onDismiss={() => undefined}
    speech={{ open: won, prompt: 'Winner speech', options: [], onChoose: () => undefined }} />;
}

describe('Soccer ranked list comes before the result', () => {
  it.each([true, false])('reveals the ranked %s result only after the names, with no award confetti or random draw', won => {
    vi.useFakeTimers();
    const random = vi.spyOn(Math, 'random');
    const revealed = vi.fn();
    const view = render(<Card won={won} onReveal={revealed} />);
    expect(view.getByText("Ballon d'Or 2030")).toBeInTheDocument();
    expect(view.queryByText('You')).toBeNull();
    expect(view.queryByText('Winner speech')).toBeNull();
    expect(view.queryByText(/BALLON D'OR WINNER|You finished/)).toBeNull();
    expect(view.container.firstElementChild?.className).not.toContain('border-amber');
    act(() => vi.advanceTimersByTime(600));
    expect(view.getByText(won ? 'Third' : 'You')).toBeInTheDocument();
    expect(view.queryByText(won ? 'You' : 'Winner')).toBeNull();
    act(() => vi.advanceTimersByTime(440));
    expect(view.getByText(won ? 'You' : 'Winner')).toBeInTheDocument();
    expect(view.queryByText(/BALLON D'OR WINNER|You finished/)).toBeNull();
    expect(revealed).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(610));
    expect(revealed).toHaveBeenCalledTimes(1);
    if (won) {
      expect(view.getByText("BALLON D'OR WINNER!")).toBeInTheDocument();
      expect(view.getByText('Winner speech')).toBeInTheDocument();
    } else expect(view.getByText(/You finished 3rd/)).toBeInTheDocument();
    expect(view.queryByTestId('confetti')).toBeNull();
    expect(random).not.toHaveBeenCalled();
  });

  it('cleans up an interrupted countdown and reopens a revealed saved list immediately', () => {
    vi.useFakeTimers();
    const revealed = vi.fn();
    const waiting = render(<Card won={true} onReveal={revealed} />);
    waiting.unmount();
    act(() => vi.advanceTimersByTime(4000));
    expect(revealed).not.toHaveBeenCalled();
    const complete = render(<Card won={true} complete onReveal={revealed} />);
    expect(complete.getByText('You')).toBeInTheDocument();
    expect(complete.getByText("BALLON D'OR WINNER!")).toBeInTheDocument();
    expect(revealed).not.toHaveBeenCalled();
  });
});
