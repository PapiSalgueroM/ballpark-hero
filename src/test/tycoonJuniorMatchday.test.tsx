import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { resetMocks } from './dailyReload/mocks';
import { mountPage } from './dailyReload/harness';
import StadiumTycoon, { SeasonMatchResults } from '@/pages/StadiumTycoon';
import {
  attendance, AWAY_MATCHDAY_SEC, bookJuniorDay, deserializeTycoon, incomePerSec, juniorDayOffer, matchdayFixtures, newTycoon,
  offlineEarnings, offlineRateOf, orderMatchProgrammes, playAwayMatchdays, playMinute, programmeFixture, reserveSeasonTickets,
  seasonTicketQuote, serializeTycoon, signStadiumSponsor, stadiumSponsorOffers, ticketEconomy, tick, TYCOON_SAVE_KEY, type TycoonState,
} from '@/lib/stadiumTycoon';

const now = 1794085200000;
const reload = (s: TycoonState) => deserializeTycoon(serializeTycoon(s, now), now)!;
const book = (s: TycoonState) => {
  const o = juniorDayOffer(s)!;
  return bookJuniorDay(s, s.rep, o.match, o.seats);
};
const finish = (s: TycoonState) => { s.minute = 89; playMinute(s, () => 1, [], { pay: true }); };
afterEach(() => { cleanup(); localStorage.clear(); vi.restoreAllMocks(); vi.unstubAllGlobals(); resetMocks(); });

it.each([ [90, 0, 68], [120, 12, 78], [114, 6, 80] ])('protects paid season seats and settles a real home date for %i supporters', (fanbase, displaced, walkUps) => {
  let s: TycoonState = { ...newTycoon(now), fanbase, money: 500, levels: { snacks: 2, shop: 1 } };
  s = reserveSeasonTickets(s, s.rep, s.league!.season, seasonTicketQuote(s)!);
  s = signStadiumSponsor(s, s.rep, s.league!.season, 'attendance');
  const target = stadiumSponsorOffers(s, s.league!).target;
  const booked = reload(book(s));
  expect(juniorDayOffer(s)).toMatchObject({ match: 2, day: 3, seats: 12, newFans: 3, displaced });
  expect(booked.money).toBe(488);
  expect(booked.lifetime).toBe(s.lifetime);
  expect(book(booked)).toBe(booked);
  let live = reload(playAwayMatchdays(booked, 2, () => 1).state);
  let control = reload(playAwayMatchdays(s, 2, () => 1).state);
  expect(live.league!.results).toEqual(control.league!.results);
  expect(matchdayFixtures(live.league!).some(([h]) => h === 0)).toBe(true);
  expect(live.juniorDay?.match).toBe(live.matchNo);
  expect(attendance(live)).toBe(attendance(control) + 12 - displaced);
  const a = ticketEconomy(live), b = ticketEconomy(control);
  expect(a.gatePerSec - b.gatePerSec).toBeCloseTo(-displaced * 0.05);
  expect(a.concessionsPerSec - b.concessionsPerSec).toBeCloseTo((12 - displaced) * (2 * 0.009 + 0.016));
  expect(a.gatePerSec + a.concessionsPerSec + a.otherPerSec).toBeCloseTo(a.totalPerSec);
  const oldFunds = live.money - control.money;
  live = tick(live, 0.25, () => 1).state;
  control = tick(control, 0.25, () => 1).state;
  expect(live.money - control.money).toBeCloseTo(oldFunds + (a.totalPerSec - b.totalPerSec) * 0.25);
  const qualifiedBefore = live.league!.sponsor!.qualifying;
  finish(live); finish(control);
  expect(live.fanbase - control.fanbase).toBeCloseTo(3);
  expect(live.league!.results!.at(-1)).toMatchObject({ day: 3, attendance: a.crowd, seasonTicketFans: s.league!.seasonTickets!.seats,
    juniors: { admitted: 12, displaced, newFans: 3 } });
  expect(live.league!.sponsor!.qualifying - qualifiedBefore).toBe(Number(a.crowd >= target));
  if (fanbase === 90) expect(live.league!.sponsor!.qualifying - control.league!.sponsor!.qualifying).toBe(1);
  expect(live.juniorDay).toBeUndefined();
  const report = render(<SeasonMatchResults league={live.league!} current />);
  const seats = s.league!.seasonTickets!.seats;
  const checkCrowd = () => {
    const match = within(report.getAllByRole('listitem', { hidden: true })[2]);
    expect(match.getByText(`${seats} season-ticket holders · ${walkUps} walk-ups`)).toBeInTheDocument();
    expect(match.getByText(/Junior day · 12 guests/)).toBeInTheDocument();
    expect(a.crowd).toBe(seats + walkUps + 12);
  };
  checkCrowd();
  while (live.league!.season === 0) finish(live);
  live = reload(live);
  expect(live.lastCompletedLeague?.results?.flatMap(row => row.juniors ? [row.juniors] : [])).toEqual([{ admitted: 12, displaced, newFans: 3 }]);
  report.rerender(<SeasonMatchResults league={live.lastCompletedLeague!} />);
  checkCrowd();
});

