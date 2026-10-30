export interface LoyaltyOffer {
  club: { name: string; country?: string; league?: string; color?: string; tier?: number };
  wage: number; contractYears: number; transferFee: number;
  isLoan?: boolean; isDreamClub?: boolean; isHomegrown?: boolean; isPayCut?: boolean;
}
export interface LoyaltySeason { year: number; club: string; type: string; onLoanFrom?: string | null }
export interface LoyaltyCareer {
  playerName: string; agentId?: unknown; phase: string; retired: boolean; currentClub: string;
  contractYearsLeft: number; weeklyWage: number; netWorth: number; totalEarnings: number;
  seasons: readonly LoyaltySeason[]; events?: readonly string[];
  pendingOffers?: readonly LoyaltyOffer[]; transferSituation?: unknown; loyaltyContracts?: unknown;
}
export interface LoyaltyQuote {
  key: string; offerToken: string; club: string; firstYear: number; finalYear: number; years: number;
  baseWeeklyWage: number; weeklyWage: number; bonusEuros: number;
}
export interface LoyaltyDeal {
  id: string; club: string; firstYear: number; finalYear: number; years: number;
  baseWeeklyWage: number; weeklyWage: number; bonusEuros: number;
  completed: number; lastYear: number; status: 'active' | 'paid' | 'forfeited'; paidEuros: number;
  reason?: 'move' | 'retired' | 'expiry' | 'gap';
  /* Release BS fix: set only once his wage moved under this deal's cut. wageNow is the cut wage he is
     on now (0 once a later contract at the club replaced it), uncutNow the same wage without the cut. */
  wageNow?: number; uncutNow?: number;
}
export interface SoccerLoyaltyState { v: 1; deals: LoyaltyDeal[]; pending?: LoyaltyQuote }

