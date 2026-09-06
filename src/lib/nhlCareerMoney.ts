/* ─── Round 470: the NHL career's money app ──────────────────────────────────

   Same lift as Round 469's NFL one. The rules are careerMoney.ts (the savings
   account, the market, the statement, the card school); this file is what
   makes them hockey: dollars, the seed hashed from the player's name, the year
   read off the season list (the draft year before a season has been played),
   the upkeep the shop already charges, the fanbase hit when the card losses
   get noticed at home, and the words.

   Hockey says the boys, and the card game runs at the back of the team plane
   on the long western swings, so that is what the ledger and the lines say.

   Nothing below is a rule. scripts/simCareerParity.mjs fails if one grows
   here.

   The tick runs from nhlProgress() right after the year's pay is banked
   (Round 422), the same place in the loop every other career runs it. */

import type { NhlCareerState } from "./nhlMyCareer";
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

/** What makes the money app the hockey one. Data, not rules. */
export const NHL_MONEY: MoneySport<NhlCareerState> = {
  currency: "$",
  seedOf: c => seedFromName(c.name, c.seasons?.length ?? 0),
  yearOf: c => (c.seasons.length > 0 ? c.seasons[c.seasons.length - 1].year : c.year),
  billOf: c => c.yearlyCosts ?? 0,
  shame: c => { c.fanbase = clamp(c.fanbase - 2, 0, 100); },
  words: {
    cards: {
      ledger: "Cards at the back of the plane", crew: "the boys", crewCap: "The boys",
      where: "at the back of the plane", thatPlace: "in that card game", next: "Next road swing.",
    },
    arcade: { ledger: "Won the phone quiz", name: "the ball quiz" },
  },
};

export function ensureNhlMoney(c: NhlCareerState): MoneyState {
  return ensureMoneyFor(c, NHL_MONEY);
}

/** Savings plus holdings, in millions. Cash is c.netWorth and is not in here. */
export function nhlMoneyWealth(c: NhlCareerState): number {
  return moneyWealthFor(c, NHL_MONEY);
}

/** One season of market, dated by the season just played. */
export function nhlMoneySeasonTick(c: NhlCareerState): MoneyTick {
  return moneySeasonTickFor(c, NHL_MONEY.yearOf(c), NHL_MONEY);
}

export function nhlMoneyAct(c: NhlCareerState, action: MoneyAction): MoneyOutcome {
  return moneyActFor(c, action, NHL_MONEY);
}

export function nhlCardCap(c: NhlCareerState): number {
  return cardCapFor(c, NHL_MONEY);
}

export function nhlCardStatus(c: NhlCareerState): { open: boolean; why: string } {
  return cardStatusFor(c, NHL_MONEY);
}

export function nhlBankSummary(c: NhlCareerState): BankSummary {
  return bankSummaryFor(c, NHL_MONEY);
}

export function fmtNhlMoney(v: number): string {
  return fmtMoney(v, NHL_MONEY.currency);
}
