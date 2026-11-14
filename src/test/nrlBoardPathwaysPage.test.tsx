import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import { nrlBoardPathwaysProgress } from '@/lib/nrlBoardTarget';
import { createNrlCareer, nrlBoardPathwaysIncome, readNrlCareerSave, reduceNrlCareer, type NrlCareerState } from '@/lib/nrlCareer';
import { NRL_SAVE_KEY, nrlNextRound } from '@/lib/nrlManager';
import { fenceKeyOf, saveFence } from '@/lib/saveFence';
import NrlTeamManager from '@/pages/NrlTeamManager';

vi.mock('@/components/game/GameNav', () => ({ GameNav: () => null }));
vi.mock('@/components/game/GameNavbar', () => ({ GameNavbar: () => null }));
vi.mock('@/components/game/RulesGate', () => ({ RulesGate: ({ children }: { children: ReactNode }) => <>{children}</> }));
vi.mock('@/components/seo/GameSeoContent', () => ({ default: () => null }));
vi.mock('@/components/seo/PageSeo', () => ({ default: () => null }));
vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: () => undefined }));

const fenceKey = fenceKeyOf(NRL_SAVE_KEY);
const raw = () => localStorage.getItem(NRL_SAVE_KEY);
const click = (name: string) => fireEvent.click(screen.getByRole('button', { name }));
const show = () => render(<MemoryRouter initialEntries={['/nrl-team-manager']}><NrlTeamManager /></MemoryRouter>);
const advance = (state: NrlCareerState) => reduceNrlCareer(state, { type: 'advance' });
function through(career: NrlCareerState, round: number) {
  for (let next = 1; next < round; next++) career = advance(career);
  expect(career.season.round).toBe(round);
  return career;
}
function accept(career: NrlCareerState) {
  return reduceNrlCareer(career, { type: 'acceptBoardPathways', year: career.season.year, clubId: career.season.clubId });
}
const review = () => { click('Club office'); click('Season review'); };
const board = () => within(screen.getByRole('region', { name: 'Board pathways' }));
const summary = () => within(board().getByRole('region', { name: 'Pathways run-in' }));
function open(career: NrlCareerState) {
  localStorage.setItem(NRL_SAVE_KEY, JSON.stringify(career));
  localStorage.setItem(fenceKey, '4');
  const page = show();
  review();
  return page;
}

afterEach(() => {
  cleanup();
  saveFence.release(NRL_SAVE_KEY);
  localStorage.clear();
});

it('keeps the selected rotation target across reload and shows its exact award', () => {
  const before = createNrlCareer('broncos', 2, 2026);
  const first = open(before);
  const choice = { type: 'acceptBoardPathways', year: 2026, clubId: 'broncos', brief: 'rotation' } as const;
  expect(board().getByText(/3 players aged 23 or under · 4 appearances each · \$200,000/)).toBeVisible();
  expect(board().getByText(/2 players aged 23 or under · 6 appearances each · \$225,000/)).toBeVisible();
  click('Accept rotation objective');
  const pending = reduceNrlCareer(before, choice);
  expect(raw()).toBe(JSON.stringify(pending));
  expect(localStorage.getItem(fenceKey)).toBe('5');
  first.unmount();
  show();
  review();
  expect(board().getByText(/Regular rotation · 2 players/)).toBeVisible();
  expect(board().queryByRole('button', { name: 'Accept pathways objective' })).toBeNull();
  expect(raw()).toBe(JSON.stringify(pending));
  cleanup();
  saveFence.release(NRL_SAVE_KEY);
  const runIn = through(pending, 27);
  open(runIn);
  expect(summary().getByText('Target secured')).toBeVisible();
  expect(nrlBoardPathwaysIncome(runIn.finance)).toBe(0);
  click('Match centre');
  click('Quick Sim');
  review();
  expect(board().getByRole('status')).toHaveTextContent('Target met. $225,000 paid into club cash.');
  expect(raw()).toBe(JSON.stringify(advance(runIn)));
});

