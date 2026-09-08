/**
 * Round 506: the deal desk. Everything his transfers sentence asked for that
 * Round 161 had not already built, kept out of the 13k line engine the same
 * way clubManagerStaff and clubManagerBoardAsks are, so clubManager.ts only
 * has to call it at four seams.
 *
 * His words: "a valuation staffer whose accuracy depends on level ... YOU type
 * the bid; extreme lowballs can end talks entirely; sell on clauses, player
 * swaps, a closeness meter, limited patience per negotiation. Loans with option
 * and release figures. Then personal terms: length, wages, add ons, role
 * promises, everything."
 *
 * Sell-on clauses, player swaps and add-ons already shipped in Round 161 as
 * DealExtras weighed by dealPackageValue, and nothing here touches them.
 *
 * Everything in this file is a pure function of what it is handed. Nothing
 * draws from Math.random, including the valuation band, which is hashed off
 * the player's own name so it cannot flicker between renders and cannot be
 * averaged out by reopening the screen. Nothing is evaluated at module scope,
 * because clubManager.ts imports this file and this file imports clubManager.ts
 * for its types, and a value read at module scope in a cycle is how Round 249
 * put a blank page on a route.
 */
import type { CareerState, CMPlayer, MarketPlayer, SquadRole } from '@/lib/clubManager';
import { money } from '@/lib/clubManager';
import { staffLevel } from '@/lib/clubManagerStaff';

/* ================================================================== */
/* 1. The valuation desk                                              */
/* ================================================================== */

/*
 * Before this round there was no fog anywhere between a market player's baked
 * value and the number on the screen: askingPrice and marketBase are pure and
 * cached across careers, and the transfer screen printed money(m.value)
 * verbatim. The only accuracy layer in the whole game was reportBand on a
 * youth prospect's ceiling, off a scout's judgement.
 *
 * So this is that layer for the first team market, and it borrows reportBand's
 * one load bearing rule: THE BAND ALWAYS CONTAINS THE TRUTH. A weak
 * recruitment desk is imprecise, never wrong signed and never lying. If a bad
 * read could point the wrong way the player would be being told something
 * false, which is a different thing from being told something loosely.
 *
 * The lead scout is the valuation man rather than a fifth staff post on
 * purpose. isValidStaff fails closed on shape and an old save has no key for a
 * post that did not exist when it was written, so adding a post would have
 * silently wiped every player's hires on load. The post that already means
 * "how good is your recruitment department" does the job.
 */

/** Widest band, at level 1 and on an empty post: plus or minus 30 percent. */
export const VALUATION_SPREAD_MAX = 0.3;
/** At or under this the desk is quoting a number, not a range. */
export const VALUATION_EXACT_AT = 0.02;

/**
 * How loose your read of a fee is: 0.30 at level 1, and tight enough at level
 * 10 that the desk quotes a figure rather than a band.
 *
 * The slope was 0.031, which bottoms out at 0.021 and is never <= the 0.02
 * threshold, so ValuationRead.exact was ALWAYS false, valuationLine's "quotes a
 * figure" branch was dead code, and the most expensive recruitment department
 * the game sells still only ever gave you a range. The docs promised the
 * opposite. 0.035 reaches the floor at level 9 and holds it at 10, so the last
 * couple of levels are what buy you a straight answer, which is what the copy
 * has always said they buy. Found by re-reading a finding the review's vote had
 * dropped: unconfirmed is not refuted.
 */
export function valuationSpread(state: CareerState): number {
  const level = staffLevel(state, 'scout');
  return Math.max(VALUATION_EXACT_AT, VALUATION_SPREAD_MAX - 0.035 * (level - 1));
}

