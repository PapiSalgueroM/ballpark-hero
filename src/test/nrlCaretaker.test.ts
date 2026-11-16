import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  createNrlCareer, nrlCaretakerOpenings, nrlCareerCap, nrlCareerFinance, nrlCareerRecord, nrlProjectedSummerOpenings,
  readNrlCareerSave, reduceNrlCareer, type NrlCareerAction, type NrlCareerState,
} from '@/lib/nrlCareer';
import { nrlJudiciaryBans, nrlJudiciaryCase } from '@/lib/nrlJudiciary';
import { nrlLadder, nrlRoundFixtures } from '@/lib/nrlManager';
import { sameNrlCareer } from '@/lib/nrlSaveSlots';

const year = 2026;
const round = 14;
const clubId = 'storm';
const destinationId = 'dragons';
const appointment: NrlCareerAction = { type: 'acceptCaretakerJob', year, round, clubId, destinationId };
const digest = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const reload = (career: NrlCareerState) => readNrlCareerSave(JSON.stringify(career));
const advance = (career: NrlCareerState) => reduceNrlCareer(career, { type: 'advance' });

function atTheVacancy() {
  let career = createNrlCareer(clubId, 3, year, true);
  career = reduceNrlCareer(career, { type: 'signSponsor', year, clubId, offer: 'twoSeason' });
  while (career.season.round < round) career = advance(career);
  return reload(career)!;
}

