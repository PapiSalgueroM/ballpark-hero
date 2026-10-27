import {
  available, makeLoanPlanContext, fact, playerKey, type LoanPlanSummary,
  recordLoanPlanRecall as settleRecall, recordLoanPlanSeason as settleSeason,
} from '@/lib/clubManagerLoanSettlement';
export type { LoanPlanSummary } from '@/lib/clubManagerLoanSettlement';
import {
  acceptBid, isPartialClub, loanOutFee, loanOutPlayer, loanOutRefusal, loanPlanHostClubs,
  oppRosterFor, recallLoanedPlayer, sellValue, worldYear,
} from '@/lib/clubManager';
import type { CareerState, CMPlayer, LoanOut } from '@/lib/clubManager';
import { loanOutTermsFor } from '@/lib/clubManagerDeals';
import { plainCopy } from '@/lib/clubManagerWorldRoster';
import {
  appendLoanDevelopmentHistory, loanDevelopmentCanRecall, loanDevelopmentMatches, loanDevelopmentOf,
  quoteLoanDevelopment, reviewLoanDevelopment, startLoanDevelopment,
} from '@/lib/clubManagerLoanDevelopment';
import type {
  LoanDevelopmentContext, LoanDevelopmentHost, LoanDevelopmentQuote, LoanDevelopmentRecord,
} from '@/lib/clubManagerLoanDevelopment';

export interface LoanPlanRequest {
  playerId: string; hostClub: string; source: 'standard' | 'bid'; token: string;
}
export interface LoanPlanPreview extends LoanPlanRequest { quote: LoanDevelopmentQuote }

function context(c: CareerState, player: CMPlayer): LoanDevelopmentContext {
  return makeLoanPlanContext(c, player, worldYear, loanOutRefusal);
}
export function recordLoanPlanRecall(before: CareerState, after: CareerState, loan: LoanOut, player: CMPlayer): CareerState {
  return settleRecall(before, after, loan, player, context);
}
export function recordLoanPlanSeason(
  before: CareerState, after: CareerState,
  returned: { home: CMPlayer[]; bought: { club: string; player: CMPlayer }[] },
  agedReturned?: CMPlayer[],
): CareerState {
  return settleSeason(before, after, returned, agedReturned, context);
}

