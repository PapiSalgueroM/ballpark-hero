import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { GmBooksPanel } from '@/components/front-office-shared/GmBooksPanel';
import { GmFacilitiesPanel } from '@/components/front-office-shared/GmFacilitiesPanel';
import { GM_BOOKS_SPORTS, closeGmSeason, newGmBooks, setGmTicketTier, type GmBooksContext } from '@/lib/gmBooks';
import { newFacilities, startUpgrade } from '@/lib/gmFacilities';
import { GYM_FACILITY_PACK, NBA_FACILITY_PACK } from '@/data/gmFacilities/packs';

const ctx: GmBooksContext = {
  sport: GM_BOOKS_SPORTS.nba, cap: 165, payroll: 150, deadMoney: 0,
  facilities: { pack: NBA_FACILITY_PACK, state: newFacilities(NBA_FACILITY_PACK, 2) },
};

describe('GmBooksPanel', () => {
  it('prints the ledger lines and keeps the operations budget apart from players', () => {
    render(<GmBooksPanel books={newGmBooks(GM_BOOKS_SPORTS.nba, 2, 60, 165)} ctx={ctx} />);
    expect(screen.getByText('Gate')).toBeTruthy();
    expect(screen.getByText('League share')).toBeTruthy();
    expect(screen.getByText('Payroll')).toBeTruthy();
    expect(screen.getByText(/Never players/)).toBeTruthy();
  });

  it('a ticket button hands the tier back, and what it promises is what setGmTicketTier does', () => {
    const onTicketTier = vi.fn();
    const books = newGmBooks(GM_BOOKS_SPORTS.nba, 2, 60, 165);
    render(<GmBooksPanel books={books} ctx={ctx} onTicketTier={onTicketTier} />);
    fireEvent.click(screen.getByText(/Premium/));
    expect(onTicketTier).toHaveBeenCalledWith(2);
    expect(screen.getByText(/Finish a season on these and ownership adds a point of trust/)).toBeTruthy();
    expect(closeGmSeason(setGmTicketTier(books, 2).books, 60, 165).trust).toBe(61);
  });
});

describe('GmFacilitiesPanel', () => {
  it('shows each building with its level and refuses what the budget cannot cover', () => {
    const onUpgrade = vi.fn();
    render(<GmFacilitiesPanel pack={GYM_FACILITY_PACK} state={newFacilities(GYM_FACILITY_PACK, 2)} funds={0.1} onUpgrade={onUpgrade} />);
    expect(screen.getByText(/Dormitory/)).toBeTruthy();
    expect(screen.getByText('Room for six fighters.')).toBeTruthy();
    const btn = screen.getByText(/Build level 2, \$0\.840M/).closest('button') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    fireEvent.click(btn);
    expect(onUpgrade).not.toHaveBeenCalled();
  });

  it('a build in progress says how long is left', () => {
    const started = startUpgrade(GYM_FACILITY_PACK, newFacilities(GYM_FACILITY_PACK, 2), 'ring', 5)!.state;
    render(<GmFacilitiesPanel pack={GYM_FACILITY_PACK} state={started} funds={5} />);
    expect(screen.getByText('Level 2 ready in 2 weeks.')).toBeTruthy();
  });
});
