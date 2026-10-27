/** Opt-in loan-plan records. Estimates and reviews never award growth or execute a transfer. */
export const LOAN_DEVELOPMENT_HISTORY_LIMIT = 12;

export interface LoanDevelopmentContext {
  eraId: string; worldYear: number; season: number; week: number; calendarLength: number;
  clubName: string; windowOpen: boolean; canLoan: boolean; alreadyLoaned: boolean;
}
export interface LoanDevelopmentPlayer { key: string; name: string; position: string; rating: number }
export interface LoanDevelopmentOffer { clubName: string; fee: number; recallFee?: number; optionFee?: number }
export interface LoanDevelopmentHost {
  clubName: string; eraId: string; worldYear: number; season: number; week: number;
  position: string; partial: boolean; ratings: readonly number[];
}
export interface LoanDevelopmentLoan {
  playerKey: string; playerName: string; parentClub: string; hostClub: string; season: number;
  fee: number; recallFee?: number; optionFee?: number; rating: number;
}
export interface KnownLoanOpportunity {
  partial: false; higherRated: number; equallyRated: number; observedPlayers: number;
  estimatedRole: 'leading' | 'competing' | 'depth';
}
export type LoanOpportunity = KnownLoanOpportunity | { partial: true; reason: 'CM_PARTIAL' };
export interface LoanDevelopmentQuote {
  token: string; context: LoanDevelopmentContext; player: LoanDevelopmentPlayer;
  offer: LoanDevelopmentOffer; opportunity: KnownLoanOpportunity;
}
export interface LoanDevelopmentRecord {
  version: 1; id: string; eraId: string; worldYear: number; season: number;
  sourceClub: string; playerKey: string; playerName: string; position: string; hostClub: string;
  fee: number; recallFee?: number; optionFee?: number; startedWeek: number; ratingAtStart: number;
  opportunity: KnownLoanOpportunity;
  review?: { week: number; rating: number; ratingChange: number; opportunity: LoanOpportunity };
}
export type LoanDevelopmentLog = Omit<LoanDevelopmentRecord, 'opportunity' | 'review'> & {
  key: string; kind: 'check-in' | 'recalled'; observedYear: number; observedSeason: number; observedWeek: number;
  rating: number; ratingChange: number;
};

const object = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);
const text = (value: unknown): value is string =>
  typeof value === 'string' && value.length <= 512 && value.trim().length > 0;
const count = (value: unknown): value is number => Number.isSafeInteger(value) && Number(value) >= 0;
const positive = (value: unknown): value is number => count(value) && value > 0;
const rating = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 99;
const money = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0;
const optionalMoney = (value: unknown): boolean => value === undefined || money(value);
const role = (higher: number, equal: number): KnownLoanOpportunity['estimatedRole'] =>
  higher === 0 && equal === 0 ? 'leading' : higher <= 1 ? 'competing' : 'depth';

function validContext(value: LoanDevelopmentContext): boolean {
  return text(value.eraId) && positive(value.worldYear) && positive(value.season)
    && count(value.week) && positive(value.calendarLength) && value.week <= value.calendarLength
    && text(value.clubName) && typeof value.windowOpen === 'boolean'
    && typeof value.canLoan === 'boolean' && typeof value.alreadyLoaned === 'boolean';
}
function validPlayer(value: LoanDevelopmentPlayer): boolean {
  return text(value.key) && text(value.name) && text(value.position) && rating(value.rating);
}
function validOffer(value: LoanDevelopmentOffer): boolean {
  return text(value.clubName) && money(value.fee) && optionalMoney(value.recallFee) && optionalMoney(value.optionFee);
}
function knownOpportunity(value: unknown): value is KnownLoanOpportunity {
  return object(value) && value.partial === false && count(value.higherRated) && count(value.equallyRated)
    && count(value.observedPlayers) && value.observedPlayers > 0 && value.observedPlayers <= 30
    && value.higherRated + value.equallyRated <= value.observedPlayers
    && value.estimatedRole === role(value.higherRated, value.equallyRated);
}
function validOpportunity(value: unknown): value is LoanOpportunity {
  return knownOpportunity(value) || object(value) && value.partial === true && value.reason === 'CM_PARTIAL';
}
function identity(value: {
  eraId: string; worldYear: number; season: number; sourceClub: string; playerKey: string; hostClub: string;
}): string {
  return JSON.stringify([value.eraId, value.worldYear, value.season, value.sourceClub, value.playerKey, value.hostClub]);
}
function validBase(value: unknown): value is Record<string, unknown> {
  return object(value) && value.version === 1 && text(value.eraId) && positive(value.worldYear)
    && positive(value.season) && text(value.sourceClub) && text(value.playerKey) && text(value.playerName)
    && text(value.position) && text(value.hostClub) && value.hostClub !== value.sourceClub
    && money(value.fee) && optionalMoney(value.recallFee) && optionalMoney(value.optionFee)
    && count(value.startedWeek) && rating(value.ratingAtStart)
    && value.id === identity({
      eraId: value.eraId, worldYear: value.worldYear, season: value.season,
      sourceClub: value.sourceClub, playerKey: value.playerKey, hostClub: value.hostClub,
    });
}
function tokenOf(quote: Omit<LoanDevelopmentQuote, 'token'>): string {
  const c = quote.context, p = quote.player, o = quote.offer, r = quote.opportunity;
  return JSON.stringify([c.eraId, c.worldYear, c.season, c.week, c.clubName, p.key, p.name, p.position, p.rating,
    o.clubName, o.fee, o.recallFee ?? null, o.optionFee ?? null, r.higherRated, r.equallyRated, r.observedPlayers]);
}
function sameSeason(record: LoanDevelopmentRecord, context: LoanDevelopmentContext): boolean {
  return validContext(context) && record.eraId === context.eraId && record.worldYear === context.worldYear
    && record.season === context.season && record.sourceClub === context.clubName;
}
function sameLoan(record: LoanDevelopmentRecord, loan: LoanDevelopmentLoan): boolean {
  return record.playerKey === loan.playerKey && record.playerName === loan.playerName
    && record.sourceClub === loan.parentClub && record.hostClub === loan.hostClub && record.season === loan.season
    && record.fee === loan.fee && record.recallFee === loan.recallFee && record.optionFee === loan.optionFee
    && rating(loan.rating);
}

