/**
 * NHL My Career engine (2026-08-05). Hockey sibling of nflMyCareer.ts:
 * a fictional prospect living a whole career inside the real 32-team
 * league. Season lines (G-A-P for skaters, W/SV% for goalies) driven by
 * rating, health and team quality; one big decision per offseason;
 * awards, Cups, aging, retirement, legacy verdict. The player is
 * fictional; the teams are real.
 */

import { NHL_TEAMS } from '@/data/conquestDataNhl';
import { seasonSwing, swingNote, playoffDepthOf, playoffGames, clutchSwing, clutchNote } from './careerVariance';
import { nhlSeasonScore, wonAward } from './careerAwards';
import { draftRival, judgeRivalSeason } from './careerRival';
import type { CareerRival } from './careerRival';

import type { PlayerAppearance } from './soccerCareerAppearance';
import { getNhlLifeEventsA } from './nhlCareerLifeA';
import { getNhlLifeEventsB } from './nhlCareerLifeB';
import { getNhlCorruptionEvents } from './nhlCareerCorruption';
// Round 179: the shared free agency engine, one implementation for all four sports.
import { buildFaWindow } from './usCareerFreeAgency';
import type { FaWindow, FaPushArgs } from './usCareerFreeAgency';
import { buildExtension, type ExtensionTalk, type ExtPushArgs } from './usCareerExtension';
// Round 184: the shared press room, same one-engine pattern.
import { buildPressMoment, pressFactsFrom, applyPressChoice } from './usCareerPress';

// Round 59: wings split into left and right, and the blue line splits into
// offensive and shutdown roles, so every seat on the bench is its own career.
export type NhlCareerPos = 'C' | 'LW' | 'RW' | 'D' | 'G';

/** Per position scoring shape, money and decline age. */
export const NHL_POS_PROFILE: Record<NhlCareerPos, { offense: number; salary: number; cliff: number }> = {
  C:  { offense: 1.0, salary: 1.15, cliff: 32 },
  LW: { offense: 0.95, salary: 1.0, cliff: 32 },
  RW: { offense: 0.98, salary: 1.05, cliff: 32 },
  D:  { offense: 0.55, salary: 1.1, cliff: 33 },
  G:  { offense: 0, salary: 0.95, cliff: 35 },
};

export interface NhlArchetype {
  id: string;
  label: string;
  desc: string;
  ovrBoost: number;
  potBoost: number;
  durability: number;
  scoringMult: number;
}

export const NHL_ARCHETYPES: Record<NhlCareerPos, NhlArchetype[]> = {
  C: [
    { id: 'generational', label: 'Generational Talent', desc: 'The hype since you were 14', ovrBoost: 4, potBoost: 5, durability: 0.9, scoringMult: 1.25 },
    { id: 'twoway', label: 'Two-Way Center', desc: 'Selke ceilings, coach in skates', ovrBoost: 1, potBoost: 4, durability: 1.0, scoringMult: 0.85 },
    { id: 'power', label: 'Power Center', desc: 'Net-front nightmare', ovrBoost: 2, potBoost: 4, durability: 0.85, scoringMult: 1.0 },
    { id: 'faceoff', label: 'Faceoff Artist', desc: 'Wins the draw, kills the penalty, plays to 40', ovrBoost: 1, potBoost: 4, durability: 1.0, scoringMult: 0.8 },
  ],
  LW: [
    { id: 'sniper', label: 'Sniper', desc: 'One-timer from the circle, lights out', ovrBoost: 3, potBoost: 4, durability: 0.9, scoringMult: 1.3 },
    { id: 'powerforward', label: 'Power Forward', desc: 'Through you, not around you', ovrBoost: 2, potBoost: 4, durability: 0.8, scoringMult: 1.05 },
    { id: 'agitator', label: 'The Agitator', desc: 'Lives in their heads rent free', ovrBoost: 1, potBoost: 4, durability: 0.9, scoringMult: 0.85 },
  ],
  RW: [
    { id: 'playmaker', label: 'Playmaking Winger', desc: 'Sees plays before they exist', ovrBoost: 1, potBoost: 5, durability: 0.95, scoringMult: 1.1 },
    { id: 'netfront', label: 'Net Front Presence', desc: 'Tips, rebounds, bruises, goals', ovrBoost: 2, potBoost: 4, durability: 0.85, scoringMult: 1.0 },
    { id: 'speedster', label: 'Speedster', desc: 'Fastest man on the ice, every night', ovrBoost: 3, potBoost: 4, durability: 0.9, scoringMult: 1.15 },
  ],
  D: [
    { id: 'offensive', label: 'Offensive Defenseman', desc: 'Norris numbers from the blue line', ovrBoost: 2, potBoost: 5, durability: 0.9, scoringMult: 0.75 },
    { id: 'shutdown', label: 'Shutdown Pair', desc: 'Stars hate your zip code', ovrBoost: 1, potBoost: 4, durability: 0.95, scoringMult: 0.4 },
    { id: 'complete', label: 'Complete Defenseman', desc: 'Thirty minutes a night', ovrBoost: 3, potBoost: 4, durability: 0.9, scoringMult: 0.6 },
    { id: 'puckmover', label: 'Puck Mover', desc: 'First pass out of the zone is always perfect', ovrBoost: 2, potBoost: 4, durability: 0.95, scoringMult: 0.7 },
  ],
  G: [
    { id: 'acrobat', label: 'The Acrobat', desc: 'Highlight saves nightly', ovrBoost: 2, potBoost: 4, durability: 0.9, scoringMult: 0 },
    { id: 'calm', label: 'The Statue', desc: 'Position, angles, boredom, wins', ovrBoost: 1, potBoost: 5, durability: 1.0, scoringMult: 0 },
    { id: 'athlete', label: 'The Athlete', desc: 'Six-four and moves like a cat', ovrBoost: 3, potBoost: 4, durability: 0.95, scoringMult: 0 },
    { id: 'workhorse_g', label: 'The Workhorse', desc: 'Sixty five starts, never tired, never rattled', ovrBoost: 1, potBoost: 4, durability: 1.0, scoringMult: 0 },
  ],
};

export interface NhlSeasonLine {
  year: number;
  team: string;
  age: number;
  ovr: number;
  games: number;
  goals?: number; assists?: number; points?: number;
  wins?: number; svpct?: number;
  /** Round 103: the run to the Cup, or the four games that ended it. */
  poGames?: number; poGoals?: number; poAssists?: number; poPoints?: number;
  poWins?: number; poSvpct?: number;
  awards: string[];
  teamResult: string;
  salary: number;
}

export interface NhlCareerState {
  name: string;
  pos: NhlCareerPos;
  archetype: NhlArchetype;
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
  seasons: NhlSeasonLine[];
  cups: number;
  harts: number;      // Hart / Vezina / Norris majors, position-appropriate
  allStars: number;
  connSmythes: number;
  retired: boolean;
  draftPick: number;
  earnings: number;
  /** Round 59 life layer. All optional so pre-R59 saves keep loading. */
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
  /** Round 183: the lineup. Absent (pre-183 saves, harness careers) means
      first choice, byte for byte unchanged. */
  role?: 'starter' | 'backup';
}

export interface NhlCareerEvent {
  id: string;
  title: string;
  body: string;
  options: { label: string; effect: string; apply: (c: NhlCareerState, rng: () => number) => string }[];
}

/* ---------- Round 173: era starts, his "add eras to every sport" ask ---------- */

