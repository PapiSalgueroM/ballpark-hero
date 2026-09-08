import { z } from 'zod';

export type Point = [number, number];
export interface AttackPlayer { id: string; name: string; rating: number; originTeam: string }
export interface AttackTeam { id: string; name: string; color: string; overall: number; homeRegion: string; players: AttackPlayer[] }
export interface AttackRegion { id: string; name: string; rings: Point[][]; anchor: Point; initialOwner: string | null }
export interface AttackSetup { dataVersion: string; seed: number; teams: AttackTeam[]; regions: AttackRegion[]; bounds: { width: number; height: number } }
export interface AttackResult {
  kind: 'expansion' | 'match'; attacker: string; defender: string | null; winner: string; loser: string | null;
  targetRegion: string; changedRegions: string[]; capturedPlayers: AttackPlayer[];
  upgrade: { teamId: string; playerId: string; before: number; after: number; amount: 2 | 4 } | null;
  countryCompleted: boolean; score: { attacker: number; defender: number; shootout: { attacker: number; defender: number } | null } | null;
  attackerWinProbability: number | null;
}
export interface AttackState {
  version: 1; rulesVersion: 1; setup: AttackSetup; rng: number; revision: number;
  owners: Record<string, string | null>; teams: AttackTeam[];
  phase: 'team' | 'direction' | 'target' | 'recap' | 'finished';
  selectedTeam: string | null; bearing: number | null; targetRegion: string | null;
  lastResult: AttackResult | null; champion: string | null;
}
const copy = <T,>(value: T): T => structuredClone(value);
const EPSILON = 1e-7;
const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value));

export function createAttack(setup: AttackSetup): AttackState {
  if (!validSetup(setup)) throw new Error('Invalid attack setup.');
  const state: AttackState = {
    version: 1, rulesVersion: 1, setup: copy(setup), rng: setup.seed, revision: 0,
    owners: Object.fromEntries(setup.regions.map(region => [region.id, region.initialOwner])),
    teams: copy(setup.teams), phase: 'team', selectedTeam: null, bearing: null,
    targetRegion: null, lastResult: null, champion: null,
  };
  if (state.teams.some(team => !hasDirection(state, team.id))) throw new Error('A team has no legal land direction.');
  return state;
}

// Rings use the SVG evenodd rule: outer parts and holes share the same representation.
function inside(point: Point, rings: Point[][]): boolean {
  let result = false;
  for (const ring of rings) {
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const a = ring[i], b = ring[j];
      if ((a[1] > point[1]) !== (b[1] > point[1]) && point[0] < (b[0] - a[0]) * (point[1] - a[1]) / (b[1] - a[1]) + a[0]) result = !result;
    }
  }
  return result;
}

export function rayTarget(state: AttackState, teamId: string, bearing: number): string | null {
  if (!Number.isInteger(bearing) || bearing < 0 || bearing >= 360) return null;
  const team = state.teams.find(t => t.id === teamId);
  const originRegion = state.setup.regions.find(r => r.id === team?.homeRegion && state.owners[r.id] === teamId)
    ?? state.setup.regions.find(r => state.owners[r.id] === teamId);
  if (!originRegion) return null;
  const origin = originRegion.anchor;
  const angle = bearing * Math.PI / 180;
  const direction: Point = [Math.sin(angle), -Math.cos(angle)];
  const limit = Math.hypot(state.setup.bounds.width, state.setup.bounds.height) * 2;
  const intervals: { start: number; end: number; id: string }[] = [];
  for (const region of state.setup.regions) {
    const cuts = [0, limit];
    for (const ring of region.rings) {
      for (let i = 0; i < ring.length; i++) {
        const a = ring[i], b = ring[(i + 1) % ring.length];
        const dx = b[0] - a[0], dy = b[1] - a[1];
        const cross = direction[0] * dy - direction[1] * dx;
        if (Math.abs(cross) < EPSILON) continue;
        const ax = a[0] - origin[0], ay = a[1] - origin[1];
        const distance = (ax * dy - ay * dx) / cross;
        const along = (ax * direction[1] - ay * direction[0]) / cross;
        if (distance >= 0 && distance < limit && along >= -EPSILON && along <= 1 + EPSILON) cuts.push(distance);
      }
    }
    cuts.sort((a, b) => a - b);
    for (let i = 1; i < cuts.length; i++) {
      const start = cuts[i - 1], end = cuts[i];
      const middle = (start + end) / 2;
      if (end - start > EPSILON && inside([origin[0] + direction[0] * middle, origin[1] + direction[1] * middle], region.rings)) {
        intervals.push({ start, end, id: region.id });
      }
    }
  }
  intervals.sort((a, b) => a.start - b.start || a.end - b.end);
  let reach = 0;
  for (const interval of intervals) {
    // A positive gap is water. A vertex touch has no interval and cannot attack.
    if (interval.start > reach + EPSILON) return null;
    if (state.owners[interval.id] !== teamId && interval.end > reach + EPSILON) return interval.id;
    reach = Math.max(reach, interval.end);
  }
  return null;
}

