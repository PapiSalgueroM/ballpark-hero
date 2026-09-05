import { Player, type League } from '@/types/game';
import { FORMATIONS, playerRating, normalizePosition, type Formation, type FormationSlot } from '@/lib/squadDeal';
import type { RebuildClub, ClubTier } from '@/lib/fetchRebuild';

/**
 * Rebuild Challenge: the deck. Everything the loop deals from lives here as
 * plain data and pure functions, so src/lib/rebuildLoop.ts can run the whole
 * game without a page and scripts/simRebuildLoop.mjs can drive it by the
 * thousand.
 *
 * Owner spec (2026-08-05 and 2026-08-28), the parts this file holds:
 *  - Managers: keep the man you have or pay one of three. Round 456: they are
 *    generated people with a profile (youth, old heads, defence, attack) and a
 *    fee, because the six real names that sat here carried ratings typed out
 *    of thin air, and a rating for a real person has to come from somewhere.
 *  - Envelopes: the board's envelope (mood, money, demands) and the finance
 *    envelope (one of fifteen) up front, more envelopes as the window goes on.
 *  - Board demands with a punishment deck behind them, exactly one card safe.
 *  - Restriction presets that narrow the market before the club is picked.
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

/* ---------------- Managers (Round 456: generated people, a profile and a fee) ---------------- */

export type ManagerProfile = 'youth' | 'veterans' | 'defence' | 'attack' | 'none';

export interface ManagerOption {
  id: string;
  name: string;
  emoji: string;
  /** What he does, in plain words. Generated people only, no real manager is named here. */
  line: string;
  profile: ManagerProfile;
  /** Rating points added to every XI player who fits his profile. Nothing for the rest. */
  lift: number;
  /** Transfer money it costs to hire him. */
  cost: number;
}

const MANAGER_FIRST = [
  'Tomas', 'Marko', 'Julien', 'Ander', 'Nikola', 'Rafael', 'Pieter', 'Lukas', 'Dario', 'Emil',
  'Gustavo', 'Ivan', 'Bruno', 'Mateo', 'Teodor', 'Anders', 'Kasper', 'Rui', 'Joaquin', 'Milan',
];
const MANAGER_LAST = [
  'Halvorsen', 'Brandvik', 'Kessler', 'Oyelaran', 'Marchetti', 'Lindqvist', 'Petrakis', 'Dvorak',
  'Castellanos', 'Wieczorek', 'Amsel', 'Ferrando', 'Kovalenko', 'Bakker', 'Saether', 'Okonkwo',
  'Rasmussen', 'Varela', 'Zoric', 'Mendonca',
];

const PROFILE_LINES: Record<Exclude<ManagerProfile, 'none'>, { emoji: string; lines: string[] }> = {
  youth: {
    emoji: '\u{1F331}',
    lines: [
      'Trusts the under 25s and they play for him',
      'Runs the academy kids straight into the first team',
      'Young players get better under him. Older ones get bored',
    ],
  },
  veterans: {
    emoji: '\u{1F9D3}',
    lines: [
      'Gets one more big season out of the over 30s',
      'Old heads love him. He keeps them fit and keeps picking them',
      'Experience first. The 30 somethings run his dressing room',
    ],
  },
  defence: {
    emoji: '\u{1F9F1}',
    lines: [
      'Back line first. His teams do not concede',
      'Keeper and defenders play above themselves for him',
      'Organised, tight, a bit dull, very hard to beat',
    ],
  },
  attack: {
    emoji: '⚡',
    lines: [
      'Front three first, worry about the rest later',
      'His wingers and strikers score. His full backs sprint back',
      'Fun to watch, scores loads, ships a few',
    ],
  },
};

const DEFENDERS = new Set(['GK', 'CB', 'LB', 'RB', 'LWB', 'RWB']);
const ATTACKERS = new Set(['LW', 'RW', 'ST', 'CF', 'CAM', 'LM', 'RM']);

