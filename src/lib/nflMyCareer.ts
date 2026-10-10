import type { CareerDraftEntry, PreDraftState } from './careerPreDraft';
/**
 * NFL My Career engine (2026-08-05, the career-for-every-sport push).
 * A cradle to retirement player career: you are a fictional prospect (your name,
 * your position, your archetype) drafted into the real 32-team league.
 * Seasons simulate position-appropriate stat lines driven by your rating,
 * your role and your team's quality; between seasons you make career
 * choices (training focus, holdouts, contract calls, trade requests,
 * playing hurt) that bend the curve. Awards, rings, records, decline,
 * retirement, legacy verdict. The player is explicitly fictional; the
 * teams are real.
 */

// Round 56: five new positions. Every one has its own stat line in simSeason,
// its own award math, its own salary multiplier and its own aging curve, so
// they are real career paths and not reskins of a receiver.
import type { PlayerAppearance } from './soccerCareerAppearance';
import { seasonSwing, swingNote, playoffDepthOf, playoffGames, clutchSwing, clutchNote } from './careerVariance';
import { nflSeasonScore, wonAward } from './careerAwards';
import { usSeasonLength } from '@/data/usSeasonLengths';
import { rookieDeal } from './usCareerRookieDeal';
import { draftRival, judgeRivalSeason } from './careerRival';
import type { CareerRival } from './careerRival';
import { getNflLifeEventsA } from './nflCareerLifeA';
import { getNflLifeEventsB } from './nflCareerLifeB';
import { getNflLifeEventsC } from './nflCareerLifeC';
import { getNflCorruptionEvents } from './nflCareerCorruption';
// Round 179: the shared free agency engine, one implementation for all four sports.
import { buildFaWindow } from './usCareerFreeAgency';
import type { FaWindow, FaPushArgs } from './usCareerFreeAgency';
import { buildExtension, type ExtensionTalk, type ExtPushArgs } from './usCareerExtension';
// Round 184: the shared press room, same one-engine pattern.
import { buildPressMoment, pressFactsFrom, applyPressChoice } from './usCareerPress';
import { pickDeckCard } from './careerEventDeck';
/* Round 469: the money app, the same engine Soccer Career's bank and market
   run on (careerMoney.ts), bound to dollars in nflCareerMoney.ts. That file
   imports this one for the CareerState type only, so there is no cycle at
   runtime: the tick is called through the function below, never at module
   scope. */
import type { MoneyState } from './careerMoney';
import { nflMoneySeasonTick } from './nflCareerMoney';
/* Round 521: the inbox and the rivalry events, the same lift. Both auxiliary
   files import this one for the CareerState type only, so there is no cycle
   at runtime: both ticks are called through the functions below, never at
   module scope. */
import type { InboxMessage } from './careerInbox';
import { receiveNflInboxTexts } from './nflCareerInbox';
import type { RivalryEvent } from './careerRivalryEvents';
import { nflRivalryTick, nflRivalryChoiceTick } from './nflCareerRivalryEvents';
import type { RivalryChoiceCard } from './careerRivalryChoices';
import { countOf, nflCareerStatBullet, nflMajorAward, type NflCareerSums } from './usCareerStatLine';
import { raiseWithinPotential, ratingRaiseNote } from './careerHeadroom';
import { applyUsCareerAnnualBenefits } from './usCareerAnnualBenefits';
import { careerRecoveryRisk } from './usCareerRecovery';
import { hallCalibrationOf, legacyRead, type HallCalibration, type LegacyRead, type LegacyWeights } from './careerHallOfFame';

export type CareerPos = 'QB' | 'RB' | 'WR' | 'TE' | 'LB' | 'CB' | 'EDGE' | 'K';

/** Positions that put up receiving lines. */
export const RECEIVING_POS: CareerPos[] = ['WR', 'TE'];
/** Positions scored on defensive production. */
export const DEFENSIVE_POS: CareerPos[] = ['LB', 'CB', 'EDGE'];

export const NFL_TEAM_NAMES: { abbr: string; label: string }[] = [
  { abbr: 'ARI', label: 'Arizona Cardinals' }, { abbr: 'ATL', label: 'Atlanta Falcons' },
  { abbr: 'BAL', label: 'Baltimore Ravens' }, { abbr: 'BUF', label: 'Buffalo Bills' },
  { abbr: 'CAR', label: 'Carolina Panthers' }, { abbr: 'CHI', label: 'Chicago Bears' },
  { abbr: 'CIN', label: 'Cincinnati Bengals' }, { abbr: 'CLE', label: 'Cleveland Browns' },
  { abbr: 'DAL', label: 'Dallas Cowboys' }, { abbr: 'DEN', label: 'Denver Broncos' },
  { abbr: 'DET', label: 'Detroit Lions' }, { abbr: 'GB', label: 'Green Bay Packers' },
  { abbr: 'HOU', label: 'Houston Texans' }, { abbr: 'IND', label: 'Indianapolis Colts' },
  { abbr: 'JAX', label: 'Jacksonville Jaguars' }, { abbr: 'KC', label: 'Kansas City Chiefs' },
  { abbr: 'LA', label: 'Los Angeles Rams' }, { abbr: 'LAC', label: 'Los Angeles Chargers' },
  { abbr: 'LV', label: 'Las Vegas Raiders' }, { abbr: 'MIA', label: 'Miami Dolphins' },
  { abbr: 'MIN', label: 'Minnesota Vikings' }, { abbr: 'NE', label: 'New England Patriots' },
  { abbr: 'NO', label: 'New Orleans Saints' }, { abbr: 'NYG', label: 'New York Giants' },
  { abbr: 'NYJ', label: 'New York Jets' }, { abbr: 'PHI', label: 'Philadelphia Eagles' },
  { abbr: 'PIT', label: 'Pittsburgh Steelers' }, { abbr: 'SEA', label: 'Seattle Seahawks' },
  { abbr: 'SF', label: 'San Francisco 49ers' }, { abbr: 'TB', label: 'Tampa Bay Buccaneers' },
  { abbr: 'TEN', label: 'Tennessee Titans' }, { abbr: 'WAS', label: 'Washington Commanders' },
];

/* ---------- Round 172: era starts, his "add eras to nfl" ask ---------- */

/**
 * The 2005 league, all 32 franchises as they stood that season, verified
 * against the 2005 season records on Wikipedia and Pro Football Reference:
 * the Raiders in Oakland, the Chargers in San Diego, the Rams in St. Louis.
 * Washington is listed by city alone: the franchise's 2005 nickname is
 * retired and stays out of this site, and "Washington" is how the club is
 * commonly referenced today when writing about those years. Everything else
 * carried today's name in 2005 already.
 */
export const NFL_TEAMS_2005: { abbr: string; label: string }[] = [
  { abbr: 'ARI', label: 'Arizona Cardinals' }, { abbr: 'ATL', label: 'Atlanta Falcons' },
  { abbr: 'BAL', label: 'Baltimore Ravens' }, { abbr: 'BUF', label: 'Buffalo Bills' },
  { abbr: 'CAR', label: 'Carolina Panthers' }, { abbr: 'CHI', label: 'Chicago Bears' },
  { abbr: 'CIN', label: 'Cincinnati Bengals' }, { abbr: 'CLE', label: 'Cleveland Browns' },
  { abbr: 'DAL', label: 'Dallas Cowboys' }, { abbr: 'DEN', label: 'Denver Broncos' },
  { abbr: 'DET', label: 'Detroit Lions' }, { abbr: 'GB', label: 'Green Bay Packers' },
  { abbr: 'HOU', label: 'Houston Texans' }, { abbr: 'IND', label: 'Indianapolis Colts' },
  { abbr: 'JAX', label: 'Jacksonville Jaguars' }, { abbr: 'KC', label: 'Kansas City Chiefs' },
  { abbr: 'STL', label: 'St. Louis Rams' }, { abbr: 'SD', label: 'San Diego Chargers' },
  { abbr: 'OAK', label: 'Oakland Raiders' }, { abbr: 'MIA', label: 'Miami Dolphins' },
  { abbr: 'MIN', label: 'Minnesota Vikings' }, { abbr: 'NE', label: 'New England Patriots' },
  { abbr: 'NO', label: 'New Orleans Saints' }, { abbr: 'NYG', label: 'New York Giants' },
  { abbr: 'NYJ', label: 'New York Jets' }, { abbr: 'PHI', label: 'Philadelphia Eagles' },
  { abbr: 'PIT', label: 'Pittsburgh Steelers' }, { abbr: 'SEA', label: 'Seattle Seahawks' },
  { abbr: 'SF', label: 'San Francisco 49ers' }, { abbr: 'TB', label: 'Tampa Bay Buccaneers' },
  { abbr: 'TEN', label: 'Tennessee Titans' }, { abbr: 'WSH', label: 'Washington' },
];

export interface NflEraDef {
  id: 'now' | 'y2005';
  label: string;
  startYear: number;
  blurb: string;
  /** Contract money scale against the modern game. The 2005 salary cap was
   *  85.5 million against the modern game's roughly 280, which is about a
   *  third, so era deals pay about a third. Nothing on screen quotes the
   *  caps themselves. */
  moneyScale: number;
  teams: { abbr: string; label: string }[];
}

export const NFL_ERAS: NflEraDef[] = [
  {
    id: 'now', label: '2026', startYear: 2026, moneyScale: 1, teams: NFL_TEAM_NAMES,
    blurb: 'The league as it is today. Full money, every current franchise.',
  },
  {
    id: 'y2005', label: '2005 throwback', startYear: 2005, moneyScale: 0.32, teams: NFL_TEAMS_2005,
    blurb: 'The 2005 league: the Raiders in Oakland, the Chargers in San Diego, the Rams in St. Louis. Contracts pay 2005 money, about a third of today.',
  },
];

export function nflEraById(id?: string): NflEraDef {
  return NFL_ERAS.find(e => e.id === id) ?? NFL_ERAS[0];
}

export interface Archetype {
  id: string;
  label: string;
  desc: string;
  ovrBoost: number;
  potBoost: number;
  durability: number; // 0-1 injury resistance modifier
}

