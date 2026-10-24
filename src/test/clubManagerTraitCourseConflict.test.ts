import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { startCareer, startRetraining, retrainRefusal, type CareerState, type CMPlayer } from '@/lib/clubManager';
import { startCoachedStyle } from '@/lib/clubManagerTraits';

beforeEach(() => {
  let seed = 1455;
  vi.spyOn(Math, 'random').mockImplementation(() => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  });
});
afterEach(() => { vi.restoreAllMocks(); });

function fixture() {
  const career = startCareer('Everton');
  const source = career.squad.find(p => p.position !== 'GK');
  if (!source) throw new Error('Actual career has no outfield fixture');
  const player: CMPlayer = {
    ...source, id: 'fictional-course-conflict', name: 'Fixture Player',
    position: 'CM', secondaryPositions: [], retraining: undefined, onLoan: false,
  };
  return { career: { ...career, squad: [player] }, player };
}
function replacePlayer(career: CareerState, player: CMPlayer): CareerState {
  return { ...career, squad: [player] };
}

describe('Club Manager coached-style and position courses cannot overlap', () => {
  it('refuses real position retraining after an actual valid coached-style course starts', () => {
    const { career, player } = fixture();
    expect(retrainRefusal(player, 'CDM'), 'CM_STYLE_POSITION_COURSE_POSITIVE_GATE').toBeNull();
    expect(startRetraining(career, player.id, 'CDM'), 'CM_STYLE_POSITION_COURSE_POSITIVE_RESULT').not.toBeNull();
    const started = startCoachedStyle(player, 'press', { owned: true, awayOnLoan: false, live: false });
    expect(started.ok, 'CM_STYLE_COURSE_CONFLICT_VALID_FOUNDATION').toBe(true);
    const candidate = replacePlayer(career, started.player);
    const before = JSON.stringify(candidate);
    const draws = vi.mocked(Math.random).mock.calls.length;
    expect(startRetraining(candidate, player.id, 'CDM'),
      'CM_STYLE_RETRAIN_ACTIVE_COURSE_REFUSED').toBeNull();
    expect(retrainRefusal(started.player, 'CDM')).not.toBeNull();
    expect(JSON.stringify(candidate), 'CM_STYLE_RETRAIN_REFUSAL_RETAINS_CAREER').toBe(before);
    expect(vi.mocked(Math.random).mock.calls.length).toBe(draws);
  });

  it('refuses unknown and malformed saved course payloads without deleting them', () => {
    const { career, player } = fixture();
    expect(startRetraining(career, player.id, 'CDM'), 'CM_STYLE_MALFORMED_COURSE_HEALTHY_FOUNDATION').not.toBeNull();
    for (const coachedStyleCourse of [
      null, { v: 2, to: 'press', weeksLeft: 3, weeksTotal: 6 },
      { v: 1, to: 'press', weeksLeft: 0, weeksTotal: 6 },
      { v: 1, to: 'unknown', weeksLeft: 3, weeksTotal: 6 },
    ]) {
      const stored = { ...player, coachedStyleCourse } as CMPlayer;
      const candidate = replacePlayer(career, stored);
      const before = JSON.stringify(candidate);
      expect(startRetraining(candidate, player.id, 'CDM'),
        'CM_STYLE_RETRAIN_UNKNOWN_COURSE_REFUSED').toBeNull();
      expect(retrainRefusal(stored, 'CDM')).not.toBeNull();
      expect(JSON.stringify(candidate)).toBe(before);
    }
  });

  it('allows position retraining with only a completed coached style and retains that style', () => {
    const { career, player } = fixture();
    const stored = { ...player, coachedStyle: { v: 1, id: 'press' } } as CMPlayer;
    const candidate = replacePlayer(career, stored);
    const before = JSON.stringify(candidate);
    const result = startRetraining(candidate, player.id, 'CDM');
    expect(result, 'CM_STYLE_COMPLETED_STYLE_DOES_NOT_BLOCK_POSITION_COURSE').not.toBeNull();
    const out = result!.squad[0] as CMPlayer & { coachedStyle?: unknown };
    expect(out.retraining?.to).toBe('CDM');
    expect(out.coachedStyle).toEqual({ v: 1, id: 'press' });
    expect(JSON.stringify(candidate)).toBe(before);
  });
});