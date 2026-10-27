import {
  acceptBid, isPartialClub, loanOutFee, loanOutPlayer, loanOutRefusal, isHistoricEra, ERA_LEAGUES, eraClubDefFor,
  REAL_LEAGUES, playableClubs, oppRosterFor, recallLoanedPlayer, sellValue, worldYear,
} from '@/lib/clubManager';
import type { CareerState, CMPlayer, LoanOut } from '@/lib/clubManager';
import { loanOutTermsFor } from '@/lib/clubManagerDeals';
import { plainCopy } from '@/lib/clubManagerWorldRoster';
import {
  appendLoanDevelopmentLog, recordLoanDevelopmentLog, loanDevelopmentLogOf,
  loanDevelopmentCanRecall, loanDevelopmentMatches, loanDevelopmentOf,
  quoteLoanDevelopment, reviewLoanDevelopment, startLoanDevelopment,
} from '@/lib/clubManagerLoanDevelopment';
import type {
  LoanDevelopmentContext, LoanDevelopmentHost, LoanDevelopmentLoan, LoanDevelopmentQuote, LoanDevelopmentRecord,
  LoanDevelopmentLog,
} from '@/lib/clubManagerLoanDevelopment';

export interface LoanPlanRequest {
  playerId: string; hostClub: string; source: 'standard' | 'bid'; token: string;
}
export interface LoanPlanPreview extends LoanPlanRequest { quote: LoanDevelopmentQuote }
export interface PlannedLoan extends LoanOut { development?: LoanDevelopmentRecord }
export type LoanPlanCareer = CareerState & { loanedOut?: PlannedLoan[]; loanPlanHistory?: readonly LoanDevelopmentLog[] };

