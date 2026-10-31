import * as cm from '@/lib/clubManager';
import type { CareerState } from '@/lib/clubManager';

export function acceptRetiredSon(career: CareerState, id: string): CareerState | null {
  const offer = cm.retiredSonOffer(career);
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
  const offer = cm.retiredSonOffer(career);
  if (!offer || offer.id !== id || offer.status !== 'pending' || career.sacked || career.wilderness) return null;
  return {
    ...career,
    retiredSonApplication: { ...career.retiredSonApplication!, offer: { ...offer, status: 'declined' } },
  };
}

