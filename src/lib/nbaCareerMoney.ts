/* ─── Round 470: the NBA career's money app ──────────────────────────────────

   Round 469 did this for the NFL and left the map. His words
   (docs/TWEAKS-2026-08-28.md): "Bring the whole Soccer Career and Club Manager
   depth to NFL, NBA, MLB, NHL and the GM games, each with its own sport's
   texture." The money half of that is careerMoney.ts: a savings account that
   pays every season, five prices that move whether you look or not, a
   statement and the card school. The NBA bank was one number and a shop.

   This file is what makes those rules the NBA: dollars, the seed hashed from
   the player's name, the year read off the season list (the draft year before
   a season has been played), the upkeep the shop already charges, the fanbase
   hit when the card losses get noticed at home, and the words. Basketball
   plays cards on the team plane, not on a bus and not in a locker room, so
   that is what the ledger and the lines say.

   Nothing below is a rule. scripts/simCareerParity.mjs fails if one grows
   here, in this file or in any of the other four careers.

   The tick runs from nbaProgress() right after the year's pay is banked
   (Round 422), which is the same place in the loop the soccer and NFL engines
   run it: after the wages and the bill have landed, so a shortfall is covered
   out of savings before anything else sees a negative balance. */

import type { NbaCareerState } from "./nbaMyCareer";
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

/** What makes the money app the NBA one. Data, not rules. */
export const NBA_MONEY: MoneySport<NbaCareerState> = {
  currency: "$",
  seedOf: c => seedFromName(c.name, c.seasons?.length ?? 0),
  yearOf: c => (c.seasons.length > 0 ? c.seasons[c.seasons.length - 1].year : c.year),
  /* The take home rate already nets out living, so the only bill the buffer
     rule sees is the upkeep the shop charges every year. */
  billOf: c => c.yearlyCosts ?? 0,
  shame: c => { c.fanbase = clamp(c.fanbase - 2, 0, 100); },
  words: {
    cards: {
      ledger: "Cards on the team plane", crew: "the guys", crewCap: "The guys",
      where: "on the team plane", thatPlace: "in that card game", next: "Next flight out.",
    },
    arcade: { ledger: "Won the phone quiz", name: "the ball quiz" },
  },
};

export function ensureNbaMoney(c: NbaCareerState): MoneyState {
  return ensureMoneyFor(c, NBA_MONEY);
}

/** Savings plus holdings, in millions. Cash is c.netWorth and is not in here. */
export function nbaMoneyWealth(c: NbaCareerState): number {
  return moneyWealthFor(c, NBA_MONEY);
}

/** One season of market, dated by the season just played. */
export function nbaMoneySeasonTick(c: NbaCareerState): MoneyTick {
  return moneySeasonTickFor(c, NBA_MONEY.yearOf(c), NBA_MONEY);
}

export function nbaMoneyAct(c: NbaCareerState, action: MoneyAction): MoneyOutcome {
  return moneyActFor(c, action, NBA_MONEY);
}

export function nbaCardCap(c: NbaCareerState): number {
  return cardCapFor(c, NBA_MONEY);
}

export function nbaCardStatus(c: NbaCareerState): { open: boolean; why: string } {
  return cardStatusFor(c, NBA_MONEY);
}

export function nbaBankSummary(c: NbaCareerState): BankSummary {
  return bankSummaryFor(c, NBA_MONEY);
}

export function fmtNbaMoney(v: number): string {
  return fmtMoney(v, NBA_MONEY.currency);
}