const record = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x);
const whole = (x: unknown): x is number => typeof x === 'number' && Number.isSafeInteger(x) && x >= 0;
const words = (x: unknown): x is string => typeof x === 'string' && x.length > 0 && x.length <= 4096;
const finite = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);
function validTerms(x: Record<string, unknown>): boolean {
  return words(x.club) && whole(x.firstYear) && whole(x.finalYear) && whole(x.years)
    && x.years >= 2 && x.years <= 5 && x.finalYear === x.firstYear + x.years - 1
    && whole(x.baseWeeklyWage) && x.baseWeeklyWage > 0 && whole(x.weeklyWage)
    && x.weeklyWage > 0 && x.weeklyWage < x.baseWeeklyWage
    && x.weeklyWage === Math.round(x.baseWeeklyWage * 0.90)
    && whole(x.bonusEuros) && x.bonusEuros > 0
    && x.bonusEuros === Math.round(x.baseWeeklyWage * 52 * x.years * 0.15)
    && Number.isSafeInteger(x.baseWeeklyWage * 52 * x.years)
    && Number.isSafeInteger(x.weeklyWage * 52 * x.years + x.bonusEuros)
    && x.weeklyWage * 52 * x.years + x.bonusEuros > x.baseWeeklyWage * 52 * x.years;
}
function validQuote(x: unknown): x is LoyaltyQuote {
  return record(x) && words(x.key) && words(x.offerToken) && validTerms(x);
}
function validDeal(x: unknown): x is LoyaltyDeal {
  if (!record(x) || !words(x.id) || !validTerms(x) || !whole(x.completed) || !whole(x.lastYear)
    || !whole(x.paidEuros) || x.completed > (x.years as number)
    || x.lastYear !== (x.firstYear as number) + x.completed - 1) return false;
  if (x.status === 'paid') return x.completed === x.years && x.paidEuros === x.bonusEuros && x.reason === undefined;
  if (x.status === 'active') return x.completed < (x.years as number) && x.paidEuros === 0 && x.reason === undefined;
  return x.status === 'forfeited' && x.completed < (x.years as number) && x.paidEuros === 0
    && ['move', 'retired', 'expiry', 'gap'].includes(x.reason as string);
}
export function readLoyalty(state: LoyaltyCareer): SoccerLoyaltyState | null {
  const x = state.loyaltyContracts;
  if (!record(x) || x.v !== 1 || !Array.isArray(x.deals) || x.deals.length > 60
    || !x.deals.every(validDeal) || (x.pending !== undefined && !validQuote(x.pending))) return null;
  const ids = new Set(x.deals.map(deal => deal.id));
  if (ids.size !== x.deals.length || x.deals.filter(deal => deal.status === 'active').length > 1) return null;
  return x as unknown as SoccerLoyaltyState;
}
function token(offer: LoyaltyOffer): string {
  return JSON.stringify([offer.club.name, offer.club.country, offer.club.league, offer.club.color, offer.club.tier,
    offer.wage, offer.contractYears, offer.transferFee, !!offer.isLoan, !!offer.isDreamClub, !!offer.isHomegrown, !!offer.isPayCut]);
}
function offers(state: LoyaltyCareer): LoyaltyOffer[] {
  if (state.phase === 'contract_offer') return [...(state.pendingOffers ?? [])];
  if (state.phase !== 'transfer_window' || !record(state.transferSituation)) return [];
  const s = state.transferSituation;
  if (['one_offer', 'dream_club', 'request_result'].includes(s.type as string)) return s.offer ? [s.offer as unknown as LoyaltyOffer] : [];
  if (s.type === 'bidding_war') return [s.offerA, s.offerB] as LoyaltyOffer[];
  if (s.type === 'contract_expiry' || s.type === 'frozen_out') return Array.isArray(s.offers) ? s.offers as LoyaltyOffer[] : [];
  return [];
}
function currentOffer(state: LoyaltyCareer, offer: LoyaltyOffer): boolean {
  return !state.retired && record(offer) && record(offer.club) && words(offer.club.name)
    && words(offer.club.country) && words(offer.club.league) && words(offer.club.color)
    && whole(offer.club.tier) && offer.club.tier >= 1 && finite(offer.transferFee) && offer.transferFee >= 0
    && finite(offer.wage) && offer.wage > 0 && whole(offer.contractYears) && !offer.isLoan
    && offers(state).some(candidate => record(candidate) && record(candidate.club) && token(candidate) === token(offer));
}
function active(ledger: SoccerLoyaltyState): LoyaltyDeal | undefined { return ledger.deals.find(deal => deal.status === 'active'); }
export function quoteLoyalty(state: LoyaltyCareer, offer: LoyaltyOffer, baseWeeklyWage: number): LoyaltyQuote | null {
  const ledger = readLoyalty(state);
  if ((state.loyaltyContracts !== undefined && !ledger) || !currentOffer(state, offer)
    || !whole(baseWeeklyWage) || baseWeeklyWage <= 0 || offer.contractYears < 2 || offer.contractYears > 5
    || (ledger && (ledger.deals.length >= 60 || active(ledger)?.club === offer.club.name))) return null;
  const lastYear = state.seasons[state.seasons.length - 1]?.year;
  if (!whole(lastYear)) return null;
  const firstYear = lastYear + 1, finalYear = firstYear + offer.contractYears - 1;
  const weeklyWage = Math.round(baseWeeklyWage * 0.90);
  const bonusEuros = Math.round(baseWeeklyWage * 52 * offer.contractYears * 0.15);
  const offerToken = token(offer);
  const key = JSON.stringify([state.playerName, typeof state.agentId === 'string' ? state.agentId : '',
    state.phase, firstYear, offerToken, baseWeeklyWage]);
  const quote = { key, offerToken, club: offer.club.name, firstYear, finalYear, years: offer.contractYears,
    baseWeeklyWage, weeklyWage, bonusEuros };
  return validQuote(quote) ? quote : null;
}
export function chooseLoyalty<T extends LoyaltyCareer>(state: T, offer: LoyaltyOffer, baseWeeklyWage: number, mode: 'cash' | 'loyalty'): T {
  const ledger = readLoyalty(state);
  if (mode === 'cash') return clearLoyaltyChoice(state);
  const pending = quoteLoyalty(state, offer, baseWeeklyWage);
  if (!pending || ledger?.pending?.key === pending.key) return state;
  return { ...state, loyaltyContracts: { v: 1, deals: [...(ledger?.deals ?? [])], pending } };
}
export function clearLoyaltyChoice<T extends LoyaltyCareer>(state: T): T {
  const ledger = readLoyalty(state);
  if (!ledger?.pending) return state;
  const next = { ...state };
  if (ledger.deals.length) next.loyaltyContracts = { v: 1, deals: [...ledger.deals] };
  else delete next.loyaltyContracts;
  return next;
}
export function canAcceptLoyaltyOffer(state: LoyaltyCareer, offer: LoyaltyOffer, baseWeeklyWage: number): boolean {
  if (state.loyaltyContracts === undefined) return true;
  const ledger = readLoyalty(state);
  if (!ledger) return true;
  if (!currentOffer(state, offer)) return false;
  if (!ledger.pending || ledger.pending.club !== offer.club.name) return true;
  return quoteLoyalty(state, offer, baseWeeklyWage)?.key === ledger.pending.key;
}
export function loyaltySigningWage(state: LoyaltyCareer, offer: LoyaltyOffer, baseWeeklyWage: number): number {
  const ledger = readLoyalty(state), quote = quoteLoyalty(state, offer, baseWeeklyWage);
  return quote && ledger?.pending?.key === quote.key ? quote.weeklyWage : baseWeeklyWage;
}
function replaceDeal<T extends LoyaltyCareer>(state: T, ledger: SoccerLoyaltyState, deal: LoyaltyDeal, event?: string): T {
  return { ...state, loyaltyContracts: { ...ledger, deals: ledger.deals.map(old => old.id === deal.id ? deal : old) },
    ...(event ? { events: [...(state.events ?? []), event] } : {}) };
}
function close<T extends LoyaltyCareer>(state: T, reason: LoyaltyDeal['reason']): T {
  const ledger = readLoyalty(state), deal = ledger && active(ledger);
  if (!ledger || !deal) return state;
  return replaceDeal(state, ledger, { ...deal, status: 'forfeited', reason },
    'Loyalty payout of EUR ' + deal.bonusEuros.toLocaleString('en-US') + ' at ' + deal.club + ' forfeited.');
}
/* Release BS fix: the 10% cut is a term of the loyalty contract, not of the player. While he is
   still on that cut wage at the club, a later contract there (the extension, or the renewal when
   he stays) quotes from the wage he would have had without it. */
