/**
 * MLB My Career engine (2026-08-05). Baseball sibling of nflMyCareer.ts:
 * a fictional prospect living a whole career inside the real 30-team
 * league, hitter or pitcher. Season lines (AVG/HR/RBI or W-L/ERA/K)
 * driven by rating, health and team quality; minor league grind before
 * the call-up; one big decision per offseason; awards, rings, aging,
 * retirement, legacy verdict. The player is fictional; the teams are real.
 */

import { MLB_TEAMS } from '@/data/conquestDataMlb';
import { seasonSwing, swingNote, playoffDepthOf, playoffGames, clutchSwing, clutchNote } from './careerVariance';
import { mlbSeasonScore, wonAward } from './careerAwards';
import { draftRival, judgeRivalSeason } from './careerRival';
import type { CareerRival } from './careerRival';

import type { PlayerAppearance } from './soccerCareerAppearance';
import { getMlbLifeEventsA } from './mlbCareerLifeA';
import { getMlbLifeEventsB } from './mlbCareerLifeB';
import { getMlbCorruptionEvents } from './mlbCareerCorruption';

// Round 58: a real diamond instead of four sample positions. Relievers,
// catchers and corner bats all live different careers now.
export type MlbCareerPos = 'SP' | 'RP' | 'C' | '1B' | '2B' | '3B' | 'SS' | 'LF' | 'CF' | 'RF' | 'DH';

/** Pitchers get an innings line, everyone else gets a batting line. */
export const MLB_PITCHERS: MlbCareerPos[] = ['SP', 'RP'];

/** Positional power and speed shape, so a catcher and a DH do not hit alike. */
export const MLB_POS_PROFILE: Record<MlbCareerPos, { power: number; contact: number; speed: number; salary: number; cliff: number }> = {
  SP: { power: 0, contact: 0, speed: 0, salary: 1.35, cliff: 34 },
  RP: { power: 0, contact: 0, speed: 0, salary: 0.6, cliff: 35 },
  C:  { power: 0.85, contact: 0.95, speed: 0.3, salary: 0.95, cliff: 32 },
  '1B': { power: 1.25, contact: 1.0, speed: 0.4, salary: 1.0, cliff: 34 },
  '2B': { power: 0.8, contact: 1.08, speed: 1.1, salary: 0.9, cliff: 32 },
  '3B': { power: 1.15, contact: 1.0, speed: 0.6, salary: 1.05, cliff: 34 },
  SS: { power: 0.95, contact: 1.05, speed: 1.15, salary: 1.2, cliff: 33 },
  LF: { power: 1.1, contact: 1.0, speed: 0.9, salary: 0.95, cliff: 34 },
  CF: { power: 0.95, contact: 1.02, speed: 1.3, salary: 1.1, cliff: 33 },
  RF: { power: 1.15, contact: 1.0, speed: 0.85, salary: 1.0, cliff: 34 },
  DH: { power: 1.3, contact: 1.0, speed: 0.25, salary: 0.85, cliff: 37 },
};

export interface MlbArchetype {
  id: string;
  label: string;
  desc: string;
  ovrBoost: number;
  potBoost: number;
  durability: number;
}

export const MLB_ARCHETYPES: Record<MlbCareerPos, MlbArchetype[]> = {
  SP: [
    { id: 'flame', label: 'Flamethrower', desc: 'Triple digits, elbow prays nightly', ovrBoost: 3, potBoost: 4, durability: 0.72 },
    { id: 'crafty', label: 'Crafty Lefty', desc: 'Paints corners, ages forever', ovrBoost: 0, potBoost: 5, durability: 1.0 },
    { id: 'workhorse', label: 'Workhorse', desc: '200 innings, every year', ovrBoost: 2, potBoost: 3, durability: 0.9 },
  ],
  CF: [
    { id: 'fivetool', label: 'Five-Tool Freak', desc: 'Does everything, the face of the game', ovrBoost: 3, potBoost: 5, durability: 0.9 },
    { id: 'burner', label: 'Burner', desc: 'Eighty steals if you let him', ovrBoost: 1, potBoost: 4, durability: 0.9 },
    { id: 'wall', label: 'The Wall Climber', desc: 'Highlight-reel glove, growing bat', ovrBoost: 2, potBoost: 4, durability: 0.95 },
  ],
  SS: [
    { id: 'wizard', label: 'The Wizard', desc: 'Glove first, gold always', ovrBoost: 2, potBoost: 4, durability: 1.0 },
    { id: 'slugging', label: 'Slugging Shortstop', desc: 'The modern monster', ovrBoost: 3, potBoost: 4, durability: 0.9 },
    { id: 'sparkplug', label: 'Sparkplug', desc: 'Leadoff energy, dirt on the jersey', ovrBoost: 1, potBoost: 4, durability: 0.95 },
  ],
  '1B': [
    { id: 'masher', label: 'Masher', desc: '45 homers or bust', ovrBoost: 3, potBoost: 4, durability: 0.9 },
    { id: 'contact', label: 'Contact Machine', desc: 'A .320 season is normal', ovrBoost: 1, potBoost: 5, durability: 1.0 },
    { id: 'clutch', label: 'Captain Clutch', desc: 'October legend in the making', ovrBoost: 2, potBoost: 4, durability: 0.95 },
  ],
  // ── Round 58: seven new position rooms ──
  RP: [
    { id: 'closer', label: 'The Closer', desc: 'Ninth inning, gate opens, crowd stands', ovrBoost: 3, potBoost: 3, durability: 0.85 },
    { id: 'setup', label: 'Fireman', desc: 'Bases loaded in the seventh, every time', ovrBoost: 1, potBoost: 5, durability: 0.8 },
    { id: 'sidearm', label: 'Sidearm Specialist', desc: 'Unhittable to half the lineup, pitches forever', ovrBoost: 0, potBoost: 4, durability: 1.0 },
  ],
  C: [
    { id: 'framer', label: 'The Framer', desc: 'Steals 20 strikes a week nobody notices', ovrBoost: 2, potBoost: 4, durability: 0.85 },
    { id: 'bat_first', label: 'Bat First Catcher', desc: 'Hits like a corner guy, catches like a catcher', ovrBoost: 3, potBoost: 4, durability: 0.75 },
    { id: 'field_general', label: 'Field General', desc: 'Runs the pitching staff, ages into a manager', ovrBoost: 1, potBoost: 5, durability: 0.9 },
  ],
  '2B': [
    { id: 'turner', label: 'The Turner', desc: 'Best double play pivot alive', ovrBoost: 2, potBoost: 4, durability: 0.95 },
    { id: 'gap', label: 'Gap To Gap', desc: 'Forty doubles a year, every year', ovrBoost: 2, potBoost: 4, durability: 0.95 },
    { id: 'scrapper', label: 'Scrapper', desc: 'Fouls off nine pitches then singles', ovrBoost: 1, potBoost: 5, durability: 1.0 },
  ],
  '3B': [
    { id: 'hot_corner', label: 'Hot Corner Vacuum', desc: 'Nothing gets by, ever', ovrBoost: 2, potBoost: 4, durability: 0.9 },
    { id: 'thumper', label: 'Thumper', desc: 'Thirty five homers from the five hole', ovrBoost: 3, potBoost: 4, durability: 0.9 },
    { id: 'onbase', label: 'On Base Machine', desc: 'Walks more than he strikes out', ovrBoost: 1, potBoost: 5, durability: 0.95 },
  ],
  LF: [
    { id: 'slugger_lf', label: 'Left Field Slugger', desc: 'Bat carries the glove, and then some', ovrBoost: 3, potBoost: 4, durability: 0.9 },
    { id: 'leadoff', label: 'Leadoff Spark', desc: 'On base, then gone', ovrBoost: 1, potBoost: 4, durability: 0.95 },
    { id: 'grinder', label: 'Grinder', desc: 'Never has a bad at bat, never misses a game', ovrBoost: 2, potBoost: 4, durability: 1.0 },
  ],
  RF: [
    { id: 'cannon', label: 'The Cannon', desc: 'Nobody goes first to third on you. Ever', ovrBoost: 2, potBoost: 4, durability: 0.95 },
    { id: 'complete', label: 'Complete Hitter', desc: 'Average, power, plate discipline, all of it', ovrBoost: 3, potBoost: 5, durability: 0.9 },
    { id: 'wall_rf', label: 'Wall Banger', desc: 'Plays the corner like he built it', ovrBoost: 1, potBoost: 4, durability: 0.9 },
  ],
  DH: [
    { id: 'pure_masher', label: 'Pure Masher', desc: 'One job. Hits it a very long way', ovrBoost: 4, potBoost: 3, durability: 1.0 },
    { id: 'professional', label: 'Professional Hitter', desc: 'A .300 machine who never ages', ovrBoost: 2, potBoost: 4, durability: 1.0 },
    { id: 'veteran_bat', label: 'Veteran Bat', desc: 'Bad knees, incredible eye, October legend', ovrBoost: 1, potBoost: 4, durability: 1.0 },
  ],
};

