import { describe, expect, it } from 'vitest';
import { createNrlCareer, nrlOffseasonApplication, nrlOffseasonOpportunities, readNrlCareerSave, reduceNrlCareer, type NrlCareerState } from '@/lib/nrlCareer';
import { nrlBoardTarget } from '@/lib/nrlBoardTarget';
import { createNrlSeason, reduceNrlSeason } from '@/lib/nrlManager';

const apply = (career: NrlCareerState, destinationId: string) => reduceNrlCareer(career, {
  type: 'applyForOffseasonJob', year: career.season.year, clubId: career.season.clubId, destinationId,
});
const accept = (career: NrlCareerState, destinationId: string) => reduceNrlCareer(career, {
  type: 'acceptOffseasonJob', year: career.season.year, clubId: career.season.clubId, destinationId,
});
const move = (career: NrlCareerState, clubId: string) => reduceNrlCareer(career, {
  type: 'startNextSeason', move: { fromYear: career.season.year, clubId },
});
const read = (career: NrlCareerState) => readNrlCareerSave(JSON.stringify(career));

function finish(career: NrlCareerState) {
  while (career.season.phase !== 'complete') career = reduceNrlCareer(career, { type: 'advance' });
  return career;
}

function findResult(offer: boolean) {
  for (let seed = 1; seed <= 20; seed++) {
    const career = finish(createNrlCareer('storm', seed));
    const met = nrlBoardTarget(career)?.result === 'met' || career.season.championId === career.season.clubId;
    const rival = nrlOffseasonOpportunities(career).find(job => job.reason === 'missed');
    if (met === offer && rival) return { career, destinationId: rival.clubId };
  }
  throw new Error('No suitable completed season in the fixture range');
}

describe('NRL offseason job applications', () => {
  it('records one application after the season and books the expansion job through normal rollover', () => {
    const initial = createNrlCareer('storm', 4);
    expect(apply(initial, 'bears')).toBe(initial);
    const completed = finish(initial);
    expect(accept(completed, 'bears')).toBe(completed);
    expect(nrlOffseasonApplication(completed)).toBeNull();
    const manual = move(completed, 'bears');
    const applied = apply(completed, 'bears');
    expect(applied.offseasonApplication).toBe('bears');
    expect(applied.season).toBe(completed.season);
    expect(applied.finance).toBe(completed.finance);
    expect(applied.players).toBe(completed.players);
    expect(nrlOffseasonApplication(applied)).toMatchObject({ clubId: 'bears', reason: 'expansion', response: 'offered' });
    expect(apply(applied, 'bears')).toBe(applied);
    expect(apply(applied, 'roosters')).toBe(applied);
    expect(read(applied)).toEqual(applied);
    const joined = accept(read(applied)!, 'bears');
    expect(joined.season).toEqual(manual.season);
    expect(joined.finance).toEqual(manual.finance);
    expect(joined.players).toEqual(manual.players);
    expect(joined.offseasonApplication).toBeUndefined();
    expect(joined.history[0].appointment).toEqual({ clubId: 'bears', reason: 'expansion' });
    expect(manual.history[0].appointment).toBeUndefined();
    expect(accept(joined, 'bears')).toBe(joined);
    expect(read(joined)).toEqual(joined);
  });

  it('uses the completed board result or premiership for an existing club and keeps manual moves available', () => {
    const earned = findResult(true);
    const offered = apply(earned.career, earned.destinationId);
    expect(nrlOffseasonApplication(offered)).toMatchObject({ response: 'offered', reason: 'missed' });
    expect(accept(offered, earned.destinationId).history[0].appointment).toEqual({ clubId: earned.destinationId, reason: 'missed' });
    const missed = findResult(false);
    const declined = apply(missed.career, missed.destinationId);
    expect(nrlOffseasonApplication(declined)).toMatchObject({ response: 'declined', reason: 'missed' });
    expect(accept(declined, missed.destinationId)).toBe(declined);
    expect(apply(declined, 'bears')).toBe(declined);
    expect(read(declined)).toEqual(declined);
    const direct = move(declined, 'bears');
    expect(direct.season.clubId).toBe('bears');
    expect(direct.offseasonApplication).toBeUndefined();
    expect(direct.history[0].appointment).toBeUndefined();
    const retired = reduceNrlCareer(declined, { type: 'retireCareer', year: 2026, clubId: 'storm' });
    expect(retired.retired).toBe(true);
    expect(retired.offseasonApplication).toBeUndefined();
    expect(read(retired)).toEqual(retired);
  });

  it('rejects stale or forged applications and archived destinations', () => {
    const initial = createNrlCareer('bears', 14, 2027);
    const completed = finish(initial);
    expect(apply(completed, 'bears')).toBe(completed);
    expect(apply(completed, 'not-a-club')).toBe(completed);
    expect(reduceNrlCareer(completed, { type: 'applyForOffseasonJob', year: 2026, clubId: 'bears', destinationId: 'chiefs' })).toBe(completed);
    expect(reduceNrlCareer(completed, { type: 'applyForOffseasonJob', year: 2027, clubId: 'storm', destinationId: 'chiefs' })).toBe(completed);
    expect(read({ ...initial, offseasonApplication: 'chiefs' })).toBeNull();
    expect(read({ ...completed, offseasonApplication: 'panthers' })).toBeNull();
    const applied = apply(completed, 'chiefs');
    expect(nrlOffseasonApplication(applied)).toMatchObject({ clubId: 'chiefs', response: 'offered' });
    expect(accept(applied, 'dragons')).toBe(applied);
    const joined = accept(applied, 'chiefs');
    expect(joined.season).toMatchObject({ year: 2028, clubId: 'chiefs' });
    expect(read(joined)).toEqual(joined);
    const receipt = joined.history[0];
    expect(read({ ...joined, history: [{ ...receipt, appointment: { clubId: 'storm', reason: 'missed' } }] })).toBeNull();
    expect(read({ ...joined, history: [{ ...receipt, appointment: { clubId: 'chiefs', reason: 'missed' } }] })).toBeNull();
    expect(read({ ...applied, history: [{ ...applied.history[0], appointment: { clubId: 'chiefs', reason: 'expansion' } }] })).toBeNull();
  });

  it('keeps an imported season and its direct expansion move byte-compatible', () => {
    let legacy = createNrlSeason('storm', 8, 2026);
    while (legacy.phase !== 'complete') legacy = reduceNrlSeason(legacy, { type: 'advance' });
    const imported = readNrlCareerSave(JSON.stringify(legacy))!;
    expect(nrlOffseasonOpportunities(imported).some(job => job.clubId === 'bears')).toBe(true);
    expect(apply(imported, 'bears')).toBe(imported);
    expect(read({ ...imported, offseasonApplication: 'bears' })).toBeNull();
    const joined = move(imported, 'bears');
    expect(joined.season.clubId).toBe('bears');
    expect(joined.history[0].appointment).toBeUndefined();
    expect(JSON.stringify(read(joined))).toBe(JSON.stringify(joined));
  });
});
