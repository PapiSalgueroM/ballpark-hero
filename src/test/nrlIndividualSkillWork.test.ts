import { describe, expect, it } from 'vitest';
import { createNrlCareer, readNrlCareerSave, reduceNrlCareer, runNrlFastForward, type NrlCareerState } from '@/lib/nrlCareer';
import { nrlMatchFitness } from '@/lib/nrlManager';

const advance = (state: NrlCareerState) => reduceNrlCareer(state, { type: 'advance' });
const train = (state: NrlCareerState) => reduceNrlCareer(state, { type: 'prepare', choice: 'train' });
const read = (state: NrlCareerState) => readNrlCareerSave(JSON.stringify(state));
const playerId = 'sharks-6-0';
const player = (state: NrlCareerState) => state.season.squad.find(row => row.id === playerId)!;
const potential = (state: NrlCareerState) => state.players.find(row => row.id === playerId)!.potential;
const fixture = () => train(advance(train(createNrlCareer('sharks', 5))));
const report = (state: NrlCareerState, round: number) =>
  state.season.results.find(match => match.round === round && match.playerScoring)!;
const queue = (state: NrlCareerState, id: string | null = playerId) => reduceNrlCareer(state, {
  type: 'setIndividualSkillWork', year: state.season.year, clubId: state.season.clubId, round: state.season.round, playerId: id,
});

describe('NRL individual skill work', () => {
  it('costs four kickoff fitness, saves the worked appearance, and settles once in each mode', () => {
    const usual = fixture();
    const { year, clubId, round, tactic } = usual.season;
    const queued = queue(usual);
    expect(queued.season?.individualSkillWorkId).toBe(playerId);
    expect(player(usual).name).toBe('Tane Nairn');
    expect(player(usual).rating).toBeLessThan(potential(usual));
    expect(nrlMatchFitness(usual.season, player(usual))).toBe(88);
    expect(nrlMatchFitness(queued.season, player(queued))).toBe(84);
    expect(queued.season.preparation).toBe('train');
    expect(queued.season.lineup).toBe(usual.season.lineup);
    expect(queued.finance).toBe(usual.finance);
    expect(read(queued)).toEqual(queued);
    expect(JSON.stringify(queue(queued, null))).toBe(JSON.stringify(usual));
    expect(JSON.stringify(advance(queue(queued, null)))).toBe(JSON.stringify(advance(usual)));

    const quick = advance(queued);
    expect(player(advance(usual)).fitness - player(quick).fitness).toBe(4);
    expect(report(quick, round).individualSkillWorkId).toBe(playerId);
    expect(report(advance(usual), round).individualSkillWorkId).toBeUndefined();
    expect(quick.season.individualSkillWorkId).toBeUndefined();
    expect(report(advance(quick), round + 1).individualSkillWorkId).toBeUndefined();
    expect(read(quick)).toEqual(quick);
    const reloaded = read(queued)!;
    const half = reduceNrlCareer(reloaded, { type: 'startLive' });
    expect(half.players).toBe(reloaded.players);
    expect(read(half)).toEqual(half);
    expect(queue(half, null)).toBe(half);
    const resume = reduceNrlCareer(read(half)!, { type: 'finishLive', year, round, tactic });
    expect(resume).toEqual(quick);
    expect(reduceNrlCareer(resume, { type: 'finishLive', year, round, tactic })).toBe(resume);
    const late = reduceNrlCareer(half, { type: 'reachMinute60', year, round, tactic });
    expect(late.season.live?.minute60).toBeDefined();
    expect(read(late)).toEqual(late);
    const finishedLate = reduceNrlCareer(read(late)!, { type: 'finishMinute60', year, round, tactic });
    expect(JSON.stringify(finishedLate, (key, value) => key === 'at60' ? undefined : value)).toBe(JSON.stringify(quick));
    const fast = runNrlFastForward(queued, { year, clubId, round, through: round + 1 }).state;
    expect(fast).toEqual(fast.season.round === quick.season.round ? quick : advance(quick));
  });

  it('earns one point below potential after three worked appearances and caps further work', () => {
    let usual = fixture(), worked = usual;
    const startingRating = player(usual).rating;
    for (let session = 1; session <= 3; session++) {
      const round = worked.season.round;
      const queued = queue(worked);
      expect(queued.season?.individualSkillWorkId).toBe(playerId);
      usual = advance(usual);
      worked = advance(read(queued)!);
      expect(report(worked, round).individualSkillWorkId).toBe(playerId);
      expect(report(worked, round).individualSkillGain).toBe(session === 3 ? true : undefined);
      expect(player(worked).rating - player(usual).rating).toBe(session === 3 ? 1 : 0);
    }
    expect(player(worked).rating).toBe(startingRating + 1);
    expect(player(worked).rating).toBeLessThanOrEqual(potential(worked));
    expect(report(worked, worked.season.round - 1).ratingChanges).toContainEqual([playerId, 1]);
    expect(queue(worked)).toBe(worked);
    expect(read(worked)).toEqual(worked);
    expect(read({ ...worked, season: { ...worked.season, individualSkillWorkId: playerId } })).toBeNull();
    const results = worked.season.results.map(match => match.individualSkillWorkId && !match.individualSkillGain
      ? { ...match, individualSkillWorkId: undefined } : match);
    expect(read({ ...worked, season: { ...worked.season, results } })).toBeNull();
  });

  it('records no progress for an unused player and respects recovery, reserve grade and byes', () => {
    const usual = fixture();
    const { year, clubId, round, lineup, bench } = usual.season;
    const named = new Set([...Object.values(lineup), ...(bench ?? [])]);
    const unused = usual.players.find(row => row.contract?.clubId === clubId && !named.has(row.id)
      && row.age <= 23 && row.rating < row.potential)!;
    const reserved = queue(usual, unused.id);
    expect(reserved.season.individualSkillWorkId).toBe(unused.id);
    expect(report(advance(reserved), round).individualSkillWorkId).toBeUndefined();
    const grade = reduceNrlCareer(reserved, { type: 'startReserveGrade', year, clubId, round, playerId: unused.id });
    expect(grade.season.reserveGrade?.playerId).toBe(unused.id);
    expect(grade.season.individualSkillWorkId).toBeUndefined();
    expect(queue(grade, unused.id)).toBe(grade);
    expect(read(grade)).toEqual(grade);

    const recovery = reduceNrlCareer(reserved, { type: 'setIndividualRecovery', year, clubId, round, playerId });
    expect(recovery.season.individualSkillWorkId).toBeUndefined();
    expect(queue(recovery).season.individualRecoveryId).toBeUndefined();
    const teamRecovery = reduceNrlCareer(reserved, { type: 'prepare', choice: 'recover' });
    expect(teamRecovery.season.individualSkillWorkId).toBeUndefined();
    expect(queue(teamRecovery)).toBe(teamRecovery);
    const bye = createNrlCareer('panthers', 16);
    expect(queue(bye, bye.season.lineup.Halfback)).toBe(bye);
  });
});