export interface MlbSeasonLine {
  year: number;
  team: string;
  age: number;
  ovr: number;
  games: number;
  // hitters
  avg?: number; hr?: number; rbi?: number; sb?: number;
  // pitchers
  wins?: number; lossesP?: number; era?: number; so?: number;
  // Round 58: relievers and richer hitting lines
  saves?: number; holds?: number; obp?: number; doubles?: number;
  /** Round 103: October, which is the only month anyone remembers. */
  poGames?: number; poLine?: string;
  awards: string[];
  teamResult: string;
  salary: number;
}

export interface MlbCareerState {
  name: string;
  pos: MlbCareerPos;
  archetype: MlbArchetype;
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
  seasons: MlbSeasonLine[];
  rings: number;
  mvpCys: number;      // MVPs for hitters, Cy Youngs for pitchers
  allStars: number;
  retired: boolean;
  draftPick: number;
  earnings: number;
  /** Round 58 life layer. All optional so pre-R58 saves keep loading. */
  netWorth?: number;
  dirtyMoney?: number;
  heat?: number;
  suspendedSeasons?: number;
  purchased?: string[];
  lifeFlags?: Record<string, number>;
  appearance?: PlayerAppearance | null;
  yearlyCosts?: number;
  /** Round 104: the player drafted alongside you, measured against you every season. */
  rival?: CareerRival;
  /** Round 173: which league the career lives in. Absent means today's. */
  eraId?: string;
}

export interface MlbCareerEvent {
  id: string;
  title: string;
  body: string;
  options: { label: string; effect: string; apply: (c: MlbCareerState, rng: () => number) => string }[];
}

/* ---------- Round 173: era starts, his "add eras to every sport" ask ---------- */

/**
 * The 2004 league: 30 teams, verified against the 2004 season pages on
 * Wikipedia and Baseball Reference. The Expos' final summer in Montreal,
 * the Anaheim Angels (renamed Los Angeles the next January), the Florida
 * Marlins, the Tampa Bay Devil Rays, the Oakland Athletics, and no
 * Washington, Miami or Sacramento baseball at all. Cleveland carries its
 * 2004 name here because that is the name the record books, the almanacs
 * and mainstream historical coverage still print for those seasons; it is
 * a retired name, not the different and harder case the NFL's Washington
 * franchise presents, which this site writes around entirely. Era-only ids
 * (MON, ANA, FLA, TBD, OAK, CLV) are unique against the modern list on
 * purpose.
 */
export const MLB_TEAMS_2004: { id: string; city: string; name: string }[] = [
  { id: 'NYY', city: 'New York', name: 'Yankees' }, { id: 'BOS', city: 'Boston', name: 'Red Sox' },
  { id: 'BAL', city: 'Baltimore', name: 'Orioles' }, { id: 'TBD', city: 'Tampa Bay', name: 'Devil Rays' },
  { id: 'TOR', city: 'Toronto', name: 'Blue Jays' }, { id: 'MIN', city: 'Minnesota', name: 'Twins' },
  { id: 'CHW', city: 'Chicago', name: 'White Sox' }, { id: 'CLV', city: 'Cleveland', name: 'Indians' },
  { id: 'DET', city: 'Detroit', name: 'Tigers' }, { id: 'KCR', city: 'Kansas City', name: 'Royals' },
  { id: 'ANA', city: 'Anaheim', name: 'Angels' }, { id: 'OAK', city: 'Oakland', name: 'Athletics' },
  { id: 'TEX', city: 'Texas', name: 'Rangers' }, { id: 'SEA', city: 'Seattle', name: 'Mariners' },
  { id: 'ATL', city: 'Atlanta', name: 'Braves' }, { id: 'PHI', city: 'Philadelphia', name: 'Phillies' },
  { id: 'FLA', city: 'Florida', name: 'Marlins' }, { id: 'NYM', city: 'New York', name: 'Mets' },
  { id: 'MON', city: 'Montreal', name: 'Expos' }, { id: 'STL', city: 'St. Louis', name: 'Cardinals' },
  { id: 'HOU', city: 'Houston', name: 'Astros' }, { id: 'CHC', city: 'Chicago', name: 'Cubs' },
  { id: 'CIN', city: 'Cincinnati', name: 'Reds' }, { id: 'PIT', city: 'Pittsburgh', name: 'Pirates' },
  { id: 'MIL', city: 'Milwaukee', name: 'Brewers' }, { id: 'LAD', city: 'Los Angeles', name: 'Dodgers' },
  { id: 'SFG', city: 'San Francisco', name: 'Giants' }, { id: 'SDP', city: 'San Diego', name: 'Padres' },
  { id: 'COL', city: 'Colorado', name: 'Rockies' }, { id: 'ARI', city: 'Arizona', name: 'Diamondbacks' },
];

export interface MlbEraDef {
  id: 'now' | 'y2004';
  label: string;
  startYear: number;
  blurb: string;
  /** Contract money scale against the modern game. Baseball has no salary
   *  cap, so the scale comes from average player salary: about 2.31 million
   *  in 2004 by the players association's own table, against the AP study's
   *  record 5.34 million for 2026, which is about 0.43. Neither figure
   *  appears on screen. */
  moneyScale: number;
  teams: { id: string; city: string; name: string }[];
}

