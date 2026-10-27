import { describe, expect, it, vi } from 'vitest';
import {
  LOAN_DEVELOPMENT_HISTORY_LIMIT,
  appendLoanDevelopmentLog,
  recordLoanDevelopmentLog,
  loanDevelopmentCanRecall,
  loanDevelopmentMatches,
  loanDevelopmentOf,
  loanDevelopmentLogOf,
  loanOpportunityOf,
  quoteLoanDevelopment,
  reviewLoanDevelopment,
  startLoanDevelopment,
} from '@/lib/clubManagerLoanDevelopment';
import type {
  LoanDevelopmentContext, LoanDevelopmentHost, LoanDevelopmentLoan,
  LoanDevelopmentOffer, LoanDevelopmentPlayer, LoanDevelopmentLog,
} from '@/lib/clubManagerLoanDevelopment';

function context(): LoanDevelopmentContext {
  return { eraId: 'now', worldYear: 2026, season: 1, week: 2, calendarLength: 54,
    clubName: 'Parent club', windowOpen: true, canLoan: true, alreadyLoaned: false };
}
function player(): LoanDevelopmentPlayer { return { key: 'squad:p1', name: 'Academy player', position: 'ST', rating: 72 }; }
function offer(): LoanDevelopmentOffer {
  return { clubName: 'Host club', fee: 0.8, recallFee: 0.4, optionFee: 11.5 };
}
function host(): LoanDevelopmentHost {
  return { clubName: 'Host club', eraId: 'now', worldYear: 2026, season: 1, week: 2,
    position: 'ST', partial: false, ratings: [69, 70] };
}
function loan(): LoanDevelopmentLoan {
  return { playerKey: 'squad:p1', playerName: 'Academy player', parentClub: 'Parent club', hostClub: 'Host club',
    season: 1, fee: 0.8, recallFee: 0.4, optionFee: 11.5, rating: 72 };
}
function agreed() {
  const quote = quoteLoanDevelopment(context(), player(), offer(), host());
  expect(quote).not.toBeNull();
  const record = startLoanDevelopment(quote!, quote!.token, loan());
  expect(record).not.toBeNull();
  return record!;
}
function nextWeek() { return { ...context(), week: 3, windowOpen: false }; }
function nextHost() { return { ...host(), week: 3, ratings: [75, 74, 70] }; }

