import { useState } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { CareerState, SeasonRecord } from '@/lib/soccerCareerEngine';
import { answerSoccerPress, pressRoomView, settleSoccerPress } from '@/lib/soccerCareerPress';
import PressRoom from '@/components/soccer-career/PressRoom';
import PressRoomTile from '@/components/soccer-career/PressRoomTile';

const row = (patch: Partial<SeasonRecord> = {}) => ({ year: 2030, age: 24, club: 'Arsenal', clubCountry: 'England', clubTier: 1,
  type: 'playing', apps: 30, goals: 12, assists: 8, cleanSheets: 9, rating: 7.4, yellowCards: 2, redCards: 0,
  leagueTitle: false, domesticCup: false, championsLeague: false, worldCup: false, ballonDor: true, ballonDorRank: 1,
  intApps: 0, intGoals: 0, intAssists: 0, intRating: 0, tournament: null, tournamentResult: null, ...patch } as SeasonRecord);
const career = (patch: Partial<CareerState> = {}) => ({ playerName: 'Ari Lane', currentClub: 'Arsenal', phase: 'playing',
  retired: false, position: 'ST', contractYearsLeft: 3, popularity: 50, morale: 50, seasons: [row()], ...patch } as CareerState);
afterEach(() => { cleanup(); document.body.style.overflow = ''; vi.restoreAllMocks(); });

function Harness({ initial, onClose = () => {} }: { initial: CareerState; onClose?: () => void }) {
  const [value, setValue] = useState(initial);
  return <><PressRoom career={value} onCareer={fn => setValue(fn)} onClose={onClose} /><output data-testid="save">{JSON.stringify(value)}</output></>;
}
const saved = () => JSON.parse(screen.getByTestId('save').textContent!) as CareerState;
const start = () => fireEvent.click(document.querySelector('[data-press-start]')!);

describe('Soccer Career press room', () => {
  it('shows rules and a worked example before an answer, with no save change', () => {
    const original = career(); render(<Harness initial={original} />);
    expect(screen.getByText('Say it, then back it up')).toBeInTheDocument();
    expect(screen.getByText('Example:')).toBeInTheDocument();
    expect(document.querySelector('[data-press-answer]')).toBeNull();
    expect(saved()).toEqual(original);
    start();
    expect(document.querySelectorAll('[data-press-answer]')).toHaveLength(3);
    expect(saved()).toEqual(original);
  });
  it.each(['calm', 'accountable', 'ambitious'] as const)('writes the actual %s choice and its receipt once', choice => {
    const original = career(); render(<Harness initial={original} />); start();
    fireEvent.click(document.querySelector(`[data-press-answer="${choice}"]`)!);
    expect(saved()).toEqual(answerSoccerPress(original, choice));
    expect(document.querySelector('[data-press-receipt]')).toBeInTheDocument();
    expect(document.querySelector('[data-press-answer]')).toBeNull();
    const held = JSON.stringify(saved());
    fireEvent.click(screen.getByRole('button', { name: 'All your answers' }));
    fireEvent.click(document.querySelector('[data-press-history="0"]')!);
    expect(JSON.stringify(saved())).toBe(held);
  });
  it('shows the captured position target and the actual following-season result', () => {
    const c = answerSoccerPress(career(), 'ambitious');
    const next = row({ year: 2031, goals: 16 }); c.seasons.push(next); settleSoccerPress(c, next);
    render(<Harness initial={c} />); start(); fireEvent.click(screen.getByRole('button', { name: 'Your past answers' })); fireEvent.click(document.querySelector('[data-press-history="0"]')!);
    expect(screen.getByText('Promise kept')).toBeInTheDocument();
    expect(screen.getByText(/At least 15 goals/)).toBeInTheDocument();
    expect(screen.getByText(/Recorded: 16/)).toBeInTheDocument();
    expect(saved()).toEqual(c);
  });
  it('uses keeper clean sheets in the question and promise', () => {
    render(<Harness initial={career({ position: 'GK' })} />); start();
    expect(document.querySelector('[data-press-stat-line]')?.textContent).toContain('clean sheets');
    expect(document.querySelector('[data-press-stat-line]')?.textContent).not.toContain('12 goals');
    fireEvent.click(document.querySelector('[data-press-answer="ambitious"]')!);
    expect(document.querySelector('[data-press-promise]')?.textContent).toContain('clean sheets');
  });
  it('keeps the pending award out of the question and history', () => {
    const original = career({ pendingBallonDor: { year: 2030, winner: true, revealed: false } as CareerState['pendingBallonDor'] });
    render(<Harness initial={original} />); start();
    const question = document.querySelector('[data-press-screen="question"]')!.textContent!;
    expect(question).not.toMatch(/Ballon|golden ball|best player in the world/i);
    expect(saved().pendingBallonDor).toEqual(original.pendingBallonDor);
  });
  it('reopens help and returns to the same question without making an answer', () => {
    const original = career(); render(<Harness initial={original} />); start();
    const question = document.querySelector('[data-press-question]')!.textContent;
    fireEvent.click(screen.getByRole('button', { name: 'Press room help' }));
    fireEvent.click(screen.getByRole('button', { name: 'Back to the room' }));
    expect(document.querySelector('[data-press-question]')!.textContent).toBe(question);
    expect(saved()).toEqual(original);
  });
  it('restores the held body overflow on unmount and supports Escape', () => {
    document.body.style.overflow = 'clip'; const close = vi.fn();
    const mounted = render(<Harness initial={career()} onClose={close} />);
    expect(document.body.style.overflow).toBe('hidden');
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' }); expect(close).toHaveBeenCalledOnce();
    mounted.unmount(); expect(document.body.style.overflow).toBe('clip');
  });
  it('traps keyboard focus between the help and pinned Back buttons', () => {
    render(<Harness initial={career()} />);
    const back = screen.getByRole('button', { name: '← Back to your career' }), help = screen.getByRole('button', { name: 'Press room help' });
    back.focus(); fireEvent.keyDown(back, { key: 'Tab' }); expect(help).toHaveFocus();
    fireEvent.keyDown(help, { key: 'Tab', shiftKey: true }); expect(back).toHaveFocus();
  });
  it('keeps retired history readable and refuses a new answer', () => {
    const c = answerSoccerPress(career(), 'calm'); c.retired = true; c.phase = 'retired';
    render(<Harness initial={c} />); start();
    expect(document.querySelector('[data-press-history="0"]')).toBeInTheDocument();
    expect(document.querySelector('[data-press-answer]')).toBeNull(); expect(saved()).toEqual(c);
  });
  it('shows the settled promise while the following season summary is up, without offering another answer', () => {
    const c = answerSoccerPress(career(), 'ambitious');
    const next = row({ year: 2031, goals: 13 }); c.seasons.push(next); settleSoccerPress(c, next); c.phase = 'season_summary';
    render(<Harness initial={c} />); start(); fireEvent.click(document.querySelector('[data-press-history="0"]')!);
    expect(screen.getByText('Promise missed')).toBeInTheDocument();
    expect(document.querySelector('[data-press-answer]')).toBeNull(); expect(saved()).toEqual(c);
  });
  it('shows no press tile before any professional appearance', () => {
    const c = career({ seasons: [row({ type: 'youth', apps: 0 })] });
    render(<PressRoomTile career={c} onCareer={() => {}} />);
    expect(document.querySelector('[data-press-room-open]')).toBeNull(); expect(pressRoomView(c).eligible).toBe(false);
  });
});
