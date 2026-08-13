/**
 * NFL My Career engine (2026-08-05, the career-for-every-sport push).
 * A BitLife-style player career: you are a fictional prospect (your name,
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
import { seasonSwing, swingNote } from './careerVariance';
import { getNflLifeEventsA } from './nflCareerLifeA';
import { getNflLifeEventsB } from './nflCareerLifeB';
import { getNflCorruptionEvents } from './nflCareerCorruption';

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
  draftPick: number;
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
}

export interface CareerEvent {
  id: string;
  title: string;
  body: string;
  options: { label: string; effect: string; apply: (c: CareerState, rng: () => number) => string }[];
}

export function startCareer(
  name: string, pos: CareerPos, archetype: Archetype, rng: () => number = Math.random,
  appearance?: PlayerAppearance | null,
): CareerState {
  const base = 66 + Math.floor(rng() * 8) + archetype.ovrBoost;
  const pot = Math.min(99, base + 10 + Math.floor(rng() * 14) + archetype.potBoost);
  // draft stock from rating: better prospects go earlier
  const stock = Math.max(1, Math.round(90 - (base - 64) * 9 + rng() * 40));
  const team = NFL_TEAM_NAMES[Math.floor(rng() * NFL_TEAM_NAMES.length)].abbr;
  const firstRound = stock <= 32;
  return {
    name, pos, archetype, team,
    year: 2026,
    age: 22,
    ovr: base,
    pot,
    morale: 70,
    fanbase: firstRound ? 55 : 35,
    health: 100,
    salary: firstRound ? Math.round((33 - stock) * 0.9 + 4) : 1.2,
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
}

export function teamLabelOf(abbr: string): string {
  return NFL_TEAM_NAMES.find(t => t.abbr === abbr)?.label ?? abbr;
}

/** Team quality random-walks per season so franchises rise and fall. */
export function rollTeamQuality(prev: number | null, rng: () => number): number {
  if (prev == null) return 68 + Math.floor(rng() * 22);
  return Math.max(62, Math.min(94, Math.round(prev + (rng() * 14 - 7))));
}

function seasonGames(c: CareerState, rng: () => number): { games: number; injuryNote: string | null } {
  const risk = (1 - c.archetype.durability) * 0.5 + (100 - c.health) / 260 + (c.pos === 'RB' ? 0.07 : 0);
  if (rng() < risk) {
    const missed = 2 + Math.floor(rng() * 9);
    return { games: Math.max(4, 17 - missed), injuryNote: `Missed ${missed} games hurt.` };
  }
  return { games: 17, injuryNote: null };
}

