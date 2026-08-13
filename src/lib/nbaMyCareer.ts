/**
 * NBA My Career engine (2026-08-05). Basketball sibling of nflMyCareer.ts:
 * a fictional prospect living a whole career inside the real 30-team
 * league. Per-game stat lines (points, rebounds, assists) driven by
 * rating, role, health and team quality; one big decision per offseason;
 * awards, rings, aging, retirement, legacy verdict with GOAT-tier
 * language. The player is fictional; the teams are real.
 */

import { NBA_TEAMS } from '@/data/conquestDataNba';
import { seasonSwing, swingNote } from './careerVariance';

import type { PlayerAppearance } from './soccerCareerAppearance';
import { getNbaLifeEventsA } from './nbaCareerLifeA';
import { getNbaLifeEventsB } from './nbaCareerLifeB';
import { getNbaCorruptionEvents } from './nbaCareerCorruption';

// Round 57: five real positions instead of three buckets. Each has its own
// archetypes, stat flavour and aging curve, so a point guard career and a
// center career are genuinely different lives.
export type NbaCareerPos = 'PG' | 'SG' | 'SF' | 'PF' | 'C';

export interface NbaArchetype {
  id: string;
  label: string;
  desc: string;
  ovrBoost: number;
  potBoost: number;
  durability: number;
  scoring: number;   // stat flavor multipliers
  playmaking: number;
  rebounding: number;
}

export const NBA_ARCHETYPES: Record<NbaCareerPos, NbaArchetype[]> = {
  PG: [
    { id: 'pointgod', label: 'Point God', desc: 'The offense runs through you', ovrBoost: 1, potBoost: 5, durability: 0.95, scoring: 0.85, playmaking: 1.55, rebounding: 0.55 },
    { id: 'scoringpg', label: 'Scoring Lead', desc: 'A point guard who hunts buckets', ovrBoost: 3, potBoost: 4, durability: 0.9, scoring: 1.3, playmaking: 1.05, rebounding: 0.55 },
    { id: 'pest', label: 'The Pest', desc: 'Picks pockets, gets under skin', ovrBoost: 2, potBoost: 4, durability: 1.0, scoring: 0.95, playmaking: 1.15, rebounding: 0.6 },
  ],
  SG: [
    { id: 'bucket', label: 'Bucket Getter', desc: 'Shot creation from anywhere', ovrBoost: 3, potBoost: 4, durability: 0.9, scoring: 1.35, playmaking: 0.8, rebounding: 0.6 },
    { id: 'sniper', label: 'Movement Sniper', desc: 'Never stops running off screens', ovrBoost: 1, potBoost: 5, durability: 0.95, scoring: 1.15, playmaking: 0.65, rebounding: 0.6 },
    { id: 'twoway', label: 'Two-Way Menace', desc: 'Guards the best perimeter player alive', ovrBoost: 2, potBoost: 4, durability: 1.0, scoring: 1.0, playmaking: 0.85, rebounding: 0.75 },
  ],
  SF: [
    { id: 'alpha', label: 'Alpha Wing', desc: 'Face of the franchise scorer', ovrBoost: 3, potBoost: 4, durability: 0.9, scoring: 1.25, playmaking: 0.95, rebounding: 0.9 },
    { id: 'threed', label: '3-and-D Wing', desc: 'Corner threes and lockdowns', ovrBoost: 1, potBoost: 4, durability: 1.0, scoring: 0.85, playmaking: 0.7, rebounding: 0.9 },
    { id: 'pointforward', label: 'Point Forward', desc: 'Jumbo playmaker', ovrBoost: 2, potBoost: 5, durability: 0.9, scoring: 1.0, playmaking: 1.3, rebounding: 1.0 },
  ],
  PF: [
    { id: 'stretch4', label: 'Stretch Four', desc: 'Spaces the floor, switches everything', ovrBoost: 2, potBoost: 4, durability: 0.95, scoring: 1.05, playmaking: 0.7, rebounding: 1.15 },
    { id: 'bruiser', label: 'Bruiser', desc: 'Offensive boards and bad intentions', ovrBoost: 3, potBoost: 3, durability: 0.85, scoring: 0.95, playmaking: 0.6, rebounding: 1.4 },
    { id: 'swiss', label: 'Swiss Army Four', desc: 'Does a bit of everything, nightly', ovrBoost: 1, potBoost: 5, durability: 0.95, scoring: 1.0, playmaking: 1.0, rebounding: 1.15 },
  ],
  C: [
    { id: 'paintbeast', label: 'Paint Beast', desc: 'Dunks, boards, blocks', ovrBoost: 3, potBoost: 3, durability: 0.85, scoring: 1.0, playmaking: 0.5, rebounding: 1.5 },
    { id: 'stretch', label: 'Stretch Five', desc: 'A center who lives at the arc', ovrBoost: 1, potBoost: 5, durability: 0.95, scoring: 1.05, playmaking: 0.7, rebounding: 1.15 },
    { id: 'anchor', label: 'Defensive Anchor', desc: 'DPOY ceiling, capped usage', ovrBoost: 2, potBoost: 4, durability: 0.95, scoring: 0.75, playmaking: 0.6, rebounding: 1.4 },
  ],
};

