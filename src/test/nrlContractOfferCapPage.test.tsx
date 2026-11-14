import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import {
  createNrlCareer, nrlCareerCap, nrlCareerMarket, nrlContractCounteroffer, nrlContractOffer,
  readNrlCareerSave, reduceNrlCareer, type NrlCareerState,
} from '@/lib/nrlCareer';
import { NRL_SAVE_KEY } from '@/lib/nrlManager';
import { fenceKeyOf, saveFence } from '@/lib/saveFence';
import NrlTeamManager from '@/pages/NrlTeamManager';

vi.mock('@/components/game/GameNav', () => ({ GameNav: () => null }));
vi.mock('@/components/game/GameNavbar', () => ({ GameNavbar: () => null }));
vi.mock('@/components/game/RulesGate', () => ({ RulesGate: ({ children }: { children: ReactNode }) => <>{children}</> }));
vi.mock('@/components/seo/GameSeoContent', () => ({ default: () => null }));
vi.mock('@/components/seo/PageSeo', () => ({ default: () => null }));
vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: () => undefined }));

const currency = new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 });
const fence = fenceKeyOf(NRL_SAVE_KEY);
const raw = () => localStorage.getItem(NRL_SAVE_KEY);
const click = (name: string) => fireEvent.click(screen.getByRole('button', { name }));
const show = () => render(<MemoryRouter initialEntries={['/nrl-team-manager']}><NrlTeamManager /></MemoryRouter>);
const openContracts = () => { click('Club office'); click('Contracts'); };
function open(career: NrlCareerState) {
  localStorage.setItem(NRL_SAVE_KEY, JSON.stringify(career));
  localStorage.setItem(fence, '4');
  const view = show();
  openContracts();
  return view;
}
function offerCap() {
  return screen.getByRole('table', { name: 'Cap room and squad places' });
}
function verifyCap(before: NrlCareerState, after: NrlCareerState, years: readonly number[]) {
  const rows = within(offerCap()).getAllByRole('row').slice(1);
  expect(rows).toHaveLength(years.length);
  years.forEach((year, index) => {
    const oldCap = nrlCareerCap(before, year);
    const newCap = nrlCareerCap(after, year);
    const row = within(rows[index]);
    const cells = row.getAllByRole('cell');
    expect(row.getByRole('rowheader')).toHaveTextContent(String(year));
    expect(cells[0]).toHaveTextContent(currency.format(oldCap.available));
    expect(cells[0]).toHaveTextContent(currency.format(newCap.available));
    expect(cells[1]).toHaveTextContent(`${oldCap.openSlots} → ${newCap.openSlots}`);
    expect(oldCap.available - newCap.available).toBeGreaterThan(0);
    expect(oldCap.openSlots - newCap.openSlots).toBe(1);
  });
}

afterEach(() => {
  cleanup();
  saveFence.release(NRL_SAVE_KEY);
  localStorage.clear();
});

it('previews the entered salary and term then agrees exactly those seasons and cap amounts', () => {
  const initial = createNrlCareer('broncos', 1);
  const entry = nrlCareerMarket(initial).find(row => row.player.id === 'broncos-4-0')!;
  const view = open(initial);
  click('Extend for Jesse Forde');
  const salary = screen.getByLabelText('Annual salary (AUD)');
  const term = screen.getByLabelText('Term');
  const offeredSalary = entry.askingSalary + 25000;
  const action = { type: 'offerContract', playerId: entry.player.id, salary: offeredSalary, years: 1 } as const;
  const expected = reduceNrlCareer(initial, action);
  expect(expected).not.toBe(initial);
  fireEvent.change(salary, { target: { value: String(offeredSalary) } });
  fireEvent.change(term, { target: { value: '1' } });
  verifyCap(initial, expected, [2027]);
  expect(raw()).toBe(JSON.stringify(initial));
  expect(localStorage.getItem(fence)).toBe('4');
  click('Agree contract');
  expect(raw()).toBe(JSON.stringify(expected));
  expect(localStorage.getItem(fence)).toBe('5');
  view.unmount();
  show();
  openContracts();
  expect(screen.getByText('Agreed through 2027 at $565,000 per season')).toBeVisible();
  const actual = readNrlCareerSave(raw())!;
  expect(nrlCareerCap(actual, 2027)).toEqual(nrlCareerCap(expected, 2027));
  expect(nrlCareerCap(actual, 2028)).toEqual(nrlCareerCap(initial, 2028));
});

it('previews three actual counteroffer seasons and saves once only on acceptance', () => {
  const initial = createNrlCareer('bears', 38, 2027);
  const entry = nrlCareerMarket(initial).find(row => row.player.id === 'bears-1-0')!;
  const view = open(initial);
  click('Extend for Malachi Hewitt');
  const offeredSalary = entry.askingSalary - 20000;
  const quote = nrlContractCounteroffer(initial, entry.player.id, offeredSalary);
  if (!quote.ok) throw new Error('Expected an eligible counteroffer fixture.');
  const expected = reduceNrlCareer(initial, {
    type: 'acceptCounteroffer', playerId: entry.player.id, year: 2027, offeredSalary, contract: quote.contract,
  });
  fireEvent.change(screen.getByLabelText('Annual salary (AUD)'), { target: { value: String(offeredSalary) } });
  expect(screen.queryByRole('table', { name: 'Cap room and squad places' })).not.toBeInTheDocument();
  click('Request counteroffer');
  verifyCap(initial, expected, [2028, 2029, 2030]);
  expect(raw()).toBe(JSON.stringify(initial));
  click('Decline counteroffer');
  expect(screen.queryByRole('table', { name: 'Cap room and squad places' })).not.toBeInTheDocument();
  click('Request counteroffer');
  click('Accept counteroffer');
  expect(raw()).toBe(JSON.stringify(expected));
  expect(localStorage.getItem(fence)).toBe('5');
  view.unmount();
  show();
  openContracts();
  expect(screen.getByText('Agreed through 2030 at $423,489 per season')).toBeVisible();
  expect(readNrlCareerSave(raw())?.players.find(player => player.id === entry.player.id)?.futureContract).toEqual(quote.contract);
});

it('keeps an over-cap offer on its refusal and leaves the save untouched', () => {
  const initial = createNrlCareer('broncos', 1);
  const salary = nrlCareerCap(initial, 2027).cap + 1;
  const quote = nrlContractOffer(initial, 'broncos-4-0', salary, 2);
  expect(quote).toEqual({ ok: false, reason: 'This offer exceeds the 2027 salary cap.' });
  open(initial);
  click('Extend for Jesse Forde');
  fireEvent.change(screen.getByLabelText('Annual salary (AUD)'), { target: { value: String(salary) } });
  expect(screen.getByText('This offer exceeds the 2027 salary cap.')).toBeVisible();
  expect(screen.getByRole('button', { name: 'Agree contract' })).toBeDisabled();
  expect(screen.queryByRole('table', { name: 'Cap room and squad places' })).not.toBeInTheDocument();
  expect(raw()).toBe(JSON.stringify(initial));
  expect(localStorage.getItem(fence)).toBe('4');
});
