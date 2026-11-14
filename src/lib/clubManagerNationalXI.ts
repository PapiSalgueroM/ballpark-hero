import { nationalityOf } from '@/data/playerNationalities';
import {
  FORMATIONS, homelandEngineName, refreshWorldRoster, worldRosterFor, worldYear, yearsOn,
  type CareerState, type CMPlayer,
} from '@/lib/clubManager';
import { eraRosters, isHistoricEra } from '@/lib/clubManagerEras';
import { worldRosterView } from '@/lib/clubManagerWorldRoster';
import { FIT_PENALTY, gradeFit } from '@/lib/positionFit';
import { managerFormatYear, nationStrength, tournamentForYear } from '@/lib/soccerInternational';

export type NationalPlayer = Pick<CMPlayer, 'name' | 'position' | 'secondaryPositions' | 'rating' | 'age'> & {
  key: string;
  club: string | null;
};

export interface NationalXI {
  year: number;
  formation: number;
  keys: string[];
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
  const plan = career.nationJob?.xi;
  if (!plan || plan.year !== summer || !Number.isInteger(plan.formation) || !Array.isArray(plan.keys)) return null;
  const result = resolveNationalXI(plan, nationalPool(career));
  if (!result) return null;
  const nationalStrength = nationStrength(career.nationJob!.nation);
  return { ...result, formation: FORMATIONS[plan.formation].name, adjustment: Math.max(-8, Math.min(8, result.strength - nationalStrength)) };
}

export function setNationalXI(career: CareerState, plan: NationalXI | null): CareerState | null {
  const job = career.nationJob;
  const summer = nationalSummerOf(career);
  if (!job || !summer || career.live || career.retired || career.sacked || career.wilderness) return null;
  if (plan && (plan.year !== summer.year || !Number.isInteger(plan.formation) || !Array.isArray(plan.keys)
    || !resolveNationalXI(plan, nationalPool(career)))) return null;
  const updated = { ...job };
  if (plan) updated.xi = { ...plan, keys: [...plan.keys] };
  else delete updated.xi;
  return { ...career, nationJob: updated };
}
