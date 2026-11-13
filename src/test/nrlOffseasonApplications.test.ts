import { describe, expect, it } from 'vitest';
import {
  createNrlCareer, nrlOffseasonApplication, nrlOffseasonOpportunities, nrlProjectedSummerOpenings, nrlSummerApplication,
  readNrlCareerSave, reduceNrlCareer, type NrlCareerState,
} from '@/lib/nrlCareer';
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
const advance = (career: NrlCareerState) => reduceNrlCareer(career, { type: 'advance' });
const summerApply = (career: NrlCareerState, destinationId: string, round = career.season.round) => reduceNrlCareer(career, {
  type: 'applyForSummerJob', year: career.season.year, clubId: career.season.clubId, round, destinationId,
});

function finish(career: NrlCareerState) {
  while (career.season.phase !== 'complete') career = reduceNrlCareer(career, { type: 'advance' });
  return career;
}

function beforeRound(career: NrlCareerState, round: number) {
  while (career.season.round < round) career = advance(career);
  return career;
}

describe('NRL applications during the season', () => {
  it.each([[2026, 'storm', 'bears'], [2027, 'bears', 'chiefs']] as const)(
    'settles an optional summer expansion application from %i without changing any club match or payroll',
    (year, club, destination) => {
      const start = createNrlCareer(club, 4, year);
      const early = beforeRound(start, 13);
      expect(nrlProjectedSummerOpenings(early)).toEqual([]);
      expect(summerApply(early, destination)).toBe(early);
      let ordinary = advance(early);
      expect(nrlProjectedSummerOpenings(ordinary).some(job => job.clubId === destination)).toBe(true);
      expect(summerApply(ordinary, destination, 13)).toBe(ordinary);
      expect(summerApply(ordinary, club)).toBe(ordinary);
      const matchRound = ordinary.season.year === 2026 ? ordinary : beforeRound(ordinary, 15);
      const live = reduceNrlCareer(matchRound, { type: 'startLive' });
      expect(live.season.live).toBeDefined();
      expect(summerApply(live, destination)).toBe(live);
      const deadline = beforeRound(ordinary, 22);
      expect(summerApply(deadline, destination).summerApplication?.round).toBe(22);
      const late = advance(deadline);
      expect(summerApply(late, destination)).toBe(late);
      let applied = summerApply(ordinary, destination);
      expect(applied.summerApplication).toEqual({ clubId: destination, round: 14 });
      expect(nrlSummerApplication(applied)).toMatchObject({ clubId: destination, round: 14, response: 'pending' });
      expect(accept(applied, destination)).toBe(applied);
      expect(summerApply(applied, destination)).toBe(applied);
      expect(read(applied)).toEqual(applied);
      expect(read({ ...applied, summerApplication: { clubId: club, round: 14 } })).toBeNull();
      expect(read({ ...applied, summerApplication: { clubId: destination, round: 15 } })).toBeNull();
      while (ordinary.season.phase !== 'complete') {
        ordinary = advance(ordinary);
        applied = advance(applied);
        expect(applied.season).toEqual(ordinary.season);
      }
      expect(applied.summerApplication).toBeUndefined();
      expect(applied.finance).toEqual(ordinary.finance);
      expect(applied.players).toEqual(ordinary.players);
      expect(applied.history.at(-1)?.summerApplication).toEqual({ clubId: destination, round: 14, response: 'offered' });
      expect(nrlSummerApplication(applied)).toMatchObject({ clubId: destination, response: 'offered', reason: 'expansion' });
      const receipt = applied.history.at(-1)!;
      expect(read({ ...applied, history: [{ ...receipt,
        summerApplication: { ...receipt.summerApplication!, response: 'vacancy-closed' },
      }] })).toBeNull();
      expect(apply(applied, destination)).toBe(applied);
      const joined = accept(read(applied)!, destination);
      const manual = move(ordinary, destination);
      expect(joined.season).toEqual(manual.season);
      expect(joined.finance).toEqual(manual.finance);
      expect(joined.players).toEqual(manual.players);
      expect(joined.history.at(-1)?.appointment).toEqual({ clubId: destination, reason: 'expansion' });
      expect(read(joined)).toEqual(joined);
    },
  );

  it('archives a disappeared rival vacancy or board refusal without blocking a direct move', () => {
    let closed: NrlCareerState | undefined;
    let refused: NrlCareerState | undefined;
    for (let seed = 1; seed <= 20 && (!closed || !refused); seed++) {
      const season = beforeRound(createNrlCareer('storm', seed), 14);
      const final = finish(season);
      const vacancies = nrlOffseasonOpportunities(final);
      for (const rival of nrlProjectedSummerOpenings(season).filter(job => job.reason === 'missed')) {
        if (!closed && !vacancies.some(job => job.clubId === rival.clubId)) closed = finish(summerApply(season, rival.clubId));
        if (!refused && nrlBoardTarget(final)?.result === 'missed' && final.season.championId !== season.season.clubId
          && vacancies.some(job => job.clubId === rival.clubId)) refused = finish(summerApply(season, rival.clubId));
      }
    }
    for (const [career, response] of [[closed!, 'vacancy-closed'], [refused!, 'declined']] as const) {
      const outcome = nrlSummerApplication(career);
      expect(outcome?.response).toBe(response);
      expect(accept(career, outcome!.clubId)).toBe(career);
      expect(read(career)).toEqual(career);
      const direct = move(career, 'bears');
      expect(direct.season.clubId).toBe('bears');
      expect(direct.history.at(-1)?.summerApplication).toEqual({ clubId: outcome!.clubId, round: 14, response });
      expect(direct.history.at(-1)?.appointment).toBeUndefined();
      const [receipt] = direct.history;
      expect(read({ ...direct, history: [{ ...receipt, summerApplication: { ...receipt.summerApplication!, round: 13 } }] })).toBeNull();
      const retired = reduceNrlCareer(career, { type: 'retireCareer', year: 2026, clubId: 'storm' });
      expect(read(retired)).toEqual(retired);
      expect(accept(retired, outcome!.clubId)).toBe(retired);
    }
  });
});

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
    const legacyMidseason = beforeRound(readNrlCareerSave(JSON.stringify(createNrlSeason('storm', 8, 2026)))!, 14);
    expect(nrlProjectedSummerOpenings(legacyMidseason)).toEqual([]);
    expect(summerApply(legacyMidseason, 'bears')).toBe(legacyMidseason);
    expect(read({ ...imported, offseasonApplication: 'bears' })).toBeNull();
    const joined = move(imported, 'bears');
    expect(joined.season.clubId).toBe('bears');
    expect(joined.history[0].appointment).toBeUndefined();
    expect(JSON.stringify(read(joined))).toBe(JSON.stringify(joined));
  });
});
