import { describe, expect, it, vi } from 'vitest';
import { nrlSeasonPlan } from '@/data/nrlManagerSeasons';
import * as random from '@/lib/careerEngine';
import { nrlBoardBenchmark, nrlBoardTarget } from '@/lib/nrlBoardTarget';
import { createNrlCareer, readNrlCareerSave, reduceNrlCareer } from '@/lib/nrlCareer';
import { createNrlSeason, nrlLadder, nrlRegularRounds, reduceNrlSeason } from '@/lib/nrlManager';

describe('NRL season board target', () => {
  it.each([2026, 2027, 2028])('uses the simulated %i club membership and gives tied ratings equal targets', year => {
    const { clubs } = nrlSeasonPlan(year);
    for (const club of clubs) {
      const benchmark = nrlBoardBenchmark(year, club.id);
      expect(benchmark).not.toBeNull();
      expect([4, 8, 12, clubs.length - 2]).toContain(benchmark!.targetRank);
      for (const peer of clubs.filter(other => other.strength === club.strength)) {
        expect(nrlBoardBenchmark(year, peer.id)).toEqual(benchmark);
      }
    }
    expect(Boolean(nrlBoardBenchmark(year, 'bears'))).toBe(year >= 2027);
    expect(Boolean(nrlBoardBenchmark(year, 'chiefs'))).toBe(year >= 2028);
  });

  it('shows the opening target and waits for the club to play before showing a place', () => {
    const career = createNrlCareer('panthers', 16);
    expect(nrlBoardTarget(career)).toMatchObject({ targetRank: 8, place: null, result: null });
    const bye = reduceNrlCareer(career, { type: 'advance' });
    expect(nrlLadder(bye.season).find(row => row.clubId === 'panthers')?.byes).toBe(1);
    expect(nrlBoardTarget(bye)).toMatchObject({ targetRank: 8, place: null, result: null });
    const played = reduceNrlCareer(bye, { type: 'advance' });
    expect(nrlBoardTarget(played)).toMatchObject({
      targetRank: 8, place: nrlLadder(played.season).findIndex(row => row.clubId === 'panthers') + 1, result: null,
    });
  });

  it('settles the regular-season goal during finals and keeps it fixed through the Grand Final', () => {
    let career = createNrlCareer('storm', 4);
    while (career.season.round <= nrlRegularRounds(career.season.year)) career = reduceNrlCareer(career, { type: 'advance' });
    expect(career.season.phase).toBe('finals');
    const target = nrlBoardTarget(career)!;
    expect(target.place).not.toBeNull();
    expect(target.result).toBe(target.place! <= target.targetRank ? 'met' : 'missed');
    while (career.season.phase !== 'complete') {
      career = reduceNrlCareer(career, { type: 'advance' });
      expect(nrlBoardTarget(career)).toEqual(target);
    }
    expect(career.history[0].rank).toBe(target.place);
    expect(nrlBoardBenchmark(2027, 'panthers', 17)?.targetRank).toBe(8);
    expect(nrlBoardBenchmark(2027, 'panthers')?.targetRank).toBe(4);
  });

  it('reads imported history without writing save data or consuming random draws', () => {
    let original = createNrlSeason('bears', 717, 2027);
    while (original.phase !== 'complete') original = reduceNrlSeason(original, { type: 'advance' });
    const imported = readNrlCareerSave(JSON.stringify(original))!;
    const bytes = JSON.stringify(imported);
    const rng = vi.spyOn(random, 'rngFrom');
    try {
      const current = nrlBoardTarget(imported)!;
      expect(current.place).toBe(imported.history[0].rank);
      expect(current.result).toBe(current.place! <= current.targetRank ? 'met' : 'missed');
      expect(nrlBoardTarget(imported)).toEqual(current);
      expect(rng).not.toHaveBeenCalled();
    } finally {
      rng.mockRestore();
    }
    expect(JSON.stringify(imported)).toBe(bytes);
    const next = reduceNrlCareer(imported, { type: 'startNextSeason' });
    expect(next.season.year).toBe(2028);
    expect(nrlBoardTarget(next)).toMatchObject(nrlBoardBenchmark(2028, 'bears', imported.history[0].rank)!);
    expect(nrlBoardTarget(next)).toMatchObject({ place: null, result: null });
    expect(JSON.stringify(readNrlCareerSave(JSON.stringify(next)))).toBe(JSON.stringify(next));
  });
});