function bestEleven(players: AttackPlayer[]): number {
  const best = [...players].sort((a, b) => b.rating - a.rating).slice(0, 11);
  return best.length ? best.reduce((sum, player) => sum + player.rating, 0) / best.length : 0;
}

export function attackStrength(state: AttackState, teamId: string): number {
  const original = state.setup.teams.find(team => team.id === teamId);
  const current = state.teams.find(team => team.id === teamId);
  if (!original || !current) return 45;
  return clamp(original.overall + (bestEleven(current.players) - bestEleven(original.players)), 45, 99);
}
function random(state: AttackState): number {
  state.rng = (Math.imul(state.rng, 1664525) + 1013904223) >>> 0;
  return state.rng / 4294967296;
}
function pick<T>(state: AttackState, values: T[]): T {
  return values[Math.floor(random(state) * values.length)];
}
function living(state: AttackState): AttackTeam[] {
  const owners = new Set(Object.values(state.owners));
  return state.teams.filter(team => owners.has(team.id));
}
function bearings(state: AttackState, teamId: string): { bearing: number; targetRegion: string }[] {
  const options: { bearing: number; targetRegion: string }[] = [];
  for (let bearing = 0; bearing < 360; bearing++) {
    const targetRegion = rayTarget(state, teamId, bearing);
    if (targetRegion) options.push({ bearing, targetRegion });
  }
  return options;
}
function hasDirection(state: AttackState, teamId: string): boolean {
  for (let bearing = 0; bearing < 360; bearing++) if (rayTarget(state, teamId, bearing)) return true;
  return false;
}
function bestPlayer(state: AttackState, players: AttackPlayer[]): AttackPlayer {
  const highest = Math.max(...players.map(player => player.rating));
  return pick(state, players.filter(player => player.rating === highest));
}
function upgrade(state: AttackState, teamId: string, amount: 2 | 4): AttackResult['upgrade'] {
  const player = bestPlayer(state, state.teams.find(team => team.id === teamId)!.players);
  const before = player.rating;
  player.rating = Math.min(99, before + amount);
  return { teamId, playerId: player.id, before, after: player.rating, amount };
}

