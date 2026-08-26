/**
 * Round 258: money in the player's own currency.
 *
 * Owner ask, alongside the net worth format bug: "Also depending where u live
 * ur currency will be diffrent." He is right, and the game had exactly one
 * answer for everybody, the euro, from the wage slip to the transfer fee to
 * the shady lifestyle shop.
 *
 * WHAT THIS DOES NOT DO, and the reason matters more than the feature.
 * It does not pretend to know today's rate. Nothing here calls an exchange
 * rate service, because a number a player reads on a career screen has to be
 * the same number tomorrow, and because a service that goes down would leave
 * the money on screen either wrong or missing. Instead the table below holds
 * the European Central Bank's own published reference rates for one stated
 * day, checked against two independent publishers of them, and every screen
 * that shows a converted figure also says which day it was. A figure labelled
 * with its date is honest at any distance from that date. A figure that
 * silently claims to be current is not.
 *
 * THE ENGINE IS UNTOUCHED. Every amount in a save, every balance calculation
 * and every piece of game balance stays in euros forever. This is a display
 * layer and nothing else, so switching currency can never change what happens
 * to a career, and a save moved between two players who picked different
 * currencies holds identical numbers.
 *
 * HOW IT REACHES THE WHOLE GAME. Two centralised formatters (formatNetWorth
 * and formatWage) cover the headline numbers, and localizeMoney rewrites the
 * euro amounts written into hundreds of hand authored event and consequence
 * lines at the moment they are drawn. That last part is the only clever bit
 * and it is deliberately narrow: it matches an amount attached to a euro sign
 * and nothing else, so a line that mentions no money passes through byte for
 * byte. scripts/simSoccerCurrency.mjs runs every event in the catalog through
 * it and checks exactly that.
 */

export interface Currency {
  code: string;
  symbol: string;
  name: string;
  /** How many units of this currency one euro buys. EUR is 1 by definition. */
  perEur: number;
}

/**
 * ECB euro reference rates for 2026-08-21, read off the Bundesbank's daily
 * republication of them and cross checked against the ECB's own page, which
 * on its 2026-08-20 figures agreed to within about two tenths of a percent on
 * every line (USD 1.1681 against 1.1699, GBP 0.85725 against 0.85670, JPY
 * 185.45 against 185.66). One day apart on a floating rate, so the two agree.
 *
 * Sources:
 *   https://www.bundesbank.de/resource/blob/810486/a6f85aac3ac47b07ea32eae66e4bfa82/mL/ii-euro-referenzkurse-der-ezb-data.pdf
 *   https://www.ecb.europa.eu/stats/policy_and_exchange_rates/euro_reference_exchange_rates/html/index.en.html
 *
 * Updating: replace every rate in one go from a single day's publication, move
 * RATES_AS_OF with them, and never mix days. A table half from one week and
 * half from another is a table nobody can check.
 */
export const RATES_AS_OF = '2026-08-21';
/** Human readable, for the line the screens print under a converted figure. */
export const RATES_AS_OF_LABEL = 'August 2026';

export const CURRENCIES: Currency[] = [
  { code: 'EUR', symbol: '€', name: 'Euro', perEur: 1 },
  { code: 'GBP', symbol: '£', name: 'British pound', perEur: 0.85670 },
  { code: 'USD', symbol: '$', name: 'US dollar', perEur: 1.1699 },
  { code: 'BRL', symbol: 'R$', name: 'Brazilian real', perEur: 6.0518 },
  { code: 'MXN', symbol: 'MX$', name: 'Mexican peso', perEur: 19.7690 },
  { code: 'JPY', symbol: '¥', name: 'Japanese yen', perEur: 185.66 },
  { code: 'INR', symbol: '₹', name: 'Indian rupee', perEur: 111.9595 },
  { code: 'AUD', symbol: 'A$', name: 'Australian dollar', perEur: 1.6321 },
];

const EUR = CURRENCIES[0];
const STORAGE_KEY = 'dukb-soccer-currency';

export function currencyByCode(code: string | null | undefined): Currency {
  if (!code) return EUR;
  return CURRENCIES.find(c => c.code === code) ?? EUR;
}

/**
 * The player's chosen display currency. A preference, not save data: it lives
 * in its own key so an old save loads unchanged and two people can read the
 * same career in different money. Any storage failure is simply the euro.
 */
export function getCurrency(): Currency {
  try {
    return currencyByCode(localStorage.getItem(STORAGE_KEY));
  } catch {
    return EUR;
  }
}

export function setCurrency(code: string): void {
  try {
    if (code === 'EUR') localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, currencyByCode(code).code);
  } catch {
    /* storage blocked: the choice does not stick, which is a nuisance and
       not a bug worth throwing over */
  }
}

/**
 * Round a converted amount, keeping the same handful of significant figures
 * whatever the unit. Three decimal places on a hundred million is noise and
 * one on 1.67 is a two percent lie, so the number of places follows the size:
 * every band below rounds by at most half a percent of the value.
 */
function trim(v: number): string {
  const a = Math.abs(v);
  if (a >= 100) return v.toFixed(0);
  if (a >= 10) return v.toFixed(1);
  return v.toFixed(2).replace(/(\.\d*[1-9])0+$/, '$1').replace(/\.0+$/, '');
}

/** The units a money string can carry, smallest first. */
const LADDER = ['', 'k', 'M', 'B', 'T'];

/**
 * Move an amount up or down the ladder until it reads like a number a person
 * would say. A euro figure converted into yen can overflow its unit (800k
 * euros is well past a hundred million yen) and one converted into pounds can
 * underflow it (0.2M euros is better read as 171k), and both look ridiculous
 * left alone.
 */
function normalise(value: number, unit: string): { value: number; unit: string } {
  let i = Math.max(0, LADDER.indexOf(unit));
  let v = value;
  while (Math.abs(v) >= 1000 && i < LADDER.length - 1) { v /= 1000; i += 1; }
  while (Math.abs(v) < 1 && v !== 0 && i > 0) { v *= 1000; i -= 1; }
  return { value: v, unit: LADDER[i] };
}

/**
 * Rewrite every euro amount in a line into the given currency, and leave
 * everything else exactly as it was.
 *
 * The pattern is deliberately tight: a euro sign, then digits, then an
 * optional decimal part, then an optional k, M or B. That is the shape every
 * money string in this game takes, from "€800k" in the lifestyle shop to
 * "-€0.4M" in an event consequence. A sentence with no euro sign in it comes
 * back identical, which the harness checks on the whole event catalog rather
 * than trusting.
 */
const MONEY = /€(\d+(?:\.\d+)?)([kMB])?/g;

export function localizeMoney(text: string, cur: Currency = getCurrency()): string {
  if (cur.code === 'EUR' || !text || text.indexOf('€') === -1) return text;
  return text.replace(MONEY, (_full, num: string, unit: string | undefined) => {
    const n = normalise(Number(num) * cur.perEur, unit ?? '');
    return `${cur.symbol}${trim(n.value)}${n.unit}`;
  });
}

/**
 * The one line every screen showing converted money prints, so nobody ever
 * mistakes these figures for a live rate.
 */
export function rateNote(cur: Currency = getCurrency()): string | null {
  if (cur.code === 'EUR') return null;
  return `Converted from euros at ${RATES_AS_OF_LABEL} rates`;
}