export const MLB_ERAS: MlbEraDef[] = [
  {
    id: 'now', label: '2026', startYear: 2026, moneyScale: 1,
    teams: [],
    blurb: 'The league as it is today. Full money, all 30 franchises.',
  },
  {
    id: 'y2004', label: '2004 throwback', startYear: 2004, moneyScale: 0.43, teams: MLB_TEAMS_2004,
    blurb: 'The 2004 league: the Expos in their last Montreal summer, the Devil Rays, the Florida Marlins, the Anaheim Angels. Contracts pay 2004 money.',
  },
];

export function mlbEraById(id?: string): MlbEraDef {
  return MLB_ERAS.find(e => e.id === id) ?? MLB_ERAS[0];
}

/** The team pool for an era. The modern era reads the live MLB_TEAMS list
 *  lazily (never at module scope, per the import-order lesson). */
export function mlbEraTeamIds(eraId?: string): string[] {
  const era = mlbEraById(eraId);
  if (era.id === 'now') return MLB_TEAMS.map(x => x.id);
  return era.teams.map(x => x.id);
}

export function mlbTeamLabelOf(id: string, eraId?: string): string {
  /* Round 173: era names first when asked, then the modern league, then the
     2004 list, so era-only ids always print a real name even from code
     that never learned about eras. */
  const era = mlbEraById(eraId);
  const inEra = era.teams.find(x => x.id === id);
  if (inEra) return `${inEra.city} ${inEra.name}`;
  const t = MLB_TEAMS.find(x => x.id === id);
  if (t) return `${t.city} ${t.name}`;
  const old = MLB_TEAMS_2004.find(x => x.id === id);
  return old ? `${old.city} ${old.name}` : id;
}

