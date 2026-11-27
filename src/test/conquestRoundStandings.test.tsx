import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import ImperialismBoardShared from '@/components/conquest/ImperialismBoardShared';
import { SOCCER_CONQUEST_GAME, SOCCER_CONQUEST_MAP, SOCCER_IMPERIALISM as sport } from '@/data/soccerConquest';
import { dailyConquestRng, saveDailyRun } from '@/lib/conquestDaily';
import { continueRun, dailyRunRecord, featuredPairing, playRound, startRun } from '@/lib/conquestRun';
import { getTodayET } from '@/lib/dateUtils';
import { recordLabel, teamLabel } from '@/lib/imperialismEngine';

vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: () => {} }));

afterEach(() => { cleanup(); localStorage.clear(); });

function openRecap(rounds: number) {
  const date = getTodayET();
  const rng = dailyConquestRng(sport.key, date);
  let run = startRun(sport, 'ARS', rng);
  const records = [recordLabel(run.records.ARS)];
  for (let i = 0; i < rounds; i++) {
    if (run.phase === 'recap') run = continueRun(sport, run, rng);
    run = playRound(sport, run, featuredPairing(sport, run)![0], rng);
    records.push(recordLabel(run.records.ARS));
  }
  saveDailyRun(sport.key, dailyRunRecord(run), date);
  const board = render(<ImperialismBoardShared sport={sport} map={SOCCER_CONQUEST_MAP} game={SOCCER_CONQUEST_GAME} />);
  return { board, run, records };
}

it('keeps the settled matchday in the header until Continue opens the next one', () => {
  const { board, run } = openRecap(2);
  const round = board.container.querySelector('[data-conquest-status] b')!;
  expect(round).toHaveTextContent(run.lastRound!.label);
  fireEvent.click(board.getByRole('button', { name: 'Continue' }));
  expect(round).toHaveTextContent(sport.roundNoun + ' 3');
});

it('shows wins and losses from the selected timeline stop, then restores the live table', () => {
  const { board, records } = openRecap(2);
  const slider = board.getByRole('slider', { name: /Season timeline/ });
  const myRecord = () => board.container.querySelector('[data-standings] [data-team="ARS"] .sr-only')!.textContent;
  expect(myRecord()).toBe(records[2]);
  for (const stop of [1, 0]) {
    fireEvent.change(slider, { target: { value: String(stop) } });
    expect(myRecord()).toBe(records[stop]);
  }
  fireEvent.pointerUp(slider);
  expect(myRecord()).toBe(records[2]);
});

it('looks up a captured territory across completed rounds without changing the run', () => {
  const { board, run } = openRecap(2);
  const map = SOCCER_CONQUEST_MAP;
  const changed = map.regions.find(region => run.history[1][region.id] !== run.history[0][region.id])!;
  expect(changed).toBeDefined();
  const saved = { ...localStorage };
  fireEvent.click(board.getByRole('button', { name: 'Territory history' }));
  const round = board.getByLabelText('Map after');
  expect(round.querySelectorAll('option')).toHaveLength(3);
  fireEvent.change(round, { target: { value: '1' } });
  fireEvent.change(board.getByLabelText('Territory or team'), { target: { value: changed.name } });
  fireEvent.click(board.getByLabelText('Show changes only'));
  const ledger = board.getByRole('list', { name: 'Territory owners' });
  expect(ledger).toHaveTextContent(teamLabel(sport, run.history[1][changed.id]));
  expect(ledger).toHaveTextContent('Previously ' + teamLabel(sport, run.history[0][changed.id]));
  fireEvent.change(round, { target: { value: '0' } });
  expect(board.getByLabelText('Show changes only')).toBeDisabled();
  expect(board.getByRole('list', { name: 'Territory owners' })).not.toHaveTextContent('Previously');
  fireEvent.change(board.getByLabelText('Territory or team'), { target: { value: 'no such region' } });
  expect(board.getByText('No territories match.')).toBeVisible();
  expect({ ...localStorage }).toEqual(saved);
});
