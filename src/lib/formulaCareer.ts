import { z } from 'zod';
import { FORMULA_CALENDAR, FORMULA_CAREER_SEASONS, FORMULA_GP_POINTS, FORMULA_RULEBOOK } from '@/data/formulaCareer2025';

export type FormulaFocus = 'pace' | 'racecraft' | 'composure';
export type FormulaApproach = 'careful' | 'steady' | 'attack';
export interface FormulaDriver {
  id: string; name: string; teamId: string; age: number;
  pace: number; racecraft: number; composure: number; potential: number;
}
export interface FormulaTeam { id: string; name: string; pace: number; reliability: number }
export interface FormulaTime { driverId: string; ms: number }
export interface FormulaGridRow {
  driverId: string; name: string; teamId: string; position: number; ms: number; stage: 1 | 2 | 3;
}
export interface FormulaQualifying {
  id: string; q1: FormulaTime[]; q2: FormulaTime[]; q3: FormulaTime[]; grid: FormulaGridRow[];
}
export interface FormulaResult {
  driverId: string; name: string; teamId: string; grid: number;
  status: 'finished' | 'retired'; position: number | null; points: number;
  reason: string | null; performance: number;
}
export interface FormulaRace {
  id: string; season: number; round: number; event: string;
  grid: FormulaGridRow[]; results: FormulaResult[];
}
export interface FormulaOffer {
  id: string; teamId: string; outgoingDriverId: string; salary: number;
  negotiated: boolean; decision: 'original' | 'raise' | 'counter' | 'refused';
}
export interface FormulaContract { season: number; teamId: string; salary: number }
export interface FormulaState {
  version: 1; rulebook: typeof FORMULA_RULEBOOK; careerId: string; rng: number; draws: number;
  season: number; round: number; serial: number;
  phase: 'weekend' | 'grid' | 'result' | 'contracts' | 'retired';
  drivers: FormulaDriver[]; teams: FormulaTeam[]; qualifying: FormulaQualifying | null;
  races: FormulaRace[]; offers: FormulaOffer[]; contracts: FormulaContract[];
  focus: FormulaFocus; approach: FormulaApproach; completionEvent: string | null;
}
export interface FormulaStanding {
  id: string; name: string; points: number; wins: number; podiums: number; rank: number; countback: number[];
}

const FIRST = ['Tavi', 'Orin', 'Niko', 'Ivo', 'Ravi', 'Miro', 'Elio', 'Soren', 'Zeki', 'Kian', 'Toma', 'Arlo'];
const LAST = ['Veyran', 'Alvero', 'Kessari', 'Torven', 'Ilari', 'Merrow', 'Sovik', 'Dalen', 'Rensai', 'Valen', 'Neravi'];
const TEAM_NAMES = ['Harbor Racing', 'Copper Motorsport', 'Ridge GP', 'Northstar Racing', 'Aster Motorsport',
  'Juniper GP', 'Cobalt Racing', 'Summit Motorsport', 'Solstice GP', 'Aurora Racing'];
const clamp = (n: number, lo = 35, hi = 99) => Math.min(hi, Math.max(lo, n));
const copy = (s: FormulaState): FormulaState => structuredClone(s);

