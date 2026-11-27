import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { NhlCupSeries } from '@/components/perfect-season/NhlCupSeries';
import { CUP_PLANS, NHL_CUP_KEY, callCupGame, cupBoard, cupGame, cupScout, makeCupRun, readCupRun, type CupPlan, type CupRun } from '@/lib/nhlCupSeries';
import { NHL_SLOTS } from '@/lib/perfectSeasonNhl';
import { loadDailyAttempt, saveDailyAttempt, simulateSeason, type DraftablePlayer } from '@/lib/perfectSeason';

const picks = Object.fromEntries(NHL_SLOTS.map(({ key }, i) => [key, {
  name: 'Test ' + key, playerId: key, eligible: [key], rating: [82, 61, 91, 76, 77, 60][i], detail: '',
} satisfies DraftablePlayer]));
const original = makeCupRun(picks, 25, 0)!;
const plans = Object.keys(CUP_PLANS) as CupPlan[];
function finish(seed: number, best: boolean) {
  let run = { ...original, seed };
  while (!cupBoard(run).finished) {
    const i = run.calls.length;
    const options = [...plans].sort((a, b) => cupGame(run, i, { plan: b, doubleShift: false }).chance - cupGame(run, i, { plan: a, doubleShift: false }).chance);
    run = callCupGame(run, { plan: options[best ? 0 : 2], doubleShift: i === 1 })!;
  }
  return run;
}
beforeEach(() => localStorage.clear());
afterEach(cleanup);

it('the scouted system changes results on matched draws, including the final series winner', () => {
  let better = 0, worse = 0, swing = 0;
  for (let seed = 0; seed < 400; seed++) {
    const good = cupBoard(finish(seed, true)), bad = cupBoard(finish(seed, false));
    better += Number(good.wins === 3);
    worse += Number(bad.wins === 3);
    swing += Number(good.wins === 3 && bad.losses === 3);
  }
  expect(better - worse).toBeGreaterThan(120);
  expect(swing).toBeGreaterThan(120);
  expect(cupBoard(finish(0, true)).wins).toBe(3);
  expect(cupBoard(finish(0, false)).losses).toBe(3);
  const series = finish(0, true);
  expect(finish(0, true)).toEqual(series);
  expect(callCupGame(series, { plan: 'pinch', doubleShift: false })).toBeNull();
});

it('spends one extra shift, charges it against the following game, then restores the normal line', () => {
  const normal = callCupGame(original, { plan: 'hold', doubleShift: false })!;
  const spent = callCupGame(original, { plan: 'hold', doubleShift: true })!;
  expect(cupBoard(spent).games[0].chance).toBeGreaterThan(cupBoard(normal).games[0].chance);
  const call = { plan: 'clear', doubleShift: false } as const;
  expect(cupGame(spent, 1, call).chance).toBeLessThan(cupGame(normal, 1, call).chance);
  expect(callCupGame(spent, { ...call, doubleShift: true })).toBeNull();
  expect(cupGame(callCupGame(spent, call)!, 2, call)).toEqual(cupGame(callCupGame(normal, call)!, 2, call));
  expect(cupScout(original, 0).look).not.toBe(cupScout(original, 1).look);
});

it('uses the actual eligible six and changes the role-specific matchup when a drafted goalie changes', () => {
  expect(makeCupRun({ ...picks, G: picks.C }, 25, 0)).toBeNull();
  expect(makeCupRun({ ...picks, G: null }, 25, 0)).toBeNull();
  const star = makeCupRun({ ...picks, G: { ...picks.G, rating: 99 } }, 25, 0)!;
  const gain = (plan: CupPlan) => cupGame(star, 0, { plan, doubleShift: false }).chance - cupGame(original, 0, { plan, doubleShift: false }).chance;
  expect(gain('clear')).toBeGreaterThan(gain('hold'));
  expect(original.lineup.G).toEqual({ name: picks.G.name, rating: picks.G.rating });
});

it('restores a legal game history and rejects invalid role data, repeated shifts or extra games after a clinch', () => {
  const run = finish(0, true);
  const read = (s: CupRun) => readCupRun(JSON.stringify(s));
  expect(read(run)).toEqual(run);
  expect(read({ ...run, calls: [...run.calls, run.calls[0]] })).toBeNull();
  expect(read({ ...run, calls: [run.calls[1], run.calls[1]] })).toBeNull();
  expect(read({ ...run, lineup: { ...run.lineup, D: run.lineup.G } })).toBeNull();
  expect(readCupRun('{"v":1,"calls":[]}')).toBeNull();
});

it('enters from a season, resumes after a remount, replays the same scouts and restores keyboard focus', async () => {
  const date = '2026-11-27', datedKey = 'perfect-season-nhl-daily-' + date;
  const sim = simulateSeason(81, 82, 77);
  saveDailyAttempt('nhl', { date, sim, overall: sim.overall, spins: 6, teamNames: [] });
  const daily = localStorage.getItem(datedKey);
  expect(loadDailyAttempt('nhl', date)?.sim).toEqual(sim);
  const view = render(<NhlCupSeries entry={original} />);
  const open = screen.getByRole('button', { name: 'Coach the Cup series' });
  fireEvent.click(open);
  expect(screen.getByText(/For example, if their wings break early/)).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Start series with this lineup' }));
  expect(screen.getByRole('button', { name: 'Play game 1' })).toBeDisabled();
  const full = finish(0, true);
  const play = (i: number) => {
    const call = full.calls[i];
    if (call.doubleShift) fireEvent.click(screen.getByLabelText('Double-shift the top line'));
    fireEvent.click(screen.getByRole('button', { name: new RegExp(CUP_PLANS[call.plan]) }));
    fireEvent.click(screen.getByRole('button', { name: 'Play game ' + (i + 1) }));
  };
  play(0);
  fireEvent.click(screen.getByRole('button', { name: 'Back to Perfect Season' }));
  await waitFor(() => expect(open).toHaveFocus());
  view.unmount();
  render(<NhlCupSeries />);
  const resume = screen.getByRole('button', { name: 'Resume Cup series' });
  fireEvent.click(resume);
  for (let i = 1; i < full.calls.length; i++) play(i);
  expect(screen.getByRole('status')).toHaveTextContent('Cup won');
  fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
  await waitFor(() => expect(resume).toHaveFocus());
  fireEvent.click(screen.getByRole('button', { name: 'Review Cup series' }));
  fireEvent.click(screen.getByRole('button', { name: 'Replay this series' }));
  expect(readCupRun(localStorage.getItem(NHL_CUP_KEY))).toEqual(original);
  expect(localStorage.getItem(datedKey)).toBe(daily);
});