/**
 * The 2006-07 league: 30 teams, verified against the 2006-07 season pages
 * on Wikipedia and Hockey Reference. The Thrashers still in Atlanta, the
 * Coyotes still in Phoenix, and no Vegas, Seattle, Winnipeg or Utah
 * franchises at all. Anaheim had already renamed to plain Ducks by 2006-07,
 * which is exactly why this season was picked over 2005-06. Era-only ids
 * (ATL, PHX) are unique against the modern list on purpose.
 */
export const NHL_TEAMS_2006: { id: string; city: string; name: string }[] = [
  { id: 'NJD', city: 'New Jersey', name: 'Devils' }, { id: 'PIT', city: 'Pittsburgh', name: 'Penguins' },
  { id: 'NYR', city: 'New York', name: 'Rangers' }, { id: 'NYI', city: 'New York', name: 'Islanders' },
  { id: 'PHI', city: 'Philadelphia', name: 'Flyers' }, { id: 'BUF', city: 'Buffalo', name: 'Sabres' },
  { id: 'OTT', city: 'Ottawa', name: 'Senators' }, { id: 'TOR', city: 'Toronto', name: 'Maple Leafs' },
  { id: 'MTL', city: 'Montreal', name: 'Canadiens' }, { id: 'BOS', city: 'Boston', name: 'Bruins' },
  { id: 'ATL', city: 'Atlanta', name: 'Thrashers' }, { id: 'TBL', city: 'Tampa Bay', name: 'Lightning' },
  { id: 'CAR', city: 'Carolina', name: 'Hurricanes' }, { id: 'FLA', city: 'Florida', name: 'Panthers' },
  { id: 'WSH', city: 'Washington', name: 'Capitals' }, { id: 'DET', city: 'Detroit', name: 'Red Wings' },
  { id: 'NSH', city: 'Nashville', name: 'Predators' }, { id: 'STL', city: 'St. Louis', name: 'Blues' },
  { id: 'CBJ', city: 'Columbus', name: 'Blue Jackets' }, { id: 'CHI', city: 'Chicago', name: 'Blackhawks' },
  { id: 'VAN', city: 'Vancouver', name: 'Canucks' }, { id: 'MIN', city: 'Minnesota', name: 'Wild' },
  { id: 'CGY', city: 'Calgary', name: 'Flames' }, { id: 'COL', city: 'Colorado', name: 'Avalanche' },
  { id: 'EDM', city: 'Edmonton', name: 'Oilers' }, { id: 'ANA', city: 'Anaheim', name: 'Ducks' },
  { id: 'SJS', city: 'San Jose', name: 'Sharks' }, { id: 'DAL', city: 'Dallas', name: 'Stars' },
  { id: 'LAK', city: 'Los Angeles', name: 'Kings' }, { id: 'PHX', city: 'Phoenix', name: 'Coyotes' },
];

export interface NhlEraDef {
  id: 'now' | 'y2006';
  label: string;
  startYear: number;
  blurb: string;
  /** Contract money scale against the modern game: the 2006-07 salary cap
   *  was 44 million against the announced 104 for 2026-27, which is about
   *  0.42. No cap number appears on screen. */
  moneyScale: number;
  teams: { id: string; city: string; name: string }[];
}

export const NHL_ERAS: NhlEraDef[] = [
  {
    id: 'now', label: '2026', startYear: 2026, moneyScale: 1,
    teams: [],
    blurb: 'The league as it is today. Full money, all 32 franchises.',
  },
  {
    id: 'y2006', label: '2006-07 throwback', startYear: 2006, moneyScale: 0.42, teams: NHL_TEAMS_2006,
    blurb: 'The 30 team league of 2006-07: the Thrashers in Atlanta, the Coyotes in Phoenix, no Vegas or Seattle yet. Contracts pay 2006 money.',
  },
];

export function nhlEraById(id?: string): NhlEraDef {
  return NHL_ERAS.find(e => e.id === id) ?? NHL_ERAS[0];
}

/** The team pool for an era. The modern era reads the live NHL_TEAMS list
 *  lazily (never at module scope, per the import-order lesson). */
export function nhlEraTeamIds(eraId?: string): string[] {
  const era = nhlEraById(eraId);
  if (era.id === 'now') return NHL_TEAMS.map(x => x.id);
  return era.teams.map(x => x.id);
}

export function nhlTeamLabelOf(id: string, eraId?: string): string {
  /* Round 173: era names first when asked, then the modern league, then the
     2006-07 list, so era-only ids always print a real name even from code
     that never learned about eras. */
  const era = nhlEraById(eraId);
  const inEra = era.teams.find(x => x.id === id);
  if (inEra) return `${inEra.city} ${inEra.name}`;
  const t = NHL_TEAMS.find(x => x.id === id);
  if (t) return `${t.city} ${t.name}`;
  const old = NHL_TEAMS_2006.find(x => x.id === id);
  return old ? `${old.city} ${old.name}` : id;
}

export function majorAwardName(pos: NhlCareerPos): string {
  return pos === 'G' ? 'Vezina' : pos === 'D' ? 'Norris' : 'Hart';
}

