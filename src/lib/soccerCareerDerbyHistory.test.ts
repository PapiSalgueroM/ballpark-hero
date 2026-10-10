import { afterEach, describe, expect, it, vi } from 'vitest';
import * as Derby from './soccerCareerDerby';
import { savedDerbyHistory, savedDerbyRivalRecords } from './soccerCareerDerbyHistory';

const meeting = (patch: Record<string, unknown> = {}) => ({
  home: true, gf: 2, ga: 1, played: true, goals: 1, won: true, ...patch,
});
const derby = (patch: Record<string, unknown> = {}) => ({
  rival: 'Hill FC', name: 'Harbor derby', kind: 'derby', meetings: [meeting()], ...patch,
});
const row = (patch: Record<string, unknown> = {}) => ({
  type: 'playing', year: 2026, age: 24, club: 'Harbor FC', onLoanFrom: 'Parent FC',
  apps: 30, goals: 12, derbies: [derby()], ...patch,
});
const history = (season = row()) => savedDerbyHistory({ seasons: [season] });

afterEach(() => vi.restoreAllMocks());

describe('saved derby history', () => {
  it('separates every saved club result from the meetings the player appeared in', () => {
    const saved = row({ derbies: [
      derby({ meetings: [meeting(), meeting({ home: false, gf: 0, ga: 2, goals: 0, won: undefined })] }),
      derby({ rival: 'Valley FC', name: 'Local rivalry', kind: 'rivalry', meetings: [
        meeting({ gf: 1, ga: 1, played: false, goals: 0, won: undefined }),
        meeting({ home: false, gf: 3, ga: 0, played: false, goals: 0, won: undefined }),
      ] }),
    ] });
    const actual = history(saved);
    expect(actual.team).toEqual({ meetings: 4, w: 2, d: 1, l: 1 });
    expect(actual.player).toEqual({ played: 2, w: 1, d: 0, l: 1, goals: 1 });
    expect(actual.missed).toBe(2);
    expect(actual.seasons[0]).toMatchObject({
      seasonIndex: 0, status: 'saved', meetingCount: 4,
      team: actual.team, player: actual.player, missed: 2,
    });
    expect(actual.meetings.map(m => [m.rivalIndex, m.meetingIndex, m.result, m.played, m.goals]))
      .toEqual([[0, 0, 'W', true, 1], [0, 1, 'L', true, 0], [1, 0, 'D', false, 0], [1, 1, 'W', false, 0]]);
  });

  it('keeps club-side scores and orients the home and away display without flipping the result', () => {
    const actual = history(row({ derbies: [derby({ meetings: [
      meeting(), meeting({ home: false, gf: 3, ga: 2 }),
    ] })] }));
    expect(actual.meetings[0]).toMatchObject({
      home: true, gf: 2, ga: 1, result: 'W', homeClub: 'Harbor FC', awayClub: 'Hill FC', homeGoals: 2, awayGoals: 1,
    });
    expect(actual.meetings[1]).toMatchObject({
      home: false, gf: 3, ga: 2, result: 'W', homeClub: 'Hill FC', awayClub: 'Harbor FC', homeGoals: 2, awayGoals: 3,
    });
  });

  it('preserves original season, rival and meeting identities across duplicate years and club moves', () => {
    const actual = savedDerbyHistory({ seasons: [
      row({ type: 'youth' }),
      row({ club: 'Old FC', derbies: [derby(), derby({ rival: 'Valley FC' })] }),
      row({ type: 'manager' }),
      row({ type: 'retired' }),
      row({ club: 'New FC', onLoanFrom: null, derbies: [derby({ meetings: [
        meeting({ won: undefined }), meeting({ home: false, won: undefined }),
      ] })] }),
    ] });
    expect(actual.seasons.map(s => [s.seasonIndex, s.year, s.club, s.onLoanFrom]))
      .toEqual([[1, 2026, 'Old FC', 'Parent FC'], [4, 2026, 'New FC', null]]);
    expect(actual.meetings.map(m => [m.seasonIndex, m.rivalIndex, m.meetingIndex]))
      .toEqual([[1, 0, 0], [1, 1, 0], [4, 0, 0], [4, 0, 1]]);
  });

  it('retains repeated saved rival entries without merging names or aliases', () => {
    const actual = history(row({ derbies: [
      derby({ rival: 'Hill FC' }), derby({ rival: 'Hill FC' }),
      derby({ rival: 'Hill Football Club', name: 'Saved spelling' }),
    ] }));
    expect(actual.meetings.map(m => [m.rivalIndex, m.rival, m.name]))
      .toEqual([[0, 'Hill FC', 'Harbor derby'], [1, 'Hill FC', 'Harbor derby'], [2, 'Hill Football Club', 'Saved spelling']]);
    expect(actual.team.meetings).toBe(3);
  });

  it('keeps all-missed zero-appearance seasons selectable and counts their team outcomes', () => {
    const actual = history(row({ apps: 0, goals: 0, derbies: [derby({ meetings: [
      meeting({ played: false, goals: 0, won: undefined }),
      meeting({ home: false, gf: 0, ga: 0, played: false, goals: 0, won: undefined }),
    ] })] }));
    expect(actual.seasons[0].status).toBe('saved');
    expect(actual.seasons[0].meetingCount).toBe(2);
    expect(actual.team).toEqual({ meetings: 2, w: 1, d: 1, l: 0 });
    expect(actual.player).toEqual({ played: 0, w: 0, d: 0, l: 0, goals: 0 });
    expect(actual.missed).toBe(2);
  });

  it('keeps a real recorded zero score and zero personal goals', () => {
    const actual = history(row({ goals: 0, derbies: [derby({ meetings: [
      meeting({ gf: 0, ga: 0, goals: 0, won: undefined }),
    ] })] }));
    expect(actual.meetings[0]).toMatchObject({ gf: 0, ga: 0, goals: 0, won: false, result: 'D' });
    expect(actual.player).toEqual({ played: 1, w: 0, d: 1, l: 0, goals: 0 });
  });

  it('marks absent old derby data as unrecorded and explicit empty data as empty', () => {
    const old = row();
    delete (old as { derbies?: unknown }).derbies;
    const actual = savedDerbyHistory({ seasons: [old, row({ derbies: undefined }), row({ derbies: [] })] });
    expect(actual.seasons.map(s => s.status)).toEqual(['unrecorded', 'unrecorded', 'empty']);
    expect(actual.meetings).toEqual([]);
    expect(actual.team).toEqual({ meetings: 0, w: 0, d: 0, l: 0 });
    expect(actual.player).toEqual({ played: 0, w: 0, d: 0, l: 0, goals: 0 });
  });

  it.each([null, false, 0, '', {}, 'not saved'])('marks non-array derby data %j as invalid', derbies => {
    const actual = history(row({ derbies }));
    expect(actual.seasons[0].status).toBe('invalid');
    expect(actual.meetings).toEqual([]);
    expect(actual.team.meetings).toBe(0);
  });

  it('reads missing season metadata as unknown without borrowing the current club', () => {
    const actual = history(row({ year: undefined, age: undefined, club: undefined, onLoanFrom: undefined }));
    expect(actual.seasons[0]).toMatchObject({ year: null, age: null, club: null, onLoanFrom: null, status: 'saved' });
    expect(actual.meetings[0]).toMatchObject({ homeClub: null, awayClub: 'Hill FC', homeGoals: 2, awayGoals: 1 });
  });

  it('keeps explicitly saved zero numeric metadata and the exact club spelling', () => {
    const actual = history(row({ year: 0, age: 0, club: ' Harbor FC ' }));
    expect(actual.seasons[0]).toMatchObject({ year: 0, age: 0, club: ' Harbor FC ' });
  });

  it.each([
    { year: '2026', age: NaN, club: '', onLoanFrom: ' ' },
    { year: Infinity, age: -1, club: 5, onLoanFrom: false },
    { year: Number.MAX_SAFE_INTEGER + 1, age: 24.5, club: null, onLoanFrom: {} },
  ])('does not coerce invalid metadata into a saved fact %j', patch => {
    expect(history(row(patch)).seasons[0]).toMatchObject({ year: null, age: null, club: null, onLoanFrom: null, status: 'saved' });
  });

  it.each([
    ['negative score', derby({ meetings: [meeting({ gf: -1 })] })],
    ['fractional score', derby({ meetings: [meeting({ ga: 1.5 })] })],
    ['nonfinite score', derby({ meetings: [meeting({ gf: Infinity })] })],
    ['score beyond existing reader', derby({ meetings: [meeting({ ga: 100 })] })],
    ['negative personal goals', derby({ meetings: [meeting({ goals: -1 })] })],
    ['string personal goals', derby({ meetings: [meeting({ goals: '1' })] })],
    ['nonboolean venue', derby({ meetings: [meeting({ home: 'home' })] })],
    ['nonboolean appearance', derby({ meetings: [meeting({ played: 1 })] })],
    ['false winning-goal marker', derby({ meetings: [meeting({ won: false })] })],
    ['empty rival', derby({ rival: '' })],
    ['blank rival', derby({ rival: ' ' })],
    ['empty name', derby({ name: '' })],
    ['blank name', derby({ name: ' ' })],
    ['unknown kind', derby({ kind: 'final' })],
    ['empty meetings', derby({ meetings: [] })],
    ['invalid meeting', derby({ meetings: [null] })],
  ])('rejects a whole season with %s instead of keeping a valid partial derby', (_name, invalid) => {
    const actual = history(row({ derbies: [derby(), invalid] }));
    expect(actual.seasons[0].status).toBe('invalid');
    expect(actual.seasons[0].meetingCount).toBe(0);
    expect(actual.meetings).toEqual([]);
    expect(actual.team.meetings).toBe(0);
  });

  it.each([
    ['more personal goals than club goals', meeting({ gf: 1, goals: 2 })],
    ['personal goal in a missed fixture', meeting({ played: false, goals: 1, won: undefined })],
    ['winning goal in a missed fixture', meeting({ played: false, goals: 0 })],
    ['winning goal without a personal goal', meeting({ goals: 0 })],
    ['winning goal in a draw', meeting({ gf: 2, ga: 2 })],
    ['winning goal in a loss', meeting({ gf: 1, ga: 2 })],
  ])('rejects impossible saved relationships: %s', (_name, invalid) => {
    const actual = history(row({ derbies: [derby({ meetings: [meeting(), invalid] })] }));
    expect(actual.seasons[0].status).toBe('invalid');
    expect(actual.meetings).toEqual([]);
    expect(actual.player.played).toBe(0);
  });

  it.each([
    ['no saved appearances', { apps: 0 }],
    ['fewer appearances than played derbies', { apps: 1 }],
    ['fewer season goals than derby personal goals', { goals: 1 }],
  ] as const)('rejects %s when that complete season count was recorded', (_name, patch) => {
    const actual = history(row({ ...patch, derbies: [derby({ meetings: [meeting(), meeting()] })] }));
    expect(actual.seasons[0].status).toBe('invalid');
    expect(actual.team.meetings).toBe(0);
    expect(actual.player.played).toBe(0);
  });

  it.each([
    { apps: undefined, goals: undefined },
    { apps: '0', goals: '0' },
    { apps: NaN, goals: Infinity },
    { apps: -1, goals: -1 },
    { apps: 0.5, goals: Number.MAX_SAFE_INTEGER + 1 },
  ])('does not treat unknown parent totals as zero %j', patch => {
    const actual = history(row(patch));
    expect(actual.seasons[0].status).toBe('saved');
    expect(actual.team.meetings).toBe(1);
    expect(actual.player.goals).toBe(1);
  });

  it('isolates an invalid season while retaining the exact saved identities in other seasons', () => {
    const actual = savedDerbyHistory({ seasons: [row(), row({ derbies: [null] }), row()] });
    expect(actual.seasons.map(s => s.status)).toEqual(['saved', 'invalid', 'saved']);
    expect(actual.meetings.map(m => m.seasonIndex)).toEqual([0, 2]);
    expect(actual.team).toEqual({ meetings: 2, w: 2, d: 0, l: 0 });
    expect(actual.player.goals).toBe(2);
  });

  it.each(['rival removed', 'meeting removed', 'rival reordered', 'meeting reordered', 'score rewritten'])(
    'reports an existing-reader identity loss: %s', change => {
      const saved = row({ derbies: [
        derby({ meetings: [meeting(), meeting({ home: false, gf: 1, ga: 0, won: undefined })] }),
        derby({ rival: 'Valley FC' }),
      ] });
      const accepted = Derby.readSeasonDerbies(saved);
      const changed = structuredClone(accepted);
      if (change === 'rival removed') changed.pop();
      if (change === 'meeting removed') changed[0].meetings.pop();
      if (change === 'rival reordered') changed.reverse();
      if (change === 'meeting reordered') changed[0].meetings.reverse();
      if (change === 'score rewritten') changed[0].meetings[0].gf += 1;
      vi.spyOn(Derby, 'readSeasonDerbies').mockReturnValue(changed);
      const actual = history(saved);
      expect(actual.seasons[0].status).toBe('invalid');
      expect(actual.meetings).toEqual([]);
    },
  );

  it('ignores nonplaying rows and does not infer fixtures when a senior season has no derby data', () => {
    const actual = savedDerbyHistory({ seasons: [null, false, row({ type: 'youth' }), row({ type: 'manager' }), row({ type: 'retired' }), row({ derbies: undefined })] });
    expect(actual.seasons.map(s => s.seasonIndex)).toEqual([5]);
    expect(actual.meetings).toEqual([]);
  });

  it('keeps every input field and uses no random draw or current clock', () => {
    const source = { seasons: [row(), row({ derbies: undefined })], untouched: { list: [0, false, null] } };
    const before = structuredClone(source), bytes = JSON.stringify(source);
    vi.spyOn(Math, 'random').mockImplementation(() => { throw new Error('Global RNG must stay untouched'); });
    vi.spyOn(Date, 'now').mockImplementation(() => { throw new Error('Current clock must stay untouched'); });
    const first = savedDerbyHistory(source), second = savedDerbyHistory(source);
    expect(second).toEqual(first);
    expect(source).toEqual(before);
    expect(JSON.stringify(source)).toBe(bytes);
    expect(Math.random).not.toHaveBeenCalled();
    expect(Date.now).not.toHaveBeenCalled();
  });

  it('does not access awards, award ranks, current overall or the current club', () => {
    const saved = row();
    for (const key of ['ballonDor', 'ballonDorRank']) Object.defineProperty(saved, key, {
      get() { throw new Error('Award facts must not be read'); },
    });
    const source = { seasons: [saved] };
    for (const key of ['awards', 'pendingBallonDor', 'currentClub', 'overall']) Object.defineProperty(source, key, {
      get() { throw new Error('Current career facts must not be read'); },
    });
    expect(savedDerbyHistory(source).seasons[0].status).toBe('saved');
  });
});

