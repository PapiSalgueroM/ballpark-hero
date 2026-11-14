import { describe, expect, it } from 'vitest';
import {
  createNrlCareer, createNrlCustomCareer, nrlCareerFinance, nrlOffseasonOpportunities,
  readNrlCareerSave, reduceNrlCareer, type NrlCareerState,
} from '@/lib/nrlCareer';
import { createNrlSeason, reduceNrlSeason } from '@/lib/nrlManager';

const advance = (state: NrlCareerState) => reduceNrlCareer(state, { type: 'advance' });
const retire = (state: NrlCareerState) => reduceNrlCareer(state, { type: 'retireCareer', year: state.season.year, clubId: state.season.clubId });
const resign = (state: NrlCareerState, year = state.season.year, clubId = state.season.clubId) => reduceNrlCareer(state, { type: 'leaveClub', year, clubId });
const rejoin = (state: NrlCareerState, destinationId: string, year = state.season.year) => reduceNrlCareer(state, { type: 'acceptVacancy', year, clubId: state.season.clubId, destinationId });
const reload = (state: NrlCareerState) => readNrlCareerSave(JSON.stringify(state));

function finish(initial: NrlCareerState) {
  let state = initial;
  for (let round = 0; round < 36 && state.season.phase !== 'complete'; round++) state = advance(state);
  expect(state.season.phase).toBe('complete');
  return state;
}

describe('NRL summer job market between clubs', () => {
  it.each([2026, 2027] as const)('saves a resignation in %s and re-enters the same world through a vacancy', year => {
    const ended = finish(createNrlCustomCareer('storm', 4, year, { name: 'River City', ground: 'River Ground', colour: 'teal' })!);
    const original = JSON.stringify(ended);
    const destinationId = nrlOffseasonOpportunities(ended)[0].clubId;
    const departed = resign(ended);
    expect(departed.outOfWork).toBe(true);
    expect(departed.season).toBe(ended.season);
    expect(departed.players).toBe(ended.players);
    expect(departed.history).toBe(ended.history);
    expect(reload(departed)).toEqual(departed);
    expect(resign(departed)).toBe(departed);
    expect(advance(departed)).toBe(departed);
    expect(reduceNrlCareer(departed, { type: 'startNextSeason' })).toBe(departed);
    expect(reduceNrlCareer(departed, { type: 'startNextSeason', move: { fromYear: year, clubId: destinationId } })).toBe(departed);
    expect(reduceNrlCareer(departed, { type: 'setTactic', tactic: 'attack' })).toBe(departed);
    expect(rejoin(departed, ended.season.clubId)).toBe(departed);
    const unopened = ['bulldogs', 'dragons', 'sharks', 'knights'].find(id => !nrlOffseasonOpportunities(ended).some(opening => opening.clubId === id))!;
    expect(rejoin(departed, unopened)).toBe(departed);
    expect(rejoin(departed, destinationId, year - 1)).toBe(departed);
    expect(rejoin(ended, destinationId)).toBe(ended);

    const next = rejoin(reload(departed)!, destinationId);
    const ordinary = reduceNrlCareer(ended, { type: 'startNextSeason', move: { fromYear: year, clubId: destinationId } });
    expect(next.outOfWork).toBeUndefined();
    expect(next.season).toEqual(ordinary.season);
    expect(next.players).toEqual(ordinary.players);
    expect(next.finance).toEqual(ordinary.finance);
    expect(next.customClub).toEqual(ended.customClub);
    expect(next.history[0]).toEqual({ ...ordinary.history[0], rejoinedClubId: destinationId });
    expect(nrlCareerFinance(next).cash).toBe(nrlCareerFinance(ordinary).cash);
    expect(reload(next)).toEqual(next);
    expect(reload(advance(next))).toEqual(advance(next));
    expect(reload({ ...next, history: [{ ...next.history[0], rejoinedClubId: unopened }] })).toBeNull();
    expect(JSON.stringify(ended)).toBe(original);
    expect(JSON.stringify(reload(ordinary))).toBe(JSON.stringify(ordinary));
  });

  it('rejects premature and stale departure, keeps pending extension at the club, and permits retirement', () => {
    const started = createNrlCareer('storm', 4);
    const hired = reduceNrlCareer(started, { type: 'hireCoach', role: 'attack', year: 2026, round: 1 });
    const ended = finish(hired);
    expect(resign(started) === started).toBe(true);
    expect(resign(ended, 2027)).toBe(ended);
    expect(resign(ended, 2026, 'bears')).toBe(ended);
    expect(reload({ ...started, outOfWork: true })).toBeNull();
    const offered = reduceNrlCareer(ended, { type: 'applyForOffseasonJob', year: 2026, clubId: 'storm', destinationId: 'bears' });
    const extended = reduceNrlCareer(offered, { type: 'setCoachRetention', year: 2026, clubId: 'storm', enabled: true });
    expect(extended.coachRetention).toBe(true);
    const departed = resign(extended);
    expect(departed.coachRetention).toBeUndefined();
    expect(departed.offseasonApplication).toBeUndefined();
    expect(reduceNrlCareer(departed, { type: 'acceptOffseasonJob', year: 2026, clubId: 'storm', destinationId: 'bears' })).toBe(departed);
    const retired = retire(departed);
    expect(retired.retired).toBe(true);
    expect(retired.outOfWork).toBe(true);
    expect(reload(retired)).toEqual(retired);
    expect(rejoin(retired, 'bears')).toBe(retired);
  });

  it('keeps an existing international appointment and closes only the old club job', () => {
    const ended = finish(createNrlCareer('storm', 4));
    const appointed = reduceNrlCareer(ended, { type: 'startWorldCupAppointment', nation: 'australia' });
    expect(appointed.worldCup?.nation).toBe('australia');
    const departed = resign(appointed);
    expect(departed.worldCup).toBe(appointed.worldCup);
    expect(rejoin(reload(departed)!, 'bears').worldCup).toEqual(appointed.worldCup);
    let season = createNrlSeason('storm', 4);
    while (season.phase !== 'complete') season = reduceNrlSeason(season, { type: 'advance' });
    const legacy = readNrlCareerSave(JSON.stringify(season))!;
    expect(legacy.legacySeason).toBe(true);
    expect(resign(legacy)).toBe(legacy);
    expect(reload({ ...legacy, outOfWork: true })).toBeNull();
  });
});