export function startNhlCareer(
  name: string, pos: NhlCareerPos, archetype: NhlArchetype, rng: () => number = Math.random,
  appearance?: PlayerAppearance | null, eraId?: string,
): NhlCareerState {
  /* Round 173: the era decides the year, the league you are drafted into
     and the money. Leaving it off is today's league, byte for byte. */
  const era = nhlEraById(eraId);
  const pool = nhlEraTeamIds(eraId);
  const base = 66 + Math.floor(rng() * 8) + archetype.ovrBoost;
  const pot = Math.min(99, base + 11 + Math.floor(rng() * 13) + archetype.potBoost);
  const stock = Math.max(1, Math.round(50 - (base - 64) * 4.5 + rng() * 24));
  const team = pool[Math.floor(rng() * pool.length)];
  const c: NhlCareerState = {
    name, pos, archetype, team,
    year: era.startYear, age: 18 + Math.floor(rng() * 2),
    ovr: base, pot,
    morale: 70, fanbase: stock <= 10 ? 55 : 32, health: 100,
    salary: Math.max(0.3, Math.round((stock <= 10 ? 3.5 : 0.9) * era.moneyScale * 10) / 10),
    contractYears: 3,
    seasons: [],
    cups: 0, harts: 0, allStars: 0, connSmythes: 0,
    retired: false,
    draftPick: stock,
    earnings: 0,
    // Round 59 life layer
    netWorth: 0.5,
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

export function nhlRollTeamQuality(prev: number | null, rng: () => number): number {
  if (prev == null) return 70 + Math.floor(rng() * 20);
  return Math.max(64, Math.min(95, Math.round(prev + (rng() * 12 - 6))));
}

/* ─── Round 183: the lineup ───
   The depth chart the NFL and NBA careers got in 182, in hockey's shape.
   The man ahead of you tracks the roster's quality, camps have hysteresis
   both ways, and the goalie nuance is real: a backup goalie is a genuine
   half-role (twenty-odd starts), and NO rookie netminder walks into a
   number one job on draft capital alone, top pick or not, because that is
   not how goalies are handled. An absent role (pre-183 saves, harness
   careers) means first choice, byte for byte. */

function nhlIncumbentOvr(teamQuality: number, rng: () => number): number {
  return Math.round(teamQuality - 7 + rng() * 8);
}

/** Draft-day lineup spot. Mutates c.role, returns the feed line. */
export function nhlAssignRole(c: NhlCareerState, teamQuality: number, rng: () => number = Math.random): string {
  const incumbent = nhlIncumbentOvr(teamQuality, rng);
  if (c.pos === 'G') {
    /* Goalies apprentice. Only outplaying the veteran opens the crease. */
    if (c.ovr >= incumbent + 2) { c.role = 'starter'; return '📋 The veteran lost the crease in camp. You are the number one.'; }
    c.role = 'backup';
    return '📋 You open as the backup goalie: twenty-odd starts and a clipboard cap.';
  }
  if (c.draftPick <= 10) {
    c.role = 'starter';
    return '📋 Top ten picks step straight into the top of the lineup.';
  }
  if (c.ovr >= incumbent + 2) {
    c.role = 'starter';
    return '📋 You outplayed the veteran in camp. Big minutes from night one.';
  }
  c.role = 'backup';
  return '📋 You open down the lineup: fourth-line shifts while you earn trust.';
}

/** The offseason camp fight. Mutates c.role, returns a line or null. */
export function nhlCampBattle(c: NhlCareerState, teamQuality: number, rng: () => number = Math.random): string | null {
  if (!c.role) c.role = 'starter'; /* pre-183 save repair */
  const incumbent = nhlIncumbentOvr(teamQuality, rng);
  if (c.role === 'starter') {
    if (c.ovr < incumbent - 5) {
      c.role = 'backup';
      c.morale = Math.max(20, c.morale - 10);
      return c.pos === 'G'
        ? '🪑 The crease belongs to the new man now. You are the backup again.'
        : '🪑 Bumped down the lineup. The new arrival took your minutes in camp.';
    }
    return null;
  }
  const p = Math.max(0.05, Math.min(0.9, 0.1 + (c.ovr - incumbent) * 0.07));
  if (c.ovr >= incumbent - 1 || rng() < p) {
    c.role = 'starter';
    c.morale = Math.min(100, c.morale + 10);
    return c.pos === 'G'
      ? '🚀 The crease is yours. Number one, opening night.'
      : '🚀 You won the camp battle. Top of the lineup, big minutes.';
  }
  return '🪑 Another camp down the lineup. The gap is closing.';
}

export function nhlMarketSalary(c: NhlCareerState): number {
  // Round 59: centres and defencemen get paid, wingers slightly less.
  // Round 173: era careers earn era money at the documented scale.
  const mult = (NHL_POS_PROFILE[c.pos] ?? NHL_POS_PROFILE.C).salary;
  const scale = nhlEraById(c.eraId).moneyScale;
  const base = Math.max(1, Math.round(((c.ovr - 66) * 0.62 - 1) * 10) / 10);
  return Math.max(0.4, Math.round(base * mult * scale * 10) / 10);
}

function gamesFor(c: NhlCareerState, rng: () => number): { games: number; note: string | null } {
  const risk = (1 - c.archetype.durability) * 0.5 + (100 - c.health) / 250;
  const full = c.pos === 'G' ? 58 + Math.floor(rng() * 10) : 79 + Math.floor(rng() * 4);
  if (rng() < risk) {
    const frac = 0.45 + rng() * 0.35;
    return { games: Math.max(20, Math.round(full * frac)), note: 'Injuries bit into the season.' };
  }
  return { games: full, note: null };
}

export function simNhlSeason(
  c: NhlCareerState, teamQuality: number, rng: () => number,
): { line: NhlSeasonLine; notes: string[] } {
  const notes: string[] = [];
  let { games, note } = gamesFor(c, rng);
  if (note) { notes.push(`🚑 ${note}`); c.health -= 7; }
  /* Round 183: the lineup decides the workload. A backup goalie gets the
     twenty-odd starts the role really carries; a skater down the lineup
     plays every night but on fourth-line ice time, so production scales
     instead of games. Absent role = first choice, byte for byte. */
  let iceShare = 1;
  if (c.role === 'backup') {
    if (c.pos === 'G') {
      games = Math.max(12, Math.round(games * 0.35));
      notes.push(`🪑 The backup's crease: ${games} starts behind the number one.`);
    } else {
      iceShare = 0.5 + rng() * 0.12;
      notes.push('🪑 Fourth-line minutes: every night, none of the power play.');
    }
  }
  const swing = seasonSwing(rng, c.age);
  const form = c.ovr + (c.morale - 60) / 12 + (teamQuality - 78) / 9
    // Round 98: the season itself gets a say, so career years and lost
    // years both exist. Averages out to zero across a career.
    + swing;
  const line: NhlSeasonLine = {
    year: c.year, team: c.team, age: c.age, ovr: c.ovr, games,
    awards: [], teamResult: '', salary: c.salary,
  };
  if (c.pos === 'G') {
    line.wins = Math.max(8, Math.round(games * (0.3 + (form - 64) * 0.009) + rng() * 4));
    line.svpct = Math.min(0.938, Math.max(0.885, Math.round((0.898 + (form - 64) * 0.0011 + rng() * 0.006) * 1000) / 1000));
  } else {
    const g = games / 82;
    const mult = c.archetype.scoringMult;
    // Round 97: NHL_POS_PROFILE carries an offense weight (D is 0.55) that
    // this line never used, so defencemen were finishing with a median of 20
    // goals, roughly what a first line winger scores. Assists deliberately
    // stay high for a defenceman, because that is how they actually produce.
    const off = (NHL_POS_PROFILE[c.pos] ?? NHL_POS_PROFILE.C).offense;
    line.goals = Math.min(72, Math.max(1, Math.round((4 + (form - 62) * 1.35) * mult * off * g * iceShare + rng() * 5)));
    line.assists = Math.min(90, Math.max(2, Math.round((7 + (form - 62) * 1.5) * (c.pos === 'D' ? 1.15 : 1.05 - (mult - 1) * 0.5) * g * iceShare + rng() * 7)));
    line.points = (line.goals ?? 0) + (line.assists ?? 0);
  }
  // Round 123: computed up here rather than down with the rest of the awards
  // because the Conn Smythe is decided inside the playoff block below and it
  // needs the same number everything else is judged on.
  const statScore = nhlSeasonScore(c.pos, line);

  const strength = teamQuality + (c.ovr - 76) * 0.4;
  const playoffOdds = Math.max(0.05, Math.min(0.9, (strength - 66) / 28));
  let result = 'Missed the playoffs';
  let poStage = -1;
  if (rng() < playoffOdds) {
    const stages = ['Lost in Round 1', 'Lost in Round 2', 'Lost the Conference Final', 'Lost the Cup Final', 'WON THE STANLEY CUP'];
    let stage = 0;
    while (stage < 4 && rng() < 0.42 + (strength - 78) / 85) stage++;
    poStage = stage;
    result = stages[stage];
    if (result === 'WON THE STANLEY CUP') {
      c.cups += 1;
      c.fanbase = Math.min(100, c.fanbase + 15);
      notes.push('🏆 THE CUP. Your day with it is coming.');
      // Round 123: winning the Cup already narrowed the field to your own
      // dressing room, so that is what you are drawn against. Patrick Roy is
      // the only man to win it three times.
      if (wonAward(rng, 'nhl', 'connSmythe', c.pos, statScore)) {
        line.awards.push('Conn Smythe'); c.connSmythes += 1; notes.push('🏆 CONN SMYTHE.');
      }
    }
  }
  line.teamResult = result;

  // Round 103: sixteen wins is its own season, so it gets its own line.
  const poDepth = playoffDepthOf(poStage >= 0, poStage);
  if (poDepth >= 0) {
    const poG = playoffGames(poDepth, rng, 'nhl');
    const clutch = clutchSwing(rng);
    const poForm = form + clutch - 1.2;   // playoff hockey is tighter
    line.poGames = poG;
    if (c.pos === 'G') {
      line.poWins = Math.max(0, Math.min(16, Math.round(poG * (0.45 + (poForm - 64) * 0.006))));
      line.poSvpct = Math.min(0.96, Math.max(0.86, Math.round((0.903 + (poForm - 64) * 0.0012 + rng() * 0.006) * 1000) / 1000));
      notes.push(`📊 Playoffs: ${poG} games, ${line.poWins} wins, ${line.poSvpct.toFixed(3)} SV%.`);
    } else {
      const pg = poG / 82;
      const off = (NHL_POS_PROFILE[c.pos] ?? NHL_POS_PROFILE.C).offense;
      line.poGoals = Math.max(0, Math.round((4 + (poForm - 62) * 1.35) * c.archetype.scoringMult * off * pg + rng() * 2));
      line.poAssists = Math.max(0, Math.round((7 + (poForm - 62) * 1.5) * (c.pos === 'D' ? 1.15 : 1.05 - (c.archetype.scoringMult - 1) * 0.5) * pg + rng() * 3));
      line.poPoints = (line.poGoals ?? 0) + (line.poAssists ?? 0);
      notes.push(`📊 Playoffs: ${poG} games, ${line.poGoals}G ${line.poAssists}A ${line.poPoints}P.`);
    }
    const cn = clutchNote(clutch, poDepth, 'nhl');
    if (cn) notes.push(cn);
  }

  /* Round 123: the All-Star nod was a naked threshold and a MEDIAN career
     collected eight of them, with the best of 300 careers on twenty one.
     Gordie Howe holds the real record at twenty one selections, twelve first
     team and nine second, over twenty six seasons, and nobody else is close.
     Twelve players make it a year, six positions across two teams, so the
     draw is against the other men who play your position. The major was
     gated on an overall of 91 and fired twice in 300 careers. Wayne Gretzky
     won nine Harts, Bobby Orr eight Norrises, Jacques Plante seven Vezinas.
     See careerAwards.ts. */
  if (c.seasons.length === 0 && wonAward(rng, 'nhl', 'calder', c.pos, statScore)) {
    line.awards.push('Calder Trophy'); notes.push('🏆 Calder Trophy.');
  }
  if (wonAward(rng, 'nhl', 'nhlAllStar', c.pos, statScore)) {
    line.awards.push('All-Star'); c.allStars += 1; notes.push('⭐ All-Star.');
  }
  if (wonAward(rng, 'nhl', 'nhlMajor', c.pos, statScore)) {
    const award = majorAwardName(c.pos);
    line.awards.push(award); c.harts += 1; notes.push(`👑 THE ${award.toUpperCase()}.`);
  }

  // ── Round 59: the rest of the trophy case ──
  // The game had Calder, All-Star, one major and Conn Smythe only, so a
  // shutdown defenseman or a backup who took the job could play fifteen years
  // and win nothing. Every seat on the bench now has hardware to chase.
  //
  // Round 123: the stat gates stay, because a man who scored 30 is not in the
  // Rocket Richard conversation whatever else happened. What got replaced is
  // the coin flip after the gate, and this is where it was most obviously
  // wrong: the Rocket Richard and the Art Ross have exactly one winner each
  // per season and the old code gave them out on a 60 percent roll.
  const isSkater = c.pos !== 'G';
  const pts = (line.points ?? 0);
  if (isSkater && (line.goals ?? 0) >= 45 && games >= 70 && wonAward(rng, 'nhl', 'rocketRichard', c.pos, statScore)) {
    line.awards.push('Rocket Richard'); notes.push('🚀 Rocket Richard, most goals in the league.');
  }
  if (isSkater && pts >= 100 && games >= 70 && wonAward(rng, 'nhl', 'artRoss', c.pos, statScore)) {
    line.awards.push('Art Ross'); notes.push('🎩 Art Ross, league scoring title.');
  }
  if (c.pos === 'C' && games >= 70 && wonAward(rng, 'nhl', 'selke', c.pos, statScore)) {
    line.awards.push('Selke Trophy'); notes.push('🛡️ Selke Trophy, best defensive forward.');
  }
  if (c.pos === 'G' && (line.svpct ?? 0) >= 0.925 && games >= 50 && wonAward(rng, 'nhl', 'jennings', c.pos, statScore)) {
    line.awards.push('William Jennings'); notes.push('🧱 Jennings Trophy, fewest goals against.');
  }
  if (isSkater && games >= 78 && c.health >= 80 && wonAward(rng, 'nhl', 'masterton', c.pos, statScore)) {
    line.awards.push('Masterton Nominee'); notes.push('🎖️ Masterton nomination for perseverance.');
  }
  // A real bounce off a lost season, not just a good year.
  const prevSeason = c.seasons[c.seasons.length - 1];
  if (prevSeason && prevSeason.games <= 35 && games >= 70 && wonAward(rng, 'nhl', 'nhlComeback', c.pos, statScore)) {
    line.awards.push('Comeback Player of the Year'); notes.push('🔁 Comeback Player of the Year.');
  }

  c.earnings += c.salary;
  // Round 98: tell the player when the season itself was the story.
  const sn = swingNote(swing, 'nhl');
  if (sn) notes.push(sn);
  // Round 104: the rival played his season too, on the same scale as mine,
  // so the head to head is an honest comparison rather than a vibe.
  if (c.rival && !c.rival.retired) {
    for (const n of judgeRivalSeason(c.rival, (c.pos === 'G' ? Math.round((line.wins ?? 0) * 1.6 + Math.max(0, ((line.svpct ?? 0.9) - 0.9) * 900)) : (line.points ?? 0)), c.name, 'nhl', rng)) notes.push(n);
  }
  c.seasons.push(line);
  return { line, notes };
}

export function nhlProgress(c: NhlCareerState, rng: () => number): string[] {
  const notes: string[] = [];
  const before = c.ovr;
  // Round 59: progression slowed, with the fall starting at the age this
  // position actually falls off. Goalies last longest, as they do.
  if (c.age <= 25 && c.ovr < c.pot) {
    const drag = c.ovr >= 92 ? 0.25 : c.ovr >= 88 ? 0.5 : c.ovr >= 84 ? 0.75 : 1;
    const raw = 1 + Math.floor(rng() * 2);
    c.ovr = Math.min(c.pot, c.ovr + Math.max(c.ovr >= 88 ? 0 : 1, Math.round(raw * drag)));
  } else if (c.age <= 28 && c.ovr < c.pot && rng() < 0.45) {
    c.ovr = Math.min(c.pot, c.ovr + 1);
  } else if (c.age >= ((NHL_POS_PROFILE[c.pos] ?? NHL_POS_PROFILE.C).cliff)) {
    const wear = (100 - c.health) / 40;
    c.ovr = Math.max(60, Math.round(c.ovr - (1 + rng() * 2 + wear) * (c.age >= 37 ? 1.5 : 1)));
  }
  if (c.ovr - before >= 4) notes.push(`📈 The leap: ${before} to ${c.ovr}.`);
  if (before - c.ovr >= 3) notes.push(`📉 The legs go first: ${before} to ${c.ovr}.`);
  if (c.age >= 31) c.health = Math.max(30, c.health - 3);
  c.age += 1;
  c.year += 1;
  c.contractYears -= 1;
  c.morale = Math.max(20, Math.min(100, c.morale + Math.round(rng() * 10 - 4)));
  /* Round 183: a year down the lineup wears on you and the crowd learns
     other names. */
  if (c.role === 'backup') {
    c.morale = Math.max(20, c.morale - 3);
    c.fanbase = Math.max(0, c.fanbase - 2);
  }
  // ── Round 59: the corruption meter resolves here ──
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
      notes.push('🚨 Suspended indefinitely by the league. Every dollar they could trace is gone.');
    } else if ((c.heat ?? 0) >= 65 && (c.heat ?? 0) - drift < 65) {
      notes.push('🕵️ The league office has opened a formal investigation.');
    }
  }
  const upkeep = c.yearlyCosts ?? 0;
  if (upkeep > 0) c.netWorth = Math.round(((c.netWorth ?? c.earnings * 0.45) - upkeep) * 10) / 10;
  return notes;
}