export const ARCHETYPES: Record<CareerPos, Archetype[]> = {
  QB: [
    { id: 'cannon', label: 'Cannon Arm', desc: 'Big throws, big turnovers', ovrBoost: 2, potBoost: 4, durability: 0.9 },
    { id: 'surgeon', label: 'Field Surgeon', desc: 'Accuracy and brains, slower start', ovrBoost: 0, potBoost: 6, durability: 1.0 },
    { id: 'dual', label: 'Dual Threat', desc: 'Legs change everything, hits add up', ovrBoost: 3, potBoost: 3, durability: 0.75 },
  ],
  RB: [
    { id: 'bell', label: 'Bellcow', desc: 'Volume monster, wears down', ovrBoost: 3, potBoost: 2, durability: 0.7 },
    { id: 'satellite', label: 'Satellite Back', desc: 'Catches everything, shares the room', ovrBoost: 1, potBoost: 4, durability: 0.95 },
    { id: 'hammer', label: 'The Hammer', desc: 'Short yardage god', ovrBoost: 2, potBoost: 2, durability: 0.85 },
  ],
  WR: [
    { id: 'burner', label: 'Burner', desc: 'Takes the top off', ovrBoost: 2, potBoost: 4, durability: 0.9 },
    { id: 'possession', label: 'Chain Mover', desc: 'Third down security blanket', ovrBoost: 1, potBoost: 4, durability: 1.0 },
    { id: 'alpha', label: 'Alpha X', desc: 'Contested catch king', ovrBoost: 3, potBoost: 3, durability: 0.9 },
  ],
  // ── Round 56: five new position rooms ──
  TE: [
    { id: 'seam', label: 'Seam Stretcher', desc: 'A mismatch every single snap', ovrBoost: 2, potBoost: 4, durability: 0.85 },
    { id: 'inline', label: 'Inline Mauler', desc: 'Blocks like a tackle, catches enough', ovrBoost: 3, potBoost: 2, durability: 0.95 },
    { id: 'joker', label: 'The Joker', desc: 'Lines up everywhere, nobody covers you', ovrBoost: 1, potBoost: 6, durability: 0.8 },
  ],
  LB: [
    { id: 'thumper', label: 'Downhill Thumper', desc: 'Runs downhill, arrives angry', ovrBoost: 3, potBoost: 2, durability: 0.8 },
    { id: 'cover', label: 'Coverage Backer', desc: 'Erases tight ends, tackles pile up', ovrBoost: 1, potBoost: 5, durability: 0.95 },
    { id: 'green', label: 'Green Dot', desc: 'Wears the helmet radio, sees it before it happens', ovrBoost: 2, potBoost: 4, durability: 0.9 },
  ],
  CB: [
    { id: 'island', label: 'Island Corner', desc: 'Left alone on the boundary, thrives there', ovrBoost: 2, potBoost: 5, durability: 0.9 },
    { id: 'nickel', label: 'Nickel Menace', desc: 'Blitzes, tackles, lives in the slot', ovrBoost: 2, potBoost: 3, durability: 0.85 },
    { id: 'ballhawk', label: 'Ball Hawk', desc: 'Gambles constantly, sometimes wins the game', ovrBoost: 1, potBoost: 6, durability: 0.9 },
  ],
  EDGE: [
    { id: 'bender', label: 'Speed Bender', desc: 'Dips under tackles like gravity is optional', ovrBoost: 2, potBoost: 5, durability: 0.85 },
    { id: 'power', label: 'Power Rusher', desc: 'Walks tackles backward into the quarterback', ovrBoost: 3, potBoost: 3, durability: 0.9 },
    { id: 'hybrid', label: 'Hybrid Chess Piece', desc: 'Stands up, puts a hand down, ruins plans', ovrBoost: 1, potBoost: 6, durability: 0.8 },
  ],
  K: [
    { id: 'leg', label: 'The Leg', desc: 'Sixty is in range on a calm day', ovrBoost: 2, potBoost: 4, durability: 1.0 },
    { id: 'clutch', label: 'Ice in December', desc: 'Colder the game, straighter the kick', ovrBoost: 1, potBoost: 5, durability: 1.0 },
    { id: 'journey', label: 'Journeyman Boot', desc: 'Cut four times, still kicking', ovrBoost: 0, potBoost: 3, durability: 1.0 },
  ],
};

/** Round 56: what each position is worth on the open market. Kickers are
    cheap, quarterbacks are the sun, everything else sits in between. */
export const POS_SALARY_MULT: Record<CareerPos, number> = {
  QB: 1.9, RB: 0.9, WR: 1.15, TE: 0.95, LB: 1.0, CB: 1.2, EDGE: 1.45, K: 0.35,
};

/** Age at which each position starts falling off. Running backs know why. */
export const POS_CLIFF_AGE: Record<CareerPos, number> = {
  QB: 34, RB: 28, WR: 31, TE: 32, LB: 31, CB: 30, EDGE: 32, K: 39,
};

export interface SeasonLine {
  year: number;
  team: string;
  age: number;
  ovr: number;
  games: number;
  // QB
  passYds?: number; passTd?: number; ints?: number;
  // RB
  rushYds?: number; rushTd?: number;
  // WR, TE (and RB receiving)
  rec?: number; recYds?: number; recTd?: number;
  // Round 56 defense: LB, CB, EDGE
  tackles?: number; sacks?: number; picks?: number; passDef?: number; forcedFum?: number;
  // Round 56 kicker
  fgMade?: number; fgAtt?: number; longFg?: number;
  /** Round 103: January football, told as numbers rather than a sentence. */
  poGames?: number; poLine?: string;
  awards: string[];
  teamResult: string; // 'Missed playoffs' | 'Lost Wild Card' | ... | 'Won the Super Bowl'
  salary: number;
}

export interface CareerState {
  name: string;
  pos: CareerPos;
  archetype: Archetype;
  team: string;
  year: number;
  age: number;
  ovr: number;
  pot: number;
  morale: number;   // 0-100
  fanbase: number;  // 0-100
  health: number;   // 0-100, permanent wear
  salary: number;
  contractYears: number;
  seasons: SeasonLine[];
  rings: number;
  mvps: number;
  allPros: number;
  retired: boolean;
  /** Zero records an undrafted camp signing. */
  draftPick: number;
  prospect?: PreDraftState;
  earnings: number;
  /** Round 56 life layer. All optional so pre-R56 saves keep loading. */
  netWorth?: number;          // millions actually banked, after tax and living
  dirtyMoney?: number;        // millions nobody can explain
  heat?: number;              // 0-100 league security interest
  suspendedSeasons?: number;  // >0 means the next season is served banned
  purchased?: string[];       // shop item ids
  lifeFlags?: Record<string, number>; // chained storyline arcs
  appearance?: PlayerAppearance | null;
  yearlyCosts?: number;       // millions per year from purchased upkeep
  /** Round 104: the player drafted alongside you, measured against you every season. */
  rival?: CareerRival;
  /** Round 172: which era this career started in. Absent means today. */
  eraId?: string;
  /** Round 182: the depth chart. Absent (pre-182 saves, harness careers)
      means starter, so every old save and every existing sim path keeps
      its exact behavior. Kickers are always starters. */
  role?: 'starter' | 'backup';
  /** Round 469: the savings account, the market and the statement, on the
      same engine as Soccer Career's. Absent on a pre-469 save and repaired
      lazily by ensureNflMoney, so an old save opens on every screen with its
      market at par. */
  money?: MoneyState;
  /** Round 469: the last dozen headlines the season wrote, kept on the save
      so the News screen does not forget the career on reload. Absent on a
      pre-469 save. */
  headlines?: string[];
  /** Round 521: the inbox, on the same engine the flagship's phone runs
      (careerInbox.ts), bound to the NFL in nflCareerInbox.ts. Absent on a
      pre-521 save and repaired lazily the way the money app's fields
      already are: an empty inbox and a karma of 50 read the same as a save
      that has never opened the app. */
  phoneInbox?: InboxMessage[];
  phoneUsedIds?: string[];
  karma?: number;
  /** Round 521: the rivalry events, on the same engine the flagship's
      eighteen beats run (careerRivalryEvents.ts), bound in
      nflCareerRivalryEvents.ts. The SAME rival draftRival already drafts;
      no second rival concept. rivalryIntensity is flavor only, read by
      nothing outside the event table itself. */
  pendingRivalryEvent?: RivalryEvent | null;
  lastRivalryEventId?: number | null;
  rivalryIntensity?: number;
  /** Round 796: a rival choice waiting on an answer (careerRivalryChoices.ts,
      bound in nflCareerRivalryEvents.ts), and every one this career has
      seen. Absent on a pre-796 save, which reads as nothing pending and
      nothing seen. */
  pendingRivalryChoice?: RivalryChoiceCard | null;
  rivalryChoicesSeen?: string[];
}

export interface CareerEvent {
  id: string;
  title: string;
  body: string;
  /** Round 917: the deck section a card sits under, the seasons it rests
      after it fires, and a key shared by cards that tell one story. All
      optional; since Round 1038 the summer's cooldown ledger reads them (nflCareerLifeTags.ts, usCareerSummer.ts). */
  category?: import('./nflCareerLifeTags').NflLifeCategory;
  cooldown?: number;
  story?: string;
  /** Round 1038: set on the press room's card only. Press moments react to
      the season, so the summer's cooldowns never hold them out. */
  press?: 'big' | 'small';
  /** Round 1038: set on the corruption deck's cards; the summer deals them as card 1 only. */
  corruption?: boolean;
  options: { label: string; effect: string; apply: (c: CareerState, rng: () => number) => string }[];
}

/* Round 1104: in this game a kicker is drafted in round four or later. It is
   a rule of the game, stated as one (a kicker went second overall here on
   first pick money). Both roads to the draft read it: the quick start adds
   it to the stock it rolls, and the road to the draft adds it to the board
   rank (nflCareerPreDraft.ts), so a kicker's stock still orders him among
   kickers. 96 is three rounds of 32. */
export const NFL_KICKER_PICK_OFFSET = 96;
export function nflPickOffset(pos: string | undefined): number {
  return pos === 'K' ? NFL_KICKER_PICK_OFFSET : 0;
}

/* Round 1104: a rookie is paid his draft slot (src/lib/usCareerRookieDeal.ts
   over the two sourced table in src/data/nflRookieScale.ts), not a formula:
   the old one paid the first pick 32.8M a year, and the real 2026 first pick
   signed for 14.3M a year. */
function nflRookieSalary(eraId: string, slot: number, pos: string): number {
  return rookieDeal('nfl', eraId, slot, pos)!.salary;
}

