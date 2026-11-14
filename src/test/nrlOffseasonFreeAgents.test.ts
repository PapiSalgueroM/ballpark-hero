import { expect, it } from 'vitest';
import { createNrlCareer, nrlCareerCap, nrlCareerSquad, nrlCareerMarket, nrlLeagueRecruitmentPreview, nrlOffseasonFreeAgentPreview, nrlRetentionPriority,
  readNrlCareerSave, reduceNrlCareer, type NrlCareerState } from '@/lib/nrlCareer';
import { createNrlSeason, NRL_ROLES } from '@/lib/nrlManager';

function finish(career: NrlCareerState) {
  while (career.season.phase !== 'complete') career = reduceNrlCareer(career, { type: 'advance' });
  return career;
}

it('reviews the cap again at rollover and lets a new manual contract or a cleared priority control', () => {
  const clubId = 'storm', year = 2026;
  const ended = finish(createNrlCareer(clubId, 4, year));
  const playerId = 'storm-1-0';
  const preference = { type: 'setRetentionPriority', year, clubId, playerId } as const;
  const quote = nrlRetentionPriority(ended)?.options.find(row => row.player.id === playerId)!;
  expect(quote.quote.ok).toBe(true);
  const selected = reduceNrlCareer(ended, preference);
  expect(reduceNrlCareer(selected, preference)).toBe(selected);
  expect(reduceNrlCareer(selected, { ...preference, playerId: null })).toEqual(ended);
  const keep = reduceNrlCareer(selected, { type: 'setOffseasonFreeAgents', year, clubId, enabled: true });
  const preview = nrlOffseasonFreeAgentPreview(keep)!;
  expect(preview.signings.length + preview.academy).toBe(nrlCareerCap(ended, year + 1).openSlots - 1);
  expect(preview.signings.some(row => row.playerId === playerId)).toBe(false);
  const retained = reduceNrlCareer(keep, { type: 'startNextSeason' });
  expect(retained.history.at(-1)?.freeAgentFill).toEqual(preview.signings);
  expect(retained.history.at(-1)?.retainedPlayer?.playerId).toBe(playerId);
  expect(nrlCareerCap(retained).available).toBe(preview.available);

  const ordinary = { type: 'offerContract', playerId, salary: quote.salary, years: 2 } as const;
  const signed = reduceNrlCareer(selected, ordinary);
  expect(signed).toEqual(reduceNrlCareer(ended, ordinary));
  expect(signed.retentionPriorityId).toBeUndefined();
  expect(reduceNrlCareer(selected, { type: 'leaveClub', year, clubId }).retentionPriorityId).toBeUndefined();
  expect(reduceNrlCareer(selected, { type: 'retireCareer', year, clubId }).retentionPriorityId).toBeUndefined();
  const move = { type: 'startNextSeason', move: { fromYear: year, clubId: 'bears' } } as const;
  expect(reduceNrlCareer(selected, move)).toEqual(reduceNrlCareer(ended, move));

  const cap = nrlCareerCap(selected, year + 1);
  const blocked = nrlRetentionPriority(selected)!.options.flatMap(row => {
    if (row.player.id === playerId) return [];
    const filled = reduceNrlCareer(selected, { type: 'offerContract', playerId: row.player.id, salary: cap.available + cap.minimumSalary, years: 1 });
    return nrlRetentionPriority(filled)?.selected?.quote.ok === false ? [filled] : [];
  })[0];
  expect(blocked).toBeDefined();
  expect(nrlRetentionPriority(blocked)?.selected?.quote).toEqual({ ok: false, reason: 'This offer exceeds the 2027 salary cap.' });
  expect(readNrlCareerSave(JSON.stringify(blocked))).toEqual(blocked);
  expect(reduceNrlCareer(blocked, { type: 'startNextSeason' })).toBe(blocked);
  const cleared = reduceNrlCareer(blocked, { ...preference, playerId: null });
  expect(reduceNrlCareer(cleared, { type: 'startNextSeason' }).season.year).toBe(2027);
});

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

