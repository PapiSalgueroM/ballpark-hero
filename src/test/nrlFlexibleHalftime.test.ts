import { expect, it } from 'vitest';
import { createNrlCareer, readNrlCareerSave, reduceNrlCareer, type NrlCareerState } from '@/lib/nrlCareer';
import { nrlBenchRotation, nrlCanPairHalftimeInterchanges, nrlHalftimeInterchanges, nrlMinute60Interchanges } from '@/lib/nrlManager';

const read = (state: NrlCareerState) => readNrlCareerSave(JSON.stringify(state));
const result = (state: NrlCareerState) => state.season.results.find(match => match.playerScoring)!;
const live = (state: NrlCareerState) => reduceNrlCareer(state, { type: 'startLive' });

it.each([[2026, 'broncos'], [2027, 'bears']] as const)(
  'uses any eligible unused reserve from the open place after halftime in %i',
  (year, clubId) => {
    const first = createNrlCareer(clubId, 16, year);
    const { season } = first;
    const context = { year, round: season.round, tactic: season.tactic };
    const initial = reduceNrlCareer(first, { type: 'setOpenInterchange', year, round: season.round, clubId, enabled: true });
    const pause = live(initial);
    const planned = nrlBenchRotation(pause.season);
    expect(planned.size).toBe(3);
    const options = nrlHalftimeInterchanges(pause.season);
    const entrants = options.filter(option => option.enteredAtHalf);
    const expected = pause.season.bench!.flatMap(reserveId => {
      const reserve = pause.season.squad.find(row => row.id === reserveId)!;
      const starterId = pause.season.lineup[reserve.role];
      return planned.has(starterId) || starterId === pause.season.kickerId ? [] : [{ starterId, reserveId, role: reserve.role, enteredAtHalf: true }];
    });
    expect(expected.length).toBeGreaterThan(1);
    expect(entrants).toEqual(expected);
    expect(nrlHalftimeInterchanges(live(first).season).some(option => option.enteredAtHalf)).toBe(false);
    const [pick, alternative] = entrants;
    expect(nrlCanPairHalftimeInterchanges(pause.season, pick, alternative)).toBe(false);
    const rotating = options.find(option => !option.enteredAtHalf)!;
    expect(nrlCanPairHalftimeInterchanges(pause.season, pick, rotating)).toBe(true);

    const advance = { type: 'reachMinute60', ...context } as const;
    const finish = { type: 'finishMinute60', ...context } as const;
    const ordinary = reduceNrlCareer(pause, advance);
    expect(nrlMinute60Interchanges(ordinary.season)).toEqual(expect.arrayContaining([expect.objectContaining({ reserveId: pick.reserveId })]));
    expect(reduceNrlCareer(pause, { ...advance, interchange: pick, secondInterchange: alternative })).toBe(pause);
    const selected = reduceNrlCareer(pause, { ...advance, interchange: pick, secondInterchange: rotating });
    expect(read(selected)).toEqual(selected);
    expect(nrlMinute60Interchanges(selected.season)).toEqual([]);
    expect(reduceNrlCareer(selected, { ...finish, reserveId: alternative.reserveId })).toBe(selected);
    const unused = reduceNrlCareer(reduceNrlCareer(pause, { ...advance, interchange: rotating }), finish);
    const played = reduceNrlCareer(read(selected)!, finish);
    const receipt = result(played);
    expect(receipt.scorePeriods?.halfTime).toEqual(result(unused).scorePeriods?.halfTime);
    expect(played.season.results.filter(row => !row.playerScoring)).toEqual(unused.season.results.filter(row => !row.playerScoring));
    expect(receipt.halftimeInterchange).toEqual({ starterId: pick.starterId, reserveId: pick.reserveId, enteredAtHalf: true });
    expect(receipt.secondHalftimeInterchange).toEqual({ starterId: rotating.starterId, reserveId: rotating.reserveId });
    expect(receipt.benchUsed).toEqual([...planned.values()].map(row => row.id).concat(pick.reserveId));
    expect(receipt.minute60Interchange).toBeUndefined();
    const fitness = (state: NrlCareerState, id: string) => state.season.squad.find(row => row.id === id)?.fitness ?? 0;
    expect(fitness(played, pick.starterId) - fitness(unused, pick.starterId)).toBe(7);
    expect(fitness(unused, pick.reserveId) - fitness(played, pick.reserveId)).toBe(8);
    expect(read(played)).toEqual(played);
    const forged = { ...played, season: { ...played.season, results: played.season.results.map(match => match === receipt
      ? { ...match, secondHalftimeInterchange: { ...receipt.secondHalftimeInterchange, enteredAtHalf: true as const } } : match) } };
    expect(read(forged)).toBeNull();
  },
);

it('changes the actual second half while retaining the score and match report through later rounds', () => {
  const year = 2026, clubId = 'storm', round = 1;
  const original = createNrlCareer(clubId, 13, year);
  const planned = reduceNrlCareer(original, { type: 'setOpenInterchange', year, clubId, round, enabled: true });
  const paused = live(planned);
  const option = nrlHalftimeInterchanges(paused.season).find(row => row.enteredAtHalf && row.reserveId === 'storm-11-1')!;
  expect(option).toBeDefined();
  const play = { type: 'finishLive', year, round, tactic: original.season.tactic } as const;
  const unchanged = result(reduceNrlCareer(paused, play));
  const after = reduceNrlCareer(paused, { ...play, interchange: option });
  const savedMatch = result(after);
  expect([unchanged.homeScore, unchanged.awayScore]).toEqual([36, 6]);
  expect([savedMatch.homeScore, savedMatch.awayScore]).toEqual([30, 6]);
  expect(savedMatch.scorePeriods?.halfTime).toEqual(unchanged.scorePeriods?.halfTime);
  const later = read(reduceNrlCareer(after, { type: 'advance' }))!;
  expect(result(later)).toEqual(savedMatch);
});

it('requires the named backup to stay on before using the open place to replace the kicker', () => {
  const year = 2026, clubId = 'broncos', round = 1;
  const initial = createNrlCareer(clubId, 16, year);
  const open = reduceNrlCareer(initial, { type: 'setOpenInterchange', year, clubId, round, enabled: true });
  const target = nrlHalftimeInterchanges(live(open).season).find(row => row.enteredAtHalf)!;
  const primary = reduceNrlCareer(open, { type: 'setKicker', playerId: target.starterId });
  const backup = nrlHalftimeInterchanges(live(primary).season).find(row => !row.enteredAtHalf)!.starterId;
  expect(nrlHalftimeInterchanges(live(primary).season).some(row => row.reserveId === target.reserveId)).toBe(false);
  const appointed = reduceNrlCareer(primary, { type: 'setBackupKicker', year, clubId, round, playerId: backup });
  const paused = live(appointed);
  const available = nrlHalftimeInterchanges(paused.season);
  expect(available).toContainEqual(target);
  const alsoRemoveBackup = available.find(row => row.starterId === backup)!;
  expect(nrlCanPairHalftimeInterchanges(paused.season, target, alsoRemoveBackup)).toBe(false);
  const action = { type: 'finishLive', year, round, tactic: paused.season.tactic, interchange: target } as const;
  expect(reduceNrlCareer(paused, { ...action, secondInterchange: alsoRemoveBackup })).toBe(paused);
  const settled = reduceNrlCareer(paused, action);
  const receipt = result(settled);
  expect(receipt.halftimeInterchange?.enteredAtHalf).toBe(true);
  expect(receipt.playerScoring?.kickerHandoff?.playerId).toBe(backup);
  expect(read(settled)).toEqual(settled);
});
