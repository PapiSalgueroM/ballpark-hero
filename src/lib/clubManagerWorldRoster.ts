import type { CareerState, CMPlayer } from '@/lib/clubManager';

export type WorldRosterPlayer = CMPlayer & { worldRosterKey?: string };
export interface WorldRosterOrigin {
  club: string;
  name: string;
  position: CMPlayer['position'];
  /** A simulation age anchor, not a real date of birth. */
  birthYear: number;
  since: number | null;
}
export interface WorldRosterRecord {
  key: string;
  origin: WorldRosterOrigin;
  owner: string | null;
  status: 'owned' | 'released' | 'retired';
  /** The world year of this complete player payload. */
  year: number;
  player: WorldRosterPlayer;
}
export interface WorldRosterState {
  version: 1;
  eraId: string;
  records: WorldRosterRecord[];
}
export type WorldRosterCareer = CareerState & { squad: WorldRosterPlayer[]; worldRoster?: WorldRosterState };
export interface WorldRosterTransfer {
  player: WorldRosterPlayer;
  from: string | null;
  to: string | null;
  kind: 'permanent' | 'loan' | 'loan-return' | 'release' | 'retire';
  key?: string;
  since?: number;
  /** Original position certified by the actual projected source, before retraining. */
  originPosition?: CMPlayer['position'];
}

