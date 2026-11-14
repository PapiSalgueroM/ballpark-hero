import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import { createNrlCareer, nrlOffseasonFreeAgentPreview, readNrlCareerSave, reduceNrlCareer } from '@/lib/nrlCareer';
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
const click = (name: string) => fireEvent.click(screen.getByRole('button', { name }));
const review = () => { click('Club office'); click('Season review'); };
const show = () => render(<MemoryRouter initialEntries={['/nrl-team-manager']}><NrlTeamManager /></MemoryRouter>);
const currency = new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 });

afterEach(() => {
  cleanup();
  saveFence.release(NRL_SAVE_KEY);
  localStorage.clear();
});

it('only confirms the optional signings with the rollover and keeps exact receipts after reload', () => {
  let career = createNrlCareer('storm', 4);
  while (career.season.phase !== 'complete') career = reduceNrlCareer(career, { type: 'advance' });
  const preview = nrlOffseasonFreeAgentPreview(career)!;
  const bytes = JSON.stringify(career);
  localStorage.setItem(NRL_SAVE_KEY, bytes);
  localStorage.setItem(fence, '4');
  const page = show();
  review();
  const summary = screen.getByText('Fill open squad places', { exact: true });
  const details = summary.closest('details')!;
  fireEvent.click(summary);
  fireEvent(details, new Event('toggle'));
  const checkbox = within(details).getByRole('checkbox', { name: 'Prefer free agents when starting 2027' });
  expect(checkbox).not.toBeChecked();
  const planned = within(details).getByRole('list', { name: 'Projected free-agent signings' });
  expect(within(planned).getAllByRole('listitem').map(row => row.getAttribute('data-nrl-fill-player'))).toEqual(preview.signings.map(row => row.playerId));
  expect(within(details).getByText(new RegExp(currency.format(preview.available).replace('$', '\\$') + ' cap room'))).toBeVisible();
  fireEvent.click(checkbox);
  expect(checkbox).toBeChecked();
  expect(raw()).toBe(bytes);
  expect(localStorage.getItem(fence)).toBe('4');
  click('Start 2027');
  const expected = reduceNrlCareer(career, { type: 'startNextSeason', freeAgents: { fromYear: 2026, clubId: 'storm' } });
  expect(readNrlCareerSave(raw())).toEqual(expected);
  expect(localStorage.getItem(fence)).toBe('5');
  page.unmount();
  show();
  review();
  fireEvent.click(screen.getByText('Free agents signed for 2027 · ' + preview.signings.length, { exact: true }));
  const receipt = screen.getByRole('list', { name: 'Recorded free-agent signings' });
  expect(within(receipt).getAllByRole('listitem').map(row => row.textContent)).toEqual(preview.signings.map(row =>
    row.playerName + ' · ' + row.role + ' · ' + currency.format(row.annualSalary)));
  expect(raw()).toBe(JSON.stringify(expected));
  expect(localStorage.getItem(fence)).toBe('5');
});