/* Round 179: the real July 1. Replaces the old two-button 'contract' card in
   the event deck; the board now guarantees this screen before any season
   starts with no deal. */
export function buildNhlFaWindow(c: NhlCareerState, incumbentQuality: number, rng: () => number = Math.random): FaWindow {
  return buildFaWindow({
    sport: 'nhl',
    currentTeam: c.team,
    pool: nhlEraTeamIds(c.eraId).map(id => ({ id, label: nhlTeamLabelOf(id, c.eraId) })),
    market: nhlMarketSalary(c),
    discount: 0.88,
    minSalary: 0.4,
    ovr: c.ovr,
    age: c.age,
    accolades: c.allStars,
    cliffAge: (NHL_POS_PROFILE[c.pos] ?? NHL_POS_PROFILE.C).cliff,
    incumbentQuality,
    rng,
  });
}

export function nhlFaPushArgs(c: NhlCareerState, rng: () => number = Math.random): FaPushArgs {
  return { ovr: c.ovr, age: c.age, accolades: c.allStars, cliffAge: (NHL_POS_PROFILE[c.pos] ?? NHL_POS_PROFILE.C).cliff, rng };
}

/* Round 207: the extension talk, the decision that comes BEFORE free
   agency. Same wrapper shape as the window above: this file owns the
   sport's numbers, usCareerExtension.ts owns the rules. */