export function startMlbCareer(
  name: string, pos: MlbCareerPos, archetype: MlbArchetype, rng: () => number = Math.random,
  appearance?: PlayerAppearance | null, eraId?: string,
): MlbCareerState {
  /* Round 173: the era decides the year, the league you are drafted into
     and the money. Leaving it off is today's league, byte for byte. */
  const era = mlbEraById(eraId);
  const pool = mlbEraTeamIds(eraId);
  const base = 64 + Math.floor(rng() * 8) + archetype.ovrBoost;
  const pot = Math.min(99, base + 12 + Math.floor(rng() * 14) + archetype.potBoost);
  const stock = Math.max(1, Math.round(45 - (base - 62) * 4 + rng() * 25));
  const team = pool[Math.floor(rng() * pool.length)];
  const c: MlbCareerState = {
    name, pos, archetype, team,
    year: era.startYear, age: 21,
    ovr: base, pot,
    morale: 70, fanbase: stock <= 10 ? 50 : 30, health: 100,
    salary: Math.max(0.3, Math.round(0.8 * era.moneyScale * 10) / 10),
    contractYears: 6, // team control years, baseball-style
    seasons: [],
    rings: 0, mvpCys: 0, allStars: 0,
    retired: false,
    draftPick: stock,
    earnings: 0,
    // Round 58 life layer
    netWorth: 0.4,
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
  return c;
}

export function mlbRollTeamQuality(prev: number | null, rng: () => number): number {
  if (prev == null) return 70 + Math.floor(rng() * 20);
  return Math.max(64, Math.min(95, Math.round(prev + (rng() * 12 - 6))));
}

export function mlbMarketSalary(c: MlbCareerState): number {
  // Round 58: position matters. Aces and shortstops get paid, relievers and
  // designated hitters do not, which is exactly how the market works.
  // Round 173: era careers earn era money at the documented scale.
  const mult = (MLB_POS_PROFILE[c.pos] ?? MLB_POS_PROFILE.LF).salary;
  const scale = mlbEraById(c.eraId).moneyScale;
  return Math.max(scale < 1 ? 0.5 : 1, Math.round(((c.ovr - 64) * 1.5 - 6) * mult * scale * 10) / 10);
}

function gamesFor(c: MlbCareerState, rng: () => number): { games: number; note: string | null } {
  const isSp = c.pos === 'SP';
  // Round 58: relievers are their own thing. A closer appears in about 65
  // games, not 155. Getting this wrong once had a reliever striking out 490
  // batters in a season, which is roughly four times the real record.
  const isRp = c.pos === 'RP';
  const full = isSp ? 32 : isRp ? 62 + Math.floor(rng() * 10) : 155 + Math.floor(rng() * 8);
  const floorGames = isSp ? 8 : isRp ? 20 : 45;
  const risk = (1 - c.archetype.durability) * 0.55 + (100 - c.health) / 250;
  if (rng() < risk) {
    const frac = 0.35 + rng() * 0.4;
    return { games: Math.max(floorGames, Math.round(full * frac)), note: (isSp || isRp) && rng() < 0.4 ? 'The elbow. Season shortened, surgery whispers.' : 'Injured list stints ate the season.' };
  }
  return { games: full, note: null };
}

export function simMlbSeason(
  c: MlbCareerState, teamQuality: number, rng: () => number,
): { line: MlbSeasonLine; notes: string[] } {
  const notes: string[] = [];
  const { games, note } = gamesFor(c, rng);
  if (note) { notes.push(`🚑 ${note}`); c.health -= 8; }
  const swing = seasonSwing(rng, c.age);
  const form = c.ovr + (c.morale - 60) / 12 + (teamQuality - 78) / 10
    // Round 98: the season itself gets a say, so career years and lost
    // years both exist. Averages out to zero across a career.
    + swing;
  const line: MlbSeasonLine = {
    year: c.year, team: c.team, age: c.age, ovr: c.ovr, games,
    awards: [], teamResult: '', salary: c.salary,
  };
  const prof = MLB_POS_PROFILE[c.pos] ?? MLB_POS_PROFILE.LF;
  if (c.pos === 'SP') {
    const gs = games;
    line.era = Math.max(1.85, Math.round((5.6 - (form - 62) * 0.075 + rng() * 0.8) * 100) / 100);
    line.wins = Math.max(1, Math.round(gs * (0.25 + (form - 62) * 0.009) + rng() * 3));
    line.lossesP = Math.max(0, Math.round(gs * 0.42 - (line.wins ?? 0) * 0.55 + rng() * 3));
    line.so = Math.max(40, Math.round(gs * (3.4 + (form - 62) * 0.11) + rng() * 25));
  } else if (c.pos === 'RP') {
    // Round 58: relievers throw a quarter of the innings, so their line is
    // saves, holds and a much lower ERA, with wins near zero.
    const apps = games; // already an appearance count, see gamesFor
    line.era = Math.max(1.05, Math.round((4.9 - (form - 62) * 0.085 + rng() * 0.9) * 100) / 100);
    // Round 97: this used to reach 149 strikeouts in a season, which no
    // reliever in the one inning era has ever come close to (Josh Hader's
    // 138 in 2019 is the modern high). A real reliever throws about 60
    // innings, so the median lands near 70 and only the very best clear 120.
    line.so = Math.max(20, Math.round(apps * (0.62 + (form - 62) * 0.031) + rng() * 12));
    line.wins = Math.max(0, Math.round(rng() * 6));
    line.lossesP = Math.max(0, Math.round(rng() * 5));
    if (c.archetype.id === 'closer') {
      line.saves = Math.min(58, Math.max(0, Math.round((14 + (form - 62) * 1.15 + rng() * 8) * (games / 62))));
      line.holds = Math.round(rng() * 4);
    } else {
      line.saves = Math.round(rng() * 6);
      // Round 98: capped at 41, Joel Peralta's real single season record.
      line.holds = Math.min(41, Math.max(0, Math.round((10 + (form - 62) * 0.7 + rng() * 8) * (games / 62))));
    }
  } else {
    const g = games / 160;
    // Round 97: the median season came out at .295, which in real baseball
    // is top ten in the league. Shifted down so an average year looks
    // average and .300 means something again.
    line.avg = Math.min(0.365, Math.max(0.195, Math.round((0.216 + (form - 62) * 0.0028 * prof.contact + rng() * 0.022) * 1000) / 1000));
    // Round 97: power was running about ten home runs hot at every position
    // (the median designated hitter was a 35 homer man, which is an all star
    // season, not a normal one).
    line.hr = Math.min(58, Math.max(0, Math.round((4 + (form - 62) * 0.85) * prof.power * g + rng() * 6 * prof.power)));
    // Round 97: real hitters drive in roughly two runs per home run, not
    // two and a half. Judge hit 62 with 131 RBI, Ohtani 44 with 95. The old
    // ratio made every designated hitter a 116 RBI man.
    line.rbi = Math.max(10, Math.round(((line.hr ?? 0) * 1.9 + 28 + rng() * 20) * g));
    const fast = c.archetype.id === 'burner' || c.archetype.id === 'leadoff' || c.archetype.id === 'sparkplug';
    line.sb = Math.max(0, Math.round((fast ? 24 + rng() * 30 : rng() * 10) * prof.speed * g));
    line.doubles = Math.max(0, Math.round((18 + (form - 62) * 0.55 + rng() * 12) * g));
    line.obp = Math.round(((line.avg ?? 0.24) + 0.055 + rng() * 0.05) * 1000) / 1000;
  }

  const strength = teamQuality + (c.ovr - 76) * 0.35;
  const playoffOdds = Math.max(0.05, Math.min(0.85, (strength - 68) / 30));
  let result = 'Missed October';
  let poStage = -1;
  if (rng() < playoffOdds) {
    const stages = ['Lost the Wild Card series', 'Lost the Division Series', 'Lost the Championship Series', 'Lost the World Series', 'WON THE WORLD SERIES'];
    let stage = 0;
    while (stage < 4 && rng() < 0.42 + (strength - 78) / 85) stage++;
    poStage = stage;
    result = stages[stage];
    if (result === 'WON THE WORLD SERIES') { c.rings += 1; c.fanbase = Math.min(100, c.fanbase + 14); notes.push('💍 A RING. The parade is downtown.'); }
  }
  line.teamResult = result;

  // Round 103: October is a handful of games against the best pitching a
  // hitter sees all year, so this is a total for the run, not an average.
  const depth = playoffDepthOf(poStage >= 0, poStage);
  if (depth >= 0) {
    const poG = playoffGames(depth, rng, 'mlb');
    const clutch = clutchSwing(rng);
    const pf = form + clutch - 2;     // you face nothing but their best arms
    line.poGames = poG;
    if (c.pos === 'SP' || c.pos === 'RP') {
      const starts = c.pos === 'SP' ? Math.max(1, Math.round(poG / 4)) : poG;
      const era = Math.max(0.0, Math.round((5.2 - (pf - 62) * 0.08 + rng() * 0.9) * 100) / 100);
      const k = Math.max(0, Math.round(starts * (c.pos === 'SP' ? 5.4 : 1.1) * (1 + (pf - 62) * 0.012)));
      line.poLine = `${starts} appearance${starts === 1 ? '' : 's'}, ${era.toFixed(2)} ERA, ${k} K`;
    } else {
      const ab = Math.max(1, poG * 4);
      const avg = Math.min(0.5, Math.max(0.0, Math.round((0.216 + (pf - 62) * 0.0028 * prof.contact + rng() * 0.03) * 1000) / 1000));
      const hits = Math.round(ab * avg);
      const hr = Math.max(0, Math.round((4 + (pf - 62) * 0.85) * prof.power * (poG / 160) + (rng() < 0.35 ? 1 : 0)));
      line.poLine = `${hits} for ${ab} (${avg.toFixed(3)}), ${hr} HR`;
    }
    notes.push(`📊 Postseason: ${poG} game${poG === 1 ? '' : 's'}, ${line.poLine}.`);
    const cn = clutchNote(clutch, depth, 'mlb');
    if (cn) notes.push(cn);
  }

  const statScore = mlbSeasonScore(c.pos, line);
  /* Round 123: MVP and Cy Young were gated on an overall of 90 and fired zero
     times across 300 full careers, while All-Star was a naked threshold that
     a good hitter cleared every year of his life. Both are now a draw against
     the league. Sixty four players are All-Stars, thirty two per roster, per
     MLB.com's own roster rules. MVP and Cy Young are two a year, one per
     league. Barry Bonds holds the MVP record with seven and Roger Clemens the
     Cy Young record with seven. See careerAwards.ts. */
  if (c.seasons.length === 0 && wonAward(rng, 'mlb', 'mlbRoy', c.pos, statScore)) {
    line.awards.push('Rookie of the Year'); notes.push('🏆 Rookie of the Year.');
  }
  if (wonAward(rng, 'mlb', 'mlbAllStar', c.pos, statScore)) {
    line.awards.push('All-Star'); c.allStars += 1; notes.push('⭐ All-Star.');
  }
  const isPitcher = MLB_PITCHERS.includes(c.pos);
  if (wonAward(rng, 'mlb', isPitcher ? 'mlbCy' : 'mlbMvp', c.pos, statScore)) {
    const award = isPitcher ? 'Cy Young' : 'MVP';
    line.awards.push(award); c.mvpCys += 1; notes.push(`👑 ${award.toUpperCase()}.`);
  }

  // ── Round 58: the rest of the trophy case ──
  // The old code had Rookie of the Year, All-Star, MVP and Cy Young only, so a
  // glove first shortstop or a lights out closer could play fifteen years and
  // win nothing. Every position now has hardware to chase.
  //
  // Round 123: the stat gates stay, because they are about who is even in the
  // conversation. The coin flip after each one is what got replaced, and it
  // mattered most here: a batting title and a home run crown have exactly two
  // winners a season between thirty teams, and the old code handed them out on
  // a 60 percent roll to anybody who cleared a fixed line.
  if (!isPitcher && c.pos !== 'DH' && games >= 130 && wonAward(rng, 'mlb', 'goldGlove', c.pos, statScore)) {
    line.awards.push('Gold Glove'); notes.push('🧤 Gold Glove.');
  }
  if (!isPitcher && (line.hr ?? 0) >= 28 && games >= 130 && wonAward(rng, 'mlb', 'silverSlugger', c.pos, statScore)) {
    line.awards.push('Silver Slugger'); notes.push('🥈 Silver Slugger.');
  }
  if (!isPitcher && (line.avg ?? 0) >= 0.335 && games >= 130 && wonAward(rng, 'mlb', 'battingTitle', c.pos, statScore)) {
    line.awards.push('Batting Title'); notes.push('🏅 Batting title.');
  }
  if (!isPitcher && (line.hr ?? 0) >= 45 && games >= 130 && wonAward(rng, 'mlb', 'hrCrown', c.pos, statScore)) {
    line.awards.push('Home Run Champion'); notes.push('💣 Led the league in home runs.');
  }
  if (c.pos === 'SP' && (line.era ?? 9) <= 2.6 && games >= 28 && wonAward(rng, 'mlb', 'eraTitle', c.pos, statScore)) {
    line.awards.push('ERA Title'); notes.push('🎯 Led the league in ERA.');
  }
  if (c.pos === 'RP' && (line.saves ?? 0) >= 38 && wonAward(rng, 'mlb', 'savesLeader', c.pos, statScore)) {
    line.awards.push('Saves Leader'); notes.push('🚪 Led the league in saves.');
  }
  // Comeback needs a real bounce off a lost season, not just a good year.
  const prevSeason = c.seasons[c.seasons.length - 1];
  if (prevSeason && prevSeason.games <= 70 && games >= 130 && wonAward(rng, 'mlb', 'mlbComeback', c.pos, statScore)) {
    line.awards.push('Comeback Player of the Year'); notes.push('🔁 Comeback Player of the Year.');
  }

  c.earnings += c.salary;
  // Round 98: tell the player when the season itself was the story.
  const sn = swingNote(swing, 'mlb');
  if (sn) notes.push(sn);
  // Round 104: the rival played his season too, on the same scale as mine,
  // so the head to head is an honest comparison rather than a vibe.
  if (c.rival && !c.rival.retired) {
    for (const n of judgeRivalSeason(c.rival, ((c.pos === 'SP' || c.pos === 'RP') ? Math.round((line.so ?? 0) * 0.12 + Math.max(0, (5.2 - (line.era ?? 5)) * 8)) : Math.round((line.hr ?? 0) * 1.6 + ((line.avg ?? 0.24) - 0.24) * 300)), c.name, 'mlb', rng)) notes.push(n);
  }
  c.seasons.push(line);
  return { line, notes };
}

export function mlbProgress(c: MlbCareerState, rng: () => number): string[] {
  const notes: string[] = [];
  const before = c.ovr;
  // Round 58: progression slowed, and the fall now starts at the age this
  // position actually falls apart. Catchers go early, designated hitters last.
  if (c.age <= 26 && c.ovr < c.pot) {
    const drag = c.ovr >= 92 ? 0.25 : c.ovr >= 88 ? 0.5 : c.ovr >= 84 ? 0.75 : 1;
    const raw = 1 + Math.floor(rng() * 2);
    c.ovr = Math.min(c.pot, c.ovr + Math.max(c.ovr >= 88 ? 0 : 1, Math.round(raw * drag)));
  } else if (c.age <= 29 && c.ovr < c.pot && rng() < 0.45) {
    c.ovr = Math.min(c.pot, c.ovr + 1);
  } else if (c.age >= ((MLB_POS_PROFILE[c.pos] ?? MLB_POS_PROFILE.LF).cliff)) {
    const wear = (100 - c.health) / 40;
    c.ovr = Math.max(60, Math.round(c.ovr - (1 + rng() * 2 + wear) * (c.age >= 37 ? 1.5 : 1)));
  }
  if (c.ovr - before >= 4) notes.push(`📈 The breakout: ${before} to ${c.ovr}.`);
  if (before - c.ovr >= 3) notes.push(`📉 The bat speed goes quietly: ${before} to ${c.ovr}.`);
  if (c.age >= 31) c.health = Math.max(30, c.health - 3);
  c.age += 1;
  c.year += 1;
  c.contractYears -= 1;
  c.morale = Math.max(20, Math.min(100, c.morale + Math.round(rng() * 10 - 4)));

  // ── Round 58: the corruption meter resolves here ──
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
      notes.push('🚨 Suspended by the commissioner. Every dollar they could trace is gone.');
    } else if ((c.heat ?? 0) >= 65 && (c.heat ?? 0) - drift < 65) {
      notes.push('🕵️ The league office has opened a formal investigation.');
    }
  }
  const upkeep = c.yearlyCosts ?? 0;
  if (upkeep > 0) c.netWorth = Math.round(((c.netWorth ?? c.earnings * 0.45) - upkeep) * 10) / 10;
  return notes;
}

