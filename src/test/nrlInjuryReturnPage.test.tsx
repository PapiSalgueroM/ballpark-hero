import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import { createNrlCareer, nrlCareerFinance, readNrlCareerSave, reduceNrlCareer, type NrlCareerState } from '@/lib/nrlCareer';
import { nrlJudiciaryBans } from '@/lib/nrlJudiciary';
import { createNrlSeason, nrlInjuries, nrlNextRound, nrlRegularReturnFixture, nrlStarterOptions, nrlUnavailable, NRL_SAVE_KEY } from '@/lib/nrlManager';
import { fenceKeyOf, saveFence } from '@/lib/saveFence';
import NrlTeamManager from '@/pages/NrlTeamManager';

vi.mock('@/components/game/GameNav', () => ({ GameNav: () => null }));
vi.mock('@/components/game/GameNavbar', () => ({ GameNavbar: () => null }));
vi.mock('@/components/game/RulesGate', () => ({ RulesGate: ({ children }: { children: ReactNode }) => <>{children}</> }));
vi.mock('@/components/seo/GameSeoContent', () => ({ default: () => null }));
vi.mock('@/components/seo/PageSeo', () => ({ default: () => null }));
vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: () => undefined }));

const fence = fenceKeyOf(NRL_SAVE_KEY);
const raw = () => localStorage.getItem(NRL_SAVE_KEY);
const show = () => render(<MemoryRouter initialEntries={['/nrl-team-manager']}><NrlTeamManager /></MemoryRouter>);
const click = (name: string) => fireEvent.click(screen.getByRole('button', { name }));
const advance = (career: NrlCareerState) => reduceNrlCareer(career, { type: 'advance' });
function through(career: NrlCareerState, round: number) {
  for (let next = 1; next < round; next++) career = advance(career);
  expect(career.season.round).toBe(round);
  return career;
}
function open(bytes: string) {
  localStorage.setItem(NRL_SAVE_KEY, bytes);
  localStorage.setItem(fence, '4');
  const view = show();
  click('Squad');
  return view;
}
function availability() {
  return within(screen.getByRole('region', { name: 'Availability' }));
}
function injuryRow(name: string) {
  return within(availability().getByText(new RegExp('^' + name)).closest('li')!);
}

afterEach(() => {
  cleanup();
  saveFence.release(NRL_SAVE_KEY);
  localStorage.clear();
});

it.each([
  [2026, 'broncos', 2, 12, 16, 'broncos-12-0', 'Tane Rourke', 'Dolphins'],
  [2027, 'bears', 12, 22, 25, 'bears-10-1', 'Teo Rowan', 'Warriors'],
] as const)('shows the first regular club fixture after a return that falls on a bye in %i', (
  year, club, seed, injuryRound, bye, id, name, opponent,
) => {
  const initial = through(createNrlCareer(club, seed, year), injuryRound);
  const player = initial.season.squad.find(row => row.id === id)!;
  expect(initial.season.results.find(match => match.injury?.playerId === id)?.round).toBe(injuryRound - 1);
  expect(nrlInjuries(initial.season).get(id)).toBe(bye - injuryRound);
  expect(nrlStarterOptions(initial.season, player.role).some(option => option.id === id)).toBe(false);
  const forecast = `Can return: Round ${bye + 1} vs ${opponent}`;
  const bytes = JSON.stringify(initial);
  const page = open(bytes);
  expect(injuryRow(name).getByText(forecast, { exact: true })).toBeVisible();
  expect(raw()).toBe(bytes);
  expect(localStorage.getItem(fence)).toBe('4');
  page.unmount();
  show();
  click('Squad');
  expect(injuryRow(name).getByText(forecast, { exact: true })).toBeVisible();

  for (let round: number = injuryRound; round <= bye; round++) {
    const next = readNrlCareerSave(raw())!.season;
    expect(next.round).toBe(round);
    click('Match centre');
    if (round === bye) expect(nrlNextRound(next).clubStatus).toBe('bye');
    click(nrlNextRound(next).clubMatch ? 'Quick Sim' : 'Simulate bye round');
  }
  const returned = readNrlCareerSave(raw())!.season;
  expect(returned.round).toBe(bye + 1);
  expect(nrlInjuries(returned).has(id)).toBe(false);
  expect(nrlStarterOptions(returned, player.role).some(option => option.id === id)).toBe(true);
  click('Squad');
  expect(availability().queryByText(new RegExp('^' + name))).not.toBeInTheDocument();
});

it('shows the regular-season boundary without forecasting unknown finals opponents', () => {
  const career = through(createNrlCareer('bears', 4, 2027), 27);
  const id = 'bears-6-1';
  expect(nrlInjuries(career.season).get(id)).toBe(3);
  const bytes = JSON.stringify(career);
  open(bytes);
  const row = injuryRow('Riley Cairns');
  expect(row.getByText('Out for 3 rounds')).toBeVisible();
  expect(row.getByText('No regular-season fixture left after recovery.')).toBeVisible();
  expect(row.queryByText(/Can return/)).not.toBeInTheDocument();
  expect(raw()).toBe(bytes);
});