export function advanceAttack(state: AttackState): AttackState {
  const next = copy(state);
  if (state.phase === 'finished') return next;
  next.revision++;
  if (state.phase === 'team') {
    next.selectedTeam = pick(next, living(next)).id;
    next.phase = 'direction';
  } else if (state.phase === 'direction') {
    const options = bearings(next, next.selectedTeam!);
    if (!options.length) throw new Error('This team has no legal land direction.');
    Object.assign(next, pick(next, options));
    next.phase = 'target';
  } else if (state.phase === 'recap') {
    if (next.champion) next.phase = 'finished';
    else {
      next.phase = 'team';
      next.selectedTeam = null;
      next.bearing = null;
      next.targetRegion = null;
      next.lastResult = null;
    }
  } else {
    const attacker = next.selectedTeam!;
    const targetRegion = next.targetRegion!;
    const defender = next.owners[targetRegion];
    const result: AttackResult = {
      kind: defender ? 'match' : 'expansion', attacker, defender, winner: attacker, loser: null,
      targetRegion, changedRegions: [], capturedPlayers: [], upgrade: null, countryCompleted: false,
      score: null, attackerWinProbability: null,
    };
    if (defender) {
      const gap = attackStrength(next, attacker) - attackStrength(next, defender) - 2;
      result.attackerWinProbability = clamp(1 / (1 + 10 ** (-gap / 22)), 0.08, 0.92);
      const attackerWon = random(next) < result.attackerWinProbability;
      result.winner = attackerWon ? attacker : defender;
      result.loser = attackerWon ? defender : attacker;
      const tied = random(next) < 0.25;
      const low = Math.floor(random(next) * 3);
      const high = tied ? low : low + 1 + Math.floor(random(next) * 3);
      result.score = {
        attacker: attackerWon ? high : low, defender: attackerWon ? low : high,
        shootout: tied ? { attacker: attackerWon ? 5 : 4, defender: attackerWon ? 4 : 5 } : null,
      };
      const loser = next.teams.find(team => team.id === result.loser)!;
      const winner = next.teams.find(team => team.id === result.winner)!;
      const original = loser.players.filter(player => player.originTeam === loser.id);
      const best = bestPlayer(next, original);
      const moved = loser.players.filter(player => player.id === best.id || player.originTeam !== loser.id);
      result.capturedPlayers = copy(moved);
      winner.players.push(...moved);
      const movedIds = new Set(moved.map(player => player.id));
      loser.players = loser.players.filter(player => !movedIds.has(player.id));
      for (const region of next.setup.regions) {
        if (next.owners[region.id] === loser.id) next.owners[region.id] = winner.id;
      }
    } else next.owners[targetRegion] = attacker;
    if (living(next).length === 1) {
      next.champion = result.winner;
      result.countryCompleted = true;
      for (const region of next.setup.regions) next.owners[region.id] = result.winner;
      result.upgrade = upgrade(next, result.winner, 4);
    } else if (!defender) result.upgrade = upgrade(next, attacker, 2);
    result.changedRegions = next.setup.regions.filter(region => state.owners[region.id] !== next.owners[region.id]).map(region => region.id);
    next.lastResult = result;
    next.phase = 'recap';
  }
  return next;
}
const idSchema = z.string().min(1).max(100).regex(/^[a-zA-Z0-9][a-zA-Z0-9:_-]*$/);
const ratingSchema = z.number().finite().min(1).max(99);
const uintSchema = z.number().int().min(0).max(4294967295);
const playerSchema = z.object({ id: idSchema, name: z.string().trim().min(1).max(160), rating: ratingSchema, originTeam: idSchema }).strict();
const teamSchema = z.object({
  id: idSchema, name: z.string().trim().min(1).max(160), color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  overall: z.number().finite().min(45).max(99), homeRegion: idSchema, players: z.array(playerSchema).max(4096),
}).strict();
const pointSchema = z.tuple([z.number().finite().min(0).max(1e6), z.number().finite().min(0).max(1e6)]);
const setupSchema = z.object({
  dataVersion: z.string().min(1).max(120), seed: uintSchema,
  teams: z.array(teamSchema).min(2).max(64),
  regions: z.array(z.object({ id: idSchema, name: z.string().min(1).max(160), rings: z.array(z.array(pointSchema).min(3).max(4096)).min(1).max(64), anchor: pointSchema, initialOwner: idSchema.nullable() }).strict()).min(2).max(512),
  bounds: z.object({ width: z.number().finite().min(1).max(1e6), height: z.number().finite().min(1).max(1e6) }).strict(),
}).strict();
const scorePairSchema = z.object({ attacker: z.number().int().min(0).max(20), defender: z.number().int().min(0).max(20) }).strict();
const resultSchema = z.object({
  kind: z.enum(['expansion', 'match']), attacker: idSchema, defender: idSchema.nullable(), winner: idSchema, loser: idSchema.nullable(),
  targetRegion: idSchema, changedRegions: z.array(idSchema).min(1).max(512), capturedPlayers: z.array(playerSchema).max(4096),
  upgrade: z.object({ teamId: idSchema, playerId: idSchema, before: ratingSchema, after: ratingSchema, amount: z.union([z.literal(2), z.literal(4)]) }).strict().nullable(),
  countryCompleted: z.boolean(),
  score: scorePairSchema.extend({ shootout: scorePairSchema.nullable() }).strict().nullable(),
  attackerWinProbability: z.number().finite().min(0.08).max(0.92).nullable(),
}).strict();
const stateSchema = z.object({
  version: z.literal(1), rulesVersion: z.literal(1), setup: setupSchema, rng: uintSchema, revision: z.number().int().min(0).max(2304),
  owners: z.record(idSchema, idSchema.nullable()), teams: z.array(teamSchema).min(2).max(64),
  phase: z.enum(['team', 'direction', 'target', 'recap', 'finished']), selectedTeam: idSchema.nullable(),
  bearing: z.number().int().min(0).max(359).nullable(), targetRegion: idSchema.nullable(), lastResult: resultSchema.nullable(), champion: idSchema.nullable(),
}).strict();
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const boundedArray = (value: unknown, max: number): value is unknown[] => Array.isArray(value) && value.length <= max;