export function loanOpportunityOf(
  context: LoanDevelopmentContext, player: LoanDevelopmentPlayer, host: LoanDevelopmentHost,
): LoanOpportunity {
  if (!validContext(context) || !validPlayer(player) || host.partial !== false
    || host.eraId !== context.eraId || host.worldYear !== context.worldYear || host.season !== context.season
    || host.week !== context.week || host.position !== player.position || !text(host.clubName)
    || !Array.isArray(host.ratings) || host.ratings.length === 0 || host.ratings.length > 30 || !host.ratings.every(rating)) {
    return { partial: true, reason: 'CM_PARTIAL' };
  }
  const higherRated = host.ratings.filter(value => value > player.rating).length;
  const equallyRated = host.ratings.filter(value => value === player.rating).length;
  return { partial: false, higherRated, equallyRated, observedPlayers: host.ratings.length,
    estimatedRole: role(higherRated, equallyRated) };
}

export function quoteLoanDevelopment(
  context: LoanDevelopmentContext, player: LoanDevelopmentPlayer, offer: LoanDevelopmentOffer,
  host: LoanDevelopmentHost,
): LoanDevelopmentQuote | null {
  if (!validContext(context) || context.week >= context.calendarLength || !context.windowOpen
    || !context.canLoan || context.alreadyLoaned || !validPlayer(player) || !validOffer(offer)
    || offer.clubName === context.clubName || host.clubName !== offer.clubName) return null;
  const opportunity = loanOpportunityOf(context, player, host);
  if (opportunity.partial !== false) return null;
  const quote = { context: { ...context }, player: { ...player }, offer: { ...offer }, opportunity };
  return { ...quote, token: tokenOf(quote) };
}

/** Undefined is an old loan; null is an invalid or unsupported record, never an opt-in invitation. */
export function loanDevelopmentOf(value: unknown): LoanDevelopmentRecord | null | undefined {
  if (value === undefined) return undefined;
  if (!validBase(value) || !knownOpportunity(value.opportunity)) return null;
  if (value.review !== undefined) {
    const r = value.review;
    if (!object(r) || !count(r.week) || r.week < Number(value.startedWeek) || !rating(r.rating)
      || r.ratingChange !== r.rating - Number(value.ratingAtStart) || !validOpportunity(r.opportunity)) return null;
  }
  return value as unknown as LoanDevelopmentRecord;
}

/** Identity and saved-date binding, independent of current recall window, funds or squad room. */
export function loanDevelopmentMatches(
  value: unknown, context: LoanDevelopmentContext, actualLoan: LoanDevelopmentLoan,
): value is LoanDevelopmentRecord {
  const record = loanDevelopmentOf(value);
  return record !== null && record !== undefined && sameSeason(record, context) && sameLoan(record, actualLoan)
    && context.week >= (record.review?.week ?? record.startedWeek);
}