export function drawMlbEvent(c: MlbCareerState, rng: () => number): MlbCareerEvent {
  const deck: MlbCareerEvent[] = [];
  if (c.contractYears <= 0) {
    const market = mlbMarketSalary(c);
    deck.push({
      id: 'contract',
      title: 'Free agency, finally',
      body: `Six years of team control are done. ${mlbTeamLabelOf(c.team)} offer ${Math.round(market * 0.85 * 10) / 10}M a year. The open market whispers ${market}M.`,
      options: [
        { label: 'Stay home', effect: 'Legacy with one club', apply: (cc) => { cc.salary = Math.round(market * 0.85 * 10) / 10; cc.contractYears = 4; cc.fanbase = Math.min(100, cc.fanbase + 12); cc.morale += 6; return `Re-signed with ${mlbTeamLabelOf(cc.team)} for ${cc.salary}M x4.`; } },
        { label: 'Take the biggest deal', effect: 'New city, top dollar', apply: (cc, r) => { const pool = mlbEraTeamIds(cc.eraId); const nt = pool[Math.floor(r() * pool.length)]; cc.team = nt; cc.salary = market; cc.contractYears = 4; cc.fanbase = 40; return `Signed with ${mlbTeamLabelOf(nt, cc.eraId)} for ${market}M x4. Back page of every paper.`; } },
      ],
    });
  }
  deck.push({
    id: 'training',
    title: 'Winter plan',
    body: 'The offseason is long. Where do the hours go?',
    options: [
      { label: c.pos === 'SP' ? 'New pitch lab' : 'Swing rebuild', effect: 'Push the ceiling', apply: (cc, r) => { if (cc.age >= 32) { cc.health = Math.min(100, cc.health + 4); return 'Veteran maintenance. Health +4.'; } const up = 1 + Math.floor(r() * 2); cc.ovr = Math.min(cc.pot + 1, cc.ovr + up); return `Rating +${up}.`; } },
      { label: 'Arm care and mobility', effect: 'Durability', apply: (cc) => { cc.health = Math.min(100, cc.health + 10); return 'Health +10. Spring training in the best shape of your life.'; } },
      { label: 'The commercial circuit', effect: 'Fame and money', apply: (cc) => { cc.fanbase = Math.min(100, cc.fanbase + 12); cc.earnings += 3; return 'National ads all winter. 3M banked.'; } },
    ],
  });
  if (c.pos === 'SP' && c.health < 70) {
    deck.push({
      id: 'tj',
      title: 'The elbow decision',
      body: 'The MRI is not clean. Surgery now costs a season but saves the arm.',
      options: [
        { label: 'Get the surgery', effect: 'Miss time, save the arm', apply: (cc) => { cc.health = Math.min(100, cc.health + 30); cc.morale -= 5; return 'Surgery done. The rehab calendar goes on the wall.'; } },
        { label: 'Pitch through it', effect: 'Gamble', apply: (cc) => { cc.health -= 10; return 'You take the ball. Every start is a coin flip now.'; } },
      ],
    });
  }
  if (c.morale < 55) {
    deck.push({
      id: 'trade',
      title: 'Trade deadline rumors',
      body: 'The team is selling and your name leads every rumor column.',
      options: [
        { label: 'Ask out', effect: 'Contender bound', apply: (cc, r) => { const pool = mlbEraTeamIds(cc.eraId); const nt = pool[Math.floor(r() * pool.length)]; cc.team = nt; cc.morale = 74; cc.fanbase = 38; return `Dealt to ${mlbTeamLabelOf(nt, cc.eraId)} at the deadline.`; } },
        { label: 'Be the franchise guy', effect: 'Loyalty points', apply: (cc) => { cc.morale += 6; cc.fanbase += 6; return 'You stay and say the right things. The city loves it.'; } },
      ],
    });
  }
  // ── Round 58: 90 life events and the corruption deck join the draw ──
  deck.push(...getMlbLifeEventsA(c, rng));
  deck.push(...getMlbLifeEventsB(c, rng));
  const corrupt = getMlbCorruptionEvents(c, rng);
  deck.push(...corrupt);
  const arcOpen = Object.keys(c.lifeFlags ?? {}).some(k => ['signs', 'sticky', 'clinic', 'tips', 'academy', 'wash'].includes(k));
  if (arcOpen && corrupt.length > 0 && rng() < 0.45) {
    return corrupt[Math.floor(rng() * corrupt.length)];
  }
  return deck[Math.floor(rng() * deck.length)];
}

