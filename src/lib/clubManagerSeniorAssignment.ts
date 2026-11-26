import { loanOutPlayer, loanOutRefusal, type CareerState, type CMPlayer } from './clubManager';
import { SENIOR_CIRCUIT, seniorClubOf, seniorPreseason } from './clubManagerSecondClub';
import { plainCopy } from './clubManagerWorldRoster';

export function seniorLoanCandidates(c: CareerState): CMPlayer[] {
  const club = seniorClubOf(c);
  if (!club || club.bought > c.season || club.parent !== c.clubName || !seniorPreseason(c) || club.assignment?.season === c.season ||
    club.history.some(r => r.season === c.season)) return [];
  return c.squad.filter(p => p.position !== 'GK' && p.age <= 23 && (p.contractYears ?? 0) >= 2 &&
    p.injuryWeeks === 0 && p.suspendedMatches === 0 && !loanOutRefusal(c, p.id) && c.squad.filter(m => m.id === p.id).length === 1);
}

export function assignSeniorPlayer(c: CareerState, parent: string, season: number, shown: Pick<CMPlayer, 'id' | 'name' | 'rating'>): CareerState | null {
  if (c.clubName !== parent || c.season !== season) return null;
  const player = seniorLoanCandidates(c).find(p => p.id === shown.id && p.name === shown.name && p.rating === shown.rating);
  if (!player) return null;
  const host = SENIOR_CIRCUIT[0];
  const next = loanOutPlayer(plainCopy(c), player.id, host, 0, 'straight');
  const loan = next?.loanedOut?.find(l => l.player.id === player.id && l.club === host && l.season === season);
  if (!next || !loan) return null;
  delete loan.recallFee;
  next.budget = c.budget;
  next.seniorClub = { ...next.seniorClub!, assignment: { season, playerId: player.id, name: player.name, age: player.age,
    ...(player.worldRosterKey ? { worldRosterKey: player.worldRosterKey } : {}), openingRating: player.rating } };
  return next;
}
