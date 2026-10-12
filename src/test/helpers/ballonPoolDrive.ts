/**
 * Round 1318: one seeded Soccer Career driven to a Ballon d'Or night that holds
 * a saved pool of generated rivals (Rounds 1280 to 1282), and on to the next
 * night, for the tests that read a broken pool as absent and the one that
 * replaces a rival whose name is taken.
 *
 * The drive is scripts/lib/careerStep.mjs, the passive player every Soccer
 * Career fleet here uses. Math.random is a counted mulberry32 for the whole
 * drive and is put back in a finally, so a test can compare draws as well as
 * states. CORRUPTIONS are the 27 malformed pools the other lane declared in
 * src/test/soccerCareerAwardGenerations.test.tsx (its corrupt()), case for case.
 */
import * as E from '@/lib/soccerCareerEngine';
import { careerStep } from '../../../scripts/lib/careerStep.mjs';

export type Saved = Record<string, any>;
export const copy = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

/** Run fn with Math.random seeded and counted; the real generator comes back whatever happens. */
export function counted<T>(seed: number, fn: () => T): { value: T; draws: number } {
  const real = Math.random;
  let s = seed | 0, draws = 0;
  Math.random = () => {
    draws += 1;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  try { return { value: fn(), draws }; } finally { Math.random = real; }
}

const STATS = { pace: 70, shooting: 70, passing: 70, dribbling: 70, defending: 70, physical: 70, reflexes: 70 };

/** Step until a Ballon d'Or night after `fromYear` is pending and `ready` holds; throws if none comes. */
export function toNight(start: Saved, fromYear: number, ready: (s: Saved) => boolean = () => true): Saved {
  let s = start;
  for (let i = 0; i < 400; i++) {
    s = careerStep(E, s, E.FALLBACK_CLUBS);
    if (s.retired) break;
    if (s.phase === 'ballon_dor' && s.pendingBallonDor && s.seasons.at(-1).year > fromYear && ready(s)) return s;
  }
  throw new Error(`no Ballon d'Or night after ${fromYear} was reached`);
}

/** A 2025 start played to its first night with a saved pool (and, when asked, a rival). */
export function poolNight(seed: number, needRival = false): Saved {
  return counted(seed, () => {
    const start = E.initCareer('Pool Tester', 'England', 'ST', '2025', STATS, 70, 2025, E.FALLBACK_CLUBS, null, 88);
    return copy(toNight(start, 0, s => !!s.generatedBallonPool && (!needRival || !!s.rival)));
  }).value;
}

/** The next night from a saved night, under a seeded generator: the state it reaches and the draws it took. */
export function nextNight(saved: Saved, seed: number): { value: Saved; draws: number } {
  return counted(seed, () => copy(toNight(copy(saved), saved.seasons.at(-1).year)));
}

export const CORRUPTIONS = ['null', 'unknown-version', 'missing-entries', 'empty-entries', 'fraction-year', 'future-year',
  'string-year', 'wrong-next-id', 'noncontiguous-id', 'invalid-role', 'negative-slot', 'over-slot', 'fraction-seed',
  'future-first-year', 'young-entry-age', 'old-entry-age', 'empty-name', 'empty-nationality', 'empty-club',
  'invalid-position', 'wrong-tuple', 'huge-tuple', 'string-tuple', 'short-tuple', 'wrong-retirement-year',
  'duplicate-name', 'duplicate-active-slot'] as const;

export function corrupt(value: Saved, id: (typeof CORRUPTIONS)[number]): Saved {
  const s = copy(value), p = s.generatedBallonPool, e = p.entries[0];
  switch (id) {
    case 'null': s.generatedBallonPool = null; break;
    case 'unknown-version': p.version = 2; break;
    case 'missing-entries': delete p.entries; break;
    case 'empty-entries': p.entries = []; p.nextId = 0; break;
    case 'fraction-year': p.year += .5; break;
    case 'future-year': p.year = s.seasons.at(-1).year + 1; break;
    case 'string-year': p.year = String(p.year); break;
    case 'wrong-next-id': p.nextId++; break;
    case 'noncontiguous-id': e.id = 100; break;
    case 'invalid-role': e.role = 'other'; break;
    case 'negative-slot': e.slot = -1; break;
    case 'over-slot': e.slot = 20; break;
    case 'fraction-seed': e.seed += .5; break;
    case 'future-first-year': e.firstYear = p.year + 1; break;
    case 'young-entry-age': e.entryAge = 18; break;
    case 'old-entry-age': e.entryAge = 29; break;
    case 'empty-name': e.name = ' '; break;
    case 'empty-nationality': e.nationality = ' '; break;
    case 'empty-club': e.club = ' '; break;
    case 'invalid-position': e.position = 'GK'; break;
    case 'wrong-tuple': e.baseGoals[0]++; break;
    case 'huge-tuple': e.baseGoals = [Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER]; break;
    case 'string-tuple': e.baseGoals = ['18', '40']; break;
    case 'short-tuple': e.baseGoals = [18]; break;
    case 'wrong-retirement-year': e.retiredYear = e.firstYear; break;
    case 'duplicate-name': p.entries[1].name = e.name; break;
    case 'duplicate-active-slot': p.entries[1].role = e.role; p.entries[1].slot = e.slot; break;
  }
  return s;
}
