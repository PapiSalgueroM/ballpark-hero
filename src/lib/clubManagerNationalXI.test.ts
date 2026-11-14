import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadCareer, saveCareer, SAVE_KEY, startCareer, startNextSeason } from '@/lib/clubManager';
import { defaultNationalXI, nationalPool, nationalSummerOf, selectedNationalXI, setNationalXI } from '@/lib/clubManagerNationalXI';
import { runManagerSummer } from '@/lib/soccerInternational';
import { saveFence } from '@/lib/saveFence';

function seed(n: number) {
  return () => (n = (Math.imul(n, 1664525) + 1013904223) >>> 0) / 4294967296;
}

function england() {
  return { ...startCareer('Manchester City'), startYear: 2027,
    nationJob: { nation: 'England', since: 1, played: 0, won: 0, lastResult: null, lastYear: null } };
}

describe('Club Manager national starting XI', () => {
  beforeEach(() => { saveFence.release(SAVE_KEY); localStorage.clear(); });
  afterEach(() => { vi.restoreAllMocks(); saveFence.release(SAVE_KEY); });

  it('saves the actual full-pool XI, keeps club tactics, and retains the report after rollover', () => {
    const before = england();
    expect(nationalSummerOf(before)).toMatchObject({ year: 2028 });
    const pool = nationalPool(before);
    expect(pool.length).toBeGreaterThan(40);
    const keys = defaultNationalXI(0, pool);
    const reserve = [...pool].reverse().find(p => p.position !== 'GK' && !keys.includes(p.key))!;
    keys[10] = reserve.key;
    const plan = { year: 2028, formation: 0, keys };
    const next = setNationalXI(before, plan)!;
    expect(next.xiIds).toBe(before.xiIds);
    expect(next.mentality).toBe(before.mentality);
    expect(setNationalXI(before, { ...plan, keys: [...keys.slice(0, 10), keys[0]] })).toBeNull();
    expect(saveCareer(next)).toBe(true);
    const restored = loadCareer()!;
    expect(restored.nationJob?.xi).toEqual(plan);
    const played = startNextSeason(restored);
    expect(played.nationCampaign?.xi?.players).toHaveLength(11);
    expect(played.nationCampaign?.xi?.players.at(-1)?.name).toBe(reserve.name);
    expect(played.nationJob?.xi).toBeUndefined();
    expect(saveCareer(played)).toBe(true);
    expect(loadCareer()?.nationCampaign?.xi).toEqual(played.nationCampaign?.xi);
  });

  it('uses automatic selection if a chosen player is now injured, with a campaign notice', () => {
    const before = england();
    const pool = nationalPool(before);
    const owned = pool.find(p => p.club === before.clubName && p.position !== 'GK')!;
    const keys = defaultNationalXI(0, pool);
    const existing = keys.indexOf(owned.key);
    if (existing < 0) keys[10] = owned.key;
    const next = setNationalXI(before, { year: 2028, formation: 0, keys })!;
    const injured = { ...next, squad: next.squad.map(player => player.name === owned.name ? { ...player, injuryWeeks: 8 } : player) };
    expect(selectedNationalXI(injured, 2028)).toBeNull();
    expect(startNextSeason(injured).nationCampaign).toMatchObject({ xiUnavailable: true });
    expect(setNationalXI(next, null)?.nationJob?.xi).toBeUndefined();
  });

  it('uses the same draw with automatic selection and shifts scoring in the declared direction with an XI adjustment', () => {
    const random = vi.spyOn(Math, 'random');
    let strongGoals = 0, weakGoals = 0, strongAllowed = 0, weakAllowed = 0;
    for (let i = 1; i <= 36; i++) {
      random.mockImplementation(seed(i));
      const auto = runManagerSummer('England', 2028, 3, 'balanced');
      random.mockImplementation(seed(i));
      expect(runManagerSummer('England', 2028, 3, 'balanced', 0)).toEqual(auto);
      random.mockImplementation(seed(i));
      const strong = runManagerSummer('England', 2028, 3, 'balanced', 8)!.qualifying.table.find(row => row.nation === 'England')!;
      random.mockImplementation(seed(i));
      const weak = runManagerSummer('England', 2028, 3, 'balanced', -8)!.qualifying.table.find(row => row.nation === 'England')!;
      strongGoals += strong.gf;
      weakGoals += weak.gf;
      strongAllowed += strong.ga;
      weakAllowed += weak.ga;
    }
    expect(strongGoals - weakGoals).toBeGreaterThan(250);
    expect(weakAllowed - strongAllowed).toBeGreaterThan(70);
  });
});