/** Does this player get the manager's lift? Age 0 means unknown, and an unknown age fits nobody's age profile. */
export function managerFits(profile: ManagerProfile, p: Player): boolean {
  if (profile === 'youth') return p.age > 0 && p.age <= 24;
  if (profile === 'veterans') return p.age >= 30;
  if (profile === 'defence') return DEFENDERS.has(p.position);
  if (profile === 'attack') return ATTACKERS.has(p.position);
  return false;
}

/** The fee scales with the badge, the lifts do not: 3, 2 and 1 point on the men who fit. */
export function managerOptionsFor(club: RebuildClub, seed: number): ManagerOption[] {
  const scale = club.tier === 'elite' ? 1.4 : club.tier === 'strong' ? 1.15 : club.tier === 'mid' ? 1 : 0.85;
  let s = mixSeed(seed, 0x6d6772);
  const rand = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
  const profiles: Exclude<ManagerProfile, 'none'>[] = ['youth', 'veterans', 'defence', 'attack'];
  for (let i = profiles.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [profiles[i], profiles[j]] = [profiles[j], profiles[i]];
  }
  const usedNames = new Set<string>();
  const out: ManagerOption[] = [];
  const bases = [{ lift: 3, cost: 24 }, { lift: 2, cost: 12 }, { lift: 1, cost: 5 }];
  for (let k = 0; k < 3; k += 1) {
    const profile = profiles[k];
    let name = '';
    for (let tries = 0; tries < 20; tries += 1) {
      name = `${MANAGER_FIRST[Math.floor(rand() * MANAGER_FIRST.length)]} ${MANAGER_LAST[Math.floor(rand() * MANAGER_LAST.length)]}`;
      if (!usedNames.has(name)) break;
    }
    usedNames.add(name);
    const jitter = 0.85 + rand() * 0.3;
    const { emoji, lines } = PROFILE_LINES[profile];
    out.push({
      id: `${profile}-${k}`,
      name,
      emoji,
      line: lines[Math.floor(rand() * lines.length)],
      profile,
      lift: bases[k].lift,
      cost: Math.max(2, Math.round(bases[k].cost * scale * jitter)),
    });
  }
  return out;
}

