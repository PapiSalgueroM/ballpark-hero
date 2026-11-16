import { createHash } from 'node:crypto';
import { expect, it } from 'vitest';
import { createNrlCareer, nrlAcademyOffer, nrlAcademyReports, nrlCareerCap, nrlCareerMarket, nrlCareerSquad,
  readNrlCareerSave, reduceNrlCareer, type NrlCareerState } from '@/lib/nrlCareer';
import { createNrlSeason, NRL_DOMESTIC_SCORING_MODEL, nrlStarterOptions } from '@/lib/nrlManager';

const year = 2026, clubId = 'panthers';
const advance = (state: NrlCareerState) => reduceNrlCareer(state, { type: 'advance' });
const finish = (state: NrlCareerState) => {
  while (state.season.phase !== 'complete') state = advance(state);
  return state;
};
const read = (state: NrlCareerState) => readNrlCareerSave(JSON.stringify(state));
const nextSeason = { type: 'startNextSeason' } as const;
const carry = (playerId: string) => ({ ...nextSeason, academyCarry: { fromYear: year, clubId, playerId } });

function opening(modern = true): NrlCareerState {
  const state = createNrlCareer(clubId, 41, year);
  return modern ? { ...state, season: { ...state.season, domesticScoringModel: NRL_DOMESTIC_SCORING_MODEL } } : state;
}

function ready(state: NrlCareerState) {
  return advance(reduceNrlCareer(state, { type: 'scoutAcademy', role: 'Fullback', priority: 'ceiling' }));
}

function fullNextSquad(state: NrlCareerState) {
  const next = state.season.year + 1;
  const entries = nrlCareerMarket(state).filter(entry => entry.startYear === next).sort((a, b) => a.askingSalary - b.askingSalary);
  for (const entry of entries) {
    if (nrlCareerCap(state, next).slots === 30) break;
    state = reduceNrlCareer(state, { type: 'offerContract', playerId: entry.player.id, salary: entry.askingSalary, years: 1 });
  }
  return state;
}

it('keeps one ready, cross-trained academy player despite 30 senior contracts next season', () => {
  const scouted = ready(opening());
  const { player } = nrlAcademyReports(scouted)[0];
  const booked = reduceNrlCareer(scouted, { type: 'startAcademyCrossTraining', year, clubId, round: scouted.season.round,
    playerId: player!.id, role: 'Left Wing' });
  const completed = finish(fullNextSquad(advance(advance(booked))));
  const graduate = nrlAcademyReports(completed)[0].player!;
  expect(graduate).toEqual({ ...player, secondaryRole: 'Left Wing' });
  expect(nrlCareerCap(completed, 2027).slots).toBe(30);
  expect(nrlAcademyOffer(completed, graduate.id)).toEqual({ ok: false, reason: 'The 2027 squad already has 30 contracts.' });

  const ordinary = reduceNrlCareer(completed, nextSeason);
  expect(nrlAcademyReports(ordinary)).toEqual([]);
  expect(ordinary.season.year).toBe(2027);
  expect(read(ordinary)).toEqual(ordinary);
  // Captured by this fixture before the berth existed on the published #1005 source.
  expect(createHash('sha256').update(JSON.stringify(ordinary)).digest('hex'))
    .toBe('18041dcb26586736098917da59e39b892a66344eb361f8cda7a28c026138cad2');

  const retained = reduceNrlCareer(read(completed)!, carry(graduate.id));
  expect(retained.season.year).toBe(2027);
  expect(nrlAcademyReports(retained)[0]).toMatchObject({ status: 'ready', player: { ...graduate, age: graduate.age + 1 } });
  expect(nrlCareerCap(retained)).toEqual(nrlCareerCap(ordinary));
  expect(nrlCareerSquad(retained)).toEqual(nrlCareerSquad(ordinary));
  expect(retained.players).toEqual(ordinary.players);
  expect(nrlCareerMarket(retained).some(entry => entry.player.id === graduate.id)).toBe(false);
  expect(nrlStarterOptions(retained.season, 'Left Wing').some(row => row.id === graduate.id)).toBe(false);
  expect(read(retained)).toEqual(retained);
});