function latestHere(state: LoyaltyCareer): LoyaltyDeal | undefined {
  const deals = readLoyalty(state)?.deals.filter(old => old.club === state.currentClub) ?? [];
  return deals[deals.length - 1];
}
export function loyaltyUncutWage(state: LoyaltyCareer): number {
  const deal = latestHere(state);
  if (!deal) return state.weeklyWage;
  const cut = deal.wageNow ?? deal.weeklyWage, uncut = deal.uncutNow ?? deal.baseWeeklyWage;
  return finite(cut) && cut > 0 && cut === state.weeklyWage && finite(uncut) && uncut > 0 ? uncut : state.weeklyWage;
}
/* Release BS fix: an event that moves his wage at the club while he is on the cut (Contract
   Breakdown, a pay rise, a pay cut) moves the uncut wage by the same factor, so a later contract
   still quotes from the wage without the cut. */
export function followLoyaltyWage<T extends LoyaltyCareer>(prev: LoyaltyCareer, next: T): T {
  const uncut = loyaltyUncutWage(prev);
  if (uncut === prev.weeklyWage || next.currentClub !== prev.currentClub || next.weeklyWage === prev.weeklyWage
    || !finite(next.weeklyWage) || next.weeklyWage <= 0) return next;
  const ledger = readLoyalty(next), deal = latestHere(next);
  if (!ledger || !deal) return next;
  return replaceDeal(next, ledger, { ...deal, wageNow: next.weeklyWage, uncutNow: Math.round(uncut * next.weeklyWage / prev.weeklyWage) });
}
/* Release BS fix: a new contract at the club (the extension, or the renewal when he stays) replaces
   the cut one. Only a new wage that lands exactly on the cut wage needs saying so. */
