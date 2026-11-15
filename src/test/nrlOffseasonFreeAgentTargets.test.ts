import { expect, it } from 'vitest';
import { createNrlCareer, nrlCareerCap, nrlCareerMarket, nrlCareerSquad, nrlMutualReleaseQuote, nrlOffseasonFreeAgentPreview, nrlOffseasonFreeAgentTargets, nrlRetentionPriority,
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

it('fixes a two-year deal and its net cap cost across both seasons', () => {
  const finished = finish(createNrlCareer('storm', 4));
  const baseline = reduceNrlCareer(finished, { type: 'startNextSeason' });
  const target = nrlOffseasonFreeAgentTargets(finished).find(row => row.twoYear?.ok)!;
  expect(target).toBeDefined();
  const { player, twoYear } = target;
  if (!twoYear.ok) throw new Error('Expected an available two-year fixture.');
  const freeAgentTarget = { fromYear: 2026, clubId: 'storm', playerId: player.id, years: 2 } as const;
  const next = reduceNrlCareer(finished, { type: 'startNextSeason', freeAgentTarget });
  expect(nrlCareerSquad(next).find(row => row.id === player.id)?.contract).toEqual(twoYear.contract);
  expect(twoYear.contract).toMatchObject({ clubId: 'storm', startYear: 2027, endYear: 2028 });
  for (const year of [2027, 2028]) {
    expect(nrlCareerCap(next, year).available).toBe(nrlCareerCap(baseline, year).available
      + nrlCareerCap(baseline, year).minimumSalary - twoYear.contract.salary);
  }
  expect(next.history[0].freeAgentFill).toEqual([{ playerId: player.id, playerName: player.name, role: player.role,
    annualSalary: twoYear.contract.salary, endYear: 2028 }]);
  expect(readNrlCareerSave(JSON.stringify(next))).toEqual(next);
  const afterAnotherYear = reduceNrlCareer(finish(next), { type: 'startNextSeason' });
  expect(nrlCareerSquad(afterAnotherYear).find(row => row.id === player.id)?.contract).toEqual(twoYear.contract);
  expect(readNrlCareerSave(JSON.stringify(afterAnotherYear))).toEqual(afterAnotherYear);
  const oneYear = { ...freeAgentTarget, years: 1 } as const;
  const { years, ...legacy } = oneYear;
  expect(reduceNrlCareer(finished, { type: 'startNextSeason', freeAgentTarget: oneYear }))
    .toEqual(reduceNrlCareer(finished, { type: 'startNextSeason', freeAgentTarget: legacy }));
});

it('keeps a one-year target when only the second-year cap rejects the longer term', () => {
  const initial = finish(createNrlCareer('storm', 4));
  const room = nrlCareerCap(initial, 2028);
  const renewal = nrlCareerMarket(initial).find(entry => entry.kind === 'renewal' && entry.startYear === 2028)!;
  expect(renewal).toBeDefined();
  const full = reduceNrlCareer(initial, { type: 'offerContract', playerId: renewal.player.id,
    salary: room.available + room.minimumSalary, years: 1 });
  expect(nrlCareerCap(full, 2028).available).toBe(0);
  const target = nrlOffseasonFreeAgentTargets(full).find(row => row.contract.salary > room.minimumSalary)!;
  expect(target.twoYear).toEqual({ ok: false, reason: 'This offer exceeds the 2028 salary cap.' });
  const base = { fromYear: 2026, clubId: 'storm', playerId: target.player.id };
  expect(reduceNrlCareer(full, { type: 'startNextSeason', freeAgentTarget: { ...base, years: 2 } })).toBe(full);
  expect(reduceNrlCareer(full, { type: 'startNextSeason', freeAgentTarget: { ...base, years: 1 } }).season.year).toBe(2027);
});

it('allows an ordinary approved release after the first year of the longer deal', () => {
  const finished = finish(createNrlCareer('storm', 4));
  const guaranteed = nrlCareerSquad(finished, 2028);
  const target = nrlOffseasonFreeAgentTargets(finished).find(row => row.twoYear.ok && row.player.age < 34
    && guaranteed.some(player => player.role === row.player.role))!;
  expect(target).toBeDefined();
  const yearOne = reduceNrlCareer(finished, { type: 'startNextSeason',
    freeAgentTarget: { fromYear: 2026, clubId: 'storm', playerId: target.player.id, years: 2 } });
  const completed = finish(yearOne);
  expect(nrlMutualReleaseQuote(completed, target.player.id).ok).toBe(true);
  const released = reduceNrlCareer(completed, { type: 'agreeMutualRelease', year: 2027, clubId: 'storm', playerId: target.player.id });
  expect(readNrlCareerSave(JSON.stringify(released))).toEqual(released);
  const next = reduceNrlCareer(released, { type: 'startNextSeason' });
  expect(nrlCareerSquad(next).some(row => row.id === target.player.id)).toBe(false);
  expect(next.history[0].freeAgentFill?.[0].endYear).toBe(2028);
  expect(readNrlCareerSave(JSON.stringify(next))).toEqual(next);
});