export function buildNhlExtension(c: NhlCareerState, rng: () => number = Math.random): ExtensionTalk {
  return buildExtension({
    sport: 'nhl',
    team: c.team,
    label: nhlTeamLabelOf(c.team, c.eraId),
    market: nhlMarketSalary(c),
    minSalary: 0.4,
    ovr: c.ovr,
    age: c.age,
    accolades: c.allStars,
    cliffAge: (NHL_POS_PROFILE[c.pos] ?? NHL_POS_PROFILE.C).cliff,
    rng,
  });
}

export function nhlExtPushArgs(c: NhlCareerState, rng: () => number = Math.random): ExtPushArgs {
  return { ovr: c.ovr, age: c.age, accolades: c.allStars, cliffAge: (NHL_POS_PROFILE[c.pos] ?? NHL_POS_PROFILE.C).cliff, rng };
}

export function drawNhlEvent(c: NhlCareerState, rng: () => number): NhlCareerEvent {
  const deck: NhlCareerEvent[] = [];
  /* Round 179: the 'contract' card left this deck for the free agency window. */

  /* Round 184: the press room reads the season. Big moments take the floor
     outright; the smaller questions join the deck. */
  const press = buildPressMoment('nhl', pressFactsFrom(c, nhlTeamLabelOf(c.team, c.eraId)), rng);
  if (press) {
    const ev: NhlCareerEvent = {
      id: press.id, title: press.title, body: press.body,
      options: press.options.map(o => ({
        label: o.label, effect: o.effectLine,
        apply: (cc: NhlCareerState, r: () => number) => applyPressChoice(cc, o, r),
      })),
    };
    if (press.big) return ev;
    deck.push(ev);
  }

  deck.push({
    id: 'training',
    title: 'Summer plan',
    body: 'The lake house or the gym. Where does the summer go?',
    options: [
      { label: 'Skills coach', effect: 'Push the ceiling', apply: (cc, r) => { if (cc.age >= 31) { cc.health = Math.min(100, cc.health + 4); return 'Maintenance summer. Health +4.'; } const up = 1 + Math.floor(r() * 2); cc.ovr = Math.min(cc.pot + 1, cc.ovr + up); return `Rating +${up}.`; } },
      { label: 'Strength block', effect: 'Durability', apply: (cc) => { cc.health = Math.min(100, cc.health + 10); return 'Health +10. Built for April through June.'; } },
      { label: 'The content summer', effect: 'Fame', apply: (cc) => { cc.fanbase = Math.min(100, cc.fanbase + 12); cc.earnings += 2; return 'Golf videos and a doc crew. 2M banked.'; } },
    ],
  });
  if (c.morale < 55) {
    deck.push({
      id: 'unhappy',
      title: 'It is not working here',
      body: 'The system, the minutes, the losing. Your agent is on the phone.',
      options: [
        { label: 'Request a trade', effect: 'Fresh sheet of ice', apply: (cc, r) => { const pool = nhlEraTeamIds(cc.eraId); const nt = pool[Math.floor(r() * pool.length)]; cc.team = nt; cc.morale = 74; cc.fanbase = 38; return `Traded to ${nhlTeamLabelOf(nt, cc.eraId)}.`; } },
        { label: 'Say nothing, work', effect: 'Room respect', apply: (cc) => { cc.morale += 7; cc.fanbase += 4; return 'Heads down. The room respects it.'; } },
      ],
    });
  }
  deck.push({
    id: 'media',
    title: 'The spicy podcast',
    body: 'A player-run podcast wants your unfiltered thoughts on the league.',
    options: [
      { label: 'Chirp away', effect: 'Viral', apply: (cc) => { cc.fanbase = Math.min(100, cc.fanbase + 10); cc.morale -= 3; return 'The clips rip around the league group chats.'; } },
      { label: 'Keep it boring', effect: 'Respect', apply: (cc) => { cc.morale += 4; return 'Good clip, no headlines. Hockey answer.'; } },
    ],
  });
  // ── Round 59: 90 life events and the corruption deck join the draw ──
  deck.push(...getNhlLifeEventsA(c, rng));
  deck.push(...getNhlLifeEventsB(c, rng));
  const corrupt = getNhlCorruptionEvents(c, rng);
  deck.push(...corrupt);
  const arcOpen = Object.keys(c.lifeFlags ?? {}).some(k => ['bounty', 'cap', 'doctor', 'tips', 'juniorAgent', 'wash'].includes(k));
  if (arcOpen && corrupt.length > 0 && rng() < 0.45) {
    return corrupt[Math.floor(rng() * corrupt.length)];
  }
  return deck[Math.floor(rng() * deck.length)];
}

export function nhlShouldRetire(c: NhlCareerState): boolean {
  return c.ovr <= 63 || c.age >= (c.pos === 'G' ? 41 : 40) || c.seasons.length >= 22;
}

export interface NhlLegacy { score: number; verdict: string; hof: boolean; bullets: string[] }

export function nhlCareerTotals(c: NhlCareerState) {
  let goals = 0, assists = 0, points = 0, wins = 0, games = 0;
  for (const s of c.seasons) {
    goals += s.goals ?? 0; assists += s.assists ?? 0; points += s.points ?? 0; wins += s.wins ?? 0; games += s.games;
  }
  return { goals, assists, points, wins, games };
}

