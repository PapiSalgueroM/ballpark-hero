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

it('shows the simulated read, locks a counter plan at both live pauses and records it at full time', () => {
  const baseline = JSON.stringify(createNrlCareer('broncos', 1));
  localStorage.setItem(NRL_SAVE_KEY, baseline);
  localStorage.setItem(fence, '6');
  const first = page();
  const choices = openPlans();
  expect(choices.getByText(/Simulated opponent style: Plays to the edges/)).toBeVisible();
  const counter = choices.getByRole('button', { name: /Counter opponent/ });
  expect(counter).toHaveTextContent('Attack -2');
  expect(counter).toHaveTextContent('Defence +3');
  expect(raw()).toBe(baseline);
  fireEvent.click(counter);
  expect(readNrlCareerSave(raw())!.season.attackPlan).toBe('counter');
  click('Play Live');
  expect(screen.getByText('Attack plan: Counter opponent. Locked for this match.')).toBeVisible();
  click('Play to 60 minutes');
  expect(screen.getByText('Attack plan: Counter opponent. Locked for this match.')).toBeVisible();
  const saved = raw();
  first.unmount();
  page();
  expect(raw()).toBe(saved);
  expect(screen.getByText('Attack plan: Counter opponent. Locked for this match.')).toBeVisible();
  click('Play final 20 minutes');
  expect(screen.getByText(/Counter plan: Protected the edges/)).toBeVisible();
  expect(readNrlCareerSave(raw())!.season.attackPlan).toBeUndefined();
});

it('holds a reserve only on Play Live, restores halftime and makes a stale tab refuse settlement', () => {
  const kickoff = createNrlCareer('broncos', 76);
  const baseline = JSON.stringify(kickoff);
  localStorage.setItem(NRL_SAVE_KEY, baseline);
  localStorage.setItem(fence, '6');
  const first = page();
  const summary = screen.getByText('Hold one reserve for later');
  const desk = summary.closest('details')!;
  expect(desk.open).toBe(false);
  desk.open = true;
  const picker = within(desk).getByLabelText('Opening rotation');
  const id = 'nrl-broncos-2026-28';
  fireEvent.change(picker, { target: { value: id } });
  expect(raw()).toBe(baseline);
  fireEvent.change(picker, { target: { value: '' } });
  expect(raw()).toBe(baseline);
  expect(localStorage.getItem(fence)).toBe('6');
  fireEvent.change(picker, { target: { value: id } });
  click('Play Live');
  const pending = raw()!;
  expect(readNrlCareerSave(pending)!.season.live?.heldReserveId).toBe(id);
  first.unmount();
  const second = page();
  expect(raw()).toBe(pending);
  const halftime = screen.getByText('Halftime interchange').closest('details')!;
  halftime.open = true;
  const choice = within(halftime).getByLabelText('Reserve to finish the match');
  expect(within(halftime).getByText(/sat out the first half/)).toBeVisible();
  fireEvent.change(choice, { target: { value: id } });
  expect(raw()).toBe(pending);
  click('Play second half');
  const settled = raw();
  expect(readNrlCareerSave(settled)!.season.results.find(result => result.homeId === 'broncos')!.halftimeInterchange).toEqual({
    reserveId: id, starterId: kickoff.season.lineup['Left Centre'], enteredAtHalf: true,
  });
  expect(screen.getByText(/Each played about 40 minutes/)).toBeVisible();
  second.unmount();

  localStorage.setItem(NRL_SAVE_KEY, pending);
  page();
  localStorage.setItem(NRL_SAVE_KEY, settled!);
  localStorage.setItem(fence, String(Number(localStorage.getItem(fence)) + 1));
  click('Play second half');
  expect(raw()).toBe(settled);
  expect(screen.getByText(/This season changed in another tab/i)).toBeVisible();
});
