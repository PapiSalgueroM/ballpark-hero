/* ─── Round 134: money you can get wrong. Round 469: the rules moved out. ───

   What money was before Round 134. Net worth went up every season by wages
   plus sponsorship minus a lifestyle bill, and the only thing it did was sit
   on the screen and unlock items in a shop. Investing was a menu: you paid a
   fixed price, waited a year, and a hidden coin flip either paid you or did
   not. There was no price, no market, nothing to time, nothing to watch, and
   the only decision was whether to press the button at all.

   The owner's note: "if u invest in stocks but u actually have to choose
   correctly when to buy or sell and such. Or crypto. Or other stuff like that
   or just leave it in an index fund or your savings to get at least a little
   apy."

   So Round 134 built a market: five things you can put money into, each with
   a price that moves on its own every season whether you are watching or
   not, plus a savings account that pays a small safe rate, a statement, the
   card school on the team bus and the quiz he plays on his own phone.

   ROUND 469. Every rule in that market now lives in careerMoney.ts, where the
   NFL career runs on the same one. This file is what makes it soccer: the
   euro, the seed hashed from the player's name the way it always was, the
   year read off the season list, the lifestyle bill, the karma hit when the
   card losses get noticed at home, and the words. Nothing below is a rule,
   and scripts/simCareerParity.mjs fails if one ever grows back here.

   Every export name the engine, the phone screens, soccerArcade and the money
   harnesses import is kept, with the same signature, so a caller cannot tell
   the rules moved. */

import type { CareerState } from "./soccerCareerEngine";
import {
  ensureMoney as ensureMoneyFor,
  moneyWealth as moneyWealthFor,
  moneySeasonTick as moneySeasonTickFor,
  moneyAct as moneyActFor,
  cardCap as cardCapFor,
  cardStatus as cardStatusFor,
  bankSummary as bankSummaryFor,
  fmtMoney, seedFromName,
} from "./careerMoney";
import type { MoneySport, MoneyState, MoneyAction, MoneyTick, MoneyOutcome, BankSummary } from "./careerMoney";

/* The constants, the asset list, the pure readers of a MoneyState and every
   type, straight through. */
export {
  MAX_HISTORY, MAX_LEDGER, CASH_FLOOR, MIN_TRADE, TRADE_FEE, SAVINGS_RATE,
  ASSETS, ASSET_BY_ID, PAR,
  holdingValue, investedValue, anchorOf, priceRead, lastMove, unrealised, spendable,
  CARD_MAX, CARD_FRACTION, CARD_MIN_WORTH, CARD_SHUT, CARD_WIN, CARD_PAYS, ARCADE_PRIZE,
} from "./careerMoney";
export type {
  AssetKind, AssetDef, LedgerEntry, MoneyState, MoneyTick, MoneyAction, MoneyOutcome, BankSummary,
} from "./careerMoney";

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** What makes the money app the soccer one. Data, not rules. */
export const SOCCER_MONEY: MoneySport<CareerState> = {
  currency: "€",
  seedOf: s => seedFromName(s.playerName, s.seasons?.length ?? 0),
  yearOf: s => (s.seasons.length > 0 ? s.seasons[s.seasons.length - 1].year : 2020),
  billOf: s => s.lifestyleCostPerYear,
  shame: s => { s.karma = clamp((s.karma ?? 50) - 2, 0, 100); },
  words: {
    cards: {
      ledger: "Cards on the bus", crew: "the lads", crewCap: "The lads",
      where: "on the bus", thatPlace: "on that bus", next: "Next away trip.",
    },
    arcade: { ledger: "Won the phone quiz", name: "the ball quiz" },
  },
};

/**
 * A valid MoneyState for any save, old or new, WITHOUT touching the career
 * passed in. The phone panel calls this to render a save that has never
 * ticked; the engine calls it before every write.
 */
export function ensureMoney(s: CareerState): MoneyState {
  return ensureMoneyFor(s, SOCCER_MONEY);
}

/** Everything invested plus everything in savings, in millions. */
export function moneyWealth(s: CareerState): number {
  return moneyWealthFor(s, SOCCER_MONEY);
}

/**
 * One season of market. Called once per season from the engine, after the
 * wages and the lifestyle bill have landed, so a shortfall can be covered out
 * of savings before anything else sees a negative balance.
 */
export function moneySeasonTick(s: CareerState, year: number): MoneyTick {
  return moneySeasonTickFor(s, year, SOCCER_MONEY);
}

export function fmtM(v: number): string {
  return fmtMoney(v, SOCCER_MONEY.currency);
}

/**
 * Every money tap that is not a shop purchase. Mutates the career copy the
 * engine hands over, exactly like phoneReply does, and refuses rather than
 * throws when the numbers do not work.
 */
export function moneyAct(s: CareerState, action: MoneyAction): MoneyOutcome {
  return moneyActFor(s, action, SOCCER_MONEY);
}

/** The biggest stake this player is allowed to put in right now. */
export function cardCap(s: CareerState): number {
  return cardCapFor(s, SOCCER_MONEY);
}

/** Whether the card school is open to this player this season, and why not. */
export function cardStatus(s: CareerState): { open: boolean; why: string } {
  return cardStatusFor(s, SOCCER_MONEY);
}

export function bankSummary(s: CareerState): BankSummary {
  return bankSummaryFor(s, SOCCER_MONEY);
}
