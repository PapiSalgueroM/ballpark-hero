import { marketForScreen, worldSeedOf, worldYear, type CareerState, type MarketPlayer } from '@/lib/clubManager';
import { eraById } from '@/lib/clubManagerEras';
import { ALL_POSITIONS } from '@/lib/positionFit';
import { askingTerms } from '@/lib/clubManagerDeals';

export const RECRUITMENT_LIMIT = 12;
export const BRIEF_JOBS = {
  starter: 'First-team challenger',
  cover: 'Affordable cover',
  successor: 'Under-21 successor',
} as const;
export interface RecruitmentBrief {
  position: MarketPlayer['position'];
  job: keyof typeof BRIEF_JOBS;
  budgetShare: 25 | 50 | 100;
}
export interface RecruitmentTarget {
  name: string;
  club: string;
  position: MarketPlayer['position'];
  cohort: number;
  worldRosterKey?: string;
  fromBrief?: RecruitmentBrief;
}
export interface Recruitment {
  version: 1;
  clubName: string;
  eraId: string;
  startYear: number;
  worldSeed: number | null;
  targets: RecruitmentTarget[];
  brief?: RecruitmentBrief;
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
export function validBrief(value: unknown): value is RecruitmentBrief {
  if (!value || typeof value !== 'object') return false;
  const b = value as RecruitmentBrief;
  return ALL_POSITIONS.includes(b.position) && typeof b.job === 'string' && Object.prototype.hasOwnProperty.call(BRIEF_JOBS, b.job)
    && [25, 50, 100].includes(b.budgetShare);
}
export function saveRecruitmentBrief(career: CareerState, brief: RecruitmentBrief): CareerState | null {
  if (!validBrief(brief)) return null;
  const saved = recruitmentOf(career) ?? { version: 1, ...recruitmentContext(career), targets: [] };
  return { ...career, recruitment: { ...saved, brief: { ...brief } } } as RecruitmentCareer;
}
export function reportTerms(player: MarketPlayer) {
  const terms = askingTerms(player);
  const upfront = Math.round((player.price + terms.bonus) * 100) / 100;
  return { ...terms, upfront, total: upfront + terms.years * 52 * terms.wage / 1000 };
}
export function scoutBrief(career: CareerState, market: readonly MarketPlayer[], brief: RecruitmentBrief) {
  const squad = career.squad.filter(p => p.position === brief.position).sort((a, b) => b.rating - a.rating);
  const comparison = brief.job === 'cover' ? squad[1] ?? squad[0] : squad[0];
  const limit = career.budget * brief.budgetShare / 100;
  const eligible = market.filter(p => p.position === brief.position && !p.joinedThisSeason)
    .map(player => ({ player, terms: reportTerms(player) }))
    .filter(({ player, terms }) => terms.upfront <= limit
      && (brief.job !== 'successor' || player.age < 21)
      && (brief.job !== 'cover' || (terms.role === 'backup' || terms.role === 'prospect' || terms.role === 'rotation')));
  const gap = (rating: number) => Math.max(0, (comparison?.rating ?? 0) - rating);
  eligible.sort((a, b) => {
    if (brief.job === 'cover') {
      const byCover = gap(a.player.rating) - gap(b.player.rating) || a.terms.total - b.terms.total;
      if (byCover) return byCover;
    }
    return b.player.rating - a.player.rating
      || (brief.job === 'successor' ? a.player.age - b.player.age : 0)
      || a.terms.total - b.terms.total || a.player.name.localeCompare(b.player.name) || a.player.club.localeCompare(b.player.club);
  });
  const reports: typeof eligible = [];
  for (const report of eligible) {
    if (resolveRecruitmentTarget(career, recruitmentTarget(career, report.player), market)) reports.push(report);
    if (reports.length === 3) break;
  }
  return { comparison, reports };
}
export function addRecruitment(career: CareerState, player: MarketPlayer, fromBrief?: RecruitmentBrief): CareerState | null {
  const market = marketForScreen(career);
  const found = resolveRecruitmentTarget(career, recruitmentTarget(career, player), market);
  if (!found) return null;
  const saved = recruitmentOf(career);
  const target = recruitmentTarget(career, found), targets = saved?.targets ?? [];
  if (fromBrief) {
    if (!validBrief(fromBrief) || !validBrief(saved?.brief)
      || fromBrief.position !== saved.brief.position || fromBrief.job !== saved.brief.job || fromBrief.budgetShare !== saved.brief.budgetShare
      || !scoutBrief(career, market, fromBrief).reports.some(r => r.player === found)) return null;
    target.fromBrief = { ...fromBrief };
  }
  if (targets.some(t => {
    const p = resolveRecruitmentTarget(career, t, market);
    return p && recruitmentKey(recruitmentTarget(career, p)) === recruitmentKey(target);
  })) return career;
  if (targets.length >= RECRUITMENT_LIMIT) return null;
  return { ...career, recruitment: { version: 1, ...recruitmentContext(career), ...saved, targets: [...targets, target] } } as RecruitmentCareer;
}
export function removeRecruitment(career: CareerState, target: RecruitmentTarget): CareerState | null {
  if (!validTarget(target)) return null;
  const r = recruitmentOf(career);
  if (!r || !r.targets.some(t => recruitmentKey(t) === recruitmentKey(target))) return null;
  const targets = r.targets.filter(t => recruitmentKey(t) !== recruitmentKey(target));
  const next: RecruitmentCareer = { ...career };
  if (targets.length || validBrief(r.brief)) next.recruitment = { ...r, targets };
  else delete next.recruitment;
  return next;
}
