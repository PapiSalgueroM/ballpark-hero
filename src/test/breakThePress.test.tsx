import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import TrainingPanel from '@/components/soccer-career/TrainingPanel';
import { initialPress, passBall, pressBoards, readPressBest, replayPasses, type PressBoard, type PressResult, type PressState } from '@/lib/breakThePress';
import { FALLBACK_CLUBS, initCareer } from '@/lib/soccerCareerEngine';
import { serializeSoccerCareerSave } from '@/lib/soccerCareerSave';

afterEach(() => { cleanup(); localStorage.clear(); vi.restoreAllMocks(); });

function explore(board: PressBoard) {
  const endings: Record<Exclude<PressResult, 'playing'>, number[][]> = { won: [], out: [], intercepted: [], pressed: [] };
  const visit = (state: PressState, path: number[]) => {
    if (state.result !== 'playing') {
      endings[state.result].push(path);
      return;
    }
    const before = JSON.stringify(state);
    let options = 0;
    for (let i = 0; i < state.teammates.length; i++) {
      const next = passBall(board, state, i);
      if (!next) continue;
      options++;
      expect(next.passes).toBe(path.length + 1);
      visit(next, [...path, i]);
    }
    expect(options).toBeGreaterThan(0);
    expect(JSON.stringify(state)).toBe(before);
  };
  visit(initialPress(board), []);
  return endings;
}

it('gives each board different winning openings, reachable turnovers and a reachable pass limit', () => {
  const shortest = pressBoards.map(board => {
    const { won, out, pressed, intercepted } = explore(board);
    expect(new Set(won.map(path => path[0])).size).toBeGreaterThan(1);
    for (const losses of [out, pressed, intercepted]) expect(losses.length).toBeGreaterThan(0);
    expect(out.every(path => path.length === board.budget)).toBe(true);
    return Math.min(...won.map(path => path.length));
  });
  expect(shortest).toEqual([3, 4, 5]);
});

it('moves both defenders toward the receiver, runs the passer into space, and accepts only a finished legal record', () => {
  const board = pressBoards[0], start = initialPress(board);
  expect(passBall(board, start, 1)).toMatchObject({ carrier: 1, teammates: [15, 22, 16, 10, 1], markers: [12, 7] });
  expect(passBall(board, start, 3)?.result).toBe('pressed');
  expect(replayPasses(board, [2, 4])?.result).toBe('intercepted');
  expect(readPressBest(board, '[1,3,4]')).toEqual([1,3,4]);
  for (const raw of ['3', '{}', '[0,3,4]', '[1,3]', '[2,4]', '[1,3,4,0]', '[1,3,4,0,1,2]']) {
    expect(readPressBest(board, raw)).toBeNull();
  }
});

it.each([true, false])('can lose, undo, win, improve, and reopen independently of the seasonal session (%s)', async (available) => {
  const career = initCareer('Practice Player', 'England', 'CM', '2020s',
    { pace: 61, shooting: 61, passing: 61, dribbling: 61, defending: 61, physical: 61, reflexes: 61 },
    61, 2020, FALLBACK_CLUBS, null);
  const raw = serializeSoccerCareerSave(career), key = 'soccerCareerSave';
  localStorage.setItem(key, raw);
  const complete = vi.fn(), drill = vi.fn();
  const open = async () => {
    fireEvent.click(screen.getByRole('button', { name: /Break the Press/ }));
    fireEvent.click(await screen.findByRole('button', { name: 'Start board' }));
  };
  render(<TrainingPanel career={career} available={available} onComplete={complete} onDrill={drill} onClose={() => {}} />);
  await open();
  const pitch = () => screen.getByRole('group', { name: 'Passing pitch' });
  const keys = (numbers: string) => { for (const key of numbers) fireEvent.keyDown(pitch(), { key }); };
  fireEvent.click(screen.getByRole('button', { name: /Pass to 4 at A3/ }));
  expect(screen.getByText(/Caught in possession/)).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Undo pass' }));
  keys('21245');
  expect(screen.getByText('Press beaten in 5 passes!')).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Retry board' }));
  keys('245');
  expect(screen.getByText('Personal best · 3 passes')).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Undo pass' }));
  keys('5');
  expect(JSON.parse(localStorage.getItem('dukb-press-practice-v1:outlet')!)).toEqual([1,3,4]);
  fireEvent.click(screen.getByRole('button', { name: 'Back to drills' }));
  await open();
  expect(screen.getByText('Personal best · 3 passes')).toBeVisible();
  fireEvent.change(screen.getByLabelText('Tactical board'), { target: { value: 'overlap' } });
  expect(screen.getByText('Reach the end zone to set a best.')).toBeVisible();
  expect(localStorage.getItem(key)).toBe(raw);
  expect(complete).not.toHaveBeenCalled();
  expect(drill).not.toHaveBeenCalled();
});
