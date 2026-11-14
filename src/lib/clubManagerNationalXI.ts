import { nationalityOf } from '@/data/playerNationalities';
import {
  FORMATIONS, homelandEngineName, refreshWorldRoster, worldRosterFor, worldYear, yearsOn,
  type CareerState, type CMPlayer,
} from '@/lib/clubManager';
import { eraRosters, isHistoricEra } from '@/lib/clubManagerEras';
import { worldRosterView } from '@/lib/clubManagerWorldRoster';
import { FIT_PENALTY, gradeFit } from '@/lib/positionFit';
import { managerFormatYear, nationStrength, tournamentForYear, SQUAD_PLACES, positionGroup } from '@/lib/soccerInternational';

export type NationalPlayer = Pick<CMPlayer, 'name' | 'position' | 'secondaryPositions' | 'rating' | 'age'> & {
  key: string;
  club: string | null;
};

export interface NationalXI {
  year: number;
  formation: number;
  keys: string[];
}

export interface NationalSquad {
  year: number;
  keys: string[];
}

export const NATIONAL_SQUAD_SIZE = Object.values(SQUAD_PLACES).reduce((sum, places) => sum + places, 0);
export const NATIONAL_KEEPER_PLACES = SQUAD_PLACES.GK;

export function resolveNationalSquad(plan: NationalSquad | undefined, pool: readonly NationalPlayer[]) {
  if (!Array.isArray(plan?.keys) || plan.keys.length !== NATIONAL_SQUAD_SIZE || new Set(plan.keys).size !== plan.keys.length) return null;
  const players = plan.keys.map(key => pool.find(player => player.key === key));
  if (!players.every((player): player is NationalPlayer => !!player)) return null;
  return players.filter(player => player.position === 'GK').length === NATIONAL_KEEPER_PLACES ? players : null;
}

export function defaultNationalSquad(pool: readonly NationalPlayer[], xi: readonly string[]): string[] {
  const keys = new Set(xi.filter(key => pool.some(player => player.key === key)));
  for (const [group, places] of Object.entries(SQUAD_PLACES)) {
    const candidates = pool.filter(p => positionGroup(p.position) === group);
    let held = candidates.filter(p => keys.has(p.key)).length;
    for (const p of candidates) {
      if (held >= places || keys.size >= NATIONAL_SQUAD_SIZE) break;
      if (!keys.has(p.key)) { keys.add(p.key); held++; }
    }
  }
  for (const p of pool) {
    if (keys.size >= NATIONAL_SQUAD_SIZE) break;
    if (p.position !== 'GK') keys.add(p.key);
  }
  return [...keys];
}

export function nationalSummerOf(career: CareerState) {
  const job = career.nationJob;
  if (!job || career.startYear === undefined || isHistoricEra(career.eraId)) return null;
  const year = worldYear(career) + 1;
  const format = tournamentForYear(job.nation, managerFormatYear(year));
  return format ? { name: format.name, year } : null;
}

export function nationalPool(career: CareerState): NationalPlayer[] {
  const nation = career.nationJob?.nation;
  if (!nation) return [];
  const current = refreshWorldRoster(career);
  const ledger = worldRosterView(current);
  if (current.worldRoster && !ledger) return [];
  const year = worldYear(current);
  const years = yearsOn(current);
  const players = new Map<string, NationalPlayer>();
  const anchors = new Map<string, string | null>();
  const blocked = new Set(current.retiredNames ?? []);
  const retiredKeys = new Set(ledger?.records.filter(row => row.status === 'retired').map(row => row.key));
  const identity = (name: string, age: number) => JSON.stringify([name, year - age]);
  function add(key: string, p: NationalPlayer, generated: boolean, listedNation?: string, injured = false) {
    players.delete(key);
    const known = generated ? listedNation : nationalityOf(current.eraId, p.name);
    if (known && homelandEngineName(known) === nation && !blocked.has(p.name) && !retiredKeys.has(key) && !injured) players.set(key, p);
  }
  for (const club of Object.keys(eraRosters(current.eraId ?? 'now'))) {
    for (const p of worldRosterFor(current, club, years)) {
      const anchor = identity(p.n, p.a);
      const key = p.worldRosterKey ?? JSON.stringify([club, p.n, p.p, year - p.a, p.since]);
      anchors.set(anchor, !anchors.has(anchor) || anchors.get(anchor) === key ? key : null);
      if (club !== current.clubName) add(key, { key, name: p.n, position: p.p, rating: p.r, age: p.a, club }, !!p.g, p.nation);
    }
  }
  for (const row of ledger?.records ?? []) {
    const p = row.player;
    if (row.status === 'retired' || p.injuryWeeks > 0) players.delete(row.key);
    else if (row.status === 'released') {
      add(row.key, { key: row.key, name: p.name, position: p.position, secondaryPositions: p.secondaryPositions, rating: p.rating, age: p.age, club: null },
        !!(p.generated || p.academyGrad || p.isYouth), p.nation);
    }
  }
  const include = (p: CMPlayer, club: string) => {
    const generated = !!(p.generated || p.academyGrad || p.isYouth);
    const key = p.worldRosterKey ?? anchors.get(identity(p.name, p.age)) ?? JSON.stringify(['squad', p.id]);
    if (key) {
      const oldKey = anchors.get(identity(p.name, p.age));
      if (oldKey && oldKey !== key) players.delete(oldKey);
      add(key, { key, name: p.name, position: p.position, secondaryPositions: p.secondaryPositions, rating: p.rating, age: p.age, club }, generated, p.nation, p.injuryWeeks > 0);
    }
  };
  for (const p of current.squad) include(p, current.clubName);
  for (const loan of current.loanedOut ?? []) include(loan.player, loan.club);
  return [...players.values()].sort((a, b) => b.rating - a.rating || a.name.localeCompare(b.name));
}

