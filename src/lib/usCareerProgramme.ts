import type { UsCareerCore, UsCareerSeason } from './usCareerSport';
import type { UsSport } from './usCoachCareer';
import { usSeasonLength } from '@/data/usSeasonLengths';

export type ProgrammeSection = 'workload' | 'tactics' | 'expectation' | 'partnership' | 'bonus' | 'reinvention';
export type ProgrammeChoice = 'normal' | 'push' | 'recover' | 'attack' | 'support' | 'defend' | 'inside' | 'playoff-minutes' | 'second-unit' | 'spot-starts' | 'steady' | 'stretch' | 'alternate' | 'build' | 'maintain';
export interface ProgrammeChoices {
  workload: 'normal' | 'push' | 'recover';
  tactics: 'normal' | 'attack' | 'support' | 'defend' | 'inside' | 'playoff-minutes' | 'second-unit' | 'spot-starts';
  expectation: 'normal' | 'steady' | 'stretch';
  partnership: 'normal' | 'build';
  bonus: 'normal' | 'steady' | 'stretch' | 'alternate';
  reinvention: 'normal' | 'maintain';
}
export interface UsCareerProgramme extends ProgrammeChoices { sport: UsSport; year: number; team: string }
/* 'unused' (Release AU fix pass): the choice had nothing to add when the season began (its whole gain sat on a cap), so it changed nothing and cost nothing. */
export interface ProgrammeDecision { section: ProgrammeSection; label: string; outcome: 'completed' | 'missed' | 'interrupted' | 'unused'; target?: number; actual?: number; unit?: string }
export interface UsCareerProgrammeResult {
  sport: UsSport; year: number; team: string; outcome: 'completed' | 'interrupted';
  decisions: ProgrammeDecision[]; bonusGross: number; bonusNet: number; partnershipProgress: number;
}
export type ProgrammeCareer = UsCareerCore & {
  programme?: UsCareerProgramme;
  programmeResults?: UsCareerProgrammeResult[];
  programmePartnership?: { sport: UsSport; team: string; progress: number; lastYear: number };
};
export interface ProgrammeOption { id: ProgrammeChoice; label: string; effect: string }
export interface ProgrammeMenu { id: ProgrammeSection; label: string; options: ProgrammeOption[] }
export interface ProgrammePreparation {
  plan: UsCareerProgramme; healthDelta: number; moraleDelta: number;
  archetypeBefore: unknown; archetypeChanged: boolean;
  /** The chosen trades that had nothing to add (see land): they changed nothing and are settled as unused. */
  idle?: ProgrammeSection[];
  nhlShutdownBerthGain?: number;
  nflInsideRoutesGain?: number;
  nbaExtraPlayoffMinutes?: number;
  mlbSpotStartOutcome?: 'completed' | 'missed';
}
const DEFAULTS: ProgrammeChoices = { workload: 'normal', tactics: 'normal', expectation: 'normal', partnership: 'normal', bonus: 'normal', reinvention: 'normal' };
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const validNumber = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n) && n >= 0;
const sections = Object.keys(DEFAULTS) as ProgrammeSection[];
const sports: readonly string[] = ['nfl', 'nba', 'mlb', 'nhl'];
export const NBA_DEFENSIVE_GAIN = 20;
export const NBA_DEFENSIVE_SCORING_COST = 8;
export const NBA_DEFENSIVE_CAP = { spg: 3, bpg: 4 } as const;
export const NBA_PLAYOFF_MINUTES_CAP = 42;
export const NBA_EXTRA_PLAYOFF_MINUTES = 3;
export const NBA_PLAYOFF_HEALTH_COST = 4;
const NBA_PLAYOFF_MINUTES_LABEL = 'Take extra playoff minutes';
const NBA_SECOND_UNIT_LABEL = 'Lead the second unit';
export const NHL_SHUTDOWN_BERTH_POINTS = 6;
export const NHL_SHUTDOWN_OFFENSIVE_COST = 10;
export const NFL_WR_REC_CAP = 145;
export const NFL_INSIDE_CATCH_GAIN = 12;
export const NFL_INSIDE_TD_COST = 10;
const NFL_INSIDE_ROUTES_LABEL = 'Inside routes';
export const MLB_SPOT_START_INJURY_POINTS = 10;
const MLB_SPOT_START_LABEL = 'Stretch out for spot starts';

export function nflInsideRoutesAvailable(c: UsCareerCore): boolean {
  return c.pos === 'WR' && c.role !== 'backup' && c.contractYears > 0 && !c.retired && !(c.suspendedSeasons ?? 0);
}

function nbaSeasonRotationAvailable(c: UsCareerCore): boolean {
  return c.contractYears > 0 && !c.retired && !(c.suspendedSeasons ?? 0)
    && c.seasons.some(season => season.games > 0);
}

export function nbaExtraPlayoffMinutesAvailable(c: UsCareerCore): boolean {
  return c.role !== 'backup' && nbaSeasonRotationAvailable(c);
}

export function mlbSpotStartsAvailable(c: UsCareerCore): boolean {
  return c.pos === 'SP' && c.role === 'backup' && c.contractYears > 0 && !c.retired && !(c.suspendedSeasons ?? 0)
    && c.seasons.some(season => season.games > 0);
}

export function nbaDefensiveAssignment(pos: string) {
  return pos === 'PF' || pos === 'C'
    ? { label: 'Protect the rim', stat: 'bpg', unit: 'blocks per game' } as const
    : { label: 'Pressure the ball', stat: 'spg', unit: 'steals per game' } as const;
}
/* Release AU fix pass, the lead's ruling R1. A card states what the season will
   really get, and a trade whose whole gain a cap cuts away is not charged. One
   law does both: land() is read by the card and applied by prepare, so the two
   cannot drift. The trades land one after another in the order of TRADE_ORDER,
   each on what the ones before it left, which is why a card is drawn against
   the choices already held in the sections above it. */
