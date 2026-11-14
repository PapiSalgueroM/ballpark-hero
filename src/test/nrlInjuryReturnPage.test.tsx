import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import { createNrlCareer, readNrlCareerSave, reduceNrlCareer, type NrlCareerState } from '@/lib/nrlCareer';
import { nrlJudiciaryBans } from '@/lib/nrlJudiciary';
import { createNrlSeason, nrlInjuries, nrlNextRound, nrlStarterOptions, NRL_SAVE_KEY } from '@/lib/nrlManager';
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

it('withholds an injury return forecast for an unresolved charge or an active ban', () => {
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
  expect(row.queryByText(/Can return/)).not.toBeInTheDocument();
  expect(raw()).toBe(bytes);
});

it('leaves legacy injury tracking and saves alone', () => {
  const bytes = JSON.stringify(createNrlSeason('storm', 17));
  open(bytes);
  expect(screen.getByText('Availability tracking starts next season for this save.')).toBeVisible();
  expect(screen.queryByText(/Can return/)).not.toBeInTheDocument();
  expect(raw()).toBe(bytes);
  expect(localStorage.getItem(fence)).toBe('4');
});