export function nhlLegacyOf(c: NhlCareerState): NhlLegacy {
  const t = nhlCareerTotals(c);
  /* Round 123 recalibration. A median career used to collect eight All-Star
     selections, so allStars * 26 was 208 free points for being ordinary and
     69 percent of careers retired to the Hall of Fame. An All-Star nod is
     now worth 45 because you have to be one of forty four players in the
     league to get one, the major is worth 160 because Gretzky only managed
     nine of them in twenty seasons, and the points term came down because
     twenty one seasons of hockey adds up whoever you are.

     Measured over 1100 careers after: median score 307, Hall of Fame 16.5
     percent, Rushmore tier 2.5 percent, forced 90 ceiling career gets in 70
     percent of the time. The bottom tier moved from 170 to 230 for the same
     reason as baseball: at 170 nobody could reach it and the line was dead. */
  let score = c.cups * 85 + c.harts * 160 + c.connSmythes * 85 + c.allStars * 45 + c.seasons.length * 7;
  score += c.pos === 'G' ? t.wins / 6.5 : t.points / 18;
  score = Math.round(score);
  const hof = score >= 500;
  const verdict = score >= 900 ? 'Rushmore of the sport, the debate is over'
    : score >= 500 ? 'Hockey Hall of Famer'
    : score >= 330 ? 'Franchise icon, Hall of Very Good'
    : score >= 230 ? 'A long, honest NHL career'
    : 'A cup of coffee and a great story';
  const bullets = [
    `${c.seasons.length} seasons, ${c.cups} Cup${c.cups === 1 ? '' : 's'}, ${c.harts} ${majorAwardName(c.pos)}${c.harts === 1 ? '' : 's'}, ${c.connSmythes} Conn Smythe${c.connSmythes === 1 ? '' : 's'}, ${c.allStars} All-Star nods`,
    c.pos === 'G' ? `${t.wins} wins in ${t.games} games` : `${t.goals} goals, ${t.assists} assists, ${t.points} points in ${t.games} games`,
    `${Math.round(c.earnings)}M career earnings, drafted pick ${c.draftPick}`,
  ];
  return { score, verdict, hof, bullets };
}

/* ─── Round 59: the money ─── */
export type NhlSpendCategory = 'home' | 'ride' | 'invest' | 'body' | 'flex' | 'family' | 'shady';

export interface NhlSpendItem {
  id: string; name: string; emoji: string; category: NhlSpendCategory;
  cost: number; yearly?: number; desc: string; oneTime: boolean;
  minNetWorth?: number; minFanbase?: number; requiresDirty?: boolean; effect?: string;
}

