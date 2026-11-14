import { expect, it } from 'vitest';
import { createNrlCareer, nrlCareerCap, nrlCareerSquad, nrlLeagueRecruitmentPreview, nrlOffseasonFreeAgentPreview,
  readNrlCareerSave, reduceNrlCareer, type NrlCareerState } from '@/lib/nrlCareer';
import { createNrlSeason, NRL_ROLES } from '@/lib/nrlManager';

function finish(career: NrlCareerState) {
  while (career.season.phase !== 'complete') career = reduceNrlCareer(career, { type: 'advance' });
  return career;
}

it.each([
  [2026, 'storm'],
  [2027, 'bears'],
] as const)('previews exact one-year free agent signings and cap in %i', (year, clubId) => {
  const ended = finish(createNrlCareer(clubId, 4, year));
  const bytes = JSON.stringify(ended);
  const standard = reduceNrlCareer(ended, { type: 'startNextSeason' });
  const preview = nrlOffseasonFreeAgentPreview(ended)!;
  expect(preview.signings.length).toBeGreaterThan(0);
  expect(preview.academy + preview.signings.length).toBe(nrlCareerCap(ended, year + 1).openSlots);
  const action = { type: 'startNextSeason', freeAgents: { fromYear: year, clubId } } as const;
  const changed = reduceNrlCareer(ended, action);
  const squad = nrlCareerSquad(changed);
  expect(squad).toHaveLength(30);
  expect(NRL_ROLES.every(role => squad.some(player => player.role === role))).toBe(true);
  expect(nrlCareerCap(changed).available).toBe(preview.available);
  expect(nrlCareerCap(changed).available).toBeGreaterThanOrEqual(0);
  expect(changed.history.at(-1)?.freeAgentFill).toEqual(preview.signings);
  expect(standard.history.at(-1)?.freeAgentFill).toBeUndefined();
  for (const entry of preview.signings) {
    const player = squad.find(row => row.id === entry.playerId)!;
    expect(player).toMatchObject({ name: entry.playerName, contract: { clubId, startYear: year + 1, endYear: year + 1, salary: entry.annualSalary } });
  }
  expect(JSON.stringify(ended)).toBe(bytes);
  expect(readNrlCareerSave(JSON.stringify(changed))).toEqual(changed);
  const archived = changed.history.at(-1)!;
  const [first, ...rest] = archived.freeAgentFill!;
  const corrupted = { ...changed, history: [...changed.history.slice(0, -1), {
    ...archived, freeAgentFill: [{ ...first, annualSalary: first.annualSalary + 1 }, ...rest],
  }] };
  expect(readNrlCareerSave(JSON.stringify(corrupted))).toBeNull();
  expect(reduceNrlCareer(ended, { ...action, freeAgents: { ...action.freeAgents, fromYear: year - 1 } })).toBe(ended);
});

it('does not automatically bring back a player after paying their mutual release', () => {
  const clubId = 'storm', year = 2026;
  const ended = finish(createNrlCareer(clubId, 4, year));
  const release = nrlCareerSquad(ended).map(player => reduceNrlCareer(ended, {
    type: 'agreeMutualRelease', year, clubId, playerId: player.id,
  })).find(state => state !== ended)!;
  const releasedId = release.finance.mutualRelease?.playerId;
  expect(releasedId).toBeDefined();
  expect(nrlOffseasonFreeAgentPreview(release)?.signings.some(row => row.playerId === releasedId)).toBe(false);
  const next = reduceNrlCareer(release, { type: 'startNextSeason', freeAgents: { fromYear: year, clubId } });
  expect(nrlCareerSquad(next).some(row => row.id === releasedId)).toBe(false);
  expect(readNrlCareerSave(JSON.stringify(next))).toEqual(next);
});

it('keeps selected rival extensions in the same opt-in preview and preserves ordinary club moves', () => {
  const year = 2026, clubId = 'storm';
  const end = finish(createNrlCareer(clubId, 4, year));
  const enabled = reduceNrlCareer(end, { type: 'setLeagueRecruitment', year, clubId, enabled: true });
  expect(enabled.leagueRecruitment).toBe(true);
  const freeAgents = { fromYear: year, clubId };
  const changed = reduceNrlCareer(enabled, { type: 'startNextSeason', freeAgents });
  expect(changed.history.at(-1)?.leagueRecruitment).toEqual(nrlLeagueRecruitmentPreview(enabled, clubId, true));
  expect(changed.history.at(-1)?.freeAgentFill).toEqual(nrlOffseasonFreeAgentPreview(enabled)?.signings);
  const move = { fromYear: year, clubId: 'bears' };
  expect(reduceNrlCareer(enabled, { type: 'startNextSeason', move, freeAgents })).toBe(enabled);
  const regularMove = reduceNrlCareer(enabled, { type: 'startNextSeason', move });
  expect(regularMove.season.clubId).toBe('bears');
  expect(regularMove.history.at(-1)?.freeAgentFill).toBeUndefined();
  const legacy = finish(readNrlCareerSave(JSON.stringify(createNrlSeason('storm', 4)))!);
  expect(nrlOffseasonFreeAgentPreview(legacy)).toBeNull();
  expect(reduceNrlCareer(legacy, { type: 'startNextSeason', freeAgents })).toBe(legacy);
});
