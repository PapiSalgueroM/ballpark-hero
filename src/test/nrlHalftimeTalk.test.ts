import { describe, expect, it } from 'vitest';
import { createNrlCareer, readNrlCareerSave, reduceNrlCareer, type NrlCareerState } from '@/lib/nrlCareer';
import { createNrlSeason, nrlHalftimeInterchanges, nrlNextRound, type NrlHalftimeInterchange, type NrlHalftimeTalk } from '@/lib/nrlManager';

const start = (state: NrlCareerState) => reduceNrlCareer(state, { type: 'startLive' });
const quick = (state: NrlCareerState) => reduceNrlCareer(state, { type: 'advance' });
const finish = (state: NrlCareerState, talk?: NrlHalftimeTalk, interchange?: NrlHalftimeInterchange) => reduceNrlCareer(state, {
  type: 'finishLive', year: state.season.year, round: state.season.round, tactic: state.season.tactic, talk, interchange,
});
const result = (state: NrlCareerState, round: number) => state.season.results.find(match =>
  match.round === round && (match.homeId === state.season.clubId || match.awayId === state.season.clubId))!;
const bytes = JSON.stringify;
const reload = (state: NrlCareerState) => readNrlCareerSave(bytes(state));

describe('NRL half-time team talk', () => {
  it.each([
    [2026, 'broncos', 1, [22, 8], [28, 8], [16, 8]],
    [2027, 'bears', 7, [16, 40], [16, 44], [10, 40]],
  ] as const)('changes the managed %s score under the same first half and skips every other fixture', (year, clubId, seed, ordinary, tempo, basics) => {
    const initial = createNrlCareer(clubId, seed, year);
    const pending = start(initial);
    const raw = bytes(pending);
    const restored = reload(pending)!;
    const baseline = finish(restored);
    const talked = finish(restored, 'liftTempo');
    const reinforced = finish(restored, 'reinforceBasics');
    const score = (career: NrlCareerState) => {
      const match = result(career, 1);
      return [match.homeScore, match.awayScore];
    };
    expect(score(baseline)).toEqual(ordinary);
    expect(score(talked)).toEqual(tempo);
    expect(score(reinforced)).toEqual(basics);
    expect(bytes(restored)).toBe(raw);
    expect(bytes(baseline)).toBe(bytes(quick(initial)));
    expect(result(baseline, 1)).not.toHaveProperty('halftimeTalk');
    expect(result(talked, 1).halftimeTalk).toBe('liftTempo');
    const rest = (state: NrlCareerState) => state.season.results.filter(match => match !== result(state, 1));
    expect(rest(talked)).toEqual(rest(baseline));
    expect(talked.season.tactic).toBe(initial.season.tactic);
    expect(reload(talked)).toStrictEqual(talked);
    expect(finish(talked, 'liftTempo')).toBe(talked);
  });

  it('leaves an older imported career on its ordinary save and match path', () => {
    const initial = readNrlCareerSave(bytes(createNrlSeason('storm', 4)))!;
    const before = bytes(initial);
    expect(start(initial)).toBe(initial);
    expect(finish(initial, 'liftTempo')).toBe(initial);
    expect(bytes(reload(initial))).toBe(before);
    const settled = quick(initial);
    expect(result(settled, 1)).not.toHaveProperty('halftimeTalk');
    expect(bytes(reload(settled))).toBe(bytes(settled));
  });

  it('combines a real finals talk with a valid interchange and rejects an invalid tone or unrelated receipt', () => {
    let initial = createNrlCareer('storm', 4);
    while (!nrlNextRound(initial.season).clubMatch?.finalsRound) initial = quick(initial);
    const pending = start(initial);
    const { round, year } = pending.season;
    const interchange = nrlHalftimeInterchanges(pending.season)[0];
    expect(interchange).toBeDefined();
    expect(finish(pending, 'never' as NrlHalftimeTalk)).toBe(pending);
    const talked = reduceNrlCareer(reload(pending)!, {
      type: 'finishLive', year, round, tactic: 'defense', talk: 'reinforceBasics', interchange,
    });
    const managed = result(talked, round);
    expect(managed.finalsRound).toBeDefined();
    expect(managed).toMatchObject({
      halftimeTalk: 'reinforceBasics', halftimeInterchange: { starterId: interchange.starterId, reserveId: interchange.reserveId },
    });
    expect(talked.season.tactic).toBe(pending.season.tactic);
    expect(readNrlCareerSave(bytes(talked))).toStrictEqual(talked);
    const corrupt = (update: (match: typeof managed) => typeof managed) => reload({
      ...talked, season: { ...talked.season, results: talked.season.results.map(update) },
    });
    expect(corrupt(match => match === managed ? { ...match, halftimeTalk: 'never' as NrlHalftimeTalk } : match)).toBeNull();
    expect(corrupt(match => match.round === round && match !== managed ? { ...match, halftimeTalk: 'liftTempo' } : match)).toBeNull();
    expect(corrupt(match => match === managed ? { ...match, playerScoring: undefined } : match)).toBeNull();
    expect(reduceNrlCareer(talked, { type: 'finishLive', year, round, tactic: 'balanced', talk: 'liftTempo' })).toBe(talked);
  });

  it('does not give either side the talk bonus in Golden Point when both routes reach it', () => {
    // Both tone settings leave this fixture tied after regulation. The tiebreak uses the ordinary closing edges.
    const pending = start(createNrlCareer('storm', 29));
    const baseline = result(finish(pending), 1);
    const talked = result(finish(pending, 'liftTempo'), 1);
    expect(baseline.extraTime).toBe(true);
    expect(talked.extraTime).toBe(true);
    expect(baseline.goldenPoint).toEqual({ period: 1, score: 'fieldGoals' });
    expect(talked.goldenPoint).toEqual(baseline.goldenPoint);
    expect([talked.homeScore, talked.awayScore]).toEqual([baseline.homeScore, baseline.awayScore]);
  });
});
