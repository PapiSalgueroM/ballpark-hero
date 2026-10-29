/**
 * Release BS fix BS-sc419-1: with Review job moves on, a manager whose club came off the job market
 * (a name the career's club list does not hold once) is asked about an earned move like anyone else.
 * Before the fix advanceReviewedManagerSeason needed the SOURCE club to be in the list exactly once
 * and silently returned the automatic move otherwise, while the panel said "On". Stay restores the
 * stored from tuple, so the source never needed the list.
 */
import { describe, expect, it } from 'vitest';
import * as E from '@/lib/soccerCareerEngine';
import type { CareerState } from '@/lib/soccerCareerEngine';
import { advanceReviewedManagerSeason, quoteManagerJob, readManagerJobReview, resolveManagerJob, setManagerJobReview } from '@/lib/soccerCareerManagerJobReview';
import { manager, seeded } from './helpers/managerJobReviewFixtures';

const clubs = E.FALLBACK_CLUBS;
const inList = (name: string) => clubs.filter(club => club.name === name).length;

/* A season out of work, then a real market offer whose club the list does not hold once. */
function marketManager(): CareerState {
  const base = manager();
  const out: CareerState = { ...base, managerState: { ...base.managerState!, unemployed: true, seasonsOut: 0, offers: [] } };
  for (let seed = 1; seed < 400; seed += 1) {
    const next = seeded(seed, () => E.advanceManagerSeason(structuredClone(out), clubs)).value;
    const offers = next.managerState?.offers ?? [];
    const at = offers.findIndex(offer => inList(offer.club) !== 1 && offer.tier >= 2);
    if (at >= 0) return E.acceptManagerOffer(next, at);
  }
  throw new Error('no market offer outside the club list came up in 400 seasons out');
}

describe('review job moves holds for a club taken off the market', () => {
  it('stages the earned move, and Stay keeps the market club', async () => {
    await E.loadManagerMarket();
    const market = marketManager();
    const held = market.managerState!;
    expect(held.unemployed).toBeFalsy();
    expect(inList(held.club)).not.toBe(1);
    const on = setManagerJobReview(market, clubs, true);
    expect(readManagerJobReview(on, clubs)?.enabled).toBe(true);
    let poaches = 0, staged = 0;
    for (let seed = 1; seed <= 3000 && staged < 6; seed += 1) {
      const plain = seeded(seed, () => E.advanceManagerSeason(structuredClone(on), clubs)).value.managerState!;
      if (plain.unemployed || plain.club === held.club || plain.departure !== 'poached') continue;
      const destination = clubs.filter(club => club.name === plain.club);
      if (destination.length !== 1 || destination[0].tier !== plain.clubTier) continue;
      poaches += 1;
      const reviewed = seeded(seed, () => advanceReviewedManagerSeason(structuredClone(on), clubs)).value;
      expect({ seed, from: held.club, to: plain.club, pending: !!readManagerJobReview(reviewed, clubs)?.pending })
        .toEqual({ seed, from: held.club, to: plain.club, pending: true });
      expect(reviewed.managerState!.club).toBe(held.club);
      const quote = quoteManagerJob(reviewed, clubs)!;
      const stayed = resolveManagerJob(reviewed, clubs, quote, 'stay').managerState!;
      expect([stayed.club, stayed.clubTier]).toEqual([held.club, held.clubTier]);
      const went = resolveManagerJob(reviewed, clubs, quote, 'accept').managerState!;
      expect([went.club, went.clubTier]).toEqual([plain.club, plain.clubTier]);
      staged += 1;
    }
    console.log(`market job review: ${held.club} (in list ${inList(held.club)} times), ${poaches} poaches, ${staged} staged`);
    expect(staged).toBeGreaterThanOrEqual(4);
  }, 300000);
});
