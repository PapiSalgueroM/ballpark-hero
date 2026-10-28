import { marketForScreen, worldSeedOf, worldYear, type CareerState, type MarketPlayer } from '@/lib/clubManager';
import { eraById } from '@/lib/clubManagerEras';
import { ALL_POSITIONS } from '@/lib/positionFit';

export const RECRUITMENT_LIMIT = 12;
export interface RecruitmentTarget {
  name: string;
  club: string;
  position: MarketPlayer['position'];
  cohort: number;
  worldRosterKey?: string;
}
export interface Recruitment {
  version: 1;
  clubName: string;
  eraId: string;
  startYear: number;
  worldSeed: number | null;
  targets: RecruitmentTarget[];
}
export type RecruitmentCareer = CareerState & { recruitment?: Recruitment };
export type RecruitmentCommit = (make: (current: CareerState) => CareerState | null) => boolean;
export interface RecruitmentPick { career: CareerState; player: MarketPlayer }

export function recruitmentContext(career: CareerState) {
  return {
    clubName: career.clubName, eraId: eraById(career.eraId).id,
    startYear: worldYear(career) - Math.max(0, career.season - 1), worldSeed: worldSeedOf(career) ?? null,
  };
}
const word = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;
function validTarget(value: unknown): value is RecruitmentTarget {
  if (!value || typeof value !== 'object') return false;
  const t = value as RecruitmentTarget;
  return word(t.name) && word(t.club) && ALL_POSITIONS.includes(t.position) && Number.isInteger(t.cohort)
    && (t.worldRosterKey === undefined || word(t.worldRosterKey));
}
export function recruitmentKey(t: RecruitmentTarget): string {
  return t.worldRosterKey ? JSON.stringify(['key', t.worldRosterKey])
    : JSON.stringify(['legacy', t.name, t.club, t.position, t.cohort]);
}
export function recruitmentOf(career: CareerState): Recruitment | null {
  const r = (career as RecruitmentCareer).recruitment;
  if (!r || typeof r !== 'object' || r.version !== 1 || !Array.isArray(r.targets)
    || r.targets.length > RECRUITMENT_LIMIT || !r.targets.every(validTarget)) return null;
  const context = recruitmentContext(career);
  if (r.clubName !== context.clubName || r.eraId !== context.eraId || r.startYear !== context.startYear
    || r.worldSeed !== context.worldSeed || new Set(r.targets.map(recruitmentKey)).size !== r.targets.length) return null;
  return r;
}
export function recruitmentTarget(career: CareerState, p: MarketPlayer): RecruitmentTarget {
  return {
    name: p.name, club: p.club, position: p.position, cohort: worldYear(career) - p.age,
    ...(p.worldRosterKey ? { worldRosterKey: p.worldRosterKey } : {}),
  };
}
export function resolveRecruitmentTarget(career: CareerState, target: RecruitmentTarget, market: readonly MarketPlayer[]): MarketPlayer | null {
  if (!validTarget(target)) return null;
  const found = market.filter(p => target.worldRosterKey
    ? p.worldRosterKey === target.worldRosterKey
    : p.name === target.name && p.club === target.club && p.position === target.position && worldYear(career) - p.age === target.cohort);
  return found.length === 1 ? found[0] : null;
}
export function addRecruitment(career: CareerState, player: MarketPlayer): CareerState | null {
  const market = marketForScreen(career);
  const found = resolveRecruitmentTarget(career, recruitmentTarget(career, player), market);
  if (!found) return null;
  const target = recruitmentTarget(career, found), targets = recruitmentOf(career)?.targets ?? [];
  if (targets.some(t => {
    const p = resolveRecruitmentTarget(career, t, market);
    return p && recruitmentKey(recruitmentTarget(career, p)) === recruitmentKey(target);
  })) return career;
  if (targets.length >= RECRUITMENT_LIMIT) return null;
  return { ...career, recruitment: { version: 1, ...recruitmentContext(career), targets: [...targets, target] } } as RecruitmentCareer;
}
export function removeRecruitment(career: CareerState, target: RecruitmentTarget): CareerState | null {
  if (!validTarget(target)) return null;
  const r = recruitmentOf(career);
  if (!r || !r.targets.some(t => recruitmentKey(t) === recruitmentKey(target))) return null;
  const targets = r.targets.filter(t => recruitmentKey(t) !== recruitmentKey(target));
  const next: RecruitmentCareer = { ...career };
  if (targets.length) next.recruitment = { ...r, targets };
  else delete next.recruitment;
  return next;
}