it('limits the offline rate to one scheduled fixture and keeps admissions and programme buyers on the same crowd', () => {
  const s = { ...newTycoon(now), money: 500, fanbase: 64, levels: { shop: 3 } };
  const scheduled = book(s), offer = juniorDayOffer(s)!;
  const control = playAwayMatchdays(s, 1, () => 1).state, before = playAwayMatchdays(scheduled, 1, () => 1).state;
  const print = programmeFixture(before)!;
  const one = orderMatchProgrammes(before, before.rep, print.match, print.bulk);
  const two = orderMatchProgrammes(control, control.rep, print.match, print.bulk);
  const active = playAwayMatchdays(one, 1, () => 1).state, plain = playAwayMatchdays(two, 1, () => 1).state;
  expect(active.matchNo).toBe(offer.match);
  expect(offlineEarnings(scheduled, now + AWAY_MATCHDAY_SEC * 1000)).toBe(offlineEarnings(s, now + AWAY_MATCHDAY_SEC * 1000));
  const hours = 5 * 3600;
  const normal = incomePerSec(plain), delta = incomePerSec(active) - normal;
  expect(offlineEarnings(active, now + hours * 1000)).toBe(Math.round((normal * hours + delta * AWAY_MATCHDAY_SEC) * offlineRateOf(active)));
  const joined = reload(playAwayMatchdays(active, 1, () => 1).state).league!.results!.at(-1)!;
  expect(joined).toMatchObject({ day: 3, attendance: 76, juniors: { admitted: 12, newFans: 3 }, programmes: { sold: 19 } });
});

it('rejects stale capacity, away dates, insufficient cash and malformed receipts while preserving older saves', () => {
  const old = reload(newTycoon(now)), offer = juniorDayOffer(old)!;
  expect(old.juniorDay).toBeUndefined();
  expect(bookJuniorDay(old, old.rep + 1, offer.match, offer.seats)).toBe(old);
  expect(bookJuniorDay(old, old.rep, offer.match - 1, offer.seats)).toBe(old);
  const expanded = { ...old, levels: { stands: 1 } };
  expect(bookJuniorDay(expanded, old.rep, offer.match, offer.seats)).toBe(expanded);
  const poor = { ...old, money: 11 };
  expect(book(poor)).toBe(poor);
  expect(reload({ ...old, juniorDay: { match: 1, seats: 12 } }).juniorDay).toBeUndefined();
  expect(reload({ ...old, juniorDay: { match: 2, seats: 40 } }).juniorDay).toBeUndefined();
  const done = playAwayMatchdays(book(old), 3, () => 1).state;
  done.league!.results![2].juniors!.newFans++;
  expect(reload(done).league!.results![2].juniors).toBeUndefined();
  const final = playAwayMatchdays(old, 4, () => 1).state;
  expect(juniorDayOffer(final)).toBeNull();
});

it('keeps the original cash after a refused write and resumes one paid booking through the ticket office', async () => {
  vi.spyOn(Date, 'now').mockReturnValue(now); vi.stubGlobal('requestAnimationFrame', () => 1);
  vi.stubGlobal('cancelAnimationFrame', () => {}); vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
  const raw = serializeTycoon(newTycoon(now), now); localStorage.setItem(TYCOON_SAVE_KEY, raw);
  let fail = true; const set = Storage.prototype.setItem;
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function(this: Storage, k, v) {
    if (fail && k === TYCOON_SAVE_KEY) throw new DOMException('No room', 'QuotaExceededError'); return set.call(this, k, v);
  });
  const open = () => { const view = mountPage(<StadiumTycoon />, '/stadium-tycoon');
    fireEvent.click(view.container.querySelector('[data-office-panel="tickets"]')!); return view; };
  const first = open();
  fireEvent.click(screen.getByText('Junior matchday', {selector:'summary'}));
  fireEvent.click(screen.getByRole('button', {name:'Host 12 juniors for $12'}));
  expect(screen.getByRole('alert')).toHaveTextContent('Could not save the junior booking');
  expect(localStorage.getItem(TYCOON_SAVE_KEY)).toBe(raw);
  fail = false; fireEvent.click(screen.getByRole('button', {name:'Host 12 juniors for $12'}));
  const paid = localStorage.getItem(TYCOON_SAVE_KEY)!; expect(JSON.parse(paid).money).toBe(28);
  first.unmount(); open();
  fireEvent.click(screen.getByText('Junior matchday booked', {selector:'summary'}));
  expect(screen.getByText('$12 hosting paid.')).toBeVisible();
  expect(localStorage.getItem(TYCOON_SAVE_KEY)).toBe(paid);
});
