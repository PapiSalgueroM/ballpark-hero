import * as cm from '@/lib/clubManager';
import type { CareerState, RetiredSonOffer } from '@/lib/clubManager';

/** The saved application report stays on the card after Invite or Pass. */
export function retiredSonOffer(career: CareerState): Readonly<RetiredSonOffer> | null {
  const offer = cm.retiredSonApplicationOf(career)?.offer;
  return offer && offer.status !== 'expired' && offer.club === career.clubName
    && offer.season === career.season && offer.year === cm.worldYear(career) ? offer : null;
}

export function acceptRetiredSon(career: CareerState, id: string): CareerState | null {
  const offer = retiredSonOffer(career);
  const a = career.academy;
  if (!offer || offer.id !== id || offer.status !== 'pending' || career.sacked || career.wilderness
    || !a || !Array.isArray(a.prospects) || a.prospects.length >= cm.MAX_PROSPECTS
    || !Number.isFinite(career.budget) || career.budget < offer.fee
    || a.prospects.some(p => p.id === offer.prospect.id)
    || cm.familyBookNames(career).has(cm.foldClubName(offer.prospect.name))) return null;
  return {
    ...career,
    budget: Math.round((career.budget - offer.fee) * 100) / 100,
    academy: { ...a, prospects: [...a.prospects, { ...offer.prospect, fee: 0 }] },
    retiredSonApplication: { ...career.retiredSonApplication!, offer: { ...offer, status: 'accepted' } },
  };
}

export function declineRetiredSon(career: CareerState, id: string): CareerState | null {
  const offer = retiredSonOffer(career);
  if (!offer || offer.id !== id || offer.status !== 'pending' || career.sacked || career.wilderness) return null;
  return {
    ...career,
    retiredSonApplication: { ...career.retiredSonApplication!, offer: { ...offer, status: 'declined' } },
  };
}

