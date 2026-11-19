import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import FrontOfficeBoard from '@/components/front-office/FrontOfficeBoard';
import { FO_DEPTH } from '@/data/frontOfficeDepth';
import { capUsed, initLeague, injuryPass, simGame, unitStarters, type LeagueState } from '@/lib/frontOffice';
import { keyedRng } from '@/lib/keyedRng';

vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: () => undefined }));
vi.mock('@/lib/completions', () => ({ recordActivity: () => undefined }));
vi.mock('@/components/game/ShareButtons', () => ({ default: () => null }));
vi.mock('@/hooks/useRevealScroll', () => ({ useRevealScroll: () => ({ current: null }) }));

const key = 'front-office-save-v1';
const raw = () => localStorage.getItem(key)!;
const savedLeague = () => (JSON.parse(raw()) as { league: LeagueState }).league;
const detroit = () => savedLeague().teams.DET;

function injuredDetroit(full = true) {
  const league = initLeague(keyedRng('nfl-ir-stage-1'), full ? { depth: FO_DEPTH } : {});
  const team = league.teams.DET;
  const goff = unitStarters(team, ['QB'], 1)[0];
  expect(goff.name).toBe('Jared Goff');
  const before = team.players.slice(0, team.players.indexOf(goff)).filter(player => player.out === 0).length;
  let draw = 0;
  const injuries = injuryPass({ DET: team }, () => {
    const index = draw++;
    return index === before ? 0.001 : index === before + 1 ? 0.99 : 0.5;
  });
  expect(injuries).toEqual([{ team: 'DET', player: 'Jared Goff', weeks: 4 }]);
  const index = league.schedule[0].findIndex(game => game.home === 'DET' || game.away === 'DET');
  league.schedule[0][index] = simGame(league.schedule[0][index], league.teams, keyedRng('nfl-ir-week-pair'));
  league.week = 2;
  localStorage.setItem(key, JSON.stringify({ league, myTeam: 'DET', phase: 'hub', titles: 0, seasonsPlayed: 0, draftClass: null, picksLeft: 0 }));
  render(<FrontOfficeBoard />);
  return { id: goff.id, player: goff, team };
}

const group = (id: string) => document.querySelector<HTMLElement>(`[data-roster-group="${id}"]`)!;
const row = (id: string) => document.querySelector<HTMLElement>(`[data-roster-row="${id}"]`)!;
const reserve = () => within(screen.getByRole('region', { name: 'Injured reserve' }));
const hub = () => fireEvent.click(screen.getByText('Hub'));

function openQuarterbacks() {
  fireEvent.click(screen.getByText('Roster'));
  fireEvent.click(group('QB'));
}

