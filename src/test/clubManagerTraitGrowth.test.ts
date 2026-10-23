import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DEVELOPMENT_RATE_MAX, developmentRate, startCareer,
  type CareerState, type CMPlayer, type TrainingIntensity,
} from '@/lib/clubManager';

const seeded = (seed: number) => () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
beforeEach(() => { vi.spyOn(Math, 'random').mockImplementation(seeded(1568)); });
afterEach(() => { vi.restoreAllMocks(); });

function fixture(intensity: TrainingIntensity, capped = false) {
  const career = startCareer('Everton');
  const source = career.squad.find(p => p.position !== 'GK');
  if (!source || !career.academy) throw new Error('Existing career fixture is incomplete');
  const player: CMPlayer = {
    ...source, id: 'fictional-style-growth', name: 'Fixture Player',
    age: 20, rating: 60, potential: capped ? 95 : 75, apps: capped ? 40 : 12,
  };
  const ctx: CareerState = {
    ...career, training: { intensity, focus: 'balanced' },
    academy: { ...career.academy, coaching: capped ? 20 : 1, facilities: capped ? 20 : 1 },
  };
  return { player, career: ctx };
}
function styled(player: CMPlayer, id: string, version = 1): CMPlayer {
  return { ...player, coachedStyle: { v: version, id } } as CMPlayer;
}

describe('Club Manager coached styles reach the actual development model', () => {
  it.each([
    ['press', 'double', 'CM_STYLE_PRESS_MATCHING_GROWTH'],
    ['link', 'normal', 'CM_STYLE_LINK_MATCHING_GROWTH'],
    ['runner', 'light', 'CM_STYLE_RUNNER_MATCHING_GROWTH'],
  ] as const)('uses the %s coached style at %s intensity', (id, intensity, marker) => {
    const { player, career } = fixture(intensity);
    const learned = styled(player, id);
    const before = JSON.stringify({ player, learned, career });
    const draws = vi.mocked(Math.random).mock.calls.length;
    const ordinary = developmentRate(player, career);
    expect(ordinary, 'CM_STYLE_FIXTURE_HAS_UNCLAMPED_HEADROOM').toBeLessThan(DEVELOPMENT_RATE_MAX / 1.05);
    expect(developmentRate(learned, career), marker).toBeCloseTo(ordinary * 1.05, 12);
    expect(vi.mocked(Math.random).mock.calls.length, 'CM_STYLE_GROWTH_NO_DRAW').toBe(draws);
    expect(JSON.stringify({ player, learned, career }), 'CM_STYLE_GROWTH_READ_ONLY').toBe(before);
  });

  it.each([
    ['press', 'normal'], ['link', 'light'], ['runner', 'double'],
  ] as const)('keeps %s neutral at nonmatching %s intensity', (id, intensity) => {
    const { player, career } = fixture(intensity);
    expect(developmentRate(styled(player, id), career), 'CM_STYLE_NONMATCHING_GROWTH_NEUTRAL')
      .toBe(developmentRate(player, career));
  });

  it('keeps unknown and malformed saved styles neutral without changing their data', () => {
    const { player, career } = fixture('double');
    const ordinary = developmentRate(player, career);
    for (const value of [null, [], { v: 2, id: 'press' }, { v: 1, id: 'unknown' }]) {
      const candidate = { ...player, coachedStyle: value } as CMPlayer;
      const before = JSON.stringify(candidate);
      expect(developmentRate(candidate, career), 'CM_STYLE_UNKNOWN_GROWTH_NEUTRAL').toBe(ordinary);
      expect(JSON.stringify(candidate)).toBe(before);
    }
  });

  it('keeps the existing development ceiling with a matching learned style', () => {
    const { player, career } = fixture('double', true);
    expect(developmentRate(player, career), 'CM_STYLE_EXISTING_RATE_CAP').toBe(DEVELOPMENT_RATE_MAX);
    expect(developmentRate(styled(player, 'press'), career), 'CM_STYLE_MATCHING_RATE_STILL_CAPPED').toBe(DEVELOPMENT_RATE_MAX);
  });
});
