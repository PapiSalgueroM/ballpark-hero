import { act, cleanup, fireEvent, render, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Board from '@/components/nhl-front-office/NhlFrontOfficeBoard';
import styles from '@/components/nhl-front-office/NhlContributors.module.css';
import { nhlContributors, nhlRelease, nhlSetContributors, nhlStrength, type NhlGmPlayer, type NhlGmTeam, type NhlLeague } from '@/lib/nhlFrontOffice';
import * as engine from '@/lib/nhlFrontOffice';
import { recordCompletion, recordActivity } from '@/lib/completions';

vi.mock('@/integrations/supabase/client', () => ({ supabase: {}, SUPABASE_URL: 'https://fixture.invalid', SUPABASE_PUBLISHABLE_KEY: 'fixture-public-key' }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null, refreshProfile: vi.fn() }) }));
vi.mock('@/lib/completions', () => ({ recordCompletion: vi.fn(), recordActivity: vi.fn(), getCurrentPlayerName: () => null }));
vi.mock('@/lib/badges', () => ({ getNewlyEarnedBadges: async () => [] }));

const KEY = 'nhl-front-office-save-v1';
function player(id: string, pos: NhlGmPlayer['pos'], ovr: number, out = 0): NhlGmPlayer {
  return { id, name: `Fixture Caldermere ${id} Full Name`, pos, ovr, out, age: 25, salary: 1, years: 2, pot: ovr };
}
function fixture(): NhlLeague {
  const players = [
    ...[90, 89, 88, 87, 86, 85, 55].map((ovr, i) => player(`f${i}`, i % 2 ? 'W' : 'C', ovr)),
    ...[84, 83, 82, 81, 54].map((ovr, i) => player(`d${i}`, 'D', ovr)),
    player('g0', 'G', 91), player('g1', 'G', 60), player('hurt', 'W', 98, 2),
  ];
  const team = (abbr: string, roster: NhlGmPlayer[]): NhlGmTeam => ({ abbr, players: roster, wins: 3, losses: 2, otLosses: 1, picks: [1, 2] });
  return { season: 2026, cap: 104, round: 4, champions: [], freeAgents: [], teams: { BOS: team('BOS', players), BUF: team('BUF', players.map(p => ({ ...p, id: `other-${p.id}` }))) } };
}
const saved = (league: NhlLeague) => ({ league, myTeam: 'BOS', phase: 'hub', titles: 2, seasonsPlayed: 3, draftClass: null, picksLeft: 0, mandate: null, trust: 60, fired: false, pressTilt: 0, seasonTradeLine: null, postseason: null });
const read = () => JSON.parse(localStorage.getItem(KEY)!) as ReturnType<typeof saved>;
beforeEach(() => { vi.clearAllMocks(); localStorage.clear(); });
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });
async function open(league = fixture()) {
  const raw = JSON.stringify(saved(league)); localStorage.setItem(KEY, raw);
  const writes = vi.spyOn(Storage.prototype, 'setItem');
  const view = render(<Board />);
  fireEvent.click(await view.findByRole('button', { name: /^👔\s*Roster/ }));
  const opener = view.getByRole('button', { name: 'Choose simulation contributors' });
  opener.focus(); fireEvent.click(opener);
  expect(view.getByRole('button', { name: 'Back to roster' })).toHaveFocus();
  return { view, writes, raw, league };
}
const input = (view: ReturnType<typeof render>, id: string) => view.container.querySelector<HTMLInputElement>(`[data-nhl-contributor="${id}"]`)!;
const check = (view: ReturnType<typeof render>, id: string) => fireEvent.click(input(view, id));
const apply = (view: ReturnType<typeof render>) => view.getByRole('button', { name: 'Apply contributors' });
const auto = (view: ReturnType<typeof render>) => view.getByRole('button', { name: 'Use automatic' });
const status = (view: ReturnType<typeof render>) => within(view.getByRole('region', { name: 'Simulation contributors' })).getByRole('status');
const replace = (view: ReturnType<typeof render>) => { check(view, 'f0'); check(view, 'f6'); };
const noBooking = () => { expect(recordCompletion).not.toHaveBeenCalled(); expect(recordActivity).not.toHaveBeenCalled(); };