// All engine randomness passes through this saved stream. Reads never call it.
function draw(s: FormulaState): number {
  s.rng = (s.rng + 0x6D2B79F5) >>> 0;
  let n = s.rng;
  n = Math.imul(n ^ (n >>> 15), n | 1);
  n ^= n + Math.imul(n ^ (n >>> 7), n | 61);
  s.draws += 1;
  return ((n ^ (n >>> 14)) >>> 0) / 4294967296;
}
function generatedDriver(s: FormulaState, teamId: string, index: number): FormulaDriver {
  const team = s.teams.find(t => t.id === teamId)!;
  const ability = clamp(team.pace - 5 + draw(s) * 12);
  return {
    id: 'driver-' + s.serial++, name: FIRST[index % FIRST.length] + ' ' + LAST[Math.floor(draw(s) * LAST.length)],
    teamId, age: 19 + Math.floor(draw(s) * 15), pace: ability,
    racecraft: clamp(ability - 3 + draw(s) * 6), composure: clamp(ability - 5 + draw(s) * 10),
    potential: clamp(ability + 3 + draw(s) * 15),
  };
}
export function createFormulaCareer(name: string, seed: number): FormulaState {
  const initialSeed = seed >>> 0;
  const s: FormulaState = {
    version: 1, rulebook: FORMULA_RULEBOOK, careerId: 'formula-' + initialSeed.toString(16),
    rng: initialSeed, draws: 0, season: 1, round: 0, serial: 1, phase: 'weekend',
    drivers: [], teams: TEAM_NAMES.map((teamName, i) => ({ id: 'team-' + i, name: teamName,
      pace: 60 + i * 3.6, reliability: 78 + i * 1.5 })),
    qualifying: null, races: [], offers: [], contracts: [{ season: 1, teamId: 'team-0', salary: 400000 }],
    focus: 'pace', approach: 'steady', completionEvent: null,
  };
  for (let i = 0; i < 20; i++) s.drivers.push(generatedDriver(s, 'team-' + Math.floor(i / 2), i));
  s.drivers[0] = { id: 'player', name: name.trim().slice(0, 28) || 'Your driver', teamId: 'team-0',
    age: 18, pace: 65, racecraft: 63, composure: 66, potential: 88 + Math.floor(draw(s) * 12) };
  return s;
}
export const formulaWeekendId = (s: FormulaState) => s.careerId + ':' + s.season + ':' + s.round;

export function qualifyFormulaCareer(s: FormulaState, expectedId: string, focus: FormulaFocus, approach: FormulaApproach): FormulaState {
  if (s.phase !== 'weekend' || expectedId !== formulaWeekendId(s)) return s;
  const next = copy(s);
  next.focus = focus; next.approach = approach;
  const player = next.drivers.find(d => d.id === 'player')!;
  player[focus] = Math.min(player.potential, player[focus] + 0.08);
  const session = (drivers: FormulaDriver[]): FormulaTime[] => drivers.map(d => {
    const team = next.teams.find(t => t.id === d.teamId)!;
    return { driverId: d.id, ms: Math.round(110000 - (d.pace * 0.58 + team.pace * 0.42) * 220
      + (draw(next) - 0.5) * (4000 - d.composure * 20)) };
  }).sort((a, b) => a.ms - b.ms || a.driverId.localeCompare(b.driverId));
  const q1 = session(next.drivers);
  const q2 = session(q1.slice(0, 15).map(t => next.drivers.find(d => d.id === t.driverId)!));
  const q3 = session(q2.slice(0, 10).map(t => next.drivers.find(d => d.id === t.driverId)!));
  const ordered = [...q3.map(t => ({ ...t, stage: 3 as const })),
    ...q2.slice(10).map(t => ({ ...t, stage: 2 as const })),
    ...q1.slice(15).map(t => ({ ...t, stage: 1 as const }))];
  const grid = ordered.map((t, i) => {
    const d = next.drivers.find(driver => driver.id === t.driverId)!;
    return { ...t, name: d.name, teamId: d.teamId, position: i + 1 };
  });
  next.qualifying = { id: expectedId, q1, q2, q3, grid }; next.phase = 'grid';
  return next;
}
export function raceFormulaCareer(s: FormulaState, expectedId: string): FormulaState {
  if (s.phase !== 'grid' || !s.qualifying || expectedId !== formulaWeekendId(s)
    || s.qualifying.id !== expectedId || s.races.some(r => r.id === expectedId)) return s;
  const next = copy(s);
  const results: FormulaResult[] = next.qualifying!.grid.map(grid => {
    const d = next.drivers.find(driver => driver.id === grid.driverId)!;
    const team = next.teams.find(t => t.id === d.teamId)!;
    const approach: FormulaApproach = d.id === 'player' ? next.approach : 'steady';
    const risk = approach === 'attack' ? 1.7 : approach === 'careful' ? 0.55 : 1;
    const mechanical = draw(next) < (100 - team.reliability) / 600;
    const incident = draw(next) < (0.012 + (100 - d.composure) / 1800) * risk;
    const performance = d.pace * 0.3 + d.racecraft * 0.25 + team.pace * 0.45
      + (21 - grid.position) * 0.12 + (draw(next) - 0.5) * (14 - d.composure * 0.07)
      + (approach === 'attack' ? 1.2 : approach === 'careful' ? -0.7 : 0);
    return { driverId: d.id, name: d.name, teamId: d.teamId, grid: grid.position,
      status: mechanical || incident ? 'retired' : 'finished', position: null, points: 0,
      reason: mechanical ? 'Power issue' : incident ? 'Incident' : null, performance };
  });
  results.sort((a, b) => Number(a.status === 'retired') - Number(b.status === 'retired')
    || (a.status === 'finished' ? b.performance - a.performance : a.grid - b.grid)
    || a.driverId.localeCompare(b.driverId));
  let place = 0;
  for (const result of results) {
    if (result.status === 'finished') {
      result.position = ++place;
      result.points = FORMULA_GP_POINTS[place - 1] ?? 0;
    }
  }
  next.races.push({ id: expectedId, season: next.season, round: next.round,
    event: FORMULA_CALENDAR[next.round], grid: next.qualifying!.grid, results });
  next.phase = 'result';
  if (next.round === FORMULA_CALENDAR.length - 1) next.completionEvent = next.careerId + ':season-' + next.season;
  return next;
}