type Trade = { health?: number; morale?: number; durability?: number };
type TradeInput = 'health' | 'morale' | 'durability';
interface SeasonInputs { health: number; morale: number; durability: number | null }
interface Landed { health: number; morale: number; durability: number; idle: boolean; next: SeasonInputs }
const round1 = (n: number) => Math.round(n * 10) / 10;
const round2 = (n: number) => Math.round(n * 100) / 100;
const archetypeOf = (c: UsCareerCore) => (c as UsCareerCore & { archetype?: Record<string, unknown> }).archetype;
function inputsOf(c: UsCareerCore): SeasonInputs {
  const durability = archetypeOf(c)?.durability;
  return { health: c.health, morale: c.morale, durability: validNumber(durability) ? durability : null };
}
/** One trade on the inputs it meets. Every change is cut where its cap cuts it (health and morale 0 to 100, durability 0.4 to 1). Named a gain, a trade whose gain is cut away whole lands nothing at all. */
function land(at: SeasonInputs, want: Trade, gain?: TradeInput): Landed {
  const next: SeasonInputs = {
    health: clamp(at.health + (want.health ?? 0), 0, 100), morale: clamp(at.morale + (want.morale ?? 0), 0, 100),
    durability: at.durability === null ? null : clamp(at.durability + (want.durability ?? 0), 0.4, 1),
  };
  const got = { health: next.health - at.health, morale: next.morale - at.morale, durability: next.durability === null || at.durability === null ? 0 : next.durability - at.durability };
  if (gain && !(round2(got[gain]) > 0)) return { health: 0, morale: 0, durability: 0, idle: true, next: at };
  return { ...got, idle: false, next };
}
const WORKLOAD: Record<'push' | 'recover', { want: Trade; gain: TradeInput }> = { push: { want: { health: -8, morale: 6 }, gain: 'morale' }, recover: { want: { health: 8, morale: -6 }, gain: 'health' } };
const TACTICS: Record<'attack' | 'support', { want: Trade; gain: TradeInput }> = { attack: { want: { morale: 6, durability: -0.06 }, gain: 'morale' }, support: { want: { morale: -3, durability: 0.06 }, gain: 'durability' } };
const VETERAN: Trade = { durability: 0.06, morale: -4 };
const TRADE_ORDER = ['workload', 'tactics', 'partnership', 'reinvention'] as const;
/** How this career's tactical choice works: the NBA and an NHL skater move multipliers no cap cuts, everyone else trades morale against durability. */
function tacticsKind(c: UsCareerCore, sport: UsSport): 'nba' | 'nhl' | 'trade' {
  const archetype = archetypeOf(c);
  if (sport === 'nba' && archetype) return 'nba';
  return sport === 'nhl' && c.pos !== 'G' && !!archetype && validNumber(archetype.scoringMult) ? 'nhl' : 'trade';
}
const partnershipYears = (c: UsCareerCore, sport: UsSport) => {
  const partner = (c as ProgrammeCareer).programmePartnership;
  return partner?.sport === sport && partner.team === c.team && partner.lastYear === c.year - 1 && validNumber(partner.progress) ? Math.min(3, partner.progress) : 0;
};
/** What one choice adds to the season's capped inputs, or null when it moves none of them. */
function landFor(c: UsCareerCore, sport: UsSport, at: SeasonInputs, section: (typeof TRADE_ORDER)[number], choice: ProgrammeChoice | undefined): Landed | null {
  if (section === 'workload' && (choice === 'push' || choice === 'recover')) return land(at, WORKLOAD[choice].want, WORKLOAD[choice].gain);
  if (section === 'tactics' && (choice === 'attack' || choice === 'support') && tacticsKind(c, sport) === 'trade') return land(at, TACTICS[choice].want, TACTICS[choice].gain);
  if (section === 'partnership' && choice === 'build' && partnershipYears(c, sport) > 0) return land(at, { morale: partnershipYears(c, sport) * 2 });
  if (section === 'reinvention' && choice === 'maintain' && c.age >= 30) return land(at, VETERAN);
  return null;
}
const CAP_NOTE: Record<TradeInput, string> = { health: 'health tops out at 100', morale: 'morale tops out at 100', durability: 'durability tops out at 1.00' };
const AT_CAP: Record<TradeInput, string> = { health: 'your health is already at 100', morale: 'your morale is already at 100', durability: 'your durability is already as high as it goes' };
const signed = (n: number, places: number) => (n < 0 ? '-' : '+') + (places ? Math.abs(n).toFixed(places) : String(round1(Math.abs(n))));
/** The numbers of a landed trade in the card's own order, a part that lands nothing left out, a gain the cap cut said so. */
function landedText(got: Landed, want: Trade, order: TradeInput[], gain?: TradeInput): string {
  return order.filter(key => round2(got[key]) !== 0).map(key => key + ' ' + signed(got[key], key === 'durability' ? 2 : 0)
    + (key === gain && round2(got[key]) < round2(want[key] ?? 0) ? ' (' + CAP_NOTE[key] + ')' : '')).join(', ');
}
const nothingToAdd = (gain: TradeInput) => 'Nothing to add this season: ' + AT_CAP[gain] + '. Choosing it costs nothing.';
/** The share of a gross bonus the bank keeps: 45%, in the bank's own unit (the four engines keep the bank to a tenth of a million). */
const bankShare = (gross: number) => round1(gross * 0.45);
const bonusGrossOf = (salary: number, stretch: boolean) => Math.round(salary * (stretch ? 0.05 : 0.02) * 10000) / 10000;
function validResult(value: unknown): value is UsCareerProgrammeResult {
  if (!value || typeof value !== 'object') return false;
  const r = value as UsCareerProgrammeResult;
  return sports.includes(r.sport) && Number.isSafeInteger(r.year) && typeof r.team === 'string'
    && ['completed', 'interrupted'].includes(r.outcome) && validNumber(r.bonusGross) && validNumber(r.bonusNet)
    && Number.isSafeInteger(r.partnershipProgress) && r.partnershipProgress >= 0 && r.partnershipProgress <= 3
    && Array.isArray(r.decisions) && r.decisions.every(d => !!d && sections.includes(d.section) && typeof d.label === 'string'
      && ['completed', 'missed', 'interrupted', 'unused'].includes(d.outcome) && (d.target === undefined || validNumber(d.target))
      && (d.actual === undefined || validNumber(d.actual)) && (d.unit === undefined || typeof d.unit === 'string'));
}
export function usProgrammeStateValid(c: ProgrammeCareer): boolean {
  const p = c.programmePartnership;
  return (c.programmeResults === undefined || (Array.isArray(c.programmeResults) && c.programmeResults.every(validResult)))
    && (p === undefined || (!!p && typeof p === 'object' && sports.includes(p.sport) && typeof p.team === 'string'
      && Number.isSafeInteger(p.lastYear) && Number.isSafeInteger(p.progress) && p.progress >= 0 && p.progress <= 3));
}
export function usProgrammeResults(c: ProgrammeCareer): readonly UsCareerProgrammeResult[] { return Array.isArray(c.programmeResults) ? c.programmeResults.filter(validResult) : []; }
function validPlan(c: UsCareerCore, sport: UsSport, plan: UsCareerProgramme): boolean {
  return !!plan && typeof plan === 'object' && plan.sport === sport && Number.isSafeInteger(plan.year)
    && typeof plan.team === 'string' && sections.every(key => {
      // A booked receiver plan still needs settling if camp benches him or the deal expires after the season.
      if (key === 'tactics' && plan.tactics === 'inside') return sport === 'nfl' && c.pos === 'WR';
      if (key === 'tactics' && plan.tactics === 'playoff-minutes') return sport === 'nba';
      if (key === 'tactics' && plan.tactics === 'spot-starts') return sport === 'mlb' && c.pos === 'SP';
      return usProgrammeMenus(c, sport).find(menu => menu.id === key)?.options.some(o => o.id === plan[key]);
    });
}
/* Release AV: baseball and hockey play the season as long as it really was since Round 1226 (48 games in
   2012-13, 56 in 2020-21, 60 in baseball's 2020), and every games and counting target below was typed on 162
   and 82, so a plan for a short year promised games the season did not hold and then charged the miss. Those
   two engines read their season from the sourced ledgers (src/lib/usSeasonShape.ts); each hands its reader in
   here when its sport module loads (mlbCareerSport.ts, nhlCareerSport.ts), so a football or basketball page
   never loads a baseball ledger. A target is still worked out on the engine's own season and then carried to
   the season the club really plays, with the engine's own arithmetic, so a year of the engine's own length is
   the card it always was. A sport that has bound nothing (the NFL and the NBA, which read their own table
   below) is untouched. */
