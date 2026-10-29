/**
 * Release BS fix BS-sc415-3: the loyalty plan never claims a choice the player did not make. Cash is the
 * default terms and is never stored, so a career with nothing picked shows no recorded choice (no "Choice
 * recorded" badge, "Current choice: No choice recorded"), and a disabled cash button says why.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { CareerState, ContractOffer } from '@/lib/soccerCareerEngine';
import { programmeOptions } from '@/lib/soccerCareerProgramme';
import { chooseLoyalty } from '@/lib/soccerCareerLoyalty';

const offer: ContractOffer = {
  club: { id: 'loyalty-fixture', name: 'Loyalty Fixture Club', country: 'Fixture Country', league: 'Fixture League', color: '#123456', tier: 3 },
  wage: 10000, contractYears: 3, transferFee: 0,
};
function career(phase: CareerState['phase'], offers: ContractOffer[]): CareerState {
  const packet = JSON.parse(readFileSync(resolve(process.cwd(), 'scripts/data/careerLeagueWorldSaves1100.json'), 'utf8'));
  const state = structuredClone(packet.saves.find((entry: { id: string }) => entry.id === 'ere').state) as CareerState;
  delete state.agentId;
  delete (state as { loyaltyContracts?: unknown }).loyaltyContracts;
  state.phase = phase; state.retired = false; state.loan = null; state.transferSituation = null;
  state.pendingOffers = offers.map(o => structuredClone(o));
  return state;
}
const loyalty = (state: CareerState) => programmeOptions(state).find(view => view.id === 'loyalty')!;

describe('the loyalty plan records only real choices', () => {
  it('no ledger and nothing picked: no recorded choice, in play and at an offer', () => {
    for (const state of [career('playing', []), career('youth', []), career('contract_offer', [offer])]) {
      const view = loyalty(state);
      expect({ phase: state.phase, choice: view.choice }).toEqual({ phase: state.phase, choice: null });
      const cash = view.choices.find(c => c.id === 'cash')!;
      if (!cash.eligible) expect(cash.reason, `${state.phase}: a disabled cash button says why`).toBeTruthy();
    }
  });
  it('a picked loyalty payout is still the recorded choice', () => {
    const picked = chooseLoyalty(career('contract_offer', [offer]), offer, 10000, 'loyalty');
    expect(loyalty(picked).choice).toBe('loyalty');
  });
});
