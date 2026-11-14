import { expect, it } from 'vitest';
import { createNrlCareer, nrlCareerCap, nrlCareerSquad, nrlOffseasonFreeAgentPreview, nrlOffseasonFreeAgentTargets, nrlRetentionPriority,
  readNrlCareerSave, reduceNrlCareer, type NrlCareerState } from '@/lib/nrlCareer';
import { NRL_ROLES } from '@/lib/nrlManager';

function finish(career: NrlCareerState) {
  while (career.season.phase !== 'complete') career = reduceNrlCareer(career, { type: 'advance' });
  return career;
}

it.each([[2026, 'storm'], [2027, 'bears']] as const)(
  'can directly sign an affordable offseason free agent beyond the saved market in %i', (year, clubId) => {
    let career = finish(createNrlCareer(clubId, 4, year));
    career = reduceNrlCareer(career, { type: 'setLeagueRecruitment', year, clubId, enabled: true });
    const retention = nrlRetentionPriority(career)?.options.find(row => row.quote.ok);
    if (retention) career = reduceNrlCareer(career, { type: 'setRetentionPriority', year, clubId, playerId: retention.player.id });
    const bytes = JSON.stringify(career);
    const ordinary = reduceNrlCareer(career, { type: 'startNextSeason' });
    const options = nrlOffseasonFreeAgentTargets(career);
    const target = options.find(({ player }) => !ordinary.players.some(row => row.id === player.id))!;
    expect(target).toBeDefined();
    expect(ordinary.players.filter(row => row.role === target.player.role && !row.contract)).toHaveLength(4);
    expect(options.filter(({ player }) => player.role === target.player.role).length).toBeGreaterThan(4);
    const action = { type: 'startNextSeason', freeAgentTarget: { fromYear: year, clubId, playerId: target.player.id } } as const;
    const settled = reduceNrlCareer(career, action);
    expect(settled.season.year).toBe(year + 1);
    expect(settled.players.length).toBeLessThanOrEqual(ordinary.players.length);
    const squad = nrlCareerSquad(settled);
    expect(squad).toHaveLength(30);
    expect(NRL_ROLES.every(role => squad.some(player => player.role === role))).toBe(true);
    expect(squad.find(row => row.id === target.player.id)).toEqual({ ...target.player, contract: target.contract });
    expect(nrlCareerCap(settled).available).toBe(nrlCareerCap(ordinary).available + nrlCareerCap(ordinary).minimumSalary - target.contract.salary);
    expect(settled.players.filter(row => row.contract && row.contract.clubId !== clubId)).toEqual(ordinary.players.filter(row =>
      row.contract && row.contract.clubId !== clubId));
    expect(settled.history.at(-1)?.retainedPlayer).toEqual(ordinary.history.at(-1)?.retainedPlayer);
    expect(settled.history.at(-1)?.leagueRecruitment).toEqual(ordinary.history.at(-1)?.leagueRecruitment);
    expect(settled.history.at(-1)?.freeAgentFill).toEqual([{
      playerId: target.player.id, playerName: target.player.name, role: target.player.role, annualSalary: target.contract.salary,
    }]);
    expect(readNrlCareerSave(JSON.stringify(settled))).toEqual(settled);
    expect(JSON.stringify(career)).toBe(bytes);
    expect(reduceNrlCareer(settled, action)).toBe(settled);
    for (const invalid of [{ ...action.freeAgentTarget, playerId: 'unknown' }, { ...action.freeAgentTarget, fromYear: year - 1 },
      { ...action.freeAgentTarget, clubId: 'other' }]) {
      expect(reduceNrlCareer(career, { ...action, freeAgentTarget: invalid })).toBe(career);
    }
    expect(reduceNrlCareer(career, { ...action, move: { fromYear: year, clubId: 'bears' } })).toBe(career);
  },
);

it('keeps every earlier automatic signing and refuses a target when no academy place remains', () => {
  const year = 2026, clubId = 'storm';
  const initial = finish(createNrlCareer(clubId, 1, year));
  const prefer = { type: 'setOffseasonFreeAgents', year, clubId, enabled: true } as const;
  const full = reduceNrlCareer(initial, prefer);
  const [alternate] = nrlOffseasonFreeAgentTargets(initial);
  expect(nrlOffseasonFreeAgentPreview(full)?.academy).toBe(0);
  expect(nrlOffseasonFreeAgentTargets(full)).toEqual([]);
  const action = (playerId: string) => ({ type: 'startNextSeason', freeAgentTarget: { fromYear: year, clubId, playerId } } as const);
  expect(reduceNrlCareer(full, action(alternate.player.id))).toBe(full);

  const cap = nrlCareerCap(initial, year + 1);
  const renewed = reduceNrlCareer(initial, { type: 'offerContract', playerId: 'storm-1-0', salary: cap.available + cap.minimumSalary, years: 1 });
  expect(renewed).not.toBe(initial);
  const automatic = reduceNrlCareer(renewed, prefer);
  const before = nrlOffseasonFreeAgentPreview(automatic)!;
  expect(before.signings.length).toBeGreaterThan(0);
  expect(before.academy).toBeGreaterThan(0);
  const [target] = nrlOffseasonFreeAgentTargets(automatic);
  const projected = nrlOffseasonFreeAgentPreview(automatic, undefined, target.player.id)!;
  const next = reduceNrlCareer(automatic, action(target.player.id));
  expect(projected.signings).toEqual(before.signings);
  expect(projected.academy).toBe(before.academy - 1);
  expect(nrlCareerCap(next).available).toBe(projected.available);
  expect(next.history.at(-1)?.freeAgentFill?.slice(0, -1)).toEqual(before.signings);
  expect(next.history.at(-1)?.freeAgentFill?.at(-1)?.playerId).toBe(target.player.id);
  expect(readNrlCareerSave(JSON.stringify(next))).toEqual(next);
});
