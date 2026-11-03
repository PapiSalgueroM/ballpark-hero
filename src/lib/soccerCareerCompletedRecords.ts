import type { CareerState, LegacyTier } from './soccerCareerEngine';

export const SC_CAREER_RECORDS_KEY = 'soccerCareerRecords:v1';
export type CompletedRecordSummary = Readonly<{ goals: number; trophies: number; ballonDors: number; caps: number }>;
type Profile = readonly [string, string, string, string];
type SavedLegacy = Readonly<{ score: number; tier: LegacyTier; breakdown: readonly Readonly<{ label: string; points: number }>[] }>;
export type CompletedRecordCandidate = CompletedRecordSummary & Readonly<{
  key: string; profile: Profile; firstYear: number | null; lastYear: number | null; legacy: SavedLegacy;
}>;
export type CompletedRecord = CompletedRecordCandidate & Readonly<{ ackSequence: number }>;
type ReadStorage = Pick<Storage, 'getItem'>;
type WriteStorage = Pick<Storage, 'getItem' | 'setItem'>;
export type CompletedRecordsRead =
  | Readonly<{ status: 'known'; records: readonly CompletedRecord[]; nextSequence: number; raw: string | null }>
  | Readonly<{ status: 'blocked'; reason: 'unreadable' | 'unsupported'; raw: string | null }>;
export type RetainResult =
  | Readonly<{ status: 'kept' | 'below-cutoff'; key: string }>
  | Readonly<{ status: 'blocked'; reason: 'source-changed' | 'unsupported-record' | 'unsupported-store' | 'storage-refused' | 'readback-failed' }>;