export function startCareer(
  name: string, pos: CareerPos, archetype: Archetype, rng: () => number = Math.random,
  appearance?: PlayerAppearance | null, eraId?: string, entry?: CareerDraftEntry,
): CareerState {
  /* Round 172: the era decides the year, the league you are drafted into
     and the money. Leaving it off is today's league, byte for byte. */
  const era = nflEraById(eraId);
  const base = entry?.ratingAfter ?? (66 + Math.floor(rng() * 8) + archetype.ovrBoost);
  const pot = entry?.pot ?? Math.min(99, base + 10 + Math.floor(rng() * 14) + archetype.potBoost);
  // draft stock from rating: better prospects go earlier
  const stock = entry ? entry.pick ?? 0 : Math.max(1, Math.round(90 - (base - 64) * 9 + rng() * 40)) + nflPickOffset(pos);
  const team = entry?.team ?? era.teams[Math.floor(rng() * era.teams.length)].abbr;
  const firstRound = stock > 0 && stock <= 32;
  const c: CareerState = {
    name, pos, archetype, team,
    year: entry ? entry.draftYear + entry.devSeasons.length : era.startYear,
    age: entry?.ageAfter ?? (22),
    ovr: base,
    pot,
    morale: 70,
    fanbase: firstRound ? 55 : 35,
    health: entry?.health ?? 100,
    salary: nflRookieSalary(era.id, stock, pos),
    contractYears: 4,
    seasons: [],
    rings: 0, mvps: 0, allPros: 0,
    retired: false,
    draftPick: stock,
    earnings: 0,
    // Round 56 life layer
    netWorth: firstRound ? 0.6 : 0.1,
    dirtyMoney: 0,
    heat: 0,
    suspendedSeasons: 0,
    purchased: [],
    lifeFlags: {},
    appearance: appearance ?? null,
    yearlyCosts: 0,
  };
  if (era.id !== 'now') c.eraId = era.id;
  // Round 104: draft the rival at the same moment the player is created.
  c.rival = draftRival(pos, c.ovr, c.pot, c.age, c.team, rng);
  if (entry) c.prospect = entry.prospect;
  return c;
}

export function teamLabelOf(abbr: string, eraId?: string): string {
  /* Round 172: era lists first when asked, then the modern league, then the
     2005 league. The era-only abbrs (STL, SD, OAK, WSH) are unique across
     both lists on purpose, so a life event that never learned about eras
     still prints the right 2005 name instead of a bare abbreviation. */
  const era = nflEraById(eraId);
  return era.teams.find(t => t.abbr === abbr)?.label
    ?? NFL_TEAM_NAMES.find(t => t.abbr === abbr)?.label
    ?? NFL_TEAMS_2005.find(t => t.abbr === abbr)?.label
    ?? abbr;
}

/** Team quality random-walks per season so franchises rise and fall. */
export function rollTeamQuality(prev: number | null, rng: () => number): number {
  if (prev == null) return 68 + Math.floor(rng() * 22);
  return Math.max(62, Math.min(94, Math.round(prev + (rng() * 14 - 7))));
}

/* ─── Round 182: the depth chart ───
   Nobody is handed a job. The man ahead of you on the chart is modeled off
   the team's quality (a 90 roster has a real starter, a 64 roster has a
   guy), draft capital buys a rookie the benefit of the doubt, and every
   camp is a new fight with hysteresis both ways: an incumbent starter is
   not benched over a small gap, and a backup does not need to be twice the
   player to finally get the nod. Kickers are exempt because teams carry
   one kicker. */

/** The player ahead of you on the chart, drawn from the roster's quality. */
function nflIncumbentOvr(teamQuality: number, rng: () => number): number {
  return Math.round(teamQuality - 7 + rng() * 8);
}

/** Draft-day depth chart. Mutates c.role, returns the feed line. */
export function nflAssignRole(c: CareerState, teamQuality: number, rng: () => number = Math.random): string {
  if (c.pos === 'K') { c.role = 'starter'; return '🎯 Kickers do not sit. The job is yours from day one.'; }
  const incumbent = nflIncumbentOvr(teamQuality, rng);
  if (c.draftPick > 0 && c.draftPick <= 12) {
    c.role = 'starter';
    return '📋 Top pick money buys the keys. You open the season as the starter.';
  }
  if (c.ovr >= incumbent + 2) {
    c.role = 'starter';
    return '📋 You outplayed the veteran in camp. The chart has your name on top.';
  }
  c.role = 'backup';
  return '📋 The veteran holds the job for now. You open on the bench, learning.';
}

/** The offseason camp battle. Mutates c.role, returns a feed line or null
    when nothing changed quietly (a starter safely holding is silent). */
export function nflCampBattle(c: CareerState, teamQuality: number, rng: () => number = Math.random): string | null {
  if (c.pos === 'K') { c.role = 'starter'; return null; }
  if (!c.role) c.role = 'starter'; /* pre-182 save repair */
  const incumbent = nflIncumbentOvr(teamQuality, rng);
  if (c.role === 'starter') {
    /* Hysteresis: you lose the job only when you are clearly worse. */
    if (c.ovr < incumbent - 5) {
      c.role = 'backup';
      c.morale = Math.max(20, c.morale - 10);
      return '🪑 Benched. The new man outplayed you all camp and the coaches went with him.';
    }
    return null;
  }
  /* The backup's push: close the gap and the job flips. */
  const p = Math.max(0.05, Math.min(0.9, 0.1 + (c.ovr - incumbent) * 0.07));
  if (c.ovr >= incumbent - 1 || rng() < p) {
    c.role = 'starter';
    c.morale = Math.min(100, c.morale + 10);
    return '🚀 You won the camp battle. The huddle is yours now.';
  }
  return '🪑 Another camp, another year behind the starter. The gap is closing.';
}

/* Round 1104: THE RATE the stat curves are written on, not the length of a
   season. Every production line below is "what a full 17 game year is worth,
   times games played over 17", so a full 16 game season comes out at 16
   seventeenths of a full 17 game one, which is exactly what a shorter
   schedule is. Do not replace this with the season's length: that would hand
   a 2005 player a 17 game year's numbers in 16 games. */
const NFL_RATE_GAMES = 17;

/** Round 1104: how many games a club played in the season that starts in
 *  `year`, off the two sourced ledger (16 from 2005 to 2020, 17 since). A
 *  year the ledger does not hold plays the modern 17. */
export function nflSeasonLength(year: number): number {
  return usSeasonLength('nfl', year) ?? NFL_RATE_GAMES;
}

/* Round 1104: the receiving lines never had the cap the passing, rushing and
   sack lines have, and a 99 rated receiver passed the record book. Each cap
   sits just under its record, so a career year scrapes it and never beats
   it. The records (read 2026-10-07, each from two sources, each still
   standing after the 2025 season):
   receiving yards 1,964 in 2012 (NFL.com, "Calvin Johnson: single-season
   receiving record 'bound to fall at some point'"; CBS Sports, "Calvin Johnson
   can't believe his NFL single-season receiving yards record hasn't been
   broken yet");
   receptions 149 in 2019 (The Analyst, "Who has the most receptions in an NFL
   season?"; CBS Sports, "NFL Honors: Michael Thomas wins Offensive Player of
   the Year after record-setting year for Saints");
   receiving yards by a tight end 1,416 in 2020 (NFL.com, "Chiefs TE Travis
   Kelce sets single-season TE receiving yardage record"; Guinness World
   Records, "Most yards receiving by a tight end in an NFL season"). */
const NFL_WR_REC_CAP = 145;
const NFL_WR_YDS_CAP = 1950;
const NFL_TE_YDS_CAP = 1400;

function seasonGames(c: CareerState, rng: () => number): { games: number; injuryNote: string | null } {
  const len = nflSeasonLength(c.year);
  const risk = careerRecoveryRisk('nfl', c.purchased, (1 - c.archetype.durability) * 0.5 + (100 - c.health) / 260 + (c.pos === 'RB' ? 0.07 : 0));
  if (rng() < risk) {
    const missed = 2 + Math.floor(rng() * 9);
    return { games: Math.max(4, len - missed), injuryNote: `Missed ${missed} games hurt.` };
  }
  return { games: len, injuryNote: null };
}

/* Round 1104: the awards field (careerAwards.ts) was measured on 17 game
   seasons and scores totals, so a 16 game season judged raw is a seventeenth
   short of the field before a down is played: measured, All-Pros a career
   fell to a third in the throwback. The awards therefore read a season on a
   full schedule PACE: every counting stat times 17 over the season's length.
   The kicker's long field goal is a distance, not a volume, and is left as it
   is. This copy is only ever handed to the award score; it is never saved.
   Exported for src/test/nflTruthRules1104.test.ts, which holds it against
   nflSeasonScore itself, so a stat the score reads cannot be left off it. */
export function nflAwardPaceLine(line: SeasonLine, len: number): SeasonLine {
  if (len === NFL_RATE_GAMES) return line;
  const f = NFL_RATE_GAMES / len;
  const pace: SeasonLine = { ...line };
  for (const k of ['passYds', 'passTd', 'ints', 'rushYds', 'rushTd', 'rec', 'recYds', 'recTd', 'tackles', 'sacks', 'picks', 'forcedFum', 'passDef', 'fgAtt', 'fgMade'] as const) {
    const v = line[k];
    if (typeof v === 'number') pace[k] = v * f;
  }
  return pace;
}

/** Round 1048: every team result simSeason writes, in playoff depth order. The Season Center reads the
 *  stage by exact equality against this list, never out of a sentence (the Round 103 rule). */
export const NFL_MISSED_PLAYOFFS = 'Missed the playoffs';
export const NFL_PLAYOFF_RESULTS = ['Lost in the Wild Card round', 'Lost in the Divisional round', 'Lost the Conference Championship', 'Lost the Super Bowl', 'WON THE SUPER BOWL'] as const;