it.each([
  [2026, 'broncos', 246, 'broncos-11-0', 'Jesse Hewitt', 'Left Second Row', true],
  [2027, 'storm', 276, 'storm-3-1', 'Teo Vale', 'Left Centre', false],
] as const)('shows the last possible player selection and reconciles the final bonus in %i', (
  year, clubId, seed, playerId, name, role, pick,
) => {
  const initial = through(accept(createNrlCareer(clubId, seed, year)), 27);
  const progress = nrlBoardPathwaysProgress(initial.season, initial.players);
  expect(progress.filter(player => player.apps >= 4)).toHaveLength(2);
  expect(progress.find(player => player.id === playerId)?.apps).toBe(3);
  const page = open(initial);
  expect(summary().getByText('1 regular-season club match left.')).toBeVisible();
  expect(summary().getByText('Target still open')).toBeVisible();
  const candidates = within(summary().getByRole('list', { name: 'Players who can reach four appearances' }));
  expect(candidates.getAllByRole('listitem')).toHaveLength(1);
  expect(candidates.getByText(name)).toBeVisible();
  expect(candidates.getByText('3 of 4 appearances · Needs 1 more')).toBeVisible();
  expect(raw()).toBe(JSON.stringify(initial));
  expect(localStorage.getItem(fenceKey)).toBe('4');

  let expected = initial;
  if (pick) {
    click('Squad');
    fireEvent.change(screen.getByLabelText(role, { exact: true }), { target: { value: playerId } });
    expected = reduceNrlCareer(initial, { type: 'selectStarter', role, playerId });
    expect(readNrlCareerSave(raw())).toEqual(expected);
  }
  click('Match centre');
  click('Quick Sim');
  expected = advance(expected);
  const settled = readNrlCareerSave(raw())!;
  expect(settled).toEqual(expected);
  expect(nrlBoardPathwaysIncome(settled.finance)).toBe(pick ? 200000 : 0);
  expect(settled.finance.pathways?.earnedBy?.includes(playerId) ?? false).toBe(pick);
  expect(localStorage.getItem(fenceKey)).toBe(pick ? '6' : '5');
  page.unmount();
  show();
  review();
  expect(board().getByRole('status')).toHaveTextContent(pick ? 'Target met. $200,000 paid into club cash.' : 'Target missed. No bonus was paid.');
  expect(board().queryByRole('region', { name: 'Pathways run-in' })).not.toBeInTheDocument();
  expect(raw()).toBe(JSON.stringify(expected));
});

it('counts club fixtures ahead rather than calendar rounds on a bye', () => {
  const start = accept(createNrlCareer('broncos', 246));
  const initial = through(start, 23);
  expect(nrlNextRound(initial.season).clubStatus).toBe('bye');
  open(initial);
  expect(summary().getByText('4 regular-season club matches left.')).toBeVisible();
  click('Match centre');
  click('Simulate bye round');
  review();
  expect(summary().getByText('4 regular-season club matches left.')).toBeVisible();
  expect(readNrlCareerSave(raw())).toEqual(advance(initial));
});

it('labels an impossible late target without promising a bonus', () => {
  const initial = through(accept(createNrlCareer('broncos', 2)), 25);
  expect(readNrlCareerSave(JSON.stringify(initial))).not.toBeNull();
  open(initial);
  expect(summary().getByText('Target out of reach')).toBeVisible();
  expect(nrlBoardPathwaysIncome(initial.finance)).toBe(0);
});

it('keeps the early-season card compact and distinguishes securing the target from payment', () => {
  const start = accept(createNrlCareer('broncos', 1));
  const page = open(start);
  expect(board().queryByRole('region', { name: 'Pathways run-in' })).not.toBeInTheDocument();
  page.unmount();
  const initial = through(start, 23);
  open(initial);
  expect(summary().getByText('Target secured')).toBeVisible();
  expect(nrlBoardPathwaysIncome(initial.finance)).toBe(0);
});

it('marks a currently unavailable contender while keeping the remaining count an upper bound', () => {
  const initial = through(accept(createNrlCareer('broncos', 246)), 24);
  const playerId = 'broncos-11-0';
  expect(nrlBoardPathwaysProgress(initial.season, initial.players).find(player => player.id === playerId)?.apps).toBe(3);
  const withSpell = reduceNrlCareer(initial, { type: 'startReserveGrade', year: 2026, clubId: 'broncos', round: 24, playerId });
  if (withSpell === initial) {
    throw new Error('Fixture needs a contender who can actually enter reserve grade.');
  }
  open(withSpell);
  expect(summary().getByText('Target still open')).toBeVisible();
  expect(within(summary().getByText('Jesse Hewitt').closest('li')!).getByText(/Currently unavailable/)).toBeVisible();
  expect(summary().getByText(/Injuries, suspensions and reserve-grade spells/)).toBeVisible();
});
