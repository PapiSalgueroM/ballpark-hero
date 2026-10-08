/**
 * Round 1104: one bank rule for the four US careers.
 *
 * THE BUG, in all four engines at once (the Round 426 lesson: one idea, four
 * copies). A card, a text or a rival beat could take the bank below zero, and
 * nothing stopped it: the board showed "-$0.4M". Then the repair that runs on
 * every load (Round 422, written for a different bug) saw a negative balance,
 * took it for the old upkeep defect and REBUILT the account from career
 * earnings. A player who went to -0.4M reloaded on $4.2M. The scout
 * reproduced it; the digest ledger (src/test/usCareerTruthDigest.test.ts)
 * counts how many seeded careers went below zero on the old code.
 *
 * THE RULE NOW, one copy, applied where each sport's binding is built:
 *   1. After any call the board makes that can move money (a season's
 *      progress, a card's answer, an inbox answer, a rival beat or choice), a
 *      balance below zero is COLLECTED the way the season's bills already are
 *      (coverShortfall in src/lib/careerMoney.ts, lifted out of the season
 *      tick this round and not copied): savings first, then holdings sold at
 *      today's price, worst first. Money parked in savings is not a shield.
 *   2. Only what is still owed after that is written off: the balance stops
 *      at zero. The card still happened; it took what was there.
 *   3. On load, a balance below zero is repaired ONCE by the right rule for
 *      the save. A career that has been dealt a summer since Round 1038 has
 *      been loaded (and so repaired) many times since Round 422, so a negative
 *      balance on it is a card's doing: collected, then zero, never a rebuild.
 *      An older save with none of the summer's marks keeps the Round 422
 *      rebuild the owner asked for ("none of my money is going into my
 *      account"), exactly as it was.
 *
 * IMPORTS. careerMoney.ts imports nothing, so reading coverShortfall from it
 * at runtime cannot make a cycle; everything else here is a type. That
 * matters because the four bindings call withBankFloor at module scope, and a
 * cycle there is a page crash.
 */
import { coverShortfall } from '@/lib/careerMoney';
import type { MoneyHost, MoneySport } from '@/lib/careerMoney';
import type { UsCareerCore, UsCareerEvent, UsCareerSeason, UsCareerSport } from '@/lib/usCareerSport';

/* The share of gross pay that reaches the bank, the same 0.45 each of the four
   engines banks a season at (their own TAKE_HOME). Only the old save rebuild
   below reads it. */
const TAKE_HOME = 0.45;

/** A balance is never below zero. */
export function floorBank(balance: number): number {
  return balance < 0 ? 0 : balance;
}

const isRecord = (v: unknown): boolean => !!v && typeof v === 'object' && !Array.isArray(v);

/** True when this career has been dealt a summer since Round 1038, which
 *  means it has been loaded, and repaired, since Round 422. The load repair
 *  runs before the summer's own repair, so the marks are read raw: each counts
 *  only when it has its type (a ledger object, a non empty salt string, a
 *  summer object). */
export function playedSinceSummer(c: { eventLastFired?: unknown; summerSalt?: unknown; summer?: unknown }): boolean {
  return isRecord(c.eventLastFired) || (typeof c.summerSalt === 'string' && c.summerSalt.length > 0) || isRecord(c.summer);
}

/** Collect a balance below zero from savings and holdings, then stop what is
 *  left at zero. Returns the lines that say what was taken (none when the
 *  account was healthy, or when there was nothing to take). Mutates c. */
export function settleBank<C extends MoneyHost>(c: C, money: MoneySport<C>): string[] {
  if (typeof c.netWorth !== 'number' || !(c.netWorth < 0)) return [];
  const lines = coverShortfall(c, money.yearOf(c), money, 0);
  c.netWorth = floorBank(c.netWorth ?? 0);
  return lines;
}

/** The ONE repair on load.
 *  Healthy (no balance yet, or zero and up): the same object back, untouched.
 *  Below zero on a career that has played a summer since Round 1038:
 *  collected from savings and holdings, then zero. Never a rebuild.
 *  Below zero on an older save: the Round 422 rebuild, exactly as it was
 *  (take home on career earnings, minus the price of what is still owned,
 *  floored at zero). */
export function repairBankOnLoad<T extends MoneyHost & { earnings: number; purchased?: string[] }>(
  c: T, costOf: (id: string) => number, money: MoneySport<T>,
): T {
  if ((c.netWorth ?? 0) >= 0) return c;
  if (playedSinceSummer(c as { eventLastFired?: unknown; summerSalt?: unknown; summer?: unknown })) {
    const next = JSON.parse(JSON.stringify(c)) as T;
    settleBank(next, money);
    return next;
  }
  const spent = (c.purchased ?? []).reduce((sum, id) => sum + costOf(id), 0);
  const rebuilt = Math.max(0, Math.round((c.earnings * TAKE_HOME - spent) * 10) / 10);
  return { ...c, netWorth: rebuilt };
}

const withLines = (line: string, cover: string[]): string => (cover.length ? `${line} ${cover.join(' ')}` : line);

/** Wraps a sport binding so no call the board makes can leave the bank below
 *  zero. Every member it does not name is passed straight through. Cards come
 *  back as NEW objects (the engine's own event is never written into); a card
 *  is found again by its id, so a fresh object is safe. */
export function withBankFloor<C extends UsCareerCore & MoneyHost, L extends UsCareerSeason>(sport: UsCareerSport<C, L>): UsCareerSport<C, L> {
  const money = sport.money;
  const card = (e: UsCareerEvent<C>): UsCareerEvent<C> => ({
    ...e,
    options: e.options.map(o => ({
      ...o,
      apply: (c: C, rng: () => number) => {
        const line = o.apply(c, rng);
        return withLines(line, settleBank(c, money));
      },
    })),
  });
  return {
    ...sport,
    progress: (c, rng) => {
      const notes = sport.progress(c, rng);
      for (const line of settleBank(c, money)) notes.push(line);
      return notes;
    },
    drawEvent: (c, rng) => {
      const e = sport.drawEvent(c, rng);
      return e ? card(e) : e;
    },
    eventDeck: (c, rng) => sport.eventDeck(c, rng).map(card),
    answerInbox: (c, msgId, choiceIdx) => {
      const line = sport.answerInbox(c, msgId, choiceIdx);
      const cover = settleBank(c, money);
      return line === null ? line : withLines(line, cover);
    },
    dismissRivalryEvent: c => {
      const res = sport.dismissRivalryEvent(c);
      const cover = settleBank(res.state, money);
      return cover.length ? { ...res, lines: [...res.lines, ...cover] } : res;
    },
    resolveRivalryChoice: (c, choiceIdx, rng) => {
      const res = sport.resolveRivalryChoice(c, choiceIdx, rng);
      if (!res) return res;
      const cover = settleBank(res.state, money);
      return cover.length ? { ...res, line: withLines(res.line, cover) } : res;
    },
  };
}
