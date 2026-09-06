/* ─── Round 470: the MLB career's money app ──────────────────────────────────

   Same lift as Round 469's NFL one and the NBA one beside it. The rules are
   careerMoney.ts (the savings account, the market, the statement, the card
   school); this file is what makes them baseball: dollars, the seed hashed
   from the player's name, the year read off the season list (the draft year
   before a season has been played), the upkeep the shop already charges, the
   fanbase hit when the card losses get noticed at home, and the words.

   Baseball says clubhouse, never locker room, and the card game runs there
   most of the afternoon before a night game, so that is what the ledger and
   the lines say.

   Nothing below is a rule. scripts/simCareerParity.mjs fails if one grows
   here.

   The tick runs from mlbProgress() right after the year's pay is banked
   (Round 422), the same place in the loop every other career runs it. */

import type { MlbCareerState } from "./mlbMyCareer";
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

/** What makes the money app the baseball one. Data, not rules. */
export const MLB_MONEY: MoneySport<MlbCareerState> = {
  currency: "$",
  seedOf: c => seedFromName(c.name, c.seasons?.length ?? 0),
  yearOf: c => (c.seasons.length > 0 ? c.seasons[c.seasons.length - 1].year : c.year),
  billOf: c => c.yearlyCosts ?? 0,
  shame: c => { c.fanbase = clamp(c.fanbase - 2, 0, 100); },
  words: {
    cards: {
      ledger: "Cards in the clubhouse", crew: "the guys", crewCap: "The guys",
      where: "in the clubhouse", thatPlace: "in that clubhouse card game", next: "Next homestand.",
    },
    arcade: { ledger: "Won the phone quiz", name: "the ball quiz" },
  },
};

export function ensureMlbMoney(c: MlbCareerState): MoneyState {
  return ensureMoneyFor(c, MLB_MONEY);
}

/** Savings plus holdings, in millions. Cash is c.netWorth and is not in here. */
export function mlbMoneyWealth(c: MlbCareerState): number {
  return moneyWealthFor(c, MLB_MONEY);
}

/** One season of market, dated by the season just played. */
export function mlbMoneySeasonTick(c: MlbCareerState): MoneyTick {
  return moneySeasonTickFor(c, MLB_MONEY.yearOf(c), MLB_MONEY);
}

export function mlbMoneyAct(c: MlbCareerState, action: MoneyAction): MoneyOutcome {
  return moneyActFor(c, action, MLB_MONEY);
}

export function mlbCardCap(c: MlbCareerState): number {
  return cardCapFor(c, MLB_MONEY);
}

export function mlbCardStatus(c: MlbCareerState): { open: boolean; why: string } {
  return cardStatusFor(c, MLB_MONEY);
}

export function mlbBankSummary(c: MlbCareerState): BankSummary {
  return bankSummaryFor(c, MLB_MONEY);
}

export function fmtMlbMoney(v: number): string {
  return fmtMoney(v, MLB_MONEY.currency);
}