export function loanPlanLoans(c: CareerState): PlannedLoan[] { return c.loanedOut ?? []; }
const playerKey = (player: CMPlayer) => player.worldRosterKey ? 'world:' + player.worldRosterKey : 'squad:' + player.id;
function available(c: CareerState): boolean {
  return !c.retired && !c.sacked && !c.wilderness && !c.live && !c.pendingSummary && c.week < c.calendar.length;
}
function context(c: CareerState, player: CMPlayer): LoanDevelopmentContext {
  return { eraId: c.eraId ?? 'now', worldYear: worldYear(c), season: c.season, week: c.week,
    calendarLength: c.calendar.length, clubName: c.clubName, windowOpen: c.transferWindow !== null,
    canLoan: available(c) && loanOutRefusal(c, player.id) === null, alreadyLoaned: player.loanOutSeason === c.season };
}
function fact(c: CareerState, loan: LoanOut): LoanDevelopmentLoan {
  return { playerKey: playerKey(loan.player), playerName: loan.player.name, parentClub: c.clubName,
    hostClub: loan.club, season: loan.season, fee: loan.fee, recallFee: loan.recallFee,
    optionFee: loan.optionFee, rating: loan.player.rating };
}
export function loanPlanRecordOf(c: CareerState, loan: PlannedLoan): LoanDevelopmentRecord | null {
  const record = loan.development;
  return loanDevelopmentMatches(record, context(c, loan.player), fact(c, loan)) ? record : null;
}
/** Read-only projection of the unchanged authority's eligible destinations. */
function eligibleHostPool(state: CareerState): string[] {
  if (state.eraId && isHistoricEra(state.eraId)) {
    const leagues = ERA_LEAGUES[state.eraId] ?? [];
    return leagues
      .flatMap(l => l.clubs
        .map(c => eraClubDefFor(c, state.eraId))
        .sort((a, b) => a.expectation - b.expectation)
        .slice(0, 8)
        .map(c => c.name))
      .filter(n => n !== state.clubName);
  }
  return REAL_LEAGUES.flatMap(l => playableClubs(l.id).slice(0, 8).map(c => c.name))
    .filter(n => n !== state.clubName);
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
  return available(c) ? [...new Set(eligibleHostPool(c))].sort((a, b) => a.localeCompare(b)) : [];
}
export function loanPlanUnavailableReason(c: CareerState, id: string, host: string): string {
  return loanOutRefusal(c, id) ?? (isPartialClub(host, c.eraId)
    ? 'Roster coverage is thin, so this plan has no opportunity estimate.'
    : 'Those terms changed or this host is unavailable. Preview the terms again.');
}
export function loanPlanPreview(
  c: CareerState, playerId: string, hostClub: string, source: LoanPlanRequest['source'],
): LoanPlanPreview | null {
  if (!available(c) || !['standard', 'bid'].includes(source) || !eligibleHostPool(c).includes(hostClub)) return null;
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
export function agreeLoanPlan(c: CareerState, request: LoanPlanRequest): LoanPlanCareer | null {
  const preview = loanPlanPreview(c, request.playerId, request.hostClub, request.source);
  if (!preview || preview.token !== request.token) return null;
  const copy = plainCopy(c);
  const next = request.source === 'bid' ? acceptBid(copy, request.playerId)
    : loanOutPlayer(copy, request.playerId, request.hostClub, preview.quote.offer.fee);
  if (!next) return null;
  const loans = loanPlanLoans(next);
  const matches = loans.filter(l => l.player.id === request.playerId && l.club === request.hostClub && l.season === c.season);
  if (matches.length !== 1 || matches[0].development !== undefined) return null;
  const loan = matches[0], record = startLoanDevelopment(preview.quote, preview.quote.token, fact(c, loan));
  if (!record) return null;
  return { ...next, loanedOut: loans.map(l => l === loan ? { ...l, development: record } : l) };
}
function historyField(c: CareerState): unknown {
  return (c as CareerState & { loanPlanHistory?: unknown }).loanPlanHistory;
}
function withLog(c: LoanPlanCareer, entry: LoanDevelopmentLog | null): LoanPlanCareer {
  if (!entry) return c;
  const previous = historyField(c), history = appendLoanDevelopmentLog(previous, entry);
  return history && history !== previous ? { ...c, loanPlanHistory: history } : c;
}
export function reviewLoanPlan(c: CareerState, playerId: string): LoanPlanCareer | null {
  if (!available(c)) return null;
  const loans = loanPlanLoans(c), loan = loans.find(l => l.player.id === playerId);
  const record = loanDevelopmentOf(loan?.development);
  if (!loan || !record) return null;
  const clock = context(c, loan.player), actual = fact(c, loan);
  const reviewed = reviewLoanDevelopment(record, clock, actual, hostFacts(c, loan.player, loan.club));
  if (!reviewed) return null;
  if (reviewed === record) return c;
  const next = { ...c, loanedOut: loans.map(l => l === loan ? { ...l, development: reviewed } : l) };
  return withLog(next, recordLoanDevelopmentLog(reviewed, clock, actual, 'check-in', loan.player.rating));
}
export function recallPlannedLoanee(c: CareerState, playerId: string, recordId: string): LoanPlanCareer | null {
  if (!available(c)) return null;
  const loan = loanPlanLoans(c).find(l => l.player.id === playerId);
  const record = loanDevelopmentOf(loan?.development);
  if (!loan || !record || record.id !== recordId
    || !loanDevelopmentCanRecall(record, context(c, loan.player), fact(c, loan), c.budget, c.squad.length)) return null;
  const beforeIds = new Set(c.squad.map(player => player.id));
  const next = recallLoanedPlayer(plainCopy(c), playerId);
  if (!next) return null;
  const returned = next.squad.filter(player => !beforeIds.has(player.id));
  if (returned.length !== 1) return null;
  return withLog(next, recordLoanDevelopmentLog(record, context(c, loan.player), fact(c, loan), 'recalled', returned[0].rating));
}
export function loanPlanHistoryOf(c: CareerState): readonly LoanDevelopmentLog[] | null {
  const history = loanDevelopmentLogOf(historyField(c));
  if (history === null) return null;
  const rows = history ?? [], year = worldYear(c);
  return rows.some(row => row.eraId !== (c.eraId ?? 'now') || row.observedYear > year || row.observedSeason > c.season
    || row.observedYear === year && row.observedSeason === c.season && row.observedWeek > c.week) ? null : rows;
}
