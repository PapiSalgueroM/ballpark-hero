import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import { createNrlCareer, nrlAcademyReports, readNrlCareerSave, reduceNrlCareer } from '@/lib/nrlCareer';
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