/** Round 57: what each position is worth, and when the fall starts. */
export const NBA_POS_SALARY_MULT: Record<NbaCareerPos, number> = {
  PG: 1.1, SG: 1.05, SF: 1.15, PF: 1.0, C: 0.95,
};
export const NBA_POS_CLIFF_AGE: Record<NbaCareerPos, number> = {
  PG: 32, SG: 32, SF: 33, PF: 32, C: 31,
};

export interface NbaSeasonLine {
  year: number;
  team: string;
  age: number;
  ovr: number;
  games: number;
  ppg: number;
  rpg: number;
  apg: number;
  awards: string[];
  teamResult: string;
  salary: number;
}

export interface NbaCareerState {
  name: string;
  pos: NbaCareerPos;
  archetype: NbaArchetype;
  team: string;
  year: number;
  age: number;
  ovr: number;
  pot: number;
  morale: number;
  fanbase: number;
  health: number;
  salary: number;
  contractYears: number;
  seasons: NbaSeasonLine[];
  rings: number;
  mvps: number;
  allNbas: number;
  finalsMvps: number;
  retired: boolean;
  draftPick: number;
  earnings: number;
  /** Round 57 life layer. All optional so pre-R57 saves keep loading. */
  netWorth?: number;
  dirtyMoney?: number;
  heat?: number;
  suspendedSeasons?: number;
  purchased?: string[];
  lifeFlags?: Record<string, number>;
  appearance?: PlayerAppearance | null;
  yearlyCosts?: number;
}

export interface NbaCareerEvent {
  id: string;
  title: string;
  body: string;
  options: { label: string; effect: string; apply: (c: NbaCareerState, rng: () => number) => string }[];
}

export function nbaTeamLabelOf(id: string): string {
  const t = NBA_TEAMS.find(x => x.id === id);
  return t ? `${t.city} ${t.name}` : id;
}

export function startNbaCareer(
  name: string, pos: NbaCareerPos, archetype: NbaArchetype, rng: () => number = Math.random,
  appearance?: PlayerAppearance | null,
): NbaCareerState {
  const base = 68 + Math.floor(rng() * 8) + archetype.ovrBoost;
  const pot = Math.min(99, base + 10 + Math.floor(rng() * 13) + archetype.potBoost);
  const stock = Math.max(1, Math.round(62 - (base - 66) * 5.5 + rng() * 22));
  const team = NBA_TEAMS[Math.floor(rng() * NBA_TEAMS.length)].id;
  const lottery = stock <= 14;
  return {
    name, pos, archetype, team,
    year: 2026, age: 19 + Math.floor(rng() * 3),
    ovr: base, pot,
    morale: 70, fanbase: lottery ? 60 : 35, health: 100,
    salary: lottery ? Math.round((16 - stock) * 0.7 + 6) : 2.5,
    contractYears: 4,
    seasons: [],
    rings: 0, mvps: 0, allNbas: 0, finalsMvps: 0,
    retired: false,
    draftPick: stock,
    earnings: 0,
    // Round 57 life layer
    netWorth: lottery ? 1.2 : 0.3,
    dirtyMoney: 0,
    heat: 0,
    suspendedSeasons: 0,
    purchased: [],
    lifeFlags: {},
    appearance: appearance ?? null,
    yearlyCosts: 0,
  };
}

/* ─── Round 57: the money ─── */
export type NbaSpendCategory = 'home' | 'ride' | 'invest' | 'body' | 'flex' | 'family' | 'shady';

export interface NbaSpendItem {
  id: string; name: string; emoji: string; category: NbaSpendCategory;
  cost: number; yearly?: number; desc: string; oneTime: boolean;
  minNetWorth?: number; minFanbase?: number; requiresDirty?: boolean; effect?: string;
}