export interface ProgrammeSeasonShape {
  /** A count typed on the engine's own season, carried to this club's season of this year for this position. */
  carry: (count: number, pos: string, year: number, team: string) => number;
  /** A count SAVED on a season line, read back as the full season it stands for. */
  full: (count: number, pos: string, line: UsCareerSeason) => number;
}
const SEASON_SHAPES: Partial<Record<UsSport, ProgrammeSeasonShape>> = {};
export function bindUsProgrammeSeason(sport: UsSport, shape: ProgrammeSeasonShape | null): void {
  if (shape) SEASON_SHAPES[sport] = shape; else delete SEASON_SHAPES[sport];
}
const carried = (c: UsCareerCore, sport: UsSport, count: number) => SEASON_SHAPES[sport]?.carry(count, c.pos, c.year, c.team) ?? count;
const fullOf = (c: UsCareerCore, sport: UsSport, line: UsCareerSeason, count: number) => { const shape = SEASON_SHAPES[sport]; return shape ? Math.round(shape.full(count, c.pos, line)) : count; };
/* fullBase and fullCeiling are on the engine's own season for baseball and hockey; gamesBase is what the card prints and the season is judged on. */
const fullBase = (c: UsCareerCore, sport: UsSport) => Math.min(fullCeiling(c, sport), sport === 'nfl' ? 10 : sport === 'nba' ? 55 : sport === 'nhl' ? c.pos === 'G' ? 35 : 55 : c.pos === 'SP' ? 24 : c.pos === 'RP' ? 45 : 100);
const gamesBase = (c: UsCareerCore, sport: UsSport) => carried(c, sport, fullBase(c, sport));
const gamesStep = (c: UsCareerCore, sport: UsSport) => sport === 'nfl' ? 2 : sport === 'mlb' && c.pos === 'SP' ? 4 : 10;
const fullCeiling = (c: UsCareerCore, sport: UsSport) => sport === 'nfl' || sport === 'nba' ? usSeasonLength(sport, c.year) ?? (sport === 'nfl' ? 17 : 82) : sport === 'mlb' ? c.pos === 'SP' ? 32 : c.pos === 'RP' ? 71 : 162 : 82;
function gamesTarget(c: UsCareerCore, sport: UsSport, stretch: boolean): number {
  const latest = [...c.seasons].reverse().find(s => s.team === c.team && s.games > 0);
  const base = latest ? Math.max(fullBase(c, sport), Math.round(fullOf(c, sport, latest, latest.games) * 0.85)) : fullBase(c, sport);
  return carried(c, sport, Math.min(fullCeiling(c, sport), base + (stretch ? gamesStep(c, sport) : 0)));
}
function performance(c: UsCareerCore, sport: UsSport): { key: string; label: string; initial: number; step: number } {
  if (sport === 'nba') return c.pos === 'PG' ? { key: 'apg', label: 'assists per game', initial: 4, step: 1 } : c.pos === 'PF' || c.pos === 'C' ? { key: 'rpg', label: 'rebounds per game', initial: 6, step: 1 } : { key: 'ppg', label: 'points per game', initial: 15, step: 2 };
  if (sport === 'nhl') return c.pos === 'G' ? { key: 'wins', label: 'goalie wins', initial: 20, step: 3 } : c.pos === 'D' ? { key: 'assists', label: 'assists', initial: 25, step: 4 } : { key: 'goals', label: 'goals', initial: 20, step: 4 };
  if (sport === 'mlb') return c.pos === 'SP' ? { key: 'so', label: 'strikeouts', initial: 120, step: 20 } : c.pos === 'RP' ? { key: 'so', label: 'strikeouts', initial: 50, step: 10 } : { key: 'hr', label: 'home runs', initial: 15, step: 4 };
  const nfl: Record<string, { key: string; label: string; initial: number; step: number }> = {
    QB: { key: 'passTd', label: 'passing touchdowns', initial: 20, step: 4 },
    RB: { key: 'rushYds', label: 'rushing yards', initial: 800, step: 150 },
    WR: { key: 'recYds', label: 'receiving yards', initial: 700, step: 150 },
    TE: { key: 'recYds', label: 'receiving yards', initial: 500, step: 100 },
    LB: { key: 'tackles', label: 'tackles', initial: 80, step: 15 },
    EDGE: { key: 'sacks', label: 'sacks', initial: 8, step: 2 },
    CB: { key: 'picks', label: 'interceptions', initial: 3, step: 1 },
    K: { key: 'fgMade', label: 'field goals made', initial: 20, step: 3 },
  };
  return nfl[c.pos] ?? nfl.WR;
}
function bonusTarget(c: UsCareerCore, sport: UsSport, stretch: boolean) {
  const stat = performance(c, sport);
  const recent = [...c.seasons].reverse().find(s => s.games > 0 && validNumber((s as unknown as Record<string, unknown>)[stat.key]));
  /* Release AV: baseball's and hockey's benchmarks are all counts (home runs, strikeouts, goals, assists, wins), so they follow the season's length like the games do. */
  const held = recent ? fullOf(c, sport, recent, (recent as unknown as Record<string, number>)[stat.key]) : stat.initial;
  return { ...stat, target: carried(c, sport, Math.max(stat.initial, held) + (stretch ? stat.step : 0)) };
}