export function mlbShouldRetire(c: MlbCareerState): boolean {
  return c.ovr <= 62 || c.age >= 42 || c.seasons.length >= 21;
}

export interface MlbLegacy { score: number; verdict: string; hof: boolean; bullets: string[] }

export function mlbCareerTotals(c: MlbCareerState) {
  let hr = 0, rbi = 0, sb = 0, wins = 0, so = 0, games = 0;
  for (const s of c.seasons) {
    hr += s.hr ?? 0; rbi += s.rbi ?? 0; sb += s.sb ?? 0; wins += s.wins ?? 0; so += s.so ?? 0; games += s.games;
  }
  return { hr, rbi, sb, wins, so, games };
}

export function mlbLegacyOf(c: MlbCareerState): MlbLegacy {
  const t = mlbCareerTotals(c);
  /* Round 123 recalibration, and this one needed the most work because the
     counting stats were doing almost all of it. The engine gives a median
     career nineteen seasons, and a corner bat hitting 25 a year for nineteen
     years finishes on roughly 475 home runs. At the old weight of 0.85 that
     alone was 404 of the 500 needed for Cooperstown, so SEVENTY PERCENT of
     simulated careers were Hall of Famers before you counted anything else.
     Four hundred and seventy five home runs really is a Cooperstown number in
     the real world; the problem is that this engine hands it to the median
     player, and that is a stat inflation question for another round, not
     something the verdict should paper over. So the counting terms came down
     hard and the (now genuinely rare) hardware came up.

     Measured over 2420 careers after: median score 353, Hall of Fame 18.8
     percent, inner circle 1.3 percent. The bottom tier moved from 170 to 230
     because at 170 it had become unreachable: nobody who plays nineteen years
     scores under 170 and the line was dead. */
  let score = c.rings * 85 + c.mvpCys * 220 + c.allStars * 70 + c.seasons.length * 9;
  score += c.pos === 'SP' ? t.wins * 0.5 + t.so / 70 : t.hr * 0.25 + t.rbi / 60;
  score = Math.round(score);
  const hof = score >= 500;
  const verdict = score >= 900 ? 'Cooperstown first ballot, inner circle'
    : score >= 500 ? 'Hall of Famer'
    : score >= 330 ? 'Franchise legend, Hall of Very Good'
    : score >= 230 ? 'A long, proud big-league career'
    : 'A September call-up story to tell forever';
  const bullets = [
    `${c.seasons.length} seasons, ${c.rings} ring${c.rings === 1 ? '' : 's'}, ${c.mvpCys} ${c.pos === 'SP' ? 'Cy Young' : 'MVP'}${c.mvpCys === 1 ? '' : 's'}, ${c.allStars} All-Star nods`,
    c.pos === 'SP' ? `${t.wins} wins, ${t.so.toLocaleString()} strikeouts` : `${t.hr} home runs, ${t.rbi.toLocaleString()} RBI, ${t.sb} steals`,
    `${Math.round(c.earnings)}M career earnings, drafted pick ${c.draftPick}`,
  ];
  return { score, verdict, hof, bullets };
}

/* ─── Round 58: the money ─── */
export type MlbSpendCategory = 'home' | 'ride' | 'invest' | 'body' | 'flex' | 'family' | 'shady';

export interface MlbSpendItem {
  id: string; name: string; emoji: string; category: MlbSpendCategory;
  cost: number; yearly?: number; desc: string; oneTime: boolean;
  minNetWorth?: number; minFanbase?: number; requiresDirty?: boolean; effect?: string;
}