// Reject oversized containers before schema traversal, including a shared total vertex budget.
function boundedSetup(value: unknown): boolean {
  if (!record(value) || !boundedArray(value.teams, 64) || !boundedArray(value.regions, 512)) return false;
  if (!value.teams.every(team => record(team) && boundedArray(team.players, 64))) return false;
  let vertices = 0;
  for (const region of value.regions) {
    if (!record(region) || !boundedArray(region.rings, 64)) return false;
    for (const ring of region.rings) {
      if (!boundedArray(ring, 4096)) return false;
      vertices += ring.length;
      if (vertices > 100000) return false;
    }
  }
  return true;
}
function unique(values: string[]): boolean { return new Set(values).size === values.length; }
function validSetup(value: unknown): value is AttackSetup {
  if (!boundedSetup(value) || !setupSchema.safeParse(value).success) return false;
  const setup = value as AttackSetup;
  const teamIds = new Set(setup.teams.map(team => team.id));
  if (teamIds.size !== setup.teams.length || !unique(setup.regions.map(region => region.id))) return false;
  if (!unique(setup.teams.flatMap(team => team.players.map(player => player.id)))) return false;
  if (setup.teams.some(team => !team.players.length || team.players.some(player => player.originTeam !== team.id)
    || !setup.regions.some(region => region.id === team.homeRegion && region.initialOwner === team.id))) return false;
  for (const region of setup.regions) {
    if (region.initialOwner !== null && !teamIds.has(region.initialOwner)) return false;
    if (!inside(region.anchor, region.rings)) return false;
    for (const point of [region.anchor, ...region.rings.flat()]) if (point[0] > setup.bounds.width || point[1] > setup.bounds.height) return false;
    for (const ring of region.rings) {
      const area = ring.reduce((sum, point, i) => {
        const next = ring[(i + 1) % ring.length];
        return sum + point[0] * next[1] - point[1] * next[0];
      }, 0);
      if (Math.abs(area) < EPSILON) return false;
    }
  }
  return true;
}

function validResult(state: AttackState): boolean {
  const result = state.lastResult!;
  const ids = new Set(state.teams.map(team => team.id));
  if (result.attacker !== state.selectedTeam || result.targetRegion !== state.targetRegion || !(result.targetRegion in state.owners) || !ids.has(result.winner)) return false;
  if (!unique(result.changedRegions) || result.changedRegions.some(id => state.owners[id] !== result.winner)) return false;
  if (result.countryCompleted !== (state.champion !== null) || (state.champion && state.champion !== result.winner)) return false;
  const winner = state.teams.find(team => team.id === result.winner)!;
  if (result.kind === 'expansion') {
    if (result.winner !== result.attacker || result.defender !== null || result.loser !== null || result.score !== null || result.attackerWinProbability !== null || result.capturedPlayers.length) return false;
    if (!result.changedRegions.includes(result.targetRegion)) return false;
    if (!result.countryCompleted && (result.changedRegions.length !== 1 || result.changedRegions[0] !== result.targetRegion)) return false;
  } else {
    if (!result.defender || !ids.has(result.defender) || result.defender === result.attacker || !result.loser || !ids.has(result.loser)) return false;
    if (![result.attacker, result.defender].includes(result.winner) || ![result.attacker, result.defender].includes(result.loser) || result.winner === result.loser) return false;
    if (Object.values(state.owners).includes(result.loser) || !result.score || result.attackerWinProbability === null) return false;
    const deciding = result.score.shootout ?? result.score;
    if (deciding.attacker === deciding.defender || (deciding.attacker > deciding.defender) !== (result.winner === result.attacker)) return false;
    if (result.score.shootout && result.score.attacker !== result.score.defender) return false;
    if (!unique(result.capturedPlayers.map(player => player.id)) || result.capturedPlayers.filter(player => player.originTeam === result.loser).length !== 1) return false;
    if (result.capturedPlayers.some(player => !winner.players.some(current => current.id === player.id && current.originTeam === player.originTeam && current.name === player.name
      && player.rating === (result.upgrade?.playerId === player.id ? result.upgrade.before : current.rating)))) return false;
  }
  const bonus = result.upgrade;
  if (result.countryCompleted || result.kind === 'expansion') {
    if (!bonus || bonus.teamId !== result.winner || bonus.amount !== (result.countryCompleted ? 4 : 2) || bonus.after !== Math.min(99, bonus.before + bonus.amount)) return false;
    if (!winner.players.some(player => player.id === bonus.playerId && player.rating === bonus.after)) return false;
  } else if (bonus !== null) return false;
  return true;
}