interface AlternateStat { key: string; label: string; initial: number; unscaled?: true }
const NFL_ALTERNATE_BONUS: Partial<Record<string, AlternateStat>> = {
  QB: { key: 'passYds', label: 'passing yards', initial: 2500 },
  RB: { key: 'rec', label: 'receptions', initial: 20 },
  WR: { key: 'rec', label: 'receptions', initial: 45 },
  TE: { key: 'rec', label: 'receptions', initial: 35 },
  LB: { key: 'sacks', label: 'sacks', initial: 2 },
  CB: { key: 'passDef', label: 'passes defended', initial: 8 },
  EDGE: { key: 'forcedFum', label: 'forced fumbles', initial: 2 },
  K: { key: 'longFg', label: 'yards on your longest field goal', initial: 45, unscaled: true },
};
function alternateStat(c: UsCareerCore, sport: UsSport): AlternateStat | undefined {
  switch (sport) {
    case 'nba': {
      const defense = nbaDefensiveAssignment(c.pos);
      return { key: defense.stat, label: defense.unit, initial: defense.stat === 'bpg' ? 1 : 0.8, unscaled: true };
    }
    case 'nfl': return NFL_ALTERNATE_BONUS[c.pos];
    case 'mlb': return c.pos === 'SP' ? { key: 'wins', label: 'wins', initial: 8 }
      : c.pos === 'RP' ? { key: 'saves', label: 'saves', initial: 5 } : { key: 'doubles', label: 'doubles', initial: 15 };
    case 'nhl': return c.pos === 'G' ? { key: 'svpct', label: 'save percentage', initial: 0.9, unscaled: true }
      : c.pos === 'D' ? { key: 'points', label: 'points', initial: 25 } : { key: 'assists', label: 'assists', initial: 25 };
  }
}
const validBonusActual = (value: unknown, key: string): value is number => validNumber(value) && (key !== 'svpct' || value <= 1);
export function formatUsProgrammeValue(value: number, unit?: string) {
  if (unit === 'save percentage') return value.toFixed(3);
  if (unit === 'steals per game' || unit === 'blocks per game') return value.toFixed(1);
  return String(value);
}

