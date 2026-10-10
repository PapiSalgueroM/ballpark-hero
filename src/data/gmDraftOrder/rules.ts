/* Round 1222: how a league orders its draft, as DATA. One rule set a league
   and a span of drafts. src/lib/gmDraftOrder.ts reads it and holds no league
   constant of its own.

   WHAT IS HERE AND WHAT IS NOT. The lottery TABLE (how many clubs, the
   chances, how many picks are drawn) stays where it already is, on the pick
   rules in src/lib/gmPicks.ts, and is never typed a second time: a rule set
   names the table it was read against and the order refuses to draw with any
   other. This file carries only what the pick rules do not: who picks where
   outside the drawn picks, what a later round follows, what happens to level
   records, and the two spans.

   TWO SPANS, AND THEY ARE DIFFERENT KINDS OF STATEMENT. `real` is the
   league's own drafts the rule was used for, a sourced fact. `plays` is the
   drafts THIS GAME runs it for, which is the game's own choice and is said
   as the game's wherever a card shows it.

   EVERY FACT WAS READ TWICE, on two publishers that are not each other and
   neither a wiki, by the round's builder on the day in `on`. The addresses
   and the words read are in scripts/data/gmDraftOrderSources.json, joined to
   the facts below by key (scripts/simGmDraftOrder.mjs section 1 holds the
   join). There is no address in this file on purpose: it would ship in a
   page chunk and one feed host in it turns simLiveScores red.

   A FACT THAT COULD NOT BE READ TWICE IS MARKED `thin`, and a lottery whose
   needs include a thin or missing fact is never drawn: the order falls back
   to plain reverse standings and says so.

   ONLY THE NBA IS HERE. Each other sport's rule set is written by its own
   bind, with fresh reads, as the critic of this round ruled. */

export interface GmDraftOrderFact {
  key: string;
  /** The fact, in plain words. The ledger carries the same sentence. */
  says: string;
  /** The day both reads were made. */
  on: string;
  /** Could not be read on two independent pages. A thin fact is never played. */
  thin?: true;
}

export interface GmDraftOrderRules {
  /** Saved with every order drawn under it. */
  id: string;
  /** A plain id, so a league that is not one of the four front offices can bind. */
  sport: string;
  /** The league's own drafts this rule was used for. */
  real: { from: number; to: number | null };
  /** The game's drafts it runs. */
  plays: { from: number; to: number | null };
  /** Null for a league with no lottery. The field is every club out of the postseason. */
  lottery: null | {
    /** The name the table carries on the pick rules (GmLotteryRules.table). */
    table: string;
    /** Whole combinations in the league's draw, so level clubs split whole ones. Null splits the plain mean. */
    combinations: number | null;
    /** The facts a lottery cannot run without. */
    needs: string[];
  };
  /** Round one after the lottery field: by record, or by the league's class and then record. */
  restOfFirst: 'record' | 'class';
  /** A later round: every club by record, or round one as it stood before the lottery. */
  laterRounds: 'record-all' | 'first-before-lottery';
  level: {
    /** Level lottery clubs share the chances of the seeds they span, or keep the table's. */
    odds: 'split' | 'keep';
    /** Level clubs in a later round: the reverse of their round one order, or the same. */
    later: 'reverse-of-first' | 'as-first';
  };
  /** The league's rules in plain words, for the "?". No number that the table carries. */
  leagueSays: string[];
  /** What is the game's own, for the "?". */
  gameSays: string[];
  /** What is left out, in words a card can show. */
  partial: string[];
  facts: GmDraftOrderFact[];
}

const READ = '2026-10-10';

/* The NBA's lottery from its 2019 draft to its 2026 draft. Each fact was read
   on the league's own pages and on one independent publisher; which page
   holds which fact, and the words read there, are in the ledger. */
export const NBA_DRAFT_ORDER_2019: GmDraftOrderRules = {
  id: 'nba-2019',
  sport: 'nba',
  real: { from: 2019, to: 2026 },
  plays: { from: 2027, to: null },
  lottery: { table: 'the 2026 draft', combinations: 1000, needs: ['field', 'draws', 'table', 'restOfLottery'] },
  restOfFirst: 'record',
  laterRounds: 'record-all',
  level: { odds: 'split', later: 'reverse-of-first' },
  leagueSays: [
    'Every club that misses the playoffs is in the lottery, and only those clubs.',
    'A lottery club that is not drawn picks after the drawn picks, worst record first.',
    'Every playoff club picks after every lottery club in round one, worst record first, whatever it did in the playoffs.',
    'Round two is every club by record, worst first. The lottery does not move it.',
    'Level records are split by a random drawing. Level lottery clubs share their chances, and the winner of the drawing gets the odd combination.',
    'Clubs level on record pick in round two in the reverse of their round one order.',
  ],
  gameSays: [
    'The league switched to a new lottery from its 2027 draft. This game still runs this one for every draft it plays.',
    'Every prospect, every record and every draw here is this game\'s own.',
    'When three or more lottery clubs are level, the leftover combinations go one each in the order of the drawing. That detail is this game\'s.',
  ],
  partial: [
    'The league\'s new lottery (16 clubs, from its 2027 draft) is not modelled.',
  ],
  facts: [
    { key: 'field', says: 'The 14 clubs that miss the playoffs are in the lottery.', on: READ },
    { key: 'draws', says: 'Drawings decide the first four picks.', on: READ },
    { key: 'table', says: 'Of 1,000 combinations the clubs hold 140, 140, 140, 125, 105, 90, 75, 60, 45, 30, 20, 15, 10 and 5, worst record first.', on: READ },
    { key: 'restOfLottery', says: 'Lottery clubs that are not drawn pick 5th to 14th in reverse order of record, so the worst record picks no lower than 5th.', on: READ },
    { key: 'lotteryFirst', says: 'All 14 lottery clubs pick ahead of the 16 playoff clubs in round one, even where a lottery club has the better record.', on: READ },
    { key: 'restOfFirst', says: 'Picks 15 to 30 go to the playoff clubs in reverse order of regular season record.', on: READ },
    { key: 'laterRounds', says: 'Round two is all 30 clubs in reverse order of regular season record, and the lottery does not move it.', on: READ },
    { key: 'rounds', says: 'The draft is two rounds, one pick a club in each.', on: READ },
    { key: 'tieDraw', says: 'Clubs with identical records are put in order by random drawings.', on: READ },
    { key: 'levelOdds', says: 'Level lottery clubs split the combinations of the seeds they span, and the winner of the drawing takes the odd one.', on: READ },
    { key: 'levelFirst', says: 'If no club of a level lottery group is drawn, the winner of the drawing picks first of the group in round one.', on: READ },
    { key: 'levelLater', says: 'Clubs level on record pick in round two in the inverse of their round one order; for lottery clubs that is their order after the lottery.', on: READ },
    { key: 'levelAcross', says: 'A lottery club and a playoff club level on record: the lottery club is ahead in round one, so the playoff club is ahead in round two.', on: READ },
    { key: 'realSpan', says: 'This lottery ran from the 2019 draft to the 2026 draft; a new one applies from the 2027 draft.', on: READ },
  ],
};

/** One or more spans a sport, in the order they play. */
export const GM_DRAFT_ORDER_RULES: Record<string, GmDraftOrderRules[]> = {
  nba: [NBA_DRAFT_ORDER_2019],
};