export const MLB_SPEND_ITEMS: MlbSpendItem[] = [
  // Home
  { id: 'downtown_loft', name: 'Downtown Loft', emoji: '🏙️', category: 'home', cost: 1.5, desc: 'A real place instead of the rookie hotel, 1.5M', oneTime: true },
  { id: 'gated_house', name: 'House Behind A Gate', emoji: '🏡', category: 'home', cost: 4.5, desc: 'Where the fans cannot ring the doorbell, 4.5M', oneTime: true, minNetWorth: 4 },
  { id: 'summer_villa', name: 'Summer Villa', emoji: '🌴', category: 'home', cost: 8, yearly: 0.2, desc: 'Where the offseason actually happens, 8M', oneTime: true, minNetWorth: 9 },
  { id: 'compound', name: 'The Compound', emoji: '🏰', category: 'home', cost: 20, yearly: 0.5, desc: 'Full court, screening room, guest wing, 20M', oneTime: true, minNetWorth: 25 },
  { id: 'home_court', name: 'Private Cage And Gym', emoji: '🏀', category: 'home', cost: 5, yearly: 0.25, desc: 'Batting cage, mound, weight room, cold tub, 5M', oneTime: true, minNetWorth: 6, effect: 'Health +6 every offseason' },
  { id: 'hometown_court', name: 'Rebuild Your Little League Field', emoji: '⛹️', category: 'home', cost: 2, desc: 'New infield, new lights, real dugouts, 2M', oneTime: true, minNetWorth: 3, effect: 'Fanbase +12' },
  // Ride
  { id: 'first_car', name: 'The Car You Always Wanted', emoji: '🚗', category: 'ride', cost: 0.15, desc: 'First real purchase. Everybody does it, 150k', oneTime: true },
  { id: 'sprinter', name: 'Custom Sprinter', emoji: '🚐', category: 'ride', cost: 0.5, desc: 'Reclining seats and four screens for road trips, 500k', oneTime: true },
  { id: 'exotic', name: 'Exotic Car', emoji: '🏎️', category: 'ride', cost: 0.6, desc: 'Photographed in the players lot constantly, 600k', oneTime: false },
  { id: 'hypercar_mlb', name: 'Hypercar', emoji: '🏁', category: 'ride', cost: 3.5, desc: 'Seven figures you will drive twice, 3.5M', oneTime: false, minNetWorth: 7 },
  { id: 'jet_share_mlb', name: 'Private Jet Share', emoji: '✈️', category: 'ride', cost: 6, yearly: 0.7, desc: 'Home for every off day, 6M', oneTime: true, minNetWorth: 12 },
  // Invest
  { id: 'restaurant_group', name: 'Restaurant Group', emoji: '🍽️', category: 'invest', cost: 1.2, desc: '35 percent chance it prints 3M, otherwise it limps', oneTime: false },
  { id: 'index_mlb', name: 'Boring Index Fund', emoji: '📈', category: 'invest', cost: 2, desc: 'Steady 7 percent. Your accountant weeps with joy', oneTime: false },
  { id: 'media_company', name: 'Media Company', emoji: '🎙️', category: 'invest', cost: 3, yearly: 0.15, desc: 'Podcasts, docs, and your own narrative, 3M', oneTime: true, minNetWorth: 5, effect: 'Fanbase +6 a year' },
  { id: 'youth_academy_mlb', name: 'Youth Academy', emoji: '🎓', category: 'invest', cost: 2.5, yearly: 0.1, desc: 'Where the next you comes from, 2.5M', oneTime: true, minNetWorth: 4, effect: 'Fanbase +8' },
  { id: 'crypto_mlb', name: 'Crypto Punt', emoji: '🪙', category: 'invest', cost: 1, desc: '20 percent chance of 5x, 80 percent chance of a lesson', oneTime: false },
  { id: 'wine_label', name: 'Wine Label', emoji: '🍷', category: 'invest', cost: 2, desc: 'Steady 10 percent and very good dinners', oneTime: true, minNetWorth: 4 },
  { id: 'team_stake', name: 'Minority Stake In A Franchise', emoji: '🏆', category: 'invest', cost: 40, desc: 'A real piece of a real team, 40M', oneTime: true, minNetWorth: 70, effect: 'The retirement plan, fanbase +10' },
  // Body
  { id: 'chef_mlb', name: 'Private Chef', emoji: '👨‍🍳', category: 'body', cost: 0, yearly: 0.15, desc: 'Every meal built for 82 games, 150k a year', oneTime: true, effect: 'Health +4 a year' },
  { id: 'recovery_mlb', name: 'Recovery Suite', emoji: '🧊', category: 'body', cost: 2, yearly: 0.12, desc: 'Cryo, compression, the whole circus, 2M', oneTime: true, minNetWorth: 3, effect: 'Injury risk down' },
  { id: 'shot_doctor', name: 'Private Hitting Coach', emoji: '🎯', category: 'body', cost: 0, yearly: 0.2, desc: 'The guy who rebuilt three batting titles, 200k a year', oneTime: true, effect: 'Rating +1 a year while young' },
  { id: 'sleep_mlb', name: 'Sleep Program', emoji: '😴', category: 'body', cost: 0.7, desc: 'Turns out most of it is sleep, 700k', oneTime: true, effect: 'Health +8' },
  { id: 'psych_mlb', name: 'Sports Psychologist', emoji: '🧠', category: 'body', cost: 0, yearly: 0.12, desc: 'The part nobody used to talk about, 120k a year', oneTime: true, effect: 'Morale +8 on hire' },
  { id: 'biomech_mlb', name: 'Biomechanics Team', emoji: '🔬', category: 'body', cost: 1.2, desc: 'They rebuilt your landing mechanics, 1.2M', oneTime: true, effect: 'Rating +2' },
  // Flex
  { id: 'chain_mlb', name: 'The Chain', emoji: '💎', category: 'flex', cost: 0.6, desc: 'Iced out, photographed in every tunnel, 600k', oneTime: false, minFanbase: 40 },
  { id: 'tunnel_fits', name: 'A Stylist And A Tunnel Budget', emoji: '🕶️', category: 'flex', cost: 0, yearly: 0.3, desc: 'The tunnel is a runway now, 300k a year', oneTime: true, minFanbase: 45, effect: 'Fanbase +5 a year' },
  { id: 'watch_mlb', name: 'Watch Collection', emoji: '⌚', category: 'flex', cost: 2, desc: 'Six figures on each wrist, 2M', oneTime: true, minNetWorth: 5 },
  { id: 'album', name: 'Fund Your Own Album', emoji: '🎤', category: 'flex', cost: 1, desc: 'You cannot rap. You are doing it anyway, 1M', oneTime: true, minFanbase: 55, effect: 'Fanbase +10 and endless jokes' },
  { id: 'signature_shoe', name: 'Signature Shoe Line', emoji: '👟', category: 'flex', cost: 2.5, desc: 'Your silhouette on a shoe, 2.5M', oneTime: true, minFanbase: 70, effect: 'Fanbase +12, real royalties' },
  { id: 'court_mural', name: 'Mural On Your Old Field', emoji: '🎨', category: 'flex', cost: 0.3, desc: 'Twenty feet of you where you learned, 300k', oneTime: true, minFanbase: 55 },
  { id: 'ring_copy_mlb', name: 'Second Ring, Bigger', emoji: '💍', category: 'flex', cost: 0.5, desc: 'A custom copy with more diamonds than the real one, 500k', oneTime: true, minNetWorth: 8 },
  // Family
  { id: 'mom_house_mlb', name: 'Buy Your Mother A House', emoji: '❤️', category: 'family', cost: 2, desc: 'The reason most people do any of this, 2M', oneTime: true, minNetWorth: 2.5, effect: 'Morale +15' },
  { id: 'siblings_mlb', name: 'Pay For Your Siblings College', emoji: '🎓', category: 'family', cost: 0.7, desc: 'All of them, all four years, 700k', oneTime: true, effect: 'Morale +10' },
  { id: 'family_office_mlb', name: 'Family Office', emoji: '🏦', category: 'family', cost: 0, yearly: 0.18, desc: 'Professionals so relatives stop asking you directly, 180k a year', oneTime: true, effect: 'Protects your money' },
  { id: 'foundation_mlb', name: 'Start A Foundation', emoji: '🤝', category: 'family', cost: 3.5, yearly: 0.25, desc: 'Your name doing good in your city, 3.5M', oneTime: true, minNetWorth: 7, effect: 'Fanbase +10 a year' },
  { id: 'road_family', name: 'Fly Your Family To Every Road Game', emoji: '🛫', category: 'family', cost: 0, yearly: 0.2, desc: 'Somebody in the stands every night, 200k a year', oneTime: true, effect: 'Morale +6 a year' },
  { id: 'trust_mlb', name: 'Set Up Trusts For Your Kids', emoji: '🧸', category: 'family', cost: 6, desc: 'They will never have to do this, 6M', oneTime: true, minNetWorth: 14 },
  // Shady
  { id: 'mshady_laundromats', name: 'Laundromat Chain', emoji: '🧼', category: 'shady', cost: 1, desc: 'Remarkable revenue for the foot traffic, 1M', oneTime: true, requiresDirty: true, effect: 'Washes 2M of dirty money' },
  { id: 'mshady_barbers', name: 'Barbershop Chain', emoji: '💈', category: 'shady', cost: 0.8, desc: 'Nine chairs, three customers, endless cash, 800k', oneTime: true, requiresDirty: true, effect: 'Washes 1.5M of dirty money' },
  { id: 'mshady_club', name: 'The Nightclub', emoji: '🍾', category: 'shady', cost: 3, yearly: 0.25, desc: 'Bottle service and a flexible ledger, 3M', oneTime: true, requiresDirty: true, effect: 'Washes 4M, heat +3 a year' },
  { id: 'mshady_lawyer', name: 'The Lawyer Who Never Loses', emoji: '⚖️', category: 'shady', cost: 0, yearly: 0.45, desc: 'On retainer, answers at 3am, 450k a year', oneTime: true, effect: 'Heat cools twice as fast' },
  { id: 'mshady_fixer', name: 'A Guy Who Handles Things', emoji: '🤐', category: 'shady', cost: 0, yearly: 0.3, desc: 'You do not ask how, 300k a year', oneTime: true, effect: 'Heat -8 immediately' },
  { id: 'mshady_offshore', name: 'Offshore Account', emoji: '🏝️', category: 'shady', cost: 0.5, desc: 'An island, a bank, a form nobody files, 500k', oneTime: true, requiresDirty: true, effect: 'Hides money, heat +6' },
  // Round 58 second wave
  { id: 'barber_chair', name: 'A Barber On Retainer', emoji: '💇', category: 'body', cost: 0, yearly: 0.06, desc: 'Flies to every road city. The line has to be right, 60k a year', oneTime: true, effect: 'Morale +4 a year' },
  { id: 'film_room', name: 'Personal Film Analyst', emoji: '🎞️', category: 'body', cost: 0, yearly: 0.14, desc: 'Cuts every possession you played by 6am, 140k a year', oneTime: true, effect: 'Rating +1 a year' },
  { id: 'sneaker_vault', name: 'The Cleat And Glove Vault', emoji: '👟', category: 'flex', cost: 0.9, desc: 'Climate controlled, 400 gloves, 900k', oneTime: true, minFanbase: 50 },
  { id: 'courtside_seats', name: 'Season Seats Behind The Dugout For Your Block', emoji: '🎟️', category: 'family', cost: 0, yearly: 0.25, desc: 'Twelve seats behind the dugout, all 81 home games, 250k a year', oneTime: true, effect: 'Fanbase +6 a year' },
  { id: 'barbershop_legit', name: 'A Real Barbershop', emoji: '✂️', category: 'invest', cost: 0.4, desc: 'An actual business with actual customers, 400k', oneTime: true },
  { id: 'summer_camp', name: 'Free Youth Baseball Camp', emoji: '⛹️', category: 'family', cost: 1, yearly: 0.15, desc: 'Two weeks, 400 kids, no fee, 1M', oneTime: true, minNetWorth: 2, effect: 'Fanbase +8, morale +6' },
];

