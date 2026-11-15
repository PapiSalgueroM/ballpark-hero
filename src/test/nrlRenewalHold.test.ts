import { describe, expect, it } from 'vitest';
import {
  createNrlCareer, nrlCareerCap, nrlCareerFinance, nrlCareerMarket, nrlContractOffer, nrlRenewalHoldOptions, nrlRenewalHoldQuote,
  nrlRenewalHoldSpend, readNrlCareerSave, reduceNrlCareer, type NrlCareerState,
} from '@/lib/nrlCareer';

const read = (state: NrlCareerState) => readNrlCareerSave(JSON.stringify(state));
const advance = (state: NrlCareerState) => reduceNrlCareer(state, { type: 'advance' });
const identity = ({ season: { year, round, clubId } }: NrlCareerState) => ({ year, round, clubId });
const setup = () => createNrlCareer('broncos', 1);
const book = (state = setup()) => {
  const choice = nrlRenewalHoldOptions(state)[0];
  const action = { type: 'bookRenewalHold', ...identity(state), playerId: choice.player.id, annualSalary: choice.askingSalary } as const;
  return { choice, action, booked: reduceNrlCareer(state, action) };
};
const exercise = (state: NrlCareerState, id: string) => ({ type: 'exerciseRenewalHold', ...identity(state), playerId: id } as const);
const untilComplete = (state: NrlCareerState) => {
  while (state.season.phase !== 'complete') state = advance(state);
  return state;
};

describe('NRL renewal hold', () => {
  it('books once, spends club cash and leaves the lineup, contracts and salary cap unchanged', () => {
    const original = setup();
    const { choice, action, booked } = book(original);
    expect(booked.season).toBe(original.season);
    expect(booked.players).toBe(original.players);
    expect(nrlCareerCap(booked, 2027)).toEqual(nrlCareerCap(original, 2027));
    expect(nrlCareerFinance(original).cash - nrlCareerFinance(booked).cash).toBe(nrlRenewalHoldSpend(booked.finance));
    expect(nrlRenewalHoldSpend(booked.finance)).toBeGreaterThan(0);
    expect(booked.finance.renewalHold).toMatchObject({ playerId: choice.player.id, bookedRound: 1, annualSalary: choice.askingSalary });
    expect(read(booked)).toEqual(booked);
    expect(read(original)).toEqual(original);
    expect(reduceNrlCareer(booked, action)).toBe(booked);
    expect(reduceNrlCareer(original, { ...action, annualSalary: choice.askingSalary - 1 })).toBe(original);
    expect(reduceNrlCareer(original, { ...action, round: 2 })).toBe(original);
  });

  it('keeps the wage quote across matches and exercises one real next-year deal without a second fee', () => {
    const original = setup();
    const { choice, booked } = book(original);
    const id = choice.player.id;
    const played = advance(booked);
    const standard = advance(original);
    expect(played.season).toEqual(standard.season);
    expect(reduceNrlCareer(played, exercise(booked, id))).toBe(played);
    expect(nrlRenewalHoldQuote(played)).toMatchObject({ ok: true, contract: { salary: choice.askingSalary, startYear: 2027, endYear: 2027 } });
    const accepted = reduceNrlCareer(read(played)!, exercise(played, id));
    expect(nrlCareerFinance(accepted).cash).toBe(nrlCareerFinance(played).cash);
    expect(nrlCareerCap(accepted, 2027).slots).toBe(nrlCareerCap(played, 2027).slots + 1);
    expect(accepted.players.find(player => player.id === id)?.futureContract).toEqual({ clubId: 'broncos', salary: choice.askingSalary, startYear: 2027, endYear: 2027 });
    expect(accepted.finance.renewalHold?.exercisedRound).toBe(2);
    expect(read(accepted)).toEqual(accepted);
    expect(reduceNrlCareer(accepted, exercise(played, id))).toBe(accepted);
    expect(read({ ...accepted, finance: { ...accepted.finance, renewalHold: { ...accepted.finance.renewalHold!, annualSalary: choice.askingSalary + 1 } } })).toBeNull();
  });

  it('archives an exercised or unused hold and opens a new allowance after rollover', () => {
    const { choice, booked } = book();
    const completed = untilComplete(booked);
    const id = choice.player.id;
    const exercised = reduceNrlCareer(read(completed)!, exercise(completed, id));
    expect(read(exercised)).toEqual(exercised);
    for (const season of [completed, exercised]) {
      const next = reduceNrlCareer(season, { type: 'startNextSeason' });
      expect(next.finance.renewalHold).toBeUndefined();
      expect(next.history.at(-1)?.finance?.renewalHold).toEqual(season.finance.renewalHold);
      expect(read(next)).toEqual(next);
    }
  });

  it('keeps an affordable locked salary when the live asking salary rises', () => {
    const original = setup();
    const choice = nrlRenewalHoldOptions(original).find(entry => entry.player.id === 'broncos-11-1')!;
    expect(choice.askingSalary).toBe(410_000);
    let state = reduceNrlCareer(original, { type: 'bookRenewalHold', ...identity(original),
      playerId: choice.player.id, annualSalary: choice.askingSalary });
    for (let round = 1; round < 9; round++) state = advance(state);
    expect(nrlCareerMarket(state).find(entry => entry.player.id === choice.player.id)?.askingSalary).toBe(430_000);
    expect(nrlRenewalHoldQuote(read(state)!)).toMatchObject({ ok: true, contract: { salary: 410_000 } });
    const signed = reduceNrlCareer(state, exercise(state, choice.player.id));
    expect(signed.players.find(row => row.id === choice.player.id)?.futureContract?.salary).toBe(410_000);
    expect(read(signed)).toEqual(signed);
  });

  it('refuses exercise if subsequent valid offers fill the next-year squad', () => {
    const { choice, booked } = book();
    let state = booked;
    for (let count = 0; count < 10; count++) {
      const available = nrlCareerMarket(state).filter(entry => entry.player.id !== choice.player.id && entry.startYear === 2027
        && nrlContractOffer(state, entry.player.id, entry.askingSalary, 1).ok);
      const entry = available.find(option => option.player.role === choice.player.role) ?? available[0];
      state = reduceNrlCareer(state, { type: 'offerContract', playerId: entry.player.id, salary: entry.askingSalary, years: 1 });
    }
    expect(nrlCareerCap(state, 2027).openSlots).toBe(0);
    expect(nrlCareerCap(state, 2027).available).toBeGreaterThan(0);
    expect(nrlRenewalHoldQuote(state)).toEqual({ ok: false, reason: 'The 2027 squad already has 30 contracts.' });
    expect(reduceNrlCareer(state, exercise(state, choice.player.id))).toBe(state);
    expect(read(state)).toEqual(state);
  });

  it('makes normal direct renewals available while holding the quote', () => {
    const { choice, booked } = book();
    const entry = nrlCareerMarket(booked).find(row => row.player.id === choice.player.id)!;
    const direct = reduceNrlCareer(booked, { type: 'offerContract', playerId: choice.player.id, salary: entry.askingSalary, years: 2 });
    expect(direct).not.toBe(booked);
    expect(nrlRenewalHoldQuote(direct).ok).toBe(false);
    expect(reduceNrlCareer(direct, exercise(direct, choice.player.id))).toBe(direct);
    expect(read(direct)).toEqual(direct);
  });
});

