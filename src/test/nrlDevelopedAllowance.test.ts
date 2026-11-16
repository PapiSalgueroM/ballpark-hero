import { createHash } from 'node:crypto';
import { expect, it } from 'vitest';
import {
  createNrlCareer, nrlAcademyReports, nrlCareerCap, nrlCareerFinance, nrlCareerMarket, nrlCareerSquad,
  nrlContractOffer, readNrlCareerSave, reduceNrlCareer, type NrlCareerState,
} from '@/lib/nrlCareer';
import { createNrlSeason } from '@/lib/nrlManager';

const clubId = 'panthers';
const advance = (state: NrlCareerState) => reduceNrlCareer(state, { type: 'advance' });
const startNextSeason = { type: 'startNextSeason' } as const;
const finish = (initial: NrlCareerState) => {
  let state = initial;
  while (state.season.phase !== 'complete') state = advance(state);
  return state;
};
const bytes = (state: NrlCareerState) => JSON.stringify(state);
const restore = (state: NrlCareerState) => readNrlCareerSave(bytes(state))!;
const digest = (state: NrlCareerState) => createHash('sha256').update(bytes(state)).digest('hex');

function pathway() {
  const opening = createNrlCareer(clubId, 41, 2026);
  const scouted = reduceNrlCareer(opening, { type: 'scoutAcademy', role: 'Fullback', priority: 'ceiling' });
  const completed = finish(advance(scouted));
  const graduate = nrlAcademyReports(completed)[0].player!;
  const retained = reduceNrlCareer(completed, { ...startNextSeason, academyCarry: { fromYear: 2026, clubId, playerId: graduate.id } });
  const signed = reduceNrlCareer(retained, { type: 'promoteAcademy', playerId: graduate.id });
  return { graduate, retained, signed };
}

function fillTo29(initial: NrlCareerState, year: number) {
  let state = initial;
  const market = nrlCareerMarket(initial).filter(entry => entry.startYear === year).sort((a, b) => a.askingSalary - b.askingSalary);
  for (const { player, askingSalary } of market) {
    if (nrlCareerCap(state, year).slots === 29) break;
    state = reduceNrlCareer(state, { type: 'offerContract', playerId: player.id, salary: askingSalary + 250_000, years: 1 });
  }
  return state;
}

it('uses earned relief to fit an actual two-year deal, then rolls over its gross wages and all 30 places', () => {
  const { graduate, retained, signed } = pathway();
  const nominate = { type: 'setDevelopedAllowance', year: 2027, clubId, allowanceYear: 2028, playerId: graduate.id } as const;
  const before = fillTo29(signed, 2028);
  const senior = before.players.find(player => player.id === graduate.id)!;
  const salaryCredit = senior.futureContract!.salary;
  const base = nrlCareerCap(before, 2028);
  expect(base.slots).toBe(29);
  expect(salaryCredit).toBe(base.minimumSalary);
  const salary = base.available + base.minimumSalary + 50_000;
  const target = nrlCareerMarket(before).find(entry => entry.startYear === 2028
    && nrlContractOffer(before, entry.player.id, salary - 50_000, 2).ok)!;
  expect(target).toBeDefined();
  expect(salary).toBeLessThanOrEqual(nrlCareerCap(before, 2029).available + nrlCareerCap(before, 2029).minimumSalary);
  const offer = { type: 'offerContract', playerId: target.player.id, salary, years: 2 } as const;
  expect(nrlContractOffer(before, target.player.id, salary, 2)).toEqual({ ok: false, reason: 'This offer exceeds the 2028 salary cap.' });
  expect(reduceNrlCareer(before, offer)).toBe(before);
  expect(digest(reduceNrlCareer(finish(before), startNextSeason))).toBe('2243fa5d5745bf0833cfe8edd95ba0f78dbdaead593b76f7e21d0ca7d0103fda');

  const named = reduceNrlCareer(before, nominate);
  expect(named.season && nrlCareerCap(named, 2028)).toMatchObject({
    committed: base.committed, slots: 29, developedAllowance: salaryCredit, available: base.available + salaryCredit,
  });
  expect(reduceNrlCareer(retained, nominate)).toBe(retained);
  expect(reduceNrlCareer(before, { ...nominate, clubId: 'storm' })).toBe(before);
  expect(reduceNrlCareer(before, { ...nominate, allowanceYear: 2029 })).toBe(before);
  const unrelated = nrlCareerSquad(before, 2028).find(player => player.id !== graduate.id)!;
  expect(reduceNrlCareer(before, { ...nominate, playerId: unrelated.id })).toBe(before);
  const wrongClubCredit = { ...named, players: named.players.map(player => player.id !== graduate.id ? player : {
    ...player, futureContract: { ...player.futureContract!, clubId: 'storm' },
  }) };
  expect(readNrlCareerSave(bytes(wrongClubCredit))).toBeNull();
  expect(nrlCareerCap(named, 2029)).toEqual(nrlCareerCap(before, 2029));
  expect(nrlCareerFinance(named)).toEqual(nrlCareerFinance(before));
  expect(bytes(restore(named))).toBe(bytes(named));
  const remove = { ...nominate, playerId: null };
  expect(bytes(reduceNrlCareer(named, remove))).toBe(bytes(before));
  const deal = reduceNrlCareer(restore(named), offer);
  expect(nrlCareerCap(deal, 2028)).toMatchObject({ slots: 30, committed: base.committed + salary, available: salaryCredit - 50_000 });
  expect(reduceNrlCareer(deal, remove)).toBe(deal);
  const rolled = reduceNrlCareer(finish(restore(deal)), startNextSeason);
  expect(nrlCareerCap(rolled)).toEqual(nrlCareerCap(deal, 2028));
  expect(nrlCareerSquad(rolled).find(player => player.id === target.player.id)?.contract).toEqual({
    clubId, salary, startYear: 2028, endYear: 2029,
  });
  expect(nrlCareerSquad(rolled).find(player => player.id === graduate.id)?.contract?.salary).toBe(salaryCredit);
  expect(bytes(restore(rolled))).toBe(bytes(rolled));
});

it('keeps an imported first-year career on its original finance and rollover path', () => {
  const legacy = readNrlCareerSave(JSON.stringify(createNrlSeason(clubId, 41, 2026)))!;
  expect(legacy.legacySeason).toBe(true);
  const player = nrlCareerSquad(legacy)[0];
  const action = { type: 'setDevelopedAllowance', year: 2026, clubId, allowanceYear: 2027, playerId: player.id } as const;
  const rolled = reduceNrlCareer(finish(legacy), startNextSeason);
  expect(rolled.season.year).toBe(2027);
  expect(bytes(restore(rolled))).toBe(bytes(rolled));
  expect(digest(rolled)).toBe('adf585fa453a41ac585db693df6fea3e59c6fefef87c522a4350b48633e8a3c4');
  expect(reduceNrlCareer(legacy, action) === legacy).toBe(true);
});