it('waits for the hearing and then forecasts the later of the ban and injury clocks', () => {
  const initial = advance(createNrlCareer('broncos', 36, 2026, false, true));
  const review = initial.season.judiciary!.case!;
  expect(review.playerId).toBe('broncos-5-0');
  expect(nrlInjuries(initial.season).has(review.playerId)).toBe(true);
  const page = open(JSON.stringify(initial));
  expect(injuryRow('Niko Nairn').queryByText(/Can return/)).not.toBeInTheDocument();
  page.unmount();
  const resolved = reduceNrlCareer(initial, { type: 'resolveJudiciary', year: 2026, clubId: 'broncos', caseRound: review.round, decision: 'plea' });
  expect(nrlJudiciaryBans(resolved.season).get(review.playerId)).toBe(1);
  const bytes = JSON.stringify(resolved);
  open(bytes);
  const row = injuryRow('Niko Nairn');
  expect(row.getByText('Suspended for 1 club match')).toBeVisible();
  expect(row.getByText('Out for 2 rounds')).toBeVisible();
  expect(row.getByText('Can return: Round 4 vs Raiders')).toBeVisible();
  expect(raw()).toBe(bytes);
});

it.each([
  [2026, 'broncos', 228, 5, 'contest', 'Jalen Merritt', 'broncos-1-0', 2, 3, 8, 'Warriors'],
  [2027, 'bears', 33, 22, 'plea', 'Luca Preece', 'bears-13-0', 1, 0, 24, 'Sea Eagles'],
] as const)('forecasts a real suspension around a bye in %i', (
  year, clubId, seed, firstRound, decision, name, id, ban, injury, returnRound, opponent,
) => {
  const charged = through(createNrlCareer(clubId, seed, year, false, true), firstRound);
  const review = charged.season.judiciary?.case;
  expect(review?.playerId).toBe(id);
  expect(nrlNextRound(charged.season).clubStatus).toBe('bye');
  const resolved = reduceNrlCareer(charged, { type: 'resolveJudiciary', year, clubId, caseRound: review!.round, decision });
  expect(nrlJudiciaryBans(resolved.season).get(id)).toBe(ban);
  expect(nrlInjuries(resolved.season).get(id) ?? 0).toBe(injury);
  const bytes = JSON.stringify(resolved);
  const page = open(bytes);
  const forecast = 'Can return: Round ' + returnRound + ' vs ' + opponent;
  expect(injuryRow(name).getByText(forecast)).toBeVisible();
  expect(raw()).toBe(bytes);
  expect(localStorage.getItem(fence)).toBe('4');
  page.unmount();
  show();
  click('Squad');
  expect(injuryRow(name).getByText(forecast)).toBeVisible();
  click('Match centre');
  expect(within(screen.getByRole('region', { name: 'Judiciary review' })).getByText(forecast)).toBeVisible();

  for (let round: number = firstRound; round < returnRound; round++) {
    const current = readNrlCareerSave(raw())!.season;
    expect(current.round).toBe(round);
    expect(nrlUnavailable(current).has(id)).toBe(true);
    click(nrlNextRound(current).clubMatch ? 'Quick Sim' : 'Simulate bye round');
  }
  const returned = readNrlCareerSave(raw())!.season;
  expect(returned.round).toBe(returnRound);
  expect(nrlUnavailable(returned).has(id)).toBe(false);
  const role = returned.squad.find(player => player.id === id)!.role;
  expect(nrlStarterOptions(returned, role).some(option => option.id === id)).toBe(true);
  click('Squad');
  expect(availability().queryByText(new RegExp('^' + name))).not.toBeInTheDocument();
});

it('shows no return match when the remaining suspension carries past the regular draw', () => {
  const season = createNrlCareer('bears', 33, 2027).season;
  expect(nrlRegularReturnFixture({ ...season, round: 26 }, 0, 1)).toBeUndefined();
  expect(nrlRegularReturnFixture({ ...season, round: 28, phase: 'finals' }, 0, 1)).toBeUndefined();
});

it('leaves legacy injury tracking and saves alone', () => {
  const bytes = JSON.stringify(createNrlSeason('storm', 17));
  open(bytes);
  expect(screen.getByText('Availability tracking starts next season for this save.')).toBeVisible();
  expect(screen.queryByText(/Can return/)).not.toBeInTheDocument();
  expect(raw()).toBe(bytes);
  expect(localStorage.getItem(fence)).toBe('4');
});

it('quotes the earlier Titans match, confirms one charge and reloads the shorter recovery', () => {
  const career = through(createNrlCareer('broncos', 2), 12);
  const bytes = JSON.stringify(career);
  const page = open(bytes);
  const row = injuryRow('Tane Rourke');
  expect(row.getByText('Can return: Round 17 vs Dolphins')).toBeVisible();
  const summary = row.getByText('Physio session for Tane Rourke');
  fireEvent.click(summary);
  expect(row.getByText('Recovery would take 3 rounds instead of 4.')).toBeVisible();
  expect(row.getByText('Can return after physio: Round 15 vs Titans')).toBeVisible();
  expect(raw()).toBe(bytes);
  expect(localStorage.getItem(fence)).toBe('4');
  fireEvent.click(row.getByRole('button', { name: 'Book physio for $60,000' }));
  const paid = readNrlCareerSave(raw())!;
  expect(nrlCareerFinance(career).cash - nrlCareerFinance(paid).cash).toBe(60000);
  expect(row.getByText('Can return: Round 15 vs Titans')).toBeVisible();
  expect(availability().getByText('Physio booked for Tane Rourke in Round 12.')).toBeVisible();
  expect(localStorage.getItem(fence)).toBe('5');
  page.unmount();
  show();
  click('Squad');
  expect(injuryRow('Tane Rourke').getByText('Out for 3 rounds')).toBeVisible();
  expect(injuryRow('Tane Rourke').getByText('Can return: Round 15 vs Titans')).toBeVisible();
  expect(injuryRow('Tane Rourke').queryByText('Physio session for Tane Rourke')).not.toBeInTheDocument();
  expect(raw()).toBe(JSON.stringify(paid));
  expect(localStorage.getItem(fence)).toBe('5');
});
