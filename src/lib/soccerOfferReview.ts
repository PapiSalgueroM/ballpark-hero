import { nextSeasonYear, type CareerState, type ContractOffer } from '@/lib/soccerCareerEngine';
import { agentWageMult } from '@/lib/soccerCareerLife';
import { depthChart, GROUP_LABEL } from '@/lib/soccerClubSquad';

export function buildSoccerOfferReview(career: CareerState, offer: ContractOffer) {
  const signedWage = Math.round(offer.wage * agentWageMult(career.agentId));
  const firstContract = career.phase === 'contract_offer';
  const released = career.transferSituation?.type === 'frozen_out' && career.transferSituation.mode === 'released';
  const currentReason = firstContract ? 'First senior contract. No current senior deal to compare.'
    : released ? 'Released. Your previous club is not an option to stay.'
    : career.contractYearsLeft <= 0 ? 'Your previous contract has expired.' : null;
  const current = currentReason ? null : {
    club: career.loan?.parentClub ?? career.currentClub,
    wage: career.weeklyWage,
    years: career.contractYearsLeft,
  };
  const season = nextSeasonYear(career);
  const chart = depthChart(offer.club.name, season, career.position, career.overall, career.playerName);
  return {
    signedWage, current, currentReason,
    wageDelta: current ? signedWage - current.wage : null,
    years: offer.contractYears,
    season,
    depth: chart ? { rank: chart.ahead + 1, total: chart.men.length, group: GROUP_LABEL[chart.group] } : null,
  };
}

export type SoccerOfferReviewData = ReturnType<typeof buildSoccerOfferReview>;
