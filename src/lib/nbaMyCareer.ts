import type { CareerDraftEntry, PreDraftState } from './careerPreDraft';
import { formatNumber } from './formatNumber';
/**
 * NBA My Career engine (2026-08-05). Basketball sibling of nflMyCareer.ts:
 * a fictional prospect living a whole career inside the real 30-team
 * league. Per-game stat lines (points, rebounds, assists) driven by
 * rating, role, health and team quality; up to three offseason cards (Round 1038);
 * awards, rings, aging, retirement, legacy verdict with GOAT-tier
 * language. The player is fictional; the teams are real.
 */

import { NBA_TEAMS } from '@/data/conquestDataNba';
import { nbaEraNeutral, nbaEraScale } from '@/data/nbaLeagueNorms';
import { usSeasonLength } from '@/data/usSeasonLengths';
import { seasonSwing, swingNote, playoffDepthOf, playoffGames, clutchSwing, clutchNote } from './careerVariance';
import { nbaSeasonScore, wonAward } from './careerAwards';
import { decideNbaAwards, NBA_FIELD } from './nbaCareerAwards';
import { draftRival, judgeRivalSeason } from './careerRival';
import type { CareerRival, RivalSeasonPlay } from './careerRival';
import { keyedRng } from './keyedRng';
import { nbaStatLine } from './usCareerStatLine';

import type { PlayerAppearance } from './soccerCareerAppearance';
import { getNbaLifeEventsA } from './nbaCareerLifeA';
import { getNbaLifeEventsB } from './nbaCareerLifeB';
import { getNbaLifeEventsC } from './nbaCareerLifeC';
import { getNbaCorruptionEvents } from './nbaCareerCorruption';
// Round 179: the shared free agency engine, one implementation for all four sports.
import { buildFaWindow } from './usCareerFreeAgency';
import type { FaWindow, FaPushArgs } from './usCareerFreeAgency';
import { buildExtension, type ExtensionTalk, type ExtPushArgs } from './usCareerExtension';
// Round 184: the shared press room, same one-engine pattern.
import { buildPressMoment, pressFactsFrom, applyPressChoice } from './usCareerPress';
import { pickDeckCard } from './careerEventDeck';
/* Round 470: the money app, the same engine Soccer Career's bank and market
   run on (careerMoney.ts), bound to the NBA in nbaCareerMoney.ts. That file
   imports this one for the NbaCareerState type only, so there is no cycle at
   runtime: the tick is called through the function below, never at module
   scope. */
import type { MoneyState } from './careerMoney';
import { nbaMoneySeasonTick } from './nbaCareerMoney';
/* Round 525: the inbox and the rivalry events, the same lift Round 521 did
   for the NFL. Both auxiliary files import this one for the NbaCareerState
   type only, so there is no cycle at runtime: both ticks are called through
   the functions below, never at module scope. */
import type { InboxMessage } from './careerInbox';
import { receiveNbaInboxTexts } from './nbaCareerInbox';
import type { RivalryEvent } from './careerRivalryEvents';
import { nbaRivalryTick, nbaRivalryChoiceTick } from './nbaCareerRivalryEvents';
import type { RivalryChoiceCard } from './careerRivalryChoices';
import { raiseWithinPotential, ratingRaiseNote } from './careerHeadroom';
import { applyUsCareerAnnualBenefits } from './usCareerAnnualBenefits';
import { careerRecoveryRisk } from './usCareerRecovery';
import { hallCalibrationOf, legacyRead, LEGACY_GAME_RULES, type HallCalibration, type LegacyRead, type LegacyStandout, type LegacyWeights } from './careerHallOfFame';
/* Round 422: the share of gross pay that actually reaches the bank, after tax,
   agent and living. It was already the number this file used to turn career
   earnings into net worth; it is named here so the yearly banking and the
   repair below cannot drift apart from it. */
const TAKE_HOME = 0.45;


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
  /** Round 103: what you did once the regular season ended. */
  poGames?: number; poPpg?: number; poRpg?: number; poApg?: number;
  awards: string[];
  teamResult: string;
  salary: number;
  /** Round 1103: minutes, steals and blocks a game. An absent key is a season saved before Round 1103, whose
   *  whole number points and three part line stay exactly as saved. */
  mpg?: number; spg?: number; bpg?: number;
  /** Round 1103: the club's record that season, the one the awards were decided on. Absent on a season saved
   *  before the round. The key is `clubWins`, not `wins`: other sports' lines use `wins` for a man's own stat. */
  clubWins?: number; clubLosses?: number;
  /** Round 1103: which team an honour was, where the saved award string does not say. Absent when he was not
   *  picked, and on every season saved before the round. */
  allStar?: 'starter' | 'reserve';
  allNbaTeam?: 1 | 2 | 3;
  allDefensiveTeam?: 1 | 2;
  allRookieTeam?: 1 | 2;
}

/** Round 1103: the one test of "a season on the new line" (minutes were never recorded before it). */
export const isNbaNewLine = (s: Pick<NbaSeasonLine, 'mpg'>): boolean => typeof s.mpg === 'number';

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
  /** Round 1103: All-Star selections. Absent on a career with no season played since the round. */
  allStars?: number;
  retired: boolean;
  /** Zero records an undrafted camp signing. */
  draftPick: number;
  prospect?: PreDraftState;
  earnings: number;
  /** Round 57 life layer. All optional so pre-R57 saves keep loading. */
  netWorth?: number;
  dirtyMoney?: number;
  heat?: number;
  suspendedSeasons?: number;
  purchased?: string[];
  lifeFlags?: Record<string, number>;
  appearance?: PlayerAppearance | null;
  /** Round 172: which era this career started in. Absent means today. */
  eraId?: string;
  /** Round 182: the rotation. Absent (pre-182 saves, harness careers)
      means starter, so old behavior is byte for byte unchanged. */
  role?: 'starter' | 'backup';
  yearlyCosts?: number;
  /** Round 104: the player drafted alongside you, measured against you every season. */
  rival?: CareerRival;
  /** Round 470: the savings account, the market and the statement, on the
      same engine as Soccer Career's. Absent on a pre-470 save and repaired
      lazily by ensureNbaMoney, so an old save opens on every screen with its
      market at par. */
  money?: MoneyState;
  /** Round 470: the last dozen headlines the season wrote, kept on the save
      so the News screen does not forget the career on reload. Absent on a
      pre-470 save. */
  headlines?: string[];
  /** Round 525: the inbox, on the same engine the flagship's phone runs
      (careerInbox.ts), bound to the NBA in nbaCareerInbox.ts. Absent on a
      pre-525 save and repaired lazily the way the money app's fields
      already are: an empty inbox and a karma of 50 read the same as a save
      that has never opened the app. */
  phoneInbox?: InboxMessage[];
  phoneUsedIds?: string[];
  karma?: number;
  /** Round 525: the rivalry events, on the same engine the flagship's
      eighteen beats run (careerRivalryEvents.ts), bound in
      nbaCareerRivalryEvents.ts. The SAME rival draftRival already drafts;
      no second rival concept. rivalryIntensity is flavor only, read by
      nothing outside the event table itself. */
  pendingRivalryEvent?: RivalryEvent | null;
  lastRivalryEventId?: number | null;
  rivalryIntensity?: number;
  /** Round 796: a rival choice waiting on an answer (careerRivalryChoices.ts,
      bound in nbaCareerRivalryEvents.ts), and every one this career has
      seen. Absent on a pre-796 save, which reads as nothing pending and
      nothing seen. */
  pendingRivalryChoice?: RivalryChoiceCard | null;
  rivalryChoicesSeen?: string[];
}

export interface NbaCareerEvent {
  id: string;
  title: string;
  body: string;
  options: { label: string; effect: string; apply: (c: NbaCareerState, rng: () => number) => string }[];
  /** Round 918: the table the summer step list will read, the same three
   *  fields the flagship's cards carry (soccerCareerEngine RandomEvent).
   *  Since Round 1038 the summer's cooldown ledger reads them (usCareerSummer.ts); the one card draw never does.
   *  category is the deck's own section; cooldown is seasons the card sits
   *  out after it fires (99 means once a career); cards sharing a story
   *  share one cooldown ledger entry. All optional. */
  category?: string;
  cooldown?: number;
  story?: string;
  /** Round 1038: the press room's card only; cooldowns never hold it out. */
  press?: 'big' | 'small';
  /** Round 1038: set on the corruption deck's cards; the summer deals them as card 1 only. */
  corruption?: boolean;
}