function compareStanding(a: FormulaStanding, b: FormulaStanding): number {
  if (a.points !== b.points) return b.points - a.points;
  for (let i = 0; i < 20; i++) if (a.countback[i] !== b.countback[i]) return b.countback[i] - a.countback[i];
  return 0;
}
export function formulaStandings(s: FormulaState, season = s.season): { drivers: FormulaStanding[]; teams: FormulaStanding[] } {
  const driverRows = new Map<string, FormulaStanding>();
  const teamRows = new Map<string, FormulaStanding>();
  const row = (id: string, name: string): FormulaStanding => ({ id, name, points: 0, wins: 0,
    podiums: 0, rank: 1, countback: Array(20).fill(0) });
  if (season === s.season) for (const d of s.drivers) driverRows.set(d.id, row(d.id, d.name));
  for (const team of s.teams) teamRows.set(team.id, row(team.id, team.name));
  for (const race of s.races.filter(r => r.season === season)) for (const result of race.results) {
    if (!driverRows.has(result.driverId)) driverRows.set(result.driverId, row(result.driverId, result.name));
    const driver = driverRows.get(result.driverId)!;
    const team = teamRows.get(result.teamId)!;
    for (const standing of [driver, team]) {
      standing.points += result.points;
      if (result.position !== null) {
        standing.countback[result.position - 1] += 1;
        if (result.position === 1) standing.wins += 1;
        if (result.position <= 3) standing.podiums += 1;
      }
    }
  }
  const rank = (rows: FormulaStanding[]) => {
    rows.sort((a, b) => compareStanding(a, b) || a.id.localeCompare(b.id));
    rows.forEach((r, i) => { r.rank = i > 0 && compareStanding(rows[i - 1], r) === 0 ? rows[i - 1].rank : i + 1; });
    return rows;
  };
  return { drivers: rank([...driverRows.values()]), teams: rank([...teamRows.values()]) };
}
export function formulaCareerStats(s: FormulaState) {
  const results = s.races.map(r => r.results.find(result => result.driverId === 'player')!);
  const points = results.reduce((sum, r) => sum + r.points, 0);
  let titles = 0;
  for (let season = 1; season <= s.season; season++) {
    if (s.races.filter(r => r.season === season).length === 24
      && formulaStandings(s, season).drivers.find(d => d.id === 'player')?.rank === 1) titles += 1;
  }
  const earnings = s.contracts.reduce((sum, c) => sum + c.salary * s.races.filter(r => r.season === c.season).length / 24, 0);
  return { starts: results.length, points, wins: results.filter(r => r.position === 1).length,
    podiums: results.filter(r => r.position !== null && r.position <= 3).length, titles,
    earnings: Math.round(earnings), score: results.length ? Math.round(100 * points / (25 * results.length)) : 0 };
}
function makeOffers(s: FormulaState): FormulaOffer[] {
  const player = s.drivers.find(d => d.id === 'player')!;
  const points = formulaStandings(s).drivers.find(d => d.id === 'player')!.points;
  const ability = (player.pace + player.racecraft + player.composure) / 3;
  const attainable = Math.min(98, ability + Math.min(12, points / 30));
  const eligible = s.teams.filter(t => t.id !== player.teamId && t.pace <= attainable + 2)
    .sort((a, b) => b.pace - a.pace || a.id.localeCompare(b.id)).slice(0, 3);
  const teams = [s.teams.find(t => t.id === player.teamId)!, ...eligible];
  return teams.map(team => {
    const outgoing = s.drivers.filter(d => d.teamId === team.id && d.id !== 'player')
      .sort((a, b) => a.pace - b.pace || a.id.localeCompare(b.id))[0];
    const ageFactor = player.age >= 32 && ability < 85 ? 0.72 : 1;
    const salary = Math.round((team.pace - 45) * 45000 * (0.65 + ability / 150 + points / 1200) * ageFactor / 1000) * 1000;
    return { id: s.careerId + ':offer-' + s.season + '-' + team.id, teamId: team.id,
      outgoingDriverId: outgoing.id, salary, negotiated: false, decision: 'original' as const };
  });
}
export function advanceFormulaCareer(s: FormulaState, expectedId: string): FormulaState {
  if (s.phase !== 'result' || expectedId !== formulaWeekendId(s)) return s;
  const next = copy(s);
  if (next.round < 23) {
    next.round += 1; next.qualifying = null; next.phase = 'weekend';
  } else if (next.season === FORMULA_CAREER_SEASONS) {
    next.phase = 'retired';
  } else {
    next.offers = makeOffers(next); next.phase = 'contracts';
  }
  return next;
}
export function negotiateFormulaOffer(s: FormulaState, offerId: string): FormulaState {
  const offer = s.offers.find(o => o.id === offerId);
  if (s.phase !== 'contracts' || !offer || offer.negotiated) return s;
  const next = copy(s);
  const target = next.offers.find(o => o.id === offerId)!;
  const points = formulaStandings(next).drivers.find(d => d.id === 'player')!.points;
  const chance = Math.min(0.85, 0.25 + points / 600);
  const outcome = draw(next);
  target.negotiated = true;
  if (outcome < chance) { target.salary = Math.round(target.salary * 1.15); target.decision = 'raise'; }
  else if (outcome < chance + 0.2) { target.salary = Math.round(target.salary * 1.05); target.decision = 'counter'; }
  else target.decision = 'refused';
  return next;
}
export function acceptFormulaOffer(s: FormulaState, offerId: string): FormulaState {
  const offer = s.offers.find(o => o.id === offerId);
  if (s.phase !== 'contracts' || !offer) return s;
  const next = copy(s);
  const player = next.drivers.find(d => d.id === 'player')!;
  const outgoing = next.drivers.find(d => d.id === offer.outgoingDriverId)!;
  if (offer.teamId !== player.teamId) {
    outgoing.teamId = player.teamId; player.teamId = offer.teamId;
  }
  next.season += 1;
  next.contracts.push({ season: next.season, teamId: player.teamId, salary: offer.salary });
  for (const d of next.drivers) {
    d.age += 1;
    const starts = s.races.filter(r => r.season === s.season && r.results.some(result => result.driverId === d.id)).length;
    const growth = d.age <= 27 ? 0.12 : d.age <= 31 ? 0.045 : 0;
    for (const key of ['pace', 'racecraft', 'composure'] as const) {
      d[key] = clamp(d[key] + (d.potential - d[key]) * growth * (0.4 + starts / 40)
        + (draw(next) - 0.5) * 1.2 - (d.age > 31 ? 0.9 : 0));
    }
    if (d.id === 'player') d[next.focus] = clamp(d[next.focus] + 0.8, 35, d.potential);
    else if (draw(next) < 0.12) d.potential = clamp(d.potential + (draw(next) - 0.25) * 6, Math.max(d.pace, d.racecraft, d.composure), 99);
  }
  for (const team of next.teams) {
    team.pace = clamp(team.pace + (draw(next) - 0.5) * 6 + (80 - team.pace) * 0.025, 55, 98);
    team.reliability = clamp(team.reliability + (draw(next) - 0.5) * 3, 70, 99);
  }
  next.drivers = next.drivers.map((d, i) => {
    if (d.id !== 'player' && d.age >= 37) {
      const replacement = generatedDriver(next, d.teamId, i + next.season);
      replacement.age = 19; return replacement;
    }
    return d;
  });
  next.round = 0; next.qualifying = null; next.offers = []; next.phase = 'weekend';
  return next;
}
export function retireFormulaCareer(s: FormulaState): FormulaState {
  if (s.phase === 'grid' || s.phase === 'retired') return s;
  const next = copy(s);
  next.phase = 'retired';
  const currentStarts = s.races.filter(r => r.season === s.season).length;
  if (currentStarts > 0 && currentStarts < 24) next.completionEvent = s.careerId + ':retirement';
  return next;
}