export function simSeason(
  c: CareerState, teamQuality: number, rng: () => number,
): { line: SeasonLine; notes: string[] } {
  const notes: string[] = [];
  let { games, injuryNote } = seasonGames(c, rng);
  if (injuryNote) { notes.push(`🚑 ${injuryNote}`); c.health -= 6; }
  /* Round 182: a backup's season is spot duty. Quarterbacks hold clipboards
     (a few starts when the man goes down), other positions rotate in for
     about half a season's snaps. Kickers never sit and an absent role
     (pre-182 saves, harness careers) means starter, byte for byte. */
  if (c.role === 'backup' && c.pos !== 'K') {
    const share = c.pos === 'QB' ? 0.18 + rng() * 0.14 : 0.45 + rng() * 0.15;
    games = Math.max(1, Math.round(games * share));
    notes.push(`🪑 A backup season: ${games} game${games === 1 ? '' : 's'} of real action.`);
  }
  const swing = seasonSwing(rng, c.age);
  const form = c.ovr + (c.morale - 60) / 10 + (teamQuality - 78) / 5
    // Round 98: the season itself gets a say, so career years and lost
    // years both exist. Averages out to zero across a career.
    + swing;
  const line: SeasonLine = {
    year: c.year, team: c.team, age: c.age, ovr: c.ovr, games,
    awards: [], teamResult: '', salary: c.salary,
  };
  Object.assign(line, nflStatLineFor({ form, pos: c.pos, games }, rng));

  // team result
  const strength = teamQuality + (c.ovr - 74) * (c.pos === 'QB' ? 0.55 : c.pos === 'K' ? 0.08 : DEFENSIVE_POS.includes(c.pos) ? 0.22 : 0.25);
  const playoffOdds = Math.max(0.04, Math.min(0.92, (strength - 66) / 26));
  let result: string = NFL_MISSED_PLAYOFFS;
  let poStage = -1;
  if (rng() < playoffOdds) {
    const runs = NFL_PLAYOFF_RESULTS;
    let stage = 0;
    while (stage < 4 && rng() < 0.42 + (strength - 76) / 90) stage++;
    poStage = stage;
    result = runs[stage];
    if (result === 'WON THE SUPER BOWL') { c.rings += 1; c.fanbase = Math.min(100, c.fanbase + 14); notes.push('💍 A RING.'); }
  }
  line.teamResult = result;

  // Round 103: a playoff run is one to four games, which is far too short a
  // sample for per-game averages to mean anything, so this is a total for
  // the run and it reads the way a broadcast graphic would.
  const depth = playoffDepthOf(poStage >= 0, poStage);
  if (depth >= 0) {
    const poG = playoffGames(depth, rng, 'nfl');
    const clutch = clutchSwing(rng);
    const pf = form + clutch - 1;      // January defences are better
    const per = poG / NFL_RATE_GAMES;
    line.poGames = poG;
    if (c.pos === 'QB') {
      const y = Math.max(0, Math.round((1900 + (pf - 62) * 92) * per));
      const td = Math.max(0, Math.round((6 + (pf - 62) * 0.95) * per));
      const ip = Math.max(0, Math.round((18.5 - (pf - 62) * 0.36) * per));
      line.poLine = `${y} yds, ${td} TD, ${ip} INT`;
    } else if (c.pos === 'RB') {
      const y = Math.max(0, Math.round((260 + (pf - 62) * 46) * per));
      const td = Math.max(0, Math.round((1 + (pf - 62) * 0.42) * per));
      line.poLine = `${y} rush yds, ${td} TD`;
    } else if (c.pos === 'WR' || c.pos === 'TE') {
      const rc = Math.max(0, Math.round((28 + (pf - 62) * 2.5) * per));
      line.poLine = `${rc} rec, ${Math.round(rc * 11)} yds`;
    } else if (c.pos === 'K') {
      const fg = Math.max(0, Math.round((22 + (pf - 62) * 0.5) * per));
      line.poLine = `${fg} of ${fg + (rng() < 0.5 ? 0 : 1)} on field goals`;
    } else {
      const tk = Math.max(0, Math.round((95 + (pf - 62) * 2.4) * per));
      const sk = Math.max(0, Math.round((3 + (pf - 62) * 0.35) * per * 2) / 2);
      /* Round 833: a corner records no sacks in the regular season, so his
         January line is passes defended, on the regular season's own curve at
         its average draw. Derived, no extra rng call, so no draw moves. */
      const pd = Math.max(0, Math.round((11.5 + (pf - 62) * 0.5) * per));
      line.poLine = c.pos === 'CB'
        ? `${countOf(tk, 'tackle', 'tackles')}, ${countOf(pd, 'pass defended', 'passes defended')}`
        : `${countOf(tk, 'tackle', 'tackles')}, ${countOf(sk, 'sack', 'sacks')}`;
    }
    notes.push(`📊 Playoffs: ${poG} game${poG === 1 ? '' : 's'}, ${line.poLine}.`);
    const cn = clutchNote(clutch, depth, 'nfl');
    if (cn) notes.push(cn);
  }

  // awards
  // Round 56: every position is scored on its own currency. Round 123 moved
  // the formula itself into careerAwards.ts, unchanged, because the award
  // model and the harness both have to score a season exactly the way this
  // engine does and two copies of a formula is two formulas.
  /* Round 1104: scored on a full schedule pace, and the games gates sit two
     short of the schedule (15 of 17, 14 of 16), so the smallest injury does
     not shut a 16 game season out of every award. In a 17 game season the
     pace line is the line itself and the gate is the 15 it always was. */
  const seasonLen = nflSeasonLength(line.year);
  const awardGames = seasonLen - 2;
  const statScore = nflSeasonScore(c.pos, nflAwardPaceLine(line, seasonLen));
  const isDef = DEFENSIVE_POS.includes(c.pos);
  const royLabel = isDef ? 'Defensive Rookie of the Year' : 'Offensive Rookie of the Year';
  /* Round 123: every one of these used to be a threshold on your own numbers
     plus a coin flip, which is why a median career here collected TEN first
     team All-Pro seasons. Jerry Rice and Jim Otto share the real record with
     ten, across twenty and fifteen years. Now you have to beat the field:
     one first team quarterback a year out of thirty two starters, three wide
     receivers out of ninety six, and so on. See careerAwards.ts. */
  if (c.seasons.length === 0 && wonAward(rng, 'nfl', 'nflRoy', c.pos, statScore)) {
    line.awards.push(royLabel); notes.push(`🏆 ${royLabel}.`);
  }
  // Round 56: defenders chase Defensive Player of the Year instead of MVP.
  if (isDef && games >= awardGames && wonAward(rng, 'nfl', 'nflDpoy', c.pos, statScore)) {
    line.awards.push('Defensive Player of the Year'); c.mvps += 1; notes.push('🛡️ DEFENSIVE PLAYER OF THE YEAR.');
  }
  if (games >= awardGames && wonAward(rng, 'nfl', 'allPro', c.pos, statScore)) {
    line.awards.push('All-Pro'); c.allPros += 1; notes.push('⭐ First-team All-Pro.');
  }
  // Kickers and defenders do not win MVP. Neither do most people. That gate
  // lives in the MVP table in careerAwards.ts now, which returns nothing at
  // all for a kicker or a defender.
  if (games >= awardGames && wonAward(rng, 'nfl', 'nflMvp', c.pos, statScore)) {
    line.awards.push('MVP'); c.mvps += 1; notes.push('👑 LEAGUE MVP.');
  }

  c.earnings += c.salary;
  // Round 98: tell the player when the season itself was the story.
  const sn = swingNote(swing, 'nfl');
  if (sn) notes.push(sn);
  // Round 104: the rival played his season too, on the same scale as mine,
  // so the head to head is an honest comparison rather than a vibe.
  if (c.rival && !c.rival.retired) {
    for (const n of judgeRivalSeason(c.rival, (((line.passYds ?? 0) + (line.rushYds ?? 0) + (line.recYds ?? 0) + (line.tackles ?? 0) * 9 + (line.fgMade ?? 0) * 30) / 60 + ((line.passTd ?? 0) + (line.rushTd ?? 0) + (line.recTd ?? 0) + (line.sacks ?? 0) + (line.picks ?? 0)) * 2), c.name, 'nfl', rng)) notes.push(n);
  }
  /* Round 521: the rivalry beat, rolled right after the rival's own season,
     the same point in the loop the flagship rolls its own. A fired beat
     waits as a pending card; the board applies it through
     dismissNflRivalryEvent, never here, so the state this function hands
     back stays the pure season sim it always was. */
  const rivalryEvent = nflRivalryTick(c, rng, line);
  if (rivalryEvent) c.pendingRivalryEvent = rivalryEvent;
  /* Round 796: a season the beat roll left empty can put a rival choice in
     front of you instead. Same rule as the beat: it waits on the save as a
     card and is answered on the board, never applied here. It rolls on its
     own seasonChoiceRng, never this season's stream, so every draw after it
     is the draw it always was. */
  else nflRivalryChoiceTick(c);
  c.seasons.push(line);
  return { line, notes };
}

/* ─── Round 1227: one regular season's stat line, as a function ───────────────

   This is the stat block of simSeason, cut out with no draw moved and no
   number changed (Round 1103 cut nbaStatLineFor the same way), so the
   player's season and his rival's are ONE function: the rival plays the
   player's position on the player's own line, with its caps, its halves and
   the season's real length (nflRivalSeason below).

   THE RULES OF THE CUT. It reads its input and `rng` and nothing else. It
   returns only the keys that position records, in the order the block wrote
   them (the saved key order is part of a save, and a key holding undefined
   is not an absent key). The draws are the block's, in the block's order:
   QB 3 (yards, touchdowns, interceptions), RB 4 (rush yards, touchdowns,
   catches, yards a catch), WR 3 and TE 3 (catches, yards a catch,
   touchdowns), LB 4 (tackles, sacks, interceptions, forced fumbles), CB 4
   (tackles, interceptions, passes defended, forced fumbles), EDGE 4 (sacks,
   tackles, forced fumbles, passes defended), K 3 (attempts, accuracy, long).
   src/test/usRivalLine.test.ts holds the counts and the key order. */

/** What a stat line is made from: the form of the season, the position, and the games of real action. */
export interface NflLineInput { form: number; pos: CareerPos; games: number }
/** The stats of one season line, without the season around them. */
export type NflStatLine = Pick<SeasonLine, 'passYds' | 'passTd' | 'ints' | 'rushYds' | 'rushTd' | 'rec' | 'recYds' | 'recTd' | 'tackles' | 'sacks' | 'picks' | 'passDef' | 'forcedFum' | 'fgMade' | 'fgAtt' | 'longFg'>;

