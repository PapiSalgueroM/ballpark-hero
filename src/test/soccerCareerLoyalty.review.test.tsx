import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { CareerState, ContractOffer } from '@/lib/soccerCareerEngine';
import { chooseLoyalty, commitLoyaltySigning } from '@/lib/soccerCareerLoyalty';
import { chooseProgramme } from '@/lib/soccerCareerProgramme';
import { buildSoccerOfferReview } from '@/lib/soccerOfferReview';
import { SoccerOfferReview } from '@/components/soccer-career/SoccerOfferReview';
import { setCurrency } from '@/lib/soccerCurrency';

afterEach(cleanup);
const offer: ContractOffer = {
  club: { id: 'loyalty-ui', name: 'Loyalty Fixture Club', country: 'Fixture Country', league: 'Fixture League', color: '#123456', tier: 3 },
  wage: 10000, contractYears: 2, transferFee: 0,
};
function fixture(): CareerState {
  const packet = JSON.parse(readFileSync(resolve(process.cwd(), 'scripts/data/careerLeagueWorldSaves1100.json'), 'utf8'));
  const entry = packet.saves.find((row: { id: string }) => row.id === 'ere');
  if (!entry?.state) throw new Error('Existing admitted complete fixture ere is required');
  const state = structuredClone(entry.state) as CareerState;
  delete state.agentId;
  state.phase = 'contract_offer'; state.retired = false; state.loan = null;
  state.pendingOffers = [structuredClone(offer)]; state.transferSituation = null;
  state.currentClub = 'Previous Fixture Club'; state.weeklyWage = 8000;
  state.netWorth = 2; state.totalEarnings = 3; state.events = [];
  return state;
}
function open(career: CareerState, proposed: ContractOffer) {
  setCurrency('EUR');
  const review = buildSoccerOfferReview(career, proposed);
  render(<SoccerOfferReview club={proposed.club.name} review={review} onAccept={() => undefined} />);
  fireEvent.click(screen.getByRole('button', { name: 'Review contract with ' + proposed.club.name }));
}
describe('actual loyalty contract review', () => {
  it('shows the selected lower wage and the exact deferred payout before signing', () => {
    open(chooseLoyalty(fixture(), offer, 10000, 'loyalty'), offer);
    expect(document.querySelector('[data-offer-signed-wage]')?.getAttribute('data-offer-signed-wage')).toBe('9000');
    const note = document.querySelector('[data-loyalty-offer]');
    expect(note).not.toBeNull();
    expect(note?.textContent).toContain('156,000');
    expect(note?.textContent).toContain('2 recorded contract seasons');
  });
  it('blocks signing until an outdated agent-dependent loyalty choice is refreshed', () => {
    const staged = chooseLoyalty(fixture(), offer, 10000, 'loyalty');
    staged.agentId = 'self';
    open(staged, offer);
    expect(document.querySelector('[data-loyalty-stale]')).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Sign contract' })).toBeDisabled();
  });
  it('blocks review of the actual revised same-club counteroffer', () => {
    const input = fixture();
    input.overall = 85;
    delete input.programme;
    const changed = chooseProgramme(chooseLoyalty(input, offer, 10000, 'loyalty'), 'negotiation', 'wage');
    expect(changed.pendingOffers[0].wage).toBe(11000);
    open(changed, changed.pendingOffers[0]);
    expect(document.querySelector('[data-loyalty-stale]')).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Sign contract' })).toBeDisabled();
  });
  it('keeps a loan review clear of a permanent-move forfeiture warning', () => {
    const before = chooseLoyalty(fixture(), offer, 10000, 'loyalty');
    const next = { ...before, currentClub: offer.club.name, weeklyWage: 9000, contractYearsLeft: 2, phase: 'playing' as const, pendingOffers: [] };
    const active = commitLoyaltySigning(before, next, offer, 10000);
    const loan = { ...offer, club: { ...offer.club, name: 'Loan Fixture Club' }, isLoan: true, contractYears: 1 };
    open(active, loan);
    expect(document.querySelector('[data-loyalty-forfeit]')).toBeNull();
  });
  it('shows the unpaid amount forfeited by an actual permanent move', () => {
    const before = chooseLoyalty(fixture(), offer, 10000, 'loyalty');
    const next = { ...before, currentClub: offer.club.name, weeklyWage: 9000, contractYearsLeft: 2, phase: 'playing' as const, pendingOffers: [] };
    const active = commitLoyaltySigning(before, next, offer, 10000);
    const proposed = { ...offer, club: { ...offer.club, name: 'Another Fixture Club' } };
    active.phase = 'transfer_window'; active.transferSituation = { type: 'one_offer', offer: proposed };
    open(active, proposed);
    const note = document.querySelector('[data-loyalty-forfeit]');
    expect(note).not.toBeNull();
    expect(note?.textContent).toContain('156,000');
    expect(note?.textContent).toContain('forfeits');
  });
});
