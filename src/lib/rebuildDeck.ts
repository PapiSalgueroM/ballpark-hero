import { Player } from '@/types/game';
import { FORMATIONS, playerRating, type Formation, type FormationSlot } from '@/lib/squadDeal';
import type { RebuildClub, ClubTier } from '@/lib/fetchRebuild';

/**
 * Rebuild Challenge expansion (owner 2026-08-05, the rebuild-a-club format):
 *  - Coach step: keep the man you have or pay for one of three candidates.
 *  - Board objectives: two "management cards" dealt at the start. Miss one
 *    and the board force-sells a player at the end. Brutal, like the videos.
 *  - Financial events: money swings mid-rebuild, good and bad.
 *  - Two AI rival managers rebuild comparable clubs alongside you and post
 *    their final XI ratings, so finishing above target isn't the only prize.
 * Everything is seeded off the club name so a given club plays out the same
 * within a run but differently across clubs.
 */

export function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h >>> 0);
}

function pick<T>(arr: T[], seed: number, salt: number): T {
  return arr[Math.abs((seed ^ (salt * 2654435761)) >>> 0) % arr.length];
}

/* ---------------- Coaches ---------------- */

export interface CoachOption {
  id: string;
  name: string;
  emoji: string;
  desc: string;
  /** Transfer money it costs to hire them. */
  cost: number;
  /** Added straight onto the final XI rating. */
  bonus: number;
}

const ELITE_COACHES: Omit<CoachOption, 'cost' | 'bonus'>[] = [
  { id: 'pep', name: 'Pep Guardiola', emoji: '🧠', desc: 'Turns training cones into title parades' },
  { id: 'carlo', name: 'Carlo Ancelotti', emoji: '🚬', desc: 'Raises an eyebrow, wins a final' },
  { id: 'klopp', name: 'Jurgen Klopp', emoji: '🔥', desc: 'Heavy metal, heavier trophy cabinet' },
  { id: 'diniz', name: 'The Innovator', emoji: '🧪', desc: 'Football from ten years in the future' },
];
const SOLID_COACHES: Omit<CoachOption, 'cost' | 'bonus'>[] = [
  { id: 'simeone', name: 'Diego Simeone', emoji: '🧱', desc: 'Suffering, but winning suffering' },
  { id: 'emery', name: 'Unai Emery', emoji: '📋', desc: 'Has a dossier on your dossier' },
  { id: 'gasperini', name: 'The Overachiever', emoji: '⚙️', desc: 'Makes mid squads punch up' },
  { id: 'deZerbi', name: 'Roberto De Zerbi', emoji: '🎨', desc: 'Builds out from the back, beautifully' },
];
const BUDGET_COACHES: Omit<CoachOption, 'cost' | 'bonus'>[] = [
  { id: 'firstTimer', name: 'The First Timer', emoji: '💻', desc: 'Big ideas, no scars yet' },
  { id: 'clubLegend', name: 'The Club Legend', emoji: '🧣', desc: 'Fans love him. Tactics board fears him' },
  { id: 'journeyman', name: 'The Fixer', emoji: '🔧', desc: 'Kept four clubs up. Barely' },
];

export function coachOptionsFor(tier: ClubTier, seed: number): CoachOption[] {
  const scale = tier === 'elite' ? 1.4 : tier === 'strong' ? 1.15 : tier === 'mid' ? 1 : 0.85;
  const elite = pick(ELITE_COACHES, seed, 11);
  const solid = pick(SOLID_COACHES, seed, 23);
  const budget = pick(BUDGET_COACHES, seed, 37);
  return [
    { ...elite, cost: Math.round(28 * scale), bonus: 3 },
    { ...solid, cost: Math.round(12 * scale), bonus: 2 },
    { ...budget, cost: Math.round(4 * scale), bonus: 1 },
  ];
}

export const KEEP_COACH: CoachOption = {
  id: 'caretaker', /* the id is a save value, renaming it orphans old runs */
  name: 'Keep the man you have',
  emoji: '🪑',
  desc: 'Costs nothing, changes nothing',
  cost: 0,
  bonus: 0,
};

/* ---------------- Tier budgets (Round 51 rule: budgets scale with club size) ---------------- */

export const TIER_BUDGET: Record<ClubTier, number> = {
  elite: 200,
  strong: 140,
  mid: 100,
  modest: 65,
};

export function budgetFor(tier: ClubTier): number {
  return TIER_BUDGET[tier];
}

/* ---------------- Fortune cards (Round 51 rule: flip one of ten) ---------------- */

export interface FortuneCard {
  id: string;
  emoji: string;
  title: string;
  text: string;
  delta: number;
}