/* ---------- Round 172: era starts, his "add eras to nba" ask ---------- */

/**
 * The 2003-04 league: 29 teams, verified against the 2003-04 season pages
 * on Wikipedia and Basketball Reference. The SuperSonics still in Seattle,
 * the Nets in New Jersey, the Hornets in New Orleans, and no Charlotte
 * franchise at all (the Bobcats arrived the following season). Era-only ids
 * (SEA, NJN, NOH) are unique against the modern list on purpose.
 */
export const NBA_TEAMS_2004: { id: string; city: string; name: string }[] = [
  { id: 'ATL', city: 'Atlanta', name: 'Hawks' }, { id: 'BOS', city: 'Boston', name: 'Celtics' },
  { id: 'CHI', city: 'Chicago', name: 'Bulls' }, { id: 'CLE', city: 'Cleveland', name: 'Cavaliers' },
  { id: 'DAL', city: 'Dallas', name: 'Mavericks' }, { id: 'DEN', city: 'Denver', name: 'Nuggets' },
  { id: 'DET', city: 'Detroit', name: 'Pistons' }, { id: 'GSW', city: 'Golden State', name: 'Warriors' },
  { id: 'HOU', city: 'Houston', name: 'Rockets' }, { id: 'IND', city: 'Indiana', name: 'Pacers' },
  { id: 'LAC', city: 'LA', name: 'Clippers' }, { id: 'LAL', city: 'Los Angeles', name: 'Lakers' },
  { id: 'MEM', city: 'Memphis', name: 'Grizzlies' }, { id: 'MIA', city: 'Miami', name: 'Heat' },
  { id: 'MIL', city: 'Milwaukee', name: 'Bucks' }, { id: 'MIN', city: 'Minnesota', name: 'Timberwolves' },
  { id: 'NJN', city: 'New Jersey', name: 'Nets' }, { id: 'NOH', city: 'New Orleans', name: 'Hornets' },
  { id: 'NYK', city: 'New York', name: 'Knicks' }, { id: 'ORL', city: 'Orlando', name: 'Magic' },
  { id: 'PHI', city: 'Philadelphia', name: '76ers' }, { id: 'PHX', city: 'Phoenix', name: 'Suns' },
  { id: 'POR', city: 'Portland', name: 'Trail Blazers' }, { id: 'SAC', city: 'Sacramento', name: 'Kings' },
  { id: 'SAS', city: 'San Antonio', name: 'Spurs' }, { id: 'SEA', city: 'Seattle', name: 'SuperSonics' },
  { id: 'TOR', city: 'Toronto', name: 'Raptors' }, { id: 'UTA', city: 'Utah', name: 'Jazz' },
  { id: 'WAS', city: 'Washington', name: 'Wizards' },
];

export interface NbaEraDef {
  id: 'now' | 'y2004';
  label: string;
  startYear: number;
  blurb: string;
  /** Contract money scale against the modern game: the 2003-04 cap was
   *  about 44 million against the modern game's roughly 140, so era deals
   *  pay about a third. No cap number appears on screen. */
  moneyScale: number;
  teams: { id: string; city: string; name: string }[];
}

export const NBA_ERAS: NbaEraDef[] = [
  {
    id: 'now', label: '2026', startYear: 2026, moneyScale: 1,
    teams: [],
    blurb: 'The league as it is today. Full money, all 30 franchises.',
  },
  {
    id: 'y2004', label: '2003-04 throwback', startYear: 2003, moneyScale: 0.31, teams: NBA_TEAMS_2004,
    blurb: 'The 29 team league of 2003-04: the SuperSonics in Seattle, the Nets in New Jersey, the Hornets in New Orleans, no Charlotte yet. Contracts pay 2003 money.',
  },
];

export function nbaEraById(id?: string): NbaEraDef {
  return NBA_ERAS.find(e => e.id === id) ?? NBA_ERAS[0];
}

/** The draft pool for an era. The modern era reads the live NBA_TEAMS list
 *  lazily (never at module scope, per the import-order lesson). */
export function nbaEraTeamIds(eraId?: string): string[] {
  const era = nbaEraById(eraId);
  if (era.id === 'now') return NBA_TEAMS.map(x => x.id);
  return era.teams.map(x => x.id);
}

export function nbaTeamLabelOf(id: string, eraId?: string): string {
  /* Round 172: era names first when asked, then the modern league, then the
     2003-04 list, so era-only ids always print a real name. */
  const era = nbaEraById(eraId);
  const inEra = era.teams.find(x => x.id === id);
  if (inEra) return `${inEra.city} ${inEra.name}`;
  const t = NBA_TEAMS.find(x => x.id === id);
  if (t) return `${t.city} ${t.name}`;
  const old = NBA_TEAMS_2004.find(x => x.id === id);
  return old ? `${old.city} ${old.name}` : id;
}