const MAX_RECORDS = 12, MAX_ROWS = 64, MAX_KEY_BYTES = 32768, MAX_STORE_BYTES = 1048576;
const CANDIDATE_KEYS = ['key', 'profile', 'firstYear', 'lastYear', 'legacy', 'goals', 'trophies', 'ballonDors', 'caps'];
const SUMMARY_KEYS = ['goals', 'trophies', 'ballonDors', 'caps'];
const TIERS = ['GOAT', 'LEGEND', 'GREAT', 'SOLID PRO', 'JOURNEYMAN'];
const object = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const own = (value: object, key: PropertyKey) => Object.prototype.hasOwnProperty.call(value, key);
const exact = (value: object, keys: readonly string[]) => Reflect.ownKeys(value).length === keys.length && keys.every(key => own(value, key));
const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const text = (value: unknown, limit = 128): value is string => typeof value === 'string' && value.length <= limit;
const bytes = (value: string) => new TextEncoder().encode(value).length;
function dense(value: unknown, limit: number): value is unknown[] {
  if (!Array.isArray(value) || value.length > limit || Reflect.ownKeys(value).length !== value.length + 1) return false;
  for (let i = 0; i < value.length; i++) if (!own(value, i)) return false;
  return true;
}
function validRow(value: unknown): value is unknown[] {
  if (!dense(value, 25) || value.length !== 25) return false;
  if (![0, 3, 4, 5, 6, 7, 8, 9, 10, 19, 20, 21, 22].every(i => finite(value[i]))) return false;
  if (![1, 2].every(i => text(value[i]))) return false;
  if (![11, 12, 13, 14, 15, 17].every(i => typeof value[i] === 'boolean')) return false;
  return (value[16] === null || text(value[16]))
    && (value[18] === null || finite(value[18]))
    && [23, 24].every(i => value[i] === null || text(value[i]));
}
function keyParts(key: unknown): { profile: Profile; firstYear: number | null; lastYear: number | null } | null {
  if (typeof key !== 'string' || key.length > MAX_KEY_BYTES || bytes(key) > MAX_KEY_BYTES) return null;
  let parsed: unknown;
  try { parsed = JSON.parse(key); } catch { return null; }
  if (!dense(parsed, 3) || parsed.length !== 3 || parsed[0] !== 1) return null;
  const profile = parsed[1], rows = parsed[2];
  if (!dense(profile, 4) || profile.length !== 4 || !profile.every(value => text(value))) return null;
  if (!dense(rows, MAX_ROWS) || !rows.every(validRow) || JSON.stringify(parsed) !== key) return null;
  return { profile: profile as unknown as Profile,
    firstYear: rows.length ? rows[0][0] as number : null,
    lastYear: rows.length ? rows[rows.length - 1][0] as number : null };
}
function validLegacy(value: unknown): value is SavedLegacy {
  return object(value) && exact(value, ['score', 'tier', 'breakdown'])
    && finite(value.score) && value.score >= 0 && value.score <= 100
    && TIERS.some(tier => tier === value.tier)
    && dense(value.breakdown, 64) && value.breakdown.every(row => object(row)
      && exact(row, ['label', 'points']) && text(row.label, 256) && finite(row.points));
}
function validSummary(value: unknown): value is CompletedRecordSummary {
  return object(value) && exact(value, SUMMARY_KEYS) && SUMMARY_KEYS.every(key => {
    const n = value[key]; return finite(n) && n >= 0;
  });
}
function validCandidate(value: unknown, stored = false): value is CompletedRecordCandidate {
  if (!object(value) || !exact(value, stored ? [...CANDIDATE_KEYS, 'ackSequence'] : CANDIDATE_KEYS)) return false;
  const parts = keyParts(value.key);
  if (!parts || !dense(value.profile, 4) || !value.profile.every(v => text(v))
    || JSON.stringify(value.profile) !== JSON.stringify(parts.profile)) return false;
  if (value.firstYear !== parts.firstYear || value.lastYear !== parts.lastYear || !validLegacy(value.legacy)) return false;
  if (!SUMMARY_KEYS.every(key => { const n = value[key]; return finite(n) && n >= 0; })) return false;
  return !stored || (Number.isSafeInteger(value.ackSequence) && (value.ackSequence as number) > 0);
}
function validRecord(value: unknown): value is CompletedRecord { return validCandidate(value, true); }
function cloneCandidate(value: CompletedRecordCandidate): CompletedRecordCandidate {
  return {
    key: value.key, profile: [...value.profile] as [string, string, string, string],
    firstYear: value.firstYear, lastYear: value.lastYear,
    legacy: { score: value.legacy.score, tier: value.legacy.tier,
      breakdown: value.legacy.breakdown.map(row => ({ label: row.label, points: row.points })) },
    goals: value.goals, trophies: value.trophies, ballonDors: value.ballonDors, caps: value.caps,
  };
}
const rank = (a: CompletedRecord, b: CompletedRecord) => b.legacy.score - a.legacy.score || b.ackSequence - a.ackSequence;
function sameSnapshot(a: CompletedRecordCandidate, b: CompletedRecordCandidate): boolean {
  const values = (v: CompletedRecordCandidate) => [v.key, v.profile, v.firstYear, v.lastYear,
    v.legacy.score, v.legacy.tier, v.legacy.breakdown.map(row => [row.label, row.points]),
    v.goals, v.trophies, v.ballonDors, v.caps];
  return JSON.stringify(values(a)) === JSON.stringify(values(b));
}

export function completedRecordCandidate(career: CareerState, summary: CompletedRecordSummary): CompletedRecordCandidate | null {
  if (!object(career) || career.retired !== true || career.phase !== 'retired' || !validLegacy(career.legacy) || !validSummary(summary)) return null;
  if (!dense(career.seasons, Number.MAX_SAFE_INTEGER)) return null;
  const rows: unknown[][] = [];
  for (const season of career.seasons) {
    if (!object(season)) return null;
    if (season.type !== 'playing') continue;
    if (rows.length >= MAX_ROWS) return null;
    const row = [season.year, season.club, season.clubCountry, season.clubTier,
      season.apps, season.goals, season.assists, season.cleanSheets, season.yellowCards, season.redCards, season.rating,
      season.leagueTitle, season.domesticCup, season.championsLeague, season.worldCup,
      own(season, 'continentalCup') ? season.continentalCup : false,
      own(season, 'clubCupTitle') ? season.clubCupTitle : null,
      season.ballonDor, season.ballonDorRank, season.intApps, season.intGoals, season.intAssists, season.intRating,
      season.tournament, season.tournamentResult];
    if (!validRow(row)) return null;
    rows.push(row);
  }
  const profile: Profile = [career.playerName, career.nationality, career.position, career.era];
  const candidate = { key: JSON.stringify([1, profile, rows]), profile,
    firstYear: rows.length ? rows[0][0] as number : null,
    lastYear: rows.length ? rows[rows.length - 1][0] as number : null,
    legacy: career.legacy, ...summary };
  return validCandidate(candidate) ? cloneCandidate(candidate) : null;
}