export function simSeason(
  c: CareerState, teamQuality: number, rng: () => number,
): { line: SeasonLine; notes: string[] } {
  const notes: string[] = [];
  const { games, injuryNote } = seasonGames(c, rng);
  if (injuryNote) { notes.push(`🚑 ${injuryNote}`); c.health -= 6; }
  const swing = seasonSwing(rng, c.age);
  const form = c.ovr + (c.morale - 60) / 10 + (teamQuality - 78) / 5
    // Round 98: the season itself gets a say, so career years and lost
    // years both exist. Averages out to zero across a career.
    + swing;
  const g = games / 17;
  const line: SeasonLine = {
    year: c.year, team: c.team, age: c.age, ovr: c.ovr, games,
    awards: [], teamResult: '', salary: c.salary,
  };
  if (c.pos === 'QB') {
    // Round 98: capped just under Peyton Manning's 5477 in 2013, which is
    // the real record. A career year should scrape it, never beat it.
    line.passYds = Math.min(5450, Math.round((1900 + (form - 62) * 92 + rng() * 500) * g));
    line.passTd = Math.max(4, Math.round((6 + (form - 62) * 0.95 + rng() * 6) * g));
    // Round 56 realism fix: the old slope (0.25) meant a 95 rated quarterback
    // still threw 12 interceptions a year, which no elite passer does. Real
    // reference points: elite seasons land around 6 to 9, average starters 12
    // to 14, and bad starters 18 to 20. The steeper slope hits all three.
    line.ints = Math.max(1, Math.round((18.5 - (form - 62) * 0.36 + rng() * 4) * g));
  } else if (c.pos === 'RB') {
    line.rushYds = Math.round((260 + (form - 62) * 46 + rng() * 260) * g);
    line.rushTd = Math.max(0, Math.round((1 + (form - 62) * 0.42 + rng() * 3) * g));
    line.rec = Math.round((14 + (form - 62) * 1.1 + rng() * 12) * g);
    line.recYds = Math.round((line.rec ?? 0) * (6.5 + rng() * 3));
  } else if (c.pos === 'WR') {
    line.rec = Math.round((28 + (form - 62) * 2.5 + rng() * 14) * g);
    line.recYds = Math.round((line.rec ?? 0) * (10.5 + rng() * 4));
    line.recTd = Math.max(0, Math.round((1 + (form - 62) * 0.32 + rng() * 3) * g));
  } else if (c.pos === 'TE') {
    // Tight ends catch fewer, shorter, but score near the goal line.
    line.rec = Math.round((22 + (form - 62) * 1.9 + rng() * 12) * g);
    line.recYds = Math.round((line.rec ?? 0) * (9 + rng() * 3.5));
    line.recTd = Math.max(0, Math.round((2 + (form - 62) * 0.3 + rng() * 3) * g));
  } else if (c.pos === 'LB') {
    line.tackles = Math.round((62 + (form - 62) * 3.1 + rng() * 26) * g);
    line.sacks = Math.max(0, Math.round(((form - 66) * 0.18 + rng() * 3) * g * 10) / 10);
    line.picks = Math.max(0, Math.round(((form - 70) * 0.05 + rng() * 2) * g));
    line.forcedFum = Math.max(0, Math.round((rng() * 3) * g));
  } else if (c.pos === 'CB') {
    line.tackles = Math.round((38 + (form - 62) * 1.2 + rng() * 18) * g);
    line.picks = Math.max(0, Math.round(((form - 68) * 0.11 + rng() * 3) * g));
    line.passDef = Math.round((7 + (form - 62) * 0.5 + rng() * 9) * g);
    line.forcedFum = Math.max(0, Math.round((rng() * 2) * g));
  } else if (c.pos === 'EDGE') {
    line.sacks = Math.max(0, Math.round(((form - 64) * 0.52 + rng() * 5) * g * 10) / 10);
    line.tackles = Math.round((32 + (form - 62) * 1.1 + rng() * 16) * g);
    line.forcedFum = Math.max(0, Math.round(((form - 74) * 0.06 + rng() * 3) * g));
    line.passDef = Math.max(0, Math.round((rng() * 4) * g));
  } else if (c.pos === 'K') {
    line.fgAtt = Math.round((24 + rng() * 12) * g);
    const acc = Math.min(0.98, 0.66 + (form - 62) * 0.011 + rng() * 0.06);
    line.fgMade = Math.round((line.fgAtt ?? 0) * acc);
    line.longFg = Math.round(48 + (form - 64) * 0.5 + rng() * 12);
  }

  // team result
  const strength = teamQuality + (c.ovr - 74) * (c.pos === 'QB' ? 0.55 : c.pos === 'K' ? 0.08 : DEFENSIVE_POS.includes(c.pos) ? 0.22 : 0.25);
  const playoffOdds = Math.max(0.04, Math.min(0.92, (strength - 66) / 26));
  let result = 'Missed the playoffs';
  if (rng() < playoffOdds) {
    const runs = ['Lost in the Wild Card round', 'Lost in the Divisional round', 'Lost the Conference Championship', 'Lost the Super Bowl', 'WON THE SUPER BOWL'];
    let stage = 0;
    while (stage < 4 && rng() < 0.42 + (strength - 76) / 90) stage++;
    result = runs[stage];
    if (result === 'WON THE SUPER BOWL') { c.rings += 1; c.fanbase = Math.min(100, c.fanbase + 14); notes.push('💍 A RING.'); }
  }
  line.teamResult = result;

  // awards
  // Round 56: every position is scored on its own currency, normalised so a
  // dominant corner and a dominant quarterback land in the same range.
  const statScore = c.pos === 'QB'
    ? (line.passYds ?? 0) / 48 + (line.passTd ?? 0) * 2.4 - (line.ints ?? 0)
    : c.pos === 'RB'
      ? ((line.rushYds ?? 0) + (line.recYds ?? 0)) / 16 + (line.rushTd ?? 0) * 3
      : c.pos === 'WR' || c.pos === 'TE'
        ? (line.recYds ?? 0) / 14 + (line.recTd ?? 0) * 3 + (c.pos === 'TE' ? 12 : 0)
        : c.pos === 'LB'
          ? (line.tackles ?? 0) / 1.15 + (line.sacks ?? 0) * 5 + (line.picks ?? 0) * 9 + (line.forcedFum ?? 0) * 5
          : c.pos === 'CB'
            ? (line.picks ?? 0) * 15 + (line.passDef ?? 0) * 3.2 + (line.tackles ?? 0) / 2 + (line.forcedFum ?? 0) * 6
            : c.pos === 'EDGE'
              ? (line.sacks ?? 0) * 8.5 + (line.tackles ?? 0) / 1.6 + (line.forcedFum ?? 0) * 6
              : ((line.fgMade ?? 0) * 3.4 + ((line.longFg ?? 0) - 45) * 1.6);
  const isDef = DEFENSIVE_POS.includes(c.pos);
  const royLabel = isDef ? 'Defensive Rookie of the Year' : 'Offensive Rookie of the Year';
  if (c.seasons.length === 0 && statScore > 68 && rng() < 0.7) { line.awards.push(royLabel); notes.push(`🏆 ${royLabel}.`); }
  // Round 56: defenders chase Defensive Player of the Year instead of MVP.
  if (isDef && statScore > 112 && games >= 15 && rng() < 0.35) {
    line.awards.push('Defensive Player of the Year'); c.mvps += 1; notes.push('🛡️ DEFENSIVE PLAYER OF THE YEAR.');
  }
  if (statScore > 105 && games >= 15) { line.awards.push('All-Pro'); c.allPros += 1; notes.push('⭐ First-team All-Pro.'); }
  // Kickers and defenders do not win MVP. Neither do most people.
  if (!isDef && c.pos !== 'K' && statScore > 118 && games >= 15 && (c.pos === 'QB' ? c.ovr >= 90 && rng() < 0.28 : rng() < 0.06)) {
    line.awards.push('MVP'); c.mvps += 1; notes.push('👑 LEAGUE MVP.');
  }

  c.earnings += c.salary;
  // Round 98: tell the player when the season itself was the story.
  const sn = swingNote(swing, 'nfl');
  if (sn) notes.push(sn);
  c.seasons.push(line);
  return { line, notes };
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
  const upkeep = c.yearlyCosts ?? 0;
  if (upkeep > 0) {
    c.netWorth = Math.round(((c.netWorth ?? c.earnings * 0.45) - upkeep) * 10) / 10;
  }
  return notes;
}

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
  { id: 'recovery_suite', name: 'Recovery Suite', emoji: '🧊', category: 'body', cost: 1.5, yearly: 0.1, desc: 'Cryo, hyperbaric, the whole circus, 1.5M', oneTime: true, minNetWorth: 2, effect: 'Injury risk down' },
  { id: 'speed_coach', name: 'Private Speed Coach', emoji: '⚡', category: 'body', cost: 0, yearly: 0.15, desc: 'The guy who fixes everyone, 150k a year', oneTime: true, effect: 'Rating +1 a year while young' },
  { id: 'sleep_lab', name: 'Sleep Program', emoji: '😴', category: 'body', cost: 0.6, desc: 'Turns out most of it is sleep, 600k', oneTime: true, effect: 'Health +8' },
  { id: 'sports_psych', name: 'Sports Psychologist', emoji: '🧠', category: 'body', cost: 0, yearly: 0.1, desc: 'The part nobody used to talk about, 100k a year', oneTime: true, effect: 'Morale +8 on hire' },
  { id: 'vision_training', name: 'Vision Training', emoji: '👁️', category: 'body', cost: 0.8, desc: 'Read the field a quarter second sooner, 800k', oneTime: true, effect: 'Rating +2' },
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
    case 'vision_training': s.ovr = Math.min(99, s.ovr + 2); log = 'The game slowed down a quarter second. Rating +2.'; break;
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
  return Math.max(1.2, Math.round(((c.ovr - 64) * 1.55 - 6) * posMult * 10) / 10);
}