export const NBA_SPEND_ITEMS: NbaSpendItem[] = [
  // Home
  { id: 'downtown_loft', name: 'Downtown Loft', emoji: '🏙️', category: 'home', cost: 1.5, desc: 'A real place instead of the rookie hotel, 1.5M', oneTime: true },
  { id: 'gated_house', name: 'House Behind A Gate', emoji: '🏡', category: 'home', cost: 4.5, desc: 'Where the fans cannot ring the doorbell, 4.5M', oneTime: true, minNetWorth: 4 },
  { id: 'summer_villa', name: 'Summer Villa', emoji: '🌴', category: 'home', cost: 8, yearly: 0.2, desc: 'Where the offseason actually happens, 8M', oneTime: true, minNetWorth: 9 },
  { id: 'compound', name: 'The Compound', emoji: '🏰', category: 'home', cost: 20, yearly: 0.5, desc: 'Full court, screening room, guest wing, 20M', oneTime: true, minNetWorth: 25 },
  { id: 'home_court', name: 'Private Gym And Court', emoji: '🏀', category: 'home', cost: 5, yearly: 0.25, desc: 'Hardwood, hoop machine, cold tub, 5M', oneTime: true, minNetWorth: 6, effect: 'Health +6 every offseason' },
  { id: 'hometown_court', name: 'Rebuild Your Neighborhood Courts', emoji: '⛹️', category: 'home', cost: 2, desc: 'New rims, new lights, real nets, 2M', oneTime: true, minNetWorth: 3, effect: 'Fanbase +12' },
  // Ride
  { id: 'first_car', name: 'The Car You Always Wanted', emoji: '🚗', category: 'ride', cost: 0.15, desc: 'First real purchase. Everybody does it, 150k', oneTime: true },
  { id: 'sprinter', name: 'Custom Sprinter', emoji: '🚐', category: 'ride', cost: 0.5, desc: 'Reclining seats and four screens for road trips, 500k', oneTime: true },
  { id: 'exotic', name: 'Exotic Car', emoji: '🏎️', category: 'ride', cost: 0.6, desc: 'Photographed in the players lot constantly, 600k', oneTime: false },
  { id: 'hypercar_nba', name: 'Hypercar', emoji: '🏁', category: 'ride', cost: 3.5, desc: 'Seven figures you will drive twice, 3.5M', oneTime: false, minNetWorth: 7 },
  { id: 'jet_share_nba', name: 'Private Jet Share', emoji: '✈️', category: 'ride', cost: 6, yearly: 0.7, desc: 'Home for every off day, 6M', oneTime: true, minNetWorth: 12 },
  // Invest
  { id: 'restaurant_group', name: 'Restaurant Group', emoji: '🍽️', category: 'invest', cost: 1.2, desc: '35 percent chance it prints 3M, otherwise it limps', oneTime: false },
  { id: 'index_nba', name: 'Boring Index Fund', emoji: '📈', category: 'invest', cost: 2, desc: 'Steady 7 percent. Your accountant weeps with joy', oneTime: false },
  { id: 'media_company', name: 'Media Company', emoji: '🎙️', category: 'invest', cost: 3, yearly: 0.15, desc: 'Podcasts, docs, and your own narrative, 3M', oneTime: true, minNetWorth: 5, effect: 'Fanbase +6 a year' },
  { id: 'youth_academy_nba', name: 'Youth Academy', emoji: '🎓', category: 'invest', cost: 2.5, yearly: 0.1, desc: 'Where the next you comes from, 2.5M', oneTime: true, minNetWorth: 4, effect: 'Fanbase +8' },
  { id: 'crypto_nba', name: 'Crypto Punt', emoji: '🪙', category: 'invest', cost: 1, desc: '20 percent chance of 5x, 80 percent chance of a lesson', oneTime: false },
  { id: 'wine_label', name: 'Wine Label', emoji: '🍷', category: 'invest', cost: 2, desc: 'Steady 10 percent and very good dinners', oneTime: true, minNetWorth: 4 },
  { id: 'team_stake', name: 'Minority Stake In A Franchise', emoji: '🏆', category: 'invest', cost: 40, desc: 'A real piece of a real team, 40M', oneTime: true, minNetWorth: 70, effect: 'The retirement plan, fanbase +10' },
  // Body
  { id: 'chef_nba', name: 'Private Chef', emoji: '👨‍🍳', category: 'body', cost: 0, yearly: 0.15, desc: 'Every meal built for 82 games, 150k a year', oneTime: true, effect: 'Health +4 a year' },
  { id: 'recovery_nba', name: 'Recovery Suite', emoji: '🧊', category: 'body', cost: 2, yearly: 0.12, desc: 'Cryo, compression, the whole circus, 2M', oneTime: true, minNetWorth: 3, effect: 'Injury risk down' },
  { id: 'shot_doctor', name: 'Private Shooting Coach', emoji: '🎯', category: 'body', cost: 0, yearly: 0.2, desc: 'The guy who rebuilt three All Stars, 200k a year', oneTime: true, effect: 'Rating +1 a year while young' },
  { id: 'sleep_nba', name: 'Sleep Program', emoji: '😴', category: 'body', cost: 0.7, desc: 'Turns out most of it is sleep, 700k', oneTime: true, effect: 'Health +8' },
  { id: 'psych_nba', name: 'Sports Psychologist', emoji: '🧠', category: 'body', cost: 0, yearly: 0.12, desc: 'The part nobody used to talk about, 120k a year', oneTime: true, effect: 'Morale +8 on hire' },
  { id: 'biomech_nba', name: 'Biomechanics Team', emoji: '🔬', category: 'body', cost: 1.2, desc: 'They rebuilt your landing mechanics, 1.2M', oneTime: true, effect: 'Rating +2' },
  // Flex
  { id: 'chain_nba', name: 'The Chain', emoji: '💎', category: 'flex', cost: 0.6, desc: 'Iced out, photographed in every tunnel, 600k', oneTime: false, minFanbase: 40 },
  { id: 'tunnel_fits', name: 'A Stylist And A Tunnel Budget', emoji: '🕶️', category: 'flex', cost: 0, yearly: 0.3, desc: 'The tunnel is a runway now, 300k a year', oneTime: true, minFanbase: 45, effect: 'Fanbase +5 a year' },
  { id: 'watch_nba', name: 'Watch Collection', emoji: '⌚', category: 'flex', cost: 2, desc: 'Six figures on each wrist, 2M', oneTime: true, minNetWorth: 5 },
  { id: 'album', name: 'Fund Your Own Album', emoji: '🎤', category: 'flex', cost: 1, desc: 'You cannot rap. You are doing it anyway, 1M', oneTime: true, minFanbase: 55, effect: 'Fanbase +10 and endless jokes' },
  { id: 'signature_shoe', name: 'Signature Shoe Line', emoji: '👟', category: 'flex', cost: 2.5, desc: 'Your silhouette on a shoe, 2.5M', oneTime: true, minFanbase: 70, effect: 'Fanbase +12, real royalties' },
  { id: 'court_mural', name: 'Mural On Your Old Court', emoji: '🎨', category: 'flex', cost: 0.3, desc: 'Twenty feet of you where you learned, 300k', oneTime: true, minFanbase: 55 },
  { id: 'ring_copy_nba', name: 'Second Ring, Bigger', emoji: '💍', category: 'flex', cost: 0.5, desc: 'A custom copy with more diamonds than the real one, 500k', oneTime: true, minNetWorth: 8 },
  // Family
  { id: 'mom_house_nba', name: 'Buy Your Mother A House', emoji: '❤️', category: 'family', cost: 2, desc: 'The reason most people do any of this, 2M', oneTime: true, minNetWorth: 2.5, effect: 'Morale +15' },
  { id: 'siblings_nba', name: 'Pay For Your Siblings College', emoji: '🎓', category: 'family', cost: 0.7, desc: 'All of them, all four years, 700k', oneTime: true, effect: 'Morale +10' },
  { id: 'family_office_nba', name: 'Family Office', emoji: '🏦', category: 'family', cost: 0, yearly: 0.18, desc: 'Professionals so relatives stop asking you directly, 180k a year', oneTime: true, effect: 'Protects your money' },
  { id: 'foundation_nba', name: 'Start A Foundation', emoji: '🤝', category: 'family', cost: 3.5, yearly: 0.25, desc: 'Your name doing good in your city, 3.5M', oneTime: true, minNetWorth: 7, effect: 'Fanbase +10 a year' },
  { id: 'road_family', name: 'Fly Your Family To Every Road Game', emoji: '🛫', category: 'family', cost: 0, yearly: 0.2, desc: 'Somebody in the stands every night, 200k a year', oneTime: true, effect: 'Morale +6 a year' },
  { id: 'trust_nba', name: 'Set Up Trusts For Your Kids', emoji: '🧸', category: 'family', cost: 6, desc: 'They will never have to do this, 6M', oneTime: true, minNetWorth: 14 },
  // Shady
  { id: 'nshady_laundromats', name: 'Laundromat Chain', emoji: '🧼', category: 'shady', cost: 1, desc: 'Remarkable revenue for the foot traffic, 1M', oneTime: true, requiresDirty: true, effect: 'Washes 2M of dirty money' },
  { id: 'nshady_barbers', name: 'Barbershop Chain', emoji: '💈', category: 'shady', cost: 0.8, desc: 'Nine chairs, three customers, endless cash, 800k', oneTime: true, requiresDirty: true, effect: 'Washes 1.5M of dirty money' },
  { id: 'nshady_club', name: 'The Nightclub', emoji: '🍾', category: 'shady', cost: 3, yearly: 0.25, desc: 'Bottle service and a flexible ledger, 3M', oneTime: true, requiresDirty: true, effect: 'Washes 4M, heat +3 a year' },
  { id: 'nshady_lawyer', name: 'The Lawyer Who Never Loses', emoji: '⚖️', category: 'shady', cost: 0, yearly: 0.45, desc: 'On retainer, answers at 3am, 450k a year', oneTime: true, effect: 'Heat cools twice as fast' },
  { id: 'nshady_fixer', name: 'A Guy Who Handles Things', emoji: '🤐', category: 'shady', cost: 0, yearly: 0.3, desc: 'You do not ask how, 300k a year', oneTime: true, effect: 'Heat -8 immediately' },
  { id: 'nshady_offshore', name: 'Offshore Account', emoji: '🏝️', category: 'shady', cost: 0.5, desc: 'An island, a bank, a form nobody files, 500k', oneTime: true, requiresDirty: true, effect: 'Hides money, heat +6' },
  // Round 57 second wave
  { id: 'barber_chair', name: 'A Barber On Retainer', emoji: '💇', category: 'body', cost: 0, yearly: 0.06, desc: 'Flies to every road city. The line has to be right, 60k a year', oneTime: true, effect: 'Morale +4 a year' },
  { id: 'film_room', name: 'Personal Film Analyst', emoji: '🎞️', category: 'body', cost: 0, yearly: 0.14, desc: 'Cuts every possession you played by 6am, 140k a year', oneTime: true, effect: 'Rating +1 a year' },
  { id: 'sneaker_vault', name: 'The Sneaker Vault', emoji: '👟', category: 'flex', cost: 0.9, desc: 'Climate controlled, 900 pairs, 900k', oneTime: true, minFanbase: 50 },
  { id: 'courtside_seats', name: 'Season Courtsides For Your Block', emoji: '🎟️', category: 'family', cost: 0, yearly: 0.25, desc: 'Twelve seats behind the bench, every game, 250k a year', oneTime: true, effect: 'Fanbase +6 a year' },
  { id: 'barbershop_legit', name: 'A Real Barbershop', emoji: '✂️', category: 'invest', cost: 0.4, desc: 'An actual business with actual customers, 400k', oneTime: true },
  { id: 'summer_camp', name: 'Free Summer Camp', emoji: '⛹️', category: 'family', cost: 1, yearly: 0.15, desc: 'Two weeks, 400 kids, no fee, 1M', oneTime: true, minNetWorth: 2, effect: 'Fanbase +8, morale +6' },
];

