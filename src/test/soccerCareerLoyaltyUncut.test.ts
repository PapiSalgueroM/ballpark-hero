/**
 * Release BS fix BS-sc415-1: the 10% loyalty cut is a term of the loyalty contract, so a later
 * contract at the club (the extension, or the renewal when he stays) quotes from the wage he would
 * have had without it. Before the fix signExtension and stayAtClub quoted from the cut wage, so a
 * loyal player who stayed earned less than a cash player in about four careers of five.
 *
 * Seeded careers through the real engine, each played twice from the same seed: once taking the
 * loyalty payout on a 3 year deal at base EUR 10,000 a week, once taking cash. Both stay at the
 * club, sign the extension when the window opens with one deal season left, and play on until the
 * deal pays. While both runs stay in step (same seasons, no contract talk event moved either wage)
 * the extension must be the same EUR figure on both, and after the payout the loyal run must be
 * ahead on earnings. A renewal (no extension, contract run down) must quote the uncut wage too.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import * as E from '@/lib/soccerCareerEngine';
import type { CareerState, ContractOffer } from '@/lib/soccerCareerEngine';
import { chooseLoyalty, readLoyalty } from '@/lib/soccerCareerLoyalty';

const clubs = E.FALLBACK_CLUBS;
const offer: ContractOffer = {
  club: { id: 'loyalty-fixture', name: 'Loyalty Fixture Club', country: 'Fixture Country', league: 'Fixture League', color: '#123456', tier: 3 },
  wage: 10000, contractYears: 3, transferFee: 0,
};
function fixture(): CareerState {
  const packet = JSON.parse(readFileSync(resolve(process.cwd(), 'scripts/data/careerLeagueWorldSaves1100.json'), 'utf8'));
  const saved = packet.saves.find((entry: { id: string }) => entry.id === 'ere');
  if (!saved?.state) throw new Error('Existing admitted complete career fixture ere is required');
  const state = structuredClone(saved.state) as CareerState;
  delete state.agentId;
  state.phase = 'contract_offer'; state.retired = false; state.loan = null;
  state.currentClub = 'Previous Fixture Club'; state.weeklyWage = 8000;
  state.pendingOffers = [structuredClone(offer)]; state.transferSituation = null;
  state.netWorth = 2; state.totalEarnings = 3; state.events = [];
  return state;
}
const realRandom = Math.random;
afterEach(() => { Math.random = realRandom; });
function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
/* One step of a player who stays: plays his seasons, stays put in every window except the one
   the caller handles, dismisses every screen. */
function step(s: CareerState): CareerState | null {
  switch (s.phase) {
    case 'playing': return E.advanceProSeason(s, clubs);
    case 'contract_offer': return E.stayAtClub(s);
    case 'transfer_window': return E.stayAtClub(s);
    case 'rehab_choice': return E.applyRehabChoice(s, 1);
    case 'newspaper': return E.dismissNewspaper(s);
    case 'season_summary': return E.dismissSummary(s, clubs);
    case 'random_events': return s.pendingEvents?.[0] ? E.applyEventChoice(s, 1, clubs) : { ...s, pendingEvents: [], phase: 'playing' };
    case 'moral_dilemma': return E.dismissMoralDilemma(s, clubs);
    case 'social_media_action': return E.dismissSocialMediaPhase(s, clubs);
    case 'red_card_appeal_result': return E.dismissAppealResult(s, clubs);
    case 'international_debut': return E.dismissDebut(s, clubs);
    case 'world_cup': return E.dismissWorldCup(s, clubs);
    case 'rivalry_event': return E.dismissRivalryEvent(s, clubs);
    case 'ballon_dor': return E.dismissBallonDor(s, clubs);
    default: return null;
  }
}
interface Run { ext: number | null; wageMoved: boolean; seasonsAtExt: number; paid: boolean; earnings: number; seasons: number; trail: string }
function play(seed: number, mode: 'cash' | 'loyalty', renew: boolean): Run {
  Math.random = seeded(seed);
  let s = E.acceptOffer(chooseLoyalty(fixture(), offer, 10000, mode), offer);
  const signed = s.weeklyWage;
  let ext: number | null = null, seasonsAtExt = 0, wageMoved = false, paidAt = -1;
  for (let guard = 0; guard < 400 && s; guard += 1) {
    if (ext === null && s.weeklyWage !== signed) wageMoved = true;
    if (s.currentClub !== offer.club.name) break;
    const deals = readLoyalty(s)?.deals ?? [], deal = deals[deals.length - 1];
    if (mode === 'loyalty' && deal?.status === 'paid' && paidAt < 0) paidAt = s.seasons.length;
    if (mode === 'cash' && ext !== null && s.seasons.length >= seasonsAtExt + 1 && paidAt < 0) paidAt = s.seasons.length;
    if (paidAt >= 0 && s.phase === 'playing') break;
    if (ext === null && s.phase === 'transfer_window' && s.transferSituation?.type === 'contract_expiry' && !renew) {
      seasonsAtExt = s.seasons.length;
      s = E.signExtension(s); ext = s.weeklyWage; continue;
    }
    if (ext === null && renew && s.phase === 'transfer_window' && s.contractYearsLeft <= 0) {
      seasonsAtExt = s.seasons.length;
      s = E.stayAtClub(s); ext = s.weeklyWage; continue;
    }
    const next = step(s);
    if (!next || next.retired) break;
    s = next;
  }
  /* the same seasons and the same story on both runs, the loyalty lines aside: the runs stayed in step */
  const trail = JSON.stringify(s.seasons) + JSON.stringify(s.events.filter(e => !e.includes("oyalty")));
  return { ext, wageMoved, seasonsAtExt, paid: paidAt >= 0, earnings: s.totalEarnings, seasons: s.seasons.length, trail };
}