/** Between-season decision deck. One event is drawn per offseason. */
export function drawEvent(c: CareerState, rng: () => number): CareerEvent {
  const deck: CareerEvent[] = [];

  if (c.contractYears <= 0) {
    const market = marketSalary(c);
    deck.push({
      id: 'contract',
      title: 'Contract time',
      body: `Your deal is up. ${teamLabelOf(c.team)} offer ${Math.round(market * 0.88 * 10) / 10}M to stay. Free agency could pay ${market}M, on a contender or a rebuild, nobody knows.`,
      options: [
        {
          label: 'Re-sign at a hometown discount', effect: 'Loyalty, morale up',
          apply: (cc) => { cc.salary = Math.round(market * 0.88 * 10) / 10; cc.contractYears = 3; cc.morale += 8; cc.fanbase = Math.min(100, cc.fanbase + 10); return `Re-signed with ${teamLabelOf(cc.team)} for ${cc.salary}M x3.`; },
        },
        {
          label: 'Test free agency', effect: 'Max money, new city',
          apply: (cc, r) => {
            const newTeam = NFL_TEAM_NAMES[Math.floor(r() * NFL_TEAM_NAMES.length)].abbr;
            cc.team = newTeam; cc.salary = market; cc.contractYears = 3; cc.fanbase = 40;
            return `Signed with ${teamLabelOf(newTeam)} for ${market}M x3. New city, new pressure.`;
          },
        },
      ],
    });
  }

  deck.push({
    id: 'training',
    title: 'Offseason focus',
    body: 'Twelve weeks before camp. Where does the work go?',
    options: [
      { label: 'Skill work', effect: 'Push your ceiling', apply: (cc, r) => { if (cc.age >= 30) { cc.health = Math.min(100, cc.health + 4); return 'At this age the gains are in maintenance. Health +4.'; } const up = 1 + Math.floor(r() * 2); cc.ovr = Math.min(cc.pot + 1, cc.ovr + up); return `Rating +${up}.`; } },
      { label: 'Body work', effect: 'Durability and recovery', apply: (cc) => { cc.health = Math.min(100, cc.health + 10); return 'Health +10. You feel five years younger.'; } },
      { label: 'Brand work', effect: 'Fame and endorsements', apply: (cc) => { cc.fanbase = Math.min(100, cc.fanbase + 12); cc.earnings += 3; return 'Fanbase +12 and a 3M endorsement.'; } },
    ],
  });

  if (c.morale < 55) {
    deck.push({
      id: 'frustration',
      title: 'Frustration boils',
      body: `Losing wears on you. Reporters smell it. What is the move?`,
      options: [
        { label: 'Request a trade', effect: 'Fresh start, fans burn the jersey', apply: (cc, r) => { const nt = NFL_TEAM_NAMES[Math.floor(r() * NFL_TEAM_NAMES.length)].abbr; cc.team = nt; cc.morale = 72; cc.fanbase = 35; return `Traded to ${teamLabelOf(nt)}.`; } },
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
  const corrupt = getNflCorruptionEvents(c, rng);
  deck.push(...corrupt);
  const arcOpen = Object.keys(c.lifeFlags ?? {}).some(k => ['book', 'bounty', 'peds', 'agentSkim', 'wash'].includes(k));
  if (arcOpen && corrupt.length > 0 && rng() < 0.45) {
    return corrupt[Math.floor(rng() * corrupt.length)];
  }

  return deck[Math.floor(rng() * deck.length)];
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
}

export function legacyOf(c: CareerState): Legacy {
  const totals = careerTotals(c);
  let score = c.rings * 90 + c.mvps * 110 + c.allPros * 45 + c.seasons.length * 8;
  if (c.pos === 'QB') score += totals.passYds / 800 + totals.passTd * 0.5;
  if (c.pos === 'RB') score += totals.rushYds / 120;
  if (c.pos === 'WR') score += totals.recYds / 140;
  score = Math.round(score);
  const hof = score >= 520;
  const verdict = score >= 900 ? 'Inner-circle, first-ballot immortal'
    : score >= 520 ? 'Hall of Famer'
    : score >= 340 ? 'Ring of Honor type, Canton borderline'
    : score >= 180 ? 'A long, proud career'
    : 'A cup of coffee in the league';
  const bullets = [
    `${c.seasons.length} seasons, ${c.rings} ring${c.rings === 1 ? '' : 's'}, ${c.mvps} MVP${c.mvps === 1 ? '' : 's'}, ${c.allPros} All-Pro nod${c.allPros === 1 ? '' : 's'}`,
    c.pos === 'QB' ? `${totals.passYds.toLocaleString()} passing yards, ${totals.passTd} touchdowns`
      : c.pos === 'RB' ? `${totals.rushYds.toLocaleString()} rushing yards, ${totals.rushTd} touchdowns`
      : `${totals.rec} catches for ${totals.recYds.toLocaleString()} yards, ${totals.recTd} touchdowns`,
    `${Math.round(c.earnings)}M career earnings, drafted pick ${c.draftPick}`,
  ];
  return { score, verdict, hof, bullets };
}

export function careerTotals(c: CareerState) {
  const t = { passYds: 0, passTd: 0, ints: 0, rushYds: 0, rushTd: 0, rec: 0, recYds: 0, recTd: 0 };
  for (const s of c.seasons) {
    t.passYds += s.passYds ?? 0; t.passTd += s.passTd ?? 0; t.ints += s.ints ?? 0;
    t.rushYds += s.rushYds ?? 0; t.rushTd += s.rushTd ?? 0;
    t.rec += s.rec ?? 0; t.recYds += s.recYds ?? 0; t.recTd += s.recTd ?? 0;
  }
  return t;
}