export const FORTUNE_DECK: FortuneCard[] = [
  { id: 'takeover', emoji: '🛢️', title: 'The Takeover', text: 'A consortium buys the club and wants a splash. The war chest explodes.', delta: 60 },
  { id: 'uclMoney', emoji: '⭐', title: 'European Windfall', text: 'Last season\'s European run finally pays out. Accounting is smiling.', delta: 45 },
  { id: 'megaShirt', emoji: '👕', title: 'Shirt Deal of the Decade', text: 'A record kit sponsorship lands on the desk, signed.', delta: 30 },
  { id: 'sellOn', emoji: '🎓', title: 'Academy Kid Sells Big', text: 'An old academy graduate moves for a fortune and the sell-on clause hits.', delta: 20 },
  { id: 'docuseries', emoji: '🎥', title: 'Documentary Money', text: 'A streaming crew pays to follow your rebuild. Cameras everywhere, cash in the bank.', delta: 12 },
  { id: 'cupRun', emoji: '🏆', title: 'Cup Run Gate Receipts', text: 'Two sold-out cup nights nobody budgeted for.', delta: 8 },
  { id: 'quiet', emoji: '🪑', title: 'A Quiet Summer', text: 'No drama, no windfall. The books stay exactly as they are.', delta: 0 },
  { id: 'ffp', emoji: '⚖️', title: 'FFP Warning Letter', text: 'The regulators flag last year\'s spending. Lawyers get paid first.', delta: -15 },
  { id: 'taxCase', emoji: '🧾', title: 'Tax Case Settlement', text: 'An old ownership mess finally lands on your desk. It is expensive.', delta: -25 },
  { id: 'clause', emoji: '📜', title: 'The Hidden Clause', text: 'A cursed clause in an ancient transfer contract triggers. Everyone is furious.', delta: -35 },
];