export function getMlbSpendItem(id: string): MlbSpendItem | undefined {
  return MLB_SPEND_ITEMS.find(i => i.id === id);
}

/** Buy an item. Returns the new state and a log line, or null when blocked. */
export function buyMlbItem(c: MlbCareerState, itemId: string): { state: MlbCareerState; log: string } | null {
  const item = getMlbSpendItem(itemId);
  if (!item) return null;
  const owned = c.purchased ?? [];
  if (item.oneTime && owned.includes(itemId)) return null;
  const net = c.netWorth ?? Math.round(c.earnings * 0.45 * 10) / 10;
  if (item.minNetWorth && net < item.minNetWorth) return null;
  if (item.minFanbase && c.fanbase < item.minFanbase) return null;
  if (item.requiresDirty && (c.dirtyMoney ?? 0) <= 0) return null;
  if (item.cost > net) return null;

  const s: MlbCareerState = { ...c, purchased: [...owned, itemId] };
  s.netWorth = Math.round((net - item.cost) * 10) / 10;
  if (item.yearly) s.yearlyCosts = Math.round(((s.yearlyCosts ?? 0) + item.yearly) * 100) / 100;

  let log = `Bought ${item.name}.`;
  switch (itemId) {
    case 'hometown_court': s.fanbase = Math.min(100, s.fanbase + 12); log = 'You rebuilt the courts you grew up on. The whole neighborhood came out for the reopening.'; break;
    case 'youth_academy_mlb': s.fanbase = Math.min(100, s.fanbase + 8); log = 'Your academy opened with 120 kids on day one.'; break;
    case 'team_stake': s.fanbase = Math.min(100, s.fanbase + 10); log = 'You own a piece of a franchise now. The other owners are still deciding how they feel about that.'; break;
    case 'sleep_mlb': s.health = Math.min(100, s.health + 8); log = 'Turns out it was mostly sleep the whole time. Health +8.'; break;
    case 'biomech_mlb': s.ovr = Math.min(99, s.ovr + 2); log = 'They rebuilt how you land and everything got easier. Rating +2.'; break;
    case 'psych_mlb': s.morale = Math.min(100, s.morale + 8); log = 'Best hire you ever made and the one you almost skipped. Morale +8.'; break;
    case 'mom_house_mlb': s.morale = Math.min(100, s.morale + 15); log = 'You handed your mother the keys and she did not say a word for a full minute. Morale +15.'; break;
    case 'siblings_mlb': s.morale = Math.min(100, s.morale + 10); log = 'Every sibling, all four years, paid in full. Morale +10.'; break;
    case 'album': s.fanbase = Math.min(100, s.fanbase + 10); log = 'The album has four million streams and the locker room has never let it go. Fanbase +10.'; break;
    case 'signature_shoe': s.fanbase = Math.min(100, s.fanbase + 12); log = 'Your silhouette is on a shoe in every mall in the country. Fanbase +12.'; break;
    case 'foundation_mlb': s.fanbase = Math.min(100, s.fanbase + 10); log = 'The foundation launched with a block party and a scholarship fund. Fanbase +10.'; break;
    case 'mshady_laundromats': { const w = Math.min(2, c.dirtyMoney ?? 0); s.dirtyMoney = Math.max(0, Math.round(((s.dirtyMoney ?? 0) - 2) * 10) / 10); s.netWorth = Math.round((s.netWorth + w) * 10) / 10; log = 'Two million went in dirty and came out as a very busy laundromat chain.'; break; }
    case 'mshady_barbers': { const w = Math.min(1.5, c.dirtyMoney ?? 0); s.dirtyMoney = Math.max(0, Math.round(((s.dirtyMoney ?? 0) - 1.5) * 10) / 10); s.netWorth = Math.round((s.netWorth + w) * 10) / 10; log = 'Nine chairs, three customers, and a ledger that balances beautifully.'; break; }
    case 'mshady_club': { const w = Math.min(4, c.dirtyMoney ?? 0); s.dirtyMoney = Math.max(0, Math.round(((s.dirtyMoney ?? 0) - 4) * 10) / 10); s.netWorth = Math.round((s.netWorth + w) * 10) / 10; s.heat = Math.min(100, (s.heat ?? 0) + 3); log = 'The club opened. Four million cleaned and a line around the block.'; break; }
    case 'mshady_fixer': s.heat = Math.max(0, (s.heat ?? 0) - 8); log = 'You have a guy now. Heat -8, and you genuinely do not want to know how.'; break;
    case 'mshady_offshore': s.heat = Math.min(100, (s.heat ?? 0) + 6); log = 'The account is open. An island, a bank, and a form nobody will ever file. Heat +6.'; break;
    default: break;
  }
  return { state: s, log };
}