export const KEEP_MANAGER: ManagerOption = {
  id: 'caretaker', /* the id is a save value, renaming it orphans old runs */
  name: 'Keep the man you have',
  emoji: '\u{1FA91}',
  line: 'Costs nothing, changes nothing',
  profile: 'none',
  lift: 0,
  cost: 0,
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

/* ---------------- Perks (Round 456: the powerups an envelope can hold) ---------------- */

export type PerkKind = 'rescout' | 'discount' | 'noWar';

export const PERK_LABEL: Record<PerkKind, { emoji: string; short: string; long: string }> = {
  rescout: { emoji: '\u{1F50E}', short: 'Fresh list', long: 'Ask the scouts for a new list of three, once, any time' },
  discount: { emoji: '\u{1F3F7}️', short: '20% off', long: 'Your next signing costs 20 percent under his value' },
  noWar: { emoji: '\u{1F92B}', short: 'No war', long: 'The rivals stay out of your next signing' },
};

/* ---------------- The finance envelope (Round 51 rule: flip one of the deck) ---------------- */

export interface FortuneCard {
  id: string;
  emoji: string;
  title: string;
  text: string;
  delta: number;
  perk?: PerkKind;
}

export const FORTUNE_DECK: FortuneCard[] = [
  { id: 'takeover', emoji: '\u{1F6E2}️', title: 'New owners', text: 'A consortium buys the club and wants a big first window. The pot gets a lot bigger.', delta: 60 },
  { id: 'uclMoney', emoji: '⭐', title: 'European money', text: 'Last season\'s European run finally pays out.', delta: 45 },
  { id: 'megaShirt', emoji: '\u{1F455}', title: 'A record kit deal', text: 'The new kit sponsor signed this morning. Big number.', delta: 30 },
  { id: 'sellOn', emoji: '\u{1F393}', title: 'A sell on clause pays out', text: 'An old academy lad moves for a fortune and the club gets its cut.', delta: 20 },
  { id: 'docuseries', emoji: '\u{1F3A5}', title: 'Documentary money', text: 'A streaming crew pays to follow your window. Cameras everywhere, cash in the bank.', delta: 12 },
  { id: 'loanFees', emoji: '\u{1F4E6}', title: 'Loan fees came in', text: 'Two loan deals from last season pay their fees on time for once.', delta: 10 },
  { id: 'cupRun', emoji: '\u{1F3C6}', title: 'Cup gate money', text: 'Two sold out cup nights nobody budgeted for.', delta: 8 },
  { id: 'quiet', emoji: '\u{1FA91}', title: 'A quiet summer', text: 'No drama, no windfall. The books stay exactly as they are.', delta: 0 },
  { id: 'scouts', emoji: '\u{1F50E}', title: 'The scouting network', text: 'A new head of recruitment. Once this window, you can ask the scouts for a fresh list of three.', delta: 0, perk: 'rescout' },
  { id: 'agent', emoji: '\u{1F3F7}️', title: 'An agent owes you one', text: 'A favour gets called in. Your next signing comes 20 percent under his value.', delta: 0, perk: 'discount' },
  { id: 'quietRivals', emoji: '\u{1F92B}', title: 'The rivals are busy', text: 'Your two rivals are fighting each other this week. Nobody hijacks your next signing.', delta: 0, perk: 'noWar' },
  { id: 'wages', emoji: '\u{1FA79}', title: 'Two long term injuries', text: 'Two players on full wages will not kick a ball this season. The pot pays for it.', delta: -10 },
  { id: 'ffp', emoji: '⚖️', title: 'A letter from the regulators', text: 'Last year\'s spending gets flagged. The lawyers get paid first.', delta: -15 },
  { id: 'taxCase', emoji: '\u{1F9FE}', title: 'A tax bill', text: 'An old ownership mess finally lands on the desk. It is expensive.', delta: -25 },
  { id: 'clause', emoji: '\u{1F4DC}', title: 'A clause nobody read', text: 'Something buried in an old transfer contract triggers. Everyone is furious.', delta: -35 },
];

/** The deck in a seeded order, so a run cannot re-flip for a better card. */
export function fortuneDeckFor(seed: number): FortuneCard[] {
  const deck = [...FORTUNE_DECK];
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.abs((seed ^ (i * 2654435761)) >>> 0) % (i + 1);
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

/* ---------------- Board demands ---------------- */

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
    id: 'youth', emoji: '\u{1F331}',
    text: 'Sign at least 2 players aged 23 or under',
    penaltyText: 'The board wanted youth. They sold your best signing to fund the academy.',
    check: (s) => s.signed.filter(p => (p.age ?? 99) <= 23).length >= 2,
  },
  {
    id: 'youth3', emoji: '\u{1F9D2}',
    text: 'Sign at least 3 players aged 24 or under',
    penaltyText: 'Three young signings was the ask. The board went shopping without you.',
    check: (s) => s.signed.filter(p => p.age > 0 && p.age <= 24).length >= 3,
  },
  {
    id: 'clearout', emoji: '\u{1F9F9}',
    text: 'Sell at least 2 of the current squad',
    penaltyText: 'No clearout, no trust. The board sold a starter behind your back.',
    check: (s) => s.sold.length >= 2,
  },
  {
    id: 'noGalacticos', emoji: '\u{1F9FE}',
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
    id: 'marquee2', emoji: '\u{1F4AB}',
    text: 'Make two marquee signings, €60M or more each',
    penaltyText: 'One big name is not two. The board made the second move itself.',
    needValue: 60,
    check: (s) => s.signed.filter(p => p.marketValue >= 60).length >= 2,
  },
  {
    id: 'inTheBlack', emoji: '\u{1F3E6}',
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
    id: 'sameNation', emoji: '\u{1F91D}',
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
    id: 'prime', emoji: '\u{1F4C8}',
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
      id: 'idGalactico', emoji: '\u{1F451}',
      text: 'Club identity: sign a true galactico worth €80M or more',
      penaltyText: 'A superclub with no superstar signing. The board sold a star out of spite.',
      needValue: 80,
      check: (s) => s.signed.some(p => p.marketValue >= 80),
    },
    {
      id: 'idStatement', emoji: '\u{1F4E3}',
      text: 'Club identity: make at least 2 signings worth €50M+ each',
      penaltyText: 'The board wanted a statement window and got a whisper.',
      needValue: 50,
      check: (s) => s.signed.filter(p => p.marketValue >= 50).length >= 2,
    },
  ],
  strong: [
    {
      id: 'idUpgrade', emoji: '\u{1F3AF}',
      text: 'Club identity: your priciest signing must beat your priciest sale',
      penaltyText: 'You downgraded the squad\'s ceiling. The board corrected it their way.',
      check: (s) => {
        const maxIn = Math.max(0, ...s.signed.map(p => p.marketValue));
        const maxOut = Math.max(0, ...s.sold.map(p => p.marketValue));
        return s.signed.length > 0 && maxIn > maxOut;
      },
    },
    {
      id: 'idCore', emoji: '\u{1F9EC}',
      text: 'Club identity: sign at least 2 players aged 26 or under',
      penaltyText: 'The project needed a young core. The board went and found one without you.',
      check: (s) => s.signed.filter(p => (p.age ?? 99) <= 26).length >= 2,
    },
  ],
  mid: [
    {
      id: 'idMoneyball', emoji: '\u{1F4CA}',
      text: 'Club identity: no single signing over €35M',
      penaltyText: 'This club does not do big fees. The board flipped your expensive buy immediately.',
      capValue: 35,
      check: (s) => s.signed.every(p => p.marketValue <= 35),
    },
    {
      id: 'idFlip', emoji: '\u{1F4B1}',
      text: 'Club identity: sell at least one player for €25M or more',
      penaltyText: 'The model is buy low, sell high, and you forgot the second half.',
      check: (s) => s.sold.some(p => p.marketValue >= 25),
    },
  ],
  modest: [
    {
      id: 'idSellToBuy', emoji: '\u{1FA99}',
      text: 'Club identity: finish with negative net spend (sales cover signings)',
      penaltyText: 'A club this size cannot splash. The board balanced the books brutally.',
      check: (s) => s.sold.reduce((t, p) => t + p.marketValue, 0) >= s.signed.reduce((t, p) => t + p.marketValue, 0),
    },
    {
      id: 'idBargains', emoji: '\u{1F9FA}',
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

/* The extra demand a horrible board adds. None of these carries a value floor
   or ceiling, so none can contradict the hand it joins. */
const PRESSURE_DECK: BoardObjective[] = [
  {
    id: 'pressureClearout', emoji: '\u{1F6AA}',
    text: 'Sell at least 3 of the current squad',
    penaltyText: 'The board wanted bodies out of the door and did not get them.',
    check: (s) => s.sold.length >= 3,
  },
  {
    id: 'pressureBank', emoji: '\u{1F4B0}',
    text: 'Finish the window with at least €20M in the bank',
    penaltyText: 'The board wanted a cushion in the account and found none.',
    check: (s) => s.budget >= 20,
  },
  {
    id: 'pressureFour', emoji: '\u{1F4DD}',
    text: 'Make at least 4 signings',
    penaltyText: 'Four new faces was the ask. The board is counting.',
    check: (s) => s.signed.length >= 4,
  },
];

/* ---------------- The board envelope (Round 456) ---------------- */

export type BoardMood = 'horrible' | 'bad' | 'plain' | 'good' | 'great';

export interface BoardEnvelope {
  mood: BoardMood;
  emoji: string;
  title: string;
  text: string;
  /** Money the board adds to or takes from the pot before the window opens. */
  delta: number;
  demands: BoardObjective[];
}

const MOOD_DELTA: Record<BoardMood, number> = { horrible: -30, bad: -15, plain: 0, good: 15, great: 35 };
const MOOD_EMOJI: Record<BoardMood, string> = { horrible: '\u{1F92C}', bad: '\u{1F620}', plain: '\u{1F4CB}', good: '\u{1F44D}', great: '\u{1F389}' };
/* Weighted: one horrible and one great for every three plain. */
const MOOD_DRAW: BoardMood[] = ['horrible', 'bad', 'bad', 'plain', 'plain', 'plain', 'good', 'good', 'great'];

const MOOD_LINES: Record<BoardMood, { title: string; text: string }[]> = {
  horrible: [
    { title: 'The board is furious', text: 'Last season is still being paid for. The pot has been cut, a demand has been added, and nobody upstairs is in the mood to hear excuses.' },
    { title: 'Nobody is happy upstairs', text: 'The accounts are ugly and the fans are louder than the chairman would like. Less money, one more demand, and the punishment cards are already on the table.' },
  ],
  bad: [
    { title: 'The board is nervous', text: 'Money is tighter than the papers think. The pot has been trimmed and the board wants sensible business.' },
    { title: 'A cautious summer', text: 'The chairman wants no surprises this window. A smaller pot, the usual demands.' },
  ],
  plain: [
    { title: 'Business as usual', text: 'The board signs off the usual budget and the usual demands. Get on with it.' },
    { title: 'A quiet boardroom', text: 'Nothing new upstairs. The money is what it is and the demands are on the list.' },
  ],
  good: [
    { title: 'The board is backing you', text: 'A decent season and a good commercial year. There is a bit extra in the pot and the board wants it spent well.' },
    { title: 'Money in the tin', text: 'The commercial team had a good year, so the pot grows a little. The demands stay.' },
  ],
  great: [
    { title: 'The board wants a statement', text: 'A record commercial year. The pot is bigger than expected and the board has dropped a demand to let you get on with it.' },
    { title: 'Backed to the hilt', text: 'New money at the top of the club and a board in a very good mood. One demand fewer, a lot more to spend.' },
  ],
};

/* Club specific flavour where the fact behind it is documented. Barcelona's
   Spotify sponsorship (shirt and stadium naming, signed in 2022) is the one
   the owner named. Nothing is invented for any other club: everywhere else
   the board speaks in the generic lines above. */
const CLUB_FLAVOUR: Record<string, Partial<Record<BoardMood, { title: string; text: string }>>> = {
  'FC Barcelona': {
    good: { title: 'The Spotify money is in', text: 'The sponsorship money has landed and the board wants to see it on the pitch. A bit extra in the pot, the demands stay.' },
    great: { title: 'The Spotify money is in', text: 'The sponsorship money has landed and the board is in a generous mood. A much bigger pot, and one demand fewer.' },
  },
};

const PRESET_CAP: Partial<Record<RebuildPreset, number>> = { bargain: 30 };

/**
 * The board's envelope: a mood from horrible to great, the money that goes
 * with it, and the demands. A great board drops one open card, a horrible one
 * adds a pressure card. The preset is passed so a value capped market is
 * never dealt a demand it cannot reach: the cap joins the hand as a virtual
 * card and the identity is chosen among the ones that fit under it.
 */
export function boardEnvelopeFor(seed: number, club: RebuildClub, preset: RebuildPreset = 'none'): BoardEnvelope {
  const mood = pick(MOOD_DRAW, seed, 977);
  const scale = club.tier === 'elite' ? 1.5 : club.tier === 'strong' ? 1.2 : club.tier === 'mid' ? 1 : 0.7;
  const delta = Math.round(MOOD_DELTA[mood] * scale);

  const cap = PRESET_CAP[preset];
  let demands: BoardObjective[];
  if (cap === undefined) {
    demands = dealObjectivesWithIdentity(seed, club);
  } else {
    const capCard: BoardObjective = { id: 'presetCap', emoji: '', text: '', penaltyText: '', capValue: cap, check: () => true };
    const own = IDENTITY_CARDS[club.tier].filter(c => fitsWith(c, [capCard]));
    const any = Object.values(IDENTITY_CARDS).flat().filter(c => fitsWith(c, [capCard]));
    const identity = pick(own.length ? own : any, seed, 631);
    demands = [identity, ...dealObjectives(seed, [identity, capCard])];
  }
  if (mood === 'great') demands = demands.slice(0, 2);
  if (mood === 'horrible') {
    const held = new Set(demands.map(d => d.id));
    const extra = PRESSURE_DECK.filter(c => !held.has(c.id));
    demands = [...demands, pick(extra, seed, 1013)];
  }

  const line = CLUB_FLAVOUR[club.club]?.[mood] ?? pick(MOOD_LINES[mood], seed, 1201);
  return { mood, emoji: MOOD_EMOJI[mood], title: line.title, text: line.text, delta, demands };
}

/* ---------------- Envelopes as you go (finance events) ---------------- */

export interface FinEvent {
  emoji: string;
  text: string;
  delta: number;
  perk?: PerkKind;
}

const FIN_EVENTS: FinEvent[] = [
  { emoji: '\u{1F455}', text: 'Shirt sales in Asia went through the roof', delta: 30 },
  { emoji: '\u{1F4FA}', text: 'The new TV deal kicked in early', delta: 40 },
  { emoji: '\u{1F91D}', text: 'A sleeve sponsor signed', delta: 20 },
  { emoji: '\u{1F3DF}️', text: 'Stadium naming rights sold', delta: 25 },
  { emoji: '\u{1F3AA}', text: 'The pre season tour sold out', delta: 15 },
  { emoji: '\u{1F4BC}', text: 'A sell on clause from an old academy lad paid out', delta: 18 },
  { emoji: '\u{1F50E}', text: 'A scout you rate calls in a favour: one fresh list of three when you want it', delta: 0, perk: 'rescout' },
  { emoji: '\u{1F3F7}️', text: 'An agent wants to do business: your next signing comes 20 percent cheaper', delta: 0, perk: 'discount' },
  { emoji: '\u{1F4C9}', text: 'The main sponsor had a scandal and pulled out', delta: -25 },
  { emoji: '\u{1F6BF}', text: 'The stadium roof leaks, and it is the expensive kind of leak', delta: -15 },
  { emoji: '\u{1F9FE}', text: 'Agent fees came in way over the estimate', delta: -12 },
  { emoji: '⚖️', text: 'Lost an arbitration case over an old transfer', delta: -20 },
  { emoji: '\u{1F3AB}', text: 'Season ticket renewals came in soft', delta: -10 },
  { emoji: '\u{1F6EB}', text: 'The travel budget tripled and nobody can say why', delta: -8 },
];

/** Deterministic event for the Nth envelope of a run. */
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
  { name: 'The Shark', emoji: '\u{1F988}' },
  { name: 'The Professor', emoji: '\u{1F393}' },
  { name: 'The Spreadsheet', emoji: '\u{1F4CA}' },
  { name: 'The Agent', emoji: '\u{1F576}️' },
];

/** Two rival clubs near the player's pick in the tier list, plus personas. */
export function planRivals(myClub: RebuildClub, clubs: RebuildClub[], seed: number): RivalPlan[] {
  const others = clubs.filter(c => c.club !== myClub.club);
  const sameTier = others.filter(c => c.tier === myClub.tier);
  const pool = sameTier.length >= 2 ? sameTier : others;
  if (pool.length === 0) return [];
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
 * punishment sale costs, and what a shirt left to a 40 overall costs, so every
 * reading in the game has to use it. Round 435: it did not. The opening rating
 * averaged only the shirts that had somebody in them while the live rating
 * charged 40 for the empty ones, so 15 of the 66 clubs opened 3 or 4 points
 * down before the player had touched anything and were graded "You made it
 * worse" for it.
 *
 * Round 456: the manager's lift goes through the same door. `lift` returns the
 * points a given man gets (his manager's profile fits him or it does not), so
 * the opening reading, the live reading and the reckoning all agree.
 *
 * An XI nobody is in at all is not a rating, it is 0.
 */
export function xiRatingWithHoles(xi: (Player | undefined | null)[], lift?: (p: Player) => number): number {
  if (!xi.some(Boolean)) return 0;
  return Math.round(xi.reduce((s, p) => s + (p ? Math.min(99, playerRating(p) + (lift ? lift(p) : 0)) : 40), 0) / xi.length);
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

  rows.push(mk({ name: 'You', clubName: you.clubName, emoji: '\u{1FAF5}', rating: you.rating, isYou: true }));
  for (const r of rivals) {
    rows.push(mk({ name: r.name, clubName: r.club.club, emoji: r.emoji, rating: r.finalRating, isRival: true }));
  }
  for (const c of fillerClubs.slice(0, 3)) {
    const jitter = Math.floor(rnd() * 5) - 2;
    rows.push(mk({ name: c.club, clubName: c.club, emoji: '\u{1F3DF}️', rating: FILLER_BASE[c.tier] + jitter }));
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
  if (wins[0]) highlights.push(`\u{1F525} Your best win: ${line(wins[0])}`);
  if (losses[0]) highlights.push(`\u{1F976} Your worst afternoon: ${line(losses[0])}`);
  const thriller = [...games].sort((a, b) => (b.hg + b.ag) - (a.hg + a.ag))[0];
  if (thriller) highlights.push(`\u{1F3A2} Game of the season: ${line(thriller)}`);
  const champ = rows[0];
  highlights.push(champ.isYou ? '\u{1F3C6} You won the league in front of a full house.' : `\u{1F3C6} ${champ.emoji} ${champ.name} won it with ${champ.pts} points.`);

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
    position === 1 ? 'Champions. The rebuild worked.'
    : position === 2 ? 'Second. One more window and this wins it.'
    : position <= 4 ? 'Top half, real progress.'
    : 'A long season. The board has noticed.';

  return { table: rows, position, highlights, goldenBoot, yourTopScorer, yourAssistKing, headline };
}

/* ---------------- Round 333: the spin loop (owner's core loop spec) ---------------- */

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
  /** Three priced options from the market, dearest first: a marquee, a solid buy, a cheap seat. */
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
  { id: 'sellBest', emoji: '\u{1FA93}', title: 'The big sale', text: 'The board sells your most valuable player to make a point.', kind: 'sellBest', amount: 0 },
  { id: 'sellRandom', emoji: '\u{1F3B2}', title: 'Somebody goes', text: 'One of your XI is sold. The board will not say why it was him.', kind: 'sellRandom', amount: 0 },
  { id: 'fine', emoji: '\u{1F9FE}', title: 'The clawback', text: 'The board takes 25 million back out of the football budget.', kind: 'fine', amount: 25 },
  { id: 'ratingHit', emoji: '\u{1F4C9}', title: 'The dressing room turns', text: 'Word of the missed target gets round the squad. The XI plays two below itself.', kind: 'ratingHit', amount: 2 },
  { id: 'safe', emoji: '\u{1F54A}️', title: 'The board lets it go', text: 'A long meeting, a short memo, no consequences. This time.', kind: 'safe', amount: 0 },
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
export type RebuildPreset = 'none' | 'europe5' | 'u25' | 'u21' | 'bargain';
export const REBUILD_PRESETS: { id: RebuildPreset; label: string; desc: string }[] = [
  { id: 'none', label: 'Open market', desc: 'Everyone the scouts know' },
  { id: 'europe5', label: 'Top five leagues only', desc: 'England, Spain, Italy, Germany, France' },
  { id: 'u25', label: 'Under 25s only', desc: 'Sign nobody older than 24' },
  { id: 'u21', label: 'Wonderkids only', desc: 'Sign nobody older than 21' },
  { id: 'bargain', label: 'Bargain bin', desc: 'Sign nobody worth more than €30M' },
];
const TOP5_LEAGUES = new Set(['Premier League', 'La Liga', 'Serie A', 'Bundesliga', 'Ligue 1']);
export function applyPreset(market: Player[], preset: RebuildPreset): Player[] {
  if (preset === 'europe5') return market.filter(p => TOP5_LEAGUES.has(p.league));
  if (preset === 'u25') return market.filter(p => p.age > 0 && p.age <= 24);
  if (preset === 'u21') return market.filter(p => p.age > 0 && p.age <= 21);
  if (preset === 'bargain') return market.filter(p => p.marketValue <= 30);
  return market;
}

/* ---------------- The market (Round 456) ---------------- */

export interface MarketRow {
  player_name: string;
  position: string | null;
  age: number | null;
  nationality: string | null;
  club: string | null;
  market_value_usd: number | null;
  goals?: number | null;
  assists?: number | null;
}

/**
 * The transfer market as the page reads it: every valued 2026 row outside
 * the club, deduped on name and nationality, dollars to whole millions.
 *
 * This used to be the 900 most valuable rows and nothing else, because the
 * pager was handed a cap of 900. Measured 2026-09-05: row 900 of the pool is
 * worth 15 million, so the "cheap seat" the scouts offered was never cheaper
 * than a 15 million, 77 rated player, and a modest club with 65 million could
 * not afford a single one of the three prices without going into the
 * overdraft. The pool holds 2,914 valued rows and the cheapest is 4 million.
 * The page and scripts/simRebuildLoop.mjs both shape the market through this
 * function so the harness deals from exactly what the visitor sees.
 */
export function buildMarket(rows: MarketRow[], excludeClub: string, leagueOf: (name: string, club: string) => League): Player[] {
  const seen = new Set<string>();
  const out: Player[] = [];
  for (const row of rows) {
    const pos = normalizePosition(row.position || '');
    if (!pos || !row.player_name || row.club === excludeClub) continue;
    const identity = `${row.player_name}|${row.nationality ?? ''}`;
    if (seen.has(identity)) continue;
    seen.add(identity);
    out.push({
      name: row.player_name,
      club: row.club || 'Unknown',
      nationality: row.nationality || 'Unknown',
      league: leagueOf(row.player_name, row.club || ''),
      goals: row.goals ?? 0,
      assists: row.assists ?? 0,
      position: pos,
      kitNumber: null,
      age: row.age ?? 0,
      marketValue: Math.max(1, Math.round((row.market_value_usd || 4_000_000) / 1_000_000)),
      difficulty: 'easy',
    });
  }
  return out;
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
 * The reckoning's forced sales: while the deficit stands, a random settled
 * shirt is sold and the cheapest market fit takes it, recouping the
 * difference. Pure and seeded; bounded by the XI itself.
 *
 * Round 456: a man already wearing one of the other shirts can no longer be
 * the "cheapest fit" for a second one. The exclusion only tracked the men
 * this function had brought in, so a cheap signing the player had already
 * made could be dealt into a second shirt and the XI would carry him twice.
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
  const takenIn = new Set<string>(xi.filter((p): p is Player => p !== null).map(p => p.name));
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
      .filter(m => slot.allowed.includes(m.position) && !takenIn.has(m.name) && m.marketValue < p.marketValue)
      .sort((a, b) => a.marketValue - b.marketValue)[0];
    if (!cheap) continue;
    takenIn.add(cheap.name);
    const recouped = p.marketValue - cheap.marketValue;
    owed -= recouped;
    swaps.push({ outName: p.name, inPlayer: cheap, recouped });
  }
  return { swaps, remainingDeficit: Math.max(0, owed) };
}
