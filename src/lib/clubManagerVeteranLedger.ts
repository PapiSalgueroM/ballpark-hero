import type { CareerState, CMPlayer } from '@/lib/clubManager';

export type VeteranIdentity = readonly [era: string, name: string, birthYear: number];
export interface VeteranReview {
  identity: VeteranIdentity;
  club: string;
  season: number;
  decision: 'agreed' | 'declined';
}
export interface VeteranReviewLedger { v: 1; reviews: readonly VeteranReview[] }

function record(value: unknown, keys: readonly string[]): value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Object.getPrototypeOf(value) !== Object.prototype) return false;
  const descriptors = Object.getOwnPropertyDescriptors(value);
  return Reflect.ownKeys(descriptors).length === keys.length && keys.every(key =>
    Object.prototype.hasOwnProperty.call(descriptors, key) && 'value' in descriptors[key] && descriptors[key].enumerable);
}
function list(value: unknown): value is unknown[] {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype) return false;
  const descriptors = Object.getOwnPropertyDescriptors(value);
  if (Reflect.ownKeys(descriptors).length !== value.length + 1) return false;
  for (let i = 0; i < value.length; i++) {
    const entry = descriptors[String(i)];
    if (!entry || !('value' in entry) || !entry.enumerable) return false;
  }
  return true;
}
const text = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;
const integer = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value);

export function sameVeteranIdentity(a: VeteranIdentity, b: VeteranIdentity): boolean {
  return a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
}

/** Unknown bodies stay stored and grant no retirement override. */
export function readVeteranReviews(value: unknown): VeteranReviewLedger | null {
  try {
    if (!record(value, ['v', 'reviews']) || value.v !== 1 || !list(value.reviews)) return null;
    const attempts = new Set<string>(), agreed = new Set<string>();
    for (const row of value.reviews) {
      if (!record(row, ['identity', 'club', 'season', 'decision']) || !list(row.identity)
        || row.identity.length !== 3 || !text(row.identity[0]) || !text(row.identity[1])
        || !integer(row.identity[2]) || !text(row.club) || !integer(row.season) || row.season < 1
        || (row.decision !== 'agreed' && row.decision !== 'declined')) return null;
      const key = JSON.stringify(row.identity), attempt = JSON.stringify([row.identity, row.season]);
      if (attempts.has(attempt) || agreed.has(key)) return null;
      attempts.add(attempt);
      if (row.decision === 'agreed') agreed.add(key);
    }
    return value as unknown as VeteranReviewLedger;
  } catch {
    return null;
  }
}

/** Saved era/name/birth year is a conservative career-local identity, not a global player ID. */
export function veteranIdentity(career: CareerState, player: CMPlayer, year: number): VeteranIdentity | null {
  if (!text(career.eraId) || !text(player.name) || !integer(year) || !integer(player.age)) return null;
  const birthYear = year - player.age;
  return integer(birthYear) ? [career.eraId, player.name, birthYear] : null;
}

export function veteranReviewOpen(career: CareerState): boolean {
  const review = career.pendingSummary;
  return !career.live && !career.sacked && !career.retired && !!review
    && review.season === career.season && review.club === career.clubName
    && career.week === career.calendar.length;
}

/** Only the current owned, unambiguous cohort can use this summer's agreement. */
export function protectedVeteranIds(career: CareerState, year: number, moving: boolean): ReadonlySet<string> {
  const kept = new Set<string>();
  if (moving || !veteranReviewOpen(career)) return kept;
  const ledger = readVeteranReviews(career.veteranReviews);
  if (!ledger) return kept;
  const cohort = career.squad.map(player => ({ player, identity: veteranIdentity(career, player, year) }));
  for (const { player, identity } of cohort) {
    if (!identity || player.onLoan || player.age < 31 || player.age > 41
      || career.retiredNames?.includes(player.name)
      || cohort.filter(row => row.player.id === player.id).length !== 1
      || career.loanedOut?.some(row => row.player.id === player.id)
      || cohort.filter(row => row.identity && sameVeteranIdentity(row.identity, identity)).length !== 1) continue;
    if (ledger.reviews.some(row => row.decision === 'agreed' && row.club === career.clubName
      && row.season === career.season && sameVeteranIdentity(row.identity, identity))) kept.add(player.id);
  }
  return kept;
}
