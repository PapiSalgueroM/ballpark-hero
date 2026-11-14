import { describe, expect, it } from 'vitest';
import {
  createNrlCareer, nrlBoardRecruitmentQuote, nrlCareerCap, nrlCareerMarket, nrlLeagueRecruitmentPreview, nrlOffseasonFreeAgentPreview,
  nrlPrimaryRoleOptions, readNrlCareerSave, reduceNrlCareer, type NrlCareerState,
} from '@/lib/nrlCareer';
import { nrlStarterOptions, NRL_ROLES, type NrlRole } from '@/lib/nrlManager';

const advance = (state: NrlCareerState) => reduceNrlCareer(state, { type: 'advance' });
const read = (state: NrlCareerState) => readNrlCareerSave(JSON.stringify(state));
const role = 'Five-eighth' as const;
const played = (state: NrlCareerState, playerId: string, target: NrlRole = role) => state.season.results.filter(match =>
  !match.finalsRound && match.playerScoring?.starters[NRL_ROLES.indexOf(target)] === playerId).length;

function earn(year: 2026 | 2027, clubId: string, maxStarts = Infinity, target: NrlRole = role, source: NrlRole = 'Halfback') {
  let state = createNrlCareer(clubId, 4, year);
  const playerId = state.players.find(player => player.contract?.clubId === clubId && player.contract.endYear > year && player.role === source)!.id;
  state = reduceNrlCareer(state, { type: 'startPositionTraining', year, clubId, round: 1, role: target, playerId });
  expect(state.positionTraining?.playerId).toBe(playerId);
  for (let round = 0; round < 4; round++) state = advance(state);
  expect(state.players.find(player => player.id === playerId)?.secondaryRole).toBe(target);
  while (state.season.phase !== 'complete') {
    if (state.season.phase === 'regular') {
      if (played(state, playerId, target) < maxStarts) {
        if (state.season.lineup[source] === playerId) {
          const replacement = nrlStarterOptions(state.season, source).find(player => player.id !== playerId);
          if (replacement) state = reduceNrlCareer(state, { type: 'selectStarter', role: source, playerId: replacement.id });
        }
        state = reduceNrlCareer(state, { type: 'selectStarter', role: target, playerId });
      } else if (state.season.lineup[target] === playerId) {
        const replacement = nrlStarterOptions(state.season, target).find(player => player.id !== playerId);
        if (replacement) state = reduceNrlCareer(state, { type: 'selectStarter', role: target, playerId: replacement.id });
      }
    }
    state = advance(state);
  }
  return { state, playerId };
}

describe('NRL primary role changes', () => {
  it.each([[2026, 'storm'], [2027, 'bears']] as const)(
    'applies at rollover after verified starts in %s with the original game and contract history', (year, clubId) => {
      const { state, playerId } = earn(year, clubId);
      const original = state.players.find(player => player.id === playerId)!;
      const options = nrlPrimaryRoleOptions(state);
      const selected = options.find(option => option.player.id === playerId)!;
      expect(selected.starts).toBe(played(state, playerId));
      expect(selected.starts).toBeGreaterThanOrEqual(8);
      const standard = reduceNrlCareer(state, { type: 'startNextSeason' });
      const converted = reduceNrlCareer(state, { type: 'startNextSeason', primaryRole: selected.choice });
      const after = converted.players.find(player => player.id === playerId)!;
      expect(after).toMatchObject({ role, secondaryRole: 'Halfback', rating: original.rating, contract: original.contract });
      expect(standard.players.find(player => player.id === playerId)?.role).toBe('Halfback');
      expect(converted.season.squad.find(player => player.id === playerId)?.role).toBe(role);
      expect(converted.season.lineup[role]).toBe(playerId);
      expect(nrlCareerCap(converted).available).toBe(nrlCareerCap(standard).available);
      expect(converted.history).toEqual(standard.history);
      expect(converted.season.squad.filter(player => player.role === 'Halfback').every(player => player.id !== playerId)).toBe(true);
      expect(converted.season.squad.some(player => player.role === 'Halfback' && !standard.season.squad.some(old => old.role === 'Halfback' && old.id === player.id))).toBe(true);
      expect(nrlCareerMarket(converted).find(entry => entry.player.id === playerId)?.player.role).toBe(role);
      const planned = nrlOffseasonFreeAgentPreview(state, selected.choice)!;
      const rivals = nrlLeagueRecruitmentPreview(state, clubId, true, selected.choice);
      const withRecruitment = reduceNrlCareer(state, { type: 'setLeagueRecruitment', year, clubId, enabled: true });
      const settled = reduceNrlCareer(withRecruitment, { type: 'startNextSeason', primaryRole: selected.choice, freeAgents: { fromYear: year, clubId } });
      expect(settled.history.at(-1)?.freeAgentFill ?? []).toEqual(planned.signings);
      expect(settled.history.at(-1)?.leagueRecruitment).toEqual(rivals);
      expect(read(settled)).toEqual(settled);
      expect(read(converted)).toEqual(converted);
      expect(reduceNrlCareer(converted, { type: 'startNextSeason', primaryRole: selected.choice })).toBe(converted);
    });

  it('uses settled regular-season starts and rejects stale, foreign, or club-move actions', () => {
    const { state, playerId } = earn(2026, 'storm', 7);
    expect(played(state, playerId)).toBe(7);
    expect(nrlPrimaryRoleOptions(state)).toEqual([]);
    const choice = { fromYear: 2026, clubId: 'storm', playerId, fromRole: 'Halfback', toRole: role } as const;
    expect(reduceNrlCareer(state, { type: 'startNextSeason', primaryRole: choice })).toBe(state);
    const enough = earn(2026, 'storm', 8).state;
    expect(nrlPrimaryRoleOptions(enough)[0]?.starts).toBe(8);
    for (const primaryRole of [{ ...choice, fromYear: 2027 }, { ...choice, clubId: 'bears' }, { ...choice, playerId: 'unknown' },
      { ...choice, toRole: 'Hooker' as const }]) {
      expect(reduceNrlCareer(enough, { type: 'startNextSeason', primaryRole })).toBe(enough);
    }
    expect(reduceNrlCareer(enough, { type: 'startNextSeason', primaryRole: choice, move: { fromYear: 2026, clubId: 'bears' } })).toBe(enough);
    const moved = reduceNrlCareer(enough, { type: 'startNextSeason', move: { fromYear: 2026, clubId: 'bears' } });
    expect(moved.players.find(player => player.id === playerId)?.role).toBe('Halfback');
    expect(read(moved)).toEqual(moved);
  });

  it('changes the board’s primary-position cover count for a player signed beyond next season', () => {
    const { state, playerId } = earn(2026, 'storm', Infinity, 'Prop 10', 'Prop 8');
    const { choice } = nrlPrimaryRoleOptions(state).find(row => row.player.id === playerId)!;
    const balanced = reduceNrlCareer(state, { type: 'startNextSeason' });
    const converted = reduceNrlCareer(state, { type: 'startNextSeason', primaryRole: choice });
    const coverage = (career: NrlCareerState) => new Map(nrlBoardRecruitmentQuote(career).options.map(option => [option.role, option.count]));
    expect([coverage(balanced).get('Prop 8'), coverage(balanced).get('Prop 10')]).toEqual([1, 0]);
    expect([coverage(converted).get('Prop 8'), coverage(converted).get('Prop 10')]).toEqual([0, 1]);
    expect(converted.history).toEqual(balanced.history);
    expect(read(converted)).toEqual(converted);
  });
});
