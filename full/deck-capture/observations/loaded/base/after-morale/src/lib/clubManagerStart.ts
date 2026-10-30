/**
 * Round 514: Club Manager start options, from his 2026-08-28 list.
 *
 * His words, verbatim: "Start options: display currency, international job
 * offers on or off, negotiation strictness slider." Three settings, chosen
 * before kickoff, stored on the save.
 *
 * NEUTRAL AT THE DEFAULT, which is Round 95's rule wearing different clothes.
 * The defaults are the game exactly as it shipped: pounds, international jobs
 * on, strictness at the middle notch. A save written before this round has no
 * block at all and reads as the defaults, so it plays the game it played.
 *
 * THE ONE THAT NEEDED CARE, AND WHY IT IS ASYMMETRIC.
 *
 * A "negotiation strictness" slider is the most dangerous thing on this list,
 * because the obvious implementation is the one Round 513 already got wrong and
 * had to have torn out. Round 506 built the transfer haggle on a measured
 * guarantee: repeating an unchanged lowball runs the seller out of table. That
 * guarantee rests on exactly two numbers, the fraction of the gap the seller
 * concedes each round and the number of counters his patience allows. Round
 * 513's first Negotiation tree raised both, and measured over Round 506's own
 * sweep the guarantee did not soften, it vanished: from three skill points
 * NOTHING at any offer multiple anywhere in the sweep ever ran out of patience.
 *
 * So this slider may never add a round at the table. Leniency buys a SMALLER
 * OPENING PREMIUM, which is visible, valuable, and cannot help a repeated
 * lowball because a lowball is priced as a fraction OF the ask: a smaller ask
 * moves the target and the arithmetic with it. Strictness may take rounds away,
 * which can only ever make the guarantee stronger.
 *
 * patienceDelta is therefore <= 0 at every setting, by construction, and
 * simClubManagerStart runs the lowball sweep at all five notches rather than
 * trusting that sentence.
 *
 * Pure. Nothing here draws from Math.random, and nothing is evaluated at module
 * scope, because clubManager.ts imports this file and this file imports
 * clubManager.ts for its types.
 */
import type { CareerState } from '@/lib/clubManager';

/* ================================================================== */
/* Currency                                                           */
/* ================================================================== */

export type CurrencyCode = 'GBP' | 'EUR' | 'USD' | 'BRL' | 'JPY';

export const CURRENCY_CODES: CurrencyCode[] = ['GBP', 'EUR', 'USD', 'BRL', 'JPY'];

/*
 * SYMBOL ONLY. There is deliberately no exchange rate here, and that is a
 * decision rather than an omission.
 *
 * A hardcoded rate is a hand written number that encodes a fact about the
 * world, and this repo has been burned by exactly that shape before: Transfer
 * Path's hints described a rule that had changed and sat wrong for six weeks
 * (Round 294). A GBP to USD rate would be stale within days and there is no
 * verified live source for one on this site, so shipping one would be inventing
 * a fact, which the data rules forbid.
 *
 * The second reason is mechanical. The transfer desk takes three TYPED numbers
 * (the fee, the wage, the signing bonus). Converting what is displayed while
 * the player types in engine units would mis-price every bid, and that code is
 * three weeks old and has just had a round of defects taken out of it.
 *
 * Worth knowing: the underlying values come from euro denominated data and the
 * game has always printed them with a pound sign, so the existing display was
 * never literally right either. Choosing EUR is arguably the most accurate
 * option here rather than the most exotic one.
 */
export const CURRENCIES: Record<CurrencyCode, { symbol: string; label: string }> = {
  GBP: { symbol: '£', label: 'Pounds' },
  EUR: { symbol: '€', label: 'Euros' },
  USD: { symbol: '$', label: 'Dollars' },
  BRL: { symbol: 'R$', label: 'Reais' },
  JPY: { symbol: '¥', label: 'Yen' },
};

export const DEFAULT_CURRENCY: CurrencyCode = 'GBP';

/* ================================================================== */
/* Negotiation strictness                                             */
/* ================================================================== */

/** 1 is the most generous seller, 5 the most awkward, 3 is the shipped game. */
export const STRICTNESS_MIN = 1;
export const STRICTNESS_MAX = 5;
export const STRICTNESS_DEFAULT = 3;

