import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { finishSeason, loadCareer, saveCareer, SAVE_KEY, startCareer, startNextSeason } from '@/lib/clubManager';
import { ensureEraRosters } from '@/lib/clubManagerEras';
import { saveFence } from '@/lib/saveFence';

describe('Club Manager 2025 Club World Cup', () => {
  beforeAll(async () => { await ensureEraRosters('era2020'); });
  beforeEach(() => { saveFence.release(SAVE_KEY); localStorage.clear(); });
  afterEach(() => { vi.restoreAllMocks(); saveFence.release(SAVE_KEY); });

  it('keeps a verified entrant’s simulated group and bracket through season review, save and club change', () => {
    const before = startCareer('Chelsea', 'era2020');
    const ready = { ...before, season: 5, week: before.calendar.length, worldSeed: 34 };
    const first = finishSeason(ready);
    const cup = first.state.clubWorldCup2025!;
    expect(cup).toMatchObject({ edition: 2025, club: 'Chelsea', group: 'D' });
    expect(cup.table.map(row => row.club).sort()).toEqual(['Chelsea', 'Esperance', 'Flamengo', 'LAFC']);
    expect(cup.matches.filter(match => match.stage === 'Group')).toHaveLength(3);
    expect(cup.matches.every(match => match.home === 'Chelsea' || match.away === 'Chelsea')).toBe(true);
    expect(finishSeason(ready).state.clubWorldCup2025).toEqual(cup);
    expect(first.state.squad).toEqual(ready.squad);
    expect(first.state.week).toBe(ready.week);
    expect(saveCareer(first.state)).toBe(true);
    const loaded = loadCareer()!;
    expect(loaded.clubWorldCup2025).toEqual(cup);
    const moved = startNextSeason(loaded, 'Arsenal');
    expect(moved.clubName).toBe('Arsenal');
    expect(moved.clubWorldCup2025).toEqual(cup);
  });

  it('keeps non-entrants, incomplete seasons and other summers out of the historical event', () => {
    const arsenal = startCareer('Arsenal', 'era2020');
    expect(finishSeason({ ...arsenal, season: 5, week: arsenal.calendar.length }).state.clubWorldCup2025).toBeUndefined();
    const chelsea = startCareer('Chelsea', 'era2020');
    expect(finishSeason({ ...chelsea, season: 5, week: chelsea.calendar.length - 1 }).state.clubWorldCup2025).toBeUndefined();
    expect(finishSeason({ ...chelsea, season: 6, week: chelsea.calendar.length }).state.clubWorldCup2025).toBeUndefined();
  });

  it('adds the historical trophy to the cabinet and review exactly once for a simulated win', () => {
    const chelsea = startCareer('Chelsea', 'era2020');
    const ready = { ...chelsea, season: 5, week: chelsea.calendar.length };
    let winner: ReturnType<typeof finishSeason> | undefined;
    for (let worldSeed = 1; worldSeed <= 60 && !winner; worldSeed++) {
      const finished = finishSeason({ ...ready, worldSeed });
      if (finished.state.clubWorldCup2025?.result === 'Winner') winner = finished;
    }
    expect(winner).toBeDefined();
    const trophy = { name: 'Club World Cup', emoji: '🌐', season: 5, minor: true };
    expect(winner!.state.trophies.filter(t => t.name === trophy.name)).toEqual([trophy]);
    expect(winner!.summary.trophies).toContain(trophy.name);
    expect(finishSeason(winner!.state).state.trophies.filter(t => t.name === trophy.name)).toEqual([trophy]);
  });
});
