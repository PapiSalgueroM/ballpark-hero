import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import { createNrlCustomCareer, readNrlCareerSave, reduceNrlCareer } from '@/lib/nrlCareer';
import { NRL_SAVE_KEY } from '@/lib/nrlManager';
import { saveFence } from '@/lib/saveFence';
import NrlTeamManager from '@/pages/NrlTeamManager';

vi.mock('@/components/game/GameNav', () => ({ GameNav: () => null }));
vi.mock('@/components/game/GameNavbar', () => ({ GameNavbar: () => null }));
vi.mock('@/components/game/RulesGate', () => ({ RulesGate: ({ children }: { children: ReactNode }) => <>{children}</> }));
vi.mock('@/components/seo/GameSeoContent', () => ({ default: () => null }));
vi.mock('@/components/seo/PageSeo', () => ({ default: () => null }));
vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: () => undefined }));

const name = 'River City Redbacks';
const show = () => render(<MemoryRouter initialEntries={['/nrl-team-manager']}><NrlTeamManager /></MemoryRouter>);
const click = (name: string | RegExp) => fireEvent.click(screen.getByRole('button', { name }));

afterEach(() => { cleanup(); saveFence.release(NRL_SAVE_KEY); localStorage.clear(); });

it('creates a fictional Perth-slot club and consistently shows its world name across a saved match', () => {
  const mounted = show();
  click(/^2027/);
  const details = screen.getByText('Create a club', { selector: 'summary span' }).closest('details')!;
  details.open = true;
  const fields = within(details);
  fireEvent.change(fields.getByLabelText('Club name'), { target: { value: name } });
  fireEvent.change(fields.getByLabelText('Home ground'), { target: { value: 'River City Oval' } });
  fireEvent.change(fields.getByLabelText('Club colour'), { target: { value: 'purple' } });
  fireEvent.change(fields.getByLabelText('League slot'), { target: { value: 'bears' } });
  expect(fields.getByText(/inherits the simulated Perth Bears slot/)).toBeVisible();
  fireEvent.click(fields.getByRole('button', { name: 'Start custom career' }));
  const saved = readNrlCareerSave(localStorage.getItem(NRL_SAVE_KEY))!;
  expect(saved.customClub).toEqual({ name, ground: 'River City Oval', colour: 'purple', slotId: 'bears' });
  expect(screen.getByRole('heading', { name: /Bulldogs vs River City Redbacks|River City Redbacks vs Bulldogs/ })).toBeVisible();
  expect(screen.queryByText(/Bears · 2027 season/)).toBeNull();
  click('Play Live');
  expect(screen.getByRole('heading', { name: 'Half time' })).toBeVisible();
  expect(screen.getAllByText(name).length).toBeGreaterThan(0);
  mounted.unmount();
  show();
  click('Play to 60 minutes');
  expect(within(screen.getByRole('list', { name: 'Score after 60 minutes' })).getByText(name)).toBeVisible();
  click('Play final 20 minutes');
  expect(screen.getByRole('status').textContent).toContain(name);
  click('Ladder');
  expect(screen.getByRole('rowheader', { name })).toBeVisible();
  click('Career saves');
  expect(screen.getByText(name)).toBeVisible();
});

it('continues to show the fictional club in the competition and historic record after an offseason move', () => {
  let state = createNrlCustomCareer('broncos', 1, 2026, { name, ground: 'River City Oval', colour: 'teal' })!;
  while (state.season.phase !== 'complete') state = reduceNrlCareer(state, { type: 'advance' });
  state = reduceNrlCareer(state, { type: 'startNextSeason', move: { fromYear: 2026, clubId: 'bears' } });
  localStorage.setItem(NRL_SAVE_KEY, JSON.stringify(state));
  show();
  click('Ladder');
  expect(screen.getByRole('rowheader', { name })).toBeVisible();
  click('Club office');
  click('Season review');
  expect(screen.getByText('2026 ' + name)).toBeVisible();
  expect(screen.queryByText('2026 Broncos')).toBeNull();
});