describe('loan development opportunity and exact existing terms', () => {
  it('reports a roster comparison, with no invented appearance or growth values', () => {
    expect(loanOpportunityOf(context(), player(), host())).toEqual({
      partial: false, higherRated: 0, equallyRated: 0, observedPlayers: 2, estimatedRole: 'leading',
    });
    const quote = quoteLoanDevelopment(context(), player(), offer(), host())!;
    expect(quote.offer).toEqual(offer());
    expect(Object.keys(quote.opportunity).sort()).toEqual([
      'equallyRated', 'estimatedRole', 'higherRated', 'observedPlayers', 'partial',
    ]);
    expect(quoteLoanDevelopment(context(), player(), { ...offer(), fee: 0.3 }, host())!.offer.fee).toBe(0.3);
  });

  it('distinguishes competition and binds exact fees without creating an auction', () => {
    const lowCompetition = quoteLoanDevelopment(context(), player(), { ...offer(), fee: 0.3 }, host())!;
    const crowded = quoteLoanDevelopment(context(), player(), offer(), { ...host(), ratings: [74, 75, 72] })!;
    expect(lowCompetition.opportunity.estimatedRole).toBe('leading');
    expect(crowded.opportunity).toMatchObject({ higherRated: 2, equallyRated: 1, estimatedRole: 'depth' });
    expect(lowCompetition.offer.fee).toBe(0.3);
    expect(crowded.offer.fee).toBe(0.8);
    expect(loanOpportunityOf(context(), player(), { ...host(), ratings: [73, 72] }))
      .toMatchObject({ estimatedRole: 'competing', higherRated: 1, equallyRated: 1 });
  });

  it('fails closed on partial, stale, wrong-era, wrong-position and malformed host facts', () => {
    for (const unknown of [
      { ...host(), partial: true }, { ...host(), week: 1 }, { ...host(), eraId: '1990' },
      { ...host(), worldYear: 2025 }, { ...host(), position: 'GK' },
      { ...host(), ratings: [] }, { ...host(), ratings: [Number.NaN] },
    ]) {
      expect(loanOpportunityOf(context(), player(), unknown)).toEqual({ partial: true, reason: 'CM_PARTIAL' });
      expect(quoteLoanDevelopment(context(), player(), offer(), unknown)).toBeNull();
    }
  });

  it('keeps old loans neutral and refuses invalid persisted versions or fields', () => {
    expect(loanDevelopmentOf(undefined)).toBeUndefined();
    expect(loanDevelopmentOf(null)).toBeNull();
    expect(loanDevelopmentOf({ version: 2 })).toBeNull();
    const record = agreed();
    expect(loanDevelopmentOf(JSON.parse(JSON.stringify(record)))).toEqual(record);
    expect(loanDevelopmentOf({ ...record, fee: Number.NaN })).toBeNull();
    expect(loanDevelopmentOf({ ...record, id: 'wrong-player' })).toBeNull();
    expect(loanDevelopmentOf({ ...record, opportunity: { ...record.opportunity, higherRated: 3 } })).toBeNull();
    expect(loanDevelopmentOf({ ...record, opportunity: { partial: false, higherRated: 0,
      equallyRated: 0, observedPlayers: 0, estimatedRole: 'leading' } })).toBeNull();
  });
});

