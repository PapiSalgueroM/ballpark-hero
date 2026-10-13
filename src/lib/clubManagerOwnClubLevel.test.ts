import { describe, expect, it, vi } from 'vitest';
import type { CareerState } from '@/lib/clubManager';
import {
  releaseBlock, releasePlayer, startCareer, startNextSeason, worldRosterFor, worldRosterXIAvg, yearsOn,
} from '@/lib/clubManager';
import { projectedXIAvg, type ProjectedPlayer } from '@/lib/clubManagerEras';

/* Release AZ fix pass 3, the lead's ruling of 2026-10-12: the manager's OWN club is never read off the world
   roster. The ledger takes every man who left him off his club's world roster and adds nothing for the boys
   who replaced them, so a seeded career's club sank season by season (74.49 against 79.15 by season three,
   probes azfx-9 and azfx-11), and with it the free agent level rule (simFreeAgents section 18, 50 against a
   floor of 95). His club's level is the base's read, the projection of his club, exactly as before PR224; the
   world roster serves the OTHER clubs only, his old club the moment he leaves it included. */

function withRoll<T>(value: number, action: () => T): T {
  const random = vi.spyOn(Math, 'random').mockReturnValue(value);
  try { return action(); } finally { random.mockRestore(); }
}

/** The same best eleven average the engine takes (top eleven, padded with 60, one decimal). */
function xi(roster: readonly ProjectedPlayer[]): number {
  const top = roster.map(p => p.r).sort((a, b) => b - a).slice(0, 11);
  while (top.length < 11) top.push(60);
  return Math.round(top.reduce((sum, r) => sum + r, 0) / 11 * 10) / 10;
}

/** A new (so seeded) Everton career that has released its six best outfielders this summer. */
function evertonWithoutHisBest(): CareerState {
  let s: CareerState = withRoll(0.6, () => ({ ...startCareer('Everton'), budget: 9999, wageCap: 9999, transferWindow: 'summer' as const }));
  expect(s.worldSeed).toBeDefined();
  const best = [...s.squad].filter(p => p.position !== 'GK' && !p.isYouth).sort((a, b) => b.rating - a.rating);
  let released = 0;
  for (const p of best) {
    if (released === 6) break;
    if (releaseBlock(s, p) !== null) continue;
    const next = releasePlayer(s, p.id);
    if (!next) continue;
    s = next; released += 1;
  }
  expect(released).toBe(6);
  return s;
}

describe("the manager's own club is read from his club, never the world roster", () => {
  it('his club screen average is the base read in season one, however many men he released', () => {
    const s = evertonWithoutHisBest();
    const base = projectedXIAvg('Everton', yearsOn(s), s.eraId)!;
    /* The ledger really took them off: read off the world roster his club would be far weaker. */
    expect(base - xi(worldRosterFor(s, 'Everton'))).toBeGreaterThan(1);
    expect(worldRosterXIAvg(s, 'Everton')).toBe(base);
  });

  it('his club strength at the summer rollover is the base read, so the free agent level and the board see it', () => {
    const s = evertonWithoutHisBest();
    const next = withRoll(0.6, () => startNextSeason(s));
    expect(next.clubName).toBe('Everton');
    const base = projectedXIAvg('Everton', yearsOn(next), next.eraId)!;
    expect(base - xi(worldRosterFor(next, 'Everton'))).toBeGreaterThan(1);
    /* Every draw is 0.6 here, so the strength jitter ri(-2, 2) is exactly +1. */
    expect(next.clubStrengths.Everton).toBeCloseTo(base + 1, 6);
    expect(worldRosterXIAvg(next, 'Everton')).toBe(base);
  });

  it('the club he leaves in the summer is another club at once, read off the world roster', () => {
    const s = evertonWithoutHisBest();
    const moved = withRoll(0.6, () => startNextSeason(s, 'Liverpool'));
    expect(moved.clubName).toBe('Liverpool');
    const ledger = xi(worldRosterFor(moved, 'Everton'));
    expect(projectedXIAvg('Everton', yearsOn(moved), moved.eraId)! - ledger).toBeGreaterThan(1);
    expect(moved.clubStrengths.Everton).toBeCloseTo(ledger + 1, 6);
    expect(moved.clubStrengths.Liverpool).toBeCloseTo(projectedXIAvg('Liverpool', yearsOn(moved), moved.eraId)! + 1, 6);
  });

  it('a job taken mid season (the door joinClubNow opens) reads the club he left off the world roster', () => {
    const s = evertonWithoutHisBest();
    const fresh = withRoll(0.6, () => startCareer('Liverpool', s.eraId, undefined, s.manager, {
      yearsOn: yearsOn(s), uclField: s.uclField ?? null, keepLeagueOverrides: true, rosterCareer: s, worldSeed: s.worldSeed,
    }));
    expect(fresh.clubName).toBe('Liverpool');
    const ledger = xi(worldRosterFor(fresh, 'Everton'));
    expect(projectedXIAvg('Everton', yearsOn(fresh), fresh.eraId)! - ledger).toBeGreaterThan(1);
    expect(fresh.clubStrengths.Everton).toBeCloseTo(ledger + 1, 6);
  });
});