/** FNV-1a, the hash clubManagerStaff already uses, so no draw is spent here. */
function hash32(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

export interface ValuationRead {
  /** The bottom of what your people think he is worth, in millions. */
  low: number;
  /** The top of it. */
  high: number;
  /** The half width actually used, so a screen can say how good the read is. */
  spread: number;
  /** True when the desk is tight enough to quote one number. */
  exact: boolean;
}

/**
 * What your recruitment desk says a market player is worth. Deterministic in
 * the player's name and the season, so it is the same number every render and
 * every reopen: a band that redrew itself could be averaged back to the truth
 * by anybody willing to close and reopen the panel twice.
 *
 * The truth is always inside the band. The two sides are drawn independently
 * so the truth is not always in the middle either, which is what stops a
 * player reading the midpoint as the answer.
 */
export function valuationBand(state: CareerState, mp: MarketPlayer): ValuationRead {
  const truth = mp.value ?? mp.price;
  const spread = valuationSpread(state);
  if (spread <= VALUATION_EXACT_AT) {
    return { low: truth, high: truth, spread, exact: true };
  }
  const h = hash32(`${mp.name}:${state.season}`);
  /* Two independent draws in [0, spread], one each side. */
  const below = ((h % 1000) / 1000) * spread;
  const above = (((h >>> 10) % 1000) / 1000) * spread;
  const low = Math.max(0.1, Math.round(truth * (1 - below) * 10) / 10);
  const high = Math.max(low, Math.round(truth * (1 + above) * 10) / 10);
  return { low, high, spread, exact: false };
}

/**
 * One line for the screen: the read, and how much to trust it.
 *
 * Round 507 fix: this used a bare `${n}m` template and replaced a call to
 * money() on both the market row and the negotiation header, so a row read
 * "worth 45m to 58m" with no currency beside a "Their ask: 45m" that had one,
 * and a cheap target read "worth 0.3m to 0.5m" where the rest of the screen
 * says 300k. money() is the one formatter and this line uses it like everything
 * else does.
 */
export function valuationLine(state: CareerState, mp: MarketPlayer): string {
  const read = valuationBand(state, mp);
  if (read.exact) return `worth ${money(read.low)}`;
  return `worth ${money(read.low)} to ${money(read.high)}`;
}

/* ================================================================== */
/* 2. The fee table: the closeness meter, and what an offer reads as   */
/* ================================================================== */

/*
 * The agree line at 0.97 of the ask is Round 161's and is not moved here. What
 * is new is the floor underneath it. Before this round an insulting offer was
 * anything under 0.75 of the ask and it only ever cost one patience, so there
 * was no number low enough to end a conversation on the spot: his "extreme
 * lowballs can end talks entirely" had no code behind it.
 */

/** Meet this share of the ask and the deal is done. Round 161's line. */
export const AGREE_RATIO = 0.97;
/** Under this and it reads as an insult. Round 161's line. */
export const INSULT_RATIO = 0.75;
/** Under this and they end the conversation on the spot. New in Round 506. */
export const WALKOUT_RATIO = 0.55;

export type OfferVerdict = 'agreed' | 'counter' | 'insulted' | 'walkout';

/** What a package reads as to the selling club. One function, four answers. */
export function offerVerdict(packageValue: number, theirAsk: number): OfferVerdict {
  if (theirAsk <= 0) return 'agreed';
  const ratio = packageValue / theirAsk;
  if (ratio >= AGREE_RATIO) return 'agreed';
  if (ratio >= INSULT_RATIO) return 'counter';
  if (ratio >= WALKOUT_RATIO) return 'insulted';
  return 'walkout';
}

/**
 * The closeness meter, 0 to 100. 100 is the agree line, 0 is the number that
 * ends the conversation, and it is linear between them so the bar moving is
 * always the same amount of progress. It reads the PACKAGE, not the cash, so
 * adding a sell-on visibly moves it and the screen cannot disagree with the
 * engine about whether a structure helped.
 */
export function dealCloseness(packageValue: number, theirAsk: number): number {
  if (theirAsk <= 0) return 100;
  const ratio = packageValue / theirAsk;
  if (ratio >= AGREE_RATIO) return 100;
  if (ratio <= WALKOUT_RATIO) return 0;
  const span = AGREE_RATIO - WALKOUT_RATIO;
  return Math.round(((ratio - WALKOUT_RATIO) / span) * 100);
}

/*
 * Patience, and this is the defect half of his "limited patience per
 * negotiation" clause rather than a missing feature. Measured on the shipped
 * engine before this round: patience was spent ONLY on the lowball branch,
 * while the counter branch floored the ask at 1.02 of your package against an
 * agreement line of 0.97. Repeating one unchanged offer therefore closed any
 * non-lowball deal in at most three rounds and cost nothing at all, so the
 * only real risk in haggling was a rival turning up. Every offer costs
 * something now, and an insult costs double.
 */

/** Rounds at the table before they stop taking your calls. */
export const OPENING_PATIENCE_MIN = 4;
/** The spread on top of it, so a seller is 4 or 5 rounds patient. */
export const OPENING_PATIENCE_SPREAD = 1;

/** What one answer costs the seller's goodwill. */
export function patienceCost(verdict: OfferVerdict): number {
  if (verdict === 'insulted') return 2;
  if (verdict === 'counter') return 1;
  return 0;
}

/**
 * How much of the gap the seller gives away each round.
 *
 * Round 161 set this at 0.55 and charging patience was not enough on its own to
 * make the table bind, which simClubManagerDeals section 3 caught: at 0.55 the
 * gap shrinks so fast that ANY offer above the insult line lands within three
 * counters, which is inside the patience of even the least patient seller. So
 * repeating one unchanged number still worked at every level, it just took a
 * round or two longer, and his "limited patience" clause was still decorative.
 *
 * The arithmetic behind 0.40. Agreement needs the remaining gap under 0.0309
 * of your offer, and the gap after n counters is (ask - offer)(1 - f)^n, so
 * repeating an offer of m times the ask lands within n counters exactly when
 * (1 - f)^n <= 0.0309m / (1 - m). At f = 0.40 and the three counters a patience
 * of four allows, that is 0.216 against 0.098 at m = 0.76 and 0.227 at
 * m = 0.88: so repeating 0.76 or 0.80 of the ask now always runs out of table,
 * 0.84 comes down to how patient this particular seller was, and 0.88 and above
 * still land. Measured in section 3, which sweeps exactly those five numbers.
 *
 * What that buys is the decision the mechanic is supposed to be about: pitch
 * low and you have to improve, or pay near the ask and close it now.
 */
export const ASK_CONVERGENCE = 0.4;

/* ================================================================== */
/* 3. Loans that carry terms                                          */
/* ================================================================== */

/*
 * A loan was a one off fee and a fixed season, unwound unconditionally at the
 * rollover, and onLoan was a bare boolean that did not even record who owned
 * him. These are the two figures he named.
 */

export interface LoanTerms {
  /** Buy him outright when the loan ends, at this fee in millions. */
  optionFee?: number;
  /** End the loan early for this, in millions. */
  breakFee?: number;
}

/**
 * Round 508: the same two figures on a loan going the OTHER way, quoted off
 * what he is worth to you rather than off a market price.
 *
 * A loan out was a one off fee and a fixed season, unwound unconditionally at
 * the rollover, which made it a single decision with no way back and no upside
 * beyond the development bump. The option is money in if he does well enough
 * that the borrowing club wants to keep him; the recall figure is the way back
 * when the man in front of him gets hurt in November.
 */
export function loanOutTermsFor(sellVal: number, loanFee: number): { optionFee: number; recallFee: number } {
  /* They pay a premium over what he is worth today, for the same reason you do
     on the way in: they are buying the right to decide at the end of a season
     in which he may have grown. */
  const optionFee = Math.max(0.5, Math.round(sellVal * 1.15 * 10) / 10);
  /* Breaking your own loan costs you, so a recall is a real decision rather
     than a free undo. Half the fee you were paid, and you keep the rest. */
  const recallFee = Math.max(0.1, Math.round(loanFee * 0.5 * 10) / 10);
  return { optionFee, recallFee };
}

/** The two figures on the table for a loan, both in millions. */
export function loanTermsFor(mp: MarketPlayer, loanFee: number): Required<LoanTerms> {
  const truth = mp.value ?? mp.price;
  /* An option costs more than he is worth today, because you are buying the
     right to decide later and they are giving up a year of his rise. */
  const optionFee = Math.max(0.5, Math.round(truth * 1.15 * 10) / 10);
  /* Breaking it costs half the loan fee again: cheap enough to use when he is
     not playing, dear enough that you do not take loans lightly. */
  const breakFee = Math.max(0.1, Math.round(loanFee * 0.5 * 10) / 10);
  return { optionFee, breakFee };
}

/* ================================================================== */
/* 4. Personal terms                                                  */
/* ================================================================== */

/*
 * None of this existed. Every arrival funnelled through completeSigning, which
 * hard coded four years (two at 31 plus), took the wage from wageFor, and left
 * role undefined so ensureRoles quietly decided later what you had supposedly
 * told him. The manager was never shown the wage at all: the word does not
 * appear once in TransferScreen.tsx before this round.
 *
 * The promise half of this is NOT new and is not rebuilt here. Round 127 built
 * the ladder, the measured share per rung, the written promise line per rung,
 * the pride guard that stops under promising being farmed, the settlement
 * price for going back on your word, and the morale swing that arrives every
 * week you break it. All this round adds is the table where the promise is
 * made, and it hands the agreed rung straight to that machinery.
 */

export interface PersonalTerms {
  /** Length of the deal in seasons. */
  years: number;
  /** Weekly wage in thousands, the same unit as wageFor and wageBill. */
  wage: number;
  /** Signing bonus in millions, paid out of the transfer budget. */
  bonus: number;
  /** The rung you are promising him, straight into the Round 127 ladder. */
  role: SquadRole;
}

/** Best rung first, so a lower index is a bigger promise. Mirrors ROLE_LADDER. */
const RUNGS: SquadRole[] = ['star', 'key', 'rotation', 'backup', 'prospect'];

function rungIndex(role: SquadRole): number {
  const i = RUNGS.indexOf(role);
  return i < 0 ? 2 : i;
}

/**
 * The rung he believes he is joining for, off his rating and his age. This is
 * deliberately his opinion of himself and not deservedRole, which reads the
 * squad he is not in yet.
 */
export function expectedRole(mp: MarketPlayer): SquadRole {
  if (mp.age <= 19) return 'prospect';
  if (mp.rating >= 84) return 'star';
  if (mp.rating >= 79) return 'key';
  if (mp.rating >= 73) return 'rotation';
  return 'backup';
}

/**
 * What he is asking for. The wage curve is wageFor's, so a signing wage and a
 * renewal wage are on one scale, and the age leverage is renewalTerms', so a
 * 27 year old knows what he is worth and a 33 year old takes what he can get.
 * The two year floor is Round 132's and matters for the same reason: contract
 * years tick down at the summer rollover before a ball is kicked, so a one
 * year deal is a player who walks without ever playing under it.
 */
export function askingTerms(mp: MarketPlayer): PersonalTerms {
  const value = mp.value ?? mp.price;
  const market = Math.max(1, Math.round(Math.pow(Math.max(0.5, value), 0.72) * 3.6));
  const leverage = mp.age <= 23 ? 1.15 : mp.age <= 29 ? 1.3 : 0.95;
  const wage = Math.max(1, Math.round(market * leverage));
  const years = mp.age >= 29 ? 2 : 4;
  const bonus = Math.max(0.1, Math.round(wage * years * 0.045 * 10) / 10);
  return { years, wage, bonus, role: expectedRole(mp) };
}

/** The shortest deal anybody signs, for the Round 132 reason above. */
export const MIN_TERMS_YEARS = 2;
/** Nobody signs past this, so a slider cannot promise a decade. */
export const MAX_TERMS_YEARS = 6;

/**
 * How your offer reads to him, where 1.0 is exactly what he asked for.
 *
 * The wage is most of it, because it is most of it in life. Length and the
 * signing bonus are real but small. The rung is worth a fifth of the answer,
 * which is what makes a promise a currency: you can buy a man down a rung with
 * money, and the Round 127 machinery will then charge you six weeks of his
 * wage per rung if you ever go back on it.
 *
 * Every term is capped so that no single one can carry a hopeless offer on its
 * own, and the ceiling of the whole thing is about 1.47, which is the headroom
 * that makes overpaying a real strategy rather than a rounding error.
 */
export function termsScore(want: PersonalTerms, offer: PersonalTerms): number {
  const wageTerm = Math.min(offer.wage / Math.max(1, want.wage), 1.6);
  const yearTerm = Math.min(offer.years / Math.max(1, want.years), 1.25);
  const bonusTerm = Math.min(offer.bonus / Math.max(0.1, want.bonus), 2);
  const drop = rungIndex(offer.role) - rungIndex(want.role);
  /* Offering a bigger promise than he expected is worth full marks and no
     more: he is not paid extra for being flattered. Every rung below costs. */
  const roleTerm = drop <= 0 ? 1 : Math.max(0, 1 - drop * 0.42);
  return Math.round((0.55 * wageTerm + 0.15 * yearTerm + 0.1 * bonusTerm + 0.2 * roleTerm) * 1000) / 1000;
}

/** Sign here. */
export const TERMS_AGREE = 1;
/** Keep talking. */
export const TERMS_INSULT = 0.8;
/** He and his agent leave the building. */
export const TERMS_WALKOUT = 0.62;

/** What his side says to an offer of terms. Same four answers as the fee table. */
export function termsVerdict(want: PersonalTerms, offer: PersonalTerms): OfferVerdict {
  const score = termsScore(want, offer);
  if (score >= TERMS_AGREE) return 'agreed';
  if (score >= TERMS_INSULT) return 'counter';
  if (score >= TERMS_WALKOUT) return 'insulted';
  return 'walkout';
}

/** The same 0 to 100 meter as the fee table, so both halves read alike. */
export function termsCloseness(want: PersonalTerms, offer: PersonalTerms): number {
  const score = termsScore(want, offer);
  if (score >= TERMS_AGREE) return 100;
  if (score <= TERMS_WALKOUT) return 0;
  return Math.round(((score - TERMS_WALKOUT) / (TERMS_AGREE - TERMS_WALKOUT)) * 100);
}

/**
 * What he comes back with when he is still talking: he gives ground on the
 * thing you were closest on and holds the rest. Pure, so the same counter is
 * always produced for the same pair, and it never asks for more than he asked
 * for at the start.
 */
export function counterTerms(want: PersonalTerms, offer: PersonalTerms): PersonalTerms {
  const wageGap = Math.max(0, want.wage - offer.wage);
  const next: PersonalTerms = { ...want };
  /* He comes down about a third of the way on wage, once, never below what you
     offered and NEVER ABOVE WHAT HE OPENED ON.
     The Math.min is the fix for a real defect the adversarial review found.
     Without it, an offer whose wage is already above his ask made wageGap zero
     and the Math.max floor became your own number, so his stated demand ROSE to
     meet it: overpay on wage to buy him down a rung and his counter moved the
     deal further away, which inverts the one thing this file says the rung is
     for. Both invariants are now enforced rather than just described. */
  next.wage = Math.min(want.wage, Math.max(offer.wage, want.wage - Math.round(wageGap * 0.34)));
  /* If the rung is the problem he says so by holding it, since the rung is
     the one thing he will not sell cheaply. */
  next.role = want.role;
  next.years = want.years;
  next.bonus = want.bonus;
  return next;
}

/** The sentence the terms panel shows, in a role's own words where it can. */
export function termsNote(verdict: OfferVerdict, want: PersonalTerms, offer: PersonalTerms): string {
  if (verdict === 'agreed') return 'He is happy with that. His agent is ready to sign.';
  if (verdict === 'walkout') {
    return 'His agent ended the meeting. That was not a serious offer for a player of his standing.';
  }
  if (verdict === 'insulted') {
    if (rungIndex(offer.role) > rungIndex(want.role)) {
      return 'He did not come here to sit on a bench, and the money does not cover it either.';
    }
    return 'His agent says that is a long way short of what he is being offered elsewhere.';
  }
  if (offer.wage < want.wage) return `His agent wants ${want.wage}k a week to get this done.`;
  return 'His agent is talking it over with him. Close, not done.';
}

/* ================================================================== */
/* 5. What the wage does to the board                                 */
/* ================================================================== */

/*
 * completeSigning read neither wageBill nor wageCap, so a signing wage landed
 * on the bill with no gate, no warning and no number on screen, and since
 * Round 436 the cap does not grow to cover it. The punishment arrived weeks
 * later as an invisible drip on the board meter. Nothing here blocks a
 * signing, because the board never blocked one and a cap that suddenly
 * refused deals would change the game rather than explain it. It tells you.
 */

export interface WageRoom {
  /** The bill today, in thousands a week. */
  bill: number;
  /** What the board tolerates, in thousands a week. */
  cap: number;
  /** What the bill becomes if he signs on this wage. */
  after: number;
  /** True when this signing is what takes you over. */
  breaches: boolean;
  /** True when you were already over before he arrived. */
  alreadyOver: boolean;
}

export function wageRoom(bill: number, cap: number, wage: number): WageRoom {
  const after = bill + wage;
  return {
    bill,
    cap,
    after,
    breaches: after > cap,
    alreadyOver: bill > cap,
  };
}

/** One line for the terms panel. Empty string when there is nothing to say. */
export function wageRoomLine(room: WageRoom): string {
  if (!room.breaches) return '';
  if (room.alreadyOver) {
    return `You are already ${Math.round(room.bill - room.cap)}k a week over the ceiling. This adds to it.`;
  }
  return `This puts you ${Math.round(room.after - room.cap)}k a week over the board's ceiling.`;
}

/* ================================================================== */
/* 6. Reading a signed deal back                                      */
/* ================================================================== */

/** The terms a player actually signed, kept on him so a screen can show them. */
export interface SignedTerms {
  years: number;
  wage: number;
  role: SquadRole;
  /** The season the promise was made, so a screen can say how old it is. */
  season: number;
}

/** True when this player was signed on a promise you are not keeping. */
export function promiseBroken(p: CMPlayer, currentRole: SquadRole): boolean {
  const signed = p.signedTerms;
  if (!signed) return false;
  return rungIndex(currentRole) > rungIndex(signed.role);
}