it('keeps new intake open at the same position and only promotes under the ordinary next-year contract', () => {
  const completed = finish(ready(opening()));
  const prospect = nrlAcademyReports(completed)[0].player!;
  const retained = reduceNrlCareer(completed, carry(prospect.id));
  const scoutedAgain = ready(read(retained)!);
  const reports = nrlAcademyReports(scoutedAgain);
  expect(reports.map(report => [report.player?.id, report.retained])).toEqual([
    [prospect.id, true], ['nrl-prospect-panthers-2027-0', undefined],
  ]);
  expect(read(scoutedAgain)).toEqual(scoutedAgain);
  const offer = nrlAcademyOffer(scoutedAgain, prospect.id);
  const before = nrlCareerCap(scoutedAgain, 2028);
  expect(offer).toEqual({ ok: true, contract: { clubId, startYear: 2028, endYear: 2028, salary: before.minimumSalary } });
  const promoted = reduceNrlCareer(scoutedAgain, { type: 'promoteAcademy', playerId: prospect.id });
  expect(nrlAcademyReports(promoted)[0].status).toBe('signed');
  expect(nrlCareerCap(promoted, 2028)).toMatchObject({ slots: before.slots + 1, committed: before.committed + before.minimumSalary });
  expect(nrlCareerSquad(promoted)).toEqual(nrlCareerSquad(scoutedAgain));
  expect(read(promoted)).toEqual(promoted);

  const closing = finish(scoutedAgain);
  const again = { ...nextSeason, academyCarry: { fromYear: 2027, clubId, playerId: prospect.id } };
  expect(reduceNrlCareer(closing, again)).toBe(closing);
  const expired = reduceNrlCareer(closing, nextSeason);
  expect(nrlAcademyReports(expired)).toEqual([]);
  expect(expired.players.some(player => player.id === prospect.id)).toBe(false);
  const senior = reduceNrlCareer(finish(promoted), nextSeason);
  expect(nrlCareerSquad(senior).find(player => player.id === prospect.id)?.contract).toMatchObject({ startYear: 2028, endYear: 2028 });
  expect(read(senior)).toEqual(senior);
});

it('refuses signed, released, stale, moved and original v1 offers of the berth', () => {
  const state = ready(opening());
  const player = nrlAcademyReports(state)[0].player!;
  const action = carry(player.id);
  expect(reduceNrlCareer(state, action)).toBe(state);
  const ended = finish(state);
  expect(reduceNrlCareer(ended, { ...action, academyCarry: { ...action.academyCarry, fromYear: year - 1 } })).toBe(ended);
  expect(reduceNrlCareer(ended, { ...action, move: { fromYear: year, clubId: 'tigers' } })).toBe(ended);
  const released = reduceNrlCareer(ended, { type: 'releaseAcademyProspect', year, clubId, playerId: player.id });
  expect(nrlAcademyReports(released)[0].status).toBe('released');
  expect(reduceNrlCareer(released, action)).toBe(released);
  const signed = reduceNrlCareer(ended, { type: 'promoteAcademy', playerId: player.id });
  expect(nrlAcademyReports(signed)[0].status).toBe('signed');
  expect(reduceNrlCareer(signed, action)).toBe(signed);

  const legacy = readNrlCareerSave(JSON.stringify(createNrlSeason(clubId, 41, year)))!;
  const earlier = finish(advance(reduceNrlCareer(legacy, { type: 'scoutAcademy', role: 'Fullback' })));
  expect(reduceNrlCareer(earlier, action)).toBe(earlier);
  const movedOn = reduceNrlCareer(earlier, nextSeason);
  expect(movedOn.season.year).toBe(2027);
  expect(nrlAcademyReports(movedOn)).toEqual([]);
  expect(read(movedOn)).toEqual(movedOn);
});

it('adds the receipt only by explicit choice in an older v2 career', () => {
  const markerless = finish(ready(opening(false)));
  expect(read(markerless)).toEqual(markerless);
  const player = nrlAcademyReports(markerless)[0].player!;
  const ordinary = reduceNrlCareer(markerless, nextSeason);
  expect(nrlAcademyReports(ordinary)).toEqual([]);
  const retained = reduceNrlCareer(markerless, carry(player.id));
  expect(retained.season.domesticScoringModel).toBeUndefined();
  expect(nrlAcademyReports(retained)[0].player?.id).toBe(player.id);
  expect(read(retained)).toEqual(retained);
});

it('validates the archived version, academy origin and earned role on load', () => {
  const state = finish(ready(opening()));
  const player = nrlAcademyReports(state)[0].player!;
  const retained = reduceNrlCareer(state, carry(player.id));
  const receipt = retained.history[0].academyCarry!;
  expect(receipt).toEqual({ version: 1, player });
  for (const forgery of [{ ...receipt, version: 2 }, { ...receipt, player: { ...player, secondaryRole: 'Left Wing' } },
    { ...receipt, player: { ...player, id: 'nrl-prospect-tigers-2026-0' } }]) {
    expect(readNrlCareerSave(JSON.stringify({ ...retained, history: [{ ...retained.history[0], academyCarry: forgery }] }))).toBeNull();
  }
});