describe('saved rival career records', () => {
  it('uses the same team and player split across different saved clubs and years', () => {
    const saved = savedDerbyHistory({ seasons: [
      row({ derbies: [
        derby({ meetings: [meeting(), meeting({ played: false, gf: 1, ga: 1, goals: 0, won: undefined })] }),
        derby({ rival: 'Valley FC', meetings: [meeting({ gf: 0, ga: 2, goals: 0, won: undefined })] }),
      ] }),
      row({ year: 2027, club: 'New FC', derbies: [derby({ rival: 'Valley FC' })] }),
      row({ year: 2029, derbies: [derby({ meetings: [meeting({ home: false, played: false, goals: 0, won: undefined })] })] }),
    ] });
    const groups = savedDerbyRivalRecords(saved);
    expect(groups.map(g => g.rival)).toEqual(['Hill FC', 'Valley FC']);
    expect(groups[0].team).toEqual({ meetings: 3, w: 2, d: 1, l: 0 });
    expect(groups[0].player).toEqual({ played: 1, w: 1, d: 0, l: 0, goals: 1 });
    expect(groups[0].missed).toBe(2);
    expect(groups[1].team).toEqual({ meetings: 2, w: 1, d: 0, l: 1 });
    expect(groups[1].player).toEqual({ played: 2, w: 1, d: 0, l: 1, goals: 1 });
    expect(groups[1].missed).toBe(0);
  });

  it('groups exact names without merging aliases, case or object-prototype names', () => {
    const saved = history(row({ derbies: [
      derby(), derby({ rival: 'Hill Football Club' }), derby({ rival: 'hill FC' }),
      derby({ rival: 'toString' }), derby(),
    ] }));
    const groups = savedDerbyRivalRecords(saved);
    expect(groups.map(g => [g.rival, g.team.meetings])).toEqual([
      ['Hill FC', 2], ['Hill Football Club', 1], ['hill FC', 1], ['toString', 1],
    ]);
  });

  it('preserves first occurrence order rather than sorting rival names', () => {
    const saved = history(row({ derbies: [derby({ rival: 'Zed FC' }), derby({ rival: 'Alpha FC' }), derby({ rival: 'Zed FC' })] }));
    expect(savedDerbyRivalRecords(saved).map(g => g.rival)).toEqual(['Zed FC', 'Alpha FC']);
  });

  it('keeps all three original indices and the exact saved meeting order for rival details', () => {
    const saved = savedDerbyHistory({ seasons: [
      row({ type: 'youth' }),
      row({ derbies: [derby({ rival: 'Valley FC' }), derby({ meetings: [
        meeting(), meeting({ home: false, gf: 1, ga: 0, won: undefined }),
      ] })] }),
      row({ type: 'manager' }),
      row({ club: 'New FC', derbies: [derby()] }),
    ] });
    const group = savedDerbyRivalRecords(saved).find(g => g.rival === 'Hill FC')!;
    expect(group.meetings.map(m => [m.seasonIndex, m.rivalIndex, m.meetingIndex, m.year, m.club]))
      .toEqual([[1, 1, 0, 2026, 'Harbor FC'], [1, 1, 1, 2026, 'Harbor FC'], [3, 0, 0, 2026, 'New FC']]);
    expect(group.meetings[1]).toMatchObject({ home: false, homeClub: 'Hill FC', awayClub: 'Harbor FC', homeGoals: 0, awayGoals: 1 });
  });

  it('adds no groups for unrecorded, empty or invalid saved seasons', () => {
    const saved = savedDerbyHistory({ seasons: [row({ derbies: undefined }), row({ derbies: [] }), row({ derbies: [null] })] });
    expect(savedDerbyRivalRecords(saved)).toEqual([]);
  });

  it('does not mutate accepted history or consume a draw while building rival records', () => {
    const saved = history(), before = structuredClone(saved);
    vi.spyOn(Math, 'random').mockImplementation(() => { throw new Error('Grouping must not draw'); });
    vi.spyOn(Date, 'now').mockImplementation(() => { throw new Error('Grouping must not read the clock'); });
    const first = savedDerbyRivalRecords(saved), second = savedDerbyRivalRecords(saved);
    expect(second).toEqual(first);
    expect(saved).toEqual(before);
    expect(Math.random).not.toHaveBeenCalled();
    expect(Date.now).not.toHaveBeenCalled();
    first[0].meetings[0].gf = 99;
    first[0].team.w = 99;
    expect(saved).toEqual(before);
  });
});
