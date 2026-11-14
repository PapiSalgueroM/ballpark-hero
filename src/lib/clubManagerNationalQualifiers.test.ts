import { afterEach, describe, expect, it, vi } from 'vitest';
import { finishSeason, loadCareer, saveCareer, SAVE_KEY, startCareer, startNextSeason, type CareerState } from '@/lib/clubManager';
import { nationalQualifierView, playNationalQualifier } from '@/lib/clubManagerNationalQualifiers';
import { saveFence } from '@/lib/saveFence';

function ready(nation = 'England', startYear = 2027): CareerState {
  const start = startCareer('Manchester City');
  return finishSeason({ ...start, startYear, week: start.calendar.length,
    nationJob: { nation, since: 1, played: 0, won: 0, lastResult: null, lastYear: null } }).state;
}

describe('Club Manager national qualifying matchdays', () => {
  afterEach(() => { vi.restoreAllMocks(); saveFence.release(SAVE_KEY); localStorage.clear(); });

  it('plays an actual ten-fixture group, holds old fixtures on retry, and finishes with the same qualifying ledger', () => {
    const career = ready();
    const draw = nationalQualifierView(career)!;
    expect(draw).toMatchObject({ year: 2028, fixtureCount: 10, played: [] });
    expect(draw.group).toHaveLength(6);
    const match = playNationalQualifier(career, draw.next!.id)!;
    expect(nationalQualifierView(match)?.table.table.every(row => row.played === 1)).toBe(true);
    expect(playNationalQualifier(match, draw.next!.id)).toBeNull();
    expect(startNextSeason(match)).toBe(match);
    expect(match.week).toBe(career.week);
    expect(match.squad).toBe(career.squad);
    expect(saveCareer(match)).toBe(true);
    let held = loadCareer()!;
    expect(nationalQualifierView(held)?.played).toEqual(match.nationJob?.qualifiers?.played);
    for (let index = 1; index < draw.fixtureCount; index++) {
      const next = nationalQualifierView(held)?.next;
      expect(next).toBeTruthy();
      held = playNationalQualifier(held, next!.id)!;
    }
    const review = nationalQualifierView(held)!;
    expect(review.next).toBeNull();
    expect(review.played).toHaveLength(10);
    expect(review.table.table.every(row => row.played === 10)).toBe(true);
    expect(review.table.table.reduce((total, row) => total + row.gf - row.ga, 0)).toBe(0);
    const newSeason = startNextSeason(held);
    expect(newSeason.season).toBe(career.season + 1);
    expect(newSeason.nationCampaign?.qualifying).toEqual(review.table);
    expect(newSeason.nationCampaign?.matches.slice(0, 10)).toEqual(review.played);
    expect(newSeason.nationJob?.qualifiers).toBeUndefined();
  });

  it('leaves untouched campaigns and years without qualifiers on the original rollout', () => {
    const career = ready();
    const notStarted = startNextSeason(career);
    expect(notStarted.nationCampaign?.matches.every(match => match.round !== 'Qualifying')).toBe(true);
    const offYear = ready('England', 2026);
    expect(nationalQualifierView(offYear)).toBeNull();
    expect(playNationalQualifier(offYear, 'anything')).toBeNull();
    expect(playNationalQualifier({ ...career, pendingSummary: null }, nationalQualifierView(career)!.next!.id)).toBeNull();
  });
});