/** The ten cards in a seeded order, so a run cannot re-flip for a better card. */
export function fortuneDeckFor(seed: number): FortuneCard[] {
  const deck = [...FORTUNE_DECK];
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.abs((seed ^ (i * 2654435761)) >>> 0) % (i + 1);
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

/* ---------------- Board objectives (management cards) ---------------- */

export interface ObjectiveState {
  signed: Player[];
  sold: Player[];
  budget: number;
}

export interface BoardObjective {
  id: string;
  emoji: string;
  text: string;
  penaltyText: string;
  /** Ceiling this card puts on any single signing, in millions. Declared so
   *  the deal can see that it cannot sit next to a card demanding more. */
  capValue?: number;
  /** Floor one signing has to reach for this card, in millions. */
  needValue?: number;
  check: (s: ObjectiveState) => boolean;
}

const OBJECTIVE_DECK: BoardObjective[] = [
  {
    id: 'youth', emoji: '🌱',
    text: 'Sign at least 2 players aged 23 or under',
    penaltyText: 'The board wanted youth. They sold your best signing to fund the academy.',
    check: (s) => s.signed.filter(p => (p.age ?? 99) <= 23).length >= 2,
  },
  {
    id: 'clearout', emoji: '🧹',
    text: 'Sell at least 2 of the current squad',
    penaltyText: 'No clearout, no trust. The board sold a starter behind your back.',
    check: (s) => s.sold.length >= 2,
  },
  {
    id: 'noGalacticos', emoji: '🧾',
    text: 'No single signing over €60M',
    penaltyText: 'You blew the wage structure. The board flipped your priciest buy.',
    capValue: 60,
    check: (s) => s.signed.every(p => p.marketValue <= 60),
  },
  {
    id: 'marquee', emoji: '⭐',
    text: 'Sign at least one player worth €70M or more',
    penaltyText: 'No marquee name, no shirt sales. The board cashed in a star to cover it.',
    needValue: 70,
    check: (s) => s.signed.some(p => p.marketValue >= 70),
  },
  {
    id: 'inTheBlack', emoji: '🏦',
    text: 'Finish the window with money in the bank',
    penaltyText: 'You finished in the red. The board balanced the books the hard way.',
    check: (s) => s.budget >= 0,
  },
  {
    id: 'busy', emoji: '✍️',
    text: 'Make at least 3 signings',
    penaltyText: 'Too quiet. The board decided the squad needed "freshening" without you.',
    check: (s) => s.signed.length >= 3,
  },
  {
    id: 'sameNation', emoji: '🤝',
    text: 'Sign 2 players who share a nationality',
    penaltyText: 'The board wanted a national core and did not get one.',
    check: (s) => {
      const counts = new Map<string, number>();
      for (const p of s.signed) {
        const nat = (p.nationality || '').split('/')[0].trim();
        if (!nat) continue;
        counts.set(nat, (counts.get(nat) ?? 0) + 1);
      }
      return [...counts.values()].some(n => n >= 2);
    },
  },
  {
    id: 'prime', emoji: '📈',
    text: 'Every signing aged 29 or under',
    penaltyText: 'The board saw the age curve and panicked. A veteran got moved on.',
    check: (s) => s.signed.every(p => (p.age ?? 0) <= 29 || !p.age),
  },
];

/**
 * Two demands contradict when one card's floor sits above the other's ceiling:
 * "sign a galactico worth 80M or more" beside "no single signing over 60M" is
 * a board asking for something no window can deliver, and the player only
 * finds out when both punishments land. The envelope is declared on the card
 * rather than kept as a list of known bad pairs here, so a new card is checked
 * the day it is written instead of the day somebody remembers this function.
 */
function contradicts(a: BoardObjective, b: BoardObjective): boolean {
  return (a.needValue ?? 0) > (b.capValue ?? Infinity)
    || (b.needValue ?? 0) > (a.capValue ?? Infinity);
}

function fitsWith(card: BoardObjective, held: BoardObjective[]): boolean {
  return held.every(h => h.id !== card.id && !contradicts(h, card));
}

/**
 * Deal the two open cards: one Lehmer stream for the whole hand, and a card
 * the hand can live with or the next draw.
 *
 * ONE stream, drawn twice, for the reason mixSeed exists (Round 333). The old
 * deal was `seed ^ (salt * 2654435761)` modulo the deck size, and 2654435761
 * is 1 mod 8, so both salts agreed with the seed's low three bits: 5000 seeds
 * dealt 8 hands out of a possible 112. Two SEPARATE mixed streams were not
 * enough either, because salts a couple of bits apart come out of the warmup a
 * fixed distance apart, so the second card was a near function of the first
 * and only 12 of the 28 pairs ever appeared. Successive draws off one stream
 * reach 27 of them, and 5000 seeds deal 48 or more distinct hands per tier.
 */
export function dealObjectives(seed: number, held: BoardObjective[] = []): BoardObjective[] {
  let s = mixSeed(seed, 0x6f626a);
  const draw = (hand: BoardObjective[]): BoardObjective => {
    for (let tries = 0; tries < 40; tries += 1) {
      s = (s * 16807) % 2147483647;
      const card = OBJECTIVE_DECK[Math.floor(((s - 1) / 2147483646) * OBJECTIVE_DECK.length)];
      if (fitsWith(card, hand)) return card;
    }
    // The board always makes a demand: if the stream somehow never lands on a
    // card that fits, take one that does rather than deal an impossible pair.
    return OBJECTIVE_DECK.find(c => fitsWith(c, hand)) ?? OBJECTIVE_DECK[0];
  };
  const first = draw(held);
  return [first, draw([...held, first])];
}

/* Round 51 rule: a third management card tied to the club's identity.
   Elite boards demand galacticos, modest boards demand thrift, and missing it
   costs a player like every other card. */

const IDENTITY_CARDS: Record<ClubTier, BoardObjective[]> = {
  elite: [
    {
      id: 'idGalactico', emoji: '👑',
      text: 'Club identity: sign a true galactico worth €80M or more',
      penaltyText: 'A superclub with no superstar signing. The board sold a star out of spite.',
      needValue: 80,
      check: (s) => s.signed.some(p => p.marketValue >= 80),
    },
    {
      id: 'idStatement', emoji: '📣',
      text: 'Club identity: make at least 2 signings worth €50M+ each',
      penaltyText: 'The board wanted a statement window and got a whisper.',
      needValue: 50,
      check: (s) => s.signed.filter(p => p.marketValue >= 50).length >= 2,
    },
  ],
  strong: [
    {
      id: 'idUpgrade', emoji: '🎯',
      text: 'Club identity: your priciest signing must beat your priciest sale',
      penaltyText: 'You downgraded the squad\'s ceiling. The board corrected it their way.',
      check: (s) => {
        const maxIn = Math.max(0, ...s.signed.map(p => p.marketValue));
        const maxOut = Math.max(0, ...s.sold.map(p => p.marketValue));
        return s.signed.length > 0 && maxIn > maxOut;
      },
    },
    {
      id: 'idCore', emoji: '🧬',
      text: 'Club identity: sign at least 2 players aged 26 or under',
      penaltyText: 'The project needed a young core. The board went and found one without you.',
      check: (s) => s.signed.filter(p => (p.age ?? 99) <= 26).length >= 2,
    },
  ],
  mid: [
    {
      id: 'idMoneyball', emoji: '📊',
      text: 'Club identity: no single signing over €35M',
      penaltyText: 'This club does not do big fees. The board flipped your expensive buy immediately.',
      capValue: 35,
      check: (s) => s.signed.every(p => p.marketValue <= 35),
    },
    {
      id: 'idFlip', emoji: '💱',
      text: 'Club identity: sell at least one player for €25M or more',
      penaltyText: 'The model is buy low, sell high, and you forgot the second half.',
      check: (s) => s.sold.some(p => p.marketValue >= 25),
    },
  ],
  modest: [
    {
      id: 'idSellToBuy', emoji: '🪙',
      text: 'Club identity: finish with negative net spend (sales cover signings)',
      penaltyText: 'A club this size cannot splash. The board balanced the books brutally.',
      check: (s) => s.sold.reduce((t, p) => t + p.marketValue, 0) >= s.signed.reduce((t, p) => t + p.marketValue, 0),
    },
    {
      id: 'idBargains', emoji: '🧺',
      text: 'Club identity: every signing €20M or less',
      penaltyText: 'One transfer blew the whole wage structure. The board hit undo.',
      capValue: 20,
      check: (s) => s.signed.every(p => p.marketValue <= 20),
    },
  ],
};

export function dealObjectivesWithIdentity(seed: number, club: RebuildClub): BoardObjective[] {
  // Identity is drawn first and never dropped: it is who the club is, so the
  // two open cards are the ones that have to fit around it.
  const identity = pick(IDENTITY_CARDS[club.tier], seed, 631);
  return [identity, ...dealObjectives(seed, [identity])];
}

/* ---------------- Financial events ---------------- */

export interface FinEvent {
  emoji: string;
  text: string;
  delta: number;
}

const FIN_EVENTS: FinEvent[] = [
  { emoji: '👕', text: 'Shirt sales went nuclear in Asia', delta: 30 },
  { emoji: '📺', text: 'New TV deal kicked in early', delta: 40 },
  { emoji: '🤝', text: 'Sleeve sponsor signed on the dotted line', delta: 20 },
  { emoji: '🏟️', text: 'Stadium naming rights sold', delta: 25 },
  { emoji: '🎪', text: 'Preseason tour sold out three continents', delta: 15 },
  { emoji: '💼', text: 'Sell-on clause from an old academy kid paid out', delta: 18 },
  { emoji: '📉', text: 'Main sponsor hit a scandal and pulled out', delta: -25 },
  { emoji: '🚿', text: 'Stadium roof leak. The expensive kind', delta: -15 },
  { emoji: '🧾', text: 'Agent fees came in way over estimate', delta: -12 },
  { emoji: '⚖️', text: 'Lost an arbitration case over an old transfer', delta: -20 },
  { emoji: '🎫', text: 'Season ticket renewals came in soft', delta: -10 },
  { emoji: '🛫', text: 'Charter flight budget tripled. Nobody knows why', delta: -8 },
];

/** Deterministic event for the Nth trigger of a run. */
export function drawFinEvent(seed: number, index: number): FinEvent {
  return pick(FIN_EVENTS, seed, 500 + index * 13);
}

/* ---------------- AI rivals ---------------- */

export interface RivalPlan {
  name: string;
  emoji: string;
  club: RebuildClub;
}

export interface RivalResult extends RivalPlan {
  startRating: number;
  finalRating: number;
  signings: string[];
}

const RIVAL_PERSONAS: { name: string; emoji: string }[] = [
  { name: 'The Shark', emoji: '🦈' },
  { name: 'El Profesor', emoji: '🎓' },
  { name: 'Moneyball Mike', emoji: '📊' },
  { name: 'Agent Zero', emoji: '🕶️' },
];

/** Two rival clubs near the player's pick in the tier list, plus personas. */
export function planRivals(myClub: RebuildClub, clubs: RebuildClub[], seed: number): RivalPlan[] {
  const others = clubs.filter(c => c.club !== myClub.club);
  const sameTier = others.filter(c => c.tier === myClub.tier);
  const pool = sameTier.length >= 2 ? sameTier : others;
  const a = pick(pool, seed, 71);
  let b = pick(pool, seed, 149);
  let salt = 149;
  while (b.club === a.club && pool.length > 1) {
    salt += 53;
    b = pick(pool, seed, salt);
  }
  const p1 = pick(RIVAL_PERSONAS, seed, 301);
  let p2 = pick(RIVAL_PERSONAS, seed, 401);
  let psalt = 401;
  while (p2.name === p1.name) {
    psalt += 31;
    p2 = pick(RIVAL_PERSONAS, seed, psalt);
  }
  return [
    { ...p1, club: a },
    { ...p2, club: b },
  ];
}

export function bestFor(slot: FormationSlot, pool: Player[], used: Set<string>): Player | undefined {
  return pool
    .filter(p => slot.allowed.includes(p.position) && !used.has(p.name))
    .sort((a, b) => playerRating(b) - playerRating(a))[0];
}

export function buildXi(formation: Formation, pool: Player[]): (Player | undefined)[] {
  const used = new Set<string>();
  return formation.slots.map(slot => {
    const p = bestFor(slot, pool, used);
    if (p) used.add(p.name);
    return p;
  });
}

/**
 * THE rating law for Rebuild, and there is only one of it on purpose.
 *
 * An empty shirt counts 40. That is what the board reads on the wall, what a
 * punishment sale costs, and what an inherited hole costs, so every reading in
 * the game has to use it. Round 435: it did not. The opening rating averaged
 * only the shirts that had somebody in them while the live rating charged 40
 * for the empty ones, so 15 of the 66 clubs opened 3 or 4 points down before
 * the player had touched anything and were graded "You made it worse" for it.
 *
 * An XI nobody is in at all is not a rating, it is 0.
 */
export function xiRatingWithHoles(xi: (Player | undefined | null)[]): number {
  if (!xi.some(Boolean)) return 0;
  return Math.round(xi.reduce((s, p) => s + (p ? playerRating(p) : 40), 0) / xi.length);
}

/**
 * Simulate one rival's window: sell their 2 lowest-rated starters, then
 * greedily buy the best affordable upgrades for their weakest slots from the
 * market (players the human already signed are off limits). Deterministic.
 * Players this rival won off you in a bidding war are forced into their squad.
 */
export function simulateRival(
  plan: RivalPlan,
  rivalSquad: Player[],
  market: Player[],
  humanSigned: Set<string>,
  seed: number,
  wonInWars: string[] = [],
): RivalResult {
  const formation = FORMATIONS[0];
  const startXi = buildXi(formation, rivalSquad);
  const startRating = xiRatingWithHoles(startXi);

  // Round 51: rivals get the same tier-scaled war chest you do.
  let budget = budgetFor(plan.club.tier);
  const squad = [...rivalSquad];

  // Sell the two cheapest starters to raise funds.
  const sellable = (startXi.filter(Boolean) as Player[])
    .sort((a, b) => playerRating(a) - playerRating(b))
    .slice(0, 2);
  for (const s of sellable) {
    budget += s.marketValue;
    const idx = squad.findIndex(p => p.name === s.name);
    if (idx >= 0) squad.splice(idx, 1);
  }

  const signings: string[] = [];
  const taken = new Set(squad.map(p => p.name));

  // War trophies first: they outbid you for these, so they own them now.
  for (const name of wonInWars) {
    const won = market.find(p => p.name === name);
    if (!won || taken.has(won.name)) continue;
    squad.push(won);
    taken.add(won.name);
    budget = Math.max(0, budget - won.marketValue);
    signings.push(won.name);
  }

  // Then up to 3 best affordable players the human didn't take.
  const options = market
    .filter(p => !humanSigned.has(p.name) && !taken.has(p.name))
    .sort((a, b) => playerRating(b) - playerRating(a));
  for (const cand of options) {
    if (signings.length >= 3 + wonInWars.length) break;
    if (cand.marketValue > budget) continue;
    // A rival skips a candidate now and then so runs differ per seed.
    if (((hashSeed(cand.name) ^ seed) >>> 0) % 5 === 0) continue;
    squad.push(cand);
    budget -= cand.marketValue;
    signings.push(cand.name);
  }

  const finalRating = xiRatingWithHoles(buildXi(formation, squad));
  return { ...plan, startRating, finalRating, signings };
}

/* ---------------- Live bidding wars (owner 2026-08-05: "bidding wars for players") ---------------- */

/** Chance (0-100) a rival hijacks this signing. Stars start wars, squad players don't. */
export function contestChance(p: Player): number {
  const r = playerRating(p);
  if (r >= 86) return 55;
  if (r >= 82) return 40;
  if (r >= 78) return 28;
  if (r >= 74) return 15;
  return 6;
}

/** Seeded per run + player, so a run can't reroll the same deal. */
/* Round 251: every one of these mixes hashSeed with the run seed via
   XOR, and JS XOR works on SIGNED 32-bit ints, so a hash with the top
   bit set went negative and so did the remainder. warRivalIndex then
   returned -1 for roughly a quarter of all players, rivalPlans[-1] came
   back undefined, and the first tap on such a player's Sign button threw
   reading rival.emoji and froze the market. The browser board's first
   run in this sandbox caught it (playGames, a signing at step 8).
   Forcing the XOR result unsigned fixes the crash AND the quieter
   corruptions next door: a negative remainder made isContested always
   true and rivalCapFor bid BELOW market for the same players. */
export function isContested(p: Player, seed: number): boolean {
  return ((hashSeed(p.name) ^ seed) >>> 0) % 100 < contestChance(p);
}

/** Which of the two rivals picks the fight over this player. */
export function warRivalIndex(p: Player, seed: number): number {
  return ((hashSeed(p.name) ^ (seed >>> 3)) >>> 0) % 2;
}

/** The rival's hidden ceiling: 112% to 157% of market value. */
export function rivalCapFor(p: Player, seed: number): number {
  const wiggle = (((hashSeed(p.name) ^ (seed >>> 5)) >>> 0) % 46) / 100;
  return Math.round(p.marketValue * (1.12 + wiggle));
}

/** Next bid on the ladder. Steps grow with the fee. */
export function nextRaise(price: number): number {
  const step = price >= 120 ? 15 : price >= 60 ? 10 : price >= 25 ? 5 : 3;
  return price + step;
}

/* ---------------- Season simulation (owner 2026-08-05: "simulate the season with stats") ---------------- */

export interface SeasonTeam {
  name: string;      // manager or club display name
  clubName: string;
  emoji: string;
  rating: number;
  isYou?: boolean;
  isRival?: boolean;
}

export interface SeasonRow extends SeasonTeam {
  w: number; d: number; l: number; gf: number; ga: number; pts: number;
}

export interface SeasonResult {
  table: SeasonRow[];
  position: number; // your finish, 1-based
  highlights: string[];
  goldenBoot: { player: string; team: string; goals: number } | null;
  yourTopScorer: { player: string; goals: number } | null;
  yourAssistKing: { player: string; assists: number } | null;
  headline: string;
}

const FILLER_BASE: Record<ClubTier, number> = { elite: 84, strong: 81, mid: 77, modest: 73 };

function lcg(seed: number): () => number {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function goalsFrom(exp: number, rnd: () => number): number {
  let g = 0;
  for (let i = 0; i < 6; i++) if (rnd() < exp / 6) g++;
  return g;
}

/**
 * A 6-team mini league season, double round robin (10 games each): you, your
 * two rivals, and three neutral clubs of your tier. Fully seeded, so the
 * result screen never reshuffles on re-render.
 */
export function simulateSeason(
  you: { clubName: string; rating: number; xi: Player[] },
  rivals: RivalResult[],
  fillerClubs: RebuildClub[],
  seed: number,
): SeasonResult {
  const rnd = lcg(seed * 31 + 7);
  const rows: SeasonRow[] = [];
  const mk = (t: SeasonTeam): SeasonRow => ({ ...t, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 });

  rows.push(mk({ name: 'You', clubName: you.clubName, emoji: '🫵', rating: you.rating, isYou: true }));
  for (const r of rivals) {
    rows.push(mk({ name: r.name, clubName: r.club.club, emoji: r.emoji, rating: r.finalRating, isRival: true }));
  }
  for (const c of fillerClubs.slice(0, 3)) {
    const jitter = Math.floor(rnd() * 5) - 2;
    rows.push(mk({ name: c.club, clubName: c.club, emoji: '🏟️', rating: FILLER_BASE[c.tier] + jitter }));
  }

  interface Game { home: SeasonRow; away: SeasonRow; hg: number; ag: number }
  const games: Game[] = [];
  for (let i = 0; i < rows.length; i++) {
    for (let j = 0; j < rows.length; j++) {
      if (i === j) continue;
      const home = rows[i], away = rows[j];
      const diff = home.rating - away.rating;
      const hg = goalsFrom(Math.max(0.35, 1.5 + diff / 13), rnd);
      const ag = goalsFrom(Math.max(0.35, 1.2 - diff / 13), rnd);
      home.gf += hg; home.ga += ag; away.gf += ag; away.ga += hg;
      if (hg > ag) { home.w++; away.l++; home.pts += 3; }
      else if (ag > hg) { away.w++; home.l++; away.pts += 3; }
      else { home.d++; away.d++; home.pts++; away.pts++; }
      games.push({ home, away, hg, ag });
    }
  }
  rows.sort((a, b) => b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga) || b.gf - a.gf);
  const position = rows.findIndex(r => r.isYou) + 1;
  const yourRow = rows[position - 1];

  // Highlights: your biggest win, your worst loss, plus the wildest scoreline.
  const highlights: string[] = [];
  const yourGames = games.filter(g => g.home.isYou || g.away.isYou);
  const margin = (g: Game) => (g.home.isYou ? g.hg - g.ag : g.ag - g.hg);
  const wins = yourGames.filter(g => margin(g) > 0).sort((a, b) => margin(b) - margin(a));
  const losses = yourGames.filter(g => margin(g) < 0).sort((a, b) => margin(a) - margin(b));
  const line = (g: Game) => `${g.home.emoji} ${g.home.name} ${g.hg}-${g.ag} ${g.away.name} ${g.away.emoji}`;
  if (wins[0]) highlights.push(`🔥 Statement win: ${line(wins[0])}`);
  if (losses[0]) highlights.push(`🥶 Rough afternoon: ${line(losses[0])}`);
  const thriller = [...games].sort((a, b) => (b.hg + b.ag) - (a.hg + a.ag))[0];
  if (thriller) highlights.push(`🎢 Game of the season: ${line(thriller)}`);
  const champ = rows[0];
  highlights.push(champ.isYou ? '🏆 You lifted the trophy in front of a full house.' : `🏆 ${champ.emoji} ${champ.name} took the title with ${champ.pts} points.`);

  // Golden boot: real names only (your XI + rival signings), goals scaled off team output.
  let goldenBoot: SeasonResult['goldenBoot'] = null;
  const yourAtk = you.xi
    .filter(p => ['ST', 'CF', 'LW', 'RW', 'CAM'].includes(p.position))
    .sort((a, b) => playerRating(b) - playerRating(a));
  let yourTopScorer: SeasonResult['yourTopScorer'] = null;
  let yourAssistKing: SeasonResult['yourAssistKing'] = null;
  if (yourAtk[0]) {
    const goals = Math.max(2, Math.round(yourRow.gf * (0.42 + rnd() * 0.14)));
    yourTopScorer = { player: yourAtk[0].name, goals };
    goldenBoot = { player: yourAtk[0].name, team: 'You', goals };
  }
  const yourMids = you.xi
    .filter(p => ['CM', 'CAM', 'CDM', 'LM', 'RM', 'LW', 'RW'].includes(p.position))
    .filter(p => p.name !== yourTopScorer?.player)
    .sort((a, b) => playerRating(b) - playerRating(a));
  if (yourMids[0]) {
    yourAssistKing = { player: yourMids[0].name, assists: Math.max(2, Math.round(yourRow.gf * (0.24 + rnd() * 0.1))) };
  }
  for (const r of rivals) {
    const row = rows.find(x => x.name === r.name);
    if (!row || r.signings.length === 0) continue;
    const goals = Math.max(2, Math.round(row.gf * (0.38 + rnd() * 0.14)));
    if (!goldenBoot || goals > goldenBoot.goals) goldenBoot = { player: r.signings[0], team: r.name, goals };
  }

  const headline =
    position === 1 ? 'CHAMPIONS. The rebuild worked.'
    : position === 2 ? 'Runners up. One window away.'
    : position <= 4 ? 'Solid season, top half, real progress.'
    : 'A long season. The board is drafting emails.';

  return { table: rows, position, highlights, goldenBoot, yourTopScorer, yourAssistKing, headline };
}

/* ---------------- Round 333: the spin loop (owner's core loop spec) ---------------- */

/** Lehmer stream seeding with three warmup steps. One multiplication leaves
 *  neighboring seeds within a few million of each other on a 2^31 range, so
 *  the first draw of every stream was nearly constant across close seeds
 *  (simRebuildLoop caught the punishment deck opening on the same card for
 *  500 seeds straight). The warmup wraps the modulus and decorrelates them. */
function mixSeed(seed: number, salt: number): number {
  let s = (seed ^ salt) % 2147483647;
  if (s <= 0) s += 2147483646;
  for (let k = 0; k < 3; k += 1) s = (s * 16807) % 2147483647;
  return s;
}

/** The seeded order the wheel resolves the XI in: every run spins all eleven
 *  slots exactly once, in an order nobody can pick. */
export function spinOrder(seed: number, slotCount: number): number[] {
  const order = Array.from({ length: slotCount }, (_, i) => i);
  let s = mixSeed(seed, 0x51707);
  for (let i = order.length - 1; i > 0; i -= 1) {
    s = (s * 16807) % 2147483647;
    const j = Math.floor(((s - 1) / 2147483646) * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

export interface ReplacementDeal {
  /** Three priced options from the market: a marquee, a solid, a cheap seat. */
  offers: Player[];
  /** Squad players outside the XI who fit the slot: free to promote. */
  bench: Player[];
}

/**
 * Deals the three priced replacements plus the free bench for a slot whose
 * man was just sold. Offers come from three value bands of the market's
 * fits so the choice is always a real one; the bench is whatever the squad
 * already owns for the position. Deterministic in (seed, salt).
 */
export function dealReplacements(
  market: Player[],
  benchPool: Player[],
  slot: FormationSlot,
  taken: Set<string>,
  seed: number,
  salt: number,
): ReplacementDeal {
  const fits = market
    .filter(p => slot.allowed.includes(p.position) && !taken.has(p.name))
    .sort((a, b) => b.marketValue - a.marketValue);
  let s = mixSeed(seed, salt * 2654435761);
  const rand = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
  const grab = (lo: number, hi: number): Player | null => {
    const a = Math.floor(lo * fits.length);
    const b = Math.max(a + 1, Math.floor(hi * fits.length));
    const band = fits.slice(a, b);
    return band.length ? band[Math.floor(rand() * band.length)] : null;
  };
  const offers: Player[] = [];
  for (const [lo, hi] of [[0, 0.08], [0.25, 0.55], [0.8, 1]] as const) {
    let c = grab(lo, hi);
    let hops = 0;
    while (c && offers.some(o => o.name === c!.name) && hops < 8) { c = grab(lo, hi); hops += 1; }
    if (c && !offers.some(o => o.name === c!.name)) offers.push(c);
  }
  const bench = benchPool
    .filter(p => slot.allowed.includes(p.position) && !taken.has(p.name))
    .sort((a, b) => playerRating(b) - playerRating(a))
    .slice(0, 4);
  return { offers, bench };
}

/* The punishment deck (owner spec: "miss board goals and you draw a
 * punishment card, one safe in the deck"). Five cards, drawn seeded and
 * without replacement per reckoning, exactly one merciful. */
export interface PunishCard {
  id: string;
  emoji: string;
  title: string;
  text: string;
  kind: 'sellBest' | 'sellRandom' | 'fine' | 'ratingHit' | 'safe';
  amount: number;
}

export const PUNISH_DECK: PunishCard[] = [
  { id: 'sellBest', emoji: '\u{1FA93}', title: 'The Flagship Sale', text: 'The board sells your most valuable player to make a point.', kind: 'sellBest', amount: 0 },
  { id: 'sellRandom', emoji: '\u{1F3B2}', title: 'The Random Exit', text: 'Somebody leaves. The board will not say why it was him.', kind: 'sellRandom', amount: 0 },
  { id: 'fine', emoji: '\u{1F9FE}', title: 'The Clawback', text: 'The board claws 25 million back out of the football budget.', kind: 'fine', amount: 25 },
  { id: 'ratingHit', emoji: '\u{1F4C9}', title: 'The Mutiny', text: 'The dressing room hears about the missed target. The XI plays two below itself.', kind: 'ratingHit', amount: 2 },
  { id: 'safe', emoji: '\u{1F54A}\uFE0F', title: 'The Board Lets It Slide', text: 'A long meeting, a short memo, no consequences. This time.', kind: 'safe', amount: 0 },
];

/** Seeded draws WITHOUT replacement: the first miss draws from five, the
 *  second from the remaining four, and the safe card can only save one. */
export function drawPunishments(seed: number, misses: number): PunishCard[] {
  const deck = [...PUNISH_DECK];
  let s = mixSeed(seed, 0x70756e);
  const out: PunishCard[] = [];
  for (let i = 0; i < misses && deck.length > 0; i += 1) {
    s = (s * 16807) % 2147483647;
    const j = Math.floor(((s - 1) / 2147483646) * deck.length);
    out.push(deck.splice(j, 1)[0]);
  }
  return out;
}

/* Restriction presets (owner spec: "restriction presets (Europe only and
 * such)"): a market filter chosen before the club, purely narrowing. */
export type RebuildPreset = 'none' | 'europe5' | 'u25';
export const REBUILD_PRESETS: { id: RebuildPreset; label: string; desc: string }[] = [
  { id: 'none', label: 'Open market', desc: 'Everyone the scouts know' },
  { id: 'europe5', label: 'Top five leagues only', desc: 'England, Spain, Italy, Germany, France' },
  { id: 'u25', label: 'Under 25s only', desc: 'Sign nobody older than 24' },
];
const TOP5_LEAGUES = new Set(['Premier League', 'La Liga', 'Serie A', 'Bundesliga', 'Ligue 1']);
export function applyPreset(market: Player[], preset: RebuildPreset): Player[] {
  if (preset === 'europe5') return market.filter(p => TOP5_LEAGUES.has(p.league));
  if (preset === 'u25') return market.filter(p => p.age > 0 && p.age <= 24);
  return market;
}

/** How far past zero the wallet may go mid window. The reckoning claws it
 *  back with forced sales (owner spec: "end with negative money and
 *  positions are force sold at random"). */
export const OVERDRAFT_LIMIT = 60;

export interface ForcedSwap {
  outName: string;
  inPlayer: Player;
  recouped: number;
}

/**
 * The reckoning's forced sales: while the deficit stands, a random resolved
 * position is sold and the cheapest market fit takes the shirt, recouping
 * the difference. Pure and seeded; bounded by the XI itself.
 */
export function forceSales(
  xi: (Player | null)[],
  formation: Formation,
  market: Player[],
  deficit: number,
  seed: number,
): { swaps: ForcedSwap[]; remainingDeficit: number } {
  let owed = deficit;
  const swaps: ForcedSwap[] = [];
  let s = mixSeed(seed, 0x666f72);
  const takenIn = new Set<string>();
  const candidates = xi
    .map((p, i) => ({ p, i }))
    .filter((x): x is { p: Player; i: number } => x.p !== null)
    .sort((a, b) => b.p.marketValue - a.p.marketValue);
  const order = [...candidates];
  for (let i = order.length - 1; i > 0; i -= 1) {
    s = (s * 16807) % 2147483647;
    const j = Math.floor(((s - 1) / 2147483646) * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  for (const { p, i } of order) {
    if (owed <= 0) break;
    const slot = formation.slots[i];
    const cheap = market
      .filter(m => slot.allowed.includes(m.position) && !takenIn.has(m.name) && m.name !== p.name && m.marketValue < p.marketValue)
      .sort((a, b) => a.marketValue - b.marketValue)[0];
    if (!cheap) continue;
    takenIn.add(cheap.name);
    const recouped = p.marketValue - cheap.marketValue;
    owed -= recouped;
    swaps.push({ outName: p.name, inPlayer: cheap, recouped });
  }
  return { swaps, remainingDeficit: Math.max(0, owed) };
}