export function resolveNationalXI(plan: NationalXI, pool: readonly NationalPlayer[]) {
  const formation = FORMATIONS[plan.formation];
  if (!formation || plan.keys.length !== formation.slots.length || new Set(plan.keys).size !== plan.keys.length) return null;
  const xi = plan.keys.map(key => pool.find(player => player.key === key));
  if (!xi.every((player, i): player is NationalPlayer => !!player && (player.position === 'GK') === formation.slots[i].allowed.includes('GK'))) return null;
  const strength = xi.reduce((sum, p, i) => sum + p.rating - FIT_PENALTY[
    gradeFit([p.position, ...(p.secondaryPositions ?? [])], formation.slots[i].allowed)
  ], 0) / xi.length;
  return { xi, strength: Math.round(strength * 10) / 10 };
}

export function defaultNationalXI(formation: number, pool: readonly NationalPlayer[]): string[] {
  const used = new Set<string>();
  return FORMATIONS[formation].slots.map(slot => {
    const keepers = slot.allowed.includes('GK');
    const ranked = pool.filter(p => !used.has(p.key) && (p.position === 'GK') === keepers)
      .sort((a, b) => {
        const adjusted = (p: NationalPlayer) => p.rating - FIT_PENALTY[gradeFit([p.position, ...(p.secondaryPositions ?? [])], slot.allowed)];
        return adjusted(b) - adjusted(a);
      });
    const key = ranked[0]?.key ?? '';
    if (key) used.add(key);
    return key;
  });
}

export function selectedNationalXI(career: CareerState, summer: number) {
  const job = career.nationJob;
  const squadPlan = job?.squad?.year === summer ? job.squad : undefined;
  const savedXI = job?.xi?.year === summer ? job.xi : undefined;
  if (!job || (!savedXI && !squadPlan)) return null;
  const eligible = nationalPool(career);
  const squad = resolveNationalSquad(squadPlan, eligible);
  const pool = squad ?? eligible;
  const plan = savedXI ?? (squadPlan ? { year: summer, formation: 0, keys: defaultNationalXI(0, pool) } : null);
  if (!plan || !Number.isInteger(plan.formation) || !Array.isArray(plan.keys)) return null;
  const result = resolveNationalXI(plan, pool);
  if (!result) return null;
  const nationalStrength = nationStrength(job.nation);
  return { ...result, formation: FORMATIONS[plan.formation].name, squad, adjustment: Math.max(-8, Math.min(8, result.strength - nationalStrength)) };
}

export function setNationalXI(career: CareerState, plan: NationalXI | null): CareerState | null {
  const job = career.nationJob;
  const summer = nationalSummerOf(career);
  if (!job || !summer || career.live || career.retired || career.sacked || career.wilderness) return null;
  if (plan) {
    const pool = nationalPool(career);
    const squad = job.squad?.year === summer.year ? resolveNationalSquad(job.squad, pool) : null;
    if (plan.year !== summer.year || !Number.isInteger(plan.formation) || !Array.isArray(plan.keys)
      || !resolveNationalXI(plan, squad ?? pool)) return null;
  }
  const updated = { ...job };
  if (plan) updated.xi = { ...plan, keys: [...plan.keys] };
  else delete updated.xi;
  return { ...career, nationJob: updated };
}

export function setNationalSquad(career: CareerState, plan: NationalSquad | null): CareerState | null {
  const job = career.nationJob;
  const summer = nationalSummerOf(career);
  if (!job || !summer || career.pendingSummary || career.live || career.retired || career.sacked || career.wilderness) return null;
  const updated = { ...job };
  if (!plan) delete updated.squad;
  else {
    const players = plan.year === summer.year ? resolveNationalSquad(plan, nationalPool(career)) : null;
    if (!players) return null;
    updated.squad = { ...plan, keys: [...plan.keys] };
    if (updated.xi?.year === summer.year && (!Array.isArray(updated.xi.keys) || !resolveNationalXI(updated.xi, players))) delete updated.xi;
  }
  return { ...career, nationJob: updated };
}