beforeEach(() => {
  localStorage.clear();
  vi.spyOn(Math, 'random').mockReturnValue(0.5);
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('NFL Front Office injured reserve on the board', () => {
  it('frees an active place, keeps the full contract and returns only after four Detroit games and room', () => {
    const { id, player, team } = injuredDetroit();
    const oldCap = capUsed(team);
    expect(team.players).toHaveLength(53);
    const luke = team.practice!.find(player => player.name === 'Luke Altmyer')!;
    expect(luke).toBeDefined();
    openQuarterbacks();
    expect(row(id)).toHaveTextContent('(out 4w)');
    fireEvent.click(within(row(id)).getByRole('button', { name: 'Place on injured reserve' }));
    expect(reserve().getByText('Jared Goff')).toBeVisible();
    expect(reserve().getByText(/0 of 4 team games missed/)).toBeVisible();
    expect(reserve().getByText('0 of 2 player returns used')).toBeVisible();
    expect(reserve().getByRole('button', { name: 'Activate Jared Goff' })).toBeDisabled();
    expect(detroit().players.find(player => player.id === id)).toEqual(player);
    expect(capUsed(detroit())).toBe(oldCap);
    expect(detroit().injuredReserve).toEqual([{ playerId: id, placedWeek: 2 }]);
    const placementBytes = raw();

    cleanup();
    render(<FrontOfficeBoard />);
    expect(raw()).toBe(placementBytes);
    fireEvent.click(screen.getByText('Roster'));
    expect(screen.getByText(/52 of 53 on the roster/)).toBeVisible();
    fireEvent.click(group('practice'));
    const practice = document.querySelector<HTMLElement>(`[data-practice-row="${luke.id}"]`)!;
    fireEvent.click(within(practice).getByRole('button', { name: 'Call up' }));
    expect(detroit().players).toHaveLength(54);
    expect(detroit().players.find(player => player.id === luke.id)).toEqual(luke);
    expect(capUsed(detroit())).toBeCloseTo(oldCap + luke.salary);
    expect(detroit().deadCap ?? []).toEqual([]);
    hub();
    fireEvent.click(screen.getByText('This week'));
    for (const week of [2, 3, 4, 5]) fireEvent.click(screen.getByRole('button', { name: `Play Week ${week}` }));
    expect(savedLeague().week).toBe(6);
    expect(detroit().players.find(player => player.id === id)?.out).toBe(0);

    const beforeBrowsing = raw();
    hub();
    fireEvent.click(screen.getByText('Trades'));
    fireEvent.click(screen.getByRole('button', { name: 'QB' }));
    expect(screen.queryByRole('button', { name: /Jared Goff/ })).not.toBeInTheDocument();
    hub();
    fireEvent.click(screen.getByText('Roster'));
    fireEvent.click(screen.getByRole('button', { name: /Depth chart/ }));
    fireEvent.click(document.querySelector('[data-depth-group="QB"]')!);
    expect(document.querySelector(`[data-depth-row="${id}"]`)).toBeNull();
    expect(document.querySelector(`[data-depth-row="${luke.id}"]`)).toBeInTheDocument();
    expect(raw()).toBe(beforeBrowsing);

    hub();
    fireEvent.click(screen.getByText('Roster'));
    expect(screen.getByText(/53 of 53 on the roster/)).toBeVisible();
    fireEvent.click(group('reserve'));
    expect(reserve().getByText(/4 of 4 team games missed/)).toBeVisible();
    expect(reserve().getByText(/Roster full at 53/)).toBeVisible();
    const locked = reserve().getByRole('button', { name: 'Activate Jared Goff' });
    expect(locked).toBeDisabled();
    const held = raw();
    fireEvent.click(locked);
    expect(raw()).toBe(held);

    fireEvent.click(screen.getByRole('button', { name: 'Groups' }));
    fireEvent.click(group('QB'));
    expect(row(id)).toBeNull();
    const spare = detroit().players.find(p => p.pos === 'QB' && p.id !== id && p.id !== luke.id)!;
    const spareRow = within(row(spare.id));
    fireEvent.click(spareRow.getByRole('button', { name: /^Cut,/ }));
    fireEvent.click(spareRow.getByRole('button', { name: 'Cut him' }));
    fireEvent.click(screen.getByRole('button', { name: 'Groups' }));
    fireEvent.click(group('reserve'));
    const capBeforeActivation = capUsed(detroit());
    const activate = reserve().getByRole('button', { name: 'Activate Jared Goff' });
    expect(activate).toBeEnabled();
    fireEvent.click(activate);
    expect(detroit().injuredReserve).toEqual([{ playerId: id, placedWeek: 2, returnedWeek: 6 }]);
    expect(capUsed(detroit())).toBe(capBeforeActivation);
    expect(detroit().players.filter(player => player.id === id)).toHaveLength(1);
    const activatedBytes = raw();
    cleanup();
    render(<FrontOfficeBoard />);
    expect(raw()).toBe(activatedBytes);
    openQuarterbacks();
    expect(row(id)).toHaveTextContent('Jared Goff');
    expect(row(id)).not.toHaveTextContent('(out');
  });

  it('retries the exact pending reserve write and keeps a second placement unavailable', () => {
    const { id } = injuredDetroit();
    openQuarterbacks();
    const bytes = raw();
    const writes: string[] = [];
    let blocked = true;
    const write = Storage.prototype.setItem;
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, name: string, value: string) {
      if (name === key) {
        writes.push(value);
        if (blocked) throw new DOMException('Fixture quota refusal', 'QuotaExceededError');
      }
      write.call(this, name, value);
    });
    fireEvent.click(within(row(id)).getByRole('button', { name: 'Place on injured reserve' }));
    expect(writes).toHaveLength(1);
    const [pending] = writes;
    expect(raw()).toBe(bytes);
    expect(screen.getByRole('alert')).toHaveTextContent('Franchise progress is not saved');
    expect(reserve().queryByRole('button', { name: /place on injured reserve/i })).not.toBeInTheDocument();
    blocked = false;
    fireEvent.click(screen.getByRole('button', { name: 'Retry save' }));
    expect(writes).toEqual([pending, pending]);
    expect(raw()).toBe(pending);
    expect(detroit().injuredReserve).toEqual([{ playerId: id, placedWeek: 2 }]);
  });

  it.each([false, true])('preserves a newer saved franchise during an injured reserve action (retry: %s)', retry => {
    const { id } = injuredDetroit();
    openQuarterbacks();
    const newer = JSON.stringify({ ...JSON.parse(raw()), trust: 54 });
    const write = Storage.prototype.setItem;
    let refuse = retry;
    const attempts = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, name: string, value: string) {
      if (name === key && refuse) throw new DOMException('Fixture quota refusal', 'QuotaExceededError');
      write.call(this, name, value);
    });
    const place = within(row(id)).getByRole('button', { name: 'Place on injured reserve' });
    if (retry) {
      fireEvent.click(place);
      expect(screen.getByRole('button', { name: 'Retry save' })).toBeVisible();
    }
    write.call(localStorage, key, newer);
    refuse = false;
    attempts.mockClear();
    fireEvent.click(retry ? screen.getByRole('button', { name: 'Retry save' }) : place);
    expect(raw()).toBe(newer);
    expect(attempts.mock.calls.filter(([name]) => name === key)).toEqual([]);
    expect(screen.getByRole('alert')).toHaveTextContent('This franchise save changed');
    expect(screen.getByRole('button', { name: 'Reload franchise' })).toBeVisible();
  });

  it('keeps the injured-player display and exact old save on a reduced roster', () => {
    const { id } = injuredDetroit(false);
    const bytes = raw();
    fireEvent.click(screen.getByText('Roster'));
    expect(row(id)).toHaveTextContent('(out 4w)');
    expect(within(row(id)).queryByRole('button', { name: 'Place on injured reserve' })).not.toBeInTheDocument();
    expect(group('reserve')).toBeNull();
    expect(raw()).toBe(bytes);
  });
});