export function getNbaSpendItem(id: string): NbaSpendItem | undefined {
  return NBA_SPEND_ITEMS.find(i => i.id === id);
}

/** Buy an item. Returns the new state and a log line, or null when blocked. */
export function buyNbaItem(c: NbaCareerState, itemId: string): { state: NbaCareerState; log: string } | null {
  const item = getNbaSpendItem(itemId);
  if (!item) return null;
  const owned = c.purchased ?? [];
  if (item.oneTime && owned.includes(itemId)) return null;
  const net = c.netWorth ?? Math.round(c.earnings * 0.45 * 10) / 10;
  if (item.minNetWorth && net < item.minNetWorth) return null;
  if (item.minFanbase && c.fanbase < item.minFanbase) return null;
  if (item.requiresDirty && (c.dirtyMoney ?? 0) <= 0) return null;
  if (item.cost > net) return null;

  const s: NbaCareerState = { ...c, purchased: [...owned, itemId] };
  s.netWorth = Math.round((net - item.cost) * 10) / 10;
  if (item.yearly) s.yearlyCosts = Math.round(((s.yearlyCosts ?? 0) + item.yearly) * 100) / 100;

  let log = `Bought ${item.name}.`;
  switch (itemId) {
    case 'hometown_court': s.fanbase = Math.min(100, s.fanbase + 12); log = 'You rebuilt the courts you grew up on. The whole neighborhood came out for the reopening.'; break;
    case 'youth_academy_nba': s.fanbase = Math.min(100, s.fanbase + 8); log = 'Your academy opened with 120 kids on day one.'; break;
    case 'team_stake': s.fanbase = Math.min(100, s.fanbase + 10); log = 'You own a piece of a franchise now. The other owners are still deciding how they feel about that.'; break;
    case 'sleep_nba': s.health = Math.min(100, s.health + 8); log = 'Turns out it was mostly sleep the whole time. Health +8.'; break;
    case 'biomech_nba': s.ovr = Math.min(99, s.ovr + 2); log = 'They rebuilt how you land and everything got easier. Rating +2.'; break;
    case 'psych_nba': s.morale = Math.min(100, s.morale + 8); log = 'Best hire you ever made and the one you almost skipped. Morale +8.'; break;
    case 'mom_house_nba': s.morale = Math.min(100, s.morale + 15); log = 'You handed your mother the keys and she did not say a word for a full minute. Morale +15.'; break;
    case 'siblings_nba': s.morale = Math.min(100, s.morale + 10); log = 'Every sibling, all four years, paid in full. Morale +10.'; break;
    case 'album': s.fanbase = Math.min(100, s.fanbase + 10); log = 'The album has four million streams and the locker room has never let it go. Fanbase +10.'; break;
    case 'signature_shoe': s.fanbase = Math.min(100, s.fanbase + 12); log = 'Your silhouette is on a shoe in every mall in the country. Fanbase +12.'; break;
    case 'foundation_nba': s.fanbase = Math.min(100, s.fanbase + 10); log = 'The foundation launched with a block party and a scholarship fund. Fanbase +10.'; break;
    case 'nshady_laundromats': { const w = Math.min(2, c.dirtyMoney ?? 0); s.dirtyMoney = Math.max(0, Math.round(((s.dirtyMoney ?? 0) - 2) * 10) / 10); s.netWorth = Math.round((s.netWorth + w) * 10) / 10; log = 'Two million went in dirty and came out as a very busy laundromat chain.'; break; }
    case 'nshady_barbers': { const w = Math.min(1.5, c.dirtyMoney ?? 0); s.dirtyMoney = Math.max(0, Math.round(((s.dirtyMoney ?? 0) - 1.5) * 10) / 10); s.netWorth = Math.round((s.netWorth + w) * 10) / 10; log = 'Nine chairs, three customers, and a ledger that balances beautifully.'; break; }
    case 'nshady_club': { const w = Math.min(4, c.dirtyMoney ?? 0); s.dirtyMoney = Math.max(0, Math.round(((s.dirtyMoney ?? 0) - 4) * 10) / 10); s.netWorth = Math.round((s.netWorth + w) * 10) / 10; s.heat = Math.min(100, (s.heat ?? 0) + 3); log = 'The club opened. Four million cleaned and a line around the block.'; break; }
    case 'nshady_fixer': s.heat = Math.max(0, (s.heat ?? 0) - 8); log = 'You have a guy now. Heat -8, and you genuinely do not want to know how.'; break;
    case 'nshady_offshore': s.heat = Math.min(100, (s.heat ?? 0) + 6); log = 'The account is open. An island, a bank, and a form nobody will ever file. Heat +6.'; break;
    default: break;
  }
  return { state: s, log };
}