export function startLoanDevelopment(
  quote: LoanDevelopmentQuote, displayedToken: string, actualLoan: LoanDevelopmentLoan,
): LoanDevelopmentRecord | null {
  if (!validContext(quote.context) || !quote.context.windowOpen || !quote.context.canLoan
    || quote.context.alreadyLoaned || quote.context.week >= quote.context.calendarLength
    || !validPlayer(quote.player) || !validOffer(quote.offer) || quote.offer.clubName === quote.context.clubName
    || !knownOpportunity(quote.opportunity)
    || quote.token !== tokenOf(quote) || displayedToken !== quote.token) return null;
  const record: LoanDevelopmentRecord = {
    version: 1, id: '', eraId: quote.context.eraId, worldYear: quote.context.worldYear,
    season: quote.context.season, sourceClub: quote.context.clubName,
    playerKey: quote.player.key, playerName: quote.player.name, position: quote.player.position,
    hostClub: quote.offer.clubName, fee: quote.offer.fee, recallFee: quote.offer.recallFee,
    optionFee: quote.offer.optionFee, startedWeek: quote.context.week, ratingAtStart: quote.player.rating,
    opportunity: { ...quote.opportunity },
  };
  record.id = identity(record);
  return sameLoan(record, actualLoan) && record.ratingAtStart === actualLoan.rating ? record : null;
}

export function reviewLoanDevelopment(
  record: LoanDevelopmentRecord, context: LoanDevelopmentContext, actualLoan: LoanDevelopmentLoan,
  host: LoanDevelopmentHost,
): LoanDevelopmentRecord | null {
  if (!loanDevelopmentOf(record) || !sameSeason(record, context) || !sameLoan(record, actualLoan)) return null;
  const lastWeek = record.review?.week ?? record.startedWeek;
  if (context.week < lastWeek) return null;
  if (context.week === lastWeek && record.review) return record;
  const opportunity = host.clubName === record.hostClub
    ? loanOpportunityOf(context, { key: record.playerKey, name: record.playerName, position: record.position, rating: actualLoan.rating }, host)
    : { partial: true as const, reason: 'CM_PARTIAL' as const };
  return { ...record, review: { week: context.week, rating: actualLoan.rating,
    ratingChange: actualLoan.rating - record.ratingAtStart, opportunity } };
}

/** This is a UI projection. The existing engine still executes and validates the recall. */
export function loanDevelopmentCanRecall(
  record: LoanDevelopmentRecord, context: LoanDevelopmentContext, actualLoan: LoanDevelopmentLoan,
  budget: number, squadSize: number,
): boolean {
  return loanDevelopmentMatches(record, context, actualLoan)
    && context.windowOpen && actualLoan.recallFee !== undefined
    && money(actualLoan.recallFee) && money(budget) && budget >= actualLoan.recallFee
    && count(squadSize) && squadSize < 30;
}

export function recordLoanDevelopmentLog(
  record: LoanDevelopmentRecord, context: LoanDevelopmentContext, actualLoan: LoanDevelopmentLoan,
  kind: unknown, actualRating: number,
): LoanDevelopmentLog | null {
  if (!loanDevelopmentMatches(record, context, actualLoan) || !rating(actualRating)
    || kind !== 'check-in' && kind !== 'recalled'
    || kind === 'check-in' && actualRating !== actualLoan.rating
    || kind === 'recalled' && !context.windowOpen) return null;
  const { opportunity: _opportunity, review: _review, ...base } = record;
  const entry = { ...base, kind, observedYear: context.worldYear, observedSeason: context.season,
    observedWeek: context.week, rating: actualRating, ratingChange: actualRating - record.ratingAtStart };
  return { ...entry, key: JSON.stringify([entry.id, kind, entry.observedYear, entry.observedSeason, entry.observedWeek]) };
}
function validLog(value: unknown): value is LoanDevelopmentLog {
  return validBase(value) && (value.kind === 'check-in' || value.kind === 'recalled')
    && value.observedYear === value.worldYear && value.observedSeason === value.season
    && count(value.observedWeek) && value.observedWeek >= Number(value.startedWeek)
    && rating(value.rating) && value.ratingChange === value.rating - Number(value.ratingAtStart)
    && value.key === JSON.stringify([value.id, value.kind, value.observedYear, value.observedSeason, value.observedWeek]);
}
function logToken(value: LoanDevelopmentLog): string {
  return JSON.stringify([value.key, value.id, value.playerName, value.position, value.fee, value.recallFee ?? null,
    value.optionFee ?? null, value.startedWeek, value.ratingAtStart, value.kind,
    value.observedYear, value.observedSeason, value.observedWeek, value.rating, value.ratingChange]);
}
export function loanDevelopmentLogOf(value: unknown): readonly LoanDevelopmentLog[] | null | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || value.length > LOAN_DEVELOPMENT_HISTORY_LIMIT
    || !value.every(validLog) || new Set(value.map(row => row.key)).size !== value.length) return null;
  return value;
}
export function appendLoanDevelopmentLog(
  value: unknown, entry: LoanDevelopmentLog,
): readonly LoanDevelopmentLog[] | null {
  const history = loanDevelopmentLogOf(value);
  if (history === null || !validLog(entry)) return null;
  const existing = history?.find(row => row.key === entry.key);
  if (existing) return logToken(existing) === logToken(entry) ? history! : null;
  return [...(history ?? []), entry].slice(-LOAN_DEVELOPMENT_HISTORY_LIMIT);
}