export function parseAttackSave(value: unknown): AttackState | null {
  try {
    if (!record(value) || !validSetup(value.setup) || !boundedArray(value.teams, 64) || !record(value.owners) || Object.keys(value.owners).length > 512) return null;
    let playerCount = 0;
    for (const team of value.teams) {
      if (!record(team) || !boundedArray(team.players, 4096)) return null;
      playerCount += team.players.length;
      if (playerCount > 4096) return null;
    }
    if (value.lastResult !== null && (!record(value.lastResult) || !boundedArray(value.lastResult.capturedPlayers, 4096) || !boundedArray(value.lastResult.changedRegions, 512))) return null;
    if (!stateSchema.safeParse(value).success) return null;
    const state = value as unknown as AttackState;
    const originalPlayers = new Map(state.setup.teams.flatMap(team => team.players.map(player => [player.id, player] as const)));
    const currentPlayers = state.teams.flatMap(team => team.players);
    const teamIds = new Set(state.setup.teams.map(team => team.id));
    if (state.teams.length !== teamIds.size || !unique(state.teams.map(team => team.id))) return null;
    if (currentPlayers.length !== originalPlayers.size || !unique(currentPlayers.map(player => player.id))) return null;
    for (const team of state.teams) {
      const original = state.setup.teams.find(candidate => candidate.id === team.id);
      if (!original || team.name !== original.name || team.color !== original.color || team.overall !== original.overall || team.homeRegion !== original.homeRegion) return null;
      for (const player of team.players) {
        const originalPlayer = originalPlayers.get(player.id);
        if (!originalPlayer || player.name !== originalPlayer.name || player.originTeam !== originalPlayer.originTeam || player.rating < originalPlayer.rating) return null;
        if (player.originTeam !== team.id && Object.values(state.owners).includes(player.originTeam)) return null;
      }
    }
    if (Object.keys(state.owners).length !== state.setup.regions.length || state.setup.regions.some(region => !(region.id in state.owners))) return null;
    if (Object.values(state.owners).some(owner => owner !== null && !teamIds.has(owner))) return null;
    const alive = living(state);
    if (!alive.length || alive.some(team => !team.players.some(player => player.originTeam === team.id))) return null;
    const maxTurns = state.setup.regions.filter(region => region.initialOwner === null).length + state.teams.length - 1;
    if (state.revision > maxTurns * 4) return null;
    const phaseRevision = { team: 0, direction: 1, target: 2, recap: 3, finished: 0 };
    if (state.revision % 4 !== phaseRevision[state.phase]) return null;
    if (state.champion !== null) {
      if (alive.length !== 1 || alive[0].id !== state.champion || Object.values(state.owners).some(owner => owner !== state.champion) || !['recap', 'finished'].includes(state.phase)) return null;
    } else if (alive.length < 2 || state.phase === 'finished') return null;
    if (state.phase === 'team') {
      if (state.selectedTeam !== null || state.bearing !== null || state.targetRegion !== null || state.lastResult !== null) return null;
    } else {
      if (!state.selectedTeam || !teamIds.has(state.selectedTeam)) return null;
      if (state.phase === 'direction' || state.phase === 'target') {
        if (!alive.some(team => team.id === state.selectedTeam) || state.lastResult !== null) return null;
        if (state.phase === 'direction') {
          if (state.bearing !== null || state.targetRegion !== null || !hasDirection(state, state.selectedTeam)) return null;
        } else if (state.bearing === null || state.targetRegion === null || rayTarget(state, state.selectedTeam, state.bearing) !== state.targetRegion) return null;
      } else if (state.bearing === null || state.targetRegion === null || !state.lastResult || !validResult(state)) return null;
    }
    if (state.revision === 0 && (state.rng !== state.setup.seed || state.setup.regions.some(region => state.owners[region.id] !== region.initialOwner)
      || currentPlayers.some(player => player.rating !== originalPlayers.get(player.id)!.rating))) return null;
    return copy(state);
  } catch { return null; }
}