export function nbaRollTeamQuality(prev: number | null, rng: () => number): number {
  if (prev == null) return 70 + Math.floor(rng() * 20);
  return Math.max(64, Math.min(95, Math.round(prev + (rng() * 12 - 6))));
}

export function nbaMarketSalary(c: NbaCareerState): number {
  const posMult = NBA_POS_SALARY_MULT[c.pos] ?? 1;
  return Math.max(2.5, Math.round(((c.ovr - 66) * 2.3 - 6) * posMult * 10) / 10);
}

function gamesFor(c: NbaCareerState, rng: () => number): { games: number; note: string | null } {
  const risk = (1 - c.archetype.durability) * 0.5 + (100 - c.health) / 240;
  if (rng() < risk) {
    const missed = 8 + Math.floor(rng() * 35);
    return { games: Math.max(20, 82 - missed), note: `Missed ${missed} games hurt.` };
  }
  return { games: 78 + Math.floor(rng() * 5), note: null };
}

export function simNbaSeason(
  c: NbaCareerState, teamQuality: number, rng: () => number,
): { line: NbaSeasonLine; notes: string[] } {
  const notes: string[] = [];
  const { games, note } = gamesFor(c, rng);
  if (note) { notes.push(`🚑 ${note}`); c.health -= 7; }
  const swing = seasonSwing(rng, c.age);
  const form = c.ovr + (c.morale - 60) / 12 + (teamQuality - 78) / 8
    // Round 98: the season itself gets a say, so career years and lost
    // years both exist. Averages out to zero across a career.
    + swing;
  const a = c.archetype;
  // Round 57 realism fix: the old slope (0.82 per rating point, multiplied by a
  // scoring archetype up to 1.35) had a 78 rated shooting guard averaging 27 a
  // night and an 88 averaging 37, which is a top ten season in league history.
  // It also pinned against the 38 cap so an 88 and a 95 scored the same. The
  // shallower slope lands on real reference points: a solid starter around 17,
  // an All Star around 25, an MVP season around 31, with 38 still reachable
  // only by an all time scorer having a career year.
  const ppg = Math.min(38, Math.max(4, Math.round((5 + (form - 64) * 0.62) * a.scoring + rng() * 3)));
  const rpg = Math.min(16, Math.max(1, Math.round(((2 + (form - 64) * 0.2) * a.rebounding + rng() * 2) * 10) / 10));
  const apg = Math.min(13, Math.max(0.5, Math.round(((1.5 + (form - 64) * 0.22) * a.playmaking + rng() * 2) * 10) / 10));
  const line: NbaSeasonLine = {
    year: c.year, team: c.team, age: c.age, ovr: c.ovr, games,
    ppg, rpg, apg, awards: [], teamResult: '', salary: c.salary,
  };

  const strength = teamQuality + (c.ovr - 78) * 0.5;
  const playoffOdds = Math.max(0.05, Math.min(0.92, (strength - 66) / 28));
  let result = 'Missed the playoffs';
  if (rng() < playoffOdds) {
    const stages = ['Lost in the first round', 'Lost in the conference semis', 'Lost the Conference Finals', 'Lost the NBA Finals', 'WON THE NBA FINALS'];
    let stage = 0;
    while (stage < 4 && rng() < 0.42 + (strength - 78) / 80) stage++;
    result = stages[stage];
    if (result === 'WON THE NBA FINALS') {
      c.rings += 1;
      c.fanbase = Math.min(100, c.fanbase + 15);
      notes.push('💍 A RING.');
      if (c.ovr >= 88 && rng() < 0.65) { line.awards.push('Finals MVP'); c.finalsMvps += 1; notes.push('🏆 FINALS MVP.'); }
    }
  }
  line.teamResult = result;

  const statScore = ppg * 1.6 + rpg * 1.4 + apg * 1.7;
  if (c.seasons.length === 0 && statScore > 42 && rng() < 0.72) { line.awards.push('Rookie of the Year'); notes.push('🏆 Rookie of the Year.'); }
  if (statScore > 62 && games >= 62) { line.awards.push('All-NBA'); c.allNbas += 1; notes.push('⭐ All-NBA.'); }
  if (statScore > 74 && games >= 62 && c.ovr >= 92 && rng() < 0.3) { line.awards.push('MVP'); c.mvps += 1; notes.push('👑 LEAGUE MVP.'); }

  // ── Round 57: the rest of the trophy case ──
  // The old code only had Rookie of the Year, All-NBA, MVP and Finals MVP, so a
  // rim protecting center or a bench scorer could put together a great career
  // and never win anything. Every archetype now has something to chase.
  const isBig = c.pos === 'C' || c.pos === 'PF';
  if (a.rebounding >= 1.3 && rpg >= 11 && games >= 62 && rng() < 0.45) {
    line.awards.push('Defensive Player of the Year'); notes.push('🛡️ DEFENSIVE PLAYER OF THE YEAR.');
  }
  if (games >= 62 && statScore > 52 && rng() < 0.4) {
    line.awards.push('All-Defensive Team'); notes.push('🔒 All-Defensive Team.');
  }
  if (ppg >= 28 && games >= 62 && rng() < 0.5) {
    line.awards.push('Scoring Champion'); notes.push('🔥 Scoring champion.');
  }
  if (apg >= 10 && games >= 62 && rng() < 0.55) {
    line.awards.push('Assists Leader'); notes.push('🎯 Led the league in assists.');
  }
  if (isBig && rpg >= 12.5 && games >= 62 && rng() < 0.55) {
    line.awards.push('Rebounding Champion'); notes.push('🧲 Led the league in rebounds.');
  }
  // Most Improved needs a real jump from last season, not just a good year.
  const prev = c.seasons[c.seasons.length - 1];
  if (prev && prev.games >= 40 && ppg - prev.ppg >= 6 && games >= 62 && rng() < 0.6) {
    line.awards.push('Most Improved Player'); notes.push('📈 Most Improved Player.');
  }
  // Sixth Man is for solid production on a low usage archetype.
  if (a.scoring <= 0.9 && ppg >= 14 && games >= 62 && rng() < 0.35) {
    line.awards.push('Sixth Man of the Year'); notes.push('🪑 Sixth Man of the Year.');
  }
  if (c.age >= 22 && c.seasons.length <= 1 && statScore > 34 && rng() < 0.5) {
    line.awards.push('All-Rookie Team'); notes.push('🌱 All-Rookie Team.');
  }

  c.earnings += c.salary;
  // Round 98: tell the player when the season itself was the story.
  const sn = swingNote(swing, 'nba');
  if (sn) notes.push(sn);
  c.seasons.push(line);
  return { line, notes };
}

