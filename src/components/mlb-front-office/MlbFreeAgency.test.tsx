import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import MlbFrontOfficeBoard from '@/components/mlb-front-office/MlbFrontOfficeBoard';
import { initMlbLeague, mlbCapRoom, mlbCapUsed, mlbOffseason, mlbRelease, mlbRosterMax, mlbSign } from '@/lib/mlbFrontOffice';

vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: () => undefined }));
vi.mock('@/lib/completions', () => ({ recordActivity: () => undefined }));
vi.mock('@/components/game/ShareButtons', () => ({ default: () => null }));

const key = 'mlb-front-office-save-v1';
function fixture() {
  let seed = 721;
  const rng = () => {
    seed = seed * 16807 % 2147483647;
    return (seed - 1) / 2147483646;
  };
  const league = initMlbLeague(rng);
  for (let season = 0; season < 3; season++) mlbOffseason(league, rng, 'ARI');
  const team = league.teams.ARI;
  for (const player of [...league.freeAgents].sort((a, b) => a.salary - b.salary)) {
    if (team.players.length >= 24) break;
    mlbSign(team, league.freeAgents, player.id, league.cap);
  }
  const released = team.players.find(player => player.salary < 3)!;
  expect(mlbRelease(team, league.freeAgents, released.id)).toBe(true);
  const market = [...league.freeAgents].sort((a, b) => b.ovr - a.ovr);
  const target = market.slice(20).find(player => player.id !== released.id && player.salary <= mlbCapRoom(team, league.cap))!;
  expect(target).toBeDefined();
  return { league, team, released, market, target };
}
const setSave = (league: ReturnType<typeof initMlbLeague>) => {
  const raw = JSON.stringify({ league, myTeam: 'ARI', phase: 'hub', titles: 0, seasonsPlayed: league.season - 2026, draftClass: null, picksLeft: 0 });
  localStorage.setItem(key, raw);
  return raw;
};
const marketRows = () => Array.from(document.querySelectorAll<HTMLElement>('[data-fa-row]'));
const row = (id: string) => marketRows().find(item => item.dataset.faRow === id);
const sign = (id: string) => within(row(id)!).getByRole('button', { name: 'Sign' });
const open = () => {
  render(<MlbFrontOfficeBoard />);
  fireEvent.click(screen.getByRole('button', { name: /Free agency/ }));
};

afterEach(() => { cleanup(); localStorage.clear(); });

it('pages through the full market, searches below the old cutoff and signs at the original price', () => {
  const { league, team, market, target } = fixture();
  const startingPayroll = mlbCapUsed(team);
  const before = setSave(league);
  open();
  expect(marketRows().map(row => row.dataset.faRow)).toEqual(market.slice(0, 20).map(p => p.id));
  expect(screen.getByText('Showing 1 to 20 of ' + market.length + ' free agents')).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Next free agents' }));
  expect(marketRows().map(row => row.dataset.faRow)).toEqual(market.slice(20).map(p => p.id));
  expect(screen.getByText('Showing 21 to ' + market.length + ' of ' + market.length + ' free agents')).toBeVisible();

  fireEvent.change(screen.getByRole('combobox', { name: 'Free agent position' }), { target: { value: target.pos } });
  expect(marketRows().map(row => row.dataset.faRow)).toEqual(market.filter(p => p.pos === target.pos).map(p => p.id));
  fireEvent.change(screen.getByRole('searchbox', { name: 'Search free agents' }), { target: { value: '  ' + target.name.toUpperCase() + '  ' } });
  expect(marketRows().map(row => row.dataset.faRow)).toEqual([target.id]);
  expect(localStorage.getItem(key)).toBe(before);
  expect(row(target.id)).toHaveTextContent('wants $' + target.salary + 'M');
  const engineReference = structuredClone(league);
  expect(mlbSign(engineReference.teams.ARI, engineReference.freeAgents, target.id, engineReference.cap)).toBe(true);
  fireEvent.click(sign(target.id));
  expect(screen.getByText('No free agents match these filters.')).toBeVisible();
  const settled = JSON.parse(localStorage.getItem(key)!);
  expect(settled.league.teams.ARI).toEqual(engineReference.teams.ARI);
  expect(settled.league.freeAgents).toEqual(engineReference.freeAgents);
  expect(Math.round((mlbCapUsed(settled.league.teams.ARI) - startingPayroll) * 10) / 10).toBe(target.salary);
});

it.each(['released', 'tax room', 'roster full'] as const)('keeps the existing %s refusal on filtered rows', kind => {
  const { league, team, target, released } = fixture();
  const candidate = kind === 'released' ? released : target;
  if (kind === 'tax room') league.cap = mlbCapUsed(team);
  if (kind === 'roster full') {
    for (const free of [...league.freeAgents]) {
      if (free.id !== target.id) mlbSign(team, league.freeAgents, free.id, league.cap);
      if (team.players.length === mlbRosterMax(team)) break;
    }
    expect(team.players).toHaveLength(mlbRosterMax(team));
  }
  const before = setSave(league);
  open();
  fireEvent.change(screen.getByRole('searchbox', { name: 'Search free agents' }), { target: { value: candidate.name } });
  expect(sign(candidate.id)).toBeDisabled();
  fireEvent.click(sign(candidate.id));
  expect(localStorage.getItem(key)).toBe(before);
});