const positions = new Set(['GK', 'CB', 'LB', 'RB', 'LWB', 'RWB', 'CDM', 'CM', 'CAM', 'LM', 'RM', 'LW', 'RW', 'CF', 'ST']);
const text = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;
const count = (value: unknown): value is number => Number.isSafeInteger(value) && (value as number) >= 0;
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
function yearOf(career: CareerState): number | null {
  const start = career.startYear === undefined ? 2026 : career.startYear;
  if (!count(start) || !count(career.season) || career.season < 1) return null;
  const year = start + career.season - 1;
  return count(year) ? year : null;
}
function validPlayer(value: unknown): value is WorldRosterPlayer {
  if (!object(value)) return false;
  return text(value.id) && text(value.name) && typeof value.position === 'string' && positions.has(value.position)
    && count(value.age) && typeof value.rating === 'number' && Number.isFinite(value.rating)
    && typeof value.fitness === 'number' && Number.isFinite(value.fitness)
    && typeof value.morale === 'number' && Number.isFinite(value.morale)
    && (value.value === undefined || typeof value.value === 'number' && Number.isFinite(value.value) && value.value >= 0)
    && (value.potential === undefined || count(value.potential) && value.potential <= 99)
    && (value.worldRosterSince === undefined || count(value.worldRosterSince))
    && count(value.injuryWeeks) && count(value.suspendedMatches) && typeof value.isYouth === 'boolean'
    && count(value.seasonGoals) && count(value.seasonAssists)
    && (value.onLoan === undefined || typeof value.onLoan === 'boolean')
    && (value.worldRosterKey === undefined || text(value.worldRosterKey));
}
function keyOf(eraId: string, origin: WorldRosterOrigin): string {
  return JSON.stringify([eraId, origin.club, origin.name, origin.position, origin.birthYear, origin.since]);
}
function samePlayer(player: CMPlayer, origin: WorldRosterOrigin, year: number): boolean {
  return player.name === origin.name && year - player.age === origin.birthYear;
}
function samePayload(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/** Missing or malformed optional data stays inactive and is never repaired by a read. */
export function readWorldRoster(career: CareerState): WorldRosterState | null {
  const year = yearOf(career);
  const raw: unknown = (career as WorldRosterCareer).worldRoster;
  if (year === null || !object(raw) || raw.version !== 1 || raw.eraId !== (career.eraId ?? 'now') || !Array.isArray(raw.records)) return null;
  const keys = new Set<string>();
  for (const value of raw.records) {
    if (!object(value) || !object(value.origin) || !validPlayer(value.player)) return null;
    const origin = value.origin;
    if (!text(origin.club) || !text(origin.name) || typeof origin.position !== 'string' || !positions.has(origin.position)
      || !count(origin.birthYear) || !(origin.since === null || count(origin.since) && origin.since <= year - (career.startYear ?? 2026))
      || !count(value.year) || value.year > year || !samePlayer(value.player, origin as unknown as WorldRosterOrigin, value.year)) return null;
    if (!text(value.key) || value.key !== keyOf(raw.eraId as string, origin as unknown as WorldRosterOrigin) || keys.has(value.key)
      || value.player.worldRosterKey !== value.key || value.player.onLoan === true) return null;
    if (value.status === 'owned' ? !text(value.owner) : (value.status !== 'released' && value.status !== 'retired') || value.owner !== null) return null;
    keys.add(value.key);
  }
  return raw as unknown as WorldRosterState;
}

/** Fresh transactions supply their actual source club; later moves carry this key unchanged. */
export function worldRosterKey(career: CareerState, originClub: string, player: CMPlayer, since?: number): string | null {
  const year = yearOf(career);
  if (year === null || !text(originClub) || !validPlayer(player) || year < player.age || (since !== undefined && (!count(since) || since > year - (career.startYear ?? 2026)))) return null;
  const carried = (player as WorldRosterPlayer).worldRosterKey;
  if (carried) {
    const record = readWorldRoster(career)?.records.find(item => item.key === carried);
    if (record) return samePlayer(player, record.origin, year) ? record.key : null;
    const fresh = keyOf(career.eraId ?? 'now', { club: originClub, name: player.name, position: player.position,
      birthYear: year - player.age, since: since ?? null });
    return carried === fresh ? fresh : null;
  }
  const eraId = career.eraId ?? 'now';
  if (!text(eraId)) return null;
  return keyOf(eraId, { club: originClub, name: player.name, position: player.position, birthYear: year - player.age, since: since ?? null });
}

/** This records a real completed transaction; it does not charge money or decide a deal. */
export function recordWorldRosterTransfer(career: CareerState, transfer: WorldRosterTransfer): WorldRosterCareer {
  const year = yearOf(career);
  const held = readWorldRoster(career);
  const existing = (career as WorldRosterCareer).worldRoster;
  if (year === null || (existing !== undefined && !held) || !validPlayer(transfer.player) || (transfer.from !== null && !text(transfer.from))
    || (transfer.originPosition !== undefined && !positions.has(transfer.originPosition))
    || transfer.player.onLoan === true || transfer.kind === 'loan' || transfer.kind === 'loan-return') return career;
  if (transfer.kind !== 'permanent' && transfer.kind !== 'release' && transfer.kind !== 'retire') return career;
  if (transfer.kind === 'permanent' ? !text(transfer.to) || transfer.to === transfer.from : transfer.to !== null) return career;
  const matches = (held?.records ?? []).filter(record => samePlayer(transfer.player, record.origin, year));
  const carried = transfer.key ?? transfer.player.worldRosterKey;
  const previous = carried ? held?.records.find(record => record.key === carried) : matches.length === 1 ? matches[0] : undefined;
  const position = transfer.originPosition ?? transfer.player.position;
  const freshKey = transfer.from === null ? null : keyOf(career.eraId ?? 'now', { club: transfer.from,
    name: transfer.player.name, position, birthYear: year - transfer.player.age,
    since: transfer.since ?? null });
  if ((carried && !previous && carried !== freshKey) || (!carried && matches.length > 1)
    || (previous && !samePlayer(transfer.player, previous.origin, year))) return career;
  const owner = transfer.kind === 'permanent' ? transfer.to : null;
  const status = transfer.kind === 'permanent' ? 'owned' : transfer.kind === 'release' ? 'released' : 'retired';
  if (previous && (previous.owner !== transfer.from || previous.status === 'retired'
    || (previous.status === 'released' && transfer.kind !== 'permanent'))) return career;
  if (!previous && transfer.from === null) return career;
  const key = previous?.key ?? worldRosterKey(career, transfer.from!, { ...transfer.player, position }, transfer.since);
  if (!key) return career;
  const origin = previous?.origin ?? { club: transfer.from!, name: transfer.player.name, position,
    birthYear: year - transfer.player.age, since: transfer.since ?? null };
  const record: WorldRosterRecord = { key, origin: structuredClone(origin), owner, status, year,
    player: { ...structuredClone(transfer.player), worldRosterKey: key } };
  const records = (held?.records ?? []).filter(item => item.key !== key).map(item => structuredClone(item));
  records.push(record);
  const squad = owner === career.clubName
    ? career.squad.map(player => player.id === transfer.player.id && samePlayer(player, origin, year)
      ? { ...structuredClone(player), worldRosterKey: key } : player)
    : career.squad;
  return { ...career, squad, worldRoster: { version: 1, eraId: career.eraId ?? 'now', records } };
}

/** Update established permanent identities from the actual departing squad, without backfilling unknown origins. */
export function snapshotWorldRosterClub(career: CareerState, club: string, players: readonly WorldRosterPlayer[] = career.squad): WorldRosterCareer {
  const held = readWorldRoster(career);
  const year = yearOf(career);
  if (!held || year === null || !text(club)) return career;
  const updates = new Map<string, WorldRosterPlayer>();
  for (const player of players) {
    if (!validPlayer(player) || player.onLoan === true) continue;
    const matches = held.records.filter(record => record.owner === club && record.status === 'owned'
      && samePlayer(player, record.origin, year) && (player.worldRosterKey ? player.worldRosterKey === record.key : player.id === record.player.id));
    if (!matches.length) continue;
    if (matches.length !== 1 || updates.has(matches[0].key)) return career;
    updates.set(matches[0].key, { ...structuredClone(player), worldRosterKey: matches[0].key });
  }
  if (![...updates].some(([key, player]) => {
    const old = held.records.find(record => record.key === key)!;
    return old.year !== year || !samePayload(old.player, player);
  })) return career;
  return { ...career, worldRoster: { ...held, records: held.records.map(record => updates.has(record.key)
    ? { ...structuredClone(record), year, player: updates.get(record.key)! } : structuredClone(record)) } };
}

/** Older records retain ownership, but their old payloads are not presented as current-year players. */
export function worldRosterClub(career: CareerState, club: string, fallback: readonly WorldRosterPlayer[], year = yearOf(career)): readonly WorldRosterPlayer[] {
  const held = readWorldRoster(career);
  if (!held || year === null || year !== yearOf(career) || !text(club)) return fallback;
  const records = held.records;
  if (!records.length) return fallback;
  let changed = false;
  const out = fallback.filter(player => {
    const record = records.find(item => player.worldRosterKey === item.key || (item.origin.club === club && player.position === item.origin.position && samePlayer(player, item.origin, year)));
    if (record && (record.owner !== club || record.status !== 'owned')) { changed = true; return false; }
    return true;
  }).map(player => {
    const record = records.find(item => item.year === year && item.status === 'owned' && item.owner === club
      && (player.worldRosterKey === item.key || (item.origin.club === club && player.position === item.origin.position && samePlayer(player, item.origin, year))));
    if (!record) return player;
    changed = true;
    return structuredClone(record.player);
  });
  for (const record of records) {
    if (record.year === year && record.status === 'owned' && record.owner === club && !out.some(player => player.worldRosterKey === record.key)) {
      out.push(structuredClone(record.player)); changed = true;
    }
  }
  return changed ? out : fallback;
}

export function worldRosterOwner(career: CareerState, key: string): string | null | undefined {
  return readWorldRoster(career)?.records.find(record => record.key === key)?.owner;
}