export function endLoyaltyCut<T extends LoyaltyCareer>(prev: LoyaltyCareer, next: T): T {
  if (loyaltyUncutWage(prev) === prev.weeklyWage || next.currentClub !== prev.currentClub || next.weeklyWage !== prev.weeklyWage) return next;
  const ledger = readLoyalty(next), deal = latestHere(next);
  return ledger && deal ? replaceDeal(next, ledger, { ...deal, wageNow: 0, uncutNow: 0 }) : next;
}
export function loyaltyForfeitEuros(state: LoyaltyCareer, employer: string): number {
  const ledger = readLoyalty(state), deal = ledger && active(ledger);
  return deal && deal.club !== employer ? deal.bonusEuros : 0;
}
export function closeLoyaltyForEmployer<T extends LoyaltyCareer>(state: T, employer: string): T {
  const ledger = readLoyalty(state), deal = ledger && active(ledger);
  return deal && deal.club !== employer ? close(state, 'move') : state;
}
export function closeLoyaltyForExpiry<T extends LoyaltyCareer>(state: T): T {
  const released = record(state.transferSituation) && state.transferSituation.type === 'frozen_out' && state.transferSituation.mode === 'released';
  return state.contractYearsLeft <= 0 || released ? close(state, 'expiry') : state;
}
export function closeLoyaltyForRetirement<T extends LoyaltyCareer>(state: T): T { return clearLoyaltyChoice(close(state, 'retired')); }
export function commitLoyaltySigning<T extends LoyaltyCareer>(before: T, next: T, offer: LoyaltyOffer, baseWeeklyWage: number): T {
  const ledger = readLoyalty(before);
  if (!ledger) return repairLoyalty(next);
  const quote = quoteLoyalty(before, offer, baseWeeklyWage);
  const selected = quote && ledger.pending?.key === quote.key ? quote : null;
  const closed = closeLoyaltyForEmployer({ ...next, loyaltyContracts: ledger }, offer.club.name);
  const kept = readLoyalty(closed)!;
  if (!selected) {
    const result = { ...closed };
    if (kept.deals.length) result.loyaltyContracts = { v: 1, deals: [...kept.deals] };
    else delete result.loyaltyContracts;
    return result;
  }
  const deal: LoyaltyDeal = { id: selected.key, club: selected.club, firstYear: selected.firstYear,
    finalYear: selected.finalYear, years: selected.years, baseWeeklyWage: selected.baseWeeklyWage,
    weeklyWage: selected.weeklyWage, bonusEuros: selected.bonusEuros,
    completed: 0, lastYear: selected.firstYear - 1, status: 'active', paidEuros: 0 };
  return { ...closed, loyaltyContracts: { v: 1, deals: [...kept.deals, deal] },
    events: [...(closed.events ?? []), 'Loyalty contract: EUR ' + selected.weeklyWage.toLocaleString('en-US')
      + ' a week, EUR ' + selected.bonusEuros.toLocaleString('en-US') + ' after ' + selected.years + ' recorded contract seasons.'] };
}
export function settleLoyaltySeason<T extends LoyaltyCareer>(state: T, row: LoyaltySeason): T {
  const ledger = readLoyalty(state), deal = ledger && active(ledger);
  if (!ledger || !deal || row.type !== 'playing' || !state.seasons.includes(row) || !whole(row.year) || row.year <= deal.lastYear) return state;
  if (row.year !== deal.lastYear + 1) return close(state, 'gap');
  if (!words(row.club) || ['BANNED', 'BANNED (PED)', 'PRISON', 'CONVICTED'].includes(row.club)
    || (row.onLoanFrom || row.club) !== deal.club) return close(state, 'gap');
  const completed = deal.completed + 1;
  if (completed === deal.years) {
    const paid = deal.bonusEuros / 1_000_000;
    if (!finite(state.netWorth) || !finite(state.totalEarnings) || !finite(state.netWorth + paid) || !finite(state.totalEarnings + paid)) return state;
    const result = replaceDeal(state, ledger, { ...deal, completed, lastYear: row.year, status: 'paid', paidEuros: deal.bonusEuros },
      'Loyalty contract completed at ' + deal.club + ': EUR ' + deal.bonusEuros.toLocaleString('en-US') + ' paid once.');
    return { ...result, netWorth: state.netWorth + paid, totalEarnings: state.totalEarnings + paid };
  }
  const result = replaceDeal(state, ledger, { ...deal, completed, lastYear: row.year });
  return state.contractYearsLeft <= 0 ? close(result, 'expiry') : result;
}
export function repairLoyalty<T extends LoyaltyCareer>(state: T): T {
  if (state.loyaltyContracts === undefined) return state;
  if (!readLoyalty(state)) { const fixed = { ...state }; delete fixed.loyaltyContracts; return fixed; }
  return state.retired ? closeLoyaltyForRetirement(state) : state;
}
