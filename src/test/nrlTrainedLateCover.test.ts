import { describe, expect, it } from 'vitest';
import { createNrlCareer, readNrlCareerSave, reduceNrlCareer, type NrlCareerState } from '@/lib/nrlCareer';
import { nrlMinute60Interchanges } from '@/lib/nrlManager';

const bytes = JSON.stringify;
const read = (state: NrlCareerState) => readNrlCareerSave(bytes(state));

function trainedLate(clubId: string, year: 2026 | 2027, seed: number) {
  const playerId = clubId + '-5-1';
  let before = createNrlCareer(clubId, seed, year);
  before = reduceNrlCareer(before, { type: 'startPositionTraining', year, clubId, round: 1, playerId, role: 'Fullback' });
  for (let i = 0; i < 4; i++) before = reduceNrlCareer(before, { type: 'advance' });
  expect(before.season.squad.find(player => player.id === playerId)?.secondaryRole).toBe('Fullback');
  before = reduceNrlCareer(before, { type: 'selectBench', slot: 5, playerId });
  const { round, tactic } = before.season;
  before = reduceNrlCareer(before, { type: 'setOpenInterchange', year, clubId, round, enabled: true });
  const start = (state: NrlCareerState) => {
    const live = reduceNrlCareer(state, { type: 'startLive' });
    return reduceNrlCareer(live, { type: 'reachMinute60', year, round, tactic });
  };
  return { before, start, playerId, round, tactic };
}

describe('NRL trained late cover', () => {
  it.each([['storm', 2026, 33, [14, 52], [14, 50]], ['bears', 2027, 68, [6, 14], [6, 20]]] as const)(
    'lets the same unused %s reserve cover either actual role after reload', (clubId, year, seed, normalScore, trainedScore) => {
      const { before, start, playerId, round, tactic } = trainedLate(clubId, year, seed);
      const paused = start(before);
      expect(read(paused)).toEqual(paused);
      const options = nrlMinute60Interchanges(paused.season).filter(option => option.reserveId === playerId);
      expect(options.map(option => option.role)).toEqual(['Right Wing', 'Fullback']);
      const finish = { type: 'finishMinute60', year, round, tactic } as const;
      const regular = reduceNrlCareer(paused, { ...finish, reserveId: playerId });
      const applied = reduceNrlCareer(read(paused)!, { ...finish, reserveId: playerId, reserveRole: 'Fullback' });
      const idle = reduceNrlCareer(paused, finish);
      const receipt = (state: NrlCareerState) => state.season.results.find(match => match.round === round && match.playerScoring)!;
      const match = receipt(applied), baseline = receipt(idle);
      expect(receipt(regular).minute60Interchange?.starterId).toBe(paused.season.lineup['Right Wing']);
      expect(match.minute60Interchange).toEqual({ reserveId: playerId, starterId: paused.season.lineup.Fullback });
      expect(match.benchUsed).toHaveLength(4);
      expect(match.scorePeriods?.at60).toEqual(baseline.scorePeriods?.at60);
      expect([baseline.homeScore, baseline.awayScore]).toEqual(normalScore);
      expect([match.homeScore, match.awayScore]).toEqual(trainedScore);
      expect(bytes(read(applied))).toBe(bytes(applied));
      const forged = { ...applied, season: { ...applied.season, results: applied.season.results.map(row =>
        row === match ? { ...match, minute60Interchange: { reserveId: playerId, starterId: paused.season.lineup.Hooker } } : row) } };
      expect(read(forged)).toBeNull();
      const foreignId = 'foreign-reserve';
      const unknown = { ...applied, season: { ...applied.season, results: applied.season.results.map(row => row === match ? {
        ...match, benchUsed: match.benchUsed?.map(id => id === playerId ? foreignId : id),
        minute60Interchange: { ...match.minute60Interchange!, reserveId: foreignId },
      } : row) } };
      expect(read(unknown)).toBeNull();
      expect(reduceNrlCareer(paused, { ...finish, reserveId: playerId, reserveRole: 'Hooker' })).toBe(paused);
      expect(reduceNrlCareer(paused, { ...finish, reserveRole: 'Fullback' })).toBe(paused);
      const repeat = reduceNrlCareer(applied, { type: 'startPositionTraining', year, clubId, round: round + 1, playerId, role: 'Right Centre' });
      expect(repeat).toBe(applied);
      const later = reduceNrlCareer(repeat, { type: 'advance' });
      expect(later.season.results.find(row => row.round === round && row.playerScoring)).toEqual(match);
      expect(read(later)).toEqual(later);
    });

  it('will not substitute a kicker or add an appearance beyond the opening cap', () => {
    const { before, start, playerId } = trainedLate('storm', 2026, 33);
    const withKicker = reduceNrlCareer(before, { type: 'setKicker', playerId: before.season.lineup.Fullback });
    const choices = nrlMinute60Interchanges(start(withKicker).season).filter(option => option.reserveId === playerId);
    expect(choices.map(option => option.role)).toEqual(['Right Wing']);
    const { year, clubId, round } = before.season;
    const full = reduceNrlCareer(before, { type: 'setOpenInterchange', year, clubId, round, enabled: false });
    expect(nrlMinute60Interchanges(start(full).season)).toEqual([]);
  });
});
