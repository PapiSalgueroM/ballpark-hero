import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import { createNrlCareer, readNrlCareerSave } from '@/lib/nrlCareer';
import { NRL_SAVE_KEY } from '@/lib/nrlManager';
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
const page = () => render(<MemoryRouter initialEntries={['/nrl-team-manager']}><NrlTeamManager /></MemoryRouter>);
const click = (name: string | RegExp) => fireEvent.click(screen.getByRole('button', { name }));
const openPlans = () => {
  const summary = screen.getByText(/^Attack plan/);
  const details = summary.closest('details')!;
  details.open = true;
  fireEvent(details, new Event('toggle'));
  return within(details);
};

afterEach(() => {
  cleanup();
  saveFence.release(NRL_SAVE_KEY);
  localStorage.clear();
});

it('shows both signed tradeoffs, persists a match choice and locks it during a reloaded halftime', () => {
  const baseline = JSON.stringify(createNrlCareer('broncos', 16));
  localStorage.setItem(NRL_SAVE_KEY, baseline);
  localStorage.setItem(fence, '6');
  const mounted = page();
  expect(raw()).toBe(baseline);
  let choices = openPlans();
  expect(choices.getAllByText(/Attack [+-]/).length).toBeGreaterThan(0);
  expect(choices.getAllByText('Defence -2')).toHaveLength(2);
  expect(raw()).toBe(baseline);
  click(/Through the middle/);
  expect(readNrlCareerSave(raw())!.season.attackPlan).toBe('middle');
  click('Squad');
  click('Match centre');
  choices = openPlans();
  expect(choices.getByRole('button', { name: /Through the middle/ }).getAttribute('aria-pressed')).toBe('true');
  click(/Standard/);
  expect(raw()).toBe(baseline);
  click(/Shift wide/);
  click('Play Live');
  expect(screen.getByText('Attack plan: Shift wide. Locked for this match.')).toBeTruthy();
  const pending = raw();
  mounted.unmount();
  page();
  expect(raw()).toBe(pending);
  expect(screen.getByText('Attack plan: Shift wide. Locked for this match.')).toBeTruthy();
  expect(screen.queryByRole('button', { name: /Through the middle/ })).toBeNull();
  click('Play second half');
  expect(readNrlCareerSave(raw())!.season).not.toHaveProperty('attackPlan');
});
