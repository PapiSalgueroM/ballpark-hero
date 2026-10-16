/* Round 1334: Soccer Career's starter pack for the shared deck (src/lib/gmInbox.ts),
   dealt by the soccer binding in src/lib/soccerDeck.ts: at most one card a
   summer, first in the batch, from its own keyed stream, never replacing a
   card of the old catalog. Ids 700 to 999 are this deck's.

   The facts are the save's own, read by soccerDeckFacts at the deal; the
   specs below are what the event deck kit draws honest values from. A card's
   position group is a range on `pos` (0 keeper, 1 defender, 2 midfielder,
   3 forward: careerDrills.ts drillForPosition), so the kit's float draws reach
   every card.

   EMPTY in this step: the binding is built and proven before any card is
   written. No `pressure` until there are cards (gmPackProblems refuses a
   ceiling on a meter the pack never moves). */
import type { SoccerDeckPack } from '@/lib/soccerDeck';

export const STARTER: SoccerDeckPack = {
  seat: 'soccer',
  label: 'Soccer Career',
  calendar: [{ id: 'summer', label: 'Summer', emoji: '☀️' }],
  span: { summer: 1 },
  facts: {
    pos: { kind: 'num', min: 0, max: 3.99, per: 'season' },
    age: { kind: 'num', min: 17, max: 39, per: 'season' },
    tier: { kind: 'num', min: 1, max: 4.99, per: 'season' },
    apps: { kind: 'num', min: 0, max: 60, per: 'season' },
    goals: { kind: 'num', min: 0, max: 40, per: 'season' },
    cleanSheets: { kind: 'num', min: 0, max: 25, per: 'season' },
    yellows: { kind: 'num', min: 0, max: 15, per: 'season' },
    rating: { kind: 'num', min: 5.5, max: 8.5, per: 'season' },
    injuryWeeks: { kind: 'num', min: 0, max: 40, per: 'season' },
    derbies: { kind: 'num', min: 0, max: 3, per: 'season' },
    room: { kind: 'num', min: 0, max: 10, per: 'season' },
    morale: { kind: 'num', min: 0, max: 100, per: 'season' },
    seniorSeasons: { kind: 'num', min: 1, max: 20, per: 'season' },
    capped: { kind: 'bool', p: 0.3, per: 'season' },
    captain: { kind: 'bool', p: 0.15, per: 'season' },
    contractYear: { kind: 'bool', p: 0.3, per: 'season' },
    sameClub: { kind: 'bool', p: 0.85, per: 'season' },
  },
  targets: {},
  meters: { trust: 'Karma', fans: 'Popularity', money: 'Cash', morale: 'Morale' },
  money: { prefix: '€', suffix: 'M' },
  perWeek: 1,
  cooldown: 3,
  chance: 1,
  clock: 'season',
  store: 'compact',
  events: [],
  titles: {},
  kinds: {},
};
