/* ─── Round 469: the NFL career's money app ─────────────────────────────────

   His words (docs/TWEAKS-2026-08-28.md): "The gap between the soccer career
   and the NFL career is visible to a casual eye; close it." The money half of
   that gap was the whole of Round 134: a savings account, a market with five
   prices that move every season, a statement, the card school. The NFL bank
   was one number and a shop.

   The rules live in careerMoney.ts and this file is what makes them the NFL:
   dollars, the seed hashed from the player's name, the year read off the
   season list (or the draft year before a season has been played), the upkeep
   bill the shop already charges, the fanbase hit when the card losses get
   noticed at home, and locker room words instead of team bus ones. Nothing
   below is a rule. scripts/simCareerParity.mjs fails if one grows here.

   The tick runs from progress() in nflMyCareer.ts, right after the year's pay
   is banked (Round 422), which is the same place in the loop the soccer engine
   runs it: after the wages and the bill have landed, so a shortfall is covered
   out of savings before anything else sees a negative balance. */

import type { CareerState } from "./nflMyCareer";
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

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** What makes the money app the NFL one. Data, not rules. */
export const NFL_MONEY: MoneySport<CareerState> = {
  currency: "$",
  seedOf: c => seedFromName(c.name, c.seasons?.length ?? 0),
  /* Before the first season is played the market is dated from the draft
     year, so a rookie's first deposit is not stamped with a year that never
     happened. After that the season list is the clock, as it is for soccer. */
  yearOf: c => (c.seasons.length > 0 ? c.seasons[c.seasons.length - 1].year : c.year),
  /* The NFL take home rate already nets out living, so the only bill the
     buffer rule sees is the upkeep the shop charges every year. */
  billOf: c => c.yearlyCosts ?? 0,
  shame: c => { c.fanbase = clamp(c.fanbase - 2, 0, 100); },
  words: {
    cards: {
      ledger: "Cards in the locker room", crew: "the guys", crewCap: "The guys",
      where: "in the locker room", thatPlace: "in that card game", next: "Next road trip.",
    },
    arcade: { ledger: "Won the phone quiz", name: "the ball quiz" },
  },
};

export function ensureNflMoney(c: CareerState): MoneyState {
  return ensureMoneyFor(c, NFL_MONEY);
}

/** Savings plus holdings, in millions. Cash is c.netWorth and is not in here. */
export function nflMoneyWealth(c: CareerState): number {
  return moneyWealthFor(c, NFL_MONEY);
}

/** One season of market, dated by the season just played. */
export function nflMoneySeasonTick(c: CareerState): MoneyTick {
  return moneySeasonTickFor(c, NFL_MONEY.yearOf(c), NFL_MONEY);
}

export function fmtUsd(v: number): string {
  return fmtMoney(v, NFL_MONEY.currency);
}

export function nflMoneyAct(c: CareerState, action: MoneyAction): MoneyOutcome {
  return moneyActFor(c, action, NFL_MONEY);
}

export function nflCardCap(c: CareerState): number {
  return cardCapFor(c, NFL_MONEY);
}

export function nflCardStatus(c: CareerState): { open: boolean; why: string } {
  return cardStatusFor(c, NFL_MONEY);
}

export function nflBankSummary(c: CareerState): BankSummary {
  return bankSummaryFor(c, NFL_MONEY);
}