export const NHL_SPEND_ITEMS: NhlSpendItem[] = [
  // Home
  { id: 'downtown_loft', name: 'Downtown Loft', emoji: '🏙️', category: 'home', cost: 1.5, desc: 'A real place instead of the rookie hotel, 1.5M', oneTime: true },
  { id: 'gated_house', name: 'House Behind A Gate', emoji: '🏡', category: 'home', cost: 4.5, desc: 'Where the fans cannot ring the doorbell, 4.5M', oneTime: true, minNetWorth: 4 },
  { id: 'summer_villa', name: 'Summer Villa', emoji: '🌴', category: 'home', cost: 8, yearly: 0.2, desc: 'Where the offseason actually happens, 8M', oneTime: true, minNetWorth: 9 },
  { id: 'compound', name: 'The Compound', emoji: '🏰', category: 'home', cost: 20, yearly: 0.5, desc: 'Full court, screening room, guest wing, 20M', oneTime: true, minNetWorth: 25 },
  { id: 'home_court', name: 'Private Rink And Gym', emoji: '🏀', category: 'home', cost: 5, yearly: 0.25, desc: 'Sheet of ice, shooting room, weights, cold tub, 5M', oneTime: true, minNetWorth: 6, effect: 'Health +6 every offseason' },
  { id: 'hometown_court', name: 'Rebuild Your Home Rink', emoji: '⛹️', category: 'home', cost: 2, desc: 'New boards, new glass, real dressing rooms, 2M', oneTime: true, minNetWorth: 3, effect: 'Fanbase +12' },
  // Ride
  { id: 'first_car', name: 'The Car You Always Wanted', emoji: '🚗', category: 'ride', cost: 0.15, desc: 'First real purchase. Everybody does it, 150k', oneTime: true },
  { id: 'sprinter', name: 'Custom Sprinter', emoji: '🚐', category: 'ride', cost: 0.5, desc: 'Reclining seats and four screens for road trips, 500k', oneTime: true },
  { id: 'exotic', name: 'Exotic Car', emoji: '🏎️', category: 'ride', cost: 0.6, desc: 'Photographed in the players lot constantly, 600k', oneTime: false },
  { id: 'hypercar_nhl', name: 'Hypercar', emoji: '🏁', category: 'ride', cost: 3.5, desc: 'Seven figures you will drive twice, 3.5M', oneTime: false, minNetWorth: 7 },
  { id: 'jet_share_nhl', name: 'Private Jet Share', emoji: '✈️', category: 'ride', cost: 6, yearly: 0.7, desc: 'Home for every off day, 6M', oneTime: true, minNetWorth: 12 },
  // Invest
  { id: 'restaurant_group', name: 'Restaurant Group', emoji: '🍽️', category: 'invest', cost: 1.2, desc: '35 percent chance it prints 3M, otherwise it limps', oneTime: false },
  { id: 'index_nhl', name: 'Boring Index Fund', emoji: '📈', category: 'invest', cost: 2, desc: 'Steady 7 percent. Your accountant weeps with joy', oneTime: false },
  { id: 'media_company', name: 'Media Company', emoji: '🎙️', category: 'invest', cost: 3, yearly: 0.15, desc: 'Podcasts, docs, and your own narrative, 3M', oneTime: true, minNetWorth: 5, effect: 'Fanbase +6 a year' },
  { id: 'youth_academy_nhl', name: 'Youth Academy', emoji: '🎓', category: 'invest', cost: 2.5, yearly: 0.1, desc: 'Where the next you comes from, 2.5M', oneTime: true, minNetWorth: 4, effect: 'Fanbase +8' },
  { id: 'crypto_nhl', name: 'Crypto Punt', emoji: '🪙', category: 'invest', cost: 1, desc: '20 percent chance of 5x, 80 percent chance of a lesson', oneTime: false },
  { id: 'wine_label', name: 'Wine Label', emoji: '🍷', category: 'invest', cost: 2, desc: 'Steady 10 percent and very good dinners', oneTime: true, minNetWorth: 4 },
  { id: 'team_stake', name: 'Minority Stake In A Franchise', emoji: '🏆', category: 'invest', cost: 40, desc: 'A real piece of a real team, 40M', oneTime: true, minNetWorth: 70, effect: 'The retirement plan, fanbase +10' },
  // Body
  { id: 'chef_nhl', name: 'Private Chef', emoji: '👨‍🍳', category: 'body', cost: 0, yearly: 0.15, desc: 'Every meal built for 82 games, 150k a year', oneTime: true, effect: 'Health +4 a year' },
  { id: 'recovery_nhl', name: 'Recovery Suite', emoji: '🧊', category: 'body', cost: 2, yearly: 0.12, desc: 'Cryo, compression, the whole circus, 2M', oneTime: true, minNetWorth: 3, effect: 'Injury risk down' },
  { id: 'shot_doctor', name: 'Private Skating Coach', emoji: '🎯', category: 'body', cost: 0, yearly: 0.2, desc: 'The guy who rebuilt three strides, 200k a year', oneTime: true, effect: 'Rating +1 a year while young' },
  { id: 'sleep_nhl', name: 'Sleep Program', emoji: '😴', category: 'body', cost: 0.7, desc: 'Turns out most of it is sleep, 700k', oneTime: true, effect: 'Health +8' },
  { id: 'psych_nhl', name: 'Sports Psychologist', emoji: '🧠', category: 'body', cost: 0, yearly: 0.12, desc: 'The part nobody used to talk about, 120k a year', oneTime: true, effect: 'Morale +8 on hire' },
  { id: 'biomech_nhl', name: 'Biomechanics Team', emoji: '🔬', category: 'body', cost: 1.2, desc: 'They rebuilt your landing mechanics, 1.2M', oneTime: true, effect: 'Rating +2' },
  // Flex
  { id: 'chain_nhl', name: 'The Chain', emoji: '💎', category: 'flex', cost: 0.6, desc: 'Iced out, photographed in every tunnel, 600k', oneTime: false, minFanbase: 40 },
  { id: 'tunnel_fits', name: 'A Stylist And A Tunnel Budget', emoji: '🕶️', category: 'flex', cost: 0, yearly: 0.3, desc: 'The tunnel is a runway now, 300k a year', oneTime: true, minFanbase: 45, effect: 'Fanbase +5 a year' },
  { id: 'watch_nhl', name: 'Watch Collection', emoji: '⌚', category: 'flex', cost: 2, desc: 'Six figures on each wrist, 2M', oneTime: true, minNetWorth: 5 },
  { id: 'album', name: 'Fund Your Own Album', emoji: '🎤', category: 'flex', cost: 1, desc: 'You cannot rap. You are doing it anyway, 1M', oneTime: true, minFanbase: 55, effect: 'Fanbase +10 and endless jokes' },
  { id: 'signature_shoe', name: 'Signature Shoe Line', emoji: '👟', category: 'flex', cost: 2.5, desc: 'Your silhouette on a shoe, 2.5M', oneTime: true, minFanbase: 70, effect: 'Fanbase +12, real royalties' },
  { id: 'court_mural', name: 'Mural On Your Old Rink', emoji: '🎨', category: 'flex', cost: 0.3, desc: 'Twenty feet of you where you learned, 300k', oneTime: true, minFanbase: 55 },
  { id: 'ring_copy_nhl', name: 'Second Ring, Bigger', emoji: '💍', category: 'flex', cost: 0.5, desc: 'A custom copy with more diamonds than the real one, 500k', oneTime: true, minNetWorth: 8 },
  // Family
  { id: 'mom_house_nhl', name: 'Buy Your Mother A House', emoji: '❤️', category: 'family', cost: 2, desc: 'The reason most people do any of this, 2M', oneTime: true, minNetWorth: 2.5, effect: 'Morale +15' },
  { id: 'siblings_nhl', name: 'Pay For Your Siblings College', emoji: '🎓', category: 'family', cost: 0.7, desc: 'All of them, all four years, 700k', oneTime: true, effect: 'Morale +10' },
  { id: 'family_office_nhl', name: 'Family Office', emoji: '🏦', category: 'family', cost: 0, yearly: 0.18, desc: 'Professionals so relatives stop asking you directly, 180k a year', oneTime: true, effect: 'Protects your money' },
  { id: 'foundation_nhl', name: 'Start A Foundation', emoji: '🤝', category: 'family', cost: 3.5, yearly: 0.25, desc: 'Your name doing good in your city, 3.5M', oneTime: true, minNetWorth: 7, effect: 'Fanbase +10 a year' },
  { id: 'road_family', name: 'Fly Your Family To Every Road Game', emoji: '🛫', category: 'family', cost: 0, yearly: 0.2, desc: 'Somebody in the stands every night, 200k a year', oneTime: true, effect: 'Morale +6 a year' },
  { id: 'trust_nhl', name: 'Set Up Trusts For Your Kids', emoji: '🧸', category: 'family', cost: 6, desc: 'They will never have to do this, 6M', oneTime: true, minNetWorth: 14 },
  // Shady
  { id: 'hshady_laundromats', name: 'Laundromat Chain', emoji: '🧼', category: 'shady', cost: 1, desc: 'Remarkable revenue for the foot traffic, 1M', oneTime: true, requiresDirty: true, effect: 'Washes 2M of dirty money' },
  { id: 'hshady_barbers', name: 'Barbershop Chain', emoji: '💈', category: 'shady', cost: 0.8, desc: 'Nine chairs, three customers, endless cash, 800k', oneTime: true, requiresDirty: true, effect: 'Washes 1.5M of dirty money' },
  { id: 'hshady_club', name: 'The Nightclub', emoji: '🍾', category: 'shady', cost: 3, yearly: 0.25, desc: 'Bottle service and a flexible ledger, 3M', oneTime: true, requiresDirty: true, effect: 'Washes 4M, heat +3 a year' },
  { id: 'hshady_lawyer', name: 'The Lawyer Who Never Loses', emoji: '⚖️', category: 'shady', cost: 0, yearly: 0.45, desc: 'On retainer, answers at 3am, 450k a year', oneTime: true, effect: 'Heat cools twice as fast' },
  { id: 'hshady_fixer', name: 'A Guy Who Handles Things', emoji: '🤐', category: 'shady', cost: 0, yearly: 0.3, desc: 'You do not ask how, 300k a year', oneTime: true, effect: 'Heat -8 immediately' },
  { id: 'hshady_offshore', name: 'Offshore Account', emoji: '🏝️', category: 'shady', cost: 0.5, desc: 'An island, a bank, a form nobody files, 500k', oneTime: true, requiresDirty: true, effect: 'Hides money, heat +6' },
  // Round 59 hockey specific
  { id: 'skate_sharpener', name: 'Your Own Skate Sharpener', emoji: '⛸️', category: 'body', cost: 0, yearly: 0.07, desc: 'Travels with you, one hollow, never wrong, 70k a year', oneTime: true, effect: 'Morale +4 a year' },
  { id: 'shooting_room', name: 'Home Shooting Room', emoji: '🥅', category: 'body', cost: 0.5, desc: 'Synthetic ice, radar, 500 pucks a night, 500k', oneTime: true, effect: 'Rating +1' },
  { id: 'billet_house', name: 'Buy Your Billet Family A House', emoji: '🏠', category: 'family', cost: 1.5, desc: 'They fed you for three years at sixteen, 1.5M', oneTime: true, minNetWorth: 2, effect: 'Morale +15' },
  { id: 'junior_stake', name: 'Buy Into Your Junior Club', emoji: '🏒', category: 'invest', cost: 3, desc: 'The barn you came up in, 3M', oneTime: true, minNetWorth: 5, effect: 'Fanbase +8' },
  { id: 'outdoor_rink', name: 'Build An Outdoor Rink In Your Town', emoji: '❄️', category: 'home', cost: 0.8, yearly: 0.05, desc: 'Free, lit, open until 11pm all winter, 800k', oneTime: true, minNetWorth: 1.5, effect: 'Fanbase +10' },
  { id: 'jersey_wall', name: 'The Jersey Wall', emoji: '👕', category: 'flex', cost: 0.4, desc: 'Every sweater you ever swapped, framed, 400k', oneTime: true, minFanbase: 45 },
  { id: 'lake_cabin', name: 'The Cabin', emoji: '🛶', category: 'home', cost: 2.5, yearly: 0.08, desc: 'No cell service, one dock, June through August, 2.5M', oneTime: true, minNetWorth: 3.5, effect: 'Morale +8' },
  { id: 'beer_league', name: 'Sponsor Every Beer League Team In Town', emoji: '🍺', category: 'family', cost: 0, yearly: 0.06, desc: 'Jerseys, ice time, one very good party, 60k a year', oneTime: true, effect: 'Fanbase +5 a year' },
  // Round 59 second wave
  { id: 'barber_chair', name: 'A Barber On Retainer', emoji: '💇', category: 'body', cost: 0, yearly: 0.06, desc: 'Flies to every road city. The line has to be right, 60k a year', oneTime: true, effect: 'Morale +4 a year' },
  { id: 'film_room', name: 'Personal Film Analyst', emoji: '🎞️', category: 'body', cost: 0, yearly: 0.14, desc: 'Cuts every possession you played by 6am, 140k a year', oneTime: true, effect: 'Rating +1 a year' },
  { id: 'sneaker_vault', name: 'The Stick And Skate Vault', emoji: '👟', category: 'flex', cost: 0.9, desc: 'Climate controlled, 300 sticks, 900k', oneTime: true, minFanbase: 50 },
  { id: 'courtside_seats', name: 'Season Seats Behind The Bench For Your Block', emoji: '🎟️', category: 'family', cost: 0, yearly: 0.25, desc: 'Twelve seats behind the bench, all 41 home games, 250k a year', oneTime: true, effect: 'Fanbase +6 a year' },
  { id: 'barbershop_legit', name: 'A Real Barbershop', emoji: '✂️', category: 'invest', cost: 0.4, desc: 'An actual business with actual customers, 400k', oneTime: true },
  { id: 'summer_camp', name: 'Free Youth Hockey Camp', emoji: '⛹️', category: 'family', cost: 1, yearly: 0.15, desc: 'Two weeks, 400 kids, no fee, 1M', oneTime: true, minNetWorth: 2, effect: 'Fanbase +8, morale +6' },
];