describe('NRL same-season caretaker appointment', () => {
  it('appoints the next coach once in the same league before the Dragons’ Round 14 match', () => {
    const before = atTheVacancy();
    const previousResults = before.season.results;
    const previousLadder = nrlLadder(before.season);
    expect(previousResults).toHaveLength(98);
    expect(digest(previousResults)).toBe('5fe2a96a1fb480a63e3ac20795f301661c19c3884e4d09ad7a81a3bb08276bd3');
    expect(digest(previousLadder)).toBe('69f8c4de2daa206cb0f9afb314966541aeb273a6378954f7ad8c452a0aa4aee2');
    expect(digest(before.players)).toBe('71d9356539312c30b786a8c9cd0e6297c900629b44414f1be0e26f70caf3c4c8');
    expect(nrlProjectedSummerOpenings(before).find(job => job.clubId === destinationId)).toMatchObject({ rank: 16, missedBy: 4 });
    expect(nrlCareerFinance(before)).toMatchObject({ cash: 3_610_620, sponsor: { offer: 'twoSeason' } });

    const accepted = reduceNrlCareer(before, appointment);
    expect(accepted.season).toMatchObject({ year, round, clubId: destinationId, phase: 'regular' });
    expect(accepted.season.results).toEqual(previousResults);
    expect(nrlLadder(accepted.season)).toEqual(previousLadder);
    expect(accepted.players).toEqual(before.players);
    expect(accepted.season.squad).toHaveLength(30);
    expect(nrlCareerCap(accepted)).toMatchObject({ available: 693_018, slots: 30, committed: 10_856_982 });
    expect(accepted.finance).toMatchObject({ fromRound: round, openingCash: 2_500_000, centralFunding: 0, gateReceipts: 0, wagesPaid: 0 });
    expect(reduceNrlCareer(accepted, { type: 'upgradeMedical', level: 2, year, round, clubId })).toBe(accepted);
    expect(reduceNrlCareer(accepted, { type: 'hireCoach', role: 'attack', year, round, clubId })).toBe(accepted);
    expect(accepted.finance.sponsor).toBeUndefined();
    expect(sameNrlCareer(before, accepted)).toBe(true);
    expect(reload(accepted)).toEqual(accepted);
    expect(reduceNrlCareer(accepted, appointment)).toBe(accepted);

    const fixture = nrlRoundFixtures(accepted.season).find(match => match.homeId === destinationId || match.awayId === destinationId);
    expect(fixture).toEqual({ round, homeId: destinationId, awayId: 'bulldogs' });
    const next = advance(accepted);
    expect(next.season.results.slice(0, previousResults.length)).toEqual(previousResults);
    expect(next.season.results.find(match => match.round === round && match.homeId === destinationId)?.playerScoring).toBeDefined();
    expect(next.season.results.find(match => match.round === round && match.homeId === clubId)?.playerScoring).toBeUndefined();
    expect(next.finance.gateReceipts).toBeGreaterThan(0);
    expect(next.finance.wagesPaid).toBeGreaterThan(0);
    expect(next.caretakerDeparture?.finance).toEqual(nrlCareerFinance(before));
    expect(reload(next)).toEqual(next);
  });

  it('retains the two coaching records and the Storm’s finance when the shared season is complete', () => {
    const before = atTheVacancy();
    let career = reduceNrlCareer(before, appointment);
    expect(career.season.clubId).toBe(destinationId);
    while (career.season.phase !== 'complete') career = advance(career);
    const coachedAfterArrival = career.season.results.filter(match => !match.finalsRound && match.round >= round &&
      (match.homeId === destinationId || match.awayId === destinationId));
    const wonAfterArrival = coachedAfterArrival.filter(match => match.homeId === destinationId
      ? match.homeScore > match.awayScore : match.awayScore > match.homeScore).length;
    const coachRecord = nrlCareerRecord(career.history);
    expect(coachRecord?.seasons).toBe(1);
    expect(coachRecord?.clubs).toEqual(expect.arrayContaining([
      expect.objectContaining({ clubId, wins: 8, draws: 0, losses: 4 }),
      expect.objectContaining({ clubId: destinationId, wins: wonAfterArrival }),
    ]));
    expect(coachRecord?.wins).toBe(8 + wonAfterArrival);
    expect(career.finance.fromRound).toBe(round);
    expect(career.history[0].caretaker?.former).toMatchObject({ clubId, wins: 8, draws: 0, losses: 4,
      finance: { cash: 3_610_620, profit: 1_110_620, sponsor: { offer: 'twoSeason' } },
    });
    expect(career.history[0].finance?.cash).toBe(nrlCareerFinance(career).cash);
    expect(reload(career)).toEqual(career);
    const next = reduceNrlCareer(career, { type: 'startNextSeason' });
    expect(next.season).toMatchObject({ year: year + 1, round: 1, clubId: destinationId });
    expect(next.history[0].leagueLadder).toHaveLength(17);
    expect(reload(next)).toEqual(next);
  });

  it('can accept again in a later year, preserving the former club’s sponsor and past league seasons', () => {
    let career = reduceNrlCareer(atTheVacancy(), appointment);
    while (career.season.phase !== 'complete') career = advance(career);
    career = reduceNrlCareer(career, { type: 'startWorldCupAppointment', nation: 'england' });
    expect(career.worldCup).toBeDefined();
    const resumed = reduceNrlCareer(career, { type: 'startNextSeason' });
    let later = resumed;
    while (later.season.round < round) later = advance(later);
    const destination = nrlProjectedSummerOpenings(later).find(job => job.reason === 'missed'
      && nrlRoundFixtures(later.season).some(match => match.homeId === job.clubId || match.awayId === job.clubId));
    expect(destination).toBeDefined();
    const second = reduceNrlCareer(later, { type: 'acceptCaretakerJob', year: 2027, round, clubId: destinationId,
      destinationId: destination!.clubId });
    expect(second.season).toMatchObject({ year: 2027, round, clubId: destination!.clubId });
    expect(second.history).toEqual(resumed.history);
    expect(second.season.results).toEqual(later.season.results);
    expect(second.players).toEqual(later.players);
    expect(second.worldCup).toEqual(career.worldCup);
    const nextRound = advance(second);
    expect(reload(nextRound)).toEqual(nextRound);
    let completed = nextRound;
    while (completed.season.phase !== 'complete') completed = advance(completed);
    const thirdYear = reduceNrlCareer(completed, { type: 'startNextSeason' });
    expect(thirdYear.season.year).toBe(2028);
    expect(thirdYear.history[1].caretaker?.former.clubId).toBe(destinationId);
    expect(reload(thirdYear)).toEqual(thirdYear);

    const returnToStorm = reduceNrlCareer(career, { type: 'startNextSeason', move: { fromYear: 2026, clubId } });
    expect(returnToStorm.season).toMatchObject({ year: 2027, clubId });
    expect(returnToStorm.finance).toMatchObject({ openingCash: 3_610_620, sponsor: { offer: 'twoSeason', continued: true } });
    expect(reload(returnToStorm)).toEqual(returnToStorm);
  });

  it('requires a judicial case to be resolved and its ban served before changing clubs', () => {
    for (let seed = 1; seed <= 30; seed++) {
      let career = createNrlCareer(clubId, seed, year, false, true);
      while (career.season.round <= round + 4) {
        const review = nrlJudiciaryCase(career.season);
        if (review && !review.decision) {
          const { round: current } = career.season;
          const offer = nrlCaretakerOpenings({ ...career, season: { ...career.season, judiciary: undefined } })[0];
          const plea = reduceNrlCareer(career, { type: 'resolveJudiciary', year, clubId, caseRound: review.round, decision: 'plea' });
          if (offer) {
            const action = { type: 'acceptCaretakerJob', year, clubId, round: current, destinationId: offer.clubId } as const;
            expect(reduceNrlCareer(career, action)).toBe(career);
            expect(nrlJudiciaryBans(plea.season).size).toBe(1);
            expect(reduceNrlCareer(plea, action)).toBe(plea);
            let served = advance(plea);
            while (nrlJudiciaryBans(served.season).size) served = advance(served);
            const newOffer = nrlCaretakerOpenings(served)[0];
            expect(newOffer).toBeDefined();
            const accepted = reduceNrlCareer(served, { ...action, round: served.season.round, destinationId: newOffer.clubId });
            expect(accepted.season.caretaker?.judiciary?.case).toEqual(nrlJudiciaryCase(served.season));
            expect(reload(accepted)).toEqual(accepted);
            return;
          }
          career = plea;
        } else {
          career = advance(career);
        }
      }
    }
    throw new Error('No pending judiciary case during a seeded caretaker vacancy');
  });

  it('rejects a stale date or unfinished Live match and leaves a loaded older career unchanged', () => {
    const before = atTheVacancy();
    expect(reduceNrlCareer(before, { ...appointment, round: round - 1 })).toBe(before);
    const live = reduceNrlCareer(before, { type: 'startLive' });
    expect(live.season.live).toBeDefined();
    expect(reduceNrlCareer(live, appointment)).toBe(live);
    const older = { ...before };
    delete older.caretakerJobs;
    expect(reload(older)).toEqual(older);
    expect(reduceNrlCareer(older, appointment)).toBe(older);
  });
});
