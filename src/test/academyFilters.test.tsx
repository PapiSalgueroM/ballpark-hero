/* Round 746: mount the actual academy screen with known prospects and prove
   position/age selections change its rows without changing signing rules.

   Negative control: copy AcademyScreen.tsx into an ignored tmp/ folder, first
   asserting its
   `.filter(p =>` selection line exists exactly once, then replace that line
   with `.filter(() => true)`. Set NO_DOUBLE_SWAP to a JSON object mapping
   @/components/club-manager/AcademyScreen to that copy (vitest.config.ts already
   supports it). Run this file; combination, empty state and callback tests fail.
   The normal component is never edited by this procedure. */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { CareerState, Prospect } from '@/lib/clubManager';
import { AcademyScreen } from '@/components/club-manager/AcademyScreen';

vi.mock('@/lib/clubManager', () => ({
  SCOUT_REGIONS: [{ id: 'region', name: 'Region', flag: '' }],
  SCOUT_TRIPS: [{ weeks: 1 }, { weeks: 2 }],
  MAX_SCOUTS: 3,
  MAX_PROSPECTS: 20,
  FACILITY_INFO: Object.fromEntries(['recruitment', 'coaching', 'facilities'].map(kind => [kind, { emoji: '', label: kind, blurb: kind }])),
  academyUpgradeCost: () => 1,
  tripCost: () => 1,
  money: (n: number) => `£${n}`,
  moneyIn: () => (n: number) => `£${n}`,
}));

function prospect(id: string, name: string, position: Prospect['position'], age: number, highGuess: number, fee = 0): Prospect {
  return { id, name, position, age, highGuess, lowGuess: 60, rating: 55, potential: 75, source: 'Academy', flag: '', fee, season: 1 };
}
const kids = [
  prospect('older-forward', 'Older Forward', 'ST', 18, 94),
  prospect('younger-forward', 'Younger Forward', 'ST', 16, 80),
  prospect('young-keeper', 'Young Keeper', 'GK', 16, 88, 5),
  prospect('young-defender', 'Young Defender', 'CB', 16, 72),
];
function career(prospects = kids, budget = 10, squadSize = 10): CareerState {
  return {
    budget, squad: Array.from({ length: squadSize }, () => ({})),
    academy: { recruitment: 1, coaching: 1, facilities: 1, scouts: [], candidates: [], prospects, lastIntakeSeason: 1 },
  } as unknown as CareerState;
}
function mount(state = career()) {
  const callbacks = { onUpgrade: vi.fn(), onHire: vi.fn(), onRecall: vi.fn(), onPromote: vi.fn(), onRelease: vi.fn() };
  return { ...render(<AcademyScreen career={state} {...callbacks} />), callbacks };
}
function filter(position: string, age: string) {
  fireEvent.change(screen.getByRole('combobox', { name: 'Position' }), { target: { value: position } });
  fireEvent.change(screen.getByRole('combobox', { name: 'Age' }), { target: { value: age } });
}
afterEach(cleanup);

describe('academy position and age filters', () => {
  it('combines both filters while keeping the original reported-ceiling order and source list', () => {
    const state = career();
    const before = JSON.stringify(state);
    mount(state);
    expect(screen.getByRole('status')).toHaveTextContent('Showing 4 of 4 prospects');
    expect(screen.getByText(/Older Forward/).compareDocumentPosition(screen.getByText(/Young Keeper/)) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByText(/Young Keeper/).compareDocumentPosition(screen.getByText(/Younger Forward/)) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    filter('ST', '');
    expect(screen.getByRole('status')).toHaveTextContent('Showing 2 of 4 prospects');
    expect(screen.queryByText(/Young Keeper/)).not.toBeInTheDocument();
    filter('ST', '16');
    expect(screen.getByRole('status')).toHaveTextContent('Showing 1 of 4 prospects');
    expect(screen.getByText(/Younger Forward/)).toBeInTheDocument();
    expect(screen.queryByText(/Older Forward/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Young Defender/)).not.toBeInTheDocument();
    expect(JSON.stringify(state)).toBe(before);
  });

  it('distinguishes no matches from an empty academy and resets both selections', () => {
    mount();
    filter('GK', '18');
    expect(screen.getByRole('status')).toHaveTextContent('Showing 0 of 4 prospects');
    expect(screen.getByText(/No prospects match those filters/)).toBeInTheDocument();
    expect(screen.queryByText(/Nobody yet/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Sign him: / })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Reset filters' }));
    expect(screen.getByRole('combobox', { name: 'Position' })).toHaveValue('');
    expect(screen.getByRole('combobox', { name: 'Age' })).toHaveValue('');
    expect(screen.getByRole('status')).toHaveTextContent('Showing 4 of 4 prospects');
    expect(screen.getAllByRole('button', { name: /^Sign him: / })).toHaveLength(4);
    expect(screen.getByRole('button', { name: 'Reset filters' })).toBeDisabled();
  });

  it('keeps the original intake explanation when there are no prospects', () => {
    mount(career([]));
    expect(screen.getByText(/Nobody yet/)).toBeInTheDocument();
    expect(screen.queryByText(/No prospects match those filters/)).not.toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('passes the actual visible prospect ID to sign and release callbacks', () => {
    const { callbacks } = mount();
    filter('ST', '16');
    fireEvent.click(screen.getByRole('button', { name: /^Sign him: / }));
    fireEvent.click(screen.getByRole('button', { name: /^Let go: / }));
    expect(callbacks.onPromote).toHaveBeenCalledExactlyOnceWith('younger-forward');
    expect(callbacks.onRelease).toHaveBeenCalledExactlyOnceWith('younger-forward');
  });

  it.each([{ budget: 4, squadSize: 10 }, { budget: 10, squadSize: 30 }])('keeps signing disabled for budget $budget and squad size $squadSize', ({ budget, squadSize }) => {
    const { callbacks } = mount(career(kids, budget, squadSize));
    filter('GK', '16');
    const sign = screen.getByRole('button', { name: /^Sign him: / });
    expect(sign).toBeDisabled();
    fireEvent.click(sign);
    expect(callbacks.onPromote).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: /^Let go: / }));
    expect(callbacks.onRelease).toHaveBeenCalledExactlyOnceWith('young-keeper');
  });

  it('retains the selected labels if signing or releasing removes the last match', () => {
    const { rerender, callbacks } = mount();
    filter('GK', '16');
    rerender(<AcademyScreen career={career(kids.filter(p => p.position !== 'GK'))} {...callbacks} />);
    expect(screen.getByRole('combobox', { name: 'Position' })).toHaveValue('GK');
    expect(screen.getByRole('combobox', { name: 'Age' })).toHaveValue('16');
    expect(screen.getByRole('status')).toHaveTextContent('Showing 0 of 3 prospects');
    expect(screen.getByText(/No prospects match those filters/)).toBeInTheDocument();
  });
});