export function getNhlSpendItem(id: string): NhlSpendItem | undefined {
  return NHL_SPEND_ITEMS.find(i => i.id === id);
}

/** Buy an item. Returns the new state and a log line, or null when blocked. */
export function buyNhlItem(c: NhlCareerState, itemId: string): { state: NhlCareerState; log: string } | null {
  const item = getNhlSpendItem(itemId);
  if (!item) return null;
  const owned = c.purchased ?? [];
  if (item.oneTime && owned.includes(itemId)) return null;
  const net = c.netWorth ?? Math.round(c.earnings * 0.45 * 10) / 10;
  if (item.minNetWorth && net < item.minNetWorth) return null;
  if (item.minFanbase && c.fanbase < item.minFanbase) return null;
  if (item.requiresDirty && (c.dirtyMoney ?? 0) <= 0) return null;
  if (item.cost > net) return null;

  const s: NhlCareerState = { ...c, purchased: [...owned, itemId] };
  s.netWorth = Math.round((net - item.cost) * 10) / 10;
  if (item.yearly) s.yearlyCosts = Math.round(((s.yearlyCosts ?? 0) + item.yearly) * 100) / 100;

  let log = `Bought ${item.name}.`;
  switch (itemId) {
    case 'hometown_court': s.fanbase = Math.min(100, s.fanbase + 12); log = 'You rebuilt the courts you grew up on. The whole neighborhood came out for the reopening.'; break;
    case 'youth_academy_nhl': s.fanbase = Math.min(100, s.fanbase + 8); log = 'Your academy opened with 120 kids on day one.'; break;
    case 'team_stake': s.fanbase = Math.min(100, s.fanbase + 10); log = 'You own a piece of a franchise now. The other owners are still deciding how they feel about that.'; break;
    case 'sleep_nhl': s.health = Math.min(100, s.health + 8); log = 'Turns out it was mostly sleep the whole time. Health +8.'; break;
    case 'biomech_nhl': s.ovr = Math.min(99, s.ovr + 2); log = 'They rebuilt how you land and everything got easier. Rating +2.'; break;
    case 'psych_nhl': s.morale = Math.min(100, s.morale + 8); log = 'Best hire you ever made and the one you almost skipped. Morale +8.'; break;
    case 'mom_house_nhl': s.morale = Math.min(100, s.morale + 15); log = 'You handed your mother the keys and she did not say a word for a full minute. Morale +15.'; break;
    case 'siblings_nhl': s.morale = Math.min(100, s.morale + 10); log = 'Every sibling, all four years, paid in full. Morale +10.'; break;
    case 'album': s.fanbase = Math.min(100, s.fanbase + 10); log = 'The album has four million streams and the locker room has never let it go. Fanbase +10.'; break;
    case 'signature_shoe': s.fanbase = Math.min(100, s.fanbase + 12); log = 'Your silhouette is on a shoe in every mall in the country. Fanbase +12.'; break;
    case 'foundation_nhl': s.fanbase = Math.min(100, s.fanbase + 10); log = 'The foundation launched with a block party and a scholarship fund. Fanbase +10.'; break;
    case 'hshady_laundromats': { const w = Math.min(2, c.dirtyMoney ?? 0); s.dirtyMoney = Math.max(0, Math.round(((s.dirtyMoney ?? 0) - 2) * 10) / 10); s.netWorth = Math.round((s.netWorth + w) * 10) / 10; log = 'Two million went in dirty and came out as a very busy laundromat chain.'; break; }
    case 'hshady_barbers': { const w = Math.min(1.5, c.dirtyMoney ?? 0); s.dirtyMoney = Math.max(0, Math.round(((s.dirtyMoney ?? 0) - 1.5) * 10) / 10); s.netWorth = Math.round((s.netWorth + w) * 10) / 10; log = 'Nine chairs, three customers, and a ledger that balances beautifully.'; break; }
    case 'hshady_club': { const w = Math.min(4, c.dirtyMoney ?? 0); s.dirtyMoney = Math.max(0, Math.round(((s.dirtyMoney ?? 0) - 4) * 10) / 10); s.netWorth = Math.round((s.netWorth + w) * 10) / 10; s.heat = Math.min(100, (s.heat ?? 0) + 3); log = 'The club opened. Four million cleaned and a line around the block.'; break; }
    case 'hshady_fixer': s.heat = Math.max(0, (s.heat ?? 0) - 8); log = 'You have a guy now. Heat -8, and you genuinely do not want to know how.'; break;
    case 'hshady_offshore': s.heat = Math.min(100, (s.heat ?? 0) + 6); log = 'The account is open. An island, a bank, and a form nobody will ever file. Heat +6.'; break;
    case 'shooting_room': s.ovr = Math.min(99, s.ovr + 1); log = 'Five hundred pucks a night in your own basement. Rating +1.'; break;
    case 'billet_house': s.morale = Math.min(100, s.morale + 15); log = 'You handed the keys to the family that fed you at sixteen. Nobody in that kitchen said anything for a full minute. Morale +15.'; break;
    case 'junior_stake': s.fanbase = Math.min(100, s.fanbase + 8); log = 'You own a piece of the barn you came up in. Fanbase +8.'; break;
    case 'outdoor_rink': s.fanbase = Math.min(100, s.fanbase + 10); log = 'The outdoor rink opened in November. It has not been empty since. Fanbase +10.'; break;
    case 'lake_cabin': s.morale = Math.min(100, s.morale + 8); log = 'No cell service, one dock, June through August. Morale +8.'; break;
    default: break;
  }
  return { state: s, log };
}