describe('loan development agreement and saved reviews', () => {
  it('requires the current window, legal player and unused season stamp', () => {
    for (const blocked of [
      { ...context(), windowOpen: false }, { ...context(), canLoan: false },
      { ...context(), alreadyLoaned: true }, { ...context(), week: -1 },
      { ...context(), week: 54 }, { ...context(), worldYear: Number.NaN },
    ]) expect(quoteLoanDevelopment(blocked, player(), offer(), host())).toBeNull();
  });

  it('rejects stale displayed quotes and mismatched actual loan receipts', () => {
    const quote = quoteLoanDevelopment(context(), player(), offer(), host())!;
    const changed = quoteLoanDevelopment(context(), player(), { ...offer(), fee: 0.9 }, host())!;
    expect(startLoanDevelopment(changed, quote.token, loan())).toBeNull();
    for (const mismatch of [
      { ...loan(), playerKey: 'squad:p2' }, { ...loan(), hostClub: 'Other host' },
      { ...loan(), parentClub: 'Other parent' }, { ...loan(), season: 2 },
      { ...loan(), fee: 0.7 }, { ...loan(), recallFee: 0.5 }, { ...loan(), optionFee: 12 },
      { ...loan(), rating: 73 },
    ]) expect(startLoanDevelopment(quote, quote.token, mismatch)).toBeNull();
    expect(startLoanDevelopment({ ...quote, offer: { ...quote.offer, fee: 0.1 } }, quote.token, loan())).toBeNull();
    const self = { ...quote, offer: { ...quote.offer, clubName: context().clubName } };
    expect(startLoanDevelopment(self, self.token, { ...loan(), hostClub: context().clubName })).toBeNull();
  });

  it('saves an actual review once, retains it after JSON reload and never changes the loan', () => {
    const record = agreed(), actual = { ...loan(), rating: 73 };
    const before = JSON.stringify(actual);
    const reviewed = reviewLoanDevelopment(record, nextWeek(), actual, nextHost())!;
    expect(reviewed.review).toEqual({
      week: 3, rating: 73, ratingChange: 1,
      opportunity: { partial: false, higherRated: 2, equallyRated: 0, observedPlayers: 3, estimatedRole: 'depth' },
    });
    expect(reviewLoanDevelopment(reviewed, nextWeek(), actual, nextHost())).toBe(reviewed);
    expect(loanDevelopmentOf(JSON.parse(JSON.stringify(reviewed)))).toEqual(reviewed);
    expect(JSON.stringify(actual)).toBe(before);
    expect(record.review).toBeUndefined();
    const immediate = reviewLoanDevelopment(record, context(), loan(), host())!;
    expect(immediate.review).toMatchObject({ week: 2, rating: 72, ratingChange: 0 });
    expect(reviewLoanDevelopment(immediate, context(), loan(), host())).toBe(immediate);
    expect(reviewLoanDevelopment(reviewed, context(), loan(), host())).toBeNull();
  });

  it('records an unavailable current estimate honestly and refuses wrong loan/date identity', () => {
    const record = agreed();
    expect(loanDevelopmentMatches(record, context(), loan())).toBe(true);
    expect(loanDevelopmentMatches(record, { ...context(), windowOpen: false }, loan())).toBe(true);
    for (const foreign of [
      { ...loan(), playerKey: 'squad:another' }, { ...loan(), playerName: 'Another player' },
      { ...loan(), parentClub: 'Another employer' }, { ...loan(), hostClub: 'Another host' },
      { ...loan(), season: 2 }, { ...loan(), fee: 0.9 }, { ...loan(), recallFee: 0.5 },
      { ...loan(), optionFee: 12 },
    ]) expect(loanDevelopmentMatches(record, context(), foreign)).toBe(false);
    expect(loanDevelopmentMatches(record, { ...context(), week: 1 }, loan())).toBe(false);
    const unknown = reviewLoanDevelopment(record, nextWeek(), loan(), { ...nextHost(), partial: true })!;
    expect(unknown.review!.opportunity).toEqual({ partial: true, reason: 'CM_PARTIAL' });
    for (const wrong of [
      { ...nextWeek(), eraId: '1990' }, { ...nextWeek(), worldYear: 2027 },
      { ...nextWeek(), season: 2 }, { ...nextWeek(), clubName: 'Another employer' },
    ]) expect(reviewLoanDevelopment(record, wrong, loan(), nextHost())).toBeNull();
    expect(reviewLoanDevelopment(record, nextWeek(), { ...loan(), playerKey: 'squad:p2' }, nextHost())).toBeNull();
  });
});