describe('a loyalty cut ends with its contract', () => {
  it('the extension quotes the uncut wage, the same as the cash run, and the payout is a real gain', () => {
    let compared = 0, gained = 0;
    for (let seed = 1; seed <= 24; seed += 1) {
      const loyal = play(seed, 'loyalty', false), cash = play(seed, 'cash', false);
      const inStep = loyal.ext !== null && cash.ext !== null && !loyal.wageMoved && !cash.wageMoved && loyal.seasonsAtExt === cash.seasonsAtExt;
      if (!inStep) continue;
      compared += 1;
      expect({ seed, ext: loyal.ext }).toEqual({ seed, ext: cash.ext });
      if (loyal.paid && cash.paid && loyal.trail === cash.trail) {
        gained += 1;
        expect(loyal.earnings, `seed ${seed}: loyal ${loyal.earnings} cash ${cash.earnings}`).toBeGreaterThan(cash.earnings);
      }
    }
    console.log(`loyalty uncut: ${compared} extension pairs in step, ${gained} payout pairs`);
    expect(compared).toBeGreaterThanOrEqual(14);
    expect(gained).toBeGreaterThanOrEqual(12);
  }, 300000);
  it('the renewal when he lets the deal run down quotes the uncut wage as well', () => {
    let compared = 0;
    for (let seed = 101; seed <= 116; seed += 1) {
      const loyal = play(seed, 'loyalty', true), cash = play(seed, 'cash', true);
      if (loyal.ext === null || cash.ext === null || loyal.wageMoved || cash.wageMoved || loyal.seasonsAtExt !== cash.seasonsAtExt) continue;
      compared += 1;
      expect({ seed, renewal: loyal.ext }).toEqual({ seed, renewal: cash.ext });
    }
    console.log(`loyalty uncut: ${compared} renewal pairs in step`);
    expect(compared).toBeGreaterThanOrEqual(8);
  }, 300000);
});

/* Release BS fix, closing check: a wage that moves under the cut (Contract Breakdown, card 16)
   moves the uncut wage by the same factor, and a renewal that lands exactly on the cut wage ends the
   cut. Before it, the first fell back to the moved cut wage and the second kept quoting from the
   old base. Same seed, same card, same answer on both runs; only the payout choice differs. */
function breakdown(seed: number, mode: 'cash' | 'loyalty', choice: number) {
  Math.random = seeded(seed);
  const signed = E.acceptOffer(chooseLoyalty(fixture(), offer, 10000, mode), offer);
  const card = E.getAllEvents(signed).find(e => e.id === 16);
  if (!card || card.title !== 'Contract Breakdown!') throw new Error('card 16 must be Contract Breakdown');
  const moved = E.applyEventChoice({ ...signed, phase: 'random_events', pendingEvents: [card, card] } as CareerState, choice, clubs);
  return { signed: signed.weeklyWage, moved: moved.weeklyWage, ext: E.signExtension(moved).weeklyWage,
    renewal: E.stayAtClub({ ...moved, contractYearsLeft: 0 }).weeklyWage };
}
describe('a wage that moves under the cut keeps the uncut wage in step', () => {
  it('Contract Breakdown, both answers that move the wage: the next contract equals the cash run', () => {
    let pairs = 0;
    for (const choice of [0, 1]) for (let seed = 1; seed <= 12; seed += 1) {
      const loyal = breakdown(seed, 'loyalty', choice), cash = breakdown(seed, 'cash', choice);
      expect([loyal.signed, cash.signed]).toEqual([9000, 10000]);
      if (loyal.moved === loyal.signed || cash.moved === cash.signed) continue;
      pairs += 1;
      expect({ seed, choice, ext: loyal.ext, renewal: loyal.renewal }).toEqual({ seed, choice, ext: cash.ext, renewal: cash.renewal });
    }
    console.log(`loyalty uncut: ${pairs} Contract Breakdown pairs with a moved wage`);
    expect(pairs).toBeGreaterThanOrEqual(12);
  });
  it('a renewal that lands on the cut wage ends the cut', () => {
    const renewals = (mode: 'cash' | 'loyalty') => {
      Math.random = seeded(7);
      const signed = E.acceptOffer(chooseLoyalty(fixture(), offer, 10000, mode), offer);
      const seasons = signed.seasons.map(row => ({ ...row }));
      const last = [...seasons].reverse().find(row => row.type === 'playing');
      if (!last) throw new Error('a playing season is required');
      last.rating = 6.5;
      /* 31, rated 70, form under 6.7: the renewal multiplier is 0.90, so the first renewal from the
         uncut EUR 10,000 is EUR 9,000, exactly the cut wage */
      const first = E.stayAtClub({ ...signed, age: 31, overall: 70, seasons, contractYearsLeft: 0 });
      const second = E.stayAtClub({ ...first, contractYearsLeft: 0 });
      return [signed.weeklyWage, first.weeklyWage, second.weeklyWage];
    };
    expect(renewals('cash')).toEqual([10000, 9000, 8100]);
    expect(renewals('loyalty')).toEqual([9000, 9000, 8100]);
  });
});