export function readCompletedRecords(storage: ReadStorage): CompletedRecordsRead {
  let raw: string | null;
  try { raw = storage.getItem(SC_CAREER_RECORDS_KEY); }
  catch { return { status: 'blocked', reason: 'unreadable', raw: null }; }
  if (raw === null) return { status: 'known', records: [], nextSequence: 1, raw };
  const blocked: CompletedRecordsRead = { status: 'blocked', reason: 'unsupported', raw };
  if (typeof raw !== 'string' || raw.length > MAX_STORE_BYTES || bytes(raw) > MAX_STORE_BYTES) return blocked;
  let value: unknown;
  try { value = JSON.parse(raw); } catch { return blocked; }
  if (!object(value) || !exact(value, ['version', 'nextSequence', 'records']) || value.version !== 1
    || !Number.isSafeInteger(value.nextSequence) || (value.nextSequence as number) <= 0
    || !dense(value.records, MAX_RECORDS) || !value.records.every(validRecord)) return blocked;
  const records = value.records;
  if (new Set(records.map(row => row.key)).size !== records.length
    || new Set(records.map(row => row.ackSequence)).size !== records.length
    || records.some(row => row.ackSequence >= (value.nextSequence as number))) return blocked;
  return { status: 'known', raw, nextSequence: value.nextSequence as number,
    records: records.map(row => ({ ...cloneCandidate(row), ackSequence: row.ackSequence })).sort(rank) };
}

export function recordRetentionStatus(candidate: CompletedRecordCandidate, freshRead: CompletedRecordsRead): 'kept' | 'below-cutoff' | null {
  if (!validCandidate(candidate) || freshRead.status !== 'known') return null;
  const same = freshRead.records.find(row => row.key === candidate.key);
  if (same) return sameSnapshot(candidate, same) ? 'kept' : null;
  return freshRead.records.length === MAX_RECORDS
    && freshRead.records.every(row => row.legacy.score > candidate.legacy.score) ? 'below-cutoff' : null;
}

export function retainCompletedRecord(
  candidate: CompletedRecordCandidate,
  storage: WriteStorage,
  sourceIsCurrent: () => boolean,
): RetainResult {
  const current = () => { try { return sourceIsCurrent() === true; } catch { return false; } };
  if (!current()) return { status: 'blocked', reason: 'source-changed' };
  if (!validCandidate(candidate)) return { status: 'blocked', reason: 'unsupported-record' };
  const fresh = readCompletedRecords(storage);
  if (fresh.status === 'blocked') return { status: 'blocked', reason: fresh.reason === 'unreadable' ? 'storage-refused' : 'unsupported-store' };
  const existing = recordRetentionStatus(candidate, fresh);
  if (existing) return current() ? { status: existing, key: candidate.key } : { status: 'blocked', reason: 'source-changed' };
  if (fresh.nextSequence >= Number.MAX_SAFE_INTEGER) return { status: 'blocked', reason: 'unsupported-store' };
  const record: CompletedRecord = { ...cloneCandidate(candidate), ackSequence: fresh.nextSequence };
  const records = [...fresh.records.filter(row => row.key !== candidate.key), record].sort(rank).slice(0, MAX_RECORDS);
  const raw = JSON.stringify({ version: 1, nextSequence: fresh.nextSequence + 1, records });
  if (bytes(raw) > MAX_STORE_BYTES) return { status: 'blocked', reason: 'unsupported-record' };
  if (!current()) return { status: 'blocked', reason: 'source-changed' };
  try { storage.setItem(SC_CAREER_RECORDS_KEY, raw); }
  catch { return { status: 'blocked', reason: 'storage-refused' }; }
  try {
    if (storage.getItem(SC_CAREER_RECORDS_KEY) !== raw) return { status: 'blocked', reason: 'readback-failed' };
  } catch { return { status: 'blocked', reason: 'readback-failed' }; }
  return current() ? { status: 'kept', key: candidate.key } : { status: 'blocked', reason: 'source-changed' };
}