describe('loan plan recall and recorded actions', () => {
  it('projects only the existing open-window, fee and squad-room recall constraints', () => {
    const record = agreed();
    expect(loanDevelopmentCanRecall(record, context(), loan(), 0.4, 29)).toBe(true);
    expect(loanDevelopmentCanRecall(record, { ...context(), windowOpen: false }, loan(), 10, 20)).toBe(false);
    expect(loanDevelopmentCanRecall(record, context(), loan(), 0.3, 20)).toBe(false);
    expect(loanDevelopmentCanRecall(record, context(), loan(), 10, 30)).toBe(false);
    expect(loanDevelopmentCanRecall(record, context(), { ...loan(), recallFee: undefined }, 10, 20)).toBe(false);
    expect(loanDevelopmentCanRecall(record, { ...context(), season: 2 }, loan(), 10, 20)).toBe(false);
    expect(quoteLoanDevelopment({ ...context(), alreadyLoaned: true }, player(), offer(), host())).toBeNull();
    const reviewed = reviewLoanDevelopment(record, nextWeek(), loan(), nextHost())!;
    expect(loanDevelopmentCanRecall(reviewed, context(), loan(), 10, 20)).toBe(false);
  });

  it('records only explicit check-ins and recalls from matching current loan facts', () => {
    const record = agreed(), actual = loan(), before = JSON.stringify(actual);
    const checkIn = recordLoanDevelopmentLog(record, context(), actual, 'check-in', actual.rating)!;
    expect(checkIn).toMatchObject({ id: record.id, kind: 'check-in', observedSeason: 1,
      observedWeek: 2, rating: 72, ratingChange: 0 });
    const recalled = recordLoanDevelopmentLog(record, context(), actual, 'recalled', 72)!;
    expect(recalled.kind).toBe('recalled');
    expect(recalled.key).not.toBe(checkIn.key);
    expect(JSON.stringify(actual)).toBe(before);
    expect(recordLoanDevelopmentLog(record, context(), actual, 'returned', 72)).toBeNull();
    expect(recordLoanDevelopmentLog(record, context(), actual, 'bought', 72)).toBeNull();
    expect(recordLoanDevelopmentLog(record, context(), actual, 'check-in', 73)).toBeNull();
    expect(recordLoanDevelopmentLog(record, { ...context(), windowOpen: false }, actual, 'recalled', 72)).toBeNull();
    expect(recordLoanDevelopmentLog(record, { ...context(), worldYear: 2027, season: 2, week: 0 }, actual, 'check-in', 72)).toBeNull();
    expect(recordLoanDevelopmentLog(record, context(), { ...actual, playerKey: 'squad:another' }, 'check-in', 72)).toBeNull();
  });

  it('bounds recorded log and makes duplicate check-ins exact no-ops', () => {
    let history: readonly LoanDevelopmentLog[] | undefined;
    for (let index = 0; index < LOAN_DEVELOPMENT_HISTORY_LIMIT + 2; index += 1) {
      const p = { ...player(), key: 'squad:p' + index };
      const quote = quoteLoanDevelopment(context(), p, offer(), host())!;
      const actual = { ...loan(), playerKey: p.key };
      const record = startLoanDevelopment(quote, quote.token, actual)!;
      const entry = recordLoanDevelopmentLog(record, context(), actual, 'check-in', actual.rating)!;
      history = appendLoanDevelopmentLog(history, entry)!;
    }
    expect(history).toHaveLength(LOAN_DEVELOPMENT_HISTORY_LIMIT);
    const last = history![history!.length - 1];
    expect(appendLoanDevelopmentLog(history, last)).toBe(history);
    expect(appendLoanDevelopmentLog(history, { ...last, rating: 73, ratingChange: 1 })).toBeNull();
    expect(loanDevelopmentLogOf(JSON.parse(JSON.stringify(history)))).toEqual(history);
    expect(loanDevelopmentLogOf([{ ...last, kind: 'returned' }])).toBeNull();
    for (const invalid of [
      { ...last, version: 2 }, { ...last, key: 'wrong-key' },
      { ...last, observedYear: last.observedYear + 1 },
      { ...last, observedSeason: last.observedSeason + 1 },
      { ...last, observedWeek: last.startedWeek - 1 },
      { ...last, ratingChange: 1 },
    ]) expect(loanDevelopmentLogOf([invalid])).toBeNull();
    expect(loanDevelopmentLogOf([last, last])).toBeNull();
  });

  it('is deterministic and reads no wall clock or global random source', () => {
    const random = vi.spyOn(Math, 'random').mockImplementation(() => { throw new Error('unexpected global random'); });
    const now = vi.spyOn(Date, 'now').mockImplementation(() => { throw new Error('unexpected wall clock'); });
    try {
      const first = quoteLoanDevelopment(context(), player(), offer(), host())!;
      const second = quoteLoanDevelopment(context(), player(), offer(), { ...host(), ratings: [70, 69] })!;
      expect(second).toEqual(first);
      const record = startLoanDevelopment(first, first.token, loan())!;
      const reloaded = loanDevelopmentOf(JSON.parse(JSON.stringify(record)))!;
      expect(reviewLoanDevelopment(reloaded, nextWeek(), loan(), nextHost()))
        .toEqual(reviewLoanDevelopment(record, nextWeek(), loan(), nextHost()));
      expect(random).not.toHaveBeenCalled();
      expect(now).not.toHaveBeenCalled();
    } finally { random.mockRestore(); now.mockRestore(); }
  });
});
