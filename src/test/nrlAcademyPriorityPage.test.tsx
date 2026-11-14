import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import { createNrlCareer, nrlAcademyReports, nrlCareerCap, nrlContractApproach, readNrlCareerSave, reduceNrlCareer } from '@/lib/nrlCareer';
import { createNrlSeason, NRL_SAVE_KEY } from '@/lib/nrlManager';
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
const click = (name: string) => fireEvent.click(screen.getByRole('button', { name }));
function goAcademy() {
  click('Club office');
  click('Academy');
}
function renderPage() {
  return render(<MemoryRouter initialEntries={['/nrl-team-manager']}><NrlTeamManager /></MemoryRouter>);
}
function open(bytes: string) {
  localStorage.setItem(NRL_SAVE_KEY, bytes);
  localStorage.setItem(fence, '4');
  const view = renderPage();
  goAcademy();
  return view;
}

afterEach(() => {
  cleanup();
  saveFence.release(NRL_SAVE_KEY);
  localStorage.clear();
});

it.each([
  [2026, 'panthers', 41, 'ready', 'Ready sooner', 'Simulate bye round'],
  [2027, 'bears', 41, 'ceiling', 'Higher ceiling', 'Quick Sim'],
] as const)('assigns a real %s scout, persists the revealed ratings and promotes the same player', (year, clubId, seed, priority, label, play) => {
  const initial = createNrlCareer(clubId, seed, year);
  const bytes = JSON.stringify(initial);
  const view = open(bytes);
  const priorityInput = screen.getByLabelText('Scouting priority');
  expect(priorityInput).toHaveValue('');
  fireEvent.change(priorityInput, { target: { value: priority } });
  fireEvent.change(screen.getByLabelText('Position to scout'), { target: { value: 'Hooker' } });
  expect(raw()).toBe(bytes);
  expect(localStorage.getItem(fence)).toBe('4');
  click('Assign scout');
  const assigned = reduceNrlCareer(initial, { type: 'scoutAcademy', role: 'Hooker', priority });
  expect(raw()).toBe(JSON.stringify(assigned));
  expect(screen.getByText(new RegExp('Scouting Hooker with ' + label.toLowerCase()))).toBeVisible();
  view.unmount();
  renderPage();
  goAcademy();
  expect(screen.getByText(new RegExp('Scouting Hooker with ' + label.toLowerCase()))).toBeVisible();
  click('Match centre');
  click(play);
  const advanced = reduceNrlCareer(assigned, { type: 'advance' });
  expect(raw()).toBe(JSON.stringify(advanced));
  goAcademy();
  const player = nrlAcademyReports(advanced)[0].player!;
  const list = within(screen.getByRole('list', { name: 'Academy reports' }));
  const row = within(list.getByRole('listitem'));
  expect(row.getByText(player.name)).toBeVisible();
  expect(row.getByText(new RegExp(player.rating + ' OVR · ' + player.potential + ' potential'))).toBeVisible();
  expect(row.getByText('Scouting priority ' + label)).toBeVisible();
  click('Promote ' + player.name);
  const promoted = reduceNrlCareer(advanced, { type: 'promoteAcademy', playerId: player.id });
  expect(readNrlCareerSave(raw())).toEqual(promoted);
  expect(row.getByText('Signed for ' + (year + 1))).toBeVisible();
  expect(localStorage.getItem(fence)).toBe('7');
});

it('keeps default scouting on a legacy save without forcing a profile', () => {
  const bytes = JSON.stringify(createNrlSeason('storm', 17));
  open(bytes);
  expect(screen.queryByLabelText('Scouting priority')).not.toBeInTheDocument();
  expect(screen.getByLabelText('Position to scout')).toBeVisible();
  expect(raw()).toBe(bytes);
});

it('opens a ready academy report from a fast-forward stop and clears the shortcut after the prospect signs', () => {
  const initial = createNrlCareer('panthers', 41);
  const view = open(JSON.stringify(initial));
  fireEvent.change(screen.getByLabelText('Position to scout'), { target: { value: 'Hooker' } });
  click('Assign scout');
  click('Match centre');
  expect(screen.queryByRole('region', { name: 'Club decisions' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByText('Fast-forward rounds', { exact: true }));
  click('Simulate through Round 2');
  const stepped = readNrlCareerSave(raw())!;
  expect(stepped.season.round).toBe(2);
  const player = nrlAcademyReports(stepped)[0].player!;
  const decisions = within(screen.getByRole('region', { name: 'Club decisions' }));
  expect(decisions.getByText(player.name + ' can sign from the academy.')).toBeVisible();
  click('Review academy report');
  expect(raw()).toBe(JSON.stringify(stepped));
  expect(localStorage.getItem(fence)).toBe('6');
  view.unmount();
  renderPage();
  click('Open Academy');
  click('Promote ' + player.name);
  const signed = reduceNrlCareer(stepped, { type: 'promoteAcademy', playerId: player.id });
  expect(raw()).toBe(JSON.stringify(signed));
  click('Match centre');
  expect(screen.queryByRole('region', { name: 'Club decisions' })).not.toBeInTheDocument();
  expect(localStorage.getItem(fence)).toBe('7');
});

it('keeps a reply at the deadline, opens Contracts and lets the manager take the cap gain', () => {
  const clubId = 'storm', year = 2026, playerId = 'storm-3-1';
  const listed = reduceNrlCareer(createNrlCareer(clubId, 4), { type: 'inviteContractApproach', playerId, permission: true, year, clubId, round: 1 });
  const deadline = reduceNrlCareer(reduceNrlCareer(listed, { type: 'advance' }), { type: 'advance' });
  const reply = nrlContractApproach(deadline)!;
  const before = JSON.stringify(deadline);
  const view = open(before);
  click('Match centre');
  expect(within(screen.getByRole('region', { name: 'Club decisions' })).getByText(/lets the offer expire/)).toBeVisible();
  fireEvent.click(screen.getByText('Fast-forward rounds', { exact: true }));
  click('Simulate through Round 4');
  expect(screen.getByText(/^No rounds simulated\. This is the last round to reply/)).toBeVisible();
  expect(raw()).toBe(before);
  expect(localStorage.getItem(fence)).toBe('4');
  click('Open Contracts');
  const offer = within(screen.getByRole('region', { name: 'Rival contract offer' }));
  expect(offer.getByText(/Reply by the end of Round 3/)).toBeVisible();
  expect(raw()).toBe(before);
  click('Accept offseason move');
  const accepted = reduceNrlCareer(deadline, { type: 'answerContractApproach', year, clubId, listedRound: 1,
    playerId, destinationId: reply.destinationId!, decision: 'accept' });
  expect(nrlCareerCap(accepted, year + 1).available).toBeGreaterThan(nrlCareerCap(deadline, year + 1).available);
  expect(raw()).toBe(JSON.stringify(accepted));
  view.unmount();
  renderPage();
  expect(screen.queryByRole('region', { name: 'Club decisions' })).not.toBeInTheDocument();
  expect(raw()).toBe(JSON.stringify(accepted));
  expect(localStorage.getItem(fence)).toBe('5');
});