export function nflStatLineFor(x: NflLineInput, rng: () => number): NflStatLine {
  const { form, pos } = x;
  const g = x.games / NFL_RATE_GAMES;
  const line: NflStatLine = {};
  if (pos === 'QB') {
    // Round 98: capped just under Peyton Manning's 5477 in 2013, which is
    // the real record. A career year should scrape it, never beat it.
    line.passYds = Math.min(5450, Math.round((1900 + (form - 62) * 92 + rng() * 500) * g));
    line.passTd = Math.max(4, Math.round((6 + (form - 62) * 0.95 + rng() * 6) * g));
    // Round 56 realism fix: the old slope (0.25) meant a 95 rated quarterback
    // still threw 12 interceptions a year, which no elite passer does. Real
    // reference points: elite seasons land around 6 to 9, average starters 12
    // to 14, and bad starters 18 to 20. The steeper slope hits all three.
    line.ints = Math.max(1, Math.round((18.5 - (form - 62) * 0.36 + rng() * 4) * g));
  } else if (pos === 'RB') {
    /* Round 127: the same cap the quarterback line has had since Round 98,
       which the running back line never got. Eric Dickerson ran for 2105 in
       1984 and nobody has beaten it since, so a career year here scrapes it
       and never passes it. Without the cap a peak back cleared the record by
       one to twenty six yards in roughly three runs out of five, and
       simCareerRealism has been failing on it for a while. */
    line.rushYds = Math.min(2080, Math.round((260 + (form - 62) * 46 + rng() * 260) * g));
    line.rushTd = Math.max(0, Math.round((1 + (form - 62) * 0.42 + rng() * 3) * g));
    line.rec = Math.round((14 + (form - 62) * 1.1 + rng() * 12) * g);
    line.recYds = Math.round((line.rec ?? 0) * (6.5 + rng() * 3));
  } else if (pos === 'WR') {
    line.rec = Math.min(NFL_WR_REC_CAP, Math.round((28 + (form - 62) * 2.5 + rng() * 14) * g));
    line.recYds = Math.min(NFL_WR_YDS_CAP, Math.round((line.rec ?? 0) * (10.5 + rng() * 4)));
    line.recTd = Math.max(0, Math.round((1 + (form - 62) * 0.32 + rng() * 3) * g));
  } else if (pos === 'TE') {
    // Tight ends catch fewer, shorter, but score near the goal line.
    line.rec = Math.round((22 + (form - 62) * 1.9 + rng() * 12) * g);
    line.recYds = Math.min(NFL_TE_YDS_CAP, Math.round((line.rec ?? 0) * (9 + rng() * 3.5)));
    line.recTd = Math.max(0, Math.round((2 + (form - 62) * 0.3 + rng() * 3) * g));
  } else if (pos === 'LB') {
    /* Round 144: same treatment the EDGE sack line got in Round 123 (see the
       long note below): the tail of this curve brushed past the harness's
       200 tackle ceiling about once in a few thousand seasons, and a sim
       should never out-stat the record book. Tackles are an unofficial stat
       counted differently across eras, so 200 is the conservative bound the
       realism harness has always used, and the engine now agrees with it. */
    line.tackles = Math.min(200, Math.round((62 + (form - 62) * 3.1 + rng() * 26) * g));
    /* Round 1104: a sack is credited whole or split in two, so the line is
       rounded to halves (it was tenths: 11.3 sacks is not a number football
       has). The same at the two other sack lines below. */
    line.sacks = Math.max(0, Math.round(((form - 66) * 0.18 + rng() * 3) * g * 2) / 2);
    line.picks = Math.max(0, Math.round(((form - 70) * 0.05 + rng() * 2) * g));
    line.forcedFum = Math.max(0, Math.round((rng() * 3) * g));
  } else if (pos === 'CB') {
    line.tackles = Math.round((38 + (form - 62) * 1.2 + rng() * 18) * g);
    line.picks = Math.max(0, Math.round(((form - 68) * 0.11 + rng() * 3) * g));
    line.passDef = Math.round((7 + (form - 62) * 0.5 + rng() * 9) * g);
    line.forcedFum = Math.max(0, Math.round((rng() * 2) * g));
  } else if (pos === 'EDGE') {
    /* Round 123: capped at the real single season record, which nothing in
       this game should ever cross. Myles Garrett has it at 23.0 in 2025, per
       Pro Football Reference's single season leaders; Michael Strahan in 2001
       and T.J. Watt in 2021 share the previous mark at 22.5, and Al Baker's
       23.0 in 1978 sits above both but predates 1982, when sacks became an
       official statistic.

       This came out of Round 123 by accident. simCareerRealism.mjs was going
       red about one run in four on "EDGE sacks: 22.6 beats the real single
       season record of 22.5", and the first assumption was that this round
       had broken something. It had not: measured over 56,000 EDGE seasons,
       the unmodified engine at Round 122 crossed 22.5 three times and topped
       out at 23.1, and this round's engine crossed it once. The bug was two
       separate things wearing each other's coat. The harness bound was STALE,
       written in Round 97 when 22.5 really was the record, and the engine had
       no cap at all, so on the day somebody broke the record in real life the
       harness became both wrong and still, occasionally, right. */
    line.sacks = Math.min(23, Math.max(0, Math.round(((form - 64) * 0.52 + rng() * 5) * g * 2) / 2));
    line.tackles = Math.round((32 + (form - 62) * 1.1 + rng() * 16) * g);
    line.forcedFum = Math.max(0, Math.round(((form - 74) * 0.06 + rng() * 3) * g));
    line.passDef = Math.max(0, Math.round((rng() * 4) * g));
  } else if (pos === 'K') {
    line.fgAtt = Math.round((24 + rng() * 12) * g);
    const acc = Math.min(0.98, 0.66 + (form - 62) * 0.011 + rng() * 0.06);
    line.fgMade = Math.round((line.fgAtt ?? 0) * acc);
    line.longFg = Math.round(48 + (form - 64) * 0.5 + rng() * 12);
  }
  return line;
}

/** End-of-season progression: growth to potential, decline with age and wear. */
export function progress(c: CareerState, rng: () => number): string[] {
  const notes: string[] = [];
  const before = c.ovr;
  // Round 56: progression slowed to match the owner's Soccer Career note
  // ("progression is way too quick"). Growth is 1-2 a year instead of 2-4, and
  // an elite ceiling means the last few rating points are the hardest to get.
  if (c.age <= 26 && c.ovr < c.pot) {
    const ceilingDrag = c.ovr >= 92 ? 0.25 : c.ovr >= 88 ? 0.5 : c.ovr >= 84 ? 0.75 : 1;
    const raw = 1 + Math.floor(rng() * 2);
    const up = Math.max(c.ovr >= 88 ? 0 : 1, Math.round(raw * ceilingDrag));
    c.ovr = Math.min(c.pot, c.ovr + up);
  } else if (c.age <= 29 && c.ovr < c.pot && rng() < 0.45) {
    // Late bloomers still exist, they just take longer to arrive.
    c.ovr = Math.min(c.pot, c.ovr + 1);
  } else if (c.age >= (POS_CLIFF_AGE[c.pos] ?? 31)) {
    const wear = (100 - c.health) / 40;
    const cliff = c.pos === 'RB' ? 1.6 : c.pos === 'K' ? 0.4 : 1;
    c.ovr = Math.max(60, Math.round(c.ovr - (1 + rng() * 2 + wear) * cliff));
  }
  if (c.ovr - before >= 4) notes.push(`📈 Leap year: ${before} to ${c.ovr}.`);
  if (before - c.ovr >= 3) notes.push(`📉 The dropoff is real: ${before} to ${c.ovr}.`);
  if (c.age >= 30) c.health = Math.max(30, c.health - (c.pos === 'K' ? 1 : 3));
  c.age += 1;
  c.year += 1;
  c.contractYears -= 1;
  c.morale = Math.max(20, Math.min(100, c.morale + Math.round(rng() * 10 - 4)));
  /* Round 182: a year of holding the clipboard wears on you and the fans
     quietly forget the name on the back. */
  if (c.role === 'backup') {
    c.morale = Math.max(20, c.morale - 3);
    c.fanbase = Math.max(0, c.fanbase - 2);
  }

  // ── Round 56: the corruption meter resolves here ──
  const heat = c.heat ?? 0;
  if (heat > 0) {
    // Unexplained money keeps the file warm. Clean years cool it down.
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
      notes.push('🕵️ League security has opened a file on you.');
    }
  }

  // Living costs and upkeep come out every year you are earning.
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
  /* Round 469: the money app's season, after the pay and the upkeep have
     landed, the same place in the loop Soccer Career runs it. Savings pays,
     every price moves, and a balance the upkeep has pushed under the floor
     is covered out of savings and then holdings before anything else sees
     it. Its own random stream, so nothing here shifts the season's rng. */
  for (const line of nflMoneySeasonTick(c).events) notes.push(line);
  /* Round 521: the inbox. Silent on purpose, the same way the flagship's
     phone never announces a new text in the season feed: the unread badge
     on the Inbox box is the tell. Round 796: it draws from its own keyed
     stream, never this season's rng, and it is told whether the career goes
     on (the same shouldRetire the board asks right after this returns), so a
     player who retires this summer is never sent a text about next season. */
  const support = applyUsCareerAnnualBenefits(c, 'nfl', c.age - 1);
  if (support) notes.push(support);
  receiveNflInboxTexts(c, !shouldRetire(c));
  return notes;
}

/* Round 422: the share of gross pay that actually reaches the bank, after
   tax, agent and living. It was already the number this file used to turn
   career earnings into net worth; it is named here so the yearly banking and
   the old save rebuild (src/lib/usCareerBank.ts keeps the same 0.45) cannot drift apart from it. */
const TAKE_HOME = 0.45;

/* ─── Round 56: the money ─── */
export type NflSpendCategory = 'home' | 'ride' | 'invest' | 'body' | 'flex' | 'family' | 'shady';

export interface NflSpendItem {
  id: string;
  name: string;
  emoji: string;
  category: NflSpendCategory;
  cost: number;          // millions, 0 means it is a pure upkeep hire
  yearly?: number;       // millions per year ongoing
  desc: string;
  oneTime: boolean;
  minNetWorth?: number;
  minFanbase?: number;
  requiresDirty?: boolean;
  effect?: string;
}