export function nbaProgress(c: NbaCareerState, rng: () => number): string[] {
  const notes: string[] = [];
  const before = c.ovr;
  // Round 57: progression slowed to match the owner's note that careers peak
  // far too fast. Growth is 1-2 a year, and the last points above 84 are the
  // hardest in the game. Late bloomers still exist, they just take longer.
  if (c.age <= 25 && c.ovr < c.pot) {
    const drag = c.ovr >= 92 ? 0.25 : c.ovr >= 88 ? 0.5 : c.ovr >= 84 ? 0.75 : 1;
    const raw = 1 + Math.floor(rng() * 2);
    c.ovr = Math.min(c.pot, c.ovr + Math.max(c.ovr >= 88 ? 0 : 1, Math.round(raw * drag)));
  } else if (c.age <= 28 && c.ovr < c.pot && rng() < 0.45) {
    c.ovr = Math.min(c.pot, c.ovr + 1);
  } else if (c.age >= (NBA_POS_CLIFF_AGE[c.pos] ?? 32)) {
    const wear = (100 - c.health) / 40;
    c.ovr = Math.max(62, Math.round(c.ovr - (1 + rng() * 2 + wear) * (c.age >= 36 ? 1.6 : 1)));
  }
  if (c.ovr - before >= 4) notes.push(`📈 Leap season: ${before} to ${c.ovr}.`);
  if (before - c.ovr >= 3) notes.push(`📉 Father Time checks in: ${before} to ${c.ovr}.`);
  if (c.age >= 31) c.health = Math.max(30, c.health - 3);
  c.age += 1;
  c.year += 1;
  c.contractYears -= 1;
  c.morale = Math.max(20, Math.min(100, c.morale + Math.round(rng() * 10 - 4)));

  // ── Round 57: the corruption meter resolves here ──
  const heat = c.heat ?? 0;
  if (heat > 0) {
    const dm = c.dirtyMoney ?? 0;
    const drift = dm > 0 ? Math.min(8, 2 + dm * 0.5) : -9;
    c.heat = Math.max(0, Math.min(100, heat + drift));
    if ((c.heat ?? 0) >= 90 && (c.suspendedSeasons ?? 0) === 0) {
      c.suspendedSeasons = 1;
      c.dirtyMoney = 0;
      c.fanbase = Math.max(0, c.fanbase - 30);
      c.morale = Math.max(0, c.morale - 25);
      notes.push('🚨 Suspended indefinitely by the commissioner. Every dollar they could trace is gone.');
    } else if ((c.heat ?? 0) >= 65 && (c.heat ?? 0) - drift < 65) {
      notes.push('🕵️ The league has opened a formal investigation.');
    }
  }
  const upkeep = c.yearlyCosts ?? 0;
  if (upkeep > 0) c.netWorth = Math.round(((c.netWorth ?? c.earnings * 0.45) - upkeep) * 10) / 10;
  return notes;
}

