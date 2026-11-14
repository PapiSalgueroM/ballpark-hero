import { afterEach, describe, expect, it } from 'vitest';
import { finishSeason, loadCareer, saveCareer, SAVE_KEY, startCareer, startNextSeason, type CareerState } from '@/lib/clubManager';
import { nationalQualifierView, playNationalQualifier } from '@/lib/clubManagerNationalQualifiers';
import { nationalFinalsView, playNationalFinal } from '@/lib/clubManagerNationalFinals';
import { saveFence } from '@/lib/saveFence';

function ready(nation: string): CareerState {
  const start = startCareer('Manchester City');
  return finishSeason({ ...start, startYear: 2027, week: start.calendar.length,
    nationJob: { nation, since: 1, played: 0, won: 0, lastResult: null, lastYear: null } }).state;
}

describe('Club Manager national finals matchdays', () => {
  afterEach(() => { saveFence.release(SAVE_KEY); localStorage.clear(); });

  it('reveals and keeps each game, then settles the recorded Copa America run once', () => {
    const before = ready('Argentina');
    const opening = nationalFinalsView(before)!;
    expect(opening).toMatchObject({ year: 2028, played: [], result: null });
    expect(opening.next?.round).toMatch(/^Group /);
    const first = playNationalFinal(before, opening.next!.id, 'defensive')!;
    expect(first.nationJob?.finals?.played[0].mentality).toBe('defensive');
    expect(first.week).toBe(before.week);
    expect(playNationalFinal(first, opening.next!.id)).toBeNull();
    expect(startNextSeason(first)).toBe(first);
    expect(saveCareer(first)).toBe(true);
    let held = loadCareer()!;
    expect(nationalFinalsView(held)?.played).toEqual(nationalFinalsView(first)?.played);
    for (let i = 0; i < 7; i++) {
      const upcoming = nationalFinalsView(held)?.next;
      if (!upcoming) break;
      held = playNationalFinal(held, upcoming.id)!;
    }
    const complete = nationalFinalsView(held)!;
    expect(complete.played.length).toBeGreaterThanOrEqual(3);
    expect(complete.next).toBeNull();
    expect(complete.result).toBeTruthy();
    const after = startNextSeason(held);
    expect(after.nationJob?.lastResult).toBe(complete.result);
    expect(after.nationJob?.played).toBe(1);
    expect(after.nationCampaign?.matches).toEqual(complete.played);
    expect(after.nationJob?.finals).toBeUndefined();
    expect(after.trophies.filter(t => t.name === opening.tournament)).toHaveLength(complete.result === 'Winner' ? 1 : 0);
  });

  it('requires a qualifying place to open the finals and keeps played qualifiers in the next season receipt', () => {
    let career = ready('England');
    expect(nationalFinalsView(career)).toBeNull();
    expect(playNationalFinal(career, '2028-0')).toBeNull();
    const opponent = nationalQualifierView(career)!.next!;
    career = playNationalQualifier(career, opponent.id)!;
    expect(nationalFinalsView(career)).toBeNull();
    while (nationalQualifierView(career)?.next) {
      const match = nationalQualifierView(career)!.next!;
      career = playNationalQualifier(career, match.id)!;
    }
    const qualifiers = nationalQualifierView(career)!;
    const groupGame = nationalFinalsView(career);
    expect(!!groupGame).toBe(qualifiers.table.qualified);
    while (nationalFinalsView(career)?.next) {
      career = playNationalFinal(career, nationalFinalsView(career)!.next!.id)!;
    }
    const after = startNextSeason(career);
    expect(after.nationCampaign?.matches).toEqual([...qualifiers.played, ...(nationalFinalsView(career)?.played ?? [])]);
    expect(after.nationCampaign?.qualifying).toEqual(qualifiers.table);
  });
});
