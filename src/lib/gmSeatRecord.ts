/* Round 1550: the career record, the optional save block every manager seat keeps (Round 941), lifted out of
   gmSeat.ts word for word so a board can read a record (the Career box on its hub) without loading the market,
   the job feed and the offers engine behind it. gmSeat.ts re-exports every name here, so no caller changed.
   Nothing here draws, reads a league or writes: a record in, a record or a number out. */

import type { FoGradeResult } from './foOwnerMandate';
import type { ClubTier } from './managerOffers';

/** How a stint ended. 'expired' is a contract that ran out with nobody
    pushing either way. */
export type SeatEnd = 'fired' | 'walked' | 'poached' | 'expired';

export interface SeatStint {
  team: string;
  /** Tier of the team when you took it. */
  tier: ClubTier;
  /** The season you started. */
  from: number;
  /** One grade per finished season, oldest first. Titles are the 'title' grades. */
  grades: FoGradeResult[];
  /** Absent while you still hold the seat. */
  ended?: SeatEnd;
}

export interface GmCareer {
  version: 1;
  /** Every seat you have held, oldest first. Never empty. */
  stints: SeatStint[];
  /** Seasons sat out since the last stint ended. */
  seasonsOut: number;
}

export function newGmCareer(team: string, tier: ClubTier, season: number): GmCareer {
  return { version: 1, stints: [{ team, tier, from: season, grades: [] }], seasonsOut: 0 };
}

export function currentStint(c: GmCareer): SeatStint {
  return c.stints[c.stints.length - 1];
}

export const lastGradeOf = (s: SeatStint): FoGradeResult | null => s.grades.length ? s.grades[s.grades.length - 1] : null;

export function careerTotals(c: GmCareer): { seasons: number; titles: number; overachieved: number; badly: number } {
  const all = c.stints.flatMap(s => s.grades);
  return {
    seasons: all.length,
    titles: all.filter(g => g === 'title').length,
    overachieved: all.filter(g => g === 'overachieved').length,
    badly: all.filter(g => g === 'badly').length,
  };
}

/** Log a finished season's grade on the seat you hold now. */
export function recordSeatSeason(c: GmCareer, grade: FoGradeResult): GmCareer {
  const stints = c.stints.slice();
  const cur = stints[stints.length - 1];
  if (cur.ended) return c;
  stints[stints.length - 1] = { ...cur, grades: [...cur.grades, grade] };
  return { ...c, stints };
}

export function endSeatStint(c: GmCareer, ended: SeatEnd): GmCareer {
  const stints = c.stints.slice();
  const cur = stints[stints.length - 1];
  if (cur.ended) return c;
  stints[stints.length - 1] = { ...cur, ended };
  return { ...c, stints, seasonsOut: 0 };
}

/** A season with no seat. The market only gets colder (managerOffers' idle cut). */
export function sitOutYear(c: GmCareer): GmCareer {
  return { ...c, seasonsOut: c.seasonsOut + 1 };
}

/** Validate a stored career block. Anything malformed returns null so the
    caller resets this block alone and the rest of the save loads as it was. */
export function sanitizeGmCareer(raw: unknown): GmCareer | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (r.version !== 1 || !Array.isArray(r.stints) || r.stints.length === 0) return null;
  if (!Number.isInteger(r.seasonsOut) || (r.seasonsOut as number) < 0) return null;
  const grades = new Set<string>(['title', 'overachieved', 'met', 'missed', 'badly']);
  const ends = new Set<string>(['fired', 'walked', 'poached', 'expired']);
  const stints: SeatStint[] = [];
  for (let i = 0; i < r.stints.length; i++) {
    const s = r.stints[i] as Record<string, unknown> | null;
    if (!s || typeof s !== 'object') return null;
    if (typeof s.team !== 'string' || !s.team) return null;
    if (![1, 2, 3, 4].includes(s.tier as number)) return null;
    if (!Number.isInteger(s.from)) return null;
    if (!Array.isArray(s.grades) || !s.grades.every(g => typeof g === 'string' && grades.has(g))) return null;
    if (s.ended !== undefined && !(typeof s.ended === 'string' && ends.has(s.ended))) return null;
    /* Only the newest stint may still be open. */
    if (s.ended === undefined && i !== r.stints.length - 1) return null;
    stints.push({
      team: s.team, tier: s.tier as ClubTier, from: s.from as number,
      grades: (s.grades as FoGradeResult[]).slice(),
      ...(s.ended !== undefined ? { ended: s.ended as SeatEnd } : {}),
    });
  }
  return { version: 1, stints, seasonsOut: r.seasonsOut as number };
}