it('fills the last affordable places from the academy when free agents would exceed the cap', () => {
  const year = 2026, clubId = 'storm';
  const end = finish(createNrlCareer(clubId, 4, year));
  const cap = nrlCareerCap(end, year + 1);
  const fullyBudgeted = reduceNrlCareer(end, {
    type: 'offerContract', playerId: 'storm-1-0', years: 1, salary: cap.available + cap.minimumSalary,
  });
  expect(fullyBudgeted).not.toBe(end);
  const preview = nrlOffseasonFreeAgentPreview(fullyBudgeted)!;
  expect(preview).toMatchObject({ academy: 2, available: 0 });
  expect(preview.signings).toHaveLength(7);
  const next = reduceNrlCareer(fullyBudgeted, { type: 'startNextSeason', freeAgents: { fromYear: year, clubId } });
  expect(nrlCareerCap(next)).toMatchObject({ slots: 30, available: 0 });
  expect(nrlCareerSquad(next).filter(player => player.id.startsWith('nrl-academy-storm-2027-'))).toHaveLength(preview.academy);
  expect(next.history.at(-1)?.freeAgentFill).toEqual(preview.signings);
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

it('stores and clears only a valid preference and uses the latest signed roster once', () => {
  const clubId = 'storm', year = 2026;
  const start = createNrlCareer(clubId, 4, year);
  const ended = finish(start);
  const optIn = { type: 'setOffseasonFreeAgents', year, clubId, enabled: true } as const;
  expect(reduceNrlCareer(start, optIn)).toBe(start);
  expect(reduceNrlCareer(ended, { ...optIn, year: year - 1 })).toBe(ended);
  expect(reduceNrlCareer(ended, { ...optIn, clubId: 'bears' })).toBe(ended);
  expect(readNrlCareerSave(JSON.stringify({ ...start, preferFreeAgents: true }))).toBeNull();
  expect(readNrlCareerSave(JSON.stringify({ ...ended, preferFreeAgents: false }))).toBeNull();

  const saved = reduceNrlCareer(ended, optIn);
  expect(saved).toEqual({ ...ended, preferFreeAgents: true });
  expect(reduceNrlCareer(saved, optIn)).toBe(saved);
  expect(readNrlCareerSave(JSON.stringify(saved))).toEqual(saved);
  const cleared = reduceNrlCareer(saved, { ...optIn, enabled: false });
  expect(JSON.stringify(cleared)).toBe(JSON.stringify(ended));

  const before = nrlOffseasonFreeAgentPreview(saved)!;
  const candidate = nrlCareerMarket(saved).find(row => row.player.id === 'storm-1-0')!;
  expect(candidate.kind).toBe('renewal');
  const renewed = reduceNrlCareer(saved, { type: 'offerContract', playerId: candidate.player.id, salary: candidate.askingSalary, years: 1 });
  expect(renewed).not.toBe(saved);
  expect(renewed.preferFreeAgents).toBe(true);
  const latest = nrlOffseasonFreeAgentPreview(renewed)!;
  expect(latest.signings).not.toEqual(before.signings);
  const next = reduceNrlCareer(renewed, { type: 'startNextSeason' });
  expect(next.preferFreeAgents).toBeUndefined();
  expect(next.history.at(-1)?.freeAgentFill).toEqual(latest.signings);
  expect(new Set(latest.signings.map(signing => signing.playerId)).size).toBe(latest.signings.length);
  expect(nrlCareerSquad(next).find(player => player.id === candidate.player.id)?.contract?.salary).toBe(candidate.askingSalary);
  expect(readNrlCareerSave(JSON.stringify(next))).toEqual(next);
  const moved = reduceNrlCareer(saved, { type: 'startNextSeason', move: { fromYear: year, clubId: 'bears' } });
  expect(moved).toEqual(reduceNrlCareer(ended, { type: 'startNextSeason', move: { fromYear: year, clubId: 'bears' } }));
  expect(reduceNrlCareer(saved, { type: 'leaveClub', year, clubId }).preferFreeAgents).toBeUndefined();
  expect(reduceNrlCareer(saved, { type: 'retireCareer', year, clubId }).preferFreeAgents).toBeUndefined();
});
