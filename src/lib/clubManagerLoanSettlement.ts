/** Synchronous saved-plan closeout with engine readers passed explicitly. */
import type { CareerState, CMPlayer, LoanOut } from '@/lib/clubManager';
import { appendLoanDevelopmentHistory, closeLoanDevelopment, loanDevelopmentOf } from '@/lib/clubManagerLoanDevelopment';
import type { LoanDevelopmentContext, LoanDevelopmentLoan, LoanDevelopmentSummary } from '@/lib/clubManagerLoanDevelopment';

export type LoanPlanSummary = LoanDevelopmentSummary & { ratingStage?: 'annual' | 'return' | 'recall' };
export type LoanPlanContextFactory = (c: CareerState, player: CMPlayer) => LoanDevelopmentContext;

export const playerKey = (player: CMPlayer) => player.worldRosterKey ? 'world:' + player.worldRosterKey : 'squad:' + player.id;
export function available(c: CareerState): boolean {
  return !c.retired && !c.sacked && !c.wilderness && !c.live && !c.pendingSummary && c.week < c.calendar.length;
}
export function makeLoanPlanContext(
  c: CareerState, player: CMPlayer, worldYear: (c: CareerState) => number,
  loanOutRefusal: (c: CareerState, playerId: string) => string | null,
): LoanDevelopmentContext {
  return { eraId: c.eraId ?? 'now', worldYear: worldYear(c), season: c.season, week: c.week,
    calendarLength: c.calendar.length, clubName: c.clubName, windowOpen: c.transferWindow !== null,
    canLoan: available(c) && loanOutRefusal(c, player.id) === null, alreadyLoaned: player.loanOutSeason === c.season };
}
export function fact(c: CareerState, loan: LoanOut): LoanDevelopmentLoan {
  return { playerKey: playerKey(loan.player), playerName: loan.player.name, parentClub: c.clubName,
    hostClub: loan.club, season: loan.season, fee: loan.fee, recallFee: loan.recallFee,
    optionFee: loan.optionFee, rating: loan.player.rating };
}
function archive(
  before: CareerState, after: CareerState, loan: LoanOut,
  kind: LoanDevelopmentSummary['kind'], player: CMPlayer, ratingStage: LoanPlanSummary['ratingStage'],
  context: LoanPlanContextFactory,
): CareerState {
  const record = loanDevelopmentOf(loan.development);
  if (!record) return after;
  const clock = { ...context(after, loan.player), clubName: before.clubName };
  const summary = closeLoanDevelopment(record, clock, fact(before, loan), { kind, rating: player.rating });
  if (!summary) return after;
  const history = appendLoanDevelopmentHistory(after.loanPlanHistory, { ...summary, ratingStage } as LoanPlanSummary);
  return history ? { ...after, loanPlanHistory: [...history] as LoanPlanSummary[] } : after;
}
export function recordLoanPlanRecall(before: CareerState, after: CareerState, loan: LoanOut, player: CMPlayer, context: LoanPlanContextFactory): CareerState {
  return loan.development === undefined ? after : archive(before, after, loan, 'recalled', player, 'recall', context);
}
export function recordLoanPlanSeason(
  before: CareerState, after: CareerState,
  returned: { home: CMPlayer[]; bought: { club: string; player: CMPlayer }[] },
  agedReturned: CMPlayer[] | undefined, context: LoanPlanContextFactory,
): CareerState {
  if (!(before.loanedOut ?? []).some(l => l.development !== undefined)) return after;
  let next = after;
  for (const loan of before.loanedOut ?? []) {
    if (!loanDevelopmentOf(loan.development)) continue;
    const bought = returned.bought.filter(sale => sale.club === loan.club && playerKey(sale.player) === playerKey(loan.player));
    if (bought.length === 1) { next = archive(before, next, loan, 'bought', bought[0].player, 'return', context); continue; }
    const indices = returned.home.map((p, index) => playerKey(p) === playerKey(loan.player) ? index : -1).filter(index => index >= 0);
    if (indices.length !== 1) continue;
    const index = indices[0], settled = agedReturned?.[index] ?? returned.home[index];
    next = archive(before, next, loan, 'returned', settled, agedReturned?.[index] ? 'annual' : 'return', context);
  }
  return next;
}
