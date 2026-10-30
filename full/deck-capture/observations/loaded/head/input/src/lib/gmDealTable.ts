/**
 * Round 908: the deal table, lifted out of Club Manager so every GM game can
 * sit at the same one.
 *
 * What lives here is the part of Round 506's deal desk that was already pure
 * numbers: what an offer reads as against an ask, the closeness meter, what an
 * answer costs in patience, and the valuation band that always contains the
 * truth. None of it ever needed a Club Manager career, it only happened to be
 * written in src/lib/clubManagerDeals.ts, so the four front offices had no way
 * to reach it and their own expiring players stayed or left on a coin flip.
 *
 * THE RULE OF THIS FILE: no game's state appears in any signature. Numbers and
 * strings in, numbers and strings out. Club Manager reaches it through
 * clubManagerDeals.ts, which re-exports every name below so nothing that
 * imported the old names had to change, and the re-sign desk reaches it
 * through gmContracts.ts.
 *
 * It was MOVED, not rewritten. scripts/simGmDealTableFixture.mjs recorded the
 * table on origin/main before the move (the grid at every offer step, the
 * band, 28 live negotiations on the real engine with seeded draws) and replays
 * it against this file line for line. The lines, the meter and the prices are
 * Round 161's and Round 506's, measured in scripts/simClubManagerDeals.mjs,
 * and are not retuned here.
 *
 * Nothing draws from Math.random and nothing is evaluated at module scope
 * beyond literal constants, so this file is safe on either side of an import
 * cycle and imports nothing at all.
 */

/* ================================================================== */
/* 1. What an offer reads as, and the closeness meter                  */
/* ================================================================== */

/*
 * The agree line at 0.97 of the ask is Round 161's and is not moved here. What
 * Round 506 added is the floor underneath it. Before that round an insulting
 * offer was anything under 0.75 of the ask and it only ever cost one patience,
 * so there was no number low enough to end a conversation on the spot: the
 * owner's "extreme lowballs can end talks entirely" had no code behind it.
 */

/** Meet this share of the ask and the deal is done. Round 161's line. */
export const AGREE_RATIO = 0.97;
/** Under this and it reads as an insult. Round 161's line. */
export const INSULT_RATIO = 0.75;
/** Under this and they end the conversation on the spot. New in Round 506. */
export const WALKOUT_RATIO = 0.55;

export type OfferVerdict = 'agreed' | 'counter' | 'insulted' | 'walkout';

/** What a package reads as to the other side. One function, four answers. */
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

/* ================================================================== */
/* 2. Patience                                                        */
/* ================================================================== */

/*
 * Patience, and this is the defect half of the owner's "limited patience per
 * negotiation" clause rather than a missing feature. Measured on the shipped
 * engine before Round 506: patience was spent ONLY on the lowball branch,
 * while the counter branch floored the ask at 1.02 of your package against an
 * agreement line of 0.97. Repeating one unchanged offer therefore closed any
 * non-lowball deal in at most three rounds and cost nothing at all, so the
 * only real risk in haggling was a rival turning up. Every offer costs
 * something now, and an insult costs double.
 */

/** Rounds at the table before they stop taking your calls. */
export const OPENING_PATIENCE_MIN = 4;
/** The spread on top of it, so the other side is 4 or 5 rounds patient. */
export const OPENING_PATIENCE_SPREAD = 1;

/** What one answer costs the other side's goodwill. */
export function patienceCost(verdict: OfferVerdict): number {
  if (verdict === 'insulted') return 2;
  if (verdict === 'counter') return 1;
  return 0;
}

/* ================================================================== */
/* 3. The band read                                                   */
/* ================================================================== */

/*
 * The one load bearing rule, borrowed from reportBand on a youth prospect's
 * ceiling: THE BAND ALWAYS CONTAINS THE TRUTH. A weak desk is imprecise, never
 * wrong signed and never lying. If a bad read could point the wrong way the
 * player would be being told something false, which is a different thing from
 * being told something loosely.
 *
 * How wide the band is belongs to the game that owns the desk (Club Manager
 * reads its lead scout and its Recruitment tree in valuationSpread). This file
 * only turns a truth, a width and a key into the two ends.
 */

/** At or under this the desk is quoting a number, not a range. */
export const VALUATION_EXACT_AT = 0.02;

/** FNV-1a, the hash clubManagerStaff already uses, so no draw is spent here.
    Exported for the re-sign desk, which needs the same "fixed by the key, not by a draw" property. */
export function hash32(s: string): number {
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
 * The band around a true figure. Deterministic in the key, so it is the same
 * number every render and every reopen: a band that redrew itself could be
 * averaged back to the truth by anybody willing to close and reopen the panel
 * twice. Club Manager's key is the player's name and the season.
 *
 * The truth is always inside the band. The two sides are drawn independently
 * so the truth is not always in the middle either, which is what stops a
 * player reading the midpoint as the answer.
 */
export function bandRead(truth: number, spread: number, key: string): ValuationRead {
  if (spread <= VALUATION_EXACT_AT) {
    return { low: truth, high: truth, spread, exact: true };
  }
  const h = hash32(key);
  /* Two independent draws in [0, spread], one each side. */
  const below = ((h % 1000) / 1000) * spread;
  const above = (((h >>> 10) % 1000) / 1000) * spread;
  const low = Math.max(0.1, Math.round(truth * (1 - below) * 10) / 10);
  const high = Math.max(low, Math.round(truth * (1 + above) * 10) / 10);
  return { low, high, spread, exact: false };
}
