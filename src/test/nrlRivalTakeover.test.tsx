import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import NrlCareerOffice from '@/components/nrl-manager/NrlCareerOffice';
import {
  createNrlCareer, nrlCareerCap, nrlCareerFinance, nrlCareerMarket, nrlCareerSquad, nrlRivalTakeoverQuote,
  readNrlCareerSave, reduceNrlCareer, type NrlCareerState,
} from '@/lib/nrlCareer';

afterEach(cleanup);

const year = 2026;
const clubId = 'storm';
const playerId = 'nrl-bulldogs-2026-2';
const action = { type: 'takeOverRivalContract', year, clubId, playerId, fee: 200_100 } as const;
const playerIn = (state: NrlCareerState) => state.players.find(player => player.id === playerId)!;
const restore = (state: NrlCareerState) => readNrlCareerSave(JSON.stringify(state));

function seasonReview() {
  let state = createNrlCareer(clubId, 4, year);
  while (state.season.phase !== 'complete') state = reduceNrlCareer(state, { type: 'advance' });
  return state;
}

it('pays once for a contracted rival and carries the original salary and term to next year', () => {
  const before = seasonReview();
  expect(nrlCareerMarket(before).some(entry => entry.player.id === playerId)).toBe(false);
  const original = playerIn(before);
  const contract = { clubId, startYear: 2027, endYear: 2028, salary: 400_200 };
  const quote = nrlRivalTakeoverQuote(before, playerId);
  expect(quote).toMatchObject({ ok: true, fee: 200_100, contract });
  const booked = reduceNrlCareer(before, action);
  expect(booked.season).toBe(before.season);
  expect(playerIn(booked).contract).toEqual({ ...original.contract!, endYear: year });
  expect(playerIn(booked).futureContract).toEqual(contract);
  expect(nrlCareerSquad(booked).some(player => player.id === playerId)).toBe(false);
  expect(nrlCareerFinance(before).cash - nrlCareerFinance(booked).cash).toBe(200_100);
  expect(booked.history[0].finance).toEqual(nrlCareerFinance(booked));
  for (const season of [2027, 2028]) {
    expect(nrlCareerCap(booked, season).committed - nrlCareerCap(before, season).committed).toBe(400_200);
    expect(nrlCareerCap(booked, season).slots - nrlCareerCap(before, season).slots).toBe(1);
  }
  if (quote.ok) expect(quote.capAfter).toEqual([nrlCareerCap(booked, 2027), nrlCareerCap(booked, 2028)]);
  expect(restore(booked)).toEqual(booked);
  expect(reduceNrlCareer(booked, action)).toBe(booked);
  expect(reduceNrlCareer(booked, { ...action, playerId: 'nrl-bulldogs-2026-28' })).toBe(booked);

  const next = reduceNrlCareer(restore(booked)!, { type: 'startNextSeason' });
  expect(next.finance.rivalTakeover).toBeUndefined();
  expect(next.finance.openingCash).toBe(nrlCareerFinance(booked).cash);
  expect(nrlCareerSquad(next).find(player => player.id === playerId)?.contract).toEqual(contract);
  expect(next.history[0].finance?.rivalTakeover).toEqual(booked.finance.rivalTakeover);
  expect(restore(next)).toEqual(next);

  const forged = { ...booked, finance: { ...booked.finance, rivalTakeover: {
    ...booked.finance.rivalTakeover!, annualSalary: 400_201,
  } } };
  expect(restore(forged)).toBeNull();
});

it('refuses an approach while playing, an uncovered role, a stale fee, or an unfunded move', () => {
  const active = createNrlCareer(clubId, 4, year);
  const before = seasonReview();
  expect(reduceNrlCareer(active, action)).toBe(active);
  expect(nrlRivalTakeoverQuote(before, 'nrl-broncos-2026-0').ok).toBe(false);
  for (const invalid of [
    { ...action, year: 2027 }, { ...action, clubId: 'broncos' }, { ...action, fee: 200_101 },
  ]) expect(reduceNrlCareer(before, invalid)).toBe(before);

  const short = { ...before, finance: { ...before.finance, openingCash: before.finance.openingCash - nrlCareerFinance(before).cash + 200_099 } };
  expect(nrlRivalTakeoverQuote(short, playerId)).toEqual({ ok: false, reason: 'The club cannot cover the acquisition fee.' });
  expect(reduceNrlCareer(short, action)).toBe(short);

  const coveredOnlyBy = before.players.find(player => player.id === 'nrl-bulldogs-2026-28')!;
  const noCover = { ...before, players: before.players.map(player => player === coveredOnlyBy
    ? { ...player, contract: { ...player.contract!, endYear: year } } : player) };
  expect(nrlRivalTakeoverQuote(noCover, playerId)).toEqual({ ok: false, reason: 'The rival needs an equally rated player signed at this position.' });
  expect(reduceNrlCareer(noCover, action)).toBe(noCover);
});

it('checks the second year after an ordinary future renewal uses the cap room', () => {
  const before = seasonReview();
  const extension = nrlCareerMarket(before).find(entry => entry.kind === 'renewal' && entry.startYear === 2028)!;
  const cap = nrlCareerCap(before, 2028);
  const reserved = reduceNrlCareer(before, {
    type: 'offerContract', playerId: extension.player.id, years: 1, salary: cap.available + cap.minimumSalary - 50_000,
  });
  expect(reserved).not.toBe(before);
  expect(nrlCareerCap(reserved, 2027)).toEqual(nrlCareerCap(before, 2027));
  expect(nrlCareerCap(reserved, 2028).available).toBe(50_000);
  expect(nrlRivalTakeoverQuote(reserved, playerId)).toEqual({ ok: false, reason: 'This offer exceeds the 2028 salary cap.' });
  expect(reduceNrlCareer(reserved, action)).toBe(reserved);
  expect(restore(reserved)).toEqual(reserved);
});

it('opens the offer from Contracts and restores the real signing receipt', () => {
  let career = seasonReview();
  const view = () => <NrlCareerOffice career={career} onAction={event => {
    career = reduceNrlCareer(career, event);
    return true;
  }} screen="contracts" disabled={false} />;
  const page = render(view());
  const details = screen.getByText('Approach a contracted rival', { exact: true }).closest('details')!;
  fireEvent.click(details.querySelector('summary')!);
  fireEvent.change(screen.getByLabelText('Selling club'), { target: { value: 'bulldogs' } });
  fireEvent.change(screen.getByLabelText('Contracted player'), { target: { value: playerId } });
  expect(screen.getByText(/\$200,100 acquisition fee/)).toBeVisible();
  expect(screen.getByText(/\$400,200 per season through 2028/)).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Confirm takeover' }));
  career = restore(career)!;
  page.rerender(view());
  expect(screen.getByText(/Lachlan Voss joins in 2027/)).toBeVisible();
  expect(screen.queryByRole('button', { name: 'Confirm takeover' })).toBeNull();
});
