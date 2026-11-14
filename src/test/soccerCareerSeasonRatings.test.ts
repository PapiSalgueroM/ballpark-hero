import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { advanceProSeason, FALLBACK_CLUBS, type CareerState } from '@/lib/soccerCareerEngine';

describe('Soccer Career in-season ratings', () => {
  afterEach(() => vi.restoreAllMocks());

  it.each([[19, 1], [34, -1]])('carries the age-%i season path forward exactly once', (age, direction) => {
    const data = JSON.parse(readFileSync('scripts/data/careerLeagueWorldSaves1100.json', 'utf8'));
    const state: CareerState = structuredClone(data.saves.find((save: { id: string }) => save.id === 'ere').state);
    Object.assign(state, { age, overall: 74, potential: 98, primeType: 'normal', retirementSuggested: true,
      phase: 'playing', pace: 74, shooting: 74, passing: 74, dribbling: 74, defending: 74, physical: 74, reflexes: 74 });
    vi.spyOn(Math, 'random').mockReturnValue(0.62);
    const next = advanceProSeason(state, FALLBACK_CLUBS, true);
    const row = next.seasons.at(-1)!;
    expect(row.ratingPath).toHaveLength(5);
    const [opening, early, middle, late, closing] = row.ratingPath!;
    expect(opening).toBe(state.overall);
    expect(closing).toBe(next.overall);
    expect((closing - opening) * direction).toBeGreaterThan(0);
    expect((early - opening) * direction).toBeGreaterThanOrEqual(0);
    expect((middle - opening) * direction).toBeGreaterThan(0);
    expect((late - closing) * direction).toBeLessThanOrEqual(0);
    expect(row.ovr).toBe(Math.round((opening + 2 * (early + middle + late) + closing) / 8));
    expect(next.seasons).toHaveLength(state.seasons.length + 1);
    const legacy = advanceProSeason(state, FALLBACK_CLUBS);
    expect(legacy.seasons.at(-1)?.ratingPath).toBeUndefined();
    expect(legacy.seasons.at(-1)?.ovr).toBe(state.overall);
  });
});
