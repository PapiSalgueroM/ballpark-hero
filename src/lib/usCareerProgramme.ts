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
export interface ProgrammeDecision { section: ProgrammeSection; label: string; outcome: 'completed' | 'missed' | 'interrupted'; target?: number; actual?: number; unit?: string }
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
}
const DEFAULTS: ProgrammeChoices = { workload: 'normal', tactics: 'normal', expectation: 'normal', partnership: 'normal', bonus: 'normal', reinvention: 'normal' };
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const validNumber = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n) && n >= 0;
const sections = Object.keys(DEFAULTS) as ProgrammeSection[];
const sports: readonly string[] = ['nfl', 'nba', 'mlb', 'nhl'];
function validResult(value: unknown): value is UsCareerProgrammeResult {
  if (!value || typeof value !== 'object') return false;
  const r = value as UsCareerProgrammeResult;
  return sports.includes(r.sport) && Number.isSafeInteger(r.year) && typeof r.team === 'string'
    && ['completed', 'interrupted'].includes(r.outcome) && validNumber(r.bonusGross) && validNumber(r.bonusNet)
    && Number.isSafeInteger(r.partnershipProgress) && r.partnershipProgress >= 0 && r.partnershipProgress <= 3
    && Array.isArray(r.decisions) && r.decisions.every(d => !!d && sections.includes(d.section) && typeof d.label === 'string'
      && ['completed', 'missed', 'interrupted'].includes(d.outcome) && (d.target === undefined || validNumber(d.target))
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
export function usProgrammeMenus(c: UsCareerCore, sport: UsSport): ProgrammeMenu[] {
  const attack = sport === 'nba' ? 'Scoring focus' : sport === 'nhl' ? c.pos === 'G' ? 'Aggressive crease work' : 'Finishing focus' : sport === 'mlb' ? c.pos === 'SP' || c.pos === 'RP' ? 'Attack the zone' : 'Attack at the plate' : c.pos === 'QB' ? 'Big-play preparation' : c.pos === 'K' ? 'Long-kick preparation' : 'Aggressive preparation';
  const support = sport === 'nba' ? c.pos === 'PF' || c.pos === 'C' ? 'Rebounding focus' : 'Playmaking focus' : sport === 'nhl' ? c.pos === 'G' ? 'Controlled crease work' : 'Playmaking focus' : sport === 'mlb' ? c.pos === 'SP' || c.pos === 'RP' ? 'Controlled pitching routine' : 'Patient preparation' : 'Controlled preparation';
  const nbaSupport = c.pos === 'PF' || c.pos === 'C' ? 'rebounding' : 'playmaking';
  const attackEffect = sport === 'nba' ? 'Season scoring multiplier +8%, ' + nbaSupport + ' multiplier -8%. Your position stays the same.' : sport === 'nhl' && c.pos !== 'G' ? 'Season scoring multiplier +0.08, favoring goals over assists.' : 'Season morale +6, durability -0.06. More form, more injury risk.';
  const supportEffect = sport === 'nba' ? 'Season ' + nbaSupport + ' multiplier +8%, scoring multiplier -8%. Your position stays the same.' : sport === 'nhl' && c.pos !== 'G' ? 'Season scoring multiplier -0.08 (minimum 0.4), favoring assists over goals.' : 'Season morale -3, durability +0.06. Less form, less injury risk.';
  const steadyBonus = bonusTarget(c, sport, false), stretchBonus = bonusTarget(c, sport, true);
  return [
    { id: 'workload', label: 'Workload and recovery', options: [{ id: 'normal', label: 'Usual routine', effect: 'Keep your current inputs.' }, { id: 'push', label: 'Push the workload', effect: 'Season health -8, morale +6. More form, more injury risk.' }, { id: 'recover', label: 'Prioritize recovery', effect: 'Season health +8, morale -6. Less injury risk, less form.' }] },
    { id: 'tactics', label: 'Tactical approach', options: [{ id: 'normal', label: 'Your usual approach', effect: 'Keep your current style.' }, { id: 'attack', label: attack, effect: attackEffect }, { id: 'support', label: support, effect: supportEffect }] },
    { id: 'expectation', label: 'Coach expectations', options: [{ id: 'normal', label: 'No extra target', effect: 'Keep the normal season.' }, { id: 'steady', label: 'Steady availability', effect: 'Play ' + gamesTarget(c, sport, false) + ' games: morale +3. Miss it: morale -3.' }, { id: 'stretch', label: 'Earn a bigger role', effect: 'Play ' + gamesTarget(c, sport, true) + ' games: morale +6. Miss it: morale -5. This does not guarantee a starting spot.' }] },
    { id: 'partnership', label: 'Teammate partnership', options: [{ id: 'normal', label: 'Keep your own routine', effect: 'No extra partnership input.' }, { id: 'build', label: sport === 'nba' ? 'Build a two-player rhythm' : sport === 'nhl' ? c.pos === 'G' ? 'Work with your defense pair' : 'Build line chemistry' : sport === 'mlb' ? c.pos === 'SP' || c.pos === 'RP' ? 'Work with your catcher' : 'Build a lineup partnership' : c.pos === 'QB' ? 'Work with your receivers' : 'Build unit chemistry', effect: 'A role-based teammate partnership, with no invented player. At least ' + gamesBase(c, sport) + ' games adds one year of progress. Consecutive years at this team give +2 season morale per completed year, capped at +6.' }] },
    { id: 'bonus', label: 'Performance bonus', options: [{ id: 'normal', label: 'No bonus challenge', effect: 'Keep the normal pay.' }, { id: 'steady', label: 'Match the benchmark', effect: steadyBonus.target + ' ' + steadyBonus.label + ' and ' + gamesBase(c, sport) + ' games: 2% of season salary as a gross bonus.' }, { id: 'stretch', label: 'Stretch the benchmark', effect: stretchBonus.target + ' ' + stretchBonus.label + ' and ' + gamesBase(c, sport) + ' games: 5% of season salary as a gross bonus. 45% reaches the bank.' }] },
    { id: 'reinvention', label: 'Veteran reinvention', options: [{ id: 'normal', label: 'Keep your usual routine', effect: 'No extra veteran input.' }, ...(c.age >= 30 ? [{ id: 'maintain' as const, label: sport === 'mlb' ? 'Rebuild your veteran routine' : sport === 'nhl' ? 'Adapt your veteran game' : sport === 'nba' ? 'Adapt your veteran rotation work' : 'Adapt your veteran preparation', effect: 'Age 30+: season durability +0.06, morale -4. After a season with games played, health +3 for next year. No position change or guaranteed career extension.' }] : [])] },
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
  let health = 0, morale = 0, durability = 0;
  const host = c as ProgrammeCareer & { archetype?: Record<string, unknown> };
  const before = host.archetype;
  const archetype = before ? { ...before } : undefined;
  if (plan.workload === 'push') { health -= 8; morale += 6; }
  if (plan.workload === 'recover') { health += 8; morale -= 6; }
  if (plan.tactics !== 'normal') {
    if (sport === 'nba' && archetype) {
      const support = c.pos === 'PF' || c.pos === 'C' ? 'rebounding' : 'playmaking';
      if (validNumber(archetype.scoring) && validNumber(archetype[support])) {
        archetype.scoring *= plan.tactics === 'attack' ? 1.08 : 0.92;
        archetype[support] = (archetype[support] as number) * (plan.tactics === 'attack' ? 0.92 : 1.08);
      }
    } else if (sport === 'nhl' && c.pos !== 'G' && archetype && validNumber(archetype.scoringMult)) {
      archetype.scoringMult = Math.max(0.4, archetype.scoringMult + (plan.tactics === 'attack' ? 0.08 : -0.08));
    } else { morale += plan.tactics === 'attack' ? 6 : -3; durability += plan.tactics === 'attack' ? -0.06 : 0.06; }
  }
  const partner = c.programmePartnership;
  if (plan.partnership === 'build' && partner?.sport === sport && partner.team === c.team && partner.lastYear === c.year - 1) morale += Math.min(3, partner.progress) * 2;
  if (plan.reinvention === 'maintain' && c.age >= 30) { durability += 0.06; morale -= 4; }
  c.health = clamp(c.health + health, 0, 100); c.morale = clamp(c.morale + morale, 0, 100);
  if (archetype && validNumber(archetype.durability)) archetype.durability = clamp(archetype.durability + durability, 0.4, 1);
  const changed = !!archetype && JSON.stringify(archetype) !== JSON.stringify(before);
  if (changed) host.archetype = archetype;
  return { plan: { ...plan }, healthDelta: c.health - beforeHealth, moraleDelta: c.morale - beforeMorale, archetypeBefore: before, archetypeChanged: changed };
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
        result.bonusGross = Math.round(line.salary * (choice === 'stretch' ? 0.05 : 0.02) * 10000) / 10000;
        result.bonusNet = Math.round(result.bonusGross * 0.45 * 10000) / 10000;
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
    result.decisions.push(decision);
  }
  c.programmeResults = [...(c.programmeResults ?? []), result];
  delete c.programme;
  return result;
}
export function usProgrammeDefaults(): ProgrammeChoices { return { ...DEFAULTS }; }
