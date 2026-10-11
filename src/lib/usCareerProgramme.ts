import type { UsCareerCore, UsCareerSeason } from './usCareerSport';
import type { UsSport } from './usCoachCareer';
import { usSeasonLength } from '@/data/usSeasonLengths';

export type ProgrammeSection = 'workload' | 'tactics' | 'expectation' | 'partnership' | 'bonus' | 'reinvention';
export type ProgrammeChoice = 'normal' | 'push' | 'recover' | 'attack' | 'support' | 'steady' | 'stretch' | 'build' | 'maintain';
export interface ProgrammeChoices {
  workload: 'normal' | 'push' | 'recover';
  tactics: 'normal' | 'attack' | 'support';
  expectation: 'normal' | 'steady' | 'stretch';
  partnership: 'normal' | 'build';
  bonus: 'normal' | 'steady' | 'stretch';
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
}
const DEFAULTS: ProgrammeChoices = { workload: 'normal', tactics: 'normal', expectation: 'normal', partnership: 'normal', bonus: 'normal', reinvention: 'normal' };
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const validNumber = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n) && n >= 0;
const sections = Object.keys(DEFAULTS) as ProgrammeSection[];
const sports: readonly string[] = ['nfl', 'nba', 'mlb', 'nhl'];
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
    && typeof plan.team === 'string' && sections.every(key => usProgrammeMenus(c, sport).find(menu => menu.id === key)?.options.some(o => o.id === plan[key]));
}
const gamesBase = (c: UsCareerCore, sport: UsSport) => Math.min(gamesCeiling(c, sport), sport === 'nfl' ? 10 : sport === 'nba' ? 55 : sport === 'nhl' ? c.pos === 'G' ? 35 : 55 : c.pos === 'SP' ? 24 : c.pos === 'RP' ? 45 : 100);
const gamesStep = (c: UsCareerCore, sport: UsSport) => sport === 'nfl' ? 2 : sport === 'mlb' && c.pos === 'SP' ? 4 : 10;
const gamesCeiling = (c: UsCareerCore, sport: UsSport) => sport === 'nfl' || sport === 'nba' ? usSeasonLength(sport, c.year) ?? (sport === 'nfl' ? 17 : 82) : sport === 'mlb' ? c.pos === 'SP' ? 32 : c.pos === 'RP' ? 71 : 162 : 82;
function gamesTarget(c: UsCareerCore, sport: UsSport, stretch: boolean): number {
  const latest = [...c.seasons].reverse().find(s => s.team === c.team && s.games > 0);
  const base = latest ? Math.max(gamesBase(c, sport), Math.round(latest.games * 0.85)) : gamesBase(c, sport);
  return Math.min(gamesCeiling(c, sport), base + (stretch ? gamesStep(c, sport) : 0));
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
  const held = recent ? (recent as unknown as Record<string, number>)[stat.key] : stat.initial;
  return { ...stat, target: Math.max(stat.initial, held) + (stretch ? stat.step : 0) };
}
/** The cards. `chosen` is the plan held so far: a card is drawn against what the choices in the sections above it leave (see TRADE_ORDER). */
export function usProgrammeMenus(c: UsCareerCore, sport: UsSport, chosen: Partial<ProgrammeChoices> | null = null): ProgrammeMenu[] {
  const kind = tacticsKind(c, sport);
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
  const steadyBonus = bonusTarget(c, sport, false), stretchBonus = bonusTarget(c, sport, true);
  return [
    { id: 'workload', label: 'Workload and recovery', options: [{ id: 'normal', label: 'Usual routine', effect: 'Keep your current inputs.' }, { id: 'push', label: 'Push the workload', effect: workloadText('push', 'More form, more injury risk.') }, { id: 'recover', label: 'Prioritize recovery', effect: workloadText('recover', 'Less injury risk, less form.') }] },
    { id: 'tactics', label: 'Tactical approach', options: [{ id: 'normal', label: 'Your usual approach', effect: 'Keep your current style.' }, { id: 'attack', label: attack, effect: attackEffect }, { id: 'support', label: support, effect: supportEffect }] },
    { id: 'expectation', label: 'Coach expectations', options: [{ id: 'normal', label: 'No extra target', effect: 'Keep the normal season.' }, { id: 'steady', label: 'Steady availability', effect: 'Play ' + gamesTarget(c, sport, false) + ' games: morale +3 (morale tops out at 100). Miss it: morale -3.' }, { id: 'stretch', label: 'Earn a bigger role', effect: 'Play ' + gamesTarget(c, sport, true) + ' games: morale +6 (morale tops out at 100). Miss it: morale -5. This does not guarantee a starting spot.' }] },
    { id: 'partnership', label: 'Teammate partnership', options: [{ id: 'normal', label: 'Keep your own routine', effect: 'No extra partnership input.' }, { id: 'build', label: sport === 'nba' ? 'Build a two-player rhythm' : sport === 'nhl' ? c.pos === 'G' ? 'Work with your defense pair' : 'Build line chemistry' : sport === 'mlb' ? c.pos === 'SP' || c.pos === 'RP' ? 'Work with your catcher' : 'Build a lineup partnership' : c.pos === 'QB' ? 'Work with your receivers' : 'Build unit chemistry', effect: 'A role-based teammate partnership, with no invented player. At least ' + gamesBase(c, sport) + ' games adds one year of progress. Consecutive years at this team give +2 season morale per completed year, capped at +6.' + partnerText }] },
    { id: 'bonus', label: 'Performance bonus', options: [{ id: 'normal', label: 'No bonus challenge', effect: 'Keep the normal pay.' }, { id: 'steady', label: 'Match the benchmark', effect: steadyBonus.target + ' ' + steadyBonus.label + ' and ' + gamesBase(c, sport) + ' games: 2% of season salary as a gross bonus.' + bankText(false) }, { id: 'stretch', label: 'Stretch the benchmark', effect: stretchBonus.target + ' ' + stretchBonus.label + ' and ' + gamesBase(c, sport) + ' games: 5% of season salary as a gross bonus.' + bankText(true) }] },
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
  if (plan.tactics !== 'normal' && archetype) {
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
  if (!usProgrammeStateValid(c) || !plan || !validPlan({ ...c, year: line.year, age: line.age }, sport, plan) || line.year !== plan.year || line.team !== plan.team || c.team !== line.team || !c.seasons.includes(line)) return null;
  if (c.programmeResults?.some(r => r.sport === sport && r.year === line.year && r.team === line.team)) { delete c.programme; return null; }
  const played = validNumber(line.games) && line.games > 0;
  const result: UsCareerProgrammeResult = { sport, year: line.year, team: line.team, outcome: played ? 'completed' : 'interrupted', decisions: [], bonusGross: 0, bonusNet: 0, partnershipProgress: 0 };
  const menus = usProgrammeMenus({ ...c, year: plan.year, seasons: c.seasons.filter(s => s !== line) }, sport);
  for (const section of sections) {
    const choice = plan[section];
    if (choice === 'normal') continue;
    const decision: ProgrammeDecision = { section, label: menus.find(m => m.id === section)?.options.find(o => o.id === choice)?.label ?? section, outcome: played ? 'completed' : 'interrupted' };
    if (played && section === 'expectation') {
      decision.target = gamesTarget({ ...c, year: plan.year, seasons: c.seasons.filter(s => s !== line) }, sport, choice === 'stretch');
      decision.actual = line.games; decision.unit = 'games';
      decision.outcome = line.games >= decision.target ? 'completed' : 'missed';
      c.morale = clamp(c.morale + (decision.outcome === 'completed' ? choice === 'stretch' ? 6 : 3 : choice === 'stretch' ? -5 : -3), 0, 100);
    }
    if (played && section === 'bonus') {
      const target = bonusTarget({ ...c, year: plan.year, seasons: c.seasons.filter(s => s !== line) }, sport, choice === 'stretch');
      const actual = (line as unknown as Record<string, unknown>)[target.key];
      decision.target = target.target; decision.actual = validNumber(actual) ? actual : undefined; decision.unit = target.label;
      decision.outcome = validNumber(actual) && actual >= target.target && line.games >= gamesBase(c, sport) && validNumber(line.salary) ? 'completed' : 'missed';
      if (decision.outcome === 'completed') {
        /* Ruling R1: the share is banked in the bank's own unit, so what the card printed is what the bank still holds once the engine has rounded it again. */
        result.bonusGross = bonusGrossOf(line.salary, choice === 'stretch');
        result.bonusNet = bankShare(result.bonusGross);
        c.earnings += result.bonusGross;
        c.netWorth = Math.round(((c.netWorth ?? Math.max(0, c.earnings - result.bonusGross) * 0.45) + result.bonusNet) * 10000) / 10000;
      }
    }
    if (section === 'partnership') {
      decision.target = gamesBase(c, sport); decision.actual = line.games; decision.unit = 'games';
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
