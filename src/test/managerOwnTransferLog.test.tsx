import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TransferScreen } from '@/components/club-manager/TransferScreen';
import { moneyIn, startCareer, type CareerState, type TransferNews } from '@/lib/clubManager';

// Synthetic saved display rows. These are not claims about real transfers.
function fixture(): CareerState {
  const random = vi.spyOn(Math, 'random').mockReturnValue(0.6);
  try {
    const state = startCareer('Brentford');
    return { ...state, negotiation: null, aiHeadlines: [], incomingBids: [],
      seasonSignings: [{ dir: 'out', name: 'Fixture sale', fee: 7 }],
      transferLog: [
        { name: 'Fixture purchase', from: 'Fixture seller', to: state.clubName, fee: 12, season: state.season, week: 1 },
        { name: 'Fixture sale', from: state.clubName, to: 'Arsenal', fee: 9, season: state.season, week: 2 },
        { name: 'Fixture loan in', from: 'Fixture lender', to: state.clubName, fee: 0.5, loan: true, season: state.season, week: 3 },
        { name: 'Fixture loan out', from: state.clubName, to: 'Fixture borrower', fee: 0.2, loan: true, season: state.season, week: 4 },
        { name: 'Fixture other deal', from: 'Fixture seller', to: 'Fixture buyer', fee: 20, season: state.season, week: 5 },
      ] };
  } finally { random.mockRestore(); }
}
function screen(career: CareerState) {
  const action = vi.fn();
  const props = { market: [], onNegotiate: action, onOffer: action, onWalk: action, onDismissNegotiation: action,
    onClause: action, onLoan: action, onAcceptBid: action, onRejectBid: action, onSetStatus: action,
    onLoanOut: action, onProposeTerms: action, onBuyLoanee: action, onEndLoanEarly: action, onRecallLoanee: action };
  const view = render(<TransferScreen career={career} {...props} />);
  fireEvent.click(view.getByRole('button', { name: 'Latest' }));
  return { ...view, action, update: (next: CareerState) => view.rerender(<TransferScreen career={next} {...props} />) };
}
function own(view: ReturnType<typeof screen>) {
  const button = view.queryByRole('button', { name: 'Your club' });
  expect(button !== null).toBe(true);
  fireEvent.click(button!);
}
function names(view: ReturnType<typeof screen>): string[] {
  return [...view.container.querySelectorAll('div.max-h-96 > div')]
    .map(row => row.querySelector('span.font-bold')?.textContent ?? '');
}
const held = (state: CareerState) => JSON.stringify(state);
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('Club Manager own transfer history', () => {
  it('own history shows saved buys sales loans and exact counterparties', () => {
    const state = fixture(), before = held(state), view = screen(state);
    const random = vi.spyOn(Math, 'random');
    own(view);
    expect(names(view)).toEqual(['Fixture loan out', 'Fixture loan in', 'Fixture sale', 'Fixture purchase']);
    const cash = moneyIn(state);
    for (const record of state.transferLog!.slice(0, 4)) {
      const row = view.getByText(record.name, { exact: true }).parentElement!.parentElement!;
      expect(row).toHaveTextContent(`${record.from} to ${record.to}`);
      expect(row).toHaveTextContent(cash(record.fee));
      if (record.loan) expect(row).toHaveTextContent('(loan)');
    }
    expect(view.queryByText('Fixture other deal', { exact: true })).toBeNull();
    expect(held(state)).toBe(before); expect(view.action).not.toHaveBeenCalled(); expect(random).not.toHaveBeenCalled();
  });

  it('own history filters before the fifty-row limit', () => {
    const state = fixture(), ownRows = state.transferLog!.slice(0, 4);
    const laterAi: TransferNews[] = Array.from({ length: 55 }, (_, index) => ({
      name: `Fixture AI ${index}`, from: 'Fixture seller', to: 'Fixture buyer', fee: index,
      season: state.season, week: index + 5,
    }));
    state.transferLog = [...ownRows, ...laterAi];
    const view = screen(state);
    expect(names(view)).toHaveLength(50); expect(view.queryByText('Fixture purchase', { exact: true })).toBeNull();
    own(view);
    expect(names(view)).toEqual([...ownRows].reverse().map(row => row.name));
  });

  it('own history keeps both sorts and returns to all clubs', () => {
    const state = fixture(), view = screen(state);
    own(view);
    fireEvent.click(view.getByRole('button', { name: 'Biggest fees' }));
    expect(names(view)).toEqual(['Fixture purchase', 'Fixture sale', 'Fixture loan in', 'Fixture loan out']);
    fireEvent.click(view.getByRole('button', { name: 'Most recent' }));
    expect(names(view)).toEqual(['Fixture loan out', 'Fixture loan in', 'Fixture sale', 'Fixture purchase']);
    fireEvent.click(view.getByRole('button', { name: 'All clubs' }));
    expect(names(view)).toEqual([...state.transferLog!].reverse().map(row => row.name));
  });

  it('own history follows the current club when the same log is rerendered', () => {
    const state = fixture(), view = screen(state);
    own(view);
    view.update({ ...state, clubName: 'Arsenal' });
    expect(names(view)).toEqual(['Fixture sale']);
    view.update(state);
    expect(names(view)).toEqual(['Fixture loan out', 'Fixture loan in', 'Fixture sale', 'Fixture purchase']);
  });

  it('own history explains an empty recorded list without claiming a complete history', () => {
    const state = fixture(); state.transferLog = [state.transferLog![4]];
    const view = screen(state);
    own(view);
    expect(names(view)).toEqual([]);
    expect(view.getByText('No recent recorded deals for your club.')).toBeInTheDocument();
    expect(view.queryByText('Fixture other deal', { exact: true })).toBeNull();
  });

  it('history explains that older moves may no longer be recorded', () => {
    const view = screen(fixture());
    expect(view.queryByText('Recent recorded deals only. Older moves may no longer be in this save.') !== null).toBe(true);
  });

  it('all clubs preserves the existing newest-first default', () => {
    const state = fixture(), before = held(state), view = screen(state);
    expect(names(view)).toEqual([...state.transferLog!].reverse().map(row => row.name));
    expect(held(state)).toBe(before); expect(view.action).not.toHaveBeenCalled();
  });

  it('all clubs preserves biggest-fee ordering and saved gross fees', () => {
    const state = fixture(), view = screen(state);
    fireEvent.click(view.getByRole('button', { name: 'Biggest fees' }));
    expect(names(view)).toEqual(['Fixture other deal', 'Fixture purchase', 'Fixture sale', 'Fixture loan in', 'Fixture loan out']);
    const row = view.getByText('Fixture sale', { exact: true }).parentElement!.parentElement!;
    expect(row).toHaveTextContent(moneyIn(state)(9));
  });

  it('all clubs keeps its empty-state wording when no transfers are recorded', () => {
    const state = fixture(); state.transferLog = [];
    const view = screen(state);
    expect(names(view)).toEqual([]);
    expect(view.getByText('No transfers yet. Open a window and make some noise.')).toBeInTheDocument();
  });

  it('browsing preserves the net season ledger saved log callbacks and random stream', () => {
    const state = { ...fixture(), transferWindow: null }, before = held(state);
    const random = vi.spyOn(Math, 'random');
    const view = screen(state);
    fireEvent.click(view.getByRole('button', { name: 'Biggest fees' }));
    fireEvent.click(view.getByRole('button', { name: 'Most recent' }));
    fireEvent.click(view.getByRole('button', { name: 'Buy' }));
    const business = view.getByTestId('cm-season-business');
    expect(business).toHaveTextContent('Fixture sale'); expect(business).toHaveTextContent(moneyIn(state)(7));
    expect(state.transferLog![1].fee).toBe(9); expect(state.seasonSignings[0].fee).toBe(7);
    expect(held(state)).toBe(before); expect(view.action).not.toHaveBeenCalled(); expect(random).not.toHaveBeenCalled();
  });
});