export const NFL_SPEND_ITEMS: NflSpendItem[] = [
  // ── Home ──
  { id: 'condo', name: 'Downtown Condo', emoji: '🏙️', category: 'home', cost: 1.2, desc: 'A real place instead of the rookie apartment, 1.2M', oneTime: true },
  { id: 'suburb_house', name: 'House In The Suburbs', emoji: '🏡', category: 'home', cost: 3.5, desc: 'Six bedrooms and a driveway that fits everyone, 3.5M', oneTime: true, minNetWorth: 3 },
  { id: 'lake_house', name: 'Lake House', emoji: '🛶', category: 'home', cost: 6, yearly: 0.15, desc: 'Where the offseason actually happens, 6M', oneTime: true, minNetWorth: 6 },
  { id: 'mansion', name: 'The Compound', emoji: '🏰', category: 'home', cost: 14, yearly: 0.4, desc: 'Gate, guest house, indoor court, 14M', oneTime: true, minNetWorth: 15 },
  { id: 'private_gym', name: 'Home Facility', emoji: '🏋️', category: 'home', cost: 4, yearly: 0.2, desc: 'Turf, weights, cold tub, film room, 4M', oneTime: true, minNetWorth: 5, effect: 'Health +6 every offseason' },
  { id: 'hometown_field', name: 'Rebuild Your High School Field', emoji: '🏟️', category: 'home', cost: 2.5, desc: 'New turf, new lights, your name on nothing, 2.5M', oneTime: true, minNetWorth: 4, effect: 'Fanbase +12' },
  // ── Ride ──
  { id: 'first_truck', name: 'The Truck You Always Wanted', emoji: '🛻', category: 'ride', cost: 0.12, desc: 'First real purchase. Everybody does it, 120k', oneTime: true },
  { id: 'sports_car', name: 'Sports Car', emoji: '🏎️', category: 'ride', cost: 0.4, desc: 'Loud enough that the coach comments, 400k', oneTime: false },
  { id: 'custom_van', name: 'Custom Team Van', emoji: '🚐', category: 'ride', cost: 0.6, desc: 'Six seats, four screens, one ridiculous sound system, 600k', oneTime: true },
  { id: 'hypercar', name: 'Hypercar', emoji: '🏁', category: 'ride', cost: 3, desc: 'Seven figures of engineering you will drive twice, 3M', oneTime: false, minNetWorth: 6 },
  { id: 'jet_share', name: 'Private Jet Share', emoji: '✈️', category: 'ride', cost: 5, yearly: 0.6, desc: 'Bye week in your hometown every year, 5M', oneTime: true, minNetWorth: 10 },
  // ── Invest ──
  { id: 'wing_franchise', name: 'Wing Franchise', emoji: '🍗', category: 'invest', cost: 0.8, desc: '35 percent chance it prints 2.5M, otherwise it limps', oneTime: false },
  { id: 'car_dealership', name: 'Car Dealership', emoji: '🚗', category: 'invest', cost: 3, desc: 'Steady 9 percent a year, your face on the billboard', oneTime: true, minNetWorth: 4 },
  { id: 'index_fund', name: 'Boring Index Fund', emoji: '📈', category: 'invest', cost: 2, desc: 'Steady 7 percent. Your accountant weeps with joy', oneTime: false },
  { id: 'training_academy', name: 'Youth Training Academy', emoji: '🎓', category: 'invest', cost: 2.5, yearly: 0.1, desc: 'Where the next you comes from, 2.5M', oneTime: true, minNetWorth: 4, effect: 'Fanbase +8' },
  { id: 'crypto_punt', name: 'Crypto Punt', emoji: '🪙', category: 'invest', cost: 1, desc: '20 percent chance of 5x, 80 percent chance of a lesson', oneTime: false },
  { id: 'esports_team', name: 'Esports Team', emoji: '🎮', category: 'invest', cost: 4, desc: '30 percent chance of 3x, and you get to be at the tournaments', oneTime: true, minNetWorth: 8 },
  { id: 'minority_stake', name: 'Minority Stake In A Pro Team', emoji: '🏆', category: 'invest', cost: 25, desc: 'A real piece of a real franchise, 25M', oneTime: true, minNetWorth: 45, effect: 'The retirement plan, fanbase +10' },
  // ── Body ──
  { id: 'private_chef', name: 'Private Chef', emoji: '👨‍🍳', category: 'body', cost: 0, yearly: 0.12, desc: 'Every meal built for the season, 120k a year', oneTime: true, effect: 'Health +4 a year' },
  { id: 'recovery_suite', name: 'Recovery Suite', emoji: '🧊', category: 'body', cost: 1.5, yearly: 0.1, desc: 'Cryo, hyperbaric, the whole circus, 1.5M. Injuries can still happen.', oneTime: true, minNetWorth: 2, effect: '25% lower simulated injury risk' },
  { id: 'speed_coach', name: 'Private Speed Coach', emoji: '⚡', category: 'body', cost: 0, yearly: 0.15, desc: 'The guy who fixes everyone, 150k a year', oneTime: true, effect: 'Rating +1 each offseason through age 26, up to your ceiling' },
  { id: 'sleep_lab', name: 'Sleep Program', emoji: '😴', category: 'body', cost: 0.6, desc: 'Turns out most of it is sleep, 600k', oneTime: true, effect: 'Health +8' },
  { id: 'sports_psych', name: 'Sports Psychologist', emoji: '🧠', category: 'body', cost: 0, yearly: 0.1, desc: 'The part nobody used to talk about, 100k a year', oneTime: true, effect: 'Morale +8 on hire' },
  { id: 'vision_training', name: 'Vision Training', emoji: '👁️', category: 'body', cost: 0.8, desc: 'Read the field a quarter second sooner, 800k', oneTime: true, effect: 'Rating +2, up to your ceiling' },
  // ── Flex ──
  { id: 'chain', name: 'The Chain', emoji: '💎', category: 'flex', cost: 0.5, desc: 'Iced out, photographed constantly, 500k', oneTime: false, minFanbase: 40 },
  { id: 'grill', name: 'Diamond Grill', emoji: '😬', category: 'flex', cost: 0.2, desc: 'Your mother has opinions, 200k', oneTime: true, minFanbase: 45 },
  { id: 'watch_collection', name: 'Watch Collection', emoji: '⌚', category: 'flex', cost: 1.5, desc: 'Six figures on each wrist, 1.5M', oneTime: true, minNetWorth: 4 },
  { id: 'music_video', name: 'Fund Your Own Music Video', emoji: '🎤', category: 'flex', cost: 0.8, desc: 'You cannot rap. You are doing it anyway, 800k', oneTime: true, minFanbase: 55, effect: 'Fanbase +10 and endless jokes' },
  { id: 'shoe_line', name: 'Signature Cleat Line', emoji: '👟', category: 'flex', cost: 2, desc: 'Your silhouette on a shoe, 2M', oneTime: true, minFanbase: 70, effect: 'Fanbase +12, real royalties' },
  { id: 'gold_locker', name: 'Gold Plate Your Locker', emoji: '🚪', category: 'flex', cost: 0.3, desc: 'The equipment staff hate you, 300k', oneTime: true, minFanbase: 60 },
  { id: 'super_bowl_ring_copy', name: 'Second Ring, Bigger', emoji: '💍', category: 'flex', cost: 0.4, desc: 'A custom copy with more diamonds than the real one, 400k', oneTime: true, minNetWorth: 6 },
  // ── Family ──
  { id: 'mom_house', name: 'Buy Your Mother A House', emoji: '❤️', category: 'family', cost: 1.8, desc: 'The reason most people do any of this, 1.8M', oneTime: true, minNetWorth: 2, effect: 'Morale +15' },
  { id: 'siblings_college', name: 'Pay For Your Siblings College', emoji: '🎓', category: 'family', cost: 0.6, desc: 'All of them, all four years, 600k', oneTime: true, effect: 'Morale +10' },
  { id: 'family_office', name: 'Family Office', emoji: '🏦', category: 'family', cost: 0, yearly: 0.15, desc: 'Professionals so relatives stop asking you directly, 150k a year', oneTime: true, effect: 'Protects your money' },
  { id: 'foundation', name: 'Start A Foundation', emoji: '🤝', category: 'family', cost: 3, yearly: 0.2, desc: 'Your name doing good in your city, 3M', oneTime: true, minNetWorth: 6, effect: 'Fanbase +10 a year' },
  { id: 'family_thanksgiving', name: 'Fly The Whole Family In, Every Year', emoji: '🦃', category: 'family', cost: 0, yearly: 0.08, desc: 'Forty people, one table, 80k a year', oneTime: true, effect: 'Morale +6 a year' },
  { id: 'trust_fund', name: 'Set Up Trusts For Your Kids', emoji: '🧸', category: 'family', cost: 5, desc: 'They will never have to do this, 5M', oneTime: true, minNetWorth: 12 },
  // ── Shady (hidden until you have heat or dirty money) ──
  { id: 'shady_carwash', name: 'Car Wash Chain', emoji: '🧼', category: 'shady', cost: 1, desc: 'Remarkable revenue for a street with no traffic, 1M', oneTime: true, requiresDirty: true, effect: 'Washes 2M of dirty money' },
  { id: 'shady_barbershops', name: 'Barbershop Chain', emoji: '💈', category: 'shady', cost: 0.8, desc: 'Nine chairs, three customers, endless cash, 800k', oneTime: true, requiresDirty: true, effect: 'Washes 1.5M of dirty money' },
  { id: 'shady_club', name: 'The Nightclub', emoji: '🍾', category: 'shady', cost: 3, yearly: 0.2, desc: 'Bottle service and a very flexible ledger, 3M', oneTime: true, requiresDirty: true, effect: 'Washes 4M, heat +5 a year' },
  { id: 'shady_lawyer', name: 'The Lawyer Who Never Loses', emoji: '⚖️', category: 'shady', cost: 0, yearly: 0.4, desc: 'On retainer, answers at 3am, 400k a year', oneTime: true, effect: 'Heat cools twice as fast' },
  { id: 'shady_fixer', name: 'A Guy Who Handles Things', emoji: '🕶️', category: 'shady', cost: 0, yearly: 0.25, desc: 'You do not ask how, 250k a year', oneTime: true, effect: 'Heat -8 immediately' },
  { id: 'shady_offshore', name: 'Offshore Account', emoji: '🏝️', category: 'shady', cost: 0.5, desc: 'An island, a bank, a form nobody files, 500k', oneTime: true, requiresDirty: true, effect: 'Hides money, heat +6' },
];

export function getNflSpendItem(id: string): NflSpendItem | undefined {
  return NFL_SPEND_ITEMS.find(i => i.id === id);
}