export function drawNbaEvent(c: NbaCareerState, rng: () => number): NbaCareerEvent {
  const deck: NbaCareerEvent[] = [];
  if (c.contractYears <= 0) {
    const market = nbaMarketSalary(c);
    deck.push({
      id: 'contract',
      title: 'Contract summer',
      body: `${nbaTeamLabelOf(c.team)} can offer ${Math.round(market * 0.9 * 10) / 10}M to stay. The open market says ${market}M somewhere new.`,
      options: [
        { label: 'Stay loyal', effect: 'Fanbase loves it', apply: (cc) => { cc.salary = Math.round(market * 0.9 * 10) / 10; cc.contractYears = 3; cc.fanbase = Math.min(100, cc.fanbase + 12); cc.morale += 6; return `Re-signed with ${nbaTeamLabelOf(cc.team)} for ${cc.salary}M x3.`; } },
        { label: 'Hit free agency', effect: 'Max money, new city', apply: (cc, r) => { const nt = NBA_TEAMS[Math.floor(r() * NBA_TEAMS.length)].id; cc.team = nt; cc.salary = market; cc.contractYears = 3; cc.fanbase = 42; return `Signed with ${nbaTeamLabelOf(nt)} for ${market}M x3. The decision gets its own show.`; } },
      ],
    });
  }
  deck.push({
    id: 'training',
    title: 'Summer plan',
    body: 'The offseason belongs to you. What gets the hours?',
    options: [
      { label: 'Skill grind', effect: 'Push the ceiling', apply: (cc, r) => { if (cc.age >= 31) { cc.health = Math.min(100, cc.health + 4); return 'Maintenance year. Health +4.'; } const up = 1 + Math.floor(r() * 2); cc.ovr = Math.min(cc.pot + 1, cc.ovr + up); return `Rating +${up}.`; } },
      { label: 'Body work', effect: 'Durability', apply: (cc) => { cc.health = Math.min(100, cc.health + 10); return 'Health +10. Load managed properly.'; } },
      { label: 'Build the brand', effect: 'Fame and money', apply: (cc) => { cc.fanbase = Math.min(100, cc.fanbase + 12); cc.earnings += 5; return 'Signature shoe talks. 5M endorsement banked.'; } },
    ],
  });
  if (c.morale < 55) {
    deck.push({
      id: 'unhappy',
      title: 'The fit is broken',
      body: 'Losing, touches down, trade rumors everywhere.',
      options: [
        { label: 'Demand a trade', effect: 'Fresh start', apply: (cc, r) => { const nt = NBA_TEAMS[Math.floor(r() * NBA_TEAMS.length)].id; cc.team = nt; cc.morale = 74; cc.fanbase = 38; return `Traded to ${nbaTeamLabelOf(nt)}. New chapter.`; } },
        { label: 'Ride it out', effect: 'Respect', apply: (cc) => { cc.morale += 7; cc.fanbase += 4; return 'You stay professional. The league notices.'; } },
      ],
    });
  }
  if (c.health < 72) {
    deck.push({
      id: 'surgery',
      title: 'The knee conversation',
      body: 'A cleanup surgery costs the start of the season but resets the body.',
      options: [
        { label: 'Get the surgery', effect: 'Health back', apply: (cc) => { cc.health = Math.min(100, cc.health + 20); cc.morale -= 3; return 'Surgery done. Slow start, whole body.'; } },
        { label: 'Load management only', effect: 'Risk it', apply: (cc) => { cc.health -= 6; return 'You manage the minutes and cross your fingers.'; } },
      ],
    });
  }
  deck.push({
    id: 'media',
    title: 'Podcast wars',
    body: 'A famous show wants you to speak on the state of the league. Unfiltered.',
    options: [
      { label: 'Full honesty', effect: 'Viral fame', apply: (cc) => { cc.fanbase = Math.min(100, cc.fanbase + 10); cc.morale -= 3; return 'Clips everywhere. The front office is not thrilled.'; } },
      { label: 'Stay in the gym', effect: 'Locker room respect', apply: (cc) => { cc.morale += 4; return 'No distractions. Hooper answer.'; } },
    ],
  });
  // ── Round 57: 90 life events and the corruption deck join the draw ──
  // Everything in those files self-gates, so no extra rules are needed here.
  deck.push(...getNbaLifeEventsA(c, rng));
  deck.push(...getNbaLifeEventsB(c, rng));
  const corrupt = getNbaCorruptionEvents(c, rng);
  deck.push(...corrupt);
  const arcOpen = Object.keys(c.lifeFlags ?? {}).some(k => ['props', 'tank', 'sneaks', 'tamper', 'wash'].includes(k));
  if (arcOpen && corrupt.length > 0 && rng() < 0.45) {
    return corrupt[Math.floor(rng() * corrupt.length)];
  }
  return deck[Math.floor(rng() * deck.length)];
}