export function loanPlanRecordOf(c: CareerState, loan: LoanOut): LoanDevelopmentRecord | null {
  const record = loan.development;
  return loanDevelopmentMatches(record, context(c, loan.player), fact(c, loan)) ? record : null;
}
function hostFacts(c: CareerState, player: CMPlayer, clubName: string): LoanDevelopmentHost {
  const partial = isPartialClub(clubName, c.eraId);
  const snapshot = partial ? [] : oppRosterFor(c, clubName);
  return { clubName, eraId: c.eraId ?? 'now', worldYear: worldYear(c), season: c.season, week: c.week,
    position: player.position, partial: partial || snapshot.length === 0,
    ratings: snapshot.filter(p => p.p === player.position).map(p => p.r) };
}
function displayedToken(quote: LoanDevelopmentQuote, source: LoanPlanRequest['source'], c: CareerState, id: string): string {
  const bid = source === 'bid' ? c.incomingBids?.find(b => b.playerId === id) : undefined;
  return JSON.stringify([source, quote.token, bid ? [
    bid.playerId, bid.playerName, bid.club, bid.offer, bid.status, bid.loan ?? false,
    bid.rival ?? null, bid.fromListing ?? false, bid.clauseMet ?? false,
  ] : null]);
}
export function loanPlanHosts(c: CareerState): string[] {
  return available(c) ? [...new Set(loanPlanHostClubs(c))].sort((a, b) => a.localeCompare(b)) : [];
}
export function loanPlanUnavailableReason(c: CareerState, id: string, host: string): string {
  return loanOutRefusal(c, id) ?? (isPartialClub(host, c.eraId)
    ? 'Roster coverage is thin, so this plan has no opportunity estimate.'
    : 'Those terms changed or this host is unavailable. Preview the terms again.');
}
export function loanPlanPreview(
  c: CareerState, playerId: string, hostClub: string, source: LoanPlanRequest['source'],
): LoanPlanPreview | null {
  if (!available(c) || !['standard', 'bid'].includes(source) || !loanPlanHostClubs(c).includes(hostClub)) return null;
  const players = c.squad.filter(p => p.id === playerId);
  if (players.length !== 1) return null;
  const player = players[0], bid = c.incomingBids?.find(b => b.playerId === playerId);
  if (source === 'bid' && (!bid?.loan || bid.club !== hostClub || !Number.isFinite(bid.offer) || bid.offer < 0)) return null;
  const fee = source === 'bid' ? Math.round(bid!.offer * 10) / 10 : loanOutFee(player);
  const quote = quoteLoanDevelopment(context(c, player),
    { key: playerKey(player), name: player.name, position: player.position, rating: player.rating },
    { clubName: hostClub, fee, ...loanOutTermsFor(sellValue(player), fee) }, hostFacts(c, player, hostClub));
  if (!quote) return null;
  return { playerId, hostClub, source, quote, token: displayedToken(quote, source, c, playerId) };
}
export function agreeLoanPlan(c: CareerState, request: LoanPlanRequest): CareerState | null {
  const preview = loanPlanPreview(c, request.playerId, request.hostClub, request.source);
  if (!preview || preview.token !== request.token) return null;
  const copy = plainCopy(c);
  const next = request.source === 'bid' ? acceptBid(copy, request.playerId)
    : loanOutPlayer(copy, request.playerId, request.hostClub, preview.quote.offer.fee);
  if (!next) return null;
  const matches = (next.loanedOut ?? []).filter(l =>
    l.player.id === request.playerId && l.club === request.hostClub && l.season === c.season);
  if (matches.length !== 1 || matches[0].development !== undefined) return null;
  const loan = matches[0], record = startLoanDevelopment(preview.quote, preview.quote.token, fact(c, loan));
  if (!record) return null;
  return { ...next, loanedOut: next.loanedOut!.map(l => l === loan ? { ...l, development: record } : l) };
}
export function reviewLoanPlan(c: CareerState, playerId: string): CareerState | null {
  if (!available(c)) return null;
  const loan = c.loanedOut?.find(l => l.player.id === playerId);
  const record = loanDevelopmentOf(loan?.development);
  if (!loan || !record) return null;
  const reviewed = reviewLoanDevelopment(record, context(c, loan.player), fact(c, loan), hostFacts(c, loan.player, loan.club));
  if (!reviewed) return null;
  if (reviewed === record) return c;
  return { ...c, loanedOut: c.loanedOut!.map(l => l === loan ? { ...l, development: reviewed } : l) };
}
export function recallPlannedLoanee(c: CareerState, playerId: string, recordId: string): CareerState | null {
  if (!available(c)) return null;
  const loan = c.loanedOut?.find(l => l.player.id === playerId);
  const record = loanDevelopmentOf(loan?.development);
  if (!loan || !record || record.id !== recordId
    || !loanDevelopmentCanRecall(record, context(c, loan.player), fact(c, loan), c.budget, c.squad.length)) return null;
  return recallLoanedPlayer(plainCopy(c), playerId);
}
export function loanPlanHistoryOf(c: CareerState): readonly LoanPlanSummary[] | null {
  const history = c.loanPlanHistory;
  if (history === undefined) return [];
  if (!Array.isArray(history) || history.length > 12 || new Set(history.map(row => row?.id)).size !== history.length) return null;
  for (const row of history) {
    if (!appendLoanDevelopmentHistory(undefined, row)
      || row.ratingStage !== undefined && !['annual', 'return', 'recall'].includes(row.ratingStage)) return null;
  }
  return history;
}