/** Buy an item. Returns the new state and a log line, or null when blocked. */
export function buyNflItem(c: CareerState, itemId: string): { state: CareerState; log: string } | null {
  const item = getNflSpendItem(itemId);
  if (!item) return null;
  const owned = c.purchased ?? [];
  if (item.oneTime && owned.includes(itemId)) return null;

  const net = c.netWorth ?? Math.round(c.earnings * 0.45 * 10) / 10;
  if (item.minNetWorth && net < item.minNetWorth) return null;
  if (item.minFanbase && c.fanbase < item.minFanbase) return null;
  if (item.requiresDirty && (c.dirtyMoney ?? 0) <= 0) return null;
  if (item.cost > net) return null;

  const s: CareerState = { ...c, purchased: [...owned, itemId] };
  s.netWorth = Math.round((net - item.cost) * 10) / 10;
  if (item.yearly) s.yearlyCosts = Math.round(((s.yearlyCosts ?? 0) + item.yearly) * 100) / 100;

  let log = `Bought ${item.name}.`;
  switch (itemId) {
    case 'hometown_field': s.fanbase = Math.min(100, s.fanbase + 12); log = 'You rebuilt your high school field. The whole town showed up to the ribbon cutting.'; break;
    case 'training_academy': s.fanbase = Math.min(100, s.fanbase + 8); log = 'Your academy opened with 90 kids on the first day.'; break;
    case 'minority_stake': s.fanbase = Math.min(100, s.fanbase + 10); log = 'You own a piece of a franchise now. The other owners are still deciding how they feel.'; break;
    case 'sleep_lab': s.health = Math.min(100, s.health + 8); log = 'Turns out it was mostly sleep the whole time. Health +8.'; break;
    case 'vision_training': s.ovr = raiseWithinPotential(s.ovr, s.pot, 2); log = `The game slowed down a quarter second. ${ratingRaiseNote(c.ovr, s.ovr, 2)}`; break;
    case 'sports_psych': s.morale = Math.min(100, s.morale + 8); log = 'Best hire you ever made and the one you almost skipped. Morale +8.'; break;
    case 'mom_house': s.morale = Math.min(100, s.morale + 15); log = 'You handed your mother the keys and she did not say anything for a full minute. Morale +15.'; break;
    case 'siblings_college': s.morale = Math.min(100, s.morale + 10); log = 'Every sibling, all four years, paid in full. Morale +10.'; break;
    case 'music_video': s.fanbase = Math.min(100, s.fanbase + 10); log = 'The video has four million views and the locker room has never let it go. Fanbase +10.'; break;
    case 'shoe_line': s.fanbase = Math.min(100, s.fanbase + 12); log = 'Your silhouette is on a shoe in every mall in the country. Fanbase +12.'; break;
    case 'foundation': s.fanbase = Math.min(100, s.fanbase + 10); log = 'The foundation launched with a block party and a scholarship fund. Fanbase +10.'; break;
    case 'shady_carwash': s.dirtyMoney = Math.max(0, Math.round(((s.dirtyMoney ?? 0) - 2) * 10) / 10); s.netWorth = Math.round((s.netWorth + Math.min(2, c.dirtyMoney ?? 0)) * 10) / 10; log = 'Two million went in dirty and came out as a very busy car wash.'; break;
    case 'shady_barbershops': s.dirtyMoney = Math.max(0, Math.round(((s.dirtyMoney ?? 0) - 1.5) * 10) / 10); s.netWorth = Math.round((s.netWorth + Math.min(1.5, c.dirtyMoney ?? 0)) * 10) / 10; log = 'Nine chairs, three customers, and a ledger that balances beautifully.'; break;
    case 'shady_club': s.dirtyMoney = Math.max(0, Math.round(((s.dirtyMoney ?? 0) - 4) * 10) / 10); s.netWorth = Math.round((s.netWorth + Math.min(4, c.dirtyMoney ?? 0)) * 10) / 10; s.heat = Math.min(100, (s.heat ?? 0) + 3); log = 'The club opened. Four million cleaned, and a line around the block of people who know your name.'; break;
    case 'shady_fixer': s.heat = Math.max(0, (s.heat ?? 0) - 8); log = 'You have a guy now. Heat -8, and you genuinely do not want to know how.'; break;
    case 'shady_offshore': s.heat = Math.min(100, (s.heat ?? 0) + 6); log = 'The account is open. An island, a bank, and a form nobody will ever file. Heat +6.'; break;
    default: break;
  }
  return { state: s, log };
}

export function marketSalary(c: CareerState): number {
  const posMult = POS_SALARY_MULT[c.pos] ?? 1;
  /* Round 172: era money. A 2005 deal pays 2005 money, about a third. */
  const scale = nflEraById(c.eraId).moneyScale;
  return Math.max(0.4, Math.round(((c.ovr - 64) * 1.55 - 6) * posMult * scale * 10) / 10);
}

/* Round 179: the real free agency window. Replaces the old two-button
   contract card that used to hide in the event deck (and could fail to be
   drawn at all, letting you play years on an expired deal). The board now
   opens this window before any season starts with no contract. */
export function buildNflFaWindow(c: CareerState, incumbentQuality: number, rng: () => number = Math.random): FaWindow {
  return buildFaWindow({
    sport: 'nfl',
    currentTeam: c.team,
    pool: nflEraById(c.eraId).teams.map(t => ({ id: t.abbr, label: t.label })),
    market: marketSalary(c),
    discount: 0.88,
    minSalary: 0.4,
    ovr: c.ovr,
    age: c.age,
    accolades: c.allPros,
    cliffAge: POS_CLIFF_AGE[c.pos] ?? 31,
    incumbentQuality,
    rng,
  });
}

export function nflFaPushArgs(c: CareerState, rng: () => number = Math.random): FaPushArgs {
  return { ovr: c.ovr, age: c.age, accolades: c.allPros, cliffAge: POS_CLIFF_AGE[c.pos] ?? 31, rng };
}

/* Round 207: the extension talk, the decision that comes BEFORE free
   agency. Same wrapper shape as the window above: this file owns the
   sport's numbers, usCareerExtension.ts owns the rules. */
export function buildNflExtension(c: CareerState, rng: () => number = Math.random): ExtensionTalk {
  return buildExtension({
    sport: 'nfl',
    team: c.team,
    label: teamLabelOf(c.team, c.eraId),
    market: marketSalary(c),
    minSalary: 0.4,
    ovr: c.ovr,
    age: c.age,
    accolades: c.allPros,
    cliffAge: POS_CLIFF_AGE[c.pos] ?? 31,
    rng,
  });
}

export function nflExtPushArgs(c: CareerState, rng: () => number = Math.random): ExtPushArgs {
  return { ovr: c.ovr, age: c.age, accolades: c.allPros, cliffAge: POS_CLIFF_AGE[c.pos] ?? 31, rng };
}

/** Round 1038: the between-season deck, every card in it, built exactly as
    drawEvent builds it (the same rng draws in the same order). A big press
    moment is in it too, first, marked press 'big'; drawEvent hands that one
    out on its own. src/lib/usCareerSummer.ts deals the summer from here. */
export function nflEventDeck(c: CareerState, rng: () => number): CareerEvent[] {
  return buildNflDeck(c, rng, false).deck;
}

/** Between-season decision deck: one card, every draw what it always was. */
export function drawEvent(c: CareerState, rng: () => number): CareerEvent {
  const { big, deck, corrupt, arcOpen } = buildNflDeck(c, rng, true);
  if (big) return big;
  return pickDeckCard(deck, corrupt, arcOpen, rng);
}