const number = z.number().finite();
const rating = number.min(0).max(99);
const id = z.string().min(1).max(80);
const timeSchema = z.object({ driverId: id, ms: number.int().positive() });
const gridSchema = z.object({ driverId: id, name: z.string().min(1).max(40), teamId: id,
  position: number.int().min(1).max(20), ms: number.int().positive(), stage: z.union([z.literal(1), z.literal(2), z.literal(3)]) });
const schema = z.object({
  version: z.literal(1), rulebook: z.literal(FORMULA_RULEBOOK), careerId: id,
  rng: number.int().min(0).max(4294967295), draws: number.int().nonnegative(),
  season: number.int().min(1).max(20), round: number.int().min(0).max(23), serial: number.int().positive().max(21 + 19 * (FORMULA_CAREER_SEASONS - 1)),
  phase: z.enum(['weekend', 'grid', 'result', 'contracts', 'retired']),
  drivers: z.array(z.object({ id, name: z.string().min(1).max(40), teamId: id, age: number.int().min(18).max(60),
    pace: rating, racecraft: rating, composure: rating, potential: rating })).length(20),
  teams: z.array(z.object({ id, name: z.string().min(1).max(40), pace: rating, reliability: rating })).length(10),
  qualifying: z.object({ id, q1: z.array(timeSchema).length(20), q2: z.array(timeSchema).length(15),
    q3: z.array(timeSchema).length(10), grid: z.array(gridSchema).length(20) }).nullable(),
  races: z.array(z.object({ id, season: number.int().min(1).max(20), round: number.int().min(0).max(23),
    event: z.string(), grid: z.array(gridSchema).length(20), results: z.array(z.object({
      driverId: id, name: z.string().min(1).max(40), teamId: id, grid: number.int().min(1).max(20),
      status: z.enum(['finished', 'retired']), position: number.int().min(1).max(20).nullable(),
      points: number.int().nonnegative(), reason: z.string().nullable(), performance: number,
    })).length(20) })).max(480),
  offers: z.array(z.object({ id, teamId: id, outgoingDriverId: id, salary: number.int().positive(),
    negotiated: z.boolean(), decision: z.enum(['original', 'raise', 'counter', 'refused']) })).max(4),
  contracts: z.array(z.object({ season: number.int().min(1).max(20), teamId: id, salary: number.int().positive() })).min(1).max(20),
  focus: z.enum(['pace', 'racecraft', 'composure']), approach: z.enum(['careful', 'steady', 'attack']),
  completionEvent: id.nullable(),
});
function validGrid(grid: FormulaGridRow[]): boolean {
  return new Set(grid.map(r => r.driverId)).size === 20 && grid.every((r, i) => r.position === i + 1);
}
export function parseFormulaCareer(raw: string): FormulaState | null {
  try {
    const parsed = schema.safeParse(JSON.parse(raw));
    if (!parsed.success) return null;
    const s = parsed.data as FormulaState;
    const teamIds = new Set(s.teams.map(t => t.id));
    if (teamIds.size !== 10 || new Set(s.drivers.map(d => d.id)).size !== 20
      || s.drivers.filter(d => d.id === 'player').length !== 1
      || s.drivers.some(d => d.id !== 'player' && (!/^driver-[1-9][0-9]*$/.test(d.id)
        || Number(d.id.slice(7)) >= s.serial))
      || s.teams.some(t => s.drivers.filter(d => d.teamId === t.id).length !== 2)
      || s.contracts.length !== s.season || s.contracts.some((c, i) => c.season !== i + 1 || !teamIds.has(c.teamId))
      || s.contracts[s.season - 1].teamId !== s.drivers.find(d => d.id === 'player')!.teamId) return null;
    const seen = new Set<string>();
    for (const race of s.races) {
      if (seen.has(race.id) || race.id !== s.careerId + ':' + race.season + ':' + race.round
        || race.event !== FORMULA_CALENDAR[race.round] || !validGrid(race.grid)
        || race.grid.some(g => !teamIds.has(g.teamId))
        || s.teams.some(t => race.grid.filter(g => g.teamId === t.id).length !== 2)
        || race.grid.some(g => g.driverId !== 'player' && (!/^driver-[1-9][0-9]*$/.test(g.driverId)
          || Number(g.driverId.slice(7)) >= s.serial))
        || race.grid.find(g => g.driverId === 'player')?.teamId !== s.contracts[race.season - 1]?.teamId
        || new Set(race.results.map(r => r.driverId)).size !== 20
        || !race.results.some(r => r.driverId === 'player')) return null;
      seen.add(race.id);
      let position = 0; let retired = false;
      for (const result of race.results) {
        const grid = race.grid.find(g => g.driverId === result.driverId);
        if (!grid || grid.teamId !== result.teamId || grid.name !== result.name || grid.position !== result.grid) return null;
        if (result.status === 'retired') {
          retired = true;
          if (result.position !== null || result.points !== 0 || result.reason === null) return null;
        } else {
          if (retired || result.position !== ++position || result.points !== (FORMULA_GP_POINTS[position - 1] ?? 0)
            || result.reason !== null) return null;
        }
      }
    }
    const hasCurrentRace = s.phase === 'result' || s.phase === 'contracts'
      || (s.phase === 'retired' && seen.has(formulaWeekendId(s)));
    const expectedRaces = (s.season - 1) * 24 + s.round + Number(hasCurrentRace);
    if (s.races.length !== expectedRaces || s.races.some((r, i) => r.season !== Math.floor(i / 24) + 1 || r.round !== i % 24)
      || (s.phase === 'contracts' && (s.season === 20 || s.round !== 23 || s.offers.length < 1))
      || (s.phase !== 'contracts' && s.offers.length > 0 && s.phase !== 'retired')) return null;
    const finishedSeasons = Math.floor(s.races.length / 24);
    const completion = s.phase === 'retired' && s.races.length % 24 > 0
      ? s.careerId + ':retirement' : finishedSeasons > 0 ? s.careerId + ':season-' + finishedSeasons : null;
    if (s.completionEvent !== completion) return null;
    if (s.qualifying) {
      const q = s.qualifying;
      if (q.id !== formulaWeekendId(s) || !validGrid(q.grid)
        || new Set(q.q1.map(t => t.driverId)).size !== 20
        || q.q1.some(t => !s.drivers.some(d => d.id === t.driverId))
        || [q.q1, q.q2, q.q3].some(times => times.some((t, i) => i > 0 && (times[i - 1].ms > t.ms
          || (times[i - 1].ms === t.ms && times[i - 1].driverId.localeCompare(t.driverId) > 0))))) return null;
      const ids = (times: FormulaTime[]) => times.map(t => t.driverId).sort().join('|');
      if (ids(q.q2) !== ids(q.q1.slice(0, 15)) || ids(q.q3) !== ids(q.q2.slice(0, 10))) return null;
      const order = [...q.q3, ...q.q2.slice(10), ...q.q1.slice(15)];
      if (q.grid.some((g, i) => g.driverId !== order[i].driverId || g.ms !== order[i].ms
        || g.stage !== (i < 10 ? 3 : i < 15 ? 2 : 1)
        || g.teamId !== s.drivers.find(d => d.id === g.driverId)?.teamId
        || g.name !== s.drivers.find(d => d.id === g.driverId)?.name)) return null;
    } else if (s.phase === 'grid' || s.phase === 'result' || s.phase === 'contracts') return null;
    if (s.phase === 'weekend' && s.qualifying !== null) return null;
    if (s.phase === 'retired' && s.qualifying !== null && !hasCurrentRace) return null;
    if (hasCurrentRace && s.qualifying
      && JSON.stringify(s.qualifying.grid) !== JSON.stringify(s.races[s.races.length - 1].grid)) return null;
    const offerIds = new Set(s.offers.map(o => o.id));
    if (offerIds.size !== s.offers.length || s.offers.some(o => o.id !== s.careerId + ':offer-' + s.season + '-' + o.teamId
      || !teamIds.has(o.teamId) || !s.drivers.some(d => d.id === o.outgoingDriverId && d.teamId === o.teamId && d.id !== 'player'))) return null;
    return s;
  } catch { return null; }
}
