import { describe, expect, it, vi } from 'vitest';
import type { CareerState } from '@/lib/clubManager';
import {
  buildMarket, releaseBlock, releasePlayer, startCareer, startNextSeason, worldRosterFor, worldRosterXIAvg, yearsOn,
} from '@/lib/clubManager';
import {
  ensureEraRosters, eraRosters, projectedClubRoster, projectedClubXIAvg, projectedRoster, projectedXIAvg, type ProjectedPlayer,
} from '@/lib/clubManagerEras';

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

/** The same best eleven average the engine takes (the eleven highest ratings, padded with 60, one decimal). */
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

  it('his club strength at the summer rollover is the base read, so the free agent level rule reads the base', () => {
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

  it('the one club read is the world read, club for club, in today and in a past era, cold and cached', async () => {
    await ensureEraRosters('era2010');
    for (const [eraId, years] of [['now', 9], ['era2010', 4]] as const) {
      const clubs = Object.keys(eraRosters(eraId));
      expect(clubs.length).toBeGreaterThan(40);
      /* Cold: no world of this era and year has been built yet, so each club is projected alone first. */
      const alone = clubs.map(club => projectedClubRoster(club, years, eraId));
      clubs.forEach((club, i) => expect(alone[i]).toEqual(projectedRoster(club, years, eraId)));
      /* Cached: once the world is built the one club read is the world's own list. */
      for (const club of clubs) expect(projectedClubRoster(club, years, eraId)).toBe(projectedRoster(club, years, eraId));
      for (const club of clubs) expect(projectedClubXIAvg(club, years, eraId)).toBe(projectedXIAvg(club, years, eraId));
    }
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

  it('the club he joins mid season is his from that day, read as the base, though the career handed over names the old one', () => {
    /* Season two, so the seeded world and the base differ for Liverpool too (season one is the bake for both). */
    const first = evertonWithoutHisBest();
    const s = withRoll(0.6, () => startNextSeason(first));
    expect(s.clubName).toBe('Everton');
    expect(yearsOn(s)).toBe(1);
    const fresh = withRoll(0.6, () => startCareer('Liverpool', s.eraId, undefined, s.manager, {
      yearsOn: yearsOn(s), uclField: s.uclField ?? null, keepLeagueOverrides: true, rosterCareer: s, worldSeed: s.worldSeed,
    }));
    expect(fresh.clubName).toBe('Liverpool');
    const base = projectedXIAvg('Liverpool', yearsOn(fresh), fresh.eraId)!;
    expect(xi(worldRosterFor(fresh, 'Liverpool'))).not.toBe(base);
    expect(fresh.clubStrengths.Liverpool).toBeCloseTo(base + 1, 6);
    expect(worldRosterXIAvg(fresh, 'Liverpool')).toBe(base);
  });

  it("in a seeded career the market lists nobody at his own club, ledger or none, and the club he leaves is listed at once", () => {
    /* Release AZ fix pass 4: his club is his squad, and the market drops every man of his squad, so what the world
       roster put at his club were men who are not his. Real Madrid's bake holds more men than the 26 a squad starts with. */
    const s: CareerState = withRoll(0.6, () => ({ ...startCareer('Real Madrid'), budget: 9999, wageCap: 9999, transferWindow: 'summer' as const }));
    expect(s.worldSeed).toBeDefined();
    /* Round 1344: a new career now carries its opening window's deals between other clubs in its ledger (the post
       seed flush), so the case with no ledger, and the career from before the release, take it off first. */
    const none: CareerState = { ...s };
    delete none.worldRoster;
    expect(buildMarket(none).some(m => m.club === 'Real Madrid')).toBe(false);
    const old: CareerState = { ...none };
    delete old.worldSeed;
    /* A career from before the release lists them, on sale from his own club, exactly as it always did (ruling Y1). */
    const oldMine = buildMarket(old).filter(m => m.club === 'Real Madrid');
    expect(oldMine.length).toBeGreaterThan(0);
    expect(oldMine.some(m => s.squad.some(p => p.name === m.name))).toBe(false);
    expect(buildMarket(s).some(m => m.club === 'Real Madrid')).toBe(false);
    expect(buildMarket(s).some(m => m.club === 'Barcelona')).toBe(true);
    const man = [...s.squad].filter(p => p.position !== 'GK' && !p.isYouth).find(p => releaseBlock(s, p) === null)!;
    const rel = releasePlayer(s, man.id)!;
    expect(rel.worldRoster).toBeDefined();
    expect(buildMarket(rel).some(m => m.club === 'Real Madrid')).toBe(false);
    const next = withRoll(0.6, () => startNextSeason(rel));
    expect(next.clubName).toBe('Real Madrid');
    expect(next.worldRoster).toBeDefined();
    expect(buildMarket(next).some(m => m.club === 'Real Madrid')).toBe(false);
    const moved = withRoll(0.6, () => startNextSeason(rel, 'Barcelona'));
    expect(moved.clubName).toBe('Barcelona');
    expect(buildMarket(moved).some(m => m.club === 'Real Madrid')).toBe(true);
    expect(buildMarket(moved).some(m => m.club === 'Barcelona')).toBe(false);
  });
});
