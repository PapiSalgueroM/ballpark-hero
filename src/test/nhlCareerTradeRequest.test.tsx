import { cleanup, fireEvent, render, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import UsCareerBoard from '@/components/us-career/UsCareerBoard';
import { keyedRng } from '@/lib/keyedRng';
import { NHL_CAREER_SPORT } from '@/lib/nhlCareerSport';
import { nhlEraTeamIds, nhlTeamLabelOf, type NhlCareerState } from '@/lib/nhlMyCareer';
import { defaultAppearance } from '@/lib/soccerCareerAppearance';
import { summerCareerKey } from '@/lib/usCareerSummer';

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null, refreshProfile: vi.fn() }) }));
vi.mock('@/lib/completions', () => ({ recordCompletion: vi.fn(), recordActivity: vi.fn(), getCurrentPlayerName: () => null }));
vi.mock('@/lib/badges', () => ({ getNewlyEarnedBadges: async () => [] }));

const sport = NHL_CAREER_SPORT;
const open = () => render(<MemoryRouter><UsCareerBoard sport={sport} /></MemoryRouter>);
const stored = () => localStorage.getItem(sport.saveKey);
const read = () => JSON.parse(stored()!) as { c: NhlCareerState; teamQuality: number };

function stageCareer(era: 'now' | 'y2006', accepts: boolean) {
  const career = sport.startCareer('Fixture Hockey Player', 'G', sport.create.archetypes.G[0],
    keyedRng(era), defaultAppearance(), era);
  const { line } = sport.simSeason(career, 76, keyedRng('first NHL season'));
  sport.progress(career, keyedRng('first NHL summer'), line.seasonRating);
  expect(career.seasons).toHaveLength(1);
  delete career.pendingRivalryEvent;
  delete career.pendingRivalryChoice;
  Object.assign(career, { team: 'TOR', role: 'starter', contractYears: 1, morale: 70, ovr: 88, pot: 93 });
  career.goalieTandem = { year: career.year, team: career.team };
  const salt = Array.from({ length: 300 }, (_, index) => String(index)).find(summerSalt => {
    const roll = keyedRng('nhl-trade-request:' + summerCareerKey({ ...career, summerSalt }) + ':' + career.year)();
    return accepts ? roll < 0.03 : roll >= 0.45 && roll < 0.5;
  });
  expect(salt).toBeDefined();
  career.summerSalt = salt;
  localStorage.setItem(sport.saveKey, JSON.stringify({ c: career, phase: 'season', teamQuality: 76, coach: null }));
  return career;
}

function request(view: ReturnType<typeof open>) {
  fireEvent.click(within(view.container).getByRole('button', { name: 'Request a trade' }));
  return within(view.getByRole('alertdialog', { name: 'Request a trade?' }));
}

afterEach(() => { cleanup(); localStorage.clear(); vi.restoreAllMocks(); });

describe('standing NHL trade request', () => {
  it.each([['now', 'SEA'], ['y2006', 'ATL']] as const)('moves to the named %s team with the signed deal and plays there', (era, target) => {
    const before = stageCareer(era, true);
    const raw = stored();
    const view = open();
    expect(view.queryByRole('button', { name: 'Request a release' })).toBeNull();
    const dialog = request(view);
    expect(dialog.getByText(/50% chance/)).toBeVisible();
    expect(dialog.getByText(/you get one trade request this season/i)).toBeVisible();
    expect(dialog.getAllByRole('option').map(option => (option as HTMLOptionElement).value)).toEqual(
      ['', ...nhlEraTeamIds(era).filter(team => team !== before.team)],
    );
    fireEvent.change(dialog.getByRole('combobox', { name: 'Trade destination' }), { target: { value: target } });
    const named = sport.tradeRequest?.destinations(before).find(row => row.id === target);
    expect(named?.chance).toBeLessThan(50);
    expect(dialog.getByText(new RegExp(named?.chance + '% chance.*Roster quality ' + named?.quality))).toBeVisible();
    expect(dialog.getByText(/you get one trade request this season/i)).toBeVisible();
    expect(stored()).toBe(raw);
    fireEvent.click(dialog.getByRole('button', { name: 'Send request' }));

    expect(read()).toMatchObject({ teamQuality: named?.quality, c: {
      team: target, salary: before.salary, contractYears: before.contractYears, seasons: before.seasons,
      tradeRequest: { year: before.year, from: 'TOR', to: target, requestedTeam: target },
    } });
    expect(read().c.goalieTandem).toBeUndefined();
    const receipt = stored();
    view.unmount();
    const reloaded = open();
    expect(reloaded.getByText('Trade request granted. Traded to ' + nhlTeamLabelOf(target, era) + ' on the same contract.')).toBeVisible();
    expect(reloaded.getByRole('button', { name: 'Request a trade' })).toBeDisabled();
    expect(stored()).toBe(receipt);
    vi.spyOn(Math, 'random').mockReturnValue(0.75);
    fireEvent.click(reloaded.getByRole('button', { name: 'Play the ' + before.year + ' season' }));
    fireEvent.click(reloaded.getByRole('button', { name: /play the year out/i }));
    expect(read().c.seasons.at(-1)).toMatchObject({ team: target, year: before.year, salary: before.salary });
  });

  it('records a named refusal without rerolling or changing the team plan from a stale tab', () => {
    const before = stageCareer('now', false);
    const broad = structuredClone(before);
    expect(sport.tradeRequest!.settle(broad, 'trade')).not.toBeNull();
    expect(broad.team).not.toBe(before.team);
    const view = open();
    const stale = open();
    const dialog = request(view);
    fireEvent.change(dialog.getByRole('combobox', { name: 'Trade destination' }), { target: { value: 'SEA' } });
    fireEvent.click(dialog.getByRole('button', { name: 'Send request' }));
    expect(read()).toMatchObject({ teamQuality: 76, c: {
      team: before.team, salary: before.salary, contractYears: before.contractYears, morale: 66,
      goalieTandem: before.goalieTandem,
      tradeRequest: { year: before.year, from: 'TOR', to: null, requestedTeam: 'SEA' },
    } });
    const receipt = stored();
    fireEvent.click(request(stale).getByRole('button', { name: 'Send request' }));
    expect(stored()).toBe(receipt);
    expect(within(stale.container).getByText(/Trade request to .* declined/)).toBeVisible();
  });

  it('keeps ineligible destinations and unsigned deals out of a historical request', () => {
    const c = stageCareer('y2006', true);
    const trade = sport.tradeRequest!;
    const bytes = JSON.stringify(c);
    expect(trade.settle(c, 'trade', 'SEA')).toBeNull();
    expect(trade.settle(c, 'trade', c.team)).toBeNull();
    expect(trade.settle(c, 'release')).toBeNull();
    expect(JSON.stringify(c)).toBe(bytes);
    expect(trade.available({ ...c, contractYears: 0 })).toBe(false);
    expect(trade.available({ ...c, suspendedSeasons: 1 })).toBe(false);
  });
});