describe('actual NHL contributor decisions', () => {
  it('opens automatic contributors quietly with exact healthy counts and unchanged ratings', async () => {
    const { view, writes, raw, league } = await open();
    expect(view.getByRole('group', { name: 'Forwards 6/6 · 50%' })).toBeVisible();
    expect(view.getByRole('group', { name: 'Defense 4/4 · 30%' })).toBeVisible();
    expect(view.getByRole('group', { name: 'Goalie 1/1 · 20%' })).toBeVisible();
    expect(input(view, 'hurt')).toBeNull();
    expect(view.container.querySelector('[data-nhl-strength-preview]')).toHaveTextContent('Strength preview 86.7 · forwards 50%, defense 30%, goalie 20%');
    expect(apply(view)).toBeDisabled(); expect(auto(view)).toBeDisabled();
    expect(status(view)).toBeEmptyDOMElement(); expect(writes).not.toHaveBeenCalled(); expect(localStorage.getItem(KEY)).toBe(raw);
    expect(nhlStrength(league.teams.BOS)).toBeCloseTo(86.7, 10);
    const nodes = [...view.container.querySelectorAll('[data-nhl-contributor]')];
    view.rerender(<Board />); nodes.forEach((node, i) => expect(view.container.querySelectorAll('[data-nhl-contributor]')[i]).toBe(node));
    expect(status(view)).toBeEmptyDOMElement(); noBooking();
  });

  it('stages replacements without saving and cancels back to the exact roster opener', async () => {
    const { view, writes, raw } = await open();
    expect(input(view, 'f6')).toBeDisabled(); check(view, 'f0');
    expect(input(view, 'f6')).toBeEnabled(); expect(apply(view)).toBeDisabled();
    expect(view.getByText('Finish your selection to see its strength.')).toBeVisible();
    check(view, 'f6'); expect(apply(view)).toBeEnabled();
    expect(view.getByText('Strength preview 83.8 · forwards 50%, defense 30%, goalie 20%')).toBeVisible();
    fireEvent.click(view.getByRole('button', { name: 'Back to roster' }));
    expect(view.getByRole('button', { name: 'Choose simulation contributors' })).toHaveFocus();
    expect(view.container.querySelector('[data-nhl-contributors]')).toBeNull();
    expect(writes).not.toHaveBeenCalled(); expect(localStorage.getItem(KEY)).toBe(raw); noBooking();
  });

  it('applies exact IDs once through the original save with finite clone-safe feedback and stable inputs', async () => {
    const { view, writes, league } = await open(); vi.useFakeTimers();
    const nodes = [...view.container.querySelectorAll('[data-nhl-contributor]')], originalStatus = status(view);
    replace(view); const expected = nhlContributors(league.teams.BOS); expected.forwards = expected.forwards.filter(id => id !== 'f0').concat('f6');
    const model = structuredClone(league); expect(nhlSetContributors(model.teams.BOS, expected)).toBe(true);
    fireEvent.click(apply(view)); expect(writes).toHaveBeenCalledTimes(1);
    expect(read().league).toEqual(model); expect(read().titles).toBe(2); expect(read().seasonsPlayed).toBe(3);
    expect(nhlStrength(read().league.teams.BOS)).toBeCloseTo(83.78333333333333, 10);
    expect(status(view)).toBe(originalStatus); expect(status(view)).toHaveFocus(); expect(status(view)).toHaveTextContent('Simulation contributors applied.');
    const cue = status(view).firstElementChild!; expect(cue).toHaveClass(styles.committed);
    expect(apply(view)).toBeDisabled(); expect(auto(view)).toBeEnabled();
    view.rerender(<Board />); expect(status(view).firstElementChild).toBe(cue);
    nodes.forEach((node, i) => expect(view.container.querySelectorAll('[data-nhl-contributor]')[i]).toBe(node));
    act(() => vi.advanceTimersByTime(501)); expect(status(view)).toBeEmptyDOMElement(); expect(status(view)).toBe(originalStatus);
    fireEvent.click(apply(view)); expect(writes).toHaveBeenCalledTimes(1); noBooking();
  });

  it('restores manual choices quietly and returns to automatic selection in one unchanged-pipeline save', async () => {
    const league = fixture(), value = nhlContributors(league.teams.BOS); value.goalie = 'g1'; expect(nhlSetContributors(league.teams.BOS, value)).toBe(true);
    const { view, writes, raw } = await open(league);
    expect(input(view, 'g1')).toBeChecked(); expect(input(view, 'g0')).not.toBeChecked();
    expect(status(view)).toBeEmptyDOMElement(); expect(writes).not.toHaveBeenCalled(); expect(localStorage.getItem(KEY)).toBe(raw);
    fireEvent.click(auto(view)); expect(writes).toHaveBeenCalledTimes(1); expect(read().league.teams.BOS).not.toHaveProperty('contributors');
    const original = structuredClone(league); delete original.teams.BOS.contributors; expect(read().league).toEqual(original);
    expect(input(view, 'g0')).toBeChecked(); expect(auto(view)).toBeDisabled(); expect(apply(view)).toBeDisabled();
    expect(status(view)).toHaveTextContent('Automatic contributors restored.'); noBooking();
  });

  it('shows thin and empty groups truthfully with the original empty-group rating', async () => {
    const league = fixture(); league.teams.BOS.players = league.teams.BOS.players.filter(p => ['f0', 'f1', 'f2', 'd0', 'd1'].includes(p.id));
    const { view, writes } = await open(league);
    expect(view.getByRole('group', { name: 'Forwards 3/3 · 50%' })).toBeVisible();
    expect(view.getByRole('group', { name: 'Defense 2/2 · 30%' })).toBeVisible();
    expect(view.getByRole('group', { name: 'Goalie 0/0 · 20%' })).toBeVisible();
    expect(view.getByText('No healthy goalie.')).toBeVisible();
    expect(view.getByText('Strength preview 82.0 · forwards 50%, defense 30%, goalie 20%')).toBeVisible();
    expect(nhlStrength(league.teams.BOS)).toBeCloseTo(81.95, 10);
    expect(apply(view)).toBeDisabled(); expect(writes).not.toHaveBeenCalled(); noBooking();
  });

  it('repairs existing restored overrides after ID repair without creating automatic overrides or writes', async () => {
    const league = fixture(), selected = nhlContributors(league.teams.BOS);
    league.teams.BOS.players.find(p => p.id === 'f0')!.id = 'other-f0';
    selected.forwards = ['other-f0', 'departed', 'hurt', 'f2', 'f3', 'f4']; league.teams.BOS.contributors = selected;
    const first = league.teams.BOS; league.teams = { BUF: league.teams.BUF, BOS: first };
    const observed: NhlGmTeam[] = [], originalStrength = engine.nhlStrength;
    vi.spyOn(engine, 'nhlStrength').mockImplementation(team => { if (team.abbr === 'BOS') observed.push(structuredClone(team)); return originalStrength(team); });
    const { view, writes, raw } = await open(league);
    const chosen = [...view.container.querySelectorAll<HTMLInputElement>('[data-nhl-group="forwards"] input:checked')];
    expect(chosen).toHaveLength(6); expect(chosen.map(node => node.dataset.nhlContributor)).not.toContain('other-f0');
    expect(chosen.map(node => node.dataset.nhlContributor)).toContain('f1');
    expect(observed.length).toBeGreaterThan(0);
    for (const team of observed) expect(team.contributors).toEqual(nhlContributors(team));
    expect(status(view)).toBeEmptyDOMElement(); expect(writes).not.toHaveBeenCalled(); expect(localStorage.getItem(KEY)).toBe(raw);
    fireEvent.click(auto(view)); expect(writes).toHaveBeenCalledTimes(1);
    expect(read().league.teams.BUF).not.toHaveProperty('contributors'); expect(read().league.teams.BOS).not.toHaveProperty('contributors'); noBooking();
  });

  it('refuses same-frame duplicate Apply without a second save or booking', async () => {
    const { view, writes } = await open(); replace(view); const button = apply(view);
    act(() => { button.click(); button.click(); });
    expect(writes).toHaveBeenCalledTimes(1); expect(read().league.teams.BOS.contributors?.forwards).toContain('f6');
    expect(status(view)).toHaveTextContent('Simulation contributors applied.'); noBooking();
  });

  it('preserves the existing waive callback, exact dead cap and contributor repair', async () => {
    const league = fixture(), value = nhlContributors(league.teams.BOS); value.goalie = 'g1'; nhlSetContributors(league.teams.BOS, value);
    const { view, writes } = await open(league); fireEvent.click(view.getByRole('button', { name: 'Back to roster' }));
    const row = view.container.querySelector('[data-roster-row="g1"]')!;
    fireEvent.click(within(row as HTMLElement).getByRole('button', { name: /Waive,/ }));
    expect(writes).not.toHaveBeenCalled(); fireEvent.click(view.getByRole('button', { name: 'Waive him' }));
    const expected = structuredClone(league); expect(nhlRelease(expected.teams.BOS, expected.freeAgents, 'g1')).toBe(true);
    expect(writes).toHaveBeenCalledTimes(1); expect(read().league).toEqual(expected);
    expect(read().league.teams.BOS.contributors?.goalie).toBe('g0'); noBooking();
  });

  it('holds the independent original helper and fictional roster baseline', () => {
    const league = fixture(), before = JSON.stringify(league), selection = nhlContributors(league.teams.BOS);
    expect(selection).toEqual({ forwards: ['f0', 'f1', 'f2', 'f3', 'f4', 'f5'], defense: ['d0', 'd1', 'd2', 'd3'], goalie: 'g0' });
    expect(nhlStrength(league.teams.BOS)).toBeCloseTo(86.7, 10);
    expect(nhlSetContributors(league.teams.BOS, selection)).toBe(false);
    expect(JSON.stringify(league)).toBe(before); noBooking();
  });
});