export function nbaShouldRetire(c: NbaCareerState): boolean {
  return c.ovr <= 66 || c.age >= 41 || c.seasons.length >= 21;
}

export interface NbaLegacy { score: number; verdict: string; hof: boolean; bullets: string[] }

export function nbaCareerTotals(c: NbaCareerState) {
  let pts = 0, reb = 0, ast = 0, games = 0;
  for (const s of c.seasons) {
    pts += s.ppg * s.games; reb += s.rpg * s.games; ast += s.apg * s.games; games += s.games;
  }
  return { pts: Math.round(pts), reb: Math.round(reb), ast: Math.round(ast), games };
}

export function nbaLegacyOf(c: NbaCareerState): NbaLegacy {
  const t = nbaCareerTotals(c);
  let score = c.rings * 95 + c.mvps * 120 + c.finalsMvps * 70 + c.allNbas * 40 + c.seasons.length * 8 + t.pts / 320;
  score = Math.round(score);
  const hof = score >= 500;
  const verdict = score >= 950 ? 'On the short list. The GOAT debate has your name in it'
    : score >= 650 ? 'First-ballot Hall of Famer, jersey in the rafters'
    : score >= 500 ? 'Hall of Famer'
    : score >= 330 ? 'Beloved star, Hall of Very Good'
    : score >= 170 ? 'A long, real NBA career'
    : 'Ten-day contracts and what-ifs';
  const bullets = [
    `${c.seasons.length} seasons, ${c.rings} ring${c.rings === 1 ? '' : 's'}, ${c.mvps} MVP${c.mvps === 1 ? '' : 's'}, ${c.finalsMvps} Finals MVP${c.finalsMvps === 1 ? '' : 's'}, ${c.allNbas} All-NBA`,
    `${t.pts.toLocaleString()} points, ${t.reb.toLocaleString()} rebounds, ${t.ast.toLocaleString()} assists in ${t.games} games`,
    `${Math.round(c.earnings)}M career earnings, drafted pick ${c.draftPick}`,
  ];
  return { score, verdict, hof, bullets };
}