function alternateBonusTarget(c: UsCareerCore, sport: UsSport) {
  const stat = alternateStat(c, sport);
  if (!stat) return null;
  const unscaled = stat.unscaled;
  for (const line of [...c.seasons].reverse()) {
    if (!(line.games > 0) || !(line.year < c.year) || line.teamResult === 'SUSPENDED') continue;
    const value = (line as unknown as Record<string, unknown>)[stat.key];
    if (!validBonusActual(value, stat.key)) continue;
    const careerBenchmark = Math.max(stat.initial, unscaled ? value : fullOf(c, sport, line, value));
    return { ...stat, target: unscaled ? careerBenchmark : carried(c, sport, careerBenchmark) };
  }
  return { ...stat, target: unscaled ? stat.initial : carried(c, sport, stat.initial) };
}
/** The cards. `chosen` is the plan held so far: a card is drawn against what the choices in the sections above it leave (see TRADE_ORDER). */
export function usProgrammeMenus(c: UsCareerCore, sport: UsSport, chosen: Partial<ProgrammeChoices> | null = null): ProgrammeMenu[] {
  const kind = tacticsKind(c, sport);
  const spotStarts = sport === 'mlb' && mlbSpotStartsAvailable(c);
  const start = inputsOf(c);
  const afterWorkload = landFor(c, sport, start, 'workload', chosen?.workload)?.next ?? start;
  const afterTactics = landFor(c, sport, afterWorkload, 'tactics', chosen?.tactics)?.next ?? afterWorkload;
  const afterPartnership = landFor(c, sport, afterTactics, 'partnership', chosen?.partnership)?.next ?? afterTactics;
  const workloadText = (choice: 'push' | 'recover', tail: string) => {
    const got = land(start, WORKLOAD[choice].want, WORKLOAD[choice].gain);
    return got.idle ? nothingToAdd(WORKLOAD[choice].gain) : 'Season ' + landedText(got, WORKLOAD[choice].want, ['health', 'morale'], WORKLOAD[choice].gain) + '. ' + tail;
  };
  const tradeText = (choice: 'attack' | 'support', tail: string) => {
    const got = land(afterWorkload, TACTICS[choice].want, TACTICS[choice].gain);
    return got.idle ? nothingToAdd(TACTICS[choice].gain) : 'Season ' + landedText(got, TACTICS[choice].want, ['morale', 'durability'], TACTICS[choice].gain) + '. ' + tail;
  };
  const years = partnershipYears(c, sport);
  const partnerGot = years > 0 ? land(afterTactics, { morale: years * 2 }) : null;
  const partnerText = !partnerGot ? '' : partnerGot.morale > 0 ? ' This season: ' + landedText(partnerGot, { morale: years * 2 }, ['morale'], 'morale') + '.' : ' This season it adds no morale: ' + AT_CAP.morale + '.';
  const veteranGot = land(afterPartnership, VETERAN);
  const veteranSeason = landedText(veteranGot, VETERAN, ['durability', 'morale'], 'durability');
  const veteranText = 'Age 30+: ' + (round2(veteranGot.durability) > 0 ? (veteranSeason ? 'season ' + veteranSeason + '. ' : '')
    : 'No durability to add this season (yours is already as high as it goes). ' + (veteranSeason ? 'Season ' + veteranSeason + '. ' : ''))
    + 'After a season with games played, health +3 for next year (health tops out at 100). No position change or guaranteed career extension.';
  const bankText = (stretch: boolean) => {
    if (!validNumber(c.salary)) return ' 45% of it reaches the bank, to the nearest $0.1M.';
    const banked = bankShare(bonusGrossOf(c.salary, stretch));
    return ' At your salary of $' + c.salary.toFixed(1) + 'M, ' + (banked > 0 ? '$' + banked.toFixed(1) + 'M of it reaches the bank.' : 'none of it reaches the bank: your 45% share is under the $0.1M the bank counts in. It still counts in career earnings.');
  };
  const attack = sport === 'nba' ? 'Scoring focus' : sport === 'nhl' ? c.pos === 'G' ? 'Aggressive crease work' : 'Finishing focus' : sport === 'mlb' ? c.pos === 'SP' || c.pos === 'RP' ? 'Attack the zone' : 'Attack at the plate' : c.pos === 'QB' ? 'Big-play preparation' : c.pos === 'K' ? 'Long-kick preparation' : 'Aggressive preparation';
  const support = sport === 'nba' ? c.pos === 'PF' || c.pos === 'C' ? 'Rebounding focus' : 'Playmaking focus' : sport === 'nhl' ? c.pos === 'G' ? 'Controlled crease work' : 'Playmaking focus' : sport === 'mlb' ? c.pos === 'SP' || c.pos === 'RP' ? 'Controlled pitching routine' : 'Patient preparation' : 'Controlled preparation';
  const nbaSupport = c.pos === 'PF' || c.pos === 'C' ? 'rebounding' : 'playmaking';
  const attackEffect = kind === 'nba' ? 'Season scoring multiplier +8%, ' + nbaSupport + ' multiplier -8%. Your position stays the same.' : kind === 'nhl' ? 'Season scoring multiplier +0.08, favoring goals over assists.' : tradeText('attack', 'More form, more injury risk.');
  const supportEffect = kind === 'nba' ? 'Season ' + nbaSupport + ' multiplier +8%, scoring multiplier -8%. Your position stays the same.' : kind === 'nhl' ? 'Season scoring multiplier -0.08 (minimum 0.4), favoring assists over goals.' : tradeText('support', 'Less form, less injury risk.');
  const defence = sport === 'nba' ? nbaDefensiveAssignment(c.pos) : null;
  const steadyBonus = bonusTarget(c, sport, false), stretchBonus = bonusTarget(c, sport, true);
  const alternateBonus = alternateBonusTarget(c, sport);
  return [
    { id: 'workload', label: 'Workload and recovery', options: [{ id: 'normal', label: 'Usual routine', effect: 'Keep your current inputs.' }, { id: 'push', label: 'Push the workload', effect: workloadText('push', 'More form, more injury risk.') }, { id: 'recover', label: 'Prioritize recovery', effect: workloadText('recover', 'Less injury risk, less form.') }] },
    { id: 'tactics', label: 'Tactical approach', options: [
      { id: 'normal', label: spotStarts ? 'Usual spot duty' : 'Your usual approach', effect: spotStarts ? 'Keep your usual long-relief and spot-start workload.' : 'Keep your current style.' },
      { id: 'attack', label: attack, effect: attackEffect },
      { id: 'support', label: support, effect: supportEffect },
      ...(spotStarts ? [{
        id: 'spot-starts' as const,
        label: MLB_SPOT_START_LABEL,
        effect: `A healthy 162-game season usually goes from 13 to 18 starts. Injury chance rises by up to ${MLB_SPOT_START_INJURY_POINTS} percentage points, so arm fatigue can leave you with fewer starts. If you earn a regular rotation spot in camp, the plan is unused.`,
      }] : []),
      ...(sport === 'nfl' && nflInsideRoutesAvailable(c) ? [{
        id: 'inside' as const,
        label: NFL_INSIDE_ROUTES_LABEL,
        effect: `Use shorter targets for about ${NFL_INSIDE_CATCH_GAIN}% more regular-season receptions at the same total yards. Give up about ${NFL_INSIDE_TD_COST}% of your receiving touchdowns, at least one if you score. The ${NFL_WR_REC_CAP}-reception cap applies, and if you gain no catches, you give up nothing. Camp still decides who starts.`,
      }] : []),
      ...(defence ? [{
        id: 'defend' as const,
        label: defence.label,
        effect: `Get ${NBA_DEFENSIVE_GAIN}% more ${defence.unit} in the regular season, at least 0.1 more up to ${NBA_DEFENSIVE_CAP[defence.stat].toFixed(1)}. You give up about ${NBA_DEFENSIVE_SCORING_COST}% of your points per game if the boost lands, with a 1.0 PPG minimum.`,
      }] : []),
      ...(sport === 'nba' && nbaSeasonRotationAvailable(c) ? [{
        id: 'second-unit' as const,
        label: NBA_SECOND_UNIT_LABEL,
        effect: 'Come off the bench during the regular season. Bench roles play fewer minutes and can earn Sixth Man of the Year. Moving to the bench clears booked starter rest. If camp already assigns you to the bench, the plan goes unused.',
      }] : []),
      ...(sport === 'nba' && nbaExtraPlayoffMinutesAvailable(c) ? [{
        id: 'playoff-minutes' as const,
        label: NBA_PLAYOFF_MINUTES_LABEL,
        effect: `Signed starters who have played a season can add 1–${NBA_EXTRA_PLAYOFF_MINUTES} minutes per playoff game, up to ${NBA_PLAYOFF_MINUTES_CAP}. Keep your starting spot after camp, make the playoffs and have at least ${NBA_PLAYOFF_HEALTH_COST} health after the regular season. You spend ${NBA_PLAYOFF_HEALTH_COST} health after the season only if you play extra minutes.`,
      }] : []),
      ...(sport === 'nhl' && c.pos === 'D' ? [{
        id: 'defend' as const,
        label: 'Shutdown assignment',
        effect: `Take the tougher matchups. Give up ${NHL_SHUTDOWN_OFFENSIVE_COST}% of your regular season offensive ice time to add up to ${NHL_SHUTDOWN_BERTH_POINTS} percentage points to playoff qualification. The gain scales with games and minutes played. At the 90% qualification cap it costs nothing.`,
      }] : []),
    ] },
    { id: 'expectation', label: 'Coach expectations', options: [{ id: 'normal', label: 'No extra target', effect: 'Keep the normal season.' }, { id: 'steady', label: 'Steady availability', effect: 'Play ' + gamesTarget(c, sport, false) + ' games: morale +3 (morale tops out at 100). Miss it: morale -3.' }, { id: 'stretch', label: 'Earn a bigger role', effect: 'Play ' + gamesTarget(c, sport, true) + ' games: morale +6 (morale tops out at 100). Miss it: morale -5. This does not guarantee a starting spot.' }] },
    { id: 'partnership', label: 'Teammate partnership', options: [{ id: 'normal', label: 'Keep your own routine', effect: 'No extra partnership input.' }, { id: 'build', label: sport === 'nba' ? 'Build a two-player rhythm' : sport === 'nhl' ? c.pos === 'G' ? 'Work with your defense pair' : 'Build line chemistry' : sport === 'mlb' ? c.pos === 'SP' || c.pos === 'RP' ? 'Work with your catcher' : 'Build a lineup partnership' : c.pos === 'QB' ? 'Work with your receivers' : 'Build unit chemistry', effect: 'A role-based teammate partnership, with no invented player. At least ' + gamesBase(c, sport) + ' games adds one year of progress. Consecutive years at this team give +2 season morale per completed year, capped at +6.' + partnerText }] },
    { id: 'bonus', label: 'Performance bonus', options: [
      { id: 'normal', label: 'No bonus challenge', effect: 'Keep the normal pay.' },
      { id: 'steady', label: 'Match the benchmark', effect: steadyBonus.target + ' ' + steadyBonus.label + ' and ' + gamesBase(c, sport) + ' games: 2% of season salary as a gross bonus.' + bankText(false) },
      { id: 'stretch', label: 'Stretch the benchmark', effect: stretchBonus.target + ' ' + stretchBonus.label + ' and ' + gamesBase(c, sport) + ' games: 5% of season salary as a gross bonus.' + bankText(true) },
      ...(alternateBonus ? [{ id: 'alternate' as const, label: 'Chase a different stat',
        effect: `${formatUsProgrammeValue(alternateBonus.target, alternateBonus.label)} ${alternateBonus.label} and ${gamesBase(c, sport)} games: 2% of season salary as a gross bonus.${bankText(false)}` }] : []),
    ] },
    { id: 'reinvention', label: 'Veteran reinvention', options: [{ id: 'normal', label: 'Keep your usual routine', effect: 'No extra veteran input.' }, ...(c.age >= 30 ? [{ id: 'maintain' as const, label: sport === 'mlb' ? 'Rebuild your veteran routine' : sport === 'nhl' ? 'Adapt your veteran game' : sport === 'nba' ? 'Adapt your veteran rotation work' : 'Adapt your veteran preparation', effect: veteranText }] : [])] },
  ];
}
export function currentUsCareerProgramme(c: ProgrammeCareer, sport: UsSport): UsCareerProgramme | null {
  const p = c.programme;
  if (!usProgrammeStateValid(c) || !p || c.retired || p.sport !== sport || p.year !== c.year || p.team !== c.team) return null;
  if (!validPlan(c, sport, p)) return null;
  return p;
}
export function saveUsCareerProgramme<T extends UsCareerCore>(c: T, sport: UsSport, choices: ProgrammeChoices | null): T & ProgrammeCareer {
  const held = c as T & ProgrammeCareer;
  if (!usProgrammeStateValid(held) || c.retired || (c.suspendedSeasons ?? 0) > 0) return held;
  if (choices && !sections.every(key => usProgrammeMenus(c, sport).find(menu => menu.id === key)?.options.some(o => o.id === choices[key]))) return held;
  const next = { ...held };
  if (!choices || sections.every(key => choices[key] === 'normal')) delete next.programme;
  else next.programme = { ...choices, sport, year: c.year, team: c.team };
  return JSON.stringify(next) === JSON.stringify(held) ? held : next;
}
export function expireUsCareerProgramme(c: ProgrammeCareer): void {
  if (c.programme && (c.retired || c.programme.year !== c.year || c.programme.team !== c.team)) delete c.programme;
  if (c.programmePartnership && c.programmePartnership.team !== c.team) delete c.programmePartnership;
}
export function prepareUsCareerProgramme(c: ProgrammeCareer, sport: UsSport): ProgrammePreparation | null {
  const plan = currentUsCareerProgramme(c, sport);
  if (!plan || (c.suspendedSeasons ?? 0) > 0) return null;
  const beforeHealth = c.health, beforeMorale = c.morale;
  const host = c as ProgrammeCareer & { archetype?: Record<string, unknown> };
  const before = host.archetype;
  const archetype = before ? { ...before } : undefined;
  const kind = tacticsKind(c, sport);
  if ((plan.tactics === 'attack' || plan.tactics === 'support') && archetype) {
    if (kind === 'nba') {
      const support = c.pos === 'PF' || c.pos === 'C' ? 'rebounding' : 'playmaking';
      if (validNumber(archetype.scoring) && validNumber(archetype[support])) {
        archetype.scoring *= plan.tactics === 'attack' ? 1.08 : 0.92;
        archetype[support] = (archetype[support] as number) * (plan.tactics === 'attack' ? 0.92 : 1.08);
      }
    } else if (kind === 'nhl' && validNumber(archetype.scoringMult)) {
      archetype.scoringMult = Math.max(0.4, archetype.scoringMult + (plan.tactics === 'attack' ? 0.08 : -0.08));
    }
  }
  /* The capped inputs: each chosen trade lands on what the ones before it left, exactly as its card was drawn. */
  let at = inputsOf(c), moved = false;
  const idle: ProgrammeSection[] = [];
  for (const section of TRADE_ORDER) {
    const got = landFor(c, sport, at, section, plan[section]);
    if (!got) continue;
    if (got.idle) idle.push(section); else { at = got.next; moved = true; }
  }
  if (moved) {
    c.health = at.health; c.morale = at.morale;
    if (archetype && at.durability !== null) archetype.durability = at.durability;
  }
  const changed = !!archetype && JSON.stringify(archetype) !== JSON.stringify(before);
  if (changed) host.archetype = archetype;
  return { plan: { ...plan }, healthDelta: c.health - beforeHealth, moraleDelta: c.morale - beforeMorale, archetypeBefore: before, archetypeChanged: changed, ...(idle.length ? { idle } : {}) };
}
export function restoreUsCareerProgramme(c: ProgrammeCareer, preparation: ProgrammePreparation | null): void {
  if (!preparation) return;
  c.health = clamp(c.health - preparation.healthDelta, 0, 100);
  c.morale = clamp(c.morale - preparation.moraleDelta, 0, 100);
  if (preparation.archetypeChanged) (c as ProgrammeCareer & { archetype?: unknown }).archetype = preparation.archetypeBefore;
}
export function settleUsCareerProgramme(c: ProgrammeCareer, line: UsCareerSeason, sport: UsSport, preparation: ProgrammePreparation | null = null): UsCareerProgrammeResult | null {
  const plan = preparation?.plan ?? c.programme;
  const secondUnit = sport === 'nba' && plan?.tactics === 'second-unit';
  const atTipOff = { ...c, year: line.year, age: line.age };
  if (secondUnit) {
    atTipOff.seasons = c.seasons.filter(season => season !== line);
    // Preparation already validated this contract before the season used up its last year.
    if (preparation && c.contractYears === 0) atTipOff.contractYears = 1;
  }
  if (!usProgrammeStateValid(c) || !plan || !validPlan(atTipOff, sport, plan) || line.year !== plan.year || line.team !== plan.team || c.team !== line.team || !c.seasons.includes(line)) return null;
  if (c.programmeResults?.some(r => r.sport === sport && r.year === line.year && r.team === line.team)) { delete c.programme; return null; }
  const played = validNumber(line.games) && line.games > 0;
  const result: UsCareerProgrammeResult = { sport, year: line.year, team: line.team, outcome: played ? 'completed' : 'interrupted', decisions: [], bonusGross: 0, bonusNet: 0, partnershipProgress: 0 };
  const menus = usProgrammeMenus({ ...c, year: plan.year, seasons: c.seasons.filter(s => s !== line) }, sport);
  /* Release AV: the season is judged in ITS year. The engine has already moved the career on a year by now, and the games a partnership or a bonus asks for follow the season's length. */
  const then = { ...c, year: plan.year };
  for (const section of sections) {
    const choice = plan[section];
    if (choice === 'normal') continue;
    const insideRoutes = section === 'tactics' && choice === 'inside';
    const playoffMinutes = section === 'tactics' && choice === 'playoff-minutes';
    const spotStarts = section === 'tactics' && choice === 'spot-starts';
    const secondUnitRequest = section === 'tactics' && secondUnit;
    const label = insideRoutes ? NFL_INSIDE_ROUTES_LABEL : playoffMinutes ? NBA_PLAYOFF_MINUTES_LABEL
      : spotStarts ? MLB_SPOT_START_LABEL : secondUnitRequest ? NBA_SECOND_UNIT_LABEL
        : menus.find(m => m.id === section)?.options.find(o => o.id === choice)?.label ?? section;
    const decision: ProgrammeDecision = { section, label, outcome: played ? 'completed' : 'interrupted' };
    if (played && sport === 'nba' && section === 'tactics' && choice === 'defend' && !preparation?.idle?.includes(section)) {
      const defence = nbaDefensiveAssignment(c.pos);
      const actual = (line as UsCareerSeason & { spg?: number; bpg?: number })[defence.stat];
      if (validNumber(actual)) {
        decision.actual = actual;
        decision.unit = defence.unit;
      }
    }
    if (played && sport === 'nhl' && section === 'tactics' && choice === 'defend' && preparation?.nhlShutdownBerthGain !== undefined) {
      decision.actual = preparation.nhlShutdownBerthGain;
      decision.unit = 'percentage points of playoff qualification';
    }
    if (played && insideRoutes && preparation?.nflInsideRoutesGain !== undefined) {
      decision.actual = preparation.nflInsideRoutesGain;
      decision.unit = 'additional receptions';
    }
    if (played && playoffMinutes) {
      if (preparation?.nbaExtraPlayoffMinutes !== undefined) {
        // Settle once after the season has restored temporary programme health changes.
        c.health -= NBA_PLAYOFF_HEALTH_COST;
        decision.actual = preparation.nbaExtraPlayoffMinutes;
        decision.unit = 'extra minutes per playoff game';
      } else {
        decision.outcome = 'unused';
      }
    }
    if (played && secondUnitRequest) {
      const appearances = (line as UsCareerSeason & { benchAppearances?: number }).benchAppearances;
      if (validNumber(appearances) && appearances > 0) {
        decision.actual = appearances;
        decision.unit = 'bench appearances';
      } else {
        decision.outcome = 'unused';
      }
    }
    if (played && spotStarts) {
      decision.outcome = preparation?.mlbSpotStartOutcome ?? 'unused';
      if (decision.outcome !== 'unused') {
        decision.actual = line.games;
        decision.unit = 'starts';
      }
    }
    if (played && section === 'expectation') {
      decision.target = gamesTarget({ ...c, year: plan.year, seasons: c.seasons.filter(s => s !== line) }, sport, choice === 'stretch');
      decision.actual = line.games; decision.unit = 'games';
      decision.outcome = line.games >= decision.target ? 'completed' : 'missed';
      c.morale = clamp(c.morale + (decision.outcome === 'completed' ? choice === 'stretch' ? 6 : 3 : choice === 'stretch' ? -5 : -3), 0, 100);
    }
    if (played && section === 'bonus') {
      const before = { ...c, year: plan.year, seasons: c.seasons.filter(s => s !== line) };
      const target = choice === 'alternate' ? alternateBonusTarget(before, sport) : bonusTarget(before, sport, choice === 'stretch');
      if (!target) continue;
      const actual = (line as unknown as Record<string, unknown>)[target.key];
      decision.target = target.target; decision.actual = validBonusActual(actual, target.key) ? actual : undefined; decision.unit = target.label;
      decision.outcome = decision.actual !== undefined && decision.actual >= target.target && line.games >= gamesBase(then, sport) && validNumber(line.salary) ? 'completed' : 'missed';
      if (decision.outcome === 'completed') {
        /* Ruling R1: the share is banked in the bank's own unit, so what the card printed is what the bank still holds once the engine has rounded it again. */
        result.bonusGross = bonusGrossOf(line.salary, choice === 'stretch');
        result.bonusNet = bankShare(result.bonusGross);
        c.earnings += result.bonusGross;
        c.netWorth = Math.round(((c.netWorth ?? Math.max(0, c.earnings - result.bonusGross) * 0.45) + result.bonusNet) * 10000) / 10000;
      }
    }
    if (section === 'partnership') {
      decision.target = gamesBase(then, sport); decision.actual = line.games; decision.unit = 'games';
      if (played && line.games >= decision.target) {
        const old = c.programmePartnership;
        result.partnershipProgress = old?.sport === sport && old.team === line.team && old.lastYear === line.year - 1 ? Math.min(3, old.progress + 1) : 1;
        c.programmePartnership = { sport, team: line.team, progress: result.partnershipProgress, lastYear: line.year };
      } else {
        decision.outcome = played ? 'missed' : 'interrupted';
        if (c.programmePartnership?.team === line.team) delete c.programmePartnership;
      }
    }
    if (played && section === 'reinvention' && choice === 'maintain') c.health = clamp(c.health + 3, 0, 100);
    if (preparation?.idle?.includes(section)) decision.outcome = 'unused';
    result.decisions.push(decision);
  }
  c.programmeResults = [...(c.programmeResults ?? []), result];
  delete c.programme;
  return result;
}
export function usProgrammeDefaults(): ProgrammeChoices { return { ...DEFAULTS }; }