export const STRICTNESS_INFO: Record<number, { label: string; blurb: string }> = {
  1: { label: 'Generous', blurb: 'Sellers open close to what the man is worth.' },
  2: { label: 'Relaxed', blurb: 'Sellers open a little above his value.' },
  3: { label: 'Normal', blurb: 'The game as it plays by default.' },
  4: { label: 'Firm', blurb: 'Sellers open high and lose patience sooner.' },
  5: { label: 'Ruthless', blurb: 'Sellers open very high and will not sit there long.' },
};

/* ================================================================== */
/* The block on the save                                              */
/* ================================================================== */

export const START_OPTIONS_VERSION = 1;

export interface StartOptions {
  v: number;
  currency: CurrencyCode;
  /** Round 202's international job. Off means the country never calls. */
  nationJobs: boolean;
  strictness: number;
}

export function defaultStartOptions(): StartOptions {
  return {
    v: START_OPTIONS_VERSION,
    currency: DEFAULT_CURRENCY,
    nationJobs: true,
    strictness: STRICTNESS_DEFAULT,
  };
}

/** Fails closed on shape: anything unrecognised reads as a fresh default block. */
export function isValidStartOptions(u: unknown): u is StartOptions {
  if (!u || typeof u !== 'object' || Array.isArray(u)) return false;
  const o = u as Record<string, unknown>;
  if (o.v !== START_OPTIONS_VERSION) return false;
  if (typeof o.currency !== 'string' || !CURRENCY_CODES.includes(o.currency as CurrencyCode)) return false;
  if (typeof o.nationJobs !== 'boolean') return false;
  const s = o.strictness;
  if (typeof s !== 'number' || !Number.isInteger(s) || s < STRICTNESS_MIN || s > STRICTNESS_MAX) return false;
  return true;
}

/** The block for READING, never writing, so a component cannot mutate a save. */
export function startOptionsOf(state: CareerState): StartOptions {
  return isValidStartOptions(state.startOptions) ? state.startOptions : defaultStartOptions();
}

/**
 * The block, repaired in place when missing or mangled. IDEMPOTENT, because
 * every ensure in this engine runs at least twice on a normal load and the
 * documented Round 127 bug was a repair that was not.
 */
export function ensureStartOptions(state: CareerState): StartOptions {
  if (!isValidStartOptions(state.startOptions)) state.startOptions = defaultStartOptions();
  return state.startOptions as StartOptions;
}

/** Set one option. Returns null when it cannot be done, the shape the hook takes. */
export function setStartOption<K extends keyof Omit<StartOptions, 'v'>>(
  career: CareerState,
  key: K,
  value: StartOptions[K],
): CareerState | null {
  const next: StartOptions = { ...startOptionsOf(career), [key]: value };
  if (!isValidStartOptions(next)) return null;
  const current = startOptionsOf(career);
  if (current[key] === value) return null;
  return { ...career, startOptions: next };
}

/* ================================================================== */
/* What the options actually do                                       */
/* ================================================================== */

/** The symbol to print money in. Pounds unless he chose otherwise. */
export function currencySymbol(state: CareerState): string {
  return CURRENCIES[startOptionsOf(state).currency].symbol;
}

/** Round 202's international job, or silence. True is the shipped game. */
export function nationJobsOn(state: CareerState): boolean {
  return startOptionsOf(state).nationJobs;
}

/**
 * What the seller adds on top of the man's value when he opens, as a multiple
 * of the premium the shipped engine rolled. Exactly 1 at the default notch.
 *
 * This is the ONLY dial leniency is allowed to touch. See the header.
 */
export function askPremiumScale(state: CareerState): number {
  const s = startOptionsOf(state).strictness;
  const table: Record<number, number> = { 1: 0.5, 2: 0.75, 3: 1, 4: 1.35, 5: 1.7 };
  return table[s] ?? 1;
}

/**
 * Rounds taken OFF the seller's patience. NEVER POSITIVE, at any setting, and
 * that is the safety property the whole file is arranged around: adding rounds
 * at the table is what deleted Round 506's guarantee when Round 513 tried it.
 * Zero at the default notch.
 */
export function patienceDelta(state: CareerState): number {
  const s = startOptionsOf(state).strictness;
  const table: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: -1, 5: -1 };
  const d = table[s] ?? 0;
  return d > 0 ? 0 : d;
}

/** The floor a strict setting may never take patience below, so a fair offer
    still has somewhere to go and "hard" never becomes "impossible". */
export const PATIENCE_FLOOR = 3;