function buildNflDeck(c: CareerState, rng: () => number, stopAtBig: boolean): { big: CareerEvent | null; deck: CareerEvent[]; corrupt: CareerEvent[]; arcOpen: boolean } {
  const deck: CareerEvent[] = [];

  /* Round 179: the 'contract' card left this deck. Contract summers are now
     the free agency window (buildNflFaWindow), which the board guarantees
     before the next season instead of hoping the deck draws it. */

  /* Round 184: the press room reads the season. A podium or an
     accountability scrum takes the floor outright; the smaller questions
     join the deck and take their chances. */
  const press = buildPressMoment('nfl', pressFactsFrom(c, teamLabelOf(c.team, c.eraId)), rng);
  let big: CareerEvent | null = null;
  if (press) {
    const ev: CareerEvent = {
      id: press.id, title: press.title, body: press.body, press: press.big ? 'big' : 'small',
      options: press.options.map(o => ({
        label: o.label, effect: o.effectLine,
        apply: (cc: CareerState, r: () => number) => applyPressChoice(cc, o, r),
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
    title: 'Offseason focus',
    body: 'Twelve weeks before camp. Where does the work go?',
    options: [
      { label: 'Skill work', effect: 'Push your ceiling', apply: (cc, r) => { if (cc.age >= 30) { cc.health = Math.min(100, cc.health + 4); return 'At this age the gains are in maintenance. Health +4.'; } const up = 1 + Math.floor(r() * 2); cc.ovr = Math.min(cc.pot + 1, cc.ovr + up); return `Rating +${up}.`; } },
      { label: 'Body work', effect: 'Durability and recovery', apply: (cc) => { cc.health = Math.min(100, cc.health + 10); return 'Health +10. You feel five years younger.'; } },
      { label: 'Brand work', effect: 'Fame and endorsements', apply: (cc) => { /* Round 1104: the fee reaches the bank (it only ever reached career earnings) and is paid in the era's money. */ const fee = Math.round(3 * nflEraById(cc.eraId).moneyScale * 10) / 10; const bank = cc.netWorth ?? Math.round(cc.earnings * TAKE_HOME * 10) / 10; cc.fanbase = Math.min(100, cc.fanbase + 12); cc.earnings += fee; cc.netWorth = Math.round((bank + fee) * 10) / 10; return `Fanbase +12 and a ${fee}M endorsement, banked.`; } },
    ],
  });

  /* Round 1104: a man with no contract cannot be traded (the free agency
     window opens next), and a trade never lands on the club he is at: 609 of
     20,000 requests did. Still one draw. */
  if (c.morale < 55 && c.contractYears > 0) {
    deck.push({
      id: 'frustration',
      title: 'Frustration boils',
      body: `Losing wears on you. Reporters smell it. What is the move?`,
      options: [
        { label: 'Request a trade', effect: 'Fresh start, fans burn the jersey', apply: (cc, r) => { const pool = nflEraById(cc.eraId).teams.filter(t => t.abbr !== cc.team); const nt = pool[Math.floor(r() * pool.length)].abbr; cc.team = nt; cc.morale = 72; cc.fanbase = 35; return `Traded to ${teamLabelOf(nt, cc.eraId)}.`; } },
        { label: 'Say the right things', effect: 'Stability', apply: (cc) => { cc.morale += 6; cc.fanbase += 5; return 'You take the high road. The locker room notices.'; } },
      ],
    });
  }

  if (c.health < 75) {
    deck.push({
      id: 'surgery',
      title: 'The knee talks to you',
      body: 'Doctors offer a cleanup operation: miss the start of the season, or push through another year.',
      options: [
        { label: 'Get the surgery', effect: 'Health back, slow start', apply: (cc) => { cc.health = Math.min(100, cc.health + 22); cc.morale -= 4; return 'Surgery done. You will start the season slow but whole.'; } },
        { label: 'Play through it', effect: 'Risk the wear', apply: (cc) => { cc.health -= 8; return 'You strap it up. The trainers exchange looks.'; } },
      ],
    });
  }

  deck.push({
    id: 'media',
    title: 'Prime time podcast invite',
    body: 'A famous podcast wants the unfiltered you. Producers promise fireworks.',
    options: [
      { label: 'Speak your mind', effect: 'Fame up, front office down', apply: (cc) => { cc.fanbase = Math.min(100, cc.fanbase + 10); cc.morale -= 3; return 'The clips go viral. The GM texts: call me.'; } },
      { label: 'Politely decline', effect: 'Locker room respect', apply: (cc) => { cc.morale += 4; return 'Film room over fame. Coaches love it.'; } },
    ],
  });

  // ── Round 56: 90 life events and the corruption deck join the draw ──
  // Every event in those files self-gates, so nothing extra is needed here.
  // Corruption is weighted slightly heavier once a storyline is already open,
  // so an arc you started actually continues instead of getting lost in 100
  // other cards.
  deck.push(...getNflLifeEventsA(c, rng));
  deck.push(...getNflLifeEventsB(c, rng));
  deck.push(...getNflLifeEventsC(c, rng)); /* Round 917: 36 cards, position, age, role and roster rules */
  const corrupt = getNflCorruptionEvents(c, rng);
  /* Round 1038: marked, so the summer keeps the integrity arc to card 1. */
  for (const e of corrupt) e.corruption = true;
  deck.push(...corrupt);
  const arcOpen = Object.keys(c.lifeFlags ?? {}).some(k => ['book', 'bounty', 'peds', 'agentSkim', 'wash'].includes(k));
  return { big, deck, corrupt, arcOpen };
}

export function shouldRetire(c: CareerState): boolean {
  return c.ovr <= 64
    || c.age >= 40
    || (c.pos === 'RB' && c.age >= 34)
    || c.seasons.length >= 19;
}

export interface Legacy {
  score: number;
  verdict: string;
  hof: boolean;
  bullets: string[];
  standout?: LegacyRead['standout'];
}

/* Round 1051: the legacy score reads a table per calibration through the one
   scorer (legacyRead, careerHallOfFame.ts). Calibration 1 is the Round 123
   formula below to the last bit; a career is read on the calibration it
   retired on (hallCalibrationOf). */
const NFL_LEGACY_V1: LegacyWeights = {
  awards: { rings: 80, mvps: 230, allPros: 150 },
  season: 11,
  positions: {
    QB: { terms: [{ stat: 'passYds', per: 800 }, { stat: 'passTd', per: 2 }] },
    RB: { terms: [{ stat: 'rushYds', per: 120 }] },
    WR: { terms: [{ stat: 'recYds', per: 140 }] },
    '*': { terms: [] },
  },
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
   Two families the marks would give are not here, because real careers said
   no (section 18 of the harness; each decision is recorded with its counts in
   scripts/data/careerHallAnchors.json): a receiver's touchdown catches and a
   kicker's field goals. With the push, whole and then halved, the engine sent
   a real long wait straight in on the first ballot and inducted real kickers
   the Hall never called. So a kicker is read on his hardware and his seasons,
   exactly as calibration 1 read him. Three more decisions the same day, by
   the same file's moved past rule: an edge rusher's sacks carry no standout
   (two real sack leaders who waited years went straight in on the first
   ballot with it, whole and halved; the base alone reads them as the real
   Hall did), and a receiver's catches and receiving yards pay half (top 150),
   which reads a real long wait as a wait. */
const NFL_LEGACY_V2: LegacyWeights = {
  awards: { rings: 80, mvps: 230, allPros: 150 },
  season: 11,
  positions: {
    QB: {
      terms: [{ stat: 'passYds', per: 800 }, { stat: 'passTd', per: 2 }],
      standout: [
        { stat: 'passYds', from: 72800, to: 80100, label: 'passing yards' },
        { stat: 'passTd', from: 525, to: 580, label: 'touchdown passes' },
      ],
    },
    RB: {
      terms: [{ stat: 'rushYds', per: 120 }],
      standout: [
        { stat: 'rushYds', from: 14800, to: 17300, label: 'rushing yards' },
        { stat: 'rushTd', from: 122, to: 145, label: 'rushing touchdowns' },
      ],
    },
    WR: {
      terms: [{ stat: 'recYds', per: 140 }],
      standout: [
        { stat: 'rec', from: 1470, to: 1660, label: 'catches', top: 150 },
        { stat: 'recYds', from: 18500, to: 21000, label: 'receiving yards', top: 150 },
      ],
    },
    TE: {
      terms: [{ stat: 'recYds', per: 180 }, { stat: 'rec', per: 34 }, { stat: 'recTd', per: 4.9 }],
      standout: [
        { stat: 'rec', from: 1170, to: 1310, label: 'catches' },
        { stat: 'recYds', from: 12600, to: 14100, label: 'receiving yards' },
        { stat: 'recTd', from: 169, to: 188, label: 'touchdown catches' },
      ],
    },
    LB: {
      terms: [{ stat: 'tackles', per: 34 }, { stat: 'sacks', per: 2.6 }, { stat: 'picks', per: 1.3 }, { stat: 'forcedFum', per: 1.3 }],
      standout: [
        { stat: 'tackles', from: 2310, to: 2610, label: 'tackles' },
        { stat: 'picks', from: 28, to: 34, label: 'interceptions' },
      ],
    },
    CB: {
      terms: [{ stat: 'picks', per: 0.75 }, { stat: 'passDef', per: 8.2 }, { stat: 'tackles', per: 33 }],
      standout: [
        { stat: 'picks', from: 48, to: 59, label: 'interceptions' },
        { stat: 'passDef', from: 341, to: 394, label: 'passes defended' },
      ],
    },
    EDGE: {
      terms: [{ stat: 'sacks', per: 2.5 }, { stat: 'tackles', per: 41 }, { stat: 'forcedFum', per: 1.3 }],
    },
    K: {
      terms: [],
    },
    '*': { terms: [] },
  },
};
export const NFL_LEGACY_WEIGHTS: Record<HallCalibration, LegacyWeights> = { 1: NFL_LEGACY_V1, 2: NFL_LEGACY_V2 };

export function legacyOf(c: CareerState): Legacy {
  const totals = careerTotals(c);
  /* Round 123 recalibration. The old weights were written when a median
     career collected ten first team All-Pro seasons, so allPros * 45 alone
     was 450 of the 520 needed for Canton and SIXTY NINE PERCENT of simulated
     careers retired as Hall of Famers, 42 percent of them inner circle. That
     is not a Hall of Fame, that is a mailing list.

     Awards are scarce now, so each one is worth far more and longevity does
     more of the middle. Measured over 1760 careers after the change: median
     score 266, Hall of Fame 11.9 percent, inner circle 1.4 percent, and a
     forced elite career (90 ceiling) goes in at 70 percent. A great career
     still comes out great, which was the thing to protect. */
  const read = legacyRead(NFL_LEGACY_WEIGHTS[hallCalibrationOf(c)], {
    pos: c.pos, seasons: c.seasons.length,
    awards: { rings: c.rings, mvps: c.mvps, allPros: c.allPros }, totals: { ...totals },
  });
  const score = read.score;
  const hof = score >= 520;
  const verdict = score >= 900 ? 'Inner-circle, first-ballot immortal'
    : score >= 520 ? 'Hall of Famer'
    : score >= 340 ? 'Ring of Honor type, Canton borderline'
    : score >= 180 ? 'A long, proud career'
    : 'A cup of coffee in the league';
  /* Round 833: the stat bullet reads the position. Before this every
     defender and kicker retired on "0 catches for 0 yards, 0 touchdowns",
     and a defender's Defensive Player of the Year awards were called MVPs.
     The score above is untouched: a defensive term in it is a balance call. */
  const award = nflMajorAward(c.pos);
  const bullets = [
    `${c.seasons.length} seasons, ${c.rings} ring${c.rings === 1 ? '' : 's'}, ${countOf(c.mvps, award.one, award.many)}, ${c.allPros} All-Pro nod${c.allPros === 1 ? '' : 's'}`,
    nflCareerStatBullet(totals, c.pos),
    `${Math.round(c.earnings)}M career earnings, ${c.draftPick > 0 ? `drafted pick ${c.draftPick}` : 'undrafted signing'}`,
  ];
  return read.standout ? { score, verdict, hof, bullets, standout: read.standout } : { score, verdict, hof, bullets };
}

export function careerTotals(c: CareerState): NflCareerSums {
  const t: NflCareerSums = {
    passYds: 0, passTd: 0, ints: 0, rushYds: 0, rushTd: 0, rec: 0, recYds: 0, recTd: 0,
    /* Round 833: the defence and the kicker, which this never summed. */
    tackles: 0, sacks: 0, picks: 0, passDef: 0, forcedFum: 0, fgMade: 0, fgAtt: 0,
  };
  for (const s of c.seasons) {
    t.passYds += s.passYds ?? 0; t.passTd += s.passTd ?? 0; t.ints += s.ints ?? 0;
    t.rushYds += s.rushYds ?? 0; t.rushTd += s.rushTd ?? 0;
    t.rec += s.rec ?? 0; t.recYds += s.recYds ?? 0; t.recTd += s.recTd ?? 0;
    t.tackles += s.tackles ?? 0; t.sacks += s.sacks ?? 0; t.picks += s.picks ?? 0;
    t.passDef += s.passDef ?? 0; t.forcedFum += s.forcedFum ?? 0;
    t.fgMade += s.fgMade ?? 0; t.fgAtt += s.fgAtt ?? 0;
  }
  /* Sacks come in halves since Round 1104, but a season saved before it
     keeps its tenths, so the sum is still rounded to a tenth the way
     nflBadgeFacts already rounds it, never printed as 41.300000000000004. */
  t.sacks = Math.round(t.sacks * 10) / 10;
  return t;
}

/* Round 1104: the bank repair that ran on load lived here, one copy in each of
   the four engines. It is one function now, repairBankOnLoad in
   src/lib/usCareerBank.ts, bound in this sport's binding. */