export function startNbaCareer(
  name: string, pos: NbaCareerPos, archetype: NbaArchetype, rng: () => number = Math.random,
  appearance?: PlayerAppearance | null, eraId?: string, entry?: CareerDraftEntry,
): NbaCareerState {
  /* Round 172: the era decides the year, the draft pool and the money. */
  const era = nbaEraById(eraId);
  const teamIds = nbaEraTeamIds(eraId);
  const base = entry?.ratingAfter ?? (68 + Math.floor(rng() * 8) + archetype.ovrBoost);
  const pot = entry?.pot ?? Math.min(99, base + 10 + Math.floor(rng() * 13) + archetype.potBoost);
  const stock = entry ? entry.pick ?? 0 : Math.max(1, Math.round(62 - (base - 66) * 5.5 + rng() * 22));
  const team = entry?.team ?? teamIds[Math.floor(rng() * teamIds.length)];
  const lottery = stock > 0 && stock <= 14;
  const c: NbaCareerState = {
    name, pos, archetype, team,
    year: entry ? entry.draftYear + entry.devSeasons.length : era.startYear, age: entry?.ageAfter ?? (19 + Math.floor(rng() * 3)),
    ovr: base, pot,
    morale: 70, fanbase: lottery ? 60 : 35, health: entry?.health ?? 100,
    salary: Math.max(0.5, Math.round((lottery ? (16 - stock) * 0.7 + 6 : 2.5) * era.moneyScale * 10) / 10),
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
  // Round 104: draft the rival at the same moment the player is created.
  c.rival = draftRival(pos, c.ovr, c.pot, c.age, c.team, rng);
  if (era.id !== 'now') c.eraId = era.id;
  if (entry) c.prospect = entry.prospect;
  return c;
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
  { id: 'recovery_nba', name: 'Recovery Suite', emoji: '🧊', category: 'body', cost: 2, yearly: 0.12, desc: 'Cryo, compression, the whole circus, 2M. Injuries can still happen.', oneTime: true, minNetWorth: 3, effect: '25% lower simulated injury risk' },
  { id: 'shot_doctor', name: 'Private Shooting Coach', emoji: '🎯', category: 'body', cost: 0, yearly: 0.2, desc: 'The guy who rebuilt three All Stars, 200k a year', oneTime: true, effect: 'Rating +1 each offseason through age 25, up to your ceiling' },
  { id: 'sleep_nba', name: 'Sleep Program', emoji: '😴', category: 'body', cost: 0.7, desc: 'Turns out most of it is sleep, 700k', oneTime: true, effect: 'Health +8' },
  { id: 'psych_nba', name: 'Sports Psychologist', emoji: '🧠', category: 'body', cost: 0, yearly: 0.12, desc: 'The part nobody used to talk about, 120k a year', oneTime: true, effect: 'Morale +8 on hire' },
  { id: 'biomech_nba', name: 'Biomechanics Team', emoji: '🔬', category: 'body', cost: 1.2, desc: 'They rebuilt your landing mechanics, 1.2M', oneTime: true, effect: 'Rating +2, up to your ceiling' },
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
    case 'biomech_nba': s.ovr = raiseWithinPotential(s.ovr, s.pot, 2); log = `They rebuilt how you land and everything got easier. ${ratingRaiseNote(c.ovr, s.ovr, 2)}`; break;
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

/* ─── Round 182: the rotation ───
   Same depth chart the NFL career got, in basketball's shape: the man
   ahead of you is modeled off the roster's quality, top-five picks open
   in the starting five, camps have hysteresis both ways, and a bench
   season is real minutes (about 60 percent of a starter's) rather than a
   full stat line, which finally makes the Sixth Man award mean what it
   says. An absent role (pre-182 saves, harness careers) means starter,
   byte for byte. */

function nbaIncumbentOvr(teamQuality: number, rng: () => number): number {
  return Math.round(teamQuality - 7 + rng() * 8);
}

/** Draft-night rotation spot. Mutates c.role, returns the feed line. */
export function nbaAssignRole(c: NbaCareerState, teamQuality: number, rng: () => number = Math.random): string {
  const incumbent = nbaIncumbentOvr(teamQuality, rng);
  if (c.draftPick > 0 && c.draftPick <= 5) {
    c.role = 'starter';
    return '📋 Top five picks do not sit. You open in the starting five.';
  }
  if (c.ovr >= incumbent + 2) {
    c.role = 'starter';
    return '📋 Preseason settled it. You start opening night.';
  }
  c.role = 'backup';
  return '📋 The veteran keeps the spot for now. You open with the second unit.';
}

/** The training camp fight. Mutates c.role, returns a line or null. */
export function nbaCampBattle(c: NbaCareerState, teamQuality: number, rng: () => number = Math.random): string | null {
  if (!c.role) c.role = 'starter'; /* pre-182 save repair */
  const incumbent = nbaIncumbentOvr(teamQuality, rng);
  if (c.role === 'starter') {
    if (c.ovr < incumbent - 5) {
      c.role = 'backup';
      c.morale = Math.max(20, c.morale - 10);
      return '🪑 Moved to the second unit. The new arrival took your spot in camp.';
    }
    return null;
  }
  const p = Math.max(0.05, Math.min(0.9, 0.1 + (c.ovr - incumbent) * 0.07));
  if (c.ovr >= incumbent - 1 || rng() < p) {
    c.role = 'starter';
    c.morale = Math.min(100, c.morale + 10);
    return '🚀 You cracked the starting five. Opening night, your name gets called.';
  }
  return '🪑 Still the second unit. The minutes will come, keep pushing.';
}

export function nbaMarketSalary(c: NbaCareerState): number {
  const posMult = NBA_POS_SALARY_MULT[c.pos] ?? 1;
  /* Round 172: era money. A 2003 deal pays 2003 money, about a third. */
  const scale = nbaEraById(c.eraId).moneyScale;
  return Math.max(0.8, Math.round(((c.ovr - 66) * 2.3 - 6) * posMult * scale * 10) / 10);
}

/* ─── Round 1103: the line ───────────────────────────────────────────────────
   One season's averages from a form, a job and a role: minutes, times what he produces a minute, times the
   league's level that year. Pure: it reads nothing but its input, mutates nothing, and always takes exactly
   NBA_LINE_DRAWS draws in the same order (bench share, minutes, points, rebounds, assists, steals, blocks),
   used or not, so a seeded career replays and another caller can hand it a rival's season.

   The noise is a multiplier. The line it replaces added up to two assists and two rebounds to everybody, which
   is what had a centre passing like a guard.

   WHAT IT GIVES. Healthy starters of modern careers, mean points/rebounds/assists by rating, with the minutes.
   Measured 2026-10-07 by scripts/simNbaAwardsSense.mjs on the real engine (6,000 careers a seed, seeds 1 to 5;
   this is seed 1, and the five agree to a tenth or two):
     rating   minutes   PG             SG             SF             PF             C
     72-75    26.6      9.2/2.7/3.6    10.2/3.1/1.7   9.3/4.0/2.4    9.1/4.2/1.5    8.8/6.2/1.4
     76-79    28.8      12.1/3.2/4.6   13.2/3.7/2.2   12.1/4.8/3.0   12.1/5.2/2.0   11.7/7.6/1.8
     80-83    31.0      15.8/3.8/5.8   17.3/4.4/2.8   15.9/5.8/3.9   15.8/6.2/2.5   15.1/9.1/2.2
     84-87    32.9      20.2/4.4/6.9   21.4/5.1/3.5   19.9/6.7/4.7   19.6/7.3/3.0   18.9/10.6/2.7
     88-91    34.6      24.8/5.0/8.0   26.2/5.8/4.2   24.8/7.6/5.7   23.5/8.4/3.3   22.8/12.2/3.1
   Rookies rated 75 to 79 average 8.0 points (starters 9.5, bench 5.8). Bench seasons: 7.7 points in 17.2
   minutes. Thirty points a game is under 3 percent of starter seasons and ten assists under 1.

   HOW THE CONSTANTS WERE SET. The median healthy starter at every position has to sit inside the real starters'
   quartiles for 2025-26 in all six columns (src/data/nbaLeagueNorms.ts; section A of the harness). The brief's
   starting constants put 26 of 30 cells inside. Five were then moved, each only to bring a cell in or off an
   edge, never to chase a run:
     NBA_POS_REB (new): SF 0.92 and PF 0.75. A rebounding rate with no position in it had a power forward
       at 8.4 a game where the real starters' quartiles are 4.4 to 6.8.
     NBA_POS_STL: PG 1.5 to 1.25 (1.5 a game sat on the top edge), C 0.8 to 1.2 (0.5 a game was under the band).
     NBA_POS_BLK: SG 0.35 to 0.55 (under the band), C 1.25 to 0.9 (1.4 sat on the top edge).
     The upper points line 0.0695 + d * 0.0222 to 0.0811 + d * 0.0212 (the same kink; the p99 starter season
       came down from 34.4 points to 33.4, a point under the league leaders' mean plus one sd).
     NBA_POS_AST SF 0.75 to 0.85: at 0.75 thirty elite careers found one triple double season between them, so
       the triple double badge hung on a coin. At 0.85 they find four or five, and SG and SF starters at eight
       assists are 1.0 to 1.3 percent of theirs (main: 19 percent). */
export interface NbaLineInput {
  /** Exactly the form simNbaSeason computes: rating, morale, club and the season's swing. */
  form: number;
  pos: NbaCareerPos;
  archetype: NbaArchetype;
  /** An absent role on the save is a starter, as it always was. */
  role: 'starter' | 'backup';
  /** Seasons on the save before this one: 0 is a rookie, who earns his minutes. */
  seasonsPlayed: number;
  /** The season's start year, for the league's level that year. */
  year: number;
  playoffs?: boolean;
}
export interface NbaLineNumbers { mpg: number; ppg: number; rpg: number; apg: number; spg: number; bpg: number }
export const NBA_LINE_DRAWS = 7;

/** What a position passes, steals and blocks, a 36 minute starter of average hands. */
const NBA_POS_AST: Record<NbaCareerPos, number> = { PG: 1.0, SG: 0.8, SF: 0.85, PF: 0.7, C: 0.8 };
const NBA_POS_REB: Record<NbaCareerPos, number> = { PG: 1, SG: 1, SF: 0.92, PF: 0.75, C: 1 };
const NBA_POS_STL: Record<NbaCareerPos, number> = { PG: 1.25, SG: 1.3, SF: 1.2, PF: 1.0, C: 1.2 };
const NBA_POS_BLK: Record<NbaCareerPos, number> = { PG: 0.3, SG: 0.55, SF: 0.55, PF: 0.8, C: 0.9 };

/** Steals and blocks by the kind of player, keyed by archetype ID because the archetype object is saved by
 *  value (an old save's archetype has no new field; an id this table has never heard of reads as average).
 *  `rep` is the awards' thumb for defence, in standard deviations: negative means voters rate his defence.
 *  It is an estimate and is named as one. */
export const NBA_ARCH_DEFENSE: Record<string, { stl: number; blk: number; rep: number }> = {
  pointgod: { stl: 1.15, blk: 0.6, rep: 0 }, scoringpg: { stl: 0.95, blk: 0.6, rep: 0.5 }, pest: { stl: 1.6, blk: 0.7, rep: -0.6 },
  bucket: { stl: 0.9, blk: 0.7, rep: 0.5 }, sniper: { stl: 0.8, blk: 0.6, rep: 0.3 }, twoway: { stl: 1.45, blk: 1.1, rep: -0.6 },
  alpha: { stl: 0.9, blk: 0.8, rep: 0.4 }, threed: { stl: 1.5, blk: 1.3, rep: -0.6 }, pointforward: { stl: 1.0, blk: 0.8, rep: 0 },
  stretch4: { stl: 0.8, blk: 0.9, rep: 0.3 }, bruiser: { stl: 0.8, blk: 1.0, rep: 0 }, swiss: { stl: 1.05, blk: 1.1, rep: -0.2 },
  paintbeast: { stl: 0.7, blk: 1.35, rep: -0.2 }, stretch: { stl: 0.7, blk: 1.0, rep: 0.3 }, anchor: { stl: 0.9, blk: 1.7, rep: -0.7 },
};
const NBA_DEFENSE_UNKNOWN = { stl: 1, blk: 1, rep: 0 };

const clampTo = (x: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, x));
const tenth = (x: number): number => Math.round(x * 10) / 10;

export function nbaStatLineFor(input: NbaLineInput, rng: () => number): NbaLineNumbers {
  const u1 = rng(); const u2 = rng(); const u3 = rng(); const u4 = rng(); const u5 = rng(); const u6 = rng(); const u7 = rng();
  const a = input.archetype;
  const d = input.form - 64;
  const era = nbaEraScale(input.year);
  const def = NBA_ARCH_DEFENSE[a.id] ?? NBA_DEFENSE_UNKNOWN;
  const po = input.playoffs === true;
  const bench = input.role === 'backup';
  /* Round 182's bench share, unchanged: a second unit season is about three fifths of a starter's minutes. */
  let minutes = clampTo(28 + (input.form - 76.5) * 0.42, 20, 38)
    * (bench ? 0.55 + u1 * 0.1 : 1)
    * (input.seasonsPlayed === 0 ? 0.86 : input.seasonsPlayed === 1 ? 0.94 : 1)
    * (0.95 + u2 * 0.1);
  /* Rotations shorten in the playoffs: a starter plays a couple more. */
  if (po && !bench) minutes += 2;
  minutes = clampTo(minutes, 8, 42);
  const pointsRate = Math.max(0.20 + d * 0.011, 0.0811 + d * 0.0212) * (1 + (a.scoring - 1) * 0.6);
  const ppg = clampTo(pointsRate * minutes * era.pts * (0.92 + u3 * 0.16), 1, po ? 42 : 38);
  const rpg = clampTo((0.12 + d * 0.0048) * a.rebounding * NBA_POS_REB[input.pos] * minutes * era.reb * (0.92 + u4 * 0.16), 0.5, po ? 18 : 16);
  const apg = clampTo((0.045 + d * 0.0052) * a.playmaking * NBA_POS_AST[input.pos] * minutes * era.ast * (0.92 + u5 * 0.16), 0.3, po ? 14 : 13);
  const hands = (0.75 + d * 0.012) * minutes / 36;
  const spg = clampTo(NBA_POS_STL[input.pos] * def.stl * hands * era.stl * (0.8 + u6 * 0.4), 0.1, 3);
  const bpg = clampTo(NBA_POS_BLK[input.pos] * def.blk * hands * era.blk * (0.8 + u7 * 0.4), 0, 4);
  return { mpg: tenth(minutes), ppg: tenth(ppg), rpg: tenth(rpg), apg: tenth(apg), spg: tenth(spg), bpg: tenth(bpg) };
}

/** Round 1103: the games a club plays in the season that starts in `year`, off the two sourced ledger Round 1048
 *  keeps (src/data/usSeasonLengths.ts). A season the ledger holds with no single length (2012-13, 2019-20), or
 *  does not hold at all, plays 82: the engine has to play something, and 82 is what it always played. */
export function nbaSeasonGames(year: number): number {
  return usSeasonLength('nba', year) ?? 82;
}

function gamesFor(c: NbaCareerState, rng: () => number): { games: number; note: string | null } {
  const L = nbaSeasonGames(c.year);
  const risk = careerRecoveryRisk('nba', c.purchased, (1 - c.archetype.durability) * 0.5 + (100 - c.health) / 240);
  if (rng() < risk) {
    /* With L at 82 every number here is what the old line returned for the same draws. */
    const missed = 8 + Math.floor(rng() * 35);
    const lost = Math.round(missed * L / 82);
    return { games: Math.max(Math.round(20 * L / 82), L - lost), note: `Missed ${lost} games hurt.` };
  }
  return { games: L - 4 + Math.floor(rng() * 5), note: null };
}

/* ─── Round 1112: the rival plays on the player's own line ───
   Until this round the rival's season came off careerRival.ts's own copy of the line before Round 1103 (whole
   number points off a rating, no archetype, no minutes, no bench) and the player's score was bridged onto that
   scale at the call site, so about one judged year in three printed a verdict the two printed lines
   contradicted. Now his season is nbaStatLineFor, the function the player's own line comes from, fed HIS rating
   and form, and it is printed by nbaStatLine, the function that prints the player's.

   What is fixed for a rival, read off him and never drawn:
     archetype  one of his position's three, by a hash of his name and position.
     role       a starter, every rival, every year. He is the man from your draft class who got the job. A bench
                season scores under half a starter's (section A3 of scripts/simNbaAwardsSense.mjs), so a rival
                on a bench for his career would be a formality, not a rivalry.
   What the season hands him: its year (the league's level that year), the seasons his draft class has played
   (he is a rookie when you are, and earns his minutes the same way) and the season's real length off the
   ledger. He plays all of it.

   THE STREAM. The line before this round took one draw of the season's stream after the swing. This takes
   exactly that one and seeds a keyed stream with it (his name, the year, the draw), which pays for the line's
   seven draws and the All-Star pass's nine. So the player's own stream is what it was, draw for draw: his
   lines, his awards and every card he is dealt off that stream do not move (scripts/simNbaAwardsSense.mjs
   section R holds a digest of them). */

/** The rival's kind of player. Fixed for him. */
export function nbaRivalArchetype(r: Pick<CareerRival, 'name' | 'pos'>): NbaArchetype {
  const list = NBA_ARCHETYPES[r.pos as NbaCareerPos] ?? NBA_ARCHETYPES.PG;
  return list[Math.floor(keyedRng(`nba-rival-kind|${r.name}|${r.pos}`)() * list.length)];
}
/** The rival's job. Fixed for every rival (see above). */
export const NBA_RIVAL_ROLE: NbaLineInput['role'] = 'starter';

/** The rival's season of `year`, as the hook judgeRivalSeason takes (careerRival.ts, RivalSeasonPlay).
 *  `seasonsPlayed` is the player's own count going in: the two were drafted together. */
export function nbaRivalSeason(year: number, seasonsPlayed: number): RivalSeasonPlay {
  return (r, form, rng) => {
    const keyed = keyedRng(`nba-rival|${r.name}|${year}|${rng()}`);
    const archetype = nbaRivalArchetype(r);
    const pos = (r.pos in NBA_ARCHETYPES ? r.pos : 'PG') as NbaCareerPos;
    const stat = nbaStatLineFor({ form, pos, archetype, role: NBA_RIVAL_ROLE, seasonsPlayed, year }, keyed);
    /* Did he make the All-Star roster? The same pass that decides the player's (nbaCareerAwards.ts), on his
       line. A rival has no club record and no following on the save, so both are the field's own middle (an
       even club, the average fanbase): his line is the whole of his case. Only the All-Star answer is read. */
    const L = nbaSeasonGames(year);
    const won = decideNbaAwards(keyed, {
      pos, defenceRep: (NBA_ARCH_DEFENSE[archetype.id] ?? NBA_DEFENSE_UNKNOWN).rep,
      bench: NBA_RIVAL_ROLE === 'backup', rookie: seasonsPlayed === 0, year, seasonLength: L, games: L,
      ppg: stat.ppg, rpg: stat.rpg, apg: stat.apg, spg: stat.spg, bpg: stat.bpg,
      winShare: 0.5, madePlayoffs: false, fanbase: NBA_FIELD.fans[0], prev: null, everAllNba: false,
    });
    return {
      line: nbaStatLine({ ppg: stat.ppg, rpg: stat.rpg, apg: stat.apg, mpg: stat.mpg, teamResult: '' }),
      score: nbaSeasonScore(nbaEraNeutral(stat, year)),
      year, allStar: !!won.allStar,
    };
  };
}

/** Round 1048: every team result simNbaSeason writes, in playoff depth order. The Season Center reads the
 *  stage by exact equality against this list, never out of a sentence (the Round 103 rule). */
export const NBA_MISSED_PLAYOFFS = 'Missed the playoffs';
export const NBA_PLAYOFF_RESULTS = ['Lost in the first round', 'Lost in the conference semis', 'Lost the Conference Finals', 'Lost the NBA Finals', 'WON THE NBA FINALS'] as const;
/** Round 1103: the wins a result implies, of 82 (the game's own rule, the same numbers the Season Center's
 *  bands carry in src/lib/season/nba.ts). simNbaSeason draws the club's record inside its result's band. */
export const NBA_RECORD_BANDS: Record<string, readonly [number, number]> = {
  'Missed the playoffs': [17, 40], 'Lost in the first round': [41, 52], 'Lost in the conference semis': [45, 57],
  'Lost the Conference Finals': [48, 61], 'Lost the NBA Finals': [50, 64], 'WON THE NBA FINALS': [52, 67],
};

export function simNbaSeason(
  c: NbaCareerState, teamQuality: number, rng: () => number,
): { line: NbaSeasonLine; notes: string[] } {
  const notes: string[] = [];
  /* Round 1103: the All-Star vote is in February, so it reads the fanbase he tipped off with, before a title's
     bump lands. */
  const fansAtTipOff = c.fanbase;
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
  /* Round 182: bench minutes are real minutes, about 60 percent of a
     starter's, so the per-game line scales with the role. An absent role
     is a starter.
     Round 1103: the whole line comes from nbaStatLineFor above (minutes by role, production a minute, the
     league's level that year), and a season now records its minutes, steals and blocks too. */
  const role: 'starter' | 'backup' = c.role === 'backup' ? 'backup' : 'starter';
  const seasonsPlayed = c.seasons.length;
  const L = nbaSeasonGames(c.year);
  const stat = nbaStatLineFor({ form, pos: c.pos, archetype: a, role, seasonsPlayed, year: c.year }, rng);
  const { ppg, rpg, apg } = stat;
  if (c.role === 'backup') notes.push('🪑 Second unit season: your numbers come in bench minutes.');
  const line: NbaSeasonLine = {
    year: c.year, team: c.team, age: c.age, ovr: c.ovr, games,
    ppg, rpg, apg, awards: [], teamResult: '', salary: c.salary,
    mpg: stat.mpg, spg: stat.spg, bpg: stat.bpg,
  };
  /* The season card's stat line stays three parts (the hub tile has room for three), so the rest is said here. */
  notes.push(`📊 ${stat.mpg.toFixed(1)} mpg, ${stat.spg.toFixed(1)} spg, ${stat.bpg.toFixed(1)} bpg.`);
  // Round 123: computed up here rather than down with the rest of the awards
  // because Finals MVP is decided inside the playoff block below and it needs
  // the same number everything else is judged on.
  /* Round 1103: every score that judges a season reads the line with the era's level divided out, so a 2004
     season is measured against 2004's league. The saved and printed line stays raw. */
  const statScore = nbaSeasonScore(nbaEraNeutral(line, c.year));

  const strength = teamQuality + (c.ovr - 78) * 0.5;
  const playoffOdds = Math.max(0.05, Math.min(0.92, (strength - 66) / 28));
  let result: string = NBA_MISSED_PLAYOFFS;
  let poStage = -1;
  if (rng() < playoffOdds) {
    const stages = NBA_PLAYOFF_RESULTS;
    let stage = 0;
    while (stage < 4 && rng() < 0.42 + (strength - 78) / 80) stage++;
    poStage = stage;
    result = stages[stage];
    if (result === 'WON THE NBA FINALS') {
      c.rings += 1;
      c.fanbase = Math.min(100, c.fanbase + 15);
      notes.push('💍 A RING.');
      // Round 123: you have already won the title to be standing here, so the
      // field is the handful of people on your own team who could take it off
      // you. The old ovr >= 88 gate meant a title team's best player could be
      // ineligible for the trophy his own run earned. Michael Jordan holds the
      // record with six.
      if (wonAward(rng, 'nba', 'finalsMvp', c.pos, statScore)) {
        line.awards.push('Finals MVP'); c.finalsMvps += 1; notes.push('🏆 FINALS MVP.');
      }
    }
  }
  line.teamResult = result;
  /* Round 1103: the club's record, one draw inside the band its result implies, higher for a stronger club.
     Saved, because the MVP is decided on it; the Season Center shows this record when the key is there. */
  {
    const [lo, hi] = NBA_RECORD_BANDS[result] ?? NBA_RECORD_BANDS[NBA_MISSED_PLAYOFFS];
    const t = clampTo(0.5 + (strength - 78) / 36 + (rng() - 0.5) * 0.6, 0, 1);
    line.clubWins = Math.round((lo + Math.round((hi - lo) * t)) * L / 82);
    line.clubLosses = L - line.clubWins;
  }

  // Round 103: the postseason is its own performance, not a sentence.
  const depth = playoffDepthOf(poStage >= 0, poStage);
  if (depth >= 0) {
    const poG = playoffGames(depth, rng, 'nba');
    const clutch = clutchSwing(rng);
    // Defences tighten and rotations shorten, so scoring dips a little for
    // everyone before the player's own clutch roll is applied.
    const poForm = form + clutch - 1.5;
    line.poGames = poG;
    /* Round 1103: the same function as the regular season, on the playoff form. */
    const po = nbaStatLineFor({ form: poForm, pos: c.pos, archetype: a, role, seasonsPlayed, year: c.year, playoffs: true }, rng);
    line.poPpg = po.ppg;
    line.poRpg = po.rpg;
    line.poApg = po.apg;
    notes.push(`📊 Playoffs: ${poG} games, ${po.ppg.toFixed(1)} ppg, ${po.rpg.toFixed(1)} rpg, ${po.apg.toFixed(1)} apg.`);
    const cn = clutchNote(clutch, depth, 'nba');
    if (cn) notes.push(cn);
  }

  /* Round 123: an award is a draw against the rest of the league, never a bare threshold (MVP used to be
     gated on an overall of 92 the engine never reached, so it fired exactly zero times, and All-NBA was a
     threshold you cleared every year forever). See careerAwards.ts.
     Round 1103: the season's awards are decided TOGETHER, in one pass that knows the club's record
     (nbaCareerAwards.ts). MVP needs the All-NBA First Team and a playoff club, the defensive awards read a
     defence score, All-Rookie is for a first season, the Rookie of the Year is on its first team, and the
     real games rule applies from 2023-24. Finals MVP stays above, inside the title it belongs to. */
  const prev = c.seasons[c.seasons.length - 1];
  const won = decideNbaAwards(rng, {
    pos: c.pos, defenceRep: (NBA_ARCH_DEFENSE[a.id] ?? NBA_DEFENSE_UNKNOWN).rep,
    bench: c.role === 'backup', rookie: c.seasons.length === 0,
    year: c.year, seasonLength: L, games,
    ppg, rpg, apg, spg: stat.spg, bpg: stat.bpg,
    winShare: (line.clubWins ?? 0) / L, madePlayoffs: result !== NBA_MISSED_PLAYOFFS,
    fanbase: fansAtTipOff,
    prev: prev && prev.teamResult !== 'SUSPENDED' ? { year: prev.year, games: prev.games, ppg: prev.ppg, rpg: prev.rpg, apg: prev.apg } : null,
    everAllNba: c.allNbas > 0,
  });
  for (const award of won.awards) line.awards.push(award);
  if (won.allStar) { line.allStar = won.allStar; c.allStars = (c.allStars ?? 0) + 1; }
  if (won.allNbaTeam) { line.allNbaTeam = won.allNbaTeam; c.allNbas += 1; }
  if (won.allDefensiveTeam) line.allDefensiveTeam = won.allDefensiveTeam;
  if (won.allRookieTeam) line.allRookieTeam = won.allRookieTeam;
  const has = (award: string): boolean => won.awards.includes(award);
  const TEAM = ['', 'First', 'Second', 'Third'];
  /* The notes keep their emoji: the season curtain tones a line by the first one. */
  if (won.allStar) notes.push(won.allStar === 'starter' ? '⭐ All-Star starter.' : '⭐ All-Star reserve.');
  if (has('Rookie of the Year')) notes.push('🏆 Rookie of the Year.');
  if (won.allNbaTeam) notes.push(`⭐ All-NBA ${TEAM[won.allNbaTeam]} Team.`);
  if (has('MVP')) { c.mvps += 1; notes.push('👑 LEAGUE MVP.'); }
  if (has('Defensive Player of the Year')) notes.push('🛡️ DEFENSIVE PLAYER OF THE YEAR.');
  if (won.allDefensiveTeam) notes.push(`🔒 All-Defensive ${TEAM[won.allDefensiveTeam]} Team.`);
  if (has('Scoring Champion')) notes.push('🔥 Scoring champion.');
  if (has('Assists Leader')) notes.push('🎯 Led the league in assists.');
  if (has('Rebounding Champion')) notes.push('🧲 Led the league in rebounds.');
  if (has('Most Improved Player')) notes.push('📈 Most Improved Player.');
  if (has('Sixth Man of the Year')) notes.push('🪑 Sixth Man of the Year.');
  if (won.allRookieTeam) notes.push(`🌱 All-Rookie ${TEAM[won.allRookieTeam]} Team.`);

  c.earnings += c.salary;
  // Round 98: tell the player when the season itself was the story.
  const sn = swingNote(swing, 'nba');
  if (sn) notes.push(sn);
  // Round 104: the rival played his season too, on the same scale as mine,
  // so the head to head is an honest comparison rather than a vibe.
  if (c.rival && !c.rival.retired) {
    /* Round 1112: he plays his season on my line (nbaRivalSeason above), so the two scores are one scale and
       no bridge stands between them. */
    for (const n of judgeRivalSeason(c.rival, statScore, c.name, 'nba', rng, nbaRivalSeason(c.year, seasonsPlayed))) notes.push(n);
  }
  /* Round 525: the rivalry beat, rolled right after the rival's own season,
     the same point in the loop the flagship and the NFL binding roll their
     own. A fired beat waits as a pending card; the board applies it through
     dismissNbaRivalryEvent, never here, so the state this function hands
     back stays the pure season sim it always was. */
  const rivalryEvent = nbaRivalryTick(c, rng);
  if (rivalryEvent) c.pendingRivalryEvent = rivalryEvent;
  /* Round 796: a season the beat roll left empty can put a rival choice in
     front of you instead, answered on the board, never applied here. It
     rolls on its own seasonChoiceRng, never this season's stream. */
  else nbaRivalryChoiceTick(c);
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
  /* Round 182: a second-unit year wears on you and the crowd learns other names. */
  if (c.role === 'backup') {
    c.morale = Math.max(20, c.morale - 3);
    c.fanbase = Math.max(0, c.fanbase - 2);
  }

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
  /* Round 422: THE YEAR'S PAY IS BANKED HERE, and until this round it never was.
     Reported by the owner playing the game: "none of my money is going into my
     account, it just keeps going into the negatives even when I am making 30
     million dollars a year." Exactly right, and the line above was the whole
     story. It subtracted upkeep and added NOTHING, and the `?? earnings * 0.45`
     fallback only fires while netWorth is undefined, so after the first year it
     was a number that could only ever go down.
     The `if (upkeep > 0)` gate hid the other half of it: a player who buys
     nothing has no upkeep, so his net worth never moved off his signing bonus no
     matter what he earned. Both halves are gone; the pay lands every year.
     TAKE_HOME is the same 0.45 this file already used to turn career earnings
     into money actually banked, so no new number is invented here, it is just
     applied every year instead of once.
     The fallback deliberately uses earnings MINUS this year's salary, because
     the season sim adds the salary to earnings before this runs, and crediting
     both would pay a legacy save twice for the same season. */
  const upkeep = c.yearlyCosts ?? 0;
  const priorNet = c.netWorth ?? Math.round(Math.max(0, c.earnings - c.salary) * TAKE_HOME * 10) / 10;
  c.netWorth = Math.round((priorNet + c.salary * TAKE_HOME - upkeep) * 10) / 10;
  /* Round 470: the money app's season, after the pay and the upkeep have
     landed, the same place in the loop Soccer Career and the NFL career run
     it. Savings pays, every price moves, and a balance the upkeep has pushed
     under the floor is covered out of savings and then holdings before
     anything else sees it. Its own random stream, so nothing here shifts the
     season's rng. */
  for (const line of nbaMoneySeasonTick(c).events) notes.push(line);
  /* Round 525: the inbox. Silent on purpose, the same way the flagship's
     phone never announces a new text in the season feed: the unread badge
     on the Inbox box is the tell. Round 822: it delivers on the basketball
     calendar and draws from its own keyed stream, never this season's rng,
     and it is told whether the career goes on (the same nbaShouldRetire the
     board asks right after this returns), so a player who retires this
     summer is never sent a text about next season. */
  const support = applyUsCareerAnnualBenefits(c, 'nba', c.age - 1);
  if (support) notes.push(support);
  receiveNbaInboxTexts(c, !nbaShouldRetire(c));
  return notes;
}

/* Round 179: the real free agency window. Replaces the old two-button
   'contract' card in the event deck; the board now guarantees this screen
   before any season starts with no deal. */
export function buildNbaFaWindow(c: NbaCareerState, incumbentQuality: number, rng: () => number = Math.random): FaWindow {
  return buildFaWindow({
    sport: 'nba',
    currentTeam: c.team,
    pool: nbaEraTeamIds(c.eraId).map(id => ({ id, label: nbaTeamLabelOf(id, c.eraId) })),
    market: nbaMarketSalary(c),
    discount: 0.9,
    minSalary: 0.8,
    ovr: c.ovr,
    age: c.age,
    accolades: c.allNbas,
    cliffAge: NBA_POS_CLIFF_AGE[c.pos] ?? 32,
    incumbentQuality,
    rng,
  });
}

export function nbaFaPushArgs(c: NbaCareerState, rng: () => number = Math.random): FaPushArgs {
  return { ovr: c.ovr, age: c.age, accolades: c.allNbas, cliffAge: NBA_POS_CLIFF_AGE[c.pos] ?? 32, rng };
}

/* Round 207: the extension talk, the decision that comes BEFORE free
   agency. Same wrapper shape as the window above: this file owns the
   sport's numbers, usCareerExtension.ts owns the rules. */
export function buildNbaExtension(c: NbaCareerState, rng: () => number = Math.random): ExtensionTalk {
  return buildExtension({
    sport: 'nba',
    team: c.team,
    label: nbaTeamLabelOf(c.team, c.eraId),
    market: nbaMarketSalary(c),
    minSalary: 0.8,
    ovr: c.ovr,
    age: c.age,
    accolades: c.allNbas,
    cliffAge: NBA_POS_CLIFF_AGE[c.pos] ?? 32,
    rng,
  });
}

export function nbaExtPushArgs(c: NbaCareerState, rng: () => number = Math.random): ExtPushArgs {
  return { ovr: c.ovr, age: c.age, accolades: c.allNbas, cliffAge: NBA_POS_CLIFF_AGE[c.pos] ?? 32, rng };
}

/** Round 1038: the whole deck, built exactly as drawNbaEvent builds it, a big
 *  press moment included first (marked press 'big'). The summer deals from it. */
export function nbaEventDeck(c: NbaCareerState, rng: () => number): NbaCareerEvent[] {
  return buildNbaDeck(c, rng, false).deck;
}

/** One card, every draw what it always was. */
export function drawNbaEvent(c: NbaCareerState, rng: () => number): NbaCareerEvent {
  const { big, deck, corrupt, arcOpen } = buildNbaDeck(c, rng, true);
  if (big) return big;
  return pickDeckCard(deck, corrupt, arcOpen, rng);
}

function buildNbaDeck(c: NbaCareerState, rng: () => number, stopAtBig: boolean): { big: NbaCareerEvent | null; deck: NbaCareerEvent[]; corrupt: NbaCareerEvent[]; arcOpen: boolean } {
  const deck: NbaCareerEvent[] = [];
  /* Round 179: the 'contract' card left this deck for the free agency window. */

  /* Round 184: the press room reads the season. Big moments take the floor
     outright; the smaller questions join the deck. */
  const press = buildPressMoment('nba', pressFactsFrom(c, nbaTeamLabelOf(c.team, c.eraId)), rng);
  let big: NbaCareerEvent | null = null;
  if (press) {
    const ev: NbaCareerEvent = {
      id: press.id, title: press.title, body: press.body, press: press.big ? 'big' : 'small',
      options: press.options.map(o => ({
        label: o.label, effect: o.effectLine,
        apply: (cc: NbaCareerState, r: () => number) => applyPressChoice(cc, o, r),
      })),
    };
    if (press.big) {
      big = ev;
      if (stopAtBig) return { big, deck, corrupt: [], arcOpen: false };
    }
    deck.push(ev);
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
        { label: 'Demand a trade', effect: 'Fresh start', apply: (cc, r) => { /* Round 1103: a trade lands somewhere else, never back at the club he asked out of. */ const ids = nbaEraTeamIds(cc.eraId).filter(id => id !== cc.team); const nt = ids[Math.floor(r() * ids.length)]; cc.team = nt; cc.morale = 74; cc.fanbase = 38; return `Traded to ${nbaTeamLabelOf(nt, cc.eraId)}. New chapter.`; } },
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
  deck.push(...getNbaLifeEventsC(c, rng)); /* Round 918: deck C, 36 cards, draws nothing from rng */
  const corrupt = getNbaCorruptionEvents(c, rng);
  /* Round 1038: marked, so the summer keeps the integrity arc to card 1. */
  for (const e of corrupt) e.corruption = true;
  deck.push(...corrupt);
  const arcOpen = Object.keys(c.lifeFlags ?? {}).some(k => ['props', 'tank', 'sneaks', 'tamper', 'wash'].includes(k));
  return { big, deck, corrupt, arcOpen };
}

export function nbaShouldRetire(c: NbaCareerState): boolean {
  return c.ovr <= 66 || c.age >= 41 || c.seasons.length >= 21;
}

export interface NbaLegacy { score: number; verdict: string; hof: boolean; bullets: string[]; standout?: LegacyRead['standout'] }

/** The career's real totals. Round 1103: a career with a season on the new line also carries `newLinePts`,
 *  the points of those seasons alone, which the calibration 2 legacy table reads as a term of its own (see
 *  NBA_LEGACY_NEW_LINE_SCALE). It is part of `pts`, never added to it, never printed and never a standout. A
 *  career with no such season returns exactly the four keys it always did. */
export function nbaCareerTotals(c: NbaCareerState) {
  let pts = 0, reb = 0, ast = 0, games = 0, newLine = 0;
  for (const s of c.seasons) {
    pts += s.ppg * s.games; reb += s.rpg * s.games; ast += s.apg * s.games; games += s.games;
    if (isNbaNewLine(s)) newLine += s.ppg * s.games;
  }
  const totals = { pts: Math.round(pts), reb: Math.round(reb), ast: Math.round(ast), games };
  return newLine > 0 ? { ...totals, newLinePts: Math.round(newLine) } : totals;
}

/** Round 1103: what the POINTS of a season on the new line are worth to the legacy score against a season on
 *  the old one. 1 is no adjustment. The new line scores about a fifth lower than the old on purpose, and the
 *  Hall of Fame is held, not recalibrated, in this round: this is the one lever, set from the measured Hall
 *  rate (scripts/simNbaAwardsSense.mjs section H, the table in docs/audits/NBA-LINE-NORMS-2026-10.md). It
 *  weighs the points TERM only: it enters the calibration 2 table as a term of its own on the new line's
 *  points (NBA_NEW_LINE_TERM), so every total the scorer, the standout and the ballot card read is the
 *  career's real one. The legacy recalibration round replaces it. */
export const NBA_LEGACY_NEW_LINE_SCALE: number = 1.4;
/** The constant as the table carries it: the new line's points at the points term's own rate (430 a point)
 *  times the constant less one, a whole number (1,075 at 1.4). The marks ledger records the same number as a
 *  fixed added term (scripts/genCareerHallMarks.mjs, FIXED_BASE), and section 19 of scripts/simCareerHall.mjs
 *  fails when the two differ, so the constant cannot move without the ledger. */
const NBA_NEW_LINE_TERM = { stat: 'newLinePts', per: Math.round(430 / (NBA_LEGACY_NEW_LINE_SCALE - 1)) };

/* Round 1051: the legacy score reads a table per calibration through the one
   scorer (legacyRead, careerHallOfFame.ts). Calibration 1 is the Round 123
   formula below to the last bit; a career is read on the calibration it
   retired on (hallCalibrationOf). */
const NBA_LEGACY_V1: LegacyWeights = {
  awards: { rings: 95, mvps: 155, finalsMvps: 90, allNbas: 48 },
  season: 8,
  positions: { '*': { terms: [{ stat: 'pts', per: 430 }] } },
};
/* Calibration 2 (Round 1051). It contains calibration 1 unchanged (the same
   awards, the same season weight, each position's old terms first and in
   order) and only adds, so no career scores lower on it. What it adds:
   a base where calibration 1 read nothing, and the standout: a career total
   near the top of this game's books for the position, in any family on the
   list, earns credit of its own (legacyRead; only the best family counts).
   Every from and to mark, the list itself (the half rule) and the measured
   base terms come from scripts/data/careerHallMarks.json, which
   scripts/genCareerHallMarks.mjs derives from measured careers; section 17 of
   scripts/simCareerHall.mjs fails if this table and that ledger disagree.
   Round 1103 (the fix pass of 2026-10-08): the marks were measured again on the
   new stat line, where a centre no longer passes like a guard (so the big
   men's assists left the list by the half rule), and every position gained
   one fixed term, the points of seasons on the new line (NBA_NEW_LINE_TERM). */
const NBA_LEGACY_V2: LegacyWeights = {
  awards: { rings: 95, mvps: 155, finalsMvps: 90, allNbas: 48 },
  season: 8,
  positions: {
    PG: {
      terms: [{ stat: 'pts', per: 430 }, NBA_NEW_LINE_TERM],
      standout: [
        { stat: 'pts', from: 31000, to: 38700, label: 'points' },
        { stat: 'ast', from: 10700, to: 13700, label: 'assists' },
      ],
    },
    SG: {
      terms: [{ stat: 'pts', per: 430 }, NBA_NEW_LINE_TERM],
      standout: [
        { stat: 'pts', from: 32500, to: 39900, label: 'points' },
        { stat: 'reb', from: 7850, to: 9610, label: 'rebounds' },
        { stat: 'ast', from: 5420, to: 6470, label: 'assists' },
      ],
    },
    SF: {
      terms: [{ stat: 'pts', per: 430 }, NBA_NEW_LINE_TERM],
      standout: [
        { stat: 'pts', from: 31800, to: 39900, label: 'points' },
        { stat: 'reb', from: 10400, to: 11800, label: 'rebounds' },
        { stat: 'ast', from: 8270, to: 10300, label: 'assists' },
      ],
    },
    PF: {
      terms: [{ stat: 'pts', per: 430 }, NBA_NEW_LINE_TERM],
      standout: [
        { stat: 'pts', from: 28700, to: 34100, label: 'points' },
        { stat: 'reb', from: 11000, to: 13400, label: 'rebounds' },
      ],
    },
    C: {
      terms: [{ stat: 'pts', per: 430 }, NBA_NEW_LINE_TERM],
      standout: [
        { stat: 'pts', from: 26700, to: 32200, label: 'points' },
        { stat: 'reb', from: 15600, to: 18400, label: 'rebounds' },
      ],
    },
    '*': { terms: [{ stat: 'pts', per: 430 }, NBA_NEW_LINE_TERM] },
  },
};
export const NBA_LEGACY_WEIGHTS: Record<HallCalibration, LegacyWeights> = { 1: NBA_LEGACY_V1, 2: NBA_LEGACY_V2 };

/* Round 1103 (the fix pass of 2026-10-08): the standout marks Round 1051 measured on the OLD stat line, frozen
   here as that round committed them (e313f183). Nobody can play an old line season any more, so they can never
   be measured again. A mark is a place in this game's books, and the books an old line season belongs to are
   these: an old line career totals about a quarter more points than a new line one, and its wings and big men
   pass like guards, so read against the new marks half of them would stand out. */
/* Tuples (stat, from, to, label) on purpose: the Hall harness's own controls rewrite the marks of the table above
   by their shape, and these are not theirs to move. */
const NBA_STANDOUT_OLD_LINE: Record<string, Array<[stat: string, from: number, to: number, label: string]>> = {
  PG: [['pts', 37400, 45300, 'points'], ['ast', 14800, 17800, 'assists']],
  SG: [['pts', 38800, 47100, 'points'], ['reb', 8560, 10000, 'rebounds'], ['ast', 9790, 11300, 'assists']],
  SF: [['pts', 37100, 45300, 'points'], ['reb', 11500, 12900, 'rebounds'], ['ast', 13500, 16000, 'assists']],
  PF: [['pts', 31800, 36400, 'points'], ['reb', 14400, 17200, 'rebounds'], ['ast', 10100, 12300, 'assists']],
  C: [['pts', 29800, 35200, 'points'], ['reb', 15200, 17800, 'rebounds'], ['ast', 7490, 8930, 'assists']],
};

/** Round 1103: the calibration 2 table a career is read on. The standout marks follow the line the career was
 *  played on, by its share of games on the new line. No game on it: Round 1051's marks, to the bit, so a career
 *  retired between the two rounds keeps the ballot it was told (src/test/nbaOldSaveLines.test.ts holds that).
 *  Every game on it: NBA_LEGACY_WEIGHTS[2] itself, the table the marks ledger and scripts/simCareerHall.mjs
 *  restate. In between: a straight line from one mark to the other, and a family only one book lists (a big
 *  man's assists) fades with the share. Nothing here is tuned: both sets of marks are measured. */
export function nbaLegacyTableFor(c: Pick<NbaCareerState, 'pos' | 'seasons'>): LegacyWeights {
  let games = 0, onNew = 0;
  for (const s of c.seasons) { games += s.games; if (isNbaNewLine(s)) onNew += s.games; }
  const w = games > 0 ? onNew / games : 1;
  if (w === 1) return NBA_LEGACY_V2;
  const now = NBA_LEGACY_V2.positions[c.pos] ?? NBA_LEGACY_V2.positions['*'];
  const old: LegacyStandout[] = (NBA_STANDOUT_OLD_LINE[c.pos] ?? []).map(([stat, from, to, label]) => ({ stat, from, to, label }));
  const next = now.standout ?? [];
  const top = LEGACY_GAME_RULES.standoutTop;
  const standout: LegacyStandout[] = [];
  for (const o of old) {
    const n = next.find(x => x.stat === o.stat);
    if (w === 0) standout.push(o);
    else if (n) standout.push({ ...o, from: o.from + (n.from - o.from) * w, to: o.to + (n.to - o.to) * w });
    else standout.push({ ...o, top: top * (1 - w) });
  }
  if (w > 0) for (const n of next) if (!old.some(o => o.stat === n.stat)) standout.push({ ...n, top: top * w });
  return { ...NBA_LEGACY_V2, positions: { ...NBA_LEGACY_V2.positions, [c.pos]: { terms: now.terms, standout } } };
}

export function nbaLegacyOf(c: NbaCareerState): NbaLegacy {
  const t = nbaCareerTotals(c);
  /* Round 123 recalibration. MVP used to be unreachable here, so mvps * 120
     was a term that never once fired and the whole verdict leant on All-NBA
     and raw points. Now that an MVP is a real thing you can win, it is worth
     what it should be. Measured over 1100 careers after: median score 295,
     Hall of Fame 18.0 percent, GOAT tier 2.4 percent, and a forced 90
     ceiling career gets in 66 percent of the time. */
  /* Round 1103: the table is read as it is written, on the career's real totals. The points of seasons on the
     new line weigh more through the table's own term for them (NBA_NEW_LINE_TERM), so a career with no new
     season adds exactly nothing, and the standout and the ballot card read what he really scored. Calibration
     1 is the Round 123 formula to the last bit: its table has no such term. On calibration 2 the standout
     marks follow the line the career was played on (nbaLegacyTableFor). */
  const cal = hallCalibrationOf(c);
  const read = legacyRead(cal === 2 ? nbaLegacyTableFor(c) : NBA_LEGACY_WEIGHTS[cal], {
    pos: c.pos, seasons: c.seasons.length,
    awards: { rings: c.rings, mvps: c.mvps, finalsMvps: c.finalsMvps, allNbas: c.allNbas },
    totals: t,
  });
  const score = read.score;
  const hof = score >= 500;
  const verdict = score >= 950 ? 'On the short list. The GOAT debate has your name in it'
    : score >= 650 ? 'First-ballot Hall of Famer, jersey in the rafters'
    : score >= 500 ? 'Hall of Famer'
    : score >= 330 ? 'Beloved star, Hall of Very Good'
    : score >= 170 ? 'A long, real NBA career'
    : 'Ten-day contracts and what-ifs';
  const bullets = [
    `${c.seasons.length} seasons, ${c.rings} ring${c.rings === 1 ? '' : 's'}, ${c.mvps} MVP${c.mvps === 1 ? '' : 's'}, ${c.finalsMvps} Finals MVP${c.finalsMvps === 1 ? '' : 's'}, ${c.allNbas} All-NBA${(c.allStars ?? 0) > 0 ? `, ${c.allStars} All-Star` : ''}`,
    `${t.pts.toLocaleString()} points, ${t.reb.toLocaleString()} rebounds, ${t.ast.toLocaleString()} assists in ${formatNumber(t.games)} games`,
    `${Math.round(c.earnings)}M career earnings, ${c.draftPick > 0 ? `drafted pick ${c.draftPick}` : 'undrafted signing'}`,
  ];
  return read.standout ? { score, verdict, hof, bullets, standout: read.standout } : { score, verdict, hof, bullets };
}

/* Round 422: a balance the old bug drove below zero is an ARTEFACT, not a choice
   the player made, and it can be repaired safely because of one fact: buying is
   refused when `item.cost > net`, so spending can never take anyone negative.
   Only upkeep charged against income that was never banked could, and that is
   precisely the bug. So a negative balance is always the defect and never a real
   debt, which is what makes rebuilding it honest rather than a guess.
   It is rebuilt from what the save actually records: take home pay on career
   earnings, minus the one time cost of everything still on the receipt. Past
   upkeep is deliberately NOT re-deducted, because it was charged against a
   balance that had no income in it, so charging it again would keep part of the
   bug. Runs on load, once, and does nothing to a healthy save. */
export function repairNetWorth<T extends { netWorth?: number; earnings: number; purchased?: string[] }>(
  c: T,
  costOf: (id: string) => number,
): T {
  if ((c.netWorth ?? 0) >= 0) return c;
  const spent = (c.purchased ?? []).reduce((sum, id) => sum + costOf(id), 0);
  const rebuilt = Math.max(0, Math.round((c.earnings * TAKE_HOME - spent) * 10) / 10);
  return { ...c, netWorth: rebuilt };
}
